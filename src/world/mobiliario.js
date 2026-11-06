// El mobiliario de las salas (PLAN_FORTALEZA.md, fase 9: la personalidad de
// cada sala): piezas pequeñas, hechas con cuidado y a escala, que dicen quién
// vivía allí y qué hacía. Todas en coordenadas locales (wb.at): x a lo largo,
// z hacia delante (lo que mira a la sala), y en metros desde el suelo.
//
//   mesaPuesta     lo de encima de una mesa: escudillas, vasos, la jarra, el
//                  pan, el cuchillo y, si se pide, los dados o un tablero
//   percha         la tabla de clavijas de un muro con lo que cuelga de ella
//                  (capas, gambesones, cintos, un zurrón, una capelina)
//   paveses        los escudos grandes de los ballesteros, apoyados en el muro
//   yelmos         el clavijero de los yelmos de la guardia
//   caldero        el caldero colgado de los llares, sobre el fuego del hogar
//   imagenSanto    una tabla pintada clavada al muro, con su repisa de velas
//   aguamanil      el soporte de tres patas con la jofaina y el jarro
//   lecho          una cama de verdad: armazón, cabecero, colchón, almohada y
//                  manta (y su colisión)
//   estera         una estera de esparto en el suelo
//   tabla          una tabla de madera colgada (la de la ronda, la de las
//                  cuentas), con sus rayas de carbón
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import * as P from './props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const MADERA = [0.6, 0.5, 0.4];

// Un palo de a a b (en coordenadas locales), de sección w.
function palo(wb, a, b, w, mat, o = {}) {
  const d = new THREE.Vector3().subVectors(b, a);
  const L = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
  const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, V(w, L, o.d ?? w));
  wb.geometry(mat, new THREE.BoxGeometry(1, 1, 1), m, { ao: false, room: o.room, tint: o.tint });
}

// ------------------------------------------------------------------ la mesa puesta
// Sobre una mesa (y: lo alto del tablero), en un rectángulo de w × d centrado
// en (x, z) y girado rot. Los puestos (escudilla, vaso y, a veces, la cuchara)
// van en los dos bordes largos; lo de todos, en la franja de en medio, a lo
// largo: el tablero de las tablas en un cabo (o.tablero, si la mesa da para
// él), la jarra, el cuchillo, el pan y, en el otro cabo, el cubilete volcado
// con sus tres dados (o.dados). o.vela: un cabo de vela pegado a la madera;
// o.revuelto: alguna escudilla volcada; o.n: cuántos puestos.
export function mesaPuesta(ctx, x, y, z, rot, w, d, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  const rng = new RNG(o.seed ?? Math.round(x * 31 + z * 17));
  const n = o.n ?? 3;
  const zb = d / 2 - 0.15;
  wb.at(x, y, z, rot, () => {
    // los puestos, a los dos lados (repartidos a lo largo)
    const porLado = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const lado = i % 2 ? 1 : -1;
      const k = Math.floor(i / 2);
      const px = -w / 2 + (w * (k + 0.5 + (lado > 0 ? 0.25 : 0))) / (porLado + 0.25) + rng.range(-0.05, 0.05),
        pz = lado * zb;
      if (o.revuelto && rng.chance(0.35)) {
        wb.push();
        wb.translate(px, 0.06, pz);
        wb.rotateX(lado * (Math.PI / 2 - 0.3));
        wb.cylinder('wooddark', 0, -0.03, 0, 0.07, 0.11, 0.06, 10, { ao: false, room, tint: MADERA });
        wb.pop();
      } else {
        wb.cylinder('wooddark', px, 0, pz, 0.07, 0.11, 0.06, 10, { ao: false, room, capBot: true, tint: MADERA });
        wb.cylinder('black', px, 0.045, pz, 0.095, 0.095, 0.004, 10, { ao: false, room, capTop: true, grime: false, tint: [0.45, 0.32, 0.2] });
      }
      // el vaso, a la derecha de la escudilla; la cuchara, a la izquierda
      wb.cylinder('wooddark', px + 0.17, 0, pz - lado * 0.02, 0.04, 0.046, 0.1, 8, { ao: false, room, capBot: true, tint: MADERA });
      if (rng.chance(0.6)) palo(wb, V(px - 0.15, 0.012, pz - lado * 0.07), V(px - 0.15, 0.012, pz + lado * 0.07), 0.022, 'wooddark', { room, d: 0.008, tint: MADERA });
    }
    // la franja de en medio: de un cabo al otro
    const tab = o.tablero && w >= 1.5;
    if (tab) {
      const tx = -w / 2 + 0.3;
      wb.box('planks', tx - 0.22, 0, -0.15, tx + 0.22, 0.02, 0.15, { ao: false, room, faces: 'tnsew', tint: [0.85, 0.72, 0.55] });
      for (let k = 0; k < 6; k++)
        for (const s2 of [-1, 1]) {
          const px = tx - 0.18 + k * 0.072;
          wb.box(k % 2 ? 'clothRed' : 'black', px - 0.012, 0.0205, s2 > 0 ? 0.04 : -0.13, px + 0.012, 0.0215, s2 > 0 ? 0.13 : -0.04, { ao: false, room, faces: 't', grime: false });
        }
      for (let k = 0; k < 9; k++) {
        const blanca = k % 2 === 0;
        wb.cylinder(blanca ? 'bone' : 'wooddark', tx + rng.range(-0.18, 0.18), 0.021, rng.range(-0.11, 0.11), 0.017, 0.017, 0.008, 8, { ao: false, room, capTop: true, tint: blanca ? [1.0, 0.95, 0.85] : [0.4, 0.3, 0.24] });
      }
    }
    const x0 = tab ? -w / 2 + 0.62 : -w / 2 + 0.2,
      x1 = o.dados ? w / 2 - 0.42 : w / 2 - 0.15;
    const at = (t) => x0 + (x1 - x0) * t;
    P.jar(ctx, at(0.12), 0, 0, 0.42, { room });
    // el cuchillo, junto a la jarra
    {
      const kx = at(0.3);
      wb.box('iron', kx, 0, 0.1, kx + 0.17, 0.006, 0.124, { ao: false, room, tint: [0.75, 0.75, 0.78] });
      wb.box('wooddark', kx - 0.1, 0, 0.096, kx, 0.02, 0.128, { ao: false, room });
    }
    // el pan: la hogaza y el mendrugo
    const pan = (px, pz, sc) => P.ellipsoid(ctx, 'hide', px, 0.045 * sc, pz, 0.13 * sc, 0.06 * sc, 0.09 * sc, [0.72, 0.5, 0.3], { room });
    pan(at(0.62), -0.04, 1);
    if (rng.chance(0.7)) pan(at(0.88), 0.07, 0.55);
    if (o.vela) {
      const vx = at(0.45);
      wb.cylinder('candle', vx, 0, -0.1, 0.06, 0.05, 0.012, 10, { ao: false, room, capTop: true, tint: [0.95, 0.9, 0.78] });
      wb.cylinder('candle', vx, 0.012, -0.1, 0.017, 0.016, 0.07, 8, { ao: false, room, capTop: true });
    }
    if (o.dados) {
      const dx = w / 2 - 0.2;
      wb.push();
      wb.translate(dx, 0.045, -0.04);
      wb.rotateZ(Math.PI / 2 + 0.2);
      wb.cylinder('leather', 0, -0.06, 0, 0.04, 0.046, 0.12, 8, { ao: false, room, capBot: true });
      wb.pop();
      for (let k = 0; k < 3; k++) {
        const a = rng.range(0, Math.PI);
        wb.at(dx - 0.14 - k * 0.06 + rng.range(-0.015, 0.015), 0, rng.range(-0.1, 0.06), a, () => wb.box('bone', -0.009, 0, -0.009, 0.009, 0.018, 0.009, { ao: false, room, tint: [1.05, 1.0, 0.92] }));
      }
    }
  });
}

// ------------------------------------------------------------------ la percha
// La tabla de clavijas de un muro (a 1,75 m), de largo len, y lo que cuelga de
// cada clavija: una capa, un gambesón, un cinto con su hebilla, un zurrón, una
// capelina. (x, z): el centro, contra el muro; rot: hacia dónde mira la sala.
export function percha(ctx, x, y, z, rot, len, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  const rng = new RNG(o.seed ?? Math.round(x * 13 - z * 7));
  const hy = 1.75;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -len / 2, hy - 0.06, 0, len / 2, hy + 0.06, 0.035, { ao: false, room, faces: 'tnsewb', tint: [0.7, 0.62, 0.52] });
    const k = Math.max(2, Math.floor(len / 0.42));
    for (let i = 0; i < k; i++) {
      const px = -len / 2 + (len * (i + 0.5)) / k;
      // la clavija
      palo(wb, V(px, hy, 0.03), V(px, hy + 0.04, 0.16), 0.03, 'wooddark', { room, tint: [0.62, 0.52, 0.42] });
      const q = o.cosas ? o.cosas[i % o.cosas.length] : rng.pick(['capa', 'capa', 'gambeson', 'cinto', 'zurron', 'nada', 'capelina']);
      if (q === 'capa' || q === 'gambeson') {
        // lo que cuelga de la clavija, con su caída: tres paños que se abren
        const mat = q === 'capa' ? rng.pick(['clothDark', 'clothRed', 'burlap', 'clothBlue']) : 'linen';
        const tint = q === 'capa' ? [0.8, 0.76, 0.72] : [0.86, 0.8, 0.66];
        const lg = q === 'capa' ? rng.range(1.0, 1.25) : 0.72,
          an = q === 'capa' ? 0.3 : 0.26;
        // (los dos de los lados, a 1 cm uno del otro: se cruzan arriba y, a la
        // par, parpadeaban)
        for (const [dx, dz, sw] of [
          [0, 0.08, 1],
          [-an * 0.6, 0.06, 0.7],
          [an * 0.6, 0.05, 0.7],
        ]) {
          wb.push();
          wb.translate(px + dx * 0.4, hy + 0.02, dz);
          wb.rotateZ(dx * 0.35);
          wb.box(mat, -an * sw * 0.5, -lg, -0.02, an * sw * 0.5, 0, 0.02, { ao: false, room, tint, faces: 'tnsewb' });
          wb.pop();
        }
        if (q === 'gambeson')
          for (let s = 0; s < 4; s++) wb.box('linen', px - an * 0.5, hy - 0.15 - s * 0.16, 0.105, px + an * 0.5, hy - 0.14 - s * 0.16, 0.112, { ao: false, room, tint: [0.62, 0.56, 0.46] });
      } else if (q === 'cinto') {
        wb.box('leather', px - 0.025, hy - 0.62, 0.07, px + 0.025, hy, 0.085, { ao: false, room, tint: [0.62, 0.44, 0.3] });
        wb.box('leather', px - 0.025 + 0.06, hy - 0.5, 0.07, px + 0.025 + 0.06, hy, 0.085, { ao: false, room, tint: [0.62, 0.44, 0.3] });
        wb.box('bronze', px - 0.035, hy - 0.66, 0.065, px + 0.035, hy - 0.6, 0.09, { ao: false, room });
      } else if (q === 'zurron') {
        wb.box('leather', px - 0.012, hy - 0.3, 0.07, px + 0.012, hy, 0.08, { ao: false, room });
        P.ellipsoid(ctx, 'burlap', px, hy - 0.42, 0.11, 0.15, 0.17, 0.08, [0.82, 0.74, 0.6], { room });
      } else if (q === 'capelina') {
        wb.cylinder('plateRust', px, hy - 0.2, 0.13, 0.25, 0.25, 0.02, 12, { ao: false, room, capTop: true, capBot: true });
        wb.cylinder('plateRust', px, hy - 0.18, 0.13, 0.15, 0.06, 0.14, 10, { ao: false, room, capTop: true });
      }
    }
  });
  if (o.col !== false) P.colOBB(ctx, x + Math.sin(rot) * 0.1, z + Math.cos(rot) * 0.1, len / 2, 0.14, rot, y + 0.5, y + 1.9);
}

// ------------------------------------------------------------------ los paveses
// Los escudos grandes de los ballesteros, de tablas, con su borde de cuero y la
// cruz azul del Rey sobre blanco, apoyados en el muro (z = 0: el muro; la sala,
// hacia +z), de n en fila; alguno, partido o con un virote clavado.
export function paveses(ctx, x, y, z, rot, n, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  const rng = new RNG(o.seed ?? Math.round(x * 5 + z * 11));
  wb.at(x, y, z, rot, () => {
    for (let i = 0; i < n; i++) {
      const px = (i - (n - 1) / 2) * 0.62 + rng.range(-0.04, 0.04);
      const incl = rng.range(0.16, 0.24);
      wb.push();
      wb.translate(px, 0, 0.3);
      wb.rotateX(-incl);
      wb.rotateZ(rng.range(-0.04, 0.04));
      wb.box('wooddark', -0.27, 0, -0.03, 0.27, 1.1, 0.03, { ao: false, room, faces: 'tnsewb', tint: [0.62, 0.52, 0.42] });
      // el paño blanco y la cruz
      wb.box('clothWhite', -0.24, 0.05, 0.03, 0.24, 1.05, 0.034, { ao: false, room, faces: 's', tint: [0.86, 0.84, 0.78] });
      wb.box('clothBlue', -0.035, 0.12, 0.034, 0.035, 0.98, 0.037, { ao: false, room, faces: 's' });
      wb.box('clothBlue', -0.19, 0.64, 0.034, 0.19, 0.71, 0.037, { ao: false, room, faces: 's' });
      // el borde de cuero
      for (const s of [-1, 1]) wb.box('leather', s * 0.27 - 0.012, 0, -0.035, s * 0.27 + 0.012, 1.1, 0.04, { ao: false, room, tint: [0.5, 0.36, 0.26] });
      if (o.virote && i === Math.floor(n / 2)) palo(wb, V(0.08, 0.72, 0.03), V(0.12, 0.82, 0.36), 0.012, 'wooddark', { room });
      wb.pop();
    }
  });
  P.colOBB(ctx, x + Math.sin(rot) * 0.32, z + Math.cos(rot) * 0.32, (n * 0.62) / 2, 0.22, rot, y, y + 1.1);
}

// ------------------------------------------------------------------ los yelmos
// El clavijero de los yelmos: una tabla en el muro (a 1,6 m) con sus
// clavijas, y en cada una un yelmo cónico con su nasal (alguno, la capelina de
// ala ancha de los ballesteros; alguna clavija, vacía).
export function yelmos(ctx, x, y, z, rot, n, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  const rng = new RNG(o.seed ?? Math.round(x * 3 - z * 13));
  const hy = 1.6,
    len = n * 0.42;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -len / 2, hy - 0.05, 0, len / 2, hy + 0.05, 0.035, { ao: false, room, faces: 'tnsewb', tint: [0.66, 0.58, 0.48] });
    for (let i = 0; i < n; i++) {
      const px = -len / 2 + 0.21 + i * 0.42;
      palo(wb, V(px, hy, 0.03), V(px, hy + 0.03, 0.17), 0.028, 'wooddark', { room });
      if (o.vacias && o.vacias.includes(i)) continue;
      const cap = rng.chance(0.3);
      const yc = hy - 0.06;
      if (cap) {
        wb.cylinder('plateRust', px, yc - 0.12, 0.16, 0.24, 0.24, 0.02, 12, { ao: false, room, capTop: true, capBot: true });
        wb.cylinder('plateRust', px, yc - 0.1, 0.16, 0.14, 0.05, 0.14, 10, { ao: false, room, capTop: true });
      } else {
        wb.cylinder('plate', px, yc - 0.2, 0.16, 0.135, 0.135, 0.07, 10, { ao: false, room, tint: [0.8, 0.8, 0.84] });
        wb.cylinder('plate', px, yc - 0.13, 0.16, 0.135, 0.02, 0.2, 10, { ao: false, room, tint: [0.85, 0.85, 0.9] });
        wb.box('iron', px - 0.016, yc - 0.32, 0.29, px + 0.016, yc - 0.13, 0.31, { ao: false, room });
      }
    }
  });
}

// ------------------------------------------------------------------ el caldero
// El caldero del hogar, colgado de los llares (la cremallera de hierro con sus
// dientes) sobre las brasas: (x, z), el centro del fuego; y, el suelo; top, de
// dónde cuelga (la campana); o.lleno: el guiso que humea.
export function caldero(ctx, x, y, z, top, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  const yb = y + 0.38;
  // los llares: la barra dentada y el gancho
  wb.box('iron', x - 0.018, yb + 0.5, z - 0.012, x + 0.018, top, z + 0.012, { ao: false, room });
  for (let k = 0; k < 6; k++) wb.box('iron', x + 0.018, yb + 0.62 + k * 0.1, z - 0.01, x + 0.05, yb + 0.66 + k * 0.1, z + 0.01, { ao: false, room });
  wb.box('iron', x - 0.01, yb + 0.36, z - 0.01, x + 0.01, yb + 0.5, z + 0.01, { ao: false, room });
  // el asa y el caldero, panzudo
  for (const s of [-1, 1]) palo(wb, V(x + s * 0.2, yb + 0.3, z), V(x, yb + 0.38, z), 0.014, 'iron', { room });
  wb.cylinder('iron', x, yb, z, 0.16, 0.23, 0.14, 12, { ao: false, room, capBot: true, tint: [0.42, 0.4, 0.38] });
  wb.cylinder('iron', x, yb + 0.14, z, 0.23, 0.21, 0.16, 12, { ao: false, room, tint: [0.42, 0.4, 0.38] });
  wb.cylinder(o.lleno ? 'hide' : 'black', x, yb + 0.26, z, 0.205, 0.205, 0.01, 12, { ao: false, room, capTop: true, grime: false, tint: o.lleno ? [0.42, 0.3, 0.18] : undefined });
  if (o.lleno && ctx.fires) ctx.fires.push({ x, y: yb + 0.3, z, s: 0.12, light: false, embers: false, glow: false, smoke: true });
}

// ------------------------------------------------------------------ la imagen
// Una tabla pintada clavada al muro (dir: hacia dónde mira), con su marco y,
// debajo, la repisa de las velas (o.velas: cuántas, y si están encendidas) y la
// cera que ha caído al suelo.
export function imagenSanto(ctx, x, y, z, dir, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  const rot = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[dir];
  const w = o.w ?? 0.42,
    h = o.h ?? 0.58,
    yc = o.yc ?? 1.75;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -w / 2 - 0.04, yc - h / 2 - 0.04, 0, w / 2 + 0.04, yc + h / 2 + 0.04, 0.04, { ao: false, room, faces: 'tnsewb', tint: [0.7, 0.55, 0.3] });
    wb.geometry(o.tex ?? 'animasRetablo', new THREE.PlaneGeometry(w, h), new THREE.Matrix4().compose(V(0, yc, 0.048), new THREE.Quaternion(), V(1, 1, 1)), { ao: false, room, grime: false });
    // la repisa y sus velas
    wb.box('wooddark', -0.25, yc - h / 2 - 0.3, 0, 0.25, yc - h / 2 - 0.26, 0.18, { ao: false, room, faces: 'tnsewb', tint: [0.6, 0.5, 0.4] });
    for (const s of [-0.5, 0.5]) palo(wb, V(s * 0.4, yc - h / 2 - 0.3, 0.01), V(s * 0.4, yc - h / 2 - 0.46, 0.14), 0.02, 'wooddark', { room });
  });
  const F = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] }[dir];
  const yr = y + yc - h / 2 - 0.26;
  if (o.velas !== 0) P.candles(ctx, x + F[0] * 0.1, yr, z + F[1] * 0.1, o.velas ?? 3, o.seed ?? 4413, { room, radius: 3.6, intensity: o.encendidas === false ? 0 : 0.7, spread: 0.13, lit: o.encendidas !== false });
  // los regueros de cera que bajan por el canto de la repisa y el charco del
  // suelo
  for (const [u, l] of [
    [-0.06, 0.22],
    [0.09, 0.13],
  ]) {
    const px = x + (F[1] ? u : 0) + F[0] * 0.175,
      pz = z + (F[0] ? u : 0) + F[1] * 0.175;
    wb.box('candle', px - 0.008, yr - 0.04 - l, pz - 0.008, px + 0.008, yr - 0.04, pz + 0.008, { ao: false, room, tint: [0.86, 0.8, 0.64] });
  }
  wb.cylinder('candle', x + F[0] * 0.18, y, z + F[1] * 0.18, 0.12, 0.1, 0.012, 10, { ao: false, room, capTop: true, tint: [0.9, 0.86, 0.74] });
}

// ------------------------------------------------------------------ el aguamanil
// El soporte de tres patas, de hierro, con la jofaina de azófar arriba, el
// jarro en su anillo de abajo y el paño colgado.
export function aguamanil(ctx, x, y, z, rot, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  wb.at(x, y, z, rot, () => {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      palo(wb, V(Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24), V(Math.cos(a) * 0.17, 0.82, Math.sin(a) * 0.17), 0.025, 'iron', { room });
    }
    wb.ring('iron', 0, 0.8, 0, 0.2, 0.17, 0.03, 12, { room });
    wb.ring('iron', 0, 0.3, 0, 0.21, 0.18, 0.025, 12, { room });
    wb.cylinder('bronze', 0, 0.8, 0, 0.11, 0.24, 0.09, 14, { ao: false, room, capBot: true });
    wb.cylinder('water', 0, 0.86, 0, 0.21, 0.21, 0.005, 14, { ao: false, room, capTop: true, grime: false });
    P.jar(ctx, 0, 0.33, 0, 0.5, { room });
    wb.box('linen', 0.2, 0.42, -0.06, 0.23, 0.82, 0.08, { ao: false, room, tint: [0.92, 0.88, 0.8] });
  });
  P.colOBB(ctx, x, z, 0.26, 0.26, rot, y, y + 0.9);
}

// ------------------------------------------------------------------ el lecho
// Una cama de verdad, contra el muro por la cabecera (z = -1 en local; los pies
// hacia +z): el armazón con sus patas, el cabecero de tablas, el colchón de
// lana, la almohada y la manta, echada o revuelta (o.revuelta). Mide w × 2.
export function lecho(ctx, x, y, z, rot, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  const w = o.w ?? 1.1;
  const manta = o.manta ?? 'clothRed';
  wb.at(x, y, z, rot, () => {
    // las patas y los largueros
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) wb.box('wooddark', sx * (w / 2 - 0.04) - 0.04, 0, sz * 0.96 - 0.04, sx * (w / 2 - 0.04) + 0.04, 0.42, sz * 0.96 + 0.04, { ao: false, room });
    for (const sx of [-1, 1]) wb.box('wooddark', sx * w / 2 - 0.035, 0.22, -1, sx * w / 2 + 0.035, 0.36, 1, { ao: false, room, faces: 'tnsewb' });
    wb.box('wooddark', -w / 2, 0.22, 0.96, w / 2, 0.36, 1.03, { ao: false, room, faces: 'tnsewb' });
    // el cabecero
    wb.box('planks', -w / 2 - 0.04, 0.22, -1.06, w / 2 + 0.04, 1.15, -0.98, { ao: false, room, faces: 'tnsewb', tint: [0.7, 0.58, 0.46] });
    wb.box('wooddark', -w / 2 - 0.06, 1.15, -1.08, w / 2 + 0.06, 1.21, -0.96, { ao: false, room });
    // el colchón y la almohada
    wb.box('linen', -w / 2 + 0.03, 0.36, -0.96, w / 2 - 0.03, 0.52, 0.95, { ao: false, room, faces: 'tnsew', tint: [0.84, 0.8, 0.7] });
    wb.box('linen', -w / 2 + 0.12, 0.52, -0.94, w / 2 - 0.12, 0.62, -0.62, { ao: false, room, faces: 'tnsew', tint: [0.94, 0.92, 0.86] });
    // la manta: echada hasta media cama, o revuelta y caída por un lado
    if (o.revuelta) {
      wb.box(manta, -w / 2 + 0.02, 0.52, -0.4, w / 2 - 0.25, 0.58, 0.9, { ao: false, room, faces: 'tnsew', tint: [0.8, 0.74, 0.7] });
      // (lo que cae por el lado, por fuera del larguero: a la par, parpadeaban)
      wb.box(manta, w / 2 - 0.25, 0.18, -0.2, w / 2 + 0.055, 0.58, 0.85, { ao: false, room, faces: 'tnsew', tint: [0.76, 0.7, 0.66] });
    } else {
      wb.box(manta, -w / 2 - 0.02, 0.52, -0.38, w / 2 + 0.02, 0.57, 0.98, { ao: false, room, faces: 'tnsew', tint: [0.82, 0.76, 0.72] });
      for (const s of [-1, 1]) wb.box(manta, s * (w / 2 + 0.045) - 0.02, 0.3, -0.38, s * (w / 2 + 0.045) + 0.02, 0.565, 0.98, { ao: false, room, tint: [0.76, 0.7, 0.66] });
    }
  });
  P.colOBB(ctx, x, z, w / 2 + 0.05, 1.05, rot, y, y + 0.62);
}

// ------------------------------------------------------------------ la estera
// Una estera de esparto en el suelo, con su orla y los cabos deshilachados.
export function estera(ctx, x, y, z, rot, w, d, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  // (el cuerpo y las dos orlas, unas junto a otras y no encima: dos caras a
  // pocos milímetros parpadean de lejos; y por encima de cualquier suelo, que
  // los hay con la cara a +2 cm: la estera, de 3 cm de grueso)
  wb.at(x, y, z, rot, () => {
    wb.box('straw', -w / 2 + 0.01, 0, -d / 2 + 0.08, w / 2 - 0.01, 0.03, d / 2 - 0.08, { ao: false, room, faces: 'tew', tint: o.tint ?? [0.46, 0.39, 0.27] });
    for (const s of [-1, 1]) wb.box('straw', -w / 2, 0, s > 0 ? d / 2 - 0.08 : -d / 2, w / 2, 0.036, s > 0 ? d / 2 : -d / 2 + 0.08, { ao: false, room, faces: 'tnsew', tint: [0.36, 0.3, 0.2] });
  });
}

// ------------------------------------------------------------------ la tabla
// Una tabla de madera colgada de un clavo (dir: hacia dónde mira), con sus
// rayas de carbón en filas (o.filas) y alguna tachada.
export function tabla(ctx, x, y, z, dir, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  const rot = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[dir];
  const w = o.w ?? 0.62,
    h = o.h ?? 0.82,
    yc = o.yc ?? 1.55;
  const rng = new RNG(o.seed ?? 7317);
  wb.at(x, y, z, rot, () => {
    wb.box('planks', -w / 2, yc - h / 2, 0, w / 2, yc + h / 2, 0.025, { ao: false, room, faces: 'tnsewb', tint: [0.86, 0.76, 0.62] });
    wb.box('iron', -0.012, yc + h / 2 + 0.02, 0, 0.012, yc + h / 2 + 0.05, 0.05, { ao: false, room });
    const filas = o.filas ?? 7;
    for (let f = 0; f < filas; f++) {
      const fy = yc + h / 2 - 0.09 - f * ((h - 0.16) / filas);
      // el nombre (un trazo largo) y sus rayas
      wb.box('black', -w / 2 + 0.05, fy - 0.006, 0.0255, -w / 2 + 0.05 + rng.range(0.12, 0.24), fy + 0.006, 0.026, { ao: false, room, faces: 's', grime: false, tint: [0.3, 0.3, 0.3] });
      const n = rng.int(1, 6);
      for (let k = 0; k < n; k++) wb.box('black', 0.02 + k * 0.035, fy - 0.022, 0.0255, 0.028 + k * 0.035, fy + 0.022, 0.026, { ao: false, room, faces: 's', grime: false, tint: [0.3, 0.3, 0.3] });
      if (o.tachadas && o.tachadas.includes(f)) wb.box('black', -w / 2 + 0.03, fy - 0.004, 0.0262, w / 2 - 0.03, fy + 0.004, 0.0268, { ao: false, room, faces: 's', grime: false });
    }
  });
}

// ====================================================================
// Los muebles de cada día (la segunda pasada de la fase 9: que las salas
// parezcan vividas, no vacías). Todos en local: x a lo largo, z hacia la
// sala (la espalda del mueble, contra el muro, en -z), y desde el suelo.
//
//   escano        el banco de respaldo alto con sus brazos (y su cojín)
//   sillaTijera   la silla de tijera (jamuga), de cuero
//   alacena       el armario de dos puertas (o.abierta: con una abierta)
//   aparador      el aparador bajo con el escudillero colgado encima
//   tinaja        la tinaja grande de barro con su tapa de tablas
//   cantarera     el poyo de madera con los cántaros del agua
//   escabel       el escabel (para los pies, para arrodillarse)
//   almohadones   los almohadones del estrado, unos sobre otros
//   alfombra      una alfombra con su cenefa
//   pano          un paño (tapiz, repostero) colgado, con su vara y sus pliegues
//   bastidor      el bastidor de bordar en su pie, con la labor a medias
//   atril         el atril de pie con su libro abierto
//   repisa        una repisa en el muro, con lo que haya encima
//   escoba, cubo  lo que se deja en un rincón
// ====================================================================

const D = 'wooddark';

// ------------------------------------------------------------------ el escaño
// El banco de los salones y las cocinas: asiento con su faldón, el respaldo
// alto de tablas con su remate, los brazos y, si se pide, un cojín.
export function escano(ctx, x, y, z, rot, w = 1.6, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  wb.at(x, y, z, rot, () => {
    // los costados (de tablón), que suben a ser brazos
    for (const s of [-1, 1]) {
      const sx = s * (w / 2 - 0.03);
      wb.box(D, sx - 0.03, 0, -0.26, sx + 0.03, 0.72, 0.22, { ao: false, room, faces: 'tnsewb' });
      wb.box(D, sx - 0.04, 0.72, -0.26, sx + 0.04, 0.76, 0.26, { ao: false, room, faces: 'tnsewb', tint: [0.86, 0.78, 0.7] });
    }
    // el asiento y su faldón
    wb.box(D, -w / 2 + 0.06, 0.42, -0.24, w / 2 - 0.06, 0.47, 0.22, { ao: false, room, faces: 'tnsewb', sub: 9 });
    wb.box(D, -w / 2 + 0.06, 0.12, 0.18, w / 2 - 0.06, 0.42, 0.21, { ao: false, room, faces: 'tnsewb', sub: 9, tint: [0.78, 0.7, 0.62] });
    // el respaldo: tablas y su remate
    const n = Math.max(3, Math.round(w / 0.3));
    for (let k = 0; k < n; k++) {
      const a = -w / 2 + 0.06 + ((w - 0.12) * k) / n,
        b = -w / 2 + 0.06 + ((w - 0.12) * (k + 1)) / n - 0.004;
      wb.box('planks', a, 0.47, -0.26, b, 1.28, -0.235, { ao: false, room, faces: 'tnsewb', tint: [0.68 + (k % 2) * 0.05, 0.58, 0.46] });
    }
    wb.box(D, -w / 2, 1.28, -0.27, w / 2, 1.34, -0.22, { ao: false, room, faces: 'tnsewb', sub: 9 });
    if (o.cojin !== false) {
      const c = o.cojin ?? 'clothRed';
      wb.box(c, -w / 2 + 0.1, 0.47, -0.22, w / 2 - 0.1, 0.53, 0.19, { ao: false, room, faces: 'tnsew', tint: [0.8, 0.74, 0.7] });
    }
  });
  if (o.col !== false) P.colOBB(ctx, x - Math.sin(rot) * 0.02, z - Math.cos(rot) * 0.02, w / 2, 0.26, rot, y, y + 1.34);
}

// ------------------------------------------------------------------ la silla de tijera
// La jamuga: dos aspas de madera a los lados, unidas por travesaños; el
// asiento y el respaldo, de cuero tendido; las perillas de latón.
export function sillaTijera(ctx, x, y, z, rot, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  wb.at(x, y, z, rot, () => {
    for (const s of [-1, 1]) {
      const sx = s * 0.26;
      // el aspa: dos palos cruzados y el brazo encima
      P.rod(ctx, V(sx, 0, -0.24), V(sx, 0.62, 0.2), 0.018, 0.018, D, { room, segs: 6 });
      P.rod(ctx, V(sx, 0, 0.2), V(sx, 0.62, -0.24), 0.018, 0.018, D, { room, segs: 6 });
      P.rod(ctx, V(sx, 0.62, -0.3), V(sx, 0.62, 0.26), 0.02, 0.02, D, { room, segs: 6, caps: true });
      for (const zz of [-0.3, 0.26]) wb.cylinder('bronze', sx, 0.61, zz, 0.024, 0.024, 0.03, 8, { ao: false, room, capTop: true, capBot: true });
      // los respaldos (de cuero) suben por detrás
      P.rod(ctx, V(sx, 0.62, -0.28), V(sx * 1.04, 1.02, -0.36), 0.016, 0.014, D, { room, segs: 6 });
      wb.cylinder('bronze', sx * 1.04, 1.02, -0.36, 0.022, 0.012, 0.04, 8, { ao: false, room, capTop: true });
    }
    // los travesaños de abajo
    for (const zz of [-0.24, 0.2]) P.rod(ctx, V(-0.26, 0.02, zz), V(0.26, 0.02, zz), 0.016, 0.016, D, { room, segs: 6 });
    // el asiento (cuero tendido, algo caído en medio) y el respaldo
    wb.push();
    wb.translate(0, 0.43, -0.02);
    wb.rotateX(0.04);
    wb.box('leather', -0.25, -0.012, -0.2, 0.25, 0.0, 0.2, { ao: false, room, faces: 'tnsewb', tint: [0.62, 0.42, 0.3] });
    wb.pop();
    wb.push();
    wb.translate(0, 0.86, -0.33);
    wb.rotateX(-0.2);
    wb.box('leather', -0.27, -0.12, -0.008, 0.27, 0.12, 0.008, { ao: false, room, faces: 'tnsewb', tint: [0.62, 0.42, 0.3] });
    wb.pop();
  });
  if (o.col !== false) P.colOBB(ctx, x, z, 0.3, 0.3, rot, y, y + 0.7);
}

// ------------------------------------------------------------------ la alacena
// El armario de dos puertas, de bancal: los montantes que bajan a pies, el
// zócalo, la cornisa, las puertas de tablas con sus bisagras de hierro y la
// cerradura. Con una puerta abierta (o.abierta), se ven las baldas y lo que
// guardan.
export function alacena(ctx, x, y, z, rot, w = 1.2, h = 1.9, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  const rng = new RNG(o.seed ?? Math.round(x * 19 + z * 7));
  const d = 0.5;
  wb.at(x, y, z, rot, () => {
    // la caja (los costados, la trasera, el fondo y el techo)
    for (const s of [-1, 1]) wb.box(D, s * (w / 2 - 0.025) - 0.025, 0.06, -d / 2, s * (w / 2 - 0.025) + 0.025, h, d / 2 - 0.03, { ao: false, room, faces: 'nsewb', sub: 9 });
    wb.box('planks', -w / 2 + 0.05, 0.1, -d / 2, w / 2 - 0.05, h, -d / 2 + 0.02, { ao: false, room, faces: 's', sub: 9, tint: [0.56, 0.46, 0.36] });
    // los montantes de delante, que bajan a pies; el zócalo; la cornisa
    for (const s of [-1, 1]) wb.box(D, s * (w / 2 - 0.035) - 0.035, 0, d / 2 - 0.05, s * (w / 2 - 0.035) + 0.035, h, d / 2, { ao: false, room, faces: 'nsewb', tint: [0.84, 0.76, 0.68] });
    wb.box(D, -w / 2 + 0.07, 0.06, d / 2 - 0.05, w / 2 - 0.07, 0.18, d / 2 - 0.01, { ao: false, room, faces: 'tnsewb', sub: 9 });
    wb.box(D, -w / 2 - 0.03, h, -d / 2 - 0.01, w / 2 + 0.03, h + 0.07, d / 2 + 0.04, { ao: false, room, faces: 'tnsewb', sub: 9 });
    wb.box(D, -w / 2 + 0.07, h - 0.1, d / 2 - 0.05, w / 2 - 0.07, h, d / 2 - 0.01, { ao: false, room, faces: 'tnsewb', sub: 9 });
    // las baldas
    const ys = [0.18, 0.62, 1.06, 1.5].filter((yy) => yy < h - 0.2);
    for (const by of ys) wb.box(D, -w / 2 + 0.05, by, -d / 2 + 0.02, w / 2 - 0.05, by + 0.025, d / 2 - 0.06, { ao: false, room, faces: 'tnsewb', sub: 9 });
    // las puertas (la derecha, abierta, si se pide)
    const hw = (w - 0.14) / 2;
    for (const s of [-1, 1]) {
      const open = o.abierta && s > 0;
      wb.push();
      // la bisagra, en el canto de fuera
      wb.translate(s * (w / 2 - 0.07), 0, d / 2 - 0.03);
      if (open) wb.rotateY(s * -1.9);
      // (local: la puerta va de 0 a -s*hw en x)
      const x0 = Math.min(0, -s * hw),
        x1 = Math.max(0, -s * hw);
      for (let k = 0; k < 3; k++) {
        const a = x0 + ((x1 - x0) * k) / 3,
          b = x0 + ((x1 - x0) * (k + 1)) / 3 - 0.003;
        wb.box('planks', a, 0.2, -0.012, b, h - 0.12, 0.012, { ao: false, room, faces: 'tnsewb', tint: [0.7 + k * 0.04, 0.58, 0.46] });
      }
      for (const yy of [0.32, h - 0.3]) {
        wb.box(D, x0 + 0.02, yy - 0.04, 0.012, x1 - 0.02, yy + 0.04, 0.03, { ao: false, room, faces: 'tnsewb' });
        // la bisagra de hierro, de la jamba a media puerta
        wb.box('iron', s > 0 ? x1 - hw * 0.55 : x0, yy - 0.022, 0.03, s > 0 ? x1 : x0 + hw * 0.55, yy + 0.022, 0.036, { ao: false, room, faces: 'tnsewb' });
      }
      wb.pop();
    }
    // la cerradura, en la puerta de la izquierda
    {
      wb.box('iron', -0.075, h * 0.52 - 0.06, d / 2 - 0.006, -0.015, h * 0.52 + 0.06, d / 2 + 0.006, { ao: false, room, faces: 'tnsewb' });
      wb.box('black', -0.05, h * 0.52 - 0.025, d / 2 + 0.006, -0.04, h * 0.52 + 0.005, d / 2 + 0.007, { ao: false, room, faces: 's', grime: false });
    }
    // lo de dentro, si se ve
    if (o.abierta)
      for (const by of ys) {
        let px = 0.04;
        while (px < w / 2 - 0.2) {
          const q = rng.pick(['jarra', 'escudillas', 'panos', 'pan', 'nada']);
          if (q === 'jarra') P.jar(ctx, px + 0.08, by + 0.025, 0, 0.36, { collide: false, rot: rng.range(0, 6), room });
          else if (q === 'escudillas') for (let k = 0; k < 3; k++) wb.cylinder(D, px + 0.08, by + 0.025 + k * 0.03, 0, 0.06, 0.09, 0.03, 10, { ao: false, room, capTop: true, capBot: k === 0, tint: [0.72, 0.6, 0.48] });
          else if (q === 'panos') for (let k = 0; k < 3; k++) wb.box('linen', px, by + 0.025 + k * 0.04, -0.15, px + 0.22, by + 0.025 + k * 0.04 + 0.038, 0.12, { ao: false, room, faces: 'tnsew', tint: rng.pick([[0.86, 0.82, 0.72], [0.62, 0.3, 0.26], [0.36, 0.4, 0.56]]) });
          else if (q === 'pan') P.ellipsoid(ctx, 'hide', px + 0.1, by + 0.07, 0, 0.1, 0.05, 0.08, [0.72, 0.5, 0.3], { room });
          px += 0.25;
        }
      }
  });
  if (o.col !== false) P.colOBB(ctx, x, z, w / 2 + 0.03, d / 2 + 0.02, rot, y, y + h + 0.07);
}

// ------------------------------------------------------------------ el aparador
// El aparador bajo (la credencia): la caja con sus dos puertecillas, el
// tablero con la vajilla (jarros, escudillas, la fuente de peltre, un
// candil) y, colgado del muro, el escudillero con sus platos de canto.
export function aparador(ctx, x, y, z, rot, w = 1.6, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  const rng = new RNG(o.seed ?? Math.round(x * 23 + z * 11));
  const d = 0.48,
    H = 0.88;
  wb.at(x, y, z, rot, () => {
    wb.box(D, -w / 2 + 0.03, 0.08, -d / 2, w / 2 - 0.03, H - 0.04, d / 2 - 0.02, { ao: false, room, faces: 'nsewb', sub: 9, tint: [0.76, 0.66, 0.56] });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) wb.box(D, sx * (w / 2 - 0.03) - 0.035, 0, sz * (d / 2 - 0.035) - 0.035, sx * (w / 2 - 0.03) + 0.035, H - 0.04, sz * (d / 2 - 0.035) + 0.035, { ao: false, room, faces: 'nsewb' });
    wb.box(D, -w / 2 - 0.03, H - 0.04, -d / 2 - 0.02, w / 2 + 0.03, H, d / 2 + 0.03, { ao: false, room, faces: 'tnsewb', sub: 9 });
    // las puertecillas y sus tiradores
    for (const s of [-1, 1]) {
      const a = s < 0 ? -w / 2 + 0.1 : 0.02,
        b = s < 0 ? -0.02 : w / 2 - 0.1;
      wb.box('planks', a, 0.16, d / 2 - 0.02, b, H - 0.12, d / 2, { ao: false, room, faces: 'tnsewb', tint: [0.72, 0.6, 0.48] });
      wb.cylinder('iron', s * 0.06, (H + 0.04) / 2, d / 2 + 0.004, 0.012, 0.012, 0.02, 6, { ao: false, room, capTop: true });
    }
    // lo de encima: los jarros, las escudillas apiladas, la fuente, el candil
    const T = H;
    P.jar(ctx, -w / 2 + 0.22, T, -0.05, 0.42, { collide: false, rot: 0.6, room, tint: [0.66, 0.42, 0.28] });
    P.jar(ctx, -w / 2 + 0.44, T, 0.04, 0.32, { collide: false, rot: 2.2, room, tint: [0.6, 0.46, 0.32] });
    for (let k = 0; k < 4; k++) wb.cylinder(D, 0.0, T + k * 0.032, 0.02, 0.07, 0.1, 0.032, 10, { ao: false, room, capTop: true, capBot: k === 0, tint: [0.74, 0.62, 0.5] });
    wb.cylinder('silver', w / 2 - 0.3, T, -0.05, 0.12, 0.17, 0.03, 14, { ao: false, room, capBot: true, tint: [0.62, 0.62, 0.64] });
    wb.cylinder('black', w / 2 - 0.3, T + 0.02, -0.05, 0.12, 0.12, 0.004, 14, { ao: false, room, capTop: true, grime: false, tint: [0.4, 0.38, 0.36] });
    if (rng.chance(0.6)) P.ellipsoid(ctx, 'hide', w / 2 - 0.26, T + 0.06, -0.06, 0.08, 0.04, 0.06, [0.72, 0.5, 0.3], { room });
    // el escudillero: dos baldas con su barra y los platos de canto
    const yb = 1.25;
    for (const s of [-1, 1]) wb.box(D, s * (w / 2 - 0.06) - 0.025, yb, -d / 2, s * (w / 2 - 0.06) + 0.025, yb + 0.75, -d / 2 + 0.16, { ao: false, room, faces: 'tnsewb' });
    for (const k of [0, 1]) {
      const by = yb + k * 0.38;
      wb.box(D, -w / 2 + 0.08, by, -d / 2, w / 2 - 0.08, by + 0.025, -d / 2 + 0.15, { ao: false, room, faces: 'tnsewb', sub: 9 });
      wb.box(D, -w / 2 + 0.08, by + 0.13, -d / 2 + 0.13, w / 2 - 0.08, by + 0.15, -d / 2 + 0.15, { ao: false, room, faces: 'tnsewb', sub: 9 });
      const np = Math.floor((w - 0.3) / 0.24);
      for (let i = 0; i < np; i++) {
        if (rng.chance(0.15)) continue;
        const px = -w / 2 + 0.2 + i * 0.24;
        const r = rng.range(0.1, 0.12);
        wb.push();
        wb.translate(px, by + 0.025 + r, -d / 2 + 0.09);
        wb.rotateX(Math.PI / 2 - 0.22);
        const mat = rng.pick(['plaster', 'plaster', 'silver', D]);
        wb.cylinder(mat, 0, -0.01, 0, r, r * 0.8, 0.02, 12, { ao: false, room, capTop: true, capBot: true, tint: mat === 'plaster' ? rng.pick([[0.82, 0.74, 0.6], [0.64, 0.44, 0.3], [0.72, 0.66, 0.5]]) : mat === 'silver' ? [0.6, 0.6, 0.62] : [0.72, 0.6, 0.48] });
        wb.pop();
      }
    }
  });
  if (o.col !== false) P.colOBB(ctx, x, z, w / 2 + 0.03, d / 2 + 0.02, rot, y, y + H);
}

// ------------------------------------------------------------------ la tinaja
// La tinaja grande de barro (del aceite, del agua, del grano): panzuda, con su
// boca de labio y la tapa de tablas con su asa; a veces, el cazo encima.
export function tinaja(ctx, x, y, z, s = 1, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  const pts = [
    [0.001, 0],
    [0.17, 0.0],
    [0.28, 0.12],
    [0.36, 0.34],
    [0.37, 0.52],
    [0.32, 0.72],
    [0.22, 0.86],
    [0.2, 0.9],
    [0.23, 0.92],
    [0.23, 0.95],
    [0.19, 0.95],
  ].map(([r, h]) => new THREE.Vector2(r * s, h * s));
  wb.geometry('plaster', new THREE.LatheGeometry(pts, 14), M4(x, y, z, o.rot ?? 0), { ao: false, room, tint: o.tint ?? [0.62, 0.42, 0.3] });
  // el interior oscuro y la tapa
  wb.cylinder('black', x, y + 0.9 * s, z, 0.19 * s, 0.19 * s, 0.004, 12, { ao: false, room, capTop: true, grime: false });
  if (o.tapa !== false) {
    wb.cylinder('planks', x, y + 0.95 * s, z, 0.25 * s, 0.25 * s, 0.03, 12, { ao: false, room, capTop: true, capBot: true, tint: [0.78, 0.66, 0.52] });
    wb.box(D, x - 0.08 * s, y + 0.98 * s, z - 0.015, x + 0.08 * s, y + 0.98 * s + 0.04, z + 0.015, { ao: false, room, faces: 'tnsew' });
  }
  if (o.collide !== false) P.colOBB(ctx, x, z, 0.33 * s, 0.33 * s, Math.PI / 4, y, y + 0.95 * s);
  if (o.collide !== false) P.colOBB(ctx, x, z, 0.33 * s, 0.33 * s, 0, y, y + 0.95 * s);
}
// (una matriz de posición y giro en y)
function M4(x, y, z, ry = 0) {
  return new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), ry), V(1, 1, 1));
}

// ------------------------------------------------------------------ la cantarera
// El poyo de madera con los cántaros del agua, cada uno en su hueco, y el
// jarro de beber colgado de un clavo.
export function cantarera(ctx, x, y, z, rot, n = 3, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  const w = n * 0.42 + 0.1;
  wb.at(x, y, z, rot, () => {
    // el tablero con sus huecos (un marco por cántaro) sobre cuatro patas
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) wb.box(D, sx * (w / 2 - 0.04) - 0.03, 0, sz * 0.15 - 0.03, sx * (w / 2 - 0.04) + 0.03, 0.5, sz * 0.15 + 0.03, { ao: false, room, faces: 'nsewb' });
    for (const sz of [-1, 1]) wb.box(D, -w / 2, 0.46, sz * 0.17 - 0.025, w / 2, 0.52, sz * 0.17 + 0.025, { ao: false, room, faces: 'tnsewb', sub: 9 });
    for (let k = 0; k <= n; k++) wb.box(D, -w / 2 + 0.03 + k * 0.42, 0.46, -0.15, -w / 2 + 0.07 + k * 0.42, 0.52, 0.15, { ao: false, room, faces: 'tnsewb' });
    wb.box(D, -w / 2 + 0.05, 0.1, -0.15, w / 2 - 0.05, 0.13, 0.15, { ao: false, room, faces: 'tnsewb', sub: 9 });
  });
  const c = Math.cos(rot),
    sn = Math.sin(rot);
  for (let k = 0; k < n; k++) {
    const lx = -w / 2 + 0.26 + k * 0.42;
    if (o.falta === k) continue;
    P.jar(ctx, x + lx * c, y + 0.36, z - lx * sn, 0.9, { collide: false, rot: k * 1.7, room, tint: [0.68, 0.46, 0.32] });
  }
  if (o.col !== false) P.colOBB(ctx, x, z, w / 2, 0.2, rot, y, y + 0.9);
}

// ------------------------------------------------------------------ el escabel
// Un escabel bajo de tablas, para los pies o para arrodillarse.
export function escabel(ctx, x, y, z, rot, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  const w = o.w ?? 0.5;
  wb.at(x, y, z, rot, () => {
    wb.box(D, -w / 2, 0.16, -0.16, w / 2, 0.2, 0.16, { ao: false, room, faces: 'tnsewb' });
    for (const s of [-1, 1]) {
      wb.box(D, s * (w / 2 - 0.05) - 0.02, 0.05, -0.14, s * (w / 2 - 0.05) + 0.02, 0.16, 0.14, { ao: false, room, faces: 'nsew' });
      for (const f of [-1, 1]) wb.box(D, s * (w / 2 - 0.05) - 0.02, 0, f > 0 ? 0.05 : -0.15, s * (w / 2 - 0.05) + 0.02, 0.05, f > 0 ? 0.15 : -0.05, { ao: false, room, faces: 'nsew' });
    }
    if (o.cojin) wb.box(o.cojin, -w / 2 + 0.03, 0.2, -0.14, w / 2 - 0.03, 0.25, 0.14, { ao: false, room, faces: 'tnsew', tint: [0.8, 0.74, 0.7] });
  });
}

// ------------------------------------------------------------------ los almohadones
// Los almohadones del estrado, donde se sentaban las mujeres: unos sobre
// otros, de colores, con sus borlas en las esquinas.
export function almohadones(ctx, x, y, z, rot, n = 3, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  const rng = new RNG(o.seed ?? Math.round(x * 31 + z * 3));
  wb.at(x, y, z, rot, () => {
    let yy = 0;
    for (let k = 0; k < n; k++) {
      const mat = rng.pick(['clothRed', 'clothBlue', 'clothPurple', 'clothRed', 'linen']);
      const w = rng.range(0.5, 0.62),
        d = rng.range(0.42, 0.5),
        h = rng.range(0.09, 0.13);
      const ox = k ? rng.range(-0.08, 0.08) : 0,
        oz = k ? rng.range(-0.06, 0.06) : 0;
      wb.push();
      wb.translate(ox, yy, oz);
      wb.rotateY(k ? rng.range(-0.4, 0.4) : 0);
      // (el cuerpo y su vientre, más alto en medio)
      wb.box(mat, -w / 2, 0, -d / 2, w / 2, h * 0.7, d / 2, { ao: false, room, faces: 'tnsew', tint: [0.82, 0.76, 0.72] });
      wb.box(mat, -w / 2 + 0.06, h * 0.7, -d / 2 + 0.06, w / 2 - 0.06, h, d / 2 - 0.06, { ao: false, room, faces: 'tnsew', tint: [0.86, 0.8, 0.76] });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) wb.cylinder('gold', sx * (w / 2 + 0.02), h * 0.15, sz * (d / 2 + 0.02), 0.012, 0.02, 0.07, 5, { ao: false, room, capBot: true, tint: [0.9, 0.8, 0.5] });
      wb.pop();
      yy += h * 0.9;
    }
  });
}

// ------------------------------------------------------------------ la alfombra
// Una alfombra de lana (o de esparto, o.esparto): el campo y la cenefa
// alrededor, de otro color, con unos rombos en el campo. 3 cm de grueso,
// por encima de cualquier suelo (los hay con la cara a +2 cm).
export function alfombra(ctx, x, y, z, rot, w, d, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  const campo = o.campo ?? 'clothRed',
    cenefa = o.cenefa ?? 'clothBlue';
  const b = Math.min(0.16, Math.min(w, d) * 0.12);
  wb.at(x, y, z, rot, () => {
    wb.box(campo, -w / 2 + b, 0, -d / 2 + b, w / 2 - b, 0.03, d / 2 - b, { ao: false, room, faces: 't', sub: 9, tint: o.tint ?? [0.66, 0.56, 0.5] });
    // la cenefa, junto al campo (no encima)
    wb.box(cenefa, -w / 2, 0, -d / 2, w / 2, 0.032, -d / 2 + b, { ao: false, room, faces: 'tnsew', sub: 9, tint: [0.62, 0.58, 0.54] });
    wb.box(cenefa, -w / 2, 0, d / 2 - b, w / 2, 0.032, d / 2, { ao: false, room, faces: 'tnsew', sub: 9, tint: [0.62, 0.58, 0.54] });
    wb.box(cenefa, -w / 2, 0, -d / 2 + b, -w / 2 + b, 0.032, d / 2 - b, { ao: false, room, faces: 'tew', sub: 9, tint: [0.62, 0.58, 0.54] });
    wb.box(cenefa, w / 2 - b, 0, -d / 2 + b, w / 2, 0.032, d / 2 - b, { ao: false, room, faces: 'tew', sub: 9, tint: [0.62, 0.58, 0.54] });
    // los rombos del campo (a lo largo), un pelo por encima
    const n = Math.max(1, Math.round((w - 2 * b) / 0.7));
    for (let k = 0; k < n; k++) {
      const px = -w / 2 + b + ((w - 2 * b) * (k + 0.5)) / n;
      const r = Math.min(0.22, (d - 2 * b) * 0.3);
      wb.push();
      wb.translate(px, 0.031, 0);
      wb.rotateY(Math.PI / 4);
      wb.box(o.rombo ?? 'gold', -r * 0.7, 0, -r * 0.7, r * 0.7, 0.003, r * 0.7, { ao: false, room, faces: 't', tint: [0.62, 0.52, 0.32] });
      wb.pop();
    }
    // los flecos de los cabos
    for (const s of [-1, 1]) for (let k = 0; k < Math.round(d / 0.06); k++) wb.box('linen', s * (w / 2 + 0.03) - 0.03, 0, -d / 2 + 0.03 + k * 0.06, s * (w / 2 + 0.03) + 0.03, 0.01, -d / 2 + 0.045 + k * 0.06, { ao: false, room, faces: 't', tint: [0.7, 0.64, 0.52] });
  });
}

// ------------------------------------------------------------------ el paño
// Un paño (un tapiz, un repostero) colgado del muro, que mira hacia rot (en
// radianes, o 's', 'n', 'e', 'w'): la vara con sus soportes, la tela con sus
// pliegues (en tiras que entran y salen), las cenefas de arriba y de abajo
// y, en medio, su figura (o.figura: 'cruz', 'arbol', 'rombos'; o.liso, sin
// ella; o.plano: sin pliegues, para lo que se cose encima). y: el borde de
// arriba.
export function pano(ctx, x, y, z, rot, w = 1.6, h = 2.2, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  if (typeof rot === 'string') rot = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[rot];
  const mat = o.mat ?? 'clothRed',
    orla = o.orla ?? 'gold';
  wb.at(x, 0, z, rot, () => {
    // la vara y sus dos soportes
    wb.push();
    wb.translate(0, y + 0.03, 0.06);
    wb.rotateZ(Math.PI / 2);
    wb.cylinder(D, 0, -w / 2 - 0.08, 0, 0.02, 0.02, w + 0.16, 6, { ao: false, room, capTop: true, capBot: true });
    wb.pop();
    for (const s of [-1, 1]) wb.box('iron', s * (w / 2 + 0.03) - 0.012, y, 0, s * (w / 2 + 0.03) + 0.012, y + 0.06, 0.08, { ao: false, room, faces: 'tnsewb' });
    // la tela: tiras verticales que entran y salen (los pliegues)
    const n = Math.max(4, Math.round(w / 0.16));
    for (let k = 0; k < n; k++) {
      const a = -w / 2 + (w * k) / n,
        b = -w / 2 + (w * (k + 1)) / n;
      const fd = o.plano ? 0 : 0.035;
      const za = 0.045 + (k % 2 ? fd : 0),
        zb = 0.045 + ((k + 1) % 2 ? fd : 0);
      const hk = h * (1 + ((k * 37) % 5) * 0.004);
      const tk = o.tint ? o.tint.map((v) => v * (k % 2 ? 1.06 : 0.96)) : [0.78 + (k % 2) * 0.08, 0.72 + (k % 2) * 0.06, 0.68];
      wb.quad(mat, V(a, y - hk, za), V(b, y - hk, zb), V(b, y, zb), V(a, y, za), { ao: false, room, sub: 9, tint: tk });
      // la cenefa de abajo y la de arriba (un pelo por delante)
      for (const [y0, y1] of [
        [y - hk, y - hk + 0.14],
        [y - 0.12, y - 0.02],
      ])
        wb.quad(orla, V(a, y0, za + 0.004), V(b, y0, zb + 0.004), V(b, y1, zb + 0.004), V(a, y1, za + 0.004), { ao: false, room, sub: 9, tint: [0.7, 0.6, 0.4] });
    }
    // la figura de en medio (sobre la tela, por delante de los pliegues)
    const f = o.liso ? null : o.figura ?? 'cruz';
    const yc = y - h * 0.48;
    const zz = 0.088;
    if (f === 'cruz') {
      wb.box(orla, -0.05, yc - h * 0.26, zz, 0.05, yc + h * 0.26, zz + 0.006, { ao: false, room, faces: 's', tint: [0.72, 0.62, 0.42] });
      wb.box(orla, -w * 0.26, yc + h * 0.06, zz, w * 0.26, yc + h * 0.06 + 0.1, zz + 0.006, { ao: false, room, faces: 's', tint: [0.72, 0.62, 0.42] });
    } else if (f === 'arbol') {
      wb.box(orla, -0.03, yc - h * 0.3, zz, 0.03, yc + h * 0.05, zz + 0.006, { ao: false, room, faces: 's', tint: [0.6, 0.5, 0.34] });
      for (let k = 0; k < 5; k++) {
        const r = 0.08 + k * 0.03;
        wb.push();
        wb.translate(0, yc + h * 0.24 - k * 0.11, zz);
        wb.rotateZ(Math.PI / 4);
        wb.box(o.hoja ?? 'clothBlue', -r, -r, 0, r, r, 0.006 + k * 0.0005, { ao: false, room, faces: 's', tint: [0.5, 0.62, 0.42] });
        wb.pop();
      }
    } else if (f === 'rombos') {
      for (let k = 0; k < 3; k++) {
        wb.push();
        wb.translate(0, yc + h * 0.22 - k * h * 0.22, zz);
        wb.rotateZ(Math.PI / 4);
        wb.box(orla, -0.14, -0.14, 0, 0.14, 0.14, 0.006, { ao: false, room, faces: 's', tint: [0.72, 0.62, 0.42] });
        wb.pop();
      }
    }
  });
}

// ------------------------------------------------------------------ el bastidor
// El bastidor de bordar en su pie: el marco tenso con la labor a medias (el
// dibujo pasado y lo bordado), la aguja con su hebra colgando, y el cesto de
// las madejas al lado.
export function bastidor(ctx, x, y, z, rot, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  wb.at(x, y, z, rot, () => {
    // el pie: dos patas en T con su travesaño
    for (const s of [-1, 1]) {
      wb.box(D, s * 0.42 - 0.03, 0, -0.22, s * 0.42 + 0.03, 0.04, 0.22, { ao: false, room, faces: 'tnsew' });
      wb.box(D, s * 0.42 - 0.025, 0.04, -0.025, s * 0.42 + 0.025, 0.72, 0.025, { ao: false, room, faces: 'nsew' });
    }
    wb.box(D, -0.42, 0.2, -0.02, 0.42, 0.25, 0.02, { ao: false, room, faces: 'tnsewb' });
    // el marco, algo inclinado hacia quien borda
    wb.push();
    wb.translate(0, 0.76, 0);
    wb.rotateX(-0.75);
    for (const s of [-1, 1]) wb.box(D, -0.48, -0.025, s * 0.32 - 0.025, 0.48, 0.025, s * 0.32 + 0.025, { ao: false, room, faces: 'tnsewb' });
    for (const s of [-1, 1]) wb.box(D, s * 0.45 - 0.02, -0.02, -0.3, s * 0.45 + 0.02, 0.02, 0.3, { ao: false, room, faces: 'tnsewb' });
    // la tela y la labor
    wb.box('linen', -0.43, -0.004, -0.3, 0.43, 0.004, 0.3, { ao: false, room, faces: 'tb', tint: [0.9, 0.86, 0.76] });
    for (const [a, b, c, d, m] of [
      [-0.3, -0.2, 0.05, 0.2, 'clothRed'],
      [-0.05, -0.18, 0.2, 0.0, 'clothBlue'],
      [-0.2, 0.05, -0.05, 0.2, 'gold'],
    ])
      wb.box(m, a, 0.004, b, c, 0.007, d, { ao: false, room, faces: 't', tint: [0.7, 0.62, 0.58] });
    // la aguja y su hebra
    wb.box('silver', 0.1, 0.007, 0.08, 0.16, 0.011, 0.084, { ao: false, room, faces: 'tnsew' });
    wb.box('clothRed', 0.159, -0.16, 0.08, 0.163, 0.011, 0.083, { ao: false, room, faces: 'nsew' });
    wb.pop();
  });
  const c = Math.cos(rot),
    sn = Math.sin(rot);
  P.basket(ctx, x + 0.62 * c, y, z - 0.62 * sn, { room });
  if (o.col !== false) P.colOBB(ctx, x, z, 0.5, 0.26, rot, y, y + 1.0);
}

// ------------------------------------------------------------------ el atril
// El atril de pie: el pie de tres patas, el fuste y el tablero inclinado
// con su libro abierto (y la cinta de seda que marca la hoja).
export function atril(ctx, x, y, z, rot, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  wb.at(x, y, z, rot, () => {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      P.rod(ctx, V(Math.cos(a) * 0.28, 0, Math.sin(a) * 0.28), V(0, 0.3, 0), 0.025, 0.03, D, { room, segs: 4 });
    }
    wb.cylinder(D, 0, 0.28, 0, 0.045, 0.035, 0.85, 6, { ao: false, room });
    wb.push();
    wb.translate(0, 1.14, 0);
    wb.rotateX(-0.55);
    wb.box(D, -0.3, -0.02, -0.22, 0.3, 0.02, 0.22, { ao: false, room, faces: 'tnsewb' });
    wb.box(D, -0.3, 0.02, 0.2, 0.3, 0.06, 0.23, { ao: false, room, faces: 'tnsewb' });
    if (o.libro !== false) {
      // el libro abierto: las dos tapas, las hojas en lomo y la cinta
      wb.box('leather', -0.26, 0.02, -0.17, 0.26, 0.032, 0.17, { ao: false, room, faces: 'tnsew', tint: [0.5, 0.3, 0.2] });
      for (const s of [-1, 1]) {
        wb.push();
        wb.translate(s * 0.005, 0.032, 0);
        wb.rotateZ(-s * 0.06);
        wb.box('linen', s > 0 ? 0 : -0.24, 0, -0.155, s > 0 ? 0.24 : 0, 0.025, 0.155, { ao: false, room, faces: 'tnsew', tint: [0.92, 0.86, 0.72] });
        wb.pop();
      }
      wb.box('clothRed', 0.0, 0.05, 0.12, 0.012, 0.052, 0.3, { ao: false, room, faces: 'tb' });
    }
    wb.pop();
  });
  if (o.col !== false) P.colOBB(ctx, x, z, 0.3, 0.3, rot, y, y + 1.2);
}

// ------------------------------------------------------------------ la repisa
// Una repisa clavada al muro (dir: hacia dónde mira), sobre dos ménsulas, a
// la altura y, con lo que haya encima (o.cosas: 'jarra', 'escudilla',
// 'vela', 'libro', 'cesta', 'candil').
export function repisa(ctx, x, y, z, dir, w = 1.0, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  const rot = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[dir];
  const rng = new RNG(o.seed ?? Math.round(x * 7 + z * 13));
  const yy = o.alto ?? 1.5;
  wb.at(x, y, z, rot, () => {
    wb.box(D, -w / 2, yy, 0, w / 2, yy + 0.035, 0.24, { ao: false, room, faces: 'tnsewb', sub: 9 });
    for (const s of [-1, 1]) palo(wb, V(s * (w / 2 - 0.12), yy - 0.22, 0.02), V(s * (w / 2 - 0.12), yy, 0.2), 0.03, D, { room });
    const cosas = o.cosas ?? ['jarra', 'escudilla', 'vela'];
    const n = cosas.length;
    cosas.forEach((q, k) => {
      const px = -w / 2 + (w * (k + 0.5)) / n;
      if (q === 'jarra') P.jar(ctx, px, yy + 0.035, 0.12, 0.38, { collide: false, rot: rng.range(0, 6), room });
      else if (q === 'escudilla') for (let i = 0; i < 2; i++) wb.cylinder(D, px, yy + 0.035 + i * 0.03, 0.12, 0.06, 0.09, 0.03, 10, { ao: false, room, capTop: true, capBot: i === 0, tint: [0.74, 0.62, 0.5] });
      else if (q === 'vela') {
        wb.cylinder('bronze', px, yy + 0.035, 0.12, 0.05, 0.04, 0.02, 8, { ao: false, room, capTop: true });
        wb.cylinder('candle', px, yy + 0.055, 0.12, 0.018, 0.017, 0.1, 6, { ao: false, room, capTop: true, grime: false });
      } else if (q === 'libro') wb.box('leather', px - 0.13, yy + 0.035, 0.03, px + 0.13, yy + 0.09, 0.21, { ao: false, room, faces: 'tnsew', tint: [0.5, 0.3, 0.22] });
      else if (q === 'cesta') {
        wb.cylinder('straw', px, yy + 0.035, 0.12, 0.09, 0.11, 0.12, 10, { ao: false, room, capBot: true, tint: [0.62, 0.5, 0.36] });
        wb.cylinder('black', px, yy + 0.13, 0.12, 0.1, 0.1, 0.004, 10, { ao: false, room, capTop: true, grime: false });
      } else if (q === 'candil') {
        // el candil de aceite, de barro, con su piquera
        wb.cylinder('plaster', px, yy + 0.035, 0.12, 0.06, 0.07, 0.04, 9, { ao: false, room, capTop: true, tint: [0.6, 0.44, 0.3] });
        wb.box('plaster', px + 0.05, yy + 0.05, 0.11, px + 0.1, yy + 0.07, 0.13, { ao: false, room, faces: 'tnsew', tint: [0.6, 0.44, 0.3] });
      }
    });
  });
}

// ------------------------------------------------------------------ la escoba y el cubo
// La escoba de ramas, apoyada en un muro (dir: hacia dónde mira el muro), y
// el cubo de tablas con su asa.
export function escoba(ctx, x, y, z, dir, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  const F = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] }[dir];
  const top = V(x - F[0] * 0.02, y + 1.35, z - F[1] * 0.02),
    bot = V(x + F[0] * 0.3, y + 0.3, z + F[1] * 0.3);
  P.rod(ctx, bot, top, 0.016, 0.014, D, { room, segs: 6 });
  // las ramas: un haz que se abre hacia el suelo
  const rng = new RNG(Math.round(x * 3 + z * 5));
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    P.rod(ctx, V(bot.x, bot.y + 0.05, bot.z), V(bot.x + F[0] * 0.12 + Math.cos(a) * 0.07, y + 0.005, bot.z + F[1] * 0.12 + Math.sin(a) * 0.07), 0.012, 0.006, 'straw', { room, segs: 4, tint: [0.6, 0.48, 0.32] });
  }
  wb.cylinder('rope', bot.x, bot.y + 0.02, bot.z, 0.03, 0.03, 0.06, 6, { ao: false, room, capTop: true });
  void rng;
}
export function cubo(ctx, x, y, z, o = {}) {
  const wb = ctx.wb;
  const room = o.room;
  wb.cylinder('planks', x, y, z, 0.15, 0.18, 0.32, 10, { ao: false, room, capBot: true, uv: 1.2, tint: [0.8, 0.7, 0.58] });
  for (const yy of [0.05, 0.25]) wb.cylinder('iron', x, y + yy, z, 0.152 + yy * 0.1, 0.156 + yy * 0.1, 0.03, 10, { ao: false, room });
  wb.cylinder(o.lleno ? 'water' : 'black', x, y + 0.26, z, 0.17, 0.17, 0.004, 10, { ao: false, room, capTop: true, grime: false });
  // el asa
  const g = new THREE.TorusGeometry(0.17, 0.007, 4, 10, Math.PI);
  wb.geometry('iron', g, M4(x, y + 0.32, z, o.rot ?? 0), { ao: false, room });
  if (o.collide !== false) P.colOBB(ctx, x, z, 0.15, 0.15, 0, y, y + 0.32);
}
