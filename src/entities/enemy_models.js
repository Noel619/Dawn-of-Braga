// Modelos de las criaturas: restos humanos, armaduras y deformaciones.
import * as THREE from 'three';
import { Rig } from './rig.js';
import { humanoidJoints, swordParts, feetParts } from './models.js';
import { DEG } from '../core/util.js';

// ------------------------------------------------------------ Penitente
// Flagelante encorvado con capucha de arpillera, clavos en la espalda y hoz.
export function buildPenitent() {
  const joints = humanoidJoints(0.95, { arm: 1.12 });
  const parts = [
    { j: 'hips', type: 'box', s: [0.46, 0.95, 0.36], p: [0, -0.4, 0], taper: [1.5, 1.3], mat: 'burlap' },
    { j: 'hips', type: 'box', s: [0.48, 0.06, 0.38], p: [0, 0.02, 0], mat: 'leather' },
    { j: 'chest', type: 'box', s: [0.42, 0.55, 0.3], p: [0, 0.25, 0], taper: [0.92, 0.9], mat: 'burlap' },
    { j: 'chest', type: 'ico', s: [0.22, 0.2, 0.2], p: [0, 0.42, -0.12], mat: 'burlap' },
    // clavos de penitencia
    ...[
      [-0.12, 0.2, -0.3, 30, 0],
      [0.1, 0.28, -0.2, 20, 20],
      [0.0, 0.42, -0.1, 45, -10],
      [-0.1, 0.5, 0.2, 60, -30],
      [0.14, 0.12, -0.25, 10, 30],
      [0.05, 0.55, 0.3, 70, 10],
      [-0.16, 0.35, 0.1, 40, -40],
    ].map(([x, y, rz, rx, ry]) => ({ j: 'chest', type: 'box', s: [0.025, 0.025, 0.26], p: [x, y, -0.2], r: [rx, ry, rz * 10], mat: 'iron' })),
    // capucha puntiaguda sin rostro
    { j: 'head', type: 'box', s: [0.3, 0.36, 0.34], p: [0, 0.13, 0.02], taper: [1.1, 1.05], mat: 'burlap' },
    { j: 'head', type: 'cone', s: [0.15, 0.36], p: [0, 0.36, -0.1], r: [-35, 0, 0], mat: 'burlap' },
    { j: 'head', type: 'box', s: [0.19, 0.22, 0.03], p: [0, 0.09, 0.185], mat: 'black' },
    { j: 'head', type: 'box', s: [0.028, 0.014, 0.01], p: [-0.045, 0.13, 0.2], mat: 'eyeGlow' },
    { j: 'head', type: 'box', s: [0.028, 0.014, 0.01], p: [0.05, 0.12, 0.2], mat: 'eyeGlow' },
    { j: 'head', type: 'torus', s: [0.175, 0.012], p: [0, 0.24, 0.03], r: [90, 0, 0], mat: 'iron', seg: 10 },
    // brazos esqueléticos
    { j: 'armL', type: 'box', s: [0.085, 0.34, 0.085], p: [0, -0.16, 0], taper: [0.8, 0.8], mat: 'skinCorrupt' },
    { j: 'foreL', type: 'box', s: [0.075, 0.32, 0.075], p: [0, -0.15, 0], taper: [0.7, 0.7], mat: 'skinCorrupt' },
    { j: 'handL', type: 'box', s: [0.07, 0.1, 0.05], p: [0, -0.05, 0], mat: 'skinCorrupt' },
    { j: 'handL', type: 'box', s: [0.016, 0.16, 0.016], p: [-0.02, -0.16, 0.01], r: [10, 0, 5], mat: 'skinCorrupt' },
    { j: 'handL', type: 'box', s: [0.016, 0.17, 0.016], p: [0.02, -0.16, 0.01], r: [10, 0, -5], mat: 'skinCorrupt' },
    { j: 'armR', type: 'box', s: [0.085, 0.34, 0.085], p: [0, -0.16, 0], taper: [0.8, 0.8], mat: 'skinCorrupt' },
    { j: 'foreR', type: 'box', s: [0.075, 0.32, 0.075], p: [0, -0.15, 0], taper: [0.7, 0.7], mat: 'skinCorrupt' },
    { j: 'handR', type: 'box', s: [0.07, 0.1, 0.07], p: [0, -0.05, 0], mat: 'skinCorrupt' },
    // hoz oxidada
    { j: 'handR', type: 'cyl', s: [0.02, 0.022, 0.42], p: [0, -0.06, 0.08], r: [90, 0, 0], mat: 'wooddark' },
    { j: 'handR', type: 'box', s: [0.028, 0.02, 0.26], p: [0, -0.04, 0.38], r: [-10, 0, 0], mat: 'iron' },
    { j: 'handR', type: 'box', s: [0.028, 0.02, 0.2], p: [0, 0.05, 0.54], r: [-55, 0, 0], mat: 'iron' },
    { j: 'handR', type: 'box', s: [0.028, 0.02, 0.16], p: [0, 0.16, 0.57], r: [-105, 0, 0], mat: 'iron' },
    // piernas bajo el hábito
    { j: 'shinL', type: 'box', s: [0.075, 0.44, 0.075], p: [0, -0.2, 0], mat: 'skinCorrupt' },
    { j: 'shinR', type: 'box', s: [0.075, 0.44, 0.075], p: [0, -0.2, 0], mat: 'skinCorrupt' },
    ...feetParts(0.95, 'skinCorrupt', { w: 0.085, h: 0.05, l: 0.21 }),
  ];
  return new Rig({ joints, parts });
}

// ------------------------------------------------------------ Soldado cosido
// Soldado de la hueste con el yelmo reventado por la carne y un tercer brazo.
export function buildSoldier() {
  const joints = humanoidJoints(1.03);
  joints.push({ name: 'arm3', parent: 'chest', pos: [0.12, 0.42, -0.17], rot: [-150, 0, 35] });
  joints.push({ name: 'fore3', parent: 'arm3', pos: [0, -0.34, 0], rot: [-50, 0, 0] });
  joints.push({ name: 'hand3', parent: 'fore3', pos: [0, -0.32, 0] });
  joints.push({ name: 'shield', parent: 'foreL', pos: [0.02, -0.14, 0.1] });
  const parts = [
    { j: 'hips', type: 'box', s: [0.4, 0.36, 0.28], p: [0, -0.14, 0], taper: [1.15, 1.1], mat: 'chainmail' },
    { j: 'hips', type: 'box', s: [0.32, 0.56, 0.03], p: [0, -0.26, 0.15], taper: [1.1, 1], mat: 'clothDark' },
    { j: 'hips', type: 'box', s: [0.32, 0.56, 0.03], p: [0, -0.26, -0.15], taper: [1.1, 1], mat: 'clothDark' },
    { j: 'hips', type: 'box', s: [0.42, 0.08, 0.3], p: [0, 0.03, 0], mat: 'leather' },
    { j: 'chest', type: 'box', s: [0.48, 0.52, 0.3], p: [0, 0.26, 0], taper: [0.84, 0.9], mat: 'plate' },
    { j: 'chest', type: 'box', s: [0.2, 0.12, 0.24], p: [0.27, 0.47, 0], r: [0, 0, -20], mat: 'plate' },
    { j: 'chest', type: 'box', s: [0.2, 0.12, 0.24], p: [-0.27, 0.47, 0], r: [0, 0, 20], mat: 'plate' },
    { j: 'chest', type: 'cyl', s: [0.12, 0.15, 0.12], p: [0, 0.54, 0], mat: 'chainmail' },
    { j: 'chest', type: 'ico', s: [0.13, 0.11, 0.1], p: [0.08, 0.36, -0.16], mat: 'flesh' },
    { j: 'chest', type: 'box', s: [0.1, 0.05, 0.01], p: [0.02, 0.2, 0.155], mat: 'redGlow' },
    // gran yelmo reventado
    { j: 'head', type: 'cyl', s: [0.15, 0.155, 0.31], p: [0, 0.15, 0], seg: 8, mat: 'plate' },
    { j: 'head', type: 'box', s: [0.2, 0.025, 0.02], p: [0, 0.17, 0.15], mat: 'black' },
    { j: 'head', type: 'box', s: [0.03, 0.12, 0.02], p: [0, 0.1, 0.152], mat: 'black' },
    { j: 'head', type: 'ico', s: [0.12, 0.1, 0.1], p: [0.13, 0.2, 0.05], mat: 'flesh' },
    { j: 'head', type: 'ico', s: [0.08], p: [-0.05, 0.31, -0.06], mat: 'flesh' },
    { j: 'head', type: 'sphere', s: [0.025], p: [0.19, 0.24, 0.1], mat: 'eyeGlow' },
    // brazos
    { j: 'armL', type: 'box', s: [0.14, 0.32, 0.14], p: [0, -0.15, 0], taper: [0.85, 0.85], mat: 'chainmail' },
    { j: 'foreL', type: 'box', s: [0.12, 0.28, 0.12], p: [0, -0.13, 0], taper: [0.85, 0.85], mat: 'plate' },
    { j: 'handL', type: 'box', s: [0.09, 0.1, 0.1], p: [0, -0.05, 0.01], mat: 'iron' },
    { j: 'armR', type: 'box', s: [0.14, 0.32, 0.14], p: [0, -0.15, 0], taper: [0.85, 0.85], mat: 'chainmail' },
    { j: 'foreR', type: 'box', s: [0.12, 0.28, 0.12], p: [0, -0.13, 0], taper: [0.85, 0.85], mat: 'plate' },
    { j: 'handR', type: 'box', s: [0.09, 0.1, 0.1], p: [0, -0.05, 0.01], mat: 'iron' },
    ...swordParts('handR', { len: 0.82 }),
    // escudo redondo (cara hacia +Z de su articulación)
    { j: 'shield', type: 'cyl', s: [0.34, 0.34, 0.05], p: [0, 0, 0], r: [90, 0, 0], seg: 12, mat: 'planks' },
    { j: 'shield', type: 'torus', s: [0.335, 0.028], p: [0, 0, 0.012], seg: 12, mat: 'iron' },
    { j: 'shield', type: 'ico', s: [0.07], p: [0, 0, 0.04], mat: 'iron' },
    { j: 'shield', type: 'box', s: [0.6, 0.05, 0.012], p: [0, 0.02, 0.03], r: [0, 0, 28], mat: 'iron' },
    { j: 'shield', type: 'box', s: [0.05, 0.3, 0.03], p: [0, 0, -0.04], mat: 'leather' },
    // tercer brazo que brota de la espalda
    { j: 'arm3', type: 'box', s: [0.08, 0.36, 0.08], p: [0, -0.17, 0], taper: [0.7, 0.7], mat: 'skinCorrupt' },
    { j: 'arm3', type: 'ico', s: [0.1], p: [0, 0, 0], mat: 'flesh' },
    { j: 'fore3', type: 'box', s: [0.07, 0.34, 0.07], p: [0, -0.16, 0], taper: [0.6, 0.6], mat: 'skinCorrupt' },
    { j: 'hand3', type: 'box', s: [0.06, 0.09, 0.05], p: [0, -0.04, 0], mat: 'skinCorrupt' },
    { j: 'hand3', type: 'box', s: [0.04, 0.012, 0.5], p: [0, -0.05, 0.25], taper: [0.3, 1], mat: 'plate' },
    // piernas
    { j: 'legL', type: 'box', s: [0.17, 0.46, 0.18], p: [0, -0.22, 0], taper: [0.8, 0.85], mat: 'chainmail' },
    { j: 'shinL', type: 'box', s: [0.14, 0.42, 0.15], p: [0, -0.2, 0], taper: [0.9, 0.9], mat: 'plate' },
    { j: 'legR', type: 'box', s: [0.17, 0.46, 0.18], p: [0, -0.22, 0], taper: [0.8, 0.85], mat: 'chainmail' },
    { j: 'shinR', type: 'box', s: [0.14, 0.42, 0.15], p: [0, -0.2, 0], taper: [0.9, 0.9], mat: 'plate' },
    ...feetParts(1.03, 'iron', { w: 0.125, h: 0.08, l: 0.25 }),
  ];
  return new Rig({ joints, parts });
}

// ------------------------------------------------------------ Rastrero
// Cuerpo supino que camina a cuatro patas como una araña; cabeza colgando.
export function buildCrawler() {
  const joints = [
    { name: 'body', pos: [0, 0.78, 0] },
    { name: 'head', parent: 'body', pos: [0, -0.02, 0.42] },
  ];
  const limbs = [
    ['lf', 0.2, 0.3],
    ['rf', -0.2, 0.3],
    ['lb', 0.18, -0.32],
    ['rb', -0.18, -0.32],
  ];
  for (const [n, x, z] of limbs) {
    joints.push({ name: n + 'A', parent: 'body', pos: [x, 0.03, z] });
    joints.push({ name: n + 'B', parent: n + 'A', pos: [0, 0.56, 0] });
  }
  const parts = [
    { j: 'body', type: 'box', s: [0.34, 0.18, 0.8], p: [0, 0, 0], taper: [0.8, 1], mat: 'skinCorrupt' },
    { j: 'body', type: 'box', s: [0.05, 0.05, 0.7], p: [0, -0.1, 0], mat: 'bone' },
    ...[-0.2, -0.05, 0.1, 0.25].map((z) => ({ j: 'body', type: 'box', s: [0.38, 0.03, 0.03], p: [0, 0.085, z], mat: 'bone' })),
    { j: 'body', type: 'ico', s: [0.12, 0.08, 0.12], p: [0.06, 0.1, -0.2], mat: 'flesh' },
    // cabeza invertida con boca vertical
    { j: 'head', type: 'box', s: [0.2, 0.24, 0.22], p: [0, -0.1, 0.06], r: [30, 0, 0], mat: 'skinCorrupt' },
    { j: 'head', type: 'box', s: [0.035, 0.16, 0.02], p: [0, -0.12, 0.18], r: [30, 0, 0], mat: 'black' },
    ...[-0.06, -0.02, 0.02, 0.06].map((y) => ({ j: 'head', type: 'box', s: [0.05, 0.012, 0.012], p: [0, -0.12 + y, 0.19], r: [30, 0, 0], mat: 'bone' })),
    { j: 'head', type: 'box', s: [0.03, 0.02, 0.01], p: [-0.05, -0.2, 0.15], r: [30, 0, 0], mat: 'eyeGlow' },
    { j: 'head', type: 'box', s: [0.03, 0.02, 0.01], p: [0.05, -0.2, 0.15], r: [30, 0, 0], mat: 'eyeGlow' },
    // pelo negro colgante
    ...[-0.08, -0.04, 0, 0.04, 0.08].map((x, i) => ({ j: 'head', type: 'box', s: [0.02, 0.5 + (i % 2) * 0.12, 0.02], p: [x, -0.42, -0.02], mat: 'black' })),
  ];
  for (const [n] of limbs) {
    const front = n[1] === 'f';
    parts.push({ j: n + 'A', type: 'box', s: [0.075, 0.58, 0.075], p: [0, 0.28, 0], taper: [0.75, 0.75], mat: 'skinCorrupt' });
    parts.push({ j: n + 'A', type: 'ico', s: [0.07], p: [0, 0.56, 0], mat: 'skinCorrupt' });
    parts.push({ j: n + 'B', type: 'box', s: [0.06, 1.0, 0.06], p: [0, -0.5, 0], taper: [0.5, 0.5], mat: 'skinCorrupt' });
    // manos (delante) y pies (detrás) con dedos largos
    if (front) {
      for (const dx of [-0.03, 0, 0.03]) parts.push({ j: n + 'B', type: 'box', s: [0.015, 0.02, 0.2], p: [dx, -1.0, 0.08], r: [0, dx * 300, 0], mat: 'skinCorrupt' });
    } else parts.push({ j: n + 'B', type: 'box', s: [0.08, 0.03, 0.2], p: [0, -1.0, -0.05], mat: 'skinCorrupt' });
  }
  // pelvis y hombros para leer la forma humana
  parts.push({ j: 'body', type: 'box', s: [0.36, 0.14, 0.2], p: [0, -0.02, -0.34], mat: 'skinCorrupt' });
  parts.push({ j: 'body', type: 'box', s: [0.44, 0.14, 0.16], p: [0, 0.0, 0.32], mat: 'skinCorrupt' });
  return new Rig({ joints, parts });
}

// ------------------------------------------------------------ Mastín desollado
export function buildHound() {
  const joints = [
    { name: 'body', pos: [0, 0.66, 0] },
    { name: 'neck', parent: 'body', pos: [0, 0.08, 0.38] },
    { name: 'head', parent: 'neck', pos: [0, 0.04, 0.22] },
    { name: 'jaw', parent: 'head', pos: [0, -0.05, 0.02] },
    { name: 'tail', parent: 'body', pos: [0, 0.08, -0.4] },
  ];
  const legs = [
    ['fl', 0.14, 0.3],
    ['fr', -0.14, 0.3],
    ['bl', 0.14, -0.3],
    ['br', -0.14, -0.3],
  ];
  for (const [n, x, z] of legs) {
    joints.push({ name: n + 'A', parent: 'body', pos: [x, -0.06, z] });
    joints.push({ name: n + 'B', parent: n + 'A', pos: [0, -0.32, 0] });
  }
  const parts = [
    { j: 'body', type: 'box', s: [0.3, 0.3, 0.84], p: [0, 0, 0], taper: [0.8, 1], mat: 'flesh' },
    ...[-0.25, -0.1, 0.05, 0.2].map((z) => ({ j: 'body', type: 'box', s: [0.34, 0.24, 0.03], p: [0, -0.02, z], mat: 'bone' })),
    ...[-0.3, -0.15, 0, 0.15, 0.3].map((z) => ({ j: 'body', type: 'box', s: [0.05, 0.06, 0.06], p: [0, 0.17, z], mat: 'bone' })),
    { j: 'neck', type: 'box', s: [0.16, 0.16, 0.3], p: [0, 0, 0.1], r: [-20, 0, 0], mat: 'flesh' },
    // cráneo sin piel
    { j: 'head', type: 'box', s: [0.18, 0.14, 0.3], p: [0, 0.02, 0.12], taper: [0.8, 1], mat: 'bone' },
    { j: 'head', type: 'box', s: [0.13, 0.03, 0.24], p: [0, -0.06, 0.15], mat: 'black' },
    ...[-0.05, -0.02, 0.01, 0.04].map((x) => ({ j: 'head', type: 'box', s: [0.012, 0.05, 0.012], p: [x, -0.07, 0.25], mat: 'bone' })),
    { j: 'head', type: 'sphere', s: [0.025], p: [0.07, 0.06, 0.12], mat: 'eyeGlow' },
    { j: 'head', type: 'sphere', s: [0.025], p: [-0.07, 0.06, 0.12], mat: 'eyeGlow' },
    { j: 'jaw', type: 'box', s: [0.13, 0.05, 0.27], p: [0, -0.02, 0.12], mat: 'flesh' },
    ...[-0.04, 0, 0.04].map((x) => ({ j: 'jaw', type: 'box', s: [0.012, 0.05, 0.012], p: [x, 0.02, 0.23], mat: 'bone' })),
    { j: 'tail', type: 'box', s: [0.05, 0.05, 0.4], p: [0, 0, -0.2], r: [20, 0, 0], taper: [0.4, 0.4], mat: 'flesh' },
  ];
  for (const [n] of legs) {
    parts.push({ j: n + 'A', type: 'box', s: [0.09, 0.34, 0.1], p: [0, -0.15, 0], taper: [0.7, 0.7], mat: 'flesh' });
    parts.push({ j: n + 'B', type: 'box', s: [0.05, 0.34, 0.05], p: [0, -0.16, 0], mat: 'bone' });
  }
  return new Rig({ joints, parts });
}

// ------------------------------------------------------------ Campanero
// Bruto de casi tres metros con una campana de la catedral por cabeza: se la
// fundieron sobre los hombros (el bronce chorreó y se pegó a la carne) y la
// encadenaron al pecho. La campana conserva su corona de asas y un trozo del
// yugo de madera roto; tiene dos rendijas por las que le brillan los ojos,
// una grieta y una inscripción. Lleva el delantal de cuero del fundidor, la
// cuerda de la campana enrollada a la cintura, grilletes rotos en las
// muñecas y, por arma, el badajo.
//
// La campana es una pieza torneada cerrada: por fuera bronce viejo, por
// dentro bronce ennegrecido (perfil del borde hacia la corona, para que las
// caras miren hacia fuera; al revés se veía el interior a través de ella).
// Va alta, con el borde por encima de los hombros: los brazos pasan por
// debajo al alzarse.
export const BELL_OUT = [
  [0.423, 0.1],
  [0.46, 0.1],
  [0.465, 0.128],
  [0.432, 0.192],
  [0.377, 0.284],
  [0.327, 0.422],
  [0.304, 0.56],
  [0.299, 0.67],
  [0.285, 0.762],
  [0.248, 0.818],
  [0.184, 0.846],
  [0.001, 0.855],
];
const BELL_IN = [
  [0.001, 0.8],
  [0.166, 0.79],
  [0.239, 0.744],
  [0.262, 0.652],
  [0.267, 0.56],
  [0.285, 0.422],
  [0.331, 0.284],
  [0.386, 0.192],
  [0.419, 0.128],
  [0.423, 0.1],
];
// Radio exterior de la campana a la altura y (espacio de su articulación).
export function bellRadius(y) {
  const P = BELL_OUT;
  if (y < P[1][1] || y > P[P.length - 1][1]) return 0;
  for (let i = 1; i < P.length - 1; i++) {
    const a = P[i],
      b = P[i + 1];
    if (y >= a[1] && y <= b[1]) return a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1] || 1);
  }
  return 0;
}
// el badajo, en el espacio de la mano derecha (a lo largo de +z)
export const CLAPPER = { y: -0.08, z0: -0.12, z1: 1.0, ball: 1.16, ballR: 0.205, tip: 1.51 };

const _m4 = new THREE.Matrix4();
const _eu = new THREE.Euler();
const _ax = new THREE.Vector3(),
  _ay = new THREE.Vector3(),
  _az = new THREE.Vector3();
// Rotación (grados) de una pieza cuyo eje y va de a a b y su cara (+z) mira
// hacia n.
function alignR(a, b, n) {
  _ay.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
  _az.set(n[0], n[1], n[2]);
  _ax.crossVectors(_ay, _az).normalize();
  _az.crossVectors(_ax, _ay).normalize();
  _m4.makeBasis(_ax, _ay, _az);
  _eu.setFromRotationMatrix(_m4, 'XYZ');
  return [_eu.x / DEG, _eu.y / DEG, _eu.z / DEG];
}

export function buildBell() {
  const k = 1.38;
  const base = humanoidJoints(k, { arm: 1.05 });
  const J = Object.fromEntries(base.map((j) => [j.name, j]));
  // hombros de bruto, anchos y algo bajos
  J.armL.pos = [0.4, 0.64, -0.02];
  J.armR.pos = [-0.4, 0.64, -0.02];
  const joints = base.filter((j) => j.name !== 'head');
  joints.push({ name: 'bellJ', parent: 'chest', pos: [0, 0.79, -0.01] });
  // los ojos (y el destello de aviso) están en la campana
  joints.push({ name: 'head', parent: 'bellJ', pos: [0, 0.4, 0.36] });
  // delantal y faldón (siguen a los muslos), la cuerda y la cadena de un grillete
  joints.push({ name: 'apron', parent: 'hips', pos: [0, 0.04, 0.4] });
  joints.push({ name: 'apron2', parent: 'apron', pos: [0, -0.5, 0] });
  joints.push({ name: 'flapB', parent: 'hips', pos: [0, -0.02, -0.25] });
  joints.push({ name: 'rope', parent: 'hips', pos: [0.35, -0.1, 0.07] });
  joints.push({ name: 'chainL', parent: 'foreL', pos: [0.135, -0.37, 0.0] });

  // un punto de la superficie exterior de la campana y su normal
  const onBell = (x, y, out = 0.004) => {
    const r = bellRadius(y);
    const z = Math.sqrt(Math.max(0, r * r - x * x));
    const n = [x, 0.35 * r, z];
    const l = Math.hypot(n[0], n[1], n[2]);
    return { p: [x + (x / r) * out, y, z + (z / r) * out], n: [n[0] / l, n[1] / l, n[2] / l] };
  };
  // tira fina sobre la campana entre dos puntos (grieta, relieves)
  const onBellSeg = (x0, y0, x1, y1, w, d, mat) => {
    const a = onBell(x0, y0),
      b = onBell(x1, y1);
    const len = Math.hypot(b.p[0] - a.p[0], b.p[1] - a.p[1], b.p[2] - a.p[2]);
    const m = [(a.p[0] + b.p[0]) / 2, (a.p[1] + b.p[1]) / 2, (a.p[2] + b.p[2]) / 2];
    return { j: 'bellJ', type: 'box', s: [w, len + w * 0.6, d], p: m, r: alignR(a.p, b.p, a.n), mat };
  };
  const ring = (y, tube, mat = 'bronze') => ({ j: 'bellJ', type: 'torus', s: [bellRadius(y) + tube * 0.4, tube], p: [0, y, 0], r: [90, 0, 0], seg: 24, seg2: 4, mat });

  const parts = [
    // ---------------------------------------------------------- campana
    { j: 'bellJ', type: 'lathe', points: BELL_OUT, s: [1, 1, 1], seg: 20, mat: 'bronzeAged' },
    { j: 'bellJ', type: 'lathe', points: BELL_IN, s: [1, 1, 1], seg: 20, mat: 'bronzeIn' },
    // molduras
    ring(0.15, 0.016),
    ring(0.205, 0.01),
    ring(0.64, 0.01),
    ring(0.72, 0.013),
    ring(0.79, 0.01),
    // inscripción entre las molduras de arriba
    ...Array.from({ length: 22 }, (_, i) => {
      const a = (i / 22) * Math.PI * 2 + 0.15;
      const r = bellRadius(0.68) + 0.004;
      const tall = i % 3 === 1;
      return { j: 'bellJ', type: 'box', s: [0.02 + (i % 2) * 0.012, tall ? 0.04 : 0.028, 0.008], p: [Math.sin(a) * r, tall ? 0.682 : 0.678, Math.cos(a) * r], r: [0, a / DEG, 0], mat: 'bronze' };
    }),
    // cruz en la frente
    onBellSeg(0, 0.49, 0, 0.62, 0.028, 0.012, 'bronze'),
    onBellSeg(-0.045, 0.585, 0.045, 0.585, 0.024, 0.012, 'bronze'),
    // rendijas de los ojos (inclinadas: mirada torva) y su brillo
    ...[1, -1].flatMap((sx) => {
      const a = onBell(sx * 0.085, 0.4, 0.004),
        b = onBell(sx * 0.085, 0.4, 0.011);
      const ry = Math.atan2(a.p[0], a.p[2]) / DEG;
      return [
        { j: 'bellJ', type: 'box', s: [0.105, 0.036, 0.016], p: a.p, r: [-18, ry, sx * -11], mat: 'black' },
        { j: 'bellJ', type: 'box', s: [0.056, 0.014, 0.01], p: b.p, r: [-18, ry, sx * -11], mat: 'eyeGlow' },
      ];
    }),
    // y la brasa de dentro (se ve desde abajo, por la boca)
    { j: 'bellJ', type: 'sphere', s: [0.07], p: [0, 0.36, 0.17], mat: 'eyeGlow' },
    // grieta que baja por la mejilla derecha hasta el borde
    onBellSeg(-0.13, 0.115, -0.165, 0.2, 0.014, 0.012, 'black'),
    onBellSeg(-0.165, 0.2, -0.12, 0.275, 0.013, 0.012, 'black'),
    onBellSeg(-0.12, 0.275, -0.14, 0.35, 0.012, 0.012, 'black'),
    onBellSeg(-0.14, 0.35, -0.11, 0.38, 0.011, 0.012, 'black'),
    onBellSeg(-0.165, 0.2, -0.215, 0.235, 0.009, 0.01, 'black'),
    // corona de asas
    { j: 'bellJ', type: 'torus', s: [0.085, 0.024], p: [0, 0.905, 0], seg: 10, seg2: 4, mat: 'bronzeAged' },
    { j: 'bellJ', type: 'torus', s: [0.085, 0.024], p: [0, 0.905, 0], r: [0, 90, 0], seg: 10, seg2: 4, mat: 'bronzeAged' },
    // lo que queda del yugo: la viga partida, flejes y el gorrón
    { j: 'bellJ', type: 'box', s: [0.64, 0.12, 0.17], p: [0.05, 0.99, 0], mat: 'wooddark' },
    { j: 'bellJ', type: 'box', s: [0.12, 0.045, 0.07], p: [-0.3, 1.015, 0.03], r: [0, 15, 22], mat: 'wooddark' },
    { j: 'bellJ', type: 'box', s: [0.09, 0.04, 0.06], p: [-0.29, 0.965, -0.035], r: [0, -12, -24], mat: 'wooddark' },
    ...[
      [0.14, 0.088],
      [0.14, -0.088],
      [-0.12, 0.088],
      [-0.12, -0.088],
    ].map(([x, z]) => ({ j: 'bellJ', type: 'box', s: [0.036, 0.2, 0.012], p: [x, 0.95, z], mat: 'iron' })),
    { j: 'bellJ', type: 'cyl', s: [0.032, 0.032, 0.09], p: [0.41, 0.99, 0], r: [0, 0, 90], seg: 6, mat: 'iron' },
    // bronce que chorreó al fundírsela encima
    ...[
      [40, 0.05],
      [75, 0.12],
      [104, 0.14],
      [138, 0.08],
      [180, 0.1],
      [222, 0.09],
      [256, 0.13],
      [284, 0.12],
      [322, 0.05],
    ].map(([a, len], i) => ({ j: 'bellJ', type: 'cone', s: [0.022 + (i % 3) * 0.005, len], p: [Math.sin(a * DEG) * 0.452, 0.11 - len / 2, Math.cos(a * DEG) * 0.452], r: [180, 0, 0], mat: 'bronzeAged' })),

    // ---------------------------------------------------------- tronco
    { j: 'chest', type: 'box', s: [0.86, 0.62, 0.54], p: [0, 0.36, 0], taper: [0.72, 0.84], mat: 'skinCorrupt' },
    // joroba, trapecios, pectorales y tripa
    { j: 'chest', type: 'ico', s: [0.42, 0.3, 0.26], p: [0, 0.5, -0.2], mat: 'skinCorrupt' },
    { j: 'chest', type: 'box', s: [0.32, 0.12, 0.34], p: [0.2, 0.68, -0.03], r: [0, 0, -12], mat: 'skinCorrupt' },
    { j: 'chest', type: 'box', s: [0.32, 0.12, 0.34], p: [-0.2, 0.68, -0.03], r: [0, 0, 12], mat: 'skinCorrupt' },
    { j: 'chest', type: 'ico', s: [0.2, 0.13, 0.09], p: [0.17, 0.47, 0.25], mat: 'skinCorrupt' },
    { j: 'chest', type: 'ico', s: [0.2, 0.13, 0.09], p: [-0.17, 0.47, 0.25], mat: 'skinCorrupt' },
    { j: 'chest', type: 'ico', s: [0.32, 0.24, 0.16], p: [0, 0.24, 0.17], mat: 'skinCorrupt' },
    // muñón del cuello que entra en la campana, con la costura quemada
    { j: 'chest', type: 'cyl', s: [0.25, 0.33, 0.36], p: [0, 0.82, -0.01], seg: 10, mat: 'skinCorrupt' },
    { j: 'chest', type: 'cyl', s: [0.29, 0.31, 0.06], p: [0, 0.9, -0.01], seg: 10, mat: 'flesh' },
    // llagas
    { j: 'chest', type: 'ico', s: [0.12, 0.1, 0.07], p: [-0.22, 0.26, 0.21], mat: 'flesh' },
    { j: 'chest', type: 'ico', s: [0.13], p: [0.24, 0.52, -0.2], mat: 'flesh' },
    // goterones de bronce sobre los hombros y el pecho
    ...[
      [0.3, 0.68, 0.12],
      [-0.28, 0.69, 0.1],
      [0.36, 0.66, -0.14],
      [-0.12, 0.66, 0.25],
      [0.08, 0.68, -0.25],
    ].map(([x, y, z]) => ({ j: 'chest', type: 'ico', s: [0.06, 0.03, 0.055], p: [x, y, z], mat: 'bronzeAged' })),
    { j: 'chest', type: 'box', s: [0.025, 0.16, 0.02], p: [-0.12, 0.58, 0.268], r: [6, 0, 4], mat: 'bronzeAged' },
    { j: 'chest', type: 'box', s: [0.02, 0.12, 0.02], p: [0.31, 0.6, 0.18], r: [10, 0, -12], mat: 'bronzeAged' },
    // cadenas que sujetan la campana: de unos garfios clavados en el pecho al borde
    ...[1, -1].flatMap((sx) =>
      [0, 1, 2, 3, 4].map((i) => ({ j: 'chest', type: 'torus', s: [0.042, 0.012], p: [sx * 0.19, 0.61 + i * 0.065, 0.274 + i * 0.034], r: [-27, i % 2 ? 90 : 0, 0], seg: 6, mat: 'iron' }))
    ),
    { j: 'chest', type: 'box', s: [0.03, 0.05, 0.04], p: [0.19, 0.57, 0.262], mat: 'iron' },
    { j: 'chest', type: 'box', s: [0.03, 0.05, 0.04], p: [-0.19, 0.57, 0.262], mat: 'iron' },

    // ---------------------------------------------------------- cintura
    { j: 'hips', type: 'box', s: [0.62, 0.36, 0.44], p: [0, -0.08, 0], taper: [1.05, 1.05], mat: 'skinCorrupt' },
    { j: 'hips', type: 'box', s: [0.66, 0.13, 0.48], p: [0, 0.02, 0], mat: 'leather' },
    { j: 'hips', type: 'box', s: [0.1, 0.1, 0.03], p: [0.12, 0.02, 0.25], mat: 'iron' },
    // la cuerda de la campana, enrollada al costado
    { j: 'hips', type: 'torus', s: [0.11, 0.028], p: [0.33, -0.03, 0.05], r: [0, 90, 8], seg: 10, mat: 'rope' },
    { j: 'hips', type: 'torus', s: [0.1, 0.026], p: [0.34, -0.06, 0.05], r: [0, 90, -10], seg: 10, mat: 'rope' },
    { j: 'rope', type: 'box', s: [0.045, 0.62, 0.045], p: [0, -0.31, 0], mat: 'rope' },
    { j: 'rope', type: 'box', s: [0.02, 0.12, 0.02], p: [0.02, -0.66, 0.01], r: [0, 0, 14], mat: 'rope' },
    { j: 'rope', type: 'box', s: [0.02, 0.1, 0.02], p: [-0.02, -0.65, -0.01], r: [0, 0, -12], mat: 'rope' },
    { j: 'rope', type: 'box', s: [0.02, 0.11, 0.02], p: [0, -0.655, 0.02], r: [14, 0, 0], mat: 'rope' },
    // delantal de cuero del fundidor, chamuscado (en dos paños: el de arriba
    // sigue al muslo que va delante, el de abajo cuelga a plomo)
    { j: 'apron', type: 'box', s: [0.5, 0.53, 0.035], p: [0, -0.255, 0], taper: [1.08, 1], mat: 'leather' },
    { j: 'apron', type: 'box', s: [0.53, 0.05, 0.045], p: [0, -0.01, 0], mat: 'leather' },
    { j: 'apron', type: 'box', s: [0.09, 0.12, 0.04], p: [-0.14, -0.3, 0.003], mat: 'black' },
    { j: 'apron2', type: 'box', s: [0.55, 0.52, 0.035], p: [0, -0.25, 0], taper: [1.1, 1], mat: 'leather' },
    { j: 'apron2', type: 'box', s: [0.14, 0.18, 0.04], p: [0.12, -0.2, 0.003], mat: 'black' },
    { j: 'apron2', type: 'box', s: [0.07, 0.06, 0.04], p: [-0.18, -0.4, 0.003], mat: 'black' },
    { j: 'flapB', type: 'box', s: [0.48, 0.74, 0.03], p: [0, -0.37, 0], taper: [1.2, 1], mat: 'clothDark', ds: true },

    // ---------------------------------------------------------- piernas
    ...['L', 'R'].flatMap((s) => [
      { j: 'leg' + s, type: 'box', s: [0.31, 0.66, 0.33], p: [0, -0.31, 0], taper: [0.78, 0.82], mat: 'skinCorrupt' },
      { j: 'shin' + s, type: 'ico', s: [0.12], p: [0, 0, 0.02], mat: 'skinCorrupt' },
      { j: 'shin' + s, type: 'box', s: [0.25, 0.62, 0.27], p: [0, -0.29, 0], taper: [0.78, 0.8], mat: 'skinCorrupt' },
      // vendas en las espinillas
      ...[-0.13, -0.27, -0.41].map((y, i) => {
        const f = (0.02 - y) / 0.62;
        return { j: 'shin' + s, type: 'box', s: [0.25 * (1 - f * 0.22) + 0.025, 0.045, 0.27 * (1 - f * 0.2) + 0.025], p: [0, y, 0], r: [i % 2 ? 7 : -5, 0, i % 2 ? -4 : 5], mat: 'clothDark' };
      }),
    ]),
    ...feetParts(k, 'skinCorrupt', { w: 0.17, h: 0.07, l: 0.27 }),

    // ---------------------------------------------------------- brazos
    ...['L', 'R'].flatMap((s) => [
      { j: 'arm' + s, type: 'ico', s: [0.14], p: [0, 0, 0], mat: 'skinCorrupt' },
      { j: 'arm' + s, type: 'box', s: [0.26, 0.46, 0.26], p: [0, -0.22, 0], taper: [0.85, 0.85], mat: 'skinCorrupt' },
      { j: 'arm' + s, type: 'ico', s: [0.11, 0.14, 0.1], p: [0, -0.2, 0.09], mat: 'skinCorrupt' },
      { j: 'fore' + s, type: 'ico', s: [0.115], p: [0, 0, 0], mat: 'skinCorrupt' },
      { j: 'fore' + s, type: 'box', s: [0.25, 0.42, 0.25], p: [0, -0.19, 0], taper: [0.78, 0.78], mat: 'skinCorrupt' },
      // grilletes rotos
      { j: 'fore' + s, type: 'cyl', s: [0.15, 0.15, 0.09], p: [0, -0.36, 0], seg: 8, mat: 'iron' },
    ]),
    // mano izquierda abierta, dedos gruesos
    { j: 'handL', type: 'box', s: [0.2, 0.17, 0.14], p: [0, -0.08, 0.01], mat: 'skinCorrupt' },
    ...[-0.066, -0.022, 0.022, 0.066].map((x, i) => ({ j: 'handL', type: 'box', s: [0.04, 0.13 + (i % 2) * 0.02, 0.05], p: [x, -0.2, 0.03], r: [14, 0, 0], mat: 'skinCorrupt' })),
    { j: 'handL', type: 'box', s: [0.05, 0.1, 0.05], p: [-0.11, -0.1, 0.05], r: [0, 0, -30], mat: 'skinCorrupt' },
    // cadena que cuelga del grillete izquierdo
    ...[0, 1, 2, 3].map((i) => ({ j: 'chainL', type: 'torus', s: [0.04, 0.011], p: [0, -0.035 - i * 0.065, 0], r: [0, i % 2 ? 90 : 0, 0], seg: 6, mat: 'iron' })),
    // puño derecho, cerrado sobre el badajo
    { j: 'handR', type: 'box', s: [0.2, 0.19, 0.2], p: [0, -0.08, 0], mat: 'skinCorrupt' },
    { j: 'handR', type: 'box', s: [0.21, 0.06, 0.08], p: [0, -0.15, 0.06], mat: 'skinCorrupt' },

    // ---------------------------------------------------------- el badajo
    { j: 'handR', type: 'torus', s: [0.065, 0.018], p: [0, CLAPPER.y, CLAPPER.z0 - 0.06], r: [0, 90, 0], seg: 8, mat: 'iron' },
    { j: 'handR', type: 'cyl', s: [0.042, 0.05, CLAPPER.z1 - CLAPPER.z0], p: [0, CLAPPER.y, (CLAPPER.z0 + CLAPPER.z1) / 2], r: [90, 0, 0], seg: 6, mat: 'iron' },
    {
      j: 'handR',
      type: 'lathe',
      points: [
        [0.001, -0.2],
        [0.08, -0.19],
        [0.15, -0.14],
        [0.195, -0.06],
        [0.205, 0.02],
        [0.185, 0.1],
        [0.13, 0.17],
        [0.06, 0.205],
        [0.001, 0.21],
      ],
      s: [0.4, 0.4, 0.4],
      p: [0, CLAPPER.y, CLAPPER.ball],
      r: [90, 0, 0],
      seg: 10,
      mat: 'iron',
    },
    { j: 'handR', type: 'cyl', s: [0.035, 0.06, 0.17], p: [0, CLAPPER.y, CLAPPER.tip - 0.085], r: [90, 0, 0], seg: 6, mat: 'iron' },
    { j: 'handR', type: 'ico', s: [0.07, 0.05, 0.05], p: [0.12, CLAPPER.y + 0.09, CLAPPER.ball + 0.03], mat: 'blood' },
    { j: 'handR', type: 'ico', s: [0.06, 0.05, 0.04], p: [-0.11, CLAPPER.y - 0.12, CLAPPER.ball - 0.04], mat: 'blood' },
  ];
  return new Rig({ joints, parts });
}

// ------------------------------------------------------------ Plañidera
// Una muerta altísima que flota amortajada: velo de encaje sobre la cabeza
// que le cae por la espalda, el rostro cerúleo con las cuencas vacías, dos
// regueros de sangre por lágrimas y una boca que se le descuelga al gritar;
// mechones negros por la cara, corpiño rasgado sobre las costillas con la
// mancha del corazón, un rosario a la cintura. Los brazos le llegan al suelo:
// mangas anchas que cuelgan a plomo, antebrazos de hueso y dedos larguísimos.
// La falda es de paños sueltos y rotos que no tocan el suelo y ondean.
export const MOURNER_SKIRT = 10;
export const MOURNER_SKIRT_LEN = (i) => 1.26 + ((i * 7) % 5) * 0.035;
export function buildMourner() {
  const k = 1.25;
  const joints = humanoidJoints(k, { arm: 1.75 });
  joints.push({ name: 'jaw', parent: 'head', pos: [0, 0.075, 0.06] });
  // de aquí salen los lamentos
  joints.push({ name: 'mouth', parent: 'head', pos: [0, 0.09, 0.14] });
  joints.push({ name: 'veil', parent: 'head', pos: [0, 0.25, -0.14] });
  joints.push({ name: 'hairL', parent: 'head', pos: [0.089, 0.25, 0.07] });
  joints.push({ name: 'hairR', parent: 'head', pos: [-0.089, 0.25, 0.07] });
  joints.push({ name: 'sleeveL', parent: 'foreL', pos: [0, -0.04, 0] });
  joints.push({ name: 'sleeveR', parent: 'foreR', pos: [0, -0.04, 0] });
  // paños de la falda: los de fuera y, entre ellos, otros por dentro
  for (let i = 0; i < MOURNER_SKIRT; i++) {
    const a = (i / MOURNER_SKIRT) * Math.PI * 2,
      b = a + Math.PI / MOURNER_SKIRT;
    joints.push({ name: 'sk' + i, parent: 'hips', pos: [Math.sin(a) * 0.165, -0.06, Math.cos(a) * 0.135], rot: [0, a / DEG, 0] });
    joints.push({ name: 'ski' + i, parent: 'hips', pos: [Math.sin(b) * 0.15, -0.04, Math.cos(b) * 0.12], rot: [0, b / DEG, 0] });
  }
  const parts = [
    // ---------------------------------------------------------- cabeza
    { j: 'head', type: 'box', s: [0.165, 0.25, 0.19], p: [0, 0.14, 0.015], taper: [0.72, 0.86], mat: 'skinPale' },
    { j: 'head', type: 'box', s: [0.07, 0.15, 0.07], p: [0, 0.0, 0], mat: 'skinPale' },
    ...[1, -1].flatMap((sx) => [
      // cuencas vacías, caídas hacia fuera, con un punto de luz fría
      { j: 'head', type: 'box', s: [0.052, 0.034, 0.02], p: [sx * 0.041, 0.175, 0.104], r: [0, sx * 8, sx * -12], mat: 'black' },
      { j: 'head', type: 'box', s: [0.012, 0.01, 0.006], p: [sx * 0.04, 0.172, 0.116], mat: 'eyeCold' },
      // lágrimas de sangre
      { j: 'head', type: 'box', s: [0.011, 0.12, 0.005], p: [sx * 0.043, 0.105, 0.11], r: [6, 0, sx * 3], mat: 'blood' },
    ]),
    { j: 'head', type: 'box', s: [0.022, 0.05, 0.026], p: [0, 0.135, 0.116], mat: 'skinPale' },
    { j: 'head', type: 'box', s: [0.05, 0.03, 0.02], p: [0, 0.088, 0.104], mat: 'black' },
    ...[-0.014, 0, 0.014].map((x) => ({ j: 'head', type: 'box', s: [0.01, 0.014, 0.008], p: [x, 0.083, 0.112], mat: 'bone' })),
    // la mandíbula (se descuelga al gritar)
    { j: 'jaw', type: 'box', s: [0.12, 0.055, 0.11], p: [0, -0.02, 0.03], taper: [0.8, 0.9], mat: 'skinPale' },
    { j: 'jaw', type: 'box', s: [0.05, 0.05, 0.02], p: [0, 0.005, 0.082], mat: 'black' },
    ...[-0.012, 0.012].map((x) => ({ j: 'jaw', type: 'box', s: [0.01, 0.012, 0.008], p: [x, 0.024, 0.088], mat: 'bone' })),
    // la toca: un capuchón redondo que deja la cara al aire, con las alas
    // cayendo junto a las mejillas y un ribete de encaje en la frente
    { j: 'head', type: 'sphere', s: [0.135, 0.175, 0.125], p: [0, 0.165, -0.045], seg: 10, seg2: 8, mat: 'shroud' },
    { j: 'head', type: 'box', s: [0.03, 0.27, 0.15], p: [0.118, 0.07, -0.01], taper: [1.4, 1.2], r: [0, 0, 6], mat: 'shroud' },
    { j: 'head', type: 'box', s: [0.03, 0.27, 0.15], p: [-0.118, 0.07, -0.01], taper: [1.4, 1.2], r: [0, 0, -6], mat: 'shroud' },
    { j: 'head', type: 'box', s: [0.2, 0.026, 0.04], p: [0, 0.27, 0.088], r: [-38, 0, 0], mat: 'lace' },
    { j: 'head', type: 'torus', s: [0.128, 0.008], p: [0, 0.262, -0.01], r: [84, 0, 0], seg: 12, mat: 'silver' },
    // mechones negros a los lados de la cara
    ...['hairL', 'hairR'].flatMap((j, n) => [
      { j, type: 'box', s: [0.026, 0.34, 0.014], p: [0, -0.17, 0], mat: 'black' },
      { j, type: 'box', s: [0.022, 0.28, 0.012], p: [n ? -0.012 : 0.012, -0.14, -0.014], r: [0, 0, n ? -4 : 4], mat: 'black' },
      { j, type: 'box', s: [0.02, 0.31, 0.01], p: [n ? 0.012 : -0.012, -0.155, 0.01], r: [0, 0, n ? 3 : -3], mat: 'black' },
    ]),
    // el velo, que le cae por la espalda, con el borde de encaje
    { j: 'veil', type: 'box', s: [0.34, 1.2, 0.02], p: [0, -0.58, 0], taper: [1.3, 1], mat: 'shroud', ds: true },
    { j: 'veil', type: 'box', s: [0.48, 0.05, 0.026], p: [0, -1.17, 0], mat: 'lace' },

    // ---------------------------------------------------------- tronco
    { j: 'chest', type: 'cyl', s: [0.1, 0.085, 0.09], p: [0, 0.67, 0], seg: 8, mat: 'lace' },
    { j: 'chest', type: 'box', s: [0.29, 0.68, 0.19], p: [0, 0.28, 0], taper: [0.8, 0.88], mat: 'shroud' },
    // escote en pico ribeteado de encaje
    { j: 'chest', type: 'box', s: [0.09, 0.09, 0.01], p: [0, 0.55, 0.096], r: [0, 0, 45], mat: 'skinPale' },
    { j: 'chest', type: 'box', s: [0.03, 0.2, 0.012], p: [0.048, 0.53, 0.098], r: [0, 0, 24], mat: 'lace' },
    { j: 'chest', type: 'box', s: [0.03, 0.2, 0.012], p: [-0.048, 0.53, 0.098], r: [0, 0, -24], mat: 'lace' },
    // la mancha del corazón, que chorrea, y un desgarrón en el costado que
    // deja ver las costillas
    { j: 'chest', type: 'box', s: [0.08, 0.1, 0.006], p: [0.06, 0.41, 0.098], r: [0, 0, 20], mat: 'blood' },
    { j: 'chest', type: 'box', s: [0.05, 0.07, 0.006], p: [0.036, 0.37, 0.1], r: [0, 0, -15], mat: 'blood' },
    { j: 'chest', type: 'box', s: [0.012, 0.13, 0.005], p: [0.07, 0.3, 0.099], mat: 'blood' },
    { j: 'chest', type: 'box', s: [0.05, 0.13, 0.008], p: [-0.085, 0.27, 0.094], r: [0, 0, -14], mat: 'black' },
    { j: 'chest', type: 'box', s: [0.052, 0.01, 0.006], p: [-0.085, 0.25, 0.1], mat: 'bone' },
    { j: 'chest', type: 'box', s: [0.05, 0.01, 0.006], p: [-0.088, 0.29, 0.1], mat: 'bone' },
    { j: 'chest', type: 'box', s: [0.25, 0.05, 0.17], p: [0, 0.0, 0], mat: 'black' },

    // ---------------------------------------------------------- cintura
    { j: 'hips', type: 'box', s: [0.3, 0.56, 0.24], p: [0, -0.13, 0], taper: [1.3, 1.3], mat: 'shroud' },
    // rosario que cuelga por delante
    ...Array.from({ length: 9 }, (_, i) => ({ j: 'hips', type: 'sphere', s: [0.014], p: [-0.1 + i * 0.025, -0.03 - 0.15 * Math.sin((Math.PI * i) / 8), 0.17 + 0.03 * Math.sin((Math.PI * i) / 8)], mat: 'silver' })),
    { j: 'hips', type: 'box', s: [0.012, 0.07, 0.01], p: [0, -0.23, 0.2], mat: 'silver' },
    { j: 'hips', type: 'box', s: [0.04, 0.012, 0.01], p: [0, -0.215, 0.2], mat: 'silver' },
  ];
  // ---------------------------------------------------------- brazos
  for (const s of ['L', 'R']) {
    const sg = s === 'L' ? 1 : -1;
    parts.push(
      // hombro abullonado y la manga estrecha de arriba
      { j: 'arm' + s, type: 'sphere', s: [0.075, 0.058, 0.075], p: [0, -0.02, 0], seg: 8, seg2: 6, mat: 'shroud' },
      { j: 'arm' + s, type: 'box', s: [0.09, 0.62, 0.09], p: [0, -0.32, 0], taper: [1.25, 1.25], mat: 'shroud' },
      { j: 'fore' + s, type: 'ico', s: [0.064], p: [0, 0, 0], mat: 'shroud' },
      { j: 'fore' + s, type: 'box', s: [0.042, 0.6, 0.042], p: [0, -0.3, 0], taper: [0.8, 0.8], mat: 'skinPale' },
      { j: 'hand' + s, type: 'ico', s: [0.028], p: [0, 0, 0], mat: 'skinPale' },
      { j: 'hand' + s, type: 'box', s: [0.058, 0.09, 0.024], p: [0, -0.045, 0], mat: 'skinPale' },
      { j: 'hand' + s, type: 'box', s: [0.012, 0.09, 0.012], p: [sg * 0.035, -0.07, 0.02], r: [0, 0, sg * 35], mat: 'skinPale' }
    );
    // dedos larguísimos, algo curvados
    for (const x of [-0.021, -0.007, 0.007, 0.021]) {
      const l = 1 - Math.abs(x) * 6;
      parts.push(
        { j: 'hand' + s, type: 'box', s: [0.011, 0.13 * l, 0.011], p: [x, -0.09 - 0.065 * l, 0.004], r: [8, 0, x * 120], mat: 'skinPale' },
        { j: 'hand' + s, type: 'box', s: [0.009, 0.12 * l, 0.009], p: [x * 1.25, -0.09 - 0.13 * l - 0.055 * l, 0.024], r: [24, 0, x * 150], mat: 'skinPale' },
        { j: 'hand' + s, type: 'box', s: [0.01, 0.022, 0.01], p: [x * 1.4, -0.09 - 0.25 * l, 0.05], r: [30, 0, 0], mat: 'black' }
      );
    }
    // manga ancha que cuelga a plomo, con jirones
    parts.push({ j: 'sleeve' + s, type: 'cyl', s: [0.065, 0.165, 0.5], p: [0, -0.25, 0], open: true, seg: 8, mat: 'shroud', ds: true });
    for (const a of [0.4, 2.2, 4.1]) parts.push({ j: 'sleeve' + s, type: 'box', s: [0.035, 0.18, 0.008], p: [Math.sin(a) * 0.16, -0.58, Math.cos(a) * 0.16], r: [0, a / DEG, 4], mat: 'shroud' });
  }
  // ---------------------------------------------------------- falda
  // paños sueltos alrededor de la cintura, más anchos abajo y rotos
  for (let i = 0; i < MOURNER_SKIRT; i++) {
    const L = MOURNER_SKIRT_LEN(i);
    const j = 'sk' + i;
    parts.push({ j, type: 'box', s: [0.2, L, 0.014], p: [0, -L / 2, 0], taper: [1.5, 1], mat: 'shroud' });
    // la punta rota del paño
    parts.push({ j, type: 'box', s: [0.12, 0.17, 0.01], p: [i % 2 ? 0.065 : -0.065, -L - 0.03, 0.002], r: [0, 0, i % 2 ? 14 : -14], mat: 'shroud' });
    const Li = L - 0.1;
    parts.push({ j: 'ski' + i, type: 'box', s: [0.19, Li, 0.012], p: [0, -Li / 2, 0], taper: [1.45, 1], mat: 'shroud' });
  }
  return new Rig({ joints, parts });
}

// ------------------------------------------------------------ El Empalado
export function buildImpaled() {
  const k = 1.8;
  const joints = humanoidJoints(k);
  const parts = [
    { j: 'hips', type: 'box', s: [0.42 * k, 0.36 * k, 0.28 * k], p: [0, -0.12 * k, 0], taper: [1.15, 1.1], mat: 'chainmail' },
    { j: 'hips', type: 'box', s: [0.34 * k, 0.6 * k, 0.03 * k], p: [0, -0.28 * k, 0.15 * k], taper: [1.2, 1], mat: 'clothDark' },
    { j: 'chest', type: 'box', s: [0.5 * k, 0.54 * k, 0.32 * k], p: [0, 0.27 * k, 0], taper: [0.84, 0.9], mat: 'plate' },
    { j: 'chest', type: 'box', s: [0.24 * k, 0.14 * k, 0.26 * k], p: [0.28 * k, 0.48 * k, 0], r: [0, 0, -25], mat: 'plate' },
    { j: 'chest', type: 'box', s: [0.24 * k, 0.14 * k, 0.26 * k], p: [-0.28 * k, 0.48 * k, 0], r: [0, 0, 25], mat: 'plate' },
    // la pica que lo atraviesa
    { j: 'chest', type: 'cyl', s: [0.06, 0.06, 4.2], p: [0.1, 0.3 * k, 0], r: [-60, 15, 0], mat: 'wooddark' },
    { j: 'chest', type: 'cone', s: [0.12, 0.5], p: [0.34, 0.3 * k - 1.0, 1.75], r: [120, 15, 0], mat: 'iron' },
    { j: 'chest', type: 'ico', s: [0.2, 0.16, 0.16], p: [0.08, 0.3 * k, 0.3 * k], mat: 'flesh' },
    { j: 'chest', type: 'ico', s: [0.18], p: [0.12, 0.34 * k, -0.3 * k], mat: 'flesh' },
    // yelmo aplastado
    { j: 'head', type: 'cyl', s: [0.16 * k, 0.17 * k, 0.26 * k], p: [0.02, 0.13 * k, 0], r: [0, 0, 14], seg: 8, mat: 'plate' },
    { j: 'head', type: 'box', s: [0.22 * k, 0.02 * k, 0.02 * k], p: [0, 0.14 * k, 0.17 * k], r: [0, 0, 14], mat: 'redGlow' },
    { j: 'head', type: 'ico', s: [0.14], p: [-0.2, 0.32, 0.05], mat: 'flesh' },
    { j: 'armL', type: 'box', s: [0.15 * k, 0.32 * k, 0.15 * k], p: [0, -0.15 * k, 0], taper: [0.85, 0.85], mat: 'chainmail' },
    { j: 'foreL', type: 'box', s: [0.13 * k, 0.28 * k, 0.13 * k], p: [0, -0.13 * k, 0], taper: [0.85, 0.85], mat: 'plate' },
    { j: 'handL', type: 'box', s: [0.1 * k, 0.1 * k, 0.1 * k], p: [0, -0.05 * k, 0], mat: 'iron' },
    { j: 'armR', type: 'box', s: [0.15 * k, 0.32 * k, 0.15 * k], p: [0, -0.15 * k, 0], taper: [0.85, 0.85], mat: 'chainmail' },
    { j: 'foreR', type: 'box', s: [0.13 * k, 0.28 * k, 0.13 * k], p: [0, -0.13 * k, 0], taper: [0.85, 0.85], mat: 'plate' },
    { j: 'handR', type: 'box', s: [0.1 * k, 0.1 * k, 0.1 * k], p: [0, -0.05 * k, 0], mat: 'iron' },
    // maza de asedio
    { j: 'handR', type: 'cyl', s: [0.06, 0.07, 2.1], p: [0, -0.1, 0.55], r: [90, 0, 0], mat: 'wooddark' },
    { j: 'handR', type: 'box', s: [0.62, 0.42, 0.42], p: [0, -0.1, 1.5], mat: 'iron' },
    { j: 'handR', type: 'box', s: [0.7, 0.08, 0.46], p: [0, 0.08, 1.5], mat: 'iron' },
    { j: 'legL', type: 'box', s: [0.18 * k, 0.46 * k, 0.19 * k], p: [0, -0.22 * k, 0], taper: [0.8, 0.85], mat: 'chainmail' },
    { j: 'shinL', type: 'box', s: [0.15 * k, 0.42 * k, 0.16 * k], p: [0, -0.2 * k, 0], taper: [0.9, 0.9], mat: 'plate' },
    { j: 'legR', type: 'box', s: [0.18 * k, 0.46 * k, 0.19 * k], p: [0, -0.22 * k, 0], taper: [0.8, 0.85], mat: 'chainmail' },
    { j: 'shinR', type: 'box', s: [0.15 * k, 0.42 * k, 0.16 * k], p: [0, -0.2 * k, 0], taper: [0.9, 0.9], mat: 'plate' },
    ...feetParts(k, 'iron', { w: 0.14, h: 0.08, l: 0.26 }),
  ];
  return new Rig({ joints, parts });
}

// ------------------------------------------------------------ El Turiferario
// El arzobispo transfigurado: casulla carmesí, jaula de hierro por rostro,
// corona de velas, costillar abierto con un núcleo ardiente.
export function buildTuribulario() {
  const k = 2.35;
  const joints = humanoidJoints(k, { arm: 1.18 });
  const parts = [
    { j: 'hips', type: 'box', s: [0.5 * k, 1.05 * k, 0.4 * k], p: [0, -0.42 * k, 0], taper: [1.6, 1.4], mat: 'clothRed' },
    { j: 'hips', type: 'box', s: [0.12 * k, 1.0 * k, 0.02], p: [0, -0.42 * k, 0.21 * k], taper: [1.3, 1], mat: 'bronze' },
    { j: 'chest', type: 'box', s: [0.46 * k, 0.6 * k, 0.3 * k], p: [0, 0.3 * k, -0.02 * k], taper: [0.85, 0.9], mat: 'clothRed' },
    { j: 'chest', type: 'box', s: [0.5 * k, 0.12 * k, 0.34 * k], p: [0, 0.54 * k, 0], mat: 'bronze' },
    // costillar abierto con núcleo
    { j: 'chest', type: 'sphere', s: [0.1 * k], p: [0, 0.32 * k, 0.1 * k], mat: 'redGlow' },
    ...[0.2, 0.28, 0.36, 0.44].map((y) => ({ j: 'chest', type: 'box', s: [0.04 * k, 0.03 * k, 0.16 * k], p: [0.11 * k, y * k, 0.16 * k], r: [0, -35, 0], mat: 'bone' })),
    ...[0.2, 0.28, 0.36, 0.44].map((y) => ({ j: 'chest', type: 'box', s: [0.04 * k, 0.03 * k, 0.16 * k], p: [-0.11 * k, y * k, 0.16 * k], r: [0, 35, 0], mat: 'bone' })),
    { j: 'chest', type: 'ico', s: [0.12 * k, 0.1 * k, 0.1 * k], p: [0.14 * k, 0.12 * k, 0.12 * k], mat: 'flesh' },
    // cabeza: jaula de hierro, mitra y corona de velas
    { j: 'head', type: 'box', s: [0.22 * k, 0.26 * k, 0.24 * k], p: [0, 0.12 * k, 0], mat: 'skinCorrupt' },
    ...[-0.08, -0.03, 0.03, 0.08].map((x) => ({ j: 'head', type: 'box', s: [0.015 * k, 0.28 * k, 0.015 * k], p: [x * k, 0.12 * k, 0.13 * k], mat: 'iron' })),
    { j: 'head', type: 'box', s: [0.25 * k, 0.02 * k, 0.26 * k], p: [0, 0.2 * k, 0], mat: 'iron' },
    { j: 'head', type: 'box', s: [0.25 * k, 0.02 * k, 0.26 * k], p: [0, 0.03 * k, 0], mat: 'iron' },
    { j: 'head', type: 'sphere', s: [0.02 * k], p: [-0.05 * k, 0.14 * k, 0.12 * k], mat: 'eyeGlow' },
    { j: 'head', type: 'sphere', s: [0.02 * k], p: [0.05 * k, 0.14 * k, 0.12 * k], mat: 'eyeGlow' },
    { j: 'head', type: 'box', s: [0.22 * k, 0.34 * k, 0.1 * k], p: [0, 0.4 * k, 0], taper: [1.4, 1.2], r: [180, 0, 0], mat: 'clothWhite' },
    { j: 'head', type: 'box', s: [0.03 * k, 0.3 * k, 0.11 * k], p: [0, 0.38 * k, 0], mat: 'bronze' },
    { j: 'head', type: 'torus', s: [0.2 * k, 0.012 * k], p: [0, 0.3 * k, -0.08 * k], r: [10, 0, 0], seg: 12, mat: 'iron' },
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => {
      const a = Math.PI * (0.1 + (i / 6) * 0.8);
      return { j: 'head', type: 'cyl', s: [0.018 * k, 0.018 * k, 0.1 * k], p: [Math.cos(a) * 0.2 * k, 0.3 * k + Math.sin(a) * 0.2 * k, -0.08 * k], mat: 'candle' };
    }),
    // brazos: mangas y antebrazos descarnados
    { j: 'armL', type: 'box', s: [0.16 * k, 0.34 * k, 0.16 * k], p: [0, -0.15 * k, 0], taper: [1.3, 1.3], mat: 'clothRed' },
    { j: 'foreL', type: 'box', s: [0.07 * k, 0.3 * k, 0.07 * k], p: [0, -0.14 * k, 0], taper: [0.7, 0.7], mat: 'skinCorrupt' },
    { j: 'foreL', type: 'box', s: [0.03 * k, 0.28 * k, 0.03 * k], p: [0.03 * k, -0.14 * k, 0.03 * k], mat: 'bone' },
    { j: 'handL', type: 'box', s: [0.07 * k, 0.12 * k, 0.04 * k], p: [0, -0.06 * k, 0], mat: 'skinCorrupt' },
    { j: 'armR', type: 'box', s: [0.16 * k, 0.34 * k, 0.16 * k], p: [0, -0.15 * k, 0], taper: [1.3, 1.3], mat: 'clothRed' },
    { j: 'foreR', type: 'box', s: [0.07 * k, 0.3 * k, 0.07 * k], p: [0, -0.14 * k, 0], taper: [0.7, 0.7], mat: 'skinCorrupt' },
    { j: 'foreR', type: 'box', s: [0.03 * k, 0.28 * k, 0.03 * k], p: [-0.03 * k, -0.14 * k, 0.03 * k], mat: 'bone' },
    { j: 'handR', type: 'box', s: [0.07 * k, 0.12 * k, 0.04 * k], p: [0, -0.06 * k, 0], mat: 'skinCorrupt' },
    // piernas ocultas: sólo pies bajo la casulla
    { j: 'shinL', type: 'box', s: [0.08 * k, 0.44 * k, 0.08 * k], p: [0, -0.2 * k, 0], mat: 'skinCorrupt' },
    { j: 'shinR', type: 'box', s: [0.08 * k, 0.44 * k, 0.08 * k], p: [0, -0.2 * k, 0], mat: 'skinCorrupt' },
    ...feetParts(k, 'skinCorrupt', { w: 0.085, h: 0.05, l: 0.21 }),
  ];
  return new Rig({ joints, parts });
}

export const CANDLE_OFFSETS = (k = 2.35) =>
  [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const a = Math.PI * (0.1 + (i / 6) * 0.8);
    return new THREE.Vector3(Math.cos(a) * 0.2 * k, 0.3 * k + Math.sin(a) * 0.2 * k + 0.07 * k, -0.08 * k);
  });

// ------------------------------------------------------------ El Descoyuntado
// El canónigo, boca arriba sobre cuatro miembros descoyuntados como una
// araña: los codos y las rodillas por encima del cuerpo, huesos asomando en
// cada articulación, la sotana hecha jirones colgando hasta el suelo y la
// cabeza del revés (la tonsura abajo, la boca arriba). Lleva su rosario
// enredado en la muñeca izquierda.
export const DESC = { body: 1.02, LAf: 1.0, LBf: 1.75, LAb: 0.95, LBb: 1.7, pelvisZ: -0.2 };
// Jirones de la sotana: [articulación padre, x, z (en el padre), largo, ancho]
// Cuelgan de sus articulaciones propias (movimiento secundario: caen hacia
// el suelo aunque él vaya boca abajo por el techo, se quedan atrás al correr).
export const DESC_CLOTH = [
  ['body', 0.27, 0.42, 0.34, 0.12, 10],
  ['body', -0.27, 0.4, 0.28, 0.16, -14],
  ['body', 0.27, 0.24, 0.62, 0.2, -8],
  ['body', -0.27, 0.2, 0.5, 0.14, 12],
  ['body', 0.27, 0.04, 0.44, 0.17, 18],
  ['body', -0.27, 0.02, 0.7, 0.22, -6],
  ['pelvis', 0.26, 0.0, 0.78, 0.24, -12],
  ['pelvis', -0.26, -0.02, 0.46, 0.13, 20],
  ['pelvis', 0.25, -0.24, 0.54, 0.18, 6],
  ['pelvis', -0.25, -0.22, 0.66, 0.2, -18],
  ['pelvis', 0.02, -0.4, 0.72, 0.34, 4],
];
export function buildDescoyuntado() {
  const D = DESC;
  const pz = D.pelvisZ;
  const joints = [
    { name: 'body', pos: [0, D.body, 0] },
    // la mitad de atrás del tronco (se dobla y se tuerce respecto a la de delante)
    { name: 'pelvis', parent: 'body', pos: [0, 0, pz] },
    // costillas y esternón (respiran)
    { name: 'ribs', parent: 'body', pos: [0, 0.12, 0.12] },
    { name: 'neck', parent: 'body', pos: [0, 0.02, 0.6] },
    { name: 'head', parent: 'neck', pos: [0, -0.32, 0.04] },
    // mandíbula (con la cabeza del revés, el mentón queda arriba)
    { name: 'jaw', parent: 'head', pos: [0, -0.02, 0.06] },
  ];
  // brazos en la mitad de delante; piernas en la de atrás
  const limbs = [
    ['lf', 'body', 0.27, 0.44, D.LAf, D.LBf],
    ['rf', 'body', -0.27, 0.44, D.LAf, D.LBf],
    ['lb', 'pelvis', 0.23, -0.48 - pz, D.LAb, D.LBb],
    ['rb', 'pelvis', -0.23, -0.48 - pz, D.LAb, D.LBb],
  ];
  for (const [n, par, x, z, la, lb] of limbs) {
    joints.push({ name: n + 'A', parent: par, pos: [x, 0.04, z] });
    joints.push({ name: n + 'B', parent: n + 'A', pos: [0, la, 0] });
    // muñeca y dedos (en las manos)
    if (n[1] === 'f') {
      joints.push({ name: n + 'H', parent: n + 'B', pos: [0, -lb, 0] });
      joints.push({ name: n + 'F', parent: n + 'H', pos: [0, 0, 0.09] });
    }
  }
  DESC_CLOTH.forEach(([par, x, z], i) => joints.push({ name: 'cl' + i, parent: par, pos: [x, 0.03, z] }));
  const parts = [
    // tronco boca arriba: costillas y esternón por encima, espinazo por debajo
    { j: 'body', type: 'box', s: [0.56, 0.3, 0.72], p: [0, 0, 0.23], taper: [0.8, 1], mat: 'skinCorrupt' },
    { j: 'body', type: 'box', s: [0.06, 0.06, 0.62], p: [0, -0.13, 0.24], mat: 'bone' },
    { j: 'body', type: 'box', s: [0.64, 0.2, 0.24], p: [0, 0, 0.46], mat: 'skinCorrupt' },
    { j: 'pelvis', type: 'box', s: [0.52, 0.28, 0.56], p: [0, -0.005, -0.16], taper: [0.8, 1], mat: 'skinCorrupt' },
    { j: 'pelvis', type: 'box', s: [0.06, 0.06, 0.5], p: [0, -0.13, -0.14], mat: 'bone' },
    { j: 'pelvis', type: 'box', s: [0.52, 0.2, 0.26], p: [0, -0.01, -0.28], mat: 'skinCorrupt' },
    { j: 'pelvis', type: 'ico', s: [0.16, 0.08, 0.2], p: [0.06, 0.1, -0.1], mat: 'flesh' },
    // costillas (se abren al respirar)
    ...[-0.24, -0.09, 0.06, 0.21].map((z) => ({ j: 'ribs', type: 'box', s: [0.5, 0.035, 0.04], p: [0, 0.005, z], mat: 'bone' })),
    { j: 'ribs', type: 'box', s: [0.06, 0.045, 0.52], p: [0, 0.02, 0.02], mat: 'bone' },
    { j: 'ribs', type: 'box', s: [0.4, 0.06, 0.48], p: [0, -0.04, 0], mat: 'flesh' },
    // alzacuello
    { j: 'body', type: 'box', s: [0.22, 0.08, 0.08], p: [0, 0.02, 0.6], mat: 'clothWhite' },
    // cuello estirado, con la carne abierta
    { j: 'neck', type: 'box', s: [0.11, 0.36, 0.11], p: [0, -0.15, 0.02], taper: [0.9, 0.9], mat: 'skinCorrupt' },
    { j: 'neck', type: 'ico', s: [0.08], p: [0.03, -0.03, 0], mat: 'flesh' },
    // cabeza del revés: la boca arriba, los ojos debajo y la tonsura abajo
    { j: 'head', type: 'box', s: [0.24, 0.3, 0.27], p: [0, -0.13, 0.03], mat: 'skinCorrupt' },
    { j: 'head', type: 'box', s: [0.13, 0.13, 0.02], p: [0, -0.05, 0.17], mat: 'black' },
    ...[-0.045, -0.015, 0.015, 0.045].map((x) => ({ j: 'head', type: 'box', s: [0.018, 0.03, 0.015], p: [x, -0.1, 0.178], mat: 'bone' })),
    ...[-0.04, 0, 0.04].map((x) => ({ j: 'jaw', type: 'box', s: [0.018, 0.028, 0.015], p: [x, 0.015, 0.118], mat: 'bone' })),
    { j: 'jaw', type: 'box', s: [0.2, 0.07, 0.2], p: [0, 0.03, 0.02], mat: 'skinCorrupt' },
    { j: 'head', type: 'box', s: [0.15, 0.1, 0.12], p: [0, -0.05, 0.1], mat: 'black' },
    { j: 'head', type: 'box', s: [0.04, 0.06, 0.04], p: [0, -0.145, 0.175], mat: 'skinCorrupt' },
    { j: 'head', type: 'box', s: [0.036, 0.022, 0.012], p: [-0.056, -0.195, 0.168], mat: 'eyeGlow' },
    { j: 'head', type: 'box', s: [0.036, 0.022, 0.012], p: [0.056, -0.195, 0.168], mat: 'eyeGlow' },
    { j: 'head', type: 'box', s: [0.26, 0.06, 0.29], p: [0, -0.265, 0.03], mat: 'black' },
    { j: 'head', type: 'box', s: [0.17, 0.03, 0.19], p: [0, -0.3, 0.03], mat: 'skinCorrupt' },
  ];
  // jirones: tiras estrechas que cuelgan de su articulación (-Y)
  // (tela rasgada: cada jirón algo girado, más estrecho abajo y con una
  // tira más corta pegada al lado: no una cortina de barrotes)
  DESC_CLOTH.forEach(([, x, , len, w, tw], i) => {
    const back = i === DESC_CLOTH.length - 1;
    const sx = Math.sign(x) || 1;
    parts.push({ j: 'cl' + i, type: 'box', s: back ? [w, len, 0.015] : [0.015, len, w], p: [0, -len / 2, 0], r: back ? [-8, tw, 3] : [0, tw, sx * 6], taper: [0.25, 0.3], mat: 'clothDark', ds: true });
    if (len > 0.45) parts.push({ j: 'cl' + i, type: 'box', s: back ? [w * 0.5, len * 0.55, 0.012] : [0.012, len * 0.55, w * 0.55], p: back ? [w * 0.3, -len * 0.27, 0.01] : [sx * 0.01, -len * 0.27, w * 0.35], r: back ? [-4, -tw, 8] : [0, -tw * 1.4, sx * 14], taper: [0.2, 0.2], mat: 'clothDark', ds: true });
  });
  for (const [n, , , , la, lb] of limbs) {
    const front = n[1] === 'f';
    // (brazos y muslos de hombre, no patas de araña)
    parts.push({ j: n + 'A', type: 'box', s: [0.15, la + 0.04, 0.15], p: [0, la / 2, 0], taper: [0.72, 0.72], mat: 'skinCorrupt' });
    parts.push({ j: n + 'A', type: 'ico', s: [0.11], p: [0, 0.03, 0], mat: 'flesh' });
    // codo / rodilla descoyuntados: el hueso asoma
    parts.push({ j: n + 'A', type: 'ico', s: [0.075], p: [0, la, 0], mat: 'bone' });
    parts.push({ j: n + 'A', type: 'cone', s: [0.028, 0.18], p: [0, la + 0.05, -0.07], r: [-50, 0, 0], mat: 'bone' });
    parts.push({ j: n + 'B', type: 'box', s: [0.11, lb, 0.11], p: [0, -lb / 2, 0], taper: [0.5, 0.5], mat: 'skinCorrupt' });
    // tendones tensos bajo la piel
    parts.push({ j: n + 'B', type: 'box', s: [0.025, lb * 0.7, 0.025], p: [0.04, -lb * 0.42, 0.045], mat: 'flesh' });
    if (front) {
      // manos con dedos larguísimos (los dedos se cierran en su articulación)
      parts.push({ j: n + 'H', type: 'box', s: [0.11, 0.03, 0.13], p: [0, 0, 0.03], mat: 'skinCorrupt' });
      for (const dx of [-0.04, -0.013, 0.013, 0.04]) parts.push({ j: n + 'F', type: 'box', s: [0.016, 0.016, 0.26], p: [dx * 1.5, 0, 0.12], r: [0, dx * 260, 0], mat: 'skinCorrupt' });
      // el pulgar, aparte
      parts.push({ j: n + 'H', type: 'box', s: [0.016, 0.016, 0.14], p: [(n[0] === 'l' ? 1 : -1) * 0.07, 0, 0.06], r: [0, (n[0] === 'l' ? 1 : -1) * 35, 0], mat: 'skinCorrupt' });
    } else parts.push({ j: n + 'B', type: 'box', s: [0.1, 0.05, 0.26], p: [0, -lb + 0.01, -0.06], mat: 'skinCorrupt' });
  }
  // el rosario enredado en la muñeca izquierda
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    parts.push({ j: 'lfB', type: 'sphere', s: [0.022], p: [Math.cos(a) * 0.06, -DESC.LBf + 0.2, Math.sin(a) * 0.06], mat: 'black' });
  }
  parts.push({ j: 'lfB', type: 'box', s: [0.012, 0.09, 0.012], p: [0.065, -DESC.LBf + 0.12, 0], mat: 'silver' });
  parts.push({ j: 'lfB', type: 'box', s: [0.05, 0.012, 0.012], p: [0.065, -DESC.LBf + 0.1, 0], mat: 'silver' });
  return new Rig({ joints, parts });
}
