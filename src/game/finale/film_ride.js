// La película, acto 5: la cabalgada.
//
// Enloquecido, echa a correr hacia el norte contigo colgado del virote de su
// antebrazo: la plaza de la puerta, la Herrería en ruinas, la plaza del Pan
// (entre la fuente y la picota), la Rúa da Sé (las casas del centro revientan
// a su paso, y el arco de la Sé), el atrio, la fachada de la catedral (la
// atraviesa con el hombro), la nave destripada y la brecha de la muralla.
//   - Sacude el brazo: ¡Agárrate!
//   - El brazo se mete por la casa de los soportales: ¡Agáchate!
//   - En el atrio se lleva el brazo a la boca para arrancarte de un mordisco:
//     ¡Apuñala! (el labio: aparta el brazo y grita)
//   - En la brecha restriega el antebrazo por lo alto de la muralla para
//     quitarte de encima (las almenas revientan a su paso, y tú vas de
//     rodillas por el adarve, agarrado al virote): ¡Salta! Ruedas hasta el
//     parapeto; él sigue hacia el cráter (punto de control 'muralla').
// Colgado, el jugador es un péndulo: se balancea con lo que acelera la mano.
import * as THREE from 'three';
import { sm, lerp, Path, camSafe } from './film.js';
import { FP } from './film_player.js';
import { armDriver, hangOnBolt, springald1 } from './film_tower.js';
import { breakWave, breakArm, waveHouses, rectDist, smashHouse } from './film_wave.js';
import { BOLT_L } from './springald.js';
import { NAVE, MERLONS_N, merlonSpans } from '../../world/level_finale.js';
import { clamp, dampAngle } from '../../core/util.js';

const V3 = THREE.Vector3;
const rnd = (a, b) => a + Math.random() * (b - a);
const _v = new V3(),
  _v2 = new V3(),
  _v3 = new V3();
const DUST = [0.26, 0.24, 0.22];
const _I = new THREE.Quaternion();
const YN = 10; // el suelo del adarve norte (level_walls.js)

// El camino del gigante: de la torre, calle arriba, la plaza del Pan (por el
// este de la fuente), la Rúa da Sé, el atrio, la nave y la brecha
export const GPATH5 = new Path([
  [-1.9, 0, 48.6],
  [-0.5, 0, 44.0],
  [0.0, 0, 30.0],
  [0.0, 0, 14.0],
  [6.0, 0, 6.0],
  [6.0, 0, -6.0],
  [0.0, 0, -15.0],
  [0.0, 0, -36.0],
  [0.0, 0, -47.0],
  [0.0, 0, -68.0],
  [0.0, 0, -104.0],
  [-1.0, 0, -114.0],
  [-2.0, 0, -121.5],
  [-2.5, 0, -128.0],
  [-2.0, 0, -136.0],
]);
// el brazo del virote (espacio del modelo): en alto delante del pecho, y a la
// boca
const ARM5 = {
  carry: { w: [4.6, 12.2, 6.0], pole: [10, 10, 0] },
  // (más bajo, al correr: el jugador, a la altura de los tejados)
  low: { w: [4.8, 9.6, 6.6], pole: [10, 9, 0] },
  // (más alto: que el jugador pase por encima del parapeto de la muralla)
  high: { w: [4.6, 13.6, 5.6], pole: [10, 11, 0] },
  bite: { w: [1.4, 14.4, 7.4], pole: [9, 12, 7] },
};
// los momentos (metros del camino del gigante)
const AT5 = { shake: 24, duck: 63.5, bite: 99 };
// la brecha: dónde frena (z), por dónde arrastra el brazo (la mano, de A a B,
// por encima de las almenas) y las cámaras
const RUB = {
  stopZ: -123.2,
  A: [-14.4, YN + 1.5, -125.5],
  B: [-7.6, YN + 1.5, -125.5],
  camW: [-20.5, YN + 1.5, -122.9],
};

// ======================================================================
// ACTO 5
// ======================================================================
export function* actRide(D, o = {}) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  const G = yield* D.waitGiant();
  if (!D.gow1 || o.fromCP) setupRide(D, G);
  const bolt = D.gow1.bolt;
  restick(bolt, G);
  F.cinema(true);
  F.puppet(true);
  p.autoDir = null;
  G._armScript = true;
  const arm = D.arm || (D.arm = armDriver(D, G));
  arm.to(ARM5.carry, 0.9);
  arm.shake = 0;
  // colgado, como un péndulo
  const hang = pendulum(D, bolt);
  F.attach = () => hang.get();
  F.keyLight(1);
  F.pClip(FP.hangBolt, { blend: 0.2 });
  F.also(hang.run());
  // la campana, arrastrada detrás, a su derecha (la cadena en la mano)
  const bell = { at: [-3.5, 0.8, -9] };
  const bellG = (bell.guide = G.bell.guide = { target: G.wp(...bell.at, new V3()), k: 6, d: 3.5, antiGrav: false });
  F.also(
    (function* () {
      while (G.bell.guide === bellG) {
        yield;
        G.wp(...bell.at, bellG.target);
      }
    })()
  );
  // (en la nave, el suelo de la nave; sobre el hueco de la cripta, también)
  G.groundFn = (x, z) => (z > -105 && z < -57 && Math.abs(x) < 13 ? NAVE.FY : g.world.col.groundHeight(x, z, 0.2, 0.7));
  g.atmo.override = { density: 0.0085, vol: 0.05, far: 320, bloom: 1.25, hemi: 3.2, moon: 3.3, moonPos: [-20, 30, -10], fog: 0x34302e, exposure: 1.2, ash: 0.3 };
  D.windK = 0.4;
  // ------------------------------------------------- 1. se vuelve y ruge
  G.play('roar', { blend: 0.4 });
  G.base('idle', { blend: 0.5 });
  G.rootMotion = false;
  G.lookW = 0.5;
  G.lookAt = null;
  const yaw0 = G.yaw,
    yaw1 = Math.PI;
  F.shot([9.5, 3.0, 36.5], G.chest(new V3()).add(_v.set(0, 2, 0)), { fov: 58 });
  F.hand = 0.03;
  let roared = false;
  while (G.actT < 2.2) {
    yield;
    G.yaw = yaw0 + angDiff(yaw1, yaw0) * sm(clamp(G.actT / 1.6, 0, 1));
    if (!roared && G.actT > 1.2) {
      roared = true;
      a && a.play('beastRoarBig', G.face(_v), { k: 2.4 });
      g.camRig.shake(0.7);
    }
  }
  // ------------------------------------------------- 2. a la carrera
  G.stopAction(0.4);
  G.base('runArm', { blend: 0.4 });
  G.rootMotion = true;
  G.speedK = 0.6;
  const run = { s: 0, want: 1 };
  F.also(runner(D, G, run));
  // (delante de él, calle arriba, mirándole venir: por el medio de la calle
  // y por encima de las vigas de la Herrería en ruinas)
  F.follow((dt, tt) => {
    const f = G.forward(new V3());
    const pos = G.pos.clone().addScaledVector(f, lerp(16, 12, sm(clamp(tt / 3, 0, 1)))).add(_v.set(f.z * 1.1, 5.4, -f.x * 1.1));
    const look = G.chest(new V3()).lerp(p.pos, 0.35);
    return { pos: camSafe(g, look.clone(), pos), look, fov: 60 };
  });
  F.hand = 0.05;
  while (run.s < AT5.shake) yield;
  // ------------------------------------------------- 3. ¡Agárrate!
  arm.shake = 1;
  a && a.play('beastRoar', G.head(_v), { k: 1.8 });
  // (a su lado, junto al jugador: el brazo arriba, el suelo pasando abajo)
  F.follow(() => {
    const P = p.pos;
    const pos = G.wp(10.5, 6.5, 9.5, new V3());
    return { pos: camSafe(g, P.clone(), pos), look: P.clone().add(_v.set(0, 1.4, 0)), fov: 58 };
  });
  F.hand = 0.07;
  const okHold = yield* F.prompt({ action: 'interact', label: '¡Agárrate!', window: 2.4, mash: 6, slow: 0.5 });
  arm.shake = 0;
  if (!okHold) {
    F.hurt(18, null, { shake: 0.8 });
    a && a.play('playerHurt', p.pos);
  }
  // (la plaza del Pan, desde la esquina, en alto)
  F.shot([-15.5, 9.5, -12.5], G.chest(new V3()), { fov: 58 });
  F.follow(() => ({ pos: new V3(-15.5, 9.5, -12.5), look: G.chest(new V3()).lerp(p.pos, 0.3), fov: 56 }));
  F.hand = 0.03;
  while (run.s < AT5.duck - 6) yield;
  // ------------------------------------------------- 4. ¡Agáchate!: los soportales
  // (baja el brazo al correr: el jugador va derecho a los soportales del
  // norte de la plaza, y detrás, a la casa del otro lado del callejón; detrás
  // de él, por encima: el tejado que se le viene encima)
  arm.to(ARM5.low, 0.9);
  const dc = new V3();
  const nearP = (off, rate) => (dt, tt) => {
    const gp = hang.gripAt(new V3());
    const want = _v.copy(gp).add(_v2.set(...off));
    if (tt < 0.05) dc.copy(want);
    else dc.lerp(want, Math.min(1, dt * rate));
    return { pos: dc.clone(), look: gp.clone().add(_v2.set(0, -1.1, 0)), fov: 60 };
  };
  F.follow(nearP([-3.2, 1.6, 5.2], 6));
  F.hand = 0.05;
  while (run.s < AT5.duck) yield;
  const okDuck = yield* F.prompt({ action: 'dodge', label: '¡Agáchate!', window: 0.9, slow: 0.2 });
  F.pClip(FP.tuck, { blend: 0.06 });
  if (!okDuck) {
    F.hurt(22, null, { shake: 1, heavy: true });
    a && a.play('boneCrack', p.pos, { k: 1.2 });
  }
  // (de lado, junto a él: revienta por los tejados)
  F.follow(nearP([-4.6, -0.6, -1.6], 8));
  F.hand = 0.07;
  yield* F.wait(1.5);
  arm.to(ARM5.carry, 0.8);
  F.pClip(FP.hangBolt, { blend: 0.2 });
  yield* F.wait(0.3);
  // (la calle, desde el arco: viene hacia aquí, las casas revientan y el arco
  // se viene abajo; la cámara retrocede ante él por el atrio)
  const ac = new V3(1.4, 2.0, -42.5);
  F.follow((dt) => {
    const want = _v.set(1.4, 2.0, Math.min(-42.5, G.pos.z - 10.5));
    ac.lerp(want, Math.min(1, dt * 4));
    const look = G.chest(new V3()).lerp(p.pos, 0.35);
    return { pos: ac.clone(), look, fov: 62 };
  });
  F.hand = 0.04;
  // ------------------------------------------------- 5. el mordisco
  while (run.s < AT5.bite - 5) yield;
  run.want = 0;
  while (G.speedK > 0.08) yield;
  G.speedK = 1;
  G.rootMotion = false;
  G.base('idle', { blend: 0.4 });
  G.play('bite', { blend: 0.3 });
  arm.to(ARM5.bite, 0.75);
  // (por encima del hombro del jugador: la jaula, los ojos, la boca que se
  // abre a un palmo)
  const bc = new V3();
  F.follow((dt, tt) => {
    const face = G.face(new V3()),
      pl = p.pos.clone().add(_v.set(0, 1.4, 0));
    const d = _v2.subVectors(pl, face).normalize();
    const want = pl.clone().addScaledVector(d, 3.5).add(_v3.set(d.z * -1.0, 0.3, -d.x * -1.0));
    if (tt < 0.05) bc.copy(want);
    else bc.lerp(want, Math.min(1, dt * 5));
    return { pos: camSafe(g, pl.clone(), bc.clone()), look: face, fov: 50 };
  });
  F.hand = 0.03;
  while (G.actT < 0.7) yield;
  a && a.play('beastRoar', G.face(_v), { k: 1.6 });
  const okStab = yield* F.prompt({ action: 'light', label: '¡Apuñala!', window: 2.2, mash: 4, slow: 0.35 });
  F.pClip(FP.stabUp, { blend: 0.05 });
  const lip = G.face(new V3());
  a && a.play('thrust', lip, { k: 2 });
  a && a.play('fleshTear', lip, { k: 1.6 });
  g.fx.blood.emit(lip.x, lip.y - 0.6, lip.z, 50, { color: [0.4, 0.06, 0.05], speed: 5, life: 1.4, up: 1 });
  if (!okStab) {
    // (le muerde el hombro antes de soltar)
    F.hurt(26, lip, { shake: 1, heavy: true });
    a && a.play('bite', p.pos, { k: 1.6 });
  }
  G.play('biteHurt', { blend: 0.08 });
  arm.to(ARM5.carry, 0.35);
  yield* F.wait(0.15);
  a && a.play('beastRoarBig', G.face(_v), { k: 2.6 });
  g.camRig.shake(1.1);
  g.input.rumble(1, 1, 900);
  yield* F.wait(0.9);
  F.pClip(FP.hangBolt, { blend: 0.2 });
  // ------------------------------------------------- 6. la fachada, con el hombro
  // (arranca otra vez hacia la catedral)
  G.stopAction(0.4);
  G.base('runArm', { blend: 0.4 });
  G.rootMotion = true;
  G.speedK = 0.5;
  run.want = 0.8;
  // (desde dentro de la nave, mirando a la fachada: revienta hacia dentro)
  F.shot([3.5, 4.0, -84], [0, 9, -58], { fov: 66 });
  F.hand = 0.05;
  while (G.pos.z > -48.8) yield;
  G.play('bashR', { blend: 0.25 });
  run.bash = true;
  let crashed = false;
  G.onEventHook = (e) => {
    if (e === 'bash' && !crashed) {
      crashed = true;
      smashFacade(D, G);
    }
  };
  while (G.actT < 2.4) yield;
  G.onEventHook = null;
  run.bash = false;
  // ------------------------------------------------- 7. la nave
  G.stopAction(0.4);
  G.base('runArm', { blend: 0.3 });
  run.want = 1;
  G.speedK = 0.8;
  // (por la nave lateral del oeste, delante del jugador, que viene colgado
  // entre los pilares; el gigante, por la nave central)
  const nc = new V3();
  F.follow((dt, tt) => {
    const P = p.pos;
    const want = _v.set(-10.2, 7.4, Math.max(-106, P.z - 10.5));
    if (tt < 0.05) nc.copy(want);
    else nc.lerp(want, Math.min(1, dt * 3));
    const look = P.clone().add(_v2.set(1.4, 0.4, 0)).lerp(G.chest(_v3), 0.25);
    return { pos: nc.clone(), look, fov: 60 };
  });
  F.hand = 0.04;
  while (G.pos.z > -100) {
    yield;
    // (los arcos del último tramo, a su paso)
    if (G.pos.z < -60 && G.pos.z > -76) breakArcade(D, 3);
  }
  // (sube el brazo: el jugador, por encima del parapeto de la muralla)
  arm.to(ARM5.high, 1.2);
  // ------------------------------------------------- 8. la brecha: ¡Salta!
  yield* rub(D, G, arm, hang, run, bolt, bell);
}

const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// Desde fuera (modo de pruebas): el gigante ante la torre rota, el virote en
// el antebrazo y el jugador colgado de él
function setupRide(D, G) {
  const g = D.g,
    F = D.film;
  F.cinema(true, { instant: true });
  F.puppet(true);
  D.setWorld(2);
  g.setGroupVisible('torreSurTop', false);
  g.setGroupVisible('torreSurTopRuin', true);
  g.setGroupVisible('torreSurStair', false);
  g.setGroupVisible('torreSurStairRuin', true);
  G.place(-1.9, 48.6, Math.atan2(-3.6, 11.4), { base: 'idle' });
  G.setBell(true);
  G.groundFn = null;
  armBolt(D, G);
  g.atmo.override = { density: 0.0085, vol: 0.05, far: 320, hemi: 3.2, moon: 3.3, exposure: 1.2, ash: 0.3, snap: true };
  g.fadeTarget = 1;
  g.audio && g.audio.music('bossFinal');
}

// (desde un punto de control: el virote de la primera espringala, clavado
// en su antebrazo, con su cadena rota colgando)
export function armBolt(D, G) {
  const S = springald1(D);
  S.root.visible = false;
  S.bollardG.visible = false;
  S.load = 1;
  S.update(0);
  const bolt = S.fire({ speed: 1 });
  S.rope.pin(0, null);
  S.rope.len = 14;
  const B = G.M.byName;
  const e = B.foreL.getWorldPosition(new V3());
  bolt.stickTo(B.foreL, e, new V3(1, 0, 0), 1.5);
  restick(bolt, G);
  D.gow1 = { bolt };
  return bolt;
}
// El virote, atravesado en el antebrazo de dentro a fuera (la cola junto al
// cuerpo, la punta asomando por fuera: de ahí se cuelga el jugador)
export function restick(bolt, G) {
  const B = G.M.byName;
  const e = B.foreL.getWorldPosition(new V3()),
    w = B.handL.getWorldPosition(new V3());
  const ax = _v.subVectors(w, e).normalize();
  const out = G.wd(1, 0, 0, new V3());
  out.addScaledVector(ax, -out.dot(ax)).normalize();
  const mid = e.clone().lerp(w, 0.45);
  bolt.stickTo(B.foreL, mid.addScaledVector(out, -0.7), out, BOLT_L - 0.35);
}

// El jugador colgado del virote: un péndulo (los pies se van hacia donde no
// acelera la mano), con las manos siempre en el astil
function pendulum(D, bolt) {
  const L = 2.15;
  const H = { d: new V3(), v: new V3(), grip: new V3(), prev: null, vel: new V3(), extra: null };
  H.gripAt = (out) => {
    const q = bolt.mesh.quaternion;
    const along = _v3.set(0, 0, 1).applyQuaternion(q);
    return out.copy(bolt.tail).addScaledVector(along, BOLT_L - 0.25);
  };
  H.run = function* () {
    let n = 0;
    while (!H.stop) {
      const dt = yield;
      if (dt <= 0) continue;
      const gp = H.gripAt(_v2);
      if (n++ > 0) {
        const nv = _v.subVectors(gp, H.prev).divideScalar(dt);
        // la aceleración de la mano (horizontal): empuja los pies al revés
        if (n > 2) {
          const acc = nv.clone().sub(H.vel).divideScalar(dt);
          acc.y = 0;
          if (acc.length() > 60) acc.setLength(60);
          H.v.addScaledVector(acc, -dt * 0.9);
        }
        H.vel.copy(nv);
      } else H.prev = new V3();
      H.prev.copy(gp);
      H.v.addScaledVector(H.d, (-9.8 / L) * dt);
      H.v.multiplyScalar(1 - Math.min(1, dt * 1.1));
      H.d.addScaledVector(H.v, dt);
      H.d.y = 0;
      if (H.d.length() > 1.5) H.d.setLength(1.5);
    }
  };
  H.get = () => {
    if (H.extra) return H.extra();
    const gp = H.gripAt(new V3());
    const dy = Math.sqrt(Math.max(0.1, L * L - H.d.lengthSq()));
    const feet = gp.clone().add(_v.set(H.d.x, -dy, H.d.z));
    const up = _v2.subVectors(gp, feet).normalize();
    const tilt = new THREE.Quaternion().setFromUnitVectors(_v3.set(0, 1, 0), up);
    return { pos: feet, yaw: D.giant.yaw, tilt };
  };
  return H;
}

// la carrera: por su camino, con la velocidad que diga el guion; revienta
// lo que toca (las casas del centro, los muros de la Sé, el arco)
function* runner(D, G, run) {
  const g = D.g;
  while (!run.done) {
    const dt = yield;
    if (!run.bash) {
      const s = GPATH5.project(G.pos.x, G.pos.z);
      run.s = s;
      const c = GPATH5.at(s, {}),
        q = GPATH5.at(s + 8, {});
      G.yaw = dampAngle(G.yaw, Math.atan2(q.x - G.pos.x, q.z - G.pos.z), 2.4, dt);
      const ox = G.pos.x - c.x,
        oz = G.pos.z - c.z;
      const al = ox * c.tx + oz * c.tz;
      const k = Math.min(1, dt * 1.4);
      G.pos.x -= (ox - al * c.tx) * k;
      G.pos.z -= (oz - al * c.tz) * k;
      if (G.baseName === 'runArm') G.speedK += (run.want - G.speedK) * Math.min(1, dt * (run.want > G.speedK ? 1.2 : 2.6));
    } else run.s = GPATH5.project(G.pos.x, G.pos.z);
    breakWave(D, G, ['centro']);
    breakArm(D, G, ['centro']);
    // (y lo que atraviesa el jugador colgado: un tejado, un piso alto)
    const P = g.player.pos;
    for (const r of waveHouses(g, ['centro'])) {
      if (!g.groups[r.sub] || !g.groups[r.sub].on) continue;
      if (P.y < (r.h || 7) + 3 && rectDist(r, P.x, P.z) < 0.6) smashHouse(D, r, G.pos, ['centro']);
    }
    // el arco de la Sé
    if (G.pos.z < -33 && G.pos.z > -42 && D.breakHouse('centro:arco', { from: G.pos.clone(), tilt: 0.2, drop: 6, speed: 1.5, n: 18 })) smashArch(D, G);
    // los muros que flanquean la Sé, los tejados de la plaza
    if (G.pos.z < 0 && G.pos.z > -60) {
      const B = G.M.byName;
      for (const n of ['handL', 'handR', 'footL', 'footR']) D.wrecks.hit(B[n].getWorldPosition(_v3), 2.2, n[0] === 'h' ? 'arm' : 'foot');
    }
  }
}
function smashArch(D, G) {
  const g = D.g,
    a = g.audio;
  const c = new V3(0, 5, -38);
  for (let i = 0; i < 8; i++) D.chunks.add({ mat: 'ashlar', size: [rnd(0.6, 1.1), rnd(0.4, 0.7), rnd(0.5, 0.9)], pos: new V3(rnd(-3.4, 3.4), rnd(3, 7.6), -38 + rnd(-0.4, 0.4)), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(rnd(-6, 6), rnd(2, 7), rnd(-10, -3)), spin: [rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)], shatter: 12, life: 8, quiet: true });
  D.debris.burst(c, 26, { speed: 9, up: 5, size: 1, spread: 3 });
  a && a.play('wallBreak', c, { k: 2 });
  a && a.play('pillarBreak', c, { k: 1.6 });
  g.camRig.shake(0.7);
  void G;
}
// la fachada de la catedral, reventada con el hombro
function smashFacade(D, G) {
  const g = D.g,
    a = g.audio;
  const c = new V3(0, 8, -58);
  // (se viene abajo hacia dentro de la nave, entera, y revienta)
  D.crumble('fachada', { ruin: 'fachadaRuin', from: new V3(0, 8, -46), dir: new V3(0, 0, -1), tilt: 0.3, drop: 12, dur: 1.4, speed: 1.6, up: 0.8, n: 30, size: 1.3, sound: false, shake: false, at: c, dust: 1.8, roof: true });
  D.debris.burst(c, 40, { speed: 12, up: 6, size: 1.2, spread: 6 });
  a && a.play('explosion', c, { k: 2.2 });
  a && a.play('wallBreak', c, { k: 2.2 });
  a && a.play('pillarBreak', c, { k: 2 });
  a && a.play('bellToll', new V3(9, 18, -60), { k: 1.6 });
  g.camRig.shake(1.4);
  g.flash = Math.max(g.flash || 0, 0.25);
  g.input.rumble(1, 1, 1100);
  void G;
}
// los arcos del tramo k de la nave, a su paso
function breakArcade(D, k) {
  const g = D.g;
  if (!g.groups['naveArc:' + k] || !g.groups['naveArc:' + k].on) return;
  const c = new V3(0, 6, -68);
  D.crumble('naveArc:' + k, { ruin: 'naveArcRuin:' + k, from: new V3(0, 6, -64), tilt: 0.05, drop: 8, dur: 0.85, speed: 1.3, n: 22, sound: false, shake: false, at: c });
  g.audio && g.audio.play('pillarBreak', c, { k: 2 });
  g.audio && g.audio.play('wallBreak', c, { k: 1.6 });
  g.camRig.shake(0.8);
}

// La brecha: se mete en ella, frena y restriega el antebrazo por lo alto de la
// muralla del oeste (de A, donde golpea, a B, en la brecha): las almenas
// revientan a su paso y el jugador va de rodillas por el adarve, agarrado al
// virote. ¡Salta! Rueda hasta el parapeto (o se estrella contra una almena);
// él alza el brazo, ruge y sigue hacia el cráter.
function* rub(D, G, arm, hang, run, bolt, bell) {
  const bellG = bell.guide;
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  // (desde el adarve del oeste: cruza el patio de la cabecera y llega a la
  // brecha, con el jugador colgando por encima del muro)
  const cw = new V3(...RUB.camW);
  F.follow(() => ({ pos: cw, look: G.chest(new V3()).lerp(p.pos, 0.62), fov: 56 }));
  F.hand = 0.04;
  // (frena en la brecha)
  while (G.pos.z > RUB.stopZ + 3.3) yield;
  run.want = 0;
  while (G.speedK > 0.1) yield;
  G.rootMotion = false;
  G.speedK = 1;
  G.base('idle', { blend: 0.4 });
  // se inclina a su izquierda y alza el brazo...
  G.play('rubArm', { blend: 0.3 });
  bell.at = [-4.5, 0.8, -3];
  const A = new V3(...RUB.A),
    B = new V3(...RUB.B);
  arm.toWorld(_v.copy(A).add(_v2.set(1.2, 4.2, 1.6)), 0.55);
  a && a.play('beastRoar', G.head(_v), { k: 1.8 });
  yield* F.wait(0.55);
  // ... y lo descarga sobre las almenas
  arm.toWorld(A, 0.2);
  yield* F.wait(0.2);
  const spans = merlonSpans();
  const gone = new Set();
  const smash = (x, k = 1) => {
    spans.forEach(([x0, x1], i) => {
      if (gone.has(i) || Math.abs((x0 + x1) / 2 - x) > 0.95) return;
      gone.add(i);
      smashMerlon(D, i, x0, x1, k);
    });
  };
  smash(A.x, 1.4);
  a && a.play('slam', A, { k: 2.2 });
  g.camRig.shake(1.0);
  g.input.rumble(1, 1, 500);
  // el jugador, de rodillas en el adarve, tirado del virote (que sale del
  // antebrazo hacia sus manos)
  hang.stop = true;
  const Bn = G.M.byName;
  const K = new V3(),
    Hd = new V3(),
    fp = new V3();
  F.attach = () => {
    const e = Bn.foreL.getWorldPosition(_v),
      w = Bn.handL.getWorldPosition(_v2);
    fp.copy(e).lerp(w, 0.55);
    K.set(fp.x - 0.15, YN, -124.05);
    Hd.set(K.x, YN + 1.3, K.z - 0.4);
    const dir = _v3.subVectors(Hd, fp);
    const dl = dir.length();
    dir.divideScalar(dl);
    bolt.stickTo(Bn.foreL, fp.clone().addScaledVector(dir, 0.4), dir, clamp(dl - 0.4 + 0.3, 0.5, BOLT_L - 0.3));
    return { pos: K.clone(), yaw: Math.PI, tilt: _I };
  };
  F.pClip(FP.dragged, { blend: 0.08 });
  a && a.play('playerHurt', p.pos, { k: 0.6 });
  // (de cerca, desde dentro de la muralla, en alto: le arrastra de rodillas
  // hacia la brecha y las almenas revientan detrás)
  const rc = new V3();
  F.follow((dt, tt) => {
    const P = p.pos;
    const want = _v.set(P.x + 0.6, YN + 3.4, -119.6);
    if (tt < 0.05) rc.copy(want);
    else rc.lerp(want, Math.min(1, dt * 5));
    return { pos: rc.clone(), look: P.clone().add(_v2.set(0.4, 0.8, -0.9)), fov: 52 };
  });
  F.hand = 0.05;
  let t = 0;
  const T = 1.7;
  let q = null;
  while (t < T) {
    const dt = yield;
    t += dt;
    const k = sm(clamp(t / T, 0, 1));
    arm.world.lerpVectors(A, B, k);
    arm.world.y += Math.sin(t * 19) * 0.06;
    smash(arm.world.x);
    if (Math.random() < dt * 16) g.fx.blood.emit(arm.world.x, YN + 1.2, -125.4, 6, { color: DUST, speed: 3, life: 1, up: 1.4 });
    if (Math.random() < dt * 5) a && a.play('scrape', arm.world, { k: 1.6 });
    if (!q && t > 0.3) q = F.promptAsync({ action: 'dodge', label: '¡Salta!', window: 0.9, slow: 0.25 });
    if (q && q.ok !== null) break;
  }
  while (q && q.ok === null) {
    yield;
  }
  // suelta el virote: rueda hasta el parapeto, o se estrella contra una almena
  const from = p.pos.clone();
  F.attach = null;
  F.keyLight(0);
  const ok = !q || q.ok;
  const to = ok ? new V3(from.x - 1.4, YN, -122.95) : new V3(from.x + 0.6, YN, -124.6);
  if (ok) {
    F.pClip('roll', { blend: 0.04 });
    a && a.play('roll', p.pos);
  } else {
    F.hurt(28, null, { shake: 1, heavy: true });
    a && a.play('boneCrack', p.pos, { k: 1.2 });
    F.pClip('fallBack', { blend: 0.04 });
  }
  p.yaw = ok ? Math.atan2(to.x - from.x, to.z - from.z) : -Math.PI / 2;
  // (el brazo sigue arrastrando hasta la brecha)
  const t0 = t;
  let tr = 0;
  while (t < T || tr < 0.6) {
    const dt = yield;
    t += dt;
    tr += dt;
    const k = sm(clamp(t / T, 0, 1));
    arm.world.lerpVectors(A, B, k);
    smash(arm.world.x);
    const kp = 1 - Math.pow(1 - Math.min(1, tr / 0.6), 2);
    F.setP(lerp(from.x, to.x, kp), YN, lerp(from.z, to.z, kp));
  }
  void t0;
  // alza el brazo, ruge y sigue hacia el cráter
  arm.to(ARM5.high, 0.7);
  G.stopAction(0.5);
  G.play('roar', { blend: 0.4 });
  bell.at = [-3.5, 0.8, -9];
  bellG.k = 12;
  F.pClip('getup', { blend: 0.08 });
  // (detrás del jugador, a ras del adarve: el gigante, en la brecha)
  F.shot([to.x - 4.0, YN + 1.7, -123.6], G.head(new V3()).lerp(p.pos, 0.3), { fov: 54 });
  F.hand = 0.03;
  while (G.actT < 1.0) yield;
  a && a.play('beastRoarBig', G.face(_v), { k: 2.4 });
  g.camRig.shake(0.6);
  while (!G.actDone && G.actT < 2.0) yield;
  G.stopAction(0.6);
  G.base('march', { blend: 0.6 });
  G.rootMotion = true;
  G.speedK = 0.75;
  run.want = 0.75;
  // (el brazo del virote, colgando)
  arm.to({ w: [3.4, 8.6, 1.6], pole: [10, 8, -2] }, 1.4);
  // (se aleja, cojeando, por la brecha hacia el cráter; el jugador, de pie
  // junto al parapeto, le mira irse)
  const ec = new V3(to.x - 6.0, YN + 3.2, -123.4);
  F.follow(() => ({ pos: ec, look: G.chest(new V3()).lerp(p.pos, 0.35), fov: 56 }));
  yield* F.wait(3.2);
  run.done = true;
  G.rootMotion = false;
  G.base('idle', { blend: 0.6 });
}

// una almena del lienzo del oeste revienta (el brazo que la arrastra)
function smashMerlon(D, i, x0, x1, k = 1) {
  const g = D.g,
    a = g.audio;
  g.setGroupVisible('almenaN:' + i, false);
  g.setGroupVisible('almenaNRuin:' + i, true);
  const { z, y, h } = MERLONS_N;
  const c = new V3((x0 + x1) / 2, y + h / 2, z);
  for (let j = 0; j < 5; j++)
    D.chunks.add({ mat: 'wallstone', size: [rnd(0.3, 0.55), rnd(0.25, 0.45), rnd(0.3, 0.5)], pos: new V3(rnd(x0, x1), y + rnd(0.3, h), z + rnd(-0.2, 0.2)), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(rnd(-2, 3) * k, rnd(1, 4), rnd(-5, -1.5) * k), spin: [rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)], shatter: 9, life: 6, floor: 0 });
  D.debris.burst(c, 10, { speed: 5 * k, up: 3, size: 0.6, spread: 0.6 });
  D.puff(c, 2, { size: 1.6, speed: 2.5 * k, up: 1, life: 3, grow: 1.2, alpha: 0.45, dir: new V3(0, 0, -2 * k) });
  a && a.play('wallBreak', c, { k: 1.2 * k });
  g.camRig.shake(0.35 * k);
}
