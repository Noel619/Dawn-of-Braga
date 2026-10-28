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
// A media vida revientan las costuras: se rompen los cordeles, le salen los
// brazos, flacos y grises, con las uñas largas como clavos y jirones de
// lienzo colgando, y la boca cosida se le rasga hasta las orejas.
//
// Las piezas de la mortaja entera van en sus grupos ('cords', 'face1',
// 'arms1') y las de después, en 'torn' (ocultas): ver setTorn().
import * as THREE from 'three';
import { Rig } from './rig.js';
import { humanoidJoints, CORPSE_POSES } from './models.js';
import { DEG } from '../core/util.js';

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
    { j: 'legL', type: 'cyl', s: [0.2, 0.2, 0.035], p: [-0.098, -0.44, 0], sc: [1, 1, 0.5], seg: 10, mat: rope, grp: 'cords' },
    { j: 'shinL', type: 'cyl', s: [0.17, 0.17, 0.035], p: [-0.098, -0.36, 0], sc: [1, 1, 0.48], seg: 10, mat: rope, grp: 'cords' },
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
