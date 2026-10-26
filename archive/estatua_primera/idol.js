// El ídolo de la fuente sin nombre: aquello por lo que Deo Ignoto toca el
// mundo. Se alza sobre el agua de la fuente, en medio de la reja de Martín,
// con los zunchos de hierro con que él quiso sujetarlo: podridos, y el de
// arriba reventado. Lo que se le cortó (la mano de oro: la Garra) lo tiene
// ahora quien la encuentre. Dos formas, que se eligen en el modo de pruebas
// (F2, «Diseño»; o con ?idolo=estatua / ?idolo=monolito) y se recuerdan en
// el navegador:
//
// 'monolito' (la de siempre): una piedra que nadie labró, llena de almas que
//  empujan desde dentro (entities/idol_monolith_geo.js, su geometría, que se
//  calcula en un hilo de fondo: idol_worker.js; idol_monolith.js, el montaje
//  y lo que se mueve);
// 'estatua': una figura de seis metros y medio de piedra negra pulida,
//  erguida, que mira de frente
//  - la cara lisa, sin rasgos, partida de arriba abajo por una costura que
//    rezuma luz roja, como un ojo que todavía no se ha abierto (y que se abre
//    cuando algo le interesa); dos regueros oscuros le bajan por la barbilla;
//  - una diadema de oro con púas y, detrás de la cabeza, un halo de púas
//    negras con la punta de oro, dos partidas;
//  - el cuello demasiado largo, de anillos como vértebras;
//  - el hábito de pliegues hondos y, encima, un manto abierto por delante
//    sobre un costillar en el que, muy al fondo, late una brasa;
//  - el brazo derecho alzado, con el antebrazo en pie: termina en un muñón a
//    la altura de la cabeza, como una mano que ya no está (por el corte se ve
//    que por dentro no es piedra); el izquierdo, caído bajo el manto;
//  - glifos de oro de una escritura que no es de nadie (la que alguien picó
//    del ara romana) en dos cenefas y en una columna; algunos arden.
// Las dos tienen la misma huella al pie y el zuncho de abajo en el mismo
// sitio: la reja, el collar, las cadenas y la colisión (que se hornean con
// la cisterna) valen para las dos, y se puede cambiar de una a otra en
// pleno juego.
// Mira hacia +z; el origen, en el centro de la fuente a ras del suelo (el
// agua queda 1,4 m más abajo y lo que está bajo el agua no se ve).
import * as THREE from 'three';
import { Rig } from '../../src/entities/rig.js';
import { DEG, RNG } from '../../src/core/util.js';
import { monolithData, monoEye, MONO } from '../monolito/idol_monolith_geo.js';
import { Monolith } from '../monolito/idol_monolith.js';
import IdolWorker from '../monolito/idol_worker.js?worker&inline';

export const IDOL_KINDS = ['monolito', 'estatua'];
const KEY = 'dob-idolo';
function savedKind() {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('idolo') : null;
  if (IDOL_KINDS.includes(q)) return q;
  try {
    const s = localStorage.getItem(KEY);
    if (IDOL_KINDS.includes(s)) return s;
  } catch (e) {
    /* sin almacenamiento */
  }
  return 'monolito';
}

// la forma elegida, las alturas de los zunchos de Martín (la reja y las
// cadenas los usan) y, para la introducción, dónde tiene el ojo y lo alto
// que es (cambian con la forma: setIdolKind)
export const IDOL = {
  kind: savedKind(),
  bandA: 0.35,
  bandB: 1.55,
  eye: [0, 6.02, 0.36],
  height: 7.4,
};
function measure() {
  if (IDOL.kind === 'monolito') {
    IDOL.eye = monoEye();
    IDOL.height = MONO.rim;
  } else {
    IDOL.eye = [0, 6.02, 0.36];
    IDOL.height = 7.4;
  }
}
measure();
// Cambia la forma (y la recuerda en este navegador). ¿Ha cambiado?
export function setIdolKind(kind) {
  if (!IDOL_KINDS.includes(kind)) return false;
  try {
    localStorage.setItem(KEY, kind);
  } catch (e) {
    /* sólo para esta sesión */
  }
  if (kind === IDOL.kind) return false;
  IDOL.kind = kind;
  measure();
  return true;
}

// ------------------------------------------------------------ utilidades
const _m = new THREE.Matrix4(),
  _e = new THREE.Euler(),
  _x = new THREE.Vector3(),
  _y = new THREE.Vector3(),
  _z = new THREE.Vector3();
// rotación (grados) de una pieza cuyo eje y va de a a b con la cara (+z)
// hacia n
function alignR(a, b, n) {
  _y.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
  _z.set(n[0], n[1], n[2]).normalize();
  _x.crossVectors(_y, _z).normalize();
  _z.crossVectors(_x, _y).normalize();
  _m.makeBasis(_x, _y, _z);
  _e.setFromRotationMatrix(_m, 'XYZ');
  return [_e.x / DEG, _e.y / DEG, _e.z / DEG];
}
// una tira (caja) de a a b, de ancho w y grueso d, con la cara hacia n
function strip(j, a, b, w, d, mat, n = [0, 0, 1], o = {}) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  return { j, type: 'box', s: [w, len, d], p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], r: alignR(a, b, n), mat, ...o };
}
// un tronco (cilindro) de a a b, de radio r0 en a y r1 en b
function limb(j, a, b, r0, r1, mat, seg = 7) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  return { j, type: 'cyl', s: [r1, r0, len], p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], r: alignR(a, b, [0, 0, 1]), seg, mat };
}
const wrap = (a) => {
  a = (a + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
};
// Superficie de revolución deformada r(t, y) (t desde +z hacia +x), de y0 a
// y1, entera o abierta entre t0 y t1; zs aplasta por delante y por detrás.
// UV en metros (más o menos), caras hacia fuera.
function revolve(rFn, y0, y1, ny, nt, t0 = 0, t1 = Math.PI * 2, zs = 1) {
  const pos = [],
    uv = [],
    idx = [];
  for (let j = 0; j <= ny; j++) {
    const y = y0 + ((y1 - y0) * j) / ny;
    for (let i = 0; i <= nt; i++) {
      const t = t0 + ((t1 - t0) * i) / nt;
      const r = rFn(t, y);
      pos.push(Math.sin(t) * r, y, Math.cos(t) * r * zs);
      uv.push(t * 0.9, y * 0.75);
    }
  }
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nt; i++) {
      const a = j * (nt + 1) + i,
        b = a + nt + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // (que miren hacia fuera: si la de en medio mira hacia dentro, se da la
  // vuelta a los triángulos)
  const mid = Math.floor(ny / 2) * (nt + 1) + Math.floor(nt / 2);
  const tm = t0 + (t1 - t0) * 0.5;
  const N = g.attributes.normal;
  if (N.getX(mid) * Math.sin(tm) + N.getZ(mid) * Math.cos(tm) < 0) {
    for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]];
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  return g;
}
// Un glifo de esa escritura: uno a tres trazos cortos, rectos o en ángulo,
// en el plano tangente de un punto (t: la tangente horizontal; arriba, y)
function glyph(parts, rng, j, c, n, t, size, mat) {
  const P = (u, v) => [c[0] + t[0] * u * size, c[1] + v * size, c[2] + t[2] * u * size];
  const strokes = [
    [
      [0, -0.5],
      [0, 0.5],
    ],
    [
      [-0.35, 0.5],
      [0.35, -0.5],
    ],
    [
      [-0.4, 0],
      [0.4, 0],
    ],
    [
      [-0.35, -0.5],
      [0.35, 0.5],
    ],
    [
      [-0.3, 0.45],
      [0.3, 0.45],
    ],
  ];
  const k = 1 + Math.floor(rng.next() * 3);
  const used = new Set();
  for (let i = 0; i < k; i++) {
    let s = Math.floor(rng.next() * strokes.length);
    if (i === 0 && rng.next() < 0.6) s = 0;
    if (used.has(s)) continue;
    used.add(s);
    const [a, b] = strokes[s];
    parts.push(strip(j, P(a[0], a[1]), P(b[0], b[1]), size * 0.16, 0.014, mat, n));
  }
}

const S = 'idolStone',
  AU = 'idolGold',
  GL = 'idolGlyph';

// ============================================================ la estatua
// el perfil del hábito (radio, altura), de debajo del agua a la cintura
const ROBE = [
  [1.08, -2.3],
  [1.1, -1.45],
  [1.06, -0.7],
  [1.0, 0.0],
  [0.92, 0.8],
  [0.82, 1.6],
  [0.7, 2.3],
  [0.58, 2.75],
  [0.52, 2.98],
];
const RZ = 0.84;
export function robeRadius(y) {
  for (let i = 0; i < ROBE.length - 1; i++) {
    const a = ROBE[i],
      b = ROBE[i + 1];
    if (y >= a[1] && y <= b[1]) return a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
  }
  return y < ROBE[0][1] ? ROBE[0][0] : ROBE[ROBE.length - 1][0];
}
// los pliegues: lomos redondos que salen de la cintura y se abren hacia el
// agua (y se tuercen un poco al bajar)
const FOLDS = (() => {
  const r = new RNG(77);
  const n = 12;
  return Array.from({ length: n }, (_, i) => ({ t: (i / n) * Math.PI * 2 + r.range(-0.14, 0.14), w: r.range(0.2, 0.34), d: r.range(0.55, 1.0), s: r.range(-0.22, 0.22) }));
})();
function folds(F, t, k) {
  let f = 0;
  for (const P of F) {
    const d = wrap(t - P.t - P.s * k) / P.w;
    if (Math.abs(d) < 1) f += P.d * (0.5 + 0.5 * Math.cos(d * Math.PI));
  }
  return f;
}
export function robeR(t, y) {
  const k = Math.max(0, Math.min(1, (2.9 - y) / 4.4));
  return robeRadius(y) * (1 + (0.025 + 0.16 * k) * (folds(FOLDS, t, k) - 0.42));
}
// un punto del hábito (ángulo t desde +z, altura y) y su normal
function onRobe(t, y, out = 0) {
  const r = robeR(t, y) + out;
  return { p: [Math.sin(t) * r, y, Math.cos(t) * r * RZ], n: [Math.sin(t), 0.2, Math.cos(t) / RZ] };
}
// una cenefa de oro que sigue los pliegues
function robeBand(parts, y, w, mat) {
  const n = 40;
  for (let i = 0; i < n; i++) {
    const t0 = (i / n) * Math.PI * 2,
      t1 = ((i + 1) / n) * Math.PI * 2;
    const a = onRobe(t0, y, 0.012),
      b = onRobe(t1, y, 0.012);
    parts.push(strip('base', a.p, b.p, w, 0.016, mat, a.n));
  }
}

// el manto: de los hombros (y = 1.02 en el pecho) a media pierna, abierto
// por delante; más ancho abajo y de pliegues más hondos
const MT0 = 0.34 * Math.PI,
  MT1 = 1.66 * Math.PI;
const MFOLDS = (() => {
  const r = new RNG(78);
  return Array.from({ length: 10 }, (_, i) => ({ t: MT0 + ((i + 0.5) / 10) * (MT1 - MT0) + r.range(-0.1, 0.1), w: r.range(0.16, 0.26), d: r.range(0.6, 1.0), s: r.range(-0.12, 0.12) }));
})();
function mantleR(t, y) {
  const u = Math.max(0, Math.min(1, (1.02 - y) / 3.5));
  const base = 0.62 + 0.12 * Math.sin(Math.min(1, u * 3) * Math.PI * 0.5) + (0.26 * Math.max(0, u - 0.45)) / 0.55;
  return base * (1 + (0.02 + 0.14 * u) * (folds(MFOLDS, t, u) - 0.4));
}
const MZ = 0.74;

// la cabeza: un huevo, la cara algo aplanada y la costura hundida
const HEAD = [
  [0.001, -0.03],
  [0.16, 0.0],
  [0.25, 0.12],
  [0.3, 0.32],
  [0.31, 0.52],
  [0.29, 0.72],
  [0.23, 0.88],
  [0.13, 0.99],
  [0.001, 1.03],
];
function headProfile(y) {
  for (let i = 0; i < HEAD.length - 1; i++) {
    const a = HEAD[i],
      b = HEAD[i + 1];
    if (y >= a[1] && y <= b[1]) return a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
  }
  return 0.001;
}
function headR(t, y) {
  const r = headProfile(y);
  const front = Math.max(0, Math.cos(t));
  // (la cara, más plana; la costura, un surco por el medio)
  const groove = Math.exp(-(((Math.sin(t) * r) / 0.028) ** 2)) * front;
  return Math.max(0.001, r * (1 - 0.1 * front * front) - 0.03 * groove * Math.min(1, r / 0.2));
}
const HZ = 1.12;

function buildStatue(rng) {
  const joints = [
    { name: 'base', pos: [0, 0, 0] },
    // erguida: la cintura, el pecho, el cuello y la cabeza, que mira al frente
    { name: 'body', parent: 'base', pos: [0, 2.9, 0] },
    { name: 'chest', parent: 'body', pos: [0, 1.0, 0], rot: [-3, 0, 0] },
    { name: 'neck', parent: 'chest', pos: [0, 1.05, 0.02], rot: [-2, 0, 0] },
    { name: 'head', parent: 'neck', pos: [0, 0.55, 0], rot: [-6, 0, 0] },
    // el halo, detrás de la cabeza, en pie
    { name: 'halo', parent: 'chest', pos: [0, 2.05, -0.4], rot: [3, 0, 0] },
    // el izquierdo, caído y escondido bajo el manto
    { name: 'armL', parent: 'chest', pos: [0.6, 0.86, -0.06], rot: [3, 0, 5] },
    { name: 'foreL', parent: 'armL', pos: [0, -1.32, 0], rot: [-12, 0, 0] },
    // el derecho, alzado: el antebrazo en pie y el muñón a la altura de la cara
    { name: 'armR', parent: 'chest', pos: [-0.62, 0.86, -0.02], rot: [-100, 0, -30] },
    { name: 'foreR', parent: 'armR', pos: [0, -1.32, 0], rot: [-78, 0, 8] },
  ];
  const parts = [];
  const add = (...p) => parts.push(...p);

  // ------------------------------------------------------------ el hábito
  add({ j: 'base', type: 'geo', geo: revolve(robeR, -2.3, 2.98, 22, 56), sc: [1, 1, RZ], uvk: 1, mat: S });
  // el ceñidor de oro, que sigue los pliegues, y su nudo
  robeBand(parts, 2.82, 0.09, AU);
  {
    const k0 = onRobe(0.14, 2.8, 0.05),
      k1 = onRobe(0.2, 1.85, 0.07),
      k2 = onRobe(-0.04, 2.8, 0.05),
      k3 = onRobe(-0.1, 2.05, 0.07);
    add({ j: 'base', type: 'ico', s: [0.1, 0.085, 0.07], p: onRobe(0.05, 2.82, 0.08).p, mat: AU });
    add(strip('base', k0.p, k1.p, 0.08, 0.024, AU, k0.n, { taper: [1.4, 1] }));
    add(strip('base', k2.p, k3.p, 0.065, 0.022, AU, k2.n, { taper: [1.3, 1] }));
  }
  // las cenefas de glifos (sobre el agua y a media altura) entre filetes de
  // oro, y la columna de delante; uno de cada cinco arde
  let gi = 0;
  for (const [y0, n, sz] of [
    [-1.0, 30, 0.14],
    [1.05, 26, 0.13],
  ]) {
    robeBand(parts, y0 - 0.14, 0.024, AU);
    robeBand(parts, y0 + 0.14, 0.024, AU);
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2 + 0.07;
      const pt = onRobe(t, y0, 0.014);
      glyph(parts, rng, 'base', pt.p, pt.n, [Math.cos(t), 0, -Math.sin(t) * RZ], sz, gi++ % 5 === 2 ? GL : AU);
    }
  }
  for (let y = 2.55; y > -0.75; y -= 0.27) {
    if (Math.abs(y - 1.05) < 0.22) continue;
    const pt = onRobe(0.0, y, 0.02);
    glyph(parts, rng, 'base', pt.p, pt.n, [1, 0, 0], 0.11, gi++ % 4 === 1 ? GL : AU);
  }
  statueBands(parts);

  // ------------------------------------------------------------ el cuerpo
  // el vientre, estrecho, y el costillar abierto: la raja negra del
  // esternón al vientre, las costillas que la cruzan y la brasa del fondo
  add({ j: 'body', type: 'box', s: [0.56, 1.02, 0.4], p: [0, 0.48, 0], taper: [0.92, 0.95], mat: S });
  add({ j: 'chest', type: 'box', s: [0.84, 1.04, 0.5], p: [0, 0.48, -0.02], taper: [0.68, 0.82], mat: S });
  add({ j: 'chest', type: 'box', s: [0.25, 0.86, 0.02], p: [0, 0.4, 0.252], taper: [0.55, 1], mat: 'black' });
  add({ j: 'chest', type: 'ico', s: [0.075, 0.12, 0.03], p: [0.01, 0.38, 0.256], mat: 'redGlow' });
  for (let i = 0; i < 6; i++) {
    const y = 0.14 + i * 0.13,
      w = 0.32 - Math.abs(i - 2.5) * 0.03;
    for (const sx of [1, -1]) add(strip('chest', [sx * 0.005, y + 0.025, 0.272], [sx * w * 0.55, y - 0.05, 0.25], 0.045, 0.04, S, [0, 0, 1]));
  }
  add({ j: 'chest', type: 'box', s: [0.05, 0.88, 0.05], p: [0, 0.42, 0.27], taper: [0.6, 1], mat: S });
  for (const sx of [1, -1]) add(strip('chest', [sx * 0.04, 0.94, 0.2], [sx * 0.5, 0.88, 0.06], 0.07, 0.06, S, [0, 0.3, 1]));

  // ------------------------------------------------------------ el manto
  add({ j: 'chest', type: 'geo', geo: revolve(mantleR, -2.48, 1.02, 16, 30, MT0, MT1, MZ), uvk: 1, mat: S, ds: true });
  for (const sx of [1, -1]) {
    // los hombros
    add({ j: 'chest', type: 'sphere', s: [0.42, 0.25, 0.36], p: [sx * 0.5, 0.88, -0.05], seg: 10, seg2: 6, mat: S });
    // el borde de delante, grueso, con su orla de oro y sus glifos
    const t = sx > 0 ? MT0 : MT1;
    const E = (y, out = 0) => {
      const r = mantleR(t, y) + out;
      return [Math.sin(t) * r, y, Math.cos(t) * r * MZ];
    };
    const nE = [Math.sin(t), 0, Math.cos(t)];
    for (let y = 1.0; y > -2.4; y -= 0.34) {
      const a = E(y, 0.02),
        b = E(Math.max(-2.46, y - 0.34), 0.02);
      add(strip('chest', a, b, 0.13, 0.07, S, nE));
      add(strip('chest', [a[0], a[1], a[2] + 0.04], [b[0], b[1], b[2] + 0.04], 0.05, 0.02, AU, nE));
    }
    for (let k = 0; k < 8; k++) {
      const c = E(0.85 - k * 0.42, 0.06);
      glyph(parts, rng, 'chest', [c[0], c[1], c[2] + 0.03], [Math.sin(t) * 0.5, 0, 1], [1, 0, 0], 0.06, k === 4 ? GL : AU);
    }
  }
  // el cuello alto del manto, rígido, con su filete de oro
  add({ j: 'chest', type: 'cyl', s: [0.3, 0.42, 0.34], p: [0, 1.04, -0.06], seg: 12, open: true, mat: S, ds: true });
  add({ j: 'chest', type: 'torus', s: [0.31, 0.022], seg: 14, seg2: 3, p: [0, 1.21, -0.06], r: [90, 0, 0], mat: AU });

  // ------------------------------------------------------------ el cuello
  add({ j: 'neck', type: 'cyl', s: [0.11, 0.13, 0.56], p: [0, 0.26, 0], seg: 8, mat: S });
  for (let i = 0; i < 5; i++) add({ j: 'neck', type: 'torus', s: [0.15 - i * 0.006, 0.045], seg: 10, seg2: 4, p: [0, 0.05 + i * 0.105, 0], r: [90, 0, 0], mat: S });

  // ------------------------------------------------------------ la cabeza
  add({ j: 'head', type: 'geo', geo: revolve(headR, -0.03, 1.03, 16, 28), sc: [1, 1, HZ], uvk: 1, mat: S });
  // la costura, en el surco, con la luz dentro; y en medio el ojo (en su
  // malla: se abre)
  const FZ = (y) => headR(0, y) * HZ;
  add(strip('head', [0, 0.08, FZ(0.08) - 0.005], [0, 0.94, FZ(0.94) - 0.005], 0.024, 0.03, 'black', [0, 0, 1]));
  add(strip('head', [0, 0.1, FZ(0.1) + 0.004], [0, 0.92, FZ(0.92) + 0.004], 0.008, 0.012, 'redGlow', [0, 0, 1]));
  add({ j: 'head', type: 'ico', s: [0.036, 0.17, 0.025], p: [0, 0.52, FZ(0.52) + 0.002], mat: 'black', grp: 'eye' });
  add({ j: 'head', type: 'ico', s: [0.014, 0.125, 0.02], p: [0, 0.52, FZ(0.52) + 0.016], mat: 'redGlow', grp: 'eye' });
  // lo que le gotea de la costura por la barbilla
  for (const [x, l] of [
    [0.014, 0.36],
    [-0.02, 0.24],
  ])
    add({ j: 'head', type: 'box', s: [0.018, l, 0.012], p: [x, 0.36 - l / 2, FZ(0.3) - 0.004], r: [-6, 0, x * 60], mat: 'blood' });
  // la diadema de oro, con sus púas por delante
  add({ j: 'head', type: 'torus', s: [0.3, 0.026], seg: 16, seg2: 4, p: [0, 0.74, 0], r: [84, 0, 0], sc: [1, 1.1, 1], mat: AU });
  for (let i = 0; i < 7; i++) {
    const a = (i - 3) * 0.32;
    add({ j: 'head', type: 'cone', s: [0.022, 0.15 + (i % 2) * 0.06 - Math.abs(i - 3) * 0.015], seg: 4, p: [Math.sin(a) * 0.31, 0.83, Math.cos(a) * 0.33], r: [12 * Math.cos(a), 0, -14 * Math.sin(a)], mat: AU });
  }

  // ------------------------------------------------------------ el halo
  // púas negras con la punta de oro que salen de un aro, en abanico por
  // encima de la cabeza; dos, partidas
  add({ j: 'halo', type: 'torus', s: [0.46, 0.028], seg: 22, seg2: 4, mat: AU });
  const NS = 15;
  for (let i = 0; i < NS; i++) {
    const a = -112 * DEG + (i / (NS - 1)) * 224 * DEG;
    const broken = i === 3 || i === 10;
    const L = broken ? 0.55 : i % 2 ? 1.05 : 1.5;
    const dx = Math.sin(a),
      dy = Math.cos(a);
    const r0 = 0.44,
      r1 = r0 + L;
    add({ j: 'halo', type: 'cone', s: [0.045, L], seg: 5, p: [dx * (r0 + L / 2), dy * (r0 + L / 2), 0], r: [0, 0, -a / DEG], mat: S });
    if (!broken) add({ j: 'halo', type: 'cone', s: [0.02, 0.2], seg: 4, p: [dx * (r1 + 0.04), dy * (r1 + 0.04), 0], r: [0, 0, -a / DEG], mat: AU });
    else add({ j: 'halo', type: 'ico', s: [0.05, 0.035, 0.04], p: [dx * r1, dy * r1, 0], mat: S });
  }

  // ------------------------------------------------------------ los brazos
  // descarnados: el hueso largo, los tendones marcados y un brazalete de oro
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    add({ j: 'arm' + s, type: 'ico', s: [0.16, 0.15, 0.15], mat: S });
    add(limb('arm' + s, [0, -0.05, 0], [0, -1.26, 0], 0.11, 0.08, S));
    add(strip('arm' + s, [sx * 0.06, -0.2, 0.06], [sx * 0.035, -1.15, 0.05], 0.035, 0.035, S, [0, 0, 1]));
    add(strip('arm' + s, [-sx * 0.05, -0.3, -0.06], [-sx * 0.03, -1.1, -0.05], 0.03, 0.03, S, [0, 0, -1]));
    add({ j: 'arm' + s, type: 'torus', s: [0.1, 0.022], seg: 12, seg2: 3, p: [0, -0.45, 0], r: [90, 0, 0], mat: AU });
    add({ j: 'fore' + s, type: 'ico', s: [0.1], mat: S });
    add(limb('fore' + s, [0, -0.04, 0], [0, -1.12, 0], 0.085, 0.062, S));
    add(strip('fore' + s, [sx * 0.045, -0.15, 0.045], [sx * 0.02, -1.0, 0.04], 0.026, 0.026, S, [0, 0, 1]));
  }
  // el muñón: el corte limpio de Martín. Por dentro no es piedra: un anillo
  // de oro y, en medio, la luz; y gotea
  add({ j: 'foreR', type: 'torus', s: [0.08, 0.022], seg: 10, seg2: 3, p: [0, -1.05, 0], r: [90, 0, 0], mat: AU });
  add({ j: 'foreR', type: 'cyl', s: [0.068, 0.068, 0.025], p: [0, -1.14, 0], seg: 8, mat: 'redGlow' });
  add({ j: 'foreR', type: 'torus', s: [0.066, 0.014], seg: 10, seg2: 3, p: [0, -1.13, 0], r: [90, 0, 0], mat: AU });
  for (const [x, z, l] of [
    [0.035, 0.02, 0.18],
    [-0.03, -0.015, 0.11],
  ])
    add({ j: 'foreR', type: 'cone', s: [0.012, l], seg: 4, p: [x, -1.1 + l / 2, z], mat: 'blood' });
  return new Rig({ joints, parts });
}

// los zunchos de Martín en el hábito: aros de hierro podrido con cruces
// remachadas; el de arriba, reventado (los cabos, doblados hacia fuera)
function statueBands(parts) {
  for (const [y, broken] of [
    [IDOL.bandA, false],
    [IDOL.bandB, true],
  ]) {
    const n = 40;
    for (let i = 0; i < n; i++) {
      const t0 = (i / n) * Math.PI * 2,
        t1 = ((i + 1) / n) * Math.PI * 2;
      if (broken && t0 > 0.35 * Math.PI && t1 < 0.62 * Math.PI) continue;
      const a = onRobe(t0, y, 0.035),
        b = onRobe(t1, y, 0.035);
      parts.push(strip('base', a.p, b.p, 0.1, 0.035, 'plateRust', a.n));
    }
    if (broken)
      for (const t of [0.35 * Math.PI, 0.62 * Math.PI]) {
        const pt = onRobe(t, y, 0.035);
        parts.push(strip('base', pt.p, [pt.p[0] + pt.n[0] * 0.3, y + 0.12, pt.p[2] + pt.n[2] * 0.22], 0.1, 0.03, 'plateRust', [Math.cos(t), 0, -Math.sin(t)]));
      }
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * Math.PI * 2 + 0.2;
      if (broken && t > 0.3 * Math.PI && t < 0.67 * Math.PI) continue;
      const pt = onRobe(t, y, 0.07);
      const tg = [Math.cos(t), 0, -Math.sin(t) * RZ];
      if (i % 2 === 0) {
        parts.push(strip('base', [pt.p[0], y - 0.17, pt.p[2]], [pt.p[0], y + 0.21, pt.p[2]], 0.05, 0.03, 'iron', pt.n));
        parts.push(strip('base', [pt.p[0] - tg[0] * 0.11, y + 0.09, pt.p[2] - tg[2] * 0.11], [pt.p[0] + tg[0] * 0.11, y + 0.09, pt.p[2] + tg[2] * 0.11], 0.045, 0.03, 'iron', pt.n));
      } else parts.push({ j: 'base', type: 'sphere', s: [0.03], p: pt.p, seg: 5, seg2: 3, mat: 'iron' });
    }
  }
}

// la línea media del zuncho de abajo (la de la estatua: por ella pasan las
// cadenas de la reja), para que el monolito lleve el suyo en el mismo sitio
function bandLine() {
  const y = IDOL.bandA;
  const pts = [];
  for (const d of [0, 45, 90, 135, 180, 225, 270, 315]) {
    const t = (d * Math.PI) / 180;
    if (d % 90 === 0) {
      const r = robeRadius(y) + 0.035;
      pts.push([Math.sin(t) * r, y, Math.cos(t) * r * RZ]);
    } else pts.push(onRobe(t, y, 0.035).p);
  }
  return pts;
}

// Los datos del monolito: se calculan una vez, en un hilo de fondo (si el
// navegador no lo deja abrir, en el principal: un tirón de un segundo)
let monoData = null,
  monoJob = null;
export function monolithReady() {
  return !!monoData;
}
export function loadMonolith() {
  if (monoData) return Promise.resolve(monoData);
  if (monoJob) return monoJob;
  const opts = { bandA: bandLine() };
  const main = () => monolithData(1667, opts);
  monoJob = new Promise((res) => {
    let w;
    try {
      w = new IdolWorker();
    } catch (e) {
      return res(main());
    }
    w.onmessage = (ev) => {
      w.terminate();
      if (!ev.data.ok) console.warn('[ídolo] el hilo de fondo falló; se hace en el principal', ev.data.error);
      res(ev.data.ok ? ev.data.data : main());
    };
    w.onerror = (e) => {
      w.terminate();
      console.warn('[ídolo] el hilo de fondo falló; se hace en el principal', e.message || e);
      res(main());
    };
    w.postMessage({ seed: 1667, opts });
  }).then((d) => {
    monoData = d;
    monoJob = null;
    return d;
  });
  return monoJob;
}

// El ídolo de la forma pedida; el monolito, sólo si ya están sus datos
// (si no, null: loadMonolith() y volver a pedirlo)
export function buildIdol(kind = IDOL.kind, seed = 1667) {
  if (kind === 'monolito') return monoData ? new Monolith(monoData) : null;
  return buildStatue(new RNG(seed));
}

// La huella del ídolo a ras del suelo y sus zunchos (para la reja, las
// cadenas y la colisión), en su espacio (x a lo ancho, z de delante atrás):
// la misma para las dos formas
export function idolFootprint() {
  const anchors = [45, 135, 225, 315].map((d) => onRobe((d * Math.PI) / 180, IDOL.bandA, 0.06).p);
  return { rect: false, rx: robeRadius(0), rz: robeRadius(0) * RZ, anchors, half: [robeRadius(0) * 0.92, robeRadius(0) * RZ * 0.92] };
}
