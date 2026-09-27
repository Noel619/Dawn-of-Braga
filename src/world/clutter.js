// Pasada automática de detritos: piedras sueltas, tejas, tablas rotas, paja,
// trapos, huesos y hierbajos donde se acumulan de verdad: al pie de los muros
// (y, más raros, sueltos por el suelo). Sólo en exteriores a nivel de calle,
// lejos de puertas, objetos, altares, enemigos y cadáveres.
import * as THREE from 'three';
import { RNG } from '../core/util.js';

// Paletas por tipo de zona: [objeto, peso]
const PALETTE = {
  dirt: [
    ['straw', 3],
    ['stone', 3],
    ['weeds', 3.2],
    ['plank', 1.4],
    ['rag', 0.6],
    ['bone', 0.6],
    ['shards', 0.6],
    ['tile', 0.3],
  ],
  tannery: [
    ['leather', 2.5],
    ['stone', 2],
    ['bone', 1.2],
    ['straw', 1.5],
    ['weeds', 2],
    ['plank', 1],
    ['rag', 0.8],
  ],
  street: [
    ['stone', 3],
    ['tile', 2],
    ['shards', 1.5],
    ['plank', 1.5],
    ['straw', 1.1],
    ['weeds', 2.6],
    ['rag', 0.8],
    ['bone', 0.45],
  ],
  garden: [
    ['leaves', 4],
    ['stone', 1.6],
    ['weeds', 3.4],
    ['bone', 0.3],
  ],
};
const ZONE_KIND = { castle: 'dirt', tanners: 'tannery', cloister: 'garden' };
const SKIP_ATMO = new Set(['interior', 'prison', 'chapel', 'cathedral', 'crypt', 'arena', 'tunnel', 'dawn']);

function pick(rng, list) {
  let tot = 0;
  for (const [, w] of list) tot += w;
  let r = rng.next() * tot;
  for (const [k, w] of list) if ((r -= w) <= 0) return k;
  return list[0][0];
}

export function scatterClutter(ctx, S, L, corpses = []) {
  const wb = ctx.wb;
  wb.setRoom(null);
  const rng = new RNG(9091);
  const col = ctx.col;
  const q = [];
  const zoneAt = (x, z) => {
    for (const zn of L.zones) for (const r of zn.rects) if (x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3] && r[4] <= 0 && r[5] >= 0.5) return zn;
    return null;
  };
  // puntos a respetar
  const avoid = [];
  for (const it of L.interact) {
    if (it.kind === 'trigger') continue;
    const r = it.kind === 'altar' ? 2.6 : it.kind === 'door' ? Math.max(1.8, (it.w || 1.3) * 0.5 + 1.2) : it.kind === 'fog' ? 2.4 : 1.5;
    avoid.push([it.x, it.z, r, it.y ?? 0]);
  }
  for (const c of corpses) avoid.push([c.x, c.z, 0.95, c.y]);
  for (const e of L.enemies) avoid.push([e.x, e.z, 0.8, e.y]);
  const avoided = (x, z) => avoid.some(([ax, az, r, ay]) => Math.abs(ay) < 1.5 && (ax - x) ** 2 + (az - z) ** 2 < r * r);
  const occupied = (x, z) => col.query(x - 0.2, z - 0.2, x + 0.2, z + 0.2, q).some((b) => b.maxy > 0.04 && b.miny < 2.2 && b.tag !== 'fog');

  // ---------------------------------------------------------- piezas
  const Y = new THREE.Vector3();
  const stone = (x, z, big = 1) => {
    const s = rng.range(0.08, 0.24) * big;
    wb.push();
    wb.translate(x, s * 0.18, z);
    wb.rotateY(rng.range(0, 3.14));
    wb.rotateX(rng.range(-0.35, 0.35));
    wb.rotateZ(rng.range(-0.35, 0.35));
    const k = rng.range(0.75, 1.05);
    wb.box(rng.chance(0.6) ? 'wallstone' : 'cobble', -s / 2, -s * 0.3, -s * 0.42, s / 2, s * 0.32, s * 0.42, { ao: false, faces: 'tnsew', tint: [k, k * 0.98, k * 0.95] });
    wb.pop();
  };
  const flat = (mat, x, z, w, d, tint, y = 0.012, tilt = 0.08) => {
    wb.push();
    wb.translate(x, y, z);
    wb.rotateY(rng.range(0, 3.14));
    wb.rotateX(rng.range(-tilt, tilt));
    wb.rotateZ(rng.range(-tilt, tilt));
    wb.box(mat, -w / 2, -0.008, -d / 2, w / 2, 0.008, d / 2, { ao: false, faces: 'tnsew', tint, grime: false });
    wb.pop();
  };
  const plank = (x, z, nx, nz, wall) => {
    const len = rng.range(0.5, 1.2),
      wd = rng.range(0.08, 0.15);
    const mat = rng.chance(0.5) ? 'planks' : 'wooddark';
    const tint = rng.chance(0.3) ? [0.4, 0.34, 0.3] : null;
    if (wall && rng.chance(0.4)) {
      // apoyada en el muro
      const ang = Math.atan2(nx, nz);
      wb.push();
      wb.translate(x - nx * 0.18, 0, z - nz * 0.18);
      wb.rotateY(ang);
      wb.rotateY(rng.range(-0.25, 0.25));
      wb.rotateX(0.32);
      wb.box(mat, -wd / 2, 0, -0.012, wd / 2, len, 0.012, { ao: false, faces: 'tnsew', tint });
      wb.pop();
    } else {
      wb.push();
      wb.translate(x, 0.014, z);
      wb.rotateY(rng.range(0, 3.14));
      wb.rotateZ(rng.range(-0.05, 0.05));
      wb.box(mat, -len / 2, -0.012, -wd / 2, len / 2, 0.012, wd / 2, { ao: false, faces: 'tnsew', tint });
      wb.pop();
    }
  };
  const straw = (x, z, tint = [0.78, 0.7, 0.52]) => {
    const n = rng.int(4, 8);
    for (let i = 0; i < n; i++) {
      const len = rng.range(0.18, 0.42);
      wb.push();
      wb.translate(x + rng.range(-0.18, 0.18), 0.008, z + rng.range(-0.18, 0.18));
      wb.rotateY(rng.range(0, 3.14));
      wb.rotateZ(rng.range(-0.1, 0.1));
      wb.box('straw', -len / 2, -0.005, -0.008, len / 2, 0.005, 0.008, { ao: false, faces: 'tnsew', tint, grime: false });
      wb.pop();
    }
  };
  const weeds = (x, z, dry) => {
    const n = rng.int(4, 8);
    const tint = dry ? [0.55, 0.52, 0.32] : [0.34, 0.44, 0.24];
    for (let i = 0; i < n; i++) {
      const h = rng.range(0.1, 0.34);
      wb.push();
      wb.translate(x + rng.range(-0.12, 0.12), 0, z + rng.range(-0.12, 0.12));
      wb.rotateY(rng.range(0, 3.14));
      wb.rotateZ(rng.range(-0.55, 0.55));
      wb.box('straw', -0.009, 0, -0.009, 0.009, h, 0.009, { ao: false, faces: 'nsew', tint, grime: false });
      wb.pop();
    }
  };
  const bone = (x, z) => {
    if (rng.chance(0.25)) {
      Y.set(x, 0.07, z);
      const m = new THREE.Matrix4().compose(Y, new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.5, 0.5), rng.range(0, 6), rng.range(-0.5, 0.5))), new THREE.Vector3(1, 1.05, 1.2));
      wb.geometry('bone', new THREE.SphereGeometry(0.085, 6, 4), m, { ao: false });
      return;
    }
    const len = rng.range(0.2, 0.42);
    wb.push();
    wb.translate(x, 0.024, z);
    wb.rotateY(rng.range(0, 3.14));
    wb.rotateZ(Math.PI / 2);
    wb.cylinder('bone', 0, -len / 2, 0, 0.02, 0.026, len, 4, { ao: false });
    wb.pop();
  };

  const place = (kind, x, z, nx, nz, wall, zkind) => {
    switch (kind) {
      case 'stone':
        stone(x, z, wall ? 1 : 0.8);
        if (rng.chance(0.5)) stone(x + rng.range(-0.2, 0.2), z + rng.range(-0.2, 0.2), 0.6);
        break;
      case 'tile':
        for (let i = 0; i < rng.int(1, 3); i++) flat('roof', x + rng.range(-0.15, 0.15), z + rng.range(-0.15, 0.15), 0.2, 0.15, [0.9, 0.85, 0.8], 0.012, 0.2);
        break;
      case 'shards':
        for (let i = 0; i < rng.int(2, 4); i++) flat('plaster', x + rng.range(-0.15, 0.15), z + rng.range(-0.15, 0.15), rng.range(0.05, 0.1), rng.range(0.04, 0.08), [0.78, 0.48, 0.34], 0.01, 0.3);
        break;
      case 'plank':
        plank(x, z, nx, nz, wall);
        break;
      case 'straw':
        straw(x, z);
        break;
      case 'weeds':
        weeds(x, z, zkind === 'dirt' && rng.chance(0.5));
        break;
      case 'rag':
        flat(rng.pick(['burlap', 'clothDark', 'clothRed', 'clothWhite']), x, z, rng.range(0.25, 0.45), rng.range(0.18, 0.32), [0.55, 0.5, 0.46], 0.012, 0.12);
        break;
      case 'bone':
        bone(x, z);
        break;
      case 'leather':
        flat('leather', x, z, rng.range(0.22, 0.4), rng.range(0.15, 0.3), [0.8, 0.7, 0.62], 0.012, 0.15);
        break;
      case 'leaves':
        for (let i = 0; i < rng.int(5, 10); i++) flat('straw', x + rng.range(-0.3, 0.3), z + rng.range(-0.3, 0.3), 0.06, 0.045, rng.pick([[0.45, 0.3, 0.18], [0.36, 0.24, 0.14], [0.52, 0.38, 0.2]]), 0.006, 0.3);
        break;
    }
  };

  // ---------------------------------------------------------- recorrido
  let placed = 0;
  const W = S.w,
    H = S.h,
    res = S.res;
  const cell = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? 0 : S.cells[j * W + i]);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      if (cell(i, j) !== 1) continue;
      // dirección hacia los muros vecinos
      let nx = 0,
        nz = 0;
      if (!cell(i - 1, j)) nx -= 1;
      if (!cell(i + 1, j)) nx += 1;
      if (!cell(i, j - 1)) nz -= 1;
      if (!cell(i, j + 1)) nz += 1;
      const wall = nx !== 0 || nz !== 0;
      if (!rng.chance(wall ? 0.26 : 0.02)) continue;
      const x = S.x0 + (i + 0.5) * res,
        z = S.z0 + (j + 0.5) * res;
      const zone = zoneAt(x, z);
      if (!zone || SKIP_ATMO.has(zone.atmo)) continue;
      if (avoided(x, z) || occupied(x, z)) continue;
      const zkind = ZONE_KIND[zone.id] ?? (zone.id === 'postigo' && x > 44 ? 'dirt' : 'street');
      if (!wall && zkind === 'street' && rng.chance(0.5)) continue;
      const nl = Math.hypot(nx, nz) || 1;
      nx /= nl;
      nz /= nl;
      // pegado al muro
      const cx = x + nx * rng.range(0.02, 0.14),
        cz = z + nz * rng.range(0.02, 0.14);
      const n = wall ? rng.int(2, 4) : rng.int(1, 2);
      for (let k = 0; k < n; k++) place(pick(rng, PALETTE[zkind]), cx + rng.range(-0.18, 0.18), cz + rng.range(-0.18, 0.18), nx, nz, wall, zkind);
      // mugre acumulada en la base del muro
      if (wall && ctx.decals && rng.chance(0.3)) ctx.decals.push({ x: cx + nx * 0.15, y: 0.004, z: cz + nz * 0.15, size: rng.range(0.8, 1.5), tex: 'shadow', rot: 0, opacity: rng.range(0.3, 0.5) });
      placed++;
    }
  }
  return placed;
}
