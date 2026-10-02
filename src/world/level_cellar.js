// Las bodegas del canónigo: un laberinto bajo su casa y bajo el patio del
// Postigo. La escalera baja desde la alcoba a la Sala del altar (5,6 m de
// bóveda). Al oeste, la Galería de los toneles y, detrás, el Lagar: una sala
// enorme y diáfana. Al norte, un pasillo, la antecámara y la Cripta de los
// canónigos; al este, el osario, que da la vuelta hasta la cripta. En medio
// de todo, detrás del rastrillo, la cisterna vieja con el fondo del pozo del
// Postigo: la salida. El rastrillo sube con tres palancas (una en el Lagar,
// otra en la cripta y otra al fondo del osario).
//
// La planta se describe con rectángulos transitables (cada uno con la altura
// de su techo). De ahí salen solos los muros (cara a cara con la rejilla
// transitable, sin huecos), los suelos, los techos, los dinteles de los
// arcos, la colisión y la rejilla de navegación. Los nervios de las bóvedas
// llevan colisión sólo para la cámara.
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';
import { subtractRects } from './builders.js';

const F = -6.6; // suelo de las bodegas
const TOP = -1.0; // bajo la losa de la calle

// Regiones transitables: r = [x0, z0, x1, z1], top = techo (y absoluta).
// Las que van después pisan a las anteriores (arcos, dinteles).
// (La cisterna sólo toca el hueco del rastrillo: entre ella y las salas de
// alrededor queda al menos un metro de roca.)
const REGIONS = [
  // tramo bajo de la escalera (bajo el muro norte de la casa)
  { id: 'stair', r: [58, -36.5, 61, -32], top: TOP },
  { id: 'stair', r: [58, -36.5, 61, -36], top: -2.4 },
  // Sala del altar
  { id: 'sotano', r: [52, -46, 66, -36.5], top: TOP, ribs: { x: [55.5, 62.5], z: [-40, -43.2], d: 0.5 } },
  // celda del canónigo (bajo la cocina)
  { id: 'celda', r: [52.5, -35.5, 56.5, -33], top: -3.0, floor: 'planks' },
  { id: 'celda', r: [53.4, -36.5, 55.6, -35.5], top: -3.8 },
  // el hueco del rastrillo, entre la sala y la cisterna
  { id: 'sotano', r: [53.8, -47.5, 56.2, -46], top: -3.4 },
  // cisterna vieja (romana), con el fondo del pozo
  { id: 'cisterna', r: [49.5, -60, 62, -47.5], top: TOP, floor: 'mossstone', ribs: { x: [52.5, 58.5], d: 0.6 } },
  // Galería de los toneles
  { id: 'toneles', r: [40, -46.5, 51, -36.5], top: -2.0, ribs: { z: [-38.8, -42.7], d: 0.4 } },
  { id: 'toneles', r: [51, -40.6, 52, -37.8], top: -3.3 },
  { id: 'toneles', r: [51, -45.2, 52, -42.4], top: -3.3 },
  // El Lagar: la sala grande (sin apenas estorbos)
  { id: 'lagar', r: [26, -60, 38, -35], top: TOP, ribs: { z: [-40, -45.5, -51, -56], d: 0.55 } },
  { id: 'lagar', r: [38, -45.5, 40, -41.5], top: -2.4 },
  { id: 'lagar', r: [38, -39.5, 40, -37.5], top: -3.2 },
  { id: 'lagar', r: [38, -60, 39.5, -57.5], top: -3.2 },
  // pasillo norte y antecámara
  { id: 'pasillo', r: [40.5, -57, 43.5, -46.5], top: -2.8, ribs: { z: [-50.5, -54], d: 0.3 } },
  { id: 'pasillo', r: [40.5, -47, 43.5, -46.5], top: -3.4 },
  { id: 'pasillo', r: [39.5, -64, 47, -57], top: -2.4 },
  // Cripta de los canónigos y su pasillo
  { id: 'cripta', r: [43, -73, 45.5, -64], top: -2.6, ribs: { z: [-67, -70], d: 0.3 } },
  { id: 'cripta', r: [40, -83, 58, -73], top: -1.4, ribs: { x: [46, 52], d: 0.5 } },
  // pasillo de la cripta al osario
  { id: 'osario', r: [58, -79, 67, -76.5], top: -2.6 },
  // osario: galería larga con calaveras en los muros, y su ramal ciego
  { id: 'osario', r: [67, -79, 70.5, -36.5], top: -2.6, wall: 'skulls', ribs: { z: [-40, -44, -48, -52, -56, -60, -64, -68, -72, -76], d: 0.3 } },
  { id: 'osario', r: [66, -41.8, 67, -38.8], top: -3.3 },
  { id: 'osario', r: [63, -65, 67, -61], top: -2.6, wall: 'skulls' },
];

// Madrigueras: grutas que él mismo ha excavado en la roca, a ras de suelo,
// comunicadas por dentro (sólo él cabe: tú chocas con la roca). x, z: centro
// de la boca en la cara del muro; nx, nz: hacia dónde mira (hacia la sala).
// Por cada boca, un túnel de BURROW.depth metros se mete en la roca maciza y
// se pierde en lo oscuro.
export const BURROW = { w: 1.9, h: 1.6, depth: 2.8, inside: 2.3, front: 1.5 };
const BURROWS = [
  // la sala del altar y la cripta
  [
    { x: 64.6, z: -46, nx: 0, nz: 1 },
    { x: 58, z: -75, nx: -1, nz: 0 },
  ],
  // la galería de los toneles y el Lagar
  [
    { x: 45, z: -36.5, nx: 0, nz: -1 },
    { x: 26, z: -42, nx: 1, nz: 0 },
  ],
  // la antecámara y el ramal ciego del osario (la tercera palanca)
  [
    { x: 47, z: -62.5, nx: -1, nz: 0 },
    { x: 65, z: -65, nx: 0, nz: 1 },
  ],
  // el Lagar y la cripta (entre los dos sepulcros del oeste: pegada a uno
  // de ellos, no cabía delante de la boca)
  [
    { x: 34.5, z: -60, nx: 0, nz: 1 },
    { x: 40, z: -79, nx: 1, nz: 0 },
  ],
  // la sala del altar (junto a la escalera) y el osario
  [
    { x: 63.2, z: -36.5, nx: 0, nz: -1 },
    { x: 67, z: -56, nx: 1, nz: 0 },
  ],
];

// Puntos de acecho: desde aquí mira (colgado del techo o encogido en un
// rincón oscuro). La IA elige entre ellos.
const PERCHES = [
  // sala
  [52.9, -45.1],
  [65.1, -45.1],
  [52.9, -37.4],
  [65.1, -37.4],
  [59, -41.6],
  // galería
  [41, -45.8],
  [50, -45.8],
  [41, -37.4],
  [50, -37.4],
  [45.5, -42.6],
  // Lagar
  [27, -36],
  [37, -36],
  [27, -59],
  [37, -59],
  [32, -44],
  [32, -51],
  [36.5, -47.5],
  // pasillo y antecámara
  [42, -52],
  [42, -55.5],
  [40.5, -63],
  [46, -63],
  [46, -58],
  // pasillo de la cripta
  [44.2, -69],
  // cripta
  [41, -82],
  [57, -82],
  [41, -74],
  [57, -74],
  [49, -78],
  // pasillo y osario
  [62.5, -77.7],
  [68.8, -37.6],
  [68.8, -45],
  [68.8, -52],
  [68.8, -59],
  [68.8, -66],
  [68.8, -73],
  [68.8, -78],
  [64, -64],
  [66, -62],
];

// Puestos de emboscada: en la bóveda, nada más pasar un arco o una puerta
// (por donde hay que pasar por fuerza, y el dintel lo tapa hasta que estás
// debajo) y en mitad de los pasillos largos. Ahí espera colgado, a oscuras,
// a que pases por debajo sin mirar arriba, y te cae encima. Sólo donde la
// bóveda queda bien por encima de tu cabeza (3,7 m o más).
const AMBUSH_EXTRA = [
  [42, -52], // pasillo norte
  [44.2, -68.5], // pasillo de la cripta
  [62.5, -77.7], // pasillo del osario
  [68.8, -48],
  [68.8, -60],
  [68.8, -70], // galería del osario
];
function ambushSpots() {
  const R = REGIONS.map((q) => ({ id: q.id, x0: q.r[0], z0: q.r[1], x1: q.r[2], z1: q.r[3], top: q.top }));
  // (las regiones de después pisan a las de antes, como al pintar la planta)
  const topAt = (x, z) => {
    let t = null;
    for (const q of R) if (x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1) t = q.top;
    return t;
  };
  const out = [];
  const add = (x, z, kind, door = null) => {
    const t = topAt(x, z);
    if (t === null || t - F < 3.7) return;
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < 1.6)) return;
    out.push({ x, z, top: t, kind, door });
  };
  for (const A of R)
    for (const B of R) {
      if (A === B || A.id === 'stair' || B.id === 'stair') continue;
      for (const [ax, bx, axis] of [
        [A.x1, B.x0, 'x'],
        [A.z1, B.z0, 'z'],
      ]) {
        if (Math.abs(ax - bx) > 1e-6) continue;
        const s0 = axis === 'x' ? Math.max(A.z0, B.z0) : Math.max(A.x0, B.x0),
          s1 = axis === 'x' ? Math.min(A.z1, B.z1) : Math.min(A.x1, B.x1);
        if (s1 - s0 < 1.2) continue;
        // (dos trozos de una misma sala que se tocan a todo lo ancho no son un paso)
        const wa = axis === 'x' ? A.z1 - A.z0 : A.x1 - A.x0;
        if (A.id === B.id && Math.abs(s1 - s0 - wa) < 0.01) continue;
        const m = (s0 + s1) / 2;
        const door = { axis, at: ax, s0, s1 };
        for (const side of [-1, 1]) {
          const k = ax + side * 1.35;
          if (axis === 'x') add(k, m, 'door', door);
          else add(m, k, 'door', door);
        }
      }
    }
  for (const [x, z] of AMBUSH_EXTRA) add(x, z, 'hall');
  return out;
}

// Las tres palancas del rastrillo: punto del muro y hacia dónde mira.
const LEVERS = [
  { id: 'p_lagar', x: 26, z: -47.5, nx: 1, nz: 0, where: 'el Lagar' },
  { id: 'p_cripta', x: 49, z: -83, nx: 0, nz: 1, where: 'la cripta' },
  { id: 'p_osario', x: 63, z: -63, nx: 1, nz: 0, where: 'el osario' },
];

export const CELLAR = {
  FLOOR: F,
  TOP,
  // rejilla transitable propia
  grid: [24, -86, 74, -24],
  // envolvente (juego, mapa, zona)
  bounds: [25.5, -84, 71.5, -32],
  regions: REGIONS,
  // (fx, fz: delante de la boca; ix, iz: dentro del túnel, donde desaparece)
  burrows: BURROWS.map((pair) =>
    pair.map((a) => ({ ...a, y: F, fx: a.x + a.nx * BURROW.front, fz: a.z + a.nz * BURROW.front, ix: a.x - a.nx * BURROW.inside, iz: a.z - a.nz * BURROW.inside }))
  ),
  perches: PERCHES.map(([x, z]) => ({ x, z })),
  ambush: ambushSpots(),
  // sitios despejados donde le gusta pelear cuando enloquece
  open: [
    { id: 'lagar', x: 32, z: -47.5, r: 5.5 },
    { id: 'cripta', x: 49, z: -78, r: 3.6 },
    { id: 'sotano', x: 59, z: -41.6, r: 3 },
  ],
  levers: LEVERS.map((L) => ({ ...L, ix: L.x + L.nx * 0.45, iz: L.z + L.nz * 0.45 })),
  // el rastrillo de la cisterna (hueco de 2,4 m entre la sala y la cisterna)
  portcullis: { x: 55, z: -46.75, w: 2.4, h: 3.2 },
  // el fondo del pozo (salida), al fondo de la cisterna, lejos del rastrillo
  // (el tiro sube por la roca hasta el pozo de la calle, más al sur), y el
  // comedero del canónigo
  well: { x: 55, z: -54, r: 1.3 },
  streetWell: { x: 55, z: -54 },
  feast: { x: 59, z: -43.3, yaw: Math.PI, corpse: [59.1, -44.5] },
};

// Altura del techo en (x, z) (null fuera de las bodegas).
let _tops = null,
  _grid = null;
export function cellarCeil(x, z) {
  if (!_tops) return null;
  const i = Math.floor((x - _grid.x0) / _grid.res),
    j = Math.floor((z - _grid.z0) / _grid.res);
  if (i < 0 || j < 0 || i >= _grid.w || j >= _grid.h) return null;
  const t = _tops[j * _grid.w + i];
  return Number.isNaN(t) ? null : t;
}
// Sala (id de la región) en (x, z).
let _rid = null;
export function cellarRoom(x, z) {
  if (!_rid) return null;
  const i = Math.floor((x - _grid.x0) / _grid.res),
    j = Math.floor((z - _grid.z0) / _grid.res);
  if (i < 0 || j < 0 || i >= _grid.w || j >= _grid.h) return null;
  const n = _rid[j * _grid.w + i];
  return n >= 0 ? REGIONS[n].id : null;
}

// Rectángulos máximos de celdas con la misma clave (voraz, como WalkGrid.rects).
function mergeCells(W, H, key) {
  const used = new Uint8Array(W * H);
  const out = [];
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const k0 = key(i, j);
      if (k0 === null || used[j * W + i]) continue;
      let i2 = i;
      while (i2 + 1 < W && !used[j * W + i2 + 1] && key(i2 + 1, j) === k0) i2++;
      let j2 = j;
      outer: while (j2 + 1 < H) {
        for (let ii = i; ii <= i2; ii++) if (used[(j2 + 1) * W + ii] || key(ii, j2 + 1) !== k0) break outer;
        j2++;
      }
      for (let jj = j; jj <= j2; jj++) for (let ii = i; ii <= i2; ii++) used[jj * W + ii] = 1;
      out.push({ k: k0, i0: i, j0: j, i1: i2 + 1, j1: j2 + 1 });
    }
  return out;
}

export function buildCellar(ctx, B, L, o = {}) {
  const wb = ctx.wb;
  const col = ctx.col;
  const room = o.room ?? 'sotano';
  const rng = new RNG(6161);
  const res = B.res;
  const W = B.w,
    H = B.h;
  ctx.waters = ctx.waters || [];
  // ---------------------------------------------------------- planta
  const tops = new Float32Array(W * H).fill(NaN);
  const rid = new Int16Array(W * H).fill(-1);
  const ix = (x) => Math.round((x - B.x0) / res),
    iz = (z) => Math.round((z - B.z0) / res);
  REGIONS.forEach((R, n) => {
    const [x0, z0, x1, z1] = R.r;
    B.paint(x0, z0, x1, z1, 1);
    for (let j = Math.max(0, iz(z0)); j < Math.min(H, iz(z1)); j++)
      for (let i = Math.max(0, ix(x0)); i < Math.min(W, ix(x1)); i++) {
        tops[j * W + i] = R.top;
        rid[j * W + i] = n;
      }
  });
  _tops = tops;
  _rid = rid;
  _grid = { x0: B.x0, z0: B.z0, res, w: W, h: H };
  const cx = (i) => B.x0 + i * res,
    cz = (j) => B.z0 + j * res;
  const top = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? NaN : tops[j * W + i]);
  const reg = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? null : rid[j * W + i] >= 0 ? REGIONS[rid[j * W + i]] : null);

  wb.setRoom(room);
  // ---------------------------------------------------------- suelos
  for (const m of mergeCells(W, H, (i, j) => (Number.isNaN(top(i, j)) ? null : reg(i, j).floor || 'flag'))) {
    const tint = m.k === 'mossstone' ? [0.4, 0.42, 0.38] : m.k === 'planks' ? [0.48, 0.42, 0.36] : [0.44, 0.42, 0.4];
    wb.box(m.k, cx(m.i0), F - 0.1, cz(m.j0), cx(m.i1), F, cz(m.j1), { faces: 't', ao: false, sub: 2, tint });
  }
  col.add(o.bounds ? o.bounds[0] : cx(0), F - 1, cz(0), cx(W), F, cz(H), 'floor').cam = true;
  // ---------------------------------------------------------- techos
  // (con el hueco del tiro del pozo en la bóveda de la cisterna)
  const Wl = CELLAR.well;
  const shaft = [Wl.x - 0.75, Wl.z - 0.75, Wl.x + 0.75, Wl.z + 0.75];
  for (const m of mergeCells(W, H, (i, j) => (Number.isNaN(top(i, j)) ? null : top(i, j)))) {
    const t = m.k;
    const x0 = cx(m.i0),
      x1 = cx(m.i1),
      z0 = cz(m.j0),
      z1 = cz(m.j1);
    for (const r of subtractRects([x0, z0, x1, z1], t === TOP ? [shaft] : [])) wb.box('wallstone', r[0], t, r[1], r[2], t + 0.2, r[3], { faces: 'b', ao: false, sub: 2.5, tint: [0.34, 0.32, 0.3] });
    // bajo la losa de la calle: el techo es macizo hasta ella
    if (t < TOP - 0.01) col.add(x0, t, z0, x1, TOP, z1).cam = true;
  }
  // ---------------------------------------------------------- muros
  // Cara entre una celda transitable y una maciza (del suelo al techo) o entre
  // dos transitables de techos distintos (el dintel, del techo bajo al alto).
  // Se funden a lo largo en tiras.
  const faces = [];
  const addFace = (axis, at, a0, a1, y0, y1, dir, mat) => {
    const f = faces[faces.length - 1];
    if (f && f.axis === axis && f.at === at && f.dir === dir && f.y0 === y0 && f.y1 === y1 && f.mat === mat && Math.abs(f.a1 - a0) < 1e-6) f.a1 = a1;
    else faces.push({ axis, at, a0, a1, y0, y1, dir, mat });
  };
  const wallMat = (r) => (r && r.wall) || 'wallstone';
  // (las celdas de la escalera dentro de la casa ya tienen sus muros)
  const inHouse = (j) => cz(j) + res * 0.5 > -32;
  for (let i = 0; i <= W; i++)
    for (let j = 0; j < H; j++) {
      if (inHouse(j)) continue;
      const a = top(i - 1, j),
        b = top(i, j);
      const x = cx(i);
      if (!Number.isNaN(a) && Number.isNaN(b)) addFace('x', x, cz(j), cz(j + 1), F, a, -1, wallMat(reg(i - 1, j)));
      else if (Number.isNaN(a) && !Number.isNaN(b)) addFace('x', x, cz(j), cz(j + 1), F, b, 1, wallMat(reg(i, j)));
      else if (!Number.isNaN(a) && !Number.isNaN(b) && a !== b) {
        if (a > b) addFace('x', x, cz(j), cz(j + 1), b, a, -1, 'wallstone');
        else addFace('x', x, cz(j), cz(j + 1), a, b, 1, 'wallstone');
      }
    }
  for (let j = 0; j <= H; j++)
    for (let i = 0; i < W; i++) {
      if (inHouse(Math.min(j, H - 1)) || (j > 0 && inHouse(j - 1))) continue;
      const a = top(i, j - 1),
        b = top(i, j);
      const z = cz(j);
      if (!Number.isNaN(a) && Number.isNaN(b)) addFace('z', z, cx(i), cx(i + 1), F, a, -1, wallMat(reg(i, j - 1)));
      else if (Number.isNaN(a) && !Number.isNaN(b)) addFace('z', z, cx(i), cx(i + 1), F, b, 1, wallMat(reg(i, j)));
      else if (!Number.isNaN(a) && !Number.isNaN(b) && a !== b) {
        if (a > b) addFace('z', z, cx(i), cx(i + 1), b, a, -1, 'wallstone');
        else addFace('z', z, cx(i), cx(i + 1), a, b, 1, 'wallstone');
      }
    }
  // las bocas de las madrigueras: se recortan del muro (dintel encima)
  for (const pair of CELLAR.burrows)
    for (const b of pair) {
      const axis = b.nx ? 'x' : 'z',
        at = b.nx ? b.x : b.z,
        dir = b.nx ? Math.sign(b.nx) : Math.sign(b.nz),
        a = b.nx ? b.z : b.x;
      const m0 = a - BURROW.w / 2,
        m1 = a + BURROW.w / 2;
      for (let k = faces.length - 1; k >= 0; k--) {
        const f = faces[k];
        if (f.axis !== axis || Math.abs(f.at - at) > 1e-6 || f.dir !== dir || f.y0 > F + 0.01 || f.a1 <= m0 || f.a0 >= m1) continue;
        faces.splice(k, 1);
        if (f.a0 < m0) faces.push({ ...f, a1: m0 });
        if (f.a1 > m1) faces.push({ ...f, a0: m1 });
        faces.push({ ...f, a0: Math.max(f.a0, m0), a1: Math.min(f.a1, m1), y0: F + BURROW.h, mouth: true });
      }
    }
  for (const f of faces) {
    const tint = f.mat === 'skulls' ? [0.6, 0.56, 0.5] : f.y0 > F + 0.01 ? [0.46, 0.44, 0.41] : [0.56, 0.54, 0.5];
    const oo = { sub: 2, aoH: 1.6, aoMin: 0.4, baseY: F, tint, uv: f.mat === 'skulls' ? 0.55 : undefined };
    // dir: hacia dónde mira la cara (+1 = hacia +x / +z)
    if (f.axis === 'x') {
      if (f.dir > 0) wb.box(f.mat, f.at - 0.3, f.y0, f.a0, f.at, f.y1, f.a1, { ...oo, faces: 'e' });
      else wb.box(f.mat, f.at, f.y0, f.a0, f.at + 0.3, f.y1, f.a1, { ...oo, faces: 'w' });
    } else {
      if (f.dir > 0) wb.box(f.mat, f.a0, f.y0, f.at - 0.3, f.a1, f.y1, f.at, { ...oo, faces: 's' });
      else wb.box(f.mat, f.a0, f.y0, f.at, f.a1, f.y1, f.at + 0.3, { ...oo, faces: 'n' });
    }
  }
  // zócalo de sillería al pie de los muros de piedra (lee mejor el suelo)
  for (const f of faces) {
    if (f.y0 > F + 0.01 || f.mat === 'skulls' || f.a1 - f.a0 < 0.4) continue;
    const k = 0.32,
      d = 0.06;
    const oo = { ao: false, sub: 3, tint: [0.46, 0.44, 0.41] };
    if (f.axis === 'x') {
      if (f.dir > 0) wb.box('ashlar', f.at, F, f.a0, f.at + d, F + k, f.a1, { ...oo, faces: 'et' });
      else wb.box('ashlar', f.at - d, F, f.a0, f.at, F + k, f.a1, { ...oo, faces: 'wt' });
    } else {
      if (f.dir > 0) wb.box('ashlar', f.a0, F, f.at, f.a1, F + k, f.at + d, { ...oo, faces: 'st' });
      else wb.box('ashlar', f.a0, F, f.at - d, f.a1, F + k, f.at, { ...oo, faces: 'nt' });
    }
  }
  // ---------------------------------------------------------- nervios
  // Arcos fajones que cruzan las bóvedas de muro a muro, y una capa sólo
  // para la cámara a la altura de su canto: la cámara nunca se mete entre
  // ellos (antes atravesaba las vigas del techo al andar).
  for (const R of REGIONS) {
    if (!R.ribs) continue;
    const [x0, z0, x1, z1] = R.r;
    const d = R.ribs.d;
    const t = R.top;
    const tint = [0.46, 0.44, 0.41];
    for (const z of R.ribs.z || []) {
      wb.box('ashlar', x0, t - d, z - 0.22, x1, t, z + 0.22, { ao: false, sub: 2, faces: 'nsb', tint });
      // salmeres en los muros
      wb.box('ashlar', x0, t - d - 0.35, z - 0.26, x0 + 0.18, t - d, z + 0.26, { ao: false, faces: 'nseb', tint });
      wb.box('ashlar', x1 - 0.18, t - d - 0.35, z - 0.26, x1, t - d, z + 0.26, { ao: false, faces: 'nswb', tint });
    }
    for (const x of R.ribs.x || []) {
      wb.box('ashlar', x - 0.22, t - d, z0, x + 0.22, t, z1, { ao: false, sub: 2, faces: 'ewb', tint });
      wb.box('ashlar', x - 0.26, t - d - 0.35, z0, x + 0.26, t - d, z0 + 0.18, { ao: false, faces: 'ewsb', tint });
      wb.box('ashlar', x - 0.26, t - d - 0.35, z1 - 0.18, x + 0.26, t - d, z1, { ao: false, faces: 'ewnb', tint });
    }
    col.addCam(x0, t - d - 0.12, z0, x1, t, z1);
  }

  // ---------------------------------------------------------- madrigueras
  for (const pair of CELLAR.burrows) for (const h of pair) burrowMouth(ctx, h, room, rng);

  // ---------------------------------------------------------- Sala del altar
  // altar del Dios Desconocido contra el muro norte, sigilo y velas
  P.altarTable(ctx, 60.4, F, -45.4, 0, 2.2);
  wb.box('clothDark', 59.25, F + 1.0, -45.9, 61.55, F + 1.03, -44.9, { ao: false, faces: 'tnsew' });
  P.decal(ctx, 60.4, F + 2.4, -45.97, 2.6, 'sigil', 0, { wall: 'z' });
  P.candles(ctx, 59.8, F + 1.03, -45.6, 4, 6066, { room, radius: 6, intensity: 0.7, spread: 0.2 });
  P.candles(ctx, 61.0, F + 1.03, -45.6, 3, 6073, { room, radius: 4, intensity: 0.35, spread: 0.2 });
  // el comedero: un círculo de velas medio consumidas, huesos y sangre
  const Fe = CELLAR.feast;
  P.ritual(ctx, Fe.x, F, Fe.corpse[1] + 0.2, 1.9, 6067, { room });
  P.candles(ctx, Fe.x - 1.7, F, Fe.corpse[1] + 0.9, 3, 6074, { room, radius: 3.5, intensity: 0.35, spread: 0.2 });
  pool(ctx, Fe.x - 0.1, Fe.corpse[1] + 0.1, 1.1, 6101);
  P.bones(ctx, Fe.x - 0.8, F, Fe.corpse[1] - 0.3, 8, 6068, 0.7);
  P.bones(ctx, 64.8, F, -38.2, 6, 6076, 0.6);
  // velas de alguien que bajó a rezarle junto a su gruta (y que se ven
  // desde la escalera: la boca se recorta contra ellas)
  P.candles(ctx, 65.72, F, -45.58, 3, 6079, { room, radius: 3.5, intensity: 0.5, spread: 0.12 });
  P.fleshGrowth(ctx, 57.8, F, -45.6, 1.0, 6070, { room, climb: 2.2, lift: 1 });
  P.fleshGrowth(ctx, 52.4, F, -41.2, 0.8, 6071, { room, climb: 1.8 });
  // cadenas de las que colgaba; la del centro, rota
  for (const [x, z, n] of [
    [57.2, -41.6, 16],
    [61.3, -38.6, 10],
    [59, -44.4, 22],
  ])
    P.chains(ctx, x, TOP - 0.52, z, n, 0);
  bakeCorpse(wb, 53.4, F, -38.3, 2.2, 'sit', 'villager', 7);
  // el maestro de obras, muerto junto al rastrillo con la orden en la mano
  bakeCorpse(wb, 52.9, F, -44.7, 0.9, 'sit', 'villager', 8);
  ctx.rats.push({ x: 64.8, y: F, z: -44.8, n: 2 });
  // la luz de la alcoba baja por la escalera
  if (ctx.shafts) ctx.shafts.push({ a: [59.5, 0.5, -28], b: [59.5, F + 0.6, -36.4], w: 1.6, color: 0xffb070 });
  ctx.lights.push({ x: 59.5, y: F + 1.2, z: -36.2, r: 1, g: 0.55, b: 0.25, radius: 4.5, intensity: 0.4, room });
  // el rastrillo: jambas y dintel de sillería, y las tres cadenas que suben
  // por la bóveda hacia las palancas
  // (delante del muro, sin ninguna cara en el mismo plano que él: antes
  // parpadeaban)
  const Pc = CELLAR.portcullis;
  const zf = -46 + 0.2;
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? Pc.x - Pc.w / 2 - 0.5 : Pc.x + Pc.w / 2,
      x1 = x0 + 0.5;
    wb.box('ashlar', x0, F, -46, x1, -3.25, zf, { ao: false, sub: 2, faces: s < 0 ? 'tsw' : 'tse', tint: [0.5, 0.48, 0.44] });
  }
  wb.box('ashlar', Pc.x - Pc.w / 2 - 0.6, -3.4, -46, Pc.x + Pc.w / 2 + 0.6, -2.85, zf + 0.05, { ao: false, sub: 2, faces: 'tbsew', tint: [0.5, 0.48, 0.44] });
  for (const dx of [-0.8, 0, 0.8]) {
    wb.box('iron', Pc.x + dx - 0.07, -2.85, zf - 0.1, Pc.x + dx + 0.07, -2.68, zf + 0.12, { ao: false });
    P.chains(ctx, Pc.x + dx, TOP - 0.06, zf + 0.02, 30, 0);
    wb.box('black', Pc.x + dx - 0.18, TOP - 0.045, zf - 0.16, Pc.x + dx + 0.18, TOP - 0.04, zf + 0.2, { faces: 'b', ao: false, grime: false });
  }

  // ---------------------------------------------------------- celda del canónigo
  // jergón de paja, sus escritos en los muros y las ropas que ya no le sirven
  wb.box('straw', 52.7, F, -34.9, 54.6, F + 0.22, -33.2, { ao: false, faces: 'tnsew', tint: [0.6, 0.52, 0.4] });
  wb.box('clothDark', 54.8, F, -34.0, 55.9, F + 0.08, -33.3, { ao: false, faces: 'tnsew' });
  for (const [x, y, s] of [
    [53.4, F + 1.9, 1.3],
    [55.4, F + 1.4, 0.9],
    [54.4, F + 2.5, 0.7],
  ])
    P.decal(ctx, x, y, -33.03, s, 'sigil', x, { wall: 'z' });
  P.candles(ctx, 56.1, F, -33.5, 4, 6077, { room, radius: 4, intensity: 0.5, spread: 0.2 });
  P.bones(ctx, 55.4, F, -34.6, 7, 6078, 0.5);
  ctx.rats.push({ x: 53.2, y: F, z: -34.2, n: 1 });

  // ---------------------------------------------------------- Galería de los toneles
  // (los estantes con los toneles se pueden romper: van en L.breakables)
  // vino derramado y duelas sueltas (los toneles y los sacos, rompibles)
  pool(ctx, 45.4, -45.6, 0.7, 6102);
  for (let i = 0; i < 8; i++) {
    wb.push();
    wb.translate(45.6 + rng.range(-1, 1), F + 0.03, -37.6 + rng.range(-0.6, 0.6));
    wb.rotateY(rng.range(0, 3));
    wb.box('planks', -0.05, 0, -0.55, 0.05, 0.03, 0.55, { ao: false, faces: 'tnsew', tint: [0.55, 0.45, 0.38] });
    wb.pop();
  }
  P.hangingLamp(ctx, 45.5, -2.0, -42.7, { room, radius: 5, intensity: 0.35, len: 1.4 });
  bakeCorpse(wb, 49.6, F, -37.6, -2.6, 'face', 'villager', 3);
  ctx.rats.push({ x: 40.8, y: F, z: -45.8, n: 2 });

  // ---------------------------------------------------------- el Lagar
  // la pila de pisar la uva en el rincón noroeste, con su viga de prensa y
  // el contrapeso; el resto, diáfano: toneles contra los muros, dos pilares
  // (rompibles) y la luz pálida que cae por dos rejillas de la calle
  // (una pila de verdad: pretil de sillería y el mosto negro dentro)
  const lg = [26, -60, 31.2, -55.4];
  const lt = 0.3;
  for (const [a, b, c, d] of [
    [lg[0], lg[3] - lt, lg[2], lg[3]],
    [lg[2] - lt, lg[1], lg[2], lg[3] - lt],
  ])
    wb.box('ashlar', a, F, b, c, F + 0.95, d, { sub: 2, aoH: 0.5, faces: 'tnsew', tint: [0.5, 0.47, 0.43] });
  wb.box('ashlar', lg[0], F + 0.85, lg[1], lg[2] - lt, F + 0.95, lg[1] + 0.12, { ao: false, faces: 'ts', tint: [0.5, 0.47, 0.43] });
  wb.box('ashlar', lg[0], F + 0.85, lg[1] + 0.12, lg[0] + 0.12, F + 0.95, lg[3] - lt, { ao: false, faces: 'te', tint: [0.5, 0.47, 0.43] });
  col.add(lg[0], F, lg[1], lg[2], F + 0.95, lg[3]);
  ctx.waters.push({ shape: 'rect', r: [lg[0] + 0.1, lg[1] + 0.1, lg[2] - lt, lg[3] - lt], y: F + 0.72, deep: 0x120204, sky: 0x2a0a0c, glint: 0xb07068, light: [29.5, TOP, -38.5], lightK: 0.35 });
  // la viga de la prensa sobre la pila, el husillo hasta la bóveda y el
  // contrapeso en el suelo
  wb.box('timber', 26.2, F + 0.95, -57.9, 31.2, F + 1.3, -57.5, { ao: false, faces: 'tnsewb' });
  wb.box('timber', 28.5, F + 1.3, -57.9, 28.9, TOP, -57.5, { ao: false, faces: 'nsew' });
  wb.box('ashlar', 31.5, F, -58.3, 32.4, F + 0.55, -57.2, { ao: false, faces: 'tnsew', tint: [0.46, 0.44, 0.4] });
  col.add(31.5, F, -58.3, 32.4, F + 0.55, -57.2);
  P.bones(ctx, 32.4, F, -47.6, 12, 6091, 1.4);
  pool(ctx, 32.3, -47.6, 1.3, 6103);
  P.fleshGrowth(ctx, 26.4, F, -52.5, 1.1, 6092, { room, climb: 2.4 });
  P.fleshGrowth(ctx, 37.6, F, -36.2, 0.9, 6093, { room, climb: 2 });
  bakeCorpse(wb, 36.4, F, -56.2, 2.8, 'back', 'soldier', 9);
  bakeCorpse(wb, 28.8, F, -41.2, -0.6, 'curl', 'villager', 10);
  for (const [x, z] of [
    [29.5, -38.5],
    [34.5, -56.5],
  ]) {
    // rejilla del desagüe de la calle, en lo alto de la bóveda
    wb.box('black', x - 0.5, TOP - 0.05, z - 0.5, x + 0.5, TOP - 0.04, z + 0.5, { faces: 'b', ao: false, grime: false });
    for (let k = -2; k <= 2; k++) wb.box('iron', x + k * 0.2 - 0.025, TOP - 0.1, z - 0.5, x + k * 0.2 + 0.025, TOP - 0.055, z + 0.5, { ao: false });
    if (ctx.shafts) ctx.shafts.push({ a: [x, TOP, z], b: [x + 0.4, F + 0.1, z + 0.3], w: 0.9, color: 0x8898b0 });
    ctx.lights.push({ x, y: F + 1.4, z, r: 0.55, g: 0.62, b: 0.75, radius: 6, intensity: 0.45, room });
  }
  for (const [x, z, n] of [
    [30.5, -44, 20],
    [33.8, -52.4, 14],
    [35, -41, 26],
  ])
    P.chains(ctx, x, TOP - 0.56, z, n, 0);
  ctx.rats.push({ x: 27.4, y: F, z: -44.5, n: 3 });

  // ---------------------------------------------------------- pasillo y antecámara
  P.bones(ctx, 42, F, -53, 6, 6080, 0.8);
  P.decal(ctx, 41.2, F + 0.02, -51.5, 1.4);
  P.fleshGrowth(ctx, 40.7, F, -55.2, 0.7, 6081, { room, climb: 1.6 });
  P.candles(ctx, 44.2, F, -63.5, 3, 6082, { room, radius: 3.5, intensity: 0.4, spread: 0.12 });
  P.rubble(ctx, 46.3, F, -57.6, 5, 6083, 0.4, { mat: 'ashlar', scale: 0.5 });
  bakeCorpse(wb, 40.4, F, -60.6, 1.2, 'curl', 'villager', 4);

  // ---------------------------------------------------------- Cripta de los canónigos
  // sepulcros a los dos lados (el centro, libre), dos santos velados junto a
  // la palanca y hornacinas con calaveras en el pasillo
  for (const z of [-66, -69.5]) {
    P.niche(ctx, 43, F, z, 'e', { room, unlit: true });
    P.niche(ctx, 45.5, F, z - 1.5, 'w', { room, unlit: true });
  }
  P.bones(ctx, 49, F, -76, 8, 6094, 1);
  P.bones(ctx, 41, F, -74, 6, 6095, 0.5);
  P.candles(ctx, 49.9, F, -82.3, 3, 6096, { room, radius: 3.5, intensity: 0.4, spread: 0.15 });
  bakeCorpse(wb, 55.2, F, -82.3, -2.2, 'sit', 'villager', 11);
  P.fleshGrowth(ctx, 57.6, F, -82.4, 1, 6097, { room, climb: 2.4 });

  // ---------------------------------------------------------- cisterna
  // columnas romanas, el aljibe (agua negra en su pila) y el pozo
  for (const [x, z] of [
    [52.5, -51.2],
    [58.5, -51.2],
  ])
    P.column(ctx, x, F, z, TOP - F - 0.6, 0.45, { mat: 'mossstone' });
  const aj = [50.2, -59.8, 61.8, -58.1];
  const rim = 0.5;
  for (const [a, b, c, d] of [
    [aj[0], aj[1], aj[2], aj[1] + 0.3],
    [aj[0], aj[3] - 0.3, aj[2], aj[3]],
    [aj[0], aj[1], aj[0] + 0.3, aj[3]],
    [aj[2] - 0.3, aj[1], aj[2], aj[3]],
  ])
    wb.box('mossstone', a, F, b, c, F + rim, d, { sub: 2, faces: 'tnsew', aoH: 0.4, tint: [0.44, 0.46, 0.42] });
  col.add(aj[0], F, aj[1], aj[2], F + rim, aj[3]);
  ctx.waters.push({ shape: 'rect', r: [aj[0] + 0.3, aj[1] + 0.3, aj[2] - 0.3, aj[3] - 0.3], y: F + rim - 0.1, light: [Wl.x, F + 5, Wl.z], lightK: 0.8, sky: 0x1c2228 });
  wellBottom(ctx, Wl.x, Wl.z, room);
  ctx.waters.push({ shape: 'circle', x: Wl.x, z: Wl.z, r: 1.02, y: F + 0.62, light: [Wl.x + 0.2, 0.5, Wl.z + 0.1], lightK: 1.2, spot: [Wl.x + 0.1, Wl.z + 0.05, 0.75, 0.9] });
  P.fleshGrowth(ctx, 61.5, F, -48.1, 0.9, 6084, { room, climb: 2 });
  P.bones(ctx, 50.5, F, -49, 7, 6085, 0.8);
  // luz pálida que cae por el pozo
  ctx.lights.push({ x: Wl.x, y: F + 2.2, z: Wl.z, r: 0.6, g: 0.68, b: 0.84, radius: 8, intensity: 0.8, room });
  ctx.lights.push({ x: Wl.x, y: F + 0.9, z: Wl.z, r: 0.5, g: 0.58, b: 0.72, radius: 4, intensity: 0.45, room });
  if (ctx.shafts) ctx.shafts.push({ a: [Wl.x, 0.2, Wl.z], b: [Wl.x, F + 0.7, Wl.z], w: 1.4, color: 0x9ab0c8 });

  // ---------------------------------------------------------- osario
  // hornacinas con santos velados, calaveras en los muros y cadáveres
  // traídos para comer; el ramal ciego, con la tercera palanca
  for (const z of [-40, -46, -52, -58, -66, -72]) P.niche(ctx, 70.5, F, z, 'w', { room, unlit: z !== -52, intensity: 0.4 });
  P.bones(ctx, 68.4, F, -46, 9, 6086, 0.9);
  P.bones(ctx, 66, F, -64.3, 8, 6087, 0.7);
  P.bones(ctx, 68.8, F, -74, 7, 6098, 0.8);
  bakeCorpse(wb, 69.3, F, -41.8, -1.4, 'sit', 'soldier', 5);
  bakeCorpse(wb, 68.2, F, -53.4, 0.4, 'back', 'villager', 6);
  bakeCorpse(wb, 69.2, F, -69, -1.6, 'sit', 'villager', 12);
  P.fleshGrowth(ctx, 66.6, F, -61.4, 1.0, 6088, { room, climb: 2 });
  P.fleshGrowth(ctx, 62.6, F, -78.6, 0.9, 6099, { room, climb: 2.2 });
  P.decal(ctx, 68.8, F + 0.02, -49.5, 2.0);
  P.decal(ctx, 63.5, F + 0.02, -77.6, 1.6);

  // ---------------------------------------------------------- palancas
  // placa de hierro en el muro, la ranura por la que baja el mango y la
  // cadena que sube a un agujero de la bóveda (el mango es interactuable)
  for (const Lv of CELLAR.levers) {
    const tx = -Lv.nz,
      tz = Lv.nx;
    const t = cellarTop(Lv.x + Lv.nx * 0.6, Lv.z + Lv.nz * 0.6);
    const px = (a, n) => Lv.x + tx * a + Lv.nx * n,
      pz = (a, n) => Lv.z + tz * a + Lv.nz * n;
    const bx = (a0, n0, a1, n1) => [Math.min(px(a0, n0), px(a1, n1)), Math.min(pz(a0, n0), pz(a1, n1)), Math.max(px(a0, n0), px(a1, n1)), Math.max(pz(a0, n0), pz(a1, n1))];
    let r = bx(-0.3, 0, 0.3, 0.08);
    wb.box('iron', r[0], F + 0.55, r[1], r[2], F + 1.95, r[3], { ao: false });
    r = bx(-0.05, 0.07, 0.05, 0.1);
    wb.box('black', r[0], F + 0.75, r[1], r[2], F + 1.75, r[3], { ao: false, grime: false });
    r = bx(-0.35, 0, 0.35, 0.35);
    wb.box('ashlar', r[0], F, r[1], r[2], F + 0.25, r[3], { ao: false, faces: 'tnsew' });
    P.chains(ctx, px(0, 0.2), t - 0.02, pz(0, 0.2), Math.round((t - (F + 1.95)) / 0.06), 0);
    r = bx(-0.2, 0.02, 0.2, 0.4);
    wb.box('black', r[0], t - 0.05, r[1], r[2], t - 0.04, r[3], { faces: 'b', ao: false, grime: false });
    // una vela de ánimas al pie (se ve desde lejos)
    P.candles(ctx, px(0.55, 0.3), F, pz(0.55, 0.3), 2, 6100 + Math.round(Lv.x), { room, radius: 3, intensity: 0.45, spread: 0.08 });
  }

  // ---------------------------------------------------------- rompibles
  // pilares de la sala y del Lagar (los arranca si te escudas tras ellos) y
  // estantes de toneles de la galería
  const pillarH = TOP - 0.5 - F;
  for (const [x, z, k] of [
    [55.5, -40, 1],
    [62.5, -40, 2],
    [55.5, -43.2, 3],
    [62.5, -43.2, 4],
    [32, -41.5, 5],
    [32, -53.5, 6],
  ])
    L.breakables.push({ id: 'pilar' + k, kind: 'pillar', x, z, y: F, hx: 0.5, hz: 0.5, h: pillarH, room });
  // (a algo más de metro y medio del muro norte: el primero tapaba media
  // entrada del pasillo)
  for (const x of [43.35, 47.65])
    for (const [z0, z1] of [
      [-44.8, -42.8],
      [-42.5, -40.5],
      [-40.2, -38.2],
    ])
      L.breakables.push({ id: `estante${Math.round(x)}${Math.round(-z0)}`, kind: 'rack', x, z: (z0 + z1) / 2, y: F, hx: 0.55, hz: (z1 - z0) / 2, h: 2.4, room });
  // toneles (tumbados en su cuna; along: a lo largo de z) y sacos: él los
  // arrasa al pasar; tú, a golpes. Ninguno a menos de metro y medio de un
  // arco o de una puerta (tools/doorways.mjs lo comprueba): antes había
  // toneles a la salida de los arcos del Lagar y de la antecámara y sacos
  // delante de la puerta del osario
  [
    [65.1, -38.0, true, 0.5, 1.2],
    [65.1, -42.8, true, 0.5, 1.2],
    [41.0, -40.0, false, 0.48, 1.1],
    [50.1, -41.6, false, 0.48, 1.1],
    [36.9, -49.2, true, 0.55, 1.3],
    [36.9, -51.0, true, 0.55, 1.3],
    [27.0, -36.2, false, 0.5, 1.2],
    [28.6, -36.3, false, 0.5, 1.2],
    [27.1, -45.0, true, 0.52, 1.25],
    [36.9, -52.8, true, 0.5, 1.2],
    [33.6, -36.1, false, 0.5, 1.2],
    [40.3, -62.9, true, 0.5, 1.2],
    [46.2, -59.2, false, 0.46, 1.1],
  ].forEach(([x, z, along, r, len], i) =>
    L.breakables.push({ id: 'tonel' + i, kind: 'cask', x, z, y: F, rot: along ? Math.PI / 2 : 0, r, len, hx: along ? r : len / 2 + 0.1, hz: along ? len / 2 + 0.1 : r, h: r * 2 + 0.1, room })
  );
  [
    [50.2, -46.0],
    [36.8, -35.9],
    [30.4, -36.0],
    [48.9, -46.0],
  ].forEach(([x, z], i) => L.breakables.push({ id: 'sacos' + i, kind: 'sacks', x, z, y: F, hx: 0.55, hz: 0.55, h: 0.85, room }));
  // los sepulcros de la cripta y sus dos santos: si te escondes detrás, los
  // revienta
  [
    [43.5, -77.2, false],
    [43.5, -80.8, true],
    [54.5, -77.2, true],
    [54.5, -80.8, false],
  ].forEach(([x, z, open], i) => L.breakables.push({ id: 'sepulcro' + i, kind: 'tomb', x, z, y: F, open, hx: 1.3, hz: 0.62, h: 1.1, room }));
  [46.2, 51.8].forEach((x, i) => L.breakables.push({ id: 'santo' + i, kind: 'statue', x, z: -82.2, y: F, hx: 0.55, hz: 0.55, h: 2.9, room }));

  wb.setRoom(null);
}

// Charco de sangre (o de vino): varias manchas solapadas, nunca un cuadrado.
function pool(ctx, x, z, R, seed) {
  const rng = new RNG(seed);
  P.decal(ctx, x, F + 0.02, z, R * 2, 'splat', rng.range(0, 6));
  for (let i = 0; i < 4; i++) {
    const a = rng.range(0, Math.PI * 2),
      d = rng.range(0.4, 0.9) * R;
    P.decal(ctx, x + Math.cos(a) * d, F + 0.021 + i * 0.001, z + Math.sin(a) * d, R * rng.range(0.6, 1.1), 'splat', rng.range(0, 6));
  }
}

// Una madriguera: la boca recortada en el muro (con las esquinas de arriba
// rotas, tierra amontonada al pie, carne en el borde y arañazos) y el túnel
// que se mete en la roca, cada vez más oscuro, hasta perderse.
function burrowMouth(ctx, h, room, rng) {
  const wb = ctx.wb;
  const { w, h: H, depth } = BURROW;
  const tx = -h.nz,
    tz = h.nx; // a lo ancho de la boca
  // punto (a lo ancho a, hacia dentro de la roca d) -> mundo
  const wx = (a, d) => h.x + tx * a - h.nx * d,
    wz = (a, d) => h.z + tz * a - h.nz * d;
  const box = (mat, a0, y0, d0, a1, y1, d1, o) => {
    const xs = [wx(a0, d0), wx(a1, d1)],
      zs = [wz(a0, d0), wz(a1, d1)];
    wb.box(mat, Math.min(...xs), y0, Math.min(...zs), Math.max(...xs), y1, Math.max(...zs), { ao: false, grime: false, ...o });
  };
  // caras que miran: hacia la sala (+n), hacia dentro (-n), a lo ancho (±t)
  const face = (v) => {
    // v: [vx, vz] en el mundo -> letra de cara
    if (v[0] > 0.5) return 'e';
    if (v[0] < -0.5) return 'w';
    if (v[1] > 0.5) return 's';
    return 'n';
  };
  const out = face([h.nx, h.nz]),
    inn = face([-h.nx, -h.nz]),
    plusA = face([tx, tz]),
    minusA = face([-tx, -tz]);
  // el túnel, por tramos: cada uno algo más estrecho y bajo, con las paredes
  // desiguales y la tierra del suelo cada vez más negra
  const n = 6;
  for (let i = 0; i < n; i++) {
    const d0 = (i / n) * depth,
      d1 = ((i + 1) / n) * depth;
    const k = 1 - i / n;
    const tint = [0.36 * k + 0.03, 0.33 * k + 0.03, 0.3 * k + 0.03];
    const hw = w / 2 - 0.06 - i * 0.04 + rng.range(-0.05, 0.05),
      top = H - 0.04 - i * 0.05 + rng.range(-0.05, 0.03);
    box('dirt', -hw - 0.2, F - 0.05, d0, hw + 0.2, F + 0.012, d1, { faces: 't', tint: tint.map((v) => v * 0.8) });
    // (con las caras de los extremos: entre tramo y tramo no queda rendija)
    box('wallstone', -hw - 0.25, F + top, d0, hw + 0.25, F + top + 0.25, d1, { faces: 'b' + out + inn, tint });
    box('wallstone', -hw - 0.25, F, d0, -hw, F + top, d1, { faces: plusA + out + inn, tint });
    box('wallstone', hw, F, d0, hw + 0.25, F + top, d1, { faces: minusA + out + inn, tint });
  }
  // el fondo: negro (el túnel sigue, pero ya no se ve)
  box('black', -w / 2, F, depth, w / 2, F + H, depth + 0.05, { faces: out });
  // terrones y piedras en las paredes del túnel
  for (let i = 0; i < 7; i++) {
    const side = i % 2 ? 1 : -1;
    const d = rng.range(0.3, depth - 0.3);
    const k = 1 - d / depth;
    P.ellipsoid(ctx, 'wallstone', wx(side * (w / 2 - 0.05), d), F + rng.range(0.2, H - 0.3), wz(side * (w / 2 - 0.05), d), rng.range(0.14, 0.26), rng.range(0.12, 0.22), rng.range(0.14, 0.26), [0.3 * k + 0.03, 0.28 * k + 0.03, 0.26 * k + 0.03], { room });
  }
  // la boca: esquinas de arriba rotas (piedras sueltas) y carne en el borde
  for (const s of [-1, 1]) {
    P.ellipsoid(ctx, 'wallstone', wx(s * (w / 2 - 0.12), 0.02), F + H - 0.12, wz(s * (w / 2 - 0.12), 0.02), 0.34, 0.3, 0.26, [0.42, 0.4, 0.37], { room });
    P.ellipsoid(ctx, 'wallstone', wx(s * (w / 2 - 0.02), -0.05), F + rng.range(0.4, 0.9), wz(s * (w / 2 - 0.02), -0.05), 0.16, 0.28, 0.14, [0.4, 0.38, 0.35], { room });
  }
  P.ellipsoid(ctx, 'wallstone', wx(0, 0.02), F + H + 0.02, wz(0, 0.02), 0.5, 0.18, 0.24, [0.4, 0.38, 0.35], { room });
  for (let k = 0; k < 4; k++) {
    const a = (k / 3) * Math.PI;
    P.ellipsoid(ctx, 'fleshStatic', wx(Math.cos(a) * (w / 2 + 0.08), -0.06), F + 0.15 + Math.sin(a) * (H - 0.1), wz(Math.cos(a) * (w / 2 + 0.08), -0.06), 0.2, 0.17, 0.12, [0.7, 0.5, 0.5], { room });
  }
  // la tierra que ha sacado, amontonada a los lados de la boca
  for (let i = 0; i < 6; i++) {
    const s = i % 2 ? 1 : -1;
    const a = s * rng.range(w / 2 - 0.1, w / 2 + 0.55),
      d = -rng.range(0.15, 0.7);
    P.ellipsoid(ctx, 'dirt', wx(a, d), F + 0.02, wz(a, d), rng.range(0.25, 0.42), rng.range(0.1, 0.2), rng.range(0.25, 0.4), [0.38, 0.33, 0.28], { room });
  }
  P.bones(ctx, wx(0, -0.6), F, wz(0, -0.6), 4, Math.round(h.x * 13 + h.z), 0.5);
  // arañazos en el muro, a los lados
  for (const s of [-1, 1]) P.decal(ctx, wx(s * (w / 2 + 0.55), -0.025), F + 1.0, wz(s * (w / 2 + 0.55), -0.025), 0.9, 'splat', 0, { wall: h.nx ? 'x' : 'z' });
  P.decal(ctx, wx(0, -1.0), F + 0.02, wz(0, -1.0), 1.4);
}

// Techo de la región en (x, z) mientras se construye.
function cellarTop(x, z) {
  return cellarCeil(x, z) ?? TOP;
}

// Fondo del pozo del Postigo: brocal con el agua casi a ras, el tiro
// cuadrado que sube por la bóveda hasta el pozo de la calle y los pates de
// hierro.
function wellBottom(ctx, x, z, room) {
  const wb = ctx.wb;
  const R = 1.3,
    rIn = 1.02,
    h = 0.8,
    seg = 14;
  wb.cylinder('mossstone', x, F, z, R, R, h, seg, { sub: 2, room });
  const V = (a, b, c) => new THREE.Vector3(a, b, c);
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2,
      a1 = ((i + 1) / seg) * Math.PI * 2;
    const c0 = Math.cos(a0),
      s0 = Math.sin(a0),
      c1 = Math.cos(a1),
      s1 = Math.sin(a1);
    wb.quad('ashlar', V(x + c1 * R, F + h, z + s1 * R), V(x + c0 * R, F + h, z + s0 * R), V(x + c0 * rIn, F + h, z + s0 * rIn), V(x + c1 * rIn, F + h, z + s1 * rIn), { ao: false, sub: 3, room });
    wb.quad('mossstone', V(x + c0 * rIn, F + 0.2, z + s0 * rIn), V(x + c1 * rIn, F + 0.2, z + s1 * rIn), V(x + c1 * rIn, F + h, z + s1 * rIn), V(x + c0 * rIn, F + h, z + s0 * rIn), { ao: true, aoH: 0.5, aoMin: 0.2, baseY: F + 0.2, sub: 3, room });
  }
  // (colisión octogonal: una caja cuadrada dejaba esquinas invisibles)
  for (let k = 0; k < 4; k++) ctx.col.addOBB(x, z, R, R * 0.414, (k * Math.PI) / 4, F, F + h);
  // tiro cuadrado de 1,5 m (cabe dentro del brocal de arriba) hasta la calle
  const s = 0.75,
    y0 = TOP,
    y1 = 0.16;
  wb.box('mossstone', x - s, y0, z - s - 0.3, x + s, y1, z - s, { faces: 's', ao: false, sub: 1, room, tint: [0.38, 0.4, 0.38] });
  wb.box('mossstone', x - s, y0, z + s, x + s, y1, z + s + 0.3, { faces: 'n', ao: false, sub: 1, room, tint: [0.38, 0.4, 0.38] });
  wb.box('mossstone', x - s - 0.3, y0, z - s, x - s, y1, z + s, { faces: 'e', ao: false, sub: 1, room, tint: [0.38, 0.4, 0.38] });
  wb.box('mossstone', x + s, y0, z - s, x + s + 0.3, y1, z + s, { faces: 'w', ao: false, sub: 1, room, tint: [0.38, 0.4, 0.38] });
  // pates de hierro: del brocal hasta perderse arriba
  for (let y = F + 1.2; y < 0; y += 0.42) {
    wb.box('iron', x - 0.22, y, z + s - 0.2, x + 0.22, y + 0.035, z + s - 0.17, { ao: false, room });
    for (const sx of [-0.22, 0.2]) wb.box('iron', x + sx, y - 0.02, z + s - 0.2, x + sx + 0.02, y + 0.035, z + s, { ao: false, room });
  }
  // la soga del cubo, deshilachada, colgando a media altura
  wb.box('burlap', x + 0.1, -2.6, z - 0.02, x + 0.13, 0.16, z + 0.01, { ao: false, room, tint: [0.7, 0.6, 0.48] });
}
