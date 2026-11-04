// El jardín del Rey (PLAN_FORTALEZA.md, §5.11 y fase 4): la terraza entre la
// fortaleza y la muralla norte, que rodea la torre del homenaje por el norte.
// Se baja a él por la puerta de la torre de la reina.
//
// Al oeste, el jardín de la reina: un crucero de andenes enlosados con la
// fuente seca en medio, los cuatro arriates de borde de ladrillo con sus
// naranjos secos y sus arrayanes muertos, los poyos, y el emparrado sin hojas
// sobre el andén de la puerta. Al norte de la torre, la alberca larga, vacía
// (el agua se la llevaron al aljibe para el asedio; abajo, en el légamo seco,
// cae el Caballero de la Orden). Al este, el pomar de naranjos secos, el
// palomar (sin palomas: en lo alto anida el cuervo cebado), el colmenar
// contra la torre de la coracha y el vivero de los peces. Contra la muralla,
// la escalera del adarve, y en el adarve, el mirador del Rey: un balcón
// cubierto, volado sobre sus canes, desde el que se ve el campamento de los
// sitiadores.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, blocker, stairs, merlons, cityWall } from './builders.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';
import { palo } from './barrio_atrezo.js';
import { FORT } from './fortaleza_medidas.js';
import { PIEDRA, cara } from './fortaleza_atrezo.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);
const J = FORT.jardin;
const LADRILLO = [0.74, 0.52, 0.42];
const MADERA = [0.6, 0.5, 0.4];
const SECO = [0.42, 0.36, 0.26];

export function buildJardin(ctx, S, L) {
  const K = FORT.torre;
  // lo que se pisa: alrededor de la torre del homenaje, hasta la fortaleza
  // (la torre de la reina asoma hasta z -102 y la de la coracha también)
  const rects = [
    [J.x0, J.z0, J.x1, K.z0],
    [J.x0, K.z0, K.x0, FORT.torres.NO.z0],
    [FORT.torres.NO.x1, FORT.torres.NO.z0, K.x0, J.z1],
    [K.x1, K.z0, J.x1, FORT.torres.NE.z0],
    [K.x1, FORT.torres.NE.z0, FORT.torres.NE.x0, J.z1],
  ];
  for (const r of rects) W(S, ...r);
  suelo(ctx, rects);
  crucero(ctx, L);
  alberca(ctx, L);
  pomar(ctx);
  palomar(ctx, L);
  colmenar(ctx, L);
  vivero(ctx, L);
  escalera(ctx);
  mirador(ctx, L);
  // el muro que cierra el jardín por levante, del fanal a la atalaya
  solid(ctx, 'wallstone', -63.5, 0, -120.5, J.x1, 6.2, -112.5, { faces: 'tnswe', sub: 2.2, aoH: 2.5, mats: { t: 'flag' }, tint: PIEDRA.lienzo });
  merlons(ctx, -62.8, -120.3, -62.8, -112.7, 6.2, { collide: false, t: 0.5, h: 0.9 });
  ctx.crows.push({ x: -96, y: 0.2, z: -116.6, r: 2.0, n: 3 });
  L.zones.push({ id: 'jardin_rey', rects: rects.map((r) => [...r, -1, 9]), atmo: 'castillo' });
  for (const r of rects) L.map.push({ id: 'jardin_rey', r });
}

// La tierra del jardín (la de los arriates, más oscura, la ponen ellos).
function suelo(ctx, rects) {
  for (const [a, b, c, d] of rects) ctx.wb.box('dirt', a, 0.0, b, c, 0.02, d, { faces: 't', ao: false, sub: 3, tint: [0.5, 0.47, 0.4] });
}

// ------------------------------------------------------------------------ el jardín de la reina
// El crucero: dos andenes enlosados que se cruzan en la fuente, con su
// bordillo; los cuatro arriates, alzados sobre su borde de ladrillo, con la
// tierra, el arrayán muerto a lo largo del borde y un naranjo seco en medio;
// los poyos de la fuente; el andén de la puerta de la reina, bajo su
// emparrado sin hojas.
function crucero(ctx, L) {
  const wb = ctx.wb;
  const C = J.crucero;
  const hw = C.w / 2;
  const K = FORT.torre;
  const xE = K.x0 - 1.4; // (hasta el talud de la torre)
  const zS = FORT.z0; // (hasta la crujía de la reina)
  const rng = new RNG(8901);
  const anden = (a, b, c, d) => {
    wb.box('flag', a, 0.0, b, c, 0.05, d, { faces: 't', ao: false, sub: 2, uv: 0.8, tint: [0.74, 0.71, 0.66] });
  };
  anden(J.x0, C.z - hw, xE, C.z + hw);
  anden(C.x - hw, J.z0, C.x + hw, C.z - hw);
  anden(C.x - hw, C.z + hw, C.x + hw, zS);
  // la glorieta de la fuente, enlosada
  for (const [a, b, c, d] of [
    [C.x - 3.5, C.z - 3.5, C.x - hw, C.z - hw],
    [C.x + hw, C.z - 3.5, C.x + 3.5, C.z - hw],
    [C.x - 3.5, C.z + hw, C.x - hw, C.z + 3.5],
    [C.x + hw, C.z + hw, C.x + 3.5, C.z + 3.5],
  ])
    wb.box('flag', a, 0.0, b, c, 0.05, d, { faces: 't', ao: false, sub: 2, uv: 0.8, tint: [0.74, 0.71, 0.66] });
  const Pu = J.puerta;
  anden(Pu.x - 0.9, C.z + hw, Pu.x + 0.9, FORT.torres.NO.z0);
  // los arriates
  const beds = [
    // (los del norte, hasta las torres de la muralla, que asoman)
    [J.x0 + 1.3, J.z0 + 2.3, C.x - hw - 0.3, C.z - hw - 0.3],
    [C.x + hw + 0.3, J.z0 + 1.8, xE - 0.3, C.z - hw - 0.3],
    [J.x0 + 0.3, C.z + hw + 0.3, Pu.x - 1.2, FORT.torres.NO.z0 - 0.3],
    [Pu.x + 1.2, C.z + hw + 0.3, C.x - hw - 0.3, FORT.torres.NO.z0 - 0.3],
    [C.x + hw + 0.3, C.z + hw + 0.3, xE - 0.3, zS - 0.3],
  ];
  // (los que dan al cruce pierden su esquina: la glorieta de la fuente)
  const R = 3.5;
  beds.forEach(([a, b, c, d], k) => {
    const cx = (a + c) / 2,
      cz = (b + d) / 2;
    const sx = cx < C.x ? -1 : 1,
      sz = cz < C.z ? -1 : 1;
    const xn = sx < 0 ? c : a,
      zn = sz < 0 ? d : b;
    const toca = Math.abs(xn - C.x) < R && Math.abs(zn - C.z) < R;
    arriate(ctx, a, b, c, d, 8910 + k * 7, rng, toca ? { sx, sz, xr: C.x + sx * R, zr: C.z + sz * R } : null);
  });
  // la fuente
  fuente(ctx, C.x, C.z, L);
  // los poyos, en las esquinas del cruce
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    // (en escuadra, en el rincón de cada arriate que da a la glorieta)
    const x = C.x + sx * 3.1,
      z = C.z + sz * 3.1;
    solid(ctx, 'ashlar', Math.min(x, x - sx * 1.3), 0, z - 0.2, Math.max(x, x - sx * 1.3), 0.45, z + 0.2, { faces: 'tnsew', sub: 2, tint: PIEDRA.silla });
  }
  // el emparrado sobre el andén de la puerta: los pies derechos, las
  // carreras, los travesaños y las cepas muertas
  {
    const x0 = Pu.x - 1.0,
      x1 = Pu.x + 1.0,
      z0 = C.z + hw + 0.4,
      z1 = FORT.torres.NO.z0 - 0.5,
      y = 2.5;
    const zs = [];
    for (let z = z0; z <= z1 + 0.01; z += (z1 - z0) / 3) zs.push(z);
    for (const x of [x0, x1]) {
      for (const z of zs) {
        wb.box('wooddark', x - 0.07, 0, z - 0.07, x + 0.07, y, z + 0.07, { ao: false, tint: MADERA });
        ctx.col.add(x - 0.08, 0, z - 0.08, x + 0.08, y, z + 0.08);
      }
      wb.box('wooddark', x - 0.06, y, z0 - 0.3, x + 0.06, y + 0.12, z1 + 0.3, { ao: false, faces: 'tnsewb', tint: MADERA });
    }
    for (let z = z0 - 0.2; z < z1 + 0.3; z += 0.55) wb.box('wooddark', x0 - 0.3, y + 0.12, z - 0.03, x1 + 0.3, y + 0.18, z + 0.03, { ao: false, faces: 'tnsewb', tint: MADERA });
    // (las cepas: suben por los pies derechos y se enredan arriba)
    for (const x of [x0, x1]) {
      for (const z of zs) {
        let p = V(x + rng.range(-0.2, 0.2), 0, z + rng.range(-0.15, 0.15));
        for (let k = 0; k < 4; k++) {
          const q = V(x + rng.range(-0.2, 0.2), Math.min(y + 0.2, p.y + rng.range(0.5, 0.8)), z + rng.range(-0.2, 0.2));
          palo(wb, p, q, 0.035 - k * 0.006, 'wooddark', { tint: [0.36, 0.3, 0.26] });
          p = q;
        }
        for (let k = 0; k < 3; k++) palo(wb, V(x, y + 0.18, z), V(Pu.x + rng.range(-0.6, 0.6), y + 0.24 + rng.range(0, 0.15), z + rng.range(-0.6, 0.6)), 0.016, 'wooddark', { tint: [0.36, 0.3, 0.26] });
      }
    }
  }
  // una cortesana, de rodillas ante la fuente
  L.enemies.push({ type: 'cortesanoSuelto', x: C.x - 1.4, y: 0, z: C.z + 2.4, yaw: Math.PI - 0.5, idle: 'kneel', id: 'e_jardin1' });
}

// Un arriate: su borde de ladrillo, alzado, la tierra de dentro, el arrayán
// muerto a lo largo de los bordes de fuera, las matas secas y un naranjo seco
// en medio. cut: si da al cruce, pierde la esquina de ese lado (sx, sz: hacia
// dónde queda el arriate; xr, zr: hasta dónde llega la glorieta), y queda en
// escuadra.
function arriate(ctx, a, b, c, d, seed, rng, cut) {
  const wb = ctx.wb;
  const t = 0.22,
    h = 0.34;
  const fill = [];
  const borde = [];
  if (!cut) {
    fill.push([a, b, c, d]);
    borde.push([a, b, c, b + t], [a, d - t, c, d], [a, b + t, a + t, d - t], [c - t, b + t, c, d - t]);
  } else {
    const { sx, sz, xr, zr } = cut;
    const xn = sx < 0 ? c : a,
      xf = sx < 0 ? a : c,
      zn = sz < 0 ? d : b,
      zf = sz < 0 ? b : d;
    const R4 = (x0, z0, x1, z1) => [Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)];
    fill.push(R4(xf, zf, xr, zn), R4(xr, zf, xn, zr));
    // (los de a lo largo de z, enteros; los de a lo largo de x, entre ellos)
    borde.push(
      R4(xf, zf, xf - sx * t, zn),
      R4(xn, zf, xn + sx * t, zr),
      R4(xr, zr, xr + sx * t, zn),
      R4(xf - sx * t, zf, xn + sx * t, zf - sz * t),
      R4(xf - sx * t, zn, xr + sx * t, zn + sz * t),
      R4(xr + sx * t, zr, xn + sx * t, zr + sz * t)
    );
  }
  for (const [x0, z0, x1, z1] of borde) solid(ctx, 'ashlar', x0, 0, z0, x1, h, z1, { faces: 'tnsew', sub: 1.4, tint: LADRILLO });
  for (const [x0, z0, x1, z1] of fill) {
    wb.box('dirt', x0 + 0.01, 0.0, z0 + 0.01, x1 - 0.01, h - 0.06, z1 - 0.01, { faces: 't', ao: false, sub: 2, tint: [0.36, 0.3, 0.24] });
    ctx.col.add(x0, 0, z0, x1, h - 0.06, z1);
  }
  // el arrayán: setos bajos a lo largo de los bordes de fuera, secos, con
  // calvas
  const seto = (x0, z0, x1, z1) => {
    const alongX = x1 - x0 > z1 - z0;
    const L = alongX ? x1 - x0 : z1 - z0;
    for (let u = 0, v = 0; u < L - 0.3; u = v + rng.range(0.08, 0.4)) {
      v = Math.min(L, u + rng.range(0.5, 1.1));
      if (rng.chance(0.18)) continue;
      const hh = rng.range(0.32, 0.55);
      if (alongX) wb.box('leaves', x0 + u, h - 0.06, z0, x0 + v, h - 0.06 + hh, z1, { ao: false, faces: 'tnsew', tint: SECO.map((q) => q * rng.range(0.85, 1.1)) });
      else wb.box('leaves', x0, h - 0.06, z0 + u, x1, h - 0.06 + hh, z0 + v, { ao: false, faces: 'tnsew', tint: SECO.map((q) => q * rng.range(0.85, 1.1)) });
    }
  };
  const [fa, fb, fc, fd] = fill[0];
  seto(fa + t + 0.05, fb + t + 0.05, fc - t - 0.05, fb + t + 0.45);
  seto(fa + t + 0.05, fd - t - 0.45, fc - t - 0.05, fd - t - 0.05);
  // las matas secas y el naranjo
  const cx = (fa + fc) / 2,
    cz = (fb + fd) / 2;
  for (let k = 0; k < 4; k++) P.weeds(ctx, cx + rng.range(-(fc - fa) / 3, (fc - fa) / 3), h - 0.06, cz + rng.range(-(fd - fb) / 4, (fd - fb) / 4), 5, seed + k, 0.5, [0.4, 0.36, 0.24]);
  P.deadTree(ctx, cx, h - 0.06, cz, seed, rng.range(2.6, 3.4));
  if (fc - fa > 8) {
    P.deadTree(ctx, cx - (fc - fa) / 4, h - 0.06, cz + rng.range(-0.5, 0.5), seed + 1, rng.range(2.4, 3.0));
    P.deadTree(ctx, cx + (fc - fa) / 4, h - 0.06, cz + rng.range(-0.5, 0.5), seed + 2, rng.range(2.4, 3.0));
  }
}

// La fuente del jardín de la reina: el pilón ochavado, seco, con las hojas
// del invierno; el fuste y la taza, y en la taza la corona de flores, seca.
function fuente(ctx, x, z, L) {
  const wb = ctx.wb;
  // (el pilón y su borde: aros, con su cara de dentro; el fondo, la tierra)
  wb.ring('ashlar', x, 0, z, 1.8, 1.48, 0.6, 16, { tint: PIEDRA.silla, ao: true });
  wb.ring('ashlar', x, 0.6, z, 1.9, 1.42, 0.1, 16, { tint: PIEDRA.silla });
  wb.cylinder('dirt', x, 0.18, z, 1.5, 1.5, 0.02, 16, { capTop: true, ao: false, tint: [0.4, 0.34, 0.26] });
  const rng = new RNG(8931);
  for (let k = 0; k < 30; k++) {
    const a = rng.range(0, Math.PI * 2),
      r = rng.range(0.4, 1.4);
    wb.at(x + Math.cos(a) * r, 0.21, z + Math.sin(a) * r, rng.range(0, 6), () => wb.box('leaves', -0.06, 0, -0.03, 0.06, 0.01, 0.03, { ao: false, faces: 't', tint: [0.6, 0.42, 0.22] }));
  }
  wb.cylinder('ashlar', x, 0.18, z, 0.3, 0.24, 1.3, 8, { ao: false, tint: PIEDRA.silla });
  wb.cylinder('ashlar', x, 1.48, z, 0.26, 0.9, 0.3, 10, { ao: false, tint: PIEDRA.silla });
  wb.cylinder('ashlar', x, 1.78, z, 0.95, 0.95, 0.1, 10, { ao: false, capTop: true, tint: PIEDRA.silla });
  wb.cylinder('ashlar', x, 1.88, z, 0.12, 0.08, 0.5, 6, { ao: false, capTop: true, tint: PIEDRA.silla });
  // la corona de flores, seca, en el borde de la taza
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    wb.at(x + Math.cos(a) * 0.82, 1.88, z + Math.sin(a) * 0.82, -a, () => wb.box('leaves', -0.08, 0, -0.05, 0.08, 0.07, 0.05, { ao: false, tint: k % 3 ? [0.5, 0.36, 0.22] : [0.56, 0.3, 0.26] }));
  }
  ctx.col.add(x - 1.8, 0, z - 0.75, x + 1.8, 0.7, z + 0.75);
  ctx.col.add(x - 0.75, 0, z - 1.8, x + 0.75, 0.7, z + 1.8);
  P.colOBB(ctx, x, z, 1.7, 0.72, Math.PI / 4, 0, 0.7);
  P.colOBB(ctx, x, z, 1.7, 0.72, -Math.PI / 4, 0, 0.7);
  ctx.col.add(x - 0.3, 0, z - 0.3, x + 0.3, 2.4, z + 0.3);
  L.interact.push({ kind: 'examine', id: 'x_fuente_rey', text: 'fuenteRey', x, y: 0, z, r: 2.6 });
}

// ------------------------------------------------------------------------ la alberca
// La alberca larga, al pie de la torre: su pretil de sillería y el fondo de
// losas, con el légamo seco y las monedas que echaban (abajo, en ella, cae el
// Caballero de la Orden: game/caballero.js).
function alberca(ctx, L) {
  const wb = ctx.wb;
  const A = J.alberca;
  const at = 0.4,
    ah = 0.75;
  for (const [a, b, c, d] of [
    [A[0] - at, A[1] - at, A[2] + at, A[1]],
    [A[0] - at, A[3], A[2] + at, A[3] + at],
    [A[0] - at, A[1], A[0], A[3]],
    [A[2], A[1], A[2] + at, A[3]],
  ])
    solid(ctx, 'ashlar', a, 0, b, c, ah, d, { faces: 'tnsew', sub: 2, tint: PIEDRA.silla });
  wb.box('flag', A[0], 0, A[1], A[2], 0.1, A[3], { faces: 't', ao: false, sub: 3, tint: [0.44, 0.42, 0.38] });
  const rr = new RNG(8820);
  for (let i = 0; i < 7; i++) P.decal(ctx, rr.range(A[0] + 1.2, A[2] - 1.2), 0.11, rr.range(A[1] + 0.9, A[3] - 0.9), rr.range(1.4, 2.6), 'splat', 0.55, { tint: [0.2, 0.22, 0.17] });
  for (let i = 0; i < 40; i++) wb.cylinder('gold', rr.range(A[0] + 0.4, A[2] - 0.4), 0.105, rr.range(A[1] + 0.3, A[3] - 0.3), 0.045, 0.045, 0.012, 6, { ao: false, capTop: true, tint: [0.8, 0.72, 0.5] });
  // los caños de la alberca, secos, y la marca del agua
  for (const x of [A[0] + 4, A[2] - 4]) wb.box('bronzeAged', x - 0.06, 0.55, A[1] - 0.45, x + 0.06, 0.66, A[1] + 0.2, { ao: false });
  wb.box('mossstone', A[0], 0.42, A[1] + 0.006, A[2], 0.48, A[1] + 0.008, { faces: 's', ao: false, tint: [0.4, 0.46, 0.34] });
  wb.box('mossstone', A[0], 0.42, A[3] - 0.008, A[2], 0.48, A[3] - 0.006, { faces: 'n', ao: false, tint: [0.4, 0.46, 0.34] });
  L.interact.push({ kind: 'examine', id: 'x_alberca', text: 'alberca', x: (A[0] + A[2]) / 2 - 3, y: 0, z: A[1] - at - 0.7, r: 2.0 });
}

// ------------------------------------------------------------------------ el pomar
// Los naranjos secos, en filas, al este de la torre y en el rincón de la
// muralla, con sus alcorques; las naranjas, caídas y negras.
function pomar(ctx) {
  const rng = new RNG(8941);
  const pts = [];
  for (const x of [-76.2, -72.4, -68.6, -65.0]) for (const z of [-118.0, -114.2]) pts.push([x, z]);
  for (const [x, z] of [
    [-68.4, -109.0],
    [-65.2, -105.6],
    [-82.2, -111.6],
    [-82.4, -106.4],
    [-84.6, -120.0],
    [-108.4, -120.2],
  ])
    pts.push([x, z]);
  for (const [x, z] of pts) {
    const px = x + rng.range(-0.3, 0.3),
      pz = z + rng.range(-0.3, 0.3);
    ctx.wb.cylinder('dirt', px, 0.0, pz, 0.7, 0.75, 0.06, 8, { ao: false, capTop: true, tint: [0.34, 0.28, 0.22] });
    P.deadTree(ctx, px, 0.04, pz, 8950 + Math.round(-x * 3 - z), rng.range(2.4, 3.4));
    for (let k = 0; k < 3; k++) ctx.wb.cylinder('black', px + rng.range(-1.2, 1.2), 0.02, pz + rng.range(-1.2, 1.2), 0.05, 0.05, 0.08, 6, { ao: false, capTop: true, tint: [0.5, 0.3, 0.12] });
  }
}

// ------------------------------------------------------------------------ el palomar
// Una torrecilla encalada con su tejado de cuatro aguas; arriba, las piqueras
// en tres filas sobre sus repisas, y la puerta abajo, cerrada. Sin palomas: en
// los nidales, plumas y huesecillos limpios, y en lo alto, el cuervo cebado.
function palomar(ctx, L) {
  const wb = ctx.wb;
  const Pm = J.palomar;
  const { x0, x1, z0, z1, h } = Pm;
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  const cal = [0.86, 0.82, 0.74];
  solid(ctx, 'plaster', x0, 0, z0, x1, h, z1, { faces: 'nsew', sub: 2, aoH: 2, tint: cal });
  wb.box('wallstone', x0 - 0.05, 0, z0 - 0.05, x1 + 0.05, 0.6, z1 + 0.05, { faces: 'nsewt', sub: 2, aoH: 0.6, tint: PIEDRA.lienzo });
  wb.box('ashlar', x0 - 0.2, h - 0.25, z0 - 0.2, x1 + 0.2, h, z1 + 0.2, { faces: 'tnsewb', ao: false, tint: PIEDRA.silla });
  const ph = 2.0;
  wb.pyramid('roof', cx, cz, x1 - x0 + 0.7, z1 - z0 + 0.7, h, ph);
  // (en lo alto, el remate donde se posa el cuervo)
  const top = h + ph - 0.25;
  wb.box('wooddark', cx - 0.35, top, cz - 0.35, cx + 0.35, top + 0.12, cz + 0.35, { faces: 'tnsewb', ao: false, tint: MADERA });
  ctx.col.add(cx - 0.35, top, cz - 0.35, cx + 0.35, top + 0.12, cz + 0.35);
  ctx.col.addCam(x0, h, z0, x1, h + ph * 0.6, z1);
  // las piqueras y sus repisas, por las cuatro caras
  for (const [d, line, a, b] of [
    ['n', z0, x0, x1],
    ['s', z1, x0, x1],
    ['w', x0, z0, z1],
    ['e', x1, z0, z1],
  ]) {
    const sg = d === 's' || d === 'e' ? 1 : -1;
    const alongX = d === 'n' || d === 's';
    for (const [y, k] of [
      [h - 2.6, 0],
      [h - 1.9, 1],
      [h - 1.2, 2],
    ]) {
      const ledge = alongX ? [a + 0.1, y - 0.1, line - (sg < 0 ? 0.22 : 0), b - 0.1, y - 0.02, line + (sg > 0 ? 0.22 : 0)] : [line - (sg < 0 ? 0.22 : 0), y - 0.1, a + 0.1, line + (sg > 0 ? 0.22 : 0), y - 0.02, b - 0.1];
      wb.box('ashlar', ...ledge, { ao: false, faces: 'tnsewb', tint: PIEDRA.silla });
      for (let u = a + 0.45 + (k % 2) * 0.25; u < b - 0.3; u += 0.5) {
        const e = 0.012;
        const bx = alongX ? [u - 0.08, y, line + sg * e - (sg < 0 ? 0.002 : 0), u + 0.08, y + 0.2, line + sg * e + (sg > 0 ? 0.002 : 0)] : [line + sg * e - (sg < 0 ? 0.002 : 0), y, u - 0.08, line + sg * e + (sg > 0 ? 0.002 : 0), y + 0.2, u + 0.08];
        wb.box('black', ...bx, { ao: false, grime: false });
      }
    }
  }
  // la puerta, cerrada, al sur, y las cagarrutas
  wb.box('planks', cx - 0.5, 0.0, z1, cx + 0.5, 1.9, z1 + 0.06, { ao: false, faces: 'swetb', tint: MADERA });
  wb.box('iron', cx + 0.3, 0.9, z1 + 0.06, cx + 0.36, 1.0, z1 + 0.09, { ao: false });
  for (let k = 0; k < 8; k++) P.decal(ctx, cx + Math.cos(k * 2.4) * 2.4, 0.03, cz + Math.sin(k * 2.4) * 2.4, 0.5 + (k % 3) * 0.2, 'splat', null, { tint: [0.86, 0.84, 0.78] });
  L.interact.push({ kind: 'examine', id: 'x_palomar', text: 'palomar', x: cx, y: 0, z: z1 + 0.8, r: 1.8 });
  // el cuervo cebado, en lo alto: guarda el jardín entero
  L.enemies.push({ type: 'cuervo', x: cx, y: top + 0.12, z: cz, yaw: 2.6, idle: 'perch', id: 'e_cuervo_jardin', guard: [J.x0, J.z0, J.x1, J.z1] });
}

// ------------------------------------------------------------------------ el colmenar
// Contra la torre de la coracha, al sol de la tarde: un poyo de piedra con las
// colmenas de paja, de campana, y en el suelo los corchos; alguna, volcada.
function colmenar(ctx, L) {
  const wb = ctx.wb;
  const Cm = J.colmenar;
  const zf = FORT.torres.NE.z0;
  const y = 0.55;
  solid(ctx, 'wallstone', Cm.x0, 0, zf - 0.9, Cm.x1, y, zf, { faces: 'tnsew', sub: 2, mats: { t: 'flag' }, tint: PIEDRA.lienzo });
  const rng = new RNG(8961);
  let k = 0;
  for (let x = Cm.x0 + 0.6; x < Cm.x1 - 0.4; x += 1.05, k++) {
    if (k === 4) {
      // (la volcada, en el suelo)
      wb.push();
      wb.translate(x, 0.32, zf - 1.6);
      wb.rotateZ(1.45);
      wb.cylinder('straw', 0, -0.3, 0, 0.32, 0.14, 0.6, 10, { ao: false, capTop: true, tint: [0.78, 0.68, 0.46] });
      wb.pop();
      continue;
    }
    wb.cylinder('straw', x, y, zf - 0.45, 0.32, 0.14, 0.58, 10, { ao: false, capTop: true, tint: [0.78 + rng.range(-0.06, 0.04), 0.68, 0.46] });
    wb.cylinder('straw', x, y + 0.58, zf - 0.45, 0.14, 0.02, 0.12, 8, { ao: false, tint: [0.7, 0.6, 0.4] });
    for (const yy of [0.18, 0.36]) wb.cylinder('rope', x, y + yy, zf - 0.45, 0.32 - yy * 0.32, 0.31 - yy * 0.32, 0.02, 10, { ao: false });
    wb.box('black', x - 0.06, y, zf - 0.78, x + 0.06, y + 0.06, zf - 0.77, { ao: false, grime: false, faces: 's' });
  }
  // los corchos
  for (const [x, z] of [
    [Cm.x0 + 0.4, zf - 2.0],
    [Cm.x0 - 0.6, zf - 1.4],
  ]) {
    wb.cylinder('wooddark', x, 0, z, 0.26, 0.26, 0.72, 10, { ao: false, capTop: true, tint: [0.5, 0.36, 0.26] });
    wb.cylinder('wallstone', x, 0.72, z, 0.32, 0.32, 0.05, 10, { ao: false, capTop: true, capBot: true, tint: [0.5, 0.5, 0.52] });
    ctx.col.add(x - 0.26, 0, z - 0.26, x + 0.26, 0.77, z + 0.26);
  }
  L.interact.push({ kind: 'examine', id: 'x_colmenas', text: 'colmenas', x: (Cm.x0 + Cm.x1) / 2, y: 0, z: zf - 1.4, r: 2.4 });
}

// ------------------------------------------------------------------------ el vivero
// El vivero de los peces del Rey: un estanque de piedra, el agua negra y las
// carpas panza arriba, hinchadas, vueltas todas hacia la Sé.
function vivero(ctx, L) {
  const wb = ctx.wb;
  const [a, b, c, d] = J.vivero;
  const t = 0.35,
    h = 0.6,
    yw = 0.32;
  for (const [x0, z0, x1, z1] of [
    [a, b, c, b + t],
    [a, d - t, c, d],
    [a, b + t, a + t, d - t],
    [c - t, b + t, c, d - t],
  ])
    solid(ctx, 'ashlar', x0, 0, z0, x1, h, z1, { faces: 'tnsew', sub: 2, tint: PIEDRA.silla });
  wb.box('mossstone', a + t, -0.4, b + t, c - t, -0.38, d - t, { faces: 't', ao: false, tint: [0.3, 0.32, 0.26] });
  for (const [x0, z0, x1, z1, f] of [
    [a + t, b + t, c - t, b + t + 0.01, 's'],
    [a + t, d - t - 0.01, c - t, d - t, 'n'],
    [a + t, b + t, a + t + 0.01, d - t, 'e'],
    [c - t - 0.01, b + t, c - t, d - t, 'w'],
  ])
    wb.box('mossstone', x0, -0.4, z0, x1, h, z1, { faces: f, ao: false, tint: [0.42, 0.44, 0.36] });
  ctx.col.add(a + t, -0.4, b + t, c - t, yw - 0.3, d - t);
  if (ctx.waters) ctx.waters.push({ shape: 'rect', r: [a + t, b + t, c - t, d - t], y: yw, deep: 0x0c120e, sky: 0x2a3438, glint: 0x8a9aa8, light: [(a + c) / 2, 6, (b + d) / 2], lightK: 0.5 });
  else wb.box('black', a + t, yw - 0.01, b + t, c - t, yw, d - t, { faces: 't', ao: false, grime: false });
  // las carpas: vueltas todas hacia el sureste (hacia la Sé)
  const rng = new RNG(8971);
  const yaw = Math.atan2(1, 0.6);
  for (let k = 0; k < 9; k++) {
    const x = rng.range(a + 0.8, c - 0.8),
      z = rng.range(b + 0.7, d - 0.7);
    wb.at(x, yw - 0.02, z, yaw + rng.range(-0.15, 0.15), () => {
      P.ellipsoid({ wb }, 'skinPale', 0, 0.02, 0, 0.11, 0.07, 0.26, [0.86, 0.8, 0.66]);
      wb.box('skinPale', -0.005, 0.0, -0.36, 0.005, 0.08, -0.22, { ao: false, tint: [0.7, 0.6, 0.5] });
    });
  }
  L.interact.push({ kind: 'examine', id: 'x_vivero', text: 'vivero', x: (a + c) / 2, y: 0, z: d + 0.6, r: 2.2 });
}

// ------------------------------------------------------------------------ la escalera del adarve
// De piedra, contra la muralla, del rincón del pomar hasta el adarve: sube
// hacia poniente, con su pretil escalonado del lado del jardín.
function escalera(ctx) {
  const E = J.escalera;
  const zw = J.z0;
  const zc = zw + E.w / 2;
  stairs(ctx, E.x, 0, zc, 'w', E.w, E.n, E.rise, E.run, 'wallstone', { solidBelow: true });
  for (let i = 0; i < E.n; i++) {
    const xa = E.x - E.run * (i + 1),
      xb = E.x - E.run * i;
    const y1 = E.rise * (i + 1) + 0.95;
    solid(ctx, 'wallstone', xa, 0, zw + E.w, xb, y1, zw + E.w + 0.32, { sub: 2, ao: false, faces: 'tnsew' + (i === 0 ? 'e' : ''), tint: PIEDRA.lienzo });
  }
}

// El tramo de la muralla norte del jardín (level_walls.js lo pide aquí), con
// su adarve: las almenas, menos donde vuela el mirador; el parapeto de dentro,
// menos donde llega la escalera.
export function murallaJardin(ctx, a, b, y) {
  const M = J.mirador,
    E = J.escalera;
  const z0 = J.z0 - 4,
    z1 = J.z0;
  cityWall(ctx, a, z0, b, z1, y, { merlons: false });
  for (const [u, v] of [
    [a, M.x0],
    [M.x1, b],
  ]) {
    merlons(ctx, u, z0 + 0.3, v, z0 + 0.3, y, {});
    blocker(ctx, u, y - 0.2, z0, v, y + 2.4, z0 + 0.6);
  }
  const g1 = E.x - E.run * (E.n - 5),
    g0 = E.x - E.run * E.n - 0.3;
  for (const [u, v] of [
    [a, g0],
    [g1, b],
  ]) {
    solid(ctx, 'wallstone', u, y, z1 - 0.5, v, y + 0.95, z1, { sub: 2, ao: false, faces: 'nsew' });
    ctx.wb.box('ashlar', u - 0.05, y + 0.95, z1 - 0.55, v + 0.05, y + 1.07, z1 + 0.05, { ao: false, faces: 'tnsewb' });
  }
}

// ------------------------------------------------------------------------ el mirador
// El mirador del Rey: un balcón cubierto, volado sobre la muralla norte en el
// eje de la torre, sobre cuatro canes de tres hiladas; su antepecho por los
// tres lados, las columnillas y el tejadillo a un agua; dentro, los poyos y la
// jamuga del Rey, de cara al campo. Abajo, el campamento de los sitiadores
// (campamento()).
function mirador(ctx, L) {
  const wb = ctx.wb;
  const M = J.mirador;
  const y = 10;
  const zw = J.z0 - 4; // la cara de fuera de la muralla
  const zf = zw - M.d;
  const tint = PIEDRA.silla;
  // el suelo, volado
  solid(ctx, 'ashlar', M.x0, y - 0.4, zf, M.x1, y, zw, { faces: 'tnsewb', sub: 2, mats: { t: 'flag' }, tint });
  // los canes
  for (const x of [M.x0 + 0.5, M.x0 + 2.17, M.x1 - 2.17, M.x1 - 0.5]) {
    for (let k = 0; k < 3; k++) {
      const d = M.d * (1 - k * 0.3) - 0.1;
      wb.box('ashlar', x - 0.2, y - 0.4 - (k + 1) * 0.38, zw - d, x + 0.2, y - 0.4 - k * 0.38, zw, { ao: false, faces: 'nwetb', tint });
    }
  }
  // el antepecho por los tres lados, con su albardilla, y su colisión alta
  const t = 0.24,
    h = 0.95;
  for (const [a, b, c, d] of [
    [M.x0, zf, M.x1, zf + t],
    [M.x0, zf + t, M.x0 + t, zw],
    [M.x1 - t, zf + t, M.x1, zw],
  ]) {
    solid(ctx, 'ashlar', a, y, b, c, y + h, d, { faces: 'nsew', sub: 2, ao: false, tint });
    wb.box('ashlar', a - 0.04, y + h, b - 0.04, c + 0.04, y + h + 0.1, d + 0.04, { ao: false, faces: 'tnsewb', tint });
    blocker(ctx, a, y + h, b, c, y + 3.2, d);
  }
  // las columnillas y el tejadillo
  const yr0 = y + 3.0,
    yr1 = y + 2.5;
  for (const [x, z] of [
    [M.x0 + t / 2, zf + t / 2],
    [M.x1 - t / 2, zf + t / 2],
    [M.x0 + t / 2, zw - 0.12],
    [M.x1 - t / 2, zw - 0.12],
    [(M.x0 + M.x1) / 2, zf + t / 2],
  ]) {
    const yt = z < zw - 1 ? yr1 : yr0;
    wb.cylinder('ashlar', x, y + h + 0.1, z, 0.08, 0.08, yt - (y + h + 0.1) - 0.18, 8, { ao: false, tint });
    wb.box('ashlar', x - 0.14, yt - 0.2, z - 0.14, x + 0.14, yt - 0.04, z + 0.14, { ao: false, faces: 'tnsewb', tint });
  }
  {
    const xa = M.x0 - 0.3,
      xb = M.x1 + 0.3,
      za = zw + 0.05,
      zb = zf - 0.35;
    const q = [V(xa, yr0 + 0.12, za), V(xb, yr0 + 0.12, za), V(xb, yr1 - 0.04, zb), V(xa, yr1 - 0.04, zb)];
    cara(wb, 'roof', q[0], q[1], q[2], q[3], V(0, 1, -0.2), { ao: false, sub: 2 });
    const u = q.map((p) => p.clone().add(V(0, -0.1, 0)));
    cara(wb, 'wooddark', u[0], u[1], u[2], u[3], V(0, -1, 0.2), { ao: false, sub: 2, tint: [0.5, 0.44, 0.38] });
    cara(wb, 'wooddark', u[3], u[2], q[2], q[3], V(0, 0, -1), { ao: false, tint: [0.42, 0.38, 0.34] });
    for (const [s, x] of [
      [-1, xa],
      [1, xb],
    ])
      cara(wb, 'wooddark', V(x, u[0].y, za), V(x, u[3].y, zb), V(x, q[3].y, zb), V(x, q[0].y, za), V(s, 0, 0), { ao: false, tint: [0.42, 0.38, 0.34] });
    // (los cabios, bajo el tejadillo, con su pendiente)
    for (let x = M.x0 + 0.2; x < M.x1; x += 0.7) palo(wb, V(x, u[0].y - 0.06, za - 0.1), V(x, u[3].y - 0.06, zb + 0.1), 0.05, 'wooddark', { tint: [0.46, 0.4, 0.34] });
    ctx.col.addCam(xa, yr1 - 0.1, zb, xb, yr0 + 0.2, za);
  }
  // los poyos y la jamuga del Rey, de cara al campo
  for (const [a, c] of [
    [M.x0 + t, M.x0 + t + 0.42],
    [M.x1 - t - 0.42, M.x1 - t],
  ])
    solid(ctx, 'ashlar', a, y, zf + t + 0.1, c, y + 0.45, zw - 0.3, { faces: 'tnsew', sub: 2, tint });
  {
    const jx = (M.x0 + M.x1) / 2,
      jz = zf + 0.85;
    wb.at(jx, y, jz, Math.PI, () => {
      for (const s of [-1, 1]) {
        wb.box('wooddark', s * 0.28 - 0.03, 0, -0.3, s * 0.28 + 0.03, 0.08, 0.3, { ao: false, tint: MADERA });
        // (las tijeras: dos palos cruzados a cada lado)
        palo(wb, V(s * 0.28, 0.04, -0.28), V(s * 0.28, 0.5, 0.26), 0.025, 'wooddark', { tint: MADERA });
        palo(wb, V(s * 0.28, 0.04, 0.28), V(s * 0.28, 0.5, -0.26), 0.025, 'wooddark', { tint: MADERA });
        wb.box('wooddark', s * 0.28 - 0.03, 0.5, -0.34, s * 0.28 + 0.03, 0.95, -0.28, { ao: false, tint: MADERA });
      }
      wb.box('leather', -0.3, 0.46, -0.26, 0.3, 0.52, 0.26, { ao: false, faces: 'tnsewb', tint: [0.5, 0.2, 0.16] });
      wb.box('leather', -0.3, 0.7, -0.33, 0.3, 0.95, -0.3, { ao: false, faces: 'tnsewb', tint: [0.5, 0.2, 0.16] });
    });
    ctx.col.add(jx - 0.35, y, jz - 0.35, jx + 0.35, y + 0.95, jz + 0.35);
  }
  // un farol bajo el tejadillo, apagado, y la luz de la luna
  ctx.lights.push({ x: (M.x0 + M.x1) / 2, y: y + 2.0, z: (zf + zw) / 2, r: 0.5, g: 0.58, b: 0.78, radius: 6, intensity: 0.6 });
  bakeCorpse(wb, M.x0 + 0.7, y + 0.45, zw - 1.0, Math.PI / 2, 'sit', 'soldier', 8981);
  L.interact.push(
    { kind: 'examine', id: 'x_mirador', text: 'mirador', x: (M.x0 + M.x1) / 2, y, z: zf + 0.8, r: 1.8 },
    { kind: 'item', id: 'i_ampolla_jardin', item: 'ampolla', x: M.x1 - t - 0.21, y: y + 0.48, z: zw - 1.1 }
  );
  L.zones.push(
    { id: 'mirador_rey', rects: [[M.x0, zf, M.x1, zw + 0.6, y - 1, y + 4]], atmo: 'castillo' },
    { id: 'adarve_jardin', rects: [[FORT.norte.torre + 3.5, zw, -63.5, J.z0 + 0.4, y - 2, y + 5]], atmo: 'castillo' }
  );
  L.map.push({ id: 'mirador_rey', r: [M.x0, zf, M.x1, zw] }, { id: 'adarve_jardin', r: [FORT.norte.torre + 3.5, zw, -63.5, J.z0] });
  campamento(ctx);
}

// ------------------------------------------------------------------------ el campamento
// Lo que se ve desde el mirador: al pie de la muralla, la fila de picas con
// sus cabezas; los manteletes; la cava con su empalizada; detrás, las
// tiendas, las hogueras que todavía arden, los dos trabucos que tiraban a la
// muralla, los carros y el pabellón del capitán con sus estandartes. Nadie se
// mueve.
function campamento(ctx) {
  const wb = ctx.wb;
  const rng = new RNG(8991);
  // las picas, a lo largo de la muralla
  for (let x = -134; x < -66; x += rng.range(2.2, 3.4)) P.pike(ctx, x, 0, -133.5 + rng.range(-0.6, 0.6), { h: rng.range(2.6, 3.2), skull: rng.chance(0.45), tilt: rng.range(-0.12, 0.12) });
  // los manteletes: paveses de tablas sobre su puntal
  for (let x = -128; x < -70; x += rng.range(7, 10)) {
    const z = -140 + rng.range(-1.5, 1.5);
    wb.at(x, 0, z, rng.range(-0.25, 0.25), () => {
      wb.push();
      wb.rotateX(-0.22);
      for (let k = 0; k < 6; k++) wb.box('planks', -1.5 + k * 0.5, 0, -0.06, -1.06 + k * 0.5, 2.2, 0.06, { ao: false, tint: [0.5, 0.42, 0.34] });
      wb.box('wooddark', -1.6, 0.6, 0.06, 1.5, 0.75, 0.14, { ao: false });
      wb.pop();
      palo(wb, V(0, 0, 1.4), V(0, 1.7, 0.45), 0.06, 'wooddark', {});
    });
  }
  // la cava y su empalizada, de lado a lado
  for (let x = -160; x < -44; x += 0.32) {
    const top = 2.4 + rng.range(-0.3, 0.3);
    const z = -150 + Math.sin(x * 0.08) * 1.2;
    wb.cylinder('wooddark', x, -0.1, z, 0.14, 0.13, top + 0.1, 5, { ao: false, tint: [0.42, 0.36, 0.3] });
    wb.cylinder('wooddark', x, top, z, 0.13, 0.01, 0.35, 5, { ao: false, tint: [0.42, 0.36, 0.3] });
  }
  wb.box('black', -160, -0.01, -147.6, -44, 0.0, -146.2, { faces: 't', ao: false, grime: false, tint: [0.35, 0.32, 0.3] });
  // las tiendas, las hogueras, las picas con sus trofeos
  for (let i = 0; i < 26; i++) {
    const x = rng.range(-170, -40),
      z = rng.range(-212, -158);
    const w = rng.range(3.2, 5.2);
    wb.pyramid(rng.pick(['clothDark', 'burlap', 'burlap', 'clothRed']), x, z, w, w * rng.range(0.8, 1.1), 0, rng.range(2.6, 3.8));
    if (rng.chance(0.35)) {
      ctx.fires.push({ x: x + 3.2, y: 0, z: z + 2.2, s: 1.3, smoke: true });
      ctx.lights.push({ x: x + 3.2, y: 1.4, z: z + 2.2, r: 1, g: 0.45, b: 0.15, radius: 11, intensity: 1.5 });
    }
    if (rng.chance(0.5)) P.pike(ctx, x - w / 2 - 0.8, 0, z + rng.range(-2, 2), { h: 3, skull: rng.chance(0.5) });
  }
  // el pabellón del capitán, con sus estandartes
  {
    const x = -100,
      z = -186;
    wb.cylinder('clothRed', x, 0, z, 4.2, 4.2, 2.6, 12, { ao: false, tint: [0.62, 0.3, 0.26] });
    wb.cylinder('clothRed', x, 2.6, z, 4.4, 0.2, 3.4, 12, { ao: false, tint: [0.68, 0.34, 0.28] });
    for (const dx of [-6.5, 6.5]) {
      wb.cylinder('wooddark', x + dx, 0, z + 3, 0.08, 0.06, 7.5, 6, { ao: false });
      P.banner(ctx, x + dx + 0.8, 7.2, z + 3, 0, 'bannerBlack', 1.5, 3.4);
    }
    ctx.fires.push({ x: x + 6, y: 0, z: z + 6, s: 1.6, smoke: true });
    ctx.lights.push({ x: x + 6, y: 1.6, z: z + 6, r: 1, g: 0.45, b: 0.15, radius: 13, intensity: 1.6 });
  }
  // los dos trabucos que tiraban a la muralla, de cara a ella, con su
  // montón de bolos
  for (const [x, z, s] of [
    [-126, -166, 1],
    [-74, -170, -1],
  ])
    trabuco(ctx, x, z, s, rng);
  // los carros
  P.cart(ctx, -142, 0, -170, 0.4, {});
  P.cart(ctx, -58, 0, -178, 2.2, { tipped: true });
  P.cart(ctx, -112, 0, -160, 1.4, {});
}

// Un trabuco de los de fuera: grande, entero, con el brazo alzado (tiró el
// último bolo), su caja del contrapeso abajo y el montón de bolos al pie. Mira
// a la muralla (al sur).
function trabuco(ctx, x, z, s, rng) {
  const wb = ctx.wb;
  const hw = 1.6,
    hT = 8.4;
  for (const dx of [-hw, hw]) {
    palo(wb, V(x + dx, 0, z - 4), V(x + dx, hT, z), 0.22, 'timber', {});
    palo(wb, V(x + dx, 0, z + 4), V(x + dx, hT, z), 0.22, 'timber', {});
    wb.box('timber', x + dx - 0.22, 0, z - 5, x + dx + 0.22, 0.4, z + 5, { ao: false });
  }
  for (const dz of [-4.5, 4.5]) wb.box('timber', x - hw - 0.25, 0.4, z + dz - 0.2, x + hw + 0.25, 0.75, z + dz + 0.2, { ao: false });
  wb.push();
  wb.translate(x, hT, z);
  wb.rotateZ(Math.PI / 2);
  wb.cylinder('iron', 0, -hw - 0.3, 0, 0.16, 0.16, 2 * hw + 0.6, 8, { ao: false, capTop: true, capBot: true });
  wb.pop();
  // el brazo, alzado hacia la muralla (el cabo largo, arriba y hacia el sur)
  const a = V(x, hT, z);
  const dir = V(0.12 * s, 0.82, 0.57).normalize();
  const tip = a.clone().addScaledVector(dir, 9);
  const back = a.clone().addScaledVector(dir, -3.2);
  palo(wb, back, tip, 0.28, 'timber', {});
  palo(wb, tip, tip.clone().add(V(0, -4.5, 0.6)), 0.03, 'rope', {});
  // el contrapeso
  wb.box('planks', back.x - 1.2, back.y - 3.0, back.z - 1.0, back.x + 1.2, back.y - 0.6, back.z + 1.0, { ao: false, tint: [0.56, 0.48, 0.4] });
  for (const k of [-1, 1]) palo(wb, V(back.x + k * 1.0, back.y - 0.6, back.z), back, 0.05, 'iron', {});
  // los bolos
  for (let k = 0; k < 9; k++) P.roughStone(ctx, x + rng.range(-3, 3), 0, z + 5.5 + rng.range(0, 2.5), rng.range(0.35, 0.55), 8995 + k + Math.round(-x));
  void s;
}
