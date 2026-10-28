// Las casas de la calleja de los Pellejeros, por dentro: la del zapatero, la
// de la viuda (la cerera), la quemada y la tintorería de la plazuela. Las
// casas (muros, huecos, forjados, escaleras, tejados) las levanta
// level_barrio.js con el kit; aquí, lo que hay en ellas y lo que cuentan.
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import * as P from './props.js';
import { chest, saint, bowl, herbBunch, closedWindow } from './level_souto.js';
import { bakeCorpse } from '../entities/models.js';
import { banqueta, horma, botas, cuero, calderaCera, varaVelas, estanteVelas, panesCera, panos, madejas, rollos, campanillas, cruzCal, palo } from './barrio_atrezo.js';
import { tabique } from './kit_casa.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// la luz de la luna que entra por una ventana (fría, débil)
const luna = (ctx, x, y, z, room, i = 0.45, r = 4) => ctx.lights.push({ x, y, z, r: 0.5, g: 0.6, b: 0.85, radius: r, intensity: i, room });
const COLORES = {
  anil: [0.22, 0.3, 0.62],
  rubia: [0.62, 0.16, 0.12],
  gualda: [0.78, 0.66, 0.2],
  verde: [0.3, 0.45, 0.25],
  morado: [0.4, 0.2, 0.4],
};

// ------------------------------------------------------------ el zapatero
// Maese Afonso, zapatero. La noche de la campana su mujer se arrodilló, y la
// carne se la llevó en la cama de arriba; el físico ni la miró («ésa ya está
// curada»). Al hijo, que estaba sano, le tomó el pulso, le miró los ojos y
// dijo que era el caso más claro que había visto: se lo llevó «para curarlo»
// y se lo devolvió con la corona de hierro. El padre lo ató en su cuarto;
// luego, en la cocina, le sirvió la cena cada noche. Ahora el hijo sigue
// sentado a la mesa.
export function zapatero(ctx, L, h) {
  const wb = ctx.wb;
  const [r0, r1] = h.rooms;
  const I = h.I;
  // ---- la tienda (delante)
  wb.setRoom(r0);
  // la banqueta, junto a la ventana del mostrador; las hormas en su estante
  banqueta(ctx, 21.9, 0, 40.3, Math.PI, r0);
  P.stool(ctx, 21.9, 0, 39.55, { room: r0 });
  // la tabla del mostrador, bajo la ventana (por dentro)
  wb.box('planks', 20.9, 0.85, 41.15, 22.3, 0.9, 41.55, { ao: false, room: r0, faces: 'tnsewb', tint: [0.8, 0.72, 0.62] });
  for (const x of [21.0, 22.2]) wb.box('wooddark', x - 0.03, 0, 41.2, x + 0.03, 0.85, 41.26, { ao: false, room: r0 });
  botas(ctx, 21.2, 0.9, 41.35, 0.2, r0);
  botas(ctx, 21.9, 0.9, 41.35, -0.1, r0, { tall: false, tint: [0.55, 0.38, 0.26] });
  // el estante de las hormas, contra el muro del oeste
  wb.at(I.x0 + 0.2, 0, 38.6, Math.PI / 2, () => {
    for (const sx of [-1.1, 1.05]) wb.box('wooddark', sx, 0, -0.18, sx + 0.05, 2.1, 0.18, { ao: false, room: r0 });
    for (let i = 0; i < 4; i++) wb.box('wooddark', -1.05, 0.35 + i * 0.5, -0.17, 1.05, 0.38 + i * 0.5, 0.17, { ao: false, room: r0, faces: 'tnsewb' });
  });
  const rng = new RNG(2101);
  for (let i = 0; i < 4; i++)
    for (let k = 0; k < 7; k++) {
      if (rng.chance(0.22)) continue;
      horma(wb, I.x0 + 0.2, 0.38 + i * 0.5, 37.65 + k * 0.29, rng.range(0.2, 0.27), r0, rng.chance(0.15), rng.range(-0.3, 0.3));
    }
  P.colOBB(ctx, I.x0 + 0.2, 38.6, 0.2, 1.1, 0, 0, 2.1);
  // los cueros, colgados de una vara entre las vigas, y las tiras
  palo(wb, V(I.x0 + 0.3, 3.2, 36.9), V(24.6, 3.2, 36.9), 0.025, 'wooddark', { room: r0, round: true });
  cuero(ctx, 21.4, 3.18, 36.9, 0, 0.9, 1.3, r0, { seed: 1 });
  cuero(ctx, 22.6, 3.18, 36.9, 0, 0.8, 1.15, r0, { seed: 2 });
  cuero(ctx, 23.8, 3.18, 36.9, 0, 0.85, 1.25, r0, { seed: 3 });
  // la mesa de cortar, con la suela a medio cortar, el diario y el candil
  P.table(ctx, 23.9, 0, 38.4, 1.5, 0.8, 0);
  wb.box('leather', 23.4, 0.8, 38.2, 24.1, 0.81, 38.6, { ao: false, room: r0, tint: [0.42, 0.3, 0.22] });
  wb.box('iron', 24.2, 0.8, 38.3, 24.45, 0.815, 38.36, { ao: false, room: r0 });
  P.candles(ctx, 24.45, 0.8, 38.65, 1, 2102, { room: r0, radius: 4.5, intensity: 0.75, spread: 0.02, scale: 0.8 });
  P.basket(ctx, 25.0, 0, 36.9, { rot: 0.4 });
  P.barrel(ctx, 20.85, 0, 36.95, { lying: false });
  luna(ctx, 21.6, 1.8, 41.0, r0, 0.4);
  // ---- la cocina (detrás): el hogar apagado, la mesa puesta y el hijo
  P.hearth(ctx, I.x0 + 0.1, 0, 33.9, 'e', { room: r0, lit: true, w: 1.6, ceil: 3.8 });
  P.table(ctx, 23.2, 0, 33.7, 1.6, 0.85, Math.PI / 2);
  P.stool(ctx, 22.5, 0, 33.2, { room: r0 });
  P.stool(ctx, 23.95, 0, 34.4, { room: r0, tipped: true });
  bowl(ctx, 23.05, 0.8, 33.3, 0.12, r0, ['water', [0.4, 0.1, 0.08]]);
  bowl(ctx, 23.35, 0.8, 34.15, 0.12, r0, ['water', [0.5, 0.42, 0.3]]);
  wb.box('wooddark', 23.1, 0.8, 33.9, 23.4, 0.83, 34.05, { ao: false, room: r0 });
  P.shelf(ctx, 25.9, 0, 32.0, -Math.PI / 2, 1.4);
  P.jar(ctx, 21.1, 0, 31.95, 1.0);
  P.jar(ctx, 21.6, 0, 31.85, 0.8);
  herbBunch(ctx, 22.4, 3.55, 32.3, 1, r0);
  herbBunch(ctx, 22.9, 3.55, 32.35, 2, r0);
  luna(ctx, 22.0, 1.8, 31.9, r0, 0.35);
  wb.setRoom(null);
  // ---- arriba: la alcoba del matrimonio (delante) y el cuarto del hijo
  wb.setRoom(r1);
  const y1 = h.levels ? h.levels[1].y : 4.05;
  P.bed(ctx, 21.6, y1, 38.9, Math.PI / 2);
  // (la sábana, negra de sangre: aquí la sangró)
  wb.box('flesh', 21.15, y1 + 0.605, 38.4, 22.0, y1 + 0.61, 39.5, { ao: false, room: r1, faces: 't', tint: [0.32, 0.08, 0.07], grime: false });
  bowl(ctx, 22.5, y1, 37.6, 0.16, r1, ['water', [0.3, 0.06, 0.05]]);
  chest(ctx, 23.6, y1, 41.1, Math.PI, r1, 1.0);
  saint(ctx, 'n', 23.1, y1 + 1.5, I.z1, r1, 2103, 'clothRed');
  luna(ctx, 21.6, y1 + 1.6, 41.1, r1, 0.45);
  // el cuarto del hijo: el jergón con las correas de su padre, el cubo
  wb.box('burlap', I.x0 + 0.1, y1, 31.7, I.x0 + 1.1, y1 + 0.22, 33.7, { ao: false, room: r1, tint: [0.6, 0.52, 0.42] });
  for (const z of [32.1, 32.8, 33.4]) wb.box('leather', I.x0 + 0.05, y1 + 0.18, z - 0.03, I.x0 + 1.15, y1 + 0.25, z + 0.03, { ao: false, room: r1, tint: [0.32, 0.22, 0.16] });
  P.colOBB(ctx, I.x0 + 0.6, 32.7, 0.55, 1.0, 0, y1, y1 + 0.25);
  P.barrel(ctx, 23.4, y1, 31.9);
  // (una espada de palo, del aprendiz que fue)
  palo(wb, V(24.5, y1 + 0.02, 33.1), V(25.3, y1 + 0.05, 33.6), 0.02, 'planks', { room: r1 });
  palo(wb, V(24.75, y1 + 0.04, 33.45), V(24.95, y1 + 0.04, 33.15), 0.02, 'planks', { room: r1 });
  luna(ctx, 22.0, y1 + 1.6, 31.9, r1, 0.4);
  P.candles(ctx, 25.6, y1, 35.6, 3, 2104, { room: r1, radius: 4, intensity: 0.6 });
  wb.setRoom(null);
  L.interact.push({ kind: 'note', id: 'n_zapatero', note: 'zapatero', x: 23.6, y: 0.82, z: 38.45, model: 'paper' });
}

// ------------------------------------------------------------ la viuda
// Dona Inês, cerera, viuda. Hacía las velas de la capilla y de medio Braga.
// Cuando el físico vino a curarla (estaba sana), se encerró en su alcoba,
// atrancó la puerta y no volvió a abrir. Él reventó un tablero de la puerta a
// hachazos; no pudo con la tranca. Volvió muchas noches a hablarle por el
// agujero, a leerle. Ella sigue en la cama, con su vela encendida.
export function viuda(ctx, L, h) {
  const wb = ctx.wb;
  const [r0, r1] = h.rooms;
  const I = h.I;
  const y1 = 4.05;
  const ra = 'viu_alcoba';
  // ---- la tienda de las velas (delante)
  wb.setRoom(r0);
  P.counter(ctx, 26.4, 0, 49.4, 0, 2.2, { room: r0 });
  estanteVelas(ctx, I.x0 + 0.2, 0, 48.6, Math.PI / 2, 2.2, r0);
  varaVelas(ctx, 23.2, 47.2, 26.6, 47.2, 2.9, r0, { seed: 1 });
  varaVelas(ctx, 23.2, 47.9, 26.6, 47.9, 2.9, r0, { seed: 2 });
  for (const x of [23.15, 26.65]) for (const z of [47.2, 47.9]) palo(wb, V(x, 2.9, z), V(x, 3.8, z), 0.012, 'iron', { room: r0 });
  calderaCera(ctx, 27.4, 0, 47.4, r0, { lit: true, intensity: 0.8 });
  panesCera(ctx, 24.0, 0, 50.1, 5, r0, 2201);
  panesCera(ctx, 24.45, 0, 50.15, 3, r0, 2202);
  P.basket(ctx, 23.2, 0, 50.15, { rot: 0.3 });
  luna(ctx, 23.5, 1.7, 46.9, r0, 0.35);
  // ---- la cocina (detrás)
  P.hearth(ctx, I.x0 + 0.1, 0, 52.7, 'e', { room: r0, lit: false, w: 1.5, ceil: 3.8 });
  P.table(ctx, 25.2, 0, 52.7, 1.4, 0.8, 0);
  P.stool(ctx, 25.2, 0, 53.4, { room: r0 });
  bowl(ctx, 24.9, 0.8, 52.6, 0.12, r0);
  P.jar(ctx, 26.8, 0, 54.2, 1.0);
  herbBunch(ctx, 24.0, 3.55, 53.5, 3, r0);
  luna(ctx, 23.4, 1.6, 54.3, r0, 0.3);
  wb.setRoom(null);
  // ---- arriba: la sala, la alcoba cerrada y el oratorio
  wb.setRoom(r1);
  // la sala: la mesa, la rueca, el arcón; las velas que dejó encendidas
  P.table(ctx, 26.6, y1, 48.6, 1.3, 0.8, Math.PI / 2);
  P.stool(ctx, 26.0, y1, 48.3, { room: r1 });
  P.spinningWheel(ctx, 27.9, y1, 49.9, 0.3, { room: r1 });
  chest(ctx, 25.95, y1, 46.75, 0, r1, 0.9);
  P.candles(ctx, 26.6, y1 + 0.8, 48.9, 2, 2203, { room: r1, radius: 4.2, intensity: 0.6, spread: 0.1 });
  luna(ctx, 27.4, y1 + 1.6, 46.8, r1, 0.5, 4.5);
  // el oratorio (detrás): el altar de la cerera, de cera hasta el suelo, y
  // los exvotos que ella misma hacía, colgados por las paredes
  const ro = 'viu_oratorio';
  P.candleAltar(ctx, 23.5, y1, 52.7, Math.PI / 2, ro);
  saint(ctx, 'e', I.x0, y1 + 1.6, 52.7, ro, 2204, 'clothBlue');
  const rx = new RNG(2205);
  for (let i = 0; i < 18; i++) {
    const north = rx.chance(0.5);
    const zw = north ? 50.84 : I.z1 - 0.04;
    // (por el norte, el tabique llega hasta el hueco de la escalera)
    const px = rx.range(23.0, north ? 27.4 : 28.6);
    const yy = y1 + rx.range(1.1, 2.5);
    const k = rx.int(0, 2);
    // (un brazo, una pierna, un corazón: de cera)
    const [w, hh] = [
      [0.07, 0.3],
      [0.08, 0.36],
      [0.12, 0.13],
    ][k];
    wb.box('candle', px - w, yy - hh / 2, zw - 0.02, px + w, yy + hh / 2, zw + 0.02, { ao: false, grime: false, room: ro, tint: [0.95, 0.88, 0.7] });
  }
  P.candles(ctx, 27.2, y1, 54.1, 5, 2206, { room: ro, radius: 4, intensity: 0.7 });
  luna(ctx, 23.5, y1 + 1.5, 54.3, ro, 0.3);
  wb.setRoom(null);
  L.interact.push({ kind: 'altar', id: 'a_viuda', name: 'Oratorio de la cerera', x: 23.5, y: y1, z: 52.7, spawn: [24.8, y1, 52.7], yaw: -Math.PI / 2 });
  // ---- la alcoba: la viuda en su cama, la vela, el arcón con la llave
  wb.setRoom(ra);
  P.bed(ctx, 23.6, y1, 48.9, Math.PI / 2);
  bakeCorpse(wb, 23.6, y1 + 0.55, 48.75, Math.PI, 'back', 'villager', 22);
  P.table(ctx, 24.75, y1, 47.5, 0.5, 0.45, 0);
  P.candles(ctx, 24.75, y1 + 0.8, 47.5, 1, 2207, { room: ra, radius: 4.5, intensity: 1.0, spread: 0.01 });
  chest(ctx, 22.9, y1, 50.15, -Math.PI / 2, ra, 0.9);
  saint(ctx, 'e', I.x0, y1 + 1.4, 47.6, ra, 2208, 'clothWhite');
  luna(ctx, 23.15, y1 + 1.6, 46.8, ra, 0.4);
  wb.setRoom(null);
  // el tabique de la alcoba, con su puerta (atrancada por dentro, con un
  // tablero reventado: se ve la cama y la vela), y el del oratorio
  tabique(ctx, { x0: 25.3, z0: I.z0, x1: 25.5, z1: 50.6 }, y1, 7.0, [ra, r1], { doors: [{ at: 49.55, w: 1.0, h: 2.2 }] });
  tabique(ctx, { x0: I.x0, z0: 50.6, x1: 25.3, z1: 50.8 }, y1, 7.0, [ra, 'viu_oratorio']);
  tabique(ctx, { x0: 25.3, z0: 50.6, x1: 27.7, z1: 50.8 }, y1, 7.0, [r1, 'viu_oratorio'], { doors: [{ at: 26.5, w: 1.1, h: 2.2 }] });
  L.interact.push({ kind: 'door', id: 'd_alcoba', x: 25.4, y: y1, z: 49.55, w: 1.0, h: 2.2, axis: 'z', mat: 'planks', hinge: 1, swing: 1, plane: 25.3, inset: 0.05, mark: 'broken', lock: { type: 'barred', side: -1 }, barredMsg: 'alcobaTranca' });
  L.interact.push({ kind: 'item', id: 'i_llave_tinte', item: 'llave_tinte', x: 22.9, y: y1 + 0.6, z: 50.15 });
  // la viga del balcón que se cayó: de la sacada de la sala a la de la alcoba
  cornisaBalcon(ctx, L);
}

// La viga del balcón de la sala (el balcón se vino abajo; la viga, no): por
// fuera de la fachada de la calleja, a ras del suelo de arriba, de una
// ventana de sacada a la otra. Se anda por ella haciendo equilibrio.
function cornisaBalcon(ctx, L) {
  const wb = ctx.wb;
  const y = 4.05,
    z0 = 45.48,
    z1 = 46.0;
  const xa = 22.55,
    xb = 28.0;
  wb.box('timber', xa, y - 0.24, z0, xb, y, z1, { ao: false, sub: 3, tint: [0.62, 0.55, 0.48] });
  // los canes de lo que fue el balcón, partidos, y alguna tabla colgando
  const rng = new RNG(2301);
  for (let x = xa + 0.35; x < xb - 0.2; x += 0.9) {
    const len = rng.range(0.25, 0.6);
    wb.box('wooddark', x - 0.07, y - 0.4, z0 - len, x + 0.07, y - 0.24, z0, { ao: false });
  }
  for (const [x, a] of [
    [24.2, 0.9],
    [26.1, -1.1],
  ]) {
    wb.push();
    wb.translate(x, y - 0.3, z0 - 0.1);
    wb.rotateX(a);
    wb.box('planks', -0.12, -0.9, -0.02, 0.12, 0, 0.02, { ao: false, tint: [0.75, 0.68, 0.6] });
    wb.pop();
  }
  ctx.col.add(xa, y - 0.24, z0, xb, y, z1).cam = false;
  // (el equilibrio en la viga: game/cornisas.js)
  // (el equilibrio, entre una ventana y la otra; delante de ellas se anda
  // suelto: se entra y se sale por ellas. Pegada a la fachada: hacia ella no
  // se cae)
  // (la raya: por donde puede ir uno, pegado al muro: a un palmo de él)
  (L.ledges || (L.ledges = [])).push({ id: 'viga_viuda', a: [23.8, y, 45.66], b: [26.75, y, 45.66], w: 0.36, wall: -1 });
}

// ------------------------------------------------------------ la quemada
// La casa de al lado de la viuda: los de dentro no se dejaron curar, y el
// físico les aplicó lo último que dice Hipócrates, el fuego. Arriba, el suelo
// hundido; el tejado, abierto.
export function quemada(ctx, L, h) {
  const wb = ctx.wb;
  const [r0, r1] = h.rooms;
  const I = h.I;
  wb.setRoom(r0);
  const rng = new RNG(2401);
  // muebles carbonizados, cascotes de las vigas que cayeron de arriba
  P.rubble(ctx, 31.2, 0, 49.6, 9, 2402, 0.9, { mat: 'wooddark', scale: 0.8 });
  P.table(ctx, 31.0, 0, 52.0, 1.2, 0.7, 0.4);
  P.stool(ctx, 32.1, 0, 51.4, { room: r0, tipped: true });
  bakeCorpse(wb, 30.6, 0, 48.0, 1.2, 'curl', 'villager', 23, null, { tint: [0.22, 0.18, 0.16] });
  luna(ctx, 33.0, 1.8, 48.4, r0, 0.3);
  luna(ctx, 31.7, 3.0, 50.5, r0, 0.25, 5);
  wb.setRoom(null);
  wb.setRoom(r1);
  P.rubble(ctx, 30.8, 4.05, 47.4, 7, 2403, 0.7, { mat: 'wooddark', scale: 0.7 });
  luna(ctx, 31.7, 6.0, 49.0, r1, 0.5, 5);
  wb.setRoom(null);
}

// ------------------------------------------------------------ la tintorería
// La de maese Rodrigo, tintorero: abajo, las tinas (el añil, la rubia, la
// gualda) y el horno del agua caliente; arriba, las piezas teñidas; en el
// desván, el secadero de los paños.
export function tintoreria(ctx, L, h) {
  const wb = ctx.wb;
  const [r0, r1, r2] = h.rooms;
  const I = h.I;
  const C = COLORES;
  // ---- los tintes
  wb.setRoom(r0);
  P.dyeVat(ctx, 36.4, 0, 36.6, C.anil, { room: r0, r: 0.85 });
  P.dyeVat(ctx, 38.8, 0, 36.7, C.rubia, { room: r0, r: 0.8 });
  P.dyeVat(ctx, 43.8, 0, 36.6, C.gualda, { room: r0, r: 0.8 });
  P.dyeVat(ctx, 36.3, 0, 33.6, C.anil.map((v) => v * 0.7), { room: r0, r: 0.75 });
  // el horno con la caldera de cobre (ascuas aún)
  calderaCera(ctx, 44.6, 0, 34.0, r0, { lit: true, radius: 5.5, intensity: 1.1 });
  // las varas de las madejas, de muro a muro, y los paños escurriendo
  madejas(ctx, 37.6, 32.8, 40.4, 32.8, 3.4, [C.anil, C.rubia, C.gualda, C.verde], r0, 2501);
  panos(ctx, 39.6, 35.2, 42.6, 35.2, 3.5, 2.1, [C.rubia, C.anil, C.gualda, C.morado], r0, { seed: 2502 });
  // la mesa de doblar, con un paño a medio doblar y las tijeras
  P.table(ctx, 41.6, 0, 37.4, 1.8, 0.8, 0);
  wb.box('clothWhite', 41.0, 0.8, 37.15, 42.1, 0.86, 37.65, { ao: false, room: r0, grime: false, tint: C.anil });
  // las campanillas del Físico: entre las tinas, por donde se pasa
  campanillas(ctx, 37.75, 34.15, 37.75, 38.05, 0.35, r0);
  (L.bells || (L.bells = [])).push({ id: 'b_tinte', a: [37.75, 34.15], b: [37.75, 38.05], y: 0, room: r0 });
  luna(ctx, 36.5, 1.8, 37.9, r0, 0.35);
  luna(ctx, 43.5, 1.8, 37.9, r0, 0.35);
  wb.setRoom(null);
  // ---- arriba: las piezas teñidas
  const y1 = 4.05;
  wb.setRoom(r1);
  rollos(ctx, 35.4, y1, 33.0, Math.PI / 2, 9, [C.anil, C.rubia, C.gualda, C.verde, C.morado], r1, 2503);
  rollos(ctx, 44.6, y1, 36.4, Math.PI / 2, 7, [C.anil, C.rubia, C.gualda], r1, 2504);
  P.table(ctx, 40.6, y1, 35.4, 2.2, 1.0, 0);
  wb.box('clothWhite', 39.8, y1 + 0.8, 35.0, 41.4, y1 + 0.83, 35.8, { ao: false, room: r1, grime: false, tint: C.rubia });
  P.shelf(ctx, 43.0, y1, 31.75, 0, 1.6);
  P.candles(ctx, 40.0, y1 + 0.8, 35.6, 2, 2505, { room: r1, radius: 4.5, intensity: 0.6, spread: 0.1 });
  luna(ctx, 36.0, y1 + 1.6, 37.9, r1, 0.4);
  luna(ctx, 44.0, y1 + 1.6, 37.9, r1, 0.4);
  wb.setRoom(null);
  // ---- el secadero de los paños, bajo el tejado
  const y2 = 7.25;
  wb.setRoom(r2);
  for (const [z, cs] of [
    [33.6, [C.anil, C.gualda]],
    [35.0, [C.rubia, C.morado]],
    [36.2, [C.anil, C.rubia]],
  ])
    panos(ctx, 35.6, z, 45.0, z, y2 + 2.25, 1.7, cs, r2, { seed: Math.round(z * 10) });
  luna(ctx, 34.9, y2 + 1.2, 34.1, r2, 0.9, 6.5);
  luna(ctx, 45.2, y2 + 1.2, 34.75, r2, 0.7, 5.5);
  luna(ctx, 40.0, y2 + 2.4, 34.75, r2, 0.45, 7);
  // el farol que dejó el tintorero colgado de la hilera
  P.hangingLamp(ctx, 39.0, 10.0 - 0.3, 34.75, { room: r2, len: 0.9, radius: 6.5, intensity: 0.9 });
  if (ctx.shafts) ctx.shafts.push({ a: [34.2, y2 + 1.6, 34.1], b: [36.0, y2 + 0.05, 34.1], w: 0.9, color: 0x9fb2d8 });
  wb.setRoom(null);
  L.interact.push({ kind: 'note', id: 'n_tintorero', note: 'tintorero', x: 40.95, y: y1 + 0.82, z: 35.15, model: 'paper' });
}
