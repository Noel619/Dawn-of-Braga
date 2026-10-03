// Cosas que se rompen en las bodegas: los pilares de la sala del altar y del
// Lagar (el Descoyuntado los arranca si te escudas tras ellos, y revientan si
// se estrella dos veces contra ellos), los sepulcros y los santos velados de
// la cripta (los revienta de un golpe si te escondes detrás), y los toneles,
// los sacos y los estantes (de madera: también los rompes tú, y él los
// arrasa al pasar, al barrer o al cargar). Son mallas propias con la luz
// horneada del sitio (sonda); al romperse saltan cascotes con una física
// sencilla, quedan los restos, se quita su colisión y se rehace la
// navegación de la zona.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { partGeometry } from '../entities/rig.js';
import { objMat, cloneMat } from '../gfx/materials.js';
import { RNG, angleDiff, DEG } from '../core/util.js';

const MAT_TINT = { ashlar: [0.72, 0.7, 0.66], planks: [0.7, 0.62, 0.55], wooddark: [0.8, 0.75, 0.7], wallstone: [0.66, 0.62, 0.58], iron: [1, 1, 1], blood: [0.36, 0.14, 0.17], burlap: [0.78, 0.72, 0.62], straw: [0.7, 0.62, 0.45], clothWhite: [0.72, 0.7, 0.66], bone: [0.85, 0.82, 0.74], black: [1, 1, 1] };

// Qué es cada cosa: golpes tuyos que aguanta (hp), choques de él que aguanta
// (crash), de madera o de saco (light: él la arrasa sin detenerse) o de
// piedra (stone), y su sonido al romperse.
const KIND = {
  pillar: { hp: Infinity, crash: 2, stone: true, snd: 'pillarBreak', chunks: 16 },
  tomb: { hp: Infinity, crash: 1, stone: true, snd: 'wallBreak', chunks: 16 },
  statue: { hp: Infinity, crash: 1, stone: true, snd: 'pillarBreak', chunks: 12 },
  wall: { hp: Infinity, crash: 1, stone: true, snd: 'wallBreak', chunks: 18 },
  rack: { hp: 3, crash: 1, light: true, snd: 'rackBreak', chunks: 12, wine: true },
  cask: { hp: 2, crash: 1, light: true, snd: 'rackBreak', chunks: 10, wine: true },
  sacks: { hp: 1, crash: 1, light: true, snd: 'sackTear', chunks: 8, soft: true },
  // en lo alto del Postigo: almenas, el torno del rastrillo, la barricada
  // del adarve norte y los barriles y cajas de la guarnición
  merlon: { hp: Infinity, crash: 1, stone: true, snd: 'merlonBreak', chunks: 9 },
  winch: { hp: Infinity, crash: 1, snd: 'winchBreak', chunks: 16, wood: true },
  barricade: { hp: Infinity, crash: 1, snd: 'barricadeBreak', chunks: 24, wood: true },
  barrel: { hp: 2, crash: 1, light: true, snd: 'rackBreak', chunks: 10, pitch: true },
  crate: { hp: 2, crash: 1, light: true, snd: 'rackBreak', chunks: 10 },
};

// Charco irregular (varios discos solapados, nunca un cuadrado).
function puddle(P, rng, cx, cz, R, mat = 'blood') {
  for (let i = 0; i < 5; i++) {
    const a = rng.range(0, Math.PI * 2),
      d = i ? rng.range(0.2, 0.55) * R : 0;
    const r = (i ? rng.range(0.35, 0.6) : rng.range(0.55, 0.7)) * R;
    P.push({ type: 'cyl', s: [r, r * rng.range(0.9, 1.05), 0.006], p: [cx + Math.cos(a) * d, 0.012 + i * 0.001, cz + Math.sin(a) * d], sc: [1, 1, rng.range(0.6, 1)], r: [0, rng.range(0, 180), 0], seg: 9, mat });
  }
}

// Piezas (en coordenadas locales: origen en el centro de la base) agrupadas
// por material -> una malla por material.
function build(parts, mats) {
  const by = new Map();
  for (const p of parts) {
    if (!by.has(p.mat)) by.set(p.mat, []);
    by.get(p.mat).push(partGeometry(p));
  }
  const g = new THREE.Group();
  for (const [mat, geos] of by) {
    const m = new THREE.Mesh(geos.length > 1 ? mergeGeometries(geos) : geos[0], mats(mat));
    g.add(m);
  }
  return g;
}

// ------------------------------------------------------------ modelos
function pillarParts(s, rng) {
  const h = s.h,
    w = s.hx * 2;
  const P = [];
  P.push({ type: 'box', s: [w + 0.24, 0.36, w + 0.24], p: [0, 0.18, 0], mat: 'ashlar' });
  // hiladas de sillares algo desiguales
  for (let y = 0.36; y < h - 0.35; y += 0.52) {
    const hh = Math.min(0.52, h - 0.35 - y);
    const j = rng.range(-0.025, 0.025);
    P.push({ type: 'box', s: [w + j, hh - 0.02, w - j], p: [rng.range(-0.015, 0.015), y + hh / 2, rng.range(-0.015, 0.015)], r: [0, rng.range(-2, 2), 0], mat: 'ashlar' });
  }
  P.push({ type: 'box', s: [w + 0.3, 0.35, w + 0.3], p: [0, h - 0.175, 0], mat: 'ashlar' });
  return P;
}
function pillarRubble(s, rng) {
  const w = s.hx * 2;
  const P = [{ type: 'box', s: [w + 0.24, 0.36, w + 0.24], p: [0, 0.18, 0], mat: 'ashlar' }];
  // muñón mellado
  for (let i = 0; i < 4; i++) P.push({ type: 'box', s: [w * 0.5, rng.range(0.25, 0.55), w * 0.5], p: [(i % 2 ? 1 : -1) * w * 0.24, 0.5, (i < 2 ? 1 : -1) * w * 0.24], r: [rng.range(-8, 8), rng.range(0, 40), rng.range(-8, 8)], mat: 'ashlar' });
  // capitel colgando de la bóveda, roto por debajo
  P.push({ type: 'box', s: [w + 0.3, 0.35, w + 0.3], p: [0, s.h - 0.175, 0], mat: 'ashlar' });
  P.push({ type: 'box', s: [w * 0.8, 0.4, w * 0.7], p: [0.05, s.h - 0.5, -0.04], r: [6, 20, -5], mat: 'ashlar' });
  // montón de sillares alrededor
  for (let i = 0; i < 12; i++) {
    const a = rng.range(0, Math.PI * 2),
      r = rng.range(0.6, 1.9),
      sz = rng.range(0.25, 0.5);
    P.push({ type: 'box', s: [sz * 1.3, sz * 0.7, sz], p: [Math.cos(a) * r, sz * 0.3, Math.sin(a) * r], r: [rng.range(-25, 25), rng.range(0, 180), rng.range(-25, 25)], mat: 'ashlar' });
  }
  return P;
}
function rackParts(s, rng) {
  const L = s.hz * 2,
    W = s.hx * 2,
    H = s.h;
  const P = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push({ type: 'box', s: [0.1, H, 0.1], p: [(sx * W) / 2 - sx * 0.06, H / 2, (sz * L) / 2 - sz * 0.06], mat: 'wooddark' });
  for (const y of [0.25, 1.25, H - 0.05]) for (const sx of [-1, 1]) P.push({ type: 'box', s: [0.08, 0.1, L], p: [(sx * W) / 2 - sx * 0.06, y, 0], mat: 'wooddark' });
  // toneles tumbados en dos pisos (el eje a lo ancho del estante)
  for (const y of [0.3, 1.3]) {
    const n = Math.max(1, Math.round(L / 1.05));
    for (let i = 0; i < n; i++) {
      const z = -L / 2 + ((i + 0.5) / n) * L;
      const r = rng.range(0.4, 0.46);
      P.push({ type: 'cyl', s: [r, r, W - 0.1], p: [0, y + r, z], r: [0, 0, 90], seg: 9, mat: 'planks' });
      P.push({ type: 'cyl', s: [r + 0.02, r + 0.02, 0.05], p: [W * 0.28, y + r, z], r: [0, 0, 90], seg: 9, mat: 'iron' });
      P.push({ type: 'cyl', s: [r + 0.02, r + 0.02, 0.05], p: [-W * 0.28, y + r, z], r: [0, 0, 90], seg: 9, mat: 'iron' });
    }
  }
  return P;
}
function rackRubble(s, rng) {
  const L = s.hz * 2;
  const P = [];
  for (let i = 0; i < 9; i++) P.push({ type: 'box', s: [0.08, 0.06, rng.range(0.6, 1.6)], p: [rng.range(-1, 1), 0.04 + i * 0.012, rng.range(-L / 2, L / 2)], r: [rng.range(-6, 6), rng.range(0, 180), 0], mat: 'wooddark' });
  for (let i = 0; i < 3; i++) {
    const r = rng.range(0.4, 0.45);
    P.push({ type: 'cyl', s: [r, r, 0.9], p: [rng.range(-0.9, 0.9), r, rng.range(-L / 2, L / 2)], r: [0, rng.range(0, 180), 90], seg: 9, mat: 'planks' });
  }
  for (let i = 0; i < 10; i++) P.push({ type: 'box', s: [0.12, 0.02, rng.range(0.4, 0.8)], p: [rng.range(-1.3, 1.3), 0.02, rng.range(-L / 2 - 0.4, L / 2 + 0.4)], r: [0, rng.range(0, 180), 0], mat: 'planks' });
  puddle(P, rng, 0, 0, Math.min(1.6, L * 0.45));
  return P;
}
// tonel tumbado en su cuna (el eje a lo largo de x local)
function caskParts(s) {
  const R = s.r,
    L = s.len;
  const P = [];
  for (const sx of [-L * 0.3, L * 0.3]) P.push({ type: 'box', s: [0.12, R * 0.45, R * 1.6], p: [sx, R * 0.225, 0], mat: 'wooddark' });
  P.push({ type: 'cyl', s: [R * 0.92, R * 0.92, L], p: [0, R + 0.1, 0], r: [0, 0, 90], seg: 10, mat: 'planks' });
  P.push({ type: 'cyl', s: [R, R, L * 0.5], p: [0, R + 0.1, 0], r: [0, 0, 90], seg: 10, mat: 'planks' });
  for (const x of [-L * 0.42, -L * 0.1, L * 0.1, L * 0.36]) P.push({ type: 'cyl', s: [R * 0.97 + 0.012, R * 0.97 + 0.012, 0.05], p: [x, R + 0.1, 0], r: [0, 0, 90], seg: 10, mat: 'iron' });
  P.push({ type: 'box', s: [0.13, 0.06, 0.06], p: [L / 2 + 0.05, R * 0.53 + 0.1, 0], mat: 'wooddark' });
  return P;
}
function caskRubble(s, rng) {
  const R = s.r,
    L = s.len;
  const P = [];
  // duelas sueltas, aros por el suelo, la cuna volcada y el vino derramado
  for (let i = 0; i < 11; i++) P.push({ type: 'box', s: [rng.range(0.4, L * 0.95), 0.025, 0.09], p: [rng.range(-L * 0.6, L * 0.6), 0.02 + i * 0.006, rng.range(-R * 1.4, R * 1.4)], r: [rng.range(-5, 5), rng.range(0, 180), rng.range(-4, 4)], mat: 'planks' });
  for (let i = 0; i < 3; i++) P.push({ type: 'torus', s: [R * rng.range(0.85, 1), 0.022], p: [rng.range(-L * 0.5, L * 0.5), 0.03 + i * 0.02, rng.range(-R, R)], r: [90 + rng.range(-10, 10), 0, rng.range(0, 180)], seg: 12, seg2: 3, mat: 'iron' });
  P.push({ type: 'box', s: [0.12, R * 0.4, R * 1.5], p: [-L * 0.3, 0.06, R * 0.3], r: [80, rng.range(-20, 20), 0], mat: 'wooddark' });
  P.push({ type: 'box', s: [0.12, R * 0.45, R * 1.6], p: [L * 0.35, R * 0.225, -0.1], r: [0, rng.range(-25, 25), 0], mat: 'wooddark' });
  puddle(P, rng, 0, 0, Math.max(0.9, L * 0.8));
  return P;
}
// sacos de grano amontonados
function sacksParts(s, rng) {
  const P = [];
  const n = 3;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.3, 0.3);
    P.push({ type: 'sphere', s: [0.4, 0.28, 0.3], p: [Math.cos(a) * 0.32, 0.25, Math.sin(a) * 0.32], r: [rng.range(-12, 12), rng.range(0, 180), rng.range(-12, 12)], seg: 7, seg2: 5, mat: 'burlap' });
  }
  P.push({ type: 'sphere', s: [0.38, 0.27, 0.3], p: [0.05, 0.62, -0.02], r: [rng.range(-12, 12), rng.range(0, 180), 0], seg: 7, seg2: 5, mat: 'burlap' });
  return P;
}
function sacksRubble(s, rng) {
  const P = [];
  for (let i = 0; i < 4; i++) P.push({ type: 'sphere', s: [0.42, 0.07, 0.32], p: [rng.range(-0.6, 0.6), 0.05, rng.range(-0.6, 0.6)], r: [0, rng.range(0, 180), 0], seg: 7, seg2: 4, mat: 'burlap' });
  // el grano desparramado
  puddle(P, rng, 0.1, 0.1, 1.1, 'straw');
  return P;
}
// sepulcro de piedra (cerrado con su yacente, o abierto)
function tombParts(s) {
  const P = [
    { type: 'box', s: [2.4, 0.9, 1.1], p: [0, 0.45, 0], mat: 'ashlar' },
    { type: 'box', s: [2.6, 0.15, 1.24], p: [0, 0.075, 0], mat: 'ashlar' },
  ];
  if (s.open) {
    P.push({ type: 'box', s: [2.2, 0.02, 0.9], p: [0, 0.89, 0], mat: 'black' });
    P.push({ type: 'box', s: [2.5, 0.18, 1.2], p: [0.3, 0.99, 0.45], r: [0, 20, 5], mat: 'ashlar' });
  } else {
    P.push({ type: 'box', s: [2.5, 0.18, 1.2], p: [0, 0.99, 0], mat: 'ashlar' });
    P.push({ type: 'box', s: [1.6, 0.2, 0.4], p: [-0.1, 1.18, 0], mat: 'ashlar' });
    P.push({ type: 'box', s: [0.28, 0.28, 0.28], p: [0.84, 1.22, 0], mat: 'ashlar' });
  }
  return P;
}
function tombRubble(s, rng) {
  const P = [
    { type: 'box', s: [2.6, 0.15, 1.24], p: [0, 0.075, 0], mat: 'ashlar' },
    // el arranque de las paredes, mellado
    { type: 'box', s: [2.3, 0.28, 0.14], p: [0, 0.29, 0.48], r: [rng.range(-4, 4), 0, rng.range(-3, 3)], mat: 'ashlar' },
    { type: 'box', s: [1.4, 0.4, 0.14], p: [-0.4, 0.35, -0.48], r: [rng.range(-4, 4), 0, rng.range(-6, 6)], mat: 'ashlar' },
    { type: 'box', s: [0.14, 0.5, 1.0], p: [1.12, 0.4, 0], r: [rng.range(-5, 5), 0, 8], mat: 'ashlar' },
    // la losa, partida en dos y caída a un lado
    { type: 'box', s: [1.3, 0.18, 1.2], p: [-0.7, 0.2, 1.3], r: [rng.range(10, 25), rng.range(-20, 20), rng.range(-8, 8)], mat: 'ashlar' },
    { type: 'box', s: [1.1, 0.18, 1.2], p: [0.8, 0.12, -1.35], r: [rng.range(-20, -8), rng.range(-30, 30), 0], mat: 'ashlar' },
  ];
  for (let i = 0; i < 12; i++) P.push({ type: 'box', s: [rng.range(0.15, 0.4), rng.range(0.1, 0.25), rng.range(0.15, 0.35)], p: [rng.range(-1.8, 1.8), 0.1, rng.range(-1.3, 1.3)], r: [rng.range(-30, 30), rng.range(0, 180), rng.range(-30, 30)], mat: 'ashlar' });
  // lo que había dentro
  for (let i = 0; i < 9; i++) {
    const sk = i < 2;
    P.push(sk ? { type: 'sphere', s: [0.11, 0.1, 0.13], p: [rng.range(-0.9, 0.9), 0.1, rng.range(-0.3, 0.3)], seg: 6, seg2: 4, mat: 'bone' } : { type: 'box', s: [0.05, 0.05, rng.range(0.25, 0.45)], p: [rng.range(-1, 1), 0.18, rng.range(-0.35, 0.35)], r: [0, rng.range(0, 180), 0], mat: 'bone' });
  }
  return P;
}
// santo velado sobre su pedestal
function statueParts() {
  const y = 0.7;
  return [
    { type: 'box', s: [1.1, y, 1.1], p: [0, y / 2, 0], mat: 'ashlar' },
    { type: 'cyl', s: [0.28, 0.45, 1.5], p: [0, y + 0.75, 0], seg: 8, mat: 'ashlar' },
    { type: 'cyl', s: [0.2, 0.28, 0.35], p: [0, y + 1.675, 0], seg: 8, mat: 'ashlar' },
    { type: 'cyl', s: [0.14, 0.42, 0.95], p: [0, y + 1.675, 0], seg: 8, mat: 'clothWhite' },
    { type: 'cyl', s: [0.42, 0.5, 0.9], p: [0, y + 0.75, 0], seg: 8, open: true, mat: 'clothWhite' },
    { type: 'box', s: [0.2, 0.25, 0.15], p: [0, y + 1.12, 0.32], mat: 'ashlar' },
  ];
}
function statueRubble(s, rng) {
  const y = 0.7;
  const a = rng.range(0, 360);
  const P = [{ type: 'box', s: [1.1, y, 1.1], p: [0, y / 2, 0], mat: 'ashlar' }];
  // el santo, caído y partido
  P.push({ type: 'cyl', s: [0.3, 0.45, 1.0], p: [0.9, 0.35, 0.4], r: [90, a, 0], seg: 8, mat: 'ashlar' });
  P.push({ type: 'cyl', s: [0.14, 0.42, 0.7], p: [1.7, 0.3, 0.9], r: [80, a + 20, 0], seg: 8, mat: 'clothWhite' });
  P.push({ type: 'cyl', s: [0.2, 0.28, 0.35], p: [2.1, 0.2, 1.1], r: [70, a, 30], seg: 8, mat: 'ashlar' });
  for (let i = 0; i < 8; i++) P.push({ type: 'box', s: [rng.range(0.1, 0.3), rng.range(0.08, 0.2), rng.range(0.1, 0.3)], p: [rng.range(-1.2, 1.6), 0.08, rng.range(-1.2, 1.4)], r: [rng.range(-30, 30), rng.range(0, 180), rng.range(-30, 30)], mat: 'ashlar' });
  return P;
}
function wallParts(s, rng) {
  const P = [];
  const T = s.hx * 2,
    L = s.hz * 2,
    H = s.h;
  // ladrillo sobre ladrillo, sin argamasa apenas; arriba falta alguno (se ve
  // la luz de la cisterna)
  let row = 0;
  for (let y = 0; y < H - 0.01; y += 0.2, row++) {
    const off = row % 2 ? 0.15 : 0;
    for (let z = -L / 2 - off; z < L / 2 - 0.01; z += 0.3) {
      const z0 = Math.max(-L / 2, z),
        z1 = Math.min(L / 2, z + 0.3);
      if (z1 - z0 < 0.05) continue;
      if (y > H - 0.9 && Math.abs((z0 + z1) / 2 - 0.3) < 0.35 && rng.chance(0.7)) continue;
      P.push({ type: 'box', s: [T - rng.range(0, 0.08), 0.18, z1 - z0 - 0.02], p: [rng.range(-0.03, 0.03), y + 0.1, (z0 + z1) / 2], r: [rng.range(-2, 2), 0, rng.range(-2, 2)], mat: 'wallstone' });
    }
  }
  return P;
}
function wallRubble(s, rng) {
  const P = [];
  const L = s.hz * 2,
    H = s.h;
  // queda el remate de arriba y un montón de ladrillos a los dos lados
  for (let z = -L / 2; z < L / 2 - 0.01; z += 0.3) P.push({ type: 'box', s: [s.hx * 2, 0.18, 0.28], p: [0, H - 0.1 - rng.range(0, 0.25), z + 0.15], mat: 'wallstone' });
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    P.push({ type: 'box', s: [0.28, 0.16, 0.18], p: [side * rng.range(0.2, 1.8), rng.range(0.06, 0.3), rng.range(-L / 2, L / 2)], r: [rng.range(-30, 30), rng.range(0, 180), rng.range(-30, 30)], mat: 'wallstone' });
  }
  return P;
}
// almena (hx: medio ancho a lo largo del muro, hz: medio grueso; s.out: hacia
// dónde cae, fuera del adarve)
function merlonParts(s, rng) {
  const W = s.hx * 2,
    T = s.hz * 2,
    H = s.h;
  return [
    { type: 'box', s: [W - 0.02, H - 0.08, T - 0.02], p: [rng.range(-0.01, 0.01), (H - 0.08) / 2, 0], r: [0, rng.range(-1.5, 1.5), 0], mat: 'wallstone' },
    { type: 'box', s: [W + 0.04, 0.1, T + 0.04], p: [0, H - 0.05, 0], mat: 'wallstone' },
  ];
}
function merlonRubble(s, rng) {
  const W = s.hx * 2,
    T = s.hz * 2;
  const P = [{ type: 'box', s: [W - 0.04, rng.range(0.18, 0.4), T - 0.04], p: [0, 0.12, 0], r: [rng.range(-5, 5), rng.range(-6, 6), rng.range(-5, 5)], mat: 'wallstone' }];
  // unos sillares caídos por dentro del adarve (los demás, al vacío)
  const ix = -(s.out ? s.out[0] : 0),
    iz = -(s.out ? s.out[1] : 0);
  for (let i = 0; i < 4; i++) {
    const d = rng.range(0.5, 1.5);
    P.push({ type: 'box', s: [rng.range(0.2, 0.36), rng.range(0.13, 0.22), rng.range(0.18, 0.3)], p: [ix * d + rng.range(-W * 0.6, W * 0.6), 0.09, iz * d + rng.range(-0.3, 0.3)], r: [rng.range(-20, 20), rng.range(0, 180), rng.range(-20, 20)], mat: 'wallstone' });
  }
  return P;
}
// el torno del rastrillo del Postigo (el madero a lo largo de x)
function winchParts() {
  const P = [];
  for (const x of [-1.75, 1.75]) {
    P.push({ type: 'box', s: [0.5, 1.6, 0.42], p: [x, 0.8, 0], mat: 'wooddark' });
    P.push({ type: 'box', s: [0.66, 0.12, 0.6], p: [x, 0.06, 0], mat: 'wooddark' });
    P.push({ type: 'box', s: [0.06, 1.1, 0.5], p: [x + (x < 0 ? -0.28 : 0.28), 0.62, 0], r: [0, 0, x < 0 ? 18 : -18], mat: 'wooddark' });
    P.push({ type: 'cyl', s: [0.17, 0.17, 0.14], p: [x, 1.3, 0], r: [0, 0, 90], seg: 8, mat: 'iron' });
  }
  P.push({ type: 'cyl', s: [0.33, 0.33, 3.2], p: [0, 1.3, 0], r: [0, 0, 90], seg: 8, mat: 'wooddark' });
  for (const x of [-1.15, 0, 1.15]) P.push({ type: 'cyl', s: [0.35, 0.35, 0.08], p: [x, 1.3, 0], r: [0, 0, 90], seg: 8, mat: 'iron' });
  // la cadena enrollada y la que baja por el hueco hacia el rastrillo
  for (let i = 0; i < 6; i++) P.push({ type: 'torus', s: [0.36, 0.028], p: [-0.55 + i * 0.075, 1.3, 0], r: [0, 90, 0], seg: 10, seg2: 3, mat: 'iron' });
  for (let i = 0; i < 12; i++) P.push({ type: 'torus', s: [0.052, 0.016], p: [-0.3 + (i % 2) * 0.03, 1.02 - i * 0.085, 0.3], r: [0, i % 2 ? 90 : 0, 0], seg: 6, seg2: 3, mat: 'iron' });
  P.push({ type: 'box', s: [0.5, 0.04, 0.5], p: [-0.3, 0.01, 0.32], mat: 'black' });
  // rueda de trinquete, uña y el encaje vacío de la manivela
  P.push({ type: 'cyl', s: [0.5, 0.5, 0.08], p: [2.1, 1.3, 0], r: [0, 0, 90], seg: 12, mat: 'iron' });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    P.push({ type: 'box', s: [0.08, 0.1, 0.06], p: [2.1, 1.3 + Math.sin(a) * 0.52, Math.cos(a) * 0.52], r: [(a * 180) / Math.PI, 0, 0], mat: 'iron' });
  }
  P.push({ type: 'box', s: [0.06, 0.5, 0.08], p: [2.17, 1.64, 0.12], r: [22, 0, 0], mat: 'iron' });
  P.push({ type: 'box', s: [0.15, 0.15, 0.15], p: [2.23, 1.3, 0], mat: 'iron' });
  return P;
}
function winchRubble(s, rng) {
  const P = [];
  for (const x of [-1.75, 1.75]) {
    P.push({ type: 'box', s: [0.5, rng.range(0.35, 0.6), 0.42], p: [x, 0.25, 0], r: [rng.range(-6, 6), 0, rng.range(-8, 8)], mat: 'wooddark' });
    P.push({ type: 'box', s: [0.66, 0.12, 0.6], p: [x, 0.06, 0], mat: 'wooddark' });
    P.push({ type: 'box', s: [0.42, 0.9, 0.36], p: [x + rng.range(-0.9, 0.9), 0.2, rng.range(0.7, 1.3)], r: [86, rng.range(0, 180), 0], mat: 'wooddark' });
  }
  // el madero, en el suelo y rodado
  P.push({ type: 'cyl', s: [0.33, 0.33, 3.2], p: [0.3, 0.33, 1.1], r: [0, rng.range(-12, 12), 90], seg: 8, mat: 'wooddark' });
  for (const x of [-0.85, 0.3, 1.45]) P.push({ type: 'cyl', s: [0.35, 0.35, 0.08], p: [x, 0.33, 1.1], r: [0, 0, 90], seg: 8, mat: 'iron' });
  P.push({ type: 'cyl', s: [0.5, 0.5, 0.08], p: [2.4, 0.05, -0.6], r: [0, 0, 4], seg: 12, mat: 'iron' });
  for (let i = 0; i < 14; i++) P.push({ type: 'torus', s: [0.052, 0.016], p: [rng.range(-1.5, 1.5), 0.02, rng.range(-0.6, 0.9)], r: [90, rng.range(0, 180), 0], seg: 6, seg2: 3, mat: 'iron' });
  for (let i = 0; i < 8; i++) P.push({ type: 'box', s: [0.06, 0.04, rng.range(0.3, 0.8)], p: [rng.range(-2, 2), 0.03, rng.range(-1, 1.4)], r: [0, rng.range(0, 180), 0], mat: 'wooddark' });
  P.push({ type: 'box', s: [0.5, 0.04, 0.5], p: [-0.3, 0.01, 0.32], mat: 'black' });
  return P;
}
// barricada atravesada en el adarve: vigas cruzadas, tablones, sacos,
// piedras, una rueda de carro y estacas
function barricadeParts(s, rng) {
  const W = s.hx * 2,
    H = s.h;
  const P = [];
  P.push({ type: 'box', s: [W * 1.04, 0.28, 0.28], p: [0, 1.15, 0.12], r: [0, 0, 21], mat: 'wooddark' });
  P.push({ type: 'box', s: [W * 1.04, 0.28, 0.28], p: [0, 1.05, -0.08], r: [0, 0, -19], mat: 'wooddark' });
  P.push({ type: 'box', s: [W * 0.98, 0.22, 0.22], p: [0, 0.55, 0.22], r: [0, 2, 3], mat: 'wooddark' });
  for (let i = 0; i < 10; i++) {
    const h = H * rng.range(0.72, 1.0);
    P.push({ type: 'box', s: [0.32, h, 0.07], p: [-W / 2 + 0.25 + (i * (W - 0.5)) / 9, h / 2, 0.3 + rng.range(-0.05, 0.05)], r: [rng.range(-7, 7), rng.range(-6, 6), rng.range(-9, 9)], mat: 'planks' });
  }
  for (let i = 0; i < 7; i++) P.push({ type: 'sphere', s: [0.38, 0.22, 0.27], p: [-W / 2 + 0.32 + (i * (W - 0.64)) / 6, 0.2 + (i % 2) * 0.06, -0.26], r: [0, rng.range(0, 180), 0], seg: 7, seg2: 5, mat: 'burlap' });
  for (let i = 0; i < 4; i++) P.push({ type: 'sphere', s: [0.36, 0.2, 0.26], p: [-W / 2 + 0.6 + i * 0.95, 0.58, -0.24], r: [0, rng.range(0, 180), 0], seg: 7, seg2: 5, mat: 'burlap' });
  for (let i = 0; i < 6; i++) P.push({ type: 'box', s: [rng.range(0.3, 0.5), rng.range(0.25, 0.4), rng.range(0.3, 0.45)], p: [rng.range(-W / 2 + 0.3, W / 2 - 0.3), 0.18, rng.range(-0.5, -0.1)], r: [rng.range(-10, 10), rng.range(0, 90), 0], mat: 'wallstone' });
  P.push({ type: 'torus', s: [0.55, 0.07], p: [W * 0.24, 0.78, 0.42], r: [0, 0, 0], seg: 12, seg2: 4, mat: 'wooddark' });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI;
    P.push({ type: 'box', s: [0.05, 1.0, 0.05], p: [W * 0.24 + Math.cos(a) * 0.0, 0.78, 0.42], r: [0, 0, (a * 180) / Math.PI], mat: 'wooddark' });
  }
  // estacas hacia fuera (hacia el adarve norte, por donde venían)
  for (let i = 0; i < 4; i++) P.push({ type: 'cone', s: [0.06, 0.6], p: [-W / 2 + 0.6 + i * 0.95, 1.45, -0.5], r: [-70, 0, 0], seg: 4, mat: 'wooddark' });
  return P;
}
function barricadeRubble(s, rng) {
  const W = s.hx * 2;
  const P = [];
  // la mayoría sale hacia el norte (el golpe viene de la torre)
  for (let i = 0; i < 9; i++) P.push({ type: 'box', s: [0.32, 0.07, rng.range(1.0, 2.0)], p: [rng.range(-W / 2, W / 2), 0.04 + i * 0.01, rng.range(-3.4, 0.4)], r: [rng.range(-8, 8), rng.range(-50, 50), rng.range(-6, 6)], mat: 'planks' });
  for (let i = 0; i < 3; i++) P.push({ type: 'box', s: [0.28, 0.28, rng.range(2.2, 3.4)], p: [rng.range(-1.2, 1.2), 0.14 + i * 0.28, rng.range(-3.6, -1.2)], r: [0, rng.range(-70, 70), rng.range(-6, 6)], mat: 'wooddark' });
  for (let i = 0; i < 6; i++) P.push({ type: 'sphere', s: [0.4, 0.08, 0.3], p: [rng.range(-W / 2, W / 2), 0.05, rng.range(-1.6, 0.6)], r: [0, rng.range(0, 180), 0], seg: 7, seg2: 4, mat: 'burlap' });
  for (let i = 0; i < 7; i++) P.push({ type: 'box', s: [rng.range(0.25, 0.45), rng.range(0.2, 0.35), rng.range(0.25, 0.4)], p: [rng.range(-W / 2, W / 2), 0.13, rng.range(-2.8, 0.6)], r: [rng.range(-25, 25), rng.range(0, 180), rng.range(-25, 25)], mat: 'wallstone' });
  P.push({ type: 'torus', s: [0.55, 0.07], p: [-0.8, 0.07, -2.4], r: [90, 0, 0], seg: 12, seg2: 4, mat: 'wooddark' });
  puddle(P, rng, 0.2, -1, 1.4, 'straw');
  return P;
}
// barril de pez de los defensores (en pie)
function barrelParts(s) {
  const R = s.hx,
    H = s.h;
  return [
    { type: 'cyl', s: [R * 0.9, R * 0.9, H], p: [0, H / 2, 0], seg: 10, mat: 'planks' },
    { type: 'cyl', s: [R, R, H * 0.5], p: [0, H / 2, 0], seg: 10, mat: 'planks' },
    ...[0.1, 0.36, 0.64, 0.9].map((u) => ({ type: 'cyl', s: [R * 0.95 + 0.012, R * 0.95 + 0.012, 0.05], p: [0, H * u, 0], seg: 10, mat: 'iron' })),
    { type: 'cyl', s: [R * 0.84, R * 0.84, 0.02], p: [0, H + 0.005, 0], seg: 10, mat: 'wooddark' },
  ];
}
function barrelRubble(s, rng) {
  const R = s.hx;
  const P = [];
  for (let i = 0; i < 10; i++) P.push({ type: 'box', s: [0.12, 0.025, rng.range(0.5, 0.9)], p: [rng.range(-0.9, 0.9), 0.02 + i * 0.005, rng.range(-0.9, 0.9)], r: [0, rng.range(0, 180), 0], mat: 'planks' });
  for (let i = 0; i < 3; i++) P.push({ type: 'torus', s: [R * rng.range(0.85, 1), 0.022], p: [rng.range(-0.6, 0.6), 0.03 + i * 0.02, rng.range(-0.6, 0.6)], r: [90 + rng.range(-10, 10), 0, rng.range(0, 180)], seg: 12, seg2: 3, mat: 'iron' });
  puddle(P, rng, 0, 0, 1.0, 'black');
  return P;
}
function crateParts(s) {
  const W = s.hx * 2,
    D = s.hz * 2,
    H = s.h;
  const P = [{ type: 'box', s: [W - 0.04, H - 0.04, D - 0.04], p: [0, H / 2, 0], mat: 'planks' }];
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    P.push({ type: 'box', s: [0.07, H, 0.07], p: [(x * (W - 0.07)) / 2, H / 2, (z * (D - 0.07)) / 2], mat: 'wooddark' });
  for (const y of [0.04, H - 0.04]) {
    P.push({ type: 'box', s: [W, 0.07, 0.07], p: [0, y, D / 2 - 0.035], mat: 'wooddark' });
    P.push({ type: 'box', s: [W, 0.07, 0.07], p: [0, y, -D / 2 + 0.035], mat: 'wooddark' });
  }
  return P;
}
function crateRubble(s, rng) {
  const P = [];
  for (let i = 0; i < 9; i++) P.push({ type: 'box', s: [rng.range(0.4, 0.9), 0.025, 0.14], p: [rng.range(-0.8, 0.8), 0.02 + i * 0.006, rng.range(-0.8, 0.8)], r: [0, rng.range(0, 180), 0], mat: i % 3 ? 'planks' : 'wooddark' });
  return P;
}
const MODELS = {
  merlon: [merlonParts, merlonRubble],
  winch: [winchParts, winchRubble],
  barricade: [barricadeParts, barricadeRubble],
  barrel: [barrelParts, barrelRubble],
  crate: [crateParts, crateRubble],
  pillar: [pillarParts, pillarRubble],
  rack: [rackParts, rackRubble],
  wall: [wallParts, wallRubble],
  cask: [caskParts, caskRubble],
  sacks: [sacksParts, sacksRubble],
  tomb: [tombParts, tombRubble],
  statue: [statueParts, statueRubble],
};

// ------------------------------------------------------------ sistema
const _geoChunk = new THREE.BoxGeometry(1, 1, 1);

export class Breakables {
  constructor(game, specs) {
    this.g = game;
    this.list = [];
    this.chunks = [];
    for (const s of specs) this.create(s);
  }

  create(s) {
    const g = this.g;
    const rng = new RNG(Math.round(s.x * 131 + s.z * 17));
    const zn = g.zoneAt({ x: s.x, y: s.y + 1, z: s.z });
    const rid = zn && zn.room ? g.level.ctx.wb.roomId(zn.room) : s.room ? g.level.ctx.wb.roomId(s.room) : 0;
    const pr = g.probe.sample(s.x, s.y + 1.2, s.z, rid);
    const cache = new Map();
    const mats = (name) => {
      if (!cache.has(name)) {
        const m = cloneMat(objMat(name));
        const t = MAT_TINT[name] || [1, 1, 1];
        m.color.setRGB(t[0], t[1], t[2]);
        m._u.uProbe.value.set(pr[0], pr[1], pr[2]);
        m._u.uGround.value.set(s.y, 0.34);
        cache.set(name, m);
      }
      return cache.get(name);
    };
    const [mk, rb] = MODELS[s.kind];
    // hp: golpes del jugador (sólo la madera y los sacos); crash: choques
    // del Descoyuntado que aguanta (un pilar se agrieta al primero)
    const K = KIND[s.kind];
    const it = { ...s, K, light: !!K.light, stone: !!K.stone, broken: false, hp: K.hp, crash: K.crash };
    it.obj = build(mk(s, rng), mats);
    it.rubble = build(rb(s, rng), mats);
    for (const o of [it.obj, it.rubble]) {
      o.position.set(s.x, s.y, s.z);
      o.rotation.y = s.rot || 0;
      g.scene.add(o);
    }
    it.rubble.visible = false;
    it.mats = [...cache.values()];
    it.box = g.world.col.add(s.x - s.hx, s.y, s.z - s.hz, s.x + s.hx, s.y + s.h, s.z + s.hz, 'breakable');
    it.box.brk = it;
    this.list.push(it);
    return it;
  }

  get(id) {
    return this.list.find((b) => b.id === id);
  }

  // Estado guardado (con reset: todo entero otra vez).
  applyFlags(flags, reset = false) {
    for (const it of this.list) {
      if (reset && it.broken) this.restore(it);
      if (flags['broken:' + it.id] && !it.broken) this.shatter(it, null, true);
    }
    if (reset) this.clearChunks();
  }

  restore(it) {
    it.broken = false;
    it.hp = it.K.hp;
    it.crash = it.K.crash;
    it.obj.rotation.set(0, it.rot || 0, 0);
    it.obj.visible = true;
    it.rubble.visible = false;
    it.box.enabled = true;
    this.refreshNav(it);
  }

  refreshNav(it) {
    const n = this.g.navCellar;
    const r = Math.max(it.hx, it.hz) + 1.5;
    if (n) n.refresh(it.x - r, it.z - r, it.x + r, it.z + r);
  }

  // La rompe. from: {x, z} desde donde viene el golpe (los cascotes salen
  // despedidos hacia el otro lado).
  shatter(it, from = null, instant = false) {
    if (it.broken) return;
    const g = this.g;
    it.broken = true;
    it.box.enabled = false;
    it.obj.visible = false;
    it.rubble.visible = true;
    this.refreshNav(it);
    if (instant) return;
    g.flags['broken:' + it.id] = true;
    let dx = 0,
      dz = 0;
    if (from) {
      dx = it.x - from.x;
      dz = it.z - from.z;
      const d = Math.hypot(dx, dz) || 1;
      dx /= d;
      dz /= d;
    }
    const stone = it.stone;
    const col = stone ? [0.34, 0.32, 0.29] : it.K.soft ? [0.42, 0.36, 0.26] : [0.2, 0.13, 0.08];
    // las almenas caen al vacío, por fuera del adarve
    if (it.out && !from) {
      dx = it.out[0];
      dz = it.out[1];
    }
    const H = it.h;
    for (let k = 0; k < 4; k++) g.fx.blood.emit(it.x, it.y + 0.4 + (k * H) / 4, it.z, 22, { color: col, speed: 6, life: 1.1, up: 2, dir: { x: dx, z: dz } });
    g.fx.blood.emit(it.x, it.y + 0.3, it.z, 40, { color: [0.3, 0.28, 0.26], speed: 3, life: 1.8, up: 0.6, gravity: 1.5 }); // polvo
    if (it.K.wine) g.fx.blood.emit(it.x, it.y + Math.min(1, H * 0.5), it.z, 30, { color: [0.28, 0.05, 0.08], speed: 5, life: 0.8, up: 1.4 }); // vino
    if (it.K.soft) g.fx.blood.emit(it.x, it.y + 0.5, it.z, 40, { color: [0.62, 0.55, 0.36], speed: 3.5, life: 1.2, up: 1.6, gravity: 5 }); // grano
    if (it.K.pitch) g.fx.blood.emit(it.x, it.y + 0.6, it.z, 34, { color: [0.05, 0.04, 0.04], speed: 4, life: 0.9, up: 1.6 }); // pez
    // cascotes
    const mat = it.mats[0];
    const n = it.K.chunks;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(_geoChunk, i % 3 === 0 && it.mats[1] ? it.mats[1] : mat);
      const s = stone ? 0.18 + Math.random() * 0.3 : 0.1 + Math.random() * 0.2;
      m.scale.set(s * (stone ? 1.3 : 0.6), s * 0.7, s * (stone ? 1 : 3));
      const y = it.y + 0.3 + Math.random() * H * 0.85;
      m.position.set(it.x + (Math.random() - 0.5) * it.hx * 2, y, it.z + (Math.random() - 0.5) * it.hz * 2);
      g.scene.add(m);
      const sp = 2 + Math.random() * 5;
      this.chunks.push({
        m,
        v: new THREE.Vector3(dx * sp + (Math.random() - 0.5) * 3, Math.random() * 3, dz * sp + (Math.random() - 0.5) * 3),
        w: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12),
        rest: false,
        s: s * 0.35,
      });
    }
    if (this.chunks.length > 90) {
      for (const c of this.chunks.splice(0, this.chunks.length - 90)) g.scene.remove(c.m);
    }
    g.audio && g.audio.play(it.K.snd, { x: it.x, y: it.y + 1, z: it.z });
    g.camRig.shake(stone ? 0.65 : 0.3);
    g.hitstop = Math.max(g.hitstop, 0.06);
    g.input.rumble(0.8, 0.8, 260);
    g.onBreak && g.onBreak(it);
    g.saveGame();
  }

  // Algo muy pesado se estrella contra ella: la rompe o (un pilar) la agrieta.
  crashInto(it, from) {
    const g = this.g;
    if (it.broken) return true;
    it.crash--;
    if (it.crash <= 0) {
      this.shatter(it, from);
      return true;
    }
    // se agrieta y se ladea un poco; cae polvo y cruje la piedra
    const dx = it.x - from.x,
      dz = it.z - from.z;
    const d = Math.hypot(dx, dz) || 1;
    it.obj.rotation.x += (dz / d) * 0.035;
    it.obj.rotation.z -= (dx / d) * 0.035;
    for (let k = 0; k < 3; k++) g.fx.blood.emit(it.x, it.y + 1 + k * 1.3, it.z, 16, { color: [0.34, 0.32, 0.29], speed: 2.5, life: 1.4, up: 0.3, gravity: 3 });
    g.audio && g.audio.play('stoneCreak', { x: it.x, y: it.y + 2, z: it.z });
    g.camRig.shake(0.4);
    return false;
  }

  clearChunks() {
    for (const c of this.chunks) this.g.scene.remove(c.m);
    this.chunks.length = 0;
  }

  // El arma del jugador: los estantes ceden a golpes; la piedra, no.
  playerSwing(player, atk) {
    const g = this.g;
    for (const it of this.list) {
      if (it.broken || player.hitSet.has(it)) continue;
      const dx = it.x - player.pos.x,
        dz = it.z - player.pos.z;
      // distancia a la caja, no al centro
      const qx = Math.max(Math.abs(dx) - it.hx, 0),
        qz = Math.max(Math.abs(dz) - it.hz, 0);
      const d = Math.hypot(qx, qz);
      if (d > atk.range * 0.85 || Math.abs(it.y - player.pos.y) > 1.5) continue;
      const cx = Math.max(it.x - it.hx, Math.min(player.pos.x, it.x + it.hx)),
        cz = Math.max(it.z - it.hz, Math.min(player.pos.z, it.z + it.hz));
      const ang = Math.abs(angleDiff(player.yaw, Math.atan2(cx - player.pos.x, cz - player.pos.z)));
      if (d > 0.5 && ang > atk.arc * 0.5 * DEG) continue;
      player.hitSet.add(it);
      const hx = cx,
        hy = player.pos.y + 1.1,
        hz = cz;
      if (it.K.wood && !it.light) {
        // el torno y la barricada: madera maciza (no ceden a la espada)
        g.fx.blood.emit(hx, hy, hz, 12, { color: [0.22, 0.14, 0.08], speed: 3, life: 0.5, up: 1.2 });
        g.audio && g.audio.play('woodHit', { x: hx, y: hy, z: hz });
        g.hitstop = Math.max(g.hitstop, 0.07);
        g.camRig.shake(0.12);
        player.useSt(8);
      } else if (it.light) {
        it.hp -= atk.heavy ? 2 : 1;
        g.fx.blood.emit(hx, hy, hz, 14, { color: [0.22, 0.14, 0.08], speed: 4, life: 0.6, up: 1.4 });
        g.audio && g.audio.play('woodHit', { x: hx, y: hy, z: hz });
        g.hitstop = Math.max(g.hitstop, 0.05);
        g.camRig.shake(0.12);
        if (it.hp <= 0) this.shatter(it, player.pos);
      } else {
        g.fx.blood.emit(hx, hy, hz, 12, { color: [0.9, 0.7, 0.4], speed: 5, life: 0.3, up: 1.2 });
        g.fx.blood.emit(hx, hy, hz, 10, { color: [0.32, 0.3, 0.28], speed: 2, life: 0.9, up: 0.5, gravity: 2 });
        g.audio && g.audio.play('clang', { x: hx, y: hy, z: hz });
        g.hitstop = Math.max(g.hitstop, 0.08);
        g.camRig.shake(0.15);
        player.useSt(10);
      }
    }
  }

  // Rompible que corta el segmento a->b (quién se escuda tras qué).
  between(ax, az, bx, bz, y) {
    const col = this.g.world.col;
    const dx = bx - ax,
      dz = bz - az;
    const d = Math.hypot(dx, dz);
    if (d < 0.01) return null;
    let best = null,
      bt = Infinity;
    for (const it of this.list) {
      if (it.broken || it.heavyOnly) continue;
      if (Math.abs(y - it.y) > 3) continue;
      // (a media altura: también los sepulcros, los toneles y los sacos)
      const t = col.raycast(ax, y + 0.7, az, dx / d, 0, dz / d, d, (b) => b === it.box);
      if (t < bt) {
        bt = t;
        best = it;
      }
    }
    return best;
  }

  // Lo de madera o de saco que quede a menos de r de (x, z): lo arrasa (un
  // barrido, una onda, él al pasar). Devuelve cuántas.
  smashAround(x, z, r, y, from = null) {
    let n = 0;
    for (const it of this.list) {
      if (it.broken || !it.light || Math.abs(y - it.y) > 2) continue;
      const qx = Math.max(Math.abs(x - it.x) - it.hx, 0),
        qz = Math.max(Math.abs(z - it.z) - it.hz, 0);
      if (Math.hypot(qx, qz) > r) continue;
      this.shatter(it, from || { x, z });
      n++;
    }
    return n;
  }
  // Distancia de (x, z) al borde de la caja de una.
  edgeDist(it, x, z) {
    return Math.hypot(Math.max(Math.abs(x - it.x) - it.hx, 0), Math.max(Math.abs(z - it.z) - it.hz, 0));
  }
  // La que tenga más cerca delante (dirección fx, fz), a menos de maxD.
  ahead(x, z, fx, fz, maxD, y) {
    let best = null,
      bd = maxD;
    for (const it of this.list) {
      if (it.broken || Math.abs(y - it.y) > 2) continue;
      const d = this.edgeDist(it, x, z);
      if (d > bd) continue;
      const dx = it.x - x,
        dz = it.z - z;
      const l = Math.hypot(dx, dz) || 1;
      if ((dx * fx + dz * fz) / l < 0.2 && d > 0.3) continue;
      bd = d;
      best = it;
    }
    return best;
  }

  // Rompible en contacto con un círculo (x, z, r) delante de la dirección
  // (fx, fz): contra qué se ha estrellado algo.
  contact(x, z, r, fx, fz, y) {
    for (const it of this.list) {
      if (it.broken || Math.abs(y - it.y) > 2) continue;
      const qx = Math.max(Math.abs(x - it.x) - it.hx, 0),
        qz = Math.max(Math.abs(z - it.z) - it.hz, 0);
      if (Math.hypot(qx, qz) > r) continue;
      const cx = Math.max(it.x - it.hx, Math.min(x, it.x + it.hx)) - x,
        cz = Math.max(it.z - it.hz, Math.min(z, it.z + it.hz)) - z;
      const cl = Math.hypot(cx, cz);
      if (cl > 0.05 && (cx * fx + cz * fz) / cl < 0.35) continue;
      return it;
    }
    return null;
  }

  update(dt) {
    const col = this.g.world.col;
    for (const c of this.chunks) {
      if (c.rest) continue;
      c.v.y -= 18 * dt;
      c.m.position.addScaledVector(c.v, dt);
      c.m.rotation.x += c.w.x * dt;
      c.m.rotation.y += c.w.y * dt;
      c.m.rotation.z += c.w.z * dt;
      const p = c.m.position;
      const gy = col.groundHeight(p.x, p.z, 0.05, p.y + 0.5) + c.s;
      if (p.y < gy) {
        p.y = gy;
        if (Math.abs(c.v.y) < 1.2) {
          c.v.set(0, 0, 0);
          c.rest = true;
        } else {
          c.v.y *= -0.3;
          c.v.x *= 0.5;
          c.v.z *= 0.5;
          c.w.multiplyScalar(0.5);
        }
      }
      // los muros los paran
      if (col.raycast(p.x, p.y, p.z, Math.sign(c.v.x) || 1, 0, 0, 0.12, (b) => b.tag === 'block') !== Infinity) c.v.x *= -0.3;
      if (col.raycast(p.x, p.y, p.z, 0, 0, Math.sign(c.v.z) || 1, 0.12, (b) => b.tag === 'block') !== Infinity) c.v.z *= -0.3;
    }
  }
}
