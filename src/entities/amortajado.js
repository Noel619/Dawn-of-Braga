// El Amortajado: uno de los muertos de la manzana de los Pellejeros. Los
// vecinos no podían enterrarlos (la calle era de las criaturas): los lavaron,
// los cosieron en su mortaja con hilo doble y los ataron con cordeles por el
// cuello, el pecho, la cintura, las rodillas y los tobillos, por si acaso, y
// los dejaron en sus andas en la casa de la esquina, con velas. No bastó.
//
// La mortaja es de lienzo, manchada de lo que rezuma; la cara se le marca en
// la tela (la nariz, las cuencas, la boca cosida con puntadas negras), y en
// lo alto de la cabeza, el nudo. Los brazos van dentro, cruzados sobre la
// tripa. Las piernas, atadas juntas: anda a saltos. No ve.
//
// A media vida revientan las costuras: se rompen los cordeles del pecho, le
// salen los brazos, flacos y grises, con las uñas largas como clavos y
// jirones de lienzo colgando, y la boca cosida se le rasga hasta las orejas.
// Las piernas siguen dentro del lienzo, atadas: sigue a saltos, pero más
// deprisa.
//
// Las piezas de la mortaja entera van en sus grupos ('cords', 'face1',
// 'arms1') y las de después, en 'torn' (ocultas): ver setTorn().
//
// Cómo se porta (AMORTAJADO_TYPE):
//  - tendido en sus andas o en el suelo, quieto como los otros muertos (de
//    vez en cuando se estremece); si te oye, se incorpora tieso, de una
//    pieza, girando sobre los talones, y salta de las andas;
//  - no ve: oye. Andando lejos de él no se entera; corriendo, rodando o
//    peleando cerca, sí; un ruido fuerte (una puerta clavada que se arranca)
//    lo despierta y va a ver qué ha sido. Si dejas de hacer ruido, va a
//    donde te oyó por última vez y se queda escuchando;
//  - el cabezazo (se puede desviar) y el desplome: se deja caer de bruces
//    entero, como un árbol, sobre lo que tenga delante (no se desvía; tirado
//    en el suelo, todo golpe es crítico) y se levanta igual, tieso;
//  - rasgado: los zarpazos y la dentellada al salto (no se desvía).
import * as THREE from 'three';
import { Rig, clip } from './rig.js';
import { humanoidJoints, CORPSE_POSES } from './models.js';
import { DEG, clamp, damp, approachAngle } from '../core/util.js';

const K = 0.98;

export function amortajadoDef() {
  const joints = humanoidJoints(K);
  joints.push({ name: 'jaw', parent: 'head', pos: [0, 0.05, 0.03] });
  const L = 'mortaja',
    rope = 'rope',
    skin = 'skinPale';
  const parts = [
    // ---- la mortaja (siempre)
    { j: 'hips', type: 'cyl', s: [0.215, 0.2, 0.34], p: [0, -0.08, 0], sc: [1, 1, 0.64], seg: 8, mat: L },
    // el tronco con los brazos dentro: más ancho de hombros que de cintura
    { j: 'chest', type: 'cyl', s: [0.27, 0.215, 0.56], p: [0, 0.25, 0], sc: [1, 1, 0.58], seg: 8, mat: L },
    { j: 'chest', type: 'sphere', s: [0.27, 0.1, 0.155], p: [0, 0.53, -0.005], seg: 8, seg2: 4, mat: L },
    { j: 'chest', type: 'cyl', s: [0.066, 0.08, 0.14], p: [0, 0.6, 0.005], mat: L, seg: 7 },
    // lo que rezuma: una mancha parda en el pecho y otra en la cadera
    { j: 'chest', type: 'box', s: [0.15, 0.2, 0.012], p: [0.06, 0.3, 0.152], r: [0, 0, -9], mat: 'skinCorrupt' },
    { j: 'hips', type: 'box', s: [0.12, 0.1, 0.012], p: [-0.07, -0.1, 0.13], r: [0, 0, 14], mat: 'skinCorrupt' },
    // las piernas, juntas, y los pies con la punta hacia arriba
    { j: 'legL', type: 'cyl', s: [0.102, 0.085, 0.47], p: [-0.004, -0.22, 0], seg: 7, mat: L },
    { j: 'legR', type: 'cyl', s: [0.102, 0.085, 0.47], p: [0.004, -0.22, 0], seg: 7, mat: L },
    { j: 'shinL', type: 'cyl', s: [0.085, 0.068, 0.45], p: [-0.008, -0.21, 0], seg: 7, mat: L },
    { j: 'shinR', type: 'cyl', s: [0.085, 0.068, 0.45], p: [0.008, -0.21, 0], seg: 7, mat: L },
    { j: 'footL', type: 'box', s: [0.11, 0.09, 0.21], p: [-0.012, -0.015, 0.045], taper: [0.85, 1], mat: L },
    { j: 'footR', type: 'box', s: [0.11, 0.09, 0.21], p: [0.012, -0.015, 0.045], taper: [0.85, 1], mat: L },
    // la cabeza: lo de arriba (el nudo) se queda también rasgada
    { j: 'head', type: 'box', s: [0.08, 0.09, 0.08], p: [0, 0.29, -0.02], r: [10, 45, 18], mat: L },
    { j: 'head', type: 'box', s: [0.05, 0.12, 0.05], p: [0.02, 0.35, -0.03], r: [0, 30, -30], mat: L },

    // ---- entera: la cara marcada en el lienzo, la boca cosida
    { j: 'head', type: 'sphere', s: [0.112, 0.145, 0.122], p: [0, 0.13, 0], seg: 8, seg2: 6, mat: L, grp: 'face1' },
    { j: 'head', type: 'box', s: [0.04, 0.065, 0.04], p: [0, 0.125, 0.125], r: [-14, 0, 0], mat: L, grp: 'face1' },
    { j: 'head', type: 'box', s: [0.17, 0.03, 0.03], p: [0, 0.172, 0.112], mat: L, grp: 'face1' },
    { j: 'head', type: 'box', s: [0.045, 0.026, 0.006], p: [-0.05, 0.152, 0.119], mat: 'black', grp: 'face1' },
    { j: 'head', type: 'box', s: [0.045, 0.026, 0.006], p: [0.05, 0.152, 0.119], mat: 'black', grp: 'face1' },
    { j: 'head', type: 'box', s: [0.085, 0.03, 0.006], p: [0, 0.068, 0.118], mat: 'blood', grp: 'face1' },
    ...[-0.03, -0.01, 0.01, 0.03].map((x) => ({ j: 'head', type: 'box', s: [0.006, 0.04, 0.004], p: [x, 0.068, 0.122], mat: 'black', grp: 'face1' })),
    { j: 'head', type: 'box', s: [0.08, 0.004, 0.004], p: [0, 0.068, 0.123], mat: 'black', grp: 'face1' },
    // ---- entera: los brazos dentro (el bulto a los lados y las manos
    // cruzadas sobre la tripa)
    { j: 'chest', type: 'cyl', s: [0.06, 0.05, 0.5], p: [0.235, 0.24, 0.015], seg: 6, mat: L, grp: 'arms1' },
    { j: 'chest', type: 'cyl', s: [0.06, 0.05, 0.5], p: [-0.235, 0.24, 0.015], seg: 6, mat: L, grp: 'arms1' },
    { j: 'chest', type: 'sphere', s: [0.13, 0.06, 0.05], p: [0, 0.05, 0.12], seg: 7, seg2: 4, mat: L, grp: 'arms1' },
    // ---- entera: los cordeles
    { j: 'chest', type: 'cyl', s: [0.092, 0.092, 0.03], p: [0, 0.58, 0.005], mat: rope, seg: 8, grp: 'cords' },
    { j: 'chest', type: 'cyl', s: [0.264, 0.264, 0.035], p: [0, 0.36, 0], sc: [1, 1, 0.6], seg: 10, mat: rope, grp: 'cords' },
    { j: 'hips', type: 'cyl', s: [0.224, 0.224, 0.035], p: [0, 0.05, 0], sc: [1, 1, 0.66], seg: 10, mat: rope, grp: 'cords' },
    // (los de las rodillas y los tobillos aguantan: las piernas van atadas
    // hasta el final)
    { j: 'legL', type: 'cyl', s: [0.2, 0.2, 0.035], p: [-0.098, -0.44, 0], sc: [1, 1, 0.5], seg: 10, mat: rope },
    { j: 'shinL', type: 'cyl', s: [0.17, 0.17, 0.035], p: [-0.098, -0.36, 0], sc: [1, 1, 0.48], seg: 10, mat: rope },
    // (los cabos del nudo del pecho)
    { j: 'chest', type: 'box', s: [0.02, 0.12, 0.02], p: [0.08, 0.3, 0.17], r: [0, 0, 18], mat: rope, grp: 'cords' },
    { j: 'chest', type: 'box', s: [0.02, 0.1, 0.02], p: [0.11, 0.31, 0.17], r: [0, 0, -14], mat: rope, grp: 'cords' },

    // ---- rasgada (oculta hasta que revientan las costuras)
    // la cabeza: el lienzo de los ojos para arriba, la boca abierta hasta las
    // orejas, con los dientes, y la mandíbula
    { j: 'head', type: 'sphere', s: [0.112, 0.1, 0.122], p: [0, 0.19, 0], seg: 8, seg2: 5, mat: L, grp: 'torn' },
    { j: 'head', type: 'box', s: [0.04, 0.065, 0.04], p: [0, 0.135, 0.125], r: [-14, 0, 0], mat: L, grp: 'torn' },
    { j: 'head', type: 'box', s: [0.18, 0.1, 0.19], p: [0, 0.075, 0.0], mat: skin, grp: 'torn' },
    { j: 'head', type: 'box', s: [0.15, 0.06, 0.01], p: [0, 0.07, 0.096], mat: 'black', grp: 'torn' },
    { j: 'head', type: 'box', s: [0.15, 0.022, 0.025], p: [0, 0.1, 0.092], mat: 'bone', grp: 'torn' },
    ...[-0.06, -0.02, 0.02, 0.06].map((x) => ({ j: 'head', type: 'box', s: [0.012, 0.035, 0.012], p: [x, 0.085, 0.1], mat: 'bone', grp: 'torn' })),
    // jirones del lienzo alrededor de la boca
    { j: 'head', type: 'box', s: [0.06, 0.05, 0.006], p: [0.1, 0.09, 0.08], r: [0, 40, 25], mat: L, grp: 'torn' },
    { j: 'head', type: 'box', s: [0.05, 0.06, 0.006], p: [-0.1, 0.085, 0.08], r: [0, -40, -30], mat: L, grp: 'torn' },
    { j: 'jaw', type: 'box', s: [0.16, 0.045, 0.17], p: [0, -0.03, 0.02], taper: [0.86, 0.9], mat: skin, grp: 'torn' },
    { j: 'jaw', type: 'box', s: [0.13, 0.02, 0.02], p: [0, 0.0, 0.098], mat: 'bone', grp: 'torn' },
    ...[-0.05, -0.017, 0.017, 0.05].map((x) => ({ j: 'jaw', type: 'box', s: [0.012, 0.03, 0.012], p: [x, 0.015, 0.098], mat: 'bone', grp: 'torn' })),
    { j: 'jaw', type: 'box', s: [0.17, 0.05, 0.12], p: [0, -0.06, -0.02], mat: L, grp: 'torn' },
    // los brazos que han salido de la mortaja: flacos, grises, las uñas
    // largas y jirones de lienzo
    { j: 'armL', type: 'box', s: [0.085, 0.31, 0.085], p: [0, -0.14, 0], taper: [0.8, 0.8], mat: skin, grp: 'torn' },
    { j: 'armR', type: 'box', s: [0.085, 0.31, 0.085], p: [0, -0.14, 0], taper: [0.8, 0.8], mat: skin, grp: 'torn' },
    { j: 'foreL', type: 'box', s: [0.065, 0.3, 0.065], p: [0, -0.14, 0], taper: [0.8, 0.8], mat: skin, grp: 'torn' },
    { j: 'foreR', type: 'box', s: [0.065, 0.3, 0.065], p: [0, -0.14, 0], taper: [0.8, 0.8], mat: skin, grp: 'torn' },
    { j: 'handL', type: 'box', s: [0.075, 0.1, 0.03], p: [0, -0.04, 0], mat: skin, grp: 'torn' },
    { j: 'handR', type: 'box', s: [0.075, 0.1, 0.03], p: [0, -0.04, 0], mat: skin, grp: 'torn' },
    ...['handL', 'handR'].flatMap((j) =>
      [-0.028, -0.009, 0.009, 0.028].map((x, i) => ({ j, type: 'box', s: [0.011, 0.15 + (i % 2) * 0.03, 0.011], p: [x, -0.16 - (i % 2) * 0.015, 0.008], r: [-8, 0, 0], mat: 'bone', grp: 'torn' }))
    ),
    { j: 'armL', type: 'box', s: [0.11, 0.2, 0.008], p: [0.02, -0.12, 0.05], r: [10, 0, 12], mat: L, grp: 'torn' },
    { j: 'foreR', type: 'box', s: [0.09, 0.16, 0.008], p: [-0.02, -0.06, 0.04], r: [6, 0, -16], mat: L, grp: 'torn' },
    // la mortaja abierta por los costados y los cordeles rotos colgando
    { j: 'chest', type: 'box', s: [0.12, 0.34, 0.01], p: [0.27, 0.26, 0.06], r: [0, 30, 8], mat: L, grp: 'torn' },
    { j: 'chest', type: 'box', s: [0.12, 0.3, 0.01], p: [-0.27, 0.24, 0.06], r: [0, -30, -8], mat: L, grp: 'torn' },
    { j: 'chest', type: 'box', s: [0.025, 0.22, 0.025], p: [0.2, 0.22, 0.16], r: [0, 0, 12], mat: rope, grp: 'torn' },
    { j: 'hips', type: 'box', s: [0.025, 0.2, 0.025], p: [-0.18, -0.08, 0.14], r: [0, 0, -10], mat: rope, grp: 'torn' },
  ];
  return { joints, parts };
}

export function buildAmortajado() {
  const rig = new Rig(amortajadoDef());
  setTorn(rig, false);
  return rig;
}

// Revientan las costuras (o vuelve a estar entero, al reiniciar).
export function setTorn(rig, torn) {
  for (const m of rig.meshes) {
    const g = m.userData.grp;
    if (g === 'torn') m.visible = torn;
    else if (g === 'face1' || g === 'arms1' || g === 'cords') m.visible = !torn;
  }
}

// Tendido boca arriba en sus andas (o en el suelo), tieso.
export const LIE_POSE = { hips: [-90, 0, 0] };
// Lo alto de la cadera sobre lo que pisa, tendido.
export const LIE_HIP = 0.16;

// Un muerto amortajado, horneado en el escenario (los que no se levantan):
// igual que el Amortajado tendido. (x, y, z): donde descansa la espalda;
// la cabeza, hacia -z girado yaw. tilt: ladeado (rad, sobre su eje).
const _m = new THREE.Matrix4();
export function bakeShrouded(wb, x, y, z, yaw, o = {}) {
  const rig = new Rig(amortajadoDef());
  const pose = {};
  for (const k in LIE_POSE) pose[k] = LIE_POSE[k].map((v) => v * DEG);
  if (o.head) pose.head = o.head.map((v) => v * DEG);
  if (o.tilt) pose.hips[1] = o.tilt;
  rig.apply(pose);
  rig.joints.hips.position.y = LIE_HIP;
  rig.root.position.set(x, y, z);
  rig.root.rotation.y = yaw;
  if (o.scale) rig.root.scale.setScalar(o.scale);
  rig.root.updateMatrixWorld(true);
  for (const mesh of rig.meshes) {
    if (mesh.userData.grp === 'torn') continue;
    if (o.torn && mesh.userData.grp === 'cords') continue;
    _m.copy(mesh.matrixWorld);
    wb.geometry(mesh.userData.matName, mesh.geometry, _m, { ao: false, uvScale: 1, room: o.room, tint: o.tint });
  }
}

export { CORPSE_POSES };

// ======================================================================= LA CRIATURA
const HIP0 = 0.95 * K; // la cadera, de pie
const LEG = 0.91 * K; // de la cadera al tobillo
const ANK = HIP0 - LEG; // el tobillo sobre lo que pisa, de pie
const R3 = (x, y, z) => [x * DEG, y * DEG, z * DEG];
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// El cuerpo tieso, inclinado th (rad: 0 de pie; -90° boca arriba, la cabeza
// hacia atrás; +90° de bruces), girando sobre los tobillos, que están en
// (0, ay, az) del marco de la criatura.
function plank(p, th, ay, az) {
  p.hips = [th, 0, 0];
  p.root = [0, ay + LEG * Math.cos(th) - HIP0, az + LEG * Math.sin(th)];
  return p;
}

// lo alto de lo que pisa (las andas, el jergón) sobre su cuerpo físico,
// mientras está tendido o levantándose
const surf = (e) => (e.data.surf == null ? 0 : e.data.surf - e.pos.y);

// ---- la marcha a saltos: ph 0..1 de un salto (0, de pie). Se agacha, se
// impulsa, va por el aire (ahí avanza: ver moveMul) y cae flexionando.
const AIR0 = 0.28,
  AIR1 = 0.82;
const HOP_K = 1 / ((AIR1 - AIR0) * 0.5);
function hopK(ph) {
  if (ph <= AIR0 || ph >= AIR1) return 0;
  const s = Math.sin((Math.PI * (ph - AIR0)) / (AIR1 - AIR0));
  return HOP_K * s * s;
}
function hopPose(e, t, p) {
  const D = e.data;
  const ph = D.hop || 0;
  const amp = clamp(D.hopAmp ?? 1, 0.35, 1.3);
  const c = ph <= 0 ? 0 : ph < 0.22 ? sm(ph / 0.22) : ph < 0.3 ? 1 - sm((ph - 0.22) / 0.08) : ph < 0.8 ? 0 : 0.55 * Math.sin((Math.PI * (ph - 0.8)) / 0.2);
  const air = ph > AIR0 && ph < AIR1 ? Math.sin((Math.PI * (ph - AIR0)) / (AIR1 - AIR0)) : 0;
  const k = c * amp,
    a = air * amp;
  // (se ladea a un lado y al otro, un salto cada vez)
  const sway = (D.hopN & 1 ? 1 : -1) * 3.5 * Math.sin(Math.PI * clamp(ph, 0, 1)) * amp;
  p.root = [0, surf(e) - 0.1 * k + 0.13 * a, 0];
  p.hips = R3(-5 * k, 0, sway * 0.5);
  for (const s of ['L', 'R']) {
    p['leg' + s] = R3(-30 * k, 0, 0);
    p['shin' + s] = R3(62 * k, 0, 0);
    p['foot' + s] = R3(-30 * k + 24 * a, 0, 0);
  }
  const torn = D.torn;
  p.chest = R3((torn ? 16 : 7) + 12 * k - 5 * a, 0, -sway);
  // la cabeza: cosida, cuelga y escucha; rasgada, adelante, la boca abierta
  p.head = torn ? R3(-4 + 10 * k + Math.sin(t * 1.3) * 4, Math.sin(t * 0.6 + e.phase) * 14, 6) : R3(12 + 8 * k + Math.sin(t * 0.7) * 4, Math.sin(t * 0.4 + e.phase) * 12, 9);
  if (torn) {
    p.jaw = R3(20 + Math.sin(t * 4.7 + e.phase) * 7, 0, 0);
    const f = Math.sin(t * 3.1 + e.phase) * 10;
    p.armL = R3(-58 + 34 * a + f, 0, 24 - 10 * a);
    p.foreL = R3(-38 - 22 * a, 0, 0);
    p.handL = R3(-12, 0, 0);
    p.armR = R3(-58 + 34 * a - f, 0, -24 + 10 * a);
    p.foreR = R3(-38 - 22 * a, 0, 0);
    p.handR = R3(-12, 0, 0);
  }
  return p;
}

// ---- de pie, quieto, escuchando: la cabeza ladeada y vuelta despacio hacia
// donde suena algo
function listenPose(e, t, p) {
  const D = e.data;
  p.hips = R3(0, 0, Math.sin(t * 0.9 + e.phase) * 1.5);
  p.chest = R3(5 + Math.sin(t * 0.5) * 2, 0, 0);
  p.head = R3(8 + Math.sin(t * 0.5 + e.phase) * 4, (D.look || 0) + Math.sin(t * 0.23 + e.phase) * 22, 13);
  if (D.torn) {
    p.jaw = R3(16 + Math.sin(t * 2.3) * 4, 0, 0);
    p.armL = R3(6, 0, 9);
    p.foreL = R3(-16, 0, 0);
    p.armR = R3(6, 0, -9);
    p.foreR = R3(-16, 0, 0);
  }
  return p;
}

// ---- tendido boca arriba (en sus andas o en el suelo); de vez en cuando se
// estremece (D.tw)
function lyingPose(e, t, p) {
  const tw = e.data.tw || 0;
  plank(p, -90 * DEG + tw * Math.sin(t * 38) * 0.03, surf(e) + LIE_HIP, LEG);
  p.head = R3(0, tw * Math.sin(t * 23) * 22, 0);
  return p;
}

// ---- se incorpora: un estremecimiento, y se levanta de una pieza girando
// sobre los talones (la cabeza, colgando hacia atrás, al final se le
// endereza de golpe); de pie en el extremo de las andas, salta al suelo
const RISE_UP = 1.7, // ya de pie (se le pasa el cuerpo a donde están los pies)
  RISE_HOP = 1.95; // salta
function risePose(e, t, p) {
  const D = e.data;
  if (D.up) {
    // de pie (o saltando de las andas): la cabeza le cae sobre el pecho y se
    // le levanta de golpe, hacia el ruido
    hopPose(e, t, p);
    const u = (t - RISE_UP) / 0.25;
    if (u < 1) p.head = R3(36 * Math.sin(Math.PI * u), 0, 10);
    return p;
  }
  const sh = t < 0.55 ? Math.sin(t * 47) * (0.55 - t) * 7 : 0;
  const u = t < 0.55 ? 0 : sm((t - 0.55) / (RISE_UP - 0.55));
  plank(p, (-90 + sh * 0.4 + 90 * u) * DEG, surf(e) + LIE_HIP + (ANK - LIE_HIP) * u, LEG);
  // (la cabeza se le queda atrás mientras sube)
  p.head = R3(sh * 2 - 30 * Math.sin(Math.PI * u), sh * 3, 0);
  p.chest = R3(-4 * Math.sin(Math.PI * u), 0, 0);
  return p;
}

// ---- el desplome: se echa algo atrás, temblando; cae de bruces de una pieza
// (más deprisa cada vez); en el suelo, se sacude; se levanta, tieso, girando
// sobre los pies
const SLAM = { fall: 0.5, hit: 0.92, rise: 2.25, up: 3.05, shift: 0.85 };
function slamPose(e, t, p) {
  const D = e.data;
  let th, ay;
  if (t < SLAM.fall) {
    th = -10 * sm(t / SLAM.fall) + Math.sin(t * 41) * 1.5;
    ay = ANK;
  } else if (t < SLAM.hit) {
    const u = (t - SLAM.fall) / (SLAM.hit - SLAM.fall);
    th = -10 + 100 * u * u;
    ay = ANK + (LIE_HIP - ANK) * u * u;
  } else if (t < SLAM.rise) {
    // (rebota y se queda; las manos, si las tiene, arañan el suelo)
    const b = t - SLAM.hit;
    th = 90 - (b < 0.22 ? 7 * Math.sin((Math.PI * b) / 0.22) : 0) + (t > SLAM.rise - 0.5 ? Math.sin(t * 31) * 1.2 : 0);
    ay = LIE_HIP;
  } else {
    const u = sm((t - SLAM.rise) / (SLAM.up - SLAM.rise));
    th = 90 * (1 - u);
    ay = LIE_HIP + (ANK - LIE_HIP) * u;
  }
  plank(p, th * DEG, ay, -(D.shift || 0));
  p.head = R3(t > SLAM.hit && t < SLAM.rise ? -20 : 6, 0, 0);
  if (D.torn) {
    // los brazos por delante al caer; en el suelo, a los lados, arañando
    const down = t > SLAM.hit && t < SLAM.up;
    const sc = down ? Math.sin(t * 9) * 12 : 0;
    p.armL = down ? R3(-160 + sc, 0, 40) : R3(-95, 0, 18);
    p.armR = down ? R3(-160 - sc, 0, -40) : R3(-95, 0, -18);
    p.foreL = R3(-20, 0, 0);
    p.foreR = R3(-20, 0, 0);
    p.jaw = R3(28, 0, 0);
  }
  return p;
}

// ---- muerto: cae de espaldas, tieso, y rebota (o se queda como estaba, si
// estaba tendido)
function deathPose(e, t, p) {
  const D = e.data;
  if (D.lying) return lyingPose(e, 0, p);
  if (D.down) return plank(p, 90 * DEG, LIE_HIP, -(D.shift || 0));
  const u = clamp(t / 0.75, 0, 1);
  const b = t > 0.75 && t < 1.05 ? 7 * Math.sin((Math.PI * (t - 0.75)) / 0.3) : 0;
  plank(p, (-90 * u * u + b) * DEG, ANK + (LIE_HIP - ANK) * u * u, 0);
  p.head = R3(-10 * u, 20 * u, 0);
  if (D.torn) {
    p.armL = R3(-40 * u, 0, 20 + 50 * u);
    p.armR = R3(-40 * u, 0, -20 - 50 * u);
    p.jaw = R3(35 * u, 0, 0);
  }
  return p;
}

// ---- lo que oye (no ve): el ruido que haces, según lo que haces, hasta
// dónde llega; si ya te busca, escucha con más atención
function hearRadius(e, pl) {
  const v = Math.hypot(pl.vx || 0, pl.vz || 0);
  let r = pl.state === 'attack' || pl.state === 'roll' ? 5.2 : pl.sprinting && v > 3 ? 6.5 : v > 2.8 ? 2.2 : v > 0.4 ? 1.6 : 0.9;
  if (e.aware) r *= 2.4;
  return r;
}

// ¿Hay sitio delante (hacia el jugador) para dejarse caer de bruces?
function roomToFall(e) {
  const g = e.game,
    col = g.world.col;
  const a = e.angleTo(g.player.pos);
  const fx = Math.sin(a),
    fz = Math.cos(a);
  for (const h of [0.45, 1.2]) if (col.raycast(e.pos.x, e.pos.y + h, e.pos.z, fx, 0, fz, 2.3, (b) => !b.camOnly && !b.ramp) < 2.3) return false;
  for (const k of [1.0, 1.9]) if (Math.abs(col.groundHeight(e.pos.x + fx * k, e.pos.z + fz * k, 0.1, e.pos.y + 0.5) - e.pos.y) > 0.3) return false;
  return true;
}

// el golpe del desplome: lo que pille el cuerpo al caer, de los pies a la
// cabeza; y el suelo que retumba
function slam(e, g) {
  const D = e.data;
  const p = g.player;
  const fx = Math.sin(e.yaw),
    fz = Math.cos(e.yaw);
  const rx = p.pos.x - e.pos.x,
    rz = p.pos.z - e.pos.z;
  const along = rx * fx + rz * fz,
    side = Math.abs(rx * fz - rz * fx);
  if (!p.dead && along > 0.15 && along < 2.1 && side < 0.55 + p.body.radius && Math.abs(p.pos.y - e.pos.y) < 0.9) g.combat.enemyStrikeAt(e, e.atk, e.pos.x, e.pos.z);
  // (tendido, se le puede herir por todo el cuerpo: el cuerpo físico, al
  // medio; los tobillos, donde estaban)
  D.down = true;
  D.shift = SLAM.shift;
  e.pos.x += fx * SLAM.shift;
  e.pos.z += fz * SLAM.shift;
  const cx = e.pos.x + fx * 0.2,
    cz = e.pos.z + fz * 0.2;
  g.fx.blood.emit(cx, e.pos.y + 0.15, cz, 26, { color: [0.4, 0.37, 0.32], speed: 2.6, life: 0.8, up: 1.2 });
  g.audio && g.audio.enemyVoice(e, 'slam');
  const d = Math.hypot(p.pos.x - cx, p.pos.z - cz);
  if (d < 7) g.camRig.shake(0.32 * (1 - d / 7));
}
function unslam(e) {
  const D = e.data;
  if (!D.down) return;
  e.pos.x -= Math.sin(e.yaw) * (D.shift || 0);
  e.pos.z -= Math.cos(e.yaw) * (D.shift || 0);
  D.down = false;
  D.shift = 0;
}

// revientan las costuras
function tear(e) {
  const D = e.data;
  const g = e.game;
  D.torn = true;
  D.phase = 2;
  setTorn(e.rig, true);
  e.rig.worldPos('chest', _tp);
  g.fx.blood.emit(_tp.x, _tp.y, _tp.z, 30, { color: [0.62, 0.59, 0.52], speed: 3.2, life: 1.1, up: 1.4, gravity: -3 });
  g.fx.blood.emit(_tp.x, _tp.y + 0.3, _tp.z, 14, { speed: 3 });
}
const _tp = new THREE.Vector3();

function startRise(e, t0 = 0) {
  e.state = 'rise';
  e.stT = t0;
  e.atk = null;
  e.anim.stop(0.05);
  e.vx = e.vz = 0;
}

const AM_BASE = { chest: [8, 0, 0], head: [12, 0, 9] };
const LEGS = (th, sh, ft) => ({ legL: [th, 0, 0], legR: [th, 0, 0], shinL: [sh, 0, 0], shinR: [sh, 0, 0], footL: [ft, 0, 0], footR: [ft, 0, 0] });
const amClips = {
  // la cabeza se le va de golpe hacia el ruido
  alert: clip('alert', 1.0, [
    [0, { ...AM_BASE }],
    [0.18, { chest: [-6, 0, 0], head: [-22, 34, -12] }, 'snap'],
    [0.55, { chest: [2, 0, 0], head: [-8, 26, 18] }],
    [1.0, { ...AM_BASE }],
  ]),
  hurt: clip('hurt', 0.5, [
    [0, { chest: [-16, 8, 0], head: [-26, 0, 14], root: [0, -2, 0] }, 'snap'],
    [0.5, { ...AM_BASE }],
  ]),
  // como un fardo que se tambalea
  stagger: clip('stagger', 1.25, [
    [0, { hips: [-10, 0, 4], chest: [-18, 0, 6], head: [-32, 0, -12], root: [0, -3, -5] }, 'snap'],
    [0.45, { hips: [7, 0, -5], chest: [14, 0, -6], head: [22, 0, 10], root: [0, -5, 4] }],
    [0.8, { hips: [-3, 0, 2], chest: [2, 0, 3], head: [-6, 0, -4] }],
    [1.25, { ...AM_BASE }],
  ]),
  // desviado el cabezazo: se va hacia atrás, a punto de caer, y se rehace
  parried: clip('parried', 1.6, [
    [0, { hips: [-14, 0, -6], chest: [-24, 10, 0], head: [-40, 0, 16], root: [0, -4, -8], ...LEGS(12, 4, 0) }, 'snap'],
    [0.35, { hips: [-18, 0, 5], chest: [-20, -8, 0], head: [-34, 10, -10], root: [0, -6, -12], ...LEGS(16, 6, 0) }],
    [0.9, { hips: [-8, 0, -3], chest: [-6, 0, 0], head: [-20, 0, 8], root: [0, -3, -5], ...LEGS(6, 2, 0) }],
    [1.6, { ...AM_BASE }],
  ]),
  // (se ve lo que pone loco/deathPose)
  death: clip('death', 3, [
    [0, {}],
    [3, {}],
  ]),
  // se echa atrás y da con la cabeza (el nudo de la mortaja) en un salto
  cabezazo: clip('cabezazo', 1.4, [
    [0, { ...AM_BASE }],
    [0.42, { hips: [-6, 0, 0], chest: [-26, 0, 0], head: [-30, 0, 0], root: [0, -6, 0], ...LEGS(-14, 28, -14) }],
    [0.54, { hips: [4, 0, 0], chest: [20, 0, 0], head: [6, 0, 0], root: [0, 7, 0], ...LEGS(0, 0, 18) }, 'snap'],
    [0.64, { hips: [10, 0, 0], chest: [50, 0, 0], head: [36, 0, 0], root: [0, -9, 0], ...LEGS(-18, 26, -8) }, 'snap'],
    [0.95, { hips: [8, 0, 0], chest: [44, 0, 0], head: [30, 0, 0], root: [0, -8, 0], ...LEGS(-16, 24, -8) }],
    [1.4, { ...AM_BASE }],
  ]),
  // (las piernas y el cuerpo, de slamPose)
  desplome: clip('desplome', 3.3, [
    [0, {}],
    [3.3, {}],
  ]),
  // rasgado: un zarpazo con cada mano, a saltos
  zarpazo: clip('zarpazo', 1.5, [
    [0, { ...AM_BASE }],
    [0.4, { chest: [-6, -34, 0], head: [-10, 20, 0], armL: [-150, 0, 46], foreL: [-46, 0, 0], armR: [-50, 0, -40], foreR: [-30, 0, 0], jaw: [30, 0, 0] }],
    [0.55, { chest: [30, 32, 0], head: [10, -18, 0], armL: [-40, 0, -34], foreL: [-10, 0, 0], armR: [-60, 0, -30], foreR: [-30, 0, 0], jaw: [12, 0, 0], root: [0, -5, 0] }, 'snap'],
    [0.84, { chest: [8, 26, 0], head: [-8, -10, 0], armL: [-60, 0, 20], foreL: [-30, 0, 0], armR: [-150, 0, -46], foreR: [-46, 0, 0], jaw: [32, 0, 0] }],
    [1.0, { chest: [30, -32, 0], head: [10, 18, 0], armL: [-60, 0, 30], foreL: [-30, 0, 0], armR: [-40, 0, 34], foreR: [-10, 0, 0], jaw: [12, 0, 0], root: [0, -5, 0] }, 'snap'],
    [1.5, { ...AM_BASE }],
  ]),
  // rasgado: se agacha con los brazos abiertos y salta a morderte
  mordida: clip('mordida', 1.35, [
    [0, { ...AM_BASE }],
    [0.45, { chest: [-8, 0, 0], head: [-34, 0, 0], jaw: [42, 0, 0], armL: [-30, 0, 72], foreL: [-30, 0, 0], armR: [-30, 0, -72], foreR: [-30, 0, 0], root: [0, -12, 0], ...LEGS(-32, 64, -32) }],
    [0.6, { chest: [36, 0, 0], head: [-12, 0, 0], jaw: [48, 0, 0], armL: [-100, 0, 14], foreL: [-12, 0, 0], armR: [-100, 0, -14], foreR: [-12, 0, 0], root: [0, 14, 0], ...LEGS(0, 0, 26) }, 'snap'],
    [0.8, { chest: [56, 0, 0], head: [22, 0, 0], jaw: [4, 0, 0], armL: [-70, 0, -24], foreL: [-50, 0, 0], armR: [-70, 0, 24], foreR: [-50, 0, 0], root: [0, -9, 0], ...LEGS(-20, 40, -20) }, 'snap'],
    [1.35, { ...AM_BASE }],
  ]),
  // revienta la mortaja: se convulsiona, empuja con los brazos desde dentro,
  // y salen
  burst: clip('burst', 1.5, [
    [0, { ...AM_BASE }],
    [0.15, { chest: [-14, 18, 0], head: [-30, -20, 0] }, 'snap'],
    [0.3, { chest: [10, -20, 0], head: [16, 24, 0] }, 'snap'],
    [0.45, { chest: [-18, 12, 0], head: [-36, 0, -14], armL: [-20, 0, 40], armR: [-20, 0, -40] }, 'snap'],
    [0.6, { chest: [-26, 0, 0], head: [-48, 0, 0], jaw: [60, 0, 0], armL: [-60, 0, 100], foreL: [-20, 0, 0], armR: [-60, 0, -100], foreR: [-20, 0, 0] }, 'snap'],
    [1.1, { chest: [-20, 0, 0], head: [-40, 0, 0], jaw: [56, 0, 0], armL: [-70, 0, 90], foreL: [-30, 0, 0], armR: [-70, 0, -90], foreR: [-30, 0, 0] }],
    [1.5, { ...AM_BASE, jaw: [24, 0, 0] }],
  ]),
};
const BURST_DUR = 1.5;
// (los estados en que avanza a saltos)
const HOPS = new Set(['chase', 'return', 'dormant', 'alert']);

export const AMORTAJADO_TYPE = {
  name: 'Amortajado',
  build: buildAmortajado,
  hp: 86,
  poise: 30,
  radius: 0.38,
  height: 1.75,
  lockHeight: 1.35,
  walk: 1.25,
  run: 1.9,
  runDist: 4,
  // (no ve: ver perceive)
  sight: 0,
  hear: 6,
  hearsNoise: true,
  turn: 3.2,
  approach: 1.5,
  leash: 20,
  parryDur: 1.6,
  alertTime: 0.9,
  clips: amClips,
  voice: 'amortajado',
  blood: [0.3, 0.16, 0.1],
  attacks: [
    { name: 'cabezazo', clip: amClips.cabezazo, dur: 1.4, min: 0, max: 2.1, hits: [[0.58, 0.72]], dmg: 15, range: 1.75, arc: 70, lunge: [[0.48, 0.68, 4.4]], weight: 3, cd: 0.9, turn: 3.5 },
    {
      name: 'desplome',
      clip: amClips.desplome,
      dur: 3.3,
      min: 0.8,
      max: 2.0,
      hits: [],
      dmg: 26,
      stDmg: 60,
      weight: 1.4,
      cd: 2.4,
      noParry: true,
      trackUntil: 0.45,
      cond: (e) => roomToFall(e),
      events: [
        { t: SLAM.hit, fn: slam },
        { t: SLAM.up, fn: unslam },
      ],
    },
    { name: 'zarpazo', phase: 2, clip: amClips.zarpazo, dur: 1.5, min: 0, max: 2.2, hits: [[0.5, 0.62], [0.95, 1.07]], dmg: 13, range: 2.0, arc: 120, lunge: [[0.42, 0.56, 2.6], [0.88, 1.02, 2.6]], weight: 3, cd: 0.6 },
    { name: 'mordida', phase: 2, clip: amClips.mordida, dur: 1.35, min: 1.6, max: 4.6, hits: [[0.6, 0.82]], dmg: 22, range: 1.6, arc: 80, lunge: [[0.48, 0.78, 6.2]], weight: 2, cd: 1.0, noParry: true, stDmg: 40 },
  ],
  // lo que oye: ver hearRadius (y lo que ya no ve, no lo ve)
  perceive: (e, pl) => {
    if (Math.abs(pl.pos.y - e.pos.y) > 2.4) return false;
    if (e.distTo(pl.pos) > hearRadius(e, pl)) return false;
    return e.game.world.col.lineOfSight(e.pos.x, e.pos.y + 1.4, e.pos.z, pl.pos.x, pl.pos.y + 1.2, pl.pos.z);
  },
  // tendido, al despertar se incorpora (de pie, se vuelve hacia el ruido:
  // el clip de alerta)
  wake: (e) => {
    if (!e.data.lying) return false;
    startRise(e, 0);
    return true;
  },
  // sin oírte va a donde te oyó por última vez, y allí se queda escuchando
  think: (e, pl, d, dt) => {
    const D = e.data;
    if (e.sees) {
      D.heard = [pl.pos.x, pl.pos.y, pl.pos.z];
      return;
    }
    const h = D.heard;
    if (!h) return;
    if (Math.hypot(h[0] - e.pos.x, h[2] - e.pos.z) > 0.7) {
      e.chaseTo(h[0], h[2], e.T.walk, dt, h[1]);
      return 'handled';
    }
    e.vx = damp(e.vx, 0, 8, dt);
    e.vz = damp(e.vz, 0, 8, dt);
    return 'handled';
  },
  states: {
    rise: (e, dt, pl) => {
      const D = e.data;
      const t = e.stT;
      const fx = Math.sin(e.yaw),
        fz = Math.cos(e.yaw);
      if (!D.up) {
        e.vx = e.vz = 0;
        if (t >= RISE_UP) {
          // de pie en el extremo de las andas: el cuerpo, a los pies
          D.up = true;
          D.lying = false;
          e.pos.x += fx * LEG;
          e.pos.z += fz * LEG;
        }
        return;
      }
      if (t >= RISE_HOP && !D.hopped) {
        D.hopped = true;
        // (de unas andas, salta al suelo; del suelo, nada)
        if (e.spec.idle === 'bier') {
          e.body.vy = 3.1;
          e.body.grounded = false;
          e.body.pos.y += 0.05;
          D.hopT = 0.42;
        }
        D.surf = null;
      }
      if (D.hopT > 0) {
        D.hopT = Math.max(0, D.hopT - dt);
        D.hop = 0.3 + 0.5 * (1 - D.hopT / 0.42);
        e.vx = fx * 2.4;
        e.vz = fz * 2.4;
        return;
      }
      e.vx = damp(e.vx, 0, 10, dt);
      e.vz = damp(e.vz, 0, 10, dt);
      if (D.hopped && e.body.grounded) {
        D.hop = 0;
        if (D.hopT === 0) e.onAnimEvent('step');
        // ya está en pie: su sitio, desde ahora, es este
        e.home = { x: e.pos.x, y: e.pos.y, z: e.pos.z, yaw: e.yaw };
        e.idle = 'listen';
        e.state = 'chase';
        e.stT = 0;
        e.cooldown = 0.5;
      }
    },
    burst: (e, dt, pl) => {
      const D = e.data;
      e.vx = damp(e.vx, 0, 6, dt);
      e.vz = damp(e.vz, 0, 6, dt);
      e.yaw = approachAngle(e.yaw, e.angleTo(pl.pos), 1.5 * dt);
      if (!D.torn && e.stT >= 0.55) tear(e);
      if (e.stT >= BURST_DUR) {
        e.state = 'chase';
        e.stT = 0;
        e.cooldown = 0.25;
        e.anim.stop(0.2);
      }
    },
  },
  // (tendido, levantándose, reventando la mortaja o tirado tras el
  // desplome, los golpes no lo doblan)
  preHit: (e, dmg) => (e.data.lying || e.data.down || e.state === 'rise' || e.state === 'burst' ? { dmg, poise: 0 } : null),
  // tirado de bruces, todo golpe es crítico
  critWhen: (e) => !!e.data.down,
  onHit: (e, kind) => {
    const D = e.data;
    const pl = e.game.player;
    D.heard = [pl.pos.x, pl.pos.y, pl.pos.z];
    if (kind === 'kill') return;
    if (D.lying && e.state !== 'rise') startRise(e, 0.3);
    if (!D.torn && e.hp <= e.maxHp * 0.5) D.burstPending = true;
  },
  update: (e, dt, pl) => {
    const D = e.data;
    // la marcha a saltos: el ritmo, según lo que avanza
    const spd = Math.hypot(e.vx, e.vz) * (D.torn ? 1.4 : 1);
    const hopping = HOPS.has(e.state);
    if (hopping && (spd > 0.15 || (D.hop || 0) > 0)) {
      const prev = D.hop || 0;
      D.hopAmp = damp(D.hopAmp ?? 0.6, clamp(spd / 1.25, 0.35, 1.3), 4, dt);
      D.hop = prev + dt * (1.1 + spd * 0.55);
      if (prev < AIR1 && D.hop >= AIR1) e.onAnimEvent('step');
      if (D.hop >= 1) {
        D.hopN = (D.hopN || 0) + 1;
        D.hop = spd > 0.15 ? D.hop - 1 : 0;
      }
    } else if (hopping) D.hop = 0;
    // tendido, de vez en cuando se estremece (y gime)
    if (D.lying && e.state === 'dormant') {
      D.twT = (D.twT ?? 4 + Math.random() * 8) - dt;
      if (D.twT <= 0) {
        D.twT = 6 + Math.random() * 10;
        D.tw = 1;
      }
    }
    if (D.tw) D.tw = Math.max(0, D.tw - dt * 1.6);
    // escuchando, de pie: la cabeza se vuelve hacia donde te oyó
    if (!e.dead && e.state === 'dormant' && !D.lying) {
      const want = D.heard ? clamp((Math.atan2(D.heard[0] - e.pos.x, D.heard[2] - e.pos.z) - e.yaw) / DEG, -50, 50) : 0;
      D.look = damp(D.look || 0, want, 2, dt);
    }
    // a media vida revienta (cuando no esté en mitad de otra cosa)
    if (D.burstPending && !D.torn && !e.dead && (e.state === 'chase' || e.state === 'hurt' || e.state === 'stagger')) {
      D.burstPending = false;
      e.state = 'burst';
      e.stT = 0;
      e.atk = null;
      e.anim.play(amClips.burst, { blend: 0.05 });
      e.game.audio && e.game.audio.enemyVoice(e, 'burst');
    }
  },
  // (sólo avanza en el aire de cada salto; rasgado, más deprisa)
  moveMul: (e) => (HOPS.has(e.state) && !e.data.hopT ? hopK(e.data.hop || 0) * (e.data.torn ? 1.4 : 1) : 1),
  loco: (e, t, spd) => {
    const p = {};
    if (e.state === 'dead') return deathPose(e, e.stT, p);
    if (e.state === 'rise') return risePose(e, e.stT, p);
    if (e.state === 'attack' && e.atk && e.atk.name === 'desplome') return slamPose(e, e.stT, p);
    if (e.data.lying) return lyingPose(e, t, p);
    return hopPose(e, t, p);
  },
  idlePose: (e, kind, t, spd) => {
    const p = {};
    if (e.data.lying) return lyingPose(e, t, p);
    if ((e.data.hop || 0) > 0) return hopPose(e, t, p);
    return listenPose(e, t, p);
  },
  onReset: (e) => {
    const s = e.spec;
    const D = e.data;
    // (vuelve a sus andas o a su sitio, entero)
    e.home = { x: s.x, y: s.y, z: s.z, yaw: s.yaw || 0 };
    e.body.pos.set(s.x, s.y, s.z);
    setTorn(e.rig, false);
    D.lying = s.idle === 'bier' || s.idle === 'floor';
    D.surf = D.lying ? s.y : null;
    D.phase = 1;
  },
};
