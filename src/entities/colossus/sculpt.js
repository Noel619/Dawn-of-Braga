// Escultor de carne para los colosos.
//
// Los cuerpos se describen como superficies implícitas (campos de distancia
// con signo): elipsoides, conos redondeados, cajas romas y toros que se funden
// unos con otros con una unión suave (la carne se continúa de un miembro a
// otro, sin juntas), con tallas que restan (bocas, heridas, cuencas) y un
// relieve de ruido (bultos, pliegues y venas). El campo se muestrea en una
// rejilla y se convierte en malla con «surface nets» (un vértice por celda
// cortada por la superficie), que después se proyecta sobre la superficie
// exacta. Cada vértice lleva:
//   color      -> oclusión ambiental calculada con el propio campo (los
//                 pliegues y las axilas se oscurecen) por el matiz esculpido
//   skinIndex/skinWeight -> los huesos de las primitivas cercanas (la malla se
//                 anima con un esqueleto y la carne se dobla en las uniones)
//   material   -> el de la primitiva dominante, con un borde roto por ruido
//                 (piel que se rasga y deja ver la carne)
// Para que no tarde: las primitivas se reparten en cubos de la rejilla (cada
// punto sólo mira las que tiene cerca) y el ruido sólo se calcula cerca de
// la superficie.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { partGeometry } from '../rig.js';
import { colMat } from '../../gfx/materials.js';

const DEG = Math.PI / 180;

// ======================================================================= ruido
// Perlin mejorado (determinista).
const PERM = new Uint8Array(512);
{
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = 1337;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}
function grad(h, x, y, z) {
  switch (h & 15) {
    case 0:
      return x + y;
    case 1:
      return -x + y;
    case 2:
      return x - y;
    case 3:
      return -x - y;
    case 4:
      return x + z;
    case 5:
      return -x + z;
    case 6:
      return x - z;
    case 7:
      return -x - z;
    case 8:
      return y + z;
    case 9:
      return -y + z;
    case 10:
      return y - z;
    case 11:
      return -y - z;
    case 12:
      return y + x;
    case 13:
      return -y + z;
    case 14:
      return y - x;
    default:
      return -y - z;
  }
}
export function perlin(x, y, z) {
  const X = Math.floor(x),
    Y = Math.floor(y),
    Z = Math.floor(z);
  x -= X;
  y -= Y;
  z -= Z;
  const xi = X & 255,
    yi = Y & 255,
    zi = Z & 255;
  const u = x * x * x * (x * (x * 6 - 15) + 10),
    v = y * y * y * (y * (y * 6 - 15) + 10),
    w = z * z * z * (z * (z * 6 - 15) + 10);
  const A = PERM[xi] + yi,
    AA = PERM[A] + zi,
    AB = PERM[A + 1] + zi,
    B = PERM[xi + 1] + yi,
    BA = PERM[B] + zi,
    BB = PERM[B + 1] + zi;
  const l1 = grad(PERM[AA], x, y, z),
    l2 = grad(PERM[BA], x - 1, y, z),
    l3 = grad(PERM[AB], x, y - 1, z),
    l4 = grad(PERM[BB], x - 1, y - 1, z),
    l5 = grad(PERM[AA + 1], x, y, z - 1),
    l6 = grad(PERM[BA + 1], x - 1, y, z - 1),
    l7 = grad(PERM[AB + 1], x, y - 1, z - 1),
    l8 = grad(PERM[BB + 1], x - 1, y - 1, z - 1);
  const a = l1 + u * (l2 - l1),
    b = l3 + u * (l4 - l3),
    c = l5 + u * (l6 - l5),
    d = l7 + u * (l8 - l7);
  const e = a + v * (b - a),
    f = c + v * (d - c);
  return e + w * (f - e);
}
export function fbm(x, y, z, oct = 3) {
  let s = 0,
    a = 0.5,
    f = 1,
    n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * perlin(x * f + i * 17.3, y * f - i * 9.1, z * f + i * 4.7);
    n += a;
    a *= 0.5;
    f *= 2.07;
  }
  return s / n;
}

// ======================================================================= utilidades
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smin = (a, b, k) => {
  if (k <= 0) return a < b ? a : b;
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
const smax = (a, b, k) => -smin(-a, -b, k);
function rotInv(r) {
  // matriz 3×3 inversa (traspuesta) de la rotación Euler XYZ en grados
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler((r[0] || 0) * DEG, (r[1] || 0) * DEG, (r[2] || 0) * DEG));
  const e = m.elements; // columna mayor
  // R = [e0 e4 e8; e1 e5 e9; e2 e6 e10]; inversa = traspuesta
  return [e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10]];
}

// ======================================================================= escultor
const FAR = 1e9;

export class Sculpt {
  // cell: tamaño de celda (m). noise: { amp, freq, oct, lump, lumpFreq, vein, veinFreq }
  constructor(o = {}) {
    this.cell = o.cell || 0.4;
    this.noise = { amp: 0.1, freq: 0.6, oct: 3, lump: 0.25, lumpFreq: 0.12, vein: 0.05, veinFreq: 0.35, ...(o.noise || {}) };
    this.prims = [];
    this.subs = [];
    this.mats = [];
    this.bones = o.bones || null; // nombre -> índice
    this.ao = { dist: o.aoDist ?? this.cell * 8, strength: o.aoStrength ?? 1.0 };
    this.seed = o.seed || 0;
    this.matNoise = o.matNoise ?? 0.6;
    this.matFreq = o.matFreq ?? 0.9;
    // manchas grandes en el color: [{ freq, color: [r,g,b], amt, thr }]
    this.macro = o.macro || null;
  }
  _matIndex(m) {
    let i = this.mats.indexOf(m);
    if (i < 0) {
      this.mats.push(m);
      i = this.mats.length - 1;
    }
    return i;
  }
  _add(p, o) {
    p.k = o.k ?? this.cell * 3;
    p.bone = o.bone ?? 'root';
    p.mat = this._matIndex(o.mat || 'flesh');
    p.tint = o.tint || [1, 1, 1];
    p.n = o.n ?? 1; // multiplicador del relieve
    p.vn = o.vn ?? 1; // multiplicador de las venas
    p.w = o.w ?? 1; // peso para la piel
    p.sub = !!o.sub;
    (p.sub ? this.subs : this.prims).push(p);
    return p;
  }
  // elipsoide: c centro, r radios, rot (grados)
  ell(c, r, o = {}) {
    if (typeof r === 'number') r = [r, r, r];
    const p = { t: 0, cx: c[0], cy: c[1], cz: c[2], rx: r[0], ry: r[1], rz: r[2], m: rotInv(o.rot || [0, 0, 0]) };
    p.bound = Math.max(r[0], r[1], r[2]);
    p.aabb = [c[0] - p.bound, c[1] - p.bound, c[2] - p.bound, c[0] + p.bound, c[1] + p.bound, c[2] + p.bound];
    return this._add(p, o);
  }
  // cono redondeado entre a (radio ra) y b (radio rb)
  rc(a, b, ra, rb = ra, o = {}) {
    const bax = b[0] - a[0],
      bay = b[1] - a[1],
      baz = b[2] - a[2];
    const l2 = bax * bax + bay * bay + baz * baz || 1e-6;
    const rr = ra - rb;
    const p = { t: 1, ax: a[0], ay: a[1], az: a[2], bax, bay, baz, l2, rr, a2: l2 - rr * rr, il2: 1 / l2, r1: ra, r2: rb };
    const R = Math.max(ra, rb);
    p.aabb = [Math.min(a[0], b[0]) - R, Math.min(a[1], b[1]) - R, Math.min(a[2], b[2]) - R, Math.max(a[0], b[0]) + R, Math.max(a[1], b[1]) + R, Math.max(a[2], b[2]) + R];
    return this._add(p, o);
  }
  // caja roma: c centro, s semilados, round radio de canto
  box(c, s, o = {}) {
    const rd = o.round ?? Math.min(s[0], s[1], s[2]) * 0.3;
    const p = { t: 2, cx: c[0], cy: c[1], cz: c[2], hx: s[0] - rd, hy: s[1] - rd, hz: s[2] - rd, rd, m: rotInv(o.rot || [0, 0, 0]) };
    const R = Math.hypot(s[0], s[1], s[2]);
    p.aabb = [c[0] - R, c[1] - R, c[2] - R, c[0] + R, c[1] + R, c[2] + R];
    return this._add(p, o);
  }
  // toro: eje local Y; R radio mayor, r del tubo
  torus(c, R, r, o = {}) {
    const p = { t: 3, cx: c[0], cy: c[1], cz: c[2], R, r, m: rotInv(o.rot || [0, 0, 0]) };
    const B = R + r;
    p.aabb = [c[0] - B, c[1] - B, c[2] - B, c[0] + B, c[1] + B, c[2] + B];
    return this._add(p, o);
  }
  // tubo por una polilínea de puntos con radio en cada punto (conos encadenados)
  tube(pts, radii, o = {}) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const bone = Array.isArray(o.bones) ? o.bones[Math.min(i, o.bones.length - 1)] : o.bone;
      out.push(this.rc(pts[i], pts[i + 1], radii[i], radii[i + 1], { ...o, bone, k: o.k ?? Math.min(radii[i], radii[i + 1]) * 0.6 }));
    }
    return out;
  }

  // desplaza las primitivas [i0, i1) (y las tallas [j0, j1)) en (dx, dy, dz)
  shift(i0, i1, j0, j1, dx, dy, dz) {
    const mv = (p) => {
      if (p.t === 1) {
        p.ax += dx;
        p.ay += dy;
        p.az += dz;
      } else {
        p.cx += dx;
        p.cy += dy;
        p.cz += dz;
      }
      p.aabb = [p.aabb[0] + dx, p.aabb[1] + dy, p.aabb[2] + dz, p.aabb[3] + dx, p.aabb[4] + dy, p.aabb[5] + dz];
    };
    for (let i = i0; i < i1; i++) mv(this.prims[i]);
    for (let j = j0; j < j1; j++) mv(this.subs[j]);
  }
  // distancia a una primitiva
  _d(p, x, y, z) {
    switch (p.t) {
      case 0: {
        const dx = x - p.cx,
          dy = y - p.cy,
          dz = z - p.cz;
        const m = p.m;
        const lx = (m[0] * dx + m[3] * dy + m[6] * dz) / p.rx,
          ly = (m[1] * dx + m[4] * dy + m[7] * dz) / p.ry,
          lz = (m[2] * dx + m[5] * dy + m[8] * dz) / p.rz;
        const k0 = Math.sqrt(lx * lx + ly * ly + lz * lz);
        const k1 = Math.sqrt((lx * lx) / (p.rx * p.rx) + (ly * ly) / (p.ry * p.ry) + (lz * lz) / (p.rz * p.rz));
        return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(p.rx, p.ry, p.rz);
      }
      case 1: {
        // sdRoundCone (Íñigo Quílez)
        const pax = x - p.ax,
          pay = y - p.ay,
          paz = z - p.az;
        const l2 = p.l2;
        const yy = pax * p.bax + pay * p.bay + paz * p.baz;
        const zz = yy - l2;
        const qx = pax * l2 - p.bax * yy,
          qy = pay * l2 - p.bay * yy,
          qz = paz * l2 - p.baz * yy;
        const x2 = qx * qx + qy * qy + qz * qz;
        const y2 = yy * yy * l2;
        const z2 = zz * zz * l2;
        const k = Math.sign(p.rr) * p.rr * p.rr * x2;
        if (Math.sign(zz) * p.a2 * z2 > k) return Math.sqrt(x2 + z2) * p.il2 - p.r2;
        if (Math.sign(yy) * p.a2 * y2 < k) return Math.sqrt(x2 + y2) * p.il2 - p.r1;
        return (Math.sqrt(x2 * p.a2 * p.il2) + yy * p.rr) * p.il2 - p.r1;
      }
      case 2: {
        const dx = x - p.cx,
          dy = y - p.cy,
          dz = z - p.cz;
        const m = p.m;
        const qx = Math.abs(m[0] * dx + m[3] * dy + m[6] * dz) - p.hx,
          qy = Math.abs(m[1] * dx + m[4] * dy + m[7] * dz) - p.hy,
          qz = Math.abs(m[2] * dx + m[5] * dy + m[8] * dz) - p.hz;
        const ox = Math.max(qx, 0),
          oy = Math.max(qy, 0),
          oz = Math.max(qz, 0);
        return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - p.rd;
      }
      default: {
        const dx = x - p.cx,
          dy = y - p.cy,
          dz = z - p.cz;
        const m = p.m;
        const lx = m[0] * dx + m[3] * dy + m[6] * dz,
          ly = m[1] * dx + m[4] * dy + m[7] * dz,
          lz = m[2] * dx + m[5] * dy + m[8] * dz;
        const q = Math.sqrt(lx * lx + lz * lz) - p.R;
        return Math.sqrt(q * q + ly * ly) - p.r;
      }
    }
  }

  // ------------------------------------------------------------ cubos
  _prepare() {
    const h = this.cell;
    const N = this.noise;
    const relief = N.amp + N.lump + N.vein;
    this.margin = relief + h * 2.5;
    const all = [...this.prims, ...this.subs];
    if (!all.length) throw new Error('Sculpt vacío');
    let mn = [FAR, FAR, FAR],
      mx = [-FAR, -FAR, -FAR];
    for (const p of all) {
      const m = this.margin + p.k + (p.sub ? 0 : relief * (p.n - 1 > 0 ? p.n - 1 : 0));
      p.box = [p.aabb[0] - m, p.aabb[1] - m, p.aabb[2] - m, p.aabb[3] + m, p.aabb[4] + m, p.aabb[5] + m];
      if (p.sub) continue;
      for (let i = 0; i < 3; i++) {
        mn[i] = Math.min(mn[i], p.box[i]);
        mx[i] = Math.max(mx[i], p.box[i + 3]);
      }
    }
    this.x0 = mn[0];
    this.y0 = mn[1];
    this.z0 = mn[2];
    this.nx = Math.ceil((mx[0] - mn[0]) / h) + 2;
    this.ny = Math.ceil((mx[1] - mn[1]) / h) + 2;
    this.nz = Math.ceil((mx[2] - mn[2]) / h) + 2;
    const BS = (this.BS = 6);
    this.bnx = Math.ceil(this.nx / BS);
    this.bny = Math.ceil(this.ny / BS);
    this.bnz = Math.ceil(this.nz / BS);
    const nb = this.bnx * this.bny * this.bnz;
    const lists = new Array(nb),
      subl = new Array(nb);
    const put = (arr, p, idx) => {
      const i0 = Math.max(0, Math.floor((p.box[0] - this.x0) / h / BS)),
        i1 = Math.min(this.bnx - 1, Math.floor((p.box[3] - this.x0) / h / BS));
      const j0 = Math.max(0, Math.floor((p.box[1] - this.y0) / h / BS)),
        j1 = Math.min(this.bny - 1, Math.floor((p.box[4] - this.y0) / h / BS));
      const k0 = Math.max(0, Math.floor((p.box[2] - this.z0) / h / BS)),
        k1 = Math.min(this.bnz - 1, Math.floor((p.box[5] - this.z0) / h / BS));
      for (let k = k0; k <= k1; k++)
        for (let j = j0; j <= j1; j++)
          for (let i = i0; i <= i1; i++) {
            const b = i + j * this.bnx + k * this.bnx * this.bny;
            (arr[b] || (arr[b] = [])).push(idx);
          }
    };
    this.prims.forEach((p, i) => put(lists, p, i));
    this.subs.forEach((p, i) => put(subl, p, i));
    this.blist = lists;
    this.bsub = subl;
    this._dtmp = new Float64Array(this.prims.length);
  }
  _bucket(x, y, z) {
    const h = this.cell,
      BS = this.BS;
    const i = Math.floor((x - this.x0) / h / BS),
      j = Math.floor((y - this.y0) / h / BS),
      k = Math.floor((z - this.z0) / h / BS);
    if (i < 0 || j < 0 || k < 0 || i >= this.bnx || j >= this.bny || k >= this.bnz) return -1;
    return i + j * this.bnx + k * this.bnx * this.bny;
  }

  // Campo completo en (x, y, z). Si info, rellena los pesos por primitiva.
  field(x, y, z, info = null) {
    const b = this._bucket(x, y, z);
    if (b < 0) return FAR;
    const L = this.blist[b];
    if (!L) return FAR;
    const P = this.prims,
      dt = this._dtmp;
    let d = FAR,
      dmin = FAR;
    for (let q = 0; q < L.length; q++) {
      const p = P[L[q]];
      const di = this._d(p, x, y, z);
      dt[L[q]] = di;
      if (di < dmin) dmin = di;
      d = smin(d, di, p.k);
    }
    const N = this.noise;
    // relieve: sólo cerca de la superficie
    if (d < this.margin * 2 && d > -this.margin * 3) {
      let wn = 0,
        wv = 0,
        ws = 0;
      for (let q = 0; q < L.length; q++) {
        const p = P[L[q]];
        const s = Math.max(p.k * 0.5, this.cell * 2);
        const w = Math.exp(-(dt[L[q]] - dmin) / s);
        wn += w * p.n;
        wv += w * p.vn;
        ws += w;
      }
      wn /= ws;
      wv /= ws;
      let disp = 0;
      if (N.lump) disp += N.lump * wn * perlin(x * N.lumpFreq + 31.7, y * N.lumpFreq - 7.3, z * N.lumpFreq + 12.1);
      if (N.amp) disp += N.amp * wn * fbm(x * N.freq, y * N.freq, z * N.freq, N.oct);
      if (N.vein && wv > 0) {
        const r = 1 - Math.abs(perlin(x * N.veinFreq + 5.1, y * N.veinFreq * 0.6, z * N.veinFreq - 2.2));
        const r2 = r * r;
        disp += N.vein * wv * r2 * r2 * r2;
      }
      d -= disp;
    }
    const S = this.bsub[b];
    if (S) for (let q = 0; q < S.length; q++) {
      const p = this.subs[S[q]];
      d = smax(d, -this._d(p, x, y, z), p.k);
    }
    if (info) {
      // pesos por primitiva (para huesos, material y matiz)
      info.n = 0;
      for (let q = 0; q < L.length; q++) {
        const p = P[L[q]];
        const s = Math.max(p.k * 0.5, this.cell * 1.5);
        const w = Math.exp(-(dt[L[q]] - dmin) / s) * p.w;
        if (w < 1e-3) continue;
        info.idx[info.n] = L[q];
        info.w[info.n] = w;
        info.n++;
      }
    }
    return d;
  }

  // ------------------------------------------------------------ malla
  build() {
    const t0 = performance.now();
    this._prepare();
    const { nx, ny, nz, cell: h } = this;
    const G = new Float32Array(nx * ny * nz);
    const BS = this.BS;
    // muestreo por cubos (los vacíos quedan lejos)
    G.fill(FAR);
    for (let bk = 0; bk < this.bnz; bk++)
      for (let bj = 0; bj < this.bny; bj++)
        for (let bi = 0; bi < this.bnx; bi++) {
          const b = bi + bj * this.bnx + bk * this.bnx * this.bny;
          if (!this.blist[b]) continue;
          const i1 = Math.min(nx, (bi + 1) * BS),
            j1 = Math.min(ny, (bj + 1) * BS),
            k1 = Math.min(nz, (bk + 1) * BS);
          for (let k = bk * BS; k < k1; k++)
            for (let j = bj * BS; j < j1; j++)
              for (let i = bi * BS; i < i1; i++) G[i + nx * (j + ny * k)] = this.field(this.x0 + i * h, this.y0 + j * h, this.z0 + k * h);
        }
    const t1 = performance.now();
    // surface nets
    const cx = nx - 1,
      cy = ny - 1,
      cz = nz - 1;
    const vid = new Int32Array(cx * cy * cz).fill(-1);
    const pos = [];
    const EDGES = [
      [0, 1],
      [2, 3],
      [4, 5],
      [6, 7],
      [0, 2],
      [1, 3],
      [4, 6],
      [5, 7],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ];
    const cv = new Float64Array(8);
    const CO = [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [0, 0, 1],
      [1, 0, 1],
      [0, 1, 1],
      [1, 1, 1],
    ];
    for (let k = 0; k < cz; k++)
      for (let j = 0; j < cy; j++)
        for (let i = 0; i < cx; i++) {
          let mask = 0;
          for (let c = 0; c < 8; c++) {
            const v = G[i + CO[c][0] + nx * (j + CO[c][1] + ny * (k + CO[c][2]))];
            cv[c] = v;
            if (v < 0) mask |= 1 << c;
          }
          if (mask === 0 || mask === 255) continue;
          let sx = 0,
            sy = 0,
            sz = 0,
            n = 0;
          for (const [a, b] of EDGES) {
            const va = cv[a],
              vb = cv[b];
            if (va < 0 === vb < 0) continue;
            const t = va / (va - vb);
            sx += CO[a][0] + (CO[b][0] - CO[a][0]) * t;
            sy += CO[a][1] + (CO[b][1] - CO[a][1]) * t;
            sz += CO[a][2] + (CO[b][2] - CO[a][2]) * t;
            n++;
          }
          vid[i + cx * (j + cy * k)] = pos.length / 3;
          pos.push(this.x0 + (i + sx / n) * h, this.y0 + (j + sy / n) * h, this.z0 + (k + sz / n) * h);
        }
    // caras: una por arista de la rejilla que cruza la superficie
    const tris = [];
    const cellAt = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= cx || j >= cy || k >= cz ? -1 : vid[i + cx * (j + cy * k)]);
    const quad = (a, b, c, d, outward) => {
      if (a < 0 || b < 0 || c < 0 || d < 0) return;
      // diagonal más corta
      const P = pos;
      const d1 = (P[a * 3] - P[c * 3]) ** 2 + (P[a * 3 + 1] - P[c * 3 + 1]) ** 2 + (P[a * 3 + 2] - P[c * 3 + 2]) ** 2;
      const d2 = (P[b * 3] - P[d * 3]) ** 2 + (P[b * 3 + 1] - P[d * 3 + 1]) ** 2 + (P[b * 3 + 2] - P[d * 3 + 2]) ** 2;
      const T = d1 <= d2 ? [a, b, c, a, c, d] : [a, b, d, b, c, d];
      // orientación: la normal de la cara hacia fuera
      const ax = P[T[1] * 3] - P[T[0] * 3],
        ay = P[T[1] * 3 + 1] - P[T[0] * 3 + 1],
        az = P[T[1] * 3 + 2] - P[T[0] * 3 + 2];
      const bx = P[T[2] * 3] - P[T[0] * 3],
        by = P[T[2] * 3 + 1] - P[T[0] * 3 + 1],
        bz = P[T[2] * 3 + 2] - P[T[0] * 3 + 2];
      const nxv = ay * bz - az * by,
        nyv = az * bx - ax * bz,
        nzv = ax * by - ay * bx;
      const dot = nxv * outward[0] + nyv * outward[1] + nzv * outward[2];
      if (dot < 0) tris.push(T[0], T[2], T[1], T[3], T[5], T[4]);
      else tris.push(...T);
    };
    for (let k = 0; k < nz; k++)
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          const v0 = G[i + nx * (j + ny * k)];
          const in0 = v0 < 0;
          if (i < nx - 1) {
            const v1 = G[i + 1 + nx * (j + ny * k)];
            if (in0 !== v1 < 0) quad(cellAt(i, j - 1, k - 1), cellAt(i, j, k - 1), cellAt(i, j, k), cellAt(i, j - 1, k), in0 ? [1, 0, 0] : [-1, 0, 0]);
          }
          if (j < ny - 1) {
            const v1 = G[i + nx * (j + 1 + ny * k)];
            if (in0 !== v1 < 0) quad(cellAt(i - 1, j, k - 1), cellAt(i, j, k - 1), cellAt(i, j, k), cellAt(i - 1, j, k), in0 ? [0, 1, 0] : [0, -1, 0]);
          }
          if (k < nz - 1) {
            const v1 = G[i + nx * (j + ny * (k + 1))];
            if (in0 !== v1 < 0) quad(cellAt(i - 1, j - 1, k), cellAt(i, j - 1, k), cellAt(i, j, k), cellAt(i - 1, j, k), in0 ? [0, 0, 1] : [0, 0, -1]);
          }
        }
    const t2 = performance.now();
    // proyección sobre la superficie exacta, normales, oclusión, pesos
    const nv = pos.length / 3;
    const P = new Float32Array(pos);
    const Nn = new Float32Array(nv * 3);
    const Cc = new Float32Array(nv * 3);
    const SI = new Uint16Array(nv * 4);
    const SW = new Float32Array(nv * 4);
    const MV = new Int16Array(nv);
    const e = h * 0.35;
    const info = { idx: new Int32Array(this.prims.length), w: new Float64Array(this.prims.length), n: 0 };
    const boneIdx = (name) => {
      if (!this.bones) return 0;
      const i = this.bones[name];
      if (i === undefined) throw new Error('hueso desconocido ' + name);
      return i;
    };
    for (const p of this.prims) p.bi = boneIdx(p.bone);
    const AO = this.ao;
    const nMat = this.mats.length;
    const votes = new Float64Array(nMat);
    const bw = new Map();
    for (let v = 0; v < nv; v++) {
      let x = P[v * 3],
        y = P[v * 3 + 1],
        z = P[v * 3 + 2];
      // gradiente con cuatro muestras (tetraedro) y una proyección
      const tgrad = (x, y, z, out) => {
        const a = this.field(x + e, y - e, z - e),
          b = this.field(x - e, y - e, z + e),
          c = this.field(x - e, y + e, z - e),
          d = this.field(x + e, y + e, z + e);
        out[0] = a - b - c + d;
        out[1] = -a - b + c + d;
        out[2] = -a + b - c + d;
        const l = Math.hypot(out[0], out[1], out[2]) || 1;
        out[0] /= l;
        out[1] /= l;
        out[2] /= l;
        return (a + b + c + d) * 0.25;
      };
      const gg = this._gg || (this._gg = [0, 0, 0]);
      const d0 = tgrad(x, y, z, gg);
      const st = Math.max(-h * 0.6, Math.min(h * 0.6, d0));
      x -= gg[0] * st;
      y -= gg[1] * st;
      z -= gg[2] * st;
      tgrad(x, y, z, gg);
      const gx = gg[0],
        gy = gg[1],
        gz = gg[2];
      P[v * 3] = x;
      P[v * 3 + 1] = y;
      P[v * 3 + 2] = z;
      Nn[v * 3] = gx;
      Nn[v * 3 + 1] = gy;
      Nn[v * 3 + 2] = gz;
      // oclusión (cuánto se mete la superficie en la semiesfera de la normal)
      let occ = 0;
      for (let s = 1; s <= 5; s++) {
        const hh = (AO.dist * s) / 5;
        const dd = this.field(x + gx * hh, y + gy * hh, z + gz * hh);
        occ += ((hh - Math.min(hh, Math.max(dd, -hh))) / hh) * (1 / s);
      }
      const ao = Math.max(0.12, Math.min(1, 1 - occ * 0.42 * AO.strength));
      // pesos: huesos, material, matiz
      this.field(x, y, z, info);
      votes.fill(0);
      bw.clear();
      let tr = 0,
        tg = 0,
        tb = 0,
        ws = 0;
      for (let q = 0; q < info.n; q++) {
        const p = this.prims[info.idx[q]];
        const w = info.w[q];
        votes[p.mat] += w;
        bw.set(p.bi, (bw.get(p.bi) || 0) + w);
        tr += p.tint[0] * w;
        tg += p.tint[1] * w;
        tb += p.tint[2] * w;
        ws += w;
      }
      if (ws <= 0) ws = 1;
      let cr = tr / ws,
        cg = tg / ws,
        cb = tb / ws;
      if (this.macro)
        for (const mc of this.macro) {
          const nn = perlin(x * mc.freq + 11.3, y * mc.freq - 3.1, z * mc.freq + 7.7) * 0.5 + 0.5;
          if (nn <= mc.thr) continue;
          const k = Math.min(1, ((nn - mc.thr) / (1 - mc.thr)) * mc.amt * 2);
          cr += (mc.color[0] - cr) * k;
          cg += (mc.color[1] - cg) * k;
          cb += (mc.color[2] - cb) * k;
        }
      Cc[v * 3] = cr * ao;
      Cc[v * 3 + 1] = cg * ao;
      Cc[v * 3 + 2] = cb * ao;
      // material: votos con un borde roto por ruido
      if (nMat > 1) {
        const mf = this.matFreq;
        const nn = (perlin(x * mf + 3.3, y * mf, z * mf - 1.7) * 0.75 + perlin(x * mf * 2.1, y * mf * 2.1 + 5, z * mf * 2.1) * 0.25) * this.matNoise;
        let best = 0,
          bv = -1;
        for (let m = 0; m < nMat; m++) {
          const s = votes[m] / ws + (m % 2 ? nn : -nn) * 0.5;
          if (s > bv) {
            bv = s;
            best = m;
          }
        }
        MV[v] = best;
      }
      const arr = [...bw.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
      let tw = 0;
      for (const [, w] of arr) tw += w;
      for (let q = 0; q < 4; q++) {
        SI[v * 4 + q] = arr[q] ? arr[q][0] : 0;
        SW[v * 4 + q] = arr[q] ? arr[q][1] / tw : 0;
      }
    }
    const t3 = performance.now();
    // triángulos agrupados por material
    const byMat = Array.from({ length: Math.max(1, nMat) }, () => []);
    for (let t = 0; t < tris.length; t += 3) {
      const a = tris[t],
        b = tris[t + 1],
        c = tris[t + 2];
      let m = MV[a];
      if (MV[b] === MV[c]) m = MV[b];
      byMat[m].push(a, b, c);
    }
    const idx = [];
    const geo = new THREE.BufferGeometry();
    byMat.forEach((L, m) => {
      if (!L.length) return;
      geo.addGroup(idx.length, L.length, m);
      for (const q of L) idx.push(q);
    });
    geo.setIndex(nv > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(Nn, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(nv * 2), 2));
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    this.stats = { verts: nv, tris: idx.length / 3, grid: [nx, ny, nz], ms: [Math.round(t1 - t0), Math.round(t2 - t1), Math.round(t3 - t2), Math.round(performance.now() - t3)] };
    return geo;
  }
}

// ======================================================================= tubos
// Tubo por una curva (Catmull-Rom) con radio variable: dedos, cordones,
// venas, cadenas de carne, pelo. Devuelve geometría con posición, normal,
// uv y color (oclusión hacia los extremos si se pide).
export function tubeGeo(pts, radii, o = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : V(...p))), false, 'centripetal');
  const len = curve.getLength();
  const segs = Math.max(2, Math.round(o.segs ?? len * (o.perM ?? 2)));
  const rad = o.radial ?? 6;
  const frames = curve.computeFrenetFrames(segs, false);
  const R = (t) => {
    const f = t * (radii.length - 1);
    const i = Math.min(radii.length - 2, Math.floor(f));
    const u = f - i;
    return radii[i] + (radii[i + 1] - radii[i]) * u;
  };
  const posA = [],
    norA = [],
    uvA = [],
    colA = [];
  const ring = [];
  for (let s = 0; s <= segs; s++) {
    const t = s / segs;
    const c = curve.getPointAt(t);
    const N = frames.normals[s],
      B = frames.binormals[s];
    const r = R(t) * (o.wobble ? 1 + Math.sin(t * 37 + (o.seed || 0)) * o.wobble : 1);
    const row = [];
    for (let k = 0; k <= rad; k++) {
      const a = (k / rad) * Math.PI * 2 + (o.twist || 0) * t;
      const nx = Math.cos(a) * N.x + Math.sin(a) * B.x,
        ny = Math.cos(a) * N.y + Math.sin(a) * B.y,
        nz = Math.cos(a) * N.z + Math.sin(a) * B.z;
      row.push([c.x + nx * r, c.y + ny * r, c.z + nz * r, nx, ny, nz, k / rad, t * len * (o.uvk ?? 0.5)]);
    }
    ring.push(row);
  }
  const ao = (t) => (o.aoEnds ? Math.min(1, 0.45 + Math.min(t, 1 - t) * 4) : 1) * (o.shade ?? 1);
  for (let s = 0; s < segs; s++)
    for (let k = 0; k < rad; k++) {
      const a = ring[s][k],
        b = ring[s][k + 1],
        c = ring[s + 1][k + 1],
        d = ring[s + 1][k];
      for (const q of [a, d, c, a, c, b]) {
        posA.push(q[0], q[1], q[2]);
        norA.push(q[3], q[4], q[5]);
        uvA.push(q[6], q[7]);
        const sh = ao(s / segs);
        colA.push(sh, sh, sh);
      }
    }
  // tapas
  if (o.cap !== false) {
    for (const [s, sign] of [
      [0, -1],
      [segs, 1],
    ]) {
      if (R(s / segs) < 1e-3) continue;
      const c = curve.getPointAt(s / segs);
      const T = curve.getTangentAt(s / segs).multiplyScalar(sign);
      for (let k = 0; k < rad; k++) {
        const a = ring[s][k],
          b = ring[s][k + 1];
        const tri = sign > 0 ? [a, b] : [b, a];
        for (const q of [[c.x, c.y, c.z], tri[0], tri[1]]) {
          posA.push(q[0], q[1], q[2]);
          norA.push(T.x, T.y, T.z);
          uvA.push(0.5, 0.5);
          colA.push(0.8, 0.8, 0.8);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(posA, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(norA, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvA, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3));
  return g;
}

// Pieza dura (la misma descripción que las de los rigs) con color de vértice
// (oscurece hacia abajo: un remedo de oclusión).
export function hardGeo(pt) {
  const g = partGeometry(pt);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  g.computeBoundingBox();
  const y0 = g.boundingBox.min.y,
    y1 = g.boundingBox.max.y;
  const sh = pt.shade ?? 1;
  for (let i = 0; i < n; i++) {
    const t = y1 > y0 ? (g.attributes.position.getY(i) - y0) / (y1 - y0) : 1;
    const v = (pt.ao === false ? 1 : 0.62 + 0.38 * t) * sh;
    const tint = pt.tint || [1, 1, 1];
    col[i * 3] = v * tint[0];
    col[i * 3 + 1] = v * tint[1];
    col[i * 3 + 2] = v * tint[2];
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// ======================================================================= modelo
// Un coloso: esqueleto (huesos con su posición de reposo en el espacio del
// modelo), mallas de carne con piel (SkinnedMesh) y piezas rígidas colgadas
// de los huesos. pose({ hueso: [rx, ry, rz] (grados) }).
export class ColossusModel {
  constructor(bonesDef) {
    this.root = new THREE.Group();
    this.bones = [];
    this.byName = {};
    this.index = {};
    this.restWorld = {};
    for (const b of bonesDef) {
      const bone = new THREE.Bone();
      bone.name = b.name;
      const par = b.parent ? this.byName[b.parent] : null;
      const pp = par ? this.restWorld[b.parent] : V(0, 0, 0);
      bone.position.set(b.pos[0] - pp.x, b.pos[1] - pp.y, b.pos[2] - pp.z);
      (par || this.root).add(bone);
      this.index[b.name] = this.bones.length;
      this.bones.push(bone);
      this.byName[b.name] = bone;
      this.restWorld[b.name] = V(...b.pos);
    }
    this.root.updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(this.bones);
    this.meshes = [];
    this.parts = [];
    this.restQ = this.bones.map((b) => b.quaternion.clone());
  }
  // malla esculpida con piel
  skinned(geo, matNames, matOpts = {}) {
    const mats = matNames.map((m) => colMat(m, matOpts[m] || {}));
    const mesh = new THREE.SkinnedMesh(geo, mats.length > 1 ? mats : mats[0]);
    if (mats.length === 1) geo.clearGroups();
    mesh.frustumCulled = false;
    this.root.add(mesh);
    mesh.bind(this.skeleton);
    this.meshes.push(mesh);
    return mesh;
  }
  // piezas rígidas: geometrías en el espacio del modelo, agrupadas por hueso y material
  rigid(list) {
    const groups = new Map();
    for (const it of list) {
      const key = it.bone + '|' + it.mat + '|' + (it.ds ? 1 : 0) + '|' + (it.tri || 0) + '|' + (it.grp || '');
      if (!groups.has(key)) groups.set(key, { ...it, geos: [] });
      groups.get(key).geos.push(it.geo);
    }
    for (const g of groups.values()) {
      const geo = g.geos.length > 1 ? mergeGeometries(g.geos.map((x) => (x.index ? x.toNonIndexed() : x))) : g.geos[0];
      const rw = this.restWorld[g.bone];
      geo.translate(-rw.x, -rw.y, -rw.z);
      geo.computeBoundingSphere();
      const mat = colMat(g.mat, { side: g.ds ? THREE.DoubleSide : THREE.FrontSide, tri: g.tri, giant: g.giant });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      if (g.grp) mesh.userData.grp = g.grp;
      this.byName[g.bone].add(mesh);
      this.parts.push(mesh);
    }
  }
  pose(p) {
    const e = new THREE.Euler();
    const q = new THREE.Quaternion();
    this.bones.forEach((b, i) => {
      const r = p[b.name];
      if (r) {
        e.set(r[0] * DEG, r[1] * DEG, r[2] * DEG, 'XYZ');
        q.setFromEuler(e);
        b.quaternion.copy(this.restQ[i]).multiply(q);
      } else b.quaternion.copy(this.restQ[i]);
    });
    this.root.updateMatrixWorld(true);
  }
  // luz del sitio (sonda) y oclusión junto al suelo para todos sus materiales
  setProbe(r, g, b, groundY = 0, ao = 0.3) {
    const seen = new Set();
    this.root.traverse((o) => {
      if (!o.material) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (seen.has(m) || !m._u) continue;
        seen.add(m);
        m._u.uProbe.value.set(r, g, b);
        m._u.uGround.value.set(groundY, ao);
      }
    });
  }
  stats() {
    let tris = 0,
      calls = 0;
    this.root.traverse((o) => {
      if (!o.isMesh) return;
      const g = o.geometry;
      const n = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
      tris += n;
      calls += Array.isArray(o.material) ? g.groups.length || 1 : 1;
    });
    return { tris: Math.round(tris), calls };
  }
}
