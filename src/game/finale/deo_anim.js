// Animaciones de Deo Ignoto.
//
// Su reposo es la pose del modelo (los brazos de delante agarran las torres,
// los de los lados aplastan los tejados, los de atrás se alzan al cielo), así
// que las claves sólo guardan cuánto se aparta cada hueso de ella. Todo es
// lento y pesado: mide noventa metros con las manos alzadas.
//
// Lo que tiene que tocar un sitio concreto de la ciudad (la mano que golpea
// la plaza y se queda plantada para que la trepes, la que rastrilla los
// tejados, las de delante cuando suelta las torres y se apoya en la plaza)
// lo lleva DeoArms con cinemática inversa encima de las claves.
//
// Brazos: 0 frenteL, 1 frenteR, 2 ladoL, 3 ladoR, 4 altoL, 5 altoR.
import * as THREE from 'three';
import { clip } from '../../entities/rig.js';
import { ColossusRig, noise1 } from './colossus_rig.js';
import { DEO_ARMS, handFrame } from '../../entities/colossus/deo_skeleton.js';

const DEG = Math.PI / 180;
export const ARM = { frenteL: 0, frenteR: 1, ladoL: 2, ladoR: 3, altoL: 4, altoR: 5 };

// marcos de las manos en reposo: los dedos se cierran girando alrededor de
// 'side' (hacia la palma) y se abren girando alrededor de la normal de la palma
const FRAMES = DEO_ARMS.map((a) => {
  const f = handFrame(a);
  return { dir: f.dir, side: f.side, pn: f.pn, dors: f.pn.clone().negate(), W: f.W, Hd: f.Hd, palm: f.Hd.distanceTo(f.W) };
});
const UPW = new THREE.Vector3(0, 1, 0);
const _q = new THREE.Quaternion(),
  _q2 = new THREE.Quaternion(),
  _e = new THREE.Euler(),
  _m = new THREE.Matrix4();
const _v = new THREE.Vector3(),
  _v2 = new THREE.Vector3(),
  _v3 = new THREE.Vector3();

// grados de Euler (XYZ) de un giro de 'deg' alrededor de 'axis' (y luego otro)
function axisDeg(axis, deg, axis2 = null, deg2 = 0) {
  _q.setFromAxisAngle(axis, deg * DEG);
  if (axis2 && deg2) _q.multiply(_q2.setFromAxisAngle(axis2, deg2 * DEG));
  _e.setFromQuaternion(_q, 'XYZ');
  return [_e.x / DEG, _e.y / DEG, _e.z / DEG];
}
// los dedos del brazo i: curl (grados, hacia la palma; negativo los abre de
// más) y spread (grados de abanico entre dedo y dedo)
export function fing(i, curl, spread = 0) {
  const F = FRAMES[i];
  const o = {};
  for (let f = 0; f < 5; f++) {
    const fan = f === 4 ? -spread * 1.4 : (f - 1.5) * spread;
    o[`a${i}f${f}`] = axisDeg(F.side, curl * (f === 4 ? 0.6 : 0.7), F.pn, fan);
    o[`a${i}f${f}b`] = axisDeg(F.side, curl * (f === 4 ? 0.7 : 1.0));
  }
  return o;
}
const K = (t, o = {}, ease, k) => [t, o, ease, k ? { k } : undefined];
const ALL = (fn) => Object.assign({}, ...[0, 1, 2, 3, 4, 5].map(fn));

export const DEO_CLIPS = {};
const C = DEO_CLIPS;

// ------------------------------------------------------------ reposo
// respira (el pecho sube y baja, el cuerpo se mece), los brazos alzados se
// balancean despacio y los dedos de los tejados tamborilean
C.idle = clip(
  'idle',
  9,
  [
    K(0, { ...ALL((i) => fing(i, 0)) }),
    K(2.4, { body: [1.2, 0.6, 0.4], chest: [1.6, -1.2, 0.5], neck: [-1, 2, 0], head: [1.5, 2.5, -1], jaw: [4, 0, 0], a4s: [2, 0, 3], a5s: [1.5, 0, -2], a4e: [-3, 0, 0], a5e: [-2, 0, 0], a2w: [-3, 0, 0], ...fing(2, 8), ...fing(3, -4), ...fing(0, 4), ...fing(1, 3), ...fing(4, 6, 2), ...fing(5, 3, 1) }),
    K(4.8, { body: [-0.6, -0.4, -0.3], chest: [-1, 1, -0.4], neck: [1, -1.5, 0], head: [-1, -2.5, 1], jaw: [1, 0, 0], a4s: [-1, 0, -2], a5s: [-1.5, 0, 2.5], a4e: [2, 0, 0], a5e: [3, 0, 0], a3w: [-3, 0, 0], ...fing(2, -3), ...fing(3, 9), ...fing(0, 1), ...fing(1, 5), ...fing(4, -4, -1), ...fing(5, 5, 2) }),
    K(7.0, { body: [0.8, 0.2, 0], chest: [1, 0.4, 0], head: [0.5, 1, 0], jaw: [3, 0, 0], a4s: [1, 0, 1], a5s: [0.5, 0, -1], ...fing(2, 4), ...fing(3, 2), ...fing(0, 3), ...fing(1, 2), ...fing(4, 2), ...fing(5, -2) }),
    K(9, { ...ALL((i) => fing(i, 0)) }),
  ],
  { loop: true, ground: false }
);

// rugido: se recoge, echa la máscara atrás, abre la boca y los brazos alzados
// se abren con las manos extendidas; los de delante estrujan las torres
C.roar = clip(
  'roar',
  5.2,
  [
    K(0, { ...ALL((i) => fing(i, 0)) }),
    K(1.3, { body: [5, 0, 0], chest: [6, 0, 0], neck: [8, 0, 0], head: [10, 0, 0], jaw: [-2, 0, 0], a4s: [10, 0, -8], a5s: [10, 0, 8], a4e: [8, 0, 0], a5e: [8, 0, 0], ...fing(4, 45), ...fing(5, 45), ...fing(0, 10), ...fing(1, 10), ...fing(2, 6), ...fing(3, 6) }, 'hold'),
    K(1.9, { body: [-7, 0, 0], chest: [-9, 0, 0], neck: [-12, 0, 0], head: [-16, 0, 0], jaw: [34, 0, 0], a4s: [-14, 0, 14], a5s: [-14, 0, -14], a4e: [-10, 0, 0], a5e: [-10, 0, 0], a2s: [0, 0, 5], a3s: [0, 0, -5], ...fing(4, -22, 10), ...fing(5, -22, 10), ...fing(0, 26), ...fing(1, 26), ...fing(2, -10, 6), ...fing(3, -10, 6) }, 'snap'),
    K(3.9, { body: [-6, 0, 0], chest: [-8, 0, 0], neck: [-10, 0, 0], head: [-14, 0, 0], jaw: [30, 0, 0], a4s: [-12, 0, 12], a5s: [-12, 0, -12], a4e: [-8, 0, 0], a5e: [-8, 0, 0], a2s: [0, 0, 4], a3s: [0, 0, -4], ...fing(4, -18, 9), ...fing(5, -18, 9), ...fing(0, 22), ...fing(1, 22), ...fing(2, -8, 5), ...fing(3, -8, 5) }),
    K(5.2, { ...ALL((i) => fing(i, 0)) }),
  ],
  { ground: false, events: [{ t: 1.9, name: 'roar' }] }
);

// herido (le clavas la espada en un sigilo): el cuerpo da un respingo
C.hurt = clip(
  'hurt',
  2.4,
  [
    K(0, { chest: [-5, 4, 0], neck: [-8, 0, 0], head: [-12, 6, 0], jaw: [26, 0, 0], body: [-2, 0, 0] }, 'snap'),
    K(0.9, { chest: [3, -3, 0], neck: [4, 0, 0], head: [6, -4, 0], jaw: [18, 0, 0], body: [1.5, 0, 0] }),
    K(2.4, {}),
  ],
  { ground: false }
);

// ------------------------------------------------------------ brotar
// Sale de la cisterna reventando la nave: primero la cabeza encorvada y los
// brazos alzados (que salen disparados al cielo), luego los de los lados se
// abren y caen sobre los tejados, los de delante agarran las torres y al
// final se yergue y ruge. 'root' (cm) sube el cuerpo desde 60 m bajo tierra.
{
  const tuck = {
    body: [22, 0, 0],
    chest: [14, 0, 0],
    neck: [22, 0, 0],
    head: [24, 0, 0],
    a4s: [0, 0, 34],
    a5s: [0, 0, -34],
    a4e: [24, 0, 18],
    a5e: [24, 0, -18],
    a2s: [0, 0, -72],
    a3s: [0, 0, 72],
    a2e: [0, 0, 30],
    a3e: [0, 0, -30],
    a0s: [34, 0, -36],
    a1s: [34, 0, 36],
    a0e: [30, 0, 0],
    a1e: [30, 0, 0],
    ...ALL((i) => fing(i, 55)),
  };
  const armsUp = { ...tuck, a4s: [-10, 0, -4], a5s: [-10, 0, 4], a4e: [-6, 0, 0], a5e: [-6, 0, 0], ...fing(4, -20, 10), ...fing(5, -20, 10) };
  const sides = { ...armsUp, a4s: [0, 0, 0], a5s: [0, 0, 0], a4e: [0, 0, 0], a5e: [0, 0, 0], ...fing(4, 0), ...fing(5, 0), a2s: [0, 0, 6], a3s: [0, 0, -6], a2e: [0, 0, 0], a3e: [0, 0, 0], ...fing(2, -12, 8), ...fing(3, -12, 8) };
  const reach = { ...sides, a2s: [0, 0, 0], a3s: [0, 0, 0], ...fing(2, 0), ...fing(3, 0), a0s: [-8, 0, 8], a1s: [-8, 0, -8], a0e: [-6, 0, 0], a1e: [-6, 0, 0], ...fing(0, -25, 10), ...fing(1, -25, 10), body: [14, 0, 0], chest: [8, 0, 0], neck: [14, 0, 0], head: [16, 0, 0] };
  const grip = { ...reach, a0s: [0, 0, 0], a1s: [0, 0, 0], a0e: [0, 0, 0], a1e: [0, 0, 0], ...fing(0, 8), ...fing(1, 8) };
  C.rise = clip(
    'rise',
    13.5,
    [
      K(0, { ...tuck, root: [0, -6000, 0] }),
      K(3.0, { ...tuck, root: [0, -3700, 0], body: [18, 0, 0] }, 'linear'),
      K(4.2, { ...armsUp, root: [0, -3050, 0], body: [16, 0, 0] }, 'snap'),
      K(5.6, { ...armsUp, root: [0, -2050, 0], body: [14, 0, 0], a4s: [-4, 0, -2], a5s: [-4, 0, 2] }),
      K(6.6, { ...sides, root: [0, -1500, 0], body: [14, 0, 0] }, 'snap'),
      K(8.0, { ...reach, root: [0, -800, 0] }),
      K(8.8, { ...grip, root: [0, -600, 0] }, 'snap'),
      K(10.4, { ...grip, root: [0, -120, 0], body: [4, 0, 0], chest: [6, 0, 0], neck: [10, 0, 0], head: [12, 0, 0], jaw: [0, 0, 0] }),
      K(11.2, { ...grip, root: [0, 0, 0], body: [-6, 0, 0], chest: [-8, 0, 0], neck: [-12, 0, 0], head: [-16, 0, 0], jaw: [34, 0, 0], ...fing(4, -22, 10), ...fing(5, -22, 10), a4s: [-12, 0, 12], a5s: [-12, 0, -12] }, 'snap'),
      K(12.6, { ...grip, root: [0, 0, 0], body: [-5, 0, 0], chest: [-7, 0, 0], neck: [-10, 0, 0], head: [-14, 0, 0], jaw: [30, 0, 0], ...fing(4, -18, 9), ...fing(5, -18, 9), a4s: [-10, 0, 10], a5s: [-10, 0, -10] }),
      K(13.5, { ...ALL((i) => fing(i, 0)) }),
    ],
    {
      ground: false,
      events: [
        { t: 0.2, name: 'quake' },
        { t: 3.0, name: 'breach' },
        { t: 4.2, name: 'arms' },
        { t: 6.6, name: 'sideSlam' },
        { t: 8.8, name: 'grip' },
        { t: 11.2, name: 'roar' },
      ],
    }
  );
}

// ------------------------------------------------------------ desplomarse y morir
// Muertos los dos brazos alzados, suelta las torres, se encabrita rugiendo y
// se desploma hacia delante: el pecho revienta la fachada y las torres, el
// cuerpo se hunde en la cisterna y la cabeza cae sobre la plaza con el mentón
// en el empedrado y la cara vuelta hacia arriba, hacia el atrio (la máscara
// queda al alcance: se trepa por la grieta, del mentón a las cuencas). Para
// mirar al frente con el pecho tumbado, el cuello se dobla hacia atrás.
export const BOW = { root: [0, -2381, 148], body: [40, 0, 0], chest: [30, 0, 0], neck: [-50, 0, 0], head: [-63, 0, 0], jaw: [6, 0, 0] };
C.bow = clip(
  'bow',
  6.5,
  [
    K(0, {}),
    // se encabrita y ruge (las manos sueltan las torres)
    K(1.4, { body: [-6, 0, 0], chest: [-6, 0, 0], neck: [-8, 0, 0], head: [-12, 0, 0], jaw: [30, 0, 0] }, 'hold'),
    K(2.2, { body: [-4, 0, 0], chest: [-2, 0, 0], neck: [-12, 0, 0], head: [-18, 0, 0], jaw: [28, 0, 0] }),
    // se viene abajo: el cuerpo se hunde y la cabeza se echa atrás
    K(3.6, { root: [0, -1100, 60], body: [22, 0, 0], chest: [18, 0, 0], neck: [-34, 0, 0], head: [-46, 0, 0], jaw: [18, 0, 0] }, 'in'),
    // el golpe: el mentón contra el empedrado (un poco más abajo, y rebota)
    K(4.4, { root: [0, -2520, 160], body: [42, 0, 0], chest: [32, 0, 0], neck: [-52, 0, 0], head: [-60, 0, 0], jaw: [2, 0, 0] }, 'in'),
    K(5.0, { root: [0, -2320, 150], body: [39, 0, 0], chest: [29, 0, 0], neck: [-49, 0, 0], head: [-65, 0, 0], jaw: [10, 0, 0] }, 'out'),
    K(6.5, BOW, 'settle'),
  ],
  { ground: false, events: [{ t: 1.4, name: 'roar' }, { t: 3.9, name: 'facade' }, { t: 4.4, name: 'crash' }] }
);
// tumbado: respira despacio (poco: le estás trepando por la cara)
C.bowLoop = clip(
  'bowLoop',
  5,
  [K(0, BOW), K(2.5, { ...BOW, body: [40.5, 0, 0.3], chest: [30.4, -0.3, 0], neck: [-50.3, 0.5, 0], head: [-63.2, 0.6, 0], jaw: [9, 0, 0] }), K(5, BOW)],
  { loop: true, ground: false }
);
// ruge tumbado: alza un poco la cara y abre la boca
C.bowRoar = clip(
  'bowRoar',
  3.2,
  [K(0, BOW), K(0.9, { ...BOW, neck: [-53, 0, 0], head: [-67, 0, 0], jaw: [36, 0, 0] }, 'snap'), K(2.3, { ...BOW, neck: [-52, 0, 0], head: [-66, 0, 0], jaw: [32, 0, 0] }), K(3.2, BOW)],
  { ground: false, events: [{ t: 0.9, name: 'roar' }] }
);
// rota la máscara: convulsiones con la boca abierta, se encabrita (la cabeza
// se despega de la plaza) y se hunde de espaldas en la cisterna
C.death = clip(
  'death',
  9,
  [
    K(0, BOW),
    K(0.6, { ...BOW, body: [38, 3, 0], chest: [28, -4, 0], neck: [-56, 6, 0], head: [-70, 10, 4], jaw: [40, 0, 0] }, 'snap'),
    K(1.4, { ...BOW, neck: [-46, -6, 0], head: [-60, -8, -4], jaw: [30, 0, 0] }),
    K(2.2, { ...BOW, neck: [-54, 5, 0], head: [-68, 7, 2], jaw: [44, 0, 0] }),
    K(3.4, { root: [0, -1700, 0], body: [24, 0, 0], chest: [18, 0, 0], neck: [-28, 0, 0], head: [-46, 0, 0], jaw: [50, 0, 0] }, 'snap'),
    K(9, { root: [0, -5400, -700], body: [8, 0, 3], chest: [4, 0, 2], neck: [-18, 0, 0], head: [-30, 0, 0], jaw: [50, 0, 0] }, 'in'),
  ],
  { ground: false, events: [{ t: 0.6, name: 'convulse' }, { t: 3.4, name: 'rear' }, { t: 4.5, name: 'sink' }] }
);

// ------------------------------------------------------------ el esqueleto vivo
export function deoRig(model, o = {}) {
  const R = new ColossusRig(model, {
    pelvis: 'body',
    groundAt: o.groundAt,
    lookBones: [
      { n: 'chest', k: 0.15 },
      { n: 'neck', k: 0.35 },
      { n: 'head', k: 0.5 },
    ],
    shakeBones: [
      { n: 'body', k: 0.15 },
      { n: 'chest', k: 0.3 },
      { n: 'neck', k: 0.3 },
      { n: 'head', k: 0.25 },
    ],
    flinchBones: [
      { n: 'chest', k: 0.4 },
      { n: 'neck', k: 0.35 },
      { n: 'head', k: 0.3 },
    ],
  });
  Object.assign(R.look, { maxYaw: 0.55, maxPitch: 0.5, pitch0: 0.4, speed: 0.9 });
  return R;
}

// ------------------------------------------------------------ los brazos
// Un brazo puede estar: 'rest' (la pose de las claves), 'windup' (se alza
// para golpear), 'fall' (cae sobre la plaza), 'planted' (la mano apoyada:
// se puede trepar), 'lift' (vuelve a su sitio), 'rake' (rastrilla los
// tejados), 'squeeze' (estruja una torre) o 'dead' (muerto, se desploma).
const ease = {
  in: (u) => u * u,
  in3: (u) => u * u * u,
  out: (u) => 1 - (1 - u) * (1 - u),
  smooth: (u) => u * u * (3 - 2 * u),
};
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const bez = (a, b, c, u, out) => {
  const k = 1 - u;
  return out.set(k * k * a.x + 2 * k * u * b.x + u * u * c.x, k * k * a.y + 2 * k * u * b.y + u * u * c.y, k * k * a.z + 2 * k * u * b.z + u * u * c.z);
};

export class DeoArms {
  constructor(R, model) {
    this.R = R;
    this.M = model;
    this.onEvent = null;
    this.arms = DEO_ARMS.map((a, i) => ({
      i,
      id: a.id,
      side: a.s[0] > 0 ? 1 : -1,
      st: 'rest',
      t: 0,
      dur: 0,
      w: 0,
      target: new THREE.Vector3(),
      from: new THREE.Vector3(),
      apex: new THREE.Vector3(),
      cur: new THREE.Vector3(),
      rot: new THREE.Quaternion(),
      hurtT: 0,
      deadDir: 1,
      fk: {},
    }));
  }
  _ev(name, a, extra) {
    if (this.onEvent) this.onEvent(name, a.i, extra);
  }
  // Punto del modelo → mundo y al revés.
  toWorld(p, out = new THREE.Vector3()) {
    return this.M.root.localToWorld(out.copy(p));
  }
  toModel(p, out = new THREE.Vector3()) {
    return this.M.root.worldToLocal(out.copy(p));
  }
  // centro de la palma en el mundo (golpes, polvo, sacudidas de cámara)
  palm(i, out = new THREE.Vector3()) {
    const F = FRAMES[i];
    const w = this.M.byName[`a${i}w`];
    w.getWorldQuaternion(_q);
    w.getWorldPosition(out);
    return out.addScaledVector(_v.copy(F.dir).applyQuaternion(_q), F.palm * 0.55);
  }
  // giro (mundo) de la mano apoyada: la palma contra el suelo y los dedos
  // apuntando hacia 'fwd' (dirección en el suelo)
  _palmDown(i, fwd, out) {
    const F = FRAMES[i];
    const d = _v.set(fwd.x, 0, fwd.z).normalize();
    const n = _v2.set(0, -1, 0);
    const sd = _v3.copy(d).cross(n).normalize();
    _m.makeBasis(d, n, sd);
    const qT = new THREE.Quaternion().setFromRotationMatrix(_m);
    _m.makeBasis(F.dir, F.pn, F.side);
    const qR = new THREE.Quaternion().setFromRotationMatrix(_m);
    this.M.root.getWorldQuaternion(_q2);
    return out.copy(_q2).multiply(qT.multiply(qR.invert()));
  }
  _wristFor(i, palmTarget, fwd, out) {
    // la muñeca, detrás del centro de la palma y un poco por encima del suelo
    const F = FRAMES[i];
    const d = _v.set(fwd.x, 0, fwd.z).normalize();
    return out.copy(palmTarget).addScaledVector(d, -F.palm * 0.55).add(_v2.set(0, 1.1, 0));
  }
  _pole(i, out) {
    // el codo, hacia fuera y arriba (alzados) o hacia fuera (los demás)
    const a = DEO_ARMS[i];
    const s = a.s[0] > 0 ? 1 : -1;
    const P = i >= 4 ? [s * 40, 70, -30] : i >= 2 ? [s * 50, 55, 0] : [s * 40, 50, 10];
    return this.toWorld(_v.set(...P), out);
  }
  wristNow(i, out = new THREE.Vector3()) {
    return this.M.byName[`a${i}w`].getWorldPosition(out);
  }

  // ---------------------------------------------------------- órdenes
  // golpe de un brazo alzado sobre 'palmTarget' (mundo): se alza (windup s),
  // cae (fall s) y se queda plantado hasta lift()
  slam(i, palmTarget, o = {}) {
    const a = this.arms[i];
    if (a.st === 'dead') return;
    a.st = 'windup';
    a.t = 0;
    a.dur = o.windup ?? 2.1;
    a.fallDur = o.fall ?? 0.95;
    a.palmT = palmTarget.clone();
    const sh = this.M.byName[`a${i}s`].getWorldPosition(new THREE.Vector3());
    a.fwd = palmTarget.clone().sub(sh).setY(0).normalize();
    a.target = this._wristFor(i, a.palmT, a.fwd, new THREE.Vector3());
    this._palmDown(i, a.fwd, a.rot);
  }
  // la mano apoyada vuelve a su sitio
  lift(i, o = {}) {
    const a = this.arms[i];
    if (a.st !== 'planted' && a.st !== 'fall') return;
    a.st = 'lift';
    a.t = 0;
    a.dur = o.dur ?? 2.8;
    a.from.copy(a.target);
  }
  // apoyar una mano (los de delante, al inclinarse) en 'palmTarget'
  plant(i, palmTarget, o = {}) {
    const a = this.arms[i];
    if (a.st === 'dead') return;
    const sh = this.M.byName[`a${i}s`].getWorldPosition(new THREE.Vector3());
    a.fwd = o.fwd ? o.fwd.clone().setY(0).normalize() : palmTarget.clone().sub(sh).setY(0).normalize();
    a.palmT = palmTarget.clone();
    a.target = this._wristFor(i, a.palmT, a.fwd, new THREE.Vector3());
    this._palmDown(i, a.fwd, a.rot);
    a.st = 'fall';
    a.t = 0;
    a.dur = 0;
    a.fallDur = o.dur ?? 2.2;
    a.soft = true;
    this.wristNow(i, a.from);
    a.apex.copy(a.from).lerp(a.target, 0.5).add(_v.set(0, 12, 0));
  }
  // rastrillo de un brazo lateral sobre los tejados hacia 'palmTarget'
  rake(i, palmTarget, o = {}) {
    const a = this.arms[i];
    if (a.st !== 'rest') return;
    a.st = 'rake';
    a.t = 0;
    a.dur = o.dur ?? 4.6;
    this.wristNow(i, a.from);
    a.palmT = palmTarget.clone();
    const sh = this.M.byName[`a${i}s`].getWorldPosition(new THREE.Vector3());
    a.fwd = palmTarget.clone().sub(sh).setY(0).normalize();
    a.target = this._wristFor(i, a.palmT, a.fwd, new THREE.Vector3());
    this._palmDown(i, a.fwd, a.rot);
  }
  squeeze(i, dur = 2.4) {
    const a = this.arms[i];
    if (a.st !== 'rest') return;
    a.st = 'squeeze';
    a.t = 0;
    a.dur = dur;
  }
  hurt(i) {
    this.arms[i].hurtT = 1.4;
  }
  // muerto: se desploma hacia su lado (dir 1 hacia fuera) sobre las casas
  kill(i) {
    const a = this.arms[i];
    a.from.copy(a.st === 'planted' || a.st === 'fall' ? a.target : this.wristNow(i, new THREE.Vector3()));
    a.st = 'dead';
    a.t = 0;
    a.dur = 2.6;
    a.wasPlanted = a.w > 0.5;
  }
  planted(i) {
    return this.arms[i].st === 'planted';
  }

  // ---------------------------------------------------------- cada fotograma
  // Antes de R.update: pone los giros añadidos (R.add); después del FK pide
  // la IK (se llama dentro de R.update con ctx.pre).
  update(dt) {
    const R = this.R;
    for (const a of this.arms) {
      a.t += dt;
      const i = a.i;
      const add = {};
      let w = 0;
      if (a.hurtT > 0) a.hurtT = Math.max(0, a.hurtT - dt);
      const hk = a.hurtT > 0 ? Math.pow(a.hurtT / 1.4, 0.7) : 0;
      switch (a.st) {
        case 'windup': {
          // se alza más y hacia atrás, los dedos se abren de par en par
          const u = ease.smooth(clamp01(a.t / a.dur));
          add[`a${i}s`] = [-16 * u, 0, 8 * a.side * u];
          add[`a${i}e`] = [-10 * u, 0, 0];
          Object.assign(add, scaleF(fing(i, -20 * u, 8 * u)));
          if (a.t >= a.dur) {
            a.st = 'fall';
            a.t = 0;
            a.soft = false;
            this.wristNow(i, a.from);
            a.apex.copy(a.from).lerp(a.target, 0.35).add(_v.set(0, 18, 0));
            this._ev('fall', a);
          }
          break;
        }
        case 'fall': {
          const u = clamp01(a.t / a.fallDur);
          const e = a.soft ? ease.smooth(u) : ease.in3(u);
          bez(a.from, a.apex, a.target, e, a.cur);
          w = a.soft ? ease.smooth(clamp01(u * 1.5)) : clamp01(u * 3);
          if (!a.soft) {
            add[`a${i}s`] = [-16 * (1 - u), 0, 8 * a.side * (1 - u)];
            Object.assign(add, scaleF(fing(i, -20 * (1 - u), 8)));
          }
          if (u >= 1) {
            a.st = 'planted';
            a.t = 0;
            this._ev(a.soft ? 'plant' : 'impact', a, this.palm(i));
          }
          break;
        }
        case 'planted': {
          a.cur.copy(a.target);
          w = 1;
          // los dedos se clavan en el empedrado; tiembla si le hieres
          Object.assign(add, scaleF(fing(i, 10 + Math.sin(a.t * 0.8) * 3, 6)));
          break;
        }
        case 'lift': {
          const u = clamp01(a.t / a.dur);
          const e = ease.smooth(u);
          // sube en arco y la IK suelta hacia el final
          this._restWrist(i, _v3);
          a.apex.copy(a.from).lerp(_v3, 0.4).add(_v.set(0, 14, 0));
          bez(a.from, a.apex, _v3, e, a.cur);
          w = 1 - ease.smooth(clamp01((u - 0.45) / 0.55));
          if (u >= 1) {
            a.st = 'rest';
            a.t = 0;
          }
          break;
        }
        case 'rake': {
          // se levanta del tejado, barre hacia la plaza y vuelve
          const u = clamp01(a.t / a.dur);
          const go = u < 0.62 ? ease.smooth(u / 0.62) : 1 - ease.smooth((u - 0.62) / 0.38);
          this._restWrist(i, _v3);
          a.apex.copy(_v3).lerp(a.target, 0.5).add(_v.set(0, 6, 0));
          bez(_v3, a.apex, a.target, go, a.cur);
          w = ease.smooth(clamp01(u / 0.15)) * (1 - ease.smooth(clamp01((u - 0.85) / 0.15)));
          Object.assign(add, scaleF(fing(i, 18 * go, 4)));
          if (u >= 1) {
            a.st = 'rest';
            a.t = 0;
          }
          break;
        }
        case 'squeeze': {
          const u = clamp01(a.t / a.dur);
          const k = Math.sin(u * Math.PI);
          Object.assign(add, scaleF(fing(i, 26 * k)));
          add[`a${i}e`] = [noise1(a.t * 6, i) * 3 * k, 0, noise1(a.t * 5, i + 3) * 3 * k];
          if (u >= 1) {
            a.st = 'rest';
            a.t = 0;
          }
          break;
        }
        case 'dead': {
          // el brazo, sin fuerza: la IK suelta, el hombro cae hacia fuera y
          // el brazo entero se desploma sobre los tejados del barrio
          const u = clamp01(a.t / a.dur);
          const f = ease.in(u);
          const bounce = u >= 1 ? Math.exp(-(a.t - a.dur) * 3) * Math.sin((a.t - a.dur) * 9) * 0.06 : 0;
          const k = Math.min(1, f + bounce);
          add[`a${i}s`] = [22 * k, 0, -100 * a.side * k];
          add[`a${i}e`] = [-20 * k, 0, -30 * a.side * k];
          add[`a${i}w`] = [10 * k, 0, 0];
          Object.assign(add, scaleF(fing(i, 30 * k, 10)));
          w = a.wasPlanted ? 1 - ease.smooth(clamp01(u * 2.5)) : 0;
          a.cur.copy(a.from);
          a.useRot = false;
          if (a.t >= a.dur && !a.fell) {
            a.fell = true;
            this._ev('armFell', a, this.palm(i));
          }
          // caído, la mano se queda donde cayó aunque el cuerpo se mueva
          if (a.fell) {
            if (!a.pinned) {
              a.pinned = true;
              this.wristNow(i, a.pin || (a.pin = new THREE.Vector3()));
            }
            a.cur.copy(a.pin);
            w = 1;
          }
          break;
        }
      }
      if (hk > 0) {
        const t = R.time * 9;
        add[`a${i}s`] = sum3(add[`a${i}s`], [noise1(t, i) * 4 * hk, noise1(t * 1.2, i + 2) * 3 * hk, noise1(t * 0.9, i + 5) * 4 * hk]);
        add[`a${i}e`] = sum3(add[`a${i}e`], [noise1(t * 1.3, i + 7) * 6 * hk, 0, noise1(t * 1.1, i + 9) * 5 * hk]);
        Object.assign(add, sumF(add, scaleF(fing(i, noise1(t * 2, i) * 18 * hk, 0))));
      }
      // escribe los giros añadidos (grados → radianes) en R.add
      for (const j in a.fk) if (!(j in add)) delete R.add[j];
      a.fk = {};
      for (const j in add) {
        const v = add[j];
        R.add[j] = [v[0] * DEG, v[1] * DEG, v[2] * DEG];
        a.fk[j] = true;
      }
      a.w = w;
    }
    // al golpear o con una mano alzada plantada, el cuerpo se inclina hacia
    // la plaza (y gira hacia su lado): el brazo, aun estirándose, llega
    let lean = 0,
      twist = 0;
    for (const i of [4, 5]) {
      const a = this.arms[i];
      let k = 0;
      if (a.st === 'fall') k = clamp01(a.t / a.fallDur);
      else if (a.st === 'planted') k = 1;
      else if (a.st === 'lift') k = 1 - clamp01(a.t / a.dur);
      else if (a.st === 'windup') k = -0.3 * clamp01(a.t / a.dur);
      if (Math.abs(k) > Math.abs(lean)) {
        lean = k;
        twist = a.side * k;
      }
    }
    const e = lean > 0 ? ease.smooth(lean) : lean;
    R.add.body = [11 * e * DEG, 4 * twist * DEG, -3 * twist * DEG];
    R.add.chest = [9 * e * DEG, 6 * twist * DEG, 0];
  }
  // dentro de R.update (ctx.pre): la IK de los brazos que la necesitan
  ik() {
    const R = this.R;
    for (const a of this.arms) {
      if (a.w <= 0.001) continue;
      const i = a.i;
      // (los alzados, con el dorso del antebrazo arriba: es por donde se trepa
      // y donde está el sigilo)
      const roll = i >= 4 && (a.st === 'fall' || a.st === 'planted' || a.st === 'lift') ? { ref: FRAMES[i].dors, want: UPW } : null;
      R.reach(`a${i}s`, `a${i}e`, `a${i}w`, a.cur, this._pole(i, _v), a.w, { rot: a.useRot === false ? null : a.rot, stretch: i >= 4 ? 1.26 : 1.12, roll });
    }
  }
  // la muñeca en reposo (mundo), con el cuerpo como está ahora
  _restWrist(i, out) {
    const ch = this.M.byName.chest;
    ch.updateMatrixWorld(true);
    return out.copy(FRAMES[i].W).applyMatrix4(_m.copy(ch.matrixWorld).multiply(chestRestInv(this.M)));
  }
}

// la inversa de la matriz de reposo del pecho (para llevar puntos de reposo
// al pecho tal y como está)
const _cri = new WeakMap();
function chestRestInv(M) {
  let m = _cri.get(M);
  if (!m) {
    const p = M.restWorld ? M.restWorld.chest : null;
    m = new THREE.Matrix4();
    if (p) m.makeTranslation(p.x, p.y, p.z).invert();
    _cri.set(M, m);
  }
  return m;
}
function scaleF(o) {
  return o;
}
function sum3(a, b) {
  if (!a) return b;
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function sumF(a, b) {
  const o = {};
  for (const j in b) o[j] = sum3(a[j], b[j]);
  return o;
}

// ------------------------------------------------------------ hoja de poses
// Escenas para tools/colposes.mjs: (R, t, ctx) simula t segundos.
export const DEO_SCENES = {
  slamL(R, t, ctx) {
    const arms = new DeoArms(R, ctx.model);
    R.base.play(DEO_CLIPS.idle, { blend: 0.001 });
    const target = arms.toWorld(new THREE.Vector3(17, 0, 34));
    let fired = false;
    const n = Math.max(1, Math.round(t * 30));
    for (let k = 0; k < n; k++) {
      if (!fired) {
        arms.slam(4, target);
        fired = true;
      }
      if (k === Math.round(7 * 30)) arms.lift(4);
      arms.update(t / n);
      R.update(t / n, { pre: () => arms.ik() });
    }
  },
  killL(R, t, ctx) {
    const arms = new DeoArms(R, ctx.model);
    R.base.play(DEO_CLIPS.idle, { blend: 0.001 });
    const target = arms.toWorld(new THREE.Vector3(17, 0, 34));
    arms.slam(4, target);
    const n = Math.max(1, Math.round((t + 3.5) * 30));
    for (let k = 0; k < n; k++) {
      if (k === Math.round(3.5 * 30)) arms.kill(4);
      arms.update((t + 3.5) / n);
      R.update((t + 3.5) / n, { pre: () => arms.ik() });
    }
  },
  rakeL(R, t, ctx) {
    const arms = new DeoArms(R, ctx.model);
    R.base.play(DEO_CLIPS.idle, { blend: 0.001 });
    arms.rake(2, arms.toWorld(new THREE.Vector3(20, 6, 26)));
    const n = Math.max(1, Math.round(t * 30));
    for (let k = 0; k < n; k++) {
      arms.update(t / n);
      R.update(t / n, { pre: () => arms.ik() });
    }
  },
  bowPlant(R, t, ctx) {
    const arms = new DeoArms(R, ctx.model);
    R.base.play(DEO_CLIPS.bow, { blend: 0.001 });
    arms.kill(4);
    arms.kill(5);
    const n = Math.max(1, Math.round(t * 30));
    for (let k = 0; k < n; k++) {
      if (k === Math.round(2.5 * 30)) {
        arms.plant(0, arms.toWorld(new THREE.Vector3(20, 0, 30)));
        arms.plant(1, arms.toWorld(new THREE.Vector3(-20, 0, 30)));
      }
      arms.update(t / n);
      R.update(t / n, { pre: () => arms.ik() });
    }
  },
};
