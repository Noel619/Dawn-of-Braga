// El Lobishome: el jefe de la lobera (world/cloacas_hondas.js), el hombre
// lobo del Miño. Bento, el sétimo, sepulturero de la necrópolis de los
// pobres (PLAN_LOBO.md); el hermano del Desfigurado.
//
// El cuerpo: de pie, más de dos metros, encorvado; flaco hasta el hueso,
// gris, los brazos demasiado largos y las manos con las uñas negras de cavar;
// la mandíbula de lobo le sale de una cara de hombre; los ojos, ámbar. Los
// jirones del sayo de sepulturero y la cuerda con las llaves de la
// necrópolis. Dos maneras de moverse: de pie (la marcha de siempre: Biped) y
// a cuatro patas (galopa: los brazos son las patas de delante).
//
// La cabeza (cómo caza por la lobera, a oscuras, y cómo pelea a la luz),
// aquí, con los estados propios de la criatura (T.states) sobre la de
// siempre (enemy.js: el golpe, el retroceso, el desvío); lo de fuera (los
// braseros, la luz, el aullido que apaga, la luna del pozo), en
// game/lobishome.js.
import * as THREE from 'three';
import { Rig, clip } from './rig.js';
import { humanoidJoints, feetParts } from './models.js';
import { DEG, clamp, damp, approachAngle, angleDiff } from '../core/util.js';
import { GAIT } from './locomotion.js';

const S = Math.sin,
  C = Math.cos;
const K = 1.2; // la escala (de pie, la cabeza a 2,3 m)
const rad = (p) => {
  const o = {};
  for (const k in p) o[k] = k === 'root' ? p[k].map((v) => v / 100) : p[k].map((v) => v * DEG);
  return o;
};

// ------------------------------------------------------------------------ el cuerpo
function buildLobishome() {
  const joints = [...humanoidJoints(K, { arm: 1.32 })];
  joints.push({ name: 'jaw', parent: 'head', pos: [0, 0.02, 0.06] });
  const P = 'loboPiel',
    H = 'loboPelo';
  const parts = [
    // la cadera y el vientre, hundido
    { j: 'hips', type: 'box', s: [0.36, 0.26, 0.26], p: [0, -0.04, 0], taper: [1.1, 0.9], mat: P },
    // el pecho: las costillas a la vista, la columna
    { j: 'chest', type: 'box', s: [0.42, 0.5, 0.3], p: [0, 0.28, 0], taper: [0.82, 1.15], mat: P },
    ...[0.12, 0.22, 0.32, 0.42].map((y) => ({ j: 'chest', type: 'box', s: [0.44, 0.03, 0.31], p: [0, y, 0.005], mat: 'bone' })),
    ...[0.05, 0.16, 0.27, 0.38, 0.49].map((y) => ({ j: 'chest', type: 'box', s: [0.05, 0.05, 0.06], p: [0, y, -0.16], mat: 'bone' })),
    // el pelo, a mechones, por la espalda y los hombros
    ...[
      [0, 0.52, -0.14, 0.32, 0.12, 0.16],
      [0.14, 0.45, -0.12, 0.16, 0.1, 0.14],
      [-0.14, 0.45, -0.12, 0.16, 0.1, 0.14],
      [0, 0.36, -0.17, 0.22, 0.08, 0.12],
      [0.2, 0.55, 0, 0.12, 0.1, 0.14],
      [-0.2, 0.55, 0, 0.12, 0.1, 0.14],
    ].map(([x, y, z, a, b, c]) => ({ j: 'chest', type: 'ico', s: [a, b, c], p: [x, y, z], mat: H, grp: 'lobo' })),
    // el cuello, largo
    { j: 'chest', type: 'box', s: [0.15, 0.2, 0.16], p: [0, 0.6, 0.02], mat: P },
    // la cabeza: el cráneo de hombre, estirado; el hocico que le sale; las
    // orejas; los ojos
    { j: 'head', type: 'box', s: [0.2, 0.22, 0.24], p: [0, 0.1, 0], taper: [0.9, 1.05], mat: P },
    { j: 'head', type: 'box', s: [0.13, 0.1, 0.24], p: [0, 0.06, 0.2], taper: [0.75, 0.85], mat: P, grp: 'lobo' },
    { j: 'head', type: 'box', s: [0.06, 0.04, 0.05], p: [0, 0.09, 0.32], mat: 'black', grp: 'lobo' },
    ...[-0.045, -0.015, 0.015, 0.045].map((x) => ({ j: 'head', type: 'cone', s: [0.012, 0.05], p: [x, 0.0, 0.27], r: [180, 0, 0], mat: 'bone', grp: 'lobo' })),
    { j: 'head', type: 'cone', s: [0.05, 0.14], p: [0.08, 0.25, -0.03], r: [-15, 0, -20], mat: H, grp: 'lobo' },
    { j: 'head', type: 'cone', s: [0.05, 0.14], p: [-0.08, 0.25, -0.03], r: [-15, 0, 20], mat: H, grp: 'lobo' },
    { j: 'head', type: 'ico', s: [0.16, 0.1, 0.14], p: [0, 0.2, -0.06], mat: H, grp: 'lobo' },
    // (lo que se le ve al morir: la cara de un hombre flaco, el pelo pegado,
    // la barba de días; game/lobishome.js)
    { j: 'head', type: 'box', s: [0.05, 0.06, 0.05], p: [0, 0.08, 0.13], mat: P, grp: 'hombre' },
    { j: 'head', type: 'box', s: [0.15, 0.06, 0.08], p: [0, 0.0, 0.08], mat: 'loboPelo', grp: 'hombre' },
    { j: 'head', type: 'box', s: [0.22, 0.08, 0.24], p: [0, 0.22, -0.01], mat: 'loboPelo', grp: 'hombre' },
    { j: 'head', type: 'box', s: [0.03, 0.06, 0.05], p: [0.11, 0.1, 0], mat: P, grp: 'hombre' },
    { j: 'head', type: 'box', s: [0.03, 0.06, 0.05], p: [-0.11, 0.1, 0], mat: P, grp: 'hombre' },
    { j: 'head', type: 'sphere', s: [0.024], p: [0.055, 0.12, 0.12], mat: 'eyeGlow' },
    { j: 'head', type: 'sphere', s: [0.024], p: [-0.055, 0.12, 0.12], mat: 'eyeGlow' },
    { j: 'jaw', type: 'box', s: [0.11, 0.04, 0.22], p: [0, -0.02, 0.13], mat: P, grp: 'lobo' },
    ...[-0.035, 0, 0.035].map((x) => ({ j: 'jaw', type: 'cone', s: [0.011, 0.045], p: [x, 0.02, 0.22], mat: 'bone', grp: 'lobo' })),
    // los brazos, largos, y las manos de cavar con sus uñas negras
    { j: 'armL', type: 'box', s: [0.1, 0.42, 0.1], p: [0, -0.2, 0], taper: [0.8, 0.85], mat: P },
    { j: 'foreL', type: 'box', s: [0.085, 0.42, 0.085], p: [0, -0.2, 0], taper: [0.7, 0.75], mat: P },
    { j: 'handL', type: 'box', s: [0.1, 0.13, 0.06], p: [0, -0.07, 0], mat: P },
    { j: 'armR', type: 'box', s: [0.1, 0.42, 0.1], p: [0, -0.2, 0], taper: [0.8, 0.85], mat: P },
    { j: 'foreR', type: 'box', s: [0.085, 0.42, 0.085], p: [0, -0.2, 0], taper: [0.7, 0.75], mat: P },
    { j: 'handR', type: 'box', s: [0.1, 0.13, 0.06], p: [0, -0.07, 0], mat: P },
    ...['handL', 'handR'].flatMap((j) =>
      [-0.035, -0.012, 0.012, 0.035].map((x) => ({ j, type: 'cone', s: [0.012, 0.12], p: [x, -0.19, 0.02], r: [175, 0, 0], mat: 'black', grp: 'lobo' }))
    ),
    { j: 'armL', type: 'ico', s: [0.1, 0.08, 0.1], p: [0, -0.02, 0], mat: H, grp: 'lobo' },
    { j: 'armR', type: 'ico', s: [0.1, 0.08, 0.1], p: [0, -0.02, 0], mat: H, grp: 'lobo' },
    // los jirones del sayo, colgando de la cadera; la cuerda con las llaves
    ...[
      [0.12, 0.08],
      [-0.1, 0.1],
      [0.02, -0.12],
      [-0.14, -0.06],
    ].map(([x, z]) => ({ j: 'hips', type: 'box', s: [0.12, 0.36, 0.02], p: [x, -0.24, z], r: [z > 0 ? 6 : -6, 0, x * 40], mat: 'burlap' })),
    { j: 'hips', type: 'torus', s: [0.19, 0.012], p: [0, 0.04, 0], r: [90, 0, 0], mat: 'rope', seg: 12 },
    ...[0.05, 0.1].map((dx) => ({ j: 'hips', type: 'box', s: [0.02, 0.09, 0.008], p: [0.17 + dx * 0.2, -0.04 - dx * 0.4, 0.06], mat: 'iron' })),
    // las piernas, de corvejón (largas, delgadas)
    { j: 'legL', type: 'box', s: [0.12, 0.48, 0.13], p: [0, -0.22, 0], taper: [0.75, 0.9], mat: P },
    { j: 'legR', type: 'box', s: [0.12, 0.48, 0.13], p: [0, -0.22, 0], taper: [0.75, 0.9], mat: P },
    { j: 'shinL', type: 'box', s: [0.08, 0.48, 0.09], p: [0, -0.22, 0], taper: [0.7, 0.8], mat: P },
    { j: 'shinR', type: 'box', s: [0.08, 0.48, 0.09], p: [0, -0.22, 0], taper: [0.7, 0.8], mat: P },
    ...feetParts(K, P, { w: 0.09, h: 0.05, l: 0.26 }),
  ];
  return new Rig({ joints, parts });
}

// ------------------------------------------------------------------------ las poses
// De pie: encorvado, los brazos colgando hasta las rodillas, la cabeza
// adelantada.
function dePie(e, t) {
  const g = e.gait;
  const sw = g ? g.armSwing / DEG : 0;
  const br = S(t * 1.7 + e.phase);
  return {
    chest: [26 + br * 2, 0, 0],
    head: [-24, S(t * 0.6) * 6, 0],
    jaw: [6 + br * 3, 0, 0],
    armL: [-6 + sw * 0.6, 0, 12],
    foreL: [-22, 0, 0],
    handL: [10, 0, 0],
    armR: [-6 - sw * 0.6, 0, -12],
    foreR: [-22, 0, 0],
    handR: [10, 0, 0],
  };
}
// A cuatro patas: la cadera baja, el lomo casi horizontal, los brazos son
// las patas de delante; galope (fase en e.data.gal).
function aCuatro(e, t, spd) {
  const f = e.data.gal || 0;
  const k = clamp(spd / 6, 0, 1);
  const a = 34 * (0.35 + 0.65 * k);
  const sp = S(2 * f) * 5 * k;
  return {
    root: [0, -36 + Math.abs(S(f)) * 6 * k, 0],
    hips: [24 + sp, 0, 0],
    chest: [52 - sp, 0, 0],
    head: [-62 + S(f * 2) * 4 * k, 0, 0],
    jaw: [10 + k * 12, 0, 0],
    armL: [-74 + a * S(f), 0, 6],
    foreL: [-14 - Math.max(0, S(f + 1.4)) * 30 * k, 0, 0],
    handL: [40, 0, 0],
    armR: [-74 + a * S(f + 0.5), 0, -6],
    foreR: [-14 - Math.max(0, S(f + 1.9)) * 30 * k, 0, 0],
    handR: [40, 0, 0],
    legL: [-30 + a * S(f + Math.PI), 0, 4],
    shinL: [36 + Math.max(0, S(f + Math.PI + 1.3)) * 34 * k, 0, 0],
    footL: [-16, 0, 0],
    legR: [-30 + a * S(f + Math.PI + 0.5), 0, -4],
    shinR: [36 + Math.max(0, S(f + Math.PI + 1.8)) * 34 * k, 0, 0],
    footR: [-16, 0, 0],
  };
}
// Mirando la luna: de pie, quieto, la cabeza atrás, los brazos caídos.
const LUNA = { chest: [-6, 0, 0], head: [-46, 0, 0], jaw: [18, 0, 0], armL: [4, 0, 8], foreL: [-8, 0, 0], armR: [4, 0, -8], foreR: [-8, 0, 0] };

function loco(e, t, spd) {
  const D = e.data;
  if (D.cuatro) D.gal = (D.gal || 0) + (1 / 30) * Math.max(1.5, spd * 1.25);
  let p;
  if (D.luna) p = { ...LUNA };
  else if ((D.cuatroW || 0) > 0.5) p = aCuatro(e, t, spd);
  else p = dePie(e, t);
  return rad(p);
}

// ------------------------------------------------------------------------ los golpes
const lbClips = {
  // se yergue, abre los brazos y gruñe
  alert: clip('alert', 1.4, [
    [0, { chest: [40, 0, 0], head: [-50, 0, 0] }],
    [0.45, { chest: [-10, 0, 0], head: [-30, 0, 0], jaw: [40, 0, 0], armL: [-60, 0, 70], foreL: [-30, 0, 0], armR: [-60, 0, -70], foreR: [-30, 0, 0] }, 'snap'],
    [1.0, { chest: [5, 0, 0], head: [-20, 0, 0], jaw: [35, 0, 0], armL: [-50, 0, 60], armR: [-50, 0, -60] }],
    [1.4, {}],
  ]),
  // el zarpazo doble, de pie: se yergue, abre los brazos y descarga uno y
  // luego otro
  zarpazo: clip(
    'zarpazo',
    1.45,
    [
      [0, {}],
      [0.36, { chest: [-14, 30, 0], head: [-20, -20, 0], jaw: [30, 0, 0], armR: [-150, 0, -40], foreR: [-50, 0, 0], armL: [-40, 0, 50] }],
      [0.42, { chest: [-16, 34, 0], armR: [-160, 0, -42], foreR: [-55, 0, 0] }, 'hold'],
      [0.56, { chest: [30, -30, 0], head: [-30, 15, 0], armR: [-40, 0, 30], foreR: [-10, 0, 0], armL: [-150, 0, 40], foreL: [-50, 0, 0] }, 'strike'],
      [0.82, { chest: [-10, -30, 0], armL: [-160, 0, 44], foreL: [-55, 0, 0] }],
      [0.95, { chest: [32, 30, 0], head: [-30, -15, 0], armL: [-40, 0, -30], foreL: [-10, 0, 0], armR: [-20, 0, -20] }, 'strike'],
      [1.45, {}],
    ],
    { events: [
      { t: 0.46, name: 'swing' },
      { t: 0.86, name: 'swing' },
    ] }
  ),
  // la dentellada: se agacha con la boca abierta y se tira a la cara
  dentellada: clip(
    'dentellada',
    1.0,
    [
      [0, {}],
      [0.34, { chest: [10, 0, 0], head: [-50, 0, 0], jaw: [55, 0, 0], root: [0, -12, -8] }],
      [0.48, { chest: [50, 0, 0], head: [-35, 0, 0], jaw: [5, 0, 0], root: [0, -18, 14] }, 'strike'],
      [1.0, {}],
    ],
    { events: [{ t: 0.4, name: 'swing' }] }
  ),
  // la embestida desde lo oscuro: a cuatro patas, se tira con las fauces por
  // delante (las patas de delante abiertas)
  embestida: clip(
    'embestida',
    1.25,
    [
      [0, { root: [0, -36, 0], hips: [24, 0, 0], chest: [52, 0, 0], head: [-60, 0, 0], armL: [-74, 0, 6], armR: [-74, 0, -6], legL: [-30, 0, 0], shinL: [36, 0, 0], legR: [-30, 0, 0], shinR: [36, 0, 0] }],
      [0.38, { root: [0, -44, -10], hips: [30, 0, 0], chest: [58, 0, 0], head: [-66, 0, 0], jaw: [50, 0, 0], armL: [-50, 0, 30], armR: [-50, 0, -30], legL: [-10, 0, 0], shinL: [70, 0, 0], legR: [-10, 0, 0], shinR: [70, 0, 0] }],
      [0.58, { root: [0, -20, 30], hips: [10, 0, 0], chest: [40, 0, 0], head: [-40, 0, 0], jaw: [10, 0, 0], armL: [-130, 0, 30], armR: [-130, 0, -30], legL: [-60, 0, 0], shinL: [20, 0, 0], legR: [-60, 0, 0], shinR: [20, 0, 0] }, 'strike'],
      [0.85, { root: [0, -34, 10], hips: [20, 0, 0], chest: [48, 0, 0], head: [-55, 0, 0], jaw: [20, 0, 0], armL: [-80, 0, 10], armR: [-80, 0, -10], legL: [-30, 0, 0], shinL: [40, 0, 0], legR: [-30, 0, 0], shinR: [40, 0, 0] }],
      [1.25, { root: [0, -36, 0], hips: [24, 0, 0], chest: [52, 0, 0], head: [-60, 0, 0], armL: [-74, 0, 6], armR: [-74, 0, -6], legL: [-30, 0, 0], shinL: [36, 0, 0], legR: [-30, 0, 0], shinR: [36, 0, 0] }],
    ],
    { events: [{ t: 0.46, name: 'swing' }], ground: false }
  ),
  // la carga que no toca: se pasa de largo, clava las manos, frena
  // derrapando y se vuelve sacudiendo la cabeza (el momento de pegarle)
  frena: clip(
    'frena',
    1.0,
    [
      [0, { root: [0, -36, 0], hips: [24, 0, 0], chest: [52, 0, 0], head: [-60, 0, 0], armL: [-74, 0, 6], armR: [-74, 0, -6], legL: [-30, 0, 0], shinL: [36, 0, 0], legR: [-30, 0, 0], shinR: [36, 0, 0] }],
      [0.22, { root: [0, -44, -6], hips: [14, 8, 0], chest: [34, 12, 6], head: [-46, 24, 12], jaw: [26, 0, 0], armL: [-104, 0, 16], armR: [-96, 0, -20], legL: [-44, 0, 0], shinL: [58, 0, 0], legR: [-20, 0, 0], shinR: [30, 0, 0] }],
      [0.5, { root: [0, -40, 0], hips: [22, -6, 0], chest: [46, -10, -4], head: [-56, -26, -12], jaw: [38, 0, 0], armL: [-84, 0, 10], armR: [-90, 0, -10], legL: [-30, 0, 0], shinL: [40, 0, 0], legR: [-34, 0, 0], shinR: [44, 0, 0] }],
      [0.74, { root: [0, -38, 0], hips: [24, 4, 0], chest: [50, 6, 2], head: [-58, 14, 6], jaw: [20, 0, 0], armL: [-76, 0, 6], armR: [-76, 0, -6], legL: [-30, 0, 0], shinL: [36, 0, 0], legR: [-30, 0, 0], shinR: [36, 0, 0] }],
      [1.0, { root: [0, -36, 0], hips: [24, 0, 0], chest: [52, 0, 0], head: [-60, 0, 0], armL: [-74, 0, 6], armR: [-74, 0, -6], legL: [-30, 0, 0], shinL: [36, 0, 0], legR: [-30, 0, 0], shinR: [36, 0, 0] }],
    ],
    { ground: false }
  ),
  // el aullido: se para, echa la cabeza atrás y aúlla
  aullido: clip('aullido', 3.4, [
    [0, {}],
    [0.5, { chest: [-18, 0, 0], head: [-70, 0, 0], jaw: [50, 0, 0], armL: [-20, 0, 40], foreL: [-30, 0, 0], armR: [-20, 0, -40], foreR: [-30, 0, 0] }],
    [2.6, { chest: [-22, 0, 0], head: [-76, 0, 0], jaw: [55, 0, 0], armL: [-24, 0, 44], armR: [-24, 0, -44] }],
    [3.4, {}],
  ]),
  // la presa: se tira con las fauces abiertas, a la altura del pecho
  presa: clip(
    'presa',
    1.26,
    [
      [0, {}],
      [0.34, { chest: [10, 0, 0], head: [-55, 0, 0], jaw: [60, 0, 0], armL: [-80, 0, 40], foreL: [-40, 0, 0], armR: [-80, 0, -40], foreR: [-40, 0, 0], root: [0, -10, -10] }],
      [0.54, { chest: [46, 0, 0], head: [-30, 0, 0], jaw: [10, 0, 0], armL: [-110, 0, 20], foreL: [-30, 0, 0], armR: [-110, 0, -20], foreR: [-30, 0, 0], root: [0, -16, 22] }, 'strike'],
      [1.26, {}],
    ],
    { events: [{ t: 0.42, name: 'swing' }] }
  ),
  // te tiene: te sacude con las fauces y tira hacia atrás
  sacude: clip(
    'sacude',
    0.5,
    [
      [0, { chest: [38, 0, 0], head: [-36, -18, 0], jaw: [18, 0, 0], armL: [-100, 0, 24], foreL: [-50, 0, 0], armR: [-100, 0, -24], foreR: [-50, 0, 0], root: [0, -14, -6] }],
      [0.25, { chest: [42, 0, 0], head: [-30, 18, 0], jaw: [14, 0, 0], armL: [-104, 0, 20], foreL: [-46, 0, 0], armR: [-96, 0, -28], foreR: [-54, 0, 0], root: [0, -16, -4] }],
      [0.5, { chest: [38, 0, 0], head: [-36, -18, 0], jaw: [18, 0, 0], armL: [-100, 0, 24], foreL: [-50, 0, 0], armR: [-100, 0, -24], foreR: [-50, 0, 0], root: [0, -14, -6] }],
    ],
    { loop: true }
  ),
  // el entierro: agachado sobre ti, escarba y te echa la tierra encima
  escarba: clip(
    'escarba',
    0.6,
    [
      [0, { chest: [62, 0, 0], head: [-40, 0, 0], jaw: [20, 0, 0], armL: [-120, 0, 20], foreL: [-60, 0, 0], armR: [-60, 0, -20], foreR: [-20, 0, 0], root: [0, -40, 0], legL: [-60, 0, 0], shinL: [90, 0, 0], legR: [-60, 0, 0], shinR: [90, 0, 0] }],
      [0.3, { chest: [64, 0, 0], head: [-38, 0, 0], jaw: [26, 0, 0], armL: [-60, 0, 20], foreL: [-20, 0, 0], armR: [-120, 0, -20], foreR: [-60, 0, 0], root: [0, -40, 0], legL: [-60, 0, 0], shinL: [90, 0, 0], legR: [-60, 0, 0], shinR: [90, 0, 0] }],
      [0.6, { chest: [62, 0, 0], head: [-40, 0, 0], jaw: [20, 0, 0], armL: [-120, 0, 20], foreL: [-60, 0, 0], armR: [-60, 0, -20], foreR: [-20, 0, 0], root: [0, -40, 0], legL: [-60, 0, 0], shinL: [90, 0, 0], legR: [-60, 0, 0], shinR: [90, 0, 0] }],
    ],
    { loop: true, ground: false }
  ),
  // la caída desde la bóveda: llega agachado, a cuatro patas, y se alza
  caida: clip(
    'caida',
    1.3,
    [
      [0, { root: [0, -60, 0], hips: [40, 0, 0], chest: [50, 0, 0], head: [-50, 0, 0], jaw: [40, 0, 0], armL: [-120, 0, 50], foreL: [-30, 0, 0], armR: [-120, 0, -50], foreR: [-30, 0, 0], legL: [-90, 0, 10], shinL: [120, 0, 0], legR: [-90, 0, -10], shinR: [120, 0, 0] }, 'snap'],
      [0.25, { root: [0, -50, 0], hips: [30, 0, 0], chest: [40, 0, 0], head: [-40, 0, 0], jaw: [30, 0, 0], armL: [-90, 0, 40], foreL: [-30, 0, 0], armR: [-90, 0, -40], foreR: [-30, 0, 0], legL: [-80, 0, 10], shinL: [110, 0, 0], legR: [-80, 0, -10], shinR: [110, 0, 0] }],
      [1.3, {}],
    ],
    { ground: false }
  ),
  hurt: clip('hurt', 0.45, [
    [0, { chest: [-14, 18, 0], head: [-10, 30, 0], jaw: [40, 0, 0] }, 'snap'],
    [0.45, {}],
  ]),
  // deslumbrado (un golpe en la luz) o tambaleándose
  stagger: clip('stagger', 1.6, [
    [0, { chest: [-25, 25, 10], head: [-20, 35, 0], jaw: [45, 0, 0], armL: [-80, 0, 40], foreL: [-70, 0, 0], armR: [-90, 0, -30], foreR: [-80, 0, 0] }, 'snap'],
    [0.8, { chest: [10, 15, 5], head: [10, 20, 0], armL: [-100, 0, 20], foreL: [-90, 0, 0], armR: [-100, 0, -20], foreR: [-90, 0, 0] }],
    [1.6, {}],
  ]),
  parried: clip('parried', 1.3, [
    [0, { chest: [-26, -20, 0], head: [-30, -20, 0], jaw: [45, 0, 0], armR: [-120, 0, -60], foreR: [-40, 0, 0] }, 'snap'],
    [0.7, { chest: [-14, -10, 0], armR: [-60, 0, -30] }],
    [1.3, {}],
  ]),
  // cae de rodillas y luego de bruces (a la luz de la luna, se le ve el
  // hombre: game/lobishome.js)
  death: clip('death', 3.0, [
    [0, { chest: [-20, 0, 0], head: [-50, 0, 0], jaw: [50, 0, 0] }, 'snap'],
    [1.0, { root: [0, -60, 0], hips: [20, 0, 0], chest: [10, 0, 0], head: [-30, 0, 0], legL: [-90, 0, 0], shinL: [120, 0, 0], legR: [-90, 0, 0], shinR: [120, 0, 0], armL: [-10, 0, 10], armR: [-10, 0, -10] }],
    [2.2, { root: [0, -100, 30], hips: [70, 0, 0], chest: [30, 0, 0], head: [10, 0, 20], legL: [-20, 0, 0], shinL: [40, 0, 0], legR: [-30, 0, 0], shinR: [60, 0, 0], armL: [-160, 0, 20], armR: [-140, 0, -30] }],
    [3.0, { root: [0, -104, 34], hips: [80, 0, 0], chest: [20, 0, 0], head: [10, 0, 30], legL: [-10, 0, 0], shinL: [30, 0, 0], legR: [-20, 0, 0], shinR: [50, 0, 0], armL: [-170, 0, 20], armR: [-150, 0, -30] }],
  ]),
};

// ------------------------------------------------------------------------ la cabeza
// Los modos (e.data.modo):
//  - 'acecho': a cuatro patas, por lo oscuro, va a un cruce a oscuras a
//    unos metros de ti (por el grafo de la red) y desde ahí te mira (los
//    ojos); al rato, la carga;
//  - 'carga': a cuatro patas, a por ti, y la embestida;
//  - 'retirada': tras golpear, vuelve a lo oscuro, lejos;
//  - 'pelea' (de la segunda fase): de pie, en abierto, con sus golpes; vuelca
//    los braseros encendidos y aúlla;
//  - 'brasero': va a por un brasero encendido y lo vuelca;
//  - 'luna' (tercera fase): si pisa la luz del pozo de las ánimas, se queda
//    mirándola, quieto.
const VEL = { acecho: 4.4, carga: 8.6, retirada: 6.4, pelea: 3.0, brasero: 5.2 };

function lobo(e) {
  return e.game.lobo;
}
function setModo(e, m, t = 0) {
  const D = e.data;
  D.modo = m;
  D.mt = t;
  D.dest = null;
  if (m !== 'techo') {
    D.oculto = false;
    D.air = false;
    D.blanco = null;
  }
  D.cuatro = m === 'acecho' || m === 'carga' || m === 'retirada' || m === 'brasero';
}

// la fase, por la vida que le queda
function fase(e) {
  const f = e.hp / e.maxHp;
  return f > 0.7 ? 1 : f > 0.3 ? 2 : 3;
}

// lo de cada fotograma, antes de lo de siempre (T.update va después: aquí,
// T.think y los estados)
function piensa(e, player, d, dt) {
  const D = e.data;
  const L = lobo(e);
  if (!L) return;
  const g = e.game;
  const f = fase(e);
  if (f !== D.fase) {
    const antes = D.fase;
    D.fase = f;
    e.data.phase = f;
    // la segunda: se pone de pie y pelea en abierto; la tercera: el aullido
    // que lo apaga todo, y a cazar otra vez
    if (antes && f === 2) {
      setModo(e, 'pelea');
      e.startAttack(T.attacks.find((a) => a.name === 'aullido'));
      return 'handled';
    }
    if (antes && f === 3) {
      D.final = true;
      setModo(e, 'retirada');
      e.startAttack(T.attacks.find((a) => a.name === 'aullido'));
      return 'handled';
    }
  }
  if (!D.modo) setModo(e, f === 2 ? 'pelea' : 'acecho');
  return null;
}

function moverA(e, x, z, y, vel, dt) {
  e.chaseTo(x, z, vel, dt, y);
}

// el modo 'pelea': el de siempre (se acerca, golpea), con sus excepciones:
// cada rato, a por el brasero encendido más cercano; si estás en lo oscuro y
// lejos, la carga
function think(e, player, d, dt) {
  const r = piensa(e, player, d, dt);
  if (r) return r;
  const D = e.data;
  const L = lobo(e);
  if (D.modo === 'pelea') {
    D.cuatro = false;
    D.mt += dt;
    if (D.mt > 9 && L) {
      const b = L.braseroCerca(e.pos.x, e.pos.z, 16);
      if (b) {
        setModo(e, 'brasero');
        D.brasero = b;
        e.state = 'lobo';
        return 'handled';
      }
      D.mt = 4;
    }
    if (d > 11 && L && L.luzEn(player.pos.x, player.pos.y, player.pos.z, false) < 0.3 && Math.random() < dt * 0.5) {
      setModo(e, 'carga');
      e.state = 'lobo';
      return 'handled';
    }
    return null;
  }
  // los demás modos se llevan en su estado
  e.state = 'lobo';
  return 'handled';
}

// el estado 'lobo': los modos de caza (acecho, carga, retirada, brasero, luna)
function estadoLobo(e, dt, player, d) {
  const D = e.data;
  const L = lobo(e);
  if (!L || player.dead) {
    e.vx = damp(e.vx, 0, 6, dt);
    e.vz = damp(e.vz, 0, 6, dt);
    return;
  }
  const r = piensa(e, player, d, dt);
  if (r === 'handled') return;
  e.cooldown -= dt;
  D.mt += dt;
  const final = !!D.final;
  // la luna: si la pisa (en la tercera fase), se queda mirándola
  if (final && D.modo !== 'luna' && L.enLuna(e.pos.x, e.pos.z) && (D.lunaCool || 0) <= 0) {
    setModo(e, 'luna');
    D.luna = true;
    e.anim.stop(0.3);
    e.game.audio && e.game.audio.enemyVoice(e, 'idle');
  }
  D.lunaCool = Math.max(0, (D.lunaCool || 0) - dt);
  switch (D.modo) {
    case 'luna': {
      e.vx = damp(e.vx, 0, 8, dt);
      e.vz = damp(e.vz, 0, 8, dt);
      if (D.mt > 3.6) {
        D.luna = false;
        D.lunaCool = 10;
        setModo(e, 'carga');
      }
      return;
    }
    case 'acecho': {
      // a un cruce a oscuras, a unos metros de ti
      if (!D.dest || D.mt > 9) {
        const n = L.escondite(e, player, final ? [7, 13] : [8, 15]);
        D.dest = n ? { x: n.x, y: n.y, z: n.z, espera: (final ? 1.0 : 1.2) + Math.random() * (final ? 1.4 : 1.8) } : { x: player.pos.x, y: player.pos.y, z: player.pos.z, espera: 0 };
        D.mt = 0;
        D.llego = 0;
      }
      const dd = Math.hypot(D.dest.x - e.pos.x, D.dest.z - e.pos.z);
      if (dd > 0.8 && !D.llego) moverA(e, D.dest.x, D.dest.z, D.dest.y, VEL.acecho * (final ? 1.15 : 1), dt);
      else {
        // ahí, quieto, mirándote (se le ven los ojos); y a la carga
        if (!D.llego) {
          D.llego = D.mt;
          if (Math.random() < 0.6) e.game.audio && e.game.audio.enemyVoice(e, 'idle');
        }
        e.vx = damp(e.vx, 0, 8, dt);
        e.vz = damp(e.vz, 0, 8, dt);
        e.yaw = approachAngle(e.yaw, e.angleTo(player.pos), 4 * dt);
        if (D.mt - D.llego > D.dest.espera) {
          // (a veces no carga: trepa por la bóveda y se te deja caer encima)
          const lejos = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
          // (no donde hay luz de verdad: un brasero, la luna; la de tu farol,
          // que va contigo, no cuenta)
          if (lejos < 16 && Math.random() < (final ? 0.45 : 0.3) && L.luzEn(player.pos.x, player.pos.y, player.pos.z, false) < 0.4 && !L.braseroCerca(player.pos.x, player.pos.z, 4.5)) setModo(e, 'techo');
          else setModo(e, 'carga');
        }
      }
      return;
    }
    case 'techo': {
      // trepa (no se le ve, ni los ojos); al rato, el polvo que cae de la
      // bóveda encima de ti; y cae donde estabas
      e.vx = damp(e.vx, 0, 10, dt);
      e.vz = damp(e.vz, 0, 10, dt);
      D.oculto = true;
      D.air = true;
      if (!D.blanco && D.mt > 0.9) {
        D.blanco = { x: player.pos.x, y: player.pos.y, z: player.pos.z };
        e.game.audio && e.game.audio.play('rubble', { x: D.blanco.x, y: D.blanco.y + 3, z: D.blanco.z }, { gain: 0.5 });
      }
      if (D.blanco) {
        D.polvo = (D.polvo || 0) - dt;
        if (D.polvo <= 0 && L.polvo) {
          D.polvo = 0.12;
          L.polvo(D.blanco.x, D.blanco.y, D.blanco.z);
        }
      }
      if (D.blanco && D.mt > 2.1) {
        const B = D.blanco;
        const gy = e.game.world.col.groundHeight(B.x, B.z, 0.3, B.y + 1.2);
        e.body.pos.set(B.x, gy > B.y - 2 ? gy : B.y, B.z);
        e.body.vy = 0;
        e.yaw = e.angleTo(player.pos);
        D.oculto = false;
        D.air = false;
        D.blanco = null;
        D.cuatro = true;
        D.cuatroW = 1;
        e.startAttack(T.attacks.find((a) => a.name === 'caida'));
        D.trasGolpe = true;
        e.game.camRig && e.game.camRig.shake && e.game.camRig.shake(0.4);
        e.game.audio && e.game.audio.play('slam', e.pos, { gain: 0.7 });
      }
      return;
    }
    case 'carga': {
      const vel = VEL.carga * (final ? 1.08 : 1);
      if (d < 2.9 && Math.abs(player.pos.y - e.pos.y) < 1.2 && e.cooldown <= 0) {
        // la embestida (en lo oscuro no se desvía; en la luz, sí) o, a veces,
        // la presa (en la tercera fase, el entierro)
        const enLuz = L.luzEn(e.pos.x, e.pos.y, e.pos.z) > 0.45;
        const presa = e.game.time - (D.presaT ?? -99) > 12 && Math.random() < (final ? 0.45 : 0.32);
        e.startAttack(T.attacks.find((a) => a.name === (presa ? 'presa' : enLuz ? 'embestidaLuz' : 'embestida')));
        D.trasGolpe = true;
        return;
      }
      moverA(e, player.pos.x, player.pos.z, player.pos.y, vel, dt);
      if (D.mt > 7) setModo(e, 'retirada');
      return;
    }
    case 'retirada': {
      if (!D.dest) {
        const n = L.escondite(e, player, [10, 18]);
        D.dest = n ? { x: n.x, y: n.y, z: n.z } : null;
        D.mt = 0;
      }
      if (!D.dest || Math.hypot(D.dest.x - e.pos.x, D.dest.z - e.pos.z) < 0.9 || D.mt > 6) {
        setModo(e, fase(e) === 2 ? 'pelea' : 'acecho');
        if (D.modo === 'pelea') e.state = 'chase';
        return;
      }
      moverA(e, D.dest.x, D.dest.z, D.dest.y, VEL.retirada, dt);
      return;
    }
    case 'brasero': {
      const b = D.brasero;
      if (!b || !b.lit) {
        setModo(e, 'pelea');
        e.state = 'chase';
        return;
      }
      const db = Math.hypot(b.x - e.pos.x, b.z - e.pos.z);
      if (db < 1.6) {
        // lo vuelca de un zarpazo
        e.yaw = Math.atan2(b.x - e.pos.x, b.z - e.pos.z);
        D.cuatro = false;
        e.startAttack(T.attacks.find((a) => a.name === 'volcar'));
        D.volcar = b;
        setModo(e, 'pelea');
        return;
      }
      moverA(e, b.x, b.z, b.y, VEL.brasero, dt);
      if (D.mt > 8) {
        setModo(e, 'pelea');
        e.state = 'chase';
      }
      return;
    }
    default:
      setModo(e, 'pelea');
      e.state = 'chase';
  }
}

// ------------------------------------------------------------------------ la presa
// Si te alcanza: te coge con las fauces y te arrastra hacia lo oscuro (lejos
// del brasero encendido que tengas cerca), sacudiéndote; el farol se te apaga
// hasta que te sueltas (forcejeando) o te lanza. En la tercera fase, el
// entierro: te tumba y escarba, y te echa la tierra encima.
function agarrar(e, g) {
  const p = g.player;
  const D = e.data;
  if (e.state !== 'attack' || D.agarrado) return;
  const d = e.distTo(p.pos);
  const a = Math.abs(angleDiff(e.yaw, e.angleTo(p.pos)));
  if (p.dead || p.iframe || d > 2.0 || a > 60 * DEG || Math.abs(p.pos.y - e.pos.y) > 0.9 || p.state === 'grabbed' || p.state === 'pinned') return;
  D.agarrado = true;
  D.presaT = g.time;
  D.mash0 = 0;
  e.atk = null;
  e.stT = 0;
  if (D.final) {
    p.startPinned && p.startPinned();
    e.state = 'enterrando';
    e.anim.play(lbClips.escarba, { blend: 0.1, loop: true });
  } else {
    p.startGrabbed && p.startGrabbed(e);
    e.state = 'arrastrando';
    e.anim.play(lbClips.sacude, { blend: 0.08, loop: true });
    // (hacia lo oscuro: lejos del brasero encendido que haya cerca)
    let dx = -Math.sin(e.yaw),
      dz = -Math.cos(e.yaw);
    const b = g.lobo && g.lobo.braseroCerca(e.pos.x, e.pos.z, 12);
    if (b) {
      const bx = e.pos.x - b.x,
        bz = e.pos.z - b.z,
        L = Math.hypot(bx, bz) || 1;
      dx = bx / L;
      dz = bz / L;
    }
    D.arrastre = [dx, dz];
  }
  D.mash0 = p.mash || 0;
  g.audio && g.audio.play('grab', p.pos);
  g.audio && g.audio.enemyVoice(e, 'attack');
  g.camRig && g.camRig.shake && g.camRig.shake(0.35);
}
function soltar(e, escapado) {
  const g = e.game;
  const p = g.player;
  const D = e.data;
  D.agarrado = false;
  e.anim.stop(0.15);
  const fx = Math.sin(e.yaw),
    fz = Math.cos(e.yaw);
  if (p.state === 'grabbed') {
    if (escapado) p.releaseGrab && p.releaseGrab(2.4, fx, fz, 0);
    else {
      g.audio && g.audio.play('hit', p.pos);
      p.releaseGrab && p.releaseGrab(4.4, fx, fz, 18);
      g.camRig && g.camRig.shake && g.camRig.shake(0.45);
    }
  } else if (p.state === 'pinned') p.releasePin && p.releasePin(escapado, escapado ? 0 : 30);
  g.lobo && g.lobo.farolVuelve(escapado);
  if (escapado) {
    e.state = 'stagger';
    e.stT = 0;
    e.anim.play(lbClips.stagger, { blend: 0.05 });
    D.trasGolpe = true;
  } else {
    setModo(e, 'retirada');
    e.state = 'lobo';
    e.cooldown = 1.2;
  }
}
// Muerto con el jugador en las fauces (un virote que llega tarde, lo que
// sea): lo suelta. Antes se quedaba agarrado para siempre.
function sueltaMuerto(e) {
  const g = e.game;
  const p = g.player;
  const D = e.data;
  if (!D.agarrado) return;
  D.agarrado = false;
  if (p.state === 'grabbed') p.releaseGrab && p.releaseGrab(1.2, Math.sin(e.yaw), Math.cos(e.yaw), 0);
  else if (p.state === 'pinned') p.releasePin && p.releasePin(true, 0);
  g.lobo && g.lobo.farolVuelve(true);
}
function estadoArrastrando(e, dt, pl) {
  const D = e.data;
  if (pl.state !== 'grabbed' || pl.dead) {
    D.agarrado = false;
    setModo(e, 'retirada');
    e.state = 'lobo';
    e.anim.stop(0.15);
    return;
  }
  // tira hacia atrás (hacia lo oscuro) y te tiene delante, en las fauces
  const [dx, dz] = D.arrastre || [0, 0];
  e.vx = damp(e.vx, dx * 1.9, 6, dt);
  e.vz = damp(e.vz, dz * 1.9, 6, dt);
  e.yaw = approachAngle(e.yaw, Math.atan2(-dx, -dz), 6 * dt);
  const fx = Math.sin(e.yaw),
    fz = Math.cos(e.yaw);
  pl.pos.x = damp(pl.pos.x, e.pos.x + fx * 0.95, 12, dt);
  pl.pos.z = damp(pl.pos.z, e.pos.z + fz * 0.95, 12, dt);
  pl.yaw = Math.atan2(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z);
  D.mordT = (D.mordT ?? 0.3) - dt;
  if (D.mordT <= 0) {
    D.mordT = 0.55;
    pl.receiveBite && pl.receiveBite(5);
    e.game.audio && e.game.audio.play('bite', pl.pos, { gain: 0.6 });
  }
  if ((pl.mash || 0) - (D.mash0 || 0) >= 8) soltar(e, true);
  else if (e.stT > 3.0) soltar(e, false);
}
function estadoEnterrando(e, dt, pl) {
  const D = e.data;
  if (pl.state !== 'pinned' || pl.dead) {
    D.agarrado = false;
    setModo(e, 'retirada');
    e.state = 'lobo';
    e.anim.stop(0.15);
    return;
  }
  // a tus pies, de cara a ti: escarba y te echa la tierra encima
  e.vx = damp(e.vx, 0, 10, dt);
  e.vz = damp(e.vz, 0, 10, dt);
  e.yaw = approachAngle(e.yaw, e.angleTo(pl.pos), 8 * dt);
  D.mordT = (D.mordT ?? 0.25) - dt;
  if (D.mordT <= 0) {
    D.mordT = 0.5;
    pl.receiveBite && pl.receiveBite(3);
    e.game.lobo && e.game.lobo.polvo && e.game.lobo.polvo(pl.pos.x, pl.pos.y - 2.2, pl.pos.z, true);
    e.game.audio && e.game.audio.play('dig', pl.pos, { gain: 0.6 });
  }
  if ((pl.mash || 0) - (D.mash0 || 0) >= 11) soltar(e, true);
  else if (e.stT > 4.0) soltar(e, false);
}

// tras cada golpe: a lo oscuro (en la primera y la tercera fase), o a seguir
// peleando
function trasAtaque(e) {
  const D = e.data;
  if (D.modo === 'pelea') {
    if (Math.random() < 0.28) setModo(e, 'retirada');
    else return;
  } else if (D.trasGolpe) setModo(e, 'retirada');
  D.trasGolpe = false;
  e.state = 'lobo';
}

const T = {
  name: 'El Lobishome',
  build: buildLobishome,
  hp: 1350,
  poise: 90,
  radius: 0.55,
  height: 2.3,
  lockHeight: 1.4,
  walk: 2.4,
  run: 5.6,
  runDist: 5,
  sight: 60,
  hear: 60,
  turn: 6,
  fov: 360,
  approach: 2.0,
  boss: true,
  biped: { scale: K, style: GAIT.heavy, stance: 0.12 },
  clips: lbClips,
  voice: 'lobishome',
  parryDur: 1.3,
  cooldown: 0.6,
  introDur: 3.2,
  attacks: [
    { name: 'zarpazo', clip: lbClips.zarpazo, dur: 1.45, min: 0, max: 2.8, hits: [
      [0.52, 0.62],
      [0.92, 1.02],
    ], dmg: 21, range: 2.7, arc: 120, lunge: [
      [0.48, 0.6, 3.5],
      [0.88, 1.0, 3.0],
    ], weight: 3, cd: 0.7, cond: (e) => e.data.modo === 'pelea' },
    { name: 'dentellada', clip: lbClips.dentellada, dur: 1.0, min: 0, max: 2.4, hits: [[0.44, 0.56]], dmg: 25, range: 2.5, arc: 70, lunge: [[0.4, 0.52, 5]], weight: 2, cd: 0.6, cond: (e) => e.data.modo === 'pelea' },
    { name: 'embestidaPelea', clip: lbClips.embestida, dur: 1.25, min: 3.5, max: 7.5, hits: [[0.5, 0.72]], dmg: 28, range: 2.6, arc: 80, lunge: [[0.38, 0.76, 9.5]], weight: 2, cd: 1.2, cond: (e) => e.data.modo === 'pelea' },
    // (las de la carga: las lanza el estado 'lobo', no se eligen)
    { name: 'embestida', clip: lbClips.embestida, dur: 1.25, min: 99, max: 99, hits: [[0.5, 0.72]], dmg: 30, range: 2.7, arc: 80, lunge: [[0.38, 0.76, 9]], noParry: true, weight: 0, cd: 0.8 },
    { name: 'embestidaLuz', clip: lbClips.embestida, dur: 1.25, min: 99, max: 99, hits: [[0.5, 0.72]], dmg: 30, range: 2.7, arc: 80, lunge: [[0.38, 0.76, 9]], weight: 0, cd: 0.8 },
    // la presa (la lanza la carga; en la pelea, de cerca, a veces)
    { name: 'presa', clip: lbClips.presa, dur: 1.26, min: 0, max: 2.3, hits: [], dmg: 0, range: 2.0, arc: 60, lunge: [[0.34, 0.58, 7]], noParry: true, trackUntil: 0.34, weight: 0.8, cd: 1.0, cond: (e) => e.data.modo === 'pelea' && e.game.time - (e.data.presaT ?? -99) > 14, events: [
      { t: 0.5, fn: agarrar },
      { t: 0.58, fn: agarrar },
    ] },
    // (la carga que no toca: frena y se vuelve; sin golpe, sin aviso)
    { name: 'frena', clip: lbClips.frena, dur: 1.0, min: 99, max: 99, hits: [], trackUntil: 0.8, turn: 3.5, quiet: true, weight: 0, cd: 0.3 },
    // la caída desde la bóveda (la lanza el modo 'techo')
    { name: 'caida', clip: lbClips.caida, dur: 1.3, min: 99, max: 99, hits: [[0.02, 0.16]], dmg: 26, range: 2.4, arc: 360, stagger: true, noParry: true, weight: 0, cd: 0.6 },
    {
      name: 'aullido',
      clip: lbClips.aullido,
      dur: 3.4,
      min: 0,
      max: 14,
      hits: [],
      weight: 0.6,
      cd: 2.5,
      noParry: true,
      cond: (e) => e.data.modo === 'pelea' && (e.data.aullidoCool || 0) <= 0,
      events: [{ t: 0.55, fn: (e, g) => g.lobo && g.lobo.aullido(e) }],
    },
    {
      name: 'volcar',
      clip: lbClips.zarpazo,
      dur: 1.0,
      min: 99,
      max: 99,
      hits: [[0.52, 0.62]],
      dmg: 18,
      range: 2.4,
      arc: 120,
      weight: 0,
      cd: 0.6,
      events: [{ t: 0.56, fn: (e, g) => g.lobo && e.data.volcar && g.lobo.apagar(e.data.volcar.id, true) }],
    },
  ],
  loco,
  idlePose: (e, kind, t) => loco(e, t, 0),
  // (de pie o a cuatro patas: el peso, para no pasar de golpe)
  postPose: (e, pose, dt) => {
    const D = e.data;
    D.cuatroW = damp(D.cuatroW || 0, D.cuatro && !D.luna ? 1 : 0, 6, dt);
  },
  think,
  states: { lobo: estadoLobo, arrastrando: estadoArrastrando, enterrando: estadoEnterrando },
  update: (e, dt) => {
    const D = e.data;
    D.aullidoCool = Math.max(0, (D.aullidoCool || 0) - dt);
    // (acabado un golpe, el de siempre lo deja en 'chase': de ahí, a lo
    // oscuro o a seguir)
    if (e.state === 'attack' && e.atk) D.ultimo = { n: e.atk.name, tocado: e.hitDone.some(Boolean) };
    // (la carga que no toca: se pasa de largo, frena y se vuelve; es cuando
    // se le puede pegar; luego, lo de siempre)
    const u = D.ultimo;
    if (D.prevState === 'attack' && e.state === 'chase' && u && u.n.startsWith('embestida') && !u.tocado && !e.dead) {
      D.ultimo = null;
      e.startAttack(T.attacks.find((a) => a.name === 'frena'));
    } else if (D.prevState === 'attack' && e.state === 'chase') trasAtaque(e);
    // (deslumbrado o herido de veras mientras caza: se va a lo oscuro; no
    // vuelve a la carga a quemarropa)
    else if ((D.prevState === 'stagger' || D.prevState === 'hurt') && e.state === 'chase' && D.modo !== 'pelea' && D.modo !== 'luna') {
      setModo(e, 'retirada');
      D.trasGolpe = false;
      e.state = 'lobo';
    }
    D.prevState = e.state;
  },
  // la primera vez que se le ve: al fondo de la primera galería, de pie,
  // mirando cómo entras; luego, a cuatro patas, a lo oscuro
  onWake: (e, g) => {
    e.aware = true;
    e.state = 'alert';
    e.stT = 0;
    e.anim.play(lbClips.alert, { blend: 0.1 });
    e.data.fase = 1;
    e.data.phase = 1;
    setModo(e, 'acecho');
    e.data.cuatro = false;
    g.lobo && g.lobo.empieza(e);
  },
  // (muerto, se queda: el hombre que era; game/lobishome.js)
  keepCorpse: true,
  keepBody: true,
  deathDur: 30,
  // un golpe en la luz lo deslumbra (se tambalea)
  onHit: (e, kind, dmg, heavy) => {
    const L = e.game.lobo;
    if (kind === 'kill' && L) L.muere(e);
    if (kind !== 'hit' || !L || e.dead) return;
    if (e.data.luna) return;
    // (la luz de un brasero o de la luna: cada tercer golpe, o uno fuerte; la
    // de tu farol, sólo uno fuerte)
    const luz = L.luzEn(e.pos.x, e.pos.y, e.pos.z, false);
    const farol = L.luzEn(e.pos.x, e.pos.y, e.pos.z);
    e.data.golpes = (e.data.golpes || 0) + 1;
    if (((luz > 0.4 && (heavy || e.data.golpes % 3 === 0)) || (farol > 0.5 && heavy)) && e.state !== 'stagger') {
      e.state = 'stagger';
      e.stT = 0;
      e.atk = null;
      e.anim.play(lbClips.stagger, { blend: 0.05 });
    }
  },
  // (en la luna, mirándola, se le pega a gusto)
  onDie: (e) => sueltaMuerto(e),
  preHit: (e, dmg, poise) => (e.data.luna ? { dmg: Math.round(dmg * 1.6), poise: poise * 1.5 } : e.state === 'arrastrando' || e.state === 'enterrando' ? { dmg: Math.round(dmg * 0.6), poise: 0 } : null),
  onReset: (e) => {
    e.data = {};
    e.state = 'bossIdle';
  },
};

export const LOBISHOME_TYPE = T;
export { lbClips };
// (para game/lobishome.js: los modos)
export const LOBO_VEL = VEL;
void C;
void THREE;
