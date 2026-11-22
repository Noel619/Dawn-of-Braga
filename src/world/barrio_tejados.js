// Lo de los tejados del barrio de los Pellejeros: la viga que los vecinos
// echaron de tejado a tejado sobre la rúa (se pasa por ella haciendo
// equilibrio), el tejado hundido de la quemada, las chimeneas, y el desván
// del zapatero, el de las palomas: el secadero de la tintorería sigue por él
// (se pasa de uno a otro por el medio muro), y por la esquina hundida de su
// tejado, subiendo por lo que se cayó, se sale a los tejados. Allí se quedó
// el aprendiz del herrero, con la piedra de afilar bendita de su maestro.
// (Ni escalas ni escaleras: del desván a los tejados se sube andando por los
// escombros.)
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import * as P from './props.js';
import { BR } from './level_barrio.js';
import { bakeCorpse } from '../entities/models.js';
import { palo } from './barrio_atrezo.js';
import { V } from './kit_casa.js';

const luna = (ctx, x, y, z, room, i = 0.45, r = 4) => ctx.lights.push({ x, y, z, r: 0.5, g: 0.6, b: 0.85, radius: r, intensity: i, room });
const SOOT = [0.3, 0.26, 0.24];
// el faldón de las casas grandes de la rúa (casa del zapatero, de la cerera,
// tintorería): de la cumbrera (12,15) al alero (9,4) en cinco metros
const CUMBRE = 12.15,
  PEND = 0.55;

// ------------------------------------------------------------ la viga
// Cuando el Físico empezó a llamar a las puertas, los de la casa del
// zapatero y los de la cerera echaron una viga de un tejado al otro, por
// encima de la rúa, para pasarse sin pisar la calle; la ataron con sogas a
// los pares de los dos aleros. Se anda por ella (un palmo de ancho, a nueve
// metros de la calle) y, mientras, hay que guardar el equilibrio
// (game/cornisas.js). Desde la rúa se ve: por ahí arriba se pasa.
export function vigaRua(ctx, L) {
  const wb = ctx.wb;
  const B = BR.viga;
  const r = B.w / 2;
  const a = V(B.x, B.y - r, B.z0 - 0.25),
    b = V(B.x, B.y - r, B.z1 + 0.25);
  const len = b.z - a.z;
  // el madero (escuadrado, viejo) y sus dos calzos
  wb.box('timber', B.x - r, B.y - B.w, a.z, B.x + r, B.y, b.z, { ao: false, sub: 3, tint: [0.62, 0.54, 0.46] });
  for (const z of [a.z + 0.15, b.z - 0.15]) wb.box('wooddark', B.x - r - 0.12, B.y - B.w - 0.1, z - 0.18, B.x + r + 0.12, B.y - B.w + 0.02, z + 0.18, { ao: false, faces: 'tnsewb' });
  // las sogas que la atan a los aleros (dos vueltas en cada punta) y la que
  // cuelga, rota, por en medio
  const rng = new RNG(3101);
  for (const z of [B.z0 + 0.05, B.z1 - 0.05]) {
    for (const dz of [-0.06, 0.06]) {
      palo(wb, V(B.x - r - 0.015, B.y - B.w - 0.02, z + dz), V(B.x - r - 0.015, B.y + 0.02, z + dz), 0.014, 'burlap', { round: true, tint: [0.62, 0.55, 0.4] });
      palo(wb, V(B.x + r + 0.015, B.y - B.w - 0.02, z + dz), V(B.x + r + 0.015, B.y + 0.02, z + dz), 0.014, 'burlap', { round: true, tint: [0.62, 0.55, 0.4] });
      palo(wb, V(B.x - r - 0.015, B.y + 0.02, z + dz), V(B.x + r + 0.015, B.y + 0.02, z + dz), 0.014, 'burlap', { round: true, tint: [0.62, 0.55, 0.4] });
    }
  }
  palo(wb, V(B.x + r, B.y - 0.05, B.z0 + len * 0.46), V(B.x + r + 0.05, B.y - 1.6, B.z0 + len * 0.44), 0.014, 'burlap', { round: true, tint: [0.55, 0.48, 0.36] });
  // clavos, y alguna astilla levantada
  for (let t = 0.1; t < 0.95; t += 0.14) wb.box('iron', B.x - 0.015, B.y - 0.01, B.z0 + len * t - 0.015, B.x + 0.015, B.y + 0.04, B.z0 + len * t + 0.015, { ao: false });
  for (let i = 0; i < 4; i++) {
    const z = rng.range(B.z0 + 1, B.z1 - 1);
    palo(wb, V(B.x + rng.range(-r * 0.5, r * 0.5), B.y, z), V(B.x + rng.range(-r, r), B.y + 0.06, z + rng.range(0.1, 0.25)), 0.012, 'timber', { tint: [0.7, 0.6, 0.5] });
  }
  // por dónde se anda: la cara de arriba
  ctx.col.add(B.x - r, B.y - B.w, a.z, B.x + r, B.y, b.z).cam = false;
  (L.ledges || (L.ledges = [])).push({ id: 'viga_calleja', a: [B.x, B.y, B.z0 + 0.2], b: [B.x, B.y, B.z1 - 0.2], w: B.w, fall: 'calleja' });
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
// El hundimiento del tejado de la quemada (la casa de los Gomes): por el
// agujero, los pares negros, partidos, unos colgando y otros caídos dentro;
// el tizne en el borde. (Abajo, nueve metros: lo que mata, que se vea.)
export function tejadoQuemado(ctx, L) {
  const wb = ctx.wb;
  const H = BR.hundido;
  const slope = 1.65 / 3;
  const Y = (z) => 8.65 - (55 - z) * slope;
  const rng = new RNG(3201);
  // los pares (de la cumbrera al alero), cada 60 cm: los que quedan enteros y
  // los rotos
  for (let x = H.x0 + 0.2; x < H.x1; x += 0.6) {
    const k = rng.next();
    if (k < 0.35) continue;
    const top = V(x, Y(H.z1) - 0.2, H.z1 + 0.1);
    if (k < 0.65) {
      const len = rng.range(0.6, 1.6);
      palo(wb, top, V(x + rng.range(-0.1, 0.1), top.y - len * 0.8, top.z - len * 0.6), 0.06, 'timber', { tint: SOOT });
    } else palo(wb, top, V(x, Y(H.z0) - 0.2, H.z0 - 0.1), 0.06, 'timber', { tint: SOOT });
  }
  bordeTejas(ctx, [H.x0, H.z0, H.x1, H.z1], (x, z) => Y(z), 3203);
  // dentro, en el suelo de abajo (el de arriba se hundió con el fuego): lo
  // que cayó, tejas, pares, ceniza
  wb.setRoom('que0');
  P.rubble(ctx, (H.x0 + H.x1) / 2, 0, 54.6, 16, 3202, 1.8, { mat: 'roof', scale: 0.9 });
  P.rubble(ctx, 38.2, 0, 55.6, 9, 3204, 1.2, { mat: 'wooddark', scale: 0.8 });
  for (let i = 0; i < 6; i++) {
    const x = rng.range(36.8, 46.8);
    palo(wb, V(x, 0.1, rng.range(53.0, 57.0)), V(x + rng.range(-1.2, 1.2), rng.range(0.4, 2.2), rng.range(53.0, 57.0)), 0.07, 'timber', { tint: SOOT, room: 'que0' });
  }
  // lo que queda del piso de arriba: los cabos de las vigas, negros, en los
  // muros, y un trozo de forjado colgando
  for (let x = 36.6; x < 46.6; x += 1.25) {
    palo(wb, V(x, 3.6, 52.45), V(x + rng.range(-0.1, 0.1), 3.6 - rng.range(0.1, 0.5), 52.45 + rng.range(0.4, 1.4)), 0.08, 'timber', { tint: SOOT, room: 'que0' });
    if (rng.chance(0.6)) palo(wb, V(x + 0.3, 3.6, 57.55), V(x + 0.3, 3.6 - rng.range(0.1, 0.4), 57.55 - rng.range(0.3, 1.1)), 0.08, 'timber', { tint: SOOT, room: 'que0' });
  }
  wb.setRoom(null);
  luna(ctx, (H.x0 + H.x1) / 2, 6.2, 54.0, 'que0', 0.7, 6);
  luna(ctx, (H.x0 + H.x1) / 2, 2.5, 54.6, 'que0', 0.35, 5);
  if (ctx.shafts) ctx.shafts.push({ a: [41.8, 8.2, 53.6], b: [41.4, 0.1, 54.4], w: 2.0, color: 0x9fb2d8 });
  void L;
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

// ------------------------------------------------------------ el desván del zapatero
// El de las palomas: los nidales por los muros, las plumas, las jaulas, el
// grano; los paños de la tintorería, que tendía aquí también; la esquina
// del tejado que se hundió (por el sur, sobre la rúa), con lo que se cayó
// hecho rampa hasta el boquete; y el aprendiz del herrero, que subió con los
// vecinos cuando huían por los tejados y aquí se quedó, sentado contra el
// muro, con la piedra de afilar bendita de su maestro en el regazo.
export function desvanZapatero(ctx, L, h) {
  const wb = ctx.wb;
  const I = h.I;
  const room = h.rooms[2];
  const y = 7.9;
  const Bq = BR.boquete,
    Ra = BR.rampa;
  const rng = new RNG(3305);
  wb.setRoom(room);
  // los nidales, contra los muros (donde hay altura) y las plumas
  for (let x = 15.2; x < 27.6; x += 0.62) {
    nidal(ctx, x, y, I.z0 + 0.05, room, rng, 0);
    if (x < 26) nidal(ctx, x, y, I.z1 - 0.33, room, rng, 0);
  }
  for (let i = 0; i < 16; i++) {
    const fx = rng.range(15.0, 32.8),
      fz = rng.range(33.0, 39.0),
      fy = y + 0.004 + i * 0.0015;
    wb.box('linen', fx, fy, fz, fx + 0.06, fy + 0.004, fz + 0.03, { ao: false, room, faces: 't', grime: false, tint: [0.75, 0.75, 0.75] });
  }
  // las jaulas del grano, los sacos, la escoba de ramas
  for (const [x, z] of [
    [26.6, 34.0],
    [27.4, 34.0],
  ])
    jaulaPalomas(ctx, x, y, z, room, Math.round(x * 7 + z * 3));
  P.sacks(ctx, 32.6, y, 33.2, 3, 3311);
  // los paños que el tintorero tendía también aquí
  for (const z of [35.2, 36.8]) {
    palo(wb, V(17.0, y + 2.25, z), V(25.5, y + 2.25, z), 0.018, 'wooddark', { room, round: true });
    for (let x = 17.5; x < 25.2; x += 1.6) wb.box('clothWhite', x - 0.55, y + 0.9, z - 0.01, x + 0.55, y + 2.23, z + 0.01, { ao: false, room, grime: false, tint: rng.pick([[0.22, 0.3, 0.62], [0.62, 0.16, 0.12], [0.78, 0.66, 0.2]]) });
  }
  // ---- la esquina hundida: la rampa de lo que se cayó (tejas, ripio, dos
  // pares y una viga), del suelo del desván al boquete
  const k = (Ra.y1 - Ra.y0) / (Ra.z1 - Ra.z0);
  const Yr = (z) => Ra.y0 + (z - Ra.z0) * k;
  for (let i = 0; i < 9; i++) {
    const z = Ra.z0 + 0.3 + i * 0.5;
    P.rubble(ctx, (Ra.x0 + Ra.x1) / 2 + rng.range(-0.3, 0.3), Yr(z) - 0.35, z, 6, 3320 + i, 0.6, { mat: i % 2 ? 'roof' : 'wallstone', scale: 0.8 });
  }
  palo(wb, V(Ra.x0 + 0.1, Yr(Ra.z0 + 0.4) - 0.1, Ra.z0 + 0.4), V(Ra.x0 + 0.25, Yr(Ra.z1) - 0.05, Ra.z1 + 0.2), 0.1, 'timber', { tint: [0.55, 0.48, 0.42], room });
  palo(wb, V(Ra.x1 - 0.1, Yr(Ra.z0 + 1.0) - 0.12, Ra.z0 + 1.0), V(Ra.x1 - 0.3, Yr(Ra.z1) - 0.02, Ra.z1 + 0.35), 0.09, 'timber', { tint: [0.55, 0.48, 0.42], room });
  // (la cara de arriba: tablas sobre los escombros, que se andan)
  for (let z = Ra.z0; z < Ra.z1 - 0.01; z += 0.5) {
    const z1 = Math.min(Ra.z1, z + 0.5);
    wb.push();
    const c = V((Ra.x0 + Ra.x1) / 2, (Yr(z) + Yr(z1)) / 2 - 0.04, (z + z1) / 2);
    wb.translate(c.x, c.y, c.z);
    wb.rotateX(-Math.atan(k));
    wb.rotateY(rng.range(-0.08, 0.08));
    wb.box('planks', -(Ra.x1 - Ra.x0) / 2 + rng.range(0, 0.2), -0.035, -0.27, (Ra.x1 - Ra.x0) / 2 - rng.range(0, 0.2), 0.035, 0.27, { ao: false, room, tint: [0.66, 0.6, 0.52] });
    wb.pop();
  }
  ctx.col.addRamp(Ra.x0, Ra.z0, Ra.x1, Ra.z1, 'z', Ra.z0, Ra.y0, Ra.z1, Ra.y1);
  // (y debajo, macizo: no se cuela uno por debajo de la rampa)
  for (let z = Ra.z0 + 0.6; z < Ra.z1; z += 0.6) ctx.col.add(Ra.x0 + 0.1, y, z - 0.3, Ra.x1 - 0.1, Yr(z - 0.3) - 0.3, z + 0.3).noSight = true;
  // los bordes del boquete, por fuera, y la luna que entra por él
  bordeTejas(ctx, [Bq.x0, Bq.z0, Bq.x1, Bq.z1], (x, z) => CUMBRE - (z - 36) * PEND, 3302);
  wb.setRoom(null);
  luna(ctx, (Bq.x0 + Bq.x1) / 2, y + 2.6, (Bq.z0 + Bq.z1) / 2 - 0.3, room, 0.9, 6);
  luna(ctx, 18.0, y + 1.6, 36.0, room, 0.4, 5);
  if (ctx.shafts) ctx.shafts.push({ a: [30.4, 11.4, 38.4], b: [30.2, y + 0.05, 36.4], w: 1.2, color: 0x9fb2d8 });
  // ---- el aprendiz, sentado contra el muro del oeste, con la piedra en el
  // regazo; a su lado, lo que escribió
  wb.setRoom(room);
  bakeCorpse(wb, I.x0 + 0.4, y, 36.0, Math.PI / 2, 'sit', 'villager', 34);
  for (let i = 0; i < 9; i++) palo(wb, V(rng.range(14.8, 16.2), y + 0.05, rng.range(34.6, 37.4)), V(rng.range(14.8, 16.2), y + rng.range(0.05, 0.25), rng.range(34.6, 37.4)), 0.015, 'wooddark', { room });
  P.bones(ctx, 15.4, y, 37.6, 5, 3402, 0.4);
  wb.setRoom(null);
  ctx.lights.push({ x: 15.6, y: y + 1.6, z: 36.0, r: 0.5, g: 0.6, b: 0.85, radius: 3.5, intensity: 0.45, room });
  L.interact.push(
    { kind: 'item', id: 'i_piedra', item: 'piedra', x: I.x0 + 0.85, y: y + 0.35, z: 36.0 },
    { kind: 'note', id: 'n_aprendiz', note: 'aprendiz', x: 15.7, y: y + 0.03, z: 34.9, model: 'paper' }
  );
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
    wb.box('wooddark', x - 0.008, y, z + u - 0.008, x + 0.008, y + hh, z + u + 0.008, { ao: false, room });
    wb.box('wooddark', x + d - 0.008, y, z + u - 0.008, x + d + 0.008, y + hh, z + u + 0.008, { ao: false, room });
  }
  wb.box('planks', x, y, z - w / 2, x + d, y + 0.03, z + w / 2, { ao: false, room, tint: [0.7, 0.62, 0.52] });
  wb.box('planks', x, y + hh, z - w / 2, x + d, y + hh + 0.03, z + w / 2, { ao: false, room, tint: [0.7, 0.62, 0.52] });
  if (rng.chance(0.5)) wb.box('linen', x + 0.1, y + 0.031, z - 0.1, x + 0.3, y + 0.04, z + 0.1, { ao: false, room, grime: false, tint: [0.6, 0.6, 0.6] });
  P.colOBB(ctx, x + d / 2, z, d / 2, w / 2, 0, y, y + hh + 0.03);
}

// Un nidal de palomas: la caja de tablas abierta por delante, contra el muro
// (de cara al norte o al sur: dz, hacia dónde se abre).
function nidal(ctx, x, y, z, room, rng) {
  const wb = ctx.wb;
  for (let k = 0; k < 2; k++) {
    const yy = y + 0.05 + k * 0.4;
    wb.box('planks', x - 0.24, yy, z, x + 0.24, yy + 0.03, z + 0.28, { ao: false, room, tint: [0.62, 0.55, 0.47] });
    wb.box('planks', x - 0.25, yy, z, x - 0.22, yy + 0.36, z + 0.28, { ao: false, room, tint: [0.62, 0.55, 0.47] });
    if (rng.chance(0.4)) wb.box('straw', x - 0.18, yy + 0.03, z + 0.04, x + 0.15, yy + 0.08, z + 0.24, { ao: false, room, tint: [0.7, 0.62, 0.4] });
  }
}
