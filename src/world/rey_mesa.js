// La mesa del Rey, en la sala del alcaide (torre del homenaje, planta
// segunda): la mesa de juego con el tablero del Cerco, el sitial de respaldo
// alto donde espera sentado, el banco para quien juega con él, sus velas, su
// copa y el brasero. Las piezas se mueven (game/cerco/board.js); el tablero,
// el sitial y lo demás se hornean aquí, con la luz de la sala.
//
// El tablero se ve desde el banco, al norte: la fila 0 es la del lado del Rey
// (al sur) y la columna 0 queda a la izquierda de quien se sienta en el banco
// (al este, +x).
import * as P from './props.js';

// el suelo de la planta segunda (CASTLE.keep.F2: aquí escrito, que
// level_castle.js importa este módulo)
const F2 = 9;
const TX = -78.55,
  TZ = -17.35;

export const REY_MESA = {
  // la mesa (su centro) y su tamaño
  table: { x: TX, z: TZ, w: 1.25, d: 1.0, top: F2 + 0.8 },
  // el tablero: el centro de su cara de arriba y el lado de una casilla
  board: { x: TX, y: F2 + 0.835, z: TZ, sq: 0.066, frame: 0.035 },
  // el sitial del Rey (el centro del asiento; mira al norte, al tablero)
  seat: { x: TX, y: F2, z: TZ + 0.74, yaw: Math.PI, h: 0.47 },
  // el banco de quien juega con él
  bench: { x: TX, y: F2, z: TZ - 0.84, h: 0.48 },
  // dónde se dejan los muertos: los tuyos, a la derecha del Rey (al este:
  // los coge él); los suyos, a tu derecha (al oeste). Dos filas de nueve,
  // a lo largo del tablero
  trays: { def: { x: TX + 0.4, z0: TZ + 0.22, dz: -0.055, dx: 0.06 }, att: { x: TX - 0.4, z0: TZ - 0.22, dz: 0.055, dx: -0.06 } },
};

// La casilla (fila, columna) en el mundo (centro, a ras del tablero).
export function squareWorld(r, c, out = { x: 0, y: 0, z: 0 }) {
  const B = REY_MESA.board;
  out.x = B.x + (4 - c) * B.sq;
  out.y = B.y;
  out.z = B.z + (4 - r) * B.sq;
  return out;
}

export function buildReyMesa(ctx, room) {
  const wb = ctx.wb;
  const T = REY_MESA.table,
    B = REY_MESA.board,
    S = REY_MESA.seat;
  const y = F2;
  wb.setRoom(room);
  P.table(ctx, T.x, y, T.z, T.w, T.d, 0);

  // --- el tablero: un tablón grueso con su marco, las afueras en madera
  // clara, el campo en oscura, las juntas en negro y el trono taraceado
  const half = 4.5 * B.sq + B.frame;
  const yb = T.top;
  wb.box('wooddark', B.x - half, yb, B.z - half, B.x + half, B.y, B.z + half, { ao: false, faces: 'tnsew', tint: [0.86, 0.72, 0.6], uv: 0.9 });
  const yi = B.y + 0.0012;
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      const x = B.x + (4 - c) * B.sq,
        z = B.z + (4 - r) * B.sq;
      const edge = r === 0 || c === 0 || r === 8 || c === 8;
      const throne = r === 4 && c === 4;
      const h = B.sq / 2 - 0.002;
      if (throne) wb.box('bone', x - h, B.y, z - h, x + h, yi, z + h, { ao: false, faces: 't', tint: [0.94, 0.86, 0.66], grime: false });
      else wb.box(edge ? 'planks' : 'wooddark', x - h, B.y, z - h, x + h, yi, z + h, { ao: false, faces: 't', tint: edge ? [1.25, 1.12, 0.92] : [0.62, 0.5, 0.42], uv: 1.4, grime: false });
    }
  // las juntas
  for (let k = 0; k <= 9; k++) {
    const u = (k - 4.5) * B.sq;
    wb.box('black', B.x - 4.5 * B.sq - 0.002, yi, B.z + u - 0.0018, B.x + 4.5 * B.sq + 0.002, yi + 0.0006, B.z + u + 0.0018, { ao: false, faces: 't', grime: false });
    wb.box('black', B.x + u - 0.0018, yi, B.z - 4.5 * B.sq - 0.002, B.x + u + 0.0018, yi + 0.0006, B.z + 4.5 * B.sq + 0.002, { ao: false, faces: 't', grime: false });
  }
  // el trono: una cruz de oro en el marfil, y una torre en cada esquina del
  // marco (las cuatro esquinas de la muralla)
  {
    const a = B.sq * 0.34,
      w = B.sq * 0.07;
    wb.box('gold', B.x - a, yi, B.z - w, B.x + a, yi + 0.0008, B.z + w, { ao: false, faces: 't', grime: false });
    wb.box('gold', B.x - w, yi, B.z - a, B.x + w, yi + 0.0008, B.z + a, { ao: false, faces: 't', grime: false });
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const cx = B.x + sx * (half - B.frame / 2),
          cz = B.z + sz * (half - B.frame / 2);
        wb.box('bone', cx - 0.012, B.y, cz - 0.012, cx + 0.012, B.y + 0.006, cz + 0.012, { ao: false, faces: 'tnsew', tint: [0.9, 0.82, 0.64], grime: false });
      }
  }

  // --- el sitial del Rey: asiento con su cojín, brazos, y un respaldo alto
  // rematado con las armas del rey (la cruz azul en campo blanco)
  wb.at(S.x, y, S.z, S.yaw, () => {
    const sh = S.h;
    // (girado: aquí +z es hacia la mesa, -z hacia el respaldo)
    for (const [sx, sz] of [
      [-1, 1],
      [1, 1],
    ])
      wb.box('wooddark', sx * 0.27 - 0.035, 0, sz * 0.23 - 0.035, sx * 0.27 + 0.035, 0.74, sz * 0.23 + 0.035, { ao: false });
    for (const sx of [-1, 1]) wb.box('wooddark', sx * 0.27 - 0.04, 0, -0.29, sx * 0.27 + 0.04, 1.8, -0.21, { ao: false, faces: 'tnsew' });
    wb.box('wooddark', -0.3, sh - 0.06, -0.26, 0.3, sh, 0.26, { ao: false, faces: 'tnsewb' });
    wb.box('clothRed', -0.25, sh, -0.22, 0.25, sh + 0.05, 0.23, { ao: false, faces: 'tnsew', tint: [0.62, 0.38, 0.34] });
    // los brazos
    for (const sx of [-1, 1]) wb.box('wooddark', sx * 0.27 - 0.045, 0.72, -0.25, sx * 0.27 + 0.045, 0.77, 0.27, { ao: false, faces: 'tnsewb' });
    // el respaldo y su remate
    wb.box('wooddark', -0.24, sh, -0.27, 0.24, 1.72, -0.23, { ao: false, faces: 'tnsewb', tint: [0.8, 0.66, 0.56] });
    wb.box('wooddark', -0.33, 1.72, -0.3, 0.33, 1.8, -0.2, { ao: false, faces: 'tnsewb' });
    // (por encima de su cabeza)
    wb.box('clothWhite', -0.1, 1.46, -0.226, 0.1, 1.68, -0.224, { ao: false, faces: 's', tint: [0.9, 0.86, 0.78] });
    wb.box('clothBlue', -0.02, 1.48, -0.2238, 0.02, 1.66, -0.2232, { ao: false, faces: 's' });
    wb.box('clothBlue', -0.08, 1.58, -0.2238, 0.08, 1.61, -0.2232, { ao: false, faces: 's' });
    // los travesaños de las patas
    wb.box('wooddark', -0.24, 0.12, 0.2, 0.24, 0.16, 0.26, { ao: false });
    wb.box('wooddark', -0.24, 0.12, -0.27, 0.24, 0.16, -0.21, { ao: false });
  });
  P.colOBB(ctx, S.x, S.z + 0.02, 0.33, 0.3, 0, y, y + 1.8);
  // el banco de quien juega
  P.bench(ctx, REY_MESA.bench.x, y, REY_MESA.bench.z, 1.4, 0);
  P.colOBB(ctx, REY_MESA.bench.x, REY_MESA.bench.z, 0.7, 0.18, 0, y, y + 0.48);

  // --- sobre la mesa: las velas, su copa, el pergamino de las reglas (del
  // lado del banco) y un pan que no ha tocado
  const top = T.top;
  P.candles(ctx, T.x + 0.53, top, T.z + 0.38, 3, 6101, { room, radius: 3, intensity: 0.5, spread: 0.05 });
  P.candles(ctx, T.x - 0.54, top, T.z - 0.39, 2, 6102, { room, radius: 2.5, intensity: 0.4, spread: 0.04 });
  // la copa, a su izquierda
  {
    const cx = T.x - 0.54,
      cz = T.z + 0.38;
    wb.cylinder('gold', cx, top, cz, 0.032, 0.025, 0.012, 8, { ao: false, capTop: true });
    wb.cylinder('gold', cx, top + 0.012, cz, 0.008, 0.008, 0.07, 6, { ao: false });
    wb.cylinder('gold', cx, top + 0.082, cz, 0.018, 0.038, 0.06, 8, { ao: false, capBot: true });
    wb.cylinder('lacquer', cx, top + 0.13, cz, 0.033, 0.033, 0.001, 8, { ao: false, capTop: true });
  }
  // el pergamino de las reglas, enrollado a medias, de tu lado
  wb.at(T.x - 0.17, top, T.z - 0.425, 0.06, () => {
    wb.box('clothWhite', -0.1, 0, -0.05, 0.1, 0.004, 0.05, { ao: false, faces: 'tnsew', tint: [0.86, 0.76, 0.56] });
    wb.push();
    wb.translate(0, 0.012, 0.05);
    wb.rotateZ(Math.PI / 2);
    wb.cylinder('clothWhite', 0, -0.1, 0, 0.012, 0.012, 0.2, 6, { ao: false, capTop: true, capBot: true, tint: [0.84, 0.74, 0.54] });
    wb.pop();
  });
  // el pan, sin tocar
  wb.cylinder('straw', T.x + 0.53, top, T.z - 0.37, 0.05, 0.04, 0.035, 7, { ao: false, capTop: true, tint: [0.75, 0.5, 0.3] });
  // un brasero pequeño, de bronce, a su lado: para el frío que ya no se le va
  {
    const bx = S.x + 1.05,
      bz = S.z + 0.35;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      wb.box('iron', bx + Math.cos(a) * 0.17 - 0.02, y, bz + Math.sin(a) * 0.17 - 0.02, bx + Math.cos(a) * 0.17 + 0.02, y + 0.32, bz + Math.sin(a) * 0.17 + 0.02, { ao: false });
    }
    wb.cylinder('bronze', bx, y + 0.3, bz, 0.13, 0.25, 0.16, 9, { ao: false, capBot: true });
    wb.cylinder('ember', bx, y + 0.44, bz, 0.22, 0.22, 0.015, 9, { ao: false, capTop: true, grime: false });
    if (ctx.fires) ctx.fires.push({ x: bx, y: y + 0.45, z: bz, s: 0.3, light: false, embers: true, glow: true });
    ctx.lights.push({ x: bx, y: y + 0.9, z: bz, r: 1, g: 0.45, b: 0.16, radius: 3.2, intensity: 0.55, room });
    P.colOBB(ctx, bx, bz, 0.26, 0.26, 0, y, y + 0.48);
  }
  wb.setRoom(null);
}
