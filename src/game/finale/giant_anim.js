// Animaciones del gigante de la película (las de la pelea vieja siguen en
// turiferario_anim.js y también se usan: idle, walk, roar, hold, throw...).
//
// Mismas reglas que allí: cada clave parte de la pose de reposo (IDLE) y
// cambia sólo lo que se mueve; los golpes tienen anticipación ('hold'),
// golpe ('snap'/'strike') y recuperación ('settle'), con retrasos
// escalonados (la cadera empieza, el pecho la sigue, el brazo después, la
// mano la última). Ejes: +X dobla hacia delante lo que apunta arriba (y hacia
// atrás lo que cuelga), +Y gira hacia su izquierda, +Z abre hacia su
// izquierda. 'root' (cm) mueve la pelvis, y con ella todo el cuerpo.
//
// Avance: los clips que llevan al gigante de un sitio a otro dicen cuánto
// avanza ('move': [segundo, metros] a lo largo de su frente; 'vel': m/s en
// los bucles); lo aplica giant.js si el guion enciende rootMotion. Así los
// pies no patinan: el avance va con las zancadas.
import { clip } from '../../entities/rig.js';
import { IDLE, hand, mirror } from './turiferario_anim.js';

const K = (t, o = {}, ease, k) => [t, { ...IDLE, ...o }, ease, k ? { k } : undefined];
export const GIANT_CLIPS = {};
const C = GIANT_CLIPS;

// ------------------------------------------------------------ el pozo
// Hecho un ovillo, boca abajo, en el fondo del pozo de la cisterna: la joroba
// arriba, la cabeza metida entre los brazos, las piernas plegadas debajo.
const CURL = {
  pelvis: [50, 0, 0],
  spine1: [16, 0, 0],
  spine2: [14, 0, 0],
  chest: [10, 0, 0],
  neck1: [20, 0, 0],
  neck2: [26, 0, 0],
  head: [30, 0, 0],
  jaw: [10, 0, 0],
  clavL: [0, 0, -8],
  clavR: [0, 0, 8],
  armL: [-78, 0, 8],
  foreL: [-46, 0, 0],
  handL: [34, 0, 0],
  armR: [-74, 0, -8],
  foreR: [-50, 0, 0],
  handR: [30, 0, 0],
  legL: [-132, 0, 14],
  shinL: [142, 0, 0],
  footL: [40, 0, 0],
  legR: [-132, 0, -14],
  shinR: [142, 0, 0],
  footR: [40, 0, 0],
  tail1: [-70, 24, 0],
  tail2: [-16, 30, 0],
  tail3: [-6, 32, 0],
  tail4: [0, 26, 0],
  ...hand('L', 40, 6),
  ...hand('R', 55, 0, 40),
};
export const CURL_POSE = CURL;

// Salir del pozo: sube encogido con la joroba por delante (levanta el suelo y
// revienta la cúpula), se despliega con los brazos arriba, se agarra al borde,
// se iza fuera, se pone en pie y ruge. Todo el viaje lo lleva 'root': la raíz
// del modelo está en la superficie, en el centro del cráter.
//   0     en el fondo, encogido (la joroba bajo el suelo de la cisterna)
//   1.0   la joroba asoma por el suelo (empieza a levantarlo)
//   4.0   la joroba llega a la cúpula
//   5.4   la cúpula revienta; se despliega
//   7.4   brazos arriba: se agarra al borde del cráter
//   10.4  se iza: el pecho por encima del borde, una rodilla arriba
//   12.2  en pie, todavía encorvado
//   12.8  ruge (golpe)
//   15    reposo
C.rise = clip(
  'rise',
  15,
  [
    K(0, { ...CURL, root: [0, -2850, 0] }),
    K(1.0, { ...CURL, root: [0, -2560, 0], chest: [14, 0, 0] }),
    K(4.0, { ...CURL, root: [0, -1500, 0], pelvis: [56, 0, 0], chest: [12, 0, 0], neck2: [20, 0, 0] }, 'linear'),
    K(5.4, { ...CURL, root: [0, -1180, 0], pelvis: [44, 0, 0], spine1: [16, 0, 0], spine2: [14, 0, 0], chest: [8, 0, 0], neck1: [4, 0, 0], neck2: [6, 0, 0], head: [0, 0, 0], armL: [-150, 0, 30], foreL: [-60, 0, 0], armR: [-146, 0, -30], foreR: [-60, 0, 0] }),
    K(7.4, { root: [0, -1020, 0], pelvis: [10, 0, 0], spine1: [10, 0, 0], spine2: [12, 0, 0], chest: [10, 0, 0], neck1: [-14, 0, 0], neck2: [-16, 0, 0], head: [-10, 0, 0], jaw: [24, 0, 0], armL: [-168, 0, 26], foreL: [-18, 0, 0], handL: [-20, 0, 0], armR: [-164, 0, -26], foreR: [-18, 0, 0], handR: [-20, 0, 0], legL: [-30, 0, 8], shinL: [40, 0, 0], legR: [-24, 0, -8], shinR: [36, 0, 0], ...hand('L', 50, 10), ...hand('R', 55, 0, 40) }, 'hold'),
    K(10.4, { root: [0, -420, 0], pelvis: [22, 0, 0], spine1: [20, 0, 0], spine2: [24, 0, 0], chest: [26, 0, 0], neck1: [-20, 0, 0], neck2: [-18, 0, 0], head: [-10, 0, 0], armL: [-40, 0, 44], foreL: [-58, 0, 0], handL: [44, 0, 0], armR: [-36, 0, -44], foreR: [-58, 0, 0], handR: [44, 0, 0], legL: [-92, 0, 10], shinL: [112, 0, 0], footL: [-10, 0, 0], legR: [-30, 0, -10], shinR: [52, 0, 0], ...hand('L', 4, 14), ...hand('R', 40, 0, 30) }),
    K(12.2, { root: [0, -40, 0], pelvis: [10, 0, 0], spine1: [8, 0, 0], spine2: [12, 0, 0], chest: [18, 0, 0], neck1: [8, 0, 0], neck2: [4, 0, 0], head: [0, 0, 0], armL: [-22, 0, 22], foreL: [-40, 0, 0], armR: [-12, 0, -16], foreR: [-30, 0, 0], legL: [-12, 0, 6], shinL: [16, 0, 0], legR: [-8, 0, -6], shinR: [12, 0, 0], ...hand('L', 50, 0) }, 'hold'),
    K(12.8, { root: [0, 20, 0], pelvis: [-6, 0, 0], spine2: [-8, 0, 0], chest: [-18, 0, 0], neck1: [-30, 0, 0], neck2: [-26, 0, 0], head: [-22, 0, 0], jaw: [42, 0, 0], ribL: [0, 34, 0], ribR: [0, -34, 0], clavL: [0, 0, 14], clavR: [0, 0, -14], armL: [-34, 0, 84], foreL: [-30, 0, 0], handL: [-20, 0, 0], armR: [-24, 0, -72], foreR: [-30, 0, 0], ...hand('L', -16, 14) }, 'snap'),
    K(14.0, { root: [0, 10, 0], pelvis: [-5, 0, 0], spine2: [-7, 0, 0], chest: [-16, 0, 0], neck1: [-28, 0, 0], neck2: [-24, 0, 0], head: [-20, 0, 0], jaw: [38, 0, 0], ribL: [0, 30, 0], ribR: [0, -30, 0], armL: [-30, 0, 78], foreL: [-28, 0, 0], armR: [-22, 0, -68], foreR: [-28, 0, 0], ...hand('L', -10, 12) }),
    K(15),
  ],
  { ground: false, lag: { chest: 0.08, neck2: 0.14, head: 0.2, armL: 0.12, foreL: 0.2, armR: 0.14, foreR: 0.22 }, events: [{ t: 1.0, name: 'heave' }, { t: 5.4, name: 'dome' }, { t: 7.4, name: 'rim' }, { t: 10.4, name: 'knee' }, { t: 12.8, name: 'roar' }] }
);

// ------------------------------------------------------------ la zancada
// Andar deprisa y pesado (dos pasos por ciclo, de unos seis metros): echado
// hacia delante, las rodillas dobladas, los brazos al revés que las piernas y
// la cabeza alta, buscando. Pisada izquierda en 0, derecha en 1,25.
{
  const strikeL = {
    root: [0, -30, 0],
    pelvis: [12, -9, -4],
    spine1: [8, 3, 1],
    spine2: [12, 4, 2],
    chest: [12, 8, 2],
    neck1: [-12, -4, 0],
    neck2: [-14, -4, 0],
    head: [-8, -3, 0],
    jaw: [14, 0, 0],
    legL: [-36, 8, 5],
    shinL: [10, 0, 0],
    footL: [22, 0, 0],
    legR: [24, 8, 1],
    shinR: [30, 0, 0],
    footR: [-24, 0, 0],
    armL: [16, 0, 8],
    foreL: [-18, 0, 0],
    armR: [-26, 0, -6],
    foreR: [-24, 0, 0],
    tail1: [0, 8, 0],
    tail2: [0, 18, 0],
  };
  const passL = {
    root: [0, 10, 0],
    pelvis: [10, -3, -1],
    spine1: [7, 1, 0],
    spine2: [11, 1, 1],
    chest: [10, 3, 0],
    neck1: [-12, -1, 0],
    neck2: [-13, -1, 0],
    head: [-7, -1, 0],
    jaw: [12, 0, 0],
    legL: [-4, 2, 3],
    shinL: [14, 0, 0],
    footL: [-6, 0, 0],
    legR: [-26, 2, -1],
    shinR: [74, 0, 0],
    footR: [20, 0, 0],
    armL: [2, 0, 7],
    foreL: [-16, 0, 0],
    armR: [-12, 0, -5],
    foreR: [-14, 0, 0],
    tail1: [0, 3, 0],
  };
  C.march = clip('march', 2.5, [K(0, strikeL), K(0.62, passL), K(1.25, mirror(strikeL)), K(1.87, mirror(passL)), K(2.5, strikeL)], { loop: true, events: [{ t: 0.02, name: 'stepL' }, { t: 1.27, name: 'stepR' }] });
  // (el pie de apoyo recorre unos 3,4 m en 0,6 s: así no patina)
  C.march.vel = 5.5;
}

// ------------------------------------------------------------ la muralla
// Atraviesa la muralla con el hombro: se encoge girando el hombro izquierdo
// hacia delante (el antebrazo cruzado delante, de escudo, la cabeza metida
// detrás), se lanza empujando con la pierna de atrás, revienta el muro
// ('bash') y lo atraviesa dando tumbos, dos pasos, hasta enderezarse.
C.bash = clip(
  'bash',
  3.4,
  [
    K(0, { root: [0, -30, 0], pelvis: [12, 9, 4], spine2: [12, -4, -2], chest: [12, -8, -2], neck2: [-14, 4, 0], head: [-8, 3, 0], legR: [-36, -8, -5], shinR: [10, 0, 0], footR: [22, 0, 0], legL: [24, -8, -1], shinL: [30, 0, 0], footL: [-24, 0, 0], armR: [16, 0, -8], armL: [-26, 0, 6], foreL: [-24, 0, 0] }),
    K(0.55, { root: [0, -110, 0], pelvis: [16, -14, 0], spine1: [10, -6, 0], spine2: [14, -10, 0], chest: [16, -22, 6], neck1: [-6, 10, 0], neck2: [-8, 14, 0], head: [4, 16, 0], jaw: [22, 0, 0], clavL: [0, -14, 0], armL: [-40, 0, 6], foreL: [-110, 0, 0], handL: [10, 0, 0], armR: [10, 0, -30], foreR: [-30, 0, 0], legL: [-30, 0, 8], shinL: [60, 0, 0], footL: [-10, 0, 0], legR: [24, 0, -6], shinR: [40, 0, 0], footR: [-20, 0, 0], tail1: [0, -10, 0], tail2: [0, 10, 0], ...hand('L', 80, 0) }, 'hold'),
    K(1.0, { root: [0, -150, 0], pelvis: [26, -20, 0], spine1: [14, -8, 0], spine2: [18, -12, 0], chest: [22, -28, 8], neck1: [-14, 12, 0], neck2: [-16, 16, 0], head: [-6, 18, 0], jaw: [30, 0, 0], clavL: [0, -22, 0], armL: [-50, 0, 4], foreL: [-118, 0, 0], handL: [10, 0, 0], armR: [24, 0, -40], foreR: [-20, 0, 0], legL: [-44, 0, 8], shinL: [56, 0, 0], footL: [-8, 0, 0], legR: [36, 0, -4], shinR: [14, 0, 0], footR: [-30, 0, 0], tail1: [0, -16, 0], tail2: [0, 4, 0], ...hand('L', 84, 0) }, 'strike', 1.3),
    K(1.5, { root: [0, -130, 0], pelvis: [24, -12, 0], spine1: [12, -4, 0], spine2: [16, -8, 0], chest: [20, -18, 6], neck1: [-12, 8, 0], neck2: [-14, 10, 0], head: [-8, 10, 0], jaw: [26, 0, 0], clavL: [0, -12, 0], armL: [-60, 0, 20], foreL: [-80, 0, 0], armR: [-10, 0, -36], foreR: [-30, 0, 0], legR: [-30, 0, -6], shinR: [70, 0, 0], footR: [10, 0, 0], legL: [14, 0, 6], shinL: [30, 0, 0], footL: [-16, 0, 0], ...hand('L', 50, 6) }),
    K(2.2, { root: [0, -90, 0], pelvis: [18, -4, 0], spine2: [12, -2, 0], chest: [16, -6, 2], neck1: [-14, 2, 0], neck2: [-14, 2, 0], head: [-10, 0, 0], jaw: [20, 0, 0], armL: [-30, 0, 40], foreL: [-30, 0, 0], armR: [-20, 0, -40], foreR: [-30, 0, 0], legR: [-26, 0, -6], shinR: [20, 0, 0], footR: [20, 0, 0], legL: [26, 0, 6], shinL: [36, 0, 0], footL: [-24, 0, 0], ...hand('L', 30, 8) }, 'settle'),
    K(2.8, { root: [0, -50, 0], pelvis: [12, 4, 0], spine2: [10, 0, 0], chest: [12, 2, 0], neck2: [-12, 0, 0], head: [-8, 0, 0], armL: [-14, 0, 20], foreL: [-24, 0, 0], armR: [-12, 0, -24], foreR: [-20, 0, 0], legL: [-20, 0, 6], shinL: [16, 0, 0], footL: [16, 0, 0], legR: [18, 0, -4], shinR: [30, 0, 0], footR: [-18, 0, 0] }, 'settle'),
    K(3.4, { root: [0, -20, 0], pelvis: [8, 0, 0], spine2: [9, 0, 0], chest: [8, 0, 0], legL: [-8, 0, 4], shinL: [12, 0, 0], legR: [2, 0, -4], shinR: [16, 0, 0] }),
  ],
  { lag: { chest: 0.04, neck2: 0.07, head: 0.1, armL: 0.06, foreL: 0.09, armR: 0.1, foreR: 0.14 }, events: [{ t: 1.0, name: 'bash' }, { t: 2.2, name: 'stepR' }, { t: 2.8, name: 'stepL' }] }
);
C.bash.move = [
  [0, 0],
  [0.55, 0.8],
  [1.0, 3.8],
  [1.5, 8.0],
  [2.2, 12.5],
  [2.8, 16.0],
  [3.4, 18.0],
];

// ------------------------------------------------------------ la cabecera
// Abre el tejado de la cabecera: alza los dos puños sobre la cabeza
// (rugiendo), los descarga sobre el tejado ('punch': el golpe tira al que va
// en la joroba por encima de su cabeza), hinca los dedos, tira y lo abre de
// par en par ('rip'), y se echa sobre el agujero. (Los puños los lleva el
// guion al tejado, con IK.)
const PEER = { pelvis: [10, 0, 0], spine1: [6, 0, 0], spine2: [8, 0, 0], chest: [10, 0, 0], neck1: [-4, 0, 0], neck2: [0, 0, 0], head: [12, 0, 0], jaw: [18, 0, 0], ribL: [0, 14, 0], ribR: [0, -14, 0], clavL: [0, 0, 6], clavR: [0, 0, -6], armL: [-70, 0, 40], foreL: [-70, 0, 0], handL: [40, 0, 0], armR: [-70, 0, -40], foreR: [-70, 0, 0], handR: [40, 0, 0], legL: [-14, 0, 8], shinL: [24, 0, 0], footL: [-6, 0, 0], legR: [-8, 0, -8], shinR: [20, 0, 0], footR: [-6, 0, 0], ...hand('L', 34, 10), ...hand('R', 40, 0, 30) };
export const PEER_POSE = PEER;
C.tear = clip(
  'tear',
  5.0,
  [
    K(0),
    K(1.0, { pelvis: [-2, 0, 0], spine2: [-4, 0, 0], chest: [-6, 0, 0], neck1: [-12, 0, 0], neck2: [-8, 0, 0], head: [-6, 0, 0], jaw: [34, 0, 0], ribL: [0, 24, 0], ribR: [0, -24, 0], clavL: [0, 0, 16], clavR: [0, 0, -16], armL: [-150, 0, 16], foreL: [-30, 0, 0], handL: [-20, 0, 0], armR: [-146, 0, -16], foreR: [-34, 0, 0], handR: [-20, 0, 0], legL: [-6, 0, 6], shinL: [10, 0, 0], legR: [-4, 0, -6], shinR: [8, 0, 0], ...hand('L', 82, 0), ...hand('R', 82, 0, 60) }, 'hold'),
    K(1.35, { pelvis: [8, 0, 0], spine1: [6, 0, 0], spine2: [8, 0, 0], chest: [10, 0, 0], neck1: [-8, 0, 0], neck2: [-10, 0, 0], head: [-8, 0, 0], jaw: [28, 0, 0], clavL: [0, 0, 6], clavR: [0, 0, -6], armL: [-125, 0, 8], foreL: [-10, 0, 0], handL: [10, 0, 0], armR: [-125, 0, -8], foreR: [-10, 0, 0], handR: [10, 0, 0], legL: [-20, 0, 6], shinL: [34, 0, 0], footL: [-8, 0, 0], legR: [-8, 0, -6], shinR: [26, 0, 0], footR: [-8, 0, 0], ...hand('L', 84, 0), ...hand('R', 84, 0, 60) }, 'strike', 1.4),
    K(1.9, { pelvis: [9, 0, 0], spine1: [6, 0, 0], spine2: [8, 0, 0], chest: [11, 0, 0], neck1: [-8, 0, 0], neck2: [-10, 0, 0], head: [-6, 0, 0], jaw: [24, 0, 0], armL: [-124, 0, 10], foreL: [-12, 0, 0], handL: [16, 0, 0], armR: [-124, 0, -10], foreR: [-12, 0, 0], handR: [16, 0, 0], legL: [-20, 0, 6], shinL: [36, 0, 0], footL: [-8, 0, 0], legR: [-8, 0, -6], shinR: [28, 0, 0], footR: [-8, 0, 0], ...hand('L', 50, 4), ...hand('R', 50, 0, 40) }, 'settle'),
    K(2.6, { pelvis: [4, 0, 0], spine1: [4, 0, 0], spine2: [6, 0, 0], chest: [4, 0, 0], neck1: [-10, 0, 0], neck2: [-10, 0, 0], head: [-8, 0, 0], jaw: [30, 0, 0], ribL: [0, 20, 0], ribR: [0, -20, 0], armL: [-112, 16, 30], foreL: [-50, 0, 0], handL: [10, 0, 0], armR: [-108, -16, -30], foreR: [-54, 0, 0], handR: [10, 0, 0], legL: [-16, 0, 8], shinL: [30, 0, 0], legR: [-6, 0, -8], shinR: [24, 0, 0], ...hand('L', 70, 2), ...hand('R', 70, 0, 50) }, 'hold'),
    K(3.1, { pelvis: [0, 0, 0], spine1: [2, 0, 0], spine2: [2, 0, 0], chest: [-2, 0, 0], neck1: [-16, 0, 0], neck2: [-14, 0, 0], head: [-12, 0, 0], jaw: [40, 0, 0], ribL: [0, 30, 0], ribR: [0, -30, 0], clavL: [0, 0, 18], clavR: [0, 0, -18], armL: [-110, 30, 64], foreL: [-20, 0, 0], handL: [-20, 0, 0], armR: [-106, -30, -64], foreR: [-24, 0, 0], handR: [-20, 0, 0], legL: [-12, 0, 8], shinL: [22, 0, 0], legR: [-4, 0, -8], shinR: [18, 0, 0], ...hand('L', -10, 14), ...hand('R', -10, 0, 0) }, 'snap'),
    K(4.0, { ...PEER, neck1: [-2, 0, 0], head: [14, 0, 0], jaw: [40, 0, 0], armL: [-80, 0, 40], foreL: [-60, 0, 0], armR: [-76, 0, -40], foreR: [-60, 0, 0] }),
    K(5.0, PEER),
  ],
  { lag: { chest: 0.05, neck2: 0.09, head: 0.12, armL: 0.06, foreL: 0.1, handL: 0.14, armR: 0.07, foreR: 0.11, handR: 0.15 }, events: [{ t: 1.3, name: 'punch' }, { t: 3.0, name: 'rip' }] }
);
// echado sobre el agujero, mirando dentro (respira, ruge bajo)
C.peer = clip(
  'peer',
  3.0,
  [K(0, PEER), K(1.5, { ...PEER, chest: [12, 2, 0], spine2: [9, 0, 0], jaw: [26, 0, 0], ribL: [0, 20, 0], ribR: [0, -20, 0], head: [14, 3, 0] }), K(3.0, PEER)],
  { loop: true }
);

// ------------------------------------------------------------ la nave
// Un paso dentro de la nave, encorvado, reventando lo que pisa: alza la
// rodilla, planta el pie delante ('stepL', 'crush') y arrastra el otro.
const wadeL = [
  K(0, PEER),
  K(0.7, { ...PEER, pelvis: [14, 6, 0], chest: [10, -4, 0], legL: [-70, 0, 10], shinL: [80, 0, 0], footL: [-10, 0, 0], legR: [-6, 0, -8], shinR: [24, 0, 0], armL: [-90, 0, 30], foreL: [-40, 0, 0], armR: [-84, 0, -30], foreR: [-44, 0, 0] }, 'hold'),
  K(1.1, { ...PEER, pelvis: [16, 0, 0], chest: [12, 2, 0], legL: [-34, 0, 8], shinL: [20, 0, 0], footL: [16, 0, 0], legR: [24, 0, -6], shinR: [30, 0, 0], footR: [-20, 0, 0], armL: [-76, 0, 36], foreL: [-56, 0, 0], armR: [-72, 0, -36], foreR: [-56, 0, 0] }, 'snap'),
  K(2.0, { ...PEER, legL: [-10, 0, 8], shinL: [24, 0, 0], legR: [4, 0, -6], shinR: [30, 0, 0] }, 'settle'),
];
C.wadeL = clip('wadeL', 2.0, wadeL, { lag: { chest: 0.05, head: 0.1, armL: 0.08, armR: 0.1 }, events: [{ t: 1.1, name: 'stepL' }, { t: 1.1, name: 'crush' }] });
C.wadeR = clip(
  'wadeR',
  2.0,
  wadeL.map(([t, p, e, k]) => [t, mirror(p), e, k]),
  { lag: { chest: 0.05, head: 0.1, armL: 0.1, armR: 0.08 }, events: [{ t: 1.1, name: 'stepR' }, { t: 1.1, name: 'crush' }] }
);
C.wadeL.move = C.wadeR.move = [
  [0, 0],
  [0.7, 1.2],
  [1.1, 5.4],
  [2.0, 7.0],
];

// Manotazo: alza la izquierda abierta por encima de la cabeza y la descarga
// de plano contra el suelo ('smash'); la deja un instante, con los dedos
// clavados, y la retira. (La mano la lleva el guion, con IK, adonde está el
// jugador.)
C.smash = clip(
  'smash',
  2.6,
  [
    K(0, PEER),
    K(0.75, { ...PEER, pelvis: [8, 0, 0], chest: [4, 10, 0], neck1: [-8, -6, 0], head: [-6, -8, 0], jaw: [30, 0, 0], clavL: [0, 0, 20], armL: [-165, 20, 30], foreL: [-40, 0, 0], handL: [-30, 0, 0], legR: [-20, 0, -8], shinR: [34, 0, 0], ...hand('L', -10, 14) }, 'hold'),
    K(1.05, { ...PEER, pelvis: [26, 0, 0], spine1: [12, 0, 0], spine2: [14, 0, 0], chest: [18, 0, 0], neck1: [-20, 0, 0], neck2: [-14, 0, 0], head: [-4, 0, 0], jaw: [36, 0, 0], clavL: [0, 0, 4], armL: [-90, -10, 10], foreL: [-6, 0, 0], handL: [30, 0, 0], legL: [-50, 0, 8], shinL: [70, 0, 0], footL: [-10, 0, 0], legR: [26, 0, -6], shinR: [30, 0, 0], footR: [-26, 0, 0], ...hand('L', -6, 16) }, 'strike', 1.4),
    K(1.7, { ...PEER, pelvis: [25, 0, 0], spine1: [12, 0, 0], spine2: [14, 0, 0], chest: [17, 0, 0], neck1: [-18, 0, 0], neck2: [-12, 0, 0], head: [-4, 0, 0], jaw: [26, 0, 0], armL: [-90, -10, 12], foreL: [-8, 0, 0], handL: [30, 0, 0], legL: [-48, 0, 8], shinL: [68, 0, 0], footL: [-10, 0, 0], legR: [24, 0, -6], shinR: [30, 0, 0], footR: [-24, 0, 0], ...hand('L', 30, 12) }, 'settle'),
    K(2.6, PEER),
  ],
  { lag: { chest: 0.04, armL: 0.06, foreL: 0.1, handL: 0.14 }, events: [{ t: 1.0, name: 'smash' }] }
);
C.smash.move = [
  [0, 0],
  [0.75, 0.3],
  [1.05, 1.8],
  [2.6, 2.2],
];

// Te atrapa: abre la izquierda a un lado, se lanza con un paso largo, casi
// tumbado, barre el suelo con la mano y la cierra ('catch'); se incorpora
// con el puño cerrado.
const CATCH_END = { pelvis: [16, 0, 0], spine1: [8, 0, 0], spine2: [10, 0, 0], chest: [8, 6, 0], neck1: [-6, 0, 0], neck2: [-4, 0, 0], head: [-6, -6, 0], jaw: [24, 0, 0], clavL: [0, 0, 8], armL: [-96, -20, 30], foreL: [-66, 0, 0], handL: [10, 0, 0], armR: [-50, 0, -34], foreR: [-46, 0, 0], handR: [26, 0, 0], legL: [-4, 0, 8], shinL: [30, 0, 0], legR: [-24, 0, -8], shinR: [36, 0, 0], ...hand('L', 74, 2) };
const LUNGE = { pelvis: [34, 0, 0], spine1: [14, 0, 0], spine2: [16, 0, 0], chest: [18, 10, 0], neck1: [-26, 0, 0], neck2: [-18, 0, 0], head: [-8, -6, 0], jaw: [34, 0, 0], clavL: [0, 0, 6], armL: [-100, -14, 10], foreL: [-4, 0, 0], handL: [24, 0, 0], armR: [-40, 0, -40], foreR: [-40, 0, 0], legR: [-62, 0, -8], shinR: [92, 0, 0], footR: [-20, 0, 0], legL: [36, 0, 6], shinL: [30, 0, 0], footL: [-30, 0, 0] };
C.catch = clip(
  'catch',
  2.4,
  [
    K(0, PEER),
    K(0.5, { ...PEER, pelvis: [14, -10, 0], chest: [8, -16, 0], head: [-8, 10, 0], clavL: [0, 0, 16], armL: [-60, 30, 70], foreL: [-40, 0, 0], handL: [-20, 0, 0], legR: [-30, 0, -8], shinR: [70, 0, 0], footR: [0, 0, 0], legL: [-6, 0, 8], shinL: [30, 0, 0], ...hand('L', -14, 16) }, 'hold'),
    K(0.9, { ...LUNGE, ...hand('L', -14, 16) }, 'strike', 1.3),
    K(1.05, { ...LUNGE, chest: [19, 12, 0], ...hand('L', 76, 2) }, 'snap'),
    K(1.6, { ...LUNGE, pelvis: [30, 0, 0], spine1: [12, 0, 0], spine2: [14, 0, 0], chest: [14, 8, 0], neck1: [-20, 0, 0], armL: [-86, -20, 20], foreL: [-30, 0, 0], handL: [14, 0, 0], legR: [-50, 0, -8], shinR: [80, 0, 0], legL: [26, 0, 6], shinL: [30, 0, 0], ...hand('L', 74, 2) }, 'settle'),
    K(2.4, CATCH_END),
  ],
  { lag: { chest: 0.05, armL: 0.06, foreL: 0.1, handL: 0.13 }, events: [{ t: 0.9, name: 'stepR' }, { t: 1.0, name: 'catch' }] }
);
C.catch.move = [
  [0, 0],
  [0.5, 0.5],
  [0.9, 5.0],
  [1.6, 5.8],
  [2.4, 6.2],
];

// ------------------------------------------------------------ el acto 2
// Te alza hasta su cara (acaba en la pose de 'hold', la de la pelea vieja).
const HOLD = { root: [0, -20, 0], pelvis: [4, 6, 0], spine2: [6, 6, 0], chest: [-4, 12, 0], neck1: [-10, -4, 0], neck2: [-12, -8, 0], head: [-8, -12, 0], jaw: [26, 0, 0], clavL: [0, 0, 10], armL: [-112, -26, 30], foreL: [-84, 0, 0], handL: [6, 0, 0], ...hand('L', 70, 2) };
C.lift = clip(
  'lift',
  3.2,
  [K(0, CATCH_END), K(1.6, { ...HOLD, root: [0, -70, 0], pelvis: [14, 4, 0], spine2: [10, 4, 0], chest: [8, 8, 0], neck1: [-4, -2, 0], head: [-10, -8, 0], armL: [-100, -24, 30], foreL: [-70, 0, 0] }), K(3.2, HOLD)],
  { lag: { chest: 0.06, armL: 0.08, foreL: 0.12, head: 0.14 } }
);
// te ruge a la cara: echa la cabeza atrás, toma aire y ruge encima del puño
C.roarClose = clip(
  'roarClose',
  3.2,
  [
    K(0, HOLD),
    K(0.7, { ...HOLD, chest: [-10, 12, 0], neck1: [-20, -4, 0], neck2: [-20, -8, 0], head: [-16, -12, 0], jaw: [10, 0, 0], ribL: [0, 30, 0], ribR: [0, -30, 0] }, 'hold'),
    K(1.0, { ...HOLD, chest: [2, 10, 0], neck1: [6, -6, 0], neck2: [0, -10, 0], head: [4, -12, 0], jaw: [46, 0, 0], ribL: [0, 36, 0], ribR: [0, -36, 0], armL: [-116, -30, 26], foreL: [-96, 0, 0] }, 'snap'),
    K(2.4, { ...HOLD, chest: [0, 10, 0], neck1: [4, -6, 0], neck2: [-2, -10, 0], head: [2, -12, 0], jaw: [44, 0, 0], ribL: [0, 34, 0], ribR: [0, -34, 0], armL: [-116, -30, 26], foreL: [-96, 0, 0] }),
    K(3.2, HOLD),
  ],
  { events: [{ t: 1.0, name: 'roar' }] }
);
// y te tira hacia el sur, por encima de la ciudad: gira el cuerpo, echa el
// puño atrás por encima del hombro y lanza con un paso ('throw')
C.hurl = clip(
  'hurl',
  2.6,
  [
    K(0, HOLD),
    K(0.9, { ...HOLD, root: [0, -40, 0], pelvis: [0, -20, 0], spine2: [-2, -12, 0], chest: [-10, -30, 0], neck1: [-8, 10, 0], neck2: [-10, 10, 0], head: [-6, 12, 0], jaw: [30, 0, 0], clavL: [0, 0, 20], armL: [-150, -10, 50], foreL: [-90, 0, 0], handL: [-20, 0, 0], legR: [-24, 0, -6], shinR: [20, 0, 0], legL: [16, 0, 6], shinL: [24, 0, 0], footL: [-14, 0, 0] }, 'hold'),
    K(1.25, { ...HOLD, root: [0, -60, 0], pelvis: [14, 20, 0], spine2: [14, 12, 0], chest: [24, 26, 0], neck1: [-10, -8, 0], neck2: [-12, -10, 0], head: [-10, -10, 0], jaw: [34, 0, 0], clavL: [0, 0, 10], armL: [-110, -10, 10], foreL: [-6, 0, 0], handL: [-20, 0, 0], legL: [-30, 0, 8], shinL: [30, 0, 0], footL: [10, 0, 0], legR: [12, 0, -6], shinR: [24, 0, 0], ...hand('L', -14, 14) }, 'strike', 1.5),
    K(1.8, { ...HOLD, root: [0, -60, 0], pelvis: [16, 20, 0], spine2: [16, 12, 0], chest: [30, 20, 0], neck1: [-6, -8, 0], neck2: [-8, -10, 0], head: [-10, -10, 0], jaw: [26, 0, 0], armL: [-30, 10, 20], foreL: [-20, 0, 0], handL: [10, 0, 0], legL: [-30, 0, 8], shinL: [30, 0, 0], legR: [12, 0, -6], shinR: [24, 0, 0], ...hand('L', 20, 8) }, 'settle'),
    K(2.6, { root: [0, -20, 0], pelvis: [8, 8, 0], chest: [10, 6, 0], legL: [-14, 0, 6], shinL: [16, 0, 0], legR: [4, 0, -4], shinR: [16, 0, 0] }),
  ],
  { lag: { chest: 0.04, armL: 0.06, foreL: 0.1, handL: 0.13 }, events: [{ t: 1.18, name: 'throw' }, { t: 1.25, name: 'stepL' }] }
);
C.hurl.move = [
  [0, 0],
  [0.9, -0.3],
  [1.25, 1.5],
  [2.6, 2.2],
];
