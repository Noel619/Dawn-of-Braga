// El gran salón de la fortaleza (PLAN_FORTALEZA.md, §5.4) y la galería en el
// grueso de su muro.
//
// La sala de la corte: catorce metros por casi cuarenta, a doble altura. Los
// cuatro arcos diafragma de sillería sostienen la armadura (la hilera, las
// correas, los pares y las soleras), como en las naves de arcos de la Sé; al
// norte, el estrado con el sitial vacío del Rey bajo su dosel y la mesa alta;
// al sur, el cancel de tablas y tras él el paso del servicio; en el muro de la
// muralla, el hogar con su campana; en el del patio, las puertas grandes; por
// abajo, el zócalo pintado de cortinaje. En medio, de rodillas, la Corte de los
// Infieles (game/corte.js).
//
// Por el grueso del muro de poniente, a +5,5, corre la galería (como la de
// Hedingham): de la torre de la reina, al norte, a la cocina, al sur, con sus
// arquerías de tres vanos sobre el salón (salvo en el tramo del hogar) y sus
// ventanas a la luna. Desde ella se ve a la corte de rodillas sin que te vea;
// abajo no se baja (la sala, cerrada, es la de la pelea). En el tramo del
// estrado, el paje del tambor.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, archRing, barrelVault, blocker } from './builders.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';
import { FORT } from './fortaleza_medidas.js';
import { PIEDRA, tri, cara, ajimez, vano, muroVanos, sitial, tapiz, pieza, armadura, lineaTejado, zocalo, cara1 } from './fortaleza_atrezo.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);
const F1 = FORT.F1;
const PISO = [0.74, 0.71, 0.66];

export function buildSalon(ctx, S, L) {
  salon(ctx, S, L);
  galeria(ctx, L);
  corte(L);
}

// Los tramos del salón entre sus arcos (de norte a sur): [z0, z1, centro]
export function tramosSalon() {
  const Sa = FORT.salon;
  const cuts = [Sa.z0, ...Sa.arcos.flatMap((z) => [z - 0.35, z + 0.35]), Sa.z1];
  const out = [];
  for (let i = 0; i < cuts.length; i += 2) out.push([cuts[i], cuts[i + 1], (cuts[i] + cuts[i + 1]) / 2]);
  return out;
}

// ------------------------------------------------------------------------ el salón
function salon(ctx, S, L) {
  const wb = ctx.wb;
  const Sa = FORT.salon,
    E = FORT.eave;
  const room = 'salon';
  const { x0, x1, z0, z1 } = Sa;
  const xc = (x0 + x1) / 2;
  const tint = [0.8, 0.77, 0.72];
  W(S, x0, z0, x1, z1);
  // el suelo enlosado
  wb.box('flag', x0, -0.05, z0, x1, 0.02, z1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room, tint: PISO });
  // el muro del norte (contra la torre de la reina y su sala) y el del sur
  // (el del servicio, con su puerta a la despensa)
  pieza(ctx, 'wallstone', x0, 0, z0 - 1.2, FORT.reina.x0, E, z0, [['s', room]], { tint });
  // (su cara, un dedo por delante: detrás asoma el canto del alero del tejado
  // de la reina, que llega hasta aquí)
  pieza(ctx, 'wallstone', FORT.reina.x0, 0, z0 - 1.2, x1, E, z0, [['n', 'estrado_damas', 0, F1], ['n', 'reina_alta', F1, E]], { tint });
  wb.box('wallstone', FORT.reina.x0, 0, z0, x1, E, z0 + 0.012, { faces: 's', room, tint, sub: 2.2, aoH: 2.5 });
  muroVanos(ctx, 'x', x0, x1, z1, z1 + 2.4, 0, E, [{ c: Sa.servicio, w: 1.6, y: 0, h: 2.6, rise: 0.8, ring: 0.28 }], [{ room, y0: 0, y1: E }], [{ room: 'despensa', y0: 0, y1: F1 }], { tint, revealRoom: 'despensa' });
  W(S, Sa.servicio - 0.8, z1 - 0.3, Sa.servicio + 0.8, z1 + 2.7);
  L.interact.push({ kind: 'door', id: 'd_servicio', x: Sa.servicio, y: 0, z: z1 + 1.2, w: 1.6, h: 3.4, arch: true, axis: 'x', mat: 'planks', hinge: -1, swing: 1, plane: z1, inset: 0.06, lock: { type: 'none' } });
  // el muro del patio, por dentro, hasta la armadura (el tejado pasa por
  // encima de él hasta el alero del patio)
  const T = lineaTejado((x0 + FORT.patio.x0) / 2, (FORT.patio.x0 - x0) / 2, E, Sa.ridge);
  wb.box('wallstone', x1, E, z0, x1 + 0.01, T.yb(x1) + 0.02, z1, { faces: 'w', room, tint, sub: 2.2, aoH: 2.5, baseY: 0 });
  // el estrado: dos gradas de tablas, de muro a muro
  const E0 = { y: Sa.estrado.y, z1: z0 + 3.6 };
  solid(ctx, 'planks', x0, 0, z0, x1, E0.y, E0.z1 - 0.4, { faces: 'ts', ao: false, sub: 2, room, tint: [0.7, 0.62, 0.55] });
  solid(ctx, 'planks', x0, 0, E0.z1 - 0.4, x1, E0.y / 2, E0.z1, { faces: 'ts', ao: false, sub: 2, room, tint: [0.7, 0.62, 0.55] });
  // el sitial del Rey bajo su dosel; la mesa alta a los lados
  sitial(ctx, xc, E0.y, z0 + 1.15, 0, room);
  P.banner(ctx, xc, E0.y + 5.0, z0 + 0.08, 0, 'bannerRey', 2.6, 4.2);
  wb.box('clothRed', xc - 1.7, E0.y + 4.4, z0, xc + 1.7, E0.y + 4.52, z0 + 1.9, { ao: false, faces: 'tbnsew', room });
  wb.box('clothRed', xc - 1.7, E0.y + 3.95, z0 + 1.8, xc + 1.7, E0.y + 4.4, z0 + 1.9, { ao: false, faces: 'tbnsew', room, tint: [0.8, 0.8, 0.8] });
  for (const s of [-1, 1]) wb.box('gold', xc + s * 1.65 - 0.04, E0.y + 0.3, z0 + 1.82, xc + s * 1.65 + 0.04, E0.y + 4.4, z0 + 1.9, { ao: false, room });
  wb.setRoom(room);
  for (const s of [-1, 1]) {
    const tx = xc + s * 4.0,
      tz = z0 + 2.2;
    P.table(ctx, tx, E0.y, tz, 3.4, 1.0, 0, {});
    wb.box('linen', tx - 1.72, E0.y + 0.8, tz - 0.52, tx + 1.72, E0.y + 0.82, tz + 0.52, { ao: false, faces: 'tnsew', room, tint: [0.86, 0.84, 0.8] });
    P.bench(ctx, tx, E0.y, tz - 0.85, 3.0, 0);
    P.candles(ctx, tx + s * 1.2, E0.y + 0.82, tz, 4, 6302 + s, { room, radius: 6, intensity: 0.9 });
  }
  P.jar(ctx, xc + 4.6, E0.y + 0.82, z0 + 2.1, 0.6, { room });
  wb.setRoom(null);
  L.interact.push({ kind: 'note', id: 'n_mayordomo', note: 'mayordomo', x: xc + 3.3, y: E0.y + 0.84, z: z0 + 2.3, model: 'paper' });
  // los arcos diafragma: sus responsiones y el arco de sillería, con su
  // hastial hasta la armadura
  const spring = 4.0,
    rise = 5.2,
    ring = 0.6;
  const yAt = (x) => T.yb(x) + 0.04;
  for (const z of Sa.arcos) {
    archRing(ctx, { axis: 'x', c: xc, w: x1 - x0 - 1.2, y0: spring, rise, ring, t0: z - 0.35, t1: z + 0.35, top: E - 0.24, clip: [x0, x1], piers: true, mat: 'ashlar', spMat: 'ashlar', rooms: [room, room], tint: [0.7, 0.67, 0.62], spTint: tint });
    for (const [xa, xb] of [
      [x0, x0 + 0.6],
      [x1 - 0.6, x1],
    ]) {
      solid(ctx, 'ashlar', xa, 0, z - 0.4, xb, spring, z + 0.4, { faces: 'nsew', sub: 2, aoH: 1.2, room, tint });
      wb.box('ashlar', xa - (xa === x0 ? 0 : 0.12), spring - 0.25, z - 0.52, xb + (xa === x0 ? 0.12 : 0), spring, z + 0.52, { ao: false, faces: 'tbnsew', room, tint: [0.66, 0.63, 0.58] });
    }
    // (por encima, hasta la armadura)
    const yE = E - 0.24;
    for (const [zz, dir] of [
      [z - 0.35, -1],
      [z + 0.35, 1],
    ]) {
      const n = V(0, 0, dir);
      tri(wb, 'ashlar', V(x0, yE, zz), V(x1, yE, zz), V(T.uc, yAt(T.uc), zz), n, { ao: false, room, tint });
      tri(wb, 'ashlar', V(x1, yE, zz), V(x1, yAt(x1), zz), V(T.uc, yAt(T.uc), zz), n, { ao: false, room, tint });
    }
    P.wallTorch(ctx, x0 + 0.62, 2.6, z, 'e', { room });
    P.wallTorch(ctx, x1 - 0.62, 2.6, z, 'w', { room });
  }
  // la armadura: las soleras, los pares, la hilera y dos correas por faldón,
  // de arco a arco; la luz de las coronas, que sube a ella
  armadura(ctx, { axis: 'z', s0: z0, s1: z1, ui0: x0, ui1: x1, T, room, correas: 2, paso: 0.66, skip: Sa.arcos.map((z) => [z - 0.5, z + 0.5]) });
  for (const [, , c] of tramosSalon()) ctx.lights.push({ x: T.uc + 1.2, y: 9.2, z: c, r: 1, g: 0.56, b: 0.3, radius: 7.5, intensity: 0.55, room });
  // las ventanas del patio, por dentro
  for (const z of [-84, -76, -60, -52]) ajimez(ctx, 'w', x1, z, 6.9, { h: 1.25, room });
  for (const z of [-80, -56]) vano(ctx, 'w', x1, z, 2.4, 0.42, 0.9, { room });
  // el hogar de la muralla, con su campana de piedra
  const hz = -58.7;
  {
    const hx = x0;
    solid(ctx, 'ashlar', hx, 0, hz - 1.6, hx + 0.9, 0.35, hz + 1.6, { faces: 'tnse', ao: false, sub: 2, room, tint: [0.56, 0.52, 0.48], mats: { t: 'flag' } });
    for (const s of [-1, 1]) solid(ctx, 'ashlar', hx, 0, hz + s * 1.5 - 0.2, hx + 1.0, 1.9, hz + s * 1.5 + 0.2, { faces: 'tnsew', sub: 2, room, tint: [0.7, 0.67, 0.62] });
    solid(ctx, 'ashlar', hx, 1.9, hz - 1.8, hx + 1.15, 2.4, hz + 1.8, { faces: 'tnsewb', sub: 2, room, tint: [0.66, 0.63, 0.58] });
    const hood = [V(hx + 1.15, 2.4, hz - 1.8), V(hx + 1.15, 2.4, hz + 1.8), V(hx + 0.2, 7.2, hz + 0.8), V(hx + 0.2, 7.2, hz - 0.8)];
    cara(wb, 'ashlar', hood[0], hood[1], hood[2], hood[3], V(1, 0.3, 0), { ao: false, room, tint: [0.58, 0.55, 0.5] });
    tri(wb, 'ashlar', V(hx, 2.4, hz - 1.8), hood[0], hood[3], V(0, 0, -1), { ao: false, room, tint: [0.54, 0.5, 0.46] });
    tri(wb, 'ashlar', V(hx, 2.4, hz + 1.8), hood[1], hood[2], V(0, 0, 1), { ao: false, room, tint: [0.54, 0.5, 0.46] });
    // (el cañón, por delante del muro hasta la armadura)
    wb.box('ashlar', hx, 7.2, hz - 0.8, hx + 0.2, T.yb(hx + 0.2), hz + 0.8, { faces: 'ens', sub: 2, ao: false, room, tint: [0.56, 0.53, 0.48] });
    wb.box('black', hx + 0.01, 0.35, hz - 1.3, hx + 0.02, 1.9, hz + 1.3, { faces: 'e', ao: false, grime: false, room });
    wb.cylinder('ember', hx + 0.5, 0.35, hz, 0.7, 0.6, 0.04, 10, { ao: false, grime: false, capTop: true, room });
    P.firewood(ctx, hx + 0.55, 0.35, hz + 0.1, 0, 2);
    ctx.fires.push({ x: hx + 0.5, y: 0.45, z: hz, s: 1.0, smoke: true, embers: true });
    ctx.lights.push({ x: hx + 1.6, y: 1.4, z: hz, r: 1, g: 0.42, b: 0.14, radius: 13, intensity: 1.6, room });
    if (ctx.dynLights) ctx.dynLights.push({ x: hx + 1.2, y: 1.4, z: hz, intensity: 6, range: 12 });
    ctx.col.add(hx, 0, hz - 1.8, hx + 1.15, 2.4, hz + 1.8);
  }
  // el cancel: dos paneles de tablas y uno en medio, con los dos pasos, y el
  // paso del servicio detrás
  const zs = z1 - 3.2;
  {
    const pasos = [x0 + 4.0, x1 - 3.0];
    let cur = x0;
    for (const p of [...pasos, x1 + 0.8]) {
      const a = cur,
        b = Math.min(x1, p - 0.8);
      if (b - a > 0.1) {
        solid(ctx, 'planks', a, 0, zs, b, 3.0, zs + 0.12, { faces: 'tnsew', ao: false, sub: 2, room, tint: [0.62, 0.52, 0.44] });
        wb.box('wooddark', a, 3.0, zs - 0.06, b, 3.2, zs + 0.18, { ao: false, faces: 'tbnsew', room });
        for (let x = a; x <= b + 0.01; x += (b - a) / Math.max(1, Math.round((b - a) / 1.2))) wb.box('wooddark', x - 0.07, 0, zs - 0.05, x + 0.07, 3.0, zs + 0.17, { ao: false, faces: 'nsew', room });
      }
      cur = p + 0.8;
    }
    for (const p of pasos) wb.box('wooddark', p - 0.85, 2.4, zs - 0.06, p + 0.85, 2.6, zs + 0.18, { ao: false, faces: 'tbnsew', room });
    ctx.lights.push({ x: Sa.servicio, y: 2.4, z: z1 - 1.6, r: 1, g: 0.5, b: 0.22, radius: 5, intensity: 0.7, room });
    P.wallTorch(ctx, x1 - 0.02, 2.4, z1 - 1.6, 'w', { room });
  }
  // el zócalo pintado: por los cuatro muros, menos tras las responsiones, el
  // hogar, las puertas y el estrado (allí, encima)
  {
    const resp = Sa.arcos.map((z) => [z - 0.42, z + 0.42]);
    zocalo(ctx, 'e', x0, z0, zs, 0.04, 1.75, room, [...resp, [hz - 1.85, hz + 1.85]]);
    zocalo(ctx, 'w', x1, E0.z1, zs, 0.04, 1.75, room, [...resp, [Sa.puerta - 1.95, Sa.puerta + 1.95]]);
    zocalo(ctx, 'w', x1, z0, E0.z1 - 0.4, E0.y + 0.02, 1.75, room);
    zocalo(ctx, 'e', x0, z0, E0.z1 - 0.4, E0.y + 0.02, 1.75, room);
    zocalo(ctx, 's', z0, x0, x1, E0.y + 0.02, 1.75, room, [[xc - 1.75, xc + 1.75]]);
    zocalo(ctx, 'n', z1, x0, x1, 0.04, 1.75, room, [[Sa.servicio - 1.15, Sa.servicio + 1.15]]);
  }
  // las mesas largas de caballetes, contra los muros, con sus bancos
  wb.setRoom(room);
  for (const [tx, s] of [
    [x0 + 1.5, 1],
    [x1 - 1.5, -1],
  ]) {
    for (const z of [-76.3, -72.4, -64.6, -60.7, -52.6]) {
      if (s > 0 && z > -62) continue;
      P.table(ctx, tx, 0, z, 3.4, 0.9, Math.PI / 2, {});
      P.bench(ctx, tx + s * 0.8, 0, z, 3.0, Math.PI / 2);
      wb.box('linen', tx - 0.47, 0.8, z - 1.7, tx + 0.47, 0.82, z + 1.7, { ao: false, faces: 't', room, tint: [0.7, 0.68, 0.64] });
    }
  }
  P.jar(ctx, x0 + 1.6, 0.82, -73.1, 0.6, { room });
  P.jar(ctx, x1 - 1.4, 0.82, -61.2, 0.7, { room });
  P.dropped(ctx, x1 - 1.5, 0.82, -72.0, 0.6, 'sword');
  wb.setRoom(null);
  // las coronas de luz, colgadas de la hilera (sobre la corte), y los paños
  // del Rey
  for (const z of [-82.3, -74.3, -66.5]) {
    P.candleCrown(ctx, xc, 5.0, z, T.yb(xc) - 0.5, { room, r: 1.1, n: 10 });
    ctx.lights.push({ x: xc, y: 4.6, z, r: 1, g: 0.6, b: 0.28, radius: 11, intensity: 1.1, room });
  }
  for (const z of [-80.1, -72.3, -64.5]) P.banner(ctx, x1 - 0.12, 6.8, z, -Math.PI / 2, 'bannerRey', 1.2, 2.8);
  for (const z of [-78.2 + 3.9, -70.4 + 3.9]) tapiz(ctx, x0 + 0.06, 5.0, z - 2.0, Math.PI / 2, 2.6, 2.6, { room, mat: 'clothRed' });
  L.zones.push({ id: 'salon', rects: [[x0, z0, x1, z1, -1, 15]], atmo: 'sala', room });
  L.map.push({ id: 'salon', r: [x0 - 2.4, z0 - 1.2, x1 + 1.2, z1 + 2.4] });
}

// ------------------------------------------------------------------------ la galería
// El muro de poniente del salón, de la torre de la reina a la cocina, con la
// galería en su grueso: el macizo de abajo (su suelo), la hoja de fuera (con
// las ventanas, la luna), la de dentro con sus arquerías al salón, la bóveda
// de cañón y el macizo de arriba (el adarve). Sigue al norte por el muro de la
// torre de la reina (fortaleza_reina.js) y al sur por el de la cocina
// (fortaleza_alas.js), con sus puertas.
function galeria(ctx, L) {
  const wb = ctx.wb;
  const G = FORT.galeria;
  const Sa = FORT.salon;
  const room = 'salon_galeria';
  const X0 = FORT.x0,
    X1 = FORT.x0 + FORT.t;
  const za = FORT.torres.NO.z1,
    zb = FORT.torres.SO.z0;
  const Td = FORT.talud;
  const Lt = PIEDRA.lienzo,
    gt = [0.74, 0.71, 0.66];
  const face = (f, x0, y0, z0, x1, y1, z1, rm, baseY, tint = Lt, o = {}) => wb.box(o.mat ?? 'wallstone', x0, y0, z0, x1, y1, z1, { faces: f, room: rm, sub: 2.2, aoH: 2.5, baseY, tint, mats: o.mats });
  // el macizo de abajo y el suelo de la galería
  ctx.col.add(X0, 0, za, X1, G.y, zb);
  face('w', X0, Td.h - 0.05, za, X1, G.y, zb, null, 0);
  face('e', X0, 0, za, X1, G.y, zb, 'salon', 0);
  wb.box('flag', G.x0, G.y - 0.04, za, G.x1, G.y, zb, { faces: 't', ao: false, room, sub: 2.4, uv: 0.7, tint: [0.7, 0.67, 0.62] });
  // la hoja de fuera
  ctx.col.add(X0, G.y, za, G.x0, G.top, zb);
  face('w', X0, G.y, za, G.x0, G.top, zb, null, 0);
  face('e', X0, G.y, za, G.x0, G.ys + 0.12, zb, room, G.y, gt);
  // la hoja de dentro, con tres vanos en cada tramo (en el del hogar, ciega)
  const hz = -58.7;
  const vanos = [];
  for (const [a, b, c] of tramosSalon()) {
    if (hz > a && hz < b) continue;
    for (const k of [-1, 0, 1]) vanos.push({ c: c + k * 1.9, w: 1.2, y: G.y + 0.85, h: 1.05, rise: 0.6, ring: 0.2 });
  }
  muroVanos(ctx, 'z', za, zb, G.x1, X1, G.y, G.top, vanos, [{ room, y0: G.y, y1: G.ys + 0.12, tint: gt }], [{ room: 'salon', y0: 0, y1: G.top }], { tint: Lt, revealRoom: room });
  for (const v of vanos) blocker(ctx, G.x1, v.y, v.c - v.w / 2, X1, v.y + v.h + v.rise, v.c + v.w / 2);
  // la bóveda de cañón
  barrelVault(ctx, { x0: G.x0, x1: G.x1, z0: za, z1: zb, ys: G.ys, rise: G.top - G.ys, axis: 'z', room, tint: [0.62, 0.6, 0.56], mat: 'ashlar', sub: 1.2 });
  // el macizo de arriba (por dentro del salón, hasta el alero; por encima,
  // fuera), con el adarve
  ctx.col.add(X0, G.top, za, X1, FORT.walk, zb);
  face('w', X0, G.top, za, X1, FORT.walk, zb, null, 0);
  face('e', X0, G.top, za, X1, FORT.eave, zb, 'salon', 0);
  face('e', X0, FORT.eave, za, X1, FORT.walk, zb, null, 0);
  face('t', X0, G.top, za, X1, FORT.walk, zb, null, 0, Lt, { mats: { t: 'flag' } });
  // los cabos de la galería: lo que se ve sobre las puertas de las torres
  cara1(ctx, 'ashlar', 's', za - 0.01, G.x0, G.x1, G.y + 2.4, G.top, room, gt);
  cara1(ctx, 'ashlar', 'n', zb + 0.01, G.x0, G.x1, G.y + 2.4, G.top, room, gt);
  // las ventanas, por dentro: la luna (las de fuera, en fortaleza.js)
  for (const z of [-82.1, -74.3, -66.5, -50.8]) ajimez(ctx, 'e', G.x0, z, G.y + 1.1, { h: 1.4, room, boca: 'luna', radius: 4, intensity: 0.5 });
  // la luz: antorchas en la hoja de fuera, tras los arcos
  for (const z of [Sa.arcos[0], Sa.arcos[2], Sa.arcos[3]]) P.wallTorch(ctx, G.x0 + 0.02, G.y + 2.0, z, 'e', { room });
  ctx.lights.push({ x: (G.x0 + G.x1) / 2, y: G.y + 1.8, z: -87.6, r: 1, g: 0.5, b: 0.22, radius: 4, intensity: 0.6, room });
  ctx.lights.push({ x: (G.x0 + G.x1) / 2, y: G.y + 1.8, z: -45.4, r: 1, g: 0.5, b: 0.22, radius: 4, intensity: 0.6, room });
  // el paje del tambor, en el tramo del estrado: el tambor en el alféizar del
  // primer vano, desde el que tocaba mirando a la sala, y él encogido debajo,
  // contra la hoja, con las baquetas y su papel
  wb.setRoom(room);
  {
    const v = vanos[0];
    const y = G.y;
    bakeCorpse(wb, G.x1 - 0.32, y, v.c + 0.2, Math.PI, 'curl', 'villager', 47);
    const dx = (G.x1 + X1) / 2,
      dz = v.c,
      dy = v.y;
    wb.cylinder('wooddark', dx, dy + 0.04, dz, 0.24, 0.24, 0.36, 10, { ao: false, room, tint: [0.62, 0.42, 0.3] });
    wb.cylinder('leather', dx, dy + 0.4, dz, 0.25, 0.25, 0.02, 10, { ao: false, room, capTop: true, tint: [0.86, 0.78, 0.62] });
    wb.cylinder('leather', dx, dy + 0.02, dz, 0.25, 0.25, 0.02, 10, { ao: false, room, tint: [0.86, 0.78, 0.62] });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2,
        b = ((k + 0.5) / 8) * Math.PI * 2;
      const pa = V(dx + Math.cos(a) * 0.255, dy + 0.39, dz + Math.sin(a) * 0.255),
        pb = V(dx + Math.cos(b) * 0.255, dy + 0.05, dz + Math.sin(b) * 0.255);
      const m = pa.clone().add(pb).multiplyScalar(0.5);
      wb.geometry('rope', new THREE.BoxGeometry(0.016, pa.distanceTo(pb), 0.016), new THREE.Matrix4().compose(m, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), pb.clone().sub(pa).normalize()), V(1, 1, 1)), { ao: false, room });
    }
    for (const s of [-1, 1]) wb.at(G.x1 - 0.55 + 0.1 * s, y + 0.012, v.c - 0.7, 0.4 * s, () => wb.box('wooddark', -0.012, -0.012, -0.2, 0.012, 0.012, 0.2, { ao: false, room }));
    L.interact.push({ kind: 'note', id: 'n_paje', note: 'paje', x: G.x0 + 0.35, y: y + 0.02, z: v.c - 0.9, model: 'paper' });
    P.candles(ctx, G.x0 + 0.15, y, v.c + 1.4, 3, 6351, { room, radius: 3.5, intensity: 0.7 });
  }
  // lo que quedó en la galería: un ballestero muerto con sus virotes, una
  // ampolla
  bakeCorpse(wb, G.x1 - 0.35, G.y, -63.6, 0.1, 'curl', 'soldier', 48);
  wb.setRoom(null);
  L.interact.push({ kind: 'item', id: 'i_virotes_galeria', item: 'virote', n: 4, x: (G.x0 + G.x1) / 2 + 0.2, y: G.y + 0.05, z: -62.4 });
  L.interact.push({ kind: 'item', id: 'i_ampolla_galeria', item: 'ampolla', x: G.x0 + 0.3, y: G.y + 0.05, z: -48.6 });
  L.zones.push({ id: 'salon_galeria', rects: [[G.x0, za, G.x1, zb, G.y - 0.3, G.top]], atmo: 'interior', room });
  L.map.push({ id: 'salon_galeria', r: [X0, za, X1, zb] });
}

// La Corte de los Infieles (game/corte.js): veintidós cortesanos de rodillas en
// dos filas, mirando al sitial, y el mayordomo al pie del estrado. El orden: de
// delante atrás, una fila y la otra. Vencidos, no vuelven (corte:vencida); la
// llave del mayordomo queda donde cae.
function corte(L) {
  const Sa = FORT.salon;
  const xc = (Sa.x0 + Sa.x1) / 2;
  const zE = Sa.estrado.z1;
  let n = 0;
  for (let k = 0; k < 11; k++) {
    const z = zE + 1.9 + k * 1.45;
    for (const x of [xc - 2.6, xc + 2.6]) {
      n++;
      L.enemies.push({ type: 'cortesano', x: x + (k % 2 ? 0.12 : -0.12), y: 0, z, yaw: Math.PI, idle: 'kneel', id: 'e_corte' + n, orden: n, story: 'corte:vencida' });
    }
  }
  L.enemies.push({ type: 'mayordomo', x: xc, y: 0, z: zE + 0.8, yaw: Math.PI, idle: 'kneel', id: 'e_mayordomo', story: 'corte:vencida', dies: 'dead:mayordomo' });
  L.interact.push({ kind: 'item', id: 'i_llave_mayordomo', item: 'llave_mayordomo', afterFlag: 'dead:mayordomo', x: xc, y: 0.08, z: zE + 0.8 });
}
