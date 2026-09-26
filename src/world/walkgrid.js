// Rejilla de transitabilidad: se "pintan" las zonas por las que se puede
// caminar y todo lo demás se convierte automáticamente en cajas de colisión
// (fusión voraz de celdas en rectángulos). Así el mapa queda sellado.

export class WalkGrid {
  constructor(x0, z0, x1, z1, res = 0.5) {
    this.x0 = x0;
    this.z0 = z0;
    this.res = res;
    this.w = Math.ceil((x1 - x0) / res);
    this.h = Math.ceil((z1 - z0) / res);
    this.cells = new Uint8Array(this.w * this.h); // 0 sólido, 1 transitable
  }
  _ix(x) {
    return Math.round((x - this.x0) / this.res);
  }
  _iz(z) {
    return Math.round((z - this.z0) / this.res);
  }
  paint(x0, z0, x1, z1, v = 1) {
    const i0 = Math.max(0, this._ix(Math.min(x0, x1))),
      i1 = Math.min(this.w, this._ix(Math.max(x0, x1)));
    const j0 = Math.max(0, this._iz(Math.min(z0, z1))),
      j1 = Math.min(this.h, this._iz(Math.max(z0, z1)));
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) this.cells[j * this.w + i] = v;
  }
  walkable(x, z) {
    const i = Math.floor((x - this.x0) / this.res),
      j = Math.floor((z - this.z0) / this.res);
    if (i < 0 || j < 0 || i >= this.w || j >= this.h) return false;
    return this.cells[j * this.w + i] === 1;
  }
  // Rectángulos máximos de celdas con valor v.
  rects(v = 0) {
    const used = new Uint8Array(this.w * this.h);
    const out = [];
    const W = this.w,
      H = this.h;
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        const k = j * W + i;
        if (used[k] || this.cells[k] !== v) continue;
        let i2 = i;
        while (i2 + 1 < W && !used[j * W + i2 + 1] && this.cells[j * W + i2 + 1] === v) i2++;
        let j2 = j;
        outer: while (j2 + 1 < H) {
          for (let ii = i; ii <= i2; ii++) {
            const kk = (j2 + 1) * W + ii;
            if (used[kk] || this.cells[kk] !== v) break outer;
          }
          j2++;
        }
        for (let jj = j; jj <= j2; jj++) for (let ii = i; ii <= i2; ii++) used[jj * W + ii] = 1;
        out.push([this.x0 + i * this.res, this.z0 + j * this.res, this.x0 + (i2 + 1) * this.res, this.z0 + (j2 + 1) * this.res]);
      }
    return out;
  }
  toColliders(col, y0, y1, tag = 'block') {
    const r = this.rects(0);
    for (const [a, b, c, d] of r) {
      const box = col.add(a, y0, b, c, y1, d, tag);
      box.cam = true;
    }
    return r.length;
  }
}
