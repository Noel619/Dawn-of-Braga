// El campo de batalla visto desde arriba: dónde quedan casas en pie y cuánto
// sitio libre hay alrededor de cada punto. Sale de la rejilla de
// transitabilidad del nivel (más las huellas de las casas visitables, cuyo
// interior se puede pisar pero no atravesar desde fuera).
//
// Sirve para que el coloso no se plante dentro de una casa (se arrima a las
// fachadas y resbala por ellas) y para que su cola y su campana se doblen y
// choquen contra los muros en vez de atravesarlos.
//
// Cada celda guarda la celda de casa más cercana (y, dentro de una casa, la
// de suelo libre más cercana): una transformada de distancia de dos pasadas
// que arrastra el punto más cercano de vecino en vecino.
import * as THREE from 'three';

function nearest(W, H, src) {
  const site = new Int32Array(W * H).fill(-1);
  const d2 = new Float64Array(W * H).fill(Infinity);
  for (let k = 0; k < W * H; k++)
    if (src[k]) {
      site[k] = k;
      d2[k] = 0;
    }
  const relax = (k, x, y, kn) => {
    const s = site[kn];
    if (s < 0) return;
    const dx = x - (s % W),
      dy = y - ((s / W) | 0);
    const d = dx * dx + dy * dy;
    if (d < d2[k]) {
      d2[k] = d;
      site[k] = s;
    }
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = y * W + x;
      if (x > 0) relax(k, x, y, k - 1);
      if (y > 0) {
        relax(k, x, y, k - W);
        if (x > 0) relax(k, x, y, k - W - 1);
        if (x < W - 1) relax(k, x, y, k - W + 1);
      }
    }
    for (let x = W - 2; x >= 0; x--) relax(y * W + x, x, y, y * W + x + 1);
  }
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const k = y * W + x;
      if (x < W - 1) relax(k, x, y, k + 1);
      if (y < H - 1) {
        relax(k, x, y, k + W);
        if (x < W - 1) relax(k, x, y, k + W + 1);
        if (x > 0) relax(k, x, y, k + W - 1);
      }
    }
    for (let x = 1; x < W; x++) relax(y * W + x, x, y, y * W + x - 1);
  }
  return site;
}

export class Field {
  // S: la rejilla del nivel (WalkGrid); win: la ventana { x0, z0, x1, z1 };
  // o.free(v): qué valores de celda son suelo libre; o.houses: rectángulos
  // { x0, z0, x1, z1 } que cuentan como casa aunque se pise su interior
  constructor(S, win, o = {}) {
    const res = S.res;
    const free = o.free || ((v) => v !== 0);
    this.res = res;
    this.x0 = Math.floor(win.x0 / res) * res;
    this.z0 = Math.floor(win.z0 / res) * res;
    const W = (this.W = Math.ceil((win.x1 - this.x0) / res)),
      H = (this.H = Math.ceil((win.z1 - this.z0) / res));
    const solid = (this.solid = new Uint8Array(W * H));
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        const x = this.x0 + (i + 0.5) * res,
          z = this.z0 + (j + 0.5) * res;
        const si = Math.floor((x - S.x0) / S.res),
          sj = Math.floor((z - S.z0) / S.res);
        const inS = si >= 0 && sj >= 0 && si < S.w && sj < S.h;
        solid[j * W + i] = inS && free(S.cells[sj * S.w + si]) ? 0 : 1;
      }
    for (const r of o.houses || []) {
      const i0 = Math.max(0, Math.floor((r.x0 - this.x0) / res)),
        i1 = Math.min(W, Math.ceil((r.x1 - this.x0) / res));
      const j0 = Math.max(0, Math.floor((r.z0 - this.z0) / res)),
        j1 = Math.min(H, Math.ceil((r.z1 - this.z0) / res));
      for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) solid[j * W + i] = 1;
    }
    this.wall = nearest(W, H, solid);
    const open = new Uint8Array(W * H);
    for (let k = 0; k < W * H; k++) open[k] = solid[k] ? 0 : 1;
    this.open = nearest(W, H, open);
    // la normal del último empujón (hacia fuera del muro)
    this.n = new THREE.Vector3();
  }
  _k(x, z) {
    const i = Math.floor((x - this.x0) / this.res),
      j = Math.floor((z - this.z0) / this.res);
    if (i < 0 || j < 0 || i >= this.W || j >= this.H) return -1;
    return j * this.W + i;
  }
  // ¿hay casa en (x, z)?
  blocked(x, z) {
    const k = this._k(x, z);
    return k >= 0 && this.solid[k] === 1;
  }
  // el sitio libre en (x, z): la distancia a la casa más cercana (dentro de
  // una, negativa; fuera de la ventana, infinita)
  clear(x, z) {
    const k = this._k(x, z);
    if (k < 0) return Infinity;
    if (this.solid[k]) return -1;
    const s = this.wall[k];
    if (s < 0) return Infinity;
    const r = this.res,
      bx = this.x0 + (s % this.W) * r,
      bz = this.z0 + ((s / this.W) | 0) * r;
    const qx = x < bx ? bx : x > bx + r ? bx + r : x,
      qz = z < bz ? bz : z > bz + r ? bz + r : z;
    return Math.hypot(x - qx, z - qz);
  }
  // Saca el punto P (en planta) a m metros o más de las casas. Devuelve si
  // lo ha movido (y la normal del empujón en this.n).
  push(P, m) {
    let moved = false;
    const r = this.res;
    for (let it = 0; it < 3; it++) {
      const k = this._k(P.x, P.z);
      if (k < 0) return moved;
      if (this.solid[k]) {
        // dentro de una casa: al suelo libre más cercano
        const s = this.open[k];
        if (s < 0) return moved;
        const cx = this.x0 + ((s % this.W) + 0.5) * r,
          cz = this.z0 + (((s / this.W) | 0) + 0.5) * r;
        this.n.set(cx - P.x, 0, cz - P.z);
        if (this.n.lengthSq() > 1e-8) this.n.normalize();
        P.x = cx;
        P.z = cz;
        moved = true;
        continue;
      }
      const s = this.wall[k];
      if (s < 0) return moved;
      const bx = this.x0 + (s % this.W) * r,
        bz = this.z0 + ((s / this.W) | 0) * r;
      const qx = P.x < bx ? bx : P.x > bx + r ? bx + r : P.x,
        qz = P.z < bz ? bz : P.z > bz + r ? bz + r : P.z;
      let dx = P.x - qx,
        dz = P.z - qz;
      const d = Math.hypot(dx, dz);
      if (d >= m - 1e-3) return moved;
      if (d < 1e-5) {
        dx = P.x - (bx + r / 2);
        dz = P.z - (bz + r / 2);
        const L = Math.hypot(dx, dz) || 1;
        dx /= L;
        dz /= L;
      } else {
        dx /= d;
        dz /= d;
      }
      P.x = qx + dx * m;
      P.z = qz + dz * m;
      this.n.set(dx, 0, dz);
      moved = true;
    }
    return moved;
  }
}
