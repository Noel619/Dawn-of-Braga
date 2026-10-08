// Constructor de geometría estática del mundo.
// Todo se fusiona por (material, trozo de 24 m) para pocas llamadas de dibujo
// y culling por frustum. Cada vértice lleva:
//   color -> albedo (oclusión ambiental falsa + suciedad procedural)
//   aBake -> luz horneada de antorchas/velas/ventanas (iluminación por vértice)
import * as THREE from 'three';
import { fbm3, clamp, smoothstep } from '../core/util.js';
import { worldMat, MAT_DEFS } from './materials.js';

const CHUNK = 32;
const _p = new THREE.Vector3();
const _n = new THREE.Vector3();

class Bucket {
  constructor(mat, key, group = null) {
    this.mat = mat;
    this.key = key;
    this.group = group;
    this.pos = [];
    this.nor = [];
    this.uv = [];
    this.col = [];
    this.room = [];
    this.idx = [];
    this.count = 0;
  }
}

export class WorldBuilder {
  constructor() {
    this.buckets = new Map();
    this.m = new THREE.Matrix4();
    this.nm = new THREE.Matrix3();
    this.stack = [];
    this.room = 0; // 0 = exterior
    this.roomIds = new Map([['out', 0]]);
    this.tint = null;
    // grupo: lo que se construye con un grupo puesto va en mallas aparte que
    // se pueden ocultar (el tejado de la nave, que revienta; sus ruinas)
    this.group = null;
  }
  setGroup(name) {
    this.group = name || null;
  }

  roomId(name) {
    if (!name) return 0;
    if (!this.roomIds.has(name)) this.roomIds.set(name, this.roomIds.size);
    return this.roomIds.get(name);
  }
  setRoom(name) {
    this.room = this.roomId(name);
  }

  push() {
    this.stack.push(this.m.clone());
  }
  pop() {
    this.m.copy(this.stack.pop());
    this.nm.getNormalMatrix(this.m);
  }
  translate(x, y, z) {
    this.m.multiply(new THREE.Matrix4().makeTranslation(x, y, z));
    this.nm.getNormalMatrix(this.m);
    return this;
  }
  rotateY(a) {
    this.m.multiply(new THREE.Matrix4().makeRotationY(a));
    this.nm.getNormalMatrix(this.m);
    return this;
  }
  rotateX(a) {
    this.m.multiply(new THREE.Matrix4().makeRotationX(a));
    this.nm.getNormalMatrix(this.m);
    return this;
  }
  rotateZ(a) {
    this.m.multiply(new THREE.Matrix4().makeRotationZ(a));
    this.nm.getNormalMatrix(this.m);
    return this;
  }
  scale(x, y, z) {
    this.m.multiply(new THREE.Matrix4().makeScale(x, y, z));
    this.nm.getNormalMatrix(this.m);
    return this;
  }
  // Ejecuta fn con una transformación temporal.
  at(x, y, z, rotY, fn) {
    this.push();
    this.translate(x, y, z);
    if (rotY) this.rotateY(rotY);
    fn();
    this.pop();
  }

  _bucket(mat, lx, lz) {
    _p.set(lx, 0, lz).applyMatrix4(this.m);
    const cx = Math.floor(_p.x / CHUNK),
      cz = Math.floor(_p.z / CHUNK);
    const key = (this.group ? this.group + '#' : '') + mat + '|' + cx + '|' + cz;
    let b = this.buckets.get(key);
    if (!b) {
      b = new Bucket(mat, key, this.group);
      this.buckets.set(key, b);
    }
    return b;
  }

  _vert(b, lx, ly, lz, nx, ny, nz, u, v, ao, o) {
    _p.set(lx, ly, lz).applyMatrix4(this.m);
    _n.set(nx, ny, nz).applyMatrix3(this.nm).normalize();
    b.pos.push(_p.x, _p.y, _p.z);
    b.nor.push(_n.x, _n.y, _n.z);
    b.uv.push(u, v);
    // suciedad/humedad procedural de baja frecuencia
    let g = 1;
    if (o.grime !== false) {
      const f = fbm3(_p.x * 0.17, _p.y * 0.21, _p.z * 0.17, 2, 7);
      g = 0.66 + f * 0.62;
    }
    const t = o.tint || this.tint;
    let r = ao * g,
      gg = ao * g,
      bb = ao * g;
    if (t) {
      r *= t[0];
      gg *= t[1];
      bb *= t[2];
    }
    b.col.push(r, gg, bb);
    b.room.push(o.room !== undefined ? this.roomId(o.room) : this.room);
    return b.count++;
  }

  _ao(o, relY) {
    if (o.ao === false) return 1;
    const h = o.aoH ?? 1.4;
    const mn = o.aoMin ?? 0.42;
    return mn + (1 - mn) * smoothstep(0, h, relY);
  }

  // Cara plana subdividida. origin + U*a + V*b, a∈[0,ul], b∈[0,vl]
  _face(b, ox, oy, oz, ux, uy, uz, ul, vx, vy, vz, vl, nx, ny, nz, s, sub, o, baseY) {
    const nu = Math.max(1, Math.ceil(ul / sub));
    const nv = Math.max(1, Math.ceil(vl / sub));
    const start = b.count;
    const uo = o.uo || 0,
      vo = o.vo || 0;
    for (let j = 0; j <= nv; j++)
      for (let i = 0; i <= nu; i++) {
        const a = (i / nu) * ul,
          c = (j / nv) * vl;
        const px = ox + ux * a + vx * c,
          py = oy + uy * a + vy * c,
          pz = oz + uz * a + vz * c;
        // UV proyectadas sobre los ejes de la cara: continuidad entre piezas.
        const u = (px * ux + py * uy + pz * uz) * s + uo;
        const v = (px * vx + py * vy + pz * vz) * s + vo;
        const ao = ny > 0.5 ? (o.floorAo ?? 1) : this._ao(o, py - baseY);
        this._vert(b, px, py, pz, nx, ny, nz, u, v, ao, o);
      }
    const row = nu + 1;
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const a = start + j * row + i,
          bb = a + 1,
          c = a + row + 1,
          d = a + row;
        b.idx.push(a, bb, c, a, c, d);
      }
  }

  // Caja alineada a ejes (en el espacio local actual).
  box(mat, x0, y0, z0, x1, y1, z1, o = {}) {
    if (x1 < x0) [x0, x1] = [x1, x0];
    if (y1 < y0) [y0, y1] = [y1, y0];
    if (z1 < z0) [z0, z1] = [z1, z0];
    const faces = o.faces ?? 'tnsew';
    const sub = o.sub ?? 1.6;
    const W = x1 - x0,
      H = y1 - y0,
      D = z1 - z0;
    const fm = (f) => (o.mats && o.mats[f]) || mat;
    const sc = (m) => o.uv ?? MAT_DEFS[m].uv;
    const cx = (x0 + x1) / 2,
      cz = (z0 + z1) / 2;
    const baseY = o.baseY ?? y0;
    if (faces.includes('t')) {
      const m = fm('t');
      this._face(this._bucket(m, cx, cz), x0, y1, z1, 1, 0, 0, W, 0, 0, -1, D, 0, 1, 0, sc(m), sub, o, baseY);
    }
    if (faces.includes('b')) {
      const m = fm('b');
      this._face(this._bucket(m, cx, cz), x0, y0, z0, 1, 0, 0, W, 0, 0, 1, D, 0, -1, 0, sc(m), sub, o, baseY);
    }
    if (faces.includes('s')) {
      const m = fm('s');
      this._face(this._bucket(m, cx, cz), x0, y0, z1, 1, 0, 0, W, 0, 1, 0, H, 0, 0, 1, sc(m), sub, o, baseY);
    }
    if (faces.includes('n')) {
      const m = fm('n');
      this._face(this._bucket(m, cx, cz), x1, y0, z0, -1, 0, 0, W, 0, 1, 0, H, 0, 0, -1, sc(m), sub, o, baseY);
    }
    if (faces.includes('e')) {
      const m = fm('e');
      this._face(this._bucket(m, cx, cz), x1, y0, z1, 0, 0, -1, D, 0, 1, 0, H, 1, 0, 0, sc(m), sub, o, baseY);
    }
    if (faces.includes('w')) {
      const m = fm('w');
      this._face(this._bucket(m, cx, cz), x0, y0, z0, 0, 0, 1, D, 0, 1, 0, H, -1, 0, 0, sc(m), sub, o, baseY);
    }
  }

  // Cuadrilátero arbitrario p0,p1,p2,p3 (antihorario visto desde delante).
  quad(mat, p0, p1, p2, p3, o = {}) {
    const U = new THREE.Vector3().subVectors(p1, p0);
    const V = new THREE.Vector3().subVectors(p3, p0);
    const N = new THREE.Vector3().crossVectors(U, V);
    // (un cuadrilátero con dos vértices iguales es un triángulo: su normal se
    // toma de los otros lados; nula, el sombreado pintaba la malla de negro)
    if (N.lengthSq() < 1e-12) N.crossVectors(new THREE.Vector3().subVectors(p2, p1), new THREE.Vector3().subVectors(p3, p2));
    if (N.lengthSq() < 1e-12) N.crossVectors(U, new THREE.Vector3().subVectors(p2, p0));
    if (N.lengthSq() < 1e-12) return;
    N.normalize();
    const s = o.uv ?? MAT_DEFS[mat].uv;
    const sub = o.sub ?? 1.6;
    const ul = U.length(),
      vl = V.length();
    const ud = U.clone().normalize(),
      vd = V.clone().normalize();
    const nu = Math.max(1, Math.ceil(ul / sub)),
      nv = Math.max(1, Math.ceil(vl / sub));
    const cx = (p0.x + p2.x) / 2,
      cz = (p0.z + p2.z) / 2;
    const b = this._bucket(mat, cx, cz);
    const start = b.count;
    const baseY = o.baseY ?? Math.min(p0.y, p1.y, p2.y, p3.y);
    const uo = o.uo || 0,
      vo = o.vo || 0;
    for (let j = 0; j <= nv; j++)
      for (let i = 0; i <= nu; i++) {
        const a = i / nu,
          c = j / nv;
        // bilineal
        const x = (1 - a) * (1 - c) * p0.x + a * (1 - c) * p1.x + a * c * p2.x + (1 - a) * c * p3.x;
        const y = (1 - a) * (1 - c) * p0.y + a * (1 - c) * p1.y + a * c * p2.y + (1 - a) * c * p3.y;
        const z = (1 - a) * (1 - c) * p0.z + a * (1 - c) * p1.z + a * c * p2.z + (1 - a) * c * p3.z;
        let u, v;
        if (o.uvLocal) {
          u = a * ul * s + uo;
          v = c * vl * s + vo;
        } else {
          u = (x * ud.x + y * ud.y + z * ud.z) * s + uo;
          v = (x * vd.x + y * vd.y + z * vd.z) * s + vo;
        }
        const ao = N.y > 0.7 ? (o.floorAo ?? 1) : this._ao(o, y - baseY);
        this._vert(b, x, y, z, N.x, N.y, N.z, u, v, ao, o);
      }
    const row = nu + 1;
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const a = start + j * row + i;
        b.idx.push(a, a + 1, a + row + 1, a, a + row + 1, a + row);
      }
  }

  tri(mat, p0, p1, p2, o = {}) {
    const U = new THREE.Vector3().subVectors(p1, p0);
    const V = new THREE.Vector3().subVectors(p2, p0);
    const N = new THREE.Vector3().crossVectors(U, V).normalize();
    const s = o.uv ?? MAT_DEFS[mat].uv;
    const b = this._bucket(mat, (p0.x + p1.x + p2.x) / 3, (p0.z + p1.z + p2.z) / 3);
    // ejes UV: horizontal del plano y vertical
    const up = Math.abs(N.y) > 0.9 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
    const ud = new THREE.Vector3().crossVectors(up, N).normalize().negate();
    const vd = new THREE.Vector3().crossVectors(N, ud).normalize();
    const baseY = o.baseY ?? Math.min(p0.y, p1.y, p2.y);
    const start = b.count;
    for (const p of [p0, p1, p2]) {
      const u = p.dot(ud) * s,
        v = p.dot(vd) * s;
      const ao = N.y > 0.7 ? 1 : this._ao(o, p.y - baseY);
      this._vert(b, p.x, p.y, p.z, N.x, N.y, N.z, u, v, ao, o);
    }
    b.idx.push(start, start + 1, start + 2);
  }

  // Cilindro/cono a lo largo de Y (en espacio local).
  cylinder(mat, cx, y0, cz, rBot, rTop, h, segs = 8, o = {}) {
    const s = o.uv ?? MAT_DEFS[mat].uv;
    const b = this._bucket(mat, cx, cz);
    const nv = Math.max(1, Math.ceil(h / (o.sub ?? 1.6)));
    const start = b.count;
    const slope = (rBot - rTop) / h;
    const a0 = o.phase ?? 0;
    const rAvg = (rBot + rTop) / 2;
    for (let j = 0; j <= nv; j++) {
      const t = j / nv;
      const y = y0 + h * t;
      const r = rBot + (rTop - rBot) * t;
      for (let i = 0; i <= segs; i++) {
        const a = a0 + (i / segs) * Math.PI * 2;
        const ca = Math.cos(a),
          sa = Math.sin(a);
        const nl = Math.hypot(1, slope);
        const ao = this._ao(o, y - y0);
        this._vert(b, cx + ca * r, y, cz + sa * r, ca / nl, slope / nl, sa / nl, (i / segs) * Math.PI * 2 * rAvg * s, y * s, ao, o);
      }
    }
    const row = segs + 1;
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < segs; i++) {
        const a = start + j * row + i;
        b.idx.push(a, a + row, a + row + 1, a, a + row + 1, a + 1);
      }
    if (o.capTop && rTop > 0.001) this._cap(mat, cx, y0 + h, cz, rTop, segs, 1, s, o, a0);
    if (o.capBot) this._cap(mat, cx, y0, cz, rBot, segs, -1, s, o, a0);
  }

  _cap(mat, cx, y, cz, r, segs, dir, s, o, a0) {
    const b = this._bucket(mat, cx, cz);
    const c = this._vert(b, cx, y, cz, 0, dir, 0, cx * s, -cz * s, 1, o);
    const first = b.count;
    for (let i = 0; i <= segs; i++) {
      const a = a0 + (i / segs) * Math.PI * 2;
      const x = cx + Math.cos(a) * r,
        z = cz + Math.sin(a) * r;
      this._vert(b, x, y, z, 0, dir, 0, x * s, -z * s, 1, o);
    }
    for (let i = 0; i < segs; i++) {
      if (dir > 0) b.idx.push(c, first + i + 1, first + i);
      else b.idx.push(c, first + i, first + i + 1);
    }
  }

  // Tejado a dos aguas sobre la huella x0..x1, z0..z1.
  // axis: 'x' => cumbrera paralela a X.
  gableRoof(x0, z0, x1, z1, yEave, yRidge, axis = 'x', o = {}) {
    const ov = o.overhang ?? 0.6;
    const mat = o.mat ?? 'roof';
    const wall = o.wallMat ?? 'plaster';
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const th = 0.18;
    if (axis === 'x') {
      const zc = (z0 + z1) / 2,
        half = (z1 - z0) / 2;
      const drop = (ov * (yRidge - yEave)) / half;
      const ye = yEave - drop;
      const xa = x0 - ov,
        xb = x1 + ov;
      this.quad(mat, V(xa, ye, z1 + ov), V(xb, ye, z1 + ov), V(xb, yRidge, zc), V(xa, yRidge, zc), { ao: false, sub: 2.2 });
      this.quad(mat, V(xb, ye, z0 - ov), V(xa, ye, z0 - ov), V(xa, yRidge, zc), V(xb, yRidge, zc), { ao: false, sub: 2.2 });
      // cara inferior
      this.quad('wooddark', V(xb, ye - th, z1 + ov), V(xa, ye - th, z1 + ov), V(xa, yRidge - th, zc), V(xb, yRidge - th, zc), { ao: false, sub: 3, tint: [0.5, 0.5, 0.5] });
      this.quad('wooddark', V(xa, ye - th, z0 - ov), V(xb, ye - th, z0 - ov), V(xb, yRidge - th, zc), V(xa, yRidge - th, zc), { ao: false, sub: 3, tint: [0.5, 0.5, 0.5] });
      // hastiales
      this.tri(wall, V(x0, yEave, z1), V(x0, yRidge, zc), V(x0, yEave, z0), { ao: false });
      this.tri(wall, V(x1, yEave, z0), V(x1, yRidge, zc), V(x1, yEave, z1), { ao: false });
      // canto de la cumbrera
      if (o.ridge !== false) this.box('roof', xa, yRidge - 0.08, zc - 0.16, xb, yRidge + 0.14, zc + 0.16, { ao: false, faces: 'tnsew' });
    } else {
      const xc = (x0 + x1) / 2,
        half = (x1 - x0) / 2;
      const drop = (ov * (yRidge - yEave)) / half;
      const ye = yEave - drop;
      const za = z0 - ov,
        zb = z1 + ov;
      this.quad(mat, V(x1 + ov, ye, zb), V(x1 + ov, ye, za), V(xc, yRidge, za), V(xc, yRidge, zb), { ao: false, sub: 2.2 });
      this.quad(mat, V(x0 - ov, ye, za), V(x0 - ov, ye, zb), V(xc, yRidge, zb), V(xc, yRidge, za), { ao: false, sub: 2.2 });
      this.quad('wooddark', V(x1 + ov, ye - th, za), V(x1 + ov, ye - th, zb), V(xc, yRidge - th, zb), V(xc, yRidge - th, za), { ao: false, sub: 3, tint: [0.5, 0.5, 0.5] });
      this.quad('wooddark', V(x0 - ov, ye - th, zb), V(x0 - ov, ye - th, za), V(xc, yRidge - th, za), V(xc, yRidge - th, zb), { ao: false, sub: 3, tint: [0.5, 0.5, 0.5] });
      this.tri(wall, V(x0, yEave, z0), V(xc, yRidge, z0), V(x1, yEave, z0), { ao: false });
      this.tri(wall, V(x1, yEave, z1), V(xc, yRidge, z1), V(x0, yEave, z1), { ao: false });
      if (o.ridge !== false) this.box('roof', xc - 0.16, yRidge - 0.08, za, xc + 0.16, yRidge + 0.14, zb, { ao: false, faces: 'tnsew' });
    }
  }

  // Tejado a cuatro aguas / chapitel piramidal (torres).
  pyramid(mat, cx, cz, w, d, y0, h, o = {}) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const x0 = cx - w / 2,
      x1 = cx + w / 2,
      z0 = cz - d / 2,
      z1 = cz + d / 2;
    const top = V(cx, y0 + h, cz);
    const oo = { ao: false, ...o };
    this.tri(mat, V(x0, y0, z1), V(x1, y0, z1), top, oo);
    this.tri(mat, V(x1, y0, z1), V(x1, y0, z0), top, oo);
    this.tri(mat, V(x1, y0, z0), V(x0, y0, z0), top, oo);
    this.tri(mat, V(x0, y0, z0), V(x0, y0, z1), top, oo);
  }

  // Copia una BufferGeometry arbitraria transformada por 'matrix'.
  geometry(mat, geom, matrix, o = {}) {
    const g = geom.index ? geom.toNonIndexed() : geom;
    const P = g.attributes.position,
      N = g.attributes.normal,
      UV = g.attributes.uv;
    const us = o.uvScale ?? 1;
    this.push();
    if (matrix) this.m.multiply(matrix);
    this.nm.getNormalMatrix(this.m);
    const cxz = new THREE.Vector3(0, 0, 0);
    const b = this._bucket(mat, cxz.x, cxz.z);
    const start = b.count;
    let minY = Infinity;
    for (let i = 0; i < P.count; i++) minY = Math.min(minY, P.getY(i));
    for (let i = 0; i < P.count; i++) {
      const ao = this._ao(o, P.getY(i) - minY);
      this._vert(b, P.getX(i), P.getY(i), P.getZ(i), N.getX(i), N.getY(i), N.getZ(i), UV ? UV.getX(i) * us : 0, UV ? UV.getY(i) * us : 0, ao, o);
    }
    for (let i = 0; i < P.count; i++) b.idx.push(start + i);
    this.pop();
  }

  // ------------------------------------------------------------------
  // Horneado de luz por vértice (con N·L, atenuación y habitaciones).
  bake(lights, ambientOcc = []) {
    const cell = 8;
    const grid = new Map();
    const key = (x, z) => x + ',' + z;
    for (const L of lights) {
      const r = L.radius;
      const rid = this.roomId(L.room || 'out');
      L._rid = rid;
      for (let gx = Math.floor((L.x - r) / cell); gx <= Math.floor((L.x + r) / cell); gx++)
        for (let gz = Math.floor((L.z - r) / cell); gz <= Math.floor((L.z + r) / cell); gz++) {
          const k = key(gx, gz);
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push(L);
        }
    }
    for (const b of this.buckets.values()) {
      const n = b.count;
      const bake = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const px = b.pos[i * 3],
          py = b.pos[i * 3 + 1],
          pz = b.pos[i * 3 + 2];
        const nx = b.nor[i * 3],
          ny = b.nor[i * 3 + 1],
          nz = b.nor[i * 3 + 2];
        const list = grid.get(key(Math.floor(px / cell), Math.floor(pz / cell)));
        let r = 0,
          g = 0,
          bl = 0;
        if (list) {
          const room = b.room[i];
          for (const L of list) {
            if (L._rid !== room && !(L.anyRoom)) continue;
            const dx = L.x - px,
              dy = L.y - py,
              dz = L.z - pz;
            const d = Math.hypot(dx, dy, dz);
            if (d > L.radius) continue;
            const ndl = (nx * dx + ny * dy + nz * dz) / (d + 1e-4);
            const wrap = clamp((ndl + 0.25) / 1.25, 0, 1);
            const att = Math.pow(1 - d / L.radius, 2);
            const k = wrap * att * L.intensity;
            r += L.r * k;
            g += L.g * k;
            bl += L.b * k;
          }
        }
        bake[i * 3] = r;
        bake[i * 3 + 1] = g;
        bake[i * 3 + 2] = bl;
      }
      b.bake = bake;
    }
  }

  build() {
    const meshes = [];
    for (const b of this.buckets.values()) {
      if (b.count === 0) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      g.setAttribute('aBake', new THREE.BufferAttribute(b.bake || new Float32Array(b.count * 3), 3));
      g.setIndex(b.count > 65535 ? new THREE.Uint32BufferAttribute(b.idx, 1) : new THREE.Uint16BufferAttribute(b.idx, 1));
      g.computeBoundingSphere();
      g.computeBoundingBox();
      const mesh = new THREE.Mesh(g, worldMat(b.mat));
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      mesh.userData.bucket = b.key;
      if (b.group) mesh.userData.group = b.group;
      meshes.push(mesh);
    }
    return meshes;
  }

  stats() {
    let v = 0,
      t = 0;
    for (const b of this.buckets.values()) {
      v += b.count;
      t += b.idx.length / 3;
    }
    return { buckets: this.buckets.size, verts: v, tris: t };
  }
}
