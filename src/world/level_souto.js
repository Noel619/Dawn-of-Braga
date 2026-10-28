// La Casa tapiada, el pasadizo del Soto y la casa del tonelero.
//
// La casa tapiada es la de Joana, la herbolera: abajo, la tienda (el
// mostrador bajo la ventana, los albarelos, los manojos de hierbas colgados
// de las vigas), la escalera que sube al sobrado y, detrás, la cocina; arriba,
// la sala, que da al pasadizo, y la alcoba de la madre y de Inés, la hija.
// La madre clavó la puerta y se fue a buscar a su hijo a la muralla; la hija
// sigue arriba, de pie en la ventana. Las ventanas de abajo están cegadas con
// tablones clavados de prisa: entre tabla y tabla se ve la tienda encendida.
//
// El pasadizo cruza la calle por encima y une la casa con la de enfrente, la
// de Miguel, el hijo, que es tonelero. Miguel arrancó a hachazos las tablas y
// las vigas del suelo del pasadizo para no cruzar; con un tablón (el que
// sobra de las ventanas de Henrique) se tiende un paso y se cruza haciendo
// equilibrio. En la casa de enfrente, abajo, la tonelería (su puerta de la
// calle, atrancada por dentro: un atajo de vuelta); arriba, la sala y la
// alcoba, donde está él, en un rincón. El guion: game/souto.js.
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { house, stairs, subtractRects } from './builders.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const M4 = () => new THREE.Matrix4();
const ROT = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };

// la planta baja llega hasta G1; el suelo del sobrado (y el del pasadizo),
// a FY
const G1 = 3.6;
const FY = 3.8;

// la casa tapiada (CT) y la del tonelero (MH): huella, grueso del muro,
// alero y techo del sobrado; dentro (CI, MI), la sala sin los muros
const CT = { x0: -33, z0: -12.5, x1: -26.5, z1: -3.5, t: 0.35, h: 6.8, ceil: 6.62, tint: [1.02, 0.94, 0.8] };
const CI = { x0: CT.x0 + CT.t, z0: CT.z0 + CT.t, x1: CT.x1 - CT.t, z1: CT.z1 - CT.t };
const MH = { x0: -32.5, z0: 3.5, x1: -23, z1: 12.5, t: 0.35, h: 7.2, ceil: 7.0 };
const MI = { x0: MH.x0 + MH.t, z0: MH.z0 + MH.t, x1: MH.x1 - MH.t, z1: MH.z1 - MH.t };
// el pasadizo: entre los dos muros de entramado (grueso t) y, en medio, el
// hueco donde no queda suelo (de z h0 a h1)
const PZ = { x0: -31.4, x1: -28, z0: -3.5, z1: 3.5, t: 0.15, y1: 6.7, ceil: 6.42, h0: -1.25, h1: 1.25, tint: [0.96, 0.96, 0.9] };
// la escalera de cada casa (sube hacia el norte, pegada al muro del este) y
// el hueco que deja en el suelo del sobrado (por abajo llega más allá del
// peldaño donde la cabeza ya pasa del forjado: al bajar, el cuerpo va por
// delante de los pies)
const STEPS = 11;
const RISE = FY / STEPS;
const RUN = 0.3;
const CT_STAIR = { x: -27.4, w: 1.1, z: -4.9 };
const CT_HOLE = [-28.05, CT_STAIR.z - STEPS * RUN, CI.x1, -5.4];
const MH_STAIR = { x: -23.9, w: 1.1, z: 9.6 };
const MH_HOLE = [-24.55, MH_STAIR.z - STEPS * RUN, MI.x1, 8.9];
// la puerta de cada casa al pasadizo (en medio del pasadizo)
const PDOOR = { x: -29.7, w: 1.0, h: 2.2 };

// Lo que necesita el guion (game/souto.js).
export const SOUTO = {
  FY,
  ct: CT,
  mh: MH,
  pz: PZ,
  // el tablón tendido sobre el hueco: su eje (x), de punta a punta, y el
  // grueso que se pisa
  plank: { x: PZ.x0 + (PZ.x1 - PZ.x0) / 2, z0: PZ.h0 - 0.32, z1: PZ.h1 + 0.32, w: 0.3, th: 0.06 },
  // dónde se hace equilibrio: sobre el hueco (y un palmo a cada lado)
  balance: { z0: PZ.h0 - 0.1, z1: PZ.h1 + 0.1 },
  // Miguel, en el rincón del suroeste de su alcoba, de cara a la esquina
  miguel: { x: MI.x0 + 0.62, y: FY, z: MI.z1 - 0.6, yaw: -Math.PI / 4 },
  // dónde se ahorca: la viga de la alcoba (su cara de abajo) y el punto
  // del que cuelga
  hang: { x: -28.9, z: 10.45, beamY: MH.ceil - 0.22 },
  // la casa de Miguel y sus dos plantas, para saber si estás dentro
  mhBox: [MH.x0, MH.z0, MH.x1, MH.z1],
};

// ------------------------------------------------------------ piezas
// Muro con huecos a lo largo de 'x' (de a0 a a1, con el grueso de z t0 a t1)
// o de 'z' (grueso en x), de y0 a y1. out: la cara de fuera ('n','s','e','w');
// la de dentro, la contraria, de la sala 'room'. Los huecos (puertas y
// ventanas: { a0, a1, y0, y1 }) llevan sus jambas, alféizar y dintel por
// dentro del grueso (de la sala: los ilumina su luz). outRoom: la luz de la
// cara de fuera ('out' por defecto; dentro del pasadizo, la suya). bottom:
// también la cara de abajo (un muro que vuela sobre la calle).
export function holedWall(ctx, o) {
  const wb = ctx.wb;
  const { axis, a0, a1, t0, t1, y0, y1, out, room } = o;
  const inF = { n: 's', s: 'n', e: 'w', w: 'e' }[out];
  const lo = axis === 'x' ? 'w' : 'n',
    hi = axis === 'x' ? 'e' : 's';
  const hs = [...(o.holes ?? [])].sort((p, q) => p.a0 - q.a0);
  const piece = (u0, v0, u1, v1, ends) => {
    if (u1 - u0 < 0.001 || v1 - v0 < 0.001) return;
    const b = axis === 'x' ? [u0, v0, t0, u1, v1, t1] : [t0, v0, u0, t1, v1, u1];
    if (o.outer !== false) wb.box(o.mat, ...b, { faces: out + (o.bottom && v0 === y0 ? 'b' : ''), room: o.outRoom ?? 'out', tint: o.tint, sub: 1.6, ao: false });
    wb.box(o.matIn ?? o.mat, ...b, { faces: inF, room, tint: o.tintIn ?? o.tint, sub: 1.6, aoH: 1.2, baseY: o.floorY ?? y0 });
    if (ends) wb.box(o.matIn ?? o.mat, ...b, { faces: ends, room, tint: o.tintIn ?? o.tint, sub: 1.6, ao: false });
    if (o.collide !== false) ctx.col.add(...b);
  };
  let cur = a0;
  for (let k = 0; k <= hs.length; k++) {
    const h = hs[k];
    piece(cur, y0, h ? h.a0 : a1, y1, (k > 0 ? lo : '') + (h ? hi : ''));
    if (!h) break;
    piece(h.a0, y0, h.a1, h.y0, 't');
    piece(h.a0, h.y1, h.a1, y1, 'b');
    cur = h.a1;
  }
}

// Cara de dentro de un muro liso del sobrado (la de fuera la pone la casa)
// y su colisión. side: el muro ('n','s','e','w') de la sala R.
function innerWall(ctx, R, side, y0, y1, room, tint, outer) {
  const wb = ctx.wb;
  const f = { n: 's', s: 'n', e: 'w', w: 'e' }[side];
  const b =
    side === 'n' ? [R.x0, y0, R.z0 - 0.02, R.x1, y1, R.z0] : side === 's' ? [R.x0, y0, R.z1, R.x1, y1, R.z1 + 0.02] : side === 'w' ? [R.x0 - 0.02, y0, R.z0, R.x0, y1, R.z1] : [R.x1, y0, R.z0, R.x1 + 0.02, y1, R.z1];
  wb.box('plaster', ...b, { faces: f, room, tint, sub: 1.6, aoH: 1.2, baseY: y0 });
  // colisión: de la cara de dentro a la de fuera
  const [x0, z0, x1, z1] = outer;
  if (side === 'n') ctx.col.add(x0, G1, z0, x1, y1 + 0.3, R.z0);
  if (side === 's') ctx.col.add(x0, G1, R.z1, x1, y1 + 0.3, z1);
  if (side === 'w') ctx.col.add(x0, G1, z0, R.x0, y1 + 0.3, z1);
  if (side === 'e') ctx.col.add(R.x1, G1, z0, x1, y1 + 0.3, z1);
}

// Forjado de tablas (suelo de arriba, techo de abajo) con huecos, su canto
// en los huecos y su colisión.
function slab(ctx, R, holes, room, under) {
  const wb = ctx.wb;
  for (const r of subtractRects([R.x0, R.z0, R.x1, R.z1], holes)) {
    wb.box('planks', r[0], FY - 0.2, r[1], r[2], FY, r[3], { faces: 't', room, ao: false, uv: 0.5, tint: [0.86, 0.8, 0.72] });
    wb.box('wooddark', r[0], G1, r[1], r[2], G1 + 0.04, r[3], { faces: 'b', room: under, ao: false, tint: [0.62, 0.56, 0.5] });
    ctx.col.add(r[0], G1, r[1], r[2], FY, r[3]).cam = true;
  }
  // el canto del forjado en cada hueco (se ve desde la escalera)
  for (const [a, b, c, d] of holes) {
    const o = { ao: false, room: under, tint: [0.55, 0.5, 0.45] };
    if (b > R.z0) wb.box('wooddark', a, G1, b - 0.01, c, FY, b, { ...o, faces: 's' });
    if (d < R.z1) wb.box('wooddark', a, G1, d, c, FY, d + 0.01, { ...o, faces: 'n' });
    if (a > R.x0) wb.box('wooddark', a - 0.01, G1, b, a, FY, d, { ...o, faces: 'e' });
    if (c < R.x1) wb.box('wooddark', c, G1, b, c + 0.01, FY, d, { ...o, faces: 'w' });
  }
}

// Vigas del techo de la planta baja (bajo el forjado), a lo largo de x en
// cada z de 'zs'; las que dan con el hueco de la escalera se quedan en el
// brochal. Y la cámara, por debajo de las vigas (menos en el hueco).
function joists(ctx, R, zs, hole, room) {
  const wb = ctx.wb;
  const [hx0, hz0, , hz1] = hole;
  for (const z of zs) {
    const cut = z > hz0 - 0.1 && z < hz1 + 0.1;
    wb.box('timber', R.x0, G1 - 0.22, z - 0.1, cut ? hx0 - 0.1 : R.x1, G1, z + 0.1, { ao: false, room, faces: 'nsewb' });
  }
  // brochal y cabezales alrededor del hueco
  wb.box('timber', hx0 - 0.1, G1 - 0.22, hz0, hx0, G1, hz1, { ao: false, room, faces: 'nsewb' });
  wb.box('timber', hx0, G1 - 0.22, hz1, hole[2], G1, hz1 + 0.1, { ao: false, room, faces: 'nsewb' });
  wb.box('timber', hx0, G1 - 0.22, hz0 - 0.1, hole[2], G1, hz0, { ao: false, room, faces: 'nsewb' });
  for (const r of subtractRects([R.x0, R.z0, R.x1, R.z1], [[hx0 - 0.1, hz0 - 0.05, hole[2], hz1 + 0.15]])) ctx.col.addCam(r[0], G1 - 0.27, r[1], r[2], G1, r[3]);
}

// Techo del sobrado con sus vigas (a lo largo de x), el muro hasta el alero
// y la colisión de lo que queda encima (la cámara no sube al tejado).
function ceiling(ctx, R, y, top, zs, room) {
  const wb = ctx.wb;
  wb.box('wooddark', R.x0, y, R.z0, R.x1, y + 0.05, R.z1, { faces: 'b', room, ao: false, tint: [0.6, 0.54, 0.48] });
  for (const z of zs) wb.box('timber', R.x0, y - 0.22, z - 0.1, R.x1, y, z + 0.1, { ao: false, room, faces: 'nsewb' });
  ctx.col.add(R.x0, y, R.z0, R.x1, top + 0.2, R.z1).cam = true;
  ctx.col.addCam(R.x0, y - 0.27, R.z0, R.x1, y, R.z1);
}

// Tabique del sobrado (de y0 a y1) con pasos: como partition() de la planta
// baja, pero a otra altura.
function partitionUp(ctx, iw, y0, y1, room, tint) {
  const wb = ctx.wb;
  const alongX = iw.x1 - iw.x0 >= iw.z1 - iw.z0;
  const a0 = alongX ? iw.x0 : iw.z0,
    a1 = alongX ? iw.x1 : iw.z1;
  const piece = (u0, u1, yb, yt) => {
    if (u1 - u0 < 0.01) return;
    const b = alongX ? [u0, yb, iw.z0, u1, yt, iw.z1] : [iw.x0, yb, u0, iw.x1, yt, u1];
    wb.box('plaster', ...b, { sub: 1.6, tint, aoH: 1.2, room, faces: 'nsew' + (yb > y0 ? 'b' : ''), baseY: y0 });
    ctx.col.add(...b);
  };
  let cur = a0;
  for (const d of [...(iw.doors ?? [])].sort((p, q) => p.at - q.at)) {
    const a = d.at - d.w / 2,
      b = d.at + d.w / 2;
    piece(cur, a, y0, y1);
    piece(a, b, y0 + d.h, y1);
    const fr = (u0, u1, yb, yt) => {
      const bb = alongX ? [u0, yb, iw.z0 - 0.04, u1, yt, iw.z1 + 0.04] : [iw.x0 - 0.04, yb, u0, iw.x1 + 0.04, yt, u1];
      wb.box('wooddark', ...bb, { ao: false, room, faces: yb > y0 ? 'tnsewb' : 'tnsew' });
    };
    // (el marco, un centímetro por dentro del paso: si casi coincide con el
    // canto del tabique, parpadea)
    fr(a - 0.1, a + 0.012, y0, y0 + d.h - 0.012);
    fr(b - 0.012, b + 0.1, y0, y0 + d.h - 0.012);
    fr(a - 0.1, b + 0.1, y0 + d.h - 0.012, y0 + d.h + 0.12);
    cur = b;
  }
  piece(cur, a1, y0, y1);
}

// Barandilla de madera (pasamanos, balaústres y su colisión) de (x0,z0) a
// (x1,z1), a lo largo de x o de z.
export function railing(ctx, x0, z0, x1, z1, y, room) {
  const wb = ctx.wb;
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
  const L = alongX ? x1 - x0 : z1 - z0;
  const H = 0.95;
  const at = (u, f) => (alongX ? f(x0 + u, z0) : f(x0, z0 + u));
  const n = Math.max(2, Math.round(L / 0.32));
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * L;
    const big = i === 0 || i === n;
    const s = big ? 0.06 : 0.025;
    at(u, (x, z) => wb.box('wooddark', x - s, y, z - s, x + s, y + H - 0.06, z + s, { ao: false, room }));
  }
  const r = 0.045;
  if (alongX) wb.box('wooddark', x0 - 0.06, y + H - 0.07, z0 - r, x1 + 0.06, y + H, z0 + r, { ao: false, room, faces: 'tnsewb' });
  else wb.box('wooddark', x0 - r, y + H - 0.07, z0 - 0.06, x0 + r, y + H, z1 + 0.06, { ao: false, room, faces: 'tnsewb' });
  if (alongX) wb.box('wooddark', x0, y + 0.1, z0 - 0.03, x1, y + 0.16, z0 + 0.03, { ao: false, room });
  else wb.box('wooddark', x0 - 0.03, y + 0.1, z0, x0 + 0.03, y + 0.16, z1, { ao: false, room });
  if (alongX) ctx.col.add(x0 - 0.05, y, z0 - 0.06, x1 + 0.05, y + H, z0 + 0.06).noSight = true;
  else ctx.col.add(x0 - 0.06, y, z0 - 0.05, x0 + 0.06, y + H, z1 + 0.05).noSight = true;
}

// Escalera de madera: los peldaños macizos (escalera cerrada), una zanca
// por el lado abierto y el pasamanos (hasta railEnd: arriba se sale por ese
// lado).
function woodStair(ctx, S, room, railEnd) {
  const wb = ctx.wb;
  stairs(ctx, S.x, 0, S.z, 'n', S.w, STEPS, RISE, RUN, 'wooddark', { solidBelow: true });
  const xw = S.x - S.w / 2;
  const len = Math.hypot(STEPS * RUN, FY);
  const ang = Math.atan2(FY, STEPS * RUN);
  // la zanca: un tablón inclinado por fuera de los peldaños
  wb.push();
  wb.translate(xw - 0.03, FY / 2 - 0.1, S.z - (STEPS * RUN) / 2);
  wb.rotateX(ang);
  wb.box('timber', -0.03, -0.16, -len / 2, 0.03, 0.16, len / 2, { ao: false, room });
  wb.pop();
  // el pasamanos, del poste de abajo hasta railEnd
  const x = xw - 0.06;
  const za = S.z - RUN,
    zb = railEnd;
  const ya = RISE + 0.9,
    yb = ((S.z - zb) / RUN) * RISE + 0.9;
  wb.box('wooddark', x - 0.04, 0, za - 0.04, x + 0.04, ya + 0.05, za + 0.04, { ao: false, room });
  const rl = Math.hypot(za - zb, yb - ya);
  wb.push();
  wb.translate(x, (ya + yb) / 2, (za + zb) / 2);
  wb.rotateX(Math.atan2(yb - ya, za - zb));
  wb.box('wooddark', -0.035, -0.035, -rl / 2, 0.035, 0.035, rl / 2, { ao: false, room });
  wb.pop();
  wb.box('wooddark', x - 0.04, ((S.z - zb) / RUN - 1) * RISE, zb - 0.04, x + 0.04, yb + 0.05, zb + 0.04, { ao: false, room });
  ctx.col.add(x - 0.05, 0, zb, x + 0.05, yb, za + 0.05).noSight = true;
}

// Marco de madera de una ventana o puerta, por fuera (y su alféizar) y, si
// se le da la sala, el cerco por dentro. side: la fachada; (x, z): el centro
// del hueco en la cara de fuera; y0, y1: alféizar y dintel; t: grueso.
export function frame(ctx, side, x, z, w, y0, y1, t, o = {}) {
  const wb = ctx.wb;
  const hw = w / 2;
  const mat = o.mat ?? 'timber';
  wb.at(x, 0, z, ROT[side], () => {
    const fo = { ao: false, sub: 3, room: o.outRoom ?? 'out' };
    wb.box(mat, -hw - 0.11, y0 - 0.02, 0, -hw, y1 + 0.02, 0.07, fo);
    wb.box(mat, hw, y0 - 0.02, 0, hw + 0.11, y1 + 0.02, 0.07, fo);
    wb.box(mat, -hw - 0.15, y1, 0, hw + 0.15, y1 + 0.13, 0.09, { ...fo, faces: 'tsewb' });
    // (lo que toca las caras del hueco, a un centímetro de ellas: si
    // coincidieran, o casi, parpadearían)
    const e = 0.012;
    if (o.sill !== false) wb.box(o.sillMat ?? mat, -hw - 0.12, y0 - 0.08, -0.02, hw + 0.12, y0 + e, 0.12, { ...fo, faces: 'tsewb' });
    if (o.room) {
      const fi = { ao: false, sub: 3, room: o.room };
      wb.box('wooddark', -hw - 0.09, y0, -t - 0.012, -hw - e, y1, -t + 0.03, { ...fi, faces: 'nwe' });
      wb.box('wooddark', hw + e, y0, -t - 0.012, hw + 0.09, y1, -t + 0.03, { ...fi, faces: 'nwe' });
      wb.box('wooddark', -hw - 0.09, y1 + e, -t - 0.012, hw + 0.09, y1 + 0.09, -t + 0.03, { ...fi, faces: 'nweb' });
      if (o.innerSill !== false) wb.box('wooddark', -hw - 0.09, y0 - 0.05, -t - 0.06, hw + 0.09, y0 + e, -t + 0.02, { ...fi, faces: 'tnweb' });
    }
  });
}

// Tablones clavados de prisa sobre una ventana (por fuera), con rendijas
// entre uno y otro por las que se ve la sala.
export function boardUp(ctx, side, x, z, w, ys, seed) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  wb.at(x, 0, z, ROT[side], () => {
    for (const y of ys) {
      const L = w + 0.38 + rng.range(-0.04, 0.12);
      const dx = rng.range(-0.06, 0.06);
      wb.push();
      wb.translate(dx, y, 0.1);
      wb.rotateZ(rng.range(-0.09, 0.09));
      wb.box(rng.chance(0.3) ? 'wooddark' : 'planks', -L / 2, -0.08, -0.022, L / 2, 0.08, 0.022, { ao: false, sub: 3, tint: [0.92, 0.86, 0.8] });
      for (const s of [-1, 1]) wb.box('iron', s * (L / 2 - 0.08) - 0.012, -0.012, 0.02, s * (L / 2 - 0.08) + 0.012, 0.012, 0.035, { ao: false });
      wb.pop();
    }
  });
}

// Contraventana de tablas (una hoja) que gira en su gozne: hinge -1/+1 (el
// lado del hueco), ang (0 cerrada; abierta, hacia fuera), por fuera.
export function shutter(ctx, side, x, z, w, y0, y1, hinge, ang, o = {}) {
  const wb = ctx.wb;
  const lw = w / 2;
  wb.at(x, 0, z, ROT[side], () => {
    wb.push();
    wb.translate((hinge * w) / 2, y0, 0.085);
    wb.rotateY(-hinge * ang);
    if (o.droop) wb.rotateZ(hinge * o.droop);
    const a = hinge < 0 ? 0 : -lw,
      b = hinge < 0 ? lw : 0;
    wb.box('planks', a, 0, -0.025, b, y1 - y0, 0.025, { ao: false, sub: 3, tint: o.tint ?? [0.8, 0.72, 0.64] });
    for (const yy of [0.12, y1 - y0 - 0.18]) wb.box('iron', a + 0.03, yy, 0.025, b - 0.03, yy + 0.05, 0.04, { ao: false });
    wb.pop();
  });
}

// Ventana cerrada (no hay hueco): el negro, las dos hojas y el marco, por
// fuera; por dentro, si se le da la sala, las hojas cerradas en su cerco.
export function closedWindow(ctx, side, x, z, w, y0, y1, t, room, o = {}) {
  const wb = ctx.wb;
  wb.at(x, 0, z, ROT[side], () => {
    wb.box('black', -w / 2, y0, 0, w / 2, y1, 0.02, { ao: false, grime: false, faces: 's' });
    wb.box('planks', -w / 2, y0, 0.02, w / 2, y1, 0.07, { ao: false, sub: 3, tint: [0.78, 0.7, 0.62] });
    wb.box('iron', -w / 2 + 0.04, y0 + 0.14, 0.07, w / 2 - 0.04, y0 + 0.19, 0.085, { ao: false });
    wb.box('iron', -w / 2 + 0.04, y1 - 0.2, 0.07, w / 2 - 0.04, y1 - 0.15, 0.085, { ao: false });
    if (room) {
      const fi = { ao: false, room };
      wb.box('wooddark', -w / 2 - 0.08, y0 - 0.06, -t - 0.012, w / 2 + 0.08, y1 + 0.08, -t, { ...fi, faces: 'n' });
      wb.box('planks', -w / 2, y0, -t - 0.05, w / 2, y1, -t - 0.012, { ...fi, faces: 'nwetb', tint: [0.6, 0.54, 0.48] });
      wb.box('wooddark', -0.03, y0 + (y1 - y0) / 2 - 0.12, -t - 0.08, 0.03, y0 + (y1 - y0) / 2 + 0.12, -t - 0.05, fi);
    }
  });
  if (o.col) ctx.col.add(...o.col);
}

// Un manojo de hierbas colgado de una viga (boca abajo, atado con bramante).
const HERBS = [
  [0.42, 0.52, 0.32],
  [0.5, 0.44, 0.58],
  [0.6, 0.48, 0.3],
  [0.36, 0.46, 0.3],
  [0.62, 0.58, 0.36],
];
export function herbBunch(ctx, x, yTop, z, seed, room, len = 0.3) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const tint = rng.pick(HERBS);
  wb.box('burlap', x - 0.006, yTop - len, z - 0.006, x + 0.006, yTop, z + 0.006, { ao: false, room });
  const y = yTop - len;
  wb.box('burlap', x - 0.025, y - 0.05, z - 0.025, x + 0.025, y, z + 0.025, { ao: false, room, tint: [0.7, 0.6, 0.5] });
  const n = rng.int(6, 9);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const tilt = rng.range(0.12, 0.38);
    const L = rng.range(0.26, 0.42);
    wb.push();
    wb.translate(x, y - 0.03, z);
    wb.rotateY(a);
    wb.rotateX(Math.PI - tilt);
    wb.box('straw', -0.008, 0, -0.008, 0.008, L, 0.008, { ao: false, room, tint: tint.map((v) => v * 0.8), grime: false });
    wb.box('leaves', -0.04, L * 0.45, -0.012, 0.04, L, 0.012, { ao: false, room, tint, grime: false });
    wb.pop();
  }
}

// Albarelo de botica: el bote de loza (blanco y azul, o verde), con su tapa.
function albarelo(ctx, x, y, z, s, seed, room) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const kind = rng.next();
  const body = kind < 0.55 ? [0.92, 0.92, 0.86] : kind < 0.8 ? [0.5, 0.62, 0.4] : [0.72, 0.5, 0.34];
  const r = 0.06 * s,
    h = 0.19 * s;
  wb.cylinder('plaster', x, y, z, r, r, h, 7, { ao: false, capTop: true, room, tint: body, grime: false });
  if (kind < 0.55) wb.cylinder('plaster', x, y + h * 0.35, z, r * 1.02, r * 1.02, h * 0.3, 7, { ao: false, room, tint: [0.3, 0.38, 0.75], grime: false });
  wb.cylinder('plaster', x, y + h, z, r * 0.78, r * 0.6, 0.035 * s, 7, { ao: false, capTop: true, room, tint: body.map((v) => v * 0.85), grime: false });
}

// Estante de botica (contra un muro): costados, baldas y, en ellas,
// albarelos y frascos. rot: hacia dónde mira (como shelf()).
function apothecaryShelf(ctx, x, y, z, rot, w, seed, room) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  wb.at(x, y, z, rot, () => {
    for (const sx of [-w / 2, w / 2 - 0.06]) wb.box('wooddark', sx, 0, -0.18, sx + 0.06, 2.1, 0.18, { ao: false, room });
    for (let i = 0; i < 5; i++) wb.box('wooddark', -w / 2 + 0.06, 0.25 + i * 0.44, -0.17, w / 2 - 0.06, 0.29 + i * 0.44, 0.17, { ao: false, room, faces: 'tnsewb' });
    wb.box('planks', -w / 2 + 0.06, 0, -0.18, w / 2 - 0.06, 2.1, -0.16, { ao: false, room, faces: 's', tint: [0.6, 0.55, 0.5] });
  });
  // (los botes, en coordenadas del mundo: lo que hay en cada balda)
  const c = Math.cos(rot),
    s = Math.sin(rot);
  const W = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  for (let i = 0; i < 5; i++) {
    let u = -w / 2 + 0.16;
    while (u < w / 2 - 0.14) {
      const sc = rng.range(0.7, 1.25);
      if (rng.chance(0.82)) {
        const [px, pz] = W(u, rng.range(-0.05, 0.05));
        albarelo(ctx, px, y + 0.29 + i * 0.44, pz, sc, seed * 31 + i * 7 + Math.round(u * 50), room);
      }
      u += 0.13 * sc + rng.range(0.03, 0.08);
    }
  }
  P.colOBB(ctx, x, z, w / 2, 0.18, rot, y, y + 2.1);
}

// Mortero de piedra con su mano.
function mortar(ctx, x, y, z, room) {
  const wb = ctx.wb;
  wb.cylinder('wallstone', x, y, z, 0.11, 0.13, 0.13, 8, { ao: false, capTop: true, room, tint: [0.75, 0.72, 0.68] });
  wb.cylinder('black', x, y + 0.131, z, 0.09, 0.09, 0.004, 8, { ao: false, capTop: true, room, grime: false });
  wb.push();
  wb.translate(x + 0.03, y + 0.08, z);
  wb.rotateZ(-0.5);
  wb.cylinder('wooddark', 0, 0, 0, 0.022, 0.03, 0.26, 6, { ao: false, capTop: true, room });
  wb.pop();
}

// Balanza de botica: el astil, los platillos y su pie.
function scales(ctx, x, y, z, rot, room) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -0.08, 0, -0.06, 0.08, 0.03, 0.06, { ao: false, room });
    wb.box('bronze', -0.01, 0.03, -0.01, 0.01, 0.34, 0.01, { ao: false, room });
    wb.box('bronze', -0.2, 0.33, -0.006, 0.2, 0.345, 0.006, { ao: false, room });
    for (const s of [-1, 1]) {
      wb.box('bronze', s * 0.19 - 0.002, 0.12, -0.002, s * 0.19 + 0.002, 0.33, 0.002, { ao: false, room });
      wb.cylinder('bronze', s * 0.19, 0.1, 0, 0.07, 0.08, 0.02, 7, { ao: false, capTop: true, room });
    }
  });
}

// Cuenco de madera (con algo dentro: fill = [material, tinte]).
export function bowl(ctx, x, y, z, r, room, fill) {
  const wb = ctx.wb;
  wb.cylinder('wooddark', x, y, z, r * 0.6, r, r * 0.55, 8, { ao: false, capBot: true, room });
  if (fill) wb.cylinder(fill[0], x, y + r * 0.4, z, r * 0.92, r * 0.92, 0.01, 8, { ao: false, capTop: true, room, tint: fill[1], grime: false });
}

// Arca de madera con herrajes.
export function chest(ctx, x, y, z, rot, room, w = 1.1) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -w / 2, 0, -0.28, w / 2, 0.5, 0.28, { faces: 'tnsew', aoH: 0.5, room });
    wb.box('wooddark', -w / 2 - 0.02, 0.5, -0.3, w / 2 + 0.02, 0.58, 0.3, { ao: false, faces: 'tnsewb', room });
    for (const s of [-1, 1]) wb.box('iron', s * (w / 2 - 0.15) - 0.03, 0, -0.31, s * (w / 2 - 0.15) + 0.03, 0.6, 0.31, { ao: false, room });
    wb.box('iron', -0.05, 0.36, 0.3, 0.05, 0.48, 0.32, { ao: false, room });
  });
  P.colOBB(ctx, x, z, w / 2 + 0.02, 0.3, rot, y, y + 0.58);
}

// Tabla con una imagen pintada (un santo) y su repisa con velas.
export function saint(ctx, side, x, y, z, room, seed, cloth = 'clothBlue') {
  const wb = ctx.wb;
  wb.at(x, 0, z, ROT[side], () => {
    wb.box('wooddark', -0.32, y, 0, 0.32, y + 0.85, 0.05, { ao: false, room });
    wb.box('gold', -0.29, y + 0.03, 0.05, 0.29, y + 0.82, 0.062, { ao: false, room, faces: 's', tint: [0.6, 0.5, 0.3] });
    wb.box(cloth, -0.17, y + 0.08, 0.062, 0.17, y + 0.62, 0.074, { ao: false, room, faces: 's' });
    wb.box('skinPale', -0.06, y + 0.62, 0.062, 0.06, y + 0.76, 0.074, { ao: false, room, faces: 's' });
    wb.box('gold', -0.1, y + 0.75, 0.074, 0.1, y + 0.8, 0.086, { ao: false, room, faces: 's' });
    wb.box('wooddark', -0.25, y - 0.12, 0, 0.25, y - 0.08, 0.2, { ao: false, room, faces: 'tnsewb' });
  });
  const c = ROT[side];
  const px = x + Math.sin(c) * 0.12,
    pz = z + Math.cos(c) * 0.12;
  P.candles(ctx, px, y - 0.08, pz, 3, seed, { room, radius: 3.4, intensity: 0.75, spread: 0.12, scale: 0.6 });
}

// Tablas arrancadas, tiradas en la calle (partidas a hachazos).
function brokenBoards(ctx, pts, seed) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  for (const [x, z, n] of pts) {
    for (let i = 0; i < n; i++) {
      const L = rng.range(0.45, 1.1),
        w = rng.range(0.16, 0.24);
      wb.push();
      wb.translate(x + rng.range(-0.35, 0.35), 0.03 + i * 0.045, z + rng.range(-0.35, 0.35));
      wb.rotateY(rng.range(0, Math.PI));
      wb.rotateZ(rng.range(-0.06, 0.06));
      wb.box(rng.chance(0.6) ? 'planks' : 'wooddark', -L / 2, -0.022, -w / 2, L / 2, 0.022, w / 2, { ao: false, faces: 'tnsew', tint: [0.86, 0.8, 0.74] });
      // la punta astillada
      wb.box('planks', L / 2, -0.018, -w / 2 + 0.02, L / 2 + rng.range(0.06, 0.14), 0.018, -w / 2 + 0.06, { ao: false, tint: [0.95, 0.88, 0.78] });
      wb.pop();
    }
  }
}

// ======================================================================== LA CASA TAPIADA
export function buildCasaTapiada(ctx, S, L) {
  const wb = ctx.wb;
  const room = 'souto_house',
    up = 'souto_alta';
  const tin = CT.tint.map((v) => v * 0.92);
  // (la tienda y la cocina; la escalera arranca junto a la puerta)
  house(ctx, {
    x0: CT.x0,
    z0: CT.z0,
    x1: CT.x1,
    z1: CT.z1,
    front: 's',
    seed: 106,
    hollow: true,
    h: CT.h,
    g1: G1,
    style: 'plaster',
    tint: CT.tint,
    room,
    jetty: 0,
    windows: false,
    sides: [],
    ceil: false,
    upperFaces: 'new',
    chimney: true,
    chimneyAt: [-32.45, -10.3],
    chimneySize: 0.32,
    floorTint: [0.9, 0.84, 0.76],
    doors: [
      { side: 's', x: -29.75, w: 1.3, h: 2.3 },
      { side: 's', x: -31.75, w: 0.9, h: 2.1, sill: 0.9, frame: false },
      { side: 's', x: -27.75, w: 0.9, h: 2.1, sill: 0.9, frame: false },
    ],
    walls: [{ x0: CI.x0, z0: -8.4, x1: CI.x1, z1: -8.2, doors: [{ at: -30.6, w: 1.1 }] }],
  });

  // ------------------------------------------------------------ fachada
  // las ventanas de abajo, cegadas con tablones (entre ellos, la tienda)
  for (const [x, seed] of [
    [-31.75, 61],
    [-27.75, 62],
  ]) {
    frame(ctx, 's', x, CT.z1, 0.9, 0.9, 2.1, CT.t, { room, sill: false, innerSill: false });
    boardUp(ctx, 's', x, CT.z1, 0.9, [1.06, 1.47, 1.9], seed);
    // la luz que se escapa entre las tablas, en la calle
    ctx.lights.push({ x, y: 1.5, z: CT.z1 + 0.7, r: 1, g: 0.55, b: 0.2, radius: 3.2, intensity: 0.65 });
  }
  // el letrero de la herbolera (un mortero)
  P.sign(ctx, -30.9, 2.95, CT.z1, 0, 'mortar');
  // el sobrado: muro de la fachada con la puerta del pasadizo y dos
  // ventanas (la del oeste, con una hoja colgando y un tablón cruzado: ahí
  // está Inés; la del este, con las hojas entornadas)
  const WUP = { y0: 4.75, y1: 5.8 };
  const wHoles = [
    { a0: -32.55, a1: -31.85, ...WUP },
    { a0: PDOOR.x - PDOOR.w / 2, a1: PDOOR.x + PDOOR.w / 2, y0: FY, y1: FY + PDOOR.h },
    { a0: -27.6, a1: -26.9, ...WUP },
  ];
  // (la parte que queda dentro del pasadizo, con su luz)
  const zs = [CI.z1, CT.z1];
  const pzIn = [PZ.x0 + PZ.t, PZ.x1 - PZ.t];
  for (const [a0, a1, outRoom] of [
    [CT.x0, pzIn[0], 'out'],
    [pzIn[0], pzIn[1], 'pasadizo'],
    [pzIn[1], CT.x1, 'out'],
  ])
    holedWall(ctx, {
      axis: 'x',
      a0,
      a1,
      t0: zs[0],
      t1: zs[1],
      y0: G1,
      y1: CT.h,
      floorY: FY,
      out: 's',
      outRoom,
      room: up,
      mat: 'plaster',
      tint: CT.tint,
      tintIn: tin,
      holes: wHoles.filter((h) => h.a0 >= a0 && h.a1 <= a1),
    });
  frame(ctx, 's', -32.2, CT.z1, 0.7, WUP.y0, WUP.y1, CT.t, { room: up });
  frame(ctx, 's', -27.25, CT.z1, 0.7, WUP.y0, WUP.y1, CT.t, { room: up });
  shutter(ctx, 's', -32.2, CT.z1, 0.7, WUP.y0, WUP.y1, 1, 2.2, { droop: 0.25 });
  boardUp(ctx, 's', -32.2, CT.z1, 0.36, [5.2], 63);
  shutter(ctx, 's', -27.25, CT.z1, 0.7, WUP.y0, WUP.y1, -1, 0.5);
  shutter(ctx, 's', -27.25, CT.z1, 0.7, WUP.y0, WUP.y1, 1, 0.35);
  // la luz de la vela que hay detrás de Inés, en la fachada
  ctx.lights.push({ x: -32.2, y: 5.2, z: CT.z1 + 0.6, r: 1, g: 0.5, b: 0.2, radius: 2.6, intensity: 0.55 });

  // ------------------------------------------------------------ el sobrado
  slab(ctx, CI, [CT_HOLE], up, room);
  joists(ctx, CI, [-4.75, -6.5, -9.9, -11.5], CT_HOLE, room);
  for (const side of ['n', 'e', 'w']) innerWall(ctx, CI, side, FY, CT.ceil, up, tin, [CT.x0, CT.z0, CT.x1, CT.z1]);
  ceiling(ctx, CI, CT.ceil, CT.h, [-5.1, -6.95, -9.7, -11.35], up);
  // (el tabique de la alcoba, un metro más al norte que el de abajo: arriba
  // de la escalera queda un rellano; antes el último peldaño daba de frente
  // contra el tabique y había que salir de lado)
  partitionUp(ctx, { x0: CI.x0, z0: -9.4, x1: CI.x1, z1: -9.2, doors: [{ at: -30.6, w: 1.0, h: 2.2 }] }, FY, CT.ceil, up, tin);
  // la escalera, con la barandilla del hueco arriba (se sale de frente, al
  // rellano, o por el oeste)
  wb.setRoom(room);
  woodStair(ctx, CT_STAIR, room, -7.3);
  wb.setRoom(up);
  railing(ctx, CT_HOLE[0] - 0.05, -7.3, CT_HOLE[0] - 0.05, CT_HOLE[3], FY, up);
  railing(ctx, CT_HOLE[0] - 0.05, CT_HOLE[3] + 0.05, CI.x1, CT_HOLE[3] + 0.05, FY, up);
  // la puerta del pasadizo: el cerco y la hoja, abierta contra el muro
  frame(ctx, 's', PDOOR.x, CT.z1, PDOOR.w, FY, FY + PDOOR.h, CT.t, { room: up, outRoom: 'pasadizo', sill: false, innerSill: false });
  wb.push();
  wb.translate(PDOOR.x + PDOOR.w / 2 - 0.04, FY, CI.z1 - 0.04);
  wb.rotateY(-1.45);
  wb.box('planks', -PDOOR.w + 0.08, 0.02, -0.04, 0, PDOOR.h - 0.04, 0.0, { ao: false, room: up, tint: [0.8, 0.72, 0.64] });
  wb.box('iron', -PDOOR.w + 0.12, 0.4, -0.05, -0.05, 0.46, -0.04, { ao: false, room: up });
  wb.box('iron', -PDOOR.w + 0.12, PDOOR.h - 0.5, -0.05, -0.05, PDOOR.h - 0.44, -0.04, { ao: false, room: up });
  wb.pop();

  // ------------------------------------------------------------ la tienda
  wb.setRoom(room);
  // el mostrador bajo la ventana del oeste (se vendía por la ventana)
  {
    const x0 = CI.x0 + 0.02,
      x1 = -30.95,
      z0 = CI.z1 - 0.62,
      z1 = CI.z1;
    wb.box('wooddark', x0, 0.82, z0, x1, 0.88, z1, { ao: false, faces: 'tnsewb' });
    wb.box('planks', x0 + 0.05, 0, z0 + 0.04, x1 - 0.05, 0.82, z0 + 0.08, { ao: false, tint: [0.7, 0.62, 0.55] });
    for (const x of [x0 + 0.04, x1 - 0.08]) wb.box('wooddark', x, 0, z0 + 0.02, x + 0.05, 0.82, z1, { ao: false });
    ctx.col.add(x0, 0, z0, x1, 0.88, z1);
    mortar(ctx, -32.3, 0.88, -4.0, room);
    scales(ctx, -31.35, 0.88, -4.25, 0.2, room);
    albarelo(ctx, -32.05, 0.88, -4.45, 1.1, 71, room);
    albarelo(ctx, -31.9, 0.88, -4.05, 0.8, 72, room);
    for (let i = 0; i < 4; i++) P.ellipsoid(ctx, 'leaves', -31.6 + i * 0.13, 0.9, -4.5 + (i % 2) * 0.08, 0.07, 0.025, 0.05, HERBS[i]);
    P.candles(ctx, -31.15, 0.88, -4.22, 3, 81, { room, radius: 4.2, intensity: 1.0, spread: 0.1, scale: 0.8 });
  }
  // los albarelos contra el muro del oeste
  apothecaryShelf(ctx, CI.x0 + 0.19, 0, -6.35, Math.PI / 2, 1.9, 91, room);
  // la mesa de trabajo: el recetario, hierbas a medio picar, un cuenco
  P.table(ctx, -29.9, 0, -6.7, 1.5, 0.8, 0.12);
  P.stool(ctx, -30.1, 0, -5.95, { room });
  bowl(ctx, -29.5, 0.8, -6.85, 0.14, room, ['leaves', [0.4, 0.48, 0.3]]);
  for (let i = 0; i < 6; i++) P.ellipsoid(ctx, 'leaves', -30.35 + i * 0.07, 0.81, -6.55 + (i % 3) * 0.05, 0.05, 0.012, 0.03, HERBS[(i + 2) % 5]);
  wb.box('plate', -30.4, 0.8, -6.98, -30.1, 0.81, -6.94, { ao: false });
  P.candles(ctx, -29.3, 0.8, -6.55, 2, 82, { room, radius: 3.8, intensity: 0.85, spread: 0.08 });
  // cestos de flores secas, sacos de corteza
  P.basket(ctx, -30.6, 0, -4.35, { fill: 'leaves', fillTint: HERBS[1] });
  P.sacks(ctx, -32.2, 0, -7.75, 2, 92);
  P.basket(ctx, -28.6, 0, -7.85, { tipped: true, rot: 2.4, fill: 'leaves', fillTint: HERBS[2] });
  // los manojos colgados de las vigas (los que se ven desde la calle)
  for (const [x, z, s] of [
    [-32.2, -4.75, 1],
    [-31.7, -4.75, 2],
    [-31.15, -4.75, 3],
    [-30.0, -4.75, 4],
    [-29.4, -4.75, 5],
    [-28.6, -4.75, 6],
    [-32.0, -6.5, 7],
    [-31.4, -6.5, 8],
    [-30.6, -6.5, 9],
    [-29.9, -6.5, 10],
    [-29.2, -6.5, 11],
  ])
    herbBunch(ctx, x, G1 - 0.22, z, 300 + s, room, 0.25 + (s % 3) * 0.08);
  P.hangingLamp(ctx, -30.4, G1 - 0.22, -5.6, { room, radius: 5.5, intensity: 0.8, len: 0.6 });
  // sangre seca bajo la ventana del este y en la escalera
  P.decal(ctx, -28.5, 0.03, -5.3, 1.0);
  for (let i = 2; i < STEPS; i += 3) P.decal(ctx, CT_STAIR.x, (i + 1) * RISE + 0.02, CT_STAIR.z - (i + 0.5) * RUN, 0.32);

  // ------------------------------------------------------------ la cocina
  // el hogar (sólo brasas: hace tres días que nadie lo atiza)
  // (un poco por delante del muro: si no, el muro tapa el fondo tiznado)
  P.hearth(ctx, CI.x0 + 0.1, 0, -10.3, 'e', { room, w: 1.6, pot: true, lit: false, ceil: G1 });
  wb.box('ember', CI.x0 + 0.5, 0.12, -10.6, CI.x0 + 0.8, 0.15, -10.0, { faces: 't', ao: false, grime: false });
  ctx.fires.push({ x: CI.x0 + 0.65, y: 0.16, z: -10.3, s: 0.18, light: false, embers: true, glow: true });
  ctx.lights.push({ x: CI.x0 + 0.9, y: 0.6, z: -10.3, r: 1, g: 0.4, b: 0.14, radius: 4.5, intensity: 0.85, room });
  P.firewood(ctx, CI.x0 + 0.35, 0, -11.55, 0, 2);
  P.table(ctx, -29.6, 0, -10.4, 1.4, 0.8, -0.05);
  P.bench(ctx, -29.6, 0, -11.15, 1.3, -0.05);
  P.stool(ctx, -28.55, 0, -10.0, { room, tipped: false });
  bowl(ctx, -29.9, 0.8, -10.3, 0.12, room, ['black', [0.25, 0.15, 0.1]]);
  P.jar(ctx, -29.2, 0.8, -10.55, 0.4, { collide: false });
  wb.box('wooddark', -30.3, 0.8, -10.65, -29.95, 0.84, -10.45, { ao: false, faces: 'tnsew' });
  P.candles(ctx, -29.4, 0.8, -10.2, 2, 83, { room, radius: 3.6, intensity: 0.7, spread: 0.1 });
  P.shelf(ctx, -28.6, 0, CI.z0 + 0.2, 0, 1.6);
  P.jar(ctx, CI.x1 - 0.35, 0, -9.1, 1.0);
  P.jar(ctx, CI.x1 - 0.35, 0, -11.75, 0.85);
  P.kneadTrough(ctx, -27.7, 0, -10.6, Math.PI / 2, { room });
  // ristras de ajos y cebollas, y un caldero en la pared
  for (const z of [-10.9, -10.2, -9.5]) {
    wb.box('burlap', CI.x1 - 0.06, 1.6, z - 0.01, CI.x1 - 0.04, 2.3, z + 0.01, { ao: false });
    for (let i = 0; i < 5; i++) P.ellipsoid(ctx, 'bone', CI.x1 - 0.1, 1.65 + i * 0.12, z + (i % 2 ? 0.03 : -0.03), 0.045, 0.05, 0.045, [0.95, 0.9, 0.75]);
  }
  ctx.rats.push({ x: -31.6, y: 0, z: -9.0, n: 1 });

  // ------------------------------------------------------------ el sobrado: la sala
  wb.setRoom(up);
  // la mesita junto a la puerta del pasadizo, con la carta y una vela
  P.table(ctx, -28.35, FY, -4.5, 0.9, 0.6, 0);
  P.candles(ctx, -28.1, FY + 0.8, -4.6, 2, 84, { room: up, radius: 4.2, intensity: 0.85, spread: 0.06 });
  // el torno de hilar, el arca y la vela de detrás de Inés
  P.spinningWheel(ctx, -31.9, FY, -7.3, 1.2, { room: up });
  chest(ctx, CI.x0 + 0.32, FY, -5.55, Math.PI / 2, up);
  P.candles(ctx, -32.25, FY + 0.58, -5.4, 2, 85, { room: up, radius: 3.2, intensity: 0.7, spread: 0.05, scale: 0.8 });
  P.stool(ctx, -31.2, FY, -7.0, { room: up });
  // el secadero: cuerdas de pared a pared con hierbas puestas a secar
  for (const z of [-5.0, -6.2]) {
    wb.box('burlap', CI.x0, 6.32, z - 0.006, CI.x1, 6.332, z + 0.006, { ao: false });
    for (let x = CI.x0 + 0.5; x < CI.x1 - 0.3; x += 0.42) herbBunch(ctx, x, 6.32, z, 400 + Math.round(x * 10 + z * 7), up, 0.02);
  }
  P.decal(ctx, -31.2, FY + 0.03, -5.0, 1.1);

  // ------------------------------------------------------------ la alcoba
  // la cama de la madre (al oeste) y la de Inés (al este), con su sangre
  P.bed(ctx, -31.55, FY, -11.5, 0);
  P.bed(ctx, -27.95, FY, -11.5, Math.PI);
  P.decal(ctx, -27.3, FY + 0.62, -11.5, 0.5);
  P.decal(ctx, -28.4, FY + 0.62, -11.35, 0.35);
  // entre las dos: la jofaina con los paños, la imagen y sus velas
  P.stool(ctx, -29.75, FY, -11.55, { room: up });
  bowl(ctx, -29.75, FY + 0.47, -11.55, 0.17, up, ['blood', [0.6, 0.2, 0.15]]);
  wb.box('clothWhite', -29.72, FY + 0.5, -11.4, -29.55, FY + 0.52, -11.25, { ao: false, tint: [0.7, 0.45, 0.4] });
  saint(ctx, 's', -29.75, FY + 1.4, CI.z0, up, 86);
  chest(ctx, -31.55, FY, -10.55, 0, up, 1.0);
  wb.box('clothDark', -32.0, FY + 0.58, -10.75, -31.3, FY + 0.6, -10.3, { ao: false, tint: [0.6, 0.55, 0.5] });
  P.decal(ctx, -28.6, FY + 0.03, -10.4, 1.3);

  // ------------------------------------------------------------ interactuables
  L.interact.push(
    { kind: 'door', id: 'd_souto', x: -29.75, y: 0, z: CT.z1, w: 1.3, h: 2.25, axis: 'x', lock: { type: 'boards' }, mat: 'planks', hinge: -1, swing: 1, plane: CI.z1 + 0.05 },
    { kind: 'note', id: 'n_madre', note: 'madre', x: -28.3, y: FY + 0.82, z: -4.45, model: 'paper' },
    { kind: 'note', id: 'n_receta', note: 'recetario', x: -30.1, y: 0.86, z: -6.75, model: 'book' },
    { kind: 'item', id: 'i_ampolla1', item: 'ampolla', x: CI.x0 + 0.3, y: 1.62, z: -6.6 }
  );
  // Inés, de pie en la ventana del sobrado, mirando a la calle
  L.enemies.push({ type: 'penitent', x: -32.2, y: FY, z: -4.42, yaw: 0, idle: 'window', id: 'e_hija' });
}

// ======================================================================== EL PASADIZO
export function buildPasadizo(ctx, S, L) {
  const wb = ctx.wb;
  const room = 'pasadizo';
  const { x0, x1, z0, z1, t, y1 } = PZ;
  const xi0 = x0 + t,
    xi1 = x1 - t;
  // los dos muros de entramado (vigas de lado a lado de la calle), con sus
  // ventanas
  const win = (z) => ({ a0: z - 0.3, a1: z + 0.3, y0: 4.6, y1: 5.45 });
  for (const [ta, tb, out] of [
    [x0, xi0, 'w'],
    [xi1, x1, 'e'],
  ])
    holedWall(ctx, { axis: 'z', a0: z0, a1: z1, t0: ta, t1: tb, y0: G1, y1, floorY: FY, out, room, bottom: true, mat: 'plaster', tint: PZ.tint, tintIn: PZ.tint.map((v) => v * 0.85), holes: [win(-2.3), win(2.3)] });
  // entramado por fuera: soleras, carreras, pies derechos y tornapuntas
  for (const [xo, side] of [
    [x0, 'w'],
    [x1, 'e'],
  ]) {
    const sx = side === 'w' ? -1 : 1;
    const bx = (a, b) => (sx < 0 ? [xo - b, xo - a] : [xo + a, xo + b]);
    const [ra, rb] = bx(-0.02, 0.07);
    // (la carrera de en medio, un centímetro por detrás de los pies derechos,
    // y los alféizares por delante: sin caras que coincidan)
    const [ma, mb] = bx(-0.02, 0.06);
    const [sa, sb] = bx(-0.02, 0.085);
    wb.box('timber', ra, G1 - 0.04, z0, rb, G1 + 0.2, z1, { ao: false, faces: 'tnsewb' });
    wb.box('timber', ra, y1 - 0.18, z0, rb, y1, z1, { ao: false });
    wb.box('timber', ma, 4.45, z0, mb, 4.58, z1, { ao: false });
    for (const z of [z0 + 0.1, -1.4, 0, 1.4, z1 - 0.1]) wb.box('timber', ra, G1 + 0.2, z - 0.09, rb, y1 - 0.18, z + 0.09, { ao: false });
    for (const z of [-2.3, 2.3]) {
      wb.box('timber', sa, 4.5, z - 0.4, sb, 4.62, z + 0.4, { ao: false });
      wb.box('timber', ra, 5.45, z - 0.4, rb, 5.56, z + 0.4, { ao: false, faces: 'tnsewb' });
    }
    // aspas bajo las ventanas (el muro trabaja como una viga)
    for (const [za, zb] of [
      [z0 + 0.1, -1.4],
      [1.4, z1 - 0.1],
    ]) {
      const cz = (za + zb) / 2,
        cy = (G1 + 0.2 + 4.45) / 2;
      const dz = zb - za,
        dy = 4.45 - (G1 + 0.2);
      const len = Math.hypot(dz, dy);
      for (const sg of [1, -1]) {
        wb.push();
        wb.translate((ra + rb) / 2, cy, cz);
        wb.rotateX(sg * Math.atan2(dy, dz));
        wb.box('timber', -0.035, -0.06, -len / 2, 0.035, 0.06, len / 2, { ao: false });
        wb.pop();
      }
    }
  }
  // contraventanas: abiertas hacia fuera, una hoja suelta
  shutter(ctx, 'w', x0, -2.3, 0.6, 4.6, 5.45, -1, 1.7);
  shutter(ctx, 'w', x0, -2.3, 0.6, 4.6, 5.45, 1, 1.9);
  shutter(ctx, 'w', x0, 2.3, 0.6, 4.6, 5.45, 1, 1.4, { droop: 0.3 });
  shutter(ctx, 'e', x1, -2.3, 0.6, 4.6, 5.45, -1, 1.8);
  shutter(ctx, 'e', x1, 2.3, 0.6, 4.6, 5.45, -1, 1.6);
  shutter(ctx, 'e', x1, 2.3, 0.6, 4.6, 5.45, 1, 1.75);

  // el suelo: dos tramos, de cada casa al hueco
  for (const [za, zb] of [
    [z0, PZ.h0],
    [PZ.h1, z1],
  ]) {
    wb.box('planks', xi0, G1, za, xi1, FY, zb, { faces: 't', room, ao: false, uv: 0.5, tint: [0.82, 0.76, 0.68] });
    wb.box('wooddark', xi0, G1, za, xi1, G1 + 0.04, zb, { faces: 'b', ao: false, tint: [0.55, 0.5, 0.46] });
    ctx.col.add(x0, G1, za, x1, FY, zb).cam = true;
  }
  // (el canto del suelo en el hueco)
  wb.box('wooddark', xi0, G1, PZ.h0 - 0.01, xi1, FY, PZ.h0, { faces: 's', ao: false, room, tint: [0.5, 0.44, 0.4] });
  wb.box('wooddark', xi0, G1, PZ.h1, xi1, FY, PZ.h1 + 0.01, { faces: 'n', ao: false, room, tint: [0.5, 0.44, 0.4] });
  // las viguetas de debajo (de muro a muro) y, en el hueco, sus muñones
  for (const z of [-3.15, -2.45, -1.75, 1.75, 2.45, 3.15]) wb.box('timber', xi0, G1 - 0.2, z - 0.08, xi1, G1, z + 0.08, { ao: false, faces: 'nsewb' });
  const rng = new RNG(5151);
  for (const [z, side, len] of [
    [-1.0, -1, 0.55],
    [-0.3, 1, 0.38],
    [0.35, -1, 0.3],
    [1.0, 1, 0.6],
  ]) {
    wb.push();
    wb.translate(side < 0 ? xi0 : xi1, G1 - 0.1, z);
    wb.rotateZ(side * -0.22);
    wb.box('timber', side < 0 ? 0 : -len, -0.1, -0.08, side < 0 ? len : 0, 0.1, 0.08, { ao: false, faces: 'tnsewb' });
    wb.box('planks', side < 0 ? len : -len - 0.12, -0.06, -0.05, side < 0 ? len + 0.12 : -len, 0.05, 0.03, { ao: false, tint: [0.95, 0.88, 0.78] });
    wb.pop();
  }
  // las tablas rotas en los bordes del hueco (colgando un poco)
  for (const [ze, dir] of [
    [PZ.h0, 1],
    [PZ.h1, -1],
  ]) {
    for (let x = xi0 + 0.02; x < xi1 - 0.1; x += 0.22) {
      if (rng.chance(0.25)) continue;
      const len = rng.range(0.06, 0.42);
      wb.push();
      wb.translate(x + 0.1, FY - 0.02, ze);
      wb.rotateX(dir * rng.range(0.04, 0.28));
      wb.box('planks', -0.1, -0.04, dir > 0 ? 0 : -len, 0.1, 0.02, dir > 0 ? len : 0, { ao: false, tint: [0.84, 0.78, 0.7] });
      wb.box('planks', -0.1 + rng.range(0, 0.1), -0.03, dir > 0 ? len : -len - 0.08, -0.02 + rng.range(0, 0.1), 0.01, dir > 0 ? len + 0.08 : -len, { ao: false, tint: [0.96, 0.9, 0.8] });
      wb.pop();
    }
  }
  // el techo y la cubierta (a dos aguas, atravesada a la calle)
  ceiling(ctx, { x0: xi0, z0, x1: xi1, z1 }, PZ.ceil, y1, [-2.6, -0.9, 0.9, 2.6], room);
  wb.gableRoof(x0 - 0.35, z0, x1 + 0.35, z1, y1, y1 + (x1 - x0) * 0.35, 'z', { wallMat: 'plaster', overhang: 0.25 });
  ctx.col.addCam(x0, y1, z0, x1, y1 + (x1 - x0) * 0.35, z1);
  // luz: la de la vela de la sala por la puerta, y la de la noche por las ventanas
  ctx.lights.push({ x: PDOOR.x, y: 5.0, z: z0 + 0.6, r: 1, g: 0.55, b: 0.22, radius: 3.4, intensity: 0.55, room });
  ctx.lights.push({ x: PDOOR.x, y: 5.4, z: 0, r: 0.55, g: 0.62, b: 0.8, radius: 4.6, intensity: 0.4, room });

  // en la calle, las tablas y las viguetas que tiró abajo, a hachazos
  brokenBoards(
    ctx,
    [
      [-30.4, -0.4, 3],
      [-29.0, 0.6, 2],
      [-29.8, 1.6, 2],
      [-28.6, -1.3, 1],
    ],
    5152
  );
  for (const [x, z, r] of [
    [-29.4, -0.2, 0.7],
    [-30.6, 1.0, 2.2],
  ]) {
    wb.push();
    wb.translate(x, 0.09, z);
    wb.rotateY(r);
    wb.box('timber', -0.55, -0.08, -0.08, 0.55, 0.08, 0.08, { ao: false, faces: 'tnsew', tint: [0.8, 0.75, 0.7] });
    wb.pop();
  }
  // lo que cae del hueco: el examinar (y tender el tablón), en el borde de
  // la casa tapiada; el tablón, si está, lo pone el guion
  L.interact.push({ kind: 'plank', id: 'x_hueco', x: PDOOR.x, y: FY, z: PZ.h0 - 0.35, r: 1.9 });
}

// ======================================================================== LA CASA DEL TONELERO
export function buildCasaTonelero(ctx, S, L) {
  const wb = ctx.wb;
  const room = 'tonelero',
    up = 'tonelero_alta';
  const stone = [0.86, 0.84, 0.8];
  house(ctx, {
    x0: MH.x0,
    z0: MH.z0,
    x1: MH.x1,
    z1: MH.z1,
    front: 'n',
    seed: 1203,
    hollow: true,
    h: MH.h,
    g1: G1,
    style: 'stone',
    room,
    jetty: 0,
    windows: false,
    sides: [],
    ceil: false,
    upperFaces: 'es',
    chimney: false,
    floorMat: 'flag',
    floorTint: [0.78, 0.74, 0.7],
    doors: [
      { side: 'n', x: -27.75, w: 1.3, h: 2.3 },
      { side: 'n', x: -30.9, w: 0.9, h: 2.1, sill: 0.9, frame: false },
      { side: 'n', x: -24.6, w: 0.9, h: 2.1, sill: 0.9, frame: false },
    ],
  });

  // ------------------------------------------------------------ fachadas
  // abajo: rejas y las hojas abiertas contra el muro (dentro, a oscuras, la
  // tonelería)
  for (const x of [-30.9, -24.6]) {
    frame(ctx, 'n', x, MH.z0, 0.9, 0.9, 2.1, MH.t, { room, mat: 'wooddark', sill: false, innerSill: false });
    wb.at(x, 0, MH.z0, Math.PI, () => {
      for (let i = 1; i < 5; i++) wb.box('iron', -0.45 + i * 0.18 - 0.018, 0.9, -0.12, -0.45 + i * 0.18 + 0.018, 2.1, -0.08, { ao: false, grime: false });
      for (const y of [1.3, 1.75]) wb.box('iron', -0.45, y, -0.11, 0.45, y + 0.03, -0.09, { ao: false });
    });
    shutter(ctx, 'n', x, MH.z0, 0.9, 0.9, 2.1, -1, 1.95);
    shutter(ctx, 'n', x, MH.z0, 0.9, 0.9, 2.1, 1, 2.05);
  }
  // el letrero del tonelero (un tonel) y el farol de la puerta
  P.sign(ctx, -29.6, 2.95, MH.z0, Math.PI, 'barrel');
  // al callejón del Horno: ventanas cerradas
  for (const z of [6.2, 10.2]) closedWindow(ctx, 'w', MH.x0, z, 0.8, 1.2, 2.1, MH.t, room);
  // arriba, la fachada de la calle (la puerta del pasadizo y una ventana con
  // las hojas entornadas) y la del callejón (cerradas)
  const UPW = { y0: 4.75, y1: 5.8 };
  const nHoles = [
    { a0: PDOOR.x - PDOOR.w / 2, a1: PDOOR.x + PDOOR.w / 2, y0: FY, y1: FY + PDOOR.h },
    { a0: -26.55, a1: -25.85, ...UPW },
  ];
  const pzIn = [PZ.x0 + PZ.t, PZ.x1 - PZ.t];
  for (const [a0, a1, outRoom] of [
    [MH.x0, pzIn[0], 'out'],
    [pzIn[0], pzIn[1], 'pasadizo'],
    [pzIn[1], MH.x1, 'out'],
  ])
    holedWall(ctx, { axis: 'x', a0, a1, t0: MH.z0, t1: MI.z0, y0: G1, y1: MH.h, floorY: FY, out: 'n', outRoom, room: up, mat: 'wallstone', tint: null, tintIn: stone, holes: nHoles.filter((h) => h.a0 >= a0 && h.a1 <= a1) });
  // (la ventana de la alcoba, al callejón, con una hoja entornada: por ahí
  // entra la luna, sobre el rincón de Miguel)
  const AW = { z: 10.6, w: 0.7 };
  holedWall(ctx, { axis: 'z', a0: MH.z0, a1: MH.z1, t0: MH.x0, t1: MI.x0, y0: G1, y1: MH.h, floorY: FY, out: 'w', room: up, mat: 'wallstone', tint: null, tintIn: stone, holes: [{ a0: AW.z - AW.w / 2, a1: AW.z + AW.w / 2, ...UPW }] });
  frame(ctx, 'n', -26.2, MH.z0, 0.7, UPW.y0, UPW.y1, MH.t, { room: up, mat: 'wooddark', sillMat: 'ashlar' });
  shutter(ctx, 'n', -26.2, MH.z0, 0.7, UPW.y0, UPW.y1, -1, 0.3);
  shutter(ctx, 'n', -26.2, MH.z0, 0.7, UPW.y0, UPW.y1, 1, 0.22);
  frame(ctx, 'n', PDOOR.x, MH.z0, PDOOR.w, FY, FY + PDOOR.h, MH.t, { room: up, outRoom: 'pasadizo', mat: 'wooddark', sill: false, innerSill: false });
  closedWindow(ctx, 'w', MH.x0, 5.6, 0.7, UPW.y0, UPW.y1, MH.t, up);
  frame(ctx, 'w', MH.x0, AW.z, AW.w, UPW.y0, UPW.y1, MH.t, { room: up, mat: 'wooddark', sillMat: 'ashlar' });
  shutter(ctx, 'w', MH.x0, AW.z, AW.w, UPW.y0, UPW.y1, -1, 0.42);
  shutter(ctx, 'w', MH.x0, AW.z, AW.w, UPW.y0, UPW.y1, 1, 0.08);
  ctx.lights.push({ x: MI.x0 + 0.7, y: 4.6, z: AW.z + 0.5, r: 0.5, g: 0.6, b: 0.85, radius: 3.4, intensity: 0.8, room: up });
  if (ctx.shafts) ctx.shafts.push({ a: [MI.x0 - 0.1, UPW.y1 - 0.2, AW.z], b: [MI.x0 + 1.1, FY + 0.05, AW.z + 0.75], w: 0.55, color: 0x9fb2d8 });

  // ------------------------------------------------------------ el sobrado
  slab(ctx, MI, [MH_HOLE], up, room);
  joists(ctx, MI, [4.9, 6.6, 8.3, 10.0, 11.6], MH_HOLE, room);
  for (const side of ['e', 's']) innerWall(ctx, MI, side, FY, MH.ceil, up, stone, [MH.x0, MH.z0, MH.x1, MH.z1]);
  ceiling(ctx, MI, MH.ceil, MH.h, [5.0, 6.8, 9.1, SOUTO.hang.z, 11.6], up);
  // (el tabique, bajo la viga de 9.1 y un poco más estrecho que ella)
  partitionUp(ctx, { x0: MI.x0, z0: 9.03, x1: MI.x1, z1: 9.17, doors: [{ at: -25.3, w: 1.0, h: 2.2 }] }, FY, MH.ceil, up, stone);
  wb.setRoom(room);
  woodStair(ctx, MH_STAIR, room, MH_HOLE[1]);
  wb.setRoom(up);
  railing(ctx, MH_HOLE[0] - 0.05, MH_HOLE[1], MH_HOLE[0] - 0.05, MH_HOLE[3], FY, up);

  // ------------------------------------------------------------ la tonelería
  wb.setRoom(room);
  // el fuego en su cesto de hierro y, encima, un tonel a medio hacer: las
  // duelas abiertas en corona, sujetas por un aro (así se curvan al calor)
  {
    const cx = -28.6,
      cz = 8.3;
    wb.cylinder('iron', cx, 0, cz, 0.24, 0.3, 0.32, 8, { ao: false, capBot: true });
    wb.box('ember', cx - 0.2, 0.3, cz - 0.2, cx + 0.2, 0.33, cz + 0.2, { faces: 't', ao: false, grime: false });
    ctx.fires.push({ x: cx, y: 0.34, z: cz, s: 0.3, light: false, embers: true, smoke: false });
    ctx.lights.push({ x: cx, y: 0.9, z: cz, r: 1, g: 0.42, b: 0.14, radius: 6.5, intensity: 0.95, room });
    if (ctx.dynLights) ctx.dynLights.push({ x: cx, y: 0.8, z: cz, intensity: 1.6, range: 6, room });
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      wb.push();
      wb.translate(cx + Math.cos(a) * 0.36, 0, cz + Math.sin(a) * 0.36);
      wb.rotateY(-a);
      wb.rotateZ(-0.16);
      wb.box('planks', -0.02, 0, -0.06, 0.02, 0.95, 0.06, { ao: false, tint: [0.88, 0.76, 0.6] });
      wb.pop();
    }
    const hoop = (y, r) => wb.geometry('iron', new THREE.TorusGeometry(r, 0.016, 4, 16), M4().compose(V(cx, y, cz), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), V(1, 1, 1)), { ao: false });
    hoop(0.86, 0.24);
    hoop(0.72, 0.26);
    ctx.col.add(cx - 0.45, 0, cz - 0.45, cx + 0.45, 0.95, cz + 0.45);
  }
  // toneles hechos, en fila contra el muro del sur, y uno encima de otros dos
  for (const x of [-31.4, -30.6, -29.8]) P.barrel(ctx, x, 0, MI.z1 - 0.45);
  P.barrel(ctx, -31.45, 0, 10.6, { lying: true, rot: 0 });
  P.barrel(ctx, -31.45, 0, 9.75, { lying: true, rot: 0 });
  P.cask(ctx, -27.2, 0, MI.z1 - 0.62, 0, { room, r: 0.48, len: 1.15 });
  // duelas apiladas contra el muro del oeste y aros colgados de clavos
  for (let i = 0; i < 9; i++) {
    wb.push();
    wb.translate(MI.x0 + 0.16 + (i % 3) * 0.035, 0, 5.0 + i * 0.13);
    wb.rotateZ(-0.12 - (i % 2) * 0.05);
    wb.box('planks', -0.02, 0, -0.055, 0.02, 1.05 + (i % 4) * 0.06, 0.055, { ao: false, tint: [0.85, 0.74, 0.58] });
    wb.pop();
  }
  ctx.col.add(MI.x0, 0, 4.9, MI.x0 + 0.35, 1.2, 6.2);
  for (const [x, y, r] of [
    [-29.6, 1.9, 0.36],
    [-29.15, 1.75, 0.3],
    [-26.4, 1.85, 0.34],
  ])
    wb.geometry('iron', new THREE.TorusGeometry(r, 0.014, 4, 16), M4().compose(V(x, y, MI.z0 + 0.03), new THREE.Quaternion(), V(1, 1, 1)), { ao: false });
  // el banco de desbastar y el tajo con las herramientas
  {
    const x = -26.2,
      z = 6.0;
    wb.box('wooddark', x - 0.9, 0.5, z - 0.14, x + 0.9, 0.58, z + 0.14, { ao: false, faces: 'tnsewb' });
    for (const s of [-1, 1]) wb.box('wooddark', x + s * 0.75 - 0.05, 0, z - 0.12, x + s * 0.75 + 0.05, 0.5, z + 0.12, { ao: false });
    wb.box('wooddark', x + 0.2, 0.58, z - 0.1, x + 0.55, 0.85, z + 0.1, { ao: false });
    wb.box('planks', x - 0.4, 0.58, z - 0.06, x + 0.4, 0.62, z + 0.06, { ao: false, tint: [0.9, 0.78, 0.62] });
    P.colOBB(ctx, x, z, 0.9, 0.16, 0, 0, 0.6);
  }
  P.toolBoard(ctx, MI.x0 + 0.02, 0, 8.2, Math.PI / 2, { room });
  // virutas por el suelo
  {
    const r2 = new RNG(1205);
    for (let i = 0; i < 70; i++) {
      const x = r2.range(-30.5, -25.2),
        z = r2.range(4.6, 9.8);
      if (Math.hypot(x + 28.6, z - 8.3) < 0.6) continue;
      wb.push();
      wb.translate(x, 0.012, z);
      wb.rotateY(r2.range(0, Math.PI));
      wb.rotateZ(r2.range(-0.4, 0.4));
      wb.box('planks', -0.05, -0.006, -0.012, 0.05, 0.006, 0.012, { ao: false, faces: 'tnsew', tint: [1.05, 0.92, 0.72], grime: false });
      wb.pop();
    }
  }

  // ------------------------------------------------------------ arriba: la sala
  wb.setRoom(up);
  // la mesa con la cena a medias (hace días) y su banco
  P.table(ctx, -30.4, FY, 6.6, 1.6, 0.85, 0.05);
  P.bench(ctx, -30.4, FY, 7.4, 1.5, 0.05);
  bowl(ctx, -30.9, FY + 0.8, 6.5, 0.13, up, ['black', [0.3, 0.2, 0.15]]);
  bowl(ctx, -30.1, FY + 0.8, 6.75, 0.13, up, null);
  P.jar(ctx, -29.85, FY + 0.8, 6.4, 0.38, { collide: false });
  wb.box('straw', -30.6, FY + 0.8, 6.3, -30.3, FY + 0.86, 6.45, { ao: false, tint: [0.8, 0.55, 0.3] });
  // la ballesta de la milicia en la pared, el capacete en el arca
  chest(ctx, MI.x0 + 0.32, FY, 4.9, Math.PI / 2, up);
  P.dropped(ctx, MI.x0 + 0.34, FY + 0.58, 5.1, 0.3, 'helmet');
  {
    const x = MI.x0 + 0.04,
      y = FY + 1.6,
      z = 7.2;
    wb.box('wooddark', x, y - 0.04, z - 0.42, x + 0.07, y + 0.04, z + 0.42, { ao: false });
    wb.box('wooddark', x, y - 0.03, z - 0.04, x + 0.1, y + 0.03, z + 0.5, { ao: false });
    wb.box('iron', x + 0.04, y - 0.35, z - 0.015, x + 0.08, y + 0.35, z + 0.015, { ao: false });
    wb.box('leather', x, y - 0.6, z + 0.55, x + 0.12, y - 0.1, z + 0.72, { ao: false });
  }
  // el hacha con la que arrancó el suelo del pasadizo, junto a la puerta
  P.dropped(ctx, -30.65, FY, 4.55, 2.2, 'axe');
  // un jergón en el suelo de la sala: aquí durmió estas noches, lejos de ella
  wb.box('straw', -27.6, FY, 4.4, -26.2, FY + 0.12, 6.1, { ao: false, faces: 'tnsew', tint: [0.75, 0.66, 0.5] });
  wb.box('clothDark', -27.5, FY + 0.12, 4.5, -26.4, FY + 0.15, 5.6, { ao: false, faces: 'tnsew', tint: [0.7, 0.6, 0.5] });
  P.decal(ctx, -28.2, FY + 0.03, 5.6, 1.2);
  P.decal(ctx, -26.0, FY + 0.03, 8.0, 0.8);
  ctx.lights.push({ x: -26.2, y: 5.2, z: MI.z0 + 0.6, r: 0.5, g: 0.58, b: 0.78, radius: 4.2, intensity: 0.35, room: up });

  // ------------------------------------------------------------ la alcoba
  // la cama, contra el muro del sur: Catarina, tapada con la sábana
  // empapada; él le ha cruzado las manos y le ha puesto una vela
  // (la cabecera, al este)
  P.bed(ctx, -26.6, FY, MI.z1 - 0.6, Math.PI);
  {
    const y = FY + 0.6;
    const z = MI.z1 - 0.62;
    P.ellipsoid(ctx, 'clothWhite', -26.4, y + 0.08, z, 0.55, 0.13, 0.27, [0.78, 0.7, 0.66]);
    P.ellipsoid(ctx, 'clothWhite', -27.2, y + 0.06, z, 0.38, 0.1, 0.22, [0.78, 0.7, 0.66]);
    P.ellipsoid(ctx, 'clothWhite', -25.83, y + 0.1, z, 0.13, 0.12, 0.12, [0.78, 0.7, 0.66]);
    // las manos, cruzadas sobre el pecho por encima de la sábana
    for (const s of [-1, 1])
      wb.at(-26.08, y + 0.18, z + s * 0.03, s * 0.6, () => wb.box('skinPale', -0.11, 0, -0.032, 0.11, 0.04, 0.032, { ao: false, tint: [0.92, 0.84, 0.74] }));
    // (la sangre, del cuello al vientre, sin tapar las manos)
    for (const [x, s] of [
      [-26.55, 0.6],
      [-26.4, 0.3],
      [-25.75, 0.4],
      [-26.95, 0.35],
    ])
      P.decal(ctx, x, y + 0.22, z, s);
    P.decal(ctx, -26.5, FY + 0.03, z - 0.75, 1.5);
  }
  // la vela, junto a la cabecera (más alta que un escalón: no se pisa)
  P.stool(ctx, -25.95, FY, MI.z1 - 1.35, { room: up });
  P.candles(ctx, -25.95, FY + 0.47, MI.z1 - 1.35, 2, 1206, { room: up, radius: 5.2, intensity: 1.0, spread: 0.05, scale: 0.8 });
  ctx.col.add(-26.13, FY, MI.z1 - 1.53, -25.77, FY + 0.9, MI.z1 - 1.17);
  saint(ctx, 'n', -26.6, FY + 1.35, MI.z1, up, 1207, 'clothRed');
  chest(ctx, MI.x1 - 0.4, FY, 10.3, -Math.PI / 2, up, 1.0);
  // el rincón de Miguel: arañazos, sangre seca y el cuenco que no tocó
  P.decal(ctx, SOUTO.miguel.x + 0.2, FY + 0.03, SOUTO.miguel.z - 0.2, 1.4);
  P.decal(ctx, MI.x0 + 0.02, FY + 1.1, SOUTO.miguel.z - 0.1, 0.9, 'splat', 1.2, { wall: 'x' });
  P.decal(ctx, SOUTO.miguel.x + 0.1, FY + 1.0, MI.z1 - 0.02, 0.7, 'splat', 0.4, { wall: 'z' });
  bowl(ctx, -30.4, FY, 10.6, 0.12, up, ['black', [0.25, 0.18, 0.12]]);
  // (lo que queda cuando se ahorca: el taburete volcado y su duela escrita;
  // ver game/souto.js)
  ctx.beginGroup('miguelAhorcado');
  P.stool(ctx, SOUTO.hang.x + 0.45, FY, SOUTO.hang.z + 0.2, { room: up, tipped: true });
  wb.push();
  wb.translate(SOUTO.hang.x + 0.5, FY + 0.18, SOUTO.hang.z + 0.2);
  wb.rotateX(Math.PI / 2);
  wb.rotateZ(0.6);
  wb.cylinder('wooddark', 0, -0.2, 0, 0.2, 0.2, 0.05, 7, { ao: false, capTop: true, capBot: true, room: up });
  wb.pop();
  ctx.endGroup();

  // ------------------------------------------------------------ interactuables
  L.interact.push(
    { kind: 'door', id: 'd_miguel', x: -27.75, y: 0, z: MH.z0, w: 1.3, h: 2.25, axis: 'x', lock: { type: 'barred', side: 1 }, mat: 'planks', hinge: -1, swing: -1, plane: MI.z0 - 0.05, barAt: MI.z0 },
    { kind: 'note', id: 'n_miguel', note: 'miguel', x: SOUTO.hang.x - 0.55, y: FY + 0.03, z: SOUTO.hang.z + 0.5, model: 'stave', hidden: true },
    { kind: 'examine', id: 'x_catarina', text: 'catarina', x: -26.4, y: FY, z: MI.z1 - 1.25, r: 1.6 }
  );
  // Miguel, en su rincón
  L.enemies.push({ type: 'morador', x: SOUTO.miguel.x, y: FY, z: SOUTO.miguel.z, yaw: SOUTO.miguel.yaw, idle: 'sob', id: 'e_miguel' });
}

// Las zonas (por orden: lo de dentro antes que la calle) y el mapa.
export function soutoZones(L) {
  L.zones.push(
    { id: 'souto_house', rects: [[CT.x0, CT.z0, CT.x1, CT.z1 - 0.1, -1, 3.45]], atmo: 'interior', room: 'souto_house' },
    { id: 'souto_alta', rects: [[CT.x0, CT.z0, CT.x1, CT.z1 - 0.1, 3.45, 9]], atmo: 'interior', room: 'souto_alta' },
    { id: 'pasadizo', rects: [[PZ.x0, PZ.z0 - 0.1, PZ.x1, PZ.z1 + 0.1, 3.0, 9]], atmo: 'interior', room: 'pasadizo' },
    { id: 'tonelero', rects: [[MH.x0, MH.z0 + 0.1, MH.x1, MH.z1, -1, 3.45]], atmo: 'interior', room: 'tonelero' },
    { id: 'tonelero_alta', rects: [[MH.x0, MH.z0 + 0.1, MH.x1, MH.z1, 3.45, 9]], atmo: 'interior', room: 'tonelero_alta' }
  );
  L.map.push(
    { id: 'souto_house', r: [CI.x0, CI.z0, CI.x1, CI.z1] },
    { id: 'souto_alta', r: [CI.x0, CI.z0, CI.x1, CI.z1], label: 'souto_house' },
    { id: 'pasadizo', r: [PZ.x0, PZ.z0, PZ.x1, PZ.z1] },
    { id: 'tonelero', r: [MI.x0, MI.z0, MI.x1, MI.z1] },
    { id: 'tonelero_alta', r: [MI.x0, MI.z0, MI.x1, MI.z1], label: 'tonelero' }
  );
}
