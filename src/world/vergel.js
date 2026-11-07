// El Vergel (la cloaca, más allá de la sala de la luz: world/cloaca.js).
//
// El agua de la sala de la luz se va por la reja de levante (sus barrotes,
// doblados: los dobló él). Detrás, el caño de los romanos, con el agua al
// tobillo, y al cabo del caño, una gruta grande: una cueva de la roca en la
// que los romanos echaban el agua de sus cloacas. Encima, el huerto de una
// casa de la plaza se secó con la peste y se hundió: por la sima baja la
// luna, y por los sumideros de la calle, tres rayas más de luz. Abajo ha
// crecido todo lo que arriba se murió: el derrubio de tierra del huerto es un
// prado con su higuera y sus saúcos en flor, las raíces del árbol seco de
// arriba bajan hasta él, el agua cae del caño a una poza y corre en arroyo
// hasta un estanque con nenúfares, donde mana una fuente limpia; en lo
// umbrío dan luz los hongos y por encima del prado van las luciérnagas.
//
// El Desfigurado lo llama el Vergel: dice que la vida no se murió, que se
// escondió aquí abajo. En el rincón del suroeste, bajo la roca, tiene su
// botica: ahí busca con qué curarse (la mesa, el mortero, los tarros, las
// hierbas que se secan, el puchero al fuego, el alambique, el cuaderno de
// los remedios y la lista rayada en la piedra). En el del nordeste, la
// gruta se abre a un paso que va hacia el norte, hacia la Sé y sus
// catacumbas: por ahí entra lo oscuro. Lo verde se muere a la entrada, hay
// zarpazos en la piedra y una cabra arrastrada; él ha puesto una raya de
// candiles de pared a pared. El paso acaba en un derrumbe (por ahora).
//
// Medidas: VERGEL. La rejilla (Q) es la de la cloaca (CLOACA.grid la cubre);
// el agujero de la losa de la sima, level.js (VERGEL.sima). Lo que se mueve
// (las cascadas, las luciérnagas, los ojos de lo oscuro), game/cloaca.js.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { barrelVault } from './builders.js';
import * as P from './props.js';
import { caveWall } from './level_postigo.js';
import { herbBunch, bowl } from './level_souto.js';
import { tapia } from './kit_casa.js';
import { helecho, hierba, flores, musgo, hiedra, raices, juncos, higuera, arbolillo, hongos, nenufares, raizLarga, tronco, mata } from './verdor.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const VERGEL = {
  // el caño de los romanos: de la reja de levante de la sala de la luz a la
  // gruta (el agua al tobillo; ys: el arranque de su bóveda)
  cano: { x0: 0.3, x1: 5.3, z0: 23.2, z1: 24.8, y: -9.35, agua: -9.12, ys: -7.7 },
  // la gruta: su suelo, su techo (y lo que sube y baja), lo que abarca
  y: -11.5,
  techo: -2.6,
  amp: 0.9,
  // (la rejilla del suelo y el techo, cuadrada con la de la cloaca)
  box: [3.5, 8.0, 34.0, 40.0],
  // el contorno, en el sentido de las agujas del reloj visto en el mapa (con
  // el norte arriba), en dos trozos: del paso oscuro, por levante y el sur,
  // a la boca del caño; y de la boca del caño, por el norte, al paso oscuro
  contornoA: [
    [27.6, 9.5],
    [30.4, 10.6],
    [32.2, 14.4],
    [32.9, 19.8],
    [32.8, 25.0],
    [33.2, 28.6],
    [32.6, 32.6],
    [30.6, 36.4],
    [26.8, 38.6],
    [21.0, 39.4],
    [15.2, 39.0],
    [10.4, 38.2],
    [6.6, 36.6],
    [4.8, 33.4],
    [4.4, 29.4],
    [5.3, 26.6],
    [5.3, 24.9],
  ],
  contornoB: [
    [5.3, 23.1],
    [4.6, 20.4],
    [4.3, 16.6],
    [5.0, 12.8],
    [7.6, 10.4],
    [12.0, 9.2],
    [17.4, 9.6],
    [21.6, 8.8],
    [24.4, 9.5],
  ],
  // el saliente de roca de la boca del caño, con su acequia (que gira al sur
  // y cae en cascada a la poza)
  saliente: { x0: 5.3, x1: 8.6, z0: 21.6, z1: 26.4, y: -9.05 },
  acequia: [
    [5.3, 23.4, 7.2, 24.6],
    [6.0, 24.6, 7.2, 26.4],
  ],
  // el derrubio: la tierra del huerto de arriba, que se vino abajo con él;
  // lo alto, llano (r0), y su falda hasta el suelo (r1)
  derrubio: { x: 8.4, z: 19.4, y: -9.2, r0: 2.6, r1: 8.6 },
  // la sima (el agujero en la losa, por metros enteros) y el huerto de encima
  sima: [6, 16, 12, 20],
  huerto: { x0: 3.5, z0: 14, x1: 14, z1: 22, h: 2.8, puerta: [8.2, 9.8] },
  // el agua: la poza bajo la cascada, el arroyo, el estanque, la pila de la
  // fuente y la salida al sumidero (sus lechos; el agua, un poco más ancha)
  poza: [5.4, 26.4, 9.6, 29.6],
  arroyo: [
    [9.6, 27.4, 15.0, 28.8],
    [15.0, 27.6, 22.4, 29.0],
  ],
  estanque: [22.4, 25.2, 29.0, 31.8],
  pila: [29.0, 26.8, 32.4, 30.2],
  salida: [24.6, 31.8, 26.0, 37.8],
  lecho: -12.05,
  agua: -11.72,
  // la fuente: un caño de piedra de los romanos en el muro de levante, que aún
  // mana (x, z: la boca; y: su labio)
  fuente: { x: 32.25, z: 28.5, y: -9.7 },
  // los sumideros de la calle (por donde baja la luna): en el centro de una
  // casilla de un metro del techo
  rejas: [
    [17.5, 27.5],
    [24.5, 19.5],
    [28.5, 23.5],
  ],
  // la botica (el rincón del suroeste, bajo la roca)
  botica: { x0: 5.2, x1: 12.6, z0: 31.2, z1: 37.6, mesa: { x: 8.6, z: 35.8, w: 1.9, d: 0.8 }, fuego: [11.4, 34.5], alambique: [6.2, 34.0] },
  // el paso oscuro (hacia el norte, hacia la Sé y sus catacumbas), el
  // derrumbe que lo cierra y la raya de candiles
  paso: { x0: 24.6, x1: 27.4, z0: -0.6, z1: 9.6, y: -11.3, top: -8.4 },
  raya: { z: 11.6, x0: 23.0, x1: 29.2 },
  // él, en su botica (de cara a la mesa)
  desfigurado: { x: 8.6, z: 35.02, yaw: 0 },
  // donde se ponen las luciérnagas (centro, radio, cuántas)
  luciernagas: [
    [8.6, 19.2, 3.6, 26],
    [12.6, 24.4, 3.0, 14],
    [18.4, 27.0, 3.2, 14],
    [25.6, 28.4, 3.4, 18],
    [9.0, 33.6, 2.4, 8],
  ],
};

const ROOM = 'vergel',
  RCANO = 'vergel_cano',
  ROSC = 'vergel_oscuro';

// ------------------------------------------------------------------------ geometría
const inR = (x, z, r, m = 0) => x >= r[0] - m && x <= r[2] + m && z >= r[1] - m && z <= r[3] + m;
const AGUAS = () => [VERGEL.poza, ...VERGEL.arroyo, VERGEL.estanque, VERGEL.pila, VERGEL.salida];
const enAgua = (x, z, m = 0) => AGUAS().some((r) => inR(x, z, r, m));
const POLY = () => [...VERGEL.contornoA, ...VERGEL.contornoB];
function dentro(x, z, poly = POLY()) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i],
      [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
function distBorde(x, z, poly = POLY()) {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j],
      [bx, bz] = poly[i];
    const dx = bx - ax,
      dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return d;
}

// El alto del suelo de la gruta en (x, z): el llano, el derrubio (una loma
// suave, llana arriba) y los lechos del agua.
export function altoVergel(x, z) {
  const D = VERGEL.derrubio;
  let h = VERGEL.y;
  const d = Math.hypot(x - D.x, z - D.z);
  if (d < D.r1) {
    const t = d <= D.r0 ? 1 : 1 - (d - D.r0) / (D.r1 - D.r0);
    h = VERGEL.y + (D.y - VERGEL.y) * t * t * (3 - 2 * t);
  }
  // (el agua: la orilla baja en rampa hasta el fondo, que se sale de ella)
  const k = hondo(x, z);
  if (k > 0) h += (VERGEL.lecho - h) * k;
  return h;
}
// Lo hondo del agua en (x, z): 0 en seco; en el agua, de la orilla (poco) a
// lo de en medio (1).
function hondo(x, z) {
  if (!enAgua(x, z)) return 0;
  let k = 1;
  for (const [r, v] of [
    [0.3, 0.35],
    [0.6, 0.7],
  ])
    for (let a = 0; a < 8; a++) {
      const ang = (a * Math.PI) / 4;
      if (!enAgua(x + Math.cos(ang) * r, z + Math.sin(ang) * r)) k = Math.min(k, v);
    }
  return k;
}
// (lo de verlo: con sus bultos, menos en el agua y arriba del todo)
function ruido(x, z) {
  return 0.05 * Math.sin(x * 1.7 + z * 0.6) * Math.cos(z * 1.3 - x * 0.4) + 0.025 * Math.sin(x * 4.1 + z * 3.3);
}

export function buildVergel(ctx, Q, L) {
  cano(ctx, Q);
  gruta(ctx, Q);
  saliente(ctx);
  aguas(ctx);
  sima(ctx);
  rejas(ctx);
  verde(ctx);
  fuente(ctx, L);
  botica(ctx, L);
  oscuro(ctx, Q, L);
  luces(ctx);
  zonas(L);
}

// ------------------------------------------------------------------------ el caño
// De la reja de levante de la sala a la gruta: sillería romana, su bóveda de
// medio cañón, el agua al tobillo por todo el suelo; las juntas, reventadas
// por las raíces; los helechos, en las grietas.
function cano(ctx, Q) {
  const wb = ctx.wb,
    col = ctx.col;
  const C = VERGEL.cano;
  const { x0, x1, z0, z1, y, ys } = C;
  Q.paint(x0 - 0.3, z0, x1, z1, 1);
  wb.setRoom(RCANO);
  wb.box('mossstone', x0 - 0.3, y - 0.1, z0, x1, y, z1, { faces: 't', ao: false, sub: 2, tint: [0.36, 0.4, 0.32] });
  col.add(x0 - 0.3, y - 1, z0, x1, y, z1, 'floor').cam = true;
  for (const [za, zb, f] of [
    [z0 - 0.3, z0, 's'],
    [z1, z1 + 0.3, 'n'],
  ]) {
    wb.box('mossstone', x0, y - 0.05, za, x1, y + 0.6, zb, { faces: f, sub: 1.6, aoH: 0.6, aoMin: 0.5, baseY: y, tint: [0.44, 0.5, 0.4] });
    wb.box('ashlar', x0, y + 0.6, za, x1, ys, zb, { faces: f, sub: 1.6, ao: false, tint: [0.42, 0.43, 0.4] });
  }
  barrelVault(ctx, { x0, z0, x1, z1, ys, axis: 'x', mat: 'ashlar', tint: [0.38, 0.4, 0.37], room: RCANO });
  col.add(x0, ys + 0.85, z0, x1, -1.0, z1).cam = true;
  if (ctx.waters) ctx.waters.push({ shape: 'rect', r: [x0 - 0.3, z0, x1, z1], y: C.agua, flow: [0.6, 0], amp: 0.016, deep: 0x060a08, sky: 0x10181a, glint: 0x8aa0b0, light: [x1, y + 2, (z0 + z1) / 2], lightK: 0.5, drips: false });
  // las raíces por las juntas de la bóveda, la hiedra que entra de la gruta,
  // los helechos en las grietas de los muros
  raices(ctx, 1.8, ys + 0.75, 24.0, 3, 1.1, 9801, { room: RCANO });
  raices(ctx, 3.9, ys + 0.7, 23.8, 4, 1.4, 9802, { room: RCANO });
  for (const [x, z, s] of [
    [1.4, z0 + 0.06, 9803],
    [3.2, z1 - 0.06, 9804],
    [4.6, z0 + 0.06, 9805],
  ])
    helecho(ctx, x, y + 0.62, z, 0.5, s, { room: RCANO, n: 6 });
  for (let k = 0; k < 6; k++) hiedra(ctx, x1 - 0.1 - k * 0.12, ys + 0.6 - (k % 2) * 0.1, z0 + 0.2 + k * 0.24, 0.8 + (k % 3) * 0.4, 9806 + k, { room: RCANO, dir: [-1, 0] });
  musgo(ctx, x1 - 0.6, y + 0.02, z0 + 0.35, 0.5, 0.2, 9812, { room: RCANO, n: 6 });
  wb.setRoom(null);
  // (lo poco: el resplandor verdoso de la gruta, al fondo)
  ctx.lights.push({ x: x1 - 0.6, y: y + 1.3, z: (z0 + z1) / 2, r: 0.42, g: 0.62, b: 0.6, radius: 5.5, intensity: 0.7, room: RCANO });
  ctx.lights.push({ x: x0 + 1.2, y: y + 1.2, z: (z0 + z1) / 2, r: 0.4, g: 0.5, b: 0.6, radius: 4, intensity: 0.4, room: RCANO });
}

// ------------------------------------------------------------------------ la gruta
// Los muros de roca (el contorno, con sus dos bocas: el caño y el paso
// oscuro), el techo (con la sima y los sumideros), el suelo (el llano, el
// derrubio y los lechos) y lo que se pisa.
function gruta(ctx, Q) {
  const wb = ctx.wb,
    col = ctx.col;
  const G = VERGEL;
  const poly = POLY();
  const [bx0, bz0, bx1, bz1] = G.box;
  const S = G.saliente;
  wb.setRoom(ROOM);
  // ---------------------------------------------------------- lo que se pisa (y su colisión)
  // (casillas de medio metro, cuadradas con la rejilla de la cloaca: dentro
  // del contorno; el saliente y el caño, aparte)
  const step = 0.5;
  for (let z = bz0; z < bz1 - 1e-6; z += step) {
    let run = null;
    const flush = () => {
      if (!run) return;
      col.add(run.x0, run.h - 1.5, z, run.x1, run.h, z + step, 'floor').cam = true;
      run = null;
    };
    for (let x = bx0; x < bx1 - 1e-6; x += step) {
      const cx = x + step / 2,
        cz = z + step / 2;
      const inside = dentro(cx, cz, poly) && distBorde(cx, cz, poly) > 0.2;
      const onS = inR(cx, cz, [S.x0, S.z0, S.x1, S.z1]);
      if (!inside || onS) {
        flush();
        if (inside && onS) Q.paint(x, z, x + step, z + step, 1);
        continue;
      }
      Q.paint(x, z, x + step, z + step, 1);
      const h = Math.round(altoVergel(cx, cz) * 20) / 20;
      if (run && Math.abs(run.h - h) < 1e-6) run.x1 = x + step;
      else {
        flush();
        run = { x0: x, x1: x + step, h };
      }
    }
    flush();
  }
  // ---------------------------------------------------------- el suelo que se ve
  {
    const nx = Math.round((bx1 - bx0) / step),
      nz = Math.round((bz1 - bz0) / step);
    const H = [];
    for (let j = 0; j <= nz; j++) {
      const row = [];
      for (let i = 0; i <= nx; i++) {
        const x = bx0 + i * step,
          z = bz0 + j * step;
        // (en el borde de los lechos, la orilla baja hasta el fondo)
        const a = altoVergel(x, z);
        row.push(a + (enAgua(x, z, 0.05) || a > G.derrubio.y - 0.05 ? 0 : ruido(x, z)));
      }
      H.push(row);
    }
    const Pt = (i, j) => V(bx0 + i * step, H[j][i], bz0 + j * step);
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const cx = bx0 + (i + 0.5) * step,
          cz = bz0 + (j + 0.5) * step;
        if (!dentro(cx, cz, poly) && distBorde(cx, cz, poly) > 0.9) continue;
        if (inR(cx, cz, [S.x0 + 0.3, S.z0 + 0.3, S.x1 - 0.3, S.z1 - 0.3])) continue;
        const h = altoVergel(cx, cz);
        // (un tapiz verde casi por todo: la hierba donde llega la luz, el musgo
        // en lo demás; la tierra pelada, sólo junto a la botica, donde él
        // pisa, y en el rincón de lo oscuro, donde ya no crece nada)
        const n = Math.sin(cx * 0.9 + cz * 0.4) + Math.cos(cz * 0.7 - cx * 0.3);
        const t = 0.9 + 0.1 * Math.sin(cx * 2.3 + cz * 1.7);
        const luz = h > G.y + 0.15 || G.rejas.some(([gx, gz]) => Math.hypot(cx - gx, cz - gz) < 2.6);
        const pelado = inR(cx, cz, [G.botica.x0 + 1.2, G.botica.z0 + 0.4, G.botica.x1 - 0.6, G.botica.z1]) || (cz < G.raya.z + 2.2 && cx > G.raya.x0 - 1.5);
        let mat = 'grass',
          tint = [0.36 * t, 0.46 * t, 0.3 * t];
        if (enAgua(cx, cz)) {
          mat = 'rock';
          tint = [0.24, 0.28, 0.22];
        } else if (enAgua(cx, cz, 0.7)) {
          mat = 'dirt';
          tint = [0.3, 0.34, 0.24];
        } else if (pelado) {
          mat = 'dirt';
          tint = cz < G.raya.z + 2.2 ? [0.3, 0.28, 0.25] : [0.42, 0.38, 0.31];
        } else if (luz || n > 0.6) {
          mat = 'grass';
          tint = luz ? [0.5 * t, 0.64 * t, 0.38 * t] : [0.42 * t, 0.54 * t, 0.34 * t];
        }
        wb.quad(mat, Pt(i, j), Pt(i, j + 1), Pt(i + 1, j + 1), Pt(i + 1, j), { ao: false, sub: 2, tint, room: ROOM });
      }
  }
  // ---------------------------------------------------------- los muros
  const lo = G.lecho - 0.3;
  const wt = [0.44, 0.42, 0.38];
  const bajo = { h: 2.6, mat: 'grass', tint: [0.32, 0.42, 0.26] };
  caveWall(ctx, G.contornoA, lo, G.techo, { seed: 9821, room: ROOM, tint: wt, out: 0.42, lean: 1.0, closed: false, rowH: 0.95, bajo });
  caveWall(ctx, G.contornoB, lo, G.techo, { seed: 9822, room: ROOM, tint: wt, out: 0.42, lean: 1.0, closed: false, rowH: 0.95, bajo });
  // (encima de las dos bocas, la roca: sobre el caño, de su bóveda al techo;
  // sobre el paso, de su techo al de la gruta)
  {
    const C = VERGEL.cano;
    wb.quad('rock', V(C.x1 + 0.02, C.ys - 0.1, C.z1 + 0.2), V(C.x1 + 0.02, C.ys - 0.1, C.z0 - 0.2), V(C.x1 - 0.2, G.techo - 0.2, C.z0 - 0.3), V(C.x1 - 0.2, G.techo - 0.2, C.z1 + 0.3), { ao: false, sub: 3, tint: wt, room: ROOM });
    wb.quad('rock', V(C.x1 + 0.02, C.ys + 0.9, C.z1 + 0.2), V(C.x1 + 0.02, C.ys + 0.9, C.z0 - 0.2), V(C.x1 + 0.02, C.ys - 0.12, C.z0 - 0.2), V(C.x1 + 0.02, C.ys - 0.12, C.z1 + 0.2), { ao: false, sub: 3, tint: wt, room: ROOM });
    // (la boca del paso: un arco de roca irregular, más ancho que el paso,
    // que arranca detrás de sus muros)
    const Pa = VERGEL.paso;
    const ar = new RNG(9823);
    const n = 9;
    const xa = Pa.x0 - 0.7,
      xb = Pa.x1 + 0.7;
    const arc = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const u = 2 * t - 1;
      arc.push(V(xa + (xb - xa) * t, Pa.y + (Pa.top - Pa.y) * (1 - u * u * u * u) + (k > 0 && k < n ? ar.range(-0.2, 0.12) : -0.3), Pa.z1 - 0.02 + ar.range(-0.08, 0.08)));
    }
    for (let k = 0; k < n; k++) wb.quad('rock', arc[k], arc[k + 1], V(arc[k + 1].x - 0.1, G.techo - 0.3, Pa.z1 + 0.15), V(arc[k].x - 0.1, G.techo - 0.3, Pa.z1 + 0.15), { ao: false, sub: 3, tint: wt, room: ROOM });
    // (y por la cara de dentro del arco, su grueso, de la roca del paso)
    for (let k = 0; k < n; k++) wb.quad('rock', arc[k + 1], arc[k], arc[k].clone().add(V(0, 0.05, -0.6)), arc[k + 1].clone().add(V(0, 0.05, -0.6)), { ao: false, sub: 3, tint: [0.3, 0.29, 0.27], room: ROOM });
  }
  // ---------------------------------------------------------- el techo (con la sima y los sumideros)
  {
    const rng = new RNG(9831);
    const s = 1.0;
    const tx0 = 3,
      tz0 = 8,
      tx1 = 35,
      tz1 = 41;
    const nx = tx1 - tx0,
      nz = tz1 - tz0;
    const h = [];
    for (let j = 0; j <= nz; j++) {
      const r = [];
      for (let i = 0; i <= nx; i++) {
        const x = tx0 + i * s,
          z = tz0 + j * s;
        // (más bajo hacia los muros; más alto hacia la sima)
        const e = Math.min(1, distBorde(x, z, poly) / 4);
        const ds = Math.hypot(x - 9, z - 18);
        r.push(G.techo - 0.5 * (1 - e) + rng.range(0, G.amp) * e + (ds < 6 ? (1 - ds / 6) * 0.6 : 0));
      }
      h.push(r);
    }
    const hueco = (cx, cz) => inR(cx, cz, G.sima) || G.rejas.some(([gx, gz]) => Math.abs(cx - gx) < 0.4 && Math.abs(cz - gz) < 0.4);
    const Pt = (i, j) => V(tx0 + i * s, h[j][i], tz0 + j * s);
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const cx = tx0 + (i + 0.5) * s,
          cz = tz0 + (j + 0.5) * s;
        if (hueco(cx, cz)) continue;
        if (!dentro(cx, cz, poly) && distBorde(cx, cz, poly) > 1.6) continue;
        wb.quad('rock', Pt(i, j), Pt(i + 1, j), Pt(i + 1, j + 1), Pt(i, j + 1), { ao: false, sub: 3, tint: [0.36, 0.35, 0.32], room: ROOM });
      }
    // (para la cámara: la roca del techo, menos los agujeros)
    for (let j = 0; j < nz; j++) {
      let a = null;
      for (let i = 0; i <= nx; i++) {
        const cx = tx0 + (i + 0.5) * s,
          cz = tz0 + (j + 0.5) * s;
        const ok = i < nx && !hueco(cx, cz);
        if (ok && a === null) a = i;
        if (!ok && a !== null) {
          col.add(tx0 + a * s, G.techo - 0.6, tz0 + j * s, tx0 + i * s, -1.0, tz0 + (j + 1) * s).cam = true;
          a = null;
        }
      }
    }
  }
  wb.setRoom(null);
}

// ------------------------------------------------------------------------ el saliente
// La repisa de roca en la boca del caño, con la acequia que la cruza, gira al
// sur y se despeña: de lo alto del derrubio, al norte, se baja a ella sin
// escalón; al este y al sur, un cantil.
function saliente(ctx) {
  const wb = ctx.wb,
    col = ctx.col;
  const S = VERGEL.saliente,
    A = VERGEL.acequia,
    C = VERGEL.cano;
  const lo = VERGEL.lecho - 0.3;
  wb.setRoom(ROOM);
  const rt = [0.42, 0.4, 0.36];
  // lo seco de arriba (en tres trozos, alrededor de la acequia)
  const secos = [
    [S.x0, S.z0, S.x1, A[0][1]],
    [A[0][2], A[0][1], S.x1, S.z1],
    [S.x0, A[0][3], A[1][0], S.z1],
  ];
  for (const [a, b, c, d] of secos) {
    wb.box('rock', a, S.y - 0.1, b, c, S.y, d, { faces: 't', ao: false, sub: 2, tint: [0.4, 0.42, 0.34] });
    col.add(a, lo, b, c, S.y, d, 'floor').cam = true;
  }
  for (const [a, b, c, d] of A) {
    wb.box('mossstone', a, C.y - 0.1, b, c, C.y, d, { faces: 't', ao: false, sub: 2, tint: [0.34, 0.38, 0.3] });
    col.add(a, lo, b, c, C.y, d, 'floor').cam = true;
  }
  // los cantos de la acequia (de su lecho a lo seco)
  const cant = { ao: false, sub: 2, tint: [0.38, 0.4, 0.34] };
  wb.box('rock', A[0][0], C.y, A[0][1], A[0][2], S.y, A[0][1] + 0.01, { ...cant, faces: 's' });
  wb.box('rock', A[0][0], C.y, A[0][3] - 0.01, A[1][0], S.y, A[0][3], { ...cant, faces: 'n' });
  wb.box('rock', A[0][2] - 0.01, C.y, A[0][1], A[0][2], S.y, A[1][3], { ...cant, faces: 'w' });
  wb.box('rock', A[1][0], C.y, A[1][1], A[1][0] + 0.01, S.y, A[1][3], { ...cant, faces: 'e' });
  // el cantil, de roca viva: al sur, al este y al norte (vueltos hacia
  // fuera; donde cae el agua, la roca mojada y verde, por delante)
  caveWall(
    ctx,
    [
      [S.x0, S.z1],
      [S.x1, S.z1],
      [S.x1, S.z0],
      [S.x0, S.z0],
    ],
    lo,
    S.y,
    { seed: 9839, tint: rt, out: 0.24, lean: 0, closed: false, rowH: 0.55, step: 0.5 }
  );
  wb.box('mossstone', A[1][0] + 0.05, lo, S.z1 + 0.01, A[1][2] - 0.05, C.y, S.z1 + 0.02, { faces: 's', sub: 1.2, ao: false, tint: [0.32, 0.38, 0.28] });
  // las piedras del borde, su musgo, los helechos y la hiedra que cuelga
  const rr = new RNG(9841);
  for (let k = 0; k < 9; k++) {
    const t = k / 8;
    const onE = k < 5;
    const px = onE ? S.x1 - 0.1 : S.x0 + 0.3 + (A[1][0] - S.x0 - 0.3) * ((k - 5) / 3);
    const pz = onE ? S.z0 + 0.6 + (S.z1 - S.z0 - 1.0) * t * 1.8 : S.z1 - 0.12;
    if (pz > S.z1 - 0.1) continue;
    P.roughStone(ctx, px, S.y - 0.04, pz, rr.range(0.08, 0.15), 9842 + k, { tint: [0.4, 0.4, 0.36], scl: [1.4, 0.55, 1.2] });
  }
  musgo(ctx, S.x1 - 0.5, S.y, S.z0 + 1.2, 0.5, 0.8, 9851, { n: 10 });
  musgo(ctx, A[1][2] + 0.5, S.y, S.z1 - 0.4, 0.4, 0.3, 9852, { n: 6 });
  helecho(ctx, S.x1 - 0.45, S.y, S.z1 - 0.5, 0.75, 9853);
  helecho(ctx, S.x0 + 0.35, S.y, S.z1 - 0.35, 0.6, 9854);
  for (let k = 0; k < 10; k++) {
    const onE = k < 6;
    const px = onE ? S.x1 + 0.02 : S.x0 + 0.2 + k * 0.08;
    const pz = onE ? S.z0 + 1.8 + k * 0.45 : S.z1 + 0.02;
    hiedra(ctx, px, S.y - 0.02, pz, rr.range(0.8, 2.2), 9860 + k, { dir: onE ? [1, 0] : [0, 1], hoja: 1.3 });
  }
  wb.setRoom(null);
}

// ------------------------------------------------------------------------ el agua
function aguas(ctx) {
  if (!ctx.waters) return;
  const G = VERGEL,
    C = VERGEL.cano,
    A = VERGEL.acequia;
  const D = VERGEL.derrubio;
  const W = { y: G.agua, deep: 0x07100d, sky: 0x24382f, glint: 0xb8d4d0, light: [D.x, -2, D.z], lightK: 0.7, amp: 0.02, drips: false };
  // la acequia del saliente (a la altura del caño) y la cascada
  const Wc = { y: C.agua, deep: 0x060a08, sky: 0x12181a, glint: 0x8aa0b0, light: [7, -6, 24], lightK: 0.5, amp: 0.02, drips: false };
  ctx.waters.push({ ...Wc, shape: 'rect', r: [A[0][0], A[0][1], A[0][2], A[0][3]], flow: [0.6, 0] });
  ctx.waters.push({ ...Wc, shape: 'rect', r: [A[1][0], A[1][1], A[1][2], A[1][3]], flow: [0, 0.6] });
  const m = 0.25;
  const P0 = G.poza;
  ctx.waters.push({ ...W, shape: 'rect', r: [P0[0] - m, P0[1] - m, P0[2] + m, P0[3] + m], flow: [0.25, 0.2], amp: 0.035, cascada: true });
  const [a1, a2] = G.arroyo;
  ctx.waters.push({ ...W, shape: 'rect', r: [P0[2] + m, a1[1] - m, a1[2], a1[3] + m], flow: [0.55, 0] });
  ctx.waters.push({ ...W, shape: 'rect', r: [a2[0], a2[1] - m, a2[2] - m, a2[3] + m], flow: [0.55, 0.03] });
  const E = G.estanque;
  ctx.waters.push({ ...W, shape: 'rect', r: [E[0] - m, E[1] - m, E[2], E[3] + m], flow: [0.06, 0.08], amp: 0.016, light: [VERGEL.rejas[2][0], -1, VERGEL.rejas[2][1]], lightK: 0.9 });
  const Pi = G.pila;
  ctx.waters.push({ ...W, shape: 'rect', r: [Pi[0], Pi[1] - m, Pi[2] + 0.2, Pi[3] + m], flow: [-0.2, 0], amp: 0.03, spot: [G.fuente.x - 0.9, (Pi[1] + Pi[3]) / 2, 1.0, 0.3] });
  const Sa = G.salida;
  ctx.waters.push({ ...W, shape: 'rect', r: [Sa[0] - m, E[3] + m, Sa[2] + m, Sa[3] + 0.4], flow: [0, 0.5] });
}

// ------------------------------------------------------------------------ la sima
// El agujero del techo hasta el huerto de arriba: la tierra y la roca de sus
// paredes, las raíces del árbol seco del huerto que bajan hasta el prado, la
// hiedra que cuelga del borde; arriba, el huerto (buildHuerto).
function sima(ctx) {
  const wb = ctx.wb;
  const [sx0, sz0, sx1, sz1] = VERGEL.sima;
  wb.setRoom(ROOM);
  // la pared del pozo: de un palmo por debajo del techo de la gruta a la
  // calle (la tierra del huerto, arriba; la roca, abajo)
  const ring = [
    [sx0 - 0.1, sz0 + 0.6],
    [sx0 + 1.4, sz0 - 0.1],
    [sx0 + 3.6, sz0 - 0.15],
    [sx1 - 0.6, sz0 - 0.05],
    [sx1 + 0.1, sz0 + 1.2],
    [sx1 + 0.05, sz0 + 2.6],
    [sx1 - 0.2, sz1 + 0.05],
    [sx0 + 3.0, sz1 + 0.1],
    [sx0 + 0.8, sz1 - 0.1],
    [sx0 - 0.1, sz1 - 1.6],
  ];
  caveWall(ctx, ring, VERGEL.techo - 0.7, -1.2, { seed: 9871, room: ROOM, tint: [0.36, 0.34, 0.31], out: 0.22, lean: -0.15, rowH: 0.6 });
  caveWall(ctx, ring, -1.2, 0.02, { seed: 9872, mat: 'dirt', room: ROOM, tint: [0.34, 0.29, 0.24], out: 0.25, lean: -0.1, rowH: 0.4 });
  // las raíces: las del árbol seco (al este) y otras, de lo que había en el
  // huerto; las largas llegan al prado
  const rr = new RNG(9881);
  for (let k = 0; k < 9; k++) {
    const z = sz0 + 0.4 + k * 0.42;
    const len = k % 3 === 0 ? 8.6 - rr.range(0, 0.6) : rr.range(2.5, 6.5);
    raizLarga(ctx, sx1 - 0.05 + rr.range(-0.1, 0.1), -0.25, z, len, 9882 + k, { r: k % 3 === 0 ? 0.05 : rr.range(0.018, 0.035), dx: rr.range(-1.2, -0.3), dz: rr.range(-0.3, 0.3) });
  }
  for (let k = 0; k < 7; k++) {
    const sd = k % 2;
    const x = sd ? sx0 + 0.6 + k * 0.7 : sx0 + 0.3 + k * 0.75;
    raizLarga(ctx, x, -0.3, sd ? sz1 + 0.02 : sz0 - 0.02, rr.range(1.4, 4.2), 9900 + k, { r: rr.range(0.012, 0.026), dz: sd ? -0.4 : 0.4 });
  }
  // la hiedra del borde, que cuelga hacia la luz
  for (let k = 0; k < 30; k++) {
    const sd = k % 4;
    const u = rr.range(0.05, 0.95);
    const px = sd === 0 ? sx0 + 0.02 : sd === 1 ? sx1 - 0.02 : sx0 + (sx1 - sx0) * u;
    const pz = sd === 2 ? sz0 + 0.02 : sd === 3 ? sz1 - 0.02 : sz0 + (sz1 - sz0) * u;
    const dir = sd === 0 ? [1, 0] : sd === 1 ? [-1, 0] : sd === 2 ? [0, 1] : [0, -1];
    hiedra(ctx, px, rr.range(-0.6, 0.0), pz, rr.range(1.6, 5.8), 9910 + k, { dir, hoja: 1.5 });
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
    const tr = [V(12.7, -0.05, 20.6), V(12.3, 1.4, 20.0), V(11.4, 2.7, 19.1), V(10.2, 3.7, 18.3), V(9.1, 4.3, 17.6)];
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
    // las raíces al aire, del tronco al borde del agujero
    for (let k = 0; k < 5; k++) {
      const z = 17.2 + k * 0.7;
      P.rod(ctx, V(12.6, 0.05, 20.4), V(sx1 + 0.05, -0.05, z), 0.07, 0.04, 'wooddark', { segs: 5, tint: [0.4, 0.34, 0.28] });
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
  // los bancales secos (las coles que se quedaron en tallo, las cañas de las
  // judías con lo que se secó en ellas)
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
      P.rod(ctx, V(x - 0.25, 0, 20.9), V(x + 0.05, 1.8, 21.0), 0.012, 0.01, 'straw', { segs: 3 });
      P.rod(ctx, V(x + 0.25, 0, 20.9), V(x - 0.05, 1.8, 21.0), 0.012, 0.01, 'straw', { segs: 3 });
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
  // las herramientas que se quedaron
  P.rod(ctx, V(H.x1 - t - 0.1, 0, 21.2), V(H.x1 - t - 0.25, 1.4, 21.4), 0.02, 0.02, 'timber', { segs: 4 });
  P.basket(ctx, H.x1 - t - 0.6, 0, 21.1, { tipped: true, rot: 0.8 });
  // (lo de dentro no se pisa: la rejilla de la superficie lo deja macizo)
  (ctx.houseRects || (ctx.houseRects = [])).push({ x0: H.x0, z0: H.z0, x1: H.x1, z1: H.z1, front: 'n', huerto: true });
}

// ------------------------------------------------------------------------ los sumideros
// Tres pozos cuadrados de sillería, del techo de la gruta a la calle, con su
// reja arriba: por ellos baja la luna en una raya. En la calle, la reja.
function rejas(ctx) {
  const wb = ctx.wb;
  wb.setRoom(ROOM);
  for (const [gx, gz] of VERGEL.rejas) {
    const x0 = gx - 0.5,
      x1 = gx + 0.5,
      z0 = gz - 0.5,
      z1 = gz + 0.5;
    const y0 = VERGEL.techo - 0.75,
      y1 = -0.12;
    const o = { sub: 1.4, ao: false, tint: [0.4, 0.4, 0.37] };
    wb.box('ashlar', x0 - 0.3, y0, z0, x0, y1, z1, { ...o, faces: 'e' });
    wb.box('ashlar', x1, y0, z0, x1 + 0.3, y1, z1, { ...o, faces: 'w' });
    wb.box('ashlar', x0, y0, z0 - 0.3, x1, y1, z0, { ...o, faces: 's' });
    wb.box('ashlar', x0, y0, z1, x1, y1, z1 + 0.3, { ...o, faces: 'n' });
    // la reja (abajo de la calle)
    for (let k = 0; k < 5; k++) {
      const bx = x0 + 0.1 + k * 0.2;
      wb.box('iron', bx - 0.02, y1 - 0.05, z0, bx + 0.02, y1, z1, { ao: false, faces: 'tnsewb' });
    }
    wb.box('iron', x0, y1 - 0.08, gz - 0.02, x1, y1 - 0.05, gz + 0.02, { ao: false, faces: 'tnsewb' });
    // el musgo y la hiedra que bajan por él; la raíz de una calle
    for (let k = 0; k < 6; k++) hiedra(ctx, x0 + 0.05 + (k % 3) * 0.4, y1 - 0.1, k < 3 ? z0 + 0.03 : z1 - 0.03, 1.4 + k * 0.35, 9970 + k + Math.round(gx * 3), { dir: k < 3 ? [0, 1] : [0, -1], hoja: 1.2 });
    // en la calle: la piedra del sumidero y su reja
    wb.box('ashlar', x0 - 0.12, -0.02, z0 - 0.12, x1 + 0.12, 0.03, z1 + 0.12, { ao: false, faces: 't', tint: [0.6, 0.58, 0.54], room: null });
    for (let k = 0; k < 5; k++) {
      const bx = x0 + 0.1 + k * 0.2;
      wb.box('iron', bx - 0.025, 0.03, z0 + 0.05, bx + 0.025, 0.05, z1 - 0.05, { ao: false, faces: 'tnsew', room: null });
    }
  }
  wb.setRoom(null);
}

// ------------------------------------------------------------------------ lo verde
function verde(ctx) {
  const G = VERGEL,
    D = G.derrubio;
  const rr = new RNG(10001);
  const ctxR = { room: ROOM };
  ctx.wb.setRoom(ROOM);
  const poly = POLY();
  const libre = (x, z, m = 0.4) => dentro(x, z, poly) && distBorde(x, z, poly) > m && !enAgua(x, z, 0.15) && !inR(x, z, [G.saliente.x0, G.saliente.z0, G.saliente.x1, G.saliente.z1], 0.2) && !inR(x, z, [G.botica.x0, G.botica.z0, G.botica.x1, G.botica.z1]);
  // ---------------------------------------------------------- el prado del derrubio
  // (la hierba, densa arriba, más rala en la falda; las flores, donde más
  // luz cae; los helechos, en la falda)
  for (let k = 0; k < 120; k++) {
    const a = rr.range(0, Math.PI * 2),
      d = Math.sqrt(rr.next()) * (D.r1 - 0.6);
    const x = D.x + Math.cos(a) * d,
      z = D.z + Math.sin(a) * d;
    if (!libre(x, z)) continue;
    hierba(ctx, x, altoVergel(x, z) - 0.02, z, 0.4, d < D.r0 + 1 ? 12 : 8, 10010 + k, { ...ctxR, h: d < D.r0 + 1.5 ? 0.55 : 0.4 });
  }
  const colores = [null, null, null, [0.66, 0.74, 1.0], [1.0, 0.92, 0.56], [1.0, 0.74, 0.84]];
  for (let k = 0; k < 64; k++) {
    const a = rr.range(0, Math.PI * 2),
      d = Math.sqrt(rr.next()) * (D.r0 + 2.6);
    const x = D.x + Math.cos(a) * d,
      z = D.z + Math.sin(a) * d;
    if (!libre(x, z)) continue;
    flores(ctx, x, altoVergel(x, z) - 0.01, z, 0.3, 6, 10140 + k, { ...ctxR, tint: rr.pick(colores) || undefined, h: 1.1 });
  }
  for (let k = 0; k < 30; k++) {
    const a = rr.range(0, Math.PI * 2),
      d = rr.range(D.r0 + 0.8, D.r1 - 0.2);
    const x = D.x + Math.cos(a) * d,
      z = D.z + Math.sin(a) * d;
    if (!libre(x, z, 0.6)) continue;
    helecho(ctx, x, altoVergel(x, z) - 0.02, z, rr.range(0.8, 1.35), 10210 + k, ctxR);
  }
  // (en la falda del derrubio: matas y helechos grandes)
  for (let k = 0; k < 40; k++) {
    const a = rr.range(0, Math.PI * 2),
      d = rr.range(D.r0 + 0.4, D.r1 - 0.4);
    const x = D.x + Math.cos(a) * d,
      z = D.z + Math.sin(a) * d;
    if (!libre(x, z, 0.6)) continue;
    if (k % 2) mata(ctx, x, altoVergel(x, z), z, rr.range(0.4, 0.8), 15000 + k, ctxR);
    else helecho(ctx, x, altoVergel(x, z) - 0.02, z, rr.range(1.2, 1.8), 15100 + k, ctxR);
  }
  arbolillo(ctx, 10.8, altoVergel(10.8, 24.6), 24.6, 2.2, 10245, { ...ctxR, flores: true, lean: [0.06, -0.1] });
  higuera(ctx, 16.2, G.y, 20.4, 2.6, 10246, { ...ctxR, lean: [-0.1, -0.04], ramas: 8 });
  // los árboles jóvenes: la higuera, dos saúcos en flor, un avellano
  higuera(ctx, 9.6, altoVergel(9.6, 18.0), 18.0, 3.4, 10241, { ...ctxR, lean: [0.06, -0.04], ramas: 9 });
  arbolillo(ctx, 6.6, altoVergel(6.6, 15.2), 15.2, 2.6, 10242, { ...ctxR, flores: true, lean: [0.1, 0.12] });
  arbolillo(ctx, 12.4, altoVergel(12.4, 21.6), 21.6, 2.3, 10243, { ...ctxR, flores: true, lean: [-0.1, -0.06] });
  arbolillo(ctx, 14.6, altoVergel(14.6, 15.4), 15.4, 2.0, 10244, { ...ctxR, lean: [-0.14, 0.08], varas: 5 });
  // los troncos caídos (con su musgo y sus hongos) y las piedras
  tronco(ctx, 13.4, altoVergel(13.4, 18.6), 18.6, 0.7, 2.6, 0.2, 10251, ctxR);
  tronco(ctx, 19.6, G.y, 21.4, -0.4, 3.0, 0.24, 10252, { ...ctxR, luz: true });
  tronco(ctx, 15.6, G.y, 33.4, 2.6, 2.2, 0.18, 10253, { ...ctxR, luz: true });
  for (let k = 0; k < 40; k++) {
    const x = rr.range(5, 32),
      z = rr.range(10, 38);
    if (!libre(x, z, 0.6)) continue;
    const s = rr.range(0.18, 0.5);
    P.roughStone(ctx, x, altoVergel(x, z) - 0.05, z, s, 10260 + k, { tint: [0.42, 0.42, 0.38] });
    musgo(ctx, x, altoVergel(x, z) + s * 0.55, z, s * 0.9, s * 0.8, 10310 + k, { ...ctxR, n: 5 });
    if (rr.chance(0.4)) helecho(ctx, x + s, altoVergel(x + s, z), z + s * 0.4, rr.range(0.5, 0.9), 10360 + k, ctxR);
  }
  // ---------------------------------------------------------- lo de la orilla
  // (los juncos, los helechos, el musgo; los nenúfares en el estanque y en
  // la poza)
  const orillas = [];
  for (const r of [G.poza, ...G.arroyo, G.estanque, G.pila, G.salida]) {
    const per = 2 * (r[2] - r[0] + r[3] - r[1]);
    const n = Math.max(3, Math.round(per / 1.6));
    for (let k = 0; k < n; k++) {
      const u = (k + rr.range(0.1, 0.9)) / n;
      let x, z;
      const L = u * per;
      const w = r[2] - r[0],
        h = r[3] - r[1];
      if (L < w) [x, z] = [r[0] + L, r[1] - 0.2];
      else if (L < w + h) [x, z] = [r[2] + 0.2, r[1] + L - w];
      else if (L < 2 * w + h) [x, z] = [r[2] - (L - w - h), r[3] + 0.2];
      else [x, z] = [r[0] - 0.2, r[3] - (L - 2 * w - h)];
      if (!dentro(x, z, poly) || distBorde(x, z, poly) < 0.3 || enAgua(x, z, 0.05)) continue;
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
  nenufares(ctx, (E[0] + E[2]) / 2 - 0.6, G.agua, (E[1] + E[3]) / 2 + 0.4, 2.2, 22, 10801, { ...ctxR, flor: 0.35 });
  nenufares(ctx, (G.poza[0] + G.poza[2]) / 2 + 0.6, G.agua, G.poza[3] - 0.8, 0.9, 7, 10802, { ...ctxR, flor: 0.3, tint: [1.0, 0.78, 0.86] });
  // ---------------------------------------------------------- en los muros
  // (la hiedra que baja de las grietas, el musgo al pie, los helechos)
  const rA = [...G.contornoA, ...G.contornoB];
  for (let k = 0; k < rA.length - 1; k++) {
    const [ax, az] = rA[k],
      [bx, bz] = rA[k + 1];
    if (Math.hypot(bx - ax, bz - az) > 3.4) continue;
    const L = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(L / 1.6));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = ax + (bx - ax) * t,
        z = az + (bz - az) * t;
      // (la normal hacia dentro)
      const nx = -(bz - az) / L,
        nz = (bx - ax) / L;
      const px = x + nx * 0.35,
        pz = z + nz * 0.35;
      if (!dentro(px, pz, poly)) continue;
      const y = altoVergel(px, pz);
      musgo(ctx, px, y, pz, 0.7, 0.4, 10900 + k * 7 + i, { ...ctxR, n: 7 });
      if ((k + i) % 2 === 0) helecho(ctx, px + nx * 0.3, y, pz + nz * 0.3, rr.range(0.6, 1.0), 11000 + k * 7 + i, ctxR);
      if ((k + i) % 2 === 0) for (let q = 0; q < 4; q++) hiedra(ctx, x - nx * 0.05 + (q - 1.5) * 0.28 * nz, G.techo - rr.range(0.3, 1.6), z - nz * 0.05 - (q - 1.5) * 0.28 * nx, rr.range(2.5, 7.0), 11100 + k * 11 + i * 4 + q, { ...ctxR, dir: [nx, nz], hoja: 1.8 });
    }
  }
  for (let k = 0; k < 10; k++) {
    const x = rr.range(8, 31),
      z = rr.range(11, 37);
    if (!dentro(x, z, poly) || inR(x, z, G.sima, 1.2)) continue;
    raices(ctx, x, G.techo + 0.2, z, 4, rr.range(1.2, 2.6), 11300 + k, ctxR);
  }
  // ---------------------------------------------------------- los hongos que dan luz
  // (en lo umbrío: al pie de los muros del este y del sur, junto a los
  // troncos, alrededor de la botica)
  for (const [x, z, n, s] of [
    [31.4, 15.6, 9, 1.1],
    [31.9, 21.4, 7, 1.0],
    [30.8, 34.2, 10, 1.2],
    [27.0, 37.4, 8, 1.0],
    [19.8, 38.2, 9, 1.1],
    [13.4, 37.6, 7, 0.9],
    [20.6, 22.0, 6, 1.0],
    [16.4, 33.0, 6, 0.9],
    [5.6, 30.6, 6, 0.9],
    [22.0, 11.0, 8, 1.0],
    [17.0, 10.8, 7, 1.0],
  ]) {
    if (!dentro(x, z, poly)) continue;
    hongos(ctx, x, altoVergel(x, z), z, n, 11400 + Math.round(x * 10 + z), { ...ctxR, luz: true, s, r: 0.35 });
    musgo(ctx, x, altoVergel(x, z), z, 0.6, 0.5, 11500 + Math.round(x * 10 + z), { ...ctxR, n: 6 });
  }
  // ---------------------------------------------------------- lo que lo llena todo
  // (por todo el suelo, menos donde pisa él y el rincón de lo oscuro: matas,
  // helechos grandes, hierba alta y flores donde cae alguna luz)
  const oscuroR = (x, z) => z < G.raya.z + 2.4 && x > G.raya.x0 - 1.8;
  const luzEn = (x, z) => Math.hypot(x - D.x, z - D.z) < D.r1 || G.rejas.some(([gx, gz]) => Math.hypot(x - gx, z - gz) < 3);
  for (let k = 0; k < 260; k++) {
    const x = rr.range(5, 32.5),
      z = rr.range(9.6, 38.8);
    if (!libre(x, z, 0.5) || oscuroR(x, z)) continue;
    const y = altoVergel(x, z);
    const w = distBorde(x, z, poly);
    const r = rr.next();
    if (w < 3.2 && r < 0.45) mata(ctx, x, y, z, rr.range(0.35, 0.75), 12900 + k, ctxR);
    else if (r < 0.62) helecho(ctx, x, y - 0.02, z, rr.range(1.0, 1.7), 13200 + k, ctxR);
    else if (r < 0.88) hierba(ctx, x, y - 0.02, z, 0.45, 12, 13500 + k, { ...ctxR, h: luzEn(x, z) ? 0.6 : 0.45 });
    else if (luzEn(x, z)) flores(ctx, x, y - 0.01, z, 0.35, 7, 13800 + k, { ...ctxR, tint: rr.pick(colores) || undefined, h: 1.1 });
    else hongos(ctx, x, y, z, 5, 14100 + k, { ...ctxR, luz: rr.chance(0.5), r: 0.25 });
  }
  // (bajo cada sumidero, su corro de flores y de hierba)
  for (const [gx, gz] of G.rejas)
    for (let k = 0; k < 8; k++) {
      const a = rr.range(0, Math.PI * 2),
        d = rr.range(0.2, 1.8);
      const x = gx + Math.cos(a) * d,
        z = gz + Math.sin(a) * d;
      if (!libre(x, z, 0.4)) continue;
      if (k % 2) flores(ctx, x, altoVergel(x, z) - 0.01, z, 0.3, 7, 14400 + k + Math.round(gx * 7), { ...ctxR, tint: rr.pick(colores) || undefined, h: 1.2 });
      else hierba(ctx, x, altoVergel(x, z) - 0.02, z, 0.4, 12, 14500 + k + Math.round(gx * 7), { ...ctxR, h: 0.65 });
    }
  // las lianas que bajan del techo (de las raíces de las casas de arriba)
  for (let k = 0; k < 34; k++) {
    const x = rr.range(6, 31),
      z = rr.range(10.5, 37.5);
    if (!dentro(x, z, poly) || distBorde(x, z, poly) < 1.2 || inR(x, z, G.sima, 0.6) || oscuroR(x, z)) continue;
    const top = G.techo + rr.range(0, 0.5);
    const len = rr.range(2.5, Math.min(7.5, top - altoVergel(x, z) - 1.2));
    hiedra(ctx, x, top, z, len, 14600 + k, { ...ctxR, hoja: 1.6 });
    if (k % 3 === 0) hiedra(ctx, x + 0.2, top, z + 0.15, len * 0.7, 14700 + k, { ...ctxR, hoja: 1.6 });
  }
  ctx.wb.setRoom(null);
}

// ------------------------------------------------------------------------ la fuente
// Mana de una grieta del muro de levante: el agua limpia cae a su pila, que
// se vierte al estanque. Él viene aquí a por el agua de sus remedios.
function fuente(ctx, L) {
  const wb = ctx.wb;
  const F = VERGEL.fuente,
    Pi = VERGEL.pila;
  wb.setRoom(ROOM);
  // el caño: un sillar que sale del muro con su canal (verde de lo que
  // corre por él), y la losa que lo carga, metida en la roca
  wb.box('ashlar', F.x, F.y - 0.2, F.z - 0.2, F.x + 1.6, F.y, F.z + 0.2, { ao: false, faces: 'tnsewb', tint: [0.52, 0.52, 0.48] });
  wb.box('mossstone', F.x - 0.01, F.y - 0.005, F.z - 0.07, F.x + 1.2, F.y + 0.002, F.z + 0.07, { ao: false, faces: 't', tint: [0.3, 0.4, 0.3] });
  wb.box('ashlar', F.x + 0.35, F.y, F.z - 0.55, F.x + 1.7, F.y + 0.5, F.z + 0.55, { ao: false, faces: 'tnsewb', tint: [0.48, 0.48, 0.44] });
  wb.box('black', F.x + 0.34, F.y - 0.19, F.z - 0.06, F.x + 0.35, F.y - 0.01, F.z + 0.06, { ao: false, faces: 'w', grime: false });
  musgo(ctx, F.x + 0.5, F.y + 0.5, F.z, 0.45, 0.5, 12001, { n: 6 });
  for (let k = 0; k < 6; k++) hiedra(ctx, F.x + 0.4, F.y + 0.48, F.z - 0.5 + k * 0.2, 0.8 + k * 0.3, 12010 + k, { dir: [-1, 0], hoja: 1.2 });
  helecho(ctx, Pi[2] - 0.4, VERGEL.y, Pi[1] - 0.5, 0.9, 12021);
  helecho(ctx, Pi[2] - 0.5, VERGEL.y, Pi[3] + 0.5, 0.8, 12022);
  // el cuenco de piedra que puso él bajo el chorro, y su cántaro
  P.roughStone(ctx, Pi[2] - 0.6, VERGEL.lecho, F.z, 0.35, 12031, { tint: [0.44, 0.46, 0.42] });
  P.jar(ctx, Pi[2] - 0.1, VERGEL.y, Pi[1] - 0.25, 0.7, { collide: false, tint: [0.6, 0.46, 0.34] });
  wb.setRoom(null);
  L.interact.push({ kind: 'examine', id: 'x_fuente_vergel', text: 'fuenteVergel', x: Pi[0] + 0.4, y: VERGEL.y, z: Pi[1] - 0.6, r: 1.8 });
}

// ------------------------------------------------------------------------ la botica
// Bajo la roca del suroeste: donde busca su cura. La mesa de tablas sobre
// dos piedras (el mortero y su mano, los tarros tapados con trapo, los
// cuencos con lo machacado, las flores blancas en su vaso, el cuaderno
// abierto, el cuchillo, el cabo de vela); la cuerda con las hierbas que se
// secan; el fuego con el puchero de los cocimientos; el alambique de dos
// ollas y una caña; los tarros en las grietas de la roca; el lebrillo con el
// agua de la fuente y los trapos verdes de los emplastos; el tocón donde se
// sienta. Encima de la mesa, rayado en la piedra, lo que ha probado.
function botica(ctx, L) {
  const wb = ctx.wb,
    col = ctx.col;
  const B = VERGEL.botica,
    M = B.mesa,
    y = VERGEL.y;
  wb.setRoom(ROOM);
  // la mesa
  {
    const x0 = M.x - M.w / 2,
      x1 = M.x + M.w / 2,
      z0 = M.z - M.d / 2,
      z1 = M.z + M.d / 2;
    const top = y + 0.8;
    P.table(ctx, M.x, y, M.z, M.w, M.d, 0);
    void x0;
    void x1;
    void z0;
    void z1;
    // (él, de pie ante el canto de la mesa: delante, a su derecha, el
    // mortero; a su izquierda, el cuaderno abierto; detrás, contra la losa,
    // los tarros, los cuencos, las flores y la vela)
    // el mortero y su mano
    const mx = M.x - 0.28,
      mz = M.z - 0.2;
    wb.cylinder('rock', mx, top, mz, 0.12, 0.15, 0.13, 9, { ao: false, capBot: true, tint: [0.56, 0.55, 0.5] });
    wb.cylinder('black', mx, top + 0.11, mz, 0.095, 0.095, 0.01, 9, { ao: false, capTop: true, grime: false, tint: [0.22, 0.34, 0.18] });
    P.rod(ctx, V(mx, top + 0.07, mz), V(mx - 0.06, top + 0.29, mz - 0.1), 0.022, 0.03, 'rock', { segs: 4, tint: [0.6, 0.58, 0.54] });
    // los tarros, tapados con su trapo y su cordel, en dos filas al fondo
    const tr = new RNG(12111);
    for (let k = 0; k < 7; k++) {
      const x = M.x - 0.62 + (k % 4) * 0.22 + (k >= 4 ? 0.11 : 0),
        z = M.z + 0.22 - (k >= 4 ? 0.17 : 0);
      const s = tr.range(0.32, 0.46);
      P.jar(ctx, x, top, z, s, { collide: false, tint: tr.pick([
        [0.62, 0.44, 0.3],
        [0.5, 0.42, 0.34],
        [0.66, 0.56, 0.42],
      ]) });
      wb.cylinder('burlap', x, top + 0.6 * s, z, 0.07 * s * 1.6, 0.06 * s * 1.6, 0.03, 6, { ao: false, capTop: true, tint: [0.6, 0.54, 0.44] });
    }
    // los cuencos con lo machacado (verde, pardo, blanco)
    bowl(ctx, M.x - 0.62, top, M.z - 0.16, 0.1, ROOM, ['black', [0.26, 0.42, 0.2]]);
    bowl(ctx, M.x + 0.8, top, M.z + 0.05, 0.09, ROOM, ['black', [0.42, 0.34, 0.22]]);
    bowl(ctx, M.x - 0.84, top, M.z + 0.05, 0.08, ROOM, ['black', [0.8, 0.8, 0.74]]);
    // las flores blancas en su vaso
    P.jar(ctx, M.x + 0.62, top, M.z + 0.22, 0.3, { collide: false, tint: [0.7, 0.6, 0.48] });
    flores(ctx, M.x + 0.62, top + 0.17, M.z + 0.22, 0.03, 5, 12121, { room: ROOM, h: 0.7 });
    // el cuaderno abierto (las tapas de cuero y las dos hojas, escritas)
    const bx = M.x + 0.05,
      bz0 = M.z - 0.34,
      bz1 = M.z - 0.08;
    wb.box('leather', bx - 0.02, top, bz0 - 0.02, bx + 0.6, top + 0.006, bz1 + 0.02, { ao: false, faces: 'tnsew', tint: [0.4, 0.3, 0.22] });
    wb.box('clothWhite', bx, top + 0.006, bz0, bx + 0.28, top + 0.016, bz1, { ao: false, faces: 'tnsew', tint: [0.86, 0.8, 0.66] });
    wb.box('clothWhite', bx + 0.3, top + 0.006, bz0, bx + 0.58, top + 0.016, bz1, { ao: false, faces: 'tnsew', tint: [0.86, 0.8, 0.66] });
    for (let k = 0; k < 6; k++)
      for (const px of [bx + 0.03, bx + 0.33]) wb.box('black', px, top + 0.017, bz0 + 0.04 + k * 0.03, px + (k === 5 ? 0.12 : 0.22), top + 0.018, bz0 + 0.048 + k * 0.03, { ao: false, faces: 't', grime: false, tint: [0.3, 0.26, 0.24] });
    P.rod(ctx, V(bx + 0.62, top + 0.01, bz1), V(bx + 0.76, top + 0.02, bz0 + 0.04), 0.004, 0.003, 'feathers', { segs: 2 });
    // el cuchillo, junto al mortero; el cabo de vela, al fondo
    wb.box('iron', mx - 0.36, top, mz - 0.12, mx - 0.14, top + 0.01, mz - 0.09, { ao: false, faces: 'tnsew' });
    wb.box('wooddark', mx - 0.48, top, mz - 0.125, mx - 0.36, top + 0.02, mz - 0.085, { ao: false, faces: 'tnsew' });
    wb.cylinder('candle', M.x + 0.86, top, M.z + 0.24, 0.025, 0.025, 0.07, 6, { ao: false, capTop: true });
    if (ctx.fires) ctx.fires.push({ x: M.x + 0.86, y: top + 0.09, z: M.z + 0.24, s: 0.12 });
    // un manojo de hierbas a medio deshojar
    for (let k = 0; k < 5; k++) P.rod(ctx, V(M.x - 0.5, top + 0.01, M.z + 0.0 + k * 0.02), V(M.x - 0.22, top + 0.015, M.z - 0.06 + k * 0.03), 0.004, 0.003, 'hierba', { segs: 2, tint: [0.5, 0.62, 0.38] });
  }
  // lo rayado en la roca, encima de la mesa (la lista de los remedios) y en
  // otra piedra, HERMOSA
  {
    const rasca = (mat, x, yy, z, ry, w, h) => wb.geometry(mat, new THREE.PlaneGeometry(w, h), new THREE.Matrix4().compose(V(x, yy, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0.02)), V(1, 1, 1)), { ao: false, grime: false });
    // (una losa de piedra lisa apoyada contra el muro, donde raya)
    wb.box('ashlar', M.x - 0.75, y + 0.82, M.z + 0.55, M.x + 0.75, y + 2.5, M.z + 0.7, { ao: false, faces: 'tnsew', tint: [0.6, 0.58, 0.54] });
    col.add(M.x - 0.75, y, M.z + 0.52, M.x + 0.75, y + 2.5, M.z + 0.72);
    rasca('scratchRemedios', M.x, y + 1.68, M.z + 0.545, Math.PI, 1.22, 1.6);
    rasca('scratchHermosa', M.x + 1.35, y + 1.45, M.z + 0.6, Math.PI, 0.85, 0.2);
  }
  // la cuerda con las hierbas que se secan (de una raíz del techo a otra)
  {
    // (encima del fuego, junto a la roca de levante de la botica: el humo
    // las seca)
    const a = V(B.fuego[0] - 0.9, y + 2.7, B.fuego[1] + 1.9),
      b = V(B.fuego[0] + 0.9, y + 2.6, B.fuego[1] - 1.7);
    P.rod(ctx, a, b, 0.008, 0.008, 'rope', { segs: 6 });
    for (const p of [a, b]) P.rod(ctx, p, V(p.x, VERGEL.techo, p.z), 0.03, 0.02, 'wooddark', { segs: 4, tint: [0.56, 0.48, 0.38] });
    for (let k = 0; k < 11; k++) {
      const t = (k + 0.5) / 11;
      const p = a.clone().lerp(b, t);
      herbBunch(ctx, p.x, p.y - 0.02, p.z, 12201 + k, ROOM, 0.2 + (k % 3) * 0.04);
    }
    // los trapos de los emplastos, verdes de lo que se pone en la cara
    // los trapos de los emplastos, verdes de lo que se pone en la cara,
    // tendidos en la misma cuerda
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
    ctx.col.add(fx - 0.5, y, fz - 0.5, fx + 0.5, y + 0.5, fz + 0.5);
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
  // los tarros en las grietas de la roca; el lebrillo; el tocón; el saco
  {
    const jr = new RNG(12501);
    for (let k = 0; k < 7; k++) {
      const x = 5.5 + jr.range(-0.1, 0.1),
        z = 32.2 + k * 0.5;
      P.jar(ctx, x, y + 0.9 + (k % 3) * 0.45, z, jr.range(0.22, 0.34), { collide: false, tint: [0.6, 0.48, 0.36] });
    }
    for (let k = 0; k < 3; k++) wb.box('planks', 5.15, y + 0.88 + k * 0.45, 32.0, 5.75, y + 0.9 + k * 0.45, 35.6, { ao: false, faces: 'tnsewb', tint: [0.5, 0.44, 0.38] });
    bowl(ctx, 10.3, y, 36.0, 0.28, ROOM, ['water', null]);
    wb.box('clothWhite', 10.0, y + 0.17, 35.8, 10.3, y + 0.19, 36.05, { ao: false, faces: 'tnsew', tint: [0.5, 0.6, 0.42] });
    wb.cylinder('wooddark', 10.4, y, 34.9, 0.2, 0.22, 0.42, 9, { ao: false, capTop: true, tint: [0.56, 0.48, 0.4] });
    P.sacks(ctx, 12.0, y, 36.8, 2, 12511);
    // las semillas, ordenadas en una piedra plana
    P.roughStone(ctx, 6.9, y, 36.0, 0.3, 12521, { tint: [0.5, 0.49, 0.46], scl: [1.3, 0.35, 1.0] });
    for (let k = 0; k < 18; k++) P.ellipsoid(ctx, 'hide', 6.72 + (k % 6) * 0.07, y + 0.12, 35.9 + Math.floor(k / 6) * 0.08, 0.012, 0.01, 0.016, [0.5, 0.42, 0.3]);
  }
  wb.setRoom(null);
  L.interact.push({ kind: 'note', id: 'n_remedios', note: 'remedios', x: M.x + 0.34, y: y + 0.84, z: M.z - 0.21, model: 'none' });
  L.interact.push({ kind: 'examine', id: 'x_remedios', text: 'listaRemedios', x: M.x - 0.8, y, z: M.z - 0.7, r: 1.2 });
  L.interact.push({ kind: 'examine', id: 'x_alambique', text: 'alambique', x: B.alambique[0] + 0.4, y, z: B.alambique[1] + 0.2, r: 1.2 });
}

// ------------------------------------------------------------------------ lo oscuro
// El paso del nordeste, hacia la Sé: ahí lo verde se muere (el musgo negro,
// los helechos secos, los hongos apagados), la negrura rezuma del suelo,
// hay zarpazos en la piedra y una cabra arrastrada hacia lo oscuro. Él ha
// puesto una raya de candiles de pared a pared, con sal y sus flores. El paso
// acaba en un derrumbe: entre las piedras sale un aire frío.
function oscuro(ctx, Q, L) {
  const wb = ctx.wb,
    col = ctx.col;
  const Pa = VERGEL.paso,
    R = VERGEL.raya;
  const y = Pa.y;
  Q.paint(Pa.x0, Pa.z0 + 1.6, Pa.x1, Pa.z1, 1);
  wb.setRoom(ROSC);
  // el suelo (subiendo un poco hacia el norte), los muros y el techo bajo
  wb.box('rock', Pa.x0, y - 0.1, Pa.z0, Pa.x1, y, Pa.z1 + 0.6, { faces: 't', ao: false, sub: 2, tint: [0.3, 0.29, 0.27] });
  col.add(Pa.x0, y - 1.5, Pa.z0, Pa.x1, y, Pa.z1 + 0.6, 'floor').cam = true;
  const W = [
    [Pa.x0, Pa.z1 + 0.2],
    [Pa.x0 - 0.2, Pa.z0 + 6],
    [Pa.x0 + 0.1, Pa.z0 + 2.4],
    [Pa.x0 + 0.4, Pa.z0 - 0.2],
  ];
  const E = [
    [Pa.x1 - 0.4, Pa.z0 - 0.2],
    [Pa.x1 - 0.1, Pa.z0 + 2.6],
    [Pa.x1 + 0.2, Pa.z0 + 6.4],
    [Pa.x1, Pa.z1 + 0.2],
  ];
  caveWall(ctx, W, y - 0.3, Pa.top, { seed: 12601, room: ROSC, tint: [0.3, 0.29, 0.27], out: 0.3, lean: 0.5, closed: false });
  caveWall(ctx, E, y - 0.3, Pa.top, { seed: 12602, room: ROSC, tint: [0.3, 0.29, 0.27], out: 0.3, lean: 0.5, closed: false });
  {
    const hz = (z, sd) => Pa.top + 0.3 + 0.18 * Math.sin(z * 1.3 + sd * 2.1) + 0.1 * Math.cos(z * 2.7 + sd);
    for (let z = Pa.z0 - 0.4; z < Pa.z1 - 0.9; z += 1.0) wb.quad('rock', V(Pa.x0 - 0.6, hz(z, 0), z), V(Pa.x1 + 0.6, hz(z, 1), z), V(Pa.x1 + 0.6, hz(z + 1, 1), z + 1.0), V(Pa.x0 - 0.6, hz(z + 1, 0), z + 1.0), { ao: false, sub: 3, tint: [0.26, 0.25, 0.24] });
  }
  // el fondo: la roca, detrás del derrumbe
  wb.quad('rock', V(Pa.x0 - 0.7, y - 0.4, Pa.z0 - 0.35), V(Pa.x1 + 0.7, y - 0.4, Pa.z0 - 0.35), V(Pa.x1 + 0.7, Pa.top + 0.6, Pa.z0 - 0.35), V(Pa.x0 - 0.7, Pa.top + 0.6, Pa.z0 - 0.35), { ao: false, sub: 3, tint: [0.24, 0.23, 0.22] });
  col.add(Pa.x0 - 0.5, Pa.top + 0.3, Pa.z0, Pa.x1 + 0.5, -1.0, Pa.z1).cam = true;
  // el derrumbe del fondo (no se pasa): las piedras y, arriba, la rendija
  // negra por donde sale el aire
  {
    const rr = new RNG(12611);
    P.rubble(ctx, (Pa.x0 + Pa.x1) / 2, y, Pa.z0 + 1.0, 14, 12612, 1.4, { tint: [0.3, 0.29, 0.27] });
    for (let k = 0; k < 9; k++) P.roughStone(ctx, Pa.x0 + 0.3 + rr.range(0, Pa.x1 - Pa.x0 - 0.6), y + rr.range(0, 1.4), Pa.z0 + rr.range(0.2, 1.4), rr.range(0.3, 0.6), 12620 + k, { tint: [0.3, 0.29, 0.27] });
    wb.quad('black', V(Pa.x0 + 0.5, Pa.top - 0.4, Pa.z0 + 0.3), V(Pa.x1 - 0.5, Pa.top - 0.4, Pa.z0 + 0.3), V(Pa.x1 - 0.5, Pa.top + 0.25, Pa.z0 + 0.3), V(Pa.x0 + 0.5, Pa.top + 0.25, Pa.z0 + 0.3), { ao: false, grime: false });
    col.add(Pa.x0, y, Pa.z0 - 0.4, Pa.x1, Pa.top, Pa.z0 + 1.6);
  }
  // los zarpazos: cuatro surcos, a la altura de un hombre alto (en los dos
  // muros del paso y en la roca de su boca)
  {
    const zarpa = (x, yy, z, nx, ang, s = 1) => {
      for (let k = 0; k < 4; k++) {
        const off = (k - 1.5) * 0.07 * s;
        const dz = Math.cos(ang) * 0.42 * s,
          dy = Math.sin(ang) * 0.42 * s;
        const a = V(x + nx * 0.005, yy + off, z + off * 0.3),
          b = V(x + nx * 0.005, yy + off + dy, z + off * 0.3 + dz);
        wb.quad('black', a, b, b.clone().add(V(0, 0.018, 0)), a.clone().add(V(0, 0.018, 0)), { ao: false, grime: false, tint: [0.2, 0.18, 0.16] });
        wb.quad('black', a.clone().add(V(0, 0.018, 0)), b.clone().add(V(0, 0.018, 0)), b, a, { ao: false, grime: false, tint: [0.2, 0.18, 0.16] });
      }
    };
    zarpa(Pa.x0 + 0.08, y + 2.0, Pa.z1 - 1.6, 1, -0.7);
    zarpa(Pa.x1 - 0.08, y + 2.3, Pa.z1 - 3.4, -1, -0.5, 1.1);
    zarpa(Pa.x0 + 0.05, y + 1.6, Pa.z1 - 5.8, 1, -0.9, 0.9);
  }
  // la negrura que rezuma, y lo que se muere
  {
    const rr = new RNG(12701);
    for (let k = 0; k < 9; k++) {
      const x = Pa.x0 + 0.4 + rr.range(0, Pa.x1 - Pa.x0 - 0.8),
        z = Pa.z0 + 2.2 + rr.range(0, Pa.z1 - Pa.z0 - 1.6);
      P.ellipsoid(ctx, 'negrura', x, y + 0.005, z, rr.range(0.25, 0.6), 0.02, rr.range(0.25, 0.7), null, { room: ROSC });
    }
    for (let k = 0; k < 6; k++) musgo(ctx, Pa.x0 + 0.3 + rr.range(0, 2.2), y, Pa.z1 - rr.range(0.2, 4), 0.5, 0.4, 12720 + k, { room: ROSC, n: 6, k: [0.25, 0.22, 0.2] });
    helecho(ctx, Pa.x0 + 0.4, y, Pa.z1 - 0.8, 0.8, 12731, { room: ROSC, k: [0.42, 0.3, 0.2] });
    helecho(ctx, Pa.x1 - 0.5, y, Pa.z1 - 2.6, 0.7, 12732, { room: ROSC, k: [0.3, 0.24, 0.18] });
  }
  // la cabra: arrastrada hacia lo oscuro y dejada a medias
  {
    const cx = 26.2,
      cz = Pa.z1 - 3.0,
      ry = 0.5;
    wb.at(cx, y, cz, ry, () => {
      P.ellipsoid(ctx, 'hide', 0, 0.2, 0, 0.3, 0.18, 0.5, [0.62, 0.58, 0.52], { room: ROSC });
      P.ellipsoid(ctx, 'flesh', 0.18, 0.2, 0.05, 0.12, 0.14, 0.3, [0.5, 0.2, 0.18], { room: ROSC });
      P.ellipsoid(ctx, 'hide', -0.05, 0.16, 0.62, 0.12, 0.11, 0.18, [0.6, 0.56, 0.5], { room: ROSC });
      for (const [lx, lz, a] of [
        [-0.12, -0.35, 0.3],
        [0.1, -0.38, -0.2],
        [-0.15, 0.3, 0.5],
      ])
        P.rod(ctx, V(lx, 0.15, lz), V(lx + Math.sin(a) * 0.4, 0.06, lz - 0.3), 0.03, 0.02, 'hide', { segs: 3, tint: [0.58, 0.54, 0.48] });
      P.rod(ctx, V(-0.02, 0.24, 0.7), V(-0.14, 0.3, 0.86), 0.015, 0.006, 'bone', { segs: 3 });
      P.rod(ctx, V(0.06, 0.24, 0.7), V(0.12, 0.31, 0.86), 0.015, 0.006, 'bone', { segs: 3 });
    });
    P.decal(ctx, cx, y + 0.02, cz - 0.6, 1.4, 'splat', 0.9);
    for (let k = 0; k < 4; k++) P.decal(ctx, cx - 0.1 + k * 0.05, y + 0.02, cz + 0.8 + k * 0.6, 0.4, 'splat', 0.5);
  }
  wb.setRoom(null);
  // ---------------------------------------------------------- la raya de candiles (en la gruta, ante la boca)
  wb.setRoom(ROOM);
  {
    const z = R.z;
    // la sal (una raya blanca de pared a pared) y, encima, los candiles
    wb.box('bone', R.x0, VERGEL.y + 0.005, z - 0.05, R.x1, VERGEL.y + 0.014, z + 0.05, { ao: false, faces: 'tnsew', grime: false, tint: [1.0, 0.98, 0.94] });
    const n = 7;
    for (let k = 0; k < n; k++) {
      const x = R.x0 + 0.4 + ((R.x1 - R.x0 - 0.8) * k) / (n - 1);
      const yy = VERGEL.y;
      P.roughStone(ctx, x, yy, z, 0.14, 12801 + k, { tint: [0.4, 0.39, 0.36], scl: [1, 0.6, 1] });
      // el candil: una lamparilla de barro, con su piquera y la mecha
      wb.cylinder('plaster', x, yy + 0.08, z, 0.06, 0.05, 0.04, 8, { ao: false, capTop: true, capBot: true, tint: [0.62, 0.42, 0.3] });
      wb.box('plaster', x + 0.04, yy + 0.1, z - 0.012, x + 0.09, yy + 0.115, z + 0.012, { ao: false, faces: 'tnsewb', tint: [0.62, 0.42, 0.3] });
      if (ctx.fires) ctx.fires.push({ x: x + 0.085, y: yy + 0.13, z, s: 0.1 });
      if (k % 2 === 1) {
        P.jar(ctx, x, yy, z + 0.3, 0.28, { collide: false, tint: [0.62, 0.48, 0.36] });
        flores(ctx, x, yy + 0.16, z + 0.3, 0.03, 4, 12811 + k, { room: ROOM, h: 0.6 });
      }
    }
    // lo que ha rayado en la roca de la boca: NO PASES
    const rasca = (mat, x, yy, zz, ry, w, h) => wb.geometry(mat, new THREE.PlaneGeometry(w, h), new THREE.Matrix4().compose(V(x, yy, zz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, -0.04)), V(1, 1, 1)), { ao: false, grime: false });
    rasca('scratchNoPases', 23.6, VERGEL.y + 1.7, 10.2, 0.3, 0.9, 0.2);
    // y lo verde, que se muere ya a este lado de la raya
    const rr = new RNG(12821);
    for (let k = 0; k < 8; k++) {
      const x = R.x0 + rr.range(0, R.x1 - R.x0),
        zz = z - rr.range(0.4, 1.8);
      musgo(ctx, x, VERGEL.y, zz, 0.5, 0.35, 12830 + k, { room: ROOM, n: 5, k: [0.45, 0.42, 0.38] });
      if (k % 3 === 0) helecho(ctx, x, VERGEL.y, zz, 0.7, 12840 + k, { room: ROOM, k: [0.6, 0.45, 0.3] });
    }
  }
  wb.setRoom(null);
  L.interact.push(
    { kind: 'examine', id: 'x_raya', text: 'rayaCandiles', x: (R.x0 + R.x1) / 2, y: VERGEL.y, z: R.z + 0.6, r: 1.8 },
    { kind: 'examine', id: 'x_zarpazos', text: 'zarpazos', x: Pa.x0 + 0.6, y: Pa.y, z: Pa.z1 - 1.6, r: 1.3 },
    { kind: 'examine', id: 'x_cabra', text: 'cabraOscuro', x: 26.2, y: Pa.y, z: Pa.z1 - 3.0, r: 1.3 },
    { kind: 'examine', id: 'x_derrumbe_oscuro', text: 'derrumbeOscuro', x: (Pa.x0 + Pa.x1) / 2, y: Pa.y, z: Pa.z0 + 2.4, r: 1.6 }
  );
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
  L(scx, -3.0, scz, 0.5, 0.62, 0.84, 14, 1.0);
  // los sumideros
  for (const [gx, gz] of G.rejas) {
    L(gx, G.y + 2.6, gz, 0.56, 0.68, 0.92, 7, 1.7);
    L(gx, -3.2, gz, 0.48, 0.58, 0.8, 5, 0.8);
  }
  // el verde de los hongos (un poco por todo lo umbrío)
  for (const [x, z] of [
    [31.0, 16.0],
    [31.4, 21.4],
    [30.4, 33.8],
    [27.0, 37.0],
    [20.2, 37.2],
    [14.0, 36.8],
    [21.0, 22.2],
    [16.4, 33.0],
    [19.0, 11.4],
    [22.0, 11.2],
    [5.8, 30.6],
  ])
    L(x, G.y + 0.7, z, 0.3, 0.88, 0.8, 4.6, 1.0);
  // el agua del estanque y la fuente (el cielo que devuelve)
  L(25.6, G.y + 1.8, 28.4, 0.44, 0.62, 0.72, 9, 1.0);
  // la botica (su fuego, cálido) y la raya de candiles
  L(G.botica.fuego[0], G.y + 0.8, G.botica.fuego[1], 1.0, 0.62, 0.32, 5.5, 1.5);
  L(G.botica.mesa.x, G.y + 1.4, G.botica.mesa.z - 0.4, 0.95, 0.66, 0.38, 3.5, 0.7);
  L((G.raya.x0 + G.raya.x1) / 2, G.y + 0.5, G.raya.z, 1.0, 0.68, 0.36, 4.5, 0.9);
  // (el rebote de la luna por toda la gruta: a lo largo de los muros, a media
  // altura, y por el suelo; verdoso, como lo que lo cubre)
  const poly = POLY();
  for (let k = 0; k < poly.length; k++) {
    const [ax, az] = poly[k],
      [bx, bz] = poly[(k + 1) % poly.length];
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / 5.5));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const nx = -(bz - az) / len,
        nz = (bx - ax) / len;
      const x = ax + (bx - ax) * t + nx * 2.6,
        z = az + (bz - az) * t + nz * 2.6;
      if (!dentro(x, z, poly)) continue;
      L(x, G.y + 4.2, z, 0.42, 0.6, 0.6, 9, 0.8);
    }
  }
  for (let x = 8; x < 32; x += 7)
    for (let z = 12; z < 38; z += 7) if (dentro(x, z, poly) && distBorde(x, z, poly) > 2) L(x, G.y + 2.2, z, 0.4, 0.56, 0.52, 9.5, 0.62);
  // en el paso oscuro: nada
  if (ctx.dynLights) {
    ctx.dynLights.push({ x: scx - 0.5, y: D.y + 3.2, z: scz + 0.5, intensity: 2.2, range: 9, color: 0xbfd2f4, flicker: 0, priority: 2 });
    ctx.dynLights.push({ x: G.botica.fuego[0], y: G.y + 0.6, z: G.botica.fuego[1], intensity: 1.6, range: 6, color: 0xffa860, flicker: 0.25, priority: 2 });
    ctx.dynLights.push({ x: (G.raya.x0 + G.raya.x1) / 2, y: G.y + 0.4, z: G.raya.z, intensity: 1.0, range: 5, color: 0xffb070, flicker: 0.3, priority: 1 });
  }
  if (ctx.shafts) {
    ctx.shafts.push({ a: [scx + 0.2, -0.4, scz - 0.2], b: [D.x + 0.4, D.y + 0.05, D.z - 0.4], w: 4.2, color: 0xa8bedc, k: 2.6 });
    ctx.shafts.push({ a: [scx - 1.6, -0.4, scz + 0.8], b: [D.x - 1.4, D.y + 0.05, D.z + 1.6], w: 2.0, color: 0x8ea4c8, k: 1.8 });
    ctx.shafts.push({ a: [scx + 2.0, -0.4, scz - 1.0], b: [D.x + 2.6, D.y - 0.2, D.z - 1.4], w: 1.5, color: 0x9fb4d4, k: 1.4 });
    for (const [gx, gz] of G.rejas) ctx.shafts.push({ a: [gx, -0.4, gz], b: [gx + 0.5, G.y + 0.05, gz + 0.3], w: 1.25, color: 0x9fb4d4, k: 0.9 });
  }
}

// ------------------------------------------------------------------------ zonas y mapa
function zonas(L) {
  const C = VERGEL.cano,
    Pa = VERGEL.paso,
    G = VERGEL;
  L.zones.push(
    { id: 'vergel_cano', rects: [[C.x0 - 0.3, C.z0, C.x1, C.z1, C.y - 0.6, -1.1]], atmo: 'cloaca', room: RCANO },
    { id: 'vergel_oscuro', rects: [[Pa.x0 - 0.4, Pa.z0, Pa.x1 + 0.4, Pa.z1 - 0.6, Pa.y - 0.6, -1.1]], atmo: 'oscuro', room: ROSC },
    {
      id: 'vergel',
      rects: [
        [C.x1, Pa.z1 - 0.6, 34.4, 40.4, G.lecho - 0.8, -1.1],
        [3.4, 8.0, C.x1 + 0.01, 40.4, G.lecho - 0.8, -1.1],
        [C.x1, 8.0, Pa.x0 - 0.4, Pa.z1 - 0.6, G.lecho - 0.8, -1.1],
        [Pa.x1 + 0.4, 8.0, 34.4, Pa.z1 - 0.6, G.lecho - 0.8, -1.1],
      ],
      atmo: 'vergel',
      room: ROOM,
    }
  );
  // (arriba, en la plaza: la puerta del huerto)
  const H = VERGEL.huerto;
  L.interact.push({ kind: 'examine', id: 'x_huerto', text: 'huertoPuerta', x: (H.puerta[0] + H.puerta[1]) / 2, y: 0, z: H.z0 - 0.7, r: 1.5 });
  L.map.push(
    { id: 'vergel_cano', r: [C.x0 - 0.3, C.z0, C.x1, C.z1], level: 'cloaca' },
    { id: 'vergel', r: [5.0, 10.0, 32.6, 38.4], level: 'cloaca' },
    { id: 'vergel', r: [4.4, 16.6, 5.0, 33.4], level: 'cloaca', label: 'vergel' },
    { id: 'vergel_oscuro', r: [Pa.x0, Pa.z0, Pa.x1, Pa.z1], level: 'cloaca' }
  );
}
