// Braga intramuros: castillo, calles, plazas, curtidurías, murallas y fragua.
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { house, solid, stairs, merlons, cityWall, tower, archWall, stoneWall, overpass } from './builders.js';
import * as P from './props.js';
import { floor, houseRow, interiorRoom } from './level_util.js';
import { bakeCorpse } from '../entities/models.js';

const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);

// ======================================================================== CASTILLO
export function buildCastle(ctx, S, L) {
  const wb = ctx.wb;
  W(S, -90, -20, -51, 20);
  S.paint(-88, -19, -73, -4, 0);
  W(S, -86.5, -17.5, -74.5, -5.5);
  W(S, -74.6, -9, -72.9, -7.5);
  W(S, -51.2, -2.5, -47.8, 2.5);

  // --- suelo del patio
  floor(ctx, -90, -20, -51, 20, 'dirt');
  floor(ctx, -73, -3, -51, 3, 'flag', 0.02);
  floor(ctx, -73, -10, -68, -3, 'flag', 0.02);
  // pasadizo bajo el arco de la puerta (enlaza el patio con la Calle del Soto);
  // empieza donde acaba el enlosado del patio (no se solapan)
  floor(ctx, -51, -2.6, -47.8, 2.6, 'flag', 0.02, { tint: [0.85, 0.83, 0.8] });
  wb.box('ashlar', -49.8, 0, -2.6, -49.4, 0.06, 2.6, { faces: 'tnsew', ao: false });

  // --- murallas del castillo
  cityWall(ctx, -93, -23, -48, -20, 9, { merlonSides: ['n'] });
  cityWall(ctx, -93, 20, -48, 23, 9, { merlonSides: ['s'] });
  cityWall(ctx, -93, -20, -90, 20, 9, { merlonSides: ['w'] });
  // muro este con la puerta
  archWall(ctx, -20, 20, -51, -48, 9, 0, 5, 5.8, { axis: 'z', slices: 10 });
  merlons(ctx, -48.3, -20, -48.3, 20, 9, { collide: false });
  // rastrillo medio levantado
  for (let z = -2.3; z <= 2.31; z += 0.46) wb.box('iron', -49.7, 3.6, z - 0.04, -49.5, 6.2, z + 0.04, { ao: false });
  for (let y = 3.8; y < 6.2; y += 0.5) wb.box('iron', -49.72, y, -2.4, -49.48, y + 0.07, 2.4, { ao: false });
  for (let z = -2.3; z <= 2.31; z += 0.46) wb.box('iron', -49.66, 3.3, z - 0.02, -49.54, 3.6, z + 0.02, { ao: false });
  // torres
  tower(ctx, -49.5, -5.3, 5, 13);
  tower(ctx, -49.5, 5.3, 5, 13);
  tower(ctx, -91.5, -21.5, 6, 12);
  tower(ctx, -91.5, 21.5, 6, 12);
  tower(ctx, -49.5, -21.5, 6, 12);
  tower(ctx, -49.5, 21.5, 6, 12);
  P.banner(ctx, -46.9, 11.5, -5.3, Math.PI / 2, 'bannerBlack', 1.6, 4);
  P.banner(ctx, -46.9, 11.5, 5.3, Math.PI / 2, 'bannerBlack', 1.6, 4);

  // --- torre del homenaje (cárcel en planta baja)
  const room = 'prison';
  const K = { x0: -88, z0: -19, x1: -73, z1: -4, h: 20 };
  const t = 1.5;
  // (sin cara superior: la cubre la cornisa, y a la misma altura parpadeaban)
  solid(ctx, 'wallstone', K.x0, 0, K.z0, K.x0 + t, K.h, K.z1, { sub: 2, aoH: 2, faces: 'nsew' });
  solid(ctx, 'wallstone', K.x1 - t, 0, K.z0, K.x1, K.h, -9, { sub: 2, aoH: 2, faces: 'nsew' });
  solid(ctx, 'wallstone', K.x1 - t, 0, -7.5, K.x1, K.h, K.z1, { sub: 2, aoH: 2, faces: 'nsew' });
  solid(ctx, 'wallstone', K.x1 - t, 2.5, -9, K.x1, K.h, -7.5, { sub: 2, ao: false, faces: 'nsewb' });
  solid(ctx, 'wallstone', K.x0 + t, 0, K.z0, K.x1 - t, K.h, K.z0 + t, { sub: 2, aoH: 2, faces: 'nsew' });
  solid(ctx, 'wallstone', K.x0 + t, 0, K.z1 - t, K.x1 - t, K.h, K.z1, { sub: 2, aoH: 2, faces: 'nsew' });
  wb.box('wallstone', K.x0 - 0.4, K.h - 0.6, K.z0 - 0.4, K.x1 + 0.4, K.h, K.z1 + 0.4, { ao: false, sub: 3, faces: 'tnsewb' });
  merlons(ctx, K.x0 - 0.4, K.z0 - 0.1, K.x1 + 0.4, K.z0 - 0.1, K.h, { collide: false });
  merlons(ctx, K.x0 - 0.4, K.z1 + 0.1, K.x1 + 0.4, K.z1 + 0.1, K.h, { collide: false });
  merlons(ctx, K.x0 - 0.1, K.z0, K.x0 - 0.1, K.z1, K.h, { collide: false });
  merlons(ctx, K.x1 + 0.1, K.z0, K.x1 + 0.1, K.z1, K.h, { collide: false });
  // contrafuertes
  for (const [x, z] of [
    [K.x0, K.z0],
    [K.x1, K.z0],
    [K.x0, K.z1],
    [K.x1, K.z1],
  ])
    solid(ctx, 'wallstone', x - 0.8, 0, z - 0.8, x + 0.8, 14, z + 0.8, { sub: 2 });
  for (let y = 7; y < 18; y += 4) {
    wb.box('black', K.x1 + 0.01, y, -12, K.x1 + 0.03, y + 1.4, -11.7, { ao: false, grime: false });
    wb.box('black', -80.6, y, K.z1 + 0.01, -80.3, y + 1.4, K.z1 + 0.03, { ao: false, grime: false });
  }
  P.banner(ctx, K.x1 + 0.1, 15, -14, Math.PI / 2, 'bannerBlack', 2, 5);
  // marco de la puerta exterior
  wb.box('ashlar', K.x1, 0, -9.35, K.x1 + 0.2, 2.8, -9, { ao: false });
  wb.box('ashlar', K.x1, 0, -7.5, K.x1 + 0.2, 2.8, -7.15, { ao: false });
  wb.box('ashlar', K.x1, 2.5, -9.35, K.x1 + 0.22, 2.9, -7.15, { ao: false, faces: 'tnsewb' });

  // interior de la cárcel
  wb.setRoom(room);
  wb.box('flag', -86.5, -0.1, -17.5, -74.5, 0.01, -5.5, { faces: 't', ao: false, room, uv: 0.6 });
  wb.box('wallstone', -86.5, 4.2, -17.5, -74.5, 4.6, -5.5, { faces: 'b', ao: false, room, tint: [0.6, 0.6, 0.6] });
  for (let x = -85; x < -75; x += 2.5) wb.box('wooddark', x - 0.15, 3.85, -17.5, x + 0.15, 4.2, -5.5, { ao: false, room, faces: 'nsewb' });
  ctx.col.add(-86.5, 4.2, -17.5, -74.5, 4.6, -5.5).cam = true;
  // celdas
  for (const x of [-82.75, -78.75]) solid(ctx, 'wallstone', x, 0, -17.5, x + 0.5, 4.2, -13.5, { sub: 1.5, room });
  const bars = (xa, xb, gap0, gap1) => {
    for (let x = xa + 0.1; x < xb; x += 0.22) {
      if (x > gap0 && x < gap1) continue;
      wb.box('iron', x - 0.025, 0, -13.55, x + 0.025, 4.2, -13.45, { ao: false, room });
    }
    wb.box('iron', xa, 2.4, -13.6, xb, 2.48, -13.4, { ao: false, room, faces: 'tnsewb' });
    wb.box('iron', xa, 0.1, -13.6, xb, 0.18, -13.4, { ao: false, room });
    if (gap0 > xa) ctx.col.add(xa, 0, -13.6, gap0, 4.2, -13.4).cam = false;
    if (gap1 < xb) ctx.col.add(gap1, 0, -13.6, xb, 4.2, -13.4).cam = false;
  };
  bars(-86.5, -82.75, -85.3, -84.2);
  bars(-82.25, -78.75, -81.1, -80.0);
  bars(-78.25, -74.5, -77.1, -76.0);
  // puerta de la celda 1 abierta (reventada)
  wb.push();
  wb.translate(-85.3, 0, -13.5);
  wb.rotateY(-1.9);
  for (let x = 0.08; x < 1.1; x += 0.22) wb.box('iron', x - 0.025, 0.05, -0.03, x + 0.025, 2.35, 0.03, { ao: false, room });
  wb.box('iron', 0, 2.2, -0.04, 1.1, 2.3, 0.04, { ao: false, room });
  wb.box('iron', 0, 0.1, -0.04, 1.1, 0.2, 0.04, { ao: false, room });
  wb.pop();
  // celda 2 cerrada (con un preso muerto dentro)
  for (let x = -81.02; x < -80.0; x += 0.22) wb.box('iron', x - 0.025, 0, -13.55, x + 0.025, 2.35, -13.45, { ao: false, room });
  ctx.col.add(-81.1, 0, -13.6, -80.0, 4.2, -13.4).cam = false;
  bakeCorpse(wb, -80.5, 0, -16.2, 0.5, 'curl', 'villager', 7);
  // celda 3: puerta arrancada en el suelo
  wb.push();
  wb.translate(-76.8, 0.06, -12.2);
  wb.rotateY(0.3);
  for (let x = 0.08; x < 1.1; x += 0.22) wb.box('iron', x - 0.025, 0, -0.03, x + 0.025, 0.05, 2.3, { ao: false, room });
  wb.pop();
  // camastros de paja, cadenas, cubos
  for (const x of [-85.8, -81.6, -77.6]) wb.box('straw', x, 0, -17.3, x + 1.9, 0.25, -16.2, { faces: 'tnsew', ao: false, room });
  for (const x of [-86.4, -82.2, -78.1]) {
    for (let k = 0; k < 6; k++) wb.box('iron', x, 1.5 - k * 0.12, -16.8, x + 0.06, 1.6 - k * 0.12, -16.74, { ao: false, room });
  }
  P.bones(ctx, -84.8, 0, -16.5, 6, 3, 0.4);
  P.decal(ctx, -84.2, 0.01, -15.3, 1.6);
  P.decal(ctx, -77, 0.01, -11.4, 2.4);
  P.decal(ctx, -80.5, 0.01, -9.2, 1.2);
  // cuerpo de guardia: mesa, carcelero muerto, estante de armas
  P.table(ctx, -83, 0, -8.2, 1.8, 0.9, 0);
  P.bench(ctx, -83, 0, -9.1, 1.6, 0);
  bakeCorpse(wb, -83.4, 0.02, -9.4, Math.PI, 'sit', 'soldier', 1);
  P.candles(ctx, -82.4, 0.8, -8.0, 4, 11, { room, radius: 5, intensity: 1.2, spread: 0.2 });
  P.weaponRack(ctx, -79.5, 0, -5.75, Math.PI);
  P.barrel(ctx, -86, 0, -6.2);
  P.barrel(ctx, -85.2, 0, -6.0);
  P.crate(ctx, -75.4, 0, -6.3, 0.8, 0.3);
  P.wallTorch(ctx, -86.5, 2.2, -11.5, 'e', { room, radius: 7 });
  P.wallTorch(ctx, -74.5, 2.2, -14.5, 'w', { room, radius: 6 });
  P.wallTorch(ctx, -80.5, 2.2, -5.5, 'n', { room, radius: 6, dyn: 2.5 });
  bakeCorpse(wb, -76.2, 0.02, -16.6, 2.2, 'back', 'soldier', 4);
  P.decal(ctx, -76.2, 0.01, -16.3, 2.2);
  P.fleshGrowth(ctx, -75.2, 0, -16.5, 0.7, 51, { room, climb: 0.9, bound: [-78, -74.6, -17.4, -13.7] });
  wb.setRoom(null);

  L.interact.push(
    { kind: 'note', id: 'n_celda', note: 'celda', x: -86.3, y: 1.3, z: -15.4, model: 'wall', r: 1.5 },
    { kind: 'note', id: 'n_carcelero', note: 'carcelero', x: -82.7, y: 0.82, z: -8.3, model: 'paper' },
    { kind: 'item', id: 'i_espada', item: 'espada', x: -80.1, y: 0.9, z: -6.0 },
    { kind: 'item', id: 'i_escudo', item: 'escudo', x: -78.9, y: 0.9, z: -6.0 },
    { kind: 'door', id: 'd_carcel', x: -73.75, y: 0, z: -8.25, w: 1.5, h: 2.45, axis: 'z', lock: { type: 'none' }, mat: 'planks', hinge: -1, swing: 1, plane: -73.05 }
  );

  // --- patio
  P.well(ctx, -62, 0, -12);
  P.cart(ctx, -58, 0, 9, 0.4, { burning: true, bodies: true, brokenWheel: true });
  P.hay(ctx, -84, 0, 17, 0.2);
  P.hay(ctx, -82.4, 0, 17.4, -0.1);
  P.hay(ctx, -83.2, 0.8, 17.2, 0.1);
  // cobertizo de cuadras
  for (let x = -88; x <= -70; x += 4.5) {
    wb.box('wooddark', x - 0.12, 0, 14.4, x + 0.12, 3.2, 14.64, { ao: false });
    ctx.col.add(x - 0.15, 0, 14.35, x + 0.15, 3.2, 14.7).cam = false;
  }
  // cobertizo de una sola agua apoyado en la muralla (viga y canes en el muro)
  {
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    wb.quad('roof', V3(-89.2, 3.05, 13.8), V3(-68.8, 3.05, 13.8), V3(-68.8, 5.1, 20), V3(-89.2, 5.1, 20), { ao: false, sub: 2.4 });
    wb.quad('wooddark', V3(-68.8, 2.93, 13.8), V3(-89.2, 2.93, 13.8), V3(-89.2, 4.98, 20), V3(-68.8, 4.98, 20), { ao: false, sub: 3, tint: [0.5, 0.48, 0.45] });
    wb.box('wooddark', -89.2, 2.95, 14.3, -68.8, 3.2, 14.72, { ao: false, faces: 'nsewb' });
    wb.box('wooddark', -89.2, 4.8, 19.65, -68.8, 5.05, 20, { ao: false, faces: 'nsewb' });
    for (let x = -88; x <= -70; x += 2.25) wb.box('wooddark', x - 0.07, 3.1, 14.5, x + 0.07, 3.2, 19.9, { ao: false, faces: 'nsewb' });
  }
  // picas con cabezas junto a la puerta
  P.pike(ctx, -54, 0, -4.2, { tilt: 0.1 });
  P.pike(ctx, -54.6, 0, -5.4, { tilt: -0.08, skull: true });
  P.pike(ctx, -54, 0, 4.4, { tilt: -0.1 });
  P.pike(ctx, -55, 0, 5.8, { tilt: 0.12 });
  P.gibbet(ctx, -66, 0, 15, 4.4);
  P.ladder(ctx, -70, 0, -20, 8.4, 0, 0.22);
  P.ladder(ctx, -60, 0, -20, 8.4, 0.06, 0.2);
  P.arrows(ctx, -65, 0, -4, 8, 21);
  P.arrows(ctx, -78, 0, 6, 6, 22);
  P.barrel(ctx, -52, 0, -12.6, {});
  P.barrel(ctx, -52.4, 0, -11.4, { lying: true, rot: 0.3 });
  P.crate(ctx, -53, 0, 17, 1.0, 0.2);
  P.crate(ctx, -54.4, 0, 17.4, 0.8, 0.7);
  P.sacks(ctx, -86.5, 0, 6, 4, 3);
  P.brazier(ctx, -70, 0, -3.8);
  P.brazier(ctx, -56, 0, 3.8);
  bakeCorpse(wb, -60, 0, -3, 1.2, 'back', 'soldier', 2);
  bakeCorpse(wb, -66.5, 0, 6.5, -0.8, 'face', 'soldier', 3);
  bakeCorpse(wb, -79, 0, 0, 2.2, 'face', 'villager', 5);
  bakeCorpse(wb, -53, 0, -9, 0.2, 'sit', 'soldier', 6);
  P.decal(ctx, -60, 0.02, -3, 2.5);
  P.decal(ctx, -66.5, 0.02, 6.5, 2.2);
  P.decal(ctx, -71, 0.02, 1, 1.8);
  P.fleshGrowth(ctx, -89.6, 0, 8, 1.2, 52, { climb: 1.2 });
  P.fleshGrowth(ctx, -51.5, 0, -12, 0.9, 53, { climb: 1.4 });
  P.rubble(ctx, -73, 0, 18, 10, 5, 1.6);
  // capilla de la guarnición: el altar del castillo, a resguardo del patio
  const croomC = 'castle_chapel';
  house(ctx, { x0: -61, z0: -20, x1: -53, z1: -14, front: 's', seed: 91, h: 6.2, style: 'stone', hollow: true, room: croomC, doors: [{ side: 's', x: -57, w: 1.4, h: 2.5 }], jetty: 0, lowerWindows: false, floorMat: 'flag', roofAxis: 'x' });
  wb.box('ashlar', -57.3, 6.2, -14.4, -56.7, 7.8, -13.9, { sub: 2 });
  wb.box('ashlar', -57.8, 7.2, -14.35, -56.2, 7.45, -13.95, { ao: false });
  wb.setRoom(croomC);
  P.candleAltar(ctx, -57, 0, -19.05, 0, croomC);
  P.pew(ctx, -58.8, 0, -16.2, 2.4, 0);
  P.pew(ctx, -55.2, 0, -16.2, 2.4, 0);
  P.candles(ctx, -60.3, 0, -19.3, 6, 71, { room: croomC, radius: 4.5, intensity: 0.9 });
  P.candles(ctx, -53.7, 0, -19.3, 6, 72, { room: croomC, radius: 4.5, intensity: 0.9 });
  P.veiledStatue(ctx, -60.2, 0, -14.9, 0.7, { ped: 0.7 });
  P.chains(ctx, -53.7, 2.6, -17.2, 9, 0);
  bakeCorpse(wb, -55.6, 0, -15.1, 0.2, 'kneel', 'soldier', 5);
  wb.setRoom(null);
  P.banner(ctx, -58.9, 5.2, -13.9, 0, 'bannerBlack', 1.2, 2.6);
  P.banner(ctx, -55.1, 5.2, -13.9, 0, 'bannerBlack', 1.2, 2.6);
  L.interact.push({ kind: 'altar', id: 'a_castelo', name: 'Capilla de la guarnición', x: -57, y: 0, z: -19.05, spawn: [-57, 0, -17.3], yaw: 0 });

  // --- guarnición: patio de armas, tiendas derribadas y restos de la batalla
  P.target(ctx, -66.5, 0, -19.3, 0);
  P.target(ctx, -76, 0, -3.6, 0.2);
  P.weaponRack(ctx, -63.4, 0, -19.75, 0);
  P.dummy(ctx, -64.2, 0, -12.6, 0.3);
  P.dummy(ctx, -66.8, 0, -14.4, -0.4);
  P.tent(ctx, -84.2, 0, 1.6, 0.25, 'burlap');
  P.tent(ctx, -75.5, 0, 8.8, -0.35, 'clothDark');
  P.siegeStone(ctx, -69.5, 0, 5.2, 0.5);
  P.siegeStone(ctx, -62.5, 0, -7.2, 0.42);
  P.dropped(ctx, -63.2, 0, 3.8, 0.7, 'sword');
  P.dropped(ctx, -67.4, 0, 4.9, 2.1, 'shield');
  P.dropped(ctx, -58.8, 0, -4.4, 1.2, 'helmet');
  P.dropped(ctx, -76.4, 0, -1.6, 0.3, 'spear');
  P.dropped(ctx, -60.5, 0, 3.6, 2.6, 'axe');
  P.dropped(ctx, -82.2, 0, 4.4, 1.1, 'shield');
  // cacharros junto al pozo
  P.jar(ctx, -60.5, 0, -12.9, 0.9);
  P.jar(ctx, -61.1, 0, -10.4, 0.8, { lying: true, rot: 1 });
  P.basket(ctx, -63.6, 0, -10.8, { tipped: true, rot: 2 });
  // bajo el cobertizo: barriles, cajas y leña
  P.barrel(ctx, -88.9, 0, 15.8);
  P.barrel(ctx, -88.7, 0, 17.4, { lying: true, rot: 0.2 });
  P.crate(ctx, -79.4, 0, 18.9, 0.9, 0.1);
  P.crate(ctx, -78.2, 0, 19.2, 0.7, 0.5);
  P.crate(ctx, -79.3, 0.9, 18.95, 0.6, 0.35);
  P.firewood(ctx, -69.6, 0, 19.35, Math.PI / 2, 3);
  P.firewood(ctx, -72.4, 0, -15.6, 0, 3);
  P.sacks(ctx, -86.8, 0, 11.2, 3, 41);
  // vida: cuervos sobre los muertos y en la jaula, ratas en la cárcel y el cobertizo
  ctx.crows.push({ x: -66.5, y: 0, z: 6.5, r: 1.5, n: 4 });
  ctx.crows.push({ pts: [[-65.55, 4.9, 15], [-64.95, 4.9, 15]], yaw: 0 });
  ctx.rats.push({ x: -84.4, y: 0, z: -16.4, n: 2 }, { x: -76.6, y: 0, z: -7.4, n: 1 }, { x: -80.8, y: 0, z: 17.6, n: 2 });

  L.enemies.push(
    { type: 'penitent', x: -76.4, y: 0, z: -15.6, yaw: 0.3, idle: 'eat', id: 'e_carcel1' },
    { type: 'penitent', x: -63, y: 0, z: 1, yaw: -1.2, idle: 'wander', id: 'e_patio1' },
    { type: 'penitent', x: -81, y: 0, z: 9, yaw: 0.5, idle: 'kneel', id: 'e_patio2' },
    { type: 'soldier', x: -56, y: 0, z: 6.5, yaw: -Math.PI / 2, idle: 'stand', id: 'e_patio3' }
  );
  L.zones.push(
    { id: 'prison', rects: [[-86.5, -17.5, -74.5, -5.5, -1, 5]], atmo: 'prison', room: 'prison' },
    { id: 'castle_chapel', rects: [[-61, -20, -53, -14, -1, 5]], atmo: 'chapel', room: 'castle_chapel' },
    { id: 'castle', rects: [[-93, -23, -47.8, 23, -1, 20]], atmo: 'city' }
  );
  L.map.push({ id: 'prison', r: [-86.5, -17.5, -74.5, -5.5] }, { id: 'castle', r: [-90, -20, -51, 20], cut: [-88, -19, -73, -4] }, { id: 'castle_chapel', r: [-61, -20, -53, -14] });
  L.phantoms.push({ x: -72, y: 9, z: 21.5, trigger: [-70, 0, 10] });
}

// ======================================================================== RUA DO SOUTO
export function buildSouto(ctx, S, L) {
  const wb = ctx.wb;
  W(S, -48, -3.5, -14, 3.5);
  floor(ctx, -48, -3.5, -14, 3.5, 'cobble');
  // canalón central
  wb.box('flag', -48, -0.05, -0.4, -14, 0.005, 0.4, { faces: 't', ao: false, tint: [0.7, 0.7, 0.7] });
  // (las fachadas de ambos lados, con sus callejones, están en level_barrios.js)
  // pasadizo que cruza la calle por encima: la calle deja de ser un tubo recto
  overpass(ctx, -31.4, -3.5, -28, 3.5, 3.7, 6.7, 'x', { lit: true });

  // casa tapiada (interior visitable)
  const room = 'souto_house';
  house(ctx, { x0: -33, z0: -12.5, x1: -26.5, z1: -3.5, front: 's', seed: 106, hollow: true, h: 6.8, style: 'plaster', doorAt: 3.25, room, windows: true, jetty: 0 });
  wb.setRoom(room);
  P.table(ctx, -31, 0, -10.5, 1.4, 0.8, 0.2);
  P.shelf(ctx, -27.3, 0, -9, -Math.PI / 2, 1.4);
  P.bed(ctx, -31.4, 0, -6.2, 0);
  P.candles(ctx, -31.2, 0.8, -10.4, 3, 14, { room, radius: 4.5, intensity: 1.0, spread: 0.2 });
  P.decal(ctx, -29.5, 0.03, -7.5, 2);
  wb.setRoom(null);
  L.interact.push(
    { kind: 'door', id: 'd_souto', x: -29.75, y: 0, z: -3.5, w: 1.3, h: 2.25, axis: 'x', lock: { type: 'boards' }, mat: 'planks', hinge: -1, swing: 1, plane: -3.8 },
    { kind: 'note', id: 'n_madre', note: 'madre', x: -30.8, y: 0.82, z: -10.4, model: 'paper' },
    { kind: 'item', id: 'i_ampolla1', item: 'ampolla', x: -27.4, y: 1.4, z: -9 }
  );
  L.enemies.push({ type: 'penitent', x: -28.2, y: 0, z: -11.4, yaw: Math.PI, idle: 'window', id: 'e_hija' });

  // atrezo de la calle
  P.cart(ctx, -38, 0, 1.6, 0.3, { tipped: true });
  P.barrel(ctx, -44, 0, -2.6);
  P.barrel(ctx, -43.2, 0, -2.9, { lying: true, rot: 1.2 });
  P.crate(ctx, -24.5, 0, 2.6, 0.9, 0.4);
  P.sacks(ctx, -41, 0, 2.7, 3, 7);
  bakeCorpse(wb, -34.5, 0, -1.4, 1.9, 'face', 'villager', 1);
  bakeCorpse(wb, -27, 0, 1.8, -0.4, 'back', 'villager', 2);
  bakeCorpse(wb, -19, 0, -2.4, 0.7, 'curl', 'villager', 3);
  P.decal(ctx, -34.5, 0.02, -1.4, 2.2);
  P.decal(ctx, -27, 0.02, 1.8, 1.8);
  P.decal(ctx, -31, 0.02, 0, 1.2);
  P.decal(ctx, -22, 0.02, -1, 1.6);
  // sigilo del pacto pintado en puertas
  for (const [x, z, r] of [
    [-37.2, -3.44, 0],
    [-36.2, 3.44, Math.PI],
    [-23.6, -3.44, 0],
  ])
    P.decal(ctx, x, 1.8, z, 1.2, 'sigil', r, { wall: 'z' });
  P.wallTorch(ctx, -44, 2.6, 3.5, 'n');
  P.wallTorch(ctx, -17, 2.6, -3.5, 's');
  P.fleshGrowth(ctx, -46, 0, 3.2, 0.8, 61, { climb: 1.2, bound: [-48, -44, 3, 4] });
  // --- vida de la calle: ropa tendida, rótulos, faroles y cacharros
  P.laundry(ctx, -44.8, -3.45, -44.8, 3.45, 4.5, 11);
  P.laundry(ctx, -35.2, -3.45, -35.2, 3.45, 4.7, 12);
  P.laundry(ctx, -24.8, -3.45, -24.8, 3.45, 4.4, 13);
  P.sign(ctx, -45.6, 2.95, -3.5, 0, 0);
  P.sign(ctx, -30.4, 2.95, 3.5, Math.PI, 1);
  P.lantern(ctx, -37.9, 2.75, -3.5, 0, false);
  P.lantern(ctx, -26.1, 2.75, 3.5, Math.PI, true);
  P.lantern(ctx, -15.6, 2.75, 3.5, Math.PI, false);
  P.jar(ctx, -39.2, 0, -3.1, 0.85);
  P.jar(ctx, -38.6, 0, -3.15, 0.7, { broken: true });
  P.basket(ctx, -33.6, 0, 2.9, { tipped: true, rot: 2.6 });
  P.firewood(ctx, -18.6, 0, 2.95, Math.PI / 2, 3);
  P.crate(ctx, -46.9, 0, -2.7, 0.7, 0.3);
  P.dropped(ctx, -31.5, 0, 1.3, 0.4, 'spear');
  P.dropped(ctx, -22.3, 0, 0.8, 2.2, 'helmet');
  ctx.rats.push({ x: -45.4, y: 0, z: -2.5, n: 2 }, { x: -31.8, y: 0, z: -8.2, n: 1 });

  L.enemies.push(
    { type: 'hound', x: -37, y: 0, z: -1, yaw: 1.2, idle: 'eat', id: 'e_souto1' },
    { type: 'hound', x: -35.5, y: 0, z: 0.5, yaw: 1.6, idle: 'eat', id: 'e_souto2' },
    { type: 'penitent', x: -19.5, y: 0, z: -1.8, yaw: -1, idle: 'eat', id: 'e_souto3' }
  );
  L.zones.push({ id: 'souto_house', rects: [[-33, -12.5, -26.5, -3.6, -1, 4]], atmo: 'interior', room: 'souto_house' }, { id: 'souto', rects: [[-48, -3.5, -14, 3.5, -1, 8]], atmo: 'city' });
  L.map.push({ id: 'souto', r: [-48, -3.5, -14, 3.5] }, { id: 'souto_house', r: [-32.6, -12.1, -26.9, -3.85] });
  L.phantoms.push({ x: -16, y: 0, z: 0, trigger: [-40, 0, 0], kind: 'penitent' });
}

// ======================================================================== PRAÇA DO PÃO
export function buildPraca(ctx, S, L) {
  const wb = ctx.wb;
  W(S, -14, -14, 14, 14);
  floor(ctx, -14, -16.5, 14, 14, 'flag');
  wb.cylinder('cobble', 0, -0.19, 0, 7.5, 7.5, 0.2, 16, { capTop: true, ao: false });

  // soportales en el lado norte: la planta alta vuela sobre columnas
  house(ctx, { x0: -14, z0: -19.5, x1: -3.5, z1: -16.5, front: 's', seed: 201, lit: true, h: 7.4, style: 'timber', jetty: 2.5, arcade: true });
  house(ctx, { x0: 3.5, z0: -22, x1: 14, z1: -16.5, front: 's', seed: 202, h: 8, style: 'plaster', jetty: 2.5, arcade: true });
  house(ctx, { x0: -12.5, z0: 14, x1: -3.5, z1: 22, front: 'n', seed: 203, burned: true });
  house(ctx, { x0: 3.5, z0: 14, x1: 14, z1: 22, front: 'n', seed: 204 });
  house(ctx, { x0: 14, z0: -14, x1: 22, z1: -3, front: 'w', seed: 205, h: 7 });
  house(ctx, { x0: 14, z0: 3, x1: 23, z1: 11, front: 'w', seed: 206, lit: true });
  // (la taberna ocupa el lado oeste al norte del Soto: level_barrios.js)

  P.fountain(ctx, 0, 0, 0);
  P.gallows(ctx, -8.5, 0, -8.2, 0.5, 3);
  P.pelourinho(ctx, 8.6, 0, 8.2);
  P.stall(ctx, -10.5, 0, 9.4, 0.2, { burning: true, cloth: 'clothBlue', goods: 'cloth' });
  P.stall(ctx, 10.4, 0, -10, Math.PI + 0.1, { goods: 'bread' });
  P.stall(ctx, 10.2, 0, -4.9, Math.PI / 2 + 0.1, { cloth: 'clothBlue', goods: 'veg' });
  P.stall(ctx, -6.6, 0, 10.4, 0.05, { cloth: 'clothRed', cloth2: 'burlap', goods: 'pots' });
  // (la carnicería, en la esquina sureste: delante de la Calle de la Catedral
  // tapaba la entrada a la calle)
  P.stall(ctx, 6.2, 0, 11.6, Math.PI + 0.05, { cloth: 'clothDark', cloth2: 'clothWhite', goods: 'meat' });
  P.cart(ctx, -10, 0, 3.5, 1.4, { bodies: true });
  P.crate(ctx, -12.6, 0, 8.1, 0.9, 0.2);
  P.crate(ctx, -11.5, 0, 7.4, 0.7, 0.9);
  P.barrel(ctx, 12.6, 0, 9.4);
  P.sacks(ctx, 11.8, 0, -12.2, 4, 9);
  bakeCorpse(wb, 4.5, 0, -4.2, 2.8, 'face', 'villager', 3);
  bakeCorpse(wb, -3.6, 0, 6.6, 0.6, 'back', 'soldier', 4);
  bakeCorpse(wb, 6, 0, 3, -1.4, 'curl', 'villager', 0);
  for (const [x, z, s] of [
    [4.5, -4.2, 2.4],
    [-3.6, 6.6, 2.2],
    [2, 2, 1.4],
    [-6, -3, 1.6],
    [7, -9, 1.3],
  ])
    P.decal(ctx, x, 0.02, z, s);
  P.brazier(ctx, -9.6, 0, 12.6, { smoke: false });
  P.brazier(ctx, 6.5, 0, -12, {});
  P.decal(ctx, 13.94, 2, -8, 1.3, 'sigil', -Math.PI / 2, { wall: 'x' });
  // --- mercado abandonado
  P.jar(ctx, -12.2, 0, 5.6, 0.9, { broken: true });
  P.jar(ctx, -9.0, 0, 11.1, 0.8, { lying: true, rot: 0.4 });
  P.basket(ctx, 9.4, 0, -8.4, { tipped: true, rot: -2 });
  P.basket(ctx, 11.7, 0, -3.6);
  P.jar(ctx, 12.9, 0, -6.4, 1.0);
  P.siegeStone(ctx, -2.9, 0, -6.6, 0.55);
  P.dropped(ctx, 3.4, 0, 9.9, 1.4, 'shield');
  P.dropped(ctx, -6.9, 0, -1.4, 0.2, 'sword');
  // bajo los soportales: bancos, cajas y el género que nadie recogió
  P.bench(ctx, -11.2, 0, -16.1, 1.6, 0);
  P.bench(ctx, 9.4, 0, -16.1, 1.6, 0);
  P.crate(ctx, -5.2, 0, -16, 0.7, 0.2);
  P.sacks(ctx, 5, 0, -15.8, 3, 19);
  P.barrel(ctx, 12.8, 0, -15.7);
  P.sign(ctx, -6.2, 2.7, -16.5, 0, 1);
  P.sign(ctx, 6.1, 2.7, -16.5, 0, 2);
  P.sign(ctx, -9.2, 2.95, 14, Math.PI, 3);
  P.lantern(ctx, -11.9, 2.6, -16.5, 0, true);
  P.lantern(ctx, 1.6, 2.6, -16.5, 0, true);
  P.lantern(ctx, 14, 2.75, 7.6, -Math.PI / 2, true);
  // cuervos en la horca, en el pilón de la fuente y sobre un cadáver
  ctx.crows.push({ pts: [[-9.6, 5.5, -7.6], [-8.46, 5.5, -8.22], [-7.58, 5.5, -8.7]], yaw: 0.5 });
  ctx.crows.push({ pts: [[2.77, 0.87, 1.01], [1.72, 0.87, 2.4], [-1.97, 0.87, 2.2]] });
  ctx.crows.push({ x: 6, y: 0, z: 3, r: 1.1, n: 3 });
  ctx.rats.push({ x: -12.4, y: 0, z: 2.0, n: 2 }, { x: -13.2, y: 0, z: 9.2, n: 1 });

  L.enemies.push(
    { type: 'penitent', x: 2.5, y: 0, z: -4.4, yaw: 3, idle: 'kneel', id: 'e_praca1' },
    { type: 'penitent', x: -9, y: 0, z: -3.5, yaw: 0.4, idle: 'wander', id: 'e_praca2' },
    { type: 'soldier', x: 6, y: 0, z: 9.5, yaw: -2, idle: 'stand', id: 'e_praca3' }
  );
  L.zones.push({ id: 'praca', rects: [[-14, -16.5, 14, 14, -1, 10]], atmo: 'city' });
  L.map.push({ id: 'praca', r: [-14, -16.5, 14, 14] });
  L.phantoms.push({ x: 0, y: 0, z: -34, trigger: [0, 0, -8] });
  L.phantoms.push({ x: 0, y: 0, z: 36, trigger: [0, 0, 11], kind: 'bell' });
}

// ======================================================================== RUA DA SÉ
export function buildRuaSe(ctx, S, L) {
  const wb = ctx.wb;
  W(S, -3.5, -40, 3.5, -14);
  // el empedrado acaba donde empieza el enlosado de la plaza (bajo los
  // soportales): solapados a la misma altura parpadeaban
  floor(ctx, -3.5, -40, 3.5, -16.5, 'cobble');
  // (fachadas y cruces con los callejones del Arco y de las Ánimas: level_barrios.js)
  house(ctx, { x0: 3.5, z0: -40, x1: 12.5, z1: -31, front: 'n', seed: 304, h: 7.5 });
  // arco de la Sé: la calle se estrecha bajo un arco antes de la plaza
  archWall(ctx, -3.5, 3.5, -38.4, -37.6, 7.4, 0, 4.2, 5.0, { slices: 10 });
  wb.box('ashlar', -3.6, 7.4, -38.5, 3.6, 7.7, -37.5, { ao: false });
  merlons(ctx, -3.5, -38, 3.5, -38, 7.7, { collide: false, w: 0.6, gap: 0.5, h: 0.6, t: 0.5 });
  P.veiledStatue(ctx, 0, 5.95, -37.35, 0, { ped: 0 });
  P.banner(ctx, 0, 5.3, -37.5, 0, 'bannerBlack', 1.2, 2.2);
  // barricada a medio derribar
  P.cart(ctx, 1.6, 0, -29.6, 1.5, { tipped: true });
  P.barrel(ctx, -1.2, 0, -30.9, { lying: true, rot: 0.2 });
  P.crate(ctx, 2.7, 0, -32.2, 0.9, 0.3);
  P.sacks(ctx, 2.5, 0, -27.6, 4, 12);
  P.arrows(ctx, 0.5, 0, -28.6, 10, 31);
  bakeCorpse(wb, -1.6, 0, -26.6, 1.5, 'face', 'soldier', 2);
  bakeCorpse(wb, 1.8, 0, -35, -2.2, 'back', 'villager', 3);
  P.decal(ctx, -1.6, 0.02, -26.6, 2.2);
  P.decal(ctx, 0, 0.02, -18, 1.6);
  P.veiledStatue(ctx, -3.1, 2.4, -26.5, Math.PI / 2, { ped: 0 });
  wb.box('ashlar', -3.5, 2.2, -27.3, -2.6, 2.4, -25.7, { ao: false, faces: 'tnsewb' });
  P.wallTorch(ctx, 3.5, 2.8, -19.2, 'w');
  P.fleshGrowth(ctx, -3.2, 0, -35.4, 0.8, 71, { climb: 1.5, bound: [-3.5, -2.5, -37.4, -31] });
  P.laundry(ctx, -3.45, -17.6, 3.45, -17.6, 4.4, 14);
  P.laundry(ctx, -3.45, -33.8, 3.45, -33.8, 4.6, 15);
  P.sign(ctx, -3.5, 2.95, -24.6, Math.PI / 2, 3);
  P.sign(ctx, 3.5, 2.95, -28.8, -Math.PI / 2, 0);
  P.lantern(ctx, -3.5, 2.75, -29.6, Math.PI / 2, true);
  P.dropped(ctx, -1.9, 0, -32.6, 0.3, 'spear');
  P.dropped(ctx, 1.2, 0, -21.6, 2.2, 'helmet');
  P.dropped(ctx, -2.3, 0, -29.2, 1.0, 'shield');
  P.jar(ctx, 3.0, 0, -15.6, 0.8);
  P.basket(ctx, -2.9, 0, -15.2, { rot: 0.5 });
  ctx.rats.push({ x: 2.95, y: 0, z: -31.2, n: 2 });
  L.enemies.push({ type: 'soldier', x: 0.2, y: 0, z: -33, yaw: 0, idle: 'stand', id: 'e_ruase1' }, { type: 'hound', x: -1.5, y: 0, z: -35.8, yaw: 0.3, idle: 'eat', id: 'e_ruase2' });
  L.zones.push({ id: 'ruase', rects: [[-3.5, -40, 3.5, -14, -1, 10]], atmo: 'city' });
  L.map.push({ id: 'ruase', r: [-3.5, -40, 3.5, -14] });
}

// ======================================================================== LARGO DA SÉ
export function buildLargo(ctx, S, L) {
  const wb = ctx.wb;
  W(S, -18, -56, 22, -40);
  floor(ctx, -18, -56, 22, -40, 'flag');
  house(ctx, { x0: 12.5, z0: -40, x1: 22, z1: -31, front: 'n', seed: 402, lit: true });
  house(ctx, { x0: -27, z0: -48, x1: -18, z1: -40, front: 'e', seed: 403, h: 7.8 });
  house(ctx, { x0: -27, z0: -56, x1: -18, z1: -48, front: 'e', seed: 404, burned: true });
  // muros al norte flanqueando la Sé
  stoneWall(ctx, -18, -62, -13, -56, 5);
  stoneWall(ctx, 13, -62, 15.5, -56, 5);
  stoneWall(ctx, 19, -62, 22, -56, 5);
  wb.box('ashlar', 15.2, 4.6, -60.4, 19.3, 5.4, -59.6, { ao: false, faces: 'tnsewb' });

  P.pyre(ctx, 4.5, 0, -47, 81);
  P.cruzeiro(ctx, -9.5, 0, -47.5, 0.2);
  P.cart(ctx, 15.5, 0, -43.5, -0.4, {});
  P.barrel(ctx, 20.5, 0, -41.2);
  P.crate(ctx, -12.4, 0, -41.1, 1, 0.2);
  bakeCorpse(wb, 12, 0, -44, 0.9, 'back', 'soldier', 5);
  bakeCorpse(wb, -4, 0, -53, 2.9, 'face', 'villager', 6);
  bakeCorpse(wb, 8.5, 0, -53.5, -1.9, 'kneel', 'villager', 7);
  P.decal(ctx, 12, 0.02, -44, 2);
  P.decal(ctx, -4, 0.02, -53, 2);
  P.decal(ctx, 1, 0.02, -50, 3);
  P.wallTorch(ctx, -18, 2.8, -44, 'e');
  P.wallTorch(ctx, 22, 2.8, -53, 'w');
  L.interact.push({ kind: 'note', id: 'n_soldado', note: 'soldado', x: 12.6, y: 0.08, z: -43.3, model: 'paper' });
  // --- el atrio del sacrificio
  P.ritual(ctx, -12.5, 0, -51.5, 1.4, 7);
  P.stake(ctx, 18.2, 0, -52.8, 0.4, 3);
  // (apartada del portón del Postigo: la hoja chocaba con ella al abrirse)
  P.stake(ctx, 20.4, 0, -54.1, -0.6, 4);
  P.siegeStone(ctx, -14.2, 0, -44.6, 0.6);
  P.siegeStone(ctx, 9.6, 0, -41.6, 0.45);
  P.dropped(ctx, 13.5, 0, -45.3, 0.9, 'sword');
  P.dropped(ctx, 10.7, 0, -42.9, 2.4, 'shield');
  P.barrel(ctx, -13.6, 0, -41.3);
  P.jar(ctx, 21.2, 0, -42.3, 1.0);
  P.basket(ctx, 19.5, 0, -40.7, { tipped: true, rot: 1.2 });
  // vigas quemadas de la casa hundida
  P.beam(ctx, -17.6, -53.6, -14.3, -50.8, 0, 0.12);
  P.beam(ctx, -17.9, -49.5, -15.6, -52.0, 0.24, 0.1);
  P.rubble(ctx, -16.9, 0, -52.4, 7, 441, 1.2, { scale: 0.55 });
  ctx.crows.push({ x: 12, y: 0, z: -44, r: 1.5, n: 4 });
  ctx.crows.push({ pts: [[-16.2, 5.2, -56.35], [-15.3, 5.2, -56.25], [-14.2, 5.2, -56.4]], yaw: 0 });
  L.enemies.push(
    { type: 'soldier', x: -6, y: 0, z: -45, yaw: 0.8, idle: 'stand', id: 'e_largo1' },
    { type: 'soldier', x: 14, y: 0, z: -50, yaw: -1.2, idle: 'wander', id: 'e_largo2' },
    { type: 'mourner', x: 0, y: 0, z: -53.5, yaw: 0, idle: 'stand', id: 'e_largo3' },
    { type: 'penitent', x: 6.4, y: 0, z: -45, yaw: -1.4, idle: 'kneel', id: 'e_largo4' }
  );
  L.zones.push({ id: 'largo', rects: [[-18, -56, 22, -40, -1, 12], [15.5, -60.5, 19, -56, -1, 8]], atmo: 'city' });
  L.map.push({ id: 'largo', r: [-18, -56, 22, -40] });
}

// ======================================================================== PELAMES + CURTIDURÍAS
export function buildPelames(ctx, S, L) {
  const wb = ctx.wb;
  W(S, 14, -3, 42, 3);
  floor(ctx, 14, -3, 42, 3, 'cobble');
  floor(ctx, 30, -3, 42, 3, 'dirt', 0.01);
  // (al norte, el pasaje de los Tintoreros; al sur, la puerta atrancada del corral)
  houseRow(ctx, { axis: 'x', from: 24.5, to: 42, line: -3, side: 'n', seed: 501 });
  houseRow(ctx, { axis: 'x', from: 23, to: 36, line: 3, side: 's', seed: 502, opts: (r, i) => ({ lit: i === 0 }) });
  // barricada (se arranca con la palanca)
  P.cart(ctx, 30.5, 0, -1.6, 1.6, { brokenWheel: true });
  P.barrel(ctx, 29.8, 0, 2.2);
  P.sacks(ctx, 31, 0, 1.5, 3, 13);
  L.interact.push({ kind: 'door', id: 'd_barricada', x: 28.3, y: 0, z: 0, w: 6, h: 2.6, axis: 'z', lock: { type: 'boards' }, mat: 'barricade', hinge: 0 });
  bakeCorpse(wb, 25.5, 0, 1.6, 0.5, 'sit', 'soldier', 8);
  P.decal(ctx, 25.5, 0.02, 1.2, 1.4);
  P.wallTorch(ctx, 20, 2.8, -3, 's');
  // pieles clavadas en las fachadas, ropa tendida, rótulos
  for (const [x, zz, k] of [
    [16.6, -3, 0],
    [21.4, 3, 1],
    [33.8, -3, 2],
    [40.2, 3, 3],
  ]) {
    const f = zz < 0 ? 1 : -1;
    const t = [[0.8, 0.66, 0.55], [0.7, 0.55, 0.45], [0.85, 0.72, 0.62], [0.62, 0.5, 0.42]][k];
    wb.box('leather', x - 0.38, 1.0 + (k % 2) * 0.15, zz + f * 0.005, x + 0.38, 2.15, zz + f * 0.035, { ao: false, faces: f > 0 ? 's' : 'n', tint: t });
    for (const dx of [-0.3, 0.3]) wb.box('iron', x + dx - 0.02, 2.08, zz, x + dx + 0.02, 2.12, zz + f * 0.06, { ao: false });
  }
  P.laundry(ctx, 17.8, -2.97, 17.8, 2.97, 4.3, 16);
  P.laundry(ctx, 37.6, -2.97, 37.6, 2.97, 4.5, 17);
  P.sign(ctx, 26.4, 2.95, -3, 0, 2);
  P.sign(ctx, 34.8, 2.95, 3, Math.PI, 3);
  P.barrel(ctx, 40.6, 0, -2.45);
  P.barrel(ctx, 41, 0, 2.2, { lying: true, rot: 0.3 });
  P.jar(ctx, 16.2, 0, 2.5, 0.9);
  ctx.rats.push({ x: 32.6, y: 0, z: 2.4, n: 2 });
  L.enemies.push({ type: 'penitent', x: 36, y: 0, z: 0.5, yaw: -1.6, idle: 'stand', id: 'e_pelames1' });
  L.zones.push({ id: 'pelames', rects: [[14, -3, 42, 3, -1, 10]], atmo: 'city' });
  L.map.push({ id: 'pelames', r: [14, -3, 42, 3] });
  L.phantoms.push({ x: 40, y: 0, z: 0, trigger: [18, 0, 0], kind: 'penitent' });
}

export function buildTanners(ctx, S, L) {
  const wb = ctx.wb;
  W(S, 42, -12, 64, 12);
  W(S, 64, -40, 72, 12);
  floor(ctx, 42, -12, 64, 12, 'dirt');
  floor(ctx, 64, -40, 72, 12, 'cobble');
  // pilas de curtido
  for (const [x, z] of [
    [45, -9],
    [50.5, -9],
    [45, 5.5],
    [50.5, 5.5],
    [56, 5.5],
  ])
    P.tanningVat(ctx, x, z, x + 4.2, z + 3.2);
  P.dryingRack(ctx, 58, 0, -8, 0.1, 1);
  P.dryingRack(ctx, 58.5, 0, -3.5, -0.1, 2);
  P.dryingRack(ctx, 47.5, 0, -1.5, Math.PI / 2, 3);
  P.barrel(ctx, 62.5, 0, -10.5);
  P.barrel(ctx, 61.6, 0, -10.8);
  P.barrel(ctx, 62.8, 0, 10.4, { lying: true, rot: 0.4 });
  P.sacks(ctx, 43.2, 0, -11, 4, 17);
  P.brazier(ctx, 54, 0, 0.5);
  bakeCorpse(wb, 52.5, 0, -4.2, 0.3, 'face', 'villager', 4);
  bakeCorpse(wb, 60.5, 0, 2.2, 2.1, 'back', 'villager', 1);
  for (const [x, z, s] of [
    [52.5, -4.2, 2],
    [60.5, 2.2, 1.8],
    [47, 1, 3],
    [56, -1, 2],
  ])
    P.decal(ctx, x, 0.02, z, s);
  P.fleshGrowth(ctx, 63.2, 0, 7, 1.1, 91, { climb: 1.6 });
  P.fleshGrowth(ctx, 42.8, 0, 9, 0.8, 92, { climb: 1.2 });
  P.jar(ctx, 44.1, 0, -2.6, 1.1);
  P.jar(ctx, 44.8, 0, -3.5, 0.9);
  P.jar(ctx, 43.6, 0, -4.2, 1.0, { broken: true });
  P.basket(ctx, 60.2, 0, -6.0, { rot: 0.4 });
  P.firewood(ctx, 45.2, 0, -11.45, Math.PI / 2, 3);
  P.dropped(ctx, 54.8, 0, -5.8, 2.6, 'axe');
  ctx.crows.push({ pts: [[57.0, 2.4, -7.9], [57.8, 2.4, -7.98], [58.8, 2.4, -8.08]], yaw: 0.1 });
  ctx.crows.push({ x: 60.5, y: 0, z: 2.2, r: 1.2, n: 3 });
  ctx.rats.push({ x: 43.0, y: 0, z: -9.6, n: 2 }, { x: 62.3, y: 0, z: -9.4, n: 2 }, { x: 62.0, y: 0, z: -15.2, n: 1 });

  // casas alrededor
  house(ctx, { x0: 42, z0: -21, x1: 48, z1: -12, front: 's', seed: 601, h: 6.5 });
  house(ctx, { x0: 54, z0: 12, x1: 64, z1: 21, front: 'n', seed: 602, lit: true });
  house(ctx, { x0: 64, z0: 12, x1: 72, z1: 21, front: 'n', seed: 603 });
  house(ctx, { x0: 55, z0: -33, x1: 64, z1: -26, front: 'e', seed: 604 });
  house(ctx, { x0: 55, z0: -40, x1: 64, z1: -33, front: 'e', seed: 605, burned: true });
  stoneWall(ctx, 42, 12, 44, 22, 4.5);

  // casa del canónigo (visitable)
  const room = 'canon';
  house(ctx, { x0: 48, z0: -26, x1: 64, z1: -12, front: 's', seed: 606, hollow: true, collide: false, h: 7.4, style: 'stone', doorAt: 10, room, jetty: 0 });
  W(S, 48.4, -25.6, 63.6, -12.4);
  W(S, 57.35, -12.6, 58.65, -11.8);
  // tabique interior con paso (5 cm corrido: una viga del techo caía justo
  // en su cara y parpadeaba)
  solid(ctx, 'plaster', 55.75, 0, -25.6, 56.15, 3.1, -21, { sub: 1.5, room, tint: [0.8, 0.76, 0.7] });
  solid(ctx, 'plaster', 55.75, 0, -19, 56.15, 3.1, -12.4, { sub: 1.5, room, tint: [0.8, 0.76, 0.7] });
  solid(ctx, 'plaster', 55.75, 2.3, -21, 56.15, 3.1, -19, { sub: 1.5, room, ao: false, tint: [0.8, 0.76, 0.7], faces: 'nsewb' });
  wb.setRoom(room);
  P.table(ctx, 51.5, 0, -22, 2, 1, 0);
  P.shelf(ctx, 48.6, 0, -18, Math.PI / 2, 1.8);
  P.shelf(ctx, 48.6, 0, -15.5, Math.PI / 2, 1.8);
  P.bench(ctx, 51.5, 0, -21.1, 1.4, 0);
  P.candles(ctx, 52.1, 0.8, -22.2, 4, 21, { room, radius: 5, intensity: 1.1, spread: 0.25 });
  P.bed(ctx, 61.5, 0, -24, 0);
  P.crate(ctx, 62.8, 0, -13.4, 0.8, 0.2);
  bakeCorpse(wb, 60.8, 0.6, -24, -1.4, 'back', 'villager', 2);
  P.candles(ctx, 58, 0, -16, 5, 22, { room, radius: 4, intensity: 0.8 });
  P.fleshGrowth(ctx, 49, 0, -25, 0.8, 93, { room, climb: 1.5, bound: [48.5, 55.5, -25.5, -12.5] });
  P.decal(ctx, 53, 0.03, -18, 2.6);
  wb.setRoom(null);
  L.interact.push(
    { kind: 'door', id: 'd_canon', x: 58, y: 0, z: -12, w: 1.3, h: 2.25, axis: 'x', lock: { type: 'none' }, mat: 'planks', hinge: -1, swing: 1, plane: -12.3 },
    { kind: 'item', id: 'i_llave', item: 'llave_claustro', x: 50.9, y: 0.85, z: -21.9 },
    { kind: 'note', id: 'n_canonigo', note: 'canonigo', x: 51.9, y: 0.82, z: -22.3, model: 'book' }
  );

  // capilla con altar (punto de descanso)
  const croom = 'chapel';
  W(S, 44.6, 12.6, 53.4, 21.4);
  W(S, 48.2, 11.8, 49.8, 12.8);
  solid(ctx, 'wallstone', 44, 0, 12, 48.2, 6, 12.6, { sub: 2 });
  solid(ctx, 'wallstone', 49.8, 0, 12, 54, 6, 12.6, { sub: 2 });
  solid(ctx, 'wallstone', 48.2, 3.2, 12, 49.8, 6, 12.6, { sub: 2, ao: false, faces: 'tnsewb' });
  solid(ctx, 'wallstone', 44, 0, 21.4, 54, 6, 22, { sub: 2 });
  solid(ctx, 'wallstone', 44, 0, 12.6, 44.6, 6, 21.4, { sub: 2 });
  solid(ctx, 'wallstone', 53.4, 0, 12.6, 54, 6, 21.4, { sub: 2 });
  wb.gableRoof(44, 12, 54, 22, 6, 9, 'z', { wallMat: 'wallstone' });
  wb.box('wooddark', 44.6, 6, 12.6, 53.4, 6.2, 21.4, { faces: 'b', ao: false, room: croom });
  ctx.col.add(44, 6, 12, 54, 6.4, 22).cam = true;
  // espadaña con campana
  wb.box('wallstone', 47.8, 9, 11.8, 50.2, 11.5, 12.6, { sub: 2 });
  wb.box('black', 48.5, 9.6, 11.78, 49.5, 10.9, 11.8, { ao: false, grime: false });
  wb.cylinder('bronze', 49, 9.7, 12.2, 0.35, 0.18, 0.6, 8, { ao: false });
  wb.box('ashlar', 47.9, 0, 11.8, 48.2, 3.2, 12, { ao: false });
  wb.box('ashlar', 49.8, 0, 11.8, 50.1, 3.2, 12, { ao: false });
  wb.box('ashlar', 47.88, 3.2, 11.79, 50.12, 3.5, 12, { ao: false, faces: 'tnsewb' });
  wb.box('ashlar', 48.1, -0.05, 11.7, 49.9, 0.04, 12.7, { faces: 'tnsew', ao: false });
  wb.setRoom(croom);
  wb.box('flag', 44.6, -0.05, 12.6, 53.4, 0.01, 21.4, { faces: 't', ao: false, room: croom });
  for (let z = 14.5; z < 19; z += 1.5) {
    P.pew(ctx, 46.7, 0, z, 2.6, 0);
    P.pew(ctx, 51.3, 0, z, 2.6, 0);
  }
  P.candleAltar(ctx, 49, 0, 20.4, 0, croom);
  P.veiledStatue(ctx, 45.4, 0, 20.6, 0.6, { ped: 0.8 });
  P.veiledStatue(ctx, 52.6, 0, 20.6, -0.6, { ped: 0.8 });
  P.candles(ctx, 45.3, 0, 13.4, 6, 31, { room: croom, radius: 4, intensity: 0.8 });
  P.candles(ctx, 52.8, 0, 13.4, 6, 32, { room: croom, radius: 4, intensity: 0.8 });
  wb.setRoom(null);
  L.interact.push({ kind: 'altar', id: 'a_capela', name: 'Capilla de San Fructuoso', x: 49, y: 0, z: 20.4, spawn: [49, 0, 18.8], yaw: Math.PI });

  // muralla oriental (de la puerta a la esquina sur)
  cityWall(ctx, 72, -56, 76, 26, 9, { merlons: false });
  // almenas a ambos lados del adarve (interrumpidas por la torre intermedia)
  merlons(ctx, 75.7, -56, 75.7, -42, 9, { collide: true });
  merlons(ctx, 75.7, -35, 75.7, 26, 9, { collide: true });
  merlons(ctx, 72.3, -56, 72.3, -42, 9, { collide: true });
  merlons(ctx, 72.3, -35, 72.3, -24.5, 9, { collide: true });
  merlons(ctx, 72.3, -19.5, 72.3, 26, 9, { collide: true });
  // escalera adosada a la muralla (sube hacia el norte)
  W(S, 69.4, -24, 72, -8);
  stairs(ctx, 70.7, 0, -8, 'n', 2.6, 30, 0.3, 0.45, 'wallstone', { solidBelow: true });
  solid(ctx, 'wallstone', 69.4, 0, -24, 72, 9, -21.5, { sub: 2, mats: { t: 'flag' } });
  // derrumbe que cierra el adarve hacia el sur
  P.rubble(ctx, 74, 9, -16, 14, 97, 1.6, { collide: false, scale: 1.4 });
  ctx.col.add(72, 9, -17.5, 76, 11, -14.5);
  // derrumbe que cierra la Calle de la Muralla al norte: la casa quemada que
  // cayó sobre la calle (detrás, hasta la torre del Postigo, todo es casa)
  house(ctx, { x0: 64, z0: -56, x1: 72, z1: -41, front: 's', seed: 950, h: 7.2, burned: true, boards: true, style: 'stone' });
  for (let i = 0; i < 5; i++) P.rubble(ctx, 65 + i * 1.5, 0, -40.4, 7, 980 + i, 0.8, { scale: 1.2 });
  P.rubble(ctx, 68, 0, -40.6, 10, 98, 3.4, { scale: 0.9 });
  ctx.col.add(64, 0, -41, 72, 1.0, -39.9).noSight = true;
  P.beam(ctx, 64.6, -39.8, 67.8, -41.2, 0, 0.14);
  P.beam(ctx, 70.8, -39.6, 68.4, -41.3, 0.3, 0.12);
  P.cart(ctx, 66.6, 0, -37.6, 0.8, { tipped: true });
  P.fleshGrowth(ctx, 69.2, 0, -40.8, 1.2, 99, { climb: 2 });
  // rua da muralha
  P.wallTorch(ctx, 72, 3, -2, 'w');
  P.wallTorch(ctx, 72, 3, -32, 'w');
  P.barrel(ctx, 64.8, 0, -18);
  P.crate(ctx, 65, 0, -23, 0.9, 0.4);
  bakeCorpse(wb, 68, 0, -28, 1.8, 'face', 'soldier', 3);
  P.decal(ctx, 68, 0.02, -28, 2);
  // proyectiles y flechas que pasaron por encima de la muralla
  P.firewood(ctx, 71.35, 0, 2.2, 0, 4);
  P.arrows(ctx, 68.4, 0, -12.5, 6, 55, 1.4);
  P.siegeStone(ctx, 66.3, 0, -5.8, 0.5);
  P.barrel(ctx, 71.35, 0, -27.0);
  P.crate(ctx, 71.3, 0, -28.4, 0.8, 0.2);
  P.weaponRack(ctx, 71.8, 0, -34.5, -Math.PI / 2);
  ctx.crows.push({ pts: [[72.3, 10.1, -31.35], [72.3, 10.1, -29.75], [72.3, 10.1, -28.15]], yaw: -Math.PI / 2 });
  ctx.crows.push({ pts: [[75.7, 10.1, -45.8], [75.7, 10.1, -44.2]], yaw: Math.PI / 2 });

  L.enemies.push(
    { type: 'bell', x: 56, y: 0, z: -4, yaw: 1.5, idle: 'wander', id: 'e_tan1' },
    { type: 'penitent', x: 60.5, y: 0, z: -9.2, yaw: 3, idle: 'kneel', id: 'e_tan2' },
    // (fuera de la pila de curtido: dentro, al moverse, la colisión lo sacaba de golpe)
    { type: 'penitent', x: 53.2, y: 0, z: -4.6, yaw: -1, idle: 'stand', id: 'e_tan3' },
    { type: 'crawler', x: 52, y: 2.6, z: -18, yaw: 0, idle: 'ceiling', id: 'e_canon1' },
    { type: 'hound', x: 67, y: 0, z: -20, yaw: 0, idle: 'eat', id: 'e_mur1' },
    { type: 'hound', x: 68.5, y: 0, z: -21.5, yaw: 0.5, idle: 'eat', id: 'e_mur2' },
    { type: 'crawler', x: 67.5, y: 0, z: 6, yaw: -2, idle: 'stand', id: 'e_mur3' }
  );
  L.zones.push(
    { id: 'canon', rects: [[48, -26, 64, -12.2, -1, 4]], atmo: 'interior', room: 'canon' },
    { id: 'chapel', rects: [[44, 12.2, 54, 22, -1, 6]], atmo: 'chapel', room: 'chapel' },
    { id: 'tanners', rects: [[42, -12, 64, 12, -1, 10]], atmo: 'city' },
    { id: 'muralla', rects: [[64, -40, 72, 12, -1, 7]], atmo: 'city' }
  );
  L.phantoms.push({ x: 68, y: 0, z: -34, trigger: [66, 0, -4], kind: 'mourner' });
  L.map.push({ id: 'tanners', r: [42, -12, 64, 12] }, { id: 'muralla', r: [64, -40, 72, 12] }, { id: 'canon', r: [48.4, -25.6, 63.6, -12.4] }, { id: 'chapel', r: [44.6, 12.6, 53.4, 21.4] });
}

// ======================================================================== ADARVE Y POSTIGO
export function buildRamparts(ctx, S, L) {
  const wb = ctx.wb;
  // torre intermedia atravesada por el adarve
  const tx0 = 70.5,
    tx1 = 77.5,
    tz0 = -42,
    tz1 = -35;
  // sin cara superior donde la atraviesa la muralla: allí el suelo ya es el
  // del adarve (dos suelos a la misma altura parpadeaban)
  solid(ctx, 'wallstone', tx0, 0, tz0, tx1, 9, tz1, { sub: 2, faces: 'nsew' });
  wb.box('flag', tx0, 8.8, tz0, 72, 9, tz1, { faces: 't', ao: false });
  wb.box('flag', 76, 8.8, tz0, tx1, 9, tz1, { faces: 't', ao: false });
  const tr = 'ramptower';
  const tw = (a, b, c, d) => solid(ctx, 'wallstone', a, 9, b, c, 13, d, { sub: 2, room: tr });
  tw(tx0, tz0, 71.5, tz1);
  tw(76.5, tz0, tx1, tz1);
  tw(71.5, tz0, 72.6, tz0 + 0.6);
  tw(75.4, tz0, 76.5, tz0 + 0.6);
  tw(71.5, tz1 - 0.6, 72.6, tz1);
  tw(75.4, tz1 - 0.6, 76.5, tz1);
  solid(ctx, 'wallstone', 72.6, 11.5, tz0, 75.4, 13, tz0 + 0.6, { sub: 2, ao: false, faces: 'tnsewb' });
  solid(ctx, 'wallstone', 72.6, 11.5, tz1 - 0.6, 75.4, 13, tz1, { sub: 2, ao: false, faces: 'tnsewb' });
  wb.box('wooddark', 71.5, 12.3, tz0 + 0.6, 76.5, 12.5, tz1 - 0.6, { faces: 'b', ao: false, room: tr });
  ctx.col.add(71.5, 12.3, tz0, 76.5, 13.4, tz1).cam = true;
  wb.pyramid('roof', 74, -38.5, 8, 8, 13, 3.5);
  wb.box('wallstone', tx0 - 0.3, 12.6, tz0 - 0.3, tx1 + 0.3, 13.1, tz1 + 0.3, { ao: false });
  wb.setRoom(tr);
  P.table(ctx, 72.5, 9, -38.5, 1.4, 0.8, Math.PI / 2);
  P.barrel(ctx, 76, 9, -41.2);
  P.crate(ctx, 76, 9, -36, 0.8, 0.3);
  P.wallTorch(ctx, 76.5, 11, -38.5, 'w', { room: tr, radius: 6 });
  bakeCorpse(wb, 74.6, 9, -40, 0.6, 'sit', 'soldier', 9);
  wb.setRoom(null);
  ctx.rats.push({ x: 75.2, y: 9, z: -37.2, n: 1 });
  L.interact.push({ kind: 'item', id: 'i_ampolla2', item: 'ampolla', x: 72.5, y: 9.85, z: -38.8 }, { kind: 'note', id: 'n_muralla', note: 'muralla', x: 72.5, y: 9.82, z: -38.1, model: 'paper' });

  // cuerpo de la puerta del Postigo (cima = arena del jefe menor)
  const gx0 = 62,
    gx1 = 80,
    gz0 = -68,
    gz1 = -56;
  solid(ctx, 'wallstone', gx0, 0, gz0, gx1, 9, gz1, { sub: 2.2, aoH: 3, mats: { t: 'flag' } });
  merlons(ctx, gx0 - 0.3, gz0 + 0.3, gx1 + 0.3, gz0 + 0.3, 9, { collide: true });
  merlons(ctx, gx1 - 0.3, gz0, gx1 - 0.3, gz1, 9, { collide: true });
  merlons(ctx, gx0 + 0.3, gz0, gx0 + 0.3, -60, 9, { collide: true });
  merlons(ctx, gx0 - 0.3, gz1 - 0.3, 72.3, gz1 - 0.3, 9, { collide: true });
  merlons(ctx, 75.7, gz1 - 0.3, gx1 + 0.3, gz1 - 0.3, 9, { collide: true });
  // torrecillas en las esquinas
  for (const [x, z] of [
    [gx0, gz0],
    [gx1, gz0],
    [gx1, gz1],
  ])
    tower(ctx, x, z, 4, 12.5, { slits: false, roof: 'pyramid' });
  // torno del rastrillo en el centro
  wb.box('wooddark', 69.5, 9, -63.2, 70, 10.6, -62.8, { ao: false });
  wb.box('wooddark', 73, 9, -63.2, 73.5, 10.6, -62.8, { ao: false });
  wb.push();
  wb.translate(71.5, 10.3, -63);
  wb.rotateZ(Math.PI / 2);
  wb.cylinder('wooddark', 0, -1.6, 0, 0.35, 0.35, 3.2, 8, { ao: false, capTop: true, capBot: true });
  wb.pop();
  for (let i = 0; i < 14; i++) wb.box('iron', 70.8 + (i % 2) * 0.1, 10.3 - i * 0.2, -63.05, 70.9 + (i % 2) * 0.1, 10.42 - i * 0.2, -62.95, { ao: false });
  ctx.col.add(69.3, 9, -63.4, 73.7, 10.7, -62.6);
  P.brazier(ctx, 65, 9, -59, {});
  P.brazier(ctx, 78, 9, -65, {});
  bakeCorpse(wb, 67, 9, -65, 2.2, 'back', 'soldier', 10);
  bakeCorpse(wb, 77, 9, -58.5, -0.4, 'face', 'soldier', 11);
  P.arrows(ctx, 71, 9, -60, 14, 41, 2.2);
  P.fleshGrowth(ctx, 79, 9, -67, 1.6, 101, { climb: 1.5 });
  P.dropped(ctx, 68.4, 9, -61.3, 0.8, 'sword');
  P.dropped(ctx, 75.8, 9, -63.9, 2.0, 'shield');
  P.dropped(ctx, 72.9, 9, -58.3, 1.4, 'spear');
  P.dropped(ctx, 66.3, 9, -66.3, 0.3, 'helmet');
  L.interact.push(
    { kind: 'fog', id: 'f_impaled', boss: 'impaled', x: 74, y: 9, z: -55.7, w: 3.4, h: 3.2, axis: 'x', enter: -1 },
    { kind: 'fog', id: 'f_impaled2', boss: 'impaled', x: 62.2, y: 9, z: -58, w: 3.2, h: 3.2, axis: 'z', enter: 1 },
    { kind: 'item', id: 'i_manivela', item: 'manivela', x: 71.5, y: 10.0, z: -62.4, afterBoss: 'impaled' }
  );
  L.enemies.push(
    { type: 'soldier', x: 74, y: 9, z: -28, yaw: Math.PI, idle: 'stand', id: 'e_ram1' },
    { type: 'mourner', x: 74, y: 9, z: -38.5, yaw: Math.PI, idle: 'stand', id: 'e_ram2' },
    { type: 'crawler', x: 74, y: 9, z: -48, yaw: Math.PI, idle: 'stand', id: 'e_ram3' },
    { type: 'impaled', x: 71, y: 9, z: -60.2, yaw: 0.2, idle: 'boss', id: 'b_impaled', boss: true }
  );

  // escalera interior del Postigo (baja hacia el oeste hasta el patio)
  W(S, 46, -59.5, 62, -56.5);
  stairs(ctx, 48.5, 0, -58, 'e', 3, 30, 0.3, 0.45, 'wallstone', { solidBelow: true });
  solid(ctx, 'wallstone', 48.5, 0, -61, 62, 9, -59.5, { sub: 2, aoH: 2 });
  // patio y travesía del Postigo
  W(S, 44, -56.5, 62, -45);
  W(S, 22, -50, 44, -45.5);
  floor(ctx, 44, -59.5, 62, -45, 'dirt');
  floor(ctx, 22, -50, 44, -45.5, 'cobble');
  houseRow(ctx, { axis: 'x', from: 22, to: 44, line: -50, side: 'n', seed: 701, depth: 9.5 });
  houseRow(ctx, { axis: 'x', from: 22, to: 44, line: -45.5, side: 's', seed: 702, depth: 8 });
  house(ctx, { x0: 44, z0: -45, x1: 64, z1: -40, front: 'n', seed: 703, h: 6.2 });
  stoneWall(ctx, 40, -62, 48.5, -59.5, 5);
  stoneWall(ctx, 62, -56, 64, -45, 4);
  P.well(ctx, 55, 0, -50);
  P.cart(ctx, 47, 0, -47.5, 0.2, {});
  P.hay(ctx, 59.5, 0, -47, 0.3);
  bakeCorpse(wb, 51, 0, -52, 0.4, 'back', 'soldier', 12);
  P.decal(ctx, 51, 0.02, -52, 2.2);
  P.wallTorch(ctx, 45.5, 2.8, -45, 'n');
  // advertencia de los sitiadores y restos del asalto
  P.stake(ctx, 45.3, 0, -52.6, 0.9, 5);
  P.stake(ctx, 45.6, 0, -55.2, -0.4, 6);
  P.tent(ctx, 58.2, 0, -53.4, 2.6, 'clothDark');
  P.firewood(ctx, 50.2, 0, -45.55, Math.PI / 2, 3);
  P.dropped(ctx, 53.3, 0, -53.2, 1.9, 'sword');
  P.dropped(ctx, 49.4, 0, -50.7, 0.6, 'shield');
  P.arrows(ctx, 56.2, 0, -48.2, 6, 63, 1.3);
  P.laundry(ctx, 30.5, -49.95, 30.5, -45.55, 4.4, 17);
  P.sign(ctx, 27.2, 2.95, -50, 0, 1);
  P.sign(ctx, 38.8, 2.95, -45.5, Math.PI, 0);
  P.lantern(ctx, 34.6, 2.75, -50, 0, false);
  ctx.crows.push({ x: 51, y: 0, z: -52, r: 1.3, n: 3 });
  ctx.rats.push({ x: 45.0, y: 0, z: -45.9, n: 2 });
  // puerta del Postigo (vista desde el patio, cerrada por carne)
  wb.box('iron', 61.9, 0, -55.8, 62.05, 4.2, -52, { ao: false });
  P.fleshGrowth(ctx, 61.4, 0, -54, 1.3, 111, { climb: 1.8 });
  L.interact.push({ kind: 'examine', id: 'x_postigo', text: 'noExit', x: 61.4, y: 1, z: -54, r: 2.6 });
  // portón atrancado hacia la Plaza de la Catedral (atajo)
  L.interact.push({ kind: 'door', id: 'd_postigo', x: 22.4, y: 0, z: -47.75, w: 4.5, h: 3.15, axis: 'z', lock: { type: 'barred', side: 1 }, mat: 'planks', hinge: -1, swing: -1, double: true, plane: 22.05, inset: 0.13 });
  wb.box('ashlar', 21.98, 3.2, -50.3, 22.8, 4, -45.2, { ao: false, faces: 'tnsewb' });
  L.enemies.push({ type: 'soldier', x: 52, y: 0, z: -48, yaw: 1.2, idle: 'wander', id: 'e_post1' }, { type: 'penitent', x: 34, y: 0, z: -47.8, yaw: -1.5, idle: 'kneel', id: 'e_post2' });

  // campamento de los sitiadores fuera de la muralla (vista desde el adarve)
  floor(ctx, 76, -130, 150, 40, 'dirt', 0, { grime: true, sub: 6 });
  const rng = new RNG(777);
  for (let i = 0; i < 14; i++) {
    const x = rng.range(84, 135),
      z = rng.range(-110, 25);
    wb.pyramid(rng.pick(['clothDark', 'burlap', 'clothRed']), x, z, 4, 4, 0, rng.range(2.6, 3.6));
    if (rng.chance(0.5)) {
      ctx.fires.push({ x: x + 3, y: 0, z: z + 2, s: 1.4, smoke: true });
      ctx.lights.push({ x: x + 3, y: 1.4, z: z + 2, r: 1, g: 0.45, b: 0.15, radius: 10, intensity: 1.5 });
    }
    if (rng.chance(0.6)) P.pike(ctx, x - 3, 0, z + rng.range(-2, 2), { h: 3, skull: rng.chance(0.5) });
  }
  // torre de asedio quemada
  wb.push();
  wb.translate(84, 0, -50);
  wb.rotateZ(0.12);
  for (const [a, b] of [
    [-2, -2],
    [2, -2],
    [-2, 2],
    [2, 2],
  ])
    wb.box('wooddark', a - 0.2, 0, b - 0.2, a + 0.2, 11, b + 0.2, { ao: false, tint: [0.3, 0.26, 0.24] });
  for (let y = 2; y < 11; y += 3) wb.box('planks', -2.2, y, -2.2, 2.2, y + 0.2, 2.2, { ao: false, tint: [0.3, 0.26, 0.24], faces: 'tnsewb' });
  wb.pop();
  ctx.fires.push({ x: 84, y: 8, z: -50, s: 2.4, smoke: true });

  L.zones.push(
    { id: 'ramparts', rects: [[69.4, -56, 76.5, 26, 6, 20]], atmo: 'ramparts' },
    { id: 'gatehouse', rects: [[62, -68, 80, -56, 6, 20]], atmo: 'ramparts' },
    { id: 'postigo', rects: [[22, -61, 64, -45, -1, 8]], atmo: 'city' }
  );
  L.map.push({ id: 'ramparts', r: [72.6, -56, 75.4, -21.5] }, { id: 'ramparts', r: [69.4, -24, 72, -8] }, { id: 'gatehouse', r: [62, -68, 80, -56] }, { id: 'postigo', r: [44, -59.5, 62, -45] }, { id: 'postigo', r: [22, -50, 44, -45.5] });
}

// ======================================================================== FERRARIA
export function buildFerraria(ctx, S, L) {
  const wb = ctx.wb;
  W(S, -3.5, 14, 3.5, 42);
  W(S, -14, 42, 14, 58);
  floor(ctx, -3.5, 14, 3.5, 42, 'cobble');
  floor(ctx, -14, 42, 14, 58, 'dirt');
  floor(ctx, -8, 44, 8, 56, 'cobble', 0.01);
  // (lado este: callejón del Muladar hacia el corral; lado oeste: callejón del
  // Yunque hacia la trasera de la herrería; ver level_barrios.js)
  houseRow(ctx, { axis: 'z', from: 22, to: 33, line: -3.5, side: 'w', seed: 801 });
  house(ctx, { x0: -14, z0: 35.5, x1: -3.5, z1: 42, front: 's', seed: 803 });
  house(ctx, { x0: 3.5, z0: 33, x1: 14, z1: 42, front: 's', seed: 804, burned: true });
  house(ctx, { x0: 14, z0: 42, x1: 24, z1: 50, front: 'w', seed: 805 });
  house(ctx, { x0: 14, z0: 50, x1: 24, z1: 58, front: 'w', seed: 806, lit: true });
  stoneWall(ctx, -26, 56, -14, 58, 5);
  // muralla sur con la puerta hundida
  cityWall(ctx, -30, 58, -3.5, 62, 9, { merlonSides: ['s'] });
  cityWall(ctx, 3.5, 58, 30, 62, 9, { merlonSides: ['s'] });
  tower(ctx, -5.5, 60, 4.5, 12);
  tower(ctx, 5.5, 60, 4.5, 12);
  // el paso de la puerta: bóveda, suelo, rastrillo y, detrás, la carne que lo tapona entero
  solid(ctx, 'wallstone', -3.5, 5, 58, 3.5, 9, 62, { sub: 2, ao: false, faces: 'tnsewb' });
  floor(ctx, -3.5, 58, 3.5, 62, 'cobble');
  for (let x = -3.2; x <= 3.21; x += 0.4) wb.box('iron', x - 0.04, 0, 58.6, x + 0.04, 5, 58.75, { ao: false });
  for (const y of [1.2, 2.6, 4.0]) wb.box('iron', -3.3, y, 58.58, 3.3, y + 0.08, 58.77, { ao: false });
  for (let x = -3.2; x <= 3.21; x += 0.4) wb.cylinder('iron', x, -0.12, 58.675, 0.001, 0.05, 0.16, 4, { ao: false });
  ctx.col.add(-3.5, 0, 58, 3.5, 5, 62);
  P.fleshWall(ctx, -3.3, 3.3, 0, 5.0, 59.35, -1, 122, { tendrils: 9, mouths: 2 });
  P.rubble(ctx, 0, 0, 57, 16, 121, 3, { scale: 1.3 });
  P.fleshGrowth(ctx, -2.6, 0, 57.4, 1.0, 123, { climb: 1.6, bound: [-3.4, -1.5, 56.5, 58] });
  L.interact.push({ kind: 'examine', id: 'x_portasul', text: 'southGate', x: 0, y: 1, z: 56.5, r: 3.2 });

  // ------------------------------------------------------------ fragua (visitable)
  // Se ve desde lejos: chimenea grande humeante, soportal con yunque y pila
  // de templar, rótulo de hierro y las ventanas encendidas por el fuego.
  const room = 'smithy';
  house(ctx, {
    x0: -26,
    z0: 42,
    x1: -14,
    z1: 56,
    front: 'e',
    seed: 807,
    h: 6.4,
    style: 'stone',
    hollow: true,
    room,
    lit: true,
    litChance: 1,
    jetty: 0,
    floorMat: 'flag',
    floorTint: [0.6, 0.56, 0.52],
    chimney: true,
    chimneyAt: [-21.5, 43.2],
    chimneySize: 0.75,
    smoke: 'embers',
    doors: [
      { side: 'e', z: 49, w: 1.5, h: 2.5 },
      { side: 'w', z: 46 },
    ],
  });
  // soportal delantero con el taller al aire libre
  P.leanTo(ctx, -14, 43, -11.2, 55, 'w', 3.75, 2.75);
  P.sign(ctx, -11.25, 2.62, 46.2, Math.PI / 2, 'anvil');
  P.sign(ctx, -14, 2.9, 51.4, Math.PI / 2, 'horseshoe');
  P.anvil(ctx, -12.4, 0, 45.4, 0.3);
  P.dyeVat(ctx, -12.5, 0, 53.4, [0.2, 0.24, 0.26], { r: 0.5 });
  P.cartWheel(ctx, -13.8, 0, 51.9, Math.PI / 2);
  P.toolBoard(ctx, -14, 0, 46.9, Math.PI / 2);
  P.firewood(ctx, -13.35, 0, 44.1, 0, 3);
  P.sacks(ctx, -12.4, 0, 54.5, 3, 24);
  P.coalPile(ctx, -11.8, 0, 43.6, 0.8);
  P.wallTorch(ctx, -14, 2.4, 50.9, 'e');
  P.brazier(ctx, -12.5, 0, 47.6, { s: 0.9, radius: 7 });
  P.ironBars(ctx, -12.2, 0, 50.9, Math.PI / 2 + 0.1);
  wb.setRoom(room);
  // interior: fragua con su campana, fuelle, yunque, pila de templar, carbón
  P.forge(ctx, -21.5, 0, 43.5, 0, room);
  P.fleshMail(ctx, -21.6, 0.95, 43.4, 0.4, { room });
  P.bellows(ctx, -23.85, 0, 43.4, 0, { room });
  P.coalPile(ctx, -25, 0, 43.1, 0.8, { room });
  P.trough(ctx, -18.7, 0, 43.1, 0, { len: 2, room, tint: [0.35, 0.4, 0.42] });
  P.toolBoard(ctx, -18.7, 0, 42.36, 0, { room });
  P.anvil(ctx, -20.6, 0, 46.7, 0.4);
  wb.box('iron', -20.95, 0.9, 46.55, -20.4, 0.95, 46.62, { ao: false });
  P.ironBars(ctx, -15.2, 0, 44.4, Math.PI / 2);
  P.barrel(ctx, -15.1, 0, 46.3);
  P.table(ctx, -18, 0, 54.4, 2.2, 0.9, 0);
  P.weaponRack(ctx, -25.4, 0, 51.2, Math.PI / 2);
  P.toolBoard(ctx, -25.64, 0, 53.6, Math.PI / 2, { room });
  P.armorStand(ctx, -24.6, 0, 55, Math.PI + 0.3, { room, flesh: true });
  P.crate(ctx, -15.4, 0, 55, 0.8, 0.2);
  P.barrel(ctx, -16.4, 0, 55.1, { lying: true, rot: 0.1 });
  P.fleshMail(ctx, -19.4, 0, 44.6, 2.1, { room });
  // piedra de amolar
  wb.push();
  wb.translate(-22.4, 0.8, 54);
  wb.rotateX(Math.PI / 2);
  wb.cylinder('wallstone', 0, -0.1, 0, 0.5, 0.5, 0.2, 10, { ao: false, capTop: true, capBot: true });
  wb.pop();
  wb.box('wooddark', -23, 0, 53.8, -21.8, 0.35, 54.2, { ao: false });
  bakeCorpse(wb, -20.2, 0, 47.4, 0.4, 'kneel', 'villager', 0);
  P.fleshGrowth(ctx, -20.1, 0.5, 48, 0.7, 131, { room, climb: 0.4 });
  P.fleshGrowth(ctx, -25, 0, 55, 0.9, 132, { room, climb: 1.4, bound: [-25.6, -14.4, 42.4, 55.6] });
  P.decal(ctx, -19.5, 0.05, 48, 2.4);
  P.decal(ctx, -21.5, 0.05, 45, 3.6, 'shadow');
  P.candles(ctx, -17.2, 0.8, 54.6, 3, 133, { room, radius: 5, intensity: 1.0, spread: 0.25 });
  P.hangingLamp(ctx, -19.8, 2.88, 50.4, { room, radius: 8, intensity: 1.2, dyn: 2.2 });
  P.hangingLamp(ctx, -23.4, 2.88, 49.2, { room, radius: 6, intensity: 0.9 });
  wb.setRoom(null);
  L.interact.push(
    { kind: 'item', id: 'i_palanca', item: 'palanca', x: -18.2, y: 0.86, z: 54.4 },
    { kind: 'note', id: 'n_herrero', note: 'herrero', x: -17.2, y: 0.82, z: 54.3, model: 'book' },
    { kind: 'item', id: 'i_piedra', item: 'piedra', x: -22.4, y: 1.35, z: 54 },
    { kind: 'door', id: 'd_fragua', x: -14, y: 0, z: 49, w: 1.5, h: 2.45, axis: 'z', lock: { type: 'none' }, mat: 'planks', hinge: -1, swing: -1, plane: -14.3 }
  );
  // atrezo
  P.barrel(ctx, -12.6, 0, 56.4);
  P.barrel(ctx, -11.8, 0, 57);
  P.cart(ctx, 9.5, 0, 47, -0.5, { burning: true });
  P.crate(ctx, 12.4, 0, 55.6, 1, 0.3);
  P.sacks(ctx, 11.5, 0, 53.8, 3, 23);
  bakeCorpse(wb, -1.5, 0, 50, 2.5, 'back', 'soldier', 3);
  bakeCorpse(wb, 5, 0, 53, -0.5, 'face', 'soldier', 4);
  bakeCorpse(wb, 1.5, 0, 29, 0.8, 'curl', 'villager', 5);
  P.decal(ctx, -1.5, 0.02, 50, 2.2);
  P.decal(ctx, 5, 0.02, 53, 1.8);
  P.decal(ctx, 1.5, 0.02, 29, 1.6);
  P.wallTorch(ctx, -3.5, 2.8, 26, 'e');
  P.pike(ctx, 7, 0, 44, { tilt: 0.15 });
  P.pike(ctx, 8, 0, 43.4, { tilt: -0.1, skull: true });
  P.laundry(ctx, -3.45, 24.6, 3.45, 24.6, 4.3, 18);
  P.laundry(ctx, -3.45, 37.2, 3.45, 37.2, 4.2, 19);
  P.sign(ctx, -3.5, 2.95, 27.4, Math.PI / 2, 0);
  P.sign(ctx, 3.5, 2.95, 31.2, -Math.PI / 2, 2);
  P.lantern(ctx, 3.5, 2.75, 23.6, -Math.PI / 2, true);
  P.jar(ctx, 12.9, 0, 43.3, 1.0);
  P.jar(ctx, 13.2, 0, 44.2, 0.8, { lying: true, rot: 2.2 });
  P.dropped(ctx, -2.9, 0, 51.3, 0.5, 'sword');
  P.dropped(ctx, 6.3, 0, 54.5, 1.8, 'helmet');
  P.dropped(ctx, 3.3, 0, 51.4, 2.9, 'shield');
  ctx.crows.push({ pts: [[-12.5, 9, 58.35], [-11.7, 9, 58.3], [-10.8, 9, 58.4]], yaw: Math.PI });
  ctx.crows.push({ x: 5, y: 0, z: 53, r: 1.2, n: 3 });
  ctx.rats.push({ x: -12.2, y: 0, z: 55.6, n: 2 }, { x: -15.4, y: 0, z: 52.6, n: 1 });
  L.enemies.push(
    { type: 'soldier', x: -4, y: 0, z: 49, yaw: 0, idle: 'stand', id: 'e_fer1' },
    { type: 'soldier', x: 7, y: 0, z: 52, yaw: -2.5, idle: 'wander', id: 'e_fer2' },
    { type: 'hound', x: 0.5, y: 0, z: 30, yaw: 3, idle: 'eat', id: 'e_fer3' },
    { type: 'crawler', x: -19, y: 2.6, z: 51.5, yaw: 1, idle: 'ceiling', id: 'e_fer4' }
  );
  L.zones.push(
    { id: 'smithy', rects: [[-26, 42, -14.2, 56, -1, 4]], atmo: 'interior', room: 'smithy' },
    { id: 'ferraria', rects: [[-3.5, 14, 3.5, 42, -1, 10], [-14, 42, 14, 58, -1, 10]], atmo: 'city' }
  );
  L.map.push({ id: 'ferraria', r: [-3.5, 14, 3.5, 42] }, { id: 'ferraria', r: [-14, 42, 14, 58] }, { id: 'smithy', r: [-26, 42, -14, 56] });
}
