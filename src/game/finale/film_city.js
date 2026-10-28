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
// empedrado, y un adoquín que sale despedido revienta la puerta atrancada de
// la torre oeste. Corres hasta ella y subes por su husillo, a la sala de los
// guardas y por la escala a la trampilla del cadalso: la espringala (acto 4).
import * as THREE from 'three';
import { sm, lerp, Path, camSafe } from './film.js';
import { FP } from './film_player.js';
import { ESTABLO, hideFolk } from './film_grab.js';
import { NAVE, TOWER_S, towerSpiral } from '../../world/level_finale.js';
import { springald1 } from './film_tower.js';
import { waveHouses, rectDist, breakWave as breakWaveOf, breakArm as breakArmOf, smashBlock, smashHouse } from './film_wave.js';

// los bloques que revientan en esta huida
const WG3 = ['herreria', 'corralN'];
const breakWave = (D, G) => breakWaveOf(D, G, WG3);
const breakArm = (D, G) => breakArmOf(D, G, WG3);
import { clamp, dampAngle } from '../../core/util.js';

const V3 = THREE.Vector3;
const rnd = (a, b) => a + Math.random() * (b - a);
const _v = new V3(),
  _v2 = new V3(),
  _v3 = new V3();
const DUST = [0.26, 0.24, 0.22];

// El recorrido del jugador: de la paja a la puerta del establo, el corral,
// el callejón, la calle abajo, la esquina de la plaza y la puerta de la torre
const TD = { x: TOWER_S.door.x, z: TOWER_S.z - TOWER_S.w / 2 };
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
  [-4.6, 0, 47.6],
  [TD.x, 0, 53.6],
  [TD.x, 0, TD.z - 0.4],
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
  // ------------------------------------------------- 4. la torre
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
  D.dust.ring(f0, 16, { color: D.dustColor(f0), r0: 3, speed: 10, size: 2.6, life: 4.5, grow: 1.8, alpha: 0.5 });
  D.puff(f0, 6, { size: 3, speed: 3, up: 4, rise: 0.8, life: 4, grow: 1.6, alpha: 0.45 });
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
  // (la onda de polvo del golpe: corre por el corral hasta el jugador)
  D.dust.ring(hit.clone().setY(0.3), 22, { color: D.dustColor(hit), r0: 5, speed: 14, size: 3, life: 6, grow: 2, alpha: 0.55 });
  D.puff(hit.clone().setY(2), 8, { size: 4, spread: 4, speed: 3, up: 3, rise: 0.6, life: 7, grow: 1.4, alpha: 0.4 });
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
      D.dust.ring(new V3(h.x, 0.3, h.z), 14, { color: D.dustColor(h), r0: 1.5, speed: 9, size: 2.2, life: 4, grow: 1.5, alpha: 0.5 });
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
  D.dust.ring(at.clone().setY(0.3), 20, { color: D.dustColor(at), r0: 2.4, speed: 13, size: 2.6, life: 5, grow: 1.8, alpha: 0.55 });
  D.puff(at.clone().setY(1.5), 6, { size: 3, spread: 2, speed: 2, up: 3, rise: 0.6, life: 5, grow: 1.4, alpha: 0.45 });
  g.fx.blood.emit(at.x, 1, at.z, 30, { color: [1, 0.5, 0.12], speed: 6, life: 0.7, up: 3 });
  D.debris.burst(at.clone().setY(0.3), 36, { speed: 10, up: 9, size: 0.9, spread: 3 });
  for (let i = 0; i < 9; i++) D.chunks.add({ mat: 'cobble', size: [rnd(0.5, 1.0), 0.22, rnd(0.4, 0.9)], pos: new V3(at.x + rnd(-2.4, 2.4), 0.3, at.z + rnd(-2.4, 2.4)), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(rnd(-7, 7), rnd(5, 11), rnd(-7, 7)), spin: [rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)], shatter: 99, life: 8 });
  // (lo que quede de las casas de al lado, abajo)
  for (const r of waveHouses(g, WG3)) if (g.groups[r.sub] && g.groups[r.sub].on && rectDist(r, at.x, at.z) < 4.5) smashHouse(D, r, at);
  // (un adoquín sale despedido hacia la torre: revienta su puerta)
  let burst = false;
  F.also(doorBurst(D, at, () => (burst = true)));
  if (!rolled) {
    // le pilla el borde: sale despedido hacia la esquina
    F.hurt(32, at, { shake: 1.2, heavy: true });
    const q = RUN3.at(RUN3.project(p.pos.x, p.pos.z) + 3.4, {});
    F.also(knockTo3(D, new V3(q.x, 0, q.z)));
    yield* F.wait(0.3);
  } else {
    yield* F.wait(0.3);
    F.pClip(FP.brace, { blend: 0.25 });
  }
  // (la puerta de la torre, desde la plaza: el adoquín la revienta)
  F.shot([TD.x - 3.1, 1.45, TD.z - 3.9], [TD.x, 1.25, TD.z + 0.1], { fov: 54 });
  F.hand = 0.02;
  while (!burst) yield;
  yield* F.wait(0.55);
  G.play('stuck', { blend: 0.5 });
  // (la campana clavada, el gigante tirando de la cadena; el jugador, en la
  // esquina de la plaza, camino de la torre)
  F.shot([-9.2, 2.5, 46.4], [0.4, 5.0, 37.0], { fov: 60 });
  F.hand = 0.03;
  p.yaw = Math.atan2(at.x - p.pos.x, at.z - p.pos.z);
  yield* F.wait(1.3);
}
// El adoquín que sale despedido del golpe de la campana y revienta la puerta
// atrancada de la torre: la hoja salta hacia dentro, colgando de un gozne,
// y la tranca se parte (onBurst, cuando revienta)
function* doorBurst(D, from, onBurst) {
  const g = D.g,
    a = g.audio;
  const T = 1.0;
  const to = new V3(TD.x + 0.15, 1.1, TD.z + 0.1);
  const p0 = new V3(from.x - 0.4, 0.7, from.z + 0.9);
  const v = new V3((to.x - p0.x) / T, (to.y - p0.y + 8 * T * T) / T, (to.z - p0.z) / T);
  let hit = false;
  const boom = () => {
    if (hit) return;
    hit = true;
    g.setGroupVisible('torreSurDoor', false);
    g.setGroupVisible('torreSurDoorOpen', true);
    const td = g.interact.list.find((i) => i.id === 'x_torre_sur');
    if (td) td.hidden = true;
    a && a.play('woodBreak', to, { k: 1.8 });
    a && a.play('rackBreak', to, { k: 1.4 });
    a && a.play('crack', to, { k: 1.2 });
    D.splinters.burst(to, 24, { speed: 6, up: 3, size: 0.8, spread: 0.6 });
    g.fx.blood.emit(to.x, to.y, to.z + 0.4, 26, { color: DUST, speed: 3, life: 1.3, up: 1.1, gravity: 0.6 });
    onBurst && onBurst();
  };
  D.chunks.add({
    mat: 'cobble',
    size: [0.52, 0.3, 0.46],
    pos: p0,
    rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)],
    vel: v,
    spin: [rnd(-9, 9), rnd(-9, 9), rnd(-9, 9)],
    shatter: 99,
    life: 6,
    // (al cruzar el umbral, la puerta revienta y él sigue, frenado, hacia dentro)
    onUpdate: (c) => {
      if (!hit && c.p.z > TD.z - 0.15) {
        boom();
        c.v.multiplyScalar(0.12);
      }
    },
  });
  let t = 0;
  while (!hit && t < T + 0.4) t += yield;
  boom();
}

// ======================================================================
// 4. A la torre (con control): la puerta reventada; dentro, el husillo
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
  // (hasta el umbral de la puerta)
  const atDoor = () => Math.abs(p.pos.x - TD.x) < 0.9 && p.pos.z > TD.z - 1.1 && p.pos.z < TD.z + 0.9;
  while (!atDoor()) {
    const dt = yield;
    runStep3(D, dt);
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
  yield* climbTower(D, G);
}

// Dentro de la torre (cinemática): el husillo, de abajo arriba, con la
// cámara detrás y por dentro de la vuelta; fuera, él tira de la cadena y la
// torre tiembla; la sala de los guardas, la escala y la trampilla, que se
// abre de un empujón, y lo alto del cadalso
function* climbTower(D, G) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  const T = TOWER_S,
    Sp = T.spiral;
  F.cinema(true);
  F.puppet(true);
  p.autoDir = null;
  // ---- (a) desde la plaza: se mete por la puerta reventada
  F.pClip('run', { blend: 0.1 });
  F.shot([TD.x - 2.7, 1.55, TD.z - 4.4], [TD.x + 0.2, 1.4, TD.z + 0.6], { fov: 58 });
  F.hand = 0.02;
  const s0 = towerSpiral(0);
  yield* runTo3(D, new V3(TD.x, 0, TD.z + 0.35), 4.6);
  yield* runTo3(D, new V3(s0.x, 0, s0.z), 4.0);
  // ---- (b) el husillo: la cámara, unos peldaños por delante y pegada al
  // machón, mirando abajo al que sube
  const STEP = 0.46; // (lo que se anda por peldaño, por la mitad de la huella)
  let u = 0,
    shook = false;
  F.follow(() => {
    const c = towerSpiral(Math.min(Sp.n, u + 2.6), 0.5);
    const P = p.pos;
    return { pos: new V3(c.x, c.y + 1.75, c.z), look: new V3(P.x, P.y + 1.05, P.z), fov: 70, inside: true };
  });
  F.hand = 0.03;
  while (u < 19) {
    const dt = yield;
    u = Math.min(Sp.n, u + (dt * 3.9) / STEP);
    const q = towerSpiral(u);
    F.setP(q.x, q.y, q.z, q.yaw);
    // (un tirón de la cadena, fuera: la torre tiembla y suelta polvo)
    if (!shook && u > 9) {
      shook = true;
      towerShake(D, G);
    }
  }
  // ---- (c) fuera, desde lo alto de la torre, por encima del pretil: la
  // plaza abajo y él, en la boca de la calle, tirando de la campana (sigue
  // subiendo)
  F.shot([T.x - 0.6, T.deckY + 1.55, T.deck[1] - 0.45], [G.pos.x * 0.7 + T.x * 0.3, 4.5, G.pos.z + 2], { fov: 60 });
  F.hand = 0.03;
  towerShake(D, G);
  let t = 0;
  while (u < Sp.n) {
    const dt = yield;
    t += dt;
    u = Math.min(Sp.n, u + (dt * 3.9) / STEP);
    const q = towerSpiral(u);
    F.setP(q.x, q.y, q.z, q.yaw);
  }
  while (t < 1.2) t += yield;
  // ---- (d) la sala de los guardas: sale del hueco y cruza hasta la escala
  const RY = T.roomY,
    Ld = T.ladder;
  const top = T.deckY - 0.02;
  const zL = (y) => Ld.z - 0.05 - (top - y) * Math.sin(Ld.lean) - 0.4;
  F.shot([T.x + 1.22, RY + 2.25, T.z - 1.3], [T.x + 0.1, RY + 0.9, T.z + 0.6], { fov: 66, inside: true });
  F.hand = 0.02;
  const s1 = towerSpiral(Sp.n);
  F.setP(s1.x, RY, s1.z, s1.yaw);
  yield* runTo3(D, new V3(T.x + 0.35, RY, T.z - 0.55), 2.6);
  yield* runTo3(D, new V3(Ld.x, RY, zL(RY)), 2.6);
  // la escala
  p.yaw = 0;
  F.pClip(FP.ladder, { blend: 0.15 });
  a && a.play('climb', p.pos);
  let y = RY;
  while (y < T.deckY - 2.25) {
    const dt = yield;
    y = Math.min(T.deckY - 2.25, y + dt * 2.1);
    F.setP(Ld.x, y, zL(y), 0);
  }
  // ---- (e) la trampilla, de un empujón; desde lo alto del cadalso
  const [hx0, hz0, hx1, hz1] = T.hatch;
  const HC = new V3((hx0 + hx1) / 2, T.deckY, (hz0 + hz1) / 2);
  F.pClip('interact', { blend: 0.1 });
  yield* F.wait(0.25);
  g.setGroupVisible('trampillaS', false);
  g.setGroupVisible('trampillaSOpen', true);
  a && a.play('stairCreak', HC, { k: 1.4 });
  a && a.play('woodHit', HC, { k: 1.2 });
  g.fx.blood.emit(HC.x, HC.y + 0.3, HC.z, 30, { color: DUST, speed: 2.5, life: 1.4, up: 1.4, gravity: 0.4 });
  F.shot([T.deck[2] - 0.35, T.deckY + 2.1, T.deck[3] - 0.25], [HC.x - 0.2, T.deckY + 0.5, HC.z - 0.4], { fov: 58 });
  F.pClip(FP.ladder, { blend: 0.1 });
  while (y < T.deckY - 1.0) {
    const dt = yield;
    y = Math.min(T.deckY - 1.0, y + dt * 2.0);
    F.setP(Ld.x, y, zL(y), 0);
  }
  // se encarama y sale hacia el sur; la tapa, detrás, se cierra
  F.pClip('climbUp', { blend: 0.08 });
  const from = new V3(Ld.x, y, zL(y)),
    to = new V3(HC.x, T.deckY, hz1 + 0.85);
  t = 0;
  while (t < 0.9) {
    const dt = yield;
    t += dt;
    const k = sm(clamp(t / 0.9, 0, 1));
    F.setP(lerp(from.x, to.x, k), lerp(from.y, to.y, Math.min(1, k * 1.6)), lerp(from.z, to.z, k), 0);
  }
  g.setGroupVisible('trampillaS', true);
  g.setGroupVisible('trampillaSOpen', false);
  a && a.play('woodHit', HC, { k: 1.0 });
  p.anim.stop(0.2);
  yield* F.wait(0.4);
}
// Un tirón de la cadena: el gigante tira de la campana clavada y la torre
// tiembla (cruje, suelta polvo de lo alto)
function towerShake(D, G) {
  const g = D.g,
    a = g.audio,
    T = TOWER_S;
  a && a.play('chainRun', G.head(_v), { k: 1.6 });
  a && a.play('stoneCreak', { x: T.x, y: 6, z: T.z }, { k: 1.8 });
  a && a.play('beastRoar', G.head(_v), { k: 1.3 });
  G.R.flinch.x.kick(-0.35);
  g.camRig.shake(0.45);
  g.input.rumble(0.6, 0.8, 320);
  const p = g.player.pos;
  for (let k = 0; k < 3; k++) g.fx.blood.emit(T.x + rnd(-1, 1), Math.min(T.roomY + 2.8, p.y + 3.2), T.z + rnd(-1, 1), 14, { color: DUST, speed: 1.2, life: 1.6, up: -0.5, gravity: 0.5 });
}
// el jugador (marioneta) corre de donde está a 'to' (a v m/s), mirando hacia allí
function* runTo3(D, to, v) {
  const F = D.film,
    p = D.g.player;
  const from = p.pos.clone();
  const L = Math.hypot(to.x - from.x, to.z - from.z);
  const yaw = Math.atan2(to.x - from.x, to.z - from.z);
  const dur = Math.max(0.05, L / v);
  let t = 0;
  while (t < dur) {
    t += yield;
    const k = Math.min(1, t / dur);
    F.setP(lerp(from.x, to.x, k), lerp(from.y, to.y, k), lerp(from.z, to.z, k), L > 0.05 ? yaw : p.yaw);
  }
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
