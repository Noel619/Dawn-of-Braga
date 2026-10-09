// La película, acto 2: el agarrón y el lanzamiento.
//
// Los dedos se cierran como una jaula (la cámara, dentro de la mano):
// ¡Apuñala! — le clavas la espada en un dedo; se estremece pero no suelta.
// La mano sube por el agujero de la bóveda: la ciudad entera, de noche, los
// fuegos, la niebla. Primer plano: la jaula de hierro, los ojos de brasa, la
// mandíbula que se abre: te ruge a la cara. Echa el brazo atrás y te tira
// hacia el sur: el vuelo, a cámara lenta, por encima de las torres de la
// fachada, el atrio y la plaza (¡Cúbrete!), y el tejado del establo de los
// Pellejeros, que se hunde: caes en la paja. Fuera de franjas: control.
import * as THREE from 'three';
import { sm, smoother, lerp, easeIn, easeOut } from './film.js';
import { FP } from './film_player.js';
import { NAVE } from '../../world/level_finale.js';
import { clamp } from '../../core/util.js';

const V3 = THREE.Vector3;
const rnd = (a, b) => a + Math.random() * (b - a);
const _v = new V3(),
  _v2 = new V3(),
  _q = new THREE.Quaternion();

// dónde cae: la paja del establo (por el tejado, entre las cuadras y la
// puerta)
export const ESTABLO = {
  roof: [33.4, 7.6, 24.7],
  hay: [33.2, 0.75, 24.6],
  // donde se queda tras caer (y el punto de control)
  stand: [33.0, 0, 24.2, -Math.PI / 2],
};

// ======================================================================
// ACTO 2
// ======================================================================
export function* actGrab(D, o = {}) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  const G = yield* D.waitGiant();
  if (!D.caught) setupStandalone(D, G);
  F.cinema(true);
  F.puppet(true);
  g.chaseRun = false;
  p.autoDir = null;
  // el puño: la muñeca, llevada por el guion (IK) por un camino suave; el
  // jugador, en el hueco de la mano, de cintura para arriba
  const fist = new V3().copy(D.caught.target);
  const pole = new V3();
  let fistW = 1;
  const fistIK = () => {
    G.wp(11, 5, 1, pole);
    if (fistW > 0.001) G.reachHand('L', fist, pole, fistW, { stretch: 1.1 });
    else G.freeHand('L');
  };
  const held = () => {
    const c = G.palmL(new V3());
    const f = G.face(_v2);
    return { pos: c.add(_v.set(0, -0.5, 0)), yaw: Math.atan2(f.x - c.x, f.z - c.z) };
  };
  F.attach = held;
  F.pClip(FP.held, { blend: 0.15 });
  // ---------------------------------------------------------- 1. la jaula
  // (dentro de la mano: los dedos alrededor, el jugador forcejea)
  const cageCam = () => {
    const P = p.pos;
    const f = G.face(new V3());
    const toF = _v.subVectors(f, P).setY(0).normalize();
    return { pos: new V3(P.x, P.y + 1.6, P.z).addScaledVector(toF, 1.5).add(_v2.set(toF.z * 0.7, 0, -toF.x * 0.7)), look: new V3(P.x, P.y + 1.05, P.z), fov: 62 };
  };
  F.follow(() => cageCam());
  F.hand = 0.05;
  g.camRig.shake(0.5);
  a && a.play('chainRun', p.pos, { k: 1.2 });
  a && a.play('playerHurt', p.pos);
  // (la mano se cierra y sube un poco mientras tanto)
  let t = 0;
  while (G.actT < 1.6) {
    yield;
    fistIK();
  }
  const ok = yield* F.prompt({ action: 'light', label: '¡Apuñala!', window: 2.6, mash: 5, slow: 0.5 });
  if (ok) {
    F.pClip(FP.stabDown, { blend: 0.05 });
    a && a.play('thrust', p.pos, { k: 1.3 });
    g.fx.blood.emit(p.pos.x, p.pos.y + 0.8, p.pos.z, 30, { color: [0.35, 0.05, 0.04], speed: 3.5, up: 2 });
    G.R.flinch.x.kick(0.5);
    a && a.play('beastRoar', G.head(_v), { k: 1.2 });
    g.camRig.shake(0.5);
    yield* F.wait(0.55);
    F.pClip(FP.held, { blend: 0.2 });
  } else {
    // aprieta
    a && a.play('boneCrack', p.pos, { k: 1.2 });
    F.hurt(20, null, { shake: 0.7, heavy: true });
    yield* F.wait(0.5);
  }
  // ---------------------------------------------------------- 2. arriba
  // la mano sube por el agujero de la bóveda hasta su cara; detrás del
  // jugador, la ciudad entera
  G.rootMotion = false;
  G.play('lift', { blend: 0.4 });
  G.lookW = 0.8;
  G.lookAt = null;
  const f0 = fist.clone();
  // la muñeca, delante de la cara (espacio del modelo): ahí acaba
  const faceFist = new V3(1.2, 14.6, 7.2);
  F.follow((dt, tt) => {
    const P = p.pos;
    const u = sm(clamp(tt / 3.4, 0, 1));
    return { pos: new V3(P.x - lerp(2.5, 4.5, u), P.y + lerp(1.5, 3.2, u), P.z - lerp(4.5, 7, u)), look: new V3(P.x + 1, P.y + lerp(0.5, -3, u), P.z + 14), fov: lerp(60, 70, u) };
  });
  F.hand = 0.04;
  D.windK = 0.7;
  g.atmo.override = { ...g.atmo.override, density: 0.008, far: 320, ash: 0.5 };
  t = 0;
  while (t < 3.4) {
    const dt = yield;
    t += dt;
    const u = smoother(clamp(t / 3.2, 0, 1));
    const tgt = G.wp(faceFist.x, faceFist.y, faceFist.z, _v);
    // (sube en curva: primero arriba, luego hacia la cara)
    fist.set(lerp(f0.x, tgt.x, u), lerp(f0.y, tgt.y, Math.min(1, u * 1.25)), lerp(f0.z, tgt.z, u * u));
    fistIK();
    if (t > 1.2 && !D._liftRoar) {
      D._liftRoar = true;
      a && a.play('leapWind', p.pos, { k: 1.2 });
    }
  }
  D._liftRoar = false;
  // ---------------------------------------------------------- 3. la cara
  G.play('roarClose', { blend: 0.3 });
  // por encima del hombro del jugador: la jaula, los ojos de brasa
  F.follow(() => {
    const P = p.pos;
    const f = G.face(new V3());
    const away = _v.subVectors(P, f).setY(0).normalize();
    return { pos: new V3(P.x, P.y + 1.45, P.z).addScaledVector(away, 1.25).add(_v2.set(away.z * 0.55, 0, -away.x * 0.55)), look: f.clone().add(_v2.set(0, -0.3, 0)), fov: 46 };
  });
  F.hand = 0.03;
  while (G.actT < 0.95) {
    yield;
    fist.copy(G.wp(faceFist.x, faceFist.y, faceFist.z, _v));
    fistIK();
  }
  // ruge: desde su boca, el jugador en el puño, el aliento y las ascuas
  a && a.play('beastRoarBig', G.face(_v), { k: 1.8 });
  g.camRig.shake(1.0);
  g.input.rumble(1, 1, 1200);
  F.pClip(FP.tuck, { blend: 0.08 });
  t = 0;
  let embers = 0;
  // (de perfil: el puño con el jugador a un lado, la cara que ruge al otro)
  F.follow((dt, tt) => {
    const f = G.face(new V3());
    const P = p.pos;
    const mid = new V3(P.x, P.y + 1.2, P.z).lerp(f, 0.5);
    const d = _v.subVectors(f, P).setY(0).normalize();
    const u = sm(clamp(tt / 1.4, 0, 1));
    return { pos: mid.clone().add(_v2.set(d.z * lerp(5.2, 4.4, u), 0.4, -d.x * lerp(5.2, 4.4, u))), look: mid, fov: 52 };
  });
  while (G.actT < 2.5) {
    const dt = yield;
    t += dt;
    fist.copy(G.wp(faceFist.x, faceFist.y, faceFist.z, _v));
    fistIK();
    embers -= dt;
    if (embers <= 0) {
      embers = 0.04;
      const f = G.face(_v2);
      const d = new V3().subVectors(p.pos, f).normalize();
      g.fx.blood.emit(f.x, f.y - 0.6, f.z, 4, { color: [1, 0.5, 0.14], speed: 7, life: 0.7, up: 0.5, gravity: -0.5, dir: d });
    }
  }
  F.pClip(FP.held, { blend: 0.2 });
  // ---------------------------------------------------------- 4. el lanzamiento
  // se vuelve hacia el sur (al establo) y echa el puño atrás
  const R0 = new V3(...ESTABLO.roof);
  const yaw0 = G.yaw,
    yaw1 = Math.atan2(R0.x - G.pos.x, R0.z - G.pos.z);
  G.play('hurl', { blend: 0.3 });
  G.rootMotion = true;
  // desde el claustro, de lado: el gigante sobre los muros de la nave
  F.shot([24, 13.5, -86 + (G.pos.z + 88) * 0.5], [0, 15, G.pos.z + 2], { fov: 56 });
  F.hand = 0.03;
  let rel = false;
  const relAt = 1.16;
  while (!rel) {
    yield;
    const t2 = G.actT;
    G.yaw = lerp(yaw0, yaw1, sm(clamp(t2 / 0.9, 0, 1)));
    // (el puño lo lleva el clip: la IK se suelta en el impulso)
    fistW = Math.max(0, 1 - t2 / 0.45);
    fistIK();
    if (t2 >= relAt) rel = true;
  }
  fistW = 0;
  G.freeHand('L');
  a && a.play('pikeWhoosh', p.pos, { k: 1.6 });
  a && a.play('beastRoar', G.head(_v), { k: 1.3 });
  // ---------------------------------------------------------- 5. el vuelo
  hideFolk(g, 33, 24, 18);
  yield* flight(D, G);
  G.rootMotion = false;
}

// Para empezar aquí (modo de pruebas): el gigante en la nave y el jugador en
// su mano
function setupStandalone(D, G) {
  const g = D.g,
    F = D.film;
  D.film.cinema(true);
  F.puppet(true);
  D.setWorld(0);
  for (const [n, v] of [
    ['abside', false],
    ['absideRuin', true],
    ['cabecera', false],
    ['cabeceraRuin', true],
    ['naveRoof', false],
    ['naveRuin', true],
  ])
    g.setGroupVisible(n, v);
  for (let i = 0; i < NAVE.secs.length; i++) g.setGroupVisible('naveRuin:' + i, true);
  for (let i = 0; i < 3; i++) {
    g.setGroupVisible('naveArc:' + i, false);
    g.setGroupVisible('naveArcRuin:' + i, true);
  }
  G.place(0, -88.5, 0, { clip: 'catch', t0: 1.0 });
  G.groundFn = (x, z) => (z > -104 ? NAVE.FY : 0);
  D.caught = { target: G.bp('handL', 4.9, 6.6, 2.0, new V3()) };
  g.atmo.override = { density: 0.014, vol: 0.06, far: 220, bloom: 1.25, hemi: 3.6, moon: 3.6, moonPos: [-14, 26, -30], fog: 0x302826, exposure: 1.25, ash: 0.3, snap: true };
  g.fadeTarget = 1;
  g.audio && g.audio.music('bossFinal');
}

// La gente de donde cae (el soldado del establo, los perros del corral):
// fuera; el gigante va a pasar por ahí
export function hideFolk(g, x, z, r) {
  for (const e of g.enemies) {
    if (e.dead) continue;
    if (Math.hypot(e.pos.x - x, e.pos.z - z) > r) continue;
    e.scripted = true;
    e.obj.visible = false;
    if (e.shadow) e.shadow.visible = false;
  }
}

// El vuelo: una parábola larga del puño al tejado del establo (pasa por
// encima de las torres de la fachada), dando vueltas; la cámara le sigue.
function* flight(D, G) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  const from = p.pos.clone();
  const to = new V3(...ESTABLO.roof);
  const H = 31; // lo que sube por encima de la recta
  const dur = 4.2;
  const at = (u, out = new V3()) => {
    out.set(lerp(from.x, to.x, u), lerp(from.y, to.y, u) + 4 * H * u * (1 - u), lerp(from.z, to.z, u));
    return out;
  };
  const dir = new V3().subVectors(to, from).setY(0).normalize();
  const yaw = Math.atan2(dir.x, dir.z);
  F.attach = null;
  F.pClip(FP.fly, { blend: 0.08 });
  D.windK = 1;
  const e = new THREE.Euler();
  let u = 0,
    t = 0;
  const pose = () => {
    const P = at(u);
    F.setP(P.x, P.y, P.z, yaw);
    // da vueltas (de lado y de cabeza), cada vez más despacio
    e.set(Math.sin(u * 7) * 0.9 + u * 5.5, 0, Math.sin(u * 4.3) * 0.6);
    F.tilt.setFromEuler(e);
  };
  // (a) suelta: a cámara lenta, desde junto al puño
  F.slow(0.3, 12);
  const c0 = p.pos.clone().addScaledVector(dir, -4).add(_v.set(dir.z * 3.5, 1.5, -dir.x * 3.5));
  F.follow(() => ({ pos: c0, look: p.pos.clone(), fov: 58 }));
  F.hand = 0.02;
  while (u < 0.09) {
    const dt = yield;
    t += dt;
    u = Math.min(1, t / dur);
    pose();
  }
  // (b) por encima de la fachada y la plaza: detrás de él, girando (la
  // niebla se abre: la ciudad entera, abajo)
  F.slow(0.75, 3);
  g.atmo.override = { ...g.atmo.override, density: 0.0045, far: 420, fog: 0x2a2630, hemi: 3.4, moon: 3.4, ash: 0.6 };
  a && a.play('leapWind', p.pos, { k: 1.6 });
  F.follow((dt, tt) => {
    const P = p.pos;
    const back = _v.copy(dir).multiplyScalar(-3.8);
    const side = _v2.set(dir.z, 0, -dir.x).multiplyScalar(Math.sin(tt * 0.7) * 2.6);
    return { pos: new V3(P.x + back.x + side.x, P.y + 1.4 + Math.sin(tt * 0.5) * 0.9, P.z + back.z + side.z), look: P.clone().addScaledVector(dir, 7).add(_v.set(0, -5, 0)), fov: 70, roll: Math.sin(tt * 0.6) * 0.35 };
  });
  while (u < 0.62) {
    const dt = yield;
    t += dt;
    u = Math.min(1, t / dur);
    pose();
  }
  // (c) la caída: de lado, cerca; los tejados del corral se le acercan
  F.slow(0.6, 4);
  F.follow((dt, tt) => {
    const P = p.pos;
    const side = _v2.set(dir.z, 0, -dir.x);
    return { pos: new V3(P.x + side.x * 4.6 - dir.x * 2.2, P.y + 1.2, P.z + side.z * 4.6 - dir.z * 2.2), look: new V3(P.x + dir.x * 3, P.y - 2.2, P.z + dir.z * 3), fov: 68, roll: 0.08 };
  });
  let block = null;
  while (u < 0.985) {
    const dt = yield;
    t += dt;
    u = Math.min(1, t / dur);
    pose();
    if (!block && u > 0.86) {
      // desde el borde del tejado del establo: le ve venir encima
      F.slow(0.2, 12);
      F.follow(() => ({ pos: new V3(30.9, 8.1, 21.3), look: p.pos.clone(), fov: 64 }));
      block = F.promptAsync({ action: 'block', label: '¡Cúbrete!', window: 1.0, slow: 1 });
    }
    if (block && block.ok !== null && !block.tucked) {
      block.tucked = true;
      if (block.ok) F.pClip(FP.tuck, { blend: 0.08 });
    }
  }
  while (block && block.ok === null) yield;
  // (d) el tejado se hunde: dentro del establo, mirando arriba
  F.slow(1, 8);
  breakStableRoof(D, to);
  F.tilt.identity();
  const hay = new V3(...ESTABLO.hay);
  F.shot([30.9, 1.1, 27.9], [33.3, 2.6, 24.5], { fov: 74 });
  g.atmo.override = { ...g.atmo.override, density: 0.03, far: 120, hemi: 2.4, moon: 2.0, exposure: 1.3, ash: 0 };
  D.light({ x: 33.4, y: 5.5, z: 24.7, color: 0x9fb2ff, intensity: 22, range: 9, flicker: 0, priority: 9 });
  F.hand = 0.05;
  t = 0;
  const p0 = p.pos.clone();
  F.pClip(FP.tuck, { blend: 0.05 });
  while (t < 0.32) {
    const dt = yield;
    t += dt;
    const k = Math.min(1, t / 0.32);
    F.setP(lerp(p0.x, hay.x, k), lerp(p0.y, hay.y, easeIn(k)), lerp(p0.z, hay.z, k), yaw);
  }
  a && a.play('hayLand', p.pos, { k: 1.6 });
  a && a.play('woodBreak', p.pos, { k: 1.4 });
  g.camRig.shake(0.9);
  g.input.rumble(1, 1, 500);
  g.fx.blood.emit(hay.x, hay.y + 0.5, hay.z, 40, { color: [0.3, 0.25, 0.14], speed: 4, life: 1.6, up: 3, gravity: 1.5 });
  F.hurt(block && block.ok ? 8 : 26, null, { shake: 0.6, blood: !(block && block.ok), heavy: true });
  F.pClip('fallBack', { blend: 0.05 });
  yield* F.wait(1.1);
  // se levanta, aturdido: control (punto de control: el establo)
  F.pClip('getup', { blend: 0.1 });
  yield* F.wait(1.0);
  D.windK = 0;
}

// El tejado del establo, reventado desde arriba: tejas, vigas y polvo
function breakStableRoof(D, at) {
  const g = D.g,
    a = g.audio;
  g.setGroupVisible('wreck:establo', false);
  g.setGroupVisible('wreck:establo:ruin', true);
  g.setGroupVisible('wreck:establo:techo', false);
  g.setGroupVisible('wreck:establo:techoRuin', true);
  for (let i = 0; i < 26; i++)
    D.chunks.add({ mat: Math.random() < 0.75 ? 'roof' : 'planks', size: [rnd(0.7, 1.3), 0.1, rnd(0.5, 0.9)], pos: new V3(at.x + rnd(-2, 2), at.y + rnd(-0.5, 0.5), at.z + rnd(-2, 2)), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(rnd(-3, 3), rnd(-6, 2), rnd(-3, 3)), spin: [rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)], shatter: 8, life: 10 });
  for (let i = 0; i < 3; i++) D.chunks.add({ mat: 'timber', size: [0.25, 0.25, rnd(2.5, 4)], pos: new V3(at.x + rnd(-1, 1), at.y - 0.5, at.z + rnd(-1.5, 1.5)), rot: [rnd(-0.4, 0.4), rnd(0, 3), rnd(-0.4, 0.4)], vel: new V3(rnd(-1, 1), -3, rnd(-1, 1)), spin: [rnd(-2, 2), rnd(-1, 1), rnd(-2, 2)], shatter: 99, life: 12, bounce: 0.15 });
  g.fx.blood.emit(at.x, at.y, at.z, 60, { color: [0.3, 0.26, 0.22], speed: 4, life: 2.4, up: 1, gravity: 0.4 });
  a && a.play('woodBreak', at, { k: 2 });
  a && a.play('wallBreak', at, { k: 1.2 });
}
