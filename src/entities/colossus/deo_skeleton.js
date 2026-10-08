// El esqueleto de Deo Ignoto: los seis brazos (hombro, codo, muñeca, palma),
// los dedos y los huesos. Va aparte de la escultura (deo.js) para que la
// animación y la pelea lo usen sin cargar el escultor.
//
// Espacio del modelo: el origen en el suelo de la nave, donde brota; mira
// hacia +z (la fachada y la plaza); +x es su izquierda.
import * as THREE from 'three';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------ los brazos
// s hombro, e codo, w muñeca, h fin de la palma; pn hacia dónde mira la palma
// (los dedos se cierran hacia ahí); curl cuánto se cierran; spread lo abiertos
export const DEO_ARMS = [
  // delante: agarran las torres de la fachada (el modelo va con su origen en
  // la nave, 24 m detrás de la fachada)
  { id: 'frenteL', s: [13, 37, 5], e: [23.5, 41, 14.5], w: [14.2, 35.2, 21.5], h: [10.8, 33.4, 24.0], pn: [0, -1, 0.1], curl: 1.5, spread: 0.85 },
  { id: 'frenteR', s: [-13, 37, 5], e: [-23.5, 41, 14.5], w: [-14.2, 35.2, 21.5], h: [-10.8, 33.4, 24.0], pn: [0, -1, 0.1], curl: 1.5, spread: 0.85 },
  // los lados: sobre los tejados de los barrios
  { id: 'ladoL', s: [19, 31, -2], e: [33, 39, 2.5], w: [41.5, 23, 8], h: [44.5, 15.2, 10], pn: [0.15, -1, 0], curl: 0.55, spread: 1.15 },
  { id: 'ladoR', s: [-19, 31, -2], e: [-33, 39, 2.5], w: [-41.5, 23, 8], h: [-44.5, 15.2, 10], pn: [-0.15, -1, 0], curl: 0.55, spread: 1.15 },
  // atrás, alzados al cielo con las manos abiertas: los que golpean la plaza
  { id: 'altoL', s: [11, 42, -8], e: [24, 60, -16], w: [30, 80, -10], h: [31, 88.5, -6], pn: [-0.1, 0.25, 1], curl: 0.35, spread: 1.3, sigil: true },
  { id: 'altoR', s: [-11, 42, -8], e: [-24, 60, -16], w: [-30, 80, -10], h: [-31, 88.5, -6], pn: [0.1, 0.25, 1], curl: 0.35, spread: 1.3, sigil: true },
];
export const FINGERS = [
  // [desplazamiento lateral (en anchos de dedo), largo (m)]
  [-1.5, 8.8],
  [-0.5, 10.4],
  [0.5, 10.0],
  [1.5, 8.0],
];

// marco de la mano: dirección, lado (abanico de los dedos) y normal de la palma
export function handFrame(a) {
  const W = V(...a.w),
    Hd = V(...a.h);
  const dir = Hd.clone().sub(W).normalize();
  let pn = V(...a.pn).normalize();
  const side = dir.clone().cross(pn).normalize();
  pn = side.clone().cross(dir).normalize();
  return { W, Hd, dir, side, pn };
}
// las articulaciones de cada dedo (espacio del modelo)
export function fingerJoints(a) {
  const { W, Hd, dir, side, pn } = handFrame(a);
  const out = [];
  FINGERS.forEach(([t, L], f) => {
    const base = Hd.clone().addScaledVector(side, t * 1.35 * a.spread).addScaledVector(dir, 0.2 - Math.abs(t) * 0.35);
    const fd = dir.clone().addScaledVector(side, t * 0.3 * a.spread).normalize();
    const k1 = base.clone().addScaledVector(fd, L * 0.42).addScaledVector(pn, a.curl * L * 0.08);
    const k2 = k1.clone().addScaledVector(fd, L * 0.32).addScaledVector(pn, a.curl * L * 0.2);
    const tip = k2.clone().addScaledVector(fd, L * 0.18).addScaledVector(pn, a.curl * L * 0.28);
    out.push({ f, base, k1, k2, tip, r: [0.72, 0.66, 0.56, 0.3][0] * (f === 1 ? 1.05 : 1) });
  });
  // el pulgar, desde la base de la palma
  const tb = W.clone().lerp(Hd, 0.35).addScaledVector(side, -1.9 * a.spread).addScaledVector(pn, 0.4);
  const td = dir.clone().addScaledVector(side, -0.75).normalize();
  const k1 = tb.clone().addScaledVector(td, 3.0).addScaledVector(pn, a.curl * 0.6);
  const k2 = k1.clone().addScaledVector(td, 2.4).addScaledVector(pn, a.curl * 1.2);
  const tip = k2.clone().addScaledVector(td, 1.4).addScaledVector(pn, a.curl * 1.5);
  out.push({ f: 4, base: tb, k1, k2, tip, r: 0.78 });
  return out;
}

function bonesDef() {
  const B = [
    { name: 'root', pos: [0, 0, 0] },
    { name: 'body', parent: 'root', pos: [0, 14, -2] },
    { name: 'chest', parent: 'body', pos: [0, 30, -1] },
    { name: 'neck', parent: 'chest', pos: [0, 40, 4] },
    { name: 'head', parent: 'neck', pos: [0, 45, 10] },
    { name: 'jaw', parent: 'head', pos: [0, 41, 13] },
  ];
  DEO_ARMS.forEach((a, i) => {
    B.push({ name: `a${i}s`, parent: 'chest', pos: a.s });
    B.push({ name: `a${i}e`, parent: `a${i}s`, pos: a.e });
    B.push({ name: `a${i}w`, parent: `a${i}e`, pos: a.w });
    for (const fj of fingerJoints(a)) {
      B.push({ name: `a${i}f${fj.f}`, parent: `a${i}w`, pos: fj.base.toArray() });
      B.push({ name: `a${i}f${fj.f}b`, parent: `a${i}f${fj.f}`, pos: fj.k1.toArray() });
    }
  });
  return B;
}
export const DEO_BONES = bonesDef();

export const DEO = { height: 56, reach: 95 };
