// PLAN A, verdadera forma: DEO IGNOTO (56 m; 87 con las manos alzadas).
//
// Cuando el Turiferario revienta, lo que dormía en la cisterna del Dios
// Desconocido se levanta detrás de la catedral, rompiendo la muralla norte:
// una montaña de carne que sale de la tierra hasta la cintura, con la joroba
// por encima de las torres de la Sé. Por cara lleva una máscara de bronce
// romana, serena, con las cuencas vacías (las incrustaciones se perdieron
// hace mil años) y una diadema con la inscripción DEO IGNOTO; una grieta le
// cruza la cara y por ella rezuma la carne. Seis brazos larguísimos, de tres
// tramos, le salen de los hombros como una aureola: los dos de delante se
// apoyan sobre la catedral (uno agarra la torre), otros dos sobre los
// tejados de los barrios y los dos de atrás se alzan al cielo con las manos
// abiertas. En la espalda, los tubos del órgano de la Sé clavados como púas;
// por el cuerpo, caras de fieles grandes como casas y bultos que laten.
import * as THREE from 'three';
import { Sculpt, ColossusModel, tubeGeo, hardGeo, V } from './sculpt_v1.js';
import { ColFX } from './colfx_v1.js';
import { RNG } from '../../src/core/util.js';

const DEG = Math.PI / 180;

// Brazos: [hombro, codo, muñeca, mano] en el espacio del modelo (el origen,
// en el suelo, en el centro del cuerpo; +z hacia la catedral).
const ARMS = [
  // delante: agarran las torres de la fachada por detrás (el modelo se
  // coloca con su centro en la nave, 36 m detrás de la fachada)
  { s: [11, 37, 5], e: [19, 47, 16], w: [11.5, 36, 28.5], h: [9.3, 31.5, 33.5], spread: 1, curl: 1.6 },
  { s: [-11, 37, 5], e: [-19.5, 46, 15], w: [-11.8, 35.5, 28], h: [-9.4, 31.2, 33.4], spread: 1, curl: 1.6 },
  // a los lados, sobre los tejados de los barrios
  { s: [18, 31, 0], e: [34, 41, 10], w: [42, 22, 21], h: [43.5, 13, 26], spread: 1.2, curl: 1 },
  { s: [-18, 31, 0], e: [-35, 39, 8], w: [-43, 21, 19], h: [-45, 12.5, 24], spread: 1.2, curl: 1 },
  // detrás, alzados al cielo
  { s: [9, 41, -7], e: [21, 56, -10], w: [25, 69, -4], h: [26, 75, -1], spread: 1.4, up: true },
  { s: [-9, 41, -7], e: [-22, 55, -11], w: [-27, 67, -5], h: [-28, 73, -2], spread: 1.4, up: true },
];

function bonesDef() {
  const B = [
    { name: 'root', pos: [0, 0, 0] },
    { name: 'body', parent: 'root', pos: [0, 16, 0] },
    { name: 'chest', parent: 'body', pos: [0, 30, 2] },
    { name: 'head', parent: 'chest', pos: [0, 42, 10] },
    { name: 'jaw', parent: 'head', pos: [0, 40, 15] },
  ];
  ARMS.forEach((a, i) => {
    B.push({ name: `a${i}s`, parent: 'chest', pos: a.s });
    B.push({ name: `a${i}e`, parent: `a${i}s`, pos: a.e });
    B.push({ name: `a${i}w`, parent: `a${i}e`, pos: a.w });
    B.push({ name: `a${i}h`, parent: `a${i}w`, pos: a.h });
  });
  return B;
}

export function buildDeoIgnoto(o = {}) {
  const M = new ColossusModel(bonesDef());
  const rng = new RNG(o.seed || 13);
  const H = [];
  const tube = (bone, mat, pts, radii, opt = {}) => H.push({ bone, mat, geo: tubeGeo(pts.map((p) => (p.isVector3 ? p : V(...p))), radii, opt) });

  // ======================================================================= el cuerpo
  const body = new Sculpt({
    cell: o.cell || 0.72,
    bones: M.index,
    noise: { amp: 0.35, freq: 0.22, oct: 3, lump: 1.4, lumpFreq: 0.045, vein: 0.32, veinFreq: 0.11 },
    aoDist: 7,
    aoStrength: 1.2,
    matNoise: 0.9,
    macro: [
      { freq: 0.035, color: [0.6, 0.46, 0.6], amt: 0.7, thr: 0.58 },
      { freq: 0.06, color: [0.7, 0.4, 0.36], amt: 0.5, thr: 0.66 },
    ],
  });
  // la base: sale de la tierra (medio enterrada)
  body.ell([0, 2, -2], [27, 11, 24], { bone: 'root', mat: 'colFlesh', k: 4, n: 1.2 });
  body.ell([0, 14, 0], [21, 13, 17], { bone: 'body', mat: 'colSkin', k: 5 });
  // el torso inclinado hacia la ciudad y la joroba
  body.ell([0, 27, 3], [17, 12, 13], { bone: 'chest', mat: 'colSkin', k: 5, rot: [16, 0, 0] });
  body.ell([0, 35, -3], [19, 9, 12], { bone: 'chest', mat: 'colSkin', k: 5, rot: [-10, 0, 0] });
  body.ell([0, 39, 3], [10, 7, 9], { bone: 'chest', mat: 'colSkin', k: 4 });
  // hombros de los seis brazos (bultos de carne donde nacen)
  ARMS.forEach((a, i) => body.ell(a.s, [5.2, 4.6, 5.2], { bone: `a${i}s`, mat: i < 4 ? 'colFlesh' : 'colSkin', k: 3.5, n: 1.3 }));
  // el cuello que sostiene la máscara
  body.rc([0, 37, 4], [0, 43, 10], 8.5, 7.4, { bone: 'head', mat: 'colFlesh', k: 3, n: 1.4 });
  body.ell([0, 45, 8.5], [8.8, 10.4, 7.2], { bone: 'head', mat: 'colFlesh', k: 3, n: 1.2 });
  // carne que cuelga bajo la máscara (papada de bocas y lenguas)
  body.ell([0, 34.5, 14.5], [7, 5.5, 4.5], { bone: 'jaw', mat: 'colFlesh', k: 2.5, n: 1.6, vn: 1.5 });
  // tumores y bultos que laten
  for (let i = 0; i < 26; i++) {
    const a = rng.range(-Math.PI * 0.95, Math.PI * 0.95);
    const y = rng.range(6, 36);
    const R = 20 - Math.max(0, y - 22) * 0.5 + rng.range(-2, 1);
    const r = rng.range(2.2, 4.8);
    body.ell([Math.sin(a) * R, y, Math.cos(a) * R * 0.85], [r, r * rng.range(0.7, 1.2), r], { bone: y < 20 ? 'body' : 'chest', mat: rng.chance(0.55) ? 'colFlesh' : 'colSkin', k: 2.5, n: 1.6, vn: 1.8 });
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
  ]) {
    const dx = Math.sin(yaw),
      dz = Math.cos(yaw);
    const c = [x, y, z];
    body.ell(c, [2.1 * s, 2.7 * s, 1.6 * s], { bone: y < 20 ? 'body' : 'chest', mat: 'colSkin', k: 1.2, rot: [0, yaw / DEG, 0], n: 0.5, tint: [1, 0.96, 0.9] });
    // cuencas y boca abierta (talladas)
    for (const sx of [-1, 1]) body.ell([x + dx * 1.2 * s + Math.cos(yaw) * 0.75 * s * sx, y + 0.6 * s, z + dz * 1.2 * s - Math.sin(yaw) * 0.75 * s * sx], [0.42 * s, 0.38 * s, 0.4 * s], { sub: true, k: 0.3 });
    body.ell([x + dx * 1.3 * s, y - 1.05 * s, z + dz * 1.3 * s], [0.55 * s, 0.85 * s, 0.6 * s], { sub: true, k: 0.35 });
    faces.push({ c, s, yaw });
  }
  const bodyGeo = body.build();
  M.skinned(bodyGeo, body.mats);

  // ======================================================================= la máscara de bronce
  const mask = new Sculpt({ cell: o.maskCell || 0.26, bones: M.index, noise: { amp: 0.03, freq: 0.8, oct: 2, lump: 0.06, lumpFreq: 0.2, vein: 0, veinFreq: 0.3 }, aoDist: 1.6, aoStrength: 1.3, matNoise: 0 });
  // espacio de la máscara: centro de la cara y su inclinación (mira hacia abajo, a la plaza)
  const MC = V(0, 45.5, 15.2);
  const MS = 1.3;
  const mq = new THREE.Quaternion().setFromEuler(new THREE.Euler(18 * DEG, 0, 0));
  const P = (x, y, z) => V(x * MS, y * MS, z * MS).applyQuaternion(mq).add(MC).toArray();
  const mk = (fn, x, y, z, r, opt = {}) => mask[fn](P(x, y, z), Array.isArray(r) ? r.map((q) => q * MS) : r * MS, { bone: 'head', mat: 'colBronze', ...opt, k: (opt.k ?? 0.5) * MS, rot: opt.rot ? [opt.rot[0] + 18, opt.rot[1], opt.rot[2]] : [18, 0, 0] });
  const mrc = (a, b, ra, rb, opt = {}) => mask.rc(P(...a), P(...b), ra * MS, rb * MS, { bone: 'head', mat: 'colBronze', ...opt, k: (opt.k ?? 0.4) * MS });
  // volumen de la cara (frente, mejillas, mentón)
  mk('ell', 0, 0.8, -1.4, [5.2, 6.9, 3.0], { k: 1.2 });
  mk('ell', 0, 3.4, -0.6, [4.6, 2.6, 2.4], { k: 1.0 }); // frente
  for (const s of [1, -1]) {
    mk('ell', s * 2.6, -0.9, 0.0, [1.9, 2.3, 1.7], { k: 0.9 }); // mejillas
    mk('ell', s * 4.3, 0.8, -1.6, [1.0, 2.8, 1.8], { k: 0.8 }); // sienes
  }
  mk('ell', 0, -5.0, -0.5, [2.2, 1.5, 1.6], { k: 0.8 }); // mentón
  // arco de las cejas y nariz griega, recta desde la frente
  mrc([-3.4, 1.9, 1.2], [-0.4, 1.7, 1.75], 0.75, 0.62, { k: 0.5 });
  mrc([3.4, 1.9, 1.2], [0.4, 1.7, 1.75], 0.75, 0.62, { k: 0.5 });
  mrc([0, 1.6, 1.85], [0, -1.5, 3.0], 0.55, 0.85, { k: 0.45 });
  mk('ell', 0, -1.7, 2.75, [0.95, 0.6, 0.75], { k: 0.35 }); // punta de la nariz
  // labios (la boca entreabierta)
  mk('ell', 0, -2.75, 1.55, [1.75, 0.5, 0.75], { k: 0.4 });
  mk('ell', 0, -3.55, 1.45, [1.5, 0.55, 0.75], { k: 0.4 });
  // diadema con la inscripción
  mrc([-4.9, 4.6, -1.2], [0, 5.1, 1.0], 0.55, 0.55, { k: 0.3 });
  mrc([4.9, 4.6, -1.2], [0, 5.1, 1.0], 0.55, 0.55, { k: 0.3 });
  // rizos sobre la frente y en las sienes
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 30 - row * 4; i++) {
      const n = 30 - row * 4;
      const a = -1.5 + (i / (n - 1)) * 3.0 + row * 0.05;
      const r = 5.0 + row * 0.35;
      mk('ell', Math.sin(a) * r, 5.75 + row * 0.75 + Math.cos(a) * 1.1, -0.95 - row * 0.4 - Math.abs(Math.sin(a)) * 2.2, [0.52, 0.5, 0.5], { k: 0.18 });
    }
  // tallas: cuencas vacías, orificios de la nariz, la boca, la grieta
  for (const s of [1, -1]) {
    mk('ell', s * 1.85, 0.6, 1.3, [1.25, 0.7, 1.1], { sub: true, k: 0.35 }); // la cuenca (forma de almendra)
    mk('ell', s * 0.42, -1.95, 2.9, [0.22, 0.18, 0.3], { sub: true, k: 0.1 });
  }
  mk('ell', 0, -3.15, 1.9, [1.25, 0.2, 0.9], { sub: true, k: 0.12 });
  // la grieta: de la frente a la mejilla izquierda
  const crack = [
    [1.0, 6.2, 0.6],
    [0.6, 4.5, 1.6],
    [1.3, 3.0, 1.75],
    [0.9, 1.8, 2.0],
    [1.9, 0.2, 1.85],
    [2.4, -1.6, 1.6],
    [3.6, -3.2, 0.9],
  ];
  for (let i = 0; i < crack.length - 1; i++) mrc(crack[i], crack[i + 1], 0.32, 0.3, { sub: true, k: 0.12 });
  const maskGeo = mask.build();
  M.skinned(maskGeo, mask.mats);
  // la inscripción DEO IGNOTO en la diadema (letras en relieve, oro)
  for (let i = 0; i < 9; i++) {
    const a = -0.75 + (i / 8) * 1.5;
    const lp = P(Math.sin(a) * 4.0, 5.05 - Math.abs(Math.sin(a)) * 0.35, 1.05 - Math.abs(Math.sin(a)) * 1.9);
    H.push({ bone: 'head', mat: 'gold', geo: hardGeo({ type: 'box', s: [0.42 * MS, 0.55 * MS, 0.14 * MS], p: lp, r: [18, a / DEG, 0], mat: 'gold' }) });
  }
  // la carne que rezuma por la grieta
  tube('head', 'colFlesh', crack.map((c) => V(...P(c[0], c[1], c[2] - 0.15))), [0.26, 0.3, 0.28, 0.32, 0.3, 0.26, 0.2].map((r) => r * MS), { radial: 6, perM: 1.5 });

  // ======================================================================= los brazos
  ARMS.forEach((a, i) => {
    const arm = new Sculpt({
      cell: o.armCell || 0.46,
      bones: M.index,
      noise: { amp: 0.16, freq: 0.35, oct: 3, lump: 0.6, lumpFreq: 0.08, vein: 0.22, veinFreq: 0.2 },
      aoDist: 3.5,
      aoStrength: 1.1,
      matNoise: 0.8,
      macro: [
        { freq: 0.07, color: [0.62, 0.48, 0.62], amt: 0.7, thr: 0.6 },
        { freq: 0.13, color: [0.72, 0.42, 0.38], amt: 0.5, thr: 0.68 },
      ],
    });
    const b = (n) => `a${i}${n}`;
    const S = V(...a.s),
      E = V(...a.e),
      W = V(...a.w),
      Hd = V(...a.h);
    // tramo de arriba: piel pálida sobre el hueso, con el músculo desollado
    // asomando por dentro y un tendón por fuera
    arm.rc(S.toArray(), E.toArray(), 2.2, 1.55, { bone: b('s'), mat: 'colSkin', k: 0.9 });
    const ax1 = E.clone().sub(S).normalize();
    const sd1 = V(0, 1, 0).cross(ax1).normalize();
    const up1 = ax1.clone().cross(sd1).normalize();
    arm.ell(S.clone().lerp(E, 0.38).addScaledVector(up1, -0.9).toArray(), [1.7, 1.7, 4.2], { bone: b('s'), mat: 'colFleshDim', k: 0.9, rot: dirRot(ax1), n: 1.4 });
    arm.rc(S.clone().lerp(E, 0.15).addScaledVector(sd1, 1.7).toArray(), E.clone().addScaledVector(sd1, 1.15).toArray(), 0.42, 0.34, { bone: b('s'), mat: 'colSkin', k: 0.45, tint: [0.92, 0.86, 0.82] });
    // el codo: hueso desnudo
    arm.ell(E.toArray(), [1.85, 1.85, 1.85], { bone: b('e'), mat: 'colBone', k: 0.7, n: 0.5 });
    // antebrazo de músculo vivo, con una articulación de más y tendones pálidos
    const M2 = E.clone().lerp(W, 0.5);
    const ax2 = W.clone().sub(E).normalize();
    const sd2 = V(0, 1, 0).cross(ax2).normalize();
    const up2 = ax2.clone().cross(sd2).normalize();
    arm.rc(E.toArray(), M2.toArray(), 1.45, 1.15, { bone: b('e'), mat: 'colFleshDim', k: 0.6, n: 1.4, vn: 1.6 });
    arm.ell(M2.toArray(), [1.35, 1.35, 1.35], { bone: b('e'), mat: 'colBone', k: 0.5, n: 0.5 });
    arm.rc(M2.toArray(), W.toArray(), 1.15, 0.9, { bone: b('e'), mat: 'colFleshDim', k: 0.55, n: 1.4, vn: 1.6 });
    for (const sg of [1, -1]) arm.rc(E.clone().addScaledVector(sd2, sg * 1.05).addScaledVector(up2, 0.5).toArray(), W.clone().addScaledVector(sd2, sg * 0.6).addScaledVector(up2, 0.4).toArray(), 0.3, 0.22, { bone: b('e'), mat: 'colSkin', k: 0.3, tint: [0.95, 0.9, 0.86] });
    arm.ell(W.toArray(), [1.1, 1.0, 1.1], { bone: b('w'), mat: 'colBone', k: 0.5 });
    // la mano: palma estrecha y gruesa de la muñeca a los nudillos
    const dir = Hd.clone().sub(W).normalize();
    const palmC = W.clone().lerp(Hd, 0.55);
    const yaw = Math.atan2(dir.x, dir.z) / DEG,
      pitch = -Math.asin(Math.max(-1, Math.min(1, dir.y))) / DEG;
    arm.box(palmC.toArray(), [1.75, 0.85, 2.3], { bone: b('h'), mat: 'colSkin', k: 0.6, round: 0.7, rot: [pitch, yaw, 0] });
    // tendones del dorso, de la muñeca a cada nudillo
    {
      const sideH = V(0, 1, 0).cross(dir).normalize();
      const upH = dir.clone().cross(sideH).normalize();
      for (let f = 0; f < 4; f++) {
        const t = (f - 1.5) * 0.62;
        arm.rc(W.clone().addScaledVector(sideH, t * 0.5).addScaledVector(upH, 0.6).toArray(), Hd.clone().addScaledVector(sideH, t * 1.55 * a.spread).addScaledVector(upH, 0.55).addScaledVector(dir, 0.3).toArray(), 0.28, 0.32, { bone: b('h'), mat: 'colSkin', k: 0.35, tint: [0.94, 0.9, 0.86] });
      }
    }
    // espolones de hueso en el codo
    for (let k = 0; k < 3; k++) {
      const off = V(rng.range(-1, 1), 1, rng.range(-1, 1)).normalize();
      H.push({ bone: b('e'), mat: 'colBone', geo: hardGeo({ type: 'cone', s: [0.6 - k * 0.12, 3.2 - k * 0.6], seg: 6, p: E.clone().addScaledVector(off, 2.2).toArray(), r: [off.z * 50, 0, -off.x * 50], mat: 'colBone' }) });
    }
    const g = arm.build();
    M.skinned(g, arm.mats);
    // dedos: cinco, de tres falanges, que se clavan en lo que agarran
    const side = V(0, 1, 0).cross(dir).normalize();
    const down = dir.clone().cross(side).normalize().negate();
    const up = !!a.up;
    for (let f = 0; f < 5; f++) {
      const thumb = f === 4;
      const t = thumb ? -1.1 : (f - 1.5) * 0.62;
      const base = Hd.clone().addScaledVector(side, t * 1.55 * a.spread).addScaledVector(dir, thumb ? -1.5 : 0.4);
      const L = thumb ? 7.5 : [9.2, 11.0, 10.6, 8.6][f];
      const fd = dir
        .clone()
        .addScaledVector(side, t * 0.55 * a.spread)
        .normalize();
      const curl = up ? -0.25 : a.curl ?? 0.9; // los de delante se agarran hacia abajo
      const k1 = base.clone().addScaledVector(fd, L * 0.4).addScaledVector(down, curl * L * 0.08);
      const k2 = k1.clone().addScaledVector(fd, L * 0.33).addScaledVector(down, curl * L * 0.22);
      const tip = k2.clone().addScaledVector(fd, L * 0.18).addScaledVector(down, curl * L * 0.3);
      tube(b('h'), 'colSkin', [base.clone().addScaledVector(dir, -1.0), base, k1, k2, tip], [0.66, 0.62, 0.56, 0.46, 0.24], { radial: 8, perM: 1.4 });
      for (const kk of [base, k1, k2]) H.push({ bone: b('h'), mat: 'colSkin', geo: hardGeo({ type: 'sphere', s: [kk === base ? 0.72 : 0.6], seg: 7, seg2: 5, p: kk.toArray(), mat: 'colSkin', tint: [0.9, 0.84, 0.8] }) });
      const nd = tip.clone().sub(k2).normalize();
      H.push({ bone: b('h'), mat: 'colBone', geo: coneAlong(tip, nd, 0.3, 2.2) });
    }
  });

  // ======================================================================= piezas duras
  // un costillar gigante que asoma por el pecho
  for (let i = 0; i < 6; i++) {
    const y = 34 - i * 3.2;
    for (const sg of [1, -1]) {
      const pts = [V(sg * 1.5, y + 0.5, 14.5 - i * 0.5), V(sg * 7, y + 1.2, 13.5 - i * 0.4), V(sg * 12.5, y - 0.4, 9.5 - i * 0.2), V(sg * 15.5, y - 2.5, 3.5)];
      tube('chest', 'colBone', pts, [1.0, 0.95, 0.85, 0.6], { radial: 7, perM: 0.8 });
    }
  }
  tube('chest', 'colBone', [V(0, 36, 14.6), V(0, 27, 14.2), V(0, 17, 12.5)], [1.3, 1.25, 1.0], { radial: 7 });
  // la nave de la Sé, reventada: muros y tejado en pedazos sobre los hombros y al pie
  for (let i = 0; i < 18; i++) {
    const onBody = i < 7;
    const a2 = rng.range(-1.2, 1.2) + (onBody ? 0 : Math.PI * rng.range(-0.25, 0.25));
    const x = onBody ? rng.range(-15, 15) : rng.range(-14, 14);
    const y = onBody ? 36 + rng.range(-3, 3) : rng.range(0.5, 5);
    const z = onBody ? rng.range(-8, 4) : rng.range(22, 30);
    const wall = rng.chance(0.55);
    const s2 = wall ? [rng.range(4, 9), rng.range(3, 7), 2] : [rng.range(5, 10), 0.6, rng.range(3, 6)];
    H.push({ bone: onBody ? 'chest' : 'root', mat: wall ? 'ashlar' : 'roof', geo: hardGeo({ type: 'box', s: s2, p: [x, y, z], r: [rng.range(-35, 35), a2 / DEG, rng.range(-35, 35)], mat: wall ? 'ashlar' : 'roof' }) });
    if (!wall) H.push({ bone: onBody ? 'chest' : 'root', mat: 'wooddark', geo: hardGeo({ type: 'box', s: [s2[0] * 1.1, 0.4, 0.4], p: [x, y - 0.4, z], r: [rng.range(-35, 35), a2 / DEG, rng.range(-35, 35)], mat: 'wooddark' }) });
  }
  // arcos fajones partidos, aún en pie entre la fachada y el cuerpo
  for (const z of [26, 31]) {
    for (const sg of [1, -1]) {
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        const a3 = Math.PI * (sg > 0 ? t * 0.42 : 1 - t * 0.38);
        pts.push(V(Math.cos(a3) * 11, 9 + Math.sin(a3) * 11, z));
      }
      tube('root', 'ashlar', pts, Array(7).fill(0.9), { radial: 5, perM: 0.6 });
    }
  }
  // los tubos del órgano de la Sé, clavados en la espalda como púas
  for (let i = 0; i < 16; i++) {
    const x = (i - 7.5) * 1.9 + rng.range(-0.4, 0.4);
    const h = 9 + Math.cos((i - 7.5) * 0.32) * 9 + rng.range(-1, 1);
    const base = V(x, 34 + Math.cos(x * 0.1) * 2, -10 - Math.abs(x) * 0.25);
    const d = V(x * 0.03, 1, -0.45).normalize();
    const r = 0.55 + (h / 18) * 0.35;
    H.push({ bone: 'chest', mat: 'iron', geo: cylAlong(base, d, r, h, 10) });
    // la boca del tubo (el bisel) y el pie cónico
    H.push({ bone: 'chest', mat: 'black', geo: cylAlong(base.clone().addScaledVector(d, h * 0.22), d, r * 1.02, r * 1.4, 10) });
    H.push({ bone: 'chest', mat: 'iron', geo: coneAlong(base.clone().addScaledVector(d, h), d, r * 0.98, r * 1.6) });
  }
  // columnas de la cisterna y sillares que se lleva consigo, clavados en la carne
  for (const [x, y, z, yaw, tilt, L] of [
    [-19, 8, 12, 0.6, 30, 12],
    [21, 6, 9, -0.4, -40, 11],
    [12, 3, 20, 0.2, 70, 10],
    [-23, 3, -6, 1.2, 55, 13],
  ]) {
    const d = V(Math.sin(yaw) * Math.sin(tilt * DEG), Math.cos(tilt * DEG), Math.cos(yaw) * Math.sin(tilt * DEG)).normalize();
    H.push({ bone: 'body', mat: 'ashlar', geo: cylAlong(V(x, y, z), d, 1.1, L, 10) });
    H.push({ bone: 'body', mat: 'ashlar', geo: hardGeo({ type: 'box', s: [2.8, 1.0, 2.8], p: V(x, y, z).addScaledVector(d, L).toArray(), r: [rng.range(-20, 20), rng.range(0, 90), rng.range(-20, 20)], mat: 'ashlar' }) });
  }
  // escombros de la muralla y de la tierra reventada alrededor de la base
  for (let i = 0; i < 46; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(24, 36);
    const s = rng.range(1.0, 3.4);
    H.push({ bone: 'root', mat: rng.chance(0.6) ? 'ashlar' : 'rock', geo: hardGeo({ type: 'box', s: [s * 1.4, s * 0.8, s], p: [Math.sin(a) * r, s * 0.25 - 0.4, Math.cos(a) * r * 0.9 - 2], r: [rng.range(-30, 30), rng.range(0, 180), rng.range(-30, 30)], mat: 'ashlar' }) });
  }
  M.rigid(H);

  // ======================================================================= fuegos y brillos
  const fx = new ColFX(M);
  // ojos: dos brasas al fondo de las cuencas vacías
  for (const s of [1, -1]) {
    fx.glow('head', P(s * 1.85, 0.6, 0.2), 2.2, 0xffc070, { pulse: 0.06 });
    fx.glow('head', P(s * 1.85, 0.6, -0.1), 0.8, 0xffffff, { pulse: 0.04 });
  }
  // la boca y la garganta encendidas
  fx.glow('head', P(0, -3.15, 1.0), 1.6, 0xff5018, { pulse: 0.2, opacity: 0.6 });
  fx.light('head', P(0, -3.5, 5.0), 0xff7030, 70, 34);
  // las caras de los fieles: ojos que brillan débilmente
  for (const f of faces) for (const sx of [-1, 1]) {
    const dx = Math.sin(f.yaw),
      dz = Math.cos(f.yaw);
    fx.glow(f.c[1] < 20 ? 'body' : 'chest', [f.c[0] + dx * 1.3 * f.s + Math.cos(f.yaw) * 0.75 * f.s * sx, f.c[1] + 0.6 * f.s, f.c[2] + dz * 1.3 * f.s - Math.sin(f.yaw) * 0.75 * f.s * sx], 0.9 * f.s, 0xff9050, { pulse: 0.1 });
  }
  return { model: M, fx, info: { name: 'Deo Ignoto', height: 56, reach: 87, sculpt: [body.stats, mask.stats] } };
}

// rotación (grados, XYZ) que lleva el eje Z local a la dirección d
function dirRot(d) {
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  return [e.x / DEG, e.y / DEG, e.z / DEG];
}
// cilindro de la base b en la dirección d (radio r, largo L)
function cylAlong(b, d, r, L, seg = 8) {
  const g = hardGeo({ type: 'cyl', s: [r, r, L], seg, p: [0, L / 2, 0], mat: 'iron', ao: false });
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d));
  g.translate(b.x, b.y, b.z);
  return g;
}
// cono con la base en b, apuntando en d
function coneAlong(b, d, r, L) {
  const g = hardGeo({ type: 'cone', s: [r, L], seg: 6, p: [0, L / 2, 0], mat: 'colBone', ao: false });
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d));
  g.translate(b.x, b.y, b.z);
  return g;
}
