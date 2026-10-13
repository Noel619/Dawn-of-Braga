// La película, acto 3: la Herrería (la primera huida).
//
// Sales del establo y el gigante, en la nave reventada, ruge, se agacha y
// salta por encima de la ciudad: cien metros de vuelo, por encima de las
// torres de la fachada, y cae sobre las casas del norte del corral, que
// revientan (¡Esquiva!). Se alza entre los escombros y te ruge. Y empieza la
// huida, con control, por un recorrido fijo: el corral, el callejón del
// Muladar y la Calle de la Herrería, hacia el sur. Él viene detrás a cuatro
// patas, sin perderte (si te alejas, se da prisa; si te paras, manotazo), y
// las casas de los lados revientan a su paso. En la boca del callejón te echa
// la mano a través de las casas (¡Esquiva!); a la salida de la calle se alza
// y descarga la campana donde estás (¡Rueda!): se le queda clavada en el
// empedrado. Subes por la escalera de madera de la torre oeste, a la
// espringala (acto 4).
import * as THREE from 'three';
import { sm, lerp, Path, camSafe } from './film.js';
import { FP } from './film_player.js';
import { ESTABLO, hideFolk } from './film_grab.js';
import { NAVE, TOWER_S } from '../../world/level_finale.js';
import { springald1 } from './film_tower.js';
import { clamp, dampAngle } from '../../core/util.js';

const V3 = THREE.Vector3;
const rnd = (a, b) => a + Math.random() * (b - a);
const _v = new V3(),
  _v2 = new V3(),
  _v3 = new V3();
const DUST = [0.26, 0.24, 0.22];

// El recorrido del jugador: de la paja a la puerta del establo, el corral,
// el callejón, la calle abajo, la esquina de la plaza y la escalera arriba
const ST = TOWER_S.stair;
export const RUN3 = new Path([
  [32.2, 0, 24.6],
  [29.4, 0, 25.0],
  [24.0, 0, 26.2],
  [14.5, 0, 27.0],
  [6.0, 0, 26.9],
  [3.0, 0, 27.3],
  [0.6, 0, 29.4],
  [0.2, 0, 40.0],
  [-3.0, 0, 42.6],
  [ST.x, 0, ST.z0 - 0.35],
  [ST.x, ST.n * ST.rise, ST.z0 + ST.n * ST.run + 0.4],
]);
// El del gigante: de donde cae (las casas del norte del corral), por el
// corral (lejos del caballo muerto), el callejón y la calle
export const GPATH3 = new Path([
  [26.6, 0, 14.0],
  [21.0, 0, 19.6],
  [16.4, 0, 25.4],
  [12.5, 0, 27.2],
  [4.5, 0, 27.3],
  [0.4, 0, 31.0],
  [0.2, 0, 36.0],
]);
// donde cae del salto
const LAND = new V3(26.6, 0, 14.0);
// los momentos de la huida (metros del recorrido del jugador)
const AT = { alley: 19.5, street: 32.6, bell: 38.6 };
const RS3 = { s: 0 };

// ======================================================================
// ACTO 3
// ======================================================================
export function* actHerreria(D, o = {}) {
  const g = D.g,
    F = D.film,
    p = g.player;
  const G = yield* D.waitGiant();
  if (o.fromCP) setupEstablo(D, G);
  // (la gente del corral, de la calle y de la plaza: fuera)
  hideFolk(g, 14, 34, 36);
  g.chaseRun = false;
  // ------------------------------------------------- 0. fuera del establo
  F.cinema(false);
  F.puppet(false);
  p.anim.stop(0.2);
  F.release(-Math.PI / 2, 0.14);
  g.atmo.override = cityAtmo();
  D.windK = 0.15;
  G.stopAction(0.5);
  G.base('idle', { blend: 0.5 });
  G.rootMotion = false;
  G.onEventHook = null;
  G.lookAt = null;
  G.lookW = 0.6;
  let t = 0;
  // (hasta que sale por la puerta, o al rato)
  while (p.pos.x > 30.1 && t < 6.5) {
    const dt = yield;
    t += dt;
    runStep3(D, dt, { cam: t > 1.0 });
    if (p.dead) return;
  }
  // ------------------------------------------------- 1. el salto
  yield* beatLeap(D, G);
  if (p.dead) return;
  // ------------------------------------------------- 2. la huida
  yield* chase(D, G);
  if (p.dead) return;
  // ------------------------------------------------- 3. la campana
  yield* beatBell(D, G);
  if (p.dead) return;
  // ------------------------------------------------- 4. la escalera
  yield* climb(D, G);
}

function cityAtmo() {
  return { density: 0.011, vol: 0.05, far: 280, bloom: 1.25, hemi: 3.2, moon: 3.2, moonPos: [-10, 24, -40], fog: 0x34302e, exposure: 1.2, ash: 0.25 };
}

// Desde el punto de control: el jugador levantándose de la paja; el
// gigante de pie en la nave reventada, mirando hacia el corral
function setupEstablo(D, G) {
  const g = D.g,
    F = D.film;
  const [x, y, z, yaw] = ESTABLO.stand;
  F.cinema(false, { instant: true });
  F.puppet(true);
  F.setP(x, y, z, yaw);
  F.pClip('getup', { blend: 0.05, t0: 0.6 });
  G.place(0, -80, Math.atan2(LAND.x, LAND.z + 80), { base: 'idle' });
  G.groundFn = (gx, gz) => (gz > -104 && gz < -58 && Math.abs(gx) < 14 ? NAVE.FY : 0);
  G.setBell(true);
  g.atmo.override = { ...cityAtmo(), snap: true };
  g.fadeTarget = 1;
  g.audio && g.audio.music('bossFinal');
}

// ======================================================================
// 1. Salta desde la catedral y cae sobre las casas del norte del corral
// ======================================================================
function* beatLeap(D, G) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  F.cinema(true);
  F.puppet(true);
  p.autoDir = null;
  p.anim.stop(0.15);
  const P = p.pos.clone();
  const from = G.pos.clone();
  const yawFly = Math.atan2(LAND.x - from.x, LAND.z - from.z);
  G.lookW = 0.5;
  G.lookAt = LAND.clone().setY(4);
  G.play('leap', { blend: 0.45 });
  a && a.play('beastRoarBig', G.head(_v), { k: 2.6 });
  g.camRig.shake(0.2);
  // (la niebla se abre: se ve la ciudad entera)
  g.atmo.override = { ...cityAtmo(), density: 0.0045, far: 380 };
  // (a) desde el claustro: la cabeza y los hombros por encima del muro de
  // la nave; se agacha, salta, y la cámara se abre y le sigue hacia arriba
  const c0 = new V3(23, 23, from.z + 6),
    c1 = new V3(30, 27, from.z + 14);
  F.follow((dt, tt) => {
    const u = sm(clamp((tt - 0.6) / 1.8, 0, 1));
    const c = G.chest(new V3());
    return { pos: c0.clone().lerp(c1, u), look: c.add(_v.set(0, lerp(-2, 3, u), 0)), fov: lerp(50, 62, u) };
  });
  F.hand = 0.03;
  let launched = false;
  G.onEventHook = (e) => {
    if (e === 'launch') launched = true;
  };
  while (!launched) {
    const dt = yield;
    G.yaw = dampAngle(G.yaw, yawFly, 2.5, dt);
  }
  // el despegue: el suelo de la nave salta en pedazos
  G.onEventHook = null;
  const f0 = new V3(from.x, from.y + 0.2, from.z);
  a && a.play('leapWind', G.chest(_v), { k: 2 });
  a && a.play('explosion', f0, { k: 1.2 });
  a && a.play('crack', f0, { k: 1.6 });
  g.camRig.shake(0.6);
  g.input.rumble(0.8, 1, 500);
  D.debris.burst(f0, 34, { speed: 9, up: 10, size: 1.0, spread: 3.5 });
  g.fx.blood.emit(f0.x, f0.y + 0.5, f0.z, 70, { color: DUST, speed: 9, life: 2.2, up: 2.5, gravity: 0.3 });
  for (let i = 0; i < 10; i++) D.chunks.add({ mat: 'flag', size: [rnd(0.7, 1.3), rnd(0.2, 0.35), rnd(0.6, 1.1)], pos: new V3(f0.x + rnd(-3, 3), f0.y + 0.3, f0.z + rnd(-3, 3)), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(rnd(-5, 5), rnd(8, 16), rnd(-5, 5)), spin: [rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)], shatter: 12, life: 8, tint: 0x9c948c });
  // el vuelo: la raíz por una parábola alta (pasa por encima de las torres
  // de la fachada); el clip, despacio en el aire (de 'launch' a 'land')
  const air = 5.0,
    H = 44;
  G.R.action.speed = 1.85 / air;
  G.lookAt = null;
  G.lookW = 0.4;
  D.windK = 0.6;
  // (la campana, detrás de él en el aire; al caer, a su derecha, en el suelo)
  const bellG = (G.bell.guide = { target: new V3(), k: 5, d: 3, antiGrav: true });
  // (b) de lejos, desde el este y en alto: cruza el cielo sobre la ciudad
  // (la cámara le sigue como un operador en un tejado)
  const cB = new V3(50, 30, -36);
  const vel = new V3();
  F.follow(() => {
    const c = G.chest(new V3());
    return { pos: cB, look: c.addScaledVector(vel, 0.18), fov: 48 };
  });
  F.hand = 0.015;
  let t = 0,
    u = 0,
    near = false;
  const prev = G.pos.clone();
  while (u < 1) {
    const dt = yield;
    t += dt;
    u = Math.min(1, t / air);
    prev.copy(G.pos);
    G.pos.x = lerp(from.x, LAND.x, u);
    G.pos.z = lerp(from.z, LAND.z, u);
    G.fixY = lerp(from.y, 0, u) + 4 * H * u * (1 - u);
    if (dt > 0) vel.set((G.pos.x - prev.x) / dt, (G.fixY - prev.y) / dt, (G.pos.z - prev.z) / dt);
    G.wp(-2, 3, -8, bellG.target);
    // (c) desde el corral, junto al jugador: se le viene encima
    if (!near && u > 0.46) {
      near = true;
      a && a.play('leapWind', P, { k: 1.4 });
      p.yaw = Math.atan2(LAND.x - P.x, LAND.z - P.z);
      F.pClip(FP.windStand, { blend: 0.4 });
      F.follow((dt2, tt) => {
        const k = sm(clamp(tt / (air * 0.54), 0, 1));
        const c = G.chest(new V3());
        return { pos: new V3(P.x - 1.7, P.y + lerp(1.6, 1.2, k), P.z + lerp(2.0, 2.6, k)), look: c.lerp(_v.set(LAND.x, 2, LAND.z), k * 0.45), fov: lerp(60, 74, k) };
      });
      F.hand = 0.03;
    }
  }
  // ---- cae: las casas del norte del corral revientan
  G.fixY = null;
  G.groundFn = null;
  G.R.action.speed = 1;
  D.windK = 0.2;
  Object.assign(bellG, { k: 10, d: 4, antiGrav: false });
  G.wp(-3, 0.5, -8, bellG.target);
  const hit = LAND.clone();
  smashBlock(D, 'corralN', hit, 7.5);
  a && a.play('explosion', hit, { k: 1.8 });
  a && a.play('beastStep', hit, { k: 2.6 });
  g.camRig.shake(1.5);
  g.input.rumble(1, 1, 900);
  g.flash = Math.max(g.flash || 0, 0.22);
  D.debris.burst(hit.clone().setY(0.3), 40, { speed: 12, up: 9, size: 1.1, spread: 4 });
  for (let k = 0; k < 3; k++) g.fx.blood.emit(hit.x + rnd(-5, 5), 1, hit.z + rnd(-3, 4), 40, { color: DUST, speed: 10, life: 2.2, up: 2, gravity: 0.35 });
  // tejas y vigas, hacia el jugador (las que quedan por el suelo se
  // deshacen pronto: no estorban luego a la cámara)
  for (let i = 0; i < 9; i++) {
    const s = new V3(rnd(21, 32), rnd(3, 7), rnd(15, 18));
    const d = _v.set(P.x + rnd(-3, 3) - s.x, 0, P.z + rnd(-2, 2) - s.z).normalize();
    D.chunks.add({ mat: i % 3 ? 'roof' : 'timber', size: i % 3 ? [rnd(0.6, 1.0), 0.12, rnd(0.5, 0.8)] : [0.24, 0.24, rnd(1.6, 2.6)], pos: s, rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(d.x * rnd(7, 12), rnd(4, 8), d.z * rnd(7, 12)), spin: [rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)], shatter: 8, life: 3.2 });
  }
  // ¡Esquiva!: de frente al jugador, bajo; los cascotes le vienen encima
  F.shot([P.x - 3.1, 0.95, P.z + 1.3], [P.x + 0.4, 3.4, P.z - 7], { fov: 72 });
  F.hand = 0.05;
  const ok = yield* F.prompt({ action: 'dodge', label: '¡Esquiva!', window: 0.9, slow: 0.22 });
  if (ok) yield* rollOn3(D, 3.8);
  else {
    yield* F.wait(0.2);
    F.hurt(18, hit, { shake: 0.7, heavy: true });
    yield* knock3(D, 1.6);
  }
  // ---- se alza entre los escombros y te ruge
  G.play('roar', { blend: 0.6 });
  G.lookW = 1;
  G.lookAt = null;
  F.pClip(FP.windStand, { blend: 0.3 });
  const yawP = Math.atan2(G.pos.x - p.pos.x, G.pos.z - p.pos.z);
  // (por encima del hombro del jugador, bajo: él en primer término, de pie
  // contra el viento; el gigante encima, rugiendo entre las ruinas)
  F.follow((dt, tt) => {
    const Q = p.pos;
    const away = _v.set(Q.x - G.pos.x, 0, Q.z - G.pos.z).normalize();
    const k = sm(clamp(tt / 2.4, 0, 1));
    const back = lerp(1.9, 2.3, k);
    const pos = camSafe(D.g, new V3(Q.x, Q.y + 1.4, Q.z), new V3(Q.x + away.x * back + away.z * 0.9, Q.y + 1.05, Q.z + away.z * back - away.x * 0.9));
    // (encuadra de los hombros del jugador a la cabeza del gigante)
    return frameUp(pos, new V3(Q.x, Q.y + 1.45, Q.z), G.head(_v2).setY(G.head(_v2).y + 1.5), 12);
  });
  F.hand = 0.03;
  let roared = false;
  while (G.actT < 2.15) {
    const dt = yield;
    p.yaw = dampAngle(p.yaw, yawP, 6, dt);
    G.wp(-3, 0.5, -8, bellG.target);
    if (!roared && G.actT > 1.2) {
      roared = true;
      a && a.play('beastRoarBig', G.face(_v), { k: 2.2 });
      g.camRig.shake(0.9);
      g.input.rumble(1, 1, 1100);
      D.windK = 0.7;
    }
    // (el aliento: polvo y ascuas que le vienen a la cara)
    if (roared && G.actT < 2.0) {
      const f = G.face(_v2);
      const d = _v3.subVectors(p.pos, f).normalize();
      g.fx.blood.emit(f.x, f.y - 0.6, f.z, 3, { color: [1, 0.5, 0.14], speed: 9, life: 0.9, up: 0.3, gravity: -0.4, dir: d });
    }
  }
  D.windK = 0.2;
}

// ======================================================================
// 2. La huida: el corral, el callejón, la calle; él detrás, a cuatro patas
// ======================================================================
function* chase(D, G) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  yield* resume3(D);
  g.chaseRun = true;
  g.ui.toast('¡Corre!', 2);
  G.stopAction(0.45);
  G.base('gallop', { blend: 0.45 });
  G.rootMotion = true;
  G.lookW = 0.6;
  G.lookAt = null;
  G.speedK = 0.8;
  // (la campana, a rastras detrás de él: que no se le cruce al jugador)
  const bellG = (G.bell.guide = { target: new V3(), k: 8, d: 4, antiGrav: false });
  const st = { alley: false, cool: 1.5, roar: 1.2 };
  while (true) {
    const dt = yield;
    runStep3(D, dt);
    if (p.dead) return;
    chaseGiant(D, G, dt);
    breakWave(D, G);
    G.wp(-3, 0.6, -10, bellG.target);
    // (ruge detrás: se le oye venir)
    st.roar -= dt;
    if (st.roar <= 0) {
      st.roar = rnd(2.2, 3.2);
      a && a.play('beastRoar', G.head(_v), { k: 1.5 });
    }
    // en la boca del callejón: la mano, a través de las casas
    if (!st.alley && RS3.s > AT.alley) {
      st.alley = true;
      yield* beatAlley(D, G);
      if (p.dead) return;
      st.cool = 2.5;
    }
    // si se le deja acercarse, manotazo (se esquiva rodando)
    st.cool -= dt;
    const d = Math.hypot(p.pos.x - G.pos.x, p.pos.z - G.pos.z);
    if (st.cool <= 0 && d < 7.6 && !p.puppet) {
      st.cool = 3.4;
      const tgt = new V3(p.pos.x, 0.5, p.pos.z);
      F.also(handStrike(D, G, tgt, { reach: 0.5, free: true }));
    }
    // a la salida de la calle: la campana
    if (RS3.s > AT.bell) break;
  }
}

// cada fotograma: cuánto se ha avanzado, la cámara hacia delante (el mando
// sigue mandando) y, en el modo de pruebas, el jugador corre solo
function runStep3(D, dt, o = {}) {
  const g = D.g,
    p = g.player;
  RS3.s = RUN3.project(p.pos.x, p.pos.z);
  if (o.cam !== false) {
    const ahead = RUN3.at(RS3.s + 4, {});
    const cr = g.camRig;
    cr.yaw = dampAngle(cr.yaw, Math.atan2(ahead.tx, ahead.tz), 1.6, dt);
    cr.pitch = cr.pitch + (0.14 - cr.pitch) * Math.min(1, dt * 2);
  }
  if (g.dev && (g.dev.autoRun || g.dev.autoQTE) && !p.puppet) {
    const q = RUN3.at(RS3.s + 2.2, {});
    const dx = q.x - p.pos.x,
      dz = q.z - p.pos.z;
    const l = Math.hypot(dx, dz) || 1;
    p.autoDir = { x: dx / l, z: dz / l, m: 1 };
  } else p.autoDir = null;
}
// vuelve el control tras un momento (la cámara detrás, hacia donde se corre)
function* resume3(D) {
  const g = D.g,
    F = D.film,
    p = g.player;
  F.slow(1, 6);
  F.cinema(false);
  F.puppet(false);
  p.anim.stop(0.15);
  F.cam = null;
  F.camFn = null;
  g.camRig.override = null;
  const q = RUN3.at(RUN3.project(p.pos.x, p.pos.z) + 4, {});
  F.release(Math.atan2(q.tx, q.tz), 0.14);
  yield;
}

// El gigante en la huida: por su camino, girando hacia un punto por delante
// y sin salirse de lado; a la distancia justa del jugador (si se aleja, se
// da prisa; si se para, se le echa encima)
function steerG(G, dt) {
  const s = GPATH3.project(G.pos.x, G.pos.z);
  const c = GPATH3.at(s, {});
  const q = GPATH3.at(s + 7, {});
  G.yaw = dampAngle(G.yaw, Math.atan2(q.x - G.pos.x, q.z - G.pos.z), 2.2, dt);
  const ox = G.pos.x - c.x,
    oz = G.pos.z - c.z;
  const along = ox * c.tx + oz * c.tz;
  const k = Math.min(1, dt * 1.2);
  G.pos.x -= (ox - along * c.tx) * k;
  G.pos.z -= (oz - along * c.tz) * k;
  return s;
}
function chaseGiant(D, G, dt) {
  const p = D.g.player;
  const sg = steerG(G, dt);
  const gap = GPATH3.project(p.pos.x, p.pos.z) - sg;
  const gapWant = RS3.s < AT.alley ? 10.5 : RS3.s < AT.street ? 12 : 9;
  // (si se le echa encima, o llega al final de su camino, se para y se
  // alza; vuelve a galopar cuando el jugador le saca ventaja)
  if (G.baseName === 'gallop') {
    if (gap < 3.5 || sg > GPATH3.len - 0.6) {
      G.base('idle', { blend: 0.6 });
      G.rootMotion = false;
      G.speedK = 1;
      return;
    }
    const want = clamp(0.9 + (gap - gapWant) * 0.12, 0.3, 1.6);
    G.speedK += (want - G.speedK) * Math.min(1, dt * 2.5);
  } else if (gap > 8 && sg < GPATH3.len - 1.5) {
    G.base('gallop', { blend: 0.5 });
    G.rootMotion = true;
    G.speedK = 0.7;
  }
}

// ---------------------------------------------------------------------
// En la boca del callejón: se tira a por él con la izquierda; las casas de
// la esquina revientan con el brazo y la mano cae justo detrás (¡Esquiva!)
function* beatAlley(D, G) {
  const g = D.g,
    F = D.film,
    p = g.player;
  F.puppet(true);
  F.cinema(true, { skip: false });
  p.autoDir = null;
  F.pClip('run', { blend: 0.1 });
  const P = p.pos.clone();
  const b = RUN3.at(RUN3.project(P.x, P.z) - 0.9, {});
  const target = new V3(b.x, 0.5, b.z);
  // (a su alcance: si se ha quedado atrás, da un salto)
  const dg = Math.hypot(target.x - G.pos.x, target.z - G.pos.z);
  if (dg > 13) approachXZ(D, G, (target.x - G.pos.x) * (1 - 13 / dg), (target.z - G.pos.z) * (1 - 13 / dg), 0.45);
  let hit = false;
  F.also(handStrike(D, G, target, { reach: 0.55, onImpact: () => (hit = true) }));
  F.also(
    (function* () {
      let t = 0;
      while (t < 1.6) {
        const dt = yield;
        t += dt;
        chaseGiant(D, G, dt);
        breakWave(D, G);
        if (G.bell.guide) G.wp(-3, 0.6, -10, G.bell.guide.target);
      }
    })()
  );
  // por delante del jugador, en el callejón: mira atrás, a la boca
  F.shot([P.x - 5.2, 1.2, 27.7], [P.x + 3.6, 3.6, 26.4], { fov: 72 });
  F.hand = 0.04;
  // (sigue corriendo un instante)
  let t = 0;
  while (t < 0.12) {
    const dt = yield;
    t += dt;
    const q = RUN3.at(RUN3.project(p.pos.x, p.pos.z) + 5.5 * dt, {});
    F.setP(q.x, 0, q.z, Math.atan2(q.tx, q.tz));
  }
  const ok = yield* F.prompt({ action: 'dodge', label: '¡Esquiva!', window: 0.85, slow: 0.22 });
  if (ok) yield* rollOn3(D, 4.4);
  else {
    while (!hit) yield;
    F.hurt(26, target, { shake: 1, heavy: true });
    yield* knock3(D, 2.4);
  }
  yield* resume3(D);
}

// Un manotazo con la izquierda (IK) a un punto sin dejar de galopar: la mano
// se tiende, cae y se retira. Lo que toca el brazo, revienta. (free: en
// pleno control, alcanza al jugador si está debajo y no rueda)
function* handStrike(D, G, target, o = {}) {
  const g = D.g,
    a = g.audio,
    p = g.player;
  const pole = new V3();
  const T = o.reach ?? 0.5;
  let t = 0,
    hit = false;
  a && a.play('beastRoar', G.head(_v), { k: 1.2 });
  while (t < T + 0.75) {
    const dt = yield;
    t += dt;
    G.wp(10, 7, -2, pole);
    const w = sm(clamp(t / (T * 0.85), 0, 1)) * (1 - sm(clamp((t - T - 0.3) / 0.45, 0, 1)));
    G.reachHand('L', target, pole, w, { stretch: 1.15 });
    if (t < T + 0.1) breakArm(D, G);
    if (!hit && t >= T) {
      hit = true;
      const h = G.palmL(new V3());
      h.y = Math.max(0.3, h.y);
      a && a.play('slam', h, { k: 2 });
      a && a.play('crack', h, { k: 1.2 });
      const dp = Math.hypot(p.pos.x - h.x, p.pos.z - h.z);
      g.camRig.shake(clamp(1.2 - dp * 0.05, 0.3, 1.2));
      g.input.rumble(1, 1, 400);
      g.fx.blood.emit(h.x, 0.4, h.z, 50, { color: DUST, speed: 7, life: 1.8, up: 2.5, gravity: 0.3 });
      D.debris.burst(new V3(h.x, 0.3, h.z), 22, { speed: 7, up: 6, size: 0.8, spread: 1.8 });
      for (let i = 0; i < 5; i++) D.chunks.add({ mat: 'cobble', size: [rnd(0.4, 0.8), 0.2, rnd(0.4, 0.8)], pos: new V3(h.x + rnd(-1.5, 1.5), 0.3, h.z + rnd(-1.5, 1.5)), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(rnd(-4, 4), rnd(4, 8), rnd(-4, 4)), spin: [rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)], shatter: 99, life: 7 });
      if (o.onImpact) o.onImpact(h);
      if (o.free && dp < 2.4 && p.state !== 'roll' && !p.puppet && !p.dead) {
        D.film.hurt(26, h, { shake: 1, heavy: true });
        if (!p.dead) D.film.also(knock3(D, 2.2, true));
      }
    }
  }
  G.freeHand('L');
}

// ---------------------------------------------------------------------
// las casas que revientan a su paso (y lo que cuelga de ellas, y lo que hay
// por el suelo del corral)
function waveHouses(g) {
  const L = g.level.ctx;
  return L._chaseHouses || (L._chaseHouses = (L.houseRects || []).filter((r) => r.sub && (r.sub.startsWith('herreria:') || r.sub.startsWith('corralN:'))));
}
function waveProps(g) {
  const L = g.level.ctx;
  return L._chaseProps || (L._chaseProps = (L.waveProps || []).filter((q) => q.wg === 'herreria' || q.wg === 'corralN'));
}
const rectDist = (r, x, z) => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1));
// (lo que toca: las manos, los hombros, los pies, las caderas y la cola;
// cada hueso con lo que abulta)
const BODY = [
  ['handL', 1.0],
  ['handR', 1.0],
  ['armL', 1.2],
  ['armR', 1.2],
  ['footL', 0.9],
  ['footR', 0.9],
  ['pelvis', 2.4],
  ['chest', 2.2],
  ['tail2', 1.2],
  ['tail4', 0.9],
];
const _pts = BODY.map(() => new V3());
function breakWave(D, G) {
  const g = D.g;
  const B = G.M.byName;
  BODY.forEach(([n], i) => B[n].getWorldPosition(_pts[i]));
  for (const r of waveHouses(g)) {
    if (!g.groups[r.sub] || !g.groups[r.sub].on) continue;
    const h = (r.h || 7) + 1.5;
    if (BODY.some(([, R], i) => _pts[i].y < h && rectDist(r, _pts[i].x, _pts[i].z) < R)) smashHouse(D, r, G.pos);
  }
  for (const q of waveProps(g)) {
    if (!g.groups[q.name] || !g.groups[q.name].on) continue;
    if (BODY.some(([, R], i) => _pts[i].y < 5 && Math.hypot(q.x - _pts[i].x, q.z - _pts[i].z) < R + 1.2)) kickProp(D, q, G.pos);
  }
}
// lo que toca el brazo izquierdo tendido (del hombro a la mano)
function breakArm(D, G) {
  const g = D.g;
  const B = G.M.byName;
  const a = B.armL.getWorldPosition(new V3()),
    b = B.foreL.getWorldPosition(new V3()),
    c = B.handL.getWorldPosition(new V3());
  const pts = [a.clone().lerp(b, 0.5), b, b.clone().lerp(c, 0.5), c];
  for (const r of waveHouses(g)) {
    if (!g.groups[r.sub] || !g.groups[r.sub].on) continue;
    if (pts.some((q) => q.y < (r.h || 7) + 1.2 && rectDist(r, q.x, q.z) < 1.2)) smashHouse(D, r, G.pos);
  }
}
// todo un bloque, de golpe (donde cae del salto)
function smashBlock(D, wg, at, r) {
  const g = D.g;
  for (const h of waveHouses(g)) if (h.sub.startsWith(wg + ':') && rectDist(h, at.x, at.z) < r) smashHouse(D, h, at);
  for (const q of waveProps(g)) if (q.wg === wg && Math.hypot(q.x - at.x, q.z - at.z) < r + 2) kickProp(D, q, at);
}
// Una casa revienta: sus muros y su tejado, en trozos que salen despedidos
// lejos del gigante; polvo, tejas, vigas y lo que colgaba de ella
function smashHouse(D, r, from) {
  const g = D.g,
    a = g.audio;
  if (!D.breakHouse(r.sub)) return;
  const wg = r.sub.split(':')[0];
  for (const q of waveProps(g)) if (q.wg === wg && g.groups[q.name] && g.groups[q.name].on && rectDist(r, q.x, q.z) < 1.5) kickProp(D, q, from);
  const cx = (r.x0 + r.x1) / 2,
    cz = (r.z0 + r.z1) / 2;
  const away = _v3.set(cx - from.x, 0, cz - from.z);
  if (away.lengthSq() < 0.01) away.set(0, 0, 1);
  away.normalize();
  const h = r.h || 7;
  const n = Math.min(16, Math.round(8 + (r.x1 - r.x0) * (r.z1 - r.z0) * 0.08));
  const wall = r.style === 'plaster' ? 'plaster' : 'wallstone';
  for (let i = 0; i < n; i++) {
    const roof = i % 3 === 0;
    D.chunks.add({ mat: roof ? 'roof' : i % 4 === 1 ? 'timber' : wall, size: roof ? [rnd(0.8, 1.4), 0.14, rnd(0.6, 1.0)] : [rnd(0.6, 1.3), rnd(0.4, 0.9), rnd(0.5, 1.0)], pos: new V3(rnd(r.x0 + 0.4, r.x1 - 0.4), rnd(1.5, h + 0.8), rnd(r.z0 + 0.4, r.z1 - 0.4)), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(away.x * rnd(3, 10) + rnd(-2, 2), rnd(2, 8), away.z * rnd(3, 10) + rnd(-2, 2)), spin: [rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)], shatter: 11, life: 8 });
  }
  D.debris.burst(new V3(cx, h * 0.45, cz), 24, { speed: 8, up: 5, size: 1.0, spread: 3, dir: away.clone().multiplyScalar(0.6) });
  for (let k = 0; k < 3; k++) g.fx.blood.emit(rnd(r.x0, r.x1), rnd(1, h), rnd(r.z0, r.z1), 40, { color: DUST, speed: 5, life: 2.6, up: 1.2, gravity: 0.3 });
  const at = { x: cx, y: 3, z: cz };
  a && a.play('wallBreak', at, { k: 1.8 });
  a && a.play(Math.random() < 0.5 ? 'woodBreak' : 'pillarBreak', at, { k: 1.4 });
  const dp = Math.hypot(g.player.pos.x - cx, g.player.pos.z - cz);
  g.camRig.shake(clamp(0.9 - dp * 0.03, 0.15, 0.9));
  g.input.rumble(0.6, 0.8, 250);
}
// lo que había por medio (vallas, paja, leña, ropa tendida, rótulos): fuera,
// en astillas
function kickProp(D, q, from) {
  const g = D.g;
  if (!g.groups[q.name] || !g.groups[q.name].on) return;
  g.setGroupVisible(q.name, false);
  const away = _v2.set(q.x - from.x, 0, q.z - from.z);
  if (away.lengthSq() < 0.01) away.set(0, 0, 1);
  away.normalize();
  for (let i = 0; i < 4; i++) D.chunks.add({ mat: i % 2 ? 'planks' : 'timber', size: [rnd(0.1, 0.2), rnd(0.08, 0.14), rnd(0.8, 1.6)], pos: new V3(q.x + rnd(-0.8, 0.8), rnd(0.4, 2.5), q.z + rnd(-0.8, 0.8)), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(away.x * rnd(3, 8), rnd(2, 6), away.z * rnd(3, 8)), spin: [rnd(-9, 9), rnd(-9, 9), rnd(-9, 9)], shatter: 99, life: 6 });
  g.fx.blood.emit(q.x, 0.8, q.z, 16, { color: DUST, speed: 3, life: 1.2, up: 1 });
  g.audio && g.audio.play('woodBreak', { x: q.x, y: 1, z: q.z }, { k: 0.9 });
}

// ======================================================================
// 3. A la salida de la calle: se alza y descarga la campana donde estás
// ======================================================================
function* beatBell(D, G) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  F.puppet(true);
  F.cinema(true, { skip: false });
  p.autoDir = null;
  g.chaseRun = false;
  F.pClip('run', { blend: 0.1 });
  const B = G.bell;
  // (el jugador sigue corriendo; donde estará cuando la campana empiece a
  // bajar, y un poco antes: ahí caerá)
  const v = 5.0;
  let sP = RUN3.project(p.pos.x, p.pos.z);
  const sQ = sP + v * 0.95;
  const q0 = RUN3.at(sQ - 1.3, {});
  const at = new V3(q0.x, 0, q0.z);
  // el gigante deja de galopar: se alza sobre las patas con la campana
  G.rootMotion = false;
  G.speedK = 1;
  G.base('idle', { blend: 0.6 });
  G.play('slam', { blend: 0.4, t0: 0.6 });
  G.lookW = 1;
  G.lookAt = null;
  // (a su alcance: si le falta, se lanza ese trecho)
  const dg = Math.hypot(at.x - G.pos.x, at.z - G.pos.z);
  const reach = 10.5;
  if (dg > reach) approachXZ(D, G, (at.x - G.pos.x) * (1 - reach / dg), (at.z - G.pos.z) * (1 - reach / dg), 0.8);
  B.guide = { target: new V3(), k: 16, d: 7, antiGrav: true };
  // desde la plaza, bajo, mirando calle arriba: el jugador corre hacia aquí
  // y, detrás, el gigante se alza con la campana por encima de los tejados
  F.shot([2.6, 1.3, 47.4], [0.2, 6.2, 33.0], { fov: 68 });
  F.hand = 0.04;
  F.slow(0.6, 5);
  a && a.play('beastRoar', G.head(_v), { k: 1.8 });
  a && a.play('chainRun', B.center(_v2), { k: 1.6 });
  let asked = null,
    rolled = false;
  while (G.actT < 2.05) {
    const dt = yield;
    const ta = G.actT;
    G.yaw = dampAngle(G.yaw, Math.atan2(at.x - G.pos.x, at.z - G.pos.z), 3, dt);
    // el jugador, corriendo (hasta que rueda o se queda clavado)
    if (!asked) {
      sP += v * dt;
      const q = RUN3.at(sP, {});
      F.setP(q.x, 0, q.z, Math.atan2(q.tx, q.tz));
    }
    // la campana: arriba (sin peso) y luego, a plomo, donde está él
    if (ta < 1.55) {
      G.wp(-1.5, 23, -3.5, B.guide.target);
      B.guide.k = 16;
      B.guide.d = 7;
      B.guide.antiGrav = true;
    } else {
      B.guide.target.copy(at).y += 4.2;
      B.guide.k = 70;
      B.guide.d = 3;
      B.guide.antiGrav = false;
      if (ta > 1.9) B.top.lerp(B.guide.target, 0.3);
    }
    // ¡Rueda!: cuando empieza a bajar
    if (!asked && ta > 1.56) {
      F.slow(1, 8);
      asked = F.promptAsync({ action: 'dodge', label: '¡Rueda!', window: 0.9, slow: 0.12 });
    }
    if (asked && asked.ok !== null && !asked.done) {
      asked.done = true;
      if (asked.ok) {
        rolled = true;
        // (hacia la esquina de la plaza, la de la escalera)
        const q = RUN3.at(RUN3.project(p.pos.x, p.pos.z) + 4.0, {});
        F.also(rollTo3(D, new V3(q.x, 0, q.z), 0.62));
      } else F.pClip(FP.brace, { blend: 0.1 });
    }
  }
  while (asked && asked.ok === null) yield;
  // el golpe: la campana se clava en el empedrado
  B.top.copy(at).y += G.E.sizes.bellH * 0.55;
  B.up.set(Math.sin(G.yaw) * 0.45, 0.85, Math.cos(G.yaw) * 0.45).normalize();
  B.stick();
  B.guide = null;
  a && a.play('bellToll', at, { k: 2 });
  a && a.play('explosion', at, { k: 1.2 });
  a && a.play('crack', at, { k: 1.6 });
  g.camRig.shake(1.3);
  g.flash = Math.max(g.flash || 0, 0.3);
  g.input.rumble(1, 1, 500);
  g.fx.blood.emit(at.x, 0.5, at.z, 80, { color: DUST, speed: 10, life: 2.2, up: 3, gravity: 0.25 });
  g.fx.blood.emit(at.x, 1, at.z, 30, { color: [1, 0.5, 0.12], speed: 6, life: 0.7, up: 3 });
  D.debris.burst(at.clone().setY(0.3), 36, { speed: 10, up: 9, size: 0.9, spread: 3 });
  for (let i = 0; i < 9; i++) D.chunks.add({ mat: 'cobble', size: [rnd(0.5, 1.0), 0.22, rnd(0.4, 0.9)], pos: new V3(at.x + rnd(-2.4, 2.4), 0.3, at.z + rnd(-2.4, 2.4)), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(rnd(-7, 7), rnd(5, 11), rnd(-7, 7)), spin: [rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)], shatter: 99, life: 8 });
  // (lo que quede de las casas de al lado, abajo)
  for (const r of waveHouses(g)) if (g.groups[r.sub] && g.groups[r.sub].on && rectDist(r, at.x, at.z) < 4.5) smashHouse(D, r, at);
  if (!rolled) {
    // le pilla el borde: sale despedido hacia la esquina
    F.hurt(32, at, { shake: 1.2, heavy: true });
    const q = RUN3.at(RUN3.project(p.pos.x, p.pos.z) + 3.4, {});
    yield* knockTo3(D, new V3(q.x, 0, q.z));
  } else {
    yield* F.wait(0.55);
    F.pClip(FP.brace, { blend: 0.25 });
  }
  G.play('stuck', { blend: 0.5 });
  // (la campana clavada, el gigante tirando de la cadena; el jugador, en la
  // esquina de la plaza, junto a la escalera)
  F.shot([-9.2, 2.5, 46.4], [0.4, 5.0, 37.0], { fov: 60 });
  F.hand = 0.03;
  p.yaw = Math.atan2(at.x - p.pos.x, at.z - p.pos.z);
  yield* F.wait(1.3);
}

// ======================================================================
// 4. Escalera arriba (con control); él, tirando de la campana clavada
// ======================================================================
function* climb(D, G) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  F.cinema(false);
  F.puppet(false);
  p.anim.stop(0.15);
  const q = RUN3.at(RUN3.project(p.pos.x, p.pos.z) + 2, {});
  F.release(Math.atan2(q.tx, q.tz), 0.24);
  g.ui.toast('¡Sube a la torre!', 2.6);
  // (arriba espera la espringala de la guarnición)
  springald1(D);
  let roar = 2.5;
  while (p.pos.y < TOWER_S.deckY - 0.5) {
    const dt = yield;
    // en la escalera: de lado, desde el oeste; abajo, en la boca de la
    // calle, el gigante tirando de la cadena (el mando sigue igual: arriba
    // es subir)
    const on = p.pos.z > ST.z0 + 0.6 && Math.abs(p.pos.x - ST.x) < 1.4;
    runStep3(D, dt);
    if (on) F.cam = climbShot(D, G);
    else if (F.cam) {
      F.cam = null;
      g.camRig.override = null;
    }
    if (p.dead) return;
    roar -= dt;
    if (roar <= 0) {
      roar = rnd(3.5, 5.5);
      a && a.play(Math.random() < 0.5 ? 'beastRoar' : 'chainRun', G.head(_v), { k: 1.3 });
      G.R.flinch.x.kick(-0.3);
      g.camRig.shake(0.15);
    }
  }
  p.autoDir = null;
  F.cam = null;
  g.camRig.override = null;
}
// subiendo: de lado, un poco por debajo y por delante; la cámara sube con él
function climbShot(D, G) {
  const P = D.g.player.pos;
  const hd = G.head(new V3());
  const look = new V3(P.x + 1.2, P.y + 1.0, P.z - 1.6).lerp(hd, 0.12);
  return { pos: new V3(ST.x - 6.6, P.y + 2.0, P.z + 1.4), look, fov: 62, speed: 7, snap: false };
}

// ---------------------------------------------------------------------
// rodar por el recorrido / a un sitio; derribado; el gigante, a empujones
function* rollOn3(D, ds = 4.2, dur = 0.62) {
  const p = D.g.player;
  const to = RUN3.at(RUN3.project(p.pos.x, p.pos.z) + ds, {});
  yield* rollTo3(D, new V3(to.x, to.y, to.z), dur);
}
function* rollTo3(D, to, dur = 0.62) {
  const g = D.g,
    F = D.film,
    p = g.player;
  const from = p.pos.clone();
  p.yaw = Math.atan2(to.x - from.x, to.z - from.z);
  F.pClip('roll', { blend: 0.04 });
  g.audio && g.audio.play('roll', p.pos);
  let t = 0;
  while (t < dur) {
    t += yield;
    const u = 1 - Math.pow(1 - Math.min(1, t / dur), 2);
    placeP(D, lerp(from.x, to.x, u), lerp(from.z, to.z, u), from.y);
  }
}
// el jugador (marioneta) en (x, z), sobre el suelo y fuera de los muros
function placeP(D, x, z, y0) {
  const g = D.g,
    p = g.player;
  D.film.setP(x, g.world.col.groundHeight(x, z, 0.2, y0 + 1.2), z);
  const B = p.body;
  g.world.col.resolve(B.pos, B.radius, B.pos.y, B.height, B.stepH ?? 0.5);
  p.visY = B.pos.y;
}
// derribado hacia delante, por el recorrido (free: luego, el control)
function* knock3(D, ds = 2, free = false) {
  const p = D.g.player;
  const to = RUN3.at(RUN3.project(p.pos.x, p.pos.z) + ds, {});
  yield* knockTo3(D, new V3(to.x, 0, to.z), free);
}
function* knockTo3(D, to, free = false) {
  const g = D.g,
    F = D.film,
    p = g.player;
  const was = p.puppet;
  if (!was) F.puppet(true);
  const from = p.pos.clone();
  F.pClip('fallBack', { blend: 0.04 });
  let t = 0;
  while (t < 0.4) {
    t += yield;
    const u = sm(t / 0.4);
    placeP(D, lerp(from.x, to.x, u), lerp(from.z, to.z, u), from.y);
  }
  yield* F.wait(0.3);
  F.pClip('getup', { blend: 0.05 });
  yield* F.wait(0.9);
  if (free && !was && !p.dead) {
    F.puppet(false);
    p.anim.stop(0.15);
  }
}
// Un plano desde pos que mira hacia b (de lado) y encuadra en vertical de a
// (abajo) a b (arriba), con un margen (grados); las franjas negras tapan un
// cuarto de la altura
function frameUp(pos, a, b, margin = 10) {
  const ea = Math.atan2(a.y - pos.y, Math.hypot(a.x - pos.x, a.z - pos.z)),
    eb = Math.atan2(b.y - pos.y, Math.hypot(b.x - pos.x, b.z - pos.z));
  const e = (ea + eb) / 2;
  const hx = b.x - pos.x,
    hz = b.z - pos.z;
  const l = Math.hypot(hx, hz) || 1;
  const look = new V3(pos.x + (hx / l) * 10, pos.y + Math.tan(e) * 10, pos.z + (hz / l) * 10);
  return { pos, look, fov: clamp((((eb - ea) * 180) / Math.PI + margin) / 0.77, 40, 88) };
}
// la raíz del gigante, (dx, dz) más allá en dur segundos (se suma a lo que
// avance el clip)
function approachXZ(D, G, dx, dz, dur) {
  D.film.also(
    (function* () {
      let t = 0,
        prev = 0;
      while (t < dur) {
        t += yield;
        const k = sm(Math.min(1, t / dur));
        G.pos.x += dx * (k - prev);
        G.pos.z += dz * (k - prev);
        prev = k;
      }
    })()
  );
}
