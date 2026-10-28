// Las piezas de las casas del barrio de los Pellejeros (level_barrio.js):
// casas de varias plantas, con sus muros de fuera (los huecos de las puertas
// y de las ventanas, con su cerco y sus hojas), sus forjados y sus vigas, sus
// tabiques, sus escaleras de verdad, el desván bajo el tejado y el tejado que
// se anda (las rampas de las tejas: collision.addRamp).
//
// casa(ctx, S, L, def): una casa entera (ver el comentario de casa()). El
// resto, piezas sueltas para lo que no es una casa (el tendal, las tapias).
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { stairs, solidGableRoof, subtractRects, blocker } from './builders.js';
import { holedWall, frame, shutter, closedWindow, boardUp, railing } from './level_souto.js';
import * as P from './props.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const ROT = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };
// el grueso de un forjado
export const SLAB = 0.25;
// tintes de la cal
export const LIME = [0.9, 0.88, 0.82];
export const SOOT = [0.72, 0.68, 0.62];

// el interior de un rectángulo (sin los muros)
export const inner = (R, t) => ({ x0: R.x0 + t, z0: R.z0 + t, x1: R.x1 - t, z1: R.z1 - t });

// ------------------------------------------------------------ forjados
// Forjado de tablas: el suelo de arriba (su cara, a la altura y), el techo de
// abajo, el canto en los huecos y la colisión (la cámara no lo atraviesa).
export function forjado(ctx, R, y, holes, up, down, o = {}) {
  const wb = ctx.wb;
  const th = o.th ?? SLAB;
  const mat = o.mat ?? 'planks';
  for (const r of subtractRects([R.x0, R.z0, R.x1, R.z1], holes)) {
    // (cada trozo, con la luz de la sala de arriba y la de abajo en la que cae)
    for (const [a, b, c, d, ru] of porSalas(r, o.areasUp, up)) wb.box(mat, a, y - th, b, c, y, d, { faces: 't', room: ru, ao: false, uv: o.uv ?? 0.5, tint: o.tint ?? [0.84, 0.78, 0.7] });
    if (down) for (const [a, b, c, d, rd] of porSalas(r, o.areasDown, down)) wb.box('wooddark', a, y - th, b, c, y - th + 0.04, d, { faces: 'b', room: rd, ao: false, tint: o.tintDown ?? [0.6, 0.54, 0.48] });
    ctx.col.add(r[0], y - th, r[1], r[2], y, r[3]).cam = true;
  }
  for (const [a, b, c, d] of holes) {
    const oo = { ao: false, room: down || up, tint: [0.55, 0.5, 0.45] };
    if (b > R.z0 + 0.01) wb.box('wooddark', a, y - th, b - 0.01, c, y, b, { ...oo, faces: 's' });
    if (d < R.z1 - 0.01) wb.box('wooddark', a, y - th, d, c, y, d + 0.01, { ...oo, faces: 'n' });
    if (a > R.x0 + 0.01) wb.box('wooddark', a - 0.01, y - th, b, a, y, d, { ...oo, faces: 'e' });
    if (c < R.x1 - 0.01) wb.box('wooddark', c, y - th, b, c + 0.01, y, d, { ...oo, faces: 'w' });
  }
}

// Los trozos de un rectángulo [x0, z0, x1, z1] por salas: areas, [{ r, room
// }] (las que no tocan, nada); lo que no cae en ninguna, de la sala def.
// Devuelve [[x0, z0, x1, z1, room]].
export function porSalas(rect, areas, def) {
  if (!areas || !areas.length) return [[...rect, def]];
  const out = [];
  let rest = [rect];
  for (const a of areas) {
    const x0 = Math.max(rect[0], a.r[0]),
      z0 = Math.max(rect[1], a.r[1]),
      x1 = Math.min(rect[2], a.r[2]),
      z1 = Math.min(rect[3], a.r[3]);
    if (x1 - x0 < 1e-4 || z1 - z0 < 1e-4) continue;
    out.push([x0, z0, x1, z1, a.room]);
    rest = rest.flatMap((r) => subtractRects(r, [a.r]));
  }
  for (const r of rest) out.push([...r, def]);
  return out;
}

// Suelo de una planta baja: losas (o tablas) a ras, con sus huecos.
export function suelo(ctx, R, holes, room, o = {}) {
  const wb = ctx.wb;
  for (const r of subtractRects([R.x0, R.z0, R.x1, R.z1], holes ?? [])) for (const [a, b, c, d, rr] of porSalas(r, o.areas, room)) wb.box(o.mat ?? 'flag', a, -0.05, b, c, 0.02, d, { faces: 't', ao: false, room: rr, uv: o.uv ?? 0.5, tint: o.tint });
}

// Vigas bajo un forjado (de canto 22 cm), a lo largo de x o de z, una en cada
// coordenada de 'at'; se cortan en los huecos (con su brochal). La cámara se
// queda por debajo de ellas (menos en los huecos).
export function vigas(ctx, R, y, along, at, holes, room, o = {}) {
  const wb = ctx.wb;
  const tint = o.tint;
  for (const c of at) {
    let segs = along === 'x' ? [[R.x0, R.x1]] : [[R.z0, R.z1]];
    for (const [a0, b0, a1, b1] of holes) {
      const hit = along === 'x' ? c > b0 - 0.1 && c < b1 + 0.1 : c > a0 - 0.1 && c < a1 + 0.1;
      if (!hit) continue;
      const [lo, hi] = along === 'x' ? [a0 - 0.1, a1 + 0.1] : [b0 - 0.1, b1 + 0.1];
      segs = segs.flatMap(([u, v]) => (hi <= u || lo >= v ? [[u, v]] : [[u, lo], [hi, v]].filter(([p, q]) => q - p > 0.05)));
    }
    for (const [u, v] of segs) {
      // (partida por salas: cada trozo, con su luz)
      const rr = along === 'x' ? [u, c - 0.1, v, c + 0.1] : [c - 0.1, u, c + 0.1, v];
      for (const [a, b, cc, d, rm] of porSalas(rr, o.areas, room)) {
        const [p, q] = along === 'x' ? [a, cc] : [b, d];
        if (q - p < 0.02) continue;
        if (along === 'x') wb.box('timber', p, y - 0.22, c - 0.1, q, y, c + 0.1, { ao: false, room: rm, faces: 'nsewb', tint });
        else wb.box('timber', c - 0.1, y - 0.22, p, c + 0.1, y, q, { ao: false, room: rm, faces: 'nsewb', tint });
      }
    }
  }
  // los brochales alrededor de los huecos
  for (const [a0, b0, a1, b1] of holes) {
    if (along === 'x') {
      if (a0 > R.x0 + 0.05) wb.box('timber', a0 - 0.1, y - 0.22, b0, a0, y, b1, { ao: false, room, faces: 'nsewb', tint });
      if (a1 < R.x1 - 0.05) wb.box('timber', a1, y - 0.22, b0, a1 + 0.1, y, b1, { ao: false, room, faces: 'nsewb', tint });
    } else {
      if (b0 > R.z0 + 0.05) wb.box('timber', a0, y - 0.22, b0 - 0.1, a1, y, b0, { ao: false, room, faces: 'nsewb', tint });
      if (b1 < R.z1 - 0.05) wb.box('timber', a0, y - 0.22, b1, a1, y, b1 + 0.1, { ao: false, room, faces: 'nsewb', tint });
    }
  }
  const pad = holes.map(([a, b, c, d]) => [a - 0.12, b - 0.12, c + 0.12, d + 0.12]);
  for (const r of subtractRects([R.x0, R.z0, R.x1, R.z1], pad)) ctx.col.addCam(r[0], y - 0.27, r[1], r[2], y, r[3]);
}

// Las coordenadas de las vigas de un rectángulo (cada 'step', centradas).
export function cadaViga(a0, a1, step = 1.6) {
  const n = Math.max(1, Math.round((a1 - a0) / step));
  const out = [];
  for (let i = 0; i < n; i++) out.push(a0 + ((i + 0.5) * (a1 - a0)) / n);
  return out;
}

// ------------------------------------------------------------ escaleras
// Escalera de madera maciza que sube en 'dir' desde (x, y0, z) — x/z: su eje,
// el del ancho w —, con n peldaños de rise × run, la zanca por fuera y el
// pasamanos por el lado abierto (open: 'n','s','e','w'; hasta railTo
// peldaños). Devuelve el hueco que deja en el forjado de arriba ([x0, z0,
// x1, z1]: desde el peldaño en que la cabeza ya pasa del forjado).
export function escalera(ctx, o) {
  const wb = ctx.wb;
  const { x, z, dir, w, n, rise, run, room } = o;
  const y0 = o.y0 ?? 0;
  wb.setRoom(room);
  stairs(ctx, x, y0, z, dir, w, n, rise, run, 'wooddark', { solidBelow: true, base: y0 > 0.5 ? y0 - 0.02 : undefined });
  const along = dir === 'e' || dir === 'w' ? 'x' : 'z';
  const sgn = dir === 'e' || dir === 's' ? 1 : -1;
  const L = n * run;
  const H = n * rise;
  // el hueco: de donde la cabeza (1,9 m sobre el peldaño) alcanza la cara de
  // abajo del forjado, hasta el final del tramo
  const kHead = Math.max(0, Math.floor((H - SLAB - 2.05) / rise));
  const ua = kHead * run - 0.15,
    ub = L + 0.02;
  const hole = along === 'x' ? [Math.min(x + sgn * ua, x + sgn * ub), z - w / 2 - 0.05, Math.max(x + sgn * ua, x + sgn * ub), z + w / 2 + 0.05] : [x - w / 2 - 0.05, Math.min(z + sgn * ua, z + sgn * ub), x + w / 2 + 0.05, Math.max(z + sgn * ua, z + sgn * ub)];
  if (o.open) {
    const side = { n: -1, s: 1, w: -1, e: 1 }[o.open];
    const edge = (along === 'x' ? z : x) + (side * w) / 2;
    const P0 = (u, y, k = 0) => (along === 'x' ? V(x + sgn * u, y, edge + side * k) : V(edge + side * k, y, z + sgn * u));
    // la zanca
    const ang = Math.atan2(H, L);
    const len = Math.hypot(L, H);
    wb.push();
    const c = P0(L / 2, y0 + H / 2 - 0.12, 0.03);
    wb.translate(c.x, c.y, c.z);
    if (along === 'x') wb.rotateZ(sgn * ang);
    else wb.rotateX(-sgn * ang);
    if (along === 'x') wb.box('timber', -len / 2, -0.17, -0.035, len / 2, 0.17, 0.035, { ao: false, room });
    else wb.box('timber', -0.035, -0.17, -len / 2, 0.035, 0.17, len / 2, { ao: false, room });
    wb.pop();
    // el pasamanos, del poste de abajo al de arriba
    const k = Math.min(n, o.railTo ?? n) - 1;
    const ua2 = run * 0.5,
      ub2 = run * (k + 0.5);
    const ya = y0 + rise + 0.92,
      yb = y0 + rise * (k + 1) + 0.92;
    const pa = P0(ua2, 0, 0.07),
      pb = P0(ub2, 0, 0.07);
    wb.box('wooddark', pa.x - 0.045, y0, pa.z - 0.045, pa.x + 0.045, ya + 0.06, pa.z + 0.045, { ao: false, room });
    wb.box('wooddark', pb.x - 0.045, y0 + rise * k, pb.z - 0.045, pb.x + 0.045, yb + 0.06, pb.z + 0.045, { ao: false, room });
    const rl = Math.hypot(ub2 - ua2, yb - ya);
    wb.push();
    wb.translate((pa.x + pb.x) / 2, (ya + yb) / 2, (pa.z + pb.z) / 2);
    if (along === 'x') wb.rotateZ(sgn * Math.atan2(yb - ya, ub2 - ua2));
    else wb.rotateX(-sgn * Math.atan2(yb - ya, ub2 - ua2));
    if (along === 'x') wb.box('wooddark', -rl / 2, -0.04, -0.04, rl / 2, 0.04, 0.04, { ao: false, room });
    else wb.box('wooddark', -0.04, -0.04, -rl / 2, 0.04, 0.04, rl / 2, { ao: false, room });
    wb.pop();
    // los balaústres, cada tanto
    const nb = Math.max(2, Math.round((ub2 - ua2) / 0.45));
    for (let i = 1; i < nb; i++) {
      const u = ua2 + ((ub2 - ua2) * i) / nb;
      const p = P0(u, 0, 0.07);
      const yb0 = y0 + Math.ceil(u / run) * rise;
      const yr = ya + ((yb - ya) * (u - ua2)) / (ub2 - ua2);
      wb.box('wooddark', p.x - 0.02, yb0, p.z - 0.02, p.x + 0.02, yr, p.z + 0.02, { ao: false, room });
    }
    // (la colisión del pasamanos: no se cae uno por el lado abierto)
    const lo = Math.min(pa.x, pb.x),
      hi = Math.max(pa.x, pb.x),
      lz = Math.min(pa.z, pb.z),
      hz = Math.max(pa.z, pb.z);
    ctx.col.add(lo - 0.05, y0, lz - 0.05, hi + 0.05, yb, hz + 0.05).noSight = true;
  }
  wb.setRoom(null);
  return hole;
}

// Escalera de caracol de piedra no hace falta: las del barrio son de tablas.

// ------------------------------------------------------------ tabiques
// Tabique de cal (de y0 a y1) con sus pasos (doors: { at, w, h }), el cerco
// de madera de cada paso y la colisión. iw: { x0, z0, x1, z1 } (el grueso, en
// el eje corto). rooms: [la de un lado, la del otro] (o la misma).
export function tabique(ctx, iw, y0, y1, room, o = {}) {
  const wb = ctx.wb;
  const alongX = iw.x1 - iw.x0 >= iw.z1 - iw.z0;
  const a0 = alongX ? iw.x0 : iw.z0,
    a1 = alongX ? iw.x1 : iw.z1;
  const mat = o.mat ?? 'plaster';
  const tint = o.tint ?? LIME;
  const [rA, rB] = Array.isArray(room) ? room : [room, room];
  const fA = alongX ? 'n' : 'w',
    fB = alongX ? 's' : 'e';
  const piece = (u0, u1, yb, yt, ends) => {
    if (u1 - u0 < 0.01) return;
    const b = alongX ? [u0, yb, iw.z0, u1, yt, iw.z1] : [iw.x0, yb, u0, iw.x1, yt, u1];
    wb.box(mat, ...b, { sub: 1.6, tint, aoH: 1.2, room: rA, faces: fA + (yb > y0 + 0.01 ? 'b' : '') + ends, baseY: y0 });
    wb.box(mat, ...b, { sub: 1.6, tint, aoH: 1.2, room: rB, faces: fB, baseY: y0 });
    ctx.col.add(...b);
  };
  let cur = a0;
  const lo = alongX ? 'w' : 'n',
    hi = alongX ? 'e' : 's';
  const ds = [...(o.doors ?? [])].sort((p, q) => p.at - q.at);
  for (const d of ds) {
    const a = d.at - d.w / 2,
      b = d.at + d.w / 2;
    const dh = d.h ?? 2.3;
    piece(cur, a, y0, y1, hi);
    piece(a, b, y0 + dh, y1, '');
    // el cerco de madera del paso (a un centímetro de las caras del hueco)
    const fr = (u0, u1, yb, yt) => {
      const bb = alongX ? [u0, yb, iw.z0 - 0.04, u1, yt, iw.z1 + 0.04] : [iw.x0 - 0.04, yb, u0, iw.x1 + 0.04, yt, u1];
      wb.box('wooddark', ...bb, { ao: false, room: rA, faces: yb > y0 ? 'tnsewb' : 'tnsew' });
    };
    fr(a - 0.1, a + 0.012, y0, y0 + dh - 0.012);
    fr(b - 0.012, b + 0.1, y0, y0 + dh - 0.012);
    fr(a - 0.1, b + 0.1, y0 + dh - 0.012, y0 + dh + 0.12);
    // (el tramo siguiente lleva la jamba del otro lado)
    cur = b;
  }
  piece(cur, a1, y0, y1, ds.length ? lo : '');
}

// ------------------------------------------------------------ huecos de fachada
// El cerco de un hueco de la fachada 'side' (centro (x, z) en la cara de
// fuera; de y0 a y1), por fuera (madera o sillería) y por dentro; y lo que
// lleva: o.shutters ('open' | 'ajar' | 'closed' | 'broken' | 'boarded' |
// null), o.bars (reja), o.sillMat.
export function hueco(ctx, side, x, z, w, y0, y1, t, o = {}) {
  const wb = ctx.wb;
  frame(ctx, side, x, z, w, y0, y1, t, { room: o.room, mat: o.mat ?? 'timber', sill: o.sill !== false, sillMat: o.sillMat, innerSill: o.innerSill });
  const sh = o.shutters;
  if (sh === 'open') {
    shutter(ctx, side, x, z, w, y0, y1, -1, 1.85, { tint: o.tint });
    shutter(ctx, side, x, z, w, y0, y1, 1, 1.7, { tint: o.tint });
  } else if (sh === 'ajar') {
    shutter(ctx, side, x, z, w, y0, y1, -1, 0.55, { tint: o.tint });
    shutter(ctx, side, x, z, w, y0, y1, 1, 1.8, { tint: o.tint });
  } else if (sh === 'broken') {
    shutter(ctx, side, x, z, w, y0, y1, -1, 1.7, { tint: o.tint, droop: 0.35 });
  } else if (sh === 'boarded') boardUp(ctx, side, x, z, w, [y0 + 0.2, y0 + (y1 - y0) * 0.5, y1 - 0.2], o.seed ?? Math.floor(x * 13 + z * 7));
  if (o.bars) {
    wb.at(x, 0, z, ROT[side], () => {
      const n = Math.max(2, Math.round(w / 0.16));
      for (let i = 1; i < n; i++) {
        const u = -w / 2 + (i * w) / n;
        wb.box('iron', u - 0.014, y0, -t * 0.5 - 0.014, u + 0.014, y1, -t * 0.5 + 0.014, { ao: false });
      }
      wb.box('iron', -w / 2, (y0 + y1) / 2 - 0.015, -t * 0.5 - 0.02, w / 2, (y0 + y1) / 2 + 0.015, -t * 0.5 + 0.02, { ao: false });
    });
  }
}

// ------------------------------------------------------------ entramado
// El entramado de madera de una fachada (pies derechos, carreras, soleras y
// tornapuntas), por fuera, de y0 a y1, sin pasar por sus huecos (holes en
// coordenadas a lo largo de la fachada: { a0, a1, y0, y1 }). En el marco
// local de la fachada (x de 0 a L, la cara en z = 0).
export function entramado(ctx, L, y0, y1, holes, seed = 1, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const T = { ao: false, sub: 3, tint: o.tint };
  const pw = 0.09;
  const inHole = (a, y) => holes.some((h) => a > h.a0 - pw && a < h.a1 + pw && y > h.y0 - 0.05 && y < h.y1 + 0.05);
  // los pies derechos: en los extremos, a los lados de cada hueco y, en los
  // tramos largos, cada metro y medio
  const cand = [0.1, L - 0.1];
  for (const h of holes) cand.push(h.a0 - pw - 0.01, h.a1 + pw + 0.01);
  cand.sort((p, q) => p - q);
  const posts = [];
  for (const a of cand) if (a > 0.05 && a < L - 0.05 && (!posts.length || a - posts[posts.length - 1] > 2 * pw + 0.05)) posts.push(a);
  const all = [];
  for (let i = 0; i < posts.length; i++) {
    all.push(posts[i]);
    const p = posts[i],
      q = posts[i + 1];
    if (q === undefined) continue;
    const m = Math.round((q - p) / 1.5);
    for (let k = 1; k < m; k++) {
      const a = p + ((q - p) * k) / m;
      if (!holes.some((h) => a > h.a0 - pw && a < h.a1 + pw)) all.push(a);
    }
  }
  all.sort((p, q) => p - q);
  // cada pie, de abajo arriba, menos por donde hay un hueco
  for (const a of all) {
    const hs = holes.filter((h) => a > h.a0 - pw && a < h.a1 + pw).sort((p, q) => p.y0 - q.y0);
    let yb = y0;
    for (const h of hs) {
      if (h.y0 - yb > 0.1) wb.box('timber', a - pw, yb, 0, a + pw, h.y0, 0.07, T);
      yb = h.y1;
    }
    if (y1 - yb > 0.1) wb.box('timber', a - pw, yb, 0, a + pw, y1, 0.07, T);
  }
  // la solera y la carrera, y una riostra a media altura, cortadas en los
  // huecos
  const rail = (y, hgt, d) => {
    let segs = [[0, L]];
    for (const h of holes) {
      if (y + hgt < h.y0 || y - hgt > h.y1) continue;
      segs = segs.flatMap(([u, v]) => (h.a1 <= u || h.a0 >= v ? [[u, v]] : [[u, h.a0], [h.a1, v]].filter(([p, q]) => q - p > 0.05)));
    }
    for (const [u, v] of segs) wb.box('timber', u, y - hgt, 0, v, y + hgt, d, T);
  };
  rail(y0 + 0.1, 0.1, 0.08);
  rail(y1 - 0.1, 0.1, 0.08);
  const mid = y0 + (y1 - y0) * 0.45;
  rail(mid, 0.07, 0.05);
  // tornapuntas en los tramos sin huecos (de eje a eje)
  for (let i = 0; i + 1 < all.length; i++) {
    const p = all[i],
      q = all[i + 1];
    if (q - p < 0.6 || holes.some((h) => h.a1 > p && h.a0 < q)) continue;
    const dir = rng.chance(0.5) ? 1 : -1;
    for (const [ya, yb] of [
      [y0 + 0.2, mid],
      [mid, y1 - 0.2],
    ]) {
      if (yb - ya < 0.4 || inHole((p + q) / 2, (ya + yb) / 2)) continue;
      const dw = q - p,
        dh = yb - ya;
      const len = Math.hypot(dw, dh);
      wb.push();
      wb.translate((p + q) / 2, (ya + yb) / 2, 0.034);
      wb.rotateZ(Math.atan2(dh, dw) * dir);
      wb.box('timber', -len / 2, -0.065, -0.024, len / 2, 0.065, 0.024, { ao: false, sub: 4, tint: o.tint });
      wb.pop();
    }
  }
}

// ------------------------------------------------------------ tejados
// Las rampas de las tejas de un tejado a dos aguas (se anda por él), de la
// cumbrera al alero de cada faldón (ovs: el vuelo de cada uno), menos los
// huecos (holes, rectángulos del mundo), y el caballete. R: { x0, z0, x1,
// z1, h (alero), ridge }; axis: el de la cumbrera; s: [de, a] a lo largo.
export function rampasTejado(ctx, R, axis, o = {}) {
  const alongX = axis === 'x';
  const half = alongX ? (R.z1 - R.z0) / 2 : (R.x1 - R.x0) / 2;
  const c = alongX ? (R.z0 + R.z1) / 2 : (R.x0 + R.x1) / 2;
  const slope = (R.ridge - R.h) / half;
  const ovs = o.ovs ?? [0, 0];
  const [s0, s1] = o.s ?? (alongX ? [R.x0, R.x1] : [R.z0, R.z1]);
  // (la cara de arriba de las tejas es la del faldón: solidGableRoof pone su
  // grueso por debajo)
  const lift = o.lift ?? 0.01;
  for (const sg of [-1, 1]) {
    const reach = half + ovs[sg > 0 ? 1 : 0];
    const uE = c + sg * reach,
      yE = R.ridge - reach * slope;
    const r = alongX ? [s0, Math.min(c, uE), s1, Math.max(c, uE)] : [Math.min(c, uE), s0, Math.max(c, uE), s1];
    for (const [x0, z0, x1, z1] of subtractRects(r, o.holes ?? [])) ctx.col.addRamp(x0, z0, x1, z1, alongX ? 'z' : 'x', c, R.ridge + lift, uE, yE + lift);
  }
  if (o.cap === false) return;
  const cap = alongX ? [s0, c - 0.17, s1, c + 0.17] : [c - 0.17, s0, c + 0.17, s1];
  for (const [x0, z0, x1, z1] of subtractRects(cap, o.holes ?? [])) {
    const b = ctx.col.add(x0, R.ridge - 0.25, z0, x1, R.ridge + 0.15, z1);
    b.cam = false;
    b.noSight = true;
  }
}

// Cerchas de un desván (tirante, pendolón, tornapuntas y la hilera) y las
// rebanadas de cámara del grueso de los faldones.
export function cerchas(ctx, R, room, axis, at, t, o = {}) {
  const wb = ctx.wb;
  const alongX = axis === 'x';
  const half = alongX ? (R.z1 - R.z0) / 2 : (R.x1 - R.x0) / 2;
  const c = alongX ? (R.z0 + R.z1) / 2 : (R.x0 + R.x1) / 2;
  const slope = (R.ridge - R.h) / half;
  const tv = (o.thick ?? 0.2) * Math.sqrt(1 + slope * slope);
  const under = (u) => R.ridge - Math.abs(u - c) * slope - tv;
  const I = inner(R, t);
  const [s0, s1] = alongX ? [I.x0, I.x1] : [I.z0, I.z1];
  const [u0, u1] = alongX ? [I.z0, I.z1] : [I.x0, I.x1];
  const B = (a0, b0, a1, b1, y0, y1, oo) => (alongX ? wb.box('timber', a0, y0, b0, a1, y1, b1, oo) : wb.box('timber', b0, y0, a0, b1, y1, a1, oo));
  const tint = o.tint ?? [0.62, 0.55, 0.48];
  // (tieY: el tirante, a esa altura; los de nudillo, más arriba, cuando el del
  // alero quedaría a la altura de la cabeza)
  const ty = o.tieY ?? R.h;
  const tw = o.tieY ? Math.min(half, (R.ridge - tv - ty - 0.24) / slope) : null;
  for (const s of at) {
    B(s - 0.12, tw ? c - tw : u0, s + 0.12, tw ? c + tw : u1, ty - 0.12, ty + 0.12, { ao: false, room, tint, faces: 'tnsewb' });
    B(s - 0.1, c - 0.1, s + 0.1, c + 0.1, ty + 0.12, under(c), { ao: false, room, tint });
    if (!o.tieY)
      for (const sg of [-1, 1]) {
        const a = alongX ? V(s, ty + 0.5, c + sg * 0.1) : V(c + sg * 0.1, ty + 0.5, s);
        const ub = c + sg * Math.min(half * 0.62, 2.0);
        const b = alongX ? V(s, under(ub) - 0.05, ub) : V(ub, under(ub) - 0.05, s);
        viga(wb, a, b, 0.07, 'timber', { room, tint });
      }
  }
  B(s0, c - 0.13, s1, c + 0.13, under(c) - 0.24, under(c) + 0.03, { ao: false, room, tint, faces: 'nsewb' });
  if (o.cam === false) return;
  for (const sg of [-1, 1])
    for (let k = 0; k < 5; k++) {
      const ua = c + sg * k * (half / 5),
        ub = c + sg * (k + 1) * (half / 5);
      const y0 = under(ub) - 0.05,
        y1 = under(ua) + tv + 0.08;
      const r = alongX ? [R.x0, Math.min(ua, ub), R.x1, Math.max(ua, ub)] : [Math.min(ua, ub), R.z0, Math.max(ua, ub), R.z1];
      for (const [x0, z0, x1, z1] of subtractRects(r, o.holes ?? [])) ctx.col.addCam(x0, y0, z0, x1, y1, z1);
    }
}

// Viga (escuadría cuadrada r) de a a b.
export function viga(wb, a, b, r, mat = 'timber', o = {}) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
  const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, V(r * 2, len, r * 2));
  wb.geometry(mat, new THREE.BoxGeometry(1, 1, 1), m, { ao: false, room: o.room, tint: o.tint });
}

// Un cuadrilátero con la cara hacia n (se le da la vuelta si hace falta).
export function quadN(wb, mat, p, n, opts) {
  const U = p[1].clone().sub(p[0]),
    W = p[3].clone().sub(p[0]);
  if (U.cross(W).dot(n) < 0) p = [p[3], p[2], p[1], p[0]];
  wb.quad(mat, p[0], p[1], p[2], p[3], opts);
}

// Hastial: de y0 hasta la cara de abajo del tejado (que sube del alero, en
// los extremos, a la cumbrera, en c), con sus huecos. axis: el del muro;
// a0..a1: a lo largo; t0..t1: el grueso; out: la cara de fuera.
export function hastial(ctx, o) {
  const wb = ctx.wb;
  const { axis, a0, a1, c, t0, t1, out, y0, yEave, yRidge, room } = o;
  const half = Math.max(c - a0, a1 - c);
  const slope = (yRidge - yEave) / half;
  const tv = o.tv ?? 0.2 * Math.sqrt(1 + slope * slope);
  const top = (u) => yRidge - tv - Math.abs(u - c) * slope;
  const sOut = out === 'n' || out === 'w' ? -1 : 1;
  const tOut = sOut < 0 ? t0 : t1,
    tIn = sOut < 0 ? t1 : t0;
  const Pp = (u, y, t) => (axis === 'x' ? V(u, y, t) : V(t, y, u));
  const N = (s) => (axis === 'x' ? V(0, 0, s) : V(s, 0, 0));
  const A = (s) => (axis === 'x' ? V(s, 0, 0) : V(0, 0, s));
  const hs = [...(o.holes ?? [])].sort((p, q) => p.a0 - q.a0);
  const cuts = new Set([a0, a1, c]);
  for (const h of hs) cuts.add(h.a0).add(h.a1);
  const us = [...cuts].filter((u) => u >= a0 && u <= a1).sort((p, q) => p - q);
  const fOut = { ao: false, sub: 1.6, room: o.outRoom ?? 'out', tint: o.tint };
  const fIn = { sub: 1.6, room, tint: o.tintIn ?? o.tint, aoH: 1.2, baseY: o.floorY ?? y0 };
  for (let i = 0; i + 1 < us.length; i++) {
    const u0 = us[i],
      u1 = us[i + 1];
    if (u1 - u0 < 1e-4) continue;
    const h = hs.find((q) => q.a0 <= u0 + 1e-6 && q.a1 >= u1 - 1e-6);
    const spans = h ? [[y0, h.y0, false], [h.y1, 0, true]] : [[y0, 0, true]];
    for (const [yb, yt, roof] of spans) {
      const ya = roof ? top(u0) : yt,
        yc = roof ? top(u1) : yt;
      if (Math.max(ya, yc) - yb < 0.005) continue;
      const pts = (t) => [Pp(u0, yb, t), Pp(u1, yb, t), Pp(u1, yc, t), Pp(u0, ya, t)];
      if (o.outer !== false) quadN(wb, o.mat, pts(tOut), N(sOut), fOut);
      if (o.inner !== false) quadN(wb, o.matIn ?? o.mat, pts(tIn), N(-sOut), fIn);
      // (la colisión, en escalones de medio metro por debajo del faldón: un
      // bloque entero sobresalía por encima de las tejas cerca del alero, y
      // en el tejado se tropezaba con un muro que no se ve)
      if (o.collide !== false) {
        const n = Math.max(1, Math.ceil((u1 - u0) / 0.5));
        for (let k = 0; k < n; k++) {
          const p = u0 + ((u1 - u0) * k) / n,
            q = u0 + ((u1 - u0) * (k + 1)) / n;
          const yTop = roof ? Math.min(top(p), top(q)) : yt;
          if (yTop - yb < 0.02) continue;
          ctx.col.add(...(axis === 'x' ? [p, yb, t0, q, yTop, t1] : [t0, yb, p, t1, yTop, q]));
        }
      }
    }
  }
  const fj = { ao: false, room, tint: o.tintIn ?? o.tint };
  const mj = o.matIn ?? o.mat;
  for (const h of hs) {
    // (las jambas, desde donde empieza este muro: lo de debajo lo pone el de
    // la planta)
    const hy0 = Math.max(h.y0, y0);
    if (h.a0 > a0 + 1e-3) quadN(wb, mj, [Pp(h.a0, hy0, t0), Pp(h.a0, hy0, t1), Pp(h.a0, Math.min(h.y1, top(h.a0)), t1), Pp(h.a0, Math.min(h.y1, top(h.a0)), t0)], A(1), fj);
    if (h.a1 < a1 - 1e-3) quadN(wb, mj, [Pp(h.a1, hy0, t0), Pp(h.a1, hy0, t1), Pp(h.a1, Math.min(h.y1, top(h.a1)), t1), Pp(h.a1, Math.min(h.y1, top(h.a1)), t0)], A(-1), fj);
    if (h.y1 < Math.min(top(h.a0), top(h.a1))) quadN(wb, mj, [Pp(h.a0, h.y1, t0), Pp(h.a1, h.y1, t0), Pp(h.a1, h.y1, t1), Pp(h.a0, h.y1, t1)], V(0, -1, 0), fj);
    if (h.y0 > y0 + 1e-3) quadN(wb, mj, [Pp(h.a0, h.y0, t0), Pp(h.a1, h.y0, t0), Pp(h.a1, h.y0, t1), Pp(h.a0, h.y0, t1)], V(0, 1, 0), fj);
  }
}

// ------------------------------------------------------------ la casa
// Una casa de varias plantas. def:
//  id                el nombre (las salas de luz: id + nivel)
//  x0, z0, x1, z1    la huella, por fuera; t: el grueso de los muros (0,45)
//  solid             maciza: sólo la fachada y el tejado (las casas a las que
//                    no se entra); su colisión, un bloque hasta el alero
//  levels            de abajo arriba: { y (el suelo), top (la cara de abajo
//                    del forjado de encima; en la última, el alero por
//                    dentro), floor ('flag' | 'planks' | 'tile'), tint,
//                    room (la sala de luz; por defecto id + i), attic (bajo
//                    el tejado: se ven las cerchas) }
//  roof              { axis, h (alero), ridge, ov, gov, ovs, open, holes
//                    (los de solidGableRoof), walk (rampas: true), walkHoles
//                    (los de las rampas), s (de dónde a dónde, a lo largo de la
//                    cumbrera, se anda), trusses (cerchas, si es desván), tieY,
//                    tint, gables: false (los hastiales los pone otro),
//                    gableWalls (los hastiales, con su grueso, su colisión y
//                    los huecos de la última planta que pasan del alero) }
//  sides             por fachada ('n','s','e','w'): { low, up (material de la
//                    planta baja y de las de arriba: 'wallstone', 'plaster',
//                    'timber' = cal con entramado), tint, tintIn, none (no se
//                    construye: pegada a otra casa que la pone), party
//                    (medianera: sin cara de fuera) }
//  open              huecos: { side, lv, at (a lo largo de la fachada, desde
//                    x0 o z0), w, sill (alto del alféizar sobre el suelo de
//                    la planta; 0 = puerta), h (alto del hueco), shutters,
//                    bars, frame: 'stone' | 'wood' | 'none', door: { ... } (la
//                    hoja: un interactuable door, sin x/z/axis/w/h, que se
//                    ponen), leaf ('closed' | 'boarded' | 'open': la hoja de
//                    una puerta a la que no se entra) }
//  walls             tabiques: { lv, x0, z0, x1, z1, doors: [{ at, w, h }],
//                    rooms: [a, b] }
//  stairs            { lv, x, z, dir, w, n, run, open, railTo } (sube de lv a
//                    lv + 1; deja su hueco en el forjado)
//  holes             { lv, r: [x0, z0, x1, z1] } huecos de más en el forjado
//                    del suelo de lv
//  joists            'x' | 'z' (dirección de las vigas)
// Devuelve { R, I (el interior), rooms, holes, stairs, t }.
export function casa(ctx, S, L, def) {
  const wb = ctx.wb;
  const t = def.t ?? 0.45;
  const R = { x0: def.x0, z0: def.z0, x1: def.x1, z1: def.z1 };
  const I = inner(R, t);
  const lv = def.levels;
  const solid = !!def.solid;
  const rooms = lv.map((l, i) => l.room ?? def.id + i);
  const along = def.joists ?? (R.x1 - R.x0 >= R.z1 - R.z0 ? 'z' : 'x');
  (ctx.houseRects || (ctx.houseRects = [])).push({ x0: R.x0, z0: R.z0, x1: R.x1, z1: R.z1, front: def.front ?? 's', jetty: 0, hollow: !solid, h: def.roof ? def.roof.h : lv[lv.length - 1].top, style: 'plaster' });
  const holes = lv.map(() => []);
  const stairOut = [];
  const top = lv[lv.length - 1];
  if (!solid) {
    // los huecos de los forjados (por la planta de arriba de cada escalera)
    for (const s of def.stairs ?? []) {
      const rise = (lv[s.lv + 1].y - lv[s.lv].y) / s.n;
      const h = escalera(ctx, { ...s, y0: lv[s.lv].y, rise, run: s.run ?? 0.3, room: rooms[s.lv] });
      holes[s.lv + 1].push(h);
      stairOut.push({ ...s, hole: h, rise });
    }
    for (const h of def.holes ?? []) holes[h.lv].push(h.r);
    // ---- suelos y techos
    for (let i = 0; i < lv.length; i++) {
      const l = lv[i];
      if (i === 0) suelo(ctx, I, holes[0], rooms[0], { mat: l.floor ?? 'flag', tint: l.tint, areas: l.areas });
      else {
        forjado(ctx, I, l.y, holes[i], rooms[i], rooms[i - 1], { mat: l.floor ?? 'planks', tint: l.tint, areasUp: l.areas, areasDown: lv[i - 1].areas });
        const at = along === 'x' ? cadaViga(I.z0, I.z1, l.joistStep ?? 1.7) : cadaViga(I.x0, I.x1, l.joistStep ?? 1.7);
        vigas(ctx, I, l.y - SLAB, along, at, holes[i], rooms[i - 1], { areas: lv[i - 1].areas });
      }
    }
    // (la última planta: o el desván, bajo el tejado, o un techo plano con su
    // colisión hasta el tejado, que no se ve)
    if (!top.attic && def.roof) {
      const y = top.top;
      for (const r of subtractRects([I.x0, I.z0, I.x1, I.z1], def.ceilHoles ?? [])) for (const [a, b, c, d, rr] of porSalas(r, top.areas, rooms[lv.length - 1])) wb.box('wooddark', a, y, b, c, y + 0.05, d, { faces: 'b', room: rr, ao: false, tint: [0.6, 0.54, 0.48] });
      const at = along === 'x' ? cadaViga(I.z0, I.z1, 1.7) : cadaViga(I.x0, I.x1, 1.7);
      vigas(ctx, I, y, along, at, def.ceilHoles ?? [], rooms[lv.length - 1], { areas: top.areas });
      for (const r of subtractRects([I.x0, I.z0, I.x1, I.z1], def.ceilHoles ?? [])) ctx.col.add(r[0], y, r[1], r[2], def.roof.h + 0.1, r[3]).cam = true;
    }
  } else ctx.col.add(R.x0, 0, R.z0, R.x1, def.roof ? def.roof.h : top.top, R.z1);
  // ---- muros de fuera, planta a planta
  const sides = def.sides ?? {};
  const openOf = (side, i) => (def.open ?? []).filter((o) => o.side === side && o.lv === i);
  const r = def.roof;
  const gableSide = (side) => r && (r.axis === 'x' ? side === 'e' || side === 'w' : side === 'n' || side === 's');
  for (const side of ['n', 's', 'e', 'w']) {
    const sd = sides[side] ?? {};
    if (sd.none) continue;
    const axis = side === 'n' || side === 's' ? 'x' : 'z';
    const a0 = axis === 'x' ? R.x0 : R.z0,
      a1 = axis === 'x' ? R.x1 : R.z1;
    const [t0, t1] = side === 'n' ? [R.z0, R.z0 + t] : side === 's' ? [R.z1 - t, R.z1] : side === 'w' ? [R.x0, R.x0 + t] : [R.x1 - t, R.x1];
    for (let i = 0; i < lv.length; i++) {
      const l = lv[i];
      const yb = i === 0 ? 0 : l.y - SLAB;
      // (la de arriba llega al alero; lo de encima, en los hastiales, lo pone
      // el tejado)
      const yt = i + 1 < lv.length ? lv[i + 1].y - SLAB : r ? r.h : l.top;
      const mat = i === 0 ? sd.low ?? 'wallstone' : sd.up === 'timber' ? 'plaster' : sd.up ?? 'plaster';
      const tint = (i === 0 ? sd.tintLow : null) ?? sd.tint ?? (mat === 'plaster' ? LIME : undefined);
      const ops = openOf(side, i);
      const hs = ops.map((o) => ({ a0: a0 + o.at - o.w / 2, a1: a0 + o.at + o.w / 2, y0: l.y + (o.sill ?? 0), y1: Math.min(yt, l.y + (o.sill ?? 0) + o.h) }));
      if (solid) muroFuera(ctx, { axis, a0, a1, t0, t1, y0: yb, y1: yt, out: side, holes: hs, mat, tint });
      else
        for (const [s0, s1, rm] of tramosSala(side, R, I, a0, a1, l.areas, rooms[i])) {
          // (el muro, por tramos: cada uno con la luz de la sala que cierra)
          const hh = hs.filter((h) => (h.a0 + h.a1) / 2 > s0 && (h.a0 + h.a1) / 2 < s1);
          holedWall(ctx, { axis, a0: s0, a1: s1, t0, t1, y0: yb, y1: yt, out: side, room: rm, holes: hh, mat, matIn: sd.matIn ?? 'plaster', tint, tintIn: sd.tintIn ?? (i === 0 ? SOOT : LIME), floorY: l.y, outer: !sd.party, outRoom: sd.outRoom });
        }
      // el entramado, por fuera, en las plantas de arriba
      if (sd.up === 'timber' && i > 0 && !sd.party) {
        const tx = side === 's' ? R.x0 : side === 'n' ? R.x1 : side === 'e' ? R.x1 : R.x0;
        const tz = side === 's' ? R.z1 : side === 'n' ? R.z0 : side === 'e' ? R.z1 : R.z0;
        // (en el marco local la fachada va de 0 a L desde la esquina tx,tz)
        const loc = (u) => (side === 's' || side === 'w' ? u - a0 : a1 - u);
        const lh = hs.map((h) => {
          const p = loc(h.a0),
            q = loc(h.a1);
          return { a0: Math.min(p, q), a1: Math.max(p, q), y0: h.y0, y1: h.y1 };
        });
        wb.at(tx, 0, tz, ROT[side], () => entramado(ctx, a1 - a0, yb + 0.02, yt, lh, Math.floor(R.x0 * 7 + R.z0 * 13 + i), { tint: sd.frameTint }));
      }
      // los huecos: su cerco, sus hojas; las puertas, su interactuable
      for (const o of ops) {
        const c = a0 + o.at;
        const y0 = l.y + (o.sill ?? 0),
          y1 = y0 + o.h;
        const fx = axis === 'x' ? c : side === 'w' ? R.x0 : R.x1;
        const fz = axis === 'x' ? (side === 'n' ? R.z0 : R.z1) : c;
        if (o.door || o.leaf || !o.sill) {
          // puerta: el cerco de piedra (o de madera) y el umbral
          if (o.frame !== 'none')
            wb.at(fx, 0, fz, ROT[side], () => {
              const m = o.frame === 'wood' ? 'timber' : 'ashlar';
              const hw = o.w / 2;
              wb.box(m, -hw - 0.22, y0, 0, -hw, y1, 0.12, { sub: 2, ao: false });
              wb.box(m, hw, y0, 0, hw + 0.22, y1, 0.12, { sub: 2, ao: false });
              wb.box(m, -hw - 0.25, y1, 0, hw + 0.25, y1 + 0.3, 0.14, { sub: 2, ao: false });
              if (!o.sill) wb.box('ashlar', -hw - 0.06, y0 - 0.02, -0.02, hw + 0.06, y0 + 0.04, 0.24, { ao: false, faces: 'tnsew', sub: 3 });
            });
          if (o.door) {
            // (la hoja, en medio del muro; abre hacia dentro, con el gozne en
            // la cara de dentro: swing +1 abre hacia -z local, que en el eje
            // 'x' es -z del mundo y en el 'z', +x)
            const D = o.door;
            const mid = side === 'n' ? R.z0 + t / 2 : side === 's' ? R.z1 - t / 2 : side === 'w' ? R.x0 + t / 2 : R.x1 - t / 2;
            const plane = side === 'n' ? R.z0 + t : side === 's' ? R.z1 - t : side === 'w' ? R.x0 + t : R.x1 - t;
            const swing = side === 'n' || side === 'e' ? -1 : 1;
            L.interact.push({ kind: 'door', x: axis === 'x' ? c : mid, y: y0, z: axis === 'x' ? mid : c, w: o.w, h: o.h, axis, mat: 'planks', hinge: -1, swing, plane, inset: 0.08, ...D });
          } else if (o.leaf) hoja(ctx, side, fx, fz, o.w, y0, y1, t, o.leaf, Math.floor(c * 31 + y0 * 7));
        } else if (solid) ventanaCerrada(ctx, side, fx, fz, o.w, y0, y1, t, o);
        else {
          // (el cerco de dentro, con la luz de la sala en la que se abre)
          const ix = axis === 'x' ? c : side === 'w' ? I.x0 + 0.2 : I.x1 - 0.2,
            iz = axis === 'x' ? (side === 'n' ? I.z0 + 0.2 : I.z1 - 0.2) : c;
          const rm = (l.areas ?? []).find((a) => ix > a.r[0] && ix < a.r[2] && iz > a.r[1] && iz < a.r[3]);
          hueco(ctx, side, fx, fz, o.w, y0, y1, t, { room: rm ? rm.room : rooms[i], shutters: o.shutters, bars: o.bars, mat: o.frame === 'stone' ? 'ashlar' : 'timber', tint: o.tint, sill: o.frame !== 'none' });
        }
      }
    }
    // los hastiales con su grueso (los de un desván al que se sube): de los
    // huecos de la última planta, lo que pasa del alero
    if (r && r.gableWalls !== false && r.gables !== false && gableSide(side) && !sd.noGable) {
      const l = top;
      const hs = openOf(side, lv.length - 1)
        .map((o) => ({ a0: a0 + o.at - o.w / 2, a1: a0 + o.at + o.w / 2, y0: l.y + (o.sill ?? 0), y1: l.y + (o.sill ?? 0) + o.h }))
        .filter((h) => h.y1 > r.h + 0.01);
      const up = sd.up === 'timber' ? 'plaster' : sd.up ?? 'plaster';
      hastial(ctx, { axis, a0, a1, c: (a0 + a1) / 2, t0, t1, out: side, y0: r.h, yEave: r.h, yRidge: r.ridge, room: rooms[lv.length - 1], holes: hs, mat: sd.gableMat ?? up, matIn: 'plaster', tint: sd.tint ?? LIME, tintIn: LIME, floorY: l.y, inner: !solid, outer: !sd.party });
    }
  }
  // ---- tabiques
  if (!solid)
    for (const w of def.walls ?? []) {
      const l = lv[w.lv];
      const y1 = w.y1 ?? (w.lv + 1 < lv.length ? lv[w.lv + 1].y - SLAB : l.top);
      tabique(ctx, w, l.y, y1, w.rooms ?? rooms[w.lv], { doors: w.doors, mat: w.mat, tint: w.tint });
    }
  // ---- el tejado
  if (r) {
    const RR = { x0: R.x0, z0: R.z0, x1: R.x1, z1: R.z1, h: r.h, ridge: r.ridge };
    const attic = !solid && top.attic;
    const gables = r.gableWalls !== false ? [false, false] : r.gables;
    solidGableRoof(ctx, R.x0, R.z0, R.x1, R.z1, r.h, r.ridge, r.axis, { overhang: r.ov ?? 0.45, gableOverhang: r.gov ?? 0.3, ovs: r.ovs, open: r.open, thick: 0.2, wallT: t, wallMat: r.wallMat ?? 'plaster', wallTint: r.wallTint ?? LIME, gables, holes: r.holes, tint: r.tint, room: attic ? rooms[lv.length - 1] : undefined, underRoom: attic ? rooms[lv.length - 1] : undefined, cam: attic ? false : undefined });
    if (r.walk !== false) {
      const ov = r.ov ?? 0.45;
      const gov = r.gov ?? 0.3;
      const open = r.open ?? [false, false];
      const s = r.s ?? (r.axis === 'x' ? [R.x0 - (open[0] ? 0 : gov), R.x1 + (open[1] ? 0 : gov)] : [R.z0 - (open[0] ? 0 : gov), R.z1 + (open[1] ? 0 : gov)]);
      rampasTejado(ctx, RR, r.axis, { ovs: r.ovs ?? [ov, ov], holes: r.walkHoles, s });
    }
    if (attic && r.trusses) cerchas(ctx, RR, rooms[lv.length - 1], r.axis, r.trusses, t, { tieY: r.tieY, holes: r.camHoles });
  }
  // ---- transitable (la planta baja; las de arriba, por sus suelos)
  if (S && !solid && def.paint !== false) S.paint(R.x0 + 0.01, R.z0 + 0.01, R.x1 - 0.01, R.z1 - 0.01, 1);
  return { R, I, rooms, holes, stairs: stairOut, t };
}

// Los tramos de un muro de fuera por salas: las areas de la planta que llegan
// a su cara de dentro (a menos de 10 cm), cada una con su tramo, y el resto,
// de la sala def. Devuelve [[s0, s1, room]] a lo largo del muro.
function tramosSala(side, R, I, a0, a1, areas, def) {
  if (!areas || !areas.length) return [[a0, a1, def]];
  const cuts = [];
  for (const ar of areas) {
    const [x0, z0, x1, z1] = ar.r;
    const touch = side === 'n' ? z0 <= I.z0 + 0.1 : side === 's' ? z1 >= I.z1 - 0.1 : side === 'w' ? x0 <= I.x0 + 0.1 : x1 >= I.x1 - 0.1;
    if (!touch) continue;
    let p = side === 'n' || side === 's' ? x0 : z0,
      q = side === 'n' || side === 's' ? x1 : z1;
    // (la que llega a la esquina de dentro se lleva el muro hasta la de fuera)
    const [i0, i1] = side === 'n' || side === 's' ? [I.x0, I.x1] : [I.z0, I.z1];
    if (p <= i0 + 0.1) p = a0;
    if (q >= i1 - 0.1) q = a1;
    cuts.push([Math.max(a0, p), Math.min(a1, q), ar.room]);
  }
  cuts.sort((u, v) => u[0] - v[0]);
  const out = [];
  let cur = a0;
  for (const [p, q, rm] of cuts) {
    if (p - cur > 1e-3) out.push([cur, p, def]);
    if (q - Math.max(p, cur) > 1e-3) out.push([Math.max(p, cur), q, rm]);
    cur = Math.max(cur, q);
  }
  if (a1 - cur > 1e-3) out.push([cur, a1, def]);
  return out;
}

// La cara de fuera de un muro con sus huecos (el de una casa maciza: dentro
// no hay nada que ver), con la colisión de la casa aparte.
function muroFuera(ctx, o) {
  const wb = ctx.wb;
  const { axis, a0, a1, t0, t1, y0, y1, out } = o;
  const hs = [...(o.holes ?? [])].sort((p, q) => p.a0 - q.a0);
  const piece = (u0, v0, u1, v1, faces) => {
    if (u1 - u0 < 0.001 || v1 - v0 < 0.001) return;
    const b = axis === 'x' ? [u0, v0, t0, u1, v1, t1] : [t0, v0, u0, t1, v1, u1];
    wb.box(o.mat, ...b, { faces, room: 'out', tint: o.tint, sub: 1.6, ao: false });
  };
  const lo = axis === 'x' ? 'w' : 'n',
    hi = axis === 'x' ? 'e' : 's';
  let cur = a0;
  for (const h of hs) {
    piece(cur, y0, h.a0, y1, out + hi);
    piece(h.a0, y0, h.a1, h.y0, out + 't');
    piece(h.a0, h.y1, h.a1, y1, out + 'b');
    cur = h.a1;
  }
  piece(cur, y0, a1, y1, out + (hs.length ? lo : ''));
}

// Ventana de una casa maciza: el cerco, el negro de dentro y lo que tiene
// (o.shutters: 'closed' por defecto, 'open', 'ajar', 'broken', 'boarded';
// o.lit: luz dentro).
function ventanaCerrada(ctx, side, x, z, w, y0, y1, t, o) {
  const wb = ctx.wb;
  frame(ctx, side, x, z, w, y0, y1, t, { mat: o.frame === 'stone' ? 'ashlar' : 'timber' });
  const sh = o.shutters ?? 'closed';
  wb.at(x, 0, z, ROT[side], () => wb.box(o.lit ? 'ember' : 'black', -w / 2, y0, -t + 0.05, w / 2, y1, -t + 0.07, { ao: false, grime: false, faces: 's' }));
  if (sh === 'closed') closedWindow(ctx, side, x, z, w, y0, y1, t, null);
  else hueco(ctx, side, x, z, w, y0, y1, t, { shutters: sh, sill: false, tint: o.tint, bars: o.bars });
}

// La hoja de una puerta a la que no se entra: cerrada, clavada (con
// tablones en aspa y la cruz de cal) o abierta (el negro de dentro).
function hoja(ctx, side, x, z, w, y0, y1, t, kind, seed) {
  const wb = ctx.wb;
  const h = y1 - y0;
  wb.at(x, y0, z, ROT[side], () => {
    if (kind === 'open') {
      wb.box('black', -w / 2, 0, -t + 0.05, w / 2, h, -t + 0.07, { ao: false, grime: false, faces: 's' });
      return;
    }
    wb.box('planks', -w / 2, 0.03, -0.1, w / 2, h, -0.04, { sub: 3, aoH: 0.6, tint: [0.78, 0.7, 0.62] });
    for (const yy of [0.4, h - 0.5]) wb.box('iron', -w / 2, yy, -0.04, w / 2 - 0.1, yy + 0.08, -0.01, { ao: false });
    wb.box('iron', w / 2 - 0.3, 1.02, -0.04, w / 2 - 0.2, 1.2, -0.025, { ao: false });
    if (kind === 'boarded' || kind === 'cross') {
      const rng = new RNG(seed);
      for (const s of [-1, 1]) {
        wb.push();
        wb.translate(rng.range(-0.05, 0.05), h / 2, 0.02);
        wb.rotateZ(s * (0.72 + rng.range(-0.06, 0.06)));
        wb.box('planks', -h * 0.62, -0.11, -0.03, h * 0.62, 0.11, 0.03, { ao: false, sub: 3, tint: [0.92, 0.86, 0.8] });
        wb.pop();
      }
      for (const yy of [0.5, h - 0.6]) wb.box('planks', -w / 2 - 0.2, yy - 0.1, 0.05, w / 2 + 0.2, yy + 0.1, 0.1, { ao: false, sub: 3, tint: [0.86, 0.8, 0.72] });
    }
    if (kind === 'cross') {
      // la cruz de cal del Barbero, encima de los tablones
      wb.box('plaster', -0.05, h * 0.25, 0.1, 0.05, h * 0.85, 0.105, { ao: false, faces: 's', tint: [1.15, 1.13, 1.08] });
      wb.box('plaster', -0.3, h * 0.6, 0.1, 0.3, h * 0.68, 0.105, { ao: false, faces: 's', tint: [1.15, 1.13, 1.08] });
    }
  });
}

// ------------------------------------------------------------ atrezo de casa
// Una piel colgada (o tendida) a secar: lámina de cuero con su forma de
// animal (el cuello y las cuatro patas), por las dos caras.
export function piel(ctx, x, y, z, rot, w, h, seed, room, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const t = o.tint ?? rng.pick([
    [0.82, 0.66, 0.52],
    [0.7, 0.55, 0.44],
    [0.9, 0.78, 0.66],
    [0.6, 0.46, 0.36],
  ]);
  wb.at(x, y, z, rot, () => {
    wb.push();
    wb.rotateZ(rng.range(-0.05, 0.05));
    wb.rotateX(o.tiltX ?? rng.range(-0.06, 0.06));
    const mat = o.mat ?? (rng.chance(0.75) ? 'leather' : 'hide');
    wb.box(mat, -w / 2, -h, -0.006, w / 2, 0, 0.006, { ao: false, room, faces: 'nsb', tint: t });
    for (const s of [-1, 1]) {
      wb.box(mat, s * w * 0.5 - 0.07, -h * 0.98, -0.005, s * w * 0.5 + 0.07, -h * 0.8, 0.005, { ao: false, room, faces: 'nsb', tint: t });
      wb.box(mat, s * w * 0.52 - 0.06, -h * 0.28, -0.005, s * w * 0.52 + 0.06, -h * 0.12, 0.005, { ao: false, room, faces: 'ns', tint: t });
    }
    wb.box(mat, -w * 0.14, -h - 0.16, -0.005, w * 0.14, -h + 0.02, 0.005, { ao: false, room, faces: 'nsb', tint: t });
    wb.pop();
  });
}

// Un rótulo de oficio colgado de su palomilla de hierro, en la fachada 'side'
// (en (x, y, z), sobre la cara de fuera): draw(wb) dibuja la figura (en el
// marco del rótulo: x a lo largo de la palomilla, y arriba, z de canto).
export function rotulo(ctx, side, x, y, z, draw, o = {}) {
  const wb = ctx.wb;
  wb.at(x, y, z, ROT[side], () => {
    // la palomilla: el brazo, el tornapunta y las cadenitas
    wb.box('iron', -0.02, 0, 0, 0.02, 0.04, o.len ?? 0.9, { ao: false });
    wb.push();
    wb.translate(0, -0.22, 0.25);
    wb.rotateX(-0.75);
    wb.box('iron', -0.015, -0.015, -0.3, 0.015, 0.015, 0.3, { ao: false });
    wb.pop();
    wb.push();
    wb.translate(0, -0.05, (o.len ?? 0.9) - 0.32);
    wb.rotateY(Math.PI / 2);
    draw(wb);
    wb.pop();
  });
}

// Tapia de piedra (con su albardilla), de (x0, z0) a (x1, z1) en planta, de
// alto h; huecos: [{ a0, a1, y0, y1 }] a lo largo.
export function tapia(ctx, x0, z0, x1, z1, h, o = {}) {
  const wb = ctx.wb;
  const alongX = x1 - x0 >= z1 - z0;
  const t = alongX ? z1 - z0 : x1 - x0;
  const segs = [[alongX ? x0 : z0, alongX ? x1 : z1]];
  let ss = segs;
  for (const hh of o.holes ?? []) ss = ss.flatMap(([u, v]) => (hh.a1 <= u || hh.a0 >= v ? [[u, v]] : [[u, hh.a0], [hh.a1, v]].filter(([p, q]) => q - p > 0.02)));
  for (const [u, v] of ss) {
    const b = alongX ? [u, 0, z0, v, h, z1] : [x0, 0, u, x1, h, v];
    wb.box(o.mat ?? 'wallstone', ...b, { sub: 2, faces: 'nsew', tint: o.tint, room: o.room });
    wb.box('ashlar', b[0] - 0.04, h, b[2] - 0.04, b[3] + 0.04, h + 0.1, b[5] + 0.04, { ao: false, faces: 'tnsewb', tint: [0.7, 0.68, 0.64] });
    if (o.collide !== false) ctx.col.add(b[0], 0, b[2], b[3], h + 0.1, b[5]);
  }
  void t;
}

export { railing, blocker, P };
