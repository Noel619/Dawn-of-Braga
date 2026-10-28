// Lo de los tejados del barrio de los Pellejeros: la viga que cruza la
// calleja (cayó del tejado hundido de la casa quemada y quedó apoyada en el
// de enfrente: se pasa por ella haciendo equilibrio), el hundimiento, las
// chimeneas, y la casa del palomero: su sobrado reventado por la esquina, su
// desván de las palomas y el palomar de la cumbrera, donde subió el aprendiz
// del herrero con la piedra de afilar.
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import * as P from './props.js';
import { BR } from './level_barrio.js';
import { chest, bowl } from './level_souto.js';
import { bakeCorpse } from '../entities/models.js';
import { palo, cuero } from './barrio_atrezo.js';
import { quadN, V } from './kit_casa.js';

const luna = (ctx, x, y, z, room, i = 0.45, r = 4) => ctx.lights.push({ x, y, z, r: 0.5, g: 0.6, b: 0.85, radius: r, intensity: i, room });
const SOOT = [0.3, 0.26, 0.24];

// ------------------------------------------------------------ la viga
// La hilera de la quemada (la viga de la cumbrera): con el fuego se partió,
// cayó al norte con tres pares todavía clavados, cruzó la calleja y quedó con
// la punta en el faldón de la casa de enfrente; la cola, en lo que queda de su
// cumbrera. Se anda por ella (un palmo de ancho, cuesta arriba) y, mientras,
// hay que guardar el equilibrio (game/cornisas.js).
export function vigaCalleja(ctx, L) {
  const wb = ctx.wb;
  const B = BR.viga;
  const r = B.w / 2;
  // (las caras de arriba: de la punta, en el tejado de enfrente, a la cola)
  const ta = V(B.xa, B.y0, B.z0),
    tb = V(B.xb, B.y1, B.z1);
  const a = ta.clone().add(V(0, -r, 0)),
    b = tb.clone().add(V(0, -r, 0));
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const dir = d.clone().normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), dir);
  // el madero: la mitad de abajo, sana; la de arriba, negra de fuego
  wb.geometry('timber', new THREE.BoxGeometry(B.w, B.w, len * 0.5), new THREE.Matrix4().compose(a.clone().lerp(b, 0.25), q, V(1, 1, 1)), { ao: false, tint: [0.6, 0.52, 0.44] });
  wb.geometry('timber', new THREE.BoxGeometry(B.w * 0.97, B.w * 0.97, len * 0.5), new THREE.Matrix4().compose(a.clone().lerp(b, 0.75), q, V(1, 1, 1)), { ao: false, tint: SOOT });
  // las puntas: astillas
  const rng = new RNG(3101);
  for (const [p, sg] of [
    [a, -1],
    [b, 1],
  ])
    for (let i = 0; i < 5; i++) {
      const o = V(rng.range(-r * 0.7, r * 0.7), rng.range(-r * 0.7, r * 0.7), 0).applyQuaternion(q);
      palo(wb, p.clone().add(o), p.clone().add(o).add(dir.clone().multiplyScalar(sg * rng.range(0.12, 0.32))), 0.03, 'timber', { tint: sg > 0 ? SOOT : [0.68, 0.58, 0.48] });
    }
  // los tres pares que siguen clavados a ella (rotos, de través, con alguna
  // teja todavía encima) y los clavos
  const side = V(-dir.z, 0, dir.x).normalize();
  for (const [t, sg, l1, l2] of [
    [0.6, 1, 1.4, 0.5],
    [0.72, -1, 0.9, 1.6],
    [0.86, 1, 2.0, 0.7],
  ]) {
    const p = a.clone().lerp(b, t).add(V(0, r * 0.6, 0));
    const e1 = p.clone().add(side.clone().multiplyScalar(sg * l1)).add(V(0, -l1 * 0.45, 0));
    const e2 = p.clone().add(side.clone().multiplyScalar(-sg * l2)).add(V(0, -l2 * 0.5, 0));
    palo(wb, p, e1, 0.055, 'timber', { tint: SOOT });
    palo(wb, p, e2, 0.055, 'timber', { tint: SOOT });
    // tejas sueltas sobre el par
    for (let k = 0; k < 2; k++) {
      const tt = rng.range(0.3, 0.8);
      const c = p.clone().lerp(e1, tt).add(V(0, 0.07, 0));
      wb.push();
      wb.translate(c.x, c.y, c.z);
      wb.rotateY(Math.atan2(dir.x, dir.z) + rng.range(-0.3, 0.3));
      wb.rotateX(rng.range(-0.3, 0.3));
      wb.rotateZ(sg * 0.42);
      wb.box('roof', -0.17, -0.025, -0.24, 0.17, 0.025, 0.24, { ao: false, tint: [0.62, 0.48, 0.42] });
      wb.pop();
    }
  }
  for (let t = 0.12; t < 0.9; t += 0.16) {
    const p = a.clone().lerp(b, t);
    wb.box('iron', p.x - 0.015, p.y + r - 0.01, p.z - 0.015, p.x + 0.015, p.y + r + 0.05, p.z + 0.015, { ao: false });
  }
  // por dónde se anda: la cara de arriba, en trozos (rampas a lo largo de z,
  // cada una donde pasa la viga) y, para la cámara, el madero
  const n = Math.ceil((B.z1 - B.z0) / 0.4);
  for (let k = 0; k < n; k++) {
    const u0 = k / n,
      u1 = (k + 1) / n;
    const za = B.z0 + (B.z1 - B.z0) * u0,
      zb = B.z0 + (B.z1 - B.z0) * u1;
    const xm = B.xa + (B.xb - B.xa) * ((u0 + u1) / 2);
    ctx.col.addRamp(xm - r, za, xm + r, zb, 'z', za, B.y0 + (B.y1 - B.y0) * u0, zb, B.y0 + (B.y1 - B.y0) * u1);
  }
  (L.ledges || (L.ledges = [])).push({ id: 'viga_calleja', a: [B.xa, B.y0, B.z0 + 0.1], b: [B.xb, B.y1, B.z1 - 0.15], w: B.w, fall: 'calleja' });
}

// Bordes rotos de un boquete en un faldón: tejas sueltas, levantadas y
// medio caídas hacia dentro, a lo largo del borde (para que no sea un corte a
// escuadra). H: el hueco [x0, z0, x1, z1]; Y(x, z): la altura de las tejas.
function bordeTejas(ctx, H, Y, seed, room) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const [x0, z0, x1, z1] = H;
  const per = [];
  for (let x = x0; x < x1; x += 0.28) per.push([x, z0, 0, -1], [x, z1, 0, 1]);
  for (let z = z0; z < z1; z += 0.28) per.push([x0, z, -1, 0], [x1, z, 1, 0]);
  for (const [x, z, nx, nz] of per) {
    if (rng.chance(0.25)) continue;
    // (hacia dentro del hueco: las que asoman, colgando)
    const k = rng.range(-0.12, 0.38);
    const px = x - nx * k,
      pz = z - nz * k;
    wb.push();
    wb.translate(px, Y(px, pz) + 0.02, pz);
    wb.rotateY(rng.range(-0.5, 0.5));
    wb.rotateX(nz * rng.range(0.1, 0.7));
    wb.rotateZ(-nx * rng.range(0.1, 0.7));
    wb.box('roof', -0.15, -0.025, -0.2, 0.15, 0.025, 0.2, { ao: false, tint: [0.55, 0.42, 0.36], room });
    wb.pop();
  }
}

// ------------------------------------------------------------ la quemada
// El hundimiento del tejado de la quemada: por el agujero, los pares negros,
// partidos, unos colgando y otros caídos dentro; el tizne en el borde.
export function tejadoQuemado(ctx, L) {
  const wb = ctx.wb;
  const H = BR.hundido;
  const slope = 0.5;
  const Y = (z) => 9.5 - (50.5 - z) * slope;
  const rng = new RNG(3201);
  // los pares (de la cumbrera al alero), cada 60 cm: los que quedan enteros y
  // los rotos
  for (let x = H.x0 + 0.2; x < H.x1; x += 0.6) {
    const k = rng.next();
    if (k < 0.35) continue;
    const top = V(x, Y(H.z1) - 0.2, H.z1 + 0.1);
    if (k < 0.65) {
      // roto: un trozo desde la cumbrera, que cuelga
      const len = rng.range(0.6, 1.6);
      palo(wb, top, V(x + rng.range(-0.1, 0.1), top.y - len * 0.8, top.z - len * 0.6), 0.06, 'timber', { tint: SOOT });
    } else palo(wb, top, V(x, Y(H.z0) - 0.2, H.z0 - 0.1), 0.06, 'timber', { tint: SOOT });
  }
  // las tejas del borde, sueltas y medio caídas
  bordeTejas(ctx, [H.x0, H.z0, H.x1, H.z1], (x, z) => Y(z), 3203);
  // dentro, en el suelo de arriba, lo que cayó: tejas, pares, ceniza
  wb.setRoom('s31');
  P.rubble(ctx, (H.x0 + H.x1) / 2, 4.05, (H.z0 + H.z1) / 2, 14, 3202, 1.2, { mat: 'roof', scale: 0.9 });
  for (let i = 0; i < 4; i++) {
    const x = rng.range(H.x0 + 0.3, H.x1 - 0.3);
    palo(wb, V(x, 4.1, rng.range(H.z0, H.z1)), V(x + rng.range(-0.8, 0.8), 4.1 + rng.range(0.4, 1.4), rng.range(H.z0, H.z1)), 0.06, 'timber', { tint: SOOT, room: 's31' });
  }
  wb.setRoom(null);
  luna(ctx, (H.x0 + H.x1) / 2, 6.6, (H.z0 + H.z1) / 2, 's31', 0.7, 5);
  if (ctx.shafts) ctx.shafts.push({ a: [31.8, 9.2, 48.1], b: [31.5, 4.1, 48.4], w: 1.6, color: 0x9fb2d8 });
}

// Una chimenea de piedra sobre un tejado (de yBase, dentro del tejado, a
// yTop), con su remate; choca.
export function chimenea(ctx, x, z, yBase, yTop, s = 0.38, o = {}) {
  const wb = ctx.wb;
  wb.box('wallstone', x - s, yBase, z - s, x + s, yTop, z + s, { ao: false, sub: 2, faces: 'nsewt' });
  wb.box('ashlar', x - s - 0.08, yTop, z - s - 0.08, x + s + 0.08, yTop + 0.16, z + s + 0.08, { ao: false });
  wb.box('black', x - s + 0.1, yTop + 0.161, z - s + 0.1, x + s - 0.1, yTop + 0.165, z + s - 0.1, { ao: false, faces: 't', grime: false });
  ctx.col.add(x - s, yBase, z - s, x + s, yTop + 0.16, z + s);
  if (o.smoke && ctx.fires) ctx.fires.push({ x, y: yTop + 0.3, z, s: 0.8, smoke: true, light: false, glow: false });
}

// ------------------------------------------------------------ el palomero
// El sobrado (la planta de arriba, a la que se entra por el boquete de la
// esquina), el desván de las palomas y el palomar de la cumbrera.
export function palomero(ctx, L, h) {
  const wb = ctx.wb;
  const I = h.I;
  const r2 = h.rooms[2],
    r3 = h.rooms[3];
  const y2 = 7.25,
    y3 = 10.25;
  // ---- el boquete del sur: el muro reventado (las piedras sueltas del
  // borde, mordido, y lo que se cayó, dentro y fuera, sobre las tejas)
  wb.setRoom(r2);
  P.rubble(ctx, 64.0, y2, 42.9, 12, 3301, 0.9, { mat: 'wallstone', scale: 1.0 });
  palo(wb, V(62.8, y2 + 2.3, 43.7), V(63.6, y2 + 0.2, 42.6), 0.11, 'timber', { tint: [0.55, 0.48, 0.42], room: r2 });
  wb.setRoom(null);
  const rb = new RNG(3306);
  for (let i = 0; i < 16; i++) {
    // (alrededor del hueco: a los lados y encima, asomando del muro)
    const u = rb.next();
    const x = u < 0.35 ? 63.2 + rb.range(-0.15, 0.1) : u < 0.7 ? 64.8 + rb.range(-0.1, 0.15) : rb.range(63.1, 64.9);
    const y = u < 0.7 ? y2 + rb.range(0.1, 2.4) : y2 + 2.4 + rb.range(-0.15, 0.05);
    P.roughStone(ctx, x, y, 43.78 + rb.range(-0.05, 0.12), rb.range(0.16, 0.26), 3307 + i, { mat: 'wallstone', block: true, sink: 0.4 });
  }
  P.rubble(ctx, 64.2, 6.85, 44.75, 9, 3302, 0.75, { mat: 'wallstone', scale: 0.9 });
  wb.setRoom(r2);
  // ---- el sobrado: el grano, las jaulas, la cama del palomero, la
  // escalera de abajo hundida bajo las vigas que cayeron
  for (const [x, z, n] of [
    [70.6, 31.3, 4],
    [70.8, 33.0, 3],
    [62.5, 31.4, 3],
  ])
    P.sacks(ctx, x, y2, z, n, Math.round(x * 10 + z));
  P.bed(ctx, 69.8, y2, 41.6, 0);
  chest(ctx, 71.0, y2, 39.3, -Math.PI / 2, r2, 0.9);
  P.table(ctx, 68.6, y2, 36.4, 1.4, 0.8, Math.PI / 2);
  bowl(ctx, 68.6, y2 + 0.8, 36.2, 0.13, r2, ['straw', [0.8, 0.7, 0.4]]);
  for (const [x, z] of [
    [62.4, 36.2],
    [62.4, 37.6],
    [62.4, 39.0],
  ])
    jaulaPalomas(ctx, x, y2, z, r2, Math.round(x * 7 + z * 3));
  // la escalera de abajo, con las vigas y las tejas que le cayeron encima
  wb.box('wooddark', 69.4, y2 - 0.05, 30.6, 70.6, y2 + 0.02, 33.4, { ao: false, room: r2, faces: 't' });
  P.rubble(ctx, 70.0, y2, 32.0, 10, 3303, 0.7, { mat: 'roof', scale: 0.8 });
  palo(wb, V(69.0, y2, 30.8), V(71.0, y2 + 1.4, 33.2), 0.1, 'timber', { tint: [0.55, 0.48, 0.42], room: r2 });
  palo(wb, V(71.3, y2 + 0.2, 31.0), V(69.2, y2 + 1.1, 33.6), 0.09, 'timber', { tint: [0.55, 0.48, 0.42], room: r2 });
  ctx.col.add(69.0, y2, 30.5, 71.5, y2 + 1.4, 33.8);
  P.candles(ctx, 68.6, y2 + 0.8, 36.6, 2, 3304, { room: r2, radius: 4.5, intensity: 0.6, spread: 0.1 });
  luna(ctx, 64.0, y2 + 1.6, 43.3, r2, 0.6, 5);
  luna(ctx, 61.6, y2 + 1.6, 36.0, r2, 0.45);
  luna(ctx, 61.6, y2 + 1.6, 40.0, r2, 0.45);
  wb.setRoom(null);
  // ---- el desván de las palomas: los nidales por los muros, las plumas
  wb.setRoom(r3);
  const rng = new RNG(3305);
  for (const x of [I.x0 + 0.05, I.x1 - 0.32]) for (let z = 38.6; z < 43.2; z += 0.55) nidal(ctx, x, y3, z, r3, rng);
  for (let i = 0; i < 12; i++) wb.box('linen', rng.range(63.5, 69.5), y3 + 0.005, rng.range(38.5, 43.3), rng.range(63.5, 69.5) + 0.06, y3 + 0.01, rng.range(38.5, 43.3) + 0.03, { ao: false, room: r3, faces: 't', grime: false, tint: [0.75, 0.75, 0.75] });
  luna(ctx, 66.5, y3 + 1.4, 38.0, r3, 0.6, 5);
  wb.setRoom(null);
  palomar(ctx, L);
}

// Una jaula de palomas (de mimbre y varas), vacía, con la puerta abierta.
function jaulaPalomas(ctx, x, y, z, room, seed) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const w = 0.7,
    d = 0.5,
    hh = 0.55;
  for (let i = 0; i <= 6; i++) {
    const u = -w / 2 + (i * w) / 6;
    wb.box('wooddark', x - 0.008 + (d / 2) * 0, y, z + u - 0.008, x + 0.008, y + hh, z + u + 0.008, { ao: false, room });
    wb.box('wooddark', x + d - 0.008, y, z + u - 0.008, x + d + 0.008, y + hh, z + u + 0.008, { ao: false, room });
  }
  wb.box('planks', x, y, z - w / 2, x + d, y + 0.03, z + w / 2, { ao: false, room, tint: [0.7, 0.62, 0.52] });
  wb.box('planks', x, y + hh, z - w / 2, x + d, y + hh + 0.03, z + w / 2, { ao: false, room, tint: [0.7, 0.62, 0.52] });
  if (rng.chance(0.5)) wb.box('linen', x + 0.1, y + 0.031, z - 0.1, x + 0.3, y + 0.04, z + 0.1, { ao: false, room, grime: false, tint: [0.6, 0.6, 0.6] });
  P.colOBB(ctx, x + d / 2, z, d / 2, w / 2, 0, y, y + hh + 0.03);
}

// Un nidal de palomas: la caja de tablas abierta por delante, contra el muro.
function nidal(ctx, x, y, z, room, rng) {
  const wb = ctx.wb;
  for (let k = 0; k < 2; k++) {
    const yy = y + 0.05 + k * 0.4;
    wb.box('planks', x, yy, z - 0.24, x + 0.28, yy + 0.03, z + 0.24, { ao: false, room, tint: [0.62, 0.55, 0.47] });
    wb.box('planks', x, yy, z - 0.25, x + 0.28, yy + 0.36, z - 0.22, { ao: false, room, tint: [0.62, 0.55, 0.47] });
    if (rng.chance(0.4)) wb.box('straw', x + 0.04, yy + 0.03, z - 0.18, x + 0.24, yy + 0.08, z + 0.15, { ao: false, room, tint: [0.7, 0.62, 0.4] });
  }
}

// El palomar de la cumbrera: la torrecilla de entramado, de tres por cinco,
// con su tejadillo a cuatro aguas y las troneras de las palomas; dentro, el
// suelo (y, al sur, el hueco de la escalera que sube del desván). Arriba, el
// aprendiz del herrero, que subió con los vecinos y aquí se quedó, con la
// piedra de afilar bendita de su maestro en las manos.
function palomar(ctx, L) {
  const wb = ctx.wb;
  const D = BR.palomar;
  const room = 'palomar';
  const t = 0.25;
  const y0 = 12.2,
    yT = D.top;
  // los muros (por fuera y por dentro), con sus troneras; en el del sur, la
  // boca de la escalera que sube del desván
  const walls = [
    ['n', D.x0, D.z0, D.x1, D.z0 + t],
    ['s', D.x0, D.z1 - t, D.x1, D.z1],
    ['w', D.x0, D.z0 + t, D.x0 + t, D.z1 - t],
    ['e', D.x1 - t, D.z0 + t, D.x1, D.z1 - t],
  ];
  for (const [side, x0, z0, x1, z1] of walls) {
    const alongX = side === 'n' || side === 's';
    const a0 = alongX ? x0 : z0,
      a1 = alongX ? x1 : z1;
    // (las troneras, en fila, a media altura; en el oeste, la ventana desde
    // la que se ve el barrio entero)
    const holes = [];
    const n = Math.floor((a1 - a0) / 0.6);
    for (let i = 0; i < n; i++) {
      const u = a0 + 0.3 + i * ((a1 - a0 - 0.6) / Math.max(1, n - 1));
      holes.push({ a0: u - 0.11, a1: u + 0.11, y0: D.y + 1.75, y1: D.y + 1.95 });
    }
    if (side === 'w') holes.splice(0, holes.length, { a0: 33.9, a1: 34.9, y0: D.y + 0.9, y1: D.y + 2.0 });
    if (side === 's') holes.splice(0, holes.length, { a0: 65.85, a1: 67.15, y0: y0, y1: D.y + 1.65 });
    const outF = side,
      inF = { n: 's', s: 'n', e: 'w', w: 'e' }[side];
    let cur = a0;
    const piece = (u0, v0, u1, v1, faces) => {
      if (u1 - u0 < 0.005 || v1 - v0 < 0.005) return;
      const b = alongX ? [u0, v0, z0, u1, v1, z1] : [x0, v0, u0, x1, v1, u1];
      wb.box('plaster', ...b, { ao: false, sub: 1.6, faces: outF + faces, tint: [0.84, 0.8, 0.72] });
      wb.box('plaster', ...b, { ao: false, sub: 1.6, faces: inF, room, tint: [0.7, 0.66, 0.6] });
      ctx.col.add(...b);
    };
    for (const hh of holes) {
      piece(cur, y0, hh.a0, yT, alongX ? 'e' : 's');
      piece(hh.a0, y0, hh.a1, hh.y0, 't');
      piece(hh.a0, hh.y1, hh.a1, yT, 'b');
      cur = hh.a1;
    }
    piece(cur, y0, a1, yT, holes.length ? (alongX ? 'w' : 'n') : '');
  }
  // el entramado de fuera: los pies derechos de las esquinas y la carrera
  for (const [x, z] of [
    [D.x0, D.z0],
    [D.x1, D.z0],
    [D.x0, D.z1],
    [D.x1, D.z1],
  ])
    wb.box('timber', x - 0.1, y0, z - 0.1, x + 0.1, yT, z + 0.1, { ao: false });
  wb.box('timber', D.x0 - 0.12, yT - 0.18, D.z0 - 0.12, D.x1 + 0.12, yT, D.z1 + 0.12, { ao: false, faces: 'nsewb' });
  // el tejadillo a cuatro aguas, y el canto
  const ov = 0.35;
  wb.pyramid('roof', (D.x0 + D.x1) / 2, (D.z0 + D.z1) / 2, D.x1 - D.x0 + ov * 2, D.z1 - D.z0 + ov * 2, yT - 0.1, 1.5, {});
  wb.box('wooddark', D.x0 - ov, yT - 0.12, D.z0 - ov, D.x1 + ov, yT - 0.1, D.z1 + ov, { ao: false, faces: 'b', room, tint: [0.5, 0.45, 0.4] });
  ctx.col.addCam(D.x0, yT, D.z0, D.x1, yT + 1.4, D.z1);
  // el suelo y su colisión (la escalera llega a su borde del sur)
  const zs = 36.4;
  wb.box('planks', D.x0 + t, D.y - 0.2, D.z0 + t, D.x1 - t, D.y, zs, { ao: false, room, faces: 'tb', tint: [0.7, 0.62, 0.52] });
  ctx.col.add(D.x0 + t, D.y - 0.2, D.z0 + t, D.x1 - t, D.y, zs).cam = true;
  // la escalera que sube del desván (en línea con la del sobrado: del 10,25
  // al suelo del palomar), por el tejado abierto
  const n = 10,
    run = 0.3,
    rise = (D.y - 10.25) / n;
  for (let i = 0; i < n; i++) {
    const zb = D.hueco - i * run;
    const top = 10.25 + rise * (i + 1);
    wb.box('wooddark', 65.95, 10.23, zb - run, 67.05, top, zb, { ao: false, faces: 'tnsew', sub: 3, room: i < 7 ? 'pal3' : room });
    ctx.col.add(65.95, 10.23, zb - run, 67.05, top, zb);
  }
  // (y su barandilla, por el lado de dentro del desván)
  for (const x of [65.88, 67.12]) {
    palo(wb, V(x, 10.25 + 1.0, D.hueco - 0.2), V(x, D.y + 0.95, zs + 0.1), 0.03, 'wooddark', { room: 'pal3' });
    ctx.col.add(x - 0.04, 10.25, zs, x + 0.04, D.y + 0.95, D.hueco - 0.6).noSight = true;
  }
  // dentro: los nidales, las plumas, el nido de los cuervos (ramas, huesos)
  const rng = new RNG(3401);
  for (let z = D.z0 + 0.5; z < zs - 0.3; z += 0.55) nidal(ctx, D.x1 - t - 0.3, D.y, z, room, rng);
  wb.setRoom(room);
  for (let i = 0; i < 9; i++) palo(wb, V(rng.range(65.4, 66.6), D.y + 0.05, rng.range(33.5, 35.4)), V(rng.range(65.4, 66.6), D.y + rng.range(0.05, 0.25), rng.range(33.5, 35.4)), 0.015, 'wooddark', { room });
  P.bones(ctx, 65.9, D.y, 34.2, 6, 3402, 0.4);
  // el aprendiz, sentado contra el muro del norte, con la piedra en el regazo
  bakeCorpse(wb, 66.4, D.y, D.z0 + t + 0.35, 0, 'sit', 'villager', 34);
  wb.setRoom(null);
  luna(ctx, 65.6, D.y + 1.4, 34.1, room, 0.85, 4.5);
  ctx.lights.push({ x: 66.5, y: D.y + 1.8, z: 34.4, r: 0.5, g: 0.6, b: 0.85, radius: 3.5, intensity: 0.5, room });
  L.interact.push(
    { kind: 'item', id: 'i_piedra', item: 'piedra', x: 66.4, y: D.y + 0.35, z: D.z0 + t + 0.75 },
    { kind: 'note', id: 'n_aprendiz', note: 'aprendiz', x: 65.6, y: D.y + 0.03, z: 34.9, model: 'paper' }
  );
  void quadN;
  void cuero;
}
