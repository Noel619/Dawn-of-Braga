// Los cortesanos (PLAN_CASTILLO.md, §8): la corte de Dom Afonso, que se
// levantó con los cuchillos contra el Rey para que la culpa fuera de todos.
// Siguen en la sala, de rodillas ante el trono vacío, con el cuchillo en las
// manos como quien lleva una ofrenda, esperando a que vuelva. Ropa larga de
// corte (el brial hasta los pies, el manto, la cofia o el bonete), las manos
// y la cara grises, los ojos cerrados como si durmieran.
//
// No pelean cada uno a su aire: los lleva el compás (game/corte.js). En cada
// golpe del tambor ataca uno solo, el que el compás señala, que alza el
// cuchillo un tiempo antes; los demás cierran el corro con los cuchillos en
// alto. Caen pronto (dos golpes; desviado a compás, el de gracia). El último,
// solo y en silencio, el mayordomo: el que más quería el Rey.
import { Rig, clip } from './rig.js';
import { humanoidJoints, feetParts } from './models.js';
import { DEG } from '../core/util.js';
import { GAIT } from './locomotion.js';

const S = Math.sin;
function rad(p) {
  const o = {};
  for (const k in p) o[k] = k === 'root' ? p[k].map((v) => v / 100) : p[k].map((v) => v * DEG);
  return o;
}

// ------------------------------------------------------------ el cuerpo
// (las ropas de cada uno, por el orden en que se hacen: siempre las mismas)
const BRIAL = ['clothRed', 'clothBlue', 'clothPurple', 'clothDark', 'clothWhite', 'clothBlue', 'clothRed', 'clothPurple'];
const MANTO = ['clothDark', 'clothRed', 'clothDark', 'clothPurple', 'clothBlue', 'clothDark', 'clothPurple', 'clothRed'];
let nBuilt = 0;

function cortesanoParts(k, brial, manto, cofia, o = {}) {
  const parts = [
    // el brial, hasta los pies, más ancho abajo; el cinto
    { j: 'hips', type: 'box', s: [0.42, 0.9, 0.32], p: [0, -0.43, 0], taper: [1.32, 1.08], mat: brial },
    { j: 'hips', type: 'box', s: [0.4, 0.06, 0.3], p: [0, 0.03, 0], mat: o.gold ? 'gold' : 'leather' },
    // el cuerpo del brial y el manto sobre los hombros, cerrado al cuello
    { j: 'chest', type: 'box', s: [0.44, 0.52, 0.28], p: [0, 0.26, 0], taper: [0.86, 0.92], mat: brial },
    { j: 'chest', type: 'box', s: [0.52, 0.42, 0.33], p: [0, 0.33, -0.02], taper: [0.88, 1.02], mat: manto },
    { j: 'chest', type: 'cyl', s: [0.12, 0.14, 0.08], p: [0, 0.54, 0], mat: manto },
    // la cabeza: la cara gris, los ojos cerrados, la cofia
    { j: 'head', type: 'box', s: [0.16, 0.2, 0.17], p: [0, 0.1, 0.01], mat: 'skinGris' },
    { j: 'head', type: 'box', s: [0.045, 0.008, 0.012], p: [-0.04, 0.125, 0.097], mat: 'black' },
    { j: 'head', type: 'box', s: [0.045, 0.008, 0.012], p: [0.04, 0.125, 0.097], mat: 'black' },
    { j: 'head', type: 'cyl', s: [0.115, 0.125, o.bonete ? 0.13 : 0.09], p: [0, o.bonete ? 0.24 : 0.215, -0.005], seg: 8, mat: cofia },
    // las mangas (anchas, colgando) y las manos
    { j: 'armL', type: 'box', s: [0.13, 0.3, 0.13], p: [0, -0.15, 0], mat: brial },
    { j: 'foreL', type: 'box', s: [0.14, 0.27, 0.14], p: [0, -0.13, 0], taper: [1.25, 1.25], mat: brial },
    { j: 'handL', type: 'box', s: [0.08, 0.1, 0.09], p: [0, -0.05, 0.01], mat: 'skinGris' },
    { j: 'armR', type: 'box', s: [0.13, 0.3, 0.13], p: [0, -0.15, 0], mat: brial },
    { j: 'foreR', type: 'box', s: [0.14, 0.27, 0.14], p: [0, -0.13, 0], taper: [1.25, 1.25], mat: brial },
    { j: 'handR', type: 'box', s: [0.08, 0.1, 0.09], p: [0, -0.05, 0.01], mat: 'skinGris' },
    // el cuchillo (de mesa o de monte), a lo largo de +z de la mano
    { j: 'handR', type: 'box', s: [0.026, 0.036, 0.11], p: [0, -0.06, 0.04], mat: 'wooddark' },
    { j: 'handR', type: 'box', s: [0.012, 0.034, o.long ? 0.3 : 0.22], p: [0, -0.06, o.long ? 0.24 : 0.2], taper: [0.5, 1], mat: 'iron' },
    ...feetParts(k, 'leather', { w: 0.11, h: 0.07, l: 0.24 }),
  ];
  return parts;
}

export function buildCortesano() {
  const i = nBuilt++;
  const k = 0.97 + (i % 3) * 0.02;
  const joints = humanoidJoints(k);
  return new Rig({ joints, parts: cortesanoParts(k, BRIAL[i % BRIAL.length], MANTO[(i * 3) % MANTO.length], i % 2 ? 'clothDark' : 'linen', { bonete: i % 3 === 0, long: i % 4 === 1 }) });
}

// El mayordomo mayor: el brial negro, el manto rojo, el cinto y la cadena del
// oficio de oro, el bonete; un cuchillo de monte.
export function buildMayordomo() {
  const k = 1.03;
  const joints = humanoidJoints(k);
  const parts = cortesanoParts(k, 'clothDark', 'clothRed', 'clothDark', { bonete: true, long: true, gold: true });
  for (let a = 0; a < 8; a++) {
    const t = (a / 8) * Math.PI * 2;
    parts.push({ j: 'chest', type: 'box', s: [0.05, 0.03, 0.03], p: [Math.sin(t) * 0.17, 0.5 - Math.max(0, Math.cos(t)) * 0.12, Math.cos(t) * 0.12 + 0.02], mat: 'gold' });
  }
  parts.push({ j: 'chest', type: 'box', s: [0.07, 0.08, 0.02], p: [0, 0.36, 0.165], mat: 'gold' });
  return new Rig({ joints, parts });
}

// ------------------------------------------------------------ poses y clips
// de rodillas, con el cuchillo en las dos manos, como una ofrenda
const KNEEL = { root: [0, -52, 0], legL: [-98, 0, 6], shinL: [104, 0, 0], legR: [-98, 0, -6], shinR: [104, 0, 0], footL: [40, 0, 0], footR: [40, 0, 0], chest: [8, 0, 0], head: [22, 0, 0], armL: [-58, 0, -16], foreL: [-52, 0, 0], handL: [0, 0, 0], armR: [-58, 0, 16], foreR: [-52, 0, 0], handR: [62, 0, 0] };
// de pie, el cuchillo en alto (el corro)
const HIGH = { chest: [4, 0, 0], head: [6, 0, 0], armR: [-148, 0, -18], foreR: [-34, 0, 0], handR: [52, 0, 0], armL: [-46, 0, 22], foreL: [-40, 0, 0], handL: [0, 0, 0] };
// el que señala el compás: más alto todavía, echado atrás
const MARK = { chest: [-12, 0, 0], head: [-6, 0, 0], armR: [-172, 0, -8], foreR: [-16, 0, 0], handR: [40, 0, 0], armL: [-70, 0, 30], foreL: [-30, 0, 0], handL: [0, 0, 0] };
// la puñalada: hacia delante y abajo, con todo el cuerpo
const STAB = { root: [0, -10, 6], chest: [32, -10, 0], head: [10, 8, 0], armR: [-72, 0, -6], foreR: [-8, 0, 0], handR: [84, 0, 0], armL: [-20, 0, 40], foreL: [-30, 0, 0], legL: [-40, 0, 0], shinL: [36, 0, 0], legR: [20, 0, 0], shinR: [14, 0, 0] };

export const CORT_CLIPS = {
  // levantarse: primero una rodilla, luego de pie, y el cuchillo arriba
  rise: clip('cort_rise', 0.9, [
    [0, { ...KNEEL }],
    [0.35, { ...KNEEL, root: [0, -30, 0], legL: [-70, 0, 6], shinL: [70, 0, 0], legR: [-98, 0, -6], shinR: [104, 0, 0], chest: [20, 0, 0], head: [10, 0, 0] }],
    [0.65, { root: [0, -6, 0], legL: [-12, 0, 4], shinL: [14, 0, 0], legR: [-30, 0, -4], shinR: [36, 0, 0], chest: [6, 0, 0], head: [0, 0, 0], armR: [-110, 0, -20], foreR: [-40, 0, 0], handR: [50, 0, 0], armL: [-40, 0, 20], foreL: [-40, 0, 0] }],
    [0.9, { ...HIGH }],
  ]),
  alert: clip('cort_alert', 0.5, [
    [0, { ...HIGH }],
    [0.5, { ...HIGH }],
  ]),
  // la puñalada, a compás: el golpe entra a los 0,42 s (el director la
  // arranca para que caiga en el tiempo)
  stab: clip('cort_stab', 0.9, [
    [0, { ...MARK }],
    [0.26, { ...MARK, chest: [-16, 0, 0], armR: [-178, 0, -6] }],
    [0.42, { ...STAB }, 'snap'],
    [0.58, { ...STAB, chest: [26, -8, 0] }],
    [0.9, { ...HIGH }],
  ]),
  hurt: clip('cort_hurt', 0.45, [
    [0, { ...HIGH, chest: [-22, 12, 0], head: [-20, 0, 0], armL: [-24, 0, 40], root: [0, -4, -8] }, 'snap'],
    [0.45, { ...HIGH }],
  ]),
  stagger: clip('cort_stagger', 1.3, [
    [0, { chest: [-30, -18, 0], head: [-30, 0, 0], armL: [-20, 0, 60], armR: [-20, 0, -60], root: [0, -8, -12], legL: [-20, 0, 0], shinL: [40, 0, 0] }, 'snap'],
    [0.7, { chest: [36, 0, 0], head: [20, 0, 0], armL: [0, 0, 20], armR: [0, 0, -20], root: [0, -36, 0], legL: [-56, 0, 0], shinL: [96, 0, 0], legR: [-20, 0, 0], shinR: [96, 0, 0] }],
    [1.3, { ...HIGH }],
  ]),
  // desviado: el brazo del cuchillo, echado atrás; abierto al de gracia
  parried: clip('cort_parried', 2.0, [
    [0, { chest: [-30, 22, 0], head: [-30, 0, -15], armR: [-160, 0, -70], foreR: [-20, 0, 0], handR: [50, 0, 0], armL: [-60, 0, 80], foreL: [-30, 0, 0], root: [0, -6, -16], legL: [-26, 0, 0], shinL: [36, 0, 0], legR: [20, 0, 0], shinR: [20, 0, 0] }, 'snap'],
    [1.2, { chest: [-10, 8, 0], head: [-14, 0, -6], armR: [-90, 0, -36], foreR: [-40, 0, 0], handR: [42, 0, 0], armL: [-46, 0, 46], foreL: [-50, 0, 0], root: [0, -12, -10], legL: [-30, 0, 0], shinL: [48, 0, 0], legR: [14, 0, 0], shinR: [24, 0, 0] }],
    [2.0, { ...HIGH }],
  ]),
  // de rodillas otra vez y de bruces, con el cuchillo debajo
  death: clip('cort_death', 1.5, [
    [0, { ...HIGH, chest: [-18, 10, 0], head: [-20, 0, 0] }, 'snap'],
    [0.45, { root: [0, -48, 0], legL: [-96, 0, 6], shinL: [110, 0, 0], legR: [-90, 0, -6], shinR: [110, 0, 0], chest: [24, 0, 0], head: [26, 0, 0], armR: [-30, 0, -10], foreR: [-40, 0, 0], armL: [-30, 0, 12], foreL: [-30, 0, 0] }],
    [1.0, { root: [0, -80, 28], legL: [-60, 0, 6], shinL: [70, 0, 0], legR: [-56, 0, -6], shinR: [70, 0, 0], chest: [70, 0, 0], head: [20, 0, 10], armR: [-140, 0, -30], foreR: [-20, 0, 0], armL: [-130, 0, 30], foreL: [-20, 0, 0] }],
    [1.5, { root: [0, -86, 40], legL: [-20, 0, 6], shinL: [20, 0, 0], legR: [-18, 0, -6], shinR: [20, 0, 0], chest: [86, 0, 0], head: [10, 0, 20], armR: [-170, 0, -40], foreR: [-10, 0, 0], armL: [-160, 0, 40], foreL: [-10, 0, 0] }],
  ]),
};

// el mayordomo: dos cuchilladas seguidas, la puñalada larga y el abrazo (te
// coge del hombro y te clava el cuchillo: no se desvía)
const MAY = { ...HIGH, armR: [-60, 0, -20], foreR: [-50, 0, 0], handR: [70, 0, 0] };
export const MAY_CLIPS = {
  ...CORT_CLIPS,
  combo: clip('may_combo', 1.6, [
    [0, { ...MAY }],
    [0.3, { ...MAY, chest: [-6, 30, 0], armR: [-120, 0, -70], foreR: [-30, 0, 0] }],
    [0.46, { ...MAY, chest: [14, -30, 0], armR: [-80, 0, 40], foreR: [-10, 0, 0], handR: [60, 0, 0] }, 'snap'],
    [0.78, { ...MAY, chest: [-6, -26, 0], armR: [-110, 0, 30], foreR: [-30, 0, 0] }],
    [0.94, { ...MAY, chest: [16, 30, 0], armR: [-74, 0, -50], foreR: [-10, 0, 0], handR: [60, 0, 0] }, 'snap'],
    [1.6, { ...MAY }],
  ]),
  lunge: clip('may_lunge', 1.5, [
    [0, { ...MAY }],
    [0.55, { ...MAY, root: [0, -14, -10], chest: [-14, 0, 0], armR: [-40, 0, -16], foreR: [-90, 0, 0], legL: [-30, 0, 0], shinL: [50, 0, 0], legR: [20, 0, 0] }],
    [0.78, { ...STAB, armR: [-86, 0, -6] }, 'snap'],
    [1.0, { ...STAB }],
    [1.5, { ...MAY }],
  ]),
  embrace: clip('may_embrace', 1.9, [
    [0, { ...MAY }],
    [0.7, { ...MAY, chest: [-10, 0, 0], armL: [-100, 0, 50], foreL: [-30, 0, 0], armR: [-160, 0, -20], foreR: [-30, 0, 0] }],
    [0.95, { ...STAB, armL: [-90, 0, -20], foreL: [-40, 0, 0] }, 'snap'],
    [1.3, { ...STAB, armL: [-90, 0, -20], foreL: [-40, 0, 0] }],
    [1.9, { ...MAY }],
  ]),
};

function idlePose(e, kind, t) {
  const br = S(t * 1.1 + e.phase) * 0.5;
  // (rezan muy bajo, de rodillas; el cuchillo apenas se mueve)
  return rad({ ...KNEEL, chest: [KNEEL.chest[0] + br * 5, 0, 0], head: [KNEEL.head[0] + br * 3, S(t * 0.21 + e.phase) * 3, 0] });
}

function loco(e, t) {
  const g = e.gait;
  const sw = g ? g.armSwing / DEG : 0;
  const br = S(t * 1.6 + e.phase * 0.1);
  // (el señalado, con el cuchillo más alto)
  const P = e.data.marked ? MARK : HIGH;
  return rad({ ...P, chest: [P.chest[0] + br * 2, 0, 0], armL: [P.armL[0] + sw * 0.4, P.armL[1], P.armL[2]] });
}

// (lo que llevan entre manos los dos: la cabeza del cuchillo, para el golpe)
const STAB_ATK = { name: 'stab', clip: CORT_CLIPS.stab, dur: 0.9, min: 0, max: 0, hits: [[0.38, 0.5]], dmg: 16, stDmg: 16, range: 1.9, arc: 70, lunge: [[0.26, 0.44, 5.2]], trackUntil: 0.36, turn: 9, weight: 0, cd: 0 };

// La corte la lleva el compás: el director (game/corte.js) decide quién se
// levanta, quién ataca y cuándo. Sin él, rezan.
const ctrl = {
  perceive: (e) => !!e.data.corte,
  wake(e) {
    // (se levanta despacio: de rodillas a de pie, con el cuchillo arriba)
    e.state = 'rise';
    e.stT = 0;
    e.anim.play(e.T.clips.rise, { blend: 0.1 });
    return true;
  },
  states: {
    rise(e) {
      e.vx = e.vz = 0;
      if (e.stT >= e.T.clips.rise.dur) {
        e.state = 'chase';
        e.stT = 0;
        e.anim.stop(0.15);
      }
    },
  },
  think: (e, player, d, dt) => (e.game.corte ? e.game.corte.think(e, player, d, dt) : null),
  // (golpeado de rodillas, antes de tiempo: la corte se levanta entera)
  onHit: (e) => e.game.corte && e.game.corte.provoked(e),
  // (los cuerpos se quedan en la sala, donde caen)
  keepCorpse: true,
  deathDur: Infinity,
};

export const CORTESANO_TYPE = {
  name: 'Cortesano',
  build: buildCortesano,
  hp: 40,
  poise: 14,
  radius: 0.36,
  height: 1.72,
  lockHeight: 1.3,
  walk: 1.7,
  run: 3.6,
  runDist: 5,
  sight: 30,
  hear: 30,
  turn: 7,
  stride: 2.3,
  approach: 2.4,
  leash: 80,
  parryDur: 2.0,
  clips: CORT_CLIPS,
  voice: 'penitent',
  attacks: [STAB_ATK],
  STAB: STAB_ATK,
  biped: { scale: 0.98, style: GAIT.shamble, stance: 0.07 },
  loco,
  idlePose,
  ...ctrl,
};

export const MAYORDOMO_TYPE = {
  name: 'El mayordomo',
  build: buildMayordomo,
  hp: 300,
  poise: 46,
  radius: 0.4,
  height: 1.82,
  lockHeight: 1.4,
  walk: 1.8,
  run: 4.0,
  runDist: 5,
  sight: 30,
  hear: 30,
  turn: 6,
  stride: 2.3,
  approach: 1.7,
  leash: 80,
  parryDur: 1.5,
  clips: MAY_CLIPS,
  voice: 'soldier',
  attacks: [
    { name: 'combo', clip: MAY_CLIPS.combo, dur: 1.6, min: 0, max: 2.4, hits: [[0.42, 0.52], [0.9, 1.0]], dmg: 19, range: 2.2, arc: 110, lunge: [[0.36, 0.46, 2.4], [0.86, 0.96, 2.4]], weight: 3 },
    { name: 'lunge', clip: MAY_CLIPS.lunge, dur: 1.5, min: 1.8, max: 6, hits: [[0.74, 0.86]], dmg: 26, range: 2.4, arc: 50, lunge: [[0.6, 0.84, 8]], weight: 2, turn: 4 },
    { name: 'embrace', clip: MAY_CLIPS.embrace, dur: 1.9, min: 0, max: 2.0, hits: [[0.9, 1.02]], dmg: 34, stDmg: 40, range: 1.9, arc: 70, lunge: [[0.7, 0.92, 3]], weight: 1.2, noParry: true },
  ],
  biped: { scale: 1.03, style: GAIT.soldier, stance: 0.1 },
  loco: (e, t) => rad({ ...MAY, chest: [MAY.chest[0] + S(t * 1.6) * 2, 0, 0] }),
  idlePose,
  ...ctrl,
  // (el mayordomo lo lleva él solo, cuando el compás ya calla)
  think: null,
  onHit: (e) => e.game.corte && e.game.corte.provoked(e),
};
