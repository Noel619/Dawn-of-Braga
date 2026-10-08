// Piezas duras de los colosos (sólo geometría): anillos, arcos, cadenas,
// tornos, cintas y la campana mayor de la Sé.
import * as THREE from 'three';
import { hardGeo, tubeGeo, V, perlin } from './sculpt.js';

const DEG = Math.PI / 180;

// vector perpendicular a 'axis', girado 'a' alrededor de él
export function perp(axis, a) {
  const t = Math.abs(axis.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
  const u = t.clone().cross(axis).normalize();
  const w = axis.clone().cross(u).normalize();
  return u.multiplyScalar(Math.cos(a)).addScaledVector(w, Math.sin(a));
}
// color de vértice (y UV vacías) para piezas que no los traen
export function withColor(g, v = 0.85, tint = null) {
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    c[i * 3] = v * (tint ? tint[0] : 1);
    c[i * 3 + 1] = v * (tint ? tint[1] : 1);
    c[i * 3 + 2] = v * (tint ? tint[2] : 1);
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}
// oscurece una pieza hacia abajo (un remedo de oclusión) o hacia un punto
export function shadeBy(g, fn) {
  const P = g.attributes.position,
    C = g.attributes.color;
  for (let i = 0; i < P.count; i++) {
    const k = fn(P.getX(i), P.getY(i), P.getZ(i));
    C.setXYZ(i, C.getX(i) * k, C.getY(i) * k, C.getZ(i) * k);
  }
  return g;
}
// toro que rodea el eje dado, centrado en c
export function torusAround(R, t, c, axis, seg = 20, tube = 4) {
  const g = new THREE.TorusGeometry(R, t, tube, seg).toNonIndexed();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), axis.clone().normalize()));
  g.translate(c.x, c.y, c.z);
  return withColor(g);
}
// cadena de eslabones a lo largo de una curva
export function chainGeo(pts, linkR = 0.3, t = 0.075) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : V(...p))));
  const L = curve.getLength();
  const n = Math.max(2, Math.floor(L / (linkR * 1.55)));
  const geos = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const p = curve.getPointAt(u);
    const tg = curve.getTangentAt(u);
    const g = new THREE.TorusGeometry(linkR, t, 4, 10).toNonIndexed();
    g.scale(0.62, 1, 1);
    const side = perp(tg, i % 2 ? Math.PI / 2 : 0);
    g.applyMatrix4(new THREE.Matrix4().makeBasis(side.clone().cross(tg).normalize(), tg, side));
    g.translate(p.x, p.y, p.z);
    geos.push(withColor(g, 0.8));
  }
  return geos;
}
// un eslabón suelto en el origen, a lo largo de +Y (para la cadena física)
export function linkGeo(linkR = 0.3, t = 0.08) {
  const g = new THREE.TorusGeometry(linkR, t, 4, 10).toNonIndexed();
  g.scale(0.62, 1, 1);
  return withColor(g, 0.82);
}
// cinta plana a lo largo de una polilínea (bandas de hierro, cintas de cuero)
export function ribbonGeo(pts, width, o = {}) {
  const P = pts.map((p) => (p.isVector3 ? p : V(...p)));
  const up = o.up ? V(...o.up) : null;
  const pos = [],
    nor = [],
    uv = [];
  let along = 0;
  const rows = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)],
      b = P[Math.min(P.length - 1, i + 1)];
    const tg = b.clone().sub(a).normalize();
    const n = up ? up.clone().sub(tg.clone().multiplyScalar(up.dot(tg))).normalize() : perp(tg, o.twist ?? 0);
    const side = tg.clone().cross(n).normalize();
    const w = (typeof width === 'function' ? width(i / (P.length - 1)) : width) / 2;
    if (i > 0) along += P[i].distanceTo(P[i - 1]);
    rows.push([P[i].clone().addScaledVector(side, -w), P[i].clone().addScaledVector(side, w), n, along]);
  }
  for (let i = 0; i < rows.length - 1; i++) {
    const [a0, a1, na, ua] = rows[i],
      [b0, b1, nb, ub] = rows[i + 1];
    for (const [p, n, u, v] of [
      [a0, na, 0, ua],
      [b0, nb, 0, ub],
      [b1, nb, 1, ub],
      [a0, na, 0, ua],
      [b1, nb, 1, ub],
      [a1, na, 1, ua],
    ]) {
      pos.push(p.x, p.y, p.z);
      nor.push(n.x, n.y, n.z);
      uv.push(u, v * (o.uvk ?? 1));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return withColor(g, o.shade ?? 0.85, o.tint);
}
// cono de hueso (púa, uña, garra) de a a b con radio r en la base
export function spikeGeo(a, b, r, o = {}) {
  const A = a.isVector3 ? a : V(...a),
    B = b.isVector3 ? b : V(...b);
  const L = A.distanceTo(B);
  const g = new THREE.ConeGeometry(r, L, o.seg || 6).toNonIndexed();
  g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), B.clone().sub(A).normalize()));
  g.translate(A.x, A.y, A.z);
  withColor(g, 1);
  // la punta más clara, la base en sombra
  return shadeBy(g, (x, y, z) => 0.6 + 0.45 * Math.min(1, V(x, y, z).distanceTo(A) / L));
}
// garra curva (uña de hueso) desde a hacia dir, curvándose hacia 'down'
export function clawGeo(a, dir, down, len, r) {
  const A = a.isVector3 ? a : V(...a);
  const D = (dir.isVector3 ? dir : V(...dir)).clone().normalize();
  const W = (down.isVector3 ? down : V(...down)).clone().normalize();
  const pts = [];
  for (let i = 0; i <= 4; i++) {
    const u = i / 4;
    pts.push(A.clone().addScaledVector(D, len * u).addScaledVector(W, len * 0.45 * u * u));
  }
  const g = tubeGeo(pts, [r, r * 0.8, r * 0.5, r * 0.25, 0.01], { radial: 5, segs: 6, cap: true });
  return shadeBy(g, () => 1);
}

// ------------------------------------------------------------ la campana mayor
// Geometría de la campana-incensario de la Sé, con la corona en el origen y
// la boca hacia -Y (alto H). Devuelve las piezas por material.
export function bellParts(H = 6.2, o = {}) {
  const k = H / 3.4;
  const prof = [
    [1.62, 0],
    [1.7, 0.08],
    [1.66, 0.2],
    [1.5, 0.36],
    [1.24, 0.78],
    [1.06, 1.36],
    [1.0, 2.05],
    [0.95, 2.66],
    [0.84, 3.0],
    [0.56, 3.26],
    [0.02, 3.4],
  ].map(([r, y]) => [r * k, y * k]);
  const parts = [];
  const add = (mat, geo, ds = false) => parts.push({ mat, geo, ds });
  add('colBronze', hardGeo({ type: 'lathe', points: prof, seg: 24, p: [0, -H, 0], mat: 'colBronze', ao: false }), true);
  // el interior, oscuro y requemado
  const inner = prof.map(([r, y]) => [Math.max(0.01, r - 0.16 * k), y]).slice(0, -1);
  const gi = hardGeo({ type: 'lathe', points: inner.reverse(), seg: 18, p: [0, -H, 0], mat: 'colBronze', ao: false, shade: 0.3 });
  add('colBronze', gi, true);
  // molduras
  for (const [y, rr, t] of [
    [0.1, 1.68, 0.11],
    [0.24, 1.6, 0.06],
    [1.44, 1.05, 0.07],
    [2.2, 1.0, 0.05],
    [2.74, 0.97, 0.08],
  ])
    add('colBronze', torusAround(rr * k, t * k, V(0, -H + y * k, 0), V(0, 1, 0), 28));
  // la inscripción en relieve (letras: trazos en cajitas), entre dos molduras
  const rng = mulberry(o.seed ?? 31);
  for (let i = 0; i < 40; i++) {
    if (i % 8 === 7) continue;
    const a = (i / 40) * Math.PI * 2;
    const r = 1.005 * k;
    const n = 1 + Math.floor(rng() * 3);
    for (let q = 0; q < n; q++) {
      const hh = 0.12 + rng() * 0.16;
      add('colBronze', hardGeo({ type: 'box', s: [0.05 + rng() * 0.1, hh, 0.05], p: [Math.cos(a + q * 0.03) * r, -H + (2.36 + (rng() - 0.5) * 0.08) * k, Math.sin(a + q * 0.03) * r], r: [0, -a / DEG + 90, (rng() - 0.5) * 40], mat: 'colBronze' }));
    }
  }
  // la cruz y el escudo en relieve en dos caras
  for (const a of [0.3, 0.3 + Math.PI]) {
    const r = 1.04 * k;
    const c = V(Math.cos(a) * r, -H + 1.75 * k, Math.sin(a) * r);
    add('colBronze', hardGeo({ type: 'box', s: [0.16, 1.1, 0.1], p: c.toArray(), r: [0, -a / DEG + 90, 0], mat: 'colBronze' }));
    add('colBronze', hardGeo({ type: 'box', s: [0.7, 0.16, 0.1], p: [c.x, c.y + 0.22, c.z], r: [0, -a / DEG + 90, 0], mat: 'colBronze' }));
  }
  // la corona: asas y el yugo partido
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const side = V(Math.cos(a), 0, Math.sin(a));
    add('iron', torusAround(0.38, 0.11, side.clone().multiplyScalar(0.36).add(V(0, 0.14, 0)), V(-Math.sin(a), 0, Math.cos(a))));
  }
  add('wooddark', hardGeo({ type: 'box', s: [3.2, 0.5, 0.55], p: [0.3, 0.55, 0], r: [0, 0, -9], mat: 'wooddark' }));
  add('wooddark', hardGeo({ type: 'box', s: [0.9, 0.42, 0.5], p: [2.1, 0.28, 0.05], r: [0, 8, -38], mat: 'wooddark', shade: 0.6 }));
  add('iron', hardGeo({ type: 'box', s: [0.12, 0.62, 0.62], p: [-0.9, 0.55, 0], mat: 'iron' }));
  add('iron', hardGeo({ type: 'box', s: [0.12, 0.62, 0.62], p: [1.2, 0.5, 0], r: [0, 0, -9], mat: 'iron' }));
  // el badajo (dentro)
  add('iron', hardGeo({ type: 'cyl', s: [0.14, 0.1, H * 0.7], p: [0, -H * 0.4, 0], mat: 'iron' }));
  add('iron', hardGeo({ type: 'sphere', s: [0.42], seg: 8, seg2: 6, p: [0, -H * 0.78, 0], mat: 'iron' }));
  // los agujeros del incensario (ascuas)
  for (let kk = 0; kk < 2; kk++)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + kk * 0.26;
      const y = -H + (1.15 + kk * 0.9) * k;
      const rr = (kk ? 1.0 : 1.07) * k;
      add('ember', hardGeo({ type: 'box', s: [0.36, 0.58, 0.1], p: [Math.cos(a) * rr, y, Math.sin(a) * rr], r: [0, -a / DEG + 90, 0], mat: 'ember', ao: false }));
    }
  // las ascuas en la boca
  add('ember', hardGeo({ type: 'cyl', s: [1.35 * k, 1.35 * k, 0.05], seg: 16, p: [0, -H + 0.5, 0], mat: 'ember', ao: false }));
  return parts;
}

// generador pseudoaleatorio pequeño (determinista)
export function mulberry(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ruido de 0 a 1
export const n01 = (x, y, z) => perlin(x, y, z) * 0.5 + 0.5;
