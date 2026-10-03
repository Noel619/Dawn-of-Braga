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

// Rectángulo girado (semiejes hx a lo largo del x local, hz del z local):
// caja orientada exacta, sin paredes invisibles en las esquinas.
export function colOBB(ctx, x, z, hx, hz, rot, y0, y1) {
  return ctx.col.addOBB(x, z, hx, hz, rot, y0, y1);
}

// Caja orientada a partir de la geometría real: recorre los puntos (en el
// espacio local 'm' de un objeto girado 'rot' en Y alrededor de (x,z)) y
// devuelve la caja que los envuelve en ese marco. Sirve para objetos
// volcados o inclinados cuya forma ya no está centrada en su origen.
export function colFromPoints(ctx, x, y, z, rot, pts, o = {}) {
  let x0 = Infinity,
    x1 = -Infinity,
    z0 = Infinity,
    z1 = -Infinity,
    y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    z0 = Math.min(z0, p.z);
    z1 = Math.max(z1, p.z);
    y1 = Math.max(y1, p.y);
  }
  const sh = o.shrink ?? 0.04;
  const lx = (x0 + x1) / 2,
    lz = (z0 + z1) / 2;
  const c = Math.cos(rot),
    s = Math.sin(rot);
  // centro local -> mundo (rotación en Y de three.js)
  const cx = x + lx * c + lz * s,
    cz = z - lx * s + lz * c;
  return ctx.col.addOBB(cx, cz, Math.max(0.05, (x1 - x0) / 2 - sh), Math.max(0.05, (z1 - z0) / 2 - sh), rot, y, Math.min(y + (o.maxH ?? 99), y1));
}

// Esquinas de una caja local transformadas por una matriz.
export function boxCorners(m, x0, y0, z0, x1, y1, z1) {
  const out = [];
  for (const X of [x0, x1]) for (const Y of [y0, y1]) for (const Z of [z0, z1]) out.push(V(X, Y, Z).applyMatrix4(m));
  return out;
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
  // caja orientada exacta (la caja alineada de 1,5 veces el tamaño que se
  // usaba antes dejaba paredes invisibles alrededor)
  if (o.collide !== false) colOBB(ctx, x, z, s / 2 + 0.02, s / 2 + 0.02, rot, y, y + s);
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
  // (la colisión, algo más alta que un escalón: que no se ande por encima
  // de los huecos entre saco y saco)
  col(ctx, x - 0.62, y, z - 0.62, x + 0.62, y + (n > nLow ? 0.85 : 0.6), z + 0.62);
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
  // vuelco / inclinación en el marco del carro (también define su colisión)
  const tip = M4();
  if (o.tipped) {
    // volcado de lado, apoyado sobre el costado (-z)
    tip.multiply(M4().makeTranslation(0, 0, -0.9)).multiply(M4().makeRotationX(-1.25)).multiply(M4().makeTranslation(0, 0.18, 0.9));
  } else if (o.brokenWheel) {
    // sin la rueda de +z: el carro cae hacia ese lado pivotando en el otro eje
    tip.multiply(M4().makeTranslation(0, 0.52, -0.85)).multiply(M4().makeRotationX(0.33)).multiply(M4().makeTranslation(0, -0.52, 0.85));
  }
  wb.push();
  wb.translate(x, y, z);
  wb.rotateY(rot);
  wb.m.multiply(tip);
  wb.nm.getNormalMatrix(wb.m);
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
  // colisión orientada sacada de la forma real (caja y ruedas ya volcadas;
  // las varas no bloquean): antes el carro volcado quedaba a metro y medio
  // de su colisión y se podía atravesar
  const pts = boxCorners(tip, -1.1, 0.55, -0.78, 1.1, 1.05, 0.78);
  for (const s of [-1, 1]) if (!(o.brokenWheel && s > 0)) pts.push(...boxCorners(tip, 0.2 - 0.5, 0.02, s * 0.85 - 0.06, 0.2 + 0.5, 1.04, s * 0.85 + 0.06));
  colFromPoints(ctx, x, y, z, rot, pts, { shrink: 0.03 });
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

// Cadalso con horca: tablado sobre pies derechos con arriostrado, escalera
// de verdad (cada peldaño se sube), trampilla, horca con tornapuntas y los
// ahorcados. La colisión sigue a cada pieza (sin paredes invisibles).
export function gallows(ctx, x, y, z, rot = 0, bodies = 2) {
  const wb = ctx.wb;
  const H = 1.3; // altura del tablado
  const hx = 2.2,
    hz = 1.4;
  const nSteps = 5;
  const rise = H / nSteps,
    run = 0.36,
    sw = 0.65; // semiancho de la escalera
  const c = Math.cos(rot),
    s = Math.sin(rot);
  const W = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const xs = bodies === 1 ? [0] : bodies === 2 ? [-0.9, 0.9] : [-1.2, 0, 1.2];
  wb.at(x, y, z, rot, () => {
    // tablero (tablas con juntas) y cabezas de viga
    wb.box('planks', -hx, H - 0.09, -hz, hx, H, hz, { faces: 'tnsewb', uv: 0.7, ao: false });
    for (const zz of [-hz + 0.1, 0, hz - 0.1]) wb.box('wooddark', -hx - 0.06, H - 0.3, zz - 0.09, hx + 0.06, H - 0.09, zz + 0.09, { ao: false });
    // pies derechos y cruces de San Andrés en los costados
    for (const px of [-hx + 0.1, 0, hx - 0.1])
      for (const pz of [-hz + 0.1, hz - 0.1]) wb.box('wooddark', px - 0.1, 0, pz - 0.1, px + 0.1, H - 0.09, pz + 0.1, { aoH: 0.5 });
    // cruces de San Andrés en la cara abierta (bajo la escalera)
    const brace = (ax, bx, lz) => {
      const dx = bx - ax,
        len = Math.hypot(dx, H - 0.35);
      const ang = Math.atan2(H - 0.35, dx);
      for (const sg of [1, -1]) {
        wb.push();
        wb.translate((ax + bx) / 2, (H - 0.35) / 2 + 0.05, lz + sg * 0.04);
        wb.rotateZ(sg * ang);
        wb.box('wooddark', -len / 2, -0.05, -0.03, len / 2, 0.05, 0.03, { ao: false });
        wb.pop();
      }
    };
    brace(-hx + 0.2, -0.1, hz - 0.1);
    brace(0.1, hx - 0.2, hz - 0.1);
    // faldón de tablas verticales en la trasera y los lados (la parte de delante
    // queda abierta bajo la escalera)
    for (let px = -hx; px < hx - 0.01; px += 0.3) wb.box('planks', px + 0.01, 0, -hz - 0.03, px + 0.29, H - 0.3, -hz + 0.01, { ao: false, faces: 'nsew', uv: 0.9, tint: [0.8, 0.76, 0.72] });
    for (const sx of [-1, 1]) for (let pz = -hz; pz < hz - 0.01; pz += 0.3) wb.box('planks', sx * hx - 0.02, 0, pz + 0.01, sx * hx + 0.02, H - 0.3, pz + 0.29, { ao: false, faces: 'nsew', uv: 0.9, tint: [0.8, 0.76, 0.72] });
    // trampilla bajo los ahorcados
    wb.box('black', -1.5, H + 0.001, -0.45, 1.5, H + 0.004, 0.45, { faces: 't', ao: false, grime: false });
    wb.box('wooddark', -1.55, H, -0.5, 1.55, H + 0.025, -0.45, { ao: false });
    wb.box('wooddark', -1.55, H, 0.45, 1.55, H + 0.025, 0.5, { ao: false });
    // horca: dos pies, travesaño y tornapuntas
    for (const sx of [-1.8, 1.8]) wb.box('wooddark', sx - 0.14, H, -0.14, sx + 0.14, H + 4.1, 0.14, { ao: false });
    wb.box('wooddark', -2.15, H + 3.85, -0.16, 2.15, H + 4.16, 0.16, { ao: false, faces: 'tnsewb' });
    for (const sx of [-1, 1]) {
      wb.push();
      wb.translate(sx * 1.45, H + 3.45, 0);
      wb.rotateZ(sx * 0.785);
      wb.box('wooddark', -0.07, -0.5, -0.07, 0.07, 0.5, 0.07, { ao: false });
      wb.pop();
    }
    // sogas con nudo
    for (const bx of xs) {
      wb.box('burlap', bx - 0.018, H + 2.35, -0.018, bx + 0.018, H + 3.86, 0.018, { ao: false });
      wb.cylinder('burlap', bx, H + 2.3, 0, 0.05, 0.05, 0.14, 5, { ao: false });
    }
    // escalera: zancas y peldaños macizos (se ven de lado)
    for (let i = 0; i < nSteps; i++) {
      const top = (i + 1) * rise;
      const zf = hz + (nSteps - i) * run;
      wb.box('planks', -sw, top - 0.07, zf - run - 0.02, sw, top, zf, { faces: 'tnsew', ao: false, uv: 0.8 });
      wb.box('wooddark', -sw + 0.06, 0, zf - run * 0.5 - 0.04, -sw + 0.14, top - 0.07, zf - run * 0.5 + 0.04, { ao: false });
      wb.box('wooddark', sw - 0.14, 0, zf - run * 0.5 - 0.04, sw - 0.06, top - 0.07, zf - run * 0.5 + 0.04, { ao: false });
    }
    const slen = Math.hypot(nSteps * run, H);
    for (const sx of [-sw - 0.04, sw + 0.04]) {
      wb.push();
      wb.translate(sx, H / 2 - 0.02, hz + (nSteps * run) / 2);
      wb.rotateX(Math.atan2(H, nSteps * run));
      wb.box('wooddark', -0.05, -0.1, -slen / 2, 0.05, 0.1, slen / 2, { ao: false });
      wb.pop();
    }
    // pasamanos en un lado de la escalera
    wb.box('wooddark', -sw - 0.08, 0, hz + nSteps * run - 0.08, -sw, 1.0, hz + nSteps * run, { ao: false });
    wb.push();
    wb.translate(-sw - 0.04, H / 2 + 0.95, hz + (nSteps * run) / 2);
    wb.rotateX(Math.atan2(H, nSteps * run));
    wb.box('wooddark', -0.035, -0.035, -slen / 2, 0.035, 0.035, slen / 2, { ao: false });
    wb.pop();
    wb.box('wooddark', -sw - 0.08, H, hz - 0.08, -sw, H + 1.0, hz, { ao: false });
  });
  // ahorcados (coordenadas mundo): los pies cuelgan sobre la trampilla
  xs.forEach((bx, i) => {
    const [wx, wz] = W(bx, 0);
    bakeCorpse(wb, wx, y + H + 0.65, wz, rot + (i - 1) * 0.6, 'hang', i % 2 ? 'soldier' : 'villager', i + 3);
    ctx.col.addOBB(wx, wz, 0.2, 0.2, rot, y + H + 0.6, y + H + 2.4).noSight = true;
  });
  // colisión: tablado (se puede subir por la escalera), pies de la horca y peldaños
  colOBB(ctx, x, z, hx, hz, rot, y, y + H);
  for (const sx of [-1.8, 1.8]) {
    const [px, pz] = W(sx, 0);
    colOBB(ctx, px, pz, 0.15, 0.15, rot, y + H, y + H + 4.1);
  }
  for (let i = 0; i < nSteps; i++) {
    const zf = hz + (nSteps - i) * run;
    const [px, pz] = W(0, (zf + hz) / 2);
    colOBB(ctx, px, pz, sw, (zf - hz) / 2, rot, y, y + (i + 1) * rise);
  }
  const [rx, rz] = W(-sw - 0.04, hz + (nSteps * run) / 2);
  colOBB(ctx, rx, rz, 0.05, (nSteps * run) / 2, rot, y, y + H + 1).noSight = true;
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

// Pozo con brocal de piedra, torno con cubo y tejadillo a cuatro aguas sobre
// cuatro postes. (El de dos aguas, visto por los hastiales —como se llega a
// la plazuela—, era un triángulo oscuro: parecía que no tenía tejado.) El
// tejadillo tiene cara inferior de tablas y canto: se ve igual desde abajo,
// desde cerca y desde cualquier lado.
export function well(ctx, x, y, z) {
  const wb = ctx.wb;
  const R = 1.1,
    rIn = 0.84,
    top = y + 1.02;
  const seg = 12;
  wb.cylinder('wallstone', x, y, z, R, R, 0.9, seg, { sub: 2 });
  wb.cylinder('ashlar', x, y + 0.9, z, R + 0.06, R + 0.06, 0.12, seg, { ao: false });
  // corona del brocal y pared interior del pozo (se ve bajar a la oscuridad)
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2,
      a1 = ((i + 1) / seg) * Math.PI * 2;
    const c0 = Math.cos(a0),
      s0 = Math.sin(a0),
      c1 = Math.cos(a1),
      s1 = Math.sin(a1);
    const Ro = R + 0.06;
    wb.quad('ashlar', V(x + c1 * Ro, top, z + s1 * Ro), V(x + c0 * Ro, top, z + s0 * Ro), V(x + c0 * rIn, top, z + s0 * rIn), V(x + c1 * rIn, top, z + s1 * rIn), { ao: false, sub: 3 });
    wb.quad('wallstone', V(x + c0 * rIn, y + 0.15, z + s0 * rIn), V(x + c1 * rIn, y + 0.15, z + s1 * rIn), V(x + c1 * rIn, top, z + s1 * rIn), V(x + c0 * rIn, top, z + s0 * rIn), { ao: true, aoH: 0.8, aoMin: 0.15, baseY: y + 0.15, sub: 3 });
  }
  wb.cylinder('water', x, y + 0.18, z, rIn, rIn, 0.02, seg, { capTop: true, ao: false, grime: false, tint: [0.12, 0.13, 0.14] });
  // cuatro postes sobre el brocal y el marco que sostiene el tejadillo
  const p = 0.76,
    eave = y + 2.5;
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    wb.box('wooddark', x + sx * p - 0.07, top, z + sz * p - 0.07, x + sx * p + 0.07, eave, z + sz * p + 0.07, { ao: false });
  for (const s of [-1, 1]) {
    wb.box('wooddark', x - p - 0.1, eave - 0.14, z + s * p - 0.06, x + p + 0.1, eave, z + s * p + 0.06, { ao: false, faces: 'tnsewb' });
    wb.box('wooddark', x + s * p - 0.06, eave - 0.14, z - p + 0.07, x + s * p + 0.06, eave, z + p - 0.07, { ao: false, faces: 'nsewb' });
  }
  // torno: eje entre dos tablas, soga enrollada, manivela y cubo colgando
  for (const s of [-1, 1]) wb.box('wooddark', x + s * 0.8 - 0.04, top, z - 0.1, x + s * 0.8 + 0.04, y + 2.05, z + 0.1, { ao: false });
  wb.push();
  wb.translate(x, y + 1.9, z);
  wb.rotateZ(Math.PI / 2);
  wb.cylinder('wooddark', 0, -0.84, 0, 0.07, 0.07, 1.68, 8, { ao: false, capTop: true, capBot: true });
  wb.cylinder('burlap', 0, -0.25, 0, 0.095, 0.095, 0.5, 8, { ao: false, uv: 3, tint: [0.8, 0.7, 0.55] });
  wb.pop();
  wb.box('iron', x + 0.84, y + 1.87, z - 0.02, x + 0.9, y + 2.2, z + 0.02, { ao: false });
  wb.box('iron', x + 0.86, y + 2.16, z - 0.02, x + 1.08, y + 2.2, z + 0.02, { ao: false });
  wb.box('burlap', x + 0.08, y + 1.3, z - 0.015, x + 0.11, y + 1.82, z + 0.015, { ao: false, tint: [0.8, 0.7, 0.55] });
  wb.cylinder('planks', x + 0.095, y + 1.0, z, 0.16, 0.19, 0.3, 8, { ao: false, capBot: true, uv: 1.2 });
  for (const yy of [1.04, 1.24]) wb.cylinder('iron', x + 0.095, y + yy, z, 0.185 - (yy - 1.04) * 0.1, 0.18 - (yy - 1.04) * 0.1, 0.03, 8, { ao: false });
  wb.box('iron', x + 0.08, y + 1.3, z - 0.17, x + 0.11, y + 1.33, z + 0.17, { ao: false });
  // tejadillo a cuatro aguas: teja por encima, tablas por debajo, canto de madera
  const hw = 1.22,
    rise = 0.85,
    th = 0.08;
  wb.pyramid('roof', x, z, hw * 2, hw * 2, eave, rise, { sub: 1.2 });
  const t = V(x, eave + rise - th, z);
  const c = [V(x - hw, eave - th, z + hw), V(x + hw, eave - th, z + hw), V(x + hw, eave - th, z - hw), V(x - hw, eave - th, z - hw)];
  for (let i = 0; i < 4; i++) wb.tri('planks', c[(i + 1) % 4], c[i], t, { ao: false, tint: [0.62, 0.56, 0.5] });
  wb.box('wooddark', x - hw, eave - th, z + hw - 0.03, x + hw, eave, z + hw, { ao: false, faces: 's' });
  wb.box('wooddark', x - hw, eave - th, z - hw, x + hw, eave, z - hw + 0.03, { ao: false, faces: 'n' });
  wb.box('wooddark', x + hw - 0.03, eave - th, z - hw, x + hw, eave, z + hw, { ao: false, faces: 'e' });
  wb.box('wooddark', x - hw, eave - th, z - hw, x - hw + 0.03, eave, z + hw, { ao: false, faces: 'w' });
  wb.cylinder('wooddark', x, eave + rise - 0.1, z, 0.06, 0.05, 0.3, 6, { ao: false });
  wb.cylinder('wooddark', x, eave + rise + 0.2, z, 0.09, 0.02, 0.14, 6, { ao: false });
  col(ctx, x - R, y, z - R, x + R, y + 1.0, z + R);
  // la cámara no se mete dentro del tejadillo (a nadie le estorba a esa altura)
  const cb = col(ctx, x - hw, eave - 0.2, z - hw, x + hw, eave + rise, z + hw);
  cb.noSight = true;
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
//   l, w: medio largo y medio ancho de la caja (1,2 x 0,55).
//   open: destapado (la tapa corrida en diagonal; lid: false, sin tapa).
//   hollow: abierto y hueco por dentro (con el fondo a la vista, para
//   tender algo dentro); si no, una boca negra.
export function sarcophagus(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  const l = o.l ?? 1.2,
    w = o.w ?? 0.55;
  const room = o.room;
  wb.at(x, y, z, rot, () => {
    if (o.open && o.hollow) {
      const t = 0.09,
        fb = o.floor ?? 0.24;
      wb.box('ashlar', -l, 0, -w, l, fb, w, { faces: 'nsew', sub: 2, aoH: 0.4, room });
      wb.box('ashlar', -l + t, fb - 0.02, -w + t, l - t, fb, w - t, { ao: false, faces: 't', room, tint: [0.42, 0.4, 0.37] });
      wb.box('ashlar', -l, fb, -w, l, 0.9, -w + t, { faces: 'tnsew', sub: 2, aoH: 0.4, room });
      wb.box('ashlar', -l, fb, w - t, l, 0.9, w, { faces: 'tnsew', sub: 2, aoH: 0.4, room });
      wb.box('ashlar', -l, fb, -w + t, -l + t, 0.9, w - t, { faces: 'tew', sub: 2, aoH: 0.4, room });
      wb.box('ashlar', l - t, fb, -w + t, l, 0.9, w - t, { faces: 'tew', sub: 2, aoH: 0.4, room });
    } else if (o.open) {
      // la boca negra, con su borde de piedra alrededor
      wb.box('ashlar', -l, 0, -w, l, 0.9, w, { faces: 'nsew', sub: 2, aoH: 0.4, room });
      const t = 0.1;
      for (const [a0, b0, a1, b1] of [
        [-l, -w, l, -w + t],
        [-l, w - t, l, w],
        [-l, -w + t, -l + t, w - t],
        [l - t, -w + t, l, w - t],
      ])
        wb.box('ashlar', a0, 0.9, b0, a1, 0.9, b1, { ao: false, faces: 't', room });
      wb.box('black', -l + t, 0.9, -w + t, l - t, 0.9, w - t, { ao: false, faces: 't', grime: false, room });
    } else wb.box('ashlar', -l, 0, -w, l, 0.9, w, { faces: 'tnsew', sub: 2, aoH: 0.4, room });
    wb.box('ashlar', -l - 0.1, 0, -w - 0.07, l + 0.1, 0.15, w + 0.07, { ao: false, room });
    if (o.open) {
      if (o.lid !== false) {
        wb.push();
        wb.translate(0.3, 0.9, 0.45);
        wb.rotateY(0.35);
        wb.rotateZ(0.08);
        wb.box('ashlar', -l - 0.05, 0, -w - 0.05, l + 0.05, 0.18, w + 0.05, { ao: false, faces: 'tnsewb', room });
        wb.pop();
      }
    } else {
      wb.box('ashlar', -l - 0.05, 0.9, -w - 0.05, l + 0.05, 1.08, w + 0.05, { ao: false, faces: 'tnsew', room });
      if (o.effigy) {
        wb.box('ashlar', -0.9, 1.08, -0.2, 0.7, 1.28, 0.2, { ao: false, room });
        wb.box('ashlar', 0.7, 1.08, -0.14, 0.98, 1.36, 0.14, { ao: false, room });
      }
    }
  });
  colOBB(ctx, x, z, l + 0.1, w + 0.07, rot, y, y + 1.1);
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

// Geometría de piedra tosca: un icosaedro deformado por ruido (la
// deformación depende sólo de la posición, así las caras no se separan) y
// desbastado por unos cuantos planos (lascas). Facetada.
//   k: irregularidad; cuts: lascas; cutMin/cutMax: lo hondo de cada lasca.
export function roughStoneGeo(seed, o = {}) {
  const g = new THREE.IcosahedronGeometry(1, o.detail ?? 1);
  return roughen(g, seed, o);
}

// Sillar o cascote roto: una caja con las aristas mordidas y caras alabeadas.
export function roughBlockGeo(seed, o = {}) {
  const g = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2).toNonIndexed();
  return roughen(g, seed, { k: 0.1, cuts: 3, cutMin: 0.32, cutMax: 0.46, freq: 2.2, ...o });
}

function roughen(g, seed, o) {
  const pos = g.attributes.position;
  const rng = new RNG(seed);
  const ox = rng.range(0, 50),
    oy = rng.range(0, 50),
    oz = rng.range(0, 50);
  const k = o.k ?? 0.22,
    fq = o.freq ?? 1.4;
  const cuts = [];
  for (let i = 0; i < (o.cuts ?? 3); i++) {
    const d = V(rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1)).normalize();
    cuts.push([d, rng.range(o.cutMin ?? 0.62, o.cutMax ?? 0.86)]);
  }
  // planos dados (una piedra partida: medio bolaño)
  for (const [d, c] of o.planes ?? []) cuts.push([V(...d).normalize(), c]);
  const v = V(0, 0, 0);
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    const f = 1 + (fbm3(v.x * fq + ox, v.y * fq + oy, v.z * fq + oz, 3, seed % 97) - 0.5) * 2 * k;
    v.multiplyScalar(f);
    for (const [d, c] of cuts) {
      const p = v.dot(d);
      if (p > c) v.addScaledVector(d, c - p);
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.deleteAttribute('normal');
  g.computeVertexNormals();
  return g;
}

// Una piedra tosca apoyada (algo hundida) en el suelo y: s es su tamaño.
// Devuelve su altura y su radio en planta.
export function roughStone(ctx, x, y, z, s, seed, o = {}) {
  const rng = new RNG(seed * 7 + 3);
  const g = o.block ? roughBlockGeo(seed, o) : roughStoneGeo(seed, o);
  const sc = o.scl ?? [1, rng.range(0.72, 0.95), rng.range(0.85, 1.1)];
  const rot = o.rot ?? new THREE.Euler(rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28));
  g.applyMatrix4(M4().compose(V(0, 0, 0), new THREE.Quaternion().setFromEuler(rot), V(s * sc[0], s * sc[1], s * sc[2])));
  g.computeBoundingBox();
  const bb = g.boundingBox;
  const sink = (o.sink ?? 0.1) * s;
  ctx.wb.geometry(o.mat ?? 'rock', g, M4().makeTranslation(x, y - bb.min.y - sink, z), { ao: false, uvScale: o.uvScale ?? 1.2, tint: o.tint, room: o.room });
  const h = bb.max.y - bb.min.y - sink,
    r = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2;
  if (o.collide) col(ctx, x - r * 0.8, y, z - r * 0.8, x + r * 0.8, y + h, z + r * 0.8);
  return { h, r };
}

// Hueso largo de A a B (en el marco local actual), con sus cabezas.
function longBone(wb, a, b, r, room, knobs = true) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  if (len < 0.01) return;
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
  wb.geometry('bone', new THREE.CylinderGeometry(r * 0.8, r, len, 5), M4().compose(a.clone().add(b).multiplyScalar(0.5), q, V(1, 1, 1)), { ao: false, room });
  if (knobs) for (const p of [a, b]) wb.geometry('bone', new THREE.SphereGeometry(r * 1.55, 5, 3), M4().compose(p, q, V(1, 0.8, 1)), { ao: false, room });
}

// Calavera en su marco: la cara hacia +x y la coronilla hacia +y (cráneo,
// cuencas, nariz y mandíbula).
function skull(wb, m, room, jaw = true) {
  const g = (geo, mat, mm) => wb.geometry(mat, geo, m.clone().multiply(mm), { ao: false, room, grime: mat !== 'black' });
  g(new THREE.SphereGeometry(0.1, 7, 5), 'bone', M4().makeScale(1.12, 0.95, 0.88));
  for (const sz of [-1, 1]) g(new THREE.BoxGeometry(0.012, 0.032, 0.034), 'black', M4().makeTranslation(0.104, 0.012, sz * 0.036));
  g(new THREE.BoxGeometry(0.012, 0.022, 0.018), 'black', M4().makeTranslation(0.108, -0.028, 0));
  if (jaw) g(new THREE.BoxGeometry(0.075, 0.035, 0.1), 'bone', M4().makeTranslation(0.05, -0.088, 0));
}
// (marcos: tendida boca arriba con la coronilla hacia +x; o de cara a +z)
const SKULL_UP = new THREE.Euler(Math.PI, 0, Math.PI / 2, 'ZYX');

// Esqueleto tendido boca arriba a lo largo del x local (la cabeza hacia +x)
// en el suelo y: calavera, columna, costillas, pelvis, brazos y piernas.
// mess (0..1): lo revuelto que está (y los huesos que faltan).
export function skeleton(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(o.seed ?? Math.round(Math.abs(x * 31 + z * 17)) + 1);
  const mess = o.mess ?? 0.15;
  const sc = o.scale ?? 0.92;
  const room = o.room;
  const j = (k = 1) => rng.range(-mess, mess) * 0.12 * k;
  const P3 = (px, py, pz) => V(px * sc + j(), py * sc, pz * sc + j());
  const gone = () => rng.chance(mess * 0.35);
  wb.at(x, y, z, rot, () => {
    // la calavera, algo ladeada
    const hq = new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.5, 0.5) * (0.3 + mess), 0, rng.range(-0.2, 0.2))).multiply(new THREE.Quaternion().setFromEuler(SKULL_UP));
    const hm = M4().compose(V((0.72 + j(2)) * sc, 0.09 * sc, j(2)), hq, V(sc, sc, sc));
    skull(wb, hm, room, !rng.chance(mess * 0.6));
    // columna (vértebras) y costillas
    for (let k = 0; k < 10; k++) {
      const vx = 0.58 - k * 0.062;
      if (!gone()) wb.geometry('bone', new THREE.BoxGeometry(0.045, 0.035, 0.05), M4().compose(P3(vx, 0.025, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, j(3), 0)), V(sc, sc, sc)), { ao: false, room });
    }
    for (let k = 0; k < 5; k++) {
      if (gone()) continue;
      const rx = 0.52 - k * 0.065;
      const R = (0.13 - Math.abs(k - 1.5) * 0.012) * sc;
      const flat = rng.chance(0.25 + mess * 0.5);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(flat ? Math.PI / 2 - 0.15 : 0, Math.PI / 2, 0));
      wb.geometry('bone', new THREE.TorusGeometry(R, 0.011 * sc, 3, 7, Math.PI), M4().compose(P3(rx, flat ? 0.015 : 0.02, 0), q, V(1, flat ? 0.5 : 0.85, 1)), { ao: false, room });
    }
    // pelvis
    if (!gone()) wb.geometry('bone', new THREE.SphereGeometry(0.1, 6, 4), M4().compose(P3(-0.02, 0.04, 0), new THREE.Quaternion(), V(0.9 * sc, 0.45 * sc, 1.35 * sc)), { ao: false, room });
    // brazos y piernas
    for (const s2 of [-1, 1]) {
      if (!gone()) longBone(wb, P3(0.5, 0.03, s2 * 0.19), P3(0.21, 0.03, s2 * (0.21 + j())), 0.018 * sc, room);
      if (!gone()) longBone(wb, P3(0.19, 0.025, s2 * 0.21), P3(-0.04, 0.025, s2 * (0.2 + j())), 0.014 * sc, room);
      if (!gone()) wb.geometry('bone', new THREE.BoxGeometry(0.08, 0.02, 0.05), M4().compose(P3(-0.1, 0.012, s2 * 0.2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, j(4), 0)), V(sc, sc, sc)), { ao: false, room });
      if (!gone()) longBone(wb, P3(-0.08, 0.035, s2 * 0.09), P3(-0.53, 0.035, s2 * (0.1 + j())), 0.024 * sc, room);
      if (!gone()) longBone(wb, P3(-0.56, 0.03, s2 * 0.1), P3(-0.95, 0.03, s2 * (0.1 + j())), 0.02 * sc, room);
      if (!gone()) wb.geometry('bone', new THREE.BoxGeometry(0.13, 0.03, 0.06), M4().compose(P3(-1.0, 0.02, s2 * 0.11), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, j(3), 0)), V(sc, sc, sc)), { ao: false, room });
    }
  });
}

// Fila de calaveras en una repisa (a lo largo del x local, mirando a +z).
export function skullRow(ctx, x, y, z, rot, n, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(o.seed ?? Math.round(Math.abs(x * 7 + z * 13)));
  const gap = o.gap ?? 0.24;
  wb.at(x, y, z, rot, () => {
    for (let k = 0; k < n; k++) {
      const px = (k - (n - 1) / 2) * gap + rng.range(-0.02, 0.02);
      // (la cara hacia +z: se gira el marco de la calavera)
      const m = M4().compose(V(px, 0.095, rng.range(-0.02, 0.02)), new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.12, 0.12), -Math.PI / 2 + rng.range(-0.3, 0.3), rng.range(-0.1, 0.1))), V(1, 1, 1));
      skull(wb, m, o.room, false);
    }
  });
}

// Muro de huesos apilados: cabezas de fémur y tibia en hileras (como en los
// osarios), con hileras de calaveras entre medias. x0..x1 a lo largo del x
// local, de y0 a y1, mirando a +z.
export function boneWall(ctx, x, y, z, rot, w, h, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(o.seed ?? Math.round(Math.abs(x * 11 + z * 5)));
  wb.at(x, y, z, rot, () => {
    // el fondo, de huesos amontonados (textura de calaveras, oscuro)
    wb.box('skulls', -w / 2, 0, -0.05, w / 2, h, 0, { faces: 's', ao: false, tint: [0.5, 0.47, 0.42], room: o.room });
    let yy = 0;
    let row = 0;
    while (yy < h - 0.1) {
      const skulls = row % 3 === 2;
      const rh = skulls ? 0.2 : 0.075;
      if (skulls) {
        const n = Math.floor(w / 0.23);
        for (let k = 0; k < n; k++) {
          const px = -w / 2 + 0.12 + k * 0.23 + rng.range(-0.02, 0.02);
          const m = M4().compose(V(px, yy + 0.095, 0.02), new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.1, 0.1), -Math.PI / 2 + rng.range(-0.25, 0.25), 0)), V(1, 1, 1));
          skull(wb, m, o.room, false);
        }
      } else {
        // cabezas de los huesos largos, una junto a otra
        const n = Math.floor(w / 0.07);
        for (let k = 0; k < n; k++) {
          const px = -w / 2 + 0.035 + k * 0.07 + (row % 2) * 0.035;
          if (px > w / 2 - 0.03) continue;
          wb.geometry('bone', new THREE.SphereGeometry(0.034, 5, 3), M4().compose(V(px, yy + 0.037, 0.0 + rng.range(-0.01, 0.015)), new THREE.Quaternion(), V(1, 0.9, 0.7)), { ao: false, room: o.room, tint: [0.9 + rng.range(-0.1, 0.06), 0.88, 0.8] });
        }
      }
      yy += rh;
      row++;
    }
  });
}

// El potro: un bastidor sobre cuatro patas con su lecho de tablas y un
// rodillo en cada cabecera (con las aspas para tensarlo). Largo en x local.
export function rack(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  const L = o.len ?? 2.4,
    W = o.w ?? 0.8,
    H = o.h ?? 0.78;
  const room = o.room;
  wb.at(x, y, z, rot, () => {
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) wb.box('wooddark', sx * (L / 2 - 0.12) - 0.06, 0, sz * (W / 2 - 0.06) - 0.06, sx * (L / 2 - 0.12) + 0.06, H, sz * (W / 2 - 0.06) + 0.06, { ao: false, room });
    // largueros y travesaños
    for (const sz of [-1, 1]) wb.box('wooddark', -L / 2, H - 0.16, sz * (W / 2 - 0.06) - 0.07, L / 2, H, sz * (W / 2 - 0.06) + 0.07, { ao: false, faces: 'tnsewb', room });
    for (const sx of [-1, 1]) wb.box('wooddark', sx * (L / 2 - 0.12) - 0.05, 0.18, -W / 2 + 0.06, sx * (L / 2 - 0.12) + 0.05, 0.28, W / 2 - 0.06, { ao: false, faces: 'tnsewb', room });
    // el lecho de tablas
    for (let k = 0; k < 8; k++) {
      const px = -L / 2 + 0.38 + k * ((L - 0.76) / 7);
      wb.box('planks', px - 0.1, H - 0.1, -W / 2 + 0.1, px + 0.1, H - 0.05, W / 2 - 0.1, { ao: false, faces: 'tnsewb', room, tint: [0.66, 0.56, 0.48] });
    }
    // los rodillos (a lo ancho, con sus tapas) y las aspas para girarlos
    for (const sx of [-1, 1]) {
      const rx = sx * (L / 2 - 0.12);
      wb.push();
      wb.translate(rx, H + 0.08, 0);
      wb.rotateX(Math.PI / 2);
      wb.cylinder('wooddark', 0, -W / 2 - 0.16, 0, 0.085, 0.085, W + 0.32, 8, { ao: false, capTop: true, capBot: true, room });
      // cuerda enrollada
      wb.cylinder('rope', 0, -0.18, 0, 0.1, 0.1, 0.36, 8, { ao: false, room });
      wb.pop();
      for (let k = 0; k < 4; k++) {
        const a = k * (Math.PI / 2) + 0.35 + (sx > 0 ? 0.4 : 0);
        const c = V(rx, H + 0.08, W / 2 + 0.2);
        const e = c.clone().add(V(Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0));
        const d = new THREE.Vector3().subVectors(e, c);
        wb.geometry('wooddark', new THREE.BoxGeometry(0.05, d.length(), 0.05), M4().compose(c.clone().add(e).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()), V(1, 1, 1)), { ao: false, room });
      }
    }
  });
  colOBB(ctx, x, z, L / 2 + 0.08, W / 2 + 0.25, rot, y, y + H + 0.2);
  return { H, L, W };
}

// Escombros de piedra: cascotes y sillares rotos, cada uno distinto, medio
// enterrados (antes, cajas perfectas).
export function rubble(ctx, x, y, z, n = 8, seed = 1, spread = 1.2, o = {}) {
  const rng = new RNG(seed);
  for (let i = 0; i < n; i++) {
    const s = rng.range(0.2, 0.6) * (o.scale ?? 1);
    // más juntos hacia el centro del montón
    const a = rng.range(0, Math.PI * 2),
      d = spread * Math.sqrt(rng.next());
    const px = x + Math.cos(a) * d,
      pz = z + Math.sin(a) * d;
    const block = rng.chance(o.blocks ?? 0.55);
    roughStone(ctx, px, y, pz, s * (block ? 1 : 0.62), Math.round(seed * 13 + i * 7), {
      block,
      mat: o.mat ?? 'wallstone',
      uvScale: 0.7,
      sink: 0.12,
      scl: block ? [1, rng.range(0.5, 0.75), rng.range(0.7, 1.0)] : undefined,
      tint: o.tint,
      room: o.room,
    });
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

// Tela fina de doble cara: dos cuadriláteros separados unos milímetros según
// su normal (nunca coinciden: sin parpadeo) y visibles desde ambos lados.
function cloth2(wb, mat, p0, p1, p2, p3, o = {}) {
  const n = new THREE.Vector3().subVectors(p1, p0).cross(new THREE.Vector3().subVectors(p3, p0)).normalize();
  const e = n.multiplyScalar(o.gap ?? 0.012);
  const oo = { ao: false, sub: o.sub ?? 3, tint: o.tint, grime: o.grime, uvLocal: true };
  wb.quad(mat, p0, p1, p2, p3, oo);
  wb.quad(mat, p3.clone().sub(e), p2.clone().sub(e), p1.clone().sub(e), p0.clone().sub(e), { ...oo, tint: o.backTint ?? (o.tint ? o.tint.map((v) => v * 0.82) : [0.84, 0.82, 0.8]) });
}

// Mercancía sobre un mostrador (espacio local del puesto: y = altura del tablero).
function stallGoods(ctx, kind, rng, y, hw, burnt) {
  const wb = ctx.wb;
  const sph = (mat, px, py, pz, sx, sy, sz, tint) => wb.geometry(mat, new THREE.SphereGeometry(1, 6, 4), M4().compose(V(px, py, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.3, 0.3), rng.range(0, 6), 0)), V(sx, sy, sz)), { ao: false, tint });
  const k = burnt ? 0.35 : 1;
  if (kind === 'bread') {
    // hogazas y panes largos, algunos mordisqueados por las ratas
    for (let i = 0; i < 9; i++) sph('straw', rng.range(-hw + 0.2, hw - 0.2), y + 0.07, rng.range(-0.3, 0.25), 0.13, 0.08, 0.1, [0.95 * k, 0.62 * k, 0.32 * k]);
    for (let i = 0; i < 3; i++) sph('straw', rng.range(-hw + 0.4, hw - 0.4), y + 0.06, rng.range(-0.25, 0.2), 0.28, 0.06, 0.07, [0.85 * k, 0.55 * k, 0.28 * k]);
    // cesta de panecillos
    wb.cylinder('straw', -hw + 0.35, y, 0.1, 0.2, 0.24, 0.16, 8, { ao: false, capBot: true, tint: [0.62, 0.5, 0.36] });
    for (let i = 0; i < 5; i++) sph('straw', -hw + 0.35 + rng.range(-0.1, 0.1), y + 0.17, 0.1 + rng.range(-0.1, 0.1), 0.07, 0.05, 0.07, [0.9 * k, 0.6 * k, 0.3 * k]);
  } else if (kind === 'veg') {
    // cestas con nabos, coles y manzanas podridas
    for (const [bx, bz, t] of [
      [-hw + 0.4, -0.1, [0.62, 0.72, 0.4]],
      [0, 0.05, [0.7, 0.28, 0.2]],
      [hw - 0.4, -0.12, [0.85, 0.8, 0.62]],
    ]) {
      wb.cylinder('straw', bx, y, bz, 0.26, 0.3, 0.2, 8, { ao: false, capBot: true, tint: [0.6, 0.48, 0.34] });
      for (let i = 0; i < 7; i++) sph('plaster', bx + rng.range(-0.15, 0.15), y + 0.2 + rng.range(0, 0.06), bz + rng.range(-0.15, 0.15), 0.07, 0.065, 0.07, t.map((v) => v * k * rng.range(0.7, 1.05)));
    }
  } else if (kind === 'pots') {
    for (let i = 0; i < 5; i++) jar(ctx, rng.range(-hw + 0.25, hw - 0.25), y, rng.range(-0.28, 0.2), rng.range(0.45, 0.7), { collide: false, rot: rng.range(0, 6), tint: [0.62 * k, 0.4 * k, 0.28 * k] });
    wb.cylinder('bronze', 0.3, y, 0.2, 0.16, 0.13, 0.1, 8, { ao: false, capTop: true });
  } else if (kind === 'cloth') {
    // rollos de paño
    for (let i = 0; i < 5; i++) {
      wb.push();
      wb.translate(-hw + 0.35 + i * ((hw * 2 - 0.7) / 4), y + 0.09, rng.range(-0.1, 0.1));
      wb.rotateX(Math.PI / 2);
      wb.rotateZ(rng.range(-0.15, 0.15));
      wb.cylinder(rng.pick(['clothRed', 'clothBlue', 'clothWhite', 'burlap', 'clothDark']), 0, -0.35, 0, 0.09, 0.09, 0.7, 7, { ao: false, capTop: true, capBot: true, tint: burnt ? [0.35, 0.3, 0.28] : null });
      wb.pop();
    }
  } else if (kind === 'meat') {
    // carnicería: piezas colgadas de ganchos y un tajo con cuchilla
    wb.box('wooddark', -0.35, y, -0.3, 0.35, y + 0.18, 0.2, { ao: false, faces: 'tnsew' });
    wb.box('iron', -0.05, y + 0.18, -0.12, 0.25, y + 0.2, -0.02, { ao: false });
    for (let i = 0; i < 3; i++) sph('skinCorrupt', rng.range(-hw + 0.3, hw - 0.3), y + 0.06, rng.range(-0.25, 0.2), 0.16, 0.06, 0.12, [0.8 * k, 0.45 * k, 0.4 * k]);
  }
}

// Puesto de mercado: mostrador de tablas con su mercancía, pies derechos,
// estante trasero y toldo a rayas con caída festoneada (de doble cara).
// kind: 'bread' | 'veg' | 'pots' | 'cloth' | 'meat'
export function stall(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(Math.round(x * 31 + z * 17) + 7);
  const hw = o.w ?? 1.35; // semiancho
  const burnt = !!o.burning;
  const wt = burnt ? [0.4, 0.34, 0.3] : null;
  const ct = o.cloth ?? 'clothRed';
  const ct2 = o.cloth2 ?? 'clothWhite';
  wb.at(x, y, z, rot, () => {
    const topY = 0.92;
    // tablero con canto y costeros
    wb.box('planks', -hw - 0.08, topY - 0.08, -0.5, hw + 0.08, topY, 0.56, { ao: false, faces: 'tnsewb', uv: 0.8, tint: wt });
    // frente de tablas verticales con holguras
    for (let px = -hw; px < hw - 0.01; px += 0.27) {
      const t = rng.range(0.8, 1.05);
      wb.box('planks', px + 0.012, 0.06, 0.44, px + 0.258, topY - 0.08, 0.49, { ao: false, faces: 'nsewt', uv: 0.9, tint: wt || [t, t * 0.97, t * 0.93] });
    }
    // costados
    for (const sx of [-1, 1]) wb.box('planks', sx * hw - 0.04, 0.06, -0.44, sx * hw + 0.04, topY - 0.08, 0.43, { ao: false, faces: 'tnsew', uv: 0.9, tint: wt });
    // travesaño bajo y balda inferior con mercancía guardada
    wb.box('wooddark', -hw, 0.16, -0.4, hw, 0.2, 0.4, { ao: false, faces: 'tnsewb', tint: wt });
    // pies derechos: traseros más altos (el toldo cae hacia delante)
    const yB = 2.55,
      yF = 2.12,
      zB = -0.47,
      zF = 0.5;
    for (const sx of [-hw - 0.02, hw + 0.02]) {
      wb.box('wooddark', sx - 0.055, 0, zB - 0.055, sx + 0.055, yB, zB + 0.055, { aoH: 0.5, tint: wt });
      wb.box('wooddark', sx - 0.055, 0, zF - 0.055, sx + 0.055, yF, zF + 0.055, { aoH: 0.5, tint: wt });
      // larguero lateral del toldo
      const len = Math.hypot(zF + 0.55 - zB, yB - yF + 0.24);
      wb.push();
      wb.translate(sx, (yB + yF - 0.24) / 2 + 0.03, (zB + zF + 0.55) / 2);
      wb.rotateX(Math.atan2(yB - yF + 0.24, zF + 0.55 - zB));
      wb.box('wooddark', -0.035, -0.035, -len / 2, 0.035, 0.035, len / 2, { ao: false, tint: wt });
      wb.pop();
    }
    wb.box('wooddark', -hw - 0.08, yB - 0.1, zB - 0.04, hw + 0.08, yB - 0.02, zB + 0.04, { ao: false, tint: wt });
    // estante trasero
    wb.box('planks', -hw + 0.05, 1.42, zB - 0.02, hw - 0.05, 1.47, zB + 0.24, { ao: false, faces: 'tnsewb', tint: wt });
    for (let i = 0; i < 4; i++) {
      if (rng.chance(0.3)) continue;
      const px = -hw + 0.3 + i * ((hw * 2 - 0.6) / 3);
      if (rng.chance(0.5)) jar(ctx, px, 1.47, zB + 0.11, 0.42, { collide: false, rot: rng.range(0, 6) });
      else wb.box(rng.pick(['leather', 'burlap', 'clothDark']), px - 0.12, 1.47, zB + 0.02, px + 0.12, 1.47 + rng.range(0.12, 0.26), zB + 0.2, { ao: false, tint: wt });
    }
    // toldo a rayas: franjas alternas de doble cara con caída
    const n = Math.max(5, Math.round((hw * 2 + 0.3) / 0.36));
    const xA = -hw - 0.15,
      xB = hw + 0.15;
    const back = (u) => V(xA + u * (xB - xA), yB + 0.02, zB - 0.12);
    const front = (u) => V(xA + u * (xB - xA), yF - 0.2, zF + 0.58);
    const torn = new Set();
    if (burnt) for (let i = 0; i < n; i++) if (rng.chance(0.4)) torn.add(i);
    for (let i = 0; i < n; i++) {
      if (torn.has(i)) continue;
      const u0 = i / n,
        u1 = (i + 1) / n;
      // pandeo: el centro de cada franja cae un poco
      const mid = (u) => back(u).lerp(front(u), 0.5).add(V(0, -0.06, 0));
      const mat = i % 2 ? ct2 : ct;
      const tint = burnt ? [0.35, 0.3, 0.28] : null;
      // (orden con la cara principal hacia arriba; la de abajo queda más oscura)
      cloth2(wb, mat, back(u0), mid(u0), mid(u1), back(u1), { tint, sub: 3 });
      cloth2(wb, mat, mid(u0), front(u0), front(u1), mid(u1), { tint, sub: 3 });
      // faldón festoneado colgando del borde delantero
      const fl = front(u0),
        fr = front(u1);
      const drop = 0.26 + (i % 2) * 0.04;
      const tip = V((fl.x + fr.x) / 2, fl.y - drop - 0.1, fl.z + 0.02);
      cloth2(wb, mat, V(fl.x, fl.y - drop, fl.z + 0.02), V(fr.x, fr.y - drop, fr.z + 0.02), V(fr.x, fr.y, fr.z + 0.02), V(fl.x, fl.y, fl.z + 0.02), { tint, sub: 3 });
      wb.tri(mat, V(fr.x, fr.y - drop, fr.z + 0.02), V(fl.x, fl.y - drop, fl.z + 0.02), tip, { ao: false, tint });
      wb.tri(mat, V(fl.x, fl.y - drop, fl.z + 0.008), V(fr.x, fr.y - drop, fr.z + 0.008), V(tip.x, tip.y, tip.z - 0.012), { ao: false, tint: [0.7, 0.68, 0.66] });
    }
    // vara delantera del toldo
    wb.box('wooddark', xA - 0.02, yF - 0.24, zF + 0.55, xB + 0.02, yF - 0.17, zF + 0.62, { ao: false, tint: wt });
    // mercancía y báscula
    stallGoods(ctx, o.goods ?? 'pots', rng, topY, hw, burnt);
    if (!burnt && rng.chance(0.6)) {
      wb.box('iron', hw - 0.45, topY, 0.2, hw - 0.42, topY + 0.35, 0.23, { ao: false });
      wb.box('iron', hw - 0.7, topY + 0.34, 0.2, hw - 0.17, topY + 0.36, 0.23, { ao: false });
      for (const sx of [hw - 0.68, hw - 0.19]) wb.cylinder('bronze', sx, topY + 0.14, 0.215, 0.09, 0.09, 0.02, 7, { ao: false, capTop: true, capBot: true });
    }
    // cosas colgadas del larguero delantero (ajos, hierbas, paños)
    for (let i = 0; i < 4; i++) {
      if (rng.chance(0.35)) continue;
      const px = -hw + 0.3 + i * ((hw * 2 - 0.6) / 3);
      const hy = yF - 0.22;
      wb.box('burlap', px - 0.008, hy - 0.3, zF + 0.57, px + 0.008, hy, zF + 0.59, { ao: false });
      if (o.goods === 'meat') wb.geometry('skinCorrupt', new THREE.SphereGeometry(1, 6, 4), M4().compose(V(px, hy - 0.5, zF + 0.58), new THREE.Quaternion(), V(0.12, 0.24, 0.09)), { ao: false, tint: [0.75, 0.4, 0.38] });
      else wb.geometry('straw', new THREE.SphereGeometry(1, 5, 4), M4().compose(V(px, hy - 0.38, zF + 0.58), new THREE.Quaternion(), V(0.07, 0.11, 0.07)), { ao: false, tint: burnt ? [0.3, 0.26, 0.24] : [0.86, 0.82, 0.7] });
    }
  });
  // género guardado bajo el mostrador y cajas al lado (en coordenadas mundo)
  const c = Math.cos(rot),
    s = Math.sin(rot);
  const Wp = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  if (!o.bare) {
    const [ax, az] = Wp(hw + 0.55, -0.15);
    crate(ctx, ax, y, az, 0.62, rot + 0.3);
    if (rng.chance(0.6)) {
      const [bx, bz] = Wp(-hw - 0.5, 0.1);
      basket(ctx, bx, y, bz, { rot: rng.range(0, 6), tipped: burnt });
    }
  }
  if (o.burning && ctx.fires) {
    ctx.fires.push({ x, y: y + 1.0, z, s: 1.4, smoke: true });
    ctx.lights.push({ x, y: y + 1.6, z, r: 1, g: 0.45, b: 0.15, radius: 8, intensity: 1.3 });
  }
  // mostrador (sin paredes invisibles: la caja sigue el giro del puesto)
  colOBB(ctx, x, z, hw + 0.1, 0.53, rot, y, y + 0.95);
}

// Pira funeraria: un castillete de troncos en capas cruzadas (cada capa
// descansa sobre la anterior) con los cuerpos tendidos ENCIMA de la última
// capa, uno más cruzado sobre ellos y otros caídos al pie. Nada flota.
export function pyre(ctx, x, y, z, seed = 1, rot = 0) {
  const rng = new RNG(seed);
  const wb = ctx.wb;
  const r = 0.12; // radio de los troncos
  const half = 1.25; // semilado del castillete
  const layers = 4;
  const burnt = (k) => [0.34 * k, 0.27 * k, 0.23 * k];
  wb.push();
  wb.translate(x, y, z);
  wb.rotateY(rot);
  // lecho de brasas y ceniza
  wb.cylinder('ember', 0, 0.005, 0, half * 0.8, half * 0.9, 0.03, 10, { ao: false, capTop: true, grime: false });
  for (let l = 0; l < layers; l++) {
    const yy = r + l * 2 * r;
    const n = l % 2 ? 5 : 6;
    for (let i = 0; i < n; i++) {
      const t = -half + r + (i / (n - 1)) * (2 * half - 2 * r);
      const len = 2 * half + rng.range(0.15, 0.55);
      const off = rng.range(-0.15, 0.15);
      wb.push();
      if (l % 2) {
        // troncos a lo largo de Z
        wb.translate(t, yy, off);
        wb.rotateX(Math.PI / 2);
      } else {
        wb.translate(off, yy, t);
        wb.rotateZ(Math.PI / 2);
      }
      wb.rotateY(rng.range(0, 3));
      wb.cylinder('wooddark', 0, -len / 2, 0, r * rng.range(0.85, 1.05), r, len, 6, { ao: false, capTop: true, capBot: true, tint: burnt(rng.range(0.8, 1.15)) });
      wb.pop();
    }
  }
  const top = layers * 2 * r;
  // tablas y ramas atravesadas encima, bajo los cuerpos
  for (let i = 0; i < 4; i++) {
    wb.push();
    wb.translate(rng.range(-0.6, 0.6), top + 0.02, rng.range(-0.6, 0.6));
    wb.rotateY(rng.range(0, 3.14));
    wb.box('planks', -0.9, 0, -0.1, 0.9, 0.04, 0.1, { ao: false, faces: 'tnsew', tint: burnt(1.1) });
    wb.pop();
  }
  // cuerpos tendidos sobre la pira (cadera sobre la capa superior)
  const ty = top + 0.04;
  const bodies = [
    [-0.62, Math.PI / 2 + rng.range(-0.15, 0.15), 'back'],
    [0.05, -Math.PI / 2 + rng.range(-0.15, 0.15), 'face'],
    [0.66, Math.PI / 2 + rng.range(-0.15, 0.15), 'back'],
  ];
  wb.pop();
  // (los cuerpos se hornean en coordenadas mundo para que la cadera quede
  // exactamente sobre la última capa)
  const c = Math.cos(rot),
    s = Math.sin(rot);
  const W = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const tint = [0.55, 0.45, 0.4];
  for (const [dz, yaw, pose] of bodies) {
    const [bx, bz] = W(rng.range(-0.12, 0.12), dz);
    bakeCorpse(wb, bx, y + ty, bz, rot + yaw, pose, 'villager', rng.int(0, 5), null, { tint });
  }
  // uno más cruzado encima de los otros (apoyado sobre sus torsos)
  {
    const [bx, bz] = W(rng.range(-0.2, 0.2), 0.1);
    bakeCorpse(wb, bx, y + ty + 0.24, bz, rot + rng.range(-0.3, 0.3), 'back', 'villager', rng.int(0, 5), null, { tint });
  }
  // al pie: uno sentado contra la pira y otro que cayó rodando
  {
    const [bx, bz] = W(half + 0.42, rng.range(-0.5, 0.5));
    bakeCorpse(wb, bx, y, bz, rot + Math.PI / 2, 'sit', 'villager', rng.int(0, 5), null, { tint });
    const [cx2, cz2] = W(rng.range(-0.8, 0.8), -half - 0.9);
    bakeCorpse(wb, cx2, y, cz2, rot + rng.range(0, 6), 'curl', 'villager', rng.int(0, 5), null, { tint });
  }
  // cenizas y huesos calcinados alrededor
  if (ctx.decals) {
    ctx.decals.push({ x, y: y + 0.01, z, size: half * 4.2, tex: 'shadow', rot: 0, opacity: 0.85 });
    ctx.decals.push({ x: x + 0.4, y: y + 0.011, z: z - 0.3, size: half * 3, tex: 'splat', rot: seed, opacity: 0.35 });
  }
  bones(ctx, x, y, z, 9, seed + 7, half + 0.9);
  // fuego sobre los cuerpos y entre los troncos
  ctx.fires.push({ x, y: y + top + 0.1, z, s: 2.5, smoke: true });
  const [fx, fz] = W(0.7, -0.5);
  ctx.fires.push({ x: fx, y: y + top * 0.5, z: fz, s: 1.3 });
  const [gx, gz] = W(-0.8, 0.6);
  ctx.fires.push({ x: gx, y: y + top * 0.7, z: gz, s: 1.1 });
  ctx.lights.push({ x, y: y + 2, z, r: 1, g: 0.42, b: 0.12, radius: 13, intensity: 1.8 });
  if (ctx.dynLights) ctx.dynLights.push({ x, y: y + 2, z, intensity: 12, range: 15 });
  colOBB(ctx, x, z, half + 0.15, half + 0.15, rot, y, y + top + 0.5);
}

// Estantería con objetos.
export function shelf(ctx, x, y, z, rot = 0, w = 1.6) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    for (const sx of [-w / 2, w / 2 - 0.06]) wb.box('wooddark', sx, 0, -0.2, sx + 0.06, 2.0, 0.2, { ao: false });
    // (las baldas, entre los costados: si no, sus cantos coinciden con ellos)
    for (let i = 0; i < 4; i++) wb.box('wooddark', -w / 2 + 0.06, 0.3 + i * 0.5, -0.19, w / 2 - 0.06, 0.34 + i * 0.5, 0.19, { ao: false, faces: 'tnsewb' });
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
  colOBB(ctx, x, z, 1.05, 0.55, rot, y, y + 0.6);
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
  ctx.lights.push({ x, y: y + 1.5, z: z + 0.9, r: 1, g: 0.42, b: 0.1, radius: 11, intensity: 2.0, room });
  if (ctx.dynLights) ctx.dynLights.push({ x, y: y + 1.5, z, intensity: 6, range: 10, room });
  colOBB(ctx, x, z, 1.25, 0.95, rot, y, y + 2.5);
}

// Pila de curtido llena de sangre/tinte.
export function tanningVat(ctx, x0, z0, x1, z1, y = 0) {
  const wb = ctx.wb;
  const t = 0.3;
  // (los bordes cortos van entre los largos: solapados en las esquinas, sus
  // caras coincidentes parpadeaban)
  solid(ctx, 'wallstone', x0, y, z0, x1, y + 0.7, z0 + t, { sub: 2 });
  solid(ctx, 'wallstone', x0, y, z1 - t, x1, y + 0.7, z1, { sub: 2 });
  solid(ctx, 'wallstone', x0, y, z0 + t, x0 + t, y + 0.7, z1 - t, { sub: 2 });
  solid(ctx, 'wallstone', x1 - t, y, z0 + t, x1, y + 0.7, z1 - t, { sub: 2 });
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
  colOBB(ctx, x, z, 0.9, 0.52, rot, y, y + 1.1);
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
    wb.rotateZ(0.06 * (typeof kind === 'number' && kind % 2 ? 1 : -1));
    wb.box('planks', -0.03, -0.5, -0.32, 0.03, 0, 0.32, { ao: false, tint: [0.7, 0.6, 0.5] });
    // símbolo tallado (bota, pan, jarra, llave) o de hierro (yunque, herradura, huso)
    const mat = 'wooddark';
    if (kind === 'anvil') {
      wb.box('iron', -0.05, -0.3, -0.2, 0.05, -0.22, 0.2, { ao: false });
      wb.box('iron', -0.05, -0.36, -0.07, 0.05, -0.3, 0.07, { ao: false });
      wb.box('iron', -0.05, -0.42, -0.13, 0.05, -0.36, 0.13, { ao: false });
      wb.box('iron', -0.05, -0.26, 0.2, 0.05, -0.23, 0.27, { ao: false });
    } else if (kind === 'horseshoe') {
      for (let i = 0; i < 7; i++) {
        const a = -0.3 + (i / 6) * (Math.PI + 0.6);
        wb.box('iron', -0.05, -0.27 + Math.sin(a) * 0.12 - 0.025, Math.cos(a) * 0.12 - 0.025, 0.05, -0.27 + Math.sin(a) * 0.12 + 0.025, Math.cos(a) * 0.12 + 0.025, { ao: false });
      }
    } else if (kind === 'spindle') {
      wb.box(mat, -0.04, -0.42, -0.015, 0.04, -0.08, 0.015, { ao: false });
      wb.cylinder('clothRed', 0, -0.32, 0, 0.07, 0.07, 0.14, 6, { ao: false, capTop: true, capBot: true });
    } else if (kind === 'cup') {
      wb.cylinder('bronze', 0, -0.42, 0, 0.06, 0.1, 0.18, 7, { ao: false, capTop: true, capBot: true });
      wb.cylinder('bronze', 0, -0.46, 0, 0.08, 0.02, 0.04, 7, { ao: false, capBot: true });
    } else if (kind % 4 === 0) {
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

// Piedra de catapulta hundida con su cráter: un bolaño labrado a pico (casi
// redondo, con lascas y la superficie picada), medio enterrado, y la tierra y
// los cascotes que levantó.
export function siegeStone(ctx, x, y, z, s = 0.45) {
  const seed = Math.round(Math.abs(x * 31 + z * 17)) + 7;
  roughStone(ctx, x, y, z, s, seed, { detail: 2, k: 0.07, cuts: 4, cutMin: 0.84, cutMax: 0.95, freq: 2.4, scl: [1, 0.94, 0.97], sink: 0.32, uvScale: 1.0 });
  // el cráter: tierra levantada alrededor y cascotes del empedrado
  const rng = new RNG(seed);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rng.range(-0.3, 0.3),
      d = s * rng.range(1.15, 1.6);
    ctx.wb.geometry('dirt', roughStoneGeo(seed + i, { detail: 0, k: 0.3 }), M4().compose(V(x + Math.cos(a) * d, y - 0.02, z + Math.sin(a) * d), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, 0)), V(s * 0.55, s * 0.18, s * 0.32)), { ao: false, uvScale: 1.6, tint: [0.8, 0.74, 0.68] });
  }
  rubble(ctx, x, y, z, 6, Math.round(x * 5 + z), s * 2.6, { scale: 0.42, mat: 'cobble', blocks: 0.3 });
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

// Tienda de campaña derrumbada (lona sobre palos). La lona es de doble cara:
// con una sola cara, vista desde un extremo o desde dentro la tienda
// desaparecía (sólo quedaba el palo).
export function tent(ctx, x, y, z, rot = 0, mat = 'burlap') {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    // palo caído y el que aún sostiene la punta de la lona
    wb.push();
    wb.translate(-1.2, 0, 0);
    wb.rotateZ(-0.5);
    wb.cylinder('wooddark', 0, 0, 0, 0.04, 0.04, 1.9, 5, { ao: false });
    wb.pop();
    wb.cylinder('wooddark', 1.2, 0, 0, 0.035, 0.035, 0.9, 5, { ao: false });
    const V3 = (a, b, c) => new THREE.Vector3(a, b, c);
    const r0 = V3(1.2, 0.9, 0),
      r1 = V3(-0.3, 1.5, 0);
    cloth2(wb, mat, V3(-1.4, 0.02, 1.1), V3(1.4, 0.02, 1.1), r0, r1, { tint: [0.7, 0.66, 0.6], backTint: [0.42, 0.39, 0.36] });
    cloth2(wb, mat, r0, V3(1.4, 0.02, -1.1), V3(-1.4, 0.02, -1.1), r1, { tint: [0.65, 0.6, 0.55], backTint: [0.4, 0.37, 0.34] });
    // cumbrera de la lona
    wb.push();
    wb.translate(r1.x, r1.y, 0);
    wb.rotateZ(-Math.atan2(r1.y - r0.y, r0.x - r1.x) - Math.PI / 2);
    wb.cylinder(mat, 0, 0, 0, 0.03, 0.03, r0.distanceTo(r1), 5, { ao: false, tint: [0.6, 0.56, 0.5] });
    wb.pop();
  });
  colOBB(ctx, x, z, 1.3, 0.9, rot, y, y + 1.2);
}

// ============================================================= oficios e interiores
// (tabernas, hornos, telares, tintes, fraguas y cuadras)

// Hogar/chimenea de pared: dir = hacia dónde mira la boca ('n','s','e','w').
export function hearth(ctx, x, y, z, dir, o = {}) {
  const wb = ctx.wb;
  const rot = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[dir];
  const w = o.w ?? 1.8,
    lit = o.lit !== false;
  wb.at(x, y, z, rot, () => {
    // jambas, dintel y campana
    wb.box('wallstone', -w / 2, 0, -0.1, -w / 2 + 0.35, 1.25, 0.55, { sub: 2, aoH: 0.5, room: o.room });
    wb.box('wallstone', w / 2 - 0.35, 0, -0.1, w / 2, 1.25, 0.55, { sub: 2, aoH: 0.5, room: o.room });
    wb.box('ashlar', -w / 2 - 0.05, 1.25, -0.1, w / 2 + 0.05, 1.45, 0.6, { ao: false, room: o.room });
    const V3 = (a, b, c) => new THREE.Vector3(a, b, c);
    wb.quad('wallstone', V3(-w / 2, 1.45, 0.6), V3(w / 2, 1.45, 0.6), V3(w / 2 - 0.35, (o.hoodTop ?? 2.9), 0.1), V3(-w / 2 + 0.35, (o.hoodTop ?? 2.9), 0.1), { ao: false, sub: 2, room: o.room });
    wb.quad('wallstone', V3(w / 2, 1.45, 0.6), V3(w / 2, 1.45, -0.1), V3(w / 2 - 0.35, (o.hoodTop ?? 2.9), -0.1), V3(w / 2 - 0.35, (o.hoodTop ?? 2.9), 0.1), { ao: false, sub: 2, room: o.room });
    wb.quad('wallstone', V3(-w / 2, 1.45, -0.1), V3(-w / 2, 1.45, 0.6), V3(-w / 2 + 0.35, (o.hoodTop ?? 2.9), 0.1), V3(-w / 2 + 0.35, (o.hoodTop ?? 2.9), -0.1), { ao: false, sub: 2, room: o.room });
    // fondo tiznado y hogar
    wb.box('black', -w / 2 + 0.35, 0.02, -0.1, w / 2 - 0.35, 1.25, -0.08, { faces: 's', ao: false, grime: false, room: o.room });
    wb.box('wallstone', -w / 2 + 0.35, 0, -0.08, w / 2 - 0.35, 0.12, 0.5, { faces: 't', ao: false, room: o.room, tint: [0.4, 0.37, 0.35] });
    if (lit) wb.box('ember', -0.3, 0.12, 0.05, 0.3, 0.16, 0.35, { faces: 't', ao: false, grime: false, room: o.room });
    // morillos y leños
    for (const sx of [-0.35, 0.35]) wb.box('iron', sx - 0.03, 0.12, 0.05, sx + 0.03, 0.4, 0.4, { ao: false, room: o.room });
    for (let i = 0; i < 3; i++) {
      wb.push();
      wb.translate(-0.05 + i * 0.05, 0.24 + i * 0.04, 0.2 + (i - 1) * 0.1);
      wb.rotateZ(Math.PI / 2);
      wb.rotateX(0.1 * (i - 1));
      wb.cylinder('wooddark', 0, -0.45, 0, 0.06, 0.06, 0.9, 6, { ao: false, capTop: true, capBot: true, tint: [0.35, 0.28, 0.24], room: o.room });
      wb.pop();
    }
    if (o.pot) {
      // caldero colgado de su cremallera
      wb.box('iron', -0.015, 0.7, 0.2, 0.015, 1.3, 0.23, { ao: false, room: o.room });
      wb.cylinder('iron', 0, 0.42, 0.22, 0.2, 0.26, 0.3, 8, { ao: false, capBot: true, room: o.room });
      wb.cylinder('black', 0, 0.7, 0.22, 0.24, 0.24, 0.01, 8, { ao: false, capTop: true, grime: false, room: o.room });
    }
  });
  const c = Math.cos(rot),
    s = Math.sin(rot);
  const fx = x + 0.2 * s,
    fz = z + 0.2 * c;
  if (lit && ctx.fires) {
    ctx.fires.push({ x: fx, y: y + 0.2, z: fz, s: o.fire ?? 0.75, embers: true });
    ctx.lights.push({ x: x + 0.9 * s, y: y + 0.8, z: z + 0.9 * c, r: 1, g: 0.46, b: 0.16, radius: o.radius ?? 8, intensity: 1.4, room: o.room });
    if (ctx.dynLights) ctx.dynLights.push({ x: x + 0.7 * s, y: y + 0.9, z: z + 0.7 * c, intensity: 5, range: 9 });
  }
  colOBB(ctx, x + 0.22 * s, z + 0.22 * c, w / 2, 0.35, rot, y, y + 1.45);
}

// Horno de pan abovedado (de ladrillo y barro) con su boca incandescente.
export function breadOven(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  const R = o.r ?? 1.3;
  wb.at(x, y, z, rot, () => {
    // basamento
    wb.box('wallstone', -R - 0.2, 0, -R - 0.2, R + 0.2, 0.9, R + 0.2, { sub: 2, aoH: 0.6, room: o.room });
    // cúpula
    wb.geometry('plaster', new THREE.SphereGeometry(R, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M4().compose(V(0, 0.9, 0), new THREE.Quaternion(), V(1, 0.78, 1)), { ao: false, uvScale: 1.4, tint: [0.72, 0.5, 0.38], room: o.room });
    // boca con arco
    wb.box('ashlar', -0.45, 0.9, R - 0.05, 0.45, 1.05, R + 0.25, { ao: false, room: o.room });
    wb.box('ashlar', -0.45, 1.05, R - 0.05, -0.33, 1.55, R + 0.25, { ao: false, room: o.room });
    wb.box('ashlar', 0.33, 1.05, R - 0.05, 0.45, 1.55, R + 0.25, { ao: false, room: o.room });
    wb.box('ashlar', -0.45, 1.55, R - 0.05, 0.45, 1.72, R + 0.25, { ao: false, room: o.room });
    wb.box(o.lit === false ? 'black' : 'ember', -0.33, 1.05, R + 0.05, 0.33, 1.55, R + 0.07, { faces: 's', ao: false, grime: false, room: o.room });
    // chimenea sobre la cúpula
    wb.box('wallstone', -0.22, 0.9 + R * 0.7, -0.4, 0.22, (o.flue ?? 3.1), 0.05, { ao: false, room: o.room });
    // pala de hornear apoyada
    wb.push();
    wb.translate(R + 0.35, 0, R * 0.2);
    wb.rotateZ(0.28);
    wb.box('wooddark', -0.03, 0, -0.03, 0.03, 2.1, 0.03, { ao: false, room: o.room });
    wb.box('planks', -0.18, 2.0, -0.02, 0.18, 2.4, 0.02, { ao: false, room: o.room });
    wb.pop();
  });
  const c = Math.cos(rot),
    s = Math.sin(rot);
  if (o.lit !== false && ctx.fires) {
    ctx.fires.push({ x: x + (R + 0.1) * s, y: y + 1.1, z: z + (R + 0.1) * c, s: 0.35, embers: true, light: false });
    ctx.lights.push({ x: x + (R + 0.8) * s, y: y + 1.3, z: z + (R + 0.8) * c, r: 1, g: 0.5, b: 0.2, radius: 7, intensity: 1.2, room: o.room });
    if (ctx.dynLights) ctx.dynLights.push({ x: x + (R + 0.6) * s, y: y + 1.3, z: z + (R + 0.6) * c, intensity: 4, range: 8 });
  }
  colOBB(ctx, x, z, R + 0.2, R + 0.25, rot, y, y + 2.0);
}

// Artesa de amasar (con la masa que "crece").
export function kneadTrough(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    for (const sx of [-0.8, 0.8]) for (const sz of [-0.28, 0.28]) wb.box('wooddark', sx - 0.05, 0, sz - 0.05, sx + 0.05, 0.62, sz + 0.05, { ao: false, room: o.room });
    wb.box('planks', -0.95, 0.6, -0.36, 0.95, 0.66, 0.36, { ao: false, faces: 'tnsewb', room: o.room });
    wb.box('planks', -0.95, 0.66, -0.36, 0.95, 0.95, -0.3, { ao: false, room: o.room });
    wb.box('planks', -0.95, 0.66, 0.3, 0.95, 0.95, 0.36, { ao: false, room: o.room });
    wb.box('planks', -0.95, 0.66, -0.3, -0.89, 0.95, 0.3, { ao: false, room: o.room });
    wb.box('planks', 0.89, 0.66, -0.3, 0.95, 0.95, 0.3, { ao: false, room: o.room });
    if (o.flesh) wb.geometry('fleshStatic', new THREE.SphereGeometry(1, 8, 5), M4().compose(V(0, 0.88, 0), new THREE.Quaternion(), V(0.86, 0.14, 0.28)), { ao: false, grime: false, room: o.room, tint: [1.2, 1.0, 0.85] });
    else wb.box('clothWhite', -0.88, 0.66, -0.29, 0.88, 0.8, 0.29, { faces: 't', ao: false, room: o.room, tint: [0.95, 0.88, 0.72] });
  });
  colOBB(ctx, x, z, 0.97, 0.38, rot, y, y + 0.95);
}

// Telar de bajo lizo con la tela a medio tejer.
export function loom(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    for (const sx of [-0.9, 0.9]) {
      wb.box('wooddark', sx - 0.06, 0, -0.6, sx + 0.06, 1.7, -0.5, { ao: false, room: o.room });
      wb.box('wooddark', sx - 0.06, 0, 0.5, sx + 0.06, 1.0, 0.6, { ao: false, room: o.room });
      wb.box('wooddark', sx - 0.05, 0.9, -0.6, sx + 0.05, 1.0, 0.6, { ao: false, room: o.room });
    }
    wb.box('wooddark', -0.95, 1.6, -0.6, 0.95, 1.7, -0.5, { ao: false, room: o.room });
    wb.push();
    wb.translate(0, 0.95, 0.52);
    wb.rotateZ(Math.PI / 2);
    wb.cylinder('wooddark', 0, -0.9, 0, 0.07, 0.07, 1.8, 6, { ao: false, capTop: true, capBot: true, room: o.room });
    wb.pop();
    // urdimbre (hilos) y tela
    for (let i = 0; i < 24; i++) {
      const px = -0.8 + (i / 23) * 1.6;
      wb.box('clothWhite', px - 0.004, 0.95, -0.55, px + 0.004, 1.62, -0.545, { ao: false, grime: false, room: o.room, tint: [0.85, 0.8, 0.72] });
    }
    const V3 = (a, b, c) => new THREE.Vector3(a, b, c);
    wb.quad(o.cloth ?? 'clothRed', V3(-0.8, 0.96, 0.5), V3(0.8, 0.96, 0.5), V3(0.8, 0.98, -0.1), V3(-0.8, 0.98, -0.1), { ao: false, sub: 3, room: o.room, uvLocal: true });
    wb.quad(o.cloth ?? 'clothRed', V3(-0.8, 0.95, -0.1), V3(0.8, 0.95, -0.1), V3(0.8, 0.94, 0.5), V3(-0.8, 0.94, 0.5), { ao: false, sub: 3, room: o.room, uvLocal: true, tint: [0.7, 0.7, 0.7] });
    // banco del tejedor
    wb.box('wooddark', -0.5, 0.45, 0.85, 0.5, 0.5, 1.15, { ao: false, faces: 'tnsewb', room: o.room });
    for (const sx of [-0.42, 0.42]) wb.box('wooddark', sx - 0.04, 0, 0.9, sx + 0.04, 0.45, 1.1, { ao: false, room: o.room });
  });
  colOBB(ctx, x, z, 1.0, 0.65, rot, y, y + 1.7);
}

// Rueca.
export function spinningWheel(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -0.4, 0.3, -0.08, 0.4, 0.38, 0.08, { ao: false, room: o.room });
    for (const [sx, sz] of [[-0.35, -0.12], [-0.35, 0.12], [0.35, 0]]) wb.box('wooddark', sx - 0.03, 0, sz - 0.03, sx + 0.03, 0.34, sz + 0.03, { ao: false, room: o.room });
    wb.box('wooddark', -0.2, 0.38, -0.03, -0.14, 0.95, 0.03, { ao: false, room: o.room });
    wb.push();
    wb.translate(-0.17, 0.85, 0);
    wb.rotateX(Math.PI / 2);
    wb.cylinder('wooddark', 0, -0.03, 0, 0.36, 0.36, 0.06, 12, { ao: false, capTop: true, capBot: true, room: o.room, open: true });
    wb.pop();
    wb.cylinder('clothWhite', 0.3, 0.6, 0, 0.05, 0.05, 0.16, 6, { ao: false, capTop: true, room: o.room, tint: [0.9, 0.85, 0.75] });
  });
  colOBB(ctx, x, z, 0.45, 0.2, rot, y, y + 1.1);
}

// Tina de tintorero (redonda, con el tinte y el paño a medio sumergir).
export function dyeVat(ctx, x, y, z, color = [0.25, 0.3, 0.8], o = {}) {
  const wb = ctx.wb;
  const r = o.r ?? 0.8;
  wb.cylinder('planks', x, y, z, r, r * 1.04, 0.9, 12, { uv: 1.2, aoH: 0.5, room: o.room });
  for (const yy of [0.15, 0.7]) wb.cylinder('iron', x, y + yy, z, r * 1.05, r * 1.05, 0.06, 12, { ao: false, room: o.room });
  wb.cylinder('water', x, y + 0.78, z, r * 0.96, r * 0.96, 0.02, 12, { ao: false, capTop: true, grime: false, tint: color, room: o.room });
  // paño que asoma
  wb.push();
  wb.translate(x + r * 0.5, y + 0.8, z);
  wb.rotateZ(-0.9);
  wb.box('clothWhite', -0.02, -0.1, -0.25, 0.02, 0.7, 0.25, { ao: false, grime: false, tint: color.map((v) => Math.min(1, v * 1.4)), room: o.room });
  wb.pop();
  col(ctx, x - r, y, z - r, x + r, y + 0.9, z + r);
}

// Abrevadero / pila de piedra con agua.
export function trough(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  const L = o.len ?? 2.2;
  wb.at(x, y, z, rot, () => {
    wb.box('ashlar', -L / 2, 0, -0.45, L / 2, 0.75, -0.33, { sub: 2, room: o.room });
    wb.box('ashlar', -L / 2, 0, 0.33, L / 2, 0.75, 0.45, { sub: 2, room: o.room });
    wb.box('ashlar', -L / 2, 0, -0.33, -L / 2 + 0.12, 0.75, 0.33, { sub: 2, room: o.room });
    wb.box('ashlar', L / 2 - 0.12, 0, -0.33, L / 2, 0.75, 0.33, { sub: 2, room: o.room });
    wb.box(o.blood ? 'blood' : 'water', -L / 2 + 0.12, 0.55, -0.33, L / 2 - 0.12, 0.56, 0.33, { faces: 't', ao: false, grime: false, room: o.room, tint: o.tint });
  });
  colOBB(ctx, x, z, L / 2, 0.45, rot, y, y + 0.75);
}

// Fuelle de fragua con su palanca.
export function bellows(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -0.1, 0, -0.5, 0.1, 0.55, 0.5, { ao: false, room: o.room });
    // tablas y cuero plegado
    wb.box('planks', -0.55, 0.55, -0.45, 0.55, 0.6, 0.45, { ao: false, faces: 'tnsewb', room: o.room });
    wb.box('leather', -0.52, 0.6, -0.4, 0.5, 0.82, 0.4, { ao: false, room: o.room, tint: [0.7, 0.55, 0.45] });
    wb.push();
    wb.translate(-0.55, 0.84, 0);
    wb.rotateZ(0.12);
    wb.box('planks', 0, 0, -0.45, 1.1, 0.05, 0.45, { ao: false, faces: 'tnsewb', room: o.room });
    wb.pop();
    wb.push();
    wb.translate(0.55, 0.72, 0);
    wb.rotateZ(Math.PI / 2);
    wb.cylinder('iron', 0, 0, 0, 0.06, 0.03, 0.5, 6, { ao: false, room: o.room });
    wb.pop();
    // palanca
    wb.box('wooddark', -0.03, 1.0, -0.03, 0.03, 2.1, 0.03, { ao: false, room: o.room });
    wb.box('wooddark', -0.6, 2.05, -0.03, 0.6, 2.12, 0.03, { ao: false, room: o.room });
  });
  colOBB(ctx, x, z, 0.6, 0.5, rot, y, y + 1.0);
}

// Barra de taberna (mostrador) con jarras.
export function counter(ctx, x, y, z, rot = 0, len = 3, o = {}) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('planks', -len / 2, 0, -0.3, len / 2, 1.0, 0.3, { faces: 'tnsew', uv: 0.8, aoH: 0.6, room: o.room });
    wb.box('wooddark', -len / 2 - 0.06, 1.0, -0.38, len / 2 + 0.06, 1.08, 0.38, { ao: false, faces: 'tnsewb', room: o.room });
    for (let px = -len / 2 + 0.3; px < len / 2; px += 0.6) wb.box('wooddark', px - 0.04, 0, 0.3, px + 0.04, 1.0, 0.33, { ao: false, room: o.room });
    const rng = new RNG(Math.round(x * 7 + z * 13));
    for (let i = 0; i < 5; i++) {
      const px = rng.range(-len / 2 + 0.2, len / 2 - 0.2);
      if (rng.chance(0.5)) wb.cylinder('bronze', px, 1.08, rng.range(-0.2, 0.2), 0.05, 0.05, 0.13, 6, { ao: false, capTop: true, room: o.room });
      else jar(ctx, px, 1.08, rng.range(-0.2, 0.2), 0.45, { collide: false, rot: rng.range(0, 6) });
    }
  });
  colOBB(ctx, x, z, len / 2 + 0.06, 0.38, rot, y, y + 1.08);
}

// Taburete.
export function stool(ctx, x, y, z, o = {}) {
  const wb = ctx.wb;
  wb.cylinder('wooddark', x, y + 0.42, z, 0.2, 0.2, 0.05, 7, { ao: false, capTop: true, capBot: true, room: o.room });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + (x + z);
    wb.box('wooddark', x + Math.cos(a) * 0.13 - 0.025, y, z + Math.sin(a) * 0.13 - 0.025, x + Math.cos(a) * 0.13 + 0.025, y + 0.42, z + Math.sin(a) * 0.13 + 0.025, { ao: false, room: o.room });
  }
  if (o.tipped) return;
  col(ctx, x - 0.18, y, z - 0.18, x + 0.18, y + 0.45, z + 0.18);
}

// Tonel grande tumbado sobre su cuna (bodega).
export function cask(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  const r = o.r ?? 0.55,
    L = o.len ?? 1.3;
  wb.at(x, y, z, rot, () => {
    for (const sx of [-L * 0.3, L * 0.3]) wb.box('wooddark', sx - 0.06, 0, -r * 0.8, sx + 0.06, r * 0.45, r * 0.8, { ao: false, room: o.room });
    wb.push();
    wb.translate(0, r + 0.1, 0);
    wb.rotateZ(Math.PI / 2);
    wb.cylinder('planks', 0, -L / 2, 0, r * 0.92, r * 0.92, L, 10, { ao: false, capTop: true, capBot: true, uv: 1.2, room: o.room });
    wb.cylinder('planks', 0, -L * 0.25, 0, r, r, L * 0.5, 10, { ao: false, uv: 1.2, room: o.room });
    for (const yy of [-L * 0.42, -L * 0.1, L * 0.1, L * 0.36]) wb.cylinder('iron', 0, yy, 0, r * 0.97, r * 0.97, 0.05, 10, { ao: false, room: o.room });
    wb.pop();
    wb.box('wooddark', L / 2 - 0.01, r * 0.5, -0.03, L / 2 + 0.12, r * 0.56, 0.03, { ao: false, room: o.room });
  });
  colOBB(ctx, x, z, L / 2 + 0.1, r, rot, y, y + r * 2 + 0.1);
}

// Rueda de carro apoyada en un muro.
export function cartWheel(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  wb.push();
  wb.translate(x, y + 0.5, z);
  wb.rotateY(rot);
  wb.rotateX(Math.PI / 2 - 0.2);
  wb.cylinder('wooddark', 0, -0.05, 0, 0.55, 0.55, 0.1, 12, { ao: false, open: true, room: o.room });
  wb.cylinder('wooddark', 0, -0.06, 0, 0.12, 0.12, 0.12, 8, { ao: false, capTop: true, capBot: true, room: o.room });
  for (let i = 0; i < 6; i++) {
    wb.push();
    wb.rotateY((i / 6) * Math.PI * 2);
    wb.box('wooddark', 0.1, -0.03, -0.025, 0.52, 0.03, 0.025, { ao: false, room: o.room });
    wb.pop();
  }
  wb.pop();
}

// Tabla con herraduras y herramientas colgadas (tenazas, martillos).
export function toolBoard(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(Math.round(x * 17 + z * 5));
  wb.at(x, y, z, rot, () => {
    wb.box('planks', -0.9, 1.0, 0, 0.9, 1.9, 0.05, { ao: false, room: o.room, tint: [0.75, 0.68, 0.6] });
    for (let i = 0; i < 6; i++) {
      const px = -0.75 + i * 0.3;
      const kind = rng.int(0, 2);
      if (kind === 0) {
        // tenazas
        wb.push();
        wb.translate(px, 1.75, 0.07);
        wb.rotateZ(rng.range(-0.1, 0.1));
        wb.box('iron', -0.04, -0.6, -0.01, -0.015, 0, 0.01, { ao: false, room: o.room });
        wb.box('iron', 0.015, -0.6, -0.01, 0.04, 0, 0.01, { ao: false, room: o.room });
        wb.pop();
      } else if (kind === 1) {
        // martillo
        wb.box('wooddark', px - 0.015, 1.25, 0.06, px + 0.015, 1.75, 0.08, { ao: false, room: o.room });
        wb.box('iron', px - 0.08, 1.7, 0.05, px + 0.08, 1.78, 0.1, { ao: false, room: o.room });
      } else {
        // herradura
        for (let k = 0; k < 6; k++) {
          const a = -0.2 + (k / 5) * (Math.PI + 0.4);
          wb.box('iron', px + Math.cos(a) * 0.08 - 0.015, 1.5 + Math.sin(a) * 0.08 - 0.015, 0.05, px + Math.cos(a) * 0.08 + 0.015, 1.5 + Math.sin(a) * 0.08 + 0.015, 0.075, { ao: false, room: o.room });
        }
      }
    }
  });
}

// Montón de carbón.
export function coalPile(ctx, x, y, z, s = 1, o = {}) {
  const rng = new RNG(Math.round(x * 13 - z * 7));
  for (let i = 0; i < 16; i++) {
    const a = rng.range(0, Math.PI * 2),
      r = rng.range(0, 0.6) * s;
    const h = (1 - r / (0.7 * s)) * 0.35 * s;
    ctx.wb.geometry('black', new THREE.IcosahedronGeometry(0.1 * s, 0), M4().compose(V(x + Math.cos(a) * r, y + Math.max(0.04, h), z + Math.sin(a) * r), new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(0, 3), rng.range(0, 3), 0)), V(1, 0.8, 1)), { ao: false, grime: false, room: o.room, tint: [2.2, 2.2, 2.3] });
  }
  col(ctx, x - 0.5 * s, y, z - 0.5 * s, x + 0.5 * s, y + 0.3 * s, z + 0.5 * s);
}

// Barras de hierro apiladas.
export function ironBars(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    for (const sz of [-0.3, 0.3]) wb.box('wooddark', -0.06, 0, sz - 0.4, 0.06, 0.1, sz + 0.4, { ao: false, room: o.room });
    for (let l = 0; l < 3; l++) for (let i = 0; i < 5 - l; i++) wb.box('iron', -0.9, 0.1 + l * 0.05, -0.2 + i * 0.09 + l * 0.045, 0.9, 0.15 + l * 0.05, -0.16 + i * 0.09 + l * 0.045, { ao: false, room: o.room });
  });
}

// Maniquí de armero con cota de malla y yelmo.
export function armorStand(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -0.25, 0, -0.04, 0.25, 0.06, 0.04, { ao: false, room: o.room });
    wb.box('wooddark', -0.04, 0, -0.25, 0.04, 0.06, 0.25, { ao: false, room: o.room });
    wb.box('wooddark', -0.04, 0.06, -0.04, 0.04, 1.4, 0.04, { ao: false, room: o.room });
    wb.box('chainmail', -0.24, 0.8, -0.14, 0.24, 1.45, 0.14, { ao: false, room: o.room });
    wb.box('wooddark', -0.35, 1.4, -0.03, 0.35, 1.46, 0.03, { ao: false, room: o.room });
    wb.cylinder('plate', 0, 1.5, 0, 0.13, 0.12, 0.2, 8, { ao: false, capTop: true, room: o.room });
    if (o.flesh) wb.geometry('fleshStatic', new THREE.SphereGeometry(1, 6, 4), M4().compose(V(0.08, 1.1, 0.12), new THREE.Quaternion(), V(0.16, 0.2, 0.08)), { ao: false, grime: false, room: o.room });
  });
  colOBB(ctx, x, z, 0.28, 0.2, rot, y, y + 1.7);
}

// Cota de malla tirada con carne cosida a las anillas (lo que el herrero quemó).
export function fleshMail(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('chainmail', -0.35, 0, -0.3, 0.35, 0.07, 0.3, { ao: false, room: o.room });
    wb.box('chainmail', 0.1, 0, 0.2, 0.55, 0.05, 0.55, { ao: false, room: o.room });
    wb.geometry('fleshStatic', new THREE.SphereGeometry(1, 7, 5), M4().compose(V(-0.05, 0.07, 0), new THREE.Quaternion(), V(0.22, 0.08, 0.16)), { ao: false, grime: false, room: o.room });
  });
}

// Cerca de madera (tramo recto de x0,z0 a x1,z1) con colisión.
export function fence(ctx, x0, z0, x1, z1, o = {}) {
  const wb = ctx.wb;
  const L = Math.hypot(x1 - x0, z1 - z0);
  const rot = Math.atan2(-(z1 - z0), x1 - x0);
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  const rng = new RNG(Math.round(x0 * 11 + z1 * 3));
  wb.at(cx, 0, cz, rot, () => {
    const n = Math.max(1, Math.round(L / 1.4));
    for (let i = 0; i <= n; i++) {
      const px = -L / 2 + (i / n) * L;
      wb.box('wooddark', px - 0.06, 0, -0.06, px + 0.06, (o.h ?? 1.1) + rng.range(-0.05, 0.1), 0.06, { aoH: 0.4, room: o.room });
    }
    for (const yy of [0.35, 0.85]) {
      if (o.broken && rng.chance(0.3)) continue;
      wb.box('planks', -L / 2, yy, -0.07, L / 2, yy + 0.1, -0.04, { ao: false, faces: 'tnsewb', room: o.room, tint: [0.75, 0.68, 0.6] });
    }
  });
  colOBB(ctx, cx, cz, L / 2, 0.08, rot, 0, o.h ?? 1.1);
}

// Caballo muerto (tumbado de lado, hinchado).
export function deadHorse(ctx, x, y, z, rot = 0, o = {}) {
  const wb = ctx.wb;
  const tint = o.tint ?? [0.55, 0.42, 0.34];
  wb.at(x, y, z, rot, () => {
    wb.geometry('skin', new THREE.SphereGeometry(1, 9, 6), M4().compose(V(0, 0.42, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.1)), V(1.05, 0.42, 0.5)), { ao: false, tint, uvScale: 1.3 });
    // cuello y cabeza
    wb.push();
    wb.translate(1.0, 0.36, 0.1);
    wb.rotateY(-0.3);
    wb.rotateZ(-0.35);
    wb.box('skin', 0, -0.17, -0.14, 0.8, 0.17, 0.14, { ao: false, tint });
    wb.translate(0.8, -0.05, 0);
    wb.rotateZ(-0.6);
    wb.box('skin', 0, -0.12, -0.11, 0.55, 0.12, 0.11, { ao: false, tint });
    wb.box('black', 0.35, 0.02, 0.1, 0.4, 0.06, 0.115, { ao: false, grime: false });
    wb.pop();
    // patas rígidas
    for (const [px, pz, a] of [[-0.7, 0.3, 0.4], [-0.5, 0.35, 0.9], [0.55, 0.3, 0.5], [0.75, 0.35, 1.1]]) {
      wb.push();
      wb.translate(px, 0.45, pz);
      wb.rotateX(-Math.PI / 2 + 0.3);
      wb.rotateZ(a - 0.7);
      wb.box('skin', -0.06, 0, -0.06, 0.06, 0.95, 0.06, { ao: false, tint });
      wb.box('black', -0.07, 0.95, -0.07, 0.07, 1.05, 0.07, { ao: false });
      wb.pop();
    }
    // cola y costillas al aire
    wb.box('clothDark', -1.15, 0.3, -0.04, -0.95, 0.4, 0.04, { ao: false });
    if (o.torn !== false) {
      wb.geometry('fleshStatic', new THREE.SphereGeometry(1, 7, 5), M4().compose(V(-0.1, 0.5, 0.35), new THREE.Quaternion(), V(0.45, 0.25, 0.2)), { ao: false, grime: false });
      for (let i = 0; i < 5; i++) wb.box('bone', -0.4 + i * 0.16, 0.32, 0.38, -0.37 + i * 0.16, 0.68, 0.42, { ao: false });
    }
  });
  corpseAt(ctx, x, y + 0.4, z);
  if (ctx.decals) ctx.decals.push({ x, y: y + 0.01, z, size: 3.2, tex: 'splat', rot: x, opacity: 0.8 });
  colOBB(ctx, x, z, 1.3, 0.55, rot, y, y + 0.85);
}

// Registra un cuerpo para las moscas.
function corpseAt(ctx, x, y, z) {
  if (ctx.flies) ctx.flies.push({ x, y, z });
}

// Hornacina en un muro con una imagen, velas y exvotos. dir = hacia dónde mira.
export function niche(ctx, x, y, z, dir, o = {}) {
  const wb = ctx.wb;
  const rot = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[dir];
  wb.at(x, y, z, rot, () => {
    wb.box('ashlar', -0.55, 0, 0, 0.55, 0.12, 0.35, { ao: false, room: o.room });
    wb.box('ashlar', -0.55, 0.12, 0, -0.42, 1.1, 0.12, { ao: false, room: o.room });
    wb.box('ashlar', 0.42, 0.12, 0, 0.55, 1.1, 0.12, { ao: false, room: o.room });
    wb.box('ashlar', -0.55, 1.1, 0, 0.55, 1.3, 0.14, { ao: false, room: o.room });
    wb.box('black', -0.42, 0.12, 0.005, 0.42, 1.1, 0.01, { faces: 's', ao: false, grime: false, room: o.room });
    // imagen velada
    wb.cylinder('ashlar', 0, 0.12, 0.12, 0.13, 0.08, 0.65, 7, { ao: false, room: o.room });
    wb.cylinder(o.veil ?? 'clothWhite', 0, 0.62, 0.12, 0.14, 0.05, 0.3, 7, { ao: false, capTop: true, room: o.room });
  });
  const c = Math.cos(rot),
    s = Math.sin(rot);
  candles(ctx, x + 0.22 * s, y + 0.12, z + 0.22 * c, 4, Math.round(x * 3 + z), { room: o.room, spread: 0.18, radius: 3.5, intensity: o.intensity ?? 0.7, scale: 0.6, unlit: o.unlit });
}

// Muro de carne que tapona un hueco entero (x0..x1 a lo ancho, y0..y1 de
// alto, en el plano z; out = hacia dónde asoma, ±1). Bultos solapados sin
// huecos por los que se vea detrás, con venas que salen hacia fuera.
export function fleshWall(ctx, x0, x1, y0, y1, z, out = -1, seed = 1, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const W = x1 - x0,
    H = y1 - y0;
  // fondo continuo (para que no haya ningún resquicio)
  wb.box('flesh', x0, y0, z - 0.25 * out, x1, y1, z - 0.1 * out, { faces: out < 0 ? 'n' : 's', ao: false, grime: false, sub: 0.8 });
  const nx = Math.ceil(W / 0.55),
    ny = Math.ceil(H / 0.55);
  for (let j = 0; j <= ny; j++)
    for (let i = 0; i <= nx; i++) {
      const px = x0 + (i / nx) * W + rng.range(-0.18, 0.18),
        py = y0 + (j / ny) * H + rng.range(-0.18, 0.18);
      const low = 1 - j / ny; // más grueso abajo
      const s = rng.range(0.32, 0.5) * (0.8 + low * 0.6);
      const bulge = rng.range(0.05, 0.25) + low * 0.35;
      wb.geometry('flesh', lumpGeo(rng, rng.chance(0.3) ? 2 : 1), M4().compose(V(Math.min(x1, Math.max(x0, px)), Math.min(y1, Math.max(y0, py)), z + out * bulge), new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(0, 6), rng.range(0, 6), rng.range(0, 6))), V(s, s * rng.range(0.7, 1.1), s * 0.6)), { ao: false, uvScale: 1.3, grime: false });
      if (rng.chance(0.12)) {
        const r = rng.range(0.03, 0.06);
        wb.geometry(rng.chance(0.5) ? 'eyeGlow' : 'candle', new THREE.SphereGeometry(1, 6, 4), M4().compose(V(px, py, z + out * (bulge + s * 0.55)), new THREE.Quaternion(), V(r, r, r)), { ao: false, grime: false, tint: [1, 0.85, 0.55] });
      }
    }
  // bocas
  for (let k = 0; k < (o.mouths ?? 2); k++) {
    const mx = rng.range(x0 + 0.8, x1 - 0.8),
      my = rng.range(y0 + 0.6, y0 + H * 0.6);
    const mz = z + out * 0.62;
    wb.geometry('black', new THREE.SphereGeometry(1, 7, 4), M4().compose(V(mx, my, mz), new THREE.Quaternion(), V(0.32, 0.1, 0.05)), { ao: false, grime: false });
    for (let t = -3; t <= 3; t++)
      for (const up of [1, -1]) {
        const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V(0, -up, out * 0.5).normalize());
        wb.geometry('bone', new THREE.ConeGeometry(0.022, 0.08, 4), M4().compose(V(mx + t * 0.08, my + up * 0.07, mz + out * 0.02), q, V(1, 1, 1)), { ao: false });
      }
  }
  // venas que asoman hacia fuera y reptan por el suelo
  for (let k = 0; k < (o.tendrils ?? 7); k++) {
    const sx = rng.range(x0 + 0.3, x1 - 0.3);
    const pts = [];
    let px = sx,
      py = y0 + 0.08,
      pz = z + out * 0.3;
    const L = rng.range(1.2, 2.6);
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      pts.push(V(px, py, pz));
      pz += out * (L / steps);
      px += rng.range(-0.25, 0.25);
      py = y0 + 0.04 + Math.max(0, 0.06 - i * 0.01);
    }
    wb.geometry('flesh', taperTube(pts, 0.07, 0.01, 5, k * 1.3 + seed), null, { ao: false, uvScale: 1, grime: false });
  }
  if (ctx.decals) ctx.decals.push({ x: (x0 + x1) / 2, y: y0 + 0.015, z: z + out * 1.2, size: W * 0.9, tex: 'splat', rot: seed, opacity: 0.85 });
  if (ctx.lights) ctx.lights.push({ x: (x0 + x1) / 2, y: y0 + H * 0.4, z: z + out * 1.4, r: 0.9, g: 0.2, b: 0.12, radius: 5 + W * 0.4, intensity: 0.9 });
}

function lumpGeo(rng, d) {
  return lump(rng, d);
}

// Cobertizo de una sola agua apoyado en un muro: la cubierta baja desde el muro
// (lado 'wall') hacia fuera. x0..x1, z0..z1: huella; posts en el lado bajo.
export function leanTo(ctx, x0, z0, x1, z1, wall, yHi, yLo, o = {}) {
  const wb = ctx.wb;
  const V3 = (a, b, c) => new THREE.Vector3(a, b, c);
  let p;
  if (wall === 'n') p = [V3(x0, yLo, z1), V3(x1, yLo, z1), V3(x1, yHi, z0), V3(x0, yHi, z0)];
  else if (wall === 's') p = [V3(x1, yLo, z0), V3(x0, yLo, z0), V3(x0, yHi, z1), V3(x1, yHi, z1)];
  else if (wall === 'w') p = [V3(x1, yLo, z1), V3(x1, yLo, z0), V3(x0, yHi, z0), V3(x0, yHi, z1)];
  else p = [V3(x0, yLo, z0), V3(x0, yLo, z1), V3(x1, yHi, z1), V3(x1, yHi, z0)];
  wb.quad(o.mat ?? 'roof', p[0], p[1], p[2], p[3], { ao: false, sub: 2.4 });
  const d = 0.12;
  const q = p.map((v) => v.clone().add(V3(0, -d, 0)));
  wb.quad('wooddark', q[3], q[2], q[1], q[0], { ao: false, sub: 3, tint: [0.5, 0.48, 0.45] });
  // pies derechos en el lado bajo
  const lowA = p[0],
    lowB = p[1];
  const n = Math.max(2, Math.round(lowA.distanceTo(lowB) / 2.4));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // (metidos un palmo hacia el muro para que queden bajo la cubierta)
    const inset = 0.15;
    const px = lowA.x + (lowB.x - lowA.x) * t + (wall === 'w' ? -inset : wall === 'e' ? inset : 0),
      pz = lowA.z + (lowB.z - lowA.z) * t + (wall === 'n' ? -inset : wall === 's' ? inset : 0);
    wb.box('wooddark', px - 0.08, 0, pz - 0.08, px + 0.08, yLo - 0.08, pz + 0.08, { aoH: 0.5 });
    if (o.collide !== false) col(ctx, px - 0.1, 0, pz - 0.1, px + 0.1, yLo, pz + 0.1);
  }
  wb.box('wooddark', Math.min(lowA.x, lowB.x) - 0.05, yLo - 0.2, Math.min(lowA.z, lowB.z) - 0.05, Math.max(lowA.x, lowB.x) + 0.05, yLo - 0.05, Math.max(lowA.z, lowB.z) + 0.05, { ao: false });
  // la cámara no atraviesa la cubierta
  const cb = ctx.col.add(x0, yLo - 0.1, z0, x1, yHi, z1);
  cb.cam = true;
  cb.noSight = true;
}

// Elipsoide suelto (panes, jamones, bultos).
export function ellipsoid(ctx, mat, x, y, z, sx, sy, sz, tint = null, o = {}) {
  ctx.wb.geometry(mat, new THREE.SphereGeometry(1, 6, 4), M4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (x * 7 + z * 3) % 6, 0)), V(sx, sy, sz)), { ao: false, tint, room: o.room });
}

// Farol colgado de una viga (interiores): cadena, farol y luz.
export function hangingLamp(ctx, x, yTop, z, o = {}) {
  const wb = ctx.wb;
  const len = o.len ?? 0.7;
  chains(ctx, x, yTop, z, Math.max(3, Math.round(len / 0.06)), 0);
  const y = yTop - len;
  wb.cylinder('iron', x, y - 0.05, z, 0.13, 0.13, 0.04, 6, { ao: false, capBot: true, room: o.room });
  wb.cylinder(o.lit === false ? 'black' : 'ember', x, y - 0.01, z, 0.1, 0.1, 0.2, 6, { ao: false, grime: false, room: o.room });
  wb.cylinder('iron', x, y + 0.19, z, 0.14, 0.03, 0.14, 6, { ao: false, room: o.room });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    wb.box('iron', x + Math.cos(a) * 0.11 - 0.01, y - 0.03, z + Math.sin(a) * 0.11 - 0.01, x + Math.cos(a) * 0.11 + 0.01, y + 0.2, z + Math.sin(a) * 0.11 + 0.01, { ao: false, room: o.room });
  }
  if (o.lit === false) return;
  if (ctx.fires) ctx.fires.push({ x, y: y + 0.05, z, s: 0.16, light: false, embers: false, glow: true });
  if (ctx.lights) ctx.lights.push({ x, y: y - 0.2, z, r: 1, g: 0.58, b: 0.24, radius: o.radius ?? 6.5, intensity: o.intensity ?? 1.1, room: o.room });
  if (ctx.dynLights && o.dyn) ctx.dynLights.push({ x, y: y - 0.2, z, intensity: o.dyn, range: 7 });
}
