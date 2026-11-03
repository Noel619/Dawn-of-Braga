// La torre del homenaje por dentro (PLAN_FORTALEZA.md, §5.10; fase 3): la
// torre del conde, lo más viejo y lo más alto de la fortaleza, el último
// refugio del Rey.
//
// Cinco plantas, partidas por un muro de carga de poniente a levante y unidas
// por un caracol en el rincón del noroeste, que sube de la planta baja a la
// terraza (como el de Hedingham):
// - la planta baja (0): el almacén, al sur, con el pozo de la torre y la
//   trampilla de la bajada a la cárcel, cerrada; el granero, al norte;
// - la guardia de la torre (+6): su sala, con la puerta de la escalinata,
//   atrancada por dentro (el atajo al patio de honor), y el dormitorio;
// - las cámaras privadas del Rey (+12): la sala del consejo, con la mesa del
//   plano de la defensa y la puerta del pasadizo quemado, por donde se entra,
//   y su cámara en la torre, con el camastro junto al hogar;
// - la sala del trono (+18), a doble altura, partida por tres arcos sobre dos
//   pilares, con el estrado y el trono vacío contra el muro del patio, bajo la
//   ventana encendida, y a su pie la mesa del Rey, con él (world/rey_mesa.js);
//   por el grueso de los muros de poniente, del norte y de levante, a +22,5,
//   la galería, que se asoma a ella;
// - la terraza (+28): la caseta del caracol, la chimenea, el Caballero de la
//   Orden con su pendón, y la luna.
// Por fuera, en fortaleza.js.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, blocker, archedWall, barrelVault, husillo, solidGableRoof, beam, subtractRects } from './builders.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';
import { chest } from './level_souto.js';
import { FORT } from './fortaleza_medidas.js';
import { PIEDRA, muroVanos, ajimez, vano, saeteraDentro, sitial, tapiz, enlucido, zocalo } from './fortaleza_atrezo.js';
import { buildReyMesa, REY_MESA } from './rey_mesa.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);

const K = FORT.torre;
const { x0, x1, z0, z1, t } = K;
const ix0 = x0 + t,
  ix1 = x1 - t,
  iz0 = z0 + t,
  iz1 = z1 - t;
const cx = (x0 + x1) / 2;
const Y = K.pisos;
const TOP = K.terraza;
const SL = K.slab;
const M = K.muro;
const GA = K.gal;
const GY = K.galeria;
// (el arranque de la bóveda de la galería)
const GYS = GA.top - GA.paso / 2;
const C = K.caracol;
// las salas de cada planta: al norte del muro de carga y al sur; la galería y
// el caracol
const RN = ['homenaje_granero', 'homenaje_dormitorio', 'homenaje_camara', 'homenaje_trono'];
const RS = ['homenaje_almacen', 'homenaje_guardia', 'homenaje_consejo', 'homenaje_trono'];
const GAL = 'homenaje_galeria',
  CAR = 'homenaje_caracol',
  TRONO = 'homenaje_trono';
// el techo de cada planta (lo de debajo del forjado de la de encima)
const techo = (k) => (k < 3 ? Y[k + 1] : TOP) - SL;
// el suelo de cada planta, por donde empieza su cara de los muros
const suelo0 = (k) => (k ? Y[k] : 0);
// la piedra de cada planta, más clara según se sube
const TP = [
  [0.6, 0.58, 0.54],
  [0.68, 0.66, 0.62],
  [0.74, 0.71, 0.66],
  [0.76, 0.73, 0.68],
];
const SILLAR = PIEDRA.torre.map((v) => v * 1.2);
const CAL = [0.9, 0.86, 0.78];
// la caja del caracol, en el rincón del noroeste: su hueco (de ix0 a cx1, de
// iz0 a cz1), su centro y lo que ocupa con sus muros (a levante y al sur); lo
// alto de la caseta, sobre la terraza
const cx1 = ix0 + 2 * C.h,
  cz1 = iz0 + 2 * C.h;
const ccx = ix0 + C.h,
  ccz = iz0 + C.h;
const CAJA = [ix0, iz0, cx1 + C.t, cz1 + C.t];
const CT = TOP + 2.9;
// la galería: el paso por el grueso de cada muro y las hojas de dentro
const PASO = {
  n: [x0 + GA.hoja, z0 + GA.hoja, x1 - GA.hoja, z0 + GA.hoja + GA.paso],
  w: [x0 + GA.hoja, z0 + GA.hoja + GA.paso, x0 + GA.hoja + GA.paso, iz1],
  e: [x1 - GA.hoja - GA.paso, z0 + GA.hoja + GA.paso, x1 - GA.hoja, iz1],
};
// la puerta del pasadizo, en el muro de levante (a +12): su eje, su luz, su
// alto hasta el arranque y su flecha
const PZ = { z: FORT.rey.pasadizo, w: 1.2, h: 2.4, y: FORT.walk };

export function buildTorre(ctx, S, L) {
  W(S, ix0, iz0, ix1, iz1);
  muros(ctx, L);
  galeria(ctx, L);
  muroDeCarga(ctx);
  forjados(ctx);
  caracolTorre(ctx);
  almacen(ctx, L);
  guardia(ctx, L);
  consejo(ctx, L);
  camara(ctx, L);
  trono(ctx, L);
  terraza(ctx, L);
  zonas(L);
}

// Una cara suelta (sin colisión) en el plano de un muro, mirando a dir.
function cara(ctx, mat, dir, line, a, b, y0, y1, room, tint, o = {}) {
  if (b - a < 0.005 || y1 - y0 < 0.005) return;
  const bx = { n: [a, y0, line - 0.01, b, y1, line], s: [a, y0, line, b, y1, line + 0.01], w: [line - 0.01, y0, a, line, y1, b], e: [line, y0, a, line + 0.01, y1, b] }[dir];
  ctx.wb.box(mat, ...bx, { faces: dir, room, tint, sub: o.sub ?? 2, aoH: o.aoH ?? 1.6, baseY: o.baseY ?? y0, uv: o.uv });
}

// Las caras de dentro de un tramo de muro, planta a planta (R: las salas de
// ese lado), de y0 a y1.
function caras(ctx, dir, line, a, b, R, y0 = 0, y1 = TOP - SL) {
  for (let k = 0; k < 4; k++) {
    const ya = Math.max(y0, suelo0(k)),
      yb = Math.min(y1, techo(k));
    if (yb - ya > 0.01) cara(ctx, 'wallstone', dir, line, a, b, ya, yb, R[k], TP[k], { baseY: suelo0(k) });
  }
}

// ------------------------------------------------------------------------ los muros
// Los cuatro, de 2,6 m. Abajo, macizos hasta la galería (con la puerta de la
// escalinata al sur, a +6, y la del pasadizo a levante, a +12); por encima de
// ella, hasta la terraza. Por dentro, la cara de cada sala; la de fuera (salvo
// la del patio, que la pone aquí el muro con su puerta) en fortaleza.js.
function muros(ctx, L) {
  const wb = ctx.wb;
  // --- el del patio: con la puerta de la escalinata, de muro a muro (las
  // esquinas, con su cara de fuera y el cabo de la galería)
  {
    const D = K.puerta;
    const A = [0, 1, 2, 3].map((k) => ({ room: RS[k], y0: suelo0(k), y1: techo(k), tint: TP[k] }));
    muroVanos(ctx, 'x', ix0, ix1, iz1, z1, 0, TOP, [{ c: D.x, w: D.w, y: D.y, h: D.h, rise: D.w / 2, ring: 0.25, tint: SILLAR, room: RS[1] }], A, [{ room: null, y0: 0, y1: TOP, mat: 'ashlar', tint: PIEDRA.torre }], { mat: 'wallstone', tint: TP[1], sub: 2.6, revealRoom: RS[1] });
    for (const [a, b] of [
      [x0, ix0],
      [ix1, x1],
    ]) {
      ctx.col.add(a, 0, iz1, b, TOP, z1);
      cara(ctx, 'ashlar', 's', z1, a, b, 0, TOP, null, PIEDRA.torre, { sub: 2.6, aoH: 1.8, baseY: 0 });
    }
    // (el cabo de la galería de poniente y el de la de levante, contra él)
    for (const p of [PASO.w, PASO.e]) cara(ctx, 'ashlar', 'n', iz1, p[0], p[2], GY, GA.top, GAL, [0.7, 0.67, 0.62]);
  }
  // --- el del norte (al jardín), el de poniente y el de levante: hasta la
  // galería y por encima de ella
  ctx.col.add(x0, 0, z0, x1, GY, iz0);
  ctx.col.add(x0, 0, iz0, ix0, GY, iz1);
  ctx.col.add(ix1, 0, iz0, x1, GY, M.z0);
  for (const [a, b, c, d] of [
    [x0, z0, x1, iz0],
    [x0, iz0, ix0, iz1],
    [ix1, iz0, x1, iz1],
  ])
    ctx.col.add(a, GA.top, b, c, TOP, d);
  // (por dentro: en la caja del caracol, la suya; si no, la de cada sala;
  // por encima de la galería, la de la sala del trono)
  for (const [ya, yb] of [
    [0, GY],
    [GA.top, TOP],
  ]) {
    cara(ctx, 'ashlar', 's', iz0, ix0, cx1, ya, yb, CAR, [0.72, 0.7, 0.66], { baseY: 0 });
    cara(ctx, 'ashlar', 'e', ix0, iz0, cz1, ya, yb, CAR, [0.72, 0.7, 0.66], { baseY: 0 });
  }
  caras(ctx, 's', iz0, cx1 + C.t, ix1, RN, 0, GY);
  caras(ctx, 'e', ix0, cz1 + C.t, M.z0, RN, 0, GY);
  caras(ctx, 'e', ix0, M.z1, iz1, RS, 0, GY);
  caras(ctx, 'w', ix1, iz0, M.z0, RN, 0, GY);
  cara(ctx, 'wallstone', 's', iz0, cx1 + C.t, ix1, GA.top, TOP - SL, TRONO, TP[3], { baseY: Y[3] });
  cara(ctx, 'wallstone', 'e', ix0, cz1 + C.t, iz1, GA.top, TOP - SL, TRONO, TP[3], { baseY: Y[3] });
  cara(ctx, 'wallstone', 'w', ix1, iz0, iz1, GA.top, TOP - SL, TRONO, TP[3], { baseY: Y[3] });
  // --- el de levante, del muro de carga al del patio: la puerta del
  // pasadizo, a +12, con su arco de sillería oscura
  {
    const A = [0, 1, 2, 3].map((k) => ({ room: RS[k], y0: suelo0(k), y1: Math.min(techo(k), GY), tint: TP[k] }));
    muroVanos(ctx, 'z', M.z0, iz1, ix1, x1, 0, GY, [{ c: PZ.z, w: PZ.w, y: PZ.y, h: PZ.h, rise: PZ.w / 2, ring: 0.26, tint: SILLAR, archRooms: [RS[2], 'pasadizo_rey'] }], A, [], { tint: TP[2], revealRoom: RS[2] });
  }
  void wb;
}

// ------------------------------------------------------------------------ la galería
// En el grueso de los muros de poniente, del norte y de levante, a +22,5: la
// hoja de fuera (con sus óculos, la luna), el paso con su bóveda de cañón y la
// hoja de dentro, con sus vanos de tres en tres sobre la sala del trono (y en
// el rincón del noroeste, la puerta del caracol). Desde ella se ve la sala
// entera, al Rey a su mesa; no se baja.
function galeria(ctx, L) {
  const wb = ctx.wb;
  const gt = [0.7, 0.67, 0.62];
  const room = GAL;
  const h = GA.hoja;
  // las hojas de fuera (colisión y su cara al paso)
  ctx.col.add(x0, GY, z0, x1, GA.top, z0 + h);
  ctx.col.add(x0, GY, z0 + h, x0 + h, GA.top, iz1);
  ctx.col.add(x1 - h, GY, z0 + h, x1, GA.top, iz1);
  cara(ctx, 'ashlar', 's', z0 + h, PASO.n[0], PASO.n[2], GY, GYS + 0.05, room, gt, { baseY: GY });
  cara(ctx, 'ashlar', 'e', x0 + h, PASO.n[1], PASO.w[3], GY, GYS + 0.05, room, gt, { baseY: GY });
  cara(ctx, 'ashlar', 'w', x1 - h, PASO.n[1], PASO.e[3], GY, GYS + 0.05, room, gt, { baseY: GY });
  // (los cabos de la hoja de dentro del norte, en las bocas de los pasos de
  // los lados)
  cara(ctx, 'ashlar', 'w', PASO.w[2], PASO.n[3], iz0, GY, GYS + 0.05, room, gt, { baseY: GY });
  cara(ctx, 'ashlar', 'e', PASO.e[0], PASO.n[3], iz0, GY, GYS + 0.05, room, gt, { baseY: GY });
  // los suelos, las bóvedas y los cabos del paso de los lados contra el del
  // norte (lo de encima de la bóveda del norte, en sus bocas)
  for (const [p, ax] of [
    [PASO.n, 'x'],
    [PASO.w, 'z'],
    [PASO.e, 'z'],
  ]) {
    wb.box('flag', p[0], GY - 0.04, p[1], p[2], GY, p[3], { faces: 't', ao: false, room, sub: 2.4, uv: 0.7, tint: [0.68, 0.65, 0.6] });
    barrelVault(ctx, { x0: p[0], x1: p[2], z0: p[1], z1: p[3], ys: GYS, rise: GA.top - GYS, axis: ax, room, tint: [0.6, 0.58, 0.54], mat: 'ashlar', sub: 1.2 });
  }
  // las hojas de dentro, con sus vanos (A: la cara de menos t; B: la de más)
  const tri = (c, k = 1.9) => [c - k, c, c + k];
  const vanos = (cs) => cs.map((c) => ({ c, w: 1.2, y: GY + 0.85, h: 1.05, rise: 0.6, ring: 0.2 }));
  const ga = [{ room, y0: GY, y1: GA.top, tint: gt }];
  const tr = [{ room: TRONO, y0: GY, y1: GA.top, tint: TP[3] }];
  const ca = [{ room: CAR, y0: GY, y1: GA.top, tint: [0.72, 0.7, 0.66] }];
  const o = { mat: 'ashlar', tint: gt };
  // (del norte: el tramo de la caja del caracol, con su puerta, y el de la sala)
  const zi = PASO.n[3];
  const vN = vanos([...tri(-101.4), ...tri(-94.6)]);
  muroVanos(ctx, 'x', PASO.w[2], cx1 + C.t, zi, iz0, GY, GA.top, [{ c: ccx - C.h / 2, w: C.h, y: GY, h: 2.4, rise: 0 }], ga, ca, { ...o, revealRoom: room });
  muroVanos(ctx, 'x', cx1 + C.t, PASO.e[0], zi, iz0, GY, GA.top, vN, ga, tr, { ...o, revealRoom: room });
  // (de poniente: el tramo de la caja y el de la sala)
  const vW = vanos([-103.6, ...tri(-94.6)]);
  muroVanos(ctx, 'z', iz0, cz1 + C.t, PASO.w[2], ix0, GY, GA.top, [], ga, ca, o);
  muroVanos(ctx, 'z', cz1 + C.t, iz1, PASO.w[2], ix0, GY, GA.top, vW, ga, tr, { ...o, revealRoom: room });
  // (de levante)
  const vE = vanos([...tri(-105.45), ...tri(-94.6)]);
  muroVanos(ctx, 'z', iz0, iz1, ix1, PASO.e[0], GY, GA.top, vE, tr, ga, { ...o, revealRoom: room });
  // (que nadie se tire a la sala por ellos)
  for (const v of vN) blocker(ctx, v.c - v.w / 2, v.y, zi, v.c + v.w / 2, v.y + v.h + v.rise, iz0);
  for (const v of vW) blocker(ctx, PASO.w[2], v.y, v.c - v.w / 2, ix0, v.y + v.h + v.rise, v.c + v.w / 2);
  for (const v of vE) blocker(ctx, ix1, v.y, v.c - v.w / 2, PASO.e[0], v.y + v.h + v.rise, v.c + v.w / 2);
  // los óculos, por dentro (los de fuera, en fortaleza.js): la luna
  const yo = 23.4;
  for (const u of [cx - 4.8, cx + 4.8]) vano(ctx, 's', z0 + h, u, yo, 0.7, 0.4, { room, boca: 'luna', radius: 3.2, intensity: 0.45, ring: 0.1 });
  for (const u of [-103.8, -94.2]) {
    vano(ctx, 'e', x0 + h, u, yo, 0.7, 0.4, { room, boca: 'luna', radius: 3.2, intensity: 0.45, ring: 0.1 });
    vano(ctx, 'w', x1 - h, u, yo, 0.7, 0.4, { room, boca: 'luna', radius: 3.2, intensity: 0.45, ring: 0.1 });
  }
  // la luz: antorchas en la hoja de fuera, en los rincones y en medio
  P.wallTorch(ctx, x0 + h + 0.02, GY + 1.9, -99, 'e', { room, radius: 5 });
  P.wallTorch(ctx, x1 - h - 0.02, GY + 1.9, -99, 'w', { room, radius: 5 });
  P.wallTorch(ctx, cx, GY + 1.9, z0 + h + 0.02, 's', { room, radius: 5 });
  for (const [lx, lz] of [
    [(PASO.w[0] + PASO.w[2]) / 2, PASO.n[1] + 0.6],
    [(PASO.e[0] + PASO.e[2]) / 2, PASO.n[1] + 0.6],
    [(PASO.w[0] + PASO.w[2]) / 2, iz1 - 1],
    [(PASO.e[0] + PASO.e[2]) / 2, iz1 - 1],
  ])
    ctx.lights.push({ x: lx, y: GY + 1.6, z: lz, r: 1, g: 0.5, b: 0.22, radius: 4, intensity: 0.55, room });
  // lo que quedó: un ballestero de la guardia, con sus virotes, mirando a la
  // sala desde el último vano
  wb.setRoom(room);
  bakeCorpse(wb, PASO.e[0] + 0.35, GY, -92.4, -Math.PI / 2, 'sit', 'soldier', 7701);
  P.arrows(ctx, PASO.e[0] + 0.6, GY, -91.0, 5, 7702, 0.4);
  wb.setRoom(null);
  L.interact.push({ kind: 'item', id: 'i_virotes_trono', item: 'virote', n: 5, x: PASO.e[0] + 0.55, y: GY + 0.05, z: -90.2 });
}

// ------------------------------------------------------------------------ el muro de carga
// De poniente a levante, de abajo arriba: en cada planta, con su puerta de
// arco; en la sala del trono se abre en tres arcos de sillería sobre dos
// pilares con sus capiteles (y sus responsiones contra los muros), y lo alto,
// hasta el techo, carga las vigas.
function muroDeCarga(ctx) {
  const wb = ctx.wb;
  for (let k = 0; k < 3; k++) {
    const y0 = suelo0(k) - (k ? SL : 0),
      y1 = k < 2 ? Y[k + 1] - SL : Y[3];
    const v = { c: M.puertas[k], w: 1.4, y: suelo0(k), h: 2.3, rise: 0.7, ring: 0.25, tint: SILLAR };
    muroVanos(ctx, 'x', ix0, ix1, M.z0, M.z1, y0, y1, [v], [{ room: RN[k], y0: suelo0(k), y1: techo(k), tint: TP[k] }], [{ room: RS[k], y0: suelo0(k), y1: techo(k), tint: TP[k] }], { tint: TP[k] });
  }
  // la sala del trono: los tres arcos
  const y0 = Y[3];
  const ys = M.ys;
  const pl = M.pl / 2;
  const [pa, pb] = M.pilares;
  const resp = 0.4;
  const arcos = [
    [ix0 + resp, pa - pl],
    [pa + pl, pb - pl],
    [pb + pl, ix1 - resp],
  ].map(([l, r]) => ({ c: (l + r) / 2, w: r - l, h: ys - y0, rise: (r - l) / 2, ring: 0.4, tint: [0.8, 0.77, 0.72] }));
  archedWall(ctx, { axis: 'x', a0: ix0, a1: ix1, t0: M.z0, t1: M.z1, y0, y1: TOP - SL, openings: arcos, mat: 'ashlar', tint: [0.78, 0.75, 0.7], rooms: [TRONO, TRONO], sub: 2 });
  // los capiteles y las basas de los pilares, y las impostas de las
  // responsiones
  const tc = [0.72, 0.69, 0.64];
  for (const p of [pa, pb]) {
    wb.box('ashlar', p - pl - 0.16, ys - 0.32, M.z0 - 0.16, p + pl + 0.16, ys, M.z1 + 0.16, { ao: false, faces: 'tnsewb', room: TRONO, tint: tc });
    wb.box('ashlar', p - pl - 0.08, ys - 0.5, M.z0 - 0.08, p + pl + 0.08, ys - 0.32, M.z1 + 0.08, { ao: false, faces: 'nsewb', room: TRONO, tint: tc });
    wb.box('ashlar', p - pl - 0.14, y0, M.z0 - 0.14, p + pl + 0.14, y0 + 0.36, M.z1 + 0.14, { ao: false, faces: 'tnsew', room: TRONO, tint: tc });
    ctx.col.add(p - pl - 0.14, y0, M.z0 - 0.14, p + pl + 0.14, y0 + 0.36, M.z1 + 0.14);
  }
  for (const [a, b] of [
    [ix0, ix0 + resp + 0.16],
    [ix1 - resp - 0.16, ix1],
  ])
    wb.box('ashlar', a, ys - 0.32, M.z0 - 0.16, b, ys, M.z1 + 0.16, { ao: false, faces: 'tnsewb', room: TRONO, tint: tc });
}

// ------------------------------------------------------------------------ los forjados
// Tablas sobre vigas de norte a sur, de muro a muro de carga (sin la caja del
// caracol); el de la terraza, de losas, sobre vigas más gruesas.
function forjado(ctx, a, b, c, d, y, holes, roomUp, roomDown, o = {}) {
  const wb = ctx.wb;
  for (const m of subtractRects([a, b, c, d], holes)) {
    wb.box(o.mat ?? 'planks', m[0], y - 0.05, m[1], m[2], y, m[3], { faces: 't', ao: false, uv: 0.7, room: roomUp, tint: o.tint, sub: 2.5 });
    wb.box('wooddark', m[0], y - SL, m[1], m[2], y - SL + 0.02, m[3], { faces: 'b', ao: false, room: roomDown, tint: [0.5, 0.45, 0.4], sub: 2.5 });
    ctx.col.add(m[0], y - SL, m[1], m[2], y, m[3]).cam = true;
  }
  const paso = o.paso ?? 1.9,
    vw = o.vw ?? 0.16,
    vh = o.vh ?? 0.34;
  for (let x = a + paso / 2; x < c - 0.2; x += paso) {
    const cuts = holes.filter((h) => x > h[0] - 0.3 && x < h[2] + 0.3).map((h) => [x - 1, h[1] - 0.1, x + 1, h[3] + 0.1]);
    for (const sg of subtractRects([x - vw, b, x + vw, d], cuts)) if (sg[3] - sg[1] > 0.1) wb.box('timber', sg[0], y - SL - vh, sg[1], sg[2], y - SL, sg[3], { ao: false, faces: 'nsewb', room: roomDown, tint: o.vigaTint });
  }
}
function forjados(ctx) {
  for (let k = 1; k < 4; k++) {
    forjado(ctx, ix0, iz0, ix1, M.z0, Y[k], [CAJA], RN[k], RN[k - 1]);
    forjado(ctx, ix0, M.z1, ix1, iz1, Y[k], [], RS[k], RS[k - 1]);
  }
  // (sobre el muro de carga, el suelo de la sala del trono)
  ctx.wb.box('planks', ix0, Y[3] - 0.05, M.z0, ix1, Y[3], M.z1, { faces: 't', ao: false, uv: 0.7, room: TRONO });
  // la terraza: losas sobre vigas gruesas, de los muros a los arcos
  const wb = ctx.wb;
  for (const m of subtractRects([ix0, iz0, ix1, iz1], [CAJA])) {
    wb.box('flag', m[0], TOP - 0.05, m[1], m[2], TOP, m[3], { faces: 't', ao: false, uv: 0.8, sub: 3 });
    wb.box('wooddark', m[0], TOP - SL, m[1], m[2], TOP - SL + 0.02, m[3], { faces: 'b', ao: false, room: TRONO, tint: [0.46, 0.41, 0.36], sub: 2.5 });
    ctx.col.add(m[0], TOP - SL, m[1], m[2], TOP, m[3]).cam = true;
  }
  for (let x = ix0 + 1.15; x < ix1 - 0.3; x += 2.3)
    for (const [b, d] of [
      [x < cx1 + C.t + 0.3 ? cz1 + C.t : iz0, M.z0],
      [M.z1, iz1],
    ]) {
      wb.box('timber', x - 0.22, TOP - SL - 0.5, b, x + 0.22, TOP - SL, d, { ao: false, faces: 'nsewb', room: TRONO, tint: [0.62, 0.52, 0.42] });
      // (sus canes, contra el muro)
      for (const [za, zb] of [
        [b, b + 0.7],
        [d - 0.7, d],
      ])
        if (za !== M.z0 - 0.7 && zb !== M.z1 + 0.7) wb.box('wooddark', x - 0.18, TOP - SL - 0.82, za, x + 0.18, TOP - SL - 0.5, zb, { ao: false, faces: 'nsewb', room: TRONO });
    }
}

// ------------------------------------------------------------------------ el caracol
// En el rincón del noroeste, de la planta baja a la terraza: el husillo, de
// medio lado C.h, sesenta peldaños hasta la galería y veinte más hasta la
// caseta. Su caja tiene dos muros, a levante (con la puerta de cada planta,
// y abajo la de la planta baja) y al sur; la puerta de la galería da al norte,
// por la hoja de dentro de su muro. Por encima de la terraza, la caseta con su
// tejado a dos aguas.
function caracolTorre(ctx) {
  const wb = ctx.wb;
  const tint = [1, 1, 1];
  const r1 = 0.375,
    n1 = Math.round(GY / r1);
  const n2 = 20,
    r2 = (TOP - GY) / n2;
  husillo(ctx, { x: ccx, z: ccz, h: C.h, y0: 0, n: n1, rise: r1, a0: 0, walls: ['n', 's', 'e', 'w'], room: CAR, tint });
  husillo(ctx, { x: ccx, z: ccz, h: C.h, y0: GY, n: n2, rise: r2, a0: n1 * 22.5, walls: ['n', 's', 'e', 'w'], room: CAR, tint });
  // los muros de su caja, con sus puertas (por fuera, la cara de cada sala;
  // sobre la terraza, la de fuera)
  const fuera = [0, 1, 2, 3].map((k) => ({ room: RN[k], y0: suelo0(k), y1: techo(k), tint: TP[k] }));
  fuera.push({ room: null, y0: TOP, y1: CT, tint: PIEDRA.torre.map((v) => v * 1.1) });
  const dentro = [{ room: CAR, y0: 0, y1: CT, tint: [0.72, 0.7, 0.66] }];
  const puertas = [{ c: ccz + C.h / 2, w: C.h, y: 0, h: 3.0, rise: 0 }, ...[Y[1], Y[2], Y[3], TOP].map((y) => ({ c: ccz - C.h / 2, w: C.h, y, h: 2.4, rise: 0 }))];
  muroVanos(ctx, 'z', iz0, cz1 + C.t, cx1, cx1 + C.t, 0, CT, puertas, dentro, fuera, { mat: 'ashlar', tint: [0.72, 0.7, 0.66], revealRoom: CAR });
  muroVanos(ctx, 'x', ix0, cx1, cz1, cz1 + C.t, 0, CT, [], dentro, fuera, { mat: 'ashlar', tint: [0.72, 0.7, 0.66] });
  // la caseta: sus muros de poniente y del norte, sobre la terraza, y el tejado
  const ct = PIEDRA.torre.map((v) => v * 1.1);
  solid(ctx, 'ashlar', ix0 - C.t, TOP, iz0 - C.t, ix0, CT, cz1 + C.t, { faces: 'wns', sub: 2, aoH: 1.2, tint: ct });
  solid(ctx, 'ashlar', ix0, TOP, iz0 - C.t, cx1 + C.t, CT, iz0, { faces: 'ne', sub: 2, aoH: 1.2, tint: ct });
  cara(ctx, 'ashlar', 'e', ix0, iz0, cz1, TOP, CT, CAR, [0.72, 0.7, 0.66]);
  cara(ctx, 'ashlar', 's', iz0, ix0, cx1, TOP, CT, CAR, [0.72, 0.7, 0.66]);
  wb.box('ashlar', ix0 - C.t - 0.08, CT - 0.18, iz0 - C.t - 0.08, cx1 + C.t + 0.08, CT, cz1 + C.t + 0.08, { ao: false, faces: 'nsewb', tint: ct });
  solidGableRoof(ctx, ix0 - C.t, iz0 - C.t, cx1 + C.t, cz1 + C.t, CT, CT + 1.25, 'x', { overhang: 0.36, gableOverhang: 0.28, thick: 0.2, wallT: 0.4, room: CAR });
  ctx.col.add(ix0 - C.t, CT, iz0 - C.t, cx1 + C.t, CT + 0.4, cz1 + C.t).cam = true;
  wb.box('wooddark', ix0, CT - 0.02, iz0, cx1, CT, cz1, { faces: 'b', ao: false, room: CAR, tint: [0.42, 0.38, 0.34] });
  // la luz: una antorcha en cada vuelta, contra los muros de la caja
  // (a dos metros del peldaño que tienen debajo)
  for (const [y, dir, xx, zz] of [
    [4.1, 'n', ccx - 0.9, cz1 - 0.02],
    [8.65, 'w', cx1 - 0.02, ccz + 0.9],
    [16.1, 'n', ccx - 0.9, cz1 - 0.02],
    [20.65, 'w', cx1 - 0.02, ccz + 0.9],
    [26.05, 'w', cx1 - 0.02, ccz + 0.9],
  ])
    P.wallTorch(ctx, xx, y, zz, dir, { room: CAR, radius: 4.5 });
  for (const y of [5.2, 11.2, 17.2, 23.4, 29.4]) ctx.lights.push({ x: ccx, y, z: ccz, r: 1, g: 0.5, b: 0.2, radius: 3.6, intensity: 0.5, room: CAR });
}

// ------------------------------------------------------------------------ la planta baja
// El almacén (al sur): los toneles del vino, las tinajas del aceite, la leña;
// el pozo de la torre y la trampilla de la bajada a la cárcel de la fortaleza,
// cerrada con cadena; por dentro, la puerta del patio, cegada. El granero (al
// norte): los sacos, la muela de mano y los tablones.
function almacen(ctx, L) {
  const wb = ctx.wb;
  const rr = new RNG(7711);
  const [RA, RG] = [RS[0], RN[0]];
  for (const [a, b, c, d, room] of [
    [ix0, M.z1, ix1, iz1, RA],
    [cx1 + C.t, iz0, ix1, M.z0, RG],
    [ix0, cz1 + C.t, cx1 + C.t, M.z0, RG],
  ])
    wb.box('flag', a, -0.05, b, c, 0.02, d, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room, tint: [0.66, 0.63, 0.58] });
  // --- el almacén
  wb.setRoom(RA);
  for (let z = M.z1 + 1.0; z < iz1 - 3.5; z += 1.15) P.cask(ctx, ix1 - 0.8, 0, z, Math.PI / 2, { r: 0.52, room: RA });
  for (const [x, z] of [
    [-90.6, iz1 - 0.7],
    [-91.6, iz1 - 0.6],
    [-91.1, iz1 - 1.6],
  ])
    P.barrel(ctx, x, 0, z, {});
  for (let k = 0; k < 5; k++) P.jar(ctx, -106.8 + k * 0.82, 0, iz1 - 0.55, 1.15 + (k % 2) * 0.15, { room: RA, broken: k === 2 });
  P.firewood(ctx, ix0 + 0.7, 0, -97.6, Math.PI / 2, 4);
  P.firewood(ctx, ix0 + 0.7, 0, -99.4, Math.PI / 2, 3);
  for (const [x, z] of [
    [-100.8, M.z1 + 0.6],
    [-101.6, M.z1 + 0.7],
  ])
    for (let k = 0; k < 4; k++) wb.cylinder('rope', x, 0.02 + k * 0.07, z, 0.36 - k * 0.04, 0.36 - k * 0.04, 0.07, 10, { ao: false, room: RA });
  P.shelf(ctx, -93.6, 0, iz1 - 0.25, Math.PI, 1.8);
  for (let k = 0; k < 5; k++) P.ellipsoid(ctx, k % 2 ? 'bone' : 'straw', -94.3 + k * 0.35, 1.12, iz1 - 0.3, 0.14, 0.08, 0.14, k % 2 ? [0.95, 0.85, 0.55] : [0.75, 0.5, 0.3], { room: RA });
  // (la cecina, colgada de las vigas)
  for (let x = -97.6; x < -94; x += 1.2) {
    const z = -96.0 + rr.range(-0.3, 0.3);
    wb.box('burlap', x - 0.01, 3.2, z - 0.01, x + 0.01, Y[1] - SL - 0.34, z + 0.01, { ao: false, room: RA, tint: [0.7, 0.62, 0.5] });
    P.ellipsoid(ctx, 'flesh', x, 2.95, z, 0.18, 0.38, 0.12, [0.55, 0.36, 0.3], { room: RA });
  }
  // el pozo de la torre (en la mitad de poniente: bajo la de levante está la
  // cripta honda)
  {
    const px = -104.2,
      pz = -95.2;
    wb.cylinder('wallstone', px, 0, pz, 0.95, 0.95, 0.85, 12, { sub: 2, room: RA, tint: [0.62, 0.6, 0.56] });
    wb.cylinder('ashlar', px, 0.85, pz, 1.0, 1.0, 0.1, 12, { ao: false, room: RA });
    wb.cylinder('black', px, 0.9, pz, 0.72, 0.72, 0.02, 12, { ao: false, capTop: true, grime: false, room: RA });
    for (const s of [-1, 1]) wb.box('wooddark', px + s * 0.85 - 0.07, 0.95, pz - 0.07, px + s * 0.85 + 0.07, 2.6, pz + 0.07, { ao: false, room: RA });
    wb.box('wooddark', px - 1.0, 2.5, pz - 0.085, px + 1.0, 2.65, pz + 0.085, { ao: false, room: RA });
    wb.box('rope', px - 0.01, 1.3, pz - 0.01, px + 0.01, 2.5, pz + 0.01, { ao: false, room: RA, tint: [0.8, 0.7, 0.55] });
    wb.cylinder('planks', px, 1.0, pz, 0.16, 0.19, 0.3, 8, { ao: false, capBot: true, room: RA });
    ctx.col.add(px - 0.95, 0, pz - 0.95, px + 0.95, 1.0, pz + 0.95);
  }
  // la trampilla de la bajada a la cárcel de la fortaleza: de hierro, con su
  // cadena y su candado (fase 5)
  {
    const hx = -106.2,
      hz = -91.2;
    wb.box('iron', hx - 0.75, 0.02, hz - 0.6, hx + 0.75, 0.07, hz + 0.6, { ao: false, faces: 'tnsew', room: RA, tint: [0.62, 0.6, 0.58] });
    for (const z of [hz - 0.3, hz + 0.3]) wb.box('iron', hx - 0.78, 0.07, z - 0.05, hx + 0.78, 0.1, z + 0.05, { ao: false, room: RA });
    for (let k = 0; k < 14; k++) wb.geometry('iron', new THREE.TorusGeometry(0.035, 0.009, 3, 6), new THREE.Matrix4().compose(V(hx - 0.55 + k * 0.06, 0.12, hz), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, k % 2 ? Math.PI / 2 : 0, 0)), V(1, 1.4, 1)), { ao: false, room: RA });
    wb.box('iron', hx + 0.3, 0.07, hz - 0.12, hx + 0.5, 0.3, hz + 0.12, { ao: false, room: RA, tint: [0.5, 0.45, 0.4] });
    P.decal(ctx, hx, 0.03, hz, 2.0, 'splat', 0.4, { tint: [0.3, 0.32, 0.3] });
    L.interact.push({ kind: 'examine', id: 'x_bajada_torre', text: 'bajadaTorre', x: hx, y: 0, z: hz + 1.1, r: 1.5 });
  }
  // por dentro, la puerta del patio (bajo el rellano de la escalinata),
  // cegada: su arco, los tablones y la cadena
  {
    const dx = cx,
      zf = iz1;
    for (const s of [-1, 1]) wb.box('ashlar', dx + s * 1.0 - (s > 0 ? 0 : 0.28), 0, zf - 0.1, dx + s * 1.0 + (s > 0 ? 0.28 : 0), 2.0, zf, { ao: false, faces: 'nwetb', room: RA, tint: SILLAR });
    wb.box('ashlar', dx - 1.3, 2.0, zf - 0.1, dx + 1.3, 2.3, zf, { ao: false, faces: 'nwetb', room: RA, tint: SILLAR });
    wb.box('planks', dx - 1.0, 0, zf - 0.04, dx + 1.0, 2.0, zf - 0.01, { ao: false, faces: 'n', room: RA, tint: [0.42, 0.37, 0.32] });
    for (const yy of [0.5, 1.5]) wb.box('wooddark', dx - 1.1, yy - 0.09, zf - 0.09, dx + 1.1, yy + 0.09, zf - 0.04, { ao: false, faces: 'tnsewb', room: RA });
    P.chains(ctx, dx + 0.62, 1.7, zf - 0.12, 10, 0);
    L.interact.push({ kind: 'examine', id: 'x_almacen_dentro', text: 'almacenDentro', x: dx, y: 0, z: zf - 1.1, r: 1.4 });
  }
  bakeCorpse(wb, -99.6, 0, -92.0, 0.9, 'curl', 'villager', 7712);
  P.decal(ctx, -99.6, 0.03, -92.0, 1.8);
  wb.setRoom(null);
  P.wallTorch(ctx, ix0 + 0.02, 2.3, -96.2, 'e', { room: RA, radius: 7 });
  P.wallTorch(ctx, ix1 - 0.02, 2.3, -91.0, 'w', { room: RA, radius: 6 });
  P.hangingLamp(ctx, -97.8, Y[1] - SL, -95.0, { room: RA, len: 1.6, radius: 8 });
  ctx.rats.push({ x: -100.2, y: 0, z: -89.6, n: 3 });
  L.interact.push({ kind: 'item', id: 'i_ampolla5', item: 'ampolla', x: -93.0, y: 1.12, z: iz1 - 0.3 });
  L.enemies.push({ type: 'penitent', x: -99.0, y: 0, z: -93.0, yaw: 2.4, idle: 'eat', id: 'e_torre_almacen' });
  // --- el granero
  wb.setRoom(RG);
  // (los sacos, contra el muro del norte: libre la puerta del caracol)
  for (let x = -102.2; x < -91; x += 1.35) for (const z of [iz0 + 0.8, iz0 + 2.1]) P.sacks(ctx, x, 0, z, 5, Math.round(-x * 10 + z));
  for (const z of [-104.6, -103.3]) P.sacks(ctx, ix1 - 0.8, 0, z, 4, Math.round(-z * 7));
  {
    const qx = -95.6,
      qz = -104.6;
    wb.cylinder('wallstone', qx, 0, qz, 0.45, 0.45, 0.35, 10, { ao: false, room: RG });
    wb.cylinder('ashlar', qx, 0.36, qz, 0.42, 0.42, 0.14, 10, { ao: false, room: RG });
    beam(ctx, 'wooddark', V(qx + 0.3, 0.5, qz), V(qx + 0.3, 0.85, qz), 0.05, { room: RG });
    P.sacks(ctx, qx + 1.15, 0, qz + 0.5, 2, 7713);
    ctx.col.add(qx - 0.45, 0, qz - 0.45, qx + 0.45, 0.5, qz + 0.45);
  }
  for (let k = 0; k < 5; k++) wb.box('planks', -107.9, 0.02 + k * 0.08, -103.9 + (k % 2) * 0.08, -105.2, 0.09 + k * 0.08, -103.3 + (k % 2) * 0.08, { ao: false, room: RG, tint: [0.75, 0.68, 0.6] });
  ctx.col.add(-107.9, 0, -103.9, -105.2, 0.5, -103.2);
  bakeCorpse(wb, -98.6, 0, -103.2, 1.0, 'curl', 'soldier', 7714);
  P.bones(ctx, -97.2, 0, -102.6, 5, 7715, 0.5);
  wb.setRoom(null);
  P.wallTorch(ctx, -98.0, 2.3, M.z0 - 0.02, 'n', { room: RG, radius: 7 });
  P.wallTorch(ctx, ix1 - 0.02, 2.3, -106.0, 'w', { room: RG, radius: 6 });
  ctx.rats.push({ x: -101.0, y: 0, z: -107.6, n: 2 });
}

// ------------------------------------------------------------------------ la guardia de la torre
// La sala de la guardia (al sur), con la puerta de la escalinata atrancada por
// dentro: se desatranca desde aquí y es el atajo al patio de honor. El
// dormitorio (al norte), con sus jergones, y la puerta del caracol.
function guardia(ctx, L) {
  const wb = ctx.wb;
  const y = Y[1];
  const [RG, RD] = [RS[1], RN[1]];
  const D = K.puerta;
  // la puerta, de dos hojas, con su tranca por dentro
  L.interact.push({ kind: 'door', id: 'd_torre_patio', x: D.x, y: D.y, z: iz1 + 0.35, w: D.w, h: D.h + D.w / 2, arch: true, axis: 'x', mat: 'planks', double: true, hinge: 0, swing: 1, plane: iz1, inset: 0.08, lock: { type: 'barred', side: -1, msg: 'torrePatioAbre' }, barredMsg: 'puertaTorreAtrancada' });
  // --- la sala
  wb.setRoom(RG);
  const tx = -94.0,
    tz = -94.6;
  P.table(ctx, tx, y, tz, 2.2, 1.0, 0);
  P.bench(ctx, tx, y, tz - 0.85, 2.0, 0);
  P.bench(ctx, tx, y, tz + 0.85, 2.0, 0);
  P.jar(ctx, tx - 0.6, y + 0.8, tz + 0.2, 0.55, { room: RG });
  P.candles(ctx, tx + 0.5, y + 0.8, tz - 0.1, 3, 7721, { room: RG, radius: 6, intensity: 1.0, spread: 0.2 });
  for (let k = 0; k < 3; k++) wb.box('bone', tx - 0.2 + k * 0.09, y + 0.8, tz + 0.05 + (k % 2) * 0.06, tx - 0.16 + k * 0.09, y + 0.84, tz + 0.09 + (k % 2) * 0.06, { ao: false, room: RG });
  P.weaponRack(ctx, ix0 + 0.32, y, -96.0, Math.PI / 2);
  P.weaponRack(ctx, ix0 + 0.32, y, -92.4, Math.PI / 2);
  P.armorStand(ctx, ix1 - 0.7, y, -91.2, -Math.PI / 2, { room: RG });
  P.bench(ctx, -103.0, y, iz1 - 0.45, 2.4, 0);
  P.brazier(ctx, -101.4, y, -95.0, { room: RG });
  P.barrel(ctx, ix1 - 0.7, y, -99.6, {});
  bakeCorpse(wb, -96.8, y, -90.4, 2.6, 'back', 'soldier', 7722);
  P.decal(ctx, -96.8, y + 0.01, -90.4, 2.0);
  P.dropped(ctx, -95.4, y, -91.2, 1.4, 'shield');
  wb.setRoom(null);
  P.wallTorch(ctx, ix1 - 0.02, y + 2.3, -96.0, 'w', { room: RG, radius: 7, dyn: 2.2 });
  P.wallTorch(ctx, -100.4, y + 2.3, iz1 - 0.02, 'n', { room: RG, radius: 6 });
  P.hangingLamp(ctx, -97.0, techo(1), -95.4, { room: RG, len: 1.2, radius: 7.5 });
  // las saeteras, por dentro (las de fuera, en fortaleza.js)
  saeteraDentro(ctx, 'w', ix1, -105.4, y + 1.4, RD);
  saeteraDentro(ctx, 'e', ix0, -105.4 + 0.0001, y + 1.4, RD);
  for (const x of [cx - 6, cx + 6]) saeteraDentro(ctx, 's', iz0, x, y + 1.4, RD);
  L.enemies.push({ type: 'soldier', x: -95.6, y, z: -91.6, yaw: Math.PI, idle: 'stand', id: 'e_torre_guardia1' }, { type: 'soldier', x: -103.4, y, z: -97.6, yaw: 0.6, idle: 'wander', id: 'e_torre_guardia2' });
  // --- el dormitorio: jergones en el suelo, sus mantas, lo de cada uno
  wb.setRoom(RD);
  const rr = new RNG(7723);
  for (const [x, z, r] of [
    [-100.6, iz0 + 1.0, Math.PI / 2],
    [-98.2, iz0 + 1.0, Math.PI / 2 + 0.05],
    [-95.8, iz0 + 1.0, Math.PI / 2 - 0.04],
    [-93.4, iz0 + 1.0, Math.PI / 2],
    [ix1 - 0.6, -106.6, 0],
    [ix1 - 0.6, -104.1, 0.05],
  ])
    wb.at(x, y, z, r, () => {
      wb.box('straw', -0.42, 0, -0.95, 0.42, 0.14, 0.95, { ao: false, faces: 'tnsew', room: RD });
      if (rr.chance(0.75)) wb.box(rr.pick(['clothDark', 'burlap', 'leather']), -0.44, 0.14, -0.2 + rr.range(-0.2, 0.2), 0.44, 0.17, 0.85, { ao: false, faces: 'tnsew', room: RD, tint: [0.8, 0.76, 0.7] });
      wb.box('burlap', -0.3, 0.14, -0.9, 0.3, 0.3, -0.62, { ao: false, room: RD });
    });
  chest(ctx, -95.0, y, M.z0 - 0.5, Math.PI, RD, 1.1);
  P.barrel(ctx, -91.0, y, M.z0 - 0.6, {});
  P.sacks(ctx, -106.6, y, -102.6, 3, 7724);
  for (let k = 0; k < 4; k++) wb.cylinder('rope', -104.0, y + 0.02 + k * 0.07, M.z0 - 0.6, 0.34 - k * 0.04, 0.34 - k * 0.04, 0.07, 10, { ao: false, room: RD });
  wb.setRoom(null);
  P.wallTorch(ctx, -99.0, y + 2.3, M.z0 - 0.02, 'n', { room: RD, radius: 7 });
  P.lantern(ctx, ix1 - 0.3, y + 2.2, -102.6, -Math.PI / 2, true, { room: RD });
  L.enemies.push({ type: 'soldier', x: -99.2, y, z: -106.6, yaw: 0.4, idle: 'kneel', id: 'e_torre_dormitorio' });
}

// ------------------------------------------------------------------------ las cámaras privadas del Rey
// La sala del consejo (al sur), encalada: la mesa larga con el plano de la
// defensa (la ciudad en un pergamino, con sus fichas), los bancos, el sitial
// del Rey a la cabecera, los estantes de los mapas; a levante, la puerta del
// pasadizo, que el fuego dejó en pie por fuera y carbón por dentro: cede al
// primer empujón.
function consejo(ctx, L) {
  const wb = ctx.wb;
  const y = Y[2];
  const room = RS[2];
  // el enlucido y el zócalo
  const hz = [[PZ.z - 0.9, y - 0.1, PZ.z + 0.9, y + 3.4]];
  enlucido(ctx, 'plaster', 'w', ix1, M.z1, iz1, y + 1.0, techo(2), [...hz, [-94.3, y + 0.9, -92.5, y + 3.4]], room, { tint: CAL });
  enlucido(ctx, 'plaster', 'e', ix0, M.z1, iz1, y + 1.0, techo(2), [[-94.3, y + 0.9, -92.5, y + 3.4]], room, { tint: CAL });
  enlucido(ctx, 'plaster', 'n', iz1, ix0, ix1, y + 1.0, techo(2), [
    [-104.5, y + 0.9, -102.7, y + 3.4],
    [-93.3, y + 0.9, -91.5, y + 3.4],
  ], room, { tint: CAL });
  enlucido(ctx, 'plaster', 's', M.z1, ix0, ix1, y + 1.0, techo(2), [[M.puertas[2] - 1.0, y - 0.1, M.puertas[2] + 1.0, y + 3.4]], room, { tint: CAL });
  zocalo(ctx, 'w', ix1, M.z1, iz1, y + 0.03, 0.96, room, [[PZ.z - 0.9, PZ.z + 0.9]]);
  zocalo(ctx, 'e', ix0, M.z1, iz1, y + 0.03, 0.96, room);
  zocalo(ctx, 'n', iz1, ix0, ix1, y + 0.03, 0.96, room);
  zocalo(ctx, 's', M.z1, ix0, ix1, y + 0.03, 0.96, room, [[M.puertas[2] - 0.95, M.puertas[2] + 0.95]]);
  // las ventanas, por dentro: la luna
  for (const u of [cx - 5.6, cx + 5.6]) ajimez(ctx, 'n', iz1, u, y + 1.6, { h: 1.5, room, boca: 'luna', radius: 5, intensity: 0.5 });
  ajimez(ctx, 'e', ix0, -93.4, y + 1.6, { h: 1.5, room, boca: 'luna', radius: 5, intensity: 0.5 });
  ajimez(ctx, 'w', ix1, -93.4, y + 1.6, { h: 1.5, room, boca: 'luna', radius: 5, intensity: 0.5 });
  // la mesa del consejo con el plano de la defensa (de la sala del alcaide de
  // la torre vieja: el Rey la quiso aquí, y luego para su juego)
  wb.setRoom(room);
  const mx = -98.6,
    mz = -95.4;
  P.table(ctx, mx, y, mz, 4.6, 1.4, 0);
  P.bench(ctx, mx, y, mz - 1.0, 4.2, 0);
  P.bench(ctx, mx, y, mz + 1.0, 4.2, Math.PI);
  wb.box('clothWhite', mx - 1.9, y + 0.8, mz - 0.55, mx + 1.9, y + 0.815, mz + 0.55, { ao: false, faces: 't', tint: [0.86, 0.76, 0.56], room });
  const r2 = new RNG(7731);
  for (const [a2, b2, c2, d2] of [
    [-1.8, -0.5, 1.8, -0.46],
    [-1.8, 0.46, 1.8, 0.5],
    [-1.8, -0.5, -1.76, 0.5],
    [1.76, -0.5, 1.8, 0.5],
    [-1.1, -0.08, 1.3, -0.05],
    [0.1, -0.5, 0.135, 0.5],
    [-0.6, 0.12, 0.7, 0.15],
  ])
    wb.box('black', mx + a2, y + 0.816, mz + b2, mx + c2, y + 0.819, mz + d2, { ao: false, faces: 't', grime: false, room });
  for (let k = 0; k < 18; k++) {
    const ox = mx + r2.range(-1.6, 1.6),
      oz = mz + r2.range(-0.42, 0.42);
    wb.box(k < 11 ? 'clothRed' : 'bone', ox - 0.025, y + 0.816, oz - 0.025, ox + 0.025, y + 0.86, oz + 0.025, { ao: false, room });
  }
  P.jar(ctx, mx + 2.0, y + 0.8, mz + 0.3, 0.5, { room });
  P.candles(ctx, mx - 1.6, y + 0.8, mz + 0.25, 3, 7732, { room, radius: 6, intensity: 1.0, spread: 0.15 });
  P.candles(ctx, mx + 1.4, y + 0.8, mz - 0.3, 2, 7733, { room, radius: 5, intensity: 0.8, spread: 0.1 });
  // (a la cabecera, el sitial del Rey; los estantes de los mapas y los
  // arcones de los legajos)
  wb.at(mx - 2.85, y, mz, Math.PI / 2, () => {
    wb.box('wooddark', -0.32, 0, -0.28, 0.32, 0.47, 0.28, { ao: false, faces: 'tnsew', room });
    wb.box('clothRed', -0.27, 0.47, -0.24, 0.27, 0.52, 0.24, { ao: false, room, tint: [0.62, 0.38, 0.34] });
    wb.box('wooddark', -0.3, 0.47, -0.3, 0.3, 1.9, -0.22, { ao: false, faces: 'tnsewb', room, tint: [0.8, 0.66, 0.56] });
    wb.box('gold', -0.1, 1.72, -0.31, 0.1, 1.86, -0.29, { ao: false, room });
  });
  P.colOBB(ctx, mx - 2.85, mz, 0.32, 0.32, Math.PI / 2, y, y + 1.9);
  P.shelf(ctx, ix0 + 0.25, y, -96.4, Math.PI / 2, 1.8);
  P.shelf(ctx, ix0 + 0.25, y, -98.6, Math.PI / 2, 1.8);
  chest(ctx, -91.0, y, M.z1 + 0.5, 0, room, 1.1);
  chest(ctx, -106.6, y, iz1 - 0.6, Math.PI, room, 1.0);
  wb.setRoom(null);
  tapiz(ctx, -101.0, y + 4.6, M.z1 + 0.06, 0, 2.2, 2.6, { room, mat: 'clothRed' });
  P.banner(ctx, ix0 + 0.12, y + 4.4, -90.4, Math.PI / 2, 'bannerRey', 1.2, 2.6);
  P.hangingLamp(ctx, mx, techo(2), mz, { room, len: 1.5, radius: 8 });
  P.wallTorch(ctx, ix1 - 0.02, y + 2.3, -91.6, 'w', { room, radius: 6 });
  P.wallTorch(ctx, ix0 + 0.02, y + 2.3, -91.0, 'e', { room, radius: 6 });
  // la puerta del pasadizo: en pie, chamuscada (un grupo del mundo: se viene
  // abajo al empujarla), y ya caída, las hojas en el suelo, la tranca partida
  // y la ceniza
  {
    const xf = x1 - 0.1;
    const negro = [0.28, 0.24, 0.2];
    ctx.beginGroup('puerta:d_pasadizo_torre');
    wb.box('planks', xf - 0.04, y, PZ.z - PZ.w / 2, xf + 0.02, y + PZ.h, PZ.z + PZ.w / 2, { ao: false, faces: 'ew', tint: negro });
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = Math.PI - (i / n) * Math.PI,
        b = Math.PI - ((i + 1) / n) * Math.PI,
        r = PZ.w / 2;
      for (const [xx, s] of [
        [xf + 0.02, 1],
        [xf - 0.04, -1],
      ]) {
        const pts = [V(xx, y + PZ.h, PZ.z), V(xx, y + PZ.h + Math.sin(a) * r, PZ.z + Math.cos(a) * r), V(xx, y + PZ.h + Math.sin(b) * r, PZ.z + Math.cos(b) * r)];
        const nn = V(s, 0, 0);
        const nrm = new THREE.Vector3().subVectors(pts[1], pts[0]).cross(new THREE.Vector3().subVectors(pts[2], pts[0]));
        if (nrm.dot(nn) >= 0) wb.tri('planks', pts[0], pts[1], pts[2], { ao: false, tint: negro });
        else wb.tri('planks', pts[0], pts[2], pts[1], { ao: false, tint: negro });
      }
    }
    for (const yy of [y + 0.5, y + 1.4, y + 2.2]) wb.box('iron', xf + 0.02, yy - 0.05, PZ.z - PZ.w / 2, xf + 0.05, yy + 0.05, PZ.z + PZ.w / 2, { ao: false, faces: 'etb' });
    // (por dentro, el carbón: las tablas comidas y la tranca)
    wb.box('black', xf - 0.05, y + 0.2, PZ.z - PZ.w / 2 + 0.05, xf - 0.04, y + PZ.h - 0.2, PZ.z + PZ.w / 2 - 0.05, { ao: false, faces: 'w', grime: false, room, tint: [0.3, 0.28, 0.26] });
    wb.box('wooddark', xf - 0.22, y + 1.0, PZ.z - PZ.w / 2 - 0.12, xf - 0.06, y + 1.16, PZ.z + PZ.w / 2 + 0.12, { ao: false, room, tint: [0.16, 0.14, 0.12] });
    ctx.endGroup();
    ctx.beginGroup('puerta:d_pasadizo_torre:ruina');
    const rr = new RNG(7734);
    for (const [px, pz, ry, rz] of [
      [ix1 + 0.4, PZ.z - 0.2, 0.25, 0.12],
      [ix1 - 0.9, PZ.z + 0.35, -0.4, -0.08],
    ])
      wb.at(px, y + 0.06, pz, ry, () => {
        wb.push();
        wb.rotateZ(rz);
        wb.box('planks', -0.9, 0, -0.32, 0.9, 0.06, 0.32, { ao: false, faces: 'tnsewb', room, tint: negro });
        wb.box('iron', -0.6, 0.06, -0.33, -0.5, 0.08, 0.33, { ao: false, room });
        wb.pop();
      });
    for (let k = 0; k < 9; k++) wb.at(ix1 - 0.4 + rr.range(-1.2, 1.4), y + 0.02 + (k % 3) * 0.03, PZ.z + rr.range(-0.7, 0.7), rr.range(0, 3), () => wb.box('wooddark', -0.25, 0, -0.05, 0.25, 0.05, 0.05, { ao: false, room, tint: [0.14, 0.12, 0.11] }));
    for (const s of [-1, 1]) wb.at(ix1 - 1.4, y + 0.04, PZ.z + s * 0.6, s * 0.5, () => wb.box('wooddark', -0.45, 0, -0.07, 0.45, 0.14, 0.07, { ao: false, room, tint: [0.16, 0.14, 0.12] }));
    wb.box('black', ix1 - 2.2, y + 0.004, PZ.z - 1.0, x1 - 0.2, y + 0.009, PZ.z + 1.0, { ao: false, grime: false, faces: 't', room, tint: [0.45, 0.45, 0.45] });
    ctx.endGroup();
    L.interact.push({ kind: 'door', id: 'd_pasadizo_torre', label: 'Empujar la puerta', x: x1 - 0.32, y, z: PZ.z, w: PZ.w, h: PZ.h + PZ.w / 2, axis: 'z', mat: 'tabique', lock: { type: 'none', msg: 'pasadizoCede', sound: 'swingHeavy' }, dust: [0.2, 0.18, 0.16] });
  }
  L.enemies.push({ type: 'soldier', x: -91.8, y, z: -97.2, yaw: Math.PI / 2, idle: 'stand', id: 'e_torre_consejo' });
}

// La cámara del Rey en su torre (al norte): adonde se subió cuando la corte se
// levantó. El hogar en el muro de carga, encendido; el camastro junto a él, su
// silla, la mesa con la vela y la copa; su armadura de la frontera, su
// estandarte enrollado, los arcones que subió del palacio, el reclinatorio; y
// la dueña que llora junto a la cama.
function camara(ctx, L) {
  const wb = ctx.wb;
  const y = Y[2];
  const room = RN[2];
  const hx = M.pilares[0];
  const xa = cx1 + C.t;
  enlucido(ctx, 'plaster', 's', iz0, xa, ix1, y + 1.0, techo(2), [
    [-104.5, y + 0.9, -102.7, y + 3.4],
    [-93.3, y + 0.9, -91.5, y + 3.4],
  ], room, { tint: CAL });
  enlucido(ctx, 'plaster', 'w', ix1, iz0, M.z0, y + 1.0, techo(2), [[-105.5, y + 0.9, -103.7, y + 3.4]], room, { tint: CAL });
  enlucido(ctx, 'plaster', 'n', M.z0, ix0, ix1, y + 1.0, techo(2), [
    [M.puertas[2] - 1.0, y - 0.1, M.puertas[2] + 1.0, y + 3.4],
    [hx - 1.1, y - 0.1, hx + 1.1, techo(2)],
  ], room, { tint: CAL });
  zocalo(ctx, 's', iz0, xa, ix1, y + 0.03, 0.96, room);
  zocalo(ctx, 'w', ix1, iz0, M.z0, y + 0.03, 0.96, room);
  zocalo(ctx, 'n', M.z0, ix0, ix1, y + 0.03, 0.96, room, [
    [M.puertas[2] - 0.95, M.puertas[2] + 0.95],
    [hx - 1.0, hx + 1.0],
  ]);
  for (const u of [cx - 5.6, cx + 5.6]) ajimez(ctx, 's', iz0, u, y + 1.6, { h: 1.5, room, boca: 'luna', radius: 5, intensity: 0.5 });
  ajimez(ctx, 'w', ix1, -104.6, y + 1.6, { h: 1.5, room, boca: 'luna', radius: 5, intensity: 0.5 });
  ajimez(ctx, 'e', ix0, -104.6, y + 1.6, { h: 1.5, room, boca: 'luna', radius: 4, intensity: 0.4 });
  // el hogar, en el muro de carga (su cañón sube por el pilar de poniente de
  // los arcos hasta la chimenea de la terraza)
  P.hearth(ctx, hx, y, M.z0, 'n', { room, lit: true, ceil: techo(2), w: 1.9, radius: 9 });
  // el camastro, junto al fuego, con la manta revuelta
  wb.setRoom(room);
  {
    const bx = -105.6,
      bz = M.z0 - 1.0;
    wb.box('wooddark', bx - 1.0, y, bz - 0.45, bx + 1.0, y + 0.38, bz + 0.45, { ao: false, room });
    wb.box('straw', bx - 0.96, y + 0.38, bz - 0.42, bx + 0.96, y + 0.46, bz + 0.42, { ao: false, room, tint: [0.7, 0.62, 0.46] });
    wb.box('clothRed', bx - 0.7, y + 0.46, bz - 0.44, bx + 0.6, y + 0.52, bz + 0.44, { ao: false, faces: 'tnsew', room, tint: [0.6, 0.38, 0.34] });
    wb.box('linen', bx + 0.62, y + 0.46, bz - 0.3, bx + 0.94, y + 0.58, bz + 0.3, { ao: false, faces: 'tnsew', room });
    ctx.col.add(bx - 1.0, y, bz - 0.45, bx + 1.0, y + 0.52, bz + 0.45);
  }
  // su silla de cara al fuego, la mesa con la vela, la copa y el pan
  wb.at(-99.6, y, M.z0 - 1.6, -0.9, () => {
    wb.box('wooddark', -0.28, 0, -0.26, 0.28, 0.46, 0.26, { ao: false, faces: 'tnsew', room });
    wb.box('wooddark', -0.28, 0.46, -0.3, 0.28, 1.3, -0.22, { ao: false, faces: 'tnsewb', room });
  });
  P.colOBB(ctx, -99.6, M.z0 - 1.6, 0.3, 0.3, -0.9, y, y + 1.3);
  P.table(ctx, -98.2, y, M.z0 - 2.2, 0.9, 0.7, 0.2);
  P.candles(ctx, -98.1, y + 0.8, M.z0 - 2.15, 2, 7741, { room, radius: 4.5, intensity: 0.9, spread: 0.08 });
  wb.cylinder('gold', -98.4, y + 0.8, M.z0 - 2.35, 0.03, 0.025, 0.012, 8, { ao: false, capTop: true, room });
  wb.cylinder('gold', -98.4, y + 0.812, M.z0 - 2.35, 0.008, 0.008, 0.06, 6, { ao: false, room });
  wb.cylinder('gold', -98.4, y + 0.872, M.z0 - 2.35, 0.016, 0.034, 0.055, 8, { ao: false, capBot: true, room });
  // su armadura de la frontera y su estandarte enrollado, apoyado en el muro
  P.armorStand(ctx, ix1 - 0.7, y, -107.4, -Math.PI / 2, { room });
  beam(ctx, 'wooddark', V(ix1 - 0.4, y, -105.8), V(ix1 - 0.12, y + 3.6, -105.6), 0.07, { room });
  wb.cylinder('clothWhite', ix1 - 0.26, y + 1.6, -105.69, 0.12, 0.12, 1.5, 8, { ao: false, room, tint: [0.86, 0.84, 0.8] });
  // los arcones que subió del palacio
  for (const x of [-102.6, -100.8, -99.0]) chest(ctx, x, y, iz0 + 0.55, 0, room, 1.2);
  // el reclinatorio ante la cruz
  const rx = -92.6;
  wb.box('wooddark', rx - 0.4, y, M.z0 - 0.9, rx + 0.4, y + 0.18, M.z0 - 0.45, { ao: false, room });
  wb.box('wooddark', rx - 0.4, y, M.z0 - 0.2, rx + 0.4, y + 1.0, M.z0 - 0.06, { ao: false, room });
  wb.box('wooddark', rx - 0.45, y + 1.0, M.z0 - 0.3, rx + 0.45, y + 1.06, M.z0 + 0.0, { ao: false, room });
  wb.box('wooddark', rx - 0.06, y + 1.6, M.z0 - 0.06, rx + 0.06, y + 2.5, M.z0, { ao: false, room });
  wb.box('wooddark', rx - 0.3, y + 2.15, M.z0 - 0.06, rx + 0.3, y + 2.25, M.z0, { ao: false, room });
  ctx.col.add(rx - 0.45, y, M.z0 - 0.9, rx + 0.45, y + 1.0, M.z0);
  wb.setRoom(null);
  tapiz(ctx, -96.4, y + 4.4, iz0 + 0.06, 0, 1.8, 2.4, { room, mat: 'clothBlue' });
  P.wallTorch(ctx, ix1 - 0.02, y + 2.3, -102.6, 'w', { room, radius: 6 });
  L.interact.push({ kind: 'item', id: 'i_relicario3', item: 'relicario', x: -100.8, y: y + 0.66, z: iz0 + 0.55 });
  L.interact.push({ kind: 'examine', id: 'x_camastro_rey', text: 'camastroRey', x: -105.6, y, z: M.z0 - 2.0, r: 1.4 });
  L.enemies.push({ type: 'mourner', x: -103.4, y, z: M.z0 - 2.6, yaw: -Math.PI * 0.6, idle: 'stand', id: 'e_torre_camara' });
}

// ------------------------------------------------------------------------ la sala del trono
// A doble altura, encalada y pintada de despiece fingido sobre su zócalo de
// cortinaje; partida por los tres arcos; el estrado contra el muro del patio,
// con el trono vacío bajo la ventana encendida y sus candeleros; a su pie, la
// mesa del Rey y él, en su sitial, de espaldas a su trono; la alfombra del
// arco de en medio al estrado, las coronas de luz, los paños del Rey; arriba,
// la galería.
function trono(ctx, L) {
  const wb = ctx.wb;
  const y = Y[3];
  const room = TRONO;
  const E = K.estrado;
  // el enlucido pintado (hasta la galería; en el muro del patio, hasta
  // arriba) y el zócalo
  const yE = GY - 0.1;
  const vent = (u) => [u - 1.1, 19.2, u + 1.1, 22.95];
  enlucido(ctx, 'despiece', 'n', iz1, ix0, ix1, y + 1.8, TOP - SL - 0.4, [vent(cx - 4.8), vent(cx), vent(cx + 4.8)], room, { tint: CAL });
  enlucido(ctx, 'despiece', 's', iz0, cx1 + C.t, ix1, y + 1.8, yE, [vent(cx - 4.8), vent(cx), vent(cx + 4.8)], room, { tint: CAL });
  enlucido(ctx, 'despiece', 'e', ix0, cz1 + C.t, iz1, y + 1.8, yE, [vent(-103.8), vent(-99), vent(-94.2), [M.z0 - 0.45, y, M.z1 + 0.45, TOP]], room, { tint: CAL });
  enlucido(ctx, 'despiece', 'w', ix1, iz0, iz1, y + 1.8, yE, [vent(-103.8), vent(-99), vent(-94.2), [M.z0 - 0.45, y, M.z1 + 0.45, TOP]], room, { tint: CAL });
  zocalo(ctx, 'n', iz1, ix0, E.x0, y + 0.03, 1.75, room);
  zocalo(ctx, 'n', iz1, E.x1, ix1, y + 0.03, 1.75, room);
  zocalo(ctx, 'n', iz1, E.x0, E.x1, y + E.h + 0.02, 1.4, room);
  zocalo(ctx, 's', iz0, cx1 + C.t, ix1, y + 0.03, 1.75, room);
  zocalo(ctx, 'e', ix0, cz1 + C.t, iz1, y + 0.03, 1.75, room, [[M.z0 - 0.45, M.z1 + 0.45]]);
  zocalo(ctx, 'w', ix1, iz0, iz1, y + 0.03, 1.75, room, [[M.z0 - 0.45, M.z1 + 0.45]]);
  // las ventanas por dentro: la luna (la del trono, también: la vela que se
  // ve desde el patio son sus candeleros)
  for (const u of [cx - 4.8, cx, cx + 4.8]) {
    ajimez(ctx, 'n', iz1, u, 19.4, { h: 2.4, w: 0.6, room, boca: 'luna', radius: 6, intensity: 0.5 });
    ajimez(ctx, 's', iz0, u, 19.4, { h: 2.4, w: 0.6, room, boca: 'luna', radius: 6, intensity: 0.5 });
  }
  for (const u of [-103.8, -99, -94.2]) {
    ajimez(ctx, 'e', ix0, u, 19.4, { h: 2.4, w: 0.6, room, boca: 'luna', radius: 6, intensity: 0.5 });
    ajimez(ctx, 'w', ix1, u, 19.4, { h: 2.4, w: 0.6, room, boca: 'luna', radius: 6, intensity: 0.5 });
  }
  // el estrado, con su peldaño, y el trono vacío
  solid(ctx, 'ashlar', E.x0, y, E.z0, E.x1, y + E.h, iz1, { faces: 'tnsew', sub: 2, aoH: 0.5, room, mats: { t: 'flag' }, tint: [0.78, 0.75, 0.7] });
  solid(ctx, 'ashlar', E.x0 + 0.6, y, E.z0 - 0.42, E.x1 - 0.6, y + E.h / 2, E.z0, { faces: 'tnsew', sub: 2, aoH: 0.4, room, mats: { t: 'flag' }, tint: [0.78, 0.75, 0.7] });
  wb.box('clothRed', E.x0 + 0.3, y + E.h + 0.004, E.z0 + 0.2, E.x1 - 0.3, y + E.h + 0.012, iz1 - 0.1, { ao: false, faces: 't', room, tint: [0.62, 0.36, 0.32] });
  sitial(ctx, cx, y + E.h, iz1 - 1.3, Math.PI, room);
  // (el paño del Rey, detrás, a los lados de la ventana; los candeleros)
  for (const s of [-1, 1]) {
    P.banner(ctx, cx + s * 2.0, y + 6.6, iz1 - 0.12, Math.PI, 'bannerRey', 1.4, 4.6);
    const kx = cx + s * 2.9,
      kz = iz1 - 1.0;
    wb.cylinder('iron', kx, y + E.h, kz, 0.2, 0.2, 0.05, 8, { ao: false, capTop: true, room });
    wb.cylinder('iron', kx, y + E.h + 0.05, kz, 0.04, 0.04, 1.55, 6, { ao: false, room });
    wb.cylinder('iron', kx, y + E.h + 1.6, kz, 0.16, 0.12, 0.05, 8, { ao: false, capTop: true, room });
    P.candles(ctx, kx, y + E.h + 1.65, kz, 3, 7751 + s, { room, radius: 7, intensity: 1.1, spread: 0.07 });
    ctx.col.add(kx - 0.2, y + E.h, kz - 0.2, kx + 0.2, y + E.h + 1.7, kz + 0.2);
  }
  // la alfombra, del arco de en medio al estrado
  wb.box('clothRed', cx - 1.2, y + 0.004, M.z1, cx + 1.2, y + 0.012, E.z0 - 0.42, { ao: false, faces: 't', room, tint: [0.56, 0.3, 0.26] });
  // la mesa del Rey, a su pie, y la luz que cuelga sobre ella
  buildReyMesa(ctx, room);
  P.hangingLamp(ctx, REY_MESA.table.x, TOP - SL, REY_MESA.table.z, { room, len: TOP - SL - (y + 3.0), radius: 8 });
  // las coronas de luz y las antorchas de los pilares
  P.candleCrown(ctx, cx, y + 4.4, -105.4, TOP - SL - 0.5, { room, r: 1.3, n: 10, radius: 12, intensity: 1.0 });
  for (const x of [-103.8, -92.2]) P.candleCrown(ctx, x, y + 4.8, -95.6, TOP - SL - 0.5, { room, r: 1.0, n: 8, radius: 9, intensity: 0.8 });
  for (const p of M.pilares)
    for (const [z, dir] of [
      [M.z0 - 0.02, 'n'],
      [M.z1 + 0.02, 's'],
    ])
      P.wallTorch(ctx, p, y + 2.4, z, dir, { room, radius: 6 });
  // los paños y los tapices de los muros de los lados; los bancos de la corte
  // (entre las ventanas, por debajo de la galería)
  for (const [xx, rot] of [
    [ix0 + 0.12, Math.PI / 2],
    [ix1 - 0.12, -Math.PI / 2],
  ])
    P.banner(ctx, xx, y + 4.3, -91.0, rot, 'bannerRey', 1.2, 2.8);
  tapiz(ctx, ix0 + 0.06, y + 4.2, -96.6, Math.PI / 2, 2.2, 2.4, { room, mat: 'clothRed' });
  tapiz(ctx, ix1 - 0.06, y + 4.2, -96.6, -Math.PI / 2, 2.2, 2.4, { room, mat: 'clothRed' });
  wb.setRoom(room);
  for (const [bx, bz, rot] of [
    [ix0 + 0.5, -95.8, Math.PI / 2],
    [ix0 + 0.5, -92.2, Math.PI / 2],
    [ix1 - 0.5, -95.8, Math.PI / 2],
    [ix1 - 0.5, -92.2, Math.PI / 2],
  ]) {
    P.bench(ctx, bx, y, bz, 2.6, rot);
    P.colOBB(ctx, bx, bz, 1.3, 0.18, rot, y, y + 0.48);
  }
  // lo que quedó en la sala: un escabel volcado, una copa en el suelo
  P.stool(ctx, -101.6, y, -97.6, { room });
  wb.cylinder('gold', -100.4, y + 0.03, -98.4, 0.03, 0.03, 0.12, 8, { ao: false, room, tint: [0.8, 0.7, 0.5] });
  wb.setRoom(null);
  // el Rey, en su sitial (game/rey.js)
  L.enemies.push({ type: 'rey', x: REY_MESA.seat.x, y, z: REY_MESA.seat.z, yaw: REY_MESA.seat.yaw, idle: 'sit', id: 'n_rey' });
  L.interact.push({ kind: 'npc', npc: 'rey', id: 't_rey', x: REY_MESA.table.x, y, z: REY_MESA.table.z, r: 2.2 });
}

// ------------------------------------------------------------------------ la terraza
// Lo más alto del mapa, por encima del humo: la caseta del caracol en el
// rincón del noroeste (con la niebla en su puerta), la chimenea del hogar del
// Rey, el fanal apagado, la caldera de la pez, las piedras para tirar, los
// muertos de la última defensa; y junto al parapeto del norte, de espaldas,
// el Caballero de la Orden mirando la luna, con el pendón del Rey clavado a
// su lado.
function terraza(ctx, L) {
  const wb = ctx.wb;
  const R = TOP;
  const rr = new RNG(7761);
  // la chimenea, sobre el pilar de poniente de los arcos
  {
    const hx = M.pilares[0],
      zc = (M.z0 + M.z1) / 2;
    const ct = R + 2.6;
    solid(ctx, 'ashlar', hx - 0.7, R, zc - 0.6, hx + 0.7, ct, zc + 0.6, { faces: 'nsew', sub: 2, aoH: 1.0, tint: PIEDRA.torre.map((v) => v * 1.12) });
    wb.box('ashlar', hx - 0.8, ct, zc - 0.7, hx + 0.8, ct + 0.14, zc + 0.7, { ao: false, faces: 'nsewb', tint: PIEDRA.torre.map((v) => v * 1.2) });
    for (const [a, b, c, d] of [
      [hx - 0.8, zc - 0.7, hx + 0.8, zc - 0.48],
      [hx - 0.8, zc + 0.48, hx + 0.8, zc + 0.7],
    ])
      wb.box('wallstone', a, ct + 0.14, b, c, ct + 0.55, d, { ao: false, faces: 'nsewt', tint: [0.4, 0.37, 0.34] });
    wb.box('ashlar', hx - 0.86, ct + 0.55, zc - 0.76, hx + 0.86, ct + 0.68, zc + 0.76, { ao: false, faces: 'tnsewb', tint: PIEDRA.torre.map((v) => v * 1.2) });
    wb.box('black', hx - 0.6, ct + 0.14, zc - 0.48, hx + 0.6, ct + 0.15, zc + 0.48, { ao: false, faces: 't', grime: false });
    ctx.fires.push({ x: hx, y: ct + 0.4, z: zc, s: 0.7, smoke: true, light: false, embers: false, glow: false });
  }
  // el fanal, apagado (junto a la garita del sureste)
  {
    const bx = x1 - 4.4,
      bz = z1 - 4.4;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      wb.box('iron', bx + Math.cos(a) * 0.5 - 0.05, R, bz + Math.sin(a) * 0.5 - 0.05, bx + Math.cos(a) * 0.5 + 0.05, R + 1.3, bz + Math.sin(a) * 0.5 + 0.05, { ao: false });
    }
    wb.cylinder('iron', bx, R + 1.2, bz, 0.42, 0.72, 0.5, 8, { ao: false, capBot: true });
    wb.cylinder('black', bx, R + 1.66, bz, 0.68, 0.68, 0.02, 8, { ao: false, capTop: true, grime: false });
    ctx.col.add(bx - 0.75, R, bz - 0.75, bx + 0.75, R + 1.75, bz + 0.75);
    P.firewood(ctx, bx - 2.0, R, bz + 0.6, 0, 3);
  }
  // la caldera de la pez sobre su trébede
  {
    const kx = -103.4,
      kz = z1 - 2.6;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      beam(ctx, 'iron', V(kx + Math.cos(a) * 0.7, R, kz + Math.sin(a) * 0.7), V(kx, R + 1.4, kz), 0.06);
    }
    wb.cylinder('iron', kx, R + 0.45, kz, 0.42, 0.5, 0.55, 10, { ao: false, capBot: true });
    wb.cylinder('black', kx, R + 0.98, kz, 0.48, 0.48, 0.02, 10, { ao: false, capTop: true, grime: false });
    ctx.col.add(kx - 0.6, R, kz - 0.6, kx + 0.6, R + 1.1, kz + 0.6);
    P.firewood(ctx, kx - 0.1, R, kz, 0.4, 2);
  }
  // montones de piedras junto al parapeto
  for (const [px, pz] of [
    [x0 + 1.6, -97.0],
    [x0 + 1.6, -91.4],
    [x1 - 1.6, -99.0],
    [-100.6, z1 - 1.5],
  ]) {
    for (let k = 0; k < 7; k++) {
      const r = 0.18 + rr.range(0, 0.1);
      wb.geometry('wallstone', new THREE.SphereGeometry(1, 6, 5), new THREE.Matrix4().compose(V(px + rr.range(-0.45, 0.45), R + r * (k > 4 ? 2.4 : 0.9), pz + rr.range(-0.45, 0.45)), new THREE.Quaternion(), V(r, r * 0.85, r)), { ao: false });
    }
    ctx.col.add(px - 0.6, R, pz - 0.6, px + 0.6, R + 0.75, pz + 0.6);
  }
  // los muertos de la última defensa
  bakeCorpse(wb, -95.0, R, -92.6, 2.4, 'back', 'soldier', 7762);
  P.decal(ctx, -95.0, R + 0.01, -92.6, 2.4);
  P.decal(ctx, -101.0, R + 0.01, -99.4, 3.0);
  P.dropped(ctx, -106.2, R, -96.4, 0.8, 'helmet');
  P.arrows(ctx, -99.0, R, -104.6, 10, 7763, 2.4);
  // el Caballero de la Orden (game/caballero.js), junto al parapeto del norte,
  // mirando la luna; la niebla, en la puerta de la caseta
  const CB = K.caballero;
  L.enemies.push({ type: 'caballero', x: CB.x, y: R, z: CB.z, yaw: CB.yaw, idle: 'boss', boss: true, id: 'b_caballero' });
  L.interact.push({ kind: 'fog', id: 'f_caballero', boss: 'caballero', x: cx1 + C.t + 0.05, y: R, z: ccz - C.h / 2, w: 1.5, h: 2.3, axis: 'z', enter: 1 });
  // el pendón del Rey, clavado en su asta junto a él (a media vida lo
  // arranca); el tocón de piedra en el que se clava
  {
    const PD = K.pendon;
    wb.cylinder('wallstone', PD.x, R, PD.z, 0.24, 0.3, 0.32, 8, { ao: false, capTop: true });
    wb.cylinder('black', PD.x, R + 0.32, PD.z, 0.05, 0.05, 0.005, 6, { ao: false, capTop: true, grime: false });
    ctx.col.add(PD.x - 0.3, R, PD.z - 0.3, PD.x + 0.3, R + 0.32, PD.z + 0.3);
    ctx.beginGroup('pendon:caballero');
    wb.cylinder('wooddark', PD.x, R + 0.3, PD.z, 0.024, 0.024, 2.55, 6, { ao: false });
    wb.cylinder('iron', PD.x, R + 2.85, PD.z, 0.04, 0.0, 0.22, 4, { ao: false });
    wb.box('wooddark', PD.x - 0.02, R + 2.66, PD.z - 0.02, PD.x + 0.98, R + 2.7, PD.z + 0.02, { ao: false });
    P.banner(ctx, PD.x + 0.49, R + 2.66, PD.z + 0.04, 0, 'bannerRey', 0.95, 1.35);
    ctx.col.add(PD.x - 0.08, R + 0.3, PD.z - 0.08, PD.x + 0.08, R + 2.9, PD.z + 0.08);
    ctx.endGroup();
  }
  // la luz de la caseta, en su puerta
  P.wallTorch(ctx, cx1 + C.t + 0.02, R + 2.1, ccz + 0.55, 'e', { radius: 5 });
}

// ------------------------------------------------------------------------ zonas y mapa
function zonas(L) {
  const rS = [ix0, M.z0, ix1, iz1],
    rN = [ix0, iz0, ix1, M.z0];
  const z = (id, rects, atmo = 'interior', room = id) => L.zones.push({ id, rects, atmo, room: room ?? undefined });
  z(CAR, [[ix0, iz0, cx1, cz1, -0.5, CT]]);
  z('homenaje_terraza', [[x0 - 0.6, z0 - 0.6, x1 + 0.6, z1 + 0.6, TOP - 0.25, TOP + 12]], 'luna', null);
  z(GAL, [PASO.n, PASO.w, PASO.e].map((p) => [...p, GY - 0.3, GA.top]));
  z(TRONO, [[ix0, iz0, ix1, iz1, techo(2), TOP - SL]], 'sala');
  z(RS[2], [
    [...rS, techo(1), techo(2)],
    [ix1, PZ.z - 0.65, x1, PZ.z + 0.65, techo(1), Y[2] + 3.4],
  ]);
  z(RN[2], [[...rN, techo(1), techo(2)]]);
  z(RS[1], [
    [...rS, techo(0), techo(1)],
    [K.puerta.x - 1.0, iz1, K.puerta.x + 1.0, z1, techo(0), Y[1] + 3.6],
  ]);
  z(RN[1], [[...rN, techo(0), techo(1)]]);
  z(RS[0], [[...rS, -0.5, techo(0)]]);
  z(RN[0], [[...rN, -0.5, techo(0)]]);
  for (const id of [CAR, 'homenaje_terraza', GAL, TRONO, ...RS.slice(0, 3), ...RN.slice(0, 3)]) L.map.push({ id, r: [x0, z0, x1, z1], label: 'homenaje' });
}
