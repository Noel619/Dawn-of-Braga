// La película: manejar una espringala (actos 4 y 6). Con control: acercarse
// al torno, cargar (machacar el torno: cada pulsación, un empujón de los
// espeques), apuntar (la cámara detrás del arma, por encima del hombro; el
// virote cae un poco y la marca dice dónde caería) y disparar. Si el tiro va
// al gigante o pasa cerca, el guion lo lleva a su blanco (o.assist: el
// antebrazo con que se tapa, la nuca...) y el virote se clava ahí; si no, se
// pierde y hay que cargar otro.
import * as THREE from 'three';
import { FP } from './film_player.js';
import { rayCapsule } from './colbody.js';
import { clamp } from '../../core/util.js';

const V3 = THREE.Vector3;
const _v = new V3(),
  _v2 = new V3(),
  _v3 = new V3();

// o: {
//   toast: lo que se dice al empezar,
//   behave: () => corrutina del gigante mientras tanto (con .stop),
//   near: lo cerca que tiene que pasar para que cuente (m),
//   devAim: (G, out) => adónde apunta el modo de pruebas,
//   assist: { point: (G) => dónde se clava (mundo), capsule: (G) => [a, b, r]
//     lo que se puede tocar, bone: (G) => el hueso, depth, onFire: (D, G),
//     through: sin chocar con nada más por el camino }
// }
// Devuelve el virote clavado en el blanco (o nada: muerto)
export function* shootGun(D, G, S, o) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  F.cinema(false);
  F.puppet(false);
  p.anim.stop(0.15);
  F.release(S.worldYaw, 0.2);
  if (o.toast) g.ui.toast(o.toast, 2.6);
  // él, mientras tanto
  const giant = o.behave ? o.behave() : null;
  if (giant) {
    D._approach = giant;
    F.also(giant);
  }
  let mode = 'free', // free | load | aim | flight
    bolt = null,
    hit = null,
    reticle = null,
    flightT = 0;
  const st = { aimYaw: 0, aimPitch: 0.05 };
  D.promptFn = () => (mode === 'free' && near(S, p) ? { kind: 'colossus', label: S.load >= 1 ? 'Apuntar con la espringala' : 'Cargar la espringala', onUse: () => (mode = S.load >= 1 ? 'aim' : 'load') } : undefined);
  const dev = g.dev && g.dev.autoQTE;
  let devT = 0,
    shots = 0;
  try {
    while (!hit) {
      const dt = yield;
      if (p.dead) return null;
      devT += dt;
      if (mode === 'free') {
        if (dev && devT > 0.6 && near(S, p)) mode = S.load >= 1 ? 'aim' : 'load';
        continue;
      }
      // ---------------------------------------------- cargar
      if (mode === 'load') {
        D.promptFn = null;
        yield* loadGun(D, S);
        if (p.dead) return null;
        mode = 'aim';
        continue;
      }
      // ---------------------------------------------- apuntar
      if (mode === 'aim') {
        if (!reticle) {
          reticle = aimMark(D);
          F.puppet(true);
          F.pClip(FP.aimGun, { blend: 0.2 });
          g.ui.toast('Apunta y dispara', 2.2);
        }
        const L = g.input.look(dt),
          mv = g.input.move();
        st.aimYaw = clamp(st.aimYaw - L.x * 0.55 - mv.x * dt * 0.9, -S.yawLim, S.yawLim);
        st.aimPitch = clamp(st.aimPitch - L.y * 0.55 + mv.y * dt * 0.6, S.pitchLim[0], S.pitchLim[1]);
        if (dev) {
          // (modo de pruebas: apunta al blanco; con QTE=fail, el primer tiro, lejos)
          const c = o.devAim(G, _v).sub(S.muzzle(_v2));
          let yr = Math.atan2(c.x, c.z) - S.yaw0;
          yr = Math.atan2(Math.sin(yr), Math.cos(yr)) + (dev === 'fail' && shots === 0 ? 0.6 : 0);
          st.aimYaw += (clamp(yr, -S.yawLim, S.yawLim) - st.aimYaw) * Math.min(1, dt * 4);
          st.aimPitch += (clamp(Math.atan2(c.y, Math.hypot(c.x, c.z)), S.pitchLim[0], S.pitchLim[1]) - st.aimPitch) * Math.min(1, dt * 4);
        }
        S.aim(st.aimYaw, st.aimPitch);
        const sp = S.standPoint(_v);
        F.setP(sp.x, sp.y, sp.z, S.worldYaw);
        // la cámara: detrás del arma, por encima del hombro derecho del
        // jugador (el arma y él, abajo a un lado; el blanco, en medio)
        const mz = S.muzzle(new V3());
        const fw = S.forward(new V3());
        const rt = _v3.set(-fw.z, 0, fw.x).normalize();
        const cp = new V3(sp.x, sp.y + 2.45, sp.z).addScaledVector(fw, -1.7).addScaledVector(rt, 0.75);
        F.cam = { pos: cp, look: mz.clone().addScaledVector(fw, 30), fov: 46, snap: true };
        // dónde caería
        const pred = predict(D, G, S, o);
        placeMark(D, reticle, pred, o);
        if (g.input.pressed('light') || g.input.pressed('heavy') || (dev && (st.devAim = (st.devAim || 0) + dt) > 1.2)) {
          st.devAim = 0;
          shots++;
          removeMark(reticle);
          reticle = null;
          bolt = fireGun(D, G, S, pred, o);
          mode = 'flight';
          flightT = 0;
        }
        continue;
      }
      // ---------------------------------------------- el vuelo
      if (mode === 'flight') {
        flightT += dt;
        if (bolt.stuckGiant) hit = bolt;
        else if (bolt.done || flightT > 2.6) {
          // (fallado: otro virote)
          F.slow(1, 6);
          a && a.play('beastRoar', G.head(_v), { k: 1.6 });
          g.ui.toast('Otro virote: ¡carga!', 2.4);
          S.rearm();
          F.cam = null;
          F.puppet(false);
          p.anim.stop(0.15);
          F.release(S.worldYaw, 0.2);
          mode = 'load';
        }
      }
    }
  } finally {
    D.promptFn = null;
    if (reticle) removeMark(reticle);
  }
  if (giant) giant.stop = true;
  return hit;
}
function near(S, p) {
  const sp = S.standPoint(_v3);
  return Math.hypot(p.pos.x - sp.x, p.pos.z - sp.z) < 1.9 && Math.abs(p.pos.y - sp.y) < 1;
}

// Cargar: machacar el torno (cada pulsación, un empujón de los espeques)
function* loadGun(D, S) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  F.puppet(true);
  const sp = S.standPoint(new V3());
  F.setP(sp.x, sp.y, sp.z, S.worldYaw);
  F.pClip(FP.crank, { blend: 0.15, speed: 0 });
  // (de lado: el torno, el jugador empujando y, al fondo, el gigante)
  const fw = S.forward(new V3());
  const side = new V3(fw.z, 0, -fw.x);
  const c = new V3().copy(sp).addScaledVector(side, 3.0).addScaledVector(fw, -1.2);
  c.y += 2.1;
  F.cam = { pos: c, look: S.muzzle(new V3()).addScaledVector(fw, 6).setY(sp.y + 0.9), fov: 54, snap: true };
  const N = 10;
  let n = 0,
    load0 = S.load;
  // (modo de pruebas con las pulsaciones falladas: el torno se carga solo)
  const fake = g.dev && g.dev.autoQTE === 'fail';
  const q = fake ? { ok: null } : F.promptAsync({ action: 'interact', label: '¡Carga!', window: 9, mash: N, slow: 1 });
  let push = 0,
    fk = 0;
  while (q.ok === null) {
    const dt = yield;
    if (p.dead) return;
    if (fake && (fk += dt * 6) >= N) q.ok = true;
    const cur = fake ? Math.floor(fk) : g.qte.cur ? g.qte.cur.n : N;
    if (cur > n) {
      n = cur;
      push = 0.32;
      a && a.play('leverCreak', S.base, { k: 0.9 });
    }
    // (el empujón: el bucle del torno avanza medio ciclo por pulsación)
    push = Math.max(0, push - dt);
    p.anim.speed = push > 0 ? 1.6 : 0;
    S.load = Math.min(1, S.load + (Math.max(load0, n / N) - S.load) * Math.min(1, dt * 10));
  }
  if (!q.ok) {
    // (no le dio tiempo: otra vez desde donde iba)
    yield* loadGun(D, S);
    return;
  }
  while (S.load < 0.999) {
    const dt = yield;
    S.load = Math.min(1, S.load + dt * 2);
  }
  S.load = 1;
  a && a.play('leverClunk', S.base, { k: 1.2 });
  p.anim.speed = 1;
}

// ¿Dónde caería el virote? Su vuelo (recto, cae un poco), contra el
// gigante y el mundo; y lo cerca que pasa de su cuerpo
function predict(D, G, S) {
  const g = D.g;
  const P = S.muzzle(new V3()),
    v = S.forward(new V3()).multiplyScalar(70);
  const prev = new V3();
  const body = bodyAxis(G);
  let best = 1e9;
  for (let i = 0; i < 90; i++) {
    prev.copy(P);
    v.y -= 7 / 60;
    P.addScaledVector(v, 1 / 60);
    // lo cerca que pasa del cuerpo (del pecho a la cabeza, y las caderas)
    best = Math.min(best, segDist(P, body.a, body.b));
    const d = _v.subVectors(P, prev);
    const L = d.length();
    d.divideScalar(L);
    const tg = G.col.ray(prev, d, L);
    const tw = g.world.col.raycast(prev.x, prev.y, prev.z, d.x, d.y, d.z, L, (b) => b.cam !== false && b.tag !== 'fog');
    if (tg !== Infinity || tw !== Infinity) {
      const t = Math.min(tg, tw);
      return { point: prev.clone().addScaledVector(d, t), giant: tg <= tw, near: best };
    }
  }
  return { point: P, giant: false, near: best };
}
function bodyAxis(G) {
  return { a: G.bp('pelvis', 0, 7.4, -0.2, new V3()), b: G.head(new V3()) };
}
function segDist(p, a, b) {
  const ab = _v2.subVectors(b, a);
  const t = clamp(_v3.subVectors(p, a).dot(ab) / (ab.lengthSq() || 1), 0, 1);
  return _v3.copy(a).addScaledVector(ab, t).distanceTo(p);
}

// la marca de puntería: un anillo que siempre se ve (encima de todo), del
// mismo tamaño en pantalla
function aimMark(D) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.strokeStyle = '#e8d8b0';
  x.lineWidth = 4;
  x.beginPath();
  x.arc(32, 32, 20, 0, Math.PI * 2);
  x.stroke();
  x.lineWidth = 3;
  for (const [a, b, c2, d] of [
    [32, 2, 32, 14],
    [32, 50, 32, 62],
    [2, 32, 14, 32],
    [50, 32, 62, 32],
  ]) {
    x.beginPath();
    x.moveTo(a, b);
    x.lineTo(c2, d);
    x.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, transparent: true, fog: false, color: 0xffffff }));
  m.renderOrder = 999;
  D.g.scene.add(m);
  return m;
}
function placeMark(D, m, pred, o) {
  const cam = D.g.camera;
  m.position.copy(pred.point);
  const d = cam.position.distanceTo(pred.point);
  const s = d * Math.tan((cam.fov * Math.PI) / 360) * 0.09;
  m.scale.set(s, s, 1);
  // (rojiza si va al gigante o pasa cerca)
  m.material.color.setHex(pred.giant || pred.near < o.near ? 0xff7050 : 0xffffff);
}
function removeMark(m) {
  if (m.parent) m.parent.remove(m);
  m.material.map.dispose();
  m.material.dispose();
}

// ¡Dispara! Si va al gigante o pasa cerca, el virote va a su blanco
// (o.assist); si no, se pierde por la ciudad
function fireGun(D, G, S, pred, o) {
  const g = D.g,
    F = D.film,
    a = g.audio;
  const assist = pred.giant || pred.near < o.near;
  let hitPt = null;
  if (assist) {
    hitPt = o.assist.point(G);
    if (D._approach) D._approach.stop = true;
    if (o.assist.onFire) o.assist.onFire(D, G);
  }
  const P = S.muzzle(new V3());
  let speed = 70;
  let dir = S.forward(new V3());
  if (hitPt) {
    // (recto al blanco, con lo que cae; la espringala, girada hacia ahí)
    const d = _v.subVectors(hitPt, P);
    const tFl = d.length() / speed;
    d.y += 0.5 * 7 * tFl * tFl;
    dir = d.normalize().clone();
    let yr = Math.atan2(dir.x, dir.z) - S.yaw0;
    yr = Math.atan2(Math.sin(yr), Math.cos(yr));
    S.aim(yr, Math.asin(clamp(dir.y, -1, 1)));
    S.update(0);
  }
  const B = S.fire({
    speed,
    hitTest: (a0, b0, bolt) => boltHit(D, G, a0, b0, bolt, assist, o),
    onHit: (h, bolt) => onBoltHit(D, G, h, bolt, o),
  });
  B.vel.copy(dir).multiplyScalar(speed);
  B.assist = assist;
  // el golpe seco, el silbido y la cadena que se va
  a && a.play('slam', S.base, { k: 1.6 });
  a && a.play('pikeWhoosh', S.base, { k: 2 });
  a && a.play('chainRun', S.base, { k: 1.6 });
  g.camRig.shake(0.5);
  g.input.rumble(0.8, 1, 300);
  // a cámara lenta, detrás del virote
  F.slow(assist ? 0.28 : 0.55, 18);
  F.cam = null;
  F.follow(() => {
    const v = B.stuck ? null : _v.copy(B.vel).normalize();
    if (v) {
      const side = _v2.set(v.z, 0, -v.x).normalize();
      return { pos: B.pos.clone().addScaledVector(v, -5.5).addScaledVector(side, 1.4).add(_v3.set(0, 0.8, 0)), look: B.pos.clone().addScaledVector(v, 6), fov: 56 };
    }
    return null;
  });
  return B;
}
// el virote contra su blanco (con assist) o contra lo que sea
function boltHit(D, G, a0, b0, bolt, assist, o) {
  const g = D.g;
  const d = _v.subVectors(b0, a0);
  const L = d.length();
  if (L < 1e-6) return null;
  d.divideScalar(L);
  if (assist) {
    const [e, w, r] = o.assist.capsule(G);
    const t = rayCapsule(a0, d, e, w, r);
    if (t > 0 && t <= L) return { point: a0.clone().addScaledVector(d, t), kind: 'target', dir: d.clone() };
    // (through: va derecho al blanco, sin que lo pare lo que hay delante)
    if (o.assist.through) return null;
  }
  const tg = G.col.ray(a0, d, L);
  if (tg !== Infinity) return { point: a0.clone().addScaledVector(d, tg), kind: 'giant', dir: d.clone() };
  const tw = g.world.col.raycast(a0.x, a0.y, a0.z, d.x, d.y, d.z, L, (b) => b.cam !== false && b.tag !== 'fog');
  if (tw !== Infinity) return { point: a0.clone().addScaledVector(d, tw), kind: 'world', dir: d.clone() };
  return null;
}
function onBoltHit(D, G, h, bolt, o) {
  const g = D.g,
    a = g.audio;
  if (h.kind === 'target' || h.kind === 'giant') {
    // se clava (en el blanco con assist; si no, en el hueso más cercano)
    const bone = h.kind === 'target' ? o.assist.bone(G) : nearestBone(G, h.point);
    bolt.stickTo(bone, h.point, h.dir, h.kind === 'target' ? o.assist.depth : 0.5);
    bolt.stuckGiant = h.kind === 'target';
    a && a.play('thrust', h.point, { k: 2 });
    a && a.play('fleshTear', h.point, { k: 1.6 });
    a && a.play('beastHurt', G.head(_v), { k: 2 });
    g.fx.blood.emit(h.point.x, h.point.y, h.point.z, 50, { color: [0.4, 0.06, 0.05], speed: 6, life: 1.4, up: 1, dir: h.dir.clone().negate() });
    g.camRig.shake(0.8);
  } else {
    a && a.play('woodHit', h.point, { k: 1.4 });
    D.debris.burst(h.point, 8, { speed: 4, up: 3, size: 0.5, spread: 0.5 });
  }
}
function nearestBone(G, p) {
  let best = null,
    bd = 1e9;
  for (const n of ['pelvis', 'chest', 'head', 'armL', 'foreL', 'armR', 'foreR', 'legL', 'shinL', 'legR', 'shinR']) {
    const b = G.M.byName[n];
    const d = b.getWorldPosition(_v).distanceTo(p);
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  return best;
}
