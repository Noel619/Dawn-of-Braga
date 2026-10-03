// El Empalado y la Bestia de Carne: modelos.
//
// EL EMPALADO. Un caballero de la guarnición de Braga, gigante ya (3,4 m), al
// que los sitiadores clavaron en el portón del Postigo con una pica de asedio:
// le entra por debajo del omóplato derecho y le sale por el vientre, y el
// asta, más larga que él, le sobresale por detrás y por encima del hombro con
// un jirón del estandarte de la ciudad todavía atado. Armadura de placas
// curvas (peto en dos mitades, espaldar, faldar, hombreras de lamas, brazales,
// quijotes, rodilleras y grebas) sobre la cota de malla, la sobreveste roja
// con la cruz blanca hecha jirones, un yelmo de cubo aplastado por arriba (la
// carne rebosa por la abolladura) y, detrás de la rendija, un solo ojo rojo.
// Carga con la cabeza de hierro de un ariete, la de carnero, montada en un
// madero: la empuña a dos manos como una maza.
//
// Cada pieza de armadura es un grupo propio (grp): al ir perdiendo vida se le
// van cayendo (impaled.js) y debajo asoma la carne.
//
// LA BESTIA DE CARNE. Lo que queda cuando se le cae todo: un minotauro de
// músculo desollado, encorvado, con la testuz de toro hecha de hueso y carne,
// cuernos que son astillas de la pica y del yelmo, la columna en cresta, las
// costillas abiertas, pezuñas, brazos que llegan al suelo y restos de la
// armadura y de las cadenas incrustados en la carne.
import * as THREE from 'three';
import { Rig } from './rig.js';
import { DEG } from '../core/util.js';

const V3 = THREE.Vector3;
const _Y = new V3(0, 1, 0);
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

// Euler (grados) que lleva el eje Y local a la dirección d.
function yTo(d) {
  _q.setFromUnitVectors(_Y, new V3(...d).normalize());
  _e.setFromQuaternion(_q, 'XYZ');
  return [_e.x / DEG, _e.y / DEG, _e.z / DEG];
}
// Euler (grados) que lleva el eje Z local a la dirección d (anillos: toros).
const _Z = new V3(0, 0, 1);
function zTo(d) {
  _q.setFromUnitVectors(_Z, new V3(...d).normalize());
  _e.setFromQuaternion(_q, 'XYZ');
  return [_e.x / DEG, _e.y / DEG, _e.z / DEG];
}
// Cilindro (o cono truncado) entre dos puntos: radio ra en a y rb en b.
function rod(a, b, ra, rb, mat, o = {}) {
  const A = new V3(...a),
    B = new V3(...b);
  const d = B.clone().sub(A);
  return { type: 'cyl', s: [rb, ra, d.length()], p: A.add(B).multiplyScalar(0.5).toArray(), r: yTo(d.toArray()), mat, seg: o.seg ?? 6, ...o };
}
// Pieza con su eje Y orientado a lo largo de d, centrada en p.
function along(type, s, p, d, mat, o = {}) {
  return { type, s, p, r: yTo(d), mat, ...o };
}
// Punto a + d·t
const at = (a, d, t) => [a[0] + d[0] * t, a[1] + d[1] * t, a[2] + d[2] * t];
const norm = (d) => {
  const l = Math.hypot(d[0], d[1], d[2]) || 1;
  return [d[0] / l, d[1] / l, d[2] / l];
};

// ======================================================================= EL EMPALADO
// Medidas (m) que usan también las animaciones y la física de la pica.
export const IMP = {
  hipsY: 1.66,
  // la pica en el espacio de su articulación (pecho + [0, 0.55, 0])
  pikeIn: [-0.2, 0.17, -0.33], // entra por la espalda
  pikeOut: [0.17, -0.15, 0.33], // sale por el vientre
  // la cabeza del ariete en el espacio del arma (+z a lo largo del madero)
  ramHead: [0, 0, 2.45],
  ramButt: [0, 0, -0.7],
};
IMP.pikeDir = norm([IMP.pikeOut[0] - IMP.pikeIn[0], IMP.pikeOut[1] - IMP.pikeIn[1], IMP.pikeOut[2] - IMP.pikeIn[2]]);
IMP.pikeRear = at(IMP.pikeIn, IMP.pikeDir, -2.3);

// Agarre a dos manos del ariete (para resolveWeaponArms): la izquierda, más
// cerca del regatón.
export const RAM_GRIP = { hands: 2, grip2: -0.46, gripRange: [-0.72, -0.24], freeL: [0.42, 0.25, 0.3], elbowL: [0.6, -0.7, -0.3], wristMode: 'euler' };

// Perfiles (radio, altura) de las placas torneadas.
const BREAST = [
  [0.35, 0.0],
  [0.41, 0.12],
  [0.46, 0.32],
  [0.475, 0.46],
  [0.452, 0.6],
  [0.37, 0.72],
  [0.25, 0.79],
];
const HELM = [
  [0.248, 0.04],
  [0.257, 0.18],
  [0.254, 0.4],
  [0.238, 0.5],
  [0.2, 0.56],
  [0.12, 0.586],
  [0.002, 0.592],
];

function armParts(side) {
  const L = side === 'L';
  const s = L ? 1 : -1; // +x es la izquierda del personaje
  const arm = 'arm' + side,
    fore = 'fore' + side,
    hand = 'hand' + side;
  const P = [];
  // manga de malla y brazo
  P.push({ j: arm, type: 'box', s: [0.31, 0.64, 0.31], p: [0, -0.3, 0], taper: [0.82, 0.82], mat: 'mailRust' });
  // hombrera: casquete y tres lamas por fuera, con el peto de guarda hacia el cuello
  const pg = 'pauldron' + side;
  // (la izquierda lisa y redonda; la derecha, mayor y con púas: es la del brazo del ariete)
  const big = L ? 1 : 1.12;
  P.push({ j: arm, type: 'sphere', s: [0.3 * big, 0.25 * big, 0.33 * big], sph: [0, 360, 0, 82], p: [s * 0.05, 0.03, 0], r: [0, 0, -s * 26], mat: 'plateRust', ds: true, seg: 10, seg2: 5, grp: pg });
  const th0 = L ? -12 : 168;
  for (let i = 0; i < 3; i++)
    P.push({
      j: arm,
      type: 'cyl',
      s: [(0.25 - i * 0.012) * big, (0.275 - i * 0.012) * big, 0.1],
      theta: [th0, 204],
      p: [s * 0.03, -0.1 - i * 0.075, 0],
      r: [0, 0, -s * (20 - i * 5)],
      mat: 'plateRust',
      ds: true,
      seg: 10,
      grp: pg,
    });
  P.push({ j: arm, type: 'box', s: [0.035, 0.22, 0.36], p: [-s * 0.13, 0.2, 0], r: [0, 0, -s * 8], mat: 'plateRust', grp: pg });
  // remaches de latón
  for (let i = 0; i < 5; i++) {
    const a = (i / 4 - 0.5) * 2.2;
    P.push({ j: arm, type: 'box', s: [0.035, 0.035, 0.035], p: [s * (0.08 + Math.cos(a) * 0.2) * big, 0.13 * big, Math.sin(a) * 0.24 * big], mat: 'bronze', grp: pg });
  }
  if (!L) {
    // púas de la hombrera del brazo del ariete
    for (const [x, z, rz, rx] of [
      [-0.12, 0.08, 26, 12],
      [-0.2, -0.06, 48, -8],
      [-0.05, -0.14, 12, -30],
    ])
      P.push({ j: arm, type: 'cone', s: [0.05, 0.3], p: [x * big, 0.24 * big, z], r: [rx, 0, rz], mat: 'iron', grp: pg });
  }
  // brazal del brazo y codera con su aleta
  const ag = 'armor' + side;
  P.push({ j: arm, type: 'cyl', s: [0.165, 0.152, 0.34], p: [0, -0.36, 0], seg: 8, mat: 'plateRust', grp: ag });
  P.push({ j: arm, type: 'sphere', s: [0.125, 0.12, 0.13], p: [0, -0.6, -0.04], seg: 8, seg2: 5, mat: 'plateRust', grp: ag });
  P.push({ j: arm, type: 'cyl', s: [0.12, 0.12, 0.03], p: [s * 0.11, -0.6, -0.02], r: [0, 0, 90], seg: 8, mat: 'plateRust', grp: ag });
  // antebrazo: malla, brazal con correas y el grillete roto
  P.push({ j: fore, type: 'box', s: [0.25, 0.52, 0.25], p: [0, -0.26, 0], taper: [0.8, 0.8], mat: 'mailRust' });
  P.push({ j: fore, type: 'cyl', s: [0.152, 0.125, 0.42], p: [0, -0.27, 0], seg: 8, mat: 'plateRust', grp: ag });
  for (const y of [-0.13, -0.4]) P.push({ j: fore, type: 'cyl', s: [0.158 - (y < -0.2 ? 0.02 : 0), 0.158 - (y < -0.2 ? 0.02 : 0), 0.045], p: [0, y, 0], seg: 8, mat: 'leather', grp: ag });
  P.push({ j: fore, type: 'cyl', s: [0.15, 0.15, 0.07], p: [0, -0.49, 0], seg: 8, mat: 'iron' });
  for (let i = 0; i < 3; i++) P.push({ j: fore, type: 'torus', s: [0.04, 0.013], p: [s * 0.1, -0.56 - i * 0.065, 0.05], r: [0, i % 2 ? 90 : 0, 0], seg: 6, seg2: 3, mat: 'iron' });
  // guantelete: puño acampanado, mano, nudillos y dedos cerrados
  P.push({ j: hand, type: 'cyl', s: [0.165, 0.12, 0.13], p: [0, 0.02, 0], seg: 8, mat: 'plateRust', grp: ag });
  P.push({ j: hand, type: 'box', s: [0.19, 0.2, 0.15], p: [0, -0.1, 0.0], mat: 'iron' });
  P.push({ j: hand, type: 'box', s: [0.205, 0.05, 0.07], p: [0, -0.17, 0.06], mat: 'plateRust' });
  P.push({ j: hand, type: 'box', s: [0.185, 0.12, 0.1], p: [0, -0.2, 0.1], r: [38, 0, 0], mat: 'iron' });
  P.push({ j: hand, type: 'box', s: [0.06, 0.13, 0.065], p: [s * 0.1, -0.12, 0.08], r: [0, 0, s * 18], mat: 'iron' });
  return P;
}

function legParts(side) {
  const L = side === 'L';
  const s = L ? 1 : -1;
  const leg = 'leg' + side,
    shin = 'shin' + side,
    foot = 'foot' + side;
  const lg = 'legArmor' + side;
  const P = [];
  P.push({ j: leg, type: 'box', s: [0.37, 0.78, 0.39], p: [0, -0.38, 0], taper: [0.8, 0.84], mat: 'mailRust' });
  // quijote (placa del muslo) y escarcela colgando del faldar
  P.push({ j: leg, type: 'cyl', s: [0.205, 0.172, 0.56], theta: [-82, 164], p: [0, -0.4, 0.01], seg: 8, mat: 'plateRust', ds: true, grp: lg });
  P.push({ j: leg, type: 'box', s: [0.31, 0.32, 0.035], p: [s * 0.02, -0.05, 0.225], r: [-13, 0, 0], taper: [1.06, 1], mat: 'plateRust', grp: 'tasset' + side });
  for (const y of [0.04, -0.07]) P.push({ j: leg, type: 'box', s: [0.33, 0.025, 0.04], p: [s * 0.02, y, 0.245], r: [-13, 0, 0], mat: 'bronze', grp: 'tasset' + side });
  // rodillera con aleta, greba y la malla debajo
  P.push({ j: shin, type: 'sphere', s: [0.15, 0.14, 0.125], p: [0, 0.0, 0.1], seg: 8, seg2: 5, mat: 'plateRust', grp: lg });
  P.push({ j: shin, type: 'cyl', s: [0.11, 0.11, 0.025], p: [s * 0.135, 0.0, 0.06], r: [0, 0, 90], seg: 8, mat: 'plateRust', grp: lg });
  P.push({ j: shin, type: 'cyl', s: [0.152, 0.125, 0.7], p: [0, -0.37, 0], seg: 8, mat: 'mailRust' });
  P.push({ j: shin, type: 'cyl', s: [0.172, 0.142, 0.62], p: [0, -0.38, 0.0], seg: 8, mat: 'plateRust', grp: lg });
  // escarpe: empeine, lamas de la puntera y tobillera (la suela a -0.06)
  P.push({ j: foot, type: 'cyl', s: [0.15, 0.172, 0.1], p: [0, 0.06, 0], seg: 8, mat: 'iron' });
  P.push({ j: foot, type: 'box', s: [0.23, 0.12, 0.34], p: [0, 0.0, 0.06], taper: [1.05, 1.05], mat: 'iron' });
  P.push({ j: foot, type: 'box', s: [0.205, 0.09, 0.14], p: [0, -0.015, 0.26], r: [-12, 0, 0], mat: 'plateRust' });
  P.push({ j: foot, type: 'box', s: [0.18, 0.07, 0.1], p: [0, -0.025, 0.36], r: [-18, 0, 0], mat: 'iron' });
  return P;
}

export function impaledDef() {
  const D = IMP;
  const joints = [
    { name: 'hips', pos: [0, D.hipsY, 0] },
    { name: 'chest', parent: 'hips', pos: [0, 0.2, 0] },
    { name: 'head', parent: 'chest', pos: [0, 0.98, 0.1] },
    { name: 'jaw', parent: 'head', pos: [0, 0.17, 0.12] },
    { name: 'armL', parent: 'chest', pos: [0.52, 0.84, -0.02] },
    { name: 'foreL', parent: 'armL', pos: [0, -0.6, 0] },
    { name: 'handL', parent: 'foreL', pos: [0, -0.54, 0] },
    { name: 'armR', parent: 'chest', pos: [-0.52, 0.84, -0.02] },
    { name: 'foreR', parent: 'armR', pos: [0, -0.6, 0] },
    { name: 'handR', parent: 'foreR', pos: [0, -0.54, 0] },
    { name: 'weapon', parent: 'handR', pos: [0, -0.1, 0.02] },
    { name: 'pike', parent: 'chest', pos: [0, 0.55, 0] },
    { name: 'banner', parent: 'pike', pos: at(D.pikeRear, D.pikeDir, 0.28) },
    { name: 'tabF', parent: 'hips', pos: [0, 0.0, 0.33] },
    { name: 'tabB', parent: 'hips', pos: [0, 0.0, -0.31] },
    { name: 'legL', parent: 'hips', pos: [0.21, -0.06, 0] },
    { name: 'shinL', parent: 'legL', pos: [0, -0.8, 0] },
    { name: 'footL', parent: 'shinL', pos: [0, -0.74, 0] },
    { name: 'legR', parent: 'hips', pos: [-0.21, -0.06, 0] },
    { name: 'shinR', parent: 'legR', pos: [0, -0.8, 0] },
    { name: 'footR', parent: 'shinR', pos: [0, -0.74, 0] },
  ];
  const P = [];
  // ------------------------------------------------------------ cadera
  P.push({ j: 'hips', type: 'box', s: [0.8, 0.58, 0.55], p: [0, -0.2, 0], taper: [1.12, 1.1], mat: 'mailRust' });
  P.push({ j: 'hips', type: 'cyl', s: [0.425, 0.425, 0.1], p: [0, 0.06, 0], sc: [1, 1, 0.74], seg: 10, mat: 'leather' });
  P.push({ j: 'hips', type: 'box', s: [0.13, 0.11, 0.035], p: [0, 0.06, 0.325], mat: 'bronze' });
  P.push({ j: 'hips', type: 'box', s: [0.13, 0.15, 0.09], p: [-0.37, -0.04, 0.2], r: [0, -40, 0], mat: 'leather' });
  // misericordia al cinto
  P.push({ j: 'hips', type: 'box', s: [0.05, 0.36, 0.04], p: [0.4, -0.16, 0.12], r: [0, 0, 12], mat: 'leather' });
  P.push({ j: 'hips', type: 'box', s: [0.1, 0.03, 0.04], p: [0.42, 0.04, 0.12], r: [0, 0, 12], mat: 'iron' });
  // faldar: dos lamas
  P.push({ j: 'hips', type: 'cyl', s: [0.44, 0.47, 0.12], theta: [-100, 200], p: [0, -0.04, 0], sc: [1, 1, 0.74], seg: 10, mat: 'plateRust', ds: true, grp: 'fauld' });
  P.push({ j: 'hips', type: 'cyl', s: [0.47, 0.5, 0.12], theta: [-100, 200], p: [0, -0.15, 0], sc: [1, 1, 0.76], seg: 10, mat: 'plateRust', ds: true, grp: 'fauld' });
  // sobreveste: delante y detrás, hecha jirones, con la cruz blanca y sangre
  const tab = (j, len, w, strips, cross) => {
    P.push({ j, type: 'box', s: [w, len, 0.02], p: [0, -len / 2, 0], taper: [0.88, 1], mat: 'clothRed', ds: true, grp: 'tabard' });
    strips.forEach((sl, i) => {
      const x = -w / 2 + ((i + 0.5) / strips.length) * w * 0.88;
      P.push({
        j,
        type: 'box',
        s: [(w / strips.length) * 0.82, sl, 0.02],
        p: [x * 0.92, -len - sl / 2 + 0.03, 0],
        r: [0, 0, (i % 2 ? 1 : -1) * 3],
        taper: [0.45, 1],
        mat: 'clothRed',
        ds: true,
        grp: 'tabard',
      });
    });
    if (cross) {
      P.push({ j, type: 'box', s: [0.08, 0.46, 0.022], p: [0, -0.36, 0.004], mat: 'clothWhite', ds: true, grp: 'tabard' });
      P.push({ j, type: 'box', s: [0.32, 0.08, 0.022], p: [0, -0.25, 0.004], mat: 'clothWhite', ds: true, grp: 'tabard' });
    }
  };
  tab('tabF', 0.8, 0.5, [0.22, 0.36, 0.14, 0.3], true);
  P.push({ j: 'tabF', type: 'box', s: [0.18, 0.34, 0.024], p: [0.09, -0.22, 0.006], r: [0, 0, 8], mat: 'blood', ds: true, grp: 'tabard' });
  tab('tabB', 0.92, 0.56, [0.3, 0.12, 0.42, 0.2, 0.34], false);
  P.push({ j: 'tabB', type: 'box', s: [0.22, 0.5, 0.024], p: [-0.1, -0.3, -0.006], mat: 'blood', ds: true, grp: 'tabard' });

  // ------------------------------------------------------------ torso
  // tronco de malla: ancho de hombros, estrecho de cintura (redondo: las
  // placas lo cubren sin que asomen esquinas)
  P.push({ j: 'chest', type: 'cyl', s: [0.47, 0.37, 1.0], p: [0, 0.46, -0.02], sc: [1, 1, 0.64], seg: 10, mat: 'mailRust' });
  // peto en dos mitades (la izquierda salta primero), espaldar y bajo vientre
  P.push({ j: 'chest', type: 'lathe', points: BREAST, phi: [0, 90], p: [0, 0.2, 0], sc: [1, 1, 0.72], seg: 6, mat: 'plateRust', ds: true, grp: 'breastL' });
  P.push({ j: 'chest', type: 'lathe', points: BREAST, phi: [-90, 90], p: [0, 0.2, 0], sc: [1, 1, 0.72], seg: 6, mat: 'plateRust', ds: true, grp: 'breastR' });
  P.push({ j: 'chest', type: 'box', s: [0.045, 0.58, 0.035], p: [-0.005, 0.5, 0.33], r: [-7, 0, 0], mat: 'plateRust', grp: 'breastR' });
  P.push({ j: 'chest', type: 'lathe', points: BREAST.map(([r, y]) => [r * 0.98, y]), phi: [90, 180], p: [0, 0.2, -0.02], sc: [1, 1, 0.76], seg: 8, mat: 'plateRust', ds: true, grp: 'back' });
  P.push({
    j: 'chest',
    type: 'lathe',
    points: [
      [0.37, 0.0],
      [0.425, 0.1],
      [0.435, 0.25],
    ],
    phi: [-72, 144],
    p: [0, 0.0, 0],
    sc: [1, 1, 0.76],
    seg: 6,
    mat: 'plateRust',
    ds: true,
    grp: 'plackart',
  });
  // cuello: gola de dos lamas
  P.push({ j: 'chest', type: 'cyl', s: [0.25, 0.31, 0.12], p: [0, 0.94, 0.06], seg: 8, mat: 'plateRust', grp: 'gorget' });
  P.push({ j: 'chest', type: 'cyl', s: [0.23, 0.26, 0.1], p: [0, 1.02, 0.07], seg: 8, mat: 'plateRust', grp: 'gorget' });
  // carne que rebosa por las juntas (y la que hay bajo la hombrera izquierda)
  for (const [x, y, z, sx, sy, sz] of [
    [0.44, 0.52, 0.02, 0.14, 0.17, 0.18],
    [-0.46, 0.38, 0.06, 0.1, 0.14, 0.12],
    [0.02, 0.94, -0.16, 0.18, 0.08, 0.12],
    [0.5, 0.82, 0.0, 0.2, 0.17, 0.2],
    [-0.42, 0.8, -0.08, 0.16, 0.14, 0.16],
    [0.2, 0.08, 0.3, 0.12, 0.08, 0.06],
  ])
    P.push({ j: 'chest', type: 'ico', s: [sx, sy, sz], p: [x, y, z], mat: 'flesh', detail: 1 });
  // la cadena de las argollas del portón, cruzada como un tahalí
  {
    const a = [-0.36, 0.86, 0.26],
      b = [0.33, 0.04, 0.31];
    for (let i = 0; i < 12; i++) {
      const u = (i + 0.5) / 12;
      const y = a[1] + (b[1] - a[1]) * u;
      // pegada al peto (algo más fuera a media altura)
      const z = 0.31 + Math.sin(Math.PI * u) * 0.05;
      P.push({ j: 'chest', type: 'torus', s: [0.045, 0.014], p: [a[0] + (b[0] - a[0]) * u, y, z], r: [i % 2 ? 90 : 0, 0, -48], seg: 6, seg2: 3, mat: 'iron' });
    }
  }
  // clavos de herrar el portón, todavía clavados en él
  const nail = (j, p0, d0, len, grp) => {
    const dn = norm(d0);
    P.push({ ...rod(at(p0, dn, -0.08), at(p0, dn, len), 0.026, 0.018, 'iron', { seg: 4 }), j, grp });
    P.push({ ...along('cyl', [0.06, 0.06, 0.03], at(p0, dn, len), dn, 'iron', { seg: 6 }), j, grp });
    P.push({ ...along('box', [0.05, 0.12, 0.012], at(p0, [0, -1, 0], 0.07), [0, 1, 0], 'blood'), j, grp });
  };
  nail('chest', [0.34, 0.62, 0.22], [0.4, 0.2, 1], 0.26, 'breastL');
  nail('chest', [-0.3, 0.2, 0.28], [-0.5, -0.1, 1], 0.22, 'breastR');
  // sangre que chorrea de la herida por el peto
  for (const [x, y, l, rz] of [
    [0.15, 0.24, 0.32, 4],
    [0.21, 0.18, 0.42, -6],
    [0.1, 0.28, 0.2, 10],
  ])
    P.push({ j: 'chest', type: 'box', s: [0.04, l, 0.012], p: [x, y, 0.335], r: [-14, 0, rz], mat: 'blood', grp: 'breastL' });
  // flechas clavadas en el espaldar y en la hombrera
  const arrow = (j, p, d, len, grp) => {
    const dn = norm(d);
    const tip = at(p, dn, len);
    P.push({ ...rod(p, tip, 0.013, 0.013, 'wooddark'), j, grp });
    P.push({ ...along('box', [0.07, 0.12, 0.006], at(p, dn, len - 0.06), dn, 'clothWhite'), j, grp });
    P.push({ ...along('box', [0.006, 0.12, 0.07], at(p, dn, len - 0.06), dn, 'clothWhite'), j, grp });
  };
  arrow('chest', [0.18, 0.62, -0.33], [0.25, 0.35, -1], 0.55, 'back');
  arrow('chest', [-0.08, 0.36, -0.34], [-0.3, -0.1, -1], 0.42, 'back');
  arrow('chest', [0.3, 0.3, -0.3], [0.5, 0.25, -1], 0.5, 'back');

  // ------------------------------------------------------------ la pica
  {
    const j = 'pike';
    const d = D.pikeDir;
    const rear = D.pikeRear;
    const out = D.pikeOut;
    const shaftEnd = at(out, d, 0.32);
    P.push({ ...rod(rear, shaftEnd, 0.052, 0.048, 'wooddark', { seg: 7 }), j });
    // la sangre empapa el asta a la salida y en la entrada
    P.push({ ...rod(at(out, d, -0.05), shaftEnd, 0.056, 0.052, 'blood', { seg: 7 }), j });
    P.push({ ...rod(at(D.pikeIn, d, -0.18), at(D.pikeIn, d, 0.02), 0.057, 0.057, 'blood', { seg: 7 }), j });
    // cubo de hierro, aletas y moharra en hoja de laurel
    const sock = at(shaftEnd, d, 0.08);
    P.push({ ...rod(at(shaftEnd, d, -0.04), at(shaftEnd, d, 0.13), 0.06, 0.05, 'iron', { seg: 7 }), j });
    P.push({ ...along('box', [0.34, 0.035, 0.035], sock, [d[2], 0, -d[0]], 'iron'), j });
    P.push({ ...along('sphere', [0.085, 0.36, 0.024], at(shaftEnd, d, 0.33), d, 'iron', { seg: 6, seg2: 6 }), j });
    P.push({ ...along('sphere', [0.07, 0.24, 0.028], at(shaftEnd, d, 0.26), d, 'blood', { seg: 6, seg2: 6 }), j });
    // el trozo del portón del Postigo al que lo clavaron: se lo arrancó con
    // él y lo lleva ensartado en el asta, a la espalda (tablones, flejes y
    // clavos de hierro)
    {
      const c = at(D.pikeIn, d, -0.62);
      const side = norm([d[2], 0, -d[0]]);
      const up = norm([-d[0] * d[1], 1 - d[1] * d[1], -d[2] * d[1]]);
      const rot = (() => {
        const m = new THREE.Matrix4().makeBasis(new V3(...side), new V3(...up), new V3(...d));
        _e.setFromRotationMatrix(m, 'XYZ');
        return [_e.x / DEG, _e.y / DEG, _e.z / DEG];
      })();
      const off = (a, b) => [c[0] + side[0] * a + up[0] * b, c[1] + side[1] * a + up[1] * b, c[2] + side[2] * a + up[2] * b];
      for (let i = 0; i < 4; i++) {
        const w = 0.2,
          h = [0.86, 0.7, 0.92, 0.6][i];
        P.push({ j, type: 'box', s: [w - 0.012, h, 0.07], p: off(-0.3 + i * 0.2, (i % 2 ? -0.06 : 0.04) + (h - 0.8) * 0.3), r: rot, mat: 'planks', grp: 'door' });
      }
      for (const b of [-0.22, 0.2]) P.push({ j, type: 'box', s: [0.78, 0.07, 0.085], p: off(-0.0, b), r: rot, mat: 'iron', grp: 'door' });
      for (const [a, b] of [
        [-0.3, -0.22],
        [-0.1, 0.2],
        [0.1, -0.22],
        [0.3, 0.2],
        [-0.3, 0.2],
        [0.1, 0.2],
      ])
        P.push({ j, type: 'box', s: [0.05, 0.05, 0.11], p: off(a, b), r: rot, mat: 'iron', grp: 'door' });
    }
    // regatón de hierro y el estandarte atado al final del asta
    P.push({ ...rod(at(rear, d, -0.12), at(rear, d, 0.06), 0.03, 0.055, 'iron', { seg: 6 }), j });
    P.push({ ...rod(at(rear, d, 0.22), at(rear, d, 0.34), 0.062, 0.062, 'leather', { seg: 6 }), j });
    // carne hinchada alrededor de la herida, delante y detrás
    for (const [c, k] of [
      [out, 1],
      [D.pikeIn, 0.85],
    ]) {
      P.push({ j, type: 'torus', s: [0.085 * k, 0.045 * k], p: c, r: zTo(d), mat: 'flesh', seg: 8, seg2: 4 });
      P.push({ j, type: 'ico', s: [0.1 * k, 0.07 * k, 0.09 * k], p: at(c, [0, -1, 0], 0.06), mat: 'flesh', detail: 1 });
    }
  }
  // jirones del estandarte de la ciudad (cuelgan de su articulación)
  for (const [x, len, w, rz] of [
    [0.0, 1.05, 0.34, 0],
    [0.1, 0.72, 0.18, 6],
    [-0.12, 0.86, 0.16, -8],
  ]) {
    P.push({ j: 'banner', type: 'box', s: [0.018, len, w], p: [x * 0.2, -len / 2 + 0.03, x], r: [0, 0, rz], taper: [0.55, 0.7], mat: 'clothRed', ds: true });
  }
  P.push({ j: 'banner', type: 'box', s: [0.02, 0.3, 0.22], p: [0.01, -0.3, 0.02], mat: 'clothWhite', ds: true });

  // ------------------------------------------------------------ cabeza
  P.push({ j: 'head', type: 'cyl', s: [0.19, 0.23, 0.24], p: [0, 0.08, -0.01], seg: 8, mat: 'mailRust' });
  // cara (oculta tras la visera hasta que se le cae): carne, un ojo y la boca vertical
  P.push({ j: 'head', type: 'sphere', s: [0.2, 0.24, 0.18], p: [0, 0.3, 0.05], seg: 7, seg2: 5, mat: 'skinCorrupt' });
  P.push({ j: 'head', type: 'ico', s: [0.1, 0.09, 0.08], p: [-0.1, 0.26, 0.15], mat: 'flesh', detail: 1 });
  P.push({ j: 'head', type: 'box', s: [0.07, 0.2, 0.03], p: [0.01, 0.2, 0.215], r: [0, 0, 7], mat: 'black' });
  for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) P.push({ j: 'head', type: 'box', s: [0.025, 0.018, 0.02], p: [0.01 + sx * 0.03, 0.13 + i * 0.045, 0.225], mat: 'bone' });
  P.push({ j: 'head', type: 'box', s: [0.06, 0.035, 0.02], p: [-0.085, 0.36, 0.2], mat: 'black' });
  // el único ojo (se ve por la rendija)
  P.push({ j: 'head', type: 'sphere', s: [0.032], p: [0.085, 0.36, 0.198], mat: 'redGlow' });
  // mandíbula (sólo se ve sin visera)
  P.push({ j: 'jaw', type: 'box', s: [0.19, 0.07, 0.15], p: [0, -0.02, 0.03], mat: 'skinCorrupt' });
  for (let i = 0; i < 4; i++) P.push({ j: 'jaw', type: 'box', s: [0.022, 0.03, 0.02], p: [-0.045 + i * 0.03, 0.025, 0.1], mat: 'bone' });
  // yelmo de cubo: casco (atrás y lados) y visera (delante)
  P.push({ j: 'head', type: 'lathe', points: HELM, phi: [55, 250], p: [0, 0, 0.02], seg: 8, mat: 'plateRust', ds: true, grp: 'helm' });
  P.push({ j: 'head', type: 'lathe', points: HELM, phi: [-55, 110], p: [0, 0, 0.02], seg: 8, mat: 'plateRust', ds: true, grp: 'visor' });
  // rendijas, el refuerzo vertical, la cruz de latón y los respiraderos
  const onHelm = (x, y, dz = 0.004) => {
    const z = Math.sqrt(Math.max(0, 0.255 * 0.255 - x * x)) + 0.02 + dz;
    return { p: [x, y, z], r: [0, Math.atan2(x, z - 0.02) / DEG, 0] };
  };
  for (const x of [-0.085, 0.085]) P.push({ j: 'head', type: 'box', s: [0.12, 0.038, 0.03], ...onHelm(x, 0.36), mat: 'black', grp: 'visor' });
  P.push({ j: 'head', type: 'box', s: [0.045, 0.42, 0.03], ...onHelm(0, 0.27, 0.01), mat: 'iron', grp: 'visor' });
  P.push({ j: 'head', type: 'box', s: [0.035, 0.13, 0.02], ...onHelm(0, 0.47, 0.014), mat: 'bronze', grp: 'visor' });
  P.push({ j: 'head', type: 'box', s: [0.11, 0.035, 0.02], ...onHelm(0, 0.49, 0.014), mat: 'bronze', grp: 'visor' });
  for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) P.push({ j: 'head', type: 'box', s: [0.022, 0.022, 0.02], ...onHelm(-0.07 - i * 0.045, 0.14 + k * 0.05), mat: 'black', grp: 'visor' });
  // la abolladura de arriba: chapa rota y la carne que rebosa
  P.push({ j: 'head', type: 'ico', s: [0.17, 0.12, 0.15], p: [-0.07, 0.6, -0.03], mat: 'flesh', detail: 1 });
  P.push({ j: 'head', type: 'box', s: [0.16, 0.02, 0.12], p: [-0.16, 0.58, 0.05], r: [12, 16, 32], mat: 'plateRust', grp: 'helm' });
  P.push({ j: 'head', type: 'box', s: [0.12, 0.02, 0.1], p: [0.02, 0.6, -0.14], r: [-24, -10, -8], mat: 'plateRust', grp: 'helm' });

  // ------------------------------------------------------------ brazos y piernas
  P.push(...armParts('L'), ...armParts('R'));
  P.push(...legParts('L'), ...legParts('R'));

  // ------------------------------------------------------------ el ariete
  {
    const j = 'weapon';
    P.push({ j, type: 'cyl', s: [0.075, 0.085, 2.67], r: [90, 0, 0], p: [0, 0, 0.715], seg: 7, mat: 'wooddark' });
    for (const z of [-0.56, 0.42, 1.24, 1.86]) P.push({ j, type: 'cyl', s: [0.094, 0.094, 0.07], r: [90, 0, 0], p: [0, 0, z], seg: 7, mat: 'iron' });
    for (const z of [0.0, -0.46]) P.push({ j, type: 'cyl', s: [0.089, 0.089, 0.28], r: [90, 0, 0], p: [0, 0, z], seg: 7, mat: 'leather' });
    P.push({ j, type: 'cone', s: [0.085, 0.24], r: [-90, 0, 0], p: [0, 0, -0.74], seg: 6, mat: 'iron' });
    // cadena enrollada junto a la cabeza
    for (let i = 0; i < 4; i++) P.push({ j, type: 'torus', s: [0.1, 0.016], r: [i % 2 ? 0 : 90, 30 * i, 0], p: [0, 0, 1.96 + i * 0.03], seg: 6, seg2: 3, mat: 'iron' });
    // cabeza de carnero de hierro
    P.push({ j, type: 'cyl', s: [0.135, 0.1, 0.26], r: [90, 0, 0], p: [0, 0, 2.1], seg: 8, mat: 'iron' });
    P.push({ j, type: 'box', s: [0.35, 0.37, 0.46], p: [0, 0.03, 2.44], taper: [0.88, 0.92], mat: 'iron' });
    P.push({ j, type: 'box', s: [0.37, 0.13, 0.32], p: [0, 0.21, 2.4], mat: 'iron' });
    P.push({ j, type: 'box', s: [0.27, 0.27, 0.22], p: [0, -0.04, 2.75], taper: [0.84, 0.84], mat: 'iron' });
    for (const s of [-1, 1]) {
      P.push({ j, type: 'torus', s: [0.145, 0.052], p: [s * 0.21, 0.1, 2.34], r: [0, 90, 0], seg: 10, seg2: 5, mat: 'iron' });
      P.push({ j, type: 'cone', s: [0.05, 0.17], p: [s * 0.23, -0.07, 2.5], r: [150, 0, s * -20], seg: 5, mat: 'iron' });
      P.push({ j, type: 'box', s: [0.07, 0.03, 0.02], p: [s * 0.1, 0.1, 2.68], mat: 'black' });
    }
    for (let i = 0; i < 3; i++) P.push({ j, type: 'cone', s: [0.042, 0.2], p: [0, 0.33, 2.27 + i * 0.13], r: [-14, 0, 0], seg: 5, mat: 'iron' });
    P.push({ j, type: 'box', s: [0.28, 0.1, 0.24], p: [0, -0.15, 2.76], mat: 'blood' });
  }
  return { joints, parts: P };
}

export function buildImpaled() {
  return new Rig(impaledDef());
}

// ======================================================================= LA BESTIA DE CARNE
// Medidas: de pie mide casi cuatro metros; encorvada, algo menos. Patas de
// toro (el corvejón alto, la pezuña hendida), brazos que llegan al suelo.
export const BEAST = {
  hipsY: 1.9,
  headK: 1.22,
  // la pica partida que aún le sale por la espalda (espacio del pecho)
  stub: [-0.26, 0.62, -0.34],
};

function beastArm(side) {
  const L = side === 'L';
  const s = L ? 1 : -1;
  const arm = 'arm' + side,
    fore = 'fore' + side,
    hand = 'hand' + side;
  const P = [];
  P.push({ j: arm, type: 'sphere', s: [0.36, 0.32, 0.36], p: [s * 0.04, -0.02, 0], seg: 8, seg2: 6, mat: 'flesh' });
  P.push({ j: arm, type: 'box', s: [0.46, 0.92, 0.46], p: [0, -0.44, 0], taper: [0.78, 0.84], mat: 'flesh' });
  P.push({ j: arm, type: 'ico', s: [0.19, 0.3, 0.19], p: [0, -0.4, 0.15], mat: 'flesh', detail: 1 });
  P.push({ j: arm, type: 'ico', s: [0.16, 0.26, 0.16], p: [s * 0.12, -0.5, -0.12], mat: 'fleshStatic', detail: 1 });
  // el codo: hueso que asoma
  P.push({ j: arm, type: 'ico', s: [0.12, 0.13, 0.12], p: [0, -0.86, -0.12], mat: 'bone' });
  P.push({ j: arm, type: 'cone', s: [0.05, 0.22], p: [0, -0.88, -0.24], r: [-110, 0, 0], seg: 5, mat: 'bone' });
  P.push({ j: fore, type: 'sphere', s: [0.25, 0.3, 0.25], p: [0, -0.16, 0], seg: 8, seg2: 6, mat: 'hide' });
  P.push({ j: fore, type: 'box', s: [0.36, 0.78, 0.36], p: [0, -0.4, 0], taper: [0.62, 0.7], mat: 'hide' });
  // desgarros: la carne asoma por la piel
  for (const [x, y, z] of [
    [0.13, -0.3, 0.12],
    [-0.12, -0.46, 0.1],
    [0.02, -0.24, -0.16],
  ])
    P.push({ j: fore, type: 'ico', s: [0.09, 0.16, 0.06], p: [x, y, z], mat: 'flesh', detail: 1 });
  // mano: palma, cuatro dedos largos con garras de hueso y el pulgar
  P.push({ j: hand, type: 'box', s: [0.34, 0.26, 0.28], p: [0, -0.1, 0.03], mat: 'hide' });
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * 0.08;
    P.push({ j: hand, type: 'box', s: [0.075, 0.3, 0.085], p: [x, -0.34, 0.08], r: [22, 0, -x * 40], mat: 'hide' });
    P.push({ j: hand, type: 'cone', s: [0.04, 0.17], p: [x * 1.05, -0.53, 0.15], r: [205, 0, -x * 40], seg: 4, mat: 'bone' });
  }
  P.push({ j: hand, type: 'box', s: [0.08, 0.22, 0.09], p: [s * 0.17, -0.18, 0.12], r: [30, 0, s * 25], mat: 'hide' });
  if (!L) {
    // el grillete del portón, todavía en la muñeca, con su cadena
    P.push({ j: fore, type: 'cyl', s: [0.24, 0.24, 0.1], p: [0, -0.72, 0], seg: 8, mat: 'iron' });
    for (let i = 0; i < 5; i++) P.push({ j: fore, type: 'torus', s: [0.055, 0.017], p: [-0.18, -0.78 - i * 0.09, 0.06], r: [0, i % 2 ? 90 : 0, 0], seg: 6, seg2: 3, mat: 'iron' });
  }
  return P;
}

function beastLeg(side) {
  const L = side === 'L';
  const s = L ? 1 : -1;
  const leg = 'leg' + side,
    shin = 'shin' + side,
    foot = 'foot' + side;
  const P = [];
  P.push({ j: leg, type: 'box', s: [0.52, 0.98, 0.58], p: [0, -0.44, 0.02], taper: [0.72, 0.78], mat: 'flesh' });
  P.push({ j: leg, type: 'ico', s: [0.22, 0.34, 0.2], p: [s * 0.04, -0.36, 0.2], mat: 'flesh', detail: 1 });
  P.push({ j: leg, type: 'ico', s: [0.2, 0.28, 0.2], p: [s * 0.16, -0.5, -0.1], mat: 'fleshStatic', detail: 1 });
  P.push({ j: leg, type: 'cyl', s: [0.27, 0.22, 0.6], theta: [s > 0 ? 40 : 200, 120], p: [0, -0.52, 0.0], seg: 8, mat: 'hide', ds: true });
  // la rodilla (la babilla, como en las reses) y la caña corta
  P.push({ j: shin, type: 'ico', s: [0.16, 0.15, 0.15], p: [0, 0.0, 0.13], mat: 'bone' });
  P.push({ j: shin, type: 'box', s: [0.34, 0.62, 0.36], p: [0, -0.28, -0.03], taper: [0.68, 0.72], mat: 'hide' });
  P.push({ j: shin, type: 'ico', s: [0.1, 0.2, 0.07], p: [s * 0.1, -0.22, 0.13], mat: 'flesh', detail: 1 });
  P.push({ j: shin, type: 'box', s: [0.05, 0.5, 0.05], p: [0, -0.28, -0.2], mat: 'bone' });
  // corvejón, metatarso inclinado y pezuña hendida (la suela a -0.32)
  P.push({ j: foot, type: 'ico', s: [0.12, 0.12, 0.13], p: [0, 0.0, -0.04], mat: 'bone' });
  P.push({ j: foot, type: 'box', s: [0.21, 0.36, 0.22], p: [0, -0.13, 0.08], r: [-26, 0, 0], mat: 'hide' });
  for (const x of [-0.075, 0.075]) P.push({ j: foot, type: 'box', s: [0.14, 0.15, 0.3], p: [x, -0.245, 0.22], taper: [1.05, 1.0], r: [0, x * 60, 0], mat: 'black' });
  P.push({ j: foot, type: 'box', s: [0.06, 0.06, 0.08], p: [0, -0.2, 0.0], mat: 'black' });
  return P;
}

export function beastDef() {
  const D = BEAST;
  const joints = [
    { name: 'hips', pos: [0, D.hipsY, 0] },
    { name: 'spine', parent: 'hips', pos: [0, 0.32, 0] },
    { name: 'chest', parent: 'spine', pos: [0, 0.48, 0.04] },
    { name: 'neck', parent: 'chest', pos: [0, 0.62, 0.34] },
    { name: 'head', parent: 'neck', pos: [0, 0.12, 0.28] },
    { name: 'jaw', parent: 'head', pos: [0, -0.1 * D.headK, 0.12 * D.headK] },
    { name: 'armL', parent: 'chest', pos: [0.76, 0.5, 0.0] },
    { name: 'foreL', parent: 'armL', pos: [0, -0.88, 0] },
    { name: 'handL', parent: 'foreL', pos: [0, -0.78, 0] },
    { name: 'armR', parent: 'chest', pos: [-0.76, 0.5, 0.0] },
    { name: 'foreR', parent: 'armR', pos: [0, -0.88, 0] },
    { name: 'handR', parent: 'foreR', pos: [0, -0.78, 0] },
    { name: 'legL', parent: 'hips', pos: [0.33, -0.1, 0] },
    { name: 'shinL', parent: 'legL', pos: [0, -0.92, 0] },
    { name: 'footL', parent: 'shinL', pos: [0, -0.56, 0] },
    { name: 'legR', parent: 'hips', pos: [-0.33, -0.1, 0] },
    { name: 'shinR', parent: 'legR', pos: [0, -0.92, 0] },
    { name: 'footR', parent: 'shinR', pos: [0, -0.56, 0] },
    { name: 'tail', parent: 'hips', pos: [0, 0.12, -0.42] },
    { name: 'tail2', parent: 'tail', pos: [0, -0.1, -0.56] },
  ];
  const P = [];
  // ------------------------------------------------------------ cadera
  P.push({ j: 'hips', type: 'box', s: [0.9, 0.58, 0.64], p: [0, -0.06, -0.02], taper: [0.86, 0.9], mat: 'flesh' });
  for (const s of [-1, 1]) P.push({ j: 'hips', type: 'ico', s: [0.3, 0.3, 0.26], p: [s * 0.22, -0.12, -0.24], mat: 'flesh', detail: 1 });
  // restos de la malla, del cinto y de la sobreveste
  P.push({ j: 'hips', type: 'box', s: [0.92, 0.26, 0.68], p: [0, -0.3, 0], taper: [1.08, 1.06], mat: 'mailRust' });
  P.push({ j: 'hips', type: 'cyl', s: [0.49, 0.49, 0.1], p: [0, 0.08, 0], sc: [1, 1, 0.74], seg: 10, mat: 'leather' });
  for (const [x, z, len, w, rz] of [
    [0.12, 0.36, 0.7, 0.2, 6],
    [-0.14, 0.35, 0.5, 0.16, -8],
    [0.18, -0.36, 0.62, 0.22, -5],
    [-0.1, -0.37, 0.8, 0.18, 9],
  ])
    P.push({ j: 'hips', type: 'box', s: [w, len, 0.02], p: [x, -0.1 - len / 2, z], r: [z > 0 ? -8 : 8, 0, rz], taper: [0.5, 1], mat: 'clothRed', ds: true });
  P.push({ ...rod([0.0, 0.0, -0.3], [0.0, -0.05, -0.42], 0.1, 0.12, 'flesh'), j: 'hips' });
  // ------------------------------------------------------------ vientre
  P.push({ j: 'spine', type: 'sphere', s: [0.44, 0.36, 0.35], p: [0, 0.22, 0.03], seg: 9, seg2: 6, mat: 'flesh' });
  P.push({ j: 'spine', type: 'box', s: [0.72, 0.44, 0.56], p: [0, 0.18, -0.02], taper: [1.05, 0.95], mat: 'fleshStatic' });
  for (let r = 0; r < 3; r++) for (const x of [-0.11, 0.11]) P.push({ j: 'spine', type: 'box', s: [0.18, 0.15, 0.06], p: [x, 0.06 + r * 0.17, 0.34], mat: 'fleshStatic' });
  // donde estuvo la pica: un agujero negro con los bordes abiertos
  P.push({ j: 'spine', type: 'ico', s: [0.13, 0.15, 0.06], p: [0.17, 0.3, 0.335], mat: 'black' });
  P.push({ j: 'spine', type: 'torus', s: [0.14, 0.05], p: [0.17, 0.3, 0.33], seg: 8, seg2: 4, mat: 'blood' });
  // ------------------------------------------------------------ pecho y joroba
  // caja torácica, trapecios hasta la nuca, dorsales y la joroba de músculo
  P.push({ j: 'chest', type: 'sphere', s: [0.64, 0.56, 0.46], p: [0, 0.4, 0.0], seg: 10, seg2: 7, mat: 'flesh' });
  for (const s of [-1, 1]) {
    P.push({ j: 'chest', type: 'box', s: [0.56, 0.3, 0.56], p: [s * 0.38, 0.8, -0.1], r: [0, 0, -s * 30], taper: [1.1, 1.05], mat: 'flesh' });
    P.push({ j: 'chest', type: 'ico', s: [0.3, 0.44, 0.3], p: [s * 0.5, 0.26, -0.14], mat: 'fleshStatic', detail: 1 });
    P.push({ j: 'chest', type: 'sphere', s: [0.34, 0.25, 0.17], p: [s * 0.29, 0.5, 0.36], seg: 8, seg2: 5, mat: 'flesh' });
    // jirones de piel que cuelgan de los hombros
    P.push({ j: 'chest', type: 'box', s: [0.32, 0.5, 0.02], p: [s * 0.52, 0.42, 0.28], r: [-10, s * 30, s * 8], taper: [0.5, 1], mat: 'hide', ds: true });
  }
  P.push({ j: 'chest', type: 'sphere', s: [0.64, 0.48, 0.54], p: [0, 0.68, -0.32], seg: 9, seg2: 6, mat: 'flesh' });
  // la piel que aún le queda en la joroba, tensa y rota
  P.push({ j: 'chest', type: 'sphere', s: [0.655, 0.49, 0.555], sph: [100, 160, 0, 70], p: [0, 0.68, -0.32], seg: 9, seg2: 5, mat: 'hide', ds: true });
  // surcos oscuros entre los músculos
  P.push({ j: 'chest', type: 'box', s: [0.04, 0.5, 0.06], p: [0, 0.4, 0.43], mat: 'blood' });
  // costillas a la vista en los costados
  for (let i = 0; i < 4; i++)
    for (const s of [-1, 1]) {
      const y = 0.1 + i * 0.13;
      P.push({ j: 'chest', type: 'box', s: [0.05, 0.05, 0.56 - i * 0.04], p: [s * (0.52 - i * 0.015), y, 0.0], r: [0, 0, s * (12 + i * 4)], mat: 'bone' });
    }
  P.push({ j: 'chest', type: 'box', s: [0.62, 0.42, 0.02], p: [0, 0.22, 0.0], mat: 'black' });
  // cresta de púas de hueso por el espinazo
  for (let i = 0; i < 6; i++) P.push({ j: 'chest', type: 'cone', s: [0.07 - i * 0.006, 0.36 - i * 0.03], p: [0, 0.95 - i * 0.17, -0.48 + i * 0.03], r: [-130 + i * 6, 0, 0], seg: 5, mat: 'bone' });
  for (let i = 0; i < 3; i++) P.push({ j: 'spine', type: 'cone', s: [0.05, 0.22], p: [0, 0.42 - i * 0.16, -0.34], r: [-120, 0, 0], seg: 5, mat: 'bone' });
  // la pica partida que le sigue saliendo de la espalda
  P.push({ ...rod(D.stub, [D.stub[0] - 0.42, D.stub[1] + 0.52, D.stub[2] - 0.58], 0.055, 0.045, 'wooddark', { seg: 7 }), j: 'chest' });
  P.push({ ...rod([D.stub[0] - 0.4, D.stub[1] + 0.5, D.stub[2] - 0.56], [D.stub[0] - 0.47, D.stub[1] + 0.62, D.stub[2] - 0.6], 0.04, 0.01, 'wooddark', { seg: 5 }), j: 'chest' });
  P.push({ j: 'chest', type: 'ico', s: [0.13, 0.11, 0.12], p: D.stub, mat: 'blood' });
  // la hombrera derecha, hundida en la carne, y la gola rota
  P.push({ j: 'chest', type: 'sphere', s: [0.34, 0.27, 0.36], sph: [180, 200, 0, 70], p: [-0.7, 0.68, 0.0], r: [0, 0, 24], seg: 10, seg2: 5, mat: 'plateRust', ds: true });
  P.push({ j: 'chest', type: 'cyl', s: [0.34, 0.38, 0.12], theta: [-60, 230], p: [0, 0.88, 0.22], r: [20, 0, 0], seg: 9, mat: 'plateRust', ds: true });
  // la cadena del portón, hundida en la carne del pecho
  for (let i = 0; i < 12; i++) {
    const u = (i + 0.5) / 12;
    P.push({ j: 'chest', type: 'torus', s: [0.055, 0.016], p: [-0.52 + u * 1.0, 0.82 - u * 0.78, 0.4 + Math.sin(Math.PI * u) * 0.04], r: [i % 2 ? 90 : 0, 0, -42], seg: 6, seg2: 3, mat: 'iron' });
  }
  // ------------------------------------------------------------ cuello y testuz
  P.push({ j: 'neck', type: 'box', s: [0.56, 0.56, 0.62], p: [0, -0.02, 0.04], r: [48, 0, 0], taper: [1.18, 1.1], mat: 'flesh' });
  P.push({ j: 'neck', type: 'ico', s: [0.22, 0.3, 0.2], p: [0, -0.24, 0.18], mat: 'fleshStatic', detail: 1 });
  // cráneo de toro: hueso por arriba, carne por debajo, morro largo
  P.push({ j: 'head', type: 'box', s: [0.46, 0.32, 0.44], p: [0, -0.02, 0.02], mat: 'flesh' });
  P.push({ j: 'head', type: 'box', s: [0.42, 0.16, 0.42], p: [0, 0.14, 0.04], taper: [0.92, 0.95], mat: 'bone' });
  P.push({ j: 'head', type: 'box', s: [0.31, 0.27, 0.44], p: [0, -0.07, 0.38], taper: [0.86, 0.9], mat: 'hide' });
  P.push({ j: 'head', type: 'box', s: [0.23, 0.07, 0.38], p: [0, 0.07, 0.4], taper: [1, 0.85], mat: 'bone' });
  P.push({ j: 'head', type: 'box', s: [0.48, 0.07, 0.1], p: [0, 0.14, 0.24], mat: 'bone' });
  for (const s of [-1, 1]) {
    // ojos hundidos y encendidos
    P.push({ j: 'head', type: 'box', s: [0.1, 0.08, 0.06], p: [s * 0.17, 0.06, 0.25], mat: 'black' });
    P.push({ j: 'head', type: 'sphere', s: [0.038], p: [s * 0.17, 0.06, 0.27], mat: 'redGlow' });
    P.push({ j: 'head', type: 'box', s: [0.05, 0.05, 0.03], p: [s * 0.055, -0.08, 0.6], mat: 'black' });
    P.push({ j: 'head', type: 'box', s: [0.1, 0.16, 0.05], p: [s * 0.26, 0.04, -0.04], r: [0, s * 40, s * 30], mat: 'flesh' });
    // cuernos: astillas de hueso curvadas hacia fuera, arriba y adelante
    const hp = [
      [s * 0.2, 0.17, 0.0],
      [s * 0.48, 0.27, -0.06],
      [s * 0.76, 0.42, 0.06],
      [s * 0.9, 0.66, 0.28],
      [s * 0.86, 0.84, 0.52],
    ];
    const rr = [0.12, 0.095, 0.07, 0.045, 0.012];
    // (el izquierdo, roto por la punta)
    const n = s > 0 ? 3 : 4;
    for (let i = 0; i < n; i++) P.push({ ...rod(hp[i], hp[i + 1], rr[i], rr[i + 1] + (s > 0 && i === n - 1 ? 0.02 : 0), i === 0 ? 'blood' : 'bone', { seg: 6 }), j: 'head' });
    P.push({ j: 'head', type: 'ico', s: [0.14, 0.1, 0.13], p: [s * 0.22, 0.15, 0.0], mat: 'flesh' });
  }
  // en la punta del cuerno derecho, la moharra de la pica
  P.push({ ...along('sphere', [0.07, 0.24, 0.022], [-0.86, 0.95, 0.66], [0.05, 0.6, 0.8], 'iron', { seg: 6, seg2: 6 }), j: 'head' });
  // la argolla del morro
  P.push({ j: 'head', type: 'torus', s: [0.075, 0.016], p: [0, -0.17, 0.6], r: [90, 0, 0], seg: 8, seg2: 3, mat: 'iron' });
  // dientes de arriba
  for (let i = 0; i < 5; i++) P.push({ j: 'head', type: 'box', s: [0.03, 0.05, 0.025], p: [-0.08 + i * 0.04, -0.2, 0.48], mat: 'bone' });
  // mandíbula
  P.push({ j: 'jaw', type: 'box', s: [0.27, 0.1, 0.4], p: [0, -0.04, 0.24], taper: [1, 0.9], mat: 'flesh' });
  for (let i = 0; i < 5; i++) P.push({ j: 'jaw', type: 'box', s: [0.03, 0.06, 0.025], p: [-0.08 + i * 0.04, 0.03, 0.4], mat: 'bone' });
  P.push({ j: 'jaw', type: 'box', s: [0.2, 0.02, 0.32], p: [0, 0.015, 0.24], mat: 'black' });
  // la testuz, grande como la de un toro de lidia
  for (const q of P)
    if (q.j === 'head' || q.j === 'jaw') {
      q.p = q.p.map((v) => v * BEAST.headK);
      q.s = q.s.map((v) => v * BEAST.headK);
    }
  // ------------------------------------------------------------ brazos, piernas, cola
  P.push(...beastArm('L'), ...beastArm('R'), ...beastLeg('L'), ...beastLeg('R'));
  P.push({ ...rod([0, 0, 0], [0, -0.1, -0.56], 0.11, 0.075, 'flesh', { seg: 7 }), j: 'tail' });
  P.push({ ...rod([0, 0, 0], [0, -0.06, -0.5], 0.07, 0.03, 'flesh', { seg: 6 }), j: 'tail2' });
  P.push({ ...along('cone', [0.045, 0.22], [0, -0.07, -0.58], [0, -0.1, -1], 'bone', { seg: 5 }), j: 'tail2' });
  return { joints, parts: P };
}

export function buildBeast() {
  return new Rig(beastDef());
}
