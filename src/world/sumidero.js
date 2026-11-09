// El Sumidero: donde desagua la lobera. Bajo la mitad de levante de las
// cloacas de la Sé, una caverna de roca viva, de las que ya estaban antes de
// los romanos, con un lago negro y muy hondo; los sumideros de la lobera
// (game: world/cloacas_hondas.js, LOBERA_AGUA) le echan el agua desde el
// techo en tres chorros, y por el del pozo de las ánimas baja también la
// luna. Se entra por la galería de levante de las cloacas viejas (de V20),
// que sale a una repisa a la altura de sus andenes; una senda baja por el
// muro de poniente a una playa de guijarros. El agua no se acaba: en lo más
// hondo, en la ensenada del sur, se abre una cueva (el venero) que lleva,
// bajo el agua, a la pila de la fuente del ninfeo de lo hondo: es el agua
// de la fuente de los romanos, que sube por ahí. La alumbra el musgo que da
// luz, que ha bajado de lo hondo por ella.
//
// Lo que se nada (el lago, el venero, su tiro y la pila), en NADO (lo usa
// game/nado.js); la roca, la rejilla H5 (y la H6 para el venero, bajo lo
// hondo): level.js.
import * as THREE from 'three';
import { RNG, fbm3, clamp, smoothstep } from '../core/util.js';
import * as P from './props.js';
import { cascada, KIT, restar } from './cloaca_kit.js';
import { hongos, musgo, raizLarga, helecho } from './verdor.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const SUMIDERO = {
  // el techo de la caverna (bajo la roca de la lobera), el lago y su fondo
  // (por encima de la clave de la galería de las viejas, -19,2: su arco no se
  // mete en el techo)
  techo: -19.0,
  agua: -28.0,
  fondo: -46.0,
  // la rejilla de la caverna (su roca) y la del venero, bajo lo hondo
  grid: { r: [-1, -60, 47.5, -11], y0: -47, y1: -19.0 },
  gridVenero: { r: [14, -13.5, 26, 8.5], y0: -47, y1: -37.6 },
  // el contorno de la caverna (los puntos de una curva cerrada)
  ctl: [
    [1.0, -40.0],
    [1.1, -46.0],
    [3.4, -51.0],
    [8.0, -55.2],
    [15.0, -57.9],
    [24.0, -58.4],
    [33.0, -57.2],
    [40.0, -53.6],
    [44.9, -46.0],
    [46.0, -37.0],
    [44.6, -28.0],
    [40.2, -20.6],
    [33.2, -15.6],
    [25.2, -13.6],
    [21.6, -12.2],
    [16.4, -12.2],
    [12.0, -14.6],
    [7.0, -18.0],
    [2.4, -21.0],
    [0.9, -27.0],
    [0.9, -34.0],
  ],
  // la boca de la galería de las viejas, en el muro de poniente
  boca: { x: 1.0, z: -40, y: -23.0 },
  // la repisa (a la altura de las viejas), con el canal que la cruza, y la
  // senda que baja por el muro a la playa
  repisa: { r: [0.6, -46.6, 6.4, -34.6], y: -23.0 },
  senda: { x0: 1.0, x1: 4.4, z0: -34.6, z1: -26.2, y0: -23.0, y1: -27.75 },
  playa: { x0: 0.8, x1: 10.0, z0: -27.6, z1: -18.6, xa: 2.2, ya: -27.75, xb: 10.0, yb: -29.7 },
  // las columnas de roca, del fondo al techo (x, z, radio)
  columnas: [
    [31.0, -47.0, 2.1],
    [22.5, -25.0, 1.6],
    [39.5, -36.5, 1.5],
  ],
  // el venero: la cueva del fondo, de su boca (en el muro de la ensenada del
  // sur) a la pila del ninfeo; su suelo y su techo suben de la boca al tiro
  venero: { x0: 18.2, x1: 20.8, z0: -13.2, z1: 6.6, suelo: [-46.0, -43.2], techo: [-43.6, -40.6] },
  tiro: [18.5, 4.6, 20.5, 6.6],
  // la pila de la fuente, en el ninfeo de lo hondo (su suelo, -35; su agua,
  // la del canal; su fondo)
  pila: { r: [17.0, 4.0, 22.0, 7.0], fondo: -37.4 },
};

// ------------------------------------------------------------------ el contorno
// (la curva cerrada por los puntos de control, cada ~0,7 m)
function contorno() {
  const C = SUMIDERO.ctl;
  const n = C.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p0 = C[(i - 1 + n) % n],
      p1 = C[i],
      p2 = C[(i + 1) % n],
      p3 = C[(i + 2) % n];
    const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const k = Math.max(2, Math.ceil(L / 0.7));
    for (let j = 0; j < k; j++) {
      const t = j / k,
        t2 = t * t,
        t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}
export const BORDE = contorno();

// ¿Dentro de la caverna (en planta)?
export function dentro(x, z) {
  let c = false;
  const B = BORDE;
  for (let i = 0, j = B.length - 1; i < B.length; j = i++) {
    const [xi, zi] = B[i],
      [xj, zj] = B[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
// Lo que hay hasta el muro (positivo dentro, negativo fuera).
export function dBorde(x, z) {
  let best = Infinity;
  const B = BORDE;
  for (let i = 0, j = B.length - 1; i < B.length; j = i++) {
    const [ax, az] = B[j],
      [bx, bz] = B[i];
    const dx = bx - ax,
      dz = bz - az;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < best) best = d;
  }
  return dentro(x, z) ? best : -best;
}
const enR = (x, z, r, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;

// La altura de la senda y de la playa (null fuera de ellas).
function sendaY(x, z) {
  const S = SUMIDERO.senda;
  if (x < S.x0 - 0.01 || x > S.x1 + 0.01 || z < S.z0 - 0.01 || z > S.z1 + 0.01) return null;
  return S.y0 + ((z - S.z0) / (S.z1 - S.z0)) * (S.y1 - S.y0);
}
function playaY(x, z) {
  const B = SUMIDERO.playa;
  // (por poniente sigue bajo el muro: su pie no se hunde)
  if (x < B.x0 - 2 || x > B.x1 || z < B.z0 || z > B.z1) return null;
  const t = clamp((x - B.xa) / (B.xb - B.xa), 0, 1);
  return B.ya + t * (B.yb - B.ya);
}

// El fondo del lago en (x, z) (con la playa): hondo enseguida, con su cantil
// junto al muro; lo más hondo, en la ensenada del venero.
export function lecho(x, z) {
  const S = SUMIDERO;
  const d = Math.max(0, dBorde(x, z));
  const n = fbm3(x * 0.16, 0.5, z * 0.16, 3, 7) - 0.5;
  let depth = 2.6 + 15.4 * smoothstep(0.4, 9, d) + n * 2.4;
  // (la ensenada: se hunde hacia la boca del venero)
  const dv = Math.hypot(x - 19.5, (z + 14.2) * 1.25);
  depth = Math.max(depth, (S.agua - S.fondo) * (1 - smoothstep(4, 12, dv)));
  let y = S.agua - clamp(depth, 1.5, S.agua - S.fondo);
  const py = playaY(x, z);
  if (py !== null) {
    // (la playa entra en el agua y acaba en un cantil)
    const B = S.playa;
    const fin = smoothstep(B.x1 - 1.2, B.x1, x) * smoothstep(B.z0, B.z0 + 1.0, z) * smoothstep(B.z1, B.z1 - 1.0, z);
    y = Math.max(y, py - fin * 3);
  }
  return y;
}
// El suelo de lo que se pisa o se nada (el lecho, la senda, la repisa).
export function sueloEn(x, z) {
  const R = SUMIDERO.repisa;
  if (enR(x, z, R.r)) return R.y - (Math.abs(z - SUMIDERO.boca.z) < 0.5 ? 0.4 : 0);
  const s = sendaY(x, z);
  return Math.max(s ?? -1e9, lecho(x, z));
}
// ¿Agua del lago? (dentro, y no en la repisa ni en la senda)
export function enLago(x, z) {
  return dentro(x, z) && !enR(x, z, SUMIDERO.repisa.r, 0.02) && sendaY(x, z) === null;
}
// Lo que falta hasta la orilla (para la espuma): el muro, la repisa, la
// senda o la raya del agua en la playa.
export function orilla(x, z) {
  const S = SUMIDERO;
  let d = Math.max(0, dBorde(x, z));
  const toR = (r) => Math.max(0, Math.max(r[0] - x, x - r[2], r[1] - z, z - r[3]));
  d = Math.min(d, toR(S.repisa.r), toR([S.senda.x0, S.senda.z0, S.senda.x1, S.senda.z1]));
  const B = S.playa;
  if (z > B.z0 && z < B.z1) {
    const xw = B.xa + ((S.agua - B.ya) / (B.yb - B.ya)) * (B.xb - B.xa);
    d = Math.min(d, Math.max(0, x - xw));
  }
  return d;
}

// Lo que se nada: { id, en(x, z), y0, y1 (el agua llega hasta y1), aire
// (se sale a respirar) }.
export const NADO = [
  { id: 'lago', en: (x, z) => dentro(x, z), y0: SUMIDERO.fondo - 1.5, y1: SUMIDERO.agua, aire: true },
  { id: 'venero', en: (x, z) => enR(x, z, [SUMIDERO.venero.x0, SUMIDERO.venero.z0, SUMIDERO.venero.x1, SUMIDERO.venero.z1]), y0: SUMIDERO.fondo - 1.5, y1: SUMIDERO.venero.techo[1], aire: false },
  { id: 'tiro', en: (x, z) => enR(x, z, SUMIDERO.tiro), y0: SUMIDERO.venero.techo[1] - 1, y1: SUMIDERO.pila.fondo, aire: false },
  { id: 'pila', en: (x, z) => enR(x, z, SUMIDERO.pila.r), y0: SUMIDERO.pila.fondo - 0.2, y1: -35 - KIT.agua, aire: true },
];

// ------------------------------------------------------------------ la caverna
// ctx, L; o.pozos: los sumideros de la lobera ([x0, z0, x1, z1]: sus tiros
// salen por el techo, con su chorro), o.room
export function buildSumidero(ctx, L, G5, G6, o = {}) {
  const S = SUMIDERO;
  const room = 'sumidero';
  const wb = ctx.wb,
    col = ctx.col;
  const pozos = o.pozos || [];
  // la roca: lo transitable de la caverna (todo lo de dentro del contorno) y
  // del venero
  for (const [Gr, r] of [
    [G5, S.grid.r],
    [G6, S.gridVenero.r],
  ])
    for (let x = r[0]; x < r[2]; x += 0.5) for (let z = r[1]; z < r[3]; z += 0.5) if (dentro(x + 0.25, z + 0.25)) Gr.paint(x, z, x + 0.5, z + 0.5, 1);
  const Vn = S.venero;
  G5.paint(Vn.x0, Vn.z0, Vn.x1, S.grid.r[3], 1);
  G6.paint(Vn.x0, Vn.z0, Vn.x1, Vn.z1, 1);
  wb.setRoom(room);
  paredes(ctx, room);
  techo(ctx, room, pozos);
  fondo(ctx, room);
  repisa(ctx, room, L);
  columnas(ctx, room);
  venero(ctx, room);
  // el techo, macizo hasta la roca de la lobera (que la cámara no se asome
  // por encima)
  const [gx0, gz0, gx1, gz1] = S.grid.r;
  col.add(gx0, S.techo - 0.04, gz0, gx1, -18.3, gz1).cam = true;
  // los chorros de los sumideros de la lobera, que caen al lago
  for (const r of pozos) {
    const cx = (r[0] + r[2]) / 2,
      cz = (r[1] + r[3]) / 2,
      w = Math.min(r[2] - r[0], r[3] - r[1]);
    // (una cortina gruesa que cae del techo: el agua de los canales que se
    // juntan arriba)
    cascada(ctx, { c: [cx - w * 0.25, cz], w: w * 0.7, y0: S.techo + 0.02, y1: S.agua, d: [1, 0], out: 0.05, open: 0.9, foam: 1.6, k: 1.2, luz: 0.32 });
    cascada(ctx, { c: [cx, cz - w * 0.25], w: w * 0.6, y0: S.techo + 0.02, y1: S.agua, d: [0, 1], out: 0.05, open: 0.8, foam: 1.2, k: 0.8, luz: 0.3 });
  }
  wb.setRoom(null);
  // el agua del lago (con su fondo, su orilla y la luna del pozo de las
  // ánimas, que cae por el sumidero de en medio)
  const pz = pozos[0] || [15, -36, 16, -35];
  const luna = [(pz[0] + pz[2]) / 2 + 0.3, (pz[1] + pz[3]) / 2 + 0.2];
  if (ctx.waters) {
    const [bx0, bz0, bx1, bz1] = bounds(0.4);
    ctx.waters.push({ shape: 'rect', r: [bx0, bz0, bx1, bz1], y: S.agua, poly: (x, z) => dBorde(x, z) > -1.1 && !enR(x, z, S.repisa.r) && sendaY(x, z) === null, bedFn: (x, z) => sueloEn(x, z), shoreFn: orilla, cell: 0.7, deep: 0x020507, sky: 0x0c141a, glint: 0xa8bcd8, tint: 0x1c3236, clear: 0.75, amb: 0x05080a, refl: 0.3, light: [luna[0], S.techo + 6, luna[1]], lightK: 0.8, spot: [luna[0], luna[1], 2.4, 0.9], flow: [0.03, -0.02], amp: 0.022 });
  }
  // la luna, que baja por el sumidero del pozo de las ánimas hasta el agua
  if (ctx.shafts) ctx.shafts.push({ a: [luna[0] - 0.3, S.techo - 0.05, luna[1] - 0.2], b: [luna[0], S.agua + 0.05, luna[1]], w: 1.3, color: 0x9fb4d4, k: 0.8 });
  if (ctx.dynLights) {
    ctx.dynLights.push({ x: luna[0], y: S.agua + 1.6, z: luna[1], intensity: 1.2, range: 9, color: 0xbfd2f4, flicker: 0, priority: 2 });
    // (lo verde del venero, desde el fondo)
    ctx.dynLights.push({ x: 19.5, y: S.fondo + 2.2, z: -14.6, intensity: 1.5, range: 11, color: 0x58e0b8, flicker: 0.04, priority: 1 });
  }
  luces(ctx, luna, pozos);
  musgos(ctx, room);
  // la zona, el mapa
  L.zones.push(
    // (el venero, hasta el fondo de la pila: en la pila, ya es lo hondo)
    { id: 'venero', rects: [[S.gridVenero.r[0], S.venero.z0 + 1.2, S.gridVenero.r[2], S.gridVenero.r[3], S.fondo - 1.5, S.pila.fondo - 0.2]], atmo: 'venero', room: 'venero' },
    { id: 'sumidero', rects: [[S.grid.r[0], S.grid.r[1], S.grid.r[2], S.grid.r[3], S.fondo - 1.5, S.techo + 0.2]], atmo: 'sumidero', room }
  );
  for (const r of G5.rects(1)) L.map.push({ id: 'sumidero', r, level: 'sumidero' });
  L.map.push({ id: 'venero', r: [Vn.x0, Vn.z0, Vn.x1, Vn.z1], level: 'sumidero' });
}

// (lo que abarca la caverna, con margen)
function bounds(m = 1) {
  let x0 = 1e9,
    z0 = 1e9,
    x1 = -1e9,
    z1 = -1e9;
  for (const [x, z] of BORDE) {
    x0 = Math.min(x0, x);
    z0 = Math.min(z0, z);
    x1 = Math.max(x1, x);
    z1 = Math.max(z1, z);
  }
  return [x0 - m, z0 - m, x1 + m, z1 + m];
}

// Los muros de roca, todo alrededor: del fondo (o de la repisa, la senda, la
// playa) al techo, abombados hacia fuera, más oscuros y verdes donde los moja
// el agua. Junto a la boca de la galería, lisos (la rosca del arco, a ras) y
// abiertos; en la ensenada, con la boca del venero.
function paredes(ctx, room) {
  const S = SUMIDERO;
  const wb = ctx.wb;
  const B = BORDE;
  const n = B.length;
  const K = 9;
  // (la normal hacia fuera de cada punto del contorno)
  const out = B.map((p, i) => {
    const a = B[(i - 1 + n) % n],
      b = B[(i + 1) % n];
    let nx = b[1] - a[1],
      nz = -(b[0] - a[0]);
    const l = Math.hypot(nx, nz) || 1;
    nx /= l;
    nz /= l;
    if (dentro(p[0] + nx * 0.3, p[1] + nz * 0.3)) {
      nx = -nx;
      nz = -nz;
    }
    return [nx, nz];
  });
  const boca = (x, z) => x < 2.2 && Math.abs(z - S.boca.z) < 2.05;
  const vb = (x, z) => x > S.venero.x0 - 0.15 && x < S.venero.x1 + 0.15 && z > -13.6;
  const col = (i) => {
    const [x, z] = B[i];
    const [nx, nz] = out[i];
    // el pie: lo que hay justo dentro
    const base = Math.min(sueloEn(x - nx * 0.6, z - nz * 0.6), sueloEn(x - nx * 0.2, z - nz * 0.2)) - 0.6;
    const pts = [];
    for (let k = 0; k <= K; k++) {
      const t = k / K;
      const y = base + (S.techo - base) * t;
      // (junto a la boca, a ras del arco)
      const near = Math.abs(z - S.boca.z) < 3.4 && x < 2.6 ? 0.06 : 1;
      // (fuera del contorno: lo justo para que no se meta uno en ella —la
      // roca de la rejilla llega a un palmo del contorno—, sin dejar un
      // hueco que parezca un muro invisible)
      const off = near * (0.38 + 0.4 * fbm3(x * 0.33, y * 0.42, z * 0.33, 3, 11));
      pts.push(V(x + nx * off, y, z + nz * off));
    }
    return pts;
  };
  const cols = B.map((_, i) => col(i));
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const A = cols[i],
      Bc = cols[j];
    const mx = (B[i][0] + B[j][0]) / 2,
      mz = (B[i][1] + B[j][1]) / 2;
    if (boca(mx, mz)) continue;
    for (let k = 0; k < K; k++) {
      const p0 = A[k],
        p1 = Bc[k],
        p2 = Bc[k + 1],
        p3 = A[k + 1];
      // (la boca del venero: el muro empieza en su techo)
      if (vb(mx, mz) && p3.y < S.venero.techo[0] + 0.1) continue;
      const yc = (p0.y + p3.y) / 2;
      const wet = yc < S.agua + 0.5;
      const tint = wet ? (yc > S.agua - 0.6 ? [0.3, 0.36, 0.3] : [0.24, 0.27, 0.25]) : [0.4, 0.4, 0.38];
      quadIn(wb, 'rock', p0, p1, p2, p3, out[i], { ao: false, room, tint, sub: 9 });
    }
    // (la boca del venero: el dintel, del techo de la cueva al muro)
    if (vb(mx, mz)) {
      const y0 = S.venero.techo[0];
      const a = V(B[i][0], y0, B[i][1]),
        b = V(B[j][0], y0, B[j][1]);
      const k0 = A.findIndex((p) => p.y >= y0 + 0.1);
      if (k0 > 0) quadIn(wb, 'rock', a, b, Bc[k0], A[k0], out[i], { ao: false, room, tint: [0.22, 0.26, 0.24], sub: 9 });
    }
  }
}

// Un cuadrilátero vuelto hacia dentro (contra la normal 'fuera').
function quadIn(wb, mat, p0, p1, p2, p3, fuera, o) {
  const U = new THREE.Vector3().subVectors(p1, p0),
    W = new THREE.Vector3().subVectors(p3, p0);
  const N = new THREE.Vector3().crossVectors(U, W);
  if (N.x * fuera[0] + N.z * fuera[1] > 0) wb.quad(mat, p0, p3, p2, p1, o);
  else wb.quad(mat, p0, p1, p2, p3, o);
}

// El techo: roca que cuelga (más junto al medio), con sus estalactitas y los
// agujeros de los sumideros de la lobera, por donde cae el agua.
function techo(ctx, room, pozos) {
  const S = SUMIDERO;
  const wb = ctx.wb;
  const [bx0, bz0, bx1, bz1] = bounds(1.4);
  const xs = new Set(),
    zs = new Set();
  for (let x = Math.floor(bx0); x <= Math.ceil(bx1); x += 1) xs.add(x);
  for (let z = Math.floor(bz0); z <= Math.ceil(bz1); z += 1) zs.add(z);
  for (const r of pozos) {
    xs.add(r[0]);
    xs.add(r[2]);
    zs.add(r[1]);
    zs.add(r[3]);
  }
  const X = [...xs].sort((a, b) => a - b),
    Z = [...zs].sort((a, b) => a - b);
  const dPozo = (x, z) => Math.min(99, ...pozos.map((r) => Math.hypot(Math.max(r[0] - x, 0, x - r[2]), Math.max(r[1] - z, 0, z - r[3]))));
  const yAt = (x, z) => {
    const d = dBorde(x, z);
    const k = smoothstep(0.3, 3.5, d) * smoothstep(0.15, 1.6, dPozo(x, z));
    return S.techo - k * (0.25 + 1.1 * fbm3(x * 0.21, 3.1, z * 0.21, 3, 23));
  };
  const Y = X.map((x) => Z.map((z) => yAt(x, z)));
  for (let i = 0; i < X.length - 1; i++)
    for (let j = 0; j < Z.length - 1; j++) {
      const x0 = X[i],
        x1 = X[i + 1],
        z0 = Z[j],
        z1 = Z[j + 1];
      const cx = (x0 + x1) / 2,
        cz = (z0 + z1) / 2;
      if (pozos.some((r) => cx > r[0] && cx < r[2] && cz > r[1] && cz < r[3])) continue;
      if (dBorde(cx, cz) < -1.3) continue;
      // (sobre la galería de las viejas, no: se metía en su bóveda)
      if (cx < SUMIDERO.boca.x && Math.abs(cz - SUMIDERO.boca.z) < 2.4) continue;
      // (mirando hacia abajo)
      wb.quad('rock', V(x0, Y[i][j], z0), V(x1, Y[i + 1][j], z0), V(x1, Y[i + 1][j + 1], z1), V(x0, Y[i][j + 1], z1), { ao: false, room, tint: [0.34, 0.34, 0.32], sub: 9 });
    }
  // las estalactitas
  const rr = new RNG(31701);
  for (let k = 0; k < 46; k++) {
    const x = rr.range(bx0, bx1),
      z = rr.range(bz0, bz1);
    if (dBorde(x, z) < 1.2 || pozos.some((r) => enR(x, z, r, 1.4))) continue;
    const top = yAt(x, z) + 0.15;
    const h = rr.range(0.4, 2.0),
      r = rr.range(0.08, 0.24) * (0.6 + h * 0.4);
    wb.cylinder('rock', x, top - h, z, 0.01, r, h, 6, { ao: false, room, tint: [0.4, 0.4, 0.37], phase: rr.range(0, 3) });
  }
}

// El fondo del lago y la playa (con sus guijarros), y su colisión.
function fondo(ctx, room) {
  const S = SUMIDERO;
  const wb = ctx.wb,
    col = ctx.col;
  const [bx0, bz0, bx1, bz1] = bounds(1.2);
  const N = 1;
  const nx = Math.ceil((bx1 - bx0) / N),
    nz = Math.ceil((bz1 - bz0) / N);
  const yA = [];
  for (let i = 0; i <= nx; i++) {
    yA.push([]);
    for (let j = 0; j <= nz; j++) yA[i].push(lecho(bx0 + i * N, bz0 + j * N));
  }
  const B = S.playa;
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const x0 = bx0 + i * N,
        z0 = bz0 + j * N,
        x1 = x0 + N,
        z1 = z0 + N;
      const cx = x0 + N / 2,
        cz = z0 + N / 2;
      if (dBorde(cx, cz) < -1.0) continue;
      const y = (yA[i][j] + yA[i + 1][j + 1]) / 2;
      const grava = cx > B.x0 && cx < B.x1 && cz > B.z0 && cz < B.z1 && y > S.agua - 1.6;
      wb.quad(grava ? 'dirt' : 'rock', V(x0, yA[i][j], z0), V(x0, yA[i][j + 1], z1), V(x1, yA[i + 1][j + 1], z1), V(x1, yA[i + 1][j], z0), { ao: false, room, tint: grava ? [0.5, 0.47, 0.4] : y > S.agua - 4 ? [0.3, 0.32, 0.27] : [0.22, 0.24, 0.21], sub: 9 });
    }
  // la colisión: el fondo, a trozos de metro y medio (lo más alto de cada
  // trozo: no se hunde uno en la roca), salvo la playa y la senda, que son
  // rampas
  const M = 1.5;
  for (let x = bx0; x < bx1; x += M)
    for (let z = bz0; z < bz1; z += M) {
      const cx = x + M / 2,
        cz = z + M / 2;
      if (dBorde(cx, cz) < -0.8) continue;
      let top = -1e9;
      for (const [a, b] of [
        [0, 0],
        [M, 0],
        [0, M],
        [M, M],
        [M / 2, M / 2],
      ])
        top = Math.max(top, lecho(x + a, z + b));
      if (playaY(cx, cz) !== null && cx < S.playa.x1 - 1.2 && top > S.agua - 3) continue;
      col.add(x, top - 2, z, x + M, top, z + M, 'floor').cam = true;
    }
  // la playa: una rampa que entra en el agua (y la senda que baja a ella)
  col.addRamp(B.x0, B.z0, B.x1 - 1.2, B.z1, 'x', B.xa, B.ya, B.xb, B.yb);
  col.add(B.x0, B.ya - 3, B.z0, B.xa, B.ya, B.z1, 'floor').cam = true;
  // guijarros, algún hueso, maderas que trajo el agua
  const rr = new RNG(31801);
  for (let k = 0; k < 26; k++) {
    const x = rr.range(B.x0 + 0.5, B.x1 - 2),
      z = rr.range(B.z0 + 0.6, B.z1 - 0.6);
    if (dBorde(x, z) < 0.5) continue;
    const y = Math.max(lecho(x, z), sendaY(x, z) ?? -1e9);
    P.ellipsoid(ctx, 'rock', x, y + 0.02, z, rr.range(0.08, 0.22), rr.range(0.05, 0.1), rr.range(0.08, 0.2), [0.5, 0.48, 0.44], { room });
  }
  for (let k = 0; k < 4; k++) {
    const x = rr.range(3, 8),
      z = rr.range(-26, -20);
    wb.at(x, lecho(x, z) + 0.04, z, rr.range(0, Math.PI), () => wb.box('planks', -0.8, 0, -0.1, 0.8, 0.06, 0.1, { ao: false, faces: 'tnsewb', room, tint: [0.36, 0.3, 0.24] }));
  }
  P.bones(ctx, 6.2, lecho(6.2, -22.5), -22.5, 7, 31811, 0.6);
  // lo que hay en el fondo: huesos y cascotes, rejas caídas, un carretón
  for (let k = 0; k < 14; k++) {
    const x = rr.range(8, 42),
      z = rr.range(-55, -16);
    if (!enLago(x, z) || dBorde(x, z) < 2) continue;
    const y = lecho(x, z);
    if (k % 3 === 0) P.bones(ctx, x, y, z, 6, 31820 + k, 0.7);
    else P.rubble(ctx, x, y, z, 5, 31840 + k, 0.9, { tint: [0.3, 0.3, 0.28] });
  }
  wb.at(27.0, lecho(27.0, -36.8) + 0.05, -36.8, 0.6, () => {
    for (let i = 0; i < 6; i++) wb.box('iron', -0.6 + i * 0.24, 0, -0.5, -0.56 + i * 0.24, 0.05, 0.5, { ao: false, faces: 'tnsewb', room, tint: [0.36, 0.3, 0.26] });
  });
}

// La repisa de la entrada (con el canal que la cruza y su chorro al lago) y
// la senda que baja por el muro a la playa; sus cantiles, de roca, hasta el
// fondo.
function repisa(ctx, room, L) {
  const S = SUMIDERO;
  const wb = ctx.wb,
    col = ctx.col;
  const R = S.repisa;
  const [x0, z0, x1, z1] = R.r;
  const y = R.y;
  const cz0 = S.boca.z - 0.5,
    cz1 = S.boca.z + 0.5;
  const lechoC = y - KIT.prof;
  // (lo de la galería, que llega hasta la línea del muro de la caverna: su
  // suelo y sus jambas; ahí no va la repisa, o se pisarían los dos suelos)
  const bx = S.boca.x;
  const gal = [x0, S.boca.z - KIT.w / 2 - KIT.ring, bx, S.boca.z + KIT.w / 2 + KIT.ring];
  // lo de arriba: la roca, a trozos (sin el canal ni la galería)
  const top = (r, yy, mat, tint) => {
    for (const [a, b, c, d] of restar(r, [gal])) {
      if (c - a < 0.01 || d - b < 0.01) continue;
      wb.box(mat, a, yy - 0.1, b, c, yy, d, { faces: 't', ao: false, sub: 1.5, room, tint });
    }
  };
  top([x0, z0, x1, cz0], y, 'rock', [0.44, 0.43, 0.4]);
  top([x0, cz1, x1, z1], y, 'rock', [0.44, 0.43, 0.4]);
  top([x0, cz0, x1, cz1], lechoC, 'mossstone', [0.3, 0.36, 0.28]);
  // (los cantos del canal)
  wb.box('rock', bx, lechoC, cz0 - 0.01, x1, y, cz0, { faces: 's', ao: false, sub: 1.5, room, tint: [0.36, 0.38, 0.34] });
  wb.box('rock', bx, lechoC, cz1, x1, y, cz1 + 0.01, { faces: 'n', ao: false, sub: 1.5, room, tint: [0.36, 0.38, 0.34] });
  if (ctx.waters) ctx.waters.push({ shape: 'rect', r: [bx + 0.005, cz0 + 0.005, x1 - 0.005, cz1 - 0.005], y: y - KIT.agua, flow: [0.5, 0], amp: 0.016, deep: 0x050807, sky: 0x0e1416, glint: 0x6a8090, tint: 0x2e3e38, light: [x1, y + 2.4, S.boca.z], lightK: 0.3, drips: false });
  cascada(ctx, { c: [x1 + 0.02, S.boca.z], w: 0.92, y0: y - KIT.agua, y1: S.agua, d: [1, 0], out: 0.35, open: 0.45, foam: 1.0, k: 1, luz: 0.3 });
  // los cantiles: de la repisa al fondo (al este y al norte), a trozos, con
  // la roca que asoma
  const cantil = (pts, fuera, yt = (u, v) => sendaY(u - fuera[0] * 0.05, v - fuera[1] * 0.05) ?? y) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i],
        [bx, bz] = pts[i + 1];
      const yb = Math.min(lecho(ax + fuera[0] * 0.5, az + fuera[1] * 0.5), lecho(bx + fuera[0] * 0.5, bz + fuera[1] * 0.5)) - 0.5;
      const K = 5;
      for (let k = 0; k < K; k++) {
        const ya0 = yb + (yt(ax, az) - yb) * (k / K),
          ya1 = yb + (yt(ax, az) - yb) * ((k + 1) / K);
        const yb0 = yb + (yt(bx, bz) - yb) * (k / K),
          yb1 = yb + (yt(bx, bz) - yb) * ((k + 1) / K);
        const o = (xx, yy, zz) => {
          const f = k === K - 1 && yy > yb + 1 ? 0 : -0.25 * fbm3(xx * 0.5, yy * 0.6, zz * 0.5, 2, 5);
          return V(xx + fuera[0] * f, yy, zz + fuera[1] * f);
        };
        const wet = (ya0 + ya1) / 2 < S.agua + 0.4;
        quadIn(wb, 'rock', o(ax, ya0, az), o(bx, yb0, bz), o(bx, yb1, bz), o(ax, ya1, az), [-fuera[0], -fuera[1]], { ao: false, room, sub: 9, tint: wet ? [0.25, 0.29, 0.26] : [0.4, 0.4, 0.37] });
      }
    }
  };
  const step = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
  // (el de levante de la repisa, a los dos lados del canal, que sale por
  // él; y el del norte, hasta el muro)
  cantil(step(z0, cz0, 5).map((z) => [x1, z]), [1, 0], () => y);
  cantil([[x1, cz0], [x1, cz1]], [1, 0], () => lechoC);
  cantil(step(cz1, z1, 4).map((z) => [x1, z]), [1, 0], () => y);
  cantil(step(x0, x1, 7).map((x) => [x, z0]), [0, -1]);
  // (y el del sur, de la senda al canto de levante)
  cantil(step(S.senda.x1, x1, 3).map((x) => [x, z1]), [0, 1], () => y);
  // la senda: su rampa, su cantil de levante, y el de su pie, en la playa
  const Sd = S.senda;
  const n = 10;
  for (let i = 0; i < n; i++) {
    const za = Sd.z0 + ((Sd.z1 - Sd.z0) * i) / n,
      zb = Sd.z0 + ((Sd.z1 - Sd.z0) * (i + 1)) / n;
    const ya = sendaY(Sd.x0, za),
      yb2 = sendaY(Sd.x0, zb);
    // (a peldaños tallados, de roca: la rampa es la colisión)
    wb.quad('rock', V(Sd.x0, ya, za), V(Sd.x0, yb2, zb), V(Sd.x1, yb2, zb), V(Sd.x1, ya, za), { ao: false, room, tint: [0.46, 0.44, 0.4], sub: 9 });
  }
  cantil(step(Sd.z0, Sd.z1, 9).map((z) => [Sd.x1, z]), [1, 0]);
  // la colisión: la repisa (maciza hasta el fondo), el canal, la senda
  const yf = S.fondo - 1;
  col.add(x0, yf, z0, x1, y, cz0, 'floor').cam = true;
  col.add(x0, yf, cz1, x1, y, z1, 'floor').cam = true;
  col.add(x0, yf, cz0, x1, lechoC, cz1, 'floor').cam = true;
  col.addRamp(Sd.x0, Sd.z0, Sd.x1, Sd.z1, 'z', Sd.z0, Sd.y0, Sd.z1, Sd.y1);
  col.add(Sd.x0, yf, Sd.z0, Sd.x1, Sd.y1 - 0.2, Sd.z1, 'floor').cam = true;
  // lo que hay en la repisa: los restos de un pocero, su farol, una cuerda
  // atada a una argolla, que baja al agua
  P.bones(ctx, 3.0, y, -44.4, 10, 31901, 0.6);
  P.ellipsoid(ctx, 'burlap', 2.4, y + 0.14, -44.0, 0.2, 0.14, 0.42, [0.42, 0.38, 0.32], { room });
  wb.cylinder('iron', 3.6, y, -43.6, 0.07, 0.07, 0.18, 6, { ao: false, capTop: true, room, tint: [0.4, 0.36, 0.3] });
  wb.box('iron', 6.05, y, -37.3, 6.3, y + 0.12, -37.05, { ao: false, faces: 'tnsew', room, tint: [0.36, 0.3, 0.26] });
  P.rod(ctx, V(6.2, y + 0.08, -37.2), V(6.6, S.agua - 0.2, -37.0), 0.02, 0.02, 'rope', { segs: 4 });
  musgo(ctx, 5.2, y, -45.5, 0.7, 0.5, 31911, { room, n: 6, k: [0.6, 0.75, 0.6] });
  hongos(ctx, 1.6, y, -36.0, 6, 31912, { room, luz: true, s: 0.9, r: 0.3 });
  L.interact.push({ kind: 'examine', id: 'x_sumidero', text: 'sumideroLago', x: 5.4, y, z: -37.6, r: 1.6 });
}

// Las columnas: roca que baja del techo y sube del fondo hasta juntarse,
// con la cintura donde la come el agua.
function columnas(ctx, room) {
  const S = SUMIDERO;
  const wb = ctx.wb;
  for (const [cx, cz, r] of S.columnas) {
    const yb = lecho(cx, cz) - 0.6,
      yt = S.techo + 0.05;
    const K = 10,
      A = 10;
    const ring = (k) => {
      const t = k / K;
      const y = yb + (yt - yb) * t;
      // (ancha abajo y arriba; estrecha a la altura del agua)
      const wy = clamp(Math.abs(y - S.agua) / 6, 0, 1);
      const rad = r * (0.72 + 0.55 * wy * wy);
      const pts = [];
      for (let a = 0; a <= A; a++) {
        const ang = (a / A) * Math.PI * 2;
        const e = rad * (0.85 + 0.35 * fbm3(cx + Math.cos(ang) * 2, y * 0.35, cz + Math.sin(ang) * 2, 2, 41));
        pts.push(V(cx + Math.cos(ang) * e, y, cz + Math.sin(ang) * e));
      }
      return pts;
    };
    const R = Array.from({ length: K + 1 }, (_, k) => ring(k));
    for (let k = 0; k < K; k++)
      for (let a = 0; a < A; a++) {
        const p0 = R[k][a],
          p1 = R[k][a + 1],
          p2 = R[k + 1][a + 1],
          p3 = R[k + 1][a];
        const mx = (p0.x + p1.x) / 2 - cx,
          mz = (p0.z + p1.z) / 2 - cz;
        const yc = (p0.y + p3.y) / 2;
        // (hacia fuera de la columna: quadIn con la normal al revés)
        quadIn(wb, 'rock', p0, p1, p2, p3, [-mx, -mz], { ao: false, room, sub: 9, tint: yc < S.agua + 0.4 ? [0.24, 0.28, 0.25] : [0.42, 0.42, 0.39] });
      }
    // la colisión, por tramos de su altura, con su anchura (más estrecha que
    // lo que se ve: no se para uno antes de tocarla): un octógono, dos cajas,
    // una girada (antes, una sola caja del ancho de la cintura; bajo el agua,
    // donde la columna se ensancha, se metía uno en ella nadando)
    const radAt = (k) => {
      const y = yb + ((yt - yb) * k) / K;
      const wy = clamp(Math.abs(y - S.agua) / 6, 0, 1);
      return r * (0.72 + 0.55 * wy * wy);
    };
    for (let k = 0; k < K; k++) {
      const y0 = yb + ((yt - yb) * k) / K,
        y1 = yb + ((yt - yb) * (k + 1)) / K;
      const h = Math.min(radAt(k), radAt(k + 1)) * 0.86;
      ctx.col.addOBB(cx, cz, h, h, 0, k === 0 ? y0 - 1 : y0, y1).cam = true;
      ctx.col.addOBB(cx, cz, h, h, Math.PI / 4, k === 0 ? y0 - 1 : y0, y1).cam = true;
    }
  }
}

// El venero: la cueva bajo el agua, de la ensenada del sur del lago al tiro
// que sube a la pila del ninfeo. Roca, a trozos (la colisión, en cajas: el
// suelo y el techo de cada tramo, y la rejilla para los lados); el musgo que
// da luz por las paredes, que va diciendo por dónde.
function venero(ctx, room) {
  const S = SUMIDERO;
  const Vn = S.venero;
  const wb = ctx.wb,
    col = ctx.col;
  const rm = 'venero';
  wb.setRoom(rm);
  const L = Vn.z1 - Vn.z0;
  const n = Math.ceil(L / 1.0);
  const cx = (Vn.x0 + Vn.x1) / 2;
  const hw = (Vn.x1 - Vn.x0) / 2;
  const at = (t) => ({ fl: Vn.suelo[0] + (Vn.suelo[1] - Vn.suelo[0]) * t, ce: Vn.techo[0] + (Vn.techo[1] - Vn.techo[0]) * t });
  // (los aros de la cueva: un óvalo de roca alrededor del paso)
  const A = 12;
  const aro = (i) => {
    const t = i / n;
    const z = Vn.z0 + L * t;
    const { fl, ce } = at(t);
    const yc = (fl + ce) / 2,
      hh = (ce - fl) / 2;
    const pts = [];
    for (let a = 0; a <= A; a++) {
      const ang = (a / A) * Math.PI * 2;
      const k = 1.12 + 0.3 * fbm3(cx + Math.cos(ang) * 3, z * 0.4, yc + Math.sin(ang) * 3, 2, 51);
      // (un óvalo achatado: el suelo, casi llano)
      const sy = Math.sin(ang);
      pts.push(V(cx + Math.cos(ang) * hw * k, yc + sy * hh * (sy < 0 ? 1.02 : k), z));
    }
    return pts;
  };
  const R = Array.from({ length: n + 1 }, (_, i) => aro(i));
  for (let i = 0; i < n; i++)
    for (let a = 0; a < A; a++) {
      const p0 = R[i][a],
        p1 = R[i][a + 1],
        p2 = R[i + 1][a + 1],
        p3 = R[i + 1][a];
      // (en el tiro, el techo abierto)
      const mz = (p0.z + p2.z) / 2,
        mx = (p0.x + p1.x) / 2,
        my = (p0.y + p1.y) / 2;
      const zt = S.tiro;
      // (sólo lo que cae dentro de su planta: alrededor, la cueva sigue
      // cerrada, y el tiro baja un poco dentro de ella)
      if (mz > zt[1] && mz < zt[3] && my > at(1).ce - 1.0 && mx > zt[0] && mx < zt[2]) continue;
      const fx = mx - cx,
        fy = my - (at(i / n).fl + at(i / n).ce) / 2;
      const N = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(p1, p0), new THREE.Vector3().subVectors(p3, p0));
      const tint = fy < -0.6 ? [0.3, 0.32, 0.27] : [0.32, 0.36, 0.33];
      // (hacia dentro: contra lo que se aleja del eje)
      if (N.x * fx + N.y * fy > 0) wb.quad('rock', p0, p3, p2, p1, { ao: false, room: rm, sub: 9, tint });
      else wb.quad('rock', p0, p1, p2, p3, { ao: false, room: rm, sub: 9, tint });
    }
  // (el fondo de la cueva, al final: un tapón de roca, abombado)
  {
    const last = R[n];
    const yc = (at(1).fl + at(1).ce) / 2;
    const mid = last.map((q) => V(cx + (q.x - cx) * 0.55, yc + (q.y - yc) * 0.55, Vn.z1 + 0.9));
    const c = V(cx, yc, Vn.z1 + 1.5);
    for (let a = 0; a < A; a++) {
      wb.quad('rock', last[a], mid[a], mid[a + 1], last[a + 1], { ao: false, room: rm, tint: [0.2, 0.22, 0.2], sub: 9 });
      wb.tri('rock', mid[a + 1], mid[a], c, { ao: false, room: rm, tint: [0.16, 0.18, 0.16] });
    }
  }
  // el tiro: cuatro caras, del techo de la cueva al fondo de la pila
  const T = S.tiro;
  const yt0 = at(1).ce - 0.45,
    yt1 = S.pila.fondo;
  const Tt = [0.3, 0.36, 0.3];
  wb.box('rock', T[0], yt0, T[1] - 0.3, T[2], yt1, T[1], { faces: 's', ao: false, sub: 1, room: rm, tint: Tt });
  wb.box('rock', T[0], yt0, T[3], T[2], yt1, T[3] + 0.3, { faces: 'n', ao: false, sub: 1, room: rm, tint: Tt });
  wb.box('rock', T[0] - 0.3, yt0, T[1], T[0], yt1, T[3], { faces: 'e', ao: false, sub: 1, room: rm, tint: Tt });
  wb.box('rock', T[2], yt0, T[1], T[2] + 0.3, yt1, T[3], { faces: 'w', ao: false, sub: 1, room: rm, tint: Tt });
  // la colisión: el suelo y el techo, por tramos de un metro (salvo el tiro)
  for (let i = 0; i < n; i++) {
    const za = Vn.z0 + (L * i) / n,
      zb = Vn.z0 + (L * (i + 1)) / n;
    const a = at(i / n),
      b = at((i + 1) / n);
    col.add(Vn.x0 - 0.5, Math.min(a.fl, b.fl) - 2, za, Vn.x1 + 0.5, Math.max(a.fl, b.fl), zb, 'floor').cam = true;
    // (el techo: hasta la roca de lo de arriba; en la ensenada, hasta el
    // techo de la caverna, salvo lo que es lago)
    const yTop = zb > -11 ? S.gridVenero.y1 + 0.2 : S.techo;
    if (zb > T[1] - 0.05 && za < T[3] + 0.05) {
      // (alrededor del tiro)
      col.add(Vn.x0 - 0.5, Math.min(a.ce, b.ce), za, T[0], yTop, zb).cam = true;
      col.add(T[2], Math.min(a.ce, b.ce), za, Vn.x1 + 0.5, yTop, zb).cam = true;
      if (za < T[1]) col.add(T[0], Math.min(a.ce, b.ce), za, T[2], yTop, T[1]).cam = true;
      if (zb > T[3]) col.add(T[0], Math.min(a.ce, b.ce), T[3], T[2], yTop, zb).cam = true;
    } else if (!(za < -12.2 && dentro(cx, za))) col.add(Vn.x0 - 0.5, Math.min(a.ce, b.ce), za, Vn.x1 + 0.5, yTop, zb).cam = true;
  }
  // (el tiro, macizo por fuera hasta la pila)
  col.add(T[0] - 0.4, yt0, T[1] - 0.4, T[0], yt1, T[3] + 0.4).cam = true;
  col.add(T[2], yt0, T[1] - 0.4, T[2] + 0.4, yt1, T[3] + 0.4).cam = true;
  col.add(T[0], yt0, T[1] - 0.4, T[2], yt1, T[1]).cam = true;
  col.add(T[0], yt0, T[3], T[2], yt1, T[3] + 0.4).cam = true;
  // el musgo que da luz, por las paredes (más cuanto más cerca de lo hondo)
  const rr = new RNG(32001);
  for (let i = 0; i < 26; i++) {
    const t = rr.range(0, 1);
    const z = Vn.z0 + L * t;
    const { fl, ce } = at(t);
    const sd = rr.chance(0.5) ? -1 : 1;
    const y = rr.range(fl + 0.2, ce - 0.3);
    P.ellipsoid(ctx, 'musgoGlow', cx + sd * (hw + 0.12), y, z, 0.06, rr.range(0.1, 0.26), rr.range(0.12, 0.34), null, { room: rm });
  }
  for (let i = 0; i < 9; i++) {
    const t = rr.range(0.05, 1);
    const z = Vn.z0 + L * t;
    hongos(ctx, cx + rr.range(-0.9, 0.9), at(t).fl + 0.02, z, 4, 32040 + i, { room: rm, luz: true, s: 0.8, r: 0.3 });
  }
  // (las raíces de lo hondo, que bajan por el tiro)
  for (let k = 0; k < 4; k++) raizLarga(ctx, T[0] + 0.2 + k * 0.35, yt1 - 0.05, T[1] + 0.25 + (k % 2) * 0.9, rr.range(1.2, 2.6), 32060 + k, { room: rm, r: 0.03, tint: [0.42, 0.36, 0.28] });
  wb.setRoom(room);
  // en la boca del venero, en el fondo del lago, el musgo
  for (let i = 0; i < 16; i++) {
    const a = rr.range(0, Math.PI * 2),
      d = rr.range(1.0, 4.5);
    const x = cx + Math.cos(a) * d,
      z = -14.6 + Math.sin(a) * d * 0.7;
    if (!dentro(x, z)) continue;
    const y = lecho(x, z);
    P.ellipsoid(ctx, 'musgoGlow', x, y + 0.04, z, rr.range(0.15, 0.4), 0.05, rr.range(0.15, 0.35), null, { room });
  }
  helecho(ctx, cx - 1.6, lecho(cx - 1.6, -15.5), -15.5, 0.8, 32091, { room, k: [0.5, 0.9, 0.8] });
}

// El musgo que da luz, que ha subido de lo hondo por el venero: en matas
// por los muros, a ras del agua (dibuja la orilla en lo negro) y, aquí y
// allá, más arriba; con su poco de luz verde alrededor.
function musgos(ctx, room) {
  const S = SUMIDERO;
  const B = BORDE;
  const rr = new RNG(32201);
  const n = B.length;
  for (let i = 0; i < n; i += 3 + rr.int(0, 3)) {
    const [x, z] = B[i];
    // (no en la repisa, la senda ni la playa: ahí está seco)
    if (x < 9 && z > -47 && z < -18) continue;
    const a = B[(i - 1 + n) % n],
      b = B[(i + 1) % n];
    let nx = b[1] - a[1],
      nz = -(b[0] - a[0]);
    const l = Math.hypot(nx, nz) || 1;
    nx /= l;
    nz /= l;
    if (dentro(x + nx * 0.3, z + nz * 0.3)) {
      nx = -nx;
      nz = -nz;
    }
    // (pegado al muro, que está algo más fuera que el contorno)
    const k = rr.int(2, 5);
    for (let q = 0; q < k; q++) {
      const off = 0.42 + rr.range(0, 0.18);
      const t = rr.range(-0.8, 0.8);
      const px = x + nx * off - nz * t,
        pz = z + nz * off + nx * t;
      const y = S.agua + (q === 0 ? rr.range(-0.05, 0.35) : rr.range(0.3, 2.6));
      P.ellipsoid(ctx, 'musgoGlow', px, y, pz, rr.range(0.1, 0.32), rr.range(0.06, 0.2), rr.range(0.1, 0.32), null, { room });
    }
    if (rr.chance(0.45)) ctx.lights.push({ x: x - nx * 0.6, y: S.agua + 0.8, z: z - nz * 0.6, r: 0.3, g: 0.85, b: 0.6, radius: 3.6, intensity: 0.55, room });
  }
}

// La luz horneada: casi nada (el agua negra, los muros que apenas se ven),
// la luna del sumidero del pozo, lo verde del venero y sus musgos, la boca
// de la galería; y en el venero, el verde por tramos.
function luces(ctx, luna, pozos) {
  const S = SUMIDERO;
  const Lg = (x, y, z, r, g, b, radius, intensity, room) => ctx.lights.push({ x, y, z, r, g, b, radius, intensity, room });
  // (un fondo frío, muy poco, para que se adivinen los muros)
  for (let x = 6; x < 46; x += 8) for (let z = -54; z < -14; z += 8) if (dentro(x, z)) Lg(x, S.agua + 3.5, z, 0.22, 0.28, 0.34, 11, 0.42, 'sumidero');
  Lg(luna[0], S.agua + 0.8, luna[1], 0.52, 0.62, 0.84, 8, 1.3, 'sumidero');
  Lg(luna[0], S.techo - 1, luna[1], 0.5, 0.6, 0.8, 5, 0.8, 'sumidero');
  for (const r of pozos) Lg((r[0] + r[2]) / 2, S.agua + 0.6, (r[1] + r[3]) / 2, 0.36, 0.44, 0.5, 5, 0.6, 'sumidero');
  // (la boca de la galería y la repisa)
  Lg(3.2, S.boca.y + 1.6, S.boca.z, 0.3, 0.34, 0.36, 6, 0.5, 'sumidero');
  // (lo verde: la boca del venero, en el fondo; y el venero, entero)
  Lg(19.5, S.fondo + 1.6, -14.6, 0.3, 0.9, 0.72, 10, 1.6, 'sumidero');
  Lg(19.5, S.fondo + 5.5, -17.5, 0.26, 0.7, 0.6, 9, 0.7, 'sumidero');
  const Vn = S.venero;
  for (let z = Vn.z0; z <= Vn.z1; z += 4) {
    const t = (z - Vn.z0) / (Vn.z1 - Vn.z0);
    const y = Vn.suelo[0] + (Vn.suelo[1] - Vn.suelo[0]) * t + 1.2;
    Lg(19.5, y, z, 0.3, 0.86, 0.7, 6, 1.1, 'venero');
  }
  Lg(19.5, S.pila.fondo - 1.5, (S.tiro[1] + S.tiro[3]) / 2, 0.4, 0.9, 0.8, 5, 1.2, 'venero');
}
