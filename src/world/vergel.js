// El Vergel (la cloaca, más allá de la sala de la luz: world/cloaca.js).
//
// El agua de la sala de la luz se va por la reja de levante (sus barrotes,
// doblados: los dobló él) a la galería del desagüe, que la lleva al
// colector: la sala grande de los romanos, donde se juntaban las aguas de
// las cloacas de media ciudad antes de bajar a las hondas. Treinta pasos por
// treinta, seis tramos por seis de bóvedas de arista sobre pilares, con sus
// arcos fajones; la galería sale a un rellano, alto, y el agua cae de él en
// cascada a la alberca, y de ahí, por el canal mayor, al estanque de
// decantación, y por el desagüe, al muro del sur. En el muro de levante, un
// caño de los romanos aún mana: la fuente, con su pila.
//
// Encima de los dos tramos del noroeste estaba el huerto de una casa de la
// plaza: se secó con la peste, y la bóveda, con el peso de la tierra mojada,
// se hundió. Por la sima baja la luna, y por tres sumideros de la calle (los
// óculos de la bóveda), tres rayas más de luz. Abajo ha crecido todo lo que
// arriba se murió: el derrubio de tierra del huerto es un prado con su
// higuera, la tierra que trajo el agua cubre el enlosado de musgo y de
// hierba, los saúcos han echado raíz entre las losas, la hiedra baja de los
// lunetos y de los capiteles, y en lo umbrío dan luz los hongos.
//
// El Desfigurado lo llama el Vergel: dice que la vida no se murió, que se
// escondió aquí abajo. En el rincón del suroeste tiene su botica: ahí busca
// con qué curarse (la mesa, el mortero, los tarros, las hierbas que se
// secan, el puchero al fuego, el alambique, el cuaderno de los remedios, la
// lista rayada en el muro, su jergón). En el muro del norte, la boca de la
// galería de la Sé, la que baja a las cloacas hondas: por ahí entra lo
// oscuro. Ha puesto una raya de candiles de pared a pared, y más allá, una
// reja con cadena (world/cloacas_hondas.js).
//
// Medidas: VERGEL. La rejilla (Q) es la de la cloaca (CLOACA.grid la cubre);
// el agujero de la losa de la sima, level.js (VERGEL.sima). Las galerías (la
// del desagüe de la sala de la luz y la de la Sé), world/cloacas_hondas.js
// (con el kit de las cloacas). Lo que se mueve (las cascadas, las
// luciérnagas, los ojos de lo oscuro), game/cloaca.js.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { groinVaults } from './builders.js';
import * as P from './props.js';
import { caveWall } from './level_postigo.js';
import { herbBunch, bowl } from './level_souto.js';
import { tapia } from './kit_casa.js';
import { KIT, muro, pilar, aguaDe, SILLAR } from './cloaca_kit.js';
import { helecho, hierba, flores, musgo, hiedra, raices, juncos, higuera, arbolillo, hongos, nenufares, raizLarga, tronco, mata } from './verdor.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const VERGEL = {
  // el suelo del colector, sus muros (x0, z0, x1, z1), las líneas de sus
  // apoyos y sus bóvedas (el arranque, la flecha)
  y: -11.5,
  sala: [5, 11.5, 35, 41.5],
  xs: [5, 10, 15, 20, 25, 30, 35],
  zs: [11.5, 16.5, 21.5, 26.5, 31.5, 36.5, 41.5],
  ys: -6.9,
  rise: 2.45,
  // la boca de la galería del desagüe de la sala de la luz (la pone el kit:
  // cloacas_hondas.js), a la altura de sus andenes; el rellano en que sale,
  // su escalera (baja al sur, junto al muro) y la alberca de la cascada
  boca: { z: 24, y: -8.95 },
  rellano: [5, 22.3, 8.2, 25.7],
  escalera: { x0: 5.0, x1: 6.7, z0: 25.7, n: 8, run: 0.42 },
  alberca: [8.2, 22.7, 10.9, 25.3],
  albercaFondo: -12.4,
  // el canal mayor (de la alberca al estanque), el estanque de decantación,
  // la pila de la fuente y su reguero, y el desagüe (al muro del sur)
  canal: [
    [10.9, 23.4, 28.1, 24.6],
    [26.9, 24.6, 28.1, 27.3],
  ],
  estanque: [25.6, 27.3, 29.4, 30.7],
  estanqueFondo: -12.9,
  pila: [32.6, 27.7, 35, 30.3],
  reguero: [29.4, 28.6, 32.6, 29.4],
  desague: [26.9, 30.7, 28.1, 41.5],
  lecho: -11.9,
  agua: -11.67,
  // la fuente: un caño de piedra en el muro de levante, que aún mana (x, z:
  // la boca; y: su labio)
  fuente: { x: 35, z: 29, y: -9.9 },
  // los tramos hundidos (i, j) bajo el huerto, la sima de la losa de la
  // calle (por metros enteros) y el huerto de encima; el derrubio, la tierra
  // del huerto que se vino abajo (lo alto, llano: r0; su falda: r1)
  hundidas: [
    [0, 1],
    [1, 1],
  ],
  sima: [6, 17, 12, 21],
  techoSima: -4.0,
  huerto: { x0: 3.5, z0: 14, x1: 14, z1: 22, h: 2.8, puerta: [8.2, 9.8] },
  derrubio: { x: 9.5, z: 18.6, y: -9.9, r0: 1.4, r1: 4.2 },
  // los sumideros de la calle: óculos en la clave de los tramos (i, j)
  rejas: [
    [2, 3],
    [3, 1],
    [5, 2],
  ],
  // la botica (el rincón del suroeste): la mesa contra el muro del sur, el
  // fuego, el alambique
  botica: { x0: 5, z0: 33.5, x1: 15, z1: 41.5, mesa: { x: 8.8, z: 41.0, w: 1.9, d: 0.8 }, fuego: [12.9, 39.6], alambique: [6.2, 38.6] },
  // él, en su botica (de cara a la mesa)
  desfigurado: { x: 8.8, z: 40.22, yaw: 0 },
  // la boca de la galería de la Sé (en el muro del norte) y la raya de
  // candiles ante ella
  norte: { x: 27.5 },
  raya: { z: 12.9, x0: 25.6, x1: 29.4 },
  // la tapa de hierro del pozo que sube de lo hondo (trabada por debajo)
  tapa: { x: 32.5, z: 34.0 },
  // donde se ponen las luciérnagas (centro, radio, cuántas)
  luciernagas: [
    [9.6, 18.8, 3.4, 26],
    [16.0, 24.2, 3.0, 14],
    [27.4, 29.0, 3.2, 16],
    [17.5, 29.0, 2.4, 10],
    [22.5, 19.0, 2.4, 10],
    [11.6, 37.6, 2.2, 8],
  ],
};

const ROOM = 'vergel';

// ------------------------------------------------------------------------ geometría
const inR = (x, z, r, m = 0) => x >= r[0] - m && x <= r[2] + m && z >= r[1] - m && z <= r[3] + m;
export const AGUAS = () => [VERGEL.alberca, ...VERGEL.canal, VERGEL.estanque, VERGEL.pila, VERGEL.reguero, VERGEL.desague];
const enAgua = (x, z, m = 0) => AGUAS().some((r) => inR(x, z, r, m));
const ESC = () => {
  const E = VERGEL.escalera;
  return [E.x0, E.z0, E.x1, E.z0 + E.n * E.run];
};
const enRellano = (x, z, m = 0) => inR(x, z, VERGEL.rellano, m) || inR(x, z, ESC(), m);
// el centro de un tramo de bóveda (i, j)
const tramoC = (i, j) => [(VERGEL.xs[i] + VERGEL.xs[i + 1]) / 2, (VERGEL.zs[j] + VERGEL.zs[j + 1]) / 2];
export const REJAS = () => VERGEL.rejas.map(([i, j]) => tramoC(i, j));
const PILARES = () => {
  const out = [];
  const { xs, zs } = VERGEL;
  for (let i = 1; i < xs.length - 1; i++) for (let j = 1; j < zs.length - 1; j++) out.push([xs[i], zs[j]]);
  return out;
};
const junto = (x, z, m) => PILARES().some(([px, pz]) => Math.abs(x - px) < m && Math.abs(z - pz) < m);
const HUNDIDO = () => {
  const { xs, zs } = VERGEL;
  const is = VERGEL.hundidas.map((h) => h[0]),
    js = VERGEL.hundidas.map((h) => h[1]);
  return [xs[Math.min(...is)], zs[Math.min(...js)], xs[Math.max(...is) + 1], zs[Math.max(...js) + 1]];
};

// El alto del suelo del colector en (x, z): el enlosado y, encima, el
// derrubio (una loma, llana arriba).
export function altoVergel(x, z) {
  const D = VERGEL.derrubio;
  const d = Math.hypot(x - D.x, z - D.z);
  if (d >= D.r1) return VERGEL.y;
  const t = d <= D.r0 ? 1 : 1 - (d - D.r0) / (D.r1 - D.r0);
  return VERGEL.y + (D.y - VERGEL.y) * t * t * (3 - 2 * t);
}
// (lo de verlo: con sus bultos, menos en lo alto del derrubio)
function ruido(x, z) {
  return 0.04 * Math.sin(x * 1.7 + z * 0.6) * Math.cos(z * 1.3 - x * 0.4) + 0.02 * Math.sin(x * 4.1 + z * 3.3);
}

export function buildVergel(ctx, Q, L) {
  colector(ctx, Q);
  rellano(ctx);
  aguas(ctx);
  hundimiento(ctx);
  verde(ctx);
  fuente(ctx, L);
  botica(ctx, L);
  raya(ctx, L);
  tapa(ctx, L);
  luces(ctx);
  zonas(L);
}

// ------------------------------------------------------------------------ el colector
// Los muros (con la boca de la galería del desagüe, alta, en el de poniente;
// la de la Sé, en el del norte; la salida del agua, en el del sur), los
// pilares, las bóvedas (con los óculos de los sumideros y los tramos
// hundidos) y el suelo (el enlosado, con lo que lo cubre, y el derrubio).
function colector(ctx, Q) {
  const wb = ctx.wb,
    col = ctx.col;
  const G = VERGEL;
  const [x0, z0, x1, z1] = G.sala;
  const y = G.y,
    ys = G.ys;
  const h = KIT.w / 2,
    ring = KIT.ring;
  Q.paint(x0, z0, x1, z1, 1);
  wb.setRoom(ROOM);
  const mt = [0.44, 0.44, 0.4];
  const mo = { banda: 1.4, musgo: [0.42, 0.5, 0.38] };
  // ---------------------------------------------------------- los muros
  const bz = G.boca.z,
    nx = G.norte.x;
  muro(ctx, 'w', [z0, bz - h - ring], x0, y, ys, ROOM, 'ashlar', mt, false, mo);
  muro(ctx, 'w', [bz + h + ring, z1], x0, y, ys, ROOM, 'ashlar', mt, false, mo);
  muro(ctx, 'n', [x0, nx - h - ring], z0, y, ys, ROOM, 'ashlar', mt, false, mo);
  muro(ctx, 'n', [nx + h + ring, x1], z0, y, ys, ROOM, 'ashlar', mt, false, mo);
  muro(ctx, 'e', [z0, z1], x1, y, ys, ROOM, 'ashlar', mt, false, mo);
  // (el del sur, con la salida del agua: un vano bajo con su dintel y su reja)
  const D = G.desague;
  const sx0 = D[0] - 0.3,
    sx1 = D[2] + 0.3,
    sTop = y + 1.15;
  muro(ctx, 's', [x0, sx0], z1, y, ys, ROOM, 'ashlar', mt, false, mo);
  muro(ctx, 's', [sx1, x1], z1, y, ys, ROOM, 'ashlar', mt, false, mo);
  wb.box('ashlar', sx0, sTop, z1, sx1, ys, z1 + KIT.t, { faces: 'n', sub: 1.6, ao: false, tint: mt });
  wb.box('ashlar', sx0 - 0.1, sTop, z1 - 0.06, sx1 + 0.1, sTop + 0.32, z1, { faces: 'tnewb', ao: false, tint: [0.5, 0.5, 0.46] });
  for (const [a, b] of [
    [sx0, D[0]],
    [D[2], sx1],
  ])
    wb.box('mossstone', a, G.lecho - 0.05, z1, b, sTop, z1 + KIT.t, { faces: a < D[0] ? 'ne' : 'nw', sub: 1.2, aoH: 0.8, baseY: G.lecho, tint: mo.musgo });
  wb.box('black', D[0], G.lecho - 0.05, z1 + 0.8, D[2], sTop, z1 + 0.81, { faces: 'n', ao: false, grime: false });
  wb.box('mossstone', D[0], sTop - 0.01, z1, D[2], sTop, z1 + 0.8, { faces: 'b', ao: false, tint: [0.3, 0.34, 0.28] });
  for (let k = 0; k < 5; k++) {
    const bx = D[0] + 0.12 + k * 0.24;
    wb.box('iron', bx - 0.02, G.lecho, z1 + 0.18, bx + 0.02, sTop, z1 + 0.22, { ao: false, faces: 'tnsew' });
  }
  wb.box('iron', D[0], sTop - 0.12, z1 + 0.17, D[2], sTop - 0.08, z1 + 0.23, { ao: false, faces: 'tnsewb' });
  col.add(D[0], G.lecho, z1 + 0.15, D[2], sTop, z1 + 0.25);
  // ---------------------------------------------------------- los pilares
  for (const [px, pz] of PILARES()) pilar(ctx, px, pz, altoVergel(px, pz) > y + 0.3 ? altoVergel(px, pz) - 0.4 : y, ys, { room: ROOM, tint: mt, musgo: mo.musgo, banda: 1.3, pl: 0.42 });
  // ---------------------------------------------------------- las bóvedas
  {
    const holes = [{ side: 'w', u0: bz - h - ring, u1: bz + h + ring, y: G.boca.y + KIT.sp + h + ring }];
    const oculi = [];
    for (const [i, j] of G.rejas) oculi.push({ i, j, k: 1, top: -0.12, mat: 'ashlar', tint: [0.36, 0.36, 0.33] });
    const hs = G.hundidas;
    for (const [i, j] of hs) {
      // (en los tramos hundidos, todo abierto; entre dos hundidos, sin pared)
      const skip = [];
      if (hs.some(([a, b]) => a === i + 1 && b === j)) skip.push('e');
      if (hs.some(([a, b]) => a === i - 1 && b === j)) skip.push('w');
      if (hs.some(([a, b]) => a === i && b === j + 1)) skip.push('s');
      if (hs.some(([a, b]) => a === i && b === j - 1)) skip.push('n');
      oculi.push({ i, j, k: 4, top: G.techoSima, mat: 'rock', tint: [0.34, 0.32, 0.3], skip });
    }
    groinVaults(ctx, { xs: G.xs, zs: G.zs, ys, rise: G.rise, mat: 'ashlar', tint: [0.4, 0.4, 0.37], room: ROOM, walls: { n: true, s: true, e: true, w: true }, holes, oculi, ribs: true, ribTint: [0.46, 0.46, 0.42], m: 4 });
    // (la cámara, por encima de las bóvedas, menos en la sima)
    const Hd = HUNDIDO();
    for (const r of [
      [x0, z0, x1, Hd[1]],
      [x0, Hd[3], x1, z1],
      [x0, Hd[1], Hd[0], Hd[3]],
      [Hd[2], Hd[1], x1, Hd[3]],
    ])
      if (r[2] - r[0] > 0.01 && r[3] - r[1] > 0.01) col.add(r[0], ys + G.rise + 0.5, r[1], r[2], -1.0, r[3]).cam = true;
  }
  // ---------------------------------------------------------- el suelo
  // (casillas de medio metro, cuadradas con la rejilla de la cloaca; el agua,
  // el rellano y su escalera, aparte)
  const step = 0.5;
  for (let z = z0; z < z1 - 1e-6; z += step) {
    let run = null;
    const flush = () => {
      if (!run) return;
      col.add(run.x0, run.h - 1.5, z, run.x1, run.h, z + step, 'floor').cam = true;
      run = null;
    };
    for (let x = x0; x < x1 - 1e-6; x += step) {
      const cx = x + step / 2,
        cz = z + step / 2;
      if (enAgua(cx, cz) || enRellano(cx, cz)) {
        flush();
        continue;
      }
      const hh = Math.round(altoVergel(cx, cz) * 20) / 20;
      if (run && Math.abs(run.h - hh) < 1e-6) run.x1 = x + step;
      else {
        flush();
        run = { x0: x, x1: x + step, h: hh };
      }
    }
    flush();
  }
  {
    const nx2 = Math.round((x1 - x0) / step),
      nz2 = Math.round((z1 - z0) / step);
    const H = [];
    for (let j = 0; j <= nz2; j++) {
      const row = [];
      for (let i = 0; i <= nx2; i++) {
        const x = x0 + i * step,
          z = z0 + j * step;
        const a = altoVergel(x, z);
        // (el enlosado, plano: los bultos, sólo en la tierra del derrubio)
        row.push(a + (a > y + 0.02 && a < G.derrubio.y - 0.05 ? ruido(x, z) : 0));
      }
      H.push(row);
    }
    const Pt = (i, j) => V(x0 + i * step, H[j][i], z0 + j * step);
    const Bo = G.botica,
      R = G.raya;
    const rj = REJAS();
    for (let j = 0; j < nz2; j++)
      for (let i = 0; i < nx2; i++) {
        const cx = x0 + (i + 0.5) * step,
          cz = z0 + (j + 0.5) * step;
        if (enAgua(cx, cz) || enRellano(cx, cz, -0.05)) continue;
        const a = altoVergel(cx, cz);
        // (lo que cubre el enlosado: la hierba donde cae la luz, el musgo en
        // lo húmedo, la tierra que trajo el agua; las losas peladas, donde
        // pisa él —su botica, el camino a la escalera— y en lo muerto, junto
        // a la boca de la Sé)
        const n = Math.sin(cx * 0.9 + cz * 0.4) + Math.cos(cz * 0.7 - cx * 0.3);
        const t = 0.9 + 0.1 * Math.sin(cx * 2.3 + cz * 1.7);
        const luz = a > y + 0.12 || rj.some(([gx, gz]) => Math.hypot(cx - gx, cz - gz) < 2.4);
        const pisa = inR(cx, cz, [Bo.x0 + 0.5, Bo.z0 + 1.6, Bo.x1 - 0.4, Bo.z1]) || (cx < 7.6 && cz > 29 && cz < 34) || (Math.abs(cx - 7.0) < 0.9 && cz > 29);
        const muerto = cz < R.z + 2.6 && cx > R.x0 - 2.2 && cx < R.x1 + 2.2;
        let mat = 'mossstone',
          tint = [0.4 * t, 0.46 * t, 0.36 * t];
        if (a > y + 0.12) {
          mat = 'grass';
          tint = [0.46 * t, 0.6 * t, 0.36 * t];
        } else if (enAgua(cx, cz, 0.55)) {
          mat = 'mossstone';
          tint = [0.34 * t, 0.42 * t, 0.3 * t];
        } else if (muerto) {
          mat = 'flag';
          tint = [0.32, 0.31, 0.29];
        } else if (pisa) {
          mat = 'flag';
          tint = [0.46 * t, 0.44 * t, 0.4 * t];
        } else if (luz || n > 0.7) {
          mat = 'grass';
          tint = luz ? [0.5 * t, 0.64 * t, 0.38 * t] : [0.4 * t, 0.52 * t, 0.32 * t];
        } else if (n < -0.9) {
          mat = 'dirt';
          tint = [0.36 * t, 0.36 * t, 0.28 * t];
        } else if (n < -0.3) {
          mat = 'flag';
          tint = [0.4 * t, 0.42 * t, 0.36 * t];
        }
        wb.quad(mat, Pt(i, j), Pt(i, j + 1), Pt(i + 1, j + 1), Pt(i + 1, j), { ao: false, sub: 2, tint, room: ROOM });
      }
  }
  wb.setRoom(null);
}

// ------------------------------------------------------------------------ el rellano
// Donde sale la galería del desagüe: un macizo de sillería contra el muro de
// poniente, a la altura de los andenes de la galería, con el canal que lo
// cruza y se despeña a la alberca; su pretil; la escalera que baja al sur,
// junto al muro, con el suyo.
function rellano(ctx) {
  const wb = ctx.wb,
    col = ctx.col;
  const G = VERGEL;
  const [rx0, rz0, rx1, rz1] = G.rellano;
  const yt = G.boca.y,
    y = G.y;
  const c0 = G.boca.z - KIT.c / 2,
    c1 = G.boca.z + KIT.c / 2;
  const lecho = yt - KIT.prof;
  const tn = [0.46, 0.46, 0.42];
  wb.setRoom(ROOM);
  // lo de arriba: los andenes y el canal (como en la galería)
  for (const [a, b] of [
    [rz0, c0],
    [c1, rz1],
  ]) {
    wb.box('flag', rx0, yt - 0.1, a, rx1, yt, b, { faces: 't', ao: false, sub: 2, tint: [0.46, 0.45, 0.41] });
    col.add(rx0, y - 0.5, a, rx1, yt, b, 'floor').cam = true;
  }
  wb.box('mossstone', rx0, lecho - 0.1, c0, rx1, lecho, c1, { faces: 't', ao: false, sub: 2, tint: [0.34, 0.38, 0.3] });
  col.add(rx0, y - 0.5, c0, rx1, lecho, c1, 'floor').cam = true;
  wb.box('ashlar', rx0, lecho, c0, rx1, yt, c0 + 0.01, { faces: 's', ao: false, tint: [0.4, 0.42, 0.38] });
  wb.box('ashlar', rx0, lecho, c1 - 0.01, rx1, yt, c1, { faces: 'n', ao: false, tint: [0.4, 0.42, 0.38] });
  // el macizo (sus caras al norte, al este y al sur; en la del este, la boca
  // del caño por donde cae el agua)
  const mo = { sub: 1.6, aoH: 1.6, aoMin: 0.45, baseY: y, tint: tn };
  wb.box('ashlar', rx0, y - 0.05, rz0, rx1, yt, rz0 + 0.01, { ...mo, faces: 'n' });
  wb.box('ashlar', rx1 - 0.01, y - 0.05, rz0, rx1, yt, c0, { ...mo, faces: 'e' });
  wb.box('ashlar', rx1 - 0.01, y - 0.05, c1, rx1, yt, rz1, { ...mo, faces: 'e' });
  wb.box('ashlar', rx1 - 0.01, y - 0.05, c0, rx1, lecho - 0.05, c1, { ...mo, faces: 'e', tint: [0.36, 0.42, 0.36] });
  const E = VERGEL.escalera;
  wb.box('ashlar', E.x1, y - 0.05, rz1 - 0.01, rx1, yt, rz1, { ...mo, faces: 's' });
  // (la mancha verde del agua por la cara, de la boca abajo)
  wb.box('mossstone', rx1, y, c0 - 0.15, rx1 + 0.01, lecho, c1 + 0.15, { faces: 'e', ao: false, tint: [0.3, 0.4, 0.28] });
  // (el macizo, para lo que choca: menos el canal, que baja a su lecho)
  col.add(rx0, y - 0.5, rz0, rx1, yt - 0.02, c0);
  col.add(rx0, y - 0.5, c1, rx1, yt - 0.02, rz1);
  col.add(rx0, y - 0.5, c0, rx1, lecho - 0.02, c1);
  // el pretil del rellano: al norte, y al este menos donde cae el agua
  const pt = 0.22,
    ph = 0.85;
  const po = { ao: false, sub: 2, tint: [0.48, 0.48, 0.44] };
  wb.box('ashlar', rx0, yt, rz0, rx1, yt + ph, rz0 + pt, { ...po, faces: 'tsew' });
  col.add(rx0, yt, rz0, rx1, yt + ph + 0.4, rz0 + pt);
  for (const [a, b] of [
    [rz0 + pt, c0 - 0.08],
    [c1 + 0.08, rz1],
  ]) {
    wb.box('ashlar', rx1 - pt, yt, a, rx1, yt + ph, b, { ...po, faces: 'tnsew' });
    col.add(rx1 - pt, yt, a, rx1, yt + ph + 0.4, b);
  }
  // (sobre el canal, un umbral bajo por el que rebosa el agua)
  wb.box('ashlar', rx1 - 0.3, lecho, c0 - 0.08, rx1, lecho + 0.18, c1 + 0.08, { ...po, faces: 'tnsew', tint: [0.36, 0.42, 0.36] });
  col.add(rx1 - pt, lecho, c0, rx1, yt + ph + 0.4, c1);
  // al sur, la escalera (baja hacia el sur pegada al muro) y su pretil
  const n = E.n,
    rise = (yt - y) / n;
  wb.tint = [0.44, 0.44, 0.41];
  for (let i = 0; i < n; i++) {
    const za = E.z0 + E.run * i,
      zb = E.z0 + E.run * (i + 1);
    const top = yt - rise * (i + 1);
    wb.box('flag', E.x0, y - 0.05, za, E.x1, top, zb, { ao: false, faces: 'tse', sub: 3 });
    col.add(E.x0, y - 0.5, za, E.x1, top, zb);
  }
  wb.tint = null;
  for (let i = 0; i < n; i++) {
    const za = E.z0 + E.run * i,
      zb = E.z0 + E.run * (i + 1);
    const top = yt - rise * (i + 1);
    wb.box('ashlar', E.x1, top, za, E.x1 + pt, top + ph, zb, { ...po, faces: 'tewn' });
    wb.box('ashlar', E.x1, y - 0.05, za, E.x1 + pt, top, zb, { ...po, faces: 'e', tint: tn });
    col.add(E.x1, y - 0.5, za, E.x1 + pt, top + ph + 0.4, zb);
  }
  wb.box('ashlar', E.x0, y - 0.05, E.z0 + n * E.run - 0.01, E.x1 + pt, y + 0.02, E.z0 + n * E.run, { ao: false, faces: 's', tint: tn });
  wb.setRoom(null);
}

// ------------------------------------------------------------------------ el agua
// La alberca de la cascada, el canal mayor, el estanque, la pila de la fuente
// con su reguero y el desagüe: de sillería, con sus cantos (y su pretil donde
// es hondo); el agua, corriendo.
function aguas(ctx) {
  const wb = ctx.wb,
    col = ctx.col;
  const G = VERGEL,
    y = G.y;
  wb.setRoom(ROOM);
  const can = [...G.canal, G.reguero, G.desague];
  // los lechos (lo poco hondo se pisa: 40 cm)
  for (const r of can) {
    wb.box('mossstone', r[0], G.lecho - 0.1, r[1], r[2], G.lecho, r[3], { faces: 't', ao: false, sub: 2, tint: [0.32, 0.38, 0.28] });
    col.add(r[0], G.lecho - 1.2, r[1], r[2], G.lecho, r[3], 'floor').cam = true;
  }
  // los cantos (de sillería, del lecho al enlosado), menos donde se juntan
  // dos aguas
  const ct = [0.42, 0.43, 0.39];
  const otros = AGUAS();
  const libreBorde = (x, z) => !otros.some((r) => inR(x, z, r, -0.02)) && !enRellano(x, z, -0.02);
  const canto = (r, bed) => {
    const [a0, b0, a1, b1] = r;
    const step = 0.1;
    const lado = (fixed, axis, from, to, face, off) => {
      let s = null;
      const flush = (e) => {
        if (s === null) return;
        if (axis === 'x') wb.box('ashlar', s, bed, fixed - (face === 's' ? 0 : 0.01), e, y, fixed + (face === 's' ? 0.01 : 0), { faces: face, ao: false, sub: 2, tint: ct });
        else wb.box('ashlar', fixed - (face === 'e' ? 0 : 0.01), bed, s, fixed + (face === 'e' ? 0.01 : 0), y, e, { faces: face, ao: false, sub: 2, tint: ct });
        s = null;
      };
      for (let u = from; u < to - 1e-6; u += step) {
        const um = u + step / 2;
        const ok = axis === 'x' ? libreBorde(um, fixed + off) : libreBorde(fixed + off, um);
        if (ok && s === null) s = u;
        if (!ok) flush(u);
      }
      flush(to);
    };
    lado(b0, 'x', a0, a1, 's', -0.05);
    lado(b1, 'x', a0, a1, 'n', 0.05);
    lado(a0, 'z', b0, b1, 'e', -0.05);
    lado(a1, 'z', b0, b1, 'w', 0.05);
  };
  for (const r of can) canto(r, G.lecho);
  // las pasaderas del canal mayor: dos losas que lo cruzan
  for (const px of [16.0, 21.4]) {
    const [, cz0, , cz1] = G.canal[0];
    wb.box('ashlar', px - 0.5, y - 0.16, cz0 - 0.12, px + 0.5, y + 0.02, cz1 + 0.12, { faces: 'tnsewb', ao: false, tint: [0.5, 0.5, 0.46] });
    col.add(px - 0.5, y - 0.5, cz0, px + 0.5, y + 0.02, cz1, 'floor').cam = true;
  }
  // ---------------------------------------------------------- lo hondo: la alberca y el estanque
  const hondo = (r, fondo, pretil, abiertos) => {
    const [a0, b0, a1, b1] = r;
    wb.box('mossstone', a0, fondo - 0.1, b0, a1, fondo, b1, { faces: 't', ao: false, sub: 2, tint: [0.22, 0.26, 0.2] });
    const ft = [0.3, 0.34, 0.28];
    wb.box('mossstone', a0, fondo, b0, a1, y, b0 + 0.01, { faces: 's', ao: false, sub: 2, tint: ft });
    wb.box('mossstone', a0, fondo, b1 - 0.01, a1, y, b1, { faces: 'n', ao: false, sub: 2, tint: ft });
    wb.box('mossstone', a0, fondo, b0, a0 + 0.01, y, b1, { faces: 'e', ao: false, sub: 2, tint: ft });
    wb.box('mossstone', a1 - 0.01, fondo, b0, a1, y, b1, { faces: 'w', ao: false, sub: 2, tint: ft });
    // el pretil (que no se caiga uno a lo hondo): por fuera del borde, menos
    // donde entra o sale el agua (abiertos: [lado, u0, u1]) y donde ya hay
    // muro
    const pt = 0.24,
      ph = pretil;
    const po = { ao: false, sub: 2, tint: [0.5, 0.5, 0.46] };
    const tramoP = (side, u0, u1) => {
      const cuts = abiertos.filter((q) => q[0] === side).sort((p, q) => p[1] - q[1]);
      let cur = u0;
      const put = (s, e) => {
        if (e - s < 0.05) return;
        if (side === 'n') wb.box('ashlar', s, y, b0 - pt, e, y + ph, b0, { ...po, faces: 'tnsew' }), col.add(s, y, b0 - pt, e, y + ph + 0.4, b0);
        else if (side === 's') wb.box('ashlar', s, y, b1, e, y + ph, b1 + pt, { ...po, faces: 'tnsew' }), col.add(s, y, b1, e, y + ph + 0.4, b1 + pt);
        else if (side === 'w') wb.box('ashlar', a0 - pt, y, s, a0, y + ph, e, { ...po, faces: 'tnsew' }), col.add(a0 - pt, y, s, a0, y + ph + 0.4, e);
        else wb.box('ashlar', a1, y, s, a1 + pt, y + ph, e, { ...po, faces: 'tnsew' }), col.add(a1, y, s, a1 + pt, y + ph + 0.4, e);
      };
      for (const [, c0, c1] of cuts) {
        put(cur, c0);
        cur = c1;
      }
      put(cur, u1);
    };
    return tramoP;
  };
  // la alberca: el rellano a poniente; sale al canal por levante
  {
    const A = G.alberca;
    const c = G.canal[0];
    const tp = hondo(A, G.albercaFondo, 0.55, [['e', c[1], c[3]]]);
    tp('n', A[0], A[2] + 0.24);
    tp('s', A[0], A[2] + 0.24);
    tp('e', A[1], A[3]);
    col.add(A[0], G.albercaFondo - 1, A[1], A[2], y + 1.4, A[3]);
    // (entre la alberca y el canal, el umbral por el que rebosa)
    wb.box('ashlar', A[2], G.lecho, c[1], A[2] + 0.24, G.agua - 0.03, c[3], { faces: 'tew', ao: false, tint: [0.36, 0.42, 0.36] });
  }
  // el estanque: entra el canal por el norte, el reguero por levante; sale
  // el desagüe por el sur
  {
    const E = G.estanque;
    const c = G.canal[1],
      rg = G.reguero,
      d = G.desague;
    const tp = hondo(E, G.estanqueFondo, 0.6, [
      ['n', c[0], c[2]],
      ['s', d[0], d[2]],
      ['e', rg[1], rg[3]],
    ]);
    tp('n', E[0] - 0.24, E[2] + 0.24);
    tp('s', E[0] - 0.24, E[2] + 0.24);
    tp('w', E[1], E[3]);
    tp('e', E[1], E[3]);
    col.add(E[0], G.estanqueFondo - 1, E[1], E[2], y + 1.4, E[3]);
    for (const [bx0, bz0, bx1, bz1, f] of [
      [c[0], E[1] - 0.24, c[2], E[1], 'tns'],
      [d[0], E[3], d[2], E[3] + 0.24, 'tns'],
      [E[2], rg[1], E[2] + 0.24, rg[3], 'tew'],
    ])
      wb.box('ashlar', bx0, G.lecho, bz0, bx1, G.agua - 0.04, bz1, { faces: f, ao: false, tint: [0.36, 0.42, 0.36] });
  }
  // la pila de la fuente: una artesa de piedra contra el muro, más alta que
  // el suelo, que rebosa por su piquera al reguero
  {
    const Pi = G.pila;
    const top = y + 0.62,
      wat = y + 0.5;
    const w = 0.2;
    const po = { ao: false, sub: 2, tint: [0.5, 0.5, 0.46] };
    const rg = G.reguero;
    wb.box('ashlar', Pi[0], y - 0.05, Pi[1], Pi[2], top, Pi[1] + w, { ...po, faces: 'tnsw' });
    wb.box('ashlar', Pi[0], y - 0.05, Pi[3] - w, Pi[2], top, Pi[3], { ...po, faces: 'tnsw' });
    wb.box('ashlar', Pi[0], y - 0.05, Pi[1] + w, Pi[0] + w, top, rg[1], { ...po, faces: 'tnsew' });
    wb.box('ashlar', Pi[0], y - 0.05, rg[3], Pi[0] + w, top, Pi[3] - w, { ...po, faces: 'tnsew' });
    wb.box('ashlar', Pi[0], y - 0.05, rg[1], Pi[0] + w, wat - 0.02, rg[3], { ...po, faces: 'tew', tint: [0.36, 0.42, 0.36] });
    wb.box('mossstone', Pi[0] + w, wat - 0.4, Pi[1] + w, Pi[2], wat - 0.39, Pi[3] - w, { faces: 't', ao: false, tint: [0.24, 0.28, 0.22] });
    col.add(Pi[0], y - 0.5, Pi[1], Pi[2], top + 0.4, Pi[3]);
    if (ctx.waters) ctx.waters.push({ ...aguaDe([Pi[0] + w, Pi[1] + w, Pi[2], Pi[3] - w], wat, {}, false, [-0.15, 0]), amp: 0.03, deep: 0x07100d, sky: 0x24382f, glint: 0xb8d4d0, spot: [G.fuente.x - 0.9, (Pi[1] + Pi[3]) / 2, 1.0, 0.3] });
  }
  // el agua: la que corre por los canales y la quieta de lo hondo
  if (ctx.waters) {
    const W = { deep: 0x07100d, sky: 0x24382f, glint: 0xb8d4d0, light: [VERGEL.derrubio.x, -2, VERGEL.derrubio.z], lightK: 0.7, amp: 0.02, drips: false };
    const A = G.alberca;
    ctx.waters.push({ ...aguaDe(A, G.agua), ...W, flow: [0.25, 0.2], amp: 0.035, cascada: true });
    ctx.waters.push({ ...aguaDe(G.canal[0], G.agua), ...W, flow: [0.55, 0] });
    ctx.waters.push({ ...aguaDe(G.canal[1], G.agua), ...W, flow: [0, 0.5] });
    ctx.waters.push({ ...aguaDe(G.estanque, G.agua - 0.05), ...W, flow: [0.04, 0.06], amp: 0.014, light: [REJAS()[0][0], -1, REJAS()[0][1]], lightK: 0.9 });
    ctx.waters.push({ ...aguaDe(G.reguero, G.agua), ...W, flow: [-0.45, 0] });
    ctx.waters.push({ ...aguaDe(G.desague, G.agua), ...W, flow: [0, 0.5] });
  }
  wb.setRoom(null);
}

// ------------------------------------------------------------------------ el hundimiento
// Los dos tramos de bóveda que se vinieron abajo con la tierra del huerto:
// del borde roto de la bóveda (groinVaults: su óculo) a la sima, la tierra
// de encima por debajo; la sima, de la roca a la tierra del huerto; las
// raíces del árbol seco que bajan hasta el prado; la hiedra que cuelga; las
// dovelas caídas en el derrubio.
function hundimiento(ctx) {
  const wb = ctx.wb;
  const G = VERGEL;
  const [sx0, sz0, sx1, sz1] = G.sima;
  const Hd = HUNDIDO();
  wb.setRoom(ROOM);
  const ring = [
    [sx0 - 0.1, sz0 + 0.6],
    [sx0 + 1.4, sz0 - 0.15],
    [sx0 + 3.6, sz0 - 0.2],
    [sx1 - 0.6, sz0 - 0.1],
    [sx1 + 0.12, sz0 + 1.2],
    [sx1 + 0.1, sz0 + 2.6],
    [sx1 - 0.2, sz1 + 0.1],
    [sx0 + 3.0, sz1 + 0.15],
    [sx0 + 0.8, sz1 - 0.05],
    [sx0 - 0.15, sz1 - 1.6],
  ];
  const dentroRing = (x, z) => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, zi] = ring[i],
        [xj, zj] = ring[j];
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
    }
    return c;
  };
  // la tierra de encima de la bóveda, por debajo (de los bordes rotos a la
  // sima): casillas de medio metro, mirando abajo
  {
    const s = 0.5;
    const yT = G.techoSima;
    for (let x = Hd[0]; x < Hd[2] - 1e-6; x += s)
      for (let z = Hd[1]; z < Hd[3] - 1e-6; z += s) {
        const cx = x + s / 2,
          cz = z + s / 2;
        if (dentroRing(cx, cz)) continue;
        const yy = (u, w) => yT + 0.18 * Math.sin(u * 2.1 + w * 1.3) + 0.1 * Math.cos(u * 3.7 - w * 2.9);
        wb.quad('dirt', V(x, yy(x, z), z), V(x + s, yy(x + s, z), z), V(x + s, yy(x + s, z + s), z + s), V(x, yy(x, z + s), z + s), { ao: false, sub: 2, tint: [0.2, 0.18, 0.15] });
      }
  }
  // (las raíces que cuelgan de la tierra de encima)
  {
    const rr2 = new RNG(9879);
    for (let k = 0; k < 12; k++) {
      const x = rr2.range(Hd[0] + 0.4, Hd[2] - 0.4),
        z = rr2.range(Hd[1] + 0.4, Hd[3] - 0.4);
      if (dentroRing(x, z)) continue;
      raices(ctx, x, G.techoSima - 0.05, z, 5, rr2.range(1.0, 2.4), 9890 + k, { room: ROOM });
    }
  }
  // la sima: de la roca a la tierra del huerto
  caveWall(ctx, ring, G.techoSima - 0.2, -1.2, { seed: 9871, room: ROOM, tint: [0.36, 0.34, 0.31], out: 0.22, lean: -0.15, rowH: 0.6 });
  caveWall(ctx, ring, -1.2, 0.02, { seed: 9872, mat: 'dirt', room: ROOM, tint: [0.34, 0.29, 0.24], out: 0.25, lean: -0.1, rowH: 0.4 });
  // las dovelas caídas, medio enterradas en el derrubio, y las piedras
  {
    const rr = new RNG(9875);
    const D = G.derrubio;
    for (let k = 0; k < 9; k++) {
      const a = rr.range(0, Math.PI * 2),
        d = rr.range(0.8, D.r1 - 0.6);
      const x = D.x + Math.cos(a) * d,
        z = D.z + Math.sin(a) * d;
      if (enAgua(x, z, 0.4) || enRellano(x, z, 0.4) || junto(x, z, 0.9)) continue;
      const yy = altoVergel(x, z);
      wb.at(x, yy - 0.12, z, rr.range(0, Math.PI), () => {
        wb.box('ashlar', -0.32, 0, -0.22, 0.32, rr.range(0.3, 0.45), 0.22, { faces: 'tnsew', ao: false, tint: [0.44, 0.44, 0.4] });
      });
      musgo(ctx, x, yy + 0.3, z, 0.35, 0.3, 9880 + k, { room: ROOM, n: 4 });
    }
    P.rubble(ctx, D.x + 1.6, altoVergel(D.x + 1.6, D.z - 1.4), D.z - 1.4, 10, 9876, 1.1, { tint: [0.42, 0.42, 0.38] });
    P.rubble(ctx, D.x - 2.4, altoVergel(D.x - 2.4, D.z + 1.0), D.z + 1.0, 8, 9877, 0.9, { tint: [0.42, 0.42, 0.38] });
  }
  // las raíces: las del árbol seco del huerto (al este) y otras, de lo que
  // había en el huerto; las largas llegan al prado
  const rr = new RNG(9881);
  for (let k = 0; k < 9; k++) {
    const z = sz0 + 0.4 + k * 0.42;
    const len = k % 3 === 0 ? 7.6 - rr.range(0, 0.6) : rr.range(2.5, 6.0);
    raizLarga(ctx, sx1 - 0.05 + rr.range(-0.1, 0.1), -0.25, z, len, 9882 + k, { room: ROOM, r: k % 3 === 0 ? 0.05 : rr.range(0.018, 0.035), dx: rr.range(-1.2, -0.3), dz: rr.range(-0.3, 0.3) });
  }
  for (let k = 0; k < 7; k++) {
    const sd = k % 2;
    const x = sd ? sx0 + 0.6 + k * 0.7 : sx0 + 0.3 + k * 0.75;
    raizLarga(ctx, x, -0.3, sd ? sz1 + 0.02 : sz0 - 0.02, rr.range(1.4, 4.2), 9900 + k, { room: ROOM, r: rr.range(0.012, 0.026), dz: sd ? -0.4 : 0.4 });
  }
  // la hiedra: del borde de la sima, y de los bordes rotos de la bóveda
  for (let k = 0; k < 30; k++) {
    const sd = k % 4;
    const u = rr.range(0.05, 0.95);
    const px = sd === 0 ? sx0 + 0.02 : sd === 1 ? sx1 - 0.02 : sx0 + (sx1 - sx0) * u;
    const pz = sd === 2 ? sz0 + 0.02 : sd === 3 ? sz1 - 0.02 : sz0 + (sz1 - sz0) * u;
    const dir = sd === 0 ? [1, 0] : sd === 1 ? [-1, 0] : sd === 2 ? [0, 1] : [0, -1];
    hiedra(ctx, px, rr.range(-0.6, 0.0), pz, rr.range(1.6, 5.8), 9910 + k, { room: ROOM, dir, hoja: 1.5 });
  }
  for (let k = 0; k < 26; k++) {
    const sd = k % 4;
    const u = rr.range(0.04, 0.96);
    const px = sd === 0 ? Hd[0] + 0.1 : sd === 1 ? Hd[2] - 0.1 : Hd[0] + (Hd[2] - Hd[0]) * u;
    const pz = sd === 2 ? Hd[1] + 0.1 : sd === 3 ? Hd[3] - 0.1 : Hd[1] + (Hd[3] - Hd[1]) * u;
    const dir = sd === 0 ? [1, 0] : sd === 1 ? [-1, 0] : sd === 2 ? [0, 1] : [0, -1];
    const top = G.ys + rr.range(0.6, 2.2);
    hiedra(ctx, px, top, pz, rr.range(1.5, Math.min(5.5, top - altoVergel(px, pz) - 0.8)), 9950 + k, { room: ROOM, dir, hoja: 1.6 });
  }
  wb.setRoom(null);
}

// El huerto seco de la plaza del Pan (en lugar de la casa del sur de la plaza,
// junto a la quemada): su tapia, su puerta atrancada, el árbol muerto que se
// inclina sobre el agujero, el emparrado seco, los bancales y el
// espantapájaros. No se entra; desde la plaza se le ven, por encima de la
// tapia, el árbol y el sombrero del espantapájaros. (Lo llama level_city.js.)
export function buildHuerto(ctx) {
  const wb = ctx.wb,
    col = ctx.col;
  const H = VERGEL.huerto;
  const [sx0, sz0, sx1, sz1] = VERGEL.sima;
  const t = 0.4;
  const tint = [0.74, 0.7, 0.64];
  // la tapia, con la puerta a la plaza
  tapia(ctx, H.x0, H.z0, H.x1, H.z0 + t, H.h, { holes: [{ a0: H.puerta[0], a1: H.puerta[1] }], tint });
  tapia(ctx, H.x0, H.z1 - t, H.x1, H.z1, H.h, { tint });
  tapia(ctx, H.x0, H.z0 + t, H.x0 + t, H.z1 - t, H.h, { tint });
  tapia(ctx, H.x1 - t, H.z0 + t, H.x1, H.z1 - t, H.h, { tint });
  // la puerta: dos hojas de tablas con sus barras, cerradas; el dintel
  {
    const [a, b] = H.puerta;
    const z = H.z0 + t / 2;
    for (const [u0, u1] of [
      [a, (a + b) / 2],
      [(a + b) / 2, b],
    ]) {
      wb.box('wooddark', u0, 0, z - 0.06, u1, 2.3, z + 0.06, { ao: false, faces: 'nsew', tint: [0.5, 0.44, 0.38] });
      for (const y of [0.4, 1.9]) wb.box('iron', u0 + 0.04, y, z - 0.08, u1 - 0.04, y + 0.06, z - 0.06, { ao: false, faces: 'tnsewb' });
    }
    wb.box('wooddark', (a + b) / 2 - 0.05, 0, z - 0.09, (a + b) / 2 + 0.05, 2.3, z - 0.06, { ao: false, faces: 'tnsew', tint: [0.44, 0.38, 0.32] });
    wb.box('timber', a - 0.15, 2.3, H.z0 - 0.04, b + 0.15, 2.48, H.z0 + t + 0.04, { ao: false, faces: 'tnsewb' });
    col.add(a, 0, z - 0.08, b, 2.48, z + 0.08);
    P.decal(ctx, (a + b) / 2, 0.02, H.z0 - 0.5, 1.2, 'splat', 0.4);
  }
  // el suelo del huerto (tierra seca), menos el agujero
  const dentroH = [H.x0 + t, H.z0 + t, H.x1 - t, H.z1 - t];
  const piezas = [
    [dentroH[0], dentroH[1], dentroH[2], sz0],
    [dentroH[0], sz1, dentroH[2], dentroH[3]],
    [dentroH[0], sz0, sx0, sz1],
    [sx1, sz0, dentroH[2], sz1],
  ];
  for (const [a, b, c, d] of piezas) if (c - a > 0.01 && d - b > 0.01) wb.box('dirt', a, -0.05, b, c, 0.02, d, { faces: 't', ao: false, sub: 2, tint: [0.52, 0.46, 0.38] });
  // el borde del agujero: terrones, piedras, la tierra que se quebró
  const rr = new RNG(9931);
  for (let k = 0; k < 26; k++) {
    const sd = k % 4;
    const u = rr.range(0.05, 0.95);
    const px = sd === 0 ? sx0 - rr.range(0, 0.25) : sd === 1 ? sx1 + rr.range(0, 0.25) : sx0 + (sx1 - sx0) * u;
    const pz = sd === 2 ? sz0 - rr.range(0, 0.25) : sd === 3 ? sz1 + rr.range(0, 0.25) : sz0 + (sz1 - sz0) * u;
    P.roughStone(ctx, px, -0.05, pz, rr.range(0.12, 0.28), 9932 + k, { tint: [0.46, 0.4, 0.34] });
  }
  for (let k = 0; k < 14; k++) hierba(ctx, rr.range(dentroH[0] + 0.3, dentroH[2] - 0.3), 0.02, rr.chance(0.5) ? rr.range(dentroH[1] + 0.2, sz0 - 0.3) : rr.range(sz1 + 0.3, dentroH[3] - 0.2), 0.4, 8, 9960 + k, { k: [0.8, 0.62, 0.42], h: 0.5 });
  // el árbol muerto (un nogal viejo): de su rincón, inclinado sobre el
  // agujero, con las raíces al aire en el borde
  {
    const tr = [V(12.7, -0.05, 21.2), V(12.3, 1.4, 20.6), V(11.4, 2.7, 19.7), V(10.2, 3.7, 18.9), V(9.1, 4.3, 18.2)];
    for (let k = 0; k < tr.length - 1; k++) P.rod(ctx, tr[k], tr[k + 1], 0.24 * (1 - k * 0.18), 0.24 * (1 - (k + 1) * 0.18), 'wooddark', { segs: 7, tint: [0.42, 0.38, 0.34] });
    const br = new RNG(9941);
    const rama = (p, d, L, r, depth) => {
      const q = p.clone().addScaledVector(d, L);
      P.rod(ctx, p, q, r, r * 0.6, 'wooddark', { segs: 5, tint: [0.44, 0.4, 0.36] });
      if (depth <= 0) return;
      for (let i = 0; i < 2; i++) {
        const nd = d
          .clone()
          .add(V(br.range(-0.7, 0.7), br.range(0.0, 0.5), br.range(-0.7, 0.7)))
          .normalize();
        rama(q, nd, L * br.range(0.55, 0.75), r * 0.6, depth - 1);
      }
    };
    rama(tr[2], V(0.4, 0.8, -0.4).normalize(), 1.6, 0.11, 2);
    rama(tr[3], V(-0.5, 0.7, 0.6).normalize(), 1.4, 0.09, 2);
    rama(tr[4], V(-0.6, 0.5, -0.3).normalize(), 1.3, 0.08, 2);
    rama(tr[4], V(0.1, 0.9, 0.3).normalize(), 1.2, 0.07, 2);
    for (let k = 0; k < 5; k++) {
      const z = 17.6 + k * 0.7;
      P.rod(ctx, V(12.6, 0.05, 21.0), V(sx1 + 0.05, -0.05, z), 0.07, 0.04, 'wooddark', { segs: 5, tint: [0.4, 0.34, 0.28] });
    }
  }
  // el emparrado seco, contra la tapia de poniente
  {
    const x = H.x0 + t + 0.5;
    for (const z of [15.0, 17.0, 19.0, 21.0]) P.rod(ctx, V(x, 0, z), V(x, 2.2, z), 0.05, 0.045, 'timber', { segs: 5 });
    P.rod(ctx, V(x, 2.2, 14.9), V(x, 2.2, 21.1), 0.04, 0.04, 'timber', { segs: 5 });
    P.rod(ctx, V(H.x0 + t, 2.2, 15.0), V(x + 0.6, 2.25, 15.0), 0.03, 0.03, 'timber', { segs: 4 });
    const vr = new RNG(9951);
    for (let k = 0; k < 5; k++) {
      const z = 15.2 + k * 1.3;
      let p = V(x + 0.05, 0, z);
      for (let s = 0; s < 6; s++) {
        const q = V(x + vr.range(-0.12, 0.12), p.y + 0.4, p.z + vr.range(-0.25, 0.25));
        P.rod(ctx, p, q, 0.022, 0.018, 'wooddark', { segs: 3, tint: [0.42, 0.36, 0.3] });
        p = q;
      }
    }
  }
  // los bancales secos
  {
    const br = new RNG(9961);
    for (let k = 0; k < 6; k++) {
      const x = 12.0 + (k % 3) * 0.55,
        z = 14.9 + Math.floor(k / 3) * 0.6;
      P.ellipsoid(ctx, 'hide', x, 0.12, z, 0.14, 0.1, 0.14, [0.46, 0.44, 0.34]);
      P.rod(ctx, V(x, 0, z), V(x + br.range(-0.05, 0.05), 0.42, z), 0.012, 0.008, 'wooddark', { segs: 3, tint: [0.5, 0.44, 0.34] });
    }
    for (let k = 0; k < 4; k++) {
      const x = 4.6 + k * 0.5;
      P.rod(ctx, V(x - 0.25, 0, 21.3), V(x + 0.05, 1.8, 21.4), 0.012, 0.01, 'straw', { segs: 3 });
      P.rod(ctx, V(x + 0.25, 0, 21.3), V(x - 0.05, 1.8, 21.4), 0.012, 0.01, 'straw', { segs: 3 });
    }
  }
  // el espantapájaros, de cara a la plaza (el sombrero asoma por la tapia)
  {
    const x = 5.0,
      z = 15.2;
    const u = 0.55;
    P.rod(ctx, V(x, 0, z), V(x, 3.05 + u, z), 0.04, 0.035, 'timber', { segs: 5 });
    P.rod(ctx, V(x - 0.7, 2.25 + u, z), V(x + 0.7, 2.25 + u, z), 0.03, 0.03, 'timber', { segs: 4 });
    wb.box('burlap', x - 0.26, 1.35 + u, z - 0.14, x + 0.26, 2.35 + u, z + 0.14, { ao: false, faces: 'tnsewb', tint: [0.54, 0.46, 0.36] });
    wb.box('burlap', x - 0.68, 2.1 + u, z - 0.1, x + 0.68, 2.36 + u, z + 0.1, { ao: false, faces: 'tnsewb', tint: [0.5, 0.42, 0.34] });
    P.ellipsoid(ctx, 'burlap', x, 2.62 + u, z, 0.17, 0.2, 0.16, [0.6, 0.52, 0.4]);
    wb.cylinder('straw', x, 2.76 + u, z, 0.42, 0.42, 0.03, 10, { ao: false, capTop: true, capBot: true });
    wb.cylinder('straw', x, 2.79 + u, z, 0.18, 0.13, 0.2, 8, { ao: false, capTop: true });
    for (let k = 0; k < 5; k++) P.rod(ctx, V(x + (k - 2) * 0.05, 1.38 + u, z + 0.15), V(x + (k - 2) * 0.09, 1.12 + u, z + 0.2), 0.008, 0.004, 'straw', { segs: 2 });
  }
  P.rod(ctx, V(H.x1 - t - 0.1, 0, 21.2), V(H.x1 - t - 0.25, 1.4, 21.4), 0.02, 0.02, 'timber', { segs: 4 });
  P.basket(ctx, H.x1 - t - 0.6, 0, 21.1, { tipped: true, rot: 0.8 });
  // (lo de dentro no se pisa: la rejilla de la superficie lo deja macizo)
  (ctx.houseRects || (ctx.houseRects = [])).push({ x0: H.x0, z0: H.z0, x1: H.x1, z1: H.z1, front: 'n', huerto: true });
  // los sumideros de la calle, encima de los óculos del colector: la piedra
  // y su reja
  for (const [gx, gz] of REJAS()) {
    const s = 0.62;
    wb.box('ashlar', gx - s - 0.12, -0.02, gz - s - 0.12, gx + s + 0.12, 0.03, gz + s + 0.12, { ao: false, faces: 't', tint: [0.6, 0.58, 0.54] });
    for (let k = 0; k < 6; k++) {
      const bx = gx - s + 0.1 + k * 0.205;
      wb.box('iron', bx - 0.025, 0.03, gz - s + 0.05, bx + 0.025, 0.05, gz + s - 0.05, { ao: false, faces: 'tnsew' });
    }
  }
}

// ------------------------------------------------------------------------ lo verde
function verde(ctx) {
  const G = VERGEL,
    D = G.derrubio;
  const [x0, z0, x1, z1] = G.sala;
  const rr = new RNG(10001);
  const ctxR = { room: ROOM };
  ctx.wb.setRoom(ROOM);
  const Bo = G.botica;
  const enBotica = (x, z, m = 0) => inR(x, z, [Bo.x0, Bo.z0, Bo.x1, Bo.z1], m);
  const libre = (x, z, m = 0.4) => x > x0 + m && x < x1 - m && z > z0 + m && z < z1 - m && !enAgua(x, z, 0.15 + m * 0.3) && !enRellano(x, z, 0.3) && !junto(x, z, 0.42 + m) && !enBotica(x, z) && Math.hypot(x - G.tapa.x, z - G.tapa.z) > 1.1;
  const muerto = (x, z) => z < G.raya.z + 2.6 && x > G.raya.x0 - 2.4 && x < G.raya.x1 + 2.4;
  const colores = [null, null, null, [0.66, 0.74, 1.0], [1.0, 0.92, 0.56], [1.0, 0.74, 0.84]];
  // ---------------------------------------------------------- el prado del derrubio
  for (let k = 0; k < 110; k++) {
    const a = rr.range(0, Math.PI * 2),
      d = Math.sqrt(rr.next()) * (D.r1 + 0.6);
    const x = D.x + Math.cos(a) * d,
      z = D.z + Math.sin(a) * d;
    if (!libre(x, z)) continue;
    hierba(ctx, x, altoVergel(x, z) - 0.02, z, 0.4, d < D.r0 + 1 ? 12 : 8, 10010 + k, { ...ctxR, h: d < D.r0 + 1.5 ? 0.55 : 0.4 });
  }
  for (let k = 0; k < 60; k++) {
    const a = rr.range(0, Math.PI * 2),
      d = Math.sqrt(rr.next()) * (D.r0 + 2.4);
    const x = D.x + Math.cos(a) * d,
      z = D.z + Math.sin(a) * d;
    if (!libre(x, z)) continue;
    flores(ctx, x, altoVergel(x, z) - 0.01, z, 0.3, 6, 10140 + k, { ...ctxR, tint: rr.pick(colores) || undefined, h: 1.1 });
  }
  for (let k = 0; k < 40; k++) {
    const a = rr.range(0, Math.PI * 2),
      d = rr.range(D.r0 + 0.4, D.r1 + 0.8);
    const x = D.x + Math.cos(a) * d,
      z = D.z + Math.sin(a) * d;
    if (!libre(x, z, 0.6)) continue;
    if (k % 2) mata(ctx, x, altoVergel(x, z), z, rr.range(0.4, 0.8), 15000 + k, ctxR);
    else helecho(ctx, x, altoVergel(x, z) - 0.02, z, rr.range(1.0, 1.7), 15100 + k, ctxR);
  }
  // los árboles: la higuera del derrubio, los saúcos en flor, un avellano
  higuera(ctx, 9.4, altoVergel(9.4, 18.8), 18.8, 3.4, 10241, { ...ctxR, lean: [0.04, -0.04], ramas: 9 });
  arbolillo(ctx, 6.6, altoVergel(6.6, 14.2), 14.2, 2.6, 10242, { ...ctxR, flores: true, lean: [0.1, 0.12] });
  arbolillo(ctx, 13.4, altoVergel(13.4, 20.9), 20.9, 2.3, 10243, { ...ctxR, flores: true, lean: [-0.1, -0.06] });
  arbolillo(ctx, 17.6, G.y, 14.2, 2.0, 10244, { ...ctxR, lean: [-0.14, 0.08], varas: 5 });
  arbolillo(ctx, 12.4, G.y, 28.6, 2.2, 10245, { ...ctxR, flores: true, lean: [0.06, -0.1] });
  higuera(ctx, 21.8, G.y, 28.4, 2.6, 10246, { ...ctxR, lean: [-0.1, -0.04], ramas: 8 });
  arbolillo(ctx, 32.4, G.y, 18.6, 2.4, 10247, { ...ctxR, flores: true, lean: [-0.08, 0.06] });
  arbolillo(ctx, 22.6, G.y, 37.8, 2.1, 10248, { ...ctxR, lean: [0.05, -0.1], varas: 4 });
  // los troncos caídos (con su musgo y sus hongos) y las piedras
  tronco(ctx, 14.2, altoVergel(14.2, 17.4), 17.4, 0.7, 2.4, 0.2, 10251, ctxR);
  tronco(ctx, 19.6, G.y, 21.0, -0.4, 3.0, 0.24, 10252, { ...ctxR, luz: true });
  tronco(ctx, 20.4, G.y, 33.6, 2.6, 2.2, 0.18, 10253, { ...ctxR, luz: true });
  for (let k = 0; k < 36; k++) {
    const x = rr.range(x0 + 1, x1 - 1),
      z = rr.range(z0 + 1, z1 - 1);
    if (!libre(x, z, 0.6) || muerto(x, z)) continue;
    const s = rr.range(0.18, 0.45);
    P.roughStone(ctx, x, altoVergel(x, z) - 0.05, z, s, 10260 + k, { tint: [0.42, 0.42, 0.38] });
    musgo(ctx, x, altoVergel(x, z) + s * 0.55, z, s * 0.9, s * 0.8, 10310 + k, { ...ctxR, n: 5 });
    if (rr.chance(0.4)) helecho(ctx, x + s, altoVergel(x + s, z), z + s * 0.4, rr.range(0.5, 0.9), 10360 + k, ctxR);
  }
  // ---------------------------------------------------------- lo de la orilla
  // (a lo largo de los canales: juncos, helechos, el musgo; los nenúfares en
  // el estanque y en la alberca)
  const orillas = [];
  for (const r of AGUAS()) {
    const per = 2 * (r[2] - r[0] + r[3] - r[1]);
    const n = Math.max(3, Math.round(per / 1.5));
    for (let k = 0; k < n; k++) {
      const u = (k + rr.range(0.1, 0.9)) / n;
      let x, z;
      const L = u * per;
      const w = r[2] - r[0],
        h = r[3] - r[1];
      if (L < w) [x, z] = [r[0] + L, r[1] - 0.35];
      else if (L < w + h) [x, z] = [r[2] + 0.35, r[1] + L - w];
      else if (L < 2 * w + h) [x, z] = [r[2] - (L - w - h), r[3] + 0.35];
      else [x, z] = [r[0] - 0.35, r[3] - (L - 2 * w - h)];
      if (!libre(x, z, 0.3) || muerto(x, z)) continue;
      orillas.push([x, z]);
    }
  }
  orillas.forEach(([x, z], k) => {
    const y = altoVergel(x, z);
    if (k % 3 === 0) juncos(ctx, x, y, z, 0.3, 9, 10400 + k, { ...ctxR, h: 1.1 });
    else if (k % 3 === 1) helecho(ctx, x, y, z, rr.range(0.55, 0.9), 10500 + k, ctxR);
    else flores(ctx, x, y, z, 0.25, 5, 10600 + k, { ...ctxR, tint: [0.7, 0.78, 1.0] });
    musgo(ctx, x, y, z, 0.5, 0.4, 10700 + k, { ...ctxR, n: 5 });
  });
  const E = G.estanque;
  nenufares(ctx, (E[0] + E[2]) / 2, G.agua - 0.05, (E[1] + E[3]) / 2, 1.4, 16, 10801, { ...ctxR, flor: 0.35 });
  const A = G.alberca;
  nenufares(ctx, (A[0] + A[2]) / 2 + 0.4, G.agua, A[3] - 0.6, 0.7, 5, 10802, { ...ctxR, flor: 0.3, tint: [1.0, 0.78, 0.86] });
  // ---------------------------------------------------------- en los muros y los pilares
  // (la hiedra que baja de los lunetos y de los capiteles, el musgo y los
  // helechos al pie)
  const muros = [
    ['n', [x0, x1], z0],
    ['s', [x0, x1], z1],
    ['w', [z0, z1], x0],
    ['e', [z0, z1], x1],
  ];
  let kk = 0;
  for (const [side, [a0, a1], line] of muros) {
    const nrm = { n: [0, 1], s: [0, -1], w: [1, 0], e: [-1, 0] }[side];
    for (let u = a0 + 0.8; u < a1 - 0.5; u += rr.range(1.2, 2.2)) {
      kk++;
      const x = side === 'n' || side === 's' ? u : line + nrm[0] * 0.05,
        z = side === 'n' || side === 's' ? line + nrm[1] * 0.05 : u;
      const px = x + nrm[0] * 0.4,
        pz = z + nrm[1] * 0.4;
      if (enRellano(px, pz, 0.5) || enAgua(px, pz, 0.1) || muerto(px, pz)) continue;
      const yb = altoVergel(px, pz);
      if (!enBotica(px, pz)) {
        musgo(ctx, px, yb, pz, 0.7, 0.4, 10900 + kk, { ...ctxR, n: 7 });
        if (kk % 2 === 0) helecho(ctx, px + nrm[0] * 0.25, yb, pz + nrm[1] * 0.25, rr.range(0.6, 1.1), 11000 + kk, ctxR);
      }
      if (kk % 3 !== 0) for (let q = 0; q < 2; q++) hiedra(ctx, x + (q - 0.5) * 0.36 * Math.abs(nrm[1]), G.ys + rr.range(0.2, 1.4), z + (q - 0.5) * 0.36 * Math.abs(nrm[0]), rr.range(1.8, 5.2), 11100 + kk * 5 + q, { ...ctxR, dir: nrm, hoja: 1.8 });
    }
  }
  PILARES().forEach(([px, pz], k) => {
    if (k % 2 === 0) for (let q = 0; q < 4; q++) {
      const a = (q / 4) * Math.PI * 2 + k;
      hiedra(ctx, px + Math.cos(a) * 0.47, G.ys - 0.3, pz + Math.sin(a) * 0.47, rr.range(1.6, 4.4), 11500 + k * 4 + q, { ...ctxR, dir: [Math.cos(a), Math.sin(a)], hoja: 1.6 });
    }
    const yb = altoVergel(px, pz);
    if (!enAgua(px, pz, 0.8) && !muerto(px, pz)) {
      musgo(ctx, px + 0.55, yb, pz, 0.4, 0.5, 11600 + k, { ...ctxR, n: 5 });
      if (k % 3 === 1) helecho(ctx, px - 0.6, yb, pz + 0.3, rr.range(0.7, 1.1), 11700 + k, ctxR);
    }
  });
  // las raíces que bajan por las juntas de las claves, y las lianas
  for (let i = 0; i < G.xs.length - 1; i++)
    for (let j = 0; j < G.zs.length - 1; j++) {
      if (G.hundidas.some(([a, b]) => a === i && b === j)) continue;
      if (G.rejas.some(([a, b]) => a === i && b === j)) continue;
      const [cx, cz] = tramoC(i, j);
      const crown = G.ys + G.rise - 0.05;
      if (muerto(cx, cz)) continue;
      if ((i + j) % 2 === 0) raices(ctx, cx + rr.range(-0.8, 0.8), crown, cz + rr.range(-0.8, 0.8), 4, rr.range(1.2, 2.4), 11300 + i * 10 + j, ctxR);
      if ((i * 3 + j) % 3 !== 0) {
        const n = rr.chance(0.5) ? 2 : 1;
        for (let q = 0; q < n; q++) {
          const lx = cx + rr.range(-1.6, 1.6),
            lz = cz + rr.range(-1.6, 1.6);
          const top = G.ys + G.rise * Math.sqrt(Math.max(0, 1 - Math.max(Math.abs(lx - cx) / 2.5, Math.abs(lz - cz) / 2.5) ** 2)) - 0.1;
          hiedra(ctx, lx, top, lz, rr.range(2.0, Math.min(6.5, top - G.y - 1.6)), 14600 + i * 20 + j * 2 + q, { ...ctxR, hoja: 1.6 });
        }
      }
    }
  // ---------------------------------------------------------- los hongos que dan luz
  for (const [x, z, n, s] of [
    [33.8, 15.2, 9, 1.1],
    [33.6, 21.0, 7, 1.0],
    [33.4, 36.0, 10, 1.2],
    [29.6, 40.4, 8, 1.0],
    [22.0, 40.6, 9, 1.1],
    [19.4, 31.0, 6, 1.0],
    [24.4, 22.2, 6, 1.0],
    [15.6, 12.4, 7, 1.0],
    [20.6, 12.6, 7, 1.0],
    [5.8, 31.0, 6, 0.9],
    [14.4, 26.9, 6, 0.9],
  ]) {
    if (!libre(x, z, 0.2)) continue;
    hongos(ctx, x, altoVergel(x, z), z, n, 11400 + Math.round(x * 10 + z), { ...ctxR, luz: true, s, r: 0.35 });
    musgo(ctx, x, altoVergel(x, z), z, 0.6, 0.5, 11800 + Math.round(x * 10 + z), { ...ctxR, n: 6 });
  }
  // ---------------------------------------------------------- lo que lo llena todo
  // (por todo el suelo, menos donde pisa él y lo muerto de la boca de la
  // Sé: matas, helechos grandes, hierba alta y flores donde cae alguna luz)
  const rj = REJAS();
  const luzEn = (x, z) => Math.hypot(x - D.x, z - D.z) < D.r1 + 1 || rj.some(([gx, gz]) => Math.hypot(x - gx, z - gz) < 3);
  for (let k = 0; k < 230; k++) {
    const x = rr.range(x0 + 0.6, x1 - 0.6),
      z = rr.range(z0 + 0.6, z1 - 0.6);
    if (!libre(x, z, 0.5) || muerto(x, z)) continue;
    // (el camino de la escalera a la botica y a la boca de la Sé, más limpio)
    if (Math.abs(x - 7.0) < 0.9 && z > 29) continue;
    const y = altoVergel(x, z);
    const w = Math.min(x - x0, x1 - x, z - z0, z1 - z);
    const r = rr.next();
    if (w < 3.2 && r < 0.45) mata(ctx, x, y, z, rr.range(0.35, 0.75), 12900 + k, ctxR);
    else if (r < 0.62) helecho(ctx, x, y - 0.02, z, rr.range(1.0, 1.7), 13200 + k, ctxR);
    else if (r < 0.88) hierba(ctx, x, y - 0.02, z, 0.45, 12, 13500 + k, { ...ctxR, h: luzEn(x, z) ? 0.6 : 0.45 });
    else if (luzEn(x, z)) flores(ctx, x, y - 0.01, z, 0.35, 7, 13800 + k, { ...ctxR, tint: rr.pick(colores) || undefined, h: 1.1 });
    else hongos(ctx, x, y, z, 5, 14100 + k, { ...ctxR, luz: rr.chance(0.5), r: 0.25 });
  }
  // (bajo cada sumidero, su corro de flores y de hierba)
  for (const [gx, gz] of rj)
    for (let k = 0; k < 10; k++) {
      const a = rr.range(0, Math.PI * 2),
        d = rr.range(0.2, 1.9);
      const x = gx + Math.cos(a) * d,
        z = gz + Math.sin(a) * d;
      if (!libre(x, z, 0.3)) continue;
      if (k % 2) flores(ctx, x, altoVergel(x, z) - 0.01, z, 0.3, 7, 14400 + k + Math.round(gx * 7), { ...ctxR, tint: rr.pick(colores) || undefined, h: 1.2 });
      else hierba(ctx, x, altoVergel(x, z) - 0.02, z, 0.4, 12, 14500 + k + Math.round(gx * 7), { ...ctxR, h: 0.65 });
    }
  // (los sumideros: la hiedra que baja por ellos)
  for (const [gx, gz] of rj)
    for (let k = 0; k < 6; k++) {
      const sd = k < 3 ? -1 : 1;
      hiedra(ctx, gx - 0.4 + (k % 3) * 0.4, -0.3, gz + sd * 0.58, rr.range(3.0, 6.2), 9970 + k + Math.round(gx * 3), { ...ctxR, dir: [0, -sd], hoja: 1.2 });
    }
  ctx.wb.setRoom(null);
}

// ------------------------------------------------------------------------ la fuente
// Un caño de los romanos en el muro de levante, que aún mana: el agua limpia
// cae a su pila, que rebosa por el reguero al estanque. Él viene aquí a por
// el agua de sus remedios.
function fuente(ctx, L) {
  const wb = ctx.wb;
  const F = VERGEL.fuente,
    Pi = VERGEL.pila;
  wb.setRoom(ROOM);
  // la cara de piedra del caño: un sillar con su mascarón gastado
  wb.box('ashlar', F.x - 0.06, F.y - 0.5, F.z - 0.55, F.x, F.y + 0.75, F.z + 0.55, { ao: false, faces: 'tnsewb', tint: [0.52, 0.52, 0.48] });
  P.ellipsoid(ctx, 'ashlar', F.x - 0.1, F.y + 0.25, F.z, 0.12, 0.22, 0.2, [0.5, 0.5, 0.46], { room: ROOM });
  wb.box('ashlar', F.x - 0.42, F.y - 0.08, F.z - 0.09, F.x - 0.04, F.y, F.z + 0.09, { ao: false, faces: 'tnsewb', tint: [0.5, 0.5, 0.46] });
  wb.box('mossstone', F.x - 0.43, F.y - 0.002, F.z - 0.05, F.x - 0.04, F.y + 0.004, F.z + 0.05, { ao: false, faces: 't', tint: [0.3, 0.4, 0.3] });
  wb.box('black', F.x - 0.42, F.y - 0.06, F.z - 0.04, F.x - 0.41, F.y - 0.01, F.z + 0.04, { ao: false, faces: 'w', grime: false });
  musgo(ctx, F.x - 0.25, F.y + 0.76, F.z, 0.35, 0.5, 12001, { room: ROOM, n: 6 });
  for (let k = 0; k < 6; k++) hiedra(ctx, F.x - 0.08, F.y + 0.74, F.z - 0.5 + k * 0.2, 0.8 + k * 0.3, 12010 + k, { room: ROOM, dir: [-1, 0], hoja: 1.2 });
  helecho(ctx, Pi[0] - 0.4, VERGEL.y, Pi[1] - 0.4, 0.9, 12021, { room: ROOM });
  helecho(ctx, Pi[0] - 0.5, VERGEL.y, Pi[3] + 0.5, 0.8, 12022, { room: ROOM });
  // su cántaro, junto a la pila
  P.jar(ctx, Pi[0] - 0.35, VERGEL.y, Pi[3] + 0.2, 0.7, { collide: false, tint: [0.6, 0.46, 0.34] });
  wb.setRoom(null);
  L.interact.push({ kind: 'examine', id: 'x_fuente_vergel', text: 'fuenteVergel', x: Pi[0] - 0.5, y: VERGEL.y, z: (Pi[1] + Pi[3]) / 2, r: 1.8 });
}

// ------------------------------------------------------------------------ la botica
// En el rincón del suroeste: donde busca su cura. La mesa de tablas contra el
// muro del sur (el mortero y su mano, los tarros tapados con trapo, los
// cuencos con lo machacado, las flores blancas en su vaso, el cuaderno
// abierto, el cuchillo, el cabo de vela); encima, rayado en el muro, lo que
// ha probado; la cuerda con las hierbas que se secan; el fuego con el
// puchero de los cocimientos; el alambique de dos ollas y una caña; los
// estantes con sus tarros; el lebrillo con el agua de la fuente y los trapos
// verdes de los emplastos; el tocón donde se sienta; el jergón; la mampara
// de cañizo que le cierra el rincón.
function botica(ctx, L) {
  const wb = ctx.wb,
    col = ctx.col;
  const B = VERGEL.botica,
    M = B.mesa,
    y = VERGEL.y;
  wb.setRoom(ROOM);
  // la mesa
  const top = y + 0.8;
  P.table(ctx, M.x, y, M.z, M.w, M.d, 0);
  {
    // (él, de pie ante el canto de la mesa, de cara al muro: delante, a su
    // derecha, el mortero; a su izquierda, el cuaderno abierto; al fondo,
    // contra el muro, los tarros, los cuencos, las flores y la vela)
    const mx = M.x - 0.28,
      mz = M.z - 0.2;
    wb.cylinder('rock', mx, top, mz, 0.12, 0.15, 0.13, 9, { ao: false, capBot: true, tint: [0.56, 0.55, 0.5] });
    wb.cylinder('black', mx, top + 0.11, mz, 0.095, 0.095, 0.01, 9, { ao: false, capTop: true, grime: false, tint: [0.22, 0.34, 0.18] });
    P.rod(ctx, V(mx, top + 0.07, mz), V(mx - 0.06, top + 0.29, mz - 0.1), 0.022, 0.03, 'rock', { segs: 4, tint: [0.6, 0.58, 0.54] });
    const tr = new RNG(12111);
    for (let k = 0; k < 7; k++) {
      const x = M.x - 0.62 + (k % 4) * 0.22 + (k >= 4 ? 0.11 : 0),
        z = M.z + 0.22 - (k >= 4 ? 0.17 : 0);
      const s = tr.range(0.32, 0.46);
      P.jar(ctx, x, top, z, s, {
        collide: false,
        tint: tr.pick([
          [0.62, 0.44, 0.3],
          [0.5, 0.42, 0.34],
          [0.66, 0.56, 0.42],
        ]),
      });
      wb.cylinder('burlap', x, top + 0.6 * s, z, 0.07 * s * 1.6, 0.06 * s * 1.6, 0.03, 6, { ao: false, capTop: true, tint: [0.6, 0.54, 0.44] });
    }
    bowl(ctx, M.x - 0.62, top, M.z - 0.16, 0.1, ROOM, ['black', [0.26, 0.42, 0.2]]);
    bowl(ctx, M.x + 0.8, top, M.z + 0.05, 0.09, ROOM, ['black', [0.42, 0.34, 0.22]]);
    bowl(ctx, M.x - 0.84, top, M.z + 0.05, 0.08, ROOM, ['black', [0.8, 0.8, 0.74]]);
    P.jar(ctx, M.x + 0.62, top, M.z + 0.22, 0.3, { collide: false, tint: [0.7, 0.6, 0.48] });
    flores(ctx, M.x + 0.62, top + 0.17, M.z + 0.22, 0.03, 5, 12121, { room: ROOM, h: 0.7 });
    const bx = M.x + 0.05,
      bz0 = M.z - 0.34,
      bz1 = M.z - 0.08;
    wb.box('leather', bx - 0.02, top, bz0 - 0.02, bx + 0.6, top + 0.006, bz1 + 0.02, { ao: false, faces: 'tnsew', tint: [0.4, 0.3, 0.22] });
    wb.box('clothWhite', bx, top + 0.006, bz0, bx + 0.28, top + 0.016, bz1, { ao: false, faces: 'tnsew', tint: [0.86, 0.8, 0.66] });
    wb.box('clothWhite', bx + 0.3, top + 0.006, bz0, bx + 0.58, top + 0.016, bz1, { ao: false, faces: 'tnsew', tint: [0.86, 0.8, 0.66] });
    for (let k = 0; k < 6; k++) for (const px of [bx + 0.03, bx + 0.33]) wb.box('black', px, top + 0.017, bz0 + 0.04 + k * 0.03, px + (k === 5 ? 0.12 : 0.22), top + 0.018, bz0 + 0.048 + k * 0.03, { ao: false, faces: 't', grime: false, tint: [0.3, 0.26, 0.24] });
    P.rod(ctx, V(bx + 0.62, top + 0.01, bz1), V(bx + 0.76, top + 0.02, bz0 + 0.04), 0.004, 0.003, 'feathers', { segs: 2 });
    wb.box('iron', mx - 0.36, top, mz - 0.12, mx - 0.14, top + 0.01, mz - 0.09, { ao: false, faces: 'tnsew' });
    wb.box('wooddark', mx - 0.48, top, mz - 0.125, mx - 0.36, top + 0.02, mz - 0.085, { ao: false, faces: 'tnsew' });
    wb.cylinder('candle', M.x + 0.86, top, M.z + 0.24, 0.025, 0.025, 0.07, 6, { ao: false, capTop: true });
    if (ctx.fires) ctx.fires.push({ x: M.x + 0.86, y: top + 0.09, z: M.z + 0.24, s: 0.12 });
    for (let k = 0; k < 5; k++) P.rod(ctx, V(M.x - 0.5, top + 0.01, M.z + 0.0 + k * 0.02), V(M.x - 0.22, top + 0.015, M.z - 0.06 + k * 0.03), 0.004, 0.003, 'hierba', { segs: 2, tint: [0.5, 0.62, 0.38] });
  }
  // lo rayado en el muro, encima de la mesa (la lista de los remedios) y, en
  // otro sillar, HERMOSA
  {
    const z1 = VERGEL.sala[3];
    const rasca = (mat, x, yy, z, ry, w, h) => wb.geometry(mat, new THREE.PlaneGeometry(w, h), new THREE.Matrix4().compose(V(x, yy, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0.02)), V(1, 1, 1)), { ao: false, grime: false });
    rasca('scratchRemedios', M.x, y + 1.78, z1 - 0.012, Math.PI, 1.22, 1.6);
    rasca('scratchHermosa', M.x + 1.5, y + 1.45, z1 - 0.012, Math.PI, 0.85, 0.2);
  }
  // los estantes del muro de poniente, con sus tarros
  {
    const jr = new RNG(12501);
    const x0 = VERGEL.sala[0];
    for (let k = 0; k < 3; k++) wb.box('planks', x0, y + 0.88 + k * 0.45, 36.2, x0 + 0.5, y + 0.9 + k * 0.45, 39.8, { ao: false, faces: 'tnsewb', tint: [0.5, 0.44, 0.38] });
    for (const zz of [36.3, 39.7]) wb.box('wooddark', x0 + 0.02, y, zz - 0.04, x0 + 0.48, y + 1.85, zz + 0.04, { ao: false, faces: 'tnsew', tint: [0.46, 0.4, 0.34] });
    for (let k = 0; k < 9; k++) {
      const z = 36.6 + (k % 6) * 0.52;
      P.jar(ctx, x0 + 0.25 + jr.range(-0.05, 0.05), y + 0.9 + (k % 3) * 0.45, z, jr.range(0.22, 0.34), { collide: false, tint: [0.6, 0.48, 0.36] });
    }
    col.add(x0, y, 36.2, x0 + 0.5, y + 1.9, 39.8);
  }
  // la cuerda con las hierbas que se secan (del pilar al muro), encima del
  // fuego: el humo las seca; los trapos de los emplastos, tendidos en ella
  {
    const a = V(10.3, y + 2.7, 36.9),
      b = V(13.6, y + 2.6, 41.4);
    P.rod(ctx, a, b, 0.008, 0.008, 'rope', { segs: 6 });
    wb.box('iron', b.x - 0.03, b.y - 0.03, b.z - 0.1, b.x + 0.03, b.y + 0.03, b.z, { ao: false, faces: 'tnsewb' });
    for (let k = 0; k < 11; k++) {
      const t = (k + 0.5) / 11;
      const p = a.clone().lerp(b, t);
      herbBunch(ctx, p.x, p.y - 0.02, p.z, 12201 + k, ROOM, 0.2 + (k % 3) * 0.04);
    }
    for (let k = 0; k < 3; k++) {
      const q = a.clone().lerp(b, 0.12 + k * 0.05);
      wb.box('clothWhite', q.x - 0.07, q.y - 0.38, q.z - 0.01, q.x + 0.07, q.y - 0.02, q.z + 0.01, { ao: false, faces: 'nsew', tint: [0.52, 0.62, 0.42] });
    }
  }
  // el fuego, con el puchero de los cocimientos
  {
    const [fx, fz] = B.fuego;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      P.roughStone(ctx, fx + Math.cos(a) * 0.42, y - 0.02, fz + Math.sin(a) * 0.42, 0.12, 12301 + k, { tint: [0.34, 0.32, 0.3] });
    }
    P.firewood(ctx, fx, y, fz, 0.6, 3);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.3;
      P.roughStone(ctx, fx + Math.cos(a) * 0.2, y + 0.02, fz + Math.sin(a) * 0.2, 0.08, 12311 + k, { tint: [0.3, 0.28, 0.26] });
    }
    P.jar(ctx, fx, y + 0.14, fz, 0.42, { collide: false, tint: [0.32, 0.26, 0.22] });
    wb.cylinder('black', fx, y + 0.14 + 0.25, fz, 0.09, 0.09, 0.01, 8, { ao: false, capTop: true, grime: false, tint: [0.3, 0.38, 0.22] });
    if (ctx.fires) ctx.fires.push({ x: fx, y: y + 0.12, z: fz, s: 0.4 });
    col.add(fx - 0.5, y, fz - 0.5, fx + 0.5, y + 0.5, fz + 0.5);
    P.decal(ctx, fx, y + 0.02, fz, 1.6, 'splat', 0.3);
  }
  // el alambique: dos ollas y una caña (lo que destila de las flores)
  {
    const [ax, az] = B.alambique;
    P.roughStone(ctx, ax, y, az, 0.32, 12401, { tint: [0.42, 0.4, 0.38], scl: [1.2, 0.7, 1.0] });
    P.jar(ctx, ax, y + 0.22, az, 0.55, { collide: false, tint: [0.56, 0.42, 0.3] });
    P.jar(ctx, ax + 0.75, y, az + 0.35, 0.4, { collide: false, tint: [0.62, 0.5, 0.36] });
    P.rod(ctx, V(ax + 0.05, y + 0.58, az), V(ax + 0.7, y + 0.28, az + 0.33), 0.018, 0.016, 'straw', { segs: 4 });
    col.add(ax - 0.35, y, az - 0.35, ax + 0.35, y + 0.6, az + 0.35);
  }
  // el lebrillo, el tocón, los sacos, las semillas, el jergón
  {
    bowl(ctx, 11.2, y, 41.0, 0.28, ROOM, ['water', null]);
    wb.box('clothWhite', 10.9, y + 0.17, 40.8, 11.2, y + 0.19, 41.05, { ao: false, faces: 'tnsew', tint: [0.5, 0.6, 0.42] });
    wb.cylinder('wooddark', 11.6, y, 39.6, 0.2, 0.22, 0.42, 9, { ao: false, capTop: true, tint: [0.56, 0.48, 0.4] });
    P.sacks(ctx, 14.2, y, 41.0, 2, 12511);
    P.roughStone(ctx, 6.9, y, 41.0, 0.3, 12521, { tint: [0.5, 0.49, 0.46], scl: [1.3, 0.35, 1.0] });
    for (let k = 0; k < 18; k++) P.ellipsoid(ctx, 'hide', 6.72 + (k % 6) * 0.07, y + 0.12, 40.9 + Math.floor(k / 6) * 0.08, 0.012, 0.01, 0.016, [0.5, 0.42, 0.3]);
    // el jergón (un saco de paja con su manta), junto al fuego
    wb.box('burlap', 13.4, y, 35.6, 14.6, y + 0.16, 37.6, { ao: false, faces: 'tnsew', tint: [0.56, 0.5, 0.4] });
    wb.box('clothWhite', 13.45, y + 0.16, 36.2, 14.55, y + 0.2, 37.6, { ao: false, faces: 'tnsew', tint: [0.46, 0.4, 0.34] });
    P.ellipsoid(ctx, 'burlap', 14.0, y + 0.24, 35.85, 0.3, 0.09, 0.16, [0.6, 0.54, 0.44], { room: ROOM });
  }
  // la mampara de cañizo que le cierra el rincón por el norte (con su
  // hueco de paso, junto al muro)
  {
    const z = B.z0;
    const rr = new RNG(12531);
    for (let x = 7.8; x < 11.6; x += 0.06) P.rod(ctx, V(x, y, z + rr.range(-0.02, 0.02)), V(x + rr.range(-0.03, 0.03), y + 1.6 + rr.range(-0.08, 0.08), z + rr.range(-0.02, 0.02)), 0.014, 0.012, 'straw', { segs: 2, tint: [0.66, 0.6, 0.46] });
    for (const yy of [0.4, 1.2]) P.rod(ctx, V(7.7, y + yy, z - 0.03), V(11.7, y + yy, z - 0.03), 0.015, 0.015, 'wooddark', { segs: 3 });
    for (const x of [7.75, 11.65]) P.rod(ctx, V(x, y, z), V(x, y + 1.7, z), 0.03, 0.025, 'wooddark', { segs: 3 });
    col.add(7.7, y, z - 0.06, 11.7, y + 1.7, z + 0.04);
  }
  wb.setRoom(null);
  L.interact.push({ kind: 'note', id: 'n_remedios', note: 'remedios', x: M.x + 0.34, y: y + 0.84, z: M.z - 0.21, model: 'none' });
  L.interact.push({ kind: 'examine', id: 'x_remedios', text: 'listaRemedios', x: M.x + 1.3, y, z: M.z - 0.75, r: 1.2 });
  L.interact.push({ kind: 'examine', id: 'x_alambique', text: 'alambique', x: B.alambique[0] + 0.5, y, z: B.alambique[1] - 0.5, r: 1.2 });
  // la mesa, para los cocimientos (game/alquimia.js)
  L.interact.push({ kind: 'alquimia', id: 'mesa_desf', x: M.x - 1.25, y, z: M.z - 0.55, r: 1.3 });
}

// ------------------------------------------------------------------------ la raya de candiles
// Ante la boca de la galería de la Sé: sal de pared a pared y, encima, siete
// candiles encendidos con sus flores. Lo verde, que se muere ya a este lado.
function raya(ctx, L) {
  const wb = ctx.wb;
  const R = VERGEL.raya,
    y = VERGEL.y;
  wb.setRoom(ROOM);
  const z = R.z;
  wb.box('bone', R.x0, y + 0.005, z - 0.05, R.x1, y + 0.014, z + 0.05, { ao: false, faces: 'tnsew', grime: false, tint: [1.0, 0.98, 0.94] });
  const n = 7;
  for (let k = 0; k < n; k++) {
    const x = R.x0 + 0.3 + ((R.x1 - R.x0 - 0.6) * k) / (n - 1);
    P.roughStone(ctx, x, y, z, 0.14, 12801 + k, { tint: [0.4, 0.39, 0.36], scl: [1, 0.6, 1] });
    wb.cylinder('plaster', x, y + 0.08, z, 0.06, 0.05, 0.04, 8, { ao: false, capTop: true, capBot: true, tint: [0.62, 0.42, 0.3] });
    wb.box('plaster', x + 0.04, y + 0.1, z - 0.012, x + 0.09, y + 0.115, z + 0.012, { ao: false, faces: 'tnsewb', tint: [0.62, 0.42, 0.3] });
    // (cada llama, en su grupo: la que se apaga a tu espalda, game/lobishome.js)
    ctx.beginGroup('raya:' + k);
    if (ctx.fires) ctx.fires.push({ x: x + 0.085, y: y + 0.13, z, s: 0.1 });
    ctx.endGroup();
    if (k % 2 === 1) {
      P.jar(ctx, x, y, z + 0.3, 0.28, { collide: false, tint: [0.62, 0.48, 0.36] });
      flores(ctx, x, y + 0.16, z + 0.3, 0.03, 4, 12811 + k, { room: ROOM, h: 0.6 });
    }
  }
  // lo que ha rayado en el muro, junto a la boca: NO PASES
  const rasca = (mat, x, yy, zz, ry, w, h) => wb.geometry(mat, new THREE.PlaneGeometry(w, h), new THREE.Matrix4().compose(V(x, yy, zz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, -0.04)), V(1, 1, 1)), { ao: false, grime: false });
  rasca('scratchNoPases', R.x0 - 1.2, y + 1.7, VERGEL.sala[1] + 0.012, 0, 0.9, 0.2);
  // y lo verde, que se muere ya a este lado de la raya
  const rr = new RNG(12821);
  for (let k = 0; k < 10; k++) {
    const x = R.x0 - 1 + rr.range(0, R.x1 - R.x0 + 2),
      zz = z + rr.range(0.4, 2.2);
    musgo(ctx, x, y, zz, 0.5, 0.35, 12830 + k, { room: ROOM, n: 5, k: [0.45, 0.42, 0.38] });
    if (k % 3 === 0) helecho(ctx, x, y, zz, 0.7, 12840 + k, { room: ROOM, k: [0.6, 0.45, 0.3] });
  }
  wb.setRoom(null);
  L.interact.push({ kind: 'examine', id: 'x_raya', text: 'rayaCandiles', x: (R.x0 + R.x1) / 2, y, z: R.z + 0.7, r: 1.8 });
}

// ------------------------------------------------------------------------ la tapa
// La tapa de hierro del pozo que sube de lo hondo, en el enlosado: trabada
// por debajo (se abre desde abajo: game/cloacas.js).
function tapa(ctx, L) {
  const wb = ctx.wb;
  const T = VERGEL.tapa,
    y = VERGEL.y;
  wb.setRoom(ROOM);
  wb.cylinder('ashlar', T.x, y - 0.02, T.z, 0.62, 0.62, 0.04, 14, { ao: false, capTop: true, tint: [0.5, 0.5, 0.46] });
  wb.cylinder('iron', T.x, y + 0.02, T.z, 0.46, 0.46, 0.03, 14, { ao: false, capTop: true, tint: [0.42, 0.36, 0.32] });
  for (const a of [0, Math.PI / 2]) {
    const ca = Math.cos(a) * 0.4,
      sa = Math.sin(a) * 0.4;
    P.rod(ctx, V(T.x - ca, y + 0.055, T.z - sa), V(T.x + ca, y + 0.055, T.z + sa), 0.018, 0.018, 'iron', { segs: 3 });
  }
  wb.setRoom(null);
  L.interact.push({ kind: 'examine', id: 'x_tapa_hondo', text: 'tapaHondo', alt: ['tapa:abierta', 'tapaHondoAbierta'], x: T.x, y, z: T.z, r: 1.3 });
}

// ------------------------------------------------------------------------ la luz
function luces(ctx) {
  const G = VERGEL,
    D = G.derrubio;
  const [sx0, sz0, sx1, sz1] = G.sima;
  const scx = (sx0 + sx1) / 2,
    scz = (sz0 + sz1) / 2;
  const L = (x, y, z, r, g, b, radius, intensity, room = ROOM) => ctx.lights.push({ x, y, z, r, g, b, radius, intensity, room });
  // la luna, por la sima: el prado, fuerte y frío; un rebote por todo
  L(scx, D.y + 3.0, scz, 0.62, 0.74, 0.98, 9.5, 2.6);
  L(scx - 1.5, D.y + 1.0, scz + 1.6, 0.6, 0.74, 0.92, 6, 1.1);
  L(scx, -4.6, scz, 0.5, 0.62, 0.84, 12, 1.0);
  // los sumideros
  for (const [gx, gz] of REJAS()) {
    L(gx, G.y + 2.6, gz, 0.56, 0.68, 0.92, 7, 1.7);
    L(gx, G.ys + 1.4, gz, 0.48, 0.58, 0.8, 5, 0.8);
  }
  // el verde de los hongos
  for (const [x, z] of [
    [33.4, 15.4],
    [33.2, 21.0],
    [33.0, 35.8],
    [29.6, 40.0],
    [22.0, 40.2],
    [19.4, 31.4],
    [24.2, 22.4],
    [15.8, 12.8],
    [20.6, 13.0],
    [6.0, 31.2],
    [14.6, 27.2],
  ])
    L(x, G.y + 0.7, z, 0.3, 0.88, 0.8, 4.6, 1.0);
  // el agua del estanque y la fuente (el cielo que devuelve)
  L(27.5, G.y + 1.8, 29.0, 0.44, 0.62, 0.72, 9, 1.0);
  // la botica (su fuego, cálido), la vela de la mesa y la raya de candiles
  L(G.botica.fuego[0], G.y + 0.8, G.botica.fuego[1], 1.0, 0.62, 0.32, 5.5, 1.5);
  L(G.botica.mesa.x, G.y + 1.4, G.botica.mesa.z - 0.6, 0.95, 0.66, 0.38, 3.5, 0.7);
  L((G.raya.x0 + G.raya.x1) / 2, G.y + 0.5, G.raya.z, 1.0, 0.68, 0.36, 4.5, 0.9);
  // (el rebote de la luna por todo el colector: a lo largo de los muros, a
  // media altura, y bajo cada tramo; verdoso, como lo que lo cubre)
  const [x0, z0, x1, z1] = G.sala;
  for (let x = x0 + 2.5; x < x1; x += 5) {
    L(x, G.y + 3.4, z0 + 2.2, 0.42, 0.6, 0.6, 8, 0.7);
    L(x, G.y + 3.4, z1 - 2.2, 0.42, 0.6, 0.6, 8, 0.7);
  }
  for (let z = z0 + 7.5; z < z1 - 4; z += 5) {
    L(x0 + 2.2, G.y + 3.4, z, 0.42, 0.6, 0.6, 8, 0.7);
    L(x1 - 2.2, G.y + 3.4, z, 0.42, 0.6, 0.6, 8, 0.7);
  }
  for (let i = 0; i < G.xs.length - 1; i++)
    for (let j = 0; j < G.zs.length - 1; j++) {
      const [cx, cz] = tramoC(i, j);
      if (cz < G.raya.z + 3 && Math.abs(cx - G.norte.x) < 4) continue;
      L(cx, G.y + 2.2, cz, 0.4, 0.56, 0.52, 7.5, 0.55);
    }
  if (ctx.dynLights) {
    ctx.dynLights.push({ x: scx - 0.5, y: D.y + 3.2, z: scz + 0.5, intensity: 2.2, range: 9, color: 0xbfd2f4, flicker: 0, priority: 2 });
    ctx.dynLights.push({ x: G.botica.fuego[0], y: G.y + 0.6, z: G.botica.fuego[1], intensity: 1.6, range: 6, color: 0xffa860, flicker: 0.25, priority: 2 });
    ctx.dynLights.push({ x: (G.raya.x0 + G.raya.x1) / 2, y: G.y + 0.4, z: G.raya.z, intensity: 1.0, range: 5, color: 0xffb070, flicker: 0.3, priority: 1 });
  }
  if (ctx.shafts) {
    ctx.shafts.push({ a: [scx + 0.2, -0.4, scz - 0.2], b: [D.x + 0.4, D.y + 0.05, D.z - 0.4], w: 4.2, color: 0xa8bedc, k: 2.6 });
    ctx.shafts.push({ a: [scx - 1.6, -0.4, scz + 0.8], b: [D.x - 1.4, D.y + 0.05, D.z + 1.6], w: 2.0, color: 0x8ea4c8, k: 1.8 });
    ctx.shafts.push({ a: [scx + 2.0, -0.4, scz - 1.0], b: [D.x + 2.6, D.y - 0.2, D.z - 1.4], w: 1.5, color: 0x9fb4d4, k: 1.4 });
    for (const [gx, gz] of REJAS()) ctx.shafts.push({ a: [gx, -0.4, gz], b: [gx + 0.5, G.y + 0.05, gz + 0.3], w: 1.25, color: 0x9fb4d4, k: 0.9 });
  }
}

// ------------------------------------------------------------------------ zonas y mapa
function zonas(L) {
  const G = VERGEL;
  const [x0, z0, x1, z1] = G.sala;
  L.zones.push({ id: 'vergel', rects: [[x0, z0, x1, z1, G.estanqueFondo - 0.5, -1.1]], atmo: 'vergel', room: ROOM });
  // (arriba, en la plaza: la puerta del huerto)
  const H = G.huerto;
  L.interact.push({ kind: 'examine', id: 'x_huerto', text: 'huertoPuerta', x: (H.puerta[0] + H.puerta[1]) / 2, y: 0, z: H.z0 - 0.7, r: 1.5 });
  L.map.push({ id: 'vergel', r: [x0, z0, x1, z1], level: 'cloaca', label: 'vergel' });
}
