// La cripta honda: las catacumbas bajo la Sé y la Antesala del Dios Ignoto.
//
// Bajo la cripta de siempre (la sala de llegada, el osario, el sepulcro y el
// templo romano) se abre una red de galerías mucho mayor:
//
//  - La Galería del Sello, de poniente a levante, al fondo del osario: une
//    todo lo de abajo.
//  - Las Catacumbas (al oeste): un laberinto de pasillos con nichos, salas
//    de enterramiento y callejones sin salida. Dentro, la Cámara de la Garra
//    (la Garra de Oro, con su emboscada) y la Pila de los Inocentes.
//  - Las Catacumbas del Este, más pequeñas, con la Pila de los Mártires; y la
//    Sacristía del Arzobispo (se abre con su anillo), con el incienso negro.
//  - La Capilla de San Martín (un altar donde descansar).
//  - La Antesala del Dios Ignoto: una sala de tres naves, honda (se baja a
//    ella por una escalinata), con la puerta del dios en lo alto de un
//    estrado. La guardan los Velados. Al fondo, la Pila de los Condenados.
//
// La puerta (game/crypt.js) pide cuatro cosas: los dos Velados vencidos, la
// Garra de Oro en su cerradura, los cinco círculos de sangre llenos (las tres
// pilas vaciadas: su sangre llora por las cabezas del dintel) y el incensario
// del estrado encendido con el incienso negro.
//
// Las salas se describen como rectángulos transitables (con su suelo y su
// techo); los muros los levanta carve() a partir de la planta, con sus
// cabeceras donde una sala más alta da a otra más baja.
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { stairs, archRing, barrelVault, lunette, pilaster, archedWall } from './builders.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Y = -7; // la cripta
const AY = -10; // la cisterna (y el estrado de la puerta)
const DY = -13; // el suelo de la antesala
const ROOM = 'crypt';
const CT = [0.74, 0.74, 0.7], // muros
  VT = [0.68, 0.68, 0.65], // bóvedas
  AT = [0.88, 0.85, 0.79]; // arcos, pilastras y columnas
const ST = [0.85, 0.82, 0.78]; // huesos

export const DEEP = {
  Y,
  AY,
  DY,
  // la galería del sello y la boca del osario
  gallery: { x0: -54.5, x1: 33, z0: -136, z1: -133.5, top: Y + 3.8 },
  ossDoor: { x0: -1.5, x1: 1.5, z0: -133.5, z1: -133, top: Y + 3.2 },
  // las catacumbas del oeste: 9 x 9 celdas de 4 m
  maze: { x0: -58, z0: -132, nx: 9, nz: 9, cs: 4, seed: 4417 },
  claw: { x0: -57.5, z0: -119.5, x1: -50.5, z1: -108.5 },
  font1: { x0: -41.5, z0: -131.5, x1: -34.5, z1: -124.5 },
  cubic: { x0: -33.5, z0: -115.5, x1: -26.5, z1: -108.5 },
  // de la sala de llegada y del templo a las catacumbas
  a1: { x0: -22, x1: -7.5, z0: -103, z1: -100.5 },
  b1: { x0: -22, x1: -19.5, z0: -119, z1: -116.5 },
  // hacia la antesala: el pasillo, la capilla y el rellano
  n1: { x0: -54.5, x1: -52, z0: -151, z1: -136 },
  chapel: { x0: -61.5, z0: -147, x1: -55.5, z1: -139 },
  landing: { x0: -52, z0: -156, x1: -46, z1: -148 },
  // la antesala: la nave, el estrado, la escalinata y la puerta
  hall: { x0: -46, z0: -166, x1: -16, z1: -138, YC: -6.1, YS: -4.6, rows: [-157.5, -146.5], cols: [-43, -37, -31, -25, -19] },
  stair: { x0: -46, x1: -37, z: -152, w: 8, n: 20 },
  dais: { x0: -24, z0: -160, x1: -16, z1: -144 },
  daisStair: { x0: -29, x1: -24, z: -152, w: 6, n: 10 },
  door: { x: -16, z: -152, w: 5, h: 5.2 },
  censer: { x: -22.4, z: -152 },
  font3: { x0: -44, z0: -180, x1: -32, z1: -168 },
  // las catacumbas del este, su pila y la sacristía
  eastMaze: { x0: 17, z0: -149, nx: 4, nz: 3, cs: 4, seed: 5521 },
  font2: { x0: 18, z0: -165, x1: 32, z1: -151 },
  sacristy: { x0: 26, z0: -133, x1: 34, z1: -124, door: { x: 30.25, z: -133.25, w: 2.5 } },
  // los Velados, a los lados de la puerta
  guards: [
    { x: -21, z: -155.6 },
    { x: -21, z: -148.4 },
  ],
};

// Altura del suelo en cada punto de la cripta (para la navegación de las
// criaturas): la antesala y su escalinata, el estrado, la cisterna.
export function cryptFloorY(x, z) {
  const H = DEEP.hall;
  if (x > H.x0 - 0.5 && x < H.x1 + 1.2 && z > H.z0 && z < H.z1) {
    const S = DEEP.stair,
      D = DEEP.dais,
      DS = DEEP.daisStair;
    if (x >= S.x0 && x <= S.x1 && Math.abs(z - S.z) <= S.w / 2) return DY + ((S.x1 - x) / (S.x1 - S.x0)) * (Y - DY);
    if (x >= D.x0 && z >= D.z0 && z <= D.z1) return AY;
    if (x >= DS.x0 && x <= DS.x1 && Math.abs(z - DS.z) <= DS.w / 2) return DY + ((x - DS.x0) / (DS.x1 - DS.x0)) * (AY - DY);
    if (x < H.x0) return Y;
    return DY;
  }
  const F3 = DEEP.font3;
  if (x > F3.x0 && x < F3.x1 && z > F3.z0 && z < F3.z1 + 2) return DY;
  // las catacumbas del este y su pila (a la altura de la cripta, aunque
  // estén más al norte que la cisterna)
  if (x > 16.5) return Y;
  if (z < -137 && x > -15.6 && x < 15.6) return AY;
  if (z < -167) return AY;
  return Y;
}

// ------------------------------------------------------------ el excavador
// Levanta suelos, techos y muros de una red de salas a partir de su planta.
// regs: [{ r: [x0, z0, x1, z1], y (suelo), top (arranque del techo o de la
// bóveda), mat, tint, floorMat, floor: false, ceil: false, ghost, stair }]
//  - ghost: una sala que ya existe (la levanta otro): se tiene en cuenta
//    para no cerrar el paso hacia ella, pero no se construye nada.
//  - las cabeceras (sobre un vano que da a una sala más baja) y las tabicas
//    (donde el suelo de al lado está más alto) salen solas.
// onWall(run) se llama con cada lienzo de muro (para colgarle nichos).
const RES = 0.5;
function carve(ctx, C, regs, onWall = null) {
  const wb = ctx.wb;
  let x0 = Infinity,
    z0 = Infinity,
    x1 = -Infinity,
    z1 = -Infinity;
  for (const g of regs) {
    x0 = Math.min(x0, g.r[0]);
    z0 = Math.min(z0, g.r[1]);
    x1 = Math.max(x1, g.r[2]);
    z1 = Math.max(z1, g.r[3]);
  }
  x0 -= 1;
  z0 -= 1;
  x1 += 1;
  z1 += 1;
  const nx = Math.round((x1 - x0) / RES),
    nz = Math.round((z1 - z0) / RES);
  const own = new Int32Array(nx * nz).fill(-1);
  regs.forEach((g, k) => {
    const i0 = Math.round((g.r[0] - x0) / RES),
      i1 = Math.round((g.r[2] - x0) / RES);
    const j0 = Math.round((g.r[1] - z0) / RES),
      j1 = Math.round((g.r[3] - z0) / RES);
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) own[j * nx + i] = k;
    if (g.ghost) return;
    C.paint(g.r[0], g.r[1], g.r[2], g.r[3], 1);
    const room = g.room ?? ROOM;
    if (g.floor !== false) {
      wb.box(g.floorMat ?? 'flag', g.r[0], g.y - 0.3, g.r[1], g.r[2], g.y, g.r[3], { faces: 't', ao: false, sub: 2.5, room, uv: g.floorMat === 'mosaic' ? 0.2 : 0.5, tint: g.floorTint });
      ctx.col.add(g.r[0], g.y - 1, g.r[1], g.r[2], g.y, g.r[3]);
    }
    if (g.ceil !== false) {
      wb.box(g.ceilMat ?? g.mat ?? 'mossstone', g.r[0], g.top, g.r[1], g.r[2], g.top + 0.3, g.r[3], { faces: 'b', ao: false, sub: 2, room, tint: g.ceilTint ?? VT });
      ctx.col.add(g.r[0], g.top, g.r[1], g.r[2], g.top + 0.5, g.r[3]).cam = true;
    }
  });
  // los muros: por cada borde entre una celda de sala y otra cosa
  const faces = new Map();
  const segsFor = (A, B) => {
    if (!B) return [[A.ybot ?? A.y, A.top]];
    const out = [];
    if (A.top > B.top + 0.01) out.push([Math.max(B.top, A.ybot ?? A.y), A.top]);
    if (B.y > A.y + 0.01 && !A.stair && !B.stair) out.push([A.y, Math.min(B.y, A.top)]);
    return out;
  };
  const DIRS = [
    ['n', 0, -1],
    ['s', 0, 1],
    ['w', -1, 0],
    ['e', 1, 0],
  ];
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = own[j * nx + i];
      if (a < 0 || regs[a].ghost) continue;
      for (const [d, di, dj] of DIRS) {
        const ni = i + di,
          nj = j + dj;
        const b = ni < 0 || nj < 0 || ni >= nx || nj >= nz ? -1 : own[nj * nx + ni];
        if (b === a) continue;
        for (const [ya, yb] of segsFor(regs[a], b < 0 ? null : regs[b])) {
          if (yb - ya < 0.02) continue;
          const line = d === 'n' ? j : d === 's' ? j + 1 : d === 'w' ? i : i + 1;
          const along = d === 'n' || d === 's' ? i : j;
          const key = `${d}|${line}|${a}|${ya.toFixed(3)}|${yb.toFixed(3)}|${b < 0 ? 'x' : 'r'}`;
          let f = faces.get(key);
          if (!f) faces.set(key, (f = { d, line, a, ya, yb, open: b >= 0, cells: [] }));
          f.cells.push(along);
        }
      }
    }
  const T = 0.05;
  const FACE = { n: 's', s: 'n', w: 'e', e: 'w' };
  for (const f of faces.values()) {
    f.cells.sort((p, q) => p - q);
    let s = 0;
    for (let k = 1; k <= f.cells.length; k++) {
      if (k < f.cells.length && f.cells[k] === f.cells[k - 1] + 1) continue;
      const c0 = f.cells[s],
        c1 = f.cells[k - 1] + 1;
      s = k;
      const g = regs[f.a];
      const o = { faces: FACE[f.d], sub: 1.6, aoH: 1.4, aoMin: 0.5, baseY: g.y, room: g.room ?? ROOM, tint: g.tint ?? CT };
      const mat = g.mat ?? 'mossstone';
      if (f.d === 'n' || f.d === 's') {
        const zb = z0 + f.line * RES,
          xa = x0 + c0 * RES,
          xb = x0 + c1 * RES;
        if (f.d === 'n') wb.box(mat, xa, f.ya, zb - T, xb, f.yb, zb, o);
        else wb.box(mat, xa, f.ya, zb, xb, f.yb, zb + T, o);
        if (onWall && !f.open) onWall({ axis: 'x', face: FACE[f.d], at: zb, a0: xa, a1: xb, y0: f.ya, y1: f.yb, reg: g });
      } else {
        const xb = x0 + f.line * RES,
          za = z0 + c0 * RES,
          zb = z0 + c1 * RES;
        if (f.d === 'w') wb.box(mat, xb - T, f.ya, za, xb, f.yb, zb, o);
        else wb.box(mat, xb, f.ya, za, xb + T, f.yb, zb, o);
        if (onWall && !f.open) onWall({ axis: 'z', face: FACE[f.d], at: xb, a0: za, a1: zb, y0: f.ya, y1: f.yb, reg: g });
      }
    }
  }
}

// ------------------------------------------------------------ laberintos
// Celdas de un laberinto (con algunos ciclos para que no sea sólo un árbol
// de callejones sin salida). reserved: celdas que ocupan las salas.
// Devuelve los enlaces 'i,j|i,j' entre celdas vecinas.
function mazeLinks(nx, nz, reserved, seed, loops, start) {
  const rng = new RNG(seed);
  const key = (i, j) => i + ',' + j;
  const free = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz && !reserved.has(key(i, j));
  const links = new Set();
  const link = (a, b) => links.add(a < b ? a + '|' + b : b + '|' + a);
  const seen = new Set([key(...start)]);
  const stack = [start];
  while (stack.length) {
    const [i, j] = stack[stack.length - 1];
    const nb = [
      [i + 1, j],
      [i - 1, j],
      [i, j + 1],
      [i, j - 1],
    ].filter(([a, b]) => free(a, b) && !seen.has(key(a, b)));
    if (!nb.length) {
      stack.pop();
      continue;
    }
    const [a, b] = nb[Math.floor(rng.next() * nb.length)];
    seen.add(key(a, b));
    link(key(i, j), key(a, b));
    stack.push([a, b]);
  }
  // ciclos: muros que se abren entre celdas vecinas aún no unidas
  let tries = 0,
    added = 0;
  while (added < loops && tries++ < 400) {
    const i = rng.int(0, nx - 1),
      j = rng.int(0, nz - 1);
    if (!free(i, j)) continue;
    const [a, b] = rng.chance(0.5) ? [i + 1, j] : [i, j + 1];
    if (!free(a, b)) continue;
    const k = key(i, j) < key(a, b) ? key(i, j) + '|' + key(a, b) : key(a, b) + '|' + key(i, j);
    if (links.has(k)) continue;
    links.add(k);
    added++;
  }
  return { links, seen };
}

// Pasillos de un laberinto de celdas (cs m): el tramo de cada celda y el de
// cada enlace. Los pasillos miden 2,5 m de ancho (alineados a medio metro).
function mazeRects(M, links, cells) {
  const out = [];
  const cx = (i) => M.x0 + i * M.cs + 1, // borde de poniente del pasillo
    cz = (j) => M.z0 + j * M.cs + 1; // borde del norte
  const W = 2.5;
  for (const c of cells) {
    const [i, j] = c.split(',').map(Number);
    out.push({ r: [cx(i), cz(j), cx(i) + W, cz(j) + W], cell: [i, j] });
  }
  for (const l of links) {
    const [a, b] = l.split('|').map((s) => s.split(',').map(Number));
    if (a[0] !== b[0]) {
      const i = Math.min(a[0], b[0]);
      out.push({ r: [cx(i) + W, cz(a[1]), cx(i + 1), cz(a[1]) + W], link: true });
    } else {
      const j = Math.min(a[1], b[1]);
      out.push({ r: [cx(a[0]), cz(j) + W, cx(a[0]) + W, cz(j + 1)], link: true });
    }
  }
  return out;
}
// el centro del pasillo de una celda
const cellC = (M, i, j) => [M.x0 + i * M.cs + 2.25, M.z0 + j * M.cs + 2.25];

// ------------------------------------------------------------ piezas
// Un nicho de enterramiento en un lienzo de muro: el hueco negro, su marco
// de piedra y, dentro, huesos y calaveras (o la losa que lo cierra).
function loculus(ctx, w, u, y0, kind, rng) {
  const wb = ctx.wb;
  const room = w.reg.room ?? ROOM;
  const hw = 0.55,
    h = 0.5;
  // (plano del muro, hacia la sala)
  const sgn = w.face === 's' || w.face === 'e' ? 1 : -1;
  const at = w.at;
  const box = (mat, a0, a1, ya, yb, d0, d1, faces, tint) => {
    const p0 = at + sgn * d0,
      p1 = at + sgn * d1;
    if (w.axis === 'x') wb.box(mat, a0, ya, Math.min(p0, p1), a1, yb, Math.max(p0, p1), { ao: false, faces, room, tint, grime: mat !== 'black' });
    else wb.box(mat, Math.min(p0, p1), ya, a0, Math.max(p0, p1), yb, a1, { ao: false, faces, room, tint, grime: mat !== 'black' });
  };
  const front = w.face;
  const sides = w.axis === 'x' ? 'ew' : 'ns';
  if (kind === 'sealed') {
    // la losa, algo salida, con una cruz grabada (oscura)
    box('ashlar', u - hw, u + hw, y0, y0 + h, 0, 0.05, front + sides + 't', [0.7, 0.68, 0.64]);
    box('black', u - 0.03, u + 0.03, y0 + 0.1, y0 + 0.4, 0.05, 0.056, front, null);
    box('black', u - 0.12, u + 0.12, y0 + 0.28, y0 + 0.32, 0.05, 0.056, front, null);
    return;
  }
  box('black', u - hw, u + hw, y0, y0 + h, 0.008, 0.012, front, null);
  // el marco: repisa, dintel y jambas
  box('mossstone', u - hw - 0.08, u + hw + 0.08, y0 - 0.08, y0, 0, 0.12, front + sides + 't', AT);
  box('mossstone', u - hw - 0.08, u + hw + 0.08, y0 + h, y0 + h + 0.08, 0, 0.1, front + sides + 'b', AT);
  box('mossstone', u - hw - 0.08, u - hw, y0, y0 + h, 0, 0.1, front + sides, AT);
  box('mossstone', u + hw, u + hw + 0.08, y0, y0 + h, 0, 0.1, front + sides, AT);
  if (kind === 'skulls') {
    const n = rng.int(1, 3);
    const rot = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[front];
    if (w.axis === 'x') P.skullRow(ctx, u + rng.range(-0.15, 0.15), y0, at + sgn * 0.13, rot, n, { room, gap: 0.26 });
    else P.skullRow(ctx, at + sgn * 0.13, y0, u + rng.range(-0.15, 0.15), rot, n, { room, gap: 0.26 });
  }
}

// Costillas de piedra que cruzan el techo de un pasillo (con sus ménsulas).
function ribs(ctx, r, axis, top, every, skip = [], o = {}) {
  const wb = ctx.wb;
  const room = o.room ?? ROOM;
  if (axis === 'z') {
    // pasillo a lo largo de z: costillas a lo ancho (en x)
    for (let z = r[1] + every / 2; z < r[3] - 0.4; z += every) {
      if (skip.some(([a, b]) => z > a - 0.6 && z < b + 0.6)) continue;
      wb.box('ashlar', r[0], top - 0.28, z - 0.18, r[2], top, z + 0.18, { faces: 'nsb', ao: false, room, tint: AT });
      for (const x of [r[0], r[2]]) {
        const d = x === r[0] ? 1 : -1;
        wb.box('ashlar', Math.min(x, x + d * 0.14), top - 0.62, z - 0.2, Math.max(x, x + d * 0.14), top - 0.28, z + 0.2, { faces: 'nsb' + (d > 0 ? 'e' : 'w'), ao: false, room, tint: AT });
      }
    }
  } else {
    for (let x = r[0] + every / 2; x < r[2] - 0.4; x += every) {
      if (skip.some(([a, b]) => x > a - 0.6 && x < b + 0.6)) continue;
      wb.box('ashlar', x - 0.18, top - 0.28, r[1], x + 0.18, top, r[3], { faces: 'ewb', ao: false, room, tint: AT });
      for (const z of [r[1], r[3]]) {
        const d = z === r[1] ? 1 : -1;
        wb.box('ashlar', x - 0.2, top - 0.62, Math.min(z, z + d * 0.14), x + 0.2, top - 0.28, Math.max(z, z + d * 0.14), { faces: 'ewb' + (d > 0 ? 's' : 'n'), ao: false, room, tint: AT });
      }
    }
  }
}

// Una pila de sangre: la taza de piedra (ochavada) sobre su basa, con su
// sumidero; la sangre de dentro la pone el juego (game/crypt.js), que la
// hace bajar al abrir la compuerta. La cadena de la compuerta, en el muro.
function bloodFont(ctx, x, y, z, room) {
  const wb = ctx.wb;
  const R = 1.35;
  wb.cylinder('ashlar', x, y, z, R + 0.35, R + 0.45, 0.3, 8, { ao: false, capTop: true, room, tint: AT });
  wb.cylinder('ashlar', x, y + 0.3, z, R * 0.55, R * 0.62, 0.35, 8, { ao: false, room, tint: AT });
  // la taza: el borde (ocho tramos) y el fondo
  const N = 8;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2 + Math.PI / N;
    wb.push();
    wb.translate(x + Math.cos(a) * R, y + 0.65, z + Math.sin(a) * R);
    wb.rotateY(-a + Math.PI / 2);
    const L = 2 * R * Math.tan(Math.PI / N) + 0.24;
    // (uno sí y otro no, un dedo más alto: las esquinas se solapan)
    wb.box('ashlar', -L / 2, 0, -0.14, L / 2, 0.55 + (k % 2) * 0.012, 0.14, { ao: false, room, tint: AT, faces: 'tnsew' });
    wb.pop();
  }
  wb.cylinder('mossstone', x, y + 0.65, z, R, R, 0.06, 8, { ao: false, capTop: true, room, tint: [0.35, 0.3, 0.28] });
  // el canal del sumidero hacia el muro (con su reja)
  ctx.col.add(x - R - 0.2, y, z - R - 0.2, x + R + 0.2, y + 1.2, z + R + 0.2);
  P.candles(ctx, x + R + 0.6, y, z + 0.4, 5, Math.round(x * 13 + z), { room, radius: 4, intensity: 0.8, spread: 0.3 });
  P.candles(ctx, x - R - 0.6, y, z - 0.4, 4, Math.round(x * 7 - z), { room, radius: 3, intensity: 0.5, spread: 0.3 });
  ctx.lights.push({ x, y: y + 1.6, z, r: 0.9, g: 0.15, b: 0.1, radius: 5, intensity: 0.7, room });
}

// La compuerta de una pila: la cadena que baja del muro con su argolla
// (la palanca del juego, en el muro; ver interact.js).
function chainMount(ctx, x, y, z, dir, room) {
  const wb = ctx.wb;
  const d = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[dir];
  // la placa de hierro con el canal de la sangre que se pierde en el muro
  const px = x - d[0] * 0.45,
    pz = z - d[1] * 0.45;
  if (d[0]) wb.box('iron', px - 0.05, y + 0.4, pz - 0.6, px + 0.05, y + 2.4, pz + 0.6, { ao: false, room });
  else wb.box('iron', px - 0.6, y + 0.4, pz - 0.05, px + 0.6, y + 2.4, pz + 0.05, { ao: false, room });
  for (let k = 0; k < 9; k++) wb.box('iron', px - 0.03, y + 2.6 + k * 0.12, pz - 0.03, px + 0.03, y + 2.7 + k * 0.12, pz + 0.03, { ao: false, room });
}

// Una estatua colosal de un velado (de pie, con las manos sobre la espada).
function giantVeiled(ctx, x, y, z, rot, s = 1, room = ROOM) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('ashlar', -0.9 * s, 0, -0.9 * s, 0.9 * s, 0.6 * s, 0.9 * s, { sub: 2, room, tint: AT });
    wb.cylinder('ashlar', 0, 0.6 * s, 0, 0.75 * s, 0.5 * s, 3.2 * s, 10, { ao: false, room, tint: CT });
    wb.cylinder('ashlar', 0, 3.8 * s, 0, 0.5 * s, 0.34 * s, 0.6 * s, 10, { ao: false, room, tint: CT });
    // el velo sobre la cabeza y los hombros
    wb.cylinder('ashlar', 0, 3.4 * s, 0, 0.68 * s, 0.2 * s, 1.5 * s, 10, { ao: false, capTop: true, room, tint: [0.8, 0.78, 0.74] });
    wb.cylinder('ashlar', 0, 1.0 * s, 0, 0.82 * s, 0.7 * s, 1.7 * s, 10, { ao: false, open: true, room, tint: [0.8, 0.78, 0.74] });
    // las manos sobre el pomo de la espada, la hoja hasta el suelo
    wb.box('ashlar', -0.18 * s, 2.3 * s, 0.55 * s, 0.18 * s, 2.6 * s, 0.85 * s, { ao: false, room, tint: AT });
    wb.box('ashlar', -0.5 * s, 2.0 * s, 0.68 * s, 0.5 * s, 2.12 * s, 0.82 * s, { ao: false, room, tint: AT });
    wb.box('ashlar', -0.09 * s, 0.6 * s, 0.7 * s, 0.09 * s, 2.0 * s, 0.8 * s, { ao: false, room, tint: AT });
  });
  ctx.col.add(x - 0.9 * s, y, z - 0.9 * s, x + 0.9 * s, y + 4.6 * s, z + 0.9 * s);
}

// ------------------------------------------------------------ la cripta honda
export function buildDeepCrypt(ctx, C, L) {
  const wb = ctx.wb;
  const D = DEEP;
  const rng = new RNG(4401);
  wb.setRoom(ROOM);
  const regs = [];
  const add = (r, o = {}) => {
    const g = { r, y: Y, top: Y + 3.2, mat: 'mossstone', ...o };
    regs.push(g);
    return g;
  };

  // --- lo que ya existe (lo levanta level_sacred.js): la sala de llegada,
  // el osario, el templo y la cisterna
  add([-7, -110, 7, -97], { ghost: true, top: Y + 5.8 });
  add([-7.5, -103, -7, -100.5], { ghost: true, top: Y + 3.2 });
  add([-2.5, -133, 2.5, -110.5], { ghost: true, top: Y + 3.8 });
  add([-19, -132, -3.5, -112], { ghost: true, top: Y + 5.65 });
  add([-19.5, -119, -19, -116.5], { ghost: true, top: Y + 3.2 });
  add([-15, -167, 15, -137], { ghost: true, y: AY, top: AY + 8.8 });

  // --- la galería del sello y la boca del osario
  const G = D.gallery;
  add([G.x0, G.z0, G.x1, G.z1], { top: G.top, zone: 'galeria' });
  add([D.ossDoor.x0, D.ossDoor.z0, D.ossDoor.x1, D.ossDoor.z1], { top: D.ossDoor.top, ceil: true });

  // --- las catacumbas del oeste (el laberinto)
  const M = D.maze;
  const reserved = new Set();
  const block = (i0, j0, i1, j1) => {
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) reserved.add(i + ',' + j);
  };
  block(0, 3, 1, 5); // la cámara de la garra
  block(4, 0, 5, 1); // la pila de los inocentes
  block(6, 4, 7, 5); // el cubículo
  const { links, seen } = mazeLinks(M.nx, M.nz, reserved, M.seed, 9, [8, 7]);
  const mrects = mazeRects(M, links, seen);
  const mazeTop = Y + 3.2;
  for (const q of mrects) add(q.r, { top: mazeTop, floor: false, ceil: false, maze: true });
  // las entradas: desde la sala de llegada, desde el templo y desde la galería
  add([-22.5, -103, -22, -100.5], { top: mazeTop, floor: false, ceil: false, maze: true });
  add([-22.5, -119, -22, -116.5], { top: mazeTop, floor: false, ceil: false, maze: true });
  const [g1x] = cellC(M, 1, 0),
    [g2x] = cellC(M, 6, 0);
  add([g1x - 1.25, -133.5, g1x + 1.25, -131], { top: mazeTop, floor: false, ceil: false, maze: true });
  add([g2x - 1.25, -133.5, g2x + 1.25, -131], { top: mazeTop, floor: false, ceil: false, maze: true });
  // las salas del laberinto y sus bocas
  const CL = D.claw,
    F1 = D.font1,
    CU = D.cubic;
  // (sus suelos y los de sus bocas, los del laberinto: una sola losa)
  add([CL.x0, CL.z0, CL.x1, CL.z1], { top: Y + 3.4, floor: false, ceil: false, mat: 'skulls', tint: ST, zone: 'garra' });
  add([CL.x1, -115, CL.x1 + 1.5, -112.5], { top: mazeTop, floor: false, ceil: false, maze: true });
  add([F1.x0, F1.z0, F1.x1, F1.z1], { top: Y + 3.6, floor: false, ceil: false, zone: 'pila_oeste' });
  add([-41, F1.z1, -38.5, F1.z1 + 1.5], { top: mazeTop, floor: false, ceil: false, maze: true });
  add([CU.x0, CU.z0, CU.x1, CU.z1], { top: Y + 3.4, floor: false, ceil: false, mat: 'skulls', tint: ST });
  add([CU.x1, -115, CU.x1 + 1.5, -112.5], { top: mazeTop, floor: false, ceil: false, maze: true });
  // los pasillos a la sala de llegada y al templo
  add([D.a1.x0, D.a1.z0, D.a1.x1, D.a1.z1], { top: Y + 3.2 });
  add([D.b1.x0, D.b1.z0, D.b1.x1, D.b1.z1], { top: Y + 3.2 });

  // --- hacia la antesala: el pasillo, la capilla de San Martín y el rellano
  const N1 = D.n1,
    CH = D.chapel,
    LD = D.landing;
  add([N1.x0, N1.z0, N1.x1, N1.z1], { top: Y + 3.6, zone: 'galeria' });
  add([CH.x0, CH.z0, CH.x1, CH.z1], { top: Y + 3.4, ceil: false, zone: 'capilla_martin', floorMat: 'mosaic' });
  add([CH.x1, -144.5, N1.x0, -141.5], { top: Y + 2.8 });
  add([LD.x0, LD.z0, LD.x1, LD.z1], { top: D.hall.YS, zone: 'galeria' });

  // --- la antesala (bajo bóvedas: su techo lo pone ella)
  const H = D.hall;
  add([H.x0, H.z0, H.x1, H.z1], { y: DY, top: H.YS, ceil: false, mat: 'ashlar', tint: [0.7, 0.66, 0.62], zone: 'antesala', floorMat: 'flag', floorTint: [0.78, 0.74, 0.7] });
  // la puerta del dios: el hueco en los dos muros (el de la antesala y el de
  // la cisterna)
  add([H.x1, D.door.z - D.door.w / 2, H.x1 + 1, D.door.z + D.door.w / 2], { y: AY, top: AY + D.door.h, floor: false, ceil: true, mat: 'ashlar', tint: AT });
  // la pila de los condenados, al norte de la nave lateral
  const F3 = D.font3;
  add([F3.x0, F3.z0, F3.x1, F3.z1], { y: DY, top: DY + 3.8, zone: 'pila_honda', mat: 'mossstone' });
  add([-41.5, F3.z1, -39, H.z0], { y: DY, top: DY + 3.0 });

  // --- las catacumbas del este, su pila y la sacristía
  const E = D.eastMaze;
  const eRes = new Set();
  const el = mazeLinks(E.nx, E.nz, eRes, E.seed, 3, [1, 2]);
  for (const q of mazeRects(E, el.links, el.seen)) add(q.r, { top: mazeTop, floor: false, ceil: false, maze: 'east' });
  const [e1x] = cellC(E, 1, 2),
    [e2x] = cellC(E, 2, 0);
  add([e1x - 1.25, -137.5, e1x + 1.25, -136], { top: mazeTop, floor: false, ceil: false, maze: 'east' });
  add([e2x - 1.25, -151, e2x + 1.25, -148], { top: mazeTop, floor: false, ceil: false, maze: 'east' });
  const F2 = D.font2,
    SA = D.sacristy;
  add([F2.x0, F2.z0, F2.x1, F2.z1], { top: Y + 3.8, ceil: false, zone: 'pila_este' });
  add([SA.x0, SA.z0, SA.x1, SA.z1], { top: Y + 3.0, zone: 'sacristia', floorMat: 'planks', mat: 'ashlar', tint: [0.72, 0.68, 0.62], ceilMat: 'wooddark', ceilTint: [0.5, 0.45, 0.4] });
  add([SA.door.x - 1.25, G.z1, SA.door.x + 1.25, SA.z0], { top: Y + 2.6 });

  // los lienzos de muro de las catacumbas: antorchas (separadas, con tramos
  // a oscuras) y nichos de enterramiento
  const runs = [];
  carve(ctx, C, regs, (w) => {
    if (w.reg.maze && w.a1 - w.a0 >= 1.8) runs.push(w);
  });
  const lrng = new RNG(4402);
  const torches = [];
  for (const w of [...runs].sort((p, q) => ((p.a0 * 7.3 + p.at * 3.1) % 1) - ((q.a0 * 7.3 + q.at * 3.1) % 1))) {
    if (w.a1 - w.a0 < 2.4) continue;
    const u = (w.a0 + w.a1) / 2;
    const [x, z] = w.axis === 'x' ? [u, w.at] : [w.at, u];
    if (torches.some((t) => Math.hypot(t[0] - x, t[1] - z) < (w.reg.maze === 'east' ? 7 : 9))) continue;
    torches.push([x, z]);
    w.torch = u;
    P.wallTorch(ctx, x, Y + 2.15, z, w.face, { room: ROOM, radius: 6 });
  }
  for (const w of runs) {
    const len = w.a1 - w.a0;
    const n = Math.floor((len - 0.4) / 1.6);
    for (let k = 0; k < n; k++) {
      const u = w.a0 + (len - (n - 1) * 1.6) / 2 + k * 1.6;
      const r = lrng.next();
      loculus(ctx, w, u, Y + 0.95, r < 0.45 ? 'skulls' : r < 0.75 ? 'sealed' : 'empty', lrng);
      if (lrng.chance(0.45) && !(w.torch !== undefined && Math.abs(w.torch - u) < 0.9)) loculus(ctx, w, u, Y + 1.75, lrng.chance(0.5) ? 'skulls' : 'sealed', lrng);
    }
  }

  // --- suelo y techo de los laberintos, de una pieza (los muros los tapan)
  const mazeFloor = (x0, z0, x1, z1, holes) => {
    const rects = [[x0, z0, x1, z1]];
    wb.box('flag', x0, Y - 0.3, z0, x1, Y, z1, { faces: 't', ao: false, sub: 2.5, room: ROOM, uv: 0.5, tint: [0.62, 0.6, 0.56] });
    ctx.col.add(x0, Y - 1, z0, x1, Y, z1);
    // el techo, salvo sobre las salas más altas
    let ceil = rects;
    for (const h of holes) {
      const next = [];
      for (const r of ceil) {
        if (h[0] >= r[2] || h[2] <= r[0] || h[1] >= r[3] || h[3] <= r[1]) {
          next.push(r);
          continue;
        }
        if (h[1] > r[1]) next.push([r[0], r[1], r[2], h[1]]);
        if (h[3] < r[3]) next.push([r[0], h[3], r[2], r[3]]);
        if (h[0] > r[0]) next.push([r[0], Math.max(r[1], h[1]), h[0], Math.min(r[3], h[3])]);
        if (h[2] < r[2]) next.push([h[2], Math.max(r[1], h[1]), r[2], Math.min(r[3], h[3])]);
      }
      ceil = next;
    }
    for (const [a, b, c, d] of ceil) {
      wb.box('mossstone', a, mazeTop, b, c, mazeTop + 0.3, d, { faces: 'b', ao: false, sub: 2, room: ROOM, tint: VT });
      ctx.col.add(a, mazeTop, b, c, mazeTop + 0.5, d).cam = true;
    }
  };
  mazeFloor(M.x0, M.z0, M.x0 + M.nx * M.cs, M.z0 + M.nz * M.cs, [
    [CL.x0, CL.z0, CL.x1, CL.z1],
    [F1.x0, F1.z0, F1.x1, F1.z1],
    [CU.x0, CU.z0, CU.x1, CU.z1],
  ]);
  // (las bocas del norte, hasta la galería, y las del este)
  wb.box('flag', g1x - 1.25, Y - 0.3, -133.5, g1x + 1.25, Y, M.z0, { faces: 't', ao: false, room: ROOM, tint: [0.62, 0.6, 0.56] });
  wb.box('flag', g2x - 1.25, Y - 0.3, -133.5, g2x + 1.25, Y, M.z0, { faces: 't', ao: false, room: ROOM, tint: [0.62, 0.6, 0.56] });
  for (const x of [g1x, g2x]) {
    ctx.col.add(x - 1.25, Y - 1, -133.5, x + 1.25, Y, M.z0);
    wb.box('mossstone', x - 1.25, mazeTop, -133.5, x + 1.25, mazeTop + 0.3, M.z0, { faces: 'b', ao: false, room: ROOM, tint: VT });
  }
  mazeFloor(E.x0, E.z0, E.x0 + E.nx * E.cs, E.z0 + E.nz * E.cs, []);
  wb.box('flag', e1x - 1.25, Y - 0.3, -137, e1x + 1.25, Y, -136, { faces: 't', ao: false, room: ROOM });
  wb.box('mossstone', e1x - 1.25, mazeTop, -137, e1x + 1.25, mazeTop + 0.3, -136, { faces: 'b', ao: false, room: ROOM, tint: VT });
  ctx.col.add(e1x - 1.25, Y - 1, -137, e1x + 1.25, Y, -136);
  wb.box('flag', e2x - 1.25, Y - 0.3, -151, e2x + 1.25, Y, -149, { faces: 't', ao: false, room: ROOM });
  wb.box('mossstone', e2x - 1.25, mazeTop, -151, e2x + 1.25, mazeTop + 0.3, -149, { faces: 'b', ao: false, room: ROOM, tint: VT });
  ctx.col.add(e2x - 1.25, Y - 1, -151, e2x + 1.25, Y, -149);

  // costillas en los pasillos rectos de los laberintos
  for (const [Mz, rs] of [
    [M, mrects],
    [E, mazeRects(E, el.links, el.seen)],
  ]) {
    const lk = Mz === M ? links : el.links;
    for (const q of rs) {
      if (!q.cell) continue;
      const [i, j] = q.cell;
      const has = (a, b) => lk.has(`${i},${j}|${a},${b}`) || lk.has(`${a},${b}|${i},${j}`);
      const ew = has(i - 1, j) && has(i + 1, j) && !has(i, j - 1) && !has(i, j + 1);
      const ns = has(i, j - 1) && has(i, j + 1) && !has(i - 1, j) && !has(i + 1, j);
      if (ew) ribs(ctx, q.r, 'x', mazeTop, 2.5);
      else if (ns) ribs(ctx, q.r, 'z', mazeTop, 2.5);
    }
  }

  // ------------------------------------------------------------ la galería
  {
    // costillas cada cuatro metros (no sobre las bocas de los lados)
    const skip = [
      [D.ossDoor.x0, D.ossDoor.x1],
      [g1x - 1.25, g1x + 1.25],
      [g2x - 1.25, g2x + 1.25],
      [N1.x0, N1.x1],
      [e1x - 1.25, e1x + 1.25],
      [SA.door.x - 1.25, SA.door.x + 1.25],
    ];
    ribs(ctx, [G.x0, G.z0, G.x1, G.z1], 'x', G.top, 4, skip);
    ribs(ctx, [N1.x0, N1.z0, N1.x1, N1.z1], 'z', Y + 3.6, 4, [[-144.5, -141.5]]);
    // antorchas, alternando los lados
    let side = 0;
    for (let x = G.x0 + 6; x < G.x1 - 2; x += 11) {
      if (skip.some(([a, b]) => x > a - 1.4 && x < b + 1.4)) x += 3;
      P.wallTorch(ctx, x, Y + 2.3, side % 2 ? G.z1 : G.z0, side % 2 ? 'n' : 's', { room: ROOM, radius: 7 });
      side++;
    }
    P.wallTorch(ctx, N1.x1, Y + 2.3, -147.5, 'w', { room: ROOM, radius: 7 });
    // restos por el suelo y algún cadáver
    P.bones(ctx, -40.5, Y, -134.4, 7, 4410, 0.7);
    P.bones(ctx, 12.5, Y, -135.2, 6, 4411, 0.6);
    bakeCorpse(wb, -10.5, Y, -134.9, 0.2, 'face', 'villager', 4412);
    bakeCorpse(wb, 24.5, Y, -134.6, -1.4, 'back', 'villager', 4413);
    P.decal(ctx, -10.5, Y + 0.02, -134.9, 1.8);
    P.candles(ctx, 3.4, Y, -134.2, 4, 4414, { room: ROOM, radius: 4, intensity: 0.7, spread: 0.3 });
    P.candles(ctx, -3.4, Y, -135.4, 3, 4415, { room: ROOM, radius: 3, intensity: 0.5, spread: 0.3 });
    // la boca del osario: un arco con su marco de sillería
    for (const s of [-1, 1]) wb.box('ashlar', s * 1.5 + (s < 0 ? -0.3 : 0), Y, -133.62, s * 1.5 + (s > 0 ? 0.3 : 0), Y + 3.2, -133.5, { ao: false, room: ROOM, tint: AT, faces: 'nsew' });
    wb.box('ashlar', -1.8, Y + 3.2, -133.62, 1.8, Y + 3.5, -133.5, { ao: false, room: ROOM, tint: AT, faces: 'nb' });
    ctx.rats.push({ x: -30, y: Y, z: -134.8, n: 2 });
  }

  // ------------------------------------------------------------ las catacumbas
  {
    // huesos en los callejones sin salida, velas, algún cadáver
    const dead = [];
    for (const c of seen) {
      const [i, j] = c.split(',').map(Number);
      let n = 0;
      for (const [a, b] of [
        [i + 1, j],
        [i - 1, j],
        [i, j + 1],
        [i, j - 1],
      ])
        if (links.has(`${i},${j}|${a},${b}`) || links.has(`${a},${b}|${i},${j}`)) n++;
      if (n === 1) dead.push([i, j]);
    }
    for (const [i, j] of dead) {
      const [x, z] = cellC(M, i, j);
      P.bones(ctx, x + rng.range(-0.5, 0.5), Y, z + rng.range(-0.5, 0.5), 12, i * 31 + j, 0.8);
      if (rng.chance(0.5)) P.candles(ctx, x, Y, z, 4, i * 17 + j, { room: ROOM, radius: 3.5, intensity: 0.6, spread: 0.4 });
    }
    for (const [i, j, rot] of [
      [3, 3, 0.4],
      [7, 6, -1.1],
      [0, 7, 2.0],
    ]) {
      const [x, z] = cellC(M, i, j);
      bakeCorpse(wb, x, Y, z, rot, rng.chance(0.5) ? 'face' : 'back', 'villager', i * 7 + j);
      P.decal(ctx, x, Y + 0.02, z, 1.6);
    }
    // el cubículo: un sarcófago con frescos borrados y velas
    P.sarcophagus(ctx, (CU.x0 + CU.x1) / 2, Y, (CU.z0 + CU.z1) / 2, Math.PI / 2, { effigy: true, room: ROOM });
    P.candles(ctx, CU.x0 + 0.8, Y, CU.z0 + 0.8, 6, 4420, { room: ROOM, radius: 4.5, intensity: 0.9 });
    P.boneWall(ctx, (CU.x0 + CU.x1) / 2, Y, CU.z0 + 0.06, 0, CU.x1 - CU.x0 - 0.4, 2.8, { room: ROOM, seed: 4421 });
    barrelVault(ctx, { x0: CU.x0, z0: CU.z0, x1: CU.x1, z1: CU.z1, axis: 'z', ys: Y + 3.4, rise: 1.4, mat: 'skulls', tint: VT, room: ROOM, sub: 1.0, impostTint: AT });
    lunette(ctx, { axis: 'z', at: CU.z0, c: (CU.x0 + CU.x1) / 2, span: CU.x1 - CU.x0, ys: Y + 3.4, rise: 1.4, face: 1, mat: 'skulls', tint: ST, room: ROOM });
    lunette(ctx, { axis: 'z', at: CU.z1, c: (CU.x0 + CU.x1) / 2, span: CU.x1 - CU.x0, ys: Y + 3.4, rise: 1.4, face: -1, mat: 'skulls', tint: ST, room: ROOM });
    ctx.col.addCam(CU.x0, Y + 4.8, CU.z0, CU.x1, Y + 5.2, CU.z1);
    P.hangingLamp(ctx, (CU.x0 + CU.x1) / 2, Y + 4.8, (CU.z0 + CU.z1) / 2 + 2, { room: ROOM, len: 0.9, radius: 6, intensity: 0.8 });
    ctx.rats.push({ x: -44, y: Y, z: -100, n: 3 });
    ctx.rats.push({ x: -30, y: Y, z: -126, n: 2 });
  }

  // ------------------------------------------------------------ la cámara de la garra
  {
    const cx = (CL.x0 + CL.x1) / 2,
      cz = (CL.z0 + CL.z1) / 2;
    barrelVault(ctx, { x0: CL.x0, z0: CL.z0, x1: CL.x1, z1: CL.z1, axis: 'z', ys: Y + 3.4, rise: 2.0, mat: 'skulls', tint: VT, room: ROOM, sub: 1.0, impostTint: AT });
    lunette(ctx, { axis: 'z', at: CL.z0, c: cx, span: CL.x1 - CL.x0, ys: Y + 3.4, rise: 2.0, face: 1, mat: 'skulls', tint: ST, room: ROOM });
    lunette(ctx, { axis: 'z', at: CL.z1, c: cx, span: CL.x1 - CL.x0, ys: Y + 3.4, rise: 2.0, face: -1, mat: 'skulls', tint: ST, room: ROOM });
    ctx.col.addCam(CL.x0, Y + 5.4, CL.z0, CL.x1, Y + 5.8, CL.z1);
    for (const z of [CL.z0 + 3, CL.z1 - 3]) {
      archRing(ctx, { axis: 'x', c: cx, w: CL.x1 - CL.x0 - 0.5, y0: Y + 3.4, rise: 1.75, ring: 0.26, t0: z - 0.2, t1: z + 0.2, mat: 'ashlar', room: ROOM, tint: AT, cam: false });
      pilaster(ctx, CL.x0, z, 'e', Y, Y + 3.4, { room: ROOM, tint: AT, w: 0.4, d: 0.16 });
      pilaster(ctx, CL.x1, z, 'w', Y, Y + 3.4, { room: ROOM, tint: AT, w: 0.4, d: 0.16 });
    }
    // el altar del relicario, en el centro, con su paño rojo y el arca dorada
    wb.box('ashlar', cx - 0.9, Y, cz - 0.55, cx + 0.9, Y + 0.95, cz + 0.55, { faces: 'tnsew', sub: 2, room: ROOM, tint: AT });
    wb.box('ashlar', cx - 1.0, Y + 0.95, cz - 0.62, cx + 1.0, Y + 1.05, cz + 0.62, { ao: false, room: ROOM, tint: AT });
    wb.box('clothRed', cx - 0.75, Y + 1.051, cz - 0.4, cx + 0.75, Y + 1.06, cz + 0.4, { faces: 't', ao: false, room: ROOM });
    wb.box('bronze', cx - 0.32, Y + 1.06, cz + 0.12, cx + 0.32, Y + 1.36, cz + 0.36, { ao: false, room: ROOM, faces: 'tnsew' });
    wb.box('bronze', cx - 0.36, Y + 1.36, cz + 0.1, cx + 0.36, Y + 1.44, cz + 0.38, { ao: false, room: ROOM, faces: 'tnsewb' });
    ctx.col.add(cx - 1.0, Y, cz - 0.62, cx + 1.0, Y + 1.05, cz + 0.62);
    P.candles(ctx, cx - 0.7, Y + 1.05, cz - 0.4, 4, 4430, { room: ROOM, radius: 5, intensity: 1.0, spread: 0.15 });
    P.candles(ctx, cx + 0.7, Y + 1.05, cz - 0.4, 4, 4431, { room: ROOM, radius: 4, intensity: 0.6, spread: 0.15 });
    // los sepulcros de los lados (de ahí salen) y los muros de huesos
    for (const [x, z] of [
      [CL.x0 + 1.0, CL.z0 + 2.2],
      [CL.x0 + 1.0, CL.z1 - 2.2],
      [CL.x1 - 1.0, CL.z0 + 2.2],
      [CL.x1 - 1.0, CL.z1 - 2.6],
    ])
      P.sarcophagus(ctx, x, Y, z, 0, { open: true, room: ROOM, l: 0.9, w: 0.45 });
    P.boneWall(ctx, cx, Y, CL.z0 + 0.06, 0, CL.x1 - CL.x0 - 0.3, 3.3, { room: ROOM, seed: 4432 });
    P.boneWall(ctx, cx, Y, CL.z1 - 0.06, Math.PI, CL.x1 - CL.x0 - 0.3, 3.3, { room: ROOM, seed: 4433 });
    for (let k = 0; k < 4; k++) for (let c = 0; c < 9; c++) wb.box('iron', cx - 2 + k * 1.3 - 0.03, Y + 5.2 - c * 0.14, cz - 2.5 + k - 0.03, cx - 2 + k * 1.3 + 0.03, Y + 5.3 - c * 0.14, cz - 2.5 + k + 0.03, { ao: false, room: ROOM });
    P.hangingLamp(ctx, cx, Y + 5.4, cz - 3, { room: ROOM, len: 1.3, radius: 7, intensity: 0.9 });
    ctx.lights.push({ x: cx, y: Y + 1.8, z: cz, r: 1, g: 0.78, b: 0.4, radius: 4, intensity: 0.6, room: ROOM });
    L.interact.push(
      { kind: 'item', id: 'i_garra', item: 'garra', x: cx, y: Y + 1.12, z: cz - 0.12 },
      { kind: 'note', id: 'n_garra', note: 'garra', x: cx + 0.55, y: Y + 1.06, z: cz + 0.05, model: 'paper' }
    );
  }

  // ------------------------------------------------------------ las pilas
  // (la de los inocentes, en las catacumbas; la de los mártires, en las del
  // este; la de los condenados, al fondo de la antesala)
  const FONTS = [
    { id: 'oeste', r: F1, y: Y, lever: { x: F1.x0 + 0.9, z: (F1.z0 + F1.z1) / 2, d: 'e' } },
    { id: 'este', r: F2, y: Y, lever: { x: F2.x1 - 0.9, z: (F2.z0 + F2.z1) / 2 - 2, d: 'w' } },
    { id: 'honda', r: F3, y: DY, lever: { x: (F3.x0 + F3.x1) / 2 + 3.5, z: F3.z0 + 0.9, d: 's' } },
  ];
  for (const F of FONTS) {
    const { r, y } = F;
    const cx = (r.x0 + r.x1) / 2,
      cz = (r.z0 + r.z1) / 2;
    bloodFont(ctx, cx, y, cz, ROOM);
    const lv = F.lever;
    const n = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[lv.d];
    chainMount(ctx, lv.x, y, lv.z, lv.d, ROOM);
    L.interact.push({ kind: 'lever', id: 'p_pila_' + F.id, font: F.id, x: lv.x, y, z: lv.z, nx: n[0], nz: n[1], r: 1.8 });
  }
  {
    // los inocentes: ataúdes pequeños en los muros y paños blancos
    const r = F1;
    barrelVault(ctx, { x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, axis: 'x', ys: Y + 3.6, rise: 1.6, mat: 'mossstone', tint: VT, room: ROOM, sub: 1.0, impostTint: AT });
    lunette(ctx, { axis: 'x', at: r.x0, c: (r.z0 + r.z1) / 2, span: r.z1 - r.z0, ys: Y + 3.6, rise: 1.6, face: 1, mat: 'mossstone', tint: CT, room: ROOM });
    lunette(ctx, { axis: 'x', at: r.x1, c: (r.z0 + r.z1) / 2, span: r.z1 - r.z0, ys: Y + 3.6, rise: 1.6, face: -1, mat: 'mossstone', tint: CT, room: ROOM });
    ctx.col.addCam(r.x0, Y + 5.2, r.z0, r.x1, Y + 5.6, r.z1);
    for (let k = 0; k < 4; k++) {
      const x = r.x0 + 1.3 + k * 1.5;
      P.sarcophagus(ctx, x, Y, r.z0 + 0.7, 0, { room: ROOM, l: 0.5, w: 0.28 });
      wb.box('clothWhite', x - 0.45, Y + 1.08, r.z0 + 0.42, x + 0.45, Y + 1.09, r.z0 + 0.98, { faces: 't', ao: false, room: ROOM, tint: [0.8, 0.76, 0.7] });
    }
    P.wallTorch(ctx, r.x1, Y + 2.3, r.z0 + 2, 'w', { room: ROOM, radius: 6 });
  }
  {
    // los mártires: ruedas, garfios y estandartes; una bóveda de cañón
    const r = F2;
    const cx = (r.x0 + r.x1) / 2;
    barrelVault(ctx, { x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, axis: 'z', ys: Y + 3.8, rise: 2.4, mat: 'mossstone', tint: VT, room: ROOM, sub: 1.0, impostTint: AT });
    lunette(ctx, { axis: 'z', at: r.z0, c: cx, span: r.x1 - r.x0, ys: Y + 3.8, rise: 2.4, face: 1, mat: 'mossstone', tint: CT, room: ROOM });
    lunette(ctx, { axis: 'z', at: r.z1, c: cx, span: r.x1 - r.x0, ys: Y + 3.8, rise: 2.4, face: -1, mat: 'mossstone', tint: CT, room: ROOM });
    ctx.col.addCam(r.x0, Y + 6.2, r.z0, r.x1, Y + 6.6, r.z1);
    for (const z of [r.z0 + 4, r.z1 - 4]) {
      archRing(ctx, { axis: 'x', c: cx, w: r.x1 - r.x0 - 0.5, y0: Y + 3.8, rise: 2.15, ring: 0.28, t0: z - 0.2, t1: z + 0.2, mat: 'ashlar', room: ROOM, tint: AT, cam: false });
      pilaster(ctx, r.x0, z, 'e', Y, Y + 3.8, { room: ROOM, tint: AT, w: 0.45, d: 0.18 });
      pilaster(ctx, r.x1, z, 'w', Y, Y + 3.8, { room: ROOM, tint: AT, w: 0.45, d: 0.18 });
    }
    P.banner(ctx, r.x0 + 0.08, Y + 3.2, (r.z0 + r.z1) / 2, Math.PI / 2, 'bannerRed', 1.4, 2.6);
    P.banner(ctx, r.x1 - 0.08, Y + 3.2, (r.z0 + r.z1) / 2 + 3, -Math.PI / 2, 'bannerBlack', 1.4, 2.6);
    for (const [x, z, s] of [
      [r.x0 + 1.4, r.z0 + 1.6, 4440],
      [r.x1 - 1.6, r.z1 - 1.4, 4441],
      [r.x0 + 1.5, r.z1 - 2.0, 4442],
    ])
      P.bones(ctx, x, Y, z, 10, s, 0.9);
    P.cartWheel && P.cartWheel(ctx, r.x0 + 0.5, Y, r.z0 + 6, 0.6, { room: ROOM });
    P.candelabra(ctx, r.x0 + 2.2, Y, r.z1 - 1.2, { room: ROOM });
    P.candelabra(ctx, r.x1 - 2.2, Y, r.z0 + 1.2, { room: ROOM });
    P.hangingLamp(ctx, cx, Y + 6.2, (r.z0 + r.z1) / 2 + 3.5, { room: ROOM, len: 1.6, radius: 8, intensity: 0.9 });
    P.fleshGrowth(ctx, r.x1 - 0.6, Y, r.z0 + 0.6, 1.0, 4443, { room: ROOM, climb: 2.4 });
  }
  {
    // los condenados: jaulas, cadenas, cuerpos quemados; techo bajo, de
    // vigas negras de humo
    const r = F3;
    for (let k = 0; k < 5; k++) {
      const x = r.x0 + 1.2 + k * 2.4;
      wb.box('wooddark', x - 0.16, DY + 3.5, r.z0, x + 0.16, DY + 3.8, r.z1, { faces: 'bnsew', ao: false, room: ROOM, tint: [0.45, 0.4, 0.36] });
    }
    for (const [x, z] of [
      [r.x0 + 1.6, r.z0 + 1.6],
      [r.x1 - 1.6, r.z0 + 1.6],
      [r.x0 + 1.6, r.z1 - 1.8],
    ]) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        wb.box('iron', x + Math.cos(a) * 0.6 - 0.025, DY, z + Math.sin(a) * 0.6 - 0.025, x + Math.cos(a) * 0.6 + 0.025, DY + 2.2, z + Math.sin(a) * 0.6 + 0.025, { ao: false, room: ROOM });
      }
      wb.cylinder('iron', x, DY + 2.2, z, 0.66, 0.66, 0.06, 8, { ao: false, capTop: true, capBot: true, room: ROOM });
      P.bones(ctx, x, DY, z, 6, Math.round(x * 11 - z), 0.4);
      ctx.col.add(x - 0.65, DY, z - 0.65, x + 0.65, DY + 2.3, z + 0.65);
    }
    for (let k = 0; k < 5; k++)
      for (let c = 0; c < 9; c++) {
        const x = r.x0 + 2 + k * 2,
          z = r.z1 - 0.8;
        wb.box('iron', x - 0.03, DY + 3.7 - c * 0.14, z - 0.03, x + 0.03, DY + 3.8 - c * 0.14, z + 0.03, { ao: false, room: ROOM });
      }
    bakeCorpse(wb, r.x1 - 2.4, DY, r.z1 - 2.2, 0.7, 'back', 'burnt', 4450);
    bakeCorpse(wb, r.x0 + 3.6, DY, r.z0 + 3.2, -2.2, 'face', 'burnt', 4451);
    P.fleshGrowth(ctx, (r.x0 + r.x1) / 2, DY, r.z0 + 0.4, 1.6, 4452, { room: ROOM, climb: 3.0, lift: 1.4, bound: [r.x0 + 1, r.x1 - 1, r.z0 - 0.5, r.z0 + 2] });
    P.brazier(ctx, r.x1 - 1.2, DY, r.z1 - 1.2, { room: ROOM, radius: 8 });
    P.wallTorch(ctx, r.x0, DY + 2.3, (r.z0 + r.z1) / 2, 'e', { room: ROOM, radius: 6 });
    ctx.lights.push({ x: (r.x0 + r.x1) / 2, y: DY + 2.5, z: (r.z0 + r.z1) / 2, r: 0.8, g: 0.15, b: 0.08, radius: 9, intensity: 0.6, room: ROOM });
  }

  // ------------------------------------------------------------ la capilla de San Martín
  {
    const cx = (CH.x0 + CH.x1) / 2,
      cz = (CH.z0 + CH.z1) / 2;
    barrelVault(ctx, { x0: CH.x0, z0: CH.z0, x1: CH.x1, z1: CH.z1, axis: 'z', ys: Y + 3.4, rise: 1.7, mat: 'mossstone', tint: VT, room: ROOM, sub: 1.0, impostTint: AT });
    lunette(ctx, { axis: 'z', at: CH.z0, c: cx, span: CH.x1 - CH.x0, ys: Y + 3.4, rise: 1.7, face: 1, mat: 'mossstone', tint: CT, room: ROOM });
    lunette(ctx, { axis: 'z', at: CH.z1, c: cx, span: CH.x1 - CH.x0, ys: Y + 3.4, rise: 1.7, face: -1, mat: 'mossstone', tint: CT, room: ROOM });
    ctx.col.addCam(CH.x0, Y + 5.1, CH.z0, CH.x1, Y + 5.5, CH.z1);
    // el santo obispo, velado, sobre el altar del fondo (al norte)
    P.candleAltar(ctx, cx, Y, CH.z0 + 1.1, 0, ROOM);
    P.veiledStatue(ctx, cx, Y, CH.z0 + 0.55, 0, { ped: 1.2, veil: 'clothWhite' });
    P.candles(ctx, CH.x0 + 0.6, Y, CH.z1 - 0.7, 7, 4460, { room: ROOM, radius: 5, intensity: 1.0 });
    P.candles(ctx, CH.x1 - 0.6, Y, CH.z0 + 2.4, 5, 4461, { room: ROOM, radius: 4, intensity: 0.8 });
    P.banner(ctx, CH.x0 + 0.08, Y + 3.0, cz + 0.5, Math.PI / 2, 'bannerRed', 1.0, 2.2);
    P.hangingLamp(ctx, cx, Y + 5.1, cz + 1, { room: ROOM, len: 0.8, radius: 6, intensity: 0.9 });
    L.interact.push(
      { kind: 'altar', id: 'a_martin', name: 'Capilla de San Martín', x: cx, y: Y, z: CH.z0 + 1.1, spawn: [cx, Y, cz + 1.2], yaw: Math.PI },
      { kind: 'note', id: 'n_martin', note: 'sanmartin', x: CH.x1 - 0.5, y: Y + 1.3, z: cz + 1.6, model: 'wall', r: 1.8 }
    );
  }

  // ------------------------------------------------------------ la antesala
  const YC = H.YC,
    YS = H.YS;
  {
    const [zA, zB] = H.rows;
    const DT = [0.7, 0.66, 0.62];
    // la escalinata (baja hacia levante) con sus pretiles, y el rellano
    const S = D.stair;
    stairs(ctx, S.x1, DY, S.z, 'w', S.w, S.n, (Y - DY) / S.n, (S.x1 - S.x0) / S.n, 'ashlar', { solidBelow: true });
    // los pretiles: un muro que baja escalón a escalón, con sus pilares
    const run = (S.x1 - S.x0) / S.n,
      rise = (Y - DY) / S.n;
    for (const s of [-1, 1]) {
      const z = S.z + s * (S.w / 2 + 0.25);
      for (let i = 0; i < S.n; i += 2) {
        const xa = S.x1 - (i + 2) * run,
          xb = S.x1 - i * run;
        wb.box('ashlar', xa, DY, z - 0.25, xb, DY + (i + 2) * rise + 0.95, z + 0.25, { faces: 'tnsew', ao: false, room: ROOM, tint: AT, sub: 2 });
      }
      for (let i = 0; i <= S.n; i += 5) {
        const x = S.x1 - i * run;
        wb.box('ashlar', x - 0.32, DY, z - 0.34, x + 0.32, DY + Math.min(S.n, i + 1) * rise + 1.25, z + 0.34, { faces: 'tnsew', ao: false, room: ROOM, tint: [0.92, 0.89, 0.83] });
      }
      ctx.col.add(S.x0, DY, z - 0.25, S.x1, Y + 1.0, z + 0.25);
    }
    // el estrado de la puerta y su escalera
    const Ds = D.dais,
      DS = D.daisStair;
    wb.box('ashlar', Ds.x0, DY - 0.3, Ds.z0, Ds.x1, AY, Ds.z1, { faces: 'tnsw', sub: 2, room: ROOM, tint: DT, aoH: 0.8, baseY: DY });
    ctx.col.add(Ds.x0, DY - 0.5, Ds.z0, Ds.x1, AY, Ds.z1);
    stairs(ctx, DS.x0, DY, DS.z, 'e', DS.w, DS.n, (AY - DY) / DS.n, (DS.x1 - DS.x0) / DS.n, 'ashlar', { solidBelow: true });
    // la cornisa del estrado y su balaustrada (con el hueco de la escalera)
    wb.box('ashlar', Ds.x0 - 0.12, AY - 0.25, Ds.z0 - 0.12, Ds.x1, AY, Ds.z1 + 0.12, { faces: 'nsw', ao: false, room: ROOM, tint: AT });
    const bal = (x0, z0, x1, z1) => {
      wb.box('ashlar', x0, AY, z0, x1, AY + 0.95, z1, { faces: 'tnsew', ao: false, room: ROOM, tint: AT, sub: 2 });
      ctx.col.add(x0, AY, z0, x1, AY + 1.0, z1);
    };
    bal(Ds.x0, Ds.z0, Ds.x0 + 0.3, DS.z - DS.w / 2);
    bal(Ds.x0, DS.z + DS.w / 2, Ds.x0 + 0.3, Ds.z1);
    bal(Ds.x0 + 0.3, Ds.z0, Ds.x1 - 0.5, Ds.z0 + 0.3);
    bal(Ds.x0 + 0.3, Ds.z1 - 0.3, Ds.x1 - 0.5, Ds.z1);
    // las columnas (las del estrado, más cortas) y las arcadas
    for (const z of [zA, zB]) {
      for (const x of H.cols) {
        const y0 = x > Ds.x0 ? AY : DY;
        P.column(ctx, x, y0, z, YC - y0, 0.6, { mat: 'ashlar' });
      }
      const xs = [H.x0, ...H.cols, H.x1];
      for (let k = 0; k < xs.length - 1; k++) {
        const a = xs[k],
          b = xs[k + 1];
        const pa = k === 0 ? a : a + 0.6,
          pb = k === xs.length - 2 ? b : b - 0.6;
        const w = pb - pa;
        archRing(ctx, { axis: 'x', c: (pa + pb) / 2, w, y0: YC, rise: Math.min(w / 2, YS - YC), ring: 0.36, t0: z - 0.35, t1: z + 0.35, top: YS, clip: [a, b], mat: 'ashlar', spMat: 'ashlar', room: ROOM, tint: AT, spTint: DT, cam: false });
      }
    }
    // las bóvedas: la de la nave (alta) y las de las naves laterales
    const nave = { x0: H.x0, x1: H.x1, z0: zA, z1: zB };
    barrelVault(ctx, { ...nave, axis: 'x', ys: YS, rise: 3.0, mat: 'ashlar', tint: VT, room: ROOM, sub: 1.0, impostTint: AT });
    barrelVault(ctx, { x0: H.x0, x1: H.x1, z0: H.z0, z1: zA, axis: 'x', ys: YS, rise: 1.5, mat: 'ashlar', tint: VT, room: ROOM, sub: 1.0, impostTint: AT });
    barrelVault(ctx, { x0: H.x0, x1: H.x1, z0: zB, z1: H.z1, axis: 'x', ys: YS, rise: 1.5, mat: 'ashlar', tint: VT, room: ROOM, sub: 1.0, impostTint: AT });
    for (const at of [H.x0, H.x1]) {
      const f = at === H.x0 ? 1 : -1;
      lunette(ctx, { axis: 'x', at, c: (zA + zB) / 2, span: zB - zA, ys: YS, rise: 3.0, face: f, mat: 'ashlar', tint: DT, room: ROOM });
      lunette(ctx, { axis: 'x', at, c: (H.z0 + zA) / 2, span: zA - H.z0, ys: YS, rise: 1.5, face: f, mat: 'ashlar', tint: DT, room: ROOM });
      lunette(ctx, { axis: 'x', at, c: (zB + H.z1) / 2, span: H.z1 - zB, ys: YS, rise: 1.5, face: f, mat: 'ashlar', tint: DT, room: ROOM });
    }
    // los fajones sobre cada pareja de columnas
    for (const x of H.cols) archRing(ctx, { axis: 'z', c: (zA + zB) / 2, w: zB - zA - 0.4, y0: YS, rise: 2.75, ring: 0.34, t0: x - 0.3, t1: x + 0.3, mat: 'ashlar', room: ROOM, tint: AT, cam: false });
    ctx.col.addCam(H.x0, YS + 3.0, zA, H.x1, YS + 3.4, zB);
    ctx.col.addCam(H.x0, YS + 1.5, H.z0, H.x1, YS + 1.9, zA);
    ctx.col.addCam(H.x0, YS + 1.5, zB, H.x1, YS + 1.9, H.z1);
    // pilastras en los muros de las naves laterales, frente a las columnas
    for (const x of H.cols) {
      const y0 = x > Ds.x0 ? AY : DY;
      pilaster(ctx, H.z0, x, 's', DY, YS, { room: ROOM, tint: AT, w: 0.7, d: 0.2 });
      pilaster(ctx, H.z1, x, 'n', DY, YS, { room: ROOM, tint: AT, w: 0.7, d: 0.2 });
      void y0;
    }
    // el suelo de la nave: una alfombra de mosaico hasta el estrado
    wb.box('mosaic', S.x1, DY + 0.005, zA + 1.2, DS.x0, DY + 0.012, zB - 1.2, { faces: 't', ao: false, room: ROOM, uv: 0.2, tint: [0.8, 0.5, 0.45] });
    // los velados colosales de las naves laterales, de espaldas al muro
    // (al norte, el primer tramo lo ocupa la boca de la pila de los condenados)
    for (const x of [-40, -34, -28]) {
      if (x !== -40) giantVeiled(ctx, x, DY, H.z0 + 1.3, 0, 1.0);
      giantVeiled(ctx, x, DY, H.z1 - 1.3, Math.PI, 1.0);
    }
    // estandartes en los tramos libres
    for (const x of [-40, -22]) {
      P.banner(ctx, x, YS - 0.2, H.z0 + 0.08, 0, 'bannerBlack', 1.3, 3.6);
      P.banner(ctx, x, YS - 0.2, H.z1 - 0.08, Math.PI, 'bannerRed', 1.3, 3.6);
    }
    // braseros al pie del estrado y en las esquinas, velas por la escalera
    P.brazier(ctx, Ds.x0 - 2.6, DY, DS.z - DS.w / 2 - 0.9, { room: ROOM, radius: 10, s: 1.3 });
    P.brazier(ctx, Ds.x0 - 2.6, DY, DS.z + DS.w / 2 + 0.9, { room: ROOM, radius: 10, s: 1.3 });
    P.brazier(ctx, H.x0 + 1.4, DY, H.z0 + 1.4, { room: ROOM, radius: 8 });
    P.brazier(ctx, H.x0 + 1.4, DY, H.z1 - 1.4, { room: ROOM, radius: 8 });
    // velas en los escalones, junto a los pretiles
    for (let i = 2; i < S.n; i += 4) {
      const x = S.x1 - (i + 0.5) * run;
      const yy = DY + (i + 1) * rise;
      P.candles(ctx, x, yy, S.z + ((i / 4) % 2 ? -1 : 1) * (S.w / 2 - 0.35), 3, 4470 + i, { room: ROOM, radius: 3, intensity: 0.5, spread: 0.12 });
    }
    P.candles(ctx, Ds.x0 + 0.6, AY, Ds.z0 + 0.8, 9, 4490, { room: ROOM, radius: 5, intensity: 1.0, spread: 0.5 });
    P.candles(ctx, Ds.x0 + 0.6, AY, Ds.z1 - 0.8, 9, 4491, { room: ROOM, radius: 5, intensity: 1.0, spread: 0.5 });
    // la puerta del dios: el marco colosal, el dintel con DEO IGNOTO (lo
    // escribe el juego) y las tres cabezas que lloran sangre; las hojas, los
    // círculos y la cerradura los pone game/crypt.js
    const DR = D.door;
    const z0 = DR.z - DR.w / 2,
      z1 = DR.z + DR.w / 2;
    const xf = H.x1 - 0.02;
    wb.box('ashlar', xf - 0.5, AY, z0 - 0.9, xf, AY + DR.h + 0.2, z0, { faces: 'wns', ao: false, room: ROOM, tint: AT, sub: 2 });
    wb.box('ashlar', xf - 0.5, AY, z1, xf, AY + DR.h + 0.2, z1 + 0.9, { faces: 'wns', ao: false, room: ROOM, tint: AT, sub: 2 });
    ctx.col.add(xf - 0.5, AY, z0 - 0.9, xf, AY + DR.h + 0.2, z0);
    ctx.col.add(xf - 0.5, AY, z1, xf, AY + DR.h + 0.2, z1 + 0.9);
    wb.box('ashlar', xf - 0.6, AY + DR.h, z0 - 1.1, xf, AY + DR.h + 0.75, z1 + 1.1, { faces: 'wnsb', ao: false, room: ROOM, tint: AT, sub: 2 });
    wb.box('ashlar', xf - 0.8, AY + DR.h + 0.75, z0 - 1.4, xf, AY + DR.h + 0.95, z1 + 1.4, { faces: 'wnstb', ao: false, room: ROOM, tint: AT, sub: 2 });
    // las tres cabezas sobre la cornisa: lloran sangre cuando se vacían las
    // pilas (las lágrimas las pone el juego)
    for (const z of [DR.z - 1.0, DR.z, DR.z + 1.0]) {
      const yb = AY + DR.h + 0.95;
      wb.box('ashlar', xf - 0.5, yb, z - 0.26, xf, yb + 0.62, z + 0.26, { ao: false, room: ROOM, tint: [0.62, 0.6, 0.56] });
      wb.box('ashlar', xf - 0.66, yb + 0.06, z - 0.2, xf - 0.5, yb + 0.56, z + 0.2, { ao: false, room: ROOM, tint: [0.62, 0.6, 0.56] });
      wb.box('black', xf - 0.665, yb + 0.33, z - 0.13, xf - 0.66, yb + 0.4, z - 0.04, { faces: 'w', ao: false, grime: false, room: ROOM });
      wb.box('black', xf - 0.665, yb + 0.33, z + 0.04, xf - 0.66, yb + 0.4, z + 0.13, { faces: 'w', ao: false, grime: false, room: ROOM });
      wb.box('black', xf - 0.665, yb + 0.12, z - 0.08, xf - 0.66, yb + 0.2, z + 0.08, { faces: 'w', ao: false, grime: false, room: ROOM });
    }
    // el sello sobre la puerta (en el luneto) y su resplandor
    P.decal(ctx, H.x1 - 0.03, YS + 1.3, DR.z, 3.4, 'sigil', -1, { wall: 'x' });
    ctx.lights.push({ x: H.x1 - 2.5, y: AY + 3.2, z: DR.z, r: 1, g: 0.2, b: 0.12, radius: 10, intensity: 1.0, room: ROOM });
    ctx.lights.push({ x: -31, y: DY + 4.0, z: -152, r: 0.9, g: 0.45, b: 0.3, radius: 14, intensity: 0.7, room: ROOM });
    // el incensario del estrado: el gancho en la bóveda y la peana donde
    // descansa mientras está frío (el incensario y su cadena los pone
    // game/crypt.js)
    const CE = D.censer;
    wb.box('iron', CE.x - 0.2, YS + 2.9, CE.z - 0.2, CE.x + 0.2, YS + 3.05, CE.z + 0.2, { ao: false, room: ROOM });
    wb.cylinder('ashlar', CE.x, AY, CE.z, 0.62, 0.7, 0.3, 10, { ao: false, capTop: true, room: ROOM, tint: AT });
    ctx.col.add(CE.x - 0.62, AY, CE.z - 0.62, CE.x + 0.62, AY + 0.3, CE.z + 0.62);
    // la inscripción de los velados, al pie de la escalinata, en el rellano
    L.interact.push(
      { kind: 'note', id: 'n_velados', note: 'velados', x: LD.x0 + 0.5, y: Y + 1.3, z: LD.z1 - 0.6, model: 'wall', r: 1.8 },
      { kind: 'door', id: 'd_dios', x: H.x1 + 0.5, y: AY, z: DR.z, w: DR.w, h: DR.h, axis: 'z', lock: { type: 'god' }, mat: 'god', ix: H.x1 - 1.4, iz: DR.z, r: 2.6 },
      { kind: 'censer', id: 'x_incensario', x: CE.x, y: AY, z: CE.z, r: 2.0 },
      // la niebla de los Velados, en lo alto de la escalinata
      { kind: 'fog', id: 'f_velados', boss: 'guardianes', x: H.x0 - 0.35, y: Y, z: S.z, w: S.w, h: 3.2, axis: 'z', enter: 1 },
      // y la del Turiferario, ya dentro de la cisterna (tras la puerta)
      { kind: 'fog', id: 'f_boss', boss: 'turibulario', x: H.x1 + 1.6, y: AY, z: DR.z, w: DR.w, h: DR.h, axis: 'z', enter: 1 }
    );
  }

  // ------------------------------------------------------------ las catacumbas del este y la sacristía
  {
    for (const c of el.seen) {
      const [i, j] = c.split(',').map(Number);
      if ((i + j) % 3 === 0) {
        const [x, z] = cellC(E, i, j);
        P.bones(ctx, x, Y, z, 7, i * 13 + j * 5 + 4500, 0.7);
      }
    }
    // la sacristía: armarios de los ornamentos, la mesa con el incienso, los
    // incensarios colgados y el arcón
    const r = SA;
    const cx = (r.x0 + r.x1) / 2,
      cz = (r.z0 + r.z1) / 2;
    P.shelf && P.shelf(ctx, r.x0 + 1.3, Y, r.z1 - 0.25, Math.PI, 2.0);
    P.shelf && P.shelf(ctx, r.x1 - 0.25, Y, cz, -Math.PI / 2, 2.4);
    P.table(ctx, cx - 0.6, Y, cz - 0.4, 2.0, 0.9, 0);
    P.bench(ctx, cx - 0.6, Y, cz + 0.5, 1.6, 0);
    wb.box('wooddark', r.x0 + 0.3, Y, r.z0 + 0.6, r.x0 + 1.6, Y + 0.7, r.z0 + 1.3, { faces: 'tnsew', aoH: 0.5, room: ROOM });
    ctx.col.add(r.x0 + 0.3, Y, r.z0 + 0.6, r.x0 + 1.6, Y + 0.72, r.z0 + 1.3);
    for (const x of [r.x0 + 2.6, r.x0 + 4.2, r.x0 + 5.8]) {
      for (let c = 0; c < 6; c++) wb.box('iron', x - 0.02, Y + 3.0 - c * 0.12, r.z0 + 0.5 - 0.02, x + 0.02, Y + 3.1 - c * 0.12, r.z0 + 0.5 + 0.02, { ao: false, room: ROOM });
      wb.cylinder('bronze', x, Y + 2.0, r.z0 + 0.5, 0.12, 0.16, 0.26, 7, { ao: false, capBot: true, room: ROOM });
    }
    P.candles(ctx, cx - 1.2, Y + 0.8, cz - 0.6, 3, 4510, { room: ROOM, radius: 4, intensity: 0.8, spread: 0.2 });
    P.candles(ctx, r.x1 - 0.7, Y, r.z0 + 0.7, 5, 4511, { room: ROOM, radius: 4, intensity: 0.7 });
    bakeCorpse(wb, cx + 1.6, Y, cz + 2.2, 2.4, 'face', 'villager', 4512);
    P.decal(ctx, cx + 1.6, Y + 0.02, cz + 2.2, 1.7);
    L.interact.push(
      { kind: 'door', id: 'd_sacristia', x: r.door.x, y: Y, z: r.door.z, w: r.door.w, h: 2.4, axis: 'x', lock: { type: 'key', item: 'anillo' }, mat: 'planks', hinge: -1, swing: -1, plane: -133 },
      { kind: 'item', id: 'i_incienso', item: 'incienso', x: cx - 0.6, y: Y + 0.86, z: cz - 0.4 },
      { kind: 'note', id: 'n_incienso', note: 'incienso', x: cx + 0.1, y: Y + 0.81, z: cz - 0.6, model: 'book' }
    );
    // la galería: el aviso de las pilas (en el muro, frente al osario)
    L.interact.push({ kind: 'note', id: 'n_pilas', note: 'pilas', x: 0, y: Y + 1.4, z: G.z0 + 0.4, model: 'wall', r: 1.8 });
  }

  // ------------------------------------------------------------ criaturas
  const at = (i, j, M0 = M) => cellC(M0, i, j);
  const e = (type, i, j, o = {}, M0 = M) => {
    const [x, z] = at(i, j, M0);
    return { type, x, y: Y, z, yaw: o.yaw ?? 0, idle: o.idle ?? 'stand', id: o.id, ...o };
  };
  L.enemies.push(
    // las catacumbas
    e('penitent', 7, 7, { id: 'e_cat1', idle: 'pray', yaw: Math.PI / 2 }),
    e('crawler', 5, 6, { id: 'e_cat2', idle: 'ceiling' }),
    e('mourner', 3, 4, { id: 'e_cat3', idle: 'wander' }),
    e('soldier', 2, 1, { id: 'e_cat4', idle: 'stand', yaw: Math.PI }),
    e('penitent', 1, 7, { id: 'e_cat5', idle: 'eat', yaw: 1.2 }),
    e('crawler', 6, 2, { id: 'e_cat6', idle: 'ceiling' }),
    e('hound', 4, 8, { id: 'e_cat7', idle: 'eat', yaw: -0.5 }),
    { type: 'bell', x: (F1.x0 + F1.x1) / 2 + 2.2, y: Y, z: (F1.z0 + F1.z1) / 2 + 1.6, yaw: Math.PI, idle: 'stand', id: 'e_cat8' },
    { type: 'mourner', x: (CU.x0 + CU.x1) / 2 - 1.8, y: Y, z: CU.z0 + 1.4, yaw: 0, idle: 'stand', id: 'e_cat9' },
    // la galería
    { type: 'soldier', x: -24, y: Y, z: -134.7, yaw: Math.PI / 2, idle: 'wander', id: 'e_gal1' },
    { type: 'crawler', x: 9.5, y: Y + 3.0, z: -134.7, yaw: 0, idle: 'ceiling', id: 'e_gal2' },
    { type: 'penitent', x: -50.2, y: Y, z: -146.5, yaw: Math.PI, idle: 'kneel', id: 'e_gal3' },
    // las catacumbas del este, su pila y la sacristía
    e('soldier', 0, 1, { id: 'e_est1', idle: 'stand', yaw: Math.PI / 2 }, E),
    e('crawler', 3, 1, { id: 'e_est2', idle: 'ceiling' }, E),
    { type: 'penitent', x: F2.x0 + 3, y: Y, z: F2.z1 - 3, yaw: Math.PI, idle: 'pray', id: 'e_est3' },
    { type: 'penitent', x: F2.x1 - 3, y: Y, z: F2.z0 + 3.5, yaw: 0, idle: 'eat', id: 'e_est4' },
    { type: 'bell', x: (F2.x0 + F2.x1) / 2 - 3, y: Y, z: (F2.z0 + F2.z1) / 2, yaw: Math.PI / 2, idle: 'wander', id: 'e_est5' },
    { type: 'mourner', x: SA.x0 + 2, y: Y, z: SA.z1 - 2, yaw: Math.PI, idle: 'pray', id: 'e_sac1' },
    // la pila de los condenados
    { type: 'soldier', x: F3.x0 + 3, y: DY, z: (F3.z0 + F3.z1) / 2, yaw: Math.PI / 2, idle: 'stand', id: 'e_hon1' },
    { type: 'soldier', x: F3.x1 - 3, y: DY, z: (F3.z0 + F3.z1) / 2 + 1, yaw: -Math.PI / 2, idle: 'stand', id: 'e_hon2' },
    { type: 'crawler', x: (F3.x0 + F3.x1) / 2 + 1.2, y: DY + 3.78, z: F3.z1 - 2, yaw: 0, idle: 'ceiling', id: 'e_hon3' },
    // la emboscada de la cámara de la garra (ocultas hasta que se coge)
    { type: 'penitent', x: CL.x0 + 1.0, y: Y, z: CL.z0 + 2.2, yaw: Math.PI / 2, idle: 'stand', id: 'e_garra1', held: true, ambush: 'garra' },
    { type: 'penitent', x: CL.x1 - 1.0, y: Y, z: CL.z1 - 2.6, yaw: -Math.PI / 2, idle: 'stand', id: 'e_garra2', held: true, ambush: 'garra' },
    { type: 'crawler', x: (CL.x0 + CL.x1) / 2 - 1.6, y: Y + 5.0, z: CL.z0 + 3.5, yaw: 0, idle: 'ceiling', id: 'e_garra3', held: true, ambush: 'garra' },
    { type: 'crawler', x: (CL.x0 + CL.x1) / 2 + 1.6, y: Y + 5.0, z: CL.z1 - 3.5, yaw: Math.PI, idle: 'ceiling', id: 'e_garra4', held: true, ambush: 'garra' },
    { type: 'soldier', x: CL.x0 + 1.0, y: Y, z: CL.z1 - 2.2, yaw: Math.PI / 2, idle: 'stand', id: 'e_garra5', held: true, ambush: 'garra' },
    // los Velados
    { type: 'guardianL', x: D.guards[0].x, y: AY, z: D.guards[0].z, yaw: -Math.PI / 2, idle: 'boss', boss: true, id: 'b_veladoL' },
    { type: 'guardianR', x: D.guards[1].x, y: AY, z: D.guards[1].z, yaw: -Math.PI / 2, idle: 'boss', boss: true, id: 'b_veladoR' }
  );
  L.phantoms.push({ x: -40, y: Y, z: -134.8, trigger: [-22, Y, -134.8], kind: 'mourner' });

  wb.setRoom(null);

  // ------------------------------------------------------------ zonas y mapa
  const zr = (r, y0, y1) => [r[0], r[1], r[2], r[3], y0, y1];
  L.zones.push(
    { id: 'garra', rects: [zr([CL.x0, CL.z0, CL.x1, CL.z1], -8, -1)], atmo: 'crypt', room: ROOM },
    { id: 'pila_oeste', rects: [zr([F1.x0, F1.z0, F1.x1, F1.z1], -8, -1)], atmo: 'crypt', room: ROOM },
    { id: 'catacumbas', rects: [zr([M.x0, M.z0, M.x0 + M.nx * M.cs, M.z0 + M.nz * M.cs], -8, -1), zr([-22.5, -119, -7.5, -100.5], -8, -1)], atmo: 'crypt', room: ROOM },
    { id: 'capilla_martin', rects: [zr([CH.x0, CH.z0, CH.x1 + 1, CH.z1], -8, -1)], atmo: 'chapel', room: ROOM },
    { id: 'antesala', rects: [zr([H.x0, H.z0, H.x1 + 1, H.z1], -14, -1), zr([LD.x0, LD.z0, LD.x1, LD.z1], -8, -1)], atmo: 'sanctum', room: ROOM },
    { id: 'pila_honda', rects: [zr([F3.x0, F3.z0, F3.x1, F3.z1 + 2], -14, -1)], atmo: 'crypt', room: ROOM },
    { id: 'galeria', rects: [zr([G.x0, G.z0, G.x1, G.z1], -8, -1), zr([N1.x0, N1.z0, N1.x1, N1.z1], -8, -1)], atmo: 'crypt', room: ROOM },
    { id: 'pila_este', rects: [zr([F2.x0, F2.z0, F2.x1, F2.z1], -8, -1)], atmo: 'crypt', room: ROOM },
    { id: 'catacumbas_este', rects: [zr([E.x0, E.z0, E.x0 + E.nx * E.cs, E.z0 + E.nz * E.cs], -8, -1)], atmo: 'crypt', room: ROOM },
    { id: 'sacristia', rects: [zr([SA.x0, SA.z0, SA.x1, SA.z1], -8, -1)], atmo: 'chapel', room: ROOM }
  );
  const mp = (id, r) => L.map.push({ id, r: [r[0], r[1], r[2], r[3]], level: 'crypt' });
  for (const g of regs) {
    if (g.ghost) continue;
    const r = g.r;
    const inside = (B) => r[0] >= B[0] - 0.01 && r[2] <= B[2] + 0.01 && r[1] >= B[1] - 0.01 && r[3] <= B[3] + 0.01;
    let id = g.zone;
    if (!id) {
      if (g.maze === 'east') id = 'catacumbas_este';
      else if (g.maze) id = 'catacumbas';
      else if (inside([SA.x0, SA.z0 - 1, SA.x1, SA.z1])) id = 'sacristia';
      else if (inside([H.x0, H.z0 - 3, H.x1 + 1, H.z1])) id = 'antesala';
      else if (inside([CH.x0, CH.z0, N1.x0, CH.z1])) id = 'capilla_martin';
      else id = 'galeria';
    }
    mp(id, r);
  }
}
