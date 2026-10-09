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
import { clip } from '../../entities/rig.js';
import { IDLE, hand } from './turiferario_anim.js';

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
