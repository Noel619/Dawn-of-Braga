// Los Velados: los dos guardianes de piedra de la Puerta del Dios Ignoto.
//
// Dos estatuas colosales de caliza oscura, con el rostro cubierto por un velo
// de piedra y grietas por las que asoma una brasa. Esperan a los lados de la
// puerta, en lo alto del estrado; al cruzar la niebla de la escalinata se
// despiertan los dos a la vez. El de la Espada (a la izquierda de la puerta)
// barre y estoca con un mandoble de piedra; el del Martillo golpea el suelo y
// embiste. No se turnan como en un duelo: si uno ataca, el otro rodea, pero
// cuando cae uno el otro enloquece (más rápido, más golpes, y su golpe de
// furia).
//
// Van emparejados: el juego los trata como un solo jefe (una barra con la
// vida de los dos) y la pelea no acaba hasta que caen ambos (game.js).
import { Rig, clip } from './rig.js';
import { humanoidJoints, feetParts } from './models.js';
import { GAIT } from './locomotion.js';
import { DEG, clamp, angleDiff, approachAngle } from '../core/util.js';

const S = Math.sin;
const K = 1.72; // escala (unos tres metros)

function rad(p) {
  const o = {};
  for (const k in p) o[k] = k === 'root' ? p[k].map((v) => v / 100) : p[k].map((v) => v * DEG);
  return o;
}

// ------------------------------------------------------------ el cuerpo
function body(kind) {
  const joints = humanoidJoints(K);
  const G = 'stoneGuard',
    R = 'ashlar';
  const k = K;
  const parts = [
    // la túnica larga, de pliegues, hasta los tobillos
    { j: 'hips', type: 'box', s: [0.46 * k, 0.12 * k, 0.32 * k], p: [0, 0.02 * k, 0], mat: G },
    { j: 'hips', type: 'box', s: [0.5 * k, 0.6 * k, 0.36 * k], p: [0, -0.3 * k, 0], taper: [1.25, 1.2], mat: G },
    { j: 'legL', type: 'box', s: [0.24 * k, 0.5 * k, 0.26 * k], p: [0, -0.22 * k, 0], taper: [1.1, 1.05], mat: G },
    { j: 'legR', type: 'box', s: [0.24 * k, 0.5 * k, 0.26 * k], p: [0, -0.22 * k, 0], taper: [1.1, 1.05], mat: G },
    { j: 'shinL', type: 'box', s: [0.2 * k, 0.44 * k, 0.22 * k], p: [0, -0.2 * k, 0], taper: [1.2, 1.15], mat: G },
    { j: 'shinR', type: 'box', s: [0.2 * k, 0.44 * k, 0.22 * k], p: [0, -0.2 * k, 0], taper: [1.2, 1.15], mat: G },
    // el pecho, el manto sobre los hombros y el cordón
    { j: 'chest', type: 'box', s: [0.5 * k, 0.56 * k, 0.32 * k], p: [0, 0.27 * k, 0], taper: [0.86, 0.94], mat: G },
    { j: 'chest', type: 'box', s: [0.62 * k, 0.2 * k, 0.38 * k], p: [0, 0.47 * k, -0.01 * k], taper: [1.1, 1], mat: G },
    { j: 'chest', type: 'box', s: [0.58 * k, 0.5 * k, 0.06 * k], p: [0, 0.22 * k, -0.17 * k], taper: [1.15, 1], mat: G },
    { j: 'chest', type: 'box', s: [0.5 * k, 0.035 * k, 0.33 * k], p: [0, 0.02 * k, 0], mat: R },
    // la cabeza, cubierta del todo por el velo: sin cara, con dos grietas
    // encendidas donde estarían los ojos
    { j: 'head', type: 'sphere', s: [0.15 * k, 0.17 * k, 0.15 * k], p: [0, 0.13 * k, 0.01 * k], seg: 8, seg2: 6, mat: G },
    { j: 'head', type: 'cyl', s: [0.17 * k, 0.24 * k, 0.32 * k], p: [0, 0.05 * k, -0.01 * k], seg: 8, mat: G },
    { j: 'head', type: 'box', s: [0.05 * k, 0.012 * k, 0.01 * k], p: [-0.055 * k, 0.15 * k, 0.15 * k], r: [0, 0, 12], mat: 'eyeGlow' },
    { j: 'head', type: 'box', s: [0.05 * k, 0.012 * k, 0.01 * k], p: [0.055 * k, 0.15 * k, 0.15 * k], r: [0, 0, -12], mat: 'eyeGlow' },
    // los brazos en sus mangas anchas
    { j: 'armL', type: 'box', s: [0.18 * k, 0.34 * k, 0.18 * k], p: [0, -0.15 * k, 0], taper: [1.15, 1.15], mat: G },
    { j: 'foreL', type: 'box', s: [0.2 * k, 0.28 * k, 0.2 * k], p: [0, -0.12 * k, 0], taper: [1.3, 1.3], mat: G },
    { j: 'handL', type: 'box', s: [0.11 * k, 0.12 * k, 0.11 * k], p: [0, -0.05 * k, 0.01 * k], mat: R },
    { j: 'armR', type: 'box', s: [0.18 * k, 0.34 * k, 0.18 * k], p: [0, -0.15 * k, 0], taper: [1.15, 1.15], mat: G },
    { j: 'foreR', type: 'box', s: [0.2 * k, 0.28 * k, 0.2 * k], p: [0, -0.12 * k, 0], taper: [1.3, 1.3], mat: G },
    { j: 'handR', type: 'box', s: [0.11 * k, 0.12 * k, 0.11 * k], p: [0, -0.05 * k, 0.01 * k], mat: R },
    ...feetParts(K, G, { w: 0.13, h: 0.09, l: 0.27 }),
  ];
  const y = -0.05 * k;
  if (kind === 'sword') {
    // el mandoble de piedra (hoja hacia +z de la mano derecha)
    parts.push(
      { j: 'handR', type: 'cyl', s: [0.03 * k, 0.034 * k, 0.32 * k], p: [0, y, 0.02 * k], r: [90, 0, 0], seg: 6, mat: R },
      { j: 'handR', type: 'box', s: [0.5 * k, 0.06 * k, 0.07 * k], p: [0, y, 0.2 * k], mat: G },
      { j: 'handR', type: 'ico', s: [0.06 * k], p: [0, y, -0.16 * k], mat: R },
      { j: 'handR', type: 'box', s: [0.025 * k, 0.15 * k, 1.25 * k], p: [0, y, 0.86 * k], taper: [1, 1], mat: G },
      { j: 'handR', type: 'box', s: [0.03 * k, 0.04 * k, 1.2 * k], p: [0, y, 0.84 * k], mat: 'stoneGuard' }
    );
  } else {
    // el martillo: un mango largo y una cabeza de sillar con sus aristas
    parts.push(
      { j: 'handR', type: 'cyl', s: [0.035 * k, 0.04 * k, 1.1 * k], p: [0, y, 0.25 * k], r: [90, 0, 0], seg: 6, mat: R },
      { j: 'handR', type: 'box', s: [0.42 * k, 0.26 * k, 0.26 * k], p: [0, y, 0.84 * k], mat: G },
      { j: 'handR', type: 'box', s: [0.46 * k, 0.08 * k, 0.3 * k], p: [0, y, 0.84 * k], mat: R },
      { j: 'handR', type: 'box', s: [0.08 * k, 0.3 * k, 0.3 * k], p: [0.21 * k, y, 0.84 * k], mat: R },
      { j: 'handR', type: 'box', s: [0.08 * k, 0.3 * k, 0.3 * k], p: [-0.21 * k, y, 0.84 * k], mat: R }
    );
  }
  return new Rig({ joints, parts });
}

// ------------------------------------------------------------ poses y clips
// en pie, de estatua: el arma vertical delante, la cabeza baja
const STATUE = { chest: [6, 0, 0], head: [22, 0, 0], armR: [-38, 0, -6], foreR: [-58, 0, 0], handR: [-30, 0, 0], armL: [-34, 0, 8], foreL: [-62, 0, 0], handL: [0, 0, 0] };
// en guardia
const GD = { chest: [10, -14, 0], head: [6, 12, 0], armR: [-46, 0, -18], foreR: [-48, 0, 0], handR: [30, 0, 0], armL: [-40, 0, 22], foreL: [-60, 0, 0], handL: [0, 0, 0] };

function clips(kind) {
  const C = {
    // despierta: se le resquebraja la piedra, alza la cabeza y adelanta el arma
    alert: clip('alert', 3.0, [
      [0, { ...STATUE }],
      [0.9, { ...STATUE, chest: [-4, 0, 0], head: [-14, 0, 0] }, 'snap'],
      [1.6, { ...GD, chest: [-10, -20, 0], head: [-24, 10, 0], armR: [-110, 0, -40], foreR: [-30, 0, 0] }],
      [2.4, { ...GD, chest: [14, -10, 0], armR: [-60, 0, -20] }],
      [3.0, { ...GD }],
    ]),
    hurt: clip('hurt', 0.5, [
      [0, { ...GD, chest: [-14, 16, 6], head: [-18, 0, 10] }, 'snap'],
      [0.5, { ...GD }],
    ]),
    stagger: clip('stagger', 1.5, [
      [0, { ...GD, chest: [-24, -18, 0], head: [-30, 0, 0], armL: [-20, 0, 60], armR: [-30, 0, -60], root: [0, -10, -14] }, 'snap'],
      [0.75, { chest: [34, 0, 0], head: [20, 0, 0], armR: [-40, 0, -20], foreR: [-30, 0, 0], root: [0, -44, 0], legL: [-70, 0, 0], shinL: [104, 0, 0], legR: [-24, 0, 0], shinR: [98, 0, 0] }],
      [1.5, { ...GD }],
    ]),
    // se viene abajo: de rodillas y se parte (la piedra cae)
    death: clip('death', 2.4, [
      [0, { ...GD, chest: [-20, 0, 0], head: [-30, 0, 0] }, 'snap'],
      [0.7, { chest: [30, 0, 10], head: [34, 0, 0], root: [0, -50, 0], legL: [-96, 0, 5], shinL: [104, 0, 0], legR: [-96, 0, -5], shinR: [104, 0, 0], armL: [-30, 0, 20], armR: [-50, 0, -20], foreR: [-40, 0, 0] }],
      [1.6, { hips: [70, 0, 6], chest: [20, 0, 10], head: [30, 20, 0], root: [0, -78, 0], armL: [-140, 0, 30], armR: [-60, 0, -40], legL: [-10, 0, 5], legR: [-5, 0, -5] }, 'in'],
      [2.4, { hips: [84, 0, 8], chest: [10, 0, 10], head: [30, 20, 0], root: [0, -86, 0], armL: [-150, 0, 30], armR: [-60, 0, -40], legL: [-4, 0, 5], legR: [-4, 0, -5] }],
    ]),
  };
  if (kind === 'sword') {
    Object.assign(C, {
      // de arriba abajo, con la hoja contra el suelo (onda)
      overhead: clip(
        'overhead',
        2.3,
        [
          [0, { ...GD }],
          [0.85, { ...GD, chest: [-16, -8, 0], head: [-14, 0, 0], armR: [-170, 0, -10], foreR: [-40, 0, 0], handR: [60, 0, 0], armL: [-160, 0, 14], foreL: [-46, 0, 0] }, 'hold'],
          [1.05, { ...GD, chest: [40, 0, 0], head: [-20, 0, 0], armR: [-60, 0, 4], foreR: [-6, 0, 0], handR: [80, 0, 0], armL: [-58, 0, 6], foreL: [-10, 0, 0], root: [0, -14, 10] }, 'snap'],
          [1.6, { ...GD, chest: [36, 0, 0], armR: [-56, 0, 4], foreR: [-8, 0, 0], handR: [78, 0, 0], armL: [-54, 0, 6], root: [0, -12, 8] }],
          [2.3, { ...GD }],
        ],
        { events: [{ t: 0.9, name: 'swing' }] }
      ),
      // barrido de lado a lado, a la altura de la cintura
      sweep: clip(
        'sweep',
        1.9,
        [
          [0, { ...GD }],
          [0.7, { ...GD, chest: [6, 60, 0], head: [-6, -30, 0], armR: [-84, 0, 96], foreR: [-20, 0, 0], handR: [70, 0, 30] }, 'hold'],
          [0.92, { ...GD, chest: [12, -56, 0], head: [-6, 30, 0], armR: [-88, 0, -86], foreR: [-6, 0, 0], handR: [86, 0, -30], root: [0, -8, 0] }, 'snap'],
          [1.3, { ...GD, chest: [10, -60, 0], armR: [-80, 0, -92], foreR: [-12, 0, 0], handR: [80, 0, -32] }],
          [1.9, { ...GD }],
        ],
        { events: [{ t: 0.74, name: 'swing' }] }
      ),
      // estocada larga, con un paso
      thrust: clip(
        'thrust',
        1.7,
        [
          [0, { ...GD }],
          [0.6, { ...GD, chest: [-6, -34, 0], armR: [-40, 0, -34], foreR: [-120, 0, 0], handR: [10, 0, 0], legL: [16, 0, 0], legR: [-14, 0, 0] }, 'hold'],
          [0.78, { ...GD, chest: [20, 12, 0], armR: [-88, 0, 0], foreR: [0, 0, 0], handR: [90, 0, 0], legL: [-40, 0, 0], shinL: [42, 0, 0], legR: [30, 0, 0], root: [0, -12, 0] }, 'snap'],
          [1.15, { ...GD, chest: [18, 10, 0], armR: [-86, 0, 0], foreR: [-4, 0, 0], handR: [88, 0, 0], legL: [-40, 0, 0], shinL: [42, 0, 0], legR: [30, 0, 0], root: [0, -12, 0] }],
          [1.7, { ...GD }],
        ],
        { events: [{ t: 0.62, name: 'swing' }] }
      ),
      // la furia (sin el otro): tres tajos seguidos
      fury: clip(
        'fury',
        2.8,
        [
          [0, { ...GD }],
          [0.45, { ...GD, chest: [6, 56, 0], armR: [-84, 0, 92], foreR: [-20, 0, 0], handR: [70, 0, 30] }, 'hold'],
          [0.6, { ...GD, chest: [12, -52, 0], armR: [-88, 0, -84], foreR: [-6, 0, 0], handR: [86, 0, -30] }, 'snap'],
          [1.1, { ...GD, chest: [8, -50, 0], armR: [-80, 0, -90], handR: [70, 0, -30] }, 'hold'],
          [1.26, { ...GD, chest: [12, 50, 0], armR: [-88, 0, 84], foreR: [-6, 0, 0], handR: [86, 0, 30] }, 'snap'],
          [1.75, { ...GD, chest: [-16, 0, 0], armR: [-172, 0, -8], foreR: [-40, 0, 0], handR: [60, 0, 0], armL: [-160, 0, 12] }, 'hold'],
          [1.95, { ...GD, chest: [42, 0, 0], armR: [-58, 0, 4], foreR: [-6, 0, 0], handR: [80, 0, 0], armL: [-56, 0, 6], root: [0, -14, 10] }, 'snap'],
          [2.8, { ...GD }],
        ],
        { events: [0.5, 1.15, 1.8].map((t) => ({ t, name: 'swing' })) }
      ),
    });
  } else {
    Object.assign(C, {
      // el martillazo contra el suelo: onda grande
      smash: clip(
        'smash',
        2.5,
        [
          [0, { ...GD }],
          [1.0, { ...GD, chest: [-20, 10, 0], head: [-16, 0, 0], armR: [-176, 0, -6], foreR: [-30, 0, 0], handR: [40, 0, 0], armL: [-168, 0, 10], foreL: [-36, 0, 0], root: [0, 4, -6] }, 'hold'],
          [1.2, { ...GD, chest: [46, 0, 0], head: [-24, 0, 0], armR: [-54, 0, 6], foreR: [-4, 0, 0], handR: [86, 0, 0], armL: [-52, 0, 8], foreL: [-6, 0, 0], root: [0, -18, 12] }, 'snap'],
          [1.8, { ...GD, chest: [42, 0, 0], armR: [-52, 0, 6], foreR: [-6, 0, 0], handR: [84, 0, 0], armL: [-50, 0, 8], root: [0, -16, 10] }],
          [2.5, { ...GD }],
        ],
        { events: [{ t: 1.02, name: 'swing' }] }
      ),
      // de lado, con todo el peso
      swing: clip(
        'swing',
        2.1,
        [
          [0, { ...GD }],
          [0.8, { ...GD, chest: [0, 64, 0], head: [-6, -30, 0], armR: [-90, 0, 100], foreR: [-16, 0, 0], handR: [70, 0, 30], armL: [-70, 0, 40] }, 'hold'],
          [1.02, { ...GD, chest: [14, -60, 0], head: [-6, 30, 0], armR: [-92, 0, -88], foreR: [-4, 0, 0], handR: [86, 0, -30], armL: [-60, 0, -10], root: [0, -8, 0] }, 'snap'],
          [1.45, { ...GD, chest: [12, -62, 0], armR: [-84, 0, -94], handR: [80, 0, -32] }],
          [2.1, { ...GD }],
        ],
        { events: [{ t: 0.84, name: 'swing' }] }
      ),
      // embestida con el hombro (corre unos metros)
      charge: clip('charge', 2.2, [
        [0, { ...GD }],
        [0.5, { ...GD, chest: [30, -40, 0], head: [-20, 30, 0], armR: [-20, 0, -30], armL: [-60, 0, 50], root: [0, -14, -8] }, 'hold'],
        [0.7, { ...GD, chest: [40, -50, 0], head: [-24, 34, 0], armR: [-16, 0, -26], armL: [-70, 0, 60], root: [0, -16, 8] }],
        [1.5, { ...GD, chest: [40, -50, 0], head: [-24, 34, 0], armR: [-16, 0, -26], armL: [-70, 0, 60], root: [0, -16, 8] }],
        [2.2, { ...GD }],
      ]),
      // la furia (sin el otro): martillazos encadenados
      fury: clip(
        'fury',
        3.0,
        [
          [0, { ...GD }],
          [0.6, { ...GD, armR: [-176, 0, -6], foreR: [-30, 0, 0], armL: [-168, 0, 10], chest: [-18, 0, 0] }, 'hold'],
          [0.78, { ...GD, chest: [44, 0, 0], armR: [-54, 0, 6], foreR: [-4, 0, 0], handR: [86, 0, 0], armL: [-52, 0, 8], root: [0, -18, 12] }, 'snap'],
          [1.4, { ...GD, armR: [-176, 0, -6], foreR: [-30, 0, 0], armL: [-168, 0, 10], chest: [-18, 0, 0] }, 'hold'],
          [1.58, { ...GD, chest: [44, 0, 0], armR: [-54, 0, 6], foreR: [-4, 0, 0], handR: [86, 0, 0], armL: [-52, 0, 8], root: [0, -18, 12] }, 'snap'],
          [2.2, { ...GD, armR: [-176, 0, -6], foreR: [-30, 0, 0], armL: [-168, 0, 10], chest: [-18, 0, 0] }, 'hold'],
          [2.38, { ...GD, chest: [46, 0, 0], armR: [-54, 0, 6], foreR: [-4, 0, 0], handR: [86, 0, 0], armL: [-52, 0, 8], root: [0, -20, 14] }, 'snap'],
          [3.0, { ...GD }],
        ],
        { events: [0.62, 1.42, 2.22].map((t) => ({ t, name: 'swing' })) }
      ),
    });
  }
  return C;
}

const SW = clips('sword'),
  HM = clips('hammer');

// golpe contra el suelo: la onda, polvo de piedra y el temblor
const quake = (t, r, dmg, d = 2.2) => ({
  t,
  fn: (e, g) => {
    const x = e.pos.x + Math.sin(e.yaw) * d,
      z = e.pos.z + Math.cos(e.yaw) * d;
    g.combat.shockwave(x, e.pos.y, z, r, dmg, e, 9);
    g.fx.blood.emit(x, e.pos.y + 0.3, z, 30, { color: [0.36, 0.33, 0.3], speed: 5, life: 0.9, up: 2.4 });
    g.fx.blood.emit(x, e.pos.y + 0.2, z, 10, { color: [1, 0.45, 0.15], speed: 4, life: 0.5, up: 2 });
  },
});

const ATTACKS = {
  sword: [
    { name: 'overhead', clip: SW.overhead, dur: 2.3, min: 0, max: 4.6, hits: [[1.02, 1.16]], dmg: 36, range: 4.4, arc: 50, weight: 3, noParry: true, trackUntil: 0.85, turn: 1.8, events: [quake(1.06, 2.8, 16, 3.6)] },
    { name: 'sweep', clip: SW.sweep, dur: 1.9, min: 0, max: 4.2, hits: [[0.86, 1.04]], dmg: 28, range: 4.2, arc: 170, weight: 3, trackUntil: 0.7, turn: 2.0 },
    { name: 'thrust', clip: SW.thrust, dur: 1.7, min: 2.4, max: 6.5, hits: [[0.76, 0.9]], dmg: 30, range: 4.6, arc: 30, weight: 2, lunge: [[0.66, 0.9, 7]], trackUntil: 0.62, turn: 2.4 },
    {
      name: 'fury',
      clip: SW.fury,
      dur: 2.8,
      min: 0,
      max: 4.4,
      hits: [
        [0.56, 0.68],
        [1.22, 1.34],
        [1.93, 2.06],
      ],
      dmg: 26,
      range: 4.3,
      arc: 150,
      weight: 3,
      noParry: true,
      trackUntil: 1.7,
      turn: 2.6,
      cond: (e) => !!e.data.enraged,
      events: [quake(1.96, 2.6, 14, 3.4)],
    },
  ],
  hammer: [
    { name: 'smash', clip: HM.smash, dur: 2.5, min: 0, max: 4.4, hits: [[1.18, 1.3]], dmg: 40, range: 4.0, arc: 60, weight: 3, noParry: true, trackUntil: 1.0, turn: 1.8, events: [quake(1.2, 3.8, 22, 3.2)] },
    { name: 'swing', clip: HM.swing, dur: 2.1, min: 0, max: 4.0, hits: [[0.98, 1.16]], dmg: 30, range: 4.0, arc: 160, weight: 3, trackUntil: 0.8, turn: 2.0 },
    { name: 'charge', clip: HM.charge, dur: 2.2, min: 4.5, max: 13, hits: [[0.72, 1.5]], dmg: 30, range: 2.2, arc: 70, weight: 2, noParry: true, lunge: [[0.62, 1.55, 8.5]], trackUntil: 0.6, turn: 1.4, stDmg: 70 },
    {
      name: 'fury',
      clip: HM.fury,
      dur: 3.0,
      min: 0,
      max: 4.4,
      hits: [
        [0.76, 0.88],
        [1.56, 1.68],
        [2.36, 2.48],
      ],
      dmg: 30,
      range: 4.0,
      arc: 70,
      weight: 3,
      noParry: true,
      trackUntil: 2.2,
      turn: 2.2,
      cond: (e) => !!e.data.enraged,
      events: [quake(0.8, 3.0, 14, 3.0), quake(1.6, 3.0, 14, 3.0), quake(2.4, 3.6, 20, 3.0)],
    },
  ],
};

// ------------------------------------------------------------ comportamiento
function loco(e, t, spd) {
  const g = e.gait;
  const sw = g ? g.armSwing / DEG : 0;
  const br = S(t * 0.9 + e.phase * 0.1);
  if (e.state === 'bossIdle') {
    // estatua: sólo un latido en las grietas (no se mueve)
    return rad({ ...STATUE });
  }
  const p = { ...GD, chest: [GD.chest[0] + br * 2, GD.chest[1], 0], armL: [GD.armL[0] + sw * 0.6, GD.armL[1], GD.armL[2]], armR: [GD.armR[0] - sw * 0.3, GD.armR[1], GD.armR[2]] };
  return rad(p);
}

// El que no ataca rodea mientras el otro golpea (si los dos siguen en pie).
function think(e, player, d, dt) {
  const o = e.partner;
  if (!o || o.dead || e.data.enraged) return;
  if (o.state === 'attack' && o.stT < (o.atk ? o.atk.dur * 0.7 : 1)) {
    e.cooldown = Math.max(e.cooldown, 0.4);
    // rodear por el lado contrario al del compañero
    const toP = Math.atan2(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
    const side = angleDiff(toP, Math.atan2(o.pos.x - e.pos.x, o.pos.z - e.pos.z)) > 0 ? -1 : 1;
    const a = toP + side * 1.1;
    if (d > 3.5) e.chaseTo(player.pos.x - Math.sin(a) * 3.2, player.pos.z - Math.cos(a) * 3.2, e.T.walk, dt);
    else e.steerTo(e.pos.x + Math.sin(a), e.pos.z + Math.cos(a), e.T.walk * 0.5, dt, false);
    e.yaw = approachAngle(e.yaw, toP, (e.T.turn ?? 2) * dt);
    return 'handled';
  }
}

function make(kind, name) {
  const C = kind === 'sword' ? SW : HM;
  return {
    name: 'Los Velados',
    // (nombre de cada uno, para la pista de la puerta y el modo de pruebas)
    title: name,
    build: () => body(kind),
    hp: 640,
    poise: 160,
    radius: 0.85,
    height: 3.1,
    lockHeight: 2.4,
    walk: 1.6,
    run: 3.4,
    runDist: 8,
    sight: 40,
    hear: 40,
    turn: 2.2,
    approach: 3.2,
    heavy: true,
    boss: true,
    pair: true,
    alertTime: 3.0,
    introDur: 3.6,
    parryPosture: 3,
    parryDur: 1.5,
    clips: C,
    voice: 'guardian',
    // (al golpearlos saltan esquirlas de piedra, no sangre)
    blood: [0.5, 0.47, 0.42],
    attacks: ATTACKS[kind],
    biped: { scale: K, style: GAIT.heavy, stance: 0.14 },
    loco,
    think,
    // (las grietas encendidas: los ojos y la piedra; laten, ver update)
    init: (e) => {
      e.rig.own();
      e._eyes = e.rig.meshes.filter((m) => m.userData.matName === 'eyeGlow' || m.userData.matName === 'stoneGuard');
    },
    // despierta a los dos a la vez (el juego llama al de la niebla)
    onWake: (e, g) => {
      for (const b of [e, e.partner]) {
        if (!b || b.dead) continue;
        b.aware = true;
        b.state = 'alert';
        b.stT = 0;
        b.anim.play(b.T.clips.alert, { blend: 0.1 });
        g.audio && g.audio.enemyVoice(b, 'alert');
      }
      if (e.partner) e.partner.cooldown = 1.6;
    },
    onReset: (e) => {
      e.data.enraged = false;
      e.anim.speed = 1;
    },
    // el que queda, enloquece: más rápido y con su golpe de furia
    enrage: (e) => {
      e.data.enraged = true;
      e.anim.speed = 1.2;
      e.cooldown = 0.3;
      const g = e.game;
      g.audio && g.audio.enemyVoice(e, 'alert');
      g.camRig.shake(0.5);
      g.fx.blood.emit(e.pos.x, e.pos.y + 2, e.pos.z, 30, { color: [1, 0.45, 0.15], speed: 3, life: 1.2, up: 2, gravity: -1 });
    },
    update: (e, dt) => {
      // las grietas laten (y arden más en la furia)
      if (!e._eyes) return;
      const k = e.data.enraged ? 2.2 + S(e.game.time * 9) * 0.6 : 1 + S(e.game.time * 2.4 + e.phase) * 0.25;
      for (const m of e._eyes) if (!e._flareOn) m.material.emissiveIntensity = (m.userData.baseEI ?? 2) * k;
      if (e.data.enraged) e.anim.speed = Math.max(e.anim.speed, 1.2);
    },
    onAnimEvent: (e, name) => {
      const a = e.game.audio;
      if (!a) return;
      if (name === 'swing') a.play('swingHeavy', e.pos);
    },
  };
}

export const GUARDIAN_L = make('sword', 'el Velado de la Espada');
export const GUARDIAN_R = make('hammer', 'el Velado del Martillo');
