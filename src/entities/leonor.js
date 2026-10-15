// Leonor, la Dolorosa: la mujer de Henrique, después del trato.
//
// Se le murió el niño (Tomé) con las fiebres del asedio y rezó a la Dolorosa
// siete noches; a la octava le contestó algo desde debajo de la casa. Cavó
// hasta encontrarlo. Ahora es una mole de carne hinchada y llena de pus que
// arrastra con los brazos, larguísimos; del cuerpo de mujer le queda el pecho
// flaco, la cara (que no deja de llorar: lágrimas de pus) y el hatillo de
// trapos que lleva atado al pecho, donde dice que está su niño.
//
// Pelea en su gruta, junto a la cuna. Zarpazos de un lado y de otro, un golpe
// con los dos brazos, un abrazo a la carrera (si te alcanza, te aplasta),
// vómitos de pus que dejan charcos y un llanto que rompe la guardia. A la
// mitad de la vida le revientan las pústulas: más rápida, más charcos, y se
// tira encima con toda la mole.
import * as THREE from 'three';
import { Rig, clip } from './rig.js';
import { DEG, clamp, approachAngle } from '../core/util.js';
import { DIALOG } from '../game/story.js';

const S = Math.sin,
  Cc = Math.cos;
const V3 = THREE.Vector3;
// todo el cuerpo, a esta escala
const K = 1.45;
const k3 = (v) => v.map((x) => x * K);

// grados -> radianes (root en cm -> m)
function rad(p) {
  const o = {};
  for (const k in p) o[k] = k === 'root' ? p[k].map((v) => v / 100) : p[k].map((v) => v * DEG);
  return o;
}

// ------------------------------------------------------------ el cuerpo
export function buildLeonor() {
  const J = (name, parent, pos) => ({ name, parent, pos: k3(pos) });
  const joints = [
    // la mole (la raíz: la mueve pose.root), lo que arrastra detrás, el pecho
    J('hips', null, [0, 0.6, 0]),
    J('sac', 'hips', [0, 0.02, -0.52]),
    J('chest', 'hips', [0, 0.3, 0.32]),
    J('neck', 'chest', [0, 0.56, 0.05]),
    J('head', 'neck', [0, 0.1, 0.03]),
    J('jaw', 'head', [0, 0.03, 0.06]),
    J('hair', 'head', [0, 0.21, -0.03]),
    J('armL', 'chest', [0.31, 0.47, 0]),
    J('foreL', 'armL', [0, -0.64, 0]),
    J('handL', 'foreL', [0, -0.68, 0]),
    J('armR', 'chest', [-0.31, 0.47, 0]),
    J('foreR', 'armR', [0, -0.64, 0]),
    J('handR', 'foreR', [0, -0.68, 0]),
    J('bundle', 'chest', [0.05, 0.17, 0.19]),
  ];
  const parts = [];
  const add = (j, type, s, p, mat, o = {}) => parts.push({ j, type, s: k3(s), p: k3(p), mat, ...o });
  // la mole: el vientre hinchado, lo que cuelga por debajo y los pliegues
  add('hips', 'ico', [0.62, 0.47, 0.66], [0, 0, -0.06], 'skinPus', { detail: 1 });
  add('hips', 'ico', [0.5, 0.34, 0.5], [0, -0.28, 0.12], 'skinPus', { detail: 1 });
  add('hips', 'ico', [0.36, 0.3, 0.4], [0.32, -0.18, -0.12], 'skinPus');
  add('hips', 'ico', [0.34, 0.28, 0.38], [-0.34, -0.2, -0.04], 'skinPus');
  // los restos del camisón, pegados a la carne
  add('hips', 'box', [0.84, 0.34, 0.03], [0, 0.14, 0.4], 'clothWhite', { r: [-18, 0, 0], taper: [1.15, 1] });
  for (let i = 0; i < 5; i++) add('hips', 'box', [0.1, 0.42 + (i % 3) * 0.12, 0.02], [-0.3 + i * 0.15, -0.1, 0.44 - (i % 2) * 0.04], 'clothWhite', { r: [-8 + (i % 3) * 6, 0, (i - 2) * 6] });
  // las piernas que se le hundieron en la carne: dos pies que asoman detrás
  for (const s of [-1, 1]) {
    add('hips', 'box', [0.1, 0.3, 0.12], [s * 0.24, -0.36, -0.58], 'skinPus', { r: [60, 0, s * 12] });
    add('hips', 'box', [0.1, 0.05, 0.2], [s * 0.26, -0.5, -0.72], 'skinPus', { r: [20, 0, 0] });
  }
  // las pústulas (el pus brilla)
  const pust = (j, n, rx, ry, rz, cy, cz, seed, smin = 0.06, smax = 0.15) => {
    for (let i = 0; i < n; i++) {
      const a = (i * 2.399 + seed) % (Math.PI * 2);
      const b = ((i * 0.618 + seed * 0.37) % 1) * 1.6 - 0.3;
      const s = smin + ((i * 37 + seed * 11) % 10) / 10 * (smax - smin);
      add(j, 'ico', [s, s * 0.8, s], [Math.cos(a) * rx * Math.cos(b), cy + Math.sin(b) * ry, cz + Math.sin(a) * rz * Math.cos(b)], 'pus');
    }
  };
  pust('hips', 16, 0.6, 0.42, 0.62, 0.02, -0.06, 1.3);
  // lo que arrastra: un saco de carne con ampollas de pus
  add('sac', 'ico', [0.55, 0.4, 0.62], [0, -0.06, -0.16], 'skinPus', { detail: 1 });
  add('sac', 'ico', [0.3, 0.22, 0.34], [0.1, -0.22, -0.62], 'skinPus');
  add('sac', 'ico', [0.24, 0.22, 0.24], [0.2, 0.28, -0.1], 'pus');
  add('sac', 'ico', [0.18, 0.16, 0.18], [-0.24, 0.24, -0.3], 'pus');
  add('sac', 'ico', [0.14, 0.12, 0.14], [0.02, 0.3, -0.42], 'pus');
  pust('sac', 9, 0.52, 0.36, 0.6, -0.04, -0.18, 4.1, 0.05, 0.11);
  for (let i = 0; i < 4; i++) add('sac', 'box', [0.025, 0.025, 0.7], [-0.3 + i * 0.2, 0.18 + (i % 2) * 0.08, -0.2], 'flesh', { r: [8 - i * 4, (i - 1.5) * 14, 0] });
  // el pecho: flaco, las costillas marcadas bajo la piel, el camisón roto
  add('chest', 'box', [0.44, 0.6, 0.28], [0, 0.28, 0], 'skinPus', { taper: [1.22, 1.1] });
  for (let i = 0; i < 4; i++) add('chest', 'box', [0.36 - i * 0.03, 0.022, 0.02], [0, 0.18 + i * 0.085, 0.142], 'bone', { taper: [0.9, 1] });
  add('chest', 'box', [0.03, 0.34, 0.02], [0, 0.3, 0.146], 'bone');
  add('chest', 'box', [0.5, 0.26, 0.31], [0, 0.07, 0], 'clothWhite', { taper: [1.12, 1.06] });
  for (let i = 0; i < 4; i++) add('chest', 'box', [0.08, 0.24 + (i % 2) * 0.1, 0.02], [-0.18 + i * 0.12, -0.12, 0.16], 'clothWhite', { r: [-10, 0, (i - 1.5) * 8] });
  for (const s of [-1, 1]) add('chest', 'ico', [0.12, 0.11, 0.12], [s * 0.27, 0.47, 0], 'skinPus');
  pust('chest', 5, 0.24, 0.2, 0.15, 0.3, 0.02, 2.7, 0.035, 0.07);
  // el hatillo atado al pecho: trapos, cuerdas y una mancha de pus
  add('bundle', 'ico', [0.19, 0.13, 0.13], [0, 0, 0], 'clothWhite', { detail: 1 });
  add('bundle', 'ico', [0.09, 0.08, 0.08], [0.11, 0.05, 0.02], 'clothWhite');
  add('bundle', 'box', [0.05, 0.3, 0.2], [0, 0, 0], 'burlap', { r: [0, 0, 30] });
  add('bundle', 'box', [0.62, 0.04, 0.05], [-0.06, 0.06, -0.1], 'burlap', { r: [0, 0, -24] });
  add('bundle', 'ico', [0.06, 0.05, 0.05], [-0.05, 0.02, 0.11], 'pus');
  // el cuello y la cabeza (algo grande para el cuerpo: se lee de lejos): la
  // cara chupada que llora pus, la boca abierta en un grito, el pelo
  add('neck', 'cyl', [0.062, 0.08, 0.16], [0, 0.04, 0], 'skinPus');
  add('neck', 'box', [0.03, 0.14, 0.02], [0.03, 0.04, 0.06], 'bone', { r: [10, 0, 14] });
  add('head', 'box', [0.24, 0.29, 0.25], [0, 0.13, 0.01], 'skinPus');
  add('head', 'box', [0.2, 0.09, 0.22], [0, 0.0, 0.015], 'skinPus', { taper: [0.78, 0.9] });
  for (const s of [-1, 1]) {
    // las cuencas hundidas y las mejillas chupadas
    add('head', 'box', [0.078, 0.062, 0.02], [s * 0.058, 0.165, 0.123], 'black');
    add('head', 'box', [0.05, 0.07, 0.016], [s * 0.078, 0.07, 0.122], 'black', { r: [0, 0, s * -12] });
    add('head', 'box', [0.026, 0.018, 0.01], [s * 0.058, 0.162, 0.131], 'eyeCold');
    // las lágrimas: dos regueros de pus de los ojos a la barbilla, que gotean
    add('head', 'box', [0.024, 0.17, 0.014], [s * 0.064, 0.07, 0.132], 'pus');
    add('head', 'box', [0.018, 0.09, 0.012], [s * 0.082, -0.03, 0.124], 'pus');
    add('head', 'box', [0.012, 0.1, 0.012], [s * 0.088, -0.11, 0.118], 'pus');
    // pústulas en la frente y en la sien
    add('head', 'ico', [0.026, 0.022, 0.02], [s * 0.07, 0.25, 0.122], 'pus');
    add('head', 'ico', [0.03, 0.026, 0.024], [s * 0.118, 0.17, 0.05], 'pus');
  }
  add('head', 'box', [0.045, 0.065, 0.045], [0, 0.115, 0.132], 'skinPus');
  // la boca: un agujero negro, siempre algo abierto (grita, solloza)
  add('head', 'box', [0.13, 0.08, 0.05], [0, 0.03, 0.11], 'black');
  add('jaw', 'box', [0.19, 0.055, 0.17], [0, -0.035, 0.025], 'skinPus');
  add('jaw', 'box', [0.12, 0.014, 0.02], [0, -0.008, 0.1], 'bone');
  // babas de pus colgando de la boca
  add('jaw', 'box', [0.012, 0.16, 0.012], [0.03, -0.12, 0.1], 'pus', { r: [6, 0, 0] });
  add('jaw', 'box', [0.01, 0.1, 0.01], [-0.035, -0.09, 0.098], 'pus');
  // el pelo: largo y negro, por delante de la cara y por la espalda
  add('hair', 'box', [0.28, 0.07, 0.29], [0, 0.0, 0.0], 'black');
  add('hair', 'box', [0.3, 0.3, 0.06], [0, -0.14, -0.14], 'black', { taper: [1.2, 1] });
  for (let i = 0; i < 8; i++) {
    const x = -0.13 + i * 0.037;
    add('hair', 'box', [0.034, 0.8 + (i % 3) * 0.16, 0.024], [x, -0.42 - (i % 3) * 0.08, -0.14], 'black', { r: [8, 0, (i - 3.5) * 3] });
  }
  // los mechones de delante, sobre la cara (dejan ver un ojo)
  for (const [x, l] of [
    [-0.1, 0.66],
    [-0.072, 0.52],
    [0.05, 0.6],
    [0.085, 0.72],
    [0.11, 0.48],
  ])
    add('hair', 'box', [0.03, l, 0.02], [x, -l / 2 + 0.02, 0.14], 'black', { r: [-6, 0, x * 40] });
  // los brazos, larguísimos, con dedos como ganchos
  for (const s of [-1, 1]) {
    const L = s > 0 ? 'L' : 'R';
    add('arm' + L, 'box', [0.12, 0.66, 0.12], [0, -0.32, 0], 'skinPus', { taper: [0.7, 0.8] });
    add('arm' + L, 'ico', [0.06, 0.05, 0.06], [s * 0.05, -0.4, 0.04], 'pus');
    add('arm' + L, 'box', [0.02, 0.4, 0.02], [s * 0.05, -0.3, -0.05], 'bone');
    add('fore' + L, 'box', [0.095, 0.7, 0.095], [0, -0.34, 0], 'skinPus', { taper: [0.6, 0.8] });
    add('fore' + L, 'ico', [0.075, 0.07, 0.07], [0, 0.0, 0], 'skinPus');
    add('fore' + L, 'box', [0.03, 0.05, 0.05], [0, 0.02, -0.06], 'bone');
    add('fore' + L, 'ico', [0.05, 0.045, 0.05], [0, -0.24, 0.04], 'pus');
    add('fore' + L, 'ico', [0.035, 0.03, 0.035], [s * 0.04, -0.44, 0.0], 'pus');
    add('hand' + L, 'box', [0.12, 0.12, 0.06], [0, -0.05, 0], 'skinPus');
    for (let f = 0; f < 4; f++) {
      const x = -0.045 + f * 0.03;
      add('hand' + L, 'box', [0.017, 0.26, 0.017], [x, -0.23, 0.03], 'skinPus', { r: [-14, 0, (f - 1.5) * 4] });
      add('hand' + L, 'box', [0.014, 0.05, 0.014], [x - (f - 1.5) * 0.008, -0.375, 0.066], 'bone', { r: [-34, 0, 0] });
    }
    add('hand' + L, 'box', [0.02, 0.16, 0.02], [s * 0.065, -0.13, 0.02], 'skinPus', { r: [-20, 0, s * 30] });
  }
  return new Rig({ joints, parts });
}

// ------------------------------------------------------------ poses y clips
// A rastras: el pecho echado hacia delante y los brazos apoyados delante.
const B = { chest: [40, 0, 0], neck: [-18, 0, 0], head: [-14, 0, 0], jaw: [8, 0, 0], hair: [14, 0, 0], armL: [-62, 0, 16], foreL: [-22, 0, 0], handL: [44, 0, 0], armR: [-62, 0, -16], foreR: [-22, 0, 0], handR: [44, 0, 0] };
// erguida, chillando con los brazos abiertos
const R = { chest: [-6, 0, 0], neck: [-12, 0, 0], head: [-30, 0, 0], jaw: [34, 0, 0], hair: [34, 0, 0], armL: [-150, 0, 34], foreL: [-30, 0, 0], handL: [10, 0, 0], armR: [-150, 0, -34], foreR: [-30, 0, 0], handR: [10, 0, 0], root: [0, 14, 0] };
// de rodillas sobre la cuna, meciéndola
const CRADLE = { chest: [70, 0, 0], neck: [10, 0, 0], head: [34, 0, 0], jaw: [10, 0, 0], hair: [-10, 0, 0], armL: [-80, 0, -18], foreL: [-70, 0, 0], handL: [30, 0, 0], armR: [-80, 0, 18], foreR: [-70, 0, 0], handR: [30, 0, 0], root: [0, -10, 0] };

export const LEONOR_CLIPS = {
  // se vuelve desde la cuna, se yergue y chilla
  alert: clip(
    'alert',
    3.0,
    [
      [0, { ...CRADLE }],
      [0.8, { ...CRADLE, chest: [52, 0, 0], neck: [-6, 26, 0], head: [-6, 30, 0] }],
      [1.5, { ...R, jaw: [10, 0, 0] }, 'snap'],
      [1.75, { ...R }],
      [2.5, { ...R, chest: [-10, 0, 0], head: [-36, 0, 0] }],
      [3.0, { ...B }],
    ],
    { events: [{ t: 1.55, name: 'scream' }] }
  ),
  hurt: clip('hurt', 0.55, [
    [0, { ...B, chest: [24, 12, 10], head: [-34, 0, 16], jaw: [28, 0, 0], armL: [-40, 0, 40] }, 'snap'],
    [0.55, { ...B }],
  ]),
  stagger: clip('stagger', 1.5, [
    [0, { ...B, chest: [4, 0, 14], head: [-40, 0, 0], jaw: [30, 0, 0], armL: [-120, 0, 70], armR: [-110, 0, -60], root: [0, -6, -16] }, 'snap'],
    [0.7, { ...B, chest: [62, 0, -8], head: [10, 0, 0], armL: [-40, 0, 30], armR: [-30, 0, -30], root: [0, -14, -6] }],
    [1.5, { ...B }],
  ]),
  // se yergue con el último chillido y se derrumba sobre el hatillo
  death: clip('death', 3.6, [
    [0, { ...R, jaw: [20, 0, 0] }, 'snap'],
    [1.0, { ...R, chest: [-14, 0, 0], head: [-44, 0, 0], jaw: [40, 0, 0], armL: [-120, 0, 60], armR: [-120, 0, -60] }],
    [2.2, { chest: [72, 0, 10], neck: [20, 0, 0], head: [40, 0, 20], jaw: [16, 0, 0], hair: [-20, 0, 0], armL: [-24, 0, 34], foreL: [-10, 0, 0], armR: [-30, 0, -36], foreR: [-20, 0, 0], root: [0, -28, 10] }, 'in'],
    [3.6, { chest: [88, 0, 14], neck: [24, 0, 0], head: [50, 0, 24], jaw: [12, 0, 0], hair: [-30, 0, 0], armL: [-80, 0, -20], foreL: [-100, 0, 0], armR: [-12, 0, -46], foreR: [-6, 0, 0], root: [0, -40, 12] }],
  ]),
  // zarpazo con la derecha, de fuera adentro
  swipeR: clip(
    'swipeR',
    1.5,
    [
      [0, { ...B }],
      [0.55, { ...B, chest: [22, 34, 0], head: [-20, -20, 0], armR: [-150, 30, -56], foreR: [-40, 0, 0], handR: [10, 0, 0] }, 'hold'],
      [0.7, { ...B, chest: [46, -34, 0], head: [-10, 16, 0], jaw: [26, 0, 0], armR: [-78, -40, 46], foreR: [-8, 0, 0], handR: [30, 0, 0] }, 'snap'],
      [1.0, { ...B, chest: [44, -30, 0], armR: [-74, -40, 40], foreR: [-10, 0, 0] }],
      [1.5, { ...B }],
    ],
    { events: [{ t: 0.6, name: 'swing' }] }
  ),
  swipeL: clip(
    'swipeL',
    1.5,
    [
      [0, { ...B }],
      [0.55, { ...B, chest: [22, -34, 0], head: [-20, 20, 0], armL: [-150, -30, 56], foreL: [-40, 0, 0], handL: [10, 0, 0] }, 'hold'],
      [0.7, { ...B, chest: [46, 34, 0], head: [-10, -16, 0], jaw: [26, 0, 0], armL: [-78, 40, -46], foreL: [-8, 0, 0], handL: [30, 0, 0] }, 'snap'],
      [1.0, { ...B, chest: [44, 30, 0], armL: [-74, 40, -40], foreL: [-10, 0, 0] }],
      [1.5, { ...B }],
    ],
    { events: [{ t: 0.6, name: 'swing' }] }
  ),
  // los dos brazos en alto y abajo, contra el suelo
  slam: clip(
    'slam',
    1.9,
    [
      [0, { ...B }],
      [0.7, { ...R, armL: [-178, 0, 16], armR: [-178, 0, -16], foreL: [-24, 0, 0], foreR: [-24, 0, 0], jaw: [20, 0, 0] }, 'hold'],
      [0.92, { ...B, chest: [58, 0, 0], head: [-6, 0, 0], jaw: [30, 0, 0], armL: [-66, 0, 12], armR: [-66, 0, -12], foreL: [-4, 0, 0], foreR: [-4, 0, 0], root: [0, -14, 10] }, 'snap'],
      [1.35, { ...B, chest: [56, 0, 0], armL: [-64, 0, 12], armR: [-64, 0, -12], root: [0, -12, 8] }],
      [1.9, { ...B }],
    ],
    { events: [{ t: 0.75, name: 'swing' }] }
  ),
  // el abrazo: se encoge, se lanza con los brazos abiertos y los cierra
  embrace: clip('embrace', 2.1, [
    [0, { ...B }],
    [0.55, { ...B, chest: [58, 0, 0], head: [-26, 0, 0], armL: [-28, 0, 54], armR: [-28, 0, -54], root: [0, -14, -10] }, 'hold'],
    [0.85, { ...B, chest: [26, 0, 0], head: [-24, 0, 0], jaw: [34, 0, 0], armL: [-104, 0, 84], armR: [-104, 0, -84], foreL: [-10, 0, 0], foreR: [-10, 0, 0], root: [0, 6, 10] }],
    [1.1, { ...B, chest: [32, 0, 0], head: [-10, 0, 0], jaw: [20, 0, 0], armL: [-96, -30, 6], armR: [-96, 30, -6], foreL: [-86, 0, 0], foreR: [-86, 0, 0], root: [0, 2, 10] }, 'snap'],
    [1.6, { ...B, chest: [36, 0, 0], armL: [-94, -30, 4], armR: [-94, 30, -4], foreL: [-88, 0, 0], foreR: [-88, 0, 0] }],
    [2.1, { ...B }],
  ]),
  // se echa atrás y vomita pus hacia delante, a borbotones
  vomit: clip('vomit', 2.8, [
    [0, { ...B }],
    [0.7, { ...B, chest: [0, 0, 0], neck: [-14, 0, 0], head: [-34, 0, 0], jaw: [12, 0, 0], armL: [-40, 0, 30], armR: [-40, 0, -30], root: [0, 8, -8] }, 'hold'],
    [1.0, { ...B, chest: [58, 0, 0], neck: [14, 0, 0], head: [18, 0, 0], jaw: [44, 0, 0], armL: [-70, 0, 22], armR: [-70, 0, -22], root: [0, -8, 8] }, 'snap'],
    [1.4, { ...B, chest: [54, 0, 6], neck: [10, 0, 0], head: [14, 0, 6], jaw: [40, 0, 0], armL: [-70, 0, 22], armR: [-70, 0, -22], root: [0, -6, 8] }],
    [1.8, { ...B, chest: [58, 0, -6], neck: [14, 0, 0], head: [20, 0, -6], jaw: [44, 0, 0], armL: [-70, 0, 22], armR: [-70, 0, -22], root: [0, -8, 8] }],
    [2.8, { ...B }],
  ]),
  // llora a gritos, con las manos en la cabeza: el llanto rompe la guardia
  wail: clip('wail', 2.9, [
    [0, { ...B }],
    [0.9, { ...R, armL: [-158, 0, 6], foreL: [-128, 0, 0], handL: [20, 0, 0], armR: [-158, 0, -6], foreR: [-128, 0, 0], handR: [20, 0, 0], jaw: [16, 0, 0] }, 'hold'],
    [1.12, { ...R, armL: [-160, 0, 8], foreL: [-130, 0, 0], armR: [-160, 0, -8], foreR: [-130, 0, 0], head: [-40, 0, 0], jaw: [42, 0, 0], root: [0, 18, 0] }, 'snap'],
    [2.2, { ...R, armL: [-158, 0, 8], foreL: [-128, 0, 0], armR: [-158, 0, -8], foreR: [-128, 0, 0], head: [-38, 0, 4], jaw: [40, 0, 0], root: [0, 16, 0] }],
    [2.9, { ...B }],
  ]),
  // (segunda forma) alza la mole entera y se deja caer encima
  belly: clip('belly', 2.4, [
    [0, { ...B }],
    [0.8, { ...R, chest: [-14, 0, 0], armL: [-170, 0, 30], armR: [-170, 0, -30], root: [0, 34, -12] }, 'hold'],
    [1.05, { ...B, chest: [64, 0, 0], head: [-4, 0, 0], jaw: [34, 0, 0], armL: [-46, 0, 44], armR: [-46, 0, -44], root: [0, -22, 22] }, 'snap'],
    [1.6, { ...B, chest: [60, 0, 0], armL: [-50, 0, 40], armR: [-50, 0, -40], root: [0, -20, 18] }],
    [2.4, { ...B }],
  ]),
  // le revientan las pústulas: se retuerce y chilla
  burst: clip(
    'burst',
    3.2,
    [
      [0, { ...B }],
      [0.45, { ...B, chest: [14, 0, 22], head: [-40, 0, -22], jaw: [30, 0, 0], armL: [-120, 0, 70], armR: [-60, 0, -20] }, 'snap'],
      [0.95, { ...B, chest: [22, 0, -22], head: [-30, 0, 22], jaw: [24, 0, 0], armL: [-50, 0, 20], armR: [-130, 0, -70] }, 'snap'],
      [1.55, { ...R, jaw: [44, 0, 0], root: [0, 20, 0] }, 'snap'],
      [2.5, { ...R, jaw: [40, 0, 0], head: [-40, 0, 0], root: [0, 18, 0] }],
      [3.2, { ...B }],
    ],
    { events: [{ t: 1.55, name: 'scream' }] }
  ),
};

// ------------------------------------------------------------ cuerpo en movimiento
// A rastras: los brazos tiran del cuerpo por turnos y la mole se bambolea.
function loco(e, t, spd) {
  if (e.state === 'bossIdle') {
    // meciendo la cuna, entre sollozos
    const r = S(t * 1.3);
    const sob = Math.max(0, S(t * 7.1)) ** 6 * (S(t * 0.37) > 0.2 ? 1 : 0);
    return rad({ ...CRADLE, chest: [70 + r * 7 + sob * 6, 0, r * 3], head: [34 + r * 5 - sob * 8, 0, 0], jaw: [10 + sob * 14, 0, 0], armL: [-80 + r * 10, 0, -18], armR: [-80 + r * 10, 0, 18], root: [0, -10 + r * 2, r * 3] });
  }
  const ph = e.phase;
  const m = clamp(spd / 1.6, 0, 1.4);
  const br = S(t * 1.4 + e.data.seed);
  const sL = S(ph),
    sR = S(ph + Math.PI);
  const p2 = e.data.phase === 2 ? 1 : 0;
  return rad({
    chest: [40 + br * 3 + m * 4, sL * 8 * m, sL * 5 * m],
    neck: [-18, -sL * 6 * m, 0],
    head: [-14 + br * 2, 0, S(t * 0.9) * 6 + p2 * S(t * 3.3) * 6],
    jaw: [8 + Math.max(0, S(t * 2.1)) * 10, 0, 0],
    hair: [14 + m * 10, 0, -sL * 8],
    armL: [-62 - sL * 26 * m, 0, 16],
    foreL: [-22 + Math.max(0, -sL) * 22 * m, 0, 0],
    handL: [44, 0, 0],
    armR: [-62 - sR * 26 * m, 0, -16],
    foreR: [-22 + Math.max(0, -sR) * 22 * m, 0, 0],
    handR: [44, 0, 0],
    sac: [S(ph * 0.5) * 4 * m, S(ph) * 10 * m, 0],
    root: [0, Math.abs(S(ph)) * 3 * m + br * 1.2, 0],
  });
}

// ------------------------------------------------------------ el guion de la pelea
function who(e) {
  if (!e.P.who) {
    const off = new V3(0, 0.55, 0);
    e.P.who = { id: 'leonor', name: 'Leonor', cls: 'leonor', voice: 'leonorTalk', head: (out) => e.rig.worldPos('head', out, off) };
  }
  return e.P.who;
}
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function say(e, text, dur) {
  const sp = e.game.speech;
  if (sp) sp.say(who(e), text, { dur });
}

// un punto delante de ella (d metros, desviado a radianes)
function ahead(e, d, a = 0) {
  return { x: e.pos.x + Math.sin(e.yaw + a) * d, z: e.pos.z + Math.cos(e.yaw + a) * d };
}

// Golpe de la mole contra el suelo: onda, salpicón de pus y charcos.
function crash(e, g, r, dmg, pools) {
  const f = ahead(e, 1.2 * K);
  g.combat.shockwave(f.x, e.pos.y, f.z, r, dmg, e, 8);
  g.combat.pusSplash(f.x, e.pos.y, f.z, 1.2);
  for (let i = 0; i < pools; i++) {
    const a = (i / pools) * Math.PI * 2 + Math.random() * 0.6;
    const d = r * (0.45 + Math.random() * 0.4);
    g.combat.pusPool(f.x + Math.cos(a) * d, e.pos.y, f.z + Math.sin(a) * d, 0.9 + Math.random() * 0.5, 7);
  }
}

// Vomita: una bocanada de pus hacia el jugador (con dispersión).
function spew(e, g, spread) {
  const h = e.rig.worldPos('jaw', e.P.v || (e.P.v = new V3()));
  g.combat.pusGlob(e, h, spread);
}

const ATTACKS = [
  { name: 'swipeR', clip: LEONOR_CLIPS.swipeR, dur: 1.5, min: 0, max: 3.8, hits: [[0.64, 0.8]], dmg: 24, range: 3.6, arc: 150, weight: 3, trackUntil: 0.56, turn: 2.6 },
  { name: 'swipeL', clip: LEONOR_CLIPS.swipeL, dur: 1.5, min: 0, max: 3.8, hits: [[0.64, 0.8]], dmg: 24, range: 3.6, arc: 150, weight: 3, trackUntil: 0.56, turn: 2.6 },
  {
    name: 'slam',
    clip: LEONOR_CLIPS.slam,
    dur: 1.9,
    min: 0,
    max: 3.6,
    hits: [[0.9, 1.04]],
    dmg: 32,
    range: 3.4,
    arc: 80,
    weight: 2,
    noParry: true,
    trackUntil: 0.75,
    events: [{ t: 0.94, fn: (e, g) => crash(e, g, 2.6, 16, e.data.phase === 2 ? 3 : 1) }],
  },
  { name: 'embrace', clip: LEONOR_CLIPS.embrace, dur: 2.1, min: 3.2, max: 9, hits: [[0.92, 1.2]], dmg: 34, range: 2.6, arc: 100, weight: 2, noParry: true, lunge: [[0.6, 1.05, 8]], trackUntil: 0.62, turn: 2.2, stDmg: 60, onStart: (e) => Math.random() < 0.5 && say(e, '¡Tomé! ¡Ven con tu madre!', 2.2) },
  {
    name: 'vomit',
    clip: LEONOR_CLIPS.vomit,
    dur: 2.8,
    min: 2.5,
    max: 11,
    hits: [],
    weight: 2,
    noParry: true,
    trackUntil: 0.95,
    turn: 2,
    events: [1.0, 1.2, 1.4, 1.6, 1.8].map((t, i) => ({ t, fn: (e, g) => spew(e, g, 0.4 + i * 0.25) })),
  },
  { name: 'wail', clip: LEONOR_CLIPS.wail, dur: 2.9, min: 0, max: 6.5, hits: [], weight: 1.4, noParry: true, cond: (e) => e.game.time - (e.data.wailT ?? -99) > 14, onStart: (e) => (e.data.wailT = e.game.time), events: [{ t: 1.12, fn: (e, g) => g.combat.toll(e, 6.8, 14, 'wail') }] },
  {
    name: 'belly',
    clip: LEONOR_CLIPS.belly,
    dur: 2.4,
    min: 0,
    max: 5.5,
    hits: [[1.0, 1.16]],
    dmg: 30,
    range: 3.4,
    arc: 120,
    weight: 2,
    phase: 2,
    noParry: true,
    lunge: [[0.85, 1.1, 6]],
    trackUntil: 0.8,
    events: [{ t: 1.06, fn: (e, g) => crash(e, g, 3.8, 22, 5) }],
  },
];

// Le revientan las pústulas (a la mitad de la vida): charcos alrededor.
function burstEvt(e, g) {
  g.combat.pusSplash(e.pos.x, e.pos.y + 1, e.pos.z, 2.2);
  g.combat.toll(e, 4.2, 10, 'wail');
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + Math.random() * 0.5;
    const d = 2 + Math.random() * 3.2;
    g.combat.pusPool(e.pos.x + Math.cos(a) * d, e.pos.y, e.pos.z + Math.sin(a) * d, 0.9 + Math.random() * 0.6, 9);
  }
  g.audio && g.audio.play('fleshBurst', e.pos);
  g.camRig.shake(0.6);
}

export const LEONOR_TYPE = {
  name: 'Leonor, la Dolorosa',
  build: buildLeonor,
  hp: 980,
  poise: 150,
  radius: 1.15,
  height: 2.8,
  lockHeight: 2.0,
  walk: 1.25,
  run: 3.0,
  runDist: 7,
  sight: 30,
  hear: 30,
  turn: 2.3,
  stride: 1.7,
  approach: 3.0,
  heavy: true,
  boss: true,
  introDur: 3.2,
  alertTime: 3.0,
  // (jefe: tres parrys seguidos para desequilibrarla)
  parryPosture: 3,
  parryDur: 1.5,
  clips: LEONOR_CLIPS,
  voice: 'leonor',
  attacks: ATTACKS,
  loco,
  init: (e) => {
    e.data.seed = Math.random() * 10;
    // el resplandor del pus (una luz del juego que la sigue)
    e.P.light = e.game.fx.lights.add({ x: e.pos.x, y: e.pos.y + 1.5, z: e.pos.z, color: 0xb8c848, intensity: 0, range: 8, flicker: 0, priority: 2 });
  },
  onReset: (e) => {
    e.data.phase = 1;
    e.data.seed = Math.random() * 10;
    e.data.wailT = -99;
    e.data.sayT = 6;
    e.data.sobT = 3;
    e.data.tearT = 0;
    e.anim.speed = 1;
    const sac = e.rig.joints.sac;
    if (sac) sac.scale.setScalar(1);
    if (e.game.speech && e.P.who) e.game.speech.hush(e.P.who);
  },
  onWake: (e, g) => {
    e.aware = true;
    e.state = 'alert';
    e.stT = 0;
    e.anim.play(LEONOR_CLIPS.alert, { blend: 0.1 });
    if (g.speech) g.speech.queue(who(e), DIALOG.leonorIntro);
    e.data.sayT = 12;
  },
  onAnimEvent: (e, name) => {
    const a = e.game.audio;
    if (!a) return;
    if (name === 'swing') a.play('swingHeavy', e.pos);
    else if (name === 'scream') a.play('leonorWail', e.pos);
  },
  // (los charcos y las lágrimas: lo que va soltando)
  update: (e, dt, player) => {
    const g = e.game;
    const t = g.time;
    // las pústulas laten y el saco respira
    const sac = e.rig.joints.sac;
    if (sac) sac.scale.setScalar(1 + S(t * (e.data.phase === 2 ? 4.2 : 2.4)) * 0.045);
    // el resplandor del pus, sobre ella (se apaga al morir)
    const lt = e.P.light;
    if (lt) {
      lt.x = e.pos.x;
      lt.y = e.pos.y + 1.6 * K;
      lt.z = e.pos.z;
      const want = e.dead ? 0 : (e.aware ? 2.6 : 1.4) * (1 + S(t * 2.4) * 0.15) * (e.data.phase === 2 ? 1.3 : 1);
      lt.intensity += (want - lt.intensity) * Math.min(1, dt * (e.dead ? 0.8 : 3));
    }
    if (e.dead) return;
    // las lágrimas (gotas de pus de los ojos)
    e.data.tearT -= dt;
    if (e.data.tearT <= 0 && e.obj.visible) {
      e.data.tearT = 0.25 + Math.random() * 0.35;
      const h = e.rig.worldPos('head', e.P.v2 || (e.P.v2 = new V3()), e.P.eye || (e.P.eye = new V3((Math.random() < 0.5 ? -1 : 1) * 0.056 * K, 0.0, 0.12 * K)));
      g.fx.blood.emit(h.x, h.y, h.z, 1, { color: [0.78, 0.82, 0.3], speed: 0.15, life: 1.2, up: -0.3, gravity: 6 });
    }
    // la segunda forma: a la mitad de la vida le revientan las pústulas
    if (e.hp < e.maxHp * 0.5 && e.data.phase !== 2 && e.state !== 'attack' && e.state !== 'bossIdle' && e.aware) {
      e.data.phase = 2;
      e.state = 'attack';
      e.atk = { name: 'burst', clip: LEONOR_CLIPS.burst, dur: 3.2, hits: [], noParry: true, events: [{ t: 1.55, fn: burstEvt }] };
      e.stT = 0;
      e.hitDone = [];
      e.evDone = [];
      e.anim.play(LEONOR_CLIPS.burst, { blend: 0.08 });
      say(e, '¡Devuélvemelo! ¡DEVUÉLVEMELO!', 2.8);
      g.onBossPhase && g.onBossPhase(e);
    }
    if (e.data.phase === 2) {
      e.anim.speed = e.state === 'attack' ? 1.12 : 1;
    }
    // lo que dice mientras pelea (de vez en cuando)
    if (e.aware && e.state !== 'bossIdle') {
      e.data.sayT -= dt;
      if (e.data.sayT <= 0) {
        e.data.sayT = 9 + Math.random() * 7;
        if (!g.speech || !g.speech.busy(who(e))) say(e, pick(DIALOG.leonorFight), 2.6);
      }
    } else if (e.state === 'bossIdle') {
      // en la cuna: canta la nana entre sollozos (si estás cerca)
      const d = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
      e.data.sobT -= dt;
      if (e.data.sobT <= 0 && d < 24 && Math.abs(player.pos.y - e.pos.y) < 6) {
        e.data.sobT = 7 + Math.random() * 5;
        if (Math.random() < 0.55 && g.speech && !g.speech.busy(who(e))) say(e, pick(DIALOG.leonorLullaby), 3.4);
        else g.audio && g.audio.enemyVoice(e, 'idle');
      }
    }
  },
  onHit: (e, r) => {
    if (r === 'kill' && e.game.speech) {
      e.game.speech.say(who(e), DIALOG.leonorDeath[0], { dur: 3.5 });
      // (y que no le queden charcos alrededor mientras cae)
    }
  },
};
