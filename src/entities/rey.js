// El Rey, en su sitial de la sala del alcaide: se muere. Un aliado como Dom
// Paio (no se le fija ni se le hiere), pero no se levanta nunca: todo lo
// hace sentado, y su cuerpo se compone a mano en cada fotograma (reyAnimate):
// la postura de sentado, la respiración corta, el temblor, la mirada, los
// gestos (clips), la mano que va a las casillas (cinemática inversa del
// brazo, con el pecho inclinándose cuanto más lejos está) y la cara (los
// párpados, la mandíbula y las cejas). Lo que hace, y cuándo, lo decide su
// guion: game/rey.js.
import * as THREE from 'three';
import { Rig, clip, blendInto, e2q } from './rig.js';
import { humanoidJoints, feetParts } from './models.js';
import { solveArm } from './locomotion.js';
import { DEG, clamp, damp } from '../core/util.js';

const S = Math.sin;
const V3 = THREE.Vector3;
const K = 0.94;

// grados -> radianes (root en cm -> m)
function rad(p) {
  const o = {};
  for (const k in p) o[k] = k === 'root' ? p[k].map((v) => v / 100) : p[k].map((v) => v * DEG);
  return o;
}

// ------------------------------------------------------------ el cuerpo
// Viejo y enjuto, encogido: la túnica morada (el brial) con una venda
// manchada de negro por debajo del pecho, el manto rojo forrado de piel con
// su cuello, una manta de lana sobre las rodillas y zapatillas de cuero. La
// cara chupada, pálida, de ojos hundidos; pelo y barba blancos y largos; la
// corona de oro, ladeada. Las venas negras en el cuello y en las manos. En la
// mano derecha, el anillo del sello; en la izquierda, el pañuelo.
export function buildRey() {
  const joints = humanoidJoints(K);
  // la cara: mandíbula, párpados y cejas (giran sobre su bisagra)
  joints.push(
    { name: 'jaw', parent: 'head', pos: [0, 0.074, 0.03] },
    { name: 'lidL', parent: 'head', pos: [0.041, 0.162, 0.104] },
    { name: 'lidR', parent: 'head', pos: [-0.041, 0.162, 0.104] },
    { name: 'browL', parent: 'head', pos: [0.041, 0.176, 0.1] },
    { name: 'browR', parent: 'head', pos: [-0.041, 0.176, 0.1] }
  );
  const skin = 'skinSick',
    robe = 'clothPurple',
    hair = 'hairGrey',
    mantle = 'clothRed',
    fur = 'hide';
  const parts = [
    // ---- la cabeza
    { j: 'head', type: 'box', s: [0.178, 0.222, 0.198], p: [0, 0.126, 0.004], taper: [0.78, 0.88], mat: skin },
    // pómulos marcados y sienes hundidas
    { j: 'head', type: 'box', s: [0.028, 0.026, 0.05], p: [0.066, 0.122, 0.074], mat: skin },
    { j: 'head', type: 'box', s: [0.028, 0.026, 0.05], p: [-0.066, 0.122, 0.074], mat: skin },
    // las cuencas, hondas y oscuras; el blanco del ojo, amarillento, y la niña
    { j: 'head', type: 'box', s: [0.044, 0.034, 0.01], p: [0.041, 0.148, 0.099], mat: 'black' },
    { j: 'head', type: 'box', s: [0.044, 0.034, 0.01], p: [-0.041, 0.148, 0.099], mat: 'black' },
    { j: 'head', type: 'box', s: [0.024, 0.011, 0.005], p: [0.041, 0.147, 0.1035], mat: 'bone' },
    { j: 'head', type: 'box', s: [0.024, 0.011, 0.005], p: [-0.041, 0.147, 0.1035], mat: 'bone' },
    { j: 'head', type: 'box', s: [0.009, 0.009, 0.004], p: [0.041, 0.147, 0.1065], mat: 'black' },
    { j: 'head', type: 'box', s: [0.009, 0.009, 0.004], p: [-0.041, 0.147, 0.1065], mat: 'black' },
    // la nariz, larga y afilada
    { j: 'head', type: 'box', s: [0.03, 0.078, 0.042], p: [0, 0.118, 0.11], r: [-15, 0, 0], taper: [1.15, 1.2], mat: skin },
    // el bigote y la boca (la raya de los labios)
    { j: 'head', type: 'box', s: [0.08, 0.022, 0.03], p: [0, 0.083, 0.104], taper: [1.2, 1], mat: hair },
    { j: 'head', type: 'box', s: [0.05, 0.008, 0.008], p: [0, 0.071, 0.106], mat: 'black' },
    // el pelo: ralo arriba, largo y blanco por detrás y a los lados
    { j: 'head', type: 'box', s: [0.168, 0.024, 0.17], p: [0, 0.244, -0.012], mat: hair },
    { j: 'head', type: 'box', s: [0.19, 0.25, 0.06], p: [0, 0.09, -0.098], taper: [1.15, 1], mat: hair },
    { j: 'head', type: 'box', s: [0.032, 0.23, 0.15], p: [0.095, 0.1, -0.022], taper: [1.2, 1], mat: hair },
    { j: 'head', type: 'box', s: [0.032, 0.23, 0.15], p: [-0.095, 0.1, -0.022], taper: [1.2, 1], mat: hair },
    { j: 'head', type: 'box', s: [0.22, 0.13, 0.05], p: [0, -0.03, -0.1], taper: [1.15, 1], mat: hair },
    // la corona: un aro de oro con cinco florones y sus piedras, ladeada
    { j: 'head', type: 'cyl', s: [0.098, 0.096, 0.042], p: [0.004, 0.252, -0.006], r: [4, 0, 8], seg: 10, open: true, ds: true, mat: 'idolGold' },
    ...[0, 1, 2, 3, 4].map((k) => {
      const a = (k / 5) * Math.PI * 2 + 0.3;
      return { j: 'head', type: 'cone', s: [0.018, 0.034], p: [0.004 + Math.sin(a) * 0.096, 0.286 + Math.sin(a) * 0.012, -0.006 + Math.cos(a) * 0.096], r: [4, 0, 8], seg: 4, mat: 'idolGold' };
    }),
    ...[0, 1, 2].map((k) => {
      const a = ((k - 1) / 5) * Math.PI * 2;
      return { j: 'head', type: 'box', s: [0.016, 0.016, 0.01], p: [0.004 + Math.sin(a) * 0.1, 0.25 + Math.sin(a) * 0.012, -0.006 + Math.cos(a) * 0.1], r: [4, a / DEG, 8], mat: k === 1 ? 'clothBlue' : 'clothRed' };
    }),
    // ---- la mandíbula: el mentón, lo de dentro de la boca y la barba
    { j: 'jaw', type: 'box', s: [0.11, 0.045, 0.11], p: [0, -0.02, 0.03], taper: [0.8, 0.9], mat: skin },
    { j: 'jaw', type: 'box', s: [0.046, 0.026, 0.012], p: [0, -0.002, 0.07], mat: 'black' },
    { j: 'jaw', type: 'box', s: [0.15, 0.2, 0.06], p: [0, -0.1, 0.06], taper: [0.55, 0.8], r: [8, 0, 0], mat: hair },
    { j: 'jaw', type: 'box', s: [0.04, 0.12, 0.08], p: [0.07, -0.03, 0.02], mat: hair },
    { j: 'jaw', type: 'box', s: [0.04, 0.12, 0.08], p: [-0.07, -0.03, 0.02], mat: hair },
    // ---- párpados (cuelgan de su bisagra: a 0 grados, el ojo cerrado) y cejas
    { j: 'lidL', type: 'box', s: [0.046, 0.034, 0.008], p: [0, -0.016, 0.0], mat: skin },
    { j: 'lidR', type: 'box', s: [0.046, 0.034, 0.008], p: [0, -0.016, 0.0], mat: skin },
    { j: 'browL', type: 'box', s: [0.052, 0.016, 0.022], p: [0.004, 0, 0], mat: hair },
    { j: 'browR', type: 'box', s: [0.052, 0.016, 0.022], p: [-0.004, 0, 0], mat: hair },
    // ---- el cuello, flaco, con sus venas negras
    { j: 'chest', type: 'cyl', s: [0.05, 0.058, 0.12], p: [0, 0.53, 0.012], seg: 8, mat: skin },
    { j: 'chest', type: 'box', s: [0.006, 0.08, 0.006], p: [0.04, 0.53, 0.04], r: [0, 0, 12], mat: 'black' },
    { j: 'chest', type: 'box', s: [0.006, 0.07, 0.006], p: [-0.036, 0.52, 0.045], r: [0, 0, -18], mat: 'black' },
    // ---- el pecho: el brial, la venda con su mancha y el manto con su piel
    { j: 'chest', type: 'box', s: [0.37, 0.5, 0.24], p: [0, 0.25, 0], taper: [0.84, 0.88], mat: robe },
    { j: 'chest', type: 'box', s: [0.32, 0.075, 0.215], p: [0, 0.075, 0.012], mat: 'linen' },
    { j: 'chest', type: 'box', s: [0.06, 0.05, 0.008], p: [-0.07, 0.08, 0.121], mat: 'blood' },
    { j: 'chest', type: 'box', s: [0.028, 0.04, 0.008], p: [-0.045, 0.06, 0.121], mat: 'black' },
    { j: 'chest', type: 'box', s: [0.46, 0.62, 0.05], p: [0, 0.22, -0.145], taper: [1.25, 1], mat: mantle },
    { j: 'chest', type: 'box', s: [0.17, 0.12, 0.3], p: [0.19, 0.465, -0.02], r: [0, 0, -16], mat: mantle },
    { j: 'chest', type: 'box', s: [0.17, 0.12, 0.3], p: [-0.19, 0.465, -0.02], r: [0, 0, 16], mat: mantle },
    { j: 'chest', type: 'box', s: [0.06, 0.56, 0.045], p: [0.155, 0.21, 0.12], taper: [1.1, 1], mat: fur },
    { j: 'chest', type: 'box', s: [0.06, 0.56, 0.045], p: [-0.155, 0.21, 0.12], taper: [1.1, 1], mat: fur },
    { j: 'chest', type: 'box', s: [0.44, 0.085, 0.3], p: [0, 0.5, -0.025], mat: fur },
    // una cadena con la cruz, sobre el brial
    { j: 'chest', type: 'box', s: [0.012, 0.05, 0.008], p: [0, 0.31, 0.125], mat: 'gold' },
    { j: 'chest', type: 'box', s: [0.034, 0.01, 0.008], p: [0, 0.32, 0.125], mat: 'gold' },
    // ---- la cadera (sentado: el regazo) y el manto que cae sobre el asiento
    { j: 'hips', type: 'box', s: [0.38, 0.15, 0.26], p: [0, -0.02, 0], mat: robe },
    { j: 'hips', type: 'box', s: [0.46, 0.12, 0.08], p: [0, -0.03, -0.15], mat: mantle },
    // ---- los brazos: mangas moradas con su ribete de oro; manos huesudas
    { j: 'armL', type: 'box', s: [0.12, 0.29, 0.12], p: [0, -0.13, 0], taper: [0.88, 0.88], mat: robe },
    { j: 'foreL', type: 'box', s: [0.1, 0.24, 0.1], p: [0, -0.115, 0], taper: [0.82, 0.82], mat: robe },
    { j: 'foreL', type: 'box', s: [0.092, 0.022, 0.092], p: [0, -0.228, 0], mat: 'gold' },
    { j: 'armR', type: 'box', s: [0.12, 0.29, 0.12], p: [0, -0.13, 0], taper: [0.88, 0.88], mat: robe },
    { j: 'foreR', type: 'box', s: [0.1, 0.24, 0.1], p: [0, -0.115, 0], taper: [0.82, 0.82], mat: robe },
    { j: 'foreR', type: 'box', s: [0.092, 0.022, 0.092], p: [0, -0.228, 0], mat: 'gold' },
    ...handParts('L', skin),
    ...handParts('R', skin),
    // el anillo del sello y el pañuelo
    { j: 'handR', type: 'box', s: [0.02, 0.013, 0.022], p: [-0.012, -0.098, 0.004], mat: 'gold' },
    { j: 'handL', type: 'box', s: [0.085, 0.07, 0.03], p: [-0.004, -0.09, 0.012], r: [0, 0, 8], mat: 'linen' },
    { j: 'handL', type: 'box', s: [0.04, 0.03, 0.003], p: [0.004, -0.088, 0.0285], mat: 'blood' },
    { j: 'handL', type: 'box', s: [0.05, 0.05, 0.02], p: [-0.01, -0.13, 0.006], r: [0, 0, 20], mat: 'linen' },
    // ---- las piernas (sentado: muslos adelante), la manta y las zapatillas
    { j: 'legL', type: 'box', s: [0.15, 0.44, 0.16], p: [0, -0.21, 0], taper: [0.86, 0.86], mat: robe },
    { j: 'legR', type: 'box', s: [0.15, 0.44, 0.16], p: [0, -0.21, 0], taper: [0.86, 0.86], mat: robe },
    { j: 'shinL', type: 'box', s: [0.12, 0.39, 0.13], p: [0, -0.19, 0], taper: [0.9, 0.9], mat: robe },
    { j: 'shinR', type: 'box', s: [0.12, 0.39, 0.13], p: [0, -0.19, 0], taper: [0.9, 0.9], mat: robe },
    { j: 'legL', type: 'box', s: [0.22, 0.46, 0.05], p: [-0.012, -0.22, 0.095], mat: 'clothDark' },
    { j: 'legR', type: 'box', s: [0.22, 0.46, 0.05], p: [0.012, -0.22, 0.095], mat: 'clothDark' },
    { j: 'shinL', type: 'box', s: [0.22, 0.3, 0.045], p: [-0.012, -0.14, 0.09], taper: [1.05, 1], mat: 'clothDark' },
    { j: 'shinR', type: 'box', s: [0.22, 0.3, 0.045], p: [0.012, -0.14, 0.09], taper: [1.05, 1], mat: 'clothDark' },
    ...feetParts(K, 'leather', { w: 0.1, h: 0.07, l: 0.24 }),
  ];
  return new Rig({ joints, parts });
}

// La mano: palma, tres dedos largos (algo doblados), el pulgar y una vena.
function handParts(side, skin) {
  const j = 'hand' + side,
    sx = side === 'L' ? 1 : -1;
  const out = [{ j, type: 'box', s: [0.026, 0.08, 0.066], p: [0, -0.042, 0.004], mat: skin }];
  for (const [z, l] of [
    [-0.02, 0.07],
    [0.002, 0.078],
    [0.024, 0.07],
  ])
    out.push({ j, type: 'box', s: [0.016, l, 0.016], p: [0, -0.082 - l / 2 + 0.004, z], r: [0, 0, sx * 8], mat: skin });
  out.push({ j, type: 'box', s: [0.016, 0.05, 0.017], p: [sx * 0.012, -0.05, 0.04], r: [-30, 0, 0], mat: skin });
  out.push({ j, type: 'box', s: [0.003, 0.05, 0.003], p: [sx * -0.0135, -0.04, 0.0], mat: 'black' });
  return out;
}

// La punta de los dedos (donde se coge una pieza), en la mano.
export const FINGERTIP = new V3(0, -0.15, 0.004);

// ------------------------------------------------------------ las posturas
// Sentado, encogido: el pecho adelante y la cabeza que lo compensa; las
// manos sobre los brazos del sitial (la izquierda, con el pañuelo).
const SEAT = {
  root: [0, -29, -3],
  hips: [-8, 0, 0],
  legL: [-82, 0, 7],
  shinL: [84, 0, 0],
  legR: [-82, 0, -7],
  shinR: [84, 0, 0],
  chest: [20, 0, 0],
  head: [-10, 0, 0],
  armL: [-26, 0, 16],
  foreL: [-64, 0, 0],
  handL: [16, 0, -10],
  armR: [-28, 0, -16],
  foreR: [-62, 0, 0],
  handR: [16, 0, 10],
  jaw: [3, 0, 0],
  lidL: [58, 0, 0],
  lidR: [58, 0, 0],
  browL: [0, 0, -12],
  browR: [0, 0, 12],
  // (peso: la mano izquierda, con el pañuelo, a la boca; lo ponen las toses)
  wMouth: [0, 0, 0],
};
// echado atrás en el respaldo, la cabeza ladeada contra él (muerto si le ganas)
const BACK = { ...SEAT, root: [0, -31, -6], hips: [-12, 0, 0], chest: [-2, 0, 3], head: [6, 16, 17], armL: [-16, 0, 18], foreL: [-46, 0, 0], handL: [24, 0, -10], armR: [-20, 0, -20], foreR: [-40, 0, 0], handR: [28, 0, 10], jaw: [7, 0, 0], lidL: [0, 0, 0], lidR: [0, 0, 0], browL: [0, 0, -4], browR: [0, 0, 4], wMouth: [0, 0, 0] };
// doblado sobre la mesa, la barbilla en el pecho (muerto si pierdes las tres)
const SLUMP = { ...SEAT, root: [0, -31, -1], hips: [-4, 0, 0], chest: [32, 6, -4], head: [40, -10, -8], armL: [-6, 0, 10], foreL: [-12, 0, 0], handL: [10, 0, 0], jaw: [9, 0, 0], lidL: [8, 0, 0], lidR: [6, 0, 0], browL: [0, 0, -4], browR: [0, 0, 4], wMouth: [0, 0, 0] };

const cough = (name, dur, n, strong = 1) => {
  const keys = [[0, {}]];
  const lean = { chest: [30 * strong, 0, 0], head: [6, 0, 0], armL: [-58, 0, 6], foreL: [-118, 0, 0], handL: [-34, 0, -30], jaw: [16, 0, 0], lidL: [8, 0, 0], lidR: [8, 0, 0], browL: [0, 0, -18], browR: [0, 0, 18], wMouth: [1, 0, 0] };
  keys.push([0.35, lean]);
  for (let i = 0; i < n; i++) {
    const t = 0.45 + (i / n) * (dur - 1.4);
    keys.push([t, { ...lean, chest: [42 * strong, 0, 0], head: [14, 0, 0], jaw: [26, 0, 0], root: R0(-2, 2) }, 'snap']);
    keys.push([t + ((dur - 1.4) / n) * 0.6, { ...lean, chest: [28 * strong, 0, 0], head: [2, 0, 0], jaw: [10, 0, 0] }]);
  }
  // mira el pañuelo, se limpia la boca y se echa atrás
  keys.push([dur - 0.85, { ...lean, chest: [22, 0, 0], head: [22, -8, 0], armL: [-62, 0, 2], foreL: [-104, 0, 0], handL: [-60, 0, -10], jaw: [4, 0, 0], lidL: [40, 0, 0], lidR: [40, 0, 0], browL: [0, 0, -16], browR: [0, 0, 16], wMouth: [0, 0, 0] }]);
  keys.push([dur, {}]);
  return clip(name, dur, keys.map(([t, p, e]) => [t, { ...SEATC, ...p }, e]), { lag: { head: 0.05, armL: 0.08 } });
};
// (la postura de sentado, entera, en las claves de los gestos: lo que no
// nombra una clave valdría cero y saltaría a la postura de pie)
const SEATC = { ...SEAT };
// la cadera, desplazada desde la de sentado (cm)
const R0 = (dy, dz) => [0, SEAT.root[1] + dy, SEAT.root[2] + dz];

export const REY_CLIPS = {
  // los ataques de tos: corto, largo y uno que no acaba
  cough: cough('rCough', 2.6, 3),
  coughLong: cough('rCough2', 4.2, 6, 1.1),
  coughBad: cough('rCough3', 5.6, 9, 1.2),
  // se ríe (flojo; la risa se le vuelve tos: el guion le encadena una)
  laugh: clip('rLaugh', 1.8, [
    [0, { ...SEATC }],
    [0.3, { ...SEATC, chest: [8, 0, 0], head: [-22, 0, 0], jaw: [16, 0, 0], lidL: [30, 0, 0], lidR: [30, 0, 0], browL: [0, 0, -12], browR: [0, 0, 12] }],
    [0.6, { ...SEATC, chest: [14, 0, 0], head: [-16, 0, 0], jaw: [10, 0, 0], lidL: [26, 0, 0], lidR: [26, 0, 0] }],
    [0.9, { ...SEATC, chest: [8, 0, 0], head: [-22, 0, 0], jaw: [18, 0, 0], lidL: [28, 0, 0], lidR: [28, 0, 0] }],
    [1.2, { ...SEATC, chest: [16, 0, 0], head: [-12, 0, 0], jaw: [8, 0, 0], lidL: [36, 0, 0], lidR: [36, 0, 0] }],
    [1.8, { ...SEATC }],
  ]),
  // asiente, despacio
  nod: clip('rNod', 1.4, [
    [0, { ...SEATC }],
    [0.4, { ...SEATC, head: [10, 0, 0], lidL: [40, 0, 0], lidR: [40, 0, 0] }],
    [0.8, { ...SEATC, head: [-12, 0, 0] }],
    [1.4, { ...SEATC }],
  ]),
  // niega con la cabeza
  shake: clip('rShake', 1.6, [
    [0, { ...SEATC }],
    [0.3, { ...SEATC, head: [-4, 16, 0] }],
    [0.65, { ...SEATC, head: [-4, -16, 0] }],
    [1.0, { ...SEATC, head: [-4, 12, 0] }],
    [1.6, { ...SEATC }],
  ]),
  // piensa: la mano derecha a la barbilla, los ojos en el tablero
  think: clip('rThink', 2.4, [
    [0, { ...SEATC }],
    [0.7, { ...SEATC, chest: [26, 4, 0], head: [16, -6, 0], armR: [-70, 0, -24], foreR: [-128, 0, 0], handR: [-30, 0, 20], lidL: [52, 0, 0], lidR: [52, 0, 0], browL: [0, 0, 16], browR: [0, 0, -16] }],
    [1.8, { ...SEATC, chest: [28, 6, 0], head: [18, -4, 0], armR: [-72, 0, -24], foreR: [-130, 0, 0], handR: [-32, 0, 20], lidL: [48, 0, 0], lidR: [48, 0, 0], browL: [0, 0, 18], browR: [0, 0, -18] }],
    [2.4, { ...SEATC, chest: [28, 6, 0], head: [18, -4, 0], armR: [-72, 0, -24], foreR: [-130, 0, 0], handR: [-32, 0, 20], lidL: [48, 0, 0], lidR: [48, 0, 0], browL: [0, 0, 18], browR: [0, 0, -18] }],
  ]),
  // el dolor: la mano al costado (la herida), los ojos apretados
  pain: clip('rPain', 2.6, [
    [0, { ...SEATC }],
    [0.3, { ...SEATC, chest: [36, -10, -6], head: [20, 8, 0], armR: [-40, 0, 6], foreR: [-96, 0, 0], handR: [-10, 0, 40], jaw: [14, 0, 0], lidL: [0, 0, 0], lidR: [0, 0, 0], browL: [0, 0, -24], browR: [0, 0, 24] }, 'snap'],
    [1.6, { ...SEATC, chest: [32, -8, -4], head: [16, 6, 0], armR: [-38, 0, 6], foreR: [-94, 0, 0], handR: [-10, 0, 40], jaw: [8, 0, 0], lidL: [10, 0, 0], lidR: [10, 0, 0], browL: [0, 0, -20], browR: [0, 0, 20] }],
    [2.6, { ...SEATC }],
  ]),
  // se intenta levantar: se agarra a los brazos del sitial, se alza un
  // palmo, las piernas no le sostienen y cae otra vez, de golpe
  rise: clip(
    'rRise',
    3.4,
    [
      [0, { ...SEATC }],
      [0.6, { ...SEATC, chest: [40, 0, 0], head: [-26, 0, 0], armL: [-12, 0, 24], foreL: [-30, 0, 0], armR: [-12, 0, -24], foreR: [-30, 0, 0], browL: [0, 0, 14], browR: [0, 0, -14] }],
      [1.5, { ...SEATC, root: R0(9, 7), hips: [4, 0, 0], legL: [-70, 0, 7], shinL: [74, 0, 0], legR: [-70, 0, -7], shinR: [74, 0, 0], chest: [30, 0, 0], head: [-24, 0, 0], armL: [-4, 0, 26], foreL: [-12, 0, 0], armR: [-4, 0, -26], foreR: [-12, 0, 0], jaw: [12, 0, 0], lidL: [30, 0, 0], lidR: [30, 0, 0], browL: [0, 0, 20], browR: [0, 0, -20] }, 'hold'],
      [1.75, { ...SEATC, root: R0(7, 6), hips: [2, 0, 0], legL: [-72, 0, 7], shinL: [76, 0, 0], legR: [-72, 0, -7], shinR: [76, 0, 0], chest: [34, 0, 0], head: [-18, 0, 0], armL: [-6, 0, 26], foreL: [-16, 0, 0], armR: [-6, 0, -26], foreR: [-16, 0, 0], jaw: [16, 0, 0] }],
      [2.0, { ...SEATC, root: R0(-2, -1), chest: [6, 0, 0], head: [-26, 0, 0], armL: [-20, 0, 30], armR: [-20, 0, -30], jaw: [20, 0, 0], lidL: [0, 0, 0], lidR: [0, 0, 0] }, 'snap'],
      [2.6, { ...SEATC, chest: [14, 0, 0], head: [-6, 0, 0], jaw: [10, 0, 0], lidL: [20, 0, 0], lidR: [20, 0, 0], browL: [0, 0, -16], browR: [0, 0, 16] }],
      [3.4, { ...SEATC }],
    ],
    { lag: { head: 0.06 } }
  ),
  // se adormila: la cabeza se le va cayendo, los ojos se cierran
  doze: clip('rDoze', 2.8, [
    [0, { ...SEATC }],
    [1.4, { ...SEATC, chest: [28, 0, 0], head: [30, 0, 4], lidL: [14, 0, 0], lidR: [10, 0, 0], jaw: [7, 0, 0] }],
    [2.8, { ...SEATC, chest: [32, 0, 0], head: [42, 0, 8], lidL: [0, 0, 0], lidR: [0, 0, 0], jaw: [9, 0, 0] }],
  ]),
  // y despierta de golpe
  wake: clip('rWake', 1.3, [
    [0, { ...SEATC, chest: [32, 0, 0], head: [42, 0, 8], lidL: [0, 0, 0], lidR: [0, 0, 0], jaw: [9, 0, 0] }],
    [0.25, { ...SEATC, chest: [10, 0, 0], head: [-20, 8, 0], lidL: [95, 0, 0], lidR: [95, 0, 0], browL: [0, 0, -14], browR: [0, 0, 14], jaw: [6, 0, 0] }, 'snap'],
    [0.7, { ...SEATC, chest: [16, 0, 0], head: [-8, -6, 0], lidL: [80, 0, 0], lidR: [80, 0, 0] }],
    [1.3, { ...SEATC }],
  ]),
  // te tiende algo por encima de la mesa (el rey de marfil): el brazo lo
  // pone el guion por cinemática inversa; aquí, el cuerpo
  offer: clip('rOffer', 1.2, [
    [0, { ...SEATC }],
    [1.2, { ...SEATC, chest: [30, 0, 0], head: [-14, 0, 0], browL: [0, 0, -12], browR: [0, 0, 12] }],
  ]),
};

// (los que miran a lo suyo: el pañuelo, el tablero, el suelo)
for (const k of ['cough', 'coughLong', 'coughBad', 'think', 'pain', 'doze', 'wake', 'rise']) REY_CLIPS[k].noLook = true;
// (los que se quedan en su última postura hasta que el guion los quite: pensar,
// adormilarse, tender la pieza; los demás, al acabar, vuelven a la de sentado)
for (const k of ['think', 'doze', 'offer']) REY_CLIPS[k].hold = true;

// ------------------------------------------------------------ cómo se mueve
const _v = new V3(),
  _w = new V3(),
  _m = new THREE.Matrix4(),
  _q = new THREE.Quaternion(),
  _qa = new THREE.Quaternion(),
  _x = new V3(),
  _y = new V3(),
  _z = new V3();
const UP = new V3(0, 1, 0);

// Ruido suave (para el temblor): suma de senos de frecuencias raras.
const tremor = (t, f, ph) => S(t * f + ph) * 0.6 + S(t * f * 2.37 + ph * 1.7) * 0.3 + S(t * f * 5.11 + ph * 0.3) * 0.1;

// Compone el cuerpo del Rey en este fotograma. Lo que le pide el guion, en
// e.data:
//   look (V3)        a dónde mira (o null: al frente)
//   reach            { pos: V3 (la punta de los dedos), w: 0..1 } la mano derecha
//   sleepy (0..1)    los párpados que pesan
//   talk (0..1)      la boca al hablar
//   tired (0..1)     lo mal que está: temblor, respiración y encogimiento
//   dead             { kind: 'back' | 'slump', k: 0..1 } muriéndose / muerto
export function reyAnimate(e, dt) {
  const D = e.data;
  const t = e.game.time;
  const tired = D.tired ?? 0.4;
  const rig = e.rig;
  e.obj.position.set(e.pos.x, e.pos.y, e.pos.z);
  e.obj.rotation.y = e.yaw;
  const dead = D.dead;
  const dk = dead ? dead.k : 0;
  // la respiración: corta, con un tirón de vez en cuando (y nada, muerto)
  const br = (1 - dk) * (S(t * (2.1 + tired * 0.8)) * 0.6 + Math.max(0, S(t * 0.37 + 1.3)) ** 6 * 1.6);
  const pose = rad({
    ...SEAT,
    chest: [SEAT.chest[0] + br * 2.2 + tired * 6, 0, 0],
    head: [SEAT.head[0] - br * 1.2, 0, 0],
    armL: [SEAT.armL[0], 0, SEAT.armL[2] + br * 1.4],
    armR: [SEAT.armR[0], 0, SEAT.armR[2] - br * 1.4],
  });
  // los gestos
  const ap = e.anim.update(dt);
  if (ap && e.anim.weight > 0) blendInto(pose, ap, e.anim.weight, null, e.anim.jw);
  // la mirada: la cabeza (y algo el pecho) hacia lo que mira
  if (D.look && !dk) {
    rig.root.updateMatrixWorld(true);
    const hp = rig.worldPos('head', _v);
    const dx = D.look.x - hp.x,
      dy = D.look.y - hp.y,
      dz = D.look.z - hp.z;
    // (en el marco del Rey: su yaw)
    const cy = Math.cos(-e.yaw),
      sy = Math.sin(-e.yaw);
    const lx = dx * cy + dz * sy,
      lz = -dx * sy + dz * cy;
    const yaw = clamp(Math.atan2(lx, lz), -1.1, 1.1);
    const pitch = clamp(Math.atan2(-dy, Math.hypot(lx, lz)), -0.6, 0.9);
    D.lookYaw = damp(D.lookYaw ?? 0, yaw, 3, dt);
    D.lookPitch = damp(D.lookPitch ?? 0, pitch, 3, dt);
  } else {
    D.lookYaw = damp(D.lookYaw ?? 0, 0, 2, dt);
    D.lookPitch = damp(D.lookPitch ?? 0, 0, 2, dt);
  }
  const ac = e.anim.clip;
  const lw = (1 - dk) * (ac && ac.noLook && ap ? 1 - e.anim.weight : 1);
  const net = (SEAT.hips[0] + SEAT.chest[0] + SEAT.head[0]) * DEG;
  pose.head = [pose.head[0] + (D.lookPitch - net) * 0.75 * lw, pose.head[1] + D.lookYaw * 0.75 * lw, pose.head[2]];
  pose.chest = [pose.chest[0], pose.chest[1] + D.lookYaw * 0.22 * lw, pose.chest[2]];
  // la cara: parpadeos lentos, el sueño, la boca al hablar
  D.blinkT = (D.blinkT ?? 2) - dt;
  if (D.blinkT <= 0) D.blinkT = 2.5 + Math.random() * 4 - tired * 1.2;
  const blink = D.blinkT < 0.22 ? S((D.blinkT / 0.22) * Math.PI) : 0;
  const lidOpen = (1 - blink) * (1 - (D.sleepy ?? 0) * 0.85) * (0.8 - tired * 0.25);
  const lidK = clamp(lidOpen, 0, 1);
  for (const j of ['lidL', 'lidR']) pose[j] = [Math.min(pose[j][0], 95 * DEG * lidK), 0, 0];
  if (D.talk) {
    const m = Math.max(0, S(t * 17) * 0.6 + S(t * 9.3) * 0.5);
    pose.jaw = [pose.jaw[0] + m * 12 * DEG * D.talk, 0, 0];
  }
  // la muerte: hacia su postura final, despacio
  if (dead) blendInto(pose, rad(dead.kind === 'back' ? BACK : SLUMP), clamp(dk, 0, 1));
  // el temblor: manos, antebrazos y cabeza
  const tr = (0.4 + tired * 1.1) * (1 - dk);
  if (tr > 0) {
    const ph = e.phase || 0;
    for (const [j, f, a] of [
      ['handR', 9.5, 2.6],
      ['foreR', 7.1, 1.4],
      ['handL', 8.7, 2.2],
      ['foreL', 6.3, 1.2],
      ['head', 4.3, 0.9],
    ]) {
      const p = pose[j] || (pose[j] = [0, 0, 0]);
      p[0] += tremor(t, f, ph + j.length) * a * tr * DEG;
      p[2] += tremor(t, f * 1.13, ph + 2.1) * a * 0.6 * tr * DEG;
    }
  }
  // la mano izquierda (el pañuelo), a la boca: lo piden las toses
  const wm = pose.wMouth ? clamp(pose.wMouth[0], 0, 1) * (1 - dk) : 0;
  if (wm > 0.01) handToMouth(e, pose, wm);
  // la mano derecha, a la casilla (o a donde le diga el guion; muriéndose, se
  // le va cayendo)
  const R = D.reach;
  const rw = R ? R.w * (1 - dk) : 0;
  if (rw > 0.001) reachArm(e, pose, R, rw);
  else rig.apply(pose);
  // el cuerpo no se mueve de su sitio; su sombra, bajo el sitial
  e.shadow.position.set(e.pos.x, e.pos.y + 0.02, e.pos.z);
  e.shadow.visible = e.obj.visible;
}

// El brazo derecho, hasta que la punta de los dedos llegue a R.pos (con
// peso R.w). Cuanto más lejos, más se inclina el pecho hacia allí y más se
// adelanta en el asiento; los dedos, hacia abajo.
function reachArm(e, pose, R, w = R.w) {
  const rig = e.rig;
  // primero el cuerpo: cuánto tiene que inclinarse para llegar
  rig.apply(pose);
  rig.root.updateMatrixWorld(true);
  const sh = rig.worldPos('armR', _v);
  const d = Math.hypot(R.pos.x - sh.x, R.pos.y + 0.13 - sh.y, R.pos.z - sh.z);
  const armLen = (rig.rest.foreR.pos.length() + rig.rest.handR.pos.length()) * 0.97;
  const need = clamp((d - armLen * 0.82) / 0.5, 0, 1);
  // (en su marco: hacia dónde queda)
  const cy = Math.cos(-e.yaw),
    sy = Math.sin(-e.yaw);
  const dx = R.pos.x - e.pos.x,
    dz = R.pos.z - e.pos.z;
  const lx = dx * cy + dz * sy,
    lz = -dx * sy + dz * cy;
  const side = clamp(Math.atan2(lx, Math.max(0.2, lz)), -0.8, 0.8);
  pose.chest = [pose.chest[0] + need * 34 * DEG * w, pose.chest[1] + side * 0.45 * w, pose.chest[2] - side * 0.1 * w];
  pose.root = [pose.root[0], pose.root[1] - need * 0.01 * w, pose.root[2] + need * 0.09 * w];
  pose.head = [pose.head[0] + need * 6 * DEG * w, pose.head[1], pose.head[2]];
  rig.apply(pose);
  rig.root.updateMatrixWorld(true);
  // la muñeca: un palmo por encima de la punta de los dedos
  _w.set(R.pos.x, R.pos.y + 0.135, R.pos.z);
  const chest = rig.joints.chest;
  _m.copy(chest.matrixWorld).invert();
  _w.applyMatrix4(_m);
  // (mezclada con donde la tenía la postura)
  const hand = rig.worldPos('handR', _x).applyMatrix4(_m);
  _w.lerpVectors(hand, _w, w);
  pose.ikR = [_w.x, _w.y, _w.z];
  solveArm(pose, rig, 'R');
  rig.apply(pose);
  // la mano, con los dedos hacia abajo (y la palma hacia él)
  rig.root.updateMatrixWorld(true);
  const fore = rig.joints.foreR;
  fore.getWorldQuaternion(_qa);
  const sp = rig.worldPos('armR', _v);
  _y.set(R.pos.x - sp.x, 0, R.pos.z - sp.z).normalize().multiplyScalar(0.35).add(_z.set(0, -1, 0)).normalize().negate();
  _x.set(sp.x - R.pos.x, 0, sp.z - R.pos.z).normalize();
  _x.addScaledVector(_y, -_x.dot(_y)).normalize();
  _z.crossVectors(_x, _y).normalize();
  _m.makeBasis(_x, _y, _z);
  _q.setFromRotationMatrix(_m);
  _qa.invert().multiply(_q);
  // (mezclada con la de la postura)
  const hq = rig.joints.handR.quaternion;
  hq.slerp(_qa, w);
  rig.joints.handR.updateMatrixWorld(true);
}

// La mano izquierda, con el pañuelo, delante de la boca (con peso w).
const MOUTH = new V3(0.01, 0.02, 0.2);
function handToMouth(e, pose, w) {
  const rig = e.rig;
  rig.apply(pose);
  rig.root.updateMatrixWorld(true);
  const m = rig.worldPos('head', _w, MOUTH);
  _m.copy(rig.joints.chest.matrixWorld).invert();
  m.applyMatrix4(_m);
  const hand = rig.worldPos('handL', _x).applyMatrix4(_m);
  m.lerpVectors(hand, m, w);
  pose.ikL = [m.x, m.y, m.z];
  solveArm(pose, rig, 'L');
  pose.handL = [-0.5 * w, 0, 0.4 * w];
}

// La punta de los dedos de la mano derecha, en el mundo.
export function fingertip(e, out = new V3()) {
  return e.rig.worldPos('handR', out, FINGERTIP);
}

export const REY_TYPE = {
  name: 'El Rey',
  build: buildRey,
  hp: 100,
  poise: 100,
  radius: 0.35,
  height: 1.3,
  lockHeight: 1.0,
  walk: 0,
  run: 0,
  turn: 0,
  sight: 0,
  hear: 0,
  // (un aliado: ni se le fija ni se le hiere)
  friendly: true,
  clips: { ...REY_CLIPS, hurt: REY_CLIPS.pain, death: REY_CLIPS.doze },
  voice: 'rey',
  attacks: [],
  // lo que hace lo decide su guion
  ai: (e, dt, player) => {
    const q = e.game.rey;
    if (q) q.npcAI(e, dt, player);
    else e.animate(dt);
  },
  animate: reyAnimate,
  onAnimEvent: (e, ev) => {
    if (ev === 'end' && e.anim.clip && !e.anim.clip.hold) e.anim.stop(0.45);
  },
  onReset: (e) => e.game.rey && e.game.rey.npcReset(e),
};
