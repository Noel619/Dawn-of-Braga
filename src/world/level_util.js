// Utilidades de construcción del nivel.
import { RNG } from '../core/util.js';
import { house } from './builders.js';

// Suelo visual (sin colisión: la colisión la aporta la losa global).
export function floor(ctx, x0, z0, x1, z1, mat, y = 0, o = {}) {
  ctx.wb.box(mat, x0, y - 0.2, z0, x1, y, z1, { faces: 't', ao: false, sub: o.sub ?? 2.5, tint: o.tint, grime: o.grime, room: o.room });
}

// Habitación interior: paredes interiores (visibles desde dentro), suelo y techo.
// doors: [{side:'n'|'s'|'e'|'w', at: coordenada del centro, w, h}]
export function interiorRoom(ctx, x0, z0, x1, z1, y0, h, o = {}) {
  const wb = ctx.wb;
  const wall = o.wall ?? 'plaster';
  const t = o.t ?? 0.15;
  const room = o.room;
  const tint = o.tint ?? [0.8, 0.78, 0.74];
  const doors = o.doors ?? [];
  if (o.floor !== false) wb.box(o.floorMat ?? 'planks', x0, y0 - 0.1, z0, x1, y0, z1, { faces: 't', ao: false, sub: 2, room, tint: o.floorTint });
  if (o.ceil !== false) wb.box(o.ceilMat ?? 'wooddark', x0, y0 + h, z0, x1, y0 + h + 0.2, z1, { faces: 'b', ao: false, sub: 2.5, room, tint: [0.6, 0.55, 0.5] });
  // vigas del techo
  if (o.beams !== false && o.ceil !== false) {
    const alongX = x1 - x0 < z1 - z0;
    if (alongX) for (let z = z0 + 1.2; z < z1 - 0.5; z += 1.8) wb.box('timber', x0, y0 + h - 0.25, z - 0.12, x1, y0 + h, z + 0.12, { ao: false, room });
    else for (let x = x0 + 1.2; x < x1 - 0.5; x += 1.8) wb.box('timber', x - 0.12, y0 + h - 0.25, z0, x + 0.12, y0 + h, z1, { ao: false, room });
  }
  const seg = (side, a0, a1, yb, yt) => {
    // pared interior de un lado, con cara mirando hacia dentro
    if (a1 - a0 < 0.01) return;
    const oo = { room, tint, aoH: 1.2, aoMin: 0.5, baseY: y0 };
    if (side === 's') wb.box(wall, a0, yb, z1, a1, yt, z1 + t, { ...oo, faces: 'n' });
    if (side === 'n') wb.box(wall, a0, yb, z0 - t, a1, yt, z0, { ...oo, faces: 's' });
    if (side === 'e') wb.box(wall, x1, yb, a0, x1 + t, yt, a1, { ...oo, faces: 'w' });
    if (side === 'w') wb.box(wall, x0 - t, yb, a0, x0, yt, a1, { ...oo, faces: 'e' });
  };
  for (const side of ['n', 's', 'e', 'w']) {
    if (o.skip && o.skip.includes(side)) continue;
    const lo = side === 'n' || side === 's' ? x0 : z0;
    const hi = side === 'n' || side === 's' ? x1 : z1;
    const ds = doors.filter((d) => d.side === side).sort((a, b) => a.at - b.at);
    let cur = lo;
    for (const d of ds) {
      const a = d.at - d.w / 2,
        b = d.at + d.w / 2;
      seg(side, cur, a, y0, y0 + h);
      seg(side, a, b, y0 + (d.h ?? 2.3), y0 + h);
      cur = b;
    }
    seg(side, cur, hi, y0, y0 + h);
  }
  // zócalo de madera oscura
  if (o.skirting !== false) {
    const k = 0.25;
    for (const side of ['n', 's', 'e', 'w']) {
      if (o.skip && o.skip.includes(side)) continue;
      const ds = doors.filter((d) => d.side === side);
      const lo = side === 'n' || side === 's' ? x0 : z0;
      const hi = side === 'n' || side === 's' ? x1 : z1;
      let cur = lo;
      for (const d of [...ds].sort((a, b) => a.at - b.at)) {
        const a = d.at - d.w / 2;
        if (a > cur) skirt(ctx, side, cur, a, x0, z0, x1, z1, y0, k, room);
        cur = d.at + d.w / 2;
      }
      if (hi > cur) skirt(ctx, side, cur, hi, x0, z0, x1, z1, y0, k, room);
    }
  }
}

function skirt(ctx, side, a0, a1, x0, z0, x1, z1, y0, k, room) {
  const wb = ctx.wb;
  const d = 0.05;
  if (side === 's') wb.box('wooddark', a0, y0, z1 - d, a1, y0 + k, z1, { ao: false, faces: 'nt', room });
  if (side === 'n') wb.box('wooddark', a0, y0, z0, a1, y0 + k, z0 + d, { ao: false, faces: 'st', room });
  if (side === 'e') wb.box('wooddark', x1 - d, y0, a0, x1, y0 + k, a1, { ao: false, faces: 'wt', room });
  if (side === 'w') wb.box('wooddark', x0, y0, a0, x0 + d, y0 + k, a1, { ao: false, faces: 'et', room });
}

// Fila de casas a lo largo de una calle.
// axis 'x': casas repartidas entre from..to en X, fachada en z=line; side 'n' => casas al norte (z < line)
// axis 'z': repartidas en Z, fachada en x=line; side 'w' => casas al oeste (x < line)
export function houseRow(ctx, { axis, from, to, line, side, depth = 9, seed = 1, minW = 5.5, maxW = 9, opts = {}, skip = [] }) {
  const rng = new RNG(seed);
  let a = from;
  const out = [];
  while (a < to - 0.1) {
    let w = rng.range(minW, maxW);
    if (to - (a + w) < minW) w = to - a;
    const b = a + w;
    const inSkip = skip.some(([s0, s1]) => a < s1 && b > s0);
    if (!inSkip) {
      let spec;
      if (axis === 'x') {
        const front = side === 'n' ? 's' : 'n';
        spec = side === 'n' ? { x0: a, z0: line - depth, x1: b, z1: line, front } : { x0: a, z0: line, x1: b, z1: line + depth, front };
      } else {
        const front = side === 'w' ? 'e' : 'w';
        spec = side === 'w' ? { x0: line - depth, z0: a, x1: line, z1: b, front } : { x0: line, z0: a, x1: line + depth, z1: b, front };
      }
      spec.seed = Math.floor(rng.next() * 1e9);
      Object.assign(spec, typeof opts === 'function' ? opts(rng, out.length) : opts);
      out.push(house(ctx, spec));
    }
    a = b;
  }
  return out;
}

// Sombra de contacto horneada en el suelo alrededor de una base.
export function contactShadow(ctx, x, z, r, y = 0) {
  if (ctx.decals) ctx.decals.push({ x, y, z, size: r * 2, tex: 'shadow', rot: 0, opacity: 0.5 });
}
