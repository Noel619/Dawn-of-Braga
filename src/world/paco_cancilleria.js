// La Cancillería y la Torre del Tombo (PLAN_CASTILLO.md, §3; fase 4e): en la
// esquina suroeste del Paço, al sur de la capilla y a poniente de las
// cámaras. La sala de los escribanos, con su patio delante (al que se sale
// por la puerta de la fachada de la capilla); y, adelantada sobre la muralla
// de poniente como una albarrana, la torre del archivo y del tesoro del Rey,
// a la que se sube por una escalera pegada a la cara de dentro de la muralla
// y se pasa por ella y por un arco. Cuatro sobrados: los registros, los
// legajos, las cartas y, arriba, las arcas del Rey, cada una con sus sellos.
// La llave del canciller está en la que dice el registro; las de dos sellos
// negros tienen cerradura de resorte.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, blocker, stairs, archedWall, solidGableRoof, subtractRects } from './builders.js';
import * as P from './props.js';
import { floor, interiorRoom } from './level_util.js';
import { bakeCorpse } from '../entities/models.js';
import { holedWall, parapet, slit } from './level_castle.js';
import { calderaCera, panesCera, palo } from './barrio_atrezo.js';
import { chest } from './level_souto.js';
import { PACO } from './level_paco.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const M4 = () => new THREE.Matrix4();
const Q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);
// (el color de los pergaminos)
const PERG = [
  [0.86, 0.8, 0.64],
  [0.8, 0.72, 0.55],
  [0.9, 0.85, 0.7],
  [0.74, 0.66, 0.5],
];
// la cera de los sellos: bermeja (la cámara del Rey), negra (su guarda) y
// verde (el cabildo de la Sé)
const CERA = { r: [0.62, 0.09, 0.06], n: [0.1, 0.09, 0.09], v: [0.18, 0.38, 0.16] };

export function buildCancilleria(ctx, S, L) {
  patio(ctx, S, L);
  sala(ctx, S, L);
  tombo(ctx, S, L);
  afuera(ctx);
  zonas(L);
}

// ------------------------------------------------------------------------ el patio
// Estrecho, entre la fachada de la capilla y la de la sala; a poniente, la
// tapia del jardín de la reina, con su postigo (atrancado del otro lado), y el
// rellano de la escalera del Tombo, macizo, contra la muralla; la escalera
// sube por el callejón que queda entre la muralla y la sala, desde su fondo.
function patio(ctx, S, L) {
  const wb = ctx.wb;
  const Cn = PACO.canc,
    C = PACO.capilla,
    Cm = PACO.camaras,
    T = PACO.tombo,
    E = Cn.esc,
    SO = PACO.esqSO;
  const yP = T.fl[0];
  const zSO = SO.z - SO.w / 2;
  const tint = [0.76, 0.74, 0.7];
  // el suelo: el patio, el callejón y la escalera; y el umbral de la puerta de
  // la capilla, en el grueso de su muro
  W(S, E.x1, Cn.pz0, Cm.x0, Cn.z0);
  W(S, E.x0, E.top, Cn.x0, zSO);
  const dS = (C.x0 + C.x1) / 2;
  W(S, dS - 1.0, C.z1 - C.t - 0.2, dS + 1.0, C.z1);
  floor(ctx, E.x1, Cn.pz0, Cm.x0, Cn.z0, 'flag', 0, { sub: 2.5, tint: [0.7, 0.68, 0.64] });
  floor(ctx, E.x0, Cn.z0, Cn.x0, zSO, 'flag', 0, { sub: 2.5, tint: [0.66, 0.64, 0.6] });
  // (entre la torre de la esquina y la sala, macizo hasta el adarve)
  solid(ctx, 'wallstone', SO.x + SO.w / 2, 0, zSO, Cn.x0, PACO.hS, PACO.zSi, { faces: 'nte', sub: 2.2, aoH: 2, mats: { t: 'flag' } });

  // --- la escalera: de piedra, pegada a la muralla, con su pretil escalonado
  // del lado del callejón; arriba, el rellano, macizo, con sus pretiles, y el
  // paso por la muralla (level_paco.js: muros)
  const n = E.n,
    run = (E.foot - E.top) / n,
    rise = yP / n,
    pw = 0.3;
  stairs(ctx, (E.x0 + E.x1 - pw) / 2, 0, E.foot, 'n', E.x1 - pw - E.x0, n, rise, run, 'wallstone', { base: 0 });
  for (let i = 0; i < n; i++) {
    const za = E.foot - run * (i + 1),
      zb = E.foot - run * i,
      top = rise * (i + 1) + 0.95;
    solid(ctx, 'wallstone', E.x1 - pw, 0, za, E.x1, top, zb, { faces: 'sew', sub: 2, aoH: 1.5, tint });
    wb.box('ashlar', E.x1 - pw - 0.05, top, za, E.x1 + 0.05, top + 0.12, zb + (i === 0 ? 0.05 : 0), { ao: false, faces: 'tsewb' });
  }
  solid(ctx, 'wallstone', E.x0, 0, Cn.pz0, E.x1, yP, E.top, { faces: 'ten', sub: 2.2, aoH: 2, tint, mats: { t: 'flag' } });
  // (los pretiles del rellano, al patio y a la tapia, con su albardilla; la
  // del patio llega hasta la del pretil de la escalera, sin pisarla)
  const ph = 0.95;
  solid(ctx, 'wallstone', E.x1 - pw, yP, Cn.pz0, E.x1, yP + ph, E.top, { faces: 'nsew', sub: 2, ao: false, tint });
  solid(ctx, 'wallstone', E.x0, yP, Cn.pz0, E.x1 - pw, yP + ph, Cn.pz0 + pw, { faces: 'nsw', sub: 2, ao: false, tint });
  wb.box('ashlar', E.x1 - pw - 0.05, yP + ph, Cn.pz0 - 0.05, E.x1 + 0.05, yP + ph + 0.12, E.top, { ao: false, faces: 'tnsewb' });
  wb.box('ashlar', E.x0, yP + ph, Cn.pz0 - 0.05, E.x1 - pw - 0.05, yP + ph + 0.12, Cn.pz0 + pw + 0.05, { ao: false, faces: 'tnsb' });
  // (que no se salte el pretil del rellano a lo que hay detrás: la rejilla de
  // la calle da por macizo hasta los 5,2 m lo que no se pisa)
  blocker(ctx, E.x0, yP, Cn.pz0, E.x1, yP + 3, Cn.pz0 + pw);

  // --- la tapia del jardín de la reina, con su postigo
  const R = Cn.reina,
    tz0 = Cn.pz0 - 0.6;
  holedWall(ctx, 'wallstone', 'x', E.x0, C.x0, tz0, Cn.pz0, 0, 3.4, [{ a0: R - 0.7, a1: R + 0.7, y0: 0, y1: 2.4 }], 'nst', { tint, sub: 2 });
  wb.box('ashlar', E.x0, 3.4, tz0 - 0.08, C.x0, 3.55, Cn.pz0 + 0.08, { ao: false, faces: 'tnsewb' });
  wb.box('ashlar', R - 0.85, 2.4, Cn.pz0, R + 0.85, 2.6, Cn.pz0 + 0.06, { ao: false, faces: 'tswbe' });
  L.interact.push({ kind: 'door', id: 'd_jardin_reina', x: R, y: 0, z: Cn.pz0 - 0.3, w: 1.4, h: 2.4, axis: 'x', mat: 'planks', hinge: -1, swing: 1, plane: tz0, inset: 0.06, lock: { type: 'barred', side: -1, msg: 'reinaTranca' }, barredMsg: 'reinaAtrancada' });

  // --- lo que hay en el patio: un correo muerto con su bolsa de cartas
  // delante de la sala, las cartas por el suelo; un banco de piedra contra la
  // fachada; y uno de la corte, de rodillas ante la puerta de la capilla
  const rng = new RNG(7101);
  bakeCorpse(wb, -125.6, 0, -59.2, 2.3, 'face', 'villager', 4);
  wb.at(-124.7, 0, -59.9, 0.6, () => {
    wb.box('leather', -0.2, 0, -0.08, 0.2, 0.28, 0.08, { ao: false, tint: [0.5, 0.36, 0.24] });
    wb.box('leather', -0.215, 0.22, -0.1, 0.215, 0.3, 0.09, { ao: false, tint: [0.42, 0.3, 0.2] });
  });
  for (let i = 0; i < 9; i++) hoja(wb, -124.8 + rng.range(-1.8, 2.4), 0, -59.4 + rng.range(-1.6, 1.4), rng.range(0, 6.28), null, rng, i);
  solid(ctx, 'ashlar', -136.5, 0, Cn.z0 - 0.5, -132.5, 0.45, Cn.z0, { faces: 'tnew', ao: false, tint });
  solid(ctx, 'ashlar', -124.0, 0, Cn.z0 - 0.5, -120.0, 0.45, Cn.z0, { faces: 'tnew', ao: false, tint });
  P.weeds(ctx, -139.6, 0, -58.0, 6, 7102, 0.6);
  P.weeds(ctx, -119.0, 0, -61.4, 5, 7103, 0.5);
  L.enemies.push({ type: 'cortesanoSuelto', x: C.x0 + (C.x1 - C.x0) / 2 + 0.6, y: 0, z: -60.7, yaw: Math.PI, idle: 'kneel', id: 'e_canc0' });
}

// Una hoja de pergamino suelta en el suelo (o sobre una mesa).
// (k: la que va en la pila; cada una, unos milímetros más arriba)
function hoja(wb, x, y, z, rot, room, rng, k = 0) {
  wb.at(x, y + 0.004 + (k % 6) * 0.007, z, rot, () => wb.box('clothWhite', -0.11, 0, -0.15, 0.11, 0.004, 0.15, { ao: false, faces: 't', room, grime: false, tint: rng.pick(PERG) }));
}

// ------------------------------------------------------------------------ la sala de los escribanos
// Contra el muro del foso y las cámaras, bajo su armadura: los pupitres de
// los escribanos bajo las ventanas, las dos mesas largas de copiar, los
// estantes de los registros a lo largo del muro del foso, la esquina del sello
// (la caldera de la cera, los panes, los cordones) y, en el testero, sobre su
// tarima, la mesa del canciller bajo el estandarte del Rey, con el traslado de
// la carta de la reja. El sello no está: se lo llevó el canciller a la torre.
function sala(ctx, S, L) {
  const wb = ctx.wb;
  const Cn = PACO.canc;
  const room = 'cancilleria';
  const { x0, x1, z0, z1, t, eave, ridge, door } = Cn;
  const ix0 = x0 + t,
    ix1 = x1 - 0.04,
    iz0 = z0 + t,
    iz1 = z1 - 0.04,
    zc = (z0 + z1) / 2;
  const tint = [0.84, 0.81, 0.76];
  const rng = new RNG(7201);
  W(S, x0, z0, x1, z1);
  // los muros: la fachada, con su puerta y dos ventanas, y el de poniente (el
  // del sur es el del foso; el de levante, el de las cámaras)
  const wins = [-134.6, -121.6];
  holedWall(ctx, 'ashlar', 'x', x0, x1, z0, iz0, 0, eave, [{ a0: door - 0.8, a1: door + 0.8, y0: 0, y1: 2.8 }, ...wins.map((c) => ({ a0: c - 0.55, a1: c + 0.55, y0: 1.9, y1: 3.7 }))], 'n', { tint });
  solid(ctx, 'ashlar', x0, 0, iz0, ix0, eave, z1, { faces: 'w', sub: 2.2, aoH: 2, tint });
  // (el dintel de la puerta y los alféizares, de sillería; las rejas)
  wb.box('ashlar', door - 1.0, 2.8, z0 - 0.08, door + 1.0, 3.15, z0, { ao: false, faces: 'tnewb' });
  for (const c of wins) {
    wb.box('ashlar', c - 0.7, 1.78, z0 - 0.16, c + 0.7, 1.9, z0, { ao: false, faces: 'tnewb' });
    for (let k = -1; k <= 1; k++) wb.box('iron', c + k * 0.27 - 0.02, 1.9, z0 + 0.3, c + k * 0.27 + 0.02, 3.7, z0 + 0.34, { ao: false });
    wb.box('iron', c - 0.55, 2.78, z0 + 0.3, c + 0.55, 2.82, z0 + 0.34, { ao: false });
  }
  // el tejado, contra el muro del foso (sin vuelo de ese lado) y las cámaras
  // (sin hastial: el de dentro, a ras de su muro)
  solidGableRoof(ctx, x0, z0, x1, z1, eave, ridge, 'x', { overhang: 0.4, ovs: [0.4, 0], gables: [{ t: t + 0.04 }, { t: 0.04 }], open: [false, true], wallMat: 'ashlar', wallTint: tint, room, underRoom: room });
  // por dentro: enlucido, con su zócalo; el suelo, de losas
  interiorRoom(ctx, ix0, iz0, ix1, iz1, 0, eave, {
    room,
    wall: 'plaster',
    tint: [0.86, 0.82, 0.74],
    floorMat: 'flag',
    floorTint: [0.74, 0.7, 0.64],
    ceil: false,
    doors: [{ side: 'n', at: door, w: 1.6, h: 2.8 }, ...wins.map((c) => ({ side: 'n', at: c, w: 1.1, h: 3.7, sill: 1.9 }))],
  });
  // la armadura: los durmientes sobre los muros, los tirantes y los
  // pendolones hasta la hilera
  wb.box('timber', ix0, eave - 0.3, iz0, ix1, eave + 0.25, iz0 + 0.3, { ao: false, faces: 'tsbew', room });
  wb.box('timber', ix0, eave - 0.45, iz1 - 0.3, ix1, eave - 0.1, iz1, { ao: false, faces: 'tnbew', room });
  for (let x = ix0 + 3.0; x < ix1 - 1; x += 4.2) {
    wb.box('timber', x - 0.14, eave - 0.32, iz0 + 0.3, x + 0.14, eave - 0.04, iz1 - 0.3, { ao: false, faces: 'nsewb', room });
    wb.box('timber', x - 0.1, eave - 0.04, zc - 0.1, x + 0.1, ridge - 0.32, zc + 0.1, { ao: false, faces: 'nsew', room });
  }
  wb.box('timber', ix0, ridge - 0.5, zc - 0.12, ix1, ridge - 0.28, zc + 0.12, { ao: false, faces: 'nsb', room });

  wb.setRoom(room);
  // --- el testero: la tarima, la mesa del canciller, su silla y el estandarte
  const tx = ix0 + 2.6;
  solid(ctx, 'planks', ix0, 0, iz0, tx, 0.3, iz1, { faces: 'te', ao: false, room, tint: [0.6, 0.52, 0.44] });
  const mx = ix0 + 1.4;
  P.table(ctx, mx, 0.3, zc, 2.4, 1.0, Math.PI / 2);
  // (la silla, de respaldo alto, de espaldas al estandarte)
  wb.box('wooddark', ix0 + 0.35, 0.3, zc - 0.32, ix0 + 0.85, 0.78, zc + 0.32, { ao: false, room });
  wb.box('wooddark', ix0 + 0.3, 0.3, zc - 0.36, ix0 + 0.4, 2.0, zc + 0.36, { ao: false, room });
  wb.box('clothRed', ix0 + 0.4, 0.78, zc - 0.3, ix0 + 0.84, 0.84, zc + 0.3, { ao: false, room });
  ctx.col.add(ix0 + 0.3, 0.3, zc - 0.36, ix0 + 0.85, 1.0, zc + 0.36);
  P.banner(ctx, ix0 + 0.06, 5.6, zc, Math.PI / 2, 'bannerRey', 1.4, 3.0);
  // lo de la mesa: el traslado de la carta, el tintero, las plumas, la caja
  // del sello (vacía, con su cojín) y las velas
  const ty = 0.3 + 0.8;
  for (let i = 0; i < 5; i++) hoja(wb, mx + rng.range(-0.3, 0.3), ty, zc + rng.range(-0.9, 0.9), rng.range(-0.5, 0.5), room, rng, i);
  wb.box('wooddark', mx - 0.18, ty, zc + 0.55, mx + 0.18, ty + 0.12, zc + 0.85, { ao: false, room });
  wb.box('clothRed', mx - 0.14, ty + 0.12, zc + 0.59, mx + 0.14, ty + 0.13, zc + 0.81, { ao: false, faces: 't', room });
  wb.cylinder('black', mx, ty + 0.125, zc + 0.7, 0.07, 0.07, 0.008, 12, { ao: false, capTop: true, room, grime: false });
  wb.cylinder('bone', mx + 0.25, ty, zc - 0.7, 0.035, 0.04, 0.12, 6, { ao: false, capTop: true, room, tint: [0.36, 0.3, 0.26] });
  palo(wb, V(mx + 0.25, ty + 0.1, zc - 0.7), V(mx + 0.12, ty + 0.38, zc - 0.78), 0.006, 'clothWhite', { room });
  P.candles(ctx, mx + 0.2, ty, zc - 1.0, 3, 7202, { room, radius: 6, intensity: 1.0 });
  L.interact.push({ kind: 'note', id: 'n_carta_rey', note: 'cartaRey', x: mx - 0.05, y: ty + 0.02, z: zc - 0.15, model: 'paper' });
  // los estantes del testero, a los lados de la silla
  estante(ctx, ix0 + 0.22, 0.3, zc - 2.9, Math.PI / 2, 1.6, room, 7203);
  estante(ctx, ix0 + 0.22, 0.3, zc + 2.9, Math.PI / 2, 1.6, room, 7204);

  // --- los pupitres bajo las ventanas y las dos mesas de copiar
  for (const c of wins) for (const dx of [-0.85, 0.85]) pupitre(ctx, c + dx, 0, iz0 + 0.75, 0, room, rng);
  for (const [cx0, cx1] of [
    [tx + 1.0, door - 1.3],
    [door + 1.3, ix1 - 3.2],
  ]) {
    const cx = (cx0 + cx1) / 2,
      w = cx1 - cx0;
    P.table(ctx, cx, 0, zc, w, 1.1, 0);
    for (let x = cx0 + 0.55; x < cx1 - 0.3; x += 1.1) {
      P.stool(ctx, x, 0, zc - 0.85, { room });
      P.stool(ctx, x + 0.3, 0, zc + 0.85, { room });
      hoja(wb, x + rng.range(-0.1, 0.2), 0.8, zc + rng.range(-0.35, 0.35), rng.range(-0.4, 0.4), room, rng);
      if (rng.chance(0.5)) wb.cylinder('bone', x + 0.35, 0.8, zc + rng.range(-0.3, 0.3), 0.03, 0.035, 0.11, 6, { ao: false, capTop: true, room, tint: [0.36, 0.3, 0.26] });
    }
    // (un libro abierto y unos rollos)
    wb.box('leather', cx - 0.3, 0.8, zc - 0.2, cx + 0.3, 0.84, zc + 0.2, { ao: false, room, tint: [0.4, 0.26, 0.18] });
    wb.box('clothWhite', cx - 0.28, 0.84, zc - 0.18, cx + 0.28, 0.86, zc + 0.18, { ao: false, faces: 't', room, grime: false, tint: PERG[2] });
    rollo(wb, cx + w / 2 - 0.5, 0.8, zc + 0.2, 0.3, room, rng);
    rollo(wb, cx + w / 2 - 0.45, 0.8, zc + 0.05, -0.2, room, rng);
  }
  P.candles(ctx, (tx + 1.0 + door - 1.3) / 2 - 1.2, 0.8, zc - 0.1, 2, 7205, { room, radius: 5, intensity: 0.7 });
  P.candles(ctx, (door + 1.3 + ix1 - 3.2) / 2 + 1.0, 0.8, zc + 0.1, 2, 7206, { room, radius: 5, intensity: 0.7 });
  // --- los estantes de los registros, a lo largo del muro del foso
  for (let x = tx + 1.0, k = 0; x < ix1 - 3.4; x += 1.85, k++) estante(ctx, x, 0, iz1 - 0.22, Math.PI, 1.65, room, 7210 + k);
  // --- la esquina del sello: la caldera de la cera (fría), un banco con los
  // panes de cera y los cordones de los sellos, y un arcón
  calderaCera(ctx, ix1 - 1.0, 0, iz0 + 1.1, room, { lit: false });
  P.colOBB(ctx, ix1 - 1.0, iz0 + 1.1, 0.24, 0.24, 0, 0, 0.66);
  P.table(ctx, ix1 - 0.6, 0, zc + 0.6, 2.2, 0.8, Math.PI / 2);
  panesCera(ctx, ix1 - 0.6, 0.8, zc - 0.1, 3, room, 7207);
  panesCera(ctx, ix1 - 0.6, 0.8, zc + 0.4, 2, room, 7208);
  for (const [k, col] of [
    [0, [0.62, 0.09, 0.06]],
    [1, [0.18, 0.38, 0.16]],
    [2, [0.85, 0.75, 0.3]],
  ])
    wb.box('rope', ix1 - 0.85, 0.8, zc + 1.0 + k * 0.12, ix1 - 0.35, 0.83, zc + 1.06 + k * 0.12, { ao: false, room, tint: col });
  chest(ctx, ix1 - 0.5, 0, iz1 - 0.9, -Math.PI / 2, room, 1.1);
  // por el suelo, hojas sueltas y algún escabel caído
  for (let i = 0; i < 16; i++) hoja(wb, rng.range(tx + 0.5, ix1 - 1), 0, rng.range(iz0 + 1.6, iz1 - 0.8), rng.range(0, 6.28), room, rng, i);
  wb.setRoom(null);
  // la luz: el velón colgado de la armadura y la de las ventanas
  P.hangingLamp(ctx, door, eave - 0.3, zc, { room, len: 1.4, radius: 9, intensity: 0.9 });
  for (const c of wins) ctx.lights.push({ x: c, y: 2.8, z: iz0 + 1.0, r: 0.55, g: 0.6, b: 0.7, radius: 5.5, intensity: 0.55, room });

  // la puerta (entornada) y los escribanos, de rodillas entre los pupitres
  L.interact.push({ kind: 'door', id: 'd_cancilleria', x: door, y: 0, z: z0 + t / 2, w: 1.6, h: 2.8, axis: 'x', mat: 'planks', hinge: -1, swing: -1, plane: iz0, inset: 0.06, ajar: 0.2, lock: { type: 'none' } });
  L.enemies.push(
    { type: 'cortesanoSuelto', x: tx + 0.9, y: 0, z: zc + 0.4, yaw: -Math.PI / 2, idle: 'kneel', id: 'e_canc1' },
    { type: 'cortesanoSuelto', x: wins[1] + 0.2, y: 0, z: iz0 + 2.0, yaw: Math.PI, idle: 'kneel', id: 'e_canc2' },
    { type: 'cortesanoSuelto', x: door + 3.0, y: 0, z: iz1 - 1.3, yaw: Math.PI, idle: 'kneel', id: 'e_canc3' }
  );
}

// Un rollo de pergamino tumbado.
function rollo(wb, x, y, z, rot, room, rng) {
  wb.push();
  wb.translate(x, y + 0.035, z);
  wb.rotateY(rot);
  wb.rotateZ(Math.PI / 2);
  wb.cylinder('clothWhite', 0, -0.15, 0, 0.035, 0.035, 0.3, 6, { ao: false, room, grime: false, capTop: true, capBot: true, tint: rng.pick(PERG) });
  wb.pop();
}

// Estante del archivo, de cara a +z local: dos costados, la trasera y cuatro
// baldas con libros de pie, rollos tumbados y legajos atados.
function estante(ctx, x, y, z, rot, w, room, seed) {
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
          // libros de pie
          for (let j = 0; j < 3 + Math.floor(rng.next() * 4); j++) {
            const bw = rng.range(0.05, 0.09),
              bh = rng.range(0.24, 0.36);
            wb.box('leather', u, fy, -0.15, u + bw, fy + bh, 0.1, { ao: false, room, tint: rng.pick(books) });
            u += bw + 0.006;
          }
        } else if (k < 0.72) {
          // rollos, unos sobre otros
          for (let j = 0; j < 3; j++) {
            wb.push();
            wb.translate(u + 0.15, fy + 0.035 + (j === 2 ? 0.06 : 0), -0.06 + (j === 2 ? 0.07 : j * 0.13));
            wb.rotateZ(Math.PI / 2);
            wb.cylinder('clothWhite', 0, -0.14, 0, 0.034, 0.034, 0.28, 6, { ao: false, room, grime: false, capTop: true, capBot: true, tint: rng.pick(PERG) });
            wb.pop();
          }
          u += 0.33;
        } else if (k < 0.9) {
          // un legajo atado con su cinta
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
function pupitre(ctx, x, y, z, rot, room, rng) {
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

// Atril, de cara a +z local (donde se pone el que lee): el pie en cruz, el
// fuste y el tablero en cuesta.
function atril(ctx, x, y, z, rot, room) {
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
function arcaSellada(ctx, x, y, z, rot, room, id, seals, fill) {
  const wb = ctx.wb;
  const w = 1.0,
    d = 0.56,
    h = 0.5;
  const rng = new RNG(id.length * 131 + seals.length * 7 + Math.round(-x * 10));
  const n = seals.length;
  const sx = (k) => (k - (n - 1) / 2) * 0.17;
  wb.at(x, y, z, rot, () => {
    // la caja (lo de dentro, a oscuras) y sus flejes; la cerradura
    wb.box('wooddark', -w / 2, 0, -d / 2, w / 2, h, d / 2, { faces: 'tnsew', aoH: 0.5, room, mats: { t: 'black' } });
    for (const s of [-1, 1]) wb.box('iron', s * (w / 2 - 0.15) - 0.03, 0, -d / 2 - 0.015, s * (w / 2 - 0.15) + 0.03, h, d / 2 + 0.015, { ao: false, faces: 'nsewt', room });
    wb.box('iron', -0.09, h - 0.22, d / 2, 0.09, h - 0.03, d / 2 + 0.02, { ao: false, faces: 'tsewb', room });
  });
  // cerrada: la tapa, sus flejes, el pasador y los sellos en sus cordones
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
  // abierta: la tapa echada atrás sobre sus bisagras, lo de dentro y los
  // sellos rotos en el suelo, delante
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

// ------------------------------------------------------------------------ la Torre del Tombo
// Maciza hasta el paso; encima, cuatro sobrados de tablas unidos por
// escaleras de piedra de un tramo, cada una contra un muro, con su hueco en
// el suelo de arriba y su barandilla; saeteras en las cuatro caras, la
// cornisa y el chapitel de teja. En el primer sobrado, el registro en su
// atril; en el último, las arcas del Rey y el canciller, sentado entre ellas
// con el sello en el regazo.
function tombo(ctx, S, L) {
  const wb = ctx.wb;
  const T = PACO.tombo;
  const { x0, x1, z0, z1, t, fl, top, paso } = T;
  const ix0 = x0 + t,
    ix1 = x1 - t,
    iz0 = z0 + t,
    iz1 = z1 - t;
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  const tint = [0.8, 0.78, 0.73];
  const rooms = ['tombo1', 'tombo2', 'tombo3', 'tombo4'];
  const SL = 0.3;
  const yP = fl[0];
  // las alturas libres de cada sobrado (hasta las tablas de encima)
  const hk = fl.map((y, k) => (k < 3 ? fl[k + 1] - SL : top - 0.3) - y);

  // --- por fuera: el zócalo, el macizo hasta el paso y los muros
  solid(ctx, 'wallstone', x0 - 0.35, 0, z0 - 0.35, x1 + 0.35, 1.0, z1 + 0.35, { faces: 'tnsew', sub: 2.2, aoH: 1, tint: [0.72, 0.7, 0.66] });
  solid(ctx, 'wallstone', x0, 1.0, z0, x1, yP, z1, { faces: 'nsew', sub: 2.2, aoH: 2, tint });
  solid(ctx, 'wallstone', x0, yP, z0, x1, top, iz0, { faces: 'new', sub: 2.2, tint });
  solid(ctx, 'wallstone', x0, yP, iz1, x1, top, z1, { faces: 'sew', sub: 2.2, tint });
  solid(ctx, 'wallstone', x0, yP, iz0, ix0, top, iz1, { faces: 'w', sub: 2.2, tint });
  holedWall(ctx, 'wallstone', 'z', iz0, iz1, ix1, x1, yP, top, [{ a0: paso - 0.6, a1: paso + 0.6, y0: yP, y1: yP + 2.4 }], 'e', { tint });
  wb.box('flag', ix1, yP - 0.05, paso - 0.6, x1, yP, paso + 0.6, { faces: 't', ao: false });
  // (una imposta en cada sobrado)
  for (const y of fl.slice(1)) wb.box('wallstone', x0 - 0.12, y - 0.42, z0 - 0.12, x1 + 0.12, y - 0.3, z1 + 0.12, { ao: false, faces: 'tnsewb', tint: [0.7, 0.68, 0.64] });
  // la cornisa, el chapitel y su cruz de hierro
  wb.box('wallstone', x0 - 0.3, top - 0.45, z0 - 0.3, x1 + 0.3, top, z1 + 0.3, { ao: false, sub: 3, faces: 'tnsewb', mats: { t: 'flag' } });
  wb.pyramid('roof', cx, cz, x1 - x0 + 1.0, z1 - z0 + 1.0, top, 5.6);
  wb.box('iron', cx - 0.04, top + 5.4, cz - 0.04, cx + 0.04, top + 6.6, cz + 0.04, { ao: false });
  wb.box('iron', cx - 0.32, top + 6.1, cz - 0.04, cx + 0.32, top + 6.18, cz + 0.04, { ao: false });
  // las saeteras de cada sobrado (la de levante del primero es la puerta)
  for (let k = 0; k < 4; k++) {
    const y = fl[k] + 1.2;
    slit(ctx, cx, y, z0, 'n');
    slit(ctx, cx, y, z1, 's');
    slit(ctx, x0, y, cz, 'w');
    if (k > 0) slit(ctx, x1, y, cz, 'e');
  }
  // el estandarte del Rey, sobre el campo
  P.banner(ctx, x0 - 0.32, top - 1.4, cz, -Math.PI / 2, 'bannerRey', 1.4, 3.8);

  // --- el paso: el arco de la muralla a la torre, su suelo y sus pretiles
  const bz0 = paso - 1.0,
    bz1 = paso + 1.0;
  archedWall(ctx, { axis: 'x', a0: x1, a1: PACO.x0, t0: bz0, t1: bz1, y0: 0, y1: yP, openings: [{ c: (x1 + PACO.x0) / 2, w: 1.3, h: 2.6, rise: 0.65, ring: 0.22 }], mat: 'wallstone', tint, rooms: ['out', 'out'], sub: 1.6 });
  wb.box('flag', x1, yP - 0.06, bz0, PACO.x0, yP, bz1, { faces: 't', ao: false });
  parapet(ctx, x1, bz0, PACO.x0, bz0 + 0.3, yP);
  parapet(ctx, x1, bz1 - 0.3, PACO.x0, bz1, yP);
  // (lo de fuera de la muralla no se pisa: la rejilla lo da por macizo hasta
  // la altura del paso, y por encima de los pretiles no se salta)
  blocker(ctx, x1, yP, bz0, PACO.x0, yP + 3, bz0 + 0.3);
  blocker(ctx, x1, yP, bz1 - 0.3, PACO.x0, yP + 3, bz1);
  L.interact.push({ kind: 'door', id: 'd_tombo', x: x1 - t / 2, y: yP, z: paso, w: 1.2, h: 2.4, axis: 'z', mat: 'planks', hinge: -1, swing: -1, plane: ix1, inset: 0.06, lock: { type: 'none' } });

  // --- por dentro: los muros de cada sobrado, los suelos y las escaleras
  for (let k = 0; k < 4; k++) {
    interiorRoom(ctx, ix0, iz0, ix1, iz1, fl[k], hk[k], {
      room: rooms[k],
      wall: 'ashlar',
      tint: [0.7, 0.68, 0.64],
      floor: false,
      ceil: false,
      skirting: false,
      doors: k === 0 ? [{ side: 'e', at: paso, w: 1.2, h: 2.4 }] : [],
    });
    // (las saeteras, por dentro; no donde corre una escalera)
    const y = fl[k] + 1.2,
      o = { ao: false, grime: false, room: rooms[k] };
    if (k !== 0 && k !== 2) wb.box('black', cx - 0.09, y, iz0, cx + 0.09, y + 1.1, iz0 + 0.02, { ...o, faces: 's' });
    if (k !== 1) wb.box('black', cx - 0.09, y, iz1 - 0.02, cx + 0.09, y + 1.1, iz1, { ...o, faces: 'n' });
    wb.box('black', ix0, y, cz - 0.09, ix0 + 0.02, y + 1.1, cz + 0.09, { ...o, faces: 'e' });
    if (k > 0) wb.box('black', ix1 - 0.02, y, cz - 0.09, ix1, y + 1.1, cz + 0.09, { ...o, faces: 'w' });
    // (la luz que entra por ellas)
    ctx.lights.push({ x: cx, y: fl[k] + 2.0, z: cz, r: 0.5, g: 0.55, b: 0.66, radius: 5.5, intensity: 0.45, room: rooms[k] });
  }
  wb.box('flag', ix0, yP - 0.1, iz0, ix1, yP, iz1, { faces: 't', ao: false, room: rooms[0], tint: [0.72, 0.7, 0.66] });
  // el techo de arriba, con sus vigas
  wb.box('wooddark', ix0, top - 0.3, iz0, ix1, top - 0.1, iz1, { faces: 'b', ao: false, room: rooms[3], tint: [0.6, 0.55, 0.5] });
  for (let z = iz0 + 0.8; z < iz1 - 0.4; z += 1.2) wb.box('timber', ix0, top - 0.52, z - 0.11, ix1, top - 0.3, z + 0.11, { ao: false, faces: 'nsewb', room: rooms[3] });
  // los suelos de tablas, con el hueco de la escalera que sube a cada uno:
  // las del muro norte (al primero y al tercero) y la del sur (al segundo)
  const hN = [ix0, iz0, ix1 - 1.6, iz0 + 1.1],
    hS = [ix0 + 1.95, iz1 - 1.1, ix1, iz1];
  const holes = [null, hN, hS, hN];
  for (let k = 1; k < 4; k++) {
    const y = fl[k],
      h = holes[k],
      rm = rooms[k - 1];
    for (const m of subtractRects([ix0, iz0, ix1, iz1], [h])) {
      wb.box('planks', m[0], y - 0.05, m[1], m[2], y, m[3], { faces: 't', ao: false, uv: 0.7, room: rooms[k] });
      wb.box('wooddark', m[0], y - SL, m[1], m[2], y - SL + 0.02, m[3], { faces: 'b', ao: false, room: rm, tint: [0.6, 0.54, 0.48] });
      ctx.col.add(m[0], y - SL, m[1], m[2], y, m[3]).cam = true;
    }
    // el canto del hueco
    if (h[0] > ix0 + 0.01) wb.box('wooddark', h[0] - 0.02, y - SL, h[1], h[0], y, h[3], { faces: 'e', ao: false, room: rm });
    if (h[2] < ix1 - 0.01) wb.box('wooddark', h[2], y - SL, h[1], h[2] + 0.02, y, h[3], { faces: 'w', ao: false, room: rm });
    if (h[1] > iz0 + 0.01) wb.box('wooddark', h[0], y - SL, h[1] - 0.02, h[2], y, h[1], { faces: 's', ao: false, room: rm });
    if (h[3] < iz1 - 0.01) wb.box('wooddark', h[0], y - SL, h[3], h[2], y, h[3] + 0.02, { faces: 'n', ao: false, room: rm });
    // las viguetas, a lo largo de x, cortadas en el hueco
    for (let z = iz0 + 0.55; z < iz1 - 0.3; z += 1.1) {
      const cuts = z > h[1] - 0.15 && z < h[3] + 0.15 ? [[h[0] - 0.1, z - 1, h[2] + 0.1, z + 1]] : [];
      for (const sg of subtractRects([ix0, z - 0.1, ix1, z + 0.1], cuts)) if (sg[2] - sg[0] > 0.05) wb.box('wooddark', sg[0], y - SL - 0.2, sg[1], sg[2], y - SL, sg[3], { ao: false, faces: 'nsewb', room: rm });
    }
  }
  // las escaleras (de trece peldaños, contra el muro norte, la del sur y otra
  // vez la del norte), y las barandillas de los huecos, arriba (no por donde
  // se sale)
  // (el pie, a 0,8 m del muro: que quepa uno de frente)
  const n = 13,
    rise = (fl[1] - fl[0]) / n,
    run = 0.32;
  for (let k = 0; k < 3; k++) {
    wb.setRoom(rooms[k]);
    if (k === 1) stairs(ctx, ix0 + 0.8, fl[k], iz1 - 0.5, 'e', 1.0, n, rise, run, 'wallstone', { base: fl[k] });
    else stairs(ctx, ix1 - 0.8, fl[k], iz0 + 0.5, 'w', 1.0, n, rise, run, 'wallstone', { base: fl[k] });
  }
  wb.setRoom(null);
  const rail = (a, b, c, d, y, room) => {
    wb.box('wooddark', a, y + 0.92, b, c, y + 1.0, d, { ao: false, faces: 'tnsewb', room });
    const lx = c - a > d - b;
    for (let u = (lx ? a : b) + 0.3; u < (lx ? c : d) - 0.05; u += 0.7) {
      if (lx) wb.box('wooddark', u - 0.04, y, b, u + 0.04, y + 0.92, d, { ao: false, room });
      else wb.box('wooddark', a, y, u - 0.04, c, y + 0.92, u + 0.04, { ao: false, room });
    }
    ctx.col.add(a, y, b, c, y + 1.0, d);
  };
  for (const k of [1, 3]) {
    rail(ix0 + 0.9, hN[3], hN[2], hN[3] + 0.08, fl[k], rooms[k]);
    rail(hN[2], iz0, hN[2] + 0.08, hN[3] + 0.08, fl[k], rooms[k]);
  }
  rail(hS[0], hS[1] - 0.08, ix1 - 0.9, hS[1], fl[2], rooms[2]);
  rail(hS[0] - 0.08, hS[1] - 0.08, hS[0], iz1, fl[2], rooms[2]);

  // --- el primer sobrado: los registros. El libro grande en su atril, los
  // estantes, un arcón junto a la puerta y el velón
  {
    const y = fl[0],
      room = rooms[0];
    wb.setRoom(room);
    atril(ctx, ix0 + 1.6, y, cz + 0.3, Math.PI / 2, room);
    wb.box('leather', ix0 + 1.45, y + 1.12, cz + 0.05, ix0 + 1.85, y + 1.17, cz + 0.55, { ao: false, room, tint: [0.42, 0.26, 0.18] });
    L.interact.push({ kind: 'note', id: 'n_registro', note: 'registro', x: ix0 + 1.75, y: y + 1.2, z: cz + 0.3, model: 'book' });
    P.candelabra(ctx, ix0 + 1.5, y, iz1 - 0.6, { room });
    estante(ctx, ix0 + 0.22, y, cz - 0.4, Math.PI / 2, 1.5, room, 7301);
    estante(ctx, cx - 0.2, y, iz1 - 0.22, Math.PI, 1.6, room, 7302);
    chest(ctx, ix1 - 0.4, y, iz1 - 0.75, -Math.PI / 2, room, 1.0);
    wb.setRoom(null);
  }
  // --- el segundo: los legajos, en los estantes y en pilas por el suelo
  {
    const y = fl[1],
      room = rooms[1];
    const rng = new RNG(7310);
    wb.setRoom(room);
    estante(ctx, ix1 - 0.22, y, iz0 + 1.2, -Math.PI / 2, 1.6, room, 7311);
    estante(ctx, ix1 - 0.22, y, cz + 0.6, -Math.PI / 2, 1.5, room, 7312);
    for (const [px, pz] of [
      [cx - 0.6, cz + 0.2],
      [cx + 0.6, cz - 0.6],
      [ix0 + 1.6, iz0 + 1.6],
    ])
      legajos(ctx, px, y, pz, rng.range(0, 3), room, rng);
    wb.setRoom(null);
    L.enemies.push({ type: 'cortesanoSuelto', x: cx - 0.2, y, z: cz - 0.9, yaw: Math.PI / 2, idle: 'kneel', id: 'e_tombo1' });
  }
  // --- el tercero: las cartas, los fueros y las bulas, en arcones; la mesa
  // con una bula desplegada, con su plomo
  {
    const y = fl[2],
      room = rooms[2];
    const rng = new RNG(7320);
    wb.setRoom(room);
    chest(ctx, ix0 + 0.35, y, cz - 0.7, Math.PI / 2, room, 1.0);
    chest(ctx, ix0 + 0.35, y, cz + 0.6, Math.PI / 2, room, 1.0);
    P.table(ctx, cx, y, cz - 0.1, 1.4, 0.8, 0);
    wb.box('clothWhite', cx - 0.32, y + 0.8, cz - 0.38, cx + 0.32, y + 0.812, cz + 0.12, { ao: false, faces: 't', room, grime: false, tint: PERG[0] });
    wb.cylinder('iron', cx, y + 0.8, cz + 0.22, 0.05, 0.05, 0.015, 10, { ao: false, capTop: true, room, tint: [0.7, 0.72, 0.76] });
    wb.box('rope', cx - 0.006, y + 0.8, cz + 0.1, cx + 0.006, y + 0.806, cz + 0.2, { ao: false, room, tint: [0.85, 0.75, 0.3] });
    legajos(ctx, ix0 + 1.4, y, iz1 - 1.5, 0.3, room, rng);
    wb.setRoom(null);
    L.enemies.push({ type: 'cortesanoSuelto', x: cx + 0.8, y, z: cz + 0.9, yaw: -Math.PI / 2, idle: 'kneel', id: 'e_tombo2' });
  }
  // --- el cuarto: las arcas del Rey, cada una con sus sellos, y el canciller
  {
    const y = fl[3],
      room = rooms[3];
    wb.setRoom(room);
    // [id, x, z, rot, sellos, lo que dice, lo que da, trampa]
    const xe = ix1 - 0.48,
      zs = iz1 - 0.48,
      xw = ix0 + 0.48;
    const arcas = [
      ['a_se', xe, cz - 0.9, -Math.PI / 2, 'vv', 'arcaSe', null, 0],
      ['a_guarda1', xe, cz + 0.3, -Math.PI / 2, 'nn', 'arcaResorte1', null, 30],
      ['a_camara3', xe, cz + 1.5, -Math.PI / 2, 'rrr', 'arcaCamara3', 'llave_canciller', 0],
      ['a_guarda3', cx + 0.7, zs, Math.PI, 'nnn', 'arcaGuarda3', 'virote', 0],
      ['a_camara2', cx - 0.5, zs, Math.PI, 'rr', 'arcaCamara2', null, 0],
      ['a_guarda2', xw, cz, Math.PI / 2, 'nn', 'arcaResorte2', null, 30],
    ];
    const NOM = { r: 'bermejo', n: 'negro', v: 'verde' };
    const NUM = ['', 'un sello', 'dos sellos', 'tres sellos'];
    for (const [id, ax, az, rot, seals, text, item, trap] of arcas) {
      arcaSellada(ctx, ax, y, az, rot, room, id, seals.split(''), !trap && item !== 'llave_canciller');
      const s = Math.sin(rot),
        c = Math.cos(rot);
      const nom = NOM[seals[0]] + (seals.length > 1 ? 's' : '');
      L.interact.push({ kind: 'arca', id, x: ax, y, z: az, ix: ax + s * 0.75, iz: az + c * 0.75, r: 1.0, label: `Abrir el arca (${NUM[seals.length]} ${nom})`, text, after: text + 'Ya', item, n: item === 'virote' ? 6 : 1, trap });
    }
    // el canciller, sentado contra el muro entre las arcas, con el sello del
    // Rey en el regazo; a su lado, el farol, que aún arde
    const kx = ix0 + 0.32,
      kz = iz1 - 0.95;
    bakeCorpse(wb, kx, y, kz, Math.PI / 2, 'sit', 'villager', 8);
    wb.cylinder('silver', kx + 0.55, y + 0.36, kz, 0.075, 0.075, 0.02, 14, { ao: false, capTop: true, capBot: true, room });
    wb.box('rope', kx + 0.54, y + 0.38, kz - 0.01, kx + 0.56, y + 0.62, kz + 0.01, { ao: false, room, tint: [0.18, 0.38, 0.16] });
    L.interact.push({ kind: 'examine', id: 'x_canciller', text: 'canciller', x: kx + 0.7, y, z: kz, r: 1.3 });
    farol(ctx, kx + 0.15, y, kz - 0.75, room);
    for (let i = 0; i < 6; i++) hoja(wb, cx + Math.sin(i * 2.1) * 1.2, y, cz + Math.cos(i * 1.7) * 1.1, i * 1.3, room, new RNG(7330 + i), i);
    wb.setRoom(null);
  }
}

// Una pila de legajos atados, unos sobre otros.
function legajos(ctx, x, y, z, rot, room, rng) {
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

// El farol del canciller, en el suelo, encendido.
function farol(ctx, x, y, z, room) {
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

// ------------------------------------------------------------------------ extramuros
// Lo que se ve por encima de los pretiles del paso del Tombo: el campo de
// poniente, pelado, con olivos secos y piedras sueltas, hasta perderse en la
// niebla. (El mundo empieza en x = -156: level.js, WORLD_X0.)
function afuera(ctx) {
  const wb = ctx.wb;
  wb.box('dirt', -280, -0.2, -232, -156, -0.06, 72, { faces: 't', ao: false, sub: 10, tint: [0.58, 0.55, 0.5] });
  const rng = new RNG(7401);
  for (let i = 0; i < 16; i++) P.deadTree(ctx, rng.range(-230, -162), 0, rng.range(-170, 20), 7410 + i, rng.range(3.2, 5.6));
  for (let i = 0; i < 10; i++) P.roughStone(ctx, rng.range(-200, -158), 0, rng.range(-140, 0), rng.range(0.3, 0.8), 7430 + i);
  ctx.crows.push({ x: -175, y: 14, z: -70, r: 9, n: 5 });
}

// ------------------------------------------------------------------------ zonas y mapa
function zonas(L) {
  const Cn = PACO.canc,
    T = PACO.tombo,
    E = Cn.esc,
    Cm = PACO.camaras,
    SO = PACO.esqSO;
  const zSO = SO.z - SO.w / 2;
  const ix0 = T.x0 + T.t,
    ix1 = T.x1 - T.t,
    iz0 = T.z0 + T.t,
    iz1 = T.z1 - T.t;
  const names = ['tombo_registros', 'tombo_legajos', 'tombo_cartas', 'tombo_arcas'];
  T.fl.forEach((y, k) => {
    L.zones.push({ id: names[k], rects: [[ix0, iz0, ix1, iz1, y - 0.4, (k < 3 ? T.fl[k + 1] : T.top) - 0.3]], atmo: 'interior', room: 'tombo' + (k + 1) });
    L.map.push({ id: names[k], r: [T.x0, T.z0, T.x1, T.z1] });
  });
  L.zones.push(
    { id: 'paso_tombo', rects: [[T.x1 - T.t, T.paso - 1.0, PACO.xi, T.paso + 1.0, T.fl[0] - 0.5, T.fl[0] + 3]], atmo: 'paco' },
    { id: 'cancilleria', rects: [[Cn.x0 + Cn.t, Cn.z0 + Cn.t, Cn.x1, Cn.z1, -1, Cn.ridge]], atmo: 'interior', room: 'cancilleria' },
    {
      id: 'patio_cancilleria',
      rects: [
        [E.x0, Cn.pz0, Cm.x0, Cn.z0, -1, 12],
        [E.x0, Cn.z0, Cn.x0, zSO, -1, 12],
      ],
      atmo: 'paco',
    }
  );
  L.map.push(
    { id: 'paso_tombo', r: [T.x1, T.paso - 1.0, PACO.xi, T.paso + 1.0] },
    { id: 'cancilleria', r: [Cn.x0, Cn.z0, Cn.x1, Cn.z1] },
    { id: 'patio_cancilleria', r: [E.x0, Cn.pz0, Cm.x0, Cn.z0] },
    { id: 'patio_cancilleria', r: [E.x0, Cn.z0, Cn.x0, zSO] }
  );
}
