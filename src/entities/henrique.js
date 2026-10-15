// Henrique Alemão, el cuchillero de la Casa del Alemán: un aliado. Se mueve y
// se anima como las criaturas (rig, marcha con IK, clips), pero no se le
// puede fijar ni herir; a él sí le hieren ellas. Lo que hace (asomarse a la
// ventana alta, abrir la puerta, defender la sala, contar su historia...) lo
// decide el guion de la casa: game/house.js.
import { Rig, clip } from './rig.js';
import { humanoidJoints, feetParts } from './models.js';
import { GAIT } from './locomotion.js';
import { DEG } from '../core/util.js';

const S = Math.sin;

// grados -> radianes (root en cm -> m)
function rad(p) {
  const o = {};
  for (const k in p) o[k] = k === 'root' ? p[k].map((v) => v / 100) : p[k].map((v) => v * DEG);
  return o;
}

// ------------------------------------------------------------ el cuerpo
// Corpulento, de hombros anchos: túnica azul con las mangas remangadas, el
// mandil de cuero del oficio, calzas oscuras y botas; barba y pelo castaños.
// En la mano derecha, una falcata de hoja ancha que forjó él mismo.
export function buildHenrique() {
  const k = 1.02;
  const joints = humanoidJoints(k);
  const parts = [
    // cadera: el cinto, el faldón de la túnica y el mandil
    { j: 'hips', type: 'box', s: [0.42, 0.1, 0.29], p: [0, 0.03, 0], mat: 'leather' },
    { j: 'hips', type: 'box', s: [0.44, 0.5, 0.3], p: [0, -0.25, 0], taper: [1.12, 1.08], mat: 'clothBlue' },
    { j: 'hips', type: 'box', s: [0.36, 0.64, 0.03], p: [0, -0.3, 0.165], taper: [1.12, 1], mat: 'leather' },
    { j: 'hips', type: 'box', s: [0.06, 0.08, 0.06], p: [-0.18, -0.02, 0.15], mat: 'iron' },
    // el pecho: la túnica, el peto del mandil con sus tirantes, el cuello
    { j: 'chest', type: 'box', s: [0.48, 0.54, 0.31], p: [0, 0.26, 0], taper: [0.84, 0.92], mat: 'clothBlue' },
    { j: 'chest', type: 'box', s: [0.3, 0.38, 0.03], p: [0, 0.2, 0.162], taper: [1.0, 0.9], mat: 'leather' },
    { j: 'chest', type: 'box', s: [0.05, 0.4, 0.03], p: [0.12, 0.36, 0.12], r: [10, 0, -6], mat: 'leather' },
    { j: 'chest', type: 'box', s: [0.05, 0.4, 0.03], p: [-0.12, 0.36, 0.12], r: [10, 0, 6], mat: 'leather' },
    { j: 'chest', type: 'cyl', s: [0.085, 0.1, 0.1], p: [0, 0.54, 0], mat: 'skin' },
    // la cabeza: cara, nariz, ojos y cejas, el pelo y la barba
    { j: 'head', type: 'box', s: [0.21, 0.24, 0.23], p: [0, 0.13, 0], mat: 'skin' },
    { j: 'head', type: 'box', s: [0.045, 0.07, 0.05], p: [0, 0.13, 0.125], r: [-12, 0, 0], mat: 'skin' },
    { j: 'head', type: 'box', s: [0.035, 0.022, 0.01], p: [-0.05, 0.16, 0.117], mat: 'black' },
    { j: 'head', type: 'box', s: [0.035, 0.022, 0.01], p: [0.05, 0.16, 0.117], mat: 'black' },
    { j: 'head', type: 'box', s: [0.06, 0.018, 0.02], p: [-0.05, 0.19, 0.118], r: [0, 0, 8], mat: 'leather' },
    { j: 'head', type: 'box', s: [0.06, 0.018, 0.02], p: [0.05, 0.19, 0.118], r: [0, 0, -8], mat: 'leather' },
    { j: 'head', type: 'box', s: [0.23, 0.09, 0.25], p: [0, 0.27, -0.01], mat: 'leather' },
    { j: 'head', type: 'box', s: [0.23, 0.2, 0.07], p: [0, 0.17, -0.1], mat: 'leather' },
    { j: 'head', type: 'box', s: [0.22, 0.13, 0.09], p: [0, 0.03, 0.08], taper: [0.75, 0.9], mat: 'leather' },
    { j: 'head', type: 'box', s: [0.08, 0.02, 0.01], p: [0, 0.075, 0.123], mat: 'black' },
    // brazos: las mangas remangadas hasta el codo, antebrazos al aire
    { j: 'armL', type: 'box', s: [0.15, 0.3, 0.15], p: [0, -0.13, 0], taper: [0.88, 0.88], mat: 'clothBlue' },
    { j: 'armL', type: 'box', s: [0.16, 0.07, 0.16], p: [0, -0.28, 0], mat: 'clothBlue' },
    { j: 'foreL', type: 'box', s: [0.115, 0.27, 0.115], p: [0, -0.13, 0], taper: [0.8, 0.8], mat: 'skin' },
    { j: 'handL', type: 'box', s: [0.085, 0.1, 0.095], p: [0, -0.05, 0.01], mat: 'skin' },
    { j: 'armR', type: 'box', s: [0.15, 0.3, 0.15], p: [0, -0.13, 0], taper: [0.88, 0.88], mat: 'clothBlue' },
    { j: 'armR', type: 'box', s: [0.16, 0.07, 0.16], p: [0, -0.28, 0], mat: 'clothBlue' },
    { j: 'foreR', type: 'box', s: [0.115, 0.27, 0.115], p: [0, -0.13, 0], taper: [0.8, 0.8], mat: 'skin' },
    { j: 'handR', type: 'box', s: [0.085, 0.1, 0.095], p: [0, -0.05, 0.01], mat: 'skin' },
    // la falcata (hoja hacia +z de la mano, filo abajo)
    { j: 'handR', type: 'cyl', s: [0.02, 0.022, 0.15], p: [0, -0.05, 0.0], r: [90, 0, 0], seg: 6, mat: 'wooddark' },
    { j: 'handR', type: 'box', s: [0.03, 0.14, 0.03], p: [0, -0.05, 0.085], mat: 'iron' },
    { j: 'handR', type: 'box', s: [0.012, 0.06, 0.46], p: [0, -0.06, 0.33], mat: 'plate' },
    { j: 'handR', type: 'box', s: [0.012, 0.085, 0.18], p: [0, -0.072, 0.58], r: [-6, 0, 0], mat: 'plate' },
    { j: 'handR', type: 'box', s: [0.016, 0.012, 0.6], p: [0, -0.03, 0.38], mat: 'iron' },
    // piernas: calzas oscuras y botas de cuero
    { j: 'legL', type: 'box', s: [0.17, 0.46, 0.18], p: [0, -0.22, 0], taper: [0.8, 0.85], mat: 'clothDark' },
    { j: 'shinL', type: 'box', s: [0.13, 0.42, 0.14], p: [0, -0.2, 0], taper: [0.9, 0.9], mat: 'clothDark' },
    { j: 'shinL', type: 'box', s: [0.145, 0.24, 0.155], p: [0, -0.3, 0], mat: 'leather' },
    { j: 'legR', type: 'box', s: [0.17, 0.46, 0.18], p: [0, -0.22, 0], taper: [0.8, 0.85], mat: 'clothDark' },
    { j: 'shinR', type: 'box', s: [0.13, 0.42, 0.14], p: [0, -0.2, 0], taper: [0.9, 0.9], mat: 'clothDark' },
    { j: 'shinR', type: 'box', s: [0.145, 0.24, 0.155], p: [0, -0.3, 0], mat: 'leather' },
    ...feetParts(k, 'leather', { w: 0.125, h: 0.085, l: 0.27 }),
  ];
  return new Rig({ joints, parts });
}

// ------------------------------------------------------------ gestos
// En reposo: la falcata baja junto al muslo, el peso en una pierna.
const BASE = { chest: [4, 0, 0], head: [-4, 0, 0], armR: [-12, 0, -8], foreR: [-30, 0, 0], handR: [58, 0, 0], armL: [-6, 0, 9], foreL: [-18, 0, 0], handL: [6, 0, 0] };
// en guardia: la falcata delante, el brazo izquierdo abierto
const GUARD = { chest: [10, -12, 0], head: [-8, 10, 0], armR: [-38, 0, -14], foreR: [-72, 0, 0], handR: [26, 0, 0], armL: [-34, 0, 20], foreL: [-58, 0, 0], handL: [0, 0, 0] };

export const HENRIQUE_CLIPS = {
  // tajo de arriba abajo con la falcata
  swing: clip('swing', 1.15, [
    [0, { ...GUARD }],
    [0.42, { chest: [-6, -30, 0], head: [-8, 18, 0], armR: [-160, 0, -26], foreR: [-46, 0, 0], handR: [60, 0, 0], armL: [-30, 0, 30], foreL: [-40, 0, 0] }, 'hold'],
    [0.56, { chest: [32, 24, 0], head: [-18, -8, 0], armR: [-42, 0, 10], foreR: [-12, 0, 0], handR: [86, 0, 0], armL: [-24, 0, 26], foreL: [-30, 0, 0], root: [0, -8, 0] }, 'snap'],
    [0.82, { chest: [28, 20, 0], head: [-14, -6, 0], armR: [-40, 0, 12], foreR: [-14, 0, 0], handR: [80, 0, 0], armL: [-22, 0, 24], foreL: [-30, 0, 0], root: [0, -7, 0] }],
    [1.15, { ...GUARD }],
  ]),
  // revés de lado a lado
  backhand: clip('backhand', 1.05, [
    [0, { ...GUARD }],
    [0.36, { chest: [8, 46, 0], armR: [-80, 0, 70], foreR: [-30, 0, 0], handR: [70, 0, 30], armL: [-30, 0, 20], foreL: [-50, 0, 0] }, 'hold'],
    [0.5, { chest: [14, -40, 0], armR: [-88, 0, -80], foreR: [-8, 0, 0], handR: [84, 0, -20], armL: [-30, 0, 30], foreL: [-40, 0, 0], root: [0, -6, 0] }, 'snap'],
    [0.75, { chest: [12, -46, 0], armR: [-80, 0, -86], foreR: [-20, 0, 0], handR: [76, 0, -24] }],
    [1.05, { ...GUARD }],
  ]),
  hurt: clip('hurt', 0.55, [
    [0, { ...GUARD, chest: [-18, 16, 0], head: [-24, 0, 18], armL: [-20, 0, 50], root: [0, -4, -8] }, 'snap'],
    [0.55, { ...GUARD }],
  ]),
  stagger: clip('stagger', 1.2, [
    [0, { chest: [-26, -18, 0], head: [-30, 0, 10], armL: [-20, 0, 60], armR: [-20, 0, -60], root: [0, -8, -12], legL: [-20, 0, 0], shinL: [40, 0, 0] }, 'snap'],
    [0.6, { chest: [36, 0, 0], head: [16, 0, 0], armL: [-10, 0, 20], armR: [-30, 0, -20], foreR: [-40, 0, 0], root: [0, -36, 0], legL: [-60, 0, 0], shinL: [100, 0, 0], legR: [-20, 0, 0], shinR: [96, 0, 0] }],
    [1.2, { ...GUARD }],
  ]),
  // vencido: cae de rodillas y se derrumba hacia delante
  death: clip('death', 2.0, [
    [0, { chest: [-20, 0, 0], head: [-30, 0, 0], armL: [-20, 0, 50], armR: [-20, 0, -50] }, 'snap'],
    [0.6, { chest: [30, 0, 0], head: [30, 0, 0], root: [0, -48, 0], legL: [-95, 0, 5], shinL: [100, 0, 0], legR: [-95, 0, -5], shinR: [100, 0, 0], armL: [-30, 0, 10], armR: [-30, 0, -10], foreR: [-40, 0, 0] }],
    [1.4, { hips: [80, 0, 0], chest: [8, 0, 0], head: [20, 30, 0], root: [0, -76, 0], armL: [-150, 0, 30], armR: [-30, 0, -50], legL: [-10, 0, 5], legR: [-5, 0, -5] }, 'in'],
    [2.0, { hips: [86, 0, 0], chest: [4, 0, 0], head: [20, 30, 0], root: [0, -79, 0], armL: [-150, 0, 30], armR: [-30, 0, -50], legL: [-4, 0, 5], legR: [-4, 0, -5] }],
  ]),
  // ofrece algo con las dos manos (la espada del abuelo, la llave)
  give: clip('give', 2.2, [
    [0, { ...BASE }],
    [0.6, { ...BASE, chest: [16, 0, 0], head: [10, 0, 0], armL: [-62, 0, 8], foreL: [-34, 0, 0], handL: [-20, 0, 0], armR: [-58, 0, -6], foreR: [-40, 0, 0], handR: [10, 0, 0] }],
    [1.6, { ...BASE, chest: [18, 0, 0], head: [12, 0, 0], armL: [-66, 0, 8], foreL: [-30, 0, 0], handL: [-24, 0, 0], armR: [-60, 0, -6], foreR: [-36, 0, 0], handR: [10, 0, 0] }],
    [2.2, { ...BASE }],
  ]),
};

// gestos al hablar (se eligen al azar con cada frase)
export const TALK_CLIPS = [
  clip('talkA', 2.4, [
    [0, { ...BASE }],
    [0.5, { ...BASE, armL: [-44, 18, 28], foreL: [-62, 0, 0], handL: [-20, 0, 0], head: [2, -8, 0] }],
    [1.3, { ...BASE, armL: [-50, 22, 34], foreL: [-56, 0, 0], handL: [-28, 0, 0], head: [-6, 6, 0], chest: [6, -6, 0] }],
    [2.4, { ...BASE }],
  ]),
  clip('talkB', 2.6, [
    [0, { ...BASE }],
    [0.6, { ...BASE, armL: [-36, 0, 36], foreL: [-48, 0, 0], armR: [-24, 0, -24], foreR: [-46, 0, 0], head: [4, 0, -6], chest: [8, 0, 0] }],
    [1.6, { ...BASE, armL: [-40, 0, 40], foreL: [-44, 0, 0], armR: [-28, 0, -26], foreR: [-42, 0, 0], head: [-4, 0, 6], chest: [6, 0, 0] }],
    [2.6, { ...BASE }],
  ]),
  // se lleva la mano a la cara (el recuerdo de Leonor)
  clip('talkC', 2.8, [
    [0, { ...BASE }],
    [0.8, { ...BASE, armL: [-128, 0, 12], foreL: [-110, 0, 0], handL: [10, 0, 0], head: [22, 0, 0], chest: [14, 0, 0] }],
    [2.0, { ...BASE, armL: [-126, 0, 14], foreL: [-112, 0, 0], handL: [12, 0, 0], head: [26, 0, 6], chest: [16, 0, 0] }],
    [2.8, { ...BASE }],
  ]),
  // señala con la izquierda (las ventanas, la puerta)
  clip('talkD', 2.2, [
    [0, { ...BASE }],
    [0.45, { ...BASE, armL: [-82, -10, 14], foreL: [-6, 0, 0], handL: [0, 0, 0], head: [-2, 14, 0], chest: [4, 14, 0] }],
    [1.5, { ...BASE, armL: [-84, -12, 14], foreL: [-4, 0, 0], handL: [0, 0, 0], head: [-2, 16, 0], chest: [4, 16, 0] }],
    [2.2, { ...BASE }],
  ]),
];

// Poses de espera (la base, que mezclan los clips): de pie, en guardia, en
// la ventana alta (las manos en el alféizar, asomado; agita el puño), rezando
// junto al hogar y abatido.
function idlePose(e, kind, t) {
  const br = S(t * 1.5 + e.phase) * 2;
  let p;
  if (kind === 'guard') p = { ...GUARD, chest: [GUARD.chest[0] + br, GUARD.chest[1], 0] };
  else if (kind === 'window') {
    const sh = Math.max(0, S(t * 2.2 + e.phase));
    p = {
      chest: [26 + br, 0, S(t * 0.9) * 4],
      head: [-26 - sh * 10, S(t * 0.7) * 16, 0],
      armL: [-58, 0, 22],
      foreL: [-34, 0, 0],
      handL: [10, 0, 0],
      armR: [-70 - sh * 90, 0, -20 - sh * 10],
      foreR: [-36 - sh * 40, 0, 0],
      handR: [60, 0, 0],
    };
  } else if (kind === 'pray')
    p = { root: [0, -50, 0], legL: [-96, 0, 6], shinL: [104, 0, 0], legR: [-96, 0, -6], shinR: [104, 0, 0], chest: [22 + br, 0, 0], head: [32, 0, 0], armL: [-58, 0, -20], foreL: [-84, 0, 0], armR: [-58, 0, 20], foreR: [-84, 0, 0], handR: [0, 0, 0] };
  else if (kind === 'grief') p = { ...BASE, chest: [18 + br, 0, 0], head: [34, 0, 6], armL: [-10, 0, 6], armR: [-14, 0, -6] };
  else p = { ...BASE, chest: [4 + br, 0, S(t * 0.6) * 2], head: [-4 + S(t * 0.4) * 4, S(t * 0.33) * 12, 0] };
  return rad(p);
}

function humanLoco(e, t) {
  const g = e.gait;
  const sw = g ? g.armSwing / DEG : 0;
  const run = g ? g.runW * g.mw : 0;
  const br = S(t * 1.6 + e.phase * 0.1);
  const A = e.data.guard ? GUARD : BASE;
  return rad({
    chest: [A.chest[0] + run * 8 + br * 2, A.chest[1] * 0.5, 0],
    head: [A.head[0], A.head[1] * 0.5, 0],
    armL: [A.armL[0] + sw * 0.9, A.armL[1], A.armL[2]],
    foreL: A.foreL,
    handL: A.handL,
    armR: [A.armR[0] - sw * 0.5, A.armR[1], A.armR[2]],
    foreR: A.foreR,
    handR: A.handR,
  });
}

export const HENRIQUE_TYPE = {
  name: 'Henrique',
  build: buildHenrique,
  hp: 260,
  poise: 40,
  radius: 0.4,
  height: 1.85,
  lockHeight: 1.4,
  walk: 1.7,
  run: 3.6,
  turn: 7,
  sight: 0,
  hear: 0,
  // (un aliado: ni se le fija ni se le hiere)
  friendly: true,
  clips: { ...HENRIQUE_CLIPS, alert: HENRIQUE_CLIPS.hurt },
  voice: 'henrique',
  attacks: [],
  biped: { scale: 1.02, style: GAIT.soldier, stance: 0.12 },
  loco: humanLoco,
  idlePose,
  // lo que hace lo decide el guion de la casa
  ai: (e, dt, player) => {
    const h = e.game.house;
    if (h) h.npcAI(e, dt, player);
    else e.animate(dt);
  },
  onReset: (e) => e.game.house && e.game.house.npcReset(e),
  // no muere como una criatura: cae y el guion decide (la defensa fracasa)
  onDefeat: (e) => !!(e.game.house && e.game.house.npcDown(e)),
};
