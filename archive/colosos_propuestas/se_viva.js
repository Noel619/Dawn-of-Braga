// PLAN C, verdadera forma: LA SÉ (48 m de alto, 85 de pata a pata).
//
// Cuando la Procesión se enrosca y revienta contra el pórtico, la catedral
// se levanta. Lo que había debajo (lo que los fieles alimentaron rezando dos
// días) la lleva a cuestas como un cangrejo ermitaño su concha: una panza de
// carne que la arranca de sus cimientos y seis patas de araña, de carne con
// los fustes de las columnas de la nave por huesos y las basas por pies. El
// rosetón es un ojo; el pórtico, una boca con las hojas de la puerta por
// mandíbulas; por las vidrieras rebosa la carne y salen brazos; por la
// cumbrera del tejado asoman las vértebras y en los campanarios las campanas
// cuelgan como lenguas. Dentro, sobre el altar, late el corazón.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Sculpt, ColossusModel, tubeGeo, hardGeo, V } from './sculpt_v1.js';
import { ColFX } from './colfx_v1.js';
import { colMat } from '../../src/gfx/materials.js';
import { RNG } from '../../src/core/util.js';

const DEG = Math.PI / 180;
// la catedral en el espacio del modelo: fachada en +z, cabecera en -z
export const SE = { Y: 17, x: 13, zF: 26, zB: -26, wall: 14, ridge: 20, tower: 24, tw: 8 };
// patas: hombro (en el costado de la panza), rodilla (alta) y pie
const LEGS = [];
for (const s of [1, -1])
  for (const [z, kz, fz, spread] of [
    [16, 24, 32, 1.0],
    [0, 2, 3, 1.12],
    [-16, -24, -30, 1.0],
  ])
    LEGS.push({ s: [s * 12.5, 15.5, z], k: [s * 27 * spread, 33, kz], f: [s * 36 * spread, 0.6, fz] });

function bonesDef() {
  const B = [
    { name: 'root', pos: [0, 0, 0] },
    { name: 'body', parent: 'root', pos: [0, 15, 0] },
    { name: 'church', parent: 'body', pos: [0, SE.Y, 0] },
    { name: 'mouth', parent: 'body', pos: [0, 15.5, 27] },
  ];
  LEGS.forEach((l, i) => {
    B.push({ name: `g${i}a`, parent: 'body', pos: l.s });
    B.push({ name: `g${i}b`, parent: `g${i}a`, pos: l.k });
    B.push({ name: `g${i}c`, parent: `g${i}b`, pos: l.f });
  });
  return B;
}

export function buildSeViva(o = {}) {
  const M = new ColossusModel(bonesDef());
  const rng = new RNG(o.seed || 51);
  const H = [];
  const tube = (bone, mat, pts, radii, opt = {}) => H.push({ bone, mat, geo: tubeGeo(pts.map((p) => (p.isVector3 ? p : V(...p))), radii, opt) });
  const box = (bone, mat, s, p, r = [0, 0, 0], opt = {}) => H.push({ bone, mat, ds: !!opt.ds, geo: hardGeo({ type: 'box', s, p, r, mat, ...opt }) });
  const { Y, x: W, zF, zB, wall, ridge, tower, tw } = SE;

  // ======================================================================= la carne
  const sc = new Sculpt({
    cell: o.cell || 0.62,
    bones: M.index,
    noise: { amp: 0.3, freq: 0.2, oct: 3, lump: 0.9, lumpFreq: 0.06, vein: 0.3, veinFreq: 0.12 },
    aoDist: 6,
    aoStrength: 1.2,
    matNoise: 0.6,
    matFreq: 0.15,
    macro: [{ freq: 0.05, color: [0.66, 0.46, 0.58], amt: 0.6, thr: 0.6 }],
  });
  // la panza que la ha arrancado del suelo
  sc.ell([0, 15, -1], [15.5, 7.5, 30], { bone: 'body', mat: 'colFleshDim', k: 4, n: 1.2 });
  sc.ell([0, 10.5, 0], [10, 5, 22], { bone: 'body', mat: 'colSkin', k: 4 });
  // la carne rebosa bajo los muros y entre las piedras del suelo de la nave
  for (const s of [1, -1]) for (let i = 0; i < 6; i++) sc.ell([s * (W + 0.5), Y + 0.5, zB + 4 + i * 8.6], [2.6, 2.4, 4.2], { bone: 'body', mat: 'colFleshDim', k: 2 });
  // por las vidrieras de los costados: carne que sale a borbotones
  const windows = [];
  for (let z = zB + 6; z <= zF - 8; z += 7) for (const s of [1, -1]) windows.push([s * (W + 0.4), Y + 8, z]);
  windows.forEach(([x, y, z], i) => {
    if (i % 3 === 1) return;
    sc.ell([x + Math.sign(x) * 0.9, y, z], [1.6, 3.0, 1.2], { bone: 'church', mat: 'colFleshDim', k: 1.0, n: 1.4 });
    sc.ell([x + Math.sign(x) * 1.5, y - 2.8, z + rng.range(-0.6, 0.6)], [1.2, 2.2, 1.0], { bone: 'church', mat: 'colFleshDim', k: 0.9, n: 1.4 }); // chorreando
  });
  // la boca del pórtico: una lengua de carne que sale por la puerta
  sc.ell([0, Y + 1.6, zF + 2.5], [4.2, 3.0, 4.5], { bone: 'mouth', mat: 'colFleshDim', k: 1.6, n: 1.3 });
  sc.rc([0, Y + 1.0, zF + 4], [0, Y - 6, zF + 12], 2.6, 1.6, { bone: 'mouth', mat: 'colFlesh', k: 1.2, n: 1.3, vn: 1.6 }); // la lengua, colgando
  // los párpados del rosetón (el ojo)
  sc.torus([0, Y + 12.5, zF + 1.0], 3.0, 1.15, { bone: 'church', mat: 'colSkin', k: 0.9, rot: [90, 0, 0] });
  sc.ell([0, Y + 15.0, zF + 1.3], [3.8, 1.3, 1.4], { bone: 'church', mat: 'colSkin', k: 0.8 }); // párpado de arriba, entornado
  // la carne que sale por la cabecera, por detrás
  sc.ell([0, Y + 4, zB - 4], [6, 5.5, 5], { bone: 'body', mat: 'colFleshDim', k: 2.5, n: 1.4 });
  // las patas: carne de araña con rodillas altas
  LEGS.forEach((l, i) => {
    const b = (n) => `g${i}${n}`;
    sc.ell(l.s, [3.4, 3.4, 3.4], { bone: b('a'), mat: 'colFleshDim', k: 2, n: 1.3 });
    sc.rc(l.s, l.k, 2.7, 1.9, { bone: b('a'), mat: 'colFleshDim', k: 1.4 });
    sc.ell(l.k, [2.5, 2.5, 2.5], { bone: b('b'), mat: 'colFleshDim', k: 1.0, n: 1.4 });
    // la carne abraza la cabeza del fuste (el resto de la pata es la columna)
    const top = V(...l.k).lerp(V(...l.f), 0.16).toArray();
    sc.rc(l.k, top, 2.3, 1.9, { bone: b('b'), mat: 'colFleshDim', k: 0.9, n: 1.4 });
  });
  const geo = sc.build();
  M.skinned(geo, sc.mats);
  M.sculptStats = sc.stats;

  // ======================================================================= la catedral
  const c = 'church';
  // muros de la nave (con contrafuertes) y el suelo arrancado (losas por debajo)
  for (const s of [1, -1]) {
    box(c, 'ashlar', [2, wall, zF - zB - 4], [s * (W - 1), Y + wall / 2, (zF + zB) / 2 - 2]);
    for (let z = zB + 4; z <= zF - 8; z += 8) box(c, 'ashlar', [1.4, wall - 3, 1.2], [s * (W + 0.7), Y + (wall - 3) / 2, z]);
  }
  box(c, 'flag', [2 * W, 1.0, zF - zB], [0, Y - 0.5, 0]);
  box(c, 'ashlar', [2 * W, wall, 2], [0, Y + wall / 2, zB + 1]);
  // la cabecera poligonal
  box(c, 'ashlar', [14, 12, 4], [0, Y + 6, zB - 2]);
  H.push({ bone: c, mat: 'roof', geo: hardGeo({ type: 'cone', s: [7.6, 5], seg: 4, p: [0, Y + 14.5, zB - 2], r: [0, 45, 0], mat: 'roof' }) });
  // el tejado a dos aguas, roto por la cumbrera, y los hastiales
  const slope = Math.atan2(ridge - wall, W) / DEG;
  const rl = Math.hypot(W + 0.8, ridge - wall + 0.6);
  for (const s of [1, -1]) {
    box(c, 'roof', [rl, 0.5, zF - zB - 2], [s * (W / 2 + 0.2), Y + (wall + ridge) / 2 + 0.2, (zF + zB) / 2 - 1], [0, 0, -s * slope]);
    box(c, 'wooddark', [rl, 0.25, zF - zB - 2], [s * (W / 2 + 0.2), Y + (wall + ridge) / 2 - 0.2, (zF + zB) / 2 - 1], [0, 0, -s * slope]);
  }
  for (const z of [zB + 0.5]) {
    const g = new THREE.Shape();
    g.moveTo(-W, 0);
    g.lineTo(W, 0);
    g.lineTo(0, ridge - wall);
    g.lineTo(-W, 0);
    H.push({ bone: c, mat: 'ashlar', geo: hardGeo({ type: 'shape', shape: g, s: [1, 1, 1.4], p: [0, Y + wall, z], mat: 'ashlar' }) });
  }
  // vértebras que rompen la cumbrera (el espinazo de lo que la lleva)
  for (let i = 0; i < 13; i++) {
    const z = zB + 3 + i * 3.6;
    const L = 2.6 + Math.sin(i * 0.7) * 0.8 + (i > 3 && i < 9 ? 1.2 : 0);
    H.push({ bone: c, mat: 'colBone', geo: hardGeo({ type: 'cone', s: [0.9, L], seg: 6, p: [0, Y + ridge + L * 0.42, z], r: [-14, 0, 0], mat: 'colBone' }) });
    H.push({ bone: c, mat: 'colBone', geo: hardGeo({ type: 'ico', s: [1.1, 0.7, 1.2], detail: 0, p: [0, Y + ridge + 0.1, z], mat: 'colBone' }) });
  }
  // tejas rotas y levantadas alrededor de las vértebras
  for (let i = 0; i < 14; i++) {
    const s = rng.sign();
    box(c, 'roof', [rng.range(1.5, 3), 0.35, rng.range(1.5, 3)], [s * rng.range(0.6, 3), Y + ridge - 0.6 - rng.range(0, 1.5), rng.range(zB + 2, zF - 6)], [rng.range(-40, 40), rng.range(0, 90), s * rng.range(10, 50)]);
  }
  // vidrieras encendidas (las que no rebosan carne) y sus arcos
  windows.forEach(([x, y, z], i) => {
    box(c, 'glass', [0.1, 5, 1.4], [x + Math.sign(x) * 0.05, y, z], [0, 0, 0], { ao: false });
    box(c, 'ashlar', [0.4, 0.3, 1.8], [x + Math.sign(x) * 0.1, y - 2.6, z]);
    void i;
  });
  // la fachada: el muro, el pórtico con su arco (la boca) y el rosetón (el ojo)
  box(c, 'ashlar', [2 * W - 2 * tw + 0.4, 18, 1.6], [0, Y + 9, zF - 0.8]);
  box(c, 'black', [6.4, 6.6, 0.4], [0, Y + 3.3, zF + 0.05], [0, 0, 0], { ao: false });
  for (const s of [1, -1]) {
    // las hojas de la puerta, abiertas como mandíbulas, con dientes
    box('mouth', 'planks', [3.1, 6.2, 0.35], [s * 3.6, Y + 3.0, zF + 2.6], [0, s * -58, 0]);
    for (let k = 0; k < 5; k++) H.push({ bone: 'mouth', mat: 'colBone', geo: hardGeo({ type: 'cone', s: [0.22, 1.2], seg: 5, p: [s * (2.4 + k * 0.05), Y + 0.8 + k * 1.15, zF + 3.6 + k * 0.05], r: [0, 0, s * 90], mat: 'colBone' }) });
    for (const y of [1.2, 4.6]) box('mouth', 'iron', [3.2, 0.2, 0.42], [s * 3.6, Y + y, zF + 2.62], [0, s * -58, 0]);
  }
  // arquivoltas del pórtico
  for (let k = 0; k < 3; k++) {
    const R = 3.4 + k * 0.6;
    const pts = [];
    for (let j = 0; j <= 10; j++) {
      const a = Math.PI * (j / 10);
      pts.push(V(Math.cos(a) * R, Y + 4.6 + Math.sin(a) * R * 0.95, zF + 0.3 + k * 0.25));
    }
    tube(c, 'ashlar', pts, Array(11).fill(0.35), { radial: 5 });
  }
  // el ojo del rosetón: iris rojo, pupila y la tracería rota alrededor
  H.push({ bone: c, mat: 'redGlow', geo: hardGeo({ type: 'cyl', s: [2.5, 2.5, 0.3], seg: 16, p: [0, Y + 12.5, zF + 0.5], r: [90, 0, 0], mat: 'redGlow', ao: false }) });
  H.push({ bone: c, mat: 'black', geo: hardGeo({ type: 'box', s: [0.75, 3.3, 0.2], p: [0, Y + 12.5, zF + 0.72], mat: 'black', ao: false }) });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    box(c, 'ashlar', [0.3, 2.6, 0.3], [Math.cos(a) * 3.0, Y + 12.5 + Math.sin(a) * 3.0, zF + 0.6], [0, 0, a / DEG]);
  }
  // las torres: cuerpo, cornisa, troneras del campanario, la campana y el chapitel
  for (const s of [1, -1]) {
    const tx = s * (W - tw / 2),
      tz = zF - tw / 2;
    box(c, 'ashlar', [tw, tower, tw], [tx, Y + tower / 2, tz]);
    box(c, 'ashlar', [tw + 0.6, 0.6, tw + 0.6], [tx, Y + tower - 0.3, tz]);
    for (const [dx, dz] of [
      [0, tw / 2 + 0.02],
      [0, -tw / 2 - 0.02],
      [tw / 2 + 0.02, 0],
      [-tw / 2 - 0.02, 0],
    ])
      box(c, 'black', [dx ? 0.1 : 2.2, 3.4, dz ? 0.1 : 2.2], [tx + dx, Y + tower - 4.2, tz + dz], [0, 0, 0], { ao: false });
    H.push({ bone: c, mat: 'roof', geo: hardGeo({ type: 'cone', s: [(tw + 0.8) * 0.707, tw * 0.9], seg: 4, p: [tx, Y + tower + tw * 0.45, tz], r: [0, 45, 0], mat: 'roof' }) });
    // la campana, colgando como una lengua por la tronera de delante
    H.push({ bone: c, mat: 'colBronze', geo: hardGeo({ type: 'lathe', points: [[1.15, 0], [1.1, 0.2], [0.85, 0.7], [0.75, 1.4], [0.45, 1.75], [0.02, 1.8]], seg: 12, p: [tx, Y + tower - 7.6, tz + tw / 2 + 1.4], r: [-30, 0, 0], mat: 'colBronze' }) });
    tube(c, 'colFleshDim', [[tx, Y + tower - 3.4, tz + tw / 2 - 0.4], [tx, Y + tower - 4.6, tz + tw / 2 + 1.2], [tx, Y + tower - 5.8, tz + tw / 2 + 1.6]], [0.6, 0.5, 0.4], { radial: 7 });
  }
  // brazos que salen por las vidrieras y se descuelgan
  for (let i = 0; i < 8; i++) {
    const [x, y, z] = windows[(i * 3 + 1) % windows.length];
    const s = Math.sign(x);
    const len = rng.range(9, 15);
    const base = V(x + s * 0.8, y, z);
    const elbow = base.clone().add(V(s * len * 0.35, -len * 0.25, rng.range(-2, 2)));
    const hand = elbow.clone().add(V(s * len * 0.15, -len * 0.55, rng.range(-2, 2)));
    tube(c, 'colSkin', [base, elbow, hand], [0.75, 0.6, 0.42], { radial: 7, perM: 1 });
    for (let f = 0; f < 4; f++) tube(c, 'colSkin', [hand, hand.clone().add(V(s * 0.3 + (f - 1.5) * 0.25, -1.6, (f - 1.5) * 0.4))], [0.16, 0.08], { radial: 5 });
  }
  // las patas: de la rodilla abajo, un fuste de columna entero (con su
  // capitel roto bajo la carne de la rodilla) y la basa por pie
  LEGS.forEach((l, i) => {
    const b = `g${i}b`;
    const K = V(...l.k),
      F = V(...l.f);
    const d = F.clone().sub(K).normalize();
    const L = K.distanceTo(F);
    const c0 = K.clone().addScaledVector(d, L * 0.14);
    const c1 = F.clone().addScaledVector(d, -1.4);
    H.push({ bone: b, mat: 'ashlar', geo: shaft(c0, c1, 1.35, 1.5) });
    // el capitel, ladeado, bajo la carne
    H.push({ bone: b, mat: 'ashlar', geo: cylAlong(c0.clone().addScaledVector(d, 0.4), d, 2.0, 1.2, 'ashlar') });
    // anillos de carne que trepan por el fuste
    for (let k = 0; k < 3; k++) {
      const p = K.clone().lerp(F, 0.3 + k * 0.17 + rng.range(-0.04, 0.04));
      H.push({ bone: b, mat: 'colFleshDim', geo: cylAlong(p, d, 1.7 - k * 0.1, 0.9 + rng.range(0, 0.6), 'colFleshDim') });
    }
    // la basa: plinto y toro
    H.push({ bone: `g${i}c`, mat: 'ashlar', geo: hardGeo({ type: 'box', s: [3.6, 1.2, 3.6], p: [F.x, 0.6, F.z], r: [0, rng.range(0, 30), 0], mat: 'ashlar' }) });
    H.push({ bone: `g${i}c`, mat: 'ashlar', geo: cylAlong(V(F.x, 1.5, F.z), V(0, 1, 0), 1.9, 0.7, 'ashlar') });
    H.push({ bone: `g${i}c`, mat: 'ashlar', geo: cylAlong(V(F.x, 2.1, F.z), V(0, 1, 0), 1.6, 0.5, 'ashlar') });
  });
  M.rigid(H);

  // ======================================================================= brillos
  const fx = new ColFX(M);
  fx.glow('church', [0, Y + 12.5, zF + 1.2], 6.5, 0xff3018, { pulse: 0.15 });
  fx.light('church', [0, Y + 12.5, zF + 5], 0xff4020, 120, 40);
  fx.glow('mouth', [0, Y + 3.2, zF + 1.0], 6, 0xff6020, { pulse: 0.25, opacity: 0.7 });
  // las vidrieras encendidas por dentro (el corazón sobre el altar)
  windows.forEach(([x, y, z], i) => {
    if (i % 3 !== 1) return;
    fx.glow('church', [x + Math.sign(x) * 0.6, y, z], 3.2, 0xff5030, { pulse: 0.2, opacity: 0.7 });
  });
  fx.light('church', [0, Y + 8, -6], 0xff5030, 80, 30);
  return { model: M, fx, info: { name: 'La Sé', height: Math.round(Y + tower + tw * 0.9), width: 85, length: 75 } };
}

// fuste estriado (columna) de a a b
function shaft(a, b, r0, r1) {
  const d = b.clone().sub(a);
  const L = d.length();
  const g = new THREE.CylinderGeometry(r0, r1, L, 16, 1, true).toNonIndexed();
  // estrías: cada otra arista hacia dentro
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i);
    const a2 = Math.atan2(z, x);
    const k = Math.round((a2 / (Math.PI * 2)) * 16) % 2 === 0 ? 0.9 : 1;
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * L * 0.36);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  const n = p.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = 0.55 + 0.45 * Math.min(1, Math.max(0, (g.attributes.position.getY(i) - 0) / 30));
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
function cylAlong(c, d, r, L, mat) {
  const g = hardGeo({ type: 'cyl', s: [r, r, L], seg: 10, p: [0, 0, 0], mat, ao: false });
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d));
  g.translate(c.x, c.y, c.z);
  return g;
}
void mergeGeometries;
void colMat;
