// Los jardines del Paço (PLAN_CASTILLO.md, §3; fase 4f): la torre de la
// reina y su jardincillo, el pomar con su palomar, sus colmenas y su vivero,
// el jardín del Rey con su claustro, su fuente y su alberca, el mirador sobre
// la muralla norte (y lo que se ve desde él: el campamento de los
// sitiadores), el patio de las cocinas y la halconera.
//
// Se entra por la puerta de poniente de la capilla (atrancada por dentro):
// del jardín de la reina, al pomar; del pomar, al jardín del Rey y al patio
// de las cocinas; y por la puerta de poniente de la cocina (atrancada del
// lado del patio), al servicio: el atajo. El postigo del jardín de la reina
// da al patio de la cancillería (atrancado del lado del jardín). Todo es
// opcional: en la cámara de la reina, su relicario; en el mirador, una
// ampolla.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, stairs, subtractRects } from './builders.js';
import * as P from './props.js';
import { floor, interiorRoom } from './level_util.js';
import { bakeCorpse } from '../entities/models.js';
import { holedWall, parapet } from './level_castle.js';
import { PACO } from './level_paco.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const M4 = () => new THREE.Matrix4();
const Q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);
// (el adarve de la muralla norte: level_walls.js)
const YN = 10;
// (lo seco: los setos de arrayán, la hierba)
const SECO = [0.38, 0.35, 0.22];

export function buildJardines(ctx, S, L) {
  reina(ctx, S, L);
  pomar(ctx, S, L);
  jardinRey(ctx, S, L);
  mirador(ctx, L);
  campamento(ctx);
  patioCocinas(ctx, S, L);
  halconera(ctx, L);
  zonas(L);
}

// ------------------------------------------------------------------------ piezas
// Tapia de mampostería con su albardilla y sus vanos adintelados (c: centro,
// w: ancho, h: alto), con su dintel de sillería.
function tapia(ctx, axis, a0, a1, t0, t1, h, vanos = [], faces) {
  const wb = ctx.wb;
  const tint = [0.74, 0.72, 0.68];
  holedWall(ctx, 'wallstone', axis, a0, a1, t0, t1, 0, h, vanos.map((v) => ({ a0: v.c - v.w / 2, a1: v.c + v.w / 2, y0: 0, y1: v.h })), faces ?? (axis === 'x' ? 'nst' : 'ewt'), { tint, sub: 2 });
  const box = (u0, y0, v0, u1, y1, v1, o) => (axis === 'x' ? wb.box('ashlar', u0, y0, v0, u1, y1, v1, o) : wb.box('ashlar', v0, y0, u0, v1, y1, u1, o));
  box(a0, h, t0 - 0.06, a1, h + 0.14, t1 + 0.06, { ao: false, faces: 'tnsewb' });
  for (const v of vanos) box(v.c - v.w / 2 - 0.2, v.h - 0.02, t0 - 0.04, v.c + v.w / 2 + 0.2, v.h + 0.3, t1 + 0.04, { ao: false, faces: 'tnsewb' });
}

// Un pilón ochavado con su agua quieta y, en medio, su columna con la taza.
function pila(ctx, x, z, r, h, o = {}) {
  const wb = ctx.wb;
  const ph = Math.PI / 8;
  const tint = o.tint ?? [0.76, 0.74, 0.7];
  wb.ring('ashlar', x, 0, z, r, r - 0.24, h, 8, { ao: false, phase: ph, tint });
  wb.cylinder('dirt', x, 0.02, z, r - 0.24, r - 0.24, 0.01, 8, { ao: false, capTop: true, phase: ph, tint: [0.2, 0.22, 0.16] });
  if (ctx.waters) ctx.waters.push({ shape: 'circle', x, z, r: r - 0.26, y: h - 0.16, deep: 0x0a0e08, sky: 0x141a12, glint: 0x56624c, light: [x, 3, z], lightK: 0.6, drips: false });
  if (o.col !== false) {
    wb.cylinder('ashlar', x, 0, z, 0.2, 0.16, h + 0.9, 8, { ao: false, tint });
    wb.cylinder('ashlar', x, h + 0.9, z, 0.18, 0.62, 0.22, 10, { ao: false, tint });
    wb.ring('ashlar', x, h + 1.12, z, 0.64, 0.5, 0.12, 10, { ao: false, tint });
    wb.cylinder('dirt', x, h + 1.14, z, 0.5, 0.5, 0.01, 10, { ao: false, capTop: true, tint: [0.18, 0.16, 0.12] });
    ctx.col.add(x - 0.2, 0, z - 0.2, x + 0.2, h + 1.3, z + 0.2);
  }
  P.colOBB(ctx, x, z, r, r * 0.42, 0, 0, h);
  P.colOBB(ctx, x, z, r * 0.42, r, 0, 0, h);
  P.colOBB(ctx, x, z, r * 0.92, r * 0.4, Math.PI / 4, 0, h);
  P.colOBB(ctx, x, z, r * 0.92, r * 0.4, -Math.PI / 4, 0, h);
}

// Un seto seco alrededor de un cuadro (x0, z0, x1, z1), con lo que hay dentro:
// la tierra oscura y los naranjos secos (n), con naranjas por el suelo.
function cuadro(ctx, x0, z0, x1, z1, n, seed) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const t = 0.32,
    h = 0.55;
  const o = { faces: 'tnsew', ao: false, sub: 1.5, tint: SECO };
  for (const [a, b, c, d] of [
    [x0, z0, x1, z0 + t],
    [x0, z1 - t, x1, z1],
    [x0, z0 + t, x0 + t, z1 - t],
    [x1 - t, z0 + t, x1, z1 - t],
  ])
    solid(ctx, 'straw', a, 0, b, c, h, d, o);
  floor(ctx, x0 + t, z0 + t, x1 - t, z1 - t, 'dirt', 0.04, { sub: 2, tint: [0.34, 0.3, 0.24] });
  for (let i = 0; i < n; i++) {
    const tx = x0 + ((i % 2) + 1) * ((x1 - x0) / 3) + rng.range(-0.3, 0.3),
      tz = z0 + (Math.floor(i / 2) + 1) * ((z1 - z0) / (Math.ceil(n / 2) + 1)) + rng.range(-0.3, 0.3);
    P.deadTree(ctx, tx, 0.04, tz, seed * 7 + i, rng.range(2.2, 2.9));
    for (let k = 0; k < 4; k++) P.ellipsoid(ctx, 'leather', tx + rng.range(-1, 1), 0.1, tz + rng.range(-1, 1), 0.06, 0.055, 0.06, [0.86, 0.42, 0.08]);
  }
}

// Un bulto tapado con un paño (de ancho w, fondo d y alto h, de cara a +z).
function bulto(ctx, x, y, z, w, d, h, rot, room) {
  const wb = ctx.wb;
  const c = { ao: false, room, grime: false, tint: [0.8, 0.78, 0.74] };
  wb.at(x, y, z, rot, () => {
    wb.box('linen', -w / 2, 0.06, -d / 2, w / 2, h, d / 2, { ...c, faces: 'tnsew' });
    // (el borde del paño, que cae hasta el suelo, algo más ancho)
    wb.box('linen', -w / 2 - 0.04, 0, -d / 2 - 0.04, w / 2 + 0.04, 0.3, d / 2 + 0.04, { ...c, faces: 'nsew' });
  });
  P.colOBB(ctx, x, z, w / 2 + 0.04, d / 2 + 0.04, rot, y, y + h);
}

// Barandilla de madera (a, b)-(c, d) a la altura y, con su colisión.
function rail(ctx, a, b, c, d, y, room) {
  const wb = ctx.wb;
  wb.box('wooddark', a, y + 0.92, b, c, y + 1.0, d, { ao: false, faces: 'tnsewb', room });
  const lx = c - a > d - b;
  for (let u = (lx ? a : b) + 0.3; u < (lx ? c : d) - 0.05; u += 0.7) {
    if (lx) wb.box('wooddark', u - 0.04, y, b, u + 0.04, y + 0.92, d, { ao: false, room });
    else wb.box('wooddark', a, y, u - 0.04, c, y + 0.92, u + 0.04, { ao: false, room });
  }
  ctx.col.add(a, y, b, c, y + 1.0, d);
}

// ------------------------------------------------------------------------ la torre de la reina
// Cerrada desde la Cuaresma, cuando murió la reina, y sus cosas tapadas con
// paños. Abajo, el zaguán con los bultos y la escalera; arriba, su cámara: la
// cama bajo el dosel, el telar, la rueca, el reclinatorio con su libro de
// horas y su relicario, y una de sus dueñas, sentada contra la cama. Delante,
// su jardincillo: los cuadros secos, los rosales, la pila y los bancos.
function reina(ctx, S, L) {
  const wb = ctx.wb;
  const R = PACO.reina,
    C = PACO.capilla,
    Cn = PACO.canc;
  const { x0, x1, z0, z1, t, F1, eave, top } = R;
  const ix0 = x0 + t,
    ix1 = x1 - t,
    iz0 = z0 + t,
    iz1 = z1 - t;
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  const SL = 0.3;
  const tint = [0.86, 0.83, 0.78];
  const rb = 'reina_zaguan',
    ra = 'reina_camara';
  const gz1 = Cn.pz0 - 0.6;
  const dW = C.dw;

  // --- el jardincillo: el suelo, los paseos, los cuadros, la pila
  W(S, PACO.xi, z1, C.x0, gz1);
  W(S, x1, z0, C.x0, z1);
  // (los umbrales: la puerta de la capilla, el postigo y la puerta del pomar)
  W(S, C.x0 - 0.1, dW - 0.8, C.x0 + C.t + 0.2, dW + 0.8);
  W(S, Cn.reina - 0.8, gz1 - 0.1, Cn.reina + 0.8, Cn.pz0 + 0.1);
  W(S, R.gx - 0.8, z0 - 0.7, R.gx + 0.8, z0 + 0.1);
  floor(ctx, PACO.xi, z1, C.x0, gz1, 'dirt', 0, { sub: 3, tint: [0.52, 0.49, 0.41] });
  floor(ctx, x1, z0, C.x0, z1, 'dirt', 0, { sub: 3, tint: [0.52, 0.49, 0.41] });
  const pc = { x: -136.3, z: -69.0 };
  const pv = (a, b, c, d) => floor(ctx, a, b, c, d, 'cobble', 0.03, { sub: 2.5, tint: [0.7, 0.67, 0.6] });
  pv(pc.x - 0.8, z1, pc.x + 0.8, gz1);
  pv(PACO.xi, pc.z - 0.8, pc.x - 0.8, pc.z + 0.8);
  pv(pc.x + 0.8, pc.z - 0.8, C.x0, pc.z + 0.8);
  pv(R.door - 0.7, z1, pc.x - 0.8, z1 + 1.4);
  pv(pc.x + 0.8, z0, C.x0 - 2.0, z1);
  pv(pc.x + 0.8, dW - 0.8, C.x0, dW + 0.8);
  // (los cuadros, apartados de la pila: que se pase alrededor de ella)
  cuadro(ctx, PACO.xi + 0.5, z1 + 1.8, pc.x - 1.9, pc.z - 1.9, 2, 7501);
  cuadro(ctx, pc.x + 1.9, dW + 1.4, C.x0 - 0.6, pc.z - 1.9, 2, 7502);
  cuadro(ctx, PACO.xi + 0.5, pc.z + 1.9, pc.x - 1.9, gz1 - 0.5, 1, 7503);
  cuadro(ctx, pc.x + 1.9, pc.z + 1.9, C.x0 - 0.6, gz1 - 0.5, 1, 7504);
  pila(ctx, pc.x, pc.z, 0.75, 0.55, { col: false });
  // (los rosales, secos, contra la capilla, y los bancos de piedra)
  for (let z = z0 + 1.0; z < z1 - 0.5; z += 1.4) P.deadTree(ctx, C.x0 - 0.6, 0, z, 7510 + Math.round(-z), 1.5);
  solid(ctx, 'ashlar', PACO.xi, 0, z1 + 1.8, PACO.xi + 0.45, 0.45, z1 + 4.8, { faces: 'tnse', ao: false });
  solid(ctx, 'ashlar', x1 + 0.2, 0, z0 + 0.5, x1 + 1.4, 0.45, z0 + 1.0, { faces: 'tnsew', ao: false });
  L.interact.push({ kind: 'examine', id: 'x_jardin_reina', text: 'jardinReina', x: pc.x, y: 0, z: pc.z, r: 1.9 });

  // --- la tapia del pomar, de la torre a la capilla, con su puerta
  tapia(ctx, 'x', x1, C.x0, z0 - 0.6, z0, 3.4, [{ c: R.gx, w: 1.4, h: 2.4 }]);
  L.interact.push({ kind: 'door', id: 'd_pomar', x: R.gx, y: 0, z: z0 - 0.3, w: 1.4, h: 2.4, axis: 'x', mat: 'planks', hinge: -1, swing: 1, plane: z0 - 0.6, inset: 0.06, lock: { type: 'none' } });

  // --- la torre: los muros (el de poniente, contra la muralla), sus vanos,
  // la cornisa y el chapitel
  solid(ctx, 'ashlar', x0, 0, z0, x1, eave, iz0, { faces: 'ne', sub: 2.2, aoH: 2.5, tint });
  holedWall(
    ctx,
    'ashlar',
    'x',
    x0,
    x1,
    iz1,
    z1,
    0,
    eave,
    [
      { a0: -141.3, a1: -140.3, y0: F1 + 1.4, y1: F1 + 3.0 },
      { a0: R.door - 0.65, a1: R.door + 0.65, y0: 0, y1: 2.6 },
    ],
    'se',
    { tint }
  );
  holedWall(
    ctx,
    'ashlar',
    'z',
    iz0,
    iz1,
    ix1,
    x1,
    0,
    eave,
    [
      { a0: -83.7, a1: -83.5, y0: 1.4, y1: 2.6 },
      { a0: -82.5, a1: -81.5, y0: F1 + 1.4, y1: F1 + 3.0 },
    ],
    'e',
    { tint }
  );
  solid(ctx, 'ashlar', x0, 0, iz0, ix0, eave, iz1, { faces: '', sub: 2.2 });
  wb.box('ashlar', R.door - 0.9, 2.6, z1, R.door + 0.9, 2.95, z1 + 0.08, { ao: false, faces: 'tsewb' });
  for (const [a, b, c, d] of [
    [-141.3, z1, -140.3, z1 + 0.02],
    [x1, -82.5, x1 + 0.02, -81.5],
  ])
    for (let k = 1; k <= 2; k++) {
      const u = k / 3;
      if (d - b < 0.1) wb.box('iron', a + (c - a) * u - 0.02, F1 + 1.4, z1 - 0.42, a + (c - a) * u + 0.02, F1 + 3.0, z1 - 0.38, { ao: false });
      else wb.box('iron', x1 - 0.42, F1 + 1.4, b + (d - b) * u - 0.02, x1 - 0.38, F1 + 3.0, b + (d - b) * u + 0.02, { ao: false });
    }
  const cor = { ao: false, tint: [0.72, 0.7, 0.66] };
  // (la cornisa: su cara de abajo, sólo en el vuelo; dentro está el techo)
  wb.box('ashlar', x0, eave - 0.3, z0 - 0.25, x1 + 0.25, eave, z1 + 0.25, { ...cor, faces: 'nsew' });
  wb.box('ashlar', x0, eave - 0.3, z0 - 0.25, x1 + 0.25, eave, z0, { ...cor, faces: 'b' });
  wb.box('ashlar', x0, eave - 0.3, z1, x1 + 0.25, eave, z1 + 0.25, { ...cor, faces: 'b' });
  wb.box('ashlar', x1, eave - 0.3, z0, x1 + 0.25, eave, z1, { ...cor, faces: 'b' });
  wb.pyramid('roof', cx, cz, x1 - x0 + 0.9, z1 - z0 + 0.9, eave, top - eave);
  wb.box('iron', cx - 0.04, top - 0.2, cz - 0.04, cx + 0.04, top + 0.9, cz + 0.04, { ao: false });
  wb.box('iron', cx - 0.26, top + 0.45, cz - 0.04, cx + 0.26, top + 0.52, cz + 0.04, { ao: false });
  ctx.col.addCam(x0, eave, z0, x1, top, z1);

  // --- por dentro: las dos plantas, la escalera y su hueco
  interiorRoom(ctx, ix0, iz0, ix1, iz1, 0, F1 - SL, {
    room: rb,
    wall: 'plaster',
    tint,
    floorMat: 'flag',
    ceil: false,
    skirting: false,
    doors: [
      { side: 's', at: R.door, w: 1.3, h: 2.6 },
      { side: 'e', at: -83.6, w: 0.2, h: 2.6, sill: 1.4 },
    ],
  });
  interiorRoom(ctx, ix0, iz0, ix1, iz1, F1, eave - 0.3 - F1, {
    room: ra,
    wall: 'plaster',
    tint: [0.88, 0.84, 0.78],
    floor: false,
    ceilMat: 'wooddark',
    doors: [
      { side: 's', at: -140.8, w: 1.0, h: 3.0, sill: 1.4 },
      { side: 'e', at: -82.0, w: 1.0, h: 3.0, sill: 1.4 },
    ],
  });
  W(S, x0, z0, x1, z1);
  W(S, R.door - 0.7, z1 - 0.2, R.door + 0.7, z1 + 0.2);
  const n = 14,
    rise = F1 / n,
    run = 0.32;
  const sx = ix1 - 0.8;
  // (el hueco, hasta donde no da con la cabeza el que baja)
  const hole = [sx - n * run, iz0, -138.0, iz0 + 1.1];
  wb.setRoom(rb);
  stairs(ctx, sx, 0, iz0 + 0.5, 'w', 1.0, n, rise, run, 'wallstone', { base: 0 });
  wb.setRoom(null);
  for (const m of subtractRects([ix0, iz0, ix1, iz1], [hole])) {
    wb.box('planks', m[0], F1 - 0.05, m[1], m[2], F1, m[3], { faces: 't', ao: false, uv: 0.7, room: ra });
    wb.box('wooddark', m[0], F1 - SL, m[1], m[2], F1 - SL + 0.02, m[3], { faces: 'b', ao: false, room: rb, tint: [0.6, 0.54, 0.48] });
    ctx.col.add(m[0], F1 - SL, m[1], m[2], F1, m[3]).cam = true;
  }
  wb.box('wooddark', hole[0] - 0.02, F1 - SL, hole[1], hole[0], F1, hole[3], { faces: 'e', ao: false, room: rb });
  wb.box('wooddark', hole[2], F1 - SL, hole[1], hole[2] + 0.02, F1, hole[3], { faces: 'w', ao: false, room: rb });
  wb.box('wooddark', hole[0], F1 - SL, hole[3], hole[2], F1, hole[3] + 0.02, { faces: 'n', ao: false, room: rb });
  for (let z = iz0 + 0.6; z < iz1 - 0.3; z += 1.2) {
    const cuts = z > hole[1] - 0.15 && z < hole[3] + 0.15 ? [[hole[0] - 0.1, z - 1, hole[2] + 0.1, z + 1]] : [];
    for (const sg of subtractRects([ix0, z - 0.1, ix1, z + 0.1], cuts)) if (sg[2] - sg[0] > 0.05) wb.box('wooddark', sg[0], F1 - SL - 0.2, sg[1], sg[2], F1 - SL, sg[3], { ao: false, faces: 'nsewb', room: rb });
  }
  rail(ctx, hole[0] + 0.9, hole[3], hole[2], hole[3] + 0.08, F1, ra);
  rail(ctx, hole[2], hole[1], hole[2] + 0.08, hole[3] + 0.08, F1, ra);
  // la luz que entra por las ventanas
  ctx.lights.push({ x: cx + 1.5, y: 2.2, z: cz + 1.5, r: 0.5, g: 0.55, b: 0.66, radius: 6, intensity: 0.45, room: rb });
  ctx.lights.push({ x: cx + 1.0, y: F1 + 2.4, z: cz + 1.0, r: 0.55, g: 0.6, b: 0.7, radius: 7, intensity: 0.6, room: ra });

  // --- el zaguán: los bultos tapados
  wb.setRoom(rb);
  bulto(ctx, ix0 + 0.75, 0, iz1 - 1.2, 1.2, 0.7, 0.75, Math.PI / 2, rb);
  bulto(ctx, cx - 0.6, 0, cz + 0.6, 1.6, 0.9, 0.85, 0.12, rb);
  bulto(ctx, ix0 + 0.4, 0, cz - 0.2, 1.0, 0.55, 1.9, Math.PI / 2, rb);
  bulto(ctx, ix1 - 0.5, 0, iz1 - 0.6, 0.6, 0.6, 1.1, -0.3, rb);
  wb.setRoom(null);
  L.interact.push({ kind: 'examine', id: 'x_bultos', text: 'bultos', x: cx - 0.6, y: 0, z: cz + 0.6, r: 1.8 });

  // --- la cámara de la reina
  {
    const y = F1,
      room = ra;
    wb.setRoom(room);
    // la cama, con la cabecera contra el muro de poniente, bajo su dosel, y
    // el paño encima de todo
    const bx = ix0 + 1.05,
      bz = cz + 1.4;
    P.bed(ctx, bx, y, bz, 0);
    for (const [px, pz] of [
      [bx - 1.02, bz - 0.52],
      [bx + 1.02, bz - 0.52],
      [bx - 1.02, bz + 0.52],
      [bx + 1.02, bz + 0.52],
    ])
      wb.box('wooddark', px - 0.05, y, pz - 0.05, px + 0.05, y + 2.4, pz + 0.05, { ao: false, room });
    wb.box('clothRed', bx - 1.1, y + 2.4, bz - 0.6, bx + 1.1, y + 2.55, bz + 0.6, { ao: false, faces: 'tnsewb', room, tint: [0.5, 0.16, 0.14] });
    wb.box('linen', bx - 1.0, y + 0.6, bz - 0.5, bx + 1.0, y + 0.72, bz + 0.5, { ao: false, faces: 'tnsew', room, grime: false, tint: [0.82, 0.8, 0.76] });
    for (const s of [-1, 1]) wb.box('linen', bx - 1.0, y + 0.08, bz + s * 0.5 - 0.02, bx + 1.0, y + 0.72, bz + s * 0.5 + 0.02, { ao: false, faces: s < 0 ? 'n' : 's', room, grime: false, tint: [0.8, 0.78, 0.74] });
    ctx.col.add(bx - 1.1, y, bz - 0.6, bx + 1.1, y + 0.75, bz + 0.6);
    // la vela que se acabó, junto a la cama, y la dueña, sentada contra ella
    wb.cylinder('candle', bx + 0.5, y, bz - 0.9, 0.05, 0.05, 0.05, 6, { ao: false, capTop: true, room, grime: false });
    bakeCorpse(wb, bx + 1.25, y, bz - 0.15, Math.PI / 2, 'sit', 'villager', 1);
    L.interact.push({ kind: 'examine', id: 'x_cama_reina', text: 'camaReina', x: bx + 0.2, y, z: bz - 0.8, r: 1.4 });
    // el reclinatorio ante la ventana de levante, con el libro de horas y el
    // relicario de la reina
    const kx = ix1 - 1.0,
      kz = -82.0;
    wb.box('wooddark', kx - 0.3, y, kz - 0.4, kx + 0.3, y + 0.22, kz + 0.4, { ao: false, room });
    wb.box('wooddark', kx + 0.3, y, kz - 0.4, kx + 0.42, y + 1.0, kz + 0.4, { ao: false, room });
    wb.box('clothBlue', kx - 0.3, y + 0.22, kz - 0.36, kx + 0.25, y + 0.3, kz + 0.36, { ao: false, room });
    ctx.col.add(kx - 0.3, y, kz - 0.4, kx + 0.42, y + 1.0, kz + 0.4);
    L.interact.push(
      { kind: 'note', id: 'n_reina', note: 'reina', x: kx + 0.36, y: y + 1.02, z: kz + 0.18, model: 'book' },
      { kind: 'item', id: 'i_relicario_reina', item: 'relicario', x: kx + 0.36, y: y + 1.02, z: kz - 0.22 }
    );
    // el telar, tapado, y la rueca
    // (el telar, con el paño echado por encima del bastidor)
    P.loom(ctx, cx + 0.4, y, iz1 - 0.75, Math.PI, { room });
    wb.box('linen', cx + 0.4 - 1.0, y + 0.85, iz1 - 1.42, cx + 0.4 + 1.0, y + 1.76, iz1 - 0.06, { ao: false, faces: 'tnsew', room, grime: false, tint: [0.82, 0.8, 0.76] });
    P.spinningWheel(ctx, ix1 - 0.8, y, iz1 - 1.3, -0.6, { room });
    bulto(ctx, ix0 + 0.4, y, iz0 + 2.6, 0.9, 0.5, 1.2, Math.PI / 2, room);
    wb.setRoom(null);
  }
  L.enemies.push(
    { type: 'mourner', x: cx + 0.9, y: 0, z: cz - 0.6, yaw: Math.PI, idle: 'stand', id: 'e_reina1' },
    { type: 'mourner', x: pc.x + 3.4, y: 0, z: pc.z - 3.8, yaw: -Math.PI / 2, idle: 'stand', id: 'e_reina2' }
  );
  L.interact.push({ kind: 'door', id: 'd_torre_reina', x: R.door, y: 0, z: z1 - t / 2, w: 1.3, h: 2.6, axis: 'x', mat: 'planks', hinge: -1, swing: 1, plane: iz1, inset: 0.06, lock: { type: 'none' } });
}

// ------------------------------------------------------------------------ el pomar
// Entre la muralla, la torre de la reina y el jardín del Rey: los frutales en
// filas, secos; las eras; el palomar redondo (en lo alto, un cuervo cebado:
// entities/cuervo.js); las colmenas, mudas, en su poyo contra la muralla; el
// vivero de los peces; y, pegada a la muralla norte, la escalera del mirador.
function pomar(ctx, S, L) {
  const wb = ctx.wb;
  const Po = PACO.pomar,
    R = PACO.reina,
    J = PACO.jardin;
  const x0 = PACO.xi,
    x1 = Po.xj - 0.6,
    z0 = PACO.zN,
    z1 = R.z0 - 0.6;
  const rng = new RNG(7601);
  W(S, x0, z0, x1, z1);
  W(S, x1 - 0.1, J.fuente.z - 0.9, Po.xj + 0.1, J.fuente.z + 0.9);
  floor(ctx, x0, z0, x1, z1, 'dirt', 0, { sub: 3, tint: [0.48, 0.45, 0.36] });
  // la tapia del jardín del Rey, con su paso
  tapia(ctx, 'z', z0, J.z1, x1, Po.xj, 3.6, [{ c: J.fuente.z, w: 2.0, h: 2.7 }]);
  // los frutales, en filas
  for (const x of [-139.5, -135.5, -131.5, -127.5, -123.5])
    for (const z of [-106.5, -101.5, -96.5, -91.8]) {
      if (x > -129 && z > -93) continue;
      P.deadTree(ctx, x + rng.range(-0.4, 0.4), 0, z + rng.range(-0.4, 0.4), 7610 + Math.round(-x * 3 - z), rng.range(3.0, 4.2));
    }
  // las eras, con sus tablas
  for (let k = 0; k < 3; k++) {
    const za = -120.0 + k * 1.6,
      xa = -141.8,
      xb = -134.0;
    floor(ctx, xa, za, xb, za + 1.1, 'dirt', 0.12, { sub: 2, tint: [0.36, 0.3, 0.22] });
    for (const [a, b, c, d] of [
      [xa, za, xb, za + 0.06],
      [xa, za + 1.04, xb, za + 1.1],
    ])
      wb.box('planks', a, 0, b, c, 0.18, d, { ao: false, faces: 'tnsew', tint: [0.5, 0.42, 0.34] });
    for (let i = 0; i < 6; i++) P.weeds(ctx, xa + 0.6 + i * 1.25, 0.12, za + 0.55, 3, 7620 + k * 10 + i, 0.3, SECO);
  }
  // el palomar: redondo, encalado, con su tejado cónico, los nidales en
  // hileras y su puerta; en la punta, un cuervo cebado
  {
    const D = Po.palomar;
    wb.cylinder('plaster', D.x, 0, D.z, D.r, D.r * 0.94, D.h, 16, { ao: false, sub: 2, tint: [0.8, 0.77, 0.7] });
    wb.cylinder('ashlar', D.x, D.h - 0.2, D.z, D.r + 0.18, D.r + 0.18, 0.2, 16, { ao: false, capBot: true, tint: [0.7, 0.68, 0.64] });
    wb.cylinder('roof', D.x, D.h, D.z, D.r + 0.3, 0.12, 2.4, 16, { ao: false, sub: 2 });
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + row * 0.26,
          y = 2.6 + row * 1.0;
        const rr = D.r * (0.94 + 0.06 * (1 - y / D.h)) + 0.01;
        wb.geometry('black', new THREE.PlaneGeometry(0.2, 0.22), M4().compose(V(D.x + Math.cos(a) * rr, y, D.z + Math.sin(a) * rr), Q(0, Math.PI / 2 - a, 0), V(1, 1, 1)), { ao: false, grime: false });
      }
    wb.box('wooddark', D.x - 0.45, 0, D.z + D.r - 0.1, D.x + 0.45, 1.9, D.z + D.r + 0.08, { ao: false, faces: 'tsewb' });
    P.colOBB(ctx, D.x, D.z, D.r, D.r * 0.42, 0, 0, D.h);
    P.colOBB(ctx, D.x, D.z, D.r * 0.42, D.r, 0, 0, D.h);
    P.colOBB(ctx, D.x, D.z, D.r * 0.92, D.r * 0.4, Math.PI / 4, 0, D.h);
    P.colOBB(ctx, D.x, D.z, D.r * 0.92, D.r * 0.4, -Math.PI / 4, 0, D.h);
    for (let i = 0; i < 6; i++) P.ellipsoid(ctx, 'clothWhite', D.x + rng.range(-2, 2), 0.02, D.z + D.r + rng.range(0.4, 2.2), 0.08, 0.01, 0.03, [0.7, 0.68, 0.66]);
    L.interact.push({ kind: 'examine', id: 'x_palomar', text: 'palomar', x: D.x, y: 0, z: D.z + D.r + 0.6, r: 1.6 });
    L.enemies.push({ type: 'cuervo', x: D.x, y: D.h + 2.3, z: D.z, yaw: Math.PI, idle: 'perch', id: 'e_cuervo_pomar', guard: [x0, z0, x1, z1] });
  }
  // las colmenas: de paja, en su poyo de piedra contra la muralla
  {
    const bx = x0 + 0.4;
    solid(ctx, 'ashlar', x0, 0, -109.0, x0 + 0.8, 0.5, -100.0, { faces: 'tnse', ao: false });
    for (let z = -108.4; z < -100.4; z += 1.15) {
      wb.cylinder('straw', bx, 0.5, z, 0.32, 0.06, 0.62, 9, { ao: false, capBot: true, tint: [0.7, 0.6, 0.4] });
      for (let k = 0; k < 3; k++) wb.ring('straw', bx, 0.62 + k * 0.17, z, 0.31 - k * 0.07, 0.29 - k * 0.07, 0.03, 9, { ao: false, tint: [0.56, 0.48, 0.32] });
      wb.box('black', bx + 0.27, 0.52, z - 0.05, bx + 0.29, 0.6, z + 0.05, { ao: false, grime: false });
    }
    L.interact.push({ kind: 'examine', id: 'x_colmenas', text: 'colmenas', x: x0 + 1.3, y: 0, z: -104.5, r: 1.8 });
  }
  // el vivero de los peces: un estanque de piedra, alto, con el agua negra
  {
    const [a, b, c, d] = Po.vivero;
    const h = 0.6,
      t = 0.3;
    for (const [p, q, r, s] of [
      [a, b, c, b + t],
      [a, d - t, c, d],
      [a, b + t, a + t, d - t],
      [c - t, b + t, c, d - t],
    ])
      solid(ctx, 'ashlar', p, 0, q, r, h, s, { faces: 'tnsew', ao: false, sub: 2, tint: [0.72, 0.7, 0.66] });
    floor(ctx, a + t, b + t, c - t, d - t, 'dirt', 0.02, { sub: 2, tint: [0.14, 0.14, 0.1] });
    if (ctx.waters) ctx.waters.push({ shape: 'rect', r: [a + t, b + t, c - t, d - t], y: h - 0.14, deep: 0x080a06, sky: 0x121812, glint: 0x4e5a46, light: [(a + c) / 2, 3, (b + d) / 2], lightK: 0.5, drips: false });
    for (let i = 0; i < 7; i++) P.ellipsoid(ctx, 'bone', rng.range(a + 0.6, c - 0.6), h - 0.12, rng.range(b + 0.6, d - 0.6), 0.22, 0.05, 0.08, [0.7, 0.68, 0.6]);
    L.interact.push({ kind: 'examine', id: 'x_vivero', text: 'vivero', x: (a + c) / 2, y: 0, z: d + 0.6, r: 1.8 });
  }
  L.enemies.push({ type: 'hound', x: -128.5, y: 0, z: -99.0, yaw: 2.2, idle: 'eat', id: 'e_pomar1' });
  P.bones(ctx, -128.0, 0, -98.6, 10, 7630, 0.9);
}

// ------------------------------------------------------------------------ el jardín del Rey
// Un claustro con su galería en dos lados (contra la sala y el patio de las
// cocinas, y contra las cámaras), cuatro cuadros con setos de arrayán y
// naranjos amargos, secos; los dos paseos que se cruzan en la fuente y la
// alberca larga.
function jardinRey(ctx, S, L) {
  const wb = ctx.wb;
  const J = PACO.jardin,
    Sa = PACO.sala,
    F = J.fuente,
    A = J.alberca;
  const rng = new RNG(7701);
  const zg = J.z0 + 1.6;
  W(S, J.x0, J.z0, J.x1, J.z1);
  W(S, J.x1 - 0.1, F.z - 0.9, J.x1 + 0.7, F.z + 0.9);
  // la tapia del patio de las cocinas (lleva el tejado de la galería)
  tapia(ctx, 'z', J.z0, Sa.z0, J.x1, J.x1 + 0.6, 4.6, [{ c: F.z, w: 1.8, h: 2.6 }]);
  // el suelo: tierra y, en los paseos y las galerías, losas
  floor(ctx, J.x0, J.z0, J.x1, J.z1, 'dirt', 0, { sub: 3, tint: [0.48, 0.45, 0.38] });
  const pv = (a, b, c, d) => floor(ctx, a, b, c, d, 'flag', 0.03, { sub: 2.5, tint: [0.68, 0.66, 0.62] });
  pv(J.gx, zg, J.x1, J.z1);
  pv(J.x0, J.gz, J.gx, J.z1);
  pv(J.x0, F.z - 1.9, J.gx, F.z + 1.9);
  pv(F.x - 1.0, zg, F.x + 1.0, F.z - 1.9);
  pv(F.x - 2.2, F.z + 1.9, F.x + 2.2, J.gz);
  // los cuatro cuadros (apartados de la fuente: que se pase alrededor)
  cuadro(ctx, J.x0 + 0.4, zg, F.x - 1.0, F.z - 1.9, 2, 7711);
  cuadro(ctx, F.x + 1.0, zg, J.gx - 0.2, F.z - 1.9, 2, 7712);
  cuadro(ctx, J.x0 + 0.4, F.z + 1.9, F.x - 2.2, J.gz - 0.4, 4, 7713);
  cuadro(ctx, F.x + 2.2, F.z + 1.9, J.gx - 0.2, J.gz - 0.4, 4, 7714);
  // la fuente, en el cruce, y la alberca larga
  pila(ctx, F.x, F.z, 0.95, 0.6);
  {
    const [a, b, c, d] = A;
    const h = 0.55,
      t = 0.25;
    for (const [p, q, r, s] of [
      [a, b, c, b + t],
      [a, d - t, c, d],
      [a, b + t, a + t, d - t],
      [c - t, b + t, c, d - t],
    ])
      solid(ctx, 'ashlar', p, 0, q, r, h, s, { faces: 'tnsew', ao: false, sub: 2, tint: [0.74, 0.72, 0.68] });
    floor(ctx, a + t, b + t, c - t, d - t, 'dirt', 0.02, { sub: 2, tint: [0.16, 0.18, 0.12] });
    if (ctx.waters) ctx.waters.push({ shape: 'rect', r: [a + t, b + t, c - t, d - t], y: h - 0.12, deep: 0x0a0e08, sky: 0x141a12, glint: 0x56624c, light: [(a + c) / 2, 3, (b + d) / 2], lightK: 0.6, drips: false });
    for (let i = 0; i < 9; i++) wb.cylinder('gold', rng.range(a + 0.4, c - 0.4), 0.05, rng.range(b + 0.5, d - 0.5), 0.03, 0.03, 0.006, 8, { ao: false, capTop: true, tint: [0.7, 0.62, 0.4] });
  }
  L.interact.push({ kind: 'examine', id: 'x_fuente_rey', text: 'fuenteRey', x: F.x, y: 0, z: F.z - 1.4, r: 1.6 }, { kind: 'examine', id: 'x_alberca', text: 'alberca', x: F.x - 1.6, y: 0, z: (A[1] + A[3]) / 2, r: 1.8 });
  // las galerías: columnas, el arquitrabe y el tejado a un agua
  {
    const yA = 3.4,
      yT = 3.75,
      yH = 4.5,
      tint = [0.76, 0.74, 0.7];
    const colsE = [-118.8, -115.6, -109.4, -106.2, -103.0, -99.8, -96.6, -93.4, J.gz + 0.2];
    const colsS = [-117.9, -115.6, -110.4];
    for (const z of colsE) P.column(ctx, J.gx + 0.2, 0, z, yA, 0.2, { mat: 'ashlar' });
    for (const x of colsS) P.column(ctx, x, 0, J.gz + 0.2, yA, 0.2, { mat: 'ashlar' });
    wb.box('ashlar', J.gx, yA, zg, J.gx + 0.4, yT, J.gz + 0.4, { ao: false, faces: 'tnsewb', tint });
    wb.box('ashlar', J.x0, yA, J.gz, J.gx, yT, J.gz + 0.4, { ao: false, faces: 'tnswb', tint });
    // (los tejados: el de levante, de la tapia y la sala a las columnas; el
    // del sur, de las cámaras a las suyas; en la esquina, el hastialillo)
    const roof = (p0, p1, p2, p3) => {
      wb.quad('roof', p0, p1, p2, p3, { ao: false, sub: 2.4 });
      const d = V(0, -0.12, 0);
      const q = [p0, p1, p2, p3].map((v) => v.clone().add(d));
      wb.quad('wooddark', q[3], q[2], q[1], q[0], { ao: false, sub: 3, tint: [0.5, 0.47, 0.44] });
      wb.quad('wooddark', q[0], q[1], p1, p0, { ao: false, tint: [0.42, 0.4, 0.38] });
    };
    const ov = 0.35;
    const ye = yT - (ov * (yH - yT)) / (J.x1 - J.gx);
    roof(V(J.gx - ov, ye, zg), V(J.gx - ov, ye, J.gz), V(J.x1, yH, J.gz), V(J.x1, yH, zg));
    const ys = yT - (ov * (yH - yT)) / (J.z1 - J.gz);
    roof(V(J.x1, ys, J.gz - ov), V(J.x0, ys, J.gz - ov), V(J.x0, yH, J.z1), V(J.x1, yH, J.z1));
    wb.tri('wooddark', V(J.gx, yT, J.gz), V(J.x1, yH, J.gz), V(J.x1, yT, J.gz), { ao: false, tint: [0.42, 0.4, 0.38] });
    wb.tri('wooddark', V(J.x1, yT, J.gz), V(J.x1, yH, J.gz), V(J.gx, yT, J.gz), { ao: false, tint: [0.42, 0.4, 0.38] });
    ctx.col.addCam(J.gx - ov, yT - 0.3, zg, J.x1, yH + 0.2, J.gz);
    ctx.col.addCam(J.x0, yT - 0.3, J.gz - ov, J.x1, yH + 0.2, J.z1);
    // los bancos de las galerías
    for (const z of [-117.0, -107.6, -100.2, -94.8]) P.bench(ctx, J.x1 - 0.5, 0, z, 2.2, Math.PI / 2);
    for (const x of [-116.8, -111.8]) P.bench(ctx, x, 0, J.z1 - 0.5, 2.2, 0);
  }
  L.enemies.push(
    { type: 'cortesanoSuelto', x: F.x - 1.6, y: 0, z: -100.5, yaw: Math.PI / 2, idle: 'kneel', id: 'e_jardin1' },
    { type: 'cortesanoSuelto', x: F.x + 1.6, y: 0, z: -96.0, yaw: -Math.PI / 2, idle: 'kneel', id: 'e_jardin2' },
    { type: 'mourner', x: J.x1 - 1.4, y: 0, z: -98.0, yaw: -Math.PI / 2, idle: 'stand', id: 'e_jardin3' }
  );
}

// ------------------------------------------------------------------------ el mirador
// Del pomar sube una escalera, pegada a la muralla norte, a su adarve, y por
// él se llega al mirador del Rey, un templete de madera sobre la muralla,
// junto a su torre: desde ahí se ve el campamento de los sitiadores.
function mirador(ctx, L) {
  const wb = ctx.wb;
  const E = PACO.pomar.esc,
    M = PACO.mirador,
    NO = PACO.esqNO;
  const zi = PACO.zN;
  const tint = [0.74, 0.72, 0.68];
  // la escalera, con su pretil escalonado del lado del pomar
  const n = E.n,
    run = (E.x1 - E.x0) / n,
    rise = YN / n,
    pw = 0.3,
    z1 = zi + 1.6;
  stairs(ctx, E.x0, 0, (zi + z1 - pw) / 2, 'e', z1 - pw - zi, n, rise, run, 'wallstone', { base: 0 });
  for (let i = 0; i < n; i++) {
    const xa = E.x0 + run * i,
      xb = E.x0 + run * (i + 1),
      top = rise * (i + 1) + 0.95;
    solid(ctx, 'wallstone', xa, 0, z1 - pw, xb, top, z1, { faces: 'nswe', sub: 2, aoH: 1.5, tint });
    wb.box('ashlar', xa, top, z1 - pw - 0.05, xb + (i === n - 1 ? 0.05 : 0), top + 0.12, z1 + 0.05, { ao: false, faces: 'tnswb' + (i === n - 1 ? 'e' : '') });
  }
  // el pretil del adarve, con el hueco por el que se sale de la escalera
  const gap = [E.x1 - run * 3, E.x1];
  parapet(ctx, NO.x + NO.w / 2, zi - 0.5, gap[0], zi, YN);
  parapet(ctx, gap[1], zi - 0.5, PACO.torreN - 3.0, zi, YN);
  // el templete: cuatro pies derechos, su tejado a cuatro aguas y un banco
  // contra las almenas
  {
    const za = zi - 3.4,
      zb = zi - 0.6;
    for (const x of [M.x0 + 0.25, M.x1 - 0.25])
      for (const z of [za, zb]) {
        wb.box('wooddark', x - 0.08, YN, z - 0.08, x + 0.08, YN + 2.5, z + 0.08, { ao: false });
        ctx.col.add(x - 0.1, YN, z - 0.1, x + 0.1, YN + 2.5, z + 0.1);
      }
    wb.box('wooddark', M.x0, YN + 2.4, za - 0.1, M.x1, YN + 2.55, zb + 0.1, { ao: false, faces: 'nsewb', tint: [0.5, 0.45, 0.4] });
    wb.pyramid('roof', (M.x0 + M.x1) / 2, (za + zb) / 2, M.x1 - M.x0 + 0.6, zb - za + 0.8, YN + 2.55, 1.3);
    ctx.col.addCam(M.x0, YN + 2.4, za, M.x1, YN + 3.9, zb);
    P.bench(ctx, (M.x0 + M.x1) / 2, YN, za + 0.35, 3.0, 0);
    L.interact.push(
      { kind: 'item', id: 'i_ampolla_mirador', item: 'ampolla', x: (M.x0 + M.x1) / 2 + 0.8, y: YN + 0.5, z: za + 0.35 },
      { kind: 'examine', id: 'x_mirador', text: 'mirador', x: (M.x0 + M.x1) / 2 - 0.8, y: YN, z: za + 0.9, r: 1.8 }
    );
  }
}

// ------------------------------------------------------------------------ el campamento
// Lo que se ve desde el mirador, al norte de la muralla: las tiendas de los
// sitiadores, sus hogueras en la niebla y, más cerca, la fila de picas con lo
// que clavaron en ellas.
function campamento(ctx) {
  const wb = ctx.wb;
  const rng = new RNG(7801);
  for (let i = 0; i < 18; i++) {
    const x = rng.range(-160, -70),
      z = rng.range(-168, -142);
    wb.pyramid(rng.pick(['clothDark', 'burlap', 'clothRed']), x, z, rng.range(3.2, 4.6), rng.range(3.2, 4.6), 0, rng.range(2.4, 3.4));
    if (rng.chance(0.45)) {
      ctx.fires.push({ x: x + 3, y: 0, z: z + 2, s: 1.6, smoke: true });
      ctx.lights.push({ x: x + 3, y: 1.4, z: z + 2, r: 1, g: 0.45, b: 0.15, radius: 12, intensity: 1.8 });
    }
  }
  // (la hoguera grande, frente al mirador)
  ctx.fires.push({ x: -116, y: 0, z: -150, s: 2.6, smoke: true, embers: true });
  ctx.lights.push({ x: -116, y: 2.0, z: -150, r: 1, g: 0.42, b: 0.12, radius: 16, intensity: 2.2 });
  for (let x = -158; x < -66; x += 3.6) P.pike(ctx, x + rng.range(-0.8, 0.8), 0, -136 + rng.range(-1.5, 1.5), { h: rng.range(2.4, 3.2), skull: rng.chance(0.6) });
  for (let x = -150; x < -80; x += 2.2) P.stake(ctx, x + rng.range(-0.3, 0.3), 0, -131.5 + rng.range(-0.4, 0.4), rng.range(-0.3, 0.3), 7810 + Math.round(-x));
  ctx.crows.push({ x: -112, y: 16, z: -150, r: 12, n: 6 });
}

// ------------------------------------------------------------------------ el patio de las cocinas
// Detrás de la sala, entre el jardín y la cocina: el pozo, la leñera contra
// la muralla, el horno de fuera, los toneles, el tajo con su cuchilla, el
// muladar y los perros. La puerta de poniente de la cocina se desatranca
// desde aquí: el atajo al servicio.
function patioCocinas(ctx, S, L) {
  const wb = ctx.wb;
  const K = PACO.cocinas,
    Ck = PACO.cocina;
  const x0 = K.x0 + 0.6;
  const rng = new RNG(7901);
  W(S, x0, K.z0, K.x1, K.z1);
  W(S, Ck.x - Ck.w / 2 - 0.2, Ck.z - 0.8, Ck.x - Ck.w / 2 + 1.0, Ck.z + 0.8);
  floor(ctx, x0, K.z0, K.x1, K.z1, 'cobble', 0, { sub: 3, tint: [0.66, 0.62, 0.56] });
  P.well(ctx, -96.5, 0, -114.6, {});
  // la leñera, contra la muralla
  P.leanTo(ctx, -101.6, K.z0, -89.0, K.z0 + 2.8, 'n', 4.0, 3.0);
  for (let x = -100.6; x < -89.6; x += 1.6) P.firewood(ctx, x, 0, K.z0 + 1.0, 0, 3 + (Math.round(-x) % 3));
  // el horno de fuera, junto a la cocina
  P.breadOven(ctx, -86.2, 0, K.z0 + 1.5, Math.PI, {});
  // los toneles, el tajo con la cuchilla, el carro y el muladar
  for (const [x, z] of [
    [-85.2, -110.0],
    [-85.4, -111.0],
    [-86.3, -110.5],
  ])
    P.barrel(ctx, x, 0, z, {});
  wb.cylinder('wooddark', -90.5, 0, -108.6, 0.4, 0.42, 0.7, 10, { ao: false, capTop: true, tint: [0.5, 0.42, 0.34] });
  ctx.col.add(-90.9, 0, -109.0, -90.1, 0.7, -108.2);
  P.dropped(ctx, -90.5, 0.72, -108.6, 0.7, 'knife');
  P.decal(ctx, -90.2, 0.01, -108.0, 1.4);
  P.cart(ctx, -100.0, 0, -107.4, 0.2, {});
  P.bones(ctx, -93.0, 0, -110.6, 14, 7910, 1.3);
  P.rubble(ctx, -92.4, 0, -111.2, 6, 7911, 1.0, { mat: 'dirt' });
  P.sacks(ctx, -102.6, 0, -108.4, 3, 7912);
  L.enemies.push(
    { type: 'hound', x: -92.4, y: 0, z: -109.8, yaw: 0.8, idle: 'eat', id: 'e_cocinas1' },
    { type: 'hound', x: -94.6, y: 0, z: -111.6, yaw: -2.0, idle: 'eat', id: 'e_cocinas2' },
    { type: 'penitent', x: -98.0, y: 0, z: -113.0, yaw: 1.2, idle: 'eat', id: 'e_cocinas3' }
  );
  ctx.crows.push({ x: -93.0, y: 0, z: -110.6, r: 1.2, n: 3 });
}

// ------------------------------------------------------------------------ la halconera
// En el patio de las caballerizas, contra la coracha: un cobertizo con las
// alcándaras, y en ellas los halcones del Rey, encapirotados, muertos.
function halconera(ctx, L) {
  const wb = ctx.wb;
  const H = PACO.halconera;
  const rng = new RNG(8001);
  P.leanTo(ctx, H.x0, H.z0, H.x1, H.z1, 'e', 3.9, 2.9);
  // las alcándaras: dos varas en sus pies, a dos alturas
  for (const [x, y] of [
    [H.x1 - 1.6, 1.25],
    [H.x1 - 0.7, 1.8],
  ]) {
    for (const z of [H.z0 + 0.6, H.z1 - 0.6]) {
      wb.box('wooddark', x - 0.05, 0, z - 0.05, x + 0.05, y, z + 0.05, { ao: false });
      ctx.col.add(x - 0.07, 0, z - 0.07, x + 0.07, y, z + 0.07);
    }
    wb.box('wooddark', x - 0.035, y - 0.07, H.z0 + 0.5, x + 0.035, y, H.z1 - 0.5, { ao: false, faces: 'tnsewb' });
    // los halcones, encapirotados, de cara al patio
    for (let z = H.z0 + 1.1; z < H.z1 - 0.9; z += 1.05) {
      if (rng.chance(0.25)) continue;
      halcon(wb, x, y, z + rng.range(-0.15, 0.15), rng);
    }
  }
  // los que se cayeron, y las plumas
  for (let i = 0; i < 3; i++) P.ellipsoid(ctx, 'hide', H.x1 - rng.range(0.6, 2.0), 0.08, rng.range(H.z0 + 1, H.z1 - 1), 0.16, 0.07, 0.09, [0.5, 0.4, 0.3]);
  for (let i = 0; i < 12; i++) P.ellipsoid(ctx, 'clothWhite', H.x1 - rng.range(0.3, 2.4), 0.01, rng.range(H.z0 + 0.5, H.z1 - 0.5), 0.06, 0.005, 0.02, [0.6, 0.55, 0.48]);
  // el guante del halconero, en su clavo
  wb.box('leather', H.x1 - 0.06, 1.3, H.z0 + 0.3, H.x1 - 0.02, 1.62, H.z0 + 0.48, { ao: false, tint: [0.6, 0.42, 0.28] });
  L.interact.push({ kind: 'examine', id: 'x_halcones', text: 'halcones', x: H.x1 - 2.4, y: 0, z: (H.z0 + H.z1) / 2, r: 2.0 });
}

// Un halcón muerto en su alcándara, encapirotado, de cara a -x.
function halcon(wb, x, y, z, rng) {
  const tint = rng.pick([
    [0.5, 0.4, 0.3],
    [0.42, 0.36, 0.3],
    [0.55, 0.48, 0.38],
  ]);
  const lean = rng.range(0.1, 0.5);
  wb.push();
  wb.translate(x, y, z);
  wb.rotateY(-Math.PI / 2 + rng.range(-0.3, 0.3));
  wb.rotateX(lean);
  wb.geometry('hide', new THREE.SphereGeometry(1, 7, 5), M4().compose(V(0, 0.16, 0), Q(0.2, 0, 0), V(0.09, 0.17, 0.1)), { ao: false, tint });
  wb.geometry('hide', new THREE.ConeGeometry(0.06, 0.22, 5), M4().compose(V(0, 0.02, -0.12), Q(-2.4, 0, 0), V(1, 1, 0.5)), { ao: false, tint });
  wb.geometry('leather', new THREE.SphereGeometry(1, 6, 4), M4().compose(V(0, 0.34, 0.03), Q(0, 0, 0), V(0.055, 0.06, 0.065)), { ao: false, tint: [0.5, 0.3, 0.18] });
  wb.box('clothRed', -0.008, 0.38, 0.0, 0.008, 0.43, 0.02, { ao: false });
  wb.pop();
}

// ------------------------------------------------------------------------ zonas y mapa
function zonas(L) {
  const R = PACO.reina,
    C = PACO.capilla,
    Cn = PACO.canc,
    Po = PACO.pomar,
    J = PACO.jardin,
    K = PACO.cocinas,
    H = PACO.halconera,
    NO = PACO.esqNO;
  const ix0 = R.x0 + R.t,
    ix1 = R.x1 - R.t,
    iz0 = R.z0 + R.t,
    iz1 = R.z1 - R.t;
  const gz1 = Cn.pz0 - 0.6;
  L.zones.push(
    { id: 'torre_reina', rects: [[ix0, iz0, ix1, iz1, -1, R.F1 - 0.3]], atmo: 'interior', room: 'reina_zaguan' },
    { id: 'camara_reina', rects: [[ix0, iz0, ix1, iz1, R.F1 - 0.4, R.eave]], atmo: 'interior', room: 'reina_camara' },
    { id: 'mirador_rey', rects: [[NO.x + NO.w / 2, PACO.zN - 4, PACO.torreN - 3.0, PACO.zN, YN - 1, YN + 4]], atmo: 'ramparts' },
    { id: 'halconera', rects: [[H.x0, H.z0, H.x1, H.z1, -1, 4]], atmo: 'city' },
    {
      id: 'jardin_reina',
      rects: [
        [PACO.xi, R.z1, C.x0, gz1, -1, 12],
        [R.x1, R.z0, C.x0, R.z1, -1, 12],
      ],
      atmo: 'city',
    },
    { id: 'pomar', rects: [[PACO.xi, PACO.zN, Po.xj - 0.6, R.z0 - 0.6, -1, 9]], atmo: 'city' },
    { id: 'jardin_rey', rects: [[J.x0, J.z0, J.x1, J.z1, -1, 9]], atmo: 'city' },
    { id: 'patio_cocinas', rects: [[K.x0 + 0.6, K.z0, K.x1, K.z1, -1, 12]], atmo: 'city' }
  );
  L.map.push(
    { id: 'torre_reina', r: [R.x0, R.z0, R.x1, R.z1] },
    { id: 'camara_reina', r: [R.x0, R.z0, R.x1, R.z1] },
    { id: 'jardin_reina', r: [PACO.xi, R.z1, C.x0, gz1] },
    { id: 'jardin_reina', r: [R.x1, R.z0, C.x0, R.z1] },
    { id: 'pomar', r: [PACO.xi, PACO.zN, Po.xj, R.z0] },
    { id: 'jardin_rey', r: [J.x0, J.z0, J.x1, J.z1] },
    { id: 'mirador_rey', r: [NO.x + NO.w / 2, PACO.zN - 4, PACO.torreN - 3.0, PACO.zN] },
    { id: 'patio_cocinas', r: [K.x0, K.z0, K.x1, K.z1] },
    { id: 'halconera', r: [H.x0, H.z0, H.x1, H.z1] }
  );
}
