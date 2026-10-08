// La piel por la que se trepa: las mallas de un coloso consultadas en la CPU
// con la misma deformación que en la tarjeta gráfica (piel con huesos, o
// piezas colgadas de un hueso). Sirve para saber, en cada fotograma:
//   - el punto de la piel más cercano a uno dado (y su normal), y
//   - dónde está ahora un punto pegado a un triángulo (sigue al cuerpo).
// Así quien trepa va siempre sobre la superficie que se ve: no flota ni se
// mete dentro aunque el coloso se doble, se sacuda o se hinche.
//
// Cada triángulo se guarda en una rejilla de su hueso dominante, en el
// espacio de reposo. Para buscar cerca de un punto del mundo se lleva el
// punto al reposo de cada hueso (con la inversa de su matriz) y se miran
// sólo las celdas de alrededor: unos cientos de triángulos, y sólo se
// deforman los vértices que se tocan (con caché por fotograma).
import * as THREE from 'three';

const CELL = 0.6;
const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _a = new THREE.Vector3(),
  _b = new THREE.Vector3(),
  _c = new THREE.Vector3(),
  _n = new THREE.Vector3(),
  _q = new THREE.Vector3(),
  _ab = new THREE.Vector3(),
  _ac = new THREE.Vector3(),
  _ap = new THREE.Vector3();

// El punto del triángulo abc más cercano a p (Ericson, «Real-Time Collision
// Detection», 5.1.5). Devuelve las baricéntricas en bary [u, v, w] y el
// punto en out.
export function closestOnTri(p, a, b, c, out, bary) {
  _ab.subVectors(b, a);
  _ac.subVectors(c, a);
  _ap.subVectors(p, a);
  const d1 = _ab.dot(_ap),
    d2 = _ac.dot(_ap);
  if (d1 <= 0 && d2 <= 0) {
    bary[0] = 1;
    bary[1] = 0;
    bary[2] = 0;
    return out.copy(a);
  }
  const bpx = p.x - b.x,
    bpy = p.y - b.y,
    bpz = p.z - b.z;
  const d3 = _ab.x * bpx + _ab.y * bpy + _ab.z * bpz,
    d4 = _ac.x * bpx + _ac.y * bpy + _ac.z * bpz;
  if (d3 >= 0 && d4 <= d3) {
    bary[0] = 0;
    bary[1] = 1;
    bary[2] = 0;
    return out.copy(b);
  }
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    bary[0] = 1 - v;
    bary[1] = v;
    bary[2] = 0;
    return out.copy(a).addScaledVector(_ab, v);
  }
  const cpx = p.x - c.x,
    cpy = p.y - c.y,
    cpz = p.z - c.z;
  const d5 = _ab.x * cpx + _ab.y * cpy + _ab.z * cpz,
    d6 = _ac.x * cpx + _ac.y * cpy + _ac.z * cpz;
  if (d6 >= 0 && d5 <= d6) {
    bary[0] = 0;
    bary[1] = 0;
    bary[2] = 1;
    return out.copy(c);
  }
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    bary[0] = 1 - w;
    bary[1] = 0;
    bary[2] = w;
    return out.copy(a).addScaledVector(_ac, w);
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    bary[0] = 0;
    bary[1] = 1 - w;
    bary[2] = w;
    return out.copy(b).lerp(c, w);
  }
  const den = 1 / (va + vb + vc);
  const v = vb * den,
    w = vc * den;
  bary[0] = 1 - v - w;
  bary[1] = v;
  bary[2] = w;
  return out.copy(a).addScaledVector(_ab, v).addScaledVector(_ac, w);
}

// Una malla por la que se trepa, preparada para consultas.
class Part {
  // mesh: SkinnedMesh (con el esqueleto del modelo) o Mesh colgada de un
  // hueso (pieza rígida). zone(tri, boneName) -> nombre de la zona del
  // triángulo (null: no se trepa por él).
  constructor(M, k, mesh, o) {
    this.k = k;
    this.mesh = mesh;
    this.tag = o.tag || mesh.name || 'part' + k;
    this.ds = !!o.ds;
    const geo = mesh.geometry;
    const P = geo.attributes.position;
    const nv = P.count;
    this.nv = nv;
    this.rest = new Float32Array(nv * 3);
    const nr = geo.attributes.normal;
    this.restN = new Float32Array(nv * 3);
    // pesos: cuatro huesos por vértice (las rígidas, uno solo)
    this.si = new Uint16Array(nv * 4);
    this.sw = new Float32Array(nv * 4);
    if (mesh.isSkinnedMesh) {
      const SI = geo.attributes.skinIndex,
        SW = geo.attributes.skinWeight;
      for (let v = 0; v < nv; v++) {
        this.rest[v * 3] = P.getX(v);
        this.rest[v * 3 + 1] = P.getY(v);
        this.rest[v * 3 + 2] = P.getZ(v);
        if (nr) {
          this.restN[v * 3] = nr.getX(v);
          this.restN[v * 3 + 1] = nr.getY(v);
          this.restN[v * 3 + 2] = nr.getZ(v);
        }
        for (let q = 0; q < 4; q++) {
          this.si[v * 4 + q] = SI.getComponent(v, q);
          this.sw[v * 4 + q] = SW.getComponent(v, q);
        }
      }
    } else {
      // pieza rígida: la geometría está en el espacio de su hueso (reposo
      // sin giro): al reposo del modelo, sumando la posición del hueso
      const bone = mesh.parent;
      const bi = M.index[bone.name];
      const rw = M.restWorld[bone.name];
      for (let v = 0; v < nv; v++) {
        this.rest[v * 3] = P.getX(v) + rw.x;
        this.rest[v * 3 + 1] = P.getY(v) + rw.y;
        this.rest[v * 3 + 2] = P.getZ(v) + rw.z;
        if (nr) {
          this.restN[v * 3] = nr.getX(v);
          this.restN[v * 3 + 1] = nr.getY(v);
          this.restN[v * 3 + 2] = nr.getZ(v);
        }
        this.si[v * 4] = bi;
        this.sw[v * 4] = 1;
      }
    }
    // triángulos
    const idx = geo.index;
    const nt = idx ? idx.count / 3 : nv / 3;
    this.nt = nt;
    this.tri = new Uint32Array(nt * 3);
    for (let t = 0; t < nt * 3; t++) this.tri[t] = idx ? idx.getX(t) : t;
    // hueso dominante y zona de cada triángulo
    this.dom = new Uint16Array(nt);
    this.zone = new Array(nt);
    const acc = new Float32Array(M.bones.length);
    for (let t = 0; t < nt; t++) {
      acc.fill(0);
      let best = 0,
        bw = -1;
      for (let j = 0; j < 3; j++) {
        const v = this.tri[t * 3 + j];
        for (let q = 0; q < 4; q++) {
          const b = this.si[v * 4 + q],
            w = this.sw[v * 4 + q];
          if (w <= 0) continue;
          acc[b] += w;
          if (acc[b] > bw) {
            bw = acc[b];
            best = b;
          }
        }
      }
      this.dom[t] = best;
      this.zone[t] = o.zone ? o.zone(t, M.bones[best].name, this) : this.tag;
    }
    // caché de vértices deformados (por fotograma)
    this.wpos = new Float32Array(nv * 3);
    this.stamp = new Int32Array(nv).fill(-1);
  }
}

// Marca como no trepables (zona null) los triángulos de src tapados por las
// mallas cover: en reposo, desde el centro de cada triángulo hacia fuera (su
// normal), ¿hay tela a menos de dist? La tela se vuelca en una rejilla de
// vóxeles de 0,2 m (rápido: unos milisegundos).
function coverMask(src, covers, dist) {
  const V = 0.2;
  let x0 = Infinity,
    y0 = Infinity,
    z0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity,
    z1 = -Infinity;
  for (const c of covers)
    for (let v = 0; v < c.nv; v++) {
      const x = c.rest[v * 3],
        y = c.rest[v * 3 + 1],
        z = c.rest[v * 3 + 2];
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (z < z0) z0 = z;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
      if (z > z1) z1 = z;
    }
  if (!isFinite(x0)) return;
  x0 -= V;
  y0 -= V;
  z0 -= V;
  const nx = Math.ceil((x1 - x0) / V) + 2,
    ny = Math.ceil((y1 - y0) / V) + 2,
    nz = Math.ceil((z1 - z0) / V) + 2;
  const vox = new Uint8Array(nx * ny * nz);
  const mark = (x, y, z) => {
    const i = Math.floor((x - x0) / V),
      j = Math.floor((y - y0) / V),
      k = Math.floor((z - z0) / V);
    if (i >= 0 && j >= 0 && k >= 0 && i < nx && j < ny && k < nz) vox[i + nx * (j + ny * k)] = 1;
  };
  for (const c of covers) {
    const R = c.rest;
    for (let t = 0; t < c.nt; t++) {
      if (c.zone[t] == null) continue;
      const a = c.tri[t * 3] * 3,
        b = c.tri[t * 3 + 1] * 3,
        d = c.tri[t * 3 + 2] * 3;
      const L = Math.max(Math.hypot(R[b] - R[a], R[b + 1] - R[a + 1], R[b + 2] - R[a + 2]), Math.hypot(R[d] - R[a], R[d + 1] - R[a + 1], R[d + 2] - R[a + 2]), Math.hypot(R[d] - R[b], R[d + 1] - R[b + 1], R[d + 2] - R[b + 2]));
      const n = Math.max(1, Math.ceil(L / (V * 0.6)));
      for (let i = 0; i <= n; i++)
        for (let j = 0; j <= n - i; j++) {
          const u = i / n,
            w = j / n,
            s = 1 - u - w;
          mark(R[a] * s + R[b] * u + R[d] * w, R[a + 1] * s + R[b + 1] * u + R[d + 1] * w, R[a + 2] * s + R[b + 2] * u + R[d + 2] * w);
        }
    }
  }
  const at = (x, y, z) => {
    const i = Math.floor((x - x0) / V),
      j = Math.floor((y - y0) / V),
      k = Math.floor((z - z0) / V);
    return i >= 0 && j >= 0 && k >= 0 && i < nx && j < ny && k < nz && vox[i + nx * (j + ny * k)] === 1;
  };
  const R = src.rest;
  for (let t = 0; t < src.nt; t++) {
    if (src.zone[t] == null) continue;
    const a = src.tri[t * 3] * 3,
      b = src.tri[t * 3 + 1] * 3,
      d = src.tri[t * 3 + 2] * 3;
    const cx = (R[a] + R[b] + R[d]) / 3,
      cy = (R[a + 1] + R[b + 1] + R[d + 1]) / 3,
      cz = (R[a + 2] + R[b + 2] + R[d + 2]) / 3;
    // normal de la cara
    const ux = R[b] - R[a],
      uy = R[b + 1] - R[a + 1],
      uz = R[b + 2] - R[a + 2];
    const vx = R[d] - R[a],
      vy = R[d + 1] - R[a + 1],
      vz = R[d + 2] - R[a + 2];
    let nx2 = uy * vz - uz * vy,
      ny2 = uz * vx - ux * vz,
      nz2 = ux * vy - uy * vx;
    const l = Math.hypot(nx2, ny2, nz2) || 1;
    nx2 /= l;
    ny2 /= l;
    nz2 /= l;
    for (let s = V * 0.75; s <= dist; s += V * 0.6) {
      if (at(cx + nx2 * s, cy + ny2 * s, cz + nz2 * s)) {
        src.zone[t] = null;
        break;
      }
    }
  }
}

export class SkinSurface {
  // M: ColossusModel. defs: [{ mesh, tag, ds (tela de una sola capa), zone }]
  constructor(M, defs) {
    this.M = M;
    const B = M.bones;
    this.nb = B.length;
    this.parts = defs.map((d, k) => new Part(M, k, d.mesh, d));
    // lo que tapa la ropa (la carne bajo la casulla, el alba bajo ella) no
    // se trepa: se va por fuera, por la tela
    defs.forEach((d, k) => {
      if (d.coveredBy) coverMask(this.parts[k], d.coveredBy.map((j) => this.parts[j]), d.coverDist ?? 1.4);
    });
    // inversas de unión (las del esqueleto: con la raíz en el origen, como
    // al montar el modelo)
    const inv = M.skeleton.boneInverses;
    this.boneInv = inv.map((m) => m.clone());
    // rejillas en reposo, una por hueso dominante
    this.grids = Array.from({ length: this.nb }, () => null);
    for (const part of this.parts) {
      const R = part.rest;
      for (let t = 0; t < part.nt; t++) {
        if (part.zone[t] == null) continue;
        const b = part.dom[t];
        const G = this.grids[b] || (this.grids[b] = { map: new Map(), box: [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity] });
        let x0 = Infinity,
          y0 = Infinity,
          z0 = Infinity,
          x1 = -Infinity,
          y1 = -Infinity,
          z1 = -Infinity;
        for (let j = 0; j < 3; j++) {
          const v = part.tri[t * 3 + j] * 3;
          x0 = Math.min(x0, R[v]);
          y0 = Math.min(y0, R[v + 1]);
          z0 = Math.min(z0, R[v + 2]);
          x1 = Math.max(x1, R[v]);
          y1 = Math.max(y1, R[v + 1]);
          z1 = Math.max(z1, R[v + 2]);
        }
        G.box[0] = Math.min(G.box[0], x0);
        G.box[1] = Math.min(G.box[1], y0);
        G.box[2] = Math.min(G.box[2], z0);
        G.box[3] = Math.max(G.box[3], x1);
        G.box[4] = Math.max(G.box[4], y1);
        G.box[5] = Math.max(G.box[5], z1);
        const i0 = Math.floor(x0 / CELL),
          i1 = Math.floor(x1 / CELL),
          j0 = Math.floor(y0 / CELL),
          j1 = Math.floor(y1 / CELL),
          k0 = Math.floor(z0 / CELL),
          k1 = Math.floor(z1 / CELL);
        for (let i = i0; i <= i1; i++)
          for (let j = j0; j <= j1; j++)
            for (let k = k0; k <= k1; k++) {
              const key = (i + 512) * 1048576 + (j + 512) * 1024 + (k + 512);
              let L = G.map.get(key);
              if (!L) G.map.set(key, (L = []));
              L.push(part.k, t);
            }
      }
    }
    // matrices de los huesos este fotograma (hueso.mundo × inversa de unión)
    this.S = Array.from({ length: this.nb }, () => new THREE.Matrix4());
    this.Si = Array.from({ length: this.nb }, () => new THREE.Matrix4());
    this.siStamp = new Int32Array(this.nb).fill(-1);
    this.frame = 0;
    this._bary = [0, 0, 0];
    this.enabled = null; // (zona) -> bool
  }

  // Al empezar cada fotograma (después de animar el coloso).
  update() {
    this.frame++;
    const B = this.M.bones;
    for (let i = 0; i < this.nb; i++) this.S[i].multiplyMatrices(B[i].matrixWorld, this.boneInv[i]);
  }
  _inv(b) {
    if (this.siStamp[b] !== this.frame) {
      this.siStamp[b] = this.frame;
      this.Si[b].copy(this.S[b]).invert();
    }
    return this.Si[b];
  }
  // posición deformada del vértice v de la parte (en out)
  vert(part, v, out) {
    const W = part.wpos;
    if (part.stamp[v] !== this.frame) {
      part.stamp[v] = this.frame;
      const R = part.rest,
        o = v * 3;
      const x = R[o],
        y = R[o + 1],
        z = R[o + 2];
      let px = 0,
        py = 0,
        pz = 0;
      for (let q = 0; q < 4; q++) {
        const w = part.sw[v * 4 + q];
        if (w <= 0) continue;
        const e = this.S[part.si[v * 4 + q]].elements;
        px += w * (e[0] * x + e[4] * y + e[8] * z + e[12]);
        py += w * (e[1] * x + e[5] * y + e[9] * z + e[13]);
        pz += w * (e[2] * x + e[6] * y + e[10] * z + e[14]);
      }
      W[o] = px;
      W[o + 1] = py;
      W[o + 2] = pz;
    }
    return out.set(W[v * 3], W[v * 3 + 1], W[v * 3 + 2]);
  }
  // normal deformada (suave) del vértice v
  vnorm(part, v, out) {
    const R = part.restN,
      o = v * 3;
    const x = R[o],
      y = R[o + 1],
      z = R[o + 2];
    let nx = 0,
      ny = 0,
      nz = 0;
    for (let q = 0; q < 4; q++) {
      const w = part.sw[v * 4 + q];
      if (w <= 0) continue;
      const e = this.S[part.si[v * 4 + q]].elements;
      nx += w * (e[0] * x + e[4] * y + e[8] * z);
      ny += w * (e[1] * x + e[5] * y + e[9] * z);
      nz += w * (e[2] * x + e[6] * y + e[10] * z);
    }
    return out.set(nx, ny, nz).normalize();
  }
  zoneOf(att) {
    return this.parts[att.k].zone[att.tri];
  }
  _ok(part, t, filter) {
    const z = part.zone[t];
    if (z == null) return false;
    if (this.enabled && !this.enabled(z, part, t)) return false;
    return !filter || filter(z, part, t);
  }

  // Un punto pegado a la piel (att = { k, tri, b: [u, v, w] }) tal y como
  // está ahora: posición (P), normal suave (N) y normal de la cara (F).
  eval(att, P, N, F = null) {
    const part = this.parts[att.k];
    const t = att.tri * 3;
    const ia = part.tri[t],
      ib = part.tri[t + 1],
      ic = part.tri[t + 2];
    this.vert(part, ia, _a);
    this.vert(part, ib, _b);
    this.vert(part, ic, _c);
    const [u, v, w] = att.b;
    P.set(_a.x * u + _b.x * v + _c.x * w, _a.y * u + _b.y * v + _c.y * w, _a.z * u + _b.z * v + _c.z * w);
    if (N || F) {
      _n.subVectors(_b, _a).cross(_q.subVectors(_c, _a)).normalize();
      if (part.ds && att.side) _n.multiplyScalar(att.side);
      if (F) F.copy(_n);
      if (N) {
        this.vnorm(part, ia, _a).multiplyScalar(u);
        this.vnorm(part, ib, _b).multiplyScalar(v);
        this.vnorm(part, ic, _c).multiplyScalar(w);
        N.copy(_a).add(_b).add(_c);
        if (part.ds && att.side) N.multiplyScalar(att.side);
        // (si la suave se pasa de la de la cara, manda la de la cara)
        if (N.lengthSq() < 1e-6 || N.dot(_n) < 0.2) N.copy(_n);
        else N.normalize();
      }
    }
    return P;
  }
  // el punto de reposo de un punto pegado (en el espacio del modelo)
  restOf(att, out) {
    const part = this.parts[att.k];
    const t = att.tri * 3,
      R = part.rest;
    const [u, v, w] = att.b;
    const a = part.tri[t] * 3,
      b = part.tri[t + 1] * 3,
      c = part.tri[t + 2] * 3;
    return out.set(R[a] * u + R[b] * v + R[c] * w, R[a + 1] * u + R[b + 1] * v + R[c + 1] * w, R[a + 2] * u + R[b + 2] * v + R[c + 2] * w);
  }

  // El punto de la piel más cercano a P (mundo), a menos de r. o:
  //   near    punto pegado de referencia: se prefieren normales parecidas a
  //           la suya (nunca se salta al otro lado de un dedo o de la tela)
  //   prefN   normal preferida (mundo)
  //   bones   sólo estos huesos (índices) como dominantes
  //   filter  (zona, parte, triángulo) -> bool
  //   side    para la tela de una capa: la cara que mira hacia P
  // Devuelve { k, tri, b, side, d, P, N } o null.
  closest(P, r, o = {}) {
    const res = o.out || { k: 0, tri: 0, b: [0, 0, 0], side: 1, d: Infinity, P: new THREE.Vector3(), N: new THREE.Vector3() };
    res.d = Infinity;
    let bestS = Infinity;
    const prefN = o.prefN || null;
    const bary = this._bary;
    const rr = r + CELL;
    const seen = this._seen || (this._seen = new Set());
    seen.clear();
    const bones = o.bones || null;
    const nb = bones ? bones.length : this.nb;
    for (let bi = 0; bi < nb; bi++) {
      const b = bones ? bones[bi] : bi;
      const G = this.grids[b];
      if (!G) continue;
      // el punto, en el reposo de este hueso
      _p.copy(P).applyMatrix4(this._inv(b));
      const bx = G.box;
      if (_p.x < bx[0] - rr || _p.x > bx[3] + rr || _p.y < bx[1] - rr || _p.y > bx[4] + rr || _p.z < bx[2] - rr || _p.z > bx[5] + rr) continue;
      const i0 = Math.floor((_p.x - r) / CELL),
        i1 = Math.floor((_p.x + r) / CELL),
        j0 = Math.floor((_p.y - r) / CELL),
        j1 = Math.floor((_p.y + r) / CELL),
        k0 = Math.floor((_p.z - r) / CELL),
        k1 = Math.floor((_p.z + r) / CELL);
      for (let i = i0; i <= i1; i++)
        for (let j = j0; j <= j1; j++)
          for (let k = k0; k <= k1; k++) {
            const L = G.map.get((i + 512) * 1048576 + (j + 512) * 1024 + (k + 512));
            if (!L) continue;
            for (let q = 0; q < L.length; q += 2) {
              const pk = L[q],
                t = L[q + 1];
              const key = pk * 4194304 + t;
              if (seen.has(key)) continue;
              seen.add(key);
              const part = this.parts[pk];
              if (!this._ok(part, t, o.filter)) continue;
              const ia = part.tri[t * 3],
                ib = part.tri[t * 3 + 1],
                ic = part.tri[t * 3 + 2];
              this.vert(part, ia, _a);
              this.vert(part, ib, _b);
              this.vert(part, ic, _c);
              closestOnTri(P, _a, _b, _c, _q, bary);
              const d = _q.distanceTo(P);
              if (d > r) continue;
              // normal de la cara (la tela de una capa, hacia P)
              _n.subVectors(_b, _a).cross(_ab.subVectors(_c, _a));
              const nl = _n.length();
              if (nl < 1e-9) continue;
              _n.multiplyScalar(1 / nl);
              let side = 1;
              if (part.ds) {
                // tela de una capa: la cara de fuera (la de la normal
                // preferida: quien trepa por fuera no se cuela por dentro)
                const pn = prefN ? _n.dot(prefN) : 0;
                if (Math.abs(pn) > 0.1) side = Math.sign(pn);
                else {
                  const s = _ap.subVectors(P, _q).dot(_n);
                  side = Math.abs(s) > 1e-4 ? Math.sign(s) : 1;
                }
                if (side < 0) _n.negate();
              } else if (o.facing && _ap.subVectors(P, _q).dot(_n) < -0.05) continue;
              // puntuación: la distancia, y un recargo si la normal se aparta de la preferida
              let s = d;
              if (prefN) s += (1 - _n.dot(prefN)) * (o.turnK ?? 0.35);
              if (s < bestS) {
                bestS = s;
                res.k = pk;
                res.tri = t;
                res.b[0] = bary[0];
                res.b[1] = bary[1];
                res.b[2] = bary[2];
                res.side = side;
                res.d = d;
                res.P.copy(_q);
                res.N.copy(_n);
              }
            }
          }
    }
    return res.d < Infinity ? res : null;
  }

  // Lanza un rayo (origen O, dirección D unitaria, hasta len) contra la piel:
  // la distancia aproximada al primer tramo que la toca, o Infinity (para la
  // cámara: que no se meta dentro del coloso). Avanza a pasos de 'step'.
  raycast(O, D, len, step = 0.5) {
    const P = this._rp || (this._rp = new THREE.Vector3());
    const out = this._rh || (this._rh = { k: 0, tri: 0, b: [0, 0, 0], side: 1, d: 0, P: new THREE.Vector3(), N: new THREE.Vector3() });
    for (let t = 0; t <= len; t += step) {
      P.copy(O).addScaledVector(D, t);
      const c = this.closest(P, step * 0.7, { out });
      if (c) return Math.max(0, t - step * 0.7 + c.d);
    }
    return Infinity;
  }
}
