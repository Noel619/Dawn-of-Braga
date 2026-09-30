// Casa del Canónigo: casa-torre de piedra que se reconoce desde las
// Curtidurías y desde la Calle de la Muralla (portada de medio punto con
// tímpano, escudo con capelo y borlas, balcón, faroles encendidos a los lados
// de la puerta entornada y una torre con la ventana alta iluminada). Dentro:
// zaguán, estudio (la llave del claustro sigue sobre la mesa), alcoba, cocina,
// despensa y la escalera de la bodega, que el ama atrancó. Abajo, las bodegas
// (level_cellar.js): un laberinto donde el Descoyuntado caza.
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { house, solid, stairs, merlons } from './builders.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';
import { CELLAR, buildCellar } from './level_cellar.js';

// Medidas que también usan el juego (cinemática, navegación) y las pruebas.
const ST = { x: 59.5, w: 3, top: -27, n: 22, rise: 0.3, run: 0.42 };
ST.bottom = ST.top - ST.n * ST.run;
export const CANON = {
  g1: 3.6, // techo de la planta baja
  door: { x: 56, z: -12 },
  // bodegas: envolvente, suelo y techo
  cellar: { x0: CELLAR.bounds[0], z0: CELLAR.bounds[1], x1: CELLAR.bounds[2], z1: CELLAR.bounds[3], y: CELLAR.FLOOR, top: CELLAR.TOP },
  // escalera: baja hacia el norte desde el rellano (z = top) hasta la bodega
  stair: ST,
  cellarDoor: { x: 59.5, z: -26 },
};

// Altura del peldaño de la escalera de la bodega en z (0 arriba, suelo abajo).
export function stairY(z) {
  const S = CANON.stair;
  if (z >= S.top) return 0;
  if (z <= S.bottom) return CANON.cellar.y;
  const k = Math.min(S.n - 1, Math.floor((z - S.bottom) / S.run));
  return CANON.cellar.y + S.rise * (k + 1);
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Anillo de dovelas de un arco de medio punto en una fachada que mira a +z:
// centro (cx, cy), radios r0 (intradós) y r1 (trasdós), de zb (muro) a zf.
function archRing(wb, mat, cx, cy, zb, zf, r0, r1, n, o = {}) {
  const gap = o.gap ?? 0.012;
  for (let i = 0; i < n; i++) {
    const a0 = (Math.PI * i) / n + (i ? gap : 0),
      a1 = (Math.PI * (i + 1)) / n - (i < n - 1 ? gap : 0);
    // la clave, algo más grande
    const rr = i === (n - 1) / 2 ? r1 + (o.key ?? 0.08) : r1;
    const pt = (r, a, z) => V(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z);
    const oo = { ao: false, sub: 3, room: o.room, tint: o.tint };
    wb.quad(mat, pt(r0, a0, zf), pt(rr, a0, zf), pt(rr, a1, zf), pt(r0, a1, zf), oo);
    wb.quad(mat, pt(r0, a0, zf), pt(r0, a1, zf), pt(r0, a1, zb), pt(r0, a0, zb), oo);
    wb.quad(mat, pt(rr, a1, zf), pt(rr, a0, zf), pt(rr, a0, zb), pt(rr, a1, zb), oo);
    // juntas (se ven de lado, entre dovela y dovela)
    wb.quad(mat, pt(r0, a0, zb), pt(rr, a0, zb), pt(rr, a0, zf), pt(r0, a0, zf), oo);
    wb.quad(mat, pt(rr, a1, zb), pt(r0, a1, zb), pt(r0, a1, zf), pt(rr, a1, zf), oo);
  }
}

// Semicírculo lleno (tímpano, remate del escudo) en el plano z mirando a +z;
// dir = -1 lo dibuja hacia abajo.
function halfDisc(wb, mat, cx, cy, z, r, n = 10, dir = 1, o = {}) {
  for (let i = 0; i < n; i++) {
    const a0 = (Math.PI * i) / n,
      a1 = (Math.PI * (i + 1)) / n;
    const p0 = V(cx + Math.cos(a0) * r, cy + dir * Math.sin(a0) * r, z),
      p1 = V(cx + Math.cos(a1) * r, cy + dir * Math.sin(a1) * r, z);
    if (dir > 0) wb.tri(mat, V(cx, cy, z), p0, p1, { ao: false, room: o.room, tint: o.tint });
    else wb.tri(mat, V(cx, cy, z), p1, p0, { ao: false, room: o.room, tint: o.tint });
  }
}

// Ventana de fachada que mira a +z (o a +x con 'side' = 'e'), con cristal
// negro o encendido, marco de piedra y rejas o postigos abiertos.
function win(ctx, x, y, z, w, h, o = {}) {
  const wb = ctx.wb;
  const e = o.side === 'e';
  // (en una fachada que mira a +x, 'x' es la coordenada z de la ventana)
  const box = (mat, a0, y0, c0, a1, y1, c1, oo) => (e ? wb.box(mat, z + c0, y0, a0, z + c1, y1, a1, oo) : wb.box(mat, a0, y0, z + c0, a1, y1, z + c1, oo));
  const f = e ? 'e' : 's';
  const X = x;
  box(o.lit ? 'ember' : 'black', X - w / 2, y, 0, X + w / 2, y + h, 0.02, { ao: false, grime: false, faces: f });
  const fm = o.frame ?? 'ashlar';
  box(fm, X - w / 2 - 0.14, y - 0.14, 0, X + w / 2 + 0.14, y, 0.14, { ao: false, sub: 3 });
  box(fm, X - w / 2 - 0.14, y + h, 0, X + w / 2 + 0.14, y + h + 0.16, 0.12, { ao: false, sub: 3, faces: 'tnsewb' });
  box(fm, X - w / 2 - 0.12, y, 0, X - w / 2, y + h, 0.1, { ao: false, sub: 3 });
  box(fm, X + w / 2, y, 0, X + w / 2 + 0.12, y + h, 0.1, { ao: false, sub: 3 });
  if (o.bars) {
    for (let i = 1; i < 4; i++) box('iron', X - w / 2 + (i * w) / 4 - 0.018, y, 0.05, X - w / 2 + (i * w) / 4 + 0.018, y + h, 0.085, { ao: false, grime: false });
    box('iron', X - w / 2, y + h * 0.5 - 0.018, 0.05, X + w / 2, y + h * 0.5 + 0.018, 0.09, { ao: false, grime: false });
  }
  if (o.lit && o.light !== false && ctx.lights) {
    const lx = e ? z + 0.7 : x,
      lz = e ? x : z + 0.7;
    ctx.lights.push({ x: lx, y: y + h / 2, z: lz, r: 1, g: 0.45, b: 0.16, radius: o.radius ?? 4, intensity: o.intensity ?? 0.8 });
  }
}

// Borla colgante (cono con su cordón).
function tassel(wb, x, y, z, mat, tint) {
  wb.box(mat, x - 0.012, y, z, x + 0.012, y + 0.14, z + 0.03, { ao: false, tint });
  wb.cylinder(mat, x, y - 0.13, z + 0.015, 0.055, 0.018, 0.13, 6, { ao: false, capBot: true, tint });
}

export function buildCanon(ctx, S, B, L) {
  const wb = ctx.wb;
  const col = ctx.col;
  const room = 'canon';
  const croom = 'sotano';
  const rng = new RNG(6060);
  const G1 = CANON.g1;
  const C = CANON.cellar;
  const Y = C.y;

  // ------------------------------------------------------------ la casa
  house(ctx, {
    x0: 48,
    z0: -32,
    x1: 64,
    z1: -12,
    front: 's',
    seed: 606,
    hollow: true,
    collide: false,
    h: 8.6,
    g1: G1,
    style: 'stone',
    room,
    jetty: 0,
    // la fachada sur se compone a mano (portada, balcón, escudo)
    sides: ['n', 'e', 'w'],
    lowerWindows: false,
    lit: true,
    litChance: 0.5,
    chimney: true,
    chimneyAt: [51.2, -30.4],
    chimneySize: 0.45,
    smoke: true,
    doors: [{ side: 's', x: CANON.door.x, w: 1.5, h: 2.4, frame: false }],
    // hueco de la escalera de la bodega
    floorHoles: [[58, -32, 61, -27]],
    partMat: 'plaster',
    walls: [
      // estudio | zaguán y alcoba
      { x0: 53.4, z0: -25.8, x1: 53.8, z1: -12.35, doors: [{ at: -15.4, w: 1.2 }] },
      // cocina | estudio y alcoba
      { x0: 48.35, z0: -26.2, x1: 57.6, z1: -25.8, doors: [{ at: 50.6, w: 1.1 }, { at: 56.4, w: 1.1 }] },
      // escalera de la bodega (con su puerta atrancada)
      { x0: 57.6, z0: -26.2, x1: 61.4, z1: -25.8, doors: [{ at: CANON.cellarDoor.x, w: 1.5, h: 2.4 }] },
      // despensa | alcoba
      { x0: 61.4, z0: -26.2, x1: 63.65, z1: -25.8, doors: [{ at: 62.5, w: 1.1 }] },
      // zaguán | alcoba
      { x0: 53.8, z0: -19.2, x1: 63.65, z1: -18.8, doors: [{ at: 59.3, w: 1.3 }] },
    ],
  });

  // ------------------------------------------------------------ portada
  const dx = CANON.door.x;
  const zf = -12; // cara exterior del muro sur
  wb.setRoom(null);
  // jambas, arco de dovelas con clave y tímpano con una cruz en relieve
  wb.box('ashlar', dx - 1.1, 0, zf, dx - 0.75, 2.4, zf + 0.2, { sub: 2, aoH: 1 });
  wb.box('ashlar', dx + 0.75, 0, zf, dx + 1.1, 2.4, zf + 0.2, { sub: 2, aoH: 1 });
  archRing(wb, 'ashlar', dx, 2.4, zf, zf + 0.2, 0.75, 1.1, 9, { key: 0.1 });
  halfDisc(wb, 'ashlar', dx, 2.4, zf + 0.03, 0.75, 10, 1, { tint: [0.78, 0.76, 0.72] });
  wb.box('ashlar', dx - 0.04, 2.5, zf + 0.03, dx + 0.04, 3.02, zf + 0.07, { ao: false, tint: [0.9, 0.88, 0.84] });
  wb.box('ashlar', dx - 0.2, 2.78, zf + 0.03, dx + 0.2, 2.86, zf + 0.07, { ao: false, tint: [0.9, 0.88, 0.84] });
  // escalón de piedra ante la puerta
  wb.box('ashlar', dx - 1.3, -0.02, zf, dx + 1.3, 0.12, zf + 0.55, { faces: 'tnsew', ao: false, sub: 3 });
  // faroles encendidos a los dos lados (la casa se ve habitada desde lejos)
  P.lantern(ctx, dx - 1.55, 2.75, zf, 0, true);
  P.lantern(ctx, dx + 1.55, 2.75, zf, 0, true);
  ctx.dynLights.push({ x: dx, y: 2.4, z: zf + 1.2, intensity: 2.2, range: 7, color: 0xffa050 });
  ctx.lights.push({ x: dx + 0.4, y: 0.4, z: zf + 0.5, r: 1, g: 0.55, b: 0.22, radius: 2.4, intensity: 0.8 });
  // poyo de piedra junto a la puerta
  solid(ctx, 'ashlar', 50.6, 0, zf, 53.9, 0.46, zf + 0.5, { sub: 2, faces: 'tnsew', aoH: 0.4 });
  // velas de ofrenda en el escalón y un rastro de sangre que entra en la casa
  P.candles(ctx, dx + 0.95, 0.12, zf + 0.32, 4, 6061, { radius: 2.2, intensity: 0.45, spread: 0.18, scale: 0.7 });
  P.candles(ctx, dx - 1.0, 0.12, zf + 0.3, 3, 6062, { radius: 2, intensity: 0.4, spread: 0.15, scale: 0.6 });
  for (const [x, z, s] of [
    [55.2, -7.4, 0.7],
    [55.6, -8.6, 0.8],
    [55.8, -9.9, 0.6],
    [56.1, -11.1, 0.9],
  ])
    P.decal(ctx, x, 0.02, z, s);

  // balcón de madera sobre la portada, con su puerta-ventana encendida
  const by = G1 + 0.22;
  for (const x of [dx - 1.0, dx + 1.0]) wb.box('timber', x - 0.08, by - 0.55, zf, x + 0.08, by, zf + 0.72, { ao: false, faces: 'tsewb' });
  wb.box('wooddark', dx - 1.25, by, zf, dx + 1.25, by + 0.1, zf + 0.8, { ao: false, faces: 'tnsewb' });
  for (let x = dx - 1.2; x <= dx + 1.21; x += 0.2) wb.box('wooddark', x - 0.025, by + 0.1, zf + 0.72, x + 0.025, by + 1.0, zf + 0.77, { ao: false });
  for (const s of [-1, 1]) for (let z = zf + 0.12; z < zf + 0.72; z += 0.2) wb.box('wooddark', dx + s * 1.2 - 0.025, by + 0.1, z - 0.025, dx + s * 1.2 + 0.025, by + 1.0, z + 0.025, { ao: false });
  wb.box('wooddark', dx - 1.27, by + 1.0, zf + 0.68, dx + 1.27, by + 1.08, zf + 0.8, { ao: false, faces: 'tnsewb' });
  for (const s of [-1, 1]) wb.box('wooddark', dx + s * 1.21 - 0.04, by + 1.0, zf, dx + s * 1.21 + 0.04, by + 1.08, zf + 0.8, { ao: false, faces: 'tnsewb' });
  win(ctx, dx, by + 0.12, zf, 0.9, 1.75, { lit: true, radius: 5, intensity: 0.9 });
  // escudo del canónigo: blasón con una cruz, capelo y borlas
  const ay = 6.45,
    az = zf + 0.1;
  // (piedra pintada, como la heráldica de la época: campo rojo, cruz clara,
  // capelo negro y borlas rojas; se lee de lejos)
  const stoneT = [0.84, 0.82, 0.78];
  const fieldT = [0.95, 0.42, 0.36];
  const sw2 = 0.5,
    sh2 = 0.95;
  wb.box('ashlar', dx - sw2 - 0.06, ay - 0.06, zf, dx + sw2 + 0.06, ay + sh2 + 0.06, az - 0.02, { ao: false, sub: 3, tint: stoneT });
  wb.box('ashlar', dx - sw2, ay, zf, dx + sw2, ay + sh2, az, { ao: false, sub: 3, tint: fieldT });
  halfDisc(wb, 'ashlar', dx, ay, az, sw2, 10, -1, { tint: fieldT });
  halfDisc(wb, 'ashlar', dx, ay, az - 0.02, sw2 + 0.06, 10, -1, { tint: stoneT });
  for (let i = 0; i < 10; i++) {
    // canto inferior del blasón
    const a0 = (Math.PI * i) / 10,
      a1 = (Math.PI * (i + 1)) / 10;
    const p = (a, z) => V(dx + Math.cos(a) * sw2, ay - Math.sin(a) * sw2, z);
    wb.quad('ashlar', p(a0, az), p(a0, zf), p(a1, zf), p(a1, az), { ao: false, tint: fieldT });
  }
  const crossT = [1.25, 1.15, 0.95];
  wb.box('ashlar', dx - 0.07, ay - 0.36, az, dx + 0.07, ay + 0.8, az + 0.04, { ao: false, tint: crossT });
  wb.box('ashlar', dx - 0.36, ay + 0.3, az, dx + 0.36, ay + 0.44, az + 0.04, { ao: false, tint: crossT });
  // capelo (sombrero de ala ancha) y cordones con tres borlas por lado
  const hy = ay + sh2 + 0.1;
  wb.box('black', dx - 0.9, hy, zf, dx + 0.9, hy + 0.1, az + 0.03, { ao: false, grime: false });
  wb.box('black', dx - 0.4, hy + 0.1, zf, dx + 0.4, hy + 0.3, az + 0.01, { ao: false, grime: false });
  halfDisc(wb, 'black', dx, hy + 0.3, az + 0.01, 0.4, 8, 1);
  for (const s of [-1, 1]) {
    wb.push();
    wb.translate(dx + s * 0.78, hy, az);
    wb.rotateZ(s * 0.18);
    wb.box('clothRed', -0.018, -0.62, 0, 0.018, 0, 0.035, { ao: false });
    wb.pop();
    tassel(wb, dx + s * 0.9, ay + 0.22, az, 'clothRed');
    tassel(wb, dx + s * 0.8, ay - 0.08, az, 'clothRed');
    tassel(wb, dx + s * 1.0, ay - 0.08, az, 'clothRed');
  }
  // la luz del balcón alumbra el escudo desde abajo
  ctx.lights.push({ x: dx, y: ay + 0.2, z: zf + 1.2, r: 1, g: 0.62, b: 0.3, radius: 2.8, intensity: 0.7 });
  // ventanas de la planta alta y óculo encendido en el hastial
  win(ctx, 51.4, G1 + 0.95, zf, 0.7, 1.1, { lit: false, bars: true });
  win(ctx, 51.4, 1.15, zf, 0.7, 0.95, { lit: true, bars: true, radius: 3.5, intensity: 0.7 });
  halfDisc(wb, 'ember', dx, 10.1, zf + 0.02, 0.34, 8, 1);
  halfDisc(wb, 'ember', dx, 10.1, zf + 0.02, 0.34, 8, -1);
  for (const r of [0, Math.PI]) {
    wb.push();
    wb.translate(dx, 10.1, 0);
    wb.rotateZ(r);
    archRing(wb, 'ashlar', 0, 0, zf, zf + 0.12, 0.34, 0.52, 6, { key: 0 });
    wb.pop();
  }
  ctx.lights.push({ x: dx, y: 10.1, z: zf + 0.8, r: 1, g: 0.5, b: 0.18, radius: 3, intensity: 0.7 });
  ctx.fires.push({ x: dx, y: 10.1, z: zf + 0.05, s: 0.2, light: false, embers: false, glow: true });

  // ------------------------------------------------------------ torre
  // casa-torre en la esquina sureste: sobresale 0,7 m de las dos fachadas y
  // se ve por encima de los tejados
  const T = { x0: 60, z0: -16.4, x1: 64.7, z1: -11.3, top: 13.8 };
  solid(ctx, 'wallstone', 64, 0, T.z0, T.x1, G1, T.z1, { sub: 2, faces: 'nse', aoH: 1.4 });
  solid(ctx, 'wallstone', T.x0, 0, -12, 64, G1, T.z1, { sub: 2, faces: 'sw', aoH: 1.4 });
  wb.box('wallstone', T.x0 - 0.05, 0, T.z1, T.x1 + 0.07, 0.65, T.z1 + 0.07, { sub: 2, aoH: 0.6, faces: 'tsew' });
  wb.box('wallstone', T.x1, 0, T.z0 - 0.05, T.x1 + 0.07, 0.65, T.z1, { sub: 2, aoH: 0.6, faces: 'tne' });
  wb.box('wallstone', T.x0, G1, T.z0, T.x1, T.top, T.z1, { sub: 2, faces: 'nsew' });
  // esquinales de sillería
  // (asoman 3 cm de las dos caras de la esquina: enrasados parpadeaban)
  for (const [xc, zc] of [
    [T.x0, T.z1],
    [T.x1, T.z1],
    [T.x1, T.z0],
  ]) {
    const ox = xc === T.x0 ? -1 : 1,
      oz = zc === T.z1 ? 1 : -1;
    for (let y = 0.65, k = 0; y < T.top - 0.3; y += 0.7, k++) {
      const xa = xc + ox * 0.03,
        xb = xc - ox * (k % 2 ? 0.34 : 0.62),
        za = zc + oz * 0.03,
        zb = zc - oz * (k % 2 ? 0.62 : 0.34);
      wb.box('ashlar', Math.min(xa, xb), y, Math.min(za, zb), Math.max(xa, xb), y + 0.34, Math.max(za, zb), { ao: false, sub: 3 });
    }
  }
  // saeteras y la ventana alta, siempre encendida
  for (const y of [5.2, 8.4]) {
    wb.box('black', 62.25, y, T.z1, 62.4, y + 0.8, T.z1 + 0.02, { ao: false, grime: false, faces: 's' });
    wb.box('black', T.x1, y, -14.0, T.x1 + 0.02, y + 0.8, -13.85, { ao: false, grime: false, faces: 'e' });
  }
  win(ctx, 62.35, 11.0, T.z1, 0.55, 1.0, { lit: true, radius: 4.5, intensity: 1.0 });
  win(ctx, -13.85, 11.0, T.x1, 0.55, 1.0, { lit: true, side: 'e', radius: 4.5, intensity: 1.0 });
  ctx.fires.push({ x: 62.35, y: 11.3, z: T.z1 - 0.1, s: 0.22, light: false, embers: false, glow: true });
  ctx.fires.push({ x: T.x1 - 0.1, y: 11.3, z: -13.85, s: 0.22, light: false, embers: false, glow: true });
  // cornisa, almenas y chapitel
  wb.box('ashlar', T.x0 - 0.18, T.top, T.z0 - 0.18, T.x1 + 0.18, T.top + 0.24, T.z1 + 0.18, { ao: false, sub: 3, faces: 'tnsewb' });
  const my = T.top + 0.24;
  merlons(ctx, T.x0 - 0.1, T.z1 - 0.1, T.x1 + 0.1, T.z1 - 0.1, my, { collide: false, w: 0.7, gap: 0.5, h: 0.75, t: 0.34 });
  merlons(ctx, T.x0 - 0.1, T.z0 + 0.1, T.x1 + 0.1, T.z0 + 0.1, my, { collide: false, w: 0.7, gap: 0.5, h: 0.75, t: 0.34 });
  merlons(ctx, T.x1 - 0.1, T.z0 + 0.3, T.x1 - 0.1, T.z1 - 0.3, my, { collide: false, w: 0.7, gap: 0.5, h: 0.75, t: 0.34 });
  merlons(ctx, T.x0 + 0.1, T.z0 + 0.3, T.x0 + 0.1, T.z1 - 0.3, my, { collide: false, w: 0.7, gap: 0.5, h: 0.75, t: 0.34 });
  wb.pyramid('roof', (T.x0 + T.x1) / 2, (T.z0 + T.z1) / 2, T.x1 - T.x0 - 0.5, T.z1 - T.z0 - 0.5, my, 2.9);
  wb.cylinder('iron', (T.x0 + T.x1) / 2, my + 2.85, (T.z0 + T.z1) / 2, 0.03, 0.02, 0.9, 4, { ao: false });
  wb.box('iron', (T.x0 + T.x1) / 2 - 0.22, my + 3.45, (T.z0 + T.z1) / 2 - 0.02, (T.x0 + T.x1) / 2 + 0.22, my + 3.5, (T.z0 + T.z1) / 2 + 0.02, { ao: false });
  const tc = col.add(T.x0, G1, T.z0, T.x1, my + 2.9, T.z1);
  tc.cam = true;
  tc.noSight = true;
  // farol en la esquina de la torre que da a la Calle de la Muralla
  P.lantern(ctx, T.x1, 2.75, -14.6, Math.PI / 2, true);
  win(ctx, -21, 1.2, 64, 0.7, 0.9, { lit: true, side: 'e', bars: true, radius: 3.5, intensity: 0.7 });

  // ------------------------------------------------------------ interior
  wb.setRoom(room);
  // --- zaguán
  P.hangingLamp(ctx, 58.6, G1 - 0.22, -15.6, { room, radius: 6.5, intensity: 1.0, len: 0.8 });
  // luz junto a la puerta: se escapa por la hoja entornada
  P.candles(ctx, 57.4, 0, -13.0, 5, 6063, { room, radius: 3.5, intensity: 0.8, spread: 0.25 });
  solid(ctx, 'ashlar', 53.8, 0, -18.5, 54.3, 0.46, -16.4, { sub: 2, faces: 'tnsew', aoH: 0.4, room });
  // arcón
  wb.box('wooddark', 62.3, 0, -18.55, 63.55, 0.55, -17.85, { faces: 'tnsew', aoH: 0.5 });
  for (const x of [62.45, 63.4]) wb.box('iron', x - 0.03, 0, -18.58, x + 0.03, 0.57, -17.82, { ao: false });
  wb.box('wooddark', 62.28, 0.55, -18.57, 63.57, 0.62, -17.83, { ao: false, faces: 'tnsewb' });
  col.add(62.3, 0, -18.55, 63.55, 0.62, -17.85);
  // perchero con la capa negra y el capelo del canónigo
  wb.box('wooddark', 63.6, 1.8, -17.2, 63.65, 1.9, -15.6, { ao: false, faces: 'w' });
  for (const z of [-16.9, -16.4, -15.9]) wb.box('wooddark', 63.35, 1.82, z - 0.02, 63.62, 1.86, z + 0.02, { ao: false });
  wb.box('clothDark', 63.4, 0.55, -17.15, 63.52, 1.84, -16.6, { ao: false, faces: 'nswt' });
  wb.cylinder('clothDark', 63.3, 1.88, -15.9, 0.32, 0.32, 0.03, 10, { ao: false, capTop: true, capBot: true });
  wb.cylinder('clothDark', 63.3, 1.91, -15.9, 0.15, 0.13, 0.1, 8, { ao: false, capTop: true });
  for (const s of [-1, 1]) tassel(wb, 63.3, 1.25, -15.9 + s * 0.25, 'clothRed', [0.5, 0.2, 0.2]);
  P.crate(ctx, 62.8, 0, -13.4, 0.8, 0.2);
  // rastro de sangre del portal a la alcoba
  for (const [x, z, s] of [
    [56.3, -13.2, 0.8],
    [56.9, -14.6, 0.6],
    [57.6, -16.0, 0.9],
    [58.4, -17.4, 0.7],
    [59.1, -18.6, 0.8],
  ])
    P.decal(ctx, x, 0.03, z, s);

  // --- estudio (la llave y el diario, donde siempre)
  P.table(ctx, 51.5, 0, -22, 2, 1, 0);
  P.bench(ctx, 51.5, 0, -21.1, 1.4, 0);
  P.candles(ctx, 52.1, 0.8, -22.2, 4, 21, { room, radius: 5, intensity: 1.1, spread: 0.25 });
  P.shelf(ctx, 48.6, 0, -18, Math.PI / 2, 1.8);
  P.shelf(ctx, 48.6, 0, -15.5, Math.PI / 2, 1.8);
  P.shelf(ctx, 48.6, 0, -20.6, Math.PI / 2, 1.8);
  P.stool(ctx, 52.6, 0, -23.2, { room, tipped: true });
  // atril con el libro de horas abierto junto a la ventana
  wb.box('wooddark', 51.35, 0, -13.35, 51.45, 1.05, -13.25, { ao: false });
  wb.box('wooddark', 51.1, 0, -13.5, 51.7, 0.06, -13.1, { ao: false });
  wb.push();
  wb.translate(51.4, 1.08, -13.3);
  wb.rotateX(-0.5);
  wb.box('wooddark', -0.3, -0.03, -0.22, 0.3, 0.0, 0.22, { ao: false, faces: 'tnsewb' });
  wb.box('clothWhite', -0.28, 0.0, -0.2, 0.28, 0.04, 0.2, { ao: false, faces: 'tnsew', tint: [0.8, 0.72, 0.58] });
  wb.pop();
  col.add(51.1, 0, -13.5, 51.7, 1.1, -13.1);
  // crucifijo sin Cristo y el sigilo pintado en su lugar
  wb.box('wooddark', 52.35, 1.5, -25.8, 52.45, 2.5, -25.74, { ao: false });
  wb.box('wooddark', 52.1, 2.12, -25.8, 52.7, 2.2, -25.74, { ao: false });
  P.decal(ctx, 52.4, 1.95, -25.77, 0.9, 'sigil', 0, { wall: 'z' });
  // papeles por el suelo
  for (let i = 0; i < 7; i++) {
    const x = rng.range(49.4, 53),
      z = rng.range(-25, -17);
    wb.push();
    wb.translate(x, 0.02, z);
    wb.rotateY(rng.range(0, 3));
    wb.box('clothWhite', -0.11, 0, -0.15, 0.11, 0.008, 0.15, { ao: false, faces: 't', tint: [0.72, 0.64, 0.5] });
    wb.pop();
  }
  P.fleshGrowth(ctx, 49, 0, -25, 0.8, 93, { room, climb: 1.5, bound: [48.5, 53.2, -25.6, -12.5] });
  P.decal(ctx, 51, 0.03, -18, 2.2);

  // --- alcoba: la cama del canónigo y la puerta de la bodega
  P.bed(ctx, 62.9, 0, -22.4, Math.PI / 2);
  bakeCorpse(wb, 62.85, 0.6, -22.5, 0.2, 'back', 'villager', 2);
  wb.box('wooddark', 62.1, 0, -20.2, 63.5, 0.5, -19.6, { faces: 'tnsew', aoH: 0.5 });
  col.add(62.1, 0, -20.2, 63.5, 0.5, -19.6);
  // reclinatorio vuelto hacia la puerta de la bodega
  wb.at(58.2, 0, -23.8, 0, () => {
    wb.box('wooddark', -0.35, 0, -0.1, 0.35, 0.18, 0.25, { ao: false, faces: 'tnsew' });
    wb.box('wooddark', -0.35, 0.18, -0.25, 0.35, 0.85, -0.15, { ao: false, faces: 'tnsew' });
    wb.box('wooddark', -0.4, 0.85, -0.35, 0.4, 0.92, -0.05, { ao: false, faces: 'tnsewb' });
  });
  col.add(57.8, 0, -24.1, 58.6, 0.9, -23.5);
  // velas y una raya de sal ante la puerta, y el sigilo arañado en la jamba
  P.candles(ctx, 58.3, 0, -25.4, 4, 6064, { room, radius: 3.5, intensity: 0.7, spread: 0.25 });
  P.candles(ctx, 60.7, 0, -25.4, 4, 6072, { room, radius: 3.5, intensity: 0.7, spread: 0.25 });
  wb.box('clothWhite', 58.5, 0, -25.02, 60.5, 0.012, -24.94, { ao: false, faces: 't', tint: [0.9, 0.9, 0.86] });
  P.decal(ctx, 58.25, 1.35, -25.78, 0.8, 'sigil', 0, { wall: 'z' });
  P.decal(ctx, 60.75, 0.9, -25.78, 0.6, 'splat', 0, { wall: 'z' });
  P.stool(ctx, 57.3, 0, -24.9, { room });
  P.hangingLamp(ctx, 58.9, G1 - 0.22, -22.2, { room, radius: 5, intensity: 0.7, len: 0.7, lit: true });

  // --- cocina
  P.hearth(ctx, 51.2, 0, -31.65, 's', { room, w: 2.0, pot: true, fire: 0.4, radius: 6.5 });
  P.table(ctx, 54.6, 0, -28.7, 1.8, 0.9, 0.08);
  wb.cylinder('bronze', 54.3, 0.8, -28.6, 0.14, 0.1, 0.1, 7, { ao: false, capBot: true });
  wb.box('clothWhite', 55.0, 0.8, -28.9, 55.3, 0.82, -28.5, { ao: false, faces: 't', tint: [0.75, 0.66, 0.5] });
  P.stool(ctx, 53.6, 0, -28.3, { room });
  P.stool(ctx, 55.6, 0, -29.5, { room, tipped: true });
  P.cask(ctx, 49.2, 0, -28.2, Math.PI / 2, { room, r: 0.42, len: 1.1 });
  P.firewood(ctx, 53.3, 0, -30.9, 0, 3);
  P.jar(ctx, 56.9, 0, -30.9, 1.0);
  P.jar(ctx, 56.4, 0, -31.2, 0.8, { broken: true });
  P.sacks(ctx, 49.2, 0, -30.8, 3, 6065);
  for (const x of [48.9, 49.4, 49.9]) {
    wb.box('iron', x - 0.01, 1.9, -31.65, x + 0.01, 2.2, -31.55, { ao: false });
    wb.cylinder('iron', x, 1.62, -31.45, 0.14, 0.12, 0.26, 7, { ao: false, capBot: true });
  }
  P.decal(ctx, 55.2, 0.03, -27.2, 1.4);
  L.interact.push({ kind: 'note', id: 'n_ama', note: 'ama', x: 57.3, y: 0.47, z: -24.9, model: 'paper' });

  // --- despensa
  P.shelf(ctx, 63.4, 0, -29.4, -Math.PI / 2, 1.8);
  P.shelf(ctx, 61.65, 0, -30.5, Math.PI / 2, 1.6);
  P.cask(ctx, 62.5, 0, -31.0, 0, { room, r: 0.4, len: 1.0 });
  P.jar(ctx, 61.85, 0, -27.4, 1.1);
  P.basket(ctx, 63.2, 0, -27.1, { tipped: true, rot: 2.4 });
  ctx.rats.push({ x: 62.4, y: 0, z: -28.5, n: 2 });

  // ------------------------------------------------------------ escalera
  // muros del hueco, de la bodega al techo de la planta baja
  const shaft = (x0, x1, inner, outer) => {
    // por debajo del suelo (se ven desde la escalera)
    wb.box('wallstone', x0, Y, -32, x1, 0, -26.2, { sub: 2, faces: inner, room: croom, tint: [0.66, 0.64, 0.6], aoH: 1.6 });
    // por encima: hacia el hueco y hacia la cocina o la despensa
    wb.box('plaster', x0, 0, -31.65, x1, G1, -26.2, { sub: 1.6, faces: inner + outer, room, tint: [0.82, 0.78, 0.72], aoH: 1.2 });
    col.add(x0, Y, -32, x1, G1, -26.2);
  };
  shaft(57.6, 58, 'e', 'w');
  shaft(61, 61.4, 'w', 'e');
  // dintel bajo el muro norte de la casa (desde la bodega se ve la boca de la escalera)
  // (sólo 15 cm de grueso: más ancho rozaba la cabeza del personaje mientras aún
  // pisaba el peldaño de arriba y lo dejaba atascado a media bajada)
  wb.box('wallstone', 58, C.top, -32, 61, 0, -31.85, { sub: 2, faces: 'bns', room: croom, tint: [0.6, 0.58, 0.55] });
  col.add(58, C.top, -32, 61, 0, -31.85).cam = true;
  // la cara de abajo del muro norte de la casa, sobre la escalera
  wb.box('wallstone', 58, -0.05, -31.85, 61, 0, -31.65, { faces: 'b', ao: false, room: croom, tint: [0.6, 0.58, 0.55] });
  wb.setRoom(croom);
  stairs(ctx, CANON.stair.x, Y, CANON.stair.bottom, 's', CANON.stair.w, CANON.stair.n, CANON.stair.rise, CANON.stair.run, 'ashlar');
  // sangre en los peldaños y arañazos en el muro
  for (const [x, z] of [
    [59.9, -27.6],
    [59.2, -28.9],
    [60.1, -30.4],
    [59.4, -31.9],
    [59.8, -33.6],
    [59.3, -35.2],
  ])
    P.decal(ctx, x, stairY(z) + 0.02, z, 0.38);
  P.decal(ctx, 58.03, -1.2, -30, 1.1, 'sigil', Math.PI / 2, { wall: 'x' });
  B.paint(58, -32, 61, CANON.stair.top, 1);

  // ------------------------------------------------------------ bodegas
  buildCellar(ctx, B, L, { room: croom });
  // muros: todo lo que no es bodega ni escalera, bajo la losa de la calle
  const nB = B.toColliders(col, Y - 1, C.top);
  wb.setRoom(null);

  // ------------------------------------------------------------ interactuables
  L.interact.push(
    // la puerta de la calle, entornada: por la rendija se ve la luz del zaguán
    { kind: 'door', id: 'd_canon', x: CANON.door.x, y: 0, z: -12, w: 1.5, h: 2.4, axis: 'x', lock: { type: 'none' }, mat: 'planks', hinge: -1, swing: 1, plane: -12.3, ajar: 0.34 },
    { kind: 'item', id: 'i_llave', item: 'llave_claustro', x: 50.9, y: 0.85, z: -21.9 },
    { kind: 'note', id: 'n_canonigo', note: 'canonigo', x: 51.9, y: 0.82, z: -22.3, model: 'book' },
    // la bodega: atrancada desde la alcoba (y alguien vuelve a atrancarla)
    { kind: 'door', id: 'd_sotano', x: CANON.cellarDoor.x, y: 0, z: CANON.cellarDoor.z, w: 1.5, h: 2.4, axis: 'x', lock: { type: 'barred', side: 1 }, mat: 'planks', hinge: -1, swing: 1, plane: -26.2, barAt: -25.8, relock: true },
    // al asomarse a la escalera: la cinemática (una vez)
    { kind: 'trigger', id: 't_sotano', x: CANON.stair.x, y: 0, z: -26.75, r: 1.4, rz: 0.4, event: 'sotano' },
    // tras vencerlo: su rosario sobre el altar
    { kind: 'item', id: 'i_rosario', item: 'rosario', x: 60.4, y: Y + 1.18, z: -45.25, afterBoss: 'descoyuntado' },
    // la última página, en su celda; y la vieja orden de tapiar la cisterna
    { kind: 'note', id: 'n_bodega', note: 'bodega', x: 53.7, y: Y + 0.27, z: -34.2, model: 'paper' },
    { kind: 'note', id: 'n_pozo', note: 'pozo', x: 63.6, y: Y + 0.04, z: -59.3, model: 'paper' },
    // lo que se ve y no se alcanza
    { kind: 'examine', id: 'x_reja', text: 'rejaCisterna', x: 55, y: Y, z: -45.9, r: 1.9 },
    { kind: 'examine', id: 'x_respiradero', text: 'rejaCisterna', x: 62.9, y: Y, z: -59.1, r: 1.6 },
    { kind: 'examine', id: 'x_tapiado', text: 'tapiado', x: 46.6, y: Y, z: -58.5, r: 1.9, breakable: 'tapiado' },
    // la salida: trepar por el pozo del Postigo (y, ya fuera, volver a bajar)
    { kind: 'climb', id: 'x_pozo', x: CELLAR.well.x, y: Y, z: CELLAR.well.z, r: 2.3 },
    { kind: 'well', id: 'x_pozo_calle', x: CELLAR.well.x, y: 0, z: CELLAR.well.z, r: 2.3 }
  );
  L.enemies.push(
    { type: 'crawler', x: 52, y: 2.6, z: -18, yaw: 0, idle: 'ceiling', id: 'e_canon1' },
    // come junto al altar, de espaldas a la escalera
    { type: 'descoyuntado', x: CELLAR.feast.x, y: Y, z: CELLAR.feast.z, yaw: CELLAR.feast.yaw, idle: 'boss', id: 'b_descoyuntado', boss: true }
  );
  // las bodegas van antes que la casa: el tramo bajo de la escalera ya es bodega
  const cz = (id, r) => ({ id, rects: [[...r, Y - 1, C.top - 0.05]], atmo: 'cellar', room: croom });
  L.zones.push(
    cz('toneles', [40, -49.5, 52, -36.5]),
    cz('pasillo', [40.5, -61, 48, -49.5]),
    cz('cisterna', [48, -60, 62, -47.5]),
    cz('osario', [62, -61, 71, -36.5]),
    { id: 'sotano', rects: [[C.x0, C.z0, C.x1, C.z1, Y - 1, C.top - 0.05], [58, -32.2, 61, -27, Y - 1, -0.6]], atmo: 'cellar', room: croom },
    { id: 'canon', rects: [[48, -32, 64, -12.2, -1, 4.5]], atmo: 'interior', room }
  );
  L.map.push(
    { id: 'canon', r: [48.4, -31.6, 63.6, -12.4] },
    { id: 'sotano', r: [52, -46, 66, -36.5], level: 'cellar' },
    { id: 'sotano', r: [52.5, -36.5, 56.5, -33], level: 'cellar' },
    { id: 'sotano', r: [58, -36.5, 61, -27], level: 'cellar' },
    { id: 'toneles', r: [40, -49, 52, -36.5], level: 'cellar' },
    { id: 'pasillo', r: [40.5, -57, 43.5, -49], level: 'cellar' },
    { id: 'pasillo', r: [40.5, -61, 48, -57], level: 'cellar' },
    { id: 'cisterna', r: [48, -60, 62, -47.5], level: 'cellar' },
    { id: 'osario', r: [66, -58, 70.5, -36.5], level: 'cellar' },
    { id: 'osario', r: [62.5, -61, 70.5, -58], level: 'cellar' }
  );
  return nB;
}
