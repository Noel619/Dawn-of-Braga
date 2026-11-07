// Las plantas que se mueven, en lo hondo (world/cloacas_hondas.js): la vida
// que bajó a esconderse se ha vuelto loca, y lo que crece donde nadie llega
// guarda lo suyo. Arraigadas: no andan (se vuelven hacia ti, despacio), pero
// desde donde están llegan lejos.
//  - La zarza: una mata de zarzas con un vástago largo, de espinas, que azota
//    a ras (un barrido ancho) o descarga desde arriba (un golpe que tumba).
//  - La boca: un capullo grande, de carne por dentro, en lo alto de un tallo
//    grueso: duerme caído entre los helechos; cuando te acercas se yergue y
//    se tira a morder, una vez, o dos seguidas.
//  - El bulbo: una vaina hinchada, pálida, con las venas que dan luz: si te
//    acercas, se hincha más y revienta en una nube de esporas (lo que te
//    alcanza duele, y no se para con el escudo). Muerto antes, se deshincha.
// Su voz, en core/audio.js (enemyVoice: 'planta').
import * as THREE from 'three';
import { Rig, clip } from './rig.js';
import { DEG } from '../core/util.js';

const S = Math.sin;

// el balanceo de un vástago (k: cuánto; cada tramo, un poco más)
function mece(p, names, t, ph, k = 1) {
  names.forEach((n, i) => {
    const a = (i + 1) * k;
    p[n] = [(S(t * 0.9 + ph + i * 0.7) * 5 + 3) * a * DEG, S(t * 0.6 + ph * 2 + i) * 4 * a * DEG, S(t * 1.1 + ph + i * 0.5) * 4 * a * DEG];
  });
}

// ======================================================================= LA ZARZA
const LAT = ['l1', 'l2', 'l3', 'l4', 'l5'];
function buildZarza() {
  const joints = [{ name: 'base', pos: [0, 0, 0] }];
  // el vástago largo: cinco tramos, de abajo arriba
  joints.push({ name: 'l1', parent: 'base', pos: [0, 0.3, 0.05] });
  for (let i = 2; i <= 5; i++) joints.push({ name: 'l' + i, parent: 'l' + (i - 1), pos: [0, 0.48, 0] });
  // los vástagos cortos, alrededor
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.6;
    joints.push({ name: 'v' + k + '1', parent: 'base', pos: [Math.cos(a) * 0.32, 0.18, Math.sin(a) * 0.32], rot: [Math.sin(a) * 35, 0, -Math.cos(a) * 35] });
    joints.push({ name: 'v' + k + '2', parent: 'v' + k + '1', pos: [0, 0.4, 0] });
    joints.push({ name: 'v' + k + '3', parent: 'v' + k + '2', pos: [0, 0.36, 0] });
  }
  const parts = [
    // la cepa: raíces y hojas, en montón
    { j: 'base', type: 'ico', s: [0.55, 0.28, 0.55], p: [0, 0.08, 0], mat: 'plantaTallo', detail: 1 },
    ...[0, 1, 2, 3, 4, 5, 6].map((k) => {
      const a = (k / 7) * Math.PI * 2;
      return { j: 'base', type: 'sphere', s: [0.32, 0.05, 0.16], p: [Math.cos(a) * 0.5, 0.06, Math.sin(a) * 0.5], r: [0, -a / DEG, 12], mat: 'plantaHoja' };
    }),
    ...[0, 1, 2, 3, 4].map((k) => {
      const a = (k / 5) * Math.PI * 2 + 0.3;
      return { j: 'base', type: 'cyl', s: [0.05, 0.02, 0.7], p: [Math.cos(a) * 0.55, 0.02, Math.sin(a) * 0.55], r: [90, 0, -a / DEG], mat: 'plantaTallo' };
    }),
  ];
  // el vástago largo, que se adelgaza, con sus espinas
  LAT.forEach((n, i) => {
    const r0 = 0.085 - i * 0.013,
      r1 = 0.085 - (i + 1) * 0.013;
    parts.push({ j: n, type: 'cyl', s: [r1, r0, 0.5], p: [0, 0.24, 0], mat: 'plantaTallo', seg: 6 });
    for (let q = 0; q < 4; q++) {
      const a = q * 1.7 + i;
      parts.push({ j: n, type: 'cone', s: [0.022, 0.13], p: [Math.cos(a) * r0, 0.1 + q * 0.1, Math.sin(a) * r0], r: [Math.sin(a) * 80, 0, -Math.cos(a) * 80], mat: 'bone' });
    }
    if (i % 2 === 1) parts.push({ j: n, type: 'sphere', s: [0.14, 0.03, 0.08], p: [0.1, 0.3, 0], r: [0, 0, 30], mat: 'plantaHoja' });
  });
  parts.push({ j: 'l5', type: 'cone', s: [0.04, 0.3], p: [0, 0.6, 0], mat: 'plantaTallo' });
  for (let k = 0; k < 4; k++)
    for (let i = 1; i <= 3; i++) {
      parts.push({ j: 'v' + k + i, type: 'cyl', s: [0.04 - i * 0.008, 0.05 - i * 0.008, 0.4], p: [0, 0.2, 0], mat: 'plantaTallo', seg: 5 });
      parts.push({ j: 'v' + k + i, type: 'cone', s: [0.018, 0.1], p: [0.05, 0.22, 0], r: [0, 0, -80], mat: 'bone' });
      parts.push({ j: 'v' + k + i, type: 'sphere', s: [0.12, 0.025, 0.07], p: [-0.06, 0.3, 0], r: [0, 0, -30], mat: 'plantaHoja' });
    }
  return new Rig({ joints, parts });
}
const zarzaBase = (e, t) => {
  const p = {};
  mece(p, LAT, t, e.phase, 1);
  for (let k = 0; k < 4; k++) mece(p, ['v' + k + '1', 'v' + k + '2', 'v' + k + '3'], t * 1.2, e.phase + k * 1.7, 1.4);
  return p;
};
const zrClips = {
  alert: clip('alert', 0.8, [
    [0, {}],
    [0.3, { l1: [-25, 0, 0], l2: [-15, 0, 0], l3: [10, 0, 0], l4: [25, 0, 0], l5: [30, 0, 0] }, 'snap'],
    [0.8, { l1: [-8, 0, 0], l2: [-5, 0, 0] }],
  ]),
  // el azote: se tuerce hacia atrás y barre de lado a lado a ras de pecho
  azote: clip(
    'azote',
    1.3,
    [
      [0, {}],
      [0.42, { base: [0, -70, 0], l1: [40, 0, -30], l2: [30, 0, -20], l3: [20, 0, -10], l4: [10, 0, 0], l5: [10, 0, 0] }],
      [0.5, { base: [0, -78, 0], l1: [55, 0, -35], l2: [35, 0, -22], l3: [22, 0, -12], l4: [12, 0, 0], l5: [10, 0, 0] }, 'hold'],
      [0.66, { base: [0, 30, 0], l1: [62, 0, 25], l2: [18, 0, 15], l3: [8, 0, 10], l4: [0, 0, 5], l5: [0, 0, 0] }, 'strike'],
      [0.82, { base: [0, 75, 0], l1: [55, 0, 32], l2: [15, 0, 20], l3: [5, 0, 15], l4: [-5, 0, 10], l5: [-10, 0, 0] }],
      [1.3, {}],
    ],
    { events: [{ t: 0.55, name: 'swing' }] }
  ),
  // el golpe: se alza, se arquea hacia atrás y descarga de arriba
  golpe: clip(
    'golpe',
    1.6,
    [
      [0, {}],
      [0.55, { l1: [-30, 0, 0], l2: [-35, 0, 0], l3: [-30, 0, 0], l4: [-20, 0, 0], l5: [-10, 0, 0] }],
      [0.72, { l1: [-36, 0, 0], l2: [-40, 0, 0], l3: [-34, 0, 0], l4: [-24, 0, 0], l5: [-12, 0, 0] }, 'hold'],
      [0.86, { l1: [70, 0, 0], l2: [35, 0, 0], l3: [15, 0, 0], l4: [5, 0, 0], l5: [0, 0, 0] }, 'strike'],
      [1.1, { l1: [76, 0, 0], l2: [30, 0, 0], l3: [10, 0, 0], l4: [0, 0, 0], l5: [-5, 0, 0] }],
      [1.6, {}],
    ],
    { events: [{ t: 0.74, name: 'swing' }] }
  ),
  hurt: clip('hurt', 0.4, [
    [0, { l1: [-15, 0, 12], l2: [-10, 0, 8], l3: [8, 0, 0] }, 'snap'],
    [0.4, {}],
  ]),
  stagger: clip('stagger', 0.9, [
    [0, { l1: [-30, 0, 25], l2: [-20, 0, 15], l3: [10, 0, 10] }, 'snap'],
    [0.9, {}],
  ]),
  parried: clip('parried', 1.2, [
    [0, { base: [0, 20, 0], l1: [-40, 0, 30], l2: [-25, 0, 20], l3: [-10, 0, 10] }, 'snap'],
    [0.6, { base: [0, 10, 0], l1: [-25, 0, 15], l2: [-10, 0, 8] }],
    [1.2, {}],
  ]),
  // se mustia: el vástago se dobla al suelo y las ramas se cierran
  death: clip('death', 1.6, [
    [0, { l1: [-20, 0, 0] }, 'snap'],
    [0.8, { l1: [70, 0, 10], l2: [40, 0, 5], l3: [30, 0, 0], l4: [20, 0, 0], v01: [40, 0, 0], v11: [40, 0, 0], v21: [40, 0, 0], v31: [40, 0, 0] }],
    [1.6, { l1: [85, 0, 10], l2: [50, 0, 5], l3: [35, 0, 0], l4: [25, 0, 0], l5: [15, 0, 0], v01: [55, 0, 0], v11: [55, 0, 0], v21: [55, 0, 0], v31: [55, 0, 0] }],
  ]),
};

// ======================================================================= LA BOCA
const TALLO = ['s1', 's2', 's3'];
function buildBoca() {
  const joints = [
    { name: 'base', pos: [0, 0, 0] },
    { name: 's1', parent: 'base', pos: [0, 0.18, 0] },
    { name: 's2', parent: 's1', pos: [0, 0.5, 0] },
    { name: 's3', parent: 's2', pos: [0, 0.48, 0] },
    { name: 'head', parent: 's3', pos: [0, 0.42, 0] },
    { name: 'jawU', parent: 'head', pos: [0, 0.02, -0.05] },
    { name: 'jawL', parent: 'head', pos: [0, -0.02, -0.05] },
  ];
  const parts = [
    { j: 'base', type: 'ico', s: [0.45, 0.2, 0.45], p: [0, 0.05, 0], mat: 'plantaTallo', detail: 1 },
    ...[0, 1, 2, 3, 4, 5].map((k) => {
      const a = (k / 6) * Math.PI * 2;
      return { j: 'base', type: 'sphere', s: [0.5, 0.05, 0.22], p: [Math.cos(a) * 0.55, 0.08, Math.sin(a) * 0.55], r: [0, -a / DEG, 14], mat: 'plantaHoja' };
    }),
  ];
  TALLO.forEach((n, i) => {
    parts.push({ j: n, type: 'cyl', s: [0.1 - i * 0.012, 0.12 - i * 0.012, 0.52], p: [0, 0.25, 0], mat: 'plantaTallo', seg: 7 });
    parts.push({ j: n, type: 'sphere', s: [0.26, 0.04, 0.12], p: [0.14, 0.32, 0], r: [0, 0, 35], mat: 'plantaHoja' });
  });
  // la cabeza: dos valvas de carne gruesa, verdes por fuera, rojas por
  // dentro, con su fila de espinas de dientes
  for (const [jn, sg] of [
    ['jawU', 1],
    ['jawL', -1],
  ]) {
    parts.push({ j: jn, type: 'sphere', s: [0.3, 0.17, 0.36], p: [0, sg * 0.06, 0.26], sph: [0, 360, sg > 0 ? 0 : 90, 90], mat: 'plantaBulbo', seg: 9, seg2: 5 });
    parts.push({ j: jn, type: 'sphere', s: [0.27, 0.15, 0.33], p: [0, sg * 0.055, 0.26], sph: [0, 360, sg > 0 ? 0 : 90, 90], mat: 'flesh', seg: 9, seg2: 5, ds: true });
    for (let q = 0; q < 9; q++) {
      const a = -Math.PI / 2 + (q / 8) * Math.PI;
      parts.push({ j: jn, type: 'cone', s: [0.022, 0.11], p: [Math.sin(a) * 0.26, sg * 0.0, 0.26 + Math.cos(a) * 0.3], r: [sg > 0 ? 180 : 0, 0, 0], mat: 'bone' });
    }
  }
  parts.push({ j: 'head', type: 'sphere', s: [0.16, 0.14, 0.12], p: [0, 0, -0.04], mat: 'plantaTallo' });
  return new Rig({ joints, parts });
}
// (dormida: caída entre los helechos, la cabeza en el suelo; despierta, de
// pie, mirándote, con la boca entreabierta)
const bocaBase = (e, t, awake) => {
  const p = {};
  mece(p, TALLO, t, e.phase, 0.6);
  if (!awake) {
    p.s1 = [70 * DEG + S(t * 0.7 + e.phase) * 0.03, 0, 0];
    p.s2 = [40 * DEG, 0, 0];
    p.s3 = [10 * DEG, 0, 0];
    p.head = [-20 * DEG, 0, 0];
    p.jawU = [0, 0, 0];
    p.jawL = [0, 0, 0];
  } else {
    p.s1 = [p.s1[0] + 18 * DEG, p.s1[1], p.s1[2]];
    p.s2 = [p.s2[0] + 12 * DEG, p.s2[1], p.s2[2]];
    p.head = [-30 * DEG + S(t * 2 + e.phase) * 0.05, 0, 0];
    const o = 0.2 + S(t * 3.1 + e.phase) * 0.1;
    p.jawU = [-o, 0, 0];
    p.jawL = [o, 0, 0];
  }
  return p;
};
const bcClips = {
  alert: clip('alert', 0.9, [
    [0, { s1: [70, 0, 0], s2: [40, 0, 0], s3: [10, 0, 0], head: [-20, 0, 0] }],
    [0.35, { s1: [-10, 0, 0], s2: [-20, 0, 0], s3: [-15, 0, 0], head: [-50, 0, 0], jawU: [-50, 0, 0], jawL: [45, 0, 0] }, 'snap'],
    [0.9, { s1: [15, 0, 0], s2: [10, 0, 0], head: [-30, 0, 0], jawU: [-15, 0, 0], jawL: [15, 0, 0] }],
  ]),
  // el mordisco: se recoge hacia atrás, abre y se tira
  mordisco: clip(
    'mordisco',
    1.05,
    [
      [0, {}],
      [0.4, { s1: [-25, 0, 0], s2: [-25, 0, 0], s3: [-10, 0, 0], head: [-25, 0, 0], jawU: [-60, 0, 0], jawL: [55, 0, 0] }],
      [0.46, { s1: [-28, 0, 0], s2: [-28, 0, 0], s3: [-12, 0, 0], head: [-28, 0, 0], jawU: [-65, 0, 0], jawL: [60, 0, 0] }, 'hold'],
      [0.58, { s1: [55, 0, 0], s2: [25, 0, 0], s3: [15, 0, 0], head: [-25, 0, 0], jawU: [0, 0, 0], jawL: [0, 0, 0] }, 'strike'],
      [0.72, { s1: [58, 0, 0], s2: [22, 0, 0], s3: [12, 0, 0], head: [-20, 0, 0], jawU: [0, 0, 0], jawL: [0, 0, 0] }],
      [1.05, {}],
    ],
    { events: [{ t: 0.5, name: 'swing' }] }
  ),
  // dos dentelladas seguidas
  dentellada: clip(
    'dentellada',
    1.6,
    [
      [0, {}],
      [0.36, { s1: [-15, 0, 0], s2: [-20, 0, 0], head: [-25, 0, 0], jawU: [-55, 0, 0], jawL: [50, 0, 0] }],
      [0.5, { s1: [40, 0, -8], s2: [20, 0, 0], head: [-20, 15, 0], jawU: [0, 0, 0], jawL: [0, 0, 0] }, 'strike'],
      [0.74, { s1: [-5, 0, 6], s2: [-15, 0, 0], head: [-30, -10, 0], jawU: [-55, 0, 0], jawL: [50, 0, 0] }],
      [0.96, { s1: [50, 0, 8], s2: [22, 0, 0], head: [-20, -15, 0], jawU: [0, 0, 0], jawL: [0, 0, 0] }, 'strike'],
      [1.6, {}],
    ],
    { events: [
      { t: 0.42, name: 'swing' },
      { t: 0.88, name: 'swing' },
    ] }
  ),
  hurt: clip('hurt', 0.4, [
    [0, { s1: [-15, 0, 10], s2: [-10, 0, 0], head: [-40, 20, 0], jawU: [-40, 0, 0], jawL: [35, 0, 0] }, 'snap'],
    [0.4, {}],
  ]),
  stagger: clip('stagger', 1.0, [
    [0, { s1: [-30, 0, 25], s2: [-20, 0, 10], head: [-50, 30, 0], jawU: [-50, 0, 0], jawL: [45, 0, 0] }, 'snap'],
    [1.0, {}],
  ]),
  parried: clip('parried', 1.3, [
    [0, { s1: [-35, 0, 30], s2: [-25, 0, 15], head: [-55, 35, 0], jawU: [-45, 0, 0], jawL: [40, 0, 0] }, 'snap'],
    [0.7, { s1: [-20, 0, 15], s2: [-10, 0, 8], head: [-40, 15, 0] }],
    [1.3, {}],
  ]),
  death: clip('death', 1.6, [
    [0, { s1: [-20, 0, 15], head: [-50, 0, 0], jawU: [-60, 0, 0], jawL: [55, 0, 0] }, 'snap'],
    [0.9, { s1: [80, 0, 20], s2: [40, 0, 10], s3: [20, 0, 0], head: [10, 0, 0], jawU: [-20, 0, 0], jawL: [20, 0, 0] }],
    [1.6, { s1: [88, 0, 22], s2: [45, 0, 10], s3: [25, 0, 0], head: [15, 0, 0], jawU: [-10, 0, 0], jawL: [10, 0, 0] }],
  ]),
};

// ======================================================================= EL BULBO
function buildBulbo() {
  const joints = [
    { name: 'base', pos: [0, 0, 0] },
    { name: 'bulb', parent: 'base', pos: [0, 0.42, 0] },
    { name: 'cap', parent: 'bulb', pos: [0, 0.4, 0] },
  ];
  const parts = [
    ...[0, 1, 2, 3, 4].map((k) => {
      const a = (k / 5) * Math.PI * 2;
      return { j: 'base', type: 'sphere', s: [0.36, 0.05, 0.18], p: [Math.cos(a) * 0.4, 0.1, Math.sin(a) * 0.4], r: [0, -a / DEG, 25], mat: 'plantaHoja' };
    }),
    { j: 'base', type: 'cyl', s: [0.12, 0.2, 0.3], p: [0, 0.15, 0], mat: 'plantaTallo' },
    { j: 'bulb', type: 'sphere', s: [0.38, 0.44, 0.38], p: [0, 0, 0], mat: 'plantaBulbo', seg: 10, seg2: 8 },
    // las venas que dan luz
    ...[0, 1, 2, 3, 4, 5].map((k) => {
      const a = (k / 6) * Math.PI * 2;
      return { j: 'bulb', type: 'box', s: [0.025, 0.62, 0.02], p: [Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35], r: [Math.sin(a) * 8, -a / DEG, -Math.cos(a) * 8], mat: 'espora' };
    }),
    { j: 'cap', type: 'cone', s: [0.12, 0.22], p: [0, 0.06, 0], mat: 'plantaTallo' },
  ];
  return new Rig({ joints, parts });
}
const bulboBase = (e, t) => {
  const b = S(t * 1.4 + e.phase) * 0.04;
  return { bulb: [b, 0, b * 0.6], cap: [S(t * 2 + e.phase) * 0.1, 0, 0] };
};
const blClips = {
  alert: clip('alert', 0.6, [
    [0, {}],
    [0.25, { bulb: [8, 0, 6], cap: [20, 0, 0] }, 'snap'],
    [0.6, {}],
  ]),
  reventar: clip('reventar', 1.6, [
    [0, {}],
    [0.6, { bulb: [5, 0, -4], cap: [-15, 0, 0] }],
    [1.0, { bulb: [-6, 0, 5], cap: [25, 0, 0] }],
    [1.2, { bulb: [8, 0, -6], cap: [-30, 0, 0] }, 'snap'],
    [1.6, {}],
  ]),
  hurt: clip('hurt', 0.4, [
    [0, { bulb: [-12, 0, 10] }, 'snap'],
    [0.4, {}],
  ]),
  stagger: clip('stagger', 0.8, [
    [0, { bulb: [-20, 0, 15] }, 'snap'],
    [0.8, {}],
  ]),
  parried: clip('parried', 0.8, [
    [0, { bulb: [-20, 0, 15] }, 'snap'],
    [0.8, {}],
  ]),
  death: clip('death', 1.2, [
    [0, { bulb: [10, 0, 0] }, 'snap'],
    [1.2, { bulb: [60, 0, 10], cap: [40, 0, 0] }],
  ]),
};

// ======================================================================= los tipos
const _v = new THREE.Vector3();
const comunes = {
  // (arraigadas: no andan; las mueve lo que las mueve, pero vuelven)
  walk: 0,
  run: 0,
  turn: 2.2,
  fps: 24,
  voice: 'planta',
  alertTime: 0.6,
  keepDist: 0,
  approach: 30,
  leash: 60,
  planta: true,
  anclaje: false,
  // la raíz: se queda donde está (el empujón del jugador no la mueve)
  postPose: (e) => {
    e.body.pos.x = e.home.x;
    e.body.pos.z = e.home.z;
  },
};

export const ZARZA_TYPE = {
  ...comunes,
  name: 'Zarza de lo hondo',
  build: buildZarza,
  hp: 120,
  poise: 60,
  radius: 0.55,
  height: 2.2,
  lockHeight: 1.1,
  sight: 6.5,
  hear: 5,
  fov: 300,
  clips: zrClips,
  parryDur: 1.2,
  attacks: [
    { name: 'azote', clip: zrClips.azote, dur: 1.3, min: 0, max: 3.4, hits: [[0.58, 0.8]], dmg: 16, range: 3.5, arc: 170, weight: 2, cd: 0.6 },
    { name: 'golpe', clip: zrClips.golpe, dur: 1.6, min: 1.2, max: 3.8, hits: [[0.84, 0.95]], dmg: 25, range: 3.8, arc: 40, weight: 1.2, stagger: true, cd: 0.9 },
  ],
  loco: (e, t) => zarzaBase(e, t),
  idlePose: (e, kind, t) => zarzaBase(e, t),
};

export const BOCA_TYPE = {
  ...comunes,
  name: 'Boca de lo hondo',
  build: buildBoca,
  hp: 140,
  poise: 70,
  radius: 0.5,
  height: 2.0,
  lockHeight: 1.3,
  sight: 5.5,
  hear: 4,
  fov: 300,
  clips: bcClips,
  parryDur: 1.3,
  attacks: [
    { name: 'mordisco', clip: bcClips.mordisco, dur: 1.05, min: 0, max: 3.0, hits: [[0.54, 0.66]], dmg: 24, range: 3.1, arc: 60, weight: 2, cd: 0.7 },
    { name: 'dentellada', clip: bcClips.dentellada, dur: 1.6, min: 0, max: 2.7, hits: [
      [0.46, 0.56],
      [0.92, 1.02],
    ], dmg: 17, range: 2.8, arc: 70, weight: 1, cd: 0.9 },
  ],
  loco: (e, t) => bocaBase(e, t, true),
  idlePose: (e, kind, t) => bocaBase(e, t, false),
};

export const BULBO_TYPE = {
  ...comunes,
  name: 'Bulbo de esporas',
  build: buildBulbo,
  hp: 30,
  poise: 999,
  radius: 0.42,
  height: 1.1,
  lockHeight: 0.6,
  sight: 4.2,
  hear: 3.2,
  fov: 360,
  clips: blClips,
  attacks: [
    {
      name: 'reventar',
      clip: blClips.reventar,
      dur: 1.6,
      min: 0,
      max: 2.9,
      hits: [[1.22, 1.32]],
      dmg: 30,
      range: 2.8,
      arc: 360,
      unblockable: true,
      noParry: true,
      weight: 1,
      cd: 9,
      events: [
        {
          t: 1.2,
          fn: (e, g) => {
            // revienta: la nube de esporas, y se queda en nada
            e.data.reventado = true;
            e.rig.worldPos('bulb', _v);
            if (g.fx && g.fx.blood) {
              g.fx.blood.emit(_v.x, _v.y, _v.z, 40, { color: [0.72, 0.86, 0.32], speed: 3.2, life: 1.6, up: 1.2, gravity: -0.6 });
              g.fx.blood.emit(_v.x, _v.y + 0.3, _v.z, 24, { color: [0.5, 0.6, 0.24], speed: 1.6, life: 2.4, up: 0.8, gravity: -0.3 });
            }
            g.audio && g.audio.play('fleshBurst', _v, { gain: 0.55 });
            g.camRig && g.camRig.shake && g.camRig.shake(0.12);
          },
        },
        {
          t: 1.4,
          fn: (e) => {
            e.hp = 0;
            e.die();
          },
        },
      ],
    },
  ],
  loco: (e, t) => bulboBase(e, t),
  idlePose: (e, kind, t) => bulboBase(e, t),
  // (se hincha mientras prepara el estallido; reventado, no queda nada)
  update: (e) => {
    const b = e.rig.joints.bulb;
    if (!b) return;
    let s = 1;
    if (e.data.reventado) s = 0.001;
    else if (e.state === 'attack' && e.atk && e.atk.name === 'reventar') s = 1 + Math.min(1, e.stT / 1.15) * 0.55 + Math.sin(e.stT * 30) * 0.03 * Math.min(1, e.stT);
    else if (e.state === 'dead') s = Math.max(0.6, 1 - e.stT * 0.3);
    b.scale.setScalar(s);
  },
  onReset: (e) => {
    if (e.rig.joints.bulb) e.rig.joints.bulb.scale.setScalar(1);
  },
};
