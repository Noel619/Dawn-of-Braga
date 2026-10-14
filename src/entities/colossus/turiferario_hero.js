// EL TURIFERARIO: las piezas de héroe (lo que la película enseña de cerca).
//
// Las manos y la cabeza se esculpen aparte, a una celda tres o cuatro veces
// más fina que el cuerpo, cada una con su malla con piel (los mismos huesos):
//   - las manos: nudillos huesudos, tres falanges con sus pliegues, uñas de
//     hueso, tendones y venas en el dorso, la palma con sus montes y sus
//     surcos. Se esculpe la izquierda y la derecha es su espejo. La costura
//     de la muñeca la tapan el manípulo (la izquierda) y la argolla de la
//     cadena (la derecha), en turiferario_dress.js.
//   - la cabeza: la cara de verdad tras la jaula (ver headSculpt).
//
// Las arrugas y los surcos se tallan sobre la superficie de verdad: se
// prepara el campo con la carne ya puesta, se busca dónde cae la piel a lo
// largo de un rayo y ahí se talla (snapper).
import * as THREE from 'three';
import { Sculpt, hardGeo, V } from './sculpt.js';
import { withColor, shadeBy } from './parts.js';

const DEG = Math.PI / 180;
const _m = new THREE.Matrix4(),
  _e = new THREE.Euler();

// giro (grados, Euler XYZ, como las primitivas del escultor) que lleva el
// eje y a 'y' y el x hacia 'x' (z sale de los dos: la base siempre es un
// giro de verdad, aunque 'x' no sea del todo perpendicular)
const _X = new THREE.Vector3(),
  _Y = new THREE.Vector3(),
  _Z = new THREE.Vector3();
export function euler(x, y) {
  _Y.copy(y).normalize();
  _X.copy(x).addScaledVector(_Y, -x.dot(_Y)).normalize();
  _Z.crossVectors(_X, _Y);
  _m.makeBasis(_X, _Y, _Z);
  _e.setFromRotationMatrix(_m, 'XYZ');
  return [_e.x / DEG, _e.y / DEG, _e.z / DEG];
}

// Busca la piel: marcha de 'from' (fuera) hacia 'to' (dentro) y devuelve el
// primer punto donde el campo cambia de signo (o null).
export function snapper(sc) {
  sc._prepare();
  return (from, to, steps = 60) => {
    let prev = from.clone(),
      dPrev = sc.field(prev.x, prev.y, prev.z);
    for (let i = 1; i <= steps; i++) {
      const q = from.clone().lerp(to, i / steps);
      const d = sc.field(q.x, q.y, q.z);
      if (d < 0) {
        const k = dPrev > 1e6 ? 1 : dPrev / (dPrev - d);
        return prev.lerp(q, k);
      }
      prev = q;
      dPrev = d;
    }
    return null;
  };
}

// Tubo de sección ovalada por una curva: rx de ancho y rz de alto (hacia
// 'ups'), en cada punto. Sin índices, con color de vértice.
export function sweepGeo(pts, ups, rx, rz, seg = 6, o = {}) {
  const P = pts.map((p) => (p.isVector3 ? p : V(...p)));
  const n = P.length;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)],
      b = P[Math.min(n - 1, i + 1)];
    const T = b.clone().sub(a).normalize();
    const up0 = Array.isArray(ups) ? ups[i] : ups;
    const U = (up0.isVector3 ? up0.clone() : V(...up0)).addScaledVector(T, -(up0.isVector3 ? up0 : V(...up0)).dot(T)).normalize();
    const X = T.clone().cross(U).normalize();
    const row = [];
    for (let k = 0; k <= seg; k++) {
      const an = (k / seg) * Math.PI * 2;
      const c = Math.cos(an),
        s = Math.sin(an);
      const p = P[i].clone().addScaledVector(X, c * rx[i]).addScaledVector(U, s * rz[i]);
      const nn = X.clone().multiplyScalar(c / Math.max(1e-4, rx[i])).addScaledVector(U, s / Math.max(1e-4, rz[i])).normalize();
      row.push([p, nn, k / seg, i / (n - 1)]);
    }
    rows.push(row);
  }
  const pos = [],
    nor = [],
    uv = [];
  const put = (q) => {
    pos.push(q[0].x, q[0].y, q[0].z);
    nor.push(q[1].x, q[1].y, q[1].z);
    uv.push(q[2], q[3] * (o.uvk ?? 1));
  };
  for (let i = 0; i < n - 1; i++)
    for (let k = 0; k < seg; k++) {
      const a = rows[i][k],
        b = rows[i][k + 1],
        c = rows[i + 1][k + 1],
        d = rows[i + 1][k];
      for (const q of [a, d, c, a, c, b]) put(q);
    }
  // tapa del principio (la punta suele acabar en radio casi cero)
  if (o.cap !== false) {
    const T = P[1].clone().sub(P[0]).normalize().negate();
    for (let k = 0; k < seg; k++) for (const q of [[P[0], T, 0.5, 0], rows[0][k + 1], rows[0][k]]) put(q);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return withColor(g, 1, o.tint);
}

// Espejo en x de una pieza sin índices (le da la vuelta a los triángulos).
export function mirrorGeoX(g0) {
  const g = g0.clone();
  const P = g.attributes.position,
    N = g.attributes.normal;
  for (let i = 0; i < P.count; i++) {
    P.setX(i, -P.getX(i));
    if (N) N.setX(i, -N.getX(i));
  }
  if (g.index) {
    const I = g.index.array;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t + 1];
      I[t + 1] = I[t + 2];
      I[t + 2] = a;
    }
  } else {
    for (const k in g.attributes) {
      const A = g.attributes[k],
        s = A.itemSize,
        arr = A.array;
      for (let t = 0; t < A.count; t += 3)
        for (let q = 0; q < s; q++) {
          const a = arr[(t + 1) * s + q];
          arr[(t + 1) * s + q] = arr[(t + 2) * s + q];
          arr[(t + 2) * s + q] = a;
        }
    }
  }
  return g;
}
// Espejo de una malla con piel: la izquierda pasa a ser la derecha (los
// huesos ...L, ...Lb, ...Lc por los ...R).
export function mirrorSkinned(g0, BI) {
  const g = mirrorGeoX(g0);
  const names = Object.keys(BI);
  const remap = new Uint16Array(names.length);
  for (const nm of names) {
    const m = nm.match(/^(.*)L(b|c|2)?$/);
    const other = m ? m[1] + 'R' + (m[2] || '') : nm;
    remap[BI[nm]] = BI[other] ?? BI[nm];
  }
  const SI = g.attributes.skinIndex.array;
  for (let i = 0; i < SI.length; i++) SI[i] = remap[SI[i]];
  return g;
}

// ======================================================================= las manos
// HAND: los dedos de turiferario.js ([nombre, nudillo, articulación media,
// punta]); la falange de la punta empieza en DIP (0..1 entre la media y la
// punta). Devuelve la mano izquierda: { geo, mats, nails: [{ bone, geo }] }.
export const DIP = 0.55;
export function handSculpt(HAND, BI, o = {}) {
  const fing = HAND(1);
  const get = (nm) => fing.find((f) => f[0] === nm);
  const A = (nm) => V(...get(nm)[1]),
    Bp = (nm) => V(...get(nm)[2]),
    Cp = (nm) => V(...get(nm)[3]);
  const FI = ['f1', 'f2', 'f3', 'f4'];
  // el marco de la mano: u de través (del índice al meñique), v a lo largo
  // (de la muñeca a los nudillos), n hacia la palma
  const W = V(4.9, 6.6, 2.0);
  const u = A('f4').sub(A('f1')).normalize();
  const K = FI.reduce((s, f) => s.add(A(f)), V(0, 0, 0)).multiplyScalar(0.25);
  const n = u.clone().cross(K.clone().sub(W).normalize()).normalize();
  const v = n.clone().cross(u).normalize();
  const L = (x, y, z) => W.clone().addScaledVector(u, x).addScaledVector(v, y).addScaledVector(n, z);
  const RH = euler(u, v, n);
  // el marco girado deg alrededor de n (en el plano de la palma)
  const rotUV = (deg) => {
    const a = deg * DEG;
    const uu = u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a));
    return euler(uu, n.clone().cross(uu), n);
  };
  // marco de un tramo de dedo: x de través, y a lo largo, z hacia la palma
  const seg = (p, q, pal = n) => {
    const t = q.clone().sub(p).normalize();
    const np = pal.clone().addScaledVector(t, -pal.dot(t)).normalize();
    const x = t.clone().cross(np);
    return { t, np, x, rot: euler(x, t, np) };
  };
  const sc = new Sculpt({
    cell: o.handCell ?? 0.045,
    bones: BI,
    noise: { amp: 0.015, freq: 4.6, oct: 3, lump: 0.02, lumpFreq: 1.2, vein: 0.012, veinFreq: 2.4 },
    aoDist: 0.42,
    aoStrength: 1.2,
    matNoise: 0.3,
    matFreq: 3.2,
    weightSmooth: 4,
    weightSmoothK: 0.6,
    macro: [{ freq: 1.4, color: [0.84, 0.74, 0.68], amt: 0.3, thr: 0.55 }],
  });
  const SKIN = [0.93, 0.89, 0.84],
    KNUCK = [0.88, 0.76, 0.72];
  const sk = (bone, extra = {}) => ({ bone, mat: 'colSkin', tint: SKIN, ...extra });

  // el muñón del antebrazo (queda dentro del brazo del cuerpo)
  const df = W.clone().sub(V(4.3, 10.42, 0.6)).normalize();
  sc.rc(W.clone().addScaledVector(df, -0.72).toArray(), W.clone().addScaledVector(df, -0.1).toArray(), 0.24, 0.285, sk('foreL', { k: 0.1 }));
  // la muñeca y el bulto del cúbito
  // (tan ancha como acaba el antebrazo del cuerpo: dos huesos lado a lado)
  sc.ell(L(-0.03, 0.08, 0.0).toArray(), [0.45, 0.3, 0.31], sk('handL', { k: 0.2, rot: RH }));
  sc.ell(L(0.37, -0.04, -0.1).toArray(), [0.11, 0.12, 0.1], sk('foreL', { k: 0.08, tint: KNUCK }));
  // los metacarpianos (se marcan en el dorso) y el relleno de la palma
  const MU = [-0.36, -0.12, 0.12, 0.34];
  FI.forEach((f, i) => sc.rc(L(MU[i], 0.2, -0.02).toArray(), A(f).addScaledVector(n, -0.03).toArray(), 0.115, 0.14, sk('handL', { k: 0.2 })));
  sc.box(L(-0.05, 0.86, 0.03).toArray(), [0.54, 0.6, 0.11], sk('handL', { k: 0.2, round: 0.1, rot: RH }));
  sc.box(L(-0.06, 1.33, 0.03).toArray(), [0.68, 0.22, 0.11], sk('handL', { k: 0.2, round: 0.1, rot: RH }));
  // los montes de la palma: el del pulgar y el de fuera
  sc.ell(L(-0.5, 0.55, 0.12).toArray(), [0.28, 0.42, 0.18], sk('handL', { k: 0.18, rot: rotUV(28) }));
  sc.ell(L(0.47, 0.76, 0.11).toArray(), [0.19, 0.55, 0.14], sk('handL', { k: 0.18, rot: rotUV(-6) }));
  // almohadillas bajo los dedos y la piel entre ellos
  FI.forEach((f) => sc.ell(A(f).addScaledVector(n, 0.12).addScaledVector(v, -0.12).toArray(), [0.18, 0.14, 0.09], sk('handL', { k: 0.12, rot: RH })));
  for (let i = 0; i < 3; i++) sc.ell(A(FI[i]).lerp(A(FI[i + 1]), 0.5).addScaledVector(v, 0.13).addScaledVector(n, 0.05).toArray(), [0.11, 0.1, 0.085], sk('handL', { k: 0.1, rot: RH }));
  sc.ell(L(-0.84, 1.04, 0.02).toArray(), [0.1, 0.32, 0.08], sk('handL', { k: 0.14, rot: rotUV(35) }));
  // el hueco de la palma
  sc.ell(L(-0.08, 0.95, 0.35).toArray(), [0.38, 0.45, 0.18], { sub: true, k: 0.16, rot: RH });
  // nudillos (el hueso, por el dorso)
  FI.forEach((f) => sc.ell(A(f).addScaledVector(n, -0.05).toArray(), [0.165, 0.15, 0.15], sk('handL', { k: 0.1, rot: RH, tint: KNUCK })));
  // tendones del dorso, de la muñeca a cada nudillo
  // (acaban al pie del nudillo: un surco encima los partiría en láminas)
  FI.forEach((f, i) => sc.rc(L(MU[i] * 0.7, 0.05, -0.2).toArray(), A(f).addScaledVector(v, -0.12).addScaledVector(n, -0.19).toArray(), 0.04, 0.045, sk('handL', { k: 0.05, n: 0.4 })));
  // venas hinchadas (viejo)
  const vein = (pts, r) => sc.tube(pts.map((q) => L(...q).toArray()), pts.map(() => r), sk('handL', { k: 0.035, n: 0.3, vn: 0, tint: [0.78, 0.78, 0.9] }));
  vein([[-0.64, -0.08, -0.19], [-0.52, 0.32, -0.2], [-0.36, 0.7, -0.19], [-0.47, 1.08, -0.18]], 0.034);
  vein([[0.22, -0.02, -0.21], [0.06, 0.4, -0.215], [-0.2, 0.76, -0.2], [-0.25, 1.05, -0.19]], 0.031);
  vein([[0.06, 0.4, -0.215], [0.28, 0.82, -0.2], [0.42, 1.18, -0.185]], 0.028);

  // los dedos: tres falanges con nudillos huesudos y la carne de debajo
  const joints = {};
  for (const f of FI) {
    const a = A(f),
      b = Bp(f),
      c = Cp(f);
    const d = b.clone().lerp(c, DIP);
    const s1 = seg(a, b),
      s2 = seg(b, d),
      s3 = seg(d, c);
    const tip = c.clone().addScaledVector(s3.t, -0.05);
    joints[f] = { a, b, c, d, tip, s1, s2, s3 };
    sc.rc(a.clone().addScaledVector(s1.t, 0.06).toArray(), b.toArray(), 0.152, 0.13, sk(f + 'L', { k: 0.09 }));
    sc.ell(a.clone().lerp(b, 0.5).addScaledVector(s1.np, 0.06).toArray(), [0.11, 0.3, 0.08], sk(f + 'L', { k: 0.08, rot: s1.rot }));
    sc.ell(b.clone().addScaledVector(s1.np, -0.02).toArray(), [0.158, 0.14, 0.148], sk(f + 'Lb', { k: 0.07, rot: s2.rot, tint: KNUCK }));
    sc.rc(b.toArray(), d.toArray(), 0.124, 0.108, sk(f + 'Lb', { k: 0.07 }));
    sc.ell(b.clone().lerp(d, 0.5).addScaledVector(s2.np, 0.05).toArray(), [0.09, 0.2, 0.065], sk(f + 'Lb', { k: 0.06, rot: s2.rot }));
    sc.ell(d.clone().addScaledVector(s2.np, -0.012).toArray(), [0.118, 0.1, 0.11], sk(f + 'Lc', { k: 0.05, rot: s3.rot, tint: KNUCK }));
    sc.rc(d.toArray(), tip.toArray(), 0.102, 0.08, sk(f + 'Lc', { k: 0.05 }));
    sc.ell(d.clone().lerp(tip, 0.6).addScaledVector(s3.np, 0.035).toArray(), [0.085, 0.15, 0.065], sk(f + 'Lc', { k: 0.05, rot: s3.rot }));
  }
  // el pulgar: metacarpiano, dos falanges (la yema mira a los dedos)
  {
    const a = A('th'),
      b = Bp('th'),
      c = Cp('th');
    const base = L(-0.32, 0.18, 0.06);
    const pal = n.clone().addScaledVector(u, 0.9).normalize();
    const s1 = seg(a, b, pal),
      s2 = seg(b, c, pal);
    const tip = c.clone().addScaledVector(s2.t, -0.05);
    joints.th = { a, b, c, d: b, tip, s1, s2, s3: s2 };
    sc.rc(base.toArray(), a.toArray(), 0.16, 0.16, sk('handL', { k: 0.18 }));
    sc.ell(a.clone().addScaledVector(s1.np, -0.03).toArray(), [0.17, 0.15, 0.16], sk('thL', { k: 0.08, rot: s1.rot, tint: KNUCK }));
    sc.rc(a.toArray(), b.toArray(), 0.155, 0.135, sk('thL', { k: 0.09 }));
    sc.ell(a.clone().lerp(b, 0.5).addScaledVector(s1.np, 0.06).toArray(), [0.11, 0.24, 0.08], sk('thL', { k: 0.08, rot: s1.rot }));
    sc.ell(b.clone().addScaledVector(s1.np, -0.02).toArray(), [0.145, 0.13, 0.14], sk('thLb', { k: 0.07, rot: s2.rot, tint: KNUCK }));
    sc.rc(b.toArray(), tip.toArray(), 0.13, 0.095, sk('thLb', { k: 0.07 }));
    sc.ell(b.clone().lerp(tip, 0.55).addScaledVector(s2.np, 0.04).toArray(), [0.1, 0.2, 0.08], sk('thLb', { k: 0.06, rot: s2.rot }));
  }

  // ---- tallas sobre la piel de verdad
  const snap = snapper(sc);
  // un surco a lo largo de una línea de puntos ya pegados a la piel
  const groove = (pts, r = 0.024, lift = 0.004, nrm = null) => {
    const P = pts.filter(Boolean);
    if (P.length < 2) return;
    const q = nrm ? P.map((p, i) => p.clone().addScaledVector(nrm[i] || nrm[0], lift)) : P;
    sc.tube(
      q.map((p) => p.toArray()),
      q.map((_, i) => r * (i === 0 || i === q.length - 1 ? 0.6 : 1)),
      { sub: true, k: 0.012 }
    );
  };
  // arrugas del dorso de cada nudillo: arcos de través sobre la piel
  const knuckleLines = (ctr, along, dors, across, offs, R) => {
    for (const off of offs) {
      const pts = [],
        nrm = [];
      for (let k = -2; k <= 2; k++) {
        const th = k * 0.42;
        const dir = dors.clone().multiplyScalar(Math.cos(th)).addScaledVector(across, Math.sin(th)).normalize();
        const c0 = ctr.clone().addScaledVector(along, off);
        const p = snap(c0.clone().addScaledVector(dir, R + 0.25), c0);
        if (p) {
          pts.push(p);
          nrm.push(dir);
        }
      }
      groove(pts, 0.022, 0.006, nrm);
    }
  };
  for (const f of [...FI, 'th']) {
    const J = joints[f];
    knuckleLines(J.b, J.s2.t, J.s2.np.clone().negate(), J.s2.x, [-0.075, -0.02, 0.04], 0.16);
    if (f !== 'th') knuckleLines(J.d, J.s3.t, J.s3.np.clone().negate(), J.s3.x, [-0.035, 0.03], 0.12);
    // el pliegue de la palma en cada articulación
    for (const [ctr, s] of f === 'th' ? [[J.b, J.s2]] : [[J.b, J.s2], [J.d, J.s3]]) {
      const pts = [];
      for (let k = -2; k <= 2; k++) {
        const dir = s.np.clone().addScaledVector(s.x, k * 0.38).normalize();
        pts.push(snap(ctr.clone().addScaledVector(dir, 0.4), ctr));
      }
      groove(pts, 0.018, 0.002);
    }
  }
  // las líneas de la palma (la del corazón, la de la cabeza y la de la vida)
  const palmLine = (pts2) =>
    groove(
      pts2.map(([x, y]) => snap(L(x, y, 0.75), L(x, y, -0.1))),
      0.02,
      0.002
    );
  palmLine([[0.62, 1.22], [0.3, 1.27], [-0.05, 1.3], [-0.42, 1.38]]);
  palmLine([[-0.74, 1.0], [-0.4, 0.97], [-0.05, 0.98], [0.35, 1.05]]);
  palmLine([[-0.72, 1.05], [-0.5, 0.8], [-0.36, 0.5], [-0.3, 0.22]]);

  // ---- color: los nudillos rojizos, las uñas y las yemas sucias de hollín
  // y de sangre seca, moratones
  for (const f of [...FI, 'th']) {
    const J = joints[f];
    sc.paint(J.tip.toArray(), [0.2, 0.2, 0.2], { tint: [0.5, 0.42, 0.38], edge: 0.6, k: 0.75 });
    sc.paint(J.b.clone().addScaledVector(J.s2.np, -0.12).toArray(), [0.14, 0.14, 0.14], { tint: [0.84, 0.66, 0.62], edge: 0.6, k: 0.6 });
  }
  sc.paint(L(-0.05, 0.9, 0.25).toArray(), [0.55, 0.55, 0.2], { tint: [0.6, 0.5, 0.46], edge: 0.7, k: 0.6 });
  sc.paint(L(0.2, 0.45, -0.25).toArray(), [0.3, 0.25, 0.2], { tint: [0.74, 0.62, 0.7], edge: 0.7, k: 0.45 });
  sc.paint(L(-0.3, 1.25, -0.22).toArray(), [0.25, 0.3, 0.2], { tint: [0.58, 0.36, 0.34], edge: 0.7, k: 0.5 });

  const geo = sc.build();

  // ---- las uñas de hueso: nacen sobre la última falange, pasan la yema y se
  // curvan hacia la palma (amarillentas, la raíz sucia)
  const nails = [];
  for (const f of [...FI, 'th']) {
    const J = joints[f];
    const s = J.s3;
    const R0 = f === 'th' ? 0.1 : 0.085;
    const root = J.d.clone().lerp(J.tip, f === 'th' ? 0.5 : 0.42).addScaledVector(s.np, -R0 * 0.82);
    const len = f === 'th' ? 0.55 : 0.72;
    const w = f === 'th' ? 0.075 : 0.064;
    const pts = [],
      ups = [],
      rx = [],
      rz = [];
    for (let i = 0; i <= 6; i++) {
      const q = i / 6;
      pts.push(root.clone().addScaledVector(s.t, len * q).addScaledVector(s.np, len * 0.42 * q * q));
      ups.push(s.np.clone().negate().addScaledVector(s.t, 0.84 * q).normalize());
      const taper = q < 0.35 ? 1 : 1 - (q - 0.35) / 0.65;
      rx.push(w * (0.12 + 0.88 * Math.pow(taper, 0.7)));
      rz.push(w * 0.42 * (0.2 + 0.8 * taper));
    }
    const g = sweepGeo(pts.reverse(), ups.reverse(), rx.reverse(), rz.reverse(), 6);
    shadeBy(g, (x, y, z) => {
      const dd = V(x, y, z).distanceTo(root) / len;
      return 0.62 + 0.4 * Math.min(1, dd * 1.4);
    });
    const C = g.attributes.color;
    for (let i = 0; i < C.count; i++) C.setXYZ(i, C.getX(i) * 0.95, C.getY(i) * 0.88, C.getZ(i) * 0.7);
    nails.push({ bone: f === 'th' ? 'thLb' : f + 'Lc', geo: g });
  }
  return { geo, mats: sc.mats, nails, stats: sc.stats, frame: { W, u, v, n }, joints };
}

// Las dos manos: la izquierda esculpida y la derecha en espejo. Devuelve las
// mallas con piel y las piezas rígidas (las uñas).
export function buildHands(HAND, BI, o = {}) {
  const t0 = performance.now();
  const H = handSculpt(HAND, BI, o);
  const right = mirrorSkinned(H.geo, BI);
  const rigid = [];
  for (const nl of H.nails) {
    rigid.push({ bone: nl.bone, mat: 'colBone', geo: nl.geo });
    rigid.push({ bone: nl.bone.replace(/L(b|c)?$/, (m, a) => 'R' + (a || '')), mat: 'colBone', geo: mirrorGeoX(nl.geo) });
  }
  return {
    skinned: [
      { name: 'manoL', geo: H.geo, mats: H.mats, matOpts: {} },
      { name: 'manoR', geo: right, mats: H.mats, matOpts: {} },
    ],
    rigid,
    hand: H,
    stats: { ...H.stats, ms: Math.round(performance.now() - t0) },
  };
}


// ======================================================================= la cabeza
// La cara de verdad del arzobispo tras la jaula: el cráneo bajo la piel
// estirada, la frente surcada, las cuencas hondas con los párpados
// caídos y dos brasas por ojos (con la pupila en rendija), los pómulos
// marcados y las mejillas hundidas, la nariz podrida (el hueco de la
// nariz), los labios rotos que dejan ver los dientes largos y la mandíbula
// desencajada (corrida hacia su derecha, la bisagra de ese lado más baja).
// Nada pasa de z = 4.6 (los barrotes de delante van por z = 4.7).
// El cuello de arriba va con la cabeza; la costura con el del cuerpo la tapa
// el amito (el paño de lino, alrededor del cuello).
export const EYES = [
  { S: 'L', p: [0.4, 16.32, 4.2] },
  { S: 'R', p: [-0.4, 16.32, 4.2] },
];
export function headSculpt(BI, o = {}) {
  const sc = new Sculpt({
    cell: o.headCell ?? 0.045,
    bones: BI,
    noise: { amp: 0.012, freq: 3.8, oct: 3, lump: 0.022, lumpFreq: 0.9, vein: 0.012, veinFreq: 1.9 },
    aoDist: 0.5,
    aoStrength: 1.25,
    matNoise: 0.3,
    matFreq: 3.0,
    weightSmooth: 3,
    weightSmoothK: 0.5,
    macro: [{ freq: 1.1, color: [0.8, 0.7, 0.64], amt: 0.3, thr: 0.55 }],
  });
  const SKIN = [0.9, 0.86, 0.81],
    LIP = [0.66, 0.46, 0.44];
  const mir = (fn) => {
    fn(1, 'L');
    fn(-1, 'R');
  };
  const sk = (bone, extra = {}) => ({ bone, mat: 'colSkin', tint: SKIN, ...extra });

  // ---- el cuello de arriba (dentro del del cuerpo hasta el amito)
  sc.rc([0, 15.3, 1.42], [0, 15.55, 2.45], 0.63, 0.6, sk('neck2', { k: 0.2 }));
  mir((s) => sc.rc([0.58 * s, 15.95, 2.85], [0.4 * s, 15.15, 1.6], 0.12, 0.13, sk('neck2', { k: 0.12, n: 0.5 })));
  // la papada de viejo, colgando
  sc.ell([0, 15.0, 2.6], [0.42, 0.24, 0.6], sk('neck2', { k: 0.2 }));
  // ---- el cráneo, la nuca y la frente
  sc.ell([0, 16.78, 2.98], [1.06, 1.1, 1.3], sk('head', { k: 0.25 }));
  sc.ell([0, 16.5, 2.05], [0.8, 0.75, 0.55], sk('head', { k: 0.25 }));
  sc.ell([0, 16.98, 3.72], [0.86, 0.62, 0.66], sk('head', { k: 0.25 }));
  mir((s) => sc.ell([0.98 * s, 16.55, 3.6], [0.2, 0.32, 0.38], { sub: true, k: 0.2 }));
  // el arco de las cejas (fruncido: más bajo hacia el centro)
  sc.tube(
    [
      [-0.82, 16.6, 4.08],
      [-0.48, 16.68, 4.34],
      [-0.14, 16.58, 4.44],
      [0, 16.56, 4.45],
      [0.14, 16.58, 4.44],
      [0.48, 16.68, 4.34],
      [0.82, 16.6, 4.08],
    ],
    [0.1, 0.13, 0.12, 0.11, 0.12, 0.13, 0.1],
    sk('head', { k: 0.1 })
  );
  // ---- las cuencas: la rendija de los párpados (el rabo del ojo, caído) y
  // el hueco de detrás, donde arde el ojo
  mir((s) => {
    sc.ell([0.4 * s, 16.47, 4.33], [0.27, 0.075, 0.18], sk('head', { k: 0.05, rot: [-8, 0, -9 * s] }));
    sc.ell([0.42 * s, 16.16, 4.34], [0.25, 0.06, 0.16], sk('head', { k: 0.05, rot: [0, 0, -9 * s], tint: [0.82, 0.68, 0.66] }));
    sc.ell([0.44 * s, 16.05, 4.32], [0.24, 0.07, 0.12], sk('head', { k: 0.06 }));
    sc.ell([0.4 * s, 16.32, 4.38], [0.25, 0.125, 0.26], { sub: true, k: 0.05, rot: [0, 0, -9 * s] });
    sc.ell([0.4 * s, 16.32, 4.15], [0.22, 0.17, 0.22], { sub: true, k: 0.06 });
  });
  // ---- la nariz podrida: el caballete, el hueco y lo que queda de las aletas
  sc.rc([0, 16.5, 4.46], [0, 16.18, 4.56], 0.095, 0.08, sk('head', { k: 0.08 }));
  mir((s) => sc.ell([0.15 * s, 16.02, 4.47], [0.075, 0.11, 0.08], sk('head', { k: 0.05, tint: [0.78, 0.62, 0.6] })));
  sc.ell([0, 16.02, 4.52], [0.14, 0.15, 0.22], { sub: true, k: 0.05 });
  // ---- pómulos, arcos cigomáticos y las mejillas hundidas
  mir((s) => {
    sc.ell([0.66 * s, 16.06, 4.16], [0.3, 0.16, 0.24], sk('head', { k: 0.12, rot: [0, 25 * s, 0] }));
    sc.rc([0.8 * s, 16.04, 3.95], [1.0 * s, 15.98, 3.35], 0.085, 0.085, sk('head', { k: 0.08 }));
    sc.ell([0.62 * s, 15.66, 4.08], [0.2, 0.26, 0.24], { sub: true, k: 0.18 });
  });
  // ---- la boca: el maxilar con la encía y el labio de arriba, roto por su
  // izquierda; la boca rasgada hasta las mejillas
  // (la encía se ha retirado: los dientes salen de muy arriba)
  sc.ell([0, 15.9, 4.12], [0.58, 0.16, 0.4], sk('head', { k: 0.15 }));
  const lipArc = (cx, cy, cz, R, a0, a1, bone, wob) => {
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const a = a0 + ((a1 - a0) * k) / 6;
      pts.push([cx + Math.sin(a) * R, cy + wob * Math.cos(a * 3 + 1), cz + Math.cos(a) * R * 0.98]);
    }
    sc.tube(pts, pts.map((_, k) => (k === 0 || k === 6 ? 0.03 : 0.05)), sk(bone, { k: 0.04, tint: LIP }));
  };
  lipArc(0, 15.84, 3.95, 0.57, -1.0, 0.22, 'head', 0.012);
  lipArc(0, 15.84, 3.95, 0.57, 0.62, 1.0, 'head', 0.012);
  // las mejillas: piel que va del maxilar a la mandíbula (al abrir la boca
  // se estira entre las dos)
  mir((s) => {
    sc.ell([0.6 * s, 15.64, 3.74], [0.13, 0.16, 0.32], sk('head', { k: 0.1 }));
    sc.ell([0.6 * s, 15.36, 3.74], [0.13, 0.16, 0.32], sk('jaw', { k: 0.1 }));
  });
  sc.ell([0, 15.5, 3.92], [0.54, 0.18, 0.62], { sub: true, k: 0.05 });
  mir((s) => sc.ell([0.47 * s, 15.51, 3.86], [0.16, 0.09, 0.22], { sub: true, k: 0.05 }));
  sc.ell([0, 15.5, 3.45], [0.36, 0.28, 0.4], { sub: true, k: 0.1 });
  // ---- la mandíbula, desencajada (corrida hacia su derecha)
  sc.rc([0.76, 15.98, 3.42], [0.68, 15.22, 3.62], 0.13, 0.12, sk('jaw', { k: 0.1 }));
  sc.rc([-0.82, 15.84, 3.48], [-0.74, 15.12, 3.66], 0.13, 0.12, sk('jaw', { k: 0.1 }));
  sc.tube(
    [
      [0.68, 15.22, 3.62],
      [0.56, 15.04, 4.02],
      [0.27, 14.97, 4.33],
      [-0.06, 14.94, 4.42],
      [-0.36, 14.99, 4.3],
      [-0.62, 15.06, 3.95],
      [-0.74, 15.12, 3.66],
    ],
    [0.13, 0.14, 0.14, 0.14, 0.14, 0.14, 0.13],
    sk('jaw', { k: 0.12 })
  );
  sc.ell([-0.06, 14.92, 4.36], [0.22, 0.15, 0.14], sk('jaw', { k: 0.1 }));
  sc.ell([-0.04, 15.08, 3.95], [0.56, 0.17, 0.4], sk('jaw', { k: 0.15 }));
  lipArc(-0.04, 15.18, 3.98, 0.5, -1.0, -0.45, 'jaw', -0.01);
  lipArc(-0.04, 15.18, 3.98, 0.5, -0.12, 1.0, 'jaw', -0.01);
  // la lengua (dentro)
  sc.ell([-0.03, 15.2, 3.72], [0.3, 0.1, 0.42], { bone: 'jaw', mat: 'colFlesh', tint: [0.7, 0.42, 0.4], k: 0.08 });
  // ---- las orejas, largas, con el lóbulo caído
  mir((s) => {
    sc.ell([1.05 * s, 16.2, 3.05], [0.1, 0.38, 0.22], sk('head', { k: 0.06, rot: [0, 15 * s, 0] }));
    sc.ell([1.04 * s, 15.8, 3.12], [0.08, 0.14, 0.1], sk('head', { k: 0.05 }));
    sc.ell([1.13 * s, 16.22, 3.08], [0.05, 0.2, 0.12], { sub: true, k: 0.03 });
  });

  // ---- arrugas, talladas sobre la piel de verdad
  const snap = snapper(sc);
  const groove = (pts, r = 0.022, k = 0.012) => {
    const P = pts.filter(Boolean);
    if (P.length < 2) return;
    sc.tube(
      P.map((p) => p.toArray()),
      P.map((_, i) => r * (i === 0 || i === P.length - 1 ? 0.55 : 1)),
      { sub: true, k }
    );
  };
  // un surco por la cara: puntos (x, y) proyectados de frente (z) sobre la piel
  const front = (xy, r, k) => groove(xy.map(([x, y]) => snap(V(x, y, 5.4), V(x, y, 2.6))), r, k);
  // la frente: tres surcos de lado a lado
  for (const [y, w] of [
    [16.98, 0.56],
    [17.13, 0.62],
    [17.28, 0.5],
  ])
    front(
      [-1, -0.5, 0, 0.5, 1].map((q) => [q * w, y + Math.abs(q) * 0.03 - Math.cos(q * 2.4) * 0.012]),
      0.022
    );
  // el ceño
  mir((s) => front([[0.07 * s, 16.82], [0.08 * s, 16.7], [0.06 * s, 16.58]], 0.02));
  // las patas de gallo (de lado: proyectadas desde fuera)
  mir((s) =>
    [-0.07, 0.0, 0.07].forEach((dy, i) => {
      const pts = [0, 1, 2].map((q) => {
        const x = (0.68 + q * 0.09) * s,
          y = 16.3 + dy * (1 + q * 0.8);
        return snap(V(x + 0.6 * s, y, 4.6), V(x - 0.3 * s, y, 3.8));
      });
      groove(pts, 0.016);
      void i;
    })
  );
  // los surcos de la nariz a la boca y los del cuello
  mir((s) => front([[0.22 * s, 15.98], [0.36 * s, 15.82], [0.48 * s, 15.62]], 0.024));
  for (const y of [15.15, 15.3])
    groove(
      [-0.5, -0.25, 0, 0.25, 0.5].map((x) => snap(V(x, y - 0.9, 2.3 + Math.abs(x) * 0.2), V(x, y + 0.2, 2.3 + Math.abs(x) * 0.2))),
      0.022
    );

  // ---- color: los párpados y las cuencas oscuros, el hueco de la nariz y
  // la boca en carne viva, manchas de viejo, venas en las sienes
  mir((s) => {
    sc.paint([0.4 * s, 16.32, 4.36], [0.32, 0.22, 0.24], { tint: [0.42, 0.26, 0.25], edge: 0.5, k: 0.85 });
    sc.paint([0.42 * s, 16.19, 4.4], [0.22, 0.05, 0.1], { mat: 'colFlesh', tint: [0.72, 0.36, 0.33], edge: 0.4, k: 0.8 });
    sc.paint([0.96 * s, 16.62, 3.62], [0.14, 0.26, 0.26], { tint: [0.72, 0.68, 0.8], edge: 0.7, k: 0.5 });
  });
  sc.paint([0, 16.02, 4.5], [0.16, 0.17, 0.24], { mat: 'colFleshDim', tint: [0.26, 0.11, 0.1], edge: 0.35, k: 1 });
  sc.paint([0, 15.5, 3.8], [0.6, 0.32, 0.7], { mat: 'colFleshDim', tint: [0.34, 0.14, 0.13], edge: 0.3, k: 0.9 });
  sc.paint([0, 15.8, 4.32], [0.56, 0.06, 0.3], { mat: 'colFlesh', tint: [0.55, 0.26, 0.24], edge: 0.4, k: 0.8 });
  sc.paint([-0.04, 15.15, 4.25], [0.5, 0.06, 0.3], { mat: 'colFlesh', tint: [0.55, 0.26, 0.24], edge: 0.4, k: 0.8 });
  for (const [x, y, z, r] of [
    [0.45, 17.25, 4.05, 0.08],
    [-0.3, 17.4, 3.95, 0.1],
    [0.7, 16.95, 3.95, 0.07],
    [-0.75, 17.05, 3.85, 0.09],
    [0.15, 17.55, 3.7, 0.12],
    [-0.62, 16.45, 3.95, 0.06],
  ])
    sc.paint([x, y, z], r, { tint: [0.62, 0.5, 0.42], edge: 0.6, k: 0.7 });
  // la sangre que le cae de la jaula (las correas le muerden la piel)
  mir((s) => sc.paint([0.98 * s, 16.9, 2.6], [0.2, 0.5, 0.25], { tint: [0.45, 0.2, 0.18], edge: 0.6, k: 0.6 }));

  const geo = sc.build();

  // ---- piezas: los ojos (brasa con la pupila en rendija), los dientes
  const rigid = [];
  for (const e of EYES) {
    const [x, y, z] = e.p;
    rigid.push({ bone: 'head', mat: 'ember', grp: 'eye' + e.S, geo: hardGeo({ type: 'ico', s: [0.165], detail: 2, p: [x, y, z], mat: 'ember', ao: false }) });
    rigid.push({ bone: 'head', mat: 'eyeGlow', grp: 'eye' + e.S, geo: hardGeo({ type: 'ico', s: [0.045, 0.11, 0.04], detail: 1, p: [x, y, z + 0.145], mat: 'eyeGlow', ao: false }) });
    // reventado (escondido hasta que se lo apuñalan: ver giant.setEye)
    rigid.push({ bone: 'head', mat: 'colFleshDim', grp: 'eye' + e.S + 'Out', geo: hardGeo({ type: 'ico', s: [0.16, 0.09, 0.075], detail: 1, p: [x, y - 0.03, z + 0.03], mat: 'colFleshDim', shade: 0.55 }) });
    rigid.push({ bone: 'head', mat: 'colFleshDim', grp: 'eye' + e.S + 'Out', geo: hardGeo({ type: 'ico', s: [0.07, 0.05, 0.05], detail: 1, p: [x + 0.06, y - 0.1, z + 0.09], mat: 'colFleshDim', shade: 0.45 }) });
  }
  // dientes largos y amarillos, la raíz podrida; faltan algunos y otros están rotos
  const tooth = (root, dir, out, len, w) => {
    const pts = [],
      ups = [],
      rx = [],
      rz = [];
    for (let i = 0; i <= 5; i++) {
      const q = i / 5;
      // (se curvan hacia dentro de la boca)
      pts.push(root.clone().addScaledVector(dir, len * q).addScaledVector(out, -len * 0.12 * q * q));
      ups.push(out);
      const tp = 1 - q * 0.82;
      rx.push(w * 0.5 * tp);
      rz.push(w * 0.32 * tp + 0.004);
    }
    const g = sweepGeo(pts.reverse(), ups.reverse(), rx.reverse(), rz.reverse(), 5);
    shadeBy(g, (x, yy, zz) => {
      const dd = V(x, yy, zz).distanceTo(root) / len;
      return 0.5 + 0.5 * Math.min(1, dd * 1.6);
    });
    const C = g.attributes.color;
    for (let i = 0; i < C.count; i++) C.setXYZ(i, C.getX(i) * 0.92, C.getY(i) * 0.84, C.getZ(i) * 0.62);
    return g;
  };
  const rowOf = (n, cx, cz, R, y0, dirY, bone, lens, ws, skip) => {
    for (let k = 0; k < n; k++) {
      if (skip.includes(k)) continue;
      const a = -1.05 + (k / (n - 1)) * 2.1;
      const out = V(Math.sin(a), 0, Math.cos(a));
      const root = V(cx + Math.sin(a) * R, y0, cz + Math.cos(a) * R * 0.98);
      const dir = V(0, dirY, 0).addScaledVector(out, 0.12).normalize();
      rigid.push({ bone, mat: 'colBone', geo: tooth(root, dir, out, lens(a, k), ws(a)) });
    }
  };
  const up = (a, k) => {
    const c = Math.abs(a);
    let L = c < 0.3 ? 0.3 : c < 0.6 ? 0.46 - Math.abs(c - 0.45) * 0.6 : 0.3 - (c - 0.6) * 0.15;
    if (k === 7) L = 0.13;
    return L;
  };
  rowOf(14, 0, 3.92, 0.5, 15.86, -1, 'head', up, (a) => 0.09 + Math.abs(a) * 0.03, [4, 10]);
  rowOf(
    12,
    -0.04,
    3.96,
    0.45,
    15.12,
    1,
    'jaw',
    (a, k) => (k === 3 ? 0.1 : Math.abs(a) < 0.3 ? 0.24 : Math.abs(a) < 0.6 ? 0.36 : 0.22),
    (a) => 0.085 + Math.abs(a) * 0.03,
    [8]
  );
  return { geo, mats: sc.mats, rigid, stats: sc.stats };
}

// El amito: el paño de lino alrededor del cuello (tapa la costura entre el
// cuello del cuerpo y el de la cabeza), con sus dos cintas por la espalda.
export function amiceGeo() {
  const c = V(0, 15.42, 1.8);
  const ax = V(0, 0.225, 0.974).normalize();
  const side = V(1, 0, 0);
  const upv = ax.clone().cross(side).normalize();
  const nT = 44,
    nW = 4;
  const pos = [],
    nor = [],
    uv = [],
    col = [];
  const P = (t, w) => {
    const th = (t / nT) * Math.PI * 2;
    const fold = Math.sin(th * 7 + 0.6) * 0.035 + Math.sin(th * 13) * 0.015;
    const r = 0.8 + fold + (w / nW) * 0.06 + Math.max(0, -Math.sin(th)) * 0.06;
    const d = side.clone().multiplyScalar(Math.cos(th)).addScaledVector(upv, Math.sin(th));
    const along = (w / nW - 0.5) * 0.72 + Math.sin(th * 3) * 0.04;
    return [c.clone().addScaledVector(d, r).addScaledVector(ax, along), d];
  };
  for (let t = 0; t < nT; t++)
    for (let w = 0; w < nW; w++) {
      const q = [P(t, w), P(t + 1, w), P(t + 1, w + 1), P(t, w + 1)];
      for (const i of [0, 1, 2, 0, 2, 3]) {
        const [p, d] = q[i];
        pos.push(p.x, p.y, p.z);
        nor.push(d.x, d.y, d.z);
        uv.push((t + (i === 1 || i === 2 ? 1 : 0)) / 6, (w + (i >= 2 ? 1 : 0)) / 3);
        const k = 0.78 + 0.18 * Math.sin((t + i) * 0.9);
        col.push(k * 0.92, k * 0.88, k * 0.78);
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

// La cabeza entera: la malla con piel y sus piezas (ojos, dientes, amito).
export function buildHead(BI, o = {}) {
  const t0 = performance.now();
  const Hd = headSculpt(BI, o);
  const rigid = [...Hd.rigid, { bone: 'neck2', mat: 'colAlb', geo: amiceGeo(), ds: true }];
  return {
    skinned: [{ name: 'cabeza', geo: Hd.geo, mats: Hd.mats, matOpts: {} }],
    rigid,
    stats: { ...Hd.stats, ms: Math.round(performance.now() - t0) },
  };
}
