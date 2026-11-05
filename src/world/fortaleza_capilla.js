// La Capilla Real (PLAN_FORTALEZA.md, §5.6): en la crujía de levante, con el
// altar al norte, como la Sé, contra la torre de la coracha.
//
// El presbiterio, en alto, bajo su bóveda de cañón pintada de estrellas, con
// el fajón de sillería sobre sus ménsulas; encima, por fuera, el campanario,
// la torre de las campanas que se ve desde toda la fortaleza. El altar (el
// descanso de en medio de la fortaleza), el retablo, la confesión del
// capellán. La nave, enlucida y pintada de despiece fingido, con su zócalo de
// cortinaje, sus bancos y su armadura con tirantes. La tribuna del Rey corre
// a +4,5 por el muro del patio, de la puerta de su oratorio (en la torre de la
// coracha) a los pies, donde está su sitial; se sube también por la escalera
// de tablas del muro de levante.
//
// El cordón de la campana baja por la clave de la bóveda y está atado a una
// argolla en la cabecera de la tribuna: en el nudo, la llave del capellán. Al
// soltarla, el cordón se suelta, la campana suena por toda la ciudad y lo que
// la oye en la fortaleza se despierta.
import * as THREE from 'three';
import { solid, archRing, barrelVault, blocker, beam } from './builders.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';
import { FORT } from './fortaleza_medidas.js';
import { PIEDRA, tri, cara, vano, muroVanos, forjado, sitial, armadura, lineaTejado, zocalo, enlucido, cara1, esquina } from './fortaleza_atrezo.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);
const E = FORT.eave;
const CAL = [0.92, 0.88, 0.8];

// las medidas de la capilla: el fajón (su z), el arranque de la bóveda y su
// flecha, el suelo del presbiterio, la tribuna (su altura, el ancho de la del
// muro del patio, el fondo de la de los pies) y el campanario (su centro, su
// lado, su cuerpo de campanas y su remate)
export const CAP = {
  arco: -80,
  ys: 6.8,
  rise: 4.8,
  zp: -81.0,
  trib: { y: 4.5, x1: -72.4, z0: -64.6 },
  torre: { x: -70.2, z: -83.2, w: 4.0, y0: 11.3, yb: 17.6, yc: 20.4 },
  argolla: { y: 5.7, z: -84.6 },
};

export function buildCapilla(ctx, S, L) {
  nave(ctx, S, L);
  presbiterio(ctx, L);
  tribuna(ctx, L);
  campanario(ctx);
  cordon(ctx, L);
}

// ------------------------------------------------------------------------ la nave
function nave(ctx, S, L) {
  const wb = ctx.wb;
  const C = FORT.capilla;
  const room = 'capilla';
  const { x0, x1, z0, z1 } = C;
  const T = lineaTejado((FORT.patio.x1 + x1) / 2, (x1 - FORT.patio.x1) / 2, E, C.ridge);
  W(S, x0, z0, x1, z1);
  wb.box('flag', x0, -0.05, z0, x1, 0.02, z1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room, tint: [0.76, 0.73, 0.68] });
  // el muro de la cancillería, a los pies (su cara de dentro y la del
  // hastial, en el tejado)
  solid(ctx, 'wallstone', x0, 0, z1, x1, E, z1 + 1.2, { faces: '', collide: true });
  wb.box('wallstone', x0, 0, z1, x1, E, z1 + 0.01, { faces: 'n', room, tint: [0.8, 0.77, 0.72], sub: 2.2, aoH: 2.5 });
  wb.box('wallstone', x0, 0, z1 + 1.19, x1, FORT.F1, z1 + 1.2, { faces: 's', room: 'cancilleria', tint: [0.8, 0.77, 0.72], sub: 2.2, aoH: 2.5 });
  // la tira del muro del patio entre lo alto de su franja y la armadura
  wb.box('wallstone', x0 - 0.01, E, CAP.arco + 0.4, x0, T.yb(x0) + 0.03, z1, { faces: 'e', room, tint: [0.8, 0.77, 0.72], sub: 2.2, aoH: 2.5, baseY: 0 });
  // la armadura de la nave, con sus tirantes, del fajón a los pies; y la luz
  // de las coronas, que sube a ella
  armadura(ctx, { axis: 'z', s0: CAP.arco + 0.4, s1: z1, ui0: x0, ui1: x1, T, room, paso: 0.62, nudillo: 0.4, tirantes: [-76.2, -71.6, -67.0, -62.6], tint: [0.5, 0.4, 0.32] });
  for (const z of [-75, -66]) ctx.lights.push({ x: T.uc, y: 9.4, z, r: 1, g: 0.56, b: 0.3, radius: 7, intensity: 0.5, room });
  // el enlucido pintado de despiece fingido, y abajo el zócalo de cortinaje
  const vanosPatio = [-76, -71.2, -62.5].map((z) => [z - 0.5, 6.42, z + 0.5, 8.66]);
  // (con el hueco de la puerta del paseo de las cámaras, en la tribuna)
  const pt = FORT.claustro.paseo.tribuna;
  enlucido(ctx, 'despiece', 'e', x0, CAP.arco - 0.4, z1, 1.0, E, [[C.puerta - 1.5, 0, C.puerta + 1.5, 4.0], [pt - 0.9, CAP.trib.y - 0.1, pt + 0.9, 8.6], ...vanosPatio], room, { tint: CAL });
  enlucido(ctx, 'despiece', 'w', x1, CAP.arco - 0.4, z1, 1.0, T.yb(x1), [], room, { tint: CAL });
  enlucido(ctx, 'despiece', 'n', z1, x0, x1, 1.0, E, [], room, { tint: CAL });
  zocalo(ctx, 'e', x0, CAP.arco - 0.4, z1, 0.04, 0.96, room, [[C.puerta - 1.5, C.puerta + 1.5]]);
  zocalo(ctx, 'w', x1, CAP.arco - 0.4, z1, 0.04, 0.96, room);
  zocalo(ctx, 'n', z1, x0, x1, 0.04, 0.96, room);
  // las ventanas del patio, por dentro: la luna (y las velas del altar, por
  // fuera, en fortaleza_patio.js)
  for (const z of [-76, -71.2, -62.5]) vano(ctx, 'e', x0, z, 6.6, 0.55, 1.6, { room, boca: 'luna', radius: 5, intensity: 0.55 });
  // los bancos de la nave: dos filas con su paso en medio (y libre el de la
  // puerta del patio y el pie de la escalera de la tribuna)
  for (let z = -78.2; z < -65.5; z += 1.45) {
    if (Math.abs(z - C.puerta) > 1.5) P.pew(ctx, -70.5, 0, z, 2.4, Math.PI);
    if (z < -71.6) P.pew(ctx, -66.7, 0, z, 2.4, Math.PI);
  }
  // las coronas de velas, colgadas de la hilera
  for (const z of [-75, -68.4]) {
    P.candleCrown(ctx, -69.4, 6.4, z, T.yb(-69.4) - 0.4, { room, r: 0.9, n: 8 });
    ctx.lights.push({ x: -69.4, y: 6.0, z, r: 1, g: 0.6, b: 0.3, radius: 9, intensity: 1.0, room });
  }
  for (const z of [-77.6, -71.0]) P.wallTorch(ctx, x1 - 0.02, 2.6, z, 'w', { room });
  for (const z of [-77.6, -73.2, -63.6]) P.wallTorch(ctx, x0 + 0.02, 2.6, z, 'e', { room });
  L.enemies.push({ type: 'cortesanoSuelto', x: -70.2, y: 0, z: -78.0, yaw: Math.PI, idle: 'kneel', id: 'e_capilla1' });
}

// ------------------------------------------------------------------------ el presbiterio
// En alto, de la torre al fajón: el altar con su retablo y su cruz, las velas
// y los candelabros, la confesión del capellán en el reclinatorio; la bóveda
// de estrellas y, en su clave, el agujero del cordón.
function presbiterio(ctx, L) {
  const wb = ctx.wb;
  const C = FORT.capilla;
  const room = 'capilla';
  const { x0, x1, z0 } = C;
  const xc = (x0 + x1) / 2;
  const T = lineaTejado((FORT.patio.x1 + x1) / 2, (x1 - FORT.patio.x1) / 2, E, C.ridge);
  const zp = CAP.zp;
  // el suelo, en dos gradas
  solid(ctx, 'flag', x0, 0, z0, x1, 0.3, zp - 0.4, { faces: 'ts', ao: false, sub: 2, room, tint: [0.82, 0.79, 0.74] });
  solid(ctx, 'flag', x0, 0, zp - 0.4, x1, 0.15, zp, { faces: 'ts', ao: false, sub: 2, room, tint: [0.82, 0.79, 0.74] });
  // los muros, pintados, hasta la bóveda: el de la torre (la cara la pone el
  // muro de la torre, fortaleza_rey.js; aquí, la pintura, con el hueco de la
  // puerta del oratorio) y los de los lados
  const xo = FORT.capilla.x0 + 1.5;
  enlucido(ctx, 'despiece', 's', z0, x0, x1, 1.3, CAP.ys + CAP.rise, [[xo - 0.86, CAP.trib.y - 0.1, xo + 0.86, CAP.trib.y + 3.5]], room, { tint: CAL });
  enlucido(ctx, 'despiece', 'e', x0, z0, CAP.arco - 0.4, 1.3, CAP.ys, [], room, { tint: CAL });
  enlucido(ctx, 'despiece', 'w', x1, z0, CAP.arco - 0.4, 1.3, CAP.ys, [], room, { tint: CAL });
  zocalo(ctx, 's', z0, x0, x1, 0.32, 0.96, room, [[xc - 1.4, xc + 1.4]]);
  zocalo(ctx, 'e', x0, z0, zp - 0.4, 0.32, 0.96, room);
  zocalo(ctx, 'w', x1, z0, zp - 0.4, 0.32, 0.96, room);
  // la bóveda de cañón, pintada de estrellas, y el fajón sobre sus ménsulas;
  // por encima del fajón, hasta la armadura, su muro
  barrelVault(ctx, { x0, x1, z0, z1: CAP.arco - 0.4, ys: CAP.ys, rise: CAP.rise, axis: 'z', room, mat: 'starVault', tint: [0.9, 0.9, 0.95], impostMat: 'ashlar', impostTint: PIEDRA.silla, sub: 1.2 });
  const ring = 0.5;
  archRing(ctx, { axis: 'x', c: xc, w: x1 - x0 - 2 * ring, y0: CAP.ys, rise: CAP.rise - ring, ring, t0: CAP.arco - 0.4, t1: CAP.arco + 0.4, mat: 'ashlar', rooms: [room, room], tint: [0.74, 0.7, 0.64], cam: false });
  // (el muro de encima del fajón: de su trasdós a la armadura, por las dos
  // caras; el trasdós, la bóveda: circunferencia por los arranques y la clave)
  {
    const h = (x1 - x0) / 2,
      k = CAP.rise;
    const R = (h * h + k * k) / (2 * k),
      yc = CAP.ys + k - R;
    const ext = (u) => yc + Math.sqrt(Math.max(0, R * R - (u - xc) * (u - xc)));
    const N = 14;
    for (const [zz, dir] of [
      [CAP.arco - 0.4, -1],
      [CAP.arco + 0.4, 1],
    ])
      for (let i = 0; i < N; i++) {
        const ua = x0 + ((x1 - x0) * i) / N,
          ub = x0 + ((x1 - x0) * (i + 1)) / N;
        cara(wb, 'ashlar', V(ua, ext(ua), zz), V(ub, ext(ub), zz), V(ub, T.yb(ub) + 0.04, zz), V(ua, T.yb(ua) + 0.04, zz), V(0, 0, dir), { ao: false, room, tint: [0.8, 0.77, 0.72], sub: 2 });
      }
    ctx.col.addCam(x0, CAP.ys + 1.2, CAP.arco - 0.4, x1, T.yb(T.uc), CAP.arco + 0.4);
  }
  for (const [xa, s] of [
    [x0, 1],
    [x1, -1],
  ])
    for (let k = 0; k < 3; k++) {
      const d = 0.2 + k * 0.17;
      const a = xa,
        b = xa + s * d;
      wb.box('ashlar', Math.min(a, b), CAP.ys - 0.8 + k * 0.26, CAP.arco - 0.42, Math.max(a, b), CAP.ys - 0.54 + k * 0.26, CAP.arco + 0.42, { ao: false, faces: 'tbnsew', room, tint: PIEDRA.silla.map((v) => v * (0.9 + k * 0.04)) });
    }
  // el agujero del cordón en la clave
  wb.cylinder('black', CAP.torre.x, CAP.ys + CAP.rise - 0.04, CAP.torre.z, 0.12, 0.12, 0.02, 8, { ao: false, grime: false, room, capBot: true });
  // el altar, el retablo y la cruz; las velas y los candelabros
  wb.setRoom(room);
  P.altarTable(ctx, xc, 0.3, z0 + 1.0, 0, 2.6);
  wb.setRoom(null);
  wb.box('frescoRates', xc - 2.2, 1.6, z0 + 0.02, xc + 2.2, 5.6, z0 + 0.06, { faces: 's', ao: false, room, tint: [0.85, 0.8, 0.74] });
  wb.box('gold', xc - 2.35, 1.5, z0 + 0.02, xc + 2.35, 1.62, z0 + 0.14, { ao: false, room, tint: [0.7, 0.56, 0.3] });
  wb.box('gold', xc - 2.35, 5.6, z0 + 0.02, xc + 2.35, 5.75, z0 + 0.16, { ao: false, room, tint: [0.7, 0.56, 0.3] });
  for (const s of [-1, 1]) wb.box('gold', xc + s * 2.3 - 0.06, 1.5, z0 + 0.02, xc + s * 2.3 + 0.06, 5.75, z0 + 0.14, { ao: false, room, tint: [0.66, 0.52, 0.28] });
  wb.box('wooddark', xc - 0.08, 5.9, z0 + 0.04, xc + 0.08, 8.2, z0 + 0.2, { ao: false, room });
  wb.box('wooddark', xc - 0.75, 7.3, z0 + 0.04, xc + 0.75, 7.48, z0 + 0.2, { ao: false, room });
  P.candles(ctx, xc - 1.0, 1.32, z0 + 0.95, 5, 6601, { room, radius: 8, intensity: 1.2 });
  P.candles(ctx, xc + 1.0, 1.32, z0 + 0.95, 5, 6602, { room, radius: 8, intensity: 1.2 });
  P.candelabra(ctx, xc - 2.6, 0.3, z0 + 1.4, { room });
  P.candelabra(ctx, xc + 2.6, 0.3, z0 + 1.4, { room });
  ctx.lights.push({ x: xc, y: 4.2, z: z0 + 3.2, r: 1, g: 0.6, b: 0.32, radius: 9, intensity: 0.7, room });
  // el altar de la capilla: el descanso de en medio de la fortaleza
  L.interact.push({ kind: 'altar', id: 'a_capilla_real', name: 'Capilla Real', x: xc, y: 0.3, z: z0 + 1.0, spawn: [xc, 0.3, z0 + 3.2], yaw: 0 });
  // el reclinatorio del capellán, con su confesión
  {
    const rx = xc + 1.9,
      rz = zp + 0.9;
    wb.box('wooddark', rx - 0.4, 0, rz - 0.15, rx + 0.4, 0.22, rz + 0.25, { ao: false, room });
    wb.box('wooddark', rx - 0.4, 0, rz - 0.42, rx + 0.4, 1.0, rz - 0.3, { ao: false, room });
    wb.box('wooddark', rx - 0.45, 1.0, rz - 0.6, rx + 0.45, 1.06, rz - 0.18, { ao: false, faces: 'tnsewb', room });
    ctx.col.add(rx - 0.45, 0, rz - 0.6, rx + 0.45, 1.06, rz + 0.25);
    L.interact.push({ kind: 'note', id: 'n_capellan', note: 'capellan', x: rx, y: 1.08, z: rz - 0.4, model: 'paper' });
  }
}

// ------------------------------------------------------------------------ la tribuna
// A +4,5, sobre sus pies derechos: la del muro del patio, de la puerta del
// oratorio del Rey (en la cabecera, junto a la argolla del cordón) a los
// pies; la de los pies, de muro a muro, con el sitial del Rey para la misa.
// Su escalera, de tablas, contra el muro de levante.
function tribuna(ctx, L) {
  const wb = ctx.wb;
  const C = FORT.capilla;
  // (la tribuna está abierta a la nave: con su misma luz)
  const room = 'capilla',
    abajo = 'capilla';
  const { x0, x1, z0, z1 } = C;
  const xc = (x0 + x1) / 2;
  const { y, x1: tx1, z0: tz0 } = CAP.trib;
  // los suelos: el de la del patio y el de la de los pies
  forjado(ctx, x0, z0, tx1, tz0, y, [], room, abajo, { slab: 0.2, tint: [0.64, 0.56, 0.48] });
  forjado(ctx, x0, tz0, x1, z1, y, [], room, abajo, { slab: 0.2, tint: [0.64, 0.56, 0.48] });
  // las vigas de los cantos sobre sus pies derechos, con sus zapatas
  const pz = [-84.0, -79.9, -75.6, -71.5, tz0 - 0.13];
  const px = [tx1, xc, x1 - 2.2];
  wb.box('timber', tx1 - 0.26, y - 0.5, z0, tx1 + 0.03, y - 0.2, tz0, { ao: false, faces: 'nsewb', room: abajo });
  wb.box('timber', tx1 - 0.26, y - 0.5, tz0 - 0.26, x1, y - 0.2, tz0 + 0.03, { ao: false, faces: 'nsewb', room: abajo });
  const pie = (x, z) => {
    const yb = z < CAP.zp ? 0.3 : 0;
    wb.box('timber', x - 0.13, yb, z - 0.13, x + 0.13, y - 0.5, z + 0.13, { aoH: 0.8, faces: 'nsew', room: abajo });
    wb.box('wooddark', x - 0.5, y - 0.68, z - 0.16, x + 0.5, y - 0.5, z + 0.16, { ao: false, faces: 'nsewb', room: abajo });
    wb.box('wooddark', x - 0.16, y - 0.68, z - 0.5, x + 0.16, y - 0.5, z + 0.5, { ao: false, faces: 'nsewb', room: abajo });
    ctx.col.add(x - 0.14, yb, z - 0.14, x + 0.14, y, z + 0.14);
  };
  for (const z of pz) pie(tx1 - 0.13, z);
  for (const x of px.slice(1)) pie(x, tz0 - 0.13);
  // el antepecho: por el canto de la del patio y por el de la de los pies,
  // hasta la escalera; el paño rojo del Rey colgado de él, a los pies
  const sx = x1 - 1.5; // (la escalera llega de x1 - 1.5 a x1)
  const bar = (a, b, c, d) => {
    wb.box('wooddark', a, y + 0.95, b, c, y + 1.03, d, { ao: false, faces: 'tnsewb', room });
    const alongX = c - a > d - b;
    for (let u = alongX ? a + 0.25 : b + 0.25; u < (alongX ? c : d) - 0.1; u += 0.42) {
      if (alongX) wb.box('wooddark', u - 0.03, y, b, u + 0.03, y + 0.95, d, { ao: false, room });
      else wb.box('wooddark', a, y, u - 0.03, c, y + 0.95, u + 0.03, { ao: false, room });
    }
    ctx.col.add(a, y, b, c, y + 1.6, d);
  };
  bar(tx1 - 0.08, z0, tx1, tz0);
  bar(tx1 - 0.08, tz0 - 0.08, sx, tz0);
  wb.box('clothRed', tx1 + 1.0, y + 0.3, tz0 - 0.1, sx - 1.0, y + 0.98, tz0 - 0.09, { ao: false, faces: 'n', room });
  // la escalera de tablas, contra el muro de levante: sube hacia los pies
  const n = 15,
    run = 0.42;
  escalera(ctx, x1 - 0.75, tz0 - n * run, n, y / n, run, abajo);
  // en la de los pies, el sitial del Rey para la misa y sus velas
  sitial(ctx, xc - 1.0, y, z1 - 1.4, Math.PI, room);
  P.candles(ctx, x0 + 0.6, y, z1 - 0.6, 3, 6603, { room, radius: 5, intensity: 0.7 });
  P.candles(ctx, x1 - 0.6, y, z1 - 0.6, 3, 6604, { room, radius: 5, intensity: 0.7 });
  ctx.lights.push({ x: xc, y: y + 2.0, z: z1 - 2.0, r: 1, g: 0.55, b: 0.26, radius: 8, intensity: 0.9, room });
  ctx.lights.push({ x: x0 + 1.2, y: y + 2.0, z: -74.0, r: 1, g: 0.55, b: 0.26, radius: 7, intensity: 0.5, room });
  P.candles(ctx, x0 + 0.4, y, -79.4, 3, 6605, { room, radius: 4.5, intensity: 0.7 });
  L.enemies.push({ type: 'mourner', x: xc + 1.4, y, z: tz0 + 1.2, yaw: Math.PI, idle: 'stand', id: 'e_capilla2' });
  L.zones.push(
    { id: 'capilla_tribuna', rects: [[x0, z0, tx1, tz0, y - 0.3, E + 1], [x0, tz0, x1, z1, y - 0.3, E + 1]], atmo: 'chapel', room },
    { id: 'capilla_real', rects: [[x0, z0, x1, z1, -1, C.ridge]], atmo: 'chapel', room: abajo }
  );
  L.map.push({ id: 'capilla_real', r: [FORT.patio.x1, z0, FORT.x1, z1 + 0.6] });
}

// La escalera de tablas de la tribuna: sube hacia los pies (+z), con su
// pasamanos del lado de la nave.
function escalera(ctx, x, z, n, rise, run, room) {
  const wb = ctx.wb;
  for (let i = 0; i < n; i++) {
    const top = rise * (i + 1);
    const za = z + run * i,
      zb = z + run * (i + 1) + 0.03;
    wb.box('planks', x - 0.75, top - 0.07, za, x + 0.75, top, zb, { ao: false, faces: 'tnsewb', room, tint: [0.66, 0.56, 0.46].map((v) => v * (i % 2 ? 0.95 : 1.02)), sub: 3 });
    wb.box('wooddark', x - 0.75, top - rise, za, x + 0.75, top - 0.07, za + 0.03, { ao: false, faces: 'nsewb', room, tint: [0.5, 0.44, 0.38] });
    ctx.col.add(x - 0.75, top - rise - 0.02, za, x + 0.75, top, zb);
  }
  const L = n * run;
  for (const dx of [-0.79, 0.79]) beam(ctx, 'wooddark', V(x + dx, -0.05, z), V(x + dx, n * rise - 0.05, z + L), 0.08, { d: 0.26, side: V(1, 0, 0), room, tint: [0.5, 0.42, 0.36] });
  const rx = x - 0.83;
  beam(ctx, 'wooddark', V(rx, 0.95, z + 0.1), V(rx, n * rise + 0.95, z + L), 0.07, { d: 0.08, room });
  for (let i = 1; i < n; i += 3) wb.box('wooddark', rx - 0.03, (i + 1) * rise, z + i * run + run / 2 - 0.03, rx + 0.03, (i + 1) * rise + 0.95, z + i * run + run / 2 + 0.03, { ao: false, room });
  ctx.col.add(rx - 0.04, 0, z, rx + 0.04, n * rise + 1.1, z + L);
}

// ------------------------------------------------------------------------ el campanario
// Sobre el presbiterio, saliendo del tejado: el cuerpo de piedra con sus
// esquinas de sillería, el de las campanas con un vano en cada cara, la
// cornisa, el chapitel y la cruz; dentro, la campana en su yugo.
function campanario(ctx) {
  const wb = ctx.wb;
  const B = CAP.torre;
  const h = B.w / 2,
    t = 0.45;
  const x0 = B.x - h,
    x1 = B.x + h,
    z0 = B.z - h,
    z1 = B.z + h;
  const room = 'campanario';
  const tint = PIEDRA.lienzo,
    st = PIEDRA.silla;
  const o = { tint, revealRoom: room, collide: false };
  const vn = [{ c: 0, w: 1.3, y: B.yb + 0.2, h: 1.5, rise: 0.65, ring: 0.2 }];
  const fuera = [{ room: null, y0: B.y0, y1: B.yc }],
    dentro = [{ room, y0: B.yb, y1: B.yc, tint: [0.62, 0.6, 0.56] }];
  // los cuatro muros, cada uno con su vano (fuera: n y s a lo largo de x; w y
  // e, de z)
  muroVanos(ctx, 'x', x0, x1, z0, z0 + t, B.y0, B.yc, vn.map((v) => ({ ...v, c: B.x })), fuera, dentro, o);
  muroVanos(ctx, 'x', x0, x1, z1 - t, z1, B.y0, B.yc, vn.map((v) => ({ ...v, c: B.x })), dentro, fuera, o);
  muroVanos(ctx, 'z', z0 + t, z1 - t, x0, x0 + t, B.y0, B.yc, vn.map((v) => ({ ...v, c: B.z })), fuera, dentro, o);
  muroVanos(ctx, 'z', z0 + t, z1 - t, x1 - t, x1, B.y0, B.yc, vn.map((v) => ({ ...v, c: B.z })), dentro, fuera, o);
  for (const [ex, ez, dx, dz] of [
    [x0, z0, -1, -1],
    [x1, z0, 1, -1],
    [x0, z1, -1, 1],
    [x1, z1, 1, 1],
  ])
    esquina(ctx, ex, ez, dx, dz, B.y0 + 0.4, B.yc - 0.1, { h: 0.48 });
  // la imposta del cuerpo de campanas, la cornisa, el chapitel y la cruz
  wb.box('ashlar', x0 - 0.1, B.yb - 0.16, z0 - 0.1, x1 + 0.1, B.yb, z1 + 0.1, { ao: false, faces: 'nsewb', tint: st });
  wb.box('ashlar', x0 - 0.3, B.yc, z0 - 0.3, x1 + 0.3, B.yc + 0.32, z1 + 0.3, { ao: false, faces: 'tnsewb', tint: st });
  for (let k = 0; k < 2; k++) wb.box('ashlar', x0 - 0.1 - k * 0.1, B.yc - 0.3 + k * 0.15, z0 - 0.1 - k * 0.1, x1 + 0.1 + k * 0.1, B.yc - 0.15 + k * 0.15, z1 + 0.1 + k * 0.1, { ao: false, faces: 'nsewb', tint: st });
  wb.pyramid('roof', B.x, B.z, B.w + 0.8, B.w + 0.8, B.yc + 0.32, 3.2);
  wb.box('iron', B.x - 0.05, B.yc + 3.3, B.z - 0.05, B.x + 0.05, B.yc + 4.6, B.z + 0.05, { ao: false });
  wb.box('iron', B.x - 0.05, B.yc + 4.0, B.z - 0.4, B.x + 0.05, B.yc + 4.1, B.z + 0.4, { ao: false });
  // el suelo del cuerpo de campanas y su techo (el envés del chapitel)
  wb.box('flag', x0 + t, B.yb - 0.02, z0 + t, x1 - t, B.yb, z1 - t, { faces: 't', ao: false, room, tint: [0.6, 0.58, 0.54] });
  wb.box('wooddark', x0 + t, B.yc - 0.02, z0 + t, x1 - t, B.yc, z1 - t, { faces: 'b', ao: false, room, tint: [0.4, 0.36, 0.32] });
  // la campana en su yugo, y el agujero del cordón en el suelo
  const by = B.yc - 0.45;
  wb.box('wooddark', B.x - 1.0, by - 0.1, B.z - 0.12, B.x + 1.0, by + 0.12, B.z + 0.12, { ao: false, faces: 'tnsewb', room });
  wb.cylinder('bronzeAged', B.x, by - 1.15, B.z, 0.62, 0.3, 1.05, 12, { ao: false, capTop: true, room });
  wb.cylinder('bronzeIn', B.x, by - 1.16, B.z, 0.6, 0.6, 0.01, 12, { ao: false, capBot: true, room });
  wb.cylinder('iron', B.x, by - 1.2, B.z, 0.07, 0.05, 0.75, 6, { ao: false, room });
  wb.box('rope', B.x - 0.015, B.yb, B.z - 0.015, B.x + 0.015, by - 1.2, B.z + 0.015, { ao: false, room });
  wb.cylinder('black', B.x, B.yb + 0.005, B.z, 0.12, 0.12, 0.01, 8, { ao: false, grime: false, capTop: true, room });
  ctx.lights.push({ x: B.x, y: B.yb + 1.6, z: B.z, r: 0.5, g: 0.58, b: 0.78, radius: 4, intensity: 0.8, room });
  ctx.col.addCam(x0, B.y0, z0, x1, B.yc + 3.5, z1);
  ctx.crows.push({ x: B.x, y: B.yc + 1.2, z: B.z, r: 3, n: 3 });
}

// ------------------------------------------------------------------------ el cordón y la llave
// El cordón de la campana, en dos grupos del mundo: tenso (de la clave a la
// argolla de la cabecera de la tribuna, con la llave atada en el nudo) y
// suelto (colgando derecho de la clave, cuando se ha soltado la llave: la
// campana ha sonado). game/interact.js los cambia al coger la llave.
function cordon(ctx, L) {
  const wb = ctx.wb;
  const C = FORT.capilla;
  const B = CAP.torre,
    A = CAP.argolla;
  const room = 'capilla';
  const yk = CAP.ys + CAP.rise - 0.02;
  const ax = C.x0 + 0.06;
  const cuerda = (a, b, r = 0.016) => {
    const m = a.clone().add(b).multiplyScalar(0.5);
    wb.geometry('rope', new THREE.BoxGeometry(r * 2, a.distanceTo(b), r * 2), new THREE.Matrix4().compose(m, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()), V(1, 1, 1)), { ao: false, room, tint: [0.8, 0.72, 0.58] });
  };
  // la argolla, en su grapa
  wb.box('iron', C.x0, A.y - 0.06, A.z - 0.06, C.x0 + 0.05, A.y + 0.06, A.z + 0.06, { ao: false, room });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2,
      b = ((k + 1) / 8) * Math.PI * 2;
    cuerda(V(ax, A.y - 0.12 + Math.cos(a) * 0.07, A.z + Math.sin(a) * 0.07), V(ax, A.y - 0.12 + Math.cos(b) * 0.07, A.z + Math.sin(b) * 0.07), 0.012);
  }
  ctx.beginGroup('cordon:tenso');
  cuerda(V(B.x, yk, B.z), V(ax + 0.02, A.y - 0.12, A.z));
  // (el nudo, y el cabo que cuelga de él)
  wb.cylinder('rope', ax + 0.04, A.y - 0.2, A.z, 0.04, 0.04, 0.12, 6, { ao: false, room, capTop: true, capBot: true });
  cuerda(V(ax + 0.04, A.y - 0.2, A.z), V(ax + 0.08, A.y - 0.75, A.z + 0.05));
  ctx.endGroup();
  ctx.beginGroup('cordon:suelto');
  cuerda(V(B.x, yk, B.z), V(B.x, 1.5, B.z));
  // (el asidero de lana roja del cabo)
  wb.cylinder('clothRed', B.x, 1.45, B.z, 0.045, 0.045, 0.7, 6, { ao: false, room, capTop: true, capBot: true });
  ctx.endGroup();
  // la llave, atada en el nudo: al soltarla, el cordón tira de la campana
  L.interact.push({ kind: 'item', id: 'i_llave_capellan', item: 'llave_capellan', x: ax + 0.2, y: A.y - 0.35, z: A.z + 0.15, r: 1.5, sound: 'bellToll', soundAt: [B.x, B.yc - 1.4, B.z], msg: 'campanaSuena', swap: ['cordon:tenso', 'cordon:suelto'], wake: 34 });
}
