// Las piezas de la fortaleza (PLAN_FORTALEZA.md, §9): las de su arquitectura
// (el talud con su cordón, las esquinas de sillería, el parapeto almenado, los
// vanos de medio punto y los ajimeces, los matacanes, la arquería del claustro
// y su tejaroz) y las de sus salas (las arcas selladas del Tombo, los estantes,
// los pupitres y los atriles de la cancillería, el sitial del Rey).
//
// Las caras se dan por su plano: dir es hacia dónde mira ('n', 's', 'e', 'w')
// y line, la x o la z del plano; u corre a lo largo de él (x en las caras 'n' y
// 's', z en las 'e' y 'w').
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, blocker, merlons, archRing, husillo, subtractRects, beam } from './builders.js';
import * as P from './props.js';
import { palo } from './barrio_atrezo.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const M4 = () => new THREE.Matrix4();
const Q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));

// la piedra: el mampuesto de los lienzos, la sillería de las esquinas y de los
// arcos, la más oscura de la torre del conde
export const PIEDRA = {
  lienzo: [0.82, 0.8, 0.76],
  silla: [0.86, 0.83, 0.78],
  torre: [0.66, 0.63, 0.6],
  patio: [0.88, 0.85, 0.8],
  enlucido: [0.86, 0.8, 0.7],
};

// Cara plana de cuatro puntos, vuelta hacia 'dir' (sea cual sea su orden).
export function cara(wb, mat, a, b, c, d, dir, o) {
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a));
  if (n.dot(dir) >= 0) wb.quad(mat, a, b, c, d, o);
  else wb.quad(mat, d, c, b, a, o);
}

// Triángulo vuelto hacia 'dir'.
export function tri(wb, mat, a, b, c, dir, o) {
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
  if (n.dot(dir) >= 0) wb.tri(mat, a, b, c, o);
  else wb.tri(mat, a, c, b, o);
}

// El plano de una cara: P(u, y, off) es el punto a 'off' por delante de él.
export function plano(dir, line) {
  const sg = dir === 's' || dir === 'e' ? 1 : -1;
  const alongX = dir === 'n' || dir === 's';
  const Pt = (u, y, off = 0) => (alongX ? V(u, y, line + sg * off) : V(line + sg * off, y, u));
  const N = alongX ? V(0, 0, sg) : V(sg, 0, 0);
  // caja de u0 a u1, de y0 a y1, de off0 a off1 por delante del plano
  const box = (u0, y0, u1, y1, o0, o1) => {
    const a = line + sg * o0,
      b = line + sg * o1;
    return alongX ? [u0, y0, Math.min(a, b), u1, y1, Math.max(a, b)] : [Math.min(a, b), y0, u0, Math.max(a, b), y1, u1];
  };
  return { Pt, N, sg, alongX, box, line };
}

// las caras que se ven de una pieza que asoma de un plano: la de delante y
// los cantos (no la de detrás, contra el muro)
export function asoma(dir) {
  return { n: 'nwetb', s: 'swetb', e: 'ensbt', w: 'wnsbt' }[dir];
}

// Pieza de muro: caja con colisión y las caras que se le pidan, cada una con
// su estancia y su franja de alto: caras = [[faces, room, y0?, y1?, tint?]]
// (room null: fuera).
export function pieza(ctx, mat, x0, y0, z0, x1, y1, z1, caras, o = {}) {
  if (o.collide !== false) {
    const b = ctx.col.add(x0, y0, z0, x1, y1, z1);
    if (o.cam === false) b.cam = false;
  }
  for (const [f, room, ya, yb, tint] of caras) {
    if (!f) continue;
    ctx.wb.box(mat, x0, ya ?? y0, z0, x1, yb ?? y1, z1, { faces: f, sub: o.sub ?? 2.2, aoH: o.aoH ?? 2.5, baseY: o.baseY ?? y0, room: room ?? null, tint: tint ?? o.tint, mats: o.mats });
  }
}

// ------------------------------------------------------------------ el talud
// Al pie de un muro: la cara en 'line', de a0 a a1, mirando hacia dir; sube
// de 0 a h y sale d por abajo. ends: [en a0, en a1], los triángulos de los
// cabos (donde no sigue otro talud). Con su cordón de sillería arriba (un
// bocel que corre a lo largo) y su colisión (en dos escalones).
export function talud(ctx, dir, line, a0, a1, h, d, o = {}) {
  const wb = ctx.wb;
  const F = plano(dir, line);
  const tint = o.tint ?? PIEDRA.lienzo;
  const up = F.N.clone().multiplyScalar(h).add(V(0, d, 0)).normalize();
  // (los cabos van en inglete con el talud de la otra cara, en las esquinas
  // de fuera: ext = [cuánto se alarga por cada cabo])
  const [e0, e1] = o.ext ?? [0, 0];
  cara(wb, o.mat ?? 'wallstone', F.Pt(a0 - e0, 0, d), F.Pt(a1 + e1, 0, d), F.Pt(a1, h, 0), F.Pt(a0, h, 0), up, { sub: 2.2, aoH: 2.2, tint: tint.map((v) => v * 0.92), room: o.room });
  const ends = o.ends ?? [false, false];
  const along = F.alongX ? V(1, 0, 0) : V(0, 0, 1);
  if (ends[0]) tri(wb, o.mat ?? 'wallstone', F.Pt(a0, 0, 0), F.Pt(a0, 0, d), F.Pt(a0, h, 0), along.clone().negate(), { ao: false, tint, room: o.room });
  if (ends[1]) tri(wb, o.mat ?? 'wallstone', F.Pt(a1, 0, 0), F.Pt(a1, 0, d), F.Pt(a1, h, 0), along, { ao: false, tint, room: o.room });
  // el cordón
  if (o.cordon !== false) wb.box('ashlar', ...F.box(a0 - e0 * 0.15, h - 0.04, a1 + e1 * 0.15, h + 0.2, -0.01, 0.16), { ao: false, faces: asoma(dir), tint: PIEDRA.silla, room: o.room });
  if (o.collide !== false) {
    ctx.col.add(...F.box(a0, 0, a1, h * 0.5, 0, d * 0.75));
    ctx.col.add(...F.box(a0, h * 0.5, a1, h, 0, d * 0.35));
  }
}

// ------------------------------------------------------------------ las esquinas
// Esquina de sillería: los sillares a soga y a tizón, alternos, de y0 a y1,
// en la arista de fuera (x, z) entre la cara que mira a dx (±1, en x) y la que
// mira a dz (±1, en z).
export function esquina(ctx, x, z, dx, dz, y0, y1, o = {}) {
  const wb = ctx.wb;
  const hh = o.h ?? 0.56;
  const rng = new RNG(Math.round(x * 13 + z * 7 + y0 * 3));
  const e = 0.03;
  let k = 0;
  for (let y = y0; y < y1 - 0.05; y += hh, k++) {
    const yt = Math.min(y1, y + hh) - 0.02;
    const la = k % 2 ? 0.95 : 0.5,
      lb = k % 2 ? 0.5 : 0.95;
    const tint = (o.tint ?? PIEDRA.silla).map((v) => v * rng.range(0.94, 1.05));
    // (en la cara que mira a dx: a lo largo de z; en la que mira a dz: de x)
    const fx = x + dx * e;
    wb.box('ashlar', Math.min(x, fx), y, Math.min(z, z - dz * la), Math.max(x, fx), yt, Math.max(z, z - dz * la), { ao: false, faces: (dx > 0 ? 'e' : 'w') + 'tb' + (dz > 0 ? 'n' : 's'), tint, room: o.room });
    const fz = z + dz * e;
    wb.box('ashlar', Math.min(x + dx * e, x - dx * lb), y, Math.min(z, fz), Math.max(x + dx * e, x - dx * lb), yt, Math.max(z, fz), { ao: false, faces: (dz > 0 ? 's' : 'n') + 'tb' + (dx > 0 ? 'w' : 'e'), tint, room: o.room });
  }
}

// ------------------------------------------------------------------ el parapeto almenado
// Sobre lo alto de un muro (a y), a lo largo de su cara de fuera (line,
// mirando a dir), de a0 a a1: el antepecho (de grueso t, a ras de la cara) y
// las almenas encima, con su colisión hasta arriba (que no se salte).
export function almenas(ctx, dir, line, a0, a1, y, o = {}) {
  const wb = ctx.wb;
  const F = plano(dir, line);
  const t = o.t ?? 0.6,
    ph = o.ph ?? 0.9,
    mh = o.mh ?? 1.05;
  const tint = o.tint ?? PIEDRA.lienzo;
  // (vuelo: el antepecho asoma un palmo sobre la cara, sobre su cornisa)
  const v = o.vuelo ?? 0.12;
  wb.box('wallstone', ...F.box(a0, y, a1, y + ph, -t + v, v), { ao: false, sub: 2, faces: 'tnsew', tint, room: o.room });
  if (v > 0) wb.box('ashlar', ...F.box(a0, y - 0.22, a1, y, -0.02, v + 0.04), { ao: false, faces: asoma(dir), tint: PIEDRA.silla, room: o.room });
  const c = F.alongX ? line + F.sg * (v - t / 2) : line + F.sg * (v - t / 2);
  if (F.alongX) merlons(ctx, a0, c, a1, c, y + ph, { t, h: mh, collide: false, mat: 'wallstone' });
  else merlons(ctx, c, a0, c, a1, y + ph, { t, h: mh, collide: false, mat: 'wallstone' });
  if (o.collide !== false) blocker(ctx, ...F.box(a0, y, a1, y + ph + 1.6, -t + v, v));
}

// Antepecho liso (por dentro de un adarve, sobre el patio): de grueso t, a
// ras de la cara 'line' que mira a dir, con su albardilla.
export function antepecho(ctx, dir, line, a0, a1, y, o = {}) {
  const wb = ctx.wb;
  const F = plano(dir, line);
  const t = o.t ?? 0.45,
    h = o.h ?? 0.95;
  wb.box('wallstone', ...F.box(a0, y, a1, y + h, -t, 0), { ao: false, sub: 2, faces: 'nsew', tint: o.tint ?? PIEDRA.patio, room: o.room });
  wb.box('ashlar', ...F.box(a0 - 0.04, y + h, a1 + 0.04, y + h + 0.12, -t - 0.05, 0.05), { ao: false, faces: 'tnsewb', tint: PIEDRA.silla, room: o.room });
  if (o.collide !== false) blocker(ctx, ...F.box(a0, y, a1, y + h + 1.2, -t, 0));
}

// ------------------------------------------------------------------ los vanos
// Vano de medio punto (una ventana) en una cara: de ancho w, con el alféizar a
// y y el arranque del arco a y + h; la boca negra (o encendida: lit), las
// jambas, la rosca y el alféizar de sillería, que asoman un poco.
export function vano(ctx, dir, line, u, y, w, h, o = {}) {
  const wb = ctx.wb;
  const F = plano(dir, line);
  const room = o.room;
  // (la boca: negra, encendida —las velas de dentro— o, vista desde dentro,
  // la luna: o.boca = 'luna')
  const boca = o.boca ?? (o.lit ? 'ember' : 'black');
  const bt = boca === 'ember' ? [1, 0.85, 0.6] : undefined;
  const e = 0.012;
  cara(wb, boca, F.Pt(u - w / 2, y, e), F.Pt(u + w / 2, y, e), F.Pt(u + w / 2, y + h, e), F.Pt(u - w / 2, y + h, e), F.N, { ao: false, grime: false, room, tint: bt });
  const n = 8;
  for (let k = 0; k < n; k++) {
    const a = Math.PI - (k / n) * Math.PI,
      b = Math.PI - ((k + 1) / n) * Math.PI;
    tri(wb, boca, F.Pt(u, y + h, e), F.Pt(u + Math.cos(a) * (w / 2), y + h + Math.sin(a) * (w / 2), e), F.Pt(u + Math.cos(b) * (w / 2), y + h + Math.sin(b) * (w / 2), e), F.N, { ao: false, grime: false, room, tint: bt });
  }
  if (boca === 'luna' && o.light !== false) {
    const p = F.Pt(u, y + h * 0.5, 0.7);
    ctx.lights.push({ x: p.x, y: p.y, z: p.z, r: 0.5, g: 0.58, b: 0.78, radius: o.radius ?? 4.5, intensity: o.intensity ?? 0.55, room });
  }
  const r = o.ring ?? 0.13,
    pr = o.proud ?? 0.05;
  const tint = o.tint ?? PIEDRA.silla;
  // las jambas y el alféizar
  for (const s of [-1, 1]) wb.box('ashlar', ...F.box(s < 0 ? u - w / 2 - r : u + w / 2, y, s < 0 ? u - w / 2 : u + w / 2 + r, y + h, -0.01, pr), { ao: false, faces: asoma(dir), tint, room });
  if (o.sill !== false) wb.box('ashlar', ...F.box(u - w / 2 - r - 0.08, y - 0.14, u + w / 2 + r + 0.08, y, -0.01, pr + 0.1), { ao: false, faces: asoma(dir), tint, room });
  // la rosca
  const [t0, t1] = F.sg > 0 ? [line - 0.01, line + pr] : [line - pr, line + 0.01];
  archRing(ctx, { axis: F.alongX ? 'x' : 'z', c: u, w, y0: y + h, rise: w / 2, ring: r, t0, t1, mat: 'ashlar', tint, rooms: [room, room], proud: 0, n: 7, cam: false, seats: false });
  if (o.lit && o.light !== false) {
    const p = F.Pt(u, y + h * 0.6, 0.8);
    ctx.lights.push({ x: p.x, y: p.y, z: p.z, r: 1, g: 0.52, b: 0.2, radius: o.radius ?? 5, intensity: o.intensity ?? 0.8 });
  }
}

// Ajimez: dos vanos de medio punto con su parteluz (una columnilla con su
// capitel) y el alfiz que los enmarca. u: el centro; y: el alféizar.
export function ajimez(ctx, dir, line, u, y, o = {}) {
  const wb = ctx.wb;
  const F = plano(dir, line);
  const wv = o.w ?? 0.5,
    h = o.h ?? 1.25,
    g = 0.17;
  const room = o.room;
  for (const s of [-1, 1]) vano(ctx, dir, line, u + s * (wv / 2 + g / 2), y, wv, h, { ...o, ring: 0.1, sill: false, light: false });
  // el parteluz: la columnilla, el capitel y la basa
  const pc = F.Pt(u, y, 0.07);
  wb.cylinder('ashlar', pc.x, y, pc.z, 0.06, 0.06, h - 0.12, 6, { ao: false, room, tint: PIEDRA.silla });
  wb.box('ashlar', ...F.box(u - g / 2 - 0.03, y + h - 0.14, u + g / 2 + 0.03, y + h, 0, 0.14), { ao: false, faces: asoma(dir), room, tint: PIEDRA.silla });
  // el alfiz y el alféizar corrido
  const x0 = u - wv - g / 2 - 0.28,
    x1 = u + wv + g / 2 + 0.28,
    yt = y + h + wv / 2 + 0.3;
  const tint = PIEDRA.silla.map((v) => v * 0.96);
  wb.box('ashlar', ...F.box(x0, yt, x1, yt + 0.11, -0.01, 0.07), { ao: false, faces: asoma(dir), room, tint });
  for (const xa of [x0, x1 - 0.11]) wb.box('ashlar', ...F.box(xa, y - 0.02, xa + 0.11, yt, -0.01, 0.07), { ao: false, faces: asoma(dir), room, tint });
  wb.box('ashlar', ...F.box(x0 - 0.06, y - 0.16, x1 + 0.06, y, -0.01, 0.16), { ao: false, faces: asoma(dir), room, tint: PIEDRA.silla });
  if (o.lit && o.light !== false) {
    const p = F.Pt(u, y + h * 0.6, 0.9);
    ctx.lights.push({ x: p.x, y: p.y, z: p.z, r: 1, g: 0.52, b: 0.2, radius: o.radius ?? 6, intensity: o.intensity ?? 0.9 });
  }
  if (o.boca === 'luna' && o.light !== false) {
    const p = F.Pt(u, y + h * 0.5, 0.8);
    ctx.lights.push({ x: p.x, y: p.y, z: p.z, r: 0.5, g: 0.58, b: 0.78, radius: o.radius ?? 5, intensity: o.intensity ?? 0.6, room });
  }
}

// Saetera en cruz (la de las torres): la hendidura y su travesaño.
export function saetera(ctx, dir, line, u, y, o = {}) {
  const wb = ctx.wb;
  const F = plano(dir, line);
  const h = o.h ?? 1.5;
  const e = 0.015;
  cara(wb, 'black', F.Pt(u - 0.08, y, e), F.Pt(u + 0.08, y, e), F.Pt(u + 0.08, y + h, e), F.Pt(u - 0.08, y + h, e), F.N, { ao: false, grime: false, room: o.room });
  if (o.cruz !== false) cara(wb, 'black', F.Pt(u - 0.32, y + h * 0.62, e), F.Pt(u + 0.32, y + h * 0.62, e), F.Pt(u + 0.32, y + h * 0.62 + 0.13, e), F.Pt(u - 0.32, y + h * 0.62 + 0.13, e), F.N, { ao: false, grime: false, room: o.room });
  // (el derrame de sillería alrededor)
  wb.box('ashlar', ...F.box(u - 0.2, y - 0.12, u + 0.2, y, -0.01, 0.05), { ao: false, faces: asoma(dir), tint: PIEDRA.silla, room: o.room });
}

// ------------------------------------------------------------------ los matacanes
// Galería volada sobre canes en lo alto de una cara (a y, el suelo de la
// galería): los canes de tres piezas cada 'paso', las buhederas negras entre
// ellos, el antepecho volado y sus almenas.
export function matacanes(ctx, dir, line, a0, a1, y, o = {}) {
  const wb = ctx.wb;
  const F = plano(dir, line);
  const d = o.d ?? 0.85,
    paso = o.paso ?? 1.1;
  const tint = o.tint ?? PIEDRA.lienzo;
  const n = Math.max(2, Math.round((a1 - a0) / paso));
  const step = (a1 - a0) / n;
  for (let i = 0; i <= n; i++) {
    const u = a0 + i * step;
    const hw = 0.17;
    for (let k = 0; k < 3; k++) wb.box('ashlar', ...F.box(u - hw, y - 0.95 + k * 0.3, u + hw, y - 0.65 + k * 0.3, -0.01, (d * (k + 1)) / 3), { ao: false, faces: asoma(dir), tint: PIEDRA.silla, room: o.room });
  }
  // las buhederas, entre los canes (desde abajo, negras)
  wb.box('black', ...F.box(a0, y - 0.32, a1, y - 0.3, 0.05, d - 0.16), { ao: false, grime: false, faces: 'b', room: o.room });
  // el suelo de la galería y el antepecho volado, con sus almenas
  wb.box('wallstone', ...F.box(a0 - 0.2, y - 0.3, a1 + 0.2, y, d - 0.18, d), { ao: false, sub: 2, faces: 'tbnsew', tint, room: o.room });
  wb.box('wallstone', ...F.box(a0 - 0.2, y, a1 + 0.2, y + 0.95, d - 0.55, d), { ao: false, sub: 2, faces: 'tnsew', tint, room: o.room });
  const c = line + F.sg * (d - 0.275);
  if (F.alongX) merlons(ctx, a0 - 0.2, c, a1 + 0.2, c, y + 0.95, { t: 0.55, h: 1.0, collide: false });
  else merlons(ctx, c, a0 - 0.2, c, a1 + 0.2, y + 0.95, { t: 0.55, h: 1.0, collide: false });
}

// ------------------------------------------------------------------ el claustro
// Arquería sobre columnas: a lo largo de 'axis' ('x' o 'z'), en el plano t
// (de t - th/2 a t + th/2), con las columnas en cs (sus centros, en orden);
// cada arco arranca de los capiteles (ys) y la enjuta sube hasta 'top'. Las
// columnas de los cabos que ya están (ends: [false, false]) no se ponen.
// rooms: [el lado de menos t, el de más].
export function arcada(ctx, axis, t, cs, ys, top, o = {}) {
  const wb = ctx.wb;
  const th = o.th ?? 0.62;
  const rc = o.r ?? 0.22;
  const rooms = o.rooms ?? [undefined, undefined];
  const tint = o.tint ?? PIEDRA.patio;
  const ends = o.ends ?? [true, true];
  const capW = rc + 0.16;
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    const x = axis === 'x' ? c : t,
      z = axis === 'x' ? t : c;
    if ((i === 0 && !ends[0]) || (i === cs.length - 1 && !ends[1])) continue;
    // basa, fuste y capitel (y su cimacio)
    wb.box('ashlar', x - rc - 0.1, 0, z - rc - 0.1, x + rc + 0.1, 0.28, z + rc + 0.1, { faces: 'tnsew', sub: 2, aoH: 0.4, tint, room: rooms[0] });
    wb.cylinder('ashlar', x, 0.28, z, rc, rc * 0.9, ys - 0.62, 10, { ao: false, tint, room: rooms[0] });
    wb.cylinder('ashlar', x, ys - 0.34, z, rc * 0.92, capW, 0.2, 8, { ao: false, tint: tint.map((v) => v * 0.97), room: rooms[0] });
    wb.box('ashlar', x - capW, ys - 0.14, z - (axis === 'x' ? th / 2 : capW), x + capW, ys, z + (axis === 'x' ? th / 2 : capW), { ao: false, faces: 'tnsewb', tint: tint.map((v) => v * 1.04), room: rooms[0] });
    ctx.col.add(x - rc, 0, z - rc, x + rc, ys, z + rc);
  }
  for (let i = 0; i + 1 < cs.length; i++) {
    const a = cs[i],
      b = cs[i + 1];
    const w = b - a - 2 * (capW - 0.04);
    archRing(ctx, {
      axis,
      c: (a + b) / 2,
      w,
      y0: ys,
      rise: o.rise ?? w / 2,
      ring: o.ring ?? 0.24,
      t0: t - th / 2,
      t1: t + th / 2,
      top,
      clip: [a, b],
      piers: true,
      topFace: true,
      mat: 'ashlar',
      spMat: 'wallstone',
      rooms,
      tint: tint.map((v) => v * 0.95),
      spTint: tint,
      proud: 0.02,
    });
  }
  // la cornisa corrida sobre las enjutas
  const [a0, a1] = [cs[0] - capW, cs[cs.length - 1] + capW];
  if (axis === 'x') wb.box('ashlar', a0, top, t - th / 2 - 0.12, a1, top + 0.2, t + th / 2 + 0.12, { ao: false, faces: 'tnsewb', tint: PIEDRA.silla, room: rooms[1] });
  else wb.box('ashlar', t - th / 2 - 0.12, top, a0, t + th / 2 + 0.12, top + 0.2, a1, { ao: false, faces: 'tnsewb', tint: PIEDRA.silla, room: rooms[1] });
}

// Tejaroz: cubierta de teja a un agua de un muro (alto, en 'line', del lado
// dir: hacia donde baja) sobre una galería: de a0 a a1 a lo largo, baja de yHi
// a yLo en d (más el vuelo). Por debajo, las tablas y los cabios; el canto.
export function tejaroz(ctx, dir, line, a0, a1, d, yHi, yLo, o = {}) {
  const wb = ctx.wb;
  const F = plano(dir, line);
  const vuelo = o.vuelo ?? 0.45;
  const slope = (yHi - yLo) / d;
  const D = d + vuelo,
    yE = yHi - slope * D;
  const up = F.N.clone().multiplyScalar(yHi - yLo).add(V(0, d, 0)).normalize();
  const th = 0.16;
  // (tejas; tablas por debajo; el canto del alero y los de los lados)
  const [c0, c1] = o.cut ?? [0, 0];
  const A = F.Pt(a0, yHi, 0),
    B = F.Pt(a1, yHi, 0),
    C = F.Pt(a1 + c1 * D, yE, D),
    Dd = F.Pt(a0 - c0 * D, yE, D);
  cara(wb, 'roof', A, B, C, Dd, up, { ao: false, sub: 2.4, tint: o.tint });
  const dn = V(0, -th, 0);
  const A2 = A.clone().add(dn),
    B2 = B.clone().add(dn),
    C2 = C.clone().add(dn),
    D2 = Dd.clone().add(dn);
  cara(wb, 'wooddark', A2, B2, C2, D2, up.clone().negate(), { ao: false, sub: 3, tint: [0.5, 0.46, 0.42], room: o.underRoom });
  cara(wb, 'wooddark', Dd, C, C2, D2, F.N, { ao: false, tint: [0.42, 0.38, 0.34] });
  if (!c0) cara(wb, 'wooddark', A, Dd, D2, A2, F.alongX ? V(-1, 0, 0) : V(0, 0, -1), { ao: false, tint: [0.42, 0.38, 0.34] });
  if (!c1) cara(wb, 'wooddark', B, C, C2, B2, F.alongX ? V(1, 0, 0) : V(0, 0, 1), { ao: false, tint: [0.42, 0.38, 0.34] });
  // los cabios, de muro a alero
  for (let u = a0 + 0.35; u < a1 - 0.2; u += 0.9) {
    const p0 = F.Pt(u, yHi - th, 0),
      p1 = F.Pt(u, yE - th, D);
    const m = p0.clone().add(p1).multiplyScalar(0.5);
    const len = p0.distanceTo(p1);
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), p1.clone().sub(p0).normalize());
    wb.geometry('wooddark', new THREE.BoxGeometry(0.1, len, 0.14), M4().compose(m.add(V(0, -0.07, 0)), q, V(1, 1, 1)), { ao: false, room: o.underRoom, tint: [0.46, 0.4, 0.34] });
  }
  if (o.cam !== false) {
    const k = 3;
    for (let i = 0; i < k; i++) ctx.col.addCam(...F.box(a0, yHi - slope * d * ((i + 1) / k) - 0.1, a1, yHi - slope * d * (i / k) + 0.1, (d * i) / k, (d * (i + 1)) / k));
  }
}

// ------------------------------------------------------------------ muros con vanos
// Muro macizo a lo largo de 'axis' (de a0 a a1), de grueso t0..t1 y de y0 a
// y1, con sus vanos (puertas de medio punto: { c, w, y (el suelo del vano), h
// (lo que sube hasta el arranque), rise (la flecha; 0, adintelado), ring })
// y sus dos caras por franjas de alto, cada una con la luz de su sala: A, la
// de t0; B, la de t1 ([{ room, y0, y1, tint? }]; room null: fuera). Las
// jambas y el umbral van con la sala del lado A (o revealRoom).
export function muroVanos(ctx, axis, a0, a1, t0, t1, y0, y1, vanos, A, B, o = {}) {
  const wb = ctx.wb;
  const mat = o.mat ?? 'wallstone';
  const tint = o.tint ?? PIEDRA.lienzo;
  const axZ = axis === 'z';
  const fA = axZ ? 'w' : 'n',
    fB = axZ ? 'e' : 's';
  const endLo = axZ ? 'n' : 'w',
    endHi = axZ ? 's' : 'e';
  const box = (u0, v0, u1, v1) => (axZ ? [t0, v0, u0, t1, v1, u1] : [u0, v0, t0, u1, v1, t1]);
  const roomAt = (bands, y) => {
    const b = bands.find((q) => y >= q.y0 - 1e-3 && y < q.y1);
    return b ? b.room ?? null : null;
  };
  const rev = o.revealRoom !== undefined ? o.revealRoom : A.length ? A[0].room ?? null : null;
  const piece = (u0, v0, u1, v1, ends = '', top = false, rr = rev) => {
    if (u1 - u0 < 0.005 || v1 - v0 < 0.005) return;
    if (o.collide !== false) ctx.col.add(...box(u0, v0, u1, v1));
    for (const [side, bands] of [
      [fA, A],
      [fB, B],
    ])
      for (const bd of bands) {
        const ya = Math.max(v0, bd.y0),
          yb = Math.min(v1, bd.y1);
        if (yb - ya > 0.005) wb.box(bd.mat ?? mat, ...box(u0, ya, u1, yb), { faces: side, room: bd.room ?? null, tint: bd.tint ?? tint, sub: o.sub ?? 2, aoH: 1.8, baseY: bd.y0 });
      }
    const f = ends + (top ? 't' : '');
    if (f) wb.box(mat, ...box(u0, v0, u1, v1), { faces: f, room: rr, tint, sub: 2, ao: false, mats: top ? { t: 'flag' } : undefined });
  };
  // (los vanos con el mismo eje y el mismo ancho, uno encima de otro, van en
  // la misma columna: las puertas de cada planta de un caracol)
  const cols = new Map();
  for (const v of vanos) {
    const k = v.c.toFixed(3) + ':' + v.w.toFixed(3);
    if (!cols.has(k)) cols.set(k, []);
    cols.get(k).push(v);
  }
  const gs = [...cols.values()].map((g) => g.sort((p, q) => p.y - q.y)).sort((A, B) => A[0].c - B[0].c);
  let cur = a0;
  // (tras un vano adintelado, su derrame de la derecha lo pone él: el cabo
  // del trozo de muro que sigue, no)
  let llano = false;
  for (const G of gs) {
    const ring = Math.max(...G.map((v) => (v.rise > 0 ? v.ring ?? 0.26 : 0)));
    const l = G[0].c - G[0].w / 2,
      r = G[0].c + G[0].w / 2;
    piece(cur, y0, l - ring, y1, cur > a0 && !llano ? endLo : '');
    let yc = y0;
    for (const v of G) {
      const ys = v.y + v.h;
      const arco = v.rise > 0;
      const ytop = arco ? ys + v.rise + ring + 0.05 : ys;
      // (las jambas, el umbral y el dintel, con la luz de la sala del vano:
      // v.room, si cada uno da a una)
      const vr = v.room !== undefined ? v.room : rev;
      // lo de debajo del vano (con el umbral) y sus jambas
      piece(l - ring, yc, r + ring, v.y, '', true, vr);
      if (ring > 0) {
        piece(l - ring, v.y, l, arco ? ys : ytop, endHi, false, vr);
        piece(r, v.y, r + ring, arco ? ys : ytop, endLo, false, vr);
      } else {
        // (los derrames de un vano adintelado; no el que cae en un cabo del
        // muro: ahí está la cara del muro de al lado)
        if (l > a0 + 0.005) wb.box(mat, ...box(l - 0.001, v.y, l, ys), { faces: endHi, room: vr, tint, sub: 2, ao: false });
        if (r < a1 - 0.005) wb.box(mat, ...box(r, v.y, r + 0.001, ys), { faces: endLo, room: vr, tint, sub: 2, ao: false });
      }
      if (arco) {
        // (archRooms: la luz de cada cara del arco, si no es la de sus
        // franjas: la puerta de una sala a un pasadizo que no tiene cara aquí)
        archRing(ctx, { axis: axZ ? 'z' : 'x', c: v.c, w: v.w, y0: ys, rise: v.rise, ring, t0, t1, top: ytop, clip: [l - ring, r + ring], mat: 'ashlar', spMat: mat, rooms: v.archRooms ?? [roomAt(A, ys), roomAt(B, ys)], tint: v.tint ?? PIEDRA.silla, spTint: tint, proud: 0.02 });
        if (o.collide !== false) {
          ctx.col.add(...box(l, ys + v.rise * 0.62, r, ytop));
          ctx.col.add(...box(l - ring, ys, l, ytop));
          ctx.col.add(...box(r, ys, r + ring, ytop));
        }
      } else wb.box(mat, ...box(l, ys, r, ys + 0.001), { faces: 'b', room: vr, tint, ao: false, sub: 2 });
      yc = ytop;
    }
    piece(l - ring, yc, r + ring, y1);
    cur = r + ring;
    llano = ring === 0;
  }
  piece(cur, y0, a1, y1, gs.length && !llano ? endLo : '');
}

// Forjado de tablas a la altura y, de x0..x1 por z0..z1, con sus huecos
// ([x0, z0, x1, z1]): las tablas por arriba (la sala de arriba), el techo y las
// viguetas por abajo (la de abajo), y su colisión.
export function forjado(ctx, x0, z0, x1, z1, y, holes, roomUp, roomDown, o = {}) {
  const wb = ctx.wb;
  const SL = o.slab ?? 0.3;
  for (const m of subtractRects([x0, z0, x1, z1], holes)) {
    wb.box(o.mat ?? 'planks', m[0], y - 0.05, m[1], m[2], y, m[3], { faces: 't', ao: false, uv: 0.7, room: roomUp, tint: o.tint });
    wb.box('wooddark', m[0], y - SL, m[1], m[2], y - SL + 0.02, m[3], { faces: 'b', ao: false, room: roomDown, tint: [0.56, 0.5, 0.44] });
    ctx.col.add(m[0], y - SL, m[1], m[2], y, m[3]).cam = true;
  }
  // las viguetas, a lo largo de x, cortadas en los huecos
  for (let z = z0 + 0.55; z < z1 - 0.3; z += 1.1) {
    const cuts = holes.filter((h) => z > h[1] - 0.15 && z < h[3] + 0.15).map((h) => [h[0] - 0.1, z - 1, h[2] + 0.1, z + 1]);
    for (const sg of subtractRects([x0, z - 0.1, x1, z + 0.1], cuts)) if (sg[2] - sg[0] > 0.05) wb.box('wooddark', sg[0], y - SL - 0.22, sg[1], sg[2], y - SL, sg[3], { ao: false, faces: 'nsewb', room: roomDown });
  }
}

// El caracol de una torre: el husillo en el rincón del sureste de su planta
// (x1, z1: el rincón; h: medio lado de la caja), de y0 hasta la última planta
// (pisos: las alturas de cada planta, la primera y0), con sus dos muros de la
// caja (al oeste y al norte, de grueso t) y las puertas del norte: la de abajo,
// en la mitad del este; las de cada planta, en la del oeste (por donde se
// llega). rooms: la sala de cada planta (por franjas: hasta la siguiente).
export function caracol(ctx, x1, z1, h, pisos, rooms, o = {}) {
  const t = o.t ?? 0.4;
  const cx = x1 - h,
    cz = z1 - h;
  const y0 = pisos[0],
    dy = pisos[1] - pisos[0];
  const n = 16 * (pisos.length - 1);
  husillo(ctx, { x: cx, z: cz, h, y0, n, rise: dy / 16, a0: 270, walls: ['n', 's', 'e', 'w'], room: rooms[0], tint: o.tint });
  const top = pisos[pisos.length - 1] + 2.8;
  // las franjas de cada sala (por las dos caras de los muros de la caja)
  const bands = pisos.map((y, k) => ({ room: rooms[k], y0: k ? y - 0.3 : y0, y1: k < pisos.length - 1 ? pisos[k + 1] - 0.3 : top }));
  // (la de abajo, más alta: se sale de ella bajando los primeros peldaños,
  // que caen debajo de su dintel)
  const vanos = pisos.map((y, k) => (k ? { c: cx - h / 2, w: h, y, h: 2.4, rise: 0 } : { c: cx + h / 2, w: h, y, h: 3.0, rise: 0 }));
  muroVanos(ctx, 'x', x1 - 2 * h - t, x1, z1 - 2 * h - t, z1 - 2 * h, y0, top, vanos, bands, bands, { mat: 'ashlar', tint: [0.72, 0.7, 0.66] });
  muroVanos(ctx, 'z', z1 - 2 * h, z1, x1 - 2 * h - t, x1 - 2 * h, y0, top, [], bands, bands, { mat: 'ashlar', tint: [0.72, 0.7, 0.66] });
  // una antorcha en cada vuelta, dentro de la caja
  for (let k = 0; k < pisos.length - 1; k++) {
    const y = pisos[k] + 2.6;
    ctx.lights.push({ x: cx, y, z: cz, r: 1, g: 0.5, b: 0.2, radius: 4.5, intensity: 0.8, room: rooms[k] });
  }
  return { cx, cz, hueco: [x1 - 2 * h - t, z1 - 2 * h - t, x1, z1] };
}

// ------------------------------------------------------------------ las salas
// (el color de los pergaminos y de la cera de los sellos: bermeja, la cámara
// del Rey; negra, su guarda; verde, el cabildo de la Sé)
export const PERG = [
  [0.86, 0.8, 0.64],
  [0.8, 0.72, 0.55],
  [0.9, 0.85, 0.7],
  [0.74, 0.66, 0.5],
];
export const CERA = { r: [0.62, 0.09, 0.06], n: [0.1, 0.09, 0.09], v: [0.18, 0.38, 0.16] };

export function hoja(wb, x, y, z, rot, room, rng, k = 0) {
  wb.at(x, y + 0.004 + (k % 6) * 0.007, z, rot, () => wb.box('clothWhite', -0.11, 0, -0.15, 0.11, 0.004, 0.15, { ao: false, faces: 't', room, grime: false, tint: rng.pick(PERG) }));
}

export function rollo(wb, x, y, z, rot, room, rng) {
  wb.push();
  wb.translate(x, y + 0.035, z);
  wb.rotateY(rot);
  wb.rotateZ(Math.PI / 2);
  wb.cylinder('clothWhite', 0, -0.15, 0, 0.035, 0.035, 0.3, 6, { ao: false, room, grime: false, capTop: true, capBot: true, tint: rng.pick(PERG) });
  wb.pop();
}

// Estante del archivo, de cara a +z local: dos costados, la trasera y cuatro
// baldas con libros de pie, rollos tumbados y legajos atados.
export function estante(ctx, x, y, z, rot, w, room, seed) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const books = [
    [0.55, 0.35, 0.22],
    [0.4, 0.22, 0.16],
    [0.3, 0.26, 0.2],
    [0.6, 0.5, 0.36],
  ];
  wb.at(x, y, z, rot, () => {
    for (const sx of [-w / 2, w / 2 - 0.06]) wb.box('wooddark', sx, 0, -0.2, sx + 0.06, 2.1, 0.2, { ao: false, room });
    wb.box('wooddark', -w / 2 + 0.06, 0, -0.2, w / 2 - 0.06, 2.1, -0.18, { ao: false, faces: 's', room, tint: [0.5, 0.45, 0.4] });
    for (let i = 0; i < 4; i++) {
      const by = 0.1 + i * 0.5;
      wb.box('wooddark', -w / 2 + 0.06, by, -0.18, w / 2 - 0.06, by + 0.04, 0.19, { ao: false, faces: 'tnsb', room });
      const fy = by + 0.04;
      let u = -w / 2 + 0.1;
      while (u < w / 2 - 0.42) {
        const k = rng.next();
        if (k < 0.4) {
          for (let j = 0; j < 3 + Math.floor(rng.next() * 4); j++) {
            const bw = rng.range(0.05, 0.09),
              bh = rng.range(0.24, 0.36);
            wb.box('leather', u, fy, -0.15, u + bw, fy + bh, 0.1, { ao: false, room, tint: rng.pick(books) });
            u += bw + 0.006;
          }
        } else if (k < 0.72) {
          for (let j = 0; j < 3; j++) {
            wb.push();
            wb.translate(u + 0.15, fy + 0.035 + (j === 2 ? 0.06 : 0), -0.06 + (j === 2 ? 0.07 : j * 0.13));
            wb.rotateZ(Math.PI / 2);
            wb.cylinder('clothWhite', 0, -0.14, 0, 0.034, 0.034, 0.28, 6, { ao: false, room, grime: false, capTop: true, capBot: true, tint: rng.pick(PERG) });
            wb.pop();
          }
          u += 0.33;
        } else if (k < 0.9) {
          wb.box('clothWhite', u, fy, -0.14, u + 0.3, fy + 0.12 + rng.range(0, 0.06), 0.12, { ao: false, room, grime: false, tint: rng.pick(PERG) });
          wb.box('clothRed', u + 0.13, fy, -0.145, u + 0.16, fy + 0.13, 0.125, { ao: false, room });
          u += 0.33;
        } else u += 0.18;
      }
    }
  });
  P.colOBB(ctx, x, z, w / 2, 0.2, rot, y, y + 2.1);
}

// Pupitre de escribano, de cara a -z local: el tablero en cuesta sobre su
// caja, la hoja, el tintero de cuerno y la pluma; el escabel, a +z.
export function pupitre(ctx, x, y, z, rot, room, rng) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -0.42, 0, -0.24, 0.42, 0.68, 0.18, { ao: false, faces: 'tnsew', room });
    wb.push();
    wb.translate(0, 0.78, -0.03);
    wb.rotateX(0.32);
    wb.box('wooddark', -0.48, -0.025, -0.3, 0.48, 0.025, 0.3, { ao: false, faces: 'tnsewb', room });
    wb.box('clothWhite', -0.2, 0.025, -0.17, 0.2, 0.03, 0.14, { ao: false, faces: 't', room, grime: false, tint: rng.pick(PERG) });
    wb.box('wooddark', -0.48, 0.025, 0.24, 0.48, 0.07, 0.3, { ao: false, room });
    wb.pop();
    wb.cylinder('bone', 0.38, 0.84, -0.2, 0.03, 0.035, 0.12, 6, { ao: false, capTop: true, room, tint: [0.36, 0.3, 0.26] });
    palo(wb, V(0.36, 0.94, -0.2), V(0.24, 1.2, -0.27), 0.006, 'clothWhite', { room });
  });
  P.colOBB(ctx, x, z, 0.48, 0.3, rot, y, y + 1.0);
  P.stool(ctx, x + Math.sin(rot) * 0.6, y, z + Math.cos(rot) * 0.6, { room });
}

// Atril, de cara a +z local (donde se pone el que lee).
export function atril(ctx, x, y, z, rot, room) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -0.35, 0, -0.06, 0.35, 0.08, 0.06, { ao: false, room });
    wb.box('wooddark', -0.06, 0, -0.35, 0.06, 0.08, 0.35, { ao: false, room });
    wb.box('wooddark', -0.06, 0.08, -0.06, 0.06, 1.0, 0.06, { ao: false, room });
    wb.push();
    wb.translate(0, 1.06, 0);
    wb.rotateX(0.3);
    wb.box('wooddark', -0.34, -0.025, -0.26, 0.34, 0.025, 0.26, { ao: false, faces: 'tnsewb', room });
    wb.box('wooddark', -0.34, 0.025, 0.22, 0.34, 0.07, 0.26, { ao: false, room });
    wb.pop();
  });
  P.colOBB(ctx, x, z, 0.36, 0.36, rot, y, y + 1.2);
}

// Un arca del Rey en el Tombo, de cara a +z local, con sus sellos de cera
// colgando sobre la cerradura: la caja con sus herrajes y la tapa en dos
// grupos del mundo ('arca:id', cerrada con los sellos enteros; 'arca:id:
// abierta', echada atrás, con los sellos rotos en el suelo y lo de dentro a la
// vista): game/interact.js los cambia al abrirla.
export function arcaSellada(ctx, x, y, z, rot, room, id, seals, fill) {
  const wb = ctx.wb;
  const w = 1.0,
    d = 0.56,
    h = 0.5;
  const rng = new RNG(id.length * 131 + seals.length * 7 + Math.round(-x * 10));
  const n = seals.length;
  const sx = (k) => (k - (n - 1) / 2) * 0.17;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -w / 2, 0, -d / 2, w / 2, h, d / 2, { faces: 'tnsew', aoH: 0.5, room, mats: { t: 'black' } });
    for (const s of [-1, 1]) wb.box('iron', s * (w / 2 - 0.15) - 0.03, 0, -d / 2 - 0.015, s * (w / 2 - 0.15) + 0.03, h, d / 2 + 0.015, { ao: false, faces: 'nsewt', room });
    wb.box('iron', -0.09, h - 0.22, d / 2, 0.09, h - 0.03, d / 2 + 0.02, { ao: false, faces: 'tsewb', room });
  });
  ctx.beginGroup('arca:' + id);
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -w / 2 - 0.02, h, -d / 2 - 0.02, w / 2 + 0.02, h + 0.1, d / 2 + 0.02, { ao: false, faces: 'tnsewb', room });
    for (const s of [-1, 1]) wb.box('iron', s * (w / 2 - 0.15) - 0.03, h, -d / 2 - 0.035, s * (w / 2 - 0.15) + 0.03, h + 0.115, d / 2 + 0.035, { ao: false, room });
    wb.box('iron', -0.035, h - 0.16, d / 2 + 0.02, 0.035, h + 0.08, d / 2 + 0.04, { ao: false, room });
    seals.forEach((c, k) => {
      const u = sx(k);
      wb.box('rope', u - 0.007, h - 0.21, d / 2 + 0.042, u + 0.007, h + 0.06, d / 2 + 0.056, { ao: false, room, tint: c === 'v' ? [0.3, 0.5, 0.3] : [0.75, 0.68, 0.55] });
      wb.geometry('bone', new THREE.CylinderGeometry(0.07, 0.07, 0.026, 12), M4().compose(V(u, h - 0.26, d / 2 + 0.07), Q(Math.PI / 2, 0, 0), V(1, 1, 1)), { ao: false, room, tint: CERA[c], grime: false });
    });
  });
  ctx.endGroup();
  ctx.beginGroup('arca:' + id + ':abierta');
  wb.at(x, y, z, rot, () => {
    wb.push();
    wb.translate(0, h, -d / 2);
    wb.rotateX(-1.85);
    wb.box('wooddark', -w / 2 - 0.02, 0, -0.02, w / 2 + 0.02, 0.1, d + 0.02, { ao: false, faces: 'tnsewb', room });
    for (const s of [-1, 1]) wb.box('iron', s * (w / 2 - 0.15) - 0.03, -0.015, -0.035, s * (w / 2 - 0.15) + 0.03, 0.115, d + 0.035, { ao: false, room });
    wb.box('iron', -0.035, -0.16, d + 0.02, 0.035, 0.08, d + 0.04, { ao: false, room });
    wb.pop();
    if (fill)
      for (let i = 0; i < 5; i++) {
        wb.push();
        wb.translate(rng.range(-0.3, 0.3), h + 0.035, rng.range(-0.14, 0.14));
        wb.rotateY(rng.range(-0.5, 0.5));
        wb.rotateZ(Math.PI / 2);
        wb.cylinder('clothWhite', 0, -0.15, 0, 0.035, 0.035, 0.3, 6, { ao: false, room, grime: false, capTop: true, capBot: true, tint: rng.pick(PERG) });
        wb.pop();
      }
    seals.forEach((c, k) => {
      for (const half of [0, 1]) wb.geometry('bone', new THREE.CylinderGeometry(0.07, 0.07, 0.026, 8, 1, false, half * Math.PI, Math.PI), M4().compose(V(sx(k) * 1.5 + rng.range(-0.06, 0.06) + half * 0.1, 0.013, d / 2 + 0.24 + rng.range(-0.06, 0.08)), Q(0, rng.range(0, 6.28), 0), V(1, 1, 1)), { ao: false, room, tint: CERA[c], grime: false });
    });
  });
  ctx.endGroup();
  P.colOBB(ctx, x, z, w / 2 + 0.03, d / 2 + 0.04, rot, y, y + h + 0.1);
}

// Una pila de legajos atados, unos sobre otros.
export function legajos(ctx, x, y, z, rot, room, rng) {
  const wb = ctx.wb;
  let h = 0;
  const k = 3 + Math.floor(rng.next() * 4);
  wb.at(x, y, z, rot, () => {
    for (let i = 0; i < k; i++) {
      const t = rng.range(0.08, 0.16),
        a = rng.range(-0.15, 0.15);
      wb.push();
      wb.translate(rng.range(-0.04, 0.04), h, rng.range(-0.04, 0.04));
      wb.rotateY(a);
      wb.box('clothWhite', -0.2, 0, -0.15, 0.2, t, 0.15, { ao: false, room, grime: false, tint: rng.pick(PERG) });
      wb.box('clothRed', -0.02, 0, -0.156, 0.02, t + 0.012, 0.156, { ao: false, room, tint: rng.chance(0.5) ? [0.55, 0.12, 0.1] : [0.2, 0.32, 0.18] });
      wb.pop();
      h += t;
    }
  });
  P.colOBB(ctx, x, z, 0.24, 0.2, rot, y, y + h);
}

// Un farol en el suelo, encendido.
export function farol(ctx, x, y, z, room) {
  const wb = ctx.wb;
  wb.cylinder('iron', x, y, z, 0.11, 0.11, 0.03, 6, { ao: false, capTop: true, room });
  wb.cylinder('ember', x, y + 0.03, z, 0.085, 0.085, 0.2, 6, { ao: false, grime: false, room });
  wb.cylinder('iron', x, y + 0.23, z, 0.12, 0.03, 0.12, 6, { ao: false, room });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    wb.box('iron', x + Math.cos(a) * 0.1 - 0.01, y, z + Math.sin(a) * 0.1 - 0.01, x + Math.cos(a) * 0.1 + 0.01, y + 0.25, z + Math.sin(a) * 0.1 + 0.01, { ao: false, room });
  }
  ctx.fires.push({ x, y: y + 0.12, z, s: 0.16, light: false, embers: false, glow: true });
  ctx.lights.push({ x, y: y + 0.4, z, r: 1, g: 0.56, b: 0.22, radius: 5.0, intensity: 1.0, room });
}

// El sitial del Rey (vacío), de cara a +z local: la silla de respaldo alto con
// sus brazos, su cojín y su remate dorado, sobre una tarima.
export function sitial(ctx, x, y, z, rot, room) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('planks', -1.6, 0, -1.0, 1.6, 0.3, 0.9, { ao: false, faces: 'tnsew', room, tint: [0.62, 0.55, 0.48] });
    wb.box('wooddark', -0.5, 0.3, -0.4, 0.5, 0.8, 0.35, { ao: false, faces: 'tnsew', room });
    wb.box('clothRed', -0.44, 0.8, -0.36, 0.44, 0.9, 0.3, { ao: false, faces: 'tnsew', room });
    wb.box('wooddark', -0.55, 0.3, -0.55, 0.55, 2.6, -0.4, { ao: false, faces: 'tnsew', room });
    wb.box('gold', -0.2, 2.4, -0.6, 0.2, 2.75, -0.38, { ao: false, faces: 'tnsew', room });
    for (const s of [-1, 1]) wb.box('wooddark', s * 0.5 - 0.05, 0.8, -0.4, s * 0.5 + 0.05, 1.3, 0.36, { ao: false, faces: 'tnsew', room });
  });
  P.colOBB(ctx, x, z, 1.6, 0.95, rot, y, y + 0.3);
  P.colOBB(ctx, x + Math.sin(rot) * -0.1, z + Math.cos(rot) * -0.1, 0.56, 0.5, rot, y + 0.3, y + 1.3);
}

// Un tapiz colgado de su vara (de cara a +z local), con su cenefa.
export function tapiz(ctx, x, y, z, rot, w, h, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  const mat = o.mat ?? 'clothRed';
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -w / 2 - 0.12, -0.05, -0.02, w / 2 + 0.12, 0.05, 0.08, { ao: false, room });
    wb.box(mat, -w / 2, -h, 0.02, w / 2, -0.04, 0.05, { ao: false, faces: 'nswe', room, tint: o.tint });
    wb.box('gold', -w / 2, -h, 0.05, w / 2, -h + 0.14, 0.055, { ao: false, faces: 's', room, tint: [0.6, 0.48, 0.24] });
    wb.box('gold', -w / 2, -0.2, 0.05, w / 2, -0.12, 0.055, { ao: false, faces: 's', room, tint: [0.6, 0.48, 0.24] });
  });
}

// ------------------------------------------------------------------ por dentro
// Las caras de dentro de una torre (las de sus muros sin puertas), por franjas
// de alto, cada una con su sala.
export function dentro(ctx, R, lados, bands, o = {}) {
  const wb = ctx.wb;
  const ix0 = R.x0 + R.t,
    ix1 = R.x1 - R.t,
    iz0 = R.z0 + R.t,
    iz1 = R.z1 - R.t;
  for (const l of lados)
    for (const b of bands) {
      const bx = { n: [ix0, b.y0, iz0 - 0.01, ix1, b.y1, iz0], s: [ix0, b.y0, iz1, ix1, b.y1, iz1 + 0.01], w: [ix0 - 0.01, b.y0, iz0, ix0, b.y1, iz1], e: [ix1, b.y0, iz0, ix1 + 0.01, b.y1, iz1] }[l];
      wb.box(b.mat ?? o.mat ?? 'wallstone', ...bx, { faces: { n: 's', s: 'n', w: 'e', e: 'w' }[l], room: b.room, tint: b.tint ?? o.tint ?? [0.72, 0.69, 0.64], sub: 2, aoH: 1.6, baseY: b.y0 });
    }
}

// Una cara suelta (sin colisión), en el plano de un muro.
export function cara1(ctx, mat, dir, line, a, b, y0, y1, room, tint) {
  const box = { n: [a, y0, line - 0.01, b, y1, line], s: [a, y0, line, b, y1, line + 0.01], w: [line - 0.01, y0, a, line, y1, b], e: [line, y0, a, line + 0.01, y1, b] }[dir];
  ctx.wb.box(mat, ...box, { faces: dir, room, tint, sub: 2, aoH: 1.6, baseY: y0 });
}

// Saetera por dentro (la hendidura en su derrame), en una cara que mira a dir.
export function saeteraDentro(ctx, dir, line, u, y, room) {
  const e = 0.012;
  const bx = { n: [u - 0.11, y, line - e, u + 0.11, y + 1.3, line], s: [u - 0.11, y, line, u + 0.11, y + 1.3, line + e], w: [line - e, y, u - 0.11, line, y + 1.3, u + 0.11], e: [line, y, u - 0.11, line + e, y + 1.3, u + 0.11] }[dir];
  ctx.wb.box('black', ...bx, { faces: dir, ao: false, grime: false, room });
}

// Los tramos de a0 a a1 sin los huecos ([[u0, u1], ...]).
export function tramos(a0, a1, huecos = []) {
  const out = [];
  let cur = a0;
  for (const [u0, u1] of [...huecos].sort((p, q) => p[0] - q[0])) {
    if (u1 <= cur || u0 >= a1) continue;
    if (u0 > cur + 0.01) out.push([cur, Math.min(u0, a1)]);
    cur = Math.max(cur, u1);
  }
  if (a1 > cur + 0.01) out.push([cur, a1]);
  return out;
}

// La línea de un tejado a dos aguas (el de solidGableRoof) sobre la cara de
// un muro que corre a lo ancho de él: uc, la cumbrera; half, de ella al
// alero; yE e yR, lo alto del tejado en el alero y en la cumbrera; th, su
// grueso. y(u): por encima de las tejas; yb(u): la cara de abajo.
export function lineaTejado(uc, half, yE, yR, th = 0.2) {
  const slope = (yR - yE) / half;
  const tv = th * Math.sqrt(1 + slope * slope);
  return { uc, half, slope, tv, yE, yR, y: (u) => yR - Math.abs(u - uc) * slope, yb: (u) => yR - tv - Math.abs(u - uc) * slope };
}

// La cara de un muro (en el plano dir, line; de a0 a a1) bajo un tejado: de y0
// hasta la cara de abajo del tejado (lo de dentro, con su sala); o, con
// o.sobre, de lo alto del tejado hasta y0 (lo de fuera: el muro de una torre
// que asoma por encima).
export function caraTejado(ctx, mat, dir, line, a0, a1, y0, T, o = {}) {
  const F = plano(dir, line);
  const cuts = [a0];
  if (T.uc > a0 + 0.01 && T.uc < a1 - 0.01) cuts.push(T.uc);
  cuts.push(a1);
  const off = o.off ?? 0;
  const lineY = o.sobre ? T.y : T.yb;
  for (let i = 0; i + 1 < cuts.length; i++) {
    const ua = cuts[i],
      ub = cuts[i + 1];
    const ya = lineY(ua),
      yb = lineY(ub);
    const pts = o.sobre ? [F.Pt(ua, ya, off), F.Pt(ub, yb, off), F.Pt(ub, y0, off), F.Pt(ua, y0, off)] : [F.Pt(ua, y0, off), F.Pt(ub, y0, off), F.Pt(ub, yb, off), F.Pt(ua, ya, off)];
    cara(ctx.wb, mat, pts[0], pts[1], pts[2], pts[3], F.N, { sub: o.sub ?? 2, aoH: o.aoH ?? 1.6, baseY: o.baseY ?? y0, room: o.room ?? null, tint: o.tint, ao: o.ao });
  }
}

// El zócalo pintado (el cortinaje de almagre de la textura 'zocalo') en una
// cara que mira a dir, de a0 a a1 y de y0 a y0 + h, a un dedo del muro; sin
// él en los huecos ([[u0, u1]]: las puertas, el hogar).
export function zocalo(ctx, dir, line, a0, a1, y0, h, room, huecos = [], o = {}) {
  const F = plano(dir, line);
  const s = 1 / h;
  for (const [u0, u1] of tramos(a0, a1, huecos)) ctx.wb.box(o.mat ?? 'zocalo', ...F.box(u0, y0, u1, y0 + h, -0.005, 0.03), { faces: asoma(dir), ao: false, room, uv: s, vo: -y0 * s, sub: 1.2, tint: o.tint });
}

// La armadura de madera de un tejado a dos aguas, por debajo (las medidas,
// las de su solidGableRoof): axis, la cumbrera; s0..s1, a lo largo de ella;
// T, la línea del tejado (lineaTejado); ui0..ui1, las caras de dentro de los
// muros de los aleros. Las soleras sobre los muros, los pares (cada paso; no
// en los tramos de skip: los arcos), la hilera, las correas (o.correas por
// faldón) y, si se piden, los tirantes pareados (o.tirantes: [s, ...]) sobre
// sus canes y los nudillos de cada par.
export function armadura(ctx, o) {
  const { axis, s0, s1, ui0, ui1, room } = o;
  const T = o.T;
  const uc = T.uc;
  const P = (s, y, u) => (axis === 'x' ? V(s, y, u) : V(u, y, s));
  const S = axis === 'x' ? V(1, 0, 0) : V(0, 0, 1);
  const U = axis === 'x' ? V(0, 0, 1) : V(1, 0, 0);
  const cos = 1 / Math.sqrt(1 + T.slope * T.slope);
  const tint = o.tint ?? [0.56, 0.46, 0.38];
  const skip = o.skip ?? [];
  const libre = (s) => skip.every(([a, b]) => s < a || s > b);
  const pw = o.parW ?? 0.12,
    pd = o.parD ?? 0.15;
  const off = pd / 2 / cos;
  const paso = o.paso ?? 0.62;
  const yTop = T.yb(uc);
  // los pares, de las soleras a la hilera, y sus nudillos
  const nud = o.nudillo;
  for (let s = s0 + paso / 2; s < s1 - 0.1; s += paso) {
    if (!libre(s)) continue;
    for (const ue of [ui0, ui1]) beam(ctx, 'timber', P(s, T.yb(ue) - off, ue), P(s, yTop - off, uc), pw, { d: pd, side: S, room, tint });
    if (nud) {
      const yn = yTop - nud * (Math.min(uc - ui0, ui1 - uc) * T.slope);
      const d = (yTop - yn) / T.slope;
      beam(ctx, 'timber', P(s, yn - off - 0.06, uc - d), P(s, yn - off - 0.06, uc + d), 0.1, { d: 0.12, side: S, room, tint: tint.map((v) => v * 0.92) });
    }
  }
  // la hilera y las correas
  const hd = o.hileraD ?? 0.28;
  beam(ctx, 'timber', P(s0, yTop - pd / cos - hd / 2 + 0.03, uc), P(s1, yTop - pd / cos - hd / 2 + 0.03, uc), 0.26, { d: hd, side: U, room, tint: tint.map((v) => v * 0.9) });
  const nc = o.correas ?? 0;
  const hw = Math.min(uc - ui0, ui1 - uc);
  for (let k = 1; k <= nc; k++)
    for (const sg of [-1, 1]) {
      const u = uc + (sg * hw * k) / (nc + 1);
      const y = T.yb(u) - pd / cos - 0.15;
      beam(ctx, 'timber', P(s0, y, u), P(s1, y, u), 0.22, { d: 0.28, side: U, room, tint: tint.map((v) => v * 0.88) });
    }
  // las soleras, sobre lo alto de los muros
  for (const ue of [ui0, ui1]) {
    const y = T.yb(ue) - pd / cos - 0.1;
    const uu = ue + (ue < uc ? 0.12 : -0.12);
    beam(ctx, 'timber', P(s0, y, uu), P(s1, y, uu), 0.24, { d: 0.2, side: U, room, tint: tint.map((v) => v * 0.85) });
  }
  // los tirantes pareados, con sus canes
  for (const st of o.tirantes ?? []) {
    const y = Math.min(T.yb(ui0), T.yb(ui1)) - pd / cos - 0.36;
    for (const ds of [-0.24, 0.24]) beam(ctx, 'timber', P(st + ds, y, ui0), P(st + ds, y, ui1), 0.18, { d: 0.24, side: S, room, tint: tint.map((v) => v * 0.94) });
    for (const ue of [ui0, ui1]) {
      const sg = ue < uc ? 1 : -1;
      for (let k = 0; k < 3; k++) {
        const L = 0.25 + k * 0.22;
        const a = P(st, y - 0.12 - 0.17 * (2 - k), ue),
          b = P(st, y - 0.12 - 0.17 * (2 - k), ue + sg * L);
        beam(ctx, 'wooddark', a, b, 0.17, { d: 0.17, side: S, room, tint: tint.map((v) => v * 0.8) });
      }
    }
  }
}

// Escalera de tablas (sin macizo debajo: cada peldaño, su tabla y su tabica),
// con sus zancas y su pasamanos del lado de fuera (side: 1, a la derecha de
// quien sube; -1, a la izquierda; 0, sin él): sube hacia dir desde (x, y, z),
// n peldaños de rise y run, de ancho w.
export function escaleraTablas(ctx, x, y, z, dir, w, n, rise, run, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  const D = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[dir];
  const R = [-D[1], D[0]]; // a la derecha de quien sube
  const at = (a, r, yy) => V(x + D[0] * a + R[0] * r, yy, z + D[1] * a + R[1] * r);
  const tint = o.tint ?? [0.66, 0.56, 0.46];
  for (let i = 0; i < n; i++) {
    const top = y + rise * (i + 1);
    const a0 = run * i,
      a1 = run * (i + 1) + 0.03;
    const p0 = at(a0, -w / 2, 0),
      p1 = at(a1, w / 2, 0);
    const bx = [Math.min(p0.x, p1.x), top - 0.07, Math.min(p0.z, p1.z), Math.max(p0.x, p1.x), top, Math.max(p0.z, p1.z)];
    wb.box('planks', ...bx, { ao: false, faces: 'tnsewb', room, tint: tint.map((v) => v * (i % 2 ? 0.95 : 1.02)), sub: 3 });
    // (la tabica: la cara del peldaño de abajo a arriba)
    const q0 = at(a0, -w / 2, 0),
      q1 = at(a0 + 0.03, w / 2, 0);
    wb.box('wooddark', Math.min(q0.x, q1.x), top - rise, Math.min(q0.z, q1.z), Math.max(q0.x, q1.x), top - 0.07, Math.max(q0.z, q1.z), { ao: false, faces: 'nsewb', room, tint: [0.5, 0.44, 0.38] });
    ctx.col.add(bx[0], top - rise - 0.02, bx[2], bx[3], top, bx[5]);
  }
  // las zancas
  const L = n * run;
  for (const r of [-w / 2 - 0.04, w / 2 + 0.04]) beam(ctx, 'wooddark', at(0, r, y - 0.05), at(L, r, y + n * rise - 0.05), 0.08, { d: 0.26, side: V(R[0], 0, R[1]), room, tint: [0.5, 0.42, 0.36] });
  // el pasamanos, sobre sus balaustres (desde el peldaño o.desde: por los
  // de abajo se sube también de lado)
  if (o.side) {
    const r = (o.side * w) / 2 + o.side * 0.06;
    const k0 = o.desde ?? 0;
    const a0 = Math.max(0.1, k0 * run);
    beam(ctx, 'wooddark', at(a0, r, y + k0 * rise + 0.95), at(L, r, y + n * rise + 0.95), 0.07, { d: 0.08, room });
    for (let i = Math.max(1, k0); i < n; i += o.cada ?? 3) {
      const p = at(i * run + run / 2, r, 0);
      wb.box('wooddark', p.x - 0.03, y + (i + 1) * rise, p.z - 0.03, p.x + 0.03, y + (i + 1) * rise + 0.95, p.z + 0.03, { ao: false, room });
    }
    const pa = at(a0, r, 0),
      pb = at(L, r, 0);
    ctx.col.add(Math.min(pa.x, pb.x) - 0.04, y + k0 * rise, Math.min(pa.z, pb.z) - 0.04, Math.max(pa.x, pb.x) + 0.04, y + n * rise + 1.1, Math.max(pa.z, pb.z) + 0.04);
  }
}

// Una pierna de cerdo, una ristra de chorizos, un manojo de hierbas: lo que
// cuelga de una vara en el secadero de la cocina.
export function colgado(ctx, x, y, z, k, room, rng) {
  const wb = ctx.wb;
  if (k === 0) {
    // el jamón: la pata, la caña y la cuerda
    wb.box('rope', x - 0.01, y - 0.18, z - 0.01, x + 0.01, y, z + 0.01, { ao: false, room });
    wb.cylinder('hide', x, y - 0.42, z, 0.04, 0.035, 0.24, 6, { ao: false, room, tint: [0.62, 0.44, 0.34], capTop: true });
    wb.cylinder('hide', x, y - 0.98, z, 0.17, 0.05, 0.56, 8, { ao: false, room, tint: [0.66, 0.36, 0.26], capTop: true, capBot: true });
  } else if (k === 1) {
    // la ristra de chorizos, en curva
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const px = x + (t - 0.5) * 0.36,
        py = y - 0.1 - Math.sin(t * Math.PI) * 0.34;
      wb.cylinder('hide', px, py - 0.08, z, 0.035, 0.035, 0.16, 6, { ao: false, room, tint: [0.5, 0.16, 0.12], capTop: true, capBot: true });
    }
    wb.box('rope', x - 0.2, y - 0.03, z - 0.01, x + 0.2, y, z + 0.01, { ao: false, room });
  } else {
    // el manojo de hierbas, cabeza abajo
    wb.box('rope', x - 0.01, y - 0.12, z - 0.01, x + 0.01, y, z + 0.01, { ao: false, room });
    for (let i = 0; i < 6; i++) palo(wb, V(x, y - 0.12, z), V(x + rng.range(-0.12, 0.12), y - rng.range(0.4, 0.55), z + rng.range(-0.12, 0.12)), 0.012, 'leaves', { room, tint: [0.5, 0.5, 0.32] });
  }
}

// Una capa pintada (el despiece fingido, el enlucido) a un dedo de la cara de
// un muro que mira a dir: de a0 a a1 y de y0 a y1, sin los huecos ([u0, y0,
// u1, y1]: las puertas y las ventanas).
export function enlucido(ctx, mat, dir, line, a0, a1, y0, y1, huecos, room, o = {}) {
  const F = plano(dir, line);
  // (en el plano: u a lo largo, y de alto, como rectángulos de subtractRects)
  for (const [u0, v0, u1, v1] of subtractRects([a0, y0, a1, y1], huecos ?? [])) {
    if (u1 - u0 < 0.02 || v1 - v0 < 0.02) continue;
    ctx.wb.box(mat, ...F.box(u0, v0, u1, v1, -0.004, o.off ?? 0.03), { faces: asoma(dir), ao: o.ao ?? true, aoH: 1.4, baseY: o.baseY ?? y0, room, sub: o.sub ?? 1.6, tint: o.tint });
  }
}
