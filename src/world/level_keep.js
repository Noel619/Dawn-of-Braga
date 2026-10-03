// A donde lleva el salto de fe desde la Torre del Fanal: la atalaya y la
// coracha.
//
// La atalaya (la cabeza de la coracha, con un montón de paja para el fanal)
// recibe el salto. La coracha, un muro almenado que baja desde la muralla
// norte hasta el castillo, la une con el adarve del castillo; a medio camino
// la cruza una torre con un altar. Del adarve se entra en la torre del
// homenaje por su poterna (el castillo está en level_castle.js).
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, blocker, stairs, merlons, cityWall, house } from './builders.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';

// Medidas (las usa también la persecución).
export const KEEP = {
  // la atalaya: lo alto, a 11,5 m; el montón de paja en el centro
  atalaya: { x: -60, z: -109, w: 7, top: 11.5 },
  // la coracha: de la atalaya al muro norte del castillo
  coracha: { x0: -62, x1: -58, z0: -105.5, z1: -23, y: 9 },
  coracTower: { x: -60, z: -64, w: 7, h: 15 },
  // el adarve del castillo (muro norte): de la torre del homenaje a la
  // torre del nordeste
  walk: { x0: -73, x1: -52.5, z0: -23, z1: -20, y: 9 },
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
    // escalera hasta la coracha: entre sus pretiles y desde el borde de la
    // cornisa (si no, las caras de la escalera, los pretiles y la cornisa
    // coincidían y parpadeaban)
    const n = 8;
    const rise = (A.top - C.y) / n;
    const zc = z1 + 0.3;
    stairs(ctx, A.x, C.y, zc + n * 0.42, 'n', C.x1 - C.x0 - 0.9, n, rise, 0.42, 'wallstone', { solidBelow: true });
    ctx.col.add(C.x0, A.top - 0.5, z1, C.x1, A.top, zc);
    for (let i = 0; i < n; i++) {
      // (el último pretil, hasta la atalaya)
      const za = i === n - 1 ? z1 : zc + n * 0.42 - 0.42 * (i + 1),
        zb = zc + n * 0.42 - 0.42 * i;
      const y1 = C.y + rise * (i + 1) + 1.0;
      solid(ctx, 'wallstone', C.x0, C.y, za, C.x0 + 0.45, y1, zb, { sub: 2, ao: false, faces: 'tnsew' });
      solid(ctx, 'wallstone', C.x1 - 0.45, C.y, za, C.x1, y1, zb, { sub: 2, ao: false, faces: 'tnsew' });
    }
  }

  // ------------------------------------------------------------ la coracha
  {
    const zs = A.z + A.w / 2 + 0.3 + 8 * 0.42; // donde acaba la escalera
    const tz0 = CT.z - CT.w / 2,
      tz1 = CT.z + CT.w / 2;
    // (partido en la torre: su base ya es maciza y, con las dos coronaciones a
    // la misma altura, el suelo de la torre parpadeaba)
    cityWall(ctx, C.x0, C.z0, C.x1, tz0, C.y, { merlons: false });
    cityWall(ctx, C.x0, tz1, C.x1, C.z1, C.y, { merlons: false });
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
    { id: 'adarve_castillo', rects: [[W.x0, W.z0, W.x1, W.z1 + 0.5, 7, 18]], atmo: 'ramparts' }
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
    { type: 'penitent', x: -64.5, y: W.y, z: -21.6, yaw: Math.PI / 2, idle: 'kneel', id: 'e_adc1' }
  );
}
