// La película, acto 4: la primera espringala (la torre oeste de la puerta sur).
//
// En lo alto, la espringala de la guarnición. Abajo, el gigante arranca la
// campana del empedrado, te ruge y viene hacia la torre arrastrándola; si
// tardas, la campana barre lo alto de la torre (la primera vez se queda
// corta y revienta el muro de debajo; la segunda, no). Cargar (machacar el
// torno), apuntar (cámara detrás del arma; el virote cae un poco) y
// disparar. Si el tiro pasa cerca, se tapa la cara con el antebrazo
// izquierdo: el virote se le clava en él y la cadena queda entre la torre y
// su brazo.
//
// Momento God of War 1: tira de la cadena (la torre cruje) — ¡Corre! — por
// la cadena tensa hasta su brazo — se sacude: ¡Agárrate! — ¡Apuñala! el
// dorso de la mano — estrella el brazo contra lo alto de la torre: el
// cadalso revienta, la cadena se parte y quedas colgado del virote. (Sigue
// en el acto 5, la cabalgada.)
import * as THREE from 'three';
import { sm, lerp, camSafe } from './film.js';
import { FP } from './film_player.js';
import { Springald, BOLT_L } from './springald.js';
import { hideFolk } from './film_grab.js';
import { rayCapsule } from './colbody.js';
import { TOWER_S } from '../../world/level_finale.js';
import { clamp, dampAngle } from '../../core/util.js';

const V3 = THREE.Vector3;
const rnd = (a, b) => a + Math.random() * (b - a);
const _v = new V3(),
  _v2 = new V3(),
  _v3 = new V3();
const DUST = [0.26, 0.24, 0.22];
const T = TOWER_S;
// el centro del cadalso (a la altura del pecho)
const DECK = new V3(T.x, T.deckY + 1.2, T.z);
// dónde se para a barrer lo alto de la torre con la campana
const STOP = new V3(-1.2, 0, 41.4);
// cómo acabó el acto 3: el gigante en la boca de la calle, la campana
// clavada en el empedrado
const END3 = { giant: new V3(4.2, 0, 29.0), bell: new V3(0.2, 0, 39.3) };

// Los puntos del brazo izquierdo (espacio del modelo) por los que lo lleva
// el guion: la muñeca y hacia dónde va el codo
const ARM = {
  // el antebrazo delante de la cara, de través
  cover: { w: [-2.2, 16.0, 7.6], pole: [8, 13, 10] },
  // bajado delante de él, mirándoselo
  look: { w: [5.0, 11.0, 8.5], pole: [11, 10, 5] },
  // tirando de la cadena: el brazo tendido a su izquierda, lejos del cuerpo
  yank: { w: [7.8, 9.8, 3.2], pole: [12, 11, -2] },
  // alzado a la izquierda, para descargarlo
  wind: { w: [8.6, 15.0, 1.6], pole: [12, 9, -2] },
};

// La espringala del cadalso (la misma desde que se llega arriba)
export function springald1(D) {
  if (D.springald) return D.springald;
  const g = D.g;
  const [gx, gy, gz] = T.gun;
  const S = new Springald(g, { pos: new V3(gx, gy, gz), yaw: Math.PI, bollard: new V3(gx + 1.9, gy, gz - 1.6), chainLen: 38, pitchLim: [-6, 24], yawLim: 60 });
  S.onClick = () => g.audio && g.audio.play('unlock', S.base, { k: 0.6 });
  D.springald = S;
  D.tick(S);
  return S;
}

// ======================================================================
// ACTO 4
// ======================================================================
export function* actTorre(D, o = {}) {
  const g = D.g,
    F = D.film,
    p = g.player;
  const G = yield* D.waitGiant();
  if (o.fromCP) setupTorre(D, G);
  hideFolk(g, 0, 50, 30);
  const S = springald1(D);
  g.chaseRun = false;
  // ------------------------------------------------- 1. arranca la campana
  yield* intro(D, G, S);
  if (p.dead) return;
  // ------------------------------------------------- 2. la espringala
  const hit = yield* shoot(D, G, S);
  if (p.dead || !hit) return;
  // ------------------------------------------------- 3. el momento God of War
  yield* gow1(D, G, S, hit);
}

function towerAtmo() {
  return { density: 0.0095, vol: 0.05, far: 300, bloom: 1.25, hemi: 3.2, moon: 3.3, moonPos: [-20, 30, -10], fog: 0x34302e, exposure: 1.2, ash: 0.25 };
}

// Desde el punto de control: el jugador en lo alto de la torre; el gigante
// en la boca de la calle, tirando de la campana clavada
function setupTorre(D, G) {
  const g = D.g,
    F = D.film;
  F.cinema(false, { instant: true });
  F.puppet(true);
  F.setP(T.x, T.deckY, T.deck[1] + 0.9, 0);
  p_idle(D);
  const at = END3.bell;
  G.place(END3.giant.x, END3.giant.z, Math.atan2(at.x - END3.giant.x, at.z - END3.giant.z), { base: 'idle', clip: 'stuck' });
  G.groundFn = null;
  G.setBell(true);
  const B = G.bell;
  B.top.copy(at).y += G.E.sizes.bellH * 0.55;
  B.up.set(Math.sin(G.yaw) * 0.45, 0.85, Math.cos(G.yaw) * 0.45).normalize();
  B.stick();
  for (let i = 0; i < 60; i++) B.update(1 / 60, G.handGrip(_v));
  g.atmo.override = { ...towerAtmo(), snap: true };
  g.fadeTarget = 1;
  g.audio && g.audio.music('bossFinal');
}
function p_idle(D) {
  D.g.player.anim.stop(0.2);
}

// ---------------------------------------------------------------------
// 1. Desde lo alto: arranca la campana del empedrado y te ruge
function* intro(D, G, S) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  F.cinema(true);
  F.puppet(true);
  p.autoDir = null;
  p.anim.stop(0.2);
  g.atmo.override = towerAtmo();
  const B = G.bell;
  const at = B.stuck ? B.stuck.clone().setY(0) : B.mouth(new V3()).setY(0);
  // (el jugador, ya en el torno de la espringala, mirando al norte)
  const sp0 = S.standPoint(new V3());
  F.setP(sp0.x, sp0.y, sp0.z, S.worldYaw);
  // (a) por encima de la espringala: la plaza, la calle y él al fondo
  const [gx, gy, gz] = T.gun;
  F.shot([gx + 1.3, gy + 2.1, gz + 2.9], [G.pos.x * 0.6 + gx * 0.4, 7.5, G.pos.z], { fov: 52 });
  F.hand = 0.02;
  G.lookW = 1;
  G.lookAt = null;
  G.play('pull', { blend: 0.4 });
  let ripped = false;
  G.onEventHook = (e) => {
    if (e !== 'rip' || ripped) return;
    ripped = true;
    // sale la campana, con medio empedrado
    B.release(new V3(Math.sin(G.yaw) * -6, 14, Math.cos(G.yaw) * -6));
    a && a.play('crack', at, { k: 1.8 });
    a && a.play('wallBreak', at, { k: 1.2 });
    a && a.play('chainRun', at, { k: 1.6 });
    g.camRig.shake(0.5);
    D.debris.burst(at.clone().setY(0.3), 18, { speed: 8, up: 9, size: 0.6, spread: 2.4 });
    g.fx.blood.emit(at.x, 0.6, at.z, 60, { color: DUST, speed: 7, life: 2, up: 3, gravity: 0.3 });
    for (let i = 0; i < 8; i++) D.chunks.add({ mat: 'cobble', size: [rnd(0.5, 0.9), 0.22, rnd(0.4, 0.8)], pos: new V3(at.x + rnd(-2, 2), 0.4, at.z + rnd(-2, 2)), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(rnd(-5, 5), rnd(6, 12), rnd(-5, 5)), spin: [rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)], shatter: 99, life: 7 });
  };
  while (G.actT < 0.75) yield;
  // (b) a ras del empedrado, junto a la campana: sale de un tirón
  F.shot([at.x + 5.2, 1.1, at.z + 5.8], [at.x - 0.5, 5.5, at.z - 3], { fov: 62 });
  F.hand = 0.04;
  while (G.actT < 2.2) yield;
  G.onEventHook = null;
  // (c) se vuelve hacia la torre y ruge: por encima del hombro del jugador
  G.play('roar', { blend: 0.4 });
  F.pClip(FP.windStand, { blend: 0.3 });
  p.yaw = Math.atan2(G.pos.x - p.pos.x, G.pos.z - p.pos.z);
  const P = p.pos.clone();
  F.follow(() => {
    const hd = G.head(new V3());
    const d = _v.subVectors(hd, P).setY(0).normalize();
    return { pos: new V3(P.x - d.x * 2.4 + d.z * 0.9, P.y + 1.9, P.z - d.z * 2.4 - d.x * 0.9), look: hd.add(_v2.set(0, -5, 0)), fov: 46 };
  });
  F.hand = 0.025;
  let roared = false;
  while (G.actT < 2.4) {
    const dt = yield;
    G.yaw = dampAngle(G.yaw, Math.atan2(DECK.x - G.pos.x, DECK.z - G.pos.z), 1.5, dt);
    if (!roared && G.actT > 1.2) {
      roared = true;
      a && a.play('beastRoarBig', G.face(_v), { k: 2.4 });
      g.camRig.shake(0.6);
      g.input.rumble(0.8, 1, 900);
    }
  }
}

// ---------------------------------------------------------------------
// 2. La espringala (con control): mientras, él viene hacia la torre y barre
// lo alto con la campana. Devuelve el virote clavado (o nada: muerto)
function* shoot(D, G, S) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  F.cinema(false);
  F.puppet(false);
  p.anim.stop(0.15);
  F.release(Math.PI, 0.2);
  g.ui.toast('¡A la espringala!', 2.6);
  // él: anda hacia la torre arrastrando la campana
  const giant = approachTower(D, G);
  D._approach = giant;
  F.also(giant);
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
          // (modo de pruebas: apunta al pecho; con QTE=fail, el primer tiro, lejos)
          const c = G.chest(_v).sub(S.muzzle(_v2));
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
        const pred = predict(D, G, S);
        placeMark(D, reticle, pred);
        if (g.input.pressed('light') || g.input.pressed('heavy') || (dev && (st.devAim = (st.devAim || 0) + dt) > 1.2)) {
          st.devAim = 0;
          shots++;
          removeMark(reticle);
          reticle = null;
          bolt = fireGun(D, G, S, pred);
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
  giant.stop = true;
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
// gigante y el mundo; y si pasa cerca del gigante, él se tapa: el virote va
// a su antebrazo (assist)
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
function placeMark(D, m, pred) {
  const cam = D.g.camera;
  m.position.copy(pred.point);
  const d = cam.position.distanceTo(pred.point);
  const s = d * Math.tan((cam.fov * Math.PI) / 360) * 0.09;
  m.scale.set(s, s, 1);
  // (rojiza si va al gigante o pasa cerca)
  m.material.color.setHex(pred.giant || pred.near < 9 ? 0xff7050 : 0xffffff);
}
function removeMark(m) {
  if (m.parent) m.parent.remove(m);
  m.material.map.dispose();
  m.material.dispose();
}

// ¡Dispara! Si pasa cerca (o le da), se tapa con el brazo y el virote va a
// su antebrazo; si no, se pierde por la ciudad
function fireGun(D, G, S, pred) {
  const g = D.g,
    F = D.film,
    a = g.audio;
  const assist = pred.giant || pred.near < 9;
  let hitPt = null;
  if (assist) {
    // (dónde estará el antebrazo cuando se tape: ahí apunta el virote)
    const w = G.wp(...ARM.cover.w, new V3());
    const sh = G.bp('armL', 2.9, 14.15, -0.3, new V3());
    hitPt = sh.lerp(w, 0.72);
    if (D._approach) D._approach.stop = true;
    G.rootMotion = false;
    G.speedK = 1;
    G.stopAction(0.1);
    G.play('cover', { blend: 0.12 });
    coverArm(D, G);
  }
  const P = S.muzzle(new V3());
  let speed = 70;
  let dir = S.forward(new V3());
  if (hitPt) {
    // (recto al antebrazo, con lo que cae; la espringala, girada hacia ahí)
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
    hitTest: (a0, b0, bolt) => boltHit(D, G, a0, b0, bolt, assist),
    onHit: (h, bolt) => onBoltHit(D, G, h, bolt),
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
// el antebrazo, a tapar la cara (IK): lo justo para que llegue el virote
function coverArm(D, G) {
  D.film.also(
    (function* () {
      const tgt = new V3(),
        pole = new V3();
      let t = 0;
      while (!G._armScript) {
        const dt = yield;
        t += dt;
        G.wp(...ARM.cover.w, tgt);
        G.wp(...ARM.cover.pole, pole);
        G.reachHand('L', tgt, pole, sm(clamp(t / 0.2, 0, 1)) * (1 - sm(clamp((t - 2.4) / 0.6, 0, 1))), { stretch: 1.12 });
        if (t > 3) break;
      }
      if (!G._armScript) G.freeHand('L');
    })()
  );
}
// el virote contra el antebrazo (con assist) o contra lo que sea
function boltHit(D, G, a0, b0, bolt, assist) {
  const g = D.g;
  const d = _v.subVectors(b0, a0);
  const L = d.length();
  if (L < 1e-6) return null;
  d.divideScalar(L);
  if (assist) {
    const B = G.M.byName;
    const e = B.foreL.getWorldPosition(new V3()),
      w = B.handL.getWorldPosition(new V3());
    const t = rayCapsule(a0, d, e, w, 1.0);
    if (t > 0 && t <= L) return { point: a0.clone().addScaledVector(d, t), kind: 'arm', dir: d.clone() };
  }
  const tg = G.col.ray(a0, d, L);
  if (tg !== Infinity) return { point: a0.clone().addScaledVector(d, tg), kind: 'giant', dir: d.clone() };
  const tw = g.world.col.raycast(a0.x, a0.y, a0.z, d.x, d.y, d.z, L, (b) => b.cam !== false && b.tag !== 'fog');
  if (tw !== Infinity) return { point: a0.clone().addScaledVector(d, tw), kind: 'world', dir: d.clone() };
  return null;
}
function onBoltHit(D, G, h, bolt) {
  const g = D.g,
    a = g.audio;
  if (h.kind === 'arm' || h.kind === 'giant') {
    // se clava (en el antebrazo con assist; si no, en el hueso más cercano)
    const bone = h.kind === 'arm' ? G.M.byName.foreL : nearestBone(G, h.point);
    bolt.stickTo(bone, h.point, h.dir, h.kind === 'arm' ? 1.75 : 0.5);
    bolt.stuckGiant = h.kind === 'arm';
    a && a.play('thrust', h.point, { k: 2 });
    a && a.play('fleshTear', h.point, { k: 1.6 });
    a && a.play('beastHurt', G.head(_v), { k: 2 });
    g.fx.blood.emit(h.point.x, h.point.y, h.point.z, 50, { color: [0.4, 0.06, 0.05], speed: 6, life: 1.4, up: 1, dir: h.dir.clone().negate() });
    g.camRig.shake(0.8);
    // (si no fue al brazo, cuenta como fallo: el guion necesita el brazo)
    if (h.kind !== 'arm') bolt.stuckGiant = false;
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

// Él, mientras tanto: anda hacia la torre (la campana a rastras), se para,
// y barre lo alto con la campana: la primera vez se queda corta (revienta
// el muro de debajo del cadalso); la segunda barre el cadalso entero
function approachTower(D, G) {
  const g = D.g,
    a = g.audio;
  const co = (function* () {
    const B = G.bell;
    G.stopAction(0.5);
    G.base('walk', { blend: 0.6 });
    G.rootMotion = true;
    G.speedK = 0.72;
    G.lookW = 1;
    G.lookAt = null;
    B.guide = { target: new V3(), k: 6, d: 3.5, antiGrav: false };
    let roar = 2.5;
    // (hasta su sitio)
    while (!co.stop) {
      const dt = yield;
      const d = Math.hypot(STOP.x - G.pos.x, STOP.z - G.pos.z);
      G.yaw = dampAngle(G.yaw, Math.atan2(STOP.x - G.pos.x, STOP.z - G.pos.z), 1.6, dt);
      G.wp(-4.5, 0.6, -6, B.guide.target);
      roar -= dt;
      if (roar <= 0) {
        roar = rnd(3, 4.5);
        a && a.play('beastRoar', G.head(_v), { k: 1.6 });
      }
      if (d < 0.8) break;
    }
    G.rootMotion = false;
    G.speedK = 1;
    G.base('idle', { blend: 0.6 });
    // dos barridos: el primero, corto; el segundo, al cadalso
    for (let k = 0; k < 2 && !co.stop; k++) {
      let t = 0;
      while (t < (k ? 2.4 : 0.8) && !co.stop) {
        const dt = yield;
        t += dt;
        G.yaw = dampAngle(G.yaw, Math.atan2(DECK.x - G.pos.x, DECK.z - G.pos.z), 2, dt);
        G.wp(-5, 2, -5, B.guide.target);
      }
      if (co.stop) break;
      yield* sweepOnce(D, G, k === 1, co);
    }
  })();
  co.stop = false;
  return co;
}
// un barrido de campana contra lo alto de la torre (lethal: al cadalso)
function* sweepOnce(D, G, lethal, co) {
  const g = D.g,
    a = g.audio,
    p = g.player;
  const B = G.bell;
  G.play('sweep', { blend: 0.3 });
  a && a.play('beastRoar', G.head(_v), { k: 1.6 });
  // el blanco: el muro de la torre bajo el cadalso, o el cadalso
  const tgt = lethal ? new V3(T.x, T.deckY + 0.8, T.z - 1) : new V3(T.x + 0.5, T.h - 3.5, T.z - T.w / 2 - 0.5);
  let hit = false;
  while (!co.stop && !G.actDone) {
    yield;
    const t = G.actT;
    if (t < 1.25) {
      G.wp(-7, 9, -6, B.guide.target);
      Object.assign(B.guide, { k: 10, d: 4, antiGrav: true });
    } else if (t < 1.95) {
      B.guide.target.copy(tgt);
      Object.assign(B.guide, { k: 60, d: 3, antiGrav: true });
    } else {
      G.wp(-5, 2, -4, B.guide.target);
      Object.assign(B.guide, { k: 8, d: 4, antiGrav: false });
    }
    if (!hit && t > 1.6 && B.center(_v).distanceTo(tgt) < 4.5) {
      hit = true;
      const c = B.center(_v2).clone();
      a && a.play('bellToll', c, { k: 2 });
      a && a.play('wallBreak', c, { k: 2 });
      g.camRig.shake(1.2);
      g.input.rumble(1, 1, 600);
      D.debris.burst(c, 30, { speed: 9, up: 6, size: 0.9, spread: 2 });
      g.fx.blood.emit(c.x, c.y, c.z, 60, { color: DUST, speed: 7, life: 2, up: 2, gravity: 0.4 });
      for (let i = 0; i < 8; i++) D.chunks.add({ mat: lethal ? 'planks' : 'wallstone', size: lethal ? [0.2, 0.08, rnd(1, 2)] : [rnd(0.5, 0.9), rnd(0.35, 0.6), rnd(0.4, 0.8)], pos: c.clone().add(_v.set(rnd(-1.5, 1.5), rnd(-1, 1), rnd(-1.5, 1.5))), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(rnd(-6, 6), rnd(2, 8), rnd(2, 9)), spin: [rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)], shatter: 99, life: 7 });
      // la segunda: barre el cadalso (y a quien esté en él)
      if (lethal && p.pos.y > T.deckY - 1 && !p.dead) {
        D.film.cinema(false);
        D.film.hurt(999, c, { shake: 1.5, heavy: true });
      } else if (!lethal) {
        g.ui.toast('¡Rápido!', 1.6);
      }
    }
  }
  if (G.actName === 'sweep') G.stopAction(0.5);
}

// ======================================================================
// 3. Momento God of War 1: la cadena, el brazo, la mano, la torre
// ======================================================================
function* gow1(D, G, S, bolt) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  F.cinema(true, { skip: false });
  F.puppet(true);
  p.autoDir = null;
  G._armScript = true;
  G.speedK = 1;
  G.rootMotion = false;
  const rope = S.rope;
  // el brazo, por el guion: de donde esté a donde se diga, con su codo
  const arm = (D.arm = armDriver(D, G));
  // ---- se mira el brazo atravesado y ruge (la cadena, floja, de la torre
  // a su brazo)
  F.slow(1, 5);
  G.play('armHit', { blend: 0.1 });
  arm.to(ARM.look, 0.9);
  rope.len = rope.span() + 1.5;
  F.pClip(FP.windStand, { blend: 0.2 });
  const sp = S.standPoint(new V3());
  F.setP(sp.x, sp.y, sp.z, S.worldYaw);
  // (por delante y a su izquierda: el brazo atravesado, la cadena que se va
  // hacia la torre, la cara que ruge)
  F.follow((dt, tt) => {
    const k = sm(clamp(tt / 2.2, 0, 1));
    const look = bolt.tail.clone().lerp(G.head(_v), 0.45);
    return { pos: camSafe(g, look.clone(), G.wp(lerp(15, 12, k), lerp(8, 10, k), lerp(17, 14, k), new V3())), look, fov: 52 };
  });
  F.hand = 0.025;
  let roared = false;
  while (G.actT < 2.2) {
    yield;
    if (!roared && G.actT > 1.0) {
      roared = true;
      a && a.play('beastRoarBig', G.face(_v), { k: 2.2 });
    }
  }
  // (desde detrás del bolardo, a lo largo de la cadena)
  const ring0 = S.ring.clone();
  F.follow(() => ({ pos: ring0.clone().add(_v.set(1.3, 1.4, 2.4)), look: bolt.tail.clone().lerp(G.head(_v2), 0.2), fov: 58 }));
  // ---- si le dio de lejos, viene hacia la torre, furioso (la cadena se
  // comba al acercarse)
  if (Math.hypot(STOP.x - G.pos.x, STOP.z - G.pos.z) > 2.5) {
    G.base('walk', { blend: 0.4 });
    G.stopAction(0.4);
    G.rootMotion = true;
    G.speedK = 1.25;
    let roar = 0.6;
    while (Math.hypot(STOP.x - G.pos.x, STOP.z - G.pos.z) > 1.2) {
      const dt = yield;
      G.yaw = dampAngle(G.yaw, Math.atan2(STOP.x - G.pos.x, STOP.z - G.pos.z), 2, dt);
      rope.len = Math.max(rope.span() + 1.2, Math.min(rope.len, rope.span() + 4));
      roar -= dt;
      if (roar <= 0) {
        roar = 2.2;
        a && a.play('beastRoar', G.head(_v), { k: 1.8 });
      }
    }
    G.rootMotion = false;
    G.speedK = 1;
    G.base('idle', { blend: 0.4 });
  }
  // ---- tira de la cadena: la torre cruje
  G.play('yank', { blend: 0.25 });
  arm.to(ARM.yank, 0.75, 0.45);
  let yanked = false;
  while (G.actT < 1.0) {
    yield;
    if (!yanked && G.actT > 0.75) {
      yanked = true;
      rope.len = rope.span() * 0.985;
      a && a.play('chainRun', S.ring, { k: 2 });
      a && a.play('stoneCreak', S.ring, { k: 2 });
      a && a.play('stairCreak', S.ring, { k: 1.6 });
      g.camRig.shake(0.9);
      g.input.rumble(1, 1, 500);
      S.recoil = -1.2;
      g.fx.blood.emit(T.x, T.h - 0.5, T.z, 40, { color: DUST, speed: 3, life: 2, up: 0.5, gravity: 1 });
    }
  }
  G.base('tug', { blend: 0.4 });
  G.stopAction(0.4);
  // (tensa: la cadena recta de la argolla al virote)
  F.also(
    (function* () {
      while (rope.pins[0] && !gowDone(D)) {
        yield;
        rope.len = Math.max(1, rope.span() * 0.99);
      }
    })()
  );
  // ¡Corre!: desde detrás del jugador, a lo largo de la cadena
  const ring = S.ring.clone();
  F.shot(ring.clone().add(_v.set(1.3, 1.4, 2.4)), bolt.tail.clone(), { fov: 60 });
  const okRun = yield* F.prompt({ action: 'dodge', label: '¡Corre!', window: 1.1, slow: 0.3 });
  if (!okRun) {
    F.hurt(14, null, { shake: 0.6 });
    F.pClip('fallBack', { blend: 0.05 });
    yield* F.wait(0.5);
  }
  // corre por la cadena: de la argolla a su brazo
  F.pClip(FP.chainRun, { blend: 0.08 });
  a && a.play('leapWind', p.pos, { k: 1 });
  let s = 0.6;
  F.attach = () => {
    const at = rope.at(s, new V3(), _v2);
    const dir = _v2;
    return { pos: at.add(_v3.set(0, 0.06, 0)), yaw: Math.atan2(dir.x, dir.z) };
  };
  F.slow(0.8, 4);
  F.follow(() => {
    const P = p.pos;
    const dir = new V3();
    rope.at(s, new V3(), dir);
    const pos = new V3(P.x, P.y + 1.0, P.z).addScaledVector(dir, -2.7).add(_v.set(dir.z * 0.55, 0, -dir.x * 0.55));
    const look = new V3(P.x, P.y + 0.9, P.z).addScaledVector(dir, 7).lerp(G.head(_v3), 0.12);
    return { pos, look, fov: 66 };
  });
  F.hand = 0.04;
  const runEnd = () => rope.length() - 2.2;
  let shook = false,
    stepT = 0;
  while (s < runEnd()) {
    const dt = yield;
    s += dt * 8.5;
    stepT -= dt;
    if (stepT <= 0) {
      stepT = 0.28;
      a && a.play('chainRun', p.pos, { k: 0.6 });
    }
    if (!shook && s > runEnd() - 3.5) {
      shook = true;
      // se da cuenta: se sacude el brazo
      G.base('shakeArm', { blend: 0.3 });
      a && a.play('beastRoar', G.head(_v), { k: 2 });
    }
  }
  // ¡Agárrate!: se tira al antebrazo, junto al virote
  const onArm = armPoint(G);
  F.attach = () => onArm.get();
  F.pClip(FP.cling, { blend: 0.1 });
  arm.shake = 1;
  F.slow(1, 6);
  F.follow(() => {
    const P = p.pos;
    return { pos: G.wp(16.5, 12.5, 5.5, new V3()), look: P.clone().lerp(G.face(_v), 0.35), fov: 50 };
  });
  F.hand = 0.06;
  const okHold = yield* F.prompt({ action: 'interact', label: '¡Agárrate!', window: 2.4, mash: 6, slow: 0.6 });
  if (!okHold) {
    F.hurt(20, null, { shake: 0.8, heavy: true });
    a && a.play('boneCrack', p.pos, { k: 1 });
  }
  arm.shake = 0;
  G.base('tug', { blend: 0.4 });
  // ---- al dorso de la mano: ¡Apuñala!
  onArm.f = 0.92;
  onArm.lift = 0.85;
  yield* F.wait(0.5);
  F.follow(() => {
    const P = p.pos;
    return { pos: G.wp(13.5, 13.5, 10.5, new V3()), look: P.clone().lerp(G.face(_v), 0.4), fov: 48 };
  });
  const okStab = yield* F.prompt({ action: 'light', label: '¡Apuñala!', window: 2.6, mash: 5, slow: 0.5 });
  F.pClip(FP.stabDown, { blend: 0.05 });
  const hp = G.M.byName.handL.getWorldPosition(new V3());
  a && a.play('thrust', hp, { k: 2 });
  a && a.play('fleshBurst', hp, { k: 1.6 });
  g.fx.blood.emit(hp.x, hp.y + 0.8, hp.z, 60, { color: [0.4, 0.06, 0.05], speed: 5, life: 1.6, up: 3 });
  G.play('handStab', { blend: 0.08 });
  yield* F.wait(0.12);
  a && a.play('beastRoarBig', G.face(_v), { k: 2.6 });
  g.camRig.shake(1.0);
  g.input.rumble(1, 1, 900);
  if (!okStab) F.hurt(16, null, { shake: 0.6 });
  yield* F.wait(1.0);
  // ---- estrella el brazo contra la torre: te deslizas al virote y te
  // cuelgas de él
  onArm.hang = true;
  F.attach = () => hangOnBolt(bolt);
  F.pClip(FP.hangBolt, { blend: 0.12 });
  G.play('smashTower', { blend: 0.2 });
  G.base('idle', { blend: 0.6 });
  arm.to(ARM.wind, 0.7);
  // (desde la plaza, al oeste y bajo: el brazo contra lo alto de la torre)
  F.shot([-13.2, 8.5, 49.5], [-3.0, 11, 54.5], { fov: 66 });
  F.hand = 0.04;
  // (da un paso: se lleva la escalera por delante)
  const want = new V3(T.x + 3.6, 0, T.deck[1] - 8.0);
  const dx = want.x - G.pos.x,
    dz = want.z - G.pos.z;
  let smashed = false,
    struck = false;
  let t = 0;
  const g0 = G.pos.clone();
  while (G.actT < 1.55) {
    const dt = yield;
    t += dt;
    const k = sm(clamp((G.actT - 0.5) / 0.6, 0, 1));
    G.pos.set(g0.x + dx * k, 0, g0.z + dz * k);
    G.yaw = dampAngle(G.yaw, Math.atan2(DECK.x - G.pos.x, DECK.z - G.pos.z), 3, dt);
    if (!struck && G.actT > 0.72) {
      struck = true;
      arm.toWorld(DECK.clone().add(_v.set(0.5, -0.6, -1.2)), 0.33);
    }
    if (!smashed && G.actT > 0.62) breakStair(D);
    if (!smashed && G.actT > 1.05) {
      smashed = true;
      smashTop(D, S);
    }
  }
  // (colgado del virote bajo el brazo, entre las astillas que caen)
  // (de lado y un poco por debajo: él colgando del brazo, la torre rota
  // detrás, la plaza abajo)
  F.follow((dt, tt) => {
    const P = p.pos;
    const k = sm(clamp(tt / 1.6, 0, 1));
    return { pos: new V3(P.x + lerp(4.0, 5.2, k), P.y + lerp(1.2, 0.6, k), P.z + lerp(3.0, 4.2, k)), look: new V3(P.x, P.y + 1.5, P.z), fov: 58 };
  });
  F.hand = 0.05;
  a && a.play('playerHurt', p.pos);
  yield* F.wait(1.4);
  D.gow1 = { bolt };
}
function gowDone(D) {
  return !!D.gow1;
}

// el brazo izquierdo llevado por el guion (IK): hacia una pose (espacio
// del modelo) o un punto del mundo, en un tiempo; y sacudido si se pide
export function armDriver(D, G) {
  const w = new V3(),
    pole = new V3(),
    w0 = new V3(),
    p0 = new V3(),
    s0 = new V3(),
    q0 = new V3();
  const inv = new THREE.Matrix4();
  const A = { from: null, to: null, dur: 0.5, t: 1, shake: 0, world: null, weight: 1 };
  G.M.byName.handL.getWorldPosition(w);
  pole.copy(G.wp(10, 10, 4, new V3()));
  // (de dónde sale, en el espacio del gigante: si corre, la mano no se queda
  // atrás en el sitio donde empezó el gesto)
  const from = () => {
    inv.copy(G.M.root.matrixWorld).invert();
    w0.copy(w).applyMatrix4(inv);
    p0.copy(pole).applyMatrix4(inv);
  };
  A.to = (pose, dur = 0.5) => {
    from();
    A.pose = pose;
    A.world = null;
    A.dur = dur;
    A.t = 0;
  };
  A.toWorld = (pt, dur = 0.4) => {
    from();
    A.world = pt.clone();
    A.dur = dur;
    A.t = 0;
  };
  D.film.also(
    (function* () {
      let tt = 0;
      while (!A.release) {
        const dt = yield;
        tt += dt;
        A.t = Math.min(1, A.t + dt / Math.max(0.01, A.dur));
        const k = sm(A.t);
        G.wp(w0.x, w0.y, w0.z, s0);
        G.wp(p0.x, p0.y, p0.z, q0);
        const tw = A.world ? _v.copy(A.world) : A.pose ? G.wp(...A.pose.w, _v) : _v.copy(s0);
        const tp = A.world ? G.wp(12, 9, -2, _v2) : A.pose ? G.wp(...A.pose.pole, _v2) : _v2.copy(q0);
        w.lerpVectors(s0, tw, k);
        pole.lerpVectors(q0, tp, k);
        if (A.shake > 0) {
          w.x += Math.sin(tt * 17) * 1.3 * A.shake;
          w.y += Math.sin(tt * 13 + 1) * 1.0 * A.shake;
          w.z += Math.sin(tt * 11 + 2) * 0.8 * A.shake;
        }
        G.reachHand('L', w, pole, A.weight, { stretch: 1.15 });
      }
      G.freeHand('L');
    })()
  );
  return A;
}
// un punto en lo alto del antebrazo (f: 0 el codo, 1 la muñeca), para el
// jugador agarrado a él; con hang, colgado del virote
function armPoint(G) {
  const P = { f: 0.55, lift: 0.95, hang: false };
  P.get = () => {
    const B = G.M.byName;
    const e = B.foreL.getWorldPosition(new V3()),
      w = B.handL.getWorldPosition(new V3());
    const at = e.clone().lerp(w, P.f);
    at.y += P.lift;
    const d = _v.subVectors(w, e).normalize();
    // (tumbado a lo largo del antebrazo, la cabeza hacia la mano y boca
    // abajo: el eje del cuerpo, a lo largo; el pecho, contra el brazo)
    const front = _v2.set(0, -1, 0).addScaledVector(d, d.y).normalize();
    const right = _v3.crossVectors(d, front).normalize();
    const m = new THREE.Matrix4().makeBasis(right, d, front);
    const tilt = new THREE.Quaternion().setFromRotationMatrix(m);
    at.addScaledVector(d, -0.9);
    return { pos: at, yaw: 0, tilt };
  };
  return P;
}
// colgado del virote: las manos en el astil, el cuerpo debajo
export function hangOnBolt(bolt) {
  const q = bolt.mesh.quaternion;
  const along = _v.set(0, 0, 1).applyQuaternion(q);
  const grip = bolt.tail.clone().addScaledVector(along, BOLT_L - 0.12);
  return { pos: grip.add(_v2.set(0, -2.15, 0)), yaw: Math.atan2(along.x, along.z) + Math.PI / 2, tilt: new THREE.Quaternion() };
}

// la escalera, aplastada al paso
function breakStair(D) {
  const g = D.g;
  if (!g.groups.torreSurStair || !g.groups.torreSurStair.on) return;
  g.setGroupVisible('torreSurStair', false);
  g.setGroupVisible('torreSurStairRuin', true);
  const S = T.stair;
  for (let i = 0; i < 14; i++) {
    const z = S.z0 + rnd(4, 13),
      y = ((z - S.z0) / (S.n * S.run)) * S.n * S.rise;
    D.chunks.add({ mat: 'planks', size: [S.w * rnd(0.6, 1), 0.07, 0.3], pos: new V3(S.x + rnd(-0.6, 0.6), y, z), rot: [rnd(-0.5, 0.5), rnd(0, 3), rnd(-0.5, 0.5)], vel: new V3(rnd(0, 6), rnd(1, 5), rnd(1, 6)), spin: [rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)], shatter: 99, life: 8 });
  }
  g.audio && g.audio.play('rackBreak', { x: S.x, y: 4, z: S.z0 + 8 }, { k: 2 });
  g.audio && g.audio.play('woodBreak', { x: S.x, y: 4, z: S.z0 + 8 }, { k: 2 });
}
// lo alto de la torre revienta: el cadalso, el pretil, la espringala; la
// cadena se parte (cuelga del virote)
function smashTop(D, S) {
  const g = D.g,
    a = g.audio;
  g.setGroupVisible('torreSurTop', false);
  g.setGroupVisible('torreSurTopRuin', true);
  const c = new V3(T.x, T.deckY + 0.5, T.z);
  // la espringala, en pedazos
  S.root.visible = false;
  S.bollardG.visible = false;
  S.rope.pin(0, null);
  const [dx0, dz0, dx1, dz1] = T.deck;
  for (let i = 0; i < 22; i++)
    D.chunks.add({ mat: i % 4 ? 'planks' : 'timber', size: i % 4 ? [rnd(0.8, 1.6), 0.08, 0.28] : [0.24, 0.24, rnd(1.4, 2.6)], pos: new V3(rnd(dx0, dx1), T.deckY + rnd(-0.3, 1.2), rnd(dz0, dz1)), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(rnd(-9, 4), rnd(3, 11), rnd(2, 12)), spin: [rnd(-9, 9), rnd(-9, 9), rnd(-9, 9)], shatter: 99, life: 9 });
  D.debris.burst(c, 30, { speed: 10, up: 7, size: 0.9, spread: 2.5 });
  g.fx.blood.emit(c.x, c.y, c.z, 90, { color: DUST, speed: 9, life: 2.4, up: 2, gravity: 0.3 });
  a && a.play('explosion', c, { k: 2 });
  a && a.play('rackBreak', c, { k: 2.2 });
  a && a.play('woodBreak', c, { k: 2 });
  a && a.play('chainRun', c, { k: 2 });
  g.camRig.shake(1.6);
  g.flash = Math.max(g.flash || 0, 0.25);
  g.input.rumble(1, 1, 1000);
}
