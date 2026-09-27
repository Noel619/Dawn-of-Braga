// Modelos de las criaturas: restos humanos, armaduras y deformaciones.
import * as THREE from 'three';
import { Rig } from './rig.js';
import { humanoidJoints, swordParts, feetParts } from './models.js';

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
// Bruto de 2,6 m con una campana de la Sé fundida en lugar de cabeza.
export function buildBell() {
  const k = 1.38;
  const joints = humanoidJoints(k, { arm: 1.05 });
  joints.push({ name: 'bellJ', parent: 'chest', pos: [0, 0.56 * k, 0] });
  const bellPts = [
    [0.001, 0.95],
    [0.16, 0.95],
    [0.3, 0.86],
    [0.36, 0.64],
    [0.4, 0.34],
    [0.48, 0.1],
    [0.58, -0.02],
    [0.56, -0.08],
  ];
  const parts = [
    { j: 'hips', type: 'box', s: [0.62, 0.36, 0.44], p: [0, -0.08, 0], taper: [1.05, 1.05], mat: 'skinCorrupt' },
    { j: 'hips', type: 'box', s: [0.5, 1.0, 0.04], p: [0, -0.45, 0.24], taper: [1.2, 1], mat: 'leather' },
    { j: 'chest', type: 'box', s: [0.82, 0.7, 0.52], p: [0, 0.34, 0], taper: [0.72, 0.9], mat: 'skinCorrupt' },
    { j: 'chest', type: 'ico', s: [0.2, 0.16, 0.14], p: [-0.2, 0.25, 0.22], mat: 'flesh' },
    { j: 'chest', type: 'ico', s: [0.16], p: [0.25, 0.5, -0.18], mat: 'flesh' },
    // cadenas cruzadas
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => ({ j: 'chest', type: 'torus', s: [0.05, 0.015], p: [-0.3 + i * 0.1, 0.12 + i * 0.08, 0.27], r: [0, 90 * (i % 2), 40], mat: 'iron', seg: 6 })),
    // campana
    { j: 'bellJ', type: 'lathe', points: bellPts, s: [1, 1, 1], p: [0, -0.28, 0], seg: 10, mat: 'bronze' },
    { j: 'bellJ', type: 'cyl', s: [0.5, 0.5, 0.02], p: [0, -0.32, 0], seg: 10, mat: 'black' },
    { j: 'bellJ', type: 'torus', s: [0.1, 0.03], p: [0, 0.7, 0], r: [0, 0, 90], mat: 'iron' },
    { j: 'bellJ', type: 'sphere', s: [0.035], p: [-0.12, -0.26, 0.4], mat: 'eyeGlow' },
    { j: 'bellJ', type: 'sphere', s: [0.035], p: [0.1, -0.24, 0.42], mat: 'eyeGlow' },
    // brazos enormes
    { j: 'armL', type: 'box', s: [0.24, 0.44, 0.24], p: [0, -0.2, 0], taper: [0.85, 0.85], mat: 'skinCorrupt' },
    { j: 'foreL', type: 'box', s: [0.22, 0.42, 0.22], p: [0, -0.2, 0], taper: [0.85, 0.85], mat: 'skinCorrupt' },
    { j: 'handL', type: 'box', s: [0.18, 0.18, 0.16], p: [0, -0.07, 0], mat: 'skinCorrupt' },
    { j: 'armR', type: 'box', s: [0.24, 0.44, 0.24], p: [0, -0.2, 0], taper: [0.85, 0.85], mat: 'skinCorrupt' },
    { j: 'foreR', type: 'box', s: [0.22, 0.42, 0.22], p: [0, -0.2, 0], taper: [0.85, 0.85], mat: 'skinCorrupt' },
    { j: 'foreR', type: 'box', s: [0.24, 0.12, 0.24], p: [0, -0.3, 0], mat: 'iron' },
    { j: 'handR', type: 'box', s: [0.18, 0.18, 0.16], p: [0, -0.07, 0], mat: 'skinCorrupt' },
    // badajo como maza
    { j: 'handR', type: 'cyl', s: [0.05, 0.06, 1.5], p: [0, -0.08, 0.55], r: [90, 0, 0], mat: 'iron' },
    { j: 'handR', type: 'ico', s: [0.22, 0.26, 0.22], p: [0, -0.08, 1.36], mat: 'iron', detail: 1 },
    { j: 'legL', type: 'box', s: [0.27, 0.64, 0.29], p: [0, -0.3, 0], taper: [0.8, 0.85], mat: 'skinCorrupt' },
    { j: 'shinL', type: 'box', s: [0.23, 0.6, 0.25], p: [0, -0.28, 0], taper: [0.85, 0.85], mat: 'skinCorrupt' },
    { j: 'legR', type: 'box', s: [0.27, 0.64, 0.29], p: [0, -0.3, 0], taper: [0.8, 0.85], mat: 'skinCorrupt' },
    { j: 'shinR', type: 'box', s: [0.23, 0.6, 0.25], p: [0, -0.28, 0], taper: [0.85, 0.85], mat: 'skinCorrupt' },
    ...feetParts(1.38, 'skinCorrupt', { w: 0.15, h: 0.06, l: 0.24 }),
  ];
  return new Rig({ joints, parts });
}

// ------------------------------------------------------------ Plañidera
// Figura altísima velada que flota; brazos que llegan al suelo.
export function buildMourner() {
  const k = 1.25;
  const joints = humanoidJoints(k, { arm: 1.75 });
  joints.push({ name: 'veil', parent: 'head', pos: [0, 0.2, -0.08] });
  const parts = [
    { j: 'hips', type: 'box', s: [0.46, 1.3, 0.38], p: [0, -0.6, 0], taper: [1.7, 1.5], mat: 'clothWhite' },
    { j: 'chest', type: 'box', s: [0.36, 0.66, 0.24], p: [0, 0.32, 0], taper: [1.1, 1], mat: 'clothWhite' },
    { j: 'chest', type: 'box', s: [0.12, 0.3, 0.01], p: [0, 0.2, 0.125], mat: 'blood' },
    { j: 'head', type: 'box', s: [0.24, 0.34, 0.26], p: [0, 0.16, 0], taper: [1.25, 1.1], mat: 'clothWhite' },
    { j: 'head', type: 'box', s: [0.08, 0.1, 0.01], p: [0, 0.07, 0.14], mat: 'black' },
    { j: 'head', type: 'box', s: [0.1, 0.16, 0.01], p: [0, -0.02, 0.135], mat: 'blood' },
    { j: 'veil', type: 'box', s: [0.34, 1.3, 0.02], p: [0, -0.62, 0], taper: [1.6, 1], mat: 'clothWhite' },
    { j: 'armL', type: 'box', s: [0.055, 0.52, 0.055], p: [0, -0.25, 0], mat: 'skinCorrupt' },
    { j: 'foreL', type: 'box', s: [0.045, 0.5, 0.045], p: [0, -0.24, 0], mat: 'skinCorrupt' },
    { j: 'handL', type: 'box', s: [0.06, 0.1, 0.03], p: [0, -0.05, 0], mat: 'skinCorrupt' },
    ...[-0.024, -0.008, 0.008, 0.024].map((x, i) => ({ j: 'handL', type: 'box', s: [0.012, 0.24 + (i % 2) * 0.04, 0.012], p: [x, -0.2, 0], mat: 'skinCorrupt' })),
    { j: 'armR', type: 'box', s: [0.055, 0.52, 0.055], p: [0, -0.25, 0], mat: 'skinCorrupt' },
    { j: 'foreR', type: 'box', s: [0.045, 0.5, 0.045], p: [0, -0.24, 0], mat: 'skinCorrupt' },
    { j: 'handR', type: 'box', s: [0.06, 0.1, 0.03], p: [0, -0.05, 0], mat: 'skinCorrupt' },
    ...[-0.024, -0.008, 0.008, 0.024].map((x, i) => ({ j: 'handR', type: 'box', s: [0.012, 0.24 + (i % 2) * 0.04, 0.012], p: [x, -0.2, 0], mat: 'skinCorrupt' })),
  ];
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

// ------------------------------------------------------------ O Turiferario
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
