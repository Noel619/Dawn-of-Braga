// El Caballero de la Orden (PLAN_CASTILLO.md, §10): el mejor de los hombres
// del Rey, un caballero de una orden militar, ya infectado. Espera en lo más
// alto de la torre del homenaje, apoyado en su espada, mirando la luna. Es
// opcional y es la pelea más difícil del juego: una danza a media distancia,
// habilidad tras habilidad, con golpes que son críticos y casi sin huecos.
// Desvía de frente lo que no le pille desprevenido y contesta en el acto.
// Lleva armadura: contra él, cada arma hace el daño que permite su calidad
// (src/entities/weapons.js, ARMOR).
//
// Este archivo: el cuerpo, las poses y el tipo (su pelea, más abajo y en
// game/caballero.js: la cuchilla de viento, la cruz que corta después, el
// pendón, la escena de la luna).
import * as THREE from 'three';
import { Rig, clip } from './rig.js';
import { humanoidJoints, feetParts } from './models.js';
import { solveArm } from './locomotion.js';
import { rad } from './weapon_common.js';
import { GAIT } from './locomotion.js';
import { FORT } from '../world/fortaleza_medidas.js';

const S = Math.sin;
const K = 1.06;

// ------------------------------------------------------------ el cuerpo
// La espada larga, de mano y media: la hoja a lo largo de +z de la mano
// derecha (como las del jugador), la cruz larga y algo caída, el pomo de
// disco. (Punta: a 1,16 m del puño.)
export const CAB_TIP = 1.16;
function espadaParts(j = 'handR') {
  const y = -0.05;
  return [
    { j, type: 'cyl', s: [0.02, 0.023, 0.24], p: [0, y, -0.01], r: [90, 0, 0], seg: 6, mat: 'leather' },
    { j, type: 'box', s: [0.28, 0.032, 0.04], p: [0, y, 0.12], mat: 'iron' },
    { j, type: 'box', s: [0.06, 0.03, 0.04], p: [0.165, y - 0.012, 0.12], r: [0, 0, -18], mat: 'iron' },
    { j, type: 'box', s: [0.06, 0.03, 0.04], p: [-0.165, y - 0.012, 0.12], r: [0, 0, 18], mat: 'iron' },
    { j, type: 'cyl', s: [0.046, 0.046, 0.032], p: [0, y, -0.15], r: [0, 0, 90], seg: 8, mat: 'iron' },
    { j, type: 'box', s: [0.062, 1.02, 0.014], p: [0, y, 0.14 + 0.51], r: [-90, 0, 0], taper: [0.2, 1], mat: 'plate' },
    { j, type: 'box', s: [0.014, 0.8, 0.018], p: [0, y, 0.16 + 0.4], r: [-90, 0, 0], mat: 'iron' },
  ];
}

// La cruz de la Orden, roja, de brazos que se ensanchan en las puntas
// (sobre un plano z = zc del pecho; s < 0: vista desde atrás).
function cruz(j, zc, y0 = 0.25, sc = 1) {
  const t = 0.01;
  return [
    { j, type: 'box', s: [0.07 * sc, 0.4 * sc, t], p: [0, y0, zc], mat: 'clothRed' },
    { j, type: 'box', s: [0.3 * sc, 0.07 * sc, t], p: [0, y0 + 0.07 * sc, zc], mat: 'clothRed' },
    { j, type: 'box', s: [0.12 * sc, 0.04 * sc, t], p: [0, y0 + 0.2 * sc, zc], mat: 'clothRed' },
    { j, type: 'box', s: [0.04 * sc, 0.12 * sc, t], p: [0.15 * sc, y0 + 0.07 * sc, zc], mat: 'clothRed' },
    { j, type: 'box', s: [0.04 * sc, 0.12 * sc, t], p: [-0.15 * sc, y0 + 0.07 * sc, zc], mat: 'clothRed' },
  ];
}

// Los faldones de un muslo (sd: 1, el izquierdo; -1, el derecho): la loriga
// y la sobreveste partida delante y detrás, con sus jirones abajo.
function faldones(j, sd) {
  const out = [
    { j, type: 'box', s: [0.23, 0.42, 0.25], p: [0.012 * sd, -0.16, 0], taper: [1.1, 1.08], mat: 'chainmail' },
    { j, type: 'box', s: [0.21, 0.56, 0.02], p: [0.004 * sd, -0.24, 0.136], taper: [1.12, 1], mat: 'clothWhite' },
    { j, type: 'box', s: [0.21, 0.56, 0.02], p: [0.004 * sd, -0.24, -0.136], taper: [1.12, 1], mat: 'clothWhite' },
  ];
  const L = sd > 0 ? [0.12, 0.05, 0.16] : [0.08, 0.15, 0.06];
  for (const zc of [0.136, -0.136])
    for (let i = 0; i < 3; i++) out.push({ j, type: 'box', s: [0.065, L[i], 0.018], p: [(-0.07 + i * 0.07) * sd, -0.52 - L[i] / 2, zc], r: [0, 0, (i - 1) * 4 * sd], mat: 'clothWhite' });
  return out;
}

export function buildCaballero() {
  const joints = humanoidJoints(K);
  // la capa, en dos tramos (la mueven el viento y la carrera: postPose)
  joints.push({ name: 'cape', parent: 'chest', pos: [0, 0.5 * K, -0.2] }, { name: 'cape2', parent: 'cape', pos: [0, -0.55, 0] });
  // el pendón del Rey, en la izquierda (a lo largo de +z de la mano)
  joints.push({ name: 'pendon', parent: 'handL', pos: [0, -0.05, 0] });
  const parts = [
    // --- la cadera: la loriga, el arranque de la sobreveste (que se abre
    // en cuatro faldones, en los muslos: así siguen a las piernas), el cinto
    // y, a la izquierda, la vaina vacía
    { j: 'hips', type: 'box', s: [0.42, 0.26, 0.31], p: [0, -0.07, 0], taper: [1.12, 1.06], mat: 'chainmail' },
    { j: 'hips', type: 'box', s: [0.4, 0.2, 0.024], p: [0, -0.08, 0.17], taper: [1.08, 1], mat: 'clothWhite' },
    { j: 'hips', type: 'box', s: [0.4, 0.2, 0.024], p: [0, -0.08, -0.17], taper: [1.08, 1], mat: 'clothWhite' },
    { j: 'hips', type: 'box', s: [0.072, 0.2, 0.01], p: [0, -0.08, 0.186], mat: 'clothRed' },
    { j: 'hips', type: 'box', s: [0.47, 0.065, 0.35], p: [0, 0.03, 0], mat: 'leather' },
    { j: 'hips', type: 'box', s: [0.06, 0.07, 0.012], p: [0.02, 0.03, 0.18], mat: 'iron' },
    { j: 'hips', type: 'box', s: [0.055, 0.9, 0.032], p: [0.27, -0.4, -0.06], r: [16, 0, 4], taper: [0.8, 1], mat: 'leather' },
    { j: 'hips', type: 'box', s: [0.07, 0.05, 0.045], p: [0.27, 0.03, 0.064], r: [16, 0, 4], mat: 'iron' },
    { j: 'hips', type: 'box', s: [0.06, 0.06, 0.04], p: [0.24, -0.83, -0.18], r: [16, 0, 4], mat: 'iron' },
    ...faldones('legL', 1),
    ...faldones('legR', -1),
    // --- el pecho: la cota, la sobreveste con la cruz (delante y detrás),
    // el almófar, los hombros y la infección que revienta la malla
    { j: 'chest', type: 'box', s: [0.5, 0.56, 0.32], p: [0, 0.26, 0], taper: [0.84, 0.92], mat: 'chainmail' },
    { j: 'chest', type: 'box', s: [0.47, 0.5, 0.024], p: [0, 0.24, 0.166], taper: [0.86, 0.95], mat: 'clothWhite' },
    { j: 'chest', type: 'box', s: [0.47, 0.5, 0.024], p: [0, 0.24, -0.166], taper: [0.86, 0.95], mat: 'clothWhite' },
    ...cruz('chest', 0.186),
    ...cruz('chest', -0.186),
    { j: 'chest', type: 'cyl', s: [0.135, 0.16, 0.16], p: [0, 0.55, 0], seg: 8, mat: 'chainmail' },
    { j: 'chest', type: 'sphere', s: [0.115, 0.1, 0.13], p: [0.22, 0.47, 0], mat: 'chainmail' },
    { j: 'chest', type: 'sphere', s: [0.115, 0.1, 0.13], p: [-0.22, 0.47, 0], mat: 'chainmail' },
    { j: 'chest', type: 'ico', s: [0.11, 0.09, 0.08], p: [0.19, 0.1, 0.14], mat: 'flesh' },
    { j: 'chest', type: 'ico', s: [0.07], p: [-0.19, 0.42, -0.13], mat: 'flesh' },
    { j: 'chest', type: 'ico', s: [0.045], p: [-0.13, 0.06, 0.17], mat: 'pus' },
    // --- la cabeza: el yelmo cerrado de cimera (cilindro de tapa plana, con
    // su refuerzo en cruz y las dos rendijas), los ojos fríos detrás, la
    // cruz de hierro encima, el velo roto y la carne bajo el borde
    { j: 'head', type: 'cyl', s: [0.145, 0.155, 0.3], p: [0, 0.14, 0.0], r: [0, 22.5, 0], seg: 8, mat: 'plate' },
    { j: 'head', type: 'cyl', s: [0.151, 0.151, 0.03], p: [0, 0.285, 0.0], r: [0, 22.5, 0], seg: 8, mat: 'iron' },
    { j: 'head', type: 'box', s: [0.026, 0.25, 0.014], p: [0, 0.13, 0.144], mat: 'iron' },
    { j: 'head', type: 'box', s: [0.114, 0.03, 0.014], p: [0, 0.2, 0.142], mat: 'iron' },
    { j: 'head', type: 'box', s: [0.108, 0.03, 0.014], p: [0.097, 0.2, 0.1], r: [0, 45, 0], mat: 'iron' },
    { j: 'head', type: 'box', s: [0.108, 0.03, 0.014], p: [-0.097, 0.2, 0.1], r: [0, -45, 0], mat: 'iron' },
    { j: 'head', type: 'box', s: [0.04, 0.018, 0.008], p: [-0.034, 0.172, 0.142], mat: 'black' },
    { j: 'head', type: 'box', s: [0.04, 0.018, 0.008], p: [0.034, 0.172, 0.142], mat: 'black' },
    { j: 'head', type: 'sphere', s: [0.013], p: [-0.034, 0.172, 0.128], mat: 'eyeCold' },
    { j: 'head', type: 'sphere', s: [0.013], p: [0.034, 0.172, 0.128], mat: 'eyeCold' },
    ...[0, 1, 2].map((i) => ({ j: 'head', type: 'box', s: [0.01, 0.01, 0.008], p: [-0.06 - (i % 2) * 0.012, 0.075 + i * 0.022, 0.12], r: [0, -40, 0], mat: 'black' })),
    { j: 'head', type: 'box', s: [0.03, 0.13, 0.03], p: [0, 0.36, 0], mat: 'iron' },
    { j: 'head', type: 'box', s: [0.11, 0.03, 0.03], p: [0, 0.385, 0], mat: 'iron' },
    { j: 'head', type: 'box', s: [0.2, 0.3, 0.012], p: [0, 0.12, -0.152], r: [8, 0, 0], taper: [1.3, 1], mat: 'linen' },
    { j: 'head', type: 'ico', s: [0.06, 0.035, 0.05], p: [0.1, -0.02, 0.07], mat: 'flesh' },
    // --- brazos de malla, codales de placa y guantes de cuero
    { j: 'armL', type: 'box', s: [0.15, 0.33, 0.15], p: [0, -0.15, 0], taper: [0.85, 0.85], mat: 'chainmail' },
    { j: 'foreL', type: 'box', s: [0.125, 0.29, 0.125], p: [0, -0.13, 0], taper: [0.85, 0.85], mat: 'chainmail' },
    { j: 'foreL', type: 'sphere', s: [0.068], p: [0, 0, -0.025], mat: 'plate' },
    { j: 'handL', type: 'box', s: [0.095, 0.11, 0.105], p: [0, -0.05, 0.01], mat: 'leather' },
    { j: 'armR', type: 'box', s: [0.15, 0.33, 0.15], p: [0, -0.15, 0], taper: [0.85, 0.85], mat: 'chainmail' },
    { j: 'foreR', type: 'box', s: [0.125, 0.29, 0.125], p: [0, -0.13, 0], taper: [0.85, 0.85], mat: 'chainmail' },
    { j: 'foreR', type: 'sphere', s: [0.068], p: [0, 0, -0.025], mat: 'plate' },
    { j: 'foreR', type: 'ico', s: [0.045], p: [0.05, -0.04, -0.05], mat: 'flesh' },
    { j: 'handR', type: 'box', s: [0.095, 0.11, 0.105], p: [0, -0.05, 0.01], mat: 'leather' },
    ...espadaParts('handR'),
    // --- piernas: calzas de malla, rodilleras y escarpes de malla
    { j: 'legL', type: 'box', s: [0.18, 0.47, 0.19], p: [0, -0.22, 0], taper: [0.8, 0.85], mat: 'chainmail' },
    { j: 'shinL', type: 'sphere', s: [0.075, 0.07, 0.06], p: [0, 0, 0.07], mat: 'plate' },
    { j: 'shinL', type: 'box', s: [0.145, 0.43, 0.155], p: [0, -0.2, 0], taper: [0.9, 0.9], mat: 'chainmail' },
    { j: 'shinL', type: 'ico', s: [0.045], p: [-0.06, -0.04, -0.06], mat: 'flesh' },
    { j: 'legR', type: 'box', s: [0.18, 0.47, 0.19], p: [0, -0.22, 0], taper: [0.8, 0.85], mat: 'chainmail' },
    { j: 'shinR', type: 'sphere', s: [0.075, 0.07, 0.06], p: [0, 0, 0.07], mat: 'plate' },
    { j: 'shinR', type: 'box', s: [0.145, 0.43, 0.155], p: [0, -0.2, 0], taper: [0.9, 0.9], mat: 'chainmail' },
    ...feetParts(K, 'chainmail', { w: 0.12, h: 0.08, l: 0.25 }),
    // --- la capa blanca: cae de los hombros en pliegues (tiras algo giradas
    // unas respecto de otras) y abajo se rompe en jirones; la cruz pequeña
    // al hombro izquierdo
    { j: 'cape', type: 'box', s: [0.5, 0.06, 0.05], p: [0, 0, 0.02], mat: 'linen' },
    ...[-0.165, -0.055, 0.055, 0.165].map((x, i) => ({ j: 'cape', type: 'box', s: [0.125, 0.56, 0.018], p: [x, -0.27, [0.012, -0.012, 0.01, -0.01][i] + Math.abs(x) * 0.18], r: [0, -x * 70, 0], taper: [1.12, 1], mat: 'linen' })),
    { j: 'cape', type: 'box', s: [0.032, 0.12, 0.006], p: [0.165, -0.14, 0.017], r: [0, -11.5, 0], mat: 'clothRed' },
    { j: 'cape', type: 'box', s: [0.1, 0.032, 0.006], p: [0.165, -0.12, 0.017], r: [0, -11.5, 0], mat: 'clothRed' },
    ...[
      [-0.2, 0.52, 10],
      [-0.075, 0.38, 3],
      [0.06, 0.6, -3],
      [0.19, 0.32, -10],
    ].map(([x, l, ry], i) => ({ j: 'cape2', type: 'box', s: [0.12, l, 0.016], p: [x, -l / 2 + 0.02, [0.01, -0.01, 0.008, -0.008][i] + Math.abs(x) * 0.2], r: [0, ry, (i - 1.5) * 2], taper: [0.8, 1], mat: 'linen' })),
    // --- el pendón (oculto hasta que lo arranca de su asta): el asta y la
    // moharra (la tela es aparte: game/caballero.js, para que ondee)
    { j: 'pendon', type: 'cyl', s: [0.024, 0.024, 2.7], p: [0, 0, 0.55], r: [90, 0, 0], seg: 6, mat: 'wooddark', grp: 'pendon' },
    { j: 'pendon', type: 'cone', s: [0.04, 0.22], p: [0, 0, 1.98], r: [90, 0, 0], seg: 4, mat: 'iron', grp: 'pendon' },
    { j: 'pendon', type: 'cyl', s: [0.03, 0.03, 0.05], p: [0, 0, -0.78], r: [90, 0, 0], seg: 6, mat: 'iron', grp: 'pendon' },
  ];
  return new Rig({ joints, parts });
}

// ------------------------------------------------------------ las poses
// Brazos en el espacio del pecho (cm), como las armas del jugador: ikR, la
// muñeca derecha; bladeR, hacia dónde apunta la hoja [rumbo, altura, giro];
// elbowR, hacia dónde sale el codo. La izquierda (ikL) va libre.
// La guardia: el hombro derecho adelantado, la punta hacia el enemigo, la
// izquierda abierta a la altura de la cadera, como quien lleva el compás.
export const GUARD = {
  chest: [8, 18, 0],
  head: [-6, -16, 0],
  ikR: [-20, 12, 32],
  bladeR: [-14, 16, 0],
  elbowR: [-0.5, -0.7, -0.4],
  ikL: [24, 2, 14],
  elbowL: [0.8, -0.5, -0.2],
};
// Mirando la luna, apoyado en la espada: la punta en las losas, las dos
// manos sobre el pomo, la cabeza alzada.
export const LUNA = {
  chest: [-3, 0, 0],
  head: [-24, 0, 0],
  ikR: [-3, 6, 30],
  bladeR: [0, -78, 0],
  elbowR: [-0.9, -0.3, 0],
  ikL: [2, 16, 28],
  elbowL: [0.9, -0.3, 0],
};
// Piernas: la guardia (el pie derecho delante) y la zancada larga.
const ST = { legL: [12, 0, 6], shinL: [16, 0, 0], legR: [-20, 0, -6], shinR: [20, 0, 0], root: [0, -6, 0] };
const LUNGE = { legL: [34, 0, 6], shinL: [8, 0, 0], legR: [-56, 0, -4], shinR: [44, 0, 0], root: [0, -22, 10] };
const CROUCH = { legL: [-24, 0, 8], shinL: [52, 0, 0], legR: [-48, 0, -8], shinR: [70, 0, 0], root: [0, -26, 0] };

const add = (a, b) => a.map((v, i) => v + b[i]);
const with_ = (base, o) => ({ ...base, ...o });

// Los clips (claves en grados y cm; ver rig.js: clip).
export const CAB_CLIPS = {
  // al despertar (sin la escena): se vuelve, alza la espada y se pone en guardia
  alert: clip('cab_alert', 1.1, [
    [0, with_(ST, { ...LUNA, head: [-6, 0, 0] })],
    [0.45, with_(ST, { chest: [0, 0, 0], head: [-4, 0, 0], ikR: [0, 24, 22], bladeR: [0, 84, 0], elbowR: [-0.9, -0.2, -0.2], ikL: [8, 18, 24] })],
    [0.75, with_(ST, { chest: [0, 0, 0], head: [-4, 0, 0], ikR: [0, 26, 22], bladeR: [0, 86, 0], elbowR: [-0.9, -0.2, -0.2], ikL: [8, 20, 24] })],
    [1.1, with_(ST, GUARD), 'snap'],
  ]),
  // el saludo de la escena: saca la espada de las losas, la alza delante
  // del yelmo, la baja de un tajo al costado y se pone en guardia
  saludo: clip(
    'cab_saludo',
    2.6,
    [
      [0, { ...LUNA }],
      [0.5, { ...LUNA, head: [-4, 0, 0], chest: [2, 0, 0] }],
      [1.05, { chest: [-2, 0, 0], head: [-2, 0, 0], ikR: [0, 22, 22], bladeR: [0, 86, 0], elbowR: [-0.9, -0.2, -0.2], ikL: [6, 16, 24], elbowL: [0.9, -0.3, 0] }],
      [1.65, { chest: [-2, 0, 0], head: [0, 0, 0], ikR: [0, 24, 22], bladeR: [0, 88, 0], elbowR: [-0.9, -0.2, -0.2], ikL: [6, 18, 24], elbowL: [0.9, -0.3, 0] }, 'hold'],
      [1.95, { chest: [10, 30, 0], head: [-4, -24, 0], ikR: [-40, -8, 18], bladeR: [-70, -34, 0], elbowR: [-0.6, -0.6, -0.4], ikL: [26, 4, 16], elbowL: [0.8, -0.5, -0.2] }, 'snap'],
      [2.6, with_(ST, GUARD)],
    ],
    { events: [{ t: 1.8, name: 'swing' }] }
  ),
  // la acometida: se encoge con la espada recogida a la cadera y sale
  // disparado en línea recta con la punta por delante (el cuerpo lo lleva
  // el ataque; ver ACOMETIDA)
  acometida: clip(
    'cab_acometida',
    0.9,
    [
      [0, with_(ST, GUARD)],
      [0.2, { ...CROUCH, chest: [22, 34, 0], head: [-16, -30, 0], ikR: [-30, 6, -8], bladeR: [-8, 4, 0], elbowR: [-0.4, -0.3, -0.9], ikL: [26, 22, 34], elbowL: [0.7, -0.6, 0.1] }, 'hold'],
      [0.3, { ...LUNGE, chest: [26, 8, 0], head: [-22, -6, 0], ikR: [-8, 48, 60], bladeR: [-4, 24, 0], elbowR: [-0.5, -0.8, 0], ikL: [30, 2, -22], elbowL: [0.6, -0.6, 0.4] }, 'snap'],
      [0.62, { ...LUNGE, chest: [24, 8, 0], head: [-20, -6, 0], ikR: [-8, 46, 58], bladeR: [-4, 22, 0], elbowR: [-0.5, -0.8, 0], ikL: [30, 4, -20], elbowL: [0.6, -0.6, 0.4] }],
      [0.9, with_(ST, GUARD)],
    ],
    { events: [{ t: 0.24, name: 'thrust' }] }
  ),
  // el tajo del viento: alza la espada por encima del hombro derecho,
  // apunta con la izquierda y la baja en diagonal: del filo sale la cuchilla
  tajo: clip(
    'cab_tajo',
    1.2,
    [
      [0, with_(ST, GUARD)],
      [0.36, { ...ST, chest: [-8, -42, 0], head: [0, 34, 0], ikR: [-34, 62, -6], bladeR: [-150, 52, 0], elbowR: [-0.7, 0.1, -0.7], ikL: [24, 30, 44], elbowL: [0.4, -0.6, 0.2] }, 'hold'],
      [0.48, { ...LUNGE, chest: [20, 46, 0], head: [-8, -30, 0], ikR: [24, -4, 44], bladeR: [72, -36, 0], elbowR: [-0.4, -0.8, -0.3], ikL: [30, 10, -6], elbowL: [0.6, -0.6, 0.4] }, 'snap'],
      [0.74, { ...LUNGE, chest: [18, 52, 0], head: [-6, -32, 0], ikR: [30, -8, 30], bladeR: [104, -42, 0], elbowR: [-0.3, -0.8, -0.4], ikL: [30, 12, -8], elbowL: [0.6, -0.6, 0.4] }],
      [1.2, with_(ST, GUARD)],
    ],
    { events: [{ t: 0.4, name: 'swing' }] }
  ),
  // la cruz: dos tajos en aspa, del hombro derecho y del izquierdo
  cruz: clip(
    'cab_cruz',
    1.45,
    [
      [0, with_(ST, GUARD)],
      [0.2, { ...ST, chest: [-4, -36, 0], head: [0, 28, 0], ikR: [-34, 58, 4], bladeR: [-124, 58, 0], elbowR: [-0.7, 0.1, -0.7], ikL: [22, 20, 26] }, 'hold'],
      [0.31, { ...LUNGE, chest: [18, 38, 0], head: [-8, -26, 0], ikR: [26, -6, 44], bladeR: [58, -42, 0], elbowR: [-0.4, -0.8, -0.3], ikL: [28, 14, 4] }, 'snap'],
      [0.45, { ...LUNGE, chest: [6, 40, 0], head: [-6, -26, 0], ikR: [24, 60, 14], bladeR: [128, 58, 0], elbowR: [0.2, -0.3, -0.9], ikL: [26, 16, 2] }],
      [0.56, { ...LUNGE, chest: [20, -36, 0], head: [-8, 24, 0], ikR: [-30, -8, 44], bladeR: [-58, -42, 0], elbowR: [-0.6, -0.7, -0.2], ikL: [24, 22, 26] }, 'snap'],
      [0.8, { ...LUNGE, chest: [18, -40, 0], head: [-6, 26, 0], ikR: [-36, -10, 30], bladeR: [-96, -44, 0], elbowR: [-0.6, -0.7, -0.2], ikL: [24, 22, 26] }],
      [1.45, with_(ST, GUARD)],
    ],
    {
      events: [
        { t: 0.24, name: 'swing' },
        { t: 0.49, name: 'swing' },
      ],
    }
  ),
  // el salto: se agacha, salta con la espada en alto y la punta hacia
  // abajo, cae clavándola en las losas (ahí se queda un instante: el hueco),
  // la arranca y barre a su alrededor al levantarse
  salto: clip(
    'cab_salto',
    2.3,
    [
      [0, with_(ST, GUARD)],
      [0.3, { ...CROUCH, chest: [26, 0, 0], head: [-20, 0, 0], ikR: [-24, 8, 16], bladeR: [-10, -20, 0], elbowR: [-0.6, -0.6, -0.4], ikL: [24, 6, 20] }, 'hold'],
      [0.5, { legL: [-30, 0, 6], shinL: [60, 0, 0], legR: [-10, 0, -6], shinR: [30, 0, 0], root: [0, 0, 0], chest: [-14, 0, 0], head: [-10, 0, 0], ikR: [-6, 70, 18], bladeR: [0, -84, 0], elbowR: [-0.8, 0.2, -0.4], ikL: [6, 72, 16], elbowL: [0.8, 0.2, -0.4] }, 'snap'],
      [0.96, { legL: [-50, 0, 6], shinL: [80, 0, 0], legR: [-20, 0, -6], shinR: [50, 0, 0], root: [0, 0, 0], chest: [-6, 0, 0], head: [6, 0, 0], ikR: [-4, 66, 22], bladeR: [0, -86, 0], elbowR: [-0.8, 0.2, -0.4], ikL: [4, 68, 20], elbowL: [0.8, 0.2, -0.4] }],
      [1.08, { legL: [-60, 0, 8], shinL: [100, 0, 0], legR: [-30, 0, -8], shinR: [96, 0, 0], root: [0, -48, 0], chest: [42, 0, 0], head: [-26, 0, 0], ikR: [-4, -26, 44], bladeR: [0, -84, 0], elbowR: [-0.8, -0.2, 0], ikL: [4, -20, 42], elbowL: [0.8, -0.2, 0] }, 'snap'],
      [1.8, { legL: [-58, 0, 8], shinL: [98, 0, 0], legR: [-30, 0, -8], shinR: [92, 0, 0], root: [0, -46, 0], chest: [40, 0, 0], head: [-24, 0, 0], ikR: [-4, -24, 44], bladeR: [0, -84, 0], elbowR: [-0.8, -0.2, 0], ikL: [4, -18, 42], elbowL: [0.8, -0.2, 0] }],
      [1.98, { ...CROUCH, chest: [10, -60, 0], head: [-6, 40, 0], ikR: [-50, 4, 10], bladeR: [-120, -6, 0], elbowR: [-0.6, -0.6, -0.4], ikL: [24, 10, 24] }],
      [2.12, { ...ST, chest: [10, 70, 0], head: [-4, -44, 0], ikR: [36, 4, 26], bladeR: [130, -8, 0], elbowR: [-0.3, -0.8, -0.4], ikL: [28, 6, -10] }, 'snap'],
      [2.3, with_(ST, GUARD)],
    ],
    { ground: false, events: [{ t: 2.0, name: 'swing' }] }
  ),
  // el desvío: la hoja de través, un golpe seco que aparta la tuya
  desvio: clip('cab_desvio', 0.3, [
    [0, with_(ST, GUARD)],
    [0.06, { ...ST, chest: [-2, 34, 0], head: [-8, -24, 0], ikR: [-6, 34, 30], bladeR: [40, 58, 0], elbowR: [-0.8, -0.2, -0.5], ikL: [26, 8, 10] }, 'snap'],
    [0.3, { ...ST, chest: [0, 38, 0], head: [-8, -26, 0], ikR: [-4, 36, 28], bladeR: [46, 62, 0], elbowR: [-0.8, -0.2, -0.5], ikL: [26, 8, 10] }],
  ]),
  // la contra: el tajo de vuelta, de izquierda a derecha, en el acto
  contra: clip(
    'cab_contra',
    0.62,
    [
      [0, { ...ST, chest: [0, 38, 0], head: [-8, -26, 0], ikR: [-4, 36, 28], bladeR: [46, 62, 0], elbowR: [-0.8, -0.2, -0.5], ikL: [26, 8, 10] }],
      [0.08, { ...ST, chest: [4, 52, 0], head: [-6, -30, 0], ikR: [26, 30, 12], bladeR: [140, 20, 0], elbowR: [0.2, -0.4, -0.9], ikL: [28, 10, 2] }, 'hold'],
      [0.18, { ...LUNGE, chest: [14, -44, 0], head: [-6, 26, 0], ikR: [-40, 16, 40], bladeR: [-80, -2, 0], elbowR: [-0.6, -0.7, -0.2], ikL: [20, 20, 26] }, 'snap'],
      [0.36, { ...LUNGE, chest: [12, -52, 0], head: [-4, 28, 0], ikR: [-48, 14, 22], bladeR: [-118, -8, 0], elbowR: [-0.6, -0.7, -0.2], ikL: [20, 20, 26] }],
      [0.62, with_(ST, GUARD)],
    ],
    { events: [{ t: 0.1, name: 'swing' }] }
  ),
  // el paso atrás: salta hacia atrás con un tajo de abajo arriba que suelta
  // otra cuchilla
  atras: clip(
    'cab_atras',
    0.95,
    [
      [0, with_(ST, GUARD)],
      [0.12, { ...CROUCH, chest: [18, 20, 0], head: [-16, -12, 0], ikR: [-34, -14, 18], bladeR: [-30, -40, 0], elbowR: [-0.6, -0.6, -0.4], ikL: [24, 8, 20] }, 'hold'],
      [0.42, { legL: [-40, 0, 6], shinL: [40, 0, 0], legR: [10, 0, -6], shinR: [30, 0, 0], root: [0, -4, -6], chest: [-12, -20, 0], head: [-8, 10, 0], ikR: [-14, 70, 26], bladeR: [10, 70, 0], elbowR: [-0.8, 0, -0.5], ikL: [34, 14, -12] }, 'snap'],
      [0.62, { ...CROUCH, chest: [14, -16, 0], head: [-14, 10, 0], ikR: [-14, 48, 30], bladeR: [8, 44, 0], elbowR: [-0.8, 0, -0.5], ikL: [30, 10, -6] }],
      [0.95, with_(ST, GUARD)],
    ],
    { ground: false, events: [{ t: 0.3, name: 'swing' }] }
  ),
  // la carga del pendón: dos vueltas sobre sí mismo con el pendón tendido
  // (el giro del cuerpo lo pone el ataque: rootRot)
  pendon: clip(
    'cab_pendon',
    1.7,
    [
      [0, with_(ST, GUARD)],
      [0.3, { ...CROUCH, chest: [10, -50, 0], head: [-6, 40, 0], ikR: [-24, 10, 20], bladeR: [-30, 20, 0], ikL: [40, 30, -16], elbowL: [0.4, -0.6, 0.6] }, 'hold'],
      [0.45, { ...ST, chest: [8, 30, 0], head: [-4, -10, 0], ikR: [-30, 10, 10], bladeR: [-60, 10, 0], ikL: [54, 24, 6], elbowL: [0.8, -0.4, 0.2] }, 'snap'],
      [1.3, { ...ST, chest: [8, 30, 0], head: [-4, -10, 0], ikR: [-30, 10, 10], bladeR: [-60, 10, 0], ikL: [54, 24, 6], elbowL: [0.8, -0.4, 0.2] }],
      [1.7, with_(ST, GUARD)],
    ],
    { events: [{ t: 0.4, name: 'swing' }] }
  ),
  // arrancar el pendón de su asta (a media vida)
  arrancar: clip('cab_arrancar', 1.6, [
    [0, with_(ST, GUARD)],
    [0.35, { ...ST, chest: [10, 40, 0], head: [-10, -30, 0], ikR: [-30, 0, 20], bladeR: [-40, -20, 0], ikL: [30, 40, 30], elbowL: [0.7, -0.5, -0.2] }],
    [0.7, { ...ST, chest: [-10, 30, 0], head: [-20, -20, 0], ikR: [-30, 0, 20], bladeR: [-40, -20, 0], ikL: [26, 70, 14], elbowL: [0.7, -0.2, -0.4] }, 'snap'],
    [1.2, { ...ST, chest: [-14, 10, 0], head: [-30, -6, 0], ikR: [-30, 6, 20], bladeR: [-40, 10, 0], ikL: [24, 84, 4], elbowL: [0.8, -0.1, -0.4] }],
    [1.6, with_(ST, GUARD)],
  ]),
  hurt: clip('cab_hurt', 0.4, [
    [0, { ...ST, ...GUARD, chest: [-20, 30, 0], head: [-20, -10, 0], root: [0, -6, -8] }, 'snap'],
    [0.4, with_(ST, GUARD)],
  ]),
  stagger: clip('cab_stagger', 1.2, [
    [0, { ...ST, chest: [-30, 30, 0], head: [-30, 0, 0], ikR: [-40, 30, -10], bladeR: [-90, 40, 0], ikL: [40, 30, 0], root: [0, -8, -12] }, 'snap'],
    [0.6, { ...CROUCH, chest: [30, 0, 0], head: [10, 0, 0], ikR: [-30, -20, 20], bladeR: [-20, -60, 0], ikL: [26, -10, 20] }],
    [1.2, with_(ST, GUARD)],
  ]),
  // desequilibrado tras tus parrys: la espada fuera, el pecho abierto
  parried: clip('cab_parried', 1.4, [
    [0, { ...ST, chest: [-28, 26, 0], head: [-28, 0, -10], ikR: [-50, 60, -20], bladeR: [-120, 60, 0], elbowR: [-0.7, 0.3, -0.6], ikL: [44, 30, 10], root: [0, -6, -14] }, 'snap'],
    [0.8, { ...CROUCH, chest: [-6, 14, 0], head: [-14, 0, -6], ikR: [-44, 20, 6], bladeR: [-100, 10, 0], ikL: [36, 16, 16] }],
    [1.4, with_(ST, GUARD)],
  ]),
  // de rodillas, la espada clavada delante, la cabeza hacia la luna; luego
  // la frente sobre el pomo (se queda así)
  death: clip(
    'cab_death',
    2.6,
    [
      [0, { ...ST, ...GUARD, chest: [-16, 10, 0], head: [-20, 0, 0] }, 'snap'],
      [0.7, { legL: [-90, 0, 6], shinL: [96, 0, 0], legR: [-20, 0, -6], shinR: [110, 0, 0], root: [0, -50, 0], chest: [20, 0, 0], head: [10, 0, 0], ikR: [-4, -6, 38], bladeR: [0, -76, 0], elbowR: [-0.9, -0.3, 0], ikL: [2, 6, 36], elbowL: [0.9, -0.3, 0] }],
      [1.5, { legL: [-90, 0, 6], shinL: [96, 0, 0], legR: [-20, 0, -6], shinR: [110, 0, 0], root: [0, -50, 0], chest: [6, 0, 0], head: [-26, 0, 0], ikR: [-4, -4, 36], bladeR: [0, -76, 0], elbowR: [-0.9, -0.3, 0], ikL: [2, 8, 34], elbowL: [0.9, -0.3, 0] }],
      [2.6, { legL: [-90, 0, 6], shinL: [96, 0, 0], legR: [-20, 0, -6], shinR: [110, 0, 0], root: [0, -52, 2], chest: [34, 0, 0], head: [30, 0, 0], ikR: [-4, -8, 34], bladeR: [0, -78, 0], elbowR: [-0.9, -0.3, 0], ikL: [2, 4, 32], elbowL: [0.9, -0.3, 0] }],
    ],
    { ground: false }
  ),
};

// IK de los dos brazos (la pose ya en radianes y metros)
export function cabArms(pose, rig) {
  solveArm(pose, rig, 'R');
  solveArm(pose, rig, 'L');
  return pose;
}

// ------------------------------------------------------------ reposo y marcha
function idlePose(e, kind, t) {
  const br = S(t * 1.2 + e.phase) * 1.5;
  // mirando la luna: respira despacio, la cabeza un poco al viento
  if (kind === 'luna' || e.state === 'bossIdle') return cabArms(rad({ ...LUNA, chest: [LUNA.chest[0] + br * 0.4, 0, S(t * 0.4) * 1.5], head: [LUNA.head[0] + S(t * 0.27) * 3, S(t * 0.19) * 6, S(t * 0.33) * 2] }), e.rig);
  return loco(e, t);
}

function loco(e, t) {
  if (e.state === 'bossIdle') return idlePose(e, 'luna', t);
  const br = S(t * 1.8 + e.phase * 0.1);
  const g = e.gait;
  const sw = g ? g.armSwing / (Math.PI / 180) : 0;
  // (la izquierda lleva el compás al moverse)
  const p = { ...GUARD, chest: [GUARD.chest[0] + br * 1.5, GUARD.chest[1], 0], ikL: add(GUARD.ikL, [0, Math.abs(sw) * 0.2, sw * 0.4]) };
  if (e.data && e.data.pendon) p.ikL = [34, 30, 4];
  return cabArms(rad(p), e.rig);
}

// La capa: cuelga, se va hacia atrás al correr y ondea con el viento.
const _v = new THREE.Vector3();
function postPose(e, pose, dt) {
  const D = e.data;
  const sp = Math.hypot(e.vx, e.vz);
  // velocidad en el espacio del cuerpo (hacia delante, de lado)
  const fw = Math.sin(e.yaw) * e.vx + Math.cos(e.yaw) * e.vz;
  const sd = Math.cos(e.yaw) * e.vx - Math.sin(e.yaw) * e.vz;
  const t = e.game.time;
  const gust = 0.5 + 0.5 * S(t * 0.7 + 1.3) * S(t * 0.23);
  const flap = S(t * 7.3) * 0.06 + S(t * 11.1 + 1) * 0.03;
  const want = Math.min(1.25, Math.max(0, fw) * 0.12 + 0.12 + gust * 0.22 + (e.body.grounded ? 0 : 0.5));
  D.capeX = (D.capeX ?? 0) + (want - (D.capeX ?? 0)) * Math.min(1, dt * 6);
  D.capeZ = (D.capeZ ?? 0) + (-sd * 0.06 - (D.capeZ ?? 0)) * Math.min(1, dt * 5);
  // (el pecho inclinado hacia delante ya la separa del cuerpo)
  const lean = pose.chest ? pose.chest[0] : 0;
  pose.cape = [Math.max(0, D.capeX + flap * (0.6 + gust) - Math.max(0, lean) * 0.5), 0, D.capeZ];
  pose.cape2 = [D.capeX * 0.5 + flap * 1.4 * (0.5 + gust), 0, S(t * 5.1) * 0.05];
  void sp;
  void _v;
}

// ------------------------------------------------------------ la pelea
// Una danza a media distancia: rodea a cinco o seis metros, de cara, y
// lanza una habilidad tras otra (casi sin respiro). De frente desvía todo lo
// que no le pille desprevenido y contesta en el acto (la contra); sólo se le
// hiere cuando ya está comprometido en un golpe (pasado guardUntil), en sus
// huecos (tras la última acometida, con la espada clavada tras el salto),
// por la espalda o desequilibrado por tus parrys (el parry sí le abre). En el
// aire no le alcanza nada. A media vida arranca el pendón del Rey de su asta.
const DEG_ = Math.PI / 180;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const angDiff = (a, b) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};
const turnTo = (a, b, k) => {
  const d = angDiff(a, b);
  return a + Math.max(-k, Math.min(k, d));
};
// el pendón, en su asta junto al parapeto de la terraza de la torre del
// homenaje (lo pone world/fortaleza_torre.js)
export const PENDON = FORT.torre.pendon;

// Sus golpes: todos críticos (crit: game/combat.js), con mucho daño al
// aguante si se paran con el escudo, y algo que pasa a través.
const HIT = (dmg, o = {}) => ({ dmg, stDmg: Math.round(dmg * 1.5), crit: true, chip: 0.3, knock: 5, ...o });

// --- la acometida: cruza en línea recta y te pasa de largo; de una a
// cuatro seguidas, cambiando de rumbo (la última deja un hueco)
const _a = new THREE.Vector3(),
  _b = new THREE.Vector3(),
  _c = new THREE.Vector3();
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax,
    dz = bz - az;
  const L = dx * dx + dz * dz;
  const u = L > 1e-6 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)) : 0;
  return Math.hypot(px - (ax + dx * u), pz - (az + dz * u));
}
function dashStart(e) {
  const D = e.data;
  D.dashGo = false;
  D.dashStop = false;
  D.dashHit = false;
  if (!e.atk.chained) D.chainLeft = (D.phase2 ? pick([2, 3, 3, 4]) : pick([1, 2, 2, 3])) - 1;
  if (e.atk.chained) {
    // (encadenada: sin el encogido entero)
    e.stT = 0.1;
    e.anim.play(e.atk.clip, { blend: 0.05, t0: 0.1 });
  }
}
function dashUpdate(e, dt, t) {
  const a = e.atk;
  const D = e.data;
  const g = e.game;
  const p = g.player;
  const [d0, d1] = a.dash;
  if (t >= d0 && !D.dashGo) {
    D.dashGo = true;
    const d = e.distTo(p.pos);
    // (te pasa de largo: lo que hay hasta ti y algo más)
    D.dashV = Math.max(11, Math.min(26, (d + 1.8) / (d1 - d0)));
    D.tipPrev = tipPos(e, _a).clone();
    g.audio && g.audio.play('pikeWhoosh', e.pos);
    g.fx.blood.emit(e.pos.x, e.pos.y + 0.1, e.pos.z, 10, { color: [0.5, 0.48, 0.45], speed: 3, life: 0.5, up: 0.6, gravity: 6 });
  }
  if (t >= d0 && t <= d1 && !D.dashStop) {
    e.vx = Math.sin(e.yaw) * D.dashV;
    e.vz = Math.cos(e.yaw) * D.dashV;
    // la punta barre la línea: si pasa a menos de 0,7 m de ti, te alcanza
    const tp = tipPos(e, _b);
    if (!D.dashHit && !p.dead && Math.abs(p.pos.y - e.pos.y) < 1.6) {
      const dd = Math.min(segDist(p.pos.x, p.pos.z, D.tipPrev.x, D.tipPrev.z, tp.x, tp.z), segDist(p.pos.x, p.pos.z, e.pos.x, e.pos.z, tp.x, tp.z));
      if (dd < 0.7) {
        D.dashHit = true;
        const r = g.combat.apply(e, a, e.pos.x, e.pos.z);
        // (si no le esquivas, se para en ti; si te ha dado, no insiste)
        if (r) D.dashStop = true;
        if (r === 'hit' || r === 'guardbreak') D.chainLeft = 0;
      }
    }
    D.tipPrev.copy(tp);
  } else if (D.dashStop) {
    e.vx *= 0.5;
    e.vz *= 0.5;
  }
  // la siguiente, encadenada; tras la última, el hueco
  if (t >= 0.62 && e.state === 'attack' && e.atk === a) {
    if (D.chainLeft > 0 && !p.dead) {
      D.chainLeft--;
      e.startAttack(ACOMETIDA2);
    } else if (!D.openSet) {
      D.openSet = true;
      D.openT = D.phase2 ? 0.32 : 0.45;
    }
  }
}
const ACOMETIDA = {
  name: 'acometida',
  clip: CAB_CLIPS.acometida,
  dur: 0.9,
  min: 3,
  max: 18,
  weight: 3,
  trackUntil: 0.24,
  turn: 16,
  guardUntil: 0.24,
  cd: 0.4,
  dash: [0.26, 0.58],
  ...HIT(44, { knock: 7 }),
  onStart: (e) => {
    e.data.openSet = false;
    dashStart(e);
  },
  update: dashUpdate,
};
const ACOMETIDA2 = { ...ACOMETIDA, chained: true, onStart: dashStart, trackUntil: 0.26 };

// la punta de la espada (mundo)
const TIP = new THREE.Vector3(0, -0.05, CAB_TIP);
export function tipPos(e, out) {
  return e.rig.worldPos('handR', out, TIP);
}

// --- el tajo del viento: la cuchilla corre por el suelo (tres, a media vida)
const TAJO = {
  name: 'tajo',
  clip: CAB_CLIPS.tajo,
  dur: 1.2,
  min: 3.5,
  max: 24,
  weight: 3,
  trackUntil: 0.44,
  turn: 10,
  guardUntil: 0.44,
  cd: 0.45,
  events: [{ t: 0.46, fn: (e, g) => g.caballero && g.caballero.tajo(e) }],
};
// (la respuesta a un virote: el mismo tajo, más pronto)
const TAJO_R = {
  ...TAJO,
  name: 'tajoR',
  min: 0,
  max: 0,
  onStart: (e) => {
    e.stT = 0.18;
    e.anim.play(e.atk.clip, { blend: 0.05, t0: 0.18 });
  },
};

// --- la cruz: dos tajos en aspa; donde se cruzan queda la estela, que corta
// un instante después (no se para: hay que salir de ella)
const CRUZ = {
  name: 'cruz',
  clip: CAB_CLIPS.cruz,
  dur: 1.45,
  min: 0,
  max: 4.6,
  weight: 3,
  trackUntil: 0.22,
  turn: 9,
  guardUntil: 0.22,
  cd: 0.4,
  hits: [
    [0.25, 0.34],
    [0.5, 0.6],
  ],
  range: 2.9,
  arc: 130,
  ...HIT(40),
  lunge: [
    [0.22, 0.32, 3.6],
    [0.47, 0.57, 3.6],
  ],
  events: [{ t: 0.6, fn: (e, g) => g.caballero && g.caballero.cruz(e) }],
};

// --- el salto: cae de punta donde estabas (eso no se para), se queda con la
// espada clavada (el hueco) y barre al levantarse
const SALTO_AIR = 0.6;
function saltoUpdate(e, dt, t) {
  const D = e.data;
  const g = e.game;
  const p = g.player;
  if (t >= 0.45 && !D.jump) {
    D.jump = true;
    D.landed = false;
    // a donde vas a estar (un poco por delante de ti), sin pasarse
    let tx = p.pos.x + p.vx * 0.25,
      tz = p.pos.z + p.vz * 0.25;
    let dx = tx - e.pos.x,
      dz = tz - e.pos.z;
    let d = Math.hypot(dx, dz) || 1;
    if (d > 13) {
      tx = e.pos.x + (dx / d) * 13;
      tz = e.pos.z + (dz / d) * 13;
      d = 13;
    }
    D.jumpDir = [dx / d, dz / d];
    D.jumpV = Math.min(22, d / SALTO_AIR);
    e.body.vy = 11 * SALTO_AIR;
    e.body.grounded = false;
    e.body.pos.y += 0.05;
    e.yaw = Math.atan2(dx, dz);
    e.perilFx();
    g.audio && g.audio.play('leapWind', e.pos);
  }
  if (D.jump && !D.landed) {
    e.vx = D.jumpDir[0] * D.jumpV;
    e.vz = D.jumpDir[1] * D.jumpV;
    if (t > 0.6 && e.body.grounded) {
      D.landed = true;
      e.vx = e.vz = 0;
      // la punta en las losas: el golpe, la onda y el hueco
      const at = tipPos(e, _c);
      g.combat.shockwave(e.pos.x, e.pos.y, e.pos.z, 3.0, 16, e, 6);
      if (!p.dead && Math.hypot(p.pos.x - at.x, p.pos.z - at.z) < 1.5 && Math.abs(p.pos.y - e.pos.y) < 1.4) g.combat.apply(e, PLUNGE, at.x, at.z);
      g.fx.blood.emit(at.x, e.pos.y + 0.1, at.z, 26, { color: [0.85, 0.9, 1], speed: 5, life: 0.4, up: 2.5 });
      g.audio && g.audio.play('armorClank', e.pos);
      g.camRig.shake(0.45);
      D.openT = D.phase2 ? 0.65 : 0.8;
      // (el clip, en la clave del golpe)
      if (Math.abs(e.stT - 1.08) > 0.06) {
        e.stT = 1.08;
        e.anim.play(e.atk.clip, { blend: 0.04, t0: 1.08 });
      }
    }
  } else if (D.landed) {
    e.vx = e.vz = 0;
  }
  // (si todavía no ha caído cuando el clip ya quería, espera en el aire)
  if (D.jump && !D.landed && t > 1.0) {
    e.stT = 1.0;
    e.anim.t = 1.0;
  }
}
const PLUNGE = HIT(50, { noParry: true, stagger: true, knock: 8 });
const SALTO = {
  name: 'salto',
  clip: CAB_CLIPS.salto,
  dur: 2.3,
  min: 4.5,
  max: 13,
  weight: 2,
  trackUntil: 0.44,
  turn: 10,
  guardUntil: 0.44,
  cd: 0.35,
  hits: [[2.0, 2.14]],
  range: 3.1,
  arc: 360,
  ...HIT(42),
  onStart: (e) => {
    e.data.jump = false;
    e.data.landed = false;
  },
  update: saltoUpdate,
};

// --- la contra: tras desviarte, el tajo de vuelta en el acto
const CONTRA = {
  name: 'contra',
  clip: CAB_CLIPS.contra,
  dur: 0.62,
  min: 0,
  max: 0,
  trackUntil: 0.12,
  turn: 18,
  guardUntil: 0.12,
  cd: 0.3,
  hits: [[0.15, 0.25]],
  range: 2.9,
  arc: 150,
  ...HIT(40),
  lunge: [[0.1, 0.2, 4.2]],
};

// --- el paso atrás: si te le echas encima, salta hacia atrás y te deja una
// cuchilla
const ATRAS = {
  name: 'atras',
  clip: CAB_CLIPS.atras,
  dur: 0.95,
  min: 0,
  max: 2.8,
  weight: 3,
  trackUntil: 0.42,
  turn: 12,
  guardUntil: 0.12,
  cd: 0.3,
  lunge: [[0.12, 0.4, -9.5]],
  update: (e, dt, t) => {
    if (t >= 0.12 && !e.data.hop) {
      e.data.hop = true;
      e.body.vy = 4.2;
      e.body.grounded = false;
      e.body.pos.y += 0.03;
    }
  },
  onStart: (e) => (e.data.hop = false),
  events: [{ t: 0.44, fn: (e, g) => g.caballero && g.caballero.tajo(e, { one: true, v: 15 }) }],
};

// --- la carga del pendón (a media vida): dos vueltas con el pendón tendido
// mientras avanza; barre cuatro metros y medio alrededor (no se para)
function pendonUpdate(e, dt, t) {
  const D = e.data;
  const g = e.game;
  const p = g.player;
  if (t >= 0.45 && t <= 1.3) {
    const u = (t - 0.45) / 0.85;
    D.spin = u * Math.PI * 4;
    const toP = e.angleTo(p.pos);
    e.vx = Math.sin(toP) * 3.4;
    e.vz = Math.cos(toP) * 3.4;
    // el paño, donde va (a la izquierda del cuerpo, y gira con él)
    const ang = e.yaw + D.spin + Math.PI / 2;
    const d = e.distTo(p.pos);
    const k = t < 0.88 ? 0 : 1;
    if (!e.hitDone['p' + k] && !p.dead && d > 0.4 && d < 4.5 && Math.abs(p.pos.y - e.pos.y) < 1.6 && Math.abs(angDiff(ang, e.angleTo(p.pos))) < 0.55) {
      e.hitDone['p' + k] = true;
      g.combat.apply(e, e.atk, e.pos.x, e.pos.z);
    }
    if (Math.floor(u * 8) !== D.whoosh) {
      D.whoosh = Math.floor(u * 8);
      if (D.whoosh % 2 === 0) g.audio && g.audio.play('leapWind', e.pos);
    }
  } else D.spin = 0;
}
const PENDON_ATK = {
  name: 'pendon',
  clip: CAB_CLIPS.pendon,
  dur: 1.7,
  min: 0,
  max: 7,
  weight: 2.5,
  phase: 2,
  trackUntil: 0.4,
  turn: 6,
  guardUntil: 0.4,
  cd: 0.5,
  ...HIT(46, { knock: 8, noParry: true }),
  update: pendonUpdate,
};

// --- a media vida: va a por el pendón, lo arranca de su asta y sigue con él
const IR_PENDON = {
  name: 'irPendon',
  clip: CAB_CLIPS.alert,
  dur: 6,
  min: 0,
  max: 0,
  trackUntil: 0,
  guardUntil: 99,
  cd: 0,
  onStart: (e) => e.anim.stop(0.2),
  update: (e, dt, t) => {
    const d = Math.hypot(PENDON.x - e.pos.x, PENDON.z - e.pos.z);
    // (si algo le estorba demasiado rato, un salto y está allí)
    if (t > 3.2 && d >= 1.0) {
      const g = e.game;
      g.fx.blood.emit(e.pos.x, e.pos.y + 1, e.pos.z, 20, { color: [0.7, 0.75, 0.85], speed: 4, life: 0.4, up: 1.5 });
      const k = 0.85 / d;
      e.body.pos.set(PENDON.x - (PENDON.x - e.pos.x) * k, e.pos.y, PENDON.z - (PENDON.z - e.pos.z) * k);
      g.audio && g.audio.play('leapWind', e.pos);
    }
    if (d < 1.0 || t > 3.2) {
      e.vx = e.vz = 0;
      e.yaw = Math.atan2(PENDON.x - e.pos.x, PENDON.z - e.pos.z);
      e.startAttack(ARRANCAR);
      return;
    }
    e.chaseTo(PENDON.x, PENDON.z, 7.5, dt, e.pos.y);
    // (corre de verdad: el ataque frena lo que no es una acometida)
    const v = Math.hypot(e.vx, e.vz);
    if (v > 0.1) {
      e.vx *= 7.5 / v;
      e.vz *= 7.5 / v;
    }
    e.yaw = Math.atan2(e.vx, e.vz);
  },
};
const ARRANCAR = {
  name: 'arrancar',
  clip: CAB_CLIPS.arrancar,
  dur: 1.6,
  min: 0,
  max: 0,
  trackUntil: 0,
  guardUntil: 99,
  cd: 0.2,
  update: (e, dt, t) => {
    const D = e.data;
    e.vx = e.vz = 0;
    if (t >= 0.7 && !D.phase2) {
      D.phase2 = true;
      D.wantPhase2 = false;
      e.data.pendon = true;
      const g = e.game;
      g.caballero && g.caballero.tomarPendon(e);
      g.onBossPhase && g.onBossPhase(e);
      g.audio && g.audio.enemyVoice(e, 'alert');
    }
  },
};

const ATTACKS = [ACOMETIDA, TAJO, CRUZ, SALTO, ATRAS, PENDON_ATK];

// ¿Se le puede herir ahora? (desequilibrado, en un hueco, o ya comprometido
// en un golpe)
export function cabOpen(e) {
  const D = e.data;
  if (e.state === 'parried' || e.state === 'stagger' || e.state === 'hurt' || e.state === 'dead') return true;
  if (D.openT > 0) return true;
  if (e.state === 'attack' && e.atk && e.atk.guardUntil !== undefined && e.stT > e.atk.guardUntil) return true;
  return false;
}

// El desvío: la hoja de través, chispas, y la contra (de cerca) o un tajo
// del viento (si le tiras de lejos).
function deflect(e, fromX, fromZ) {
  const g = e.game;
  const p = g.player;
  const D = e.data;
  D.desvios = (D.desvios || 0) + 1;
  e.yaw = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
  const tp = tipPos(e, _a);
  g.fx.blood.emit(tp.x * 0.5 + e.pos.x * 0.5, e.pos.y + 1.3, tp.z * 0.5 + e.pos.z * 0.5, 18, { color: [1, 0.9, 0.6], speed: 6, life: 0.3, up: 1.5 });
  g.audio && g.audio.play('parry', e.pos, { kind: 'blade' });
  if (e.state === 'attack' && e.atk && (e.atk.name === 'contra' || e.atk.name === 'tajoR') && e.stT < 0.2) return;
  if (e.distTo(p.pos) > 3.6) e.startAttack(TAJO_R);
  else e.startAttack(CONTRA);
  void fromX;
  void fromZ;
}

function preHit(e, dmg, poise, fromX, fromZ) {
  const D = e.data;
  if (e.atk && (e.atk.name === 'arrancar' || e.atk.name === 'irPendon') && e.state === 'attack') {
    if (e.atk.name === 'irPendon') {
      deflectOnly(e);
      return 'blocked';
    }
    return 'none';
  }
  // (en el aire no le alcanza nada)
  if (!e.body.grounded) return 'none';
  if (cabOpen(e)) return null;
  // por la espalda, sí
  const toSrc = Math.atan2(fromX - e.pos.x, fromZ - e.pos.z);
  if (Math.abs(angDiff(e.yaw, toSrc)) > 80 * DEG_) return null;
  deflect(e, fromX, fromZ);
  void dmg;
  void poise;
  void D;
  return 'blocked';
}
function deflectOnly(e) {
  const g = e.game;
  g.audio && g.audio.play('parry', e.pos, { kind: 'blade' });
}

// Qué habilidad: según la distancia, la fase y sin repetir mucho la misma.
function pickCab(e, d) {
  const D = e.data;
  const opts = [];
  let total = 0;
  const add = (a, w) => {
    if (w <= 0) return;
    if (a.phase && !D.phase2) return;
    if (D.last === a.name) w *= D.last2 === a.name ? 0.1 : 0.4;
    opts.push([a, w]);
    total += w;
  };
  if (d < 2.8) {
    add(ATRAS, 3);
    add(CRUZ, 3);
    add(PENDON_ATK, 2);
  } else if (d < 6) {
    add(ACOMETIDA, 3);
    add(CRUZ, d < 4.6 ? 2.2 : 0);
    add(TAJO, 2);
    add(SALTO, d > 4.5 ? 1.5 : 0);
    add(PENDON_ATK, 2.5);
  } else if (d < 11) {
    add(ACOMETIDA, 3);
    add(TAJO, 3);
    add(SALTO, 2);
    add(PENDON_ATK, d < 7 ? 1.5 : 0);
  } else {
    add(ACOMETIDA, 2);
    add(TAJO, 3);
    add(SALTO, d < 13 ? 1 : 0);
  }
  if (!opts.length) return null;
  let r = Math.random() * total;
  for (const [a, w] of opts) {
    r -= w;
    if (r <= 0) return a;
  }
  return opts[0][0];
}

// La danza: de cara a ti, rodea a la distancia que le gusta y, en cuanto
// puede, lanza la siguiente.
function think(e, player, d, dt) {
  const D = e.data;
  if (D.wantPhase2 && !D.phase2) {
    e.startAttack(IR_PENDON);
    return 'handled';
  }
  const toP = e.angleTo(player.pos);
  e.yaw = turnTo(e.yaw, toP, 10 * dt);
  if (e.cooldown <= 0 && !player.dead && Math.abs(player.pos.y - e.pos.y) < 1.6) {
    const a = pickCab(e, d);
    if (a) {
      D.last2 = D.last;
      D.last = a.name;
      e.startAttack(a);
      return 'handled';
    }
  }
  D.sideT = (D.sideT ?? 0) - dt;
  if (D.sideT <= 0) {
    D.side = Math.random() < 0.5 ? -1 : 1;
    D.sideT = rnd(0.8, 1.8);
  }
  const want = D.phase2 ? 5 : 6;
  if (d > 11) e.chaseTo(player.pos.x, player.pos.z, e.T.run, dt, player.pos.y);
  else {
    const radial = d > want + 1.2 ? 1 : d < want - 1.6 ? -1 : 0;
    const a = toP + D.side * Math.PI * 0.5;
    const mx = Math.sin(a) * 0.9 + Math.sin(toP) * radial * 0.9,
      mz = Math.cos(a) * 0.9 + Math.cos(toP) * radial * 0.9;
    e.steerTo(e.pos.x + mx, e.pos.z + mz, e.T.walk, dt, false);
  }
  e.yaw = turnTo(e.yaw, toP, 10 * dt);
  return 'handled';
}

// Cada fotograma: los huecos que se cierran, la segunda fase, la estela de
// la espada, el respiro tras cada golpe (corto y nunca igual).
function update(e, dt, player) {
  const D = e.data;
  const g = e.game;
  if (D.openT > 0) D.openT -= dt;
  if (!e.dead && !D.phase2 && !D.wantPhase2 && e.hp <= e.maxHp * 0.5 && e.aware) D.wantPhase2 = true;
  // (a media vida, todo un poco más deprisa)
  e.anim.speed = e.state === 'attack' && D.phase2 ? 1.12 : 1;
  if (D.prevState === 'attack' && e.state === 'chase') e.cooldown = rnd(0.25, 0.6) * (D.phase2 ? 0.7 : 1);
  // (tras trastabillar por un parry, la acometida que le quedaba)
  if (D.prevState === 'hurt' && e.state === 'chase' && D.insist) {
    D.insist = false;
    if (D.chainLeft > 0 && !player.dead) {
      D.chainLeft--;
      e.startAttack(ACOMETIDA2);
    }
  }
  D.prevState = e.state;
  if (e.state !== 'attack') D.spin = 0;
  g.caballero && g.caballero.trail(e, e.state === 'attack' && !e.dead);
}

// Le desvías un golpe: se le corta (y la carga del pendón se para). Si sólo
// le haces trastabillar y le quedaban acometidas, insiste en cuanto se
// rehace: ahí está el segundo parry, el que le abre.
function onParried(e, full) {
  const D = e.data;
  D.spin = 0;
  D.dashStop = true;
  if (full) D.chainLeft = 0;
  else D.insist = D.chainLeft > 0;
}

function onWake(e, g) {
  e.aware = true;
  e.state = 'alert';
  e.stT = 0;
  e.anim.play(CAB_CLIPS.alert, { blend: 0.1 });
  g.audio && g.audio.enemyVoice(e, 'alert');
}

function onReset(e) {
  if (e._pendon) for (const m of e._pendon) m.visible = false;
  const g = e.game;
  g.caballero && g.caballero.resetPendon(e);
}

// ------------------------------------------------------------ el tipo
export const CABALLERO_TYPE = {
  name: 'El Caballero de la Orden',
  build: buildCaballero,
  hp: 1000,
  poise: 200,
  radius: 0.42,
  height: 1.98,
  lockHeight: 1.55,
  walk: 2.6,
  run: 5.2,
  runDist: 9,
  sight: 40,
  hear: 40,
  fov: 200,
  turn: 9,
  stride: 2.3,
  approach: 6,
  boss: true,
  // (jefe: dos parrys seguidos para desequilibrarlo)
  parryPosture: 2,
  parryDur: 1.25,
  // la defensa de armadura: el arma hace lo que permite su calidad
  armor: 1,
  keepCorpse: true,
  // (vencido, se queda de rodillas a la vista, aunque sea jefe)
  keepBody: true,
  alertTime: 1.1,
  introDur: 2.4,
  clips: CAB_CLIPS,
  voice: 'soldier',
  attacks: ATTACKS,
  biped: { scale: K, style: { ...GAIT.soldier, strideBase: 0.9 }, stance: 0.13 },
  init: (e) => {
    e.anim.resolve = (s) => cabArms(s, e.rig);
    e.rig.own();
    e._pendon = e.rig.meshes.filter((m) => m.userData.grp === 'pendon');
    for (const m of e._pendon) m.visible = false;
  },
  loco,
  idlePose,
  postPose,
  think,
  preHit,
  update,
  onParried,
  onWake,
  onReset,
  // (la carga del pendón: gira sobre sí mismo)
  rootRot: (e) => {
    if (e.data.spin) e.obj.rotation.y += e.data.spin;
  },
  onAnimEvent: (e, name) => {
    const a = e.game.audio;
    if (!a) return;
    if (name === 'swing') a.play('swingKatana', e.pos);
    else if (name === 'thrust') a.play('thrust', e.pos);
  },
};
