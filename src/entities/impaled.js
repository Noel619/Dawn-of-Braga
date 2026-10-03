// El Empalado: golpes, animación y lo que le pasa al cuerpo en la pelea
// (el modelo está en impaled_model.js; la transformación y la persecución,
// en game/beast_chase.js).
//
// Pelea con la cabeza de carnero de un ariete montada en un madero, a dos
// manos (cinemática inversa: la mano izquierda se agarra al madero sólo para
// golpear; al andar lo arrastra con la derecha y la cabeza de hierro va
// rascando la piedra y echando chispas). Cada golpe tiene su anticipación
// (se para un instante arriba, con el ojo encendido), el impacto que cruza a
// toda velocidad y el final que frena con el peso del arma, con el cuerpo por
// delante y el arma con retraso. El daño no sale de un cono: lo hace la
// cabeza del ariete donde de verdad pasa (o el regatón, o la punta de la
// pica que le sale del vientre), y también revienta lo que encuentra (el
// torno, las almenas, los barriles).
//
// Repertorio: mazazo de arriba abajo (se queda clavado en la piedra y lo
// arranca), barrido, barrido y revés, pisotón, golpe de regatón, estocada
// con la pica de su propio vientre, embestida con la pica por delante como
// una lanza y, cuando ya ha perdido el yelmo, un salto con mazazo.
//
// La armadura se le va cayendo: a los cuatro quintos de vida, la hombrera
// izquierda; luego la visera (se le ve la cara); después la hombrera derecha
// y medio peto. Con un cuarto de vida se transforma (beast_chase.js).
import * as THREE from 'three';
import { clip as rigClip, e2q, Spring } from './rig.js';
import { resolveWeaponArms } from './weapon_common.js';
import { GAIT } from './locomotion.js';
import { buildImpaled, IMP, RAM_GRIP } from './impaled_model.js';
import { clamp, damp, lerp, DEG, angleDiff } from '../core/util.js';

const V3 = THREE.Vector3;
const S = Math.sin;

// ------------------------------------------------------------ autoría de poses
// Las claves se escriben en el espacio del personaje (muñeca derecha en cm
// desde los pies: +x izquierda, +y arriba, +z delante; madero como [rumbo,
// cabeceo] en grados) y se pasan a los canales del pecho (ikR / bladeR).
const _qh = new THREE.Quaternion(),
  _qc = new THREE.Quaternion(),
  _qi = new THREE.Quaternion();
const _hp = new V3(),
  _cp = new V3(),
  _w = new V3(),
  _d = new V3();
const rad3 = (a) => (a ? [a[0] * DEG, a[1] * DEG, a[2] * DEG] : [0, 0, 0]);
function W2C(body, wrist, blade) {
  const root = body.root || [0, 0, 0];
  _hp.set(root[0] / 100, IMP.hipsY + root[1] / 100, root[2] / 100);
  e2q(rad3(body.hips), _qh);
  e2q(rad3(body.chest), _qc);
  _cp.set(0, 0.2, 0).applyQuaternion(_qh).add(_hp);
  _qi.copy(_qh).multiply(_qc).invert();
  _w.set(wrist[0] / 100, wrist[1] / 100, wrist[2] / 100)
    .sub(_cp)
    .applyQuaternion(_qi);
  const cp = Math.cos(blade[1] * DEG);
  _d.set(Math.sin(blade[0] * DEG) * cp, Math.sin(blade[1] * DEG), Math.cos(blade[0] * DEG) * cp).applyQuaternion(_qi);
  return { ikR: [_w.x * 100, _w.y * 100, _w.z * 100], bladeR: [Math.atan2(_d.x, _d.z) / DEG, Math.asin(clamp(_d.y, -1, 1)) / DEG, blade[2] || 0] };
}
// Pose completa: cuerpo + agarre. g: 0 (sólo la derecha) .. 1 (las dos manos)
function P(body, wrist, blade, g = 1, extra = {}) {
  return { elbowR: [-0.55, -0.7, -0.45], elbowL: [0.6, -0.7, -0.3], ikL: [52, -10, 16], ...body, ...W2C(body, wrist, blade), wGrip: [g, 0, 0], ...extra };
}
// Todas las claves de un clip llevan los mismos canales (los que faltan
// valdrían cero: la mano se iría al centro del pecho).
const CH = ['root', 'hips', 'chest', 'head', 'jaw'];
function clip(name, dur, keys, opts = {}) {
  const used = new Set();
  for (const k of keys) for (const j in k[1]) used.add(j);
  for (const j of CH) if (used.has(j)) for (const k of keys) if (!k[1][j]) k[1] = { ...k[1], [j]: [0, 0, 0] };
  return rigClip(name, dur, keys, { mono: true, ...opts });
}
const HIT = { k: 1.6 };
// retrasos: la cadera arranca, el pecho la sigue, el brazo y el madero llegan
// los últimos (y se pasan de largo con el peso)
const LAG = { chest: 0.03, head: 0.06, ikR: 0.05, elbowR: 0.05, bladeR: 0.09, wGrip: 0.04, ikL: 0.05 };

// Piernas (grados) y caderas para las poses de golpe.
const ST = { legL: [14, 0, 5], shinL: [14, 0, 0], legR: [-20, 0, -5], shinR: [22, 0, 0] };
const WIDE = { legL: [-8, 0, 12], shinL: [18, 0, 0], legR: [10, 0, -12], shinR: [20, 0, 0] };
const LNG = { legL: [-42, 0, 6], shinL: [48, 0, 0], legR: [34, 0, -6], shinR: [24, 0, 0] };

// Arrastrando el ariete (la cabeza por el suelo, detrás, a la derecha).
const DRAG_BODY = { chest: [14, 0, 0], head: [-10, 0, 0] };
const DRAG = P(DRAG_BODY, [-62, 158, 22], [-165, -30], 0);
// la pica: dónde la agarra la mano izquierda (espacio del pecho, cm)
const PIKE_GRIP = [21, 36, 43];

// ------------------------------------------------------------ clips
const C = {};
// mazazo: lo alza a dos manos por encima de la cabeza, se para arriba, lo deja
// caer y se queda clavado en la piedra; luego lo arranca
C.slam = clip(
  'i_slam',
  2.9,
  [
    [0, { ...DRAG }],
    [0.38, P({ ...ST, root: [0, -6, 0], chest: [6, -16, 0], head: [-6, 10, 0] }, [-55, 190, 40], [-120, 30], 0.7)],
    [0.8, P({ ...WIDE, root: [0, 2, -6], chest: [-12, -14, 0], head: [-14, 8, 0] }, [-34, 292, -8], [-170, 62])],
    [1.06, P({ ...WIDE, root: [0, 6, -10], chest: [-24, -6, 0], head: [-18, 4, 0] }, [-20, 318, -8], [-178, 80]), 'hold'],
    [1.22, P({ ...LNG, root: [0, -18, 10], chest: [22, 0, 0], head: [-10, 0, 0] }, [-15, 222, 92], [-4, 26]), 'smooth', HIT],
    [1.34, P({ ...LNG, root: [0, -44, 22], chest: [46, 0, 0], head: [-26, 0, 0] }, [-15, 118, 136], [0, -22]), 'settle'],
    [1.95, P({ ...LNG, root: [0, -40, 20], chest: [42, 0, 0], head: [-16, 0, 0] }, [-15, 116, 132], [0, -23])],
    [2.35, P({ ...ST, root: [0, -16, 6], chest: [22, -6, 0], head: [-8, 0, 0] }, [-38, 170, 80], [-40, 8])],
    [2.9, { ...DRAG }],
  ],
  { lag: LAG, events: [{ t: 1.1, name: 'swing' }] }
);
// barrido de derecha a izquierda a la altura de la cintura
const SW0 = P({ ...ST, root: [0, -8, -6], hips: [0, -24, 0], chest: [8, -60, 0], head: [0, 32, 0] }, [-85, 195, -45], [-150, 12]);
const SW1 = P({ ...LNG, root: [0, -14, 8], hips: [0, 4, 0], chest: [14, 4, 0], head: [-6, -4, 0] }, [-10, 185, 105], [0, -4]);
const SW2 = P({ ...LNG, root: [0, -14, 8], hips: [0, 22, 0], chest: [12, 58, 0], head: [-2, -30, 0] }, [75, 185, 45], [112, -2]);
C.sweep = clip(
  'i_sweep',
  2.2,
  [
    [0, { ...DRAG }],
    [0.45, P({ ...ST, root: [0, -6, -2], hips: [0, -14, 0], chest: [6, -38, 0], head: [0, 22, 0] }, [-85, 195, -5], [-125, 8])],
    [0.8, SW0, 'hold'],
    [1.0, SW1, 'smooth', HIT],
    [1.18, SW2, 'settle'],
    [1.7, P({ ...ST, root: [0, -6, 0], chest: [12, 30, 0], head: [-4, -14, 0] }, [30, 170, 70], [60, -15], 0.6)],
    [2.2, { ...DRAG }],
  ],
  { lag: LAG, events: [{ t: 0.86, name: 'swing' }] }
);
// barrido y revés
C.combo = clip(
  'i_combo',
  3.0,
  [
    [0, { ...DRAG }],
    [0.45, P({ ...ST, root: [0, -6, -2], hips: [0, -14, 0], chest: [6, -38, 0], head: [0, 22, 0] }, [-85, 195, -5], [-125, 8])],
    [0.8, SW0, 'hold'],
    [1.0, SW1, 'smooth', HIT],
    [1.18, SW2, 'settle'],
    [1.5, P({ ...ST, root: [0, -6, -4], hips: [0, 18, 0], chest: [8, 56, 0], head: [0, -26, 0] }, [70, 205, 20], [128, 18]), 'hold'],
    [1.72, P({ ...LNG, root: [0, -14, 8], chest: [14, -4, 0], head: [-6, 4, 0] }, [-5, 185, 105], [-6, -2]), 'smooth', HIT],
    [1.9, P({ ...ST, root: [0, -12, 4], hips: [0, -22, 0], chest: [12, -58, 0], head: [0, 30, 0] }, [-85, 185, 30], [-120, -8]), 'settle'],
    [2.5, P({ ...ST, root: [0, -6, 0], chest: [12, -20, 0], head: [-4, 10, 0] }, [-62, 170, 40], [-140, -20], 0.5)],
    [3.0, { ...DRAG }],
  ],
  {
    lag: LAG,
    events: [
      { t: 0.86, name: 'swing' },
      { t: 1.6, name: 'swing' },
    ],
  }
);
// pisotón con la izquierda
C.stomp = clip(
  'i_stomp',
  1.5,
  [
    [0, { ...DRAG, legL: [0, 0, 0], shinL: [0, 0, 0], legR: [0, 0, 0], shinR: [0, 0, 0] }],
    [0.55, { ...DRAG, root: [0, 8, 0], legL: [-72, 0, 10], shinL: [84, 0, 0], legR: [8, 0, -6], shinR: [10, 0, 0], chest: [-12, 0, 0], head: [-14, 0, 0] }, 'hold'],
    [0.68, { ...DRAG, root: [0, -24, 0], legL: [6, 0, 10], shinL: [4, 0, 0], legR: [-10, 0, -6], shinR: [22, 0, 0], chest: [28, 0, 0], head: [-22, 0, 0] }, 'snap'],
    [1.0, { ...DRAG, root: [0, -18, 0], legL: [4, 0, 10], shinL: [6, 0, 0], legR: [-8, 0, -6], shinR: [18, 0, 0], chest: [22, 0, 0], head: [-14, 0, 0] }],
    [1.5, { ...DRAG, legL: [0, 0, 0], shinL: [0, 0, 0], legR: [0, 0, 0], shinR: [0, 0, 0] }],
  ],
  { lag: { chest: 0.02, head: 0.05 } }
);
// golpe de regatón: el madero hacia atrás y el regatón por delante
const JAB0 = P({ ...ST, root: [0, -6, -8], chest: [-6, -12, 0], head: [-4, 6, 0] }, [-48, 196, -12], [178, -10]);
const JAB1 = P({ ...LNG, root: [0, -14, 18], chest: [16, 6, 0], head: [-10, -2, 0] }, [-22, 192, 78], [178, -6]);
C.jab = clip(
  'i_jab',
  1.3,
  [
    [0, { ...DRAG }],
    [0.4, JAB0, 'hold'],
    [0.56, JAB1, 'strike'],
    [0.82, JAB1],
    [1.3, { ...DRAG }],
  ],
  { lag: { chest: 0.02, head: 0.05, ikR: 0.03, bladeR: 0.05 } }
);
// estocada con la pica de su propio vientre: se retuerce hacia atrás y
// adelanta la cadera; la pica sale como una lanza
const PK0 = { ...DRAG, ...P({ ...ST, root: [0, -8, -18], hips: [0, -16, 0], chest: [-6, -26, 0], head: [-4, 22, 0] }, [-62, 158, 0], [-165, -30], 0, { ikL: PIKE_GRIP }) };
const PK1 = { ...DRAG, ...P({ ...LNG, root: [0, -22, 30], hips: [-12, 14, 0], chest: [-16, 12, 0], head: [16, -8, 0] }, [-70, 150, 10], [-160, -26], 0, { ikL: PIKE_GRIP }) };
C.pike = clip(
  'i_pike',
  1.85,
  [
    [0, { ...DRAG }],
    [0.62, PK0, 'hold'],
    [0.84, PK1, 'strike'],
    [1.15, PK1],
    [1.85, { ...DRAG }],
  ],
  { lag: { chest: 0.02, head: 0.05 } }
);
// embestida: agazapado, la mano en la pica y a la carrera (las piernas las
// pone la marcha)
const CH0 = { ...P({ root: [0, -28, 0], chest: [38, 0, 0], head: [-30, 0, 0] }, [-62, 132, -6], [-170, -26], 0, { ikL: PIKE_GRIP }) };
const CH1 = { ...P({ root: [0, -14, 0], chest: [40, 0, 0], head: [-34, 0, 0] }, [-64, 136, -10], [-168, -28], 0, { ikL: PIKE_GRIP }) };
C.charge = clip('i_charge', 2.6, [
  [0, { ...DRAG }],
  [0.75, CH0, 'hold'],
  [0.86, CH1],
  [2.1, CH1],
  [2.6, { ...DRAG }],
]);
// salto con mazazo
C.leap = clip(
  'i_leap',
  3.0,
  [
    [0, { ...DRAG }],
    [0.62, P({ root: [0, -52, 0], chest: [32, 0, 0], head: [-22, 0, 0] }, [-50, 112, 50], [-120, -15]), 'hold'],
    [0.84, P({ root: [0, 6, 0], chest: [-14, 0, 0], head: [-14, 0, 0] }, [-25, 300, 0], [-175, 70])],
    [1.3, P({ root: [0, 0, 0], chest: [-22, -4, 0], head: [-16, 0, 0] }, [-20, 322, -10], [-178, 82]), 'hold'],
    [1.48, P({ root: [0, -10, 8], chest: [20, 0, 0], head: [-10, 0, 0] }, [-15, 230, 90], [-4, 25]), 'smooth', HIT],
    [1.6, P({ root: [0, -44, 22], chest: [46, 0, 0], head: [-26, 0, 0] }, [-15, 118, 136], [0, -22]), 'settle'],
    [2.3, P({ root: [0, -40, 20], chest: [42, 0, 0], head: [-14, 0, 0] }, [-15, 116, 132], [0, -23])],
    [3.0, { ...DRAG }],
  ],
  { lag: LAG, events: [{ t: 1.36, name: 'swing' }] }
);
// arrodillado en mitad del Postigo, como muerto, con el ariete en el suelo
const KNEEL_BODY = { root: [0, -76, 0], legL: [-92, 0, 6], shinL: [96, 0, 0], legR: [10, 0, -6], shinR: [106, 0, 0], chest: [48, 0, 0], head: [38, 0, 0] };
const KNEEL = P(KNEEL_BODY, [-50, 56, 92], [-20, -6], 0, { ikL: [40, -30, 40] });
// se levanta y ruge
C.intro = clip(
  'i_intro',
  3.8,
  [
    [0, { ...KNEEL }],
    [0.9, { ...KNEEL, head: [6, 0, 0], chest: [40, 0, 0] }],
    [
      1.6,
      P({ root: [0, -42, 0], legL: [-62, 0, 6], shinL: [74, 0, 0], legR: [-28, 0, -6], shinR: [92, 0, 0], chest: [30, 0, 0], head: [-4, 0, 0] }, [-62, 132, 60], [-60, -20], 0, { ikL: [50, 10, 40] }),
    ],
    [2.3, { ...DRAG, root: [0, -6, 0], legL: [0, 0, 0], shinL: [0, 0, 0], legR: [0, 0, 0], shinR: [0, 0, 0] }],
    [
      2.55,
      P({ root: [0, 0, -6], legL: [0, 0, 0], shinL: [0, 0, 0], legR: [0, 0, 0], shinR: [0, 0, 0], chest: [-24, 0, 0], head: [-34, 0, 0], jaw: [30, 0, 0] }, [-110, 260, 20], [-110, 50], 0, {
        ikL: [100, 40, 30],
        elbowL: [0.4, -0.8, -0.4],
      }),
      'snap',
    ],
    [
      3.3,
      P({ root: [0, 0, -6], legL: [0, 0, 0], shinL: [0, 0, 0], legR: [0, 0, 0], shinR: [0, 0, 0], chest: [-20, 0, 0], head: [-30, 0, 0], jaw: [26, 0, 0] }, [-108, 256, 22], [-112, 48], 0, {
        ikL: [96, 36, 32],
        elbowL: [0.4, -0.8, -0.4],
      }),
    ],
    [3.8, { ...DRAG, legL: [0, 0, 0], shinL: [0, 0, 0], legR: [0, 0, 0], shinR: [0, 0, 0] }],
  ],
  { ground: false, lag: { chest: 0.04, head: 0.08, ikR: 0.06, bladeR: 0.1 } }
);
C.hurt = clip('i_hurt', 0.55, [
  [0, { ...DRAG, chest: [-8, 14, 0], head: [-16, 0, 10], root: [0, -4, -8] }, 'snap'],
  [0.55, { ...DRAG }],
]);
// tambaleo: cae sobre una rodilla, apoyado en el ariete, y se levanta
const KNEE2 = { root: [0, -62, 0], legL: [-82, 0, 6], shinL: [92, 0, 0], legR: [20, 0, -6], shinR: [100, 0, 0], chest: [40, 0, 0], head: [20, 0, 0] };
C.stagger = clip(
  'i_stagger',
  2.4,
  [
    [0, P({ root: [0, -10, -16], legL: [-16, 0, 8], shinL: [24, 0, 0], legR: [20, 0, -8], shinR: [20, 0, 0], chest: [-26, 18, 0], head: [-28, 0, 0] }, [-95, 195, -20], [-140, 10], 0), 'snap'],
    [0.8, P(KNEE2, [-50, 80, 80], [-10, -10], 0, { ikL: [44, -20, 46] })],
    [1.6, P({ ...KNEE2, chest: [36, 0, 0] }, [-50, 82, 78], [-10, -9], 0, { ikL: [44, -18, 44] })],
    [2.4, { ...DRAG, root: [0, 0, 0], legL: [0, 0, 0], shinL: [0, 0, 0], legR: [0, 0, 0], shinR: [0, 0, 0] }],
  ],
  { ground: false }
);
// se le cae una pieza: se encoge y ruge de dolor
C.pain = clip('i_pain', 1.5, [
  [0, { ...DRAG, chest: [-14, 10, 8], head: [-26, 0, 12], jaw: [0, 0, 0] }, 'snap'],
  [0.45, { ...DRAG, chest: [-22, -6, -6], head: [-38, 0, -8], jaw: [34, 0, 0], ikL: [24, 40, 26] }],
  [1.0, { ...DRAG, chest: [-18, -4, -4], head: [-34, 0, -6], jaw: [30, 0, 0], ikL: [26, 38, 26] }],
  [1.5, { ...DRAG, jaw: [0, 0, 0] }],
]);
C.death = clip(
  'i_death',
  3.0,
  [
    [0, { ...DRAG, chest: [-30, 0, 0], head: [-40, 0, 0] }, 'snap'],
    [1.0, P(KNEE2, [-50, 80, 80], [-10, -10], 0)],
    [2.0, P({ hips: [70, 0, 0], chest: [10, 0, 0], root: [0, -130, 0] }, [-60, 40, 120], [-20, -10], 0), 'in'],
    [3.0, P({ hips: [84, 0, 0], chest: [4, 0, 0], root: [0, -140, 0] }, [-60, 30, 130], [-20, -10], 0)],
  ],
  { ground: false }
);
// desviado (parry): el ariete rebota hacia atrás y arriba, el cuerpo se le va
// detrás y da un paso atrás para no caer
const L0 = { legL: [0, 0, 0], shinL: [0, 0, 0], legR: [0, 0, 0], shinR: [0, 0, 0] };
C.parried = clip(
  'i_parried',
  1.4,
  [
    [
      0,
      P(
        { legL: [-8, 0, 12], shinL: [18, 0, 0], legR: [10, 0, -12], shinR: [20, 0, 0], root: [0, -6, -14], hips: [0, -10, 0], chest: [-22, -24, 0], head: [-26, 14, 0] },
        [-80, 240, -30],
        [-150, 40],
        0.4
      ),
      'snap',
    ],
    [
      0.35,
      P(
        { legL: [-26, 0, 8], shinL: [40, 0, 0], legR: [22, 0, -6], shinR: [26, 0, 0], root: [0, -16, -20], hips: [0, -8, 0], chest: [-14, -18, 0], head: [-18, 10, 0] },
        [-82, 215, -36],
        [-150, 28],
        0.2
      ),
    ],
    [0.95, P({ ...ST, root: [0, -10, -8], chest: [4, -8, 0], head: [-8, 4, 0] }, [-66, 170, 4], [-160, -10], 0)],
    [1.4, { ...DRAG, ...L0 }],
  ],
  { lag: LAG, ground: false }
);
C.alert = C.intro;
export const IMP_CLIPS = C;
export { DRAG, KNEEL, W2C, P as impPose };

// ------------------------------------------------------------ física del arma
const RAM = new V3(...IMP.ramHead);
const BUTT = new V3(...IMP.ramButt);
// (el madero también golpea, aunque menos: quien se le mete dentro del
// alcance no se libra del barrido)
const SHAFT = RAM.clone().multiplyScalar(0.62);
const SHAFT2 = RAM.clone().multiplyScalar(0.3);
const PIKE_TIP = new V3(...IMP.pikeOut).addScaledVector(new V3(...IMP.pikeDir), 0.62);
export const ramPoint = (e, out) => e.rig.worldPos('weapon', out, RAM);
const _a = new V3(),
  _b = new V3(),
  _p0 = new V3(),
  _p1 = new V3(),
  _t = new V3();

// Distancia entre los segmentos p1-q1 y p2-q2.
function segDist(p1, q1, p2, q2) {
  const d1x = q1.x - p1.x,
    d1y = q1.y - p1.y,
    d1z = q1.z - p1.z;
  const d2x = q2.x - p2.x,
    d2y = q2.y - p2.y,
    d2z = q2.z - p2.z;
  const rx = p1.x - p2.x,
    ry = p1.y - p2.y,
    rz = p1.z - p2.z;
  const a = d1x * d1x + d1y * d1y + d1z * d1z,
    e = d2x * d2x + d2y * d2y + d2z * d2z,
    f = d2x * rx + d2y * ry + d2z * rz;
  let s, t;
  if (a <= 1e-8 && e <= 1e-8) return Math.hypot(rx, ry, rz);
  if (a <= 1e-8) {
    s = 0;
    t = clamp(f / e, 0, 1);
  } else {
    const c = d1x * rx + d1y * ry + d1z * rz;
    if (e <= 1e-8) {
      t = 0;
      s = clamp(-c / a, 0, 1);
    } else {
      const b = d1x * d2x + d1y * d2y + d1z * d2z;
      const den = a * e - b * b;
      s = den > 1e-8 ? clamp((b * f - c * e) / den, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp(-c / a, 0, 1);
      } else if (t > 1) {
        t = 1;
        s = clamp((b - c) / a, 0, 1);
      }
    }
  }
  return Math.hypot(p1.x + d1x * s - (p2.x + d2x * t), p1.y + d1y * s - (p2.y + d2y * t), p1.z + d1z * s - (p2.z + d2z * t));
}

// Punto de golpe del arma (en el mundo) para un tipo de ventana.
function strikePoint(e, kind, out) {
  if (kind === 'butt') return e.rig.worldPos('weapon', out, BUTT);
  if (kind === 'pike') return e.rig.worldPos('pike', out, PIKE_TIP);
  if (kind === 'shaft') return e.rig.worldPos('weapon', out, SHAFT);
  if (kind === 'shaft2') return e.rig.worldPos('weapon', out, SHAFT2);
  return e.rig.worldPos('weapon', out, RAM);
}

// ¿La esfera que barre el arma (de a a b, radio r) toca al jugador?
function sweepHitsPlayer(p, a, b, r) {
  _p0.set(p.pos.x, p.pos.y + 0.25, p.pos.z);
  _p1.set(p.pos.x, p.pos.y + 1.6, p.pos.z);
  return segDist(a, b, _p0, _p1) < r + p.body.radius;
}
// Caja de un rompible contra una esfera
function sphereBox(it, c, r) {
  const qx = Math.max(Math.abs(c.x - it.x) - it.hx, 0),
    qz = Math.max(Math.abs(c.z - it.z) - it.hz, 0),
    qy = c.y < it.y ? it.y - c.y : c.y > it.y + it.h ? c.y - it.y - it.h : 0;
  return qx * qx + qy * qy + qz * qz < r * r;
}

// Lo que revienta el arma al pasar.
function smashWith(e, c, r, from, heavy = true) {
  const B = e.game.breakables;
  if (!B) return;
  for (const it of B.list) {
    if (it.broken || Math.abs(it.y - e.pos.y) > 4) continue;
    if (!sphereBox(it, c, r)) continue;
    if ((e.data.smashed || (e.data.smashed = new Set())).has(it)) continue;
    e.data.smashed.add(it);
    if (it.light || heavy) B.crashInto(it, from);
  }
}

// Golpe del arma al suelo: onda, cascotes, sacudida, y lo que haya cerca.
function groundImpact(e, g, r, dmg) {
  const c = ramPoint(e, _t);
  const y = g.world.col.groundHeight(c.x, c.z, 0.3, c.y + 0.6);
  g.combat.shockwave(c.x, y, c.z, r, dmg, e, 8);
  g.fx.blood.emit(c.x, y + 0.2, c.z, 40, { color: [0.36, 0.33, 0.3], speed: 7, life: 0.9, up: 3 });
  g.fx.blood.emit(c.x, y + 0.2, c.z, 14, { color: [1, 0.72, 0.36], speed: 5, life: 0.35, up: 2 });
  g.camRig.shake(0.55);
  g.input && g.input.rumble(0.9, 0.9, 260);
  smashWith(e, _a.set(c.x, y + 0.6, c.z), 1.7, { x: e.pos.x, z: e.pos.z });
  g.audio && g.audio.play('ramImpact', { x: c.x, y, z: c.z });
}

// ------------------------------------------------------------ armadura
// Piezas que se le caen (grupos del modelo) y a qué fracción de vida.
const STAGES = [
  { hp: 0.8, grps: ['pauldronL'] },
  { hp: 0.62, grps: ['visor'] },
  { hp: 0.45, grps: ['pauldronR', 'breastL'] },
];
export const BEAST_AT = 0.25;

// Desprende los grupos del cuerpo: cada malla pasa a ser un trozo suelto con
// su física (rebota, gira y se queda en el suelo) y debajo asoma la carne.
export function shedArmor(e, grps, o = {}) {
  const g = e.game;
  const D = e.P.debris || (e.P.debris = []);
  e.rig.root.updateMatrixWorld(true);
  const cx = e.pos.x,
    cz = e.pos.z;
  for (const m of e.rig.meshes) {
    if (!m.visible || !grps.includes(m.userData.grp)) continue;
    m.updateWorldMatrix(true, false);
    if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
    const bs = m.geometry.boundingSphere;
    // un grupo con el centro de la pieza como origen (gira sobre sí misma)
    const grp = new THREE.Group();
    const inner = new THREE.Mesh(m.geometry, m.material);
    inner.position.copy(bs.center).negate();
    grp.add(inner);
    m.matrixWorld.decompose(grp.position, grp.quaternion, grp.scale);
    grp.position.copy(bs.center).applyMatrix4(m.matrixWorld);
    g.scene.add(grp);
    m.visible = false;
    let dx = grp.position.x - cx,
      dz = grp.position.z - cz;
    const dl = Math.hypot(dx, dz) || 1;
    dx /= dl;
    dz /= dl;
    const k = o.k ?? 1;
    D.push({
      o: grp,
      v: new V3(dx * (2 + Math.random() * 3) * k, (2.5 + Math.random() * 3) * k, dz * (2 + Math.random() * 3) * k),
      w: new V3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9),
      r: Math.min(0.45, bs.radius * 0.5),
      rest: false,
      t: 0,
      metal: /plate|iron|bronze/.test(m.userData.matName),
    });
    g.fx.blood.emit(grp.position.x, grp.position.y, grp.position.z, 16, { speed: 3.5, life: 0.7, up: 1.2 });
  }
  if (!o.quiet && g.audio) g.audio.play('armorFall', { x: cx, y: e.pos.y + 2.4, z: cz });
}

export function updateDebris(e, dt) {
  const D = e.P.debris;
  if (!D || !D.length) return;
  const col = e.game.world.col;
  for (const d of D) {
    if (d.rest) continue;
    d.t += dt;
    d.v.y -= 20 * dt;
    d.o.position.addScaledVector(d.v, dt);
    d.o.rotation.x += d.w.x * dt;
    d.o.rotation.y += d.w.y * dt;
    d.o.rotation.z += d.w.z * dt;
    const p = d.o.position;
    const gy = col.groundHeight(p.x, p.z, 0.05, p.y + 0.6) + d.r;
    if (p.y < gy) {
      p.y = gy;
      if (Math.abs(d.v.y) < 1.5 || d.t > 4) {
        d.v.set(0, 0, 0);
        d.rest = true;
        // tumbada: sin quedar de canto
        d.o.rotation.x = Math.round(d.o.rotation.x / (Math.PI / 2)) * (Math.PI / 2) * 0.15 + d.o.rotation.x * 0.85;
      } else {
        if (d.metal && d.v.y < -4 && e.game.audio) e.game.audio.play('armorClank', { x: p.x, y: p.y, z: p.z });
        d.v.y *= -0.35;
        d.v.x *= 0.55;
        d.v.z *= 0.55;
        d.w.multiplyScalar(0.5);
      }
    }
    // no atraviesa los muros
    for (const ax of [0, 2]) {
      const dir = ax === 0 ? Math.sign(d.v.x) : Math.sign(d.v.z);
      if (!dir) continue;
      if (col.raycast(p.x, p.y, p.z, ax === 0 ? dir : 0, 0, ax === 2 ? dir : 0, d.r + 0.05, (b) => b.maxy - b.miny > 0.6 && !b.camOnly) !== Infinity) {
        if (ax === 0) d.v.x *= -0.3;
        else d.v.z *= -0.3;
      }
    }
  }
}

export function clearDebris(e) {
  const D = e.P.debris;
  if (D) for (const d of D) e.game.scene.remove(d.o);
  e.P.debris = [];
  for (const m of e.rig.meshes) m.visible = true;
}

// ------------------------------------------------------------ IA y cuerpo
const PHASE_SPEED = [1, 1.04, 1.1, 1.16];

function init(e) {
  const P = e.P;
  P.pikeX = new Spring(70, 7);
  P.pikeZ = new Spring(70, 7);
  P.banX = new Spring(26, 3.2);
  P.banZ = new Spring(26, 3.2);
  P.tabF = new Spring(60, 8);
  P.tabB = new Spring(60, 8);
  P.headY = 0;
  P.ram = new V3();
  P.debris = [];
  P.lastYaw = 0;
  // pasos: polvo y temblor cerca del jugador
  if (e.gait) {
    const prev = e.gait.onStep;
    e.gait.onStep = (side, w) => {
      prev && prev(side, w);
      const g = e.game;
      if (!g.player || w < 0.3) return;
      const d = Math.hypot(g.player.pos.x - e.pos.x, g.player.pos.z - e.pos.z);
      if (d < 14) g.camRig.shake(0.08 * (1 - d / 14) + 0.02);
      e.P.pikeX.kick(-0.6);
      const f = e.rig.worldPos('foot' + side, _a);
      g.fx.blood.emit(f.x, e.pos.y + 0.05, f.z, 5, { color: [0.3, 0.28, 0.25], speed: 1.4, life: 0.6, up: 0.6, gravity: 2 });
    };
  }
}

function reset(e) {
  clearDebris(e);
  e.data.stage = 0;
  e.data.phase = 1;
  e.data.smashed = null;
  e.anim.speed = 1;
  const P = e.P;
  for (const k of ['pikeX', 'pikeZ', 'banX', 'banZ', 'tabF', 'tabB']) if (P[k]) ((P[k].x = 0), (P[k].v = 0));
  e.rig.joints.jaw && e.rig.joints.jaw.rotation.set(0, 0, 0);
  e.obj.scale.setScalar(1);
}

// La pose base: arrastra el ariete; la izquierda braccea. Arrodillado antes
// de que entres.
function loco(e, t, spd) {
  if (e.state === 'bossIdle') {
    const b = Math.sin(t * 0.6) * 1.5;
    return radPose({ ...KNEEL, chest: [48 + b, 0, 0], head: [38 + b * 0.5, 0, 0] });
  }
  const g = e.gait;
  const sw = g ? g.armSwing / DEG : 0;
  const run = g ? g.runW * g.mw : 0;
  const br = S(t * 1.1 + e.phase * 0.1);
  const p = { ...DRAG };
  p.chest = [14 + run * 10 + br * 2.5, 0, 0];
  p.head = [-10 - run * 6 - br * 1.2, 0, 0];
  // braceo de la izquierda; la derecha lleva el peso
  p.ikL = [52, -10 + Math.abs(sw) * 0.4, 16 - sw * 1.6];
  return radPose(p);
}

function radPose(p) {
  const o = {};
  for (const k in p) o[k] = k === 'root' || k.startsWith('ik') ? p[k].map((v) => v / 100) : k.startsWith('elbow') || k[0] === 'w' ? p[k].slice() : p[k].map((v) => v * DEG);
  return o;
}

// Antes de aplicar la pose: brazos por IK y movimiento secundario.
const _qw = new THREE.Quaternion(),
  _qp = new THREE.Quaternion(),
  _qd = new THREE.Quaternion();
const _eu = new THREE.Euler();
function postPose(e, pose, dt) {
  resolveWeaponArms(pose, e.rig, RAM_GRIP);
  const P = e.P;
  P._dt = dt;
  const g = e.game;
  // la cabeza sigue al jugador (salvo arrodillado o en una animación con la cabeza)
  const p = g.player;
  let hy = 0;
  if (p && e.state !== 'bossIdle' && e.state !== 'dead' && !e.scripted) hy = clamp(angleDiff(e.yaw, Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z)), -0.7, 0.7);
  P.headY = damp(P.headY, hy, 4, dt);
  pose.head = pose.head || [0, 0, 0];
  pose.head[1] += P.headY;
  // la pica vibra con los pasos, los golpes y los giros
  const yr = angleDiff(P.lastYaw, e.yaw) / Math.max(dt, 1e-3);
  P.lastYaw = e.yaw;
  const px = P.pikeX.update(dt),
    pz = P.pikeZ.update(dt, clamp(-yr * 0.03, -0.12, 0.12));
  pose.pike = [px * 0.08, 0, pz];
  // los faldones de la sobreveste: los empujan los muslos y se quedan atrás
  const lL = pose.legL ? pose.legL[0] : 0,
    lR = pose.legR ? pose.legR[0] : 0;
  const spd = Math.hypot(e.vx, e.vz);
  const f = P.tabF.update(dt, Math.min(0, Math.min(lL, lR)) * 0.75 - spd * 0.02);
  const b = P.tabB.update(dt, Math.max(0, Math.max(lL, lR)) * 0.7 + spd * 0.05);
  pose.tabF = [f + Math.sin(g.time * 3.1 + e.phase) * 0.03, 0, 0];
  pose.tabB = [b + Math.sin(g.time * 2.7) * 0.03, 0, 0];
  // la mandíbula sólo se mueve si alguna animación la abre
  if (!pose.jaw) pose.jaw = [Math.max(0, Math.sin(g.time * 0.9)) * 0.05, 0, 0];
}

// Después de aplicar la pose: el estandarte cuelga hacia el suelo, mecido.
function afterPose(e) {
  const P = e.P;
  const g = e.game;
  const j = e.rig.joints.banner;
  if (!j) return;
  e.obj.updateMatrixWorld(true);
  j.parent.getWorldQuaternion(_qp);
  const dt = Math.min(0.05, P._dt || 1 / 60);
  const spd = Math.hypot(e.vx, e.vz);
  // se queda atrás al andar y ondea con el viento
  const bx = P.banX.update(dt, clamp(-spd * 0.12, -0.6, 0.2) + Math.sin(g.time * 1.7) * 0.08),
    bz = P.banZ.update(dt, Math.sin(g.time * 1.3 + 1) * 0.12);
  // rotación mundial deseada: colgando, girada con el cuerpo
  _eu.set(bx, e.yaw, bz, 'YXZ');
  _qd.setFromEuler(_eu);
  j.quaternion.copy(_qp.invert().multiply(_qd));
  j.updateMatrixWorld(true);
}

function onHit(e, kind, dmg, heavy) {
  const P = e.P;
  P.pikeX.kick((heavy ? -5 : -3) * (Math.random() < 0.5 ? 1 : -1));
  P.pikeZ.kick((Math.random() - 0.5) * 3);
  P.banX.kick(-1.5);
  // chispas en la armadura
  const g = e.game;
  if (kind === 'hit' && g.audio && e.data.stage < 3) g.audio.play('armorHit', { x: e.pos.x, y: e.pos.y + 2, z: e.pos.z });
}

// Antes de recibir el golpe: no muere en esta forma (se transforma con un
// cuarto de vida) ni recibe daño mientras se transforma.
function preHit(e, dmg, poise) {
  if (e.data.transforming) return 'none';
  if (!e.game.beastTransform) return null;
  const floor = e.maxHp * BEAST_AT;
  if (e.hp - dmg <= floor) return { dmg: Math.max(0, e.hp - floor), poise };
  return null;
}

function update(e, dt, player) {
  const g = e.game;
  const P = e.P;
  updateDebris(e, dt);
  if (e.dead || e.data.transforming) return;
  // la armadura se le va cayendo
  const f = e.hp / e.maxHp;
  const st = e.data.stage || 0;
  if (st < STAGES.length && f <= STAGES[st].hp) {
    e.data.stage = st + 1;
    shedArmor(e, STAGES[st].grps);
    g.camRig.shake(0.35);
    g.fx.blood.emit(e.pos.x, e.pos.y + 2.6, e.pos.z, 30, { speed: 5 });
    // ruge de dolor (si no está a mitad de un golpe)
    if (e.state !== 'attack' && e.state !== 'stagger') {
      e.state = 'hurt';
      e.stT = -0.95; // (dura lo que el rugido)
      e.anim.play(IMP_CLIPS.pain, { blend: 0.06 });
      g.audio && g.audio.enemyVoice(e, 'pain');
    }
    if (e.data.stage === 2) g.onImpaledFace && g.onImpaledFace(e);
  }
  e.anim.speed = e.state === 'attack' ? PHASE_SPEED[e.data.stage || 0] : 1;
  // con un cuarto de vida: la transformación (la lleva beast_chase.js)
  if (f <= BEAST_AT + 1e-4 && !e.data.transforming && g.beastTransform) {
    e.data.transforming = true;
    g.beastTransform(e);
    return;
  }
  // golpes del arma (por dónde pasa de verdad) y lo que revienta
  const a = e.atk;
  if (e.state === 'attack' && a) {
    const t = e.stT;
    for (const [kind, wins, r] of [
      ['ram', a.ram, 0.55],
      ['shaft', a.ram, 0.3],
      ['shaft2', a.ram, 0.3],
      ['butt', a.butt, 0.4],
      ['pike', a.pikeHit, 0.32],
    ]) {
      if (!wins) continue;
      const cur = strikePoint(e, kind, _a);
      const prev = e.data['prev_' + kind] || (e.data['prev_' + kind] = cur.clone());
      const shaft = kind === 'shaft' || kind === 'shaft2';
      wins.forEach(([h0, h1], i) => {
        if (t < h0 - 0.02 || t > h1 + 0.02) return;
        const key = (shaft ? 'ram' : kind) + i;
        if (!shaft) smashWith(e, cur, r + 0.25, { x: prev.x, z: prev.z }, kind === 'ram');
        if (e.hitDone[key] || player.dead) return;
        if (sweepHitsPlayer(player, prev, cur, r)) {
          e.hitDone[key] = true;
          // empuja en el sentido del golpe
          let kx = cur.x - prev.x,
            kz = cur.z - prev.z;
          const kl = Math.hypot(kx, kz);
          if (kl < 0.02) {
            kx = player.pos.x - e.pos.x;
            kz = player.pos.z - e.pos.z;
          }
          const kk = Math.hypot(kx, kz) || 1;
          const dmg = shaft ? Math.round(a.dmg * 0.7) : a.dmg;
          const res = g.combat.apply(
            e,
            { dmg, stDmg: a.stDmg ?? dmg * 1.5, stagger: true, knock: (a.knock ?? 7) * (shaft ? 0.7 : 1), chip: 0.2, noParry: !!a.noParry },
            player.pos.x - (kx / kk) * 2,
            player.pos.z - (kz / kk) * 2
          );
          // desviado: el ariete rebota
          if (res === 'parry') {
            P.pikeX.kick(-4);
            P.banX.kick(-2);
          }
        }
      });
      prev.copy(cur);
    }
    // la embestida: el cuerpo y la pica por delante
    if (a.body) {
      for (const [h0, h1] of a.body) {
        if (t < h0 || t > h1 || e.hitDone.body) continue;
        const fx = Math.sin(e.yaw),
          fz = Math.cos(e.yaw);
        const qx = e.pos.x + fx * 1.1,
          qz = e.pos.z + fz * 1.1;
        if (Math.hypot(player.pos.x - qx, player.pos.z - qz) < 1.5 && Math.abs(player.pos.y - e.pos.y) < 2) {
          e.hitDone.body = true;
          g.combat.apply(e, { dmg: a.dmg, stagger: true, knock: 10, unblockable: false, noParry: true, chip: 0.35, stDmg: 80 }, e.pos.x, e.pos.z);
        }
        // lo que encuentra delante, lo atraviesa (o se estrella)
        const B = g.breakables;
        const br = B && B.contact(e.pos.x, e.pos.z, e.body.radius + 0.5, fx, fz, e.pos.y);
        if (br) {
          B.shatter(br, e.pos);
          g.camRig.shake(0.3);
        }
      }
    }
    // la embestida se detiene contra los muros: lo que avanzó en el fotograma
    // anterior frente a su duración
    if (a.name === 'charge' && t > 0.95 && t < 2.05) {
      const moved = Math.hypot(e.pos.x - (e.data.lx ?? e.pos.x), e.pos.z - (e.data.lz ?? e.pos.z));
      if (moved < (e.data.ldt ?? dt) * 2.2) {
        e.state = 'stagger';
        e.stT = 0;
        e.atk = null;
        e.anim.play(IMP_CLIPS.stagger, { blend: 0.05 });
        g.camRig.shake(0.6);
        g.audio && g.audio.play('slam', e.pos);
        g.fx.blood.emit(e.pos.x + Math.sin(e.yaw) * 1.2, e.pos.y + 1.5, e.pos.z + Math.cos(e.yaw) * 1.2, 30, { color: [0.36, 0.33, 0.3], speed: 6, life: 0.9, up: 2 });
      }
    }
  } else {
    e.data.prev_ram = e.data.prev_butt = e.data.prev_pike = null;
    e.data.smashed = null;
  }
  e.data.lx = e.pos.x;
  e.data.lz = e.pos.z;
  e.data.ldt = dt;
  // la cabeza del ariete rasca la piedra al arrastrarla: chispas y chirrido
  const spd = Math.hypot(e.vx, e.vz);
  if ((e.state === 'chase' || e.state === 'return') && spd > 0.35) {
    P.sparkT = (P.sparkT || 0) - dt;
    if (P.sparkT <= 0) {
      P.sparkT = 0.08 + Math.random() * 0.1;
      const c = ramPoint(e, _a);
      const gy = g.world.col.groundHeight(c.x, c.z, 0.2, c.y + 0.5);
      if (c.y - gy < 0.45) {
        g.fx.blood.emit(c.x, gy + 0.05, c.z, 3 + ((Math.random() * 3) | 0), { color: [1, 0.66, 0.3], speed: 2.4, life: 0.3, up: 1.6, gravity: 9 });
        if (Math.random() < 0.35 && g.audio) g.audio.play('scrape', { x: c.x, y: gy, z: c.z });
      }
    }
  }
}

// Al entrar en la niebla: se levanta y ruge (la cámara lo encuadra).
function onWake(e, g) {
  e.aware = true;
  e.state = 'alert';
  e.stT = 0;
  e.anim.play(IMP_CLIPS.intro, { blend: 0.05 });
  setTimeout(() => {
    if (e.state === 'alert' || e.state === 'chase') {
      g.camRig.shake(0.5);
      g.audio && g.audio.play('roar', e.pos);
      g.combat.ring(e.pos.x, e.pos.y, e.pos.z, 6, 0xc04020, 0.9);
    }
  }, 2550);
}

// ------------------------------------------------------------ tipo
const strike = (a) => ({ hits: [], ...a });
const impactEvt = (t, r, dmg) => ({ t, fn: (e, g) => groundImpact(e, g, r, dmg) });
const stompEvt = (t) => ({
  t,
  fn: (e, g) => {
    const f = e.rig.worldPos('footL', _b);
    g.combat.shockwave(f.x, e.pos.y, f.z, 3.2, 20, e, 9);
    g.camRig.shake(0.4);
    smashWith(e, _a.set(f.x, e.pos.y + 0.6, f.z), 2.6, { x: f.x, z: f.z });
  },
});

export const IMPALED_TYPE = {
  name: 'El Empalado',
  build: buildImpaled,
  hp: 680,
  poise: 190,
  radius: 1.0,
  height: 3.4,
  lockHeight: 2.4,
  walk: 1.55,
  sight: 30,
  hear: 30,
  turn: 2.3,
  stride: 1.3,
  approach: 3.0,
  heavy: true,
  boss: true,
  // (jefe: tres parrys seguidos para desequilibrarlo)
  parryPosture: 3,
  parryDur: 1.4,
  clips: C,
  voice: 'impaled',
  alertTime: 3.7,
  introDur: 3.8,
  attacks: [
    strike({
      name: 'slam',
      clip: C.slam,
      dur: 2.9,
      min: 0,
      max: 4.1,
      weight: 3,
      turn: 1.9,
      trackUntil: 1.04,
      ram: [[1.16, 1.36]],
      dmg: 42,
      knock: 8,
      events: [impactEvt(1.34, 3.0, 20)],
      noParry: true,
    }),
    strike({ name: 'sweep', clip: C.sweep, dur: 2.2, min: 0, max: 4.2, weight: 3, turn: 2.1, trackUntil: 0.8, ram: [[0.86, 1.16]], dmg: 32, knock: 7 }),
    strike({
      name: 'combo',
      clip: C.combo,
      dur: 3.0,
      min: 0,
      max: 4.0,
      weight: 2,
      turn: 2.1,
      trackUntil: 0.8,
      cond: (e) => (e.data.stage || 0) >= 1,
      ram: [
        [0.86, 1.16],
        [1.62, 1.88],
      ],
      dmg: 28,
      knock: 6,
    }),
    strike({ name: 'stomp', clip: C.stomp, dur: 1.5, min: 0, max: 2.4, weight: 2, events: [stompEvt(0.68)], noParry: true }),
    strike({ name: 'jab', clip: C.jab, dur: 1.3, min: 0, max: 2.3, weight: 2, turn: 3, trackUntil: 0.4, butt: [[0.48, 0.66]], dmg: 18, knock: 9, lunge: [[0.42, 0.58, 3.5]] }),
    strike({ name: 'pike', clip: C.pike, dur: 1.85, min: 1.0, max: 3.4, weight: 2, turn: 2.6, trackUntil: 0.62, pikeHit: [[0.76, 1.04]], dmg: 28, knock: 7, lunge: [[0.72, 0.98, 6.2]] }),
    strike({ name: 'charge', clip: C.charge, dur: 2.6, min: 5, max: 16, weight: 2, turn: 1.6, trackUntil: 0.8, body: [[0.86, 2.1]], dmg: 34, lunge: [[0.84, 2.1, 8.4]], blend: 0.15, noParry: true }),
    strike({
      name: 'leap',
      clip: C.leap,
      dur: 3.0,
      min: 4.5,
      max: 11,
      weight: 2,
      turn: 2.2,
      trackUntil: 0.8,
      cond: (e) => (e.data.stage || 0) >= 2,
      noParry: true,
      ram: [[1.42, 1.62]],
      dmg: 44,
      knock: 9,
      lunge: [[0.82, 1.58, 6.4]],
      events: [
        {
          t: 0.82,
          fn: (e) => {
            e.body.vy = 9;
            e.body.grounded = false;
            e.body.pos.y += 0.05;
          },
        },
        impactEvt(1.6, 3.8, 26),
      ],
    }),
  ],
  biped: { scale: 1.8, style: { ...GAIT.heavy, armWalk: 10 }, stance: 0.12 },
  init,
  onReset: reset,
  onWake,
  loco,
  idlePose: (e, kind, t, spd) => loco(e, t, spd),
  postPose,
  rootRot: afterPose,
  onHit,
  preHit,
  update,
  onAnimEvent: (e, name) => {
    if (name === 'swing' && e.game.audio) e.game.audio.play('swingHeavy', e.pos);
  },
};
