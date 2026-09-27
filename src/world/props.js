// Atrezo procedural horneado en la geometría estática del mundo.
import * as THREE from 'three';
import { RNG, fbm3 } from '../core/util.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { solid } from './builders.js';
import { bakeCorpse } from '../entities/models.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const M4 = () => new THREE.Matrix4();

function col(ctx, x0, y0, z0, x1, y1, z1) {
  return ctx.col.add(Math.min(x0, x1), y0, Math.min(z0, z1), Math.max(x0, x1), y1, Math.max(z0, z1));
}

// Rectángulo girado (semiejes hx a lo largo, hz a lo ancho) aproximado con
// cajas pequeñas a lo largo de su eje: sin paredes invisibles en las esquinas.
export function colOBB(ctx, x, z, hx, hz, rot, y0, y1) {
  const c = Math.cos(rot),
    s = Math.sin(rot);
  const ac = Math.abs(c),
    as = Math.abs(s);
  // casi alineado: una sola caja
  if (ac > 0.985 || as > 0.985) {
    const ex = ac > as ? hx : hz,
      ez = ac > as ? hz : hx;
    return col(ctx, x - ex, y0, z - ez, x + ex, y1, z + ez);
  }
  const long = hx >= hz;
  const L = long ? hx : hz,
    Wd = long ? hz : hx;
  const n = Math.max(2, Math.ceil((L * 2) / (Wd * 1.2)));
  // dirección del eje largo en el mundo
  const dx = long ? c : s,
    dz = long ? -s : c;
  for (let i = 0; i < n; i++) {
    const t = -L + ((i + 0.5) / n) * 2 * L;
    const cx = x + dx * t,
      cz = z + dz * t;
    const half = L / n;
    const ex = Math.abs(dx) * half + Math.abs(dz) * Wd,
      ez = Math.abs(dz) * half + Math.abs(dx) * Wd;
    col(ctx, cx - ex * 0.92, y0, cz - ez * 0.92, cx + ex * 0.92, y1, cz + ez * 0.92);
  }
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
  const low = [];
  const nLow = Math.min(n, n > 3 ? n - Math.floor(n / 3) : n);
  for (let i = 0; i < nLow; i++) {
    const a = (i / nLow) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const r = nLow > 1 ? rng.range(0.28, 0.42) : 0;
    low.push([x + Math.cos(a) * r, z + Math.sin(a) * r]);
  }
  const put = (px, py, pz) => {
    const m = M4().compose(
      V(px, py, pz),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.25, 0.25), rng.range(0, 6), rng.range(-0.25, 0.25))),
      V(0.4, 0.28, 0.3)
    );
    ctx.wb.geometry('burlap', new THREE.SphereGeometry(1, 7, 5), m, { ao: false, uvScale: 1.5 });
  };
  for (const [px, pz] of low) put(px, y + 0.24, pz);
  // los de arriba descansan entre dos de abajo
  for (let i = nLow; i < n; i++) {
    const a = low[(i - nLow) % low.length],
      b = low[(i - nLow + 1) % low.length];
    put((a[0] + b[0]) / 2, y + 0.62, (a[1] + b[1]) / 2);
  }
  col(ctx, x - 0.62, y, z - 0.62, x + 0.62, y + (n > nLow ? 0.85 : 0.5), z + 0.62);
}

export function hay(ctx, x, y, z, rot = 0) {
  ctx.wb.at(x, y, z, rot, () => {
    ctx.wb.box('straw', -0.7, 0, -0.45, 0.7, 0.8, 0.45, { faces: 'tnsew', aoH: 0.4 });
    ctx.wb.box('leather', -0.72, 0.2, -0.46, 0.72, 0.26, 0.46, { ao: false, faces: 'nsew' });
  });
  colOBB(ctx, x, z, 0.72, 0.47, rot, y, y + 0.8);
}

// Carro de madera (volcado o quemado).
export function cart(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  wb.push();
  wb.translate(x, y, z);
  wb.rotateY(rot);
  if (o.tipped) {
    // volcado de lado, apoyado sobre el costado (-z)
    wb.translate(0, 0, -0.9);
    wb.rotateX(-1.25);
    wb.translate(0, 0.18, 0.9);
  } else if (o.brokenWheel) {
    // sin la rueda de +z: el carro cae hacia ese lado pivotando en el otro eje
    wb.translate(0, 0.52, -0.85);
    wb.rotateX(0.33);
    wb.translate(0, -0.52, 0.85);
  }
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
  if (o.brokenWheel) {
    // la rueda rota, tirada en el suelo junto al carro (fuera de la inclinación)
    const m = wb.m.clone();
    wb.pop();
    wb.push();
    wb.translate(x, y, z);
    wb.rotateY(rot);
    wb.translate(0.7, 0.06, 1.55);
    wb.rotateZ(0.08);
    wb.cylinder('wooddark', 0, -0.06, 0, 0.52, 0.52, 0.12, 10, { ao: false, capTop: true, capBot: true, tint });
    for (let k = 0; k < 3; k++) wb.box('wooddark', -0.5, 0.06, -0.03 + (k - 1) * 0.3, 0.5, 0.1, 0.03 + (k - 1) * 0.3, { ao: false, tint });
    wb.pop();
    wb.push();
    wb.m.copy(m);
    wb.nm.getNormalMatrix(wb.m);
  }
  // cuerpo sobre la caja (se inclina con ella)
  if (o.bodies) {
    wb.push();
    wb.translate(0.1, 0.66, 0);
    bakeCorpse(wb, 0, 0, 0, 0.3 + Math.PI / 2, 'back', 'villager', 2);
    wb.pop();
  }
  wb.pop();
  // colisión orientada (las varas no bloquean)
  colOBB(ctx, x + Math.cos(rot) * 0.0, z, 1.15, 0.85, rot, y, y + (o.tipped ? 1.6 : 1.1));
  if (o.burning && ctx.fires) {
    const fy = o.brokenWheel ? 0.5 : o.tipped ? 0.9 : 0.7;
    ctx.fires.push({ x, y: y + fy, z, s: 1.8, smoke: true });
    ctx.lights.push({ x, y: y + 1.5, z, r: 1, g: 0.45, b: 0.15, radius: 10, intensity: 1.5 });
  }
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
  if (o.collide !== false) colOBB(ctx, x, z, w / 2, d / 2, rot, y, y + 0.8);
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
  if (o.collide !== false) colOBB(ctx, x, z, w / 2, 0.27, rot, y, y + 1.0);
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
  colOBB(ctx, x, z, 2.2, 1.4, rot, y, y + 1.3);
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
    // cada grada es un escalón: se puede subir
    const h = r * 0.9;
    col(ctx, x - h, y + i * 0.28, z - h * 0.42, x + h, y + (i + 1) * 0.28, z + h * 0.42);
    col(ctx, x - h * 0.42, y + i * 0.28, z - h, x + h * 0.42, y + (i + 1) * 0.28, z + h);
    colOBB(ctx, x, z, h, h * 0.42, Math.PI / 4, y + i * 0.28, y + (i + 1) * 0.28);
    colOBB(ctx, x, z, h, h * 0.42, -Math.PI / 4, y + i * 0.28, y + (i + 1) * 0.28);
  }
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
  col(ctx, x - 3.2, y, z - 1.3, x + 3.2, y + 0.85, z + 1.3);
  col(ctx, x - 1.3, y, z - 3.2, x + 1.3, y + 0.85, z + 3.2);
  colOBB(ctx, x, z, 3.0, 1.25, Math.PI / 4, y, y + 0.85);
  colOBB(ctx, x, z, 3.0, 1.25, -Math.PI / 4, y, y + 0.85);
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
  colOBB(ctx, x, z, 1.3, 0.62, rot, y, y + 1.1);
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

// Flechas clavadas en el suelo: inclinadas, medio enterradas y con plumas.
export function arrows(ctx, x, y, z, n = 5, seed = 1, spread = 1.1) {
  const rng = new RNG(seed);
  const up = V(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const px = x + rng.range(-spread, spread),
      pz = z + rng.range(-spread, spread);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(0.12, 0.6), rng.range(0, Math.PI * 2), 0, 'YXZ'));
    const axis = up.clone().applyQuaternion(q);
    const len = 0.78,
      buried = rng.range(0.18, 0.32);
    const base = V(px, y, pz);
    const c = base.clone().addScaledVector(axis, len * (0.5 - buried));
    ctx.wb.geometry('wooddark', new THREE.CylinderGeometry(0.009, 0.009, len, 3), M4().compose(c, q, V(1, 1, 1)), { ao: false });
    const tail = base.clone().addScaledVector(axis, len * (1 - buried) - 0.07);
    for (let k = 0; k < 3; k++) {
      const qk = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(up, (k / 3) * Math.PI * 2));
      const off = V(0.018, 0, 0).applyQuaternion(qk);
      ctx.wb.geometry('clothWhite', new THREE.BoxGeometry(0.03, 0.1, 0.004), M4().compose(tail.clone().add(off), qk, V(1, 1, 1)), { ao: false, tint: [0.6, 0.55, 0.5] });
    }
  }
}

// ------------------------------------------------------------- carne corrupta
// Todo nace pegado a una superficie: se busca el suelo y el muro más cercano;
// la masa se asienta en la esquina, las venas reptan por el suelo y trepan por
// la pared (y se cortan donde el muro se acaba). Nada queda flotando.

// Tubo de radio variable a lo largo de una curva (venas).
function taperTube(pts, r0, r1, radial = 5, seed = 0) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const n = Math.max(6, pts.length * 4);
  const frames = curve.computeFrenetFrames(n, false);
  const len = curve.getLength();
  const pos = [],
    nor = [],
    uv = [],
    idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const P = curve.getPointAt(t);
    const N = frames.normals[i],
      B = frames.binormals[i];
    const bump = 1 + Math.sin(t * 23 + seed) * 0.18 + Math.sin(t * 7.3 + seed * 2) * 0.12;
    const r = Math.max(0.004, (r0 + (r1 - r0) * Math.pow(t, 0.8)) * bump);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const cx = Math.cos(a),
        cy = Math.sin(a);
      const nx = cx * N.x + cy * B.x,
        ny = cx * N.y + cy * B.y,
        nz = cx * N.z + cy * B.z;
      pos.push(P.x + nx * r, P.y + ny * r, P.z + nz * r);
      nor.push(nx, ny, nz);
      uv.push(j / radial, t * len * 1.5);
    }
  }
  const row = radial + 1;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * row + j;
      idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// Bulto orgánico: icosaedro deformado con ruido, normales suaves.
function lump(rng, detail = 2) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-4);
  const p = g.attributes.position;
  const o = [rng.range(0, 50), rng.range(0, 50), rng.range(0, 50)];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const n = fbm3(x * 1.4 + o[0], y * 1.4 + o[1], z * 1.4 + o[2], 3, 7);
    const k = 0.72 + n * 0.6;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return g;
}

export function fleshGrowth(ctx, x, y, z, size = 1, seed = 1, o = {}) {
  const rng = new RNG(seed);
  const wb = ctx.wb;
  const C = ctx.col;
  const tall = (b) => b.maxy - b.miny > 1.2 && b.tag !== 'floor';
  // suelo bajo el punto de origen
  const gy = C.groundHeight(x, z, 0.1, y + 0.4);
  const onFloor = Math.abs(gy - y) < 0.4;
  const fy = onFloor ? gy : y;
  // muro más cercano (los muros son cajas alineadas: basta con los 4 ejes)
  let wall = null;
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const d = C.raycast(x, fy + 0.45, z, dx, 0, dz, 1.4 + size * 1.6, tall);
    if (d !== Infinity && (!wall || d < wall.d)) wall = { d, nx: -dx, nz: -dz };
  }
  // base: pegada al muro si lo hay cerca
  let bx = x,
    bz = z;
  if (wall) {
    const keep = Math.min(wall.d, 0.2 + size * 0.28);
    bx = x - wall.nx * (wall.d - keep);
    bz = z - wall.nz * (wall.d - keep);
  }
  const tx = wall ? -wall.nz : 1,
    tz = wall ? wall.nx : 0; // tangente a lo largo del muro
  const nx = wall ? wall.nx : 0,
    nz = wall ? wall.nz : 0;
  const wallPt = (along, up, out) => V(bx + tx * along + nx * out, fy + up, bz + tz * along + nz * out);
  const bound = (p) => {
    if (!o.bound) return true;
    return p.x >= o.bound[0] - 0.2 && p.x <= o.bound[1] + 0.2 && p.z >= o.bound[2] - 0.2 && p.z <= o.bound[3] + 0.2;
  };
  // ¿sigue habiendo muro detrás de este punto?
  const wallAt = (p) => wall && C.raycast(p.x + nx * 0.3, p.y, p.z + nz * 0.3, -nx, 0, -nz, 0.9, tall) !== Infinity;

  // --- masa principal: bultos lobulados asentados en la esquina suelo-muro
  const blobs = [];
  const wallDist = wall ? Math.min(wall.d, 0.2 + size * 0.28) : 0;
  const nMass = onFloor ? Math.round(4 + size * 4) : 0;
  for (let i = 0; i < nMass; i++) {
    const big = i < 3;
    const s = size * (big ? rng.range(0.42, 0.6) : rng.range(0.18, 0.36));
    let c;
    if (wall) {
      const along = rng.range(-1, 1) * size * (big ? 0.45 : 0.95);
      const out = rng.range(0.05, 0.5) * size * (big ? 0.6 : 1);
      c = wallPt(along, s * 0.4, out - wallDist + s * 0.6);
    } else {
      const a = rng.range(0, Math.PI * 2),
        r = rng.range(0, 0.8) * size * (big ? 0.35 : 1);
      c = V(bx + Math.cos(a) * r, fy + s * 0.4, bz + Math.sin(a) * r);
    }
    const sc = V(s * rng.range(0.95, 1.3), s * rng.range(0.55, 0.8), s * rng.range(0.95, 1.2));
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.2, 0.2), rng.range(0, 6.28), rng.range(-0.2, 0.2)));
    wb.geometry('flesh', lump(rng, big ? 2 : 1), M4().compose(c, q, sc), { ao: false, uvScale: 1.3, grime: false });
    blobs.push({ c, s: sc.x });
  }
  // --- lámina que trepa por el muro: bultos aplastados contra la piedra,
  // solapados, que se estrechan hacia arriba (continua desde el suelo)
  let sheetTop = [];
  if (wall) {
    const H = Math.max(0.6, size * (o.climb ?? 1) * 1.3) + (o.lift ?? 0) * 0.3;
    const nS = Math.round(5 + size * 6);
    const y0 = onFloor ? 0.05 : -H * 0.45;
    const qn = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), V(nx, 0, nz));
    for (let i = 0; i < nS; i++) {
      const u = i / Math.max(1, nS - 1);
      const h = y0 + u * H * rng.range(0.85, 1.05);
      const w = 1 - u * 0.65;
      const s = size * rng.range(0.28, 0.46) * (0.55 + w * 0.45);
      const along = rng.range(-0.75, 0.75) * size * w;
      const c = wallPt(along, h + s * 0.3, -wallDist + s * 0.1);
      if (!onFloor && !wallAt(c)) continue;
      const roll = new THREE.Quaternion().setFromAxisAngle(V(nx, 0, nz), rng.range(0, 6.28));
      const q = roll.multiply(qn);
      wb.geometry('flesh', lump(rng, 1), M4().compose(c, q, V(s * rng.range(1, 1.35), s * rng.range(0.8, 1.1), s * 0.34)), { ao: false, uvScale: 1.3, grime: false });
      blobs.push({ c, s: s * 0.8 });
      if (u > 0.7) sheetTop.push({ along, h: h + s * 0.5 });
    }
  }
  // boca con dientes en el bulto mayor
  if (size >= 0.9 && blobs.length) {
    const b = blobs.reduce((a, q) => (q.s > a.s ? q : a), blobs[0]);
    const out = wall ? V(nx, 0.25, nz).normalize() : V(rng.range(-1, 1), 0.3, rng.range(-1, 1)).normalize();
    const m = b.c.clone().addScaledVector(out, b.s * 0.66);
    const side = V(-out.z, 0, out.x).normalize();
    wb.geometry('black', new THREE.SphereGeometry(1, 6, 4), M4().compose(m, new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), out), V(b.s * 0.32, b.s * 0.1, 0.04)), { ao: false, grime: false });
    for (let k = -2; k <= 2; k++) {
      for (const up of [1, -1]) {
        const tp = m.clone().addScaledVector(side, k * b.s * 0.1).add(V(0, up * b.s * 0.07, 0));
        const qt = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V(0, -up, 0).addScaledVector(out, 0.4).normalize());
        wb.geometry('bone', new THREE.ConeGeometry(0.018 * size + 0.01, 0.07 * size + 0.03, 4), M4().compose(tp, qt, V(1, 1, 1)), { ao: false });
      }
    }
  }
  // pústulas y ojos en la cara expuesta de los bultos
  for (const b of blobs) {
    const k = rng.int(0, 2);
    for (let i = 0; i < k; i++) {
      const dir = wall ? V(nx + rng.range(-0.7, 0.7), rng.range(0.1, 1), nz + rng.range(-0.7, 0.7)) : V(rng.range(-1, 1), rng.range(0.2, 1), rng.range(-1, 1));
      dir.normalize();
      const pp = b.c.clone().addScaledVector(dir, b.s * 0.62);
      const eye = rng.chance(0.3);
      const r = eye ? 0.024 * size + 0.014 : 0.03 * size + 0.015;
      wb.geometry(eye ? 'eyeGlow' : 'candle', new THREE.SphereGeometry(1, 6, 4), M4().compose(pp, new THREE.Quaternion(), V(r, r, r)), { ao: false, grime: false, tint: eye ? null : [1, 0.85, 0.55] });
    }
  }
  // --- venas por el suelo (se alejan de la masa, pegadas al suelo)
  const floorVeins = onFloor ? (o.tendrils ?? Math.round(2 + size * 2.5)) : 0;
  for (let i = 0; i < floorVeins; i++) {
    const r0 = 0.045 * size + 0.02;
    let ang = wall ? Math.atan2(nz, nx) + rng.range(-1.2, 1.2) : rng.range(0, Math.PI * 2);
    const start = wall ? wallPt(rng.range(-1, 1) * size, 0, rng.range(0.2, 0.5) * size) : V(bx, fy, bz);
    const pts = [];
    let px = start.x,
      pz = start.z;
    const steps = rng.int(4, 7);
    for (let k = 0; k <= steps; k++) {
      const rr = r0 * (1 - k / (steps + 1));
      pts.push(V(px, fy + rr * 0.45 + 0.012, pz));
      ang += rng.range(-0.5, 0.5);
      const st = size * rng.range(0.3, 0.5);
      const qx = px + Math.cos(ang) * st,
        qz = pz + Math.sin(ang) * st;
      // no atravesar muros ni salirse del límite
      if (C.raycast(px, fy + 0.2, pz, Math.cos(ang), 0, Math.sin(ang), st, tall) !== Infinity) break;
      if (Math.abs(C.groundHeight(qx, qz, 0.05, fy + 0.3) - fy) > 0.1) break;
      if (!bound(V(qx, fy, qz))) break;
      px = qx;
      pz = qz;
    }
    if (pts.length >= 3) wb.geometry('flesh', taperTube(pts, r0, 0.006, 5, i * 1.7 + seed), null, { ao: false, uvScale: 1, grime: false });
  }
  // --- venas que trepan por el muro (pegadas a su cara)
  if (wall) {
    const up = o.climb ?? 1;
    const nv = Math.round(2 + size * 2.2 * Math.min(1.5, up));
    for (let i = 0; i < nv; i++) {
      const r0 = 0.034 * size + 0.016;
      const top = sheetTop.length ? sheetTop[i % sheetTop.length] : { along: rng.range(-1, 1) * size, h: 0.2 * size };
      const pts = [];
      let al = top.along + rng.range(-0.15, 0.15) * size,
        h = top.h - 0.05;
      const H = size * up * rng.range(0.8, 1.7);
      const steps = rng.int(5, 8);
      for (let k = 0; k <= steps; k++) {
        const rr = r0 * (1 - k / (steps + 1));
        const p = wallPt(al, h, -wallDist + rr * 0.25 + 0.006);
        if (!wallAt(p) || !bound(p)) break;
        pts.push(p);
        h += H / steps;
        al += rng.range(-0.35, 0.35) * size;
      }
      if (pts.length >= 3) wb.geometry('flesh', taperTube(pts, r0, 0.006, 5, i * 2.3 + seed), null, { ao: false, uvScale: 1, grime: false });
    }
  }
  // charco bajo la masa
  if (onFloor && ctx.decals) ctx.decals.push({ x: bx + nx * size * 0.3, y: fy + 0.015, z: bz + nz * size * 0.3, size: size * 2.2, tex: 'splat', rot: seed * 1.3, opacity: 0.8 });
  if (ctx.lights && o.glow !== false) ctx.lights.push({ x: bx + nx * 0.5, y: fy + 0.5, z: bz + nz * 0.5, r: 0.9, g: 0.2, b: 0.12, radius: 2.5 + size * 1.6, intensity: 0.4, room: o.room });
  if (o.collide) col(ctx, bx - size, fy, bz - size, bx + size, fy + size, bz + size);
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
  colOBB(ctx, x, z, 1.4, 0.6, rot, y, y + 0.9);
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
  colOBB(ctx, x, z, w / 2, 0.2, rot, y, y + 2);
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

// Escalera de mano apoyada en un muro: (x, z) es el pie del muro donde se
// apoya; la escalera mira hacia +z local (se aleja del muro al bajar).
export function ladder(ctx, x, y, z, h, rot = 0, lean = 0.25) {
  const wb = ctx.wb;
  wb.push();
  wb.translate(x, y, z);
  wb.rotateY(rot);
  // pie separado del muro lo justo para que la parte alta toque la pared
  wb.translate(0, 0, h * Math.sin(lean) + 0.05);
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
  colOBB(ctx, x, z, w / 2, 0.5, rot, y, y + 1);
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
  colOBB(ctx, x, z, 1, 0.15, rot, y, y + 1.5);
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

// ============================================================= atrezo extra
// (detalle para que calles y patios no se vean vacíos)

// Vasija/ánfora de barro (entera, volcada o rota).
export function jar(ctx, x, y, z, s = 1, o = {}) {
  const wb = ctx.wb;
  const pts = [
    [0.001, 0],
    [0.16, 0.02],
    [0.22, 0.14],
    [0.24, 0.3],
    [0.2, 0.44],
    [0.1, 0.52],
    [0.09, 0.58],
    [0.12, 0.62],
  ].map(([r, h]) => new THREE.Vector2(r * s, h * s));
  // rota: sólo queda la mitad de abajo, con el interior oscuro
  const g = new THREE.LatheGeometry(o.broken ? pts.slice(0, 4) : pts, 8);
  if (o.broken) ctx.wb.cylinder('black', x, y + 0.26 * s, z, 0.225 * s, 0.225 * s, 0.01, 8, { ao: false, capTop: true, grime: false });
  const m = M4();
  if (o.lying) m.compose(V(x, y + 0.22 * s, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 - 0.12, o.rot ?? 0, 0, 'YXZ')), V(1, 1, 1));
  else m.compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, o.rot ?? 0, 0)), V(1, 1, 1));
  wb.geometry('plaster', g, m, { ao: false, uvScale: 1.2, tint: o.tint ?? [0.66, 0.4, 0.28] });
  if (o.broken) {
    const rng = new RNG(Math.round(x * 31 + z * 17));
    for (let i = 0; i < 5; i++) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.4, 0.4), rng.range(0, 6), rng.range(-0.4, 0.4)));
      wb.geometry('plaster', new THREE.BoxGeometry(0.12 * s, 0.02, 0.09 * s), M4().compose(V(x + rng.range(-0.5, 0.5), y + 0.01, z + rng.range(-0.5, 0.5)), q, V(1, 1, 1)), { ao: false, tint: [0.72, 0.46, 0.34] });
    }
  }
  if (o.collide !== false && !o.lying) col(ctx, x - 0.2 * s, y, z - 0.2 * s, x + 0.2 * s, y + (o.broken ? 0.3 : 0.6) * s, z + 0.2 * s);
}

// Cesta de mimbre, a veces volcada con su contenido.
export function basket(ctx, x, y, z, o = {}) {
  const wb = ctx.wb;
  const tip = !!o.tipped;
  wb.push();
  wb.translate(x, y + (tip ? 0.18 : 0), z);
  wb.rotateY(o.rot ?? 0);
  if (tip) wb.rotateX(1.35);
  wb.cylinder('straw', 0, tip ? -0.18 : 0, 0, 0.17, 0.22, 0.34, 8, { ao: false, capBot: true, tint: [0.62, 0.5, 0.36] });
  wb.cylinder('wooddark', 0, tip ? 0.14 : 0.32, 0, 0.225, 0.225, 0.04, 8, { ao: false });
  wb.pop();
  if (tip) {
    const rng = new RNG(Math.round(x * 13 + z * 7));
    for (let i = 0; i < 5; i++) wb.geometry(o.fill ?? 'bone', new THREE.SphereGeometry(0.06, 5, 3), M4().compose(V(x + rng.range(0.1, 0.6) * Math.sin(o.rot ?? 0) + rng.range(-0.15, 0.15), y + 0.05, z + rng.range(0.1, 0.6) * Math.cos(o.rot ?? 0) + rng.range(-0.15, 0.15)), new THREE.Quaternion(), V(1, 0.8, 1)), { ao: false, tint: o.fillTint ?? [0.55, 0.4, 0.28] });
  }
}

// Pila de leña apoyada en una pared (rot orienta los troncos).
export function firewood(ctx, x, y, z, rot = 0, n = 3) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    for (let r = 0; r < n; r++) {
      const k = n - r + 2;
      for (let i = 0; i < k; i++) {
        wb.push();
        wb.translate(-((k - 1) * 0.2) / 2 + i * 0.2, 0.1 + r * 0.17, 0);
        wb.rotateX(Math.PI / 2);
        wb.cylinder('wooddark', 0, -0.6, 0, 0.09, 0.09, 1.2, 6, { ao: false, capTop: true, capBot: true, tint: [0.62, 0.5, 0.4] });
        wb.pop();
      }
    }
  });
  colOBB(ctx, x, z, (n + 2) * 0.1 + 0.05, 0.6, rot, y, y + n * 0.17 + 0.1);
}

// Arma o pieza de armadura tirada en el suelo.
export function dropped(ctx, x, y, z, rot = 0, kind = 'sword') {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    if (kind === 'sword') {
      wb.box('plate', -0.03, 0.01, -0.02, 0.03, 0.025, 0.78, { ao: false });
      wb.box('iron', -0.13, 0.005, -0.04, 0.13, 0.04, -0.01, { ao: false });
      wb.box('leather', -0.02, 0.005, -0.24, 0.02, 0.04, -0.04, { ao: false });
    } else if (kind === 'spear') {
      wb.box('wooddark', -0.02, 0.01, -1.2, 0.02, 0.05, 1.0, { ao: false });
      wb.push();
      wb.translate(0, 0.03, 1.12);
      wb.rotateX(Math.PI / 2);
      wb.cylinder('iron', 0, -0.12, 0, 0.04, 0.001, 0.26, 4, { ao: false });
      wb.pop();
    } else if (kind === 'shield') {
      wb.push();
      wb.translate(0, 0.03, 0);
      wb.rotateX(-Math.PI / 2 + 0.08);
      wb.cylinder('planks', 0, 0, 0, 0.3, 0.3, 0.04, 10, { ao: false, capTop: true, capBot: true });
      wb.cylinder('iron', 0, 0.04, 0, 0.07, 0.05, 0.03, 6, { ao: false, capTop: true });
      wb.pop();
    } else if (kind === 'helmet') {
      wb.cylinder('plate', 0, 0, 0, 0.13, 0.12, 0.18, 8, { ao: false, capTop: true });
      wb.cylinder('iron', 0, 0.02, 0, 0.14, 0.14, 0.03, 8, { ao: false });
    } else if (kind === 'axe') {
      wb.box('wooddark', -0.02, 0.01, -0.45, 0.02, 0.05, 0.4, { ao: false });
      wb.box('iron', -0.14, 0.01, 0.3, 0.01, 0.03, 0.44, { ao: false });
    }
  });
}

// Letrero colgante de tienda sobre ménsula de hierro (fachada en el plano rot).
export function sign(ctx, x, y, z, rot = 0, kind = 0) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('iron', -0.02, 0, 0, 0.02, 0.04, 0.9, { ao: false });
    wb.box('iron', -0.015, -0.3, 0.05, 0.015, 0.0, 0.08, { ao: false });
    for (const zz of [0.3, 0.8]) wb.box('iron', -0.006, -0.18, zz - 0.006, 0.006, 0, zz + 0.006, { ao: false });
    wb.push();
    wb.translate(0, -0.18, 0.55);
    wb.rotateZ(0.06 * (kind % 2 ? 1 : -1));
    wb.box('planks', -0.03, -0.5, -0.32, 0.03, 0, 0.32, { ao: false, tint: [0.7, 0.6, 0.5] });
    // símbolo tallado (bota, pan, jarra, llave)
    const mat = 'wooddark';
    if (kind % 4 === 0) {
      wb.box(mat, -0.04, -0.36, -0.12, 0.04, -0.14, -0.04, { ao: false });
      wb.box(mat, -0.04, -0.36, -0.04, 0.04, -0.28, 0.14, { ao: false });
    } else if (kind % 4 === 1) wb.cylinder(mat, 0, -0.34, 0, 0.13, 0.11, 0.14, 7, { ao: false, capTop: true });
    else if (kind % 4 === 2) {
      wb.cylinder(mat, 0, -0.4, 0, 0.08, 0.1, 0.22, 6, { ao: false, capTop: true });
      wb.box(mat, -0.04, -0.34, 0.1, 0.04, -0.22, 0.16, { ao: false });
    } else {
      wb.box(mat, -0.04, -0.28, -0.18, 0.04, -0.24, 0.12, { ao: false });
      wb.cylinder(mat, 0, -0.34, 0.16, 0.07, 0.07, 0.12, 6, { ao: false });
    }
    wb.pop();
  });
}

// Farol de hierro apagado (o encendido) en ménsula.
export function lantern(ctx, x, y, z, rot = 0, lit = false, o = {}) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('iron', -0.02, 0, 0, 0.02, 0.03, 0.42, { ao: false });
    wb.box('iron', -0.005, -0.12, 0.38, 0.005, 0, 0.39, { ao: false });
    wb.cylinder('iron', 0, -0.36, 0.38, 0.1, 0.1, 0.03, 6, { ao: false, capBot: true });
    wb.cylinder(lit ? 'ember' : 'black', 0, -0.33, 0.38, 0.08, 0.08, 0.16, 6, { ao: false, grime: false });
    wb.cylinder('iron', 0, -0.17, 0.38, 0.11, 0.02, 0.1, 6, { ao: false });
  });
  if (lit) {
    const c = Math.cos(rot),
      s = Math.sin(rot);
    const px = x + s * 0.38,
      pz = z + c * 0.38;
    ctx.fires.push({ x: px, y: y - 0.3, z: pz, s: 0.18, light: false, embers: false, glow: true });
    ctx.lights.push({ x: px, y: y - 0.3, z: pz, r: 1, g: 0.55, b: 0.2, radius: 4.5, intensity: 0.9, room: o.room });
  }
}

// Cuerda con ropa tendida entre dos puntos.
export function laundry(ctx, x0, z0, x1, z1, y, seed = 1) {
  const rng = new RNG(seed);
  const wb = ctx.wb;
  const L = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(3, Math.round(L * 2.5));
  const sag = L * 0.06;
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = V(x0 + (x1 - x0) * t, y - Math.sin(t * Math.PI) * sag, z0 + (z1 - z0) * t);
    if (prev) {
      const mid = prev.clone().add(p).multiplyScalar(0.5);
      const dir = p.clone().sub(prev);
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
      wb.geometry('burlap', new THREE.CylinderGeometry(0.008, 0.008, dir.length(), 3), M4().compose(mid, q, V(1, 1, 1)), { ao: false });
    }
    prev = p;
  }
  const ang = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i < Math.floor(L / 0.9); i++) {
    if (rng.chance(0.3)) continue;
    const t = (i + 0.5) / Math.floor(L / 0.9);
    const w = rng.range(0.35, 0.65),
      h = rng.range(0.4, 0.9);
    const cy = y - Math.sin(t * Math.PI) * sag;
    wb.push();
    wb.translate(x0 + (x1 - x0) * t, cy, z0 + (z1 - z0) * t);
    wb.rotateY(ang + Math.PI / 2);
    wb.rotateX(rng.range(-0.08, 0.08));
    wb.box(rng.pick(['clothWhite', 'clothWhite', 'clothBlue', 'clothRed', 'burlap', 'burlap']), -w / 2, -h, -0.01, w / 2, 0, 0.01, { ao: false, faces: 'ns', tint: [1.15, 1.1, 1.05], grime: false });
    wb.pop();
  }
}

// Muñeco de entrenamiento (poste con saco y brazo) o diana con flechas.
export function dummy(ctx, x, y, z, rot = 0) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.cylinder('wooddark', 0, 0, 0, 0.07, 0.06, 1.9, 6, { ao: false, capTop: true });
    wb.box('wooddark', -0.55, 1.25, -0.04, 0.55, 1.33, 0.04, { ao: false });
    wb.cylinder('burlap', 0, 1.0, 0, 0.2, 0.18, 0.62, 7, { ao: false, capTop: true, capBot: true });
    wb.cylinder('burlap', 0, 1.62, 0, 0.12, 0.1, 0.24, 6, { ao: false, capTop: true });
    wb.box('wooddark', -0.25, 0, -0.04, 0.25, 0.08, 0.04, { ao: false });
    wb.box('wooddark', -0.04, 0, -0.25, 0.04, 0.08, 0.25, { ao: false });
  });
  col(ctx, x - 0.2, y, z - 0.2, x + 0.2, y + 1.9, z + 0.2);
}

export function target(ctx, x, y, z, rot = 0) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    for (const sx of [-0.4, 0.4]) wb.box('wooddark', sx - 0.04, 0, 0.2, sx + 0.04, 1.3, 0.28, { ao: false });
    wb.push();
    wb.translate(0, 1.05, 0.1);
    wb.rotateX(Math.PI / 2 - 0.2);
    wb.cylinder('straw', 0, 0, 0, 0.55, 0.55, 0.18, 12, { ao: false, capTop: true, capBot: true });
    wb.cylinder('clothRed', 0, 0.185, 0, 0.18, 0.18, 0.005, 10, { ao: false, capTop: true });
    wb.pop();
  });
  const c = Math.cos(rot),
    s = Math.sin(rot);
  const rng = new RNG(Math.round(x * 7 - z * 3));
  for (let i = 0; i < 6; i++) {
    // flechas clavadas en el blanco
    const lx = rng.range(-0.35, 0.35),
      ly = 1.05 + rng.range(-0.35, 0.35);
    const px = x + lx * c + 0.22 * s,
      pz = z - lx * s + 0.22 * c;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 + rng.range(-0.2, 0.2), rot + rng.range(-0.2, 0.2), 0, 'YXZ'));
    wb.geometry('wooddark', new THREE.CylinderGeometry(0.008, 0.008, 0.6, 3), M4().compose(V(px, ly, pz), q, V(1, 1, 1)), { ao: false });
  }
  colOBB(ctx, x, z, 0.5, 0.2, rot, y, y + 1.4);
}

// Piedra de catapulta hundida con su cráter.
export function siegeStone(ctx, x, y, z, s = 0.45) {
  ctx.wb.geometry('wallstone', new THREE.IcosahedronGeometry(s, 1), M4().compose(V(x, y + s * 0.55, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, x, 0.2)), V(1, 0.95, 1)), { ao: false, uvScale: 0.8 });
  rubble(ctx, x, y, z, 6, Math.round(x * 5 + z), s * 2.6, { scale: 0.45, mat: 'cobble' });
  if (ctx.decals) ctx.decals.push({ x, y, z, size: s * 5, tex: 'shadow', rot: 0, opacity: 0.75 });
  col(ctx, x - s * 0.8, y, z - s * 0.8, x + s * 0.8, y + s * 1.3, z + s * 0.8);
}

// Círculo ritual: velas negras, huesos y el sigilo pintado en el suelo.
export function ritual(ctx, x, y, z, r = 1.4, seed = 1, o = {}) {
  const rng = new RNG(seed);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const cx = x + Math.cos(a) * r,
      cz = z + Math.sin(a) * r;
    const h = rng.range(0.12, 0.3);
    ctx.wb.cylinder('candle', cx, y, cz, 0.035, 0.04, h, 5, { ao: false, capTop: true, grime: false, tint: [0.45, 0.4, 0.38] });
    if (rng.chance(0.7)) ctx.fires.push({ x: cx, y: y + h, z: cz, s: 0.12, light: false, embers: false, glow: rng.chance(0.4) });
  }
  bones(ctx, x, y, z, 7, seed + 3, r * 0.45);
  if (ctx.decals) ctx.decals.push({ x, y: y + 0.01, z, size: r * 2.3, tex: 'sigil', rot: seed, opacity: 0.85 });
  if (ctx.lights) ctx.lights.push({ x, y: y + 0.4, z, r: 1, g: 0.5, b: 0.25, radius: r + 3, intensity: 0.9, room: o.room });
}

// Matas de hierba y malas hierbas entre las losas.
export function weeds(ctx, x, y, z, n = 5, seed = 1, spread = 0.4, tint = [0.36, 0.44, 0.26]) {
  const rng = new RNG(seed);
  const wb = ctx.wb;
  for (let i = 0; i < n; i++) {
    const px = x + rng.range(-spread, spread),
      pz = z + rng.range(-spread, spread);
    const h = rng.range(0.1, 0.32);
    wb.push();
    wb.translate(px, y, pz);
    wb.rotateY(rng.range(0, 3.14));
    wb.rotateZ(rng.range(-0.5, 0.5));
    wb.box('straw', -0.01, 0, -0.01, 0.01, h, 0.01, { ao: false, tint, grime: false });
    wb.pop();
  }
}

// Cuerpo empalado en una estaca (advertencia de los sitiadores).
export function stake(ctx, x, y, z, rot = 0, seed = 1) {
  const wb = ctx.wb;
  wb.push();
  wb.translate(x, y, z);
  wb.rotateZ(0.06);
  wb.cylinder('wooddark', 0, 0, 0, 0.07, 0.05, 3.4, 6, { ao: false, capTop: true });
  wb.pop();
  bakeCorpse(wb, x, y + 1.6, z, rot, 'hang', seed % 2 ? 'soldier' : 'villager', seed);
  if (ctx.decals) ctx.decals.push({ x, y: y + 0.01, z, size: 1.4, tex: 'splat', rot: seed, opacity: 0.8 });
  col(ctx, x - 0.2, y, z - 0.2, x + 0.2, y + 3.4, z + 0.2);
}

// Viga quemada caída.
export function beam(ctx, x0, z0, x1, z1, y = 0, r = 0.13) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V(x1 - x0, 0.12, z1 - z0).normalize());
  ctx.wb.geometry('wooddark', new THREE.BoxGeometry(r * 2, len, r * 2), M4().compose(V((x0 + x1) / 2, y + r + 0.06, (z0 + z1) / 2), q, V(1, 1, 1)), { ao: false, tint: [0.3, 0.26, 0.24] });
  colOBB(ctx, (x0 + x1) / 2, (z0 + z1) / 2, len / 2, r, Math.atan2(-(z1 - z0), x1 - x0), y, y + r * 2 + 0.1);
}

// Cadenas que cuelgan de un muro o una viga.
export function chains(ctx, x, y, z, n = 8, rotZ = 0) {
  for (let k = 0; k < n; k++) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, k % 2 ? Math.PI / 2 : 0, rotZ));
    ctx.wb.geometry('iron', new THREE.TorusGeometry(0.035, 0.009, 3, 6), M4().compose(V(x + Math.sin(rotZ) * k * 0.06, y - k * 0.06, z), q, V(1, 1.4, 1)), { ao: false });
  }
}

// Tienda de campaña derrumbada (lona sobre palos).
export function tent(ctx, x, y, z, rot = 0, mat = 'burlap') {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.push();
    wb.translate(-1.2, 0, 0);
    wb.rotateZ(-0.5);
    wb.cylinder('wooddark', 0, 0, 0, 0.04, 0.04, 1.9, 5, { ao: false });
    wb.pop();
    const V3 = (a, b, c) => new THREE.Vector3(a, b, c);
    wb.quad(mat, V3(-1.4, 0.02, 1.1), V3(1.4, 0.02, 1.1), V3(1.2, 0.9, 0.05), V3(-0.3, 1.5, 0.05), { ao: false, sub: 3, tint: [0.7, 0.66, 0.6] });
    wb.quad(mat, V3(1.2, 0.9, -0.05), V3(1.4, 0.02, -1.1), V3(-1.4, 0.02, -1.1), V3(-0.3, 1.5, -0.05), { ao: false, sub: 3, tint: [0.65, 0.6, 0.55] });
  });
  colOBB(ctx, x, z, 1.3, 0.9, rot, y, y + 1.2);
}
