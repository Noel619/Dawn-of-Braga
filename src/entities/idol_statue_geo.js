// La estatua de la fuente: Deo Ignoto tal como lo encontraron los romanos
// dentro de la roca (nadie la talló). La geometría, esculpida como los
// colosos (colossus/sculpt.js: superficies que se funden, con su relieve y
// su oclusión), sin materiales: corre igual en un hilo de fondo
// (colossus/build_worker.js). El montaje y lo que se mueve, en
// idol_statue.js.
//
// Catorce metros de piedra oscura, gastada y mojada, que se alza desde la
// sima del fondo del círculo de la cisterna (los pies, en el agua roja de
// abajo; de cintura para arriba, por encima del suelo):
//  - el hábito de pliegues hondos, de canto vivo, que se pierde en la sima,
//    con los dos zunchos de hierro de Martín (el de arriba, reventado) y sus
//    cadenas, tendidas hasta el borde;
//  - el manto, pesado, abierto por delante sobre un costillar abierto como
//    dos puertas: el esternón partido y, al fondo del pecho, la brasa, que
//    late con la fuente; una joroba de buitre (la misma que le salió al
//    arzobispo);
//  - el brazo derecho alzado, descarnado, con el antebrazo en pie: acaba
//    en un muñón (el corte de Martín, con un aro de oro y la luz dentro);
//  - el izquierdo baja y se agarra con sus cuatro dedos al borde de la
//    sima, con las garras clavadas en el suelo, como si fuera a salir;
//  - el cuello largo, de tendones y vértebras, y la cabeza vencida hacia
//    la fuente: una cara larga de hueso que no es de nada que se conozca,
//    sin ojos ni nariz, partida de arriba abajo por una costura que rezuma
//    luz. La costura es un ojo: se abre (los párpados de piedra se retiran)
//    y lo de dentro, con la pupila de cabra, mira. Dos cuernos que se
//    tuercen hacia atrás (uno, roto), una corona de espinas de hueso por
//    detrás (lo que queda del halo; las que no se rompieron, con la punta de
//    oro) y la diadema de oro hundida en la frente.
// Por toda ella, lo que deja el agua: chorreones oscuros que bajan, sal.
//
// Espacio del modelo: el origen en el agua de la sima, bajo el centro del
// hábito; mira hacia +z (la fuente) y +x es su izquierda. El suelo del
// círculo queda a STATUE.floor y el borde de la sima a STATUE.lip por
// delante.
import * as THREE from 'three';
import { Sculpt, tubeGeo, V, perlin } from './colossus/sculpt.js';
import { chainGeo, mulberry, withColor } from './colossus/parts.js';

const DEG = Math.PI / 180;

// las medidas que comparte con la cisterna
export const STATUE = {
  floor: 5.3, // el suelo del círculo, sobre el agua de la sima
  lip: 3.7, // el borde de la sima (z), por delante
  head: [0, 11.78, 1.88], // el cuello de la cabeza (lo que gira)
  height: 13.9,
};

const BONES = [
  { name: 'root', pos: [0, 0, 0] },
  { name: 'neck', parent: 'root', pos: [0, 10.9, 0.8] },
  { name: 'head', parent: 'neck', pos: STATUE.head },
];

// matices (por el color de la piedra; la textura y la luz, aparte): gris
// frío, lo de hueso algo más claro
const ROBE = [0.5, 0.51, 0.53],
  MANT = [0.44, 0.45, 0.47],
  BODY = [0.62, 0.62, 0.62],
  BONE = [0.76, 0.74, 0.7],
  HORN = [0.62, 0.58, 0.52],
  DEEP = [0.16, 0.14, 0.14];

// ------------------------------------------------------------ utilidades
const v3 = (a) => (a.isVector3 ? a : V(a[0], a[1], a[2]));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// rotación (grados, XYZ) que lleva el eje y a la dirección d
function yTo(d) {
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), v3(d).clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  return [e.x / DEG, e.y / DEG, e.z / DEG];
}
const mir = (fn) => {
  fn(1);
  fn(-1);
};

// ------------------------------------------------------------ telas
// Un pliegue de canto vivo: el lomo afilado y el valle hondo a sus lados
// (t: ángulo; y: altura). F: { t0, w, d, tw, ys } (ys: de dónde baja). Para
// que no tarde, los pliegues se reparten por el ángulo (F.bins).
const TAU = Math.PI * 2;
const NB = 24;
function foldSum(F, t, y) {
  let s = 0;
  const L = F.bins[((Math.floor(((t + Math.PI) / TAU) * NB) % NB) + NB) % NB];
  for (let i = 0; i < L.length; i++) {
    const P = L[i];
    if (y > P.ys) continue;
    const u = (P.ys - y) / P.ys;
    let dt = t - P.t0 - P.tw * u;
    dt -= TAU * Math.round(dt / TAU);
    const w = P.w * (0.45 + 0.55 * u);
    const dd = (dt < 0 ? -dt : dt) / w;
    if (dd >= 1) continue;
    const e = P.ys - y;
    s += P.d * (e >= 0.7 ? 1 : sstep(0, 0.7, e)) * Math.pow(1 - dd, 1.6);
  }
  return s;
}
function makeFolds(rnd, n, o) {
  const F = Array.from({ length: n }, (_, i) => ({
    t0: (o.t0 ?? -Math.PI) + ((o.t1 ?? Math.PI) - (o.t0 ?? -Math.PI)) * ((i + 0.5 + (rnd() - 0.5) * 0.6) / n),
    w: lerp(o.w[0], o.w[1], rnd()),
    d: lerp(o.d[0], o.d[1], rnd()),
    tw: (rnd() - 0.5) * (o.tw ?? 0.4),
    ys: lerp(o.ys[0], o.ys[1], rnd()),
  }));
  F.bins = Array.from({ length: NB }, () => []);
  for (const P of F) {
    const m = P.w + Math.abs(P.tw) + TAU / NB;
    for (let b = 0; b < NB; b++) {
      const c = -Math.PI + ((b + 0.5) / NB) * TAU;
      let dt = c - P.t0;
      dt -= TAU * Math.round(dt / TAU);
      if (Math.abs(dt) <= m) F.bins[b].push(P);
    }
  }
  return F;
}

// el hábito: un óvalo que se abre hacia el agua, con sus pliegues
const robeRx = (y) => lerp(3.2, 1.86, Math.pow(sstep(-0.5, 6.9, y), 0.85));
const robeRz = (y) => robeRx(y) * 0.76;
function robeField(F) {
  return (x, y, z) => {
    const rx = robeRx(y),
      rz = robeRz(y);
    const lx = x / rx,
      lz = (z - 0.05) / rz;
    const rho = Math.sqrt(lx * lx + lz * lz);
    const t = Math.atan2(lx, lz);
    const amp = 0.06 + 0.12 * Math.pow(Math.max(0, 1 - y / 6.6), 1.2);
    const f = amp * (foldSum(F, t, y) - 0.36);
    const d = (rho - 1 - f) * rz * 0.95;
    return Math.max(d, y - 7.0, -0.9 - y);
  };
}

// el manto: una cáscara gruesa que cuelga de los hombros, abierta por
// delante, con la joroba debajo
const mantRx = (y) => (y > 8 ? lerp(3.42, 3.72, sstep(8, 10.7, y)) : lerp(4.35, 3.42, sstep(0.0, 8, y)));
const mantRz = (y, t) => lerp(2.5, 2.3, sstep(0.6, 10.7, y)) + 0.36 * Math.exp(-(((y - 10.1) / 1.25) ** 2)) * Math.max(0, -Math.cos(t));
const mantOpen = (y) => (y > 8.2 ? lerp(0.56, 0.42, sstep(8.2, 10.7, y)) : lerp(0.98, 0.56, sstep(0.6, 8.2, y))) + 0.07 * Math.sin(y * 1.9 + 0.4) * sstep(9, 3, y);
// el bajo, ondulado (más largo por detrás)
const mantHem = (t) => 0.75 + 0.35 * Math.sin(t * 3.2 + 0.7) + 0.2 * Math.sin(t * 7.1) - 0.4 * Math.max(0, -Math.cos(t));
const mantTop = (t) => lerp(10.65, 11.2, Math.max(0, -Math.cos(t)));
function mantleField(F) {
  return (x, y, z) => {
    const lxr = x / mantRx(y);
    const tz = Math.atan2(lxr, (z + 0.2) / 2.4);
    const rx = mantRx(y),
      rz = mantRz(y, tz);
    const lx = x / rx,
      lz = (z + 0.2) / rz;
    const rho = Math.sqrt(lx * lx + lz * lz);
    const t = Math.atan2(lx, lz);
    const amp = 0.05 + 0.13 * Math.pow(Math.max(0, 1 - y / 10.6), 1.1);
    const f = amp * (foldSum(F, t, y) - 0.3);
    const open = (mantOpen(y) - Math.abs(t)) * rz;
    // (el dobladillo de los bordes de delante, más grueso y vuelto)
    const hem = Math.exp(-((open / 0.32) ** 2));
    const shell = Math.abs(rho - 1 - f - 0.05 * hem) * rz - 0.22 - 0.2 * hem;
    return Math.max(shell, open, y - mantTop(t), mantHem(t) - y);
  };
}
// un punto del borde del manto (lado s) a la altura y
function mantEdge(s, y) {
  const t = s * mantOpen(y);
  const rx = mantRx(y),
    rz = mantRz(y, t);
  return V(Math.sin(t) * rx, y, Math.cos(t) * rz - 0.2);
}

// ------------------------------------------------------------ la cabeza
// En su espacio: el centro del cráneo en el origen, la cara hacia +z; se
// vence hacia delante HEAD_TILT grados y se pone en HEAD_C.
const HEAD_TILT = 30;
const HEAD_C = V(0, 12.5, 2.28);
const HQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(HEAD_TILT * DEG, 0, 0));
const H = (x, y, z) => V(x, y, z).applyQuaternion(HQ).add(HEAD_C);
const HROT = (r = [0, 0, 0]) => {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0] * DEG, r[1] * DEG, r[2] * DEG));
  const e = new THREE.Euler().setFromQuaternion(HQ.clone().multiply(q), 'XYZ');
  return [e.x / DEG, e.y / DEG, e.z / DEG];
};
// el ojo (en el espacio de la cabeza): la cuenca, una almendra de pie, y lo
// de dentro
export const EYE = { c: [0, 0.04, 0.5], r: 0.3, half: 0.19, tall: 0.47, front: 0.8 };
const eyeHalf = (y) => {
  const R = (EYE.half * EYE.half + EYE.tall * EYE.tall) / (2 * EYE.half);
  const dy = y - EYE.c[1];
  return Math.max(0, Math.sqrt(Math.max(0, R * R - dy * dy)) - (R - EYE.half));
};

// (lo alto de la cara, en el espacio de la cabeza, donde no está la cuenca:
// el elipsoide de la cara y el ceño)
function faceZ(x, y) {
  const a = 1 - (x / 0.39) ** 2 - ((y + 0.18) / 0.8) ** 2;
  return a > 0 ? 0.3 + 0.46 * Math.sqrt(a) : 0.3;
}

function sculptHead() {
  const sc = new Sculpt({
    cell: 0.045,
    bones: { root: 0, neck: 1, head: 2 },
    noise: { amp: 0.014, freq: 3.4, oct: 3, lump: 0.03, lumpFreq: 1.4, vein: -0.016, veinFreq: 1.7 },
    aoDist: 0.32,
    aoStrength: 1.15,
    macro: [
      { freq: 1.1, color: [0.32, 0.32, 0.33], amt: 0.4, thr: 0.48 },
      { freq: 2.3, color: [0.7, 0.69, 0.64], amt: 0.25, thr: 0.62 },
    ],
  });
  const o = (tint, k = 0.08, extra = {}) => ({ bone: 'head', mat: 'idolRock', tint, k, ...extra });
  const E = (c, r, op) => sc.ell(H(...c).toArray(), r, { ...op, rot: HROT(op.rot) });
  const B = (c, s, op) => sc.box(H(...c).toArray(), s, { ...op, rot: HROT(op.rot) });
  const R = (a, b, ra, rb, op) => sc.rc(H(...a).toArray(), H(...b).toArray(), ra, rb, op);
  // el cráneo y el occipucio
  E([0, 0.26, -0.18], [0.55, 0.64, 0.74], o(BONE, 0.1));
  E([0, 0.12, -0.74], [0.45, 0.5, 0.42], o(BONE, 0.12));
  // la cara: larga, con sus planos de talla
  E([0, -0.18, 0.3], [0.39, 0.8, 0.46], o(BONE, 0.1));
  // el ceño: dos aristas que bajan hacia la costura (en V), y los pómulos,
  // altos y secos, en arista
  mir((s) => R([0.46 * s, 0.52, 0.42], [0.07 * s, 0.37, 0.66], 0.075, 0.095, o(BONE, 0.05)));
  mir((s) => R([0.4 * s, -0.02, 0.4], [0.17 * s, -0.17, 0.6], 0.07, 0.06, o(BONE, 0.05)));
  // la cresta del cráneo, de la frente a la nuca
  sc.tube([H(0, 0.6, 0.42), H(0, 0.88, -0.1), H(0, 0.84, -0.6), H(0, 0.52, -1.05)].map((p) => p.toArray()), [0.07, 0.1, 0.09, 0.06], o(BONE, 0.06));
  // la quijada, larga, que se estrecha hasta el mentón, en punta
  E([0, -0.7, 0.4], [0.26, 0.25, 0.32], o(BONE, 0.08));
  E([0, -0.98, 0.55], [0.11, 0.1, 0.1], o(BONE, 0.05));
  // el cuello, de abajo (se mete en el del cuerpo), y los tendones
  R([0, -0.55, -0.4], [0, -1.6, -0.95], 0.45, 0.55, { ...o(BODY, 0.18), bone: 'neck' });
  mir((s) => R([0.3 * s, -0.5, -0.08], [0.22 * s, -1.5, -0.42], 0.11, 0.12, { ...o(BODY, 0.06), bone: 'neck' }));
  // ------------------------------------------------ lo que se le resta
  mir((s) => E([0.58 * s, 0.14, 0.24], [0.14, 0.28, 0.3], { sub: true, k: 0.08 }));
  mir((s) => E([0.33 * s, -0.42, 0.52], [0.12, 0.15, 0.16], { sub: true, k: 0.07 }));
  // la boca: una raya cerrada, sin labios
  B([0, -0.66, 0.72], [0.15, 0.012, 0.07], { sub: true, k: 0.02 });
  // la cuenca del ojo: una almendra de pie, con punta arriba y abajo (lo
  // que queda entre dos esferas que se cortan), honda
  {
    const R = (EYE.half * EYE.half + EYE.tall * EYE.tall) / (2 * EYE.half);
    const off = R - EYE.half;
    const qi = HQ.clone().invert();
    const tmp = V(0, 0, 0);
    const fn = (x, y, z) => {
      const h = tmp.set(x, y, z).sub(HEAD_C).applyQuaternion(qi);
      const dy = h.y - EYE.c[1];
      const a = Math.hypot(h.x - off, dy) - R,
        b = Math.hypot(h.x + off, dy) - R;
      return Math.max(a, b, 0.42 - h.z);
    };
    const c = H(0, EYE.c[1], 0.7);
    sc.custom(fn, [c.x - 0.5, c.y - 0.7, c.z - 0.6, c.x + 0.5, c.y + 0.7, c.z + 0.6], { sub: true, k: 0.03 });
  }
  // grietas y desconchones
  R([0.1, 0.62, 0.6], [0.34, 0.3, 0.6], 0.025, 0.018, { sub: true, k: 0.015 });
  R([-0.3, -0.25, 0.6], [-0.2, -0.64, 0.6], 0.02, 0.016, { sub: true, k: 0.015 });
  E([0.36, 0.36, 0.5], [0.08, 0.06, 0.05], { sub: true, k: 0.02 });
  // las lágrimas: dos regueros oscuros de la costura a la barbilla
  for (const [x, y0, y1] of [
    [0.03, -0.42, -0.95],
    [-0.05, -0.42, -0.7],
  ]) {
    for (let y = y0; y > y1; y -= 0.05) sc.paint(H(x, y, 0.82).toArray(), [0.035, 0.05, 0.12], { tint: [0.22, 0.05, 0.04], k: 0.85, edge: 0.3 });
  }
  return sc;
}

// los cuernos, la corona de espinas y la diadema (piezas duras, con la
// cabeza)
function headParts(rig, rnd) {
  // un cuerno: de la sien hacia atrás, afuera y arriba, retorciéndose;
  // anillado; el derecho, roto
  const horn = (s, broken) => {
    const pts = [
      [0.4 * s, 0.42, 0.04],
      [0.92 * s, 0.72, -0.12],
      [1.38 * s, 1.18, -0.42],
      [1.6 * s, 1.85, -0.82],
      [1.5 * s, 2.45, -1.25],
      [1.22 * s, 2.86, -1.52],
    ];
    const n = broken ? 4 : pts.length;
    const P = pts.slice(0, n).map((p) => H(...p));
    const radii = [];
    const K = 30;
    for (let i = 0; i <= K; i++) {
      const t = i / K;
      const ring = 1 + 0.13 * Math.max(0, Math.sin(t * 52));
      radii.push((broken ? lerp(0.34, 0.19, t) : lerp(0.34, 0.014, Math.pow(t, 0.8))) * ring);
    }
    rig('head', 'idolRock', shade(tubeGeo(P, radii, { radial: 10, segs: 54, cap: true, wobble: 0.05, seed: s * 3 }), HORN, 0.8));
    // el cuerno roto: el canto del roto, astillado
    if (broken) {
      const end = P[n - 1],
        d = P[n - 1].clone().sub(P[n - 2]).normalize();
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        const side = V(Math.cos(a), Math.sin(a), 0).cross(d).normalize();
        const b = end.clone().addScaledVector(side, 0.1);
        const tip = b.clone().addScaledVector(d, 0.1 + rnd() * 0.12);
        const g = new THREE.ConeGeometry(0.06, tip.distanceTo(b), 4).toNonIndexed();
        g.translate(0, tip.distanceTo(b) / 2, 0);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), tip.clone().sub(b).normalize()));
        g.translate(b.x, b.y, b.z);
        rig('head', 'idolRock', shade(withColor(g, 1), HORN, 0.75));
      }
    }
  };
  horn(1, false);
  horn(-1, true);
  // la corona de espinas: de un aro de hueso detrás del cráneo, en abanico,
  // desiguales y retorcidas; tres, rotas
  {
    const P = [];
    for (let i = 0; i <= 24; i++) {
      const a = -1.95 + (i / 24) * 3.9;
      P.push(H(Math.sin(a) * 0.5, 0.3 + Math.cos(a) * 0.5, -0.66 - 0.05 * Math.cos(a)));
    }
    rig('head', 'idolRock', shade(tubeGeo(P, [0.1, 0.12, 0.1], { radial: 6, segs: 40, cap: true, wobble: 0.15, seed: 9 }), BONE, 0.7));
  }
  const N = 9;
  for (let i = 0; i < N; i++) {
    const a = -98 + (i / (N - 1)) * 196 + (rnd() - 0.5) * 10;
    const ar = a * DEG;
    const broken = i === 1 || i === 5 || i === 8;
    const L = broken ? 0.55 + rnd() * 0.4 : 1.25 + rnd() * 0.9 + (i % 2 ? 0 : 0.55);
    const base = [Math.sin(ar) * 0.5, 0.3 + Math.cos(ar) * 0.5, -0.68];
    const dir = V(Math.sin(ar), Math.cos(ar) * 0.95 + 0.15, -0.42 - rnd() * 0.3).normalize();
    const bend = V((rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.3, -0.2);
    const P = [0, 0.3, 0.62, 1].map((u) => H(base[0] + dir.x * L * u + bend.x * u * u, base[1] + dir.y * L * u + bend.y * u * u, base[2] + dir.z * L * u + bend.z * u * u));
    const r0 = 0.11 + rnd() * 0.04;
    rig('head', 'idolRock', shade(tubeGeo(P, [r0, r0 * 0.78, r0 * (broken ? 0.68 : 0.42), broken ? r0 * 0.6 : 0.008], { radial: 7, segs: 14, cap: true, wobble: 0.06, seed: i }), BONE, 0.72));
    if (!broken) {
      const tip = P[3],
        d = P[3].clone().sub(P[2]).normalize();
      const gt = new THREE.ConeGeometry(0.04, 0.26, 5).toNonIndexed();
      gt.translate(0, 0.13, 0);
      gt.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d));
      gt.translate(tip.x - d.x * 0.05, tip.y - d.y * 0.05, tip.z - d.z * 0.05);
      rig('head', 'idolGold', withColor(gt, 0.95));
    }
  }
  // la diadema: un aro de oro hundido en la frente, que rodea el cráneo,
  // con sus púas por delante (dos, partidas)
  {
    const P = [];
    const K = 32;
    for (let i = 0; i <= K; i++) {
      const a = (i / K) * Math.PI * 2;
      const y = 0.43 + 0.04 * Math.cos(a) - 0.05 * Math.max(0, -Math.cos(a));
      P.push(H(Math.sin(a) * 0.585, y, -0.2 + Math.cos(a) * 0.78));
    }
    rig('head', 'idolGold', withColor(tubeGeo(P, [0.05, 0.05], { radial: 5, segs: 64, cap: false }), 0.9));
    for (let i = -3; i <= 3; i++) {
      const a = i * 0.25;
      const base = H(Math.sin(a) * 0.6, 0.46, -0.2 + Math.cos(a) * 0.8);
      const up = H(Math.sin(a) * 0.68, 0.46 + (Math.abs(i) === 2 ? 0.1 : 0.32 - Math.abs(i) * 0.05), -0.2 + Math.cos(a) * 0.9).sub(base);
      const L = up.length();
      const g = new THREE.ConeGeometry(0.04, L, 4).toNonIndexed();
      g.translate(0, L / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), up.normalize()));
      g.translate(base.x, base.y, base.z);
      rig('head', 'idolGold', withColor(g, 0.9));
    }
  }
}
// tiñe una pieza (por el color que traiga: su oclusión)
function shade(g, tint, k = 0.85) {
  const n = g.attributes.position.count;
  const C = g.attributes.color ? g.attributes.color.array : new Float32Array(n * 3).fill(1);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) out[i * 3 + c] = C[i * 3 + c] * tint[c] * k;
  g.setAttribute('color', new THREE.BufferAttribute(out, 3));
  return g;
}

// ------------------------------------------------------------ el cuerpo
// los brazos (en el espacio del modelo)
const ARM = {
  R: { sh: V(-2.95, 10.45, 0.2), el: V(-4.3, 11.1, 1.95), wr: V(-4.0, 14.05, 2.7) },
  L: { sh: V(2.95, 10.45, 0.2), el: V(4.45, 8.5, 1.3), wr: V(4.08, 6.08, 3.24) },
};

function sculptBody(rnd) {
  const sc = new Sculpt({
    cell: 0.12,
    bones: { root: 0, neck: 1, head: 2 },
    noise: { amp: 0.032, freq: 1.6, oct: 3, lump: 0.075, lumpFreq: 0.48, vein: -0.028, veinFreq: 0.52 },
    aoDist: 1.1,
    aoStrength: 1.2,
    weightSmooth: 3,
    weightSmoothK: 0.6,
    macro: [
      { freq: 0.32, color: [0.26, 0.26, 0.28], amt: 0.5, thr: 0.42 },
      { freq: 0.85, color: [0.62, 0.62, 0.58], amt: 0.28, thr: 0.62 },
    ],
  });
  const o = (tint, k, extra = {}) => ({ bone: 'root', mat: 'idolRock', tint, k, ...extra });

  // ------------------------------------------------ el hábito
  const RF = makeFolds(rnd, 22, { w: [0.14, 0.3], d: [0.6, 1.05], ys: [3.2, 6.8], tw: 0.5 });
  sc.custom(robeField(RF), [-3.9, -0.9, -3.0, 3.9, 7.1, 3.1], o(ROBE, 0.25));
  // ------------------------------------------------ el manto
  const MF = makeFolds(rnd, 16, { w: [0.12, 0.26], d: [0.6, 1.0], ys: [6.0, 11.0], tw: 0.3 });
  sc.custom(mantleField(MF), [-5.0, 0.0, -3.1, 5.0, 11.4, 3.1], o(MANT, 0.12));
  // ------------------------------------------------ el cuerpo
  // la cintura, el vientre hundido y el costillar
  sc.ell([0, 6.8, 0.1], [1.85, 0.9, 1.35], o(BODY, 0.3));
  sc.ell([0, 7.75, 0.32], [1.6, 1.0, 1.1], o(BODY, 0.3));
  sc.ell([0, 9.15, 0.42], [2.28, 1.72, 1.52], o(BODY, 0.35, { n: 0.6 }));
  // las costillas, de la espina al pecho, y por delante abiertas hacia
  // fuera, como dos puertas
  for (let i = 0; i < 6; i++) {
    const y = 10.2 - i * 0.43;
    const rx = 2.28 + Math.sin((i / 5) * Math.PI) * 0.14,
      rz = 1.55;
    mir((s) => {
      const pts = [];
      for (let a = 0; a <= 4; a++) {
        const th = Math.PI * (0.9 - a * 0.18);
        pts.push([s * Math.sin(th) * rx, y - a * 0.09, Math.cos(th) * rz + 0.45]);
      }
      // y la punta, vuelta hacia fuera
      pts.push([s * (0.86 + i * 0.03), y - 0.45, 2.22]);
      sc.tube(pts, [0.15, 0.16, 0.17, 0.16, 0.13, 0.1], o(BODY, 0.07, { n: 0.4 }));
    });
  }
  // el esternón partido y el hueco del pecho
  mir((s) => sc.rc([0.62 * s, 10.4, 1.9], [0.5 * s, 7.9, 1.75], 0.16, 0.12, o(BONE, 0.06)));
  sc.ell([0, 9.1, 1.95], [0.78, 1.3, 0.92], { sub: true, k: 0.07 });
  sc.paint([0, 9.05, 1.45], [0.75, 1.25, 0.7], { tint: DEEP, k: 0.9, edge: 0.4 });
  // los hombros, altos (encorvado), y la joroba
  mir((s) => {
    sc.ell([2.85 * s, 10.45, 0.15], [1.15, 1.02, 1.08], o(BODY, 0.25));
    sc.rc([0.75 * s, 11.25, 0.28], [2.6 * s, 11.0, 0.1], 0.6, 0.62, o(BODY, 0.3));
    sc.rc([0.36 * s, 10.95, 1.42], [2.5 * s, 10.8, 0.82], 0.18, 0.21, o(BONE, 0.1));
  });
  sc.ell([0, 10.65, -0.68], [2.2, 1.55, 1.45], o(BODY, 0.4));
  // el manto por encima de los hombros y de la joroba
  mir((s) => sc.ell([2.7 * s, 10.75, -0.05], [1.45, 0.8, 1.5], o(MANT, 0.3)));
  sc.ell([0, 11.0, -0.95], [2.0, 1.0, 1.4], o(MANT, 0.35));
  // ------------------------------------------------ el cuello
  sc.rc([0, 10.75, 0.62], [0, 11.78, 1.88], 0.86, 0.64, o(BODY, 0.25, { bone: 'neck' }));
  mir((s) => sc.rc([0.45 * s, 11.7, 1.95], [0.4 * s, 10.8, 1.45], 0.16, 0.18, o(BODY, 0.06, { bone: 'neck' })));
  sc.ell([0, 11.2, 1.72], [0.22, 0.26, 0.18], o(BODY, 0.06, { bone: 'neck' }));
  for (let i = 0; i < 3; i++) sc.ell([0, 11.35 + i * 0.3, 0.12 + i * 0.4], [0.24, 0.2, 0.24], o(BODY, 0.1, { bone: 'neck', n: 0.5 }));
  // ------------------------------------------------ los brazos
  // descarnados: el hueso largo, los músculos secos, los tendones
  for (const side of ['R', 'L']) {
    const A = ARM[side];
    const up = A.el.clone().sub(A.sh),
      fo = A.wr.clone().sub(A.el);
    // el deltoides, el hueso y lo que queda de músculo
    sc.ell(A.sh.clone().add(V(0, 0.18, 0)).toArray(), [0.88, 0.78, 0.84], o(BODY, 0.15));
    sc.rc(A.sh.toArray(), A.el.toArray(), 0.5, 0.36, o(BODY, 0.15));
    sc.ell(A.sh.clone().addScaledVector(up, 0.46).add(V(0, 0, 0.14)).toArray(), [0.5, up.length() * 0.3, 0.44], o(BODY, 0.12, { rot: yTo(up) }));
    sc.ell(A.sh.clone().addScaledVector(up, 0.52).add(V(0, 0, -0.16)).toArray(), [0.44, up.length() * 0.28, 0.4], o(BODY, 0.12, { rot: yTo(up) }));
    // el codo, de hueso, con su nudo por detrás
    sc.ell(A.el.toArray(), [0.44, 0.42, 0.44], o(BONE, 0.08));
    sc.ell(A.el.clone().addScaledVector(up.clone().normalize(), 0.2).addScaledVector(fo.clone().normalize(), -0.24).toArray(), [0.26, 0.26, 0.26], o(BONE, 0.05));
    // los nudos de la muñeca
    for (const k of [-1, 1]) sc.ell(A.wr.clone().addScaledVector(fo.clone().normalize(), -0.26).add(V(0.15 * k, 0, 0)).toArray(), [0.17, 0.15, 0.17], o(BONE, 0.04));
    // lo que queda de músculo en el antebrazo
    sc.ell(A.el.clone().lerp(A.wr, 0.3).toArray(), [0.42, fo.length() * 0.3, 0.38], o(BODY, 0.12, { rot: yTo(fo) }));
    // los dos huesos del antebrazo y los tendones
    const side2 = V(0, 0, 1).cross(fo).normalize();
    if (side2.lengthSq() < 0.1) side2.set(1, 0, 0);
    // (se cruzan: el radio va de fuera a dentro)
    for (const k of [-1, 1]) sc.rc(A.el.clone().addScaledVector(side2, 0.17 * k).toArray(), A.wr.clone().addScaledVector(side2, -0.08 * k).add(V(0, 0, 0.06 * k)).toArray(), 0.23, 0.16, o(BODY, 0.06));
    for (const k of [-1, 1]) sc.rc(A.el.clone().addScaledVector(side2, 0.32 * k).add(V(0, 0, 0.1)).toArray(), A.wr.clone().addScaledVector(side2, 0.18 * k).toArray(), 0.09, 0.06, o(BODY, 0.04, { n: 0.4 }));
  }
  // el muñón: el corte de Martín, limpio
  {
    const A = ARM.R;
    const d = A.wr.clone().sub(A.el).normalize();
    sc.box(A.wr.clone().addScaledVector(d, 0.42).toArray(), [0.8, 0.45, 0.8], { sub: true, k: 0.02, rot: yTo(d), round: 0.02 });
  }
  return sc;
}

// la mano izquierda, agarrada al borde de la sima: la palma sobre el canto
// y los cuatro dedos por el suelo, con las garras clavadas
function sculptHand() {
  const sc = new Sculpt({
    cell: 0.05,
    bones: { root: 0, neck: 1, head: 2 },
    noise: { amp: 0.012, freq: 3.0, oct: 3, lump: 0.03, lumpFreq: 1.1, vein: -0.012, veinFreq: 1.5 },
    aoDist: 0.4,
    aoStrength: 1.2,
    macro: [{ freq: 0.9, color: [0.3, 0.3, 0.31], amt: 0.4, thr: 0.45 }],
  });
  const o = (k, extra = {}) => ({ bone: 'root', mat: 'idolRock', tint: BODY, k, ...extra });
  const A = ARM.L;
  const F = STATUE.floor,
    L = STATUE.lip;
  // el final del antebrazo y la muñeca
  sc.rc(A.wr.clone().lerp(A.el, 0.35).toArray(), A.wr.toArray(), 0.4, 0.32, o(0.1));
  // la palma: del canto hacia delante, plana, apoyada
  const palm0 = V(A.wr.x - 0.02, F + 0.5, L - 0.4),
    palm1 = V(A.wr.x - 0.1, F + 0.26, L + 0.5);
  sc.rc(A.wr.toArray(), palm0.toArray(), 0.3, 0.34, o(0.1));
  sc.ell(palm0.clone().lerp(palm1, 0.5).toArray(), [0.52, 0.2, 0.6], o(0.1, { rot: [8, 4, 0] }));
  // los nudillos y los dedos: tres delante, abiertos en abanico, y el pulgar
  const fingers = [
    { x: 0.4, a: -14, len: 1.85, r: 0.125 },
    { x: 0.05, a: -2, len: 2.05, r: 0.13 },
    { x: -0.32, a: 11, len: 1.8, r: 0.12 },
  ];
  const tips = [];
  for (const f of fingers) {
    const k0 = V(palm1.x + f.x, F + 0.22, palm1.z + 0.12);
    const dir = V(Math.sin(f.a * DEG), 0, Math.cos(f.a * DEG));
    // tres falanges: se alza en el nudillo y baja hasta clavarse
    const p1 = k0.clone().addScaledVector(dir, f.len * 0.38).setY(F + 0.36);
    const p2 = p1.clone().addScaledVector(dir, f.len * 0.33).setY(F + 0.22);
    const p3 = p2.clone().addScaledVector(dir, f.len * 0.25).setY(F + 0.06);
    sc.tube([k0.toArray(), p1.toArray(), p2.toArray(), p3.toArray()], [f.r * 1.15, f.r, f.r * 0.85, f.r * 0.7], o(0.03));
    for (const p of [k0, p1, p2]) sc.ell(p.toArray(), [f.r * 1.3, f.r * 1.2, f.r * 1.3], o(0.02, { tint: BONE }));
    tips.push({ p: p3, dir });
  }
  // el pulgar, por fuera, agarrado al canto
  {
    const b = V(palm0.x - 0.52, F + 0.3, L - 0.1);
    const p1 = V(palm0.x - 0.76, F + 0.1, L + 0.14),
      p2 = V(palm0.x - 0.8, F - 0.24, L + 0.07);
    sc.tube([b.toArray(), p1.toArray(), p2.toArray()], [0.15, 0.125, 0.1], o(0.03));
    tips.push({ p: p2, dir: V(-0.1, -1, 0).normalize(), thumb: true });
  }
  return { sc, tips };
}

// ------------------------------------------------------------ lo de encima
// Lo que deja el agua: chorreones oscuros que bajan (el mismo ruido en toda
// una vertical) y, abajo, lo mojado.
function weather(geo) {
  const P = geo.attributes.position.array,
    C = geo.attributes.color.array;
  for (let i = 0; i < P.length / 3; i++) {
    const x = P[i * 3],
      y = P[i * 3 + 1],
      z = P[i * 3 + 2];
    const s = perlin(x * 1.7 + 3.1, 0.5, z * 1.7 - 1.3) + 0.35 * perlin(x * 5.3, 1.5, z * 5.3);
    let k = 1;
    if (s > 0.18) k *= 1 - Math.min(0.5, (s - 0.18) * 1.6) * (0.5 + 0.5 * sstep(14, 4, y));
    // abajo, en la sima, más oscura (mojada)
    k *= lerp(0.62, 1, sstep(0.3, 5.6, y));
    for (let c = 0; c < 3; c++) C[i * 3 + c] *= k;
  }
}
// el ojo y la costura: para cada vértice de la cabeza, cuánto se cierra la
// piedra sobre la cuenca (aLid: lo que se mueve con el ojo cerrado) y lo que
// arde (aGlow: x, la costura; y, la brasa del pecho; z, el muñón; w, el
// borde de la cuenca, que arde con el ojo abierto)
function lidsAndGlow(geo, which) {
  const P = geo.attributes.position.array;
  const n = P.length / 3;
  const lid = new Float32Array(n * 3);
  const glow = new Float32Array(n * 4);
  const qi = HQ.clone().invert();
  const v = V(0, 0, 0);
  for (let i = 0; i < n; i++) {
    v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    if (which === 'head') {
      // al espacio de la cabeza
      const h = v.clone().sub(HEAD_C).applyQuaternion(qi);
      const dy = (h.y - EYE.c[1]) / (EYE.tall + 0.1);
      if (Math.abs(dy) < 1 && h.z > 0.35) {
        const half = eyeHalf(h.y);
        const ax = Math.abs(h.x);
        const inside = ax <= half + 0.03;
        // el borde de la cuenca, en carne viva (se ve con el ojo abierto)
        glow[i * 4 + 3] = Math.exp(-(((ax - half) / 0.035) ** 2)) * (1 - sstep(0.6, 0.95, Math.abs(dy)));
        // dentro de la cuenca y en su borde: se cierra del todo; fuera, se
        // estira un poco
        const w = inside ? 1 : Math.max(0, 1 - (ax - half - 0.03) / 0.16);
        const wy = 1 - sstep(0.78, 1, Math.abs(dy));
        const k = w * wy;
        if (k > 0) {
          // Cerrado, lo de la cuenca vuelve a la cara: se aprieta hacia la
          // raya del medio y sale hasta donde estaría la piedra, con un surco
          // en la raya (la costura); los de fuera sólo se estiran un poco
          let off;
          if (inside) {
            const x2 = h.x * 0.1;
            const z2 = faceZ(x2, h.y) - 0.045 * Math.exp(-((x2 / 0.022) ** 2));
            off = V(x2 - h.x, 0, (z2 - h.z) * wy);
            // la costura: lo que queda en el fondo del surco
            glow[i * 4] = Math.exp(-((x2 / 0.012) ** 2)) * wy;
          } else off = V(-Math.sign(h.x) * (half + 0.03) * 0.3 * k, 0, 0);
          off.applyQuaternion(HQ);
          lid[i * 3] = off.x;
          lid[i * 3 + 1] = off.y;
          lid[i * 3 + 2] = off.z;
        }
      }
    } else if (which === 'body') {
      // la brasa: el fondo del hueco del pecho
      const d = Math.hypot(v.x / 0.7, (v.y - 9.05) / 1.1, (v.z - 1.1) / 0.5);
      if (d < 1 && v.z < 1.75) glow[i * 4 + 1] = Math.pow(1 - d, 1.4);
      // el muñón: la cara del corte
      const A = ARM.R;
      const dd = A.wr.clone().sub(A.el).normalize();
      const rel = v.clone().sub(A.wr);
      const along = rel.dot(dd);
      const across = rel.clone().addScaledVector(dd, -along).length();
      if (Math.abs(along) < 0.08 && across < 0.38) glow[i * 4 + 2] = 1 - across / 0.38;
    }
  }
  geo.setAttribute('aLid', new THREE.BufferAttribute(lid, 3));
  geo.setAttribute('aGlow', new THREE.BufferAttribute(glow, 4));
  return geo;
}

// un punto de la superficie del hábito (por su campo): de fuera hacia el eje
function onSurface(sc, t, y) {
  const rx = robeRx(y) * 1.5,
    rz = robeRz(y) * 1.5;
  const at = (k) => sc.field(Math.sin(t) * rx * k, y, 0.05 + Math.cos(t) * rz * k);
  let lo = 0.1,
    hi = 1;
  if (at(hi) < 0) return null;
  for (let i = 0; i < 24; i++) {
    const m = (lo + hi) / 2;
    if (at(m) < 0) lo = m;
    else hi = m;
  }
  return V(Math.sin(t) * rx * hi, y, 0.05 + Math.cos(t) * rz * hi);
}

// el ojo, con la cabeza en reposo (en el espacio del modelo)
export function eyeRest() {
  return H(...EYE.c).toArray();
}

// los cabos de las cadenas de delante del zuncho de arriba, en el suelo del
// círculo (para sus argollas: ver world/sanctum.js), en el espacio del modelo
export function chainFloorAnchors() {
  return [-0.95, 0.95].map((t) => [Math.sin(t) * 6.6, STATUE.floor + 0.06, STATUE.lip + 0.65]);
}

// ------------------------------------------------------------ todo
export function statueData(o = {}) {
  const t0 = performance.now();
  const rnd = mulberry(o.seed ?? 1667);
  const H_ = [];
  const rig = (bone, mat, geo, extra = {}) => H_.push({ bone, mat, geo, ...extra });

  const body = sculptBody(rnd);
  const bodyGeo = body.build();
  weather(bodyGeo);
  lidsAndGlow(bodyGeo, 'body');
  const head = sculptHead();
  const headGeo = head.build();
  weather(headGeo);
  lidsAndGlow(headGeo, 'head');
  const hand = sculptHand();
  const handGeo = hand.sc.build();
  weather(handGeo);
  lidsAndGlow(handGeo, 'hand');
  headParts(rig, rnd);

  // las garras: de hueso negro, curvas, clavadas en el suelo
  for (const tp of hand.tips) {
    const D = tp.thumb ? V(0, -1, 0.2).normalize() : tp.dir.clone().setY(-0.75).normalize();
    const pts = [];
    for (let i = 0; i <= 4; i++) {
      const u = i / 4;
      pts.push(tp.p.clone().addScaledVector(D, 0.5 * u).add(V(0, -0.14 * u * u, 0)));
    }
    rig('root', 'idolRock', shade(tubeGeo(pts, [0.1, 0.085, 0.06, 0.034, 0.006], { radial: 6, segs: 8, cap: true }), [0.16, 0.15, 0.15], 1));
  }
  // el muñón: el aro de oro (la luz del corte, en el montaje)
  const A = ARM.R;
  const dR = A.wr.clone().sub(A.el).normalize();
  {
    const ring = [];
    const u = V(1, 0, 0).cross(dR).normalize(),
      w = dR.clone().cross(u).normalize();
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      ring.push(A.wr.clone().addScaledVector(dR, -0.14).addScaledVector(u, Math.cos(a) * 0.38).addScaledVector(w, Math.sin(a) * 0.38));
    }
    rig('root', 'idolGold', withColor(tubeGeo(ring, [0.06, 0.06], { radial: 5, segs: 40, cap: false }), 0.9));
  }
  // los zunchos de Martín: aros de hierro podrido ceñidos al hábito; el de
  // arriba, reventado por delante. Y las cadenas, de los zunchos al borde de
  // la sima (las de arriba) y a sus paredes (las de abajo)
  const anchors = [];
  for (const [y, broken] of [
    [6.0, true],
    [3.1, false],
  ]) {
    const K = 56;
    let seg = [];
    const segs = [];
    for (let i = 0; i <= K; i++) {
      const t = (i / K) * Math.PI * 2 - Math.PI;
      const gap = broken && Math.abs(wrap(t - 0.35)) < 0.3;
      const p = gap ? null : onSurface(body, t, y);
      if (!p) {
        if (seg.length > 1) segs.push(seg);
        seg = [];
        continue;
      }
      seg.push(p.clone().sub(V(0, 0, 0.05)).multiply(V(1.02, 1, 1.02)).add(V(0, 0, 0.05)));
    }
    if (seg.length > 1) segs.push(seg);
    for (const s of segs) rig('root', 'plateRust', withColor(tubeGeo(s, [0.1, 0.1], { radial: 5, segs: s.length * 2, cap: true }), 0.85));
    const go = broken ? [-0.95, 0.95, -2.25, 2.25] : [-1.3, 1.3, -2.6, 2.6];
    for (const t of go) {
      const p = onSurface(body, t, y);
      if (!p) continue;
      p.add(V(Math.sin(t) * 0.06, 0, Math.cos(t) * 0.06));
      let q;
      if (broken) q = Math.abs(t) < 2 ? V(Math.sin(t) * 6.6, STATUE.floor + 0.06, STATUE.lip + 0.65) : V(Math.sign(t) * 6.35, STATUE.floor + 2.4, -0.9);
      else q = Math.abs(t) < 2 ? V(Math.sign(t) * 6.35, y + 1.4, 2.1) : V(Math.sign(t) * 6.35, y + 2.2, -1.3);
      const mid = p.clone().lerp(q, 0.5).add(V(0, -0.4, 0));
      for (const g of chainGeo([p, mid, q], 0.17, 0.045)) rig('root', 'iron', g);
      anchors.push({ p: q.toArray(), floor: broken && Math.abs(t) < 2 });
    }
  }
  // la brasa del pecho (en el montaje: late con la fuente)
  {
    const g = new THREE.IcosahedronGeometry(0.42, 3);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i),
        y = P.getY(i),
        z = P.getZ(i);
      const k = 1 + 0.3 * perlin(x * 4, y * 4, z * 4);
      P.setXYZ(i, x * k * 0.9, y * k * 1.35, z * k * 0.7);
    }
    g.computeVertexNormals();
    // (el color: la costra oscura y, por las grietas, la brasa; el montaje
    // lo enciende)
    const C = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      const n = Math.abs(perlin(P.getX(i) * 6.5, P.getY(i) * 6.5, P.getZ(i) * 6.5));
      const crack = Math.max(0, 1 - n / 0.16);
      C[i * 3] = 0.16 + 0.84 * crack;
      C[i * 3 + 1] = 0.03 + 0.5 * crack * crack;
      C[i * 3 + 2] = 0.02 + 0.16 * crack * crack * crack;
    }
    g.setAttribute('color', new THREE.BufferAttribute(C, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(P.count * 2), 2));
    g.translate(0, 9.05, 1.05);
    rig('root', 'idolEmber', g, { grp: 'ember' });
  }

  const eyeC = H(...EYE.c);
  const eyeN = V(0, 0, 1).applyQuaternion(HQ);
  const stats = {
    body: body.stats,
    head: head.stats,
    hand: hand.sc.stats,
    ms: Math.round(performance.now() - t0),
  };
  return {
    bones: BONES,
    skinned: [
      { geo: bodyGeo, mats: ['idolRock'], name: 'body' },
      { geo: headGeo, mats: ['idolRock'], name: 'head' },
      { geo: handGeo, mats: ['idolRock'], name: 'hand' },
    ],
    rigid: H_,
    groups: {},
    extra: {
      eye: { c: eyeC.toArray(), n: eyeN.toArray(), r: EYE.r, tilt: HEAD_TILT },
      stump: A.wr.toArray(),
      stumpDir: dR.toArray(),
      ember: [0, 9.05, 1.05],
      anchors,
      // lo que la mano ocupa del suelo (para la colisión): [x0, z0, x1, z1]
      hand: [ARM.L.wr.x - 1.4, STATUE.lip - 0.6, ARM.L.wr.x + 1.2, STATUE.lip + 2.6],
    },
    stats,
  };
}
