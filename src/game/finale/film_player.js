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
