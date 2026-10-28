// La casa del Barbero, por dentro, su patio y el callejón de la capilla.
//
// Maese Gonzalo Pires, barbero y sangrador. Abajo, la tienda (el sillón, las
// bacías, las navajas, las sanguijuelas) y, detrás, todo lo ancho de la casa,
// el quirófano: la mesa con sus correas bajo la lámpara, el brasero de los
// cauterios, los hierros. Arriba, su alcoba (la de la ventana de la cortina,
// en el eje de la calleja: desde su silla ve a quien entra en el barrio), el
// cuarto de los frascos y el de los pacientes. En el desván, lo que les quitó
// a todos (la ropa, los zapatos) y las coronas a medio hacer.
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import * as P from './props.js';
import { chest, saint, bowl } from './level_souto.js';
import { bakeCorpse } from '../entities/models.js';
import { tapia, V } from './kit_casa.js';
import { camastro, bacia, botas, palo, cruzCal } from './barrio_atrezo.js';

const luna = (ctx, x, y, z, room, i = 0.45, r = 4) => ctx.lights.push({ x, y, z, r: 0.5, g: 0.6, b: 0.85, radius: r, intensity: i, room });
const M4 = () => new THREE.Matrix4();

// ------------------------------------------------------------ piezas
// El sillón del barbero: de nogal, con brazos y el reposacabezas alto, de
// cuero; rot: hacia dónde mira el que se sienta.
function sillon(ctx, x, y, z, rot, room) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -0.34, 0.42, -0.3, 0.34, 0.52, 0.32, { ao: false, room, faces: 'tnsewb' });
    wb.box('leather', -0.3, 0.52, -0.26, 0.3, 0.58, 0.28, { ao: false, room, tint: [0.4, 0.22, 0.16] });
    for (const [sx, sz] of [
      [-0.3, -0.26],
      [0.3, -0.26],
      [-0.3, 0.28],
      [0.3, 0.28],
    ])
      wb.box('wooddark', sx - 0.04, 0, sz - 0.04, sx + 0.04, 0.42, sz + 0.04, { ao: false, room });
    // el respaldo, inclinado, y el reposacabezas
    wb.push();
    wb.translate(0, 0.52, -0.3);
    wb.rotateX(-0.22);
    wb.box('wooddark', -0.34, 0, -0.05, 0.34, 0.95, 0.03, { ao: false, room });
    wb.box('leather', -0.28, 0.1, 0.03, 0.28, 0.8, 0.07, { ao: false, room, tint: [0.4, 0.22, 0.16] });
    wb.box('wooddark', -0.06, 0.95, -0.04, 0.06, 1.25, 0.02, { ao: false, room });
    wb.box('leather', -0.16, 1.12, 0.0, 0.16, 1.32, 0.08, { ao: false, room, tint: [0.4, 0.22, 0.16] });
    wb.pop();
    // los brazos, con sus correas (también aquí ataba)
    for (const sx of [-0.36, 0.36]) {
      wb.box('wooddark', sx - 0.04, 0.52, -0.28, sx + 0.04, 0.82, -0.2, { ao: false, room });
      wb.box('wooddark', sx - 0.05, 0.82, -0.3, sx + 0.05, 0.86, 0.3, { ao: false, room, faces: 'tnsewb' });
      wb.box('leather', sx - 0.06, 0.8, 0.05, sx + 0.06, 0.88, 0.12, { ao: false, room, tint: [0.3, 0.2, 0.14] });
    }
  });
  P.colOBB(ctx, x, z, 0.42, 0.4, rot, y, y + 1.0);
}

// El palanganero: el pie de tres patas con la bacía y el jarro.
function palanganero(ctx, x, y, z, room) {
  const wb = ctx.wb;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    palo(wb, V(x + Math.cos(a) * 0.22, y, z + Math.sin(a) * 0.22), V(x + Math.cos(a) * 0.15, y + 0.85, z + Math.sin(a) * 0.15), 0.02, 'wooddark', { room });
  }
  wb.cylinder('wooddark', x, y + 0.82, z, 0.2, 0.2, 0.04, 8, { ao: false, room });
  bacia(wb, x, y + 0.86, z, 0.4, 0.75, room);
  wb.cylinder('water', x, y + 0.9, z, 0.13, 0.13, 0.01, 10, { ao: false, room, capTop: true, grime: false, tint: [0.45, 0.12, 0.1] });
  P.colOBB(ctx, x, z, 0.28, 0.28, 0, y, y + 1.0);
}

// La tabla de las navajas y lancetas, colgada en la pared (plano local: x a lo
// largo de la pared, z hacia la sala).
function tablaHierros(ctx, x, y, z, rot, room, seed) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -0.7, 0, 0, 0.7, 0.55, 0.04, { ao: false, room });
    for (let i = 0; i < 9; i++) {
      const u = -0.6 + i * 0.15;
      const k = rng.int(0, 2);
      const len = [0.22, 0.3, 0.38][k];
      wb.box('iron', u - 0.012, 0.42 - len, 0.04, u + 0.012, 0.42, 0.055, { ao: false, room });
      wb.box(k === 2 ? 'bone' : 'wooddark', u - 0.02, 0.42, 0.04, u + 0.02, 0.5, 0.06, { ao: false, room });
    }
    // el asentador de cuero
    wb.box('leather', 0.72, -0.4, 0.02, 0.8, 0.5, 0.04, { ao: false, room, tint: [0.35, 0.22, 0.15] });
  });
}

// Un frasco de vidrio (con sanguijuelas, con algo flotando o con sangre).
function frasco(wb, x, y, z, s, kind, room) {
  const pts = [
    [0.001, 0],
    [0.09, 0],
    [0.1, 0.05],
    [0.1, 0.22],
    [0.07, 0.27],
    [0.05, 0.29],
    [0.055, 0.32],
  ].map(([r, h]) => new THREE.Vector2(r * s, h * s));
  wb.geometry('glass', new THREE.LatheGeometry(pts, 8), M4().makeTranslation(x, y, z), { ao: false, room, grime: false, tint: [0.7, 0.8, 0.7] });
  const fill = kind === 'sangre' ? [0.35, 0.05, 0.04] : kind === 'carne' ? [0.55, 0.45, 0.32] : [0.25, 0.28, 0.2];
  wb.cylinder('water', x, y + 0.01, z, 0.088 * s, 0.088 * s, 0.19 * s, 8, { ao: false, room, capTop: true, grime: false, tint: fill });
  if (kind === 'carne') wb.geometry('flesh', new THREE.DodecahedronGeometry(0.05 * s, 0), M4().makeTranslation(x, y + 0.1 * s, z), { ao: false, room });
  if (kind === 'sanguijuelas') for (let i = 0; i < 3; i++) wb.box('black', x - 0.04 * s + i * 0.03 * s, y + 0.04 * s, z - 0.01, x - 0.02 * s + i * 0.03 * s, y + 0.15 * s, z + 0.01, { ao: false, room });
  wb.cylinder('wooddark', x, y + 0.3 * s, z, 0.05 * s, 0.05 * s, 0.04 * s, 6, { ao: false, room });
}

// Una estantería de frascos (rot: de cara a +z local).
function estanteFrascos(ctx, x, y, z, rot, w, room, seed) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  wb.at(x, y, z, rot, () => {
    for (const sx of [-w / 2, w / 2 - 0.05]) wb.box('wooddark', sx, 0, -0.17, sx + 0.05, 2.0, 0.17, { ao: false, room });
    for (let i = 0; i < 4; i++) {
      const yy = 0.3 + i * 0.45;
      wb.box('wooddark', -w / 2 + 0.05, yy, -0.16, w / 2 - 0.05, yy + 0.03, 0.16, { ao: false, room, faces: 'tnsewb' });
      for (let u = -w / 2 + 0.16; u < w / 2 - 0.12; u += rng.range(0.16, 0.24)) {
        if (rng.chance(0.15)) continue;
        frasco(wb, u, yy + 0.03, rng.range(-0.05, 0.05), rng.range(0.8, 1.3), rng.pick(['sangre', 'carne', 'sanguijuelas', 'sanguijuelas']), room);
      }
    }
  });
  P.colOBB(ctx, x, z, w / 2, 0.18, rot, y, y + 2.0);
}

// Un dibujo de anatomía clavado en la pared (el papel y lo que se adivina:
// un cuerpo abierto en canal, de carbón).
function lamina(ctx, x, y, z, rot, room, seed) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  wb.at(x, y, z, rot, () => {
    wb.box('linen', -0.3, -0.42, 0, 0.3, 0.42, 0.006, { ao: false, room, grime: false, faces: 's', tint: [0.86, 0.8, 0.66] });
    // la silueta y las líneas
    wb.box('black', -0.05, -0.3, 0.007, 0.05, 0.2, 0.008, { ao: false, room, grime: false, faces: 's', tint: [0.4, 0.38, 0.36] });
    wb.box('black', -0.04, 0.2, 0.007, 0.04, 0.3, 0.008, { ao: false, room, grime: false, faces: 's', tint: [0.4, 0.38, 0.36] });
    for (let i = 0; i < 5; i++) {
      const yy = rng.range(-0.3, 0.25);
      wb.box('black', rng.range(0.06, 0.12), yy, 0.007, rng.range(0.15, 0.26), yy + 0.006, 0.008, { ao: false, room, grime: false, faces: 's', tint: [0.4, 0.38, 0.36] });
    }
    wb.box('flesh', -0.03, -0.12, 0.007, 0.03, 0.08, 0.009, { ao: false, room, grime: false, faces: 's', tint: [0.5, 0.18, 0.15] });
    wb.box('iron', -0.012, 0.38, 0.006, 0.012, 0.41, 0.02, { ao: false, room });
  });
}

// Una corona de hierro de las de los Coronados: el aro, las varillas, sus
// cascabeles; colgada de un clavo, o puesta en un banco (rot).
export function corona(wb, x, y, z, s, room, o = {}) {
  wb.push();
  wb.translate(x, y, z);
  if (o.tilt) wb.rotateZ(o.tilt);
  wb.geometry('iron', new THREE.TorusGeometry(0.11 * s, 0.012 * s, 4, 12), M4().makeRotationX(Math.PI / 2), { ao: false, room });
  const n = o.rods ?? 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const p = V(Math.cos(a) * 0.11 * s, 0, Math.sin(a) * 0.11 * s);
    const q = V(Math.cos(a) * 0.17 * s, 0.22 * s, Math.sin(a) * 0.17 * s);
    palo(wb, p, q, 0.008 * s, 'iron', { room });
    wb.geometry('bronze', new THREE.SphereGeometry(0.022 * s, 6, 4), M4().makeTranslation(q.x, q.y - 0.03 * s, q.z), { ao: false, room });
  }
  wb.pop();
}

// La camilla del Barbero: las varas, la lona manchada, las correas, las dos
// ruedas de atrás (la lleva él solo, tirando de las varas).
export function camilla(ctx, x, y, z, rot, room) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    for (const sz of [-0.35, 0.35]) palo(wb, V(-1.25, 0.55, sz), V(1.35, 0.55, sz), 0.035, 'wooddark', { room, round: true });
    wb.box('burlap', -0.95, 0.5, -0.33, 0.95, 0.56, 0.33, { ao: false, room, tint: [0.55, 0.45, 0.36] });
    wb.box('flesh', -0.4, 0.561, -0.2, 0.3, 0.565, 0.15, { ao: false, room, faces: 't', tint: [0.4, 0.1, 0.08], grime: false });
    for (const sx of [-0.6, 0.0, 0.6]) wb.box('leather', sx - 0.04, 0.45, -0.37, sx + 0.04, 0.6, 0.37, { ao: false, room, tint: [0.3, 0.2, 0.14] });
    for (const sz of [-0.42, 0.42]) {
      wb.push();
      wb.translate(-0.8, 0.3, sz);
      wb.rotateX(Math.PI / 2);
      wb.cylinder('wooddark', 0, -0.03, 0, 0.3, 0.3, 0.06, 10, { ao: false, room, capTop: true, capBot: true });
      wb.pop();
    }
    palo(wb, V(-0.8, 0.3, -0.42), V(-0.8, 0.3, 0.42), 0.02, 'iron', { room, round: true });
    // las patas de delante
    for (const sz of [-0.35, 0.35]) palo(wb, V(0.9, 0.55, sz), V(0.95, 0, sz), 0.03, 'wooddark', { room });
  });
  P.colOBB(ctx, x, z, 1.3, 0.45, rot, y, y + 0.6);
}

// ------------------------------------------------------------ la casa
export function barberia(ctx, L, h) {
  const wb = ctx.wb;
  const I = h.I;
  const y1 = 4.05,
    y2 = 7.25;
  // ---- la tienda
  let r = 'bar_tienda';
  wb.setRoom(r);
  sillon(ctx, 52.4, 0, 45.2, -Math.PI / 2, r);
  palanganero(ctx, 51.2, 0, 46.4, r);
  tablaHierros(ctx, 55.25, 1.3, 44.3, -Math.PI / 2, r, 2601);
  estanteFrascos(ctx, 52.6, 0, 41.2, 0, 1.8, r, 2602);
  P.bench(ctx, 52.8, 0, 48.25, 2.0, 0);
  bowl(ctx, 54.4, 0.85, 47.6, 0.14, r, ['water', [0.35, 0.06, 0.05]]);
  P.table(ctx, 54.4, 0, 47.4, 0.9, 0.6, 0);
  bacia(wb, 54.2, 0.8, 47.3, 0, 0.8, r);
  P.candles(ctx, 54.6, 0.8, 47.45, 1, 2603, { room: r, radius: 4.2, intensity: 0.55, spread: 0.01 });
  luna(ctx, 50.4, 1.6, 42.0, r, 0.25);
  wb.setRoom(null);
  // ---- el zaguán
  r = 'bar0';
  wb.setRoom(r);
  P.bench(ctx, 57.6, 0, 48.2, 1.6, 0);
  P.lantern(ctx, 58.0, 2.4, 41.05, 0, true);
  ctx.lights.push({ x: 58.0, y: 2.2, z: 41.6, r: 1, g: 0.55, b: 0.22, radius: 4.5, intensity: 0.7, room: r });
  wb.setRoom(null);
  // ---- el quirófano
  r = 'bar_quir';
  wb.setRoom(r);
  const M = { x: 54.6, z: 37.6 };
  quirofanoMesa(ctx, M.x, 0, M.z, r);
  P.hangingLamp(ctx, M.x, 3.8, M.z, { room: r, len: 1.2, radius: 8, intensity: 1.5 });
  // el brasero de los cauterios, con los hierros metidos en las ascuas
  P.brazier(ctx, 57.4, 0, 38.9);
  for (let i = 0; i < 3; i++) palo(wb, V(57.3 + i * 0.08, 0.95, 38.8), V(57.8 + i * 0.12, 1.45, 38.3 + i * 0.1), 0.012, 'iron', { room: r, round: true });
  ctx.lights.push({ x: 57.4, y: 1.2, z: 38.9, r: 1, g: 0.35, b: 0.1, radius: 4, intensity: 0.9, room: r });
  // la mesa de los hierros: las sierras, los cuchillos, las tenazas
  P.table(ctx, 52.0, 0, 35.2, 1.6, 0.7, 0);
  const rng = new RNG(2604);
  for (let i = 0; i < 7; i++) {
    const px = 51.4 + i * 0.18;
    wb.box('iron', px - 0.02, 0.8, 35.0 + rng.range(-0.05, 0.1), px + 0.02, 0.815, 35.4 + rng.range(-0.05, 0.1), { ao: false, room: r });
  }
  wb.box('iron', 52.3, 0.8, 35.3, 52.75, 0.81, 35.42, { ao: false, room: r });
  // los cubos de debajo de la mesa y la sangre del suelo
  P.barrel(ctx, 55.6, 0, 38.4, { r: 0.28 });
  P.decal(ctx, M.x, 0.02, M.z, 2.4);
  P.decal(ctx, 53.0, 0.02, 39.6, 1.2);
  // el armario de los frascos y las coronas de repuesto, colgadas
  estanteFrascos(ctx, 59.3, 0, 34.7, 0, 2.0, r, 2605);
  for (let i = 0; i < 4; i++) corona(wb, 50.1 + i * 0.6, 2.2, 34.62, 1.0, r, { tilt: 0.1 * (i - 1.5) });
  for (let i = 0; i < 3; i++) lamina(ctx, 50.0, 2.0, 36.6 + i * 1.2, Math.PI / 2, r, 2606 + i);
  // la otra mesa: el último paciente, tapado con una sábana
  P.table(ctx, 51.0, 0, 39.3, 1.9, 0.8, 0);
  wb.setRoom(r);
  bakeCorpse(wb, 51.0, 0.8, 39.3, Math.PI / 2, 'back', 'villager', 26);
  wb.box('linen', 50.05, 0.95, 38.92, 51.95, 1.1, 39.68, { ao: false, room: r, grime: false, tint: [0.8, 0.76, 0.68] });
  wb.box('flesh', 50.6, 1.101, 39.0, 51.2, 1.105, 39.5, { ao: false, room: r, faces: 't', tint: [0.42, 0.1, 0.08], grime: false });
  wb.setRoom(null);
  // ---- arriba: la alcoba del Barbero
  r = 'bar_alcoba';
  wb.setRoom(r);
  P.bed(ctx, 53.6, y1, 47.6, 0);
  chest(ctx, 54.6, y1, 42.3, Math.PI / 2, r, 0.9);
  // la silla de cara a la ventana de la cortina (desde aquí mira la calleja)
  P.stool(ctx, 51.0, y1, 44.0, { room: r });
  palanganero(ctx, 50.6, y1, 47.8, r);
  saint(ctx, 's', 52.4, y1 + 1.55, I.z0 + 6.55, r, 2607, 'clothRed');
  // la cortina de la ventana (por dentro)
  cortina(ctx, 50.0, y1, 44.0, r);
  P.candles(ctx, 54.7, y1 + 0.58, 42.4, 2, 2608, { room: r, radius: 4, intensity: 0.6, spread: 0.08 });
  wb.setRoom(null);
  // ---- el cuarto de los frascos
  r = 'bar_frascos';
  wb.setRoom(r);
  estanteFrascos(ctx, 52.6, y1, 34.65, 0, 2.6, r, 2609);
  estanteFrascos(ctx, 50.15, y1, 37.6, Math.PI / 2, 2.2, r, 2610);
  P.table(ctx, 53.0, y1, 38.4, 1.6, 0.8, 0);
  // (en la mesa, un brazo abierto y clavado a la tabla; los cuadernos)
  wb.box('flesh', 52.5, y1 + 0.8, 38.3, 53.3, y1 + 0.88, 38.45, { ao: false, room: r, tint: [0.62, 0.42, 0.36] });
  wb.box('linen', 53.45, y1 + 0.8, 38.25, 53.75, y1 + 0.84, 38.6, { ao: false, room: r, grime: false, tint: [0.8, 0.74, 0.6] });
  for (let i = 0; i < 4; i++) lamina(ctx, 50.6 + i * 1.15, y1 + 2.0, 40.75, Math.PI, r, 2611 + i);
  P.candles(ctx, 52.6, y1 + 0.8, 38.6, 3, 2615, { room: r, radius: 4.5, intensity: 0.7, spread: 0.15 });
  wb.setRoom(null);
  // ---- el cuarto de los pacientes
  r = 'bar_pacientes';
  wb.setRoom(r);
  camastro(ctx, 57.0, y1, 35.4, 0, r);
  camastro(ctx, 59.4, y1, 37.5, Math.PI / 2, r);
  camastro(ctx, 57.0, y1, 39.7, 0, r, { blood: false });
  P.barrel(ctx, 56.0, y1, 37.7, { r: 0.25 });
  luna(ctx, 58.5, y1 + 1.6, 34.7, r, 0.35);
  wb.setRoom(null);
  // ---- el rellano
  r = 'bar1';
  wb.setRoom(r);
  P.candles(ctx, 58.0, y1, 48.2, 3, 2616, { room: r, radius: 4, intensity: 0.55 });
  wb.setRoom(null);
  // ---- el desván: lo que les quitó a todos, las coronas a medio hacer
  r = 'bar2';
  wb.setRoom(r);
  const rd = new RNG(2617);
  // (los montones de ropa y de zapatos, a lo largo, junto a los aleros)
  for (let i = 0; i < 7; i++) {
    const zz = 35.5 + i * 1.7;
    const xx = rd.chance(0.5) ? 53.2 : 57.3;
    wb.geometry('burlap', new THREE.DodecahedronGeometry(0.55, 0), M4().compose(V(xx, y2 + 0.15, zz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rd.range(0, 3), 0)), V(1.3, 0.5, 1.0)), { ao: false, room: r, tint: rd.pick([[0.5, 0.4, 0.3], [0.35, 0.3, 0.3], [0.55, 0.3, 0.25]]) });
    for (let k = 0; k < 3; k++) botas(ctx, xx + rd.range(-0.6, 0.6), y2, zz + rd.range(0.5, 0.9), rd.range(0, 6), r, { tall: rd.chance(0.5), lying: rd.chance(0.5) });
  }
  // el banco de las coronas
  P.table(ctx, 55.25, y2, 36.3, 1.6, 0.7, 0);
  for (let i = 0; i < 3; i++) corona(wb, 54.75 + i * 0.5, y2 + 0.8, 36.3, 1.0, r, { rods: 4 + i });
  P.hangingLamp(ctx, 55.25, 9.35, 36.6, { room: r, len: 0.6, radius: 5.5, intensity: 0.75 });
  // la luz de la luna por la claraboya
  luna(ctx, 57.2, y2 + 1.4, 40.9, r, 0.9, 5);
  if (ctx.shafts) ctx.shafts.push({ a: [57.2, 9.6, 40.9], b: [56.6, y2 + 0.05, 41.1], w: 1.0, color: 0x9fb2d8 });
  wb.setRoom(null);
  claraboya(ctx);
  L.interact.push(
    { kind: 'note', id: 'n_barbero1', note: 'barbero1', x: 53.6, y: y1 + 0.82, z: 38.42, model: 'paper' },
    { kind: 'note', id: 'n_barbero2', note: 'barbero2', x: 55.8, y: y2 + 0.82, z: 36.1, model: 'paper' }
  );
}

// La mesa del quirófano: el tablero con la canaleta de la sangre, el
// reposacabezas, las tres correas (las muñecas y el pecho), el cubo debajo.
// (en ella despierta uno si le atrapan: game/barbero.js)
function quirofanoMesa(ctx, x, y, z, room) {
  const wb = ctx.wb;
  wb.box('wooddark', x - 1.05, y + 0.82, z - 0.42, x + 1.05, y + 0.92, z + 0.42, { ao: false, room, faces: 'tnsewb' });
  wb.box('black', x - 1.0, y + 0.921, z - 0.03, x + 0.95, y + 0.925, z + 0.03, { ao: false, room, faces: 't', grime: false });
  for (const [sx, sz] of [
    [-0.95, -0.36],
    [0.95, -0.36],
    [-0.95, 0.36],
    [0.95, 0.36],
  ])
    wb.box('wooddark', x + sx - 0.06, y, z + sz - 0.06, x + sx + 0.06, y + 0.82, z + sz + 0.06, { ao: false, room });
  wb.box('wooddark', x - 0.9, y + 0.2, z - 0.36, x + 0.9, y + 0.26, z + 0.36, { ao: false, room, faces: 'tnsewb' });
  // el reposacabezas (al oeste) y las correas abiertas, colgando
  wb.box('leather', x - 1.0, y + 0.92, z - 0.15, x - 0.78, y + 1.02, z + 0.15, { ao: false, room, tint: [0.35, 0.2, 0.14] });
  for (const sx of [-0.35, 0.15, 0.6])
    for (const sz of [-0.44, 0.44]) {
      wb.box('leather', x + sx - 0.04, y + 0.55, z + sz - 0.02, x + sx + 0.04, y + 0.92, z + sz + 0.02, { ao: false, room, tint: [0.3, 0.18, 0.12] });
      wb.box('iron', x + sx - 0.05, y + 0.58, z + sz - 0.025, x + sx + 0.05, y + 0.64, z + sz + 0.025, { ao: false, room });
    }
  wb.box('flesh', x - 0.6, y + 0.926, z - 0.3, x + 0.4, y + 0.93, z + 0.25, { ao: false, room, faces: 't', tint: [0.32, 0.07, 0.06], grime: false });
  P.barrel(ctx, x + 0.3, y, z + 0.05, { r: 0.22 });
  P.colOBB(ctx, x, z, 1.08, 0.46, 0, y, y + 0.95);
}

// La cortina de la ventana de la alcoba: dos paños de lino, uno corrido y el
// otro recogido (el que él aparta para mirar: game/barbero.js lo mueve en la
// cinemática del principio; éste es el que se queda).
function cortina(ctx, x, y, z, room) {
  const wb = ctx.wb;
  palo(wb, V(x + 0.05, y + 2.55, z - 0.7), V(x + 0.05, y + 2.55, z + 0.7), 0.015, 'iron', { room, round: true });
  for (let i = 0; i < 6; i++) {
    const zz = z - 0.6 + i * 0.1;
    wb.box('linen', x + 0.04 + (i % 2) * 0.03, y + 0.75, zz - 0.05, x + 0.06 + (i % 2) * 0.03, y + 2.55, zz + 0.05, { ao: false, room, grime: false, tint: [0.78, 0.72, 0.62] });
  }
  wb.box('linen', x + 0.04, y + 0.9, z + 0.42, x + 0.16, y + 2.55, z + 0.62, { ao: false, room, grime: false, tint: [0.72, 0.66, 0.56] });
}

// La claraboya del desván: el cerco de madera en el faldón del este, la tapa
// (de vidrio emplomado, apuntalada abierta) y la luz de dentro.
function claraboya(ctx) {
  const wb = ctx.wb;
  const C = { x0: 56.6, z0: 40.3, x1: 57.8, z1: 41.5 };
  const slope = 3 / 5.75;
  const Y = (x) => 10.4 - (x - 55.25) * slope;
  // el cerco: cuatro tablas de canto sobre las tejas
  palo(wb, V(C.x0, Y(C.x0) + 0.08, C.z0), V(C.x0, Y(C.x0) + 0.08, C.z1), 0.05, 'timber');
  palo(wb, V(C.x1, Y(C.x1) + 0.08, C.z0), V(C.x1, Y(C.x1) + 0.08, C.z1), 0.05, 'timber');
  palo(wb, V(C.x0, Y(C.x0) + 0.08, C.z0), V(C.x1, Y(C.x1) + 0.08, C.z0), 0.05, 'timber');
  palo(wb, V(C.x0, Y(C.x0) + 0.08, C.z1), V(C.x1, Y(C.x1) + 0.08, C.z1), 0.05, 'timber');
  // la tapa, levantada sobre su gozne (el lado de arriba) y el puntal
  wb.push();
  wb.translate(C.x0, Y(C.x0) + 0.12, (C.z0 + C.z1) / 2);
  wb.rotateZ(1.15);
  wb.box('wooddark', 0, -0.03, -0.62, 1.25, 0.03, 0.62, { ao: false, faces: 'tnsewb' });
  wb.box('glass', 0.08, 0.031, -0.52, 1.15, 0.035, 0.52, { ao: false, grime: false, tint: [0.6, 0.65, 0.55] });
  wb.pop();
  palo(wb, V(C.x1 - 0.1, Y(C.x1 - 0.1) + 0.1, (C.z0 + C.z1) / 2), V(C.x0 + 0.45, Y(C.x0) + 1.0, (C.z0 + C.z1) / 2), 0.025, 'wooddark', { round: true });
  // (desde fuera, la luz del farol del desván por el hueco)
  ctx.lights.push({ x: (C.x0 + C.x1) / 2, y: Y(57.2) + 0.6, z: (C.z0 + C.z1) / 2, r: 1, g: 0.55, b: 0.22, radius: 2.6, intensity: 0.7 });
  if (ctx.fires) ctx.fires.push({ x: (C.x0 + C.x1) / 2, y: Y(57.2) - 0.4, z: (C.z0 + C.z1) / 2, s: 0.5, light: false, embers: false, glow: true });
}

// ------------------------------------------------------------ el patio
// El patio de atrás: la tapia del callejón con su portón (atrancado por
// dentro), la leñera contra la capilla, el pozo, el pozo de la cal, la
// camilla, las jaulas, las sábanas tendidas.
export function patioBarbero(ctx, S, L) {
  const wb = ctx.wb;
  const Q = { x0: 49.5, z0: 22, x1: 61, z1: 34 };
  // la tapia del callejón, con el portón
  tapia(ctx, 49.5, 22, 49.9, 34, 3.4, { holes: [{ a0: 27.0, a1: 29.2, y0: 0, y1: 3.4 }] });
  wb.box('ashlar', 49.4, 2.6, 26.8, 50.0, 3.0, 29.4, { ao: false, sub: 2 });
  L.interact.push({ kind: 'door', id: 'd_patio_barbero', x: 49.7, y: 0, z: 28.1, w: 2.2, h: 2.6, axis: 'z', mat: 'planks', double: true, swing: 1, plane: 49.9, inset: 0.06, mark: 'cross', lock: { type: 'barred', side: 1 }, barredMsg: 'patioTranca' });
  // la leñera, contra el muro de la capilla
  P.leanTo(ctx, 50.2, 22, 55.2, 24.2, 'n', 3.1, 2.3);
  P.firewood(ctx, 51.4, 0, 22.7, 0, 4);
  P.firewood(ctx, 53.4, 0, 22.7, 0, 3);
  // el pozo, el pozo de la cal (blanco, con su borde), la camilla
  P.well(ctx, 58.8, 0, 24.8, {});
  wb.box('ashlar', 52.2, 0, 29.0, 55.2, 0.35, 29.25, { ao: false, sub: 2 });
  wb.box('ashlar', 52.2, 0, 31.25, 55.2, 0.35, 31.5, { ao: false, sub: 2 });
  wb.box('ashlar', 52.2, 0, 29.25, 52.45, 0.35, 31.25, { ao: false, sub: 2 });
  wb.box('ashlar', 54.95, 0, 29.25, 55.2, 0.35, 31.25, { ao: false, sub: 2 });
  wb.box('plaster', 52.45, 0.2, 29.25, 54.95, 0.22, 31.25, { ao: false, faces: 't', tint: [1.1, 1.08, 1.02] });
  ctx.col.add(52.2, 0, 29.0, 55.2, 0.35, 31.5);
  camilla(ctx, 57.6, 0, 32.4, 0.15, 'out');
  // las jaulas (en una, lo que queda de alguien)
  for (const [x, z] of [
    [59.9, 28.6],
    [59.9, 30.4],
  ])
    jaula(ctx, x, 0, z, 0.9, 1.6);
  wb.setRoom(null);
  bakeCorpse(wb, 59.9, 0.06, 30.4, 1.4, 'curl', 'villager', 27);
  // las sábanas tendidas, con sus manchas
  P.laundry(ctx, 50.0, 26.2, 50.0, 33.6, 2.8, 2618);
  P.barrel(ctx, 56.5, 0, 33.4);
  P.barrel(ctx, 57.3, 0, 33.55, { lying: true, rot: 0.4 });
  P.decal(ctx, 56.4, 0.02, 31.6, 1.6);
  P.decal(ctx, 54.6, 0.02, 33.2, 1.2);
  P.lantern(ctx, 54.5, 2.8, 34.0, Math.PI, true);
  ctx.lights.push({ x: 54.5, y: 2.6, z: 33.4, r: 1, g: 0.55, b: 0.22, radius: 6, intensity: 0.8 });
  // ---- el callejón de la capilla: la barricada de la plazuela (apuntalada
  // por el lado del callejón), los trastos, la ventanita de la capilla
  L.interact.push({ kind: 'door', id: 'd_callejon', x: 47.75, y: 0, z: 38.45, w: 3.5, h: 2.6, axis: 'x', lock: { type: 'boards', side: -1, front: 'callejonFrente', msg: 'callejonCae', shut: 'callejonPuntales' }, mat: 'barricade', hinge: 0 });
  P.barrel(ctx, 46.6, 0, 33.0);
  P.crate(ctx, 48.8, 0, 31.4, 0.8, 0.3);
  P.cart(ctx, 47.7, 0, 24.6, 1.5, { brokenWheel: true });
  // la ventanita enrejada de la capilla, al fondo, con la luz de su altar
  wb.box('black', 47.3, 2.2, 21.96, 48.2, 3.1, 21.97, { ao: false, grime: false, faces: 's' });
  for (let i = 0; i < 5; i++) wb.box('iron', 47.35 + i * 0.2, 2.2, 21.97, 47.38 + i * 0.2, 3.1, 22.0, { ao: false });
  wb.box('ember', 47.6, 2.3, 21.955, 47.9, 2.5, 21.96, { ao: false, grime: false, faces: 's' });
  ctx.lights.push({ x: 47.75, y: 2.6, z: 22.5, r: 1, g: 0.6, b: 0.3, radius: 3, intensity: 0.5 });
}

// Una jaula de hierro (de las de colgar, puesta en el suelo).
function jaula(ctx, x, y, z, r, h) {
  const wb = ctx.wb;
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    wb.box('iron', x + Math.cos(a) * r - 0.015, y, z + Math.sin(a) * r - 0.015, x + Math.cos(a) * r + 0.015, y + h, z + Math.sin(a) * r + 0.015, { ao: false });
  }
  wb.cylinder('iron', x, y + 0.04, z, r, r, 0.04, n, { ao: false });
  wb.cylinder('iron', x, y + h, z, r, r * 0.3, 0.3, n, { ao: false });
  ctx.col.add(x - r, y, z - r, x + r, y + h, z + r);
}

export { cruzCal, V };
