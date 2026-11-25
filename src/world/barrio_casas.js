// Las casas grandes de la rúa de los Pellejeros, por dentro: la del
// zapatero, la de la cerera, la quemada de los Gomes y la tintorería de la
// plazuela. Las casas (muros, huecos, forjados, la escalera, tejados) las
// levanta level_barrio.js con el kit; aquí, lo que hay en ellas y lo que
// cuentan. (Salas de nueve metros: lo grande, contra los muros; el paso, de
// puerta a puerta y a la escalera, libre.)
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import * as P from './props.js';
import { chest, saint, bowl, herbBunch } from './level_souto.js';
import { bakeCorpse } from '../entities/models.js';
import { banqueta, horma, botas, cuero, calderaCera, varaVelas, estanteVelas, panesCera, panos, madejas, rollos, campanillas, palo } from './barrio_atrezo.js';

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
// el suelo de arriba de las casas grandes
const Y1 = 4.25;

// ------------------------------------------------------------ el zapatero
// Maese Afonso, zapatero de la Sé (las botas de los canónigos, los
// borceguíes del arzobispo). La noche de la campana su mujer se arrodilló, y
// la carne se la llevó en la cama de arriba; el físico ni la miró («ésa ya
// está curada»). Al hijo, que estaba sano, le tomó el pulso, le miró los ojos
// y dijo que era el caso más claro que había visto: se lo llevó «para
// curarlo» y se lo devolvió con la corona de hierro. El padre lo ató en su
// cuarto; luego, en la cocina, le sirvió la cena cada noche. Ahora el hijo
// sigue sentado a la mesa.
export function zapatero(ctx, L, h) {
  const wb = ctx.wb;
  const [r0, r1] = h.rooms;
  const rt = 'zap_tienda',
    ra = 'zap_alcoba';
  const I = h.I;
  // ---- el obrador (al oeste): la banqueta junto al escaparate, el mostrador,
  // las hormas, los cueros colgados, la mesa de cortar
  wb.setRoom(rt);
  banqueta(ctx, 17.4, 0, 39.2, Math.PI, rt);
  P.stool(ctx, 17.4, 0, 38.4, { room: rt });
  // la tabla del mostrador, bajo el escaparate (por dentro)
  wb.box('planks', 17.4, 0.85, 39.95, 19.6, 0.9, 40.4, { ao: false, room: rt, faces: 'tnsewb', tint: [0.8, 0.72, 0.62] });
  for (const x of [17.5, 19.5]) wb.box('wooddark', x - 0.03, 0, 40.0, x + 0.03, 0.85, 40.06, { ao: false, room: rt });
  botas(ctx, 17.9, 0.9, 40.2, 0.2, rt);
  botas(ctx, 18.6, 0.9, 40.2, -0.1, rt, { tall: false, tint: [0.55, 0.38, 0.26] });
  botas(ctx, 19.2, 0.9, 40.2, 0.3, rt, { tint: [0.3, 0.2, 0.16] });
  // los estantes de las hormas, contra el muro del oeste
  const rng = new RNG(2101);
  for (const zc of [33.6, 36.4]) {
    wb.at(I.x0 + 0.2, 0, zc, Math.PI / 2, () => {
      for (const sx of [-1.1, 1.05]) wb.box('wooddark', sx, 0, -0.18, sx + 0.05, 2.3, 0.18, { ao: false, room: rt });
      for (let i = 0; i < 4; i++) wb.box('wooddark', -1.05, 0.35 + i * 0.5, -0.17, 1.05, 0.38 + i * 0.5, 0.17, { ao: false, room: rt, faces: 'tnsewb' });
    });
    for (let i = 0; i < 4; i++)
      for (let k = 0; k < 7; k++) {
        if (rng.chance(0.22)) continue;
        horma(wb, I.x0 + 0.2, 0.38 + i * 0.5, zc - 0.95 + k * 0.29, rng.range(0.2, 0.27), rt, rng.chance(0.15), rng.range(-0.3, 0.3));
      }
    P.colOBB(ctx, I.x0 + 0.2, zc, 0.2, 1.1, 0, 0, 2.3);
  }
  // los cueros, colgados de dos varas entre las vigas, y las tiras
  for (const z of [33.0, 34.4]) {
    palo(wb, V(17.0, 3.5, z), V(23.4, 3.5, z), 0.025, 'wooddark', { room: rt, round: true });
    for (let k = 0; k < 4; k++) cuero(ctx, 17.8 + k * 1.5, 3.48, z, 0, 0.85, 1.25, rt, { seed: k + (z > 34 ? 5 : 1) });
  }
  // la mesa de cortar, con la suela a medio cortar, el libro de cuentas y el
  // candil
  P.table(ctx, 21.0, 0, 36.6, 1.8, 0.9, 0);
  wb.box('leather', 20.4, 0.8, 36.4, 21.2, 0.81, 36.8, { ao: false, room: rt, tint: [0.42, 0.3, 0.22] });
  wb.box('iron', 21.4, 0.8, 36.5, 21.65, 0.815, 36.56, { ao: false, room: rt });
  P.candles(ctx, 21.7, 0.8, 36.85, 1, 2102, { room: rt, radius: 5, intensity: 0.8, spread: 0.02, scale: 0.8 });
  P.basket(ctx, 22.9, 0, 32.2, { rot: 0.4 });
  P.barrel(ctx, 15.2, 0, 39.7, { lying: false });
  P.barrel(ctx, 23.0, 0, 39.8, { r: 0.3 });
  luna(ctx, 18.5, 1.8, 40.0, rt, 0.45, 5);
  luna(ctx, 16.6, 1.8, 31.9, rt, 0.3);
  // ---- el zaguán y la cocina (al este): el hogar, la mesa puesta y el hijo
  wb.setRoom(r0);
  P.hearth(ctx, I.x1 - 0.1, 0, 37.6, 'w', { room: r0, lit: true, w: 1.8, ceil: 4.0 });
  P.table(ctx, 31.0, 0, 37.4, 1.8, 0.9, Math.PI / 2);
  // (sin choque: en él se sienta el hijo. Con él, el cuerpo se le subía
  // encima, a medio metro, y sentado se quedaba en el aire, con los pies a la
  // altura del asiento)
  P.stool(ctx, 30.15, 0, 37.4, { room: r0, col: false });
  P.stool(ctx, 31.8, 0, 36.6, { room: r0, tipped: true });
  bowl(ctx, 30.85, 0.8, 37.4, 0.12, r0, ['water', [0.4, 0.1, 0.08]]);
  bowl(ctx, 31.25, 0.8, 38.0, 0.12, r0, ['water', [0.5, 0.42, 0.3]]);
  wb.box('wooddark', 30.95, 0.8, 36.8, 31.1, 0.83, 37.1, { ao: false, room: r0 });
  P.shelf(ctx, 26.0, 0, 40.2, Math.PI, 1.6);
  P.jar(ctx, 32.9, 0, 39.9, 1.0);
  P.jar(ctx, 32.3, 0, 40.05, 0.8);
  P.bench(ctx, 25.4, 0, 38.6, 1.6, Math.PI / 2);
  herbBunch(ctx, 30.4, 3.75, 34.6, 1, r0);
  herbBunch(ctx, 31.2, 3.75, 34.65, 2, r0);
  herbBunch(ctx, 32.0, 3.75, 34.6, 3, r0);
  P.lantern(ctx, 24.8, 2.5, 35.0, Math.PI / 2, true);
  ctx.lights.push({ x: 25.3, y: 2.3, z: 35.0, r: 1, g: 0.55, b: 0.22, radius: 5, intensity: 0.6, room: r0 });
  luna(ctx, 31.6, 1.8, 40.0, r0, 0.35);
  wb.setRoom(null);
  // ---- arriba: la alcoba del matrimonio (al oeste) y el cuarto del hijo
  wb.setRoom(ra);
  P.bed(ctx, 16.2, Y1, 35.0, 0);
  // (la sábana, negra de sangre: aquí la sangró)
  wb.box('flesh', 15.75, Y1 + 0.605, 34.5, 16.6, Y1 + 0.61, 35.6, { ao: false, room: ra, faces: 't', tint: [0.32, 0.08, 0.07], grime: false });
  bowl(ctx, 17.6, Y1, 33.2, 0.16, ra, ['water', [0.3, 0.06, 0.05]]);
  chest(ctx, 16.4, Y1, 39.8, Math.PI, ra, 1.0);
  chest(ctx, 22.8, Y1, 32.1, 0, ra, 1.1);
  saint(ctx, 'e', I.x0, Y1 + 1.6, 35.0, ra, 2103, 'clothRed');
  P.stool(ctx, 18.2, Y1, 36.2, { room: ra });
  P.candles(ctx, 17.6, Y1, 36.6, 3, 2105, { room: ra, radius: 4.5, intensity: 0.55 });
  luna(ctx, 17.0, Y1 + 1.6, 40.0, ra, 0.45);
  luna(ctx, 21.2, Y1 + 1.6, 40.0, ra, 0.35);
  // el cuarto del hijo: el jergón con las correas de su padre, el cubo
  wb.setRoom(r1);
  wb.box('burlap', 31.4, Y1, 37.6, 33.3, Y1 + 0.22, 39.6, { ao: false, room: r1, tint: [0.6, 0.52, 0.42] });
  for (const z of [38.0, 38.6, 39.2]) wb.box('leather', 31.35, Y1 + 0.18, z - 0.03, 33.35, Y1 + 0.25, z + 0.03, { ao: false, room: r1, tint: [0.32, 0.22, 0.16] });
  P.colOBB(ctx, 32.35, 38.6, 0.95, 1.0, 0, Y1, Y1 + 0.25);
  P.barrel(ctx, 25.0, Y1, 39.8);
  // (una espada de palo, del aprendiz que fue)
  palo(wb, V(27.6, Y1 + 0.02, 38.4), V(28.4, Y1 + 0.05, 38.9), 0.02, 'planks', { room: r1 });
  palo(wb, V(27.85, Y1 + 0.04, 38.75), V(28.05, Y1 + 0.04, 38.45), 0.02, 'planks', { room: r1 });
  P.candles(ctx, 26.0, Y1, 36.2, 3, 2104, { room: r1, radius: 4, intensity: 0.6 });
  luna(ctx, 26.8, Y1 + 1.6, 40.0, r1, 0.4);
  luna(ctx, 31.0, Y1 + 1.6, 40.0, r1, 0.4);
  wb.setRoom(null);
  L.interact.push({ kind: 'note', id: 'n_zapatero', note: 'zapatero', x: 20.7, y: 0.82, z: 36.65, model: 'paper' });
}

// ------------------------------------------------------------ la cerera
// Dona Inês, cerera, viuda. Hacía las velas de la Sé y de medio Braga.
// Cuando el físico vino a curarla (estaba sana), se encerró en su alcoba,
// atrancó la puerta y no volvió a abrir. Él reventó un tablero de la puerta a
// hachazos; no pudo con la tranca. Volvió muchas noches a hablarle por el
// agujero, a leerle. Ella sigue en la cama, con su vela encendida.
export function viuda(ctx, L, h) {
  const wb = ctx.wb;
  const [r0, r1] = h.rooms;
  const rt = 'viu_tienda',
    ra = 'viu_alcoba';
  const I = h.I;
  // ---- la tienda de las velas (al oeste: a la plaza y a la rúa)
  wb.setRoom(rt);
  P.counter(ctx, 19.6, 0, 50.6, 0, 3.2, { room: rt });
  estanteVelas(ctx, I.x0 + 0.2, 0, 54.6, Math.PI / 2, 2.4, rt);
  estanteVelas(ctx, 20.0, 0, I.z1 - 0.2, Math.PI, 2.4, rt);
  varaVelas(ctx, 16.2, 52.4, 22.8, 52.4, 3.3, rt, { seed: 1 });
  varaVelas(ctx, 16.2, 53.3, 22.8, 53.3, 3.3, rt, { seed: 2 });
  for (const x of [16.15, 22.85]) for (const z of [52.4, 53.3]) palo(wb, V(x, 3.3, z), V(x, 4.0, z), 0.012, 'iron', { room: rt });
  calderaCera(ctx, 22.8, 0, 56.4, rt, { lit: true, intensity: 0.9 });
  panesCera(ctx, 17.4, 0, 56.9, 5, rt, 2201);
  panesCera(ctx, 17.9, 0, 56.95, 3, rt, 2202);
  P.basket(ctx, 23.2, 0, 49.3, { rot: 0.3 });
  luna(ctx, 18.5, 1.7, 49.0, rt, 0.4, 5);
  luna(ctx, 15.0, 1.7, 51.0, rt, 0.3);
  // ---- el zaguán y la cocina (al este)
  wb.setRoom(r0);
  P.hearth(ctx, 24.7, 0, 49.6, 'e', { room: r0, lit: false, w: 1.5, ceil: 4.0 });
  P.table(ctx, 30.0, 0, 52.2, 1.8, 0.9, 0);
  P.stool(ctx, 30.0, 0, 53.0, { room: r0 });
  P.stool(ctx, 31.2, 0, 51.6, { room: r0, tipped: true });
  bowl(ctx, 29.7, 0.8, 52.1, 0.12, r0);
  P.jar(ctx, 33.0, 0, 55.4, 1.0);
  P.jar(ctx, 32.4, 0, 55.5, 0.8);
  P.shelf(ctx, 33.3, 0, 53.4, -Math.PI / 2, 1.4);
  herbBunch(ctx, 28.6, 3.75, 51.0, 3, r0);
  herbBunch(ctx, 29.4, 3.75, 51.05, 4, r0);
  P.lantern(ctx, 33.4, 2.5, 51.6, -Math.PI / 2, true);
  ctx.lights.push({ x: 32.9, y: 2.3, z: 51.6, r: 1, g: 0.55, b: 0.22, radius: 5, intensity: 0.55, room: r0 });
  luna(ctx, 31.6, 1.7, 49.0, r0, 0.35);
  wb.setRoom(null);
  // ---- arriba: la sala, con el oratorio en su rincón del este; las velas
  // que dejó encendidas
  wb.setRoom(r1);
  P.table(ctx, 26.4, Y1, 51.4, 1.6, 0.85, 0);
  P.stool(ctx, 26.4, Y1, 52.2, { room: r1 });
  P.spinningWheel(ctx, 23.0, Y1, 55.8, 0.4, { room: r1 });
  chest(ctx, 22.4, Y1, 49.3, 0, r1, 1.0);
  P.candles(ctx, 26.6, Y1 + 0.8, 51.6, 2, 2203, { room: r1, radius: 4.5, intensity: 0.6, spread: 0.1 });
  luna(ctx, 24.5, Y1 + 1.6, 49.0, r1, 0.55, 5);
  luna(ctx, 30.6, Y1 + 1.6, 49.0, r1, 0.4);
  // el oratorio: el altar de la cerera, de cera hasta el suelo, contra el
  // muro de la plazuela, y los exvotos que ella misma hacía, por las paredes
  P.candleAltar(ctx, 32.9, Y1, 53.2, -Math.PI / 2, r1);
  saint(ctx, 'w', I.x1, Y1 + 1.6, 53.2, r1, 2204, 'clothBlue');
  const rx = new RNG(2205);
  for (let i = 0; i < 22; i++) {
    // (en el muro del este, a los lados del altar, y en el del sur)
    const east = rx.chance(0.6);
    const yy = Y1 + rx.range(1.1, 2.6);
    const k = rx.int(0, 2);
    const [w, hh] = [
      [0.07, 0.3],
      [0.08, 0.36],
      [0.12, 0.13],
    ][k];
    if (east) {
      const zz = rx.chance(0.5) ? rx.range(51.0, 52.2) : rx.range(54.2, 55.4);
      wb.box('candle', I.x1 - 0.04, yy - hh / 2, zz - w, I.x1, yy + hh / 2, zz + w, { ao: false, grime: false, room: r1, tint: [0.95, 0.88, 0.7] });
    } else {
      const xx = rx.range(30.2, 33.0);
      wb.box('candle', xx - w, yy - hh / 2, I.z1 - 0.04, xx + w, yy + hh / 2, I.z1, { ao: false, grime: false, room: r1, tint: [0.95, 0.88, 0.7] });
    }
  }
  P.candles(ctx, 32.2, Y1, 54.8, 5, 2206, { room: r1, radius: 4.5, intensity: 0.75 });
  wb.setRoom(null);
  L.interact.push({ kind: 'altar', id: 'a_viuda', name: 'Oratorio de la cerera', x: 32.9, y: Y1, z: 53.2, spawn: [31.5, Y1, 53.2], yaw: Math.PI / 2 });
  // ---- la alcoba: la viuda en su cama (contra el muro de la plaza), la vela
  // en la mesilla de la cabecera y, bajo la ventana de sacada, el arcón con
  // la llave (de la ventana a la puerta queda el paso, junto al tabique)
  wb.setRoom(ra);
  P.bed(ctx, 15.6, Y1, 53.6, Math.PI / 2);
  bakeCorpse(wb, 15.6, Y1 + 0.55, 53.45, Math.PI, 'back', 'villager', 22);
  P.table(ctx, 15.4, Y1, 55.4, 0.5, 0.45, 0);
  P.candles(ctx, 15.4, Y1 + 0.8, 55.4, 1, 2207, { room: ra, radius: 4.5, intensity: 1.0, spread: 0.01 });
  chest(ctx, 16.1, Y1, 49.2, 0, ra, 0.9);
  saint(ctx, 'e', I.x0, Y1 + 1.5, 51.4, ra, 2208, 'clothWhite');
  P.stool(ctx, 18.6, Y1, 56.6, { room: ra });
  luna(ctx, 17.5, Y1 + 1.6, 49.0, ra, 0.45);
  wb.setRoom(null);
  // la puerta de la alcoba, en su tabique: atrancada por dentro, con un
  // tablero reventado (se ve la cama y la vela)
  L.interact.push({ kind: 'door', id: 'd_alcoba', x: 21.0, y: Y1, z: 54.6, w: 1.1, h: 2.3, axis: 'z', mat: 'planks', hinge: 1, swing: 1, plane: 20.9, inset: 0.05, mark: 'broken', lock: { type: 'barred', side: -1 }, barredMsg: 'alcobaTranca' });
  L.interact.push({ kind: 'item', id: 'i_llave_tinte', item: 'llave_tinte', x: 16.1, y: Y1 + 0.6, z: 49.2 });
  // la viga del balcón que se cayó: de la sacada de la sala a la de la alcoba
  cornisaBalcon(ctx, L);
}

// La viga del balcón de la sala (el balcón se vino abajo; la viga, no): por
// fuera de la fachada de la rúa, a ras del suelo de arriba, de una ventana
// de sacada a la otra. Se anda por ella haciendo equilibrio.
function cornisaBalcon(ctx, L) {
  const wb = ctx.wb;
  const y = Y1,
    z0 = 47.48,
    z1 = 48.0;
  const xa = 16.8,
    xb = 25.2;
  wb.box('timber', xa, y - 0.24, z0, xb, y, z1, { ao: false, sub: 3, tint: [0.62, 0.55, 0.48] });
  // los canes de lo que fue el balcón, partidos, y alguna tabla colgando
  const rng = new RNG(2301);
  for (let x = xa + 0.35; x < xb - 0.2; x += 0.9) {
    const len = rng.range(0.25, 0.6);
    wb.box('wooddark', x - 0.07, y - 0.4, z0 - len, x + 0.07, y - 0.24, z0, { ao: false });
  }
  for (const [x, a] of [
    [19.6, 0.9],
    [22.4, -1.1],
  ]) {
    wb.push();
    wb.translate(x, y - 0.3, z0 - 0.1);
    wb.rotateX(a);
    wb.box('planks', -0.12, -0.9, -0.02, 0.12, 0, 0.02, { ao: false, tint: [0.75, 0.68, 0.6] });
    wb.pop();
  }
  ctx.col.add(xa, y - 0.24, z0, xb, y, z1).cam = false;
  // (el equilibrio, entre una ventana y la otra; delante de ellas se anda
  // suelto: se entra y se sale por ellas. Pegada a la fachada: hacia ella no
  // se cae)
  (L.ledges || (L.ledges = [])).push({ id: 'viga_viuda', a: [18.2, y, 47.66], b: [23.8, y, 47.66], w: 0.36, wall: -1 });
}

// ------------------------------------------------------------ la quemada
// La casa de los Gomes: no le abrieron, y el físico les aplicó lo último que
// dice Hipócrates, el fuego. Abajo, lo que quedó; el piso de arriba se hundió
// sobre ellos; por el tejado abierto baja la luna.
export function quemada(ctx, L, h) {
  const wb = ctx.wb;
  const [r0] = h.rooms;
  wb.setRoom(r0);
  const SOOT = [0.22, 0.18, 0.16];
  // los muebles carbonizados: la mesa, los bancos, el arcón
  P.table(ctx, 37.0, 0, 55.6, 1.8, 0.85, 0.3);
  P.stool(ctx, 38.3, 0, 54.6, { room: r0, tipped: true });
  P.bench(ctx, 46.8, 0, 56.6, 1.6, 0.1);
  chest(ctx, 48.2, 0, 53.4, -Math.PI / 2, r0, 1.0);
  // la familia, abrazada en el rincón, y el que intentó salir por la puerta
  bakeCorpse(wb, 35.4, 0, 56.6, 1.2, 'curl', 'villager', 23, null, { tint: SOOT });
  bakeCorpse(wb, 36.2, 0, 57.0, 2.0, 'curl', 'villager', 24, null, { tint: SOOT });
  bakeCorpse(wb, 41.4, 0, 53.2, -0.3, 'face', 'villager', 25, null, { tint: SOOT });
  // lo que queda de la escalera: tres peldaños negros contra el muro de la
  // cerera, y nada encima
  for (let i = 0; i < 3; i++) wb.box('wooddark', 34.5, 0, 53.0 + i * 0.3, 35.6, 0.28 * (i + 1), 53.3 + i * 0.3, { ao: false, room: r0, tint: SOOT });
  ctx.col.add(34.5, 0, 53.0, 35.6, 0.84, 53.9);
  for (const [x, z, s] of [
    [37.2, 55.4, 2.6],
    [42.0, 55.0, 3.0],
    [46.6, 55.6, 2.2],
  ])
    P.decal(ctx, x, 0.02, z, s, 'shadow', null, { opacity: 0.75 });
  wb.setRoom(null);
  luna(ctx, 35.6, 1.8, 52.9, r0, 0.3);
  luna(ctx, 46.0, 1.8, 52.9, r0, 0.3);
}

// ------------------------------------------------------------ la tintorería
// La de maese Rodrigo, tintorero: abajo, las tinas (el añil, la rubia, la
// gualda) y el horno del agua caliente; arriba, las piezas teñidas; en el
// desván, el secadero de los paños, que sigue por el del zapatero.
export function tintoreria(ctx, L, h) {
  const wb = ctx.wb;
  const [r0, r1, r2] = h.rooms;
  const C = COLORES;
  // ---- los tintes
  wb.setRoom(r0);
  P.dyeVat(ctx, 36.4, 0, 38.6, C.anil, { room: r0, r: 0.85 });
  P.dyeVat(ctx, 38.3, 0, 38.9, C.rubia, { room: r0, r: 0.75 });
  P.dyeVat(ctx, 44.4, 0, 38.8, C.gualda, { room: r0, r: 0.8 });
  P.dyeVat(ctx, 36.4, 0, 35.6, C.anil.map((v) => v * 0.7), { room: r0, r: 0.75 });
  P.dyeVat(ctx, 44.5, 0, 36.6, C.verde, { room: r0, r: 0.7 });
  // el horno con la caldera de cobre (ascuas aún)
  calderaCera(ctx, 44.6, 0, 33.6, r0, { lit: true, radius: 6, intensity: 1.1 });
  // las varas de las madejas, de muro a muro, y los paños escurriendo
  madejas(ctx, 40.8, 34.4, 45.2, 34.4, 3.6, [C.anil, C.rubia, C.gualda, C.verde], r0, 2501);
  panos(ctx, 38.6, 36.4, 42.6, 36.4, 3.7, 2.1, [C.rubia, C.anil, C.gualda, C.morado], r0, { seed: 2502 });
  // la mesa de doblar, con un paño a medio doblar y las tijeras
  P.table(ctx, 42.2, 0, 38.8, 1.8, 0.8, 0);
  wb.box('clothWhite', 41.6, 0.8, 38.55, 42.7, 0.86, 39.05, { ao: false, room: r0, grime: false, tint: C.anil });
  // las campanillas del Físico: nada más entrar, de la tina de la rubia a la
  // pata de la mesa, por donde se pasa (o se rodea la mesa, o se corta)
  campanillas(ctx, 39.1, 39.3, 41.25, 39.3, 0.35, r0);
  (L.bells || (L.bells = [])).push({ id: 'b_tinte', a: [39.1, 39.3], b: [41.25, 39.3], y: 0, h: 0.35, room: r0 });
  luna(ctx, 36.5, 1.8, 40.0, r0, 0.4);
  luna(ctx, 43.5, 1.8, 40.0, r0, 0.4);
  wb.setRoom(null);
  // ---- arriba: las piezas teñidas
  wb.setRoom(r1);
  rollos(ctx, 35.0, Y1, 37.6, Math.PI / 2, 9, [C.anil, C.rubia, C.gualda, C.verde, C.morado], r1, 2503);
  rollos(ctx, 45.0, Y1, 37.0, Math.PI / 2, 7, [C.anil, C.rubia, C.gualda], r1, 2504);
  P.table(ctx, 41.0, Y1, 37.6, 2.4, 1.0, 0);
  wb.box('clothWhite', 40.2, Y1 + 0.8, 37.2, 41.8, Y1 + 0.83, 38.0, { ao: false, room: r1, grime: false, tint: C.rubia });
  P.shelf(ctx, 43.6, Y1, 31.75, 0, 1.6);
  P.candles(ctx, 40.4, Y1 + 0.8, 37.8, 2, 2505, { room: r1, radius: 4.5, intensity: 0.6, spread: 0.1 });
  luna(ctx, 36.5, Y1 + 1.6, 40.0, r1, 0.4);
  luna(ctx, 43.5, Y1 + 1.6, 40.0, r1, 0.4);
  wb.setRoom(null);
  // ---- el secadero de los paños, bajo el tejado (se pasa por el medio muro
  // del oeste al del zapatero)
  const y2 = 7.9;
  wb.setRoom(r2);
  for (const [z, cs] of [
    [37.4, [C.anil, C.gualda]],
    [38.8, [C.rubia, C.morado]],
  ])
    panos(ctx, 36.8, z, 45.0, z, y2 + 2.2, 1.7, cs, r2, { seed: Math.round(z * 10) });
  panos(ctx, 41.6, 34.6, 45.0, 34.6, y2 + 2.2, 1.6, [C.anil, C.rubia], r2, { seed: 3460 });
  luna(ctx, 40.0, y2 + 1.0, 40.2, r2, 0.9, 6.5);
  luna(ctx, 36.0, y2 + 1.6, 36.0, r2, 0.45, 6);
  // el farol que dejó el tintorero colgado de la hilera
  P.hangingLamp(ctx, 39.6, 12.15 - 0.35, 36.0, { room: r2, len: 1.2, radius: 7, intensity: 0.9 });
  if (ctx.shafts) ctx.shafts.push({ a: [40.0, y2 + 1.5, 40.6], b: [40.0, y2 + 0.05, 39.4], w: 0.9, color: 0x9fb2d8 });
  wb.setRoom(null);
  L.interact.push({ kind: 'note', id: 'n_tintorero', note: 'tintorero', x: 41.35, y: Y1 + 0.82, z: 37.35, model: 'paper' });
}
