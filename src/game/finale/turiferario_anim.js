// Animaciones del Turiferario coloso.
//
// Cada clave parte de la pose de reposo (encorvado, la campana colgando) y
// cambia sólo lo que se mueve: así ninguna articulación vuelve sola a la
// postura de montaje entre dos claves. Los golpes siguen la estructura de
// uno de verdad: anticipación que frena ('hold'), golpe que cruza a toda
// velocidad ('strike'/'snap') y final que frena hasta parar ('settle'), con
// retrasos escalonados (la cadera empieza, el pecho la sigue, el brazo
// después y la mano llega la última).
//
// Ejes (huesos sin giro de reposo): +X dobla hacia delante lo que apunta
// arriba (y hacia atrás lo que cuelga), +Y gira hacia su izquierda, +Z
// abre hacia su izquierda (el brazo izquierdo se separa con +Z; el derecho,
// con −Z). 'root' (cm) mueve la pelvis.
import { clip } from '../../entities/rig.js';
import { ColossusRig } from './colossus_rig.js';

const FING = ['f1', 'f2', 'f3', 'f4'];
// dedos de una mano: curl (grados por falange), abiertos (abanico)
export function hand(S, curl, spread = 0, thumb = curl) {
  const o = {};
  FING.forEach((f, i) => {
    const sp = (i - 1.5) * spread * (S === 'L' ? 1 : -1);
    o[f + S] = [curl * 0.8, 0, sp];
    o[f + S + 'b'] = [curl, 0, 0];
  });
  o['th' + S] = [thumb * 0.6, 0, (S === 'L' ? -1 : 1) * 10];
  o['th' + S + 'b'] = [thumb * 0.8, 0, 0];
  return o;
}

// la pose de reposo: encorvado, la cabeza adelantada buscando, la izquierda
// con los dedos medio cerrados, la derecha agarrando la cadena
export const IDLE = {
  root: [0, 0, 0],
  pelvis: [4, 0, 0],
  spine1: [5, 0, 0],
  spine2: [7, 0, 0],
  chest: [5, 0, 0],
  neck1: [-8, 0, 0],
  neck2: [-8, 0, 0],
  head: [-5, 0, 0],
  jaw: [8, 0, 0],
  ribL: [0, 10, 0],
  ribR: [0, -10, 0],
  clavL: [0, 0, 0],
  clavR: [0, 0, 0],
  armL: [-8, 0, 5],
  foreL: [-14, 0, 0],
  handL: [10, 0, 0],
  armR: [-4, 0, -4],
  foreR: [-10, 0, 0],
  handR: [0, 0, 0],
  legL: [-5, 0, 2],
  shinL: [9, 0, 0],
  footL: [-4, 0, 0],
  toeL: [0, 0, 0],
  legR: [-5, 0, -2],
  shinR: [9, 0, 0],
  footR: [-4, 0, 0],
  toeR: [0, 0, 0],
  // la cola, curvada hacia su izquierda sobre el empedrado
  tail1: [0, 6, 0],
  tail2: [0, 16, 0],
  tail3: [0, 20, 0],
  tail4: [0, 18, 0],
  tail5: [0, 12, 0],
  ...hand('L', 18, 3),
  ...hand('R', 55, 0, 40),
};
const K = (t, o = {}, ease, k) => [t, { ...IDLE, ...o }, ease, k ? { k } : undefined];
// la pose del otro lado (izquierda por derecha)
export const mirror = (o) => {
  const out = {};
  for (const [j, v] of Object.entries(o)) {
    if (j.startsWith('s_')) {
      out[j] = v.slice();
      continue;
    }
    let n = j;
    if (/L(b|2)?$/.test(j) || /L$/.test(j)) n = j.replace(/L(b|2)?$/, (m, a) => 'R' + (a || ''));
    else if (/R(b|2)?$/.test(j)) n = j.replace(/R(b|2)?$/, (m, a) => 'L' + (a || ''));
    out[n] = j === 'root' ? [-v[0], v[1], v[2]] : [v[0], -v[1], -v[2]];
  }
  return out;
};

// ------------------------------------------------------------ bucles
export const TUR_CLIPS = {};
const C = TUR_CLIPS;

// reposo: respira (el costillar se abre y se cierra), la cabeza se mece
C.idle = clip(
  'idle',
  4.4,
  [
    K(0),
    K(1.4, { chest: [3, 1, 0], spine2: [6, 0, 0], neck2: [-10, 2, 2], head: [-4, 3, -2], ribL: [0, 14, 0], ribR: [0, -14, 0], jaw: [12, 0, 0], armL: [-9, 0, 6], foreL: [-17, 0, 0], ...hand('L', 24, 4) }),
    K(2.9, { chest: [6, -1, 0], neck2: [-7, -2, -1], head: [-6, -2, 1], ribL: [0, 9, 0], ribR: [0, -9, 0], armL: [-7, 0, 5] }),
    K(4.4),
  ],
  { loop: true }
);

// andar: paso pesado, arrastrando la campana y la cola. Dos pasos por ciclo
// (4,2 m por paso). Pisada izquierda en 0, derecha en 1,7.
const WALK_STRIDE = 4.2;
export const WALK = { dur: 3.4, stride: WALK_STRIDE, speed: (WALK_STRIDE * 2) / 3.4 };
{
  // la pelvis adelanta la cadera de la pierna que avanza y cae hacia el lado
  // de la que va en el aire; las piernas compensan ese giro (los pies van
  // rectos) y el pecho gira al revés (los hombros contra las caderas)
  const strikeL = {
    pelvis: [6, -6, -3],
    spine1: [5, 2, 1],
    spine2: [8, 3, 2],
    chest: [6, 5, 1],
    neck2: [-9, -3, 0],
    head: [-5, -2, 0],
    legL: [-26, 6, 5],
    shinL: [6, 0, 0],
    footL: [14, 0, 0],
    legR: [17, 6, 1],
    shinR: [24, 0, 0],
    footR: [-18, 0, 0],
    armL: [6, 0, 6],
    foreL: [-10, 0, 0],
    armR: [-12, 0, -5],
    tail1: [0, 4, 0],
  };
  const passL = {
    pelvis: [4, -2, -1],
    spine1: [5, 1, 0],
    spine2: [7, 1, 1],
    chest: [5, 2, 0],
    legL: [-4, 2, 3],
    shinL: [12, 0, 0],
    footL: [-4, 0, 0],
    legR: [-14, 2, -1],
    shinR: [58, 0, 0],
    footR: [16, 0, 0],
    armL: [-4, 0, 6],
    armR: [-6, 0, -4],
    tail1: [0, 1, 0],
  };
  C.walk = clip(
    'walk',
    WALK.dur,
    [K(0, strikeL), K(0.85, passL), K(1.7, mirror(strikeL)), K(2.55, mirror(passL)), K(3.4, strikeL)],
    { loop: true, events: [{ t: 0.02, name: 'stepL' }, { t: 1.72, name: 'stepR' }] }
  );
}

// ------------------------------------------------------------ golpes
// barrido de campana a ras de suelo: el brazo de la cadena, abierto y bajo,
// va de atrás (la campana arrastrando) a su izquierda pasando por delante.
// Los brazos se abren con Z (la altura) y barren con Y (el giro alrededor
// del cuerpo): así la mano dibuja un arco limpio.
C.sweep = clip(
  'sweep',
  3.9,
  [
    K(0),
    K(1.25, { root: [0, -40, 0], pelvis: [4, -16, 0], spine1: [6, -6, 0], spine2: [8, -10, 0], chest: [6, -14, 0], neck1: [-8, 8, 0], neck2: [-12, 14, 0], head: [-5, 10, 0], armR: [-10, -40, -55], foreR: [-26, 0, 0], handR: [0, 0, -10], armL: [-36, 0, 34], foreL: [-30, 0, 0], legL: [-16, 0, 10], shinL: [22, 0, 0], footL: [-6, 0, 0], legR: [6, 0, -10], shinR: [16, 0, 0] }, 'hold'),
    K(1.8, { root: [0, -60, 0], pelvis: [8, 18, 0], spine1: [8, 8, 0], spine2: [10, 12, 0], chest: [10, 16, 0], neck1: [-8, -8, 0], neck2: [-10, -10, 0], head: [-6, -8, 0], armR: [-14, 70, -50], foreR: [-10, 0, 0], handR: [0, 0, 8], armL: [-18, 0, 52], foreL: [-20, 0, 0], legL: [-8, 0, 10], shinL: [26, 0, 0], footL: [-8, 0, 0], legR: [-4, 0, -10], shinR: [12, 0, 0] }, 'strike', 1.4),
    K(2.5, { root: [0, -50, 0], pelvis: [8, 26, 0], spine1: [8, 10, 0], spine2: [10, 16, 0], chest: [10, 22, 0], neck1: [-8, -10, 0], neck2: [-8, -14, 0], head: [-6, -10, 0], armR: [-22, 112, -42], foreR: [-34, 0, 0], handR: [0, 0, 16], armL: [-14, 0, 40], foreL: [-18, 0, 0], legL: [-6, 0, 8], shinL: [22, 0, 0], legR: [-2, 0, -8], shinR: [12, 0, 0] }, 'settle'),
    K(3.9),
  ],
  { lag: { chest: 0.05, neck2: 0.08, armR: 0.09, foreR: 0.14, handR: 0.2 }, events: [{ t: 1.6, name: 'swing' }] }
);

// mazazo: la alza sobre la cabeza y la descarga delante; se queda clavada
C.slam = clip(
  'slam',
  2.9,
  [
    K(0),
    K(1.55, { root: [0, 30, 0], pelvis: [-4, 0, 0], spine1: [-2, 0, 0], spine2: [-8, 0, 0], chest: [-14, 0, 0], neck1: [-18, 0, 0], neck2: [-14, 0, 0], head: [-10, 0, 0], armR: [-172, 6, -14], foreR: [-22, 0, 0], handR: [-10, 0, 0], armL: [-46, 0, 40], foreL: [-28, 0, 0], legL: [-10, 0, 10], shinL: [12, 0, 0], legR: [-6, 0, -10], shinR: [12, 0, 0], ribL: [0, 16, 0], ribR: [0, -16, 0] }, 'hold'),
    K(2.05, { root: [0, -110, 0], pelvis: [10, 0, 0], spine1: [12, 0, 0], spine2: [18, 0, 0], chest: [32, 0, 0], neck1: [6, 0, 0], neck2: [-4, 0, 0], head: [-14, 0, 0], armR: [-48, 4, -6], foreR: [-6, 0, 0], handR: [16, 0, 0], armL: [-30, 0, 32], foreL: [-22, 0, 0], legL: [-32, 0, 8], shinL: [44, 0, 0], footL: [-10, 0, 0], legR: [12, 0, -8], shinR: [30, 0, 0], footR: [-12, 0, 0] }, 'strike', 1.6),
    K(2.9, { root: [0, -100, 0], pelvis: [10, 0, 0], spine1: [11, 0, 0], spine2: [17, 0, 0], chest: [30, 0, 0], neck1: [4, 0, 0], neck2: [-4, 0, 0], head: [-16, 0, 0], armR: [-50, 4, -6], foreR: [-8, 0, 0], handR: [14, 0, 0], armL: [-28, 0, 30], foreL: [-22, 0, 0], legL: [-30, 0, 8], shinL: [42, 0, 0], footL: [-10, 0, 0], legR: [11, 0, -8], shinR: [28, 0, 0], footR: [-12, 0, 0] }, 'settle'),
  ],
  { lag: { chest: 0.04, armR: 0.07, foreR: 0.11, handR: 0.15 }, events: [{ t: 2.05, name: 'impact' }] }
);
// clavada: tira de la cadena sin soltarla (bucle mientras la campana sigue en el suelo)
C.stuck = clip(
  'stuck',
  2.0,
  [
    K(0, { root: [0, -100, 0], pelvis: [10, 0, 0], spine1: [11, 0, 0], spine2: [17, 0, 0], chest: [30, 0, 0], neck2: [-4, 0, 0], head: [-16, 0, 0], armR: [-50, 4, -6], foreR: [-8, 0, 0], handR: [14, 0, 0], armL: [-28, 0, 30], legL: [-30, 0, 8], shinL: [42, 0, 0], legR: [11, 0, -8], shinR: [28, 0, 0] }),
    K(1.0, { root: [0, -90, 0], pelvis: [6, 0, 0], spine1: [8, 0, 0], spine2: [14, 0, 0], chest: [24, -4, 0], neck2: [-10, 4, 0], head: [-12, 0, 0], armR: [-58, 4, -8], foreR: [-14, 0, 0], handR: [10, 0, 0], armL: [-24, 0, 36], legL: [-28, 0, 8], shinL: [40, 0, 0], legR: [10, 0, -8], shinR: [26, 0, 0] }),
    K(2.0, { root: [0, -100, 0], pelvis: [10, 0, 0], spine1: [11, 0, 0], spine2: [17, 0, 0], chest: [30, 0, 0], neck2: [-4, 0, 0], head: [-16, 0, 0], armR: [-50, 4, -6], foreR: [-8, 0, 0], handR: [14, 0, 0], armL: [-28, 0, 30], legL: [-30, 0, 8], shinL: [42, 0, 0], legR: [11, 0, -8], shinR: [28, 0, 0] }),
  ],
  { loop: true }
);
// arranca la campana del suelo
C.pull = clip(
  'pull',
  2.6,
  [
    K(0, { root: [0, -100, 0], pelvis: [10, 0, 0], spine1: [11, 0, 0], spine2: [17, 0, 0], chest: [30, 0, 0], neck2: [-4, 0, 0], head: [-16, 0, 0], armR: [-50, 4, -6], foreR: [-8, 0, 0], handR: [14, 0, 0], armL: [-28, 0, 30], legL: [-30, 0, 8], shinL: [42, 0, 0], legR: [11, 0, -8], shinR: [28, 0, 0] }),
    K(0.9, { root: [0, -60, 0], pelvis: [-4, 0, 0], spine1: [-2, 0, 0], spine2: [2, 0, 0], chest: [6, -6, 0], neck2: [-14, 6, 0], armR: [-36, 0, -10], foreR: [-30, 0, 0], handR: [6, 0, 0], armL: [-30, 0, 44], legL: [-20, 0, 8], shinL: [30, 0, 0], legR: [16, 0, -8], shinR: [30, 0, 0] }, 'hold'),
    K(1.3, { root: [0, 10, 0], pelvis: [-8, 0, 0], spine2: [-6, 0, 0], chest: [-12, 8, 0], neck2: [-16, -4, 0], armR: [-128, -10, -34], foreR: [-30, 0, 0], handR: [-10, 0, 0], armL: [-24, 0, 40], legL: [-8, 0, 6], shinL: [12, 0, 0], legR: [4, 0, -6], shinR: [12, 0, 0] }, 'snap'),
    K(2.6),
  ],
  { lag: { armR: 0.06, foreR: 0.1, handR: 0.14 }, events: [{ t: 1.12, name: 'rip' }] }
);

// pisotón con el pie izquierdo (el derecho, en espejo)
const stompL = [
  K(0),
  K(1.0, { root: [0, 40, 0], pelvis: [0, 4, -8], spine2: [4, 0, 5], chest: [2, 4, 4], armL: [-34, 0, 44], foreL: [-30, 0, 0], armR: [-10, 0, -20], legL: [-58, 0, 6], shinL: [72, 0, 0], footL: [-12, 0, 0], legR: [-4, 0, -4], shinR: [6, 0, 0] }, 'hold'),
  K(1.28, { root: [0, -60, 0], pelvis: [6, -2, 2], spine2: [10, 0, 0], chest: [14, 0, -2], armL: [-20, 0, 30], foreL: [-20, 0, 0], legL: [-12, 0, 4], shinL: [8, 0, 0], footL: [8, 0, 0], legR: [-2, 0, -4], shinR: [16, 0, 0] }, 'snap'),
  K(1.9, { root: [0, -40, 0], pelvis: [5, 0, 0], spine2: [9, 0, 0], chest: [10, 0, 0], legL: [-12, 0, 4], shinL: [10, 0, 0], legR: [-4, 0, -4], shinR: [14, 0, 0] }),
  K(2.7),
];
C.stompL = clip('stompL', 2.7, stompL, { events: [{ t: 1.28, name: 'stomp' }] });
C.stompR = clip(
  'stompR',
  2.7,
  stompL.map(([t, p, e, k]) => [t, mirror(p), e, k]),
  { events: [{ t: 1.28, name: 'stomp' }] }
);

// zarpazo con la garra izquierda: la abre, se lanza y la cierra
C.grab = clip(
  'grab',
  2.5,
  [
    K(0),
    K(1.05, { root: [0, -20, 0], pelvis: [0, 8, 0], chest: [-6, 12, 0], neck2: [-14, -6, 0], clavL: [0, 0, 12], armL: [-64, 0, 72], foreL: [-62, 0, 0], handL: [-30, 0, 0], ...hand('L', -18, 12) }, 'hold'),
    K(1.55, { root: [0, -130, 0], pelvis: [12, -8, 0], spine1: [10, 0, 0], spine2: [14, -6, 0], chest: [26, -12, 0], neck1: [0, 0, 0], neck2: [-6, 8, 0], head: [-16, 0, 0], clavL: [0, 0, 4], armL: [-78, -18, 14], foreL: [-8, 0, 0], handL: [24, 0, 0], legL: [-26, 0, 6], shinL: [40, 0, 0], legR: [12, 0, -6], shinR: [24, 0, 0], ...hand('L', -10, 16) }, 'strike', 1.3),
    K(1.95, { root: [0, -135, 0], pelvis: [12, -8, 0], spine1: [10, 0, 0], spine2: [14, -6, 0], chest: [26, -12, 0], neck2: [-6, 8, 0], head: [-16, 0, 0], armL: [-80, -18, 12], foreL: [-6, 0, 0], handL: [26, 0, 0], legL: [-26, 0, 6], shinL: [40, 0, 0], legR: [12, 0, -6], shinR: [24, 0, 0], ...hand('L', 68, 2) }, 'snap'),
    K(2.5, { root: [0, -130, 0], pelvis: [12, -8, 0], spine1: [10, 0, 0], spine2: [14, -6, 0], chest: [26, -12, 0], neck2: [-6, 8, 0], head: [-16, 0, 0], armL: [-80, -18, 12], foreL: [-6, 0, 0], handL: [26, 0, 0], legL: [-26, 0, 6], shinL: [40, 0, 0], legR: [12, 0, -6], shinR: [24, 0, 0], ...hand('L', 60, 4) }),
  ],
  { lag: { chest: 0.04, armL: 0.07, foreL: 0.11, handL: 0.15 }, events: [{ t: 1.6, name: 'grab' }] }
);
// la garra plantada en el suelo (fallo: los dedos abiertos sobre el empedrado)
C.planted = clip(
  'planted',
  2.4,
  [
    K(0, { root: [0, -140, 0], pelvis: [12, -8, 0], spine1: [10, 0, 0], spine2: [15, -6, 0], chest: [28, -12, 0], neck2: [-4, 8, 0], head: [-18, 0, 0], armL: [-80, -18, 12], foreL: [-6, 0, 0], handL: [10, 0, 0], legL: [-26, 0, 6], shinL: [40, 0, 0], legR: [12, 0, -6], shinR: [24, 0, 0], ...hand('L', -8, 14) }),
    K(1.2, { root: [0, -132, 0], pelvis: [11, -8, 0], spine1: [9, 0, 0], spine2: [14, -6, 0], chest: [26, -10, 0], neck2: [-8, 10, 0], head: [-14, 0, 0], armL: [-80, -18, 12], foreL: [-6, 0, 0], handL: [10, 0, 0], legL: [-26, 0, 6], shinL: [40, 0, 0], legR: [12, 0, -6], shinR: [24, 0, 0], ...hand('L', -4, 14) }),
    K(2.4, { root: [0, -140, 0], pelvis: [12, -8, 0], spine1: [10, 0, 0], spine2: [15, -6, 0], chest: [28, -12, 0], neck2: [-4, 8, 0], head: [-18, 0, 0], armL: [-80, -18, 12], foreL: [-6, 0, 0], handL: [10, 0, 0], legL: [-26, 0, 6], shinL: [40, 0, 0], legR: [12, 0, -6], shinR: [24, 0, 0], ...hand('L', -8, 14) }),
  ],
  { loop: true }
);
C.grabBack = clip(
  'grabBack',
  1.9,
  [
    K(0, { root: [0, -140, 0], pelvis: [12, -8, 0], spine1: [10, 0, 0], spine2: [15, -6, 0], chest: [28, -12, 0], neck2: [-4, 8, 0], head: [-18, 0, 0], armL: [-80, -18, 12], foreL: [-6, 0, 0], handL: [10, 0, 0], legL: [-26, 0, 6], shinL: [40, 0, 0], legR: [12, 0, -6], shinR: [24, 0, 0], ...hand('L', -8, 14) }),
    K(0.8, { root: [0, -40, 0], pelvis: [6, 0, 0], chest: [10, 4, 0], armL: [-40, 0, 30], foreL: [-50, 0, 0], handL: [-10, 0, 0], ...hand('L', 30, 4) }),
    K(1.9),
  ],
  { lag: { armL: 0.05, foreL: 0.09, handL: 0.12 } }
);

// te tiene en la garra: la sube hasta la cara y aprieta
const HOLD = { root: [0, -20, 0], pelvis: [4, 6, 0], spine2: [6, 6, 0], chest: [-4, 12, 0], neck1: [-10, -4, 0], neck2: [-12, -8, 0], head: [-8, -12, 0], jaw: [26, 0, 0], clavL: [0, 0, 10], armL: [-112, -26, 30], foreL: [-84, 0, 0], handL: [6, 0, 0], ...hand('L', 70, 2) };
C.hold = clip(
  'hold',
  2.4,
  [K(0, HOLD), K(0.6, { ...HOLD, ...hand('L', 84, 1), jaw: [34, 0, 0], head: [-6, -10, 0] }), K(1.2, HOLD), K(1.8, { ...HOLD, ...hand('L', 86, 1), jaw: [36, 0, 0] }), K(2.4, HOLD)],
  { loop: true }
);
// y te tira lejos
C.throw = clip(
  'throw',
  2.0,
  [
    K(0, HOLD),
    K(0.55, { ...HOLD, chest: [-10, 22, 0], armL: [-150, -10, 40], foreL: [-60, 0, 0] }, 'hold'),
    K(0.85, { root: [0, -40, 0], chest: [16, -18, 0], spine2: [10, -8, 0], neck2: [-4, 8, 0], armL: [-60, 10, 52], foreL: [-12, 0, 0], handL: [-20, 0, 0], ...hand('L', -12, 14) }, 'snap'),
    K(2.0),
  ],
  { lag: { armL: 0.05, foreL: 0.09 }, events: [{ t: 0.78, name: 'throw' }] }
);
// doble giro (fase 2): se agacha, abre el brazo de la cadena y gira dos
// vueltas sobre los pies (la vuelta la da la pelea); luego se tambalea
{
  const SPIN = { root: [0, -60, 0], pelvis: [8, 0, 0], spine1: [8, 0, 0], spine2: [10, 6, 0], chest: [8, 10, 0], neck1: [-8, -6, 0], neck2: [-10, -8, 0], head: [-6, -6, 0], armR: [-12, 64, -58], foreR: [-8, 0, 0], handR: [0, 0, 6], armL: [-24, 0, 56], foreL: [-20, 0, 0], legL: [-14, 0, 12], shinL: [26, 0, 0], legR: [-10, 0, -12], shinR: [22, 0, 0] };
  C.spin = clip(
    'spin',
    5.6,
    [
      K(0),
      K(1.0, { ...SPIN, root: [0, -80, 0], chest: [14, -16, 0], spine2: [12, -10, 0], armR: [-12, -30, -60], foreR: [-20, 0, 0] }, 'hold'),
      K(1.5, SPIN, 'snap'),
      K(3.0, { ...SPIN, chest: [6, 14, 0], head: [-8, -10, 0] }),
      K(4.4, SPIN),
      K(5.0, { ...SPIN, root: [0, -40, 0], chest: [20, 0, 0], spine2: [14, 0, 0], armR: [-30, 40, -30], foreR: [-30, 0, 0], legL: [-20, 0, 8], shinL: [30, 0, 0] }),
      K(5.6),
    ],
    { lag: { chest: 0.05, armR: 0.08, foreR: 0.12 }, events: [{ t: 1.0, name: 'swing' }] }
  );
}
// lluvia de cera (fase 2): alza la cabeza y sacude la aureola; los cirios
// gotean cera ardiendo sobre la plaza
C.wax = clip(
  'wax',
  4.0,
  [
    K(0),
    K(0.8, { root: [0, -50, 0], chest: [16, 0, 0], neck1: [10, 0, 0], neck2: [8, 0, 0], head: [10, 0, 0], armL: [-20, 0, 30], armR: [-14, 0, -24] }, 'hold'),
    K(1.3, { root: [0, 10, 0], chest: [-14, 0, 0], neck1: [-26, 6, 0], neck2: [-22, 8, 0], head: [-18, 10, 0], jaw: [30, 0, 0], armL: [-40, 0, 60], foreL: [-30, 0, 0], armR: [-30, 0, -50], foreR: [-30, 0, 0] }, 'snap'),
    K(2.0, { root: [0, 10, 0], chest: [-14, 0, 0], neck1: [-26, -8, 0], neck2: [-22, -10, 0], head: [-18, -12, 0], jaw: [30, 0, 0], armL: [-40, 0, 60], foreL: [-30, 0, 0], armR: [-30, 0, -50], foreR: [-30, 0, 0] }),
    K(2.7, { root: [0, 10, 0], chest: [-14, 0, 0], neck1: [-26, 8, 0], neck2: [-22, 10, 0], head: [-18, 12, 0], jaw: [28, 0, 0], armL: [-40, 0, 60], foreL: [-30, 0, 0], armR: [-30, 0, -50], foreR: [-30, 0, 0] }),
    K(4.0),
  ],
  { events: [{ t: 1.3, name: 'wax' }] }
);

// coletazo: la cadera gira y la cola barre por detrás, de izquierda a derecha
C.tail = clip(
  'tail',
  3.5,
  [
    K(0),
    K(1.05, { root: [0, -30, 0], pelvis: [6, 24, 0], spine2: [6, -6, 0], chest: [6, -14, 0], neck2: [-10, -10, 0], tail1: [0, -34, 0], tail2: [0, -22, 0], tail3: [0, -14, 0], legL: [-12, 0, 8], shinL: [18, 0, 0], legR: [4, 0, -8], shinR: [18, 0, 0], armL: [-26, 0, 40], armR: [-10, 0, -24] }, 'hold'),
    K(1.7, { root: [0, -50, 0], pelvis: [8, -38, 0], spine2: [8, 10, 0], chest: [8, 18, 0], neck2: [-10, 14, 0], tail1: [0, 58, 0], tail2: [0, 46, 0], tail3: [0, 36, 0], tail4: [0, 24, 0], legL: [-6, 0, 8], shinL: [22, 0, 0], legR: [-8, 0, -8], shinR: [20, 0, 0], armL: [-20, 0, 50], armR: [-16, 0, -30] }, 'strike', 1.4),
    K(2.35, { root: [0, -40, 0], pelvis: [8, -44, 0], spine2: [8, 14, 0], chest: [8, 20, 0], neck2: [-10, 16, 0], tail1: [0, 66, 0], tail2: [0, 52, 0], tail3: [0, 40, 0], tail4: [0, 28, 0], armL: [-18, 0, 40], armR: [-12, 0, -26] }, 'settle'),
    K(3.5),
  ],
  { lag: { tail1: 0.06, tail2: 0.12, tail3: 0.18, tail4: 0.24 }, events: [{ t: 1.5, name: 'swing' }] }
);

// rugido: se recoge, echa la cabeza atrás y abre los brazos; el costillar
// se abre de par en par
C.roar = clip(
  'roar',
  3.3,
  [
    K(0),
    K(0.85, { root: [0, -70, 0], pelvis: [8, 0, 0], spine2: [12, 0, 0], chest: [20, 0, 0], neck1: [12, 0, 0], neck2: [8, 0, 0], head: [6, 0, 0], armL: [-22, 0, 22], foreL: [-40, 0, 0], armR: [-12, 0, -16], foreR: [-30, 0, 0], ...hand('L', 50, 0) }, 'hold'),
    K(1.25, { root: [0, 20, 0], pelvis: [-6, 0, 0], spine1: [-4, 0, 0], spine2: [-8, 0, 0], chest: [-18, 0, 0], neck1: [-30, 0, 0], neck2: [-26, 0, 0], head: [-22, 0, 0], jaw: [42, 0, 0], ribL: [0, 34, 0], ribR: [0, -34, 0], clavL: [0, 0, 14], clavR: [0, 0, -14], armL: [-34, 0, 84], foreL: [-30, 0, 0], handL: [-20, 0, 0], armR: [-24, 0, -72], foreR: [-30, 0, 0], ...hand('L', -16, 14) }, 'snap'),
    K(2.6, { root: [0, 10, 0], pelvis: [-5, 0, 0], spine2: [-7, 0, 0], chest: [-16, 0, 0], neck1: [-28, 0, 0], neck2: [-24, 0, 0], head: [-20, 0, 0], jaw: [38, 0, 0], ribL: [0, 30, 0], ribR: [0, -30, 0], clavL: [0, 0, 12], clavR: [0, 0, -12], armL: [-30, 0, 78], foreL: [-28, 0, 0], armR: [-22, 0, -68], foreR: [-28, 0, 0], ...hand('L', -10, 12) }),
    K(3.3),
  ],
  { events: [{ t: 1.25, name: 'roar' }] }
);

// ------------------------------------------------------------ reacciones
// apuñalado en la nuca: la cabeza atrás y la izquierda busca la herida
C.hurtNuca = clip(
  'hurtNuca',
  2.6,
  [
    K(0, { neck1: [-26, 0, 0], neck2: [-24, 0, 0], head: [-18, 0, 0], jaw: [30, 0, 0], chest: [-8, 0, 0], armL: [-40, 0, 40], foreL: [-60, 0, 0] }, 'snap'),
    K(0.9, { root: [0, -40, 0], neck1: [-14, 0, 0], neck2: [-16, 6, 0], head: [-10, 0, 0], jaw: [26, 0, 0], chest: [4, 8, 0], spine2: [10, 0, 0], clavL: [0, 0, 20], armL: [-150, 18, 34], foreL: [-110, 0, 0], handL: [-20, 0, 0], ...hand('L', 50, 6) }),
    K(1.8, { root: [0, -30, 0], neck2: [-12, 4, 0], chest: [6, 6, 0], spine2: [9, 0, 0], clavL: [0, 0, 16], armL: [-140, 16, 30], foreL: [-104, 0, 0], ...hand('L', 56, 4) }),
    K(2.6),
  ],
  { lag: { armL: 0.08, foreL: 0.12 } }
);
// apuñalado en la mano de la cadena: la sacude y se la agarra con la otra
C.hurtMano = clip(
  'hurtMano',
  2.6,
  [
    K(0, { armR: [-70, 0, -30], foreR: [-50, 0, 0], handR: [-30, 0, 0], chest: [-6, -10, 0], neck2: [-6, -16, 0], jaw: [24, 0, 0] }, 'snap'),
    K(0.8, { root: [0, -50, 0], spine2: [12, -6, 0], chest: [16, -14, 0], neck2: [0, -20, 0], head: [-10, -8, 0], armR: [-60, 20, -10], foreR: [-70, 0, 0], handR: [-20, 0, 0], armL: [-62, -30, -16], foreL: [-56, 0, 0], handL: [10, 0, 0], ...hand('L', 62, 0) }),
    K(1.8, { root: [0, -40, 0], spine2: [10, -4, 0], chest: [12, -10, 0], neck2: [-2, -16, 0], armR: [-54, 16, -8], foreR: [-64, 0, 0], armL: [-58, -28, -14], foreL: [-52, 0, 0], ...hand('L', 60, 0) }),
    K(2.6),
  ],
  { lag: { armL: 0.1, foreL: 0.14 } }
);
// golpe que no llega a sigilo (le hieres en la carne): un respingo
C.flinch = clip('flinch', 0.9, [K(0, { chest: [-6, 6, 0], neck2: [-14, 0, 0], jaw: [18, 0, 0] }, 'snap'), K(0.9)]);
// se revuelve (cuando le trepas): base de la sacudida; el temblor lo pone la capa procedural
C.shake = clip(
  'shake',
  1.6,
  [
    K(0, { root: [0, -40, 0], pelvis: [6, 0, 0], chest: [12, 0, 0], neck2: [-4, 0, 0], armL: [-40, 0, 46], foreL: [-30, 0, 0], armR: [-30, 0, -40], foreR: [-30, 0, 0], legL: [-12, 0, 8], shinL: [20, 0, 0], legR: [-12, 0, -8], shinR: [20, 0, 0] }),
    K(0.8, { root: [0, -60, 0], pelvis: [8, 0, 4], chest: [16, 0, -6], neck2: [-8, 0, 6], armL: [-46, 0, 54], foreL: [-36, 0, 0], armR: [-36, 0, -48], foreR: [-36, 0, 0], legL: [-14, 0, 8], shinL: [24, 0, 0], legR: [-14, 0, -8], shinR: [24, 0, 0] }),
    K(1.6, { root: [0, -40, 0], pelvis: [6, 0, 0], chest: [12, 0, 0], neck2: [-4, 0, 0], armL: [-40, 0, 46], foreL: [-30, 0, 0], armR: [-30, 0, -40], foreR: [-30, 0, 0], legL: [-12, 0, 8], shinL: [20, 0, 0], legR: [-12, 0, -8], shinR: [20, 0, 0] }),
  ],
  { loop: true }
);

// ------------------------------------------------------------ de rodillas, muerte, emerger
// de rodillas: los muslos casi a plomo, las espinillas tendidas hacia atrás
// sobre el empedrado y el empeine en el suelo; el pecho abierto de par en
// par (el núcleo, a la vista: se trepa por la casulla hasta él)
const KNEEL = { root: [0, -348, 0], pelvis: [-4, 0, 0], spine1: [8, 0, 0], spine2: [8, 0, 0], chest: [6, 0, 0], neck1: [-6, 0, 0], neck2: [-2, 0, 0], head: [10, 0, 0], jaw: [22, 0, 0], ribL: [0, 56, 0], ribR: [0, -56, 0], armL: [-6, 0, 16], foreL: [-22, 0, 0], handL: [24, 0, 0], armR: [-12, 0, -14], foreR: [-16, 0, 0], legL: [-1, 0, 8], shinL: [78, 0, 0], footL: [80, 0, 0], legR: [-1, 0, -8], shinR: [78, 0, 0], footR: [80, 0, 0], ...hand('L', 10, 10) };
export const KNEEL_POSE = KNEEL;
C.kneel = clip(
  'kneel',
  3.2,
  [
    K(0),
    K(0.7, { root: [0, -60, 0], spine2: [16, 0, 0], chest: [20, 0, 0], neck2: [-2, 0, 0], jaw: [30, 0, 0], legL: [-20, 0, 6], shinL: [36, 0, 0], legR: [-20, 0, -6], shinR: [36, 0, 0] }),
    K(1.7, { ...KNEEL, root: [0, -360, 0], chest: [16, 0, 0], ribL: [0, 30, 0], ribR: [0, -30, 0] }, 'in'),
    K(3.2, KNEEL, 'settle'),
  ],
  { ground: false, events: [{ t: 1.7, name: 'knees' }] }
);
C.kneelLoop = clip(
  'kneelLoop',
  3.0,
  [K(0, KNEEL), K(1.5, { ...KNEEL, chest: [10, 0, 0], spine2: [13, 0, 0], ribL: [0, 62, 0], ribR: [0, -62, 0], neck2: [-14, 4, 0], jaw: [30, 0, 0] }), K(3.0, KNEEL)],
  { loop: true, ground: false }
);
// muerte: convulsiones, se hincha y revienta (el estallido lo pone la pelea)
C.death = clip(
  'death',
  5.2,
  [
    K(0, KNEEL),
    K(0.6, { ...KNEEL, chest: [-14, 10, 0], neck1: [-30, 0, 0], neck2: [-26, 8, 0], head: [-20, 10, 0], jaw: [44, 0, 0], armL: [-40, 0, 70], armR: [-40, 0, -64], ribL: [0, 66, 0], ribR: [0, -66, 0] }, 'snap'),
    K(1.6, { ...KNEEL, chest: [20, -12, 0], neck2: [6, -10, 0], head: [10, -14, 0], armL: [-10, 0, 20], armR: [-14, 0, -20] }),
    K(2.6, { ...KNEEL, chest: [-20, 6, 0], neck1: [-34, 0, 0], neck2: [-30, 0, 0], head: [-24, 0, 0], jaw: [50, 0, 0], armL: [-60, 0, 80], foreL: [-10, 0, 0], armR: [-56, 0, -76], foreR: [-10, 0, 0], ribL: [0, 70, 0], ribR: [0, -70, 0], s_chest: [0.08, 0.08, 0.1], s_spine2: [0.06, 0.06, 0.08] }, 'snap'),
    K(4.6, { ...KNEEL, chest: [-24, 0, 0], neck1: [-36, 0, 0], neck2: [-32, 0, 0], head: [-26, 0, 0], jaw: [54, 0, 0], armL: [-66, 0, 84], armR: [-62, 0, -80], ribL: [0, 72, 0], ribR: [0, -72, 0], s_chest: [0.32, 0.3, 0.38], s_spine2: [0.26, 0.24, 0.3], s_spine1: [0.2, 0.18, 0.22], s_pelvis: [0.12, 0.1, 0.12], s_neck1: [0.15, 0.15, 0.15] }, 'in'),
    K(5.2, { ...KNEEL, chest: [-24, 0, 0], neck1: [-36, 0, 0], neck2: [-32, 0, 0], head: [-26, 0, 0], jaw: [54, 0, 0], armL: [-66, 0, 84], armR: [-62, 0, -80], ribL: [0, 72, 0], ribR: [0, -72, 0], s_chest: [0.36, 0.34, 0.42], s_spine2: [0.3, 0.28, 0.34], s_spine1: [0.22, 0.2, 0.24], s_pelvis: [0.14, 0.12, 0.14], s_neck1: [0.17, 0.17, 0.17] }),
  ],
  { ground: false, events: [{ t: 0.6, name: 'convulse' }, { t: 2.6, name: 'convulse' }, { t: 5.1, name: 'burst' }] }
);
// emerger del empedrado: las manos rompen el suelo, se arrastra fuera, se
// yergue y ruge
C.emerge = clip(
  'emerge',
  8.0,
  [
    K(0, { root: [0, -2300, 0], chest: [30, 0, 0], neck2: [10, 0, 0], armL: [-170, 0, 18], foreL: [-10, 0, 0], armR: [-166, 0, -18], foreR: [-10, 0, 0], ...hand('L', -10, 16), ...hand('R', -10, 0) }),
    K(1.2, { root: [0, -1650, 0], chest: [26, 0, 0], neck2: [6, 0, 0], armL: [-160, 0, 30], foreL: [-20, 0, 0], armR: [-156, 0, -30], foreR: [-20, 0, 0], ...hand('L', 40, 10), ...hand('R', 40, 0) }, 'hold'),
    K(3.2, { root: [0, -900, 0], spine1: [20, 0, 0], spine2: [26, 0, 0], chest: [30, 0, 0], neck1: [-20, 0, 0], neck2: [-20, 0, 0], head: [-10, 0, 0], armL: [-40, 0, 46], foreL: [-60, 0, 0], handL: [40, 0, 0], armR: [-36, 0, -46], foreR: [-60, 0, 0], handR: [40, 0, 0], legL: [-90, 0, 10], shinL: [110, 0, 0], legR: [-90, 0, -10], shinR: [110, 0, 0], ...hand('L', 0, 14), ...hand('R', 0, 0) }),
    K(5.0, { root: [0, -300, 0], spine1: [14, 0, 0], spine2: [16, 0, 0], chest: [20, 0, 0], neck2: [-12, 0, 0], armL: [-20, 0, 40], foreL: [-40, 0, 0], armR: [-16, 0, -40], foreR: [-40, 0, 0], legL: [-60, 0, 8], shinL: [80, 0, 0], legR: [-60, 0, -8], shinR: [80, 0, 0] }),
    K(6.1, { root: [0, -40, 0], chest: [14, 0, 0], neck1: [10, 0, 0], neck2: [6, 0, 0], armL: [-22, 0, 22], foreL: [-40, 0, 0], armR: [-12, 0, -16], foreR: [-30, 0, 0] }, 'hold'),
    K(6.6, { root: [0, 20, 0], pelvis: [-6, 0, 0], spine2: [-8, 0, 0], chest: [-18, 0, 0], neck1: [-30, 0, 0], neck2: [-26, 0, 0], head: [-22, 0, 0], jaw: [42, 0, 0], ribL: [0, 34, 0], ribR: [0, -34, 0], armL: [-34, 0, 84], foreL: [-30, 0, 0], armR: [-24, 0, -72], foreR: [-30, 0, 0], ...hand('L', -16, 14) }, 'snap'),
    K(7.3, { root: [0, 10, 0], chest: [-16, 0, 0], neck1: [-28, 0, 0], neck2: [-24, 0, 0], head: [-20, 0, 0], jaw: [38, 0, 0], ribL: [0, 30, 0], ribR: [0, -30, 0], armL: [-30, 0, 78], armR: [-22, 0, -68] }),
    K(8.0),
  ],
  { ground: false, events: [{ t: 0.4, name: 'break' }, { t: 1.4, name: 'break' }, { t: 3.2, name: 'rise' }, { t: 5.0, name: 'rise' }, { t: 6.6, name: 'roar' }] }
);

// ------------------------------------------------------------ el esqueleto vivo
// Prepara el ColossusRig del Turiferario: qué huesos miran al jugador, cuáles
// se sacuden y retroceden, y los muelles de la ropa, la aureola y la cola.
export function turRig(model, o = {}) {
  const R = new ColossusRig(model, {
    groundAt: o.groundAt,
    feet: [
      { ankle: 'footL', toe: 'toeL', h: 0.92, ht: 0.34 },
      { ankle: 'footR', toe: 'toeR', h: 0.92, ht: 0.34 },
    ],
    lookBones: [
      { n: 'neck1', k: 0.22 },
      { n: 'neck2', k: 0.33 },
      { n: 'head', k: 0.45 },
    ],
    shakeBones: [
      { n: 'pelvis', k: 0.3 },
      { n: 'spine1', k: 0.4 },
      { n: 'spine2', k: 0.55 },
      { n: 'chest', k: 0.75 },
      { n: 'neck1', k: 0.45 },
      { n: 'head', k: 0.35 },
      { n: 'armL', k: 0.6 },
      { n: 'armR', k: 0.45 },
      { n: 'legL', k: 0.15 },
      { n: 'legR', k: 0.15 },
    ],
    flinchBones: [
      { n: 'spine2', k: 0.3 },
      { n: 'chest', k: 0.55 },
      { n: 'neck1', k: 0.35 },
      { n: 'neck2', k: 0.3 },
    ],
  });
  Object.assign(R.look, { maxYaw: 1.0, maxPitch: 0.45, pitch0: 0.3, speed: 2.2 });
  // la casulla: tres tramos por la espalda (la cruz en Y por la que se
  // trepa), dos por cada faldón y por cada costado
  R.addDyn('casB1', { k: 30, d: 6, g: 3, hang: 0.45 });
  R.addDyn('casB2', { k: 26, d: 5, g: 4, hang: 0.55 });
  R.addDyn('casB3', { len: 2.6, dir: [0, -1, -0.12], k: 22, d: 4.5, g: 5, hang: 0.6, maxAng: 1.0 });
  for (const S of ['L', 'R']) {
    R.addDyn('casF' + S, { k: 26, d: 5, g: 3, hang: 0.5 });
    R.addDyn('casF' + S + '2', { len: 2.4, dir: [0, -1, 0.12], k: 22, d: 4.5, g: 4, hang: 0.6, maxAng: 1.0 });
    R.addDyn('casS' + S, { k: 26, d: 5, g: 3, hang: 0.45 });
    R.addDyn('casS' + S + '2', { len: 2.6, dir: [0, -1, 0], k: 22, d: 4.5, g: 4, hang: 0.55, maxAng: 1.0 });
  }
  // jirones del alba
  for (let i = 0; i < 8; i++) {
    R.addDyn('tat' + i, { k: 18, d: 3.6, g: 5, hang: 0.4 });
    R.addDyn('tat' + i + 'b', { len: 2.3, dir: [0, -1, 0], k: 14, d: 3, g: 6, hang: 0.55, ground: 0.12, fr: 3, maxAng: 1.2 });
  }
  // la aureola de hierro, clavada en el cráneo: tiembla con cada sacudida
  R.addDyn('halo', { len: 3, dir: [0, 1, 0], k: 110, d: 11, w: 0.55, maxAng: 0.3 });
  // la cola de los fieles: pesa y se arrastra por el empedrado
  // (se dobla mucho: en la plaza no cabe estirada y se curva contra las fachadas)
  for (let i = 1; i <= 5; i++) R.addDyn('tail' + i, { k: 34 - i * 4, d: 6.5, g: 7, ground: 0.45 + (5 - i) * 0.18, fr: 3.5, maxAng: 1.5, bound: 1.4 });
  R.addDyn('tail6', { len: 3.0, dir: [0, -0.06, -1], k: 12, d: 5, g: 8, ground: 0.4, fr: 4.5, maxAng: 1.5, bound: 1.2 });
  return R;
}
