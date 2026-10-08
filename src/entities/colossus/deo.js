// DEO IGNOTO (56 m; con las manos alzadas, ~95). Versión 2, la del juego.
//
// Cuando el Turiferario revienta, lo que dormía en la cisterna del Dios
// Desconocido sale por la nave de la catedral: una montaña de carne que
// brota del suelo hasta la cintura, con la joroba por encima de las torres.
// Por cara lleva una máscara de bronce romana, serena, con las cuencas vacías
// (al fondo arden los ojos), la diadema con la inscripción DEO IGNOTO y una
// grieta por la que rezuma la carne. Seis brazos larguísimos de tres tramos:
// los dos de delante agarran las torres de la fachada, los de los lados se
// apoyan en los tejados de los barrios y los dos de atrás se alzan al cielo
// con las manos abiertas (son los que golpean la plaza). En la espalda, los
// tubos del órgano de la Sé clavados como púas; por el cuerpo, caras de
// fieles grandes como casas y tumores que laten.
//
// Puntos débiles: un sigilo en el dorso de cada brazo alzado, junto al codo,
// y los dos ojos. Se trepa por la mano plantada y el antebrazo, y por la
// grieta de la máscara cuando baja la cabeza (extra.climb).
//
// Espacio del modelo: el origen en el suelo de la nave, donde brota; mira
// hacia +z (la fachada y la plaza); +x es su izquierda.
import * as THREE from 'three';
import { Sculpt, tubeGeo, hardGeo, V } from './sculpt.js';
import { spikeGeo, clawGeo, withColor, mulberry, torusAround } from './parts.js';
import { assemble } from './model.js';

const DEG = Math.PI / 180;

import { DEO_ARMS, DEO_BONES, DEO, handFrame, fingerJoints } from './deo_skeleton.js';
export { DEO_ARMS, DEO_BONES, DEO };


// rotación (grados, XYZ) que lleva el eje Z local a la dirección d
function dirRot(d) {
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  return [e.x / DEG, e.y / DEG, e.z / DEG];
}
// cilindro desde b en la dirección d (radios r0 y r1, largo L)
function cylAlong(b, d, r0, L, seg = 8, mat = 'iron', r1 = r0) {
  const g = hardGeo({ type: 'cyl', s: [r1, r0, L], seg, p: [0, L / 2, 0], mat, ao: false });
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize()));
  g.translate(b.x, b.y, b.z);
  return g;
}

// ======================================================================= geometría
export function deoData(o = {}) {
  const t0 = performance.now();
  const BI = {};
  DEO_BONES.forEach((b, i) => (BI[b.name] = i));
  const rnd = mulberry(o.seed ?? 13);
  const R = (a, b) => a + (b - a) * rnd();
  const H = [];
  const rig = (bone, mat, geo, extra = {}) => H.push({ bone, mat, geo, ...extra });
  const SKIN = [0.93, 0.88, 0.84];

  // ------------------------------------------------------------ el cuerpo
  const body = new Sculpt({
    cell: o.cell ?? 0.62,
    bones: BI,
    noise: { amp: 0.3, freq: 0.24, oct: 3, lump: 1.2, lumpFreq: 0.05, vein: 0.3, veinFreq: 0.12 },
    aoDist: 7,
    aoStrength: 1.2,
    matNoise: 0.85,
    matFreq: 0.09,
    weightSmooth: 2,
    macro: [
      { freq: 0.035, color: [0.62, 0.5, 0.62], amt: 0.6, thr: 0.6 },
      { freq: 0.06, color: [0.72, 0.44, 0.4], amt: 0.45, thr: 0.68 },
    ],
  });
  // la base: carne que revienta el suelo de la nave (medio enterrada)
  body.ell([0, 1, -2], [27, 9, 24], { bone: 'root', mat: 'colFlesh', k: 4, n: 1.3, tint: [0.8, 0.6, 0.56] });
  body.ell([0, 13, -1], [21, 12.5, 17], { bone: 'body', mat: 'colSkin', k: 5, tint: SKIN });
  // el torso, que se inclina hacia la ciudad, y la joroba
  body.ell([0, 26.5, 2.5], [17, 11.5, 12.5], { bone: 'chest', mat: 'colSkin', k: 5, rot: [16, 0, 0], tint: SKIN });
  body.ell([0, 34.5, -3.5], [19.5, 9, 12], { bone: 'chest', mat: 'colSkin', k: 5, rot: [-10, 0, 0], tint: SKIN });
  body.ell([0, 40, -6], [12, 6.5, 9], { bone: 'chest', mat: 'colSkin', k: 4 });
  // los hombros de los seis brazos: bultos de carne donde nacen
  DEO_ARMS.forEach((a, i) => body.ell(a.s, [5.4, 4.8, 5.4], { bone: `a${i}s`, mat: i < 4 ? 'colFlesh' : 'colSkin', k: 3.5, n: 1.3 }));
  // el cuello que sostiene la máscara, y la carne que se desborda por su borde
  body.rc([0, 37, 3], [0, 43.5, 9.5], 8.6, 7.6, { bone: 'neck', mat: 'colFlesh', k: 3, n: 1.4 });
  body.ell([0, 45.5, 8.0], [9.2, 10.8, 7.4], { bone: 'head', mat: 'colFlesh', k: 3, n: 1.25 });
  body.ell([0, 35, 14.5], [7.2, 5.4, 4.4], { bone: 'jaw', mat: 'colFlesh', k: 2.5, n: 1.6, vn: 1.5 });
  // tumores y bultos que laten
  for (let i = 0; i < 28; i++) {
    const a = R(-Math.PI * 0.95, Math.PI * 0.95);
    const y = R(5, 37);
    const rr = 20 - Math.max(0, y - 22) * 0.5 + R(-2, 1);
    const r = R(2.2, 4.8);
    body.ell([Math.sin(a) * rr, y, Math.cos(a) * rr * 0.85], [r, r * R(0.7, 1.2), r], { bone: y < 20 ? 'body' : 'chest', mat: rnd() < 0.55 ? 'colFlesh' : 'colSkin', k: 2.5, n: 1.6, vn: 1.8 });
  }
  // caras de fieles grandes como casas, hundidas en el cuerpo
  const faces = [];
  for (const [x, y, z, s, yaw] of [
    [-10, 21, 15.5, 1.0, -0.4],
    [8, 17, 17.5, 1.15, 0.35],
    [15.5, 26, 9.5, 0.9, 1.0],
    [-17, 13, 10, 1.05, -0.9],
    [2, 9, 21, 1.2, 0.05],
    [-4, 30, 13, 0.8, -0.15],
    [18, 8, 6, 1.1, 1.3],
  ]) {
    const dx = Math.sin(yaw),
      dz = Math.cos(yaw);
    const c = [x, y, z];
    const bone = y < 20 ? 'body' : 'chest';
    body.ell(c, [2.1 * s, 2.7 * s, 1.6 * s], { bone, mat: 'colSkin', k: 1.2, rot: [0, yaw / DEG, 0], n: 0.5, tint: [1, 0.96, 0.9] });
    // frente, nariz, pómulos; cuencas y boca abierta (talladas)
    body.ell([x + dx * 1.15 * s, y + 0.15 * s, z + dz * 1.15 * s], [0.35 * s, 0.7 * s, 0.45 * s], { bone, mat: 'colSkin', k: 0.4, rot: [0, yaw / DEG, 0], tint: [1, 0.96, 0.9] });
    for (const sx of [-1, 1]) body.ell([x + dx * 1.2 * s + Math.cos(yaw) * 0.75 * s * sx, y + 0.6 * s, z + dz * 1.2 * s - Math.sin(yaw) * 0.75 * s * sx], [0.42 * s, 0.38 * s, 0.4 * s], { sub: true, k: 0.3 });
    body.ell([x + dx * 1.3 * s, y - 1.05 * s, z + dz * 1.3 * s], [0.55 * s, 0.85 * s, 0.6 * s], { sub: true, k: 0.35 });
    body.paint([x + dx * 1.4 * s, y - 1.0 * s, z + dz * 1.4 * s], [0.8 * s, 1.0 * s, 0.8 * s], { tint: [0.3, 0.12, 0.1], edge: 0.4 });
    faces.push({ c, s, yaw, bone });
  }
  // carne viva en las grietas y en las uniones de los brazos
  for (let i = 0; i < 14; i++) {
    const a = R(-Math.PI, Math.PI),
      y = R(4, 38);
    const rr = 19 - Math.max(0, y - 22) * 0.45;
    body.paint([Math.sin(a) * rr, y, Math.cos(a) * rr * 0.85], [R(3, 6), R(2, 5), R(3, 6)], { mat: 'colFlesh', tint: [0.78, 0.5, 0.46], edge: 0.6 });
  }
  // la carne que rebosa por el borde de la máscara (la lleva puesta)
  {
    const mq0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(18 * DEG, 0, 0));
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2;
      const lp = V(Math.cos(a) * 5.4 * 1.55, Math.sin(a) * 7.1 * 1.55 + 1.0, -2.6 * 1.55).applyQuaternion(mq0).add(V(0, 45.6, 15.4));
      body.ell(lp.toArray(), [R(1.6, 2.4), R(1.6, 2.4), R(1.6, 2.4)], { bone: 'head', mat: 'colFlesh', k: 1.5, n: 1.4, vn: 1.5 });
    }
  }
  const bodyGeo = body.build();

  // ------------------------------------------------------------ la máscara de bronce
  // (pieza rígida de la cabeza: más fina que el cuerpo)
  const mask = new Sculpt({ cell: o.maskCell ?? 0.2, bones: BI, noise: { amp: 0.025, freq: 0.9, oct: 2, lump: 0.05, lumpFreq: 0.22, vein: 0, veinFreq: 0.3 }, aoDist: 1.5, aoStrength: 1.35, matNoise: 0 });
  const MC = V(0, 45.6, 15.4);
  const MS = 1.55;
  const mq = new THREE.Quaternion().setFromEuler(new THREE.Euler(18 * DEG, 0, 0));
  const P = (x, y, z) => V(x * MS, y * MS, z * MS).applyQuaternion(mq).add(MC).toArray();
  const mk = (fn, x, y, z, r, opt = {}) => mask[fn](P(x, y, z), Array.isArray(r) ? r.map((q) => q * MS) : r * MS, { bone: 'head', mat: 'colBronze', ...opt, k: (opt.k ?? 0.5) * MS, rot: opt.rot ? [opt.rot[0] + 18, opt.rot[1], opt.rot[2]] : [18, 0, 0] });
  const mrc = (a, b, ra, rb, opt = {}) => mask.rc(P(...a), P(...b), ra * MS, rb * MS, { bone: 'head', mat: 'colBronze', ...opt, k: (opt.k ?? 0.4) * MS });
  // volumen de la cara (frente, mejillas, mentón, sienes)
  mk('ell', 0, 0.8, -1.4, [5.2, 6.9, 3.0], { k: 1.2 });
  mk('ell', 0, 3.3, -0.9, [4.4, 2.5, 2.2], { k: 1.3 });
  for (const s of [1, -1]) {
    mk('ell', s * 2.45, -1.0, -0.1, [1.7, 2.3, 1.6], { k: 1.1 });
    mk('ell', s * 4.3, 0.8, -1.6, [1.0, 2.8, 1.8], { k: 0.8 });
    // orejas (de estatua): conchas en los lados
    mk('ell', s * 5.25, 0.4, -2.3, [0.55, 1.6, 0.95], { k: 0.35 });
    // párpados de arriba y de abajo, que enmarcan las cuencas
    mrc([s * 0.85, 1.22, 1.85], [s * 2.95, 1.18, 1.25], 0.26, 0.2, { k: 0.25 });
    mrc([s * 0.95, -0.02, 1.72], [s * 2.85, 0.02, 1.2], 0.2, 0.17, { k: 0.25 });
  }
  mk('ell', 0, -5.0, -0.5, [2.2, 1.5, 1.6], { k: 0.8 });
  // arco de las cejas y nariz griega, recta desde la frente
  mrc([-3.3, 1.95, 1.05], [-0.4, 1.8, 1.65], 0.42, 0.34, { k: 0.7 });
  mrc([3.3, 1.95, 1.05], [0.4, 1.8, 1.65], 0.42, 0.34, { k: 0.7 });
  mrc([0, 1.6, 1.85], [0, -1.5, 3.0], 0.55, 0.85, { k: 0.45 });
  mk('ell', 0, -1.7, 2.75, [0.95, 0.6, 0.75], { k: 0.35 });
  for (const s of [1, -1]) mk('ell', s * 0.75, -1.85, 2.45, [0.45, 0.4, 0.45], { k: 0.25 });
  // el surco de encima del labio y los labios (la boca entreabierta)
  mk('ell', 0, -2.25, 1.95, [0.42, 0.35, 0.4], { sub: true, k: 0.12 });
  mk('ell', 0, -2.75, 1.6, [1.75, 0.5, 0.75], { k: 0.4 });
  mk('ell', 0, -3.55, 1.5, [1.5, 0.55, 0.75], { k: 0.4 });
  for (const s of [1, -1]) mk('ell', s * 1.75, -3.1, 1.15, [0.3, 0.32, 0.4], { sub: true, k: 0.12 });
  // diadema con la inscripción
  mrc([-4.9, 4.6, -1.2], [0, 5.1, 1.0], 0.55, 0.55, { k: 0.3 });
  mrc([4.9, 4.6, -1.2], [0, 5.1, 1.0], 0.55, 0.55, { k: 0.3 });
  // rizos sobre la frente y en las sienes
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 30 - row * 4; i++) {
      const n = 30 - row * 4;
      const a = -1.5 + (i / (n - 1)) * 3.0 + row * 0.05;
      const r = 5.0 + row * 0.35;
      const j = 0.85 + R(0, 0.35);
      mk('ell', Math.sin(a) * r + R(-0.12, 0.12), 5.75 + row * 0.75 + Math.cos(a) * 1.1 + R(-0.15, 0.15), -0.95 - row * 0.4 - Math.abs(Math.sin(a)) * 2.2, [0.5 * j, 0.46 * j, 0.5 * j], { k: 0.16 });
    }
  // tallas: cuencas vacías (almendra), orificios de la nariz, la boca, la grieta
  for (const s of [1, -1]) {
    mk('ell', s * 1.85, 0.6, 1.3, [1.25, 0.7, 1.1], { sub: true, k: 0.35 });
    mk('ell', s * 1.85, 0.6, 0.4, [0.95, 0.55, 1.4], { sub: true, k: 0.25 });
    mk('ell', s * 0.42, -1.95, 2.9, [0.22, 0.18, 0.3], { sub: true, k: 0.1 });
  }
  mk('ell', 0, -3.15, 1.9, [1.25, 0.2, 0.9], { sub: true, k: 0.12 });
  const crack = [
    [1.0, 6.2, 0.6],
    [0.6, 4.5, 1.6],
    [1.3, 3.0, 1.75],
    [0.9, 1.8, 2.0],
    [1.9, 0.2, 1.85],
    [2.4, -1.6, 1.6],
    [3.6, -3.2, 0.9],
    [3.4, -5.2, 0.3],
  ];
  for (let i = 0; i < crack.length - 1; i++) mrc(crack[i], crack[i + 1], 0.34, 0.32, { sub: true, k: 0.12 });
  // pátina: verdete en los huecos, oro gastado en lo alto
  mask.paint(P(0, 5.4, 0.4), [6 * MS, 1.2 * MS, 3 * MS], { tint: [1.15, 1.05, 0.8], edge: 0.5, k: 0.6 });
  for (const s of [1, -1]) {
    mask.paint(P(s * 1.85, 0.6, 1.4), [1.9 * MS, 1.2 * MS, 1.4 * MS], { tint: [0.55, 0.72, 0.62], edge: 0.6, k: 0.6 });
    mask.paint(P(s * 1.85, 0.6, 0.4), [1.2 * MS, 0.75 * MS, 1.4 * MS], { tint: [0.12, 0.09, 0.08], edge: 0.4 });
  }
  mask.paint(P(0, -3.15, 1.5), [1.4 * MS, 0.4 * MS, 1.0 * MS], { tint: [0.15, 0.08, 0.06], edge: 0.4 });
  const maskGeo = mask.build();
  for (const k of ['skinIndex', 'skinWeight']) maskGeo.deleteAttribute(k);
  maskGeo.clearGroups();
  rig('head', 'colBronze', maskGeo, { local: false });
  // la inscripción DEO IGNOTO en la diadema (letras en relieve)
  const LET = 'DEO·IGNOTO';
  for (let i = 0; i < LET.length; i++) {
    const a = -0.82 + (i / (LET.length - 1)) * 1.64;
    const lp = P(Math.sin(a) * 4.05, 5.05 - Math.abs(Math.sin(a)) * 0.35, 1.05 - Math.abs(Math.sin(a)) * 1.9);
    const ch = LET[i];
    if (ch === '·') {
      rig('head', 'gold', hardGeo({ type: 'sphere', s: [0.16 * MS], seg: 5, seg2: 3, p: lp, mat: 'gold' }));
      continue;
    }
    // trazos de la letra (cajitas): un remedo de capital romana
    rig('head', 'gold', hardGeo({ type: 'box', s: [0.12 * MS, 0.62 * MS, 0.14 * MS], p: lp, r: [18, a / DEG, 0], mat: 'gold' }));
    if ('DEGNOT'.includes(ch)) rig('head', 'gold', hardGeo({ type: 'box', s: [0.42 * MS, 0.1 * MS, 0.14 * MS], p: [lp[0], lp[1] + 0.26 * MS, lp[2]], r: [18, a / DEG, 0], mat: 'gold' }));
    if ('DEGO'.includes(ch)) rig('head', 'gold', hardGeo({ type: 'box', s: [0.42 * MS, 0.1 * MS, 0.14 * MS], p: [lp[0], lp[1] - 0.26 * MS, lp[2]], r: [18, a / DEG, 0], mat: 'gold' }));
  }
  // la carne que rezuma por la grieta
  rig('head', 'colFlesh', tubeGeo(crack.map((c) => V(...P(c[0], c[1], c[2] - 0.15))), [0.26, 0.3, 0.28, 0.32, 0.3, 0.26, 0.22, 0.16].map((r) => r * MS), { radial: 6, perM: 1.5 }));
  for (let i = 1; i < crack.length - 1; i += 2) {
    const c = V(...P(crack[i][0], crack[i][1], crack[i][2] + 0.1));
    rig('head', 'colFlesh', tubeGeo([c, c.clone().add(V(R(-0.3, 0.3), -R(1.0, 2.4), 0.25))], [0.22 * MS, 0.08 * MS], { radial: 5, segs: 4 }));
  }

  // ------------------------------------------------------------ los brazos
  const arms = [];
  DEO_ARMS.forEach((a, i) => {
    const arm = new Sculpt({
      cell: o.armCell ?? 0.38,
      bones: BI,
      noise: { amp: 0.14, freq: 0.36, oct: 3, lump: 0.5, lumpFreq: 0.09, vein: 0.2, veinFreq: 0.22 },
      aoDist: 3.2,
      aoStrength: 1.1,
      matNoise: 0.7,
      matFreq: 0.18,
      weightSmooth: 3,
      macro: [{ freq: 0.08, color: [0.64, 0.5, 0.62], amt: 0.6, thr: 0.62 }],
    });
    const b = (n) => `a${i}${n}`;
    const S = V(...a.s),
      E = V(...a.e),
      W = V(...a.w);
    const { Hd, dir, side, pn } = handFrame(a);
    // tramo de arriba: piel pálida sobre el hueso, con el músculo desollado
    // asomando por debajo y un tendón por fuera
    arm.rc(S.toArray(), E.toArray(), 2.3, 1.6, { bone: b('s'), mat: 'colSkin', k: 0.9, tint: SKIN });
    const ax1 = E.clone().sub(S).normalize();
    const sd1 = V(0, 1, 0).cross(ax1).normalize();
    const up1 = ax1.clone().cross(sd1).normalize();
    arm.ell(S.clone().lerp(E, 0.4).addScaledVector(up1, -0.95).toArray(), [1.7, 1.7, S.distanceTo(E) * 0.22], { bone: b('s'), mat: 'colFleshDim', k: 0.9, rot: dirRot(ax1), n: 1.4 });
    arm.rc(S.clone().lerp(E, 0.15).addScaledVector(sd1, 1.75).toArray(), E.clone().addScaledVector(sd1, 1.2).toArray(), 0.44, 0.36, { bone: b('s'), mat: 'colSkin', k: 0.45, tint: [0.92, 0.86, 0.82] });
    // el codo: hueso desnudo con espolones
    arm.ell(E.toArray(), [1.9, 1.9, 1.9], { bone: b('e'), mat: 'colBone', k: 0.7, n: 0.5 });
    // antebrazo desollado: dos tramos de músculo vivo, una articulación de
    // más y tendones pálidos
    const M2 = E.clone().lerp(W, 0.5);
    const ax2 = W.clone().sub(E).normalize();
    const sd2 = V(0, 1, 0).cross(ax2).normalize();
    const up2 = ax2.clone().cross(sd2).normalize();
    arm.rc(E.toArray(), M2.toArray(), 1.75, 1.4, { bone: b('e'), mat: 'colFleshDim', k: 0.6, n: 1.4, vn: 1.6 });
    arm.ell(M2.toArray(), [1.38, 1.38, 1.38], { bone: b('e'), mat: 'colBone', k: 0.5, n: 0.5 });
    arm.rc(M2.toArray(), W.toArray(), 1.4, 1.1, { bone: b('e'), mat: 'colFleshDim', k: 0.55, n: 1.4, vn: 1.6 });
    for (const sg of [1, -1]) arm.rc(E.clone().addScaledVector(sd2, sg * 1.08).addScaledVector(up2, 0.5).toArray(), W.clone().addScaledVector(sd2, sg * 0.62).addScaledVector(up2, 0.42).toArray(), 0.32, 0.24, { bone: b('e'), mat: 'colSkin', k: 0.3, tint: [0.95, 0.9, 0.86] });
    // la piel del dorso del antebrazo (por ahí se trepa): una franja de piel
    // pálida y dura sobre el músculo, del codo a la muñeca
    const dors = pn.clone().negate();
    arm.rc(E.clone().addScaledVector(dors, 0.95).toArray(), W.clone().addScaledVector(dors, 0.6).toArray(), 1.25, 0.95, { bone: b('e'), mat: 'colSkin', k: 0.55, tint: [0.88, 0.82, 0.78] });
    arm.ell(W.toArray(), [1.15, 1.0, 1.15], { bone: b('w'), mat: 'colBone', k: 0.5 });
    // la mano: palma gruesa de la muñeca a los nudillos
    const palmC = W.clone().lerp(Hd, 0.55);
    arm.ell(palmC.toArray(), [1.95 * a.spread, 1.05, W.distanceTo(Hd) * 0.6], { bone: b('w'), mat: 'colSkin', k: 0.8, rot: dirRot(dir) });
    arm.ell(W.clone().lerp(Hd, 0.4).addScaledVector(side, -1.2 * a.spread).addScaledVector(pn, 0.45).toArray(), [1.0, 0.8, 1.6], { bone: b('w'), mat: 'colSkin', k: 0.6, rot: dirRot(dir) });
    arm.rc(Hd.clone().addScaledVector(side, -2.0 * a.spread).toArray(), Hd.clone().addScaledVector(side, 2.0 * a.spread).toArray(), 0.75, 0.7, { bone: b('w'), mat: 'colSkin', k: 0.6 });
    // tendones del dorso, de la muñeca a cada nudillo
    for (let f = 0; f < 4; f++) {
      const t = (f - 1.5) * 0.62;
      arm.rc(W.clone().addScaledVector(side, t * 0.5).addScaledVector(dors, 0.62).toArray(), Hd.clone().addScaledVector(side, t * 1.5 * a.spread).addScaledVector(dors, 0.58).addScaledVector(dir, 0.3).toArray(), 0.3, 0.34, { bone: b('w'), mat: 'colSkin', k: 0.35, tint: [0.94, 0.9, 0.86] });
    }
    // dedos: tres falanges, nudillos marcados y uñas de hueso
    for (const fj of fingerJoints(a)) {
      const r0 = fj.r;
      arm.ell(fj.base.toArray(), [r0 * 1.1, r0 * 1.1, r0 * 1.1], { bone: b('w'), mat: 'colSkin', k: 0.35 });
      arm.rc(fj.base.toArray(), fj.k1.toArray(), r0, r0 * 0.88, { bone: b('f' + fj.f), mat: 'colSkin', k: 0.3 });
      arm.ell(fj.k1.toArray(), [r0 * 0.95, r0 * 0.95, r0 * 0.95], { bone: b('f' + fj.f + 'b'), mat: 'colSkin', k: 0.25, tint: [0.86, 0.8, 0.76] });
      arm.rc(fj.k1.toArray(), fj.k2.toArray(), r0 * 0.86, r0 * 0.72, { bone: b('f' + fj.f + 'b'), mat: 'colSkin', k: 0.25 });
      arm.ell(fj.k2.toArray(), [r0 * 0.8, r0 * 0.8, r0 * 0.8], { bone: b('f' + fj.f + 'b'), mat: 'colSkin', k: 0.2, tint: [0.86, 0.8, 0.76] });
      arm.rc(fj.k2.toArray(), fj.tip.toArray(), r0 * 0.7, r0 * 0.42, { bone: b('f' + fj.f + 'b'), mat: 'colSkin', k: 0.2 });
      const nd = fj.tip.clone().sub(fj.k2).normalize();
      rig(b('f' + fj.f + 'b'), 'colBone', clawGeo(fj.tip.clone().addScaledVector(nd, -0.2), nd, pn, 2.4, 0.34));
    }
    // carne viva en las uniones y en los dedos ensangrentados
    arm.paint(S.toArray(), [4, 4, 4], { mat: 'colFlesh', tint: [0.8, 0.5, 0.46], edge: 0.5 });
    arm.paint(Hd.clone().addScaledVector(dir, 6).toArray(), [5, 3, 5], { tint: [0.6, 0.42, 0.4], edge: 0.6, k: 0.6 });
    arms.push({ name: 'brazo' + i, geo: arm.build(), mats: arm.mats, stats: arm.stats });
    // espolones de hueso en el codo
    for (let k = 0; k < 3; k++) {
      const off = up1.clone().multiplyScalar(0.7).add(V(R(-0.5, 0.5), R(-0.2, 0.6), R(-0.5, 0.5))).normalize();
      const base = E.clone().addScaledVector(off, 1.6);
      rig(b('e'), 'colBone', spikeGeo(base, base.clone().addScaledVector(off, 3.0 - k * 0.6), 0.6 - k * 0.12, { seg: 6 }));
    }
  });

  // ------------------------------------------------------------ piezas duras
  // un costillar gigante que asoma por el pecho
  for (let i = 0; i < 6; i++) {
    const y = 34 - i * 3.2;
    for (const sg of [1, -1]) {
      const pts = [V(sg * 1.5, y + 0.5, 14.6 - i * 0.5), V(sg * 7, y + 1.2, 13.6 - i * 0.4), V(sg * 12.5, y - 0.4, 9.6 - i * 0.2), V(sg * 15.5, y - 2.5, 3.6)];
      rig('chest', 'colBone', tubeGeo(pts, [1.0, 0.95, 0.85, 0.6], { radial: 7, perM: 0.8, aoEnds: true }));
    }
  }
  rig('chest', 'colBone', tubeGeo([V(0, 36, 14.7), V(0, 27, 14.3), V(0, 17, 12.6)], [1.3, 1.25, 1.0], { radial: 7 }));
  // los tubos del órgano de la Sé, clavados en la espalda como púas
  for (let i = 0; i < 18; i++) {
    const x = (i - 8.5) * 1.85 + R(-0.4, 0.4);
    const h = 9 + Math.cos((i - 8.5) * 0.3) * 10 + R(-1, 1);
    const base = V(x, 34 + Math.cos(x * 0.1) * 2, -10.5 - Math.abs(x) * 0.25);
    const d = V(x * 0.03, 1, -0.45).normalize();
    const r = 0.55 + (h / 19) * 0.38;
    rig('chest', 'iron', cylAlong(base, d, r, h, 10, 'iron'));
    rig('chest', 'black', cylAlong(base.clone().addScaledVector(d, h * 0.22), d, r * 1.02, r * 1.4, 10, 'black'));
    rig('chest', 'iron', cylAlong(base.clone().addScaledVector(d, h), d, r * 0.98, r * 1.4, 10, 'iron', r * 1.4));
    rig('chest', 'iron', torusAround(r * 1.05, 0.12, base.clone().addScaledVector(d, h * 0.62), d, 12));
  }
  // columnas de la cisterna y sillares que se lleva consigo, clavados en la carne
  for (const [x, y, z, yaw, tilt, L] of [
    [-19, 8, 12, 0.6, 30, 12],
    [21, 6, 9, -0.4, -40, 11],
    [12, 3, 20, 0.2, 70, 10],
    [-23, 3, -6, 1.2, 55, 13],
  ]) {
    const d = V(Math.sin(yaw) * Math.sin(tilt * DEG), Math.cos(tilt * DEG), Math.cos(yaw) * Math.sin(tilt * DEG)).normalize();
    rig('body', 'ashlar', cylAlong(V(x, y, z), d, 1.1, L, 10, 'ashlar'));
    rig('body', 'ashlar', hardGeo({ type: 'box', s: [2.8, 1.0, 2.8], p: V(x, y, z).addScaledVector(d, L).toArray(), r: [R(-20, 20), R(0, 90), R(-20, 20)], mat: 'ashlar' }));
  }
  // raíces de carne que se arrastran por el suelo de la nave
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + R(-0.15, 0.15);
    const r0 = 22 + R(-2, 2),
      L = R(8, 16);
    const pts = [];
    for (let k = 0; k <= 5; k++) {
      const u = k / 5;
      const rr = r0 + L * u;
      const aa = a + Math.sin(u * 3 + i) * 0.12;
      pts.push(V(Math.sin(aa) * rr, 1.2 - u * 1.0 + Math.sin(u * 7 + i) * 0.3, Math.cos(aa) * rr * 0.9 - 2));
    }
    rig('root', 'colFlesh', tubeGeo(pts, [1.6, 1.3, 1.0, 0.75, 0.5, 0.2], { radial: 7, perM: 0.8, aoEnds: true }), { giant: { amp: 0.12, freq: 0.15, speed: 0.7 } });
  }

  // ------------------------------------------------------------ sigilos, trepar y efectos
  const SIGILS = [];
  const CLIMB = {};
  DEO_ARMS.forEach((a, i) => {
    if (!a.sigil) return;
    const E = V(...a.e),
      W = V(...a.w);
    const { Hd, dir, pn, side } = handFrame(a);
    const dors = pn.clone().negate();
    const sp = E.clone().lerp(W, 0.16).addScaledVector(dors, 1.75);
    SIGILS.push({ id: 'brazo' + i, arm: i, bone: `a${i}e`, pos: sp.toArray(), normal: dors.toArray(), r: 2.0, hp: 3 });
    // (se talla en la piel del brazo al montar la pelea: sigil_decal.js)
    // de los nudillos al sigilo por el dorso de la mano y del antebrazo
    const fj = fingerJoints(a)[1];
    const pts = [];
    const add = (bone, p, n, extra = {}) => pts.push({ bone, p: p.toArray(), n: n.toArray(), ...extra });
    add(`a${i}f1`, fj.base.clone().addScaledVector(dors, 0.8), dors);
    add(`a${i}w`, Hd.clone().lerp(W, 0.35).addScaledVector(dors, 1.05), dors, { rest: true });
    add(`a${i}w`, W.clone().addScaledVector(dors, 1.2), dors);
    for (const u of [0.85, 0.62, 0.4, 0.22]) add(`a${i}e`, E.clone().lerp(W, u).addScaledVector(dors, 1.55 + (1 - u) * 0.25), dors);
    CLIMB['brazo' + i] = { width: 2.4, pts, sigil: 'brazo' + i, arm: i };
  });
  // los ojos, al fondo de las cuencas (la cara baja hasta la plaza al final)
  for (const s of [1, -1]) {
    const id = s > 0 ? 'ojoL' : 'ojoR';
    const p = V(...P(s * 1.85, 0.6, 0.15));
    const n = V(0, 0, 1).applyQuaternion(mq);
    SIGILS.push({ id, bone: 'head', pos: p.toArray(), normal: n.toArray(), r: 1.2, hp: 2, eye: true });
  }
  // la grieta, del mentón a la cuenca izquierda (se mete dentro: en el fondo
  // de la cuenca se está de pie, junto al ojo); de ahí, por encima del
  // puente de la nariz, a la cuenca derecha. (Por fuera de la superficie lo
  // que haga falta: colgado, el pecho queda contra el bronce.)
  {
    const nf = V(0, 0, 1).applyQuaternion(mq).toArray(),
      nu = V(0, 1, 0).applyQuaternion(mq).toArray();
    const out = (c, dz = 0.6) => [c[0], c[1], c[2] + dz];
    const path = [
      out(crack[7]),
      out(crack[6]),
      out(crack[5]),
      out(crack[4]),
      [1.85, -0.1, 2.15],
      [1.85, -0.05, 1.15, 'floor'],
      [1.55, 0.05, 2.15],
      [1.0, 1.0, 2.35],
      [0, 1.45, 2.7],
      [-1.0, 1.0, 2.35],
      [-1.55, 0.05, 2.15],
      [-1.85, -0.05, 1.15, 'floor'],
    ];
    const pts = path.map((c) => ({ bone: 'head', p: P(c[0], c[1], c[2]), n: c[3] ? nu : nf, ...(c[3] ? { rest: true } : {}) }));
    CLIMB.mascara = { width: 1.2, pts, sigils: ['ojoL', 'ojoR'], final: true };
  }
  const FX = {
    eyes: [1, -1].map((s) => ({ bone: 'head', p: P(s * 1.85, 0.6, 0.2) })),
    mouth: { bone: 'head', p: P(0, -3.15, 1.0) },
    faces: faces.flatMap((f) =>
      [-1, 1].map((sx) => {
        const dx = Math.sin(f.yaw),
          dz = Math.cos(f.yaw);
        return { bone: f.bone, p: [f.c[0] + dx * 1.3 * f.s + Math.cos(f.yaw) * 0.75 * f.s * sx, f.c[1] + 0.6 * f.s, f.c[2] + dz * 1.3 * f.s - Math.sin(f.yaw) * 0.75 * f.s * sx], s: f.s };
      })
    ),
  };
  const stats = { body: body.stats, mask: mask.stats, arms: arms.map((a) => a.stats), ms: Math.round(performance.now() - t0) };
  return {
    bones: DEO_BONES,
    skinned: [{ name: 'body', geo: bodyGeo, mats: body.mats, matOpts: {} }, ...arms.map((a) => ({ name: a.name, geo: a.geo, mats: a.mats, matOpts: {} }))],
    rigid: H,
    groups: {},
    extra: { sigils: SIGILS, climb: CLIMB, fx: FX, arms: DEO_ARMS.map((a) => ({ id: a.id, sigil: !!a.sigil })), sizes: DEO },
    stats,
  };
}

export function buildDeo(o = {}) {
  const t0 = performance.now();
  const d = deoData(o);
  const model = assemble(d, o);
  return { model, data: d, info: { name: 'Deo Ignoto', height: DEO.height, reach: DEO.reach, ms: Math.round(performance.now() - t0), sculpt: d.stats } };
}
