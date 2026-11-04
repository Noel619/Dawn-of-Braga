// El patio de armas, rehecho (PLAN_FORTALEZA.md, §5.1 y fase 4): lo que se ganó
// al correr la muralla de poniente hasta la fortaleza.
//
// Contra la muralla, una nave de mampuesto con su tejado a dos aguas: al
// norte, la halconera del Rey (las alcándaras con sus halcones, encapirotados
// y muertos en la percha; la mesa del halconero con sus capirotes, sus
// guantes y sus señuelos); al sur, las cuadras (los pesebres a lo largo de la
// muralla, los tabiques de tablas de cada plaza, las sillas y los arreos, la
// boca del pajar; las puertas grandes, arrancadas para la barricada; lo que
// quedó de los caballos, y el mastín). Ante la poterna de la fortaleza, el
// corral de la cocina (la leñera, el tajo con el hacha, el gallinero, el
// muladar). Entre las cuadras y la muralla del sur, el pajar y los carros; en
// el rincón, la fragua del armero, un cobertizo contra la muralla con la
// forja encendida, el fuelle, el yunque, la pila de templar y la muela. Al
// pie de la torre de la cárcel, el arranque de la muralla vieja de poniente,
// arrasada (por debajo pasa la escalera de las mazmorras).
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, solidGableRoof, beam } from './builders.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';
import { muroVanos, forjado, esquina, cara, tri, PIEDRA } from './fortaleza_atrezo.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);
// el mampuesto de la nave, por fuera y por dentro (encalado, sucio)
const FUERA = [0.8, 0.77, 0.72];
const DENTRO = [0.74, 0.7, 0.64];
const MADERA = [0.62, 0.52, 0.42];

export function buildPatioArmas(ctx, S, L, C) {
  nave(ctx, S, L, C);
  halconera(ctx, L, C);
  cuadras(ctx, L, C);
  corral(ctx, S, L, C);
  pajar(ctx, C);
  fragua(ctx, L, C);
  muroViejo(ctx, C);
  L.enemies.push(
    { type: 'soldier', x: -96.0, y: 0, z: 1.6, yaw: Math.PI, idle: 'wander', id: 'e_ronda' },
    { type: 'penitent', x: -112.0, y: 0, z: -27.6, yaw: 0.6, idle: 'eat', id: 'e_corral' }
  );
}

// ------------------------------------------------------------------------ la nave
// Los cuatro muros (el de poniente, contra la muralla: sólo su cara de
// dentro), el tabique entre la halconera y las cuadras, el techo de tablas
// (por encima, el pajar, bajo el tejado), el tejado a dos aguas con sus
// hastiales y las esquinas de sillería.
function nave(ctx, S, L, C) {
  const wb = ctx.wb;
  const N = C.cuadras;
  const { x0, x1, z0, z1, t, eave, ridge } = N;
  const ix0 = x0 + t,
    ix1 = x1 - t,
    iz0 = z0 + t,
    iz1 = z1 - t;
  const zt0 = N.tabique,
    zt1 = N.tabique + 0.5;
  const RH = 'halconera',
    RC = 'cuadras';
  const fuera = [{ room: null, y0: 0, y1: eave }];
  const inH = [{ room: RH, y0: 0, y1: eave, tint: DENTRO }],
    inC = [{ room: RC, y0: 0, y1: eave, tint: DENTRO }];
  const o = { tint: FUERA };
  W(S, ix0, iz0, ix1, zt0);
  W(S, ix0, zt1, ix1, iz1);
  // el muro de poniente, contra la muralla (su cara de fuera es la muralla)
  for (const [a, b, room] of [
    [iz0, zt0, RH],
    [zt0, zt1, null],
    [zt1, iz1, RC],
  ]) {
    if (room) wb.box('wallstone', x0, 0, a, ix0, eave, b, { faces: 'e', sub: 2, aoH: 1.8, room, tint: DENTRO });
  }
  ctx.col.add(x0, 0, iz0, ix0, eave, iz1);
  // el del norte (la halconera), con su ventana
  muroVanos(ctx, 'x', x0, x1, z0, iz0, 0, eave, [{ c: (x0 + x1) / 2, w: 0.6, y: 2.0, h: 0.8, rise: 0.3, ring: 0.16 }], fuera, inH, o);
  // el del sur (las cuadras), con la puerta del pajar
  muroVanos(ctx, 'x', x0, x1, iz1, z1, 0, eave, [{ c: -116.0, w: 1.3, y: 0, h: 2.3, rise: 0 }], inC, fuera, o);
  W(S, -116.7, iz1 - 0.3, -115.3, z1 + 0.4);
  // el de levante: la puerta de la halconera; las dos grandes de las cuadras,
  // adinteladas, sin sus hojas (se las llevaron para la barricada), y los
  // ventanucos altos
  muroVanos(ctx, 'z', iz0, zt0, ix1, x1, 0, eave, [{ c: -19.0, w: 1.3, y: 0, h: 2.2, rise: 0.65, ring: 0.2 }, { c: -21.2, w: 0.55, y: 2.1, h: 0.8, rise: 0 }, { c: -16.8, w: 0.55, y: 2.1, h: 0.8, rise: 0 }], inH, fuera, o);
  muroVanos(ctx, 'z', zt0, zt1, ix1, x1, 0, eave, [], [], fuera, o);
  const pg = [
    { c: -9.0, w: 2.6, y: 0, h: 2.8, rise: 0 },
    { c: 1.0, w: 2.6, y: 0, h: 2.8, rise: 0 },
  ];
  muroVanos(ctx, 'z', zt1, iz1, ix1, x1, 0, eave, [...pg, ...[-12.6, -5.0, -2.2, 4.0].map((c) => ({ c, w: 0.55, y: 2.3, h: 0.7, rise: 0 }))], inC, fuera, o);
  for (const g of pg) {
    W(S, ix1 - 0.3, g.c - g.w / 2, x1 + 0.4, g.c + g.w / 2);
    // el dintel de madera, que asoma un dedo de la cara
    wb.box('timber', x1 - 0.02, g.y + g.h, g.c - g.w / 2 - 0.35, x1 + 0.06, g.y + g.h + 0.28, g.c + g.w / 2 + 0.35, { ao: false, faces: 'enst', tint: MADERA });
    wb.box('timber', ix1 - 0.06, g.y + g.h, g.c - g.w / 2 - 0.35, ix1 + 0.02, g.y + g.h + 0.28, g.c + g.w / 2 + 0.35, { ao: false, faces: 'wnst', room: RC, tint: MADERA });
    // los pernios de las hojas que ya no están
    for (const s of [-1, 1]) for (const y of [0.5, 2.2]) wb.box('iron', x1, y, g.c + s * (g.w / 2) - 0.06, x1 + 0.05, y + 0.08, g.c + s * (g.w / 2) + 0.06, { ao: false });
  }
  W(S, ix1 - 0.3, -19.7, x1 + 0.4, -18.3);
  // (los barrotes de los ventanucos)
  for (const [c, y] of [
    [-21.2, 2.1],
    [-16.8, 2.1],
    [-12.6, 2.3],
    [-5.0, 2.3],
    [-2.2, 2.3],
    [4.0, 2.3],
  ])
    for (const dz of [-0.14, 0.0, 0.14]) wb.box('iron', x1 - t / 2 - 0.02, y, c + dz - 0.015, x1 - t / 2 + 0.02, y + 0.8, c + dz + 0.015, { ao: false });
  // el tabique, con su puerta
  muroVanos(ctx, 'x', ix0, ix1, zt0, zt1, 0, eave, [{ c: -113.4, w: 1.1, y: 0, h: 2.2, rise: 0 }], inH, inC, { tint: DENTRO, revealRoom: RC });
  W(S, -114.0, zt0 - 0.3, -112.8, zt1 + 0.3);
  // los techos de tablas: por encima, el pajar (con su boca en las cuadras)
  const boca = [ix0 + 1.0, 2.2, ix0 + 2.2, 3.4];
  forjado(ctx, ix0, iz0, ix1, zt0, eave, [], RH, RH, { tint: MADERA });
  forjado(ctx, ix0, zt1, ix1, iz1, eave, [boca], RC, RC, { tint: MADERA });
  for (const [a, b, c, d, f] of [
    [boca[0] - 0.02, boca[1], boca[0], boca[3], 'e'],
    [boca[2], boca[1], boca[2] + 0.02, boca[3], 'w'],
    [boca[0], boca[1] - 0.02, boca[2], boca[1], 's'],
    [boca[0], boca[3], boca[2], boca[3] + 0.02, 'n'],
  ])
    wb.box('wooddark', a, eave - 0.3, b, c, eave, d, { faces: f, ao: false, room: RC });
  // (lo de arriba: la paja que asoma por la boca, y lo oscuro)
  wb.box('black', boca[0], eave + 0.6, boca[1], boca[2], eave + 0.61, boca[3], { faces: 'b', ao: false, grime: false, room: RC });
  for (let k = 0; k < 7; k++) wb.box('straw', boca[0] + 0.1 + (k % 4) * 0.25, eave - 0.25 - (k % 3) * 0.12, boca[1] + 0.15 + k * 0.14, boca[0] + 0.32 + (k % 4) * 0.25, eave + 0.2, boca[1] + 0.2 + k * 0.14, { ao: false, room: RC, tint: [0.9, 0.82, 0.6] });
  ctx.col.add(boca[0], eave - 0.3, boca[1], boca[2], eave + 0.6, boca[3]);
  P.ladder(ctx, boca[0] + 0.6, 0, boca[1] - 0.05, eave, 0, 0.35);
  // el tejado
  solidGableRoof(ctx, x0, z0, x1, z1, eave, ridge, 'z', { ovs: [0, 0.6], gableOverhang: 0.2, gables: [{ y0: eave, t }, { y0: eave, t }], underRoom: RC, room: RC, wallTint: FUERA });
  // las esquinas de sillería
  esquina(ctx, x1, z0, 1, -1, 0, eave - 0.1);
  esquina(ctx, x1, z1, 1, 1, 0, eave - 0.1);
  // los suelos: la halconera, enlosada y con arena; las cuadras, de tierra y
  // paja, con su reguera en medio
  wb.box('flag', ix0, -0.05, iz0, ix1, 0.02, zt0, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room: RH, tint: [0.72, 0.69, 0.64] });
  wb.box('dirt', ix0, -0.05, zt1, ix1, 0.02, iz1, { faces: 't', ao: false, sub: 2.5, room: RC, tint: [0.56, 0.5, 0.42] });
  wb.box('flag', -114.1, 0.02, zt1, -113.5, 0.045, iz1, { faces: 't', ao: false, room: RC, tint: [0.42, 0.4, 0.36] });
  L.zones.push(
    { id: 'halconera', rects: [[ix0, iz0, ix1, zt0, -1, eave]], atmo: 'interior', room: RH },
    { id: 'cuadras', rects: [[ix0, zt1, ix1, iz1, -1, eave]], atmo: 'interior', room: RC }
  );
  L.map.push({ id: 'halconera', r: [x0, z0, x1, zt0] }, { id: 'cuadras', r: [x0, zt0, x1, z1] });
}

// Un halcón muerto, encapirotado: el cuerpo, la cola, el capirote de cuero con
// su penacho y las pihuelas que le cuelgan de las patas. (x, y, z): los pies;
// echado: caído de la percha, boca arriba.
function halcon(wb, x, y, z, rot, room, echado = false) {
  wb.at(x, y, z, rot, () => {
    wb.push();
    if (echado) {
      wb.translate(0, 0.08, 0);
      wb.rotateX(-Math.PI / 2 + 0.2);
    }
    P.ellipsoid({ wb }, 'feathers', 0, 0.16, 0, 0.09, 0.14, 0.08, [0.5, 0.42, 0.34]);
    wb.box('feathers', -0.05, 0.02, -0.14, 0.05, 0.05, -0.02, { ao: false, room, tint: [0.42, 0.36, 0.3] });
    P.ellipsoid({ wb }, 'leather', 0, 0.33, 0.02, 0.055, 0.06, 0.06, [0.45, 0.28, 0.2]);
    wb.box('clothRed', -0.01, 0.38, 0.0, 0.01, 0.43, 0.03, { ao: false, room });
    for (const s of [-1, 1]) wb.box('leather', s * 0.03 - 0.008, -0.12, 0.02, s * 0.03 + 0.008, 0.04, 0.03, { ao: false, room, tint: [0.5, 0.36, 0.26] });
    wb.pop();
  });
}

// ------------------------------------------------------------------------ la halconera
// Las alcándaras del Rey: dos varas a la altura del pecho sobre sus pies, con
// su faldón de lienzo (para que el ave que se debate no se enrede), y en ellas
// los halcones, encapirotados, muertos de hambre sin soltar la percha: nadie
// les quitó el capirote. Otros, caídos en la arena. La mesa del halconero con
// los capirotes en su tabla, los guantes, los señuelos y el cascabel; la
// bañera; la jaula; el halconero, sentado contra el muro con el guante puesto.
function halconera(ctx, L, C) {
  const wb = ctx.wb;
  const N = C.cuadras;
  const room = 'halconera';
  const ix0 = N.x0 + N.t,
    ix1 = N.x1 - N.t,
    iz0 = N.z0 + N.t,
    zt0 = N.tabique;
  const rng = new RNG(4701);
  wb.setRoom(room);
  // la arena bajo las alcándaras
  wb.box('dirt', ix0 + 0.6, 0.02, iz0 + 1.0, ix0 + 5.6, 0.04, zt0 - 0.8, { faces: 't', ao: false, room, tint: [0.78, 0.7, 0.54] });
  for (const z of [iz0 + 2.0, iz0 + 4.6]) {
    const a = ix0 + 0.9,
      b = ix0 + 5.3,
      y = 1.35;
    for (const x of [a, b]) wb.box('wooddark', x - 0.06, 0, z - 0.06, x + 0.06, y + 0.06, z + 0.06, { ao: false, room, tint: MADERA });
    beam(ctx, 'wooddark', V(a, y, z), V(b, y, z), 0.05, { d: 0.05, room, tint: MADERA });
    wb.box('linen', a + 0.1, y - 0.62, z - 0.01, b - 0.1, y - 0.04, z + 0.01, { ao: false, faces: 'ns', room, tint: [0.7, 0.66, 0.58] });
    ctx.col.add(a - 0.08, 0, z - 0.1, b + 0.08, y + 0.1, z + 0.1);
    for (let x = a + 0.45; x < b - 0.3; x += 0.62 + rng.range(-0.08, 0.1)) {
      if (rng.chance(0.25)) continue;
      halcon(wb, x, y + 0.05, z, rng.pick([0, Math.PI]) + rng.range(-0.3, 0.3), room);
    }
  }
  for (const [x, z, r] of [
    [ix0 + 2.2, iz0 + 3.3, 0.6],
    [ix0 + 4.1, iz0 + 1.1, 2.2],
    [ix0 + 1.3, iz0 + 5.6, -1.0],
  ])
    halcon(wb, x, 0.04, z, r, room, true);
  for (let k = 0; k < 14; k++) {
    const x = ix0 + rng.range(0.6, 5.6),
      z = iz0 + rng.range(0.6, 6.4);
    wb.at(x, 0.046 + k * 0.0015, z, rng.range(0, Math.PI), () => wb.box('feathers', -0.03, 0, -0.06, 0.03, 0.004, 0.06, { ao: false, faces: 't', room, tint: [0.6, 0.52, 0.42] }));
  }
  // la mesa del halconero, contra el muro de levante: los capirotes en su
  // tabla, los guantes, los señuelos y el cascabel
  const mx = ix1 - 0.55,
    mz = iz0 + 1.1;
  P.table(ctx, mx, 0, mz, 1.6, 0.8, Math.PI / 2, {});
  wb.box('planks', ix1 - 0.04, 1.4, mz - 0.9, ix1, 1.9, mz + 0.9, { ao: false, faces: 'w', room, tint: MADERA });
  for (let k = 0; k < 5; k++) {
    const z = mz - 0.7 + k * 0.35;
    wb.box('wooddark', ix1 - 0.16, 1.62, z - 0.015, ix1, 1.65, z + 0.015, { ao: false, room });
    P.ellipsoid(ctx, 'leather', ix1 - 0.15, 1.58, z, 0.05, 0.06, 0.055, [0.45 + k * 0.03, 0.28, 0.2]);
  }
  wb.at(mx - 0.1, 0.82, mz - 0.4, 0.3, () => {
    wb.box('leather', -0.09, 0, -0.17, 0.09, 0.05, 0.12, { ao: false, room, tint: [0.62, 0.46, 0.32] });
    wb.box('leather', -0.11, 0, 0.12, 0.11, 0.06, 0.32, { ao: false, room, tint: [0.62, 0.46, 0.32] });
  });
  wb.at(mx + 0.05, 0.82, mz + 0.3, -0.4, () => {
    wb.box('feathers', -0.12, 0, -0.04, 0.12, 0.05, 0.04, { ao: false, room, tint: [0.5, 0.44, 0.38] });
    wb.box('rope', 0.12, 0.01, -0.01, 0.5, 0.02, 0.01, { ao: false, room });
  });
  wb.cylinder('bronzeAged', mx - 0.2, 0.84, mz + 0.55, 0.03, 0.03, 0.04, 6, { ao: false, capTop: true, room });
  // la bañera de las aves y la jaula
  wb.cylinder('wooddark', ix0 + 3.2, 0, zt0 - 0.9, 0.55, 0.5, 0.18, 10, { ao: false, capBot: true, room, tint: MADERA });
  wb.cylinder('black', ix0 + 3.2, 0.14, zt0 - 0.9, 0.48, 0.48, 0.01, 10, { ao: false, capTop: true, grime: false, room });
  ctx.col.add(ix0 + 2.65, 0, zt0 - 1.45, ix0 + 3.75, 0.18, zt0 - 0.35);
  {
    const jx = ix1 - 0.6,
      jz = zt0 - 0.8;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      wb.box('wooddark', jx + Math.cos(a) * 0.36 - 0.015, 0, jz + Math.sin(a) * 0.36 - 0.015, jx + Math.cos(a) * 0.36 + 0.015, 0.8, jz + Math.sin(a) * 0.36 + 0.015, { ao: false, room });
    }
    wb.cylinder('wooddark', jx, 0.8, jz, 0.4, 0.4, 0.05, 8, { ao: false, capTop: true, capBot: true, room });
    wb.cylinder('wooddark', jx, 0, jz, 0.4, 0.4, 0.04, 8, { ao: false, capTop: true, room });
    halcon(wb, jx, 0.05, jz, 1.2, room, true);
    ctx.col.add(jx - 0.4, 0, jz - 0.4, jx + 0.4, 0.85, jz + 0.4);
  }
  // el halconero, sentado contra el muro, con el guante puesto
  bakeCorpse(wb, ix1 - 0.5, 0, iz0 + 3.0, -Math.PI / 2, 'sit', 'villager', 4702);
  wb.setRoom(null);
  P.candles(ctx, mx + 0.1, 0.82, mz - 0.1, 2, 4703, { room, radius: 4.5, intensity: 0.7, spread: 0.1 });
  ctx.lights.push({ x: ix1 - 1.2, y: 2.4, z: -19.0, r: 0.5, g: 0.58, b: 0.78, radius: 6, intensity: 0.6, room });
  ctx.lights.push({ x: (ix0 + ix1) / 2, y: 2.8, z: iz0 + 3.0, r: 1, g: 0.52, b: 0.24, radius: 7, intensity: 0.45, room });
  L.interact.push(
    { kind: 'examine', id: 'x_halconera', text: 'halconera', x: ix0 + 3.2, y: 0, z: iz0 + 3.3, r: 2.2 },
    { kind: 'door', id: 'd_halconera', x: N.x1 - N.t / 2, y: 0, z: -19.0, w: 1.3, h: 2.85, arch: true, axis: 'z', mat: 'planks', hinge: -1, swing: -1, plane: N.x1 - N.t, inset: 0.06, ajar: 0.35, lock: { type: 'none' } }
  );
}

// ------------------------------------------------------------------------ las cuadras
// Las plazas a lo largo de la muralla, cada una con su pesebre de piedra y su
// pesebrera de varas encima, partidas por tabiques de tablas sobre sus postes;
// la calle con su reguera; las sillas en sus perchas y los arreos colgados;
// las horcas, los cubos, la paja; lo que quedó de los caballos (los tres
// últimos, que no se comieron: los mataron aquí), y el mastín, que come.
function cuadras(ctx, L, C) {
  const wb = ctx.wb;
  const N = C.cuadras;
  const room = 'cuadras';
  const ix0 = N.x0 + N.t,
    ix1 = N.x1 - N.t,
    iz1 = N.z1 - N.t,
    zt1 = N.tabique + 0.5;
  const rng = new RNG(4711);
  const px = ix0 + 2.7; // (hasta ahí, las plazas)
  wb.setRoom(room);
  // el pesebre corrido y la pesebrera
  solid(ctx, 'wallstone', ix0, 0, zt1 + 0.1, ix0 + 0.65, 0.85, iz1 - 0.1, { faces: 'tensw', sub: 2, aoH: 0.8, room, tint: [0.66, 0.62, 0.56] });
  wb.box('wooddark', ix0 + 0.12, 0.62, zt1 + 0.2, ix0 + 0.55, 0.63, iz1 - 0.2, { faces: 't', ao: false, room, tint: [0.32, 0.28, 0.24] });
  beam(ctx, 'wooddark', V(ix0 + 0.75, 1.75, zt1 + 0.1), V(ix0 + 0.75, 1.75, iz1 - 0.1), 0.06, { room, tint: MADERA });
  for (let z = zt1 + 0.3; z < iz1 - 0.1; z += 0.22) beam(ctx, 'wooddark', V(ix0 + 0.05, 1.0, z), V(ix0 + 0.75, 1.75, z), 0.025, { room, tint: MADERA });
  for (let z = zt1 + 0.6; z < iz1 - 0.3; z += 1.6) P.ellipsoid(ctx, 'straw', ix0 + 0.35, 0.9, z, 0.22, 0.12, 0.5, [0.8, 0.7, 0.5]);
  // los tabiques de las plazas, con sus postes y las argollas
  const tabs = [-11.5, -8.3, -5.1, -1.9, 1.3];
  for (const z of tabs) {
    wb.box('planks', ix0 + 0.65, 0.15, z - 0.05, px, 1.5, z + 0.05, { ao: false, faces: 'nsewt', room, tint: MADERA });
    wb.box('wooddark', px - 0.08, 0, z - 0.09, px + 0.08, 1.9, z + 0.09, { ao: false, faces: 'nsewt', room, tint: [0.5, 0.42, 0.34] });
    wb.box('wooddark', ix0 + 0.65, 1.5, z - 0.07, px, 1.62, z + 0.07, { ao: false, faces: 'nsewtb', room, tint: [0.5, 0.42, 0.34] });
    ctx.col.add(ix0 + 0.65, 0, z - 0.09, px + 0.08, 1.9, z + 0.09);
  }
  for (let z = zt1 + 1.6; z < iz1; z += 3.2) wb.box('iron', ix0 + 0.66, 1.1, z - 0.06, ix0 + 0.7, 1.22, z + 0.06, { ao: false, room });
  // la paja de las camas, por las plazas
  for (let k = 0; k < 26; k++) {
    const x = rng.range(ix0 + 0.8, px - 0.2),
      z = rng.range(zt1 + 0.3, iz1 - 0.3);
    wb.at(x, 0.025 + k * 0.0012, z, rng.range(0, Math.PI), () => wb.box('straw', -0.35, 0, -0.18, 0.35, 0.04, 0.18, { ao: false, faces: 't', room, tint: [0.78, 0.68, 0.48] }));
  }
  // los caballos: dos echados en su plaza, abiertos, y los huesos del otro
  P.deadHorse(ctx, ix0 + 1.8, 0, -9.9, Math.PI + 0.1, { tint: [0.42, 0.3, 0.24] });
  P.decal(ctx, ix0 + 1.7, 0.03, -9.9, 2.4);
  P.deadHorse(ctx, ix0 + 1.9, 0, 3.0, 0.15, { tint: [0.3, 0.26, 0.22] });
  P.decal(ctx, ix0 + 1.9, 0.03, 3.0, 2.2);
  P.bones(ctx, ix0 + 1.6, 0.02, -3.5, 16, 4712, 0.9);
  // las sillas en sus perchas y los arreos, en el muro de levante entre las
  // puertas; las horcas, los cubos
  for (const [z, k] of [
    [-6.4, 0],
    [-4.6, 1],
    [-3.0, 2],
  ]) {
    wb.box('wooddark', ix1 - 0.55, 1.15, z - 0.05, ix1, 1.23, z + 0.05, { ao: false, room });
    wb.at(ix1 - 0.32, 1.23, z, 0, () => {
      wb.box('leather', -0.24, 0, -0.2, 0.24, 0.12, 0.2, { ao: false, room, tint: [0.5 + k * 0.05, 0.32, 0.22] });
      wb.box('leather', -0.27, 0.12, -0.08, -0.18, 0.28, 0.08, { ao: false, room, tint: [0.45, 0.3, 0.2] });
      wb.box('leather', -0.25, -0.42, -0.22, 0.25, 0.0, -0.2, { ao: false, faces: 'ns', room, tint: [0.42, 0.28, 0.2] });
      wb.box('leather', -0.25, -0.42, 0.2, 0.25, 0.0, 0.22, { ao: false, faces: 'ns', room, tint: [0.42, 0.28, 0.2] });
    });
  }
  ctx.col.add(ix1 - 0.6, 0.7, -6.8, ix1, 1.6, -2.6);
  for (const z of [-12.2, -11.4, 3.2, 4.4]) {
    wb.box('iron', ix1 - 0.12, 2.0, z - 0.02, ix1, 2.05, z + 0.02, { ao: false, room });
    wb.box('leather', ix1 - 0.1, 1.2, z - 0.03, ix1 - 0.06, 2.0, z + 0.03, { ao: false, room, tint: [0.4, 0.26, 0.18] });
    P.ellipsoid(ctx, 'leather', ix1 - 0.16, 1.3, z, 0.08, 0.16, 0.2, [0.44, 0.3, 0.2]);
  }
  beam(ctx, 'wooddark', V(ix1 - 0.1, 0, iz1 - 0.6), V(ix1 - 0.2, 2.0, iz1 - 0.35), 0.035, { room, tint: MADERA });
  for (let k = 0; k < 3; k++) beam(ctx, 'iron', V(ix1 - 0.2, 2.0, iz1 - 0.35), V(ix1 - 0.25 + k * 0.05 - 0.05, 2.35, iz1 - 0.3 + (k - 1) * 0.06), 0.012, { room });
  P.basket(ctx, ix1 - 0.5, 0, 0.0, { room });
  P.hay(ctx, ix1 - 0.8, 0, -13.6, Math.PI / 2);
  P.hay(ctx, ix1 - 0.8, 0.81, -13.6, Math.PI / 2 + 0.2);
  P.sacks(ctx, ix1 - 0.7, 0, iz1 - 1.6, 3, 4713);
  // el mozo de las cuadras, junto al pesebre
  bakeCorpse(wb, px + 0.6, 0, -6.6, Math.PI / 2, 'curl', 'villager', 4714);
  P.decal(ctx, px + 0.5, 0.03, -6.6, 1.5);
  wb.setRoom(null);
  // la luz: la de la luna, por las puertas, y un farol colgado que todavía
  // arde
  for (const z of [-9.0, 1.0]) ctx.lights.push({ x: ix1 - 1.2, y: 2.0, z, r: 0.5, g: 0.58, b: 0.78, radius: 7, intensity: 0.7, room });
  P.hangingLamp(ctx, -114.0, N.eave - 0.35, -4.0, { room, len: 0.9, radius: 8 });
  ctx.lights.push({ x: ix0 + 1.5, y: 2.2, z: -4.0, r: 1, g: 0.5, b: 0.22, radius: 8, intensity: 0.5, room });
  ctx.rats.push({ x: ix0 + 1.6, y: 0, z: -3.6, n: 3 });
  // el mastín, comiéndose un caballo
  L.enemies.push({ type: 'hound', x: px + 0.3, y: 0, z: -9.6, yaw: -Math.PI / 2, idle: 'eat', id: 'e_mastin' });
  L.interact.push({ kind: 'examine', id: 'x_cuadras', text: 'cuadras', x: px + 0.8, y: 0, z: 3.0, r: 1.8 });
}

// ------------------------------------------------------------------------ el corral de la cocina
// Ante la poterna de la fortaleza (fortaleza.js: la del muro de la despensa),
// el corral: su pretil de piedra con la cancela caída, la leñera bajo su
// tejadillo contra el talud de la fortaleza, el tajo con el hacha clavada, el
// gallinero con las gallinas muertas, el muladar y las tinas.
function corral(ctx, S, L, C) {
  const wb = ctx.wb;
  const K = C.corral;
  const { x0, x1, z0, z1 } = K;
  const t = 0.45,
    h = 1.25;
  const gx0 = -112.6,
    gx1 = -110.6;
  const pre = (a, b, c, d) => {
    solid(ctx, 'wallstone', a, 0, b, c, h, d, { faces: 'tnsew', sub: 2, aoH: 0.8, mats: { t: 'flag' }, tint: [0.76, 0.73, 0.68] });
  };
  pre(x0, z1 - t, gx0, z1);
  pre(gx1, z1 - t, x1, z1);
  pre(x1 - t, z0, x1, z1 - t);
  // los pilares de la cancela y la cancela, caída
  // (a caballo de los cabos del pretil: sin caras en el mismo plano)
  for (const x of [gx0, gx1]) solid(ctx, 'ashlar', x - 0.27, 0, z1 - t - 0.05, x + 0.27, h + 0.45, z1 + 0.05, { faces: 'tnsew', sub: 2, tint: PIEDRA.silla });
  wb.at(gx0 + 0.2, 0.05, z1 + 0.9, 0.35, () => {
    wb.push();
    wb.rotateX(-Math.PI / 2 + 0.06);
    for (let k = 0; k < 6; k++) wb.box('planks', k * 0.32, 0, -0.03, k * 0.32 + 0.24, 1.2, 0.03, { ao: false, tint: MADERA });
    for (const y of [0.2, 1.0]) wb.box('wooddark', 0, y, 0.03, 1.85, y + 0.12, 0.08, { ao: false });
    wb.pop();
  });
  // la leñera: el tejadillo contra el talud y la leña apilada
  // (hasta la poterna: FORT.poterna, en fortaleza_medidas.js)
  P.leanTo(ctx, x0 + 0.4, z0 - 0.62, x0 + 5.6, z0 + 1.7, 'n', 2.7, 2.1);
  for (let k = 0; k < 4; k++) P.firewood(ctx, x0 + 1.1 + k * 1.2, 0, z0 + 0.55, Math.PI / 2, 4);
  for (let k = 0; k < 3; k++) P.firewood(ctx, x0 + 1.7 + k * 1.2, 0.62, z0 + 0.55, Math.PI / 2, 3);
  // el tajo, con el hacha clavada, y las astillas
  {
    const tx = x0 + 7.4,
      tz = z0 + 2.6;
    wb.cylinder('wooddark', tx, 0, tz, 0.36, 0.4, 0.62, 10, { ao: false, capTop: true, tint: [0.5, 0.42, 0.34] });
    ctx.col.add(tx - 0.38, 0, tz - 0.38, tx + 0.38, 0.62, tz + 0.38);
    beam(ctx, 'wooddark', V(tx + 0.05, 0.6, tz), V(tx + 0.55, 1.15, tz + 0.15), 0.03, { tint: MADERA });
    wb.at(tx + 0.02, 0.56, tz - 0.02, 0.3, () => wb.box('iron', -0.12, 0, -0.02, 0.12, 0.14, 0.02, { ao: false }));
    for (let k = 0; k < 9; k++) wb.at(tx + Math.cos(k * 2.1) * (0.6 + (k % 3) * 0.2), 0.02, tz + Math.sin(k * 2.1) * (0.6 + (k % 3) * 0.2), k * 0.8, () => wb.box('planks', -0.12, 0, -0.025, 0.12, 0.03, 0.025, { ao: false, tint: MADERA }));
  }
  // el gallinero: la casilla con su rampa, el palo de dormir y las gallinas
  {
    const gx = x1 - 2.0,
      gz = z0 + 1.4;
    solid(ctx, 'planks', gx - 0.9, 0.3, gz - 0.7, gx + 0.9, 1.3, gz + 0.7, { faces: 'nsew', sub: 2, tint: MADERA });
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ])
      wb.box('wooddark', gx + sx * 0.85 - 0.05, 0, gz + sz * 0.65 - 0.05, gx + sx * 0.85 + 0.05, 0.3, gz + sz * 0.65 + 0.05, { ao: false });
    wb.box('black', gx - 0.2, 0.45, gz + 0.7, gx + 0.2, 0.8, gz + 0.715, { faces: 's', ao: false, grime: false });
    beam(ctx, 'planks', V(gx, 0.02, gz + 1.6), V(gx, 0.45, gz + 0.72), 0.3, { d: 0.03, tint: MADERA });
    cara(wb, 'roof', V(gx - 1.05, 1.62, gz - 0.85), V(gx + 1.05, 1.62, gz - 0.85), V(gx + 1.05, 1.25, gz + 0.85), V(gx - 1.05, 1.25, gz + 0.85), V(0, 1, 0.3), { ao: false, sub: 2 });
    cara(wb, 'wooddark', V(gx - 1.05, 1.58, gz - 0.85), V(gx + 1.05, 1.58, gz - 0.85), V(gx + 1.05, 1.21, gz + 0.85), V(gx - 1.05, 1.21, gz + 0.85), V(0, -1, -0.3), { ao: false, sub: 2 });
    for (const s of [-1, 1]) tri(wb, 'planks', V(gx + s * 0.9, 1.3, gz - 0.7), V(gx + s * 0.9, 1.3, gz + 0.7), V(gx + s * 0.9, 1.58, gz - 0.7), V(s, 0, 0), { ao: false, tint: MADERA });
    for (const [dx, dz, r] of [
      [-0.4, 1.4, 0.4],
      [0.6, 1.9, 2.2],
      [-1.4, 0.6, -0.8],
      [1.3, 1.1, 1.5],
    ])
      wb.at(gx + dx, 0.06, gz + dz, r, () => {
        P.ellipsoid({ wb }, 'feathers', 0, 0, 0, 0.16, 0.1, 0.1, [0.86, 0.82, 0.74]);
        wb.box('clothRed', 0.14, 0.02, -0.015, 0.2, 0.06, 0.015, { ao: false });
      });
    for (let k = 0; k < 18; k++) wb.box('feathers', gx + Math.cos(k * 1.7) * (0.8 + (k % 4) * 0.35), 0.02, gz + 0.9 + Math.sin(k * 1.7) * (0.6 + (k % 5) * 0.2), gx + Math.cos(k * 1.7) * (0.8 + (k % 4) * 0.35) + 0.05, 0.025, gz + 0.9 + Math.sin(k * 1.7) * (0.6 + (k % 5) * 0.2) + 0.1, { ao: false, faces: 't', tint: [0.86, 0.84, 0.78] });
  }
  // el muladar, con sus huesos, y las tinas
  {
    const mx = x0 + 3.0,
      mz = z1 - 1.8;
    wb.geometry('dirt', new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.Matrix4().compose(V(mx, -0.05, mz), new THREE.Quaternion(), V(1.7, 0.55, 1.1)), { ao: false, tint: [0.36, 0.3, 0.24] });
    P.bones(ctx, mx, 0.35, mz, 10, 4721, 0.7);
    P.decal(ctx, mx, 0.02, mz, 3.2, 'splat', null, { tint: [0.25, 0.22, 0.16] });
    ctx.col.add(mx - 1.3, 0, mz - 0.8, mx + 1.3, 0.45, mz + 0.8);
  }
  P.barrel(ctx, x1 - 1.0, 0, z1 - 1.2, {});
  P.barrel(ctx, x1 - 1.9, 0, z1 - 1.0, { lying: true, rot: 1.1 });
  P.basket(ctx, x0 + 5.6, 0, z1 - 1.0, { tipped: true, rot: 2.4 });
  ctx.rats.push({ x: x0 + 3.0, y: 0, z: z1 - 1.8, n: 3 });
  ctx.crows.push({ x: x0 + 3.0, y: 0.4, z: z1 - 1.8, r: 1.2, n: 3 });
  L.interact.push({ kind: 'examine', id: 'x_gallinero', text: 'gallinero', x: x1 - 2.0, y: 0, z: z0 + 2.4, r: 1.8 });
}

// ------------------------------------------------------------------------ el pajar y los carros
// Entre las cuadras y la muralla del sur: la paja bajo su tejadillo contra la
// muralla, en pacas y suelta, y los carros de la guarnición (uno volcado, a
// otro le falta una rueda), con los sacos del pienso.
function pajar(ctx, C) {
  const K = C.pajar;
  // (la paja en pacas, contra la muralla: la puerta del sur de las cuadras
  // da aquí, y su paso queda libre)
  P.leanTo(ctx, K.x0, K.z0, K.x0 + 5.4, K.z1, 'w', 4.0, 2.8);
  for (const [x, y, z, r] of [
    [K.x0 + 0.6, 0, K.z0 + 0.9, Math.PI / 2],
    [K.x0 + 0.6, 0, K.z0 + 2.5, Math.PI / 2],
    [K.x0 + 0.6, 0.81, K.z0 + 1.7, Math.PI / 2 + 0.06],
    [K.x0 + 1.7, 0, K.z1 - 0.6, 0.1],
  ])
    P.hay(ctx, x, y, z, r);
  P.sacks(ctx, K.x0 + 2.4, 0, K.z0 + 0.5, 3, 4732);
  P.hayMound(ctx, K.x0 + 8.2, 0, K.z0 + 2.2, 1.3, 4731);
  P.cart(ctx, K.x1 - 0.6, 0, K.z0 + 0.6, 0.25, {});
  P.cart(ctx, K.x1 + 1.5, 0, K.z0 + 3.0, 1.2, { brokenWheel: true });
  P.cartWheel(ctx, K.x0 + 5.9, 0, K.z0 + 0.2, 0.2, {});
}

// ------------------------------------------------------------------------ la fragua
// La del armero: un cobertizo contra la muralla del sur, con su muro de
// poniente, la forja encendida bajo su campana y su chimenea, que sale por el
// tejadillo; el fuelle, el yunque sobre su cepa, la pila de templar, la tabla
// de las herramientas, el carbón, las barras, la muela y las lanzas a medio
// hacer. Alguien la mantiene encendida.
function fragua(ctx, L, C) {
  const wb = ctx.wb;
  const F = C.fragua;
  const yHi = 5.0,
    yLo = 3.2;
  P.leanTo(ctx, F.x0, F.z0, F.x1, F.z1, 's', yHi, yLo);
  // el muro de poniente, hasta el tejadillo
  const yAt = (z) => yLo + ((yHi - yLo) * (z - F.z0)) / (F.z1 - F.z0);
  solid(ctx, 'wallstone', F.x0 - 0.5, 0, F.z0, F.x0, yLo - 0.12, F.z1, { faces: 'tnsew', sub: 2, aoH: 1.5, tint: FUERA });
  for (const [s, x] of [
    [-1, F.x0 - 0.5],
    [1, F.x0],
  ])
    cara(wb, 'wallstone', V(x, yLo - 0.12, F.z0), V(x, yLo - 0.12, F.z1), V(x, yAt(F.z1) - 0.12, F.z1), V(x, yAt(F.z0) - 0.12, F.z0), V(s, 0, 0), { sub: 2, tint: FUERA, baseY: 0 });
  ctx.col.add(F.x0 - 0.5, yLo - 0.12, F.z0, F.x0, yHi, F.z1);
  // el suelo, de tierra pisada con la cascarilla del hierro
  wb.box('dirt', F.x0, 0.0, F.z0, F.x1, 0.025, F.z1, { faces: 't', ao: false, sub: 2, tint: [0.34, 0.3, 0.27] });
  // la forja, contra la muralla, y su chimenea por encima del tejadillo
  const fx = F.x0 + 4.4,
    fz = F.z1 - 1.1;
  P.forge(ctx, fx, 0, fz, Math.PI);
  {
    const y0 = yAt(fz) - 0.4;
    wb.box('wallstone', fx - 0.66, y0, fz - 0.56, fx + 0.66, yHi + 2.2, fz + 0.56, { faces: 'nsew', sub: 2, ao: false, tint: [0.6, 0.57, 0.53] });
    wb.box('wallstone', fx - 0.75, yHi + 2.2, fz - 0.65, fx + 0.75, yHi + 2.45, fz + 0.65, { faces: 'tnsewb', ao: false, tint: [0.36, 0.33, 0.3] });
    wb.box('black', fx - 0.45, yHi + 2.44, fz - 0.35, fx + 0.45, yHi + 2.46, fz + 0.35, { faces: 't', ao: false, grime: false });
    ctx.fires.push({ x: fx, y: yHi + 2.55, z: fz, s: 0.4, smoke: true, embers: false, light: false });
    ctx.col.addCam(fx - 0.6, y0, fz - 0.5, fx + 0.6, yHi + 2.45, fz + 0.5);
  }
  P.bellows(ctx, fx - 1.9, 0, fz + 0.1, Math.PI);
  P.anvil(ctx, fx + 1.6, 0, fz - 2.3, 0.3);
  P.trough(ctx, fx + 3.4, 0, F.z1 - 0.8, 0, { len: 1.6 });
  P.coalPile(ctx, fx - 2.4, 0, F.z0 + 2.2, 0.9);
  P.toolBoard(ctx, fx + 2.6, 1.3, F.z1 - 0.05, Math.PI);
  P.ironBars(ctx, F.x1 - 2.6, 0, F.z0 + 1.6, 0.4);
  P.weaponRack(ctx, F.x1 - 1.2, 0, F.z1 - 0.5, Math.PI);
  // la muela de afilar
  {
    const gx = F.x1 - 1.4,
      gz = F.z0 + 3.4;
    for (const s of [-1, 1]) wb.box('wooddark', gx - 0.08, 0, gz + s * 0.35 - 0.05, gx + 0.08, 0.8, gz + s * 0.35 + 0.05, { ao: false });
    wb.push();
    wb.translate(gx, 0.75, gz);
    wb.rotateX(Math.PI / 2);
    wb.cylinder('wallstone', 0, -0.1, 0, 0.42, 0.42, 0.2, 12, { ao: false, capTop: true, capBot: true });
    wb.pop();
    P.colOBB(ctx, gx, gz, 0.45, 0.45, 0, 0, 1.0);
  }
  // las herraduras en su cajón, unas tenazas, una hoja a medio forjar en el
  // yunque
  wb.box('planks', fx + 3.0, 0, F.z0 + 1.0, fx + 3.8, 0.45, F.z0 + 1.6, { ao: false, tint: MADERA });
  for (let k = 0; k < 6; k++) wb.box('iron', fx + 3.1 + (k % 3) * 0.22, 0.45, F.z0 + 1.1 + Math.floor(k / 3) * 0.24, fx + 3.26 + (k % 3) * 0.22, 0.48, F.z0 + 1.28 + Math.floor(k / 3) * 0.24, { ao: false });
  ctx.col.add(fx + 3.0, 0, F.z0 + 1.0, fx + 3.8, 0.45, F.z0 + 1.6);
  wb.at(fx + 1.6, 0.86, fz - 2.3, 0.6, () => {
    wb.box('iron', -0.04, 0.004, -0.32, 0.04, 0.016, 0.32, { ao: false });
    wb.box('ember', -0.035, 0.016, -0.08, 0.035, 0.024, 0.2, { ao: false, grime: false, faces: 'tnsew' });
  });
  // el armero, caído junto al yunque
  bakeCorpse(wb, fx + 0.4, 0, fz - 3.6, 0.6, 'face', 'soldier', 4741);
  P.decal(ctx, fx + 0.4, 0.03, fz - 3.6, 1.8);
  L.enemies.push({ type: 'penitent', x: fx + 2.8, y: 0, z: fz - 3.4, yaw: -2.2, idle: 'eat', id: 'e_fragua' });
  L.interact.push({ kind: 'examine', id: 'x_fragua', text: 'fraguaPatio', x: fx, y: 0, z: fz - 1.6, r: 1.8 });
}

// ------------------------------------------------------------------------ la muralla vieja
// Lo que queda de la muralla de poniente de antes, al pie de la torre de la
// cárcel: el lienzo, arrasado hasta la altura de un hombre y medio, con lo
// alto desmochado (los sillares sueltos, la hierba), y el cascajo de la
// demolición por los dos cabos. (Por debajo sube la escalera de las
// mazmorras a la torre.)
function muroViejo(ctx, C) {
  const wb = ctx.wb;
  const O = C.oesteViejo;
  const rng = new RNG(4751);
  solid(ctx, 'wallstone', O.x0, 0, O.z0, O.x1, O.h - 0.6, O.z1, { faces: 'tnsew', sub: 2.2, aoH: 2.5, mats: { t: 'dirt' }, tint: FUERA });
  for (let z = O.z0 + 0.2; z < O.z1 - 0.3; z += rng.range(0.5, 0.9)) {
    const hh = rng.range(0.1, 0.8);
    const xa = O.x0 + rng.range(0, 0.6),
      xb = O.x1 - rng.range(0, 0.6);
    wb.box('wallstone', xa, O.h - 0.6, z, xb, O.h - 0.6 + hh, z + rng.range(0.4, 0.8), { ao: false, sub: 2, faces: 'tnsew', tint: FUERA });
  }
  ctx.col.add(O.x0, O.h - 0.6, O.z0, O.x1, O.h + 0.4, O.z1);
  P.weeds(ctx, (O.x0 + O.x1) / 2, O.h - 0.6, O.z0 + 2.0, 6, 4752, 0.8);
  P.weeds(ctx, (O.x0 + O.x1) / 2, O.h - 0.6, O.z1 - 3.0, 5, 4753, 0.8);
  P.rubble(ctx, (O.x0 + O.x1) / 2, 0, O.z0 - 1.6, 12, 4754, 1.8, { mat: 'wallstone', scale: 1.2 });
  P.rubble(ctx, (O.x0 + O.x1) / 2 - 0.6, 0, O.z1 + 1.4, 8, 4755, 1.4, { mat: 'wallstone', scale: 1.0 });
}
