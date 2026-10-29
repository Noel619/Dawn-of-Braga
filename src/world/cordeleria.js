// La cordelería de los Pellejeros (level_barrio.js: cordeleria): la salida
// del barrio, detrás de la barricada de los Pelames.
//
// Se entra por detrás, por el almacén del cáñamo (con la llave que el Físico
// llevaba al cinto): las balas de cáñamo hasta el techo, los rastrillos de
// peinarlo. Un tabique parte la planta baja: al otro lado está la tienda, y
// se llega a ella por arriba, por el obrador de las sogas, una nave
// larguísima con las sogas a medio torcer tendidas de punta a punta (el
// torno de los ganchos a un lado, el carro del otro, las estacas en medio),
// los tornos de hilar y los rollos de soga hecha. Abajo, la tienda: el
// mostrador, las baldas de las sogas, la puerta de la calle, atrancada por
// dentro (a los Pelames) y la del tabique, que se abre desde la tienda (el
// atajo de vuelta al almacén).
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';
import { V } from './kit_casa.js';
import { palo } from './barrio_atrezo.js';

const M4 = () => new THREE.Matrix4();
const Q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
const luz = (ctx, x, y, z, room, i = 0.6, r = 5, c = [1, 0.58, 0.26]) => ctx.lights.push({ x, y, z, r: c[0], g: c[1], b: c[2], radius: r, intensity: i, room });
const luna = (ctx, x, y, z, room, i = 0.4, r = 4.5) => luz(ctx, x, y, z, room, i, r, [0.5, 0.6, 0.85]);
// el cáñamo: rubio, gris, crudo
const CANAMO = [
  [0.86, 0.76, 0.56],
  [0.74, 0.68, 0.56],
  [0.8, 0.7, 0.5],
];

// Una bala de cáñamo prensado, atada con dos cuerdas (con su colisión).
function bala(ctx, x, y, z, rot, room, rng, o = {}) {
  const wb = ctx.wb;
  const w = o.w ?? 1.1,
    d = o.d ?? 0.7,
    h = o.h ?? 0.75;
  const t = rng.pick(CANAMO);
  wb.at(x, y, z, rot, () => {
    wb.box('straw', -w / 2, 0, -d / 2, w / 2, h, d / 2, { faces: 'tnsew', room, tint: t, aoH: 0.4 });
    for (const u of [-w * 0.28, w * 0.28]) wb.box('burlap', u - 0.025, -0.002, -d / 2 - 0.01, u + 0.025, h + 0.01, d / 2 + 0.01, { ao: false, room, tint: [0.6, 0.5, 0.36], faces: 'tnsew' });
  });
  if (o.col !== false) P.colOBB(ctx, x, z, w / 2, d / 2, rot, y, y + h);
}

// Un rollo de soga hecha, en el suelo (o en una balda): vueltas de soga una
// encima de otra.
function rollo(ctx, x, y, z, r, room, rng, n = 5) {
  const wb = ctx.wb;
  const t = rng.pick(CANAMO).map((v) => v * 0.85);
  for (let i = 0; i < n; i++) wb.geometry('burlap', new THREE.TorusGeometry(r - i * 0.012, 0.028, 4, 12), M4().compose(V(x, y + 0.028 + i * 0.05, z), Q(Math.PI / 2, 0, rng.range(0, 3)), V(1, 1, 1)), { ao: false, room, tint: t });
}

// El rastrillo de peinar el cáñamo: una tabla con un erizo de púas de hierro,
// en su banco.
function rastrillo(ctx, x, y, z, rot, room) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -0.6, 0.7, -0.22, 0.6, 0.78, 0.22, { ao: false, room, faces: 'tnsewb' });
    for (const sx of [-0.5, 0.5]) for (const sz of [-0.16, 0.16]) wb.box('wooddark', sx - 0.04, 0, sz - 0.04, sx + 0.04, 0.7, sz + 0.04, { ao: false, room });
    wb.box('planks', -0.22, 0.78, -0.14, 0.22, 0.83, 0.14, { ao: false, room, faces: 'tnsewb' });
    for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++) wb.box('iron', -0.18 + i * 0.06 - 0.006, 0.83, -0.1 + j * 0.05 - 0.006, -0.18 + i * 0.06 + 0.006, 0.97, -0.1 + j * 0.05 + 0.006, { ao: false, room });
    // un manojo a medio peinar, colgando de las púas
    wb.box('straw', -0.25, 0.86, 0.1, 0.3, 0.92, 0.2, { ao: false, room, tint: CANAMO[0] });
    wb.box('straw', 0.24, 0.5, 0.15, 0.32, 0.9, 0.21, { ao: false, room, tint: CANAMO[0] });
  });
  P.colOBB(ctx, x, z, 0.62, 0.24, rot, y, y + 0.83);
}

// El torno de los ganchos (en un extremo de la nave): el bastidor, la rueda
// grande con su manivela y, delante, los ganchos en los que se prenden las
// sogas (en x0..x1, a la altura y).
function tornoGanchos(ctx, x, y, z, room, ganchos) {
  const wb = ctx.wb;
  wb.box('wooddark', x - 1.0, y, z - 0.12, x - 0.88, y + 1.6, z + 0.12, { ao: false, room });
  wb.box('wooddark', x + 0.88, y, z - 0.12, x + 1.0, y + 1.6, z + 0.12, { ao: false, room });
  wb.box('wooddark', x - 1.0, y + 1.45, z - 0.12, x + 1.0, y + 1.6, z + 0.12, { ao: false, room, faces: 'tnsewb' });
  wb.box('wooddark', x - 1.0, y + 0.85, z - 0.1, x + 1.0, y + 0.95, z + 0.1, { ao: false, room, faces: 'tnsewb' });
  // la rueda (en el plano x-y, detrás del bastidor) y su manivela
  wb.push();
  wb.translate(x, y + 1.2, z + 0.32);
  for (let k = 0; k < 6; k++) {
    wb.push();
    wb.rotateZ((k * Math.PI) / 6);
    wb.box('wooddark', -0.55, -0.025, -0.025, 0.55, 0.025, 0.025, { ao: false, room });
    wb.pop();
  }
  wb.pop();
  wb.geometry('wooddark', new THREE.TorusGeometry(0.55, 0.035, 4, 16), M4().makeTranslation(x, y + 1.2, z + 0.32), { ao: false, room });
  palo(wb, V(x + 0.45, y + 1.5, z + 0.32), V(x + 0.45, y + 1.5, z + 0.55), 0.02, 'wooddark', { room, round: true });
  // los ganchos
  for (const gx of ganchos) {
    palo(wb, V(gx, y + 0.95, z - 0.1), V(gx, y + 0.95, z - 0.3), 0.012, 'iron', { room, round: true });
    palo(wb, V(gx, y + 0.95, z - 0.3), V(gx, y + 1.05, z - 0.32), 0.01, 'iron', { room, round: true });
  }
  P.colOBB(ctx, x, z, 1.0, 0.2, 0, y, y + 1.6);
}

// Una estaca de la nave: el poste con la cruceta de clavijas en la que
// descansan las sogas tendidas.
function estaca(ctx, x, y, z, room, w) {
  const wb = ctx.wb;
  wb.box('wooddark', x - 0.05, y, z - 0.05, x + 0.05, y + 1.05, z + 0.05, { ao: false, room });
  wb.box('wooddark', x - w / 2, y + 1.0, z - 0.04, x + w / 2, y + 1.06, z + 0.04, { ao: false, room, faces: 'tnsewb' });
  for (let i = 0; i <= 4; i++) {
    const px = x - w / 2 + 0.08 + (i * (w - 0.16)) / 4;
    wb.box('wooddark', px - 0.012, y + 1.06, z - 0.012, px + 0.012, y + 1.16, z + 0.012, { ao: false, room });
  }
  P.colOBB(ctx, x, z, 0.06, 0.06, 0, y, y + 1.05);
}

export function cordeleriaDentro(ctx, L, hCor, hCor2) {
  const wb = ctx.wb;
  const rng = new RNG(4101);
  const [r0, r1] = hCor.rooms;
  const [ra] = hCor2.rooms;
  const y1 = 4.05;

  // ---------------------------------------------------------- el almacén del cáñamo
  // (detrás: el anejo del callejón, por cuya puerta se entra)
  wb.setRoom(ra);
  // las balas, contra los muros: hasta el techo en el fondo
  for (let i = 0; i < 4; i++) {
    for (let k = 0; k < 3; k++) bala(ctx, 39.6 + i * 1.15, k * 0.75, 30.0, 0, ra, rng, { col: k === 0 });
  }
  ctx.col.add(39.0, 0, 29.6, 43.75, 2.25, 30.4);
  for (let k = 0; k < 2; k++) bala(ctx, 39.5, k * 0.75, 27.8, Math.PI / 2, ra, rng, { col: k === 0 });
  for (let k = 0; k < 2; k++) bala(ctx, 39.5, k * 0.75, 26.6, Math.PI / 2, ra, rng, { col: k === 0 });
  ctx.col.add(39.1, 0, 25.9, 39.9, 1.5, 28.5);
  bala(ctx, 43.6, 0, 24.0, 0.3, ra, rng);
  bala(ctx, 44.6, 0, 28.6, 1.4, ra, rng);
  rastrillo(ctx, 42.2, 0, 26.6, 0, ra);
  P.sacks(ctx, 44.9, 0, 23.4, 3, 4102);
  // (un manojo de cáñamo por el suelo, del que se cayó al peinarlo)
  for (let i = 0; i < 8; i++) wb.box('straw', 41.4 + rng.range(-0.6, 0.6), 0.01, 26.0 + rng.range(-0.4, 0.4), 41.6 + rng.range(-0.6, 0.6), 0.03, 26.2 + rng.range(-0.4, 0.4), { ao: false, room: ra, tint: CANAMO[0] });
  luna(ctx, 45.4, 2.0, 27.0, ra, 0.3);
  P.lantern(ctx, 41.5, 2.4, 22.55, Math.PI, true);
  luz(ctx, 41.5, 2.0, 23.0, ra, 0.6, 5);
  wb.setRoom(null);

  // ---------------------------------------------------------- abajo: el almacén y la tienda
  wb.setRoom(r0);
  // (el almacén: del tabique al muro del anejo; la escalera, al fondo)
  for (let k = 0; k < 3; k++) bala(ctx, 39.6, k * 0.75, 20.7, Math.PI / 2, r0, rng, { col: k === 0 });
  ctx.col.add(39.2, 0, 20.1, 40.0, 2.25, 21.3);
  for (let k = 0; k < 2; k++) bala(ctx, 39.6, k * 0.75, 18.4, Math.PI / 2, r0, rng, { col: k === 0 });
  ctx.col.add(39.2, 0, 17.8, 40.0, 1.5, 19.0);
  bala(ctx, 40.0, 0, 14.2, 0.2, r0, rng);
  bala(ctx, 39.7, 0, 15.6, 1.5, r0, rng);
  rollo(ctx, 43.05, 0, 13.9, 0.4, r0, rng, 6);
  rollo(ctx, 43.1, 0, 15.0, 0.34, r0, rng, 4);
  luz(ctx, 41.2, 2.6, 16.5, r0, 0.5, 6);
  // (la tienda: el mostrador, a lo largo del muro del este, y detrás las
  // baldas de las sogas; el paso, de la escalera a la puerta de la calle y
  // a la del tabique, libre)
  P.counter(ctx, 42.25, 0, 8.4, Math.PI / 2, 2.0, { room: r0 });
  P.shelf(ctx, 43.25, 0, 5.4, -Math.PI / 2, 2.0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) rollo(ctx, 43.25, 0.34 + i * 0.5, 4.75 + j * 0.65, 0.17, r0, rng, 3);
  rollo(ctx, 42.9, 0, 10.6, 0.4, r0, rng, 7);
  rollo(ctx, 43.0, 0, 11.6, 0.32, r0, rng, 5);
  // (en el mostrador: la vara de medir, una soga a medio vender)
  wb.box('wooddark', 42.28, 1.08, 7.6, 42.32, 1.1, 9.2, { ao: false, room: r0 });
  palo(wb, V(42.12, 1.11, 7.8), V(42.18, 1.11, 9.3), 0.022, 'burlap', { room: r0, round: true, tint: CANAMO[1] });
  P.lantern(ctx, 41.4, 2.5, 3.45, 0, true);
  luz(ctx, 41.4, 2.0, 4.2, r0, 0.65, 6);
  luna(ctx, 42.7, 1.6, 3.6, r0, 0.3);
  wb.setRoom(null);

  // ---------------------------------------------------------- arriba: el obrador de las sogas
  wb.setRoom(r1);
  // las sogas tendidas, del torno de los ganchos (al norte) al carro (al
  // sur), a la altura de la cintura, por encima de las estacas (parten la
  // nave en dos pasillos: no se atraviesan)
  const ganchos = [40.6, 41.0, 41.4, 41.8];
  ctx.col.add(40.5, y1, 12.7, 41.9, y1 + 1.15, 20.0);
  tornoGanchos(ctx, 41.2, y1, 12.5, r1, ganchos);
  // el carro: un bastidor sobre ruedas con su gancho, que se va acercando al
  // torno según se tuercen las sogas
  wb.box('wooddark', 40.5, y1 + 0.3, 20.0, 41.9, y1 + 0.42, 20.6, { ao: false, room: r1, faces: 'tnsewb' });
  wb.box('wooddark', 41.1, y1 + 0.42, 20.0, 41.3, y1 + 1.1, 20.15, { ao: false, room: r1 });
  for (const [sx, sz] of [
    [40.55, 20.05],
    [41.85, 20.05],
    [40.55, 20.55],
    [41.85, 20.55],
  ])
    wb.cylinder('wooddark', sx, y1, sz, 0.14, 0.14, 0.05, 8, { ao: false, room: r1 });
  P.colOBB(ctx, 41.2, 20.3, 0.72, 0.32, 0, y1, y1 + 1.1);
  // (las sogas: con su comba entre estaca y estaca; la de en medio, a medio
  // torcer, deshilachada)
  const estacas = [14.8, 17.4];
  for (const z of estacas) estaca(ctx, 41.2, y1, z, r1, 1.6);
  ganchos.forEach((gx, i) => {
    const pts = [V(gx, y1 + 1.03, 12.2), ...estacas.map((z) => V(gx, y1 + 1.12, z)), V(41.2, y1 + 1.0, 20.0)];
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k],
        b = pts[k + 1];
      const m = a.clone().add(b).multiplyScalar(0.5);
      m.y -= 0.06;
      palo(wb, a, m, 0.016, 'burlap', { room: r1, round: true, tint: i === 2 ? CANAMO[0] : CANAMO[1] });
      palo(wb, m, b, 0.016, 'burlap', { room: r1, round: true, tint: i === 2 ? CANAMO[0] : CANAMO[1] });
    }
  });
  // los tornos de hilar, en la punta del norte (por encima de la tienda; al
  // oeste, el hueco de su escalera)
  for (const [x, z, r] of [
    [41.0, 5.6, 0],
    [42.7, 7.6, Math.PI / 2],
    [41.0, 9.6, 0.3],
  ]) {
    P.spinningWheel(ctx, x, y1, z, r, { room: r1 });
    P.colOBB(ctx, x, z, 0.45, 0.2, r, y1, y1 + 1.0);
  }
  // los manojos de cáñamo colgados de las vigas, a secar
  for (let i = 0; i < 7; i++) {
    const z = 4.5 + i * 1.6,
      x = 43.35 + rng.range(-0.05, 0.05);
    palo(wb, V(x, y1 + 2.9, z), V(x, y1 + 2.4, z), 0.006, 'burlap', { room: r1, round: true });
    wb.box('straw', x - 0.08, y1 + 1.6, z - 0.08, x + 0.08, y1 + 2.4, z + 0.08, { ao: false, room: r1, tint: rng.pick(CANAMO) });
  }
  rollo(ctx, 39.5, y1, 21.0, 0.45, r1, rng, 8);
  rollo(ctx, 39.6, y1, 19.8, 0.38, r1, rng, 6);
  bala(ctx, 39.6, y1, 3.9, 0, r1, rng);
  // el cordelero, sentado contra el muro, en la punta del norte, entre sus
  // tornos
  bakeCorpse(wb, 43.15, y1, 10.3, -Math.PI / 2, 'sit', 'villager', 4103);
  luna(ctx, 39.2, y1 + 1.6, 6.5, r1, 0.45);
  luna(ctx, 39.2, y1 + 1.6, 11.0, r1, 0.45);
  luna(ctx, 39.2, y1 + 1.6, 15.5, r1, 0.4);
  luz(ctx, 41.2, y1 + 2.0, 18.0, r1, 0.45, 6);
  wb.setRoom(null);

  // la nota del cordelero (en el mostrador de la tienda)
  L.interact.push({ kind: 'note', id: 'n_cordelero', note: 'cordelero', x: 42.25, y: 1.12, z: 8.6, model: 'paper' });
}
