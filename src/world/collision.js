// Mundo de colisión basado en cajas alineadas a ejes con rejilla espacial.
// Los personajes son cilindros (círculo en XZ + altura). Escalones bajos
// (< stepH) se suben automáticamente; lo demás es pared.

const CELL = 4;

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
    const b = { minx, miny, minz, maxx, maxy, maxz, tag, enabled: true, _s: 0, cam: true };
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
      if (x + r * 0.7 < b.minx || x - r * 0.7 > b.maxx || z + r * 0.7 < b.minz || z - r * 0.7 > b.maxz) continue;
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

  // Rayo contra cajas (método de las placas). Devuelve distancia o Infinity.
  raycast(ox, oy, oz, dx, dy, dz, maxD, filter = null) {
    const ex = ox + dx * maxD,
      ez = oz + dz * maxD;
    const list = this.query(Math.min(ox, ex), Math.min(oz, ez), Math.max(ox, ex), Math.max(oz, ez), this._q3 || (this._q3 = []));
    let best = maxD;
    let found = false;
    const ix = 1 / (dx || 1e-9),
      iy = 1 / (dy || 1e-9),
      iz = 1 / (dz || 1e-9);
    for (const b of list) {
      if (filter && !filter(b)) continue;
      let t1 = (b.minx - ox) * ix,
        t2 = (b.maxx - ox) * ix;
      let tmin = Math.min(t1, t2),
        tmax = Math.max(t1, t2);
      t1 = (b.miny - oy) * iy;
      t2 = (b.maxy - oy) * iy;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
      t1 = (b.minz - oz) * iz;
      t2 = (b.maxz - oz) * iz;
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
