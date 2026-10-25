// El ídolo de la fuente sin nombre: aquello por lo que Deo Ignoto toca el
// mundo. Nadie lo talló: no tiene una sola marca de herramienta, ni un
// desconchón, ni el verdín de todo lo que lo rodea; la piedra negra está
// pulida como el primer día y se bebe la luz. Se alza sobre el agua de la
// fuente, en medio de la reja de Martín, con los zunchos de hierro con que él
// quiso sujetarlo: podridos, y el de arriba reventado. Lo que se le cortó (la
// mano de oro: la Garra) lo tiene ahora quien la encuentre. Dos formas (se
// elige con ?idolo=monolito; de momento, para comparar):
//
// 'estatua': una figura de seis metros y medio, erguida, que mira de frente
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
// 'monolito': una losa de más de siete metros, torcida sobre sí misma, de
//  aristas que cortan y la cima tronchada en bisel. En la cara, en relieve,
//  la misma figura sin rostro, con su halo y el brazo alzado: donde estuvo la
//  mano queda un engaste de oro vacío, con los clavos arrancados; la costura
//  roja la parte de arriba abajo y en la cara del relieve está el ojo. Por
//  los costados bajan columnas de glifos.
// Mira hacia +z; el origen, en el centro de la fuente a ras del suelo (el
// agua queda 1,4 m más abajo y lo que está bajo el agua no se ve).
import * as THREE from 'three';
import { Rig } from './rig.js';
import { DEG, RNG } from '../core/util.js';

export const IDOL_KIND = typeof location !== 'undefined' && new URLSearchParams(location.search).get('idolo') === 'monolito' ? 'monolito' : 'estatua';

// las alturas de los zunchos de Martín (la reja y las cadenas los usan) y,
// para la introducción, dónde tiene el ojo y lo alto que es
export const IDOL = {
  kind: IDOL_KIND,
  bandA: 0.35,
  bandB: 1.55,
  eye: IDOL_KIND === 'monolito' ? [0, 5.42, 0.72] : [0, 6.02, 0.36],
  height: IDOL_KIND === 'monolito' ? 7.5 : 7.4,
};

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

// ============================================================ el monolito
// medidas de la losa: medio ancho (x) y medio grueso (z) abajo y arriba, el
// giro de abajo arriba y la cima en bisel (alturas de sus cuatro esquinas:
// delante izquierda, delante derecha, detrás derecha, detrás izquierda)
export const MONO = { ax0: 0.84, az0: 0.6, ax1: 0.58, az1: 0.42, y0: -2.3, twist: 0.16, top: [7.05, 7.45, 7.75, 7.3] };
// el marco de la losa a la altura y: medidas, giro y esquinas
function monoFrame(y) {
  const M = MONO;
  const u = Math.max(0, Math.min(1, (y - M.y0) / (7.4 - M.y0)));
  const ax = M.ax0 + (M.ax1 - M.ax0) * u,
    az = M.az0 + (M.az1 - M.az0) * u;
  const tw = M.twist * u;
  const c = Math.cos(tw),
    s = Math.sin(tw);
  const R = (x, z) => [x * c + z * s, y, -x * s + z * c];
  return { ax, az, tw, R, corners: [R(ax, az), R(-ax, az), R(-ax, -az), R(ax, -az)] };
}
// un punto de la cara de delante (u: de -1 a 1 a lo ancho), su normal y su
// tangente
function onFront(u, y, out = 0) {
  const F = monoFrame(y);
  return { p: F.R(u * F.ax, F.az + out), n: [Math.sin(F.tw), 0, Math.cos(F.tw)], t: [Math.cos(F.tw), 0, -Math.sin(F.tw)] };
}
function onSide(sx, u, y, out = 0) {
  const F = monoFrame(y);
  return { p: F.R(sx * (F.ax + out), u * F.az), n: [sx * Math.cos(F.tw), 0, -sx * Math.sin(F.tw)], t: [Math.sin(F.tw), 0, Math.cos(F.tw)] };
}
function monolithGeo() {
  const M = MONO;
  const NY = 14;
  const levels = [];
  for (let j = 0; j <= NY; j++) levels.push(monoFrame(M.y0 + ((7.0 - M.y0) * j) / NY).corners);
  // la última fila, a la altura de cada esquina de la cima
  const topC = monoFrame(7.4).corners.map((c, i) => [c[0], M.top[i], c[2]]);
  levels.push(topC);
  const pos = [];
  // (cada cara con sus vértices: aristas vivas; triángulos en el orden que
  // deja las caras hacia fuera)
  const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  for (let j = 0; j < levels.length - 1; j++) {
    const A = levels[j],
      B = levels[j + 1];
    for (let f = 0; f < 4; f++) {
      const f1 = (f + 1) % 4;
      quad(A[f], A[f1], B[f1], B[f]);
    }
  }
  quad(topC[0], topC[1], topC[2], topC[3]);
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // ¿hacia fuera? (la primera cara es la de delante: su normal, hacia +z)
  if (g.attributes.normal.getZ(0) < 0) {
    for (let i = 0; i < pos.length; i += 9) for (let c = 0; c < 3; c++) [pos[i + 3 + c], pos[i + 6 + c]] = [pos[i + 6 + c], pos[i + 3 + c]];
    g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
  }
  // UV en metros, en el plano de cada cara
  const P = g.attributes.position,
    N = g.attributes.normal;
  const uv = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) {
    const nx = Math.abs(N.getX(i)),
      ny = Math.abs(N.getY(i));
    uv[i * 2] = ny > 0.7 || nx < 0.7 ? P.getX(i) : P.getZ(i);
    uv[i * 2 + 1] = ny > 0.7 ? P.getZ(i) : P.getY(i);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

function buildMonolith(rng) {
  const joints = [{ name: 'base', pos: [0, 0, 0] }];
  const parts = [];
  const add = (...p) => parts.push(...p);
  add({ j: 'base', type: 'geo', geo: monolithGeo(), uvk: 1, mat: S });
  // un filete de oro por el bisel de la cima
  {
    const T = monoFrame(7.4).corners.map((c, i) => [c[0], MONO.top[i] + 0.01, c[2]]);
    for (let i = 0; i < 4; i++) add(strip('base', T[i], T[(i + 1) % 4], 0.035, 0.035, AU, [0, 1, 0]));
  }
  // ---------------------------------------------------------- el relieve
  // la figura sin rostro, de cuerpo largo, con su halo y el brazo alzado;
  // en relieve sobre la cara de delante
  const RL = 0.035;
  const fr = (u, y, out = RL) => onFront(u, y, out);
  // (de x en metros a u)
  const U = (x, y) => x / monoFrame(y).ax;
  // el cuerpo: una tira ancha que se estrecha hacia los hombros
  for (let y = 0.4; y < 4.3; y += 0.3) {
    const w = 0.62 - ((y + 0.15) / 4.3) * 0.26;
    const a = fr(0, y),
      b = fr(0, Math.min(4.3, y + 0.3));
    add(strip('base', a.p, b.p, w * 1.25, 0.05, S, a.n));
  }
  // los hombros, el cuello y la cabeza (un óvalo), y el halo de púas
  add(strip('base', fr(U(-0.42, 4.32), 4.32).p, fr(U(0.42, 4.32), 4.32).p, 0.24, 0.05, S, fr(0, 4.32).n));
  add(strip('base', fr(0, 4.4).p, fr(0, 4.95).p, 0.13, 0.05, S, fr(0, 4.6).n));
  const hc = fr(0, IDOL.eye[1], RL + 0.012);
  const ryF = Math.atan2(hc.n[0], hc.n[2]) / DEG;
  add({ j: 'base', type: 'sphere', s: [0.22, 0.36, 0.06], p: hc.p, r: [0, ryF, 0], seg: 12, seg2: 8, mat: S });
  for (let i = 0; i < 13; i++) {
    const a = -100 * DEG + (i / 12) * 200 * DEG;
    const L = i % 2 ? 0.42 : 0.62;
    const y0 = IDOL.eye[1] + Math.cos(a) * 0.5,
      y1 = IDOL.eye[1] + Math.cos(a) * (0.5 + L);
    const A = fr(U(Math.sin(a) * 0.4, y0), y0),
      B = fr(U(Math.sin(a) * (0.4 + L), y1), y1);
    add(strip('base', A.p, B.p, 0.05, 0.035, S, A.n, { taper: [2.2, 1] }));
    add({ j: 'base', type: 'ico', s: [0.022], p: fr(U(Math.sin(a) * (0.4 + L), y1), y1, RL + 0.012).p, mat: AU });
  }
  // el brazo izquierdo, cruzado por delante; el derecho, alzado hasta la
  // altura de la cabeza: donde estuvo la mano, el engaste de oro vacío, con
  // los clavos arrancados y la luz dentro
  add(strip('base', fr(U(0.36, 4.15), 4.15).p, fr(U(0.22, 3.2), 3.2).p, 0.12, 0.05, S, fr(0, 3.6).n));
  add(strip('base', fr(U(0.22, 3.2), 3.2).p, fr(U(-0.3, 2.95), 2.95).p, 0.11, 0.05, S, fr(0, 3.0).n));
  add(strip('base', fr(U(-0.38, 4.2), 4.2).p, fr(U(-0.6, 4.75), 4.75).p, 0.12, 0.05, S, fr(0, 4.4).n));
  add(strip('base', fr(U(-0.6, 4.75), 4.75).p, fr(U(-0.58, 5.55), 5.55).p, 0.1, 0.05, S, fr(0, 5.1).n));
  {
    const sk = fr(U(-0.58, 5.7), 5.7, RL + 0.02);
    add({ j: 'base', type: 'torus', s: [0.09, 0.024], seg: 12, seg2: 4, p: sk.p, r: [0, ryF, 0], mat: AU });
    add({ j: 'base', type: 'cyl', s: [0.075, 0.075, 0.03], p: sk.p, r: [90, ryF, 0], seg: 10, mat: 'black' });
    add({ j: 'base', type: 'ico', s: [0.035], p: fr(U(-0.58, 5.7), 5.7, RL + 0.025).p, mat: 'redGlow' });
    for (const [dx, dy, rz] of [
      [-0.13, 0.05, 30],
      [0.12, 0.08, -40],
      [0.0, 0.16, 10],
    ]) {
      const a = fr(U(-0.58 + dx, 5.7 + dy), 5.7 + dy, RL + 0.02);
      add({ j: 'base', type: 'box', s: [0.018, 0.09, 0.018], p: a.p, r: [60, ryF, rz], mat: 'iron' });
    }
  }
  // ---------------------------------------------------------- la costura
  // de arriba abajo por el medio de la cara (y por la del relieve); el ojo,
  // en la cara (en su malla: se abre)
  for (let y = -1.3; y < 7.0; y += 0.5) {
    const top = Math.min(6.98, y + 0.5);
    const mid = (y + top) / 2;
    const out = mid > 4.95 && mid < 5.95 ? RL + 0.07 : mid > 0.35 && mid < 4.4 ? RL + 0.05 : 0.004;
    const a = fr(0, y, out),
      b = fr(0, top, out);
    add(strip('base', a.p, b.p, 0.03, 0.02, 'black', a.n));
    add(strip('base', fr(0, y, out + 0.012).p, fr(0, top, out + 0.012).p, 0.009, 0.01, 'redGlow', a.n));
  }
  {
    const e = fr(0, IDOL.eye[1], RL + 0.085);
    add({ j: 'base', type: 'ico', s: [0.04, 0.19, 0.025], p: e.p, r: [0, ryF, 0], mat: 'black', grp: 'eye' });
    add({ j: 'base', type: 'ico', s: [0.015, 0.14, 0.02], p: fr(0, IDOL.eye[1], RL + 0.1).p, r: [0, ryF, 0], mat: 'redGlow', grp: 'eye' });
    // lo que gotea del ojo, por la costura
    add(strip('base', fr(U(0.03, 5.25), 5.25, RL + 0.08).p, fr(U(0.035, 4.75), 4.75, RL + 0.065).p, 0.02, 0.012, 'blood', e.n));
  }
  // ---------------------------------------------------------- los glifos
  // columnas por los costados y una cenefa sobre el agua
  let gi = 0;
  for (const sx of [1, -1])
    for (const u of [-0.45, 0.45])
      for (let y = 6.2; y > -0.9; y -= 0.3) {
        const s = onSide(sx, u, y, 0.012);
        glyph(parts, rng, 'base', s.p, s.n, s.t, 0.17, gi++ % 6 === 3 ? GL : AU);
      }
  for (const y of [-1.02, -0.62]) {
    const C = monoFrame(y).corners;
    for (let i = 0; i < 4; i++) {
      const a = C[i],
        b = C[(i + 1) % 4];
      add(strip('base', [a[0] * 1.012, y, a[2] * 1.012], [b[0] * 1.012, y, b[2] * 1.012], 0.03, 0.016, AU, [(a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2]));
    }
  }
  for (let i = 0; i < 8; i++) {
    const f = fr(-0.85 + i * 0.24, -0.82, 0.012);
    glyph(parts, rng, 'base', f.p, f.n, f.t, 0.16, i === 5 ? GL : AU);
  }
  // ---------------------------------------------------------- los zunchos
  for (const [y, broken] of [
    [IDOL.bandA, false],
    [IDOL.bandB, true],
  ]) {
    const C = monoFrame(y).corners.map((c) => [c[0] * 1.045, y, c[2] * 1.045]);
    for (let i = 0; i < 4; i++) {
      if (broken && i === 3) continue;
      const a = C[i],
        b = C[(i + 1) % 4];
      const n = [(a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2];
      add(strip('base', a, b, 0.12, 0.035, 'plateRust', n));
      // la cruz remachada, en el medio de la cara
      const nl = Math.hypot(n[0], n[2]);
      const m = [(a[0] + b[0]) / 2 + (n[0] / nl) * 0.04, y, (a[2] + b[2]) / 2 + (n[2] / nl) * 0.04];
      if (i % 2 === 0) {
        add(strip('base', [m[0], y - 0.2, m[2]], [m[0], y + 0.24, m[2]], 0.05, 0.03, 'iron', n));
        const t = [b[0] - a[0], 0, b[2] - a[2]],
          tl = Math.hypot(t[0], t[2]);
        add(strip('base', [m[0] - (t[0] / tl) * 0.12, y + 0.1, m[2] - (t[2] / tl) * 0.12], [m[0] + (t[0] / tl) * 0.12, y + 0.1, m[2] + (t[2] / tl) * 0.12], 0.045, 0.03, 'iron', n));
      } else add({ j: 'base', type: 'sphere', s: [0.032], p: m, seg: 5, seg2: 3, mat: 'iron' });
    }
    if (broken)
      for (const [c, d] of [
        [C[3], C[2]],
        [C[0], C[1]],
      ]) {
        // los cabos reventados, doblados hacia fuera
        const dir = [c[0] - d[0], 0, c[2] - d[2]],
          l = Math.hypot(dir[0], dir[2]);
        add(strip('base', c, [c[0] + (dir[0] / l) * 0.25 + c[0] * 0.25, y + 0.14, c[2] + (dir[2] / l) * 0.25 + c[2] * 0.25], 0.12, 0.03, 'plateRust', [c[0], 0, c[2]]));
      }
  }
  return new Rig({ joints, parts });
}

export function buildIdol(kind = IDOL_KIND, seed = 1667) {
  const rng = new RNG(seed);
  return kind === 'monolito' ? buildMonolith(rng) : buildStatue(rng);
}

// La huella del ídolo a ras del suelo y sus zunchos (para la reja, las
// cadenas y la colisión), en su espacio (x a lo ancho, z de delante atrás)
export function idolFootprint(kind = IDOL_KIND) {
  if (kind === 'monolito') {
    const F = monoFrame(0);
    // (de cada esquina del zuncho de abajo sale una cadena)
    const anchors = monoFrame(IDOL.bandA).corners.map((c) => [c[0] * 1.06, IDOL.bandA, c[2] * 1.06]);
    return { kind, rect: true, ax: F.ax, az: F.az, tw: F.tw, anchors, half: [F.ax + 0.05, F.az + 0.05] };
  }
  const anchors = [45, 135, 225, 315].map((d) => onRobe((d * Math.PI) / 180, IDOL.bandA, 0.06).p);
  return { kind, rect: false, rx: robeRadius(0), rz: robeRadius(0) * RZ, anchors, half: [robeRadius(0) * 0.92, robeRadius(0) * RZ * 0.92] };
}
