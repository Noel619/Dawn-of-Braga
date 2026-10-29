// Mestre Clemente, el Físico de los Inocentes: el médico de la peste.
//
// Alto, flaco, algo cargado de hombros, de andar lento y medido: la vara en
// la derecha, como un bastón de peregrino, y la izquierda a la espalda. El
// ropón encerado hasta los pies (a la cera no se le agarra nada), con la
// esclavina sobre los hombros y la fila de botones de latón; la capucha de
// cuero, el sombrero de ala ancha y la máscara de pico, con los dos ojos de
// vidrio (cogen la luz como los de un pájaro) y el pico relleno de ruda, de
// mirra y de pétalos de rosa: no se la pone por los enfermos, se la pone por
// los sanos, por su aliento. Los guantes largos; al cinto, la caja de latón
// de la esponja soporífera, la campanilla de su rebaño y la bolsa de la cal.
// La vara: de fresno, más alta que él, con el gancho de hierro arriba (con
// ella señala dónde duele, toca sin tocar y, si huyes, te engancha).
//
// Debajo de la máscara (la pelea: se la quita), su cara: lavada, tranquila,
// rapada, y en la frente el agujero de su propia trepanación, con su anillo
// de plata. Se curó el primero.
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { Rig, clip } from './rig.js';
import { DEG, clamp, damp, dampAngle, angleDiff } from '../core/util.js';
import { MAT_DEFS } from '../gfx/materials.js';
import { tube, merge, place, gSph, gBox, gCyl, gTorus, folds, table, mix, sstep } from './sculpt.js';
import { humanoidJoints, torso, pelvis, arms, legs, neckHead, gown, capelet, hoodUp, TAU } from './figure.js';

export const FI_K = 1.1;
const K = FI_K;

// UV en metros por caras (como en el Turiferario)
function boxUV(g) {
  const h = g.index ? g.toNonIndexed() : g;
  const p = h.attributes.position;
  const uv = new Float32Array(p.count * 2);
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3(),
    n = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    n.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b));
    const ax = Math.abs(n.x),
      ay = Math.abs(n.y),
      az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const q = k === 0 ? a : k === 1 ? b : c;
      let u, v;
      if (ax >= ay && ax >= az) [u, v] = [q.z, q.y];
      else if (ay >= az) [u, v] = [q.x, q.z];
      else [u, v] = [q.x, q.y];
      uv[(i + k) * 2] = u;
      uv[(i + k) * 2 + 1] = v;
    }
  }
  h.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return h;
}
const P = (j, mat, geo, o = {}) => ({ j, type: 'geo', geo: boxUV(geo), mat, uvk: (MAT_DEFS[mat]?.uv ?? 1) * 1.6 * K, ...o });
const PD = (j, mat, geo, o = {}) => P(j, mat, geo, { ds: true, ...o });

// el perfil del ropón: [y (en el pecho), medio ancho, medio fondo], de
// abajo (los tobillos) arriba (el cuello)
const ROPON = [
  [-0.98, 0.3, 0.27],
  [-0.7, 0.268, 0.236],
  [-0.4, 0.236, 0.2],
  [-0.1, 0.206, 0.166],
  [0.15, 0.2, 0.158],
  [0.35, 0.214, 0.158],
  [0.44, 0.232, 0.15],
  [0.5, 0.212, 0.132],
  [0.55, 0.158, 0.11],
  [0.585, 0.1, 0.09],
  [0.61, 0.074, 0.076],
];
// (la espalda, cargada de hombros)
const ropCZ = (y) => -0.02 * sstep(0.1, 0.45, y);

// la cara del Físico: larga, chupada, la nariz larga, tranquila
const CARA = { h: 1.05, w: 0.94, gaunt: 0.013, socket: 0.014, brow: 0.01, nose: 0.03, noseW: 0.9, hook: 0.004, cheek: 0.006, jaw: 0.9, chin: 0.01, mouth: 0.002, lips: 0.0015, ears: 0.016 };

// La vara (en la mano derecha: a lo largo de su z, que con el antebrazo
// horizontal queda vertical): el asta de fresno, el regatón abajo y, arriba,
// la virola, la punta y el gancho, que se curva hacia delante (-y).
function vara() {
  const y = -0.07,
    z0 = -1.15,
    z1 = 0.74;
  const wood = [gCyl(0.017, 0.015, z1 - z0, 7, [0.004, y, (z0 + z1) / 2], [90, 0, 0])];
  // (las vueltas de cuero del puño)
  wood.push(gCyl(0.02, 0.02, 0.16, 7, [0.004, y, 0.02], [90, 0, 0]));
  const iron = [];
  iron.push(gCyl(0.019, 0.016, 0.07, 7, [0.004, y, z0 + 0.035], [90, 0, 0]));
  iron.push(gCyl(0.02, 0.018, 0.09, 7, [0.004, y, z1 + 0.02], [90, 0, 0]));
  // la punta, recta, para picar
  iron.push(tube([[0.004, y, z1 + 0.06], [0.004, y, z1 + 0.24]], (s) => mix(0.012, 0.0015, s), { n: 4, seg: 6 }));
  // el gancho: sale de la virola hacia delante y baja, con su filo
  iron.push(
    tube(
      [
        [0.004, y, z1 + 0.05],
        [0.004, y - 0.06, z1 + 0.12],
        [0.004, y - 0.13, z1 + 0.1],
        [0.004, y - 0.155, z1 + 0.02],
        [0.004, y - 0.13, z1 - 0.05],
      ],
      (s) => mix(0.011, 0.002, s * s),
      { n: 14, seg: 6 }
    )
  );
  return { wood: merge(wood), iron: merge(iron) };
}

export function buildFisico() {
  const joints = humanoidJoints(K, { arm: 1.1 });
  const parts = [];
  const UV = (mat) => (MAT_DEFS[mat]?.uv ?? 1) * 1.6 * K;
  const fig = (list) => list.map((p) => ({ ...p, geo: boxUV(p.geo), uvk: UV(p.mat) }));

  // ---------------------------------------------------------- el cuerpo
  // (casi no se ve: el ropón, los guantes y las botas lo tapan)
  parts.push(P('chest', 'fiSkin', torso({ w: 0.88, dep: 0.9, hunch: 0.5, pecs: 0, blades: 0.04 })));
  parts.push(P('hips', 'fiGlove', pelvis({ w: 0.92, dep: 0.92 })));
  parts.push(...fig(neckHead({ mat: 'fiSkin', neckR: 0.04, neckF: 0.02, tendons: true, head: CARA })));
  parts.push(...fig(arms({ mat: 'fiGlove', armT: 0.82, arm: 1.1, hand: { len: 1.18, thick: 0.86, curl: 0.3, spread: 0.2 }, handR: { curl: 0.88, spread: 0.06 } })));
  parts.push(...fig(legs({ mat: 'fiGlove', legT: 0.82, feet: 'pointed' })));

  // ---------------------------------------------------------- la cara
  // (bajo la máscara: se ve cuando se la quita) los ojos claros, quietos;
  // en la frente, el agujero de la trepanación con su anillo de plata
  const EY = 0.141 * CARA.h;
  for (const sx of [1, -1]) {
    parts.push(P('head', 'bone', gSph(0.0142, [sx * 0.031, EY, 0.07], [1, 0.9, 0.8], 10, 8)));
    parts.push(P('head', 'iron', gSph(0.0062, [sx * 0.031, EY + 0.001, 0.0805], [1, 1, 0.45], 8, 6)));
    parts.push(P('head', 'black', gSph(0.003, [sx * 0.031, EY + 0.001, 0.0832], [1, 1, 0.5], 6, 4)));
  }
  parts.push(P('head', 'black', gCyl(0.017, 0.017, 0.012, 12, [0, 0.212 * CARA.h, 0.074], [62, 0, 0])));
  parts.push(P('head', 'silver', gTorus(0.019, 0.0042, [0, 0.212 * CARA.h, 0.079], [62 + 90, 0, 0], 16, 4)));

  // ---------------------------------------------------------- la capucha
  parts.push(PD('head', 'fiWax', hoodUp({ open: 0.5, peak: 0.03, fall: 0.12, fwd: 0.012, low: -1.2, rx: 0.132, rz: 0.146, ry: 0.162, rim: 0.012 })));
  // (el babero de la capucha, que cierra el cuello por delante)
  parts.push(P('chest', 'fiWax', tube([[0, 0.5, 0.0], [0, 0.585, 0.012], [0, 0.66, 0.03]], (q) => table([[0, 0.092, 0.084], [0.5, 0.072, 0.07], [1, 0.064, 0.064]], q), { n: 6, seg: 14 })));
  // ---------------------------------------------------------- el sombrero
  {
    const yb = 0.262;
    const g = [
      gCyl(0.29, 0.29, 0.014, 20, [0, yb, 0.012], [5, 0, 0]),
      gCyl(0.122, 0.136, 0.135, 16, [0, yb + 0.072, 0.006], [5, 0, 0]),
      // (el ala, algo caída por delante y por detrás)
      gTorus(0.283, 0.008, [0, yb - 0.004, 0.012], [90 + 5, 0, 0], 28, 4),
    ];
    parts.push(P('head', 'fiGlove', merge(g), { grp: 'sombrero' }));
    parts.push(P('head', 'leather', gCyl(0.138, 0.139, 0.025, 16, [0, yb + 0.024, 0.008], [5, 0, 0]), { grp: 'sombrero' }));
    parts.push(P('head', 'silver', gBox(0.03, 0.024, 0.01, [0, yb + 0.024, 0.147], [5, 0, 0]), { grp: 'sombrero' }));
  }
  // ---------------------------------------------------------- la máscara
  // (su grupo: se la quita a media pelea)
  {
    const mk = { grp: 'mascara' };
    // la cara de cuero, que tapa de la frente a la barbilla
    parts.push(P('head', 'fiMask', gSph(1, [0, 0.112, 0.036], [0.092, 0.132, 0.082], 14, 10), mk));
    // el pico: curvo, hacia delante y abajo, con la costura por encima
    const path = [
      [0, 0.112, 0.094],
      [0, 0.1, 0.19],
      [0, 0.074, 0.28],
      [0, 0.032, 0.36],
    ];
    const R = (s) => mix(0.05, 0.005, Math.pow(s, 0.85));
    parts.push(P('head', 'fiMask', tube(path, (s) => [R(s) * 0.86, R(s)], { n: 18, seg: 10, up: [0, 1, 0], caps: true, capL: 0.006 }), mk));
    const curve = new THREE.CatmullRomCurve3(path.map((q) => new THREE.Vector3(...q)), false, 'centripetal');
    const seam = [],
      st = [];
    for (let i = 0; i <= 16; i++) {
      const s = (i / 16) * 0.92;
      const p = curve.getPointAt(s),
        t = curve.getTangentAt(s);
      // (la normal de arriba: perpendicular a la tangente, en el plano yz)
      const nY = t.z,
        nZ = -t.y;
      const r = R(s) * 0.98;
      seam.push([0, p.y + nY * r, p.z + nZ * r]);
      if (i % 2 === 0 && i < 15) st.push(gBox(0.014 * (1 - s * 0.6), 0.0025, 0.004, [0, p.y + nY * (r + 0.001), p.z + nZ * (r + 0.001)], [(Math.atan2(t.y, t.z) * -180) / Math.PI, 0, 0]));
    }
    parts.push(P('head', 'leather', tube(seam, 0.0028, { n: 24, seg: 4 }), mk));
    parts.push(P('head', 'leather', merge(st), mk));
    // las narices del pico (por donde respira la ruda)
    for (const sx of [1, -1]) parts.push(P('head', 'black', gSph(1, [sx * 0.013, 0.143, 0.15], [0.006, 0.003, 0.009], 6, 4), mk));
    // los ojos de vidrio, en sus cercos de latón
    for (const sx of [1, -1]) {
      parts.push(P('head', 'fiLens', gCyl(0.026, 0.026, 0.008, 14, [sx * 0.042, 0.152, 0.104], [90, 0, sx * -8]), mk));
      parts.push(P('head', 'bronze', gTorus(0.028, 0.0055, [sx * 0.042, 0.152, 0.106], [0, sx * -8, 0], 16, 4), mk));
    }
    // la correa de la frente
    parts.push(P('head', 'leather', gBox(0.13, 0.016, 0.01, [0, 0.198, 0.108], [-12, 0, 0]), mk));
  }

  // ---------------------------------------------------------- el ropón
  {
    const cut = -0.06,
      lap = 0.09,
      seed = 3;
    const hem = (t) => -0.98 - 0.02 * Math.max(0, -Math.cos(t)) + 0.015 * Math.max(0, folds(t, 9, 5)) ** 2;
    const o = { n: 11, dep: 0.03, seed, nt: 64, y0: ROPON[0][0], fy: 0.36 };
    const hemUp = (t) => cut - lap - 0.02 * Math.max(0, folds(t, 5, seed + 1));
    const up = gown(ROPON, hemUp, { ...o, nv: 12, cz: (v) => ropCZ(mix(cut - lap, 0.61, v)) });
    // (el faldón, abierto por delante: al andar se le ven las botas)
    const low = gown(ROPON, hem, { ...o, top: cut + lap, nv: 16, t0: 0.1, t1: TAU - 0.1, cz: (v) => ropCZ(mix(-0.98, cut + lap, v)) });
    parts.push(PD('chest', 'fiWax', up.geo));
    parts.push(PD('hips', 'fiWax', place(low.geo, [0, 0.1, 0])));
    // los botones de latón, del cuello a la cintura
    const bt = [];
    for (let i = 0; i < 9; i++) {
      const v = mix(0.94, 0.12, i / 8);
      const p = up.at(0, v),
        n = up.n(0, v);
      bt.push(gSph(0.0085, [p[0] + n[0] * 0.006, p[1], p[2] + n[2] * 0.006], [1, 1, 0.6], 6, 4));
    }
    parts.push(P('chest', 'bronze', merge(bt)));
    // la esclavina, sobre los hombros, con la punta a la espalda
    parts.push(PD('chest', 'fiWax', capelet({ top: 0.615, bot: 0.24, r0: [0.08, 0.08], r1: [0.33, 0.26], point: 0.07, n: 9, dep: 0.02, seed: 6, cz: () => -0.012 }).geo));
    // el cinto, con la hebilla, la caja de la esponja (a la izquierda), la
    // campanilla (a la derecha) y la bolsa de la cal (detrás)
    const belt = [];
    for (let k = 0; k <= 32; k++) {
      const a = (k / 32) * TAU;
      belt.push([Math.sin(a) * 0.222, 0.075 + 0.006 * Math.cos(a), Math.cos(a) * 0.184]);
    }
    parts.push(P('hips', 'leather', tube(belt, [0.022, 0.006], { n: 64, seg: 4, upFn: (q) => [Math.sin(q * TAU) / 0.222, 0, Math.cos(q * TAU) / 0.184] })));
    parts.push(P('hips', 'bronze', merge([gBox(0.05, 0.045, 0.01, [0, 0.075, 0.19]), gBox(0.03, 0.025, 0.012, [0, 0.075, 0.191])])));
    parts.push(P('hips', 'bronze', merge([gBox(0.085, 0.065, 0.04, [0.205, -0.02, 0.07], [0, 72, 0]), gCyl(0.006, 0.006, 0.05, 6, [0.21, 0.04, 0.07], [0, 0, 0])])));
    parts.push(P('hips', 'bronze', merge([gCyl(0.012, 0.034, 0.05, 10, [-0.215, -0.03, 0.06], [0, 0, 0]), gSph(0.008, [-0.215, -0.06, 0.06], [1, 1, 1], 6, 4)])));
    parts.push(P('hips', 'leather', merge([gCyl(0.004, 0.004, 0.06, 4, [-0.215, 0.025, 0.06], [0, 0, 0])])));
    parts.push(P('hips', 'leather', merge([gSph(1, [-0.14, -0.04, -0.175], [0.06, 0.07, 0.035], 8, 6), gCyl(0.025, 0.02, 0.025, 8, [-0.14, 0.035, -0.175], [0, 0, 0])])));
    // las mangas, holgadas, hasta la muñeca
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1;
      parts.push(PD('arm' + s, 'fiWax', tube([[-sx * 0.01, 0.0, 0], [0, -0.14, 0.004], [0, -0.33, 0]], (q) => table([[0, 0.06, 0.058], [0.5, 0.066, 0.064], [1, 0.064, 0.062]], q), { n: 8, seg: 12, mod: (a, q) => 1 + 0.06 * folds(a, 3, (s === 'L' ? 2 : 7) + q * 2) * q })));
      parts.push(PD('fore' + s, 'fiWax', tube([[0, 0.03, 0], [0, -0.1, 0.004], [0, -0.2, 0]], (q) => table([[0, 0.062, 0.06], [1, 0.054, 0.052]], q), { n: 6, seg: 12, mod: (a, q) => 1 + 0.05 * folds(a, 3, (s === 'L' ? 4 : 9) + q) })));
      // la vuelta de los guantes, sobre la manga
      parts.push(P('fore' + s, 'fiGlove', tube([[0, -0.16, 0], [0, -0.22, 0.002], [0, -0.3, 0]], (q) => table([[0, 0.06, 0.058], [0.5, 0.048, 0.046], [1, 0.034, 0.032]], q), { n: 6, seg: 12 })));
    }
  }
  // ---------------------------------------------------------- la vara
  {
    const v = vara();
    parts.push(P('handR', 'timber', v.wood, { grp: 'vara' }));
    parts.push(P('handR', 'iron', v.iron, { grp: 'vara' }));
  }

  // (todo hecho para una altura de 1: se escala)
  const out = parts.map((pt) => ({ ...pt, p: (pt.p || [0, 0, 0]).map((x) => x * K), sc: (pt.sc || [1, 1, 1]).map((x) => x * K) }));
  return new Rig({ joints, parts: out });
}

// ======================================================================= poses
// grados -> radianes (root en cm -> m)
export function rad(p) {
  const o = {};
  for (const k in p) o[k] = k === 'root' ? p[k].map((v) => v / 100) : p[k].map((v) => (v * Math.PI) / 180);
  return o;
}
// de pie: erguido, algo cargado, la cabeza ladeada como un pájaro; la vara
// en la derecha (el antebrazo adelante) y la izquierda a la espalda
export const FI_BASE = { chest: [6, 0, 0], head: [4, 0, -7], armR: [-12, 0, -6], foreR: [-82, 0, 0], handR: [0, 4, 0], armL: [30, -95, 8], foreL: [-95, 0, 0], handL: [0, 0, 20] };
const B = FI_BASE;
// (una clave: la pose de siempre con lo que cambia)
const K_ = (o) => ({ ...B, ...o });
// la izquierda, sacada de la espalda y adelante (la esponja, la cal, la
// campanilla)
const IZQ = { armL: [-60, 0, 14], foreL: [-50, 0, 0], handL: [0, 0, 0] };
// la izquierda en alto, sujetando el paño de la cortina a un lado
const PANO = { armL: [-98, 0, 56], foreL: [-38, 0, 0], handL: [0, 0, 22] };

export const FI_CLIPS = {
  // te ve: se queda quieto y ladea la cabeza, como un pájaro (de un golpe),
  // y luego del otro lado
  alert: clip('fi_alert', 1.9, [
    [0, K_({})],
    [0.22, K_({ head: [0, 12, -34], chest: [4, 6, 0] }), 'snap'],
    [1.0, K_({ head: [1, 12, -36], chest: [4, 6, 0] }), 'hold'],
    [1.22, K_({ head: [2, -8, 18], chest: [4, -3, 0] }), 'snap'],
    [1.9, K_({})],
  ]),
  // lo mismo, más despacio (las cinemáticas, las vigilancias)
  ladea: clip('fi_ladea', 2.6, [
    [0, K_({})],
    [0.5, K_({ head: [0, 10, -32], chest: [4, 4, 0] }), 'snap'],
    [1.6, K_({ head: [1, 10, -34], chest: [4, 4, 0] }), 'hold'],
    [1.9, K_({ head: [2, -6, 14] }), 'snap'],
    [2.6, K_({})],
  ]),
  // husmea: alza el pico y lo mueve de un lado a otro (te huele)
  husmea: clip('fi_husmea', 2.4, [
    [0, K_({})],
    [0.4, K_({ head: [-24, 0, -4], chest: [0, 0, 0] })],
    [0.85, K_({ head: [-22, 24, 2], chest: [0, 6, 0] })],
    [1.35, K_({ head: [-22, -24, -6], chest: [0, -6, 0] })],
    [1.8, K_({ head: [-14, 0, -12], chest: [2, 0, 0] })],
    [2.4, K_({})],
  ]),
  // señala con la vara: «tú»
  senala: clip('fi_senala', 1.8, [
    [0, K_({})],
    [0.45, K_({ armR: [-62, 0, -8], foreR: [-28, 0, 0], handR: [62, 0, 0], chest: [8, 8, 0], head: [6, 0, -14] })],
    [1.25, K_({ armR: [-64, 0, -8], foreR: [-26, 0, 0], handR: [64, 0, 0], chest: [8, 8, 0], head: [6, 0, -16] }), 'hold'],
    [1.8, K_({})],
  ]),
  // la cortina (fisico_cine.js; los tiempos, los de la escena): aparta el
  // paño con la izquierda, se asoma, ladea la cabeza y lo suelta
  cortina: clip('fi_cortina', 9.0, [
    [0, K_({})],
    [3.35, K_({}), 'hold'],
    [3.8, K_({ armL: [-112, 0, 20], foreL: [-50, 0, 0], handL: [0, 0, 10], chest: [6, 0, 0], head: [6, 0, -6] })],
    [4.35, K_({ ...PANO, chest: [10, -6, 0], head: [10, 4, -4] })],
    [5.15, K_({ ...PANO, chest: [10, -6, 0], head: [11, 3, -5] }), 'hold'],
    [5.35, K_({ ...PANO, chest: [10, -2, 0], head: [9, 12, -34] }), 'snap'],
    [6.4, K_({ ...PANO, chest: [10, -2, 0], head: [10, 12, -36] }), 'hold'],
    [6.6, K_({ ...PANO, chest: [10, -6, 0], head: [11, -4, 10] }), 'snap'],
    [7.35, K_({ ...PANO, chest: [10, -6, 0], head: [10, 0, -6] }), 'hold'],
    [8.0, K_({ armL: [-30, -40, 20], foreL: [-85, 0, 0] })],
    [9.0, K_({})],
  ]),
  // ---------------------------------------------------------- golpes
  // el barrido: se lleva la vara atrás, a la derecha, y la pasa de lado a
  // lado a la altura del pecho, el gancho por delante
  barrido: clip('fi_barrido', 1.55, [
    [0, K_({})],
    [0.5, K_({ chest: [4, 42, 2], head: [4, -20, -8], armR: [-58, 0, -64], foreR: [-32, 0, 0], handR: [82, 0, 26], legR: [-6, 0, 0], legL: [8, 0, 0] }), 'hold'],
    [0.7, K_({ chest: [12, -44, -2], head: [6, 16, -6], armR: [-84, 0, 12], foreR: [-12, 0, 0], handR: [84, 0, -20], legR: [12, 0, 0], legL: [-14, 0, 0], shinL: [12, 0, 0], root: [0, -4, 4] }), 'strike'],
    [0.95, K_({ chest: [12, -50, -2], head: [6, 18, -6], armR: [-80, 0, 18], foreR: [-14, 0, 0], handR: [82, 0, -24], legR: [12, 0, 0], legL: [-14, 0, 0], shinL: [12, 0, 0], root: [0, -4, 4] }), 'settle'],
    [1.55, K_({})],
  ]),
  // el picotazo: recoge la vara junto al hombro y la mete de punta, con
  // todo el cuerpo detrás
  pica: clip('fi_pica', 1.3, [
    [0, K_({})],
    [0.42, K_({ chest: [0, 22, 0], head: [6, -14, -6], armR: [-34, 0, -20], foreR: [-112, 0, 0], handR: [88, 0, 0], legR: [10, 0, 0], legL: [-4, 0, 0] }), 'hold'],
    [0.56, K_({ chest: [16, -8, 0], head: [10, 6, -4], armR: [-86, 0, -6], foreR: [-6, 0, 0], handR: [90, 0, 0], legL: [-30, 0, 0], shinL: [24, 0, 0], legR: [18, 0, 0], root: [0, -8, 16] }), 'strike'],
    [0.82, K_({ chest: [16, -8, 0], head: [10, 6, -4], armR: [-84, 0, -6], foreR: [-10, 0, 0], handR: [90, 0, 0], legL: [-30, 0, 0], shinL: [24, 0, 0], legR: [18, 0, 0], root: [0, -8, 14] }), 'settle'],
    [1.3, K_({})],
  ]),
  // el gancho: alarga la vara, te engancha y tira de ti
  gancho: clip('fi_gancho', 1.8, [
    [0, K_({})],
    [0.45, K_({ chest: [2, 18, 0], armR: [-50, 0, -14], foreR: [-80, 0, 0], handR: [70, 0, 0], head: [6, -8, -10] }), 'hold'],
    [0.62, K_({ chest: [18, -6, 0], armR: [-92, 0, -4], foreR: [-4, 0, 0], handR: [76, 0, 0], legL: [-26, 0, 0], shinL: [20, 0, 0], legR: [16, 0, 0], root: [0, -6, 14] }), 'strike'],
    [0.78, K_({ chest: [18, -6, 0], armR: [-90, 0, -4], foreR: [-6, 0, 0], handR: [60, 0, 0], legL: [-26, 0, 0], shinL: [20, 0, 0], legR: [16, 0, 0], root: [0, -6, 14] })],
    [1.12, K_({ chest: [-4, 10, 0], armR: [-40, 0, -14], foreR: [-120, 0, 0], handR: [56, 0, 0], legL: [8, 0, 0], legR: [-10, 0, 0], root: [0, -2, -10] }), 'snap'],
    [1.8, K_({})],
  ]),
  // la esponja: saca la izquierda de la espalda con la esponja empapada y
  // se te echa encima para ponértela en la cara
  esponja: clip('fi_esponja', 1.7, [
    [0, K_({})],
    [0.5, K_({ chest: [10, -18, 0], head: [8, 10, -10], armL: [-30, 0, 30], foreL: [-90, 0, 0], handL: [0, 0, 0], legL: [6, 0, 0] }), 'hold'],
    [0.7, K_({ chest: [26, 12, 0], head: [14, -8, -6], armL: [-92, 0, 10], foreL: [-12, 0, 0], handL: [-20, 0, 0], legR: [-34, 0, 0], shinR: [26, 0, 0], legL: [20, 0, 0], root: [0, -10, 18] }), 'strike'],
    [0.95, K_({ chest: [26, 12, 0], head: [14, -8, -6], armL: [-88, 0, 10], foreL: [-18, 0, 0], handL: [-20, 0, 0], legR: [-34, 0, 0], shinR: [26, 0, 0], legL: [20, 0, 0], root: [0, -10, 16] }), 'settle'],
    [1.7, K_({})],
  ]),
  // sujeto: la esponja en tu cara (en bucle), la vara a un lado
  sedando: clip('fi_sedando', 1.2, [
    [0, K_({ chest: [16, 6, 0], head: [16, -6, -16], armL: [-80, 0, 6], foreL: [-30, 0, 0], handL: [-30, 0, 0], armR: [-30, 0, -24], foreR: [-60, 0, 0], handR: [20, 0, 0], root: [0, -6, 6] })],
    [0.6, K_({ chest: [18, 4, 0], head: [18, -4, -22], armL: [-82, 0, 6], foreL: [-26, 0, 0], handL: [-34, 0, 0], armR: [-30, 0, -24], foreR: [-60, 0, 0], handR: [20, 0, 0], root: [0, -7, 7] })],
    [1.2, K_({ chest: [16, 6, 0], head: [16, -6, -16], armL: [-80, 0, 6], foreL: [-30, 0, 0], handL: [-30, 0, 0], armR: [-30, 0, -24], foreR: [-60, 0, 0], handR: [20, 0, 0], root: [0, -6, 6] })],
  ]),
  // la cal: un puñado de la bolsa, a los ojos
  cal: clip('fi_cal', 1.4, [
    [0, K_({})],
    [0.45, K_({ chest: [2, -26, 0], armL: [20, -40, 30], foreL: [-100, 0, 0], handL: [20, 0, 0], head: [4, 12, -8] }), 'hold'],
    [0.6, K_({ chest: [12, 18, 0], armL: [-96, 0, 8], foreL: [-6, 0, 0], handL: [-30, 0, 0], head: [6, -6, -8], root: [0, -2, 6] }), 'snap'],
    [0.9, K_({ chest: [10, 18, 0], armL: [-92, 0, 8], foreL: [-10, 0, 0], handL: [-30, 0, 0], head: [6, -6, -8], root: [0, -2, 6] })],
    [1.4, K_({})],
  ]),
  // la campanilla: la saca y la toca, despacio, tres veces (su rebaño)
  campanilla: clip('fi_campanilla', 2.2, [
    [0, K_({})],
    [0.4, K_({ ...IZQ, armL: [-70, 0, 26], foreL: [-60, 0, 0], head: [-4, 0, -8] })],
    [0.6, K_({ ...IZQ, armL: [-76, 0, 26], foreL: [-50, 0, 0], handL: [20, 0, 0], head: [-4, 0, -8] }), 'snap'],
    [0.85, K_({ ...IZQ, armL: [-70, 0, 26], foreL: [-60, 0, 0], handL: [-16, 0, 0], head: [-4, 0, -8] }), 'snap'],
    [1.1, K_({ ...IZQ, armL: [-76, 0, 26], foreL: [-50, 0, 0], handL: [20, 0, 0], head: [-4, 0, -8] }), 'snap'],
    [1.35, K_({ ...IZQ, armL: [-70, 0, 26], foreL: [-60, 0, 0], handL: [-16, 0, 0], head: [-4, 0, -8] }), 'snap'],
    [2.2, K_({})],
  ]),
  // ---------------------------------------------------------- lo que recibe
  hurt: clip('fi_hurt', 0.6, [
    [0, K_({ chest: [-8, 12, -4], head: [-14, -10, 6], root: [0, -2, -6] }), 'snap'],
    [0.6, K_({})],
  ]),
  stagger: clip('fi_stagger', 1.4, [
    [0, K_({ chest: [-16, 20, 0], head: [-24, 0, 12], armR: [-40, 0, -40], foreR: [-40, 0, 0], root: [0, -6, -14], legL: [-20, 0, 0], shinL: [30, 0, 0] }), 'snap'],
    [0.6, K_({ chest: [30, 0, 6], head: [16, 0, -10], root: [0, -20, 0], legL: [-40, 0, 0], shinL: [60, 0, 0], legR: [-24, 0, 0], shinR: [50, 0, 0] })],
    [1.4, K_({})],
  ]),
  parried: clip('fi_parried', 1.7, [
    [0, K_({ chest: [-20, 24, 0], head: [-26, 10, 20], armR: [-140, 0, -50], foreR: [-30, 0, 0], handR: [40, 0, 0], root: [0, -4, -12], legL: [10, 0, 0], legR: [-20, 0, 0], shinR: [20, 0, 0] }), 'snap'],
    [0.6, K_({ chest: [-14, 18, 0], head: [-18, 8, 16], armR: [-120, 0, -50], foreR: [-30, 0, 0], handR: [40, 0, 0], root: [0, -6, -12] })],
    [1.7, K_({})],
  ]),
  // (la de la caza: hincado de una rodilla; la de verdad, en la pelea)
  death: clip(
    'fi_death',
    2.6,
    [
      [0, K_({ chest: [-10, 0, 0], head: [-20, 0, 10] }), 'snap'],
      [0.8, K_({ chest: [20, 0, 4], head: [20, 0, -20], root: [0, -50, 0], legL: [-90, 0, 0], shinL: [100, 0, 0], legR: [-10, 0, 0], shinR: [110, 0, 0], footR: [30, 0, 0] })],
      [2.6, K_({ chest: [40, 0, 6], head: [30, 0, -26], root: [0, -54, 0], legL: [-90, 0, 0], shinL: [104, 0, 0], legR: [-10, 0, 0], shinR: [112, 0, 0], footR: [30, 0, 0] })],
    ],
    { ground: false }
  ),
};
export const FISICO_POSE = { idlePose: () => rad(FI_BASE) };

// ======================================================================= tipo
const V3 = THREE.Vector3;
// quién habla (sus bocadillos): la voz baja, apagada por la máscara
function who(e) {
  if (!e.P.who) {
    const off = new V3(0, 0.32, 0.12);
    e.P.who = { id: 'fisico', name: 'Mestre Clemente', voice: 'npcTalk', pitch: 0.72, head: (out) => e.rig.worldPos('head', out, off) };
  }
  return e.P.who;
}
export const fiWho = who;
export function fiSay(e, text, dur) {
  const sp = e.game.speech;
  if (sp && text) sp.say(who(e), text, dur ? { dur } : {});
}
// las piezas de un grupo: la máscara, el sombrero, la vara, la esponja, la
// campanilla (lo que saca de la espalda o del cinto)
export function fiGrp(e, name, on) {
  for (const m of e.rig.meshes) if (m.userData.grp === name) m.visible = on;
}

// El gancho: si te alcanza la punta (de lejos, de frente), te engancha y
// tira de ti; trastabillas hacia él (y detrás viene la esponja).
function engancha(e, g) {
  const p = g.player;
  if (p.dead || p.iframe || p.state === 'roll' || p.state === 'grabbed') return;
  const d = e.distTo(p.pos);
  const a = Math.abs(angleDiff(e.yaw, e.angleTo(p.pos)));
  if (d > 4.0 || d < 0.9 || a > 22 * DEG || Math.abs(p.pos.y - e.pos.y) > 0.9) return;
  const fx = Math.sin(e.yaw),
    fz = Math.cos(e.yaw);
  p.releaseGrab && p.releaseGrab(Math.min(7, 2.2 + d * 1.4), -fx, -fz, e.D && e.D.engaged ? 9 : 3);
  e.data.hookT = g.time;
  g.audio && g.audio.play('hit', p.pos);
  g.camRig.shake(0.3);
  g.fisico && g.fisico.onHook(e);
}

// La esponja: si te alcanza, te la aprieta contra la cara; forcejeando te
// sueltas; si no, te duermes (game/fisico.js: la camilla).
function esponja(e, g) {
  const p = g.player;
  const d = e.distTo(p.pos);
  const a = Math.abs(angleDiff(e.yaw, e.angleTo(p.pos)));
  // (cogido en un cepo, también: le abre el cepo para llevárselo)
  const cepo = g.trampas && g.trampas.held;
  if (p.dead || p.iframe || d > 1.55 || a > 55 * DEG || Math.abs(p.pos.y - e.pos.y) > 0.9 || (p.state === 'grabbed' && !cepo) || p.state === 'pinned') return;
  if (cepo) g.trampas.abre();
  p.startGrabbed && p.startGrabbed(e);
  e.state = 'sedando';
  e.stT = 0;
  e.atk = null;
  e.data.spongeT = g.time;
  e.data.mash0 = p.mash || 0;
  e.anim.play(FI_CLIPS.sedando, { blend: 0.08, loop: true });
  g.audio && g.audio.play('grab', p.pos);
  g.camRig.shake(0.3);
  g.fisico && g.fisico.onSponge(e);
}
// se suelta (escaped) o se duerme
function sueltaEsponja(e, escaped) {
  const g = e.game;
  const p = g.player;
  const fx = Math.sin(e.yaw),
    fz = Math.cos(e.yaw);
  e.anim.stop(0.15);
  fiGrp(e, 'esponja', false);
  if (escaped) {
    if (p.state === 'grabbed') p.releaseGrab && p.releaseGrab(2.4, fx, fz, 0);
    e.state = 'stagger';
    e.stT = 0;
    e.anim.play(FI_CLIPS.stagger, { blend: 0.05 });
    g.fisico && g.fisico.onSpongeEscape(e);
  } else {
    e.state = 'chase';
    e.stT = 0;
    e.cooldown = 1.2;
    g.fisico && g.fisico.onAsleep(e);
  }
}

// La cal: un puñado a los ojos (lo que pasa: game/fisico.js)
function cal(e, g) {
  g.fisico && g.fisico.cal(e);
}

// (cazando no quiere matarte, quiere dormirte: la vara apenas hiere, pero
// derriba y cansa; en la pelea de su casa, ya no se contiene)
// (cogido en un cepo, cazando no le pega: va a por él con la esponja)
const caza = (e) => !(e.D && e.D.engaged) && !(e.game.trampas && e.game.trampas.held);
const pelea = (e) => !!(e.D && e.D.engaged);
const A = {
  barrido: { name: 'barrido', clip: FI_CLIPS.barrido, dur: 1.55, min: 0, max: 3.0, hits: [[0.62, 0.8]], dmg: 18, stDmg: 22, range: 3.0, arc: 150, lunge: [[0.58, 0.72, 1.4]], weight: 3, cd: 0.9, cond: pelea },
  pica: { name: 'pica', clip: FI_CLIPS.pica, dur: 1.3, min: 1.2, max: 3.6, hits: [[0.52, 0.64]], dmg: 16, range: 3.7, arc: 28, lunge: [[0.48, 0.6, 3.2]], weight: 2.4, cd: 0.8, cond: pelea },
  barridoCaza: { name: 'barrido', clip: FI_CLIPS.barrido, dur: 1.55, min: 0, max: 3.0, hits: [[0.62, 0.8]], dmg: 5, stDmg: 45, stagger: true, knock: 4.5, range: 3.0, arc: 150, lunge: [[0.58, 0.72, 1.4]], weight: 2.2, cd: 1.1, cond: (e) => caza(e) && e.game.player.hp > e.game.player.maxHp * 0.35 },
  picaCaza: { name: 'pica', clip: FI_CLIPS.pica, dur: 1.3, min: 1.2, max: 3.6, hits: [[0.52, 0.64]], dmg: 4, stDmg: 40, knock: 5, range: 3.7, arc: 28, lunge: [[0.48, 0.6, 3.2]], weight: 1.6, cd: 1.0, cond: (e) => caza(e) && e.game.player.hp > e.game.player.maxHp * 0.35 },
  gancho: { name: 'gancho', clip: FI_CLIPS.gancho, dur: 1.8, min: 2.0, max: 3.9, hits: [], dmg: 0, range: 4.0, arc: 40, weight: 2.2, cd: 0.6, noParry: true, trackUntil: 0.55, events: [{ t: 0.64, fn: engancha }, { t: 0.72, fn: engancha }], cond: (e) => e.game.time - (e.data.hookT ?? -99) > 4 && !(e.game.trampas && e.game.trampas.held) },
  esponja: {
    name: 'esponja',
    clip: FI_CLIPS.esponja,
    dur: 1.7,
    min: 0,
    max: 2.5,
    hits: [],
    dmg: 0,
    range: 1.6,
    arc: 60,
    lunge: [[0.58, 0.8, 4.4]],
    weight: 2.0,
    cd: 1.6,
    noParry: true,
    trackUntil: 0.56,
    events: [{ t: 0.72, fn: esponja }, { t: 0.84, fn: esponja }],
    onStart: (e) => fiGrp(e, 'esponja', true),
    cond: (e) => e.game.time - (e.data.spongeT ?? -99) > 5,
  },
  cal: { name: 'cal', clip: FI_CLIPS.cal, dur: 1.4, min: 1.4, max: 5.5, hits: [], dmg: 0, range: 5.5, arc: 50, weight: 0.9, cd: 1.8, noParry: true, events: [{ t: 0.6, fn: cal }], cond: (e) => !!e.data.calOk },
};
export const FI_ATTACKS = A;

export const FISICO_TYPE = {
  name: 'Mestre Clemente, el Físico de los Inocentes',
  title: 'Mestre Clemente',
  build: buildFisico,
  hp: 960,
  poise: 70,
  radius: 0.42,
  height: 2.05,
  lockHeight: 1.62,
  walk: 1.2,
  run: 3.4,
  runDist: 6.5,
  sight: 20,
  fov: 150,
  hear: 9,
  turn: 3.4,
  stride: 2.2,
  approach: 2.5,
  leash: 9999,
  boss: true,
  // (no tiene niebla ni arena: caza por el barrio; la barra, sólo en la
  // pelea de verdad)
  stalker: true,
  introDur: 3.0,
  alertTime: 1.9,
  parryPosture: 2,
  parryDur: 1.5,
  clips: FI_CLIPS,
  voice: 'fisico',
  blood: [0.4, 0.05, 0.04],
  biped: { scale: K, style: { strideBase: 1.0, strideK: 0.42, liftWalk: 0.08, bobWalk: 0.008, swayWalk: 0.012, rollWalk: 1.5, twistWalk: 3, chestTwistWalk: 2, lean: 2, leanRun: 8, armWalk: 0, armRun: 6 }, stance: 0.06 },
  attacks: [A.barrido, A.pica, A.barridoCaza, A.picaCaza, A.gancho, A.esponja, A.cal],
  // ve de lejos y huele de cerca (aunque estés a su espalda, tras una
  // esquina): por el pico
  perceive: (e, pl) => {
    const g = e.game;
    if (pl.dead || (g.dev && g.dev.invisible)) return false;
    const dy = pl.pos.y - e.pos.y;
    if (Math.abs(dy) > 3.2) return false;
    const d = e.distTo(pl.pos);
    if (d < 3.2) return true;
    if (d > e.T.sight) return false;
    const eye = e.pos.y + 1.8;
    if (!g.world.col.lineOfSight(e.pos.x, eye, e.pos.z, pl.pos.x, pl.pos.y + 1.4, pl.pos.z)) return false;
    // (corriendo o peleando, se le oye: de lado y de espaldas)
    if (d < e.T.hear * (pl.sprinting ? 1.8 : 1) && (pl.sprinting || pl.state === 'attack' || pl.state === 'roll')) return true;
    return Math.abs(angleDiff(e.yaw, e.angleTo(pl.pos))) < e.T.fov * 0.5 * DEG;
  },
  // te ve: no avisa a nadie (te mira y ladea la cabeza); lo demás lo decide
  // la cabeza del barrio (game/fisico.js)
  wake: (e) => {
    const F = e.game.fisico;
    return F ? F.onWake(e) : false;
  },
  think: (e, pl, d, dt) => {
    const g = e.game;
    // tras engancharte, la esponja, enseguida; y si estás cogido en un cepo
    if ((e.data.hookT && g.time - e.data.hookT < 1.3 && d < 2.6 && pl.state !== 'grabbed') || (g.trampas && g.trampas.held && d < 2.4 && pl.state === 'grabbed')) {
      e.data.hookT = 0;
      e.startAttack(A.esponja);
      return 'handled';
    }
    const F = g.fisico;
    return F ? F.think(e, pl, d, dt) : null;
  },
  states: {
    // la esponja en tu cara: forcejea o te duermes
    sedando: (e, dt, pl) => {
      e.vx = damp(e.vx, 0, 10, dt);
      e.vz = damp(e.vz, 0, 10, dt);
      if (pl.state !== 'grabbed' || pl.dead) {
        e.state = 'chase';
        e.stT = 0;
        e.anim.stop(0.15);
        fiGrp(e, 'esponja', false);
        return false;
      }
      const fx = Math.sin(e.yaw),
        fz = Math.cos(e.yaw);
      pl.pos.x = damp(pl.pos.x, e.pos.x + fx * 0.78, 12, dt);
      pl.pos.z = damp(pl.pos.z, e.pos.z + fz * 0.78, 12, dt);
      pl.yaw = Math.atan2(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z);
      const k = clamp(e.stT / 2.8, 0, 1);
      e.game.fisico && e.game.fisico.sueno(k, dt);
      if ((pl.mash || 0) - (e.data.mash0 || 0) >= 9) sueltaEsponja(e, true);
      else if (e.stT > 2.8) sueltaEsponja(e, false);
      return false;
    },
    // va a un sitio (y al llegar, lo que diga el guion): data.goal
    camina: (e, dt, pl) => {
      const G = e.data.goal;
      if (!G) {
        e.state = 'chase';
        return true;
      }
      const d = Math.hypot(G.x - e.pos.x, G.z - e.pos.z);
      if (d < (G.r ?? 0.45)) {
        e.vx = damp(e.vx, 0, 8, dt);
        e.vz = damp(e.vz, 0, 8, dt);
        if (G.face != null) e.yaw = dampAngle(e.yaw, G.face, 5, dt);
        if (!G.done) {
          G.done = true;
          G.then && G.then(e);
        }
        return false;
      }
      e.chaseTo(G.x, G.z, G.speed ?? e.T.walk, dt, G.y ?? e.pos.y);
      return true;
    },
    // quieto, mirando (al jugador o a un punto), lo que dure
    mira: (e, dt, pl) => {
      const M = e.data.look || {};
      e.vx = damp(e.vx, 0, 8, dt);
      e.vz = damp(e.vz, 0, 8, dt);
      const tx = M.x ?? pl.pos.x,
        tz = M.z ?? pl.pos.z;
      if (M.track !== false) e.yaw = dampAngle(e.yaw, Math.atan2(tx - e.pos.x, tz - e.pos.z), 3, dt);
      if (e.stT > (M.t ?? 3) && !M.done) {
        M.done = true;
        M.then && M.then(e);
      }
      return false;
    },
    // clava tablas en una puerta (el martillo, los clavos): data.tapia
    tapia: (e, dt, pl) => {
      const T = e.data.tapia || {};
      e.vx = damp(e.vx, 0, 8, dt);
      e.vz = damp(e.vz, 0, 8, dt);
      if (T.face != null) e.yaw = dampAngle(e.yaw, T.face, 5, dt);
      T.k = (T.k ?? 0) - dt;
      if (T.k <= 0) {
        T.k = 0.42 + Math.random() * 0.3;
        e.game.audio && e.game.audio.play('hammer', { x: T.x ?? e.pos.x, y: e.pos.y + 1.2, z: T.z ?? e.pos.z });
      }
      if (e.stT > (T.t ?? 5) && !T.done) {
        T.done = true;
        T.then && T.then(e);
      }
      return false;
    },
  },
  // (fuera de la pelea no muere: se retira; game/fisico.js)
  preHit: (e, dmg, poise) => {
    const F = e.game.fisico;
    if (e.state === 'sedando') return { dmg: dmg * 0.5, poise: 0 };
    return F ? F.preHit(e, dmg, poise) : null;
  },
  onHit: (e, r, dmg) => {
    const F = e.game.fisico;
    F && F.onHit(e, r, dmg);
  },
  onReset: (e) => {
    e.data = {};
    for (const g of ['mascara', 'sombrero', 'vara']) fiGrp(e, g, true);
    for (const g of ['esponja', 'campanilla']) fiGrp(e, g, false);
    if (e.game.speech && e.P.who) e.game.speech.hush(e.P.who);
  },
  update: (e, dt, pl) => {
    // lo que saca para un golpe, a su sitio después
    if (e.state !== 'attack' && e.state !== 'sedando' && e.data.handOut) {
      fiGrp(e, 'esponja', false);
      fiGrp(e, 'campanilla', false);
      e.data.handOut = false;
    }
    if (e.state === 'attack' && e.atk && (e.atk.name === 'esponja' || e.atk.name === 'campanilla')) e.data.handOut = true;
    const F = e.game.fisico;
    F && F.updateBody(e, dt, pl);
  },
  idlePose: (e, kind, t) => {
    const br = Math.sin(t * 1.1 + e.phase) * 1.2;
    const up = e.data.lookUp ? 1 : 0;
    return rad({ ...B, chest: [6 + br * 0.4 - up * 8, 0, 0], head: [4 + br - up * 34, 0, -7 + up * 10] });
  },
  // andar: erguido, despacio, la vara marcando el paso, la izquierda a la
  // espalda (corriendo, la saca para equilibrarse)
  loco: (e, t, spd) => {
    const run = clamp((spd - 1.8) / 1.6, 0, 1);
    const ph = e.phase;
    const sw = Math.sin(ph);
    return rad({
      ...B,
      chest: [6 + run * 10 - (e.data.lookUp ? 8 : 0), 0, 0],
      head: [4 - run * 4 - (e.data.lookUp ? 34 : 0), 0, -7 + run * 4 + (e.data.lookUp ? 10 : 0)],
      handR: [sw * 10 * (1 - run), 4, 0],
      armL: [mix(30, -10 + sw * 24, run), mix(-95, 0, run), mix(8, 12, run)],
      foreL: [mix(-95, -40, run), 0, 0],
      handL: [0, 0, mix(20, 0, run)],
    });
  },
};

