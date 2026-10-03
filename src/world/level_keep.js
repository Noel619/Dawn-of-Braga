// Lo alto del castillo: a donde lleva el salto de fe desde la Torre del Fanal.
//
// La atalaya (la cabeza de la coracha, con un montón de paja para el fanal)
// recibe el salto. La coracha, un muro almenado que baja desde la muralla
// norte hasta el castillo, la une con el adarve del castillo; a medio camino
// la cruza una torre con un altar. Desde el adarve, un puente de tablas
// entra en la torre del homenaje por los aposentos del alcaide (allí está la
// manivela del torno, en su cadáver). Debajo, la sala de armas, y en su suelo
// una trampilla con escalera de mano que baja a la cárcel: cerrada por arriba,
// es el atajo de vuelta al patio.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, blocker, stairs, merlons, cityWall, house } from './builders.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';

// Medidas de lo alto del castillo (las usan level_city.js y la persecución).
export const KEEP = {
  // la atalaya: lo alto, a 11,5 m; el montón de paja en el centro
  atalaya: { x: -60, z: -109, w: 7, top: 11.5 },
  // la coracha: de la atalaya al muro norte del castillo
  coracha: { x0: -62, x1: -58, z0: -105.5, z1: -23, y: 9 },
  coracTower: { x: -60, z: -64, w: 7, h: 15 },
  // el adarve del castillo (muro norte) y la puerta de la torre del homenaje
  walk: { x0: -88.5, x1: -52.5, z0: -23, z1: -20, y: 9 },
  door: { x0: -81.5, x1: -79.5, y0: 9, y1: 11.6 },
  // pisos de la torre del homenaje (interior x -86.5..-74.5, z -17.5..-5.5)
  in: { x0: -86.5, x1: -74.5, z0: -17.5, z1: -5.5 },
  floor2: 4.6,
  floor3: 9,
  ceil3: 13.4,
  // la escalera entre los dos pisos (sube hacia el norte, junto al muro este)
  stair: { x: -75.2, w: 1.3, zBot: -9.5, n: 15, run: 0.44 },
  // la trampilla de la sala de armas y la escalera de mano de la cárcel
  hatch: { x: -85.85, z: -10.2 },
};

// Montón de paja (cúpula achatada) con haces sueltos alrededor.
function strawHeap(ctx, x, y, z, r, seed) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const g = new THREE.SphereGeometry(r, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y - 0.05, z), new THREE.Quaternion(), new THREE.Vector3(1, 0.5, 1));
  wb.geometry('straw', g, m, { ao: false, uvScale: 1.2 });
  for (let i = 0; i < 9; i++) {
    const a = rng.range(0, Math.PI * 2),
      d = r * rng.range(0.75, 1.15);
    wb.at(x + Math.cos(a) * d, y, z + Math.sin(a) * d, a, () => wb.box('straw', -0.35, 0, -0.08, 0.35, rng.range(0.08, 0.2), 0.08, { ao: false }));
  }
  for (const [dx, dz, rot] of [
    [r * 0.95, -r * 0.4, 0.4],
    [-r * 0.9, r * 0.5, -0.3],
  ])
    P.hay(ctx, x + dx, y, z + dz, rot);
}

// Torre atravesada (la de la coracha): base maciza, sala con puertas al norte
// y al sur, y la parte alta maciza con almenas.
function passTower(ctx, cx, cz, w, yF, h) {
  const wb = ctx.wb;
  const x0 = cx - w / 2,
    x1 = cx + w / 2,
    z0 = cz - w / 2,
    z1 = cz + w / 2;
  const t = 0.9,
    dw = 3.0,
    dh = 3.6,
    ch = 4.4;
  solid(ctx, 'wallstone', x0, 0, z0, x1, yF, z1, { sub: 2.2, aoH: 3, faces: 'nsew' });
  // (el enlosado, por toda la planta: también bajo los umbrales de las puertas)
  wb.box('flag', x0, yF - 0.3, z0, x1, yF, z1, { faces: 't', ao: false, uv: 0.8, room: 'coracha_torre' });
  solid(ctx, 'wallstone', x0, yF, z0, x0 + t, yF + ch, z1, { sub: 2, room: 'coracha_torre' });
  solid(ctx, 'wallstone', x1 - t, yF, z0, x1, yF + ch, z1, { sub: 2, room: 'coracha_torre' });
  for (const [a, b] of [
    [z0, z0 + t],
    [z1 - t, z1],
  ]) {
    solid(ctx, 'wallstone', x0 + t, yF, a, cx - dw / 2, yF + ch, b, { sub: 2, room: 'coracha_torre' });
    solid(ctx, 'wallstone', cx + dw / 2, yF, a, x1 - t, yF + ch, b, { sub: 2, room: 'coracha_torre' });
    solid(ctx, 'wallstone', cx - dw / 2, yF + dh, a, cx + dw / 2, yF + ch, b, { sub: 2, faces: 'tnsewb', room: 'coracha_torre' });
  }
  wb.box('wooddark', x0 + t, yF + ch - 0.25, z0 + t, x1 - t, yF + ch, z1 - t, { faces: 'b', ao: false, room: 'coracha_torre' });
  for (const u of [-1.4, 0, 1.4]) wb.box('wooddark', x0 + t, yF + ch - 0.55, cz + u - 0.14, x1 - t, yF + ch - 0.25, cz + u + 0.14, { ao: false, faces: 'nsewb', room: 'coracha_torre' });
  ctx.col.add(x0, yF + ch - 0.25, z0, x1, h, z1);
  wb.box('wallstone', x0, yF + ch, z0, x1, h, z1, { sub: 2.2, faces: 'nsew' });
  wb.box('wallstone', x0 - 0.3, h - 0.5, z0 - 0.3, x1 + 0.3, h, z1 + 0.3, { ao: false, sub: 3, faces: 'tnsewb', mats: { t: 'flag' } });
  merlons(ctx, x0 - 0.3, z0, x1 + 0.3, z0, h, { collide: false });
  merlons(ctx, x0 - 0.3, z1, x1 + 0.3, z1, h, { collide: false });
  merlons(ctx, x0, z0 + 0.3, x0, z1 - 0.3, h, { collide: false });
  merlons(ctx, x1, z0 + 0.3, x1, z1 - 0.3, h, { collide: false });
  for (let y = 4; y < yF - 1; y += 4.5)
    for (const [sx, sz, rx, rz] of [
      [x1 + 0.02, cz, 0, 0.12],
      [x0 - 0.02, cz, 0, 0.12],
    ])
      wb.box('black', sx - rx - 0.001, y, sz - rz - 0.001, sx + rx + 0.001, y + 1.2, sz + rz + 0.001, { ao: false, grime: false });
}

export function buildCastleTop(ctx, S, L) {
  const wb = ctx.wb;
  const rng = new RNG(5151);
  const A = KEEP.atalaya,
    C = KEEP.coracha,
    CT = KEEP.coracTower,
    W = KEEP.walk;

  // ------------------------------------------------------------ la atalaya
  {
    const x0 = A.x - A.w / 2,
      x1 = A.x + A.w / 2,
      z0 = A.z - A.w / 2,
      z1 = A.z + A.w / 2;
    solid(ctx, 'wallstone', x0, 0, z0, x1, A.top, z1, { sub: 2.2, aoH: 3, faces: 'nsew', mats: { t: 'flag' } });
    wb.box('wallstone', x0 - 0.3, A.top - 0.5, z0 - 0.3, x1 + 0.3, A.top, z1 + 0.3, { ao: false, sub: 3, faces: 'tnsewb', mats: { t: 'flag' } });
    wb.box('flag', x0, A.top - 0.05, z0, x1, A.top + 0.01, z1, { ao: false, faces: 't', uv: 0.8 });
    const mo = { collide: true, h: 1.15 };
    merlons(ctx, x0 - 0.3, z0 + 0.3, x1 + 0.3, z0 + 0.3, A.top, mo);
    merlons(ctx, x0 + 0.3, z0 + 0.6, x0 + 0.3, z1 - 0.6, A.top, mo);
    merlons(ctx, x1 - 0.3, z0 + 0.6, x1 - 0.3, z1 - 0.6, A.top, mo);
    // al sur, el hueco de la escalera que baja a la coracha
    merlons(ctx, x0 - 0.3, z1 - 0.3, C.x0, z1 - 0.3, A.top, mo);
    merlons(ctx, C.x1, z1 - 0.3, x1 + 0.3, z1 - 0.3, A.top, mo);
    // la paja del fanal (el salto cae aquí) y la leña
    strawHeap(ctx, A.x, A.top, A.z - 0.2, 1.9, 77);
    P.firewood(ctx, x0 + 1.0, A.top, z0 + 1.2, Math.PI / 2, 3);
    P.barrel(ctx, x1 - 0.9, A.top, z0 + 0.9, {});
    P.sacks(ctx, x0 + 0.9, A.top, z1 - 1.6, 2, 78);
    for (let y = 4; y < A.top - 2; y += 4.5)
      for (const [sx, sz, rx, rz] of [
        [A.x, z0 - 0.02, 0.12, 0],
        [x0 - 0.02, A.z, 0, 0.12],
        [x1 + 0.02, A.z, 0, 0.12],
      ])
        wb.box('black', sx - rx - 0.001, y, sz - rz - 0.001, sx + rx + 0.001, y + 1.2, sz + rz + 0.001, { ao: false, grime: false });
    // escalera hasta la coracha (por todo el ancho de su adarve)
    const n = 8;
    const rise = (A.top - C.y) / n;
    stairs(ctx, A.x, C.y, z1 + n * 0.42, 'n', C.x1 - C.x0, n, rise, 0.42, 'wallstone', { solidBelow: true });
    for (let i = 0; i < n; i++) {
      const za = z1 + n * 0.42 - 0.42 * (i + 1),
        zb = z1 + n * 0.42 - 0.42 * i;
      const y1 = C.y + rise * (i + 1) + 1.0;
      solid(ctx, 'wallstone', C.x0, C.y, za - 0.01, C.x0 + 0.45, y1, zb, { sub: 2, ao: false, faces: 'tnsew' });
      solid(ctx, 'wallstone', C.x1 - 0.45, C.y, za - 0.01, C.x1, y1, zb, { sub: 2, ao: false, faces: 'tnsew' });
    }
  }

  // ------------------------------------------------------------ la coracha
  {
    const zs = A.z + A.w / 2 + 8 * 0.42; // donde acaba la escalera
    cityWall(ctx, C.x0, C.z0, C.x1, C.z1, C.y, { merlons: false });
    const tz0 = CT.z - CT.w / 2,
      tz1 = CT.z + CT.w / 2;
    for (const [a, b] of [
      [zs, tz0],
      [tz1, C.z1 - 0.3],
    ]) {
      merlons(ctx, C.x0 + 0.3, a, C.x0 + 0.3, b, C.y, { collide: true });
      merlons(ctx, C.x1 - 0.3, a, C.x1 - 0.3, b, C.y, { collide: true });
    }
    passTower(ctx, CT.x, CT.z, CT.w, C.y, CT.h);
    // el altar de la torre, contra el muro de poniente
    wb.setRoom('coracha_torre');
    P.candleAltar(ctx, CT.x - CT.w / 2 + 1.45, C.y, CT.z, Math.PI / 2, 'coracha_torre');
    P.candles(ctx, CT.x + CT.w / 2 - 1.3, C.y, CT.z - 1.8, 4, 5201, { room: 'coracha_torre', radius: 4, intensity: 0.8 });
    P.barrel(ctx, CT.x + CT.w / 2 - 1.4, C.y, CT.z + 1.9, {});
    bakeCorpse(wb, CT.x + CT.w / 2 - 1.5, C.y, CT.z + 0.4, -Math.PI / 2, 'sit', 'soldier', 18);
    wb.setRoom(null);
    L.interact.push(
      { kind: 'altar', id: 'a_coracha', name: 'Torre de la coracha', x: CT.x - CT.w / 2 + 1.45, y: C.y, z: CT.z, spawn: [CT.x + 0.4, C.y, CT.z], yaw: -Math.PI / 2 },
      { kind: 'item', id: 'i_ampolla4', item: 'ampolla', x: CT.x + CT.w / 2 - 1.55, y: C.y + 0.62, z: CT.z + 1.0 }
    );
    // restos del asalto y braseros por la coracha
    P.brazier(ctx, C.x1 - 0.8, C.y, -96, {});
    P.brazier(ctx, C.x0 + 0.8, C.y, -40, {});
    bakeCorpse(wb, C.x0 + 1.2, C.y, -84, 1.3, 'back', 'soldier', 19);
    P.decal(ctx, C.x0 + 1.2, C.y + 0.01, -84, 2.0);
    P.arrows(ctx, (C.x0 + C.x1) / 2, C.y, -76, 9, 5202, 1.6);
    P.dropped(ctx, C.x1 - 1.0, C.y, -52, 0.6, 'sword');
    P.arrows(ctx, (C.x0 + C.x1) / 2, C.y, -33, 7, 5203, 1.4);
    bakeCorpse(wb, C.x1 - 1.1, C.y, -29, -2.6, 'curl', 'villager', 20);
    P.fleshGrowth(ctx, C.x1 - 0.5, C.y, -47, 0.8, 5204, { climb: 1.0 });
    // banderas negras en la torre
    P.banner(ctx, CT.x + CT.w / 2 + 0.32, CT.h - 1.4, CT.z, Math.PI / 2, 'bannerBlack', 1.4, 3.8);
    P.banner(ctx, CT.x - CT.w / 2 - 0.32, CT.h - 1.4, CT.z, -Math.PI / 2, 'bannerBlack', 1.4, 3.8);
  }

  // ------------------------------------------------------------ adarve del castillo
  // (el muro lo levanta level_city.js; aquí, sus pretiles y el puente de
  // tablas de la torre del homenaje)
  {
    const D = KEEP.door;
    // fuera: el pretil de las almenas (menos donde llega la coracha)
    blocker(ctx, W.x0, W.y - 0.2, W.z0, C.x0, W.y + 1.1, W.z0 + 0.6);
    blocker(ctx, C.x1, W.y - 0.2, W.z0, W.x1, W.y + 1.1, W.z0 + 0.6);
    // dentro: parapeto macizo (menos el puente)
    for (const [a, b] of [
      [W.x0, D.x0 - 0.2],
      [D.x1 + 0.2, W.x1],
    ]) {
      solid(ctx, 'wallstone', a, W.y - 0.05, W.z1 - 0.5, b, W.y + 0.95, W.z1, { sub: 2, ao: false, faces: 'nsew' });
      wb.box('ashlar', a - 0.05, W.y + 0.95, W.z1 - 0.55, b + 0.05, W.y + 1.07, W.z1 + 0.05, { ao: false, faces: 'tnsewb' });
    }
    // el puente: tablas sobre el hueco entre la muralla y la torre
    solid(ctx, 'planks', D.x0 - 0.2, W.y - 0.12, W.z1 - 0.5, D.x1 + 0.2, W.y + 0.02, -18.9, { ao: false, faces: 'tnsewb', uv: 0.7 });
    for (const x of [D.x0 - 0.15, D.x1 + 0.15]) {
      wb.box('wooddark', x - 0.06, W.y, W.z1 - 0.4, x + 0.06, W.y + 1.0, -19.05, { ao: false });
      ctx.col.add(x - 0.08, W.y, W.z1 - 0.5, x + 0.08, W.y + 1.0, -19.0);
    }
    // un caído, flechas y un brasero
    bakeCorpse(wb, -66, W.y, -21.4, 0.4, 'back', 'soldier', 21);
    P.decal(ctx, -66, W.y + 0.01, -21.4, 2.0);
    P.arrows(ctx, -72, W.y, -21.6, 8, 5205, 1.4);
    P.brazier(ctx, -56, W.y, -20.9, {});
    P.brazier(ctx, -84.5, W.y, -20.9, {});
    P.dropped(ctx, -86.6, W.y, -21.8, 2.2, 'spear');
  }

  // ------------------------------------------------------------ torre del homenaje
  const K = KEEP.in;
  const F2 = KEEP.floor2,
    F3 = KEEP.floor3,
    C3 = KEEP.ceil3;
  const ST = KEEP.stair;
  const sx0 = ST.x - ST.w / 2 - 0.05,
    sx1 = K.x1;
  const szTop = ST.zBot - ST.n * ST.run;
  // --- sala de armas (planta segunda)
  wb.setRoom('keep2');
  wb.box('planks', K.x0, F2 - 0.02, K.z0, K.x1, F2, K.z1, { faces: 't', ao: false, uv: 0.7, room: 'keep2' });
  // la trampilla (cerrada) y su marco
  {
    const H = KEEP.hatch;
    wb.box('wooddark', H.x - 0.62, F2, H.z - 0.62, H.x + 0.62, F2 + 0.03, H.z + 0.62, { ao: false, faces: 'tnsew', room: 'keep2' });
  }
  // suelo de la planta tercera (techo de la sala de armas), con el hueco de la escalera
  const slab = (x0, z0, x1, z1) => {
    wb.box('planks', x0, F3 - 0.4, z0, x1, F3, z1, { faces: 't', ao: false, uv: 0.7, room: 'keep3' });
    wb.box('wooddark', x0, F3 - 0.4, z0, x1, F3 - 0.38, z1, { faces: 'b', ao: false, room: 'keep2' });
    ctx.col.add(x0, F3 - 0.4, z0, x1, F3, z1).cam = true;
  };
  slab(K.x0, K.z0, sx0, K.z1);
  slab(sx0, K.z0, sx1, szTop);
  slab(sx0, ST.zBot, sx1, K.z1);
  for (let x = K.x0 + 1.5; x < sx0 - 0.5; x += 2.5) wb.box('wooddark', x - 0.15, F3 - 0.75, K.z0, x + 0.15, F3 - 0.4, K.z1, { ao: false, faces: 'nsewb', room: 'keep2' });
  // la escalera (de madera, sobre zancas) y su barandilla arriba
  stairs(ctx, ST.x, F2, ST.zBot, 'n', ST.w, ST.n, (F3 - F2) / ST.n, ST.run, 'wooddark', {});
  wb.box('wooddark', sx0 - 0.1, F3 + 0.95, szTop, sx0 + 0.02, F3 + 1.05, ST.zBot, { ao: false, faces: 'tnsewb', room: 'keep3' });
  wb.box('wooddark', sx0 - 0.1, F3 + 0.1, szTop, sx0 + 0.02, F3 + 0.18, ST.zBot, { ao: false, faces: 'tnsewb', room: 'keep3' });
  ctx.col.add(sx0 - 0.12, F3, szTop, sx0 + 0.02, F3 + 1.05, ST.zBot);
  wb.box('wooddark', sx0, F3, ST.zBot - 0.1, sx1, F3 + 1.0, ST.zBot, { ao: false, room: 'keep3' });
  ctx.col.add(sx0, F3, ST.zBot - 0.12, sx1, F3 + 1.05, ST.zBot);
  for (let z = szTop + 0.6; z < ST.zBot; z += 0.6) wb.box('wooddark', sx0 - 0.07, F3, z - 0.03, sx0 - 0.03, F3 + 0.95, z + 0.03, { ao: false, room: 'keep3' });
  // atrezo de la sala de armas: catres, armeros, mesa, toneles
  for (const [x, z] of [
    [-84.6, -6.4],
    [-81.6, -6.4],
    [-78.6, -6.4],
  ])
    P.bed(ctx, x, F2, z, Math.PI / 2);
  P.weaponRack(ctx, -86.2, F2, -14.5, Math.PI / 2);
  P.weaponRack(ctx, -86.2, F2, -12.6, Math.PI / 2);
  P.table(ctx, -80.6, F2, -12.6, 1.8, 0.9, 0);
  P.bench(ctx, -80.6, F2, -13.5, 1.6, 0);
  P.candles(ctx, -80.2, F2 + 0.82, -12.5, 4, 5206, { room: 'keep2', radius: 5, intensity: 1.0, spread: 0.2 });
  P.barrel(ctx, -77.2, F2, -16.8, {});
  P.barrel(ctx, -78.1, F2, -16.9, {});
  P.crate(ctx, -84.8, F2, -16.7, 0.8, 0.2);
  P.crate(ctx, -83.8, F2, -16.9, 0.7, 0.6);
  P.sacks(ctx, -82.4, F2, -16.8, 3, 5207);
  bakeCorpse(wb, -79.4, F2, -9.4, 2.0, 'face', 'soldier', 22);
  P.decal(ctx, -79.4, F2 + 0.01, -9.4, 2.0);
  // la mesa de la tropa, armeros en el muro sur, el yunque de las reparaciones
  P.table(ctx, -82.6, F2, -14.6, 2.6, 0.9, Math.PI / 2);
  P.bench(ctx, -83.5, F2, -14.6, 2.4, Math.PI / 2);
  P.bench(ctx, -81.7, F2, -14.6, 2.4, Math.PI / 2);
  P.jar(ctx, -82.5, F2 + 0.82, -15.4, 0.6);
  P.weaponRack(ctx, -77.8, F2, -5.75, Math.PI);
  P.anvil(ctx, -77.6, F2, -12.6, 0.4);
  P.dropped(ctx, -84.4, F2, -11.4, 1.1, 'shield');
  P.dropped(ctx, -78.6, F2, -14.8, 2.3, 'helmet');
  P.dropped(ctx, -85.8, F2, -16.4, 0.4, 'spear');
  ctx.rats.push({ x: -84.4, y: F2, z: -16.2, n: 2 });
  P.wallTorch(ctx, -86.5, F2 + 2.2, -9.0, 'e', { room: 'keep2', radius: 7 });
  P.wallTorch(ctx, -79.5, F2 + 2.2, -17.5, 's', { room: 'keep2', radius: 7 });
  wb.setRoom(null);

  // --- aposentos del alcaide (planta tercera)
  wb.setRoom('keep3');
  wb.box('wooddark', K.x0, C3, K.z0, K.x1, C3 + 0.3, K.z1, { faces: 'b', ao: false, room: 'keep3' });
  ctx.col.add(K.x0, C3, K.z0, K.x1, C3 + 0.4, K.z1).cam = true;
  for (let x = K.x0 + 1.5; x < K.x1 - 0.5; x += 2.5) wb.box('wooddark', x - 0.15, C3 - 0.35, K.z0, x + 0.15, C3, K.z1, { ao: false, faces: 'nsewb', room: 'keep3' });
  // la cama del alcaide con su dosel
  P.bed(ctx, -85.2, F3, -15.6, 0);
  for (const [x, z] of [
    [-86.25, -16.15],
    [-84.15, -16.15],
    [-86.25, -15.05],
    [-84.15, -15.05],
  ])
    wb.box('wooddark', x - 0.05, F3, z - 0.05, x + 0.05, F3 + 2.2, z + 0.05, { ao: false, room: 'keep3' });
  wb.box('clothRed', -86.3, F3 + 2.15, -16.2, -84.1, F3 + 2.22, -15.0, { ao: false, faces: 'tnsewb', room: 'keep3' });
  wb.box('clothRed', -86.3, F3 + 0.9, -16.22, -84.1, F3 + 2.2, -16.17, { ao: false, faces: 'nsewb', room: 'keep3', tint: [0.7, 0.55, 0.5] });
  // la mesa del alcaide, con él sentado, muerto, sobre sus papeles
  P.table(ctx, -79.6, F3, -8.2, 1.8, 0.9, 0);
  bakeCorpse(wb, -79.9, F3 + 0.02, -9.15, 0, 'sit', 'soldier', 23);
  P.candles(ctx, -78.9, F3 + 0.82, -8.0, 3, 5208, { room: 'keep3', radius: 5, intensity: 1.1, spread: 0.15 });
  P.decal(ctx, -79.9, F3 + 0.01, -9.4, 1.4);
  // la alfombra, el armario, el arcón a los pies de la cama y la mesa de los planos
  wb.box('clothRed', -84.2, F3 + 0.005, -13.4, -79.4, F3 + 0.03, -9.9, { ao: false, faces: 't', tint: [0.62, 0.5, 0.45], room: 'keep3' });
  wb.box('wooddark', -78.0, F3, -6.1, -76.2, F3 + 2.3, -5.5, { ao: false, room: 'keep3' });
  wb.box('iron', -77.15, F3 + 1.0, -6.14, -77.05, F3 + 1.3, -6.1, { ao: false, room: 'keep3' });
  ctx.col.add(-78.0, F3, -6.1, -76.2, F3 + 2.3, -5.5);
  wb.box('wooddark', -86.0, F3, -14.7, -84.4, F3 + 0.6, -14.2, { ao: false, room: 'keep3' });
  for (const x of [-85.7, -84.7]) wb.box('iron', x - 0.04, F3, -14.72, x + 0.04, F3 + 0.62, -14.18, { ao: false, room: 'keep3' });
  ctx.col.add(-86.0, F3, -14.7, -84.4, F3 + 0.6, -14.2);
  P.table(ctx, -83.4, F3, -7.0, 1.6, 1.0, 0);
  for (const [x, z, r] of [
    [-83.7, -7.1, 0.2],
    [-83.0, -6.9, -0.3],
  ])
    wb.at(x, F3 + 0.83, z, r, () => wb.box('clothWhite', -0.25, 0, -0.18, 0.25, 0.01, 0.18, { ao: false, faces: 't', tint: [0.9, 0.82, 0.62], room: 'keep3' }));
  P.candles(ctx, -82.9, F3 + 0.82, -7.3, 2, 5209, { room: 'keep3', radius: 4, intensity: 0.7, spread: 0.1 });
  P.dropped(ctx, -76.4, F3, -12.6, 2.6, 'sword');
  // chimenea, arcón, armero, estante
  P.hearth(ctx, -86.5, F3, -10.5, 'e', { room: 'keep3', lit: true });
  P.crate(ctx, -82.2, F3, -16.8, 0.9, 0);
  P.weaponRack(ctx, -77.6, F3, -17.25, 0);
  P.shelf(ctx, -86.2, F3, -7.4, Math.PI / 2);
  P.banner(ctx, -80.5, F3 + 2.4, -5.62, Math.PI, 'bannerBlack', 1.3, 2.6);
  P.wallTorch(ctx, -83.0, F3 + 2.2, -17.5, 's', { room: 'keep3', radius: 7 });
  P.wallTorch(ctx, -74.5, F3 + 2.2, -6.8, 'w', { room: 'keep3', radius: 6 });
  wb.setRoom(null);
  L.interact.push(
    { kind: 'item', id: 'i_manivela', item: 'manivela', x: -79.3, y: F3 + 0.86, z: -8.15 },
    { kind: 'note', id: 'n_alcaide', note: 'alcaide', x: -80.1, y: F3 + 0.84, z: -8.0, model: 'paper' },
    { kind: 'item', id: 'i_relicario3', item: 'relicario', x: -82.2, y: F3 + 0.95, z: -16.8 },
    // la trampilla: se abre desde arriba (atajo a la cárcel)
    { kind: 'hatch', id: 'h_torre_arriba', end: 'top', flag: 'hatch:torre', x: KEEP.hatch.x, y: F2, z: KEEP.hatch.z, r: 1.6, to: [KEEP.hatch.x + 0.75, 0, KEEP.hatch.z, Math.PI / 2] },
    { kind: 'hatch', id: 'h_torre_abajo', end: 'bottom', flag: 'hatch:torre', x: KEEP.hatch.x - 0.3, y: 0, z: KEEP.hatch.z, r: 1.6, to: [KEEP.hatch.x + 1.0, F2, KEEP.hatch.z, Math.PI / 2] }
  );

  // ------------------------------------------------------------ manzanas
  // a los dos lados de la coracha, entre la muralla norte y el castillo
  const block = (x0, z0, x1, z1, o = {}) =>
    house(ctx, { x0, z0, x1, z1, front: o.front ?? rng.pick(['n', 's', 'e', 'w']), seed: Math.floor(rng.next() * 1e9), h: o.h ?? rng.range(5.6, 7.8), lit: o.lit, burned: o.burned, jetty: 0 });
  for (const [z0, z1] of [
    [-120.5, -114],
    [-104, -92],
    [-90, -78],
    [-76, -68],
    [-60, -50],
  ]) {
    block(-90, z0, -77, z1, { burned: rng.chance(0.3), lit: rng.chance(0.25) });
    block(-77, z0, -64, z1, { burned: rng.chance(0.3) });
    if (z0 > -110) block(-56, z0, -48, z1, { lit: rng.chance(0.3), front: 'w' });
  }
  block(-90, -112, -77, -106);
  block(-77, -112, -64.5, -106, { burned: true });
  block(-55.5, -112, -48, -106, { front: 'w' });
  block(-55.5, -120.5, -48, -114, { lit: true });
  // ante el castillo: el foso seco y las ruinas que dejó el asedio
  P.rubble(ctx, -80, 0, -38, 14, 5211, 6, { mat: 'wallstone', scale: 1.8 });
  P.rubble(ctx, -52, 0, -34, 10, 5212, 4, { mat: 'wallstone', scale: 1.4 });
  P.deadTree(ctx, -86, 0, -44, 5213, 6.5);
  P.deadTree(ctx, -70, 0, -31, 5214, 5);
  P.gibbet(ctx, -54, 0, -42, 4.4);
  for (const [x, z] of [
    [-74, -46],
    [-66, -40],
    [-88, -30],
  ])
    P.stake(ctx, x, 0, z, rng.range(0, 3), Math.round(x * z));

  // ------------------------------------------------------------ zonas
  // (delante de las del castillo: el patio lo abarca todo, hasta lo alto)
  const ax0 = A.x - A.w / 2,
    ax1 = A.x + A.w / 2,
    az0 = A.z - A.w / 2,
    az1 = A.z + A.w / 2;
  L.zones.unshift(
    { id: 'atalaya', rects: [[ax0 - 0.5, az0 - 0.5, ax1 + 0.5, az1 + 0.5, 10, 24]], atmo: 'ramparts' },
    { id: 'coracha_torre', rects: [[CT.x - CT.w / 2 + 0.9, CT.z - CT.w / 2 + 0.9, CT.x + CT.w / 2 - 0.9, CT.z + CT.w / 2 - 0.9, 8, 13.6]], atmo: 'chapel', room: 'coracha_torre' },
    { id: 'coracha', rects: [[C.x0 - 0.3, az1, C.x1 + 0.3, C.z1, 7, 18]], atmo: 'ramparts' },
    { id: 'adarve_castillo', rects: [[W.x0, W.z0, W.x1, W.z1 + 0.5, 7, 18]], atmo: 'ramparts' },
    { id: 'torre_armas', rects: [[K.x0, K.z0, K.x1, K.z1, 4.3, F3 - 0.3]], atmo: 'interior', room: 'keep2' },
    { id: 'torre_alcaide', rects: [[K.x0, K.z0 - 1.5, K.x1, K.z1, F3 - 0.3, C3 + 2]], atmo: 'interior', room: 'keep3' }
  );
  L.map.push(
    { id: 'atalaya', r: [ax0, az0, ax1, az1] },
    { id: 'coracha', r: [C.x0, az1, C.x1, C.z1] },
    { id: 'coracha_torre', r: [CT.x - CT.w / 2, CT.z - CT.w / 2, CT.x + CT.w / 2, CT.z + CT.w / 2] },
    { id: 'adarve_castillo', r: [W.x0, W.z0, W.x1, W.z1] }
  );

  // ------------------------------------------------------------ criaturas
  L.enemies.push(
    { type: 'soldier', x: -60, y: C.y, z: -90, yaw: Math.PI, idle: 'stand', id: 'e_crc1' },
    { type: 'crawler', x: -59.4, y: C.y, z: -46, yaw: Math.PI, idle: 'stand', id: 'e_crc2' },
    { type: 'penitent', x: -70, y: W.y, z: -21.6, yaw: Math.PI / 2, idle: 'kneel', id: 'e_adc1' },
    { type: 'soldier', x: -80.4, y: F2, z: -11.4, yaw: -0.4, idle: 'stand', id: 'e_arm1' },
    { type: 'soldier', x: -83.4, y: F2, z: -7.6, yaw: 2.6, idle: 'wander', id: 'e_arm2' },
    { type: 'mourner', x: -81.2, y: F3, z: -10.6, yaw: 0.4, idle: 'stand', id: 'e_alc1' }
  );
}
