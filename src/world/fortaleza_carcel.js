// La cárcel de la fortaleza (PLAN_FORTALEZA.md, §5.13; fase 5): la cárcel del
// Rey, bajo la mitad sur de la fortaleza, dos metros más honda que la
// mazmorra del castillo.
//
// Se baja por la trampilla del almacén de la torre del homenaje: la bajada,
// una escalera recta que pasa por debajo del muro del patio, a la sala de los
// carceleros (una bóveda de arista de muro a muro). De ella, la cárcel: tres
// naves con bóvedas de arista sobre columnas; las de los lados, enrejadas
// hasta la bóveda entre columna y columna, son las celdas (en unas, todavía
// encerrados, los que se trajeron aquí en los últimos días del asedio). Por
// una puerta de la nave de levante, el aljibe del palacio, bajo el patio de
// honor: su andén, el agua negra entre las columnas y la luz que baja por el
// brocal. Al sur, por el eje de la puerta de la fortaleza: el paso de las
// celdas de castigo, el cuarto de los verdugos (el tajo, la espada de la
// justicia del Rey, el olvidadero), el paso bajo el foso y la capilla de los
// reos, donde los que quedan rezan de espaldas al altar, vueltos hacia la Sé.
// De la capilla sube la escalera al rastrillo de la mazmorra del castillo, al
// fondo del pasillo de las celdas: se ve desde el principio y su palanca está
// de este lado (el atajo a la celda). Junto a la palanca, el carcelero mayor.
//
// La planta es una lista de rectángulos (como la de las mazmorras del
// castillo: level_castle.js), con su suelo y su techo; los muros salen de la
// rejilla (dungeonWalls) y las bóvedas, los arcos, las columnas y las rejas,
// de cada sala. Las escaleras se levantan aparte, con sus muros en rampa.
// Norte = -z. Medidas: FORT.carcel (fortaleza_medidas.js).
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, blocker, stairs, archRing, barrelVault, rampVault, groinVaults, pilaster, subtractRects } from './builders.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';
import { FORT } from './fortaleza_medidas.js';
import { dungeonWalls, beam3 } from './level_castle.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

const C = FORT.carcel;
const YF = C.y,
  YC = C.yc;
// las salas (para la luz y el descarte) y sus zonas
export const CARCEL_ROOMS = {
  bajada: 'carcel_bajada',
  carceleros: 'carcel_carceleros',
  celdas: 'carcel_celdas',
  aljibe: 'aljibe_palacio',
  paso: 'carcel_paso',
  verdugos: 'carcel_verdugos',
  foso: 'carcel_foso',
  capilla: 'carcel_capilla',
  rastrillo: 'carcel_rastrillo',
};
const RM = CARCEL_ROOMS;
// la piedra: el mampuesto de los muros, la sillería de arcos y columnas, la
// del aljibe y la marca verdosa del agua
const MURO = [0.6, 0.58, 0.55],
  SILLA = [0.68, 0.66, 0.61],
  CAPI = [0.74, 0.72, 0.67],
  ALJ = [0.6, 0.62, 0.6],
  MARCA = [0.3, 0.34, 0.28];

// --- las alturas de cada sala: el arranque y la flecha de su bóveda (y su
// clave, lo alto de sus muros)
const VS = { ys: YF + 2.6, rise: 2.6 }; // la sala de los carceleros
const HS = { ys: YF + 2.6, rise: 2.0 }; // la cárcel
const AS = { ys: YF + 2.8, rise: 1.6 }; // el aljibe
const ES = { ys: YF + 2.6, rise: 2.0 }; // el cuarto de los verdugos
const LS = { ys: YF + 2.6, rise: 2.4 }; // la capilla de los reos
// los pasos (2 m de luz, como las galerías de la mazmorra del castillo): su
// cañón, de medio punto; bajo el foso, la clave queda a 8 cm de su fondo
const PS = { ys: YF + 2.35, rise: C.paso / 2 };
const crown = (s) => s.ys + s.rise;
// las puertas de arco entre sala y sala: su arranque, su flecha (según su
// luz) y su rosca; lo alto de su hueco
const PU = { ys: YF + 2.0, ring: 0.25, rise: (w) => 0.3 * w };
const puTop = (w) => PU.ys + PU.rise(w) + PU.ring;
// (la de la sala de los carceleros a la cárcel, en el eje de la bajada; la de
// la cárcel al aljibe, en medio de su tramo)
const PV = 2,
  PA = 2.5;

// --- la bajada: su escalera (de la boca, a ras del almacén, al pie), su
// línea de huellas y su bóveda en rampa (el arranque, a hB sobre los
// peldaños)
const B = C.bajada;
const BX = (B.x0 + B.x1) / 2;
const bRise = -YF / B.n,
  bRun = (B.z1 - B.z0) / B.n;
const bY = (z) => -((z - B.z0) / (B.z1 - B.z0)) * -YF; // de 0 en z0 a YF en z1
const hB = 1.85,
  rB = (B.x1 - B.x0) / 2 - 0.03;
// --- la subida al rastrillo (de la capilla, en YF, al rellano, en YC)
const SU = C.subida;
const RA = C.rastrillo;
const sRise = (YC - YF) / SU.n,
  sRun = (SU.x1 - SU.x0) / SU.n;
const sY = (x) => YF + ((x - SU.x0) / (SU.x1 - SU.x0)) * (YC - YF);
const hS = 1.9,
  rS = RA.w / 2 - 0.03;
const SZ0 = RA.z - RA.w / 2,
  SZ1 = RA.z + RA.w / 2;
// el rellano: su cañón sigue al de la subida
const RL = { ys: YC + hS, rise: rS };

export function buildCarcel(ctx, D, L) {
  const wb = ctx.wb;
  // ------------------------------------------------------------ la planta
  const regs = [];
  const R = (x0, z0, x1, z1, y0, y1, mat, room, o = {}) => {
    const r = { x0, z0, x1, z1, y0, y1, mat, room, tint: o.tint ?? MURO, floorMat: o.floorMat ?? 'flag', floorTint: o.floorTint, noFloor: o.noFloor, flat: o.flat };
    regs.push(r);
    return r;
  };
  const H = C.celdas,
    A = C.aljibe,
    Vc = C.carceleros,
    E = C.verdugos,
    Ca = C.capilla;
  const ex = C.eje,
    pw = C.paso;
  const p0 = ex - pw / 2,
    p1 = ex + pw / 2;
  const hz = H.zs,
    hx = H.xs;
  // (la puerta de la cárcel al aljibe, en el tramo 'paso' de levante)
  const zPa = (hz[H.paso] + hz[H.paso + 1]) / 2;
  R(Vc.x0, Vc.z0, Vc.x1, Vc.z1, YF, crown(VS), 'wallstone', RM.carceleros);
  R(BX - PV / 2, Vc.z1, BX + PV / 2, hz[0], YF, puTop(PV), 'ashlar', RM.celdas, { tint: SILLA, flat: true });
  R(hx[0], hz[0], hx[3], hz[5], YF, crown(HS), 'wallstone', RM.celdas);
  R(hx[3], zPa - PA / 2, A.xs[0], zPa + PA / 2, YF, puTop(PA), 'ashlar', RM.aljibe, { tint: SILLA, flat: true });
  R(A.xs[0], A.zs[0], A.anden, A.zs[4], YF, crown(AS), 'ashlar', RM.aljibe, { tint: ALJ });
  R(A.anden, A.zs[0], A.xs[4], A.zs[4], A.fondo, crown(AS), 'ashlar', RM.aljibe, { tint: [0.52, 0.55, 0.55], floorMat: 'mossstone' });
  R(p0, A.zs[4], p1, E.z0, YF, crown(PS), 'wallstone', RM.paso);
  R(E.x0, E.z0, E.x1, E.z1, YF, crown(ES), 'wallstone', RM.verdugos, { noFloor: true });
  R(p0, E.z1, p1, Ca.z0, YF, crown(PS), 'wallstone', RM.foso);
  R(Ca.x0, Ca.z0, Ca.x1, Ca.z1, YF, crown(LS), 'wallstone', RM.capilla);
  R(C.rellano.x0, SZ0, C.rellano.x1, SZ1, YC, crown(RL), 'wallstone', RM.rastrillo);
  R(RA.x0, SZ0, RA.x1, SZ1, YC, YC + RA.h, 'ashlar', RM.rastrillo, { tint: SILLA, flat: true });
  for (const r of regs) D.paint(r.x0, r.z0, r.x1, r.z1, 1);
  // (las dos escaleras: se pisan, pero sus muros los pone cada una)
  D.paint(B.x0, B.z0, B.x1, B.z1, 1);
  D.paint(SU.x0, SZ0, SU.x1, SZ1, 1);
  // huecos en los muros de la rejilla: las bocas de las dos escaleras, el paso
  // del rastrillo a la mazmorra del castillo y los nichos de las celdas de
  // castigo
  const holes = [
    { plane: 'z', line: B.z1, a0: B.x0, a1: B.x1, y0: YF - 1, y1: YF + hB + rB + 0.6 },
    { plane: 'x', line: SU.x0, a0: SZ0, a1: SZ1, y0: YF - 1, y1: YF + hS + rS + 0.7 },
    { plane: 'x', line: SU.x1, a0: SZ0, a1: SZ1, y0: YC - 1, y1: crown(RL) + 0.5 },
    { plane: 'x', line: RA.x1, a0: SZ0, a1: SZ1, y0: YC - 0.1, y1: YC + RA.h },
  ];
  const nichos = celdasDeCastigo(holes);
  // suelos y techos (la colisión del techo, en la clave: ahí se cuelgan las
  // criaturas del techo; con bóveda, el techo plano no se ve)
  for (const r of regs) {
    if (!r.noFloor) {
      wb.box(r.floorMat, r.x0, r.y0 - 0.3, r.z0, r.x1, r.y0, r.z1, { faces: 't', ao: false, room: r.room, uv: 0.6, tint: (r.floorTint ?? r.tint).map((v) => v * 1.12) });
      ctx.col.add(r.x0, r.y0 - 1, r.z0, r.x1, r.y0, r.z1);
    }
    if (r.flat) wb.box(r.mat, r.x0, r.y1, r.z0, r.x1, r.y1 + 0.3, r.z1, { faces: 'b', ao: false, room: r.room, tint: r.tint.map((v) => v * 0.85) });
    ctx.col.add(r.x0, r.y1, r.z0, r.x1, r.y1 + 0.3, r.z1).cam = true;
  }
  dungeonWalls(ctx, D, regs, holes);

  const fx = { ctx, L, wb };
  bajada(fx);
  carceleros(fx);
  celdas(fx);
  aljibe(fx);
  pasos(fx, nichos);
  verdugos(fx);
  capilla(fx);
  subida(fx);
  zonas(L);
}

// ------------------------------------------------------------ piezas
// Portada de arco donde un paso de cañón entra en una sala (o una puerta
// atraviesa un muro): la rosca de dovelas en el plano 'line' (de t0 a t1 a lo
// hondo), sus enjutas hasta 'top' y, a los lados, sus pilastras.
function portada(ctx, axis, line, c, span, y0, ys, top, inward, rooms, o = {}) {
  const w = span - (o.jamb ?? 0.24);
  const d = o.depth ?? 0.25;
  archRing(ctx, {
    axis: axis === 'x' ? 'z' : 'x',
    c,
    w,
    y0: ys,
    rise: o.rise ?? w / 2,
    ring: o.ring ?? 0.3,
    t0: line - d,
    t1: line + d,
    top,
    clip: [c - span / 2, c + span / 2],
    mat: 'ashlar',
    spMat: o.spMat ?? 'wallstone',
    rooms,
    tint: SILLA,
    spTint: o.spTint ?? MURO,
    proud: 0.025,
  });
  if (o.pilasters === false) return;
  const at = line + inward * 0.22;
  pilaster(ctx, c - span / 2, at, axis === 'x' ? 's' : 'e', y0, ys, { room: rooms[inward > 0 ? 1 : 0], tint: SILLA, d: 0.13 });
  pilaster(ctx, c + span / 2, at, axis === 'x' ? 'n' : 'w', y0, ys, { room: rooms[inward > 0 ? 1 : 0], tint: SILLA, d: 0.13 });
}

// Una puerta de arco a través de un muro (el hueco, una sala aparte de la
// planta, con su techo plano a puTop): la rosca de lado a lado del grueso y
// sus enjutas. axis: a lo largo de qué va el muro; t0..t1: su grueso; w: su
// luz.
function puerta(ctx, axis, c, t0, t1, rooms, w) {
  archRing(ctx, { axis, c, w, y0: PU.ys, rise: PU.rise(w), ring: PU.ring, t0, t1, top: puTop(w), clip: [c - w / 2, c + w / 2], mat: 'ashlar', spMat: 'ashlar', rooms, tint: SILLA, spTint: SILLA, proud: 0.025 });
}

// Columna: basa, fuste, capitel de ocho caras y ábaco (el arranque, en ys).
function columna(ctx, x, z, y0, ys, room, o = {}) {
  const wb = ctx.wb;
  const yb = y0 + (o.basa ?? 0.42),
    yc = ys - 0.45;
  const t = o.tint ?? SILLA;
  wb.box('ashlar', x - 0.42, y0, z - 0.42, x + 0.42, yb, z + 0.42, { ao: false, faces: 'tnsew', room, tint: t });
  wb.cylinder('ashlar', x, yb, z, 0.29, 0.26, yc - yb, 8, { ao: false, sub: 2, room, tint: t });
  wb.cylinder('ashlar', x, yc, z, 0.26, 0.45, 0.33, 8, { ao: false, room, tint: CAPI });
  wb.box('ashlar', x - 0.5, ys - 0.12, z - 0.5, x + 0.5, ys, z + 0.5, { ao: false, faces: 'tnsewb', room, tint: CAPI });
  ctx.col.add(x - 0.32, y0, z - 0.32, x + 0.32, ys, z + 0.32);
}

// Una cara de muro, plana, en el plano 'line' (x o z), mirando a dir, de a0 a
// a1, con el pie y la cabeza que pueden ir en rampa: pts [[a, ypie, ycabeza]]
// en orden.
function caraRampa(wb, mat, dir, line, pts, o) {
  const Pp = (a, y) => (dir === 'e' || dir === 'w' ? V(line, y, a) : V(a, y, line));
  for (let k = 0; k + 1 < pts.length; k++) {
    const [a0, b0, t0] = pts[k],
      [a1, b1, t1] = pts[k + 1];
    if (dir === 'e' || dir === 'n') wb.quad(mat, Pp(a1, b1), Pp(a0, b0), Pp(a0, t0), Pp(a1, t1), o);
    else wb.quad(mat, Pp(a0, b0), Pp(a1, b1), Pp(a1, t1), Pp(a0, t0), o);
  }
}

// Una reja de hierro de a0 a a1 (a lo largo de x o de z, en el plano 'line'),
// del suelo y0 hasta yTop(a): barrotes cada 'paso', pletinas a tres alturas y,
// si lleva puerta (de d0 a d1), su marco; open: la hoja, abierta (un ángulo,
// alrededor de su gozne en d0) o arrancada ('suelo'). Con su colisión, menos
// el hueco de la puerta abierta.
function reja(ctx, axis, line, a0, a1, y0, yTop, room, o = {}) {
  const wb = ctx.wb;
  const step = o.paso ?? 0.16,
    bw = 0.024;
  const B = (u0, ya, u1, yb, dd = bw) => (axis === 'x' ? wb.box('iron', u0, ya, line - dd, u1, yb, line + dd, { ao: false, room }) : wb.box('iron', line - dd, ya, u0, line + dd, yb, u1, { ao: false, room }));
  const door = o.door;
  const inDoor = (u) => door && u > door[0] - 0.01 && u < door[1] + 0.01;
  const n = Math.max(1, Math.round((a1 - a0) / step));
  const st = (a1 - a0) / n;
  for (let k = 0; k <= n; k++) {
    const u = a0 + k * st;
    const top = yTop(u) - 0.02;
    if (top - y0 < 0.1) continue;
    if (inDoor(u)) {
      // sobre la puerta, la reja sigue hasta el arco
      if (top > y0 + 2.12) B(u - bw, y0 + 2.1, u + bw, top);
      continue;
    }
    B(u - bw, y0, u + bw, top);
  }
  // pletinas
  for (const yy of [y0 + 0.12, y0 + 1.1, y0 + 2.1]) {
    const segs = door ? [[a0, door[0]], [door[1], a1]] : [[a0, a1]];
    for (const [s0, s1] of segs) if (s1 - s0 > 0.05) B(s0, yy - 0.035, s1, yy + 0.035, 0.035);
  }
  if (door) {
    // el dintel de la puerta, de lado a lado, y sus largueros
    B(door[0], y0 + 2.06, door[1], y0 + 2.14, 0.04);
    for (const u of door) B(u - 0.035, y0, u + 0.035, y0 + 2.1, 0.035);
    const hoja = (wb2) => {
      const w = door[1] - door[0] - 0.08;
      // (en local: la hoja a lo largo de +x desde el gozne)
      for (let x = 0.08; x < w - 0.04; x += step) wb2.box('iron', x - bw, 0.04, -bw, x + bw, 2.0, bw, { ao: false, room });
      for (const yy of [0.1, 1.0, 1.95]) wb2.box('iron', 0, yy - 0.03, -0.03, w, yy + 0.03, 0.03, { ao: false, room });
      wb2.box('iron', 0, 0.02, -0.035, 0.05, 2.04, 0.035, { ao: false, room });
      wb2.box('iron', w - 0.05, 0.02, -0.035, w, 2.04, 0.035, { ao: false, room });
    };
    const g0 = door[0] + 0.04;
    if (o.open === 'suelo') {
      // arrancada: tirada en el suelo, delante de la celda
      const [sx, sz, rot] = o.where;
      wb.push();
      wb.translate(sx, y0 + 0.04, sz);
      wb.rotateY(rot);
      wb.rotateX(-Math.PI / 2);
      hoja(wb);
      wb.pop();
    } else if (o.open !== undefined) {
      const ry = (axis === 'x' ? 0 : -Math.PI / 2) + o.open;
      wb.push();
      if (axis === 'x') wb.translate(g0, y0, line);
      else wb.translate(line, y0, g0);
      wb.rotateY(ry);
      hoja(wb);
      wb.pop();
      // (la hoja abierta también choca: no se atraviesa)
      const w = door[1] - door[0] - 0.08;
      const hx = axis === 'x' ? g0 : line,
        hz = axis === 'x' ? line : g0;
      const dx = Math.cos(ry),
        dz = -Math.sin(ry);
      ctx.col.addOBB(hx + (dx * w) / 2, hz + (dz * w) / 2, w / 2, 0.05, Math.atan2(-dz, dx), y0, y0 + 2.04);
    } else {
      // cerrada, con su candado
      wb.push();
      if (axis === 'x') wb.translate(g0, y0, line);
      else wb.translate(line, y0, g0);
      if (axis === 'z') wb.rotateY(-Math.PI / 2);
      hoja(wb);
      const w = door[1] - door[0] - 0.08;
      wb.box('iron', w - 0.18, 1.0, -0.06, w - 0.04, 1.18, 0.06, { ao: false, room, tint: [0.7, 0.62, 0.5] });
      wb.pop();
    }
  }
  // la colisión (sin el hueco de la puerta, si está abierta)
  const ys = Math.max(y0 + 2.2, Math.min(yTop(a0), yTop(a1)));
  const cols = door && o.open !== undefined ? [[a0, door[0]], [door[1], a1]] : [[a0, a1]];
  for (const [s0, s1] of cols) {
    if (s1 - s0 < 0.02) continue;
    if (axis === 'x') ctx.col.add(s0, y0, line - 0.06, s1, ys, line + 0.06);
    else ctx.col.add(line - 0.06, y0, s0, line + 0.06, ys, s1);
  }
  if (door && o.open !== undefined) {
    // (sobre el hueco, la reja que baja del arco)
    if (axis === 'x') ctx.col.add(door[0], y0 + 2.1, line - 0.06, door[1], ys, line + 0.06);
    else ctx.col.add(line - 0.06, y0 + 2.1, door[0], line + 0.06, ys, door[1]);
  }
}

// La placa de hierro de una palanca de pared, con la ranura por la que baja
// el mango (el mango es interactuable: interact.js). (x, z): en la cara del
// muro; (nx, nz): hacia dónde mira.
function placaPalanca(ctx, x, y, z, nx, nz, room) {
  const wb = ctx.wb;
  const tx = -nz,
    tz = nx;
  const px = (a, n) => x + tx * a + nx * n,
    pz = (a, n) => z + tz * a + nz * n;
  const bx = (a0, n0, a1, n1) => [Math.min(px(a0, n0), px(a1, n1)), Math.min(pz(a0, n0), pz(a1, n1)), Math.max(px(a0, n0), px(a1, n1)), Math.max(pz(a0, n0), pz(a1, n1))];
  let r = bx(-0.3, 0, 0.3, 0.08);
  wb.box('iron', r[0], y + 0.55, r[1], r[2], y + 1.75, r[3], { ao: false, room });
  r = bx(-0.05, 0.08, 0.05, 0.095);
  wb.box('black', r[0], y + 0.7, r[1], r[2], y + 1.6, r[3], { ao: false, grime: false, room });
  for (const s of [-1, 1]) {
    r = bx(s * 0.22 - 0.03, 0.08, s * 0.22 + 0.03, 0.1);
    for (const yy of [y + 0.68, y + 1.62]) wb.box('iron', r[0], yy - 0.03, r[1], r[2], yy + 0.03, r[3], { ao: false, room });
  }
}

// ------------------------------------------------------------ la bajada
// Del almacén de la torre, por el hueco de su suelo, la escalera baja recta
// hacia el sur, pasa por debajo del muro del patio y llega a la sala de los
// carceleros. En el hueco, sus muros llegan al suelo del almacén; bajo el
// muro, una bóveda en rampa, con su boca de sillería a cada lado.
function bajada({ ctx }) {
  const wb = ctx.wb;
  const room = RM.bajada;
  const top = 'homenaje_almacen';
  const zh = B.hueco;
  // la escalera, de pie a boca (sube hacia el norte): los peldaños de bajo el
  // muro, en la luz de la bajada; los del hueco, en la del almacén
  const nb = Math.ceil((B.z1 - zh) / bRun - 0.2);
  wb.setRoom(room);
  stairs(ctx, BX, YF, B.z1, 'n', B.x1 - B.x0, nb, bRise, bRun, 'wallstone', { solidBelow: true });
  wb.setRoom(top);
  stairs(ctx, BX, YF + nb * bRise, B.z1 - nb * bRun, 'n', B.x1 - B.x0, B.n - nb, bRise, bRun, 'wallstone', { base: YF - 0.5 });
  wb.setRoom(room);
  const ys0 = bY(zh) + hB,
    ys1 = YF + hB;
  // los muros de los lados: en el hueco, hasta el suelo del almacén; bajo el
  // muro, hasta el arranque de la bóveda
  for (const [line, dir] of [
    [B.x0, 'e'],
    [B.x1, 'w'],
  ]) {
    // (hasta el brocal de sillería del hueco, que asoma en el almacén)
    caraRampa(wb, 'wallstone', dir, line, [
      [B.z0, YF - 0.5, -0.05],
      [zh, YF - 0.5, -0.05],
    ], { room: top, tint: MURO, sub: 1.6, aoH: 1.2, baseY: YF });
    caraRampa(wb, 'wallstone', dir, line, [
      [zh, YF - 0.5, ys0],
      [B.z1, YF - 0.5, ys1],
    ], { room, tint: MURO, sub: 1.6, aoH: 1.2, baseY: YF });
  }
  // (las capas de la cámara, a cuarto de metro: a medio metro, en una rampa tan
  // pendiente, cada escalón baja 0,4 y bajo la bóveda no cabía en ninguna parte)
  rampVault(ctx, { x0: B.x0, x1: B.x1, z0: zh, z1: B.z1, ys0, ys1, rise: rB, mat: 'wallstone', tint: MURO.map((v) => v * 0.82), room, camStep: 0.25 });
  // la boca de arriba: su arco de sillería bajo el muro del patio, y encima,
  // la cara del muro hasta el suelo del almacén
  archRing(ctx, { axis: 'x', c: BX, w: (B.x1 - B.x0) - 0.06, y0: ys0, rise: rB, ring: 0.22, t0: zh, t1: zh + 0.3, top: -0.02, clip: [B.x0, B.x1], mat: 'ashlar', spMat: 'wallstone', rooms: ['homenaje_almacen', room], tint: SILLA, spTint: MURO, proud: 0.02 });
  // la boca de abajo, en la sala de los carceleros
  archRing(ctx, { axis: 'x', c: BX, w: (B.x1 - B.x0) - 0.06, y0: ys1, rise: rB, ring: 0.24, t0: B.z1 - 0.3, t1: B.z1, top: ys1 + rB + 0.6, clip: [B.x0, B.x1], mat: 'ashlar', spMat: 'wallstone', rooms: [room, RM.carceleros], tint: SILLA, spTint: MURO, proud: 0.025 });
  // a media bajada, una antorcha en el muro de levante (la luz que se ve
  // desde arriba, al abrir)
  const zt = (zh + B.z1) / 2 + 0.6;
  P.wallTorch(ctx, B.x1, bY(zt) + 1.55, zt, 'w', { room, radius: 5.5, dyn: 2.2 });
  // la cal que cayó y unos huesos en los peldaños
  P.bones(ctx, BX + 0.3, bY(-86.9) + 0.02, -86.9, 3, 8801, 0.25);
  wb.setRoom(null);
}

// ------------------------------------------------------------ la sala de los carceleros
// Al pie de la bajada: una bóveda de arista de muro a muro sobre sus cuatro
// rincones. La mesa de los carceleros con el libro de los presos, el tablero
// de las llaves, los grilletes y el brasero; la puerta de la cárcel, al sur.
function carceleros({ ctx, L }) {
  const wb = ctx.wb;
  const Vc = C.carceleros;
  const room = RM.carceleros;
  const xc = (Vc.x0 + Vc.x1) / 2;
  groinVaults(ctx, { xs: [Vc.x0, Vc.x1], zs: [Vc.z0, Vc.z1], ys: VS.ys, rise: VS.rise, mat: 'wallstone', tint: MURO.map((v) => v * 0.8), room, n: 12, m: 6 });
  // los cuatro rincones: una pilastra en escuadra con su imposta
  for (const [x, z, sx, sz] of [
    [Vc.x0, Vc.z0, 1, 1],
    [Vc.x1, Vc.z0, -1, 1],
    [Vc.x0, Vc.z1, 1, -1],
    [Vc.x1, Vc.z1, -1, -1],
  ]) {
    const xa = Math.min(x, x + sx * 0.5),
      xb = Math.max(x, x + sx * 0.5),
      za = Math.min(z, z + sz * 0.5),
      zb = Math.max(z, z + sz * 0.5);
    wb.box('ashlar', xa, YF, za, xb, VS.ys - 0.16, zb, { ao: false, faces: (sx > 0 ? 'e' : 'w') + (sz > 0 ? 's' : 'n'), room, tint: SILLA, sub: 2 });
    wb.box('ashlar', xa - (sx < 0 ? 0.08 : 0), VS.ys - 0.16, za - (sz < 0 ? 0.08 : 0), xb + (sx > 0 ? 0.08 : 0), VS.ys, zb + (sz > 0 ? 0.08 : 0), { ao: false, faces: 'b' + (sx > 0 ? 'e' : 'w') + (sz > 0 ? 's' : 'n'), room, tint: CAPI });
    ctx.col.add(xa, YF, za, xb, VS.ys, zb);
  }
  // la puerta de la cárcel
  puerta(ctx, 'x', xc, Vc.z1, C.celdas.zs[0], [room, RM.celdas], PV);
  wb.setRoom(room);
  // la mesa de los carceleros, con sus bancos, la vela y el libro de los
  // presos; los dados, la jarra
  const tx = Vc.x0 + 2.1,
    tz = (Vc.z0 + Vc.z1) / 2;
  P.table(ctx, tx, YF, tz, 1.0, 2.6, 0);
  P.bench(ctx, tx + 0.9, YF, tz, 2.2, Math.PI / 2);
  P.candles(ctx, tx - 0.1, YF + 0.8, tz - 0.9, 2, 8811, { room, radius: 4.5, intensity: 0.9, spread: 0.08 });
  P.jar(ctx, tx + 0.2, YF + 0.8, tz + 0.95, 0.5, { room });
  for (let k = 0; k < 3; k++) wb.box('bone', tx - 0.2 + k * 0.1, YF + 0.8, tz + 0.3 + (k % 2) * 0.08, tx - 0.16 + k * 0.1, YF + 0.84, tz + 0.34 + (k % 2) * 0.08, { ao: false, room });
  wb.at(tx + 0.05, YF + 0.8, tz - 0.2, 0.15, () => {
    wb.box('leather', -0.26, 0, -0.19, 0.26, 0.05, 0.19, { ao: false, room, tint: [0.42, 0.3, 0.24] });
    wb.box('clothWhite', -0.24, 0.05, -0.17, 0.24, 0.07, 0.17, { ao: false, faces: 't', room, tint: [0.86, 0.8, 0.62] });
  });
  // el tablero de las llaves, en el muro de poniente: los clavos, las
  // anillas que quedan y los huecos de las que faltan
  wb.box('planks', Vc.x0, YF + 1.25, tz + 1.2, Vc.x0 + 0.05, YF + 1.95, tz + 2.6, { ao: false, room, tint: [0.6, 0.53, 0.46] });
  for (let k = 0; k < 6; k++) {
    const z = tz + 1.35 + k * 0.22;
    wb.box('iron', Vc.x0 + 0.05, YF + 1.6, z - 0.02, Vc.x0 + 0.17, YF + 1.64, z + 0.02, { ao: false, room });
    if (k % 3 !== 1) wb.geometry('iron', new THREE.TorusGeometry(0.05, 0.01, 3, 8), new THREE.Matrix4().compose(V(Vc.x0 + 0.15, YF + 1.5, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI / 2), V(1, 1, 1)), { ao: false, room });
  }
  // los grilletes en el muro de levante y el cepo de los recién llegados
  for (const z of [Vc.z0 + 1.4, Vc.z0 + 2.6]) P.chains(ctx, Vc.x1 - 0.05, YF + 1.9, z, 10, 0);
  P.weaponRack(ctx, Vc.x1 - 0.35, YF, Vc.z1 - 1.6, -Math.PI / 2);
  P.barrel(ctx, Vc.x1 - 0.55, YF, Vc.z0 + 3.8, {});
  P.barrel(ctx, Vc.x1 - 0.6, YF, Vc.z0 + 4.6, { lying: true, rot: 0.4 });
  P.brazier(ctx, xc + 2.3, YF, Vc.z1 - 2.4, { room });
  bakeCorpse(wb, Vc.x1 - 1.2, YF, Vc.z1 - 0.9, -2.3, 'back', 'soldier', 8812);
  P.decal(ctx, Vc.x1 - 1.2, YF + 0.01, Vc.z1 - 1.0, 1.8);
  P.bones(ctx, xc - 1.4, YF, Vc.z0 + 1.5, 5, 8813, 0.5);
  wb.setRoom(null);
  P.wallTorch(ctx, Vc.x0 + 0.02, YF + 2.1, Vc.z1 - 1.5, 'e', { room, radius: 7 });
  P.wallTorch(ctx, BX + 2.4, YF + 2.1, Vc.z0 + 0.02, 's', { room, radius: 6 });
  ctx.rats.push({ x: xc - 2.2, y: YF, z: Vc.z1 - 1.2, n: 2 });
  L.interact.push({ kind: 'note', id: 'n_libro_carcel', note: 'libroCarcel', x: tx + 0.05, y: YF + 0.86, z: tz - 0.2, model: 'book' });
  // lo que rascaba la trampilla, en la escalera; el carcelero que se quedó
  L.enemies.push(
    { type: 'penitent', x: BX, y: bY(-89.2), z: -89.2, yaw: Math.PI, idle: 'pound', id: 'e_carcel_bajada' },
    { type: 'soldier', x: tx + 1.6, y: YF, z: tz + 1.6, yaw: -2.4, idle: 'stand', id: 'e_carcel_guarda' }
  );
}

// ------------------------------------------------------------ la cárcel
// Tres naves sobre dos filas de columnas, con bóvedas de arista y sus
// fajones. En las de los lados, entre columna y columna y hasta la bóveda,
// las rejas de las celdas, con sus puertas, y entre celda y celda otra reja.
// En el tramo de la puerta del aljibe, la nave de levante queda abierta.
function celdas({ ctx, L }) {
  const wb = ctx.wb;
  const H = C.celdas;
  const room = RM.celdas;
  const { xs, zs } = H;
  const { ys, rise } = HS;
  groinVaults(ctx, { xs, zs, ys, rise, mat: 'wallstone', tint: MURO.map((v) => v * 0.8), room, ribs: true, ribMat: 'ashlar', ribTint: SILLA, ribW: 0.34, ribD: 0.2 });
  // el perfil de los fajones (su intradós) entre dos apoyos
  const arco = (a0, a1) => {
    const c = (a0 + a1) / 2,
      hw = (a1 - a0) / 2;
    return (u) => ys + rise * Math.sqrt(Math.max(0, 1 - ((u - c) / hw) ** 2)) - 0.21;
  };
  // las columnas y las pilastras de los muros, bajo cada fajón
  for (const x of [xs[1], xs[2]]) for (let j = 1; j < zs.length - 1; j++) columna(ctx, x, zs[j], YF, ys, room);
  for (const x of [xs[1], xs[2]]) {
    pilaster(ctx, zs[0], x, 's', YF, ys, { room, tint: SILLA, w: 0.5, d: 0.16 });
    pilaster(ctx, zs[5], x, 'n', YF, ys, { room, tint: SILLA, w: 0.5, d: 0.16 });
  }
  for (let j = 1; j < zs.length - 1; j++) {
    pilaster(ctx, xs[0], zs[j], 'e', YF, ys, { room, tint: SILLA, w: 0.5, d: 0.16 });
    pilaster(ctx, xs[3], zs[j], 'w', YF, ys, { room, tint: SILLA, w: 0.5, d: 0.16 });
  }
  // la puerta del aljibe
  const zPa = (zs[H.paso] + zs[H.paso + 1]) / 2;
  puerta(ctx, 'z', zPa, xs[3], C.aljibe.xs[0], [room, RM.aljibe], PA);
  // --- las celdas: lo que hay en cada una (de norte a sur; la de levante del
  // tramo 'paso', sin celda). open: la puerta, abierta (su ángulo) o
  // arrancada; dentro, quién o qué
  const CELDAS = {
    O: [
      { cerrada: true, preso: 'pound' },
      { open: 'suelo', sangre: true },
      { cerrada: true, huesos: true },
      { cerrada: true, preso: 'pound' },
      { open: 1.9, come: true, ampolla: true },
    ],
    E: [{ cerrada: true, preso: 'pray' }, null, { open: -1.7, rayas: true }, { cerrada: true, huesos: true }, { cerrada: true, preso: 'pound' }],
  };
  const pr = new RNG(8820);
  for (const lado of ['O', 'E']) {
    const xf = lado === 'O' ? xs[1] : xs[2],
      xm = lado === 'O' ? xs[0] : xs[3];
    const out = lado === 'O' ? -1 : 1; // hacia dónde queda el fondo de la celda
    const xin = (xf + xm) / 2;
    for (let j = 0; j < 5; j++) {
      const c = CELDAS[lado][j];
      const za = zs[j],
        zb = zs[j + 1];
      // (entre la basa de la columna, o la pilastra del muro, y la de al lado)
      const a0 = za + (j === 0 ? 0.24 : 0.44),
        a1 = zb - (j === 4 ? 0.24 : 0.44);
      const zc = (za + zb) / 2;
      // las rejas de entre celdas: bajo el fajón, de la pilastra del muro a la
      // basa de la columna
      if (j > 0 && (c || CELDAS[lado][j - 1])) {
        const u0 = Math.min(xf, xm) + (lado === 'O' ? 0.24 : 0.44),
          u1 = Math.max(xf, xm) - (lado === 'O' ? 0.44 : 0.24);
        reja(ctx, 'x', za, u0, u1, YF, arco(Math.min(xf, xm), Math.max(xf, xm)), room);
      }
      if (!c) continue;
      // el frente, con su puerta (a un lado)
      const d0 = zc - 0.55,
        d1 = zc + 0.55;
      reja(ctx, 'z', xf, a0, a1, YF, arco(za, zb), room, { door: [d0, d1], open: c.cerrada ? undefined : c.open, where: [xf - out * 1.1, zc + 0.2, 0.3 + pr.range(-0.2, 0.2)] });
      wb.setRoom(room);
      // la paja del suelo, las argollas del muro
      wb.box('straw', Math.min(xin + out * 0.4, xm) + 0.05, YF, za + 0.6, Math.max(xin + out * 0.4, xm) - 0.05, YF + 0.06, zb - 0.6, { ao: false, faces: 'tnsew', room, tint: [0.7, 0.62, 0.45] });
      P.chains(ctx, xm - out * 0.06, YF + 1.8, zc - 0.9, 12, 0);
      if (c.sangre) {
        P.decal(ctx, xin, YF + 0.01, zc, 2.2);
        P.decal(ctx, xf - out * 0.8, YF + 0.012, zc + 0.6, 1.6);
      }
      if (c.huesos) {
        P.skeleton(ctx, xm - out * 0.55, YF + 0.06, zc + 0.3, out > 0 ? -Math.PI / 2 : Math.PI / 2, { mess: 0.35, seed: Math.round(-zc * 13), room });
        P.bones(ctx, xin, YF, zc - 0.8, 4, Math.round(-zc * 7), 0.4);
      }
      if (c.rayas) {
        // las rayas de los días, de cinco en cinco, y encima una campana
        for (let k = 0; k < 11; k++) {
          const z = zc - 0.9 + Math.floor(k / 5) * 0.55 + (k % 5) * 0.08;
          if (k % 5 === 4) wb.box('black', xm - out * 0.012 - 0.002, YF + 1.33, z - 0.36, xm - out * 0.012 + 0.002, YF + 1.36, z, { ao: false, grime: false, faces: out > 0 ? 'w' : 'e', room, tint: [0.4, 0.38, 0.36] });
          else wb.box('black', xm - out * 0.012 - 0.002, YF + 1.18, z - 0.012, xm - out * 0.012 + 0.002, YF + 1.5, z + 0.012, { ao: false, grime: false, faces: out > 0 ? 'w' : 'e', room, tint: [0.4, 0.38, 0.36] });
        }
        P.bones(ctx, xin, YF, zc + 0.9, 3, 8826, 0.3);
        wb.box('clothDark', xin - 0.4, YF + 0.06, zc - 0.2, xin + 0.5, YF + 0.1, zc + 1.0, { ao: false, faces: 'tnsew', room, tint: [0.45, 0.2, 0.18] });
        L.interact.push({ kind: 'examine', id: 'x_celda_rayas', text: 'celdaRayas', x: xin, y: YF, z: zc, r: 1.4 });
      }
      if (c.come) {
        bakeCorpse(wb, xin + out * 0.2, YF + 0.06, zc - 0.4, 1.2, 'curl', 'villager', 8827);
        P.decal(ctx, xin, YF + 0.01, zc - 0.4, 2.0);
        L.enemies.push({ type: 'penitent', x: xin - out * 0.3, y: YF, z: zc + 0.4, yaw: Math.PI, idle: 'eat', id: 'e_carcel_come' });
      }
      if (c.ampolla) L.interact.push({ kind: 'item', id: 'i_ampolla_carcel', item: 'ampolla', x: xm - out * 0.45, y: YF + 0.12, z: zc + 1.4 });
      if (c.preso) {
        // encerrado todavía: contra la reja (o de rodillas en el fondo, de
        // cara a levante, a la Sé)
        const pound = c.preso === 'pound';
        const px = pound ? xf + out * 0.5 : xm - out * 1.0,
          yaw = pound ? (out > 0 ? -Math.PI / 2 : Math.PI / 2) : Math.PI / 2;
        L.enemies.push({ type: 'penitent', x: px, y: YF, z: zc + pr.range(-0.6, 0.6), yaw, idle: c.preso, caged: true, id: `e_preso_${lado}${j}` });
      }
      wb.setRoom(null);
    }
  }
  // lo de la nave: la puerta arrancada de una celda ya está en el suelo; un
  // cubo, la parihuela de los muertos, un caído
  wb.setRoom(room);
  const xc = (xs[1] + xs[2]) / 2;
  {
    const hx = xc + 1.4,
      hz = zs[3] + 1.2;
    for (const s of [-1, 1]) wb.box('wooddark', hx + s * 0.3 - 0.03, YF + 0.32, hz - 1.1, hx + s * 0.3 + 0.03, YF + 0.38, hz + 1.1, { ao: false, room });
    for (const s of [-1, 1]) for (const t of [-0.75, 0.75]) wb.box('wooddark', hx + s * 0.3 - 0.03, YF, hz + t - 0.03, hx + s * 0.3 + 0.03, YF + 0.32, hz + t + 0.03, { ao: false, room });
    wb.box('burlap', hx - 0.3, YF + 0.36, hz - 0.85, hx + 0.3, YF + 0.4, hz + 0.85, { ao: false, faces: 'tnsew', room, tint: [0.7, 0.62, 0.5] });
    P.ellipsoid(ctx, 'shroud', hx, YF + 0.52, hz + 0.05, 0.24, 0.14, 0.85, [0.8, 0.78, 0.72], { room });
    ctx.col.add(hx - 0.36, YF, hz - 1.1, hx + 0.36, YF + 0.6, hz + 1.1);
  }
  bakeCorpse(wb, xc - 1.1, YF, zs[1] + 1.4, 0.7, 'face', 'soldier', 8828);
  P.decal(ctx, xc - 1.1, YF + 0.01, zs[1] + 1.4, 1.8);
  for (const [bx, bz] of [
    [xc + 1.7, zs[4] + 2.6],
    [xc + 2.0, zs[4] + 2.2],
  ]) {
    wb.cylinder('planks', bx, YF, bz, 0.19, 0.16, 0.32, 8, { ao: false, capTop: true, room });
    wb.cylinder('iron', bx, YF + 0.06, bz, 0.188, 0.186, 0.03, 8, { ao: false, room });
  }
  P.bones(ctx, xc + 0.6, YF, zs[2] + 1.0, 5, 8829, 0.6);
  wb.setRoom(null);
  // la luz: antorchas en las columnas de la nave y una corona de hierro
  for (const [x, z, d] of [
    [xs[2] - 0.3, zs[1], 'w'],
    [xs[1] + 0.3, zs[2], 'e'],
    [xs[2] - 0.3, zs[4], 'w'],
    [xs[1] + 0.3, zs[4], 'e'],
  ])
    P.wallTorch(ctx, x, YF + 2.0, z, d, { room, radius: 6.5 });
  P.hangingLamp(ctx, xc, crown(HS) - 0.1, (zs[1] + zs[2]) / 2, { room, len: 1.9, radius: 7 });
  ctx.rats.push({ x: xs[0] + 1.6, y: YF, z: zs[2] + 1.5, n: 2 }, { x: xs[3] - 1.4, y: YF, z: zs[3] + 2.0, n: 1 });
  // el que acecha en la bóveda de la nave
  L.enemies.push({ type: 'crawler', x: xc, y: YF, z: (zs[2] + zs[3]) / 2, yaw: Math.PI, idle: 'ceiling', id: 'e_carcel_techo' });
}

// ------------------------------------------------------------ el aljibe del palacio
// Cuatro naves de cuatro tramos de bóvedas de arista sobre columnas que salen
// del agua; el andén, a poniente, con su pretil, de la puerta de la cárcel a
// la del paso del sur; la escalera que baja al agua, contra el muro del
// norte; en la clave de un tramo, el óculo por el que baja la luz del brocal
// del patio. Está a la mitad, como el del castillo.
function aljibe({ ctx, L }) {
  const wb = ctx.wb;
  const A = C.aljibe;
  const room = RM.aljibe;
  wb.setRoom(room);
  const { xs, zs } = A;
  const { ys, rise } = AS;
  const x0 = xs[0],
    x1 = xs[4],
    z0 = zs[0],
    z1 = zs[4];
  const [pi, pj] = A.pozo;
  const shaftTop = -0.65;
  groinVaults(ctx, { xs, zs, ys, rise, mat: 'ashlar', tint: [0.5, 0.52, 0.5], room, ribs: true, ribMat: 'ashlar', ribTint: CAPI, ribW: 0.36, ribD: 0.2, oculi: [{ i: pi, j: pj, k: 2, top: shaftTop, mat: 'wallstone', tint: [0.42, 0.44, 0.42] }] });
  const W2 = { x: (xs[pi] + xs[pi + 1]) / 2, z: (zs[pj] + zs[pj + 1]) / 2 };
  {
    // (la boca de arriba del tiro: a oscuras, la noche del patio)
    const hx = (xs[pi + 1] - xs[pi]) / 4,
      hz = (zs[pj + 1] - zs[pj]) / 4;
    wb.box('black', W2.x - hx, shaftTop - 0.02, W2.z - hz, W2.x + hx, shaftTop, W2.z + hz, { faces: 'b', ao: false, grime: false, room });
  }
  // las columnas, que salen del agua: basa (bajo el agua), fuste, capitel y
  // ábaco; en el fuste, la franja verdosa de lo que ha bajado el agua
  for (let i = 1; i < 4; i++)
    for (let j = 1; j < 4; j++) {
      const x = xs[i],
        z = zs[j];
      columna(ctx, x, z, A.fondo, ys, room, { tint: ALJ, basa: 0.45 });
      const yb = A.fondo + 0.45,
        yc = ys - 0.45;
      const k = (y) => 0.29 - (0.03 * (y - yb)) / (yc - yb) + 0.006;
      wb.cylinder('mossstone', x, A.agua - 0.05, z, k(A.agua), k(A.lleno), A.lleno - A.agua + 0.05, 8, { ao: false, room, tint: MARCA });
    }
  // pilastras en los muros bajo cada fajón (en el estanque, desde el fondo y
  // con la marca del agua); en el muro del norte, donde baja la escalera,
  // ménsulas
  const pil = (line, a, dir, wet) => {
    pilaster(ctx, line, a, dir, wet ? A.fondo : YF, ys, { room, tint: ALJ, w: 0.5, d: 0.15 });
    if (!wet) return;
    const sg = dir === 'n' || dir === 'w' ? -1 : 1;
    const q0 = line,
      q1 = line + sg * 0.162;
    const f = dir + (dir === 'n' || dir === 's' ? 'ew' : 'ns');
    if (dir === 'n' || dir === 's') wb.box('mossstone', a - 0.262, A.agua - 0.05, Math.min(q0, q1), a + 0.262, A.lleno, Math.max(q0, q1), { faces: f, ao: false, room, tint: MARCA });
    else wb.box('mossstone', Math.min(q0, q1), A.agua - 0.05, a - 0.262, Math.max(q0, q1), A.lleno, a + 0.262, { faces: f, ao: false, room, tint: MARCA });
  };
  for (let i = 1; i < 4; i++) {
    pil(z1, xs[i], 'n', true);
    wb.box('ashlar', xs[i] - 0.3, ys - 0.26, z0, xs[i] + 0.3, ys, z0 + 0.24, { ao: false, faces: 'bsew', room, tint: CAPI });
    wb.box('ashlar', xs[i] - 0.22, ys - 0.5, z0, xs[i] + 0.22, ys - 0.26, z0 + 0.13, { ao: false, faces: 'bsew', room, tint: ALJ });
  }
  for (let j = 1; j < 4; j++) {
    pil(x0, zs[j], 'e', false);
    pil(x1, zs[j], 'w', true);
  }
  // el agua, a la mitad, con la luz del óculo
  if (ctx.waters) ctx.waters.push({ shape: 'rect', r: [A.anden + 0.02, z0 + 0.02, x1 - 0.02, z1 - 0.02], y: A.agua, light: [W2.x, ys + rise, W2.z], lightK: 0.9, sky: 0x1c2228, spot: [W2.x + 0.2, W2.z + 0.15, 1.0, 0.7] });
  // la marca del lleno en los muros del estanque, de cara al agua
  const band = (bx0, bz0, bx1, bz1, f) => wb.box('mossstone', bx0, A.agua - 0.05, bz0, bx1, A.lleno, bz1, { faces: f, ao: false, room, tint: MARCA });
  band(A.anden, z0, x1, z0 + 0.012, 's');
  band(A.anden, z1 - 0.012, x1, z1, 'n');
  band(x1 - 0.012, z0, x1, z1, 'w');
  // la escalera que baja del andén al agua, pegada al muro del norte, con su
  // pretil escalonado del lado del agua; se pierde en el agua negra
  const SW = 1.4,
    sn = 9,
    srise = (YF - A.fondo) / sn,
    srun = 0.34;
  const sx1 = A.anden + sn * srun;
  stairs(ctx, sx1, A.fondo, z0 + SW / 2, 'w', SW, sn, srise, srun, 'ashlar', { solidBelow: true });
  for (let i = 0; i < sn; i++) {
    const xa = sx1 - srun * (i + 1),
      xb = sx1 - srun * i,
      top = A.fondo + srise * (i + 1);
    solid(ctx, 'ashlar', xa, top, z0 + SW, xb, top + 0.85, z0 + SW + 0.2, { room, tint: ALJ, ao: false, faces: 'tnsew' });
  }
  // el pretil del andén, de la escalera a la puerta del sur, con su albardilla
  // (en el andén: su cara del agua sigue la del borde)
  const PH = 0.9,
    pz0 = z0 + SW;
  solid(ctx, 'ashlar', A.anden - 0.3, YF, pz0, A.anden, YF + PH, z1, { sub: 2, ao: false, faces: 'wne', room, tint: ALJ });
  wb.box('ashlar', A.anden - 0.35, YF + PH, pz0 - 0.05, A.anden + 0.05, YF + PH + 0.12, z1, { ao: false, faces: 'tewnb', room, tint: CAPI });
  // que nadie se meta en el agua (la cámara sí pasa por encima): todo el
  // estanque salvo la escalera, que se baja hasta el último peldaño seco
  const dry = A.anden + srun * (Math.floor((YF - A.agua) / srise) + 1) - 0.05;
  for (const r of subtractRects([A.anden, z0, x1, z1], [[A.anden, z0, dry, z0 + SW]])) blocker(ctx, r[0], A.fondo, r[1], r[2], ys, r[3]);
  // la luz del brocal: el haz que baja por el óculo y su luz pálida
  if (ctx.shafts) ctx.shafts.push({ a: [W2.x, shaftTop, W2.z], b: [W2.x + 0.3, A.agua, W2.z + 0.2], w: 1.3, color: 0xb8c8e0 });
  if (ctx.lights) ctx.lights.push({ x: W2.x, y: A.agua + 1.6, z: W2.z, r: 0.55, g: 0.66, b: 0.85, radius: 9, intensity: 0.9, room });
  // la soga del brocal, cortada, colgando del óculo
  wb.box('burlap', W2.x - 0.012, A.agua + 1.4, W2.z - 0.012, W2.x + 0.012, shaftTop, W2.z + 0.012, { ao: false, room, tint: [0.8, 0.7, 0.55] });
  // el caño por el que entra el agua del patio, en el muro de levante
  {
    const cz = (zs[1] + zs[2]) / 2,
      cy = ys - 0.35;
    wb.box('ashlar', x1 - 0.34, cy - 0.2, cz - 0.16, x1, cy, cz + 0.16, { ao: false, faces: 'tnswb', room, tint: CAPI });
    wb.box('black', x1 - 0.345, cy - 0.15, cz - 0.07, x1 - 0.34, cy - 0.05, cz + 0.07, { ao: false, faces: 'w', grime: false, room });
    wb.box('mossstone', x1 - 0.006, A.lleno, cz - 0.22, x1 - 0.003, cy - 0.2, cz + 0.22, { ao: false, faces: 'w', room, tint: MARCA });
  }
  // en el andén: los cubos, un tonel, el ballestero caído con sus virotes; en
  // el agua, boca abajo, un amortajado
  for (const [bx, bz] of [
    [x0 + 0.35, z1 - 1.2],
    [x0 + 0.7, z1 - 0.75],
  ]) {
    wb.cylinder('planks', bx, YF, bz, 0.19, 0.16, 0.32, 8, { ao: false, capTop: true, room });
    wb.cylinder('iron', bx, YF + 0.06, bz, 0.188, 0.186, 0.03, 8, { ao: false, room });
  }
  P.barrel(ctx, x0 + 0.55, YF, z0 + 0.5, {});
  const bxz = [x0 + 1.4, (zs[2] + zs[3]) / 2 + 0.6];
  bakeCorpse(wb, bxz[0], YF, bxz[1], 0.4, 'back', 'soldier', 8831);
  P.decal(ctx, bxz[0], YF + 0.01, bxz[1], 1.8);
  P.ellipsoid(ctx, 'shroud', (xs[2] + xs[3]) / 2, A.agua + 0.02, (zs[1] + zs[2]) / 2, 0.82, 0.11, 0.25, [0.36, 0.34, 0.3], { room });
  P.ellipsoid(ctx, 'shroud', (xs[2] + xs[3]) / 2 + 0.8, A.agua + 0.03, (zs[1] + zs[2]) / 2 + 0.05, 0.15, 0.1, 0.14, [0.36, 0.34, 0.3], { room });
  wb.setRoom(null);
  // (entre pilastra y pilastra del muro de poniente)
  P.wallTorch(ctx, x0, YF + 2.2, (zs[1] + zs[2]) / 2, 'e', { room, radius: 7 });
  P.wallTorch(ctx, x0, YF + 2.2, (zs[3] + zs[4]) / 2, 'e', { room, radius: 7 });
  L.interact.push(
    { kind: 'item', id: 'i_virotes_aljibe', item: 'virote', n: 4, x: bxz[0] + 0.7, y: YF + 0.05, z: bxz[1] - 0.3 },
    { kind: 'examine', id: 'x_aljibe_palacio', text: 'aljibePalacio', x: A.anden - 0.5, y: YF, z: W2.z, r: 1.8 }
  );
  // el Campanero, en el andén
  L.enemies.push({ type: 'bell', x: (x0 + A.anden) / 2, y: YF, z: zs[2] - 0.6, yaw: Math.PI, idle: 'stand', id: 'e_aljibe_palacio' });
}

// ------------------------------------------------------------ los pasos
// Los dos pasos del eje: del aljibe al cuarto de los verdugos (con las dos
// celdas de castigo) y de él a la capilla de los reos, por debajo del foso de
// la puerta (ahí rezuma la bóveda). Cañón de medio punto con sus fajones y
// una portada de arco en cada boca.
function celdasDeCastigo(holes) {
  const ex = C.eje,
    pw = C.paso;
  const out = [];
  // en el paso del aljibe, una a cada lado (huecos hasta el suelo), entre
  // fajón y fajón (los pasos llevan uno cada cuarto de su largo)
  const zA = C.aljibe.zs[4],
    zE = C.verdugos.z0;
  for (const [side, z] of [
    [-1, zA + (zE - zA) * (3 / 8)],
    [1, zA + (zE - zA) * (5 / 8)],
  ]) {
    const line = ex + (side * pw) / 2;
    holes.push({ plane: 'x', line, a0: z - 0.6, a1: z + 0.6, y0: YF, y1: YF + 1.9 });
    out.push({ line, side, z, a0: z - 0.6, a1: z + 0.6, depth: 1.0 });
  }
  return out;
}

function pasos({ ctx, L }, nichos) {
  const wb = ctx.wb;
  const ex = C.eje,
    pw = C.paso;
  const p0 = ex - pw / 2,
    p1 = ex + pw / 2;
  const A = C.aljibe,
    E = C.verdugos,
    Ca = C.capilla;
  const tr = [
    { room: RM.paso, z0: A.zs[4], z1: E.z0, rIn: RM.aljibe, rOut: RM.verdugos, topIn: crown(AS) - 0.6, topOut: crown(ES) - 0.6 },
    { room: RM.foso, z0: E.z1, z1: Ca.z0, rIn: RM.verdugos, rOut: RM.capilla, topIn: crown(ES) - 0.6, topOut: crown(LS) - 0.8 },
  ];
  for (const t of tr) {
    barrelVault(ctx, { x0: p0, x1: p1, z0: t.z0, z1: t.z1, axis: 'z', ys: PS.ys, mat: 'wallstone', tint: MURO.map((v) => v * 0.8), room: t.room });
    // las portadas de las dos bocas
    portada(ctx, 'z', t.z0, ex, pw, YF, PS.ys, t.topIn, 1, [t.rIn, t.room]);
    portada(ctx, 'z', t.z1, ex, pw, YF, PS.ys, t.topOut, -1, [t.room, t.rOut]);
    // fajones sobre pilastras, uno cada cuarto del paso (las celdas de
    // castigo, entre ellos)
    const n = 4;
    for (let k = 1; k < n; k++) {
      const z = t.z0 + ((t.z1 - t.z0) * k) / n;
      if (nichos.some((q) => Math.abs(q.z - z) < 0.9)) continue;
      archRing(ctx, { axis: 'x', c: ex, w: pw - 0.36, y0: PS.ys, rise: (pw - 0.36) / 2, ring: 0.28, t0: z - 0.22, t1: z + 0.22, mat: 'ashlar', room: t.room, tint: SILLA, proud: 0.02 });
      pilaster(ctx, p0, z, 'e', YF, PS.ys, { room: t.room, tint: SILLA });
      pilaster(ctx, p1, z, 'w', YF, PS.ys, { room: t.room, tint: SILLA });
    }
  }
  // las celdas de castigo: su hondura en la roca, la reja con su candado y lo
  // que queda dentro
  {
    const room = RM.paso;
    wb.setRoom(room);
    for (const q of nichos) {
      const sg = q.side,
        back = q.line + sg * q.depth;
      const xa = Math.min(q.line, back),
        xb = Math.max(q.line, back);
      // (el fondo, los lados, el suelo y el techo)
      if (sg > 0) wb.box('wallstone', back, YF, q.a0, back + 0.1, YF + 1.9, q.a1, { faces: 'w', room, tint: MURO.map((v) => v * 0.8), sub: 1.2 });
      else wb.box('wallstone', back - 0.1, YF, q.a0, back, YF + 1.9, q.a1, { faces: 'e', room, tint: MURO.map((v) => v * 0.8), sub: 1.2 });
      wb.box('wallstone', xa, YF, q.a0 - 0.3, xb, YF + 1.9, q.a0, { faces: 's', room, tint: MURO.map((v) => v * 0.85), sub: 1.2 });
      wb.box('wallstone', xa, YF, q.a1, xb, YF + 1.9, q.a1 + 0.3, { faces: 'n', room, tint: MURO.map((v) => v * 0.85), sub: 1.2 });
      wb.box('flag', xa, YF - 0.3, q.a0, xb, YF, q.a1, { faces: 't', ao: false, room, tint: MURO });
      wb.box('wallstone', xa, YF + 1.9, q.a0, xb, YF + 2.2, q.a1, { faces: 'b', ao: false, room, tint: MURO.map((v) => v * 0.7) });
      ctx.col.add(xa, YF - 1, q.a0, xb, YF, q.a1);
      // la reja, en la cara del muro
      for (let z = q.a0 + 0.1; z < q.a1 - 0.05; z += 0.2) wb.box('iron', q.line - 0.02, YF, z - 0.025, q.line + 0.04, YF + 1.88, z + 0.025, { ao: false, room });
      for (const yy of [YF + 0.12, YF + 1.15, YF + 1.78]) wb.box('iron', q.line - 0.04, yy, q.a0, q.line + 0.06, yy + 0.06, q.a1, { ao: false, room });
      wb.box('iron', q.line - sg * 0.1, YF + 1.0, q.z + 0.3, q.line - sg * 0.04, YF + 1.14, q.z + 0.42, { ao: false, room });
      ctx.col.add(q.line - 0.05, YF, q.a0, q.line + 0.05, YF + 1.9, q.a1);
      const xc = (xa + xb) / 2;
      P.bones(ctx, xc, YF, q.z, 7, Math.round(-q.z * 7), 0.3);
      P.skullRow(ctx, xc, YF, q.z + 0.15, sg > 0 ? -Math.PI / 2 : Math.PI / 2, 1, { room, seed: Math.round(-q.z) });
      for (let k = 0; k < 7; k++) wb.box('iron', back - sg * 0.06, YF + 1.3 - k * 0.12, q.z - 0.4, back, YF + 1.4 - k * 0.12, q.z - 0.34, { ao: false, room });
    }
    // un muerto en el paso, a medio arrastrar
    bakeCorpse(wb, ex + 0.3, YF, (C.aljibe.zs[4] + C.verdugos.z0) / 2 + 2.2, 0.2, 'face', 'villager', 8841);
    P.decal(ctx, ex + 0.3, YF + 0.01, (C.aljibe.zs[4] + C.verdugos.z0) / 2 + 2.6, 2.4, 'splat', 0.3);
    wb.setRoom(null);
    // (enfrente de la celda de castigo de poniente, entre fajón y fajón)
    P.wallTorch(ctx, p1, YF + 2.0, nichos[0].z, 'w', { room, radius: 6 });
  }
  // bajo el foso: la bóveda rezuma (el verdín, los charcos, lo que gotea)
  {
    const room = RM.foso;
    wb.setRoom(room);
    const Fo = FORT.puerta.foso;
    const za = Math.max(E.z1, Fo.z0),
      zb = Math.min(Ca.z0, Fo.z1);
    // (el verdín, por lo alto de la bóveda: un arco del mismo centro, dos
    // centímetros por debajo de ella, sin imposta)
    {
      const R = pw / 2 - 0.05,
        dy = 0.5;
      const h = Math.sqrt(R * R - dy * dy);
      barrelVault(ctx, { x0: p0, x1: p1, z0: za + 0.4, z1: zb - 0.4, axis: 'z', ys: PS.ys + dy, inset: pw / 2 - h, rise: R - dy, mat: 'mossstone', tint: MARCA.map((v) => v * 1.5), room, impost: false, cam: false });
    }
    // (y en el suelo, el verdín donde gotea)
    for (const [z, s] of [
      [(za + zb) / 2 + 0.4, 1.3],
      [za + 0.7, 0.9],
    ])
      wb.box('mossstone', ex - s / 2, YF + 0.004, z - s * 0.6, ex + s / 2, YF + 0.012, z + s * 0.6, { faces: 't', ao: false, room, tint: MARCA.map((v) => v * 1.3) });
    P.weeds(ctx, p0 + 0.25, YF, za + 1.5, 3, 8842, 0.3, [0.28, 0.34, 0.22]);
    wb.setRoom(null);
    P.wallTorch(ctx, p1, YF + 2.0, zb + 2.6, 'w', { room, radius: 6 });
    ctx.rats.push({ x: ex, y: YF, z: zb + 3.5, n: 2 });
    L.interact.push({ kind: 'examine', id: 'x_paso_foso', text: 'pasoFoso', x: ex, y: YF, z: (za + zb) / 2, r: 1.6 });
  }
}

// ------------------------------------------------------------ el cuarto de los verdugos
// Un cañón rebajado sobre dos fajones. El tajo con el hacha, la espada de la
// justicia del Rey colgada en el muro, las capuchas en sus clavos, la mesa de
// los hierros, el cepo; en el suelo, el olvidadero: un pozo tapado con su
// reja, y abajo, huesos.
function verdugos({ ctx, L }) {
  const wb = ctx.wb;
  const E = C.verdugos;
  const room = RM.verdugos;
  const ex = C.eje;
  const { ys, rise } = ES;
  barrelVault(ctx, { x0: E.x0, x1: E.x1, z0: E.z0, z1: E.z1, axis: 'z', ys, rise, mat: 'wallstone', tint: MURO.map((v) => v * 0.78), room });
  const w = E.x1 - E.x0;
  for (let k = 1; k < 3; k++) {
    const z = E.z0 + ((E.z1 - E.z0) * k) / 3;
    archRing(ctx, { axis: 'x', c: ex, w: w - 0.36, y0: ys, rise: rise - 0.04, ring: 0.3, t0: z - 0.24, t1: z + 0.24, mat: 'ashlar', room, tint: SILLA, proud: 0.02 });
    pilaster(ctx, E.x0, z, 'e', YF, ys, { room, tint: SILLA, w: 0.55 });
    pilaster(ctx, E.x1, z, 'w', YF, ys, { room, tint: SILLA, w: 0.55 });
  }
  // el suelo, con el olvidadero: su brocal a ras, la reja y el pozo
  const O = { x: E.x0 + 1.7, z: E.z0 + 2.4, r: 0.75 };
  const sq = [O.x - O.r - 0.25, O.z - O.r - 0.25, O.x + O.r + 0.25, O.z + O.r + 0.25];
  for (const r of subtractRects([E.x0, E.z0, E.x1, E.z1], [sq])) wb.box('flag', r[0], YF - 0.3, r[1], r[2], YF, r[3], { faces: 't', ao: false, room, uv: 0.6, tint: MURO.map((v) => v * 1.12) });
  ctx.col.add(E.x0, YF - 1, E.z0, E.x1, YF, E.z1);
  {
    // (dieciséis tramos: los rincones de la losa caen en los rayos de 45°)
    const seg = 16,
      ri = O.r,
      hs = O.r + 0.25;
    const yb = YF - 2.6;
    wb.setRoom(room);
    // la losa del brocal, de un sillar, a ras del suelo: del pozo al cuadrado
    // (cada rayo, del aro al borde de la losa), y la pared del pozo
    const sqAt = (a) => {
      const c = Math.cos(a),
        s = Math.sin(a);
      const k = hs / Math.max(Math.abs(c), Math.abs(s));
      return V(O.x + c * k, YF, O.z + s * k);
    };
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2,
        a1 = ((i + 1) / seg) * Math.PI * 2;
      const pa = V(O.x + Math.cos(a0) * ri, YF, O.z + Math.sin(a0) * ri),
        pb = V(O.x + Math.cos(a1) * ri, YF, O.z + Math.sin(a1) * ri);
      wb.quad('ashlar', sqAt(a0), pa, pb, sqAt(a1), { ao: false, tint: SILLA, room });
      wb.quad('wallstone', pb, pa, V(pa.x, yb, pa.z), V(pb.x, yb, pb.z), { ao: false, tint: MURO.map((v) => v * 0.6), room, sub: 1.2 });
    }
    wb.cylinder('flag', O.x, yb - 0.1, O.z, ri, ri, 0.1, seg, { capTop: true, ao: false, room, tint: [0.3, 0.28, 0.26] });
    P.bones(ctx, O.x, yb, O.z, 8, 8851, 0.4);
    P.skeleton(ctx, O.x - 0.3, yb, O.z + 0.1, 0.4, { mess: 0.5, seed: 8852, room });
    // la reja: sus barrotes, que apoyan en la losa, y dos pletinas encima
    for (let k = -3; k <= 3; k++) {
      const hw = Math.sqrt(Math.max(0, ri * ri - (k * 0.21) ** 2)) + 0.12;
      wb.box('iron', O.x + k * 0.21 - 0.03, YF, O.z - hw, O.x + k * 0.21 + 0.03, YF + 0.04, O.z + hw, { ao: false, room });
    }
    for (const dz of [-0.35, 0.35]) wb.box('iron', O.x - ri - 0.1, YF + 0.04, O.z + dz - 0.03, O.x + ri + 0.1, YF + 0.07, O.z + dz + 0.03, { ao: false, room });
    wb.setRoom(null);
    L.interact.push({ kind: 'examine', id: 'x_olvidadero', text: 'olvidadero', x: O.x + 1.1, y: YF, z: O.z, r: 1.5 });
  }
  wb.setRoom(room);
  // el tajo con el hacha y el serrín; la cesta
  {
    const tx = ex + 1.0,
      tz = (E.z0 + E.z1) / 2 + 0.6;
    wb.cylinder('wooddark', tx, YF, tz, 0.42, 0.45, 0.62, 10, { capTop: true, room, tint: [0.5, 0.36, 0.3] });
    wb.cylinder('flesh', tx, YF + 0.62, tz, 0.4, 0.4, 0.008, 10, { capTop: true, ao: false, room, tint: [0.32, 0.12, 0.1] });
    ctx.col.add(tx - 0.42, YF, tz - 0.42, tx + 0.42, YF + 0.62, tz + 0.42);
    // el hacha, clavada de canto en el tajo
    beam3(ctx, 'wooddark', V(tx - 0.05, YF + 0.66, tz + 0.05), V(tx + 0.55, YF + 1.3, tz + 0.4), 0.05, { room });
    wb.at(tx - 0.02, YF + 0.62, tz + 0.06, 0.6, () => {
      wb.box('iron', -0.04, 0, -0.16, 0.04, 0.22, 0.2, { ao: false, room, tint: [0.62, 0.6, 0.58] });
    });
    P.decal(ctx, tx, YF + 0.01, tz, 2.6);
    for (let k = 0; k < 6; k++) wb.box('straw', tx - 0.9 + k * 0.25, YF, tz + 0.7 + (k % 2) * 0.2, tx - 0.75 + k * 0.25, YF + 0.03, tz + 0.95 + (k % 2) * 0.2, { ao: false, room, tint: [0.75, 0.62, 0.42] });
    P.basket(ctx, tx + 0.9, YF, tz - 0.5, { room });
    L.interact.push({ kind: 'examine', id: 'x_tajo', text: 'tajoVerdugo', x: tx - 0.9, y: YF, z: tz, r: 1.5 });
  }
  // la espada de la justicia del Rey, ancha y sin punta, en sus dos ganchos
  // del muro de levante, y las capuchas negras en sus clavos
  {
    const x = E.x1 - 0.02,
      z = E.z0 + 2.2;
    for (const dz of [-0.45, 0.45]) wb.box('iron', x - 0.12, YF + 1.6, z + dz - 0.02, x, YF + 1.64, z + dz + 0.02, { ao: false, room });
    wb.box('iron', x - 0.1, YF + 1.6, z - 0.75, x - 0.08, YF + 1.68, z + 0.55, { ao: false, room, tint: [0.78, 0.76, 0.74] });
    wb.box('iron', x - 0.11, YF + 1.66, z - 0.75, x - 0.07, YF + 1.69, z + 0.55, { ao: false, room, tint: [0.62, 0.6, 0.58] });
    wb.box('iron', x - 0.13, YF + 1.5, z + 0.55, x - 0.05, YF + 1.82, z + 0.6, { ao: false, room, tint: [0.4, 0.38, 0.36] });
    wb.box('leather', x - 0.11, YF + 1.6, z + 0.6, x - 0.07, YF + 1.7, z + 0.92, { ao: false, room, tint: [0.3, 0.2, 0.16] });
    wb.cylinder('iron', x - 0.09, YF + 1.65, z + 0.95, 0.05, 0.05, 0.03, 6, { ao: false, room });
    for (let k = 0; k < 3; k++) {
      const zz = z + 2.8 + k * 0.5;
      wb.box('iron', x - 0.1, YF + 1.95, zz - 0.015, x, YF + 1.98, zz + 0.015, { ao: false, room });
      P.ellipsoid(ctx, 'clothDark', x - 0.14, YF + 1.72, zz, 0.12, 0.26, 0.13, [0.18, 0.16, 0.16], { room });
    }
  }
  // la mesa de los hierros (tenazas, garfios, el hierro de marcar) y el cepo
  {
    const tz = E.z1 - 2.6;
    P.table(ctx, E.x1 - 0.8, YF, tz, 1.4, 0.7, Math.PI / 2);
    for (const [dz, l] of [
      [-0.4, 0.34],
      [-0.1, 0.28],
      [0.25, 0.4],
    ])
      wb.box('iron', E.x1 - 0.95, YF + 0.8, tz + dz - l / 2, E.x1 - 0.92, YF + 0.83, tz + dz + l / 2, { ao: false, room });
    P.brazier(ctx, E.x1 - 1.0, YF, tz - 1.6, { room, radius: 7 });
    // el cepo: la tabla partida con sus agujeros, sobre sus dos pies
    const cx = E.x0 + 0.9,
      cz = E.z1 - 3.2;
    for (const s of [-1, 1]) wb.box('wooddark', cx - 0.08, YF, cz + s * 0.9 - 0.08, cx + 0.08, YF + 0.6, cz + s * 0.9 + 0.08, { ao: false, room });
    wb.box('planks', cx - 0.07, YF + 0.42, cz - 1.0, cx + 0.07, YF + 0.75, cz + 1.0, { ao: false, faces: 'tnsewb', room, tint: [0.55, 0.45, 0.38] });
    for (const dz of [-0.55, 0, 0.55]) wb.box('black', cx - 0.085, YF + 0.5, cz + dz - 0.08, cx + 0.085, YF + 0.62, cz + dz + 0.08, { ao: false, grime: false, faces: 'ew', room });
    ctx.col.add(cx - 0.1, YF, cz - 1.0, cx + 0.1, YF + 0.75, cz + 1.0);
    P.stool(ctx, E.x0 + 1.5, YF, E.z1 - 1.4, { room });
  }
  P.chains(ctx, E.x0 + 0.05, YF + 2.1, E.z0 + 5.0, 12, 0);
  P.bones(ctx, ex - 1.2, YF, E.z1 - 1.2, 5, 8853, 0.5);
  wb.setRoom(null);
  P.wallTorch(ctx, E.x0 + 0.02, YF + 2.1, (E.z0 + E.z1) / 2, 'e', { room, radius: 7 });
  // el verdugo del Rey, que no ha soltado el oficio
  L.enemies.push({ type: 'soldier', x: ex + 0.3, y: YF, z: (E.z0 + E.z1) / 2 - 1.2, yaw: Math.PI, idle: 'stand', id: 'e_verdugo' });
}

// ------------------------------------------------------------ la capilla de los reos
// Una bóveda de arista de muro a muro. Contra el muro de poniente, el altar
// de los reos, con su crucifijo y sus velas, en el eje de la subida al
// rastrillo: es lo que se ve desde la mazmorra del castillo, entre los
// barrotes. Los que quedan rezan de espaldas a él, vueltos hacia levante.
function capilla({ ctx, L }) {
  const wb = ctx.wb;
  const Ca = C.capilla;
  const room = RM.capilla;
  const { ys, rise } = LS;
  groinVaults(ctx, { xs: [Ca.x0, Ca.x1], zs: [Ca.z0, Ca.z1], ys, rise, mat: 'wallstone', tint: MURO.map((v) => v * 0.82), room, n: 12, m: 6 });
  for (const [x, z, sx, sz] of [
    [Ca.x0, Ca.z0, 1, 1],
    [Ca.x1, Ca.z0, -1, 1],
    [Ca.x0, Ca.z1, 1, -1],
    [Ca.x1, Ca.z1, -1, -1],
  ]) {
    const xa = Math.min(x, x + sx * 0.45),
      xb = Math.max(x, x + sx * 0.45),
      za = Math.min(z, z + sz * 0.45),
      zb = Math.max(z, z + sz * 0.45);
    wb.box('ashlar', xa, YF, za, xb, ys - 0.16, zb, { ao: false, faces: (sx > 0 ? 'e' : 'w') + (sz > 0 ? 's' : 'n'), room, tint: SILLA, sub: 2 });
    wb.box('ashlar', xa - (sx < 0 ? 0.08 : 0), ys - 0.16, za - (sz < 0 ? 0.08 : 0), xb + (sx > 0 ? 0.08 : 0), ys, zb + (sz > 0 ? 0.08 : 0), { ao: false, faces: 'b' + (sx > 0 ? 'e' : 'w') + (sz > 0 ? 's' : 'n'), room, tint: CAPI });
    ctx.col.add(xa, YF, za, xb, ys, zb);
  }
  wb.setRoom(room);
  const zc = RA.z;
  // el altar: la grada, la mesa de piedra sobre su pie, el crucifijo y las
  // velas; detrás, en el muro, la cruz pintada a la cal
  {
    const ax = Ca.x0;
    solid(ctx, 'ashlar', ax, YF, zc - 1.3, ax + 1.4, YF + 0.2, zc + 1.3, { faces: 'tnse', room, tint: SILLA, sub: 2 });
    solid(ctx, 'ashlar', ax + 0.1, YF + 0.2, zc - 0.65, ax + 0.75, YF + 1.02, zc + 0.65, { faces: 'tnse', room, tint: SILLA });
    wb.box('ashlar', ax + 0.04, YF + 1.02, zc - 0.85, ax + 0.9, YF + 1.12, zc + 0.85, { ao: false, faces: 'tnsewb', room, tint: CAPI });
    wb.box('linen', ax + 0.1, YF + 1.12, zc - 0.8, ax + 0.86, YF + 1.13, zc + 0.8, { ao: false, faces: 't', room, tint: [0.62, 0.6, 0.54] });
    wb.box('linen', ax + 0.86, YF + 0.7, zc - 0.8, ax + 0.87, YF + 1.12, zc + 0.8, { ao: false, faces: 'e', room, tint: [0.62, 0.6, 0.54] });
    // el crucifijo de madera
    wb.box('wooddark', ax + 0.3, YF + 1.13, zc - 0.05, ax + 0.4, YF + 2.2, zc + 0.05, { ao: false, room });
    wb.box('wooddark', ax + 0.3, YF + 1.85, zc - 0.36, ax + 0.4, YF + 1.94, zc + 0.36, { ao: false, room });
    P.ellipsoid(ctx, 'bone', ax + 0.43, YF + 1.6, zc, 0.04, 0.28, 0.06, [0.85, 0.78, 0.62], { room });
    P.ellipsoid(ctx, 'bone', ax + 0.43, YF + 1.92, zc, 0.04, 0.05, 0.3, [0.85, 0.78, 0.62], { room });
    P.candles(ctx, ax + 0.6, YF + 1.12, zc - 0.55, 3, 8861, { room, radius: 5.5, intensity: 1.0, spread: 0.08 });
    P.candles(ctx, ax + 0.6, YF + 1.12, zc + 0.55, 3, 8862, { room, radius: 5.5, intensity: 1.0, spread: 0.08 });
    // los dos candeleros de pie, a los lados de la grada (su luz es la que se
    // ve desde el rastrillo, al fondo de la escalera)
    for (const s of [-1, 1]) {
      P.candelabra(ctx, ax + 0.75, YF + 0.2, zc + s * 1.05, { room });
      ctx.col.add(ax + 0.55, YF + 0.2, zc + s * 1.05 - 0.2, ax + 0.95, YF + 1.5, zc + s * 1.05 + 0.2);
    }
    // (la cruz a la cal: el palo, partido donde lo cruza el travesaño, para
    // que no se monten)
    const cal = { ao: false, faces: 'e', room, tint: [0.92, 0.9, 0.84] };
    wb.box('plaster', ax, YF + 2.4, zc - 0.08, ax + 0.008, YF + 2.95, zc + 0.08, cal);
    wb.box('plaster', ax, YF + 3.03, zc - 0.08, ax + 0.008, YF + 3.35, zc + 0.08, cal);
    wb.box('plaster', ax, YF + 2.95, zc - 0.32, ax + 0.008, YF + 3.03, zc + 0.32, cal);
    L.interact.push({ kind: 'examine', id: 'x_altar_reos', text: 'altarReos', x: ax + 1.9, y: YF, z: zc + 1.4, r: 1.6 });
  }
  // los bancos de los reos, de cara al altar (ellos rezan de espaldas)
  for (const [x, z] of [
    [Ca.x0 + 2.9, zc - 1.6],
    [Ca.x0 + 2.9, zc + 1.6],
  ])
    P.bench(ctx, x, YF, z, 1.8, Math.PI / 2);
  P.chains(ctx, Ca.x0 + 0.05, YF + 2.0, Ca.z0 + 1.2, 10, 0);
  P.chains(ctx, Ca.x1 - 0.05, YF + 2.0, Ca.z1 - 1.0, 10, 0);
  bakeCorpse(wb, Ca.x1 - 1.4, YF, Ca.z0 + 1.0, 2.6, 'curl', 'villager', 8863);
  P.decal(ctx, Ca.x1 - 1.4, YF + 0.01, Ca.z0 + 1.0, 1.8);
  wb.setRoom(null);
  P.wallTorch(ctx, (Ca.x0 + Ca.x1) / 2 + 1.6, YF + 2.2, Ca.z1, 'n', { room, radius: 7 });
  // los reos que quedan: dos de rodillas, de espaldas al altar, y uno que
  // anda (lo que se mueve, visto desde el rastrillo)
  L.enemies.push(
    { type: 'penitent', x: Ca.x0 + 3.5, y: YF, z: zc - 0.7, yaw: Math.PI / 2, idle: 'pray', id: 'e_reo1' },
    { type: 'penitent', x: Ca.x0 + 3.2, y: YF, z: zc + 0.9, yaw: Math.PI / 2 - 0.2, idle: 'pray', id: 'e_reo2' },
    { type: 'penitent', x: (Ca.x0 + Ca.x1) / 2, y: YF, z: zc + 0.4, yaw: -Math.PI / 2, idle: 'wander', id: 'e_reo3' }
  );
}

// ------------------------------------------------------------ la subida y el rastrillo
// De la capilla sube una escalera recta, bajo su bóveda en rampa, al rellano
// del rastrillo, a la altura de la mazmorra del castillo. En el muro del
// norte del rellano, la palanca; enfrente, sentado contra el muro, el
// carcelero mayor, con su farol y lo último que escribió. El rastrillo corre
// por las ranuras de las jambas del paso y se mete en la fábrica de encima.
function subida({ ctx, L }) {
  const wb = ctx.wb;
  const room = RM.rastrillo;
  wb.setRoom(room);
  stairs(ctx, SU.x0, YF, RA.z, 'e', RA.w, SU.n, sRise, sRun, 'wallstone', { solidBelow: true });
  const ys0 = YF + hS,
    ys1 = YC + hS;
  for (const [line, dir] of [
    [SZ0, 's'],
    [SZ1, 'n'],
  ])
    caraRampa(wb, 'wallstone', dir, line, [
      [SU.x0, YF - 0.5, ys0],
      [SU.x1, YF - 0.5, ys1],
    ], { room, tint: MURO, sub: 1.6, aoH: 1.2, baseY: YF });
  rampVault(ctx, { axis: 'x', x0: SU.x0, x1: SU.x1, z0: SZ0, z1: SZ1, ys0, ys1, rise: rS, mat: 'wallstone', tint: MURO.map((v) => v * 0.82), room, camStep: 0.25 });
  // la boca de abajo, en la capilla (la rosca, metida en el paso: su cara, a
  // ras del muro de la capilla)
  archRing(ctx, { axis: 'z', c: RA.z, w: RA.w - 0.06, y0: ys0, rise: rS, ring: 0.26, t0: SU.x0, t1: SU.x0 + 0.3, top: ys0 + rS + 0.7, clip: [SZ0, SZ1], mat: 'ashlar', spMat: 'wallstone', rooms: [RM.capilla, room], tint: SILLA, spTint: MURO, proud: 0.025 });
  // el rellano: su cañón, que sigue al de la subida
  const Rl = C.rellano;
  barrelVault(ctx, { x0: Rl.x0, x1: Rl.x1, z0: SZ0, z1: SZ1, axis: 'x', ys: RL.ys, rise: RL.rise, mat: 'wallstone', tint: MURO.map((v) => v * 0.82), room });
  // el paso del rastrillo: las ranuras de las jambas, del suelo y del dintel
  for (const [z, f] of [
    [SZ0, 's'],
    [SZ1 - 0.012, 'n'],
  ])
    wb.box('black', RA.x - 0.06, YC, z, RA.x + 0.06, YC + RA.h, z + 0.012, { faces: f, ao: false, grime: false, room });
  wb.box('black', RA.x - 0.06, YC + 0.001, SZ0 + 0.08, RA.x + 0.06, YC + 0.012, SZ1 - 0.08, { faces: 't', ao: false, grime: false, room });
  wb.box('black', RA.x - 0.06, YC + RA.h - 0.012, SZ0, RA.x + 0.06, YC + RA.h - 0.001, SZ1, { faces: 'b', ao: false, grime: false, room });
  // la palanca, en el muro del norte del rellano
  const lx = (Rl.x0 + Rl.x1) / 2;
  placaPalanca(ctx, lx, YC, SZ0, 0, 1, room);
  // el carcelero mayor, sentado de cara a ella, con su libro; encima, la
  // antorcha que encendió (es la luz que se ve desde el pasillo de las celdas)
  bakeCorpse(wb, lx + 0.05, YC, SZ1 - 0.42, Math.PI, 'sit', 'soldier', 8871);
  wb.setRoom(null);
  P.wallTorch(ctx, Rl.x1 - 0.35, YC + 2.0, SZ1, 'n', { room, radius: 5, dyn: 2.4 });
  P.wallTorch(ctx, (SU.x0 + SU.x1) / 2 - 0.4, sY((SU.x0 + SU.x1) / 2 - 0.4) + 1.6, SZ0, 's', { room, radius: 5.5, dyn: 2 });
  L.interact.push(
    { kind: 'door', id: 'd_rastrillo_carcel', x: RA.x, y: YC, z: RA.z, w: RA.w, h: RA.h, lift: RA.h - 0.1, axis: 'z', mat: 'grate', lock: { type: 'lever', msg: 'rastrilloCarcel' }, say: 'rastrilloCarcelSube', lit: true },
    { kind: 'lever', id: 'p_rastrillo_carcel', label: 'Subir el rastrillo', x: lx, y: YC, z: SZ0 + 0.45, nx: 0, nz: 1, gate: 'd_rastrillo_carcel', quick: true, r: 1.5 },
    { kind: 'note', id: 'n_carcelero_mayor', note: 'carceleroMayor', x: lx + 0.55, y: YC + 0.02, z: SZ1 - 0.35, model: 'book' }
  );
}

// ------------------------------------------------------------ zonas y mapa
function zonas(L) {
  const H = C.celdas,
    A = C.aljibe,
    Vc = C.carceleros,
    E = C.verdugos,
    Ca = C.capilla,
    B = C.bajada;
  const ex = C.eje,
    pw = C.paso;
  const yb = YF - 1.2,
    yt = -1;
  const z = (id, rects, atmo = 'prison') => L.zones.push({ id, rects, atmo, room: id });
  z(RM.bajada, [[B.x0, B.z0, B.x1, B.z1, YF - 0.5, -0.6]]);
  z(RM.carceleros, [[Vc.x0, Vc.z0, Vc.x1, Vc.z1, yb, yt]]);
  z(RM.celdas, [[H.xs[0], Vc.z1, H.xs[3], H.zs[5], yb, yt]]);
  z(RM.aljibe, [[H.xs[3], A.zs[0], A.xs[4], A.zs[4], A.fondo - 0.5, yt]], 'crypt');
  z(RM.paso, [[ex - pw / 2 - 1.1, A.zs[4], ex + pw / 2 + 1.1, E.z0, yb, yt]]);
  z(RM.verdugos, [[E.x0, E.z0, E.x1, E.z1, yb - 2, yt]]);
  z(RM.foso, [[ex - pw / 2, E.z1, ex + pw / 2, Ca.z0, yb, yt]]);
  z(RM.capilla, [[Ca.x0, Ca.z0, Ca.x1, Ca.z1, yb, yt]]);
  z(RM.rastrillo, [[C.subida.x0, C.rastrillo.z - C.rastrillo.w / 2, C.rastrillo.x1, C.rastrillo.z + C.rastrillo.w / 2, yb, yt]]);
  const m = (id, r) => L.map.push({ id, r, level: 'dungeon' });
  m(RM.bajada, [B.x0, B.hueco, B.x1, B.z1]);
  m(RM.carceleros, [Vc.x0, Vc.z0, Vc.x1, Vc.z1]);
  m(RM.celdas, [H.xs[0], H.zs[0], H.xs[3], H.zs[5]]);
  m(RM.aljibe, [A.xs[0], A.zs[0], A.xs[4], A.zs[4]]);
  m(RM.paso, [ex - pw / 2, A.zs[4], ex + pw / 2, E.z0]);
  m(RM.verdugos, [E.x0, E.z0, E.x1, E.z1]);
  m(RM.foso, [ex - pw / 2, E.z1, ex + pw / 2, Ca.z0]);
  m(RM.capilla, [Ca.x0, Ca.z0, Ca.x1, Ca.z1]);
  m(RM.rastrillo, [C.subida.x0, C.rastrillo.z - C.rastrillo.w / 2, C.rastrillo.x1, C.rastrillo.z + C.rastrillo.w / 2]);
}
