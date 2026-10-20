// El Custodio de la Garra: los muertos del relicario de San Martín (los
// monjes que cavaron con él y los que vinieron detrás), que se juntan en un
// coloso de calaveras y fémures alrededor del arca cuando alguien viene a
// por la Garra. De cintura para abajo es un montón de huesos que se arrastra
// por el suelo; de él sale el tronco: un costillar con algo rojo que late
// dentro, los brazos de fémures atados y una calavera enorme coronada de
// otras pequeñas.
//
// Lo suyo: se deshace en un montón y se rehace en otro sitio de la sala (los
// huesos corren por el suelo hasta allí; mientras, no se le puede tocar); a
// media vida se le cae el antebrazo izquierdo y se vuelve más rápido.
// Golpes: un barrido con cada brazo, el mazazo con los dos (onda), la lluvia
// de calaveras y el agarrón. La sala, la reja y el arca: game/crypt.js.
import * as THREE from 'three';
import { Rig, clip } from './rig.js';
import { DEG } from '../core/util.js';
import { getTexture } from '../gfx/textures.js';
import { DEEP } from '../world/level_crypt2.js';

const S = Math.sin;
const V3 = THREE.Vector3;
const rad = (p) => {
  const o = {};
  for (const k in p) o[k] = k === 'root' ? p[k].map((v) => v / 100) : p[k].map((v) => v * DEG);
  return o;
};
const ease = (u) => u * u * (3 - 2 * u);

// ------------------------------------------------------------ el cuerpo
// (un haz de huesos largos a lo largo de -y de su articulación)
function bundle(j, len, n, w, seed) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + seed;
    const r = w * 0.55;
    out.push({ j, type: 'box', s: [w * 0.55, len * (0.92 + ((i * 7 + seed * 10) % 3) * 0.04), w * 0.55], p: [Math.cos(a) * r, -len / 2, Math.sin(a) * r], r: [Math.sin(a) * 4, 0, Math.cos(a) * 4], mat: 'bone' });
  }
  // las cabezas de los huesos, en los extremos
  out.push({ j, type: 'sphere', s: [w * 0.95], p: [0, -0.04, 0], seg: 6, mat: 'bone' });
  return out;
}
// (el tronco, a escala: el montón no)
const K = 1.22;
export function buildCustodio() {
  const joints = [
    { name: 'heap', pos: [0, 0, 0] },
    { name: 'hips', pos: [0, 1.15 * K, 0] },
    { name: 'chest', parent: 'hips', pos: [0, 0.75 * K, 0] },
    { name: 'head', parent: 'chest', pos: [0, 1.0 * K, 0.14 * K] },
    { name: 'jaw', parent: 'head', pos: [0, -0.04 * K, 0.1 * K] },
    { name: 'armL', parent: 'chest', pos: [0.82 * K, 0.78 * K, 0] },
    { name: 'foreL', parent: 'armL', pos: [0, -1.05 * K, 0] },
    { name: 'handL', parent: 'foreL', pos: [0, -0.95 * K, 0] },
    { name: 'armR', parent: 'chest', pos: [-0.82 * K, 0.78 * K, 0] },
    { name: 'foreR', parent: 'armR', pos: [0, -1.05 * K, 0] },
    { name: 'handR', parent: 'foreR', pos: [0, -0.95 * K, 0] },
  ];
  const heap = [
    // ---------------------------------------------------------- el montón
    { j: 'heap', type: 'ico', s: [1.45, 0.72, 1.45], p: [0, 0.28, 0], detail: 1, mat: 'skulls' },
    { j: 'heap', type: 'ico', s: [1.0, 0.78, 1.0], p: [0.05, 0.86, -0.05], detail: 1, mat: 'skulls' },
    // fémures y costillas que asoman del montón, y calaveras sueltas
    ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
      const a = (i / 10) * Math.PI * 2 + 0.3;
      const r = 0.95 + (i % 3) * 0.12;
      return { j: 'heap', type: 'box', s: [0.09, 0.8 + (i % 4) * 0.12, 0.09], p: [Math.cos(a) * r, 0.42, Math.sin(a) * r], r: [Math.sin(a) * (40 + (i % 3) * 14), 0, -Math.cos(a) * (40 + (i % 3) * 14)], mat: 'bone' };
    }),
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => {
      const a = (i / 7) * Math.PI * 2 + 1.1;
      const r = 1.25 + (i % 2) * 0.18;
      return { j: 'heap', type: 'sphere', s: [0.13, 0.12, 0.15], p: [Math.cos(a) * r, 0.12, Math.sin(a) * r], seg: 6, mat: 'bone' };
    }),
  ];
  const trunk = [
    // ---------------------------------------------------------- el tronco
    // la pelvis (medio hundida) y el espinazo de vértebras
    { j: 'hips', type: 'box', s: [0.82, 0.32, 0.48], p: [0, -0.08, 0], taper: [0.8, 0.9], mat: 'bone' },
    ...[0.12, 0.27, 0.42, 0.57].map((y) => ({ j: 'hips', type: 'box', s: [0.24, 0.1, 0.22], p: [0, y, -0.06], mat: 'bone' })),
    { j: 'hips', type: 'ico', s: [0.42, 0.36, 0.34], p: [0.32, 0.12, 0.02], mat: 'skulls' },
    { j: 'hips', type: 'ico', s: [0.38, 0.34, 0.32], p: [-0.3, 0.16, -0.02], mat: 'skulls' },
    // el pecho: una masa de calaveras, el costillar, el esternón, las
    // clavículas, los omóplatos y, dentro, lo que late
    { j: 'chest', type: 'box', s: [1.1, 0.9, 0.66], p: [0, 0.47, -0.08], taper: [0.7, 0.8], mat: 'skulls' },
    // (los hombros, dos racimos de calaveras)
    { j: 'chest', type: 'ico', s: [0.36, 0.32, 0.32], p: [0.68, 0.8, -0.04], mat: 'skulls' },
    { j: 'chest', type: 'ico', s: [0.36, 0.32, 0.32], p: [-0.68, 0.8, -0.04], mat: 'skulls' },
    ...[0, 1, 2, 3, 4].flatMap((k) =>
      [1, -1].map((sx) => ({ j: 'chest', type: 'box', s: [0.07, 0.07, 0.66], p: [sx * (0.46 - k * 0.02), 0.2 + k * 0.14, 0.14], r: [0, sx * 24, sx * (10 - k * 4)], mat: 'bone' }))
    ),
    { j: 'chest', type: 'box', s: [0.1, 0.6, 0.06], p: [0, 0.46, 0.36], mat: 'bone' },
    { j: 'chest', type: 'box', s: [0.82, 0.07, 0.08], p: [0.42, 0.86, 0.1], r: [0, 0, 8], mat: 'bone' },
    { j: 'chest', type: 'box', s: [0.82, 0.07, 0.08], p: [-0.42, 0.86, 0.1], r: [0, 0, -8], mat: 'bone' },
    { j: 'chest', type: 'box', s: [0.38, 0.5, 0.05], p: [0.25, 0.56, -0.38], r: [8, 0, 6], mat: 'bone' },
    { j: 'chest', type: 'box', s: [0.38, 0.5, 0.05], p: [-0.25, 0.56, -0.38], r: [8, 0, -6], mat: 'bone' },
    { j: 'chest', type: 'sphere', s: [0.17], p: [0, 0.5, 0.16], seg: 6, mat: 'redGlow' },
    // ---------------------------------------------------------- la cabeza
    { j: 'head', type: 'sphere', s: [0.36, 0.34, 0.4], p: [0, 0.22, 0], seg: 8, seg2: 6, mat: 'bone' },
    { j: 'head', type: 'box', s: [0.5, 0.3, 0.2], p: [0, 0.07, 0.2], taper: [0.82, 0.9], mat: 'bone' },
    ...[1, -1].flatMap((sx) => [
      { j: 'head', type: 'box', s: [0.13, 0.11, 0.02], p: [sx * 0.11, 0.15, 0.305], mat: 'black' },
      { j: 'head', type: 'box', s: [0.045, 0.035, 0.01], p: [sx * 0.11, 0.15, 0.316], mat: 'eyeGlow' },
    ]),
    { j: 'head', type: 'box', s: [0.06, 0.08, 0.02], p: [0, 0.05, 0.305], mat: 'black' },
    ...[-0.12, -0.06, 0, 0.06, 0.12].map((x) => ({ j: 'head', type: 'box', s: [0.04, 0.05, 0.02], p: [x, -0.04, 0.28], mat: 'bone' })),
    // la corona de calaveras pequeñas
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => {
      const a = (i / 7) * Math.PI * 2;
      return { j: 'head', type: 'sphere', s: [0.08, 0.075, 0.09], p: [Math.sin(a) * 0.3, 0.44, Math.cos(a) * 0.3 - 0.02], seg: 6, mat: 'bone' };
    }),
    // la mandíbula
    { j: 'jaw', type: 'box', s: [0.42, 0.09, 0.3], p: [0, -0.07, 0.1], taper: [0.8, 0.85], mat: 'bone' },
    ...[-0.1, -0.035, 0.035, 0.1].map((x) => ({ j: 'jaw', type: 'box', s: [0.04, 0.05, 0.02], p: [x, -0.01, 0.24], mat: 'bone' })),
    // ---------------------------------------------------------- los brazos
    ...[
      ['armL', 'foreL', 'handL', 1],
      ['armR', 'foreR', 'handR', -1],
    ].flatMap(([a, f, h, sx]) => [
      ...bundle(a, 1.05, 4, 0.27, sx > 0 ? 0.4 : 1.3),
      { j: a, type: 'ico', s: [0.3, 0.26, 0.26], p: [sx * 0.06, -0.4, 0.02], mat: 'skulls' },
      ...bundle(f, 0.95, 3, 0.24, sx > 0 ? 2.1 : 0.7),
      { j: f, type: 'ico', s: [0.24, 0.22, 0.22], p: [-sx * 0.05, -0.45, 0.03], mat: 'skulls' },
      // la mano: un puñado de calaveras y cuatro dedos de hueso, en garra
      { j: h, type: 'ico', s: [0.38, 0.3, 0.3], p: [0, -0.12, 0.04], mat: 'skulls' },
      ...[-0.14, -0.05, 0.05, 0.14].map((x, i) => ({ j: h, type: 'box', s: [0.08, 0.56, 0.08], p: [x, -0.42, 0.13], r: [-18 - (i % 2) * 6, 0, x * 60], mat: 'bone' })),
      { j: h, type: 'box', s: [0.08, 0.4, 0.08], p: [sx * 0.18, -0.28, 0.17], r: [-30, 0, sx * 30], mat: 'bone' },
    ]),
  ];
  const parts = [...heap, ...trunk.map((pt) => ({ ...pt, s: pt.s.map((v) => v * K), p: pt.p.map((v) => v * K) }))];
  return new Rig({ joints, parts });
}

// ------------------------------------------------------------ poses y clips
// En pie: inclinado hacia delante, los brazos colgando por delante.
const BASE = { hips: [6, 0, 0], chest: [14, 0, 0], head: [-10, 0, 0], jaw: [6, 0, 0], armL: [-22, 0, 22], foreL: [-34, 0, 0], handL: [14, 0, 0], armR: [-22, 0, -22], foreR: [-34, 0, 0], handR: [14, 0, 0] };
// hundido en el montón (sólo se ve el montón)
const SUNK = { root: [0, -300, 0], hips: [40, 0, 0], chest: [60, 0, 0], head: [40, 0, 0], jaw: [0, 0, 0], armL: [30, 0, 10], foreL: [-20, 0, 0], armR: [30, 0, -10], foreR: [-20, 0, 0] };
const mirror = (p) => {
  const o = {};
  const sw = { armL: 'armR', armR: 'armL', foreL: 'foreR', foreR: 'foreL', handL: 'handR', handR: 'handL' };
  for (const k in p) {
    const v = p[k];
    o[sw[k] || k] = k === 'root' ? [-v[0], v[1], v[2]] : [v[0], -v[1], -v[2]];
  }
  return o;
};

const SWEEP_R = [
  [0, { ...BASE }],
  [0.78, { ...BASE, hips: [4, -16, 0], chest: [8, -34, 0], head: [-14, 20, 0], armR: [-84, 0, -104], foreR: [-22, 0, 0], handR: [24, 0, 0], armL: [-30, 0, 30] }, 'hold'],
  [1.0, { ...BASE, hips: [10, 18, 0], chest: [22, 40, 0], head: [-10, -18, 0], armR: [-88, 0, 36], foreR: [-8, 0, 0], handR: [36, 0, 0], armL: [-20, 0, 40], root: [0, -12, 0] }, 'snap'],
  [1.35, { ...BASE, hips: [10, 20, 0], chest: [20, 44, 0], head: [-8, -18, 0], armR: [-80, 0, 48], foreR: [-18, 0, 0], handR: [30, 0, 0], armL: [-20, 0, 40], root: [0, -12, 0] }],
  [2.0, { ...BASE }],
];

export const CUSTODIO_CLIPS = {
  // se levanta del montón: los huesos se juntan, abre los brazos y ruge
  form: clip('form', 3.2, [
    [0, { ...SUNK }],
    [1.3, { ...SUNK, root: [0, -150, 0], chest: [50, 0, 0], head: [30, 0, 0], armL: [-30, 0, 30], armR: [-30, 0, -30] }],
    [2.2, { ...BASE, root: [0, -20, 0], chest: [-14, 0, 0], head: [-36, 0, 0], jaw: [34, 0, 0], armL: [-110, 0, 70], foreL: [-20, 0, 0], armR: [-110, 0, -70], foreR: [-20, 0, 0] }, 'snap'],
    [2.6, { ...BASE, chest: [-12, 0, 0], head: [-34, 0, 0], jaw: [36, 0, 0], armL: [-104, 0, 66], foreL: [-24, 0, 0], armR: [-104, 0, -66], foreR: [-24, 0, 0] }],
    [3.2, { ...BASE }],
  ]),
  sweepR: clip('sweepR', 2.0, SWEEP_R),
  sweepL: clip('sweepL', 2.0, SWEEP_R.map(([t, p, e]) => [t, mirror(p), e])),
  // el mazazo con los dos brazos (de él sale la onda)
  slam: clip('slam', 2.4, [
    [0, { ...BASE }],
    [0.85, { ...BASE, hips: [-6, 0, 0], chest: [-16, 0, 0], head: [-26, 0, 0], jaw: [24, 0, 0], armL: [-172, 0, 18], foreL: [-34, 0, 0], handL: [20, 0, 0], armR: [-172, 0, -18], foreR: [-34, 0, 0], handR: [20, 0, 0], root: [0, 10, 0] }, 'hold'],
    [1.15, { ...BASE, hips: [16, 0, 0], chest: [52, 0, 0], head: [8, 0, 0], jaw: [10, 0, 0], armL: [-64, 0, 10], foreL: [-8, 0, 0], handL: [40, 0, 0], armR: [-64, 0, -10], foreR: [-8, 0, 0], handR: [40, 0, 0], root: [0, -44, 0] }, 'snap'],
    [1.6, { ...BASE, hips: [14, 0, 0], chest: [50, 0, 0], head: [6, 0, 0], armL: [-60, 0, 12], foreL: [-10, 0, 0], handL: [38, 0, 0], armR: [-60, 0, -12], foreR: [-10, 0, 0], handR: [38, 0, 0], root: [0, -42, 0] }],
    [2.4, { ...BASE }],
  ]),
  // la lluvia de calaveras: se arranca puñados del pecho y los lanza, una
  // mano y otra
  skulls: clip('skulls', 2.6, [
    [0, { ...BASE }],
    [0.6, { ...BASE, chest: [0, -16, 0], armR: [-150, 0, -30], foreR: [-50, 0, 0], handR: [30, 0, 0], armL: [-60, 0, 20], foreL: [-80, 0, 0] }],
    [1.0, { ...BASE, chest: [24, 16, 0], armR: [-70, 0, -10], foreR: [-10, 0, 0], handR: [40, 0, 0], armL: [-150, 0, 30], foreL: [-50, 0, 0], handL: [30, 0, 0] }, 'snap'],
    [1.35, { ...BASE, chest: [24, -16, 0], armL: [-70, 0, 10], foreL: [-10, 0, 0], handL: [40, 0, 0], armR: [-150, 0, -30], foreR: [-50, 0, 0], handR: [30, 0, 0] }, 'snap'],
    [1.7, { ...BASE, chest: [24, 16, 0], armR: [-70, 0, -10], foreR: [-10, 0, 0], handR: [40, 0, 0], armL: [-150, 0, 30], foreL: [-50, 0, 0], handL: [30, 0, 0] }, 'snap'],
    [2.05, { ...BASE, chest: [24, -16, 0], armL: [-70, 0, 10], foreL: [-10, 0, 0], handL: [40, 0, 0], armR: [-60, 0, -24], foreR: [-30, 0, 0] }, 'snap'],
    [2.6, { ...BASE }],
  ]),
  // el agarrón: se echa hacia delante con la derecha abierta y cierra la mano
  grab: clip('grab', 2.4, [
    [0, { ...BASE }],
    [0.7, { ...BASE, hips: [-4, -14, 0], chest: [-8, -24, 0], head: [-20, 10, 0], jaw: [26, 0, 0], armR: [-40, 0, -50], foreR: [-96, 0, 0], handR: [-10, 0, 0], root: [0, 0, -20] }, 'hold'],
    [1.0, { ...BASE, hips: [20, 10, 0], chest: [40, 14, 0], head: [-6, -6, 0], jaw: [30, 0, 0], armR: [-92, 0, -6], foreR: [-4, 0, 0], handR: [-24, 0, 0], armL: [-30, 0, 40], root: [0, -30, 40] }, 'snap'],
    [1.25, { ...BASE, hips: [20, 10, 0], chest: [38, 14, 0], head: [-6, -6, 0], jaw: [4, 0, 0], armR: [-90, 0, -6], foreR: [-10, 0, 0], handR: [30, 0, 0], armL: [-30, 0, 40], root: [0, -30, 40] }],
    [1.7, { ...BASE, chest: [6, 0, 0], armR: [-150, 0, -14], foreR: [-30, 0, 0], handR: [40, 0, 0], root: [0, 0, 0] }],
    [2.4, { ...BASE }],
  ]),
  // se deshace, se arrastra por el suelo y se rehace en otro sitio
  reform: clip('reform', 4.4, [
    [0, { ...BASE }],
    [0.3, { ...BASE, chest: [-10, 0, 0], head: [-30, 0, 0], jaw: [30, 0, 0], armL: [-60, 0, 60], armR: [-60, 0, -60] }],
    [0.9, { ...SUNK }, 'in'],
    [3.0, { ...SUNK }],
    [3.7, { ...BASE, root: [0, -60, 0], chest: [-10, 0, 0], head: [-30, 0, 0], jaw: [20, 0, 0], armL: [-90, 0, 50], armR: [-90, 0, -50] }],
    [4.4, { ...BASE }],
  ]),
  // a media vida: se sacude y se le cae el antebrazo izquierdo
  shed: clip('shed', 2.0, [
    [0, { ...BASE }],
    [0.5, { ...BASE, chest: [-20, 20, 18], head: [-36, 0, 14], jaw: [36, 0, 0], armL: [-120, 0, 90], foreL: [-10, 0, 0], armR: [-60, 0, -70] }, 'snap'],
    [0.85, { ...BASE, chest: [26, -20, -12], head: [10, 0, -10], jaw: [20, 0, 0], armL: [-20, 0, 60], foreL: [-60, 0, 0], armR: [-40, 0, -40] }, 'snap'],
    [2.0, { ...BASE }],
  ]),
  hurt: clip('hurt', 0.6, [
    [0, { ...BASE, chest: [-6, 12, 0], head: [-24, 0, 10], root: [0, -6, -10] }, 'snap'],
    [0.6, { ...BASE }],
  ]),
  stagger: clip('stagger', 1.6, [
    [0, { ...BASE, hips: [-10, 0, 0], chest: [-24, 20, 0], head: [-34, 0, 14], armL: [-40, 0, 70], armR: [-40, 0, -70], root: [0, -10, -24] }, 'snap'],
    [0.7, { ...BASE, hips: [26, 0, 0], chest: [50, 0, 0], head: [20, 0, 0], armL: [0, 0, 30], foreL: [-10, 0, 0], armR: [0, 0, -30], foreR: [-10, 0, 0], root: [0, -90, 0] }],
    [1.6, { ...BASE }],
  ]),
  parried: clip('parried', 1.8, [
    [0, { ...BASE, chest: [-26, -20, 0], head: [-36, 0, 16], armR: [-150, 0, -80], foreR: [-20, 0, 0], armL: [-40, 0, 60], root: [0, -8, -26] }, 'snap'],
    [0.6, { ...BASE, chest: [-18, -14, 0], head: [-28, 0, 12], armR: [-120, 0, -70], foreR: [-26, 0, 0], armL: [-30, 0, 50], root: [0, -20, -24] }],
    [1.2, { ...BASE, chest: [0, -8, 0], head: [-18, 0, 6], armR: [-70, 0, -50], foreR: [-30, 0, 0], root: [0, -16, -12] }],
    [1.8, { ...BASE }],
  ]),
  // vencido: se desploma en su montón
  death: clip('death', 3.2, [
    [0, { ...BASE, chest: [-24, 0, 0], head: [-40, 0, 0], jaw: [40, 0, 0], armL: [-100, 0, 70], armR: [-100, 0, -70] }, 'snap'],
    [0.9, { ...BASE, chest: [-30, 0, 10], head: [-44, 0, 10], jaw: [44, 0, 0], armL: [-120, 0, 80], armR: [-120, 0, -80], root: [0, -20, 0] }],
    [2.2, { ...SUNK, root: [0, -200, 0] }, 'in'],
    [3.2, { ...SUNK }],
  ]),
};

// En pie (y hundido mientras espera: sólo se ve el montón).
function loco(e, t, spd) {
  if (e.state === 'bossIdle') return rad(SUNK);
  const br = S(t * 1.3 + e.phase * 0.05);
  const m = Math.min(1, spd / 2);
  const p2 = e.data.phase === 2 ? 1 : 0;
  return rad({
    ...BASE,
    heap: [S(t * 2.2) * 3 * m, 0, S(t * 1.7) * 3 * m],
    hips: [6 + m * 6, S(t * 0.9) * 6, S(t * 1.1) * 3],
    chest: [14 + br * 3 + m * 6, S(t * 0.7) * 5, 0],
    head: [-10 + S(t * 0.5) * 4, S(t * 0.4) * 12, S(t * 0.6) * 4 + p2 * S(t * 3) * 5],
    jaw: [6 + Math.max(0, S(t * 1.9)) * 10, 0, 0],
    armL: [-22 - m * 10 + S(t * 1.2) * 4, 0, 22],
    armR: [-22 - m * 10 + S(t * 1.2 + 1) * 4, 0, -22],
  });
}

// ------------------------------------------------------------ los golpes
const _v = new V3();
const HAND_TIP = new V3(0, -0.45 * K, 0.12 * K);
function handPos(e, h, out) {
  return e.rig.worldPos(h, out, HAND_TIP);
}
// una calavera (malla compartida)
let SKULL = null;
function skullMesh() {
  if (!SKULL) {
    const mat = new THREE.MeshBasicMaterial({ map: getTexture('bone'), color: 0x8a8276 });
    const dark = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const g = new THREE.SphereGeometry(0.17, 7, 5);
    g.scale(1, 0.95, 1.12);
    const jaw = new THREE.BoxGeometry(0.2, 0.08, 0.16).translate(0, -0.14, 0.06);
    const eye = new THREE.BoxGeometry(0.06, 0.05, 0.02);
    SKULL = { mat, dark, g, jaw, eye };
  }
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(SKULL.g, SKULL.mat), new THREE.Mesh(SKULL.jaw, SKULL.mat));
  for (const sx of [-1, 1]) {
    const m = new THREE.Mesh(SKULL.eye, SKULL.dark);
    m.position.set(sx * 0.06, 0.02, 0.18);
    grp.add(m);
  }
  return grp;
}
// Lanza una calavera desde la mano, en parábola hacia el jugador.
function throwSkull(e, g, hand, spread) {
  const c = handPos(e, hand, _v).clone();
  const p = g.player;
  const tx = p.pos.x + p.vx * 0.55 + (Math.random() - 0.5) * spread,
    tz = p.pos.z + p.vz * 0.55 + (Math.random() - 0.5) * spread;
  const T = 0.85 + Math.random() * 0.2;
  const grav = 14;
  const vel = new V3((tx - c.x) / T, (p.pos.y + 0.8 - c.y + 0.5 * grav * T * T) / T, (tz - c.z) / T);
  const mesh = skullMesh();
  mesh.position.copy(c);
  g.scene.add(mesh);
  g.combat.projectiles.push({ kind: 'skull', pos: c, vel, grav, life: 3, dmg: 16, src: e, sprite: g.combat._orb(0xc8b8a0, 0.5), core: g.combat._orb(0xfff0d8, 0.2), color: [0.8, 0.76, 0.68], mesh, spin: new V3(Math.random() * 8 - 4, Math.random() * 8 - 4, 0) });
  g.audio && g.audio.play('boneThrow', c);
}
// El mazazo: la onda delante de él.
function slamQuake(e, g) {
  const f = { x: e.pos.x + Math.sin(e.yaw) * 3.0, z: e.pos.z + Math.cos(e.yaw) * 3.0 };
  g.combat.shockwave(f.x, e.pos.y, f.z, e.data.phase === 2 ? 4.4 : 3.6, 22, e, 8);
  g.fx.blood.emit(f.x, e.pos.y + 0.3, f.z, 26, { color: [0.82, 0.78, 0.7], speed: 6, life: 0.9, up: 3 });
  g.audio && g.audio.play('boneCrack', { x: f.x, y: e.pos.y, z: f.z }, { n: 5 });
}
// Huesos sueltos que saltan (al deshacerse, al rehacerse, al caer).
function boneBurst(g, x, y, z, n, speed = 5) {
  g.fx.blood.emit(x, y + 0.6, z, n, { color: [0.82, 0.78, 0.7], speed, life: 1.1, up: 2.6 });
  g.fx.blood.emit(x, y + 0.3, z, Math.round(n * 0.4), { color: [0.3, 0.28, 0.25], speed: speed * 0.6, life: 0.8, up: 1.2 });
}

// Adónde se va a rehacer: el sitio de la sala que quede a unos seis metros
// de ti (ni encima ni en la otra punta).
function reformSpot(e, g) {
  const C = DEEP.claw;
  const cx = (C.x0 + C.x1) / 2,
    cz = (C.z0 + C.z1) / 2;
  const spots = [
    [cx - 4, cz - 4.5],
    [cx - 4, cz + 4.5],
    [cx + 4, cz - 4.5],
    [cx + 4, cz + 4.5],
    [cx - 4.3, cz],
    [cx + 4.3, cz],
    [cx, cz - 5.5],
    [cx, cz + 5.5],
  ];
  const p = g.player.pos;
  let best = null,
    bd = Infinity;
  for (const [x, z] of spots) {
    const dp = Math.hypot(x - p.x, z - p.z);
    const de = Math.hypot(x - e.pos.x, z - e.pos.z);
    if (de < 3) continue;
    const s = Math.abs(dp - 6.2) + Math.random() * 1.2;
    if (s < bd) {
      bd = s;
      best = { x, z };
    }
  }
  return best || { x: cx - 4, z: cz };
}
const REFORM = {
  name: 'reform',
  clip: CUSTODIO_CLIPS.reform,
  dur: 4.4,
  hits: [],
  trackUntil: 0,
  onStart: (e) => {
    const g = e.game;
    e.data.ref = { from: { x: e.pos.x, z: e.pos.z }, to: reformSpot(e, g), t: 0 };
    g.audio && g.audio.play('boneAvalanche', e.pos);
  },
  update: (e, dt, t) => {
    const g = e.game;
    const R = e.data.ref;
    e.vx = e.vz = 0;
    if (t >= 0.85 && t < 3.0) {
      // los huesos corren por el suelo (no se le puede tocar)
      e.data.air = true;
      const u = ease(Math.min(1, (t - 0.85) / 2.0));
      e.pos.x = R.from.x + (R.to.x - R.from.x) * u;
      e.pos.z = R.from.z + (R.to.z - R.from.z) * u;
      const fl = 1 - Math.sin(Math.PI * Math.min(1, (t - 0.85) / 2.0)) * 0.65;
      e.rig.joints.heap.scale.set(1 + (1 - fl) * 0.3, fl, 1 + (1 - fl) * 0.3);
      R.t -= dt;
      if (R.t <= 0) {
        R.t = 0.05;
        g.fx.blood.emit(e.pos.x + (Math.random() - 0.5) * 1.6, e.pos.y + 0.15, e.pos.z + (Math.random() - 0.5) * 1.6, 3, { color: [0.82, 0.78, 0.7], speed: 1.6, life: 0.7, up: 0.8 });
        if (Math.random() < 0.3) g.audio && g.audio.play('boneClatter', e.pos);
      }
    } else if (t >= 3.0) {
      if (e.data.air) {
        e.data.air = false;
        e.rig.joints.heap.scale.set(1, 1, 1);
        boneBurst(g, e.pos.x, e.pos.y, e.pos.z, 30, 4);
        g.audio && g.audio.play('boneAvalanche', e.pos);
        g.camRig.shake(0.3);
      }
      const p = g.player.pos;
      e.yaw = e.yaw + Math.atan2(Math.sin(Math.atan2(p.x - e.pos.x, p.z - e.pos.z) - e.yaw), Math.cos(Math.atan2(p.x - e.pos.x, p.z - e.pos.z) - e.yaw)) * Math.min(1, dt * 4);
    }
  },
};
const SHED = {
  name: 'shed',
  clip: CUSTODIO_CLIPS.shed,
  dur: 2.0,
  hits: [],
  trackUntil: 0,
  events: [
    {
      t: 0.82,
      fn: (e, g) => {
        // se le cae el antebrazo izquierdo
        for (const j of ['foreL', 'handL']) for (const m of e.rig.joints[j].children) if (m.isMesh) m.visible = false;
        const h = e.rig.worldPos('foreL', _v);
        boneBurst(g, h.x, h.y - 1.2, h.z, 40, 6);
        g.audio && g.audio.play('boneAvalanche', h);
        g.camRig.shake(0.45);
      },
    },
  ],
};

const ATTACKS = [
  { name: 'sweepR', clip: CUSTODIO_CLIPS.sweepR, dur: 2.0, min: 0, max: 5.0, hits: [[0.95, 1.12]], dmg: 28, range: 5.0, arc: 150, weight: 3, trackUntil: 0.75, turn: 2.2 },
  { name: 'sweepL', clip: CUSTODIO_CLIPS.sweepL, dur: 2.0, min: 0, max: 5.0, hits: [[0.95, 1.12]], dmg: 28, range: 5.0, arc: 150, weight: 3, trackUntil: 0.75, turn: 2.2, cond: (e) => e.data.phase !== 2 },
  { name: 'slam', clip: CUSTODIO_CLIPS.slam, dur: 2.4, min: 0, max: 4.8, hits: [[1.12, 1.26]], dmg: 34, range: 4.6, arc: 70, weight: 2.4, noParry: true, trackUntil: 0.8, turn: 2, events: [{ t: 1.16, fn: slamQuake }] },
  {
    name: 'skulls',
    clip: CUSTODIO_CLIPS.skulls,
    dur: 2.6,
    min: 4,
    max: 16,
    hits: [],
    weight: 2,
    noParry: true,
    trackUntil: 2.0,
    turn: 2.4,
    events: [1.0, 1.35, 1.7, 2.05].flatMap((t, i) => {
      const hand = i % 2 ? 'handL' : 'handR';
      return [{ t, fn: (e, g) => (e.data.phase === 2 && hand === 'handL' ? throwSkull(e, g, 'handR', 3) : throwSkull(e, g, hand, 1.6 + i * 0.6)) }];
    }),
  },
  { name: 'grab', clip: CUSTODIO_CLIPS.grab, dur: 2.4, min: 2.4, max: 7.5, hits: [[0.95, 1.18]], dmg: 32, stDmg: 80, knock: 9, stagger: true, range: 2.6, arc: 70, weight: 1.6, noParry: true, unblockable: true, lunge: [[0.72, 1.05, 8]], trackUntil: 0.7, turn: 2.6 },
];

export const CUSTODIO_TYPE = {
  name: 'El Custodio de la Garra',
  title: 'el Custodio',
  build: buildCustodio,
  hp: 920,
  poise: 150,
  radius: 1.25,
  height: 4.0,
  lockHeight: 2.8,
  walk: 1.5,
  run: 2.8,
  runDist: 7,
  sight: 30,
  hear: 30,
  turn: 2.2,
  approach: 3.2,
  heavy: true,
  boss: true,
  float: true,
  introDur: 3.4,
  alertTime: 3.2,
  // (jefe: tres parrys seguidos para desequilibrarle)
  parryPosture: 3,
  parryDur: 1.6,
  deathDur: 6,
  clips: CUSTODIO_CLIPS,
  voice: 'custodio',
  attacks: ATTACKS,
  loco,
  init: (e) => {
    // lo que late dentro del pecho (una luz que le sigue)
    e.P.light = e.game.fx.lights.add({ x: e.pos.x, y: e.pos.y + 2, z: e.pos.z, color: 0xff3a20, intensity: 0, range: 6, flicker: 0.2, priority: 2 });
  },
  onReset: (e) => {
    e.data.phase = 1;
    e.data.reformT = 14;
    e.data.hits = [];
    e.data.air = false;
    e.anim.speed = 1;
    e.rig.joints.heap.scale.set(1, 1, 1);
    for (const j of ['foreL', 'handL']) for (const m of e.rig.joints[j].children) if (m.isMesh) m.visible = true;
  },
  onWake: (e, g) => {
    e.aware = true;
    e.state = 'alert';
    e.stT = 0;
    e.anim.play(CUSTODIO_CLIPS.form, { blend: 0.05 });
    // los huesos de los muros y de los nichos acuden al montón
    const C = DEEP.claw;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const x = e.pos.x + Math.cos(a) * 4.5,
        z = e.pos.z + Math.sin(a) * 4.5;
      g.fx.blood.emit(Math.max(C.x0 + 0.5, Math.min(C.x1 - 0.5, x)), e.pos.y + 0.4 + Math.random() * 2, Math.max(C.z0 + 0.5, Math.min(C.z1 - 0.5, z)), 4, { color: [0.82, 0.78, 0.7], speed: 3, life: 0.9, up: 1, dir: { x: -Math.cos(a), z: -Math.sin(a) } });
    }
    g.audio && g.audio.play('boneAvalanche', e.pos);
    e.data.reformT = 16;
  },
  // se rehace en otro sitio: cada tanto, o si le pegan mucho seguido
  think: (e, player, d, dt) => {
    e.data.reformT -= dt;
    const now = e.game.time;
    const recent = e.data.hits.filter((t) => now - t < 4).length;
    if ((e.data.reformT <= 0 || recent >= 4) && e.cooldown <= 0.3) {
      e.data.reformT = e.data.phase === 2 ? 10 + Math.random() * 4 : 15 + Math.random() * 6;
      e.data.hits.length = 0;
      e.startAttack(REFORM);
      return 'handled';
    }
    return null;
  },
  update: (e, dt) => {
    const g = e.game;
    const t = g.time;
    // lo que late (más deprisa en la segunda forma; se apaga al morir)
    const lt = e.P.light;
    if (lt) {
      const h = e.rig.worldPos('chest', _v);
      lt.x = h.x;
      lt.y = h.y + 0.5;
      lt.z = h.z;
      const beat = Math.max(0, S(t * (e.data.phase === 2 ? 7 : 4.4))) ** 3;
      const want = e.dead || e.state === 'bossIdle' || e.data.air ? 0 : 1.2 + beat * 1.6;
      lt.intensity += (want - lt.intensity) * Math.min(1, dt * 6);
    }
    if (e.dead) return;
    // la segunda forma: a media vida se sacude y pierde el antebrazo
    if (e.hp < e.maxHp * 0.5 && e.data.phase !== 2 && e.state !== 'attack' && e.state !== 'bossIdle' && e.aware) {
      e.data.phase = 2;
      e.startAttack(SHED);
      e.data.reformT = Math.min(e.data.reformT, 6);
      g.onBossPhase && g.onBossPhase(e);
    }
    if (e.data.phase === 2) e.anim.speed = e.state === 'attack' && e.atk !== REFORM ? 1.15 : 1;
  },
  onHit: (e, r) => {
    const g = e.game;
    e.data.hits && e.data.hits.push(g.time);
    // cada golpe le arranca huesos
    const h = e.rig.worldPos('chest', _v);
    g.fx.blood.emit(h.x, h.y + 0.4, h.z, r === 'kill' ? 60 : 8, { color: [0.82, 0.78, 0.7], speed: r === 'kill' ? 7 : 3, life: 0.9, up: 2 });
    if (r === 'kill') {
      boneBurst(g, e.pos.x, e.pos.y, e.pos.z, 80, 7);
      g.audio && g.audio.play('boneAvalanche', e.pos);
      g.camRig.shake(0.7);
    }
  },
};
