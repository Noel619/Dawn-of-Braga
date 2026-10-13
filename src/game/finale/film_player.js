// Animaciones del jugador en la película (las mueve el guion: es una
// marioneta; ver film.js). Mismo formato que las del juego (rig.js: grados
// por articulación, 'root' en cm): +X en las caderas lo inclina hacia delante;
// en brazos y piernas, -X los adelanta (y los sube).
import { clip } from '../../entities/rig.js';

export const FP = {};

// tumbado boca abajo sobre la losa, agarrado al borde de delante: los brazos
// estirados hacia delante, la cabeza levantada, las piernas abiertas para no
// resbalar (la losa la inclina el guion: aquí, el cuerpo como si estuviera de
// pie con los brazos arriba; la inclinación la pone el giro del cuerpo)
const CLING = { armL: [-168, 0, 22], foreL: [-26, 0, 0], handL: [20, 0, 0], armR: [-164, 0, -24], foreR: [-30, 0, 0], handR: [20, 0, 0], chest: [-10, 0, 0], head: [-34, 0, 0], legL: [8, 0, 14], shinL: [16, 0, 0], footL: [30, 0, 0], legR: [4, 0, -14], shinR: [22, 0, 0], footR: [30, 0, 0] };
FP.cling = clip(
  'fp_cling',
  1.2,
  [
    [0, CLING],
    [0.6, { ...CLING, armL: [-164, 0, 20], foreL: [-36, 0, 0], chest: [-14, 4, 0], legL: [14, 0, 16], legR: [-2, 0, -12], shinR: [34, 0, 0] }],
    [1.2, CLING],
  ],
  { loop: true, ground: false }
);
// resbala por la losa que se inclina, buscando dónde agarrarse
FP.slide = clip(
  'fp_slide',
  0.8,
  [
    [0, { ...CLING, armL: [-150, 0, 40], armR: [-176, 0, -10], foreR: [-10, 0, 0], head: [-20, 20, 0], legL: [20, 0, 24], legR: [-10, 0, -20] }],
    [0.4, { ...CLING, armL: [-178, 0, 8], foreL: [-6, 0, 0], armR: [-146, 0, -40], head: [-24, -20, 0], legL: [-10, 0, 20], legR: [20, 0, -26] }],
    [0.8, { ...CLING, armL: [-150, 0, 40], armR: [-176, 0, -10], foreR: [-10, 0, 0], head: [-20, 20, 0], legL: [20, 0, 24], legR: [-10, 0, -20] }],
  ],
  { loop: true, ground: false }
);
// de rodillas en la joroba, agarrado con la derecha a una púa del espinazo y
// la izquierda abierta para no perder el equilibrio
const KNEEL = { root: [0, -46, 0], hips: [6, 0, 0], chest: [26, 0, 0], head: [-6, 0, 0], legL: [-96, 0, 10], shinL: [118, 0, 0], footL: [20, 0, 0], legR: [-10, 0, -8], shinR: [112, 0, 0], footR: [40, 0, 0], armR: [-78, 0, -6], foreR: [-46, 0, 0], handR: [30, 0, 0], armL: [-24, 0, 62], foreL: [-30, 0, 0] };
FP.kneelGrip = clip(
  'fp_kneelGrip',
  2.0,
  [
    [0, KNEEL],
    [1.0, { ...KNEEL, chest: [30, -6, 0], armL: [-34, 0, 70], foreL: [-20, 0, 0], head: [-2, 8, 0] }],
    [2.0, KNEEL],
  ],
  { loop: true, ground: false }
);
// agarrado con las dos manos a la púa mientras el gigante da un golpe
FP.brace = clip(
  'fp_brace',
  0.6,
  [
    [0, { ...KNEEL, root: [0, -58, 0], chest: [44, 0, 0], head: [20, 0, 0], armL: [-70, 0, 14], foreL: [-60, 0, 0], armR: [-74, 0, -10], foreR: [-54, 0, 0] }],
    [0.3, { ...KNEEL, root: [0, -62, 0], chest: [48, 4, 0], head: [26, 0, 0], armL: [-66, 0, 16], foreL: [-66, 0, 0], armR: [-70, 0, -8], foreR: [-58, 0, 0] }],
    [0.6, { ...KNEEL, root: [0, -58, 0], chest: [44, 0, 0], head: [20, 0, 0], armL: [-70, 0, 14], foreL: [-60, 0, 0], armR: [-74, 0, -10], foreR: [-54, 0, 0] }],
  ],
  { loop: true, ground: false }
);
// de pie ante el rugido (o lo que se le viene encima): las piernas
// abiertas, el cuerpo echado contra el viento, el antebrazo izquierdo ante la
// cara y la derecha abajo con el arma; tiembla con el aire
const WIND = { root: [0, -12, 0], hips: [8, 0, 0], chest: [12, 6, 0], head: [-16, -4, 0], armL: [-128, 0, 34], foreL: [-96, 0, 0], handL: [10, 0, 0], armR: [-22, 0, -18], foreR: [-34, 0, 0], legL: [-24, 0, 12], shinL: [30, 0, 0], footL: [-6, 0, 0], legR: [16, 0, -10], shinR: [22, 0, 0], footR: [-8, 0, 0] };
FP.windStand = clip(
  'fp_windStand',
  0.9,
  [
    [0, WIND],
    [0.45, { ...WIND, root: [0, -14, 0], chest: [15, 3, 0], head: [-13, -2, 0], armL: [-124, 0, 30], foreL: [-100, 0, 0] }],
    [0.9, WIND],
  ],
  { loop: true, ground: false }
);
// cayendo de espaldas, a manotazos
const FALL = { root: [0, 0, 0], hips: [-30, 0, 0], chest: [-24, 0, 0], head: [-30, 0, 0], armL: [-150, 0, 60], foreL: [-30, 0, 0], armR: [-140, 0, -70], foreR: [-40, 0, 0], legL: [-40, 0, 10], shinL: [60, 0, 0], legR: [-10, 0, -10], shinR: [50, 0, 0] };
FP.fall = clip(
  'fp_fall',
  0.8,
  [
    [0, FALL],
    [0.4, { ...FALL, armL: [-130, 0, 80], armR: [-160, 0, -50], legL: [-20, 0, 10], legR: [-44, 0, -10] }],
    [0.8, FALL],
  ],
  { loop: true, ground: false }
);
// colgado del estandarte que se rasga: las dos manos arriba, una pierna
// enroscada en la tela
FP.banner = clip(
  'fp_banner',
  0.9,
  [
    [0, { armL: [-172, 0, 6], foreL: [-14, 0, 0], armR: [-168, 0, -4], foreR: [-20, 0, 0], chest: [-6, 0, 0], head: [-30, 0, 0], legL: [-36, 0, -10], shinL: [70, 0, 0], legR: [6, 0, -4], shinR: [30, 0, 0] }],
    [0.45, { armL: [-170, 0, 8], foreL: [-20, 0, 0], armR: [-172, 0, -6], foreR: [-12, 0, 0], chest: [-4, 4, 0], head: [-26, 6, 0], legL: [-42, 0, -12], shinL: [76, 0, 0], legR: [12, 0, -4], shinR: [36, 0, 0] }],
    [0.9, { armL: [-172, 0, 6], foreL: [-14, 0, 0], armR: [-168, 0, -4], foreR: [-20, 0, 0], chest: [-6, 0, 0], head: [-30, 0, 0], legL: [-36, 0, -10], shinL: [70, 0, 0], legR: [6, 0, -4], shinR: [30, 0, 0] }],
  ],
  { loop: true, ground: false }
);
// cae al suelo de la nave desde el estandarte: flexiona, apoya una mano, se
// incorpora
FP.landCrouch = clip(
  'fp_landCrouch',
  1.1,
  [
    [0, { root: [0, -20, 0], chest: [10, 0, 0], legL: [-40, 0, 6], shinL: [50, 0, 0], legR: [-20, 0, -6], shinR: [40, 0, 0], armL: [-120, 0, 30], armR: [-120, 0, -30] }],
    [0.16, { root: [0, -62, 0], chest: [48, 0, 0], head: [10, 0, 0], legL: [-104, 0, 10], shinL: [128, 0, 0], footL: [20, 0, 0], legR: [-60, 0, -10], shinR: [132, 0, 0], armL: [-60, 0, 30], foreL: [-20, 0, 0], armR: [-20, 0, -40] }, 'snap'],
    [0.6, { root: [0, -56, 0], chest: [40, 0, 0], head: [-10, 0, 0], legL: [-100, 0, 10], shinL: [122, 0, 0], legR: [-56, 0, -10], shinR: [126, 0, 0], armL: [-54, 0, 30], foreL: [-20, 0, 0], armR: [-24, 0, -40] }],
    [1.1, { root: [0, 0, 0] }],
  ],
  { ground: false }
);
// en la mano del gigante: sólo asoma de cintura para arriba; forcejea con los
// codos y empuja los dedos
const HELD = { root: [0, -10, 0], chest: [8, 0, 0], head: [-14, 0, 0], armL: [-110, 0, 40], foreL: [-80, 0, 0], armR: [-104, 0, -36], foreR: [-86, 0, 0], legL: [-30, 0, 6], shinL: [60, 0, 0], legR: [-10, 0, -6], shinR: [50, 0, 0] };
FP.held = clip(
  'fp_held',
  0.7,
  [
    [0, HELD],
    [0.35, { ...HELD, chest: [2, 10, 4], head: [-20, -10, 0], armL: [-96, 0, 54], foreL: [-60, 0, 0], armR: [-120, 0, -24], foreR: [-96, 0, 0] }],
    [0.7, HELD],
  ],
  { loop: true, ground: false }
);
// le clava la espada en el dedo, a dos manos, de arriba abajo
FP.stabDown = clip(
  'fp_stabDown',
  0.55,
  [
    [0, { ...HELD, armR: [-176, 0, -10], foreR: [-40, 0, 0], armL: [-170, 0, 16], foreL: [-46, 0, 0], chest: [-14, 0, 0], head: [-20, 0, 0] }],
    [0.14, { ...HELD, armR: [-36, 0, -14], foreR: [-6, 0, 0], armL: [-40, 0, 20], foreL: [-10, 0, 0], chest: [34, 0, 0], head: [24, 0, 0] }, 'snap'],
    [0.55, { ...HELD, armR: [-50, 0, -12], foreR: [-16, 0, 0], armL: [-54, 0, 18], foreL: [-20, 0, 0], chest: [26, 0, 0], head: [16, 0, 0] }],
  ],
  { ground: false }
);
// por el aire: brazos y piernas abiertos (las vueltas las pone el guion)
FP.fly = clip(
  'fp_fly',
  1.4,
  [
    [0, { hips: [-10, 0, 0], chest: [-20, 0, 0], head: [-26, 0, 0], armL: [-96, 0, 84], foreL: [-14, 0, 0], armR: [-90, 0, -80], foreR: [-20, 0, 0], legL: [16, 0, 14], shinL: [30, 0, 0], legR: [-24, 0, -10], shinR: [44, 0, 0] }],
    [0.7, { hips: [-6, 0, 0], chest: [-16, 6, 0], head: [-20, 0, 0], armL: [-120, 0, 70], foreL: [-30, 0, 0], armR: [-70, 0, -90], foreR: [-10, 0, 0], legL: [-14, 0, 10], shinL: [50, 0, 0], legR: [10, 0, -16], shinR: [24, 0, 0] }],
    [1.4, { hips: [-10, 0, 0], chest: [-20, 0, 0], head: [-26, 0, 0], armL: [-96, 0, 84], foreL: [-14, 0, 0], armR: [-90, 0, -80], foreR: [-20, 0, 0], legL: [16, 0, 14], shinL: [30, 0, 0], legR: [-24, 0, -10], shinR: [44, 0, 0] }],
  ],
  { loop: true, ground: false }
);
// se encoge para el golpe (cubriéndose la cabeza con los brazos)
FP.tuck = clip(
  'fp_tuck',
  0.4,
  [
    [0, { hips: [20, 0, 0], chest: [40, 0, 0], head: [30, 0, 0], armL: [-150, 0, -20], foreL: [-120, 0, 0], armR: [-150, 0, 20], foreR: [-120, 0, 0], legL: [-90, 0, 6], shinL: [120, 0, 0], legR: [-80, 0, -6], shinR: [120, 0, 0] }],
    [0.4, { hips: [26, 0, 0], chest: [46, 0, 0], head: [34, 0, 0], armL: [-156, 0, -24], foreL: [-126, 0, 0], armR: [-156, 0, 24], foreR: [-126, 0, 0], legL: [-96, 0, 6], shinL: [126, 0, 0], legR: [-86, 0, -6], shinR: [126, 0, 0] }],
  ],
  { ground: false }
);

// ------------------------------------------------------------ el acto 4
// en el torno de la espringala: empuja los espeques hacia abajo, a dos manos,
// echando el cuerpo encima (un empujón por vuelta del bucle)
const CRANK = { root: [0, -14, 0], hips: [20, 0, 0], chest: [16, 0, 0], head: [-20, 0, 0], armL: [-104, 0, 14], foreL: [-30, 0, 0], armR: [-106, 0, -12], foreR: [-26, 0, 0], legL: [-30, 0, 6], shinL: [36, 0, 0], legR: [16, 0, -6], shinR: [22, 0, 0], footR: [-12, 0, 0] };
FP.crank = clip(
  'fp_crank',
  0.7,
  [
    [0, CRANK],
    [0.32, { ...CRANK, root: [0, -26, 0], hips: [32, 0, 0], chest: [28, 0, 0], head: [-32, 0, 0], armL: [-50, 0, 14], foreL: [-12, 0, 0], armR: [-54, 0, -12], foreR: [-10, 0, 0], legL: [-42, 0, 6], shinL: [58, 0, 0] }, 'snap'],
    [0.7, CRANK],
  ],
  { loop: true, ground: false }
);
// apuntando: las dos manos en la cola de la espringala, un poco agachado
const AIM = { root: [0, -10, 0], hips: [12, 0, 0], chest: [10, 0, 0], head: [-8, 0, 0], armL: [-72, 0, 22], foreL: [-44, 0, 0], armR: [-74, 0, -20], foreR: [-46, 0, 0], legL: [-22, 0, 8], shinL: [22, 0, 0], legR: [12, 0, -8], shinR: [16, 0, 0] };
FP.aimGun = clip('fp_aimGun', 2.2, [[0, AIM], [1.1, { ...AIM, root: [0, -12, 0], chest: [12, 2, 0] }], [2.2, AIM]], { loop: true, ground: false });
// corriendo por la cadena tensa: los brazos abiertos para no caer
const CR = { hips: [16, 0, 0], chest: [8, 0, 0], head: [-12, 0, 0], armL: [-40, 0, 72], foreL: [-20, 0, 0], armR: [-36, 0, -72], foreR: [-24, 0, 0] };
FP.chainRun = clip(
  'fp_chainRun',
  0.56,
  [
    [0, { ...CR, legL: [-46, 0, 4], shinL: [30, 0, 0], legR: [26, 0, -4], shinR: [50, 0, 0], footR: [20, 0, 0] }],
    [0.28, { ...CR, chest: [8, 4, 0], armL: [-30, 0, 64], armR: [-44, 0, -80], legL: [26, 0, 4], shinL: [50, 0, 0], footL: [20, 0, 0], legR: [-46, 0, -4], shinR: [30, 0, 0] }],
    [0.56, { ...CR, legL: [-46, 0, 4], shinL: [30, 0, 0], legR: [26, 0, -4], shinR: [50, 0, 0], footR: [20, 0, 0] }],
  ],
  { loop: true, ground: false }
);
// colgado del virote con las dos manos, las piernas sueltas
const HANG = { root: [0, 0, 0], hips: [-4, 0, 0], chest: [-6, 0, 0], head: [-24, 0, 0], armL: [-172, 0, 10], foreL: [-12, 0, 0], armR: [-170, 0, -10], foreR: [-14, 0, 0], legL: [-10, 0, 6], shinL: [20, 0, 0], legR: [4, 0, -6], shinR: [30, 0, 0] };
FP.hangBolt = clip(
  'fp_hangBolt',
  1.6,
  [
    [0, HANG],
    [0.8, { ...HANG, chest: [-4, 4, 0], legL: [-22, 0, 6], shinL: [34, 0, 0], legR: [12, 0, -6], shinR: [18, 0, 0] }],
    [1.6, HANG],
  ],
  { loop: true, ground: false }
);

// ------------------------------------------------------------ el acto 5
// colgado de una mano, la espada a dos manos hacia arriba: a la boca
FP.stabUp = clip(
  'fp_stabUp',
  0.6,
  [
    [0, { ...HANG, armR: [-150, 0, -20], foreR: [-80, 0, 0], chest: [10, 0, 0], head: [-36, 0, 0], legL: [-30, 0, 6], shinL: [50, 0, 0] }],
    [0.14, { ...HANG, armR: [-178, 0, -8], foreR: [-4, 0, 0], chest: [-14, 0, 0], head: [-40, 0, 0], legL: [-40, 0, 6], shinL: [60, 0, 0], legR: [10, 0, -6], shinR: [40, 0, 0] }, 'snap'],
    [0.6, { ...HANG, armR: [-170, 0, -12], foreR: [-20, 0, 0], chest: [-8, 0, 0], head: [-34, 0, 0] }],
  ],
  { ground: false }
);
// arrastrado de rodillas por el adarve bajo el antebrazo, las dos manos en
// el virote, el cuerpo echado atrás (a tirones)
const DRAG = { root: [0, -46, 0], hips: [-16, 0, 0], chest: [-12, 0, 0], head: [-6, 0, 0], armL: [-150, 0, 16], foreL: [-24, 0, 0], armR: [-146, 0, -16], foreR: [-28, 0, 0], legL: [-6, 0, 10], shinL: [108, 0, 0], footL: [30, 0, 0], legR: [-14, 0, -8], shinR: [112, 0, 0], footR: [30, 0, 0] };
FP.dragged = clip(
  'fp_dragged',
  0.5,
  [
    [0, DRAG],
    [0.12, { ...DRAG, root: [0, -40, 0], hips: [-22, 6, 0], chest: [-18, 4, 0], head: [-14, 0, 0], legL: [-16, 0, 14] }, 'snap'],
    [0.5, DRAG],
  ],
  { loop: true, ground: false }
);

// ------------------------------------------------------------ el acto 6
// subiendo por una escala de mano: una mano arriba y la otra abajo, la
// rodilla de ese lado alta (un tramo por medio ciclo)
const LAD = { hips: [-6, 0, 0], chest: [-4, 0, 0], head: [-16, 0, 0] };
FP.ladder = clip(
  'fp_ladder',
  0.9,
  [
    [0, { ...LAD, armL: [-168, 0, 8], foreL: [-30, 0, 0], armR: [-112, 0, -8], foreR: [-70, 0, 0], legL: [-24, 0, 4], shinL: [40, 0, 0], legR: [-70, 0, -4], shinR: [96, 0, 0] }],
    [0.45, { ...LAD, armL: [-112, 0, 8], foreL: [-70, 0, 0], armR: [-168, 0, -8], foreR: [-30, 0, 0], legL: [-70, 0, 4], shinL: [96, 0, 0], legR: [-24, 0, -4], shinR: [40, 0, 0] }],
    [0.9, { ...LAD, armL: [-168, 0, 8], foreL: [-30, 0, 0], armR: [-112, 0, -8], foreR: [-70, 0, 0], legL: [-24, 0, 4], shinL: [40, 0, 0], legR: [-70, 0, -4], shinR: [96, 0, 0] }],
  ],
  { loop: true, ground: false }
);
// agarrado a la jaula de la cara del gigante: las manos en los barrotes, el
// cuerpo pegado, las piernas buscando apoyo
const CAGE = { hips: [-8, 0, 0], chest: [6, 0, 0], head: [-10, 0, 0], armL: [-150, 0, 26], foreL: [-60, 0, 0], armR: [-146, 0, -26], foreR: [-64, 0, 0], legL: [-40, 0, 10], shinL: [70, 0, 0], legR: [-10, 0, -8], shinR: [40, 0, 0] };
FP.cage = clip(
  'fp_cage',
  1.0,
  [
    [0, CAGE],
    [0.5, { ...CAGE, legL: [-20, 0, 12], shinL: [50, 0, 0], legR: [-34, 0, -10], shinR: [66, 0, 0], chest: [4, 4, 0] }],
    [1.0, CAGE],
  ],
  { loop: true, ground: false }
);
// colgado de la jaula con la izquierda, la espada en la derecha: entre los
// barrotes, al ojo (una estocada por pulsación)
FP.stabCage = clip(
  'fp_stabCage',
  0.5,
  [
    [0, { ...CAGE, armR: [-70, 0, -30], foreR: [-100, 0, 0], chest: [-6, -10, 0] }],
    [0.12, { ...CAGE, armR: [-100, 0, -6], foreR: [-6, 0, 0], chest: [14, 12, 0], head: [0, 6, 0] }, 'snap'],
    [0.5, { ...CAGE, armR: [-70, 0, -30], foreR: [-100, 0, 0], chest: [-6, -10, 0] }],
  ],
  { loop: true, ground: false }
);
// hachazos a la cadena: la espada a dos manos, por encima de la cabeza, y
// abajo con todo el cuerpo (uno por pulsación)
const CHOP = { root: [0, -10, 0], hips: [10, 0, 0], chest: [4, 0, 0], head: [-10, 0, 0], legL: [-30, 0, 8], shinL: [30, 0, 0], legR: [16, 0, -8], shinR: [20, 0, 0] };
FP.chop = clip(
  'fp_chop',
  0.55,
  [
    [0, { ...CHOP, chest: [-16, 0, 0], armL: [-170, 0, 10], foreL: [-40, 0, 0], armR: [-170, 0, -10], foreR: [-40, 0, 0] }],
    [0.14, { ...CHOP, root: [0, -30, 0], hips: [26, 0, 0], chest: [30, 0, 0], head: [10, 0, 0], armL: [-60, 0, 8], foreL: [-10, 0, 0], armR: [-60, 0, -8], foreR: [-10, 0, 0] }, 'snap'],
    [0.55, { ...CHOP, chest: [-16, 0, 0], armL: [-170, 0, 10], foreL: [-40, 0, 0], armR: [-170, 0, -10], foreR: [-40, 0, 0] }],
  ],
  { loop: true, ground: false }
);
