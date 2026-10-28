// Los tejados de los Pellejeros: de la plaza de la Herrería a las Curtidurías
// por dentro de la manzana, por los desvanes y por encima de los tejados.
//
// Cuando las criaturas se quedaron con las calles, los vecinos de la manzana
// dejaron de salir a ellas: abrieron boquetes en las medianeras para pasar de
// una casa a otra y tendieron tablones de un tejado a otro. A sus muertos los
// cosieron en sus mortajas y los llevaron a la casa de la esquina de la plaza,
// la del velatorio, y clavaron la puerta por dentro. Los muertos se movieron
// en las mortajas; rompieron la medianera del pellejero. Los vecinos subieron:
// al sobrado, al desván, a los tejados, al palomar, donde guardaban lo que les
// quedaba de comer. Y al palomar llegaron los cuervos que habían comido de
// los muertos de la campana.
//
// El recorrido:
//  1. La casa del velatorio (la puerta de la plaza, clavada por dentro: la
//     palanca): los muertos en sus andas, entre velas; el boquete al fondo.
//  2. La casa del pellejero: el taller, la escalera, el sobrado; otro boquete.
//  3. El sobrado de los vecinos (la escalera de abajo, tapada con muebles) y,
//     por una escala, el desván de los cueros: pieles colgadas a secar.
//  4. El secadero: la azotea, con sus bastidores de cueros y la ciudad entera
//     desde arriba. Los cuervos.
//  5. La casa del palomar: una escalera de tablas sube a la puerta de su
//     desván, el del palomero, con sus jaulas; por una escala, el palomar de
//     la cumbrera (el nido, el aprendiz del herrero, la piedra de afilar).
//  6. Los tejados: la pasarela de tablones por la cumbrera de la casa de al
//     lado y el tablón sobre el callejón, hasta el tejado hundido del curtidor.
//  7. La casa del curtidor: el desván, la escala, el sobrado, el taller y la
//     puerta (atrancada por dentro) a las Curtidurías, detrás de la barricada.
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { house, stairs, solidGableRoof, subtractRects, doorAt, timberFrame, blocker } from './builders.js';
import { holedWall, railing, frame, chest, closedWindow, shutter, herbBunch, bowl, saint } from './level_souto.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';
import { bakeShrouded } from '../entities/amortajado.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// las plantas: el techo de la baja (G1) y el suelo del sobrado (F1); el techo
// del sobrado (C1) y el suelo del desván (F2); el grueso de los muros
const G1 = 3.0,
  F1 = 3.2,
  C1 = 5.9,
  F2 = 6.1,
  T = 0.4;

export const TJ = {
  G1,
  F1,
  C1,
  F2,
  // la casa del velatorio (sólo la planta baja: arriba no se sube) y su
  // puerta a la plaza
  vel: { x0: 14, z0: 42, x1: 24, z1: 50, h: 6.8, ridge: 9.2, door: { z: 46, w: 1.3, h: 2.3 } },
  // la del pellejero (el taller y el sobrado)
  pel: { x0: 24, z0: 42, x1: 36, z1: 50, h: 6.3, ridge: 8.5 },
  // la de los vecinos (el sobrado y el desván, alto, de secar cueros)
  vec: { x0: 36, z0: 42, x1: 48, z1: 50, h: 8.3, ridge: 10.5, door: { z: 46, w: 1.2, h: 2.1 } },
  // el secadero: la azotea de la casa de al lado
  sec: { x0: 48, z0: 40, x1: 61, z1: 50, y: F2 },
  // la casa del palomar: el suelo del desván (F), el alero y la cumbrera (a
  // lo largo de z); la puerta del hastial del sur (a la que ya no se llega),
  // la brecha del hastial del norte y la esquina hundida del sureste (desde
  // a0 en x y desde z en el muro del este)
  pal: { x0: 51, z0: 30, x1: 61, z1: 40, F: 8.7, h: 9.3, ridge: 12.3, door: { x: 55.2, w: 1.15, h: 2.1 }, breachN: { a0: 56.85, a1: 58.15, y1: 10.72 }, breachS: { a0: 57.3, z: 36.6 } },
  // el palomar de la cumbrera: su centro, su ancho y su suelo
  dove: { x: 56, z: 35, w: 3.4, y: 12.62, top: 14.8 },
  // la casa quemada, entre el palomar y el curtidor: su tejado (cumbrera a lo
  // largo de z) y el hundimiento de en medio (de z0 a z1; desde la cumbrera,
  // uW al oeste y uE al este)
  teja: { x0: 54, z0: 19.5, x1: 61, z1: 30, h: 5.2, ridge: 6.95, hole: { z0: 23.8, z1: 26.6, uW: 1.55, uE: 1.7 } },
  // la casa del curtidor: su tejado (hundido) y su puerta a las Curtidurías
  cur: { x0: 54, z0: 12, x1: 64, z1: 19.5, h: 7.2, ridge: 9.45, door: { x: 59, w: 1.3, h: 2.3 }, hole: { x0: 56.7, x1: 58.3, u0: 0.2, u1: 1.33 } },
  // los boquetes de las medianeras: del velatorio al taller del pellejero
  // (abajo) y del sobrado del pellejero al de los vecinos
  hole1: { x: 24, z: 46.6, w: 1.15, h: 1.95 },
  hole2: { x: 36, z: 43.6, w: 1.1, h: 1.9 },
};

// el interior de una casa (sin los muros)
const inner = (R, t = T) => ({ x0: R.x0 + t, z0: R.z0 + t, x1: R.x1 - t, z1: R.z1 - t });
const LIME = [0.88, 0.86, 0.8];
const SOOTED = [0.7, 0.66, 0.6];

// ------------------------------------------------------------ piezas
// Forjado de tablas: el suelo de arriba (a la altura y), el techo de abajo,
// los huecos (con su canto) y la colisión.
function slab(ctx, R, y, holes, up, down, o = {}) {
  const wb = ctx.wb;
  const th = o.th ?? 0.2;
  for (const r of subtractRects([R.x0, R.z0, R.x1, R.z1], holes)) {
    wb.box(o.mat ?? 'planks', r[0], y - th, r[1], r[2], y, r[3], { faces: 't', room: up, ao: false, uv: o.uv ?? 0.5, tint: o.tint ?? [0.84, 0.78, 0.7] });
    if (down) wb.box('wooddark', r[0], y - th, r[1], r[2], y - th + 0.04, r[3], { faces: 'b', room: down, ao: false, tint: [0.6, 0.54, 0.48] });
    ctx.col.add(r[0], y - th, r[1], r[2], y, r[3]).cam = true;
  }
  for (const [a, b, c, d] of holes) {
    const oo = { ao: false, room: down || up, tint: [0.55, 0.5, 0.45] };
    if (b > R.z0) wb.box('wooddark', a, y - th, b - 0.01, c, y, b, { ...oo, faces: 's' });
    if (d < R.z1) wb.box('wooddark', a, y - th, d, c, y, d + 0.01, { ...oo, faces: 'n' });
    if (a > R.x0) wb.box('wooddark', a - 0.01, y - th, b, a, y, d, { ...oo, faces: 'e' });
    if (c < R.x1) wb.box('wooddark', c, y - th, b, c + 0.01, y, d, { ...oo, faces: 'w' });
  }
}

// Vigas bajo un forjado o un techo (de canto 22 cm), a lo largo de x o de z,
// una en cada coordenada de 'at'; se cortan en los huecos. La cámara se
// queda por debajo de ellas (menos en los huecos).
function joists(ctx, R, y, along, at, holes, room) {
  const wb = ctx.wb;
  for (const c of at) {
    let segs = along === 'x' ? [[R.x0, R.x1]] : [[R.z0, R.z1]];
    for (const [a0, b0, a1, b1] of holes) {
      const hit = along === 'x' ? c > b0 - 0.1 && c < b1 + 0.1 : c > a0 - 0.1 && c < a1 + 0.1;
      if (!hit) continue;
      const [lo, hi] = along === 'x' ? [a0 - 0.1, a1 + 0.1] : [b0 - 0.1, b1 + 0.1];
      segs = segs.flatMap(([u, v]) => (hi <= u || lo >= v ? [[u, v]] : [[u, lo], [hi, v]].filter(([p, q]) => q - p > 0.05)));
    }
    for (const [u, v] of segs) {
      if (along === 'x') wb.box('timber', u, y - 0.22, c - 0.1, v, y, c + 0.1, { ao: false, room, faces: 'nsewb' });
      else wb.box('timber', c - 0.1, y - 0.22, u, c + 0.1, y, v, { ao: false, room, faces: 'nsewb' });
    }
  }
  const pad = holes.map(([a, b, c, d]) => [a - 0.12, b - 0.12, c + 0.12, d + 0.12]);
  for (const r of subtractRects([R.x0, R.z0, R.x1, R.z1], pad)) ctx.col.addCam(r[0], y - 0.27, r[1], r[2], y, r[3]);
}

// Techo de la última planta a la que se sube (lo de encima no se pisa): las
// tablas, las vigas y la colisión hasta 'top'.
function ceiling(ctx, R, y, top, along, at, room) {
  const wb = ctx.wb;
  wb.box('wooddark', R.x0, y, R.z0, R.x1, y + 0.05, R.z1, { faces: 'b', room, ao: false, tint: [0.58, 0.52, 0.46] });
  joists(ctx, R, y, along, at, [], room);
  ctx.col.add(R.x0, y, R.z0, R.x1, top, R.z1).cam = true;
}

// Escalera de madera maciza que sube en 'dir' desde (x, y0, z) (z/x: el eje
// de la escalera), con su zanca y su pasamanos por el lado abierto (open:
// 'n','s','e','w'; el pasamanos acaba en railTo pasos).
function woodStair(ctx, o) {
  const wb = ctx.wb;
  const { x, z, dir, w, n, rise, run, room } = o;
  const y0 = o.y0 ?? 0;
  stairs(ctx, x, y0, z, dir, w, n, rise, run, 'wooddark', { solidBelow: true });
  if (!o.open) return;
  const along = dir === 'e' || dir === 'w' ? 'x' : 'z';
  const sgn = dir === 'e' || dir === 's' ? 1 : -1;
  const side = { n: -1, s: 1, w: -1, e: 1 }[o.open];
  const L = n * run;
  const H = n * rise;
  // (el borde del lado abierto, en el eje de los lados)
  const edge = (along === 'x' ? z : x) + (side * w) / 2;
  const P0 = (u, y, k = 0) => (along === 'x' ? V(x + sgn * u, y, edge + side * k) : V(edge + side * k, y, z + sgn * u));
  // la zanca: un tablón inclinado por fuera de los peldaños
  const ang = Math.atan2(H, L);
  const len = Math.hypot(L, H);
  wb.push();
  const c = P0(L / 2, y0 + H / 2 - 0.12, 0.03);
  wb.translate(c.x, c.y, c.z);
  if (along === 'x') wb.rotateZ(sgn * ang);
  else wb.rotateX(-sgn * ang);
  if (along === 'x') wb.box('timber', -len / 2, -0.16, -0.03, len / 2, 0.16, 0.03, { ao: false, room });
  else wb.box('timber', -0.03, -0.16, -len / 2, 0.03, 0.16, len / 2, { ao: false, room });
  wb.pop();
  // el pasamanos: el poste de abajo, la baranda inclinada y el de arriba
  const k = (o.railTo ?? n) - 1;
  const ua = run * 0.5,
    ub = run * (k + 0.5);
  const ya = y0 + rise + 0.9,
    yb = y0 + rise * (k + 1) + 0.9;
  const pa = P0(ua, 0, 0.06),
    pb = P0(ub, 0, 0.06);
  wb.box('wooddark', pa.x - 0.04, y0, pa.z - 0.04, pa.x + 0.04, ya + 0.05, pa.z + 0.04, { ao: false, room });
  wb.box('wooddark', pb.x - 0.04, y0 + rise * k, pb.z - 0.04, pb.x + 0.04, yb + 0.05, pb.z + 0.04, { ao: false, room });
  const rl = Math.hypot(ub - ua, yb - ya);
  wb.push();
  wb.translate((pa.x + pb.x) / 2, (ya + yb) / 2, (pa.z + pb.z) / 2);
  if (along === 'x') wb.rotateZ(sgn * Math.atan2(yb - ya, ub - ua));
  else wb.rotateX(-sgn * Math.atan2(yb - ya, ub - ua));
  if (along === 'x') wb.box('wooddark', -rl / 2, -0.035, -0.035, rl / 2, 0.035, 0.035, { ao: false, room });
  else wb.box('wooddark', -0.035, -0.035, -rl / 2, 0.035, 0.035, rl / 2, { ao: false, room });
  wb.pop();
  // (la colisión del pasamanos: no se cae uno por el lado abierto)
  const lo = Math.min(pa.x, pb.x),
    hi = Math.max(pa.x, pb.x),
    lz = Math.min(pa.z, pb.z),
    hz = Math.max(pa.z, pb.z);
  ctx.col.add(lo - 0.05, y0, lz - 0.05, hi + 0.05, yb, hz + 0.05).noSight = true;
}

// Escala de mano entre dos plantas (se sube y se baja con un fundido, como
// las trampillas de la torre): la escala, la trampilla de arriba y los dos
// puntos de uso. (x, z): el pie; rot: hacia dónde mira quien sube.
function escala(ctx, L, o) {
  const wb = ctx.wb;
  const { id, x, z, y0, y1, rot } = o;
  const fx = Math.sin(rot),
    fz = Math.cos(rot);
  wb.setRoom(o.room);
  // (apoyada en el canto de la trampilla, inclinada hacia quien sube)
  P.ladder(ctx, x + fx * 0.5, y0, z + fz * 0.5, y1 - y0 + 0.9, rot + Math.PI, 0.12);
  // la trampilla vista desde abajo: el marco y el negro del hueco
  wb.box('wooddark', x - 0.62, y1 - 0.25, z - 0.62, x + 0.62, y1 - 0.21, z + 0.62, { ao: false, faces: 'b', room: o.room, tint: [0.4, 0.36, 0.32] });
  wb.box('black', x - 0.55, y1 - 0.205, z - 0.55, x + 0.55, y1 - 0.2, z + 0.55, { ao: false, faces: 'b', room: o.room, grime: false });
  wb.setRoom(null);
  L.interact.push(
    { kind: 'hatch', id: id + '_abajo', end: 'bottom', flag: 'hatch:' + id, open: true, msgUp: o.msgUp, x: x - fx * 0.2, y: y0, z: z - fz * 0.2, r: 1.5, to: o.toUp },
    { kind: 'hatch', id: id + '_arriba', end: 'top', flag: 'hatch:' + id, open: true, msgDown: o.msgDown, x, y: y1, z, r: 1.6, to: o.toDown }
  );
}

// Unas andas sobre sus dos caballetes (la cabeza hacia -z girado rot); la
// altura de lo que se apoya en ellas es BIER_H.
export const BIER_H = 0.79;
function bier(ctx, x, z, rot, room, o = {}) {
  const wb = ctx.wb;
  const H = BIER_H - 0.07;
  wb.at(x, 0, z, rot, () => {
    for (const s of [-1, 1]) {
      const zz = s * 0.7;
      // caballete: dos pares de patas abiertas y el travesaño
      for (const k of [-1, 1]) {
        wb.push();
        wb.translate(k * 0.2, H / 2 - 0.04, zz);
        wb.rotateZ(k * 0.3);
        wb.box('wooddark', -0.03, -H / 2 - 0.03, -0.03, 0.03, H / 2 + 0.01, 0.03, { ao: false, room });
        wb.pop();
      }
      wb.box('wooddark', -0.36, H - 0.07, zz - 0.045, 0.36, H, zz + 0.045, { ao: false, room, faces: 'tnsewb' });
    }
    // los varales y las tablas
    for (const sx of [-0.27, 0.27]) wb.box('wooddark', sx - 0.032, H, -1.14, sx + 0.032, H + 0.065, 1.14, { ao: false, room });
    wb.box('planks', -0.24, H + 0.025, -0.93, 0.24, H + 0.07, 0.93, { ao: false, room, faces: 'tnsew', tint: [0.7, 0.62, 0.54] });
    // un paño negro por los pies (los ricos lo tenían de terciopelo)
    if (o.cloth) wb.box('clothDark', -0.3, H - 0.32, 0.55, 0.3, H + 0.072, 0.98, { ao: false, room, faces: 'tnsew', tint: [0.5, 0.48, 0.5] });
  });
  P.colOBB(ctx, x, z, 0.34, 1.16, rot, 0, BIER_H + 0.1);
  if (o.body) bakeShrouded(ctx.wb, x, BIER_H, z, rot, { room, ...o.body });
}

// Una vela de muerto en su palmatoria (encendida o ya consumida).
function deathCandle(ctx, x, y, z, room, lit, h = 0.32) {
  const wb = ctx.wb;
  wb.cylinder('iron', x, y, z, 0.07, 0.08, 0.025, 7, { ao: false, capTop: true, room });
  wb.cylinder('candle', x, y + 0.025, z, 0.028, 0.03, h, 6, { ao: false, capTop: true, grime: false, room });
  // la cera chorreada
  wb.cylinder('candle', x + 0.02, y + 0.025, z - 0.01, 0.02, 0.03, h * 0.35, 5, { ao: false, grime: false, room });
  if (lit && ctx.fires) ctx.fires.push({ x, y: y + 0.025 + h, z, s: 0.1, light: false, embers: false, glow: true });
}

// Celosía de listones en un hueco del muro (axis: el del muro; a: el centro
// a lo largo; t: el plano medio del muro).
function lattice(ctx, axis, a, t, w, y0, y1, room) {
  const wb = ctx.wb;
  const n = Math.max(3, Math.round(w / 0.13));
  for (let i = 1; i < n; i++) {
    const u = a - w / 2 + (i * w) / n;
    if (axis === 'x') wb.box('wooddark', u - 0.018, y0, t - 0.03, u + 0.018, y1, t + 0.03, { ao: false, room });
    else wb.box('wooddark', t - 0.03, y0, u - 0.018, t + 0.03, y1, u + 0.018, { ao: false, room });
  }
  for (const y of [y0 + (y1 - y0) * 0.33, y0 + (y1 - y0) * 0.66]) {
    if (axis === 'x') wb.box('wooddark', a - w / 2, y - 0.015, t - 0.02, a + w / 2, y + 0.015, t + 0.02, { ao: false, room });
    else wb.box('wooddark', t - 0.02, y - 0.015, a - w / 2, t + 0.02, y + 0.015, a + w / 2, { ao: false, room });
  }
}

// Una piel colgada (o tendida) a secar: lámina de cuero con su forma de
// animal (el cuello y las cuatro patas), por las dos caras.
function hide(ctx, x, y, z, rot, w, h, seed, room, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const t = o.tint ?? rng.pick([
    [0.82, 0.66, 0.52],
    [0.7, 0.55, 0.44],
    [0.9, 0.78, 0.66],
    [0.6, 0.46, 0.36],
  ]);
  wb.at(x, y, z, rot, () => {
    wb.push();
    wb.rotateZ(rng.range(-0.05, 0.05));
    wb.rotateX(o.tiltX ?? rng.range(-0.06, 0.06));
    const mat = o.mat ?? (rng.chance(0.75) ? 'leather' : 'hide');
    wb.box(mat, -w / 2, -h, -0.006, w / 2, 0, 0.006, { ao: false, room, faces: 'nsb', tint: t });
    // las patas (abajo y a los lados) y el cuello
    for (const s of [-1, 1]) {
      wb.box(mat, s * w * 0.5 - 0.07, -h * 0.98, -0.005, s * w * 0.5 + 0.07, -h * 0.8, 0.005, { ao: false, room, faces: 'nsb', tint: t });
      wb.box(mat, s * w * 0.52 - 0.06, -h * 0.28, -0.005, s * w * 0.52 + 0.06, -h * 0.12, 0.005, { ao: false, room, faces: 'ns', tint: t });
    }
    wb.box(mat, -w * 0.14, -h - 0.16, -0.005, w * 0.14, -h + 0.02, 0.005, { ao: false, room, faces: 'nsb', tint: t });
    wb.pop();
  });
}

// La cuba de cal del pellejero (y del curtidor): de madera, con sus aros, y
// el agua de cal, blanca y espesa.
function limeVat(ctx, x, z, r, room) {
  const wb = ctx.wb;
  wb.cylinder('planks', x, 0, z, r, r * 0.92, 0.85, 12, { ao: false, room, tint: [0.62, 0.56, 0.5] });
  for (const y of [0.12, 0.62]) wb.cylinder('iron', x, y, z, r * 1.01, r * 1.0, 0.06, 12, { ao: false, room });
  wb.cylinder('plaster', x, 0.7, z, r * 0.95, r * 0.95, 0.01, 12, { ao: false, capTop: true, room, tint: [0.95, 0.94, 0.88], grime: false });
  // una piel medio hundida en la cal
  wb.push();
  wb.translate(x + r * 0.2, 0.71, z - r * 0.1);
  wb.rotateY(0.7);
  wb.box('hide', -0.3, 0, -0.2, 0.3, 0.012, 0.25, { ao: false, room, tint: [0.92, 0.88, 0.8] });
  wb.pop();
  ctx.col.add(x - r, 0, z - r, x + r, 0.86, z + r);
}

// El potro de descarnar: un tronco descortezado inclinado sobre dos patas,
// con una piel echada encima y la cuchilla de dos mangos.
function fleshingBeam(ctx, x, z, rot, room) {
  const wb = ctx.wb;
  wb.at(x, 0, z, rot, () => {
    wb.push();
    wb.translate(0, 0.52, 0);
    wb.rotateZ(-0.38);
    wb.cylinder('wooddark', 0, -0.95, 0, 0.16, 0.18, 1.9, 8, { ao: false, room, capTop: true, tint: [0.78, 0.7, 0.6] });
    wb.pop();
    for (const s of [-1, 1]) {
      wb.push();
      wb.translate(0.42, 0.36, s * 0.16);
      wb.rotateX(s * 0.25);
      wb.box('wooddark', -0.035, -0.4, -0.035, 0.035, 0.4, 0.035, { ao: false, room });
      wb.pop();
    }
    // la piel, echada sobre el tronco
    wb.push();
    wb.translate(0.15, 0.6, 0);
    wb.rotateZ(-0.38);
    wb.box('hide', -0.55, 0.12, -0.32, 0.45, 0.14, 0.32, { ao: false, room, tint: [0.8, 0.66, 0.54] });
    for (const s of [-1, 1]) wb.box('hide', -0.5, -0.3, s * 0.32 - 0.006, 0.4, 0.13, s * 0.32 + 0.006, { ao: false, room, tint: [0.76, 0.62, 0.5] });
    wb.pop();
    // la cuchilla de descarnar, de dos mangos, encima
    wb.push();
    wb.translate(-0.2, 0.92, 0);
    wb.rotateZ(-0.38);
    wb.box('iron', -0.04, 0, -0.26, 0.04, 0.012, 0.26, { ao: false, room });
    for (const s of [-1, 1]) wb.cylinder('wooddark', 0, 0.01, s * 0.33, 0.02, 0.02, 0.14, 5, { ao: false, room });
    wb.pop();
  });
  P.colOBB(ctx, x, z, 0.85, 0.3, rot, 0, 0.9);
}

// Un bastidor de pellejero contra un muro, con la piel tensada con cordeles.
function stretchFrame(ctx, x, z, rot, w, h, seed, room) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  wb.at(x, 0, z, rot, () => {
    for (const s of [-1, 1]) wb.box('wooddark', s * w * 0.5 - 0.04, 0, -0.04, s * w * 0.5 + 0.04, h, 0.04, { ao: false, room });
    for (const y of [0.25, h - 0.08]) wb.box('wooddark', -w / 2, y, -0.035, w / 2, y + 0.07, 0.035, { ao: false, room });
    const t = rng.pick([
      [0.84, 0.72, 0.58],
      [0.74, 0.6, 0.48],
      [0.9, 0.8, 0.68],
    ]);
    wb.box('hide', -w * 0.38, 0.45, -0.005, w * 0.38, h - 0.25, 0.005, { ao: false, room, faces: 'ns', tint: t });
    // los cordeles que la tensan
    for (let i = 0; i < 5; i++) {
      const y = 0.55 + (i * (h - 0.9)) / 4;
      for (const s of [-1, 1]) wb.box('rope', s * w * 0.38, y - 0.006, -0.006, s * (w * 0.5 - 0.04), y + 0.006, 0.006, { ao: false, room });
    }
  });
  P.colOBB(ctx, x, z, w / 2 + 0.05, 0.08, rot, 0, h);
}

// Los bordes de un boquete abierto a golpes en una medianera: piedras
// rotas que asoman de las jambas y del dintel por las dos caras, y el hueco
// algo más estrecho arriba. axis: el del muro; a: el centro del hueco a lo
// largo; t0, t1: las caras; (rooms: la de cada cara).
function raggedHole(ctx, axis, a, t0, t1, w, y0, h, seed, room0, room1) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  for (const [t, dir, room] of [
    [t0, -1, room0],
    [t1, 1, room1],
  ])
    for (let i = 0; i < 9; i++) {
      // a los lados (de abajo arriba) y por el dintel
      const side = i < 6 ? (i % 2 ? 1 : -1) : 0;
      const u = side ? a + side * (w / 2 + rng.range(-0.06, 0.04)) : a + rng.range(-w / 2, w / 2);
      const y = side ? y0 + rng.range(0.2, h - 0.1) : y0 + h + rng.range(-0.06, 0.02);
      const s = rng.range(0.1, 0.2);
      wb.push();
      if (axis === 'z') wb.translate(t + dir * s * 0.25, y, u);
      else wb.translate(u, y, t + dir * s * 0.25);
      wb.rotateY(rng.range(0, 3));
      wb.rotateX(rng.range(-0.5, 0.5));
      wb.box(rng.chance(0.6) ? 'wallstone' : 'plaster', -s / 2, -s * 0.4, -s / 2, s / 2, s * 0.4, s / 2, { ao: false, room, tint: [0.72, 0.68, 0.62] });
      wb.pop();
    }
}

// ======================================================================== 1. EL VELATORIO
function buildVelatorio(ctx, S, L) {
  const wb = ctx.wb;
  const R = TJ.vel,
    D = R.door,
    H = TJ.hole1;
  const I = inner(R);
  const room = 'velatorio';
  const tint = [1.0, 0.95, 0.86];
  ctx.houseRects.push({ x0: R.x0, z0: R.z0, x1: R.x1, z1: R.z1, front: 'w', jetty: 0, hollow: true, h: R.h, style: 'plaster' });
  // ---- los muros de la planta baja: la fachada de la plaza (con la puerta)
  // y las medianeras (la del pellejero, con el boquete, de la cara de una
  // casa a la de la otra)
  holedWall(ctx, { axis: 'z', a0: R.z0, a1: R.z1, t0: R.x0, t1: I.x0, y0: 0, y1: G1, out: 'w', room, mat: 'wallstone', matIn: 'plaster', tintIn: LIME, holes: [{ a0: D.z - D.w / 2, a1: D.z + D.w / 2, y0: 0, y1: D.h }] });
  holedWall(ctx, { axis: 'x', a0: R.x0, a1: R.x1, t0: R.z0, t1: I.z0, y0: 0, y1: G1, out: 'n', outer: false, room, mat: 'plaster', tint: LIME });
  holedWall(ctx, { axis: 'x', a0: R.x0, a1: R.x1, t0: I.z1, t1: R.z1, y0: 0, y1: G1, out: 's', outer: false, room, mat: 'plaster', tint: LIME });
  holedWall(ctx, { axis: 'z', a0: R.z0, a1: R.z1, t0: I.x1, t1: R.x1 + T, y0: 0, y1: G1, out: 'e', outRoom: 'pellejero', room, mat: 'plaster', tint: SOOTED, matIn: 'plaster', tintIn: LIME, holes: [{ a0: H.z - H.w / 2, a1: H.z + H.w / 2, y0: 0, y1: H.h }] });
  // el suelo, de losas, y el techo con sus vigas (arriba no se sube)
  wb.box('flag', I.x0, -0.05, I.z0, I.x1, 0.015, I.z1, { faces: 't', ao: false, room, uv: 0.8, tint: [0.6, 0.57, 0.53] });
  ceiling(ctx, I, G1, R.h, 'z', [15.2, 16.75, 18.3, 19.85, 21.4, 22.95], room);
  // umbral
  wb.box('ashlar', R.x0 - 0.12, 0, D.z - D.w / 2, I.x0 + 0.02, 0.035, D.z + D.w / 2, { ao: false, faces: 'tnsew' });

  // ---- por fuera: la planta alta encalada con su entramado, el hastial a
  // la plaza y el tejado
  wb.box('plaster', R.x0, G1, R.z0, R.x1, R.h, R.z1, { faces: 'wes', room: 'out', tint, sub: 1.6, ao: false });
  wb.box('timber', R.x0 - 0.06, G1 - 0.04, R.z0, R.x0, G1 + 0.2, R.z1, { ao: false, faces: 'tnsewb', sub: 3 });
  solidGableRoof(ctx, R.x0, R.z0, R.x1, R.z1, R.h, R.ridge, 'x', { overhang: 0.45, gableOverhang: 0.35, thick: 0.18, wallT: 0.3, wallMat: 'plaster', wallTint: tint });
  const rng = new RNG(8051);
  wb.at(R.x0, 0, R.z0, -Math.PI / 2, () => {
    const at = D.z - R.z0;
    doorAt(ctx, at, D.w, D.h, { frameOnly: true });
    // el zócalo (a los lados de la puerta; junto a las casas vecinas, 7 cm
    // más corto)
    wb.box('wallstone', 0.07, 0, 0, at - 0.8, 0.65, 0.07, { sub: 2, aoH: 0.6, faces: 'tsw' });
    wb.box('wallstone', at + 0.8, 0, 0, R.z1 - R.z0 - 0.07, 0.65, 0.07, { sub: 2, aoH: 0.6, faces: 'tse' });
    timberFrame(ctx, R.z1 - R.z0, G1, R.h, [1.9, 6.1], [1, -1, 0, 1, 0, -1]);
    // la ventana de arriba de la izquierda, cerrada; la otra, con el paño
    // negro del luto colgado del alféizar
    for (const a of [1.9, 6.1]) windowAt2(ctx, a, G1 + 0.9, 0.7, 1.05, a < 4);
    // el crespón: un paño negro colgado del dintel en guirnalda, con su nudo
    // en medio y las dos puntas
    const sw = (u) => D.h + 0.33 - 0.2 * (1 - ((u - at) / 0.62) ** 2);
    for (let i = 0; i < 8; i++) {
      const u0 = at - 0.62 + i * 0.155,
        u1 = u0 + 0.155;
      const y0 = sw(u0),
        y1 = sw(u1);
      wb.push();
      wb.translate((u0 + u1) / 2, (y0 + y1) / 2, 0.2);
      wb.rotateZ(Math.atan2(y1 - y0, u1 - u0));
      wb.box('clothDark', -0.085, -0.1, -0.012, 0.085, 0.04, 0.012, { ao: false, tint: [0.42, 0.4, 0.44] });
      wb.pop();
    }
    wb.box('clothDark', at - 0.06, D.h + 0.05, 0.2, at + 0.06, D.h + 0.17, 0.235, { ao: false, tint: [0.36, 0.34, 0.38] });
    for (const s of [-1, 1]) {
      wb.push();
      wb.translate(at + s * 0.05, D.h + 0.08, 0.215);
      wb.rotateZ(s * 0.18);
      wb.box('clothDark', -0.04, -0.42, -0.008, 0.04, 0, 0.008, { ao: false, tint: [0.38, 0.36, 0.4] });
      wb.pop();
    }
  });
  // las ventanas de abajo, cerradas, con su reja
  for (const z of [43.55, 48.45]) {
    frame(ctx, 'w', R.x0, z, 0.62, 1.05, 1.9, T, { room, mat: 'ashlar', sillMat: 'ashlar' });
    closedWindow(ctx, 'w', R.x0, z, 0.62, 1.05, 1.9, T, room);
    for (let k = -1; k <= 1; k++) wb.box('iron', R.x0 - 0.1, 1.05, z + k * 0.18 - 0.016, R.x0 - 0.07, 1.9, z + k * 0.18 + 0.016, { ao: false });
  }
  // el ramo de romero clavado en el marco y, en el umbral, cabos de vela y
  // flores secas que ha dejado la gente
  herbBunch(ctx, R.x0 - 0.2, 2.62, D.z - D.w / 2 - 0.42, 805, 'out', 0.22);
  P.candles(ctx, R.x0 - 0.55, 0, D.z + 0.95, 4, 806, { unlit: true, spread: 0.18, scale: 0.7 });
  P.candles(ctx, R.x0 - 0.5, 0, D.z - 1.05, 3, 807, { unlit: true, spread: 0.15, scale: 0.6 });
  for (let k = 0; k < 3; k++) {
    wb.push();
    wb.translate(R.x0 - 0.42 - k * 0.07, 0.03, D.z + 1.25 + k * 0.1);
    wb.rotateY(0.4 + k * 0.6);
    wb.box('straw', -0.18, 0, -0.012, 0.18, 0.02, 0.012, { ao: false, tint: [0.5, 0.42, 0.3] });
    wb.box('leaves', 0.12, 0, -0.04, 0.22, 0.03, 0.04, { ao: false, tint: [0.4, 0.3, 0.28] });
    wb.pop();
  }
  L.interact.push({
    kind: 'door',
    id: 'd_velatorio',
    x: R.x0 + T / 2,
    y: 0,
    z: D.z,
    w: D.w,
    h: D.h,
    axis: 'z',
    lock: { type: 'boards', inner: true, msg: 'velatorioOpen', shut: 'velatorioShut' },
    mat: 'planks',
    mark: 'cross',
    hinge: -1,
    swing: 1,
    inset: 0.08,
  });

  // ---- dentro: los muertos en sus andas, en dos filas, con los pies hacia el
  // pasillo; velas a la cabecera, casi todas consumidas
  wb.setRoom(room);
  const rows = [
    // [x, z, rot, qué hay encima]
    [16.6, 43.75, 0, { seed: 1 }],
    [19.0, 43.75, 0, null], // (el Amortajado de las andas: entities/amortajado.js)
    [21.4, 43.75, 0.04, 'empty'],
    [16.6, 48.25, Math.PI, { scale: 0.62 }],
    [19.0, 48.25, Math.PI - 0.05, { seed: 2 }],
    [21.4, 48.25, Math.PI, { seed: 3, head: [0, 0, 18] }],
  ];
  rows.forEach(([x, z, rot, what], i) => {
    if (what && what.scale) {
      // el pequeño: en unas andas cortas, sobre una mesa
      P.table(ctx, x, 0, z, 0.8, 1.5, 0);
      bakeShrouded(wb, x, 0.8, z, rot, { room, scale: what.scale });
    } else bier(ctx, x, z, rot, room, { body: what && what !== 'empty' ? what : null, cloth: i % 2 === 0 });
    // las velas, a la cabecera
    const hx = -Math.sin(rot),
      hz = -Math.cos(rot);
    for (const s of [-1, 1]) deathCandle(ctx, x + hx * 1.25 + Math.cos(rot) * s * 0.42, 0, z + hz * 1.25 - Math.sin(rot) * s * 0.42, room, i === 1 && s > 0, 0.12 + (((i * 7 + s * 3) % 5) + 5) % 5 * 0.03);
  });
  // el que se levanta (al arrancar la puerta lo oye): entities/amortajado.js
  L.enemies.push({ type: 'amortajado', x: 19.0, y: BIER_H, z: 43.75, yaw: 0, idle: 'bier', id: 'e_amort_velatorio' });
  // las andas vacías: la mortaja rajada de arriba abajo y los cordeles, por
  // el suelo
  {
    const [x, z] = [21.4, 43.75];
    wb.push();
    wb.translate(x, BIER_H, z);
    wb.rotateY(0.04);
    for (const s of [-1, 1]) {
      wb.push();
      wb.translate(s * 0.14, 0.02, 0.05);
      wb.rotateZ(s * 0.5);
      wb.box('shroud', -0.12, 0, -0.85, 0.12, 0.012, 0.8, { ao: false, room, tint: [0.92, 0.88, 0.8] });
      wb.pop();
    }
    wb.pop();
    for (const [dx, dz, r] of [
      [0.5, 0.6, 0.4],
      [-0.4, 1.3, 1.9],
      [0.75, -0.2, 2.6],
    ]) {
      wb.push();
      wb.translate(x + dx, 0.012, z + dz);
      wb.rotateY(r);
      wb.box('rope', -0.25, 0, -0.012, 0.25, 0.02, 0.012, { ao: false, room });
      wb.pop();
    }
    P.decal(ctx, x + 0.3, 0.02, z + 1.4, 0.9, 'splat', 0.3);
  }
  // una vela grande encendida en medio del pasillo, en su candelero de pie
  P.candelabra(ctx, 18.0, 0, 46.0, { room });
  // el altar de la casa, en el muro del fondo: el crucifijo, el santo, las
  // velas y la jarra de agua bendita
  {
    const x = I.x1 - 0.32,
      z = 44.35;
    P.table(ctx, x, 0, z, 1.3, 0.55, Math.PI / 2);
    wb.box('clothWhite', x - 0.29, 0.8, z - 0.66, x + 0.29, 0.81, z + 0.66, { ao: false, faces: 'tnsew', tint: [0.86, 0.84, 0.78] });
    wb.box('wooddark', I.x1 - 0.04, 1.35, z - 0.035, I.x1, 2.35, z + 0.035, { ao: false });
    wb.box('wooddark', I.x1 - 0.04, 1.98, z - 0.28, I.x1, 2.05, z + 0.28, { ao: false });
    wb.box('skinPale', I.x1 - 0.07, 1.52, z - 0.05, I.x1 - 0.04, 1.98, z + 0.05, { ao: false, tint: [0.85, 0.8, 0.72] });
    saint(ctx, 'w', I.x1, 0.82, z + 0.48, room, 81, 'clothRed');
    P.candles(ctx, x - 0.05, 0.81, z - 0.3, 4, 811, { room, radius: 4.8, intensity: 0.9, spread: 0.14 });
    P.jar(ctx, x + 0.08, 0.81, z + 0.15, 0.45);
  }
  // la mesa de amortajar: los rollos de lienzo, el ovillo de hilo, las
  // tijeras, los cordeles; el cubo con los paños de lavar a los muertos
  {
    const x = 23.05,
      z = 48.55;
    P.table(ctx, x, 0, z, 1.5, 0.8, Math.PI / 2 + 0.03);
    for (let k = 0; k < 3; k++) {
      wb.push();
      wb.translate(x - 0.12 + k * 0.03, 0.88 + (k > 1 ? 0.16 : 0), z - 0.5 + (k % 2) * 0.17);
      wb.rotateZ(Math.PI / 2);
      wb.cylinder('linen', 0, -0.31, 0, 0.08, 0.08, 0.62, 8, { ao: false, capTop: true, capBot: true, room, tint: [0.9, 0.88, 0.8] });
      wb.pop();
    }
    wb.cylinder('linen', x + 0.15, 0.8, z + 0.22, 0.05, 0.05, 0.09, 7, { ao: false, capTop: true, room, tint: [0.3, 0.28, 0.26] });
    wb.box('iron', x + 0.1, 0.8, z + 0.4, x + 0.13, 0.81, z + 0.56, { ao: false, room });
    for (let k = 0; k < 4; k++) wb.box('rope', x - 0.2 + k * 0.06, 0.8, z + 0.05, x - 0.17 + k * 0.06, 0.815, z + 0.4, { ao: false, room });
    P.stool(ctx, x - 0.8, 0, z + 0.55, { room });
    const [bx, bz] = [22.2, 49.25];
    wb.cylinder('planks', bx, 0, bz, 0.24, 0.2, 0.36, 9, { ao: false, room, tint: [0.6, 0.55, 0.5] });
    wb.cylinder('water', bx, 0.3, bz, 0.21, 0.21, 0.01, 9, { ao: false, capTop: true, room, grime: false, tint: [0.42, 0.34, 0.3] });
    wb.box('clothWhite', bx - 0.1, 0.3, bz - 0.1, bx + 0.25, 0.42, bz + 0.05, { ao: false, room, tint: [0.8, 0.74, 0.68] });
    ctx.col.add(bx - 0.25, 0, bz - 0.25, bx + 0.25, 0.36, bz + 0.25);
  }
  // el espejo tapado con un paño (por el muerto) y el arca
  wb.box('clothDark', I.x0 + 0.002, 1.3, 44.2, I.x0 + 0.03, 2.1, 44.85, { ao: false, room, tint: [0.34, 0.32, 0.36] });
  chest(ctx, I.x0 + 0.32, 0, 49.0, Math.PI / 2, room);
  // lo que cayó al reventar el boquete (desde este lado: los cascotes,
  // casi todos, al otro)
  P.rubble(ctx, I.x1 - 0.45, 0, H.z, 5, 8091, 0.45, { scale: 0.55 });
  P.decal(ctx, I.x1 - 0.7, 0.02, H.z + 0.2, 1.3, 'shadow', 0, { opacity: 0.5 });
  // la luz: las velas de las andas, el candelero y el altar
  ctx.lights.push(
    { x: 19.6, y: 1.1, z: 44.9, r: 1, g: 0.56, b: 0.24, radius: 3.2, intensity: 0.5, room },
    { x: 15.6, y: 1.2, z: 48.0, r: 0.6, g: 0.62, b: 0.75, radius: 3.5, intensity: 0.25, room }
  );
  wb.setRoom(null);
  // la lista de los muertos, escrita con carbón en el muro junto a la puerta
  L.interact.push({ kind: 'note', id: 'n_velatorio', note: 'velatorio', x: I.x0 + 0.05, y: 1.5, z: 47.6, model: 'wall' });
  // transitable
  S.paint(R.x0 + 0.01, R.z0 + 0.01, R.x1 - 0.01, R.z1 - 0.01, 1);
  S.paint(R.x0 - 0.8, D.z - D.w / 2, R.x0 + 0.5, D.z + D.w / 2, 1);
}

// Ventana de la planta alta (en el marco de una fachada): cerrada, o con el
// paño negro del luto colgando del alféizar.
function windowAt2(ctx, a, y, w, h, crape) {
  const wb = ctx.wb;
  wb.box('black', a - w / 2, y, 0, a + w / 2, y + h, 0.03, { ao: false, grime: false, faces: 's' });
  wb.box('timber', a - w / 2 - 0.1, y - 0.12, 0, a + w / 2 + 0.1, y, 0.12, { ao: false, sub: 3 });
  wb.box('timber', a - w / 2 - 0.1, y + h, 0, a + w / 2 + 0.1, y + h + 0.1, 0.1, { ao: false, sub: 3, faces: 'tsewb' });
  wb.box('timber', a - w / 2 - 0.1, y, 0, a - w / 2, y + h, 0.08, { ao: false, sub: 3 });
  wb.box('timber', a + w / 2, y, 0, a + w / 2 + 0.1, y + h, 0.08, { ao: false, sub: 3 });
  wb.box('planks', a - w / 2, y, 0.02, a + w / 2, y + h, 0.075, { ao: false, sub: 3, tint: [0.72, 0.64, 0.56] });
  if (crape) wb.box('clothDark', a - w / 2 + 0.05, y - 0.62, 0.12, a + w / 2 - 0.05, y + 0.02, 0.15, { ao: false, tint: [0.38, 0.36, 0.4] });
}

// ======================================================================== 2. EL PELLEJERO
function buildPellejero(ctx, S, L) {
  const wb = ctx.wb;
  const R = TJ.pel,
    H2 = TJ.hole2;
  const I = inner(R);
  const room = 'pellejero',
    up = 'pellejeroAlta';
  ctx.houseRects.push({ x0: R.x0, z0: R.z0, x1: R.x1, z1: R.z1, front: 's', jetty: 0, hollow: true, h: R.h, style: 'plaster' });
  // ---- la planta baja (la medianera del velatorio, con el boquete, ya está)
  holedWall(ctx, { axis: 'x', a0: R.x0, a1: R.x1, t0: R.z0, t1: I.z0, y0: 0, y1: G1, out: 'n', outer: false, room, mat: 'plaster', tint: SOOTED });
  holedWall(ctx, { axis: 'x', a0: R.x0, a1: R.x1, t0: I.z1, t1: R.z1, y0: 0, y1: G1, out: 's', outer: false, room, mat: 'plaster', tint: SOOTED });
  holedWall(ctx, { axis: 'z', a0: R.z0, a1: R.z1, t0: I.x1, t1: R.x1, y0: 0, y1: G1, out: 'e', outer: false, room, mat: 'plaster', tint: SOOTED });
  wb.box('dirt', I.x0, -0.05, I.z0, I.x1, 0.015, I.z1, { faces: 't', ao: false, room, tint: [0.52, 0.46, 0.4] });
  // ---- el sobrado: los muros (el del este, la medianera de los vecinos, con
  // el boquete de arriba) y el techo
  holedWall(ctx, { axis: 'x', a0: R.x0, a1: R.x1, t0: R.z0, t1: I.z0, y0: G1, y1: C1, floorY: F1, out: 'n', outer: false, room: up, mat: 'plaster', tint: LIME });
  holedWall(ctx, { axis: 'x', a0: R.x0, a1: R.x1, t0: I.z1, t1: R.z1, y0: G1, y1: C1, floorY: F1, out: 's', outer: false, room: up, mat: 'plaster', tint: LIME });
  holedWall(ctx, { axis: 'z', a0: R.z0, a1: R.z1, t0: R.x0, t1: I.x0, y0: G1, y1: C1, floorY: F1, out: 'w', outer: false, room: up, mat: 'plaster', tint: LIME });
  holedWall(ctx, { axis: 'z', a0: R.z0, a1: R.z1, t0: I.x1, t1: R.x1 + T, y0: G1, y1: C1, floorY: F1, out: 'e', outRoom: 'vecinos', room: up, mat: 'plaster', tint: [0.8, 0.76, 0.68], matIn: 'plaster', tintIn: LIME, holes: [{ a0: H2.z - H2.w / 2, a1: H2.z + H2.w / 2, y0: F1, y1: F1 + H2.h }] });
  ceiling(ctx, I, C1, R.h, 'z', [25.3, 26.95, 28.6, 30.25, 31.9, 33.55, 35.0], up);
  // por fuera, lo que asoma sobre la casa quemada del sur, y el tejado (sin
  // vuelo por el oeste: ahí empieza el hastial del velatorio)
  wb.box('plaster', R.x0, G1, R.z0, R.x1, R.h, R.z1, { faces: 's', room: 'out', tint: [0.9, 0.84, 0.74], sub: 1.6, ao: false });
  solidGableRoof(ctx, R.x0, R.z0, R.x1, R.z1, R.h, R.ridge, 'x', { overhang: 0.4, gableOverhang: 0.3, open: [true, true], thick: 0.18, wallT: T, gables: [false, false] });
  // ---- el forjado con el hueco de la escalera (sube hacia el este pegada al
  // muro del sur; el hueco llega más allá del peldaño donde la cabeza ya pasa
  // del forjado: al bajar, el cuerpo va por delante de los pies)
  const ST = { x: 26.0, z: 49.05, w: 1.0, n: 12, run: 0.3 };
  const hole = [26.55, 48.5, ST.x + ST.n * ST.run + 0.05, I.z1];
  slab(ctx, I, F1, [hole], up, room);
  joists(ctx, I, G1, 'z', [25.25, 26.9, 28.55, 30.2, 31.85, 33.5, 35.0], [hole], room);
  wb.setRoom(room);
  woodStair(ctx, { x: ST.x, z: ST.z, dir: 'e', w: ST.w, n: ST.n, rise: F1 / ST.n, run: ST.run, room, open: 'n', railTo: 9 });
  wb.setRoom(up);
  railing(ctx, hole[0], hole[1] - 0.05, hole[2] - 0.55, hole[1] - 0.05, F1, up);
  railing(ctx, hole[0] - 0.05, hole[1] - 0.05, hole[0] - 0.05, I.z1, F1, up);

  // ---- el taller
  wb.setRoom(room);
  // los cascotes del boquete (lo rompieron desde el velatorio: caen aquí)
  P.rubble(ctx, I.x0 + 0.75, 0, TJ.hole1.z, 16, 8092, 0.9, { scale: 0.55 });
  P.rubble(ctx, I.x0 + 1.2, 0, TJ.hole1.z - 0.4, 6, 8093, 0.5, { scale: 0.75, mat: 'plaster' });
  raggedHole(ctx, 'z', TJ.hole1.z, TJ.vel.x1 - T, TJ.vel.x1 + T, TJ.hole1.w, 0, TJ.hole1.h, 8094, 'velatorio', room);
  P.decal(ctx, I.x0 + 1.0, 0.02, TJ.hole1.z, 2.0, 'shadow', 0, { opacity: 0.55 });
  P.beam(ctx, I.x0 + 0.4, TJ.hole1.z + 0.9, I.x0 + 2.2, TJ.hole1.z + 0.2, 0, 0.09);
  // la estantería que tapaba el boquete, volcada
  wb.push();
  wb.translate(I.x0 + 1.6, 0.21, 45.3);
  wb.rotateY(0.35);
  wb.box('wooddark', -0.9, -0.21, -0.2, 0.9, 0.21, 0.2, { ao: false, room, faces: 'tnsew' });
  for (const s of [-0.6, 0, 0.6]) wb.box('wooddark', s - 0.02, 0.21, -0.2, s + 0.02, 0.24, 0.2, { ao: false, room });
  wb.pop();
  P.colOBB(ctx, I.x0 + 1.6, 45.3, 0.9, 0.2, 0.35, 0, 0.45);
  for (const [x, z] of [
    [25.6, 44.4],
    [26.4, 44.9],
  ])
    P.jar(ctx, x, 0, z, 0.7, { broken: true });
  // el potro de descarnar, la cuba de cal, los bastidores, las pieles
  fleshingBeam(ctx, 31.2, 45.3, 0.2, room);
  limeVat(ctx, 34.4, 43.55, 0.6, room);
  limeVat(ctx, 34.75, 45.0, 0.45, room);
  stretchFrame(ctx, 28.4, I.z0 + 0.12, 0, 1.5, 2.1, 8094, room);
  stretchFrame(ctx, 30.2, I.z0 + 0.12, 0, 1.3, 1.9, 8095, room);
  // las pieles apiladas y las que cuelgan de las vigas
  for (let k = 0; k < 6; k++) {
    wb.push();
    wb.translate(34.6, 0.02 + k * 0.05, 48.4);
    wb.rotateY(0.3 + k * 0.4);
    wb.box(k % 2 ? 'leather' : 'hide', -0.55, 0, -0.42, 0.55, 0.05, 0.42, { ao: false, room, tint: k % 2 ? [0.7, 0.56, 0.44] : [0.86, 0.74, 0.62] });
    wb.pop();
  }
  ctx.col.add(33.95, 0, 47.85, 35.25, 0.32, 48.95);
  for (const [x, z, s] of [
    [28.55, 46.4, 1],
    [30.2, 46.9, 2],
    [32.9, 47.2, 3],
    [33.5, 46.2, 4],
  ])
    hide(ctx, x, G1 - 0.22, z, Math.PI / 2 + 0.08 * (s - 2.5), 0.8, 1.05, 8100 + s, room);
  // (entre las pieles colgadas, de pie, uno más: el de las andas vacías del
  // velatorio, que se vino por el boquete y se quedó aquí, escuchando)
  L.enemies.push({ type: 'amortajado', x: 31.55, y: 0, z: 46.75, yaw: -1.25, idle: 'listen', id: 'e_amort_pellejero' });
  // el banco con las cuchillas, los raspadores y la piedra de asentar
  P.table(ctx, 32.6, 0, I.z0 + 0.42, 1.8, 0.7, 0);
  for (let k = 0; k < 4; k++) wb.box('iron', 32.0 + k * 0.32, 0.8, I.z0 + 0.3, 32.06 + k * 0.32, 0.812, I.z0 + 0.55, { ao: false, room });
  wb.box('wallstone', 33.3, 0.8, I.z0 + 0.35, 33.55, 0.86, I.z0 + 0.45, { ao: false, room, tint: [0.6, 0.6, 0.62] });
  P.sacks(ctx, 26.0, 0, I.z0 + 0.5, 3, 8096);
  P.barrel(ctx, 27.1, 0, I.z0 + 0.42);
  P.basket(ctx, 35.0, 0, 46.5, { rot: 0.7 });
  // un farol colgado de la viga, encendido (alguien bajó hace poco)
  P.hangingLamp(ctx, 29.4, G1 - 0.22, 45.6, { room, len: 0.55, radius: 7, intensity: 1.0, dyn: 1.2 });
  ctx.lights.push({ x: 33.6, y: 1.2, z: 44.6, r: 0.75, g: 0.82, b: 0.85, radius: 3.0, intensity: 0.3, room });

  // ---- el sobrado: la alcoba del pellejero; el armario con que tapaban el
  // boquete de los vecinos, tumbado
  wb.setRoom(up);
  P.bed(ctx, 25.6, F1, 43.6, Math.PI / 2);
  chest(ctx, 25.4, F1, 45.2, Math.PI / 2, up);
  P.stool(ctx, 27.0, F1, 43.2, { room: up });
  // la ropa en las perchas del muro
  for (const [z, t] of [
    [43.0, [0.5, 0.45, 0.4]],
    [43.6, [0.62, 0.32, 0.28]],
  ]) {
    wb.box('wooddark', I.x0 + 0.02, F1 + 1.72, z - 0.03, I.x0 + 0.14, F1 + 1.76, z + 0.03, { ao: false, room: up });
    wb.box('clothDark', I.x0 + 0.04, F1 + 0.95, z - 0.2, I.x0 + 0.1, F1 + 1.74, z + 0.2, { ao: false, room: up, tint: t });
  }
  saint(ctx, 'e', I.x0, F1 + 1.4, 44.4, up, 82, 'clothBlue');
  {
    // (el armario, de espaldas en el suelo, con las puertas abiertas)
    const x = 34.6,
      z = 44.6;
    wb.push();
    wb.translate(x, F1 + 0.3, z);
    wb.rotateY(-0.25);
    wb.box('wooddark', -0.55, -0.3, -1.0, 0.55, 0.3, 1.0, { ao: false, room: up, faces: 'tnsew' });
    wb.box('black', -0.45, 0.3, -0.9, 0.45, 0.302, 0.9, { ao: false, room: up, faces: 't', grime: false });
    wb.pop();
    P.colOBB(ctx, x, z, 0.55, 1.0, -0.25, F1, F1 + 0.6);
    for (const s of [-1, 1]) {
      wb.push();
      wb.translate(x + s * 0.7, F1 + 0.02, z + 0.2 * s);
      wb.rotateY(0.25 + s * 0.4);
      wb.box('planks', -0.25, 0, -0.45, 0.25, 0.03, 0.45, { ao: false, room: up, tint: [0.6, 0.52, 0.44] });
      wb.pop();
    }
  }
  P.candles(ctx, 25.4, F1 + 0.58, 45.1, 2, 8097, { room: up, radius: 5.5, intensity: 0.85, spread: 0.1 });
  ctx.lights.push({ x: 33.2, y: F1 + 1.4, z: 46.8, r: 0.9, g: 0.55, b: 0.3, radius: 4.0, intensity: 0.4, room: up });
  wb.setRoom(null);
  S.paint(R.x0 + 0.01, R.z0 + 0.01, R.x1 - 0.01, R.z1 - 0.01, 1);
}

// ======================================================================== 3. LOS VECINOS
// El sobrado donde se escondían y, encima, el desván alto de secar cueros
// (con celosías en los muros para que corra el aire). La planta baja no se
// pisa: subieron la escalera y taparon el hueco con muebles.
function buildVecinos(ctx, S, L) {
  const wb = ctx.wb;
  const R = TJ.vec,
    D = R.door;
  const I = inner(R);
  const room = 'vecinos',
    up = 'desvanCueros';
  ctx.houseRects.push({ x0: R.x0, z0: R.z0, x1: R.x1, z1: R.z1, front: 'e', jetty: 0, hollow: true, h: R.h, style: 'plaster' });
  // la planta baja, maciza (no se entra), y el sobrado: sus muros y su suelo
  ctx.col.add(R.x0, 0, R.z0, R.x1, G1, R.z1);
  holedWall(ctx, { axis: 'x', a0: R.x0, a1: R.x1, t0: R.z0, t1: I.z0, y0: G1, y1: C1, floorY: F1, out: 'n', outer: false, room, mat: 'plaster', tint: [0.78, 0.74, 0.66] });
  holedWall(ctx, { axis: 'x', a0: R.x0, a1: R.x1, t0: I.z1, t1: R.z1, y0: G1, y1: C1, floorY: F1, out: 's', outer: false, room, mat: 'plaster', tint: [0.78, 0.74, 0.66] });
  holedWall(ctx, { axis: 'z', a0: R.z0, a1: R.z1, t0: I.x1, t1: R.x1, y0: G1, y1: C1, floorY: F1, out: 'e', outer: false, room, mat: 'plaster', tint: [0.78, 0.74, 0.66] });
  slab(ctx, I, F1, [], room, null, { tint: [0.74, 0.68, 0.6] });
  // ---- el desván: los muros (con sus celosías; en el del este, la puerta
  // del secadero), el suelo y el tejado a la vista
  const latt = (a) => ({ a0: a - 0.45, a1: a + 0.45, y0: 7.15, y1: 7.75 });
  holedWall(ctx, { axis: 'x', a0: R.x0, a1: R.x1, t0: R.z0, t1: I.z0, y0: C1, y1: R.h, floorY: F2, out: 'n', room: up, mat: 'plaster', tint: [0.86, 0.8, 0.7], tintIn: [0.74, 0.68, 0.6], holes: [latt(39.4), latt(44.6)] });
  holedWall(ctx, { axis: 'x', a0: R.x0, a1: R.x1, t0: I.z1, t1: R.z1, y0: C1, y1: R.h, floorY: F2, out: 's', room: up, mat: 'plaster', tint: [0.86, 0.8, 0.7], tintIn: [0.74, 0.68, 0.6], holes: [latt(38.6), latt(42.0), latt(45.4)] });
  holedWall(ctx, { axis: 'z', a0: R.z0, a1: R.z1, t0: R.x0, t1: I.x0, y0: C1, y1: R.h, floorY: F2, out: 'w', room: up, mat: 'plaster', tint: [0.86, 0.8, 0.7], tintIn: [0.74, 0.68, 0.6] });
  holedWall(ctx, { axis: 'z', a0: R.z0, a1: R.z1, t0: I.x1, t1: R.x1, y0: C1, y1: R.h, floorY: F2, out: 'e', room: up, mat: 'plaster', tint: [0.86, 0.8, 0.7], tintIn: [0.74, 0.68, 0.6], holes: [{ a0: D.z - D.w / 2, a1: D.z + D.w / 2, y0: F2, y1: F2 + D.h }] });
  for (const a of [39.4, 44.6]) lattice(ctx, 'x', a, R.z0 + T / 2, 0.9, 7.15, 7.75, up);
  for (const a of [38.6, 42.0, 45.4]) lattice(ctx, 'x', a, R.z1 - T / 2, 0.9, 7.15, 7.75, up);
  for (const a of [39.4, 44.6]) frame(ctx, 'n', a, R.z0, 0.9, 7.15, 7.75, T, { room: up, innerSill: false });
  for (const a of [38.6, 42.0, 45.4]) frame(ctx, 's', a, R.z1, 0.9, 7.15, 7.75, T, { room: up, innerSill: false });
  // la escala del sobrado al desván: el hueco de su trampilla
  const ES = { x: 42.0, z: 48.75 };
  slab(ctx, I, F2, [], up, room, { tint: [0.78, 0.7, 0.6] });
  joists(ctx, I, C1, 'z', [37.3, 38.95, 40.6, 42.25, 43.9, 45.55, 47.2], [[ES.x - 0.66, ES.z - 0.66, ES.x + 0.66, ES.z + 0.66]], room);
  // el tejado, con la cara de abajo a la vista (y los hastiales por dentro)
  solidGableRoof(ctx, R.x0, R.z0, R.x1, R.z1, R.h, R.ridge, 'x', { overhang: 0.4, gableOverhang: 0.3, thick: 0.2, wallT: T, wallMat: 'plaster', wallTint: [0.86, 0.8, 0.7], room: up, underRoom: up, cam: false });
  roofTruss(ctx, R, up, 'x', [39.0, 42.0, 45.0]);
  // la puerta del secadero: el cerco y la hoja, abierta contra el muro; por
  // fuera, sobre ella, la garrucha para subir los cueros
  frame(ctx, 'e', R.x1, D.z, D.w, F2, F2 + D.h, T, { room: up, sill: false, innerSill: false });
  wb.box('ashlar', I.x1 - 0.02, F2 - 0.01, D.z - D.w / 2, R.x1 + 0.1, F2 + 0.03, D.z + D.w / 2, { ao: false, faces: 'tnsew' });
  wb.push();
  wb.translate(I.x1 - 0.05, F2, D.z + D.w / 2 - 0.04);
  wb.rotateY(-Math.PI / 2 - 1.42);
  wb.box('planks', 0, 0.02, -0.04, D.w - 0.08, D.h - 0.04, 0, { ao: false, room: up, tint: [0.7, 0.62, 0.54] });
  wb.pop();
  {
    // (a un lado de la puerta, que el cabo no cuelgue delante)
    const y = R.h - 0.2,
      hz = D.z - D.w / 2 - 0.45;
    wb.box('timber', R.x1 - 0.3, y - 0.12, hz - 0.09, R.x1 + 1.15, y + 0.08, hz + 0.09, { ao: false, faces: 'tnsewb' });
    strut(wb, V(R.x1 + 0.02, y - 0.9, hz), V(R.x1 + 0.8, y - 0.1, hz), 0.06);
    wb.cylinder('wooddark', R.x1 + 0.95, y - 0.32, hz, 0.12, 0.12, 0.05, 9, { ao: false, capTop: true, capBot: true });
    wb.box('iron', R.x1 + 0.93, y - 0.24, hz - 0.015, R.x1 + 0.97, y - 0.12, hz + 0.015, { ao: false });
    wb.box('rope', R.x1 + 1.06, F2 + 0.25, hz - 0.012, R.x1 + 1.084, y - 0.32, hz + 0.012, { ao: false });
    // (el gancho y una piel enganchada, a medio subir)
    wb.box('iron', R.x1 + 1.05, F2 + 0.15, hz - 0.02, R.x1 + 1.09, F2 + 0.26, hz + 0.02, { ao: false });
  }

  // ---- el sobrado de los vecinos: los jergones por el suelo, la mesa con
  // las escudillas, la olla fría en el brasero, la escalera de abajo tapada
  // con el arcón y la mesa, la cuna
  wb.setRoom(room);
  for (const [x, z, r, s] of [
    [37.4, 46.2, 0.05, 1],
    [37.5, 48.4, -0.08, 2],
    [44.6, 43.3, 1.52, 3],
    [46.6, 44.9, 1.62, 4],
    [44.9, 48.9, 1.5, 5],
  ])
    pallet(ctx, x, F1, z, r, 8200 + s, room);
  P.table(ctx, 40.6, F1, 45.4, 1.6, 0.8, 0.1);
  for (const [dx, dz] of [
    [-0.5, -0.15],
    [-0.1, 0.18],
    [0.35, -0.1],
    [0.6, 0.2],
  ])
    bowl(ctx, 40.6 + dx, F1 + 0.8, 45.4 + dz, 0.07, room, ['dirt', [0.4, 0.32, 0.24]]);
  P.stool(ctx, 39.6, F1, 44.7, { room });
  P.stool(ctx, 41.5, F1, 46.2, { room, tipped: true });
  coldBrazier(ctx, 42.6, F1, 44.0, room);
  // la escalera de abajo (en el rincón del noreste), tapada: el arcón y la
  // mesa encima de la trampilla, y sacos
  {
    const x = 46.5,
      z = 43.2;
    wb.box('wooddark', x - 0.7, F1, z - 0.62, x + 0.7, F1 + 0.01, z + 0.62, { ao: false, room, faces: 't', tint: [0.35, 0.3, 0.26] });
    chest(ctx, x, F1, z, 0.1, room, 1.3);
    wb.push();
    wb.translate(x - 0.1, F1 + 0.58, z + 0.1);
    wb.rotateZ(Math.PI);
    wb.rotateY(0.3);
    wb.box('wooddark', -0.8, -0.08, -0.45, 0.8, 0, 0.45, { ao: false, room, faces: 'tnsewb' });
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ])
      wb.box('wooddark', sx * 0.7 - 0.05, -0.8, sz * 0.35 - 0.05, sx * 0.7 + 0.05, 0, sz * 0.35 + 0.05, { ao: false, room });
    wb.pop();
    P.sacks(ctx, x - 0.6, F1, z + 0.9, 3, 8210);
    ctx.col.add(x - 0.85, F1, z - 0.7, x + 0.85, F1 + 1.5, z + 0.7);
  }
  // el abuelo, que se les murió aquí arriba: lo amortajaron y lo tendieron en
  // el suelo, sobre una sábana, con dos cabos de vela a la cabecera (se
  // levanta: entities/amortajado.js)
  {
    const x = 39.35,
      z = 43.2;
    wb.box('linen', x - 1.05, F1, z - 0.42, x + 1.0, F1 + 0.015, z + 0.4, { ao: false, room, faces: 'tnsew', tint: [0.8, 0.77, 0.7] });
    deathCandle(ctx, x + 1.2, F1, z - 0.3, room, false, 0.1);
    deathCandle(ctx, x + 1.25, F1, z + 0.28, room, false, 0.16);
    L.enemies.push({ type: 'amortajado', x, y: F1 + 0.015, z, yaw: -Math.PI / 2, idle: 'floor', id: 'e_amort_vecinos' });
  }
  // la cuna, vacía, y los juguetes: un caballo de madera, una muñeca de trapo
  cradleV(ctx, 40.4, F1, 49.05, 0.1, room);
  wb.push();
  wb.translate(41.3, F1 + 0.01, 48.7);
  wb.rotateY(-0.6);
  wb.box('wooddark', -0.14, 0.1, -0.04, 0.14, 0.2, 0.04, { ao: false, room, tint: [0.7, 0.58, 0.44] });
  wb.box('wooddark', 0.12, 0.18, -0.03, 0.2, 0.3, 0.03, { ao: false, room, tint: [0.7, 0.58, 0.44] });
  for (const [px, pz] of [
    [-0.1, -0.03],
    [0.1, -0.03],
    [-0.1, 0.03],
    [0.1, 0.03],
  ])
    wb.box('wooddark', px - 0.012, 0, pz - 0.012, px + 0.012, 0.1, pz + 0.012, { ao: false, room });
  wb.pop();
  wb.box('clothRed', 37.9, F1 + 0.01, 47.1, 38.1, F1 + 0.05, 47.4, { ao: false, room, tint: [0.6, 0.4, 0.34] });
  wb.box('linen', 37.95, F1 + 0.01, 46.95, 38.05, F1 + 0.08, 47.06, { ao: false, room });
  // el bacín, el cántaro, la ropa tendida en una cuerda de lado a lado
  wb.cylinder('plaster', 47.0, F1, 47.6, 0.15, 0.12, 0.18, 8, { ao: false, room, tint: [0.62, 0.55, 0.45] });
  P.jar(ctx, 39.0, F1, 49.2, 0.85);
  wb.box('rope', 38.2, F1 + 1.95, 44.98, 46.4, F1 + 1.97, 45.0, { ao: false, room });
  for (const [x, w, t] of [
    [39.6, 0.5, [0.8, 0.78, 0.7]],
    [40.6, 0.38, [0.5, 0.46, 0.5]],
    [44.8, 0.6, [0.72, 0.62, 0.5]],
  ])
    wb.box('clothWhite', x - w / 2, F1 + 1.35, 44.97, x + w / 2, F1 + 1.96, 45.01, { ao: false, room, faces: 'ns', tint: t });
  saint(ctx, 'n', 41.2, F1 + 1.3, I.z1, room, 83, 'clothBlue');
  P.candles(ctx, 40.9, F1 + 0.8, 45.6, 2, 8211, { room, radius: 6, intensity: 0.85, spread: 0.12 });
  ctx.lights.push({ x: 45.0, y: F1 + 1.2, z: 47.6, r: 0.55, g: 0.6, b: 0.8, radius: 4.0, intensity: 0.3, room });
  wb.setRoom(null);
  // la escala al desván (la trampilla, en el techo del sobrado)
  escala(ctx, L, {
    id: 'h_desvan',
    room,
    x: ES.x,
    z: ES.z,
    y0: F1,
    y1: F2,
    rot: 0,
    toUp: [ES.x, F2, ES.z - 1.0, Math.PI],
    toDown: [ES.x, F1, ES.z - 1.0, Math.PI],
    msgUp: 'desvanSube',
    msgDown: 'desvanBaja',
  });
  // lo que escribieron (en la mesa)
  L.interact.push({ kind: 'note', id: 'n_vecinos', note: 'vecinos', x: 40.1, y: F1 + 0.82, z: 45.25, model: 'paper' });

  // ---- el desván de los cueros: las varas de lado a lado sobre los tirantes,
  // con las pieles colgadas en filas, y un pasillo en medio
  wb.setRoom(up);
  for (const z of [43.55, 48.45]) {
    wb.push();
    wb.translate(I.x0, 8.05, z);
    wb.rotateZ(-Math.PI / 2);
    wb.cylinder('wooddark', 0, 0, 0, 0.04, 0.04, I.x1 - I.x0, 6, { ao: false, room: up });
    wb.pop();
    for (let x = I.x0 + 0.6, k = 0; x < I.x1 - 0.5; x += 0.95, k++) {
      if (Math.abs(x - ES.x) < 0.9 && z > 46) continue;
      hide(ctx, x, 8.03, z, ((k * 7) % 5) * 0.04 - 0.08, 0.85, 1.05 + (k % 3) * 0.12, 8300 + k + (z > 46 ? 50 : 0), up);
    }
  }
  // (las de en medio, en varas más altas, por encima de la cabeza)
  [37.6, 40.5, 43.5, 46.3].forEach((x, k) => hide(ctx, x, 9.25, 46.0, 0, 0.9, 0.68, 8400 + k, up));
  wb.push();
  wb.translate(I.x0, 9.27, 46.0);
  wb.rotateZ(-Math.PI / 2);
  wb.cylinder('wooddark', 0, 0, 0, 0.035, 0.035, I.x1 - I.x0 - 1.2, 6, { ao: false, room: up });
  wb.pop();
  // pieles enrolladas y atadas, sacos de corteza, un fardo de lana
  for (let k = 0; k < 5; k++) {
    wb.push();
    wb.translate(I.x0 + 0.5, F2 + 0.16 + (k > 2 ? 0.3 : 0), 44.2 + (k % 3) * 0.36);
    wb.rotateZ(Math.PI / 2);
    wb.cylinder('leather', 0, -0.45, 0, 0.15, 0.15, 0.9, 8, { ao: false, room: up, capTop: true, capBot: true, tint: k % 2 ? [0.72, 0.58, 0.46] : [0.82, 0.68, 0.54] });
    wb.pop();
  }
  ctx.col.add(I.x0 + 0.05, F2, 43.9, I.x0 + 0.95, F2 + 0.65, 45.2);
  P.sacks(ctx, I.x0 + 0.6, F2, 47.6, 3, 8410);
  P.hay(ctx, 46.6, F2, 43.2, 0.1);
  // la luz de la luna por las celosías y la de la puerta
  for (const [x, z] of [
    [39.4, 43.0],
    [44.6, 43.0],
    [38.6, 49.0],
    [42.0, 49.0],
    [45.4, 49.0],
  ])
    ctx.lights.push({ x, y: 7.45, z, r: 0.55, g: 0.62, b: 0.85, radius: 3.4, intensity: 0.58, room: up });
  ctx.lights.push({ x: I.x1 - 0.6, y: 7.0, z: D.z, r: 0.6, g: 0.66, b: 0.88, radius: 4.5, intensity: 0.55, room: up });
  wb.setRoom(null);
  // la nota de los vecinos que se fueron por los tejados, clavada en la viga
  L.interact.push({ kind: 'note', id: 'n_desvan', note: 'desvan', x: I.x0 + 0.08, y: F2 + 1.55, z: 46.0, model: 'wall' });
  S.paint(R.x0 + 0.01, R.z0 + 0.01, R.x1 - 0.01, R.z1 - 0.01, 1);
}

// Las cerchas de un tejado visto por dentro: el tirante a la altura del
// alero, el pendolón y los jabalcones, y la hilera; y las rebanadas que no
// dejan a la cámara meterse en los faldones.
function roofTruss(ctx, R, room, axis, at, o = {}) {
  const wb = ctx.wb;
  const alongX = axis === 'x';
  const half = alongX ? (R.z1 - R.z0) / 2 : (R.x1 - R.x0) / 2;
  const c = alongX ? (R.z0 + R.z1) / 2 : (R.x0 + R.x1) / 2;
  const slope = (R.ridge - R.h) / half;
  const tv = 0.2 * Math.sqrt(1 + slope * slope);
  const under = (u) => R.ridge - Math.abs(u - c) * slope - tv;
  const I = inner(R);
  const [s0, s1] = alongX ? [I.x0, I.x1] : [I.z0, I.z1];
  const [u0, u1] = alongX ? [I.z0, I.z1] : [I.x0, I.x1];
  const B = (a0, b0, a1, b1, y0, y1, oo) => (alongX ? wb.box('timber', a0, y0, b0, a1, y1, b1, oo) : wb.box('timber', b0, y0, a0, b1, y1, a1, oo));
  const tint = o.tint ?? [0.62, 0.55, 0.48];
  // (tieY: el tirante más alto, de nudillo, donde el tirante del alero
  // quedaría a la altura de la cabeza)
  const ty = o.tieY ?? R.h;
  const tw = o.tieY ? Math.min(half, (R.ridge - tv - ty - 0.24) / slope) : null;
  for (const s of at) {
    // tirante y pendolón
    B(s - 0.12, tw ? c - tw : u0, s + 0.12, tw ? c + tw : u1, ty - 0.12, ty + 0.12, { ao: false, room, tint, faces: 'tnsewb' });
    B(s - 0.1, c - 0.1, s + 0.1, c + 0.1, ty + 0.12, under(c), { ao: false, room, tint });
    for (const sg of [-1, 1]) {
      if (o.tieY) continue;
      const a = alongX ? V(s, R.h + 0.7, c + sg * 0.1) : V(c + sg * 0.1, R.h + 0.7, s);
      const ub = c + sg * Math.min(half * 0.62, 2.0);
      const b = alongX ? V(s, under(ub) - 0.05, ub) : V(ub, under(ub) - 0.05, s);
      strut(wb, a, b, 0.07, 'timber', { room, tint });
    }
  }
  // la hilera
  B(s0, c - 0.13, s1, c + 0.13, under(c) - 0.24, under(c) + 0.03, { ao: false, room, tint, faces: 'nsewb' });
  if (o.cam === false) return;
  // (las rebanadas, del grueso del faldón: ni más arriba, que estorbarían a
  // la cámara por encima del tejado, ni en sus huecos; holes, en [x0, z0,
  // x1, z1] del mundo)
  for (const sg of [-1, 1])
    for (let k = 0; k < 5; k++) {
      const ua = c + sg * k * (half / 5),
        ub = c + sg * (k + 1) * (half / 5);
      const y0 = under(ub) - 0.05,
        y1 = under(ua) + tv + 0.08;
      const r = alongX ? [R.x0, Math.min(ua, ub), R.x1, Math.max(ua, ub)] : [Math.min(ua, ub), R.z0, Math.max(ua, ub), R.z1];
      for (const [x0, z0, x1, z1] of subtractRects(r, o.holes ?? [])) ctx.col.addCam(x0, y0, z0, x1, y1, z1);
    }
}

// Viga (escuadría cuadrada r) de a a b.
function strut(wb, a, b, r, mat = 'timber', o = {}) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
  const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, V(r * 2, len, r * 2));
  wb.geometry(mat, new THREE.BoxGeometry(1, 1, 1), m, { ao: false, room: o.room, tint: o.tint });
}

// Un jergón de paja por el suelo, con su manta revuelta.
function pallet(ctx, x, y, z, rot, seed, room) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  wb.at(x, y, z, rot, () => {
    wb.box('burlap', -0.42, 0, -0.95, 0.42, 0.14, 0.95, { ao: false, room, faces: 'tnsew', tint: [0.72, 0.64, 0.5] });
    for (let i = 0; i < 6; i++) wb.box('straw', rng.range(-0.45, 0.4), 0, rng.range(-1, 0.95), rng.range(-0.4, 0.45), 0.02, rng.range(-1, 1), { ao: false, room, tint: [0.75, 0.62, 0.38] });
    const tint = rng.pick([
      [0.5, 0.42, 0.36],
      [0.58, 0.3, 0.26],
      [0.4, 0.42, 0.5],
    ]);
    wb.push();
    wb.translate(rng.range(-0.1, 0.1), 0.14, rng.range(-0.2, 0.3));
    wb.rotateY(rng.range(-0.4, 0.4));
    wb.box('clothDark', -0.45, 0, -0.55, 0.42, 0.06, 0.5, { ao: false, room, tint });
    wb.pop();
  });
}

// Un brasero apagado, con la ceniza fría y la olla encima.
function coldBrazier(ctx, x, y, z, room) {
  const wb = ctx.wb;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    wb.push();
    wb.translate(x + Math.cos(a) * 0.2, y, z + Math.sin(a) * 0.2);
    wb.rotateZ(Math.cos(a) * 0.15);
    wb.rotateX(-Math.sin(a) * 0.15);
    wb.box('iron', -0.025, 0, -0.025, 0.025, 0.6, 0.025, { ao: false, room });
    wb.pop();
  }
  wb.cylinder('iron', x, y + 0.55, z, 0.18, 0.32, 0.2, 8, { ao: false, capBot: true, room });
  wb.cylinder('dirt', x, y + 0.72, z, 0.3, 0.3, 0.01, 8, { ao: false, capTop: true, grime: false, room, tint: [0.3, 0.29, 0.28] });
  wb.cylinder('iron', x, y + 0.73, z, 0.2, 0.16, 0.24, 9, { ao: false, capBot: true, room });
  wb.cylinder('dirt', x, y + 0.92, z, 0.18, 0.18, 0.01, 9, { ao: false, capTop: true, grime: false, room, tint: [0.32, 0.26, 0.2] });
  ctx.col.add(x - 0.32, y, z - 0.32, x + 0.32, y + 0.97, z + 0.32);
}

// La cuna de madera, sobre sus balancines (vacía).
function cradleV(ctx, x, y, z, rot, room) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    for (const s of [-1, 1]) wb.box('wooddark', -0.4, 0, s * 0.3 - 0.03, 0.4, 0.08, s * 0.3 + 0.03, { ao: false, room });
    wb.box('wooddark', -0.42, 0.1, -0.25, 0.42, 0.14, 0.25, { ao: false, room });
    for (const s of [-1, 1]) {
      wb.box('wooddark', -0.42, 0.14, s * 0.25 - 0.02, 0.42, 0.45, s * 0.25 + 0.02, { ao: false, room });
      wb.box('wooddark', s * 0.42 - 0.02, 0.14, -0.25, s * 0.42 + 0.02, 0.5, 0.25, { ao: false, room });
    }
    wb.box('linen', -0.38, 0.14, -0.21, 0.38, 0.2, 0.21, { ao: false, room, tint: [0.8, 0.76, 0.7] });
  });
  P.colOBB(ctx, x, z, 0.45, 0.33, rot, y, y + 0.5);
}

// Un cuadrilátero con la cara hacia n (se le da la vuelta si hace falta).
function quadN(wb, mat, p, n, opts) {
  const U = p[1].clone().sub(p[0]),
    W = p[3].clone().sub(p[0]);
  if (U.cross(W).dot(n) < 0) p = [p[3], p[2], p[1], p[0]];
  wb.quad(mat, p[0], p[1], p[2], p[3], opts);
}

// Hastial de muro, con sus huecos: de y0 hasta la línea de la cara de abajo
// del tejado, que sube del alero (en los extremos) a la cumbrera (en c).
// axis: el del muro; a0..a1: a lo largo; t0..t1: el grueso; out: la cara de
// fuera ('n','s','e','w'). La de dentro es de la sala 'room'; los huecos
// ({ a0, a1, y0, y1 }) llevan sus jambas, el dintel y el alféizar.
function gableWall(ctx, o) {
  const wb = ctx.wb;
  const { axis, a0, a1, c, t0, t1, out, y0, yEave, yRidge, room } = o;
  const half = Math.max(c - a0, a1 - c);
  const slope = (yRidge - yEave) / half;
  const tv = o.tv ?? 0.2 * Math.sqrt(1 + slope * slope);
  const top = (u) => yRidge - tv - Math.abs(u - c) * slope;
  const sOut = out === 'n' || out === 'w' ? -1 : 1;
  const tOut = sOut < 0 ? t0 : t1,
    tIn = sOut < 0 ? t1 : t0;
  const P = (u, y, t) => (axis === 'x' ? V(u, y, t) : V(t, y, u));
  const N = (s) => (axis === 'x' ? V(0, 0, s) : V(s, 0, 0));
  const A = (s) => (axis === 'x' ? V(s, 0, 0) : V(0, 0, s));
  const hs = [...(o.holes ?? [])].sort((p, q) => p.a0 - q.a0);
  const cuts = new Set([a0, a1, c]);
  for (const h of hs) cuts.add(h.a0).add(h.a1);
  const us = [...cuts].filter((u) => u >= a0 && u <= a1).sort((p, q) => p - q);
  const fOut = { ao: false, sub: 1.6, room: o.outRoom ?? 'out', tint: o.tint };
  const fIn = { sub: 1.6, room, tint: o.tintIn ?? o.tint, aoH: 1.2, baseY: o.floorY ?? y0 };
  for (let i = 0; i + 1 < us.length; i++) {
    const u0 = us[i],
      u1 = us[i + 1];
    if (u1 - u0 < 1e-4) continue;
    const h = hs.find((q) => q.a0 <= u0 + 1e-6 && q.a1 >= u1 - 1e-6);
    const spans = h ? [[y0, h.y0, false], [h.y1, 0, true]] : [[y0, 0, true]];
    for (const [yb, yt, roof] of spans) {
      const ya = roof ? top(u0) : yt,
        yc = roof ? top(u1) : yt;
      if (Math.max(ya, yc) - yb < 0.005) continue;
      const pts = (t) => [P(u0, yb, t), P(u1, yb, t), P(u1, yc, t), P(u0, ya, t)];
      if (o.outer !== false) quadN(wb, o.mat, pts(tOut), N(sOut), fOut);
      if (o.inner !== false) quadN(wb, o.matIn ?? o.mat, pts(tIn), N(-sOut), fIn);
      if (o.collide !== false) ctx.col.add(...(axis === 'x' ? [u0, yb, t0, u1, Math.max(ya, yc), t1] : [t0, yb, u0, t1, Math.max(ya, yc), u1]));
    }
  }
  const fj = { ao: false, room, tint: o.tintIn ?? o.tint };
  const mj = o.matIn ?? o.mat;
  // (las jambas, hasta la línea del tejado; un hueco que llega al borde del
  // muro no lleva jamba por ese lado, ni dintel si llega al tejado)
  for (const h of hs) {
    if (h.a0 > a0 + 1e-3) quadN(wb, mj, [P(h.a0, h.y0, t0), P(h.a0, h.y0, t1), P(h.a0, Math.min(h.y1, top(h.a0)), t1), P(h.a0, Math.min(h.y1, top(h.a0)), t0)], A(1), fj);
    if (h.a1 < a1 - 1e-3) quadN(wb, mj, [P(h.a1, h.y0, t0), P(h.a1, h.y0, t1), P(h.a1, Math.min(h.y1, top(h.a1)), t1), P(h.a1, Math.min(h.y1, top(h.a1)), t0)], A(-1), fj);
    if (h.y1 < Math.min(top(h.a0), top(h.a1))) quadN(wb, mj, [P(h.a0, h.y1, t0), P(h.a1, h.y1, t0), P(h.a1, h.y1, t1), P(h.a0, h.y1, t1)], V(0, -1, 0), fj);
    if (h.y0 > y0 + 1e-3) quadN(wb, mj, [P(h.a0, h.y0, t0), P(h.a1, h.y0, t0), P(h.a1, h.y0, t1), P(h.a0, h.y0, t1)], V(0, 1, 0), fj);
  }
}

// ======================================================================== 4. EL SECADERO
// La azotea de la casa de al lado de los vecinos, donde se tendían los cueros
// a secar: las losas, el pretil, los bastidores con sus pieles y, contra el
// muro de la casa del palomar, lo que queda de la escalera de tablas que
// subía a la puerta de su desván. Desde aquí se ve la ciudad entera.
function buildSecadero(ctx, S, L) {
  const wb = ctx.wb;
  const R = TJ.sec,
    Y = R.y,
    PA = TJ.pal;
  ctx.houseRects.push({ x0: R.x0, z0: R.z0, x1: R.x1, z1: R.z1, front: 's', jetty: 0, hollow: true, h: Y + 1, style: 'plaster' });
  // la casa de debajo, maciza; por fuera, lo que asoma sobre las de alrededor
  ctx.col.add(R.x0, 0, R.z0, R.x1, Y - 0.2, R.z1);
  const tint = [0.9, 0.84, 0.74];
  wb.box('plaster', R.x0, 0, R.z0, R.x1, Y, R.z1, { faces: 'se', room: 'out', tint, sub: 1.6, ao: false });
  wb.box('ashlar', R.x0, Y - 0.22, R.z1, R.x1 + 0.1, Y - 0.06, R.z1 + 0.1, { ao: false, faces: 'tsewb', tint: [0.7, 0.67, 0.62] });
  wb.box('ashlar', R.x1, Y - 0.22, R.z0, R.x1 + 0.1, Y - 0.06, R.z1, { ao: false, faces: 'tnsewb', tint: [0.7, 0.67, 0.62] });
  // el suelo, de losas, con su desagüe
  slab(ctx, R, Y, [], 'out', null, { mat: 'flag', uv: 0.9, tint: [0.62, 0.58, 0.54] });
  // el pretil (con su albardilla) por donde no hay muro; encima, nadie se sube
  const PH = 1.0;
  const parapet = (x0, z0, x1, z1) => {
    wb.box('plaster', x0, Y, z0, x1, Y + PH, z1, { faces: 'nsew', room: 'out', tint, sub: 1.6, ao: false });
    wb.box('ashlar', x0 - 0.04, Y + PH, z0 - 0.04, x1 + 0.04, Y + PH + 0.08, z1 + 0.04, { ao: false, faces: 'tnsewb', tint: [0.68, 0.65, 0.6] });
    ctx.col.add(x0, Y, z0, x1, Y + PH, z1);
    blocker(ctx, x0, Y + PH, z0, x1, Y + 2.6, z1);
  };
  parapet(R.x0, R.z1 - 0.35, R.x1, R.z1);
  parapet(R.x1 - 0.35, R.z0, R.x1, R.z1 - 0.35);
  parapet(R.x0, R.z0, R.x0 + 0.35, TJ.vec.z0);
  wb.box('iron', R.x1 - 0.05, Y + 0.02, 44.9, R.x1 + 0.35, Y + 0.14, 45.1, { ao: false });

  // la casa estrecha del rincón (cierra la azotea por el noroeste)
  house(ctx, { x0: R.x0, z0: 31, x1: TJ.pal.x0, z1: R.z0, front: 'w', seed: 9303, h: 8.0, roofAxis: 'z', jetty: 0, style: 'plaster' });
  // ---- la escalera de tablas que subía a la puerta del palomar se vino
  // abajo: quedan dos peldaños clavados en el muro, la zanca partida y las
  // tablas por el suelo. Se sube por donde se hundió la esquina de la casa,
  // por los escombros (ver buildPalomero)
  {
    const z = PA.z1;
    for (const [x, y] of [
      [52.7, 7.25],
      [53.35, 7.55],
    ]) {
      wb.box('planks', x - 0.17, y - 0.045, z, x + 0.17, y, z + 0.92, { ao: false, faces: 'tnsewb', tint: [0.66, 0.58, 0.5] });
      wb.box('iron', x - 0.025, y - 0.14, z, x + 0.025, y - 0.045, z + 0.06, { ao: false });
    }
    strut(wb, V(51.1, Y + 0.06, z + 1.45), V(53.3, Y + 0.55, z + 1.12), 0.065, 'wooddark');
    strut(wb, V(53.7, Y + 0.06, z + 2.0), V(55.3, Y + 0.13, z + 2.75), 0.065, 'wooddark');
    const rng = new RNG(8510);
    for (let k = 0; k < 7; k++) {
      wb.push();
      wb.translate(51.6 + rng.range(0, 3.4), Y + 0.03 + (k % 3) * 0.045, z + 0.9 + rng.range(0, 2.3));
      wb.rotateY(rng.range(0, 3));
      wb.box('planks', -0.52, -0.022, -0.16, 0.52, 0.022, 0.16, { ao: false, tint: [0.66, 0.58, 0.5] });
      wb.pop();
    }
  }
  // un cuervo cebado, posado en lo alto de un bastidor (y otros dos, en el
  // remate del palomar y en el hastial del curtidor: entities/cuervo.js)
  L.enemies.push({ type: 'cuervo', x: 57.4, y: Y + 2.4, z: 48.41, yaw: -2.5, idle: 'perch', id: 'e_cuervo_secadero', guard: [47.5, 39.5, 61.5, 50.5] });
  // el farol de la puerta del palomar, encendido (lo dejaron así)
  P.lantern(ctx, PA.door.x + 0.95, PA.F + 2.2, PA.z1, 0, true);

  // ---- los bastidores con las pieles, las que están clavadas en el suelo,
  // las tinas, el muerto
  for (const [x, z, r, s] of [
    [52.6, 47.6, 0.05, 1],
    [56.6, 48.35, -0.08, 2],
    [59.95, 46.9, Math.PI / 2 + 0.06, 3],
  ]) {
    P.dryingRack(ctx, x, Y, z, r, 8500 + s);
    P.colOBB(ctx, x, z, 1.5, 0.08, r, Y, Y + 2.4);
  }
  // un bastidor tumbado por el viento (o por algo)
  wb.push();
  wb.translate(50.4, Y + 0.08, 43.4);
  wb.rotateY(0.6);
  for (const sx of [-1.4, 1.4]) wb.box('wooddark', sx - 0.06, 0, -0.06, sx + 0.06, 0.12, 0.06, { ao: false });
  wb.box('wooddark', -1.5, 0, -0.05, 1.5, 0.1, 0.05, { ao: false });
  wb.box('leather', -0.9, 0.08, -0.6, 0.6, 0.1, 0.4, { ao: false, tint: [0.78, 0.64, 0.5] });
  wb.pop();
  // pieles estacadas en el suelo, con las estaquillas
  for (const [x, z, r, k] of [
    [54.0, 44.2, 0.3, 0],
    [56.6, 45.1, -0.5, 1],
    [52.4, 41.8, 1.2, 2],
  ]) {
    wb.push();
    wb.translate(x, Y + 0.012, z);
    wb.rotateY(r);
    const t = [
      [0.86, 0.74, 0.6],
      [0.76, 0.62, 0.5],
      [0.9, 0.8, 0.66],
    ][k];
    wb.box('leather', -0.75, 0, -0.5, 0.75, 0.012, 0.5, { ao: false, tint: t });
    for (const [px, pz] of [
      [-0.8, -0.55],
      [0.8, -0.55],
      [-0.8, 0.55],
      [0.8, 0.55],
      [0, -0.6],
      [0, 0.6],
    ])
      wb.box('wooddark', px - 0.02, 0, pz - 0.02, px + 0.02, 0.1, pz + 0.02, { ao: false });
    wb.pop();
  }
  wb.cylinder('planks', 49.7, Y, 41.3, 0.42, 0.36, 0.5, 10, { ao: false, tint: [0.6, 0.55, 0.5] });
  wb.cylinder('water', 49.7, Y + 0.42, 41.3, 0.38, 0.38, 0.01, 10, { ao: false, capTop: true, grime: false, tint: [0.3, 0.28, 0.26] });
  ctx.col.add(49.28, Y, 40.88, 50.12, Y + 0.5, 41.72);
  P.barrel(ctx, 49.0, Y, 49.1);
  P.barrel(ctx, 49.7, Y, 49.25, { lying: true, rot: 0.4 });
  P.firewood(ctx, 49.25, Y, 44.6, Math.PI / 2, 3);
  // las varas de tender, apoyadas en el muro del palomar
  for (let k = 0; k < 5; k++) {
    wb.push();
    wb.translate(55.4 + k * 0.12, Y, PA.z1 + 0.28);
    wb.rotateX(-0.12);
    wb.rotateZ(0.05 * (k - 2));
    wb.cylinder('wooddark', 0, 0, 0, 0.03, 0.025, 3.1, 5, { ao: false, tint: [0.75, 0.66, 0.56] });
    wb.pop();
  }
  // el curtidor viejo, boca abajo junto al pretil, picoteado
  bakeCorpse(wb, 54.0, Y, 48.7, 1.2, 'face', 'villager', 12, null, { tint: [0.78, 0.72, 0.68] });
  P.decal(ctx, 54.0, Y + 0.02, 48.7, 1.6, 'splat', 0.4);
  for (let k = 0; k < 5; k++) {
    wb.push();
    wb.translate(53.2 + k * 0.33, Y + 0.012, 48.0 + ((k * 7) % 5) * 0.15);
    wb.rotateY(k * 1.3);
    wb.box('black', -0.07, 0, -0.012, 0.07, 0.008, 0.012, { ao: false, grime: false });
    wb.pop();
  }
  // la luz: el farol, y lo que queda de una hoguera en un caldero
  wb.cylinder('iron', 50.2, Y, 46.6, 0.3, 0.24, 0.32, 9, { ao: false, capBot: true });
  wb.cylinder('ember', 50.2, Y + 0.26, 46.6, 0.26, 0.26, 0.02, 9, { ao: false, capTop: true, grime: false });
  ctx.fires.push({ x: 50.2, y: Y + 0.3, z: 46.6, s: 0.5, smoke: true, embers: true, light: false, glow: true });
  ctx.lights.push({ x: 50.2, y: Y + 0.8, z: 46.6, r: 1, g: 0.45, b: 0.16, radius: 6, intensity: 0.9 });
  ctx.col.add(49.9, Y, 46.3, 50.5, Y + 0.34, 46.9);
  S.paint(R.x0 + 0.01, R.z0 + 0.01, R.x1 - 0.01, R.z1 - 0.01, 1);
}

// ======================================================================== 5. EL PALOMAR
// La casa del palomero: tres plantas (no se entra en ellas) y el desván, con
// las jaulas, el grano que guardaban los vecinos y la escala que sube al
// palomar de la cumbrera. La esquina del sureste se ha hundido: el muro y el
// tejado, hasta el desván, en un montón de escombros sobre la azotea del
// secadero por el que se trepa (la escalera de tablas de la puerta del sur se
// vino abajo). Al norte, el hastial reventado se asoma al tejado de la casa
// quemada, un par de metros más abajo.
function buildPalomero(ctx, S, L) {
  const wb = ctx.wb;
  const R = TJ.pal,
    D = R.door,
    BN = R.breachN,
    BS = R.breachS;
  const I = inner(R);
  const room = 'palomero';
  const xc = (R.x0 + R.x1) / 2;
  const Y = TJ.sec.y;
  ctx.houseRects.push({ x0: R.x0, z0: R.z0, x1: R.x1, z1: R.z1, front: 's', jetty: 0, hollow: true, h: R.h, style: 'timber' });
  // las plantas de abajo, macizas; por fuera, la piedra, la cal y las vigas
  // de los forjados
  const tint = [0.9, 0.84, 0.74];
  ctx.col.add(R.x0, 0, R.z0, R.x1, R.F - 0.2, R.z1);
  wb.box('wallstone', R.x0, 0, R.z0, R.x1, G1, R.z1, { faces: 'nsew', room: 'out', sub: 1.6, ao: false });
  wb.box('plaster', R.x0, G1, R.z0, R.x1, R.F - 0.2, R.z1, { faces: 'nsew', room: 'out', tint, sub: 1.6, ao: false });
  for (const y of [G1, C1]) wb.box('timber', R.x0 - 0.05, y - 0.04, R.z0 - 0.05, R.x1 + 0.05, y + 0.2, R.z1 + 0.05, { ao: false, faces: 'nsew', sub: 3 });
  // el entramado y las ventanas de la planta de arriba, en las fachadas que
  // se ven (la del secadero, con la esquina caída, y la del tejado quemado)
  wb.at(R.x0, 0, R.z1, 0, () => {
    timberFrame(ctx, BS.a0 - R.x0 - 0.2, C1 + 0.2, R.F - 0.2, [2.4], [1, 0, -1]);
    windowAt2(ctx, 2.4, C1 + 1.1, 0.7, 1.0, false);
  });
  wb.at(R.x1, 0, R.z0, Math.PI, () => {
    timberFrame(ctx, R.x1 - R.x0, C1 + 0.2, R.F - 0.2, [2.4, 7.6], [1, 0, -1, 0, 1, -1]);
    for (const a of [2.4, 7.6]) windowAt2(ctx, a, C1 + 1.1, 0.7, 1.0, false);
  });
  // ---- el desván: los muros bajos de los lados, los hastiales (el del sur,
  // con la puerta y la esquina caída; el del norte, reventado), el suelo y el
  // tejado a la vista, hundido sobre la esquina
  const W = { mat: 'plaster', tint, tintIn: [0.74, 0.68, 0.6], room, floorY: R.F };
  holedWall(ctx, { axis: 'z', a0: R.z0, a1: R.z1, t0: R.x0, t1: I.x0, y0: R.F - 0.2, y1: R.h, out: 'w', ...W });
  holedWall(ctx, { axis: 'z', a0: R.z0, a1: BS.z, t0: I.x1, t1: R.x1, y0: R.F - 0.2, y1: R.h, out: 'e', ...W });
  const door = { a0: D.x - D.w / 2, a1: D.x + D.w / 2, y0: R.F, y1: R.F + D.h };
  gableWall(ctx, { axis: 'x', a0: R.x0, a1: R.x1, c: xc, t0: I.z1, t1: R.z1, out: 's', y0: R.F - 0.2, yEave: R.h, yRidge: R.ridge, holes: [door, { a0: BS.a0, a1: R.x1 + 0.01, y0: R.F - 0.2, y1: 20 }], ...W });
  gableWall(ctx, { axis: 'x', a0: R.x0, a1: R.x1, c: xc, t0: R.z0, t1: I.z0, out: 'n', y0: R.F - 0.2, yEave: R.h, yRidge: R.ridge, holes: [{ a0: BN.a0, a1: BN.a1, y0: R.F - 0.2, y1: BN.y1 }], ...W });
  slab(ctx, I, R.F, [], room, null, { tint: [0.7, 0.62, 0.54] });
  // (el suelo de la brecha del norte: el muñón del muro)
  wb.box('wallstone', BN.a0, R.F - 0.25, R.z0, BN.a1, R.F - 0.08, I.z0, { ao: false, faces: 'tnsew', tint: [0.62, 0.6, 0.56] });
  ctx.col.add(BN.a0, R.F - 0.3, R.z0 - 0.02, BN.a1, R.F - 0.08, I.z0);
  const fallen = { side: 1, s0: BS.z, s1: R.z1 + 0.31, u0: BS.a0 - xc, u1: 5.41 };
  solidGableRoof(ctx, R.x0, R.z0, R.x1, R.z1, R.h, R.ridge, 'z', { overhang: 0.4, gableOverhang: 0.3, thick: 0.2, wallT: T, gables: [false, false], underRoom: room, cam: false, holes: [fallen] });
  // en la punta de la cumbrera, sobre el boquete del hastial, un cuervo
  // cebado: guarda el tejado quemado
  L.enemies.push({ type: 'cuervo', x: (R.x0 + R.x1) / 2, y: R.ridge + 0.25, z: R.z0 - 0.15, yaw: Math.PI, idle: 'perch', id: 'e_cuervo_palomar', guard: [53, 18.5, 64.5, 30.2] });
  roofTruss(ctx, R, room, 'z', [31.9, 34.2], { tieY: 10.75, holes: [[BS.a0 - 0.15, BS.z - 0.15, R.x1 + 0.5, R.z1 + 0.4]] });
  // la puerta del sur (a la que ya no se llega): el cerco y la hoja, abierta
  frame(ctx, 's', D.x, R.z1, D.w, R.F, R.F + D.h, T, { room, sill: false, innerSill: false });
  wb.box('ashlar', D.x - D.w / 2, R.F - 0.01, I.z1, D.x + D.w / 2, R.F + 0.03, R.z1, { ao: false, faces: 'tnsew', tint: [0.6, 0.58, 0.55] });
  wb.push();
  wb.translate(D.x - D.w / 2 + 0.05, R.F, I.z1 - 0.05);
  wb.rotateY(1.35);
  wb.box('planks', 0, 0.02, -0.04, D.w - 0.1, D.h - 0.05, 0, { ao: false, room, tint: [0.66, 0.58, 0.5] });
  wb.pop();
  blocker(ctx, D.x - D.w / 2, R.F, R.z1 - 0.05, D.x + D.w / 2, R.F + D.h, R.z1 + 0.1);
  // los bordes rotos: piedras que asoman del muro en las dos brechas, el
  // par y la viga partidos, colgando
  raggedHole(ctx, 'x', (BN.a0 + BN.a1) / 2, R.z0, I.z0, BN.a1 - BN.a0, R.F - 0.2, BN.y1 - R.F + 0.2, 8620, 'out', room);
  {
    const rng = new RNG(8621);
    for (let k = 0; k < 9; k++) {
      const x = BS.a0 + rng.range(-0.1, 0.12),
        y = R.F + rng.range(0.1, 2.2);
      wb.push();
      wb.translate(x, y, R.z1 - rng.range(0.05, 0.35));
      wb.rotateY(rng.range(0, 3));
      wb.rotateX(rng.range(-0.5, 0.5));
      const s = rng.range(0.14, 0.26);
      wb.box(rng.chance(0.5) ? 'wallstone' : 'plaster', -s / 2, -s * 0.4, -s / 2, s / 2, s * 0.4, s / 2, { ao: false, tint: [0.72, 0.68, 0.62] });
      wb.pop();
    }
    // (el pie derecho de la esquina, roto, y la carrera colgando)
    strut(wb, V(R.x1 - 0.1, R.F - 0.2, BS.z + 0.6), V(R.x1 + 0.6, Y + 0.3, R.z1 + 2.6), 0.09, 'timber', { tint: [0.55, 0.48, 0.42] });
    strut(wb, V(BS.a0 + 0.1, R.h - 0.05, R.z1 - 0.2), V(R.x1 - 0.4, R.F + 0.35, R.z1 + 1.1), 0.08, 'timber', { tint: [0.55, 0.48, 0.42] });
    strut(wb, V(59.2, 10.4, BS.z - 0.1), V(58.6, R.F + 0.05, 38.8), 0.07, 'timber', { room, tint: [0.55, 0.48, 0.42] });
  }

  // ---- los escombros de la esquina, del desván a la azotea: el muro, las
  // tejas, los pares; se sube por ellos (una rampa) y se entra por la brecha
  const RZ = { z0: R.z1 + 4.3, z1: R.z1 };
  const rampY = (z) => Y + ((RZ.z0 - z) / (RZ.z0 - RZ.z1)) * (R.F - Y);
  ctx.col.addRamp(BS.a0 + 0.1, R.z1, R.x1 - 0.45, RZ.z0, 'z', RZ.z0, Y, RZ.z1, R.F);
  ctx.col.add(BS.a0, R.F - 0.3, I.z1 - 0.05, R.x1 - 0.4, R.F, R.z1 + 0.02);
  {
    const rng = new RNG(8630);
    // el montón, de abajo arriba y de lado a lado: sillares, cascotes y
    // tejas, con la cara de arriba siguiendo la pendiente; al pie, se
    // derrama por la azotea
    for (let k = 0; k < 10; k++) {
      const z = RZ.z0 + 0.5 - k * 0.5;
      for (const x of [BS.a0 + 0.35, BS.a0 + 1.25, BS.a0 + 2.15, R.x1 - 0.55]) {
        const y = (z > RZ.z0 ? Y : rampY(z)) - 0.3;
        P.rubble(ctx, x + rng.range(-0.25, 0.25), y, z + rng.range(-0.15, 0.15), 5, 8631 + k * 7 + Math.round(x * 3), 0.55, { scale: 1.1, blocks: 0.7 });
      }
      P.rubble(ctx, (BS.a0 + R.x1) / 2 + rng.range(-0.8, 0.8), (z > RZ.z0 ? Y : rampY(z)) - 0.15, z, 4, 8700 + k, 0.8, { scale: 0.8, mat: 'plaster', tint: [0.86, 0.8, 0.7] });
    }
    // trozos de muro enteros, con su cal y su entramado
    for (const [x, z, ry, rx] of [
      [58.2, RZ.z0 - 0.9, 0.3, -0.5],
      [60.0, RZ.z0 - 2.4, -0.4, -0.6],
    ]) {
      wb.push();
      wb.translate(x, rampY(z) + 0.05, z);
      wb.rotateY(ry);
      wb.rotateX(rx);
      wb.box('plaster', -0.6, -0.12, -0.45, 0.6, 0.12, 0.45, { ao: false, faces: 'tnsewb', tint: [0.86, 0.8, 0.7] });
      wb.box('timber', -0.62, 0.12, -0.08, 0.62, 0.18, 0.08, { ao: false, tint: [0.5, 0.44, 0.38] });
      wb.pop();
    }
    for (let k = 0; k < 22; k++) {
      const z = RZ.z1 + rng.range(0.1, 4.2),
        x = rng.range(BS.a0, R.x1 - 0.3);
      wb.push();
      wb.translate(x, rampY(z) + 0.05, z);
      wb.rotateY(rng.range(0, 3));
      wb.rotateX(rng.range(-0.5, 0.5) + 0.55);
      wb.box('roof', -0.17, -0.025, -0.12, 0.17, 0.025, 0.12, { ao: false, tint: [0.66, 0.6, 0.54] });
      wb.pop();
    }
    // un trozo de faldón entero, con sus tejas y sus pares, caído de lado
    wb.push();
    wb.translate(R.x1 - 0.85, rampY(R.z1 + 2.4) + 0.35, R.z1 + 2.4);
    wb.rotateY(0.35);
    wb.rotateX(0.62);
    wb.rotateZ(-0.2);
    wb.box('roof', -0.9, 0, -1.1, 0.9, 0.08, 1.1, { ao: false, tint: [0.66, 0.6, 0.54] });
    for (const x of [-0.6, 0, 0.6]) wb.box('timber', x - 0.05, -0.12, -1.15, x + 0.05, 0, 1.15, { ao: false, tint: [0.5, 0.44, 0.38] });
    wb.pop();
    // las vigas de los pares y la hilera, que bajan del desván al montón
    strut(wb, V(BS.a0 + 0.6, R.F + 0.05, R.z1 - 0.6), V(BS.a0 + 0.9, Y + 0.2, RZ.z0 - 0.2), 0.08, 'timber', { tint: [0.52, 0.46, 0.4] });
    strut(wb, V(59.9, R.F + 0.4, R.z1 - 1.2), V(60.3, Y + 0.6, R.z1 + 2.9), 0.07, 'timber', { tint: [0.52, 0.46, 0.4] });
    P.decal(ctx, (BS.a0 + R.x1) / 2, Y + 0.02, RZ.z0 + 0.4, 3.2, 'shadow', 0, { opacity: 0.5 });
    // y dentro, junto a la brecha: más escombros, jaulas reventadas
    P.rubble(ctx, 59.2, R.F, 38.6, 10, 8650, 0.9, { scale: 0.85, blocks: 0.5 });
    P.rubble(ctx, 58.4, R.F, 39.2, 6, 8651, 0.6, { scale: 0.7, mat: 'plaster', tint: [0.86, 0.8, 0.7] });
  }

  // ---- las jaulas del palomero, a los lados (donde el tejado baja), vacías:
  // las puertecillas abiertas, plumas, cagarrutas
  wb.setRoom(room);
  const rng = new RNG(8600);
  for (const side of [-1, 1]) {
    const x = side < 0 ? I.x0 + 0.45 : I.x1 - 0.45;
    // (al este, sólo donde el tejado sigue en pie)
    const zEnd = side < 0 ? I.z1 - 0.5 : BS.z - 0.6;
    for (let z = I.z0 + 0.7; z < zEnd; z += 0.95) {
      // (dos filas: junto al muro, una sola jaula; más adentro, hasta tres)
      cage(ctx, x - side * rng.range(0, 0.06), R.F, z, rng.range(-0.1, 0.1), rng.next() * 1e6, room, rng.chance(0.6));
      const n = rng.int(1, 3);
      for (let k = 0; k < n; k++) cage(ctx, x - side * (0.92 + rng.range(0, 0.08)), R.F + k * 0.52, z + rng.range(-0.06, 0.06), rng.range(-0.1, 0.1), rng.next() * 1e6, room, rng.chance(0.6));
    }
    // (no se pasa a donde el tejado ya no deja estar de pie)
    ctx.col.add(side < 0 ? I.x0 : 58.5, R.F, I.z0, side < 0 ? 53.5 : I.x1, R.F + 1.9, side < 0 ? I.z1 : BS.z - 0.2);
  }
  // jaulas reventadas por el suelo, junto a la esquina caída
  for (const [x, z, r] of [
    [59.6, 37.2, 0.6],
    [60.0, 36.3, -0.4],
  ])
    cage(ctx, x, R.F, z, r, x * 100, room, true);
  // (por la esquina caída no se sale al tejado de al lado)
  blocker(ctx, R.x1 - 0.5, R.F - 0.3, BS.z - 0.2, R.x1 + 0.3, R.F + 2.2, R.z1 + 0.1);
  // el grano que guardaban: sacos rajados y el grano por el suelo, picoteado
  P.sacks(ctx, 54.2, R.F, 31.4, 4, 8601);
  P.sacks(ctx, 54.5, R.F, 32.7, 3, 8602);
  for (let k = 0; k < 9; k++) {
    wb.push();
    wb.translate(54.6 + rng.range(-0.6, 1.4), R.F + 0.006, 32.2 + rng.range(-0.4, 1.2));
    wb.rotateY(rng.range(0, 3));
    wb.box('straw', -rng.range(0.15, 0.4), 0, -rng.range(0.1, 0.3), rng.range(0.15, 0.4), 0.012, rng.range(0.1, 0.3), { ao: false, tint: [0.78, 0.66, 0.42] });
    wb.pop();
  }
  wb.cylinder('planks', 54.4, R.F, 38.7, 0.36, 0.32, 0.7, 10, { ao: false, tint: [0.6, 0.55, 0.5] });
  wb.cylinder('water', 54.4, R.F + 0.62, 38.7, 0.33, 0.33, 0.01, 10, { ao: false, capTop: true, grime: false, tint: [0.3, 0.3, 0.3] });
  ctx.col.add(54.04, R.F, 38.34, 54.76, R.F + 0.7, 39.06);
  // dos de los vecinos que no siguieron: lo que han dejado los cuervos
  bakeCorpse(wb, 54.6, R.F, 37.0, 2.4, 'curl', 'villager', 13, null, { tint: [0.7, 0.62, 0.58] });
  bakeCorpse(wb, 57.6, R.F, 33.4, -0.6, 'back', 'villager', 14, null, { tint: [0.7, 0.62, 0.58] });
  for (const [x, z, s] of [
    [54.6, 37.0, 1.6],
    [57.6, 33.4, 1.4],
  ])
    P.decal(ctx, x, R.F + 0.015, z, s, 'splat', x);
  P.bones(ctx, 55.4, R.F, 36.4, 6, 8603, 0.5);
  // plumas negras por todas partes
  for (let k = 0; k < 26; k++) {
    wb.push();
    wb.translate(rng.range(I.x0 + 1, I.x1 - 1), R.F + 0.008, rng.range(I.z0 + 0.4, I.z1 - 0.4));
    wb.rotateY(rng.range(0, 6.3));
    wb.box('black', -0.09, 0, -0.018, 0.09, 0.006, 0.018, { ao: false, grime: false, tint: [0.6, 0.6, 0.65] });
    wb.pop();
  }
  // la luz: la de la luna, por la esquina caída, la brecha y la puerta
  ctx.lights.push(
    { x: 59.0, y: R.F + 1.6, z: 38.4, r: 0.62, g: 0.68, b: 0.9, radius: 6.0, intensity: 0.95, room },
    { x: (BN.a0 + BN.a1) / 2, y: R.F + 1.2, z: R.z0 + 0.8, r: 0.62, g: 0.68, b: 0.9, radius: 5.0, intensity: 0.75, room },
    { x: D.x, y: R.F + 1.2, z: R.z1 - 0.8, r: 0.62, g: 0.68, b: 0.9, radius: 4.0, intensity: 0.5, room }
  );
  wb.setRoom(null);
  S.paint(R.x0 + 0.01, R.z0 + 0.01, R.x1 - 0.01, R.z1 - 0.01, 1);
}

// Una jaula de palomas de varetas, con su puertecilla (abierta).
function cage(ctx, x, y, z, rot, seed, room, open) {
  const wb = ctx.wb;
  const rng = new RNG(Math.floor(seed));
  const w = 0.82,
    d = 0.58,
    h = 0.5;
  wb.at(x, y, z, rot + Math.PI / 2, () => {
    wb.box('planks', -w / 2, 0, -d / 2, w / 2, 0.04, d / 2, { ao: false, room, tint: [0.62, 0.55, 0.46] });
    wb.box('planks', -w / 2, h - 0.03, -d / 2, w / 2, h, d / 2, { ao: false, room, tint: [0.66, 0.58, 0.5] });
    for (let i = 0; i <= 6; i++) {
      const u = -w / 2 + (i * w) / 6;
      for (const s of [-1, 1]) wb.box('wooddark', u - 0.008, 0.04, s * (d / 2) - 0.008, u + 0.008, h - 0.03, s * (d / 2) + 0.008, { ao: false, room, tint: [0.75, 0.66, 0.55] });
    }
    for (let i = 0; i <= 4; i++) {
      const v = -d / 2 + (i * d) / 4;
      for (const s of [-1, 1]) wb.box('wooddark', s * (w / 2) - 0.008, 0.04, v - 0.008, s * (w / 2) + 0.008, h - 0.03, v + 0.008, { ao: false, room, tint: [0.75, 0.66, 0.55] });
    }
    if (open) {
      wb.push();
      wb.translate(-0.12, 0.06, d / 2);
      wb.rotateY(-1.2 - rng.range(0, 0.6));
      wb.box('wooddark', 0, 0, -0.008, 0.24, 0.3, 0.008, { ao: false, room, tint: [0.7, 0.6, 0.5] });
      wb.pop();
    }
    wb.box('plaster', -w / 2 + 0.05, 0.04, -d / 2 + 0.05, w / 2 - 0.05, 0.045, d / 2 - 0.05, { ao: false, room, tint: [0.82, 0.8, 0.74], faces: 't' });
  });
}

// ======================================================================== el palomar de la cumbrera
// Una caseta de entramado y cal a caballo de la cumbrera de la casa del
// palomero, con su tejadillo a cuatro aguas y los agujeros de las palomas
// (y una ventana, por donde entran los cuervos). Se sube por una escala desde
// el desván. Dentro, los nidales; en un rincón, el nido de los cuervos; en
// otro, el aprendiz del herrero, con la piedra de afilar.
function buildDovecote(ctx, S, L) {
  const wb = ctx.wb;
  const Dv = TJ.dove,
    R = TJ.pal;
  const room = 'palomar';
  const t = 0.18;
  const O = { x0: Dv.x - Dv.w / 2, z0: Dv.z - Dv.w / 2, x1: Dv.x + Dv.w / 2, z1: Dv.z + Dv.w / 2 };
  const I = inner(O, t);
  const y0 = Dv.y - 0.12;
  const xc = (R.x0 + R.x1) / 2;
  const slope = (R.ridge - R.h) / ((R.x1 - R.x0) / 2);
  const roofY = (x) => R.ridge - Math.abs(x - xc) * slope;
  const tint = [0.88, 0.82, 0.72],
    tin = [0.62, 0.56, 0.48];
  slab(ctx, I, Dv.y, [], room, null, { th: 0.12, tint: [0.6, 0.54, 0.48] });
  // los muros, con la ventana del sur
  const win = { a0: Dv.x - 0.33, a1: Dv.x + 0.33, y0: Dv.y + 0.72, y1: Dv.y + 1.36 };
  const W = { y0, y1: Dv.top, room, mat: 'plaster', tint, tintIn: tin, floorY: Dv.y };
  holedWall(ctx, { axis: 'x', a0: O.x0, a1: O.x1, t0: I.z1, t1: O.z1, out: 's', holes: [win], ...W });
  holedWall(ctx, { axis: 'x', a0: O.x0, a1: O.x1, t0: O.z0, t1: I.z0, out: 'n', ...W });
  holedWall(ctx, { axis: 'z', a0: O.z0, a1: O.z1, t0: O.x0, t1: I.x0, out: 'w', ...W });
  holedWall(ctx, { axis: 'z', a0: O.z0, a1: O.z1, t0: I.x1, t1: O.x1, out: 'e', ...W });
  frame(ctx, 's', Dv.x, O.z1, win.a1 - win.a0, win.y0, win.y1, t, { room });
  // el faldón de la caseta hasta las tejas: los de los lados, rectos; los de
  // los hastiales, con la uve del tejado
  const fo = { ao: false, room: 'out', tint: tint.map((v) => v * 0.9) };
  for (const x of [O.x0, O.x1]) quadN(wb, 'plaster', [V(x, roofY(x) - 0.06, O.z0), V(x, roofY(x) - 0.06, O.z1), V(x, y0, O.z1), V(x, y0, O.z0)], V(x < Dv.x ? -1 : 1, 0, 0), fo);
  for (const z of [O.z0, O.z1])
    for (const [xa, xb] of [
      [O.x0, xc],
      [xc, O.x1],
    ])
      quadN(wb, 'plaster', [V(xa, roofY(xa) - 0.06, z), V(xb, roofY(xb) - 0.06, z), V(xb, y0, z), V(xa, y0, z)], V(0, 0, z < Dv.z ? -1 : 1), fo);
  // el entramado: los cuatro pies derechos de las esquinas, la solera y la
  // carrera
  for (const [x, z] of [
    [O.x0, O.z0],
    [O.x1, O.z0],
    [O.x0, O.z1],
    [O.x1, O.z1],
  ])
    wb.box('timber', x - 0.08, roofY(x) - 0.1, z - 0.08, x + 0.08, Dv.top, z + 0.08, { ao: false });
  for (const y of [y0 - 0.04, Dv.top - 0.16])
    wb.box('timber', O.x0 - 0.06, y, O.z0 - 0.06, O.x1 + 0.06, y + 0.16, O.z1 + 0.06, { ao: false, faces: 'tnsewb' });
  // los agujeros de las palomas, con sus posaderos de pizarra
  const holeAt = (side, u, y) => {
    const s = side === 'n' || side === 'w' ? -1 : 1;
    const along = side === 'n' || side === 's';
    const c = along ? (s < 0 ? O.z0 : O.z1) + s * 0.004 : (s < 0 ? O.x0 : O.x1) + s * 0.004;
    const B = (a0, y0b, b0, a1, y1b, b1, mat, o) => (along ? wb.box(mat, a0, y0b, b0, a1, y1b, b1, o) : wb.box(mat, b0, y0b, a0, b1, y1b, a1, o));
    B(u - 0.07, y, Math.min(c, c - s * 0.01), u + 0.07, y + 0.16, Math.max(c, c - s * 0.01), 'black', { ao: false, grime: false });
    B(u - 0.1, y - 0.03, Math.min(c, c + s * 0.14), u + 0.1, y, Math.max(c, c + s * 0.14), 'ashlar', { ao: false, faces: 'tnsewb', tint: [0.42, 0.42, 0.46] });
  };
  for (const side of ['n', 'e', 'w'])
    for (const y of [Dv.y + 0.55, Dv.y + 1.25])
      for (const k of [-1.05, -0.35, 0.35, 1.05]) holeAt(side, (side === 'n' ? Dv.x : Dv.z) + k, y);
  for (const k of [-1.05, 1.05]) holeAt('s', Dv.x + k, Dv.y + 0.95);
  // el tejadillo, a cuatro aguas, con su cara de abajo y el remate
  const RH = 1.25,
    ov = 0.28;
  const hw = Dv.w / 2 + ov;
  wb.pyramid('roof', Dv.x, Dv.z, hw * 2, hw * 2, Dv.top, RH, {});
  {
    const ap = V(Dv.x, Dv.top + RH - 0.14, Dv.z);
    const c = [V(Dv.x - hw, Dv.top - 0.06, Dv.z - hw), V(Dv.x + hw, Dv.top - 0.06, Dv.z - hw), V(Dv.x + hw, Dv.top - 0.06, Dv.z + hw), V(Dv.x - hw, Dv.top - 0.06, Dv.z + hw)];
    for (let i = 0; i < 4; i++) wb.tri('wooddark', c[i], c[(i + 1) % 4], ap, { ao: false, room, tint: [0.5, 0.46, 0.42] });
  }
  wb.cylinder('roof', Dv.x, Dv.top + RH - 0.05, Dv.z, 0.12, 0.16, 0.22, 7, { ao: false, capTop: true });
  wb.box('iron', Dv.x - 0.02, Dv.top + RH + 0.15, Dv.z - 0.02, Dv.x + 0.02, Dv.top + RH + 0.75, Dv.z + 0.02, { ao: false });
  wb.box('iron', Dv.x - 0.02, Dv.top + RH + 0.5, Dv.z - 0.2, Dv.x + 0.02, Dv.top + RH + 0.54, Dv.z + 0.2, { ao: false });
  ctx.col.add(O.x0, Dv.top, O.z0, O.x1, Dv.top + RH, O.z1).cam = true;


  // ---- dentro: los nidales en los muros, el nido de los cuervos, el
  // aprendiz
  wb.setRoom(room);
  for (const [side, a0, a1, c] of [
    ['n', I.x0, I.x1 - 1.0, I.z0],
    ['w', I.z0 + 0.9, I.z1, I.x0],
  ]) {
    const along = side === 'n';
    for (let r = 0; r < 4; r++) {
      const y = Dv.y + 0.32 + r * 0.42;
      const s = side === 'n' || side === 'w' ? 1 : -1;
      if (along) wb.box('planks', a0, y - 0.03, c, a1, y, c + s * 0.3, { ao: false, room, faces: 'tnsewb', tint: [0.6, 0.53, 0.45] });
      else wb.box('planks', c, y - 0.03, a0, c + s * 0.3, y, a1, { ao: false, room, faces: 'tnsewb', tint: [0.6, 0.53, 0.45] });
      for (let u = a0; u <= a1 + 1e-3; u += 0.36) {
        if (along) wb.box('planks', u - 0.012, y, c, u + 0.012, y + 0.36, c + s * 0.3, { ao: false, room, tint: [0.56, 0.5, 0.42] });
        else wb.box('planks', c, y, u - 0.012, c + s * 0.3, y + 0.36, u + 0.012, { ao: false, room, tint: [0.56, 0.5, 0.42] });
      }
    }
  }
  ctx.col.add(I.x0, Dv.y, I.z0, I.x1 - 1.0, Dv.y + 1.9, I.z0 + 0.3);
  ctx.col.add(I.x0, Dv.y, I.z0 + 0.9, I.x0 + 0.3, Dv.y + 1.9, I.z1);
  // el nido: un montón de palos, trapos, huesos y una calavera, en el rincón
  {
    const rng = new RNG(8700);
    const nx = I.x0 + 0.62,
      nz = I.z0 + 0.62;
    for (let k = 0; k < 34; k++) {
      const a = rng.range(0, Math.PI * 2),
        r = rng.range(0.1, 0.5);
      wb.push();
      wb.translate(nx + Math.cos(a) * r, Dv.y + 0.05 + rng.range(0, 0.18) * (1 - r), nz + Math.sin(a) * r);
      wb.rotateY(a + Math.PI / 2 + rng.range(-0.4, 0.4));
      wb.rotateZ(rng.range(-0.3, 0.3));
      wb.box('wooddark', -rng.range(0.15, 0.32), -0.012, -0.012, rng.range(0.15, 0.32), 0.012, 0.012, { ao: false, room, tint: [0.55, 0.48, 0.4] });
      wb.pop();
    }
    for (const [dx, dz, mat] of [
      [0.12, -0.08, 'clothRed'],
      [-0.2, 0.15, 'linen'],
    ])
      wb.box(mat, nx + dx - 0.12, Dv.y + 0.04, nz + dz - 0.1, nx + dx + 0.12, Dv.y + 0.07, nz + dz + 0.1, { ao: false, room, tint: [0.5, 0.42, 0.4] });
    P.bones(ctx, nx + 0.4, Dv.y, nz + 0.35, 6, 8701, 0.35);
    P.ellipsoid(ctx, 'bone', nx + 0.05, Dv.y + 0.16, nz + 0.05, 0.09, 0.08, 0.1, [0.85, 0.78, 0.62], { room });
    ctx.col.add(nx - 0.5, Dv.y, nz - 0.5, nx + 0.5, Dv.y + 0.3, nz + 0.5);
  }
  // el aprendiz, sentado en el rincón del noreste, encogido; la piedra, en el
  // regazo, envuelta en un paño
  bakeCorpse(wb, I.x1 - 0.42, Dv.y, I.z0 + 0.5, -Math.PI / 4, 'sit', 'villager', 15, null, { tint: [0.72, 0.66, 0.62] });
  P.decal(ctx, I.x1 - 0.5, Dv.y + 0.012, I.z0 + 0.6, 1.0, 'splat', 2.2);
  // las cagarrutas en el suelo, bajo la ventana
  for (let k = 0; k < 7; k++) wb.box('plaster', Dv.x - 0.5 + k * 0.17, Dv.y + 0.001, I.z1 - 0.45 + ((k * 5) % 3) * 0.11, Dv.x - 0.42 + k * 0.17, Dv.y + 0.006, I.z1 - 0.38 + ((k * 5) % 3) * 0.11, { ao: false, room, tint: [0.9, 0.9, 0.86], faces: 't' });
  ctx.lights.push(
    { x: Dv.x, y: Dv.y + 1.1, z: I.z1 - 0.3, r: 0.62, g: 0.68, b: 0.92, radius: 3.6, intensity: 0.85, room },
    { x: I.x1 - 0.6, y: Dv.y + 0.8, z: I.z0 + 0.7, r: 0.7, g: 0.6, b: 0.5, radius: 2.2, intensity: 0.3, room }
  );
  wb.setRoom(null);
  L.interact.push(
    { kind: 'item', id: 'i_piedra', item: 'piedra', x: I.x1 - 0.72, y: Dv.y + 0.42, z: I.z0 + 0.82 },
    { kind: 'note', id: 'n_aprendiz', note: 'aprendiz', x: I.x1 - 0.02, y: Dv.y + 1.1, z: Dv.z + 0.3, model: 'wall', r: 1.6 }
  );
  // ---- la escala, del desván a la trampilla del palomar (por la cumbrera)
  {
    const ex = Dv.x,
      ez = Dv.z + 0.35;
    const top = R.ridge - 0.25 - 0.02;
    wb.setRoom('palomero');
    P.ladder(ctx, ex, R.F, ez, top - R.F, 0, 0.12);
    // el hueco negro en la cara de abajo del tejado, sobre la escala
    const ux = (x) => R.ridge - 0.235 - Math.abs(x - xc) * slope - 0.012;
    for (const [xa, xb] of [
      [ex - 0.55, xc],
      [xc, ex + 0.55],
    ])
      quadN(wb, 'black', [V(xa, ux(xa), ez - 0.6), V(xb, ux(xb), ez - 0.6), V(xb, ux(xb), ez + 0.5), V(xa, ux(xa), ez + 0.5)], V(0, -1, 0), { ao: false, grime: false, room: 'palomero' });
    wb.setRoom(null);
    L.interact.push(
      { kind: 'hatch', id: 'h_palomar_abajo', end: 'bottom', flag: 'hatch:h_palomar', open: true, msgUp: 'palomarSube', x: ex, y: R.F, z: ez + 0.75, r: 1.5, to: [Dv.x - 0.2, Dv.y, Dv.z + 0.15, Math.PI * 0.75] },
      { kind: 'hatch', id: 'h_palomar_arriba', end: 'top', flag: 'hatch:h_palomar', open: true, msgDown: 'palomarBaja', x: Dv.x - 0.45, y: Dv.y, z: Dv.z + 0.55, r: 1.3, to: [ex, R.F, ez + 1.25, 0] }
    );
  }
}

// ======================================================================== 6. LOS TEJADOS
// Entre la casa del palomar y la del curtidor, la casa quemada: hueca por
// dentro (ardió entera y se le hundieron los suelos), con el tejado aún sobre
// los muros, negro de humo y hundido por el medio. Se baja a él por el
// hastial reventado del palomar, se anda por las tejas (el hundimiento se
// rodea por el faldón, pegado al muro de al lado) y, al otro lado, se sube
// por el tejado del curtidor hasta el agujero por el que se cae a su desván.
// Las casas de los lados son más altas y cierran el tejado; por el del
// curtidor se puede uno caer a las Curtidurías (y de esa caída no se sale).
function buildTejadoQuemado(ctx, S, L) {
  const wb = ctx.wb;
  const R = TJ.teja,
    Hb = R.hole;
  const I = inner(R);
  const room = 'quemada';
  const xc = (R.x0 + R.x1) / 2;
  const soot = [0.34, 0.3, 0.28];
  ctx.houseRects.push({ x0: R.x0, z0: R.z0, x1: R.x1, z1: R.z1, front: 'n', jetty: 0, hollow: true, h: R.h, style: 'stone', burned: true });
  // las casas de los lados, más altas
  house(ctx, { x0: 51, z0: 22, x1: R.x0, z1: R.z1, front: 'w', seed: 9304, h: 7.4, roofAxis: 'z', jetty: 0, style: 'plaster', chimney: false });
  house(ctx, { x0: R.x1, z0: R.z0, x1: 64, z1: R.z1, front: 'e', seed: 9305, h: 7.4, roofAxis: 'z', jetty: 0, style: 'plaster', chimney: true, chimneyAt: [62.5, 27.2], smoke: true });
  // los muros, por dentro negros; el suelo, de ceniza y escombros
  const Wd = { y0: 0, y1: R.h, outer: false, room, mat: 'wallstone', tint: soot };
  holedWall(ctx, { axis: 'x', a0: R.x0, a1: R.x1, t0: R.z0, t1: I.z0, out: 'n', ...Wd });
  holedWall(ctx, { axis: 'x', a0: R.x0, a1: R.x1, t0: I.z1, t1: R.z1, out: 's', ...Wd });
  holedWall(ctx, { axis: 'z', a0: R.z0, a1: R.z1, t0: R.x0, t1: I.x0, out: 'w', ...Wd });
  holedWall(ctx, { axis: 'z', a0: R.z0, a1: R.z1, t0: I.x1, t1: R.x1, out: 'e', ...Wd });
  wb.box('dirt', I.x0, -0.05, I.z0, I.x1, 0.02, I.z1, { faces: 't', ao: false, room, tint: [0.3, 0.28, 0.27] });
  {
    const rng = new RNG(9310);
    // los suelos de arriba, caídos: vigas quemadas, cascotes, tejas
    for (let k = 0; k < 9; k++) {
      const a = V(rng.range(I.x0 + 0.3, I.x1 - 0.3), rng.range(0, 0.4), rng.range(I.z0 + 0.3, I.z1 - 0.3));
      const b = a.clone().add(V(rng.range(-2.2, 2.2), rng.range(0.2, 2.4), rng.range(-2.2, 2.2)));
      b.x = Math.min(I.x1 - 0.1, Math.max(I.x0 + 0.1, b.x));
      b.z = Math.min(I.z1 - 0.1, Math.max(I.z0 + 0.1, b.z));
      strut(wb, a, b, rng.range(0.07, 0.11), 'timber', { room, tint: [0.2, 0.17, 0.15] });
    }
    for (const [x, z, n, sp] of [
      [xc - 0.4, 25.1, 18, 1.6],
      [55.6, 21.4, 8, 1.0],
      [59.4, 28.0, 9, 1.1],
    ])
      P.rubble(ctx, x, 0, z, n, Math.round(x * 31 + z), sp, { scale: 1.2, tint: [0.5, 0.46, 0.44], room });
    // los restos de las vigas del sobrado, en los mechinales del muro
    for (let z = I.z0 + 0.9; z < I.z1 - 0.5; z += 1.6) {
      for (const s of [-1, 1]) {
        const x = s < 0 ? I.x0 : I.x1;
        wb.box('timber', Math.min(x, x - s * rng.range(0.2, 0.7)), 2.98, z - 0.1, Math.max(x, x - s * rng.range(0.2, 0.7)), 3.2, z + 0.1, { ao: false, room, tint: [0.18, 0.15, 0.13] });
      }
    }
    P.decal(ctx, xc, 0.03, 25.0, 5.5, 'shadow', 0, { opacity: 0.7 });
  }
  // el tejado: tejas tiznadas, sin vuelo contra los muros de al lado, con el
  // centro hundido; los pares quemados que quedan cruzando el hueco
  const holes = [
    { side: -1, s0: Hb.z0 - 0.3, s1: Hb.z1 - 0.2, u0: 0, u1: Hb.uW },
    { side: 1, s0: Hb.z0, s1: Hb.z1, u0: 0, u1: Hb.uE },
  ];
  solidGableRoof(ctx, R.x0, R.z0, R.x1, R.z1, R.h, R.ridge, 'z', { ovs: [0.02, 0.02], gableOverhang: 0, open: [true, true], gables: [false, false], thick: 0.18, tint: [0.6, 0.55, 0.52], underRoom: room, holes });
  {
    const rng = new RNG(9320);
    const slope = (R.ridge - R.h) / ((R.x1 - R.x0) / 2);
    const yU = (x) => R.ridge - Math.abs(x - xc) * slope - 0.2;
    for (const z of [Hb.z0 + 0.7, (Hb.z0 + Hb.z1) / 2 + 0.15, Hb.z1 - 0.6]) {
      // un par entero de lado a lado, y otro roto, colgando
      if (rng.chance(0.6)) {
        strut(wb, V(xc - Hb.uW - 0.2, yU(xc - Hb.uW - 0.2) - 0.06, z), V(xc, yU(xc) - 0.06, z), 0.06, 'timber', { tint: [0.2, 0.17, 0.15] });
        strut(wb, V(xc, yU(xc) - 0.06, z), V(xc + Hb.uE * 0.45, yU(xc) - 1.6, z + 0.3), 0.06, 'timber', { tint: [0.2, 0.17, 0.15] });
      } else strut(wb, V(xc + Hb.uE + 0.2, yU(xc + Hb.uE + 0.2) - 0.06, z), V(xc - 0.3, yU(xc) - 1.9, z - 0.2), 0.06, 'timber', { tint: [0.2, 0.17, 0.15] });
    }
    // tejas sueltas y rotas por el borde del hundimiento
    for (let k = 0; k < 16; k++) {
      const side = k % 2 ? 1 : -1;
      const u = rng.range(0.1, side > 0 ? Hb.uE : Hb.uW) + 0.15;
      const z = k % 4 < 2 ? Hb.z0 - rng.range(0.05, 0.3) : Hb.z1 + rng.range(0.05, 0.3);
      wb.push();
      wb.translate(xc + side * u, R.ridge - u * slope + 0.04, z);
      wb.rotateY(rng.range(0, 3));
      wb.rotateZ(-side * Math.atan(slope) + rng.range(-0.3, 0.3));
      wb.box('roof', -0.14, -0.025, -0.1, 0.14, 0.025, 0.1, { ao: false, tint: [0.56, 0.5, 0.46] });
      wb.pop();
    }
  }
  // lo que se pisa: los faldones (menos el hundimiento) y la cumbrera
  const m = 0.22;
  roofRamps(ctx, R, 'z', {
    holes: [
      [xc - Hb.uW - m, Hb.z0 - 0.3 - m, xc + 0.05, Hb.z1 - 0.2 + m],
      [xc - 0.05, Hb.z0 - m, xc + Hb.uE + m, Hb.z1 + m],
    ],
  });
  // la luz: la de la luna, y el resplandor de un rescoldo, abajo
  ctx.lights.push({ x: xc, y: 2.0, z: 25.0, r: 1, g: 0.42, b: 0.16, radius: 5.5, intensity: 0.7, room });
  ctx.fires.push({ x: xc - 0.4, y: 0.3, z: 25.1, s: 0.45, smoke: true, light: false, embers: true, glow: true });
  // (hueca: lo de dentro, transitable; quien cae ahí no sale)
  S.paint(R.x0 + 0.01, R.z0 + 0.01, R.x1 - 0.01, R.z1 - 0.01, 1);
  // el callejón del rincón, entre el curtidor y la casa del este: se cae a
  // él desde el tejado (no sale de ahí nadie)
}

// Lo que se pisa de un tejado a dos aguas (R: x0, z0, x1, z1, h: el alero,
// ridge: la cumbrera; axis: el de la cumbrera): un faldón por lado (rampas
// de la cumbrera al borde del alero, con su vuelo, ovs) menos los huecos
// (holes: [x0, z0, x1, z1] del mundo), y la cumbrera de teja, un palmo más
// alta. s: dónde empieza y acaba a lo largo de la cumbrera (con el vuelo de
// los hastiales).
function roofRamps(ctx, R, axis, o = {}) {
  const alongX = axis === 'x';
  const half = alongX ? (R.z1 - R.z0) / 2 : (R.x1 - R.x0) / 2;
  const c = alongX ? (R.z0 + R.z1) / 2 : (R.x0 + R.x1) / 2;
  const slope = (R.ridge - R.h) / half;
  const ovs = o.ovs ?? [0, 0];
  const [s0, s1] = o.s ?? (alongX ? [R.x0, R.x1] : [R.z0, R.z1]);
  for (const sg of [-1, 1]) {
    const reach = half + ovs[sg > 0 ? 1 : 0];
    const uE = c + sg * reach,
      yE = R.ridge - reach * slope;
    const r = alongX ? [s0, Math.min(c, uE), s1, Math.max(c, uE)] : [Math.min(c, uE), s0, Math.max(c, uE), s1];
    for (const [x0, z0, x1, z1] of subtractRects(r, o.holes ?? [])) ctx.col.addRamp(x0, z0, x1, z1, alongX ? 'z' : 'x', c, R.ridge, uE, yE);
  }
  const cap = alongX ? [s0, c - 0.17, s1, c + 0.17] : [c - 0.17, s0, c + 0.17, s1];
  for (const [x0, z0, x1, z1] of subtractRects(cap, o.holes ?? [])) {
    const b = ctx.col.add(x0, R.ridge - 0.25, z0, x1, R.ridge + 0.15, z1);
    b.cam = false;
    b.noSight = true;
  }
}

// El remate escalonado de un hastial (piñón de escalones de piedra), que
// sube por encima de las tejas hasta la cumbrera: axis, el de la cumbrera;
// x (o z): el plano del hastial; t: su grueso (hacia dentro, dir).
function steppedGable(ctx, R, axis, at, dir, n = 5) {
  const wb = ctx.wb;
  const alongX = axis === 'x';
  const half = alongX ? (R.z1 - R.z0) / 2 : (R.x1 - R.x0) / 2;
  const c = alongX ? (R.z0 + R.z1) / 2 : (R.x0 + R.x1) / 2;
  const slope = (R.ridge - R.h) / half;
  // (un par de centímetros por fuera de la cara del hastial: a ras,
  // parpadearían)
  const t0 = Math.min(at - dir * 0.02, at + dir * 0.3),
    t1 = Math.max(at - dir * 0.02, at + dir * 0.3);
  const tint = [0.7, 0.67, 0.62];
  for (const sg of [-1, 1])
    for (let k = 0; k < n; k++) {
      const ua = half * (1 - k / n),
        ub = half * (1 - (k + 1) / n);
      // (cada escalón, de la altura del tejado en su punto más alto, más
      // medio metro)
      const y1 = R.ridge - ub * slope + 0.55,
        y0 = R.h - 0.4;
      const [a0, a1] = [c + sg * ua, c + sg * ub].sort((p, q) => p - q);
      const B = alongX ? [t0, y0, a0, t1, y1, a1] : [a0, y0, t0, a1, y1, t1];
      wb.box('wallstone', ...B, { ao: false, faces: 'tnsew', sub: 2, tint });
      wb.box('ashlar', B[0] - 0.04, y1, B[2] - 0.04, B[3] + 0.04, y1 + 0.08, B[5] + 0.04, { ao: false, faces: 'tnsewb', tint: [0.64, 0.62, 0.58] });
      ctx.col.add(...B);
      blocker(ctx, B[0], y1, B[2], B[3], y1 + 2.2, B[5]);
    }
}

// ======================================================================== 7. EL CURTIDOR
// La casa del curtidor, en las Curtidurías: el desván (el tejado hundido por
// donde se cae desde el tablón), la escala, el sobrado (la casa), la
// escalera y el taller; la puerta de la calle, atrancada por dentro.
function buildCurtidor(ctx, S, L) {
  const wb = ctx.wb;
  const R = TJ.cur,
    D = R.door,
    Hh = R.hole;
  const I = inner(R);
  const room = 'curtidor',
    up = 'curtidorAlta',
    top = 'curtidorDesvan';
  const zc = (R.z0 + R.z1) / 2;
  const tint = [0.92, 0.86, 0.76];
  ctx.houseRects.push({ x0: R.x0, z0: R.z0, x1: R.x1, z1: R.z1, front: 'n', jetty: 0, hollow: true, h: R.h, style: 'timber' });
  // ---- la planta baja: la fachada de las Curtidurías (la puerta y una
  // ventana con reja), la del callejón y las medianeras
  const win0 = { a0: 61.6, a1: 62.4, y0: 1.0, y1: 1.85 };
  holedWall(ctx, { axis: 'x', a0: R.x0, a1: R.x1, t0: R.z0, t1: I.z0, y0: 0, y1: G1, out: 'n', room, mat: 'wallstone', matIn: 'plaster', tintIn: SOOTED, holes: [{ a0: D.x - D.w / 2, a1: D.x + D.w / 2, y0: 0, y1: D.h }, win0] });
  holedWall(ctx, { axis: 'x', a0: R.x0, a1: R.x1, t0: I.z1, t1: R.z1, y0: 0, y1: G1, out: 's', room, mat: 'wallstone', matIn: 'plaster', tintIn: SOOTED });
  holedWall(ctx, { axis: 'z', a0: R.z0, a1: R.z1, t0: R.x0, t1: I.x0, y0: 0, y1: G1, out: 'w', outer: false, room, mat: 'plaster', tint: SOOTED });
  holedWall(ctx, { axis: 'z', a0: R.z0, a1: R.z1, t0: I.x1, t1: R.x1, y0: 0, y1: G1, out: 'e', outer: false, room, mat: 'plaster', tint: SOOTED });
  wb.box('dirt', I.x0, -0.05, I.z0, I.x1, 0.015, I.z1, { faces: 't', ao: false, room, tint: [0.46, 0.4, 0.34] });
  wb.box('ashlar', D.x - D.w / 2, 0, R.z0 - 0.12, D.x + D.w / 2, 0.035, I.z0 + 0.02, { ao: false, faces: 'tnsew' });
  for (let k = -1; k <= 1; k++) wb.box('iron', 62 + k * 0.2 - 0.016, win0.y0, R.z0 - 0.1, 62 + k * 0.2 + 0.016, win0.y1, R.z0 - 0.07, { ao: false });
  frame(ctx, 'n', 62, R.z0, 0.8, win0.y0, win0.y1, T, { room, mat: 'ashlar', sillMat: 'ashlar' });
  wb.at(R.x1, 0, R.z0, Math.PI, () => doorAt(ctx, R.x1 - D.x, D.w, D.h, { frameOnly: true }));
  // ---- el sobrado: dos ventanas a las Curtidurías (con las contraventanas
  // abiertas: se ve la plaza) y una al callejón
  const wUp = (a) => ({ a0: a - 0.35, a1: a + 0.35, y0: G1 + 0.9, y1: G1 + 1.95 });
  holedWall(ctx, { axis: 'x', a0: R.x0, a1: R.x1, t0: R.z0, t1: I.z0, y0: G1, y1: C1, floorY: F1, out: 'n', room: up, mat: 'plaster', tint, tintIn: LIME, holes: [wUp(56.4), wUp(61.0)] });
  holedWall(ctx, { axis: 'x', a0: R.x0, a1: R.x1, t0: I.z1, t1: R.z1, y0: G1, y1: C1, floorY: F1, out: 's', room: up, mat: 'plaster', tint, tintIn: LIME, holes: [wUp(60.2)] });
  holedWall(ctx, { axis: 'z', a0: R.z0, a1: R.z1, t0: R.x0, t1: I.x0, y0: G1, y1: C1, floorY: F1, out: 'w', outer: false, room: up, mat: 'plaster', tint: LIME });
  holedWall(ctx, { axis: 'z', a0: R.z0, a1: R.z1, t0: I.x1, t1: R.x1, y0: G1, y1: C1, floorY: F1, out: 'e', outer: false, room: up, mat: 'plaster', tint: LIME });
  for (const a of [56.4, 61.0]) {
    frame(ctx, 'n', a, R.z0, 0.7, G1 + 0.9, G1 + 1.95, T, { room: up });
    shutter(ctx, 'n', a, R.z0, 0.7, G1 + 0.9, G1 + 1.95, -1, 1.9);
    shutter(ctx, 'n', a, R.z0, 0.7, G1 + 0.9, G1 + 1.95, 1, 1.75);
  }
  frame(ctx, 's', 60.2, R.z1, 0.7, G1 + 0.9, G1 + 1.95, T, { room: up });
  shutter(ctx, 's', 60.2, R.z1, 0.7, G1 + 0.9, G1 + 1.95, -1, 0.4, { droop: 0.2 });
  // ---- el desván: los muros bajos y los hastiales por dentro, con el tejado
  // hundido
  for (const [t0, t1, out] of [
    [R.z0, I.z0, 'n'],
    [I.z1, R.z1, 's'],
  ])
    holedWall(ctx, { axis: 'x', a0: R.x0, a1: R.x1, t0, t1, y0: C1, y1: R.h, floorY: F2, out, room: top, mat: 'plaster', tint, tintIn: [0.72, 0.66, 0.58] });
  for (const [t0, t1, out] of [
    [R.x0, I.x0, 'w'],
    [I.x1, R.x1, 'e'],
  ])
    holedWall(ctx, { axis: 'z', a0: R.z0, a1: R.z1, t0, t1, y0: C1, y1: R.h, floorY: F2, out, room: top, mat: 'plaster', tint, tintIn: [0.72, 0.66, 0.58] });
  // (sin vuelo por el sur, donde se le arrima el tejado de la casa quemada;
  // en los hastiales, los piñones de escalones)
  const ovs = [0.42, 0.04];
  solidGableRoof(ctx, R.x0, R.z0, R.x1, R.z1, R.h, R.ridge, 'x', { ovs, gableOverhang: 0, thick: 0.2, wallT: T, room: top, underRoom: top, cam: false, wallMat: 'plaster', wallTint: tint, holes: [{ side: 1, s0: Hh.x0, s1: Hh.x1, u0: Hh.u0, u1: Hh.u1 }] });
  const hz0 = zc + Hh.u0,
    hz1 = zc + Hh.u1;
  roofTruss(ctx, R, top, 'x', [59.6, 61.9], { tieY: 8.15, holes: [[Hh.x0 - 0.1, hz0 - 0.1, Hh.x1 + 0.1, hz1 + 0.1]] });
  steppedGable(ctx, R, 'x', R.x0, 1);
  steppedGable(ctx, R, 'x', R.x1, -1);
  // en lo alto del hastial del oeste, un cuervo cebado: guarda el tejado
  // quemado y el del curtidor
  L.enemies.push({ type: 'cuervo', x: R.x0 + 0.14, y: R.ridge + 0.63, z: zc, yaw: 0.2, idle: 'perch', id: 'e_cuervo_curtidor', guard: [53, 11.5, 64.5, 31] });
  // lo que se pisa del tejado (por el norte, se cae uno a las Curtidurías);
  // contra la casa del este, más alta, no se pasa
  roofRamps(ctx, R, 'x', { ovs, s: [R.x0 + 0.3, R.x1 - 0.3], holes: [[Hh.x0 - 0.15, hz0 - 0.15, Hh.x1 + 0.15, hz1 + 0.25]] });
  blocker(ctx, TJ.teja.x1, R.h - 0.3, R.z1 - 0.12, R.x1, R.ridge + 1.5, R.z1 + 0.2);
  // (en el desván, junto a los aleros, no se está de pie; bajas, para que
  // por encima, en las tejas, no estorben)
  ctx.col.add(I.x0, F2, I.z0, I.x1, F2 + 0.95, 13.7);
  ctx.col.add(I.x0, F2, 17.85, I.x1, F2 + 0.95, I.z1);
  // las vigas rotas y las tejas por el borde del hueco
  {
    const rng = new RNG(9400);
    const sl = (R.ridge - R.h) / ((R.z1 - R.z0) / 2);
    const y = (z) => R.ridge - (z - zc) * sl - 0.24;
    // un par roto, colgando hacia dentro
    strut(wb, V(56.0, y(hz0 - 0.2), hz0 - 0.2), V(55.7, 6.9, hz1 - 0.3), 0.06, 'timber', { room: top, tint: [0.55, 0.48, 0.4] });
    for (let k = 0; k < 10; k++) {
      const x = rng.range(Hh.x0, Hh.x1),
        z = k % 2 ? hz1 + rng.range(-0.04, 0.02) : hz0 + rng.range(-0.02, 0.04);
      wb.push();
      wb.translate(x, y(z) + 0.18, z);
      wb.rotateY(rng.range(0, 3));
      wb.rotateX(rng.range(-0.6, 0.6));
      wb.box('roof', -0.12, -0.03, -0.09, 0.12, 0.03, 0.09, { ao: false, tint: [0.62, 0.56, 0.5] });
      wb.pop();
    }
  }
  // ---- los suelos: el del sobrado con el hueco de la escalera (sube hacia el
  // sur pegada al muro del oeste) y el del desván (la trampilla de la escala)
  const ST = { x: I.x0 + 0.55, z: 13.0, w: 1.0, n: 12, run: 0.3 };
  // (el hueco, desde antes del peldaño en el que la cabeza pasa del forjado:
  // al bajar, el cuerpo va por delante de los pies)
  const hole = [I.x0, 13.35, I.x0 + 1.12, ST.z + ST.n * ST.run + 0.05];
  slab(ctx, I, F1, [hole], up, room);
  joists(ctx, I, G1, 'z', [55.35, 56.95, 58.55, 60.15, 61.75, 63.3], [hole], room);
  const ES = { x: 62.7, z: 16.0 };
  slab(ctx, I, F2, [], top, up, { tint: [0.76, 0.68, 0.58] });
  joists(ctx, I, C1, 'z', [55.35, 56.95, 58.55, 60.15, 61.75, 63.3], [[ES.x - 0.66, ES.z - 0.66, ES.x + 0.66, ES.z + 0.66]], up);
  wb.setRoom(room);
  woodStair(ctx, { x: ST.x, z: ST.z, dir: 's', w: ST.w, n: ST.n, rise: F1 / ST.n, run: ST.run, room, open: 'e', railTo: 9 });
  wb.setRoom(up);
  railing(ctx, hole[2] + 0.05, hole[1], hole[2] + 0.05, hole[3] - 0.5, F1, up);
  railing(ctx, hole[0], hole[1] - 0.05, hole[2] + 0.05, hole[1] - 0.05, F1, up);
  wb.setRoom(null);
  escala(ctx, L, {
    id: 'h_curtidor',
    room: up,
    x: ES.x,
    z: ES.z,
    y0: F1,
    y1: F2,
    rot: Math.PI,
    toUp: [ES.x - 0.9, F2, ES.z, -Math.PI / 2],
    toDown: [ES.x, F1, ES.z - 1.0, Math.PI],
    msgUp: 'curtidorSube',
    msgDown: 'curtidorBaja',
  });
  // ---- por fuera: el entramado de la fachada de las Curtidurías, el
  // rótulo de la bota, las pieles colgadas del alero, el farol
  wb.box('timber', R.x0, G1 - 0.04, R.z0 - 0.06, R.x1, G1 + 0.2, R.z0, { ao: false, faces: 'tnsewb', sub: 3 });
  wb.box('timber', R.x0, G1 - 0.04, R.z1, R.x1, G1 + 0.2, R.z1 + 0.06, { ao: false, faces: 'tnsewb', sub: 3 });
  wb.at(R.x1, 0, R.z0, Math.PI, () => timberFrame(ctx, R.x1 - R.x0, G1, R.h, [R.x1 - 56.4, R.x1 - 61.0], [1, -1, 0, 1, 0, -1]));
  wb.at(R.x0, 0, R.z1, 0, () => timberFrame(ctx, R.x1 - R.x0, G1, R.h, [60.2 - R.x0], [0, 1, -1, 0, 1, 0]));
  P.sign(ctx, D.x + 1.25, 2.95, R.z0, Math.PI, 0);
  P.lantern(ctx, D.x - 1.0, 2.75, R.z0, Math.PI, true);
  for (const [x, k] of [
    [55.0, 1],
    [57.6, 2],
    [59.9, 3],
    [62.8, 4],
  ]) {
    wb.box('wooddark', x - 0.03, R.h - 0.4, R.z0 - 0.75, x + 0.03, R.h - 0.34, R.z0, { ao: false });
    hide(ctx, x, R.h - 0.36, R.z0 - 0.62, 0, 0.75, 0.9 + (k % 2) * 0.2, 9500 + k, 'out');
  }
  // ---- dentro: el desván (el montón de vellones donde se cae; las pieles,
  // la corteza), el sobrado (la casa del curtidor) y el taller
  wb.setRoom(top);
  {
    const cx = (Hh.x0 + Hh.x1) / 2,
      cz = (hz0 + hz1) / 2 + 0.05;
    const rng = new RNG(9410);
    for (let k = 0; k < 14; k++) {
      const a = rng.range(0, Math.PI * 2),
        r = rng.range(0, 0.75);
      P.ellipsoid(ctx, 'straw', cx + Math.cos(a) * r, F2 + 0.08, cz + Math.sin(a) * r * 0.8, rng.range(0.25, 0.4), rng.range(0.1, 0.18), rng.range(0.2, 0.32), [0.86, 0.82, 0.72], { room: top });
    }
    ctx.col.add(cx - 0.85, F2, cz - 0.7, cx + 0.85, F2 + 0.18, cz + 0.7);
    for (let k = 0; k < 12; k++) {
      wb.push();
      wb.translate(cx + rng.range(-1.6, 1.6), F2 + 0.02, cz + rng.range(-1.2, 1.4));
      wb.rotateY(rng.range(0, 3));
      wb.box('roof', -0.13, 0, -0.09, 0.13, 0.04, 0.09, { ao: false, room: top, tint: [0.62, 0.56, 0.5] });
      wb.pop();
    }
  }
  for (let x = 58.0, k = 0; x < 62.0; x += 0.95, k++) hide(ctx, x, 8.1, 14.6, 0, 0.8, 1.0, 9520 + k, top);
  wb.push();
  wb.translate(57.5, 8.12, 14.6);
  wb.rotateZ(-Math.PI / 2);
  wb.cylinder('wooddark', 0, 0, 0, 0.035, 0.035, 5.0, 6, { ao: false, room: top });
  wb.pop();
  P.sacks(ctx, 63.0, F2, 13.3, 3, 9530);
  P.sacks(ctx, 55.2, F2, 13.2, 2, 9531);
  ctx.lights.push(
    { x: (Hh.x0 + Hh.x1) / 2, y: 7.6, z: (hz0 + hz1) / 2, r: 0.62, g: 0.68, b: 0.92, radius: 5.5, intensity: 0.9, room: top },
    { x: 62.0, y: 7.2, z: 15.8, r: 0.9, g: 0.6, b: 0.32, radius: 3.5, intensity: 0.35, room: top }
  );
  // el sobrado
  wb.setRoom(up);
  P.bed(ctx, 62.4, F1, 13.25, 0);
  chest(ctx, 60.6, F1, 12.75, 0, up);
  P.table(ctx, 58.4, F1, 16.6, 1.5, 0.8, 0.08);
  P.stool(ctx, 58.4, F1, 17.4, { room: up });
  P.stool(ctx, 57.5, F1, 16.2, { room: up, tipped: true });
  bowl(ctx, 58.0, F1 + 0.8, 16.5, 0.08, up, ['dirt', [0.35, 0.28, 0.22]]);
  saint(ctx, 'e', I.x0, F1 + 1.35, 17.6, up, 84, 'clothRed');
  P.candles(ctx, 58.9, F1 + 0.8, 16.7, 2, 9540, { room: up, radius: 5.5, intensity: 0.75, spread: 0.1 });
  ctx.lights.push({ x: 56.4, y: F1 + 1.4, z: I.z0 + 0.5, r: 0.7, g: 0.62, b: 0.6, radius: 3.5, intensity: 0.35, room: up }, { x: 61.0, y: F1 + 1.4, z: I.z0 + 0.5, r: 0.7, g: 0.62, b: 0.6, radius: 3.5, intensity: 0.35, room: up });
  // el taller: las pieles en remojo en una tina, los cueros apilados, el
  // banco, los toneles de zumaque y la tranca de la puerta
  wb.setRoom(room);
  limeVat(ctx, 62.6, 17.9, 0.6, room);
  for (let k = 0; k < 7; k++) {
    wb.push();
    wb.translate(60.0, 0.02 + k * 0.045, 18.5);
    wb.rotateY(0.2 + k * 0.5);
    wb.box(k % 2 ? 'leather' : 'hide', -0.6, 0, -0.45, 0.6, 0.045, 0.45, { ao: false, room, tint: k % 2 ? [0.62, 0.48, 0.36] : [0.74, 0.6, 0.48] });
    wb.pop();
  }
  ctx.col.add(59.35, 0, 17.95, 60.65, 0.33, 19.05);
  fleshingBeam(ctx, 58.0, 15.2, 0.1, room);
  P.barrel(ctx, 63.1, 0, 12.9);
  P.barrel(ctx, 63.1, 0, 13.7);
  P.barrel(ctx, 62.4, 0, 13.0, { lying: true, rot: 0.3 });
  P.table(ctx, 56.6, 0, 18.7, 1.6, 0.7, 0);
  for (let k = 0; k < 3; k++) wb.box('iron', 56.0 + k * 0.4, 0.8, 18.55, 56.06 + k * 0.4, 0.812, 18.85, { ao: false, room });
  hide(ctx, 60.15, G1 - 0.22, 15.6, Math.PI / 2, 0.8, 1.0, 9550, room);
  hide(ctx, 61.75, G1 - 0.22, 16.2, Math.PI / 2 + 0.1, 0.8, 1.1, 9551, room);
  P.hangingLamp(ctx, 59.0, G1 - 0.22, 14.4, { room, len: 0.5, radius: 6.5, intensity: 0.9, dyn: 1.0 });
  wb.setRoom(null);
  L.interact.push({ kind: 'door', id: 'd_curtidor', x: D.x, y: 0, z: R.z0 + T / 2, w: D.w, h: D.h, axis: 'x', lock: { type: 'barred', side: 1 }, mat: 'planks', hinge: -1, swing: -1, inset: 0.08 });
  S.paint(R.x0 + 0.01, R.z0 + 0.01, R.x1 - 0.01, R.z1 - 0.01, 1);
  S.paint(D.x - D.w / 2, R.z0 - 0.8, D.x + D.w / 2, R.z0 + 0.5, 1);
}

export function buildTejados(ctx, S, L) {
  if (!ctx.houseRects) ctx.houseRects = [];
  buildVelatorio(ctx, S, L);
  buildPellejero(ctx, S, L);
  buildVecinos(ctx, S, L);
  buildSecadero(ctx, S, L);
  buildPalomero(ctx, S, L);
  buildDovecote(ctx, S, L);
  buildTejadoQuemado(ctx, S, L);
  buildCurtidor(ctx, S, L);
  L.zones.push(
    { id: 'velatorio', rects: [[14, 42, 24, 50, -1, 3]], atmo: 'interior', room: 'velatorio' },
    { id: 'pellejero', rects: [[24, 42, 36, 50, -1, 3]], atmo: 'interior', room: 'pellejero' },
    { id: 'pellejero_alto', rects: [[24, 42, 36, 50, 3, 6.2]], atmo: 'interior', room: 'pellejeroAlta' },
    { id: 'vecinos', rects: [[36, 42, 48, 50, 3, 5.95]], atmo: 'interior', room: 'vecinos' },
    { id: 'desvan_cueros', rects: [[36, 42, 48, 50, 5.95, 11]], atmo: 'interior', room: 'desvanCueros' },
    { id: 'secadero', rects: [[48, 40, 61, 50, 5.95, 12]], atmo: 'city' },
    { id: 'palomar', rects: [[54.3, 33.3, 57.7, 36.7, 12.4, 16.5]], atmo: 'interior', room: 'palomar' },
    { id: 'palomero', rects: [[51, 30, 61, 40, 8.5, 12.4]], atmo: 'interior', room: 'palomero' },
    { id: 'curtidor', rects: [[54, 12, 64, 19.5, -1, 3]], atmo: 'interior', room: 'curtidor' },
    { id: 'curtidor_alto', rects: [[54, 12, 64, 19.5, 3, 5.95]], atmo: 'interior', room: 'curtidorAlta' },
    { id: 'curtidor_desvan', rects: [[54, 12, 64, 19.5, 5.95, 6.65]], atmo: 'interior', room: 'curtidorDesvan' },
    { id: 'tejados', rects: [[54, 19.5, 61, 30, 4.5, 9.5], [53.6, 11.5, 64.4, 19.6, 6.65, 11]], atmo: 'city' }
  );
  // (en los tejados, las caídas duelen; desde lo alto, matan)
  (L.fallZones || (L.fallZones = [])).push([44, 9, 66, 52]);
  L.map.push(
    { id: 'velatorio', r: [14, 42, 24, 50] },
    { id: 'pellejero', r: [24, 42, 36, 50] },
    { id: 'pellejero_alto', r: [24, 42, 36, 50], label: 'pellejero' },
    { id: 'vecinos', r: [36, 42, 48, 50] },
    { id: 'desvan_cueros', r: [36, 42, 48, 50] },
    { id: 'secadero', r: [48, 40, 61, 50] },
    { id: 'palomero', r: [51, 30, 61, 40] },
    { id: 'palomar', r: [54.3, 33.3, 57.7, 36.7], label: 'palomero' },
    { id: 'tejados', r: [54, 19.5, 61, 30] },
    { id: 'curtidor', r: [54, 12, 64, 19.5] },
    { id: 'curtidor_alto', r: [54, 12, 64, 19.5], label: 'curtidor' },
    { id: 'curtidor_desvan', r: [54, 12, 64, 19.5], label: 'curtidor' }
  );
}
