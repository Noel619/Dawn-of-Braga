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
