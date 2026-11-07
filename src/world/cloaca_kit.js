// El kit de las cloacas: lo que se repite en toda la red de alcantarillado
// (world/cloacas_hondas.js y el colector del Vergel).
//
// Una red es una planta de nodos y tramos:
//  - nodo: un cruce, un tramo cuadrado del ancho de la galería (w × w) con su
//    bóveda de arista (la de las dos galerías de cañón que se cruzan); donde
//    no llega galería, su muro con su luneto. Lleva su suelo: los andenes y,
//    si llega canal, el canal en cruz (o en ele, o en te).
//  - tramo: una galería recta entre dos nodos (en x o en z), de sillería, con
//    su bóveda de medio cañón, su banda de musgo abajo y su suelo:
//      canal    los dos andenes y el canal en medio, con el agua;
//      seco     el suelo entero, a la altura de los andenes;
//      ahogado  el suelo entero bajo el agua, que llega a la rodilla (se anda
//               despacio: game/cloacas.js);
//    y si los dos nodos están a distinta altura, una escalera, con su bóveda
//    en rampa.
//  - sala: una sala de pilares con bóvedas de arista (una cisterna, un
//    colector), con sus bocas a las galerías, su suelo (seco, con su canal,
//    ahogado o con un estanque hondo) y, si se quiere, óculos en la bóveda.
//    Una sala «externa» la construye otro (el Vergel): la red sólo pone sus
//    bocas.
// Donde una galería entra en una sala, su vano: las jambas en el grueso del
// muro y el arco de dovelas con sus enjutas (vano).
// Las galerías pintan lo transitable en la rejilla que les toca por altura
// (la roca la ponen las rejillas: level.js) y llevan su colisión de suelo y
// la de la cámara bajo la bóveda. La red devuelve su grafo (los centros de
// los cruces, de las bocas y de las salas, y por dónde se va de uno a otro),
// para lo que anda por ella (el Lobishome: game/lobishome.js).
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { barrelVault, crossVault, rampVault, groinVaults, stairs, archRing } from './builders.js';

export const KIT = {
  w: 3.4, // ancho de las galerías (de muro a muro)
  c: 1.0, // ancho del canal
  sp: 2.1, // arranque de la bóveda sobre los andenes
  banda: 0.85, // la banda de musgo, sobre los andenes
  prof: 0.4, // hondo del canal (lecho bajo los andenes)
  agua: 0.17, // el agua, bajo los andenes
  ahog: 0.12, // el agua de lo ahogado, bajo los andenes (sobre el lecho, 0,28)
  t: 0.3, // grueso de los muros (lo que se dibuja)
  ring: 0.3, // canto de la rosca de los vanos
};

export const MUSGO = [0.44, 0.5, 0.4];
export const SILLAR = [0.42, 0.42, 0.39];
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };

// Construye una red: defs, una lista de niveles; cada uno, { id, y, room,
// grids: [{ grid, y0, y1 }], mat, tint, suelo, nodos: { id: [x, z, y?] },
// tramos: [[a, b, o]], salas: [...] }. Los nodos se nombran en toda la red
// (un tramo de escalera une los de dos niveles).
export function red(ctx, defs, o = {}) {
  const N = {};
  for (const d of defs)
    for (const [id, p] of Object.entries(d.nodos || {})) N[id] = { id, x: p[0], z: p[1], y: p[2] ?? d.y, def: d, conn: { n: null, s: null, e: null, w: null } };
  const salas = {};
  for (const d of defs) for (const s of d.salas || []) salas[s.id] = { ...s, y: s.y ?? d.y, def: d };
  // las bocas de las salas también son nodos (sin cruce: la sala pone su
  // vano), a media galería del muro
  for (const s of Object.values(salas))
    for (const [k, b] of (s.bocas || []).entries()) {
      const [x0, z0, x1, z1] = s.r;
      const at = b.at;
      const p = b.side === 'n' ? [at, z0 - KIT.w / 2] : b.side === 's' ? [at, z1 + KIT.w / 2] : b.side === 'w' ? [x0 - KIT.w / 2, at] : [x1 + KIT.w / 2, at];
      const id = s.id + '.' + (b.id ?? k);
      N[id] = { id, x: p[0], z: p[1], y: b.y ?? s.y, def: s.def, boca: { sala: s, side: b.side, at, b }, conn: { n: null, s: null, e: null, w: null } };
    }
  const T = [];
  for (const d of defs)
    for (const [a, b, op = {}] of d.tramos || []) {
      const A = N[a],
        B = N[b];
      if (!A || !B) throw new Error('cloaca: tramo sin nodo ' + a + ' / ' + b);
      const alongX = Math.abs(A.z - B.z) < 1e-6;
      if (!alongX && Math.abs(A.x - B.x) > 1e-6) throw new Error('cloaca: tramo torcido ' + a + ' / ' + b);
      const t = { a: A, b: B, alongX, o: { tipo: 'canal', ...op }, def: d };
      // (qué lado de cada nodo da a la galería)
      if (alongX) {
        const [L, R] = A.x < B.x ? [A, B] : [B, A];
        L.conn.e = t;
        R.conn.w = t;
      } else {
        const [U, D] = A.z < B.z ? [A, B] : [B, A];
        U.conn.s = t;
        D.conn.n = t;
      }
      T.push(t);
    }
  for (const n of Object.values(N)) if (!n.boca && !n.sinCruce) cruce(ctx, n, o);
  for (const t of T) tramo(ctx, t, o);
  for (const s of Object.values(salas)) if (!s.externa) sala(ctx, s, N, o);
  const r = { N, T, salas, grafo: grafo(N, T, salas) };
  (ctx.redes || (ctx.redes = [])).push(r);
  return r;
}

// El grafo de la red: un punto por cruce, por boca y por sala (en su centro,
// a la altura de su suelo); las aristas, las galerías (con su largo) y, en
// cada sala, de sus bocas a su centro.
function grafo(N, T, salas) {
  const P = {};
  const add = (id, x, y, z, k) => (P[id] = { id, x, y, z, k, ady: [] });
  for (const n of Object.values(N)) add(n.id, n.x, n.y, n.z, n.boca ? 'boca' : 'cruce');
  for (const s of Object.values(salas)) add('sala:' + s.id, (s.r[0] + s.r[2]) / 2, s.y, (s.r[1] + s.r[3]) / 2, 'sala');
  const link = (a, b, extra = {}) => {
    const d = Math.hypot(a.x - b.x, a.z - b.z) + Math.abs(a.y - b.y) * 1.5;
    a.ady.push({ to: b.id, d, ...extra });
    b.ady.push({ to: a.id, d, ...extra });
  };
  for (const t of T) link(P[t.a.id], P[t.b.id], { tipo: t.o.tipo, escalera: Math.abs(t.a.y - t.b.y) > 0.05 });
  for (const n of Object.values(N)) if (n.boca) link(P[n.id], P['sala:' + n.boca.sala.id], { sala: true });
  return P;
}

// la rejilla (o rejillas) de una altura
function gridsAt(d, y) {
  return (d.grids || []).filter((g) => y >= g.y0 - 0.01 && y <= g.y1 + 0.01).map((g) => g.grid);
}
function paint(d, ys, r) {
  for (const y of ys) for (const g of gridsAt(d, y)) g.paint(r[0], r[1], r[2], r[3], 1);
}

// (lo ahogado, para el juego: donde se anda despacio)
function ahogado(ctx, r, y) {
  (ctx.ahogados || (ctx.ahogados = [])).push({ r: [r[0], r[1], r[2], r[3]], y });
}

// ------------------------------------------------------------------------ el cruce
function cruce(ctx, n, o) {
  const wb = ctx.wb,
    col = ctx.col;
  const d = n.def;
  const { w, c } = KIT;
  const h = w / 2;
  const x0 = n.x - h,
    x1 = n.x + h,
    z0 = n.z - h,
    z1 = n.z + h;
  const y = n.y;
  const room = n.room || d.room;
  const mat = d.mat || 'ashlar';
  const tint = d.tint || SILLAR;
  const ys = y + KIT.sp;
  wb.setRoom(room);
  paint(d, [y], [x0, z0, x1, z1]);
  // el suelo: los andenes y el canal (en cruz por los lados que lo traen)
  const can = Object.fromEntries(Object.entries(n.conn).map(([k, t]) => [k, !!t && t.o.tipo === 'canal' && Math.abs(t.a.y - t.b.y) < 0.05]));
  const conns = Object.values(n.conn).filter(Boolean);
  const ahog = n.ahogado ?? (conns.some((t) => t.o.tipo === 'ahogado') && !conns.some((t) => t.o.tipo === 'canal'));
  const piezas = [];
  if (ahog) piezas.push(['agua', [x0, z0, x1, z1]]);
  else if (can.n || can.s || can.e || can.w) {
    const cc0 = n.x - c / 2,
      cc1 = n.x + c / 2,
      cz0 = n.z - c / 2,
      cz1 = n.z + c / 2;
    piezas.push(['canal', [cc0, cz0, cc1, cz1]]);
    piezas.push([can.n ? 'canal' : 'anden', [cc0, z0, cc1, cz0]]);
    piezas.push([can.s ? 'canal' : 'anden', [cc0, cz1, cc1, z1]]);
    piezas.push([can.w ? 'canal' : 'anden', [x0, cz0, cc0, cz1]]);
    piezas.push([can.e ? 'canal' : 'anden', [cc1, cz0, x1, cz1]]);
    for (const r of [
      [x0, z0, cc0, cz0],
      [cc1, z0, x1, cz0],
      [x0, cz1, cc0, z1],
      [cc1, cz1, x1, z1],
    ])
      piezas.push(['anden', r]);
  } else piezas.push(['anden', [x0, z0, x1, z1]]);
  suelo(ctx, piezas, y, room, d);
  // los muros de los lados ciegos
  for (const side of ['n', 's', 'e', 'w']) {
    if (n.conn[side]) continue;
    muro(ctx, side, side === 'n' || side === 's' ? [x0, x1] : [z0, z1], side === 'n' ? z0 : side === 's' ? z1 : side === 'w' ? x0 : x1, y, ys, room, mat, tint, ahog);
  }
  crossVault(ctx, { x0, z0, x1, z1, ys, walls: { n: !n.conn.n, s: !n.conn.s, e: !n.conn.e, w: !n.conn.w }, mat, tint: tint.map((v) => v * 0.94), room });
  col.add(x0, ys + h * 0.75, z0, x1, ys + h + 0.6, z1).cam = true;
  if (ctx.waters) for (const [k, r] of piezas) if (k === 'canal' || k === 'agua') ctx.waters.push(aguaDe(r, y - (k === 'agua' ? KIT.ahog : KIT.agua), d, k === 'agua'));
  for (const [k, r] of piezas) if (k === 'agua') ahogado(ctx, r, y - KIT.prof);
  wb.setRoom(null);
  void o;
}

// ------------------------------------------------------------------------ la galería
function tramo(ctx, t, o) {
  const wb = ctx.wb,
    col = ctx.col;
  const d = t.def;
  const { w, c } = KIT;
  const h = w / 2;
  const A = t.a,
    B = t.b;
  const room = t.o.room || d.room;
  const mat = t.o.mat || d.mat || 'ashlar';
  const tint = t.o.tint || d.tint || SILLAR;
  // (de la cara del cruce de un lado a la del otro; si un extremo es la boca
  // de una sala, hasta el muro de la sala)
  let s0, s1, u, ya, yb, E0, E1;
  if (t.alongX) {
    const [L, R] = A.x < B.x ? [A, B] : [B, A];
    s0 = L.boca ? L.x + h : L.x + h;
    s1 = R.boca ? R.x - h : R.x - h;
    // (la boca: el nodo está a media galería del muro; la galería llega al
    // muro, que está al otro lado del nodo)
    if (L.boca) s0 = L.x - h;
    if (R.boca) s1 = R.x + h;
    u = A.z;
    ya = L.y;
    yb = R.y;
    E0 = L;
    E1 = R;
  } else {
    const [U, D] = A.z < B.z ? [A, B] : [B, A];
    s0 = U.boca ? U.z - h : U.z + h;
    s1 = D.boca ? D.z + h : D.z - h;
    u = A.x;
    ya = U.y;
    yb = D.y;
    E0 = U;
    E1 = D;
  }
  // (los extremos que dan a una sala: el muro de la sala, su vano, y lo que
  // se acorta la galería por el grueso del muro)
  const cut0 = E0.boca ? KIT.t : 0,
    cut1 = E1.boca ? KIT.t : 0;
  const R = (sa, sb, ua, ub) => (t.alongX ? [sa, ua, sb, ub] : [ua, sa, ub, sb]);
  wb.setRoom(room);
  const tipo = t.o.tipo;
  for (const [E, sw] of [
    [E0, s0],
    [E1, s1],
  ])
    if (E.boca) {
      const S = E.boca.sala;
      const ysS = S.ys ?? S.y + (S.sp ?? 3.2);
      vano(ctx, { side: E.boca.side, line: sw, a0: u - h, a1: u + h, yb: E.y - (tipo === 'ahogado' ? KIT.prof : 0) - 0.05, y0: E.y + KIT.sp, top: ysS, mat, tint, roomIn: S.room || S.def.room, roomOut: room });
    }
  if (Math.abs(ya - yb) > 0.05) {
    escalera(ctx, t, s0, s1, u, ya, yb, room, mat, tint, cut0, cut1);
    wb.setRoom(null);
    return;
  }
  const y = ya,
    ys = y + KIT.sp;
  paint(d, [y], R(s0, s1, u - h, u + h));
  const piezas = [];
  if (tipo === 'canal') piezas.push(['anden', R(s0, s1, u - h, u - c / 2)], ['canal', R(s0, s1, u - c / 2, u + c / 2)], ['anden', R(s0, s1, u + c / 2, u + h)]);
  else if (tipo === 'ahogado') piezas.push(['agua', R(s0, s1, u - h, u + h)]);
  else piezas.push(['anden', R(s0, s1, u - h, u + h)]);
  suelo(ctx, piezas, y, room, d);
  // los muros, de un lado y del otro (hasta el grueso del muro de la sala)
  const sideA = t.alongX ? 'n' : 'w',
    sideB = t.alongX ? 's' : 'e';
  const m0 = s0 + cut0,
    m1 = s1 - cut1;
  muro(ctx, sideA, [m0, m1], u - h, y, ys, room, mat, tint, tipo === 'ahogado');
  muro(ctx, sideB, [m0, m1], u + h, y, ys, room, mat, tint, tipo === 'ahogado');
  const [rx0, rz0, rx1, rz1] = R(m0, m1, u - h, u + h);
  barrelVault(ctx, { x0: rx0, z0: rz0, x1: rx1, z1: rz1, ys, axis: t.alongX ? 'x' : 'z', mat, tint: tint.map((v) => v * 0.94), room, impostTint: tint.map((v) => v * 1.08) });
  const [cx0, cz0, cx1, cz1] = R(s0, s1, u - h, u + h);
  col.add(cx0, ys + h * 0.75, cz0, cx1, ys + h + 0.6, cz1).cam = true;
  if (ctx.waters) for (const [k, r] of piezas) if (k === 'canal' || k === 'agua') ctx.waters.push(aguaDe(r, y - (k === 'agua' ? KIT.ahog : KIT.agua), d, k === 'agua', t.alongX ? [t.o.flow ?? 0.5, 0] : [0, t.o.flow ?? 0.5]));
  for (const [k, r] of piezas) if (k === 'agua') ahogado(ctx, r, y - KIT.prof);
  // lo de cada galería: los caños de las calles, la lamparilla
  detalles(ctx, t, m0, m1, u, y, room);
  wb.setRoom(null);
  void o;
}

// Una escalera dentro de una galería: de un nivel a otro, con su bóveda en
// rampa y los muros de abajo arriba.
function escalera(ctx, t, s0, s1, u, ya, yb, room, mat, tint, cut0, cut1) {
  const wb = ctx.wb;
  const d = t.def;
  const { w, sp } = KIT;
  const h = w / 2;
  const top = Math.max(ya, yb),
    bot = Math.min(ya, yb);
  // (sube hacia s0 o hacia s1)
  const upAtS0 = ya > yb;
  const L = s1 - s0;
  const n = Math.max(2, Math.round((top - bot) / 0.3));
  const rise = (top - bot) / n;
  const run = Math.min(0.46, (L - 1.2) / n);
  const land = (L - n * run) / 2;
  const R = (sa, sb, ua, ub) => (t.alongX ? [sa, ua, sb, ub] : [ua, sa, ub, sb]);
  // (lo transitable, en las rejillas de las dos alturas y las de en medio)
  for (let yy = bot; yy <= top + 0.01; yy += 1.5) paint(d, [yy], R(s0, s1, u - h, u + h));
  paint(d, [top], R(s0, s1, u - h, u + h));
  // los rellanos de arriba y de abajo
  const ra = upAtS0 ? R(s0, s0 + land, u - h, u + h) : R(s1 - land, s1, u - h, u + h);
  const rb = upAtS0 ? R(s1 - land, s1, u - h, u + h) : R(s0, s0 + land, u - h, u + h);
  suelo(ctx, [['anden', ra]], top, room, d);
  suelo(ctx, [['anden', rb]], bot, room, d);
  // los peldaños: de abajo arriba
  const dir = t.alongX ? (upAtS0 ? 'w' : 'e') : upAtS0 ? 'n' : 's';
  const startS = upAtS0 ? s1 - land : s0 + land;
  const sx = t.alongX ? startS : u,
    sz = t.alongX ? u : startS;
  wb.tint = tint.map((v) => v * 1.05);
  stairs(ctx, sx, bot, sz, dir, w, n, rise, run, 'flag', { solidBelow: true, faces: 'tnsew' });
  wb.tint = null;
  // los muros: de lo de abajo a la bóveda de arriba (en los rellanos, a la
  // suya)
  const sideA = t.alongX ? 'n' : 'w',
    sideB = t.alongX ? 's' : 'e';
  const m0 = s0 + cut0,
    m1 = s1 - cut1;
  // (el muro de cada lado, por trozos: el rellano de abajo, el tramo de los
  // peldaños, el rellano de arriba)
  const [la0, la1] = upAtS0 ? [m0, s0 + land] : [s1 - land, m1];
  const [lb0, lb1] = upAtS0 ? [s1 - land, m1] : [m0, s0 + land];
  for (const [side, at] of [
    [sideA, u - h],
    [sideB, u + h],
  ]) {
    muro(ctx, side, [la0, la1], at, top, top + sp, room, mat, tint, false);
    muro(ctx, side, [lb0, lb1], at, bot, bot + sp, room, mat, tint, false);
    // (el de los peldaños: de abajo a lo alto de la rampa, en una pieza)
    muro(ctx, side, [s0 + land, s1 - land], at, bot, top + sp, room, mat, tint, false);
  }
  // la bóveda en rampa (del arranque de arriba al de abajo, por encima de
  // los peldaños) y, en los rellanos, su trozo de cañón
  const [x0, z0, x1, z1] = R(s0 + land, s1 - land, u - h, u + h);
  const ysA = (upAtS0 ? top : bot) + sp,
    ysB = (upAtS0 ? bot : top) + sp;
  rampVault(ctx, { x0, z0, x1, z1, axis: t.alongX ? 'x' : 'z', ys0: ysA, ys1: ysB, mat, tint: tint.map((v) => v * 0.94), room });
  for (const [r, yy, a0, a1] of [
    [ra, top, la0, la1],
    [rb, bot, lb0, lb1],
  ]) {
    const [vx0, vz0, vx1, vz1] = R(a0, a1, u - h, u + h);
    if (a1 - a0 > 0.05) barrelVault(ctx, { x0: vx0, z0: vz0, x1: vx1, z1: vz1, ys: yy + sp, axis: t.alongX ? 'x' : 'z', mat, tint: tint.map((v) => v * 0.94), room });
    ctx.col.add(r[0], yy + sp + h * 0.75, r[1], r[2], yy + sp + h + 0.6, r[3]).cam = true;
  }
  if (t.o.luz) lamparilla(ctx, t, (s0 + s1) / 2, u, (top + bot) / 2 + 1.2, room);
}

// ------------------------------------------------------------------------ el suelo
// piezas: [['anden' | 'canal' | 'agua', [x0, z0, x1, z1]]]
export function suelo(ctx, piezas, y, room, d = {}) {
  const wb = ctx.wb,
    col = ctx.col;
  const { prof } = KIT;
  const lechoY = y - prof;
  for (const [k, r] of piezas) {
    const [x0, z0, x1, z1] = r;
    if (x1 - x0 < 1e-3 || z1 - z0 < 1e-3) continue;
    if (k === 'anden') {
      wb.box('flag', x0, y - 0.1, z0, x1, y, z1, { faces: 't', ao: false, sub: 2, tint: d.suelo || [0.46, 0.45, 0.41], room });
      col.add(x0, y - 1.2, z0, x1, y, z1, 'floor').cam = true;
    } else {
      wb.box('mossstone', x0, lechoY - 0.1, z0, x1, lechoY, z1, { faces: 't', ao: false, sub: 2, tint: d.lecho || [0.34, 0.38, 0.3], room });
      col.add(x0, lechoY - 1.2, z0, x1, lechoY, z1, 'floor').cam = true;
    }
  }
  // los cantos de los andenes sobre el canal (donde un andén da al lecho)
  const and = piezas.filter((p) => p[0] === 'anden').map((p) => p[1]);
  const bajo = piezas.filter((p) => p[0] !== 'anden').map((p) => p[1]);
  const ct = [0.4, 0.42, 0.38];
  const ov = (p0, p1, q0, q1) => [Math.max(p0, q0), Math.min(p1, q1)];
  for (const a of and)
    for (const b of bajo) {
      if (Math.abs(a[2] - b[0]) < 1e-4) {
        const [s, e] = ov(a[1], a[3], b[1], b[3]);
        if (e - s > 1e-3) wb.box('ashlar', a[2] - 0.01, lechoY, s, a[2], y, e, { faces: 'e', ao: false, sub: 2, tint: ct, room });
      }
      if (Math.abs(a[0] - b[2]) < 1e-4) {
        const [s, e] = ov(a[1], a[3], b[1], b[3]);
        if (e - s > 1e-3) wb.box('ashlar', a[0], lechoY, s, a[0] + 0.01, y, e, { faces: 'w', ao: false, sub: 2, tint: ct, room });
      }
      if (Math.abs(a[3] - b[1]) < 1e-4) {
        const [s, e] = ov(a[0], a[2], b[0], b[2]);
        if (e - s > 1e-3) wb.box('ashlar', s, lechoY, a[3] - 0.01, e, y, a[3], { faces: 's', ao: false, sub: 2, tint: ct, room });
      }
      if (Math.abs(a[1] - b[3]) < 1e-4) {
        const [s, e] = ov(a[0], a[2], b[0], b[2]);
        if (e - s > 1e-3) wb.box('ashlar', s, lechoY, a[1], e, y, a[1] + 0.01, { faces: 'n', ao: false, sub: 2, tint: ct, room });
      }
    }
}

// el agua de un trozo
export function aguaDe(r, y, d = {}, ahogado = false, flow = [0.3, 0]) {
  return { shape: 'rect', r: [r[0] + 0.005, r[1] + 0.005, r[2] - 0.005, r[3] - 0.005], y, flow, amp: ahogado ? 0.012 : 0.016, deep: d.aguaDeep ?? 0x050807, sky: d.aguaSky ?? 0x0e1416, glint: d.aguaGlint ?? 0x6a8090, light: [(r[0] + r[2]) / 2, y + 2.4, (r[1] + r[3]) / 2], lightK: 0.35, drips: false };
}

// ------------------------------------------------------------------------ el muro
// side: hacia dónde da el muro visto desde dentro (n: el muro del norte,
// su cara mira al sur); a: [a0, a1] lo que abarca a lo largo; at: su línea
// (z para n/s, x para e/w); de lo de abajo (y, o el lecho si está ahogado)
// a ys (el arranque de la bóveda).
export function muro(ctx, side, a, at, y, ys, room, mat = 'ashlar', tint = SILLAR, ahogado = false, o = {}) {
  const wb = ctx.wb;
  if (a[1] - a[0] < 1e-3) return;
  const { t, banda, prof } = KIT;
  const yb = (ahogado ? y - prof : y) - 0.05;
  const face = OPP[side];
  const box = (y0, y1, m, tn, o2 = {}) => {
    if (y1 - y0 < 1e-3) return;
    if (side === 'n') wb.box(m, a[0], y0, at - t, a[1], y1, at, { faces: face, room, tint: tn, ...o2 });
    else if (side === 's') wb.box(m, a[0], y0, at, a[1], y1, at + t, { faces: face, room, tint: tn, ...o2 });
    else if (side === 'w') wb.box(m, at - t, y0, a[0], at, y1, a[1], { faces: face, room, tint: tn, ...o2 });
    else wb.box(m, at, y0, a[0], at + t, y1, a[1], { faces: face, room, tint: tn, ...o2 });
  };
  const yBand = Math.min(ys, y + (o.banda ?? banda));
  box(yb, yBand, 'mossstone', o.musgo || MUSGO, { sub: 1.6, aoH: 0.9, aoMin: 0.5, baseY: yb });
  box(yBand, ys, mat, tint, { sub: 1.6, ao: false });
}

// Un vano de arco en un muro, para una galería que entra en una sala: las
// jambas (en el grueso del muro, de lo de abajo al arranque, con su banda de
// musgo) y el arco de dovelas con sus enjutas hasta top (lo que no cubre el
// luneto de la sala). side: el muro (n: el del norte de la sala, visto desde
// dentro); line: la línea del muro; a0, a1: el hueco; yb: lo de abajo; y0:
// el arranque del arco (de medio punto); top: hasta dónde llegan las
// enjutas (el arranque de la bóveda de la sala; si el arco llega más arriba,
// lo alto del arco). Las jambas van de a0 - ring a a0 y de a1 a a1 + ring:
// el muro de la sala deja ese hueco. Devuelve lo alto (para el hueco del
// luneto: groinVaults holes).
export function vano(ctx, o) {
  const wb = ctx.wb;
  const { side, line, a0, a1, yb, y0 } = o;
  const t = o.t ?? KIT.t,
    ring = o.ring ?? KIT.ring;
  const mat = o.mat ?? 'ashlar',
    tint = o.tint ?? SILLAR;
  const w = a1 - a0,
    c = (a0 + a1) / 2;
  const top = Math.max(o.top ?? 0, y0 + w / 2 + ring);
  const axis = side === 'n' || side === 's' ? 'x' : 'z';
  const out = side === 'n' || side === 'w' ? -1 : 1;
  const t0 = Math.min(line, line + out * t),
    t1 = Math.max(line, line + out * t);
  // (archRing: rooms[0], la cara de t0; rooms[1], la de t1; la de dentro de
  // la sala es la de la línea del muro)
  const rooms = out < 0 ? [o.roomOut, o.roomIn] : [o.roomIn, o.roomOut];
  const fIn = OPP[side];
  for (const [ja, jb, fs] of [
    [a0 - ring, a0, axis === 'x' ? 'e' : 's'],
    [a1, a1 + ring, axis === 'x' ? 'w' : 'n'],
  ]) {
    const yBand = Math.min(y0, yb + 0.05 + KIT.banda);
    // (la cara de dentro del hueco, con la luz de la galería; la de la sala,
    // con la suya: una caja por cara)
    for (const [f, rm] of [
      [fs, o.roomOut],
      [fIn, o.roomIn],
    ]) {
      const pf = (m, ya, yc, tn, o3) => {
        if (yc - ya < 1e-3) return;
        if (axis === 'x') wb.box(m, ja, ya, t0, jb, yc, t1, { ...o3, faces: f, tint: tn, room: rm });
        else wb.box(m, t0, ya, ja, t1, yc, jb, { ...o3, faces: f, tint: tn, room: rm });
      };
      pf('mossstone', yb, yBand, o.musgo || MUSGO, { sub: 1.6, aoH: 0.9, aoMin: 0.5, baseY: yb });
      pf(mat, yBand, y0, tint, { sub: 1.6, ao: false });
    }
  }
  archRing(ctx, { axis, c, w, y0, rise: w / 2, ring, t0, t1, top, clip: [a0 - ring, a1 + ring], mat, spMat: mat, tint: tint.map((v) => v * 1.12), spTint: tint, rooms, cam: o.cam });
  return { top, u0: a0 - ring, u1: a1 + ring };
}

// Un pilar de sillería con su banda de musgo, su capitel y su colisión.
export function pilar(ctx, px, pz, y, ys, o = {}) {
  const wb = ctx.wb;
  const pl = o.pl ?? 0.4;
  const room = o.room,
    mat = o.mat ?? 'ashlar',
    tint = o.tint ?? SILLAR;
  const yb = y - (o.ahogado ? KIT.prof : 0) - 0.05;
  wb.box('mossstone', px - pl, yb, pz - pl, px + pl, y + (o.banda ?? 1.0), pz + pl, { faces: 'nsew', sub: 1.6, aoH: 1.0, baseY: yb, room, tint: o.musgo || MUSGO });
  wb.box(mat, px - pl, y + (o.banda ?? 1.0), pz - pl, px + pl, ys - 0.25, pz + pl, { faces: 'nsew', sub: 1.6, ao: false, room, tint });
  wb.box('ashlar', px - pl - 0.1, ys - 0.25, pz - pl - 0.1, px + pl + 0.1, ys, pz + pl + 0.1, { faces: 'tnsewb', ao: false, room, tint: tint.map((v) => v * 1.15) });
  ctx.col.add(px - pl, y - 1, pz - pl, px + pl, ys + 1.2, pz + pl);
}

// ------------------------------------------------------------------------ la sala
// s: { id, r: [x0, z0, x1, z1], xs, zs (las líneas de los apoyos, de muro a
// muro), y, sp (arranque), rise, bocas: [{ side, at }], tipo: 'seco' |
// 'ahogado' | 'estanque' (el agua honda en medio, con su andén alrededor:
// anden, su ancho), canal: [[x0, z0, x1, z1]] (canales en el suelo), oculi }
function sala(ctx, s, N, o) {
  const wb = ctx.wb,
    col = ctx.col;
  const d = s.def;
  const [x0, z0, x1, z1] = s.r;
  const y = s.y;
  const sp = s.sp ?? 3.2;
  const room = s.room || d.room;
  const mat = s.mat || d.mat || 'ashlar';
  const tint = s.tint || d.tint || SILLAR;
  const ys = s.ys ?? y + sp;
  wb.setRoom(room);
  paint(d, [y], [x0, z0, x1, z1]);
  // el suelo
  const piezas = [];
  if (s.tipo === 'ahogado') piezas.push(['agua', [x0, z0, x1, z1]]);
  else if (s.tipo === 'estanque') {
    const a = s.anden ?? 1.4;
    piezas.push(['anden', [x0, z0, x1, z0 + a]], ['anden', [x0, z1 - a, x1, z1]], ['anden', [x0, z0 + a, x0 + a, z1 - a]], ['anden', [x1 - a, z0 + a, x1, z1 - a]]);
  } else {
    const can = s.canal || [];
    if (!can.length) piezas.push(['anden', [x0, z0, x1, z1]]);
    else {
      for (const r of can) piezas.push(['canal', r]);
      for (const r of restar([x0, z0, x1, z1], can)) piezas.push(['anden', r]);
    }
  }
  suelo(ctx, piezas, y, room, d);
  if (ctx.waters) for (const [k, r] of piezas) if (k !== 'anden') ctx.waters.push(aguaDe(r, y - (k === 'agua' ? KIT.ahog : KIT.agua), d, k === 'agua', s.flow || [0.15, 0.1]));
  for (const [k, r] of piezas) if (k === 'agua') ahogado(ctx, r, y - KIT.prof);
  // el estanque: hondo de verdad (no se pisa: su borde tiene pretil)
  if (s.tipo === 'estanque') {
    const a = s.anden ?? 1.4;
    const fondo = y - (s.hondo ?? 2.4);
    const r = [x0 + a, z0 + a, x1 - a, z1 - a];
    wb.box('mossstone', r[0], fondo - 0.1, r[1], r[2], fondo, r[3], { faces: 't', ao: false, sub: 2, tint: [0.22, 0.26, 0.2], room });
    for (const [f, b] of [
      ['s', [r[0], r[1], r[2], r[1] + 0.01]],
      ['n', [r[0], r[3] - 0.01, r[2], r[3]]],
      ['e', [r[0], r[1], r[0] + 0.01, r[3]]],
      ['w', [r[2] - 0.01, r[1], r[2], r[3]]],
    ])
      wb.box('mossstone', b[0], fondo, b[1], b[2], y, b[3], { faces: f, ao: false, sub: 2, tint: [0.3, 0.34, 0.28], room });
    if (ctx.waters) ctx.waters.push(aguaDe(r, y - 0.55, d, true, [0.02, 0.03]));
    // el pretil (que no se caiga uno al agua honda)
    const pt = 0.22,
      ph = 0.75;
    for (const [bx0, bz0, bx1, bz1] of [
      [r[0], r[1], r[2], r[1] + pt],
      [r[0], r[3] - pt, r[2], r[3]],
      [r[0], r[1] + pt, r[0] + pt, r[3] - pt],
      [r[2] - pt, r[1] + pt, r[2], r[3] - pt],
    ]) {
      wb.box('ashlar', bx0, y, bz0, bx1, y + ph, bz1, { faces: 'tnsew', ao: false, sub: 2, tint: [0.5, 0.5, 0.46], room });
      col.add(bx0, y, bz0, bx1, y + ph + 0.4, bz1);
    }
    col.add(r[0] + pt, fondo - 1, r[1] + pt, r[2] - pt, y + 1.2, r[3] - pt);
  }
  // los muros (con el hueco de sus bocas: las jambas y el arco los pone el
  // vano de la galería)
  const bocas = s.bocas || [];
  const h = KIT.w / 2,
    ring = KIT.ring;
  const holes = [];
  for (const side of ['n', 's', 'e', 'w']) {
    const along = side === 'n' || side === 's' ? [x0, x1] : [z0, z1];
    const line = side === 'n' ? z0 : side === 's' ? z1 : side === 'w' ? x0 : x1;
    const huecos = bocas.filter((b) => b.side === side).map((b) => [b.at - h - ring, b.at + h + ring, b]);
    let cur = along[0];
    for (const [a0, a1, b] of [...huecos].sort((p, q) => p[0] - q[0])) {
      if (a0 > cur) muro(ctx, side, [cur, a0], line, y, ys, room, mat, tint, s.tipo === 'ahogado');
      // (lo alto del arco de la galería, si pasa del arranque de la sala)
      const by = b.y ?? y;
      const tv = by + KIT.sp + h + ring;
      if (tv > ys) holes.push({ side, u0: a0, u1: a1, y: tv });
      cur = a1;
    }
    if (cur < along[1]) muro(ctx, side, [cur, along[1]], line, y, ys, room, mat, tint, s.tipo === 'ahogado');
  }
  // los pilares y las bóvedas de arista
  const xs = s.xs || [x0, x1],
    zs = s.zs || [z0, z1];
  const rise = s.rise ?? Math.min(xs[1] - xs[0], zs[1] - zs[0]) / 2 - 0.05;
  for (let i = 1; i < xs.length - 1; i++)
    for (let j = 1; j < zs.length - 1; j++) {
      if ((s.sinPilar || []).some(([a, b]) => a === i && b === j)) continue;
      pilar(ctx, xs[i], zs[j], y, ys, { room, mat, tint, ahogado: s.tipo === 'ahogado', pl: s.pilar });
    }
  groinVaults(ctx, { xs, zs, ys, rise, mat, tint: tint.map((v) => v * 0.94), room, walls: { n: true, s: true, e: true, w: true }, oculi: s.oculi, ribs: s.ribs, holes });
  wb.setRoom(null);
  void N;
  void o;
}

// Un rectángulo menos otros.
export function restar(r, huecos) {
  let out = [r];
  for (const hh of huecos) {
    const next = [];
    for (const [a, b, c, d] of out) {
      const [h0, h1, h2, h3] = hh;
      if (h0 >= c || h2 <= a || h1 >= d || h3 <= b) {
        next.push([a, b, c, d]);
        continue;
      }
      if (h1 > b) next.push([a, b, c, h1]);
      if (h3 < d) next.push([a, h3, c, d]);
      if (h0 > a) next.push([a, Math.max(b, h1), h0, Math.min(d, h3)]);
      if (h2 < c) next.push([h2, Math.max(b, h1), c, Math.min(d, h3)]);
    }
    out = next;
  }
  return out;
}

// ------------------------------------------------------------------------ lo de cada galería
// Los caños de las calles (un agujero negro en el muro, con su reguero) y,
// si o.luz, una lamparilla de aceite en su nicho.
function detalles(ctx, t, s0, s1, u, y, room) {
  const wb = ctx.wb;
  const rng = new RNG(Math.round(s0 * 13 + u * 7 + y * 3 + 1000));
  const L = s1 - s0;
  const h = KIT.w / 2;
  if (L > 3 && rng.chance(t.o.canos ?? 0.45)) {
    const s = s0 + rng.range(1, L - 1);
    const sd = rng.chance(0.5) ? -1 : 1;
    const uu = u + sd * (h - 0.005);
    const yy = y + 1.4;
    const tn = { ao: false, grime: false, room };
    if (t.alongX) {
      wb.box('black', s - 0.16, yy, uu - 0.005, s + 0.16, yy + 0.3, uu + 0.005, { ...tn, faces: sd < 0 ? 's' : 'n' });
      wb.box('mossstone', s - 0.3, y, uu - 0.012 * sd, s + 0.3, yy, uu - 0.008 * sd, { ao: false, room, faces: sd < 0 ? 's' : 'n', tint: [0.32, 0.42, 0.28] });
    } else {
      wb.box('black', uu - 0.005, yy, s - 0.16, uu + 0.005, yy + 0.3, s + 0.16, { ...tn, faces: sd < 0 ? 'e' : 'w' });
      wb.box('mossstone', uu - 0.012 * sd, y, s - 0.3, uu - 0.008 * sd, yy, s + 0.3, { ao: false, room, faces: sd < 0 ? 'e' : 'w', tint: [0.32, 0.42, 0.28] });
    }
  }
  if (t.o.luz) lamparilla(ctx, t, s0 + L * rng.range(0.3, 0.7), u, y + 1.5, room);
}

// Una lamparilla de aceite en su nicho, encendida (luz cálida y poca).
export function lamparilla(ctx, t, s, u, yy, room) {
  const wb = ctx.wb;
  const h = KIT.w / 2;
  const x = t.alongX ? s : u - h + 0.12,
    z = t.alongX ? u - h + 0.12 : s;
  wb.box('black', x - 0.15, yy - 0.05, z - 0.15, x + 0.15, yy + 0.32, z + 0.15, { faces: t.alongX ? 's' : 'e', ao: false, grime: false, room });
  wb.cylinder('plaster', x, yy, z, 0.06, 0.05, 0.04, 8, { ao: false, capTop: true, capBot: true, tint: [0.62, 0.42, 0.3], room });
  if (ctx.fires) ctx.fires.push({ x, y: yy + 0.06, z, s: 0.1 });
  ctx.lights.push({ x, y: yy + 0.3, z, r: 1.0, g: 0.66, b: 0.36, radius: 5, intensity: 0.75, room });
}
