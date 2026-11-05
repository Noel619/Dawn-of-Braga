// Las cámaras de la reina (PLAN_FORTALEZA.md, §5.8): al noroeste, entre su
// torre y la del homenaje.
//
// Abajo, el estrado de las damas (su puerta, al patio): los almohadones, el
// telar tapado, el torno, los arcones; las dueñas que lloran. Arriba, a +5,5,
// la sala de la reina bajo su armadura de par y nudillo, con sus ventanas al
// jardín y al patio: su sitial bajo el dosel, la mesa con el ajedrez a medio
// jugar, el hogar frío y lo que se tapó con sábanas cuando la bajaron a la Sé.
//
// Su torre, la del noroeste, en tres plantas unidas por un caracol: la
// entrada, con sus arcones; el oratorio (el relicario en el altar), del que
// salen la puerta de la sala y la galería del gran salón; y arriba, su cámara:
// la cama bajo el dosel, tapada, la silla del Rey a su lado con la vela que se
// acabó, el reclinatorio con su libro de horas y la dueña que se quedó con
// ella.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid } from './builders.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';
import { chest } from './level_souto.js';
import { FORT } from './fortaleza_medidas.js';
import { PIEDRA, ajimez, muroVanos, forjado, caracol, sitial, tapiz, dentro, cara1, saeteraDentro, armadura, lineaTejado, caraTejado, farol, tri, cara, talud } from './fortaleza_atrezo.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);
const F1 = FORT.F1;
const E = FORT.eave;
const CAL = [0.86, 0.82, 0.74];

export function buildReina(ctx, S, L) {
  estrado(ctx, S, L);
  salaAlta(ctx, L);
  torre(ctx, S, L);
  fueraNO(ctx);
}

// La cara de levante de la torre de la reina por fuera: sobre el tejado de su
// sala y sobre el adarve de la muralla.
function fueraNO(ctx) {
  const R = FORT.reina,
    T = FORT.torres.NO;
  const tint = PIEDRA.lienzo.map((v) => v * 0.97);
  caraTejado(ctx, 'wallstone', 'e', T.x1, R.z0, T.z1, T.h, tejadoCamaras(R), { sobre: true, tint, aoH: 3, baseY: 0 });
  ctx.wb.box('wallstone', T.x1, FORT.walk, T.z0 + T.t, T.x1 + 0.01, T.h, R.z0, { faces: 'e', sub: 2.2, aoH: 3, baseY: 0, room: null, tint });
}

// La línea del tejado de las cámaras (de los dos lados de la torre del
// homenaje): a dos aguas, de la muralla al patio.
export function tejadoCamaras(R) {
  return lineaTejado((R.z0 + FORT.patio.z0) / 2, (FORT.patio.z0 - R.z0) / 2, E, R.ridge);
}

// ------------------------------------------------------------------------ el estrado de las damas
function estrado(ctx, S, L) {
  const wb = ctx.wb;
  const R = FORT.reina,
    T = FORT.torres.NO;
  const room = 'estrado_damas';
  const { x0, x1, z0, z1 } = R;
  const tint = [0.8, 0.76, 0.7];
  W(S, x0, z0, x1, z1);
  wb.box('planks', x0, -0.05, z0, x1, 0.02, z1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room, tint: [0.62, 0.55, 0.46] });
  // los cabos que asoman a la sala: el del muro del patio y el de la torre
  cara1(ctx, 'wallstone', 'n', z1, FORT.patio.x0 - FORT.ti, FORT.patio.x0, 0, F1, room, tint);
  cara1(ctx, 'wallstone', 'e', x0, T.z1 - T.t, z1, 0, F1, room, tint);
  // el techo: el forjado de la sala de arriba, con su viga maestra
  forjado(ctx, x0, z0, x1, z1, F1, [], 'reina_alta', room, { tint: [0.62, 0.54, 0.46] });
  for (const x of [-121.0, -116.0]) {
    wb.box('timber', x - 0.18, F1 - 0.72, z0, x + 0.18, F1 - 0.3, z1, { ao: false, faces: 'nsewb', room });
    for (const z of [z0, z1]) wb.box('wooddark', x - 0.22, F1 - 1.0, z === z0 ? z0 : z1 - 0.35, x + 0.22, F1 - 0.72, z === z0 ? z0 + 0.35 : z1, { ao: false, faces: 'nsewb', room });
  }
  // el estrado de las damas, contra la muralla, con sus almohadones; el telar
  // tapado; los arcones
  wb.setRoom(room);
  solid(ctx, 'planks', x0 + 2, 0, z0, x1 - 2, 0.3, z0 + 2.4, { faces: 'ts', ao: false, room, tint: [0.56, 0.48, 0.4] });
  for (let x = x0 + 2.8; x < x1 - 2.4; x += 1.5) wb.box(['clothRed', 'clothBlue', 'clothPurple'][Math.round(x) & 1 ? 0 : 1], x - 0.4, 0.3, z0 + 0.6, x + 0.4, 0.5, z0 + 1.4, { ao: false, faces: 'tnsew', room });
  P.loom(ctx, x0 + 6.0, 0, z1 - 1.6, 0, { room, cloth: 'clothRed' });
  wb.box('linen', x0 + 4.8, 0.02, z1 - 2.5, x0 + 7.2, 1.85, z1 - 0.6, { ao: false, faces: 'tnsew', room, tint: [0.78, 0.76, 0.72] });
  chest(ctx, x0 + 1.0, 0, z1 - 1.0, Math.PI / 2, room, 1.2);
  chest(ctx, x0 + 3.0, 0, z1 - 0.7, 0, room, 1.0);
  P.spinningWheel(ctx, x0 + 8.8, 0, z1 - 1.3, 0.6, { room });
  P.brazier(ctx, (x0 + x1) / 2, 0, z0 + 3.2, { room });
  P.candles(ctx, x1 - 1.0, 0, z0 + 3.0, 4, 6701, { room, radius: 7, intensity: 1.0 });
  P.candles(ctx, x0 + 1.0, 0.3, z0 + 1.0, 4, 6703, { room, radius: 7, intensity: 0.9 });
  ctx.lights.push({ x: (x0 + x1) / 2, y: 3.4, z: (z0 + z1) / 2, r: 1, g: 0.5, b: 0.26, radius: 11, intensity: 0.5, room });
  tapiz(ctx, (x0 + x1) / 2, 4.6, z0 + 0.06, 0, 4.0, 2.8, { room, mat: 'clothBlue' });
  wb.setRoom(null);
  L.enemies.push({ type: 'mourner', x: x0 + 4.4, y: 0, z: z0 + 3.4, yaw: 0, idle: 'stand', id: 'e_reina1' }, { type: 'mourner', x: x1 - 5.4, y: 0, z: (z0 + z1) / 2, yaw: -1.2, idle: 'stand', id: 'e_reina2' });
  L.zones.push({ id: 'estrado_damas', rects: [[x0, z0, x1, z1, -1, F1 - 0.3]], atmo: 'interior', room });
  L.map.push({ id: 'estrado_damas', r: [x0, z0, x1, z1] });
}

// ------------------------------------------------------------------------ la sala de la reina
function salaAlta(ctx, L) {
  const wb = ctx.wb;
  const R = FORT.reina,
    T = FORT.torres.NO,
    Pt = FORT.patio;
  const room = 'reina_alta';
  const { x0, x1, z0, z1 } = R;
  const y = F1;
  const tint = [0.8, 0.76, 0.7];
  const Tj = tejadoCamaras(R);
  // los muros por dentro, hasta la armadura: los cabos del muro del patio y
  // del de la torre; por encima del alero, los hastiales (contra la torre de
  // la reina y contra la del homenaje) y la tira del muro del patio
  cara1(ctx, 'wallstone', 'n', z1, Pt.x0 - FORT.ti, Pt.x0, y, E, room, tint);
  cara1(ctx, 'wallstone', 'e', x0, T.z1 - T.t, z1, y, E, room, tint);
  const zE = Tj.uc - (Tj.yR - Tj.tv - E) / Tj.slope;
  caraTejado(ctx, 'wallstone', 'e', x0, zE, z1, E, Tj, { room, tint });
  wb.box('ashlar', x1 - 0.01, y, z0, x1, E, z1, { faces: 'w', room, tint: PIEDRA.torre.map((v) => v * 1.1), sub: 2, aoH: 1.5, baseY: y });
  caraTejado(ctx, 'ashlar', 'w', x1, zE, z1, E, Tj, { room, tint: PIEDRA.torre.map((v) => v * 1.1) });
  wb.box('wallstone', x0, E, z1 - 0.01, x1, Tj.yb(z1) + 0.03, z1, { faces: 'n', room, tint, sub: 2.2, aoH: 2.5, baseY: y });
  // la armadura de par y nudillo, con sus tirantes pareados
  armadura(ctx, { axis: 'x', s0: x0, s1: x1, ui0: z0, ui1: z1, T: Tj, room, paso: 0.58, nudillo: 0.42, tirantes: [-122.6, -118.5, -114.4], tint: [0.5, 0.4, 0.32] });
  // las ventanas por dentro: al jardín y al patio
  for (const x of [-121.5, -115.5]) ajimez(ctx, 's', z0, x, y + 1.1, { h: 1.3, room, boca: 'luna', radius: 5, intensity: 0.55 });
  ajimez(ctx, 'n', z1, R.puerta, y + 1.1, { h: 1.25, room, boca: 'luna', radius: 5, intensity: 0.5 });
  // el hogar, frío, entre las ventanas del jardín: el lar con su ceniza, las
  // jambas, la campana y su cañón hasta la armadura
  {
    const hx = -118.5,
      hz = z0;
    solid(ctx, 'ashlar', hx - 1.4, y, hz, hx + 1.4, y + 0.25, hz + 0.8, { faces: 'tnew', ao: false, room, tint: [0.56, 0.52, 0.48], mats: { t: 'flag' } });
    for (const s of [-1, 1]) solid(ctx, 'ashlar', hx + s * 1.25 - 0.18, y, hz, hx + s * 1.25 + 0.18, y + 1.6, hz + 0.85, { faces: 'tnsew', sub: 2, room, tint: [0.72, 0.69, 0.64] });
    solid(ctx, 'ashlar', hx - 1.5, y + 1.6, hz, hx + 1.5, y + 2.0, hz + 0.95, { faces: 'tnsewb', sub: 2, room, tint: [0.68, 0.65, 0.6] });
    const hood = [V(hx - 1.5, y + 2.0, hz + 0.95), V(hx + 1.5, y + 2.0, hz + 0.95), V(hx + 0.6, y + 3.6, hz + 0.2), V(hx - 0.6, y + 3.6, hz + 0.2)];
    cara(wb, 'ashlar', hood[0], hood[1], hood[2], hood[3], V(0, 0.5, 1), { ao: false, room, tint: [0.6, 0.57, 0.52] });
    tri(wb, 'ashlar', V(hx - 1.5, y + 2.0, hz), hood[0], hood[3], V(-1, 0, 0), { ao: false, room, tint: [0.55, 0.52, 0.48] });
    tri(wb, 'ashlar', V(hx + 1.5, y + 2.0, hz), hood[1], hood[2], V(1, 0, 0), { ao: false, room, tint: [0.55, 0.52, 0.48] });
    wb.box('ashlar', hx - 0.6, y + 3.6, hz, hx + 0.6, Tj.yb(hz + 0.2) + 0.1, hz + 0.2, { faces: 'swe', ao: false, room, tint: [0.58, 0.55, 0.5] });
    wb.box('black', hx - 1.05, y + 0.25, hz + 0.01, hx + 1.05, y + 1.6, hz + 0.02, { faces: 's', ao: false, grime: false, room });
    wb.box('dirt', hx - 0.8, y + 0.25, hz + 0.1, hx + 0.8, y + 0.29, hz + 0.7, { faces: 't', ao: false, room, tint: [0.4, 0.38, 0.36] });
    P.firewood(ctx, hx + 0.1, y + 0.27, hz + 0.4, 0.2, 2);
    ctx.col.add(hx - 1.5, y, hz, hx + 1.5, y + 2.0, hz + 0.95);
  }
  // el estrado de la reina, en el testero (contra la torre del homenaje): la
  // tarima, su sitial bajo el dosel azul y el tapiz
  const ex = x1 - 1.4,
    ez = (z0 + z1) / 2;
  solid(ctx, 'planks', x1 - 2.8, y, ez - 2.6, x1, y + 0.3, ez + 2.6, { faces: 'tnsw', ao: false, room, tint: [0.58, 0.5, 0.42] });
  sitial(ctx, ex, y + 0.3, ez, -Math.PI / 2, room);
  wb.box('clothBlue', x1 - 2.1, y + 3.6, ez - 1.5, x1, y + 3.7, ez + 1.5, { ao: false, faces: 'tbnsew', room });
  wb.box('clothBlue', x1 - 2.1, y + 3.15, ez - 1.5, x1 - 2.0, y + 3.6, ez + 1.5, { ao: false, faces: 'tbnsew', room, tint: [0.8, 0.8, 0.8] });
  tapiz(ctx, x1 - 0.06, y + 3.4, ez, -Math.PI / 2, 2.6, 3.0, { room, mat: 'clothBlue' });
  // la mesa del ajedrez, a medio jugar, y sus escabeles
  {
    const tx = -117.2,
      tz = ez + 0.6;
    wb.setRoom(room);
    P.table(ctx, tx, y, tz, 2.2, 1.0, 0, {});
    wb.box('clothRed', tx - 1.12, y + 0.8, tz - 0.52, tx + 1.12, y + 0.82, tz + 0.52, { ao: false, faces: 'tnsew', room, tint: [0.7, 0.62, 0.6] });
    const bx = tx + 0.2,
      bz = tz,
      c = 0.07;
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 8; j++) wb.box((i + j) % 2 ? 'wooddark' : 'bone', bx + (i - 4) * c, y + 0.82, bz + (j - 4) * c, bx + (i - 3) * c, y + 0.84, bz + (j - 3) * c, { ao: false, faces: 't', room, tint: (i + j) % 2 ? [0.4, 0.3, 0.24] : [0.86, 0.82, 0.72], grime: false });
    wb.box('wooddark', bx - 4 * c - 0.03, y + 0.82, bz - 4 * c - 0.03, bx + 4 * c + 0.03, y + 0.835, bz + 4 * c + 0.03, { ao: false, faces: 'nsew', room });
    const rng = new RNG(6721);
    for (let k = 0; k < 14; k++) {
      const i = rng.int(0, 7),
        j = rng.int(0, 7);
      const h = rng.range(0.04, 0.08);
      wb.cylinder('bone', bx + (i - 3.5) * c, y + 0.84, bz + (j - 3.5) * c, 0.022, 0.026, h, 6, { ao: false, capTop: true, room, tint: k % 2 ? [0.3, 0.22, 0.18] : [0.9, 0.86, 0.76] });
    }
    // (dos piezas caídas, del lado de ella)
    wb.cylinder('bone', tx + 0.9, y + 0.82, tz + 0.3, 0.022, 0.026, 0.06, 6, { ao: false, capTop: true, room });
    P.stool(ctx, tx + 1.4, y, tz, { room });
    P.stool(ctx, tx - 1.4, y, tz, { room });
    P.candles(ctx, tx - 0.7, y + 0.82, tz - 0.2, 3, 6722, { room, radius: 6, intensity: 0.9 });
    wb.setRoom(null);
  }
  // lo tapado: el arpa, el bufete y el espejo, bajo sus sábanas; los arcones
  wb.setRoom(room);
  for (const [sx, sz, w, d, h] of [
    [x0 + 1.6, z1 - 1.2, 1.0, 0.7, 1.9],
    [x0 + 3.2, z0 + 0.6, 1.2, 0.6, 1.3],
    [-116.2, z1 - 0.8, 1.2, 0.6, 1.1],
  ]) {
    wb.box('linen', sx - w / 2, y, sz - d / 2, sx + w / 2, y + h, sz + d / 2, { ao: false, faces: 'tnsew', room, tint: [0.8, 0.78, 0.74] });
    wb.box('linen', sx - w / 2 - 0.06, y, sz - d / 2 - 0.06, sx + w / 2 + 0.06, y + 0.25, sz + d / 2 + 0.06, { ao: false, faces: 'tnsew', room, tint: [0.74, 0.72, 0.68] });
    ctx.col.add(sx - w / 2, y, sz - d / 2, sx + w / 2, y + h, sz + d / 2);
  }
  chest(ctx, x0 + 0.7, y, z0 + 1.0, Math.PI / 2, room, 1.2);
  chest(ctx, -111.9, y, z0 + 1.0, -Math.PI / 2, room, 1.0);
  wb.setRoom(null);
  tapiz(ctx, x0 + 0.06, y + 3.2, z1 - 2.8, Math.PI / 2, 2.0, 2.4, { room, mat: 'clothRed' });
  P.candles(ctx, x1 - 3.1, y, ez - 2.2, 3, 6724, { room, radius: 5, intensity: 0.8 });
  L.enemies.push({ type: 'mourner', x: ex - 2.2, y, z: ez - 1.2, yaw: Math.PI / 2, idle: 'stand', id: 'e_reina3' });
  L.zones.push({ id: 'reina_alta', rects: [[x0, z0, x1, z1, F1 - 0.3, R.ridge]], atmo: 'interior', room });
  L.map.push({ id: 'reina_alta', r: [x0, z0, x1, z1] });
}

// ------------------------------------------------------------------------ la torre de la reina
function torre(ctx, S, L) {
  const wb = ctx.wb;
  const R = FORT.reina,
    T = FORT.torres.NO,
    G = FORT.galeria;
  const ix0 = T.x0 + T.t,
    ix1 = T.x1 - T.t,
    iz0 = T.z0 + T.t,
    iz1 = T.z1 - T.t;
  const cx = (ix0 + ix1) / 2,
    cz = (iz0 + iz1) / 2;
  const pisos = R.pisos,
    techo = R.techo;
  const rooms = ['reina_torre', 'reina_oratorio', 'reina_camara'];
  const piedra = [0.74, 0.71, 0.66];
  const bands = pisos.map((y, k) => ({ room: rooms[k], y0: k ? y - 0.3 : 0, y1: k < 2 ? pisos[k + 1] - 0.3 : techo, mat: k ? 'plaster' : 'wallstone', tint: k ? CAL : piedra }));
  W(S, ix0, iz0, ix1, iz1);
  // el muro de levante, con las puertas del estrado (abajo) y de la sala (en
  // el oratorio)
  const zd = R.puertaTorre;
  const tSala = [0.8, 0.76, 0.7];
  muroVanos(ctx, 'z', iz0, iz1, T.x1 - T.t, T.x1, 0, T.h, [{ c: zd, w: 1.4, y: 0, h: 2.4, rise: 0.7, ring: 0.24, room: rooms[0] }, { c: zd, w: 1.4, y: pisos[1], h: 2.4, rise: 0.7, ring: 0.24, room: rooms[1] }], bands, [{ room: 'estrado_damas', y0: 0, y1: F1, tint: tSala }, { room: 'reina_alta', y0: F1, y1: E, tint: tSala }], { tint: piedra });
  W(S, T.x1 - T.t - 0.3, zd - 0.7, T.x1 + 0.3, zd + 0.7);
  L.interact.push(
    { kind: 'door', id: 'd_torre_reina', x: T.x1 - T.t / 2, y: 0, z: zd, w: 1.4, h: 3.1, arch: true, axis: 'z', mat: 'planks', hinge: -1, swing: -1, plane: T.x1 - T.t, inset: 0.06, lock: { type: 'none' } },
    { kind: 'door', id: 'd_sala_reina', x: T.x1 - T.t / 2, y: pisos[1], z: zd, w: 1.4, h: 3.1, arch: true, axis: 'z', mat: 'planks', hinge: 1, swing: -1, plane: T.x1 - T.t, inset: 0.06, ajar: 0.3, lock: { type: 'none' } }
  );
  // el del sur, con la puerta de la galería del gran salón (en el oratorio)
  muroVanos(ctx, 'x', T.x0, T.x1, T.z1 - T.t, T.z1, 0, T.h, [{ c: (G.x0 + G.x1) / 2, w: G.x1 - G.x0, y: G.y, h: 2.4, rise: 0, room: rooms[1] }], bands, [], { tint: piedra });
  // el del norte, con la puerta del jardín del Rey (abajo): por fuera, sobre
  // su talud, partido en la puerta, con su cordón por encima
  {
    const Pu = FORT.jardin.puerta;
    const Td = FORT.talud;
    const tint = PIEDRA.lienzo.map((v) => v * 0.97);
    const ring = 0.22;
    const l = Pu.x - Pu.w / 2 - ring,
      r = Pu.x + Pu.w / 2 + ring;
    muroVanos(ctx, 'x', T.x0, T.x1, T.z0, T.z0 + T.t, 0, T.h, [{ c: Pu.x, w: Pu.w, y: 0, h: Pu.h, rise: Pu.w / 2, ring, room: rooms[0] }], [{ room: null, y0: 0, y1: T.h, tint }], bands, { tint: piedra, revealRoom: rooms[0] });
    talud(ctx, 'n', T.z0, T.x0, l, Td.h, Td.d, { ext: [Td.d, 0], ends: [false, true], tint });
    talud(ctx, 'n', T.z0, r, T.x1, Td.h, Td.d, { ext: [0, Td.d], ends: [true, false], tint });
    ctx.wb.box('ashlar', l, Td.h - 0.04, T.z0 - 0.16, r, Td.h + 0.2, T.z0 + 0.01, { ao: false, faces: 'nwetb', tint: PIEDRA.silla });
    ctx.wb.box('flag', Pu.x - Pu.w / 2, -0.05, T.z0, Pu.x + Pu.w / 2, 0.02, T.z0 + T.t, { faces: 't', ao: false, room: rooms[0], tint: [0.66, 0.63, 0.58] });
    W(S, Pu.x - Pu.w / 2, T.z0 - Td.d - 0.4, Pu.x + Pu.w / 2, iz0 + 0.3);
    L.interact.push({ kind: 'door', id: 'd_jardin', x: Pu.x, y: 0, z: T.z0 + T.t / 2, w: Pu.w, h: Pu.h + Pu.w / 2, arch: true, axis: 'x', mat: 'planks', hinge: -1, swing: 1, plane: iz0, inset: 0.06, lock: { type: 'none' } });
  }
  // el de poniente, por dentro
  dentro(ctx, T, ['w'], bands);
  // el caracol, los forjados, el suelo y el techo
  const K = caracol(ctx, ix1, iz1, 1.6, pisos, rooms, { tint: [1, 1, 1] });
  for (let k = 1; k < 3; k++) forjado(ctx, ix0, iz0, ix1, iz1, pisos[k], [K.hueco], rooms[k], rooms[k - 1], { tint: [0.62, 0.54, 0.46] });
  wb.box('flag', ix0, -0.05, iz0, ix1, 0.02, iz1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room: rooms[0], tint: [0.7, 0.67, 0.62] });
  wb.box('wooddark', ix0, techo, iz0, ix1, techo + 0.2, iz1, { faces: 'b', ao: false, room: rooms[2], tint: [0.5, 0.44, 0.38] });
  for (let x = ix0 + 0.9; x < ix1 - 0.4; x += 1.4) wb.box('timber', x - 0.12, techo - 0.26, iz0, x + 0.12, techo, iz1, { ao: false, faces: 'nsewb', room: rooms[2] });
  // las ventanas: saeteras abajo; ajimeces al jardín y al campo arriba
  saeteraDentro(ctx, 's', iz0, cx, 1.8, rooms[0]);
  saeteraDentro(ctx, 'e', ix0, cz, 1.8, rooms[0]);
  for (const k of [1, 2]) {
    ajimez(ctx, 's', iz0, cx, pisos[k] + 1.1, { h: 1.4, room: rooms[k], boca: 'luna', radius: 5, intensity: 0.5 });
    ajimez(ctx, 'e', ix0, cz, pisos[k] + 1.1, { h: 1.4, room: rooms[k], boca: 'luna', radius: 5, intensity: 0.5 });
  }
  // abajo: la entrada, con los arcones de la reina, el aguamanil y el farol
  {
    const room = rooms[0];
    wb.setRoom(room);
    chest(ctx, ix0 + 0.6, 0, iz0 + 1.6, Math.PI / 2, room, 1.2);
    chest(ctx, ix0 + 0.6, 0, iz0 + 3.4, Math.PI / 2, room, 1.2);
    chest(ctx, cx - 1.0, 0, iz0 + 0.55, 0, room, 1.1);
    P.bench(ctx, ix0 + 0.5, 0, iz1 - 2.6, 2.0, Math.PI / 2);
    // (el aguamanil: la jofaina de latón en su pie y el jarro)
    wb.cylinder('wooddark', cx + 1.4, 0, iz1 - 0.9, 0.05, 0.07, 0.86, 6, { ao: false, room });
    wb.cylinder('bronzeAged', cx + 1.4, 0.86, iz1 - 0.9, 0.26, 0.16, 0.12, 10, { ao: false, capBot: true, room });
    wb.cylinder('bronzeIn', cx + 1.4, 0.95, iz1 - 0.9, 0.23, 0.23, 0.01, 10, { ao: false, capTop: true, room });
    wb.cylinder('bronzeAged', cx + 1.0, 0, iz1 - 0.6, 0.1, 0.07, 0.34, 8, { ao: false, capTop: true, room });
    ctx.col.add(cx + 1.1, 0, iz1 - 1.2, cx + 1.7, 0.98, iz1 - 0.6);
    wb.setRoom(null);
    farol(ctx, cx - 0.2, 0.5, iz0 + 0.5, room);
    P.wallTorch(ctx, ix0 + 0.02, 2.4, cz + 2.4, 'e', { room });
    // (y otra junto a la puerta del estrado: la entrada se quedaba a oscuras)
    P.wallTorch(ctx, ix1 - 0.02, 2.4, zd - 1.6, 'w', { room, radius: 6.5 });
  }
  // el oratorio: el altar, contra la muralla, con la Virgen pintada y el
  // relicario; el reclinatorio; las velas
  {
    const room = rooms[1],
      y = pisos[1];
    const ax = ix0 + 2.2,
      az = iz0 + 0.55;
    wb.setRoom(room);
    P.altarTable(ctx, ax, y, az, 0, 1.6);
    wb.setRoom(null);
    wb.box('ashlar', ax - 0.75, y + 1.0, iz0 + 0.02, ax + 0.75, y + 2.75, iz0 + 0.1, { faces: 'snewt', ao: false, room, tint: [0.62, 0.5, 0.3] });
    wb.geometry('virgenCarmen', new THREE.PlaneGeometry(1.0, 1.5), new THREE.Matrix4().compose(V(ax, y + 1.9, iz0 + 0.12), new THREE.Quaternion(), V(1, 1, 1)), { ao: false, room, grime: false });
    wb.box('gold', ax - 0.75, y + 2.75, iz0 + 0.02, ax + 0.75, y + 2.85, iz0 + 0.16, { ao: false, room, tint: [0.7, 0.56, 0.3] });
    P.candles(ctx, ax - 0.55, y + 1.02, az, 3, 6731, { room, radius: 6, intensity: 1.0 });
    P.candles(ctx, ax + 0.55, y + 1.02, az, 3, 6732, { room, radius: 6, intensity: 1.0 });
    // el reclinatorio, ante el altar
    const kx = ax,
      kz = az + 1.6;
    wb.box('wooddark', kx - 0.4, y, kz - 0.15, kx + 0.4, y + 0.22, kz + 0.25, { ao: false, room });
    wb.box('wooddark', kx - 0.4, y, kz - 0.42, kx + 0.4, y + 1.0, kz - 0.3, { ao: false, room });
    wb.box('clothRed', kx - 0.45, y + 1.0, kz - 0.6, kx + 0.45, y + 1.06, kz - 0.18, { ao: false, faces: 'tnsewb', room });
    ctx.col.add(kx - 0.45, y, kz - 0.6, kx + 0.45, y + 1.06, kz + 0.25);
    // la lámpara del oratorio, colgada de las vigas, que la reina no dejaba
    // apagar
    P.hangingLamp(ctx, cx + 0.6, pisos[2] - 0.3, cz + 0.4, { room, len: 1.4, radius: 7, intensity: 0.9 });
    L.interact.push({ kind: 'item', id: 'i_relicario_reina', item: 'relicario', x: ax + 0.2, y: y + 1.04, z: az - 0.1 });
    P.banner(ctx, ix1 - 0.08, y + 3.6, cz - 2.4, -Math.PI / 2, 'bannerRey', 1.2, 2.2);
    L.enemies.push({ type: 'cortesanoSuelto', x: kx + 1.4, y, z: kz + 0.4, yaw: Math.PI, idle: 'kneel', id: 'e_reina5' });
  }
  // su cámara: la cama bajo el dosel, tapada con su sábana; la silla del Rey a
  // su lado con el candelero y la vela que se acabó; el reclinatorio con su
  // libro de horas; los arcones; y la dueña, con su farol
  {
    const room = rooms[2],
      y = pisos[2];
    const bx = ix0 + 1.5,
      bz = cz - 1.0;
    wb.setRoom(room);
    P.bed(ctx, bx, y, bz, Math.PI / 2);
    for (const [sx, sz] of [
      [-1.1, -0.6],
      [-1.1, 0.6],
      [1.1, -0.6],
      [1.1, 0.6],
    ])
      wb.box('wooddark', bx + sz - 0.05, y, bz + sx - 0.05, bx + sz + 0.05, y + 2.7, bz + sx + 0.05, { ao: false, room });
    wb.box('clothRed', bx - 0.7, y + 2.7, bz - 1.2, bx + 0.7, y + 2.8, bz + 1.2, { ao: false, faces: 'tnsewb', room });
    wb.box('clothRed', bx - 0.72, y + 1.4, bz - 1.2, bx - 0.68, y + 2.7, bz + 1.2, { ao: false, faces: 'ew', room, tint: [0.8, 0.8, 0.8] });
    // (la sábana que la tapa, con su caída)
    wb.box('linen', bx - 0.62, y + 0.6, bz - 1.12, bx + 0.62, y + 0.68, bz + 1.12, { ao: false, faces: 'tnsew', room, tint: [0.86, 0.84, 0.8] });
    for (const s of [-1, 1]) wb.box('linen', bx + s * 0.62 - (s > 0 ? 0 : 0.03), y + 0.12, bz - 1.12, bx + s * 0.62 + (s > 0 ? 0.03 : 0), y + 0.68, bz + 1.12, { ao: false, faces: s > 0 ? 'e' : 'w', room, tint: [0.82, 0.8, 0.76] });
    // la silla del Rey, de cara a la cama, con el candelero y la vela que se
    // acabó
    const sx = bx + 1.6,
      sz = bz + 0.4;
    wb.at(sx, y, sz, -Math.PI / 2, () => {
      wb.box('wooddark', -0.3, 0.42, -0.28, 0.3, 0.48, 0.28, { ao: false, faces: 'tnsewb', room });
      for (const [px, pz] of [
        [-0.26, -0.24],
        [0.26, -0.24],
        [-0.26, 0.24],
        [0.26, 0.24],
      ])
        wb.box('wooddark', px - 0.03, 0, pz - 0.03, px + 0.03, 0.42, pz + 0.03, { ao: false, room });
      wb.box('wooddark', -0.3, 0.48, -0.3, 0.3, 1.25, -0.24, { ao: false, faces: 'tnsewb', room });
      wb.box('clothRed', -0.26, 0.48, -0.24, 0.26, 0.52, 0.24, { ao: false, faces: 't', room });
    });
    ctx.col.add(sx - 0.32, y, sz - 0.32, sx + 0.32, y + 1.25, sz + 0.32);
    wb.cylinder('iron', sx + 0.5, y, sz + 0.5, 0.14, 0.1, 0.04, 8, { ao: false, capTop: true, room });
    wb.cylinder('iron', sx + 0.5, y + 0.04, sz + 0.5, 0.02, 0.02, 0.9, 6, { ao: false, room });
    wb.cylinder('iron', sx + 0.5, y + 0.94, sz + 0.5, 0.08, 0.06, 0.04, 8, { ao: false, capTop: true, room });
    wb.cylinder('candle', sx + 0.5, y + 0.98, sz + 0.5, 0.03, 0.035, 0.03, 6, { ao: false, capTop: true, grime: false, room, tint: [0.9, 0.85, 0.7] });
    wb.box('candle', sx + 0.44, y + 0.9, sz + 0.47, sx + 0.47, y + 0.97, sz + 0.5, { ao: false, grime: false, room, tint: [0.9, 0.85, 0.7] });
    // el reclinatorio con el libro de horas, junto a la ventana del campo
    const kx = ix1 - 1.4,
      kz = iz0 + 1.6;
    wb.box('wooddark', kx - 0.4, y, kz - 0.15, kx + 0.4, y + 0.22, kz + 0.25, { ao: false, room });
    wb.box('wooddark', kx - 0.4, y, kz - 0.42, kx + 0.4, y + 1.0, kz - 0.3, { ao: false, room });
    wb.box('wooddark', kx - 0.45, y + 1.0, kz - 0.6, kx + 0.45, y + 1.06, kz - 0.18, { ao: false, faces: 'tnsewb', room });
    ctx.col.add(kx - 0.45, y, kz - 0.6, kx + 0.45, y + 1.06, kz + 0.25);
    chest(ctx, ix1 - 0.6, y, cz + 0.4, -Math.PI / 2, room, 1.1);
    chest(ctx, cx - 0.4, y, iz0 + 0.5, 0, room, 1.2);
    P.candles(ctx, kx + 0.6, y, kz - 0.4, 3, 6702, { room, radius: 5, intensity: 0.8 });
    wb.setRoom(null);
    farol(ctx, bx + 0.9, y, bz - 2.0, room);
    ctx.lights.push({ x: cx, y: y + 3.0, z: cz, r: 1, g: 0.5, b: 0.24, radius: 8, intensity: 0.5, room });
    L.interact.push(
      { kind: 'examine', id: 'x_cama_reina', text: 'camaReina', x: bx + 0.9, y, z: bz - 0.6, r: 1.4 },
      { kind: 'note', id: 'n_reina', note: 'reina', x: kx - 0.18, y: y + 1.08, z: kz - 0.42, model: 'book' }
    );
    L.enemies.push({ type: 'mourner', x: bx + 1.6, y, z: bz - 0.9, yaw: -Math.PI / 2, idle: 'stand', id: 'e_reina4' });
  }
  const names = ['reina_torre', 'reina_oratorio', 'reina_camara'];
  pisos.forEach((y, k) => {
    L.zones.push({ id: names[k], rects: [[ix0, iz0, T.x1, iz1, k ? y - 0.3 : -1, k < 2 ? pisos[k + 1] - 0.3 : techo]], atmo: 'interior', room: rooms[k] });
    L.map.push({ id: names[k], r: [T.x0, T.z0, T.x1, T.z1] });
  });
}
