// Las cámaras del Rey (PLAN_FORTALEZA.md, §5.9): al nordeste, entre la torre
// del homenaje y la de la coracha.
//
// Abajo, la antecámara (su puerta al patio, atrancada por dentro), con la
// escalera de tablas pegada a la torre que sube a la cámara del Rey, a +4,5:
// la cama bajo el dosel, el arcón de la reina con su toca, la mesa de sus
// cartas, el brasero. De la cámara, tres escalones abajo por el grueso del
// muro, a la torre de la coracha: su planta de en medio es el guardarropa y el
// oratorio del Rey, que da a la tribuna de la capilla. Por el caracol, abajo,
// el tesoro, cerrado por dentro (el camarero, sentado sobre el arca de la
// cámara); arriba, la planta de la coracha con el altar de la llegada y la
// escalera al pasadizo: el adarve cubierto que llevaba al Rey de sus cámaras a
// su torre, a +12. Lo quemaron con él al otro lado: quedan los pies derechos
// negros, la mitad del tejadillo y la puerta de la torre: el fuego la dejó en
// pie por fuera y carbón por dentro (cede al empujarla: fortaleza_torre.js).
import * as THREE from 'three';
import { beam, archRing } from './builders.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';
import { chest } from './level_souto.js';
import { FORT } from './fortaleza_medidas.js';
import { PIEDRA, ajimez, muroVanos, forjado, caracol, dentro, cara1, saeteraDentro, armadura, caraTejado, cara, tapiz, escaleraTablas } from './fortaleza_atrezo.js';
import { tejadoCamaras } from './fortaleza_reina.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);
const E = FORT.eave;
const TS = [0.8, 0.76, 0.7];

export function buildRey(ctx, S, L) {
  antecamara(ctx, S, L);
  camara(ctx, L);
  torreCoracha(ctx, S, L);
  pasadizo(ctx, L);
  fueraNE(ctx);
}

// La cara de poniente de la torre de la coracha por fuera: sobre el tejado de
// la cámara del Rey (hasta lo alto) y, sobre el adarve del pasadizo, alrededor
// de su puerta.
function fueraNE(ctx) {
  const wb = ctx.wb;
  const K = FORT.rey,
    T = FORT.torres.NE;
  const tint = PIEDRA.lienzo.map((v) => v * 0.97);
  const o = { faces: 'w', sub: 2.2, aoH: 3, baseY: 0, room: null, tint };
  caraTejado(ctx, 'wallstone', 'w', T.x0, K.z0, T.z1, T.h, tejadoCamaras(K), { sobre: true, tint, aoH: 3, baseY: 0 });
  const y = FORT.walk,
    zc = K.pasadizo;
  const d0 = zc - 0.6,
    d1 = zc + 0.6;
  wb.box('wallstone', T.x0 - 0.01, y, T.z0 + T.t, T.x0, T.h, d0, o);
  wb.box('wallstone', T.x0 - 0.01, y, d1, T.x0, T.h, K.z0, o);
  wb.box('wallstone', T.x0 - 0.01, y + 2.4, d0, T.x0, T.h, d1, o);
}

// ------------------------------------------------------------------------ la antecámara
function antecamara(ctx, S, L) {
  const wb = ctx.wb;
  const K = FORT.rey,
    T = FORT.torres.NE;
  const room = 'antecamara';
  const { x0, x1, z0, z1 } = K;
  const yA = K.alto;
  W(S, x0, z0, x1, z1);
  wb.box('flag', x0, -0.05, z0, x1, 0.02, z1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room, tint: [0.74, 0.71, 0.66] });
  cara1(ctx, 'wallstone', 'w', T.x0, T.z1 - T.t, z1, 0, yA, room, TS);
  // la escalera de la cámara, por el muro de la torre del homenaje: sube
  // hacia la muralla; el forjado de la cámara, con su hueco
  const n = 15,
    run = 0.42;
  const sx = x0 + 0.81,
    sz0 = z1 - 1.9;
  escaleraTablas(ctx, sx, 0, sz0, 'n', 1.5, n, yA / n, run, { room, side: 1 });
  const hueco = [x0, sz0 - n * run, x0 + 1.7, sz0 + 0.1];
  forjado(ctx, x0, z0, x1, z1, yA, [hueco], 'camara_rey', room, { tint: [0.6, 0.52, 0.44] });
  for (const z of [-93.6, -90.4]) wb.box('timber', x0 + 1.7, yA - 0.7, z - 0.18, x1, yA - 0.3, z + 0.18, { ao: false, faces: 'nsewb', room });
  // la guardia del Rey: los escaños, la mesa, el guarda muerto y su espada;
  // los paños
  wb.setRoom(room);
  P.bench(ctx, x1 - 0.5, 0, (z0 + z1) / 2 - 2.2, 2.6, Math.PI / 2);
  P.table(ctx, (x0 + x1) / 2 + 0.6, 0, (z0 + z1) / 2 + 1.0, 1.8, 0.9, Math.PI / 2, {});
  P.candles(ctx, (x0 + x1) / 2 + 0.6, 0.82, (z0 + z1) / 2 + 1.0, 3, 6502, { room, radius: 6, intensity: 0.9 });
  bakeCorpse(wb, x1 - 2.4, 0, z1 - 1.4, 0.8, 'back', 'soldier', 74);
  wb.setRoom(null);
  P.decal(ctx, x1 - 2.4, 0.03, z1 - 1.4, 1.8);
  P.dropped(ctx, x1 - 1.6, 0.02, z1 - 2.2, 0.4, 'sword');
  P.banner(ctx, x1 - 0.08, 3.4, z0 + 1.6, -Math.PI / 2, 'bannerRey', 1.2, 2.2);
  P.wallTorch(ctx, (x0 + x1) / 2 + 1.0, 2.3, z0 + 0.02, 's', { room });
  ctx.lights.push({ x: (x0 + x1) / 2, y: 2.8, z: (z0 + z1) / 2, r: 1, g: 0.52, b: 0.24, radius: 9, intensity: 0.6, room });
  L.enemies.push({ type: 'soldier', x: (x0 + x1) / 2 + 1.4, y: 0, z: z0 + 2.4, yaw: Math.PI / 2, idle: 'stand', id: 'e_antecamara1' });
  L.zones.push({ id: 'antecamara', rects: [[x0, z0, x1, z1, -1, yA - 0.3]], atmo: 'interior', room });
  L.map.push({ id: 'antecamara', r: [x0, z0, x1, z1] });
}

// ------------------------------------------------------------------------ la cámara del Rey
function camara(ctx, L) {
  const wb = ctx.wb;
  const K = FORT.rey,
    T = FORT.torres.NE,
    Kt = FORT.torre;
  const room = 'camara_rey';
  const { x0, x1, z0, z1 } = K;
  const y = K.alto;
  const Tj = tejadoCamaras(K);
  // los muros por dentro hasta la armadura: el de la torre del homenaje (sus
  // sillares), el cabo del muro de la torre de la coracha, la tira del muro
  // del patio y los hastiales
  wb.box('ashlar', x0, y, z0, x0 + 0.01, E, z1, { faces: 'e', room, tint: PIEDRA.torre.map((v) => v * 1.1), sub: 2, aoH: 1.5, baseY: y });
  cara1(ctx, 'wallstone', 'w', T.x0, T.z1 - T.t, z1, y, E, room, TS);
  const zE = Tj.uc - (Tj.yR - Tj.tv - E) / Tj.slope;
  caraTejado(ctx, 'ashlar', 'e', x0, zE, z1, E, Tj, { room, tint: PIEDRA.torre.map((v) => v * 1.1) });
  caraTejado(ctx, 'wallstone', 'w', x1, zE, z1, E, Tj, { room, tint: TS });
  wb.box('wallstone', x0, E, z1 - 0.01, x1, Tj.yb(z1) + 0.03, z1, { faces: 'n', room, tint: TS, sub: 2.2, aoH: 2.5, baseY: y });
  armadura(ctx, { axis: 'x', s0: x0, s1: x1, ui0: z0, ui1: z1, T: Tj, room, paso: 0.58, nudillo: 0.42, tirantes: [-82.4, -78.8], tint: [0.46, 0.36, 0.28] });
  // las ventanas por dentro: al jardín y al patio
  ajimez(ctx, 's', z0, -80.5, y + 1.1, { h: 1.3, room, boca: 'luna', radius: 5, intensity: 0.55 });
  ajimez(ctx, 'n', z1, K.puerta + 1.6, y + 1.1, { h: 1.25, room, boca: 'luna', radius: 5, intensity: 0.5 });
  // el antepecho del hueco de la escalera
  {
    const hx = x0 + 1.7,
      hz0 = z1 - 1.9 - 15 * 0.42,
      hz1 = z1 - 1.8;
    wb.box('wooddark', hx, y + 0.95, hz0, hx + 0.08, y + 1.02, hz1, { ao: false, faces: 'tnsewb', room });
    wb.box('wooddark', x0, y + 0.95, hz1 - 0.08, hx + 0.08, y + 1.02, hz1, { ao: false, faces: 'tnsewb', room });
    for (let z = hz0 + 0.4; z < hz1; z += 0.5) wb.box('wooddark', hx + 0.01, y, z - 0.03, hx + 0.07, y + 0.95, z + 0.03, { ao: false, room });
    for (let x = x0 + 0.4; x < hx; x += 0.5) wb.box('wooddark', x - 0.03, y, hz1 - 0.07, x + 0.03, y + 0.95, hz1 - 0.01, { ao: false, room });
    ctx.col.add(hx, y, hz0, hx + 0.08, y + 1.3, hz1);
    ctx.col.add(x0, y, hz1 - 0.08, hx + 0.08, y + 1.3, hz1);
  }
  // la cama del Rey bajo su dosel, contra la torre de la coracha; a sus pies,
  // el arcón de la reina con su toca
  const bx = x1 - 1.1,
    bz = (z0 + z1) / 2 + 0.6;
  wb.setRoom(room);
  P.bed(ctx, bx, y, bz, Math.PI);
  for (const [px, pz] of [
    [bx - 1.1, bz - 0.62],
    [bx - 1.1, bz + 0.62],
    [bx + 0.95, bz - 0.62],
    [bx + 0.95, bz + 0.62],
  ])
    wb.box('wooddark', px - 0.06, y, pz - 0.06, px + 0.06, y + 2.9, pz + 0.06, { ao: false, room });
  wb.box('clothRed', bx - 1.2, y + 2.9, bz - 0.72, bx + 1.05, y + 3.0, bz + 0.72, { ao: false, faces: 'tnsewb', room });
  for (const s of [-1, 1]) wb.box('clothRed', bx - 1.2, y + 1.3, bz + s * 0.72 - 0.02, bx + 1.05, y + 2.9, bz + s * 0.72 + 0.02, { ao: false, faces: s > 0 ? 's' : 'n', room, tint: [0.78, 0.72, 0.72] });
  wb.box('gold', bx + 0.9, y + 3.0, bz - 0.15, bx + 1.0, y + 3.35, bz + 0.15, { ao: false, room });
  // (la colcha revuelta y la almohada: se levantó de prisa)
  wb.box('clothRed', bx - 0.95, y + 0.6, bz - 0.46, bx + 0.2, y + 0.66, bz + 0.46, { ao: false, faces: 'tnsew', room, tint: [0.7, 0.4, 0.36] });
  wb.box('linen', bx + 0.45, y + 0.6, bz - 0.35, bx + 0.9, y + 0.72, bz + 0.35, { ao: false, faces: 'tnsew', room });
  chest(ctx, bx - 1.75, y, bz, Math.PI / 2, room, 1.2);
  wb.box('linen', bx - 2.0, y + 0.52, bz - 0.35, bx - 1.5, y + 0.56, bz + 0.25, { ao: false, faces: 'tnsew', room, tint: [0.92, 0.9, 0.86], grime: false });
  // la mesa de sus cartas, junto a la ventana del patio, con su silla
  const tx = -81.6,
    tz = z1 - 1.6;
  P.table(ctx, tx, y, tz, 1.8, 0.9, 0, {});
  P.stool(ctx, tx, y, tz - 0.8, { room });
  P.candles(ctx, tx + 0.6, y + 0.82, tz + 0.1, 3, 6511, { room, radius: 6, intensity: 0.9 });
  wb.box('clothWhite', tx - 0.6, y + 0.82, tz - 0.25, tx - 0.1, y + 0.825, tz + 0.2, { ao: false, faces: 't', room, grime: false, tint: [0.86, 0.8, 0.64] });
  wb.box('clothWhite', tx - 0.3, y + 0.825, tz - 0.1, tx + 0.15, y + 0.83, tz + 0.3, { ao: false, faces: 't', room, grime: false, tint: [0.8, 0.72, 0.55] });
  wb.setRoom(null);
  P.brazier(ctx, -80.2, y, (z0 + z1) / 2 - 2.0, { room });
  tapiz(ctx, x0 + 2.4, y + 3.4, z0 + 0.06, 0, 1.4, 2.2, { room, mat: 'clothRed' });
  P.wallTorch(ctx, x0 + 1.62, y + 2.3, z0 + 0.8, 'e', { room });
  L.interact.push({ kind: 'examine', id: 'x_cama_rey', text: 'camaRey', x: bx - 0.4, y, z: bz - 1.1, r: 1.4 });
  L.enemies.push({ type: 'soldier', x: -80.0, y, z: z0 + 1.6, yaw: Math.PI, idle: 'stand', id: 'e_rey1' }, { type: 'cortesanoSuelto', x: bx - 1.6, y, z: bz - 1.4, yaw: -Math.PI / 2, idle: 'kneel', id: 'e_rey2' });
  L.zones.push({ id: 'camara_rey', rects: [[x0, z0, x1, z1, y - 0.3, K.ridge]], atmo: 'interior', room });
  L.map.push({ id: 'camara_rey', r: [x0, z0, x1, z1] });
}

// ------------------------------------------------------------------------ la torre de la coracha
// Donde llega la coracha (a su altura, por la puerta de levante): el altar del
// descanso y la escalera del pasadizo. Debajo, por el caracol, el guardarropa
// y el oratorio del Rey (de él se sale a su cámara y a la tribuna de la
// capilla) y el tesoro, cerrado por dentro.
function torreCoracha(ctx, S, L) {
  const wb = ctx.wb;
  const K = FORT.rey,
    T = FORT.torres.NE;
  const ix0 = T.x0 + T.t,
    ix1 = T.x1 - T.t,
    iz0 = T.z0 + T.t,
    iz1 = T.z1 - T.t;
  const yC = FORT.coracha.y;
  const pisos = K.pisos;
  const techo = K.techo;
  const rooms = ['tesoro', 'oratorio_rey', 'coracha_torre'];
  const bands = pisos.map((y, k) => ({ room: rooms[k], y0: k ? y - 0.3 : 0, y1: k < 2 ? pisos[k + 1] - 0.3 : techo, mat: k === 1 ? 'plaster' : undefined, tint: k === 1 ? [0.84, 0.8, 0.72] : undefined }));
  const piedra = [0.74, 0.7, 0.64];
  W(S, ix0, iz0, ix1, iz1);
  // el muro de poniente: la puerta del tesoro (a la antecámara), la de la
  // cámara del Rey (a +4,5: tres escalones bajan por el grueso del muro) y la
  // del pasadizo (a +12)
  const zt = -92.8,
    zc = K.puertaTorre,
    zp = K.pasadizo;
  muroVanos(ctx, 'z', iz0, iz1, T.x0, T.x0 + T.t, 0, T.h, [
    { c: zt, w: 1.4, y: 0, h: 2.4, rise: 0.7, ring: 0.24, room: 'antecamara' },
    { c: zc, w: 1.2, y: pisos[1], h: 2.6, rise: 0.6, ring: 0.24, room: rooms[1] },
    { c: zp, w: 1.2, y: FORT.walk, h: 2.4, rise: 0, room: 'pasadizo_rey' },
  ], [{ room: 'antecamara', y0: 0, y1: K.alto, tint: TS }, { room: 'camara_rey', y0: K.alto, y1: E, tint: TS }], bands, { tint: piedra });
  W(S, T.x0 - 0.3, zt - 0.7, T.x0 + T.t + 0.3, zt + 0.7);
  // (los pasos por el grueso del muro a +4,5, transitables: la rejilla de la
  // superficie levanta hasta +5,2 lo que no lo es)
  W(S, T.x0 - 0.3, zc - 0.6, T.x0 + T.t + 0.3, zc + 0.6);
  L.interact.push({ kind: 'door', id: 'd_tesoro', x: T.x0 + T.t / 2, y: 0, z: zt, w: 1.4, h: 3.1, arch: true, axis: 'z', mat: 'planks', hinge: -1, swing: 1, plane: T.x0 + T.t, inset: 0.06, lock: { type: 'barred', side: 1 }, barredMsg: 'camaraCerrada' });
  // el de levante, con la puerta de la coracha
  const zcor = FORT.coracha.z;
  muroVanos(ctx, 'z', iz0, iz1, T.x1 - T.t, T.x1, 0, T.h, [{ c: zcor, w: 1.6, y: yC, h: 2.4, rise: 0.8, ring: 0.28, room: rooms[2] }], bands, [{ room: null, y0: yC - 0.02, y1: T.h }], { tint: piedra });
  // el del sur, con la puerta de la tribuna de la capilla (a +4,5)
  const xtr = FORT.capilla.x0 + 1.5;
  W(S, xtr - 0.6, T.z1 - T.t - 0.3, xtr + 0.6, T.z1 + 0.3);
  muroVanos(ctx, 'x', T.x0, T.x1, T.z1 - T.t, T.z1, 0, T.h, [{ c: xtr, w: 1.2, y: pisos[1], h: 2.6, rise: 0.6, ring: 0.24, room: rooms[1] }], bands, [{ room: 'capilla', y0: 0, y1: 9.0, tint: [0.8, 0.77, 0.72] }], { tint: piedra });
  dentro(ctx, T, ['n'], bands, { tint: piedra });
  // (por fuera, en la coracha: el recerco de sillería de la puerta, su alfiz,
  // el farol encima y las antorchas a los lados)
  {
    const xo = T.x1;
    for (const s2 of [-1, 1]) wb.box('ashlar', xo, yC, zcor + s2 * 0.95 - 0.22, xo + 0.12, yC + 2.4, zcor + s2 * 0.95 + 0.22, { ao: false, faces: 'ensbt', tint: PIEDRA.silla });
    wb.box('ashlar', xo, yC + 3.55, zcor - 1.4, xo + 0.1, yC + 3.7, zcor + 1.4, { ao: false, faces: 'ensbt', tint: PIEDRA.silla });
    for (const s2 of [-1, 1]) wb.box('ashlar', xo, yC + 2.4, zcor + s2 * 1.3 - 0.075, xo + 0.1, yC + 3.55, zcor + s2 * 1.3 + 0.075, { ao: false, faces: 'ensbt', tint: PIEDRA.silla });
    P.lantern(ctx, xo + 0.05, yC + 3.95, zcor, Math.PI / 2, true);
    P.wallTorch(ctx, xo + 0.02, yC + 2.4, zcor - 1.7, 'e', {});
    P.wallTorch(ctx, xo + 0.02, yC + 2.4, zcor + 1.7, 'e', {});
    ctx.lights.push({ x: xo + 1.6, y: yC + 2.4, z: zcor, r: 1, g: 0.55, b: 0.24, radius: 7, intensity: 1.0 });
  }
  // el caracol, los forjados y el techo
  const C = caracol(ctx, ix1, iz1, 1.6, pisos, rooms, { tint: [1, 1, 1] });
  for (let k = 1; k < 3; k++) forjado(ctx, ix0, iz0, ix1, iz1, pisos[k], [C.hueco], rooms[k], rooms[k - 1]);
  wb.box('flag', ix0, -0.05, iz0, ix1, 0.02, iz1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room: rooms[0], tint: [0.74, 0.71, 0.66] });
  wb.box('wooddark', ix0, techo, iz0, ix1, techo + 0.2, iz1, { faces: 'b', ao: false, room: rooms[2], tint: [0.56, 0.5, 0.44] });
  for (let z = iz0 + 0.8; z < iz1 - 0.4; z += 1.3) wb.box('timber', ix0, techo - 0.24, z - 0.11, ix1, techo, z + 0.11, { ao: false, faces: 'nsewb', room: rooms[2] });
  saeteraDentro(ctx, 's', iz0, (ix0 + ix1) / 2, yC + 1.4, rooms[2]);
  saeteraDentro(ctx, 's', iz0, (ix0 + ix1) / 2, 1.6, rooms[0]);
  saeteraDentro(ctx, 's', iz0, (ix0 + ix1) / 2 + 2.6, pisos[1] + 1.6, rooms[1]);
  // el tesoro: las arcas, la plata en sus estantes, las monedas por el suelo y
  // el camarero, sentado sobre el arca de la cámara
  {
    const room = rooms[0];
    wb.setRoom(room);
    for (const [z, w] of [
      [iz0 + 1.2, 1.4],
      [iz0 + 3.0, 1.2],
      [iz0 + 4.6, 1.4],
    ]) {
      wb.box('wooddark', ix1 - 4.6, 0, z - w / 2, ix1 - 3.7, 0.75, z + w / 2, { ao: false, room, tint: [0.62, 0.5, 0.4] });
      for (const dz of [-w / 2 + 0.15, w / 2 - 0.15]) wb.box('iron', ix1 - 4.62, 0, z + dz - 0.04, ix1 - 3.68, 0.77, z + dz + 0.04, { ao: false, room });
      ctx.col.add(ix1 - 4.6, 0, z - w / 2, ix1 - 3.7, 0.75, z + w / 2);
    }
    P.shelf(ctx, ix0 + 0.3, 0, iz0 + 2.0, Math.PI / 2, 2.2);
    for (let k = 0; k < 6; k++) wb.cylinder('silver', ix0 + 0.35, 0.45 + (k % 3) * 0.6, iz0 + 1.2 + (k > 2 ? 1.3 : 0.2) + (k % 3) * 0.1, 0.09, 0.07, 0.2, 8, { ao: false, capTop: true, room });
    const ax = ix0 + 2.6,
      az = iz1 - 1.6;
    wb.box('wooddark', ax - 1.0, 0, az - 0.6, ax + 1.0, 0.85, az + 0.6, { ao: false, room, tint: [0.7, 0.5, 0.36] });
    wb.box('iron', ax - 1.02, 0.4, az - 0.62, ax + 1.02, 0.48, az + 0.62, { ao: false, room });
    ctx.col.add(ax - 1.0, 0, az - 0.6, ax + 1.0, 0.85, az + 0.6);
    bakeCorpse(wb, ax, 0.85, az, Math.PI, 'sit', 'villager', 73);
    for (let k = 0; k < 18; k++) wb.cylinder('gold', ix0 + 1.0 + ((k * 37) % 23) / 4, 0.02, iz0 + 0.8 + ((k * 53) % 31) / 5, 0.05, 0.05, 0.015, 6, { ao: false, capTop: true, room });
    wb.setRoom(null);
    P.candles(ctx, ax - 0.5, 0.85, az + 0.35, 3, 6504, { room, radius: 7, intensity: 1.1, spread: 0.12 });
    P.hangingLamp(ctx, (ix0 + ix1) / 2 - 1, pisos[1] - 0.35, (iz0 + iz1) / 2 - 1, { room, len: 1.0 });
    ctx.lights.push({ x: (ix0 + ix1) / 2 - 1, y: 2.6, z: (iz0 + iz1) / 2 - 1, r: 1, g: 0.55, b: 0.26, radius: 9, intensity: 0.8, room });
    L.interact.push({ kind: 'item', id: 'i_llave_camarero', item: 'llave_camarero', x: ax + 0.5, y: 0.9, z: az + 0.2 }, { kind: 'note', id: 'n_camarero', note: 'camarero', x: ax - 0.3, y: 0.86, z: az + 0.3, model: 'paper' });
  }
  // el guardarropa y el oratorio del Rey: los arcones y la percha de su ropa,
  // al norte; al sur, junto a la puerta de la tribuna, el altarico con su
  // tabla pintada, el reclinatorio y su sitial
  {
    const room = rooms[1],
      y = pisos[1];
    wb.setRoom(room);
    chest(ctx, ix0 + 0.6, y, iz0 + 1.4, Math.PI / 2, room, 1.2);
    chest(ctx, ix0 + 3.2, y, iz0 + 0.55, 0, room, 1.2);
    chest(ctx, ix1 - 0.6, y, iz0 + 1.6, -Math.PI / 2, room, 1.1);
    wb.box('wooddark', ix0 + 5.0, y + 2.0, iz0 + 0.5, ix0 + 5.06, y + 2.06, iz0 + 4.6, { ao: false, room });
    for (const zz of [iz0 + 0.5, iz0 + 4.6]) wb.box('wooddark', ix0 + 4.99, y, zz - 0.04, ix0 + 5.07, y + 2.06, zz + 0.04, { ao: false, room });
    for (let z = iz0 + 0.8; z < iz0 + 4.4; z += 0.55) wb.box(['clothRed', 'clothBlue', 'clothPurple', 'clothDark'][Math.floor(z * 7) & 3], ix0 + 4.88, y + 0.8, z - 0.22, ix0 + 5.18, y + 2.0, z + 0.22, { ao: false, faces: 'tnsewb', room });
    ctx.col.add(ix0 + 4.85, y, iz0 + 0.5, ix0 + 5.2, y + 2.06, iz0 + 4.6);
    // el oratorio
    const ax = ix0 + 0.55,
      az = iz1 - 2.6;
    P.altarTable(ctx, ax, y, az, Math.PI / 2, 1.4);
    wb.setRoom(null);
    wb.box('gold', ix0 + 0.02, y + 1.05, az - 0.6, ix0 + 0.08, y + 2.45, az + 0.6, { ao: false, faces: 'enstb', room, tint: [0.62, 0.48, 0.26] });
    wb.geometry('animasRetablo', new THREE.PlaneGeometry(1.0, 1.2), new THREE.Matrix4().compose(V(ix0 + 0.1, y + 1.75, az), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)), V(1, 1, 1)), { ao: false, room, grime: false });
    P.candles(ctx, ax + 0.1, y + 1.02, az - 0.45, 3, 6531, { room, radius: 6, intensity: 1.0 });
    P.candles(ctx, ax + 0.1, y + 1.02, az + 0.45, 3, 6532, { room, radius: 6, intensity: 1.0 });
    const kx = ax + 1.6,
      kz = az;
    wb.at(kx, y, kz, -Math.PI / 2, () => {
      wb.box('wooddark', -0.4, 0, -0.15, 0.4, 0.22, 0.25, { ao: false, room });
      wb.box('wooddark', -0.4, 0, -0.42, 0.4, 1.0, -0.3, { ao: false, room });
      wb.box('clothRed', -0.45, 1.0, -0.6, 0.45, 1.06, -0.18, { ao: false, faces: 'tnsewb', room });
    });
    ctx.col.add(kx - 0.6, y, kz - 0.45, kx + 0.25, y + 1.06, kz + 0.45);
    P.bench(ctx, ix0 + 3.4, y, iz1 - 3.6, 1.6, 0);
    ctx.lights.push({ x: (ix0 + ix1) / 2 - 1, y: y + 2.4, z: (iz0 + iz1) / 2 - 2, r: 1, g: 0.55, b: 0.26, radius: 8, intensity: 0.6, room });
    P.wallTorch(ctx, ix0 + 0.02, y + 2.2, iz0 + 2.2, 'e', { room });
  }
  // lo alto: el altar del descanso, contra el muro de poniente, y la escalera
  // de tablas del pasadizo, por el muro del norte, con su rellano
  {
    const room = rooms[2],
      y = yC;
    const axx = ix0 + 1.45,
      azz = (iz0 + iz1) / 2 - 1.2;
    wb.setRoom(room);
    P.candleAltar(ctx, axx, y, azz, Math.PI / 2, room);
    P.candles(ctx, ix1 - 2.2, y, iz0 + 6.4, 4, 5201, { room, radius: 4, intensity: 0.8 });
    P.barrel(ctx, ix1 - 0.9, y, iz0 + 2.9, {});
    bakeCorpse(wb, ix0 + 1.2, y, iz0 + 3.2, 0.6, 'sit', 'soldier', 18);
    P.banner(ctx, ix0 + 0.08, y + 3.0, azz, Math.PI / 2, 'bannerBlack', 1.2, 2.4);
    P.weaponRack(ctx, ix0 + 0.35, y, iz1 - 4.6, Math.PI / 2);
    P.hay(ctx, ix0 + 1.6, y, iz1 - 1.4, 0.4);
    wb.setRoom(null);
    P.brazier(ctx, (ix0 + ix1) / 2 - 0.4, y, iz0 + 5.4, { room });
    P.wallTorch(ctx, ix1 - 0.02, y + 2.5, FORT.coracha.z - 1.6, 'w', { room });
    L.interact.push(
      { kind: 'altar', id: 'a_coracha', name: 'Torre de la coracha', x: axx, y, z: azz, spawn: [axx + 2.2, y, azz], yaw: -Math.PI / 2 },
      { kind: 'item', id: 'i_ampolla4', item: 'ampolla', x: ix1 - 1.05, y: y + 0.62, z: iz0 + 2.9 }
    );
    ctx.lights.push({ x: (ix0 + ix1) / 2, y: y + 2.4, z: (iz0 + iz1) / 2, r: 1, g: 0.55, b: 0.26, radius: 7, intensity: 0.8, room });
    // la escalera: sube hacia poniente por el muro del norte; el rellano, ante
    // la puerta del pasadizo
    const n = 10,
      run = 0.42,
      w = 1.4;
    const lx1 = ix0 + 2.6; // (el rellano, de ix0 a lx1)
    escaleraTablas(ctx, lx1 + n * run - 0.02, y, iz0 + w / 2 + 0.06, 'w', w, n, (FORT.walk - y) / n, run, { room, side: -1 });
    forjado(ctx, ix0, iz0, lx1, iz0 + 2.4, FORT.walk, [], room, room, { tint: [0.6, 0.52, 0.44] });
    wb.box('timber', lx1 - 0.2, y, iz0 + 2.2, lx1, FORT.walk - 0.3, iz0 + 2.4, { aoH: 0.8, faces: 'nsew', room });
    ctx.col.add(lx1 - 0.2, y, iz0 + 2.2, lx1, FORT.walk, iz0 + 2.4);
    const ay = FORT.walk;
    for (const [a, b, c, d] of [
      [ix0, iz0 + 2.32, lx1, iz0 + 2.4],
      [lx1 - 0.08, iz0 + w, lx1, iz0 + 2.4],
    ]) {
      wb.box('wooddark', a, ay + 0.95, b, c, ay + 1.02, d, { ao: false, faces: 'tnsewb', room });
      const alongX = c - a > d - b;
      for (let u = alongX ? a + 0.3 : b + 0.2; u < (alongX ? c : d) - 0.1; u += 0.45) {
        if (alongX) wb.box('wooddark', u - 0.03, ay, b, u + 0.03, ay + 0.95, d, { ao: false, room });
        else wb.box('wooddark', a, ay, u - 0.03, c, ay + 0.95, u + 0.03, { ao: false, room });
      }
      ctx.col.add(a, ay, b, c, ay + 1.3, d);
    }
  }
  L.zones.push(
    { id: 'tesoro', rects: [[ix0, iz0, ix1, iz1, -1, pisos[1] - 0.3]], atmo: 'interior', room: rooms[0] },
    { id: 'oratorio_rey', rects: [[T.x0, iz0, ix1, iz1, pisos[1] - 0.3, yC - 0.3]], atmo: 'interior', room: rooms[1] },
    { id: 'coracha_torre', rects: [[ix0, iz0, ix1 + T.t, iz1, yC - 0.3, techo]], atmo: 'chapel', room: rooms[2] }
  );
  L.map.push({ id: 'coracha_torre', r: [T.x0, T.z0, T.x1, T.z1] });
}

// ------------------------------------------------------------------------ el pasadizo
// El adarve de la muralla del norte, de la torre de la coracha a la del
// homenaje, cubierto: los pies derechos a los dos lados, las carreras, el
// tejadillo a un agua y la pantalla de tablas sobre el antepecho del patio,
// que tapaba al Rey cuando iba a su torre. Lo quemaron con él al otro lado:
// todo negro, el tejadillo hundido en medio (los cabios caídos sobre las
// losas), la pantalla a medias, la ceniza; y al fondo, la puerta de la torre,
// chamuscada y entera, atrancada por dentro.
function pasadizo(ctx, L) {
  const wb = ctx.wb;
  const K = FORT.rey;
  const room = 'pasadizo_rey';
  const x0 = FORT.torre.x1,
    x1 = FORT.torres.NE.x0;
  const zA = FORT.z0 + 0.48,
    zB = FORT.z0 + FORT.t - 0.45;
  const y = FORT.walk;
  const negro = [0.3, 0.26, 0.24],
    tiznado = [0.42, 0.36, 0.32];
  const yN = y + 3.0,
    yS = y + 2.6;
  // los pies derechos y las carreras
  const xs = [x0 + 0.3, x0 + 2.4, x0 + 4.5, x0 + 6.6, x1 - 0.3];
  for (const [z, top] of [
    [zA + 0.1, yN],
    [zB - 0.1, yS],
  ]) {
    for (const x of xs) {
      wb.box('timber', x - 0.1, y, z - 0.1, x + 0.1, top, z + 0.1, { ao: false, faces: 'nsewt', room, tint: negro });
      ctx.col.add(x - 0.1, y, z - 0.1, x + 0.1, top, z + 0.1);
    }
    wb.box('timber', x0, top, z - 0.12, x1, top + 0.22, z + 0.12, { ao: false, faces: 'nsewtb', room, tint: negro });
  }
  // el tejadillo: los cabios y la teja, en los tramos de los cabos; en los de
  // en medio, sólo cabios sueltos (el fuego se llevó lo demás)
  const zo = zB + 0.6;
  const yAtZ = (z) => yN + 0.22 + ((yS - yN) * (z - (zA + 0.1))) / (zB - 0.1 - (zA + 0.1));
  for (let i = 0; i + 1 < xs.length; i++) {
    const a = xs[i],
      b = xs[i + 1];
    const entero = i === 0 || i === xs.length - 2;
    for (let x = a + 0.3; x < b - 0.2; x += 0.6) {
      if (!entero && ((x * 7) | 0) % 3 !== 0) continue;
      beam(ctx, 'timber', V(x, yAtZ(zA - 0.2), zA - 0.2), V(x, yAtZ(zo), zo), 0.09, { d: 0.12, side: V(1, 0, 0), room, tint: negro });
    }
    if (entero) {
      const q = [V(a, yAtZ(zA - 0.25) + 0.1, zA - 0.25), V(b, yAtZ(zA - 0.25) + 0.1, zA - 0.25), V(b, yAtZ(zo) + 0.1, zo), V(a, yAtZ(zo) + 0.1, zo)];
      cara(wb, 'roof', q[0], q[1], q[2], q[3], V(0, 1, 0.2), { ao: false, sub: 2, tint: [0.62, 0.52, 0.48] });
      cara(wb, 'wooddark', q[0], q[1], q[2], q[3], V(0, -1, -0.2), { ao: false, sub: 2, room, tint: tiznado });
      ctx.col.addCam(a, yAtZ(zo), zA - 0.25, b, yAtZ(zA) + 0.2, zo);
    }
  }
  // los cabios caídos y las tablas quemadas sobre las losas; la ceniza
  for (const [xa, za, xb, zb2] of [
    [x0 + 3.0, zA + 0.15, x0 + 3.9, zB - 0.2],
    [x0 + 5.1, zB - 0.1, x0 + 4.2, zA + 0.3],
  ])
    beam(ctx, 'timber', V(xa, y + 1.6, za), V(xb, y + 0.08, zb2), 0.1, { d: 0.13, room, tint: negro });
  for (let k = 0; k < 7; k++) wb.at(x0 + 2.6 + k * 0.55, y + 0.02, (zA + zB) / 2 + Math.sin(k * 2.3) * 0.4, k * 0.7, () => wb.box('planks', -0.45, 0, -0.1, 0.45, 0.04, 0.1, { ao: false, room, tint: negro }));
  wb.box('dirt', x0 + 2.2, y + 0.005, zA + 0.05, x0 + 6.8, y + 0.012, zB - 0.05, { faces: 't', ao: false, room, tint: [0.32, 0.3, 0.3] });
  // la pantalla de tablas sobre el antepecho del patio, a medio quemar
  for (let x = x0 + 0.1; x < x1 - 0.1; x += 0.24) {
    const burned = x > x0 + 2.2 && x < x0 + 6.8;
    const top = burned ? y + 0.95 + (Math.sin(x * 9.1) * 0.5 + 0.5) * 0.9 : yS;
    if (top - (y + 0.95) < 0.1) continue;
    wb.box('planks', x - 0.11, y + 0.95, zB - 0.02, x + 0.11, top, zB + 0.03, { ao: false, faces: 'nsewt', room, tint: burned ? negro : tiznado });
  }
  // la puerta de la torre del homenaje: el arco y sus hojas, chamuscadas,
  // con la tranca por dentro (de la torre: fortaleza_torre.js, que la echa
  // abajo al empujarla); aquí, su recerco de sillería oscura, tiznado
  {
    const zc = K.pasadizo,
      w = 1.2,
      h = 2.4,
      xf = x0,
      r = 0.26;
    const tz = PIEDRA.torre.map((v) => v * 0.9);
    for (const s of [-1, 1]) wb.box('ashlar', xf, y, zc + s * (w / 2 + r) - (s > 0 ? 0 : 0.22), xf + 0.1, y + h, zc + s * (w / 2 + r) + (s > 0 ? 0.22 : 0), { ao: false, faces: 'enstb', room, tint: tz });
    archRing(ctx, { axis: 'z', c: zc, w: w + 2 * r, y0: y + h, rise: w / 2 + r, ring: 0.22, t0: xf - 0.01, t1: xf + 0.1, mat: 'ashlar', tint: tz, proud: 0, cam: false, n: 9, rooms: [room, room] });
    wb.box('black', xf + 0.11, y + 0.004, zc - w / 2 - 0.5, xf + 1.4, y + 0.008, zc + w / 2 + 0.5, { ao: false, grime: false, faces: 't', room, tint: [0.5, 0.5, 0.5] });
  }
  // la luz: la luna, que entra por el tejadillo hundido, y la de la puerta de
  // la torre de la coracha
  ctx.lights.push({ x: (x0 + x1) / 2, y: y + 2.6, z: (zA + zB) / 2, r: 0.5, g: 0.58, b: 0.78, radius: 7, intensity: 0.7, room });
  ctx.lights.push({ x: x1 - 0.8, y: y + 1.8, z: K.pasadizo, r: 1, g: 0.52, b: 0.24, radius: 4, intensity: 0.5, room });
  ctx.crows.push({ x: (x0 + x1) / 2, y: y + 3.2, z: zA - 1.0, r: 2.5, n: 2 });
  L.zones.push({ id: 'pasadizo_rey', rects: [[x0, FORT.z0, x1, FORT.z0 + FORT.t, y - 0.3, y + 4]], atmo: 'castillo', room });
  L.map.push({ id: 'pasadizo_rey', r: [x0, FORT.z0, x1, FORT.z0 + FORT.t] });
}
