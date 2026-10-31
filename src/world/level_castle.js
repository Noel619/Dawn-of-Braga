// El castillo de Braga: la guarnición que esperaba el asedio.
//
// Todo en él sirve para resistir. Se entra por una torre-puerta en recodo:
// rastrillo, buhederas en la bóveda y un giro a la izquierda que rompe la
// carga del que entra. El patio de armas tiene su aljibe (el pozo baja a él),
// el cuartel de la tropa, la fragua del armero, la cocina con el horno, las
// caballerizas (sin caballos: se los comieron), la capilla, que acabó de
// hospital, y el fundíbulo de la guarnición, partido por un tiro de los de
// fuera. La escalera del adarve norte se vino abajo con otro.
//
// La torre del homenaje, el último reducto, ocupa la esquina noroeste y los
// adarves entran en ella. Se sube por una escalera exenta hasta un rellano y
// un puente levadizo la une con la puerta, en la planta primera: lo alzaron
// desde dentro y desde el patio ya no sube nadie. Planta baja: el almacén de
// víveres (sólo por una trampilla desde arriba); primera: el cuerpo de
// guardia y la armería, con el torno del puente; segunda: la sala del
// alcaide, con el plano de la defensa y la poterna del adarve; arriba, la
// terraza de combate (ahí se peleará con la Bestia de Carne).
//
// Bajo el patio, las mazmorras: el pasillo de las celdas (aquí despierta el
// jugador) y el cuarto del carcelero, cavados junto a una necrópolis más
// antigua —las catacumbas— que llega hasta el aljibe; un pasadizo sigue
// hasta la escalera que sube a la torre de la cárcel, en el patio.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { house, solid, blocker, stairs, merlons, cityWall, tower, archWall, subtractRects, solidGableRoof, archedWall, archRing, barrelVault, crossVault, groinVaults, pilaster } from './builders.js';
import * as P from './props.js';
import { floor, interiorRoom } from './level_util.js';
import { bakeCorpse } from '../entities/models.js';
import { buildTorre, torreZones, BAJADA } from './level_torre.js';
import { bakeParts, moveParts, skullParts, helmetedSkullParts, keyParts, crossbowParts, hornParts, bucketParts, trophyParts, shieldParts, spearheadParts, chainParts } from './ossuary_props.js';

const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Suelo de las mazmorras.
const YD = -5;
// el osario de la Hermandad: hundido 0,9 m bajo las galerías, con su bóveda
// casi hasta la losa del patio
export const OSARIO_C = { x0: -93.5, x1: -85.5, z: 3, y: YD - 0.9, top: -1.25 };

export const CASTLE = {
  // el patio, dentro de las murallas
  yard: { x0: -90, z0: -20, x1: -51, z1: 20 },
  wallH: 9,
  // la torre del homenaje (esquina noroeste, a caballo de la muralla norte):
  // planta, muros, plantas, la terraza y el grueso de los forjados (lo demás
  // sale de aquí: world/level_torre.js)
  keep: { x0: -97, z0: -29, x1: -71, z1: -3, t: 2.4, F1: 4.5, F2: 9, F3: 13.5, R: 18.4, slab: 0.4 },
  // la puerta (planta primera, al sur) y el puente levadizo
  door: { x: -82, w: 2.2, h: 2.6 },
  bridge: { w: 2.6, len: 2.7 },
  // el rellano de la escalera exenta, enfrente de la puerta
  landing: { x0: -84.6, x1: -79.4, z0: -0.3, z1: 3.0 },
  // la poterna del adarve (planta segunda, al este)
  postern: { z0: -21.6, z1: -20.2, h: 2.5 },
  // la trampilla del almacén (en la planta primera)
  hatch: { x: -88.4, z: -10.8 },
  // la torre-puerta y su paso en recodo (A: de la calle hacia el oeste; B:
  // hacia el sur, al patio)
  gate: { x0: -59, x1: -48, z0: -7, z1: 5, h: 13, ph: 4.4 },
  // la torre de la cárcel (la escalera de las mazmorras) y la trampilla de
  // su sala de arriba
  ptower: { x0: -90, x1: -81, z0: 4, z1: 14, t: 1, h: 12 },
  ptHatch: { x: -83.0, z: 12.0 },
  // las mazmorras
  dun: { y: YD, x0: -96, z0: -24, x1: -46, z1: 24 },
  // el pozo del patio (baja al aljibe, a la clave de uno de sus tramos)
  well: { x: -61.8, z: 12.0 },
  // dónde despierta el jugador
  start: { x: -87.6, y: YD, z: -16.2, yaw: 0 },
};

// El aljibe, bajo el patio: el agua de lluvia guardada para el asedio. Tres
// naves de cinco tramos con bóvedas de arista sobre columnas (xs, zs: las
// líneas de los apoyos, de muro a muro; ys y rise: su arranque y su flecha).
// El estanque ocupa casi todo; al norte y a poniente, el andén (sus bordes:
// walkN y walkW), con su pretil, lleva de la galería de las catacumbas al
// pasadizo de la cárcel, y las dos puertas y el pozo caen en el centro de un
// tramo. Está a la mitad («que nadie lave nada»): water, el agua; full, la
// marca de cuando estaba lleno, un palmo bajo el andén; floor, el fondo.
export const ALJIBE = { xs: [-73, -69.8, -66.6, -63.4, -60.2, -57], zs: [7.5, 10.5, 13.5, 16.5], ys: -2.45, rise: 1.5, walkN: 10, walkW: -70.5, floor: -7.4, water: -6.3, full: -5.25 };

// Muro macizo (con colisión) a lo largo de 'x' o 'z', de a0 a a1, de t0 a t1
// de grueso y de y0 a y1, con huecos [{ a0, a1, y0, y1 }]: dibuja las caras
// de fuera ('faces') y, en cada hueco, sus jambas, su alféizar y su intradós.
export function holedWall(ctx, mat, axis, a0, a1, t0, t1, y0, y1, holes, faces, o = {}) {
  const hs = [...holes].sort((p, q) => p.a0 - q.a0);
  const put = (u0, v0, u1, v1, f) => {
    if (u1 - u0 < 0.001 || v1 - v0 < 0.001) return;
    const opt = { sub: o.sub ?? 2.2, aoH: o.aoH ?? 2.5, faces: f, room: o.room, tint: o.tint, mats: o.mats, collide: o.collide };
    if (axis === 'x') solid(ctx, mat, u0, v0, t0, u1, v1, t1, opt);
    else solid(ctx, mat, t0, v0, u0, t1, v1, u1, opt);
  };
  const endA = axis === 'x' ? 'w' : 'n',
    endB = axis === 'x' ? 'e' : 's';
  let cur = a0;
  for (let k = 0; k <= hs.length; k++) {
    const h = hs[k];
    const end = h ? h.a0 : a1;
    put(cur, y0, end, y1, faces + (k > 0 ? endA : '') + (h ? endB : ''));
    if (!h) break;
    put(h.a0, y0, h.a1, h.y0, faces + 't');
    put(h.a0, h.y1, h.a1, y1, faces + 'b');
    cur = h.a1;
  }
}

// Viga (caja) de a a b con sección w.
export function beam3(ctx, mat, a, b, w, o = {}) {
  const d = new THREE.Vector3().subVectors(b, a);
  const L = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
  const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, V(w, L, o.d ?? w));
  ctx.wb.geometry(mat, new THREE.BoxGeometry(1, 1, 1), m, { ao: false, room: o.room, tint: o.tint });
}

// Parapeto con albardilla (y su colisión).
export function parapet(ctx, x0, z0, x1, z1, y, h = 0.95, o = {}) {
  solid(ctx, o.mat ?? 'wallstone', x0, y, z0, x1, y + h, z1, { sub: 2, ao: false, faces: o.faces ?? 'nsew', room: o.room });
  ctx.wb.box('ashlar', x0 - 0.05, y + h, z0 - 0.05, x1 + 0.05, y + h + 0.12, z1 + 0.05, { ao: false, faces: 'tnsewb', room: o.room });
}

// Saetera: hendidura negra en una cara (dir: hacia dónde mira la cara).
export function slit(ctx, x, y, z, dir, h = 1.2) {
  const e = 0.02;
  const a = { n: [-0.12, -e - 0.002, 0.12, -e], s: [-0.12, e, 0.12, e + 0.002], e: [e, -0.12, e + 0.002, 0.12], w: [-e - 0.002, -0.12, -e, 0.12] }[dir];
  ctx.wb.box('black', x + a[0], y, z + a[1], x + a[2], y + h, z + a[3], { ao: false, grime: false });
}

// Jergón de paja con su manta (en el suelo: aquí no hay camas).
function pallet(ctx, x, y, z, rot, seed, room) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  wb.at(x, y, z, rot, () => {
    wb.box('straw', -0.42, 0, -0.95, 0.42, 0.14, 0.95, { ao: false, faces: 'tnsew', room });
    if (rng.chance(0.75)) wb.box(rng.pick(['clothDark', 'burlap', 'leather']), -0.44, 0.14, -0.2 + rng.range(-0.2, 0.2), 0.44, 0.17, 0.85, { ao: false, faces: 'tnsew', room, tint: [0.8, 0.76, 0.7] });
    if (rng.chance(0.5)) wb.box('burlap', -0.3, 0.14, -0.9, 0.3, 0.3, -0.62, { ao: false, room });
  });
}

// ======================================================================== CASTILLO
export function buildCastle(ctx, S, D, L) {
  const wb = ctx.wb;
  const rng = new RNG(4401);
  const Y = CASTLE.yard;
  ctx.floorHoles = ctx.floorHoles || [];

  // --- lo transitable a ras de suelo
  W(S, Y.x0, Y.z0, Y.x1, Y.z1);
  buildWalls(ctx, S, L, rng);
  buildGate(ctx, S, L);
  buildTorre(ctx, S, L);
  buildYard(ctx, S, L, rng);
  buildPrisonTower(ctx, S, L);
  buildDungeon(ctx, D, L);

  // --- zonas
  const K = CASTLE.keep;
  const G = CASTLE.gate,
    T = CASTLE.ptower;
  const keepZones = torreZones();
  L.zones.push(
    ...keepZones,
    { id: 'torre_carcel', rects: [[T.x0 + T.t, T.z0 + T.t, T.x1 - T.t, T.z1 - T.t, -1, 4]], atmo: 'prison', room: 'torre_carcel' },
    { id: 'torre_carcel_alta', rects: [[T.x0 + T.t, T.z0 + T.t, T.x1 - T.t, T.z1 - T.t, 4.2, 8]], atmo: 'interior', room: 'torre_carcel_alta' },
    {
      id: 'castle_gate',
      rects: [
        [-55.8, -1.4, -47.8, 1.4, -0.5, G.ph],
        [-55.8, 1.4, -53, 5, -0.5, G.ph],
      ],
      atmo: 'city',
    },
    { id: 'castle_chapel', rects: [[-60, -20, -52, -14, -1, 5]], atmo: 'chapel', room: 'castle_chapel' },
    { id: 'cuartel', rects: [[-80, 13, -66, 20, -1, 3.2]], atmo: 'interior', room: 'cuartel' },
    { id: 'castle', rects: [[-93, -23, -47.8, 23, -0.6, 20]], atmo: 'city' }
  );
  L.map.push(
    { id: 'castle', r: [Y.x0, Y.z0, Y.x1, Y.z1], cut: [Y.x0, Y.z0, K.x1, K.z1] },
    // (la torre, se entre por donde se entre, rotulada como tal)
    ...[...new Set(keepZones.map((z) => z.id))].map((id) => ({ id, r: [K.x0, K.z0, K.x1, K.z1], label: 'homenaje' })),
    { id: 'castle_gate', r: [G.x0, G.z0, G.x1, G.z1] },
    { id: 'castle_chapel', r: [-60, -20, -52, -14] },
    { id: 'cuartel', r: [-80, 13, -66, 20] },
    { id: 'torre_carcel', r: [T.x0, T.z0, T.x1, T.z1] },
    { id: 'torre_carcel_alta', r: [T.x0, T.z0, T.x1, T.z1], label: 'torre_carcel' }
  );
  L.phantoms.push({ x: -72, y: 9, z: 21.5, trigger: [-70, 0, 10] });
}

// ------------------------------------------------------------------------ murallas
function buildWalls(ctx, S, L, rng) {
  const wb = ctx.wb;
  const H = CASTLE.wallH;
  const K = CASTLE.keep;
  const G = CASTLE.gate;
  // la coracha llega a la muralla norte por aquí (level_keep.js)
  const cx0 = -62,
    cx1 = -58;
  // norte (de la torre del homenaje a la torre del nordeste): su adarve se
  // pisa (llega de la coracha y entra en la torre por la poterna)
  cityWall(ctx, K.x1, -23, -48, -20, H, { merlons: false });
  merlons(ctx, K.x1, -22.7, cx0, -22.7, H, { collide: false });
  merlons(ctx, cx1, -22.7, -48, -22.7, H, { collide: false });
  // (la colisión de las almenas, alta: que no se ande por encima)
  blocker(ctx, K.x1, H - 0.2, -23, cx0, H + 2.4, -22.4);
  blocker(ctx, cx1, H - 0.2, -23, -52.5, H + 2.4, -22.4);
  // pretil hacia el patio (con el hueco por donde desemboca la escalera)
  parapet(ctx, K.x1 + 2.0, -20.5, -52.5, -20, H);
  // restos de los cadalsos: canes de madera que asoman por fuera
  for (let x = K.x1 + 0.7; x < -50; x += 1.6) {
    if (x > cx0 - 0.5 && x < cx1 + 0.5) continue;
    wb.box('wooddark', x - 0.1, H - 0.9, -23.9, x + 0.1, H - 0.65, -23, { ao: false });
  }
  for (const [a, b] of [
    [-70.6, -66.2],
    [-55.8, -52.4],
  ])
    wb.box('planks', a, H - 0.68, -23.9, b, H - 0.62, -23.02, { ao: false, faces: 'tnsewb', tint: [0.7, 0.62, 0.55] });
  // la escalera del adarve: sube pegada al muro este de la torre del homenaje
  // y desemboca de frente en el adarve, por el hueco del pretil, junto a la
  // poterna. Un tiro de los trabucos la partió por en medio: el macizo de
  // arriba se desmoronó en talud, los primeros peldaños que quedan asoman
  // volados de la torre y los de abajo acaban mordidos.
  {
    const n = 30,
      rise = H / n,
      run = 0.42;
    const sx0 = K.x1,
      sx1 = K.x1 + 2.0;
    const zt = -20; // arriba (el borde del adarve)
    const zf = zt + n * run; // el pie
    const gap0 = 11,
      gap1 = 19;
    const rr = new RNG(4406);
    // (bottom: el macizo de debajo; xr: lo que queda del peldaño; chip:
    // mordisco en lo alto)
    const broken = {
      9: { xr: sx1 - 0.25, chip: 0.06 },
      10: { xr: sx0 + 0.75, chip: 0.17, bottom: 0 },
      20: { bottom: 5.55, xr: sx0 + 1.05 },
      21: { bottom: 4.35, xr: sx0 + 1.45, chip: 0.05 },
      22: { bottom: 2.75, xr: sx0 + 1.72 },
      23: { bottom: 1.15 },
    };
    for (let i = 0; i < n; i++) {
      if (i >= gap0 && i <= gap1) continue;
      const za = zf - run * (i + 1),
        zb = zf - run * i;
      const B = broken[i] || {};
      const top = rise * (i + 1) - (B.chip ?? 0);
      const bottom = B.bottom ?? 0;
      const xr = B.xr ?? sx1;
      const tint = [1.02 + rr.range(-0.06, 0.06), 0.98, 0.92];
      // (huella de losa y tabica de sillería, más claras que la torre: si
      // no, la escalera se perdía contra el muro)
      solid(ctx, 'wallstone', sx0, bottom, za, xr, top, zb, { sub: 2, aoH: 1.5, faces: 'tnsew' + (bottom > 0 ? 'b' : ''), tint, mats: { t: 'flag', s: 'ashlar' } });
    }
    // las roturas: cascotes que asoman de las caras partidas
    const jag = (x, y, z, sz, k) => P.roughStone(ctx, x, y, z, sz, 4406 + k * 11, { block: true, mat: 'wallstone', uvScale: 0.7, sink: 0, scl: [1, 0.7, 0.8] });
    for (let k = 0; k < 6; k++) {
      // bajo los peldaños volados, contra la torre
      const i = 20 + (k % 4);
      const zc = zf - run * (i + 0.5);
      const yb = (broken[i] || {}).bottom ?? 0;
      jag(sx0 + 0.2 + rr.range(0, 0.4), Math.max(0, yb - 0.35), zc + rr.range(-0.15, 0.15), rr.range(0.3, 0.5), k);
    }
    jag(sx0 + 1.1, 3.0, zf - run * 10.6, 0.36, 7);
    jag(sx0 + 1.6, 2.6, zf - run * 10.2, 0.3, 8);
    // el talud del macizo derrumbado y los peldaños caídos, al pie del hueco
    const zg = zf - run * ((gap0 + gap1 + 1) / 2);
    P.rubble(ctx, sx0 + 1.3, 0, zg, 16, 4405, 2.0, { mat: 'wallstone', scale: 1.35, blocks: 0.75 });
    P.rubble(ctx, sx0 + 2.4, 0, zg + 1.6, 7, 4407, 1.2, { mat: 'wallstone', scale: 0.9 });
    for (let k = 0; k < 3; k++) {
      // huellas de peldaño enteras, tiradas
      wb.at(sx0 + 1.4 + k * 0.7, 0.0, zg - 1.2 + k * 1.1, rr.range(-0.6, 0.6), () => {
        wb.push();
        wb.rotateZ(rr.range(-0.25, 0.25));
        wb.box('wallstone', -0.95, 0, -0.21, 0.95, 0.28, 0.21, { ao: false, faces: 'tnsew' });
        wb.pop();
      });
    }
    ctx.col.add(sx0 + 0.2, 0, zg - 1.9, sx0 + 2.6, 0.7, zg + 1.9);
    P.siegeStone(ctx, sx0 + 3.1, 0, zg - 0.4, 0.55);
    L.interact.push({ kind: 'examine', id: 'x_escalera', text: 'escaleraRota', x: sx0 + 2.2, y: 0, z: zg + 2.2, r: 2.6 });
  }
  // adarve norte: braseros, piedras para tirar y un caído
  P.brazier(ctx, -66, H, -20.9, {});
  P.brazier(ctx, -54, H, -20.9, {});
  for (const [x, z] of [
    [-69.5, -22.0],
    [-63.4, -21.9],
    [-56.4, -22.0],
  ])
    for (let k = 0; k < 4; k++) {
      const r = 0.2 + rng.range(0, 0.08);
      wb.geometry('wallstone', new THREE.SphereGeometry(1, 6, 5), new THREE.Matrix4().compose(V(x + (k % 2) * 0.4 - 0.2, H + r, z + (k > 1 ? 0.35 : 0)), new THREE.Quaternion(), V(r, r * 0.9, r)), {
        ao: false,
      });
    }
  bakeCorpse(wb, -66.8, H, -21.6, 0.4, 'back', 'soldier', 21);
  P.decal(ctx, -66.8, H + 0.01, -21.6, 2.0);
  P.arrows(ctx, -60.5, H, -21.4, 8, 5205, 1.4);
  // oeste (al sur de la torre), sur y este (con la torre-puerta en medio)
  cityWall(ctx, -93, K.z1, -90, 20, H, { merlonSides: ['w'] });
  cityWall(ctx, -93, 20, -48, 23, H, { merlonSides: ['s'] });
  cityWall(ctx, -51, -20, -48, G.z0, H, { merlonSides: ['e'] });
  cityWall(ctx, -51, G.z1, -48, 20, H, { merlonSides: ['e'] });
  // torres de las esquinas (la del noroeste es la del homenaje)
  tower(ctx, -91.5, 21.5, 6, 12);
  tower(ctx, -49.5, 21.5, 6, 12);
  tower(ctx, -49.5, -21.5, 6, 12);
  P.banner(ctx, -46.4, 10.2, -21.5, Math.PI / 2, 'bannerBlack', 1.6, 4);
  P.banner(ctx, -46.4, 10.2, 21.5, Math.PI / 2, 'bannerBlack', 1.6, 4);
  // fuera, al norte: el foso seco (lo que dejó el asedio está en level_keep.js)
}

// ------------------------------------------------------------------------ la torre-puerta
// Paso en recodo: de la calle se entra hacia el oeste bajo el rastrillo y
// las buhederas; al fondo hay que girar a la izquierda (al sur) y salir al
// patio por el arco de dentro. El que carga no puede hacerlo en línea recta.
function buildGate(ctx, S, L) {
  const wb = ctx.wb;
  const G = CASTLE.gate;
  const ph = G.ph;
  // planta: macizo salvo el paso
  S.paint(G.x0, G.z0, G.x1 - 3, G.z1, 0);
  W(S, -55.8, -1.4, -47.8, 1.4);
  W(S, -55.8, -1.4, -53, G.z1 + 0.6);
  // bloques de fábrica (con sus caras al paso)
  solid(ctx, 'wallstone', G.x0, 0, G.z0, G.x1, G.h, -1.4, { sub: 2.2, aoH: 3, faces: 'nswe' });
  solid(ctx, 'wallstone', -53, 0, 1.4, G.x1, G.h, G.z1, { sub: 2.2, aoH: 3, faces: 'nswe' });
  solid(ctx, 'wallstone', G.x0, 0, -1.4, -55.8, G.h, G.z1, { sub: 2.2, aoH: 3, faces: 'swe' });
  // sobre el paso: la bóveda (su cara de abajo) y lo macizo
  solid(ctx, 'wallstone', -55.8, ph, -1.4, -48.6, G.h, 1.4, { sub: 2.2, faces: 'b' });
  solid(ctx, 'wallstone', -55.8, ph, 1.4, -53, G.h, G.z1 - 0.6, { sub: 2.2, faces: 'b' });
  // arcos de fuera (a la calle) y de dentro (al patio), con sus dovelas
  // (hasta la cornisa: con su cara de arriba a la misma altura, parpadeaban)
  archWall(ctx, -1.4, 1.4, -48.6, -48, G.h - 0.5, 0, 2.8, ph, { axis: 'z', slices: 8 });
  archWall(ctx, -55.8, -53, G.z1 - 0.6, G.z1, G.h - 0.5, -54.4, 2.8, ph, { slices: 8 });
  // suelo del paso
  floor(ctx, -55.8, -1.4, -47.8, 1.4, 'flag', 0.02, { tint: [0.85, 0.83, 0.8] });
  floor(ctx, -55.8, 1.4, -53, G.z1 + 0.6, 'flag', 0.02, { tint: [0.85, 0.83, 0.8] });
  wb.box('ashlar', -49.8, 0.02, -1.4, -49.4, 0.07, 1.4, { faces: 'tnsew', ao: false });
  // rastrillo medio alzado en su ranura: las ranuras de las jambas, del
  // umbral a la bóveda, y los travesaños metidos en ellas (sin ellas el
  // rastrillo parecía colgado en el aire)
  for (const s of [-1, 1]) wb.box('black', -49.74, 0.07, s * 1.4 - (s > 0 ? 0.012 : 0), -49.46, ph, s * 1.4 + (s < 0 ? 0.012 : 0), { faces: s > 0 ? 'n' : 's', ao: false, grime: false });
  for (let z = -1.15; z <= 1.16; z += 0.46) wb.box('iron', -49.7, 2.7, z - 0.04, -49.5, ph, z + 0.04, { ao: false });
  for (let y = 2.9; y < ph; y += 0.5) wb.box('iron', -49.72, y, -1.4, -49.48, y + 0.07, 1.4, { ao: false, faces: 'tbew' });
  for (let z = -1.15; z <= 1.16; z += 0.46) wb.box('iron', -49.66, 2.4, z - 0.02, -49.54, 2.7, z + 0.02, { ao: false });
  // buhederas en la bóveda y saeteras a los lados del paso (al sur, sólo
  // donde hay muro: en x = -53,8 se abre el tramo que va al patio y la
  // saetera se quedaba flotando en el aire, en mitad del hueco)
  for (const x of [-51.4, -53.6]) wb.box('black', x - 0.3, ph - 0.02, -0.3, x + 0.3, ph - 0.01, 0.3, { faces: 'b', ao: false, grime: false });
  wb.box('black', -54.7, ph - 0.02, 2.9, -54.1, ph - 0.01, 3.5, { faces: 'b', ao: false, grime: false });
  for (const x of [-51.2, -53.8]) slit(ctx, x, 1.2, -1.4, 's');
  slit(ctx, -51.2, 1.2, 1.4, 'n');
  slit(ctx, -55.8, 1.2, 0, 'e');
  // las puertas de dentro: una hoja abierta contra el muro (colgada de sus
  // pernios junto al arco), la otra arrancada y tirada en el suelo. Son de
  // medio punto, como el arco (eran rectángulos): de 3 m en las jambas a
  // 4,4 en la clave
  {
    const R = 1.4,
      spring = ph - R;
    // (d: desde la bisagra, en la jamba)
    const hAt = (d) => spring + Math.sqrt(Math.max(0, R * R - (R - d) ** 2)) - 0.05;
    wb.push();
    wb.translate(-55.675, 0.02, 4.4);
    wb.rotateY(Math.PI / 2);
    P.archedLeaf(ctx, 1.33, hAt, { t: 0.15, tint: [0.7, 0.62, 0.55], straps: [0.6, 2.6] });
    wb.pop();
    // los pernios, en la jamba
    for (const y of [0.6, 2.6]) wb.box('iron', -55.8, y - 0.06, 4.3, -55.6, y + 0.14, 4.42, { ao: false });
    // la otra, tumbada en el suelo (la bisagra hacia el arco)
    wb.push();
    wb.translate(-52.6, 0.09, 7.0);
    wb.rotateY(0.5);
    wb.translate(-0.7, 0, 2.2);
    wb.rotateX(-Math.PI / 2);
    P.archedLeaf(ctx, 1.4, (x) => hAt(1.4 - x), { t: 0.14, tint: [0.62, 0.55, 0.5], straps: [1.0, 2.6] });
    wb.pop();
  }
  // la tranca, partida en dos, en el suelo junto a la hoja
  wb.at(-50.9, 0.0, 6.0, 1.25, () => {
    wb.box('wooddark', -1.05, 0, -0.08, -0.06, 0.16, 0.08, { ao: false });
    wb.push();
    wb.translate(0.02, 0, 0.05);
    wb.rotateY(0.45);
    wb.box('wooddark', 0, 0, -0.08, 0.95, 0.16, 0.08, { ao: false });
    wb.pop();
    // astillas en la rotura
    for (const [a, b] of [
      [-0.06, 0.04],
      [-0.1, -0.03],
    ])
      wb.box('wooddark', a, 0.02, b - 0.015, a + 0.16, 0.06, b + 0.015, { ao: false });
  });
  // lo alto: cornisa, almenas y el matacán sobre el arco de fuera
  wb.box('wallstone', G.x0 - 0.3, G.h - 0.5, G.z0 - 0.3, G.x1 + 0.3, G.h, G.z1 + 0.3, { ao: false, sub: 3, faces: 'tnsewb', mats: { t: 'flag' } });
  merlons(ctx, G.x0 - 0.3, G.z0, G.x1 + 0.3, G.z0, G.h, { collide: false });
  merlons(ctx, G.x0 - 0.3, G.z1, G.x1 + 0.3, G.z1, G.h, { collide: false });
  merlons(ctx, G.x0, G.z0 + 0.3, G.x0, G.z1 - 0.3, G.h, { collide: false });
  merlons(ctx, G.x1, G.z0 + 0.3, G.x1, -2.4, G.h, { collide: false });
  merlons(ctx, G.x1, 2.4, G.x1, G.z1 - 0.3, G.h, { collide: false });
  {
    const m0 = -2.4,
      m1 = 2.4;
    wb.box('wallstone', G.x1, G.h - 3.2, m0, G.x1 + 0.9, G.h + 1.0, m1, { sub: 2, faces: 'tnsewb' });
    for (let z = m0 + 0.3; z < m1; z += 1.2) {
      wb.box('ashlar', G.x1, G.h - 3.9, z - 0.18, G.x1 + 0.5, G.h - 3.2, z + 0.18, { ao: false });
      wb.box('ashlar', G.x1, G.h - 4.4, z - 0.14, G.x1 + 0.25, G.h - 3.9, z + 0.14, { ao: false });
    }
    merlons(ctx, G.x1 + 0.6, m0, G.x1 + 0.6, m1, G.h + 1.0, { collide: false, h: 0.9 });
  }
  for (let y = 6; y < G.h - 3; y += 3.4) {
    slit(ctx, G.x1, y, -4.6, 'e');
    slit(ctx, G.x1, y, 3.6, 'e');
    slit(ctx, -54.4, y, G.z1, 's');
  }
  P.banner(ctx, G.x1 + 0.12, 7.6, -4.6, Math.PI / 2, 'bannerBlack', 1.4, 3.4);
  P.banner(ctx, G.x1 + 0.12, 7.6, 3.6, Math.PI / 2, 'bannerBlack', 1.4, 3.4);
  // ante la puerta de dentro: la barricada apartada y caballos de frisa
  // (cerrando el paso a lo ancho, a los lados del camino de la puerta; el
  // brocal del pozo hace de un tramo de la barricada)
  P.cart(ctx, -52.8, 0, 11.2, 1.9, { tipped: true });
  P.barrel(ctx, -52.2, 0, 13.6, {});
  P.barrel(ctx, -53.3, 0, 14.4, { lying: true, rot: 0.6 });
  P.sacks(ctx, -58.6, 0, 9.4, 4, 4410);
  for (const [x, z, r] of [
    [-65.3, 11.0, Math.PI / 2 + 0.12],
    [-56.3, 11.6, Math.PI / 2 - 0.22],
  ])
    chevaux(ctx, x, z, r);
  P.pike(ctx, -51.8, 0, 6.4, { tilt: 0.1, skull: true });
  P.brazier(ctx, -59.8, 0, 4.4);
}

// Caballo de frisa: un madero tumbado atravesado por estacas aguzadas en aspa,
// que lo sostienen a media altura.
function chevaux(ctx, x, z, rot) {
  const wb = ctx.wb;
  // el madero (antes salía de pie y flotando: el cilindro iba a lo largo de y)
  wb.push();
  wb.translate(x, 0.6, z);
  wb.rotateY(rot);
  wb.rotateX(Math.PI / 2);
  wb.cylinder('wooddark', 0, -1.6, 0, 0.12, 0.12, 3.2, 6, { ao: false, capTop: true, capBot: true });
  wb.pop();
  const c = Math.cos(rot),
    s = Math.sin(rot);
  for (let i = 0; i < 5; i++) {
    const t = -1.3 + i * 0.65;
    const px = x + s * t,
      pz = z + c * t;
    for (const k of [-1, 1]) {
      const dx = c * k,
        dz = -s * k;
      const a = V(px - dx * 0.78, 0.02, pz - dz * 0.78),
        b = V(px + dx * 0.78, 1.18, pz + dz * 0.78);
      beam3(ctx, 'timber', a, b, 0.08);
      const dir = b.clone().sub(a).normalize();
      wb.geometry('timber', new THREE.ConeGeometry(0.058, 0.24, 4), new THREE.Matrix4().compose(b.clone().addScaledVector(dir, 0.12), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir), V(1, 1, 1)), { ao: false });
    }
  }
  P.colOBB(ctx, x, z, 0.78, 1.75, rot, 0, 1.15);
}

// ------------------------------------------------------------------------ el patio de armas
function buildYard(ctx, S, L, rng) {
  const wb = ctx.wb;
  const K = CASTLE.keep,
    G = CASTLE.gate,
    T = CASTLE.ptower;
  // suelo: tierra apisonada (sin pisar el de la torre-puerta ni el de la cárcel)
  for (const r of subtractRects(
    [-90, -20, -51, 20],
    [
      [-90, -20, K.x1, K.z1],
      [G.x0, G.z0, -51, G.z1 + 0.6],
      [T.x0, T.z0, T.x1, T.z1],
    ]
  ))
    floor(ctx, r[0], r[1], r[2], r[3], 'dirt');
  // enlosado del camino de la puerta a la torre y del pozo
  floor(ctx, -80, 6.4, -53, 8.2, 'flag', 0.02);
  floor(ctx, CASTLE.well.x - 1.8, 8.2, CASTLE.well.x + 1.8, CASTLE.well.z - 1.1, 'flag', 0.02);

  // --- la capilla (el altar del castillo), que acabó de hospital
  const croomC = 'castle_chapel';
  house(ctx, {
    x0: -60,
    z0: -20,
    x1: -52,
    z1: -14,
    front: 's',
    seed: 91,
    h: 6.2,
    style: 'stone',
    hollow: true,
    room: croomC,
    doors: [{ side: 's', x: -56, w: 1.4, h: 2.5 }],
    jetty: 0,
    lowerWindows: false,
    floorMat: 'flag',
    roofAxis: 'x',
  });
  wb.box('ashlar', -56.3, 6.2, -14.4, -55.7, 7.8, -13.9, { sub: 2 });
  wb.box('ashlar', -56.8, 7.2, -14.35, -55.2, 7.45, -13.95, { ao: false });
  wb.setRoom(croomC);
  P.candleAltar(ctx, -56, 0, -19.05, 0, croomC);
  P.candles(ctx, -59.3, 0, -19.3, 6, 71, { room: croomC, radius: 4.5, intensity: 0.9 });
  P.candles(ctx, -52.7, 0, -19.3, 6, 72, { room: croomC, radius: 4.5, intensity: 0.9 });
  // los heridos: jergones, vendas, una jofaina
  for (const [x, z, r, s] of [
    [-58.9, -16.0, 0, 1],
    [-53.1, -16.2, 0, 2],
    [-58.9, -17.8, 0, 3],
  ])
    pallet(ctx, x, 0, z, r + Math.PI / 2, 4460 + s, croomC);
  bakeCorpse(wb, -58.9, 0.15, -16.0, Math.PI / 2, 'back', 'soldier', 35);
  P.decal(ctx, -58.6, 0.01, -16.0, 1.4);
  for (let k = 0; k < 5; k++)
    wb.box('clothWhite', -54.4 + k * 0.12, 0.03, -15.3 + (k % 2) * 0.2, -54.3 + k * 0.12, 0.04, -14.9 + (k % 2) * 0.2, { ao: false, faces: 't', tint: [0.9, 0.7, 0.65], room: croomC });
  P.basket(ctx, -53.4, 0, -14.7, {});
  P.pew(ctx, -55.0, 0, -17.2, 2.0, 0.3, { tipped: true });
  P.chains(ctx, -52.7, 2.6, -17.2, 9, 0);
  bakeCorpse(wb, -55.6, 0, -15.1, 0.2, 'kneel', 'soldier', 5);
  wb.setRoom(null);
  P.banner(ctx, -57.9, 5.2, -13.9, 0, 'bannerBlack', 1.2, 2.6);
  P.banner(ctx, -54.1, 5.2, -13.9, 0, 'bannerBlack', 1.2, 2.6);
  L.interact.push({ kind: 'altar', id: 'a_castelo', name: 'Capilla de la guarnición', x: -56, y: 0, z: -19.05, spawn: [-56, 0, -17.3], yaw: 0 });

  // --- el cuartel de la tropa (contra la muralla sur)
  {
    const room = 'cuartel';
    house(ctx, {
      x0: -80,
      z0: 13,
      x1: -66,
      z1: 20,
      front: 'n',
      seed: 4470,
      h: 6.4,
      g1: 3.2,
      style: 'stone',
      hollow: true,
      room,
      doors: [{ side: 'n', x: -73, w: 1.5, h: 2.5 }],
      jetty: 0,
      lowerWindows: false,
      floorMat: 'planks',
      roofAxis: 'x',
    });
    wb.setRoom(room);
    // jergones a lo largo de los muros (unos treinta hombres dormían aquí)
    for (let x = -79.0; x < -66.5; x += 1.15) pallet(ctx, x, 0, 18.7, 0, Math.round(x * 13), room);
    for (const x of [-79.0, -77.85, -76.7, -69.3, -68.15, -67.0]) pallet(ctx, x, 0, 14.4, Math.PI, Math.round(x * 7), room);
    // la mesa larga con sus bancos
    P.table(ctx, -73, 0, 16.5, 4.4, 1.0, 0);
    P.bench(ctx, -73, 0, 15.75, 4.0, 0);
    P.bench(ctx, -73, 0, 17.25, 4.0, 0);
    for (const x of [-74.6, -73.4, -72.0]) P.jar(ctx, x, 0.82, 16.5 + (x % 2) * 0.2, 0.45);
    P.candles(ctx, -72.6, 0.82, 16.6, 3, 4471, { room, radius: 5, intensity: 1.0, spread: 0.2 });
    // lanzas y escudos de la tropa, sus hatos
    P.weaponRack(ctx, -66.5, 0, 16.5, -Math.PI / 2);
    P.weaponRack(ctx, -79.6, 0, 16.5, Math.PI / 2);
    for (const x of [-78.4, -76.6, -69.0, -67.4]) P.crate(ctx, x, 0, 17.2, 0.55, x * 0.3);
    P.hangingLamp(ctx, -73, 3.2 - 0.22, 16.5, { room, len: 0.7, radius: 7 });
    bakeCorpse(wb, -70.4, 0.15, 18.7, 0.3, 'curl', 'soldier', 36);
    P.decal(ctx, -70.6, 0.03, 18.2, 1.6);
    wb.setRoom(null);
  }

  // --- la fragua del armero y la cocina con su horno (cobertizos al sur)
  P.leanTo(ctx, -66, 15.6, -58.1, 20, 's', 4.6, 3.0);
  P.forge(ctx, -63.6, 0, 18.6, Math.PI);
  P.bellows(ctx, -65.3, 0, 18.7, Math.PI);
  P.anvil(ctx, -61.6, 0, 17.0, 0.3);
  P.trough(ctx, -59.4, 0, 18.9, 0, { len: 1.6 });
  P.coalPile(ctx, -65.2, 0, 16.8, 0.8);
  P.toolBoard(ctx, -61.6, 1.3, 19.9, Math.PI);
  P.ironBars(ctx, -60.4, 0, 16.6, 0.4);
  // la muela de afilar
  {
    const gx = -58.8,
      gz = 16.4;
    for (const s of [-1, 1]) wb.box('wooddark', gx - 0.08, 0, gz + s * 0.35 - 0.05, gx + 0.08, 0.8, gz + s * 0.35 + 0.05, { ao: false });
    wb.push();
    wb.translate(gx, 0.75, gz);
    wb.rotateX(Math.PI / 2);
    wb.cylinder('wallstone', 0, -0.1, 0, 0.42, 0.42, 0.2, 12, { ao: false, capTop: true, capBot: true });
    wb.pop();
    P.colOBB(ctx, gx, gz, 0.45, 0.45, 0, 0, 1.0);
  }
  P.leanTo(ctx, -57.9, 15.6, -52.5, 20, 's', 4.6, 3.0);
  P.breadOven(ctx, -55.2, 0, 18.4, Math.PI, { r: 1.2 });
  P.kneadTrough(ctx, -53.6, 0, 16.6, -Math.PI / 2);
  P.sacks(ctx, -57.2, 0, 16.4, 3, 4475);
  P.barrel(ctx, -52.9, 0, 19.2, {});
  P.barrel(ctx, -53.8, 0, 19.4, {});
  // la caldera de la tropa
  {
    const cx = -56.8,
      cz = 19.0;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      beam3(ctx, 'iron', V(cx + Math.cos(a) * 0.65, 0, cz + Math.sin(a) * 0.65), V(cx, 1.3, cz), 0.05);
    }
    wb.cylinder('iron', cx, 0.4, cz, 0.38, 0.46, 0.5, 10, { ao: false, capBot: true });
    ctx.col.add(cx - 0.55, 0, cz - 0.55, cx + 0.55, 1.0, cz + 0.55);
    if (ctx.fires) ctx.fires.push({ x: cx, y: 0.15, z: cz, s: 0.5 });
  }

  // --- las caballerizas (sin caballos: el día doce se los comieron)
  P.leanTo(ctx, -58.6, -14, -51, -7.4, 'e', 4.4, 3.0);
  for (const z of [-11.8, -9.6]) {
    wb.box('wooddark', -56.0, 0, z - 0.06, -51, 1.3, z + 0.06, { ao: false });
    ctx.col.add(-56.0, 0, z - 0.08, -51, 1.3, z + 0.08);
  }
  P.trough(ctx, -51.7, 0, -12.9, Math.PI / 2, { len: 1.6 });
  P.hay(ctx, -52.4, 0, -10.7, 0.1);
  P.deadHorse(ctx, -53.6, 0, -8.6, 0.4, {});
  P.decal(ctx, -54.0, 0.02, -8.6, 2.6);
  for (let z = -13.4; z < -8; z += 0.9) {
    const zz = z + 0.2;
    wb.box('burlap', -57.6 - 0.01, 2.0, zz - 0.01, -57.6 + 0.01, 2.95, zz + 0.01, { ao: false, tint: [0.7, 0.62, 0.5] });
    P.ellipsoid(ctx, 'flesh', -57.6, 1.75, zz, 0.16, 0.36, 0.1, [0.55, 0.36, 0.3]);
  }
  wb.box('wooddark', -58.4, 2.95, -13.8, -58.2, 3.1, -7.6, { ao: false, faces: 'nsewb' });

  // --- el pozo del aljibe y el fundíbulo partido
  P.well(ctx, CASTLE.well.x, 0, CASTLE.well.z, { deep: true });
  // (los toneles del agua, arrimados al brocal y no encima del camino)
  P.barrel(ctx, CASTLE.well.x + 1.62, 0, CASTLE.well.z - 0.55, {});
  P.barrel(ctx, CASTLE.well.x + 1.55, 0, CASTLE.well.z + 0.4, { lying: true, rot: 1.35 });
  trebuchet(ctx, -66.2, -9.2);
  // bolaños para el fundíbulo: piedras labradas a pico, de tamaños dispares y
  // amontonadas de cualquier manera, alguna rodada lejos y otra partida
  {
    const rr = new RNG(4480);
    const cx = -61.6,
      cz = -11.9;
    const ball = (x, y, z, r, k, sink = 0.05) =>
      P.roughStone(ctx, x, y, z, r, 4480 + k * 7, { detail: 2, k: 0.095, cuts: 4, cutMin: 0.8, cutMax: 0.95, freq: 2.4, scl: [1, rr.range(0.9, 0.97), rr.range(0.93, 1.02)], sink, uvScale: 1.0, tint: [0.92 + rr.range(-0.08, 0.08), 0.92, 0.9] });
    // corro de abajo: uno en medio y seis alrededor, tocándose
    const R0 = 0.29;
    const ring = [[0, 0]];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3 + rr.range(-0.12, 0.12);
      ring.push([Math.cos(a) * 2 * R0 * rr.range(1.0, 1.08), Math.sin(a) * 2 * R0 * rr.range(1.0, 1.08)]);
    }
    ring.forEach(([dx, dz], k) => ball(cx + dx, 0, cz + dz, R0 * rr.range(0.9, 1.1), k));
    // encima, en los huecos, y uno arriba del todo
    const up = [];
    for (const k of [1, 3, 5]) {
      const [ax, az] = ring[k],
        [bx, bz] = ring[(k % 6) + 1];
      const px = (ax + bx) / 3,
        pz = (az + bz) / 3;
      up.push([px, pz]);
      ball(cx + px, R0 * 1.55, cz + pz, R0 * rr.range(0.88, 1.0), 10 + k, 0);
    }
    ball(cx + rr.range(-0.05, 0.05), R0 * 3.05, cz + rr.range(-0.05, 0.05), R0 * 0.92, 20, 0);
    // rodados por el patio
    ball(cx + 1.5, 0, cz + 0.9, R0 * 1.05, 21);
    ball(cx - 1.1, 0, cz - 1.25, R0 * 0.85, 22);
    ball(cx + 0.6, 0, cz + 2.1, R0 * 1.12, 23);
    // y uno partido en dos
    for (const [s, dx] of [
      [1, -0.06],
      [-1, 0.12],
    ])
      P.roughStone(ctx, cx - 1.6 + dx, 0, cz + 0.7, R0, 4511, { detail: 2, k: 0.075, cuts: 2, cutMin: 0.88, cutMax: 0.96, freq: 2.4, planes: [[[s, 0.15, 0.1], 0]], rot: new THREE.Euler(0, s > 0 ? 0.3 : 2.9, s * 0.35), sink: 0.02, uvScale: 1.0 });
    ctx.col.add(cx - 0.9, 0, cz - 0.9, cx + 0.9, 1.0, cz + 0.9);
  }
  // el patio de armas: muñecos, dianas, carros, piedras de los de fuera
  P.dummy(ctx, -64.6, 0, 4.6, 0.3);
  P.dummy(ctx, -62.0, 0, 5.4, -0.4);
  P.target(ctx, -89.4, 0, 16.6, Math.PI / 2);
  P.target(ctx, -89.4, 0, 18.4, Math.PI / 2);
  P.siegeStone(ctx, -69.4, 0, -6.4, 0.5);
  P.siegeStone(ctx, -61.4, 0, -4.6, 0.42);
  P.siegeStone(ctx, -76.4, 0, 10.8, 0.48);
  P.arrows(ctx, -65, 0, -2, 8, 21);
  P.arrows(ctx, -77, 0, 12.2, 6, 22);
  P.dropped(ctx, -63.2, 0, 1.8, 0.7, 'sword');
  P.dropped(ctx, -67.4, 0, 3.9, 2.1, 'shield');
  P.dropped(ctx, -58.8, 0, -5.4, 1.2, 'helmet');
  P.dropped(ctx, -77.6, 0, 5.0, 0.3, 'spear');
  P.dropped(ctx, -60.5, 0, 2.6, 2.6, 'axe');
  // agua para los incendios
  for (const [x, z] of [
    [-80.45, 10.6],
    [-80.5, 11.45],
    [-70.2, -18.6],
  ])
    P.barrel(ctx, x, 0, z, {});
  P.basket(ctx, -80.3, 0, 12.5, { tipped: true, rot: 2 });
  P.brazier(ctx, -70, 0, -2.4);
  P.brazier(ctx, -56, 0, 3.8);
  P.brazier(ctx, -75.8, 0, 4.4);
  bakeCorpse(wb, -60, 0, -3, 1.2, 'back', 'soldier', 2);
  bakeCorpse(wb, -66.5, 0, 6.5, -0.8, 'face', 'soldier', 3);
  bakeCorpse(wb, -79.6, 0, 4.2, 2.2, 'face', 'villager', 5);
  bakeCorpse(wb, -52.6, 0, -2.8, 0.2, 'sit', 'soldier', 6);
  P.decal(ctx, -60, 0.02, -3, 2.5);
  P.decal(ctx, -66.5, 0.02, 6.5, 2.2);
  P.decal(ctx, -71, 0.02, 1, 1.8);
  P.fleshGrowth(ctx, -86.4, 0, 14.3, 1.0, 52, { climb: 1.2 });
  P.fleshGrowth(ctx, -51.5, 0, 13.0, 0.9, 53, { climb: 1.4 });
  P.gibbet(ctx, -60.6, 0, -3.4, 4.4);
  // vida: cuervos sobre los muertos y en la jaula
  ctx.crows.push({ x: -66.5, y: 0, z: 6.5, r: 1.5, n: 4 });
  ctx.crows.push({
    pts: [
      [-60.15, 4.9, -3.4],
      [-59.55, 4.9, -3.4],
    ],
    yaw: 0,
  });
  ctx.rats.push({ x: -54.4, y: 0, z: -9.0, n: 2 }, { x: -78.8, y: 0, z: 18.0, n: 2 });

  L.enemies.push(
    { type: 'penitent', x: -68, y: 0, z: 5, yaw: -1.2, idle: 'wander', id: 'e_patio1' },
    { type: 'penitent', x: -55.4, y: 0, z: -9.6, yaw: 0.5, idle: 'eat', id: 'e_patio2' },
    { type: 'soldier', x: -56.4, y: 0, z: 8.6, yaw: -Math.PI / 2, idle: 'stand', id: 'e_patio3' },
    { type: 'penitent', x: -74.8, y: 0, z: 16.4, yaw: 2.4, idle: 'kneel', id: 'e_patio4' }
  );
}

// El fundíbulo de la guarnición: bastidor, caballetes y el brazo partido
// (un tiro de los de fuera); el contrapeso, caído en el suelo. Tiraba hacia
// el norte, por encima de la muralla: u es la dirección del tiro (-z) y v,
// de través (x).
function trebuchet(ctx, cx, cz) {
  const wb = ctx.wb;
  const W3 = (u, y, v) => V(cx + v, y, cz - u);
  const box = (mat, u0, y0, v0, u1, y1, v1, o = {}) => wb.box(mat, cx + v0, y0, cz - u1, cx + v1, y1, cz - u0, { ao: false, ...o });
  const vA = -1.1,
    vB = 1.1;
  for (const v of [vA, vB]) box('timber', -4, 0, v - 0.17, 4, 0.36, v + 0.17, { faces: 'tnsew' });
  for (const u of [-3.6, 0, 3.6]) box('timber', u - 0.15, 0.36, vA - 0.3, u + 0.15, 0.62, vB + 0.3);
  for (const v of [vA, vB]) {
    beam3(ctx, 'timber', W3(-1.7, 0.36, v), W3(0, 5.4, v), 0.26);
    beam3(ctx, 'timber', W3(1.7, 0.36, v), W3(0, 5.4, v), 0.26);
    beam3(ctx, 'timber', W3(-1.2, 2.1, v), W3(1.2, 2.1, v), 0.16);
  }
  wb.push();
  wb.translate(cx, 5.3, cz);
  wb.rotateZ(Math.PI / 2);
  wb.cylinder('iron', 0, -1.35, 0, 0.12, 0.12, 2.7, 8, { ao: false, capTop: true, capBot: true });
  wb.pop();
  // el brazo: el cabo corto baja hacia el contrapeso; el largo, partido
  const piv = W3(0, 5.3, 0);
  const dir = W3(1, 0.86, 0)
    .sub(W3(0, 0, 0))
    .normalize();
  const shortEnd = piv.clone().addScaledVector(dir, -2.4);
  const stub = piv.clone().addScaledVector(dir, 3.4);
  beam3(ctx, 'timber', shortEnd, stub, 0.32);
  for (let k = 0; k < 4; k++) beam3(ctx, 'timber', stub, stub.clone().add(W3(0.2 + k * 0.08, 0.35 - k * 0.12, (k - 1.5) * 0.08).sub(W3(0, 0, 0))), 0.06);
  // el trozo caído, con la honda
  const f0 = W3(5.0, 0.16, -1.2),
    f1 = W3(9.0, 0.18, 0.6);
  beam3(ctx, 'timber', f0, f1, 0.3);
  beam3(ctx, 'burlap', f1, W3(10.0, 0.04, 1.3), 0.04, { tint: [0.8, 0.7, 0.55] });
  P.colOBB(ctx, (f0.x + f1.x) / 2, (f0.z + f1.z) / 2, 0.25, f0.distanceTo(f1) / 2, -Math.atan2(f1.x - f0.x, f1.z - f0.z), 0, 0.4);
  // el contrapeso: un cajón de piedras colgado del cabo corto, en el suelo
  const cw = shortEnd;
  wb.box('planks', cw.x - 0.75, 0.0, cw.z - 0.8, cw.x + 0.75, 1.3, cw.z + 0.8, { ao: false, tint: [0.7, 0.62, 0.55] });
  for (const y of [0.3, 1.0]) wb.box('iron', cw.x - 0.77, y, cw.z - 0.82, cw.x + 0.77, y + 0.08, cw.z + 0.82, { ao: false });
  for (const sx of [-1, 1]) beam3(ctx, 'iron', V(cw.x + sx * 0.5, 1.3, cw.z), shortEnd.clone().add(V(sx * 0.12, 0, 0)), 0.05);
  ctx.col.add(cw.x - 0.75, 0, cw.z - 0.8, cw.x + 0.75, 1.3, cw.z + 0.8);
  // el bastidor estorba (no se pasa por encima)
  ctx.col.add(cx + vA - 0.3, 0, cz - 4, cx + vB + 0.3, 1.0, cz + 4);
}

// ------------------------------------------------------------------------ la torre de la cárcel
// En el patio, contra la muralla oeste: el cuerpo de guardia de la cárcel,
// con el hueco de la escalera de las mazmorras de cara a la puerta (se sube
// y se sale de frente; se entra y se baja de frente) y, por una trampilla,
// la sala de los guardas.
function buildPrisonTower(ctx, S, L) {
  const wb = ctx.wb;
  const T = CASTLE.ptower;
  const { x0, x1, z0, z1, t, h } = T;
  const ix0 = x0 + t,
    ix1 = x1 - t,
    iz0 = z0 + t,
    iz1 = z1 - t;
  const room = 'torre_carcel',
    roomA = 'torre_carcel_alta';
  const dz0 = 7.3,
    dz1 = 8.7;
  S.paint(x0, z0, x1, z1, 0);
  W(S, ix0, iz0, ix1, iz1);
  W(S, ix1, dz0, x1 + 0.6, dz1);
  // techo de abajo, suelo y techo de la sala de arriba
  const F = 4.0,
    FA = F + 0.4,
    CA = 8.0;
  holedWall(ctx, 'wallstone', 'x', x0, x1, z0, iz0, 0, h, [], 'nwe');
  holedWall(ctx, 'wallstone', 'x', x0, x1, iz1, z1, 0, h, [], 'swe');
  holedWall(ctx, 'wallstone', 'z', iz0, iz1, x0, ix0, 0, h, [], 'w');
  holedWall(ctx, 'wallstone', 'z', iz0, iz1, ix1, x1, 0, h, [{ a0: dz0, a1: dz1, y0: 0, y1: 2.4 }], 'e');
  const inner = { wall: 'wallstone', t: 0.15, floor: false, ceil: false, beams: false, skirting: false };
  interiorRoom(ctx, ix0, iz0, ix1, iz1, 0, F, { ...inner, room, tint: [0.66, 0.64, 0.6], doors: [{ side: 'e', at: (dz0 + dz1) / 2, w: dz1 - dz0, h: 2.4 }] });
  interiorRoom(ctx, ix0, iz0, ix1, iz1, FA, CA - FA, { ...inner, room: roomA, tint: [0.7, 0.68, 0.64] });
  // el forjado entre las dos plantas, con el hueco de la trampilla
  const HT = CASTLE.ptHatch;
  const hh = [HT.x - 0.62, HT.z - 0.62, HT.x + 0.62, HT.z + 0.62];
  for (const r of subtractRects([ix0, iz0, ix1, iz1], [hh])) {
    wb.box('wooddark', r[0], F, r[1], r[2], F + 0.05, r[3], { faces: 'b', ao: false, room, tint: [0.6, 0.55, 0.5] });
    wb.box('planks', r[0], FA - 0.05, r[1], r[2], FA, r[3], { faces: 't', ao: false, room: roomA, uv: 0.7 });
    ctx.col.add(r[0], F, r[1], r[2], FA, r[3]).cam = true;
  }
  // (por el hueco se ve, pero no se cae nadie: se sube y se baja por la escalera)
  ctx.col.add(hh[0], F, hh[1], hh[2], FA, hh[3]).cam = true;
  wb.box('wooddark', hh[0] - 0.02, F, hh[1], hh[0], FA, hh[3], { faces: 'e', ao: false, room });
  wb.box('wooddark', hh[2], F, hh[1], hh[2] + 0.02, FA, hh[3], { faces: 'w', ao: false, room });
  wb.box('wooddark', hh[0], F, hh[1] - 0.02, hh[2], FA, hh[1], { faces: 's', ao: false, room });
  wb.box('wooddark', hh[0], F, hh[3], hh[2], FA, hh[3] + 0.02, { faces: 'n', ao: false, room });
  // vigas (cortadas en el hueco, con un brochal a cada lado)
  for (let x = ix0 + 0.9; x < ix1 - 0.4; x += 1.4) {
    const segs = x + 0.12 > hh[0] && x - 0.12 < hh[2] ? [[iz0, hh[1] - 0.12], [hh[3] + 0.12, iz1]] : [[iz0, iz1]];
    for (const [za, zb] of segs) wb.box('timber', x - 0.12, F - 0.25, za, x + 0.12, F, zb, { ao: false, faces: 'nsewb', room });
  }
  // (los brochales acaban dentro de la vigueta de al lado, algo menos
  // hondos que ella: sin caras que coincidan)
  for (const z of [hh[1] - 0.12, hh[3]]) wb.box('timber', hh[0] - 0.28, F - 0.24, z, hh[2] + 0.38, F, z + 0.12, { ao: false, faces: 'nsewb', room });
  // el techo de la sala de arriba y lo macizo encima
  wb.box('wooddark', ix0, CA, iz0, ix1, CA + 0.05, iz1, { faces: 'b', ao: false, room: roomA, tint: [0.6, 0.55, 0.5] });
  for (let x = ix0 + 0.9; x < ix1 - 0.4; x += 1.4) wb.box('timber', x - 0.12, CA - 0.25, iz0, x + 0.12, CA, iz1, { ao: false, faces: 'nsewb', room: roomA });
  solid(ctx, 'wallstone', ix0, CA, iz0, ix1, h, iz1, { faces: '', collide: true }).cam = true;
  // lo alto
  wb.box('wallstone', x0 - 0.3, h - 0.5, z0 - 0.3, x1 + 0.3, h, z1 + 0.3, { ao: false, sub: 3, faces: 'tnsewb', mats: { t: 'flag' } });
  wb.box('flag', x0, h, z0, x1, h + 0.01, z1, { ao: false, faces: 't' });
  merlons(ctx, x0 - 0.3, z0, x1 + 0.3, z0, h, { collide: false });
  merlons(ctx, x0 - 0.3, z1, x1 + 0.3, z1, h, { collide: false });
  merlons(ctx, x1, z0 + 0.3, x1, z1 - 0.3, h, { collide: false });
  for (let y = 5; y < h - 2; y += 3.4) {
    slit(ctx, x1, y, 10.5, 'e');
    slit(ctx, (x0 + x1) / 2, y, z0, 'n');
    slit(ctx, (x0 + x1) / 2, y, z1, 's');
  }
  // (las saeteras de la sala de arriba, también por dentro)
  const sx = (x0 + x1) / 2;
  wb.box('black', sx - 0.12, 5.0, iz0, sx + 0.12, 6.2, iz0 + 0.01, { ao: false, faces: 's', grime: false, room: roomA });
  wb.box('black', sx - 0.12, 5.0, iz1 - 0.01, sx + 0.12, 6.2, iz1, { ao: false, faces: 'n', grime: false, room: roomA });
  wb.box('black', ix1 - 0.01, 5.0, 10.38, ix1, 6.2, 10.62, { ao: false, faces: 'w', grime: false, room: roomA });
  // el suelo, con el hueco de la escalera de las mazmorras: sube hacia el
  // este, de cara a la puerta de la torre
  const hole = [-89, PSTAIR.z0, PSTAIR.x1, PSTAIR.z1];
  for (const r of subtractRects([ix0, iz0, ix1, iz1], [hole])) wb.box('flag', r[0], -0.1, r[1], r[2], 0, r[3], { faces: 't', ao: false, room, uv: 0.6 });
  ctx.floorHoles.push(hole);
  // (y bajo los muros, donde la escalera arranca: que la losa no estorbe)
  ctx.floorHoles.push([PSTAIR.x0 - 2, PSTAIR.z0, -89, 13]);
  // pretiles a los dos lados del hueco (se baja y se sube de frente)
  parapet(ctx, -89, hole[1] - 0.25, hole[2], hole[1], 0, 0.9, { room });
  parapet(ctx, -89, hole[3], hole[2], hole[3] + 0.25, 0, 0.9, { room });
  // el cuerpo de guardia: la mesa del registro, el clavijero de las llaves
  wb.setRoom(room);
  P.table(ctx, -87.2, 0, 11.6, 1.6, 0.8, 0);
  P.stool(ctx, -87.2, 0, 10.8, { room });
  P.candles(ctx, -86.8, 0.82, 11.5, 3, 4490, { room, radius: 4.5, intensity: 1.0, spread: 0.15 });
  wb.box('planks', -88.95, 1.3, 10.3, -88.9, 2.0, 11.9, { ao: false, room, tint: [0.62, 0.55, 0.48] });
  for (let z = 10.5; z < 11.8; z += 0.3) wb.box('iron', -88.9, 1.55, z - 0.02, -88.75, 1.62, z + 0.02, { ao: false, room });
  P.weaponRack(ctx, -86.6, 0, iz0 + 0.3, 0);
  P.barrel(ctx, -88.4, 0, 12.5, {});
  // la escalera de mano a la trampilla de la sala de los guardas
  P.ladder(ctx, HT.x + 0.62, 0, HT.z, F - 0.05, -Math.PI / 2, 0.1);
  bakeCorpse(wb, -84.6, 0, 10.6, -2.4, 'back', 'soldier', 37);
  P.decal(ctx, -84.6, 0.01, 10.6, 1.8);
  P.wallTorch(ctx, ix0, 2.2, 10.2, 'e', { room, radius: 6 });
  P.wallTorch(ctx, -84.8, 1.8, iz1, 'n', { room, radius: 5, intensity: 0.8 });
  wb.setRoom(null);
  // la sala de los guardas: sus jergones, la mesa con el libro de presos,
  // el arcón, la ballesta colgada y las saeteras
  wb.setRoom(roomA);
  pallet(ctx, -88.3, FA, 6.4, 0, 4491, roomA);
  pallet(ctx, -88.3, FA, 9.0, 0, 4492, roomA);
  P.table(ctx, -85.4, FA, 6.0, 1.4, 0.8, 0);
  P.stool(ctx, -85.4, FA, 6.8, { room: roomA });
  wb.at(-85.5, FA + 0.8, 5.95, 0.2, () => {
    wb.box('leather', -0.24, 0, -0.17, 0.24, 0.04, 0.17, { ao: false, room: roomA, tint: [0.6, 0.45, 0.35] });
    wb.box('clothWhite', -0.22, 0.04, -0.15, 0.22, 0.055, 0.15, { ao: false, faces: 't', room: roomA, tint: [0.88, 0.8, 0.6] });
  });
  P.candles(ctx, -84.9, FA + 0.8, 5.8, 2, 4493, { room: roomA, radius: 4.5, intensity: 1.0, spread: 0.1 });
  wb.box('wooddark', -88.9, FA, 11.8, -87.7, FA + 0.6, 12.5, { ao: false, room: roomA });
  wb.box('iron', -88.92, FA + 0.28, 11.78, -87.68, FA + 0.34, 12.52, { ao: false, room: roomA });
  ctx.col.add(-88.9, FA, 11.8, -87.7, FA + 0.6, 12.5);
  wb.box('planks', -84.2, FA + 1.2, iz0, -82.8, FA + 2.1, iz0 + 0.05, { ao: false, room: roomA, tint: [0.62, 0.55, 0.48] });
  beam3(ctx, 'wooddark', V(-83.9, FA + 1.65, iz0 + 0.1), V(-83.1, FA + 1.65, iz0 + 0.1), 0.06, { room: roomA });
  beam3(ctx, 'wooddark', V(-83.5, FA + 1.3, iz0 + 0.1), V(-83.5, FA + 2.0, iz0 + 0.1), 0.07, { room: roomA });
  P.hangingLamp(ctx, -86.0, CA - 0.25, 9.6, { room: roomA, len: 0.7, radius: 6 });
  P.wallTorch(ctx, -87.6, FA + 1.9, iz1, 'n', { room: roomA, radius: 5 });
  wb.setRoom(null);
  P.banner(ctx, x1 + 0.12, 8.6, 9, Math.PI / 2, 'bannerBlack', 1.3, 3.2);
  L.interact.push(
    {
      kind: 'door',
      id: 'd_carcel',
      x: (ix1 + x1) / 2,
      y: 0,
      z: (dz0 + dz1) / 2,
      w: dz1 - dz0,
      h: 2.4,
      axis: 'z',
      lock: { type: 'none' },
      mat: 'planks',
      hinge: -1,
      swing: 1,
      plane: x1 - 0.05,
    },
    // (la trampilla está abierta: sólo hay que subir o bajar por la escalera;
    // abajo se llega de lado a la escalera, para que la cámara no quede tras ella)
    { kind: 'hatch', id: 'h_carcel_abajo', end: 'bottom', flag: 'hatch:carcel', open: true, msgUp: 'carcelSube', x: HT.x - 0.45, y: 0, z: HT.z, r: 1.5, to: [HT.x - 1.1, FA, HT.z, -Math.PI / 2] },
    { kind: 'hatch', id: 'h_carcel_arriba', end: 'top', flag: 'hatch:carcel', open: true, realHole: true, msgDown: 'carcelBaja', x: HT.x, y: FA, z: HT.z, r: 1.6, to: [HT.x - 0.7, 0, HT.z - 1.1, -Math.PI / 2 + 0.4] },
    { kind: 'examine', id: 'x_presos', text: 'libroPresos', x: -85.5, y: FA, z: 6.6, r: 1.6 }
  );
}

// ------------------------------------------------------------------------ las mazmorras
// Regiones (rectángulos en la rejilla de 0,5 m): suelo, techo (la clave, si
// lleva bóveda), material de los muros y sala (para la luz). Los muros se
// levantan solos donde lo transitable linda con la roca (y los dinteles,
// donde el techo baja), con los huecos de los nichos. Encima: bóvedas de
// cañón, arcos fajones sobre pilastras, portadas de arco en los pasos.

// La escalera de la torre de la cárcel: sube hacia el este, de cara a la
// puerta de la torre (antes subía contra el muro y había que salir de lado).
// Arranca bajo la muralla, en un rellano que da al pasadizo.
export const PSTAIR = { x0: -90.5, x1: -84.0, z0: 7, z1: 9, n: 16 };

function buildDungeon(ctx, D, L) {
  const wb = ctx.wb;
  const R = (x0, z0, x1, z1, y1, mat, room, o = {}) => ({
    x0,
    z0,
    x1,
    z1,
    y0: o.y0 ?? YD,
    y1,
    mat,
    room,
    tint: o.tint,
    floorMat: o.floorMat ?? 'flag',
    ceilMat: o.ceilMat,
    noFloor: o.noFloor,
    noCeil: o.noCeil,
    vault: o.vault,
    uv: o.uv,
  });
  const mazT = [0.62, 0.6, 0.57],
    catT = [0.6, 0.62, 0.56],
    torT = [0.6, 0.55, 0.52],
    aljT = [0.62, 0.64, 0.62];
  // galerías de 2 m de luz con bóveda de medio punto: arranque y clave
  const SG = YD + 2.35,
    CR = YD + 3.35;
  const gv = (axis) => ({ axis, ys: SG });
  const AJ = ALJIBE;
  const BJ = BAJADA;
  const regs = [
    // el pasillo de las celdas y las celdas
    R(-89, -18, -75.5, -6, YD + 3.8, 'wallstone', 'mazmorra', { tint: mazT }),
    // la bajada de la torre del homenaje (level_torre.js): el pasadizo hasta
    // el tapiado del fondo del pasillo de las celdas, su rellano (abierto por
    // arriba, al hueco de la escalera) y el hueco de la escalera
    R(BJ.rellano[0], BJ.rellano[1], BJ.rellano[2], BJ.rellano[3], YD + 2.4, 'wallstone', 'bajada', { tint: mazT }),
    R(BJ.norte[0], BJ.norte[1], BJ.norte[2], BJ.norte[3], YD + 2.4, 'wallstone', 'bajada', { tint: mazT }),
    R(BJ.este[0], BJ.este[1], BJ.este[2], BJ.este[3], YD + 2.4, 'wallstone', 'bajada', { tint: mazT }),
    R(BJ.stair.x0, BJ.stair.top, BJ.stair.x1, BJ.stair.bottom, 0, 'wallstone', 'bajada', { tint: mazT, noFloor: true, noCeil: true }),
    R(-75.5, -12.5, -75, -11.5, YD + 2.8, 'wallstone', 'mazmorra', { tint: mazT }),
    // el cuarto del carcelero
    R(-75, -15, -67, -8.5, YD + 3.8, 'wallstone', 'mazmorra', { tint: mazT, vault: { axis: 'x', ys: YD + 2.5, rise: 1.25 } }),
    // la sala del tormento
    R(-67, -12, -66.5, -11, YD + 2.8, 'wallstone', 'tormento', { tint: mazT }),
    R(-66.5, -14, -61, -9, YD + 3.65, 'wallstone', 'tormento', { tint: torT, vault: { axis: 'z', ys: YD + 2.4, rise: 1.2 } }),
    // la bajada a las catacumbas
    R(-72, -8.5, -70, -1, CR, 'mossstone', 'catacumbas', { tint: catT, vault: gv('z') }),
    // las catacumbas: galería principal, tres travesías, la del sur (con un
    // arcosolio) y el osario
    R(-84, -1, -60, 1, CR, 'mossstone', 'catacumbas', { tint: catT, vault: gv('x') }),
    R(-82, 1, -80, 4, CR, 'mossstone', 'catacumbas', { tint: catT, vault: gv('z') }),
    R(-72, 1, -70, 4, CR, 'mossstone', 'catacumbas', { tint: catT, vault: gv('z') }),
    R(-62, 1, -60, 4, CR, 'mossstone', 'catacumbas', { tint: catT, vault: gv('z') }),
    R(-82, 4, -60, 6, CR, 'mossstone', 'catacumbas', { tint: catT, vault: gv('x') }),
    R(-77.5, 6, -75.0, 7.5, YD + 2.6, 'mossstone', 'catacumbas', { tint: catT, vault: { axis: 'x', ys: YD + 1.4, rise: 1.0 } }),
    // el rellano y el osario de la Hermandad (más hondo, con su escalera)
    R(OSARIO_C.x1, -1, -84, 1, CR, 'mossstone', 'catacumbas', { tint: catT, vault: gv('x') }),
    R(OSARIO_C.x0, -OSARIO_C.z, OSARIO_C.x1, OSARIO_C.z, OSARIO_C.top, 'femurs', 'osario_castillo', {
      y0: OSARIO_C.y,
      tint: [0.8, 0.76, 0.7],
      vault: { axis: 'x', ys: OSARIO_C.y + 2.45, rise: OSARIO_C.top - 0.1 - (OSARIO_C.y + 2.45), mat: 'plaster', tint: [0.62, 0.58, 0.52] },
    }),
    // al aljibe
    R(-66, 6, -64, AJ.zs[0], CR, 'mossstone', 'aljibe', { tint: catT, vault: gv('z') }),
    // el aljibe: el andén (al norte y a poniente) y el estanque; sus muros
    // suben hasta las claves (lo de encima de cada arco de la bóveda, en los
    // muros, es su luneto)
    R(AJ.xs[0], AJ.zs[0], AJ.xs[5], AJ.walkN, AJ.ys + AJ.rise, 'ashlar', 'aljibe', { tint: aljT, noCeil: true }),
    R(AJ.xs[0], AJ.walkN, AJ.walkW, AJ.zs[3], AJ.ys + AJ.rise, 'ashlar', 'aljibe', { tint: aljT, noCeil: true }),
    R(AJ.walkW, AJ.walkN, AJ.xs[5], AJ.zs[3], AJ.ys + AJ.rise, 'ashlar', 'aljibe', { y0: AJ.floor, tint: [0.52, 0.55, 0.55], floorMat: 'mossstone', noCeil: true }),
    // el pasadizo, el rellano bajo la muralla y la escalera de la torre
    R(PSTAIR.x0, 11, AJ.xs[0], 13, CR, 'wallstone', 'mazmorra', { tint: mazT, vault: gv('x') }),
    R(PSTAIR.x0 - 2, 7, PSTAIR.x0, 13, -1.0, 'wallstone', 'mazmorra', { tint: mazT }),
    R(PSTAIR.x0, 7, -89, 9, -1.0, 'wallstone', 'mazmorra', { tint: mazT, noFloor: true }),
    R(-89, 7, PSTAIR.x1, 9, 0, 'wallstone', 'mazmorra', { tint: mazT, noFloor: true, noCeil: true }),
  ];
  for (const r of regs) D.paint(r.x0, r.z0, r.x1, r.z1, 1);

  // --- nichos de las catacumbas (lóculos) y celdas de castigo: huecos en
  // los muros con su hondura detrás (antes, un marco pegado al muro y los
  // huesos al aire, por fuera de la repisa)
  const holes = [];
  const niches = [];
  // plane 'z': muro en z = line (a lo largo de x); face: hacia dónde mira el
  // muro (+1: hacia +z). depth: lo que se mete en la roca.
  const addNiche = (plane, line, face, a0, a1, y0, y1, depth, kind, room) => {
    holes.push({ plane, line, a0, a1, y0, y1 });
    niches.push({ plane, line, face, a0, a1, y0, y1, depth, kind, room });
  };
  const rng = new RNG(4500);
  const nicheKind = () => {
    const r = rng.next();
    return r < 0.6 ? 'open' : r < 0.85 ? 'sealed' : 'broken';
  };
  // en cada tramo entre pilastras, dos alturas de lóculos
  const bays = (wallZ, face, cuts, skip, room) => {
    for (let k = 0; k + 1 < cuts.length; k++) {
      const a = cuts[k] + 0.34,
        b = cuts[k + 1] - 0.34;
      if (b - a < 1.2) continue;
      const mid = (a + b) / 2;
      if (skip.some(([s0, s1]) => mid > s0 && mid < s1)) continue;
      const hw = Math.min(0.92, (b - a) / 2);
      for (const [y0, y1] of [
        [YD + 0.42, YD + 1.02],
        [YD + 1.32, YD + 1.92],
      ]) {
        const kind = nicheKind();
        if (kind === 'sealed') niches.push({ plane: 'z', line: wallZ, face, a0: mid - hw, a1: mid + hw, y0, y1, kind, room });
        else addNiche('z', wallZ, face, mid - hw, mid + hw, y0, y1, 0.62, kind, room);
      }
    }
  };
  // galería principal (fajones en estas x) y galería del sur
  const FM = [-82.25, -79.75, -77.1, -74.5, -72.25, -69.75, -67.1, -64.5, -62.25];
  const FS = [-79.75, -77.82, -74.98, -72.25, -69.75, -66.25, -63.75, -62.25];
  bays(-1, 1, [-84, ...FM, -60], [[-72.3, -69.7]], 'catacumbas');
  bays(1, -1, [-84, ...FM, -60], [[-82.3, -79.7], [-72.3, -69.7], [-62.3, -60]], 'catacumbas');
  bays(4, 1, [-82, ...FS, -60], [[-82, -79.7], [-72.3, -69.7], [-63.8, -60]], 'catacumbas');
  bays(6, -1, [-82, ...FS, -60], [[-82, -79.7], [-77.9, -74.9], [-66.3, -63.7], [-63.8, -62.2]], 'catacumbas');
  // celdas de castigo en el pasadizo: huecos hasta el suelo, con reja
  for (const x of [-82.8, -76.8]) addNiche('z', 13, -1, x - 0.6, x + 0.6, YD, YD + 1.9, 0.95, 'cell', 'mazmorra');

  dungeonWalls(ctx, D, regs, holes);
  // los cruces: donde una galería abovedada desemboca de lado en otra (de la
  // misma luz y con el mismo arranque), el tramo del cruce lleva bóveda de
  // arista y el cañón de la que llega sigue hasta las aristas. Antes las dos
  // bóvedas se quedaban a medias en la junta: la de la galería de paso tapaba
  // la boca de la otra vista desde dentro (sólo tiene cara hacia abajo) y,
  // vista desde la travesía, se veía a través de ella, al vacío.
  const crossings = [];
  const CI = 0.03; // (el retranqueo de las bóvedas en los muros, el de barrelVault)
  const plainVault = (r) => r.vault && r.vault.rise === undefined && !r.vault.mat;
  for (const A of regs) {
    if (!plainVault(A)) continue;
    const ax = A.vault.axis === 'x';
    for (const B of regs) {
      if (B === A || !plainVault(B) || B.vault.axis === A.vault.axis || B.vault.ys !== A.vault.ys) continue;
      // A sigue a lo largo de la junta; B llega de lado
      const [a0, a1, b0, b1] = ax ? [A.x0, A.x1, B.x0, B.x1] : [A.z0, A.z1, B.z0, B.z1];
      const [t0, t1, s0, s1] = ax ? [A.z0, A.z1, B.z0, B.z1] : [A.x0, A.x1, B.x0, B.x1];
      if (b0 < a0 - 1e-6 || b1 > a1 + 1e-6 || Math.abs(b1 - b0 - (t1 - t0)) > 1e-6) continue;
      const side = Math.abs(s1 - t0) < 1e-6 ? -1 : Math.abs(s0 - t1) < 1e-6 ? 1 : 0;
      if (!side) continue;
      let c = crossings.find((q) => q.A === A && Math.abs(q.a0 - b0) < 1e-6);
      if (!c) crossings.push((c = { A, a0: b0, a1: b1, sides: new Set() }));
      c.sides.add(side);
      // (y el cañón de B entra hasta el borde del tramo)
      if (side < 0) B.extHi = true;
      else B.extLo = true;
    }
  }
  const vaultTint = (r) => r.vault.tint ?? (r.tint ?? mazT).map((c) => c * 0.82);
  for (const r of regs) {
    if (!r.noFloor) {
      wb.box(r.floorMat, r.x0, r.y0 - 0.3, r.z0, r.x1, r.y0, r.z1, { faces: 't', ao: false, room: r.room, uv: 0.6, tint: r.tint ? r.tint.map((v) => v * 1.15) : null });
      ctx.col.add(r.x0, r.y0 - 1, r.z0, r.x1, r.y0, r.z1);
    }
    if (!r.noCeil) {
      // (con bóveda, el techo plano queda oculto: sólo su colisión)
      if (!r.vault) wb.box(r.ceilMat ?? r.mat, r.x0, r.y1, r.z0, r.x1, r.y1 + 0.3, r.z1, { faces: 'b', ao: false, room: r.room, tint: r.tint ? r.tint.map((v) => v * 0.8) : [0.6, 0.6, 0.6] });
      ctx.col.add(r.x0, r.y1, r.z0, r.x1, r.y1 + 0.3, r.z1).cam = true;
    }
    if (r.vault) {
      const v = r.vault;
      const ax = v.axis === 'x';
      // (con los mismos tramos que la de arista de sus cruces: par)
      const crossed = r.extLo || r.extHi || crossings.some((q) => q.A === r);
      const n = crossed ? 2 * Math.max(3, Math.round((Math.PI * ((ax ? r.z1 - r.z0 : r.x1 - r.x0) / 2 - CI)) / 0.8)) : undefined;
      const base = { axis: v.axis, ys: v.ys, rise: v.rise, mat: v.mat ?? r.mat, tint: vaultTint(r), room: r.room, n };
      let [s0, s1] = ax ? [r.x0, r.x1] : [r.z0, r.z1];
      if (r.extLo) s0 -= CI;
      if (r.extHi) s1 += CI;
      // (partido por los tramos de sus cruces)
      let cur = s0;
      for (const c of [...crossings.filter((q) => q.A === r).sort((p, q) => p.a0 - q.a0), null]) {
        const end = c ? c.a0 + CI : s1;
        if (end - cur > 0.05) barrelVault(ctx, { ...base, ...(ax ? { x0: cur, x1: end, z0: r.z0, z1: r.z1 } : { x0: r.x0, x1: r.x1, z0: cur, z1: end }) });
        if (c) cur = c.a1 - CI;
      }
    }
  }
  for (const c of crossings) {
    const A = c.A,
      ax = A.vault.axis === 'x';
    // (a muro, los lados por los que no llega otra galería)
    const walls = ax ? { n: !c.sides.has(-1), s: !c.sides.has(1), w: c.a0 <= A.x0 + 1e-6, e: c.a1 >= A.x1 - 1e-6 } : { w: !c.sides.has(-1), e: !c.sides.has(1), n: c.a0 <= A.z0 + 1e-6, s: c.a1 >= A.z1 - 1e-6 };
    const sq = ax ? { x0: c.a0, x1: c.a1, z0: A.z0, z1: A.z1 } : { x0: A.x0, x1: A.x1, z0: c.a0, z1: c.a1 };
    crossVault(ctx, { ...sq, ys: A.vault.ys, mat: A.mat, tint: vaultTint(A), room: A.room, walls, inset: CI });
  }

  // --- arcos: fajones sobre pilastras a lo largo de las galerías y
  // portadas de arco donde una galería entra en una sala
  const ARCH_T = [0.62, 0.62, 0.58];
  // fajón de una galería de luz 'span' (eje 'x' o 'z'), en 'at', con su
  // centro en 'c'; noA/noB: sin pilastra en el muro de menos / de más
  const fajon = (axis, at, c, span, ys, room, o = {}) => {
    const w = span - 0.36;
    archRing(ctx, { axis: axis === 'x' ? 'z' : 'x', c, w, y0: ys, rise: o.rise ?? w / 2, ring: 0.3, t0: at - 0.22, t1: at + 0.22, mat: 'ashlar', room, tint: ARCH_T, proud: 0.02 });
    const lo = c - span / 2,
      hi = c + span / 2;
    if (!o.noA) pilaster(ctx, lo, at, axis === 'x' ? 's' : 'e', o.y0 ?? YD, ys, { room, tint: ARCH_T });
    if (!o.noB) pilaster(ctx, hi, at, axis === 'x' ? 'n' : 'w', o.y0 ?? YD, ys, { room, tint: ARCH_T });
  };
  // portada en el plano 'line' de una galería de eje 'axis' que entra en una
  // sala de techo 'top'; inward: hacia dónde queda la galería (+1/-1)
  const portal = (axis, line, c, span, ys, top, inward, room, o = {}) => {
    const w = span - 0.24;
    archRing(ctx, {
      axis: axis === 'x' ? 'z' : 'x',
      c,
      w,
      y0: ys,
      rise: o.rise ?? w / 2,
      ring: 0.32,
      t0: line - 0.25,
      t1: line + 0.25,
      top,
      clip: [c - span / 2, c + span / 2],
      mat: 'ashlar',
      spMat: o.spMat ?? 'wallstone',
      rooms: o.rooms ?? [room, room],
      tint: ARCH_T,
      spTint: o.spTint ?? mazT,
      proud: 0.025,
    });
    const at = line + inward * 0.22;
    pilaster(ctx, c - span / 2, at, axis === 'x' ? 's' : 'e', YD, ys, { room, tint: ARCH_T, d: 0.13 });
    pilaster(ctx, c + span / 2, at, axis === 'x' ? 'n' : 'w', YD, ys, { room, tint: ARCH_T, d: 0.13 });
  };

  // --- las celdas: frentes de arco con su reja, bóvedas, tabiques
  {
    const room = 'mazmorra';
    wb.setRoom(room);
    const zN = -13.4,
      zS = -10.6;
    const cellsX = [-89, -85.8, -82.4, -79.0, -75.5];
    const yS = YD + 2.3,
      rise = 0.8,
      top = YD + 3.8;
    for (let k = 1; k < cellsX.length - 1; k++) {
      const x = cellsX[k];
      solid(ctx, 'wallstone', x - 0.2, YD, -18, x + 0.2, top, zN + 0.22, { sub: 1.6, room, tint: mazT });
      solid(ctx, 'wallstone', x - 0.2, YD, zS - 0.22, x + 0.2, top, -6, { sub: 1.6, room, tint: mazT });
    }
    // cada celda: arco rebajado en el frente, la reja debajo (que sigue el
    // arco y ahora para también la cámara) y su bóveda
    const cell = (xa, xb, z, face, open) => {
      const c = (xa + xb) / 2,
        w = xb - xa;
      const arc = archRing(ctx, { axis: 'x', c, w, y0: yS, rise, ring: 0.2, t0: z - 0.22, t1: z + 0.22, top, clip: [xa, xb], mat: 'ashlar', room, tint: [0.6, 0.58, 0.55], spTint: mazT, proud: 0.02 });
      const g0 = xa + 0.55,
        g1 = g0 + 1.1;
      for (let x = xa + 0.12; x < xb - 0.05; x += 0.22) {
        const yt = arc.yAt(x) - 0.02;
        if (open && x > g0 && x < g1) {
          // sobre la puerta de la reja, el resto de la reja hasta el arco
          wb.box('iron', x - 0.025, YD + 2.12, z - 0.05, x + 0.025, yt, z + 0.05, { ao: false, room });
          continue;
        }
        wb.box('iron', x - 0.025, YD, z - 0.05, x + 0.025, yt, z + 0.05, { ao: false, room });
      }
      wb.box('iron', xa, YD + 2.05, z - 0.07, xb, YD + 2.12, z + 0.07, { ao: false, room, faces: 'tnsewb' });
      wb.box('iron', xa, YD + 0.1, z - 0.07, xb, YD + 0.17, z + 0.07, { ao: false, room });
      const yc = yS + rise;
      if (open) {
        ctx.col.add(xa, YD, z - 0.08, g0, yc, z + 0.08);
        ctx.col.add(g1, YD, z - 0.08, xb, yc, z + 0.08);
        ctx.col.addCam(g0, YD + 2.05, z - 0.08, g1, yc, z + 0.08);
      } else ctx.col.add(xa, YD, z - 0.08, xb, yc, z + 0.08);
      // la bóveda de la celda, del fondo al arco
      const zb = face > 0 ? -18 : -6;
      const zf = z - face * 0.22;
      barrelVault(ctx, { x0: xa, z0: Math.min(zb, zf), x1: xb, z1: Math.max(zb, zf), axis: 'z', ys: yS, rise, mat: 'wallstone', tint: mazT.map((v) => v * 0.8), room, n: 8 });
      return [g0, g1];
    };
    const inner = (k) => [cellsX[k] + (k > 0 ? 0.2 : 0), cellsX[k + 1] - (k < cellsX.length - 2 ? 0.2 : 0)];
    // norte: la del jugador (reventada), dos cerradas y una abierta
    const [n1a] = cell(...inner(0), zN, 1, true);
    cell(...inner(1), zN, 1, false);
    cell(...inner(2), zN, 1, true);
    cell(...inner(3), zN, 1, false);
    // sur: abiertas la primera y la última (ahí está él, comiendo)
    cell(...inner(0), zS, -1, true);
    cell(...inner(1), zS, -1, false);
    cell(...inner(2), zS, -1, false);
    cell(...inner(3), zS, -1, true);
    // fajones a lo ancho del pasillo, sobre los tabiques
    for (let k = 1; k < cellsX.length - 1; k++) {
      const x = cellsX[k];
      // (un dedo más estrechos que el tabique: si no, sus caras coinciden)
      archRing(ctx, { axis: 'z', c: (zN + zS) / 2, w: zS - zN - 0.44, y0: yS, rise: 1.0, ring: 0.25, t0: x - 0.19, t1: x + 0.19, top, clip: [zN + 0.22 - 0.25, zS - 0.22 + 0.25], mat: 'ashlar', room, tint: [0.6, 0.58, 0.55], spTint: mazT, proud: 0.02 });
    }
    // la reja de la celda del jugador, reventada hacia fuera
    wb.push();
    wb.translate(n1a, YD, zN + 0.05);
    wb.rotateY(-1.9);
    for (let x = 0.08; x < 1.1; x += 0.22) wb.box('iron', x - 0.025, 0.05, -0.03, x + 0.025, 1.95, 0.03, { ao: false, room });
    wb.box('iron', 0, 1.85, -0.04, 1.1, 1.95, 0.04, { ao: false, room });
    wb.box('iron', 0, 0.1, -0.04, 1.1, 0.2, 0.04, { ao: false, room });
    wb.pop();
    // la puerta de la tercera del sur, arrancada en el pasillo
    wb.push();
    wb.translate(-80.6, YD + 0.06, -11.6);
    wb.rotateY(0.3);
    for (let x = 0.08; x < 1.1; x += 0.22) wb.box('iron', x - 0.025, 0, -0.03, x + 0.025, 0.05, 1.95, { ao: false, room });
    wb.pop();
    // jergones de paja, cadenas en los muros, presos muertos
    for (const [x, z] of [
      [-88.0, -17.4],
      [-84.6, -17.4],
      [-81.2, -17.4],
      [-77.8, -17.4],
      [-88.0, -6.6],
      [-84.6, -6.6],
      [-81.2, -6.6],
      [-77.8, -6.6],
    ])
      wb.box('straw', x - 0.4, YD, z - 0.5, x + 1.5, YD + 0.22, z + 0.5, { faces: 'tnsew', ao: false, room });
    for (const [x, z] of [
      [-88.8, -16.0],
      [-85.4, -16.5],
      [-82.0, -16.0],
      [-78.6, -16.0],
      [-88.8, -8.0],
      [-82.0, -8.4],
    ])
      for (let k = 0; k < 6; k++) wb.box('iron', x, YD + 1.5 - k * 0.12, z, x + 0.06, YD + 1.6 - k * 0.12, z + 0.06, { ao: false, room });
    bakeCorpse(wb, -84.2, YD, -16.4, 0.5, 'curl', 'villager', 7);
    bakeCorpse(wb, -80.2, YD, -7.6, 2.6, 'back', 'villager', 38);
    // un preso que nadie sacó: los huesos sobre su jergón
    P.skeleton(ctx, -77.4, YD + 0.22, -17.3, Math.PI, { mess: 0.45, seed: 4511, room });
    P.bones(ctx, -87.4, YD, -17.0, 6, 3, 0.4);
    P.decal(ctx, -87.0, YD + 0.01, -14.6, 1.6);
    P.decal(ctx, -77, YD + 0.01, -11.4, 2.4);
    P.decal(ctx, -77.2, YD + 0.01, -7.8, 2.0);
    // la celda del fondo, la del jugador: por las tres paredes, escrito a dedo
    // con sangre una y otra vez, NO TE ARRODILLES (la de abajo, a medias: se
    // fue escurriendo hasta el suelo). A unos milímetros del muro, y cada una
    // a su distancia, para que no parpadeen donde se pisan
    for (const [mat, x, y, z, ry, w, h, roll] of [
      ['bloodNoTe1', -87.5, YD + 1.45, -17.984, 0, 1.9, 0.76, -0.03],
      ['bloodNoTe2', -87.6, YD + 2.1, -17.978, 0, 2.1, 0.26, 0.02],
      ['bloodNoTe4', -87.05, YD + 0.5, -17.981, 0, 1.0, 0.4, 0.08],
      ['bloodNoTe3', -88.984, YD + 1.35, -16.2, Math.PI / 2, 1.6, 0.64, 0.04],
      ['bloodNoTe2', -88.979, YD + 0.72, -14.9, Math.PI / 2, 1.4, 0.18, -0.05],
      ['bloodNoTe1', -86.016, YD + 1.55, -16.4, -Math.PI / 2, 1.5, 0.6, 0.03],
      ['bloodNoTe2', -86.021, YD + 0.85, -15.0, -Math.PI / 2, 1.3, 0.16, -0.04],
    ])
      wb.geometry(mat, new THREE.PlaneGeometry(w, h), new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, roll, 'YXZ')), new THREE.Vector3(1, 1, 1)), { ao: false, room, grime: false });
    P.wallTorch(ctx, -82.4, YD + 2.0, zS - 0.22, 'n', { room, radius: 7 });
    P.wallTorch(ctx, -79.0, YD + 2.0, zN + 0.22, 's', { room, radius: 6, dyn: 2.2 });
    P.wallTorch(ctx, -85.8, YD + 2.0, zN + 0.22, 's', { room, radius: 5 });
    P.fleshGrowth(ctx, -76.2, YD, -6.6, 0.7, 51, { room, climb: 0.9, bound: [-78.6, -75.6, -10.2, -6.2] });
    ctx.rats.push({ x: -84.4, y: YD, z: -16.4, n: 2 }, { x: -76.6, y: YD, z: -11.6, n: 1 });
    wb.setRoom(null);
  }

  // --- el cuarto del carcelero: bóveda rebajada sobre dos fajones y
  // portadas de arco hacia las celdas, el tormento y la bajada
  {
    const room = 'mazmorra';
    wb.setRoom(room);
    for (const x of [-72.25, -69.75]) fajon('x', x, -11.75, 6.5, YD + 2.5, room, { rise: 1.12 });
    // (los dos pasos estrechos, con su arco de medio punto)
    for (const [x0, c] of [
      [-75.5, -12.0],
      [-67, -11.5],
    ])
      archRing(ctx, { axis: 'z', c, w: 1.0, y0: YD + 2.0, rise: 0.5, ring: 0.22, t0: x0, t1: x0 + 0.5, top: YD + 2.8, clip: [c - 0.5, c + 0.5], mat: 'ashlar', rooms: [room, room], tint: ARCH_T, spTint: mazT });
    portal('z', -8.5, -71, 2.0, SG, YD + 3.8, 1, 'catacumbas', { rooms: [room, 'catacumbas'], spTint: catT, spMat: 'mossstone' });
    P.table(ctx, -71.6, YD, -13.4, 1.8, 0.9, 0);
    P.bench(ctx, -71.6, YD, -12.5, 1.6, 0);
    bakeCorpse(wb, -72.0, YD + 0.02, -12.3, Math.PI, 'sit', 'soldier', 1);
    P.candles(ctx, -71.0, YD + 0.8, -13.6, 4, 11, { room, radius: 5, intensity: 1.2, spread: 0.2 });
    P.weaponRack(ctx, -68.6, YD, -14.7, 0);
    // el clavijero de las llaves y los grilletes
    wb.box('planks', -74.95, YD + 1.3, -14.4, -74.9, YD + 2.0, -12.9, { ao: false, room, tint: [0.62, 0.55, 0.48] });
    for (let z = -14.2; z < -13; z += 0.3) wb.box('iron', -74.9, YD + 1.55, z - 0.02, -74.75, YD + 1.62, z + 0.02, { ao: false, room });
    P.barrel(ctx, -67.6, YD, -9.2, {});
    P.barrel(ctx, -68.5, YD, -9.0, {});
    P.crate(ctx, -74.2, YD, -9.2, 0.8, 0.3);
    P.brazier(ctx, -69.2, YD, -11.6, {});
    P.wallTorch(ctx, -71.0, YD + 2.0, -15.0, 's', { room, radius: 7 });
    wb.setRoom(null);
    L.interact.push(
      { kind: 'note', id: 'n_celda', note: 'celda', x: -87.6, y: YD + 1.3, z: -17.85, model: 'wall', r: 1.5 },
      { kind: 'note', id: 'n_carcelero', note: 'carcelero', x: -71.4, y: YD + 0.82, z: -13.5, model: 'paper' },
      { kind: 'item', id: 'i_espada', item: 'espada', x: -69.2, y: YD + 0.9, z: -14.5 },
      { kind: 'item', id: 'i_escudo', item: 'escudo', x: -68.0, y: YD + 0.9, z: -14.5 }
    );
  }

  // --- la sala del tormento: el potro con su condenado, la garrucha, la
  // jaula colgada, el brasero con los hierros y la mesa de las tenazas
  {
    const room = 'tormento';
    wb.setRoom(room);
    for (const z of [-12.9, -10.6]) fajon('z', z, -63.75, 5.5, YD + 2.4, room, { rise: 1.08 });
    // el potro y el condenado tendido, con las cuerdas de muñecas y tobillos
    // (la cabeza hacia el oeste, los brazos por encima de ella)
    const rk = P.rack(ctx, -63.8, YD, -12.0, 0, { room, len: 2.7, w: 0.8 });
    const vj = bakeCorpse(wb, -63.66, YD + rk.H - 0.04, -12.0, Math.PI / 2, 'rack', 'villager', 39);
    for (const [k, sx, dz] of [
      ['handL', -1, 0.07],
      ['handR', -1, -0.07],
      ['footL', 1, 0.07],
      ['footR', 1, -0.07],
    ]) {
      const p = vj[k];
      if (!p) continue;
      // de la muñeca (o el tobillo) a lo alto del rodillo, donde se enrolla
      const a = V(-63.8 + sx * (rk.L / 2 - 0.12), YD + rk.H + 0.08 + 0.1, -12.0 + dz);
      beam3(ctx, 'rope', p, a, 0.022, { room });
      // la vuelta de cuerda en la muñeca
      wb.geometry('rope', new THREE.TorusGeometry(0.045, 0.014, 3, 8), new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI / 2), V(1, 1, 1)), { ao: false, room });
    }
    P.decal(ctx, -63.8, YD + 0.01, -12.0, 2.2);
    // la garrucha: una polea en la clave y la soga con su lazo
    {
      const gx = -65.3,
        gz = -10.0,
        gy = YD + 3.45;
      wb.box('iron', gx - 0.05, gy - 0.25, gz - 0.12, gx + 0.05, gy, gz + 0.12, { ao: false, room });
      wb.push();
      wb.translate(gx, gy - 0.28, gz);
      wb.rotateZ(Math.PI / 2);
      wb.cylinder('wooddark', 0, -0.05, 0, 0.13, 0.13, 0.1, 8, { ao: false, capTop: true, capBot: true, room });
      wb.pop();
      wb.box('rope', gx - 0.015, YD + 1.25, gz - 0.015, gx + 0.015, gy - 0.28, gz + 0.015, { ao: false, room });
      wb.geometry('rope', new THREE.TorusGeometry(0.12, 0.018, 4, 10), new THREE.Matrix4().compose(V(gx, YD + 1.13, gz), new THREE.Quaternion(), V(1, 1, 1)), { ao: false, room });
    }
    // la jaula colgada
    {
      const jx = -62.3,
        jz = -9.7;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        wb.box('iron', jx + Math.cos(a) * 0.45 - 0.02, YD + 1.0, jz + Math.sin(a) * 0.45 - 0.02, jx + Math.cos(a) * 0.45 + 0.02, YD + 2.6, jz + Math.sin(a) * 0.45 + 0.02, { ao: false, room });
      }
      wb.cylinder('iron', jx, YD + 0.95, jz, 0.48, 0.48, 0.06, 8, { ao: false, capTop: true, capBot: true, room });
      wb.cylinder('iron', jx, YD + 2.6, jz, 0.48, 0.12, 0.3, 8, { ao: false, room });
      P.chains(ctx, jx, YD + 3.35, jz, 8, 0);
      P.bones(ctx, jx, YD + 1.02, jz, 4, 4495, 0.25);
    }
    P.chains(ctx, -66.3, YD + 2.6, -13.6, 9, 0);
    P.chains(ctx, -66.3, YD + 2.6, -9.6, 9, 0);
    // el brasero con los hierros de marcar y la mesa de las herramientas
    P.brazier(ctx, -61.8, YD, -13.2, {});
    for (let k = 0; k < 3; k++) beam3(ctx, 'iron', V(-61.8 + (k - 1) * 0.08, YD + 0.95, -13.2), V(-61.5 + (k - 1) * 0.12, YD + 1.5, -13.6 + k * 0.1), 0.025, { room });
    P.table(ctx, -65.4, YD, -13.4, 1.2, 0.6, 0);
    for (const [dx, dz, l] of [
      [-0.35, -0.1, 0.32],
      [-0.05, 0.08, 0.28],
      [0.25, -0.05, 0.36],
    ])
      wb.box('iron', -65.4 + dx - l / 2, YD + 0.8, -13.4 + dz - 0.015, -65.4 + dx + l / 2, YD + 0.83, -13.4 + dz + 0.015, { ao: false, room });
    P.stool(ctx, -64.6, YD, -10.4, { room });
    P.bones(ctx, -65.6, YD, -9.6, 6, 4496, 0.5);
    P.wallTorch(ctx, -61.0, YD + 2.0, -11.75, 'w', { room, radius: 6 });
    wb.setRoom(null);
  }

  // --- la bajada y las catacumbas: fajones, nichos con sus muertos, el
  // arcosolio, el osario
  {
    const room = 'catacumbas';
    wb.setRoom(room);
    // la bajada (de la puerta del cuarto del carcelero a la galería)
    for (const z of [-6.0, -3.6]) fajon('z', z, -71, 2, SG, room);
    fajon('z', -1.25, -71, 2, SG, room);
    // galería principal: fajones (sin pilastra donde se abre un paso)
    for (const x of FM) fajon('x', x, 0, 2, SG, room);
    // travesías: un fajón a cada boca
    for (const xc of [-81, -71, -61])
      for (const z of [1.25, 3.75]) fajon('z', z, xc, 2, SG, room);
    // galería del sur
    for (const x of FS) fajon('x', x, 5, 2, SG, room);
    // los nichos: hueco con su hondura, y dentro el muerto (o la losa que
    // lo tapa, entera o partida)
    for (const n of niches) {
      const room = n.room ?? 'catacumbas';
      const mat = n.kind === 'cell' ? 'wallstone' : 'mossstone';
      const f = n.face;
      const t = [0.52, 0.53, 0.5];
      const zb = n.line - f * (n.depth ?? 0);
      if (n.kind === 'sealed') {
        // losa encajada a ras, con su cruz grabada
        const zz = n.line + f * 0.02;
        wb.box('ashlar', n.a0, n.y0, Math.min(n.line, zz), n.a1, n.y1, Math.max(n.line, zz), { ao: false, faces: f > 0 ? 's' : 'n', room, tint: [0.66, 0.64, 0.6] });
        const xc = (n.a0 + n.a1) / 2,
          yc = (n.y0 + n.y1) / 2;
        const zc = zz + f * 0.003;
        wb.box('black', xc - 0.02, yc - 0.17, Math.min(zz, zc), xc + 0.02, yc + 0.17, Math.max(zz, zc), { ao: false, faces: f > 0 ? 's' : 'n', grime: false, room });
        wb.box('black', xc - 0.11, yc + 0.05, Math.min(zz, zc), xc + 0.11, yc + 0.09, Math.max(zz, zc), { ao: false, faces: f > 0 ? 's' : 'n', grime: false, room });
        continue;
      }
      const z0 = Math.min(zb, n.line),
        z1 = Math.max(zb, n.line);
      // la hondura: fondo, suelo, techo y costados (vistos desde fuera)
      wb.box(mat, n.a0, n.y0, f > 0 ? zb - 0.05 : zb, n.a1, n.y1, f > 0 ? zb : zb + 0.05, { faces: f > 0 ? 's' : 'n', ao: false, room, tint: t.map((v) => v * 0.7) });
      wb.box(mat, n.a0, n.y0 - 0.05, z0, n.a1, n.y0, z1, { faces: 't', ao: false, room, tint: t });
      wb.box(mat, n.a0, n.y1, z0, n.a1, n.y1 + 0.05, z1, { faces: 'b', ao: false, room, tint: t.map((v) => v * 0.6) });
      wb.box(mat, n.a0 - 0.05, n.y0, z0, n.a0, n.y1, z1, { faces: 'e', ao: false, room, tint: t.map((v) => v * 0.8) });
      wb.box(mat, n.a1, n.y0, z0, n.a1 + 0.05, n.y1, z1, { faces: 'w', ao: false, room, tint: t.map((v) => v * 0.8) });
      // umbral de piedra que asoma un poco
      if (n.kind !== 'cell') wb.box('ashlar', n.a0 - 0.04, n.y0 - 0.07, Math.min(n.line, n.line + f * 0.06), n.a1 + 0.04, n.y0, Math.max(n.line, n.line + f * 0.06), { ao: false, faces: 'tnsew', room, tint: [0.6, 0.6, 0.56] });
      if (n.kind === 'cell') continue;
      const zc = n.line - f * (n.depth / 2);
      const xc = (n.a0 + n.a1) / 2;
      // el muerto, tendido a lo largo del nicho (dentro, sobre su suelo)
      const len = n.a1 - n.a0;
      P.skeleton(ctx, xc, n.y0, zc, rng.chance(0.5) ? 0 : Math.PI, { mess: n.kind === 'broken' ? 0.6 : rng.range(0.05, 0.35), scale: Math.min(0.92, (len - 0.1) / 1.95), seed: Math.round(xc * 13 + n.y0 * 7 + f * 3), room });
      if (n.kind === 'broken') {
        // la losa partida: media sigue en su sitio, la otra media en el suelo
        const zz = n.line + f * 0.02;
        wb.box('ashlar', n.a0, n.y0, Math.min(n.line, zz), xc - 0.1, n.y1, Math.max(n.line, zz), { ao: false, faces: f > 0 ? 'snewt' : 'nsewt', room, tint: [0.66, 0.64, 0.6] });
        if (n.y0 < YD + 1)
          wb.at(xc + 0.35, YD, n.line + f * 0.45, 0.3, () => {
            wb.push();
            wb.rotateZ(0.12);
            wb.box('ashlar', -0.45, 0, -0.04, 0.45, 0.6, 0.04, { ao: false, room, tint: [0.66, 0.64, 0.6] });
            wb.pop();
          });
        P.bones(ctx, xc + 0.2, YD, n.line + f * 0.4, 3, Math.round(xc * 5), 0.25);
      }
    }
    // el arcosolio de la galería del sur: un arco hondo con el sarcófago de
    // los antiguos
    archRing(ctx, { axis: 'x', c: -76.25, w: 2.5, y0: YD + 1.4, rise: 1.0, ring: 0.3, t0: 5.75, t1: 6.25, top: CR, clip: [-77.5, -75.0], mat: 'ashlar', spMat: 'mossstone', room, tint: ARCH_T, spTint: catT });
    // (cabe entre las jambas; destapado y hueco, con el muerto dentro)
    P.sarcophagus(ctx, -76.25, YD, 6.92, 0, { open: true, hollow: true, lid: false, l: 1.0, w: 0.46, room });
    P.skeleton(ctx, -76.3, YD + 0.24, 6.92, Math.PI, { mess: 0.35, seed: 4519, scale: 0.82, room });
    // la tapa, partida: media apoyada contra el sarcófago y media en el suelo
    {
      const lidT = [0.7, 0.68, 0.64];
      wb.push();
      wb.translate(-76.53, YD, 5.8);
      wb.rotateY(0.06);
      wb.rotateX(0.52);
      wb.box('ashlar', -0.52, 0, 0, 0.52, 1.0, 0.16, { ao: false, faces: 'tnsewb', room, tint: lidT });
      wb.pop();
      ctx.col.add(-77.07, YD, 5.78, -75.99, YD + 0.8, 6.38);
      wb.push();
      wb.translate(-75.1, YD + 0.02, 5.2);
      wb.rotateY(0.48);
      wb.rotateZ(0.07);
      wb.box('ashlar', -0.52, 0, -0.5, 0.52, 0.16, 0.5, { ao: false, faces: 'tnsewb', room, tint: lidT });
      wb.pop();
      ctx.col.addOBB(-75.1, 5.2, 0.52, 0.5, 0.48, YD, YD + 0.2);
      for (const [x, z, sz, sd] of [
        [-75.8, 5.62, 0.11, 4521],
        [-75.95, 5.35, 0.07, 4522],
        [-74.6, 5.6, 0.09, 4523],
      ])
        P.roughStone(ctx, x, YD, z, sz, sd, { mat: 'ashlar', room, tint: lidT });
    }
    P.candles(ctx, -77.95, YD, 5.7, 3, 4520, { room, radius: 3.5, intensity: 0.6, spread: 0.12 });
    // un tramo hundido (tapado de escombro)
    P.rubble(ctx, -82.8, YD, 5.0, 10, 4504, 1.0, { mat: 'mossstone', scale: 1.2 });
    // velas en las galerías
    for (const [x, z] of [
      [-76.6, -0.6],
      [-66.0, 0.6],
      [-81.4, 5.4],
      [-70.6, 3.0],
      [-61.4, 4.6],
    ])
      P.candles(ctx, x, YD, z, 4, Math.round(x * z), { room, radius: 4, intensity: 0.75, spread: 0.25 });
    P.fleshGrowth(ctx, -60.6, YD, 0.4, 0.8, 4505, { room, climb: 1.4, bound: [-61.8, -60.2, -0.8, 3.8] });
    ctx.rats.push({ x: -79.0, y: YD, z: 0.2, n: 2 });
    wb.setRoom(null);
  }

  buildHermandad(ctx, L, portal);

  // --- el aljibe: bóvedas de arista sobre columnas, el agua negra a la
  // mitad y la luz del pozo. Antes era un techo plano con arcos pegados, el
  // estribo de uno de ellos se metía en la puerta de las catacumbas y del
  // andén al agua había un escalón seco con un muro invisible.
  {
    const room = 'aljibe';
    wb.setRoom(room);
    const { xs, zs, ys, rise } = AJ;
    const x0 = xs[0],
      x1 = xs[5],
      z0 = zs[0],
      z1 = zs[3];
    const W2 = CASTLE.well;
    const stoneT = [0.6, 0.62, 0.6],
      capT = [0.66, 0.67, 0.64],
      markT = [0.3, 0.34, 0.28];
    portal('z', z0, -65, 2, SG, -1.3, -1, room, { spMat: 'ashlar', spTint: aljT, rooms: ['aljibe', 'aljibe'] });
    fajon('z', 6.25, -65, 2, SG, room);
    // la bóveda: tres naves de cinco tramos, con sus fajones; en la clave del
    // tramo del pozo, el óculo por el que baja
    const wi = xs.findIndex((x, i) => i < 5 && W2.x > x && W2.x < xs[i + 1]),
      wj = zs.findIndex((z, j) => j < 3 && W2.z > z && W2.z < zs[j + 1]);
    const shaftTop = -0.65;
    groinVaults(ctx, { xs, zs, ys, rise, mat: 'ashlar', tint: [0.5, 0.52, 0.5], room, ribs: true, ribMat: 'ashlar', ribTint: capT, ribW: 0.36, ribD: 0.2, oculi: [{ i: wi, j: wj, k: 2, top: shaftTop, mat: 'wallstone', tint: [0.42, 0.44, 0.42] }] });
    {
      // (la boca de arriba del tiro: a oscuras, la noche del patio)
      const hx = (xs[wi + 1] - xs[wi]) / 4,
        hz = (zs[wj + 1] - zs[wj]) / 4;
      wb.box('black', W2.x - hx, shaftTop - 0.02, W2.z - hz, W2.x + hx, shaftTop, W2.z + hz, { faces: 'b', ao: false, grime: false, room });
    }
    // las columnas: basa (bajo el agua), fuste, capitel de ocho caras y ábaco;
    // en el fuste, la franja verdosa de lo que ha bajado el agua
    const column = (x, z) => {
      const yb = AJ.floor + 0.45,
        yc = ys - 0.45;
      wb.box('ashlar', x - 0.42, AJ.floor, z - 0.42, x + 0.42, yb, z + 0.42, { ao: false, faces: 'tnsew', room, tint: stoneT });
      wb.cylinder('ashlar', x, yb, z, 0.3, 0.27, yc - yb, 8, { ao: false, sub: 2, room, tint: stoneT });
      wb.cylinder('ashlar', x, yc, z, 0.27, 0.46, 0.33, 8, { ao: false, room, tint: capT });
      wb.box('ashlar', x - 0.5, ys - 0.12, z - 0.5, x + 0.5, ys, z + 0.5, { ao: false, faces: 'tnsewb', room, tint: capT });
      const k = (y) => 0.3 - (0.03 * (y - yb)) / (yc - yb) + 0.006;
      wb.cylinder('mossstone', x, AJ.water - 0.05, z, k(AJ.water), k(AJ.full), AJ.full - AJ.water + 0.05, 8, { ao: false, room, tint: markT });
      ctx.col.add(x - 0.32, AJ.floor, z - 0.32, x + 0.32, ys, z + 0.32);
    };
    for (let i = 1; i < 5; i++) for (let j = 1; j < 3; j++) column(xs[i], zs[j]);
    // pilastras en los muros, bajo cada fajón (en el estanque, desde el
    // fondo y con la marca del agua); en el muro de levante, donde baja la
    // escalera, ménsulas
    const pil = (line, a, dir, wet) => {
      pilaster(ctx, line, a, dir, wet ? AJ.floor : YD, ys, { room, tint: stoneT, w: 0.5, d: 0.15 });
      if (!wet) return;
      const sg = dir === 'n' || dir === 'w' ? -1 : 1,
        q0 = line,
        q1 = line + sg * 0.162;
      const f = dir + (dir === 'n' || dir === 's' ? 'ew' : 'ns');
      if (dir === 'n' || dir === 's') wb.box('mossstone', a - 0.262, AJ.water - 0.05, Math.min(q0, q1), a + 0.262, AJ.full, Math.max(q0, q1), { faces: f, ao: false, room, tint: markT });
      else wb.box('mossstone', Math.min(q0, q1), AJ.water - 0.05, a - 0.262, Math.max(q0, q1), AJ.full, a + 0.262, { faces: f, ao: false, room, tint: markT });
    };
    for (let i = 1; i < 5; i++) {
      pil(z0, xs[i], 's', false);
      pil(z1, xs[i], 'n', xs[i] > AJ.walkW);
    }
    for (let j = 1; j < 3; j++) {
      pil(x0, zs[j], 'e', false);
      wb.box('ashlar', x1 - 0.24, ys - 0.26, zs[j] - 0.3, x1, ys, zs[j] + 0.3, { ao: false, faces: 'bnsw', room, tint: capT });
      wb.box('ashlar', x1 - 0.13, ys - 0.5, zs[j] - 0.22, x1, ys - 0.26, zs[j] + 0.22, { ao: false, faces: 'bnsw', room, tint: stoneT });
    }
    // el agua, a la mitad, con la luz del pozo
    if (ctx.waters) ctx.waters.push({ shape: 'rect', r: [AJ.walkW + 0.02, AJ.walkN + 0.02, x1 - 0.02, z1 - 0.02], y: AJ.water, light: [W2.x, ys + rise, W2.z], lightK: 0.9, sky: 0x1c2228, spot: [W2.x + 0.2, W2.z + 0.15, 1.0, 0.7] });
    // la marca del lleno en los muros del estanque, de cara al agua
    const band = (bx0, bz0, bx1, bz1, f) => wb.box('mossstone', bx0, AJ.water - 0.05, bz0, bx1, AJ.full, bz1, { faces: f, ao: false, room, tint: markT });
    band(AJ.walkW, AJ.walkN, x1, AJ.walkN + 0.012, 's');
    band(AJ.walkW, z1 - 0.012, x1, z1, 'n');
    band(AJ.walkW, AJ.walkN, AJ.walkW + 0.012, z1, 'e');
    band(x1 - 0.012, AJ.walkN, x1, z1, 'w');
    // la escalera que baja del andén al agua, pegada al muro de levante, con
    // su pretil escalonado al lado del agua; se pierde en el agua negra
    const SW = 1.4,
      sn = 13,
      srise = (YD - AJ.floor) / sn,
      srun = 0.3;
    const sx0 = x1 - SW,
      sz1 = AJ.walkN + sn * srun;
    stairs(ctx, x1 - SW / 2, AJ.floor, sz1, 'n', SW, sn, srise, srun, 'ashlar', { solidBelow: true });
    for (let i = 0; i < sn; i++) {
      const za = sz1 - srun * (i + 1),
        zb = sz1 - srun * i,
        top = AJ.floor + srise * (i + 1);
      solid(ctx, 'ashlar', sx0, top, za, sx0 + 0.2, top + 0.85, zb, { room, tint: stoneT, ao: false, faces: 'tnsew' });
    }
    // el pretil del andén, hasta la escalera, con su albardilla (en la
    // esquina, una sola: dos encima una de otra parpadeaban)
    const PH = 0.9;
    solid(ctx, 'ashlar', AJ.walkW - 0.3, YD, AJ.walkN - 0.3, sx0, YD + PH, AJ.walkN, { sub: 2, ao: false, faces: 'nsew', room, tint: stoneT });
    solid(ctx, 'ashlar', AJ.walkW - 0.3, YD, AJ.walkN, AJ.walkW, YD + PH, z1, { sub: 2, ao: false, faces: 'ew', room, tint: stoneT });
    wb.box('ashlar', AJ.walkW - 0.35, YD + PH, AJ.walkN - 0.35, sx0 + 0.05, YD + PH + 0.12, AJ.walkN + 0.05, { ao: false, faces: 'tnsewb', room, tint: capT });
    wb.box('ashlar', AJ.walkW - 0.35, YD + PH, AJ.walkN + 0.05, AJ.walkW + 0.05, YD + PH + 0.12, z1, { ao: false, faces: 'tewb', room, tint: capT });
    // que nadie se meta en el agua (la cámara sí pasa por encima): todo el
    // estanque salvo la escalera, que se puede bajar hasta el último peldaño
    // seco
    const dry = AJ.walkN + srun * (Math.floor((YD - AJ.water) / srise) + 1) - 0.05;
    for (const r of subtractRects([AJ.walkW, AJ.walkN, x1, z1], [[sx0 + 0.2, AJ.walkN, x1, dry]])) blocker(ctx, r[0], AJ.floor, r[1], r[2], ys, r[3]);
    // la soga del pozo con el cubo, que cuelga hasta casi tocar el agua
    wb.box('burlap', W2.x - 0.012, AJ.water + 0.62, W2.z - 0.012, W2.x + 0.012, shaftTop, W2.z + 0.012, { ao: false, room, tint: [0.8, 0.7, 0.55] });
    wb.cylinder('planks', W2.x, AJ.water + 0.25, W2.z, 0.16, 0.19, 0.3, 8, { ao: false, capBot: true, room });
    for (const yy of [0.29, 0.47]) wb.cylinder('iron', W2.x, AJ.water + yy, W2.z, 0.185 - (yy - 0.29) * 0.1, 0.18 - (yy - 0.29) * 0.1, 0.03, 8, { ao: false, room });
    wb.box('iron', W2.x - 0.015, AJ.water + 0.55, W2.z - 0.17, W2.x + 0.015, AJ.water + 0.58, W2.z + 0.17, { ao: false, room });
    if (ctx.shafts) ctx.shafts.push({ a: [W2.x, shaftTop, W2.z], b: [W2.x + 0.3, AJ.water, W2.z + 0.2], w: 1.3, color: 0xb8c8e0 });
    if (ctx.lights) ctx.lights.push({ x: W2.x, y: AJ.water + 1.6, z: W2.z, r: 0.55, g: 0.66, b: 0.85, radius: 9, intensity: 0.9, room });
    // el caño por el que entra el agua de lluvia del patio (en el muro del
    // sur, en medio de un tramo), con el chorreón negro hasta el agua
    {
      const cx = (xs[2] + xs[3]) / 2,
        cy = ys - 0.35;
      wb.box('ashlar', cx - 0.16, cy - 0.2, z1 - 0.34, cx + 0.16, cy, z1, { ao: false, faces: 'tnewb', room, tint: capT });
      wb.box('black', cx - 0.07, cy - 0.15, z1 - 0.345, cx + 0.07, cy - 0.05, z1 - 0.34, { ao: false, faces: 'n', grime: false, room });
      wb.box('mossstone', cx - 0.22, AJ.full, z1 - 0.006, cx + 0.22, cy - 0.2, z1 - 0.003, { ao: false, faces: 'n', room, tint: markT });
    }
    // antorchas en el andén, cubos para sacar agua, un tonel y un caído
    P.wallTorch(ctx, x0 + 1.7, YD + 2.2, z0, 's', { room, radius: 7 });
    P.wallTorch(ctx, x1 - 1.6, YD + 2.2, z0, 's', { room, radius: 6 });
    P.wallTorch(ctx, x0, YD + 2.2, 15.0, 'e', { room, radius: 6 });
    for (const [bx, bz] of [
      [-59.6, 8.2],
      [-59.1, 8.6],
    ]) {
      wb.cylinder('planks', bx, YD, bz, 0.19, 0.16, 0.32, 8, { ao: false, capTop: true, room });
      wb.cylinder('iron', bx, YD + 0.06, bz, 0.188, 0.186, 0.03, 8, { ao: false, room });
    }
    P.barrel(ctx, x1 - 0.6, YD, z0 + 0.7, {});
    bakeCorpse(wb, x0 + 1.2, YD, 15.6, 0.6, 'face', 'soldier', 40);
    P.decal(ctx, x0 + 1.2, YD + 0.01, 15.4, 1.6);
    // y en el agua, boca abajo, alguien amortajado que tiraron por el pozo
    P.ellipsoid(ctx, 'shroud', -66.0, AJ.water + 0.02, 15.1, 0.82, 0.11, 0.25, [0.36, 0.34, 0.3], { room });
    P.ellipsoid(ctx, 'shroud', -65.2, AJ.water + 0.03, 15.15, 0.15, 0.1, 0.14, [0.36, 0.34, 0.3], { room });
    wb.setRoom(null);
  }

  // --- el pasadizo hasta la escalera de la torre de la cárcel: fajones,
  // dos celdas de castigo con su reja, la parihuela de los muertos
  {
    const room = 'mazmorra';
    wb.setRoom(room);
    portal('x', AJ.xs[0], 12, 2, SG, -1.3, -1, room, { rooms: [room, 'aljibe'], spMat: 'wallstone' });
    portal('x', PSTAIR.x0, 12, 2, SG, -1.0, 1, room);
    for (const x of [-87.3, -84.3, -81.3, -78.3, -75.3]) fajon('x', x, 12, 2, SG, room);
    // las celdas de castigo: reja con candado y lo que queda dentro
    for (const n of niches.filter((q) => q.kind === 'cell')) {
      const xc = (n.a0 + n.a1) / 2;
      for (let x = n.a0 + 0.1; x < n.a1 - 0.05; x += 0.2) wb.box('iron', x - 0.025, YD, n.line - 0.04, x + 0.025, n.y1 - 0.02, n.line + 0.02, { ao: false, room });
      for (const yy of [YD + 0.12, YD + 1.15, n.y1 - 0.12]) wb.box('iron', n.a0, yy, n.line - 0.06, n.a1, yy + 0.06, n.line + 0.04, { ao: false, room });
      wb.box('iron', xc + 0.3, YD + 1.0, n.line - 0.1, xc + 0.42, YD + 1.14, n.line - 0.04, { ao: false, room });
      ctx.col.add(n.a0, YD, n.line - 0.08, n.a1, n.y1, n.line + 0.04);
      const zc = n.line + n.depth * 0.5;
      P.bones(ctx, xc, YD, zc, 7, Math.round(xc * 7), 0.3);
      for (let k = 0; k < 7; k++) wb.box('iron', xc - 0.4, YD + 1.3 - k * 0.12, n.line + n.depth - 0.06, xc - 0.34, YD + 1.4 - k * 0.12, n.line + n.depth, { ao: false, room });
      P.skullRow(ctx, xc + 0.15, YD, zc + 0.15, -Math.PI / 2 - 0.4, 1, { room, seed: Math.round(xc) });
    }
    // la parihuela con un muerto amortajado, olvidada a medio camino
    {
      const hx = -79.8,
        hz = 11.45;
      for (const s of [-1, 1]) wb.box('wooddark', hx - 1.1, YD + 0.32, hz + s * 0.3 - 0.03, hx + 1.1, YD + 0.38, hz + s * 0.3 + 0.03, { ao: false, room });
      for (const s of [-1, 1]) for (const t of [-0.75, 0.75]) wb.box('wooddark', hx + t - 0.03, YD, hz + s * 0.3 - 0.03, hx + t + 0.03, YD + 0.32, hz + s * 0.3 + 0.03, { ao: false, room });
      wb.box('burlap', hx - 0.85, YD + 0.36, hz - 0.3, hx + 0.85, YD + 0.4, hz + 0.3, { ao: false, faces: 'tnsew', room, tint: [0.7, 0.62, 0.5] });
      P.ellipsoid(ctx, 'shroud', hx + 0.05, YD + 0.52, hz, 0.85, 0.14, 0.24, [0.8, 0.78, 0.72], { room });
      P.ellipsoid(ctx, 'shroud', hx + 0.78, YD + 0.55, hz, 0.15, 0.13, 0.14, [0.8, 0.78, 0.72], { room });
      ctx.col.add(hx - 1.1, YD, hz - 0.36, hx + 1.1, YD + 0.6, hz + 0.36);
    }
    bakeCorpse(wb, -74.4, YD, 12.5, 2.0, 'back', 'soldier', 41);
    P.decal(ctx, -74.4, YD + 0.01, 12.4, 1.8);
    P.bones(ctx, -86.0, YD, 12.4, 4, 4510, 0.5);
    P.chains(ctx, -85.8, YD + 1.9, 11.05, 10, 0);
    P.chains(ctx, -79.6, YD + 1.9, 12.95, 8, 0);
    P.wallTorch(ctx, -85.8, YD + 2.0, 11.0, 's', { room, radius: 6 });
    P.wallTorch(ctx, -76.6, YD + 2.0, 11.0, 's', { room, radius: 6 });
    ctx.rats.push({ x: -82.0, y: YD, z: 12.4, n: 2 });
    // el rellano bajo la muralla: una imagen en su hornacina, de cara a la
    // escalera, y la escalera, que sube de frente a la puerta de la torre
    P.niche(ctx, PSTAIR.x0 - 2, YD + 1.3, 10.6, 'e', { room, intensity: 0.6 });
    P.wallTorch(ctx, PSTAIR.x0 - 2, YD + 2.6, 8.0, 'e', { room, radius: 6 });
    stairs(ctx, PSTAIR.x0, YD, (PSTAIR.z0 + PSTAIR.z1) / 2, 'e', PSTAIR.z1 - PSTAIR.z0, PSTAIR.n, (0 - YD) / PSTAIR.n, (PSTAIR.x1 - PSTAIR.x0) / PSTAIR.n, 'wallstone', { solidBelow: true });
    P.wallTorch(ctx, -87.0, -1.6, PSTAIR.z0, 's', { room, radius: 6 });
    wb.setRoom(null);
  }

  // --- criaturas de las mazmorras
  L.enemies.push(
    { type: 'penitent', x: -77.0, y: YD, z: -8.4, yaw: 0.3, idle: 'eat', id: 'e_carcel1' },
    { type: 'penitent', x: -66.0, y: YD, z: 0.2, yaw: Math.PI / 2, idle: 'kneel', id: 'e_carcel2' },
    { type: 'penitent', x: -75.6, y: YD, z: 5.0, yaw: -1.4, idle: 'wander', id: 'e_carcel3' }
  );
  // zonas y plano de abajo
  L.zones.push(
    { id: 'prison', rects: [[-67, -14, -61, -9, YD - 1, -1]], atmo: 'prison', room: 'tormento' },
    {
      id: 'prison',
      rects: [
        [-89, -18, -61, -6, YD - 1, -1],
        [PSTAIR.x0 - 2, 7, PSTAIR.x1, 9, YD - 1, -1],
        [PSTAIR.x0 - 2, 9, -72, 13, YD - 1, -1],
      ],
      atmo: 'prison',
      room: 'mazmorra',
    },
    {
      id: 'osario_castillo',
      rects: [[OSARIO_C.x0, -OSARIO_C.z, OSARIO_C.x1, OSARIO_C.z, OSARIO_C.y - 1, -1]],
      atmo: 'crypt',
      room: 'osario_castillo',
    },
    {
      id: 'catacumbas_castillo',
      rects: [
        [OSARIO_C.x1, -8.5, -60, 6, YD - 1, -1],
        [-77.5, 6, -75.0, 7.5, YD - 1, -1],
        [-66, 6, -64, ALJIBE.zs[0], YD - 1, -1],
      ],
      atmo: 'crypt',
      room: 'catacumbas',
    },
    { id: 'aljibe', rects: [[ALJIBE.xs[0], ALJIBE.zs[0], ALJIBE.xs[5], ALJIBE.zs[3], ALJIBE.floor - 0.5, ALJIBE.ys + ALJIBE.rise + 0.3]], atmo: 'crypt', room: 'aljibe' }
  );
  L.map.push(
    { id: 'prison', r: [-89, -18, -61, -6], level: 'dungeon' },
    { id: 'prison', r: [PSTAIR.x0, 11, ALJIBE.xs[0], 13], level: 'dungeon' },
    { id: 'prison', r: [PSTAIR.x0 - 2, 7, PSTAIR.x0, 13], level: 'dungeon' },
    { id: 'catacumbas_castillo', r: [OSARIO_C.x1, -1, -60, 6], level: 'dungeon' },
    { id: 'osario_castillo', r: [OSARIO_C.x0, -OSARIO_C.z, OSARIO_C.x1, OSARIO_C.z], level: 'dungeon' },
    { id: 'catacumbas_castillo', r: [-72, -8.5, -70, -1], level: 'dungeon' },
    { id: 'aljibe', r: [ALJIBE.xs[0], ALJIBE.zs[0], ALJIBE.xs[5], ALJIBE.zs[3]], level: 'dungeon' },
    { id: 'torre_carcel', r: [PSTAIR.x0, PSTAIR.z0, PSTAIR.x1, PSTAIR.z1], level: 'dungeon' }
  );
}

// ------------------------------------------------------- el osario del castillo
// El osario de la Hermandad de la Buena Muerte, la cofradía de los soldados
// de la guarnición: los hermanos en sus filas, como en el cuartel, cada
// calavera con su yelmo; pirámides de calaveras como balas de bombarda; sobre
// el altar, el escudo de la Hermandad con su panoplia, y el arca. Delante del
// altar, colgados de una barra, los cuatro yelmos del toque de alba (el
// puzle: game/ossuaries.js), cada uno con lo suyo debajo: la llave del que
// abre la puerta, la ballesta del que vela en el muro, la bocina del que
// avisa desde lo alto y el cubo del que baja a por el agua.
function buildHermandad(ctx, L, portal) {
  const wb = ctx.wb;
  const O = OSARIO_C;
  const room = 'osario_castillo';
  const YO = O.y,
    OS = O.y + 2.45;
  const SG = YD + 2.35;
  const M = (x, y, z, ry = 0, sc = 1) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V(sc, sc, sc));
  const bake = (parts, m) => bakeParts(wb, parts, m, { room });
  const rng = new RNG(4600);
  const boneT = () => {
    const k = rng.range(-0.1, 0.05);
    return [0.92 + k, 0.88 + k, 0.8 + k];
  };
  const stoneT = [0.64, 0.61, 0.56];
  wb.setRoom(room);

  // la portada desde el rellano, y la escalera que baja, entre dos pretiles
  // coronados de calaveras
  portal('x', O.x1, 0, 2, SG, O.top, 1, 'catacumbas', { rooms: [room, 'catacumbas'], spMat: 'femurs', spTint: [0.7, 0.66, 0.6] });
  stairs(ctx, O.x1 - 2, YO, 0, 'e', 2, 5, 0.18, 0.4, 'ashlar', { solidBelow: true });
  for (const s of [-1, 1]) {
    const z0 = s > 0 ? 1 : -1.24,
      z1 = s > 0 ? 1.24 : -1;
    solid(ctx, 'ashlar', O.x1 - 2.15, YO, z0, O.x1, YD + 0.4, z1, { room, tint: stoneT });
    for (let k = 0; k < 7; k++) bake(skullParts({ jaw: rng.chance(0.5), tint: boneT() }), M(O.x1 - 1.97 + k * 0.29, YD + 0.4 + 0.088, s * 1.12, (s > 0 ? 0 : Math.PI) + rng.range(-0.3, 0.3)));
  }
  // a los lados de la escalera, las pirámides de calaveras (como las balas
  // de piedra de una bombarda)
  for (const s of [-1, 1]) {
    const cx = O.x1 - 0.72,
      cz = s * 2.12;
    for (let lv = 0; lv < 4; lv++) {
      const m = 4 - lv;
      for (let i = 0; i < m; i++)
        for (let j = 0; j < m; j++) {
          const px = cx + (i - (m - 1) / 2) * 0.165,
            pz = cz + (j - (m - 1) / 2) * 0.165;
          const face = lv === 3 ? Math.PI / 2 : Math.atan2(px - cx, pz - cz) + rng.range(-0.35, 0.35);
          bake(skullParts({ jaw: false, tint: boneT() }), M(px, YO + 0.068 + lv * 0.128, pz, face));
        }
    }
    ctx.col.add(cx - 0.34, YO, cz - 0.34, cx + 0.34, YO + 0.52, cz + 0.34);
    // y encima, en el muro, un escudo con dos lanzas cruzadas detrás
    bake(shieldParts({ device: s > 0 ? 'band' : 'cross' }), M(O.x1 - 0.04, YO + 2.0, cz, -Math.PI / 2));
    for (const a of [-0.6, 0.6]) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(a, -Math.PI / 2, 0, 'YXZ'));
      const m = new THREE.Matrix4().compose(V(O.x1 - 0.07, YO + 2.0, cz), q, V(1, 1, 1));
      wb.geometry('wooddark', new THREE.CylinderGeometry(0.016, 0.016, 1.5, 5), m, { ao: false, room });
      bake(spearheadParts(0.26), m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.75, 0)));
    }
  }

  // --- los hermanos, en sus filas: tres repisas en cada muro, en dos tramos
  // a cada lado de un pilar de huesos con su escudo
  const tiers = [YO + 0.52, YO + 1.2, YO + 1.88];
  const bays = [
    [-90.75, -88.85],
    [-88.15, -86.25],
  ];
  for (const s of [-1, 1]) {
    const zw = s * O.z,
      f = -s;
    const rot = f > 0 ? 0 : Math.PI;
    for (const [a0, a1] of bays) {
      tiers.forEach((y, ti) => {
        const zf = zw + f * 0.32;
        wb.box('ashlar', a0, y - 0.1, Math.min(zw, zf), a1, y, Math.max(zw, zf), { room, tint: stoneT, ao: false });
        const n = Math.floor((a1 - a0) / 0.27);
        for (let k = 0; k < n; k++) {
          const x = a0 + ((a1 - a0) * (k + 0.5)) / n + rng.range(-0.02, 0.02);
          // abajo los ballesteros (capacetes), en medio los hombres de armas
          // (bacinetes y cónicos), arriba los peones (cervilleras); alguno,
          // sin nada
          const kind = rng.chance(0.08) ? null : ti === 0 ? (rng.chance(0.75) ? 'kettle' : 'cap') : ti === 1 ? rng.pick(['bascinet', 'nasal', 'bascinet', 'kettle']) : rng.pick(['cap', 'cap', 'nasal', 'kettle']);
          const parts = kind ? helmetedSkullParts(kind, { tint: boneT(), tilt: rng.range(-0.1, 0.06), roll: rng.range(-0.07, 0.07), jaw: rng.chance(0.7), open: rng.range(0, 0.5) }) : skullParts({ tint: boneT(), jaw: rng.chance(0.5), open: rng.range(0.2, 0.9) });
          bake(parts, M(x, y + 0.09, zw + f * 0.17, rot + rng.range(-0.14, 0.14)));
        }
      });
      // velas de difuntos en la repisa de abajo
      P.candles(ctx, (a0 + a1) / 2 + rng.range(-0.4, 0.4), tiers[0], zw + f * 0.28, 2, Math.round(a0 * 17 + s * 5), { room, radius: 3.2, intensity: 0.45, spread: 0.05, scale: 0.7 });
    }
    // el pilar de huesos entre los tramos, con su escudo y su calavera
    const zf = zw + f * 0.36;
    solid(ctx, 'femurs', -88.83, YO, Math.min(zw, zf), -88.17, OS, Math.max(zw, zf), { room, tint: [0.86, 0.82, 0.74] });
    bake(shieldParts({ device: s > 0 ? 'cross' : 'band', tint: s > 0 ? [0.16, 0.14, 0.13] : [0.42, 0.1, 0.08] }), M(-88.5, YO + 1.6, zf + f * 0.035, rot));
    bake(helmetedSkullParts('kettle', { tint: boneT() }), M(-88.5, YO + 0.78, zf + f * 0.09, rot));
    // el letrero, en lo alto del muro
    const band = new THREE.PlaneGeometry(4.5, 0.22);
    wb.geometry(s < 0 ? 'letreroOssos1' : 'letreroOssos2', band, new THREE.Matrix4().compose(V(-88.5, OS - 0.14, zw + f * 0.012), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), V(1, 1, 1)), { ao: false, room, grime: false });
  }

  // los fajones de la bóveda, sobre los pilares de huesos
  archRing(ctx, { axis: 'z', c: 0, w: 2 * O.z - 0.72, y0: OS, rise: 1.78, ring: 0.3, t0: -88.79, t1: -88.21, mat: 'ashlar', room, tint: [0.66, 0.63, 0.58], proud: 0.01 });

  // --- el altar de la Hermandad, con su paño negro, el escudo y la panoplia
  // encima, y el arca (la monta game/ossuaries.js)
  const ax1 = O.x0 + 1.0;
  solid(ctx, 'ashlar', O.x0, YO, -1.0, ax1, YO + 0.95, 1.0, { room, tint: stoneT });
  wb.box('femurs', ax1, YO + 0.1, -0.84, ax1 + 0.02, YO + 0.86, 0.84, { faces: 'e', room, tint: [0.86, 0.82, 0.74], ao: false });
  solid(ctx, 'ashlar', O.x0, YO + 0.95, -1.1, ax1 + 0.08, YO + 1.05, 1.1, { room, tint: [0.72, 0.69, 0.64] });
  wb.box('clothDark', ax1 + 0.08, YO + 0.62, -0.52, ax1 + 0.095, YO + 1.05, 0.52, { faces: 'e', room, ao: false });
  wb.box('clothWhite', ax1 + 0.096, YO + 0.68, -0.035, ax1 + 0.1, YO + 1.0, 0.035, { faces: 'e', room, ao: false, tint: [0.75, 0.72, 0.66] });
  wb.box('clothWhite', ax1 + 0.096, YO + 0.88, -0.14, ax1 + 0.1, YO + 0.94, 0.14, { faces: 'e', room, ao: false, tint: [0.75, 0.72, 0.66] });
  P.candles(ctx, O.x0 + 0.55, YO + 1.05, -0.86, 3, 4611, { room, radius: 4.2, intensity: 0.75, spread: 0.08 });
  P.candles(ctx, O.x0 + 0.55, YO + 1.05, 0.86, 3, 4612, { room, radius: 4.2, intensity: 0.75, spread: 0.08 });
  bake(trophyParts({ seed: 7 }), M(O.x0 + 0.03, YO + 2.72, 0, Math.PI / 2));
  for (const s of [-1, 1]) P.banner(ctx, O.x0 + 0.1, YO + 3.1, s * 1.95, Math.PI / 2, 'bannerBlack', 0.8, 2.0);

  // --- los cuatro yelmos del toque de alba, colgados de una barra que cruza
  // la nave; debajo, cada uno con lo suyo en un cipo, y su vela (apagada)
  const HX = -91.2,
    barY = YO + 2.7;
  wb.geometry('iron', new THREE.CylinderGeometry(0.028, 0.028, 2 * O.z, 6), new THREE.Matrix4().compose(V(HX, barY, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), V(1, 1, 1)), { ao: false, room });
  for (const s of [-1, 1]) wb.box('iron', HX - 0.08, barY - 0.12, s * O.z - (s > 0 ? 0.04 : 0), HX + 0.08, barY + 0.1, s * O.z + (s < 0 ? 0.04 : 0), { room, ao: false });
  const HEL = [
    { z: -2.25, emblem: 'bocina', kind: 'nasal', note: 64 },
    { z: -0.75, emblem: 'llave', kind: 'bascinet', note: 57 },
    { z: 0.75, emblem: 'cubo', kind: 'cap', note: 69 },
    { z: 2.25, emblem: 'ballesta', kind: 'kettle', note: 60 },
  ];
  const top = YO + 0.92;
  for (const h of HEL) {
    // el cipo: basa, fuste y su tablero
    const cT = [0.74, 0.71, 0.66];
    solid(ctx, 'ashlar', HX - 0.29, YO, h.z - 0.29, HX + 0.29, YO + 0.14, h.z + 0.29, { room, tint: cT, ao: false });
    solid(ctx, 'ashlar', HX - 0.2, YO + 0.14, h.z - 0.2, HX + 0.2, YO + 0.78, h.z + 0.2, { room, tint: [0.68, 0.65, 0.6] });
    wb.box('ashlar', HX - 0.25, YO + 0.78, h.z - 0.25, HX + 0.25, YO + 0.84, h.z + 0.25, { room, tint: cT, ao: false });
    solid(ctx, 'ashlar', HX - 0.3, YO + 0.84, h.z - 0.3, HX + 0.3, top, h.z + 0.3, { room, tint: [0.78, 0.75, 0.7], ao: false });
    // una calavera chica en la cara del fuste, mirando a quien tañe
    bake(skullParts({ jaw: false, tint: boneT() }), M(HX + 0.215, YO + 0.5, h.z, Math.PI / 2, 0.8));
    if (h.emblem === 'llave') bake(keyParts(), M(HX + 0.04, top, h.z - 0.02, 0.5));
    else if (h.emblem === 'ballesta') bake(crossbowParts(), M(HX + 0.02, top + 0.002, h.z, Math.PI / 4 + Math.PI, 0.76));
    else if (h.emblem === 'bocina') bake(hornParts(), M(HX + 0.04, top + 0.062, h.z, -0.3).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)));
    else bake(bucketParts(), M(HX + 0.06, top, h.z + 0.02, 0.4));
    // la vela, en la esquina de atrás
    const cx = HX - 0.17,
      cz = h.z + 0.17;
    wb.cylinder('candle', cx, top, cz, 0.032, 0.03, 0.13, 6, { ao: false, capTop: true, grime: false, room });
    wb.cylinder('candle', cx, top, cz, 0.05, 0.034, 0.025, 6, { ao: false, capTop: true, grime: false, room });
    h.candle = [cx, top + 0.165, cz];
    h.x = HX;
    h.y = YO + 1.62;
  }

  // --- la lámpara de la Hermandad: un aro de hierro con calaveras que llevan
  // la vela en la coronilla, y moharras colgando hacia abajo
  {
    const lx = -88.7,
      ly = YO + 3.05,
      r = 0.6;
    bake(chainParts(V(lx, O.top - 0.12, 0), V(lx, ly + 0.55, 0)), null);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      bake(chainParts(V(lx, ly + 0.55, 0), V(lx + Math.cos(a) * r, ly + 0.02, Math.sin(a) * r), 0.05), null);
    }
    const ring = new THREE.TorusGeometry(r, 0.03, 4, 20);
    wb.geometry('iron', ring, new THREE.Matrix4().compose(V(lx, ly, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), V(1, 1, 1)), { ao: false, room });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const px = lx + Math.cos(a) * r,
        pz = Math.sin(a) * r;
      const face = Math.atan2(Math.cos(a), Math.sin(a));
      bake(skullParts({ jaw: true, open: 0.35, tint: boneT() }), M(px, ly + 0.09, pz, face));
      wb.cylinder('candle', px, ly + 0.17, pz, 0.028, 0.028, 0.12, 5, { ao: false, capTop: true, grime: false, room });
      if (ctx.fires) ctx.fires.push({ x: px, y: ly + 0.31, z: pz, s: 0.1, light: false, embers: false, glow: k % 2 === 0 });
      const sm = new THREE.Matrix4().compose(V(px, ly - 0.02, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)), V(1, 1, 1));
      bake(spearheadParts(0.24), sm);
    }
    if (ctx.lights) ctx.lights.push({ x: lx, y: ly + 0.2, z: 0, r: 1, g: 0.6, b: 0.3, radius: 7.5, intensity: 1.05, room });
  }

  // la losa del fundador (el primer alcaide de la Hermandad), con su espada
  wb.box('ashlar', -89.35, YO, -0.48, -88.25, YO + 0.025, 0.48, { room, tint: [0.7, 0.67, 0.62], ao: false });
  wb.box('black', -88.82, YO + 0.026, -0.03, -88.78, YO + 0.027, 0.36, { faces: 't', room, grime: false });
  wb.box('black', -88.95, YO + 0.026, 0.2, -88.65, YO + 0.027, 0.24, { faces: 't', room, grime: false });
  wb.box('black', -88.84, YO + 0.026, -0.36, -88.76, YO + 0.027, -0.03, { faces: 't', room, grime: false });

  // el atril con la Regla de la Hermandad
  {
    const x = -88.45,
      z = -2.3,
      r = 0.65;
    wb.at(x, YO, z, r, () => {
      wb.box('wooddark', -0.22, 0, -0.18, 0.22, 0.06, 0.18, { room, ao: false });
      wb.box('wooddark', -0.05, 0.06, -0.05, 0.05, 1.0, 0.05, { room, ao: false });
      wb.push();
      wb.translate(0, 1.0, 0);
      wb.rotateX(0.42);
      wb.box('wooddark', -0.26, 0, -0.2, 0.26, 0.04, 0.2, { room, ao: false });
      wb.box('wooddark', -0.26, 0.04, 0.17, 0.26, 0.07, 0.2, { room, ao: false });
      wb.pop();
    });
    ctx.col.addOBB(x, z, 0.26, 0.22, r, YO, YO + 1.1);
    L.interact.push({ kind: 'note', id: 'n_hermandad', note: 'hermandad', model: 'book', x: x + Math.sin(r) * 0.02, y: YO + 1.1, z: z + Math.cos(r) * 0.02, r: 1.6 });
  }
  ctx.rats.push({ x: -86.6, y: YO, z: 2.5, n: 2 });
  wb.setRoom(null);

  L.interact.push({ kind: 'examine', id: 'x_osario', text: 'osarioLetrero', x: -88.7, y: YO, z: 0, r: 1.5 });
  // el objeto bendito, en el arca
  const A = { x: O.x0 + 0.5, y: YO + 1.05, z: 0, rot: Math.PI / 2 };
  L.interact.push({ kind: 'item', id: 'i_saeta', item: 'saeta', x: A.x, y: A.y + 0.5, z: A.z, r: 1.7, afterFlag: 'puzzle:castillo' });
  L.puzzles.push({
    kind: 'toque',
    id: 'castillo',
    item: 'i_saeta',
    x: -90,
    y: YO,
    z: 0,
    probe: [-90.6, YO + 1.5, 0],
    barY,
    face: 1,
    order: ['llave', 'ballesta', 'bocina', 'cubo'],
    helmets: HEL,
    arca: A,
  });
}

// Muros de las mazmorras: donde una celda transitable linda con roca, una
// cara mirando hacia dentro; donde linda con otra de techo más bajo o de
// suelo más alto, el trozo que falta (dinteles, el borde de los andenes).
// holes: huecos en esos muros (los nichos), { plane, line, a0, a1, y0, y1 }.
function dungeonWalls(ctx, D, regs, holes = []) {
  const wb = ctx.wb;
  const res = D.res;
  const at = (x, z) => {
    for (const r of regs) if (x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1) return r;
    return null;
  };
  const cell = (i, j) => (i < 0 || j < 0 || i >= D.w || j >= D.h ? 0 : D.cells[j * D.w + i]);
  // tramos por línea: clave -> lista de [a0, a1]
  const runs = new Map();
  const add = (dir, line, a, y0, y1, r) => {
    const k = [dir, line.toFixed(2), y0.toFixed(2), y1.toFixed(2), r.mat, r.room, r.tint ? r.tint.join() : ''].join('|');
    let arr = runs.get(k);
    if (!arr) runs.set(k, (arr = { dir, line, y0, y1, r, segs: [] }));
    arr.segs.push(a);
  };
  for (let j = 0; j < D.h; j++)
    for (let i = 0; i < D.w; i++) {
      if (!cell(i, j)) continue;
      const cx = D.x0 + (i + 0.5) * res,
        cz = D.z0 + (j + 0.5) * res;
      const r = at(cx, cz);
      if (!r) continue;
      for (const [di, dj, dir] of [
        [1, 0, 'e'],
        [-1, 0, 'w'],
        [0, 1, 's'],
        [0, -1, 'n'],
      ]) {
        const ni = i + di,
          nj = j + dj;
        const nr = cell(ni, nj) ? at(D.x0 + (ni + 0.5) * res, D.z0 + (nj + 0.5) * res) : null;
        const line = dir === 'e' ? D.x0 + (i + 1) * res : dir === 'w' ? D.x0 + i * res : dir === 's' ? D.z0 + (j + 1) * res : D.z0 + j * res;
        const a = dir === 'e' || dir === 'w' ? j : i;
        if (!nr) add(dir, line, a, r.y0, r.y1, r);
        else {
          if (nr.y0 > r.y0 + 0.01) add(dir, line, a, r.y0, Math.min(nr.y0, r.y1), r);
          if (nr.y1 < r.y1 - 0.01) add(dir, line, a, Math.max(nr.y1, r.y0), r.y1, r);
        }
      }
    }
  // un rectángulo de muro (u0..u1 a lo largo, y0..y1) menos los huecos
  const pieces = (u0, u1, y0, y1, hs) => {
    let out = [[u0, u1, y0, y1]];
    for (const h of hs) {
      const next = [];
      for (const p of out) {
        if (h.a0 >= p[1] || h.a1 <= p[0] || h.y0 >= p[3] || h.y1 <= p[2]) {
          next.push(p);
          continue;
        }
        if (h.a0 > p[0]) next.push([p[0], h.a0, p[2], p[3]]);
        if (h.a1 < p[1]) next.push([h.a1, p[1], p[2], p[3]]);
        const a = Math.max(p[0], h.a0),
          b = Math.min(p[1], h.a1);
        if (h.y0 > p[2]) next.push([a, b, p[2], h.y0]);
        if (h.y1 < p[3]) next.push([a, b, h.y1, p[3]]);
      }
      out = next;
    }
    return out;
  };
  for (const q of runs.values()) {
    q.segs.sort((p, s) => p - s);
    let s0 = q.segs[0],
      prev = s0;
    const flush = (a0, a1) => {
      const u0 = (q.dir === 'e' || q.dir === 'w' ? D.z0 : D.x0) + a0 * res,
        u1 = (q.dir === 'e' || q.dir === 'w' ? D.z0 : D.x0) + (a1 + 1) * res;
      const o = { faces: { e: 'w', w: 'e', s: 'n', n: 's' }[q.dir], room: q.r.room, tint: q.r.tint, sub: 1.6, aoH: 1.2, aoMin: 0.5, baseY: q.r.y0 };
      const L = q.line;
      const plane = q.dir === 'e' || q.dir === 'w' ? 'x' : 'z';
      const hs = holes.filter((h) => h.plane === plane && Math.abs(h.line - L) < 0.01);
      for (const [p0, p1, y0, y1] of pieces(u0, u1, q.y0, q.y1, hs)) {
        if (q.dir === 'e') wb.box(q.r.mat, L, y0, p0, L + 0.1, y1, p1, o);
        else if (q.dir === 'w') wb.box(q.r.mat, L - 0.1, y0, p0, L, y1, p1, o);
        else if (q.dir === 's') wb.box(q.r.mat, p0, y0, L, p1, y1, L + 0.1, o);
        else wb.box(q.r.mat, p0, y0, L - 0.1, p1, y1, L, o);
      }
    };
    for (let k = 1; k < q.segs.length; k++) {
      if (q.segs[k] === prev + 1) {
        prev = q.segs[k];
        continue;
      }
      flush(s0, prev);
      s0 = prev = q.segs[k];
    }
    flush(s0, prev);
  }
}
