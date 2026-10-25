// Geometrías esculpidas para los rigs (piezas 'geo'): superficies
// paramétricas, troncos de sección elíptica a lo largo de un camino, telas
// que cuelgan con sus pliegues, faldones alrededor de un eje, cabezas con
// rasgos y manos con dedos. Todo en metros, con las caras hacia fuera y las
// normales suaves (también en la costura y en los polos).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const V3 = THREE.Vector3;
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const sstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const mix = (a, b, t) => a + (b - a) * t;
// campana de Gauss en (x, y) con anchos (sx, sy)
export const bump = (x, y, sx, sy) => Math.exp(-(x * x) / (sx * sx) - (y * y) / (sy * sy));

// Interpolación suave (Catmull-Rom) en una tabla [[s, a, b, ...], ...]
// ordenada por s: devuelve [a, b, ...] en s.
export function table(T, s) {
  const n = T.length;
  if (s <= T[0][0]) return T[0].slice(1);
  if (s >= T[n - 1][0]) return T[n - 1].slice(1);
  let i = 0;
  while (i < n - 2 && s > T[i + 1][0]) i++;
  const p0 = T[Math.max(0, i - 1)],
    p1 = T[i],
    p2 = T[i + 1],
    p3 = T[Math.min(n - 1, i + 2)];
  const t = (s - p1[0]) / (p2[0] - p1[0] || 1),
    t2 = t * t,
    t3 = t2 * t;
  const out = [];
  for (let k = 1; k < p1.length; k++) {
    const a = p0[k],
      b = p1[k],
      c = p2[k],
      d = p3[k];
    out.push(0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3));
  }
  return out;
}

// Pliegues: una onda irregular de período 2π/n alrededor (de -1 a 1, con
// crestas redondas y valles más hondos)
export function folds(t, n, seed = 0) {
  const a = Math.sin(n * t + seed * 1.7),
    b = Math.sin(n * 2.07 * t + seed * 3.1 + 1.3),
    c = Math.sin(n * 0.53 * t + seed * 0.7 + 0.4);
  const f = 0.62 * a + 0.24 * b + 0.14 * c;
  return f > 0 ? f : f * 1.25;
}

// ------------------------------------------------------------ superficies
// Superficie paramétrica: f(u, v) -> [x, y, z] con u y v de 0 a 1 (nu × nv
// tramos). o.closed: u da la vuelta entera (se cosen las normales del primer
// y el último borde); o.poles: [abajo, arriba], las filas v = 0 / v = 1 son un
// punto; o.inside(u, v): un punto del lado de dentro, para poner las caras
// hacia fuera (si no, el centro de todos); o.flip, al revés.
export function surface(f, nu, nv, o = {}) {
  const W = nu + 1;
  const pos = new Float32Array(W * (nv + 1) * 3),
    uv = new Float32Array(W * (nv + 1) * 2);
  let k = 0,
    q = 0;
  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    for (let i = 0; i <= nu; i++) {
      const u = i / nu;
      const p = f(o.closed && i === nu ? 0 : u, v);
      pos[k++] = p[0];
      pos[k++] = p[1];
      pos[k++] = p[2];
      uv[q++] = u * (o.uk ?? 1);
      uv[q++] = v * (o.vk ?? 1);
    }
  }
  const idx = [];
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * W + i,
        b = a + W;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // ¿hacia fuera?
  const N = g.attributes.normal;
  let cx = 0,
    cy = 0,
    cz = 0;
  if (!o.inside) {
    for (let i = 0; i < pos.length; i += 3) {
      cx += pos[i];
      cy += pos[i + 1];
      cz += pos[i + 2];
    }
    const m = pos.length / 3;
    cx /= m;
    cy /= m;
    cz /= m;
  }
  let s = 0;
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++) {
      const n = j * W + i;
      let c = [cx, cy, cz];
      if (o.inside) c = o.inside(i / nu, j / nv);
      s += N.getX(n) * (pos[n * 3] - c[0]) + N.getY(n) * (pos[n * 3 + 1] - c[1]) + N.getZ(n) * (pos[n * 3 + 2] - c[2]);
    }
  if ((s < 0) !== !!o.flip) {
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  // las normales de la costura y de los polos, comunes
  const nm = g.attributes.normal;
  const avg = (list) => {
    let x = 0,
      y = 0,
      z = 0;
    for (const n of list) {
      x += nm.getX(n);
      y += nm.getY(n);
      z += nm.getZ(n);
    }
    const l = Math.hypot(x, y, z) || 1;
    for (const n of list) nm.setXYZ(n, x / l, y / l, z / l);
  };
  if (o.closed) for (let j = 0; j <= nv; j++) avg([j * W, j * W + nu]);
  const poles = o.poles || [false, false];
  if (poles[0]) avg(Array.from({ length: W }, (_, i) => i));
  if (poles[1]) avg(Array.from({ length: W }, (_, i) => nv * W + i));
  return g;
}

// normal de una superficie f(u, v) en (u, v), hacia el lado contrario de c
export function surfNormal(f, u, v, c = null, e = 0.004) {
  const a = new V3(...f(Math.min(1, u + e), v)).sub(new V3(...f(Math.max(0, u - e), v)));
  const b = new V3(...f(u, Math.min(1, v + e))).sub(new V3(...f(u, Math.max(0, v - e))));
  const n = new V3().crossVectors(a, b).normalize();
  if (c) {
    const p = f(u, v);
    if (n.x * (p[0] - c[0]) + n.y * (p[1] - c[1]) + n.z * (p[2] - c[2]) < 0) n.negate();
  }
  return [n.x, n.y, n.z];
}

// ------------------------------------------------------------ troncos
// Un tronco a lo largo de un camino (lista de puntos, suavizada): r(s, a) da
// [ancho, fondo] (semiejes; o un número) a lo largo (s de 0 a 1) y alrededor
// (a, desde el fondo hacia el ancho); el fondo mira hacia o.up (proyectado;
// [0, 0, 1] si no) o hacia o.upFn(s) en cada punto. o.n tramos a lo largo,
// o.seg alrededor; o.caps: cierra los extremos en punta redonda (los radios
// van a cero en los últimos o.capL metros).
export function tube(points, r, o = {}) {
  const P = points.map((p) => new V3(p[0], p[1], p[2]));
  const curve = P.length > 2 ? new THREE.CatmullRomCurve3(P, false, 'centripetal') : new THREE.LineCurve3(P[0], P[1]);
  const n = o.n ?? 10,
    seg = o.seg ?? 8;
  const len = curve.getLength();
  const C = [],
    T = [],
    N = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    C.push(curve.getPointAt(s));
    T.push(curve.getTangentAt(s).normalize());
  }
  const proj = (up, t) => {
    const v = up.clone().sub(t.clone().multiplyScalar(up.dot(t)));
    if (v.lengthSq() < 1e-8) {
      const alt = Math.abs(t.x) < 0.9 ? new V3(1, 0, 0) : new V3(0, 1, 0);
      return alt.sub(t.clone().multiplyScalar(alt.dot(t))).normalize();
    }
    return v.normalize();
  };
  if (o.upFn) for (let i = 0; i <= n; i++) N.push(proj(new V3(...o.upFn(i / n)), T[i]));
  else {
    N.push(proj(new V3(...(o.up || [0, 0, 1])), T[0]));
    for (let i = 1; i <= n; i++) {
      const q = new THREE.Quaternion().setFromUnitVectors(T[i - 1], T[i]);
      N.push(proj(N[i - 1].clone().applyQuaternion(q), T[i]));
    }
  }
  const B = T.map((t, i) => new V3().crossVectors(t, N[i]).normalize());
  const capL = o.capL ?? 0;
  const capK = (s) => {
    if (!o.caps || capL <= 0) return 1;
    const d = Math.min(s, 1 - s) * len;
    if (d >= capL) return 1;
    const x = 1 - d / capL;
    return Math.sqrt(Math.max(0, 1 - x * x));
  };
  const g = surface(
    (u, v) => {
      const i = Math.round(v * n);
      const a = u * TAU;
      let rr = typeof r === 'function' ? r(v, a) : r;
      let rx, ry;
      if (Array.isArray(rr)) [rx, ry] = rr;
      else rx = ry = rr;
      const m = (o.mod ? o.mod(a, v) : 1) * capK(v);
      const ca = Math.cos(a) * ry * m,
        sa = Math.sin(a) * rx * m;
      const c = C[i],
        nn = N[i],
        bb = B[i];
      return [c.x + nn.x * ca + bb.x * sa, c.y + nn.y * ca + bb.y * sa, c.z + nn.z * ca + bb.z * sa];
    },
    seg,
    n,
    {
      closed: true,
      poles: o.caps ? [true, true] : [false, false],
      inside: (u, v) => {
        const c = C[Math.round(v * n)];
        return [c.x, c.y, c.z];
      },
    }
  );
  if (o.caps && capL <= 0) return capEnds(g, seg, n);
  return g;
}
// tapas planas en los dos extremos de un tubo hecho con tube()
function capEnds(g, seg, n) {
  const pos = g.attributes.position;
  const W = seg + 1;
  const parts = [g];
  for (const j of [0, n]) {
    let cx = 0,
      cy = 0,
      cz = 0;
    for (let i = 0; i < seg; i++) {
      const k = j * W + i;
      cx += pos.getX(k);
      cy += pos.getY(k);
      cz += pos.getZ(k);
    }
    cx /= seg;
    cy /= seg;
    cz /= seg;
    const p = [cx, cy, cz];
    const uv = [0.5, 0.5];
    const idx = [];
    for (let i = 0; i < seg; i++) {
      const k = j * W + i;
      p.push(pos.getX(k), pos.getY(k), pos.getZ(k));
      uv.push(0.5 + 0.5 * Math.cos((i / seg) * TAU), 0.5 + 0.5 * Math.sin((i / seg) * TAU));
    }
    for (let i = 0; i < seg; i++) idx.push(0, 1 + i, 1 + ((i + 1) % seg));
    const c = new THREE.BufferGeometry();
    c.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    c.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    c.setIndex(idx);
    c.computeVertexNormals();
    // hacia fuera: contra el tubo
    const k1 = (j === 0 ? 1 : n - 1) * W;
    const dx = pos.getX(k1) - cx,
      dy = pos.getY(k1) - cy,
      dz = pos.getZ(k1) - cz;
    const nn = c.attributes.normal;
    if (nn.getX(0) * dx + nn.getY(0) * dy + nn.getZ(0) * dz > 0) {
      for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
      c.setIndex(idx);
      c.computeVertexNormals();
    }
    parts.push(c);
  }
  return merge(parts);
}

// ------------------------------------------------------------ telas
// Una tela que cuelga: el borde de arriba, de ancho w, a lo largo de x y
// centrado en el origen; cae h hacia -y. o.flare: cuántas veces más ancha
// abajo; o.folds: [cuántos, hondo] (más hondos abajo); o.wrap: radio con el
// que envuelve algo que tiene detrás (el centro de la curva hacia -z);
// o.out(v, u): cuánto se aparta hacia +z al caer; o.hem(u): cuánto más larga
// (en partes de h) en cada punto del borde de abajo; o.top(u): cuánto baja
// (en metros) el borde de arriba. Devuelve { geo, at(u, v), n(u, v) }.
export function cloth(w, h, o = {}) {
  const [nf, fd] = o.folds || [0, 0];
  const seed = o.seed ?? 0;
  const at = (u, v) => {
    const top = o.top ? o.top(u) : 0;
    const hem = o.hem ? o.hem(u) : 0;
    const y = -top - (h - top) * v * (1 + hem * v * v);
    const wv = w * mix(1, o.flare ?? 1, v);
    let x = (u - 0.5) * wv;
    let z = (o.out ? o.out(v, u) : 0) + (nf ? folds(u * TAU, nf, seed) * fd * mix(0.2, 1, v) : 0);
    if (o.wrap) {
      const R = o.wrap,
        a = x / R,
        rr = R + z;
      x = Math.sin(a) * rr;
      z = Math.cos(a) * rr - R;
    }
    return [x, y, z];
  };
  const inside = (u, v) => {
    const p = at(u, v);
    return o.wrap ? [0, p[1], -o.wrap] : [p[0], p[1], p[2] - 1];
  };
  const geo = surface(at, o.nu ?? 16, o.nv ?? 10, { inside });
  return { geo, at, n: (u, v) => surfNormal(at, u, v, inside(u, v)) };
}

// Un faldón alrededor del eje y: r(t, v) (t: el ángulo desde +z hacia +x; v
// de 0 abajo a 1 arriba) desde y0(t) (o un número) hasta y1; o.t0, o.t1 si
// está abierto; o.zs: aplastado de delante a atrás; o.cz(v): desplazado
// hacia +z. Devuelve { geo, at(t, v), n(t, v) }.
export function skirt(r, y0, y1, o = {}) {
  const t0 = o.t0 ?? -Math.PI,
    t1 = o.t1 ?? Math.PI;
  const full = Math.abs(t1 - t0 - TAU) < 1e-6;
  const zs = o.zs ?? 1;
  const at = (t, v) => {
    const ya = typeof y0 === 'function' ? y0(t) : y0;
    const y = mix(ya, y1, v);
    const rr = r(t, v);
    return [Math.sin(t) * rr, y, Math.cos(t) * rr * zs + (o.cz ? o.cz(v) : 0)];
  };
  const fu = (u, v) => at(t0 + (t1 - t0) * u, v);
  const geo = surface(fu, o.nt ?? 32, o.nv ?? 8, {
    closed: full,
    poles: [false, !!o.closeTop],
    inside: (u, v) => [0, fu(u, v)[1], o.cz ? o.cz(v) : 0],
  });
  return {
    geo,
    at,
    n: (t, v) => {
      const f = (a, b) => at(a, b);
      const e = 0.01;
      const a = new V3(...f(t + e, v)).sub(new V3(...f(t - e, v)));
      const b = new V3(...f(t, Math.min(1, v + e))).sub(new V3(...f(t, Math.max(0, v - e))));
      const n = new V3().crossVectors(a, b).normalize();
      const p = f(t, v);
      if (n.x * p[0] + n.z * (p[2] - (o.cz ? o.cz(v) : 0)) < 0) n.negate();
      return [n.x, n.y, n.z];
    },
  };
}

// Una cinta pegada a una superficie: sigue los puntos (u, v) de path sobre
// at(u, v) (con su normal n(u, v)), de ancho w y grueso d, un poco por fuera.
export function ribbon(at, nrm, path, w, d, o = {}) {
  const pts = [],
    ups = [];
  const off = o.off ?? d * 0.5 + 0.002;
  const steps = o.steps ?? Math.max(2, path.length);
  // (se remuestrea el camino en (u, v) para que siga la curva)
  const P = path.length > 2 ? new THREE.CatmullRomCurve3(path.map((q) => new V3(q[0], q[1], 0))) : new THREE.LineCurve3(new V3(path[0][0], path[0][1], 0), new V3(path[1][0], path[1][1], 0));
  for (let i = 0; i <= steps; i++) {
    const q = P.getPoint(i / steps);
    const p = at(q.x, q.y),
      n = nrm(q.x, q.y);
    pts.push([p[0] + n[0] * off, p[1] + n[1] * off, p[2] + n[2] * off]);
    ups.push(n);
  }
  return tube(pts, [w / 2, d / 2], { n: steps, seg: 4, upFn: (s) => ups[Math.round(s * steps)], mod: (a) => 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))) ** 0.6 });
}

// ------------------------------------------------------------ cabezas
// El perfil de una cabeza, de la barbilla (y = 0) a la coronilla: lo que sale
// la cara por delante (zf), el cráneo por detrás (zb) y el medio ancho
// delante (wf) y detrás (wb), en metros
const HEAD = [
  // y      zf     zb      wf     wb
  [0.0, 0.066, -0.0, 0.022, 0.03],
  [0.018, 0.084, -0.022, 0.034, 0.05],
  [0.042, 0.083, -0.05, 0.046, 0.066],
  [0.06, 0.088, -0.066, 0.05, 0.07],
  [0.074, 0.089, -0.076, 0.054, 0.072],
  [0.088, 0.094, -0.083, 0.058, 0.074],
  [0.104, 0.094, -0.089, 0.066, 0.076],
  [0.13, 0.091, -0.096, 0.074, 0.079],
  [0.152, 0.088, -0.1, 0.078, 0.081],
  [0.172, 0.093, -0.102, 0.08, 0.082],
  [0.2, 0.087, -0.099, 0.08, 0.08],
  [0.224, 0.068, -0.086, 0.072, 0.071],
  [0.242, 0.038, -0.058, 0.05, 0.05],
  [0.253, 0.0, -0.0, 0.0, 0.0],
];
// Una cabeza (la cara hacia +z; o.y0: la barbilla, sobre la articulación).
// Proporciones: s (todo), w (ancho), d (fondo), h (alto), jaw (lo que
// estrecha la quijada: 1, nada). Rasgos (en metros): brow (las cejas),
// socket (las cuencas), nose (lo que sale la punta), noseW (lo ancha),
// hook (nariz ganchuda), cheek (pómulos), gaunt (mejillas y sienes
// hundidas), chin, mouth, lips, ears; pelo: crown (lo que abulta), tonsure
// (la coronilla rapada); barba: beard (lo que abulta), beardLen (lo que
// cuelga), fork (partida).
export function head(o = {}) {
  const F = { s: 1, w: 1, d: 1, h: 1, jaw: 1, y0: -0.012, z0: 0, brow: 0.008, socket: 0.011, nose: 0.026, noseW: 1, hook: 0, cheek: 0.005, gaunt: 0, chin: 0.006, mouth: 0.004, lips: 0.003, ears: 0.018, crown: 0, tonsure: 0, beard: 0, beardLen: 0, fork: 0, ...o };
  const S = F.s;
  const prof = (y) => table(HEAD, y);
  const TOP = 0.253;
  // u: alrededor (más denso por delante); v: de abajo arriba
  const th = (u) => {
    const x = 2 * u - 1;
    return Math.PI * x * (0.32 + 0.68 * x * x);
  };
  const yv = (v) => {
    const x = 2 * v - 1;
    return TOP * (0.5 + 0.5 * x * (0.6 + 0.4 * x * x));
  };
  const f = (u, v) => {
    const t = th(u);
    // (abajo, bajo la quijada, se cierra hacia un punto)
    const close = sstep(0.07, 0.0, v);
    let y = yv(Math.max(v, 0.035));
    const [zf, zb, wf0, wb0] = prof(y);
    const jawK = mix(1, F.jaw, sstep(0.12, 0.02, y));
    const wf = wf0 * F.w * jawK,
      wb = wb0 * F.w * mix(1, F.jaw, sstep(0.1, 0.0, y) * 0.6);
    const c = Math.cos(t),
      sn = Math.sin(t);
    const front = c > 0;
    const n = front ? 2.7 : 2.2;
    const ex = 2 / n;
    const sx = Math.sign(sn) * Math.pow(Math.abs(sn), ex),
      cz = Math.sign(c) * Math.pow(Math.abs(c), ex);
    // (el ancho pasa de delante a detrás por los lados)
    const w = mix(wb, wf, sstep(-0.3, 0.3, c));
    let x = sx * w;
    let z = cz * (front ? zf * F.d : -zb * F.d);
    // ------------------------------------------------ los rasgos
    const fr = front ? Math.pow(c, 0.5) : 0;
    const gx = (x0, sxx, y0, syy) => Math.exp(-(((x - x0) / sxx) ** 2) - (((y - y0) / syy) ** 2));
    let dz = 0,
      dx = 0;
    // las cejas y las cuencas
    dz += F.brow * Math.exp(-((x / 0.055) ** 4)) * Math.exp(-(((y - 0.172) / 0.012) ** 2)) * fr;
    dz -= F.socket * (gx(0.031, 0.017, 0.153, 0.012) + gx(-0.031, 0.017, 0.153, 0.012)) * fr;
    // la nariz: del entrecejo (0.165) a la punta (0.11), y debajo se corta
    if (y > 0.094 && y < 0.17) {
      const k = sstep(0.168, 0.112, y);
      const under = y < 0.108 ? sstep(0.094, 0.108, y) : 1;
      const wN = (0.008 + 0.012 * k) * F.noseW;
      dz += (0.006 + (F.nose - 0.006) * k * k) * under * Math.exp(-((x / wN) ** 2)) * fr;
      dz += F.hook * Math.exp(-(((y - 0.142) / 0.012) ** 2)) * Math.exp(-((x / 0.01) ** 2)) * fr;
    }
    // pómulos, mejillas, sienes
    dz += F.cheek * (gx(0.056, 0.02, 0.135, 0.016) + gx(-0.056, 0.02, 0.135, 0.016)) * fr;
    dx += Math.sign(x) * F.cheek * 0.6 * gx(Math.sign(x) * 0.07, 0.02, 0.135, 0.016);
    dz -= F.gaunt * (gx(0.05, 0.02, 0.096, 0.022) + gx(-0.05, 0.02, 0.096, 0.022)) * fr;
    dx -= Math.sign(x) * F.gaunt * 0.7 * (gx(Math.sign(x) * 0.075, 0.025, 0.19, 0.025) + gx(Math.sign(x) * 0.062, 0.02, 0.1, 0.02));
    // la boca, los labios, la barbilla
    dz -= F.mouth * Math.exp(-((x / 0.022) ** 4)) * Math.exp(-(((y - 0.072) / 0.0045) ** 2)) * fr;
    dz += F.lips * Math.exp(-((x / 0.02) ** 4)) * (Math.exp(-(((y - 0.08) / 0.007) ** 2)) + 0.7 * Math.exp(-(((y - 0.063) / 0.007) ** 2))) * fr;
    dz += F.chin * gx(0, 0.022, 0.025, 0.018) * fr;
    // las orejas
    if (Math.abs(sn) > 0.6) dx += Math.sign(x) * F.ears * Math.exp(-(((y - 0.14) / 0.026) ** 2)) * Math.exp(-(((z + 0.012) / 0.02) ** 2));
    // el pelo
    if (F.crown) {
      const hair = sstep(0.12, 0.2, y) * (front ? sstep(0.4, 0.0, c) + sstep(0.2, 0.23, y) : 1) + (front ? 0 : sstep(0.05, 0.12, y));
      const sh = F.tonsure ? sstep(0.244, 0.226, y) : 1;
      const k = Math.min(1, hair) * sh * F.crown;
      const r = Math.hypot(x, z) || 1;
      x += (x / r) * k;
      z += (z / r) * k;
      y += k * sstep(0.2, 0.25, y);
    }
    // la barba: abulta la quijada y cuelga por delante
    if (F.beard || F.beardLen) {
      const bz = sstep(0.11, 0.07, y) * sstep(-0.6, 0.1, c);
      const r = Math.hypot(x, z) || 1;
      x += (x / r) * F.beard * bz;
      z += (z / r) * F.beard * bz + F.beard * 0.5 * bz * Math.max(0, c);
      const hang = sstep(0.06, -0.01, y) * Math.exp(-((t / 1.1) ** 2)) * (1 - F.fork * Math.exp(-((x / 0.012) ** 2)));
      y -= F.beardLen * hang;
      z += F.beardLen * 0.3 * hang;
    }
    x += dx;
    z += dz;
    // (abajo se cierra)
    if (close > 0) {
      x *= 1 - close;
      z = mix(z, 0.01, close);
      y = mix(y, 0.03, close);
    }
    return [x * S, (y + F.y0 / S) * S * F.h, (z + F.z0 / S) * S];
  };
  return surface(f, o.nu ?? 34, o.nv ?? 26, { closed: true, poles: [true, true], inside: () => [0, 0.12 * S + F.y0, F.z0] });
}

// ------------------------------------------------------------ manos
// Una mano en el espacio de su articulación (la muñeca; los dedos hacia -y,
// la palma hacia dentro: -x en la izquierda, side = 1; +x en la derecha,
// side = -1; el pulgar hacia +z). o.curl: de 0 (abierta) a 1 (puño), o.spread
// (abiertos en abanico), o.len (largo de los dedos), o.thick, o.thumb (de 0,
// pegado, a 1, abierto), o.claw (las puntas dobladas hacia dentro).
export function hand(o = {}) {
  const sx = o.side ?? 1;
  const k = o.k ?? 1;
  const curl = o.curl ?? 0.25,
    spread = o.spread ?? 0.3,
    L = (o.len ?? 1) * k,
    th = (o.thick ?? 1) * k;
  const parts = [];
  // la palma: un tronco plano de la muñeca a los nudillos
  parts.push(
    tube(
      [
        [0, 0.005 * k, 0],
        [-sx * 0.004 * k, -0.045 * k, 0.003 * k],
        [-sx * 0.006 * k, -0.088 * k, 0.002 * k],
      ],
      (s) => [mix(0.03, 0.043, sstep(0, 0.6, s)) * k, mix(0.017, 0.014, s) * th],
      { up: [1, 0, 0], n: 4, seg: 8, caps: true }
    )
  );
  // los dedos: de delante (índice, +z) a atrás (meñique)
  const F = [
    [0.03, 1.0, 0.0105],
    [0.01, 1.08, 0.011],
    [-0.01, 1.0, 0.0105],
    [-0.029, 0.8, 0.0095],
  ];
  F.forEach(([z0, l, r], fi) => {
    const fan = (fi - 1.5) * spread * 0.12;
    const segs = [0.045 * l * L, 0.03 * l * L, 0.024 * l * L];
    let p = new V3(-sx * 0.006 * k, -0.088 * k, z0 * k);
    let dir = new V3(0, -1, fan).normalize();
    const pts = [[p.x, p.y, p.z]];
    const bend = [0.35 + curl * 1.05, 0.25 + curl * 1.25 + (o.claw ?? 0), 0.2 + curl * 0.9 + (o.claw ?? 0) * 1.4];
    for (let s = 0; s < 3; s++) {
      // se dobla hacia la palma (alrededor del eje z)
      dir.applyAxisAngle(new V3(0, 0, 1), -sx * bend[s] * 0.5);
      p = p.clone().add(dir.clone().multiplyScalar(segs[s]));
      pts.push([p.x, p.y, p.z]);
    }
    parts.push(tube(pts, (s) => r * mix(1, 0.72, s) * th, { n: 5, seg: 5, caps: true, capL: 0.006 * k, up: [1, 0, 0] }));
  });
  // el pulgar
  {
    const tO = o.thumb ?? 0.5;
    const pts = [
      [-sx * 0.012 * k, -0.02 * k, 0.03 * k],
      [-sx * (0.024 + 0.008 * tO) * k, -0.05 * k, (0.05 + 0.012 * tO) * k],
      [-sx * (0.03 + 0.012 * tO + curl * 0.012) * k, -0.08 * k, (0.058 + 0.008 * tO - curl * 0.018) * k],
    ];
    parts.push(tube(pts, (s) => 0.012 * mix(1, 0.75, s) * th, { n: 4, seg: 5, caps: true, capL: 0.006 * k, up: [1, 0, 0] }));
  }
  return merge(parts);
}

// ------------------------------------------------------------ utilidades
// fusiona geometrías (con o sin índice) en una
export function merge(list) {
  const gs = list.filter(Boolean).map((g) => {
    const h = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(h.attributes)) if (!['position', 'normal', 'uv'].includes(k)) h.deleteAttribute(k);
    if (!h.attributes.uv) h.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(h.attributes.position.count * 2), 2));
    if (!h.attributes.normal) h.computeVertexNormals();
    return h;
  });
  return gs.length === 1 ? gs[0] : mergeGeometries(gs);
}
// una geometría colocada: posición, giro (grados) y escala
export function place(g, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(new V3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0] * (Math.PI / 180), r[1] * (Math.PI / 180), r[2] * (Math.PI / 180))), new V3(...(Array.isArray(s) ? s : [s, s, s])));
  return g.clone().applyMatrix4(m);
}
// caja, cilindro, esfera, toro y cono como geometrías (para componer)
export const gBox = (w, h, d, p, r, s) => place(new THREE.BoxGeometry(w, h, d), p, r, s);
export const gCyl = (r0, r1, h, seg, p, r, s) => place(new THREE.CylinderGeometry(r1, r0, h, seg || 8), p, r, s);
export const gSph = (rad, p, s, seg = 10, seg2 = 8) => place(new THREE.SphereGeometry(rad, seg, seg2), p, [0, 0, 0], s);
export const gTorus = (R, rt, p, r, seg = 12, seg2 = 5) => place(new THREE.TorusGeometry(R, rt, seg2, seg), p, r);
export const gCone = (rad, h, seg, p, r) => place(new THREE.ConeGeometry(rad, h, seg || 6), p, r);
// una cadena de eslabones de a a b (n eslabones de radio R y grueso t)
export function chain(a, b, n, R, t, sag = 0) {
  const A = new V3(...a),
    Bv = new V3(...b);
  const out = [];
  for (let i = 0; i < n; i++) {
    const s0 = i / n,
      s1 = (i + 1) / n;
    const p0 = A.clone().lerp(Bv, s0),
      p1 = A.clone().lerp(Bv, s1);
    p0.y -= sag * 4 * s0 * (1 - s0);
    p1.y -= sag * 4 * s1 * (1 - s1);
    const mid = p0.clone().add(p1).multiplyScalar(0.5);
    const dir = p1.clone().sub(p0);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir.normalize());
    const g = new THREE.TorusGeometry(R, t, 4, 8);
    g.scale(1, Math.max(1, (len * 0.62) / R), 1);
    if (i % 2) g.rotateY(Math.PI / 2);
    g.applyQuaternion(q);
    g.translate(mid.x, mid.y, mid.z);
    out.push(g);
  }
  return merge(out);
}
