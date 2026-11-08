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
import { PIEDRA, ajimez, muroVanos, forjado, caracol, dentro, cara1, saeteraDentro, armadura, caraTejado, cara, tapiz, escaleraTablas, atril, farol } from './fortaleza_atrezo.js';
import { tejadoCamaras } from './fortaleza_reina.js';
import { estera, lecho } from './mobiliario.js';

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
  // (fase 9) la antecámara del Rey: donde esperaban los que pedían audiencia.
  // El atril del portero de cámara con el libro de las audiencias, abierto;
  // el repostero del Rey en el muro del norte; el brasero que no se dejaba
  // apagar; la estera del paso, de la puerta del patio a la escalera
  {
    const lx = x1 - 1.0,
      lz = z1 - 3.3;
    atril(ctx, lx, 0, lz, -Math.PI / 2, room);
    // el libro abierto sobre el atril (sus dos hojas y el lomo), y la pluma
    wb.at(lx, 0, lz, -Math.PI / 2, () => {
      wb.push();
      wb.translate(0, 1.06, 0);
      wb.rotateX(0.3);
      for (const sx of [-1, 1]) {
        wb.push();
        wb.rotateZ(sx * -0.08);
        wb.box('linen', sx > 0 ? 0.01 : -0.25, 0.026, -0.17, sx > 0 ? 0.25 : -0.01, 0.042, 0.17, { ao: false, room, faces: 'tnsew', tint: [0.94, 0.88, 0.74] });
        for (let k = 0; k < 6; k++) wb.box('black', sx > 0 ? 0.04 : -0.22, 0.0425, -0.13 + k * 0.045, sx > 0 ? 0.04 + 0.08 + (k % 3) * 0.03 : -0.22 + 0.1 + (k % 2) * 0.04, 0.0435, -0.125 + k * 0.045, { ao: false, room, faces: 't', grime: false, tint: [0.3, 0.26, 0.24] });
        wb.pop();
      }
      wb.box('leather', -0.012, 0.02, -0.18, 0.012, 0.03, 0.18, { ao: false, room, tint: [0.44, 0.28, 0.2] });
      wb.box('feathers', 0.12, 0.045, 0.02, 0.15, 0.05, 0.24, { ao: false, room, tint: [0.9, 0.88, 0.84] });
      wb.pop();
    });
    L.interact.push({ kind: 'examine', id: 'x_audiencias', text: 'libroAudiencias', x: lx - 0.7, y: 0, z: lz, r: 1.3 });
    // el repostero del Rey: el paño azul con su orla de oro y, en medio, sus
    // armas (la cruz azul sobre el campo blanco), con las bezantes de plata
    {
      const rx = (x0 + x1) / 2 - 0.4,
        rz = z0 + 0.02;
      tapiz(ctx, rx, 3.75, rz, 0, 2.6, 2.4, { room, mat: 'clothBlue', tint: [0.5, 0.54, 0.7], plano: true, liso: true });
      // (cada capa, a 1 cm de la de debajo: el campo sobre el paño, la cruz y
      // las bezantes sobre el campo)
      const zf = rz + 0.056;
      wb.box('clothWhite', rx - 0.62, 1.78, zf, rx + 0.62, 3.3, zf + 0.004, { ao: false, faces: 's', room, tint: [0.88, 0.86, 0.8] });
      wb.box('clothBlue', rx - 0.09, 1.86, zf + 0.004, rx + 0.09, 3.22, zf + 0.014, { ao: false, faces: 's', room });
      for (const [a, b] of [
        [-0.54, -0.09],
        [0.09, 0.54],
      ])
        wb.box('clothBlue', rx + a, 2.66, zf + 0.004, rx + b, 2.84, zf + 0.014, { ao: false, faces: 's', room });
      for (const [bx, by] of [
        [-0.32, 3.02],
        [0.32, 3.02],
        [-0.32, 2.12],
        [0.32, 2.12],
      ])
      {
        // (las bezantes: discos de plata de cara a la sala)
        wb.push();
        wb.translate(rx + bx, by, zf + 0.004);
        wb.rotateX(Math.PI / 2);
        wb.cylinder('silver', 0, 0, 0, 0.06, 0.06, 0.01, 10, { ao: false, room, capTop: true });
        wb.pop();
      }
    }
    P.brazier(ctx, (x0 + x1) / 2 - 1.6, 0, (z0 + z1) / 2 - 1.2, { room });
    estera(ctx, K.puerta, 0, z1 - 2.3, 0, 1.4, 3.6, { room });
  }
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
  // el del sur, con la puerta de la tribuna de la capilla (a +4,5) y, a +12,
  // la del adarve de levante (por fuera, sobre el tejado de la capilla: lo de
  // fuera de la torre, también aquí)
  const xtr = FORT.capilla.x0 + 1.5;
  const AE = FORT.adarveE;
  W(S, xtr - 0.6, T.z1 - T.t - 0.3, xtr + 0.6, T.z1 + 0.3);
  muroVanos(
    ctx,
    'x',
    T.x0,
    T.x1,
    T.z1 - T.t,
    T.z1,
    0,
    T.h,
    [
      { c: xtr, w: 1.2, y: pisos[1], h: 2.6, rise: 0.6, ring: 0.24, room: rooms[1] },
      { c: AE.puerta, w: AE.w, y: FORT.walk, h: 2.2, rise: AE.w / 2, ring: 0.2, room: rooms[2] },
    ],
    bands,
    [
      { room: 'capilla', y0: 0, y1: 9.0, tint: [0.8, 0.77, 0.72] },
      { room: null, y0: 9.0, y1: T.h, tint: PIEDRA.lienzo.map((v) => v * 0.97) },
    ],
    { tint: piedra }
  );
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
    tesoroDelRey(ctx, L, { ix0, ix1, iz0, iz1, ax, az, room });
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
    // (el reclinatorio, de espaldas al altar y de cara a levante, a la Sé:
    // así rezaba el Rey la oración que le dio el arzobispo, que está en él)
    const kx = ax + 1.6,
      kz = az;
    L.interact.push({ kind: 'note', id: 'n_oracion_rey', note: 'oracionRey', x: kx + 0.39, y: y + 1.065, z: kz, model: 'paper' });
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
    P.hay(ctx, ix1 - 4.2, y, iz1 - 2.2, Math.PI / 2);
    wb.setRoom(null);
    llegadaCoracha(ctx, L, { ix0, ix1, iz0, iz1, y, room, axx, azz });
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
  adarveLevante(ctx, S, L, { ix0, ix1, iz0, iz1, room: rooms[2], C });
  L.zones.push(
    { id: 'tesoro', rects: [[ix0, iz0, ix1, iz1, -1, pisos[1] - 0.3]], atmo: 'interior', room: rooms[0] },
    { id: 'oratorio_rey', rects: [[T.x0, iz0, ix1, iz1, pisos[1] - 0.3, yC - 0.3]], atmo: 'interior', room: rooms[1] },
    { id: 'coracha_torre', rects: [[ix0, iz0, ix1 + T.t, iz1, yC - 0.3, techo]], atmo: 'chapel', room: rooms[2] }
  );
  L.map.push({ id: 'coracha_torre', r: [T.x0, T.z0, T.x1, T.z1] });
}

// ------------------------------------------------------------------------ el adarve de levante
// De lo alto de la torre de la coracha al adarve de la crujía de levante
// (PLAN_FORTALEZA.md, §5.12): una escalera de tablas por el muro del sur, de
// la planta del altar a un sobrado sobre la caja del caracol, a +12; en el
// muro, la puerta, y fuera, el puente de tablas sobre el rincón del tejado de
// la capilla, con su barandilla, que da al adarve. El adarve corre entre las
// almenas y el antepecho hasta la terraza de la cancillería (desde ella se ve
// el patio de honor entero, y la torre); en la terraza, los peldaños a la
// puerta del Tombo (fortaleza_alas.js).
function adarveLevante(ctx, S, L, o) {
  const wb = ctx.wb;
  const T = FORT.torres.NE,
    AE = FORT.adarveE;
  const { ix0, ix1, iz1, room, C } = o;
  const y0 = FORT.coracha.y,
    y = FORT.walk;
  // la escalera, por el muro del sur, de poniente a levante
  const n = 10,
    run = 0.42,
    w = 1.2;
  const xs = ix0 + 0.6; // (su pie)
  const xl = xs + n * run; // (donde llega: el sobrado)
  escaleraTablas(ctx, xs, y0, iz1 - w / 2 - 0.06, 'e', w, n, (y - y0) / n, run, { room, side: -1, desde: 3 });
  // el sobrado, de la escalera al muro de levante, sobre la caja del caracol
  const sz0 = C.hueco[1];
  forjado(ctx, xl + 0.03, sz0, ix1, iz1, y, [], room, room, { tint: [0.6, 0.52, 0.44] });
  wb.box('timber', xl, y0, sz0, xl + 0.2, y - 0.3, sz0 + 0.2, { aoH: 0.8, faces: 'nsew', room });
  ctx.col.add(xl, y0, sz0, xl + 0.2, y, sz0 + 0.2);
  // (su barandilla, por el norte y por poniente, menos donde llega la
  // escalera)
  for (const [a, b, c, d] of [
    [xl, sz0, ix1, sz0 + 0.08],
    [xl, sz0, xl + 0.08, iz1 - w - 0.12],
  ]) {
    wb.box('wooddark', a, y + 0.95, b, c, y + 1.02, d, { ao: false, faces: 'tnsewb', room });
    const alongX = c - a > d - b;
    for (let u = alongX ? a + 0.3 : b + 0.2; u < (alongX ? c : d) - 0.1; u += 0.45) {
      if (alongX) wb.box('wooddark', u - 0.03, y, b, u + 0.03, y + 0.95, d, { ao: false, room });
      else wb.box('wooddark', a, y, u - 0.03, c, y + 0.95, u + 0.03, { ao: false, room });
    }
    ctx.col.add(a, y, b, c, y + 1.3, d);
  }
  W(S, AE.puerta - AE.w / 2, T.z1 - T.t - 0.3, AE.puerta + AE.w / 2, T.z1 + 0.3);
  // fuera: el puente de tablas, del umbral al adarve, sobre sus vigas, con su
  // barandilla del lado del tejado y del sur
  const px0 = AE.puerta - AE.w / 2 - 0.3,
    px1 = FORT.x1 - FORT.t + 0.5,
    pz0 = T.z1,
    pz1 = AE.z0;
  const yp = y + 0.04;
  // (las tablas, con su junta, sobre el entablado de abajo: entre ellas no
  // se ve el tejado)
  wb.box('wooddark', px0, yp - 0.09, pz0, px1, yp - 0.05, pz1, { ao: false, faces: 'tb', tint: [0.36, 0.32, 0.28] });
  for (let x = px0 + 0.1; x < px1 - 0.05; x += 0.26) wb.box('planks', x, yp - 0.05, pz0, Math.min(px1, x + 0.24), yp, pz1, { ao: false, faces: 'tnsew', tint: [0.6, 0.52, 0.44] });
  for (const x of [px0 + 0.2, px1 - 0.7]) wb.box('wooddark', x - 0.09, yp - 0.3, pz0, x + 0.09, yp - 0.05, pz1 + 0.15, { ao: false, faces: 'nsewb', tint: [0.46, 0.4, 0.34] });
  ctx.col.add(px0, yp - 0.3, pz0, px1, yp, pz1).cam = true;
  for (const [a, b, c, d] of [
    [px0, pz0, px0 + 0.08, pz1],
    [px0, pz1 - 0.08, FORT.x1 - FORT.t, pz1],
  ]) {
    wb.box('wooddark', a, yp + 0.95, b, c, yp + 1.02, d, { ao: false, faces: 'tnsewb' });
    const alongX = c - a > d - b;
    for (let u = alongX ? a + 0.04 : b + 0.3; u < (alongX ? c : d) - 0.02; u += 0.42) {
      if (alongX) wb.box('wooddark', u - 0.03, yp, b, u + 0.03, yp + 0.95, d, { ao: false });
      else wb.box('wooddark', a, yp, u - 0.03, c, yp + 0.95, u + 0.03, { ao: false });
    }
    ctx.col.add(a, yp, b, c, yp + 1.3, d);
  }
  // por el adarve: las piedras para tirar, contra las almenas, y un caído
  const ax = (FORT.x1 - FORT.t + FORT.x1 - 0.6) / 2;
  for (let k = 0; k < 4; k++) wb.geometry('wallstone', new THREE.SphereGeometry(1, 6, 5), new THREE.Matrix4().compose(V(FORT.x1 - 0.85, y + 0.2, -69.4 + k * 0.42), new THREE.Quaternion(), V(0.2, 0.18, 0.2)), { ao: false });
  bakeCorpse(wb, ax, y, -64.6, Math.PI, 'face', 'soldier', 6540);
  P.decal(ctx, ax, y + 0.01, -64.6, 1.6);
  // su lanza, la de la guardia del adarve (con su lazo rojo): apoyada contra
  // la almena de al lado (la de z -66,45 a -65,55), con el regatón en las
  // losas a un palmo del parapeto y la moharra asomando por encima de la
  // almena; se ve desde que se sale del puente de tablas
  {
    const lean = (8 * Math.PI) / 180;
    const D = V(Math.sin(lean), Math.cos(lean), 0); // (del puño a la punta)
    const X = V(0, 0, 1); // (las caras de la moharra, de cara al adarve)
    const Yl = D.clone().cross(X);
    // (el regatón, en la losa: el eje del asta va a y = -0,05 del puño y su
    // punta, a 0,93 por detrás)
    const B = V(FORT.x1 - 0.48 - 0.31, y + 0.005, -66.0);
    const H = B.clone().addScaledVector(Yl, 0.05).addScaledVector(D, 0.93);
    const quat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Yl, D)).toArray();
    L.interact.push({ kind: 'item', id: 'i_lanza', item: 'lanza', x: H.x, y: H.y, z: H.z, raw: true, quat, r: 1.8 });
  }
  L.zones.unshift(
    { id: 'adarve_levante', rects: [[px0, pz0, FORT.x1, FORT.cancilleria.z0 - 1.2, y - 0.5, y + 4]], atmo: 'castillo' },
    { id: 'terraza_cancilleria', rects: [[FORT.patio.x1, FORT.cancilleria.z0 - 1.2, FORT.x1, FORT.torres.SE.z0, y - 0.5, y + 4]], atmo: 'castillo' }
  );
  L.map.push({ id: 'adarve_levante', r: [FORT.x1 - FORT.t, T.z1, FORT.x1, FORT.cancilleria.z0 - 1.2] }, { id: 'terraza_cancilleria', r: [FORT.patio.x1, FORT.cancilleria.z0 - 1.2, FORT.x1 - FORT.t, FORT.torres.SE.z0] });
  L.enemies.push({ type: 'soldier', x: ax, y, z: -72.0, yaw: Math.PI, idle: 'stand', id: 'e_adarve_e1' });
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


// ------------------------------------------------------------------------ lo del Rey, en el tesoro
// (fase 9) Lo que dice el camarero que guarda («la plata, el sello de la
// cámara, la corona de diario, su espada de la frontera») y no estaba: la
// espada, colgada en su vaina de dos garfios en el muro de levante; en la
// mesilla, junto al arca donde murió sentado, la corona de diario sobre su
// cojín y el sello con sus barras de lacre; a sus pies, el jarro vacío,
// volcado («Tengo sed»). Las piezas de seda enrolladas en su caballete, la
// vajilla de plata apilada sobre las arcas y el cofrecillo de las monedas,
// volcado: de ahí las del suelo.
function tesoroDelRey(ctx, L, { ix0, ix1, iz0, iz1, ax, az, room }) {
  const wb = ctx.wb;
  wb.setRoom(room);
  // la espada de la frontera, en su vaina, de dos garfios
  {
    const ex = ix1 - 0.04,
      ez = iz0 + 3.6,
      ey = 1.62;
    for (const dz of [-0.34, 0.3]) {
      wb.box('iron', ex - 0.12, ey - 0.07, ez + dz - 0.012, ex, ey - 0.05, ez + dz + 0.012, { ao: false, room });
      wb.box('iron', ex - 0.12, ey - 0.07, ez + dz - 0.012, ex - 0.1, ey + 0.02, ez + dz + 0.012, { ao: false, room });
    }
    // la vaina (cuero oscuro con la contera de azófar y su abrazadera) y la
    // espada: el arriaz, el puño forrado y el pomo de disco
    wb.box('leather', ex - 0.1, ey - 0.03, ez - 0.62, ex - 0.06, ey + 0.03, ez + 0.32, { ao: false, room, faces: 'tnsewb', tint: [0.42, 0.28, 0.2] });
    wb.box('bronze', ex - 0.105, ey - 0.035, ez + 0.32, ex - 0.055, ey + 0.035, ez + 0.4, { ao: false, room });
    wb.box('bronze', ex - 0.105, ey - 0.035, ez - 0.55, ex - 0.055, ey + 0.035, ez - 0.51, { ao: false, room });
    wb.box('iron', ex - 0.1, ey - 0.012, ez - 0.66, ex - 0.06, ey + 0.012, ez - 0.62, { ao: false, room, tint: [0.7, 0.7, 0.74] });
    wb.box('iron', ex - 0.105, ey - 0.13, ez - 0.68, ex - 0.055, ey + 0.13, ez - 0.66, { ao: false, room, faces: 'tnsewb', tint: [0.65, 0.65, 0.7] });
    wb.box('leather', ex - 0.095, ey - 0.022, ez - 0.86, ex - 0.065, ey + 0.022, ez - 0.68, { ao: false, room, tint: [0.36, 0.24, 0.18] });
    wb.cylinder('iron', ex - 0.08, ey - 0.055, ez - 0.885, 0.05, 0.05, 0.03, 10, { ao: false, room, capTop: true, capBot: true, tint: [0.7, 0.68, 0.62] });
    // el cinto, enrollado y colgado del garfio de arriba
    wb.box('leather', ex - 0.11, ey - 0.38, ez + 0.27, ex - 0.07, ey - 0.06, ez + 0.33, { ao: false, room, tint: [0.5, 0.34, 0.24] });
    L.interact.push({ kind: 'examine', id: 'x_espada_frontera', text: 'espadaFrontera', x: ex - 0.6, y: 0, z: ez - 0.2, r: 1.4 });
  }
  // la mesilla junto al arca: la corona de diario en su cojín, el sello de
  // la cámara y las barras de lacre; la vela consumida
  {
    const mx = ax + 1.75,
      mz = az + 0.05;
    P.table(ctx, mx, 0, mz, 0.9, 0.62, 0, {});
    const y = 0.8;
    wb.box('clothRed', mx - 0.17, y, mz - 0.14, mx + 0.17, y + 0.07, mz + 0.14, { ao: false, room, faces: 'tnsewb', tint: [0.7, 0.24, 0.24] });
    for (const [sx, sz] of [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ])
      wb.box('gold', mx + sx * 0.17 - 0.012, y + 0.05, mz + sz * 0.14 - 0.012, mx + sx * 0.17 + 0.012, y + 0.09, mz + sz * 0.14 + 0.012, { ao: false, room });
    // la corona: un aro de oro con ocho florones y sus piedras
    wb.ring('gold', mx, y + 0.07, mz, 0.1, 0.088, 0.045, 16, { room });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const fx = mx + Math.cos(a) * 0.094,
        fz = mz + Math.sin(a) * 0.094;
      wb.box('gold', fx - 0.012, y + 0.115, fz - 0.012, fx + 0.012, y + 0.15, fz + 0.012, { ao: false, room });
      wb.box(k % 2 ? 'clothBlue' : 'clothRed', fx - 0.008, y + 0.085, fz - 0.008, fx + 0.008, y + 0.1, fz + 0.008, { ao: false, room, grime: false, tint: [1.4, 1.2, 1.2] });
    }
    // el sello: la matriz de azófar con su asa, y el lacre
    wb.cylinder('bronze', mx + 0.3, y, mz + 0.12, 0.045, 0.045, 0.018, 12, { ao: false, room, capTop: true });
    wb.cylinder('bronze', mx + 0.3, y + 0.018, mz + 0.12, 0.016, 0.01, 0.06, 6, { ao: false, room, capTop: true });
    for (let k = 0; k < 3; k++) wb.box('clothRed', mx + 0.18 + k * 0.035, y, mz - 0.2, mx + 0.2 + k * 0.035, y + 0.02, mz - 0.07, { ao: false, room, tint: [0.62, 0.16, 0.14] });
    wb.cylinder('candle', mx - 0.3, y, mz - 0.15, 0.05, 0.045, 0.02, 10, { ao: false, room, capTop: true, tint: [0.92, 0.88, 0.76] });
    L.interact.push({ kind: 'examine', id: 'x_corona_diario', text: 'coronaDiario', x: mx, y: 0, z: mz - 0.6, r: 1.2 });
  }
  // a sus pies, el jarro volcado y vacío, y el vaso seco
  {
    const jx = ax - 0.55,
      jz = az - 0.95;
    wb.push();
    wb.translate(jx, 0.13, jz);
    wb.rotateZ(Math.PI / 2 - 0.1);
    wb.translate(0, -0.13, 0);
    P.jar(ctx, 0, 0, 0, 0.62, { room });
    wb.pop();
    wb.cylinder('wooddark', jx + 0.5, 0, jz - 0.2, 0.04, 0.046, 0.1, 8, { ao: false, room, capBot: true, tint: [0.6, 0.5, 0.4] });
  }
  // las piezas de seda y de brocado, enrolladas en su caballete, en el
  // rincón del nordeste (no ante la salida del caracol, que está al sur)
  {
    const bx = ix1 - 0.58,
      bz = iz0 + 1.05;
    for (const dz of [-0.75, 0.75]) {
      wb.box('wooddark', bx - 0.45, 0, bz + dz - 0.05, bx - 0.37, 0.7, bz + dz + 0.05, { ao: false, room });
      wb.box('wooddark', bx + 0.37, 0, bz + dz - 0.05, bx + 0.45, 0.7, bz + dz + 0.05, { ao: false, room });
      wb.box('wooddark', bx - 0.45, 0.62, bz + dz - 0.05, bx + 0.45, 0.7, bz + dz + 0.05, { ao: false, room });
    }
    const telas = [
      ['clothPurple', [0.9, 0.8, 0.95]],
      ['clothRed', [0.95, 0.75, 0.6]],
      ['clothBlue', [0.9, 0.9, 1.0]],
      ['linen', [1.0, 0.9, 0.55]],
      ['clothRed', [0.6, 0.3, 0.4]],
    ];
    telas.forEach(([m, tint], k) => {
      const px = bx - 0.3 + (k % 3) * 0.3,
        py = 0.7 + Math.floor(k / 3) * 0.24 + 0.12;
      wb.push();
      wb.translate(px, py, bz);
      wb.rotateX(Math.PI / 2);
      wb.cylinder(m, 0, -0.95, 0, 0.12, 0.12, 1.9, 10, { ao: false, room, capTop: true, capBot: true, tint });
      wb.pop();
    });
    ctx.col.add(bx - 0.5, 0, bz - 0.95, bx + 0.5, 1.2, bz + 0.95);
  }
  // la vajilla de plata, apilada sobre las arcas: las fuentes, los platos y
  // un aguamanil
  for (const [z, n] of [
    [iz0 + 1.2, 5],
    [iz0 + 4.6, 3],
  ]) {
    for (let k = 0; k < n; k++) wb.cylinder('silver', ix1 - 4.15, 0.75 + k * 0.025, z + (k % 2) * 0.02, 0.2 - k * 0.012, 0.22 - k * 0.012, 0.022, 14, { ao: false, room, capTop: true, capBot: true });
  }
  wb.cylinder('silver', ix1 - 4.15, 0.75, iz0 + 3.0, 0.08, 0.06, 0.26, 10, { ao: false, room, capTop: true, capBot: true });
  wb.cylinder('silver', ix1 - 4.15, 1.01, iz0 + 3.0, 0.03, 0.07, 0.1, 10, { ao: false, room, capTop: true });
  // el cofrecillo de las monedas, volcado
  {
    const cx = ix0 + 4.1,
      cz = iz0 + 3.6;
    wb.at(cx, 0, cz, 0.7, () => {
      wb.push();
      wb.translate(0, 0.17, 0);
      wb.rotateX(Math.PI / 2 - 0.18);
      wb.box('wooddark', -0.22, -0.17, -0.15, 0.22, 0.17, 0.15, { ao: false, room, tint: [0.62, 0.42, 0.3] });
      wb.box('iron', -0.23, -0.18, -0.02, 0.23, 0.18, 0.02, { ao: false, room });
      wb.pop();
      wb.box('wooddark', -0.22, 0, 0.32, 0.22, 0.04, 0.62, { ao: false, room, tint: [0.62, 0.42, 0.3] });
    });
    for (let k = 0; k < 26; k++) {
      const a = k * 2.399,
        r = 0.18 + Math.sqrt(k) * 0.13;
      wb.cylinder('gold', cx + Math.cos(a) * r, 0.02 + (k < 5 ? 0.012 * (5 - k) : 0), cz + 0.25 + Math.sin(a) * r * 0.7, 0.04, 0.04, 0.012, 7, { ao: false, room, capTop: true });
    }
  }
  wb.setRoom(null);
}

// ------------------------------------------------------------------------ la llegada
// (fase 9) Lo alto de la torre de la coracha, donde se llega: el puesto de
// los que velaban la coracha y el fanal. Bajo la escalera del adarve, contra
// el muro del sur, lo del fanal que se subía por la coracha (los haces de
// leña, las ollas de la pez con su cazo, la soga); bajo el rellano del
// pasadizo, el catre del centinela, deshecho, con su manta; junto a la puerta
// de la coracha, la mesilla con el cuerno de avisar, su farol, que sigue
// ardiendo, y el vaso; y ante el altar, la estera de los que rezaban.
// (El pie de las dos escaleras queda libre: la del adarve arranca en
// ix0 + 0,6, junto al muro del sur, y la del pasadizo en ix1 - 3,2, junto al
// del norte.)
function llegadaCoracha(ctx, L, { ix0, ix1, iz0, iz1, y, room, axx, azz }) {
  const wb = ctx.wb;
  wb.setRoom(room);
  // los haces de leña y las ollas de la pez del fanal, bajo la escalera del
  // adarve, donde ya va alta (de poniente a levante, hasta la caja del
  // caracol, que empieza en ix1 - 3,2)
  for (const [fx, n] of [
    [ix0 + 3.0, 4],
    [ix0 + 4.1, 3],
  ])
    P.firewood(ctx, fx, y, iz1 - 0.42, 0, n);
  for (let k = 0; k < 3; k++) {
    const ox = ix0 + 5.1 + k * 0.5,
      oz = iz1 - 0.42 - (k % 2) * 0.12;
    P.jar(ctx, ox, y, oz, 0.82 - k * 0.08, { room });
    wb.cylinder('black', ox, y + 0.5 - k * 0.05, oz, 0.13, 0.13, 0.006, 10, { ao: false, room, capTop: true, grime: false });
  }
  wb.box('wooddark', ix0 + 4.9, y + 0.03, iz1 - 1.05, ix0 + 5.7, y + 0.06, iz1 - 0.98, { ao: false, room });
  wb.cylinder('iron', ix0 + 5.8, y, iz1 - 1.0, 0.07, 0.08, 0.05, 8, { ao: false, room, capBot: true });
  // (la soga, enrollada al final, contra la caja del caracol)
  for (let k = 0; k < 4; k++) wb.cylinder('rope', ix0 + 6.45, y + 0.02 + k * 0.06, iz1 - 1.0, 0.3 - k * 0.04, 0.3 - k * 0.04, 0.06, 10, { ao: false, room });
  ctx.col.add(ix0 + 2.5, y, iz1 - 0.9, ix0 + 6.4, y + 0.9, iz1);
  ctx.col.add(ix0 + 6.1, y, iz1 - 1.35, ix0 + 6.8, y + 0.3, iz1 - 0.65);
  // el catre del centinela, bajo el rellano del pasadizo, contra el muro del
  // norte
  lecho(ctx, ix0 + 1.12, y, iz0 + 0.56, Math.PI / 2, { room, w: 0.86, manta: 'burlap', revuelta: true });
  // la mesilla de la puerta de la coracha: el cuerno, el farol y el vaso
  {
    const tx = ix1 - 0.4,
      tz = iz0 + 7.0;
    P.table(ctx, tx, y, tz, 1.1, 0.55, Math.PI / 2, {});
    const yt = y + 0.8;
    // el cuerno de avisar: cuatro tramos que se curvan, con su boquilla y su tahalí
    let px = tx - 0.05,
      pz = tz - 0.3,
      py = yt + 0.06,
      r = 0.022;
    for (let k = 0; k < 5; k++) {
      const nx = px + 0.02 + k * 0.012,
        nz = pz + 0.13,
        ny = py + (k > 2 ? 0.01 : 0);
      wb.push();
      const a = new THREE.Vector3(px, py, pz),
        b = new THREE.Vector3(nx, ny, nz);
      const d = b.clone().sub(a);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
      wb.geometry('bone', new THREE.CylinderGeometry(r + 0.012, r, d.length(), 8), new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)), { ao: false, room, tint: [0.92, 0.84, 0.66] });
      wb.pop();
      px = nx;
      pz = nz;
      py = ny;
      r += 0.012;
    }
    wb.box('leather', tx - 0.12, yt, tz - 0.3, tx - 0.1, yt + 0.01, tz + 0.36, { ao: false, room, tint: [0.5, 0.34, 0.24] });
    farol(ctx, tx + 0.02, yt, tz - 0.4, room);
    wb.cylinder('wooddark', tx - 0.16, yt, tz + 0.45, 0.04, 0.046, 0.1, 8, { ao: false, room, capBot: true, tint: [0.6, 0.5, 0.4] });
  }
  // la estera ante el altar
  estera(ctx, axx + 1.5, y, azz, Math.PI / 2, 2.0, 1.3, { room });
  wb.setRoom(null);
}

