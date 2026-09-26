// Atrezo procedural horneado en la geometría estática del mundo.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid } from './builders.js';
import { bakeCorpse } from '../entities/models.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const M4 = () => new THREE.Matrix4();

function col(ctx, x0, y0, z0, x1, y1, z1) {
  return ctx.col.add(Math.min(x0, x1), y0, Math.min(z0, z1), Math.max(x0, x1), y1, Math.max(z0, z1));
}

// ------------------------------------------------------------- básicos
export function barrel(ctx, x, y, z, o = {}) {
  const wb = ctx.wb;
  const r = o.r ?? 0.38,
    h = o.h ?? 0.95;
  if (o.lying) {
    wb.push();
    wb.translate(x, y + r, z);
    wb.rotateY(o.rot ?? 0);
    wb.rotateZ(Math.PI / 2);
    wb.cylinder('planks', 0, -h / 2, 0, r * 0.9, r * 0.9, h, 8, { ao: false, capTop: true, capBot: true, uv: 1.2 });
    for (const yy of [-h * 0.35, h * 0.35]) wb.cylinder('iron', 0, yy, 0, r * 0.93, r * 0.93, 0.06, 8, { ao: false });
    wb.pop();
    col(ctx, x - r, y, z - r, x + r, y + r * 1.6, z + r);
    return;
  }
  wb.cylinder('planks', x, y, z, r * 0.88, r * 0.88, h * 0.5, 8, { capBot: false, uv: 1.2, aoH: 0.5 });
  wb.cylinder('planks', x, y + h * 0.5, z, r * 0.88, r * 0.84, h * 0.5, 8, { capTop: true, uv: 1.2, ao: false });
  for (const yy of [0.12, h * 0.5 - 0.03, h - 0.14]) wb.cylinder('iron', x, y + yy, z, r * 0.92, r * 0.92, 0.06, 8, { ao: false });
  if (o.collide !== false) col(ctx, x - r, y, z - r, x + r, y + h, z + r);
}

export function crate(ctx, x, y, z, s = 0.8, rot = 0, o = {}) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('planks', -s / 2, 0, -s / 2, s / 2, s, s / 2, { uv: 1.3, faces: 'tnsew', aoH: 0.5 });
    wb.box('wooddark', -s / 2 - 0.02, s - 0.1, -s / 2 - 0.02, s / 2 + 0.02, s - 0.02, s / 2 + 0.02, { ao: false });
    wb.box('wooddark', -s / 2 - 0.02, 0.04, -s / 2 - 0.02, s / 2 + 0.02, 0.12, s / 2 + 0.02, { ao: false });
  });
  if (o.collide !== false) {
    const h = s * 0.75;
    col(ctx, x - h, y, z - h, x + h, y + s, z + h);
  }
}

export function sacks(ctx, x, y, z, n = 3, seed = 1) {
  const rng = new RNG(seed);
  for (let i = 0; i < n; i++) {
    const m = M4().compose(
      V(x + rng.range(-0.5, 0.5), y + 0.2 + (i > 2 ? 0.35 : 0), z + rng.range(-0.5, 0.5)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.3, 0.3), rng.range(0, 6), rng.range(-0.3, 0.3))),
      V(0.4, 0.28, 0.3)
    );
    ctx.wb.geometry('burlap', new THREE.SphereGeometry(1, 6, 4), m, { ao: false, uvScale: 1.5 });
  }
  col(ctx, x - 0.7, y, z - 0.7, x + 0.7, y + 0.6, z + 0.7);
}

export function hay(ctx, x, y, z, rot = 0) {
  ctx.wb.at(x, y, z, rot, () => {
    ctx.wb.box('straw', -0.7, 0, -0.45, 0.7, 0.8, 0.45, { faces: 'tnsew', aoH: 0.4 });
    ctx.wb.box('leather', -0.72, 0.2, -0.46, 0.72, 0.26, 0.46, { ao: false, faces: 'nsew' });
  });
  col(ctx, x - 0.8, y, z - 0.8, x + 0.8, y + 0.8, z + 0.8);
}

// Carro de madera (volcado o quemado).
export function cart(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  wb.push();
  wb.translate(x, y, z);
  wb.rotateY(rot);
  if (o.tipped) wb.rotateZ(0.35);
  const tint = o.burnt ? [0.35, 0.3, 0.27] : null;
  wb.box('planks', -1.1, 0.55, -0.75, 1.1, 0.65, 0.75, { faces: 'tnsewb', ao: false, tint, uv: 0.8 });
  wb.box('planks', -1.1, 0.65, -0.78, 1.1, 1.05, -0.72, { ao: false, tint, uv: 0.8 });
  wb.box('planks', -1.1, 0.65, 0.72, 1.1, 1.05, 0.78, { ao: false, tint, uv: 0.8 });
  wb.box('planks', 1.04, 0.65, -0.75, 1.1, 1.05, 0.75, { ao: false, tint, uv: 0.8 });
  // varas
  wb.box('wooddark', -2.9, 0.5, -0.5, -1.1, 0.6, -0.4, { ao: false, tint });
  wb.box('wooddark', -2.9, 0.5, 0.4, -1.1, 0.6, 0.5, { ao: false, tint });
  // ruedas
  for (const s of [-1, 1]) {
    if (o.brokenWheel && s > 0) continue;
    wb.push();
    wb.translate(0.2, 0.52, s * 0.85);
    wb.rotateX(Math.PI / 2);
    wb.cylinder('wooddark', 0, -0.06, 0, 0.52, 0.52, 0.12, 10, { ao: false, capTop: true, capBot: true, tint });
    wb.pop();
  }
  wb.pop();
  if (o.brokenWheel) {
    wb.push();
    wb.translate(x + Math.cos(rot) * 0.4 + 0.9, y + 0.07, z - Math.sin(rot) * 0.4 + 1.2);
    wb.cylinder('wooddark', 0, 0, 0, 0.52, 0.52, 0.12, 10, { ao: false, capTop: true, tint });
    wb.pop();
  }
  // colisión aproximada
  const c = Math.abs(Math.cos(rot)),
    s2 = Math.abs(Math.sin(rot));
  const hx = 1.2 * c + 0.9 * s2,
    hz = 1.2 * s2 + 0.9 * c;
  col(ctx, x - hx, y, z - hz, x + hx, y + 1.1, z + hz);
  if (o.burning && ctx.fires) {
    ctx.fires.push({ x, y: y + 0.7, z, s: 1.8, smoke: true });
    ctx.lights.push({ x, y: y + 1.5, z, r: 1, g: 0.45, b: 0.15, radius: 10, intensity: 1.5 });
  }
  if (o.bodies) bakeCorpse(wb, x + 0.2, y + 0.6, z, rot + 0.3, 'back', 'villager', 2);
}

export function table(ctx, x, y, z, w = 1.8, d = 0.9, rot = 0, o = {}) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -w / 2, 0.72, -d / 2, w / 2, 0.8, d / 2, { ao: false, faces: 'tnsewb' });
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ])
      wb.box('wooddark', sx * (w / 2 - 0.1) - 0.05, 0, sz * (d / 2 - 0.1) - 0.05, sx * (w / 2 - 0.1) + 0.05, 0.72, sz * (d / 2 - 0.1) + 0.05, { ao: false });
  });
  if (o.collide !== false) {
    const c = Math.abs(Math.cos(rot)),
      s = Math.abs(Math.sin(rot));
    const hx = (w / 2) * c + (d / 2) * s,
      hz = (w / 2) * s + (d / 2) * c;
    col(ctx, x - hx, y, z - hz, x + hx, y + 0.8, z + hz);
  }
}

export function bench(ctx, x, y, z, w = 1.6, rot = 0) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -w / 2, 0.42, -0.18, w / 2, 0.48, 0.18, { ao: false, faces: 'tnsewb' });
    wb.box('wooddark', -w / 2 + 0.1, 0, -0.14, -w / 2 + 0.18, 0.42, 0.14, { ao: false });
    wb.box('wooddark', w / 2 - 0.18, 0, -0.14, w / 2 - 0.1, 0.42, 0.14, { ao: false });
  });
}

// Banco de iglesia con respaldo.
export function pew(ctx, x, y, z, w = 3.6, rot = 0, o = {}) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -w / 2, 0.42, -0.25, w / 2, 0.5, 0.2, { ao: false, faces: 'tnsewb' });
    wb.box('wooddark', -w / 2, 0.5, -0.28, w / 2, 1.0, -0.22, { ao: false, faces: 'tnsew' });
    wb.box('wooddark', -w / 2, 0, -0.28, -w / 2 + 0.08, 1.0, 0.22, { ao: false });
    wb.box('wooddark', w / 2 - 0.08, 0, -0.28, w / 2, 1.0, 0.22, { ao: false });
  });
  if (o.collide !== false) {
    const c = Math.abs(Math.cos(rot)),
      s = Math.abs(Math.sin(rot));
    col(ctx, x - (w / 2) * c - 0.3 * s, y, z - (w / 2) * s - 0.3 * c, x + (w / 2) * c + 0.3 * s, y + 1.0, z + (w / 2) * s + 0.3 * c);
  }
}

// Velas: cilindros de cera + llamitas + luz horneada.
export function candles(ctx, x, y, z, n = 5, seed = 1, o = {}) {
  const rng = new RNG(seed);
  const spread = o.spread ?? 0.35;
  for (let i = 0; i < n; i++) {
    const cx = x + rng.range(-spread, spread),
      cz = z + rng.range(-spread, spread);
    const h = rng.range(0.1, 0.4) * (o.scale ?? 1);
    const r = rng.range(0.025, 0.045) * (o.scale ?? 1);
    ctx.wb.cylinder('candle', cx, y, cz, r, r, h, 5, { ao: false, capTop: true, grime: false });
    if (!o.unlit && ctx.fires) ctx.fires.push({ x: cx, y: y + h, z: cz, s: 0.12 * (o.scale ?? 1), light: false, embers: false, glow: rng.chance(0.4) });
  }
  if (!o.unlit && ctx.lights) ctx.lights.push({ x, y: y + 0.5, z, r: 1, g: 0.6, b: 0.25, radius: o.radius ?? 4.5, intensity: o.intensity ?? 0.8, room: o.room });
}

// Candelabro de pie.
export function candelabra(ctx, x, y, z, o = {}) {
  const wb = ctx.wb;
  wb.cylinder('iron', x, y, z, 0.2, 0.05, 0.12, 6, { ao: false, capTop: true });
  wb.cylinder('iron', x, y + 0.1, z, 0.03, 0.03, 1.3, 5, { ao: false });
  wb.box('iron', x - 0.35, y + 1.4, z - 0.03, x + 0.35, y + 1.44, z + 0.03, { ao: false });
  for (const dx of [-0.33, 0, 0.33]) {
    wb.cylinder('candle', x + dx, y + 1.44, z, 0.035, 0.035, 0.22, 5, { ao: false, capTop: true, grime: false });
    ctx.fires.push({ x: x + dx, y: y + 1.66, z, s: 0.14, light: false, embers: false });
  }
  ctx.lights.push({ x, y: y + 1.7, z, r: 1, g: 0.6, b: 0.25, radius: 5.5, intensity: 1.0, room: o.room });
  if (ctx.dynLights) ctx.dynLights.push({ x, y: y + 1.8, z, intensity: 2.2, range: 7, color: 0xffa050 });
}

// Brasero de hierro con fuego.
export function brazier(ctx, x, y, z, o = {}) {
  const wb = ctx.wb;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    wb.push();
    wb.translate(x + Math.cos(a) * 0.25, y, z + Math.sin(a) * 0.25);
    wb.rotateZ(Math.cos(a) * 0.15);
    wb.rotateX(-Math.sin(a) * 0.15);
    wb.box('iron', -0.03, 0, -0.03, 0.03, 0.8, 0.03, { ao: false });
    wb.pop();
  }
  wb.cylinder('iron', x, y + 0.75, z, 0.22, 0.42, 0.28, 8, { ao: false, capBot: true });
  wb.cylinder('ember', x, y + 0.98, z, 0.38, 0.38, 0.02, 8, { ao: false, capTop: true, grime: false });
  ctx.fires.push({ x, y: y + 0.95, z, s: o.s ?? 1.1, smoke: !!o.smoke });
  ctx.lights.push({ x, y: y + 1.6, z, r: 1, g: 0.48, b: 0.16, radius: o.radius ?? 9, intensity: 1.5, room: o.room });
  if (ctx.dynLights) ctx.dynLights.push({ x, y: y + 1.6, z, intensity: 7, range: 11 });
  col(ctx, x - 0.4, y, z - 0.4, x + 0.4, y + 1.1, z + 0.4);
}

// Antorcha en soporte de pared. dir: hacia dónde sobresale ('n','s','e','w').
export function wallTorch(ctx, x, y, z, dir, o = {}) {
  const wb = ctx.wb;
  const d = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[dir];
  const tx = x + d[0] * 0.3,
    tz = z + d[1] * 0.3;
  wb.box('iron', Math.min(x, tx) - 0.03, y - 0.03, Math.min(z, tz) - 0.03, Math.max(x, tx) + 0.03, y + 0.03, Math.max(z, tz) + 0.03, { ao: false });
  wb.cylinder('wooddark', tx, y - 0.1, tz, 0.035, 0.05, 0.5, 5, { ao: false });
  ctx.fires.push({ x: tx, y: y + 0.38, z: tz, s: 0.45, embers: true });
  ctx.lights.push({ x: tx + d[0] * 0.4, y: y + 0.6, z: tz + d[1] * 0.4, r: 1, g: 0.5, b: 0.18, radius: o.radius ?? 7, intensity: 1.2, room: o.room });
  if (ctx.dynLights) ctx.dynLights.push({ x: tx + d[0] * 0.3, y: y + 0.6, z: tz + d[1] * 0.3, intensity: o.dyn ?? 3.5, range: 8 });
}

// Horca con ahorcados.
export function gallows(ctx, x, y, z, rot = 0, bodies = 2) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('planks', -2.2, 0, -1.4, 2.2, 1.3, 1.4, { faces: 'tnsew', uv: 0.7, aoH: 0.8 });
    for (const sx of [-1.8, 1.8]) wb.box('wooddark', sx - 0.14, 1.3, -0.14, sx + 0.14, 5.4, 0.14, { ao: false });
    wb.box('wooddark', -2.2, 5.2, -0.16, 2.2, 5.5, 0.16, { ao: false });
    for (const sx of [-1, 1]) {
      wb.push();
      wb.translate(sx * 1.8, 4.4, 0);
      wb.rotateZ(sx * 0.785);
      wb.box('wooddark', -0.08, -0.7, -0.08, 0.08, 0.7, 0.08, { ao: false });
      wb.pop();
    }
    // escalera
    for (let i = 0; i < 4; i++) wb.box('planks', -0.7, i * 0.32, 1.4 + (3 - i) * 0.35, 0.7, (i + 1) * 0.32, 1.4 + (4 - i) * 0.35, { ao: false, uv: 0.8 });
    // sogas y cuerpos
    const xs = bodies === 1 ? [0] : bodies === 2 ? [-0.9, 0.9] : [-1.2, 0, 1.2];
    xs.forEach((bx, i) => {
      wb.box('burlap', bx - 0.02, 3.6, -0.02, bx + 0.02, 5.2, 0.02, { ao: false });
    });
  });
  // cuerpos colgados (en coordenadas mundo)
  const xs = bodies === 1 ? [0] : bodies === 2 ? [-0.9, 0.9] : [-1.2, 0, 1.2];
  xs.forEach((bx, i) => {
    const wx = x + Math.cos(rot) * bx,
      wz = z - Math.sin(rot) * bx;
    bakeCorpse(wb, wx, y + 1.95, wz, rot + (i - 1) * 0.6, 'hang', i % 2 ? 'soldier' : 'villager', i + 3);
  });
  const c = Math.abs(Math.cos(rot)),
    s = Math.abs(Math.sin(rot));
  col(ctx, x - 2.2 * c - 1.4 * s, y, z - 2.2 * s - 1.4 * c, x + 2.2 * c + 1.4 * s, y + 1.3, z + 2.2 * s + 1.4 * c);
}

// Jaula colgante (gibbet) con esqueleto.
export function gibbet(ctx, x, y, z, h = 4) {
  const wb = ctx.wb;
  wb.box('wooddark', x - 0.12, y, z - 0.12, x + 0.12, y + h + 0.5, z + 0.12, { ao: false });
  wb.box('wooddark', x - 0.1, y + h + 0.3, z - 0.1, x + 1.3, y + h + 0.5, z + 0.1, { ao: false });
  const cx = x + 1.2,
    cy = y + h - 1.9;
  wb.box('iron', cx - 0.02, cy + 1.6, z - 0.02, cx + 0.02, y + h + 0.3, z + 0.02, { ao: false });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    wb.box('iron', cx + Math.cos(a) * 0.4 - 0.02, cy, z + Math.sin(a) * 0.4 - 0.02, cx + Math.cos(a) * 0.4 + 0.02, cy + 1.6, z + Math.sin(a) * 0.4 + 0.02, { ao: false });
  }
  wb.cylinder('iron', cx, cy, z, 0.42, 0.42, 0.05, 8, { ao: false, capBot: true, capTop: true });
  wb.cylinder('iron', cx, cy + 1.58, z, 0.42, 0.1, 0.25, 8, { ao: false });
  // restos
  wb.cylinder('bone', cx, cy + 0.05, z, 0.1, 0.12, 0.6, 5, { ao: false });
  wb.push();
  wb.translate(cx, cy + 0.75, z);
  wb.geometry('bone', new THREE.SphereGeometry(0.11, 6, 4), null, { ao: false });
  wb.pop();
  col(ctx, x - 0.2, y, z - 0.2, x + 0.2, y + h, z + 0.2);
}

// Pica con cabeza clavada.
export function pike(ctx, x, y, z, o = {}) {
  const wb = ctx.wb;
  const h = o.h ?? 2.6;
  wb.push();
  wb.translate(x, y, z);
  wb.rotateZ(o.tilt ?? 0.08);
  wb.cylinder('wooddark', 0, 0, 0, 0.035, 0.03, h, 5, { ao: false });
  wb.box('iron', -0.02, h, -0.02, 0.02, h + 0.2, 0.02, { ao: false });
  // cabeza
  wb.push();
  wb.translate(0, h - 0.12, 0);
  wb.geometry(o.skull ? 'bone' : 'skinCorrupt', new THREE.BoxGeometry(0.2, 0.24, 0.22), null, { ao: false, uvScale: 0.4 });
  wb.box('black', -0.07, 0.02, 0.105, 0.07, 0.05, 0.115, { ao: false, grime: false });
  wb.pop();
  wb.pop();
}

// Cruzeiro portugués: cruz de granito sobre gradas.
export function cruzeiro(ctx, x, y, z, rot = 0) {
  const wb = ctx.wb;
  for (let i = 0; i < 3; i++) {
    const s = 1.6 - i * 0.4;
    solid(ctx, 'ashlar', x - s, y + i * 0.3, z - s, x + s, y + (i + 1) * 0.3, z + s, { sub: 2, aoH: 0.3 });
  }
  wb.box('ashlar', x - 0.3, y + 0.9, z - 0.3, x + 0.3, y + 1.4, z + 0.3, { sub: 2 });
  wb.at(x, y + 1.4, z, rot, () => {
    wb.cylinder('ashlar', 0, 0, 0, 0.14, 0.12, 3.2, 8, { ao: false });
    wb.box('ashlar', -0.2, 3.2, -0.2, 0.2, 3.36, 0.2, { ao: false });
    wb.box('ashlar', -0.1, 3.36, -0.1, 0.1, 4.3, 0.1, { ao: false });
    wb.box('ashlar', -0.5, 3.8, -0.1, 0.5, 4.0, 0.1, { ao: false });
  });
  col(ctx, x - 0.35, y, z - 0.35, x + 0.35, y + 5, z + 0.35);
}

// Picota (pelourinho) de la plaza.
export function pelourinho(ctx, x, y, z) {
  const wb = ctx.wb;
  for (let i = 0; i < 4; i++) {
    const r = 1.8 - i * 0.35;
    wb.cylinder('ashlar', x, y + i * 0.28, z, r, r, 0.28, 8, { capTop: true, ao: false, sub: 2 });
  }
  col(ctx, x - 1.3, y, z - 1.3, x + 1.3, y + 1.12, z + 1.3);
  wb.cylinder('ashlar', x, y + 1.12, z, 0.26, 0.22, 3.6, 8, { ao: false, phase: 0.4 });
  wb.cylinder('ashlar', x, y + 4.7, z, 0.4, 0.3, 0.3, 8, { ao: false, capTop: true });
  wb.pyramid('ashlar', x, z, 0.5, 0.5, y + 5.0, 0.6);
  // argollas de hierro
  for (const a of [0, Math.PI]) wb.box('iron', x + Math.cos(a) * 0.28 - 0.05, y + 3.8, z + Math.sin(a) * 0.28 - 0.05, x + Math.cos(a) * 0.28 + 0.05, y + 4.0, z + Math.sin(a) * 0.28 + 0.05, { ao: false });
  col(ctx, x - 0.3, y, z - 0.3, x + 0.3, y + 5.5, z + 0.3);
}

// Chafariz (fuente octogonal) con agua ensangrentada.
export function fountain(ctx, x, y, z) {
  const wb = ctx.wb;
  const ph = Math.PI / 8;
  // pilón octogonal
  wb.cylinder('ashlar', x, y, z, 3.2, 3.2, 0.75, 8, { capTop: false, sub: 2, phase: ph });
  wb.cylinder('ashlar', x, y, z, 2.8, 2.8, 0.75, 8, { capTop: false, phase: ph });
  wb.cylinder('ashlar', x, y + 0.75, z, 3.35, 3.35, 0.12, 8, { capTop: true, ao: false, phase: ph });
  wb.cylinder('blood', x, y + 0.5, z, 2.85, 2.85, 0.02, 8, { capTop: true, ao: false, grime: false, phase: ph });
  // fuste abalaustrado y taza superior ancha
  wb.cylinder('ashlar', x, y + 0.5, z, 0.75, 0.55, 0.5, 8, { ao: false, capTop: true });
  wb.cylinder('ashlar', x, y + 1.0, z, 0.38, 0.32, 0.9, 8, { ao: false });
  wb.cylinder('ashlar', x, y + 1.9, z, 0.45, 1.55, 0.45, 12, { ao: false });
  wb.cylinder('ashlar', x, y + 2.35, z, 1.6, 1.6, 0.18, 12, { ao: false, capTop: true });
  wb.cylinder('blood', x, y + 2.5, z, 1.45, 1.45, 0.02, 12, { capTop: true, ao: false, grime: false });
  // pequeña taza y remate en piña
  wb.cylinder('ashlar', x, y + 2.5, z, 0.22, 0.18, 0.7, 6, { ao: false });
  wb.cylinder('ashlar', x, y + 3.15, z, 0.2, 0.62, 0.2, 10, { ao: false });
  wb.cylinder('ashlar', x, y + 3.35, z, 0.64, 0.64, 0.1, 10, { ao: false, capTop: true });
  wb.cylinder('ashlar', x, y + 3.45, z, 0.18, 0.02, 0.55, 6, { ao: false });
  // caños que gotean sangre
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const cx = x + Math.cos(a) * 1.55,
      cz = z + Math.sin(a) * 1.55;
    wb.box('bronze', cx - 0.06, y + 2.3, cz - 0.06, cx + 0.06, y + 2.42, cz + 0.06, { ao: false });
    wb.box('blood', cx - 0.02, y + 0.52, cz - 0.02, cx + 0.02, y + 2.3, cz + 0.02, { ao: false, grime: false });
  }
  col(ctx, x - 3.1, y, z - 3.1, x + 3.1, y + 0.8, z + 3.1);
  col(ctx, x - 0.6, y, z - 0.6, x + 0.6, y + 3.4, z + 0.6);
}

export function well(ctx, x, y, z) {
  const wb = ctx.wb;
  wb.cylinder('wallstone', x, y, z, 1.1, 1.1, 0.9, 10, { sub: 2 });
  wb.cylinder('wallstone', x, y + 0.9, z, 1.15, 1.15, 0.12, 10, { ao: false });
  wb.cylinder('black', x, y + 0.85, z, 0.9, 0.9, 0.02, 10, { capTop: true, ao: false, grime: false });
  for (const s of [-1, 1]) wb.box('wooddark', x + s * 1.0 - 0.07, y + 0.9, z - 0.07, x + s * 1.0 + 0.07, y + 2.6, z + 0.07, { ao: false });
  wb.box('wooddark', x - 1.15, y + 2.4, z - 0.06, x + 1.15, y + 2.52, z + 0.06, { ao: false });
  wb.gableRoof(x - 1.3, z - 0.8, x + 1.3, z + 0.8, y + 2.6, y + 3.2, 'x', { overhang: 0.1, ridge: false, wallMat: 'wooddark' });
  col(ctx, x - 1.1, y, z - 1.1, x + 1.1, y + 1.0, z + 1.1);
}

// Columna con basa y capitel.
export function column(ctx, x, y, z, h, r = 0.4, o = {}) {
  const mat = o.mat ?? 'ashlar';
  const wb = ctx.wb;
  wb.box(mat, x - r - 0.15, y, z - r - 0.15, x + r + 0.15, y + 0.4, z + r + 0.15, { sub: 2, aoH: 0.3 });
  wb.cylinder(mat, x, y + 0.4, z, r, r * 0.92, h - 0.9, 8, { ao: false, sub: 2 });
  wb.box(mat, x - r - 0.2, y + h - 0.5, z - r - 0.2, x + r + 0.2, y + h, z + r + 0.2, { sub: 2, ao: false });
  if (o.collide !== false) col(ctx, x - r, y, z - r, x + r, y + h, z + r);
}

// Estatua de santo velado.
export function veiledStatue(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  const ped = o.ped ?? 1.0;
  if (ped > 0) solid(ctx, 'ashlar', x - 0.55, y, z - 0.55, x + 0.55, y + ped, z + 0.55, { sub: 2 });
  wb.at(x, y + ped, z, rot, () => {
    wb.cylinder('ashlar', 0, 0, 0, 0.45, 0.28, 1.5, 8, { ao: false });
    wb.cylinder('ashlar', 0, 1.5, 0, 0.28, 0.2, 0.35, 8, { ao: false });
    // velo sobre la cabeza y los hombros
    wb.cylinder(o.veil ?? 'clothWhite', 0, 1.2, 0, 0.42, 0.14, 0.95, 8, { ao: false, capTop: true });
    wb.cylinder(o.veil ?? 'clothWhite', 0, 0.3, 0, 0.5, 0.42, 0.9, 8, { ao: false, open: true });
    // manos juntas
    wb.box('ashlar', -0.1, 1.0, 0.25, 0.1, 1.25, 0.4, { ao: false });
  });
  if (!ped) ctx.col.add(x - 0.45, y, z - 0.45, x + 0.45, y + 2.5, z + 0.45);
}

// Sarcófago con tapa (opcionalmente desplazada).
export function sarcophagus(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('ashlar', -1.2, 0, -0.55, 1.2, 0.9, 0.55, { faces: 'tnsew', sub: 2, aoH: 0.4 });
    wb.box('ashlar', -1.3, 0, -0.62, 1.3, 0.15, 0.62, { ao: false });
    if (o.open) {
      wb.push();
      wb.translate(0.3, 0.9, 0.45);
      wb.rotateY(0.35);
      wb.rotateZ(0.08);
      wb.box('ashlar', -1.25, 0, -0.6, 1.25, 0.18, 0.6, { ao: false, faces: 'tnsewb' });
      wb.pop();
      wb.box('black', -1.1, 0.88, -0.45, 1.1, 0.9, 0.45, { ao: false, faces: 't', grime: false });
    } else {
      wb.box('ashlar', -1.25, 0.9, -0.6, 1.25, 1.08, 0.6, { ao: false, faces: 'tnsew' });
      if (o.effigy) {
        wb.box('ashlar', -0.9, 1.08, -0.2, 0.7, 1.28, 0.2, { ao: false });
        wb.box('ashlar', 0.7, 1.08, -0.14, 0.98, 1.36, 0.14, { ao: false });
      }
    }
  });
  const c = Math.abs(Math.cos(rot)),
    s = Math.abs(Math.sin(rot));
  col(ctx, x - 1.3 * c - 0.62 * s, y, z - 1.3 * s - 0.62 * c, x + 1.3 * c + 0.62 * s, y + 1.1, z + 1.3 * s + 0.62 * c);
}

// Montón de huesos y calaveras.
export function bones(ctx, x, y, z, n = 10, seed = 1, spread = 0.8) {
  const rng = new RNG(seed);
  for (let i = 0; i < n; i++) {
    const px = x + rng.range(-spread, spread),
      pz = z + rng.range(-spread, spread);
    if (rng.chance(0.35)) {
      ctx.wb.geometry('bone', new THREE.SphereGeometry(0.1, 6, 4), M4().compose(V(px, y + 0.08, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(0, 3), rng.range(0, 3), 0)), V(1, 1.1, 1.2)), { ao: false });
    } else {
      const m = M4().compose(V(px, y + 0.04, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 + rng.range(-0.3, 0.3), 0, rng.range(0, Math.PI))), V(1, 1, 1));
      ctx.wb.geometry('bone', new THREE.CylinderGeometry(0.025, 0.03, rng.range(0.25, 0.45), 4), m, { ao: false });
    }
  }
}

// Escombros de piedra.
export function rubble(ctx, x, y, z, n = 8, seed = 1, spread = 1.2, o = {}) {
  const rng = new RNG(seed);
  for (let i = 0; i < n; i++) {
    const s = rng.range(0.2, 0.6) * (o.scale ?? 1);
    const px = x + rng.range(-spread, spread),
      pz = z + rng.range(-spread, spread);
    const m = M4().compose(V(px, y + s * 0.3, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.5, 0.5), rng.range(0, 3), rng.range(-0.5, 0.5))), V(s, s * 0.7, s * 0.9));
    ctx.wb.geometry(o.mat ?? 'wallstone', new THREE.BoxGeometry(1, 1, 1), m, { ao: false, uvScale: 0.6 });
  }
  if (o.collide) col(ctx, x - spread, y, z - spread, x + spread, y + (o.h ?? 0.6), z + spread);
}

// Flechas clavadas en muros o suelo.
export function arrows(ctx, x, y, z, n = 5, seed = 1, dir = [0, -1, 0]) {
  const rng = new RNG(seed);
  for (let i = 0; i < n; i++) {
    const m = M4().compose(
      V(x + rng.range(-1, 1), y + rng.range(-0.5, 0.5), z + rng.range(-1, 1)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.6, 0.6) + (dir[2] ? Math.PI / 2 : 0), rng.range(0, 6), rng.range(-0.6, 0.6) + (dir[0] ? Math.PI / 2 : 0))),
      V(1, 1, 1)
    );
    ctx.wb.geometry('wooddark', new THREE.CylinderGeometry(0.01, 0.01, 0.8, 3), m, { ao: false });
  }
}

// Crecimiento de carne corrupta: masa de bultos + tentáculos + ojos.
export function fleshGrowth(ctx, x, y, z, size = 1, seed = 1, o = {}) {
  const rng = new RNG(seed);
  const wb = ctx.wb;
  const n = Math.round(4 + size * 5);
  for (let i = 0; i < n; i++) {
    const s = size * rng.range(0.3, 0.75);
    const px = x + rng.range(-size, size) * (o.flatX ?? 1),
      pz = z + rng.range(-size, size) * (o.flatZ ?? 1);
    const py = y + rng.range(-0.1, 0.5) * size + (o.lift ?? 0) * rng.next();
    const m = M4().compose(V(px, py, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(0, 3), rng.range(0, 3), rng.range(0, 3))), V(s, s * rng.range(0.6, 1.1), s * rng.range(0.7, 1.2)));
    wb.geometry('flesh', new THREE.IcosahedronGeometry(1, 1), m, { ao: false, uvScale: 1.2, grime: false });
    if (rng.chance(0.3)) {
      const e = M4().compose(V(px + s * 0.6, py + s * 0.4, pz + s * 0.5), new THREE.Quaternion(), V(0.06 * size + 0.04, 0.06 * size + 0.04, 0.06 * size + 0.04));
      wb.geometry('eyeGlow', new THREE.SphereGeometry(1, 5, 4), e, { ao: false, grime: false });
    }
  }
  // tentáculos/venas que trepan
  const tn = o.tendrils ?? Math.round(size * 3);
  for (let i = 0; i < tn; i++) {
    const pts = [];
    let px = x,
      py = y,
      pz = z;
    const ang = rng.range(0, Math.PI * 2);
    const up = o.climb ?? 0.5;
    for (let k = 0; k < 6; k++) {
      pts.push(V(px, py, pz));
      px += Math.cos(ang + rng.range(-0.6, 0.6)) * size * 0.7;
      pz += Math.sin(ang + rng.range(-0.6, 0.6)) * size * 0.7;
      py += rng.range(-0.1, up) * size;
      if (o.bound) {
        px = Math.max(o.bound[0], Math.min(o.bound[1], px));
        pz = Math.max(o.bound[2], Math.min(o.bound[3], pz));
      }
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const g = new THREE.TubeGeometry(curve, 10, 0.08 * size + 0.04, 5, false);
    // estrechar hacia la punta
    const p = g.attributes.position;
    wb.geometry('flesh', g, null, { ao: false, uvScale: 2, grime: false });
  }
  if (ctx.lights && o.glow !== false) ctx.lights.push({ x, y: y + 0.5, z, r: 0.9, g: 0.2, b: 0.12, radius: 3 + size * 2, intensity: 0.5, room: o.room });
  if (o.collide) col(ctx, x - size, y, z - size, x + size, y + size, z + size);
}

// Charco/mancha (decal) -> se agrupa y dibuja con transparencia.
export function decal(ctx, x, y, z, size, tex = 'splat', rot = null, o = {}) {
  if (!ctx.decals) return;
  ctx.decals.push({ x, y, z, size, tex, rot: rot ?? (x * 7.13 + z * 3.7) % (Math.PI * 2), wall: o.wall, opacity: o.opacity ?? 0.9 });
}

// Estandarte colgante (malla recortada propia).
export function banner(ctx, x, y, z, rot, kind = 'bannerBlack', w = 1.2, h = 2.6) {
  if (!ctx.banners) return;
  ctx.banners.push({ x, y, z, rot, kind, w, h });
}

// Puesto de mercado roto con toldo.
export function stall(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('planks', -1.4, 0.8, -0.6, 1.4, 0.9, 0.6, { ao: false, faces: 'tnsewb', uv: 0.8 });
    wb.box('planks', -1.4, 0, 0.5, 1.4, 0.8, 0.6, { ao: false, uv: 0.8 });
    for (const sx of [-1.35, 1.35]) for (const sz of [-0.55, 0.55]) wb.box('wooddark', sx - 0.05, 0, sz - 0.05, sx + 0.05, sz < 0 ? 2.5 : 2.1, sz + 0.05, { ao: false });
    // toldo rasgado
    wb.push();
    wb.translate(0, 2.3, 0);
    wb.rotateX(-0.3);
    wb.box(o.cloth ?? 'clothRed', -1.5, -0.02, -0.8, 1.5, 0.02, 0.7, { ao: false, faces: 'tb' });
    wb.pop();
  });
  if (o.burning && ctx.fires) {
    ctx.fires.push({ x, y: y + 1.0, z, s: 1.4, smoke: true });
    ctx.lights.push({ x, y: y + 1.6, z, r: 1, g: 0.45, b: 0.15, radius: 8, intensity: 1.3 });
  }
  const c = Math.abs(Math.cos(rot)),
    s = Math.abs(Math.sin(rot));
  col(ctx, x - 1.4 * c - 0.6 * s, y, z - 1.4 * s - 0.6 * c, x + 1.4 * c + 0.6 * s, y + 0.9, z + 1.4 * s + 0.6 * c);
}

// Pira de cuerpos ardiendo.
export function pyre(ctx, x, y, z, seed = 1) {
  const rng = new RNG(seed);
  for (let i = 0; i < 8; i++) {
    ctx.wb.push();
    ctx.wb.translate(x + rng.range(-1, 1), y + 0.2 + (i % 3) * 0.2, z + rng.range(-1, 1));
    ctx.wb.rotateY(rng.range(0, 3));
    ctx.wb.rotateZ(Math.PI / 2);
    ctx.wb.cylinder('wooddark', 0, -1.2, 0, 0.1, 0.1, 2.4, 5, { ao: false, tint: [0.3, 0.25, 0.22] });
    ctx.wb.pop();
  }
  for (let i = 0; i < 5; i++) bakeCorpse(ctx.wb, x + rng.range(-1.2, 1.2), y + 0.5 + i * 0.12, z + rng.range(-1.2, 1.2), rng.range(0, 6), rng.pick(['back', 'face', 'curl']), 'villager', i);
  ctx.fires.push({ x, y: y + 0.6, z, s: 2.6, smoke: true });
  ctx.fires.push({ x: x + 0.8, y: y + 0.5, z: z - 0.5, s: 1.6 });
  ctx.lights.push({ x, y: y + 2, z, r: 1, g: 0.42, b: 0.12, radius: 13, intensity: 1.8 });
  if (ctx.dynLights) ctx.dynLights.push({ x, y: y + 2, z, intensity: 12, range: 15 });
  col(ctx, x - 1.5, y, z - 1.5, x + 1.5, y + 1.2, z + 1.5);
}

// Estantería con objetos.
export function shelf(ctx, x, y, z, rot = 0, w = 1.6) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    for (const sx of [-w / 2, w / 2 - 0.06]) wb.box('wooddark', sx, 0, -0.2, sx + 0.06, 2.0, 0.2, { ao: false });
    for (let i = 0; i < 4; i++) wb.box('wooddark', -w / 2, 0.3 + i * 0.5, -0.2, w / 2, 0.34 + i * 0.5, 0.2, { ao: false, faces: 'tnsewb' });
    const rng = new RNG(Math.round(x * 13 + z * 7));
    for (let i = 0; i < 4; i++)
      for (let k = 0; k < 3; k++) {
        if (rng.chance(0.4)) continue;
        const px = -w / 2 + 0.25 + k * (w / 3),
          py = 0.34 + i * 0.5;
        if (rng.chance(0.5)) wb.cylinder(rng.pick(['bronze', 'iron', 'bone']), px, py, 0, 0.07, 0.09, 0.2, 6, { ao: false, capTop: true });
        else wb.box(rng.pick(['leather', 'clothRed', 'clothBlue']), px - 0.12, py, -0.1, px + 0.12, py + 0.28, 0.08, { ao: false });
      }
  });
  const c = Math.abs(Math.cos(rot)),
    s = Math.abs(Math.sin(rot));
  col(ctx, x - (w / 2) * c - 0.2 * s, y, z - (w / 2) * s - 0.2 * c, x + (w / 2) * c + 0.2 * s, y + 2, z + (w / 2) * s + 0.2 * c);
}

export function bed(ctx, x, y, z, rot = 0) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -1, 0, -0.5, 1, 0.45, 0.5, { faces: 'tnsew', ao: false });
    wb.box('clothWhite', -0.95, 0.45, -0.45, 0.95, 0.6, 0.45, { faces: 'tnsew', ao: false, tint: [0.7, 0.6, 0.55] });
    wb.box('wooddark', -1.05, 0, -0.55, -0.95, 1.0, 0.55, { ao: false });
  });
  col(ctx, x - 1, y, z - 1, x + 1, y + 0.6, z + 1);
}

export function anvil(ctx, x, y, z, rot = 0) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.cylinder('wooddark', 0, 0, 0, 0.35, 0.4, 0.55, 8, { capTop: true, ao: false });
    wb.box('iron', -0.2, 0.55, -0.15, 0.2, 0.7, 0.15, { ao: false });
    wb.box('iron', -0.45, 0.7, -0.18, 0.4, 0.9, 0.18, { ao: false, faces: 'tnsewb' });
    wb.push();
    wb.translate(0.4, 0.8, 0);
    wb.rotateZ(-Math.PI / 2);
    wb.cylinder('iron', 0, 0, 0, 0.1, 0.01, 0.35, 5, { ao: false });
    wb.pop();
  });
  col(ctx, x - 0.5, y, z - 0.5, x + 0.5, y + 0.9, z + 0.5);
}

export function forge(ctx, x, y, z, rot = 0, room) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('wallstone', -1.2, 0, -0.9, 1.2, 0.9, 0.9, { faces: 'tnsew', sub: 2 });
    wb.box('ember', -0.8, 0.9, -0.6, 0.8, 0.95, 0.6, { ao: false, grime: false, faces: 't' });
    wb.box('wallstone', -1.0, 2.2, -0.9, 1.0, 2.5, 0.9, { ao: false });
    wb.box('wallstone', -0.6, 2.5, -0.5, 0.6, 5.0, 0.5, { ao: false });
    for (const sx of [-1.1, 1.1]) wb.box('wallstone', sx - 0.1, 0.9, -0.9, sx + 0.1, 2.2, -0.7, { ao: false });
  });
  ctx.fires.push({ x, y: y + 0.95, z, s: 0.8, embers: true });
  ctx.lights.push({ x, y: y + 1.5, z, r: 1, g: 0.42, b: 0.1, radius: 9, intensity: 1.8, room });
  if (ctx.dynLights) ctx.dynLights.push({ x, y: y + 1.5, z, intensity: 6, range: 10, room });
  col(ctx, x - 1.25, y, z - 1.25, x + 1.25, y + 2.5, z + 1.25);
}

// Pila de curtido llena de sangre/tinte.
export function tanningVat(ctx, x0, z0, x1, z1, y = 0) {
  const wb = ctx.wb;
  const t = 0.3;
  solid(ctx, 'wallstone', x0, y, z0, x1, y + 0.7, z0 + t, { sub: 2 });
  solid(ctx, 'wallstone', x0, y, z1 - t, x1, y + 0.7, z1, { sub: 2 });
  solid(ctx, 'wallstone', x0, y, z0, x0 + t, y + 0.7, z1, { sub: 2 });
  solid(ctx, 'wallstone', x1 - t, y, z0, x1, y + 0.7, z1, { sub: 2 });
  wb.box('blood', x0 + t, y + 0.45, z0 + t, x1 - t, y + 0.46, z1 - t, { faces: 't', ao: false, grime: false });
  ctx.col.add(x0 + t, y, z0 + t, x1 - t, y + 0.7, z1 - t);
}

// Bastidor de secado con pieles.
export function dryingRack(ctx, x, y, z, rot = 0, seed = 1) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  wb.at(x, y, z, rot, () => {
    for (const sx of [-1.4, 1.4]) wb.box('wooddark', sx - 0.06, 0, -0.06, sx + 0.06, 2.4, 0.06, { ao: false });
    wb.box('wooddark', -1.5, 2.3, -0.05, 1.5, 2.4, 0.05, { ao: false });
    for (let i = 0; i < 3; i++) {
      const px = -0.9 + i * 0.9;
      wb.push();
      wb.translate(px, 2.3, 0);
      wb.rotateZ(rng.range(-0.1, 0.1));
      wb.box(rng.chance(0.5) ? 'leather' : 'skinCorrupt', -0.35, -1.5 + rng.range(0, 0.4), -0.01, 0.35, 0, 0.01, { ao: false, faces: 'ns' });
      wb.pop();
    }
  });
}

// Escalera de mano apoyada.
export function ladder(ctx, x, y, z, h, rot = 0, lean = 0.25) {
  const wb = ctx.wb;
  wb.push();
  wb.translate(x, y, z);
  wb.rotateY(rot);
  wb.rotateX(-lean);
  for (const sx of [-0.25, 0.25]) wb.box('wooddark', sx - 0.04, 0, -0.04, sx + 0.04, h, 0.04, { ao: false });
  for (let yy = 0.3; yy < h; yy += 0.35) wb.box('wooddark', -0.25, yy, -0.025, 0.25, yy + 0.05, 0.025, { ao: false });
  wb.pop();
}

// Árbol muerto retorcido.
export function deadTree(ctx, x, y, z, seed = 1, h = 5) {
  const rng = new RNG(seed);
  const wb = ctx.wb;
  const branch = (px, py, pz, len, r, ax, az, depth) => {
    const m = M4().compose(V(px, py, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(ax, 0, az)), V(1, 1, 1));
    const g = new THREE.CylinderGeometry(r * 0.6, r, len, 5);
    g.translate(0, len / 2, 0);
    wb.geometry('wooddark', g, m, { ao: false, uvScale: 2, tint: [0.55, 0.5, 0.45] });
    if (depth <= 0) return;
    const tip = V(0, len, 0).applyMatrix4(m);
    const n = depth > 1 ? 3 : 2;
    for (let i = 0; i < n; i++) branch(tip.x, tip.y, tip.z, len * rng.range(0.5, 0.75), r * 0.6, ax + rng.range(-0.8, 0.8), az + rng.range(-0.9, 0.9), depth - 1);
  };
  branch(x, y, z, h * 0.45, 0.28, rng.range(-0.1, 0.1), rng.range(-0.1, 0.1), 3);
  col(ctx, x - 0.3, y, z - 0.3, x + 0.3, y + 3, z + 0.3);
}

// Lápida / cruz de madera.
export function grave(ctx, x, y, z, rot = 0, kind = 0) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    if (kind === 0) {
      wb.box('ashlar', -0.3, 0, -0.08, 0.3, 0.8, 0.08, { ao: false, faces: 'tnsew' });
      wb.cylinder('ashlar', 0, 0.8, 0, 0.3, 0.3, 0.16, 8, { ao: false });
    } else {
      wb.box('wooddark', -0.05, 0, -0.05, 0.05, 1.2, 0.05, { ao: false });
      wb.box('wooddark', -0.3, 0.8, -0.04, 0.3, 0.9, 0.04, { ao: false });
    }
    wb.box('dirt', -0.45, 0, 0.15, 0.45, 0.15, 1.9, { ao: false, faces: 'tnsew' });
  });
}

// Mesa de altar con paño.
export function altarTable(ctx, x, y, z, rot = 0, w = 2.4) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('ashlar', -w / 2, 0, -0.5, w / 2, 1.0, 0.5, { faces: 'tnsew', sub: 2 });
    wb.box('clothWhite', -w / 2 - 0.02, 0.6, -0.52, w / 2 + 0.02, 1.02, 0.52, { ao: false, faces: 'tnsew', tint: [0.8, 0.7, 0.6] });
    wb.box('clothRed', -0.3, 0.1, 0.52, 0.3, 1.02, 0.54, { ao: false, faces: 's' });
  });
  const c = Math.abs(Math.cos(rot)),
    s = Math.abs(Math.sin(rot));
  col(ctx, x - (w / 2) * c - 0.5 * s, y, z - (w / 2) * s - 0.5 * c, x + (w / 2) * c + 0.5 * s, y + 1, z + (w / 2) * s + 0.5 * c);
}

// Estante de armas.
export function weaponRack(ctx, x, y, z, rot = 0) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -1, 0, -0.1, 1, 0.1, 0.1, { ao: false });
    wb.box('wooddark', -1, 1.4, -0.1, 1, 1.5, 0.1, { ao: false });
    for (let i = 0; i < 4; i++) {
      const px = -0.75 + i * 0.5;
      wb.box('plate', px - 0.03, 0.1, -0.01, px + 0.03, 1.5, 0.01, { ao: false });
      wb.box('iron', px - 0.12, 1.1, -0.03, px + 0.12, 1.14, 0.03, { ao: false });
    }
  });
}

// Altar de velas (punto de descanso).
export function candleAltar(ctx, x, y, z, rot = 0, room) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('ashlar', -0.8, 0, -0.45, 0.8, 0.95, 0.45, { faces: 'tnsew', sub: 2, aoH: 0.4, room });
    wb.box('ashlar', -0.9, 0.95, -0.52, 0.9, 1.05, 0.52, { ao: false, room });
    wb.box('clothRed', -0.25, 0.3, 0.45, 0.25, 1.05, 0.47, { ao: false, faces: 's', room });
    // cruz de hierro
    wb.box('iron', -0.03, 1.05, -0.3, 0.03, 1.9, -0.24, { ao: false, room });
    wb.box('iron', -0.22, 1.55, -0.3, 0.22, 1.61, -0.24, { ao: false, room });
    // cera derretida
    wb.box('candle', -0.85, 0.9, -0.5, 0.85, 1.07, 0.5, { ao: false, faces: 'nsew', grime: false, tint: [0.9, 0.85, 0.7], room });
  });
  const pts = [
    [-0.6, -0.25],
    [-0.35, 0.2],
    [0.5, -0.2],
    [0.62, 0.22],
    [0.1, 0.25],
    [-0.1, -0.3],
  ];
  pts.forEach(([dx, dz], i) => {
    const c = Math.cos(rot),
      s = Math.sin(rot);
    const px = x + dx * c + dz * s,
      pz = z - dx * s + dz * c;
    const h = 0.12 + ((i * 37) % 5) * 0.05;
    wb.cylinder('candle', px, y + 1.05, pz, 0.04, 0.04, h, 5, { ao: false, capTop: true, grime: false, room });
    ctx.fires.push({ x: px, y: y + 1.05 + h, z: pz, s: 0.14, light: false, embers: false, glow: true });
  });
  ctx.lights.push({ x, y: y + 1.6, z, r: 1, g: 0.62, b: 0.3, radius: 6, intensity: 1.2, room });
  col(ctx, x - 0.8, y, z - 0.8, x + 0.8, y + 1.1, z + 0.8);
}
