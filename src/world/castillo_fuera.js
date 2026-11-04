// El castillo por fuera (PLAN_CASTILLO.md, §2 y §11: fase 5): lo que se ve
// desde la ciudad. Las murallas del sur, de levante y de poniente, que no se
// andan, suben a CASTLE.wallH2 (la del norte sigue a la altura de la coracha)
// y las torres de las esquinas a CASTLE.towerH (level_castle.js: buildWalls);
// aquí, lo demás: las dos torres nuevas en medio de los lienzos largos, los
// cadalsos de madera en lo alto de las de levante, la barbacana ante la
// puerta (el arco que cierra la boca de la calle del Soto), la brecha que abrió
// un tiro de los trabucos en la muralla del sur, tapada con una empalizada, y
// los estandartes negros de la guarnición.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, merlons, archedWall, tower } from './builders.js';
import * as P from './props.js';
import { slit } from './level_castle.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// Cara plana de cuatro puntos, vuelta hacia 'dir' (sea cual sea su orden).
function cara(wb, mat, a, b, c, d, dir, o) {
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a));
  if (n.dot(dir) >= 0) wb.quad(mat, a, b, c, d, o);
  else wb.quad(mat, d, c, b, a, o);
}

// Las medidas: las torres nuevas (de x0 a x1, de z0 a z1: asoman por fuera del
// lienzo y por dentro quedan a ras de su cara), la barbacana (el arco, de x0 a
// x1, entre las casas de la boca de la calle, de z0 a z1; su vano y su alto) y
// la brecha (en la muralla del sur, de x0 a x1, hasta y).
export const FUERA = {
  torres: [
    { x0: -79, x1: -73, z0: 20.3, z1: 26, out: 's' },
    { x0: -128, x1: -122, z0: -9, z1: -3, out: 'w' },
  ],
  barbacana: { x0: -44.8, x1: -43.4, z0: -3.5, z1: 3.5, h: 9.2, w: 3.2, ah: 4.0 },
  brecha: { x0: -64.2, x1: -59.4, y: 6.6 },
};

export function buildCastilloFuera(ctx, S, L, CASTLE) {
  torres(ctx, CASTLE);
  cadalsos(ctx, CASTLE);
  barbacana(ctx, L);
  brecha(ctx, CASTLE);
}

// ------------------------------------------------------------------------ las torres nuevas
// Macizas (no se entra), con su cornisa, sus almenas, sus saeteras y su
// estandarte negro, colgado por fuera.
function torres(ctx, CASTLE) {
  const h = CASTLE.towerH;
  for (const T of FUERA.torres) {
    const cx = (T.x0 + T.x1) / 2,
      cz = (T.z0 + T.z1) / 2,
      w = T.x1 - T.x0;
    tower(ctx, cx, cz, w, h, { slits: false });
    // (las saeteras, sólo en las tres caras de fuera)
    for (let y = 3.6; y < h - 2.5; y += 3.6) {
      if (T.out === 's') {
        slit(ctx, cx, y, T.z1, 's');
        slit(ctx, T.x0, y, cz + 1.2, 'w');
        slit(ctx, T.x1, y, cz + 1.2, 'e');
      } else {
        slit(ctx, T.x0, y, cz, 'w');
        slit(ctx, cx - 1.2, y, T.z0, 'n');
        slit(ctx, cx - 1.2, y, T.z1, 's');
      }
    }
    if (T.out === 's') P.banner(ctx, cx, h - 1.6, T.z1 + 0.32, 0, 'bannerBlack', 1.5, 4.4);
    else P.banner(ctx, T.x0 - 0.32, h - 1.6, cz, -Math.PI / 2, 'bannerBlack', 1.5, 4.4);
  }
}

// ------------------------------------------------------------------------ los cadalsos
// Galerías de madera colgadas por fuera de lo alto de las torres, sobre sus
// canes: el suelo de tablas (con sus buhederas), la pared de tablones con sus
// troneras y el tejadillo a un agua contra las almenas. En las torres de
// levante, que dan a la ciudad; las del norte se las llevó el asedio (quedan
// sus canes: level_castle.js).
function cadalsos(ctx, CASTLE) {
  const h = CASTLE.towerH;
  const tw = 6;
  // [la torre (su centro), las caras de fuera]
  for (const [tx, tz, faces] of [
    [-49.5, 21.5, ['e', 's']],
    [-49.5, -21.5, ['e']],
  ])
    for (const f of faces) hoarding(ctx, tx, tz, tw, h, f);
}

function hoarding(ctx, tx, tz, w, h, face) {
  const wb = ctx.wb;
  const d = 1.15,
    yF = h - 2.3,
    yW = h - 0.45,
    yR = h + 0.9;
  const tint = [0.55, 0.47, 0.4];
  // (a lo largo de la cara: de a0 a a1; hacia fuera, de t0 a t1)
  const half = w / 2 + 0.3;
  const along = face === 'n' || face === 's';
  const sg = face === 's' || face === 'e' ? 1 : -1;
  const t0 = (along ? tz : tx) + sg * (w / 2 + 0.3),
    t1 = t0 + sg * d;
  const a0 = (along ? tx : tz) - half,
    a1 = (along ? tx : tz) + half;
  const box = (u0, y0, v0, u1, y1, v1, mat, o) => {
    const [ta, tb] = [Math.min(v0, v1), Math.max(v0, v1)];
    if (along) wb.box(mat, u0, y0, ta, u1, y1, tb, o);
    else wb.box(mat, ta, y0, u0, tb, y1, u1, o);
  };
  const o = { ao: false, tint };
  // el suelo, con sus buhederas (huecos entre tablas)
  for (let u = a0; u < a1 - 0.05; u += 0.9) box(u, yF - 0.1, t0, Math.min(a1, u + 0.62), yF, t1, 'planks', { ...o, faces: 'tnsewb' });
  // los canes que lo sostienen, saliendo del muro
  // (no en los extremos: en la esquina se cruzarían con los de la otra cara)
  for (let u = a0 + 0.3; u < a1 - 0.4; u += 1.2) box(u - 0.09, yF - 0.42, t0 - sg * 0.6, u + 0.09, yF - 0.1, t1 + sg * 0.12, 'wooddark', { ...o, faces: 'tnsewb' });
  // la pared de tablones (con troneras) y los dos costados
  // (los costados, de la torre a la pared, sin pisarla)
  for (let u = a0; u < a1 - 0.05; u += 0.75) {
    const gap = Math.round((u - a0) / 0.75) % 3 === 1;
    const ub = Math.min(a1, u + 0.75);
    box(u, yF, t1 - sg * 0.08, ub, gap ? yF + 0.9 : yW, t1, 'planks', { ...o, faces: 'tnsewb' });
    if (gap) box(u, yF + 1.35, t1 - sg * 0.08, ub, yW, t1, 'planks', { ...o, faces: 'tnsewb' });
  }
  for (const u of [a0, a1 - 0.08]) box(u, yF, t0, u + 0.08, yW, t1 - sg * 0.08, 'planks', { ...o, faces: 'tnsewb' });
  // el tejadillo, de las almenas al borde
  const p = (u, y, t) => (along ? V(u, y, t) : V(t, y, u));
  const q = [p(a0, yR, t0 - sg * 0.2), p(a1, yR, t0 - sg * 0.2), p(a1, yW + 0.15, t1 + sg * 0.25), p(a0, yW + 0.15, t1 + sg * 0.25)];
  const out = along ? V(0, 0, sg) : V(sg, 0, 0);
  cara(wb, 'roof', q[0], q[1], q[2], q[3], V(out.x, 1, out.z), { ao: false, sub: 2 });
  const r = q.map((v) => v.clone().add(V(0, -0.08, 0)));
  cara(wb, 'wooddark', r[0], r[1], r[2], r[3], V(-out.x, -1, -out.z), { ao: false, tint: [0.42, 0.38, 0.34] });
}

// ------------------------------------------------------------------------ la barbacana
// La boca de la calle del Soto, ante la torre-puerta, cerrada con un muro
// entre las casas de los dos lados y su arco: la puerta de fuera. Almenado,
// con su matacán sobre el arco; la hoja de fuera, arrancada, contra la casa.
function barbacana(ctx, L) {
  const wb = ctx.wb;
  const B = FUERA.barbacana;
  const tint = [0.86, 0.84, 0.8];
  const cz = (B.z0 + B.z1) / 2;
  archedWall(ctx, { axis: 'z', a0: B.z0, a1: B.z1, t0: B.x0, t1: B.x1, y0: 0, y1: B.h, openings: [{ c: cz, w: B.w, h: B.ah - B.w / 2, rise: B.w / 2, ring: 0.3 }], mat: 'wallstone', tint, rooms: ['out', 'out'], sub: 2.2, endLo: true, endHi: true });
  wb.box('wallstone', B.x0 - 0.25, B.h - 0.4, B.z0 + 0.02, B.x1 + 0.25, B.h, B.z1 - 0.02, { ao: false, faces: 'tnsewb', mats: { t: 'flag' }, tint });
  merlons(ctx, B.x0 + 0.2, B.z0 + 0.2, B.x0 + 0.2, B.z1 - 0.2, B.h, { collide: false, w: 0.7, gap: 0.55, t: 0.4 });
  merlons(ctx, B.x1 - 0.2, B.z0 + 0.2, B.x1 - 0.2, B.z1 - 0.2, B.h, { collide: false, w: 0.7, gap: 0.55, t: 0.4 });
  // el matacán sobre el arco, por fuera (hacia la calle)
  const m0 = cz - 1.9,
    m1 = cz + 1.9;
  wb.box('wallstone', B.x1, B.h - 2.6, m0, B.x1 + 0.7, B.h + 0.2, m1, { sub: 2, faces: 'tnsewb', tint });
  for (let z = m0 + 0.35; z < m1; z += 0.8) {
    wb.box('ashlar', B.x1, B.h - 3.2, z - 0.16, B.x1 + 0.45, B.h - 2.6, z + 0.16, { ao: false });
    wb.box('black', B.x1 + 0.2, B.h - 2.62, z + 0.2, B.x1 + 0.62, B.h - 2.6, z + 0.6, { ao: false, faces: 'b', grime: false });
  }
  // las armas del Rey, labradas sobre el arco, y una saetera a cada lado
  wb.box('ashlar', B.x1, B.ah + 0.6, cz - 0.42, B.x1 + 0.06, B.ah + 1.6, cz + 0.42, { ao: false, faces: 'tnsewb', tint: [0.78, 0.76, 0.72] });
  wb.box('clothBlue', B.x1 + 0.06, B.ah + 0.75, cz - 0.06, B.x1 + 0.08, B.ah + 1.45, cz + 0.06, { ao: false, faces: 'e' });
  wb.box('clothBlue', B.x1 + 0.06, B.ah + 1.04, cz - 0.3, B.x1 + 0.08, B.ah + 1.16, cz + 0.3, { ao: false, faces: 'e' });
  for (const z of [B.z0 + 0.9, B.z1 - 0.9]) slit(ctx, B.x1, 4.6, z, 'e', 1.3);
  // la hoja de fuera, arrancada de sus goznes y tirada contra la casa
  wb.at(B.x1 + 0.7, 0, B.z1 - 0.35, 0.18, () => {
    wb.push();
    wb.rotateZ(-0.12);
    wb.box('planks', -0.08, 0, -1.6, 0.04, 2.9, 0, { ao: false, faces: 'tnsewb', tint: [0.58, 0.5, 0.42] });
    for (const y of [0.5, 1.4, 2.3]) wb.box('iron', 0.04, y, -1.55, 0.07, y + 0.08, -0.05, { ao: false });
    wb.pop();
  });
  ctx.col.add(B.x1 + 0.5, 0, B.z1 - 2.0, B.x1 + 1.1, 2.6, B.z1 - 0.3);
}

// ------------------------------------------------------------------------ la brecha
// En la muralla del sur, el boquete que abrió un bolo de los trabucos: el
// lienzo, partido hasta media altura (level_castle.js deja el hueco), con los
// sillares sueltos en los bordes, el cascajo al pie por fuera y, cerrándolo,
// una empalizada de troncos apuntalada por dentro.
function brecha(ctx, CASTLE) {
  const wb = ctx.wb;
  const Bx = FUERA.brecha;
  const H2 = CASTLE.wallH2;
  const z0 = 20,
    z1 = 23;
  const rng = new RNG(8401);
  // los bordes rotos: sillares sueltos y desmoronados a los dos lados
  for (const [x, s] of [
    [Bx.x0, 1],
    [Bx.x1, -1],
  ])
    for (let i = 0; i < 5; i++) {
      const z = z0 + 0.3 + i * 0.55;
      const hh = rng.range(0.6, 2.6),
        dd = rng.range(0.25, 0.7);
      wb.box('wallstone', s > 0 ? x : x - dd, H2 - hh, z, s > 0 ? x + dd : x, H2 - rng.range(0, 0.3), z + 0.5, { ao: false, sub: 2 });
    }
  for (let i = 0; i < 7; i++) P.roughStone(ctx, rng.range(Bx.x0 + 0.3, Bx.x1 - 0.3), Bx.y, rng.range(z0 + 0.3, z1 - 0.3), rng.range(0.25, 0.45), 8410 + i, { block: true, mat: 'wallstone', sink: 0.1 });
  // la empalizada: troncos de pie, apuntados, con su travesaño, del lomo de la
  // brecha hasta la altura del adarve
  const zp = z0 + 0.9;
  for (let x = Bx.x0 + 0.12; x < Bx.x1 - 0.1; x += 0.3) {
    const top = H2 + rng.range(-0.4, 0.3);
    wb.cylinder('wooddark', x, Bx.y - 0.2, zp, 0.14, 0.13, top - Bx.y + 0.2, 6, { ao: false, tint: [0.5, 0.42, 0.34] });
    wb.cylinder('wooddark', x, top, zp, 0.13, 0.01, 0.35, 6, { ao: false, tint: [0.5, 0.42, 0.34] });
  }
  for (const y of [Bx.y + 0.8, H2 - 0.9]) wb.box('wooddark', Bx.x0, y, zp - 0.24, Bx.x1, y + 0.18, zp - 0.12, { ao: false, faces: 'tnsewb', tint: [0.45, 0.38, 0.32] });
  ctx.col.add(Bx.x0, Bx.y - 0.2, zp - 0.3, Bx.x1, H2 + 0.3, zp + 0.15);
  // el cascajo al pie, por fuera, y los bolos que lo hicieron
  P.rubble(ctx, (Bx.x0 + Bx.x1) / 2, 0, z1 + 1.4, 14, 8420, 2.2, { mat: 'wallstone', scale: 1.4, blocks: 0.7 });
  P.siegeStone(ctx, Bx.x1 + 1.2, 0, z1 + 2.6, 0.62);
}
