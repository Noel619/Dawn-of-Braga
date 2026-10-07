// PLAN B, primera forma: EL TORDO (34 m con la cabeza alta, 25 al lomo, 29 de largo).
//
// El caballo tordo del canónigo («anoche se tumbó y no volvió a levantarse;
// esta mañana tenía ocho patas»). Ha crecido hasta los tejados: un caballo
// en los huesos, con el pelo gris rodado todavía en jirones sobre la carne
// viva, el costillar marcado, las caderas como picos y ocho patas larguísimas
// de caña fina, con sus herraduras. El cuello, arqueado, lleva la crin negra
// (por ella se trepa, como por la cola); la cabeza es casi calavera, con la
// brida y el bocado de hierro todavía puestos y las riendas arrastrando. Por
// silla, la del canónigo, con la gualdrapa carmesí de las procesiones y sus
// cruces; al cuello, el esquilón. Le cuelga el vientre como un saco, tirante
// y translúcido: dentro se mueve algo, se marcan caras y manos que empujan y
// las venas brillan. Es la Masa, que crece dentro de él como en la artesa
// del panadero. Lleva clavadas las lanzas de los que intentaron pararlo.
import * as THREE from 'three';
import { Sculpt, ColossusModel, tubeGeo, hardGeo, V } from './sculpt.js';
import { ColFX } from './colfx.js';
import { RNG } from '../../core/util.js';

const DEG = Math.PI / 180;

// patas: [x, z del hombro/cadera, delantera (true) o trasera]
const LEGS = [
  [2.5, 6.2, true],
  [-2.5, 6.2, true],
  [2.75, 2.4, true],
  [-2.75, 2.4, true],
  [2.75, -1.6, false],
  [-2.75, -1.6, false],
  [2.6, -5.6, false],
  [-2.6, -5.6, false],
];
// El cuerpo va subido sobre las patas: todo lo que no es pata se esculpe a
// la altura de un caballo grande y se sube Y0 metros.
export const Y0 = 12.5;
// puntos de cada pata (espacio del modelo) a partir del hombro: patas de
// zancos, larguísimas y finas
function legPts(x, z, front, i) {
  const s = Math.sign(x);
  const st = [0.0, 0.0, 0.7, -0.4, 0.5, -0.7, 0.0, 0.4][i]; // paso (no todas apoyan igual)
  if (front)
    return {
      a: [x, 10.4 + Y0, z],
      b: [x + s * 0.3, 12.6, z + 0.55 + st],
      c: [x + s * 0.36, 1.5, z + 0.7 + st],
      d: [x + s * 0.36, 0.5, z + 1.2 + st],
    };
  return {
    a: [x, 10.2 + Y0, z],
    b: [x + s * 0.36, 11.8, z - 2.2 + st],
    c: [x + s * 0.4, 1.5, z - 0.7 + st],
    d: [x + s * 0.4, 0.5, z + 0.0 + st],
  };
}

function bonesDef() {
  const B = [
    { name: 'root', pos: [0, 0, 0] },
    { name: 'back', parent: 'root', pos: [0, 13.0 + Y0, 0] },
    { name: 'pelvis', parent: 'back', pos: [0, 13.2 + Y0, -6.2] },
    { name: 'chest', parent: 'back', pos: [0, 13.3 + Y0, 5.6] },
    { name: 'belly', parent: 'back', pos: [0, 8.6 + Y0, -0.4] },
    { name: 'neck1', parent: 'chest', pos: [0, 15.0 + Y0, 8.4] },
    { name: 'neck2', parent: 'neck1', pos: [0, 18.0 + Y0, 11.2] },
    { name: 'head', parent: 'neck2', pos: [0, 19.6 + Y0, 13.4] },
    { name: 'jaw', parent: 'head', pos: [0, 18.6 + Y0, 14.6] },
    { name: 'tail1', parent: 'pelvis', pos: [0, 14.2 + Y0, -9.8] },
    { name: 'tail2', parent: 'tail1', pos: [0, 12.2 + Y0, -11.6] },
    { name: 'tail3', parent: 'tail2', pos: [0, 8.8 + Y0, -12.6] },
  ];
  LEGS.forEach(([x, z, f], i) => {
    const P = legPts(x, z, f, i);
    const par = z > 0 ? 'chest' : 'pelvis';
    B.push({ name: `l${i}a`, parent: par, pos: P.a });
    B.push({ name: `l${i}b`, parent: `l${i}a`, pos: P.b });
    B.push({ name: `l${i}c`, parent: `l${i}b`, pos: P.c });
    B.push({ name: `l${i}d`, parent: `l${i}c`, pos: P.d });
  });
  return B;
}

export function buildTordo(o = {}) {
  const M = new ColossusModel(bonesDef());
  const rng = new RNG(o.seed || 21);
  const H = [];
  const tube = (bone, mat, pts, radii, opt = {}) => H.push({ bone, mat, geo: tubeGeo(pts.map((p) => (p.isVector3 ? p : V(...p))), radii, opt) });
  const sc = new Sculpt({
    cell: o.cell || 0.22,
    bones: M.index,
    noise: { amp: 0.06, freq: 0.9, oct: 3, lump: 0.16, lumpFreq: 0.18, vein: 0.07, veinFreq: 0.45 },
    aoDist: 2.0,
    aoStrength: 1.15,
    matNoise: 0.85,
    macro: [{ freq: 0.12, color: [0.66, 0.6, 0.6], amt: 0.55, thr: 0.6 }],
  });

  const n0 = sc.prims.length,
    m0 = sc.subs.length;
  // ------------------------------------------------------------ el tronco: costillar, pecho, grupa
  sc.ell([0, 12.7, 0.2], [3.0, 3.1, 8.4], { bone: 'back', mat: 'colTordo', k: 1.4 });
  sc.ell([0, 12.9, 6.0], [2.9, 3.5, 2.9], { bone: 'chest', mat: 'colTordo', k: 1.3 });
  sc.ell([0, 11.4, 7.6], [1.6, 2.2, 1.4], { bone: 'chest', mat: 'colTordo', k: 1.0 }); // la quilla del pecho
  sc.ell([0, 13.4, -6.2], [3.3, 3.1, 3.6], { bone: 'pelvis', mat: 'colTordo', k: 1.3 });
  for (const s of [1, -1]) {
    sc.ell([s * 1.9, 12.6, -7.6], [1.7, 2.6, 2.0], { bone: 'pelvis', mat: 'colTordo', k: 0.9 }); // nalgas
    sc.ell([s * 2.6, 15.0, -4.6], [0.7, 0.55, 0.7], { bone: 'pelvis', mat: 'colBone', k: 0.4 }); // la cadera, como un pico
    sc.ell([s * 2.3, 14.0, 5.0], [0.9, 1.5, 1.2], { bone: 'chest', mat: 'colTordo', k: 0.6 }); // la paletilla
  }
  // costillas que se marcan bajo la piel (y alguna que la rompe)
  for (let i = 0; i < 9; i++) {
    const z = 4.3 - i * 1.05;
    for (const s of [1, -1]) {
      const exposed = (i + (s > 0 ? 0 : 1)) % 4 === 1;
      const pts = [
        [s * 0.9, 15.6, z],
        [s * 2.7, 14.4, z - 0.15],
        [s * 3.2, 12.4, z - 0.3],
        [s * 2.8, 10.4, z - 0.25],
      ];
      for (let k = 0; k < 3; k++) sc.rc(pts[k].map((v, q) => (q === 0 ? v * 1.06 : v)), pts[k + 1].map((v, q) => (q === 0 ? v * 1.06 : v)), 0.4, 0.36, { bone: 'back', mat: exposed ? 'colBone' : 'colTordo', k: 0.3, n: 0.3 });
    }
  }
  // el espinazo: las apófisis asoman a lo largo del lomo
  for (let i = 0; i < 12; i++) sc.ell([0, 15.85 - Math.abs(i - 5) * 0.05, 6 - i * 1.15], [0.4, 0.45, 0.42], { bone: i < 4 ? 'chest' : i < 8 ? 'back' : 'pelvis', mat: 'colBone', k: 0.35, n: 0.2 });
  // el vientre: un saco hinchado y tirante, con caras y manos que empujan desde dentro
  sc.ell([0, 7.5, -0.4], [3.5, 3.6, 6.6], { bone: 'belly', mat: 'colFlesh', k: 1.8, n: 0.6, vn: 2.8, tint: [1.05, 0.9, 0.86] });
  sc.ell([0.4, 5.2, -0.9], [2.4, 1.6, 4.2], { bone: 'belly', mat: 'colFlesh', k: 1.4, n: 0.7, vn: 2.8, tint: [1.05, 0.88, 0.84] });
  const bulges = [];
  for (let i = 0; i < 16; i++) {
    const a = rng.range(-1.25, 1.25) + (rng.chance(0.5) ? 0 : Math.PI);
    const z = rng.range(-5.0, 4.6);
    const yy = rng.range(-0.95, 0.15);
    const ex = Math.sin(a) * 3.5 * Math.sqrt(1 - (z / 6.6) ** 2),
      ey = 7.5 + yy * 3.4,
      ez = z - 0.4;
    const face = rng.chance(0.55);
    if (face) {
      // una cara que se marca: frente, nariz y la boca abierta
      sc.ell([ex * 1.04, ey, ez], [0.5, 0.62, 0.42], { bone: 'belly', mat: 'colSkin', k: 0.35, tint: [1.0, 0.86, 0.8], n: 0.2 });
      sc.ell([ex * 1.12, ey - 0.25, ez], [0.13, 0.2, 0.14], { sub: true, k: 0.08 });
    } else {
      // una mano abierta empujando (palma y dedos)
      sc.ell([ex * 1.03, ey, ez], [0.36, 0.42, 0.3], { bone: 'belly', mat: 'colSkin', k: 0.3, tint: [1.0, 0.86, 0.8], n: 0.2 });
      for (let f = 0; f < 4; f++) sc.rc([ex * 1.03, ey + 0.2, ez + (f - 1.5) * 0.15], [ex * 1.06, ey + 0.75, ez + (f - 1.5) * 0.22], 0.08, 0.06, { bone: 'belly', mat: 'colSkin', k: 0.1, n: 0.1 });
    }
    bulges.push([ex, ey, ez]);
  }
  // desollado: grandes zonas de carne viva donde el pelo se ha caído a tiras
  for (const [c, r, rot, bone] of [
    [[3.05, 12.0, 1.8], [0.9, 2.6, 3.4], [0, 0, -8], 'back'],
    [[-3.0, 12.6, -1.6], [0.9, 2.2, 2.6], [0, 0, 8], 'back'],
    [[-2.4, 13.6, 5.4], [0.9, 1.8, 1.6], [0, 0, 12], 'chest'],
    [[2.9, 13.2, -6.6], [0.9, 2.0, 2.0], [0, 0, -10], 'pelvis'],
    [[-1.4, 15.8, 8.9], [0.8, 1.4, 1.5], [30, 0, 20], 'neck1'],
  ])
    sc.ell(c, r, { bone, mat: 'colFlesh', k: 0.5, rot, n: 1.4, vn: 1.6 });
  // el cuello arqueado y la cruz
  sc.rc([0, 14.0, 6.4], [0, 16.6, 9.6], 2.5, 2.05, { bone: 'neck1', mat: 'colTordo', k: 1.2 });
  sc.rc([0, 16.6, 9.6], [0, 19.0, 12.2], 2.05, 1.45, { bone: 'neck2', mat: 'colTordo', k: 1.0 });
  sc.rc([0, 15.5, 6.3], [0, 18.6, 10.0], 1.0, 0.8, { bone: 'neck1', mat: 'colTordo', k: 0.8 }); // la cresta de la crin
  for (const s of [1, -1]) sc.rc([s * 0.9, 13.6, 7.6], [s * 0.6, 17.6, 12.6], 0.55, 0.4, { bone: 'neck1', mat: 'colFlesh', k: 0.4 }); // los músculos del cuello, desollados
  // la cabeza: casi calavera
  sc.ell([0, 19.6, 13.6], [1.25, 1.45, 1.6], { bone: 'head', mat: 'colTordo', k: 0.6 });
  sc.ell([0, 20.25, 14.1], [1.08, 0.75, 1.25], { bone: 'head', mat: 'colBone', k: 0.4 }); // la frente pelada
  sc.rc([0, 19.35, 14.4], [0, 17.0, 18.3], 1.05, 0.72, { bone: 'head', mat: 'colBone', k: 0.6 }); // la caña de la nariz (hueso)
  sc.rc([0, 18.7, 14.4], [0, 16.6, 18.0], 0.95, 0.66, { bone: 'head', mat: 'colTordo', k: 0.55 });
  sc.ell([0, 16.75, 18.35], [0.78, 0.7, 0.7], { bone: 'head', mat: 'colTordo', k: 0.4 }); // el belfo
  for (const s of [1, -1]) {
    sc.ell([s * 0.95, 19.9, 14.0], [0.55, 0.5, 0.58], { sub: true, k: 0.16 }); // cuencas
    sc.ell([s * 0.3, 16.95, 18.95], [0.16, 0.2, 0.18], { sub: true, k: 0.1 }); // ollares
    sc.ell([s * 1.15, 19.3, 13.4], [0.38, 0.9, 0.7], { bone: 'head', mat: 'colTordo', k: 0.3 }); // carrillos
  }
  sc.rc([0, 17.8, 14.0], [0, 16.0, 17.2], 0.7, 0.45, { bone: 'jaw', mat: 'colTordo', k: 0.45 }); // la quijada
  sc.ell([0, 16.75, 16.2], [0.55, 0.3, 1.6], { sub: true, k: 0.15 }); // la boca abierta
  sc.shift(n0, sc.prims.length, m0, sc.subs.length, 0, Y0, 0);
  // las patas
  LEGS.forEach(([x, z, front], i) => {
    const P = legPts(x, z, front, i);
    const b = (n) => `l${i}${n}`;
    const s = Math.sign(x);
    // el brazo/muslo con su músculo, la rodilla/corvejón, la caña fina, el menudillo
    const legT = [0.74, 0.7, 0.68];
    sc.rc(P.a, P.b, front ? 1.0 : 1.12, 0.42, { bone: b('a'), mat: 'colTordo', k: 0.7, tint: [0.9, 0.88, 0.86] });
    sc.ell([P.a[0] * 1.02, P.a[1] - 2.3, P.a[2] + (front ? 0.2 : -0.6)], [0.8, 2.7, 1.0], { bone: b('a'), mat: front ? 'colTordo' : 'colFlesh', k: 0.6 });
    sc.ell(P.b, [0.5, 0.56, 0.52], { bone: b('b'), mat: 'colBone', k: 0.28 });
    sc.rc(P.b, P.c, 0.33, 0.26, { bone: b('b'), mat: 'colTordo', k: 0.26, tint: legT });
    sc.rc([P.b[0] + s * 0.08, P.b[1] - 0.4, P.b[2] + (front ? -0.28 : 0.24)], [P.c[0] + s * 0.05, P.c[1] + 0.4, P.c[2] + (front ? -0.22 : 0.2)], 0.13, 0.1, { bone: b('b'), mat: 'colTordo', k: 0.12, tint: [0.7, 0.68, 0.66] }); // el tendón
    sc.ell(P.c, [0.44, 0.46, 0.46], { bone: b('c'), mat: 'colTordo', k: 0.25, tint: legT });
    sc.rc(P.c, P.d, 0.36, 0.4, { bone: b('c'), mat: 'colTordo', k: 0.2, tint: [0.6, 0.58, 0.56] });
  });
  const geo = sc.build();
  M.skinned(geo, sc.mats);
  M.sculptStats = sc.stats;

  // ======================================================================= piezas duras
  // cascos con herradura
  LEGS.forEach(([x, z, front], i) => {
    const P = legPts(x, z, front, i);
    const b = `l${i}d`;
    H.push({ bone: b, mat: 'wooddark', geo: hardGeo({ type: 'cyl', s: [0.52, 0.78, 0.95], seg: 10, p: [P.d[0], 0.47, P.d[2] + 0.12], mat: 'wooddark', tint: [0.45, 0.42, 0.42] }) });
    H.push({ bone: b, mat: 'iron', geo: hardGeo({ type: 'cyl', s: [0.82, 0.82, 0.12], seg: 10, theta: [-150, 300], p: [P.d[0], 0.06, P.d[2] + 0.12], mat: 'iron', ds: true }) });
    // la cerneja: pelo largo sobre el casco
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      tube(b, 'colMane', [[P.d[0] + Math.cos(a) * 0.45, 1.2, P.d[2] + 0.1 + Math.sin(a) * 0.45], [P.d[0] + Math.cos(a) * 0.62, 0.55, P.d[2] + 0.1 + Math.sin(a) * 0.62]], [0.1, 0.03], { radial: 4, cap: false });
    }
  });
  // la crin: mechones largos y negros que caen por el lado izquierdo del cuello
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const base = V(0, 15.6 + t * 3.6, 6.4 + t * 6.0);
    const bone = t < 0.5 ? 'neck1' : 'neck2';
    const len = rng.range(2.2, 4.0) * (1 - t * 0.35);
    const side = rng.chance(0.6) ? 1 : -1;
    const p1 = base.clone().add(V(side * 0.9, -len * 0.35, -0.3));
    const p2 = base.clone().add(V(side * 1.35, -len * 0.75, -0.6 + rng.range(-0.3, 0.3)));
    const p3 = base.clone().add(V(side * 1.5, -len, -0.7 + rng.range(-0.4, 0.4)));
    tube(bone, 'colMane', [base, p1, p2, p3], [0.32, 0.26, 0.16, 0.04], { radial: 5, perM: 1.5 });
  }
  // la cola: un chorro de pelo hasta casi el suelo (se trepa por ella)
  for (let i = 0; i < 30; i++) {
    const a = rng.range(0, Math.PI * 2),
      r = rng.range(0, 0.55);
    const base = V(Math.cos(a) * r, 13.4 + rng.range(-0.3, 0.3), -10.6 + Math.sin(a) * r);
    const sw = rng.range(-0.8, 0.8);
    const len = rng.range(21, 25.5);
    tube('tail2', 'colMane', [base, base.clone().add(V(sw * 0.4, -len * 0.18, -1.8)), base.clone().add(V(sw, -len * 0.5, -2.8)), base.clone().add(V(sw * 1.3, -len * 0.8, -2.6)), base.clone().add(V(sw * 1.5, -len, -2.0))], [0.3, 0.26, 0.2, 0.12, 0.04], { radial: 5, perM: 1.0 });
  }
  tube('tail1', 'colTordo', [[0, 14.6, -9.4], [0, 14.0, -10.8], [0, 13.0, -11.6]], [0.75, 0.6, 0.45], { radial: 7 });
  // púas de hueso que le han brotado por el espinazo
  for (let i = 0; i < 10; i++) {
    const z = 4.6 - i * 1.15;
    const L = 1.0 + Math.sin(i * 0.9) * 0.4 + (i > 2 && i < 7 ? 0.5 : 0);
    if (i >= 3 && i <= 5) continue; // (la silla)
    H.push({ bone: i < 3 ? 'chest' : i < 7 ? 'back' : 'pelvis', mat: 'colBone', geo: hardGeo({ type: 'cone', s: [0.22, L], seg: 5, p: [0, 16.1 + L * 0.4, z - L * 0.25], r: [-28, 0, 0], mat: 'colBone' }) });
  }
  // orejas, una rota
  for (const s of [1, -1]) {
    H.push({ bone: 'head', mat: 'colTordo', geo: hardGeo({ type: 'cone', s: [0.35, s > 0 ? 1.4 : 0.8], seg: 6, p: [s * 0.65, 21.2 - (s > 0 ? 0 : 0.3), 12.9], r: [-20, 0, -s * 18], mat: 'colTordo' }) });
  }
  // dientes (largos, de caballo viejo)
  for (let k = 0; k < 6; k++) {
    const x = (k - 2.5) * 0.17;
    H.push({ bone: 'head', mat: 'colBone', geo: hardGeo({ type: 'box', s: [0.14, 0.42, 0.18], p: [x, 16.55, 18.55 - Math.abs(x) * 0.6], r: [12, 0, 0], mat: 'colBone' }) });
    H.push({ bone: 'jaw', mat: 'colBone', geo: hardGeo({ type: 'box', s: [0.14, 0.4, 0.18], p: [x, 16.2, 17.7 - Math.abs(x) * 0.6], r: [-10, 0, 0], mat: 'colBone' }) });
  }
  // la brida, el bocado y las riendas arrastrando
  const strap = (bone, pts, w = 0.13) => tube(bone, 'leather', pts, pts.map(() => w), { radial: 5, perM: 2 });
  strap('head', [[1.0, 17.5, 17.4], [1.15, 18.4, 15.6], [1.0, 20.2, 13.4], [0, 21.2, 12.9], [-1.0, 20.2, 13.4], [-1.15, 18.4, 15.6], [-1.0, 17.5, 17.4]]);
  strap('head', [[0.95, 17.3, 17.6], [0.0, 17.5, 18.75], [-0.95, 17.3, 17.6]]);
  strap('head', [[1.25, 19.0, 13.0], [0.9, 17.5, 12.6], [0, 17.0, 12.5], [-0.9, 17.5, 12.6], [-1.25, 19.0, 13.0]]);
  for (const s of [1, -1]) H.push({ bone: 'head', mat: 'iron', geo: hardGeo({ type: 'torus', s: [0.32, 0.07], seg: 10, p: [s * 1.02, 16.9, 17.2], r: [0, 90, 0], mat: 'iron' }) });
  tube('head', 'iron', [[1.02, 16.9, 17.2], [-1.02, 16.9, 17.2]], [0.07, 0.07], { radial: 4 });
  for (const s of [1, -1]) {
    tube('root', 'leather', [[s * 1.02, 16.9 + Y0, 17.2], [s * 1.8, 13.0 + Y0, 16.6], [s * 2.1, 12.0, 15.6], [s * 1.9, 3.0, 14.4], [s * 1.4, 0.15, 12.8], [s * 0.6, 0.12, 9.0]], [0.14, 0.14, 0.14, 0.14, 0.14, 0.14], { radial: 4, perM: 1.5 });
  }
  // la silla del canónigo y la gualdrapa carmesí con sus cruces
  H.push({ bone: 'back', mat: 'leather', geo: hardGeo({ type: 'box', s: [2.6, 0.5, 3.4], p: [0, 16.1, 1.6], taper: [1.05, 1.0], mat: 'leather' }) });
  H.push({ bone: 'back', mat: 'leather', geo: hardGeo({ type: 'box', s: [1.4, 1.1, 0.5], p: [0, 16.7, 3.4], r: [-14, 0, 0], mat: 'leather' }) });
  H.push({ bone: 'back', mat: 'leather', geo: hardGeo({ type: 'box', s: [2.0, 1.2, 0.45], p: [0, 16.8, -0.25], r: [16, 0, 0], mat: 'leather' }) });
  for (const s of [1, -1]) {
    // la gualdrapa: dos paños que caen por los costados, rotos por abajo
    H.push({ bone: 'back', mat: 'clothRed', ds: true, geo: hardGeo({ type: 'box', s: [0.06, 4.6, 6.6], p: [s * 3.25, 13.4, 1.4], r: [0, 0, s * 9], taper: [1, 1.05], mat: 'clothRed' }) });
    for (let k = 0; k < 6; k++) {
      const zz = -1.4 + k * 1.1;
      const len = rng.range(0.6, 1.8);
      H.push({ bone: 'back', mat: 'clothRed', ds: true, geo: hardGeo({ type: 'box', s: [0.05, len, 0.95], p: [s * 3.62, 11.1 - len / 2, zz], r: [0, 0, s * 9], taper: [0.5, 1], mat: 'clothRed' }) });
    }
    // la cruz de oro y la cenefa
    H.push({ bone: 'back', mat: 'colOrphrey', geo: hardGeo({ type: 'box', s: [0.08, 2.2, 0.38], p: [s * 3.33, 13.6, 1.4], r: [0, 0, s * 9], mat: 'colOrphrey' }) });
    H.push({ bone: 'back', mat: 'colOrphrey', geo: hardGeo({ type: 'box', s: [0.08, 0.38, 1.6], p: [s * 3.33, 14.1, 1.4], r: [0, 0, s * 9], mat: 'colOrphrey' }) });
    H.push({ bone: 'back', mat: 'colOrphrey', geo: hardGeo({ type: 'box', s: [0.08, 0.3, 6.6], p: [s * 3.62, 11.2, 1.4], r: [0, 0, s * 9], mat: 'colOrphrey' }) });
    // estribos
    tube('back', 'leather', [[s * 1.4, 16.0, 1.6], [s * 2.9, 14.5, 1.6], [s * 3.3, 11.8, 1.7]], [0.1, 0.1, 0.1], { radial: 4 });
    H.push({ bone: 'back', mat: 'iron', geo: hardGeo({ type: 'torus', s: [0.38, 0.07], seg: 8, p: [s * 3.35, 11.4, 1.7], r: [0, 90, 0], mat: 'iron' }) });
  }
  // el esquilón, colgado del collar
  tube('neck1', 'leather', [[2.1, 15.2, 8.4], [1.4, 13.8, 9.8], [0, 13.4, 10.2], [-1.4, 13.8, 9.8], [-2.1, 15.2, 8.4]], [0.18, 0.18, 0.18, 0.18, 0.18], { radial: 5 });
  H.push({ bone: 'neck1', mat: 'colBronze', geo: hardGeo({ type: 'lathe', points: [[0.75, 0], [0.7, 0.2], [0.55, 0.8], [0.5, 1.3], [0.3, 1.55], [0.02, 1.6]], seg: 12, p: [0, 11.6, 10.3], mat: 'colBronze', ds: true }) });
  // lanzas y saetas clavadas (con algún pendón)
  for (const [p, d, L, flag] of [
    [[2.9, 13.2, -2.0], [0.7, 0.5, -0.4], 6.5, true],
    [[-3.0, 12.4, 1.2], [-0.8, 0.45, 0.3], 5.5, false],
    [[1.6, 15.6, -4.6], [0.3, 0.9, -0.3], 5.0, false],
    [[-2.2, 14.9, -6.4], [-0.5, 0.7, -0.5], 6.0, true],
    [[1.2, 17.2, 10.8], [0.6, 0.6, 0.5], 4.2, false],
    [[-3.1, 10.6, -4.0], [-0.9, -0.1, 0.2], 4.8, false],
  ]) {
    const dn = V(...d).normalize();
    const a = V(...p).addScaledVector(dn, -0.8);
    const b2 = V(...p).addScaledVector(dn, L);
    const bone = p[2] > 4 ? 'neck1' : p[2] < -3 ? 'pelvis' : 'back';
    tube(bone, 'wooddark', [a, b2], [0.11, 0.1], { radial: 5 });
    if (flag) {
      const top = b2.clone().addScaledVector(dn, -0.6);
      H.push({ bone, mat: 'clothDark', ds: true, geo: hardGeo({ type: 'box', s: [0.04, 1.6, 1.1], p: top.clone().add(V(0, -0.9, -0.45)).toArray(), r: [0, 0, 0], taper: [0.4, 1], mat: 'clothDark' }) });
    } else H.push({ bone, mat: 'iron', geo: hardGeo({ type: 'cone', s: [0.18, 0.6], seg: 5, p: b2.toArray(), r: [0, 0, 0], mat: 'iron' }) });
  }
  // todo lo que cuelga del cuerpo se sube con él (las patas y lo del suelo, no)
  for (const it of H) if (!/^l\d/.test(it.bone) && it.bone !== 'root') it.geo.translate(0, Y0, 0);
  M.rigid(H);

  // ======================================================================= brillos
  const fx = new ColFX(M);
  for (const s of [1, -1]) {
    fx.glow('head', [s * 0.95, 19.9 + Y0, 14.35], 1.1, 0xff6030, { pulse: 0.1 });
    fx.glow('head', [s * 0.95, 19.9 + Y0, 14.2], 0.4, 0xffd0a0, { pulse: 0.05 });
  }
  // lo de dentro del vientre: un resplandor que late
  fx.glow('belly', [0, 7.0 + Y0, 1.0], 9, 0xff4a20, { pulse: 0.25, opacity: 0.55 });
  fx.glow('belly', [1.5, 6.6 + Y0, -2.4], 5, 0xff6a30, { pulse: 0.3, opacity: 0.5 });
  fx.light('belly', [0, 3.0 + Y0, 0], 0xff5a28, 60, 18);
  return { model: M, fx, info: { name: 'El Tordo', height: 34, back: 25, length: 29 } };
}

export const TORDO_POSES = {
  stand: {},
  // se encabrita: las dos primeras patas en el aire, el cuello alto
  rear: {
    back: [-24, 0, 0],
    neck1: [10, 0, 0],
    neck2: [-8, 0, 0],
    head: [18, 0, 0],
    jaw: [22, 0, 0],
    l0a: [-70, 0, 0],
    l0b: [95, 0, 0],
    l1a: [-55, 0, 0],
    l1b: [110, 0, 0],
    l2a: [-30, 0, 0],
    l2b: [60, 0, 0],
    l3a: [-38, 0, 0],
    l3b: [70, 0, 0],
    l4a: [24, 0, 0],
    l5a: [20, 0, 0],
    l6a: [26, 0, 0],
    l7a: [22, 0, 0],
    tail1: [-20, 0, 0],
    tail2: [-15, 0, 0],
  },
};
