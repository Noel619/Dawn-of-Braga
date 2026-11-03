// Las crujías de la fortaleza por dentro (PLAN_FORTALEZA.md, §5; fase 1: lo
// que se mudó del Paço, a sus salas nuevas). La planta baja de cada crujía y
// sus torres:
//
// - Al oeste, el gran salón a doble altura, con sus arcos diafragma, el
//   estrado y el sitial vacío del Rey, el hogar y el cancel: la Corte de los
//   Infieles (game/corte.js). Se entra por el servicio.
// - Al sur, la despensa y, en la torre del suroeste, la cocina con su campana;
//   al otro lado de la puerta, el cuerpo de guardia.
// - Al este, la capilla real con su tribuna y su espadaña (la llave del
//   capellán, atada al cordón de la campana), la cancillería y, en la torre
//   del sureste, el Tombo: cuatro plantas unidas por un caracol, y arriba las
//   arcas del Rey.
// - Al norte, a los lados de la torre del homenaje, la sala de la reina y su
//   torre (su cama, su libro de horas, el relicario); la antecámara del Rey y,
//   en la torre del nordeste, el tesoro con el camarero, el guardarropa y, a la
//   altura de la coracha, el altar de la llegada.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, stairs, archRing, subtractRects } from './builders.js';
import * as P from './props.js';
import { interiorRoom } from './level_util.js';
import { bakeCorpse } from '../entities/models.js';
import { calderaCera, panesCera } from './barrio_atrezo.js';
import { chest } from './level_souto.js';
import { FORT } from './fortaleza_medidas.js';
import { PIEDRA, tri, ajimez, vano, muroVanos, forjado, caracol, arcaSellada, estante, pupitre, atril, legajos, farol, hoja, sitial, tapiz, PERG, pieza, dentro, cara1, saeteraDentro, escaleraTablas, colgado, enlucido, zocalo } from './fortaleza_atrezo.js';
import { buildSalon } from './fortaleza_salon.js';
import { buildReina } from './fortaleza_reina.js';
import { buildRey } from './fortaleza_rey.js';
import { buildCapilla } from './fortaleza_capilla.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);
const F1 = FORT.F1;
const PISO = [0.74, 0.71, 0.66];

export function buildAlas(ctx, S, L) {
  buildSalon(ctx, S, L);
  despensa(ctx, S, L);
  cocina(ctx, S, L);
  guardia(ctx, S, L);
  buildCapilla(ctx, S, L);
  cancilleria(ctx, S, L);
  tombo(ctx, S, L);
  buildReina(ctx, S, L);
  buildRey(ctx, S, L);
}

// ------------------------------------------------------------------------ la despensa
// Entre el gran salón y la puerta: las tinajas, los toneles de la botillería,
// los estantes, los sacos vacíos. Una puerta al patio, otra al paso del
// servicio y otra a la cocina.
function despensa(ctx, S, L) {
  const wb = ctx.wb;
  const D = FORT.despensa,
    SO = FORT.torres.SO;
  const room = 'despensa';
  const { x0, x1, z0, z1 } = D;
  W(S, x0, z0, x1, z1);
  wb.box('flag', x0, -0.05, z0, x1, 0.02, z1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room, tint: PISO });
  interiorRoom(ctx, x0, z0, x1, z1, 0, F1, { room, floor: false, skip: ['n', 's', 'e', 'w'], skirting: false });
  // el muro de la cocina (el de levante de su torre), con su puerta; y el cabo
  // de su muro del norte
  const zk = -38.6;
  muroVanos(ctx, 'z', SO.z0 + SO.t, SO.z1 - SO.t, SO.x1 - SO.t, SO.x1, 0, SO.h, [{ c: zk, w: 1.6, y: 0, h: 2.4, rise: 0.8, ring: 0.26 }], [{ room: 'cocina', y0: 0, y1: FORT.walk - 0.4 }], [{ room, y0: 0, y1: F1 }], { tint: [0.74, 0.7, 0.64], revealRoom: room });
  cara1(ctx, 'wallstone', 'e', x0, z0, SO.z0 + SO.t, 0, F1, room, [0.74, 0.7, 0.64]);
  W(S, SO.x1 - SO.t - 0.3, zk - 0.8, SO.x1 + 0.3, zk + 0.8);
  L.interact.push({ kind: 'door', id: 'd_cocina', x: SO.x1 - SO.t / 2, y: 0, z: zk, w: 1.6, h: 3.2, arch: true, axis: 'z', mat: 'planks', hinge: 1, swing: -1, plane: SO.x1 - SO.t, inset: 0.06, ajar: 0.15, lock: { type: 'none' } });
  // la botillería (al oeste) y la despensa (al este)
  wb.setRoom(room);
  for (let i = 0; i < 2; i++) P.cask(ctx, x0 + 1.0, 0, z0 + 1.6 + i * 1.6, Math.PI / 2, { room });
  P.cask(ctx, x0 + 2.4, 0, z1 - 1.0, 0, { room });
  for (let i = 0; i < 5; i++) P.jar(ctx, x0 + 5 + i * 0.8, 0, z1 - 0.6, 1.1 + (i % 2) * 0.2, { room, broken: i === 3 });
  P.shelf(ctx, x1 - 0.3, 0, z0 + 2.4, -Math.PI / 2, 2.0);
  P.shelf(ctx, x1 - 0.3, 0, z0 + 5.2, -Math.PI / 2, 2.0);
  P.shelf(ctx, x1 - 4.0, 0, z1 - 0.3, Math.PI, 2.0);
  P.sacks(ctx, x1 - 2.4, 0, z0 + 1.0, 3, 6301);
  P.sacks(ctx, x0 + 9.0, 0, z1 - 1.1, 4, 6305);
  P.basket(ctx, x1 - 1.4, 0, z1 - 0.8, { room });
  P.table(ctx, x0 + 10.5, 0, (z0 + z1) / 2, 2.6, 1.0, 0, {});
  P.counter(ctx, x0 + 4.8, 0, z0 + 0.9, 0, 3.0, { room });
  bakeCorpse(wb, x0 + 11.4, 0, (z0 + z1) / 2 + 1.4, 2.6, 'curl', 'villager', 43);
  wb.setRoom(null);
  ctx.lights.push({ x: (x0 + x1) / 2, y: 3.4, z: (z0 + z1) / 2, r: 1, g: 0.5, b: 0.24, radius: 13, intensity: 0.8, room });
  P.wallTorch(ctx, (x0 + x1) / 2 + 2, 2.4, z1 - 0.02, 'n', { room });
  P.wallTorch(ctx, x0 + 4.0, 2.4, z1 - 0.02, 'n', { room });
  P.hangingLamp(ctx, x0 + 10.5, F1 - 0.1, (z0 + z1) / 2, { room, len: 1.2 });
  P.candles(ctx, x0 + 10.0, 0.82, (z0 + z1) / 2 + 0.2, 3, 6306, { room, radius: 6, intensity: 0.9 });
  L.interact.push({ kind: 'item', id: 'i_ampolla_despensa', item: 'ampolla', x: x1 - 0.42, y: 1.25, z: z0 + 5.2 });
  L.enemies.push({ type: 'penitent', x: x0 + 10.4, y: 0, z: (z0 + z1) / 2 - 1.1, yaw: 0.4, idle: 'eat', id: 'e_despensa1' });
  L.zones.push({ id: 'despensa', rects: [[x0, z0, x1, z1, -1, F1]], atmo: 'interior', room });
  L.map.push({ id: 'despensa', r: [x0, z0, x1, z1] });
}

// ------------------------------------------------------------------------ la cocina
// La torre del suroeste por dentro: la campana de piedra en medio, sobre el
// hogar, hasta el techo, y la chimenea que sale por lo alto de la torre; el
// horno del pan, las mesas de despiece, los calderos.
function cocina(ctx, S, L) {
  const wb = ctx.wb;
  const R = FORT.torres.SO;
  const room = 'cocina';
  const ix0 = R.x0 + R.t,
    ix1 = R.x1 - R.t,
    iz0 = R.z0 + R.t,
    iz1 = R.z1 - R.t;
  const cx = (ix0 + ix1) / 2,
    cz = (iz0 + iz1) / 2;
  const yC = FORT.walk - 0.4;
  const soot = [0.46, 0.42, 0.38];
  W(S, ix0, iz0, ix1, iz1);
  dentro(ctx, R, ['s', 'w'], [{ room, y0: 0, y1: yC }], { tint: soot });
  wb.box('flag', ix0, -0.05, iz0, ix1, 0.02, iz1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room, tint: [0.6, 0.57, 0.52] });
  // el muro del norte, con la puerta de la galería del salón (a +5,5: por
  // ella se sale al secadero)
  const G = FORT.galeria;
  muroVanos(ctx, 'x', R.x0, R.x1, R.z0, R.z0 + R.t, 0, R.h, [{ c: (G.x0 + G.x1) / 2, w: G.x1 - G.x0, y: G.y, h: 2.4, rise: 0 }], [], [{ room, y0: 0, y1: yC, tint: soot }], { tint: [0.74, 0.7, 0.64], revealRoom: room });
  secadero(ctx, R, room, L);
  for (const [d, line, u] of [
    ['n', iz1, cx],
    ['e', ix0, cz],
  ])
    for (const y of [4.4, F1 + 2.2]) saeteraDentro(ctx, d, line, u, y, room);
  // el techo, con la boca de la campana, y la campana: un tronco de pirámide
  // de hollín del hogar al techo
  const rB = 3.0,
    rT = 0.75,
    yB = 3.6;
  for (const m of subtractRects([ix0, iz0, ix1, iz1], [[cx - rT, cz - rT, cx + rT, cz + rT]])) wb.box('wooddark', m[0], yC, m[1], m[2], yC + 0.2, m[3], { faces: 'b', ao: false, room, tint: [0.36, 0.32, 0.28] });
  const c4 = (r, y) => [V(cx - r, y, cz - r), V(cx + r, y, cz - r), V(cx + r, y, cz + r), V(cx - r, y, cz + r)];
  const B = c4(rB, yB),
    Tt = c4(rT, yC);
  for (let k = 0; k < 4; k++) {
    const j = (k + 1) % 4;
    wb.quad('wallstone', B[k], B[j], Tt[j], Tt[k], { ao: false, sub: 3, room, tint: [0.3, 0.27, 0.24] });
    wb.quad('wallstone', Tt[k], Tt[j], B[j], B[k], { ao: false, sub: 3, room, tint: [0.18, 0.16, 0.14] });
  }
  for (const [a, b, c, d] of [
    [cx - rB - 0.1, cz - rB - 0.1, cx + rB + 0.1, cz - rB + 0.2],
    [cx - rB - 0.1, cz + rB - 0.2, cx + rB + 0.1, cz + rB + 0.1],
    [cx - rB - 0.1, cz - rB + 0.2, cx - rB + 0.2, cz + rB - 0.2],
    [cx + rB - 0.2, cz - rB + 0.2, cx + rB + 0.1, cz + rB - 0.2],
  ])
    wb.box('ashlar', a, yB - 0.3, b, c, yB, d, { faces: 'nsewb', ao: false, room, tint: [0.4, 0.37, 0.34] });
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    wb.box('iron', cx + sx * (rB - 0.1) - 0.06, yB, cz + sz * (rB - 0.1) - 0.06, cx + sx * (rB - 0.1) + 0.06, yC, cz + sz * (rB - 0.1) + 0.06, { ao: false, room });
  ctx.col.addCam(cx - rB, yB, cz - rB, cx + rB, yC, cz + rB);
  // la chimenea por encima de la torre, con su humo
  {
    const y0 = R.h;
    wb.box('ashlar', cx - 1.1, y0 - 0.5, cz - 1.1, cx + 1.1, y0 + 4.2, cz + 1.1, { faces: 'nsew', ao: false, sub: 2, tint: [0.66, 0.63, 0.58] });
    wb.box('ashlar', cx - 1.1, y0 + 4.2, cz - 1.1, cx + 1.1, y0 + 6.2, cz + 1.1, { faces: 'nsew', ao: false, sub: 2, tint: [0.36, 0.33, 0.3] });
    wb.box('ashlar', cx - 1.3, y0 + 6.2, cz - 1.3, cx + 1.3, y0 + 6.5, cz + 1.3, { faces: 'tnsewb', ao: false, tint: [0.3, 0.28, 0.26] });
    wb.box('black', cx - 0.8, y0 + 6.49, cz - 0.8, cx + 0.8, y0 + 6.51, cz + 0.8, { faces: 't', ao: false, grime: false });
    ctx.fires.push({ x: cx, y: y0 + 6.6, z: cz, s: 0.5, smoke: true, embers: false, light: false });
    ctx.col.addCam(cx - 1.1, y0, cz - 1.1, cx + 1.1, y0 + 6.5, cz + 1.1);
  }
  // el hogar bajo la campana: las brasas, el caldero colgado y los asadores
  solid(ctx, 'wallstone', cx - 1.6, 0, cz - 1.6, cx + 1.6, 0.42, cz + 1.6, { faces: 'tnsew', ao: false, sub: 2, room, mats: { t: 'flag' }, tint: [0.5, 0.46, 0.42] });
  wb.cylinder('ember', cx, 0.42, cz, 1.0, 0.9, 0.04, 10, { ao: false, grime: false, capTop: true, room });
  P.firewood(ctx, cx + 0.4, 0.42, cz - 0.3, 1.2, 3);
  ctx.fires.push({ x: cx, y: 0.5, z: cz, s: 1.0, smoke: true, embers: true });
  ctx.lights.push({ x: cx, y: 1.6, z: cz, r: 1, g: 0.4, b: 0.12, radius: 14, intensity: 1.6, room });
  if (ctx.dynLights) ctx.dynLights.push({ x: cx, y: 1.6, z: cz, intensity: 5, range: 10 });
  P.wallTorch(ctx, ix0 + 0.02, 2.4, iz0 + 1.6, 'e', { room });
  for (const s2 of [-1, 1]) wb.box('iron', cx + s2 * 1.4 - 0.05, 0.42, cz - 0.05, cx + s2 * 1.4 + 0.05, 2.6, cz + 0.05, { ao: false, room });
  wb.box('iron', cx - 1.45, 2.5, cz - 0.04, cx + 1.45, 2.58, cz + 0.04, { ao: false, room });
  P.chains(ctx, cx, 2.5, cz, 9, 0);
  wb.cylinder('iron', cx, 1.45, cz, 0.36, 0.46, 0.55, 10, { ao: false, capBot: true, room });
  wb.cylinder('black', cx, 2.0, cz, 0.4, 0.4, 0.01, 10, { ao: false, grime: false, capTop: true, room });
  ctx.col.add(cx - 1.6, 0, cz - 1.6, cx + 1.6, 0.9, cz + 1.6);
  // el horno, las mesas, la leña, los sacos; los cocineros
  wb.setRoom(room);
  P.breadOven(ctx, ix0 + 1.6, 0, iz1 - 1.6, -Math.PI / 4, { room });
  P.table(ctx, ix0 + 0.65, 0, cz - 2.8, 2.6, 0.9, Math.PI / 2, {});
  P.table(ctx, cx + 0.6, 0, iz1 - 0.65, 3.0, 0.9, 0, {});
  P.firewood(ctx, ix1 - 0.6, 0, iz1 - 2.4, Math.PI / 2, 4);
  P.sacks(ctx, ix1 - 1.4, 0, iz1 - 1.2, 3, 6304);
  // (bajo la escalera: la leña de la semana y los sacos de la harina)
  P.firewood(ctx, cx - 0.6, 0, iz0 + 0.55, 0, 3);
  P.sacks(ctx, cx - 2.6, 0, iz0 + 0.7, 3, 6307);
  P.jar(ctx, ix0 + 0.5, 0, cz + 0.4, 1.2, { room });
  P.jar(ctx, ix0 + 0.6, 0, cz + 1.2, 1.0, { room });
  P.dropped(ctx, ix0 + 0.6, 0.82, cz - 3.0, 0.4, 'knife');
  bakeCorpse(wb, cx + 2.2, 0, cz + 2.4, -2.4, 'sit', 'villager', 70);
  bakeCorpse(wb, ix0 + 1.4, 0, cz - 1.4, 0.8, 'face', 'villager', 71);
  P.decal(ctx, ix0 + 1.4, 0.03, cz - 1.4, 1.6);
  wb.setRoom(null);
  L.enemies.push({ type: 'penitent', x: cx - 2.6, y: 0, z: cz + 2.4, yaw: 2.4, idle: 'eat', id: 'e_cocina1' });
  L.zones.push({ id: 'cocina', rects: [[ix0, iz0, ix1, iz1, -1, yC]], atmo: 'interior', room });
  L.map.push({ id: 'cocina', r: [R.x0, R.z0, R.x1, R.z1] });
}

// El secadero de la cocina: la escalera de tablas, empinada, que sube por el
// muro del norte hasta un sobrado en el rincón, a +5,5, contra la puerta de la
// galería del salón; la vara de los jamones y los chorizos sobre la escalera,
// los manojos de hierbas; lo que se guarda arriba. Y el rastrero, en lo alto,
// junto a la campana.
function secadero(ctx, R, room, L) {
  const wb = ctx.wb;
  const ix0 = R.x0 + R.t,
    iz0 = R.z0 + R.t;
  const y = F1;
  const sx1 = ix0 + 3.0,
    sz1 = iz0 + 2.2;
  const rng = new RNG(6361);
  // el sobrado: su forjado, la viga del canto sobre su pie derecho y el
  // antepecho
  forjado(ctx, ix0, iz0, sx1, sz1, y, [], room, room, { tint: [0.62, 0.54, 0.46] });
  wb.box('timber', ix0, y - 0.55, sz1 - 0.2, sx1, y - 0.3, sz1, { ao: false, faces: 'nsewb', room });
  wb.box('timber', sx1 - 0.2, y - 0.55, iz0, sx1, y - 0.3, sz1, { ao: false, faces: 'nsewb', room });
  wb.box('timber', sx1 - 0.2, 0, sz1 - 0.2, sx1, y - 0.55, sz1, { aoH: 0.8, faces: 'nsew', room });
  ctx.col.add(sx1 - 0.2, 0, sz1 - 0.2, sx1, y, sz1);
  const sz0 = iz0 + 1.45; // (hasta ahí llega la escalera)
  for (const [a, b, c, d] of [
    [ix0, sz1 - 0.08, sx1, sz1],
    [sx1 - 0.08, sz0, sx1, sz1],
  ]) {
    wb.box('wooddark', a, y + 0.95, b, c, y + 1.02, d, { ao: false, faces: 'tnsewb', room });
    const alongX = c - a > d - b;
    for (let u = alongX ? a + 0.3 : b + 0.2; u < (alongX ? c : d) - 0.1; u += 0.45) {
      if (alongX) wb.box('wooddark', u - 0.03, y, b, u + 0.03, y + 0.95, d, { ao: false, room });
      else wb.box('wooddark', a, y, u - 0.03, c, y + 0.95, u + 0.03, { ao: false, room });
    }
    ctx.col.add(a, y, b, c, y + 1.3, d);
  }
  // la escalera, por el muro del norte, de la puerta de la despensa al
  // sobrado: empinada, con su pasamanos de la mitad arriba
  const n = 18;
  const run = 0.32;
  escaleraTablas(ctx, sx1 + n * run - 0.02, 0, iz0 + 0.75, 'w', 1.4, n, y / n, run, { room, side: -1, desde: 4 });
  // la vara de los jamones sobre la escalera, y la de las hierbas sobre el
  // sobrado
  {
    const vz = iz0 + 0.62,
      vy = 9.6;
    wb.box('wooddark', sx1, vy - 0.06, vz - 0.05, sx1 + 5.6, vy + 0.06, vz + 0.05, { ao: false, room });
    for (const x of [sx1, sx1 + 5.6]) wb.box('iron', x - 0.03, vy, vz - 0.03, x + 0.03, FORT.walk - 0.4, vz + 0.03, { ao: false, room });
    let k = 0;
    for (let x = sx1 + 0.35; x < sx1 + 5.4; x += 0.55) colgado(ctx, x, vy - 0.06, vz + rng.range(-0.04, 0.04), k++ % 3 === 2 ? 1 : 0, room, rng);
    const hz = sz1 - 0.6;
    wb.box('wooddark', ix0 + 0.2, y + 2.7, hz - 0.04, sx1 - 0.3, y + 2.78, hz + 0.04, { ao: false, room });
    for (let x = ix0 + 0.5; x < sx1 - 0.4; x += 0.5) colgado(ctx, x, y + 2.7, hz, 2, room, rng);
  }
  // lo de arriba: el tonel de la manteca, los sacos, la cesta, una vela
  wb.setRoom(room);
  P.barrel(ctx, ix0 + 0.55, y, sz1 - 0.65, {});
  P.basket(ctx, ix0 + 1.45, y, sz1 - 0.45, { room });
  wb.setRoom(null);
  P.candles(ctx, ix0 + 0.25, y, iz0 + 0.3, 2, 6363, { room, radius: 4, intensity: 0.8 });
  // el rastrero, pegado a la campana: salta al que sube
  L.enemies.push({ type: 'crawler', x: sx1 - 2.2, y, z: iz0 + 1.2, yaw: Math.PI / 2, idle: 'stand', id: 'e_cocina2' });
  L.zones.push({ id: 'secadero', rects: [[ix0, iz0, sx1, sz1, y - 0.3, y + 3]], atmo: 'interior', room });
}

// ------------------------------------------------------------------------ el cuerpo de guardia
// Al otro lado de la puerta: las mesas de la tropa, sus jergones, las
// armaduras y las lanzas en sus soportes, el brasero.
function guardia(ctx, S, L) {
  const wb = ctx.wb;
  const G = FORT.guardia,
    SE = FORT.torres.SE;
  const room = 'guardia';
  const { x0, x1, z0, z1 } = G;
  W(S, x0, z0, x1, z1);
  wb.box('flag', x0, -0.05, z0, x1, 0.02, z1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room, tint: PISO });
  interiorRoom(ctx, x0, z0, x1, z1, 0, F1, { room, floor: false, skip: ['n', 's', 'e', 'w'], skirting: false });
  cara1(ctx, 'wallstone', 'w', SE.x0, z0, z1, 0, F1, room, [0.74, 0.7, 0.64]);
  wb.setRoom(room);
  P.table(ctx, (x0 + x1) / 2, 0, (z0 + z1) / 2, 3.2, 1.0, 0, {});
  P.bench(ctx, (x0 + x1) / 2, 0, (z0 + z1) / 2 - 0.85, 2.8, 0);
  P.bench(ctx, (x0 + x1) / 2, 0, (z0 + z1) / 2 + 0.85, 2.8, 0);
  P.candles(ctx, (x0 + x1) / 2 + 0.6, 0.82, (z0 + z1) / 2, 3, 6411, { room, radius: 6, intensity: 0.8 });
  P.weaponRack(ctx, x1 - 0.35, 0, z0 + 2.4, -Math.PI / 2);
  P.weaponRack(ctx, x1 - 0.35, 0, z1 - 2.4, -Math.PI / 2);
  P.armorStand(ctx, x0 + 0.8, 0, z0 + 1.2, Math.PI / 2, { room });
  P.armorStand(ctx, x0 + 0.8, 0, z0 + 2.6, Math.PI / 2, { room });
  for (const x of [x0 + 2.6, x0 + 5.0, x0 + 7.4]) P.hay(ctx, x, 0, z1 - 1.0, 0);
  P.barrel(ctx, x1 - 1.0, 0, (z0 + z1) / 2, {});
  P.brazier(ctx, x0 + 3.0, 0, (z0 + z1) / 2, { room });
  P.arrows(ctx, x1 - 2.0, 0, z1 - 1.2, 6, 6412, 0.9);
  bakeCorpse(wb, x0 + 5.2, 0, z1 - 1.0, 0.2, 'back', 'soldier', 44);
  wb.setRoom(null);
  P.wallTorch(ctx, x0 + 0.02, 2.4, z1 - 2.0, 'e', { room });
  P.wallTorch(ctx, x1 - 0.02, 2.4, z0 + 4.4, 'w', { room });
  ctx.lights.push({ x: (x0 + x1) / 2, y: 3.4, z: (z0 + z1) / 2, r: 1, g: 0.5, b: 0.24, radius: 11, intensity: 0.6, room });
  L.interact.push({ kind: 'item', id: 'i_virotes_guardia', item: 'virote', n: 6, x: x1 - 1.6, y: 0.95, z: (z0 + z1) / 2 - 0.4 });
  L.enemies.push({ type: 'soldier', x: (x0 + x1) / 2 - 2, y: 0, z: (z0 + z1) / 2 + 2.2, yaw: Math.PI, idle: 'stand', id: 'e_guardia1' }, { type: 'soldier', x: x1 - 2.4, y: 0, z: z0 + 1.6, yaw: -Math.PI / 2, idle: 'stand', id: 'e_guardia2' });
  L.zones.push({ id: 'guardia_fortaleza', rects: [[x0, z0, x1, z1, -1, F1]], atmo: 'interior', room });
  L.map.push({ id: 'guardia_fortaleza', r: [x0, z0, x1, z1] });
}

// ------------------------------------------------------------------------ la cancillería
// La sala de los escribanos: los pupitres, las mesas de copiar, los estantes
// de los registros, la esquina del sello y, en el testero, la mesa del
// canciller bajo el estandarte del Rey, con el traslado de la carta de la reja.
function cancilleria(ctx, S, L) {
  const wb = ctx.wb;
  const Cn = FORT.cancilleria,
    SE = FORT.torres.SE;
  const room = 'cancilleria';
  const { x0, x1, z0, z1 } = Cn;
  const rng = new RNG(7201);
  W(S, x0, z0, x1, z1);
  wb.box('planks', x0, -0.05, z0, x1, 0.02, z1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room, tint: [0.66, 0.6, 0.52] });
  interiorRoom(ctx, x0, z0, x1, z1, 0, F1, { room, floor: false, skip: ['n', 's', 'e', 'w'], skirting: false, ceilMat: 'wooddark' });
  // los cabos de los muros del Tombo que asoman a la sala
  cara1(ctx, 'wallstone', 'n', SE.z0, x0, SE.x0 + SE.t, 0, F1, room, [0.74, 0.7, 0.64]);
  cara1(ctx, 'wallstone', 'n', SE.z0, SE.x1 - SE.t, x1, 0, F1, room, [0.74, 0.7, 0.64]);
  // los muros, encalados, con su zócalo de almagre (sin él en las puertas:
  // la del patio y la del Tombo)
  const cal = [0.9, 0.87, 0.8];
  const pp = Cn.puerta,
    xd = -69.2;
  enlucido(ctx, 'plaster', 'e', x0, z0, z1, 1.0, F1 - 0.3, [[pp - 1.15, 0, pp + 1.15, 3.8]], room, { tint: cal });
  enlucido(ctx, 'plaster', 'w', x1, z0, z1, 1.0, F1 - 0.3, [], room, { tint: cal });
  enlucido(ctx, 'plaster', 's', z0, x0, x1, 1.0, F1 - 0.3, [], room, { tint: cal });
  enlucido(ctx, 'plaster', 'n', SE.z0, x0, x1, 1.0, F1 - 0.3, [[xd - 0.98, 0, xd + 0.98, 3.5]], room, { tint: cal });
  zocalo(ctx, 'e', x0, z0, z1, 0.03, 0.96, room, [[pp - 1.15, pp + 1.15]]);
  zocalo(ctx, 'w', x1, z0, z1, 0.03, 0.96, room);
  zocalo(ctx, 's', z0, x0, x1, 0.03, 0.96, room);
  zocalo(ctx, 'n', SE.z0, x0, x1, 0.03, 0.96, room, [[xd - 0.98, xd + 0.98]]);
  wb.setRoom(room);
  // los pupitres contra la muralla y las mesas de copiar
  for (const z of [z0 + 1.8, z0 + 4.4, z0 + 7.0]) pupitre(ctx, x1 - 0.8, 0, z, -Math.PI / 2, room, rng);
  for (const z of [z0 + 3.0, z0 + 7.6]) {
    P.table(ctx, (x0 + x1) / 2 - 0.6, 0, z, 3.0, 1.0, Math.PI / 2, {});
    P.bench(ctx, (x0 + x1) / 2 - 1.5, 0, z, 2.6, Math.PI / 2);
    for (let i = 0; i < 4; i++) hoja(wb, (x0 + x1) / 2 - 0.6 + rng.range(-0.3, 0.3), 0.8, z + rng.range(-1.2, 1.2), rng.range(0, 3), room, rng, i);
  }
  // los estantes contra el muro de la capilla
  estante(ctx, x0 + 2.0, 0, z0 + 0.22, 0, 2.2, room, 7203);
  estante(ctx, x0 + 4.4, 0, z0 + 0.22, 0, 2.2, room, 7204);
  estante(ctx, x0 + 6.8, 0, z0 + 0.22, 0, 2.2, room, 7205);
  // la esquina del sello: la caldera de la cera y los panes
  calderaCera(ctx, x0 + 0.9, 0, z1 - 1.0, room);
  panesCera(ctx, x0 + 2.2, 0, z1 - 0.6, 6, room, 7207);
  // la mesa del canciller, en su tarima, bajo el estandarte
  {
    const mx = x1 - 2.4,
      mz = z1 - 1.6;
    solid(ctx, 'planks', mx - 1.8, 0, mz - 1.2, x1, 0.25, z1, { faces: 'tnw', ao: false, room, tint: [0.62, 0.55, 0.48] });
    P.table(ctx, mx, 0.25, mz, 2.2, 1.0, 0, {});
    wb.box('clothRed', mx - 1.12, 1.05, mz - 0.52, mx + 1.12, 1.07, mz + 0.52, { ao: false, faces: 'tnsew', room });
    P.candles(ctx, mx + 0.8, 1.07, mz + 0.2, 3, 7206, { room, radius: 6, intensity: 0.9 });
    P.banner(ctx, mx, 4.4, z1 - 0.1, Math.PI, 'bannerRey', 1.4, 2.6);
    L.interact.push({ kind: 'note', id: 'n_carta_rey', note: 'cartaRey', x: mx - 0.3, y: 1.07, z: mz - 0.1, model: 'paper' });
  }
  for (let i = 0; i < 9; i++) hoja(wb, x0 + 1 + rng.range(0, 8), 0.02, z0 + 1 + rng.range(0, 11), rng.range(0, 6), room, rng, i);
  wb.setRoom(null);
  ctx.lights.push({ x: (x0 + x1) / 2, y: 3.4, z: (z0 + z1) / 2, r: 1, g: 0.55, b: 0.26, radius: 12, intensity: 0.85, room });
  P.wallTorch(ctx, x0 + 0.02, 2.4, z0 + 5.6, 'e', { room });
  P.wallTorch(ctx, x0 + 0.02, 2.4, z1 - 2.2, 'e', { room });
  for (const z of [z0 + 3.0, z0 + 7.6]) P.candles(ctx, (x0 + x1) / 2 - 0.6, 0.8, z + 0.9, 3, 7208 + Math.round(z), { room, radius: 5, intensity: 0.8 });
  L.zones.push({ id: 'cancilleria', rects: [[x0, z0, x1, z1, -1, F1]], atmo: 'interior', room });
  L.map.push({ id: 'cancilleria', r: [x0, z0 - 1.2, x1, z1] });
}

// ------------------------------------------------------------------------ el Tombo
// La torre del sureste: el archivo y el tesoro de los papeles del Rey. Cuatro
// plantas unidas por un caracol en su rincón: los registros (con el libro
// grande en su atril), los legajos, las cartas y, arriba, las arcas del Rey,
// cada una con sus sellos, y el canciller sentado entre ellas.
function tombo(ctx, S, L) {
  const wb = ctx.wb;
  const R = FORT.torres.SE;
  const ix0 = R.x0 + R.t,
    ix1 = R.x1 - R.t,
    iz0 = R.z0 + R.t,
    iz1 = R.z1 - R.t;
  const cx = (ix0 + ix1) / 2,
    cz = (iz0 + iz1) / 2;
  const pisos = [0, 4.5, 9, 13.5];
  const techo = 18;
  const rooms = ['tombo1', 'tombo2', 'tombo3', 'tombo4'];
  const bands = pisos.map((y, k) => ({ room: rooms[k], y0: k ? y - 0.3 : 0, y1: k < 3 ? pisos[k + 1] - 0.3 : techo }));
  W(S, ix0, iz0, ix1, iz1);
  // el muro del norte, con la puerta de la cancillería
  const xd = -69.2;
  muroVanos(ctx, 'x', ix0, ix1, R.z0, R.z0 + R.t, 0, R.h, [{ c: xd, w: 1.4, y: 0, h: 2.4, rise: 0.7, ring: 0.24 }], [{ room: 'cancilleria', y0: 0, y1: F1 }], bands, { tint: [0.74, 0.7, 0.64], revealRoom: 'tombo1' });
  W(S, xd - 0.7, R.z0 - 0.3, xd + 0.7, iz0 + 0.3);
  L.interact.push({ kind: 'door', id: 'd_tombo', x: xd, y: 0, z: R.z0 + R.t / 2, w: 1.4, h: 3.1, arch: true, axis: 'x', mat: 'planks', hinge: -1, swing: -1, plane: iz0, inset: 0.06, lock: { type: 'none' } });
  dentro(ctx, R, ['s', 'w', 'e'], bands, { tint: [0.72, 0.7, 0.66], mat: 'ashlar' });
  // el caracol, los forjados y el techo
  const K = caracol(ctx, ix1, iz1, 1.6, pisos, rooms, { tint: [1, 1, 1] });
  for (let k = 1; k < 4; k++) forjado(ctx, ix0, iz0, ix1, iz1, pisos[k], [K.hueco], rooms[k], rooms[k - 1]);
  wb.box('flag', ix0, -0.05, iz0, ix1, 0.02, iz1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room: rooms[0], tint: PISO });
  wb.box('wooddark', ix0, techo, iz0, ix1, techo + 0.2, iz1, { faces: 'b', ao: false, room: rooms[3], tint: [0.56, 0.5, 0.44] });
  for (let z = iz0 + 0.8; z < iz1 - 0.4; z += 1.3) wb.box('timber', ix0, techo - 0.24, z - 0.11, ix1, techo, z + 0.11, { ao: false, faces: 'nsewb', room: rooms[3] });
  // las saeteras de cada planta, por dentro, y la luz que entra por ellas
  pisos.forEach((y, k) => {
    saeteraDentro(ctx, 'n', iz1, ix0 + 2.2, y + 1.4, rooms[k]);
    saeteraDentro(ctx, 'w', ix1, iz0 + 2.6, y + 1.4, rooms[k]);
    saeteraDentro(ctx, 'e', ix0, cz, y + 1.4, rooms[k]);
    ctx.lights.push({ x: cx - 1, y: y + 2.0, z: cz - 1, r: 0.55, g: 0.58, b: 0.68, radius: 8.5, intensity: 0.7, room: rooms[k] });
    P.wallTorch(ctx, ix0 + 0.02, y + 2.4, iz0 + 1.4, 'e', { room: rooms[k] });
  });
  // la planta de abajo: los registros, el libro grande en su atril, el velón
  {
    const y = 0,
      room = rooms[0];
    wb.setRoom(room);
    atril(ctx, cx - 1.2, y, cz - 0.6, 0, room);
    wb.box('leather', cx - 1.42, y + 1.12, cz - 0.62, cx - 0.98, y + 1.17, cz - 0.18, { ao: false, room, tint: [0.42, 0.26, 0.18] });
    P.candelabra(ctx, cx - 2.4, y, cz - 0.2, { room });
    estante(ctx, ix0 + 0.22, y, iz0 + 2.4, Math.PI / 2, 2.0, room, 7301);
    estante(ctx, ix0 + 0.22, y, iz0 + 5.0, Math.PI / 2, 2.0, room, 7302);
    estante(ctx, ix0 + 3.0, y, iz1 - 0.22, Math.PI, 2.0, room, 7303);
    chest(ctx, ix1 - 4.4, y, iz0 + 0.7, Math.PI, room, 1.0);
    wb.setRoom(null);
    L.interact.push({ kind: 'note', id: 'n_registro', note: 'registro', x: cx - 1.2, y: y + 1.2, z: cz - 0.4, model: 'book' });
  }
  // la segunda: los legajos, en los estantes y en pilas por el suelo
  {
    const y = pisos[1],
      room = rooms[1];
    const rng = new RNG(7310);
    wb.setRoom(room);
    estante(ctx, ix0 + 0.22, y, iz0 + 2.0, Math.PI / 2, 2.2, room, 7311);
    estante(ctx, ix0 + 0.22, y, iz0 + 4.6, Math.PI / 2, 2.2, room, 7312);
    estante(ctx, ix0 + 2.8, y, iz1 - 0.22, Math.PI, 2.2, room, 7313);
    for (const [px, pz] of [
      [cx - 0.6, cz + 0.2],
      [cx + 0.9, cz - 1.6],
      [ix0 + 2.0, iz0 + 1.0],
      [cx - 1.8, cz + 2.0],
    ])
      legajos(ctx, px, y, pz, rng.range(0, 3), room, rng);
    wb.setRoom(null);
    L.enemies.push({ type: 'cortesanoSuelto', x: cx - 0.2, y, z: cz - 0.9, yaw: Math.PI / 2, idle: 'kneel', id: 'e_tombo1' });
  }
  // la tercera: las cartas, los fueros y las bulas, en arcones; la mesa con
  // una bula desplegada, con su plomo
  {
    const y = pisos[2],
      room = rooms[2];
    const rng = new RNG(7320);
    wb.setRoom(room);
    chest(ctx, ix0 + 0.4, y, cz - 0.8, Math.PI / 2, room, 1.0);
    chest(ctx, ix0 + 0.4, y, cz + 0.8, Math.PI / 2, room, 1.0);
    chest(ctx, cx, y, iz0 + 0.45, 0, room, 1.0);
    P.table(ctx, cx - 0.4, y, cz + 0.2, 1.6, 0.9, 0);
    wb.box('clothWhite', cx - 0.72, y + 0.8, cz - 0.1, cx - 0.08, y + 0.812, cz + 0.4, { ao: false, faces: 't', room, grime: false, tint: PERG[0] });
    wb.cylinder('iron', cx - 0.4, y + 0.8, cz + 0.52, 0.05, 0.05, 0.015, 10, { ao: false, capTop: true, room, tint: [0.7, 0.72, 0.76] });
    legajos(ctx, ix0 + 1.6, y, iz1 - 1.4, 0.3, room, rng);
    wb.setRoom(null);
    L.enemies.push({ type: 'crawler', x: cx + 0.8, y, z: cz + 1.6, yaw: -Math.PI / 2, idle: 'stand', id: 'e_tombo2' });
  }
  // la cuarta: las arcas del Rey, cada una con sus sellos, y el canciller
  {
    const y = pisos[3],
      room = rooms[3];
    wb.setRoom(room);
    // [id, x, z, rot, sellos, lo que dice, lo que da, trampa]
    const xw = ix0 + 0.5,
      zn = iz0 + 0.5,
      zs = iz1 - 0.5;
    const arcas = [
      ['a_se', xw, iz0 + 2.2, Math.PI / 2, 'vv', 'arcaSe', null, 0],
      ['a_guarda1', xw, cz, Math.PI / 2, 'nn', 'arcaResorte1', null, 30],
      ['a_camara3', xw, iz1 - 2.0, Math.PI / 2, 'rrr', 'arcaCamara3', 'llave_canciller', 0],
      ['a_guarda3', ix0 + 3.0, zn, 0, 'nnn', 'arcaGuarda3', 'virote', 0],
      ['a_camara2', cx + 0.6, zn, 0, 'rr', 'arcaCamara2', null, 0],
      ['a_guarda2', ix0 + 3.4, zs, Math.PI, 'nn', 'arcaResorte2', null, 30],
    ];
    const NOM = { r: 'bermejo', n: 'negro', v: 'verde' };
    const NUM = ['', 'un sello', 'dos sellos', 'tres sellos'];
    for (const [id, ax, az, rot, seals, text, item, trap] of arcas) {
      arcaSellada(ctx, ax, y, az, rot, room, id, seals.split(''), !trap && item !== 'llave_canciller');
      const s = Math.sin(rot),
        c = Math.cos(rot);
      const nom = NOM[seals[0]] + (seals.length > 1 ? 's' : '');
      L.interact.push({ kind: 'arca', id, x: ax, y, z: az, ix: ax + s * 0.75, iz: az + c * 0.75, r: 1.0, label: `Abrir el arca (${NUM[seals.length]} ${nom})`, text, after: text + 'Ya', item, n: item === 'virote' ? 6 : 1, trap });
    }
    // el canciller, sentado contra el muro entre las arcas, con el sello del
    // Rey en el regazo; a su lado, el farol, que aún arde
    const kx = cx + 0.4,
      kz = zs - 0.1;
    bakeCorpse(wb, kx, y, kz, Math.PI, 'sit', 'villager', 8);
    wb.cylinder('silver', kx, y + 0.36, kz - 0.55, 0.075, 0.075, 0.02, 14, { ao: false, capTop: true, capBot: true, room });
    wb.box('rope', kx - 0.01, y + 0.38, kz - 0.56, kx + 0.01, y + 0.62, kz - 0.54, { ao: false, room, tint: [0.18, 0.38, 0.16] });
    L.interact.push({ kind: 'examine', id: 'x_canciller', text: 'canciller', x: kx, y, z: kz - 0.7, r: 1.3 });
    farol(ctx, kx + 0.75, y, kz - 0.15, room);
    P.candles(ctx, xw + 0.5, y, cz + 1.0, 4, 7340, { room, radius: 6, intensity: 0.9 });
    // la mesa del sello, en medio, con su escribanía; los estantes del muro de
    // levante; los candeleros
    P.table(ctx, cx - 0.6, y, cz - 0.4, 2.0, 1.0, 0, {});
    wb.box('wooddark', cx - 1.0, y + 0.8, cz - 0.7, cx - 0.4, y + 0.95, cz - 0.3, { ao: false, faces: 'tnsew', room, tint: [0.5, 0.36, 0.26] });
    wb.box('clothWhite', cx - 0.2, y + 0.8, cz - 0.75, cx + 0.3, y + 0.805, cz - 0.1, { ao: false, faces: 't', room, grime: false, tint: PERG[1] });
    P.stool(ctx, cx - 0.6, y, cz + 0.5, { room });
    estante(ctx, ix1 - 0.22, y, iz0 + 1.6, -Math.PI / 2, 2.2, room, 7341);
    estante(ctx, ix1 - 0.22, y, iz0 + 4.0, -Math.PI / 2, 2.2, room, 7342);
    P.candelabra(ctx, cx - 2.2, y, cz - 2.4, { room });
    P.candelabra(ctx, ix0 + 1.6, y, iz0 + 1.6, { room });
    for (let i = 0; i < 6; i++) hoja(wb, cx + Math.sin(i * 2.1) * 1.6, y, cz + Math.cos(i * 1.7) * 1.4, i * 1.3, room, new RNG(7330 + i), i);
    wb.setRoom(null);
  }
  const names = ['tombo_registros', 'tombo_legajos', 'tombo_cartas', 'tombo_arcas'];
  pisos.forEach((y, k) => {
    L.zones.push({ id: names[k], rects: [[ix0, iz0, ix1, iz1, k ? y - 0.3 : -1, k < 3 ? pisos[k + 1] - 0.3 : techo]], atmo: 'interior', room: rooms[k] });
    L.map.push({ id: names[k], r: [R.x0, R.z0, R.x1, R.z1] });
  });
}
