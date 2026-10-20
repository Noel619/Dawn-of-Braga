// La película, el final: el corazón del dios.
//
// (Sigue al ojo reventado del acto 6, con el jugador agarrado a la jaula de
// su cara: ver gow2 en film_end.js.) Los virotes no le matan: le derriban.
//
// Retrocede tambaleándose hacia el cráter con el jugador en la cara: ¡Trepa!
// por los barrotes y por encima del remate, hasta lo alto de la cabeza,
// entre los cuernos — se revuelve como un perro mojado para quitárselo de
// encima, y los cirios de la aureola salen volando: ¡Agárrate! — por detrás
// de la cabeza y la nuca abajo, a la joroba, hasta el virote de la segunda
// espringala: ¡Húndelo! (machacar, con todo el cuerpo encima) — le atraviesa
// el cuello: se ahoga sin voz, las piernas no le sostienen y cae de rodillas
// al borde del cráter; el pecho se le abre como dos puertas y el núcleo late
// a la vista — la izquierda viene a la nuca a por ti: ¡Salta! — por encima
// del hombro y de espaldas por la casulla abajo, hasta el pecho abierto (la
// mano se cierra en el virote y se lo arranca) — junta las dos manos para
// aplastarte contra su propio pecho: ¡Esquiva! (adentro, entre las costillas;
// las garras se le clavan en ellas) — ¡Apuñala! el corazón (machacar) — y la
// última, alzada a dos manos, hasta la empuñadura: revienta (la luz, la onda,
// el silencio) y sales despedido. Se le apagan los ojos, los cirios, la
// carne que ardía; muerto, se queda colgando de las rodillas y cae de
// espaldas al cráter: la sangre negra se lo traga. Amanece.
import * as THREE from 'three';
import { sm, lerp, easeIn, camSafe } from './film.js';
import { FP } from './film_player.js';
import { CISTERN, BLOOD_Y } from '../../world/level_finale.js';
import { clamp, dampAngle } from '../../core/util.js';

const V3 = THREE.Vector3;
const rnd = (a, b) => a + Math.random() * (b - a);
const _v = new V3(),
  _v2 = new V3(),
  _v3 = new V3(),
  _u = new V3(),
  _f = new V3(),
  _r = new V3(),
  _s = new V3();
const _q = new THREE.Quaternion(),
  _q2 = new THREE.Quaternion(),
  _m = new THREE.Matrix4();
const _Y = new V3(0, 1, 0);
const _I = new THREE.Quaternion();
// la sangre negra del dios (la de la cisterna), las brasas del corazón, el
// fogonazo
const BLACK = [0.09, 0.035, 0.03];
const EMBER = [1.0, 0.52, 0.16];
const WHITE = [1.0, 0.86, 0.62];
const STEAM = [0.5, 0.47, 0.45];
const C0 = new V3(0, 0, CISTERN.cz);
const SURF = CISTERN.AY + BLOOD_Y;
// cae de rodillas a esta distancia del centro del cráter, de espaldas a él
// (las espinillas, en el labio; al caer muerto, la espalda va dentro)
const KNEEL_R = 15.2;

// ---------------------------------------------------------------------
// El jugador en el cuerpo del gigante
// Los pies en un punto pegado a un hueso (espacio del modelo en reposo),
// derecho según up (del reposo; con algo de la vertical, upright, para que
// no se tumbe del todo) y mirando hacia fwd (también del reposo)
const newPose = () => ({ pos: new V3(), tilt: new THREE.Quaternion(), yaw: 0 });
function onBone(G, bone, p, fwd, up = null, upright = 0.35, out = newPose()) {
  G.bp(bone, p[0], p[1], p[2], out.pos);
  const q = G.boneQ(bone, _q);
  if (up) _u.set(up[0], up[1], up[2]);
  else _u.set(0, 1, 0);
  _u.applyQuaternion(q).normalize().lerp(_Y, upright).normalize();
  _f.set(fwd[0], fwd[1], fwd[2]).applyQuaternion(q);
  return orient(out, _u, _f);
}
// la inclinación del jugador con su arriba (up) y su delante (fwd), del mundo
function orient(out, up, fwd) {
  _f.copy(fwd).addScaledVector(up, -fwd.dot(up));
  if (_f.lengthSq() < 1e-6) _f.set(0, 0, 1).addScaledVector(up, -up.z);
  _f.normalize();
  _r.crossVectors(up, _f);
  _m.makeBasis(_r, up, _f);
  out.tilt.setFromRotationMatrix(_m);
  out.yaw = 0;
  return out;
}
// de una a otra (k: 0..1; arc: un salto, en metros, hacia arriba)
function mixPose(A, B, k, arc = 0, out = newPose()) {
  out.pos.lerpVectors(A.pos, B.pos, k);
  if (arc) out.pos.y += Math.sin(k * Math.PI) * arc;
  out.tilt.slerpQuaternions(A.tilt, B.tilt, k);
  out.yaw = 0;
  return out;
}
// Un recorrido por el cuerpo: nodos { bone, p, fwd, up, upright, arc } y u de
// 0 a n-1 (cada tramo, suave)
function bodyPath(G, nodes) {
  const P = nodes.map(() => newPose());
  const out = newPose();
  return (u) => {
    const n = nodes.length;
    u = clamp(u, 0, n - 1);
    const i = Math.min(n - 2, Math.floor(u));
    const a = nodes[i],
      b = nodes[i + 1];
    onBone(G, a.bone, a.p, a.fwd, a.up, a.upright ?? 0.35, P[i]);
    onBone(G, b.bone, b.p, b.fwd, b.up, b.upright ?? 0.35, P[i + 1]);
    return mixPose(P[i], P[i + 1], sm(u - i), b.arc || 0, out);
  };
}
// El marco del gigante de rodillas (fijo: no se ladea al caer): x a su
// izquierda, y arriba, z adelante
function frame(o, yaw) {
  const s = Math.sin(yaw),
    c = Math.cos(yaw);
  return (x, y, z, out = new V3()) => out.set(o.x + c * x + s * z, o.y + y, o.z - s * x + c * z);
}
// Una cámara que va detrás de un sitio que se mueve (rate: lo deprisa que lo
// sigue), mirando a otro
function lagCam(F, want, look, o = {}) {
  const c = new V3();
  let first = true;
  F.follow((dt, tt) => {
    const w = want(dt, tt);
    if (first) {
      c.copy(w);
      first = false;
    } else c.lerp(w, Math.min(1, dt * (o.rate ?? 4)));
    return { pos: c.clone(), look: look(dt, tt), fov: typeof o.fov === 'function' ? o.fov(tt) : o.fov ?? 58, roll: o.roll ? o.roll(tt) : 0, inside: !!o.inside, pad: o.pad };
  });
}
// donde se pone el jugador para hundir el virote: en lo alto de la joroba
// (lo más alto del cuerpo: la cabeza cuelga por delante), y el virote, a un
// palmo, casi a plomo en la base del cuello (espacio del modelo, hueso
// 'chest')
const NAPE_STAND = [0, 15.75, -1.75];
const NAPE_BOLT = { at: [0, 15.9, -0.85], dir: [0, -0.94, 0.34], depth: 0.95 };
// En el pecho abierto no hay suelo delante del núcleo (la carne baja casi a
// plomo): el jugador se agarra a su nido, colgado delante, como de la jaula
// de la cara; y para esquivar se descuelga al borde de abajo del hueco (los
// pies, espacio del modelo, hueso 'chest')
const CORE_GRIP = [0, 10.75, 2.45];
const LEDGE_HANG = [0, 8.85, 1.45];
// la nuca (el virote) y la garganta, del mundo
const nape = (G, out = new V3()) => G.bp('neck2', 0, 16.0, 0.6, out);
const throat = (G, out = new V3()) => G.bp('neck2', 0, 14.55, 2.75, out);
// el corazón (el núcleo, por delante)
const coreAt = (G, out = new V3()) => G.bp('chest', 0, 12.25, 1.55, out);

// El jugador agarrado a la jaula de la cara: las manos en los barrotes, de
// cara a él (un poco hacia su derecha: delante del ojo que apuñala)
export function cageAttach(G) {
  return {
    get() {
      const f = G.face(new V3());
      const hq = G.M.byName.head.getWorldQuaternion(new THREE.Quaternion());
      const fw = _v2.set(0, 0, 1).applyQuaternion(hq);
      fw.y = 0;
      fw.normalize();
      const pos = f.clone().addScaledVector(fw, 0.85).add(_v3.set(0, -1.55, 0));
      pos.x -= fw.z * 0.3;
      pos.z += fw.x * 0.3;
      return { pos, yaw: Math.atan2(-fw.x, -fw.z), tilt: _I };
    },
  };
}

// Un aviso de machacar, con lo que pasa a cada pulsación (onPress(i)).
// Devuelve si se acertó. En el modo de pruebas (y al saltar) las pulsaciones
// se fingen, para ver cómo queda.
function* mash(X, o, onPress) {
  const { g, F } = X;
  const auto = g.dev && g.dev.autoQTE;
  if (F.skipping || auto) {
    let t = 0,
      n = 0;
    while (n < o.mash) {
      const dt = yield;
      t += dt;
      if (F.skipping || t >= (o.every ?? 0.26)) {
        t = 0;
        onPress(++n);
      }
    }
    return auto !== 'fail' || F.skipping;
  }
  const q = F.promptAsync(o);
  let n = 0;
  while (q.ok === null) {
    yield;
    const cur = g.qte.cur ? g.qte.cur.n : n;
    while (n < cur) onPress(++n);
  }
  if (q.ok) while (n < o.mash) onPress(++n);
  return q.ok;
}

// ======================================================================
// EL FINAL
// ======================================================================
export function* heartEnd(D, G, S, bolt) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  F.cinema(true);
  F.puppet(true);
  p.autoDir = null;
  G.lookW = 0;
  G.lookAt = null;
  G.ik.R = null;
  G.onEventHook = null;
  a && a.music('bossFinal2');
  D.heroK = 1;
  // dónde caerá de rodillas: de espaldas al cráter, en su borde, del lado de
  // donde viene
  const dirK = new V3(G.pos.x - C0.x, 0, G.pos.z - C0.z);
  if (dirK.lengthSq() < 1) dirK.set(-0.85, 0, 0.53);
  dirK.normalize();
  const X = { D, g, F, p, a, G, S, bolt, arm: D.arm, yawK: Math.atan2(dirK.x, dirK.z) };
  X.K = C0.clone().addScaledVector(dirK, KNEEL_R);
  X.at = frame(X.K, X.yawK);
  X.walk = walker(X);
  F.also(X.walk.run());
  // (la luz del jugador: encima del gigante, que se le vea)
  F.keyLight(1);
  // ------------------------------------------------- 1. a lo alto de la cabeza
  yield* climbHead(X);
  yield* rideHead(X);
  // ------------------------------------------------- 2. la nuca: el virote
  yield* toNape(X);
  yield* driveBolt(X);
  // ------------------------------------------------- 3. de rodillas, abierto
  yield* fallKnees(X);
  // ------------------------------------------------- 4. al pecho
  yield* leapToChest(X);
  yield* crush(X);
  // ------------------------------------------------- 5. el corazón
  yield* stabHeart(X);
  yield* burst(X);
  // ------------------------------------------------- 6. muerto; amanece
  yield* deadFall(X);
  yield* dawn(X);
}

// Retrocede (a tropezones, de espaldas al cráter) hasta el borde, mientras
// on; done cuando llega (y ahí se queda: X.K es donde está)
function walker(X) {
  const { G } = X;
  const W = { on: false, done: false, stop: false };
  W.run = function* () {
    while (!W.stop) {
      const dt = yield;
      if (!W.on || W.done) continue;
      G.yaw = dampAngle(G.yaw, X.yawK, 1.8, dt);
      if (G.actName !== 'staggerBack' || G.actDone) G.play('staggerBack', { blend: 0.3 });
      G.rootMotion = true;
      if (Math.hypot(G.pos.x - C0.x, G.pos.z - C0.z) <= KNEEL_R + 0.15) W.arrive();
    }
  };
  W.arrive = () => {
    if (W.done) return;
    W.done = true;
    G.rootMotion = false;
    G.moveK = 1;
    if (G.actName === 'staggerBack') G.stopAction(0.5);
    G.base('idle', { blend: 0.5 });
    // (de rodillas, aquí: el marco del final)
    X.K = G.pos.clone().setY(0);
    X.yawK = G.yaw;
    X.at = frame(X.K, X.yawK);
  };
  return W;
}

// ---------------------------------------------------------------------
// 1. Retrocede con una mano en la cuenca vacía y el jugador en la jaula:
// ¡Trepa! por los barrotes, por encima del remate, a lo alto de la cabeza
function* climbHead(X) {
  const { g, F, p, a, G } = X;
  G.speedK = 1.1;
  G.moveK = 1.15;
  X.walk.on = true;
  F.slow(1, 5);
  // (delante de la cara, a su derecha y un poco por debajo: el jugador en la
  // jaula y, detrás, la cuenca que sangra)
  lagCam(F, () => G.bp('head', -2.4, 15.0, 9.8, new V3()), () => p.pos.clone().add(_v.set(0, 0.9, 0)).lerp(G.eye('R', _v2), 0.25), { rate: 3.5, fov: 54 });
  F.hand = 0.04;
  yield* F.wait(0.45);
  const okClimb = yield* F.prompt({ action: 'interact', label: '¡Trepa!', window: 1.6, slow: 0.4 });
  if (!okClimb) {
    // (la sacudida le estrella contra los barrotes; trepa igual)
    F.hurt(12, null, { shake: 0.6 });
    a && a.play('hitHeavy', p.pos);
    yield* F.wait(0.4);
  }
  // por los barrotes, arriba; y por encima del remate, a la cabeza
  const path = bodyPath(G, [
    { bone: 'head', p: [-0.3, 14.65, 5.75], fwd: [0, 0, -1], upright: 0.6 },
    { bone: 'head', p: [-0.2, 16.1, 5.15], fwd: [0, 0, -1], upright: 0.6 },
    { bone: 'head', p: [-0.05, 17.55, 4.95], fwd: [0, 0, -1], upright: 0.5 },
    { bone: 'head', p: [0, 17.75, 3.15], fwd: [0, 0, 1], upright: 0.3, arc: 0.6 },
  ]);
  let u = 0;
  F.attach = () => path(u);
  F.pClip(FP.ladder, { blend: 0.1 });
  a && a.play('climb', p.pos);
  // (sube con él, delante de la jaula: el jugador por los barrotes, la cara
  // detrás y, abajo, el suelo que se aleja)
  lagCam(F, () => G.bp('head', -2.6, 17.4, 9.4, new V3()), () => p.pos.clone().add(_v.set(0, 0.9, 0)), { rate: 4, fov: 56 });
  let up = false;
  while (u < 3) {
    const dt = yield;
    u = Math.min(3, u + dt * (u < 2 ? 1.9 : 1.5));
    if (!up && u >= 2) {
      up = true;
      F.pClip('climbUp', { blend: 0.08 });
      a && a.play('climb', p.pos);
    }
  }
}

// Encima de la cabeza, agarrado a los cuernos: se revuelve como un perro
// mojado para quitárselo (¡Agárrate!); los cirios de la aureola salen volando
function* rideHead(X) {
  const { g, F, p, a, G } = X;
  X.walk.on = false;
  G.stopAction(0.3);
  G.rootMotion = false;
  G.base('thrash', { blend: 0.35 });
  F.pClip(FP.brace, { blend: 0.15 });
  const top = newPose();
  F.attach = () => onBone(G, 'head', [0, 17.75, 3.15], [0, 0, 1], null, 0.3, top);
  a && a.play('beastRoarBig', G.face(_v), { k: 2.4 });
  g.camRig.shake(0.6);
  // (los brazos abiertos, para no perder el equilibrio)
  X.arm.to({ w: [8.2, 13.2, 3.2], pole: [12, 11, -2] }, 0.5);
  // (por delante y por encima de la cara, quieta: la cabeza que se sacude en
  // el plano, con el jugador agarrado a los cuernos y la aureola detrás)
  lagCam(F, () => G.wp(-3.2, 21.2, 10.0, new V3()), () => p.pos.clone().add(_v.set(0, 0.6, 0)).lerp(G.head(_v2), 0.2), { rate: 2.5, fov: 54 });
  F.hand = 0.07;
  let tt = 0,
    cand = 0.25,
    n = 0,
    wide = false;
  const q = F.promptAsync({ action: 'interact', label: '¡Agárrate!', window: 2.4, mash: 6, slow: 0.6 });
  while (q.ok === null || tt < 1.6) {
    const dt = yield;
    tt += dt;
    cand -= dt;
    if (cand <= 0 && n < 6) {
      cand = rnd(0.22, 0.4);
      throwCandle(X, n++);
    }
    // (y de lejos, desde el suelo: la cabeza que se sacude, con él encima)
    if (!wide && tt > 1.5) {
      wide = true;
      F.follow(() => ({ pos: camSafe(g, G.head(new V3()), G.wp(15, 4.5, 21, new V3())), look: G.head(new V3()).add(_v.set(0, -1.5, 0)), fov: 46 }));
      F.hand = 0.04;
    }
  }
  if (!q.ok) {
    // (sale despedido hacia atrás, y se agarra a una correa de la jaula)
    F.hurt(16, null, { shake: 0.8 });
    a && a.play('playerHurt', p.pos);
    F.pClip(FP.slide, { blend: 0.05 });
    yield* F.wait(0.5);
    F.pClip(FP.brace, { blend: 0.1 });
  }
  // el último latigazo de la cabeza le arranca la aureola del cráneo: sale
  // volando, entera, con sus cirios (desde el suelo, de lejos)
  dropHalo(X);
  yield* F.wait(1.1);
  a && a.play('beastRoar', G.face(_v), { k: 2 });
}
// Las piedras clavadas en la joroba (los sillares de la catedral): fuera, y
// en su lugar, trozos que salen volando
function shakeStones(X) {
  const { D, g, a, G } = X;
  const B = G.M.byName.chest;
  for (const c of B.children) {
    if (!c.isMesh || !c.visible) continue;
    const d = c.material.userData.def;
    if (d && d.tex === 'ashlar') G.hidePart(c);
  }
  for (let i = 0; i < 10; i++) {
    const q = G.bp('chest', rnd(-1.5, 1.5), rnd(15.6, 16.6), rnd(-2.6, 0.2), new V3());
    const v = G.wd(rnd(-6, 6), 0, rnd(-6, 1), new V3()).add(_v.set(0, rnd(4, 9), 0));
    D.chunks.add({ mat: 'ashlar', size: [rnd(0.5, 0.9), rnd(0.4, 0.7), rnd(0.5, 0.9)], pos: q, rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: v, spin: [rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)], shatter: 12, life: 12 });
  }
  a && a.play('wallBreak', G.bp('chest', 0, 16, -1, _v), { k: 1.6 });
  D.debris.burst(G.bp('chest', 0, 16.2, -1, new V3()), 24, { speed: 7, up: 5, size: 0.7, spread: 1.5 });
  void g;
}
// La aureola se le parte del cráneo y cae entera al campo, con los cirios y
// el estandarte (se queda allí tirada)
function dropHalo(X) {
  const { D, g, a, G } = X;
  const B = G.M.byName.halo;
  B.updateWorldMatrix(true, false);
  const grp = new THREE.Group();
  for (const c of B.children) {
    if (!c.isMesh || !c.visible) continue;
    const m = new THREE.Mesh(c.geometry, c.material);
    m.frustumCulled = false;
    grp.add(m);
    G.hidePart(c);
  }
  G.hidePart(G.M.meshes.find((m) => m.name === 'estandarte'));
  for (let i = 0; i < 11; i++) if (G.fx.flames[i]) G.fx.flames[i].sp.visible = false;
  if (G.lights.halo) {
    G.lights.halo.dead = true;
    G.lights.halo.on = false;
  }
  // (y las piedras de la catedral que llevaba clavadas en la joroba, que
  // salen despedidas con la sacudida)
  shakeStones(X);
  const pos = new V3(),
    quat = new THREE.Quaternion();
  B.matrixWorld.decompose(pos, quat, _s);
  const at = G.bp('halo', 0, 18.95, 1.85, new V3());
  a && a.play('crack', at, { k: 2 });
  a && a.play('armorFall', at, { k: 2 });
  a && a.play('fleshTear', at, { k: 1.4 });
  g.fx.blood.emit(at.x, at.y - 1.5, at.z, 50, { color: BLACK, speed: 5, life: 1.4, up: 2, gravity: 9 });
  g.fx.blood.emit(at.x, at.y, at.z, 40, { color: EMBER, speed: 6, life: 1, up: 2, gravity: 4 });
  g.camRig.shake(0.7);
  // (hacia su derecha, arriba y atrás, dando vueltas; al caer, se queda de
  // plano en el campo)
  const hax = new V3(0, 0.24, 0.97).normalize();
  D.chunks.add({
    mesh: grp,
    pos,
    quat,
    vel: G.wd(-7, 0, -3, new V3()).add(_v.set(0, 8, 0)),
    spin: [rnd(-2, 2), rnd(-3, 3), rnd(1.5, 3)],
    radius: 0.4,
    shatter: 99,
    life: 999,
    bounce: 0.12,
    quiet: true,
    dust: true,
    onLand: (c, sp) => {
      if (c.hits !== 1) return;
      a && a.play('armorFall', c.p, { k: 2.2 });
      a && a.play('wallBreak', c.p, { k: 1.4 });
      g.camRig.shake(0.5);
      D.dust.ring(c.p, 14, { color: D.dustColor(c.p), r0: 2.5, speed: 7, size: 2.2, life: 4, grow: 1.5, alpha: 0.45 });
      // (de plano: el aro, tumbado, con un giro cualquiera)
      c.q.setFromUnitVectors(hax, _Y).premultiply(_q2.setFromAxisAngle(_Y, rnd(0, 6.28)));
      c.w.set(0, 0, 0);
      c.v.multiplyScalar(0.3);
    },
  });
}
// un cirio de la aureola sale volando (y su llama se apaga)
function throwCandle(X, k) {
  const { D, g, G } = X;
  const C = G.E.fx.candles;
  const idx = [1, 9, 4, 7, 2, 10][k % 6];
  const c = C[idx];
  if (!c) return;
  const at = G.bp(c.bone, c.p[0], c.p[1] - 1.0, c.p[2], new V3());
  const f = G.fx.flames[idx];
  if (f) f.sp.visible = false;
  // (hacia fuera de la aureola y hacia atrás: lejos de la cara)
  const out = _v.subVectors(at, G.bp('halo', 0, 18.95, 1.85, _v2));
  out.y = Math.max(0, out.y);
  out.normalize().multiplyScalar(rnd(5, 8)).add(G.wd(0, 0, -rnd(3, 6), _v2));
  D.chunks.add({ mat: 'candle', size: [0.32, rnd(1.3, 1.9), 0.32], pos: at, rot: [rnd(0, 1), rnd(0, 3), rnd(0, 1)], vel: out.add(_v3.set(0, rnd(3, 6), 0)), spin: [rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)], shatter: 6, life: 7, quiet: true });
  g.fx.blood.emit(at.x, at.y + 1, at.z, 14, { color: EMBER, speed: 3, life: 0.8, up: 1, gravity: 4 });
}

// ---------------------------------------------------------------------
// 2. Por detrás de la cabeza (las correas de la jaula) y la nuca abajo hasta
// la joroba; él, mientras, retrocede otra vez hacia el cráter
function* toNape(X) {
  const { g, F, p, a, G } = X;
  G.base('idle', { blend: 0.5 });
  X.walk.on = true;
  const path = bodyPath(G, [
    { bone: 'head', p: [0, 17.75, 3.15], fwd: [0, 0, 1], upright: 0.3 },
    { bone: 'head', p: [0.15, 17.45, 1.7], fwd: [0, 0, 1], up: [0, 1, -0.4], upright: 0.2 },
    { bone: 'chest', p: NAPE_STAND, fwd: [0, 0, 1], upright: 0.5 },
  ]);
  let u = 0;
  F.attach = () => path(u);
  F.pClip(FP.slide, { blend: 0.12 });
  a && a.play('climb', p.pos);
  // (la mano, abajo)
  X.arm.to({ w: [5.4, 9.0, 4.2], pole: [11, 9, 2] }, 0.9);
  // (de lado y desde arriba, a su izquierda, del lado contrario al
  // estandarte: el jugador que se descuelga por detrás de la cabeza hasta la
  // joroba)
  lagCam(F, () => G.wp(8.0, 21.5, -3.5, new V3()), () => p.pos.clone().add(_v.set(0, 0.6, 0)), { rate: 3, fov: 44 });
  F.hand = 0.04;
  while (u < 2) {
    const dt = yield;
    u = Math.min(2, u + dt * 0.95);
  }
}

// En la joroba, ante el virote de la nuca: ¡Húndelo! (machacar: con todo el
// cuerpo encima). A cada empujón se le hunde un palmo y se encoge; el último
// le atraviesa el cuello (la punta le sale por la garganta)
function* driveBolt(X) {
  const { g, F, p, a, G, bolt } = X;
  // (si aún no ha llegado al borde, que llegue; y ahí se queda)
  yield* F.until(() => X.walk.done, 4);
  X.walk.arrive();
  G.base('idle', { blend: 0.6 });
  restick(X);
  // de pie en la joroba, mirando al virote
  const stand = newPose();
  F.attach = () => {
    onBone(G, 'chest', NAPE_STAND, [0, 0, 1], null, 0.55, stand);
    _u.set(0, 1, 0).applyQuaternion(stand.tilt);
    return orient(stand, _u, _v.subVectors(bolt.tail, stand.pos));
  };
  F.pClip(FP.driveBolt, { blend: 0.12 });
  // (a su izquierda, del lado contrario al estandarte, y algo por encima de la
  // joroba: el jugador de pie en lo alto, agarrado al virote)
  lagCam(F, () => G.wp(5.6, 18.4, -2.4, new V3()), () => bolt.tail.clone().lerp(p.pos, 0.5).add(_v.set(0, 0.3, 0)), { rate: 4, fov: 38 });
  F.hand = 0.04;
  yield* F.wait(0.35);
  let side = false;
  const ok = yield* mash(X, { action: 'heavy', label: '¡Húndelo!', window: 4, mash: 6, slow: 0.6, every: 0.36 }, (i) => {
    F.pClip(FP.driveBolt, { blend: 0.03 });
    sinkBolt(X, 0.1);
    const nk = nape(G, _v);
    a && a.play('thrust', nk, { k: 1.6 });
    a && a.play(i % 2 ? 'fleshTear' : 'beastHurt', nk, { k: 1.4 });
    g.fx.blood.emit(nk.x, nk.y + 0.3, nk.z, 26, { color: BLACK, speed: 4, life: 1.2, up: 2.5, gravity: 9 });
    G.R.flinch.x.kick(-1.1);
    G.shake = 0.35;
    g.camRig.shake(0.35);
    g.input.rumble(0.7, 0.9, 160);
    // (a la mitad, por detrás y por encima: el jugador sobre el astil, la
    // cabeza colgando delante con su aureola y, al fondo, la torre)
    if (i === 3 && !side) {
      side = true;
      lagCam(F, () => G.wp(1.4, 19.0, -5.4, new V3()), () => bolt.tail.clone().lerp(G.head(_v2), 0.25), { rate: 6, fov: 42 });
    }
  });
  G.shake = 0;
  if (!ok) {
    // (no le dio tiempo: se encabrita y le tira de rodillas; lo hunde igual)
    F.hurt(14, null, { shake: 0.7 });
    a && a.play('playerHurt', p.pos);
  }
  // el último: con el peso de todo el cuerpo, hasta el fondo; la punta le
  // sale por la garganta
  F.slow(0.3, 8);
  F.pClip(FP.driveBolt, { blend: 0.03, speed: 0.7 });
  // (desde abajo, por delante: la garganta, bajo la jaula)
  F.follow(() => {
    const th = throat(G, new V3());
    return { pos: camSafe(g, th.clone(), th.clone().add(G.wd(-2.6, -3.4, 7.0, _v))), look: th.clone().add(_v2.set(0, 0.6, 0)), fov: 50 };
  });
  F.hand = 0.03;
  yield* F.wait(0.12);
  sinkBolt(X, 0.55);
  const th = throat(G, _v3).clone();
  a && a.play('fleshBurst', th, { k: 2.2 });
  a && a.play('boneCrack', th, { k: 1.6 });
  g.fx.blood.emit(th.x, th.y, th.z, 70, { color: BLACK, speed: 7, life: 1.6, up: 1, gravity: 9, dir: G.wd(0, -0.4, 1, _v) });
  g.camRig.shake(1.0);
  g.input.rumble(1, 1, 700);
  G.R.flinch.x.kick(-2.0);
  yield* F.wait(0.35);
  F.slow(1, 4);
}
// El virote, en la base del cuello, casi a plomo, con un buen trozo fuera:
// la cola, a la altura del pecho del jugador en la joroba (el mismo hueso que
// él: no se mueven el uno respecto del otro)
function restick(X) {
  const { G, bolt } = X;
  const B = G.M.byName.chest;
  const at = G.bp('chest', ...NAPE_BOLT.at, new V3());
  const dir = new V3(...NAPE_BOLT.dir).normalize().applyQuaternion(G.boneQ('chest', _q));
  bolt.stickTo(B, at, dir, NAPE_BOLT.depth);
  bolt.update(0);
}
// el virote, un palmo más adentro (en el espacio de su hueso)
function sinkBolt(X, d) {
  const s = X.bolt.stuck;
  if (!s) return;
  s.obj.updateWorldMatrix(true, false);
  const k = _s.setFromMatrixScale(s.obj.matrixWorld).x || 1;
  s.local.addScaledVector(_v.set(0, 0, 1).applyQuaternion(s.q), d / k);
}

// ---------------------------------------------------------------------
// 3. Se ahoga sin voz; las piernas no le sostienen: cae de rodillas al borde
// del cráter (la tierra salta) y el pecho se le abre como dos puertas: el
// núcleo, a la vista
function* fallKnees(X) {
  const { D, g, F, p, a, G } = X;
  G.stopAction(0.1);
  G.play('chokeKneel', { blend: 0.15 });
  a && a.play('choke', G.face(_v), { k: 2.2 });
  F.pClip(FP.brace, { blend: 0.1 });
  // (de lado y desde lo alto: se le doblan las piernas; detrás, el cráter y
  // la sangre negra)
  F.shot(camSafe(g, X.at(0, 7, 0), X.at(-19, 10.5, 7)), X.at(0, 8.5, -3), { fov: 58 });
  F.hand = 0.03;
  let knees = false,
    open = false;
  G.onEventHook = (e) => {
    if (e === 'knees' && !knees) {
      knees = true;
      const k = X.at(0, 0.2, 0.6);
      a && a.play('slam', k, { k: 2.4 });
      a && a.play('wallBreak', k, { k: 1.8 });
      a && a.play('explosion', k, { k: 1.2 });
      g.camRig.shake(1.3);
      g.input.rumble(1, 1, 900);
      D.debris.burst(k, 30, { speed: 9, up: 6, size: 0.8, spread: 3 });
      D.dust.ring(k, 18, { color: D.dustColor(k), r0: 3, speed: 11, size: 2.8, life: 5, grow: 1.8, alpha: 0.5 });
      D.puff(k.clone().setY(1.5), 6, { size: 3, spread: 3, speed: 2, up: 2, rise: 0.5, life: 6, grow: 1.3, alpha: 0.4 });
      // (el labio del cráter, a su espalda, se agrieta y se va dentro)
      for (let i = 0; i < 9; i++) {
        const q = X.at(rnd(-5, 5), rnd(0.3, 1), rnd(-6, -3));
        D.chunks.add({ mat: 'dirt', size: [rnd(0.7, 1.6), rnd(0.4, 0.9), rnd(0.7, 1.4)], pos: q, rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3((C0.x - q.x) * rnd(0.12, 0.3), rnd(1, 3), (C0.z - q.z) * rnd(0.12, 0.3)), spin: [rnd(-4, 4), rnd(-4, 4), rnd(-4, 4)], shatter: 99, life: 6, floor: SURF - 4, quiet: true });
      }
    }
    if (e === 'open' && !open) {
      open = true;
      G.coreBoost = 1;
      const c = coreAt(G, _v);
      a && a.play('fleshTear', c, { k: 2 });
      a && a.play('fleshBurst', c, { k: 1.4 });
      a && a.play('coreBeat', c, { k: 1.6 });
      g.fx.blood.emit(c.x, c.y, c.z, 40, { color: EMBER, speed: 5, life: 1.2, up: 1.5, gravity: 2 });
      g.fx.blood.emit(c.x, c.y, c.z, 30, { color: BLACK, speed: 4, life: 1.2, up: 1, gravity: 9 });
      g.flash = Math.max(g.flash || 0, 0.2);
      X.beat = heartbeat(X);
      F.also(X.beat.run());
    }
  };
  while (G.actT < 1.3) yield;
  // (de frente y desde abajo: el pecho que se abre, la luz del núcleo; arriba,
  // el jugador en la joroba)
  F.shot(camSafe(g, X.at(0, 9, 0), X.at(3.0, 1.6, 13.5)), X.at(0, 10.5, 1), { fov: 58 });
  F.hand = 0.02;
  while (G.actT < 2.5) yield;
  G.base('kneelOpen', { blend: 0.6 });
  G.onEventHook = null;
  yield* F.wait(0.4);
}
// el núcleo late a la vista (más deprisa cuanto más arde), hasta que muere
function heartbeat(X) {
  const { a, G } = X;
  const B = { stop: false };
  B.run = function* () {
    let t = 0;
    while (!B.stop && !G.coreDead) {
      t -= yield;
      if (t <= 0) {
        t = 0.95 - Math.min(0.5, G.coreBoost * 0.18);
        a && a.play('coreBeat', coreAt(G, _v3), { k: 1 + G.coreBoost * 0.25 });
      }
    }
  };
  return B;
}

// ---------------------------------------------------------------------
// 4. La izquierda viene a la nuca a por ti: ¡Salta! — por encima del hombro
// derecho, y de espaldas por la casulla abajo hasta el pecho abierto. La
// mano se cierra en el virote y se lo arranca
function* leapToChest(X) {
  const { g, F, p, a, G } = X;
  const arm = X.arm;
  G.play('kneelReach', { blend: 0.3 });
  // (la mano, a la nuca: la sigue)
  const reach = new V3();
  nape(G, reach).add(_v.set(0, 0.6, 0));
  arm.weight = 1;
  arm.toWorld(reach, 0.8, [8, 22, -4]);
  const tgt = arm.world;
  let ripped = false;
  F.also(
    (function* () {
      while (arm.world === tgt && !ripped) {
        yield;
        nape(G, tgt).add(_v.set(0, 0.6, 0));
      }
    })()
  );
  // (detrás del jugador, en la joroba: la mano que viene por su izquierda)
  const stand = newPose();
  F.attach = () => onBone(G, 'chest', NAPE_STAND, [0, 0, 1], null, 0.55, stand);
  F.pClip(FP.windStand, { blend: 0.2 });
  // (por detrás, a su izquierda y en alto: el jugador en la joroba y la mano
  // que le viene por encima del hombro)
  lagCam(F, () => G.wp(7.0, 19.5, -6.5, new V3()), () => G.M.byName.handL.getWorldPosition(new V3()).lerp(p.pos, 0.65).add(_v.set(0, 0.5, 0)), { rate: 4, fov: 46 });
  F.hand = 0.05;
  while (G.actT < 0.5) yield;
  a && a.play('choke', G.face(_v), { k: 1.6 });
  const ok = yield* F.prompt({ action: 'dodge', label: '¡Salta!', window: 0.9, slow: 0.25 });
  // por encima del hombro derecho, y abajo por la casulla
  const path = bodyPath(G, [
    { bone: 'chest', p: NAPE_STAND, fwd: [0, 0, 1], upright: 0.55 },
    { bone: 'clavR', p: [-1.75, 15.25, -0.45], fwd: [0, 0, 1], upright: 0.5, arc: 1.1 },
    { bone: 'chest', p: [-0.85, 14.3, 1.3], fwd: [0, -1, 0.3], up: [0, 0.35, 1], upright: 0.1 },
    { bone: 'chest', p: [-0.3, 13.55, 1.45], fwd: [0, -1, 0.15], up: [0, 0.2, 1], upright: 0.1 },
    { bone: 'chest', p: CORE_GRIP, fwd: [0, 0, -1], upright: 0.85, arc: 0.15 },
  ]);
  let u = 0;
  F.attach = () => path(u);
  if (ok) {
    F.pClip('leap', { blend: 0.05 });
    a && a.play('leapWind', p.pos, { k: 1.2 });
  } else {
    // (le alcanza un dedo: sale rodando por el hombro)
    F.hurt(22, null, { shake: 1, heavy: true });
    F.pClip(FP.fall, { blend: 0.05 });
  }
  // (de lado, a su derecha y un poco por delante: el salto, el resbalón por
  // el pecho)
  lagCam(F, () => camSafe(g, p.pos.clone(), p.pos.clone().add(G.wd(-5.2, 0.6, 4.4, _v))), () => p.pos.clone().add(_v.set(0, 0.7, 0)), { rate: 6, fov: 58 });
  F.hand = 0.05;
  let slid = false;
  while (u < 4) {
    const dt = yield;
    u = Math.min(4, u + dt * (u < 1 ? 2.1 : u < 3 ? 1.5 : 2.6));
    if (!slid && u >= 1) {
      slid = true;
      F.pClip(FP.slideDown, { blend: 0.08 });
      a && a.play('scrape', p.pos, { k: 1.2 });
    }
    if (!ripped && G.actT >= 1.0) {
      ripped = true;
      ripBolt(X);
    }
  }
  // (se agarra al nido del corazón, colgado delante de él)
  F.pClip(FP.cage, { blend: 0.06 });
  a && a.play('land', p.pos);
  a && a.play('fleshTear', p.pos, { k: 0.9 });
  g.camRig.shake(0.4);
  if (!ripped) {
    ripped = true;
    ripBolt(X);
  }
  F.attach = () => onBone(G, 'chest', CORE_GRIP, [0, 0, -1], null, 0.85, stand);
  // (por delante del pecho abierto, a su derecha: el jugador colgado ante el
  // núcleo, que le alumbra)
  lagCam(F, () => G.bp('chest', -2.3, 12.6, 5.6, new V3()), () => p.pos.clone().add(_v.set(0, 1.1, 0)).lerp(coreAt(G, _v2), 0.3), { rate: 4, fov: 52 });
  F.hand = 0.03;
  yield* F.wait(0.9);
  arm.weight = 1;
}
// se arranca el virote de la nuca y lo tira (al cráter)
function ripBolt(X) {
  const { g, F, a, G, bolt } = X;
  const nk = nape(G, new V3());
  a && a.play('fleshTear', nk, { k: 2 });
  a && a.play('choke', G.face(_v), { k: 2 });
  g.fx.blood.emit(nk.x, nk.y, nk.z, 70, { color: BLACK, speed: 6, life: 1.6, up: 3, gravity: 9 });
  // (el brazo, arriba y atrás: lo tira)
  X.arm.to({ w: [9.5, 19.5, -4.5], pole: [12, 16, -2] }, 0.6);
  if (!bolt.stuck) return;
  bolt.mesh.updateWorldMatrix(true, false);
  const q = bolt.mesh.getWorldQuaternion(new THREE.Quaternion());
  const along = new V3(0, 0, 1).applyQuaternion(q);
  bolt.stuck = null;
  bolt.done = true;
  const pos = bolt.mesh.position.clone().addScaledVector(along, -0.6);
  const vel = new V3(C0.x - pos.x, 0, C0.z - pos.z).normalize().multiplyScalar(9).add(_v.set(0, 9, 0));
  const spin = new V3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize();
  F.also(
    (function* () {
      let t = 0;
      while (t < 6) {
        const dt = yield;
        t += dt;
        vel.y -= 9.8 * dt;
        pos.addScaledVector(vel, dt);
        bolt.mesh.position.copy(pos);
        bolt.mesh.quaternion.premultiply(_q2.setFromAxisAngle(spin, dt * 9));
        if (Math.random() < dt * 30) g.fx.blood.emit(pos.x, pos.y, pos.z, 2, { color: BLACK, speed: 0.5, life: 0.8, up: 0 });
        const gy = Math.hypot(pos.x - C0.x, pos.z - C0.z) < 11 ? SURF : 0;
        if (pos.y < gy + 0.2) {
          g.fx.blood.emit(pos.x, gy + 0.2, pos.z, 20, { color: gy < 0 ? BLACK : [0.36, 0.33, 0.29], speed: 3, life: 0.8, up: 2, gravity: 9 });
          if (gy < 0) bolt.mesh.visible = false;
          break;
        }
      }
    })()
  );
}

// Junta las dos manos contra su pecho para aplastarte dentro: ¡Esquiva!
// (adentro, entre las costillas: las garras se le clavan a él)
function* crush(X) {
  const { g, F, p, a, G } = X;
  const arm = X.arm;
  G.play('crushChest', { blend: 0.3 });
  // las manos (la izquierda con el brazo del guion; la derecha, por IK): de
  // fuera, abiertas, y de golpe contra el pecho
  const hand = { k: 0 };
  const tL = new V3(),
    tR = new V3(),
    poleR = new V3();
  const handAt = (s, out) => {
    const k = hand.k;
    return G.bp('chest', s * lerp(4.4, 1.25, k), lerp(13.4, 12.2, k), lerp(4.6, 2.95, k), out);
  };
  handAt(1, tL);
  arm.weight = 1;
  arm.toWorld(tL, 0.5, [12, 8, 3]);
  const wL = arm.world;
  let hold = true;
  F.also(
    (function* () {
      while (hold) {
        yield;
        handAt(1, wL);
        handAt(-1, tR);
        G.wp(-12, 8, 3, poleR);
        G.reachHand('R', tR, poleR, Math.min(1, G.actT / 0.3), { stretch: 1.15 });
      }
      G.freeHand('R');
    })()
  );
  const grip = newPose(),
    hang = newPose(),
    mid = newPose();
  F.attach = () => onBone(G, 'chest', CORE_GRIP, [0, 0, -1], null, 0.85, grip);
  // (de frente, a su derecha y algo por encima: el jugador colgado ante el
  // núcleo y las dos manos que vienen, una por cada lado)
  F.shot(camSafe(g, G.chest(new V3()), X.at(-6.5, 11.5, 12)), G.chest(new V3()).add(_v.set(0, -0.8, 0)), { fov: 54 });
  F.hand = 0.04;
  while (G.actT < 0.42) yield;
  const ok = yield* F.prompt({ action: 'dodge', label: '¡Esquiva!', window: 0.75, slow: 0.22 });
  // (se suelta y se deja caer hasta el borde de abajo del hueco, y se queda
  // colgado de él: las manos se cierran donde estaba)
  let k = 0,
    hung = false;
  if (ok) {
    F.pClip(FP.fall, { blend: 0.05 });
    F.attach = () => {
      onBone(G, 'chest', CORE_GRIP, [0, 0, -1], null, 0.85, grip);
      onBone(G, 'chest', LEDGE_HANG, [0, 0, -1], null, 0.9, hang);
      return mixPose(grip, hang, k * k, 0, mid);
    };
  }
  let crushed = false;
  while (G.actT < 1.3) {
    const dt = yield;
    k = Math.min(1, k + dt * 3.2);
    if (ok && !hung && k >= 1) {
      hung = true;
      F.pClip('hang', { blend: 0.05 });
      a && a.play('land', p.pos);
      g.camRig.shake(0.3);
    }
    hand.k = sm(clamp((G.actT - 0.55) / 0.3, 0, 1)) * (1 - sm(clamp((G.actT - 1.05) / 0.25, 0, 1)) * 0.55);
    if (!crushed && G.actT >= 0.85) {
      crushed = true;
      const c = G.chest(_v).clone();
      a && a.play('boneCrack', c, { k: 2 });
      a && a.play('fleshBurst', c, { k: 1.8 });
      a && a.play('choke', G.face(_v2), { k: 2 });
      for (const s of [1, -1]) {
        const h = G.bp('chest', 1.3 * s, 12.2, 2.6, _v2);
        g.fx.blood.emit(h.x, h.y, h.z, 40, { color: BLACK, speed: 5, life: 1.4, up: 1.5, gravity: 9 });
      }
      g.camRig.shake(1.1);
      g.input.rumble(1, 1, 600);
      if (!ok) {
        // (le pilla una garra: se queda agarrado, a duras penas)
        F.hurt(24, null, { shake: 1, heavy: true });
        F.pClip(FP.brace, { blend: 0.05 });
      }
      // (de fuera, a su izquierda: las garras clavadas en su propio pecho y,
      // debajo, el jugador colgado)
      F.shot(camSafe(g, G.chest(new V3()), X.at(5.0, 5.5, 11.0)), G.chest(new V3()).add(_v.set(0, -1.6, 0)), { fov: 52 });
      F.hand = 0.05;
    }
  }
  // (las manos se apartan, temblando; y sube otra vez al nido)
  arm.to({ w: [5.6, 7.5, 5.0], pole: [11, 9, 2] }, 0.6);
  hold = false;
  if (ok) {
    F.pClip('climbUp', { blend: 0.08 });
    a && a.play('climb', p.pos);
    let kb = 0;
    F.attach = () => {
      onBone(G, 'chest', LEDGE_HANG, [0, 0, -1], null, 0.9, hang);
      onBone(G, 'chest', CORE_GRIP, [0, 0, -1], null, 0.85, grip);
      return mixPose(hang, grip, sm(kb), 0.2, mid);
    };
    while (kb < 1) {
      const dt = yield;
      kb = Math.min(1, kb + dt * 1.3);
    }
  }
  F.pClip(FP.cage, { blend: 0.15 });
  F.attach = () => onBone(G, 'chest', CORE_GRIP, [0, 0, -1], null, 0.85, grip);
}

// ---------------------------------------------------------------------
// 5. ¡Apuñala! el corazón: una estocada por pulsación (se arquea, y el núcleo
// arde más a cada una)
function* stabHeart(X) {
  const { g, F, p, a, G } = X;
  X.arm.weight = 0;
  const spot = newPose(),
    spotIn = newPose(),
    mid = newPose();
  let lunge = 0;
  F.attach = () => {
    onBone(G, 'chest', CORE_GRIP, [0, 0, -1], null, 0.85, spot);
    if (!lunge) return spot;
    onBone(G, 'chest', [CORE_GRIP[0], CORE_GRIP[1] + 0.2, CORE_GRIP[2] - 0.45], [0, 0, -1], null, 0.85, spotIn);
    return mixPose(spot, spotIn, lunge, 0, mid);
  };
  G.base('kneelOpen', { blend: 0.4 });
  // (de cerca, por delante del pecho y a su derecha: el jugador contra el
  // núcleo, de tres cuartos)
  const close = () => lagCam(F, () => G.bp('chest', -2.3, 12.4, 5.4, new V3()), () => p.pos.clone().add(_v.set(0, 1.0, 0)).lerp(coreAt(G, _v2), 0.35), { rate: 5, fov: 50 });
  // (de frente, desde el suelo: él, arqueándose, con la luz que le sale del
  // pecho)
  const wide = () => F.shot(camSafe(g, X.at(0, 9, 0), X.at(2.0, 1.8, 16)), X.at(0, 10, 0), { fov: 50 });
  close();
  F.hand = 0.04;
  const ok = yield* mash(X, { action: 'light', label: '¡Apuñala!', window: 3.2, mash: 6, slow: 0.55, every: 0.34 }, (i) => {
    F.pClip(FP.stabCage, { blend: 0.03 });
    G.play('heartHit', { blend: 0.05 });
    G.coreBoost = Math.min(2.2, G.coreBoost + 0.2);
    const c = coreAt(G, _v);
    a && a.play('thrust', c, { k: 1.8 });
    a && a.play('fleshBurst', c, { k: 1.1 });
    // (sin voz: la garganta atravesada; estertores)
    if (i % 2) a && a.play('choke', G.face(_v2), { k: 1.4 });
    g.fx.blood.emit(c.x, c.y, c.z, 30, { color: EMBER, speed: 6, life: 1, up: 1, gravity: 2, dir: G.wd(0, 0.2, 1, _v2) });
    g.fx.blood.emit(c.x, c.y, c.z, 18, { color: BLACK, speed: 4, life: 1.2, up: 1, gravity: 9 });
    g.flash = Math.max(g.flash || 0, 0.1);
    g.camRig.shake(0.5);
    g.input.rumble(0.8, 1, 200);
    if (i === 3) wide();
    if (i === 5) close();
  });
  if (!ok) {
    // (el núcleo le escupe brasas a la cara; vuelve a por él)
    F.hurt(16, null, { shake: 0.6 });
    a && a.play('burn', p.pos);
  }
  // la última: se impulsa con los pies contra su pecho, la espada alzada a dos
  // manos, y adentro hasta la empuñadura
  F.slow(0.32, 6);
  F.pClip(FP.stabCoreEnd, { blend: 0.08 });
  // (de frente y desde abajo, a su izquierda: el jugador con la espada en
  // alto, contra el núcleo que se pone blanco)
  lagCam(F, () => G.bp('chest', 1.4, 9.4, 6.6, new V3()), () => p.pos.clone().add(_v.set(0, 1.6, 0)).lerp(coreAt(G, _v2), 0.2), { rate: 5, fov: 52 });
  F.hand = 0.02;
  a && a.stopMusic();
  let t = 0;
  while (t < 0.75) {
    const dt = yield;
    t += dt;
    G.coreBoost = lerp(2.2, 3.4, clamp(t / 0.75, 0, 1));
    lunge = sm(clamp((t - 0.55) / 0.2, 0, 1));
  }
}

// El corazón revienta: la luz, la onda, el silencio; el jugador sale
// despedido del pecho y cae rodando delante de él
function* burst(X) {
  const { D, g, F, p, a, G } = X;
  const c = coreAt(G, new V3());
  if (X.beat) X.beat.stop = true;
  G.play('coreDeath', { blend: 0.04 });
  a && a.play('coreBurst', c, { k: 2.6 });
  a && a.play('explosion', c, { k: 2 });
  a && a.play('fleshBurst', c, { k: 2.4 });
  g.flash = 1;
  g.camRig.shake(2.0);
  g.input.rumble(1, 1, 1600);
  for (let i = 0; i < 5; i++) g.fx.blood.emit(c.x, c.y, c.z, 70, { color: i % 2 ? WHITE : EMBER, speed: 13 + i * 2, life: 2.2, up: 2, gravity: 2.5 });
  g.fx.blood.emit(c.x, c.y, c.z, 80, { color: BLACK, speed: 9, life: 1.8, up: 3, gravity: 9 });
  const k0 = X.at(0, 0.3, 1);
  D.dust.ring(k0, 26, { color: D.dustColor(k0), r0: 4, speed: 15, size: 3.2, life: 6, grow: 2, alpha: 0.5 });
  D.debris.burst(k0, 30, { speed: 12, up: 6, size: 0.9, spread: 4 });
  // (el fogonazo: el brillo del núcleo, enorme un instante, y una bola de luz
  // que crece y se apaga)
  G.coreBoost = 14;
  F.also(flashBall(X, c));
  // los ojos y los cirios se apagan, uno tras otro; la carne que ardía, despacio
  F.also(
    (function* () {
      yield* F.wait(0.18);
      G.coreDead = true;
      G.coreBoost = 0;
      for (const e of G.eyes) e.visible = false;
      const fl = G.fx.flames.filter((f) => f.sp.visible);
      for (let i = fl.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fl[i], fl[j]] = [fl[j], fl[i]];
      }
      for (const f of fl) {
        yield* F.wait(rnd(0.06, 0.2));
        f.sp.visible = false;
        f.sp.getWorldPosition(_v);
        g.fx.blood.emit(_v.x, _v.y + 0.2, _v.z, 6, { color: STEAM, speed: 0.6, life: 2, up: 1.2, gravity: -0.4 });
      }
      G.lightsOut(false);
      G.coreDead = true;
    })()
  );
  // sale despedido: hacia delante y arriba, dando vueltas
  F.slow(0.45, 8);
  const fw = G.forward(new V3());
  const pos = p.pos.clone().addScaledVector(fw, 0.6);
  const vel = fw.clone().multiplyScalar(7.5).add(_v.set(0, 5.5, 0));
  const side = new V3(fw.z, 0, -fw.x);
  const yaw = Math.atan2(-fw.x, -fw.z);
  const spinQ = new THREE.Quaternion(),
    baseQ = new THREE.Quaternion().setFromAxisAngle(_Y, yaw);
  let ang = 0;
  F.pClip(FP.fly, { blend: 0.05 });
  F.attach = () => ({ pos, yaw: 0, tilt: spinQ.setFromAxisAngle(side, ang).multiply(baseQ) });
  // (desde el suelo, por delante y bajo: el pecho que revienta de luz)
  F.shot(camSafe(g, X.at(0, 6, 0), X.at(-3.5, 1.2, 25.5)), X.at(0, 8.5, 2), { fov: 52 });
  F.hand = 0.05;
  let t = 0,
    track = false;
  const gy = () => g.world.col.groundHeight(pos.x, pos.z, 0.2, pos.y + 1, true);
  while (t < 4) {
    const dt = yield;
    t += dt;
    if (t > 0.5) F.slow(1, 1.5);
    // (y de lado, con él por el aire: el gigante apagado detrás)
    if (!track && t > 0.55) {
      track = true;
      lagCam(F, () => pos.clone().addScaledVector(side, -4.8).addScaledVector(fw, 3.5).setY(Math.max(1.2, pos.y + 0.4)), () => pos.clone().lerp(G.chest(_v2), 0.2), { rate: 3.5, fov: 60 });
    }
    vel.y -= 9.8 * dt;
    pos.addScaledVector(vel, dt);
    ang -= dt * 5.5;
    if (vel.y < 0 && pos.y <= gy()) break;
  }
  // (cae de espaldas y rueda)
  pos.y = gy();
  ang = 0;
  F.pClip('fallBack', { blend: 0.05 });
  a && a.play('land', pos);
  a && a.play('hitHeavy', pos);
  a && a.play('playerHurt', pos);
  F.hurt(6, null, { shake: 0.7, blood: false, flash: 0.3 });
  D.puff(pos.clone().setY(pos.y + 0.3), 3, { size: 1.6, speed: 2, up: 0.5, life: 3, grow: 1.2, alpha: 0.4 });
  const slide = fw.clone().multiplyScalar(3.2);
  const lie = new THREE.Quaternion().setFromAxisAngle(_Y, yaw);
  F.attach = () => ({ pos, yaw: 0, tilt: lie });
  t = 0;
  while (t < 0.6) {
    const dt = yield;
    t += dt;
    const k = Math.max(0, 1 - t / 0.6);
    pos.addScaledVector(slide, dt * k * 1.6);
    pos.y = gy();
  }
  X.land = pos.clone();
  X.landYaw = yaw;
}

// la bola de luz del corazón que revienta: crece de golpe y se apaga
function* flashBall(X, at) {
  const { g, G } = X;
  const m = G.coreGlow.material.clone();
  m.color.setRGB(1, 0.85, 0.6);
  const sp = new THREE.Sprite(m);
  sp.position.copy(at);
  g.scene.add(sp);
  let t = 0;
  while (t < 0.9) {
    const dt = yield;
    t += dt;
    const k = clamp(t / 0.9, 0, 1);
    const s = 4 + 56 * Math.sqrt(k);
    sp.scale.set(s, s, 1);
    m.opacity = (1 - k) * (1 - k);
  }
  g.scene.remove(sp);
  m.dispose();
}

// ---------------------------------------------------------------------
// 6. Muerto, de rodillas: la cabeza cae, los brazos cuelgan; y se va de
// espaldas al cráter. La sangre negra se lo traga
function* deadFall(X) {
  const { D, g, F, p, a, G } = X;
  const P = X.land;
  // (a ras del suelo, junto al jugador tirado: él, apagado, de rodillas)
  const toG = _v.subVectors(X.K, P).setY(0).normalize().clone();
  const sideP = new V3(toG.z, 0, -toG.x);
  F.shot(camSafe(g, P.clone().setY(P.y + 1), P.clone().addScaledVector(toG, -2.4).addScaledVector(sideP, 1.3).setY(P.y + 0.75)), X.at(0, 8.5, 0), { fov: 50 });
  F.hand = 0.02;
  while (!G.actDone && G.actT < 2.9) yield;
  F.pClip('getup', { blend: 0.15 });
  yield* F.wait(0.6);
  // de espaldas, al cráter
  G.play('deadFall', { blend: 0.35 });
  a && a.play('stoneCreak', X.at(0, 1, -2), { k: 2 });
  const back = new V3(-Math.sin(X.yawK), 0, -Math.cos(X.yawK));
  const P0 = G.pos.clone();
  G.fixY = P0.y;
  // (de lado y desde lo alto: cae de espaldas al cráter, a la sangre negra)
  F.shot(camSafe(g, X.at(0, 6, -6), X.at(-18, 15, 1)), X.at(0, -2, -9), { fov: 58 });
  F.hand = 0.03;
  let t = 0,
    splashed = false;
  while (t < 2.3) {
    const dt = yield;
    t += dt;
    const k = clamp(t / 2.1, 0, 1);
    G.pitch = -1.9 * easeIn(k);
    G.pos.copy(P0).addScaledVector(back, 3.8 * k * k);
    G.fixY = P0.y - 3.2 * k * k;
    if (!splashed && k > 0.82) {
      splashed = true;
      const s = X.at(0, 0, -11).setY(SURF);
      a && a.play('explosion', s, { k: 2.4 });
      a && a.play('fleshBurst', s, { k: 2.4 });
      g.camRig.shake(1.6);
      g.input.rumble(1, 1, 1300);
      for (let i = 0; i < 4; i++) g.fx.blood.emit(s.x + rnd(-5, 5), SURF + 0.5, s.z + rnd(-5, 5), 80, { color: BLACK, speed: 9, life: 2.2, up: 7, gravity: 9 });
      g.fx.blood.emit(s.x, SURF + 1, s.z, 120, { color: STEAM, speed: 4, life: 3.4, up: 3, gravity: -0.5 });
      // (el labio del cráter, con él: se desmorona y se va dentro)
      const e = X.at(0, 0.5, -3);
      D.debris.burst(e, 40, { speed: 8, up: 5, size: 1.0, spread: 4 });
      D.dust.ring(e, 18, { color: D.dustColor(e), r0: 3, speed: 9, size: 2.8, life: 5.5, grow: 1.8, alpha: 0.5 });
      for (let i = 0; i < 12; i++) {
        const q = X.at(rnd(-5, 5), rnd(0.2, 1.2), rnd(-6, 1));
        D.chunks.add({ mat: 'dirt', size: [rnd(0.8, 1.8), rnd(0.5, 1), rnd(0.8, 1.6)], pos: q, rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3((C0.x - q.x) * rnd(0.15, 0.35), rnd(1, 4), (C0.z - q.z) * rnd(0.15, 0.35)), spin: [rnd(-4, 4), rnd(-4, 4), rnd(-4, 4)], shatter: 99, life: 6, floor: SURF - 4, quiet: true });
      }
    }
  }
  // se hunde; la tierra del borde le cae encima
  p.anim.stop(0.4);
  F.setP(P.x, P.y, P.z, Math.atan2(C0.x - P.x, C0.z - P.z));
  F.attach = null;
  F.tilt.identity();
  // (desde lo alto del borde: el cráter, la sangre negra que se lo traga)
  F.shot(camSafe(g, X.at(0, 4, -8), X.at(-13, 14, -1)), X.at(0, -4, -10), { fov: 58 });
  F.hand = 0.02;
  t = 0;
  const y0 = G.fixY,
    pt0 = G.pitch;
  while (t < 6.5) {
    const dt = yield;
    t += dt;
    const k = sm(clamp(t / 6.5, 0, 1));
    G.fixY = y0 - 11 * k;
    G.pitch = pt0 - 0.2 * k;
    if (Math.random() < dt * 3) {
      const ang = rnd(0, Math.PI * 2),
        r = rnd(9.5, 11.5);
      const x = C0.x + Math.cos(ang) * r,
        z = C0.z + Math.sin(ang) * r;
      D.chunks.add({ mat: 'dirt', size: [rnd(0.8, 1.6), rnd(0.4, 0.8), rnd(0.8, 1.4)], pos: new V3(x, 0.6, z), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3((C0.x - x) * 0.3, rnd(0, 2), (C0.z - z) * 0.3), spin: [rnd(-3, 3), rnd(-3, 3), rnd(-3, 3)], shatter: 99, life: 4, floor: SURF - 3, quiet: true });
    }
    if (Math.random() < dt * 6) {
      const b = X.at(rnd(-4, 4), 0, rnd(-14, -4)).setY(SURF + 0.2);
      g.fx.blood.emit(b.x, b.y, b.z, 4, { color: BLACK, speed: 1.5, life: 1, up: 1.5, gravity: 9 });
    }
  }
  G.show(false);
}

// Amanece: el jugador en el borde del cráter que humea; y el final de siempre
function* dawn(X) {
  const { D, g, F, p } = X;
  g.atmo.override = { fog: 0xc8a08a, density: 0.009, far: 420, sky: 0xffd6b8, ground: 0x5a4a3a, hemi: 2.6, moon: 3.0, moonColor: 0xffa860, moonPos: [10, 14, -80], vol: 0.03, ash: 0, exposure: 1.05, sat: 0.95, bloom: 1.1 };
  D.heroK = 0;
  F.keyLight(0);
  const W = X.land.clone();
  const dW = new V3().subVectors(C0, W).setY(0).normalize();
  F.setP(W.x, W.y, W.z, Math.atan2(dW.x, dW.z));
  p.anim.stop(0.4);
  // (desde el sur y bajo: él, a contraluz del sol que sale al norte, con el
  // cráter que humea a un lado)
  F.shot(camSafe(g, W.clone().setY(W.y + 1.2), W.clone().add(new V3(1.6, 0.7, 5.2))), W.clone().add(new V3(0.6, 1.6, -4)), { fov: 38 });
  yield* F.wait(2.6);
  // (por encima de su hombro: el cráter que humea, el campo, el río)
  F.shot(camSafe(g, W.clone().setY(W.y + 1.5), W.clone().addScaledVector(dW, -3.4).add(new V3(dW.z * 1.6, 2.4, -dW.x * 1.6))), C0.clone().setY(0.5), { fov: 52 });
  yield* F.wait(2.8);
  // fundido; y en el río, al amanecer, el final de siempre
  g.fadeTarget = 0;
  yield* F.wait(1.8);
  F.cinema(false, { instant: true });
  F.puppet(false);
  F.attach = null;
  g.atmo.override = null;
  F.setP(0, 0, -198.4, Math.PI);
  F.release(Math.PI, 0.12);
  D.endFilm();
  g.fadeTarget = 1;
  g.ending();
}
