// La muralla norte y el adarve que la une con el Postigo: el camino de la
// persecución de la Bestia de Carne (game/beast_chase.js).
//
// Desde lo alto del Postigo, tras la barricada, el adarve del muro este sigue
// hacia el norte y atraviesa una torre; en la esquina sube a la muralla norte
// y corre hacia poniente atravesando dos torres. A medio camino el adarve se
// ha hundido (un tiro de los sitiadores): hay que saltar. Termina al pie de la
// Torre del Fanal: una escalera de piedra sube por el adarve hasta lo alto, a
// dieciocho metros, y desde allí sólo queda saltar a la paja de la atalaya de
// la coracha (level_keep.js).
import { RNG } from '../core/util.js';
import { solid, blocker, stairs, merlons, cityWall, house } from './builders.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';
import { BREACH, wallBreach } from './level_finale.js';

// Alturas del adarve: muro este (como lo alto del Postigo) y muralla norte.
const YE = 9,
  YN = 10;

// Datos de la persecución: el recorrido y dónde pasa cada cosa.
export const CHASE = {
  YE,
  YN,
  // recorrido del jugador (x, y, z): de la barricada a lo alto del fanal
  path: [
    [74, YE, -64],
    [74, YE, -70],
    [74, YE, -119.2],
    [74, YN, -124],
    [-44.8, YN, -124],
    [-56.8, 18, -124],
    [-60, 18, -121.6],
  ],
  // torre del muro este (la atraviesa el adarve)
  towerE: { x: 74, z: -95, w: 6, h: 15 },
  // torres de la muralla norte que atraviesa
  towersN: [55, 25, -30],
  // el tramo hundido (de x0 a x1) y por dónde se salta
  gap: { x0: 37, x1: 40.4, from: 41.2, to: 35.6 },
  // la Torre del Fanal: lo alto, el pie de la escalera y el hueco del salto
  fanal: { x: -60, z: -124, w: 7, top: 18, stairX: -44.8, leap: [-60, 18, -120.9] },
  // a dónde se salta (la paja de la atalaya)
  land: [-60, 11.5, -109.2],
};

// Parapeto macizo (con su albardilla) en el lado de dentro del adarve.
// (desde la coronación del muro, no más abajo: sus caras coincidirían con
// las del muro y parpadearían)
function parapet(ctx, x0, z0, x1, z1, y, h = 0.95) {
  solid(ctx, 'wallstone', x0, y, z0, x1, y + h, z1, { sub: 2, ao: false, faces: 'nsew' });
  ctx.wb.box('ashlar', x0 - 0.05, y + h, z0 - 0.05, x1 + 0.05, y + h + 0.12, z1 + 0.05, { ao: false, faces: 'tnsewb' });
}

// Torre atravesada por el adarve: base maciza hasta el suelo del adarve, una
// sala con dos puertas en el eje del adarve y la parte alta maciza, con su
// cornisa y almenas. axis: 'x' si el adarve corre a lo largo de x.
function gateTower(ctx, cx, cz, w, yF, h, axis, o = {}) {
  const wb = ctx.wb;
  const x0 = cx - w / 2,
    x1 = cx + w / 2,
    z0 = cz - w / 2,
    z1 = cz + w / 2;
  const t = 0.9;
  const dw = o.dw ?? 3.0,
    dh = o.dh ?? 3.8,
    ch = o.ch ?? 4.6;
  solid(ctx, 'wallstone', x0, 0, z0, x1, yF, z1, { sub: 2.2, aoH: 3, faces: 'nsew' });
  // (el enlosado, por toda la planta: también bajo los umbrales de las puertas)
  wb.box('flag', x0, yF - 0.3, z0, x1, yF, z1, { faces: 't', ao: false, uv: 0.8 });
  const room = (a0, b0, a1, b1, y0, y1, faces) =>
    axis === 'x' ? solid(ctx, 'wallstone', a0, y0, b0, a1, y1, b1, { sub: 2, faces }) : solid(ctx, 'wallstone', b0, y0, a0, b1, y1, a1, { sub: 2, faces });
  // en coordenadas del adarve: a a lo largo, b de través
  const A0 = axis === 'x' ? x0 : z0,
    A1 = axis === 'x' ? x1 : z1,
    B0 = axis === 'x' ? z0 : x0,
    B1 = axis === 'x' ? z1 : x1,
    BC = axis === 'x' ? cz : cx;
  // muros a los lados del adarve (enteros)
  room(A0, B0, A1, B0 + t, yF, yF + ch);
  room(A0, B1 - t, A1, B1, yF, yF + ch);
  // muros de las puertas
  for (const [a, b] of [
    [A0, A0 + t],
    [A1 - t, A1],
  ]) {
    room(a, B0 + t, b, BC - dw / 2, yF, yF + ch);
    room(a, BC + dw / 2, b, B1 - t, yF, yF + ch);
    room(a, BC - dw / 2, b, BC + dw / 2, yF + dh, yF + ch, 'tnsewb');
    // jambas de sillería (asoman un poco al vano: si no, su cara coincidía
    // con la del muro y parpadeaba)
    for (const s of [-1, 1]) room(a - 0.05, BC + s * (dw / 2) - (s > 0 ? 0.04 : 0.25), b + 0.05, BC + s * (dw / 2) + (s > 0 ? 0.25 : 0.04), yF, yF + dh, 'nsew');
  }
  // techo de vigas y parte alta maciza
  wb.box('wooddark', x0 + t, yF + ch - 0.25, z0 + t, x1 - t, yF + ch, z1 - t, { faces: 'b', ao: false });
  for (let k = -1; k <= 1; k++) {
    const u = k * (w / 2 - t) * 0.55;
    if (axis === 'x') wb.box('wooddark', cx + u - 0.14, yF + ch - 0.55, z0 + t, cx + u + 0.14, yF + ch - 0.25, z1 - t, { ao: false, faces: 'nsewb' });
    else wb.box('wooddark', x0 + t, yF + ch - 0.55, cz + u - 0.14, x1 - t, yF + ch - 0.25, cz + u + 0.14, { ao: false, faces: 'nsewb' });
  }
  ctx.col.add(x0, yF + ch - 0.25, z0, x1, h, z1);
  wb.box('wallstone', x0, yF + ch, z0, x1, h, z1, { sub: 2.2, faces: 'nsew' });
  wb.box('wallstone', x0 - 0.3, h - 0.5, z0 - 0.3, x1 + 0.3, h, z1 + 0.3, { ao: false, sub: 3, faces: 'tnsewb', mats: { t: 'flag' } });
  merlons(ctx, x0 - 0.3, z0, x1 + 0.3, z0, h, { collide: false });
  merlons(ctx, x0 - 0.3, z1, x1 + 0.3, z1, h, { collide: false });
  merlons(ctx, x0, z0 + 0.3, x0, z1 - 0.3, h, { collide: false });
  merlons(ctx, x1, z0 + 0.3, x1, z1 - 0.3, h, { collide: false });
  // saeteras (fuera de la sala)
  for (let y = 4; y < yF - 1; y += 4.5)
    for (const [sx, sz, rx, rz] of [
      [cx, z1 + 0.02, 0.12, 0],
      [cx, z0 - 0.02, 0.12, 0],
      [x1 + 0.02, cz, 0, 0.12],
      [x0 - 0.02, cz, 0, 0.12],
    ])
      wb.box('black', sx - rx - 0.001, y, sz - rz - 0.001, sx + rx + 0.001, y + 1.2, sz + rz + 0.001, { ao: false, grime: false });
  for (const [sx, sz, rx, rz] of axis === 'x'
    ? [
        [cx, z1 + 0.02, 0.12, 0],
        [cx, z0 - 0.02, 0.12, 0],
      ]
    : [
        [x1 + 0.02, cz, 0, 0.12],
        [x0 - 0.02, cz, 0, 0.12],
      ])
    wb.box('black', sx - rx - 0.001, yF + 1.4, sz - rz - 0.001, sx + rx + 0.001, yF + 2.6, sz + rz + 0.001, { ao: false, grime: false });
}

// Tramo de muralla con su adarve: almenas fuera (con colisión) y parapeto
// dentro. side: lado de fuera ('n' o 'e').
function wallRun(ctx, x0, z0, x1, z1, h, out, o = {}) {
  cityWall(ctx, x0, z0, x1, z1, h, { merlonSides: [out] });
  // colisión de las almenas (el muro las pone sólo de adorno)
  // (alta: que no se pueda subir encima desde un escalón o una caja)
  if (out === 'n') blocker(ctx, x0, h - 0.2, z0, x1, h + 2.4, z0 + 0.6);
  if (out === 'e') blocker(ctx, x1 - 0.6, h - 0.2, z0, x1, h + 2.4, z1);
  if (o.inner === false) return;
  if (out === 'n') parapet(ctx, x0 + (o.trimA ?? 0), z1 - 0.5, x1 - (o.trimB ?? 0), z1, h);
  if (out === 'e') parapet(ctx, x0, z0 + (o.trimA ?? 0), x0 + 0.5, z1 - (o.trimB ?? 0), h);
}

export function buildNorthWalls(ctx, S, L) {
  const wb = ctx.wb;
  const rng = new RNG(9191);

  // ------------------------------------------------------------ muro este
  const TE = CHASE.towerE;
  wallRun(ctx, 72, TE.z + TE.w / 2, 76, -68, YE, 'e');
  wallRun(ctx, 72, -122, 76, TE.z - TE.w / 2, YE, 'e', { trimA: 2.6 });
  gateTower(ctx, TE.x, TE.z, TE.w, YE, TE.h, 'z');
  // el parapeto de la esquina, más alto (la escalera sube a la muralla norte)
  parapet(ctx, 72, -122, 72.5, -119.4, YE, 1.95);
  stairs(ctx, 74, YE, -119.6, 'n', 2.9, 4, 0.25, 0.6, 'wallstone', { solidBelow: true });

  // ------------------------------------------------------------ muralla norte
  const G = CHASE.gap;
  const F = CHASE.fanal;
  const fx0 = F.x - F.w / 2,
    fx1 = F.x + F.w / 2,
    fz0 = F.z - F.w / 2,
    fz1 = F.z + F.w / 2;
  const tw = 6;
  const towerX = CHASE.towersN;
  // tramos entre torres (de este a oeste)
  const cuts = [76, towerX[0] + tw / 2, towerX[0] - tw / 2, G.x1, G.x0, towerX[1] + tw / 2, towerX[1] - tw / 2, towerX[2] + tw / 2, towerX[2] - tw / 2, fx1, fx0, -93];
  for (let i = 0; i < cuts.length; i += 2) {
    let a = cuts[i + 1];
    const b = cuts[i];
    // (bajo la escalera del fanal, el muro sin almenas ni parapeto: la
    // escalera lleva sus pretiles)
    if (a === fx1) {
      cityWall(ctx, fx1, -126, F.stairX, -122, YN, { merlons: false });
      a = F.stairX;
    }
    // (el lienzo de en medio, partido: por ahí lo atraviesa el gigante del
    // jefe final; el tramo, en el grupo 'muroN', y su brecha en 'muroNRuin':
    // ver level_finale.js)
    if (a < BREACH.x0 && b > BREACH.x1) {
      wallRun(ctx, a, -126, BREACH.x0, -122, YN, 'n');
      ctx.beginGroup('muroN');
      wallRun(ctx, BREACH.x0, -126, BREACH.x1, -122, YN, 'n');
      ctx.endGroup();
      wallRun(ctx, BREACH.x1, -126, b, -122, YN, 'n');
      continue;
    }
    // (el de la esquina no lleva parapeto donde llega el adarve del muro este)
    wallRun(ctx, a, -126, b, -122, YN, 'n', { trimB: b === 76 ? 4 : 0 });
  }
  wallBreach(ctx);
  // la esquina: almenas también al este
  blocker(ctx, 75.4, YN - 0.2, -126, 76, YN + 2.4, -122);
  merlons(ctx, 75.7, -126, 75.7, -122, YN, { collide: false });
  for (const x of towerX) gateTower(ctx, x, -124, tw, YN, 16, 'x');

  // el tramo hundido: el adarve se ha venido abajo hasta media altura
  {
    const yb = 6.4;
    solid(ctx, 'wallstone', G.x0, 0, -126, G.x1, yb, -122, { sub: 2.2, aoH: 2.5, faces: 'tnsew', mats: { t: 'dirt' } });
    // bordes rotos: sillares sueltos y desmoronados a los dos lados
    for (const [x, s] of [
      [G.x0, 1],
      [G.x1, -1],
    ]) {
      for (let i = 0; i < 6; i++) {
        const z = -126 + 0.35 + i * 0.62;
        const hh = rng.range(0.8, 3.0);
        const d = rng.range(0.25, 0.7);
        wb.box('wallstone', s > 0 ? x : x - d, YN - hh, z, s > 0 ? x + d : x, YN - rng.range(0, 0.25), z + 0.6, { ao: false, sub: 2 });
      }
    }
    P.rubble(ctx, (G.x0 + G.x1) / 2, yb, -124, 9, 4301, 1.4, { mat: 'wallstone', scale: 1.6 });
    // de dónde vino: un bolo de piedra de los trabucos, partido
    P.siegeStone(ctx, G.x0 + 1.2, yb, -123.1, 0.7);
    // que no se caiga nadie dentro sin saltar (ni vuelva a él)
    blocker(ctx, G.x1, YN, -126, G.x1 + 0.3, YN + 3, -122);
    blocker(ctx, G.x0 - 0.3, YN, -126, G.x0, YN + 3, -122);
    P.dropped(ctx, G.x1 + 1.5, YN, -123.2, 0.4, 'helmet');
  }

  // ------------------------------------------------------------ Torre del Fanal
  // maciza hasta lo alto (dieciocho metros), con una escalera de piedra que
  // sube por el adarve; arriba, almenas y un hueco en el parapeto del sur
  {
    const top = F.top;
    solid(ctx, 'wallstone', fx0, 0, fz0, fx1, top, fz1, { sub: 2.2, aoH: 3, faces: 'nsew', mats: { t: 'flag' } });
    wb.box('wallstone', fx0 - 0.3, top - 0.5, fz0 - 0.3, fx1 + 0.3, top, fz1 + 0.3, { ao: false, sub: 3, faces: 'tnsewb', mats: { t: 'flag' } });
    wb.box('flag', fx0, top - 0.05, fz0, fx1, top + 0.01, fz1, { ao: false, faces: 't', uv: 0.8 });
    const mo = { collide: true, h: 1.2 };
    merlons(ctx, fx0 - 0.3, fz0 + 0.3, fx1 + 0.3, fz0 + 0.3, top, mo);
    merlons(ctx, fx0 + 0.3, fz0 + 0.6, fx0 + 0.3, fz1 - 0.6, top, mo);
    // al este, sólo donde no llega la escalera
    merlons(ctx, fx1 - 0.3, fz0 + 0.6, fx1 - 0.3, -126.1, top, mo);
    merlons(ctx, fx1 - 0.3, -121.9, fx1 - 0.3, fz1 - 0.6, top, mo);
    // al sur, con el hueco por donde se salta
    const hx0 = F.leap[0] - 1.3,
      hx1 = F.leap[0] + 1.3;
    merlons(ctx, fx0 - 0.3, fz1 - 0.3, hx0, fz1 - 0.3, top, mo);
    merlons(ctx, hx1, fz1 - 0.3, fx1 + 0.3, fz1 - 0.3, top, mo);
    wb.box('wallstone', hx0, top, fz1 - 0.6, hx0 + 0.5, top + 0.35, fz1, { ao: false });
    wb.box('wallstone', hx1 - 0.4, top, fz1 - 0.6, hx1, top + 0.25, fz1, { ao: false });
    // que no se caiga nadie por el hueco (el salto lo lleva la persecución)
    blocker(ctx, hx0, top, fz1 - 0.6, hx1, top + 3, fz1);
    // el fanal: una cesta de hierro grande, apagada, y su leña
    {
      const bx = F.x - 2.2,
        bz = F.z - 2.2;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        wb.box('iron', bx + Math.cos(a) * 0.5 - 0.05, top, bz + Math.sin(a) * 0.5 - 0.05, bx + Math.cos(a) * 0.5 + 0.05, top + 1.3, bz + Math.sin(a) * 0.5 + 0.05, { ao: false });
      }
      wb.cylinder('iron', bx, top + 1.2, bz, 0.42, 0.72, 0.5, 8, { ao: false, capBot: true });
      wb.cylinder('black', bx, top + 1.66, bz, 0.68, 0.68, 0.02, 8, { ao: false, capTop: true, grime: false });
      ctx.col.add(bx - 0.75, top, bz - 0.75, bx + 0.75, top + 1.75, bz + 0.75);
    }
    P.firewood(ctx, F.x + 2.2, top, F.z - 2.5, 0, 3);
    bakeCorpse(wb, F.x - 2.4, top, F.z + 1.4, 2.4, 'sit', 'soldier', 17);
    P.banner(ctx, fx0 - 0.32, top - 1.4, F.z, -Math.PI / 2, 'bannerBlack', 1.6, 4.2);
    P.banner(ctx, F.x, top - 1.4, fz0 - 0.32, Math.PI, 'bannerBlack', 1.6, 4.2);
    // saeteras
    for (let y = 4; y < top - 2; y += 4.5)
      for (const [sx, sz, rx, rz] of [
        [F.x, fz1 + 0.02, 0.12, 0],
        [F.x, fz0 - 0.02, 0.12, 0],
        [fx0 - 0.02, F.z, 0, 0.12],
      ])
        wb.box('black', sx - rx - 0.001, y, sz - rz - 0.001, sx + rx + 0.001, y + 1.2, sz + rz + 0.001, { ao: false, grime: false });
    // la escalera: del adarve (a 10 m) a lo alto (a 18), por todo el ancho
    // (entre los pretiles y hasta el borde de la cornisa: si no, sus caras
    // coincidían con las de los pretiles y la cornisa, y parpadeaban)
    const n = 27,
      rise = (top - YN) / n,
      run = (F.stairX - fx1 - 0.3) / n;
    stairs(ctx, F.stairX, YN, -124, 'w', 4 - 0.9, n, rise, run, 'wallstone', { solidBelow: true });
    ctx.col.add(fx1, top - 0.5, -125.55, fx1 + 0.3, top, -122.45);
    // pretiles escalonados a los dos lados (con colisión; el último, hasta la
    // torre)
    for (let i = 0; i < n; i++) {
      const xa = i === n - 1 ? fx1 : F.stairX - run * (i + 1),
        xb = F.stairX - run * i;
      const y1 = YN + rise * (i + 1) + 1.0;
      solid(ctx, 'wallstone', xa, YN, -126, xb, y1, -125.55, { sub: 2, ao: false, faces: 'tnsew' });
      solid(ctx, 'wallstone', xa, YN, -122.45, xb, y1, -122, { sub: 2, ao: false, faces: 'tnsew' });
    }
  }

  // ------------------------------------------------------------ detalles del adarve
  // restos del asalto, cadáveres y braseros (también dan luz)
  bakeCorpse(wb, 73.1, YE, -76.5, 1.1, 'back', 'soldier', 13);
  P.decal(ctx, 73.1, YE + 0.01, -76.5, 1.8);
  P.arrows(ctx, 74.6, YE, -86, 10, 4311, 1.6);
  P.dropped(ctx, 75.1, YE, -104.5, 2.4, 'spear');
  bakeCorpse(wb, 75, YE, -110.5, -0.4, 'sit', 'soldier', 14);
  P.brazier(ctx, 73, YE, -101.5, {});
  P.brazier(ctx, 73.2, YN, -123.4, {});
  P.arrows(ctx, 62, YN, -124, 12, 4312, 2.2);
  bakeCorpse(wb, 47, YN, -123, 2.0, 'face', 'soldier', 15);
  P.decal(ctx, 47, YN + 0.01, -123, 2.2);
  P.brazier(ctx, 19, YN, -122.9, {});
  P.dropped(ctx, 15, YN, -124.8, 0.9, 'shield');
  bakeCorpse(wb, -8, YN, -125, 0.3, 'curl', 'villager', 16);
  P.arrows(ctx, -18, YN, -123.6, 8, 4313, 1.8);
  P.brazier(ctx, -40, YN, -122.9, {});
  ctx.beginGroup('muroN');
  P.fleshGrowth(ctx, -2, YN, -125.6, 0.9, 4314, { climb: 1.0 });
  // (un brasero: al reventar el muro, sus brasas arden entre los escombros)
  P.brazier(ctx, 3.4, YN, -122.9, {});
  ctx.endGroup();
  P.fleshGrowth(ctx, 75.6, YE, -88, 0.8, 4315, { climb: 1.1 });
  // en las torres atravesadas: pertrechos y un farol
  for (const x of towerX) {
    P.barrel(ctx, x - 1.6, YN, -125.6, {});
    P.crate(ctx, x + 1.5, YN, -125.5, 0.7, rng.range(0, 1));
  }
  // barriles y cajas que la Bestia revienta al pasar (vuelven al morir)
  for (const [k, x, y, z] of [
    ['barrel', 72.95, YE, -81.5],
    ['crate', 75.0, YE, -89.0],
    ['barrel', 72.95, YE, -106.0],
    ['crate', 75.0, YE, -113.2],
    ['barrel', 66.0, YN, -124.9],
    ['crate', 47.6, YN, -124.9],
    ['barrel', 33.0, YN, -122.95],
    ['crate', 12.0, YN, -124.9],
    ['barrel', -12.0, YN, -122.95],
    ['crate', -21.0, YN, -124.9],
  ])
    L.breakables.push({
      kind: k,
      id: `c_${k}_${Math.round(x * 10)}_${Math.round(-z * 10)}`,
      area: 'chase',
      x,
      y,
      z,
      hx: k === 'barrel' ? 0.42 : 0.45,
      hz: k === 'barrel' ? 0.42 : 0.45,
      h: k === 'barrel' ? 1.0 : 0.85,
    });

  // ------------------------------------------------------------ manzanas
  // lo que se ve desde la muralla: tejados entre la muralla norte, la
  // catedral, el claustro y el muro este
  const block = (x0, z0, x1, z1, o = {}) =>
    house(ctx, { x0, z0, x1, z1, front: o.front ?? rng.pick(['n', 's', 'e', 'w']), seed: Math.floor(rng.next() * 1e9), h: o.h ?? rng.range(5.8, 8.4), lit: o.lit, burned: o.burned, jetty: 0 });
  // noreste
  block(38, -120.5, 50, -110, { front: 's' });
  block(50, -120.5, 61, -110, { burned: true });
  block(61, -120.5, 71, -109);
  block(38, -110, 49, -98, { lit: true });
  block(49, -110, 60, -98);
  block(60, -109, 71, -100, { front: 'w' });
  // detrás del claustro
  block(15, -120.5, 26, -109);
  block(26, -120.5, 37, -109, { lit: true });
  block(15, -109, 26, -97, { burned: true });
  block(26, -109, 37, -97);
  block(15, -97, 26, -89);
  block(26, -97, 37, -89, { front: 'e' });
  // al oeste de la catedral
  block(-46, -120.5, -33, -108, { front: 's' });
  block(-33, -120.5, -19, -108, { lit: true });
  block(-46, -108, -33, -96);
  block(-33, -108, -19, -96, { burned: true });
  block(-46, -96, -33, -84, { lit: true });
  block(-33, -96, -19, -84);
  block(-46, -84, -33, -72);
  block(-33, -84, -19, -72, { front: 'e' });
  block(-46, -72, -33, -64);
  block(-33, -72, -19, -64, { burned: true });

  // ------------------------------------------------------------ zonas
  L.zones.push(
    { id: 'adarve_norte', rects: [[71, -122, 77, -68, 6, 20]], atmo: 'ramparts' },
    { id: 'adarve_norte', rects: [[F.x + F.w / 2, -127.5, 77, -120.5, 6, 26]], atmo: 'ramparts' },
    { id: 'torre_fanal', rects: [[fx0 - 0.5, fz0 - 0.5, fx1 + 0.5, fz1 + 0.5, 16, 30]], atmo: 'ramparts' }
  );
  L.map.push({ id: 'adarve_norte', r: [72.5, -122, 75.4, -68] }, { id: 'adarve_norte', r: [fx1, -126, 76, -122] }, { id: 'torre_fanal', r: [fx0, fz0, fx1, fz1] });
}
