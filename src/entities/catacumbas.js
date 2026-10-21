// Las criaturas de las catacumbas de la Sé (la cripta honda), que no son las
// de la ciudad de arriba:
//  - el Cavador: el fosor que abrió estas galerías y nunca dejó de cavar. Se
//    le oye antes de verlo (el pico contra la piedra) y se le ve por la vela
//    que lleva pegada a la frente. Lleva a la espalda un cuévano lleno de
//    calaveras. El pico, de arriba abajo o de lado; y si lo clava en el
//    suelo, la bóveda suelta piedras.
//  - la Emparedada: la reclusa que se hizo tapiar en vida; la pared se la
//    tragó de cintura para abajo y arrastra la obra. Mira por el ventanuco
//    de su celda, que lleva en la cabeza, con un solo ojo. Agarra, araña y,
//    si se le acerca uno, se deja caer con todo el peso de la obra.
//  - el Enrodado: el reo que quebraron en la rueda y enterraron con ella,
//    los miembros trenzados entre los radios. Rueda por las galerías: carga
//    en línea recta, y cuando la rueda se vuelca, aplasta lo que pilla; el
//    brazo suelto da zarpazos.
import * as THREE from 'three';
import { Rig, clip, addRot, q2e, Spring } from './rig.js';
import { humanoidJoints, feetParts } from './models.js';
import { DEG, clamp, damp } from '../core/util.js';
import { GAIT } from './locomotion.js';
import { additiveFog } from '../gfx/materials.js';
import { getTexture } from '../gfx/textures.js';

const S = Math.sin;

// grados -> radianes (root en cm -> m)
function rad(p) {
  const o = {};
  for (const k in p) o[k] = k === 'root' ? p[k].map((v) => v / 100) : p[k].map((v) => v * DEG);
  return o;
}

// lo que cuelga: la articulación 'j' a plomo (con un vaivén swX/swZ)
const _hq = new THREE.Quaternion(),
  _hq2 = new THREE.Quaternion(),
  _he = new THREE.Euler();
function hangDown(e, pose, j, swX, swZ) {
  const parent = e.rig.joints[j].parent;
  parent.updateWorldMatrix(true, false);
  parent.getWorldQuaternion(_hq);
  _hq2.setFromEuler(_he.set(swX, e.obj.rotation.y, swZ, 'YXZ'));
  _hq.invert().multiply(_hq2);
  pose[j] = q2e(_hq, [0, 0, 0]);
}

// una llama (sprite animado del fuego) en la escena
function flame(g, w, h) {
  const tex = getTexture('fire').clone();
  tex.needsUpdate = true;
  tex.repeat.set(1 / 8, 1);
  const sp = new THREE.Sprite(additiveFog(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: true })));
  sp.scale.set(w, h, 1);
  g.scene.add(sp);
  return sp;
}

// ======================================================================= EL CAVADOR
const KC = 1.1;
const SKD = 'skinDust';
// (el pico: el mango sale de la mano derecha hacia +z; la cabeza, en su punta)
export const CAV_PICK = new THREE.Vector3(0, -0.3, 0.78);

export function buildCavador() {
  const joints = humanoidJoints(KC, { arm: 1.28 });
  joints.push({ name: 'jaw', parent: 'head', pos: [0, 0.07, 0.05] });
  joints.push({ name: 'basket', parent: 'chest', pos: [0, 0.36, -0.2] });
  joints.push({ name: 'lampJ', parent: 'hips', pos: [-0.2, 0.0, 0.1] });
  const parts = [];
  const P = (o) => parts.push(o);
  // ---------------------------------------------------------- cabeza
  // el cráneo alargado, pelado, con la piel cuarteada de polvo
  P({ j: 'head', type: 'cyl', s: [0.04, 0.05, 0.12], p: [0, 0.0, 0], seg: 6, mat: SKD });
  P({ j: 'head', type: 'box', s: [0.17, 0.25, 0.2], p: [0, 0.14, 0.01], taper: [0.72, 0.82], mat: SKD });
  P({ j: 'head', type: 'box', s: [0.18, 0.035, 0.06], p: [0, 0.19, 0.085], mat: SKD });
  for (const sx of [1, -1]) {
    P({ j: 'head', type: 'box', s: [0.048, 0.032, 0.02], p: [sx * 0.042, 0.163, 0.1], r: [0, sx * 10, 0], mat: 'black' });
    P({ j: 'head', type: 'box', s: [0.012, 0.009, 0.006], p: [sx * 0.042, 0.161, 0.111], mat: 'eyeGlow' });
    P({ j: 'head', type: 'box', s: [0.04, 0.03, 0.045], p: [sx * 0.07, 0.12, 0.072], mat: SKD });
  }
  // sin nariz: el hueco
  P({ j: 'head', type: 'box', s: [0.026, 0.04, 0.012], p: [0, 0.125, 0.108], mat: 'black' });
  for (let i = 0; i < 5; i++) P({ j: 'head', type: 'box', s: [0.012, 0.018, 0.01], p: [-0.028 + i * 0.014, 0.087, 0.1], mat: 'bone' });
  // el gorro de cuero, y encima la vela pegada con su cera
  P({ j: 'head', type: 'sphere', s: [0.105, 0.1, 0.115], p: [0, 0.2, -0.015], seg: 10, seg2: 6, sph: [0, 360, 0, 80], mat: 'leather' });
  P({ j: 'head', type: 'cyl', s: [0.048, 0.055, 0.016], p: [0.02, 0.29, 0.02], seg: 7, mat: 'candle' });
  P({ j: 'head', type: 'cyl', s: [0.021, 0.025, 0.11], p: [0.02, 0.345, 0.02], r: [0, 0, -6], seg: 6, mat: 'candle' });
  P({ j: 'head', type: 'box', s: [0.012, 0.06, 0.012], p: [0.05, 0.27, 0.05], r: [0, 0, 8], mat: 'candle' });
  P({ j: 'head', type: 'box', s: [0.01, 0.09, 0.01], p: [-0.01, 0.255, 0.065], mat: 'candle' });
  P({ j: 'head', type: 'box', s: [0.01, 0.05, 0.01], p: [0.06, 0.24, -0.02], mat: 'candle' });
  // la mandíbula, descolgada
  P({ j: 'jaw', type: 'box', s: [0.12, 0.045, 0.1], p: [0, -0.02, 0.025], taper: [0.8, 0.9], mat: SKD });
  P({ j: 'jaw', type: 'box', s: [0.07, 0.02, 0.02], p: [0, 0.006, 0.066], mat: 'black' });
  for (let i = 0; i < 4; i++) P({ j: 'jaw', type: 'box', s: [0.012, 0.016, 0.01], p: [-0.021 + i * 0.014, 0.012, 0.07], mat: 'bone' });

  // ---------------------------------------------------------- tronco
  P({ j: 'chest', type: 'box', s: [0.31, 0.62, 0.2], p: [0, 0.25, 0], taper: [0.82, 0.92], mat: 'burlap' });
  // el escote: la piel, las costillas y las clavículas que asoman
  P({ j: 'chest', type: 'box', s: [0.15, 0.17, 0.01], p: [0, 0.48, 0.112], mat: SKD });
  for (let i = 0; i < 3; i++) P({ j: 'chest', type: 'box', s: [0.12 - i * 0.02, 0.012, 0.008], p: [0, 0.5 - i * 0.04, 0.118], mat: 'bone' });
  for (const sx of [1, -1]) P({ j: 'chest', type: 'box', s: [0.16, 0.024, 0.03], p: [sx * 0.09, 0.56, 0.08], r: [0, 0, sx * -12], mat: SKD });
  // el peto del mandil de cuero, con sus tiras al cuello
  P({ j: 'chest', type: 'box', s: [0.27, 0.36, 0.02], p: [0, 0.16, 0.108], taper: [1.04, 1], mat: 'leather' });
  for (const sx of [1, -1]) P({ j: 'chest', type: 'box', s: [0.025, 0.24, 0.012], p: [sx * 0.1, 0.44, 0.112], r: [0, 0, sx * 14], mat: 'leather' });
  // por detrás, la túnica rota: el espinazo
  P({ j: 'chest', type: 'box', s: [0.1, 0.42, 0.008], p: [0, 0.3, -0.112], mat: 'black' });
  for (let i = 0; i < 6; i++) P({ j: 'chest', type: 'box', s: [0.045, 0.035, 0.03], p: [0, 0.12 + i * 0.07, -0.113], mat: SKD });
  // las correas del cuévano, por los hombros
  for (const sx of [1, -1]) {
    P({ j: 'chest', type: 'box', s: [0.035, 0.03, 0.27], p: [sx * 0.13, 0.6, -0.01], mat: 'rope' });
    P({ j: 'chest', type: 'box', s: [0.03, 0.3, 0.02], p: [sx * 0.14, 0.44, 0.125], mat: 'rope' });
  }
  // el cuévano de mimbre lleno de calaveras, con un fémur y el mango de la pala
  P({ j: 'basket', type: 'cyl', s: [0.24, 0.17, 0.55], p: [0, 0, -0.06], open: true, seg: 10, mat: 'straw', ds: true });
  P({ j: 'basket', type: 'cyl', s: [0.17, 0.17, 0.02], p: [0, -0.275, -0.06], seg: 10, mat: 'straw' });
  for (const y of [0.27, 0.06, -0.18]) P({ j: 'basket', type: 'torus', s: [0.17 + ((y + 0.275) / 0.55) * 0.07 + 0.005, 0.014], p: [0, y, -0.06], r: [90, 0, 0], seg: 14, mat: 'wooddark' });
  for (const [x, z, ry] of [
    [0.08, 0.0, 20],
    [-0.09, -0.05, -40],
    [0.02, -0.15, 170],
    [-0.04, 0.06, -10],
  ]) {
    P({ j: 'basket', type: 'sphere', s: [0.07, 0.075, 0.085], p: [x, 0.29, z - 0.06], seg: 8, seg2: 6, mat: 'bone' });
    const a = ry * DEG;
    for (const sx of [1, -1]) P({ j: 'basket', type: 'box', s: [0.026, 0.02, 0.01], p: [x + Math.sin(a) * 0.075 + Math.cos(a) * sx * 0.025, 0.29, z - 0.06 + Math.cos(a) * 0.075 - Math.sin(a) * sx * 0.025], r: [0, ry, 0], mat: 'black' });
  }
  P({ j: 'basket', type: 'cyl', s: [0.016, 0.02, 0.5], p: [0.1, 0.45, -0.02], r: [-14, 0, -10], seg: 5, mat: 'bone' });
  P({ j: 'basket', type: 'cyl', s: [0.018, 0.018, 0.6], p: [-0.12, 0.42, -0.12], r: [10, 0, 12], seg: 5, mat: 'wooddark' });
  P({ j: 'basket', type: 'box', s: [0.14, 0.03, 0.03], p: [-0.18, 0.71, -0.07], r: [10, 0, 12], mat: 'wooddark' });

  // ---------------------------------------------------------- cintura
  P({ j: 'hips', type: 'cyl', s: [0.135, 0.15, 0.22], p: [0, 0.07, 0], sc: [1, 1, 0.75], seg: 8, mat: 'burlap' });
  P({ j: 'hips', type: 'box', s: [0.33, 0.38, 0.23], p: [0, -0.13, 0], taper: [1.2, 1.15], mat: 'burlap' });
  for (const [x, l, rz] of [
    [-0.15, 0.2, 8],
    [0.02, 0.16, -4],
    [0.17, 0.24, -10],
  ])
    P({ j: 'hips', type: 'box', s: [0.08, l, 0.012], p: [x, -0.31 - l / 2, -0.135], r: [6, 0, rz], mat: 'burlap' });
  // el faldón del mandil, manchado
  P({ j: 'hips', type: 'box', s: [0.29, 0.52, 0.02], p: [0, -0.2, 0.135], taper: [1.12, 1], mat: 'leather' });
  P({ j: 'hips', type: 'box', s: [0.1, 0.14, 0.006], p: [0.06, -0.3, 0.147], r: [0, 0, 18], mat: 'blood' });
  P({ j: 'hips', type: 'box', s: [0.07, 0.08, 0.006], p: [-0.08, -0.14, 0.147], mat: 'black' });
  // el cordón, con el cincel, el mazo y la bolsa
  P({ j: 'hips', type: 'torus', s: [0.19, 0.016], p: [0, 0.03, 0], r: [90, 0, 0], sc: [1, 0.72, 1], seg: 12, mat: 'rope' });
  P({ j: 'hips', type: 'box', s: [0.022, 0.2, 0.022], p: [0.18, -0.08, 0.06], r: [0, 0, 6], mat: 'iron' });
  P({ j: 'hips', type: 'cyl', s: [0.015, 0.015, 0.22], p: [0.15, -0.08, -0.08], r: [0, 0, -8], seg: 5, mat: 'wooddark' });
  P({ j: 'hips', type: 'cyl', s: [0.04, 0.04, 0.1], p: [0.16, -0.2, -0.08], r: [0, 0, 82], seg: 6, mat: 'wooddark' });
  P({ j: 'hips', type: 'sphere', s: [0.06, 0.07, 0.04], p: [-0.12, -0.06, -0.12], seg: 6, seg2: 4, mat: 'leather' });
  // la lucerna colgada del cordón (lleva la otra llama)
  P({ j: 'lampJ', type: 'box', s: [0.008, 0.12, 0.008], p: [0, -0.06, 0], mat: 'iron' });
  P({ j: 'lampJ', type: 'sphere', s: [0.05, 0.032, 0.07], p: [0, -0.15, 0], seg: 8, seg2: 5, mat: 'bronzeAged' });
  P({ j: 'lampJ', type: 'cyl', s: [0.013, 0.02, 0.06], p: [0, -0.145, 0.07], r: [80, 0, 0], seg: 5, mat: 'bronzeAged' });
  P({ j: 'lampJ', type: 'torus', s: [0.022, 0.006], p: [0, -0.13, -0.07], seg: 6, mat: 'bronzeAged' });

  // ---------------------------------------------------------- brazos
  for (const s of ['L', 'R']) {
    const sg = s === 'L' ? 1 : -1;
    P({ j: 'arm' + s, type: 'ico', s: [0.06], p: [0, -0.01, 0], mat: SKD });
    P({ j: 'arm' + s, type: 'cyl', s: [0.072, 0.082, 0.18], p: [0, -0.08, 0], seg: 6, open: true, mat: 'burlap', ds: true });
    P({ j: 'arm' + s, type: 'box', s: [0.075, 0.42, 0.075], p: [0, -0.21, 0], taper: [0.8, 0.8], mat: SKD });
    P({ j: 'fore' + s, type: 'ico', s: [0.046], p: [0, 0, 0], mat: SKD });
    P({ j: 'fore' + s, type: 'box', s: [0.06, 0.4, 0.06], p: [0, -0.2, 0], taper: [0.75, 0.75], mat: SKD });
    // las vendas
    for (const [y, rz] of [
      [-0.1, 8],
      [-0.2, -6],
      [-0.31, 10],
    ])
      P({ j: 'fore' + s, type: 'box', s: [0.072, 0.045, 0.072], p: [0, y, 0], r: [0, 25, rz], mat: 'burlap' });
    // la mano: nudillos gordos y dedos larguísimos con las uñas negras
    P({ j: 'hand' + s, type: 'box', s: [0.07, 0.09, 0.032], p: [0, -0.045, 0], mat: SKD });
    for (const x of [-0.024, -0.008, 0.008, 0.024]) {
      const l = 1 - Math.abs(x) * 5;
      P({ j: 'hand' + s, type: 'box', s: [0.014, 0.08 * l, 0.014], p: [x, -0.1 - 0.04 * l, 0.006], r: [10, 0, 0], mat: SKD });
      P({ j: 'hand' + s, type: 'box', s: [0.012, 0.07 * l, 0.012], p: [x, -0.14 - 0.075 * l, 0.03], r: [32, 0, 0], mat: SKD });
      P({ j: 'hand' + s, type: 'box', s: [0.013, 0.016, 0.012], p: [x, -0.15 - 0.105 * l, 0.05], r: [40, 0, 0], mat: 'black' });
    }
    P({ j: 'hand' + s, type: 'box', s: [0.015, 0.08, 0.015], p: [sg * 0.04, -0.07, 0.025], r: [20, 0, sg * 30], mat: SKD });
  }
  // el pico (dolabra), en la derecha: el mango, la cabeza de hierro con su
  // punta y su azuela
  P({ j: 'handR', type: 'cyl', s: [0.022, 0.027, 0.92], p: [0, -0.045, 0.35], r: [90, 0, 0], seg: 6, mat: 'wooddark' });
  P({ j: 'handR', type: 'cyl', s: [0.031, 0.031, 0.13], p: [0, -0.045, 0.0], r: [90, 0, 0], seg: 6, mat: 'leather' });
  P({ j: 'handR', type: 'box', s: [0.064, 0.1, 0.078], p: [0, -0.045, 0.78], mat: 'iron' });
  P({ j: 'handR', type: 'box', s: [0.05, 0.42, 0.054], p: [0, -0.29, 0.77], taper: [0.18, 0.25], r: [-8, 0, 0], mat: 'iron' });
  P({ j: 'handR', type: 'box', s: [0.02, 0.07, 0.024], p: [0, -0.45, 0.8], r: [-8, 0, 0], mat: 'blood' });
  P({ j: 'handR', type: 'box', s: [0.1, 0.18, 0.02], p: [0, 0.09, 0.78], taper: [0.8, 1], r: [8, 0, 0], mat: 'iron' });

  // ---------------------------------------------------------- piernas
  for (const s of ['L', 'R']) {
    P({ j: 'leg' + s, type: 'box', s: [0.09, 0.47, 0.09], p: [0, -0.23, 0], taper: [0.75, 0.75], mat: SKD });
    P({ j: 'leg' + s, type: 'box', s: [0.105, 0.07, 0.105], p: [0, -0.3, 0], r: [0, 20, 8], mat: 'burlap' });
    P({ j: 'shin' + s, type: 'ico', s: [0.05], p: [0, 0, 0.01], mat: SKD });
    P({ j: 'shin' + s, type: 'box', s: [0.068, 0.46, 0.068], p: [0, -0.22, 0], taper: [0.7, 0.7], mat: SKD });
    for (const [y, rz] of [
      [-0.12, 10],
      [-0.24, -8],
      [-0.34, 12],
    ])
      P({ j: 'shin' + s, type: 'box', s: [0.08, 0.05, 0.08], p: [0, y, 0], r: [0, 30, rz], mat: 'burlap' });
  }
  parts.push(...feetParts(KC, SKD, { w: 0.088, h: 0.05, l: 0.26 }));
  return new Rig({ joints, parts });
}

// en reposo arrastra el pico por el suelo (la derecha); la izquierda, suelta
const CAV_BASE = {
  chest: [36, 0, 0],
  head: [-30, 0, 0],
  jaw: [12, 0, 0],
  armR: [-12, 0, -10],
  foreR: [-22, 0, 0],
  handR: [95, 0, 0],
  armL: [-25, 0, 14],
  foreL: [-35, 0, 0],
  handL: [20, 0, 0],
};
const cavClips = {
  // se yergue, se le descuelga la quijada y alza el pico a un lado
  alert: clip('alert', 1.3, [
    [0, { ...CAV_BASE }],
    [0.45, { chest: [6, 0, 0], head: [-34, 0, 0], jaw: [38, 0, 0], armR: [-100, 0, -40], foreR: [-50, 0, 0], handR: [20, 0, 0], armL: [-60, 0, 40], foreL: [-40, 0, 0], handL: [-10, 0, 0] }, 'snap'],
    [0.9, { chest: [12, 0, 0], head: [-28, 0, 0], jaw: [30, 0, 0], armR: [-96, 0, -38], foreR: [-50, 0, 0], handR: [20, 0, 0], armL: [-56, 0, 36], foreL: [-40, 0, 0], handL: [-10, 0, 0] }],
    [1.3, { ...CAV_BASE }],
  ]),
  // el pico por encima de la cabeza y abajo, con todo el cuerpo
  picado: clip('picado', 1.75, [
    [0, { ...CAV_BASE }],
    [0.7, { chest: [-8, 0, 0], head: [-14, 0, 0], jaw: [26, 0, 0], armR: [-172, 0, -16], foreR: [-35, 0, 0], handR: [-30, 0, 0], armL: [-60, 0, 30], foreL: [-40, 0, 0], handL: [0, 0, 0], root: [0, 0, -10] }, 'hold'],
    [1.0, { chest: [55, 0, 0], head: [-38, 0, 0], jaw: [34, 0, 0], armR: [-40, 0, -6], foreR: [-8, 0, 0], handR: [80, 0, 0], armL: [-10, 0, 30], foreL: [-30, 0, 0], handL: [0, 0, 0], root: [0, -14, 14] }, 'snap'],
    [1.3, { chest: [57, 0, 0], head: [-38, 0, 0], jaw: [22, 0, 0], armR: [-36, 0, -6], foreR: [-10, 0, 0], handR: [80, 0, 0], armL: [-8, 0, 30], foreL: [-30, 0, 0], handL: [0, 0, 0], root: [0, -16, 14] }],
    [1.75, { ...CAV_BASE }],
  ]),
  // de lado, de la derecha a la izquierda
  barrido: clip('barrido', 1.5, [
    [0, { ...CAV_BASE }],
    [0.6, { chest: [22, -55, 0], head: [-26, 35, 0], jaw: [20, 0, 0], armR: [-80, 0, -95], foreR: [-25, 0, 0], handR: [70, 0, 0], armL: [-30, 0, 40], foreL: [-30, 0, 0], handL: [0, 0, 0] }, 'hold'],
    [0.82, { chest: [36, 50, 0], head: [-28, -30, 0], jaw: [30, 0, 0], armR: [-88, 0, 45], foreR: [-8, 0, 0], handR: [80, 0, 0], armL: [-20, 0, 30], foreL: [-30, 0, 0], handL: [0, 0, 0] }, 'snap'],
    [1.1, { chest: [36, 58, 0], head: [-28, -32, 0], jaw: [22, 0, 0], armR: [-84, 0, 55], foreR: [-16, 0, 0], handR: [76, 0, 0], armL: [-18, 0, 30], foreL: [-30, 0, 0], handL: [0, 0, 0] }],
    [1.5, { ...CAV_BASE }],
  ]),
  // lo clava en el suelo con las dos manos: la bóveda suelta piedras
  derrumbe: clip(
    'derrumbe',
    2.3,
    [
      [0, { ...CAV_BASE }],
      [0.85, { chest: [-18, 0, 0], head: [-16, 0, 0], jaw: [40, 0, 0], armR: [-175, 0, -8], foreR: [-30, 0, 0], handR: [-35, 0, 0], armL: [-170, 0, 10], foreL: [-35, 0, 0], handL: [0, 0, 0], root: [0, 6, -10] }, 'hold'],
      [1.15, { chest: [72, 0, 0], head: [-42, 0, 0], jaw: [40, 0, 0], armR: [-30, 0, -4], foreR: [-4, 0, 0], handR: [95, 0, 0], armL: [-30, 0, 6], foreL: [-6, 0, 0], handL: [0, 0, 0], root: [0, -26, 16] }, 'snap'],
      [1.75, { chest: [74, 0, 0], head: [-44, 0, 0], jaw: [30, 0, 0], armR: [-28, 0, -4], foreR: [-6, 0, 0], handR: [95, 0, 0], armL: [-28, 0, 6], foreL: [-8, 0, 0], handL: [0, 0, 0], root: [0, -28, 16] }],
      [2.3, { ...CAV_BASE }],
    ],
    { mono: true }
  ),
  hurt: clip('hurt', 0.5, [
    [0, { ...CAV_BASE, chest: [14, 0, 14], head: [-40, 0, 20], jaw: [30, 0, 0], root: [0, 0, -8] }, 'snap'],
    [0.5, { ...CAV_BASE }],
  ]),
  stagger: clip('stagger', 1.2, [
    [0, { ...CAV_BASE, chest: [-6, 0, 18], head: [-50, 0, 24], jaw: [40, 0, 0], armL: [-30, 0, 50], foreL: [-30, 0, 0], root: [0, -6, -14] }, 'snap'],
    [1.2, { ...CAV_BASE }],
  ]),
  parried: clip(
    'parried',
    1.6,
    [
      [0, { chest: [-18, 0, 20], head: [-46, 0, 20], jaw: [36, 0, 0], armR: [-150, 0, -40], foreR: [-30, 0, 0], handR: [30, 0, 0], armL: [-40, 0, 60], foreL: [-30, 0, 0], handL: [0, 0, 0], root: [0, -4, -18] }, 'snap'],
      [0.5, { chest: [-10, 0, 14], head: [-40, 0, 14], jaw: [30, 0, 0], armR: [-120, 0, -34], foreR: [-40, 0, 0], handR: [40, 0, 0], armL: [-30, 0, 50], foreL: [-30, 0, 0], handL: [0, 0, 0], root: [0, -6, -16] }],
      [1.6, { ...CAV_BASE }],
    ],
    { mono: true }
  ),
  // se le doblan las rodillas y se va de espaldas sobre el cuévano: las
  // calaveras ruedan
  death: clip(
    'death',
    2.2,
    [
      [0, { chest: [-10, 0, 0], head: [-50, 0, 0], jaw: [40, 0, 0], armR: [-80, 0, -30], foreR: [-30, 0, 0], handR: [40, 0, 0], armL: [-70, 0, 40], foreL: [-30, 0, 0], handL: [0, 0, 0] }, 'snap'],
      [0.8, { chest: [-30, 0, 10], head: [-40, 0, 20], jaw: [44, 0, 0], armR: [-40, 0, -50], foreR: [-20, 0, 0], handR: [40, 0, 0], armL: [-30, 0, 60], foreL: [-20, 0, 0], handL: [0, 0, 0], legL: [-60, 0, 0], shinL: [100, 0, 0], legR: [-50, 0, 0], shinR: [90, 0, 0], root: [0, -60, -20] }],
      [1.4, { chest: [-60, 0, 10], head: [-20, 0, 30], jaw: [50, 0, 0], armR: [-20, 0, -70], foreR: [-10, 0, 0], handR: [40, 0, 0], armL: [-10, 0, 80], foreL: [-10, 0, 0], handL: [0, 0, 0], legL: [-70, 0, 0], shinL: [60, 0, 0], legR: [-60, 0, 0], shinR: [50, 0, 0], hips: [-60, 0, 0], root: [0, -80, -40] }, 'in'],
      [2.2, { chest: [-64, 0, 10], head: [-12, 0, 34], jaw: [52, 0, 0], armR: [-16, 0, -74], foreR: [-8, 0, 0], handR: [40, 0, 0], armL: [-8, 0, 84], foreL: [-8, 0, 0], handL: [0, 0, 0], legL: [-66, 0, 0], shinL: [56, 0, 0], legR: [-58, 0, 0], shinR: [48, 0, 0], hips: [-64, 0, 0], root: [0, -82, -42] }],
    ],
    { mono: true }
  ),
};

// cavando: el pico arriba y contra la pared, una y otra vez (la izquierda,
// apoyada en la piedra)
function cavDig(e, t) {
  const ph = (t * 0.55 + e.phase * 0.07) % 1;
  // (sube despacio, baja de golpe en 0,62 y lo arranca de la piedra)
  const up = ph < 0.55 ? ph / 0.55 : ph < 0.62 ? 1 - (ph - 0.55) / 0.07 : Math.max(0, (ph - 0.75) / 0.25) * 0.15;
  const k = up * up * (3 - 2 * up);
  return rad({
    chest: [42 - k * 40, -k * 10, 0],
    head: [-30 + k * 12, 0, 0],
    jaw: [14 + k * 10, 0, 0],
    armR: [-50 - k * 120, 0, -10],
    foreR: [-10 - k * 25, 0, 0],
    handR: [60 - k * 90, 0, 0],
    armL: [-72, 0, 14],
    foreL: [-30, 0, 0],
    handL: [-30, 0, 0],
  });
}

export const CAVADOR_TYPE = {
  name: 'Cavador',
  build: buildCavador,
  hp: 150,
  poise: 60,
  radius: 0.45,
  height: 2.0,
  lockHeight: 1.45,
  walk: 1.15,
  run: 3.4,
  runDist: 6,
  sight: 12,
  // (oye a los vivos: lleva siglos escuchando la piedra)
  hear: 8,
  turn: 3.4,
  stride: 2.2,
  approach: 2.0,
  parryDur: 1.7,
  clips: cavClips,
  voice: 'cavador',
  alertTime: 1.0,
  attacks: [
    { name: 'picado', clip: cavClips.picado, dur: 1.75, min: 0, max: 2.7, hits: [[0.95, 1.12]], dmg: 30, range: 2.75, arc: 50, weight: 3, turn: 2.6, stDmg: 30 },
    { name: 'barrido', clip: cavClips.barrido, dur: 1.5, min: 0, max: 2.6, hits: [[0.68, 0.9]], dmg: 22, range: 2.8, arc: 160, weight: 2 },
    {
      name: 'derrumbe',
      clip: cavClips.derrumbe,
      dur: 2.3,
      min: 1.5,
      max: 4.2,
      hits: [],
      weight: 1.2,
      cd: 3.2,
      noParry: true,
      events: [{ t: 1.16, fn: (e, g) => (e.rig.worldPos('handR', _cp, CAV_PICK), g.combat.shockwave(_cp.x, e.pos.y, _cp.z, 3.4, 20, e), g.audio && g.audio.play('rubble', _cp)) }],
    },
  ],
  biped: { scale: KC, style: GAIT.shamble, stance: 0.1 },
  loco: (e, t, spd) => {
    const g = e.gait;
    const sw = g ? g.armSwing / DEG : 0;
    const run = g ? g.runW * g.mw : 0;
    const br = S(t * 1.3 + e.phase * 0.1);
    return rad({
      ...CAV_BASE,
      chest: [34 + run * 10 + br * 2, S(t * 0.5) * 4, 0],
      head: [-28 - run * 6, S(t * 0.6 + 1) * 10, S(t * 0.4) * 6],
      jaw: [12 + S(t * 2.3 + e.phase) * 5, 0, 0],
      armR: [-12 - sw * 0.25, 0, -10],
      armL: [-25 + sw * 0.8, 0, 14],
    });
  },
  idlePose: (e, kind, t, spd) => (kind === 'dig' ? cavDig(e, t) : CAVADOR_TYPE.loco(e, t, spd)),
  init: (e) => {
    const g = e.game;
    // la vela de la frente y la de la lucerna, y su luz
    // (ocultas hasta que se mueva por primera vez: si no, se quedarían en
    // el origen del mundo)
    e.P.flames = [flame(g, 0.12, 0.22), flame(g, 0.09, 0.16)];
    for (const f of e.P.flames) f.visible = false;
    e.P.light = g.fx.lights.add({ x: e.pos.x, y: e.pos.y + 2, z: e.pos.z, color: 0xffa050, intensity: 3.2, range: 6, flicker: 0.35, priority: 1, on: false });
  },
  onReset: (e) => {
    e.data.digPh = 0;
  },
  update: (e, dt) => {
    const g = e.game;
    const vis = e.obj.visible;
    e.rig.root.updateMatrixWorld(true);
    const fr = Math.floor(g.time * 12) % 8;
    const [f0, f1] = e.P.flames;
    f0.position.copy(e.rig.worldPos('head', _cp, CAV_CANDLE));
    f1.position.copy(e.rig.worldPos('lampJ', _cp2, CAV_LAMP));
    f0.material.map.offset.x = fr / 8;
    f1.material.map.offset.x = ((fr + 3) % 8) / 8;
    // (muerto, la vela aguanta hasta que se deshace)
    const lit = vis && !(e.dead && e.stT > 2.6);
    f0.visible = f1.visible = lit;
    if (e.P.light) {
      const L = e.P.light;
      L.x = f0.position.x;
      L.y = f0.position.y + 0.1;
      L.z = f0.position.z;
      L.on = lit;
    }
    // cavando: cada golpe del pico en la piedra se oye por las galerías
    if (e.state === 'dormant' && e.idle === 'dig') {
      const ph = (g.time * 0.55 + e.phase * 0.07) % 1;
      if (e.data.digPh < 0.62 && ph >= 0.62 && g.audio) g.audio.play('pickStone', e.rig.worldPos('handR', _cp, CAV_PICK));
      e.data.digPh = ph;
    }
  },
  // el cuévano y la lucerna se mecen al andar
  postPose: (e, pose, dt) => {
    const d = e.data;
    const ss = d.sway || (d.sway = { x: new Spring(30, 4), z: new Spring(30, 4) });
    const cy = Math.cos(e.yaw),
      sy = Math.sin(e.yaw);
    const vF = e.vx * sy + e.vz * cy,
      vS = e.vx * cy - e.vz * sy;
    const ph = e.gait ? e.gait.phase * Math.PI * 2 : 0;
    const mw = e.gait ? e.gait.mw : 0;
    const sx = ss.x.update(dt, clamp(vF * 0.16, -0.4, 0.4) + S(ph * 2) * 0.08 * mw),
      sz = ss.z.update(dt, clamp(-vS * 0.14, -0.3, 0.3) + S(ph) * 0.1 * mw);
    if (e.state !== 'dead') hangDown(e, pose, 'lampJ', sx, sz);
    addRot(pose, 'basket', [S(ph * 2) * 0.04 * mw, 0, S(ph) * 0.05 * mw]);
  },
};
const _cp = new THREE.Vector3(),
  _cp2 = new THREE.Vector3();
const CAV_CANDLE = new THREE.Vector3(0.02, 0.44, 0.02);
const CAV_LAMP = new THREE.Vector3(0, -0.12, 0.11);

// ======================================================================= LA EMPAREDADA
const KE = 1.15;
// la obra que la tapia: de la cintura (la cadera) al suelo
const OBRA = { h: 1.06, r0: 0.3, r1: 0.47 };
const obraR = (y) => OBRA.r0 + ((OBRA.r1 - OBRA.r0) * -y) / OBRA.h;

export function buildEmparedada() {
  const base = humanoidJoints(KE, { arm: 1.45 });
  // (sin piernas: de cintura para abajo es piedra)
  const joints = base.filter((j) => !/^(leg|shin|foot)/.test(j.name));
  joints.push({ name: 'hairL', parent: 'head', pos: [0.085, 0.2, -0.02] });
  joints.push({ name: 'hairR', parent: 'head', pos: [-0.085, 0.2, -0.02] });
  joints.push({ name: 'hairB', parent: 'head', pos: [0, 0.22, -0.1] });
  joints.push({ name: 'bowl', parent: 'chest', pos: [0, 0.5, 0.11] });
  const parts = [];
  const P = (o) => parts.push(o);
  const rng = (() => {
    let s = 7;
    return () => ((s = (s * 16807) % 2147483647) / 2147483647);
  })();
  // ---------------------------------------------------------- la obra
  P({ j: 'hips', type: 'cyl', s: [OBRA.r0 - 0.02, OBRA.r1 - 0.03, OBRA.h], p: [0, -OBRA.h / 2, 0], seg: 10, mat: 'plaster' });
  // mampostería: piedras de tamaños distintos, por hiladas, alguna caída
  for (let row = 0; row < 11; row++) {
    const y = -OBRA.h + 0.06 + row * 0.092;
    const r = obraR(y) + 0.02;
    const n = Math.round((2 * Math.PI * r) / 0.2);
    for (let k = 0; k < n; k++) {
      const a = ((k + (row % 2) * 0.5) / n) * Math.PI * 2 + (rng() - 0.5) * 0.08;
      // (por delante, un hueco: dentro se le ve la rodilla)
      if (row >= 3 && row <= 5 && Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.32) continue;
      if (rng() < 0.07) continue;
      const w = 0.15 + rng() * 0.09,
        h = 0.07 + rng() * 0.04;
      P({ j: 'hips', type: 'box', s: [w, h, 0.1], p: [Math.sin(a) * r, y + (rng() - 0.5) * 0.02, Math.cos(a) * r], r: [(rng() - 0.5) * 10, a / DEG + (rng() - 0.5) * 8, (rng() - 0.5) * 10], mat: rng() < 0.3 ? 'ashlar' : 'wallstone' });
    }
  }
  // el hueco de delante: negro, y la rodilla y la tibia, de hueso
  P({ j: 'hips', type: 'box', s: [0.18, 0.26, 0.04], p: [0, -0.62, obraR(-0.62) - 0.01], mat: 'black' });
  P({ j: 'hips', type: 'sphere', s: [0.045, 0.05, 0.04], p: [0.02, -0.56, obraR(-0.56) + 0.005], seg: 6, seg2: 5, mat: 'bone' });
  P({ j: 'hips', type: 'cyl', s: [0.022, 0.026, 0.2], p: [0.025, -0.68, obraR(-0.68) - 0.005], r: [-8, 0, 4], seg: 5, mat: 'bone' });
  // el pie de la obra, deshecho: cascotes
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + rng() * 0.4;
    P({ j: 'hips', type: 'box', s: [0.12 + rng() * 0.08, 0.06, 0.1], p: [Math.sin(a) * (OBRA.r1 + 0.04), -OBRA.h + 0.03, Math.cos(a) * (OBRA.r1 + 0.04)], r: [rng() * 20, a / DEG, rng() * 20], mat: 'wallstone' });
  }
  // el hábito que se mete en la obra, con chorretones de argamasa
  P({ j: 'hips', type: 'box', s: [0.34, 0.2, 0.26], p: [0, -0.02, 0], taper: [1.15, 1.2], mat: 'clothDark' });
  for (const [x, l] of [
    [-0.1, 0.16],
    [0.04, 0.24],
    [0.13, 0.12],
  ])
    P({ j: 'hips', type: 'box', s: [0.03, l, 0.012], p: [x, -0.1 - l / 2, obraR(-0.1 - l / 2) + 0.03], mat: 'plaster' });

  // ---------------------------------------------------------- tronco
  P({ j: 'chest', type: 'box', s: [0.27, 0.62, 0.18], p: [0, 0.27, 0], taper: [0.86, 0.9], mat: 'clothDark' });
  P({ j: 'hips', type: 'cyl', s: [0.12, 0.14, 0.24], p: [0, 0.1, 0], sc: [1, 1, 0.75], seg: 8, mat: 'clothDark' });
  // el escapulario, por delante y por detrás
  P({ j: 'chest', type: 'box', s: [0.14, 0.66, 0.012], p: [0, 0.2, 0.096], mat: 'burlap' });
  P({ j: 'chest', type: 'box', s: [0.1, 0.5, 0.012], p: [0, 0.3, -0.096], mat: 'burlap' });
  // un desgarrón en el costado: las costillas
  P({ j: 'chest', type: 'box', s: [0.06, 0.16, 0.008], p: [0.11, 0.3, 0.07], r: [0, 30, 0], mat: 'black' });
  for (let i = 0; i < 3; i++) P({ j: 'chest', type: 'box', s: [0.055, 0.01, 0.006], p: [0.112, 0.25 + i * 0.045, 0.076], r: [0, 30, 0], mat: 'bone' });
  // la crucecita de palo, colgada al cuello
  P({ j: 'chest', type: 'box', s: [0.012, 0.07, 0.01], p: [0.05, 0.47, 0.105], mat: 'wooddark' });
  P({ j: 'chest', type: 'box', s: [0.045, 0.012, 0.01], p: [0.05, 0.485, 0.105], mat: 'wooddark' });
  // la escudilla de las limosnas, colgada de un cordel
  P({ j: 'bowl', type: 'box', s: [0.006, 0.14, 0.006], p: [0, -0.07, 0], mat: 'rope' });
  P({ j: 'bowl', type: 'cyl', s: [0.07, 0.045, 0.045], p: [0, -0.16, 0.02], open: true, seg: 8, mat: 'wooddark', ds: true });
  P({ j: 'bowl', type: 'cyl', s: [0.045, 0.045, 0.006], p: [0, -0.18, 0.02], seg: 8, mat: 'wooddark' });

  // ---------------------------------------------------------- cabeza
  P({ j: 'head', type: 'cyl', s: [0.045, 0.05, 0.12], p: [0, 0.0, 0], seg: 6, mat: 'skinPale' });
  // la toca y el velo negro, con la barbada blanca alrededor de la cara
  P({ j: 'head', type: 'sphere', s: [0.13, 0.16, 0.14], p: [0, 0.15, -0.025], seg: 10, seg2: 8, mat: 'clothDark' });
  P({ j: 'head', type: 'box', s: [0.3, 0.5, 0.02], p: [0, -0.12, -0.14], taper: [1.6, 1], r: [10, 0, 0], mat: 'clothDark', ds: true });
  P({ j: 'head', type: 'box', s: [0.06, 0.4, 0.016], p: [0.12, -0.1, -0.12], taper: [1.4, 1], r: [10, 30, 0], mat: 'clothDark', ds: true });
  P({ j: 'head', type: 'box', s: [0.06, 0.4, 0.016], p: [-0.12, -0.1, -0.12], taper: [1.4, 1], r: [10, -30, 0], mat: 'clothDark', ds: true });
  P({ j: 'head', type: 'torus', s: [0.1, 0.03], p: [0, 0.12, 0.05], r: [0, 0, 0], sc: [1, 1.35, 1], seg: 12, mat: 'linen' });
  // la máscara de yeso: un solo agujero para el ojo y, en la boca, el
  // ventanuco enrejado por donde le pasaban el pan
  P({ j: 'head', type: 'box', s: [0.15, 0.2, 0.05], p: [0, 0.13, 0.085], taper: [0.82, 0.95], mat: 'plaster' });
  P({ j: 'head', type: 'box', s: [0.035, 0.028, 0.02], p: [0.035, 0.17, 0.106], mat: 'black' });
  P({ j: 'head', type: 'box', s: [0.012, 0.012, 0.006], p: [0.035, 0.169, 0.116], mat: 'eyeCold' });
  P({ j: 'head', type: 'box', s: [0.06, 0.035, 0.02], p: [0, 0.085, 0.1], mat: 'black' });
  for (const x of [-0.018, 0, 0.018]) P({ j: 'head', type: 'box', s: [0.006, 0.045, 0.006], p: [x, 0.085, 0.112], mat: 'iron' });
  P({ j: 'head', type: 'box', s: [0.07, 0.006, 0.006], p: [0, 0.085, 0.112], mat: 'iron' });
  // las grietas del yeso, y las lágrimas secas bajo el ojo
  for (const [x, y, l, rz] of [
    [-0.035, 0.17, 0.08, 40],
    [-0.02, 0.13, 0.06, -20],
    [0.05, 0.11, 0.05, 70],
  ])
    P({ j: 'head', type: 'box', s: [0.004, l, 0.004], p: [x, y, 0.11], r: [0, 0, rz], mat: 'black' });
  P({ j: 'head', type: 'box', s: [0.008, 0.07, 0.004], p: [0.036, 0.13, 0.109], mat: 'blood' });
  // el pelo gris y apelmazado que se sale del velo
  for (const [j, sx] of [
    ['hairL', 1],
    ['hairR', -1],
  ]) {
    P({ j, type: 'box', s: [0.03, 0.42, 0.016], p: [0, -0.21, 0], mat: 'hairGrey' });
    P({ j, type: 'box', s: [0.024, 0.34, 0.014], p: [sx * 0.015, -0.17, -0.02], r: [0, 0, sx * 4], mat: 'hairGrey' });
  }
  P({ j: 'hairB', type: 'box', s: [0.16, 0.55, 0.02], p: [0, -0.27, 0], taper: [1.3, 1], mat: 'hairGrey' });

  // ---------------------------------------------------------- brazos
  for (const s of ['L', 'R']) {
    const sg = s === 'L' ? 1 : -1;
    P({ j: 'arm' + s, type: 'sphere', s: [0.07, 0.055, 0.07], p: [0, -0.02, 0], seg: 8, seg2: 6, mat: 'clothDark' });
    P({ j: 'arm' + s, type: 'box', s: [0.085, 0.5, 0.085], p: [0, -0.25, 0], taper: [1.15, 1.15], mat: 'clothDark' });
    P({ j: 'fore' + s, type: 'ico', s: [0.05], p: [0, 0, 0], mat: 'clothDark' });
    P({ j: 'fore' + s, type: 'box', s: [0.045, 0.5, 0.045], p: [0, -0.25, 0], taper: [0.8, 0.8], mat: 'skinDust' });
    // costras de argamasa
    P({ j: 'fore' + s, type: 'box', s: [0.055, 0.12, 0.05], p: [0, -0.18, 0.004], r: [0, 20, 6], mat: 'plaster' });
    P({ j: 'hand' + s, type: 'ico', s: [0.03], p: [0, 0, 0], mat: 'skinDust' });
    P({ j: 'hand' + s, type: 'box', s: [0.06, 0.09, 0.025], p: [0, -0.045, 0], mat: 'skinDust' });
    P({ j: 'hand' + s, type: 'box', s: [0.05, 0.03, 0.028], p: [0, -0.02, 0.004], mat: 'blood' });
    // dedos largos, con las uñas arrancadas de rascar la piedra
    for (const x of [-0.021, -0.007, 0.007, 0.021]) {
      const l = 1 - Math.abs(x) * 6;
      P({ j: 'hand' + s, type: 'box', s: [0.011, 0.12 * l, 0.011], p: [x, -0.09 - 0.06 * l, 0.004], r: [10, 0, x * 100], mat: 'skinDust' });
      P({ j: 'hand' + s, type: 'box', s: [0.009, 0.11 * l, 0.009], p: [x * 1.2, -0.09 - 0.12 * l - 0.05 * l, 0.024], r: [28, 0, x * 130], mat: 'skinDust' });
      P({ j: 'hand' + s, type: 'box', s: [0.011, 0.03, 0.011], p: [x * 1.35, -0.09 - 0.235 * l, 0.045], r: [34, 0, 0], mat: 'blood' });
    }
    P({ j: 'hand' + s, type: 'box', s: [0.012, 0.08, 0.012], p: [sg * 0.034, -0.065, 0.02], r: [0, 0, sg * 32], mat: 'skinDust' });
  }
  return new Rig({ joints, parts });
}

// erguida sobre su obra, las manos por delante (buscando la pared)
const EMP_BASE = { chest: [12, 0, 0], head: [8, 0, 10], armL: [-38, 0, 14], foreL: [-30, 0, 0], handL: [10, 0, 0], armR: [-34, 0, -14], foreR: [-34, 0, 0], handR: [10, 0, 0] };
const empClips = {
  // la cabeza se vuelve antes que el cuerpo (de cara a la pared), y se le
  // abren los brazos
  alert: clip('alert', 1.5, [
    [0, { chest: [22, 0, 0], head: [22, 0, 0], armL: [-118, 0, 18], foreL: [-30, 0, 0], handL: [-50, 0, 0], armR: [-118, 0, -18], foreR: [-30, 0, 0], handR: [-50, 0, 0] }],
    [0.55, { chest: [16, -30, 0], head: [-6, -120, 14], armL: [-100, 0, 22], foreL: [-34, 0, 0], handL: [-40, 0, 0], armR: [-104, 0, -22], foreR: [-34, 0, 0], handR: [-40, 0, 0] }, 'snap'],
    [1.0, { chest: [-6, 0, 0], head: [-18, 0, 18], armL: [-40, 0, 70], foreL: [-20, 0, 0], handL: [-20, 0, 0], armR: [-40, 0, -70], foreR: [-20, 0, 0], handR: [-20, 0, 0], root: [0, 8, 0] }, 'snap'],
    [1.5, { ...EMP_BASE }],
  ]),
  // las dos manos por delante, a por ti: si te coge, te estampa contra la obra
  agarre: clip('agarre', 1.6, [
    [0, { ...EMP_BASE }],
    [0.5, { chest: [-14, 0, 0], head: [-10, 0, 0], armL: [-60, 0, 50], foreL: [-60, 0, 0], handL: [-20, 0, 0], armR: [-60, 0, -50], foreR: [-60, 0, 0], handR: [-20, 0, 0], root: [0, 6, -8] }, 'hold'],
    [0.72, { chest: [38, 0, 0], head: [10, 0, 0], armL: [-118, 0, 6], foreL: [-4, 0, 0], handL: [-10, 0, 0], armR: [-118, 0, -6], foreR: [-4, 0, 0], handR: [-10, 0, 0], root: [0, -4, 14] }, 'snap'],
    [1.05, { chest: [42, 0, 0], head: [14, 0, 0], armL: [-108, 0, 2], foreL: [-30, 0, 0], handL: [-30, 0, 0], armR: [-108, 0, -2], foreR: [-30, 0, 0], handR: [-30, 0, 0], root: [0, -4, 14] }],
    [1.6, { ...EMP_BASE }],
  ]),
  // dos zarpazos, uno con cada mano
  aranazo: clip('aranazo', 1.5, [
    [0, { ...EMP_BASE }],
    [0.42, { chest: [10, -40, 0], head: [8, 20, 0], armR: [-130, 0, -60], foreR: [-40, 0, 0], handR: [-20, 0, 0], armL: [-40, 0, 20], foreL: [-30, 0, 0] }, 'hold'],
    [0.56, { chest: [30, 35, 0], head: [10, -15, 0], armR: [-70, 0, 40], foreR: [-10, 0, 0], handR: [20, 0, 0], armL: [-40, 0, 20], foreL: [-30, 0, 0] }, 'snap'],
    [0.86, { chest: [14, 40, 0], head: [8, -20, 0], armR: [-60, 0, 30], foreR: [-20, 0, 0], handR: [10, 0, 0], armL: [-130, 0, 60], foreL: [-40, 0, 0], handL: [-20, 0, 0] }, 'hold'],
    [1.0, { chest: [30, -35, 0], head: [10, 15, 0], armR: [-40, 0, -20], foreR: [-30, 0, 0], armL: [-70, 0, -40], foreL: [-10, 0, 0], handL: [20, 0, 0] }, 'snap'],
    [1.5, { ...EMP_BASE }],
  ]),
  // se alza sobre la obra y se deja caer con todo el peso
  desplome: clip(
    'desplome',
    2.2,
    [
      [0, { ...EMP_BASE }],
      [0.8, { chest: [-20, 0, 0], head: [-30, 0, 0], armL: [-160, 0, 30], foreL: [-30, 0, 0], handL: [-30, 0, 0], armR: [-160, 0, -30], foreR: [-30, 0, 0], handR: [-30, 0, 0], root: [0, 45, 0] }, 'hold'],
      [1.0, { chest: [40, 0, 0], head: [20, 0, 0], armL: [-60, 0, 40], foreL: [-10, 0, 0], handL: [10, 0, 0], armR: [-60, 0, -40], foreR: [-10, 0, 0], handR: [10, 0, 0], root: [0, -10, 0] }, 'snap'],
      [1.5, { chest: [44, 0, 0], head: [24, 0, 0], armL: [-40, 0, 50], foreL: [-10, 0, 0], handL: [20, 0, 0], armR: [-40, 0, -50], foreR: [-10, 0, 0], handR: [20, 0, 0], root: [0, -8, 0] }],
      [2.2, { ...EMP_BASE }],
    ],
    { mono: true }
  ),
  hurt: clip('hurt', 0.5, [
    [0, { ...EMP_BASE, chest: [-14, 0, 12], head: [-30, 0, 24], root: [0, 0, -6] }, 'snap'],
    [0.5, { ...EMP_BASE }],
  ]),
  stagger: clip('stagger', 1.2, [
    [0, { ...EMP_BASE, chest: [-26, 0, 18], head: [-40, 0, 30], armL: [-40, 0, 70], armR: [-40, 0, -70], root: [0, 0, -14] }, 'snap'],
    [1.2, { ...EMP_BASE }],
  ]),
  parried: clip(
    'parried',
    1.8,
    [
      [0, { chest: [-30, 0, 20], head: [-40, 0, 30], armL: [-60, 0, 80], foreL: [-20, 0, 0], armR: [-140, 0, -60], foreR: [-20, 0, 0], root: [0, 0, -18] }, 'snap'],
      [0.6, { chest: [-20, 0, 14], head: [-30, 0, 24], armL: [-40, 0, 70], foreL: [-20, 0, 0], armR: [-110, 0, -50], foreR: [-20, 0, 0], root: [0, 0, -16] }],
      [1.8, { ...EMP_BASE }],
    ],
    { mono: true }
  ),
  // se le cae el cuerpo hacia delante sobre la obra, y la obra se agrieta
  death: clip(
    'death',
    2.4,
    [
      [0, { chest: [-30, 0, 0], head: [-50, 0, 0], armL: [-150, 0, 40], foreL: [-15, 0, 0], armR: [-150, 0, -40], foreR: [-15, 0, 0] }, 'snap'],
      [0.9, { chest: [60, 0, 10], head: [40, 0, 20], armL: [-20, 0, 30], foreL: [-30, 0, 0], armR: [-30, 0, -40], foreR: [-30, 0, 0], root: [0, -20, 0] }],
      [1.6, { chest: [95, 0, 14], head: [50, 0, 30], armL: [-10, 0, 20], foreL: [-10, 0, 0], handL: [30, 0, 0], armR: [-15, 0, -24], foreR: [-10, 0, 0], handR: [30, 0, 0], root: [0, -45, 0] }, 'in'],
      [2.4, { chest: [100, 0, 14], head: [55, 0, 32], armL: [-8, 0, 18], foreL: [-6, 0, 0], handL: [34, 0, 0], armR: [-12, 0, -22], foreR: [-6, 0, 0], handR: [34, 0, 0], root: [0, -48, 0] }],
    ],
    { mono: true }
  ),
};

// de cara a la pared, la frente y las palmas contra la piedra (quiere volver
// a entrar)
function empWalled(e, t) {
  const b = S(t * 0.9 + e.phase) * 0.5 + 0.5;
  return rad({
    chest: [22 + b * 4, 0, 0],
    head: [22 + b * 6, 0, S(t * 0.4) * 6],
    armL: [-118 - b * 6, 0, 18],
    foreL: [-30, 0, 0],
    handL: [-50, 0, 0],
    armR: [-118 + b * 4, 0, -18],
    foreR: [-30, 0, 0],
    handR: [-50 + S(t * 3.1 + e.phase) * 12, 0, 0],
  });
}

export const EMPAREDADA_TYPE = {
  name: 'Emparedada',
  build: buildEmparedada,
  hp: 120,
  poise: 55,
  radius: 0.55,
  height: 2.25,
  lockHeight: 1.75,
  walk: 0.95,
  run: 2.3,
  runDist: 5,
  sight: 11,
  hear: 6,
  turn: 2.8,
  approach: 1.9,
  float: true,
  parryDur: 1.8,
  clips: empClips,
  voice: 'emparedada',
  alertTime: 1.5,
  attacks: [
    { name: 'agarre', clip: empClips.agarre, dur: 1.6, min: 0, max: 3.2, hits: [[0.64, 0.86]], dmg: 26, range: 2.3, arc: 70, lunge: [[0.6, 0.82, 5]], weight: 2, cd: 1.8, noParry: true, stDmg: 40 },
    { name: 'aranazo', clip: empClips.aranazo, dur: 1.5, min: 0, max: 2.4, hits: [[0.52, 0.64], [0.96, 1.08]], dmg: 14, range: 2.35, arc: 120, weight: 3 },
    {
      name: 'desplome',
      clip: empClips.desplome,
      dur: 2.2,
      min: 0,
      max: 2.6,
      hits: [],
      weight: 1.2,
      cd: 2,
      noParry: true,
      events: [{ t: 1.0, fn: (e, g) => g.combat.shockwave(e.pos.x + Math.sin(e.yaw) * 0.5, e.pos.y, e.pos.z + Math.cos(e.yaw) * 0.5, 2.7, 22, e) }],
    },
  ],
  loco: (e, t, spd) => {
    const p = { ...EMP_BASE };
    // se balancea al arrastrar la obra (y las manos van por delante)
    const w = S(e.phase * 1.3);
    p.chest = [12 + spd * 6, w * 6 * Math.min(1, spd), S(t * 0.7) * 4 + w * 5 * Math.min(1, spd)];
    p.head = [8, S(t * 0.4) * 14, 10 + S(t * 0.9) * 6];
    p.armL = [-38 - spd * 8, 0, 14];
    p.armR = [-34 - spd * 8, 0, -14];
    p.root = [0, S(e.phase * 2.6) * 2 * Math.min(1, spd), 0];
    return rad(p);
  },
  idlePose: (e, kind, t, spd) => (kind === 'walled' ? empWalled(e, t) : EMPAREDADA_TYPE.loco(e, t, spd)),
  // la obra raspa el suelo: un paso cada tanto que avanza
  update: (e, dt) => {
    const d = e.data;
    const v = Math.hypot(e.vx, e.vz);
    d.drag = (d.drag || 0) + v * dt;
    if (d.drag > 0.7 && !e.dead) {
      d.drag = 0;
      if (e.game.audio) e.game.audio.enemyStep(e);
    }
  },
  // el pelo y la escudilla cuelgan y se quedan atrás
  postPose: (e, pose, dt) => {
    const d = e.data;
    const ss = d.sway || (d.sway = { x: new Spring(30, 4), z: new Spring(30, 4) });
    const cy = Math.cos(e.yaw),
      sy = Math.sin(e.yaw);
    const vF = e.vx * sy + e.vz * cy,
      vS = e.vx * cy - e.vz * sy;
    const t = e.game.time;
    const sx = ss.x.update(dt, clamp(vF * 0.2, -0.4, 0.4) + S(t * 1.5 + e.phase) * 0.04),
      sz = ss.z.update(dt, clamp(-vS * 0.16, -0.3, 0.3) + S(t * 1.1 + e.phase) * 0.04);
    if (e.state === 'dead') return;
    const hz = (pose.head ? pose.head[2] : 0) + (pose.chest ? pose.chest[2] : 0);
    pose.hairL = [sx * 0.3, 0, -hz * 0.8 + sz * 0.3 + 0.05];
    pose.hairR = [sx * 0.3, 0, -hz * 0.8 + sz * 0.3 - 0.05];
    hangDown(e, pose, 'hairB', sx + 0.1, sz);
    hangDown(e, pose, 'bowl', sx * 0.8, sz * 0.8);
  },
};

// ======================================================================= EL ENRODADO
// La rueda (de canto, el eje en x, rueda hacia +z) y el reo trenzado en su
// cara de fuera (+x): el cuerpo gira con ella; la cabeza y el brazo suelto
// cuelgan siempre a plomo (postPose).
const RW = 0.95;
// un miembro: un cilindro de a a b (en el marco de la rueda)
function limb(a, b, r0, r1, mat, j = 'wheel') {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  return { j, type: 'cyl', s: [r1, r0, d.length()], p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], r: [e.x / DEG, e.y / DEG, e.z / DEG], seg: 6, mat };
}

export function buildEnrodado() {
  const joints = [
    // el punto de apoyo en el suelo (de él vuelca), el centro de la rueda (gira)
    { name: 'hips', pos: [0, 0, 0] },
    { name: 'wheel', parent: 'hips', pos: [0, RW, 0] },
    { name: 'head', parent: 'wheel', pos: [0.13, 0.6, 0] },
    { name: 'jaw', parent: 'head', pos: [0, 0.06, 0.05] },
    { name: 'armF', parent: 'wheel', pos: [0.2, 0.5, 0.19] },
    { name: 'foreF', parent: 'armF', pos: [0, -0.3, 0] },
    { name: 'handF', parent: 'foreF', pos: [0, -0.28, 0] },
  ];
  const parts = [];
  const P = (o) => parts.push(o);
  const W = 'wooddark',
    SK = 'skinPale';
  // ---------------------------------------------------------- la rueda
  const N = 10;
  for (let k = 0; k < N; k++) {
    const th = (k / N) * Math.PI * 2;
    // las pinas (el aro de madera) y los radios
    P({ j: 'wheel', type: 'box', s: [0.1, 0.12, 2 * 0.89 * Math.sin(Math.PI / N) + 0.02], p: [0, 0.89 * Math.cos(th), 0.89 * Math.sin(th)], r: [th / DEG, 0, 0], mat: W });
    const ts = th + Math.PI / N;
    P({ j: 'wheel', type: 'cyl', s: [0.026, 0.03, 0.71], p: [0, 0.485 * Math.cos(ts), 0.485 * Math.sin(ts)], r: [ts / DEG, 0, 0], seg: 6, mat: W });
    // clavos de la llanta, y por detrás púas
    P({ j: 'wheel', type: 'box', s: [0.11, 0.03, 0.03], p: [0, 0.94 * Math.cos(th), 0.94 * Math.sin(th)], r: [th / DEG, 0, 0], mat: 'iron' });
    P({ j: 'wheel', type: 'cone', s: [0.02, 0.12], p: [-0.1, 0.86 * Math.cos(ts), 0.86 * Math.sin(ts)], r: [0, 0, 90], seg: 4, mat: 'iron' });
  }
  // la llanta de hierro (dos aros), el cubo con sus zunchos y el eje
  for (const x of [-0.035, 0.035]) P({ j: 'wheel', type: 'torus', s: [RW - 0.012, 0.022], p: [x, 0, 0], r: [0, 90, 0], seg: 28, seg2: 4, mat: 'iron' });
  P({ j: 'wheel', type: 'cyl', s: [0.13, 0.13, 0.22], p: [0, 0, 0], r: [0, 0, 90], seg: 10, mat: W });
  for (const x of [-0.08, 0.08]) P({ j: 'wheel', type: 'torus', s: [0.13, 0.016], p: [x, 0, 0], r: [0, 90, 0], seg: 12, mat: 'iron' });
  P({ j: 'wheel', type: 'cyl', s: [0.04, 0.04, 0.42], p: [-0.06, 0, 0], r: [0, 0, 90], seg: 6, mat: 'iron' });
  // sangre seca en la madera
  for (const [y, z, l] of [
    [0.84, 0.3, 0.2],
    [-0.4, 0.75, 0.16],
    [0.2, -0.86, 0.22],
  ])
    P({ j: 'wheel', type: 'box', s: [0.006, l, 0.1], p: [0.052, y, z], mat: 'blood' });

  // ---------------------------------------------------------- el reo
  // la pelvis sobre el cubo, el taparrabos, el tronco con las costillas
  P({ j: 'wheel', type: 'box', s: [0.14, 0.2, 0.26], p: [0.13, 0.0, 0], mat: SK });
  P({ j: 'wheel', type: 'box', s: [0.15, 0.2, 0.28], p: [0.14, -0.05, 0], taper: [1.1, 1.05], mat: 'linen' });
  P({ j: 'wheel', type: 'box', s: [0.14, 0.48, 0.29], p: [0.13, 0.32, 0], taper: [0.82, 0.9], mat: SK });
  for (let i = 0; i < 4; i++) P({ j: 'wheel', type: 'box', s: [0.01, 0.014, 0.22 - i * 0.02], p: [0.205, 0.26 + i * 0.06, 0], mat: 'bone' });
  P({ j: 'wheel', type: 'box', s: [0.006, 0.16, 0.12], p: [0.2, 0.18, 0.06], r: [20, 0, 0], mat: 'skinCorrupt' });
  P({ j: 'wheel', type: 'box', s: [0.006, 0.1, 0.1], p: [0.2, 0.42, -0.08], r: [-30, 0, 0], mat: 'skinCorrupt' });
  P({ j: 'wheel', type: 'cyl', s: [0.04, 0.045, 0.08], p: [0.13, 0.58, 0], seg: 6, mat: SK });
  // el brazo izquierdo, roto en el codo y trenzado por detrás de un radio
  // hasta la llanta, atado de la muñeca
  P(limb([0.13, 0.52, -0.17], [0.07, 0.6, -0.52], 0.04, 0.036, SK));
  P(limb([0.07, 0.6, -0.52], [-0.06, 0.36, -0.7], 0.034, 0.03, SK));
  P(limb([-0.06, 0.36, -0.7], [0.04, 0.14, -0.8], 0.03, 0.026, SK));
  P({ j: 'wheel', type: 'cone', s: [0.018, 0.09], p: [0.1, 0.62, -0.56], r: [0, 0, -60], seg: 4, mat: 'bone' });
  P({ j: 'wheel', type: 'box', s: [0.05, 0.05, 0.05], p: [0.09, 0.6, -0.54], mat: 'blood' });
  P({ j: 'wheel', type: 'box', s: [0.06, 0.09, 0.03], p: [0.05, 0.1, -0.83], r: [-20, 0, 0], mat: SK });
  P({ j: 'wheel', type: 'torus', s: [0.04, 0.012], p: [0.03, 0.16, -0.8], r: [0, 90, 0], seg: 8, mat: 'rope' });
  // las piernas: quebradas por las rodillas, una por delante y otra por
  // detrás de los radios, los pies atados al aro
  P(limb([0.13, -0.06, 0.09], [0.08, -0.5, 0.52], 0.05, 0.044, SK));
  P(limb([0.08, -0.5, 0.52], [-0.06, -0.78, 0.18], 0.04, 0.034, SK));
  P({ j: 'wheel', type: 'box', s: [0.06, 0.08, 0.16], p: [-0.06, -0.8, 0.08], r: [10, 0, 0], mat: SK });
  P({ j: 'wheel', type: 'torus', s: [0.045, 0.012], p: [-0.04, -0.8, 0.14], r: [0, 90, 0], seg: 8, mat: 'rope' });
  P(limb([0.13, -0.06, -0.09], [0.07, -0.6, -0.36], 0.05, 0.044, SK));
  P(limb([0.07, -0.6, -0.36], [0.08, -0.26, -0.76], 0.04, 0.034, SK));
  P({ j: 'wheel', type: 'box', s: [0.06, 0.16, 0.08], p: [0.08, -0.18, -0.8], r: [-30, 0, 0], mat: SK });
  P({ j: 'wheel', type: 'cone', s: [0.02, 0.1], p: [0.1, -0.6, -0.38], r: [70, 0, 0], seg: 4, mat: 'bone' });
  P({ j: 'wheel', type: 'box', s: [0.05, 0.06, 0.06], p: [0.08, -0.5, 0.52], mat: 'blood' });
  // los moratones
  P({ j: 'wheel', type: 'box', s: [0.05, 0.12, 0.05], p: [0.1, -0.3, 0.32], r: [40, 0, 0], mat: 'skinCorrupt' });

  // ---------------------------------------------------------- la cabeza (cuelga)
  // (mira hacia fuera de la rueda, +x: la cara del reo)
  P({ j: 'head', type: 'box', s: [0.18, 0.22, 0.16], p: [0.02, 0.13, 0], taper: [0.85, 0.9], mat: SK });
  P({ j: 'head', type: 'box', s: [0.15, 0.06, 0.165], p: [-0.01, 0.22, 0], mat: 'skinCorrupt' });
  for (const sz of [1, -1]) {
    P({ j: 'head', type: 'box', s: [0.02, 0.03, 0.045], p: [0.105, 0.16, sz * 0.04], mat: 'black' });
    P({ j: 'head', type: 'box', s: [0.006, 0.01, 0.012], p: [0.117, 0.16, sz * 0.04], mat: 'eyeGlow' });
  }
  P({ j: 'head', type: 'box', s: [0.03, 0.05, 0.026], p: [0.115, 0.12, 0], mat: SK });
  P({ j: 'head', type: 'box', s: [0.004, 0.12, 0.006], p: [0.112, 0.15, 0.05], r: [8, 0, 0], mat: 'blood' });
  P({ j: 'jaw', type: 'box', s: [0.11, 0.05, 0.12], p: [0.03, -0.025, -0.0], taper: [0.8, 0.9], mat: SK });
  P({ j: 'jaw', type: 'box', s: [0.02, 0.05, 0.07], p: [0.078, 0.005, 0], mat: 'black' });
  for (let i = 0; i < 3; i++) P({ j: 'jaw', type: 'box', s: [0.01, 0.016, 0.012], p: [0.082, 0.02, -0.014 + i * 0.014], mat: 'bone' });
  // el brazo suelto, colgando: quebrado, con la mano de garras
  P({ j: 'armF', type: 'ico', s: [0.045], p: [0, 0, 0], mat: SK });
  P({ j: 'armF', type: 'box', s: [0.07, 0.32, 0.07], p: [0, -0.15, 0], taper: [0.85, 0.85], mat: SK });
  P({ j: 'foreF', type: 'ico', s: [0.04], p: [0, 0, 0], mat: 'skinCorrupt' });
  P({ j: 'foreF', type: 'box', s: [0.055, 0.3, 0.055], p: [0, -0.14, 0], taper: [0.8, 0.8], mat: SK });
  P({ j: 'foreF', type: 'cone', s: [0.016, 0.08], p: [0.03, -0.02, 0.01], r: [0, 0, -70], seg: 4, mat: 'bone' });
  P({ j: 'handF', type: 'box', s: [0.06, 0.08, 0.025], p: [0, -0.04, 0], mat: SK });
  for (const x of [-0.021, -0.007, 0.007, 0.021]) {
    const l = 1 - Math.abs(x) * 6;
    P({ j: 'handF', type: 'box', s: [0.011, 0.1 * l, 0.011], p: [x, -0.1 - 0.04 * l, 0.01], r: [20, 0, 0], mat: SK });
    P({ j: 'handF', type: 'box', s: [0.01, 0.03, 0.01], p: [x, -0.15 - 0.08 * l, 0.04], r: [40, 0, 0], mat: 'black' });
  }
  return new Rig({ joints, parts });
}

// (la cabeza, caída a un lado; la quijada se abre en z, que mira a +x)
const ENR_BASE = { hips: [0, 0, 0], head: [20, 0, -18], jaw: [0, 0, -24], armF: [0, 0, 0], foreF: [-10, 0, 0], handF: [10, 0, 0] };
const enrClips = {
  // la rueda se mece adelante y atrás; la cabeza se alza y aúlla
  alert: clip('alert', 1.4, [
    [0, { ...ENR_BASE }],
    [0.35, { hips: [-8, 0, 0], head: [0, 0, 50], jaw: [0, 0, -50], armF: [-60, 0, 30], foreF: [-30, 0, 0] }, 'snap'],
    [0.8, { hips: [6, 0, 0], head: [10, 0, 40], jaw: [0, 0, -44], armF: [-20, 0, -20], foreF: [-60, 0, 0] }],
    [1.4, { ...ENR_BASE }],
  ]),
  // se echa atrás, la cabeza arriba (aúlla) y carga en línea recta; luego
  // se bambolea como una moneda antes de enderezarse (la ventana)
  embestida: clip(
    'embestida',
    3.0,
    [
      [0, { ...ENR_BASE }],
      [0.6, { hips: [-10, 0, 0], head: [0, 0, 60], jaw: [0, 0, -54], armF: [-80, 0, 0], foreF: [-20, 0, 0] }, 'hold'],
      [0.9, { hips: [8, 0, 0], head: [0, 0, 30], jaw: [0, 0, -46], armF: [-110, 0, 0], foreF: [-10, 0, 0] }, 'snap'],
      [1.9, { hips: [6, 0, 0], head: [0, 0, 30], jaw: [0, 0, -46], armF: [-110, 0, 0], foreF: [-10, 0, 0] }],
      [2.15, { hips: [-4, 0, 16], head: [30, 0, 0], jaw: [0, 0, -30], armF: [0, 0, 40], foreF: [-20, 0, 0] }],
      [2.4, { hips: [0, 0, -12], head: [-30, 0, 0], jaw: [0, 0, -30], armF: [0, 0, -40], foreF: [-20, 0, 0] }],
      [2.65, { hips: [0, 0, 7], head: [16, 0, 0], jaw: [0, 0, -28], armF: [0, 0, 20], foreF: [-20, 0, 0] }],
      [3.0, { ...ENR_BASE }],
    ],
    { mono: true }
  ),
  // se vuelve de cara a ti y se te cae encima de plano; queda tendida (con el
  // reo boca arriba) y se levanta despacio
  vuelco: clip(
    'vuelco',
    3.6,
    [
      [0, { ...ENR_BASE }],
      [0.7, { hips: [-14, 90, 0], head: [0, 0, 30], jaw: [0, 0, -50], armF: [-60, 0, 0] }, 'hold'],
      [1.0, { hips: [88, 90, 0], head: [0, 0, -20], jaw: [0, 0, -56], armF: [40, 0, 0], root: [0, 6, 0] }, 'snap'],
      [1.15, { hips: [80, 90, 0], head: [0, 0, -10], jaw: [0, 0, -50], armF: [30, 0, 0], root: [0, 8, 0] }],
      [1.3, { hips: [88, 90, 0], head: [0, 0, -16], jaw: [0, 0, -48], armF: [36, 0, 0], root: [0, 6, 0] }],
      [2.4, { hips: [86, 90, 0], head: [0, 0, -10], jaw: [0, 0, -40], armF: [20, 0, 20], root: [0, 6, 0] }],
      [3.3, { hips: [0, 30, 0], head: [0, 0, 20], jaw: [0, 0, -30], armF: [-20, 0, 0] }],
      [3.6, { ...ENR_BASE }],
    ],
    { mono: true }
  ),
  // se ha estrellado: rebota, se bambolea y tarda en enderezarse (abierto
  // al golpe de gracia)
  crash: clip(
    'crash',
    2.7,
    [
      [0, { ...ENR_BASE, hips: [-16, 0, 20], head: [-20, 0, 40], jaw: [0, 0, -56], armF: [-60, 0, 50] }, 'snap'],
      [0.35, { ...ENR_BASE, hips: [6, 0, -24], head: [10, 0, -20], jaw: [0, 0, -50], armF: [30, 0, -40] }],
      [0.75, { ...ENR_BASE, hips: [-4, 0, 18], head: [-6, 0, 30], jaw: [0, 0, -44], armF: [-20, 0, 30] }],
      [1.2, { ...ENR_BASE, hips: [2, 0, -12], head: [4, 0, -12], jaw: [0, 0, -40] }],
      [1.7, { ...ENR_BASE, hips: [0, 0, 8], head: [0, 0, 14], jaw: [0, 0, -36] }],
      [2.2, { ...ENR_BASE, hips: [0, 0, -4] }],
      [2.7, { ...ENR_BASE }],
    ],
    { mono: true }
  ),
  // el brazo suelto, de abajo arriba
  zarpa: clip('zarpa', 1.25, [
    [0, { ...ENR_BASE }],
    [0.42, { hips: [-6, 0, 0], head: [0, 0, 20], jaw: [0, 0, -40], armF: [40, 0, 10], foreF: [-40, 0, 0], handF: [-20, 0, 0] }, 'hold'],
    [0.56, { hips: [6, 0, 0], head: [0, 0, 30], jaw: [0, 0, -50], armF: [-120, 0, -10], foreF: [-10, 0, 0], handF: [20, 0, 0] }, 'snap'],
    [0.85, { hips: [4, 0, 0], head: [0, 0, 24], jaw: [0, 0, -40], armF: [-110, 0, -10], foreF: [-20, 0, 0], handF: [20, 0, 0] }],
    [1.25, { ...ENR_BASE }],
  ]),
  hurt: clip('hurt', 0.5, [
    [0, { ...ENR_BASE, hips: [-7, 0, 5], head: [20, 0, 30], jaw: [0, 0, -44] }, 'snap'],
    [0.5, { ...ENR_BASE }],
  ]),
  stagger: clip('stagger', 1.3, [
    [0, { ...ENR_BASE, hips: [-12, 0, 14], head: [30, 0, 40], jaw: [0, 0, -50] }, 'snap'],
    [0.5, { ...ENR_BASE, hips: [4, 0, -9] }],
    [0.9, { ...ENR_BASE, hips: [0, 0, 4] }],
    [1.3, { ...ENR_BASE }],
  ]),
  parried: clip(
    'parried',
    1.7,
    [
      [0, { hips: [-14, 0, 10], head: [20, 0, 40], jaw: [0, 0, -50], armF: [-170, 0, 40], foreF: [-20, 0, 0] }, 'snap'],
      [0.6, { hips: [-8, 0, 6], head: [16, 0, 30], jaw: [0, 0, -40], armF: [-140, 0, 30], foreF: [-20, 0, 0] }],
      [1.7, { ...ENR_BASE }],
    ],
    { mono: true }
  ),
  // la rueda se va de lado y se queda girando en el suelo, como una moneda
  death: clip(
    'death',
    2.2,
    [
      [0, { hips: [-10, 0, 0], head: [0, 0, 50], jaw: [0, 0, -56], armF: [-120, 0, 0] }, 'snap'],
      [0.7, { hips: [0, 0, -30], head: [0, 0, 30], jaw: [0, 0, -50], armF: [-40, 0, 0] }],
      [1.2, { hips: [0, 0, -88], head: [0, 0, 0], jaw: [0, 0, -40], armF: [0, 0, 0], root: [0, 6, 0] }, 'in'],
      [1.45, { hips: [0, 0, -80], head: [0, 0, 0], jaw: [0, 0, -40], armF: [0, 0, 0], root: [0, 6, 0] }],
      [1.7, { hips: [0, 0, -88], head: [0, 0, 0], jaw: [0, 0, -40], armF: [0, 0, 0], root: [0, 6, 0] }],
      [2.2, { hips: [0, 0, -88], head: [0, 0, 0], jaw: [0, 0, -36], armF: [0, 0, 0], root: [0, 6, 0] }],
    ],
    { mono: true }
  ),
};

export const ENRODADO_TYPE = {
  name: 'Enrodado',
  build: buildEnrodado,
  hp: 135,
  poise: 70,
  radius: 0.55,
  height: 1.95,
  lockHeight: 1.2,
  walk: 1.7,
  run: 4.6,
  runDist: 5,
  sight: 13,
  hear: 5,
  turn: 2.2,
  approach: 2.0,
  float: true,
  parryDur: 1.5,
  clips: enrClips,
  voice: 'enrodado',
  alertTime: 1.3,
  attacks: [
    {
      name: 'embestida',
      clip: enrClips.embestida,
      dur: 3.0,
      min: 3,
      max: 11,
      hits: [[0.92, 1.9]],
      dmg: 28,
      range: 1.5,
      arc: 70,
      weight: 3,
      cd: 1.2,
      // (apunta hasta que arranca; luego, en línea recta: se esquiva; y si
      // se estrella contra un muro o el brocal, queda aturdida)
      trackUntil: 0.86,
      turn: 3,
      cd: 2.4,
      lunge: [
        [0.15, 0.6, -1.4],
        [0.9, 1.9, 9.5],
      ],
      noParry: true,
      update: (e, dt, t) => enrCrashCheck(e, dt, t),
    },
    {
      name: 'vuelco',
      clip: enrClips.vuelco,
      dur: 3.6,
      min: 0,
      max: 2.4,
      hits: [],
      weight: 1.5,
      cd: 2.2,
      trackUntil: 0.65,
      noParry: true,
      events: [{ t: 1.0, fn: (e, g) => g.combat.shockwave(e.pos.x + Math.sin(e.yaw) * RW, e.pos.y, e.pos.z + Math.cos(e.yaw) * RW, 2.3, 32, e) }],
    },
    { name: 'zarpa', clip: enrClips.zarpa, dur: 1.25, min: 0, max: 2.2, hits: [[0.5, 0.66]], dmg: 15, range: 2.1, arc: 90, weight: 2.5 },
  ],
  cooldown: 1.8,
  // (no rodea de lado como los demás, que una rueda no va de canto: tras un
  // ataque se aparta rodando hacia atrás, de cara a ti, para coger carrerilla)
  think: (e, player, d, dt) => {
    if (e.cooldown > 0 && d < 4.6) {
      e.yaw = approachAngleL(e.yaw, e.angleTo(player.pos), e.T.turn * dt);
      const back = d < 4.4 ? -1.4 : 0;
      e.vx = damp(e.vx, Math.sin(e.yaw) * back, 4, dt);
      e.vz = damp(e.vz, Math.cos(e.yaw) * back, 4, dt);
      return 'handled';
    }
  },
  loco: (e, t, spd) => {
    const p = { ...ENR_BASE };
    p.jaw = [0, 0, -24 - S(t * 3.1 + e.phase) * 8];
    p.head = [20 + S(t * 0.6) * 8, 0, -18 - S(t * 0.8) * 10];
    p.armF = [S(t * 1.1 + e.phase) * 8, 0, 0];
    return rad(p);
  },
  idlePose: (e, kind, t, spd) => ENRODADO_TYPE.loco(e, t, spd),
  update: (e, dt) => {
    const d = e.data;
    const v = Math.hypot(e.vx, e.vz);
    d.roll = (d.roll || 0) + v * dt;
    if (d.roll > 1.1 && !e.dead) {
      d.roll = 0;
      if (e.game.audio) e.game.audio.enemyStep(e);
    }
  },
  // la rueda gira con lo que avanza y se inclina en las curvas; la cabeza y
  // el brazo suelto cuelgan a plomo (con lo que les ponga el clip encima)
  postPose: (e, pose, dt) => {
    const d = e.data;
    const vF = e.vx * Math.sin(e.yaw) + e.vz * Math.cos(e.yaw);
    if (e.state === 'dead') d.spinV = (d.spinV ?? 0) * Math.exp(-0.6 * dt);
    else d.spinV = vF / RW;
    d.spin = (d.spin || 0) + d.spinV * dt;
    const dy = d.lastYaw === undefined ? 0 : Math.atan2(Math.sin(e.yaw - d.lastYaw), Math.cos(e.yaw - d.lastYaw));
    d.lastYaw = e.yaw;
    d.lean = damp(d.lean || 0, clamp((-dy / Math.max(dt, 1e-3)) * vF * 0.06, -0.3, 0.3), 4, dt);
    if (e.state !== 'dead') addRot(pose, 'hips', [0, 0, d.lean]);
    pose.wheel = [d.spin, 0, 0];
    if (e.state === 'dead') return;
    const ss = d.sway || (d.sway = { x: new Spring(26, 3), z: new Spring(26, 3) });
    const sx = ss.x.update(dt, clamp(vF * 0.12, -0.5, 0.5)),
      sz = ss.z.update(dt, d.lean * 0.8);
    // (la cabeza va suelta: cabecea con los tumbos de la rueda)
    addRot(pose, 'head', [sz * 0.6, 0, -sx * 0.8 + Math.sin(d.spin) * 0.25]);
    const a = pose.armF || [0, 0, 0];
    hangDown(e, pose, 'armF', sx * 1.4 + a[0], sz * 1.4 + a[2]);
  },
};
// La embestida: si a media carga apenas avanza (un muro, el brocal, una
// columna; no el jugador) es que se ha estrellado.
function enrCrashCheck(e, dt, t) {
  const d = e.data;
  if (t < 1.0 || t > 1.85) {
    d.crashN = 0;
    d.cp = null;
    return;
  }
  const p = e.pos;
  if (d.cp) {
    const moved = Math.hypot(p.x - d.cp.x, p.z - d.cp.z);
    const pl = e.game.player.pos;
    const near = Math.hypot(pl.x - p.x, pl.z - p.z) < 1.6;
    d.crashN = moved < 9.5 * dt * 0.3 && !near ? (d.crashN || 0) + 1 : 0;
    if (d.crashN >= 3) {
      enrCrash(e);
      return;
    }
  }
  d.cp = { x: p.x, z: p.z };
}
function enrCrash(e) {
  const g = e.game;
  e.atk = null;
  e.parryHits = 0;
  e.state = 'parried';
  e.stT = 0;
  e.parryK = 1.8;
  e.parryT = (e.T.parryDur ?? 1.5) * e.parryK;
  e.anim.play(enrClips.crash, { blend: 0.03 });
  e.vx = -Math.sin(e.yaw) * 2.2;
  e.vz = -Math.cos(e.yaw) * 2.2;
  e.data.crashN = 0;
  e.data.cp = null;
  const fx = e.pos.x + Math.sin(e.yaw) * 0.6,
    fz = e.pos.z + Math.cos(e.yaw) * 0.6;
  if (g.fx && g.fx.blood) g.fx.blood.emit(fx, e.pos.y + 0.8, fz, 26, { color: [0.4, 0.33, 0.24], speed: 5, life: 0.8, up: 2 });
  if (g.audio) g.audio.play('wheelCrash', { x: fx, y: e.pos.y + 0.8, z: fz });
  const dd = Math.hypot(g.player.pos.x - e.pos.x, g.player.pos.z - e.pos.z);
  g.camRig.shake(clamp(0.55 - dd * 0.04, 0.1, 0.55));
}
// (approachAngle con la vuelta corta)
function approachAngleL(a, b, step) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + clamp(d, -step, step);
}
