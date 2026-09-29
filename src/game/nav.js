// Navegación: rejillas con obstáculos rasterizados y A* acotado.

export class NavGrid {
  constructor(walk, col, floorY, opts = {}) {
    this.x0 = walk.x0;
    this.z0 = walk.z0;
    this.res = walk.res;
    this.w = walk.w;
    this.h = walk.h;
    this.floorY = floorY; // función (x,z) -> altura de referencia
    this.col = col;
    this.pad = opts.pad ?? 0.25;
    this.base = walk.cells;
    this.cells = new Uint8Array(walk.cells); // 1 transitable
    // rasterizar obstáculos (cajas que bloquean a la altura del torso)
    for (const b of col.boxes) this.block(b);
    this.g = new Float32Array(this.w * this.h);
    this.from = new Int32Array(this.w * this.h);
    this.stamp = new Uint32Array(this.w * this.h);
    this.closed = new Uint32Array(this.w * this.h);
    this.curStamp = 1;
  }
  // Marca como no transitables las celdas que tapa la caja (dentro de los
  // límites de celda opcionales). Se bloquean las celdas cuyo centro queda a
  // menos de 'pad' de la caja (así una puerta de 1,3 m sigue siendo
  // transitable por mala que sea la alineación con la rejilla); vale también
  // para cajas giradas.
  block(b, lim = null) {
    if (b.tag === 'floor' || b.tag === 'door' || !b.enabled) return;
    const fy = this.floorY((b.minx + b.maxx) / 2, (b.minz + b.maxz) / 2);
    if (fy === null) return;
    if (!(b.maxy > fy + 0.65 && b.miny < fy + 1.7)) return;
    const pad = this.pad;
    let i0 = Math.max(0, Math.floor((b.minx - pad - this.x0) / this.res)),
      i1 = Math.min(this.w - 1, Math.floor((b.maxx + pad - this.x0) / this.res));
    let j0 = Math.max(0, Math.floor((b.minz - pad - this.z0) / this.res)),
      j1 = Math.min(this.h - 1, Math.floor((b.maxz + pad - this.z0) / this.res));
    if (lim) {
      i0 = Math.max(i0, lim[0]);
      i1 = Math.min(i1, lim[1]);
      j0 = Math.max(j0, lim[2]);
      j1 = Math.min(j1, lim[3]);
    }
    const r = pad - 0.01;
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        if (!this.col.overlapXZ(b, this.x0 + (i + 0.5) * this.res, this.z0 + (j + 0.5) * this.res, r)) continue;
        this.cells[j * this.w + i] = 0;
      }
  }

  // Vuelve a calcular una zona tras cambiar sus obstáculos (un mueble roto).
  refresh(minx, minz, maxx, maxz) {
    const pad = this.pad;
    const lim = [
      Math.max(0, Math.floor((minx - pad - this.x0) / this.res)),
      Math.min(this.w - 1, Math.floor((maxx + pad - this.x0) / this.res)),
      Math.max(0, Math.floor((minz - pad - this.z0) / this.res)),
      Math.min(this.h - 1, Math.floor((maxz + pad - this.z0) / this.res)),
    ];
    if (lim[0] > lim[1] || lim[2] > lim[3]) return;
    for (let j = lim[2]; j <= lim[3]; j++) for (let i = lim[0]; i <= lim[1]; i++) this.cells[j * this.w + i] = this.base[j * this.w + i];
    for (const b of this.col.query(minx - pad * 2, minz - pad * 2, maxx + pad * 2, maxz + pad * 2)) this.block(b, lim);
  }

  ci(x) {
    return Math.floor((x - this.x0) / this.res);
  }
  cj(z) {
    return Math.floor((z - this.z0) / this.res);
  }
  ok(i, j) {
    return i >= 0 && j >= 0 && i < this.w && j < this.h && this.cells[j * this.w + i] === 1;
  }
  walkable(x, z) {
    return this.ok(this.ci(x), this.cj(z));
  }
  // línea transitable (Bresenham supermuestreado)
  line(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az);
    const n = Math.ceil(d / (this.res * 0.5));
    for (let k = 0; k <= n; k++) {
      const t = k / Math.max(1, n);
      if (!this.walkable(ax + (bx - ax) * t, az + (bz - az) * t)) return false;
    }
    return true;
  }
  // encuentra la celda transitable más cercana
  nearest(i, j, r = 4) {
    if (this.ok(i, j)) return [i, j];
    for (let k = 1; k <= r; k++)
      for (let dj = -k; dj <= k; dj++)
        for (let di = -k; di <= k; di++) {
          if (Math.abs(di) !== k && Math.abs(dj) !== k) continue;
          if (this.ok(i + di, j + dj)) return [i + di, j + dj];
        }
    return null;
  }
  // A* 8-conexo con presupuesto de nodos; devuelve lista de puntos [x,z] suavizada
  path(ax, az, bx, bz, budget = 6000) {
    const s = this.nearest(this.ci(ax), this.cj(az));
    const e = this.nearest(this.ci(bx), this.cj(bz));
    if (!s || !e) return null;
    const W = this.w;
    const st = ++this.curStamp;
    const start = s[1] * W + s[0],
      goal = e[1] * W + e[0];
    const heap = [];
    const push = (idx, f) => {
      heap.push([f, idx]);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1,
            r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top[1];
    };
    const hfn = (idx) => {
      const dx = Math.abs((idx % W) - e[0]),
        dz = Math.abs(((idx / W) | 0) - e[1]);
      return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
    };
    this.g[start] = 0;
    this.stamp[start] = st;
    this.from[start] = -1;
    push(start, hfn(start));
    let n = 0,
      found = false,
      best = start,
      bestH = hfn(start);
    const DIRS = [
      [1, 0, 1],
      [-1, 0, 1],
      [0, 1, 1],
      [0, -1, 1],
      [1, 1, 1.414],
      [1, -1, 1.414],
      [-1, 1, 1.414],
      [-1, -1, 1.414],
    ];
    while (heap.length && n < budget) {
      const cur = pop();
      if (this.closed[cur] === st) continue;
      this.closed[cur] = st;
      n++;
      if (cur === goal) {
        found = true;
        break;
      }
      const hc = hfn(cur);
      if (hc < bestH) {
        bestH = hc;
        best = cur;
      }
      const ci = cur % W,
        cj = (cur / W) | 0;
      for (const [di, dj, c] of DIRS) {
        const ni = ci + di,
          nj = cj + dj;
        if (!this.ok(ni, nj)) continue;
        if (di && dj && (!this.ok(ci + di, cj) || !this.ok(ci, cj + dj))) continue;
        const nidx = nj * W + ni;
        const ng = this.g[cur] + c;
        if (this.stamp[nidx] === st && ng >= this.g[nidx]) continue;
        this.stamp[nidx] = st;
        this.g[nidx] = ng;
        this.from[nidx] = cur;
        push(nidx, ng + hfn(nidx) * 1.05);
      }
    }
    let end = found ? goal : best;
    const pts = [];
    let c = end;
    let guard = 0;
    while (c !== -1 && guard++ < 20000) {
      pts.push([this.x0 + ((c % W) + 0.5) * this.res, this.z0 + (((c / W) | 0) + 0.5) * this.res]);
      if (c === start) break;
      c = this.from[c];
    }
    pts.reverse();
    // suavizado por visibilidad
    const out = [];
    let k = 0;
    out.push(pts[0]);
    while (k < pts.length - 1) {
      let far = k + 1;
      for (let m = pts.length - 1; m > k + 1; m--) {
        if (this.line(pts[k][0], pts[k][1], pts[m][0], pts[m][1])) {
          far = m;
          break;
        }
      }
      out.push(pts[far]);
      k = far;
    }
    return { pts: out, complete: found };
  }
}
