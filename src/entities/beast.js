// La Bestia de Carne: lo que queda del Empalado cuando se le cae el hierro.
// No es una criatura del juego corriente: la mueve el guion de la
// persecución (game/beast_chase.js), que la pone en su sitio, le dice a qué
// velocidad corre y qué golpe lanza. Aquí está cómo se mueve: una marcha de
// pies plantados (Biped) con el cuerpo muy encorvado, los brazos que llegan
// al suelo bamboleándose, la cola y la mandíbula con inercia, y su
// repertorio de animaciones (rugidos, zarpazos, mazazos a dos puños, una
// cornada, el salto, arrancarse la pica de la espalda y tirarla...).
import * as THREE from 'three';
import { clip, Animator, blendInto, addRot, Spring } from './rig.js';
import { Biped, GAIT } from './locomotion.js';
import { buildBeast, BEAST } from './impaled_model.js';
import { makeBlobShadow } from './enemy.js';
import { clamp, damp, DEG } from '../core/util.js';

const V3 = THREE.Vector3;
const S = Math.sin;

// Postura de reposo (grados): encorvado, la cabeza por delante, los brazos
// colgando abiertos.
const B = {
  spine: [12, 0, 0],
  chest: [18, 0, 0],
  neck: [-12, 0, 0],
  head: [-14, 0, 0],
  jaw: [4, 0, 0],
  armL: [-10, 0, 16],
  foreL: [-30, 0, 0],
  handL: [-8, 0, 0],
  armR: [-10, 0, -16],
  foreR: [-30, 0, 0],
  handR: [-8, 0, 0],
};
const K = (o) => ({ ...B, ...o });
// piernas en reposo (para los clips que las mueven)
const LEGS0 = { legL: [-8, 0, 4], shinL: [20, 0, 0], footL: [-12, 0, 0], legR: [-8, 0, -4], shinR: [20, 0, 0], footR: [-12, 0, 0] };

export const BEAST_CLIPS = {
  // rugido: toma aire encogido y lo suelta erguido, los brazos abiertos
  roar: clip(
    'b_roar',
    2.4,
    [
      [0, K({})],
      [0.4, K({ chest: [32, 0, 0], neck: [6, 0, 0], head: [14, 0, 0], armL: [-24, 0, 26], armR: [-24, 0, -26], jaw: [0, 0, 0], root: [0, -14, 0] })],
      [
        0.72,
        K({
          spine: [-4, 0, 0],
          chest: [-16, 0, 0],
          neck: [-22, 0, 0],
          head: [-26, 0, 0],
          jaw: [40, 0, 0],
          armL: [-46, 0, 66],
          foreL: [-52, 0, 0],
          handL: [22, 0, 0],
          armR: [-46, 0, -66],
          foreR: [-52, 0, 0],
          handR: [22, 0, 0],
          root: [0, -6, 0],
        }),
        'snap',
      ],
      [
        1.4,
        K({
          spine: [-2, 0, 0],
          chest: [-14, 4, 0],
          neck: [-20, 0, 0],
          head: [-30, 6, 0],
          jaw: [42, 0, 0],
          armL: [-44, 0, 64],
          foreL: [-56, 0, 0],
          handL: [26, 0, 0],
          armR: [-48, 0, -68],
          foreR: [-50, 0, 0],
          handR: [24, 0, 0],
          root: [0, -6, 0],
        }),
      ],
      [
        1.95,
        K({
          spine: [0, 0, 0],
          chest: [-10, -4, 0],
          neck: [-16, 0, 0],
          head: [-24, -6, 0],
          jaw: [34, 0, 0],
          armL: [-40, 0, 58],
          foreL: [-50, 0, 0],
          armR: [-40, 0, -60],
          foreR: [-50, 0, 0],
          root: [0, -6, 0],
        }),
      ],
      [2.4, K({})],
    ],
    { events: [{ t: 0.7, name: 'roar' }] }
  ),
  // el gran rugido final, en lo alto del fanal: se yergue del todo
  bigRoar: clip(
    'b_bigroar',
    3.6,
    [
      [0, K({})],
      [0.7, K({ chest: [36, 0, 0], neck: [8, 0, 0], head: [20, 0, 0], armL: [-20, 0, 30], armR: [-20, 0, -30], jaw: [0, 0, 0], root: [0, -22, 0] })],
      [
        1.1,
        K({
          spine: [-10, 0, 0],
          chest: [-24, 0, 0],
          neck: [-26, 0, 0],
          head: [-34, 0, 0],
          jaw: [44, 0, 0],
          armL: [-118, 0, 66],
          foreL: [-36, 0, 0],
          handL: [30, 0, 0],
          armR: [-118, 0, -66],
          foreR: [-36, 0, 0],
          handR: [30, 0, 0],
          root: [0, 8, 0],
        }),
        'snap',
      ],
      [
        2.0,
        K({
          spine: [-12, 0, 0],
          chest: [-26, 6, 0],
          neck: [-26, 0, 0],
          head: [-38, 8, 0],
          jaw: [46, 0, 0],
          armL: [-124, 0, 70],
          foreL: [-30, 0, 0],
          handL: [34, 0, 0],
          armR: [-112, 0, -62],
          foreR: [-40, 0, 0],
          handR: [30, 0, 0],
          root: [0, 8, 0],
        }),
      ],
      [
        2.9,
        K({
          spine: [-8, 0, 0],
          chest: [-20, -6, 0],
          neck: [-22, 0, 0],
          head: [-30, -8, 0],
          jaw: [38, 0, 0],
          armL: [-108, 0, 62],
          foreL: [-40, 0, 0],
          armR: [-116, 0, -66],
          foreR: [-34, 0, 0],
          root: [0, 6, 0],
        }),
      ],
      [3.6, K({})],
    ],
    { events: [{ t: 1.05, name: 'roar' }] }
  ),
  // zarpazo de derecha a izquierda
  swipe: clip(
    'b_swipe',
    1.15,
    [
      [0, K({})],
      [0.38, K({ chest: [16, -38, 0], head: [-10, 24, 0], armR: [-70, 0, -92], foreR: [-40, 0, 0], handR: [10, 0, 0], armL: [-20, 0, 30], root: [0, -14, -6] }), 'hold'],
      [0.52, K({ chest: [26, 36, 0], head: [-14, -22, 0], armR: [-84, 0, 26], foreR: [-8, 0, 0], handR: [-6, 0, 0], armL: [-10, 0, 40], root: [0, -22, 14] }), 'snap'],
      [0.78, K({ chest: [28, 42, 0], head: [-12, -20, 0], armR: [-60, 0, 40], foreR: [-20, 0, 0], armL: [-12, 0, 36], root: [0, -20, 12] })],
      [1.15, K({})],
    ],
    { events: [{ t: 0.48, name: 'hit' }] }
  ),
  // mazazo a dos puños
  smash: clip(
    'b_smash',
    1.45,
    [
      [0, K({})],
      [
        0.55,
        K({
          spine: [-4, 0, 0],
          chest: [-16, 0, 0],
          neck: [-14, 0, 0],
          head: [-12, 0, 0],
          armL: [-168, 0, 18],
          foreL: [-34, 0, 0],
          armR: [-168, 0, -18],
          foreR: [-34, 0, 0],
          jaw: [24, 0, 0],
          root: [0, 6, -8],
        }),
        'hold',
      ],
      [
        0.74,
        K({ spine: [20, 0, 0], chest: [44, 0, 0], neck: [6, 0, 0], head: [8, 0, 0], armL: [-64, 0, 8], foreL: [-6, 0, 0], armR: [-64, 0, -8], foreR: [-6, 0, 0], jaw: [10, 0, 0], root: [0, -44, 12] }),
        'snap',
      ],
      [1.05, K({ spine: [20, 0, 0], chest: [42, 0, 0], head: [6, 0, 0], armL: [-60, 0, 10], foreL: [-10, 0, 0], armR: [-60, 0, -10], foreR: [-10, 0, 0], root: [0, -40, 10] })],
      [1.45, K({})],
    ],
    { events: [{ t: 0.73, name: 'hit' }] }
  ),
  // cornada: la testuz abajo y un empujón con los cuernos
  gore: clip(
    'b_gore',
    1.2,
    [
      [0, K({})],
      [0.45, K({ spine: [18, 0, 0], chest: [38, 0, 0], neck: [12, 0, 0], head: [32, 0, 0], armL: [-30, 0, 40], armR: [-30, 0, -40], root: [0, -34, -14] }), 'hold'],
      [0.62, K({ spine: [14, 0, 0], chest: [30, 0, 0], neck: [-4, 0, 0], head: [2, 0, 0], armL: [10, 0, 36], armR: [10, 0, -36], root: [0, -26, 46] }), 'snap'],
      [0.85, K({ spine: [10, 0, 0], chest: [22, 0, 0], neck: [-10, 0, 0], head: [-12, 0, 0], root: [0, -22, 40] })],
      [1.2, K({})],
    ],
    { events: [{ t: 0.6, name: 'hit' }] }
  ),
  // te echa las dos manos encima
  grab: clip(
    'b_grab',
    1.2,
    [
      [0, K({})],
      [
        0.4,
        K({
          chest: [28, 0, 0],
          head: [-6, 0, 0],
          armL: [-54, 0, 74],
          foreL: [-30, 0, 0],
          handL: [20, 0, 0],
          armR: [-54, 0, -74],
          foreR: [-30, 0, 0],
          handR: [20, 0, 0],
          jaw: [26, 0, 0],
          root: [0, -16, -4],
        }),
        'hold',
      ],
      [
        0.58,
        K({
          chest: [36, 0, 0],
          head: [-10, 0, 0],
          armL: [-82, 0, 12],
          foreL: [-20, 0, 0],
          handL: [-30, 0, 0],
          armR: [-82, 0, -12],
          foreR: [-20, 0, 0],
          handR: [-30, 0, 0],
          jaw: [30, 0, 0],
          root: [0, -24, 26],
        }),
        'snap',
      ],
      [0.85, K({ chest: [34, 0, 0], armL: [-76, 0, 10], foreL: [-24, 0, 0], armR: [-76, 0, -10], foreR: [-24, 0, 0], root: [0, -22, 22] })],
      [1.2, K({})],
    ],
    { events: [{ t: 0.57, name: 'hit' }] }
  ),
  // le has clavado el arma en la mano: la retira y se revuelve
  recoil: clip('b_recoil', 1.0, [
    [0, K({ chest: [-14, 24, 0], head: [-28, 0, 18], jaw: [30, 0, 0], armR: [-30, 0, -70], foreR: [-80, 0, 0], handR: [40, 0, 0], root: [0, -8, -20] }), 'snap'],
    [0.45, K({ chest: [-6, 16, 0], head: [-20, 0, 12], jaw: [24, 0, 0], armR: [-60, 0, -50], foreR: [-90, 0, 0], handR: [30, 0, 0], root: [0, -10, -14] })],
    [1.0, K({})],
  ]),
  // agarra algo del suelo (una almena, un sillar) y lo arroja por encima
  throw: clip(
    'b_throw',
    1.7,
    [
      [0, K({})],
      [0.45, K({ spine: [20, 0, 0], chest: [46, -10, 0], head: [8, 0, 0], armR: [-58, 0, -12], foreR: [-12, 0, 0], handR: [-20, 0, 0], armL: [-30, 0, 30], root: [0, -34, 4] }), 'hold'],
      [0.9, K({ spine: [-6, 0, 0], chest: [-12, -34, 0], head: [-14, 20, 0], armR: [-168, 0, -42], foreR: [-96, 0, 0], handR: [-10, 0, 0], armL: [-60, 0, 40], root: [0, -4, -12] }), 'hold'],
      [1.08, K({ spine: [16, 0, 0], chest: [32, 24, 0], head: [-6, -14, 0], armR: [-60, 0, -10], foreR: [-8, 0, 0], handR: [10, 0, 0], armL: [-6, 0, 30], root: [0, -18, 16] }), 'snap'],
      [1.7, K({})],
    ],
    {
      events: [
        { t: 0.45, name: 'grab' },
        { t: 1.04, name: 'release' },
      ],
    }
  ),
  // se arranca la pica de la espalda y la arroja como una lanza
  pikeRip: clip(
    'b_pikerip',
    2.3,
    [
      [0, K({})],
      [0.6, K({ chest: [10, 26, 0], head: [-6, 30, 10], armR: [-152, 0, -26], foreR: [-104, 0, 0], handR: [-20, 0, 0], root: [0, -8, 0] })],
      [0.95, K({ chest: [34, 34, 0], head: [-26, 24, 16], jaw: [36, 0, 0], armR: [-118, 0, -6], foreR: [-82, 0, 0], handR: [-10, 0, 0], armL: [-40, 0, 50], root: [0, -20, 0] }), 'snap'],
      [
        1.4,
        K({ spine: [-6, 0, 0], chest: [-14, -32, 0], head: [-16, 22, 0], jaw: [14, 0, 0], armR: [-170, 0, -48], foreR: [-84, 0, 0], handR: [0, 0, 0], armL: [-60, 0, 44], root: [0, -2, -14] }),
        'hold',
      ],
      [1.62, K({ spine: [18, 0, 0], chest: [34, 22, 0], head: [-8, -16, 0], jaw: [26, 0, 0], armR: [-52, 0, -8], foreR: [-6, 0, 0], armL: [-2, 0, 30], root: [0, -20, 20] }), 'snap'],
      [2.3, K({})],
    ],
    {
      events: [
        { t: 0.93, name: 'rip' },
        { t: 1.58, name: 'throw' },
      ],
    }
  ),
  // se arranca de donde se ha quedado clavado (los cuernos en la piedra)
  tear: clip(
    'b_tear',
    1.5,
    [
      [0, K({ spine: [24, 0, 0], chest: [40, 8, 0], neck: [14, 0, 0], head: [34, -20, 0], armL: [-60, 0, 30], foreL: [-60, 0, 0], armR: [-50, 0, -40], foreR: [-40, 0, 0], root: [0, -30, 20] })],
      [
        0.55,
        K({
          spine: [26, 0, 0],
          chest: [44, -10, 0],
          neck: [16, 0, 0],
          head: [38, 24, 0],
          jaw: [20, 0, 0],
          armL: [-70, 0, 20],
          foreL: [-70, 0, 0],
          armR: [-70, 0, -20],
          foreR: [-70, 0, 0],
          root: [0, -34, 16],
        }),
      ],
      [0.9, K({ spine: [6, 0, 0], chest: [6, 0, 0], neck: [-14, 0, 0], head: [-24, 0, 0], jaw: [36, 0, 0], armL: [-30, 0, 50], armR: [-30, 0, -50], root: [0, -10, -30] }), 'snap'],
      [1.5, K({})],
    ],
    { events: [{ t: 0.88, name: 'free' }] }
  ),
  // salto: se agacha, despega (el guion lo lleva por el aire), aterriza
  leap: clip(
    'b_leap',
    1.9,
    [
      [0, K({ ...LEGS0 })],
      [
        0.42,
        K({
          spine: [26, 0, 0],
          chest: [40, 0, 0],
          head: [-26, 0, 0],
          armL: [30, 0, 30],
          armR: [30, 0, -30],
          legL: [-70, 0, 6],
          shinL: [110, 0, 0],
          footL: [-50, 0, 0],
          legR: [-60, 0, -6],
          shinR: [104, 0, 0],
          footR: [-48, 0, 0],
          root: [0, -76, -10],
        }),
        'hold',
      ],
      [
        0.58,
        K({
          spine: [6, 0, 0],
          chest: [10, 0, 0],
          head: [-20, 0, 0],
          armL: [-120, 0, 40],
          armR: [-120, 0, -40],
          legL: [10, 0, 6],
          shinL: [10, 0, 0],
          footL: [30, 0, 0],
          legR: [20, 0, -6],
          shinR: [16, 0, 0],
          footR: [36, 0, 0],
          root: [0, 6, 0],
        }),
        'snap',
      ],
      [
        0.9,
        K({
          spine: [0, 0, 0],
          chest: [-6, 0, 0],
          head: [-16, 0, 0],
          jaw: [30, 0, 0],
          armL: [-150, 0, 40],
          foreL: [-30, 0, 0],
          armR: [-150, 0, -40],
          foreR: [-30, 0, 0],
          legL: [-60, 0, 6],
          shinL: [80, 0, 0],
          footL: [-10, 0, 0],
          legR: [-30, 0, -6],
          shinR: [90, 0, 0],
          footR: [-20, 0, 0],
          root: [0, 0, 0],
        }),
      ],
      [
        1.2,
        K({
          spine: [10, 0, 0],
          chest: [10, 0, 0],
          head: [-14, 0, 0],
          jaw: [24, 0, 0],
          armL: [-140, 0, 30],
          armR: [-140, 0, -30],
          legL: [-50, 0, 6],
          shinL: [40, 0, 0],
          footL: [-10, 0, 0],
          legR: [-30, 0, -6],
          shinR: [36, 0, 0],
          footR: [-10, 0, 0],
          root: [0, 0, 0],
        }),
      ],
      [
        1.32,
        K({
          spine: [26, 0, 0],
          chest: [44, 0, 0],
          head: [6, 0, 0],
          armL: [-60, 0, 20],
          armR: [-60, 0, -20],
          legL: [-80, 0, 8],
          shinL: [112, 0, 0],
          footL: [-40, 0, 0],
          legR: [-40, 0, -8],
          shinR: [100, 0, 0],
          footR: [-50, 0, 0],
          root: [0, -70, 10],
        }),
        'snap',
      ],
      [1.9, K({ ...LEGS0 })],
    ],
    {
      ground: false,
      events: [
        { t: 0.56, name: 'jump' },
        { t: 1.3, name: 'land' },
      ],
    }
  ),
  // se levanta (la transformación): de rodillas, encogido, hasta en pie
  rise: clip(
    'b_rise',
    2.6,
    [
      [
        0,
        K({
          spine: [30, 0, 0],
          chest: [50, 0, 0],
          neck: [10, 0, 0],
          head: [30, 0, 0],
          armL: [-60, 0, 20],
          foreL: [-60, 0, 0],
          armR: [-60, 0, -20],
          foreR: [-60, 0, 0],
          legL: [-96, 0, 8],
          shinL: [130, 0, 0],
          footL: [-34, 0, 0],
          legR: [-30, 0, -8],
          shinR: [126, 0, 0],
          footR: [-60, 0, 0],
          root: [0, -118, 0],
        }),
      ],
      [
        0.9,
        K({
          spine: [34, 0, 0],
          chest: [52, -10, 0],
          neck: [12, 0, 0],
          head: [26, 14, 0],
          jaw: [22, 0, 0],
          armL: [-70, 0, 30],
          foreL: [-50, 0, 0],
          armR: [-50, 0, -20],
          foreR: [-70, 0, 0],
          legL: [-96, 0, 8],
          shinL: [128, 0, 0],
          footL: [-34, 0, 0],
          legR: [-34, 0, -8],
          shinR: [124, 0, 0],
          footR: [-58, 0, 0],
          root: [0, -114, 0],
        }),
      ],
      [
        1.7,
        K({
          spine: [22, 0, 0],
          chest: [30, 0, 0],
          neck: [-4, 0, 0],
          head: [-6, 0, 0],
          jaw: [10, 0, 0],
          legL: [-50, 0, 6],
          shinL: [74, 0, 0],
          footL: [-26, 0, 0],
          legR: [-20, 0, -6],
          shinR: [70, 0, 0],
          footR: [-40, 0, 0],
          root: [0, -56, 0],
        }),
      ],
      [2.6, K({ ...LEGS0 })],
    ],
    { ground: false }
  ),
  // mira hacia abajo, al borde, resoplando
  stare: clip(
    'b_stare',
    2.0,
    [
      [0, K({ spine: [20, 0, 0], chest: [32, 0, 0], neck: [12, 0, 0], head: [26, 0, 0], jaw: [10, 0, 0], armL: [-14, 0, 12], armR: [-14, 0, -12] })],
      [1.0, K({ spine: [20, 0, 0], chest: [30, 2, 0], neck: [12, 0, 0], head: [22, 6, 0], jaw: [16, 0, 0], armL: [-14, 0, 12], armR: [-14, 0, -12] })],
      [2.0, K({ spine: [20, 0, 0], chest: [32, 0, 0], neck: [12, 0, 0], head: [26, 0, 0], jaw: [10, 0, 0], armL: [-14, 0, 12], armR: [-14, 0, -12] })],
    ],
    { loop: true }
  ),
  // un manotazo seco (te ha alcanzado corriendo)
  bash: clip(
    'b_bash',
    0.9,
    [
      [0, K({})],
      [0.24, K({ chest: [10, -26, 0], armR: [-100, 0, -60], foreR: [-50, 0, 0], root: [0, -10, 0] }), 'hold'],
      [0.36, K({ chest: [30, 30, 0], armR: [-70, 0, 20], foreR: [-10, 0, 0], root: [0, -18, 10] }), 'snap'],
      [0.9, K({})],
    ],
    { events: [{ t: 0.34, name: 'hit' }] }
  ),
};

const _v = new V3();

export class Beast {
  constructor(game) {
    this.g = game;
    this.rig = buildBeast();
    this.rig.own();
    this.obj = this.rig.root;
    this.obj.visible = false;
    game.scene.add(this.obj);
    this.shadow = makeBlobShadow(3.4);
    this.shadow.visible = false;
    game.scene.add(this.shadow);
    this.pos = new V3();
    this.yaw = 0;
    this.vx = 0;
    this.vz = 0;
    this.groundY = 0;
    this.lift = 0; // altura sobre el suelo (saltos)
    this.anim = new Animator();
    this.anim.onEvent = (name) => this.onEvent && this.onEvent(name);
    this.gait = new Biped(this.rig, { scale: 2.1, style: { ...GAIT.heavy, runFrom: 1.4, runTo: 2.6, lean: 4, leanRun: 6, liftRun: 0.2, armWalk: 14, armRun: 30 }, stance: 0.14 });
    this.gait.onStep = (side, w) => this.onStep && this.onStep(side, w);
    this._groundFn = (x, z) => game.world.col.groundHeight(x, z, 0.2, this.pos.y + 0.8);
    this._gp = new V3();
    this.tailX = new Spring(40, 5);
    this.tailY = new Spring(40, 5);
    this.jawS = new Spring(90, 9);
    this.flinch = new Spring(120, 10);
    this.headLook = 0; // giro de la cabeza hacia algo (rad)
    this.lookTarget = null;
    this.extraHunch = 0;
    this.time = 0;
    this.visible = false;
    // la pica que aún le sale de la espalda (se la arranca)
    this.stub = this.rig.meshes.filter((m) => m.userData.grp === 'stub');
  }

  // Transparencia (cuando se interpone entre la cámara y el jugador).
  setFade(a) {
    if (Math.abs(a - (this._fade ?? 1)) < 0.005) return;
    this._fade = a;
    const tr = a < 0.99;
    for (const m of this.rig.mats) {
      if (m.transparent !== tr) {
        m.transparent = tr;
        m.depthWrite = !tr;
        m.needsUpdate = true;
      }
      m.opacity = a;
    }
  }

  show(x, y, z, yaw) {
    this.pos.set(x, y, z);
    this.yaw = yaw;
    this.vx = this.vz = 0;
    this.lift = 0;
    this.obj.visible = true;
    this.shadow.visible = true;
    this.visible = true;
    this.gait._yaw = null;
    this.anim.stop(0);
    this.anim.weight = 0;
  }
  hide() {
    this.obj.visible = false;
    this.shadow.visible = false;
    this.visible = false;
  }
  showStub(on) {
    for (const m of this.stub) m.visible = on;
  }

  play(name, o = {}) {
    this.anim.play(BEAST_CLIPS[name], { blend: o.blend ?? 0.12, speed: o.speed ?? 1, t0: o.t0 ?? 0 });
    this.clipName = name;
  }
  stopClip(blend = 0.25) {
    this.anim.stop(blend);
    this.clipName = null;
  }
  get clipT() {
    return this.anim.clip ? this.anim.t : 0;
  }
  get clipDone() {
    return !this.anim.clip || this.anim.done;
  }

  // Punto de una articulación en el mundo (las manos, la cabeza...).
  point(j, out = new V3(), local = null) {
    return this.rig.worldPos(j, out, local);
  }

  update(dt) {
    if (!this.visible) return;
    this.time += dt;
    const t = this.time;
    const g = this.g;
    // marcha (pies plantados) con la velocidad que le da el guion
    const pose = this.gait.update(dt, this.vx, this.vz, this.yaw, {
      time: t,
      grounded: this.lift < 0.05,
      crouch: 0.08 + this.extraHunch * 0.2,
      exert: 1,
      ground: this._groundFn,
      pos: this._gp.set(this.pos.x, this.pos.y, this.pos.z),
    });
    const gt = this.gait;
    const run = gt.runW * gt.mw,
      mw = gt.mw;
    const ph = gt.phase * Math.PI * 2;
    const sw = Math.cos(ph) * mw;
    const breath = S(t * 1.9) * (1 - mw * 0.6);
    const hunch = this.extraHunch;
    // postura: encorvado (más al correr), la cabeza por delante
    pose.root = pose.root || [0, 0, 0];
    pose.root[1] -= 0.1 + run * 0.06 + hunch * 0.15;
    addRot(pose, 'hips', [(6 + run * 6) * DEG, 0, 0]);
    pose.spine = [(12 + run * 8 + hunch * 10 + breath * 1.2) * DEG, -(pose.chest ? pose.chest[1] : 0) * 0.3, 0];
    addRot(pose, 'chest', [(16 + run * 10 + hunch * 8 + breath * 2.5) * DEG, 0, 0]);
    pose.neck = [(-12 - run * 8 - hunch * 6) * DEG, this.headLook * 0.4, 0];
    pose.head = [(pose.head ? pose.head[0] : 0) + (-14 - run * 10 - hunch * 8 - breath * 1.5) * DEG, (pose.head ? pose.head[1] : 0) + this.headLook * 0.6, pose.head ? pose.head[2] : 0];
    // brazos: cuelgan abiertos y se bambolean con la marcha
    const armA = (8 + run * 34) * DEG;
    pose.armL = [(-10 - run * 8) * DEG + sw * armA, 0, (16 + run * 8) * DEG + Math.abs(sw) * 4 * DEG];
    pose.armR = [(-10 - run * 8) * DEG - sw * armA, 0, -(16 + run * 8) * DEG - Math.abs(sw) * 4 * DEG];
    pose.foreL = [(-30 - run * 34 - Math.max(0, sw) * 20 * run) * DEG, 0, 0];
    pose.foreR = [(-30 - run * 34 - Math.max(0, -sw) * 20 * run) * DEG, 0, 0];
    pose.handL = [(-8 - run * 10) * DEG, 0, 0];
    pose.handR = [(-8 - run * 10) * DEG, 0, 0];
    pose.jaw = [(4 + run * 14 + Math.max(0, breath) * 4) * DEG, 0, 0];
    // clip de acción por encima
    const ap = this.anim.update(dt);
    const c = this.anim.clip;
    const aw = ap ? this.anim.weight : 0;
    let clipPose = null;
    if (ap && aw > 0) {
      if (c.legs && c.ground) clipPose = ap;
      blendInto(pose, ap, aw, c.mask, this.anim.jw);
    }
    const ikW = c && c.legs && !c.ground ? 1 - aw : 1;
    if (ikW > 0.001) gt.solve(pose, { w: ikW, clipPose, clipW: clipPose ? aw : 0, clipGround: true });
    // inercias: la cola, la mandíbula y los respingos
    const fx = this.flinch.update(dt);
    if (Math.abs(fx) > 0.001) {
      addRot(pose, 'chest', [fx * 0.05, fx * 0.02, 0]);
      addRot(pose, 'head', [fx * 0.06, 0, fx * 0.03]);
    }
    const yr = clamp(gt.yawRate, -4, 4);
    const tx = this.tailX.update(dt, -0.35 + run * 0.25 + S(t * 1.3) * 0.08 + S(ph * 2) * 0.12 * mw);
    const ty = this.tailY.update(dt, -yr * 0.12 + S(t * 0.9) * 0.15 + sw * 0.18);
    pose.tail = [tx, ty, 0];
    pose.tail2 = [tx * 0.8 - 0.1, ty * 1.3, 0];
    const jw = this.jawS.update(dt, 0);
    if (pose.jaw) pose.jaw[0] += jw;
    this.rig.apply(pose);
    this.obj.position.set(this.pos.x, this.pos.y + this.lift, this.pos.z);
    this.obj.rotation.y = this.yaw;
    // sombra y luz del sitio
    const gy = this.groundY;
    this.shadow.position.set(this.pos.x, gy + 0.03, this.pos.z);
    const sk = clamp(1 - (this.pos.y + this.lift - gy) / 8, 0.25, 1);
    this.shadow.scale.set(3.4 * sk, 1, 3.4 * sk);
    this._probeT = (this._probeT || 0) - dt;
    if (this._probeT <= 0) {
      this._probeT = 0.1;
      const z = g.zoneAt(this.pos);
      const rid = z && z.room ? g.level.ctx.wb.roomId(z.room) : 0;
      const o = g.probe.sample(this.pos.x, this.pos.y + 1.6, this.pos.z, rid);
      const q = this._probe || (this._probe = [o[0], o[1], o[2]]);
      for (let i = 0; i < 3; i++) q[i] += (o[i] - q[i]) * 0.4;
      this.rig.setProbe(q[0], q[1], q[2], gy);
    }
  }
}

export { BEAST };
