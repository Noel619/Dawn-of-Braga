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
import { house, solid, blocker, stairs, merlons, cityWall, tower, archWall, subtractRects } from './builders.js';
import * as P from './props.js';
import { floor, interiorRoom } from './level_util.js';
import { bakeCorpse } from '../entities/models.js';

const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Suelo de las mazmorras.
const YD = -5;

export const CASTLE = {
  // el patio, dentro de las murallas
  yard: { x0: -90, z0: -20, x1: -51, z1: 20 },
  wallH: 9,
  // la torre del homenaje (esquina noroeste): plantas y muros
  keep: { x0: -93, z0: -23, x1: -73, z1: -3, t: 1.4, F1: 4.5, F2: 9, R: 13.6, slab: 0.4 },
  // la puerta (planta primera, al sur) y el puente levadizo
  door: { x: -82, w: 2.2, h: 2.6 },
  bridge: { w: 2.6, len: 2.7 },
  // el rellano de la escalera exenta, enfrente de la puerta
  landing: { x0: -84.6, x1: -79.4, z0: -0.3, z1: 3.0 },
  // la poterna del adarve (planta segunda, al este)
  postern: { z0: -21.6, z1: -20.2, h: 2.5 },
  // la trampilla del almacén (en la planta primera)
  hatch: { x: -88.2, z: -7.6 },
  // la torre-puerta y su paso en recodo (A: de la calle hacia el oeste; B:
  // hacia el sur, al patio)
  gate: { x0: -59, x1: -48, z0: -7, z1: 5, h: 13, ph: 4.4 },
  // la torre de la cárcel (la escalera de las mazmorras)
  ptower: { x0: -90, x1: -81, z0: 4, z1: 14, t: 1, h: 12 },
  // las mazmorras
  dun: { y: YD, x0: -94, z0: -24, x1: -46, z1: 24 },
  // el pozo del patio (baja al aljibe)
  well: { x: -62.8, z: 13.0 },
  // dónde despierta el jugador
  start: { x: -87.6, y: YD, z: -16.2, yaw: 0 },
};

// Muro macizo (con colisión) a lo largo de 'x' o 'z', de a0 a a1, de t0 a t1
// de grueso y de y0 a y1, con huecos [{ a0, a1, y0, y1 }]: dibuja las caras
// de fuera ('faces') y, en cada hueco, sus jambas, su alféizar y su intradós.
function holedWall(ctx, mat, axis, a0, a1, t0, t1, y0, y1, holes, faces, o = {}) {
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
function beam3(ctx, mat, a, b, w, o = {}) {
  const d = new THREE.Vector3().subVectors(b, a);
  const L = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
  const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, V(w, L, o.d ?? w));
  ctx.wb.geometry(mat, new THREE.BoxGeometry(1, 1, 1), m, { ao: false, room: o.room, tint: o.tint });
}

// Parapeto con albardilla (y su colisión).
function parapet(ctx, x0, z0, x1, z1, y, h = 0.95, o = {}) {
  solid(ctx, o.mat ?? 'wallstone', x0, y, z0, x1, y + h, z1, { sub: 2, ao: false, faces: o.faces ?? 'nsew', room: o.room });
  ctx.wb.box('ashlar', x0 - 0.05, y + h, z0 - 0.05, x1 + 0.05, y + h + 0.12, z1 + 0.05, { ao: false, faces: 'tnsewb', room: o.room });
}

// Saetera: hendidura negra en una cara (dir: hacia dónde mira la cara).
function slit(ctx, x, y, z, dir, h = 1.2) {
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
  buildKeep(ctx, S, L);
  buildYard(ctx, S, L, rng);
  buildPrisonTower(ctx, S, L);
  buildDungeon(ctx, D, L);

  // --- zonas
  const K = CASTLE.keep;
  const ix0 = K.x0 + K.t,
    ix1 = K.x1 - K.t,
    iz0 = K.z0 + K.t,
    iz1 = K.z1 - K.t;
  const G = CASTLE.gate,
    T = CASTLE.ptower;
  L.zones.push(
    { id: 'homenaje_almacen', rects: [[ix0, iz0, ix1, iz1, -0.5, K.F1 - 0.2]], atmo: 'interior', room: 'homenaje0' },
    {
      id: 'homenaje_guardia',
      rects: [
        [ix0, iz0, ix1, iz1, K.F1 - 0.2, K.F2 - 0.2],
        [-83.1, iz1, -80.9, K.z1, K.F1 - 0.2, K.F2 - 1],
      ],
      atmo: 'interior',
      room: 'homenaje1',
    },
    {
      id: 'homenaje_alcaide',
      rects: [
        [ix0, iz0, ix1, iz1, K.F2 - 0.2, K.R - 0.3],
        [ix1, -21.6, K.x1, -20.2, K.F2 - 0.2, K.F2 + 2],
      ],
      atmo: 'interior',
      room: 'homenaje2',
    },
    { id: 'homenaje_terraza', rects: [[K.x0, K.z0, K.x1, K.z1 + 0.8, K.R - 0.3, K.R + 10]], atmo: 'ramparts' },
    { id: 'torre_carcel', rects: [[T.x0 + T.t, T.z0 + T.t, T.x1 - T.t, T.z1 - T.t, -1, 4]], atmo: 'prison', room: 'torre_carcel' },
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
    ...['homenaje_almacen', 'homenaje_guardia', 'homenaje_alcaide', 'homenaje_terraza'].map((id) => ({ id, r: [K.x0, K.z0, K.x1, K.z1], label: 'homenaje' })),
    { id: 'castle_gate', r: [G.x0, G.z0, G.x1, G.z1] },
    { id: 'castle_chapel', r: [-60, -20, -52, -14] },
    { id: 'cuartel', r: [-80, 13, -66, 20] },
    { id: 'torre_carcel', r: [T.x0, T.z0, T.x1, T.z1] }
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
  // pretil hacia el patio (con el hueco por donde llegaba la escalera)
  parapet(ctx, -71, -20.5, -52.5, -20, H);
  // restos de los cadalsos: canes de madera que asoman por fuera
  for (let x = -71.5; x < -50; x += 1.6) {
    if (x > cx0 - 0.5 && x < cx1 + 0.5) continue;
    wb.box('wooddark', x - 0.1, H - 0.9, -23.9, x + 0.1, H - 0.65, -23, { ao: false });
  }
  for (const [a, b] of [
    [-70.6, -66.2],
    [-55.8, -52.4],
  ])
    wb.box('planks', a, H - 0.68, -23.9, b, H - 0.62, -23.02, { ao: false, faces: 'tnsewb', tint: [0.7, 0.62, 0.55] });
  // la escalera del adarve, contra la muralla: se vino abajo por en medio
  {
    const n = 30,
      rise = H / n,
      run = 0.42;
    const xb = K.x1 + n * run; // pie (al este)
    const zc = -19.25;
    for (let i = 0; i < n; i++) {
      if (i >= 10 && i <= 20) continue;
      const xa = xb - run * (i + 1),
        xr = xb - run * i;
      const top = rise * (i + 1);
      // (el tramo de arriba descansa en su macizo; el de abajo, en el suyo)
      solid(ctx, 'wallstone', xa, 0, -20, xr, top, -18.5, { sub: 2, aoH: 1.5, faces: 'tnsew' });
    }
    // los peldaños caídos, al pie del hueco
    P.rubble(ctx, xb - 15.5 * run, 0, zc + 0.6, 12, 4405, 2.2, { mat: 'wallstone', scale: 1.3 });
    P.siegeStone(ctx, xb - 13.8 * run, 0, zc + 1.6, 0.55);
    L.interact.push({ kind: 'examine', id: 'x_escalera', text: 'escaleraRota', x: xb - 9.5 * run, y: 0, z: zc + 1.4, r: 2.4 });
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
  // rastrillo medio alzado en su ranura
  for (let z = -1.15; z <= 1.16; z += 0.46) wb.box('iron', -49.7, 2.7, z - 0.04, -49.5, ph, z + 0.04, { ao: false });
  for (let y = 2.9; y < ph; y += 0.5) wb.box('iron', -49.72, y, -1.3, -49.48, y + 0.07, 1.3, { ao: false });
  for (let z = -1.15; z <= 1.16; z += 0.46) wb.box('iron', -49.66, 2.4, z - 0.02, -49.54, 2.7, z + 0.02, { ao: false });
  // buhederas en la bóveda y saeteras a los lados del paso
  for (const x of [-51.4, -53.6]) wb.box('black', x - 0.3, ph - 0.02, -0.3, x + 0.3, ph - 0.01, 0.3, { faces: 'b', ao: false, grime: false });
  wb.box('black', -54.7, ph - 0.02, 2.9, -54.1, ph - 0.01, 3.5, { faces: 'b', ao: false, grime: false });
  for (const x of [-51.2, -53.8]) {
    slit(ctx, x, 1.2, -1.4, 's');
    slit(ctx, x, 1.2, 1.4, 'n');
  }
  slit(ctx, -55.8, 1.2, 0, 'e');
  // las puertas de dentro: una hoja abierta contra el muro, la otra en el suelo
  wb.box('planks', -55.75, 0.05, 3.1, -55.6, 3.4, 4.4, { ao: false, faces: 'tnsewb', tint: [0.7, 0.62, 0.55] });
  for (const y of [0.6, 2.6]) wb.box('iron', -55.6, y, 3.12, -55.56, y + 0.08, 4.38, { ao: false });
  wb.at(-52.6, 0.04, 7.0, 0.5, () => {
    wb.box('planks', -0.7, 0, -1.7, 0.7, 0.14, 1.7, { ao: false, faces: 'tnsewb', tint: [0.62, 0.55, 0.5] });
    for (const z of [-1.1, 1.1]) wb.box('iron', -0.72, 0.14, z - 0.04, 0.72, 0.17, z + 0.04, { ao: false });
  });
  // la tranca, partida
  wb.at(-51.6, 0.08, 6.2, 1.2, () => wb.box('wooddark', -1.1, 0, -0.08, 1.1, 0.16, 0.08, { ao: false }));
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
  P.cart(ctx, -52.8, 0, 11.2, 1.9, { tipped: true });
  P.barrel(ctx, -52.2, 0, 13.4, {});
  P.barrel(ctx, -53.1, 0, 13.9, { lying: true, rot: 0.6 });
  P.sacks(ctx, -59.6, 0, 9.6, 4, 4410);
  for (const [x, z, r] of [
    [-61.6, 11.4, 0.2],
    [-57.6, 12.2, -0.3],
  ])
    chevaux(ctx, x, z, r);
  P.pike(ctx, -51.8, 0, 6.4, { tilt: 0.1, skull: true });
  P.brazier(ctx, -59.8, 0, 4.4);
}

// Caballo de frisa: un madero con estacas cruzadas.
function chevaux(ctx, x, z, rot) {
  const wb = ctx.wb;
  wb.at(x, 0, z, rot, () => {
    wb.cylinder('wooddark', 0, 0.55, -1.6, 0.11, 0.11, 3.2, 6, { ao: false });
  });
  const c = Math.cos(rot),
    s = Math.sin(rot);
  for (let i = 0; i < 5; i++) {
    const t = -1.3 + i * 0.65;
    const px = x + s * t,
      pz = z + c * t;
    for (const k of [-1, 1]) {
      const dx = c * k,
        dz = -s * k;
      beam3(ctx, 'timber', V(px - dx * 0.75, 0.05, pz - dz * 0.75), V(px + dx * 0.75, 1.15, pz + dz * 0.75), 0.08);
    }
  }
  P.colOBB(ctx, x, z, 0.75, 1.75, rot, 0, 1.15);
}

// ------------------------------------------------------------------------ la torre del homenaje
function buildKeep(ctx, S, L) {
  const wb = ctx.wb;
  const K = CASTLE.keep;
  const { x0, z0, x1, z1, t, F1, F2, R } = K;
  const SL = K.slab;
  const ix0 = x0 + t,
    ix1 = x1 - t,
    iz0 = z0 + t,
    iz1 = z1 - t;
  const DR = CASTLE.door,
    PO = CASTLE.postern;
  const dx0 = DR.x - DR.w / 2,
    dx1 = DR.x + DR.w / 2;
  // a ras de suelo: maciza salvo el almacén; y el paso de la puerta de
  // arriba (la colisión de lo no transitable sube hasta 5,2 m)
  S.paint(CASTLE.yard.x0, CASTLE.yard.z0, x1, z1, 0);
  W(S, ix0, iz0, ix1, iz1);
  W(S, dx0, iz1, dx1, z1);

  // --- muros (la puerta del puente al sur, la poterna al este)
  holedWall(ctx, 'wallstone', 'x', x0, x1, z0, iz0, 0, R, [], 'nwe');
  holedWall(ctx, 'wallstone', 'x', x0, x1, iz1, z1, 0, R, [{ a0: dx0, a1: dx1, y0: F1, y1: F1 + DR.h }], 'swe');
  holedWall(ctx, 'wallstone', 'z', iz0, iz1, x0, ix0, 0, R, [], 'w');
  holedWall(ctx, 'wallstone', 'z', iz0, iz1, ix1, x1, 0, R, [{ a0: PO.z0, a1: PO.z1, y0: F2, y1: F2 + PO.h }], 'e');
  // (la jamba norte de la poterna es el muro norte)
  wb.box('wallstone', ix1, F2, iz0, x1, F2 + PO.h, iz0 + 0.01, { faces: 's', sub: 2 });
  // caras de dentro, planta a planta (cada una con su luz)
  const tint = [0.74, 0.72, 0.68];
  interiorRoom(ctx, ix0, iz0, ix1, iz1, 0, F1, { wall: 'wallstone', t: 0.15, room: 'homenaje0', floor: false, ceil: false, beams: false, skirting: false, tint: [0.62, 0.6, 0.57] });
  interiorRoom(ctx, ix0, iz0, ix1, iz1, F1, F2 - F1, {
    wall: 'wallstone',
    t: 0.15,
    room: 'homenaje1',
    floor: false,
    ceil: false,
    beams: false,
    skirting: false,
    tint,
    doors: [{ side: 's', at: DR.x, w: DR.w, h: DR.h }],
  });
  interiorRoom(ctx, ix0, iz0, ix1, iz1, F2, R - F2, {
    wall: 'wallstone',
    t: 0.15,
    room: 'homenaje2',
    floor: false,
    ceil: false,
    beams: false,
    skirting: false,
    tint,
    doors: [{ side: 'e', at: (PO.z0 + PO.z1) / 2, w: PO.z1 - PO.z0, h: PO.h }],
  });

  // --- forjados: tablas sobre una viga maestra y pilares de sillería
  // (los huecos, largos: que no se dé con la cabeza en el forjado al bajar)
  const stairHole = [-75.9, -12.5, ix1, -7.9]; // escalera de la primera a la segunda
  const roofHole = [-84.9, iz0, -80.6, -20.1]; // escalera de la segunda a la terraza
  wb.box('flag', ix0, -0.1, iz0, ix1, 0, iz1, { faces: 't', ao: false, uv: 0.7, room: 'homenaje0', tint: [0.78, 0.76, 0.72] });
  const slab = (yTop, holes, roomTop, roomBot) => {
    for (const r of subtractRects([ix0, iz0, ix1, iz1], holes)) {
      wb.box('planks', r[0], yTop - 0.05, r[1], r[2], yTop, r[3], { faces: 't', ao: false, uv: 0.7, room: roomTop });
      wb.box('wooddark', r[0], yTop - SL, r[1], r[2], yTop - SL + 0.02, r[3], { faces: 'b', ao: false, room: roomBot, tint: [0.62, 0.56, 0.5] });
      ctx.col.add(r[0], yTop - SL, r[1], r[2], yTop, r[3]).cam = true;
    }
    // canto del forjado en los huecos
    for (const h of holes) {
      if (h[0] > ix0 + 0.01) wb.box('wooddark', h[0] - 0.02, yTop - SL, h[1], h[0], yTop, h[3], { faces: 'e', ao: false, room: roomBot });
      if (h[2] < ix1 - 0.01) wb.box('wooddark', h[2], yTop - SL, h[1], h[2] + 0.02, yTop, h[3], { faces: 'w', ao: false, room: roomBot });
      if (h[1] > iz0 + 0.01) wb.box('wooddark', h[0], yTop - SL, h[1] - 0.02, h[2], yTop, h[1], { faces: 's', ao: false, room: roomBot });
      if (h[3] < iz1 - 0.01) wb.box('wooddark', h[0], yTop - SL, h[3], h[2], yTop, h[3] + 0.02, { faces: 'n', ao: false, room: roomBot });
    }
    // viga maestra (de norte a sur, sobre los pilares) y viguetas
    const yb = yTop - SL;
    const mz0 = holes.some((h) => h[0] < -82.7 && h[2] > -83.3 && h[1] <= iz0 + 0.01) ? -19.8 : iz0;
    wb.box('timber', -83.25, yb - 0.38, mz0, -82.75, yb, iz1, { ao: false, faces: 'nsewb', room: roomBot });
    for (let z = iz0 + 0.9; z < iz1 - 0.4; z += 1.45) {
      const cut = holes.find((h) => z > h[1] - 0.15 && z < h[3] + 0.15);
      const segs = cut ? subtractRects([ix0, z - 0.1, ix1, z + 0.1], [[cut[0] - 0.1, z - 1, cut[2] + 0.1, z + 1]]) : [[ix0, z - 0.1, ix1, z + 0.1]];
      for (const r of segs) wb.box('wooddark', r[0], yb - 0.2, r[1], r[2], yb, r[3], { ao: false, faces: 'nsewb', room: roomBot });
    }
  };
  slab(F1, [], 'homenaje1', 'homenaje0');
  slab(F2, [stairHole], 'homenaje2', 'homenaje1');
  // la terraza: losas sobre toda la torre (muros incluidos)
  for (const r of subtractRects([x0, z0, x1, z1], [roofHole])) {
    wb.box('flag', r[0], R - 0.05, r[1], r[2], R, r[3], { faces: 't', ao: false, uv: 0.8 });
    ctx.col.add(Math.max(r[0], ix0), R - SL, Math.max(r[1], iz0), Math.min(r[2], ix1), R, Math.min(r[3], iz1)).cam = true;
  }
  for (const r of subtractRects([ix0, iz0, ix1, iz1], [roofHole]))
    wb.box('wooddark', r[0], R - SL, r[1], r[2], R - SL + 0.02, r[3], { faces: 'b', ao: false, room: 'homenaje2', tint: [0.62, 0.56, 0.5] });
  wb.box('wooddark', roofHole[0], R - SL, roofHole[3], roofHole[2], R, roofHole[3] + 0.02, { faces: 'n', ao: false, room: 'homenaje2' });
  wb.box('wooddark', roofHole[0] - 0.02, R - SL, roofHole[1], roofHole[0], R, roofHole[3], { faces: 'e', ao: false, room: 'homenaje2' });
  {
    const yb = R - SL;
    wb.box('timber', -83.25, yb - 0.38, -19.8, -82.75, yb, iz1, { ao: false, faces: 'nsewb', room: 'homenaje2' });
    wb.box('timber', roofHole[0] - 0.3, yb - 0.38, -20.1, roofHole[2], yb, -19.8, { ao: false, faces: 'nsewb', room: 'homenaje2' });
    for (let z = -19.0; z < iz1 - 0.4; z += 1.45) wb.box('wooddark', ix0, yb - 0.2, z - 0.1, ix1, yb, z + 0.1, { ao: false, faces: 'nsewb', room: 'homenaje2' });
  }
  // pilares (en cada planta)
  for (const [y0, y1, room] of [
    [0, F1 - SL, 'homenaje0'],
    [F1, F2 - SL, 'homenaje1'],
    [F2, R - SL, 'homenaje2'],
  ])
    for (const z of [-15.9, -10.1]) {
      wb.box('ashlar', -83.6, y0, z - 0.6, -82.4, y0 + 0.35, z + 0.6, { sub: 2, aoH: 0.3, room });
      wb.box('ashlar', -83.45, y0 + 0.35, z - 0.45, -82.55, y1 - 0.45, z + 0.45, { sub: 2, aoH: 1.2, room, faces: 'nsew' });
      wb.box('ashlar', -83.7, y1 - 0.45, z - 0.7, -82.3, y1 - 0.38, z + 0.7, { ao: false, room });
      ctx.col.add(-83.45, y0, z - 0.45, -82.55, y1, z + 0.45);
    }

  // --- escaleras
  // de la primera a la segunda, de piedra contra el muro este
  stairs(ctx, -75.15, F1, -6.2, 'n', 1.5, 15, (F2 - F1) / 15, 0.42, 'wallstone', { solidBelow: true });
  // su barandilla arriba (al oeste y al sur del hueco)
  {
    const yb = F2;
    wb.box('wooddark', -76.0, yb + 0.92, stairHole[1], -75.88, yb + 1.0, stairHole[3], { ao: false, faces: 'tnsewb', room: 'homenaje2' });
    wb.box('wooddark', -76.0, yb + 0.92, stairHole[3] - 0.08, ix1, yb + 1.0, stairHole[3] + 0.04, { ao: false, faces: 'tnsewb', room: 'homenaje2' });
    for (let z = stairHole[1] + 0.5; z < stairHole[3]; z += 0.85) wb.box('wooddark', -76.0, yb, z - 0.05, -75.9, yb + 0.92, z + 0.05, { ao: false, room: 'homenaje2' });
    for (let x = -75.6; x < ix1; x += 0.7) wb.box('wooddark', x - 0.05, yb, stairHole[3] - 0.06, x + 0.05, yb + 0.92, stairHole[3] + 0.04, { ao: false, room: 'homenaje2' });
    ctx.col.add(-76.05, yb, stairHole[1], -75.85, yb + 1.0, stairHole[3] + 0.05);
    ctx.col.add(-76.05, yb, stairHole[3] - 0.1, ix1, yb + 1.0, stairHole[3] + 0.05);
  }
  // de la segunda a la terraza, contra el muro norte (sube al oeste y sale
  // a la caseta de la terraza)
  stairs(ctx, -78.6, F2, -20.85, 'w', 1.5, 15, (R - F2) / 15, 0.42, 'wallstone', { solidBelow: true });

  // --- lo alto: parapeto, almenas, la caseta de la escalera y el matacán
  const PH = 1.0;
  const cs = { x0: -88.4, x1: -80.0, z0: z0 + 0.5, z1: -18.8, h: 2.9 };
  const mt = { x0: -84.4, x1: -79.6, z1: z1 + 0.8 };
  // cornisa (por fuera)
  for (const [a, b, c, d] of [
    [x0 - 0.3, z0 - 0.3, x1 + 0.3, z0],
    [x0 - 0.3, z1, mt.x0, z1 + 0.3],
    [mt.x1, z1, x1 + 0.3, z1 + 0.3],
    [x0 - 0.3, z0, x0, z1],
    [x1, z0, x1 + 0.3, z1],
  ])
    wb.box('ashlar', a, R - 0.6, b, c, R, d, { ao: false, sub: 3, faces: 'tnsewb' });
  // parapeto (norte: la caseta lo interrumpe; sur: el matacán)
  const pw = (a, b, c, d, f = 'nsew') => {
    solid(ctx, 'wallstone', a, R, b, c, R + PH, d, { sub: 2, ao: false, faces: f });
    blocker(ctx, a, R, b, c, R + 2.4, d);
  };
  pw(x0, z0, cs.x0, z0 + 0.5);
  pw(cs.x1, z0, x1, z0 + 0.5);
  pw(x0, z1 - 0.5, mt.x0 + 0.5, z1);
  pw(mt.x1 - 0.5, z1 - 0.5, x1, z1);
  pw(x0, z0 + 0.5, x0 + 0.5, z1 - 0.5);
  pw(x1 - 0.5, z0 + 0.5, x1, z1 - 0.5);
  merlons(ctx, x0, z0 + 0.25, cs.x0, z0 + 0.25, R + PH, { collide: false, t: 0.5 });
  merlons(ctx, cs.x1, z0 + 0.25, x1, z0 + 0.25, R + PH, { collide: false, t: 0.5 });
  merlons(ctx, x0, z1 - 0.25, mt.x0 + 0.5, z1 - 0.25, R + PH, { collide: false, t: 0.5 });
  merlons(ctx, mt.x1 - 0.5, z1 - 0.25, x1, z1 - 0.25, R + PH, { collide: false, t: 0.5 });
  merlons(ctx, x0 + 0.25, z0 + 0.5, x0 + 0.25, z1 - 0.5, R + PH, { collide: false, t: 0.5 });
  merlons(ctx, x1 - 0.25, z0 + 0.5, x1 - 0.25, z1 - 0.5, R + PH, { collide: false, t: 0.5 });
  // el matacán: balcón de piedra sobre ménsulas encima de la puerta, con
  // las buhederas en el suelo (para tirar sobre el que suba al rellano)
  {
    wb.box('flag', mt.x0 + 0.5, R - 0.05, z1, mt.x1 - 0.5, R, mt.z1 - 0.5, { faces: 't', ao: false });
    ctx.col.add(mt.x0 + 0.5, R - 0.5, z1, mt.x1 - 0.5, R, mt.z1 - 0.5);
    // frente y costados del balcón
    solid(ctx, 'wallstone', mt.x0, R - 1.3, mt.z1 - 0.5, mt.x1, R + PH, mt.z1, { sub: 2, faces: 'tnsewb' });
    solid(ctx, 'wallstone', mt.x0, R - 1.3, z1, mt.x0 + 0.5, R + PH, mt.z1 - 0.5, { sub: 2, faces: 'tnswb' });
    solid(ctx, 'wallstone', mt.x1 - 0.5, R - 1.3, z1, mt.x1, R + PH, mt.z1 - 0.5, { sub: 2, faces: 'tnseb' });
    blocker(ctx, mt.x0, R, mt.z1 - 0.5, mt.x1, R + 2.4, mt.z1);
    merlons(ctx, mt.x0, mt.z1 - 0.25, mt.x1, mt.z1 - 0.25, R + PH, { collide: false, t: 0.5, w: 0.8, gap: 0.55 });
    // las buhederas: huecos entre losas (por ellos se ve el rellano, abajo)
    wb.box('wallstone', mt.x0 + 0.5, R - 1.3, z1, mt.x1 - 0.5, R - 1.25, mt.z1 - 0.5, { faces: 'b', ao: false });
    for (const x of [-82.9, -82.0, -81.1]) wb.box('black', x - 0.2, R + 0.01, z1 + 0.05, x + 0.2, R + 0.012, mt.z1 - 0.55, { faces: 't', ao: false, grime: false });
    for (let x = mt.x0 + 0.3; x < mt.x1; x += 1.05) {
      wb.box('ashlar', x - 0.18, R - 1.9, mt.z1 - 0.6, x + 0.18, R - 1.3, mt.z1 - 0.05, { ao: false });
      wb.box('ashlar', x - 0.14, R - 2.4, z1, x + 0.14, R - 1.9, z1 + 0.35, { ao: false });
    }
  }
  // la caseta de la escalera (esquina noroeste de la terraza)
  {
    const top = R + cs.h;
    solid(ctx, 'wallstone', cs.x0, R, z0, cs.x1, top, cs.z0, { sub: 2, faces: 'nsew' });
    solid(ctx, 'wallstone', cs.x0, R, cs.z0, cs.x0 + 0.5, top, cs.z1, { sub: 2, faces: 'nsew' });
    solid(ctx, 'wallstone', cs.x1 - 0.5, R, cs.z0, cs.x1, top, cs.z1, { sub: 2, faces: 'nsew' });
    holedWall(ctx, 'wallstone', 'x', cs.x0 + 0.5, cs.x1 - 0.5, cs.z1 - 0.5, cs.z1, R, top, [{ a0: -87.4, a1: -85.8, y0: R, y1: R + 2.3 }], 'ns', { sub: 2 });
    // tejadillo a un agua (de teja por encima)
    wb.quad('roof', V(cs.x0 - 0.3, top + 0.6, z0 - 0.3), V(cs.x1 + 0.3, top + 0.6, z0 - 0.3), V(cs.x1 + 0.3, top - 0.05, cs.z1 + 0.4), V(cs.x0 - 0.3, top - 0.05, cs.z1 + 0.4), { ao: false, sub: 2 });
    wb.quad('wooddark', V(cs.x0 - 0.3, top - 0.17, cs.z1 + 0.4), V(cs.x1 + 0.3, top - 0.17, cs.z1 + 0.4), V(cs.x1 + 0.3, top + 0.48, z0 - 0.3), V(cs.x0 - 0.3, top + 0.48, z0 - 0.3), {
      ao: false,
      sub: 3,
      tint: [0.5, 0.48, 0.45],
    });
    ctx.col.add(cs.x0, top, z0, cs.x1, top + 0.7, cs.z1).cam = true;
    // dentro: el hueco de la escalera, con su pretil
    wb.box('wooddark', roofHole[0], R, roofHole[3], roofHole[2], R + 0.95, roofHole[3] + 0.1, { ao: false });
    ctx.col.add(roofHole[0], R, roofHole[3], roofHole[2], R + 1.0, roofHole[3] + 0.12);
    P.wallTorch(ctx, cs.x0 + 0.5, R + 2.0, -20.9, 'e', { radius: 5 });
  }
  // los demás huecos: saeteras en cada planta y la ventana geminada de la
  // sala del alcaide, mirando al patio
  for (const y of [1.6, F1 + 1.4, F2 + 1.4]) {
    for (const x of [-89.5, -76.5]) {
      slit(ctx, x, y, z0, 'n');
      if ((y !== F1 + 1.4 || Math.abs(x - DR.x) > 2) && (y !== F2 + 1.4 || Math.abs(x + 76.2) > 1)) slit(ctx, x, y, z1, 's');
    }
    for (const z of [-17.5, -8.5]) {
      slit(ctx, x0, y, z, 'w');
      if (y !== F2 + 1.4 || z > -19) slit(ctx, x1, y, z, 'e');
    }
  }
  for (const x of [-88.2, -76.2]) {
    wb.box('black', x - 0.62, F2 + 1.0, z1 + 0.02, x + 0.62, F2 + 2.7, z1 + 0.03, { ao: false, grime: false });
    wb.box('ashlar', x - 0.78, F2 + 0.85, z1, x + 0.78, F2 + 1.0, z1 + 0.18, { ao: false });
    wb.box('ashlar', x - 0.06, F2 + 1.0, z1 + 0.02, x + 0.06, F2 + 2.6, z1 + 0.1, { ao: false });
    for (const s of [-1, 1]) wb.box('ashlar', x + s * 0.7 - 0.08, F2 + 1.0, z1, x + s * 0.7 + 0.08, F2 + 2.8, z1 + 0.12, { ao: false });
    wb.box('ashlar', x - 0.78, F2 + 2.8, z1, x + 0.78, F2 + 2.95, z1 + 0.14, { ao: false });
  }
  P.banner(ctx, -86.2, R - 1.0, z1 + 0.12, 0, 'bannerBlack', 1.6, 4.8);
  P.banner(ctx, x1 + 0.12, R - 1.0, -12.5, Math.PI / 2, 'bannerBlack', 1.6, 4.8);

  // --- la puerta: arco de sillería, el rellano y la escalera exenta
  {
    const LD = CASTLE.landing;
    // dovelas alrededor del vano
    wb.box('ashlar', dx0 - 0.3, F1, z1, dx0, F1 + DR.h + 0.3, z1 + 0.1, { ao: false });
    wb.box('ashlar', dx1, F1, z1, dx1 + 0.3, F1 + DR.h + 0.3, z1 + 0.1, { ao: false });
    wb.box('ashlar', dx0 - 0.3, F1 + DR.h, z1, dx1 + 0.3, F1 + DR.h + 0.45, z1 + 0.12, { ao: false, faces: 'tnsewb' });
    // agujeros de las cadenas del puente
    for (const x of [DR.x - 1.15, DR.x + 1.15]) wb.box('black', x - 0.09, F1 + 3.72, z1 + 0.005, x + 0.09, F1 + 3.9, z1 + 0.01, { ao: false, grime: false });
    // el rellano: un macizo de piedra con su pretil
    solid(ctx, 'wallstone', LD.x0, 0, LD.z0, LD.x1, F1, LD.z1, { sub: 2.2, aoH: 2, faces: 'tnsew', mats: { t: 'flag' } });
    const bw = CASTLE.bridge.w;
    parapet(ctx, LD.x0, LD.z0, LD.x0 + 0.4, LD.z1, F1, 1.0);
    parapet(ctx, LD.x0 + 0.4, LD.z1 - 0.4, LD.x1, LD.z1, F1, 1.0);
    parapet(ctx, LD.x0 + 0.4, LD.z0, DR.x - bw / 2, LD.z0 + 0.4, F1, 1.0);
    parapet(ctx, DR.x + bw / 2, LD.z0, LD.x1, LD.z0 + 0.4, F1, 1.0);
    // la escalera: del patio (al este) al rellano, entre dos pretiles
    const n = 15,
      run = 0.5,
      rise = F1 / n;
    const xb = LD.x1 + n * run;
    stairs(ctx, xb, 0, (LD.z0 + 0.4 + LD.z1 - 0.4) / 2, 'w', LD.z1 - LD.z0 - 0.8, n, rise, run, 'wallstone', { solidBelow: true });
    for (let i = 0; i < n; i++) {
      const xa = xb - run * (i + 1),
        xr = xb - run * i;
      const y1 = rise * (i + 1) + 1.0;
      solid(ctx, 'wallstone', xa, 0, LD.z0, xr, y1, LD.z0 + 0.4, { sub: 2, ao: false, faces: 'tnsew' });
      solid(ctx, 'wallstone', xa, 0, LD.z1 - 0.4, xr, y1, LD.z1, { sub: 2, ao: false, faces: 'tnsew' });
    }
    P.brazier(ctx, LD.x0 + 1.0, F1, LD.z1 - 1.0, {});
    // el puente levadizo y el aviso de que está alzado
    L.interact.push(
      {
        kind: 'bridge',
        id: 'b_homenaje',
        flag: 'puente:homenaje',
        x: DR.x - 4.7,
        y: F1,
        z: iz1 - 2.3,
        r: 2.0,
        hinge: [DR.x, F1, z1],
        w: bw,
        len: LD.z0 - z1,
        anchors: [
          [DR.x - 1.15, F1 + 3.8, z1 + 0.02],
          [DR.x + 1.15, F1 + 3.8, z1 + 0.02],
        ],
      },
      { kind: 'examine', id: 'x_puente', text: 'puenteAlzado', x: DR.x, y: F1, z: LD.z0 + 0.9, r: 2.2, unless: 'puente:homenaje' }
    );
  }

  // --- el almacén (planta baja): los víveres del asedio
  {
    const room = 'homenaje0';
    wb.setRoom(room);
    const rr = new RNG(4421);
    // trigo en sacos, en hileras
    for (let x = -90.6; x < -85; x += 1.35) for (const z of [-20.5, -19.2]) P.sacks(ctx, x, 0, z, 5, Math.round(-x * 10 + z));
    for (const z of [-17.5, -16.2]) P.sacks(ctx, -90.6, 0, z, 4, Math.round(z * 7));
    // toneles de vino y de agua, y tinajas de aceite
    for (let z = -20.4; z < -13; z += 1.15) P.cask(ctx, -75.6, 0, z, Math.PI / 2, { r: 0.52 });
    for (const [x, z] of [
      [-78.6, -20.6],
      [-79.6, -20.7],
      [-80.6, -20.5],
      [-78.9, -19.6],
    ])
      P.barrel(ctx, x, 0, z, {});
    for (const [x, z, s] of [
      [-90.5, -12.0, 1.3],
      [-90.6, -10.6, 1.2],
      [-90.4, -9.2, 1.35],
      [-89.3, -11.3, 1.1],
    ])
      P.jar(ctx, x, 0, z, s);
    // cecina y tocino colgados de las viguetas
    for (let x = -88; x < -78; x += 1.3) {
      const z = -13.2 + rr.range(-0.3, 0.3);
      wb.box('burlap', x - 0.01, 2.6, z - 0.01, x + 0.01, F1 - SL - 0.2, z + 0.01, { ao: false, room, tint: [0.7, 0.62, 0.5] });
      P.ellipsoid(ctx, 'flesh', x, 2.35, z, 0.18, 0.38, 0.12, [0.55, 0.36, 0.3], { room });
    }
    // leña y haces de virotes
    P.firewood(ctx, -86.4, 0, -5.4, 0, 4);
    P.firewood(ctx, -83.9, 0, -5.4, 0, 3);
    for (const [x, z] of [
      [-79.0, -5.3],
      [-77.6, -5.4],
    ]) {
      P.crate(ctx, x, 0, z, 0.8, 0.1);
      for (let k = 0; k < 14; k++) {
        const row = Math.floor(k / 7);
        wb.box('timber', x - 0.32 + (k % 7) * 0.1 + row * 0.05, 0.8 + row * 0.04, z - 0.25 + row * 0.12, x - 0.3 + (k % 7) * 0.1 + row * 0.05, 0.84 + row * 0.04, z + 0.25 + row * 0.12, {
          ao: false,
          room,
        });
      }
    }
    // el pozo de la torre (baja al aljibe): brocal, polea y cubo
    {
      const px = -77.4,
        pz = -8.0;
      wb.cylinder('wallstone', px, 0, pz, 0.9, 0.9, 0.85, 12, { sub: 2, room });
      wb.cylinder('ashlar', px, 0.85, pz, 0.95, 0.95, 0.1, 12, { ao: false, room });
      wb.cylinder('black', px, 0.9, pz, 0.68, 0.68, 0.02, 12, { ao: false, capTop: true, grime: false, room });
      for (const s of [-1, 1]) wb.box('wooddark', px + s * 0.8 - 0.07, 0.95, pz - 0.07, px + s * 0.8 + 0.07, 2.5, pz + 0.07, { ao: false, room });
      wb.box('wooddark', px - 0.95, 2.4, pz - 0.07, px + 0.95, 2.55, pz + 0.07, { ao: false, room });
      wb.box('burlap', px - 0.01, 1.3, pz - 0.01, px + 0.01, 2.4, pz + 0.01, { ao: false, room, tint: [0.8, 0.7, 0.55] });
      wb.cylinder('planks', px, 1.0, pz, 0.16, 0.19, 0.3, 8, { ao: false, capBot: true, room });
      ctx.col.add(px - 0.9, 0, pz - 0.9, px + 0.9, 1.0, pz + 0.9);
    }
    // la escalera de mano a la trampilla y su marco por debajo
    const HT = CASTLE.hatch;
    P.ladder(ctx, HT.x - 0.62, 0, HT.z, F1 - SL - 0.05, Math.PI / 2, 0.1);
    wb.box('wooddark', HT.x - 0.62, F1 - SL - 0.04, HT.z - 0.62, HT.x + 0.62, F1 - SL, HT.z + 0.62, { ao: false, faces: 'b', room });
    P.lantern(ctx, -83.0, 0, -12.6, 0, true, { room });
    P.hangingLamp(ctx, -80.6, F1 - SL, -16.0, { room, len: 0.9, radius: 7 });
    bakeCorpse(wb, -87.6, 0, -14.0, 1.0, 'curl', 'soldier', 31);
    P.decal(ctx, -87.6, 0.01, -14.0, 1.8);
    P.bones(ctx, -88.2, 0, -12.8, 5, 4423, 0.5);
    ctx.rats.push({ x: -89.4, y: 0, z: -18.4, n: 3 }, { x: -79.0, y: 0, z: -17.0, n: 2 });
    // quesos y hogazas en estantes, sogas, la muela de mano para el trigo
    for (const x of [-84.2, -80.6]) {
      P.shelf(ctx, x, 0, iz1 - 0.25, Math.PI, 1.8);
      for (let k = 0; k < 5; k++) P.ellipsoid(ctx, k % 2 ? 'bone' : 'straw', x - 0.7 + k * 0.35, 1.12, iz1 - 0.3, 0.14, 0.08, 0.14, k % 2 ? [0.95, 0.85, 0.55] : [0.75, 0.5, 0.3], { room });
    }
    for (const [x, z] of [
      [-90.6, -6.0],
      [-90.2, -7.1],
    ])
      for (let k = 0; k < 4; k++) wb.cylinder('rope', x, 0.02 + k * 0.07, z, 0.36 - k * 0.04, 0.36 - k * 0.04, 0.07, 10, { ao: false, room });
    {
      const qx = -86.4,
        qz = -10.8;
      wb.cylinder('wallstone', qx, 0, qz, 0.45, 0.45, 0.35, 10, { ao: false, room });
      wb.cylinder('ashlar', qx, 0.36, qz, 0.42, 0.42, 0.14, 10, { ao: false, room });
      beam3(ctx, 'wooddark', V(qx + 0.3, 0.5, qz), V(qx + 0.3, 0.85, qz), 0.05, { room });
      P.sacks(ctx, qx + 1.1, 0, qz + 0.4, 2, 4425);
      ctx.col.add(qx - 0.45, 0, qz - 0.45, qx + 0.45, 0.5, qz + 0.45);
    }
    // tablones y vigas para remendar puertas y cadalsos
    for (let k = 0; k < 5; k++) wb.box('planks', -90.9, 0.02 + k * 0.08, -16.0 + (k % 2) * 0.1, -88.2, 0.09 + k * 0.08, -15.4 + (k % 2) * 0.1, { ao: false, room, tint: [0.75, 0.68, 0.6] });
    ctx.col.add(-90.9, 0, -16.0, -88.2, 0.5, -15.3);
    P.wallTorch(ctx, -82.4, 2.2, iz0, 's', { room, radius: 7 });
    P.wallTorch(ctx, ix1, 2.2, -11.6, 'w', { room, radius: 6 });
    wb.setRoom(null);
  }

  // --- el cuerpo de guardia y la armería (planta primera)
  {
    const room = 'homenaje1';
    const y = F1;
    wb.setRoom(room);
    // el torno del puente levadizo, al oeste de la puerta: un tambor entre
    // dos caballetes; las cadenas suben por el muro hasta encima del vano
    {
      const wx = DR.x - 4.7,
        tz = iz1 - 1.0;
      for (const s of [-1, 1]) {
        const x = wx + s * 1.75;
        beam3(ctx, 'wooddark', V(x, y, tz - 0.45), V(x, y + 1.25, tz), 0.16, { room });
        beam3(ctx, 'wooddark', V(x, y, tz + 0.45), V(x, y + 1.25, tz), 0.16, { room });
        // manivelas (cuatro radios)
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + 0.4;
          beam3(ctx, 'wooddark', V(x + s * 0.18, y + 1.1, tz), V(x + s * 0.18, y + 1.1 + Math.cos(a) * 0.62, tz + Math.sin(a) * 0.62), 0.07, { room });
        }
      }
      wb.push();
      wb.translate(wx, y + 1.1, tz);
      wb.rotateZ(Math.PI / 2);
      wb.cylinder('wooddark', 0, -1.7, 0, 0.26, 0.26, 3.4, 10, { ao: false, capTop: true, capBot: true, room });
      for (const u of [-1.2, 1.2]) wb.cylinder('iron', 0, u - 0.18, 0, 0.3, 0.3, 0.36, 10, { ao: false, room });
      wb.pop();
      // las cadenas, del tambor a los agujeros de encima de la puerta
      for (const [xd, xh] of [
        [wx + 0.9, DR.x - 1.15],
        [wx + 1.4, DR.x + 1.15],
      ]) {
        const a = V(xd, y + 1.35, tz + 0.1),
          b = V(xh, y + 3.8, iz1 - 0.04);
        const n = 18;
        for (let k = 0; k < n; k++) {
          const p0 = a.clone().lerp(b, k / n),
            p1 = a.clone().lerp(b, (k + 0.8) / n);
          beam3(ctx, 'iron', p0, p1, 0.06, { room, d: k % 2 ? 0.02 : 0.06 });
        }
      }
      // el freno: una palanca de hierro
      beam3(ctx, 'iron', V(wx - 1.95, y, tz - 0.3), V(wx - 2.15, y + 1.05, tz - 0.55), 0.06, { room });
      ctx.col.add(wx - 1.95, y, tz - 0.5, wx + 1.95, y + 1.4, tz + 0.5);
    }
    // la guardia de la puerta: banco, brasero y lanzas a mano (al este)
    P.bench(ctx, -78.9, y, iz1 - 0.55, 1.8, 0);
    P.weaponRack(ctx, -77.1, y, iz1 - 0.3, Math.PI);
    // la armería: lanzas, picas, ballestas, escudos y yelmos contra el muro norte
    for (const x of [-89.6, -87.6, -85.6]) P.weaponRack(ctx, x, y, iz0 + 0.32, 0);
    for (let x = -81.4; x < -76.6; x += 0.95) {
      // escudos apoyados
      wb.at(x, y, iz0 + 0.25, 0, () => {
        wb.box('planks', -0.33, 0, -0.04, 0.33, 0.85, 0.04, { ao: false, faces: 'tnsewb', tint: [0.6, 0.5, 0.42], room });
        wb.box('iron', -0.06, 0.38, 0.04, 0.06, 0.5, 0.08, { ao: false, room });
      });
    }
    // ballestas y aljabas en un tablero de clavos
    wb.box('planks', -81.6, y + 1.5, iz0, -76.8, y + 2.6, iz0 + 0.06, { ao: false, room, tint: [0.62, 0.55, 0.48] });
    for (let x = -81.1; x < -77; x += 0.9) {
      beam3(ctx, 'wooddark', V(x, y + 1.6, iz0 + 0.1), V(x, y + 2.45, iz0 + 0.1), 0.07, { room });
      beam3(ctx, 'wooddark', V(x - 0.32, y + 2.25, iz0 + 0.1), V(x + 0.32, y + 2.25, iz0 + 0.1), 0.06, { room });
    }
    // estante de yelmos y un maniquí con la cota
    P.shelf(ctx, ix0 + 0.25, y, -13.2, Math.PI / 2, 1.8);
    P.armorStand(ctx, -88.8, y, -9.6, Math.PI / 2);
    // haces de lanzas y toneles de virotes
    for (const [x, z] of [
      [-80.0, -17.8],
      [-78.6, -17.6],
    ]) {
      P.barrel(ctx, x, y, z, {});
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        beam3(ctx, 'timber', V(x + Math.cos(a) * 0.18, y + 0.9, z + Math.sin(a) * 0.18), V(x + Math.cos(a) * 0.24, y + 1.35, z + Math.sin(a) * 0.24), 0.03, { room });
      }
    }
    // la mesa de la guardia (dados y escudillas) y la piedra de afilar
    P.table(ctx, -80.0, y, -12.6, 1.8, 0.9, Math.PI / 2);
    P.bench(ctx, -80.9, y, -12.6, 1.6, Math.PI / 2);
    P.stool(ctx, -78.9, y, -13.2, { room });
    P.jar(ctx, -80.1, y + 0.82, -12.9, 0.55);
    P.candles(ctx, -79.9, y + 0.82, -12.2, 3, 4431, { room, radius: 5, intensity: 1.0, spread: 0.2 });
    // la trampilla del almacén, con la polea para subir los sacos
    {
      const HT = CASTLE.hatch;
      wb.box('wooddark', HT.x - 0.62, y, HT.z - 0.62, HT.x + 0.62, y + 0.03, HT.z + 0.62, { ao: false, faces: 'tnsew', room });
      wb.box('timber', HT.x - 0.15, F2 - SL - 0.6, iz0 + 0.1, HT.x + 0.15, F2 - SL - 0.3, HT.z + 0.4, { ao: false, faces: 'nsewb', room });
      wb.cylinder('wooddark', HT.x, F2 - SL - 0.95, HT.z, 0.18, 0.18, 0.3, 8, { ao: false, room });
      wb.box('burlap', HT.x - 0.01, y + 1.4, HT.z - 0.01, HT.x + 0.01, F2 - SL - 0.9, HT.z + 0.01, { ao: false, room, tint: [0.8, 0.7, 0.55] });
      P.sacks(ctx, HT.x + 1.2, y, HT.z - 1.4, 3, 4432);
    }
    // caídos de la última guardia
    bakeCorpse(wb, -84.6, y, -8.6, 2.2, 'back', 'soldier', 32);
    P.decal(ctx, -84.6, y + 0.01, -8.6, 2.0);
    bakeCorpse(wb, -77.4, y, -16.2, -1.0, 'sit', 'soldier', 33);
    P.dropped(ctx, -82.4, y, -7.4, 1.4, 'shield');
    P.dropped(ctx, -86.8, y, -15.2, 0.6, 'spear');
    P.wallTorch(ctx, ix0, y + 2.2, -16.5, 'e', { room, radius: 7 });
    P.wallTorch(ctx, ix1, y + 2.2, -16.8, 'w', { room, radius: 7 });
    P.wallTorch(ctx, -86.0, y + 2.2, iz1, 'n', { room, radius: 6, dyn: 2.2 });
    P.hangingLamp(ctx, -79.4, F2 - SL, -11.0, { room, len: 0.9, radius: 7.5 });
    // picas largas apoyadas en el muro oeste
    for (let k = 0; k < 9; k++) {
      const z = -20.6 + k * 0.42;
      beam3(ctx, 'timber', V(ix0 + 0.9, y, z), V(ix0 + 0.12, y + 3.6, z + 0.05), 0.05, { room });
      wb.box('iron', ix0 + 0.1, y + 3.55, z - 0.03, ix0 + 0.16, y + 3.85, z + 0.07, { ao: false, room });
    }
    ctx.col.add(ix0, y, -20.8, ix0 + 0.95, y + 1.6, -17.0);
    // cajas de flechas y el banco del flechero (astiles, plumas, puntas)
    for (const [x, z] of [
      [-84.4, -19.9],
      [-83.4, -19.9],
    ]) {
      P.crate(ctx, x, y, z, 0.75, 0);
      for (let k = 0; k < 12; k++)
        wb.box('timber', x - 0.3 + (k % 6) * 0.1, y + 0.75, z - 0.2 + Math.floor(k / 6) * 0.25, x - 0.28 + (k % 6) * 0.1, y + 1.05, z - 0.18 + Math.floor(k / 6) * 0.25, { ao: false, room });
    }
    P.table(ctx, -86.6, y, -17.6, 1.6, 0.8, 0);
    for (let k = 0; k < 16; k++)
      wb.box('timber', -87.2 + (k % 8) * 0.14, y + 0.82, -17.9 + Math.floor(k / 8) * 0.25, -87.18 + (k % 8) * 0.14, y + 0.835, -17.4 + Math.floor(k / 8) * 0.25, { ao: false, room });
    for (let k = 0; k < 6; k++) wb.box('clothWhite', -86.0 + k * 0.08, y + 0.82, -17.3, -85.96 + k * 0.08, y + 0.83, -17.15, { ao: false, faces: 't', room });
    P.stool(ctx, -86.6, y, -16.8, { room });
    wb.setRoom(null);
  }

  // --- la sala del alcaide (planta segunda): el mando de la defensa
  {
    const room = 'homenaje2';
    const y = F2;
    wb.setRoom(room);
    // la mesa del plano: la ciudad dibujada sobre un pergamino, con fichas
    P.table(ctx, -79.6, y, -14.2, 2.8, 1.6, 0);
    wb.box('clothWhite', -80.85, y + 0.83, -14.85, -78.35, y + 0.845, -13.55, { ao: false, faces: 't', tint: [0.86, 0.76, 0.56], room });
    {
      const r2 = new RNG(4441);
      // murallas y calles en tinta
      for (const [a, b, c, d] of [
        [-80.7, -14.75, -78.5, -14.7],
        [-80.7, -13.7, -78.5, -13.65],
        [-80.7, -14.75, -80.65, -13.65],
        [-78.55, -14.75, -78.5, -13.65],
        [-80.3, -14.3, -78.8, -14.26],
        [-79.6, -14.75, -79.56, -13.65],
      ])
        wb.box('black', a, y + 0.846, b, c, y + 0.849, d, { ao: false, faces: 't', grime: false, room });
      // fichas: rojas los de fuera, blancas las nuestras
      for (let k = 0; k < 12; k++) {
        const ox = r2.range(-80.6, -78.6),
          oz = r2.range(-14.7, -13.7);
        wb.box(k < 7 ? 'clothRed' : 'bone', ox - 0.03, y + 0.846, oz - 0.03, ox + 0.03, y + 0.9, oz + 0.03, { ao: false, room });
      }
    }
    P.bench(ctx, -79.6, y, -15.3, 2.4, 0);
    P.candles(ctx, -78.4, y + 0.84, -13.7, 3, 4442, { room, radius: 5, intensity: 1.0, spread: 0.15 });
    // el escritorio del alcaide (muerto sobre sus cuentas) junto a la ventana
    P.table(ctx, -88.0, y, -6.6, 1.6, 0.9, 0);
    bakeCorpse(wb, -88.3, y + 0.02, -7.5, 0, 'sit', 'soldier', 23);
    P.decal(ctx, -88.3, y + 0.01, -7.7, 1.4);
    P.candles(ctx, -87.3, y + 0.82, -6.4, 3, 5208, { room, radius: 5, intensity: 1.1, spread: 0.15 });
    // el arca de la paga, los libros de la guarnición y el estandarte
    wb.box('wooddark', -90.9, y, -19.8, -89.3, y + 0.62, -19.1, { ao: false, room });
    for (const x of [-90.6, -89.6]) wb.box('iron', x - 0.04, y, -19.82, x + 0.04, y + 0.64, -19.08, { ao: false, room });
    ctx.col.add(-90.9, y, -19.8, -89.3, y + 0.62, -19.1);
    P.shelf(ctx, ix0 + 0.25, y, -15.4, Math.PI / 2, 1.8);
    P.shelf(ctx, ix0 + 0.25, y, -12.8, Math.PI / 2, 1.8);
    P.banner(ctx, -83.0, y + 2.6, iz1 - 0.12, Math.PI, 'bannerBlack', 1.4, 2.8);
    // la armadura del alcaide y su chimenea
    P.armorStand(ctx, -86.4, y, iz1 - 0.6, Math.PI);
    P.hearth(ctx, ix0, y, -9.8, 'e', { room, lit: true });
    P.weaponRack(ctx, -76.6, y, iz1 - 0.3, Math.PI);
    P.dropped(ctx, -84.6, y, -11.6, 2.6, 'sword');
    P.wallTorch(ctx, -83.0, y + 2.3, iz0, 's', { room, radius: 7 });
    P.wallTorch(ctx, ix1, y + 2.3, -7.6, 'w', { room, radius: 6 });
    P.hangingLamp(ctx, -79.6, R - SL, -14.2, { room, len: 1.0, radius: 8 });
    P.hangingLamp(ctx, -86.6, R - SL, -8.6, { room, len: 0.9, radius: 6 });
    // la mesa del consejo, junto a la chimenea
    P.table(ctx, -77.6, y, -7.4, 2.6, 1.1, 0);
    P.bench(ctx, -77.6, y, -8.3, 2.4, 0);
    P.bench(ctx, -77.6, y, -6.5, 2.4, Math.PI);
    for (const x of [-78.6, -77.3]) P.jar(ctx, x, y + 0.82, -7.3, 0.5);
    for (const [x, z, r] of [
      [-76.8, -7.6, 0.3],
      [-78.0, -7.2, -0.2],
    ])
      wb.at(x, y + 0.83, z, r, () => wb.box('clothWhite', -0.22, 0, -0.16, 0.22, 0.01, 0.16, { ao: false, faces: 't', tint: [0.9, 0.82, 0.62], room }));
    // el atril del libro de la guarnición
    {
      const lx = -76.8,
        lz = -12.4;
      wb.box('wooddark', lx - 0.06, y, lz - 0.06, lx + 0.06, y + 1.0, lz + 0.06, { ao: false, room });
      wb.box('wooddark', lx - 0.3, y, lz - 0.2, lx + 0.3, y + 0.06, lz + 0.2, { ao: false, room });
      wb.at(lx, y + 1.0, lz, 0, () => {
        wb.push();
        wb.rotateX(-0.45);
        wb.box('wooddark', -0.3, 0, -0.22, 0.3, 0.05, 0.22, { ao: false, room });
        wb.box('clothWhite', -0.26, 0.05, -0.18, 0.26, 0.07, 0.18, { ao: false, faces: 't', tint: [0.88, 0.8, 0.6], room });
        wb.pop();
      });
      ctx.col.add(lx - 0.3, y, lz - 0.25, lx + 0.3, y + 1.1, lz + 0.25);
    }
    // el tapiz de la ciudad sobre el arca y papeles por el suelo
    wb.box('clothRed', -90.8, y + 1.2, iz0 + 0.02, -88.0, y + 3.4, iz0 + 0.05, { ao: false, faces: 's', tint: [0.7, 0.5, 0.45], room });
    wb.box('gold', -89.5, y + 2.1, iz0 + 0.05, -89.3, y + 2.6, iz0 + 0.06, { ao: false, faces: 's', room });
    for (const [x, z, r] of [
      [-87.0, -8.4, 0.6],
      [-86.2, -9.2, 2.0],
      [-88.8, -9.0, 1.1],
    ])
      wb.at(x, y + 0.005, z, r, () => wb.box('clothWhite', -0.2, 0, -0.14, 0.2, 0.01, 0.14, { ao: false, faces: 't', tint: [0.88, 0.8, 0.62], room }));
    wb.setRoom(null);
    L.interact.push(
      { kind: 'item', id: 'i_manivela', item: 'manivela', x: -87.7, y: y + 0.86, z: -6.55 },
      { kind: 'note', id: 'n_alcaide', note: 'alcaide', x: -88.4, y: y + 0.84, z: -6.4, model: 'paper' },
      { kind: 'note', id: 'n_guarnicion', note: 'guarnicion', x: -76.8, y: y + 1.12, z: -12.4, model: 'paper' },
      { kind: 'item', id: 'i_relicario3', item: 'relicario', x: -90.1, y: y + 0.75, z: -19.45 },
      { kind: 'door', id: 'd_poterna', x: (ix1 + x1) / 2, y, z: (PO.z0 + PO.z1) / 2, w: PO.z1 - PO.z0, h: PO.h, axis: 'z', lock: { type: 'none' }, mat: 'planks', hinge: 1, swing: 1, plane: ix1 }
    );
  }

  // --- la terraza (aquí se peleará con la Bestia de Carne): amplia, con
  // el fanal, la asta de la bandera, piedras para tirar y una caldera
  {
    // el fanal de la torre, apagado (esquina sudeste)
    const bx = x1 - 2.4,
      bz = z1 - 2.4;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      wb.box('iron', bx + Math.cos(a) * 0.5 - 0.05, R, bz + Math.sin(a) * 0.5 - 0.05, bx + Math.cos(a) * 0.5 + 0.05, R + 1.3, bz + Math.sin(a) * 0.5 + 0.05, { ao: false });
    }
    wb.cylinder('iron', bx, R + 1.2, bz, 0.42, 0.72, 0.5, 8, { ao: false, capBot: true });
    wb.cylinder('black', bx, R + 1.66, bz, 0.68, 0.68, 0.02, 8, { ao: false, capTop: true, grime: false });
    ctx.col.add(bx - 0.75, R, bz - 0.75, bx + 0.75, R + 1.75, bz + 0.75);
    P.firewood(ctx, bx - 2.2, R, bz + 0.4, 0, 3);
    // la asta con la bandera hecha jirones (esquina nordeste)
    wb.cylinder('wooddark', x1 - 2.2, R, z0 + 2.2, 0.12, 0.09, 6.5, 6, { ao: false });
    ctx.col.add(x1 - 2.35, R, z0 + 2.05, x1 - 2.05, R + 6.5, z0 + 2.35);
    P.banner(ctx, x1 - 2.2, R + 6.2, z0 + 2.32, 0, 'bannerBlack', 1.6, 2.4);
    // la caldera de la pez sobre su trébede, junto al matacán
    {
      const cx = -86.0,
        cz = z1 - 1.6;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        beam3(ctx, 'iron', V(cx + Math.cos(a) * 0.7, R, cz + Math.sin(a) * 0.7), V(cx, R + 1.4, cz), 0.06);
      }
      wb.cylinder('iron', cx, R + 0.45, cz, 0.42, 0.5, 0.55, 10, { ao: false, capBot: true });
      wb.cylinder('black', cx, R + 0.98, cz, 0.48, 0.48, 0.02, 10, { ao: false, capTop: true, grime: false });
      ctx.col.add(cx - 0.6, R, cz - 0.6, cx + 0.6, R + 1.1, cz + 0.6);
      P.firewood(ctx, cx - 0.1, R, cz, 0.4, 2);
    }
    // montones de piedras junto al parapeto
    const rr = new RNG(4451);
    for (const [px, pz] of [
      [x0 + 1.4, -16.0],
      [x0 + 1.4, -9.0],
      [x1 - 1.4, -15.5],
      [-78.0, z0 + 1.3],
    ]) {
      for (let k = 0; k < 7; k++) {
        const r = 0.18 + rr.range(0, 0.1);
        wb.geometry(
          'wallstone',
          new THREE.SphereGeometry(1, 6, 5),
          new THREE.Matrix4().compose(V(px + rr.range(-0.45, 0.45), R + r * (k > 4 ? 2.4 : 0.9), pz + rr.range(-0.45, 0.45)), new THREE.Quaternion(), V(r, r * 0.85, r)),
          { ao: false }
        );
      }
      ctx.col.add(px - 0.6, R, pz - 0.6, px + 0.6, R + 0.75, pz + 0.6);
    }
    // restos de la última defensa
    bakeCorpse(wb, -79.0, R, -8.0, 2.4, 'back', 'soldier', 34);
    P.decal(ctx, -79.0, R + 0.01, -8.0, 2.4);
    P.decal(ctx, -84.0, R + 0.01, -13.5, 3.2);
    P.dropped(ctx, -88.6, R, -6.2, 0.8, 'helmet');
    P.arrows(ctx, -82.0, R, -16.0, 10, 4452, 2.4);
    P.brazier(ctx, x0 + 1.2, R, z1 - 1.2, {});
  }

  // --- criaturas de la torre
  L.enemies.push(
    { type: 'penitent', x: -88.4, y: 0, z: -18.2, yaw: 0.6, idle: 'eat', id: 'e_alm1' },
    { type: 'soldier', x: -80.4, y: F1, z: -15.2, yaw: -0.4, idle: 'stand', id: 'e_arm1' },
    { type: 'soldier', x: -85.6, y: F1, z: -11.4, yaw: 2.6, idle: 'wander', id: 'e_arm2' },
    { type: 'mourner', x: -82.4, y: F2, z: -9.0, yaw: 1.6, idle: 'stand', id: 'e_alc1' }
  );
  // (el almacén, por la trampilla de la guardia)
  const HT = CASTLE.hatch;
  L.interact.push(
    { kind: 'hatch', id: 'h_almacen_arriba', end: 'top', flag: 'hatch:almacen', x: HT.x, y: F1, z: HT.z, r: 1.6, to: [HT.x + 0.75, 0, HT.z, Math.PI / 2] },
    { kind: 'hatch', id: 'h_almacen_abajo', end: 'bottom', flag: 'hatch:almacen', x: HT.x - 0.3, y: 0, z: HT.z, r: 1.6, to: [HT.x + 1.0, F1, HT.z, Math.PI / 2] },
    { kind: 'item', id: 'i_ampolla5', item: 'ampolla', x: -86.3, y: 0.95, z: -5.25 }
  );
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
  floor(ctx, -64.8, 8.2, -61.2, 10.6, 'flag', 0.02);

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
  P.well(ctx, CASTLE.well.x, 0, CASTLE.well.z);
  for (const [x, z] of [
    [-66.6, 9.2],
    [-61.6, 9.8],
  ])
    P.barrel(ctx, x, 0, z, {});
  trebuchet(ctx, -66.2, -9.2);
  // bolaños para el fundíbulo
  {
    const rr = new RNG(4480);
    for (let k = 0; k < 11; k++) {
      const r = 0.28 + rr.range(0, 0.08);
      const row = k < 6 ? 0 : k < 9 ? 1 : 2;
      wb.geometry(
        'wallstone',
        new THREE.SphereGeometry(1, 7, 5),
        new THREE.Matrix4().compose(V(-62.4 + (k % 3) * 0.55 + row * 0.25, r + row * 0.42, -12.4 + Math.floor((k % 6) / 3) * 0.55 + row * 0.2), new THREE.Quaternion(), V(r, r * 0.92, r)),
        { ao: false }
      );
    }
    ctx.col.add(-62.8, 0, -12.8, -60.8, 1.1, -11.0);
  }
  // el patio de armas: muñecos, dianas, carros, piedras de los de fuera
  P.dummy(ctx, -64.6, 0, 4.6, 0.3);
  P.dummy(ctx, -62.0, 0, 5.4, -0.4);
  P.target(ctx, -89.4, 0, 16.6, Math.PI / 2);
  P.target(ctx, -89.4, 0, 18.4, Math.PI / 2);
  P.siegeStone(ctx, -69.4, 0, -6.4, 0.5);
  P.siegeStone(ctx, -61.4, 0, -4.6, 0.42);
  P.siegeStone(ctx, -86.4, 0, 2.6, 0.48);
  P.arrows(ctx, -65, 0, -2, 8, 21);
  P.arrows(ctx, -77, 0, 12.2, 6, 22);
  P.dropped(ctx, -63.2, 0, 1.8, 0.7, 'sword');
  P.dropped(ctx, -67.4, 0, 3.9, 2.1, 'shield');
  P.dropped(ctx, -58.8, 0, -5.4, 1.2, 'helmet');
  P.dropped(ctx, -84.4, 0, 3.4, 0.3, 'spear');
  P.dropped(ctx, -60.5, 0, 2.6, 2.6, 'axe');
  // agua para los incendios
  for (const [x, z] of [
    [-89.3, -1.6],
    [-89.4, 0.0],
    [-71.6, -19.4],
  ])
    P.barrel(ctx, x, 0, z, {});
  P.basket(ctx, -88.6, 0, 1.2, { tipped: true, rot: 2 });
  P.brazier(ctx, -70, 0, -2.4);
  P.brazier(ctx, -56, 0, 3.8);
  P.brazier(ctx, -86.6, 0, 3.6);
  bakeCorpse(wb, -60, 0, -3, 1.2, 'back', 'soldier', 2);
  bakeCorpse(wb, -66.5, 0, 6.5, -0.8, 'face', 'soldier', 3);
  bakeCorpse(wb, -79.6, 0, 4.2, 2.2, 'face', 'villager', 5);
  bakeCorpse(wb, -52.6, 0, -2.8, 0.2, 'sit', 'soldier', 6);
  P.decal(ctx, -60, 0.02, -3, 2.5);
  P.decal(ctx, -66.5, 0.02, 6.5, 2.2);
  P.decal(ctx, -71, 0.02, 1, 1.8);
  P.fleshGrowth(ctx, -89.6, 0, 1.6, 1.0, 52, { climb: 1.2 });
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
// En el patio, contra la muralla oeste: el cuerpo de guardia de la cárcel y
// la escalera que baja a las mazmorras.
function buildPrisonTower(ctx, S, L) {
  const wb = ctx.wb;
  const T = CASTLE.ptower;
  const { x0, x1, z0, z1, t, h } = T;
  const ix0 = x0 + t,
    ix1 = x1 - t,
    iz0 = z0 + t,
    iz1 = z1 - t;
  const room = 'torre_carcel';
  const dz0 = 7.3,
    dz1 = 8.7;
  S.paint(x0, z0, x1, z1, 0);
  W(S, ix0, iz0, ix1, iz1);
  W(S, ix1, dz0, x1 + 0.6, dz1);
  const F = 4.0;
  holedWall(ctx, 'wallstone', 'x', x0, x1, z0, iz0, 0, h, [], 'nwe');
  holedWall(ctx, 'wallstone', 'x', x0, x1, iz1, z1, 0, h, [], 'swe');
  holedWall(ctx, 'wallstone', 'z', iz0, iz1, x0, ix0, 0, h, [], 'w');
  holedWall(ctx, 'wallstone', 'z', iz0, iz1, ix1, x1, 0, h, [{ a0: dz0, a1: dz1, y0: 0, y1: 2.4 }], 'e');
  interiorRoom(ctx, ix0, iz0, ix1, iz1, 0, F, {
    wall: 'wallstone',
    t: 0.15,
    room,
    floor: false,
    ceil: false,
    beams: false,
    skirting: false,
    tint: [0.66, 0.64, 0.6],
    doors: [{ side: 'e', at: (dz0 + dz1) / 2, w: dz1 - dz0, h: 2.4 }],
  });
  // techo (encima, macizo hasta lo alto)
  wb.box('wooddark', ix0, F, iz0, ix1, F + 0.05, iz1, { faces: 'b', ao: false, room, tint: [0.6, 0.55, 0.5] });
  for (let x = ix0 + 0.9; x < ix1 - 0.4; x += 1.4) wb.box('timber', x - 0.12, F - 0.25, iz0, x + 0.12, F, iz1, { ao: false, faces: 'nsewb', room });
  solid(ctx, 'wallstone', ix0, F, iz0, ix1, h, iz1, { faces: '', collide: true }).cam = true;
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
  // el suelo, con el hueco de la escalera de las mazmorras (al sur)
  const hole = [-89, 11, -85, 13];
  for (const r of subtractRects([ix0, iz0, ix1, iz1], [hole])) wb.box('flag', r[0], -0.1, r[1], r[2], 0, r[3], { faces: 't', ao: false, room, uv: 0.6 });
  ctx.floorHoles.push(hole);
  // pretil del hueco (por el norte y por el este; se sale por arriba, junto
  // al muro)
  parapet(ctx, -87.5, 10.7, -85, 11, 0, 0.9, { room });
  parapet(ctx, -85.3, 11, -85, iz1, 0, 0.9, { room });
  // el cuerpo de guardia: la mesa del registro, el clavijero de las llaves
  wb.setRoom(room);
  P.table(ctx, -85.0, 0, 6.4, 1.6, 0.8, 0);
  P.stool(ctx, -85.0, 0, 7.3, { room });
  P.candles(ctx, -84.6, 0.82, 6.3, 3, 4490, { room, radius: 4.5, intensity: 1.0, spread: 0.15 });
  wb.box('planks', -88.95, 1.3, 6.0, -88.9, 2.0, 7.6, { ao: false, room, tint: [0.62, 0.55, 0.48] });
  for (let z = 6.2; z < 7.5; z += 0.3) wb.box('iron', -88.9, 1.55, z - 0.02, -88.75, 1.62, z + 0.02, { ao: false, room });
  P.weaponRack(ctx, -86.0, 0, iz1 - 0.3, Math.PI);
  P.barrel(ctx, -88.3, 0, 9.6, {});
  P.ladder(ctx, -82.6, 0, 6.0, F - 0.1, -Math.PI / 2, 0.12);
  bakeCorpse(wb, -83.6, 0, 9.9, -2.4, 'back', 'soldier', 37);
  P.decal(ctx, -83.6, 0.01, 9.9, 1.8);
  P.wallTorch(ctx, ix0, 2.2, 9.0, 'e', { room, radius: 6 });
  P.wallTorch(ctx, -83.0, 1.6, iz1, 'n', { room, radius: 5, intensity: 0.8 });
  wb.setRoom(null);
  P.banner(ctx, x1 + 0.12, 8.6, 9, Math.PI / 2, 'bannerBlack', 1.3, 3.2);
  L.interact.push({
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
  });
}

// ------------------------------------------------------------------------ las mazmorras
// Regiones (rectángulos en la rejilla de 0,5 m): suelo, techo, material de
// los muros y sala (para la luz). Los muros se levantan solos donde lo
// transitable linda con la roca (y los dinteles, donde el techo baja).
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
    uv: o.uv,
  });
  const mazT = [0.62, 0.6, 0.57],
    catT = [0.6, 0.62, 0.56];
  const regs = [
    // el pasillo de las celdas y las celdas
    R(-89, -18, -75.5, -6, -1.5, 'wallstone', 'mazmorra', { tint: mazT }),
    R(-75.5, -12.5, -75, -11.5, YD + 2.3, 'wallstone', 'mazmorra', { tint: mazT }),
    // el cuarto del carcelero
    R(-75, -15, -67, -8.5, -1.5, 'wallstone', 'mazmorra', { tint: mazT }),
    // la sala del tormento
    R(-67, -12, -66.5, -11, YD + 2.2, 'wallstone', 'tormento', { tint: mazT }),
    R(-66.5, -14, -61, -9, -1.8, 'wallstone', 'tormento', { tint: [0.6, 0.55, 0.52] }),
    // la bajada a las catacumbas
    R(-72, -8.5, -70, -1, YD + 2.6, 'mossstone', 'catacumbas', { tint: catT }),
    // las catacumbas: galería principal, tres travesías, la del sur y el osario
    R(-84, -1, -60, 1, YD + 2.8, 'mossstone', 'catacumbas', { tint: catT }),
    R(-82, 1, -80, 4, YD + 2.8, 'mossstone', 'catacumbas', { tint: catT }),
    R(-72, 1, -70, 4, YD + 2.8, 'mossstone', 'catacumbas', { tint: catT }),
    R(-62, 1, -60, 4, YD + 2.8, 'mossstone', 'catacumbas', { tint: catT }),
    R(-82, 4, -60, 6, YD + 2.8, 'mossstone', 'catacumbas', { tint: catT }),
    R(-88, -2, -84, 2, YD + 3.0, 'skulls', 'catacumbas', { tint: [0.85, 0.82, 0.78] }),
    // al aljibe
    R(-66, 6, -64, 8, YD + 2.6, 'mossstone', 'aljibe', { tint: catT }),
    // el aljibe: andenes y estanque
    R(-72, 8, -58, 9.5, -1.3, 'ashlar', 'aljibe', { tint: [0.62, 0.64, 0.62] }),
    R(-72, 9.5, -70.5, 16, -1.3, 'ashlar', 'aljibe', { tint: [0.62, 0.64, 0.62] }),
    R(-70.5, 9.5, -58, 16, -1.3, 'ashlar', 'aljibe', { y0: -6.4, tint: [0.55, 0.58, 0.58], floorMat: 'mossstone', noCeil: true }),
    // el pasadizo hasta la escalera de la torre de la cárcel
    R(-83, 11, -72, 13, YD + 2.6, 'wallstone', 'mazmorra', { tint: mazT }),
    // la escalera (el tramo cubierto y el que sale al suelo de la torre)
    R(-85, 11, -83, 13, -1.0, 'wallstone', 'mazmorra', { tint: mazT, noFloor: true }),
    R(-89, 11, -85, 13, 0, 'wallstone', 'mazmorra', { tint: mazT, noFloor: true, noCeil: true }),
  ];
  for (const r of regs) D.paint(r.x0, r.z0, r.x1, r.z1, 1);
  dungeonWalls(ctx, D, regs);
  for (const r of regs) {
    if (!r.noFloor) {
      wb.box(r.floorMat, r.x0, r.y0 - 0.3, r.z0, r.x1, r.y0, r.z1, { faces: 't', ao: false, room: r.room, uv: 0.6, tint: r.tint ? r.tint.map((v) => v * 1.15) : null });
      ctx.col.add(r.x0, r.y0 - 1, r.z0, r.x1, r.y0, r.z1);
    }
    if (!r.noCeil) {
      wb.box(r.ceilMat ?? r.mat, r.x0, r.y1, r.z0, r.x1, r.y1 + 0.3, r.z1, { faces: 'b', ao: false, room: r.room, tint: r.tint ? r.tint.map((v) => v * 0.8) : [0.6, 0.6, 0.6] });
      ctx.col.add(r.x0, r.y1, r.z0, r.x1, r.y1 + 0.3, r.z1).cam = true;
    }
  }

  // --- las celdas: tabiques, rejas y lo que queda dentro
  {
    const room = 'mazmorra';
    wb.setRoom(room);
    const zN = -13.4,
      zS = -10.6;
    const cellsX = [-89, -85.8, -82.4, -79.0, -75.5];
    for (let k = 1; k < cellsX.length - 1; k++) {
      const x = cellsX[k];
      solid(ctx, 'wallstone', x - 0.2, YD, -18, x + 0.2, -1.5, zN, { sub: 1.6, room, tint: mazT });
      solid(ctx, 'wallstone', x - 0.2, YD, zS, x + 0.2, -1.5, -6, { sub: 1.6, room, tint: mazT });
    }
    // rejas con su puerta (hueco) en cada celda
    const bars = (xa, xb, z, open) => {
      const g0 = xa + 0.55,
        g1 = g0 + 1.1;
      for (let x = xa + 0.12; x < xb - 0.05; x += 0.22) {
        if (x > g0 && x < g1 && open) continue;
        wb.box('iron', x - 0.025, YD, z - 0.05, x + 0.025, -1.5, z + 0.05, { ao: false, room });
      }
      wb.box('iron', xa, YD + 2.4, z - 0.08, xb, YD + 2.48, z + 0.08, { ao: false, room, faces: 'tnsewb' });
      wb.box('iron', xa, YD + 0.1, z - 0.08, xb, YD + 0.18, z + 0.08, { ao: false, room });
      if (open) {
        ctx.col.add(xa, YD, z - 0.08, g0, -1.5, z + 0.08).cam = false;
        ctx.col.add(g1, YD, z - 0.08, xb, -1.5, z + 0.08).cam = false;
      } else ctx.col.add(xa, YD, z - 0.08, xb, -1.5, z + 0.08).cam = false;
      return [g0, g1];
    };
    // norte: la del jugador (reventada), dos cerradas y una abierta
    const [n1a] = bars(cellsX[0], cellsX[1] - 0.2, zN, true);
    bars(cellsX[1] + 0.2, cellsX[2] - 0.2, zN, false);
    bars(cellsX[2] + 0.2, cellsX[3] - 0.2, zN, true);
    bars(cellsX[3] + 0.2, cellsX[4], zN, false);
    // sur: abiertas la primera y la última (ahí está él, comiendo)
    bars(cellsX[0], cellsX[1] - 0.2, zS, true);
    bars(cellsX[1] + 0.2, cellsX[2] - 0.2, zS, false);
    bars(cellsX[2] + 0.2, cellsX[3] - 0.2, zS, false);
    bars(cellsX[3] + 0.2, cellsX[4], zS, true);
    // la reja de la celda del jugador, reventada hacia fuera
    wb.push();
    wb.translate(n1a, YD, zN + 0.05);
    wb.rotateY(-1.9);
    for (let x = 0.08; x < 1.1; x += 0.22) wb.box('iron', x - 0.025, 0.05, -0.03, x + 0.025, 2.35, 0.03, { ao: false, room });
    wb.box('iron', 0, 2.2, -0.04, 1.1, 2.3, 0.04, { ao: false, room });
    wb.box('iron', 0, 0.1, -0.04, 1.1, 0.2, 0.04, { ao: false, room });
    wb.pop();
    // la puerta de la tercera del sur, arrancada en el pasillo
    wb.push();
    wb.translate(-80.6, YD + 0.06, -11.6);
    wb.rotateY(0.3);
    for (let x = 0.08; x < 1.1; x += 0.22) wb.box('iron', x - 0.025, 0, -0.03, x + 0.025, 0.05, 2.3, { ao: false, room });
    wb.pop();
    // jergones de paja, cadenas en los muros, cubos, presos muertos
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
    P.bones(ctx, -87.4, YD, -17.0, 6, 3, 0.4);
    P.decal(ctx, -87.0, YD + 0.01, -14.6, 1.6);
    P.decal(ctx, -77, YD + 0.01, -11.4, 2.4);
    P.decal(ctx, -77.2, YD + 0.01, -7.8, 2.0);
    P.wallTorch(ctx, -84.0, YD + 2.2, zS - 0.05 + 0.2, 'n', { room, radius: 7 });
    P.wallTorch(ctx, -78.0, YD + 2.2, zN + 0.1 - 0.2, 's', { room, radius: 6, dyn: 2.2 });
    P.fleshGrowth(ctx, -76.2, YD, -6.6, 0.7, 51, { room, climb: 0.9, bound: [-78.6, -75.6, -10.2, -6.2] });
    ctx.rats.push({ x: -84.4, y: YD, z: -16.4, n: 2 }, { x: -76.6, y: YD, z: -11.6, n: 1 });
    wb.setRoom(null);
  }

  // --- el cuarto del carcelero
  {
    const room = 'mazmorra';
    wb.setRoom(room);
    P.table(ctx, -71.6, YD, -13.4, 1.8, 0.9, 0);
    P.bench(ctx, -71.6, YD, -12.5, 1.6, 0);
    bakeCorpse(wb, -72.0, YD + 0.02, -12.3, Math.PI, 'sit', 'soldier', 1);
    P.candles(ctx, -71.0, YD + 0.8, -13.6, 4, 11, { room, radius: 5, intensity: 1.2, spread: 0.2 });
    P.weaponRack(ctx, -68.4, YD, -14.7, 0);
    // el clavijero de las llaves y los grilletes
    wb.box('planks', -74.95, YD + 1.3, -14.4, -74.9, YD + 2.0, -12.9, { ao: false, room, tint: [0.62, 0.55, 0.48] });
    for (let z = -14.2; z < -13; z += 0.3) wb.box('iron', -74.9, YD + 1.55, z - 0.02, -74.75, YD + 1.62, z + 0.02, { ao: false, room });
    P.barrel(ctx, -67.6, YD, -9.2, {});
    P.barrel(ctx, -68.5, YD, -9.0, {});
    P.crate(ctx, -74.2, YD, -9.2, 0.8, 0.3);
    P.brazier(ctx, -69.2, YD, -11.6, {});
    P.wallTorch(ctx, -71.0, YD + 2.2, -15.0, 's', { room, radius: 7 });
    wb.setRoom(null);
    L.interact.push(
      { kind: 'note', id: 'n_celda', note: 'celda', x: -87.6, y: YD + 1.3, z: -17.85, model: 'wall', r: 1.5 },
      { kind: 'note', id: 'n_carcelero', note: 'carcelero', x: -71.4, y: YD + 0.82, z: -13.5, model: 'paper' },
      { kind: 'item', id: 'i_espada', item: 'espada', x: -69.0, y: YD + 0.9, z: -14.5 },
      { kind: 'item', id: 'i_escudo', item: 'escudo', x: -67.8, y: YD + 0.9, z: -14.5 }
    );
  }

  // --- la sala del tormento
  {
    const room = 'tormento';
    wb.setRoom(room);
    // el potro
    wb.box('wooddark', -64.9, YD, -12.4, -62.7, YD + 0.8, -11.6, { ao: false, room });
    for (const x of [-64.8, -62.8]) wb.cylinder('wooddark', x, YD + 0.9, -12.0, 0.12, 0.12, 0.4, 8, { ao: false, room });
    ctx.col.add(-64.9, YD, -12.4, -62.7, YD + 0.9, -11.6);
    bakeCorpse(wb, -63.8, YD + 0.8, -12.0, Math.PI / 2, 'back', 'villager', 39);
    // la jaula colgada y las cadenas
    {
      const jx = -62.3,
        jz = -9.9;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        wb.box('iron', jx + Math.cos(a) * 0.45 - 0.02, YD + 1.0, jz + Math.sin(a) * 0.45 - 0.02, jx + Math.cos(a) * 0.45 + 0.02, YD + 2.6, jz + Math.sin(a) * 0.45 + 0.02, { ao: false, room });
      }
      wb.cylinder('iron', jx, YD + 0.95, jz, 0.48, 0.48, 0.06, 8, { ao: false, capTop: true, capBot: true, room });
      wb.cylinder('iron', jx, YD + 2.6, jz, 0.48, 0.12, 0.3, 8, { ao: false, room });
      P.chains(ctx, jx, -1.8, jz, 8, 0);
      P.bones(ctx, jx, YD + 1.02, jz, 4, 4495, 0.25);
    }
    P.chains(ctx, -66.3, YD + 3.0, -13.0, 9, 0);
    P.chains(ctx, -66.3, YD + 3.0, -10.4, 9, 0);
    P.brazier(ctx, -61.8, YD, -13.2, {});
    P.decal(ctx, -63.8, YD + 0.01, -12.0, 2.2);
    P.bones(ctx, -65.6, YD, -9.6, 6, 4496, 0.5);
    wb.setRoom(null);
  }

  // --- las catacumbas: nichos con huesos a los lados de las galerías
  {
    const room = 'catacumbas';
    wb.setRoom(room);
    const rr = new RNG(4500);
    // nicho (lóculo): repisa, jambas y dintel de piedra salientes, el hueco
    // negro detrás y un esqueleto tendido en la repisa. dz: hacia dónde
    // asoma (+1 al sur, -1 al norte)
    const loculus = (x, z, face) => {
      const dz = face === 's' ? 1 : -1;
      const y = YD + rr.pick([0.72, 1.62]);
      const zz = (a, b) => (dz > 0 ? [z + a, z + b] : [z - b, z - a]);
      const [s0, s1] = zz(0, 0.3),
        [f0, f1] = zz(0, 0.14),
        [b0, b1] = zz(0.004, 0.012);
      wb.box('ashlar', x - 0.95, y - 0.09, s0, x + 0.95, y, s1, { ao: false, room, tint: [0.62, 0.62, 0.58] });
      wb.box('ashlar', x - 0.95, y, f0, x - 0.8, y + 0.58, f1, { ao: false, room, tint: [0.62, 0.62, 0.58] });
      wb.box('ashlar', x + 0.8, y, f0, x + 0.95, y + 0.58, f1, { ao: false, room, tint: [0.62, 0.62, 0.58] });
      wb.box('ashlar', x - 0.95, y + 0.58, f0, x + 0.95, y + 0.7, f1, { ao: false, room, tint: [0.62, 0.62, 0.58], faces: 'tnsewb' });
      wb.box('black', x - 0.8, y, b0, x + 0.8, y + 0.58, b1, { faces: face, ao: false, grime: false, room });
      P.bones(ctx, x, y, z + dz * 0.14, 4, Math.round(x * 31 + z * dz), 0.45);
      ctx.col.add(x - 0.95, y - 0.09, s0, x + 0.95, y + 0.7, s1);
    };
    for (let x = -82.6; x < -60.8; x += 2.3) {
      if (Math.abs(x + 71) < 1.5 || Math.abs(x + 81) < 1.3 || Math.abs(x + 61) < 1.3) continue;
      loculus(x, -1, 's');
      loculus(x, 1, 'n');
      if (x > -80 && x < -62.5) {
        loculus(x, 4, 's');
        if (Math.abs(x + 65) > 1.5) loculus(x, 6, 'n');
      }
    }
    // el osario: calaveras en los muros y un altar de huesos
    P.bones(ctx, -86.0, YD, 0.0, 12, 4501, 0.9);
    P.candles(ctx, -87.4, YD, -1.4, 6, 4502, { room, radius: 4, intensity: 0.8 });
    P.candles(ctx, -87.4, YD, 1.4, 5, 4503, { room, radius: 4, intensity: 0.8 });
    // velas en las galerías
    for (const [x, z] of [
      [-76.6, -0.6],
      [-66.0, 0.6],
      [-81.4, 5.4],
      [-70.6, 3.0],
      [-61.4, 4.6],
    ])
      P.candles(ctx, x, YD, z, 4, Math.round(x * z), { room, radius: 4, intensity: 0.75, spread: 0.25 });
    // un tramo hundido (tapado de escombro) y un sarcófago de los antiguos
    P.rubble(ctx, -82.8, YD, 5.0, 10, 4504, 1.0, { mat: 'mossstone', scale: 1.2 });
    P.sarcophagus(ctx, -76.4, YD, 5.0, 0, { open: true });
    P.fleshGrowth(ctx, -60.6, YD, 0.4, 0.8, 4505, { room, climb: 1.4, bound: [-61.8, -60.2, -0.8, 3.8] });
    ctx.rats.push({ x: -79.0, y: YD, z: 0.2, n: 2 });
    wb.setRoom(null);
  }

  // --- el aljibe: bóvedas sobre columnas, el agua negra y la luz del pozo
  {
    const room = 'aljibe';
    wb.setRoom(room);
    const px0 = -70.5,
      pz0 = 9.5,
      px1 = -58,
      pz1 = 16;
    // el agua (con la luz del pozo reflejada)
    const W2 = CASTLE.well;
    if (ctx.waters) ctx.waters.push({ shape: 'rect', r: [px0 + 0.02, pz0 + 0.02, px1 - 0.02, pz1 - 0.02], y: -5.7, light: [W2.x, -1.2, W2.z], lightK: 0.9, sky: 0x1c2228 });
    // que nadie se caiga al estanque (la cámara sí pasa por encima)
    blocker(ctx, px0, -6.4, pz0, px1, -3.4, pz1);
    // columnas en el agua y arcos que las unen
    for (const z of [11.8, 14.2])
      for (const x of [-67.6, -64.4, -61.2]) {
        P.column(ctx, x, -6.4, z, 5.1, 0.32, { mat: 'ashlar', collide: false });
      }
    // (los que van de norte a sur, un dedo más altos: al cruzarse parpadeaban)
    for (const z of [11.8, 14.2]) wb.box('ashlar', px0, -1.75, z - 0.25, px1, -1.3, z + 0.25, { ao: false, room, faces: 'nsewb' });
    for (const x of [-67.6, -64.4, -61.2]) wb.box('ashlar', x - 0.24, -1.7, pz0, x + 0.24, -1.3, pz1, { ao: false, room, faces: 'nsewb' });
    // la bóveda, con la boca del pozo
    for (const r of subtractRects([px0, pz0, px1, pz1], [[W2.x - 0.7, W2.z - 0.7, W2.x + 0.7, W2.z + 0.7]])) {
      wb.box('ashlar', r[0], -1.3, r[1], r[2], -1.0, r[3], { faces: 'b', ao: false, room, tint: [0.5, 0.52, 0.52] });
      ctx.col.add(r[0], -1.3, r[1], r[2], -1.0, r[3]).cam = true;
    }
    for (const [a, b, c, d, f] of [
      [W2.x - 0.7, W2.z - 0.72, W2.x + 0.7, W2.z - 0.7, 's'],
      [W2.x - 0.7, W2.z + 0.7, W2.x + 0.7, W2.z + 0.72, 'n'],
      [W2.x - 0.72, W2.z - 0.7, W2.x - 0.7, W2.z + 0.7, 'e'],
      [W2.x + 0.7, W2.z - 0.7, W2.x + 0.72, W2.z + 0.7, 'w'],
    ])
      wb.box('wallstone', a, -1.3, b, c, 0.2, d, { faces: f, ao: false, room });
    wb.box('black', W2.x - 0.7, 0.05, W2.z - 0.7, W2.x + 0.7, 0.1, W2.z + 0.7, { faces: 'b', ao: false, grime: false, room });
    // la soga y el cubo
    wb.box('burlap', W2.x - 0.01, -3.2, W2.z - 0.01, W2.x + 0.01, -1.3, W2.z + 0.01, { ao: false, room, tint: [0.8, 0.7, 0.55] });
    wb.cylinder('planks', W2.x, -3.5, W2.z, 0.16, 0.19, 0.3, 8, { ao: false, capBot: true, room });
    if (ctx.shafts) ctx.shafts.push({ a: [W2.x, -1.0, W2.z], b: [W2.x + 0.3, -5.7, W2.z + 0.2], w: 1.3, color: 0xb8c8e0 });
    if (ctx.lights) ctx.lights.push({ x: W2.x, y: -4.4, z: W2.z, r: 0.55, g: 0.66, b: 0.85, radius: 9, intensity: 0.9, room });
    // antorchas en los andenes y un caído
    P.wallTorch(ctx, -71.0, YD + 2.2, 8.0, 's', { room, radius: 7 });
    P.wallTorch(ctx, -72.0, YD + 2.2, 14.8, 'e', { room, radius: 6 });
    P.wallTorch(ctx, -59.6, YD + 2.2, 8.0, 's', { room, radius: 6 });
    bakeCorpse(wb, -71.2, YD, 15.2, 0.6, 'face', 'soldier', 40);
    P.decal(ctx, -71.2, YD + 0.01, 15.0, 1.6);
    P.barrel(ctx, -59.0, YD, 8.7, {});
    wb.setRoom(null);
  }

  // --- el pasadizo y la escalera que sube a la torre de la cárcel
  {
    const room = 'mazmorra';
    wb.setRoom(room);
    stairs(ctx, -83, YD, 12, 'w', 2.0, 15, 5 / 15, 0.4, 'wallstone', { solidBelow: true });
    P.wallTorch(ctx, -77.5, YD + 2.0, 11.0, 's', { room, radius: 6 });
    P.wallTorch(ctx, -84.0, YD + 2.6, 11.0, 's', { room, radius: 5 });
    P.bones(ctx, -75.0, YD, 12.4, 4, 4510, 0.5);
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
    {
      id: 'prison',
      rects: [
        [-89, -18, -61, -6, YD - 1, -1],
        [-89, 11, -72, 13, YD - 1, 0.2],
      ],
      atmo: 'prison',
      room: 'mazmorra',
    },
    {
      id: 'catacumbas_castillo',
      rects: [
        [-88, -8.5, -60, 6, YD - 1, -1],
        [-66, 6, -64, 8, YD - 1, -1],
      ],
      atmo: 'crypt',
      room: 'catacumbas',
    },
    { id: 'aljibe', rects: [[-72, 8, -58, 16, YD - 2, -0.9]], atmo: 'crypt', room: 'aljibe' }
  );
  L.map.push(
    { id: 'prison', r: [-89, -18, -61, -6], level: 'dungeon' },
    { id: 'prison', r: [-83, 11, -72, 13], level: 'dungeon' },
    { id: 'catacumbas_castillo', r: [-88, -2, -60, 6], level: 'dungeon' },
    { id: 'catacumbas_castillo', r: [-72, -8.5, -70, -1], level: 'dungeon' },
    { id: 'aljibe', r: [-72, 8, -58, 16], level: 'dungeon' },
    { id: 'torre_carcel', r: [-89, 11, -83, 13], level: 'dungeon' }
  );
}

// Muros de las mazmorras: donde una celda transitable linda con roca, una
// cara mirando hacia dentro; donde linda con otra de techo más bajo o de
// suelo más alto, el trozo que falta (dinteles, el borde de los andenes).
function dungeonWalls(ctx, D, regs) {
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
  for (const q of runs.values()) {
    q.segs.sort((p, s) => p - s);
    let s0 = q.segs[0],
      prev = s0;
    const flush = (a0, a1) => {
      const u0 = (q.dir === 'e' || q.dir === 'w' ? D.z0 : D.x0) + a0 * res,
        u1 = (q.dir === 'e' || q.dir === 'w' ? D.z0 : D.x0) + (a1 + 1) * res;
      const o = { faces: { e: 'w', w: 'e', s: 'n', n: 's' }[q.dir], room: q.r.room, tint: q.r.tint, sub: 1.6, aoH: 1.2, aoMin: 0.5, baseY: q.r.y0 };
      const L = q.line;
      if (q.dir === 'e') wb.box(q.r.mat, L, q.y0, u0, L + 0.1, q.y1, u1, o);
      else if (q.dir === 'w') wb.box(q.r.mat, L - 0.1, q.y0, u0, L, q.y1, u1, o);
      else if (q.dir === 's') wb.box(q.r.mat, u0, q.y0, L, u1, q.y1, L + 0.1, o);
      else wb.box(q.r.mat, u0, q.y0, L - 0.1, u1, q.y1, L, o);
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
