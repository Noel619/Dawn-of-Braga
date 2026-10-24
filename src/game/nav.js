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
    if (b.tag === 'floor' || (b.tag === 'door' && !b.navSolid) || !b.enabled || b.camOnly) return;
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

// Navegación por capas (2,5D). En cada celda, las superficies en las que se
// puede estar de pie: la cara de arriba de las cajas de colisión (no la de
// los muros invisibles de lo que no se pisa) con la altura de un cuerpo libre
// encima y sin muros a menos de 'pad' a esa altura. Cada una se une con las de
// las celdas vecinas si el desnivel se salva andando: así las criaturas suben
// y bajan escaleras, rellanos y adarves detrás del jugador. (La rejilla plana,
// con una sola altura de suelo, tomaba cualquier peldaño de más de 0,65 m por
// un muro: esperaban al pie de la escalera o se metían debajo del rellano.)
// Misma interfaz que NavGrid, con las alturas de salida y de llegada.
export class LayerNav {
  constructor(walk, col, opts = {}) {
    this.layered = true;
    this.x0 = walk.x0;
    this.z0 = walk.z0;
    this.res = walk.res;
    this.w = walk.w;
    this.h = walk.h;
    this.col = col;
    // (las alturas que cuentan: lo de esta rejilla, no lo del piso de abajo)
    this.yMin = opts.yMin ?? -Infinity;
    this.yMax = opts.yMax ?? Infinity;
    this.pad = opts.pad ?? 0.25;
    // (lo que el cuerpo sube de un paso, como en moveBody; lo que asoma menos
    // de 'low' sobre una superficie no estorba —un peldaño, un bordillo—)
    this.rise = opts.rise ?? 0.5;
    this.low = opts.low ?? 0.65;
    this.head = opts.head ?? 1.7;
    this.L = opts.layers ?? 3; // capas por celda (de abajo arriba; NaN: no hay más)
    const n = this.w * this.h * this.L;
    this.ly = new Float32Array(n).fill(NaN);
    this.g = new Float32Array(n);
    this.from = new Int32Array(n);
    this.stamp = new Uint32Array(n);
    this.closed = new Uint32Array(n);
    this.curStamp = 1;
    this._q = [];
    this._c = [];
    this.edges = new Map();
    this.build(0, this.w - 1, 0, this.h - 1);
  }

  // Las capas de las celdas i0..i1 × j0..j1.
  build(i0, i1, j0, j1) {
    const { col, res, pad, L, rise, low, head } = this;
    const q = this._q,
      cand = this._c;
    const R = Math.max(pad, 0.1);
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const x = this.x0 + (i + 0.5) * res,
          z = this.z0 + (j + 0.5) * res;
        const base = (j * this.w + i) * L;
        for (let k = 0; k < L; k++) this.ly[base + k] = NaN;
        col.query(x - R, z - R, x + R, z + R, q);
        // dónde se puede poner un pie: lo que hay justo en el centro de la
        // celda (en una escalera, su peldaño; el de al lado ya es otra altura)
        cand.length = 0;
        for (const b of q) {
          if (b.camOnly || b.tag === 'block' || (b.tag === 'door' && !b.navSolid)) continue;
          if (b.maxy < this.yMin || b.maxy > this.yMax) continue;
          if (col.overlapXZ(b, x, z, 0.06)) cand.push(b.maxy);
        }
        if (!cand.length) continue;
        cand.sort((a, b) => b - a);
        let n = 0,
          above = Infinity;
        const out = [];
        for (const y of cand) {
          // (a menos de un peldaño de la de encima, es la misma superficie)
          if (above - y < rise) continue;
          above = y;
          let free = true;
          for (const b of q) {
            // (enterrada en otra caja —el suelo bajo el primer peldaño de una
            // escalera—: no se pisa)
            if (b.miny < y - 0.01 && b.maxy > y + 0.01 && !b.camOnly && b.tag !== 'block' && !(b.tag === 'door' && !b.navSolid) && col.overlapXZ(b, x, z, 0.04)) {
              free = false;
              break;
            }
            if (b.camOnly || b.tag === 'floor' || (b.tag === 'door' && !b.navSolid)) continue;
            if (!(b.maxy > y + low && b.miny < y + head)) continue;
            if (col.overlapXZ(b, x, z, pad - 0.01)) {
              free = false;
              break;
            }
          }
          if (free) out.push(y);
        }
        out.sort((a, b) => a - b);
        for (const y of out) if (n < L) this.ly[base + n++] = y;
      }
  }

  // Vuelve a calcular una zona tras cambiar sus obstáculos (una puerta, un
  // puente, un mueble roto).
  refresh(minx, minz, maxx, maxz) {
    const p = this.pad + 0.2;
    const i0 = Math.max(0, Math.floor((minx - p - this.x0) / this.res)),
      i1 = Math.min(this.w - 1, Math.floor((maxx + p - this.x0) / this.res)),
      j0 = Math.max(0, Math.floor((minz - p - this.z0) / this.res)),
      j1 = Math.min(this.h - 1, Math.floor((maxz + p - this.z0) / this.res));
    if (i0 <= i1 && j0 <= j1) this.build(i0, i1, j0, j1);
    this.edges.clear();
  }

  ci(x) {
    return Math.floor((x - this.x0) / this.res);
  }
  cj(z) {
    return Math.floor((z - this.z0) / this.res);
  }
  // El nodo (celda y capa) de (i, j) a menos de tol de la altura y (el más
  // cercano; -1 si no hay). Sin altura, el más bajo.
  layerAt(i, j, y, tol = this.rise) {
    if (i < 0 || j < 0 || i >= this.w || j >= this.h) return -1;
    const L = this.L,
      base = (j * this.w + i) * L;
    let best = -1,
      bd = tol;
    for (let k = 0; k < L; k++) {
      const v = this.ly[base + k];
      if (v !== v) break;
      if (y === undefined) return base + k;
      const d = Math.abs(v - y);
      if (d <= bd) {
        bd = d;
        best = base + k;
      }
    }
    return best;
  }
  // El nodo de la celda (ni, nj) al que se llega andando desde (x, y, z):
  // en llano, el de su capa; con desnivel (una escalera, un bordillo, el
  // borde de un rellano), si siguiendo el suelo de un sitio al otro, como el
  // cuerpo, no hay escalón de más de 'rise' ni se cae por un borde. (Así se
  // sube una escalera de frente, también una empinada, con dos peldaños por
  // celda, y no de lado, contra un peldaño alto.)
  stepTo(x, z, y, ni, nj) {
    if (ni < 0 || nj < 0 || ni >= this.w || nj >= this.h) return -1;
    const L = this.L,
      base = (nj * this.w + ni) * L;
    let best = -1,
      bd = Infinity;
    for (let k = 0; k < L; k++) {
      const v = this.ly[base + k];
      if (v !== v) break;
      const d = Math.abs(v - y);
      if (d > 2 * this.rise + 0.1 || d >= bd) continue;
      if (d > 0.2 && !this.walkGround(x, z, y, this.x0 + (ni + 0.5) * this.res, this.z0 + (nj + 0.5) * this.res, v)) continue;
      bd = d;
      best = base + k;
    }
    return best;
  }
  // Siguiendo el suelo de (ax, ay, az) a (bx, by, bz) en cinco pasos, como
  // moveBody: sube lo que no pasa de un escalón y baja sin caerse.
  walkGround(ax, az, ay, bx, bz, by) {
    let cur = ay;
    for (let s = 1; s <= 5; s++) {
      const t = s / 5;
      const g = this.col.groundHeight(ax + (bx - ax) * t, az + (bz - az) * t, 0.05, cur + this.rise, true);
      if (g < cur - this.rise - 0.05) return false;
      cur = g;
    }
    // (la capa de la celda es lo más alto que pisa junto a su centro: puede
    // quedar un escalón por encima del suelo de este)
    return Math.abs(cur - by) <= this.rise;
  }
  // stepTo de un nodo en una de sus ocho direcciones, guardado (se borra al
  // recalcular la zona)
  edge(node, dk, x, z, y, ni, nj) {
    // (en llano, sin más)
    const k = this.layerAt(ni, nj, y, 0.2);
    if (k >= 0) return k;
    const key = node * 8 + dk;
    let r = this.edges.get(key);
    if (r === undefined) {
      if (this.edges.size > 200000) this.edges.clear();
      this.edges.set(key, (r = this.stepTo(x, z, y, ni, nj)));
    }
    return r;
  }
  ok(i, j, y) {
    return this.layerAt(i, j, y, y === undefined ? 0 : 1.2) >= 0;
  }
  walkable(x, z, y) {
    return this.ok(this.ci(x), this.cj(z), y);
  }
  // Línea transitable sin salirse de la superficie (supermuestreada): cada
  // muestra, en la capa a un paso de la anterior; llega a la altura by.
  line(ax, az, bx, bz, ay, by) {
    let k = this.layerAt(this.ci(ax), this.cj(az), ay, ay === undefined ? 0 : 1.2);
    if (k < 0) return false;
    let y = this.ly[k];
    const d = Math.hypot(bx - ax, bz - az);
    const n = Math.ceil(d / (this.res * 0.5));
    let px = ax,
      pz = az;
    for (let s = 1; s <= n; s++) {
      const t = s / n;
      const x = ax + (bx - ax) * t,
        z = az + (bz - az) * t;
      k = this.stepTo(px, pz, y, this.ci(x), this.cj(z));
      if (k < 0) return false;
      y = this.ly[k];
      px = x;
      pz = z;
    }
    return by === undefined || Math.abs(y - by) < 1.2;
  }
  // La celda transitable más cercana (a la altura y, con holgura): [i, j, nodo].
  nearest(i, j, r = 4, y) {
    const tol = y === undefined ? 0 : 1.5;
    let k = this.layerAt(i, j, y, tol);
    if (k >= 0) return [i, j, k];
    for (let s = 1; s <= r; s++)
      for (let dj = -s; dj <= s; dj++)
        for (let di = -s; di <= s; di++) {
          if (Math.abs(di) !== s && Math.abs(dj) !== s) continue;
          k = this.layerAt(i + di, j + dj, y, tol);
          if (k >= 0) return [i + di, j + dj, k];
        }
    return null;
  }
  // A* 8-conexo por celdas y capas con presupuesto de nodos; devuelve la
  // lista de puntos [x, z, y] suavizada (y complete: si llega).
  path(ax, az, bx, bz, budget = 6000, ay, by) {
    const s = this.nearest(this.ci(ax), this.cj(az), 4, ay);
    const e = this.nearest(this.ci(bx), this.cj(bz), 4, by);
    if (!s || !e) return null;
    const W = this.w,
      L = this.L,
      res = this.res;
    const st = ++this.curStamp;
    const start = s[2],
      goal = e[2];
    const ey = this.ly[goal];
    // montículo binario en arrays tipados (sin un objeto por nodo)
    if (!this.hF) {
      this.hF = new Float32Array(1 << 14);
      this.hI = new Int32Array(1 << 14);
    }
    let hn = 0;
    const push = (idx, f) => {
      if (hn >= this.hF.length) {
        const F = new Float32Array(this.hF.length * 2),
          I = new Int32Array(this.hI.length * 2);
        F.set(this.hF);
        I.set(this.hI);
        this.hF = F;
        this.hI = I;
      }
      const HF = this.hF,
        HI = this.hI;
      let i = hn++;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (HF[p] <= f) break;
        HF[i] = HF[p];
        HI[i] = HI[p];
        i = p;
      }
      HF[i] = f;
      HI[i] = idx;
    };
    const pop = () => {
      const HF = this.hF,
        HI = this.hI;
      const top = HI[0];
      hn--;
      if (hn > 0) {
        const f = HF[hn],
          idx = HI[hn];
        let i = 0;
        for (;;) {
          const l = i * 2 + 1;
          if (l >= hn) break;
          const r = l + 1;
          const m = r < hn && HF[r] < HF[l] ? r : l;
          if (HF[m] >= f) break;
          HF[i] = HF[m];
          HI[i] = HI[m];
          i = m;
        }
        HF[i] = f;
        HI[i] = idx;
      }
      return top;
    };
    const hfn = (idx) => {
      const c = (idx / L) | 0;
      const dx = Math.abs((c % W) - e[0]),
        dz = Math.abs(((c / W) | 0) - e[1]);
      return Math.max(dx, dz) + 0.414 * Math.min(dx, dz) + Math.abs(this.ly[idx] - ey) / res;
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
    while (hn > 0 && n < budget) {
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
      const c = (cur / L) | 0,
        ci = c % W,
        cj = (c / W) | 0,
        y = this.ly[cur];
      const cx = this.x0 + (ci + 0.5) * res,
        cz = this.z0 + (cj + 0.5) * res;
      for (let dk = 0; dk < 8; dk++) {
        const [di, dj, w] = DIRS[dk];
        const nk = this.edge(cur, dk, cx, cz, y, ci + di, cj + dj);
        if (nk < 0) continue;
        if (di && dj && (this.edge(cur, dk < 6 ? 0 : 1, cx, cz, y, ci + di, cj) < 0 || this.edge(cur, dk === 4 || dk === 6 ? 2 : 3, cx, cz, y, ci, cj + dj) < 0)) continue;
        // (subir y bajar cuesta un poco más que andar en llano)
        const ng = this.g[cur] + w + Math.abs(this.ly[nk] - y) * 0.6;
        if (this.stamp[nk] === st && ng >= this.g[nk]) continue;
        this.stamp[nk] = st;
        this.g[nk] = ng;
        this.from[nk] = cur;
        push(nk, ng + hfn(nk) * 1.05);
      }
    }
    const end = found ? goal : best;
    const pts = [];
    let c = end,
      guard = 0;
    while (c !== -1 && guard++ < 40000) {
      const cell = (c / L) | 0;
      pts.push([this.x0 + ((cell % W) + 0.5) * res, this.z0 + (((cell / W) | 0) + 0.5) * res, this.ly[c]]);
      if (c === start) break;
      c = this.from[c];
    }
    pts.reverse();
    // suavizado por visibilidad, sin salirse de la superficie
    const out = [pts[0]];
    let k = 0;
    while (k < pts.length - 1) {
      let far = k + 1;
      for (let m = pts.length - 1; m > k + 1; m--) {
        if (this.line(pts[k][0], pts[k][1], pts[m][0], pts[m][1], pts[k][2], pts[m][2])) {
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
