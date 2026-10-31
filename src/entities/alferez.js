// El alférez mayor (PLAN_CASTILLO.md, §4.2 y §7): el que llevaba el pendón
// del Rey y mandaba la hueste cuando el Rey no estaba. Uno de los cinco de las
// llaves: le abrió la reja de la cripta al arzobispo con los otros cuatro, y
// cuando la corte fue a por el Rey, él se subió a la torre, al cadalso, con la
// ballesta de la guardia, como si todavía la defendiera. Ya no es un hombre:
// la cota se le ha metido en la carne y los ojos le arden bajo el nasal.
//
// Pelea a distancia: se planta lejos, se echa la ballesta a la cara, tira y
// la monta otra vez con el pie en el estribo (ahí está a merced). Si te le
// echas encima, culatazo. Lleva su llave al cinto: muerto, se queda en el
// suelo. No vuelve (spec.story / spec.dies: 'dead:alferez').
import { Rig, clip } from './rig.js';
import { humanoidJoints, feetParts } from './models.js';
import { ballestaParts } from './weapon_models.js';
import { DEG } from '../core/util.js';
import { GAIT } from './locomotion.js';

const S = Math.sin;
function rad(p) {
  const o = {};
  for (const k in p) o[k] = k === 'root' ? p[k].map((v) => v / 100) : p[k].map((v) => v * DEG);
  return o;
}

// ------------------------------------------------------------ el cuerpo
// Cota de malla hasta las rodillas y, encima, la sobreveste blanca con la
// cruz azul del Rey; yelmo cónico con nasal sobre el almófar; brazos y
// piernas de malla, guantes de cuero; el carcaj de virotes a la cadera; a la
// espalda, el asta rota del pendón con un jirón de su tela. La ballesta, en
// la mano derecha (a lo largo de +z de la mano).
export function buildAlferez() {
  const k = 1.04;
  const joints = humanoidJoints(k);
  joints.push({ name: 'pendon', parent: 'chest', pos: [0.14, 0.3, -0.2], rot: [-8, 0, -12] });
  const parts = [
    // la cadera: la malla, la sobreveste partida y el cinto con la llave
    { j: 'hips', type: 'box', s: [0.42, 0.42, 0.3], p: [0, -0.18, 0], taper: [1.18, 1.1], mat: 'chainmail' },
    { j: 'hips', type: 'box', s: [0.36, 0.62, 0.03], p: [0, -0.3, 0.16], taper: [1.16, 1], mat: 'clothWhite' },
    { j: 'hips', type: 'box', s: [0.36, 0.62, 0.03], p: [0, -0.3, -0.16], taper: [1.16, 1], mat: 'clothWhite' },
    { j: 'hips', type: 'box', s: [0.07, 0.5, 0.01], p: [0, -0.28, 0.177], mat: 'clothBlue' },
    { j: 'hips', type: 'box', s: [0.44, 0.07, 0.32], p: [0, 0.03, 0], mat: 'leather' },
    { j: 'hips', type: 'box', s: [0.05, 0.12, 0.012], p: [-0.12, -0.06, 0.17], mat: 'iron' },
    // el carcaj, a la derecha, con las plumas asomando
    { j: 'hips', type: 'box', s: [0.1, 0.36, 0.1], p: [-0.25, -0.12, -0.04], r: [-14, 0, 8], mat: 'leather' },
    { j: 'hips', type: 'box', s: [0.08, 0.08, 0.06], p: [-0.27, 0.1, -0.02], r: [-14, 0, 8], mat: 'clothWhite' },
    // el pecho: la malla, la sobreveste con su cruz, el almófar
    { j: 'chest', type: 'box', s: [0.48, 0.54, 0.31], p: [0, 0.26, 0], taper: [0.84, 0.92], mat: 'chainmail' },
    { j: 'chest', type: 'box', s: [0.46, 0.5, 0.025], p: [0, 0.24, 0.16], taper: [0.86, 0.95], mat: 'clothWhite' },
    { j: 'chest', type: 'box', s: [0.46, 0.5, 0.025], p: [0, 0.24, -0.16], taper: [0.86, 0.95], mat: 'clothWhite' },
    { j: 'chest', type: 'box', s: [0.08, 0.44, 0.01], p: [0, 0.24, 0.177], mat: 'clothBlue' },
    { j: 'chest', type: 'box', s: [0.34, 0.07, 0.01], p: [0, 0.32, 0.177], mat: 'clothBlue' },
    { j: 'chest', type: 'cyl', s: [0.13, 0.16, 0.14], p: [0, 0.55, 0], mat: 'chainmail' },
    // la infección, que revienta la malla por el costado
    { j: 'chest', type: 'ico', s: [0.12, 0.1, 0.09], p: [-0.18, 0.14, 0.12], mat: 'flesh' },
    { j: 'chest', type: 'ico', s: [0.07], p: [0.2, 0.42, -0.1], mat: 'flesh' },
    // la cabeza: el almófar, la cara gris, los ojos que arden, el yelmo y el nasal
    { j: 'head', type: 'cyl', s: [0.135, 0.15, 0.24], p: [0, 0.1, 0], seg: 8, mat: 'chainmail' },
    { j: 'head', type: 'box', s: [0.15, 0.13, 0.03], p: [0, 0.12, 0.12], mat: 'skinCorrupt' },
    { j: 'head', type: 'sphere', s: [0.022], p: [-0.04, 0.155, 0.137], mat: 'eyeGlow' },
    { j: 'head', type: 'sphere', s: [0.022], p: [0.04, 0.155, 0.137], mat: 'eyeGlow' },
    { j: 'head', type: 'cone', s: [0.16, 0.2], p: [0, 0.31, 0], seg: 8, mat: 'plate' },
    { j: 'head', type: 'cyl', s: [0.158, 0.158, 0.04], p: [0, 0.22, 0], seg: 8, mat: 'iron' },
    { j: 'head', type: 'box', s: [0.03, 0.12, 0.02], p: [0, 0.16, 0.152], mat: 'iron' },
    // brazos de malla y guantes
    { j: 'armL', type: 'box', s: [0.14, 0.32, 0.14], p: [0, -0.15, 0], taper: [0.86, 0.86], mat: 'chainmail' },
    { j: 'foreL', type: 'box', s: [0.12, 0.28, 0.12], p: [0, -0.13, 0], taper: [0.85, 0.85], mat: 'chainmail' },
    { j: 'handL', type: 'box', s: [0.09, 0.1, 0.1], p: [0, -0.05, 0.01], mat: 'leather' },
    { j: 'armR', type: 'box', s: [0.14, 0.32, 0.14], p: [0, -0.15, 0], taper: [0.86, 0.86], mat: 'chainmail' },
    { j: 'foreR', type: 'box', s: [0.12, 0.28, 0.12], p: [0, -0.13, 0], taper: [0.85, 0.85], mat: 'chainmail' },
    { j: 'handR', type: 'box', s: [0.09, 0.1, 0.1], p: [0, -0.05, 0.01], mat: 'leather' },
    ...ballestaParts('handR'),
    // el asta rota del pendón, a la espalda, con su jirón
    { j: 'pendon', type: 'cyl', s: [0.022, 0.022, 1.3], p: [0, 0.45, 0], seg: 5, mat: 'wooddark' },
    { j: 'pendon', type: 'box', s: [0.42, 0.5, 0.012], p: [-0.22, 0.85, 0], taper: [1, 0.7], mat: 'clothWhite' },
    { j: 'pendon', type: 'box', s: [0.06, 0.48, 0.014], p: [-0.22, 0.85, 0], mat: 'clothBlue' },
    { j: 'pendon', type: 'box', s: [0.38, 0.06, 0.014], p: [-0.22, 0.95, 0], mat: 'clothBlue' },
    // piernas de malla y botas
    { j: 'legL', type: 'box', s: [0.17, 0.46, 0.18], p: [0, -0.22, 0], taper: [0.8, 0.85], mat: 'chainmail' },
    { j: 'shinL', type: 'box', s: [0.14, 0.42, 0.15], p: [0, -0.2, 0], taper: [0.9, 0.9], mat: 'chainmail' },
    { j: 'legR', type: 'box', s: [0.17, 0.46, 0.18], p: [0, -0.22, 0], taper: [0.8, 0.85], mat: 'chainmail' },
    { j: 'shinR', type: 'box', s: [0.14, 0.42, 0.15], p: [0, -0.2, 0], taper: [0.9, 0.9], mat: 'chainmail' },
    ...feetParts(k, 'leather', { w: 0.12, h: 0.08, l: 0.25 }),
  ];
  return new Rig({ joints, parts });
}

// ------------------------------------------------------------ poses y clips
// La ballesta a la cadera, la cabeza hacia el suelo (la izquierda la sostiene
// por delante).
const BASE = { chest: [6, 0, 0], head: [-2, 0, 0], armR: [-28, 0, -10], foreR: [-58, 0, 0], handR: [32, 0, 0], armL: [-44, 0, 22], foreL: [-62, 0, 0], handL: [0, 0, 0] };
// a la cara: los dos brazos al frente, la cureña a nivel, la cabeza ladeada
const AIM = { chest: [0, -10, 0], head: [6, 8, 4], armR: [-84, 0, -14], foreR: [-22, 0, 0], handR: [72, 0, 6], armL: [-82, 0, 34], foreL: [-38, 0, 0], handL: [0, 0, 0] };
const KICK = { ...AIM, chest: [-7, -10, 0], head: [0, 8, 4], armR: [-92, 0, -14], foreR: [-30, 0, 0] };
// montarla: agachado, la cabeza al suelo y el pie en el estribo
const SPAN = { root: [0, -24, 0], legL: [-44, 0, 6], shinL: [66, 0, 0], legR: [-6, 0, -8], shinR: [20, 0, 0], chest: [40, 0, 0], head: [16, 0, 0], armR: [-36, 0, -8], foreR: [-46, 0, 0], handR: [-46, 0, 0], armL: [-58, 0, 14], foreL: [-48, 0, 0], handL: [0, 0, 0] };
const PULL = { ...SPAN, root: [0, -12, 0], chest: [22, 0, 0], head: [6, 0, 0], armL: [-34, 0, 18], foreL: [-96, 0, 0] };

export const ALF_CLIPS = {
  alert: clip('alf_alert', 0.9, [
    [0, { ...BASE }],
    [0.3, { ...BASE, chest: [-10, 0, 0], head: [-18, 0, 10] }, 'snap'],
    [0.9, { ...BASE }],
  ]),
  // tirar y montarla: se la echa a la cara, tira, la baja, la monta (el pie
  // en el estribo, las manos a la cuerda) y se levanta
  shoot: clip('alf_shoot', 3.1, [
    [0, { ...BASE }],
    [0.45, { ...AIM }],
    [0.9, { ...AIM, head: [7, 9, 4] }],
    [0.95, { ...KICK }, 'snap'],
    [1.25, { ...AIM }],
    [1.6, { ...SPAN }],
    [2.05, { ...SPAN, armL: [-46, 0, 16], foreL: [-70, 0, 0] }],
    [2.5, { ...PULL }],
    [3.1, { ...BASE }],
  ]),
  // culatazo: la cabeza de hierro de la ballesta por delante
  bash: clip('alf_bash', 1.2, [
    [0, { ...BASE }],
    [0.36, { chest: [0, -32, 0], head: [0, 14, 0], armR: [-62, 0, -40], foreR: [-70, 0, 0], handR: [40, 0, 0], armL: [-60, 0, 30], foreL: [-50, 0, 0], legL: [16, 0, 0], legR: [-18, 0, 0], shinR: [18, 0, 0] }],
    [0.5, { chest: [16, 26, 0], head: [-6, -12, 0], armR: [-92, 0, 8], foreR: [-8, 0, 0], handR: [80, 0, 0], armL: [-80, 0, 30], foreL: [-30, 0, 0], legL: [-36, 0, 0], shinL: [36, 0, 0], legR: [26, 0, 0], root: [0, -10, 0] }, 'snap'],
    [0.82, { chest: [14, 24, 0], armR: [-88, 0, 6], foreR: [-12, 0, 0], handR: [76, 0, 0], armL: [-76, 0, 28], foreL: [-34, 0, 0], legL: [-34, 0, 0], shinL: [34, 0, 0], legR: [24, 0, 0], root: [0, -9, 0] }],
    [1.2, { ...BASE }],
  ]),
  hurt: clip('alf_hurt', 0.5, [
    [0, { ...BASE, chest: [-24, 14, 0], head: [-22, 0, 0], armL: [-30, 0, 40], root: [0, -5, -8] }, 'snap'],
    [0.5, { ...BASE }],
  ]),
  stagger: clip('alf_stagger', 1.4, [
    [0, { chest: [-30, -20, 0], head: [-30, 0, 0], armL: [-20, 0, 60], armR: [-20, 0, -60], root: [0, -8, -12], legL: [-20, 0, 0], shinL: [40, 0, 0] }, 'snap'],
    [0.7, { chest: [40, 0, 0], head: [20, 0, 0], armL: [0, 0, 20], armR: [0, 0, -20], root: [0, -40, 0], legL: [-60, 0, 0], shinL: [100, 0, 0], legR: [-20, 0, 0], shinR: [100, 0, 0] }],
    [1.4, { ...BASE }],
  ]),
  parried: clip('alf_parried', 1.5, [
    [0, { chest: [-30, 22, 0], head: [-30, 0, -15], armR: [-150, 0, -70], foreR: [-20, 0, 0], handR: [50, 0, 0], armL: [-60, 0, 80], foreL: [-30, 0, 0], root: [0, -6, -16], legL: [-26, 0, 0], shinL: [36, 0, 0], legR: [20, 0, 0], shinR: [20, 0, 0] }, 'snap'],
    [0.85, { chest: [-8, 8, 0], head: [-14, 0, -6], armR: [-80, 0, -36], foreR: [-40, 0, 0], handR: [42, 0, 0], armL: [-46, 0, 46], foreL: [-50, 0, 0], root: [0, -12, -10], legL: [-30, 0, 0], shinL: [48, 0, 0], legR: [14, 0, 0], shinR: [24, 0, 0] }],
    [1.5, { ...BASE }],
  ]),
  // cae de rodillas y luego de bruces, con la ballesta debajo
  death: clip('alf_death', 1.6, [
    [0, { ...BASE, chest: [-18, 10, 0], head: [-20, 0, 0] }, 'snap'],
    [0.5, { root: [0, -46, 0], legL: [-96, 0, 6], shinL: [110, 0, 0], legR: [-90, 0, -6], shinR: [110, 0, 0], chest: [20, 0, 0], head: [24, 0, 0], armR: [-20, 0, -10], foreR: [-40, 0, 0], armL: [-20, 0, 12], foreL: [-30, 0, 0] }],
    [1.1, { root: [0, -82, 30], legL: [-60, 0, 6], shinL: [70, 0, 0], legR: [-56, 0, -6], shinR: [70, 0, 0], chest: [70, 0, 0], head: [20, 0, 10], armR: [-150, 0, -30], foreR: [-20, 0, 0], armL: [-140, 0, 30], foreL: [-20, 0, 0] }],
    [1.6, { root: [0, -86, 40], legL: [-20, 0, 6], shinL: [20, 0, 0], legR: [-18, 0, -6], shinR: [20, 0, 0], chest: [86, 0, 0], head: [10, 0, 20], armR: [-170, 0, -40], foreR: [-10, 0, 0], armL: [-160, 0, 40], foreL: [-10, 0, 0] }],
  ]),
};

function idlePose(e, kind, t) {
  const br = S(t * 1.4 + e.phase) * 2;
  // de guardia en su garita: la ballesta a la cara, vigilando el foso
  if (kind === 'watch') return rad({ ...AIM, chest: [AIM.chest[0] + br * 0.5, -10 + S(t * 0.3) * 14, 0], head: [6, 8 + S(t * 0.3) * 10, 4] });
  return rad({ ...BASE, chest: [6 + br, 0, S(t * 0.6) * 2], head: [-2 + S(t * 0.4) * 4, S(t * 0.33) * 14, 0] });
}

function loco(e, t) {
  const g = e.gait;
  const sw = g ? g.armSwing / DEG : 0;
  const br = S(t * 1.6 + e.phase * 0.1);
  return rad({ ...BASE, chest: [BASE.chest[0] + br * 2, 0, 0], armL: [BASE.armL[0] + sw * 0.4, BASE.armL[1], BASE.armL[2]], armR: [BASE.armR[0] - sw * 0.2, BASE.armR[1], BASE.armR[2]] });
}

export const ALFEREZ_TYPE = {
  name: 'El alférez',
  build: buildAlferez,
  hp: 190,
  poise: 52,
  radius: 0.42,
  height: 1.88,
  lockHeight: 1.45,
  walk: 1.5,
  run: 3.3,
  runDist: 7,
  sight: 24,
  fov: 140,
  hear: 6,
  turn: 5,
  stride: 2.3,
  // (se queda lejos: tira desde ahí)
  approach: 8.5,
  leash: 30,
  parryDur: 1.6,
  clips: ALF_CLIPS,
  voice: 'soldier',
  attacks: [
    {
      name: 'shoot',
      clip: ALF_CLIPS.shoot,
      dur: 3.1,
      min: 2.6,
      max: 26,
      hits: [],
      weight: 4,
      trackUntil: 0.92,
      turn: 6,
      cd: 0.5,
      events: [{ t: 0.95, fn: (e, g) => g.virotes && g.virotes.enemyShoot(e, { dmg: 28, h: 1.5 }) }],
    },
    { name: 'bash', clip: ALF_CLIPS.bash, dur: 1.2, min: 0, max: 2.4, hits: [[0.48, 0.62]], dmg: 22, stDmg: 30, range: 2.1, arc: 90, lunge: [[0.42, 0.56, 3.2]], weight: 3, cd: 0.6 },
  ],
  biped: { scale: 1.04, style: GAIT.soldier, stance: 0.12 },
  loco,
  idlePose,
};
