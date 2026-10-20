// Dom Paio, canónigo de la Sé: uno de los dos que bajaron tras el arzobispo
// y volvieron a echar los cerrojos de la Puerta del Dios Ignoto. Dos formas:
//  - Vivo ('paio'): un aliado, como Henrique (se anima como las criaturas,
//    no se le fija ni se le hiere). Reza en la capilla de San Martín; lo que
//    hace lo decide su guion: game/paio.js.
//  - Convertido ('paioHollow'): un jefe. Guarda la cadena de la Pila de los
//    Condenados, en el pozo, con el cirial de hierro de la capilla.
import * as THREE from 'three';
import { Rig, clip } from './rig.js';
import { humanoidJoints, feetParts } from './models.js';
import { GAIT } from './locomotion.js';
import { DEG } from '../core/util.js';
import { DIALOG } from '../game/story.js';

const S = Math.sin;
const V3 = THREE.Vector3;

// grados -> radianes (root en cm -> m)
function rad(p) {
  const o = {};
  for (const k in p) o[k] = k === 'root' ? p[k].map((v) => v / 100) : p[k].map((v) => v * DEG);
  return o;
}

// ------------------------------------------------------------ el cuerpo
// Viejo, enjuto, un poco cargado de hombros: la sotana negra hasta los
// tobillos, la sobrepelliz blanca encima (de mangas anchas) y la muceta negra
// con su capucha sobre los hombros; tonsura y barba de días, todo canas. En
// la izquierda, una vela encendida; en la derecha, su breviario.
// Convertido: la sobrepelliz parda de sangre y hecha jirones, la carne que le
// revienta el pecho y le sube por el cuello, los ojos encendidos y, en vez de
// la vela, el cirial de hierro de la capilla, que blande como una maza (la
// vela, en su punta, sigue ardiendo).
export function buildPaio(hollow = false) {
  const k = 0.97;
  const joints = humanoidJoints(k, { arm: hollow ? 1.08 : 1 });
  const skin = hollow ? 'skinCorrupt' : 'skin';
  const robe = 'clothDark';
  const alb = hollow ? 'burlap' : 'linen';
  const hair = 'hairGrey';
  const parts = [
    // la sotana y, encima, la sobrepelliz (hasta la rodilla)
    { j: 'hips', type: 'box', s: [0.4, 0.82, 0.3], p: [0, -0.37, 0], taper: [1.3, 1.24], mat: robe },
    { j: 'hips', type: 'box', s: [0.43, 0.46, 0.31], p: [0, -0.19, 0], taper: [1.2, 1.14], mat: alb },
    // el pecho: la sobrepelliz, la muceta con su capucha caída, el cuello de
    // la sotana y una cruz de madera colgada
    { j: 'chest', type: 'box', s: [0.42, 0.5, 0.28], p: [0, 0.24, 0], taper: [0.86, 0.92], mat: alb },
    { j: 'chest', type: 'box', s: [0.42, 0.17, 0.29], p: [0, 0.47, 0], taper: [1.12, 1.08], mat: robe },
    { j: 'chest', type: 'box', s: [0.24, 0.2, 0.07], p: [0, 0.43, -0.18], r: [12, 0, 0], taper: [1.1, 1.3], mat: robe },
    { j: 'chest', type: 'cyl', s: [0.075, 0.09, 0.1], p: [0, 0.56, 0], seg: 8, mat: robe },
    { j: 'chest', type: 'box', s: [0.022, 0.1, 0.012], p: [0, 0.34, 0.15], mat: 'wooddark' },
    { j: 'chest', type: 'box', s: [0.065, 0.02, 0.012], p: [0, 0.365, 0.15], mat: 'wooddark' },
    // la cabeza: cara chupada, nariz larga, ojos hundidos; la corona rapada
    // con su cerco de canas y la barba de días
    { j: 'head', type: 'box', s: [0.19, 0.235, 0.21], p: [0, 0.13, 0], taper: [0.86, 0.92], mat: skin },
    { j: 'head', type: 'box', s: [0.04, 0.075, 0.05], p: [0, 0.125, 0.112], r: [-14, 0, 0], mat: skin },
    { j: 'head', type: 'box', s: [0.036, 0.02, 0.01], p: [-0.044, 0.158, 0.104], mat: hollow ? 'eyeGlow' : 'black' },
    { j: 'head', type: 'box', s: [0.036, 0.02, 0.01], p: [0.044, 0.158, 0.104], mat: hollow ? 'eyeGlow' : 'black' },
    { j: 'head', type: 'box', s: [0.055, 0.016, 0.018], p: [-0.046, 0.183, 0.106], r: [0, 0, 10], mat: hair },
    { j: 'head', type: 'box', s: [0.055, 0.016, 0.018], p: [0.046, 0.183, 0.106], r: [0, 0, -10], mat: hair },
    { j: 'head', type: 'box', s: [0.2, 0.11, 0.06], p: [0, 0.19, -0.095], mat: hair },
    { j: 'head', type: 'box', s: [0.03, 0.1, 0.16], p: [0.1, 0.19, -0.02], mat: hair },
    { j: 'head', type: 'box', s: [0.03, 0.1, 0.16], p: [-0.1, 0.19, -0.02], mat: hair },
    { j: 'head', type: 'box', s: [0.17, 0.07, 0.07], p: [0, 0.045, 0.075], taper: [0.8, 0.9], mat: hair },
    { j: 'head', type: 'box', s: [0.06, 0.016, 0.01], p: [0, 0.075, 0.112], mat: 'black' },
    // brazos: las mangas anchas de la sobrepelliz, el puño negro de la sotana
    { j: 'armL', type: 'box', s: [0.14, 0.3, 0.14], p: [0, -0.13, 0], taper: [1.12, 1.12], mat: alb },
    { j: 'foreL', type: 'box', s: [0.15, 0.22, 0.15], p: [0, -0.09, 0], taper: [1.3, 1.3], mat: alb },
    { j: 'foreL', type: 'box', s: [0.085, 0.07, 0.085], p: [0, -0.23, 0], mat: robe },
    { j: 'handL', type: 'box', s: [0.075, 0.1, 0.085], p: [0, -0.05, 0.01], mat: skin },
    { j: 'armR', type: 'box', s: [0.14, 0.3, 0.14], p: [0, -0.13, 0], taper: [1.12, 1.12], mat: alb },
    { j: 'foreR', type: 'box', s: [0.15, 0.22, 0.15], p: [0, -0.09, 0], taper: [1.3, 1.3], mat: alb },
    { j: 'foreR', type: 'box', s: [0.085, 0.07, 0.085], p: [0, -0.23, 0], mat: robe },
    { j: 'handR', type: 'box', s: [0.075, 0.1, 0.085], p: [0, -0.05, 0.01], mat: skin },
    // las piernas, en la sotana; zapatos de cuero
    { j: 'legL', type: 'box', s: [0.16, 0.46, 0.17], p: [0, -0.22, 0], taper: [0.85, 0.85], mat: robe },
    { j: 'shinL', type: 'box', s: [0.13, 0.42, 0.14], p: [0, -0.2, 0], taper: [0.9, 0.9], mat: robe },
    { j: 'legR', type: 'box', s: [0.16, 0.46, 0.17], p: [0, -0.22, 0], taper: [0.85, 0.85], mat: robe },
    { j: 'shinR', type: 'box', s: [0.13, 0.42, 0.14], p: [0, -0.2, 0], taper: [0.9, 0.9], mat: robe },
    ...feetParts(k, 'leather', { w: 0.11, h: 0.075, l: 0.25 }),
  ];
  if (!hollow) {
    parts.push(
      // la vela (derecha en reposo: a lo largo del z de la mano) y su llama
      { j: 'handL', type: 'cyl', s: [0.022, 0.026, 0.22], p: [0, -0.06, 0.08], r: [90, 0, 0], seg: 6, mat: 'candle' },
      { j: 'handL', type: 'cone', s: [0.02, 0.06], p: [0, -0.06, 0.22], r: [90, 0, 0], seg: 5, mat: 'ember' },
      // el breviario, cerrado, con el canto de las hojas
      { j: 'handR', type: 'box', s: [0.045, 0.2, 0.15], p: [0, -0.11, 0.035], mat: 'leather' },
      { j: 'handR', type: 'box', s: [0.04, 0.185, 0.008], p: [0, -0.11, 0.112], mat: 'linen' }
    );
  } else {
    parts.push(
      // la carne: le revienta el pecho, le sube por el cuello y la mejilla
      { j: 'chest', type: 'ico', s: [0.15, 0.13, 0.09], p: [0.06, 0.26, 0.13], mat: 'flesh' },
      { j: 'chest', type: 'ico', s: [0.09, 0.08, 0.07], p: [-0.1, 0.38, 0.12], mat: 'flesh' },
      { j: 'chest', type: 'ico', s: [0.07], p: [0.05, 0.53, 0.06], mat: 'flesh' },
      { j: 'head', type: 'ico', s: [0.06, 0.07, 0.05], p: [0.085, 0.07, 0.06], mat: 'flesh' },
      { j: 'chest', type: 'box', s: [0.12, 0.16, 0.01], p: [0.05, 0.2, 0.146], r: [0, 0, 12], mat: 'blood' },
      // jirones de la sobrepelliz
      ...[-0.15, -0.05, 0.06, 0.16].map((x, i) => ({ j: 'hips', type: 'box', s: [0.06, 0.18 + (i % 2) * 0.08, 0.012], p: [x, -0.48 - (i % 2) * 0.04, 0.2], r: [6, 0, (i - 1.5) * 4], mat: alb })),
      // los dedos, largos y negros
      ...[-0.025, 0, 0.025].map((x) => ({ j: 'handL', type: 'box', s: [0.014, 0.15, 0.014], p: [x, -0.15, 0.02], r: [12, 0, 0], mat: 'skinCorrupt' })),
      // el cirial: el asta de hierro (a lo largo del z de la mano), el
      // mechero de bronce con la vela que sigue ardiendo y el regatón
      { j: 'handR', type: 'cyl', s: [0.022, 0.022, 1.62], p: [0, -0.05, 0.3], r: [90, 0, 0], seg: 6, mat: 'iron' },
      { j: 'handR', type: 'cyl', s: [0.04, 0.03, 0.1], p: [0, -0.05, 0.62], r: [90, 0, 0], seg: 6, mat: 'bronze' },
      { j: 'handR', type: 'cyl', s: [0.12, 0.05, 0.05], p: [0, -0.05, 1.12], r: [90, 0, 0], seg: 8, mat: 'bronze' },
      { j: 'handR', type: 'cyl', s: [0.045, 0.045, 0.16], p: [0, -0.05, 1.22], r: [90, 0, 0], seg: 6, mat: 'candle' },
      { j: 'handR', type: 'cone', s: [0.035, 0.1], p: [0, -0.05, 1.35], r: [90, 0, 0], seg: 5, mat: 'ember' },
      { j: 'handR', type: 'cone', s: [0.03, 0.14], p: [0, -0.05, -0.56], r: [-90, 0, 0], seg: 5, mat: 'iron' }
    );
  }
  return new Rig({ joints, parts });
}

// ======================================================================= VIVO
// En reposo: la vela delante del pecho, el libro colgando de la derecha.
const BASE = { chest: [10, 0, 0], head: [-6, 0, 0], armL: [-34, 0, 8], foreL: [-80, 0, 0], handL: [10, 0, 0], armR: [-8, 0, -8], foreR: [-40, 0, 0], handR: [20, 0, 0] };
// de rodillas, con las manos juntas (la vela entre ellas)
const PRAY = { root: [0, -50, 0], legL: [-96, 0, 6], shinL: [104, 0, 0], legR: [-96, 0, -6], shinR: [104, 0, 0], chest: [20, 0, 0], head: [28, 0, 0], armL: [-62, 0, -18], foreL: [-80, 0, 0], handL: [10, 0, 0], armR: [-58, 0, 22], foreR: [-84, 0, 0], handR: [20, 0, 0] };
// echado atrás, la vela por delante (el susto)
const COWER = { chest: [-8, 0, 0], head: [-14, 0, 0], armL: [-74, 0, 14], foreL: [-54, 0, 0], handL: [24, 0, 0], armR: [-20, 0, -26], foreR: [-70, 0, 0], handR: [10, 0, 0], root: [0, -4, -6] };

export const PAIO_CLIPS = {
  // se levanta, de rodillas a de pie (y se vuelve)
  rise: clip('rise', 1.4, [
    [0, { ...PRAY }],
    [0.6, { ...PRAY, root: [0, -30, 0], legL: [-70, 0, 6], shinL: [70, 0, 0], legR: [-40, 0, -6], shinR: [80, 0, 0], chest: [30, 0, 0], head: [0, 0, 0] }],
    [1.4, { ...COWER }],
  ]),
  // se arrodilla otra vez a rezar
  kneel: clip('kneel', 1.4, [
    [0, { ...BASE }],
    [0.8, { ...PRAY, root: [0, -34, 0], chest: [28, 0, 0], head: [10, 0, 0] }],
    [1.4, { ...PRAY }],
  ]),
};
// gestos al hablar (uno al azar con cada frase)
export const PAIO_TALK = [
  // alza el breviario
  clip('pTalkA', 2.4, [
    [0, { ...BASE }],
    [0.5, { ...BASE, armR: [-50, 0, -18], foreR: [-70, 0, 0], handR: [-10, 0, 0], head: [-10, -6, 0] }],
    [1.6, { ...BASE, armR: [-54, 0, -20], foreR: [-66, 0, 0], handR: [-14, 0, 0], head: [-4, 8, 0], chest: [6, -8, 0] }],
    [2.4, { ...BASE }],
  ]),
  // se lleva el libro al pecho, cabizbajo
  clip('pTalkB', 2.6, [
    [0, { ...BASE }],
    [0.7, { ...BASE, armR: [-36, 0, 10], foreR: [-110, 0, 0], handR: [-30, 0, 0], head: [22, 0, 6], chest: [16, 0, 0] }],
    [1.9, { ...BASE, armR: [-38, 0, 12], foreR: [-112, 0, 0], handR: [-30, 0, 0], head: [26, 0, -4], chest: [18, 0, 0] }],
    [2.6, { ...BASE }],
  ]),
  // señala con el libro hacia el pórtico (lejos)
  clip('pTalkC', 2.2, [
    [0, { ...BASE }],
    [0.45, { ...BASE, armR: [-80, 10, -14], foreR: [-8, 0, 0], handR: [0, 0, 0], head: [-4, -14, 0], chest: [6, -12, 0] }],
    [1.5, { ...BASE, armR: [-82, 12, -14], foreR: [-6, 0, 0], handR: [0, 0, 0], head: [-4, -16, 0], chest: [6, -14, 0] }],
    [2.2, { ...BASE }],
  ]),
];

function paioIdle(e, kind, t) {
  const br = S(t * 1.4 + e.phase) * 2;
  if (kind === 'pray') {
    // reza: se mece un poco, como el que lleva días rezando
    const r = S(t * 0.9 + e.phase);
    return rad({ ...PRAY, chest: [20 + r * 5, 0, 0], head: [28 + r * 4, 0, 0] });
  }
  if (kind === 'cower') return rad({ ...COWER, chest: [COWER.chest[0] + br, 0, 0], head: [-14, S(t * 0.8) * 6, 0] });
  return rad({ ...BASE, chest: [10 + br, 0, S(t * 0.5) * 2], head: [-6 + S(t * 0.4) * 3, S(t * 0.3) * 10, 0] });
}

function paioLoco(e, t) {
  const g = e.gait;
  const sw = g ? g.armSwing / DEG : 0;
  const br = S(t * 1.6 + e.phase * 0.1);
  return rad({ ...BASE, chest: [12 + br * 2, 0, 0], armR: [BASE.armR[0] - sw * 0.6, 0, BASE.armR[2]] });
}

export const PAIO_TYPE = {
  name: 'Dom Paio',
  build: () => buildPaio(false),
  hp: 200,
  poise: 30,
  radius: 0.36,
  height: 1.72,
  lockHeight: 1.3,
  walk: 1.0,
  run: 2.2,
  turn: 5,
  sight: 0,
  hear: 0,
  // (un aliado: ni se le fija ni se le hiere)
  friendly: true,
  clips: { ...PAIO_CLIPS, hurt: PAIO_CLIPS.rise, death: PAIO_CLIPS.kneel },
  voice: 'paio',
  attacks: [],
  biped: { scale: 0.97, style: GAIT.shamble, stance: 0.08 },
  loco: paioLoco,
  idlePose: paioIdle,
  // la luz de su vela
  init: (e) => {
    e.P.light = e.game.fx.lights.add({ x: e.pos.x, y: e.pos.y + 1.2, z: e.pos.z, color: 0xffb060, intensity: 0, range: 5, flicker: 0.35, priority: 2 });
  },
  // lo que hace lo decide su guion
  ai: (e, dt, player) => {
    const q = e.game.paio;
    if (q) q.npcAI(e, dt, player);
    else e.animate(dt);
  },
  onReset: (e) => e.game.paio && e.game.paio.npcReset(e),
};

// ======================================================================= CONVERTIDO
// Cargado de hombros, el cirial por delante, en diagonal.
const HB = { chest: [26, 0, 0], head: [-16, 0, 0], armR: [-44, 0, -14], foreR: [-52, 0, 0], handR: [36, 0, 0], armL: [-16, 0, 18], foreL: [-30, 0, 0], handL: [20, 0, 0] };
// de rodillas ante la cadena, el cirial apoyado en el suelo
const HKNEEL = { root: [0, -50, 0], legL: [-96, 0, 6], shinL: [104, 0, 0], legR: [-96, 0, -6], shinR: [104, 0, 0], chest: [30, 0, 0], head: [36, 0, 0], armR: [-30, 0, -16], foreR: [-40, 0, 0], handR: [62, 0, 0], armL: [-50, 0, 10], foreL: [-60, 0, 0], handL: [30, 0, 0] };

export const HOLLOW_CLIPS = {
  // se levanta del suelo y se vuelve, con el cirial
  alert: clip('alert', 2.2, [
    [0, { ...HKNEEL }],
    [0.9, { ...HKNEEL, root: [0, -28, 0], legL: [-60, 0, 6], shinL: [64, 0, 0], legR: [-30, 0, -6], shinR: [70, 0, 0], chest: [40, 0, 0], head: [-20, 0, 0] }],
    [1.5, { ...HB, chest: [-6, 0, 0], head: [-36, 0, 0], armL: [-40, 0, 50], foreL: [-30, 0, 0], armR: [-150, 0, -20], foreR: [-20, 0, 0], handR: [40, 0, 0] }, 'snap'],
    [2.2, { ...HB }],
  ]),
  // mazazo de arriba abajo
  smash: clip('smash', 1.55, [
    [0, { ...HB }],
    [0.55, { chest: [-10, -12, 0], head: [-14, 0, 0], armR: [-172, 0, -22], foreR: [-34, 0, 0], handR: [50, 0, 0], armL: [-60, 0, 30], foreL: [-50, 0, 0], legL: [14, 0, 0], legR: [-18, 0, 0], shinR: [20, 0, 0] }, 'hold'],
    [0.7, { chest: [46, 12, 0], head: [-26, 0, 0], armR: [-48, 0, -6], foreR: [-6, 0, 0], handR: [38, 0, 0], armL: [-24, 0, 30], foreL: [-40, 0, 0], legL: [30, 0, 0], legR: [-34, 0, 0], shinR: [30, 0, 0], root: [0, -12, 0] }, 'snap'],
    [1.05, { chest: [44, 10, 0], head: [-24, 0, 0], armR: [-44, 0, -6], foreR: [-8, 0, 0], handR: [34, 0, 0], armL: [-22, 0, 30], foreL: [-40, 0, 0], legL: [30, 0, 0], legR: [-34, 0, 0], shinR: [30, 0, 0], root: [0, -12, 0] }],
    [1.55, { ...HB }],
  ]),
  // barrido de derecha a izquierda
  sweep: clip('sweep', 1.6, [
    [0, { ...HB }],
    [0.5, { ...HB, chest: [16, -46, 0], head: [-16, 20, 0], armR: [-86, 0, -88], foreR: [-22, 0, 0], handR: [64, 0, 0], armL: [-30, 0, 40], foreL: [-40, 0, 0] }, 'hold'],
    [0.68, { ...HB, chest: [24, 44, 0], head: [-18, -16, 0], armR: [-92, 0, 44], foreR: [-6, 0, 0], handR: [80, 0, 0], armL: [-24, 0, 26], foreL: [-30, 0, 0], root: [0, -6, 0] }, 'snap'],
    [1.0, { ...HB, chest: [22, 50, 0], head: [-16, -18, 0], armR: [-86, 0, 56], foreR: [-18, 0, 0], handR: [74, 0, 0], root: [0, -6, 0] }],
    [1.6, { ...HB }],
  ]),
  // estocada con la punta del cirial (se lanza)
  thrust: clip('thrust', 1.6, [
    [0, { ...HB }],
    [0.55, { ...HB, chest: [6, -24, 0], armR: [-56, 0, -16], foreR: [-104, 0, 0], handR: [30, 0, 0], armL: [-40, 0, 30], legL: [-30, 0, 0], shinL: [40, 0, 0], root: [0, -10, -8] }, 'hold'],
    [0.8, { ...HB, chest: [40, 10, 0], head: [-30, 0, 0], armR: [-86, 0, -4], foreR: [-4, 0, 0], handR: [6, 0, 0], armL: [-10, 0, 30], legL: [-50, 0, 0], shinL: [40, 0, 0], legR: [30, 0, 0], shinR: [30, 0, 0], root: [0, -18, 10] }, 'snap'],
    [1.1, { ...HB, chest: [38, 8, 0], head: [-28, 0, 0], armR: [-84, 0, -4], foreR: [-6, 0, 0], handR: [8, 0, 0], legL: [-50, 0, 0], shinL: [40, 0, 0], legR: [30, 0, 0], shinR: [30, 0, 0], root: [0, -18, 10] }],
    [1.6, { ...HB }],
  ]),
  // la cera: voltea el cirial y la vela escupe cera ardiendo
  wax: clip('wax', 1.9, [
    [0, { ...HB }],
    [0.6, { ...HB, chest: [-4, -20, 0], head: [-20, 10, 0], armR: [-150, 0, -40], foreR: [-50, 0, 0], handR: [40, 0, 0] }, 'hold'],
    [0.9, { ...HB, chest: [30, 16, 0], head: [-24, -6, 0], armR: [-96, 0, 10], foreR: [-10, 0, 0], handR: [40, 0, 0], root: [0, -6, 0] }, 'snap'],
    [1.3, { ...HB, chest: [28, 14, 0], armR: [-92, 0, 8], foreR: [-14, 0, 0], handR: [40, 0, 0], root: [0, -6, 0] }],
    [1.9, { ...HB }],
  ]),
  // la letanía: alza el cirial con las dos manos, canta y lo clava en el
  // suelo (el fuego sale de la vela)
  litany: clip('litany', 2.5, [
    [0, { ...HB }],
    [0.5, { chest: [-20, 0, 0], head: [-40, 0, 0], armR: [-176, 0, -10], foreR: [-16, 0, 0], handR: [20, 0, 0], armL: [-170, 0, 12], foreL: [-30, 0, 0], handL: [0, 0, 0] }],
    [1.15, { chest: [-26, 0, 4], head: [-46, 0, 6], armR: [-180, 0, -8], foreR: [-12, 0, 0], handR: [16, 0, 0], armL: [-176, 0, 10], foreL: [-26, 0, 0], root: [0, 4, 0] }, 'hold'],
    [1.35, { chest: [50, 0, 0], head: [-10, 0, 0], armR: [-60, 0, -10], foreR: [-30, 0, 0], handR: [110, 0, 0], armL: [-56, 0, 10], foreL: [-30, 0, 0], root: [0, -26, 0], legL: [-40, 0, 0], shinL: [70, 0, 0], legR: [-20, 0, 0], shinR: [60, 0, 0] }, 'snap'],
    [1.9, { chest: [48, 0, 0], head: [-8, 0, 0], armR: [-58, 0, -10], foreR: [-32, 0, 0], handR: [108, 0, 0], armL: [-54, 0, 10], foreL: [-30, 0, 0], root: [0, -26, 0], legL: [-40, 0, 0], shinL: [70, 0, 0], legR: [-20, 0, 0], shinR: [60, 0, 0] }],
    [2.5, { ...HB }],
  ]),
  hurt: clip('hurt', 0.55, [
    [0, { ...HB, chest: [-14, 18, 0], head: [-30, 0, 18], armL: [-30, 0, 50], root: [0, -4, -8] }, 'snap'],
    [0.55, { ...HB }],
  ]),
  stagger: clip('stagger', 1.3, [
    [0, { chest: [-24, 26, 0], head: [-36, 0, 18], armL: [-20, 0, 66], armR: [-30, 0, -60], foreR: [-20, 0, 0], root: [0, -10, -14], legL: [-20, 0, 0], shinL: [40, 0, 0] }, 'snap'],
    [0.6, { chest: [60, 0, 0], head: [16, 0, 0], armL: [0, 0, 20], armR: [-20, 0, -20], foreR: [-30, 0, 0], handR: [60, 0, 0], root: [0, -40, 0], legL: [-70, 0, 0], shinL: [100, 0, 0], legR: [-40, 0, 0], shinR: [100, 0, 0] }],
    [1.3, { ...HB }],
  ]),
  // desequilibrado tras un parry: el cirial se le va atrás
  parried: clip('parried', 1.6, [
    [0, { chest: [-28, -24, 0], head: [-40, 0, 22], armR: [-166, 0, -70], foreR: [-20, 0, 0], handR: [40, 0, 0], armL: [-24, 0, 64], foreL: [-20, 0, 0], root: [0, -6, -18], legL: [-28, 0, 0], shinL: [38, 0, 0], legR: [20, 0, 0], shinR: [22, 0, 0] }, 'snap'],
    [0.4, { chest: [-18, -18, 0], head: [-30, 0, 16], armR: [-140, 0, -60], foreR: [-28, 0, 0], handR: [40, 0, 0], armL: [-12, 0, 50], foreL: [-24, 0, 0], root: [0, -14, -20], legL: [-38, 0, 0], shinL: [58, 0, 0], legR: [26, 0, 0], shinR: [30, 0, 0] }],
    [1.0, { chest: [-4, -10, 0], head: [-20, 0, 10], armR: [-96, 0, -40], foreR: [-36, 0, 0], handR: [36, 0, 0], armL: [-12, 0, 36], foreL: [-24, 0, 0], root: [0, -12, -12], legL: [-30, 0, 0], shinL: [50, 0, 0], legR: [16, 0, 0], shinR: [26, 0, 0] }],
    [1.6, { ...HB }],
  ]),
  // vencido: cae de rodillas, suelta el cirial y se dobla sobre sí mismo
  death: clip('death', 2.4, [
    [0, { chest: [-20, 0, 0], head: [-34, 0, 0], armL: [-20, 0, 50], armR: [-40, 0, -50] }, 'snap'],
    [0.7, { ...HKNEEL, chest: [10, 0, 0], head: [-10, 0, 0], armR: [-10, 0, -40], foreR: [-10, 0, 0], handR: [0, 0, 0] }],
    [1.6, { ...HKNEEL, chest: [60, 0, 0], head: [40, 0, 0], armR: [-20, 0, -10], foreR: [-60, 0, 0], armL: [-30, 0, 10], foreL: [-60, 0, 0], root: [0, -60, 0] }, 'in'],
    [2.4, { ...HKNEEL, chest: [70, 0, 0], head: [44, 0, 0], armR: [-24, 0, -8], foreR: [-64, 0, 0], armL: [-34, 0, 8], foreL: [-64, 0, 0], root: [0, -64, 0] }],
  ]),
};

function hollowLoco(e, t, spd) {
  const br = S(t * 1.5 + e.phase * 0.1);
  if (e.state === 'bossIdle') {
    // de rodillas ante la cadena: reza y se golpea el pecho
    const r = S(t * 1.1);
    const beat = Math.max(0, S(t * 2.3)) ** 4;
    return rad({ ...HKNEEL, chest: [30 + r * 6 + beat * 6, 0, 0], head: [36 + r * 4, 0, 0], armL: [-50 - beat * 30, 0, 10], foreL: [-60 - beat * 40, 0, 0] });
  }
  const g = e.gait;
  const sw = g ? g.armSwing / DEG : 0;
  const run = g ? g.runW * g.mw : 0;
  const p2 = e.data.phase === 2 ? 1 : 0;
  return rad({ ...HB, chest: [HB.chest[0] + run * 10 + br * 2 + p2 * 6, 0, S(t * 0.7) * 3], head: [HB.head[0] - p2 * 6, S(t * 0.6) * 8, 0], armL: [HB.armL[0] + sw * 0.9, 0, HB.armL[2]] });
}

// ------------------------------------------------------------ lo que dice
function who(e) {
  if (!e.P.who) {
    const off = new V3(0, 0.45, 0);
    e.P.who = { id: 'paioHollow', name: 'Dom Paio', voice: 'npcTalk', pitch: 0.7, head: (out) => e.rig.worldPos('head', out, off) };
  }
  return e.P.who;
}
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function say(e, text, dur) {
  const sp = e.game.speech;
  if (sp) sp.say(who(e), text, { dur });
}

// ------------------------------------------------------------ los golpes
// La punta del cirial (la vela), en el mundo.
const TIP = new V3(0, -0.05, 1.3);
function tip(e, out) {
  return e.rig.worldPos('handR', out, TIP);
}
// Cera ardiendo: tres goterones en parábola hacia el jugador, con dispersión.
function waxShot(e, g) {
  const c = tip(e, e.P.v || (e.P.v = new V3()));
  const p = g.player;
  for (let i = 0; i < 3; i++) {
    const tx = p.pos.x + p.vx * 0.5 + (Math.random() - 0.5) * (1.2 + i * 1.2),
      tz = p.pos.z + p.vz * 0.5 + (Math.random() - 0.5) * (1.2 + i * 1.2);
    const T = 0.75 + i * 0.12;
    const grav = 13;
    const from = c.clone();
    const vel = new V3((tx - from.x) / T, (p.pos.y + 0.6 - from.y + 0.5 * grav * T * T) / T, (tz - from.z) / T);
    g.combat.projectiles.push({ kind: 'ember', pos: from, vel, grav, life: 3, dmg: 15, src: e, sprite: g.combat._orb(0xffa040, 1.1), core: g.combat._orb(0xfff0c0, 0.45), color: [1, 0.6, 0.2] });
  }
  g.audio && g.audio.play('fireWhoosh', c);
}
// La letanía: clava el cirial y la vela revienta en fuego alrededor.
function litanyBurst(e, g) {
  const c = tip(e, e.P.v || (e.P.v = new V3()));
  g.combat.fireBurst(c.x, e.pos.y, c.z, 3.6, 24, e);
}

const ATTACKS = [
  { name: 'smash', clip: HOLLOW_CLIPS.smash, dur: 1.55, min: 0, max: 2.8, hits: [[0.68, 0.8]], dmg: 26, range: 2.7, arc: 70, weight: 3, trackUntil: 0.58, turn: 3.2, events: [{ t: 0.7, name: 'swing', fn: (e, g) => g.audio && g.audio.play('swingHeavy', e.pos) }] },
  { name: 'sweep', clip: HOLLOW_CLIPS.sweep, dur: 1.6, min: 0, max: 2.8, hits: [[0.62, 0.78]], dmg: 21, range: 2.8, arc: 160, weight: 3, trackUntil: 0.5, turn: 3.2 },
  { name: 'thrust', clip: HOLLOW_CLIPS.thrust, dur: 1.6, min: 2.2, max: 6.5, hits: [[0.78, 0.94]], dmg: 25, range: 2.8, arc: 40, lunge: [[0.62, 0.92, 7]], weight: 2, trackUntil: 0.6, turn: 3 },
  { name: 'wax', clip: HOLLOW_CLIPS.wax, dur: 1.9, min: 4, max: 14, hits: [], weight: 1.6, noParry: true, trackUntil: 0.85, turn: 3, cond: (e) => e.game.time - (e.data.waxT ?? -99) > 6, onStart: (e) => (e.data.waxT = e.game.time), events: [{ t: 0.9, fn: waxShot }] },
  {
    name: 'litany',
    clip: HOLLOW_CLIPS.litany,
    dur: 2.5,
    min: 0,
    max: 4.2,
    hits: [],
    weight: 1.8,
    phase: 2,
    noParry: true,
    trackUntil: 1.0,
    turn: 2,
    cond: (e) => e.game.time - (e.data.litT ?? -99) > 9,
    onStart: (e) => {
      e.data.litT = e.game.time;
      if (Math.random() < 0.6) say(e, pick(DIALOG.paioLitany), 2.2);
    },
    events: [{ t: 1.36, fn: litanyBurst }],
  },
];

export const PAIO_HOLLOW_TYPE = {
  name: 'Dom Paio, el Condenado',
  title: 'Dom Paio',
  build: () => buildPaio(true),
  hp: 640,
  poise: 60,
  radius: 0.42,
  height: 1.8,
  lockHeight: 1.35,
  walk: 1.5,
  run: 3.7,
  runDist: 6,
  sight: 30,
  hear: 30,
  turn: 4.2,
  stride: 2.2,
  approach: 1.9,
  boss: true,
  introDur: 2.8,
  alertTime: 2.2,
  // (jefe menor: dos parrys seguidos para desequilibrarle)
  parryPosture: 2,
  parryDur: 1.6,
  clips: HOLLOW_CLIPS,
  voice: 'paio',
  attacks: ATTACKS,
  biped: { scale: 0.97, style: GAIT.shamble, stance: 0.08 },
  loco: hollowLoco,
  init: (e) => {
    // la vela del cirial (una luz que la sigue)
    e.P.light = e.game.fx.lights.add({ x: e.pos.x, y: e.pos.y + 2, z: e.pos.z, color: 0xff9a40, intensity: 0, range: 7, flicker: 0.4, priority: 2 });
  },
  onReset: (e) => {
    e.data.phase = 1;
    e.data.sayT = 8;
    e.data.litT = -99;
    e.data.waxT = -99;
    e.anim.speed = 1;
    if (e.game.speech && e.P.who) e.game.speech.hush(e.P.who);
  },
  onWake: (e, g) => {
    e.aware = true;
    e.state = 'alert';
    e.stT = 0;
    e.anim.play(HOLLOW_CLIPS.alert, { blend: 0.1 });
    if (g.speech) g.speech.queue(who(e), DIALOG.paioHollowIntro);
    e.data.sayT = 14;
  },
  update: (e, dt, player) => {
    const g = e.game;
    const t = g.time;
    // la vela del cirial: arde mientras vive (y más en la segunda forma)
    const lt = e.P.light;
    if (lt) {
      const c = tip(e, e.P.v3 || (e.P.v3 = new V3()));
      lt.x = c.x;
      lt.y = c.y + 0.2;
      lt.z = c.z;
      const want = e.dead ? 0 : e.obj.visible ? (e.data.phase === 2 ? 2.4 : 1.6) * (1 + S(t * 11) * 0.08) : 0;
      lt.intensity += (want - lt.intensity) * Math.min(1, dt * (e.dead ? 0.7 : 4));
    }
    if (e.dead) return;
    // la segunda forma: a la mitad de la vida se arranca la sobrepelliz y
    // reza a gritos (más deprisa, y la letanía)
    if (e.hp < e.maxHp * 0.5 && e.data.phase !== 2 && e.state !== 'attack' && e.state !== 'bossIdle' && e.aware) {
      e.data.phase = 2;
      e.data.litT = g.time - 6;
      say(e, DIALOG.paioHollowRage, 2.8);
      g.onBossPhase && g.onBossPhase(e);
    }
    if (e.data.phase === 2) e.anim.speed = e.state === 'attack' ? 1.12 : 1;
    // lo que dice mientras pelea (de vez en cuando)
    if (e.aware && e.state !== 'bossIdle') {
      e.data.sayT -= dt;
      if (e.data.sayT <= 0) {
        e.data.sayT = 10 + Math.random() * 8;
        if (!g.speech || !g.speech.busy(who(e))) say(e, pick(DIALOG.paioHollowFight), 2.6);
      }
    }
  },
  onHit: (e, r) => {
    if (r === 'kill' && e.game.speech) e.game.speech.say(who(e), DIALOG.paioHollowDeath, { dur: 4 });
  },
};

