// Mundo de colisión basado en cajas con rejilla espacial. Las cajas son
// alineadas a ejes o giradas en Y (orientadas: atrezo en diagonal sin paredes
// invisibles en las esquinas). Los personajes son cilindros (círculo en XZ +
// altura). Escalones bajos (< stepH) se suben automáticamente; lo demás es pared.

const CELL = 4;

// Coordenadas locales de (x,z) en una caja orientada.
function toLocal(o, x, z) {
  const dx = x - o.cx,
    dz = z - o.cz;
  _l[0] = dx * o.c - dz * o.s;
  _l[1] = dx * o.s + dz * o.c;
  return _l;
}
const _l = [0, 0];

export class CollisionWorld {
  constructor() {
    this.boxes = [];
    this.grid = new Map();
    this.stamp = 0;
  }

  add(minx, miny, minz, maxx, maxy, maxz, tag = null) {
    if (maxx < minx) [minx, maxx] = [maxx, minx];
    if (maxy < miny) [miny, maxy] = [maxy, miny];
    if (maxz < minz) [minz, maxz] = [maxz, minz];
    const b = { minx, miny, minz, maxx, maxy, maxz, tag, enabled: true, _s: 0, cam: true, obb: null };
    this.boxes.push(b);
    for (let gx = Math.floor(minx / CELL); gx <= Math.floor(maxx / CELL); gx++)
      for (let gz = Math.floor(minz / CELL); gz <= Math.floor(maxz / CELL); gz++) {
        const k = gx * 73856093 ^ gz * 19349663;
        let arr = this.grid.get(k);
        if (!arr) this.grid.set(k, (arr = []));
        arr.push(b);
      }
    return b;
  }

  // Caja girada 'rot' en Y (convención de three.js: el eje x local apunta a
  // (cos, -sin) en el mundo) con semiejes hx (x local) y hz (z local).
  addOBB(cx, cz, hx, hz, rot, y0, y1, tag = null) {
    const c = Math.cos(rot),
      s = Math.sin(rot);
    const ac = Math.abs(c),
      as = Math.abs(s);
    if (ac > 0.9998) return this.add(cx - hx, y0, cz - hz, cx + hx, y1, cz + hz, tag);
    if (as > 0.9998) return this.add(cx - hz, y0, cz - hx, cx + hz, y1, cz + hx, tag);
    const ex = ac * hx + as * hz,
      ez = as * hx + ac * hz;
    const b = this.add(cx - ex, y0, cz - ez, cx + ex, y1, cz + ez, tag);
    b.obb = { cx, cz, hx, hz, c, s };
    return b;
  }

  // ¿El círculo (x,z,r) toca la huella de la caja?
  overlapXZ(b, x, z, r = 0) {
    if (x + r < b.minx || x - r > b.maxx || z + r < b.minz || z - r > b.maxz) return false;
    if (!b.obb) return true;
    const o = b.obb;
    const l = toLocal(o, x, z);
    return Math.abs(l[0]) <= o.hx + r && Math.abs(l[1]) <= o.hz + r;
  }

  query(minx, minz, maxx, maxz, out = []) {
    out.length = 0;
    const s = ++this.stamp;
    for (let gx = Math.floor(minx / CELL); gx <= Math.floor(maxx / CELL); gx++)
      for (let gz = Math.floor(minz / CELL); gz <= Math.floor(maxz / CELL); gz++) {
        const arr = this.grid.get(gx * 73856093 ^ gz * 19349663);
        if (!arr) continue;
        for (const b of arr) {
          if (b._s === s || !b.enabled) continue;
          b._s = s;
          if (b.maxx < minx || b.minx > maxx || b.maxz < minz || b.minz > maxz) continue;
          out.push(b);
        }
      }
    return out;
  }

  // Altura del suelo bajo (x,z) considerando cajas con techo <= yMax.
  groundHeight(x, z, r, yMax) {
    const list = this.query(x - r, z - r, x + r, z + r, this._q1 || (this._q1 = []));
    let g = -100;
    for (const b of list) {
      if (b.maxy > yMax) continue;
      if (!this.overlapXZ(b, x, z, r * 0.7)) continue;
      if (b.maxy > g) g = b.maxy;
    }
    return g;
  }

  // Empuja un círculo fuera de las cajas que bloquean a esa altura.
  resolve(pos, r, feet, height, stepH) {
    let hit = false;
    for (let it = 0; it < 3; it++) {
      const list = this.query(pos.x - r, pos.z - r, pos.x + r, pos.z + r, this._q2 || (this._q2 = []));
      let moved = false;
      for (const b of list) {
        if (b.maxy <= feet + stepH || b.miny >= feet + height) continue;
        if (b.obb) {
          if (this._resolveOBB(b.obb, pos, r)) moved = hit = true;
          continue;
        }
        const cx = Math.max(b.minx, Math.min(pos.x, b.maxx));
        const cz = Math.max(b.minz, Math.min(pos.z, b.maxz));
        let dx = pos.x - cx,
          dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          const push = r - d;
          pos.x += (dx / d) * push;
          pos.z += (dz / d) * push;
        } else {
          // centro dentro de la caja: salir por el lado más cercano
          const l = pos.x - b.minx,
            rr = b.maxx - pos.x,
            n = pos.z - b.minz,
            s = b.maxz - pos.z;
          const m = Math.min(l, rr, n, s);
          if (m === l) pos.x = b.minx - r;
          else if (m === rr) pos.x = b.maxx + r;
          else if (m === n) pos.z = b.minz - r;
          else pos.z = b.maxz + r;
        }
        moved = hit = true;
      }
      if (!moved) break;
    }
    return hit;
  }

  _resolveOBB(o, pos, r) {
    const l = toLocal(o, pos.x, pos.z);
    const lx = l[0],
      lz = l[1];
    const qx = Math.max(-o.hx, Math.min(lx, o.hx)),
      qz = Math.max(-o.hz, Math.min(lz, o.hz));
    const ex = lx - qx,
      ez = lz - qz;
    const d2 = ex * ex + ez * ez;
    if (d2 >= r * r) return false;
    let nx, nz;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2);
      nx = qx + (ex / d) * r;
      nz = qz + (ez / d) * r;
    } else {
      const pl = lx + o.hx,
        pr = o.hx - lx,
        pn = lz + o.hz,
        ps = o.hz - lz;
      const m = Math.min(pl, pr, pn, ps);
      nx = lx;
      nz = lz;
      if (m === pl) nx = -o.hx - r;
      else if (m === pr) nx = o.hx + r;
      else if (m === pn) nz = -o.hz - r;
      else nz = o.hz + r;
    }
    pos.x = o.cx + nx * o.c + nz * o.s;
    pos.z = o.cz - nx * o.s + nz * o.c;
    return true;
  }

  // Rayo contra cajas (método de las placas). Devuelve distancia o Infinity.
  raycast(ox, oy, oz, dx, dy, dz, maxD, filter = null) {
    const ex = ox + dx * maxD,
      ez = oz + dz * maxD;
    const list = this.query(Math.min(ox, ex), Math.min(oz, ez), Math.max(ox, ex), Math.max(oz, ez), this._q3 || (this._q3 = []));
    let best = maxD;
    let found = false;
    const iy = 1 / (dy || 1e-9);
    for (const b of list) {
      if (filter && !filter(b)) continue;
      let px, pz, qx, qz, x0, x1, z0, z1;
      if (b.obb) {
        const o = b.obb;
        const l = toLocal(o, ox, oz);
        px = l[0];
        pz = l[1];
        qx = dx * o.c - dz * o.s;
        qz = dx * o.s + dz * o.c;
        x0 = -o.hx;
        x1 = o.hx;
        z0 = -o.hz;
        z1 = o.hz;
      } else {
        px = ox;
        pz = oz;
        qx = dx;
        qz = dz;
        x0 = b.minx;
        x1 = b.maxx;
        z0 = b.minz;
        z1 = b.maxz;
      }
      const ix = 1 / (qx || 1e-9),
        iz = 1 / (qz || 1e-9);
      let t1 = (x0 - px) * ix,
        t2 = (x1 - px) * ix;
      let tmin = Math.min(t1, t2),
        tmax = Math.max(t1, t2);
      t1 = (b.miny - oy) * iy;
      t2 = (b.maxy - oy) * iy;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
      t1 = (z0 - pz) * iz;
      t2 = (z1 - pz) * iz;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
      if (tmax >= Math.max(tmin, 0) && tmin < best) {
        if (tmin < 0) continue; // origen dentro
        best = tmin;
        found = true;
      }
    }
    return found ? best : Infinity;
  }

  lineOfSight(ax, ay, az, bx, by, bz) {
    const dx = bx - ax,
      dy = by - ay,
      dz = bz - az;
    const d = Math.hypot(dx, dy, dz);
    if (d < 0.01) return true;
    const t = this.raycast(ax, ay, az, dx / d, dy / d, dz / d, d, (b) => b.maxy - b.miny > 0.9 && !b.noSight);
    return t === Infinity;
  }
}

// Mueve un cuerpo con gravedad, escalones y deslizamiento contra paredes.
export function moveBody(world, body, dx, dz, dt) {
  const stepH = body.stepH ?? 0.5;
  // subpasos para evitar atravesar paredes finas a alta velocidad
  const len = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(len / (body.radius * 0.8)));
  let hit = false;
  for (let i = 0; i < steps; i++) {
    body.pos.x += dx / steps;
    body.pos.z += dz / steps;
    if (world.resolve(body.pos, body.radius, body.pos.y, body.height, stepH)) hit = true;
  }
  const g = world.groundHeight(body.pos.x, body.pos.z, body.radius, body.pos.y + stepH);
  if (body.grounded && g < body.pos.y && body.pos.y - g <= stepH + 0.05) {
    // bajar escalones pegado al suelo
    body.pos.y = g;
    body.vy = 0;
  } else if (g < body.pos.y - 0.001) {
    body.vy = (body.vy || 0) - 22 * dt;
    body.pos.y += body.vy * dt;
    body.grounded = false;
    if (body.pos.y <= g) {
      body.pos.y = g;
      body.vy = 0;
      body.grounded = true;
    }
  } else {
    body.pos.y = g;
    body.vy = 0;
    body.grounded = true;
  }
  if (body.pos.y < -60) body.fellOut = true;
  return hit;
}
