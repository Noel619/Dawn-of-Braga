// Los barrios entre las calles principales: callejones, plazuelas, pasadizos
// cubiertos e interiores que conectan unas calles con otras. La ciudad deja
// de ser una cruz de calles rectas: cada manzana tiene su trastienda.
// Norte = -Z. Unidades en metros.
import { RNG } from '../core/util.js';
import { house, overpass, stoneWall, cityWall, tower } from './builders.js';
import * as P from './props.js';
import { floor } from './level_util.js';
import { bakeCorpse } from '../entities/models.js';

const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);

// Callejón: transitable + suelo.
function lane(ctx, S, x0, z0, x1, z1, mat = 'cobble', o = {}) {
  W(S, x0, z0, x1, z1);
  floor(ctx, x0, z0, x1, z1, mat, 0, o);
}

// ======================================================================== NOROESTE
// Callejón del Pozo, Plazuela del Pozo con el obrador de la tejedora,
// Callejón del Arco (con pasadizo), Travesía de la Sé hasta la catedral y la
// Taberna del Cuervo, que une el Soto, la plaza y el callejón.
export function buildNW(ctx, S, L) {
  const wb = ctx.wb;

  // --- casas del lado norte del Soto y callejón del Pozo
  house(ctx, { x0: -48, z0: -19.5, x1: -42.5, z1: -3.5, front: 's', seed: 1101, h: 7.2, roofAxis: 'z' });
  lane(ctx, S, -42.5, -19.5, -40, -3.5);
  house(ctx, { x0: -40, z0: -19.5, x1: -33, z1: -3.5, front: 's', seed: 1102, h: 6.6, roofAxis: 'z', lit: true });
  house(ctx, { x0: -33, z0: -19.5, x1: -26.5, z1: -12.5, front: 'n', seed: 1103, h: 7.4 });
  P.laundry(ctx, -42.45, -8.5, -40.05, -8.5, 4.2, 1101);
  P.laundry(ctx, -42.45, -15, -40.05, -15, 4.5, 1102);
  P.lantern(ctx, -40, 2.75, -11.5, -Math.PI / 2, true);
  P.barrel(ctx, -41.9, 0, -17.8);
  P.crate(ctx, -40.6, 0, -6.2, 0.7, 0.3);
  P.basket(ctx, -41.8, 0, -13, { tipped: true, rot: 1.9 });
  bakeCorpse(wb, -41.2, 0, -10.2, 0.2, 'sit', 'villager', 4);
  P.decal(ctx, -41.2, 0.02, -10.4, 1.4);

  // --- plazuela del Pozo
  lane(ctx, S, -45, -32, -31, -19.5, 'flag');
  floor(ctx, -41, -29, -35, -22.5, 'cobble', 0.01);
  P.well(ctx, -38, 0, -25.8);
  // cobertizo de leña contra la torre del castillo
  W(S, -46.5, -24.5, -45, -19.5);
  floor(ctx, -46.5, -24.5, -45, -19.5, 'dirt', 0.005);
  P.leanTo(ctx, -46.5, -24.5, -44.6, -19.5, 'w', 3.3, 2.55);
  P.firewood(ctx, -46.1, 0, -23, Math.PI / 2, 4);
  P.firewood(ctx, -46.1, 0, -20.8, Math.PI / 2, 3);
  house(ctx, { x0: -48, z0: -32, x1: -45, z1: -24.5, front: 'e', seed: 1104, h: 6.2 });
  house(ctx, { x0: -48, z0: -40, x1: -40, z1: -32, front: 's', seed: 1105, h: 7.6, lit: true });
  house(ctx, { x0: -31, z0: -32, x1: -24, z1: -22, front: 'w', seed: 1106, h: 6.8 });
  house(ctx, { x0: -31, z0: -40, x1: -24, z1: -32, front: 'n', seed: 1107, h: 7.2, windows: false, jetty: 0 });
  P.niche(ctx, -31, 1.5, -27.5, 'w');
  P.laundry(ctx, -44.95, -27.5, -31.05, -27.5, 4.6, 1103);
  P.laundry(ctx, -38, -31.95, -38, -19.55, 4.9, 1104);
  P.wallTorch(ctx, -45, 2.6, -28, 'e');
  P.lantern(ctx, -31, 2.8, -24.5, -Math.PI / 2, true);
  P.bench(ctx, -44.4, 0, -29.8, 1.6, Math.PI / 2);
  P.cart(ctx, -33.4, 0, -30.2, 0.25, {});
  P.barrel(ctx, -44.3, 0, -20.4);
  P.barrel(ctx, -43.6, 0, -21.1, { lying: true, rot: 0.8 });
  P.jar(ctx, -36.2, 0, -24.3, 0.9, { broken: true });
  P.trough(ctx, -35.2, 0, -21, 0, { len: 2.4 });
  bakeCorpse(wb, -39.6, 0, -23.4, 2.3, 'face', 'villager', 2);
  bakeCorpse(wb, -42, 0, -29.2, 0.9, 'back', 'soldier', 6);
  P.decal(ctx, -39.6, 0.02, -23.4, 2);
  P.decal(ctx, -42, 0.02, -29.2, 2.2);
  P.decal(ctx, -31.05, 1.9, -25.5, 1.1, 'sigil', -Math.PI / 2, { wall: 'x' });
  ctx.crows.push({ x: -42, y: 0, z: -29.2, r: 1.4, n: 3 });
  ctx.crows.push({ pts: [[-38.9, 3.25, -25.8], [-37.1, 3.25, -25.8]], yaw: 0 });
  ctx.rats.push({ x: -45.8, y: 0, z: -22.2, n: 2 });

  // --- obrador de la tejedora (visitable)
  const troom = 'tejedor';
  house(ctx, { x0: -40, z0: -40, x1: -31, z1: -32, front: 's', seed: 1108, h: 6.6, style: 'timber', hollow: true, room: troom, doors: [{ side: 's', x: -35.5 }], jetty: 0 });
  wb.setRoom(troom);
  P.loom(ctx, -36.2, 0, -37.9, 0, { room: troom, cloth: 'clothRed' });
  P.spinningWheel(ctx, -32.6, 0, -35.2, -0.7, { room: troom });
  P.shelf(ctx, -39.4, 0, -36.2, Math.PI / 2, 1.8);
  P.shelf(ctx, -31.6, 0, -38.3, -Math.PI / 2, 1.6);
  P.table(ctx, -33, 0, -38.6, 1.4, 0.8, 0.2);
  P.stool(ctx, -33.4, 0, -37.4, { room: troom });
  for (const [bx, bz] of [[-39, -33.1], [-38.1, -33]]) P.basket(ctx, bx, 0, bz, { fill: 'clothWhite', fillTint: [0.85, 0.82, 0.75] });
  // la tejedora, colgada de una viga con su propio hilo
  bakeCorpse(wb, -34.4, 0.72, -35.8, 0.4, 'hang', 'villager', 1);
  wb.box('clothWhite', -34.42, 2.52, -35.82, -34.38, 3.1, -35.78, { ao: false, room: troom, tint: [0.8, 0.72, 0.6] });
  P.stool(ctx, -34.9, 0, -35.2, { room: troom, tipped: true });
  P.candles(ctx, -32.8, 0.8, -38.7, 3, 1105, { room: troom, radius: 5, intensity: 1.0, spread: 0.2 });
  P.candles(ctx, -39.3, 0, -32.9, 4, 1106, { room: troom, radius: 4, intensity: 0.7 });
  P.decal(ctx, -34.4, 0.03, -35.8, 1.2);
  wb.setRoom(null);
  L.interact.push({ kind: 'note', id: 'n_tejedora', note: 'tejedora', x: -32.8, y: 0.82, z: -38.4, model: 'paper' });

  // --- callejón del Arco: de la plazuela a la Calle de la Catedral
  lane(ctx, S, -31, -22, -3.5, -19.5);
  house(ctx, { x0: -24, z0: -31, x1: -18, z1: -22, front: 's', seed: 1109, h: 7.4, lit: true });
  overpass(ctx, -23, -22, -19.2, -19.5, 3.5, 6.3, 'x', { lit: true });
  house(ctx, { x0: -15.5, z0: -31, x1: -3.5, z1: -22, front: 'e', seed: 1110, h: 7.8, lit: true });
  P.sign(ctx, -18.6, 2.95, -19.5, Math.PI, 'cup');
  P.lantern(ctx, -12, 2.75, -22, 0, true);
  P.lantern(ctx, -27.5, 2.75, -19.5, Math.PI, false);
  P.laundry(ctx, -10, -21.95, -10, -19.55, 4.4, 1107);
  P.crate(ctx, -29.7, 0, -21.2, 0.8, 0.2);
  P.sacks(ctx, -25.5, 0, -21.5, 3, 1108);
  P.jar(ctx, -6.4, 0, -21.4, 0.9);
  bakeCorpse(wb, -13.6, 0, -20.6, 1.6, 'curl', 'villager', 5);
  P.decal(ctx, -13.6, 0.02, -20.6, 1.6);
  P.decal(ctx, -24.2, 1.8, -21.97, 1.1, 'sigil', 0, { wall: 'z' });
  ctx.rats.push({ x: -29.2, y: 0, z: -20.2, n: 2 });

  // --- travesía de la Sé (con un tramo cubierto) hasta la plaza de la catedral
  lane(ctx, S, -18, -40, -15.5, -22);
  house(ctx, { x0: -24, z0: -40, x1: -18, z1: -31, front: 'e', seed: 1111, h: 8 });
  house(ctx, { x0: -15.5, z0: -40, x1: -3.5, z1: -31, front: 'n', seed: 1112, h: 8.2 });
  overpass(ctx, -18, -36.2, -15.5, -33, 3.3, 6.6, 'z', {});
  P.wallTorch(ctx, -15.5, 2.5, -27, 'w');
  P.sign(ctx, -18, 2.95, -29.5, -Math.PI / 2, 'spindle');
  P.barrel(ctx, -17.4, 0, -38.6);
  P.decal(ctx, -16.8, 0.02, -30, 1.4);
  P.decal(ctx, -16.6, 0.02, -34.6, 2.2);

  // --- taberna del Cuervo: sala, cocina y despensa
  const room = 'taberna';
  house(ctx, {
    x0: -26.5,
    z0: -19.5,
    x1: -14,
    z1: -3.5,
    front: 's',
    seed: 1113,
    h: 7.6,
    style: 'timber',
    hollow: true,
    room,
    lit: true,
    litChance: 0.7,
    jetty: 0,
    chimney: true,
    chimneyAt: [-25.6, -8],
    smoke: true,
    doors: [
      { side: 's', x: -20 },
      { side: 'e', z: -9 },
      { side: 'n', x: -17.6 },
    ],
    walls: [
      { x0: -26.15, z0: -12.1, x1: -14.35, z1: -11.9, doors: [{ at: -22.4, w: 1.2 }] },
      { x0: -20.1, z0: -19.15, x1: -19.9, z1: -12.1, doors: [{ at: -15.6, w: 1.1 }] },
    ],
  });
  P.sign(ctx, -20.6, 2.95, -3.5, 0, 'cup');
  wb.setRoom(room);
  // sala: hogar, barra, mesas
  P.hearth(ctx, -26.15, 0, -7.4, 'e', { room, w: 2 });
  P.counter(ctx, -17.4, 0, -10.7, 0, 3.4, { room });
  P.cask(ctx, -18.8, 0, -11.45, 0, { room, r: 0.4, len: 1.1 });
  P.cask(ctx, -16.2, 0, -11.45, 0, { room, r: 0.4, len: 1.1 });
  P.shelf(ctx, -14.6, 0, -6.2, -Math.PI / 2, 1.6);
  P.table(ctx, -22.6, 0, -5.6, 1.8, 0.9, 0.1);
  P.bench(ctx, -22.6, 0, -6.4, 1.6, 0.1);
  P.bench(ctx, -22.6, 0, -4.8, 1.6, 0.1);
  P.table(ctx, -18, 0, -6.4, 1.4, 0.8, -0.3);
  for (const [sx, sz] of [[-18.9, -5.7], [-17.2, -7.1], [-17.1, -5.5]]) P.stool(ctx, sx, 0, sz, { room });
  P.table(ctx, -24.2, 0, -10.2, 1.2, 0.8, 1.2);
  P.stool(ctx, -23.1, 0, -10.8, { room });
  P.candles(ctx, -22.2, 0.8, -5.5, 3, 1109, { room, radius: 5, intensity: 1.0, spread: 0.25 });
  P.candles(ctx, -17.9, 0.8, -6.3, 2, 1110, { room, radius: 4, intensity: 0.8, spread: 0.2 });
  P.candles(ctx, -17.4, 1.08, -10.6, 3, 1111, { room, radius: 4.5, intensity: 0.9, spread: 0.3 });
  for (const [jx, jz] of [[-22.9, -5.4], [-21.9, -5.9], [-18.3, -6.2]]) P.jar(ctx, jx, 0.8, jz, 0.35, { collide: false });
  bakeCorpse(wb, -23.4, 0.02, -7.25, 0.1, 'sit', 'soldier', 5);
  bakeCorpse(wb, -19.6, 0, -8.6, 2.6, 'face', 'villager', 3);
  P.decal(ctx, -19.6, 0.03, -8.6, 2.2);
  P.decal(ctx, -24.8, 0.03, -9.6, 1.4);
  // cocina: fogón con caldero, mesa de despiece, jamones colgados. La mesa,
  // atravesada tras la puerta de la sala, se parte de un golpe (interact).
  P.hearth(ctx, -26.15, 0, -15.6, 'e', { room, w: 2.1, pot: true });
  L.interact.push({ kind: 'breakable', id: 'x_mesa_taberna', x: -22.4, y: 0, z: -13.1, w: 2.0, d: 0.8, rot: 0 });
  P.shelf(ctx, -23.8, 0, -18.8, 0, 1.8);
  P.sacks(ctx, -21, 0, -18.4, 4, 1112);
  P.barrel(ctx, -25.6, 0, -12.75);
  for (const hx of [-24.8, -23.6, -22.4]) {
    wb.box('burlap', hx - 0.01, 2.4, -15.61, hx + 0.01, 2.9, -15.59, { ao: false });
    P.ellipsoid(ctx, 'skinCorrupt', hx, 2.12, -15.6, 0.16, 0.3, 0.12, [0.75, 0.42, 0.38]);
  }
  bakeCorpse(wb, -23.2, 0, -16.6, 1.2, 'back', 'villager', 0);
  P.decal(ctx, -23.2, 0.03, -16.4, 2.4);
  // despensa: toneles, cajas y la trampilla de la bodega
  P.cask(ctx, -15.4, 0, -17.8, Math.PI / 2, { room });
  P.cask(ctx, -15.4, 0, -15.2, Math.PI / 2, { room });
  P.crate(ctx, -18.8, 0, -18.6, 0.8, 0.3);
  P.crate(ctx, -18.9, 0.8, -18.5, 0.6, 0.9);
  P.sacks(ctx, -17.6, 0, -13, 3, 1113);
  wb.box('wooddark', -18.3, 0.02, -15.4, -16.9, 0.06, -14.1, { ao: false, faces: 'tnsew' });
  wb.box('iron', -17.7, 0.06, -14.8, -17.5, 0.08, -14.6, { ao: false });
  wb.setRoom(null);
  L.interact.push({ kind: 'note', id: 'n_tabernero', note: 'tabernero', x: -16.6, y: 1.1, z: -10.6, model: 'book' });
  ctx.rats.push({ x: -15.2, y: 0, z: -13.4, n: 2 }, { x: -25.6, y: 0, z: -18.6, n: 1 });

  // --- enemigos
  L.enemies.push(
    { type: 'penitent', x: -37, y: 0, z: -24.3, yaw: 3.0, idle: 'kneel', id: 'e_pozo1' },
    { type: 'hound', x: -42.4, y: 0, z: -28.4, yaw: 2.2, idle: 'eat', id: 'e_pozo2' },
    { type: 'crawler', x: -21, y: 2.6, z: -8.2, yaw: 0, idle: 'ceiling', id: 'e_tab1' },
    { type: 'penitent', x: -23.9, y: 0, z: -17.2, yaw: 0.9, idle: 'eat', id: 'e_tab2' }
  );
  L.zones.push(
    { id: 'taberna', rects: [[-26.5, -19.5, -14, -3.5, -1, 4]], atmo: 'interior', room: 'taberna' },
    { id: 'tejedor', rects: [[-40, -40, -31, -32, -1, 4]], atmo: 'interior', room: 'tejedor' },
    { id: 'callejon_pozo', rects: [[-42.5, -19.5, -40, -3.5, -1, 8]], atmo: 'city' },
    { id: 'pozo', rects: [[-46.5, -32, -31, -19.5, -1, 8]], atmo: 'city' },
    { id: 'arco', rects: [[-31, -22, -3.5, -19.5, -1, 8]], atmo: 'city' },
    { id: 'callejon_se', rects: [[-18, -40, -15.5, -22, -1, 8]], atmo: 'city' }
  );
  L.map.push(
    { id: 'callejon_pozo', r: [-42.5, -19.5, -40, -3.5] },
    { id: 'pozo', r: [-46.5, -32, -31, -19.5] },
    { id: 'arco', r: [-31, -22, -3.5, -19.5] },
    { id: 'callejon_se', r: [-18, -40, -15.5, -22] },
    { id: 'taberna', r: [-26.5, -19.5, -14, -3.5] },
    { id: 'tejedor', r: [-40, -40, -31, -32] }
  );
  L.phantoms.push({ x: -16.7, y: 0, z: -38, trigger: [-16.7, 0, -24], kind: 'penitent' });
}

// ======================================================================== SUROESTE
// Patio del Horno: el horno de pan, el oratorio de Santa Bárbara (altar a
// salvo: ninguna criatura ronda el patio) y los callejones de la Fragua y del
// Yunque, que llevan a la puerta trasera de la herrería.
export function buildSW(ctx, S, L) {
  const wb = ctx.wb;

  // --- lado sur del Soto y callejón del Horno
  house(ctx, { x0: -48, z0: 3.5, x1: -41, z1: 12.5, front: 'n', seed: 1201, h: 6.8 });
  house(ctx, { x0: -41, z0: 3.5, x1: -35, z1: 12.5, front: 'n', seed: 1202, burned: true, h: 6.2 });
  lane(ctx, S, -35, 3.5, -32.5, 16);
  house(ctx, { x0: -32.5, z0: 3.5, x1: -23, z1: 12.5, front: 'n', seed: 1203, lit: true, h: 7.4 });
  house(ctx, { x0: -41, z0: 12.5, x1: -35, z1: 17, front: 'e', seed: 1204, h: 6.4 });
  house(ctx, { x0: -32.5, z0: 12.5, x1: -23, z1: 16, front: 's', seed: 1205, h: 6.6 });
  P.laundry(ctx, -34.95, 7, -32.55, 7, 4.3, 1201);
  P.lantern(ctx, -32.5, 2.75, 10, Math.PI / 2, true);
  P.barrel(ctx, -34.4, 0, 14.6);
  P.firewood(ctx, -32.95, 0, 12.4, 0, 3);
  // callejón del Rastro: de la plaza al patio
  lane(ctx, S, -23, 10.5, -14, 14);
  lane(ctx, S, -23, 14, -20.5, 16);
  house(ctx, { x0: -23, z0: 3.5, x1: -14, z1: 10.5, front: 'e', seed: 1206, h: 7 });
  P.sign(ctx, -16.5, 2.95, 14, Math.PI, 1);
  P.laundry(ctx, -18.5, 10.55, -18.5, 13.95, 4.1, 1202);
  P.crate(ctx, -22.3, 0, 11.3, 0.8, 0.5);
  P.jar(ctx, -21.6, 0, 11.1, 0.8);

  // --- patio del Horno
  lane(ctx, S, -35, 16, -20.5, 28, 'dirt');
  floor(ctx, -31, 19, -24.5, 25, 'flag', 0.01);
  // el horno en el rincón suroeste (antes tapaba la boca del callejón de la
  // Fragua) con su leña al lado; el abrevadero contra la pared este, fuera
  // del paso del callejón del Rastro y de la puerta de la panadería
  P.breadOven(ctx, -31.9, 0, 26.1, Math.PI, { flue: 3.6 });
  P.trough(ctx, -21.05, 0, 24.3, Math.PI / 2, { len: 2.2 });
  P.firewood(ctx, -34.35, 0, 26.8, 0, 4);
  P.firewood(ctx, -34.35, 0, 24.9, 0, 3);
  P.sacks(ctx, -24.6, 0, 27, 5, 1203);
  P.cart(ctx, -30.6, 0, 18.4, 0.1, {});
  P.laundry(ctx, -34.95, 22.5, -20.55, 22.5, 4.6, 1203);
  P.lantern(ctx, -20.5, 2.8, 17.2, -Math.PI / 2, true);
  P.wallTorch(ctx, -35, 2.6, 19.1, 'e');
  P.wallTorch(ctx, -35, 2.6, 23.9, 'e');
  P.basket(ctx, -23.3, 0, 25.6, { fill: 'straw', fillTint: [0.9, 0.6, 0.3] });
  P.jar(ctx, -21.2, 0, 27.3, 1.0);
  P.decal(ctx, -28, 0.02, 22, 1.2);
  // cuervos en el poyo del horno, detrás de la cúpula
  ctx.crows.push({ pts: [[-33.0, 0.9, 27.45], [-30.8, 0.9, 27.45]], yaw: Math.PI });

  // --- horno de pan (visitable)
  const broom = 'panaderia';
  house(ctx, {
    x0: -20.5,
    z0: 14,
    x1: -12.5,
    z1: 24,
    front: 'w',
    seed: 1207,
    h: 6.4,
    style: 'plaster',
    hollow: true,
    room: broom,
    lit: true,
    litChance: 0.8,
    jetty: 0,
    chimney: true,
    chimneyAt: [-14.2, 19],
    chimneySize: 0.5,
    smoke: true,
    doors: [
      { side: 'n', x: -16.6 },
      { side: 'w', z: 21 },
    ],
  });
  wb.setRoom(broom);
  P.breadOven(ctx, -14.25, 0, 19, -Math.PI / 2, { room: broom, r: 1.15, flue: 3.1 });
  P.kneadTrough(ctx, -17.8, 0, 16.2, 0, { room: broom, flesh: true });
  P.shelf(ctx, -19.9, 0, 17.1, Math.PI / 2, 1.8);
  P.table(ctx, -17.4, 0, 22.7, 2, 0.8, 0);
  for (let i = 0; i < 6; i++) P.ellipsoid(ctx, 'straw', -18.2 + i * 0.32, 0.86, 22.7 + (i % 2) * 0.12, 0.13, 0.08, 0.1, [0.92, 0.6, 0.3]);
  P.sacks(ctx, -19.6, 0, 23, 4, 1204);
  P.barrel(ctx, -13.2, 0, 23.1);
  P.barrel(ctx, -13.1, 0, 15);
  bakeCorpse(wb, -15.9, 0, 21.6, Math.PI / 2 + 0.3, 'sit', 'villager', 1);
  P.decal(ctx, -16, 0.03, 21.4, 1.8);
  P.candles(ctx, -17.2, 0.8, 22.6, 2, 1205, { room: broom, radius: 4, intensity: 0.7, spread: 0.2 });
  wb.setRoom(null);
  L.interact.push({ kind: 'note', id: 'n_panadero', note: 'panadero', x: -17.8, y: 0.98, z: 16.5, model: 'paper' });

  // --- oratorio de Santa Bárbara (altar)
  const oroom = 'oratorio';
  house(ctx, { x0: -41, z0: 17, x1: -35, z1: 26, front: 'e', seed: 1208, h: 6.2, style: 'stone', hollow: true, room: oroom, doors: [{ side: 'e', z: 21.5, w: 1.4, h: 2.5 }], jetty: 0, lowerWindows: false, floorMat: 'flag' });
  // espadaña con campanil sobre la puerta
  wb.box('ashlar', -35.3, 6.2, 20.6, -34.9, 8.2, 22.4, { sub: 2 });
  wb.box('black', -34.9, 6.8, 21.1, -34.88, 7.8, 21.9, { ao: false, grime: false });
  wb.cylinder('bronze', -35.1, 6.9, 21.5, 0.28, 0.14, 0.45, 8, { ao: false });
  wb.setRoom(oroom);
  P.candleAltar(ctx, -39.9, 0, 21.5, Math.PI / 2, oroom);
  P.veiledStatue(ctx, -40.1, 0, 18.3, 0.9, { ped: 0.8 });
  P.veiledStatue(ctx, -40.1, 0, 24.7, 2.2, { ped: 0.8, veil: 'clothRed' });
  // la torre de Santa Bárbara (su atributo), en miniatura sobre una peana
  wb.box('ashlar', -40.5, 0.8, 21.35, -40.2, 1.9, 21.65, { ao: false, room: oroom });
  P.pew(ctx, -37.2, 0, 19, 2.0, -Math.PI / 2);
  P.pew(ctx, -37.2, 0, 24, 2.0, -Math.PI / 2);
  P.candles(ctx, -40.2, 0, 19.8, 7, 1206, { room: oroom, radius: 5, intensity: 1.0, spread: 0.3 });
  P.candles(ctx, -40.2, 0, 23.2, 7, 1207, { room: oroom, radius: 5, intensity: 1.0, spread: 0.3 });
  P.candles(ctx, -35.8, 0, 17.8, 4, 1208, { room: oroom, radius: 3.5, intensity: 0.7 });
  P.candles(ctx, -35.8, 0, 25.2, 4, 1209, { room: oroom, radius: 3.5, intensity: 0.7 });
  // exvotos de cera colgados en las paredes
  const rng = new RNG(1210);
  for (let i = 0; i < 14; i++) {
    const side = rng.chance(0.5);
    const yy = rng.range(1.5, 2.6);
    const zw = side ? 17.36 : 25.64;
    const px = -40.2 + rng.range(0, 4.2);
    wb.box('candle', px - 0.05, yy - 0.12, side ? zw : zw - 0.05, px + 0.05, yy + 0.12, side ? zw + 0.05 : zw, { ao: false, grime: false, room: oroom, tint: [0.95, 0.9, 0.75] });
  }
  wb.setRoom(null);
  L.interact.push({ kind: 'altar', id: 'a_praca', name: 'Oratorio de Santa Bárbara', x: -39.9, y: 0, z: 21.5, spawn: [-38.2, 0, 21.5], yaw: Math.PI / 2 });

  // --- casas alrededor del patio
  house(ctx, { x0: -48, z0: 12.5, x1: -41, z1: 30, front: 'e', seed: 1209, h: 7.2, windows: false });
  house(ctx, { x0: -41, z0: 26, x1: -35, z1: 36, front: 'e', seed: 1210, h: 6.6 });
  house(ctx, { x0: -35, z0: 28, x1: -28.5, z1: 36, front: 'n', seed: 1211, h: 7 });
  house(ctx, { x0: -26, z0: 28, x1: -20.5, z1: 33, front: 'n', seed: 1212, h: 6.4 });
  house(ctx, { x0: -20.5, z0: 24, x1: -12.5, z1: 33, front: 'w', seed: 1213, h: 7.6, lit: true });

  // --- callejón de la Fragua y callejón del Yunque
  lane(ctx, S, -28.5, 28, -26, 51);
  lane(ctx, S, -26, 33, -3.5, 35.5);
  house(ctx, { x0: -40, z0: 36, x1: -28.5, z1: 46, front: 'e', seed: 1214, h: 7 });
  house(ctx, { x0: -40, z0: 46, x1: -28.5, z1: 58, front: 'e', seed: 1215, h: 6.6 });
  house(ctx, { x0: -48, z0: 30, x1: -40, z1: 44, front: 'e', seed: 1216, h: 6.8, windows: false, jetty: 0 });
  house(ctx, { x0: -48, z0: 44, x1: -40, z1: 58, front: 'e', seed: 1217, h: 7.4, windows: false, jetty: 0 });
  house(ctx, { x0: -26, z0: 35.5, x1: -14, z1: 42, front: 'n', seed: 1218, h: 7.2 });
  stoneWall(ctx, -28.5, 51, -26, 51.6, 4.2);
  P.niche(ctx, -27.25, 1.2, 51, 'n');
  P.rubble(ctx, -27.2, 0, 50.4, 5, 1219, 0.6, { scale: 0.6 });
  P.wallTorch(ctx, -26, 2.6, 44, 'w');
  P.wallTorch(ctx, -12, 2.6, 33, 's');
  P.lantern(ctx, -28.5, 2.75, 31.5, Math.PI / 2, false);
  P.laundry(ctx, -28.45, 38.5, -26.05, 38.5, 4.4, 1204);
  P.laundry(ctx, -20, 33.05, -20, 35.45, 4.2, 1205);
  P.sign(ctx, -26, 2.95, 47.6, Math.PI / 2 + Math.PI, 'horseshoe');
  P.barrel(ctx, -27.9, 0, 29.2);
  P.crate(ctx, -26.7, 0, 36.6, 0.8, 0.1);
  P.cartWheel(ctx, -28.2, 0, 42.5, Math.PI / 2);
  P.jar(ctx, -24.5, 0, 34.9, 0.9, { broken: true });
  bakeCorpse(wb, -9.6, 0, 34.2, 0.3, 'back', 'villager', 2);
  P.decal(ctx, -9.6, 0.02, 34.2, 1.8);
  bakeCorpse(wb, -27.3, 0, 48.8, 3.0, 'face', 'soldier', 1);
  P.decal(ctx, -27.3, 0.02, 48.8, 1.6);
  ctx.rats.push({ x: -27.9, y: 0, z: 50.2, n: 2 }, { x: -4.4, y: 0, z: 34.8, n: 1 });

  L.enemies.push(
    { type: 'soldier', x: -27.2, y: 0, z: 39.5, yaw: Math.PI, idle: 'stand', id: 'e_frag1' },
    { type: 'hound', x: -10.4, y: 0, z: 34.4, yaw: 1.2, idle: 'eat', id: 'e_yun1' }
  );
  L.zones.push(
    { id: 'panaderia', rects: [[-20.5, 14, -12.5, 24, -1, 4]], atmo: 'interior', room: 'panaderia' },
    { id: 'oratorio', rects: [[-41, 17, -35, 26, -1, 4]], atmo: 'chapel', room: 'oratorio' },
    { id: 'horno', rects: [[-35, 16, -20.5, 28, -1, 8], [-35, 3.5, -32.5, 16, -1, 8], [-23, 10.5, -14, 14, -1, 8], [-23, 14, -20.5, 16, -1, 8]], atmo: 'city' },
    { id: 'fragua_callejon', rects: [[-28.5, 28, -26, 51, -1, 8], [-26, 33, -3.5, 35.5, -1, 8]], atmo: 'city' }
  );
  L.map.push(
    { id: 'horno', r: [-35, 16, -20.5, 28] },
    { id: 'horno', r: [-35, 3.5, -32.5, 16] },
    { id: 'horno', r: [-23, 10.5, -14, 14] },
    { id: 'horno', r: [-23, 14, -20.5, 16] },
    { id: 'panaderia', r: [-20.5, 14, -12.5, 24] },
    { id: 'oratorio', r: [-41, 17, -35, 26] },
    { id: 'fragua_callejon', r: [-28.5, 28, -26, 51] },
    { id: 'fragua_callejon', r: [-26, 33, -3.5, 35.5] }
  );
}

// ======================================================================== NORESTE
// Callejón de las Ánimas y patio de los Tintoreros, con la tintorería y un
// pasaje hasta la Calle de los Pellejeros (antes de la barricada).
export function buildNE(ctx, S, L) {
  const wb = ctx.wb;
  lane(ctx, S, 3.5, -24.5, 22, -22);
  house(ctx, { x0: 3.5, z0: -31, x1: 12.5, z1: -24.5, front: 'w', seed: 1301, h: 7.2 });
  house(ctx, { x0: 12.5, z0: -31, x1: 22, z1: -24.5, front: 's', seed: 1302, h: 6.6, lit: true });
  house(ctx, { x0: 14, z0: -22, x1: 22, z1: -14, front: 'n', seed: 1303, h: 7 });
  P.laundry(ctx, 8, -24.45, 8, -22.05, 4.3, 1301);
  P.lantern(ctx, 12.5, 2.75, -24.5, Math.PI, true);
  P.barrel(ctx, 20.9, 0, -23.8);
  P.crate(ctx, 4.4, 0, -23.8, 0.7, 0.4);
  bakeCorpse(wb, 16.2, 0, -23.3, 1.4, 'face', 'villager', 3);
  P.decal(ctx, 16.2, 0.02, -23.3, 1.8);

  // --- patio de los Tintoreros
  lane(ctx, S, 22, -32, 34, -20, 'flag');
  floor(ctx, 25, -29, 31, -23, 'dirt', 0.01);
  P.dyeVat(ctx, 25.4, 0, -28.4, [0.22, 0.3, 0.85]);
  P.dyeVat(ctx, 28.2, 0, -29.2, [0.8, 0.18, 0.12], { r: 0.7 });
  P.dyeVat(ctx, 31.4, 0, -28.6, [0.72, 0.6, 0.15], { r: 0.75 });
  P.trough(ctx, 32.6, 0, -21.4, 0, { len: 2.4, blood: true });
  // paños teñidos secándose en bastidores
  for (const [x, z, rot, k] of [
    [26, -23.4, 0, 0],
    [29.6, -24.6, 0.1, 1],
  ]) {
    wb.at(x, 0, z, rot, () => {
      for (const sx of [-1.3, 1.3]) wb.box('wooddark', sx - 0.05, 0, -0.05, sx + 0.05, 2.5, 0.05, { ao: false });
      wb.box('wooddark', -1.4, 2.4, -0.04, 1.4, 2.48, 0.04, { ao: false });
      for (let i = 0; i < 4; i++) {
        const col = [[0.25, 0.32, 0.8], [0.78, 0.2, 0.14], [0.7, 0.6, 0.2], [0.35, 0.2, 0.45]][(i + k) % 4];
        wb.box('clothWhite', -1.2 + i * 0.62, 0.9 + (i % 2) * 0.2, -0.01, -0.7 + i * 0.62, 2.4, 0.01, { ao: false, grime: false, faces: 'ns', tint: col });
      }
    });
    P.colOBB(ctx, x, z, 1.4, 0.1, rot, 0, 2.5);
  }
  P.laundry(ctx, 22.05, -30.5, 33.95, -30.5, 4.8, 1302);
  P.wallTorch(ctx, 34, 2.6, -22.4, 'w');
  P.lantern(ctx, 22, 2.8, -28, Math.PI / 2, true);
  P.sacks(ctx, 23.2, 0, -31, 3, 1303);
  P.basket(ctx, 33.2, 0, -31.2, { fill: 'clothBlue', fillTint: [0.3, 0.35, 0.8] });
  bakeCorpse(wb, 24.6, 0, -27.3, 2.2, 'kneel', 'villager', 4);
  P.decal(ctx, 25.4, 0.02, -27.2, 2.4);
  house(ctx, { x0: 22, z0: -37.5, x1: 34, z1: -32, front: 's', seed: 1304, h: 7.4, lit: true });
  house(ctx, { x0: 34, z0: -37.5, x1: 44, z1: -32, front: 's', seed: 1305, h: 7 });
  house(ctx, { x0: 24.5, z0: -20, x1: 34, z1: -12, front: 'n', seed: 1306, h: 6.8 });
  ctx.crows.push({ x: 24.6, y: 0, z: -27.3, r: 1.2, n: 3 });
  ctx.rats.push({ x: 33.2, y: 0, z: -20.6, n: 2 });

  // --- tintorería (visitable)
  const room = 'tintoreria';
  house(ctx, { x0: 34, z0: -32, x1: 42, z1: -20, front: 'w', seed: 1307, h: 7.2, style: 'timber', hollow: true, room, doors: [{ side: 'w', z: -26 }], jetty: 0, chimney: false });
  wb.setRoom(room);
  P.dyeVat(ctx, 39.8, 0, -29.6, [0.12, 0.1, 0.12], { room, r: 0.95 });
  P.dyeVat(ctx, 39.8, 0, -22.6, [0.7, 0.12, 0.1], { room, r: 0.9 });
  P.shelf(ctx, 34.6, 0, -30.2, Math.PI / 2, 1.8);
  P.table(ctx, 37, 0, -21.1, 1.8, 0.8, 0);
  for (let i = 0; i < 7; i++) P.jar(ctx, 36.3 + (i % 4) * 0.4, 0.8, -21.2 + Math.floor(i / 4) * 0.3, 0.35, { collide: false, tint: [[0.3, 0.35, 0.8], [0.8, 0.2, 0.15], [0.75, 0.62, 0.2]][i % 3] });
  // varales con paños colgando del techo
  for (const zz of [-28, -24.6]) {
    wb.box('wooddark', 34.5, 2.7, zz - 0.03, 41.5, 2.76, zz + 0.03, { ao: false });
    for (let i = 0; i < 5; i++) wb.box('clothWhite', 35 + i * 1.3, 1.2 + (i % 2) * 0.3, zz - 0.01, 35.9 + i * 1.3, 2.7, zz + 0.01, { ao: false, grime: false, faces: 'ns', tint: [[0.3, 0.35, 0.8], [0.8, 0.2, 0.15], [0.75, 0.62, 0.2], [0.35, 0.2, 0.45], [0.3, 0.55, 0.3]][i] });
  }
  bakeCorpse(wb, 38.8, 0, -26.4, 0.5, 'face', 'villager', 2);
  P.decal(ctx, 38.8, 0.03, -26.4, 2.2);
  P.candles(ctx, 36.6, 0.8, -21.2, 3, 1304, { room, radius: 5, intensity: 1.0, spread: 0.25 });
  P.candles(ctx, 41.3, 0, -31.2, 4, 1305, { room, radius: 4, intensity: 0.7 });
  wb.setRoom(null);
  L.interact.push({ kind: 'item', id: 'i_ampolla3', item: 'ampolla', x: 34.6, y: 1.4, z: -30.2 });

  // --- pasaje hasta los Pellejeros
  lane(ctx, S, 22, -20, 24.5, -3);
  P.laundry(ctx, 22.05, -9, 24.45, -9, 4.1, 1304);
  P.lantern(ctx, 24.5, 2.75, -15, -Math.PI / 2, false);
  P.crate(ctx, 23.8, 0, -18.8, 0.7, 0.3);
  P.decal(ctx, 23.2, 0.02, -11, 1.4);
  ctx.rats.push({ x: 23.9, y: 0, z: -6, n: 1 });

  L.enemies.push(
    { type: 'soldier', x: 28, y: 0, z: -25.8, yaw: -2.6, idle: 'wander', id: 'e_tin1' },
    { type: 'penitent', x: 31.2, y: 0, z: -22.6, yaw: 3.1, idle: 'kneel', id: 'e_tin2' },
    { type: 'mourner', x: 40.2, y: 0, z: -26.2, yaw: -Math.PI / 2, idle: 'stand', id: 'e_tin3' }
  );
  L.zones.push(
    { id: 'tintoreria', rects: [[34, -32, 42, -20, -1, 4]], atmo: 'interior', room: 'tintoreria' },
    { id: 'tintoreros', rects: [[22, -32, 34, -20, -1, 8], [3.5, -24.5, 22, -22, -1, 8], [22, -20, 24.5, -3, -1, 8]], atmo: 'city' }
  );
  L.map.push({ id: 'tintoreros', r: [22, -32, 34, -20] }, { id: 'tintoreros', r: [3.5, -24.5, 22, -22] }, { id: 'tintoreros', r: [22, -20, 24.5, -3] }, { id: 'tintoreria', r: [34, -32, 42, -20] });
}

// ======================================================================== SURESTE
// Corral de los Pellejeros con su establo: se entra desde la plaza y desde la
// Calle de la Herrería; una puerta atrancada lo une con los Pellejeros (atajo
// que sólo se abre desde el otro lado de la barricada).
export function buildSE(ctx, S, L) {
  const wb = ctx.wb;
  // --- callejón del Rastro (desde la esquina de la plaza) y del Muladar (desde la herrería)
  lane(ctx, S, 14, 11, 16.5, 17);
  lane(ctx, S, 3.5, 26, 14, 28.5);
  house(ctx, { x0: 16.5, z0: 11, x1: 23, z1: 17, front: 'w', seed: 1401, h: 6.6 });
  house(ctx, { x0: 3.5, z0: 22, x1: 14, z1: 26, front: 'w', seed: 1402, h: 7, lit: true });
  house(ctx, { x0: 3.5, z0: 28.5, x1: 14, z1: 33, front: 'w', seed: 1403, h: 6.4 });
  P.laundry(ctx, 14.05, 15, 16.45, 15, 4.2, 1401);
  P.laundry(ctx, 9, 26.05, 9, 28.45, 4.3, 1402);
  P.lantern(ctx, 16.5, 2.75, 13, -Math.PI / 2, true);
  P.barrel(ctx, 4.5, 0, 27.8);
  P.decal(ctx, 11, 0.02, 27.2, 1.4);

  // --- corral
  lane(ctx, S, 14, 17, 30, 31, 'dirt');
  P.deadHorse(ctx, 22.6, 0, 23.2, 0.4);
  P.trough(ctx, 15.2, 0, 21.6, Math.PI / 2, { len: 2.6 });
  P.fence(ctx, 14.5, 26.2, 20.5, 26.2, { broken: true });
  P.fence(ctx, 20.5, 26.2, 20.5, 30.6, {});
  P.hay(ctx, 16, 0, 28.2, 0.2);
  P.hay(ctx, 17.6, 0, 29.6, -0.3);
  P.hay(ctx, 16.8, 0.8, 28.8, 0.1);
  P.cart(ctx, 26.4, 0, 28.6, 2.9, { brokenWheel: true });
  P.firewood(ctx, 26.2, 0, 17.6, Math.PI / 2, 3);
  P.rubble(ctx, 27.5, 0, 19.8, 6, 1404, 1.0, { mat: 'dirt', scale: 1.3 });
  P.wallTorch(ctx, 23, 2.6, 17, 's');
  P.lantern(ctx, 30, 2.8, 27.5, Math.PI / 2, true);
  bakeCorpse(wb, 18.6, 0, 19.4, 2.8, 'back', 'villager', 5);
  P.decal(ctx, 18.6, 0.02, 19.4, 1.8);
  ctx.crows.push({ x: 22.6, y: 0, z: 23.2, r: 1.8, n: 4 });
  ctx.crows.push({ pts: [[14.6, 1.25, 26.2], [16.6, 1.25, 26.2], [18.6, 1.25, 26.2]], yaw: 0 });
  ctx.rats.push({ x: 29.2, y: 0, z: 30.2, n: 2 });
  house(ctx, { x0: 14, z0: 31, x1: 24, z1: 42, front: 'n', seed: 1405, h: 7 });
  // (sin voladizo: su fachada da al establo y la planta alta se metía dentro)
  house(ctx, { x0: 24, z0: 31, x1: 38.5, z1: 42, front: 'n', seed: 1406, h: 6.6, windows: false, jetty: 0 });
  house(ctx, { x0: 23, z0: 12, x1: 30, z1: 17, front: 's', seed: 1407, h: 6.2 });
  house(ctx, { x0: 30, z0: 12, x1: 36, z1: 17, front: 's', seed: 1408, h: 6.8 });

  // --- establo (visitable)
  const room = 'establo';
  house(ctx, { x0: 30, z0: 19.5, x1: 38.5, z1: 31, front: 'w', seed: 1409, h: 6, style: 'stone', hollow: true, room, doors: [{ side: 'w', z: 25, w: 1.8, h: 2.6 }, { side: 'n', x: 34.2 }], jetty: 0, floorMat: 'dirt', chimney: false });
  wb.setRoom(room);
  // cuadras
  for (const zz of [22.4, 25.8]) {
    wb.box('planks', 35.1, 0, zz - 0.05, 38.15, 1.35, zz + 0.05, { ao: false, faces: 'tnsew' });
    ctx.col.add(35.1, 0, zz - 0.05, 38.15, 1.35, zz + 0.05);
    wb.box('wooddark', 35, 0, zz - 0.08, 35.2, 1.6, zz + 0.08, { ao: false });
  }
  P.hay(ctx, 37.2, 0, 21, 0.1);
  P.hay(ctx, 37.3, 0, 28.8, -0.2);
  P.deadHorse(ctx, 36.6, 0, 24.1, 1.6, { tint: [0.4, 0.36, 0.32], torn: false });
  P.barrel(ctx, 31, 0, 30.1);
  P.barrel(ctx, 31.8, 0, 30.2, { lying: true, rot: 0.4 });
  P.weaponRack(ctx, 30.5, 0, 22.5, Math.PI / 2);
  P.sacks(ctx, 33.4, 0, 30, 3, 1405);
  P.candles(ctx, 31.2, 0.95, 30.1, 2, 1406, { room, radius: 4.5, intensity: 0.8, spread: 0.15 });
  bakeCorpse(wb, 32.6, 0, 27.4, 0.7, 'curl', 'villager', 6);
  P.decal(ctx, 32.6, 0.03, 27.4, 1.6);
  wb.setRoom(null);
  L.interact.push({ kind: 'note', id: 'n_mozo', note: 'mozo', x: 31.1, y: 0.98, z: 30.1, model: 'paper' });

  // --- pasaje de la puerta atrancada
  lane(ctx, S, 30, 17, 36, 19.5);
  lane(ctx, S, 36, 3, 38.5, 19.5);
  house(ctx, { x0: 38.5, z0: 3, x1: 42, z1: 19.5, front: 'w', seed: 1410, h: 6.8 });
  house(ctx, { x0: 38.5, z0: 19.5, x1: 42, z1: 31, front: 'w', seed: 1411, h: 6.4, windows: false, jetty: 0 });
  P.wallTorch(ctx, 36, 2.6, 9, 'e');
  P.crate(ctx, 37.9, 0, 17.8, 0.7, 0.2);
  P.barrel(ctx, 36.6, 0, 12.4, { lying: true, rot: 1.4 });
  L.interact.push({ kind: 'door', id: 'd_corral', x: 37.25, y: 0, z: 3.05, w: 2.5, h: 2.55, axis: 'x', lock: { type: 'barred', side: -1 }, mat: 'planks', hinge: -1, swing: -1, inset: 0.13 });
  wb.box('ashlar', 35.9, 2.6, 2.85, 38.6, 3.1, 3.25, { ao: false, faces: 'tnsewb' });

  L.enemies.push(
    { type: 'hound', x: 21.6, y: 0, z: 22.4, yaw: 0.8, idle: 'eat', id: 'e_cor1' },
    { type: 'hound', x: 23.4, y: 0, z: 24.4, yaw: -2.2, idle: 'eat', id: 'e_cor2' },
    { type: 'soldier', x: 33.4, y: 0, z: 23.4, yaw: -Math.PI / 2, idle: 'stand', id: 'e_est1' }
  );
  L.zones.push(
    { id: 'establo', rects: [[30, 19.5, 38.5, 31, -1, 4]], atmo: 'interior', room: 'establo' },
    { id: 'corral', rects: [[14, 17, 30, 31, -1, 8], [14, 11, 16.5, 17, -1, 8], [3.5, 26, 14, 28.5, -1, 8], [30, 17, 36, 19.5, -1, 8], [36, 3.2, 38.5, 19.5, -1, 8]], atmo: 'city' }
  );
  L.map.push({ id: 'corral', r: [14, 17, 30, 31] }, { id: 'corral', r: [14, 11, 16.5, 17] }, { id: 'corral', r: [3.5, 26, 14, 28.5] }, { id: 'corral', r: [30, 17, 36, 19.5] }, { id: 'corral', r: [36, 3, 38.5, 19.5] }, { id: 'establo', r: [30, 19.5, 38.5, 31] });
}

// ======================================================================== RELLENO
// Manzanas que no se pisan pero se ven desde el adarve, la torre del Postigo o
// por encima de los tejados, y murallas que cierran la ciudad: desde arriba ya
// no se asoma uno al vacío.
export function buildFillers(ctx, S, L) {
  const rng = new RNG(4242);
  // (sin voladizo: la fachada de una manzana de relleno suele dar a otra casa,
  // y la planta alta en saledizo se metía dentro de la vecina)
  const block = (x0, z0, x1, z1, o = {}) => house(ctx, { x0, z0, x1, z1, front: o.front ?? rng.pick(['n', 's', 'e', 'w']), seed: Math.floor(rng.next() * 1e9), h: o.h ?? rng.range(5.8, 8.2), windows: o.windows, lit: o.lit, burned: o.burned, jetty: o.jetty ?? 0 });
  // noroeste, detrás de la plaza de la catedral
  block(-48, -48, -38, -40, { front: 'n' });
  block(-38, -48, -27, -40, { front: 'n', lit: true });
  block(-48, -56, -38, -48);
  block(-38, -56, -27, -48, { burned: true });
  block(-48, -64, -34, -56);
  block(-34, -64, -18, -62, { h: 5.5 });
  block(-34, -62, -27, -56);
  block(-27, -62, -18, -56, { h: 6.2 });
  // noreste: entre el claustro, la Sé y la torre del Postigo
  block(44, -40, 55, -32, { front: 'n' });
  block(48, -32, 55, -26);
  block(42, -32, 48, -21);
  block(40, -72, 50, -62, { front: 's' });
  block(50, -72, 62, -62, { front: 's', lit: true });
  block(37, -84, 48, -72);
  block(48, -84, 62, -72, { burned: true });
  block(37, -98, 50, -84);
  block(50, -98, 64, -84, { lit: true });
  block(62, -84, 72, -68);
  block(64, -100, 72, -84);
  // sureste: detrás de la capilla y hasta la muralla sur
  block(42, 22, 50, 31, { front: 'n' });
  block(50, 22, 58, 31, { front: 'n', lit: true });
  block(58, 21, 66, 31, { front: 'n' });
  block(66, 21, 72, 31, { front: 'n' });
  block(24, 42, 36, 50, { front: 'w' });
  block(24, 50, 36, 58, { front: 'w', burned: true });
  block(36, 42, 48, 50);
  block(36, 50, 48, 58);
  block(48, 31, 60, 44, { lit: true });
  block(60, 31, 72, 44);
  block(48, 44, 60, 58);
  block(60, 44, 72, 58, { burned: true });
  block(38.5, 31, 48, 42);

  // murallas que faltaban: oeste (del castillo a la puerta sur), sur y este
  cityWall(ctx, -52, 24.5, -48, 62, 9, { merlonSides: ['w'] });
  cityWall(ctx, -52, 58, -30, 62, 9, { merlonSides: ['s'] });
  tower(ctx, -50, 60, 5, 12);
  tower(ctx, -50, 41, 4.5, 11.5);
  cityWall(ctx, 30, 58, 72, 62, 9, { merlonSides: ['s'] });
  cityWall(ctx, 72, 26, 76, 62, 9, { merlonSides: ['e'] });
  tower(ctx, 74, 60, 5.5, 12.5);
  tower(ctx, 51, 60, 4.5, 11.5);
  cityWall(ctx, 72, -122, 76, -68, 9, { merlonSides: ['e'] });
  tower(ctx, 74, -95, 6, 12.5);
}
