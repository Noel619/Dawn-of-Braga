// EL TURIFERARIO, coloso (21 m; 26 con la aureola). Versión 2, la del juego.
//
// El arzobispo, crecido hasta las bóvedas: un sacerdote enjuto y encorvado,
// con la cabeza colgando por delante de una joroba de buitre, el pecho
// abierto como dos puertas (dentro arde el núcleo, el carbón del incienso),
// brazos larguísimos de hueso y piel con manos de cinco dedos, piernas
// descarnadas bajo el alba hecha jirones y, detrás, la cola de los fieles
// fundidos que arrastra por las calles. Encima, la casulla carmesí con sus
// cenefas de oro (la cruz en Y de la espalda es el camino para trepar), rota
// por delante. Por cara, una jaula de hierro con púas; la mitra partida en
// dos, cada mitad clavada en un cuerno de hueso; detrás, la aureola de
// hierro con once cirios. Con la derecha arrastra, por una cadena, la campana
// mayor de la Sé hecha incensario.
//
// Sigilos del Pacto (los puntos débiles): en la nuca, en el dorso de la mano
// de la cadena y el núcleo del pecho. Las superficies por las que se trepa
// van en extra.climb (puntos en el espacio del modelo, cada uno con su hueso).
//
// Espacio del modelo: el origen en el suelo entre los pies, mira hacia +z;
// +x es su izquierda.
import * as THREE from 'three';
import { Sculpt, tubeGeo, hardGeo, V, perlin } from './sculpt.js';
import { clothRing } from './cloth.js';
import { torusAround, chainGeo, ribbonGeo, spikeGeo, clawGeo, bellParts, withColor, shadeBy, mulberry } from './parts.js';
import { assemble } from './model.js';

const DEG = Math.PI / 180;

// ------------------------------------------------------------ esqueleto
const HAND = (s) => {
  // dedos: [nombre, base (nudillo), articulación media, punta]
  const x = (v) => v * s;
  return [
    ['f1', [x(4.98), 5.16, 2.95], [x(4.96), 3.95, 3.62], [x(4.86), 2.95, 3.98]],
    ['f2', [x(5.36), 5.06, 2.74], [x(5.52), 3.68, 3.3], [x(5.6), 2.55, 3.62]],
    ['f3', [x(5.72), 5.14, 2.42], [x(5.96), 3.86, 2.88], [x(6.1), 2.85, 3.12]],
    ['f4', [x(6.02), 5.34, 2.02], [x(6.3), 4.36, 2.3], [x(6.46), 3.6, 2.44]],
    ['th', [x(4.62), 5.92, 2.7], [x(4.36), 5.06, 3.38], [x(4.24), 4.38, 3.86]],
  ];
};
const TATTERS = 8;
const tatTh = (i) => (i / TATTERS) * Math.PI * 2 + Math.PI / TATTERS;

function bonesDef() {
  const B = [
    { name: 'root', pos: [0, 0, 0] },
    { name: 'pelvis', parent: 'root', pos: [0, 7.4, -0.2] },
    { name: 'spine1', parent: 'pelvis', pos: [0, 9.0, -0.5] },
    { name: 'spine2', parent: 'spine1', pos: [0, 10.8, -0.9] },
    { name: 'chest', parent: 'spine2', pos: [0, 12.6, -0.7] },
    { name: 'neck1', parent: 'chest', pos: [0, 14.9, 0.3] },
    { name: 'neck2', parent: 'neck1', pos: [0, 15.55, 1.7] },
    { name: 'head', parent: 'neck2', pos: [0, 15.75, 2.95] },
    { name: 'jaw', parent: 'head', pos: [0, 15.55, 3.55] },
    { name: 'halo', parent: 'head', pos: [0, 18.6, 1.75] },
    { name: 'ribL', parent: 'chest', pos: [1.86, 12.5, 0.55] },
    { name: 'ribR', parent: 'chest', pos: [-1.86, 12.5, 0.55] },
    { name: 'casB1', parent: 'chest', pos: [0, 13.6, -2.9] },
    { name: 'casB2', parent: 'casB1', pos: [0, 10.7, -3.7] },
    { name: 'casB3', parent: 'casB2', pos: [0, 7.8, -4.05] },
  ];
  for (const [s, S] of [
    [1, 'L'],
    [-1, 'R'],
  ]) {
    B.push(
      { name: 'clav' + S, parent: 'chest', pos: [0.7 * s, 14.3, 0.0] },
      { name: 'arm' + S, parent: 'clav' + S, pos: [2.9 * s, 14.15, -0.3] },
      { name: 'fore' + S, parent: 'arm' + S, pos: [4.3 * s, 10.4, 0.6] },
      { name: 'hand' + S, parent: 'fore' + S, pos: [4.9 * s, 6.6, 2.0] }
    );
    for (const [f, a, b] of HAND(s)) {
      B.push({ name: f + S, parent: 'hand' + S, pos: a }, { name: f + S + 'b', parent: f + S, pos: b });
    }
    B.push(
      { name: 'leg' + S, parent: 'pelvis', pos: [1.3 * s, 7.2, -0.1] },
      { name: 'shin' + S, parent: 'leg' + S, pos: [1.48 * s, 4.0, 0.75] },
      { name: 'foot' + S, parent: 'shin' + S, pos: [1.6 * s, 0.92, -0.2] },
      { name: 'toe' + S, parent: 'foot' + S, pos: [1.7 * s, 0.34, 1.45] },
      { name: 'casF' + S, parent: 'chest', pos: [1.25 * s, 13.1, 2.15] },
      { name: 'casF' + S + '2', parent: 'casF' + S, pos: [1.55 * s, 10.4, 2.65] },
      { name: 'casS' + S, parent: 'chest', pos: [2.65 * s, 12.7, -0.7] },
      { name: 'casS' + S + '2', parent: 'casS' + S, pos: [3.05 * s, 9.6, -0.9] }
    );
  }
  // la cola de los fieles
  const T = [
    [0, 6.8, -1.6],
    [0, 4.8, -3.6],
    [0, 2.6, -6.2],
    [0, 1.3, -9.2],
    [0, 0.95, -12.4],
    [0, 0.75, -15.5],
  ];
  T.forEach((p, i) => B.push({ name: 'tail' + (i + 1), parent: i ? 'tail' + i : 'pelvis', pos: p }));
  // jirones del alba: dos tramos por jirón
  for (let i = 0; i < TATTERS; i++) {
    const th = tatTh(i);
    const back = Math.max(0, -Math.cos(th));
    B.push({ name: 'tat' + i, parent: 'pelvis', pos: [Math.sin(th) * 2.35, 6.5, Math.cos(th) * 2.15 - 0.25 - back * 0.4] });
    B.push({ name: 'tat' + i + 'b', parent: 'tat' + i, pos: [Math.sin(th) * 2.85, 3.7, Math.cos(th) * 2.6 - 0.25 - back * 0.7] });
  }
  return B;
}
export const TUR_BONES = bonesDef();

// ------------------------------------------------------------ medidas para la pelea
export const TUR = {
  height: 21,
  halo: 26,
  bellH: 6.2,
  // eslabones de la cadena (la física la lleva la pelea)
  chain: { len: 9.5, links: 26, linkR: 0.32 },
  // pies (para pisadas, pisotones y colisión)
  feet: ['footL', 'footR'],
};

// ======================================================================= geometría
export function turiferarioData(o = {}) {
  const t0 = performance.now();
  const BI = {};
  TUR_BONES.forEach((b, i) => (BI[b.name] = i));
  const RW = {};
  for (const b of TUR_BONES) RW[b.name] = V(...b.pos);
  const rnd = mulberry(o.seed ?? 7);
  const R = (a, b) => a + (b - a) * rnd();
  const H = []; // piezas rígidas
  const rig = (bone, mat, geo, extra = {}) => H.push({ bone, mat, geo, ...extra });
  const mir = (fn) => {
    fn(1, 'L');
    fn(-1, 'R');
  };

  // ------------------------------------------------------------ el cuerpo (carne)
  const sc = new Sculpt({
    cell: o.cell ?? 0.15,
    bones: BI,
    noise: { amp: 0.045, freq: 1.1, oct: 3, lump: 0.11, lumpFreq: 0.22, vein: 0.05, veinFreq: 0.55 },
    aoDist: 1.7,
    aoStrength: 1.15,
    matNoise: 0.55,
    matFreq: 0.7,
    weightSmooth: 3,
    weightSmoothK: 0.55,
    macro: [{ freq: 0.18, color: [0.82, 0.74, 0.68], amt: 0.35, thr: 0.55 }],
  });
  const SKIN = [0.93, 0.89, 0.84],
    DARK = [0.7, 0.62, 0.58];

  // pelvis y vientre hundido (bajo el alba)
  sc.ell([0, 7.5, -0.3], [1.95, 1.15, 1.45], { bone: 'pelvis', mat: 'colSkin', k: 0.7, tint: DARK });
  sc.rc([0, 7.9, -0.1], [0, 10.2, -0.45], 1.45, 1.55, { bone: 'spine1', mat: 'colSkin', k: 0.8, tint: SKIN });
  sc.ell([0, 9.6, 0.55], [1.25, 1.0, 0.55], { bone: 'spine1', mat: 'colSkin', k: 0.6, n: 0.6 });
  // costillar (por detrás y por los lados: por delante se abre)
  sc.ell([0, 12.35, -0.45], [2.0, 2.3, 1.72], { bone: 'chest', mat: 'colSkin', k: 0.9, tint: SKIN, n: 0.7 });
  sc.ell([0, 11.0, -0.75], [1.65, 1.3, 1.45], { bone: 'spine2', mat: 'colSkin', k: 0.9, tint: SKIN });
  // costillas marcadas bajo la piel, de la espina a los costados
  for (let i = 0; i < 7; i++) {
    const y = 13.75 - i * 0.48;
    const rx = 1.82 + Math.sin((i / 6) * Math.PI) * 0.2,
      rz = 1.62;
    for (const s of [1, -1]) {
      const pts = [];
      for (let a = 0; a <= 4; a++) {
        const th = Math.PI * (0.98 - a * 0.17);
        pts.push([s * Math.sin(th) * rx, y - a * 0.11, Math.cos(th) * rz - 0.45]);
      }
      sc.tube(pts, [0.11, 0.13, 0.14, 0.13, 0.12], { bone: 'chest', mat: 'colSkin', k: 0.16, n: 0.35 });
    }
  }
  // el hueco del pecho, tras las puertas del costillar (carne viva dentro)
  sc.ell([0, 12.25, 1.25], [1.25, 1.75, 1.05], { sub: true, k: 0.3 });
  sc.paint([0, 12.25, 0.9], [1.45, 1.95, 1.2], { mat: 'colFlesh', tint: [0.75, 0.5, 0.48], edge: 0.25 });
  // la joroba (bajo la casulla) y los omóplatos
  sc.ell([0, 14.25, -1.85], [2.35, 1.95, 2.05], { bone: 'chest', mat: 'colSkin', k: 1.0, tint: SKIN });
  mir((s) => sc.ell([1.35 * s, 13.25, -2.05], [1.0, 1.45, 0.45], { bone: 'clav' + (s > 0 ? 'L' : 'R'), mat: 'colSkin', k: 0.5, rot: [0, 0, -12 * s], n: 1.1 }));
  // espina dorsal: apófisis bajo la piel
  for (let i = 0; i < 9; i++) {
    const y = 15.1 - i * 0.82;
    const z = -3.65 + Math.min(i, 3) * 0.12 + Math.max(0, i - 3) * 0.3;
    sc.ell([0, y, z], [0.32, 0.26, 0.3], { bone: i < 3 ? 'chest' : i < 6 ? 'spine2' : 'spine1', mat: 'colSkin', k: 0.35, n: 0.4 });
  }
  // hombros, clavículas
  mir((s, S) => {
    sc.ell([2.75 * s, 14.1, -0.3], [1.0, 0.95, 0.95], { bone: 'arm' + S, mat: 'colSkin', k: 0.6 });
    sc.rc([0.35 * s, 14.55, 0.65], [2.6 * s, 14.45, 0.05], 0.24, 0.26, { bone: 'clav' + S, mat: 'colSkin', k: 0.3 });
    sc.ell([1.7 * s, 14.75, -0.3], [0.9, 0.5, 0.9], { bone: 'clav' + S, mat: 'colSkin', k: 0.7 });
  });
  // cuello largo con tendones, nuez
  sc.rc([0, 14.55, -0.1], [0, 15.6, 1.95], 0.88, 0.7, { bone: 'neck1', mat: 'colSkin', k: 0.6 });
  sc.rc([0, 15.5, 1.65], [0, 15.85, 2.85], 0.7, 0.62, { bone: 'neck2', mat: 'colSkin', k: 0.5 });
  mir((s) => sc.rc([0.5 * s, 16.0, 3.0], [0.28 * s, 14.65, 0.95], 0.17, 0.2, { bone: 'neck2', mat: 'colSkin', k: 0.25, n: 0.3 }));
  sc.ell([0, 15.05, 1.7], [0.3, 0.36, 0.3], { bone: 'neck1', mat: 'colSkin', k: 0.25 });
  // la cabeza: cráneo, pómulos, arcos superciliares, cuencas
  sc.ell([0, 16.6, 3.3], [1.12, 1.24, 1.35], { bone: 'head', mat: 'colSkin', k: 0.5, tint: [0.88, 0.84, 0.8] });
  sc.ell([0, 16.05, 4.05], [0.82, 0.72, 0.75], { bone: 'head', mat: 'colSkin', k: 0.45 });
  mir((s) => sc.ell([0.62 * s, 16.05, 4.25], [0.36, 0.26, 0.32], { bone: 'head', mat: 'colBone', k: 0.2 }));
  sc.rc([-0.78, 16.62, 4.32], [0.78, 16.62, 4.32], 0.2, 0.2, { bone: 'head', mat: 'colBone', k: 0.18 });
  mir((s) => sc.ell([0.42 * s, 16.3, 4.62], [0.23, 0.21, 0.3], { sub: true, k: 0.1 }));
  sc.ell([0, 15.98, 4.78], [0.12, 0.22, 0.2], { sub: true, k: 0.06 });
  mir((s) => sc.ell([0.07 * s, 15.9, 4.78], [0.08, 0.12, 0.16], { sub: true, k: 0.04 }));
  mir((s) => sc.paint([0.42 * s, 16.3, 4.48], [0.34, 0.32, 0.36], { tint: [0.22, 0.1, 0.09], edge: 0.35 }));
  sc.paint([0, 15.95, 4.65], [0.22, 0.3, 0.3], { tint: [0.3, 0.14, 0.12], edge: 0.3 });
  // las mejillas hundidas bajo los pómulos
  mir((s) => sc.ell([0.62 * s, 15.7, 4.05], [0.2, 0.26, 0.24], { sub: true, k: 0.18 }));
  // la mandíbula (cuelga, desencajada)
  mir((s) => sc.rc([0.74 * s, 15.95, 3.55], [0.22 * s, 15.05, 4.35], 0.3, 0.24, { bone: 'jaw', mat: 'colSkin', k: 0.2 }));
  sc.ell([0, 15.0, 4.45], [0.34, 0.26, 0.28], { bone: 'jaw', mat: 'colSkin', k: 0.2 });
  sc.ell([0, 15.45, 4.2], [0.5, 0.18, 0.45], { sub: true, k: 0.1 });
  // brazos de hueso y piel
  mir((s, S) => {
    sc.rc([2.85 * s, 14.0, -0.3], [4.22 * s, 10.65, 0.55], 0.74, 0.5, { bone: 'arm' + S, mat: 'colSkin', k: 0.45 });
    sc.ell([3.55 * s, 12.25, 0.15], [0.52, 1.2, 0.5], { bone: 'arm' + S, mat: 'colSkin', k: 0.4, rot: [0, 0, 20 * s], n: 0.8 });
    sc.ell([4.3 * s, 10.42, 0.6], [0.56, 0.56, 0.56], { bone: 'fore' + S, mat: 'colSkin', k: 0.35 });
    sc.ell([4.18 * s, 10.5, 0.12], [0.36, 0.42, 0.34], { bone: 'fore' + S, mat: 'colBone', k: 0.18 });
    sc.rc([4.36 * s, 10.25, 0.72], [4.85 * s, 6.85, 2.05], 0.42, 0.3, { bone: 'fore' + S, mat: 'colSkin', k: 0.25 });
    sc.rc([4.2 * s, 10.2, 0.38], [5.06 * s, 6.72, 1.8], 0.36, 0.27, { bone: 'fore' + S, mat: 'colSkin', k: 0.25 });
    sc.ell([4.9 * s, 6.6, 2.0], [0.4, 0.36, 0.36], { bone: 'hand' + S, mat: 'colSkin', k: 0.25 });
    // la mano: palma, nudillos, tendones del dorso
    sc.box([5.22 * s, 5.85, 2.42], [0.56, 0.82, 0.2], { bone: 'hand' + S, mat: 'colSkin', k: 0.3, round: 0.17, rot: [-28, 0, 14 * s] });
    for (const [f, a, b, c] of HAND(s)) {
      const th = f === 'th';
      const r0 = th ? 0.2 : 0.19;
      sc.ell(a, [0.22, 0.22, 0.22], { bone: 'hand' + S, mat: 'colSkin', k: 0.18 });
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
      sc.rc(a, m, r0, r0 * 0.86, { bone: f + S, mat: 'colSkin', k: 0.14 });
      sc.rc(m, b, r0 * 0.86, r0 * 0.74, { bone: f + S, mat: 'colSkin', k: 0.12 });
      sc.ell(b, [r0 * 0.85, r0 * 0.85, r0 * 0.85], { bone: f + S + 'b', mat: 'colSkin', k: 0.1 });
      sc.rc(b, c, r0 * 0.7, r0 * 0.5, { bone: f + S + 'b', mat: 'colSkin', k: 0.1 });
      // uña de hueso, curva hacia la palma
      const dir = V(c[0] - b[0], c[1] - b[1], c[2] - b[2]).normalize();
      rig(f + S + 'b', 'colBone', clawGeo(V(...c).addScaledVector(dir, -0.05), dir, V(0, -0.3, -1).normalize(), th ? 0.55 : 0.75, r0 * 0.55));
      if (!th) sc.rc([a[0], a[1] + 0.25, a[2] - 0.15], [4.95 * s, 6.55, 1.9], 0.06, 0.08, { bone: 'hand' + S, mat: 'colSkin', k: 0.08, n: 0.2 });
    }
  });
  // piernas descarnadas
  mir((s, S) => {
    sc.rc([1.3 * s, 7.3, -0.1], [1.48 * s, 4.15, 0.72], 1.0, 0.68, { bone: 'leg' + S, mat: 'colSkin', k: 0.5 });
    sc.ell([1.5 * s, 4.0, 0.78], [0.62, 0.66, 0.62], { bone: 'shin' + S, mat: 'colSkin', k: 0.3 });
    sc.ell([1.5 * s, 4.12, 1.28], [0.36, 0.4, 0.26], { bone: 'shin' + S, mat: 'colBone', k: 0.14 });
    sc.rc([1.5 * s, 3.85, 0.62], [1.6 * s, 1.05, -0.15], 0.58, 0.4, { bone: 'shin' + S, mat: 'colSkin', k: 0.3 });
    sc.ell([1.56 * s, 3.0, 0.12], [0.48, 0.95, 0.48], { bone: 'shin' + S, mat: 'colSkin', k: 0.35 });
    sc.rc([1.52 * s, 3.9, 1.05], [1.6 * s, 1.2, 0.3], 0.16, 0.12, { bone: 'shin' + S, mat: 'colBone', k: 0.1 });
    sc.ell([1.6 * s, 0.92, -0.22], [0.44, 0.44, 0.44], { bone: 'foot' + S, mat: 'colSkin', k: 0.3 });
    sc.ell([1.62 * s, 0.55, -0.62], [0.42, 0.42, 0.48], { bone: 'foot' + S, mat: 'colSkin', k: 0.3 });
    sc.rc([1.62 * s, 0.6, -0.3], [1.7 * s, 0.38, 1.4], 0.5, 0.42, { bone: 'foot' + S, mat: 'colSkin', k: 0.3 });
    // dedos de los pies, fundidos, con uñas de hueso
    for (let k = 0; k < 4; k++) {
      const x = (1.32 + k * 0.2) * s;
      const a = [x, 0.38, 1.35],
        b = [x + 0.04 * s * (k - 1.5), 0.24, 2.2 - Math.abs(k - 1.2) * 0.18];
      sc.rc(a, b, 0.2, 0.15, { bone: 'toe' + S, mat: 'colSkin', k: 0.12 });
      rig('toe' + S, 'colBone', clawGeo(V(...b), V(0, -0.2, 1), V(0, -1, 0.2), 0.42, 0.11));
    }
  });
  // la cola de los fieles: un tronco de carne con cuerpos fundidos
  const TP = [
    [0, 7.25, -1.15],
    [0, 5.1, -3.35],
    [0, 2.85, -5.95],
    [0, 1.55, -9.0],
    [0, 1.05, -12.2],
    [0, 0.85, -15.3],
    [0, 0.62, -17.7],
  ];
  sc.tube(TP, [1.55, 1.75, 1.6, 1.34, 1.1, 0.86, 0.4], { bones: ['tail1', 'tail2', 'tail3', 'tail4', 'tail5', 'tail6'], mat: 'colSkin', tint: [0.72, 0.62, 0.58], n: 1.2 });
  // carne viva por debajo y en las juntas
  for (let u = 0.05; u < 0.98; u += 0.09) {
    const f = u * (TP.length - 1),
      i = Math.min(TP.length - 2, Math.floor(f));
    const q = V(...TP[i]).lerp(V(...TP[i + 1]), f - i);
    sc.paint([q.x, q.y - 0.7, q.z], [1.6, 0.9, 1.4], { mat: 'colFleshDim', tint: [0.62, 0.38, 0.36], edge: 0.7, k: 0.8 });
  }
  const tailBone = (z) => (z > -2.5 ? 'tail1' : z > -4.9 ? 'tail2' : z > -7.6 ? 'tail3' : z > -10.8 ? 'tail4' : z > -13.9 ? 'tail5' : 'tail6');
  const tailAt = (u) => {
    // punto del eje de la cola (u de 0 a 1) y su radio
    const f = u * (TP.length - 1);
    const i = Math.min(TP.length - 2, Math.floor(f));
    const w = f - i;
    const rr = [1.65, 1.85, 1.7, 1.42, 1.18, 0.92, 0.42];
    return { p: V(...TP[i]).lerp(V(...TP[i + 1]), w), r: rr[i] + (rr[i + 1] - rr[i]) * w };
  };
  for (let k = 0; k < 13; k++) {
    const u = 0.1 + (k / 12) * 0.82;
    const { p, r } = tailAt(u);
    const side = k % 2 ? 1 : -1;
    const ang = side * R(0.5, 1.25) + (k % 3 === 0 ? Math.PI * 0.15 : 0);
    const dir = V(Math.sin(ang), Math.cos(ang) * 0.7 + 0.3, 0).normalize();
    const c = p.clone().addScaledVector(dir, r * 0.72);
    const bone = tailBone(c.z);
    const len = R(0.95, 1.25) * Math.min(1.45, r);
    // espalda o vientre de un cuerpo tendido a lo largo de la cola
    sc.ell(c.toArray(), [0.62 * len, 0.5 * len, 1.15 * len], { bone, mat: 'colSkin', k: 0.32, tint: [0.95, 0.9, 0.85], rot: [R(-15, 15), R(-25, 25), ang / DEG * 0.3], n: 0.6 });
    // los omóplatos y la espina de cada espalda
    for (const e of [-1, 1]) sc.ell(c.clone().add(V(0, 0.32 * len, e * 0.35 * len)).toArray(), [0.3 * len, 0.18 * len, 0.36 * len], { bone, mat: 'colSkin', k: 0.12, tint: [0.95, 0.9, 0.85] });
    // la cabeza, con la boca abierta y las cuencas
    const hc = c.clone().add(V(Math.sin(ang) * 0.3 * len, 0.25 * len, 1.2 * len * (k % 2 ? 1 : -1)));
    sc.ell(hc.toArray(), [0.4 * len, 0.46 * len, 0.42 * len], { bone, mat: 'colSkin', k: 0.25, tint: [0.92, 0.86, 0.8] });
    const fwd = V(Math.sin(ang), Math.cos(ang), 0);
    sc.ell(hc.clone().addScaledVector(fwd, 0.36 * len).add(V(0, -0.1 * len, 0)).toArray(), [0.13 * len, 0.18 * len, 0.13 * len], { sub: true, k: 0.06 });
    for (const e of [-1, 1]) sc.ell(hc.clone().addScaledVector(fwd, 0.33 * len).add(V(0, 0.12 * len, e * 0.15 * len)).toArray(), [0.09 * len, 0.09 * len, 0.09 * len], { sub: true, k: 0.05 });
    // un brazo que se tiende fuera de la carne
    if (k % 2 === 0 || k > 9) {
      const sh = c.clone().addScaledVector(fwd, 0.35 * len).add(V(0, 0, 0.5 * len));
      const el = sh.clone().addScaledVector(fwd, 0.85 * len).add(V(0, R(-0.2, 0.4), R(-0.4, 0.4)));
      const hd = el.clone().addScaledVector(fwd, 0.75 * len).add(V(0, R(-0.6, 0.1), R(-0.3, 0.3)));
      if (hd.y < 0.15) hd.y = 0.15;
      sc.rc(sh.toArray(), el.toArray(), 0.2 * len, 0.15 * len, { bone, mat: 'colSkin', k: 0.12 });
      sc.rc(el.toArray(), hd.toArray(), 0.15 * len, 0.11 * len, { bone, mat: 'colSkin', k: 0.1 });
      sc.ell(hd.toArray(), [0.16 * len, 0.08 * len, 0.2 * len], { bone, mat: 'colSkin', k: 0.08 });
    }
    sc.paint(c.clone().addScaledVector(fwd, -0.55 * len).toArray(), [0.9 * len, 0.5 * len, 1.5 * len], { mat: 'colFleshDim', tint: [0.6, 0.36, 0.34], edge: 0.6, k: 0.7 });
  }
  // pinturas: carne viva en las heridas y en las uniones, cera en los hombros
  for (const [c, r] of [
    [[2.1, 13.2, 1.2], 0.7],
    [[-2.3, 11.6, 0.9], 0.6],
    [[3.9, 11.6, 0.4], 0.45],
    [[-4.6, 8.6, 1.4], 0.5],
    [[1.2, 3.2, 0.5], 0.5],
    [[-1.7, 2.4, 0.2], 0.45],
    [[0.9, 15.3, 1.3], 0.35],
  ])
    sc.paint(c, r, { mat: 'colFlesh', tint: [0.8, 0.52, 0.48], edge: 0.6 });
  sc.paint([0, 16.4, 2.6], [1.3, 0.9, 1.2], { tint: [0.68, 0.58, 0.54], edge: 0.5, k: 0.7 });
  // manos y pies sucios de sangre seca y de hollín; moratones en los brazos
  mir((s) => {
    sc.paint([5.5 * s, 4.2, 2.9], [1.5, 2.0, 1.5], { tint: [0.55, 0.42, 0.4], edge: 0.6, k: 0.8 });
    sc.paint([1.65 * s, 0.6, 0.6], [0.9, 0.8, 1.6], { tint: [0.5, 0.42, 0.38], edge: 0.6, k: 0.85 });
    sc.paint([3.7 * s, 12.0, 0.4], [0.7, 1.0, 0.7], { tint: [0.72, 0.62, 0.7], edge: 0.7, k: 0.6 });
  });
  const body = sc.build();

  // ------------------------------------------------------------ la casulla
  // Un poncho: del cuello cae sobre los hombros (vS) y de ahí cuelga en dos
  // paños, el de delante (rasgado de arriba abajo: deja ver el costillar) y
  // el de detrás, largo hasta las corvas, con la cruz en Y. Los costados
  // quedan abiertos bajo los hombros: por ahí salen los brazos.
  const vS = 0.13;
  const casB = (v) => (v < 0.4 ? [BI.casB1, 1] : v < 0.72 ? [BI.casB2, 1] : [BI.casB3, 1]);
  const wrapPi = (th) => Math.abs(((th + Math.PI * 2) % (Math.PI * 2)) - Math.PI); // 0 en la espalda
  const yS = (th) => {
    const c = Math.cos(th);
    return 14.15 + Math.max(0, c) * 0.25 + Math.max(0, -c) * 0.75;
  };
  const yCas = (th, v) => {
    if (v < vS) return 15.45 - (v / vS) * (15.45 - yS(th));
    return yS(th) - ((v - vS) / (1 - vS)) * (yS(th) - 4.7);
  };
  const ell = (th, ax, az) => {
    const sn = Math.sin(th),
      c = Math.cos(th);
    return 1 / Math.sqrt((sn * sn) / (ax * ax) + (c * c) / (az * az));
  };
  const casRad = (th, v) => {
    const front = Math.cos(th) > 0;
    const rS = ell(th, 3.9, front ? 2.15 : 3.05);
    const rN = ell(th, 1.05, front ? 1.15 : 1.25);
    if (v < vS) {
      const u = v / vS;
      return rN + (rS - rN) * Math.sin((u * Math.PI) / 2);
    }
    return rS + (v - vS) * (front ? 0.55 : 1.1);
  };
  const casCut = (th) => {
    const c = Math.cos(th),
      sn = Math.abs(Math.sin(th));
    // delante hasta el vientre, detrás hasta las corvas, los costados cortos
    const front = c > 0 ? Math.pow(c, 1.4) : 0,
      back = c < 0 ? Math.pow(-c, 0.9) : 0;
    const k = 0.2 + front * 0.36 + back * 0.8 - sn * sn * 0.02;
    return Math.min(1, k + perlin(th * 3.1, 2.2, 0.7) * 0.03);
  };
  const casHole = (th, v) => Math.abs(th) < 0.36 + v * 0.3 && v > 0.03;
  const casOrph = (th, v, hem) => {
    const d = wrapPi(th);
    if (hem < 1) return 1;
    // la cruz en Y de la espalda: el palo y los dos brazos hacia los hombros
    if (d < 0.1 && v > 0.3) return 1;
    const armV = vS + 0.17 - (d / 1.05) * 0.17;
    if (d < 1.05 && d > 0.05 && Math.abs(v - armV) < 0.028) return 1;
    // el borde del cuello, el bajo y los bordes de la rotura
    if (v < 0.035) return 1;
    if (Math.cos(th) > 0 && Math.abs(Math.abs(th) - (0.36 + v * 0.3)) < 0.055 && v > 0.03) return 1;
    return 0;
  };
  const casula = clothRing({
    y0: 15.45,
    y1: 4.7,
    yAt: yCas,
    nu: 104,
    nv: 50,
    center: (v) => (v < vS ? [0, 0.55 - (v / vS) * 1.15] : [0, -0.6 - (v - vS) * 0.8]),
    radius: casRad,
    folds: { n: 17, amp: (v) => (v < vS ? 0.02 : 0.06 + 0.55 * (v - vS) * (v - vS)), wobble: 0.75 },
    cut: casCut,
    hole: casHole,
    nMat: 2,
    mat: casOrph,
    uv: [1.1, 1.1],
    tint: (p, th, v) => {
      const wax = Math.max(0, perlin(th * 4.1, v * 6, 2.3) - 0.35) * (1 - v) * 1.5;
      const blood = Math.max(0, perlin(th * 2.2 + 9, v * 3.1, 5.5) - 0.3) * 1.4;
      const hem = Math.max(0, v - 0.6) * 0.8;
      return [0.92 - blood * 0.3 - hem * 0.35 + wax * 0.4, 0.88 - blood * 0.45 - hem * 0.38 + wax * 0.42, 0.86 - blood * 0.45 - hem * 0.38 + wax * 0.38];
    },
    weights: (p, th, v) => {
      // arriba, cosida al pecho; sobre los hombros, con las clavículas y los
      // brazos (al alzarlos, la tela se alza con ellos); abajo, los huesos
      // de la tela (los paños se balancean)
      const out = [];
      const sn = Math.sin(th),
        c = Math.cos(th);
      const L = sn > 0;
      const top = Math.max(0, Math.min(1, 1 - (v - vS) / 0.12));
      if (top > 0) {
        const sh = Math.pow(Math.abs(sn), 2) * Math.min(1, v / vS);
        out.push([BI.chest, top * (1 - sh)]);
        out.push([L ? BI.clavL : BI.clavR, top * sh * 0.55]);
        out.push([L ? BI.armL : BI.armR, top * sh * 0.45]);
      }
      const rest = 1 - top;
      if (rest > 0) {
        const wb = Math.max(0, -c) ** 1.2,
          wf = Math.max(0, c) ** 1.2,
          ws = Math.abs(sn) ** 3 * 0.6;
        const sum = wb + wf + ws || 1;
        const lowF = Math.max(0, Math.min(1, (v - 0.3) / 0.3));
        out.push([casB(v)[0], (rest * wb) / sum]);
        out.push([L ? BI.casFL : BI.casFR, (rest * wf * (1 - lowF)) / sum]);
        out.push([L ? BI.casFL2 : BI.casFR2, (rest * wf * lowF) / sum]);
        out.push([L ? BI.casSL : BI.casSR, (rest * ws) / sum]);
      }
      return out;
    },
  });

  // ------------------------------------------------------------ el alba hecha jirones
  // Jirones de anchos distintos, cada uno con su largo (por delante, entre
  // las piernas, más cortos) y algún desgarro.
  const strips = [];
  {
    let a = -Math.PI;
    while (a < Math.PI - 0.05) {
      const w = R(0.12, 0.34);
      const mid = a + w / 2;
      const front = Math.max(0, Math.cos(mid));
      strips.push({ a0: a, a1: Math.min(Math.PI, a + w), cut: Math.min(0.97, R(0.45, 0.96) - front * 0.18) });
      a += w + (rnd() < 0.3 ? R(0.01, 0.03) : 0);
    }
  }
  const stripAt = (th) => strips.find((q) => th >= q.a0 && th <= q.a1);
  const alba = clothRing({
    y0: 8.6,
    y1: 1.1,
    nu: 120,
    nv: 34,
    center: () => [0, -0.25],
    radius: (th, v) => {
      const back = Math.max(0, -Math.cos(th));
      return 2.0 + 0.55 * v + v * v * 0.9 + back * (0.35 + v * 0.6);
    },
    folds: { n: 21, amp: (v) => 0.05 + 0.24 * v, wobble: 0.9 },
    cut: (th) => {
      const q = stripAt(th);
      return q ? q.cut : 0.2;
    },
    hole: (th, v) => perlin(th * 2.6, v * 5.2, 9.1) > 0.5 && v > 0.2,
    uv: [1.0, 1.0],
    tint: (p, th, v) => {
      const st = Math.max(0, perlin(th * 3.3, v * 4.4, 1.9) - 0.15) * 1.2;
      const k = 0.95 - v * 0.38 - st * 0.25;
      return [k, k * 0.93 - st * 0.08, k * 0.86 - st * 0.1];
    },
    weights: (p, th, v) => {
      const out = [];
      const top = Math.max(0, Math.min(1, 1 - v / 0.22));
      if (top > 0) out.push([BI.pelvis, top]);
      const rest = 1 - top;
      if (rest <= 0) return out;
      let ws = 0;
      const tmp = [];
      for (let i = 0; i < TATTERS; i++) {
        let d = Math.abs(th - (tatTh(i) > Math.PI ? tatTh(i) - Math.PI * 2 : tatTh(i))) % (Math.PI * 2);
        if (d > Math.PI) d = Math.PI * 2 - d;
        const w = Math.exp(-(d * d) / 0.18);
        tmp.push([i, w]);
        ws += w;
      }
      const lowK = Math.max(0, Math.min(1, (v - 0.4) / 0.4));
      for (const [i, w] of tmp) {
        out.push([BI['tat' + i], (rest * w * (1 - lowK)) / ws]);
        out.push([BI['tat' + i + 'b'], (rest * w * lowK) / ws]);
      }
      return out;
    },
  });

  // ------------------------------------------------------------ piezas duras
  // las puertas del costillar: costillas curvas que se abren desde los costados
  mir((s, S) => {
    const bone = 'rib' + S;
    for (let i = 0; i < 6; i++) {
      const y = 14.05 - i * 0.44;
      const pts = [
        [1.86 * s, y, 0.5],
        [1.95 * s, y - 0.22, 1.12],
        [1.62 * s, y - 0.55, 1.72],
        [1.02 * s, y - 0.88, 2.08],
        [0.4 * s, y - 1.08, 2.2],
      ];
      rig(bone, 'colBone', tubeGeo(pts, [0.17, 0.16, 0.14, 0.12, 0.09], { radial: 6, perM: 4, aoEnds: true }));
      // cartílago hasta el esternón
      rig(bone, 'colSkin', tubeGeo([V(...pts[4]), V(0.28 * s, y - 1.12, 2.2)], [0.08, 0.07], { radial: 5, segs: 2 }));
      // la carne que aún une algunas costillas, desgarrada
      if (i % 2 === 0 && i < 5) rig(bone, 'colFleshDim', ribbonGeo(pts.slice(0, 4).map((q) => [q[0] * 0.99, q[1] - 0.24, q[2] * 0.98]), (u) => 0.3 * (1 - u * 0.7), { up: [s, 0, 1], shade: 0.55 }), { ds: true });
    }
    // la mitad del esternón
    rig(bone, 'colBone', tubeGeo([V(0.24 * s, 13.75, 2.12), V(0.27 * s, 12.6, 2.24), V(0.25 * s, 11.3, 2.18), V(0.18 * s, 10.75, 2.05)], [0.15, 0.16, 0.14, 0.07], { radial: 5, perM: 3 }));
  });
  // el núcleo: el carbón del incienso, en su nido de carne
  rig('chest', 'redGlow', hardGeo({ type: 'ico', s: [0.72], detail: 1, p: [0, 12.25, 0.95], mat: 'redGlow', ao: false }));
  rig('chest', 'colFlesh', hardGeo({ type: 'ico', s: [1.05, 1.35, 0.85], detail: 1, p: [0, 12.25, 0.55], mat: 'colFlesh', shade: 0.75 }));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    rig('chest', 'colFleshDim', tubeGeo([V(Math.cos(a) * 0.7, 12.25 + Math.sin(a) * 0.9, 0.95), V(Math.cos(a) * 1.25, 12.25 + Math.sin(a) * 1.55, 0.5), V(Math.cos(a) * 1.45, 12.25 + Math.sin(a) * 1.8, 0.1)], [0.12, 0.1, 0.07], { radial: 5, perM: 3 }));
  }
  // púas del espinazo que rompen la casulla en la joroba
  for (let i = 0; i < 7; i++) {
    const y = 15.4 - i * 0.62;
    const z = -3.75 - Math.sin((i / 6) * Math.PI) * 0.35;
    const L = 1.0 + Math.sin(((i + 1) / 8) * Math.PI) * 1.0;
    rig(i < 4 ? 'chest' : 'spine2', 'colBone', spikeGeo(V(0, y, z + 0.4), V(0, y + L * 0.55, z - L), 0.32 + L * 0.08, { seg: 6 }));
  }
  // la jaula de hierro: barrotes alrededor de la cabeza (con hueco entre la
  // jaula y la cara), tres aros remachados y púas hacia fuera
  {
    const C = V(0, 16.25, 3.3);
    const rr = (a, y) => 1.62 + 0.1 * Math.cos(a * 2) - Math.abs(y - 16.35) * 0.1;
    const at = (a, y, extra = 0) => V(Math.sin(a) * (rr(a, y) + extra), y, C.z + Math.cos(a) * (rr(a, y) + extra) * 0.92 - 0.1);
    for (let i = 0; i < 9; i++) {
      const a = -1.25 + (i / 8) * 2.5;
      const pts = [];
      for (let k = 0; k <= 6; k++) pts.push(at(a, 17.85 - k * 0.5));
      rig('head', 'iron', tubeGeo(pts, [0.075, 0.08, 0.08, 0.08, 0.08, 0.08, 0.075], { radial: 5, perM: 3 }));
      for (const k of [1, 3, 5]) {
        if ((i + k) % 2) continue;
        const q = pts[k];
        const out = V(Math.sin(a), 0.2, Math.cos(a)).normalize();
        rig('head', 'iron', spikeGeo(q, q.clone().addScaledVector(out, 0.5 + (k === 3 ? 0.3 : 0)), 0.075, { seg: 4 }));
      }
    }
    // los barrotes se juntan arriba, sobre la frente, en un remate
    for (const y of [17.75, 16.6, 15.4]) {
      const pts = [];
      for (let k = 0; k <= 14; k++) pts.push(at(-1.35 + (k / 14) * 2.7, y, 0.05));
      rig('head', 'iron', tubeGeo(pts, pts.map(() => 0.1), { radial: 5, perM: 2.5 }));
      for (let k = 1; k < 14; k += 2) rig('head', 'iron', hardGeo({ type: 'sphere', s: [0.11], seg: 5, seg2: 3, p: pts[k].toArray(), mat: 'iron' }));
    }
    // las correas que la atan a la nuca
    for (const s2 of [1, -1]) rig('head', 'leather', ribbonGeo([at(1.35 * s2, 17.0, 0.04), V(1.25 * s2, 17.2, 2.0), V(0.6 * s2, 17.3, 1.75), V(0, 17.35, 1.7)], 0.28, { up: [0, 1, 0], shade: 0.7 }), { ds: true });
  }
  // dientes: la fila de arriba y la de la mandíbula desencajada
  for (let k = 0; k < 10; k++) {
    const a = -0.85 + (k / 9) * 1.7;
    rig('head', 'colBone', hardGeo({ type: 'box', s: [0.11, 0.24, 0.1], p: [Math.sin(a) * 0.62, 15.72, 3.75 + Math.cos(a) * 0.62], r: [0, a / DEG, 0], mat: 'colBone' }));
    rig('jaw', 'colBone', hardGeo({ type: 'box', s: [0.1, 0.22, 0.09], p: [Math.sin(a) * 0.55, 15.35, 3.82 + Math.cos(a) * 0.55], r: [0, a / DEG, 0], mat: 'colBone' }));
  }
  // los cuernos de hueso y la mitra partida
  mir((s) => {
    const horn = [V(0.45 * s, 17.55, 2.95), V(0.95 * s, 18.55, 2.55), V(1.3 * s, 19.6, 2.65), V(1.42 * s, 20.6, 3.05)];
    rig('head', 'colBone', tubeGeo(horn, [0.34, 0.26, 0.16, 0.04], { radial: 7, perM: 3, aoEnds: true }));
    // media mitra clavada en el cuerno: un panel apuntado de terciopelo con
    // su cenefa de oro y la cruz
    const sh = new THREE.Shape();
    sh.moveTo(-0.7, 0);
    sh.lineTo(0.7, 0);
    sh.lineTo(0.62, 1.4);
    sh.lineTo(0.05, 2.35);
    sh.lineTo(-0.55, 1.5);
    sh.lineTo(-0.7, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: false });
    g.translate(0, 0, -0.07);
    const place = new THREE.Matrix4().compose(V(0.95 * s, 18.0, 2.85), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.18, -0.35 * s, -0.42 * s)), V(1, 1, 1));
    g.applyMatrix4(place);
    rig('head', 'colRobe', withColor(g, 0.85), { ds: true, tri: 0.6 });
    const band = hardGeo({ type: 'box', s: [1.42, 0.2, 0.18], p: [0, 0.18, 0], mat: 'colOrphrey' });
    band.applyMatrix4(place);
    rig('head', 'colOrphrey', band);
    for (const [w, h, y] of [
      [0.14, 0.9, 1.15],
      [0.6, 0.14, 1.28],
    ]) {
      const cr = hardGeo({ type: 'box', s: [w, h, 0.2], p: [0, y, 0], mat: 'colOrphrey' });
      cr.applyMatrix4(place);
      rig('head', 'colOrphrey', cr);
    }
    // las ínfulas, colgando por detrás
    rig('head', 'colRobe', ribbonGeo([[0.6 * s, 17.6, 2.2], [0.75 * s, 16.6, 1.85], [0.8 * s, 15.4, 1.75], [0.95 * s, 14.4, 1.95]], 0.34, { up: [0, 0, -1], shade: 0.7 }), { ds: true, tri: 0.6 });
  });
  // la aureola de hierro con once cirios
  const candleTops = [];
  {
    const halo = { c: V(0, 18.95, 1.85), R: 3.45, tilt: -14 };
    const hq = new THREE.Quaternion().setFromEuler(new THREE.Euler(halo.tilt * DEG, 0, 0));
    const hax = V(0, 0, 1).applyQuaternion(hq);
    const onHalo = (a, rr = halo.R) => V(Math.cos(a) * rr, Math.sin(a) * rr, 0).applyQuaternion(hq).add(halo.c);
    rig('halo', 'iron', torusAround(halo.R, 0.14, halo.c, hax, 36));
    rig('halo', 'iron', torusAround(halo.R * 0.8, 0.08, halo.c, hax, 30));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rig('halo', 'iron', ribbonGeo([onHalo(a, halo.R * 0.8), onHalo(a, halo.R + 0.35)], 0.09, { up: hax.toArray() }), { ds: true });
    }
    for (const a of [-0.45, Math.PI + 0.45, -Math.PI / 2]) rig('halo', 'iron', tubeGeo([halo.c.clone().add(V(0, -1.1, 0.6)), onHalo(a)], [0.1, 0.09], { radial: 4 }));
    for (let i = 0; i < 11; i++) {
      const a = (Math.PI * 1.16 * (i + 0.5)) / 11 - Math.PI * 0.08;
      const b = onHalo(a);
      const h = 1.95 + Math.sin(i * 2.7) * 0.45 + (i === 5 ? 1.1 : 0) + R(0, 0.4);
      const r = 0.3 + R(-0.03, 0.05);
      rig('halo', 'iron', hardGeo({ type: 'cyl', s: [0.46, 0.36, 0.12], seg: 8, p: [b.x, b.y + 0.04, b.z], mat: 'iron' }));
      rig('halo', 'candle', hardGeo({ type: 'cyl', s: [r * 0.92, r, h], seg: 8, p: [b.x, b.y + h / 2 + 0.1, b.z], mat: 'candle', ao: false }));
      // goterones de cera
      for (let k = 0; k < 4; k++) {
        const aa = R(0, Math.PI * 2);
        const len = R(0.3, 1.1);
        rig('halo', 'candle', hardGeo({ type: 'box', s: [0.1, len, 0.08], p: [b.x + Math.cos(aa) * r, b.y + h * R(0.45, 0.85) - len / 2, b.z + Math.sin(aa) * r], r: [0, -aa / DEG, 0], mat: 'candle' }));
      }
      rig('halo', 'black', hardGeo({ type: 'cyl', s: [0.03, 0.03, 0.22], seg: 4, p: [b.x, b.y + h + 0.2, b.z], mat: 'black' }));
      candleTops.push([b.x, b.y + h + 0.38, b.z]);
    }
  }
  // los sigilos del Pacto: discos grabados que brillan (puntos débiles)
  const sigilGeo = (c, n, r) => {
    const g = new THREE.CircleGeometry(r, 20).toNonIndexed();
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), n.clone().normalize()));
    g.translate(c.x, c.y, c.z);
    const uv = g.attributes.uv;
    return withColor(g, 1);
  };
  const SIGILS = [
    // nuca: bajo la jaula, en la nuca (encima de la joroba)
    { id: 'nuca', bone: 'neck2', pos: [0, 16.2, 1.05], normal: [0, 0.55, -0.83], r: 0.95, hp: 3 },
    // dorso de la mano de la cadena
    { id: 'mano', bone: 'handR', pos: [-5.32, 6.0, 2.12], normal: [-0.35, 0.45, -0.82], r: 0.62, hp: 3 },
    // el núcleo del pecho (se alcanza con el costillar abierto)
    { id: 'nucleo', bone: 'chest', pos: [0, 12.25, 1.7], normal: [0, 0, 1], r: 0.8, hp: 3, core: true },
  ];
  for (const sg of SIGILS) {
    if (sg.core) continue;
    rig(sg.bone, 'colSigil', sigilGeo(V(...sg.pos).addScaledVector(V(...sg.normal).normalize(), 0.06), V(...sg.normal), sg.r), { ds: true, grp: 'sigil:' + sg.id });
  }

  // ------------------------------------------------------------ la campana
  const bell = bellParts(TUR.bellH);

  // ------------------------------------------------------------ por dónde se trepa
  // Cada superficie: puntos (espacio del modelo) con su hueso y la normal
  // hacia fuera; el jugador se mueve a lo largo (s) y a lo ancho (w).
  const P = (bone, p, n, extra = {}) => ({ bone, p, n, ...extra });
  const CLIMB = {
    // la cola, cuando la arrastra: de la punta a los riñones
    cola: {
      width: 1.2,
      pts: [
        P('tail6', [0, 1.45, -17.4], [0, 1, -0.15]),
        P('tail6', [0, 1.75, -15.4], [0, 1, 0]),
        P('tail5', [0, 2.2, -12.4], [0, 1, 0.08]),
        P('tail4', [0, 2.95, -9.3], [0, 0.95, 0.3]),
        P('tail3', [0, 4.45, -6.6], [0, 0.85, -0.5]),
        P('tail2', [0, 6.6, -4.5], [0, 0.6, -0.8]),
        P('tail1', [0, 8.4, -3.4], [0, 0.35, -0.94]),
      ],
      next: { end: 'espalda' },
    },
    // la cruz en Y de la espalda: de los riñones a la joroba
    espalda: {
      width: 1.6,
      pts: [
        P('spine1', [0, 8.6, -3.7], [0, 0.2, -1]),
        P('spine2', [0, 10.4, -4.15], [0, 0.15, -1]),
        P('chest', [0, 12.4, -4.25], [0, 0.3, -0.95]),
        P('chest', [0, 14.1, -4.05], [0, 0.65, -0.76]),
        P('chest', [0, 15.35, -3.1], [0, 0.92, -0.38], { rest: true }),
        P('chest', [0, 15.75, -1.7], [0, 1, 0.05], { rest: true }),
      ],
      next: { start: 'cola', end: 'nuca' },
    },
    // de la joroba a la nuca (el sigilo)
    nuca: {
      width: 1.2,
      pts: [P('chest', [0, 15.75, -1.7], [0, 1, 0.05], { rest: true }), P('neck1', [0, 16.1, -0.4], [0, 0.95, -0.3]), P('neck2', [0, 16.55, 0.75], [0, 0.6, -0.8])],
      sigil: 'nuca',
      next: { start: 'espalda' },
    },
    // la garra izquierda plantada: de los dedos al hombro
    brazo: {
      width: 1.0,
      pts: [
        P('f2Lb', [5.62, 3.2, 3.3], [0, 0.6, 0.8]),
        P('handL', [5.3, 5.6, 2.55], [0.3, 0.7, 0.65]),
        P('foreL', [4.95, 7.4, 1.95], [0.3, 0.4, 0.86]),
        P('foreL', [4.6, 9.6, 1.05], [0.35, 0.25, 0.9]),
        P('armL', [3.95, 11.8, 0.75], [0.5, 0.2, 0.84]),
        P('armL', [3.2, 14.6, 0.1], [0.4, 0.9, 0.1], { rest: true }),
        P('clavL', [1.6, 15.35, -0.5], [0, 1, 0], { rest: true }),
      ],
      next: { end: 'nuca' },
    },
    // de rodillas: por la casulla hasta el pecho abierto (el núcleo)
    pecho: {
      width: 1.4,
      pts: [P('casFL2', [1.2, 6.2, 3.4], [0, 0.2, 1]), P('casFL', [1.0, 9.0, 3.1], [0, 0.15, 1]), P('chest', [0.6, 10.8, 2.75], [0, 0.1, 1]), P('chest', [0, 11.7, 2.4], [0, 0.2, 1])],
      sigil: 'nucleo',
      kneel: true,
    },
  };

  // ------------------------------------------------------------ efectos (llamas, brillos, luces)
  const FX = {
    candles: candleTops.map((p) => ({ bone: 'halo', p })),
    core: { bone: 'chest', p: [0, 12.25, 1.3] },
  };

  const stats = { body: sc.stats, ms: Math.round(performance.now() - t0) };
  return {
    bones: TUR_BONES,
    skinned: [
      { name: 'body', geo: body, mats: sc.mats, matOpts: {} },
      { name: 'casulla', geo: casula, mats: ['colRobe', 'colOrphrey'], matOpts: { colRobe: { tri: 0 }, colOrphrey: { tri: 0 } }, ds: true },
      { name: 'alba', geo: alba, mats: ['colAlb'], matOpts: { colAlb: { tri: 0 } }, ds: true },
    ],
    rigid: H,
    groups: { bell },
    extra: { sigils: SIGILS, climb: CLIMB, fx: FX, sizes: TUR },
    stats,
  };
}

// En el hilo principal (laboratorio y pruebas): geometría + modelo montado.
export function buildTuriferario(o = {}) {
  const t0 = performance.now();
  const d = turiferarioData(o);
  const model = assemble(d, o);
  return { model, data: d, info: { name: 'El Turiferario (coloso)', height: TUR.height, halo: TUR.halo, ms: Math.round(performance.now() - t0), sculpt: d.stats } };
}
