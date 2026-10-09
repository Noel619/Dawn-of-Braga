// Lo que rompe el jefe final (la película: finale/film_*.js), en grupos que
// se muestran u ocultan (ver level.js: beginGroup): la cisterna (el pozo, las
// columnas, la cúpula) y el cráter de fuera de la muralla norte.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import * as P from './props.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// Medidas de la cisterna y del cráter (las comparte la película).
export const CISTERN = {
  cz: -152, // centro
  AY: -10, // suelo
  YT: -1.2, // techo llano y arranque de la cúpula
  DOME: 4.0, // clave de la cúpula
  RP: 6.6, // radio del pozo
  DEPTH: 17, // hondo del pozo (bajo el suelo)
  CRATER: 13.5, // medio lado del cuadro del cráter en la superficie
};

// el tramo del borde del pozo que es la losa del jugador (30 tramos: el 7
// va de 84° a 96°, al sur) y la losa: centro, medidas (x, y, z)
const PIT_GAP = 7;
export const PIT_SLAB = { x: 0, y: -10.17, z: -144.72, size: [1.9, 0.34, 1.75] };

// El pozo que se abre en el centro del suelo de la cisterna: el suelo de
// alrededor con su borde roto, las paredes de tierra y roca que bajan y, al
// fondo, la carne del dios.
export function cisternPit(ctx, cz, PC, AY, room, VT, AT) {
  const wb = ctx.wb;
  const { RP, DEPTH } = CISTERN;
  const N = 30;
  const rng = new RNG(1661);
  ctx.beginGroup('cisternPit');
  const sq = (t) => {
    const c = Math.cos(t),
      s = Math.sin(t);
    const m = PC / Math.max(Math.abs(c), Math.abs(s));
    return V3(c * m, AY, cz + s * m);
  };
  // el borde, irregular
  const rim = [];
  for (let k = 0; k < N; k++) rim.push(RP + rng.range(-0.35, 0.55));
  rim.push(rim[0]);
  const E = (k, y = AY, f = 1) => {
    const t = (k / N) * Math.PI * 2;
    return V3(Math.cos(t) * rim[k] * f, y, cz + Math.sin(t) * rim[k] * f);
  };
  // (el tramo del sur, donde está el jugador, es una losa suelta: la mueve
  // la película, ver PIT_SLAB)
  const gap = (k) => k === PIT_GAP;
  for (let k = 0; k < N; k++) {
    if (gap(k)) continue;
    const t0 = (k / N) * Math.PI * 2,
      t1 = ((k + 1) / N) * Math.PI * 2;
    wb.quad('flag', E(k), E(k + 1), sq(t1), sq(t0), { ao: false, sub: 2.5, room, uv: 0.5, tint: [0.62, 0.58, 0.54] });
  }
  // las losas del borde, partidas y vencidas hacia dentro
  for (let k = 0; k < N; k++) {
    if (gap(k) || gap(k - 1)) continue;
    const t = ((k + 0.5) / N) * Math.PI * 2;
    const r = (rim[k] + rim[k + 1]) / 2;
    const w = rng.range(0.9, 1.5),
      d = rng.range(0.7, 1.3);
    wb.push();
    wb.translate(Math.cos(t) * (r + d * 0.3), AY - 0.12, cz + Math.sin(t) * (r + d * 0.3));
    wb.rotateY(-t);
    wb.rotateZ(rng.range(0.15, 0.5));
    wb.box('flag', -d, -0.28, -w / 2, 0, 0.02, w / 2, { ao: false, room, uv: 0.5, tint: [0.6, 0.56, 0.52], faces: 'tnsewb' });
    wb.pop();
  }
  // las paredes del pozo: tierra y roca que bajan estrechándose, con el
  // borde de las losas por encima
  const B = 4;
  for (let b = 0; b < B; b++) {
    const y0 = AY - 0.3 - (b / B) * DEPTH,
      y1 = AY - 0.3 - ((b + 1) / B) * DEPTH;
    const f0 = 1 - (b / B) * 0.22,
      f1 = 1 - ((b + 1) / B) * 0.22;
    const mat = b === 0 ? 'mossstone' : 'dirt';
    for (let k = 0; k < N; k++) {
      // (caras hacia dentro: se ven desde el pozo y desde arriba)
      wb.quad(mat, E(k, y0, f0), E(k, y1, f1), E(k + 1, y1, f1), E(k + 1, y0, f0), { ao: false, sub: 2.2, room, tint: b === 0 ? VT : [0.42, 0.34, 0.3] });
    }
  }
  // el fondo: la carne del dios, que late (su brillo lo pone la película)
  const bot = AY - 0.3 - DEPTH;
  for (let k = 0; k < N; k++) wb.tri('fleshStatic', V3(0, bot - 0.6, cz), E(k + 1, bot, 0.78), E(k, bot, 0.78), { ao: false, room });
  ctx.endGroup();
}

// Lo que queda de la cisterna tras salir el gigante (muñones de las columnas,
// arcos por el suelo, lo bajo de la cúpula) y el cráter de la superficie.
export function cisternRuins(ctx, o) {
  const wb = ctx.wb;
  const { cz, rd, rm, YT, YC, AY, cols, room, VT, AT, CT } = o;
  const rng = new RNG(1671);
  // ------------------------------------------------------------ las columnas
  ctx.beginGroup('cisternColsRuin');
  for (let i = 0; i < cols.length; i++) {
    const [x, z, a] = cols[i];
    const h = rng.range(1.2, 3.6);
    wb.box('ashlar', x - 0.85, AY, z - 0.85, x + 0.85, AY + 0.4, z + 0.85, { sub: 2, aoH: 0.3, room, tint: AT });
    wb.cylinder('ashlar', x, AY + 0.4, z, 0.7, 0.66, h, 8, { ao: false, sub: 2, room, tint: AT });
    // el corte, mellado
    for (let k = 0; k < 4; k++) {
      const t = rng.range(0, Math.PI * 2);
      wb.push();
      wb.translate(x + Math.cos(t) * 0.35, AY + 0.4 + h, z + Math.sin(t) * 0.35);
      wb.rotateY(t);
      wb.box('ashlar', -0.25, 0, -0.2, 0.25, rng.range(0.2, 0.55), 0.2, { ao: false, room, tint: AT });
      wb.pop();
    }
    ctx.col.add(x - 0.7, AY, z - 0.7, x + 0.7, AY + 0.4 + h, z + 0.7);
    // tambores y dovelas por el suelo, hacia fuera del corro
    for (let k = 0; k < 3; k++) {
      const d = rng.range(1.2, 3.2);
      const t = a + rng.range(-0.5, 0.5);
      const px = x + Math.cos(t) * d,
        pz = z + Math.sin(t) * d;
      if (Math.hypot(px, pz - cz) < CISTERN.RP + 0.8) continue;
      wb.push();
      wb.translate(px, AY + 0.62, pz);
      wb.rotateY(rng.range(0, Math.PI));
      wb.rotateZ(Math.PI / 2 + rng.range(-0.2, 0.2));
      wb.cylinder('ashlar', 0, -0.6, 0, 0.66, 0.64, 1.2, 8, { ao: false, room, tint: AT, capTop: true, capBot: true });
      wb.pop();
    }
    P.rubble(ctx, x + Math.cos(a) * 1.4, AY, z + Math.sin(a) * 1.4, 7, 1680 + i, 1.2, { scale: 1.2, mat: 'mossstone', room });
  }
  ctx.endGroup();
  // ------------------------------------------------------------ la cúpula
  // (lo bajo de la cúpula, mellado; con las dos caras: se ve desde dentro y
  // desde el cráter)
  ctx.beginGroup('cisternDomeRuin');
  {
    const rise = CISTERN.DOME - YT;
    const R = (rd * rd + rise * rise) / (2 * rise);
    const yc = YT + rise - R;
    const f0 = Math.asin(Math.min(1, rd / R));
    const n = 32,
      m = 10;
    const Pt = (i, j) => {
      const th = (i / n) * Math.PI * 2;
      const f = f0 * (1 - j / m);
      return V3(Math.cos(th) * R * Math.sin(f), yc + R * Math.cos(f), cz + Math.sin(th) * R * Math.sin(f));
    };
    for (let i = 0; i < n; i++) {
      const top = rng.chance(0.3) ? 0 : rng.int(1, 3);
      for (let j = 0; j < top; j++) {
        const a = Pt(i, j),
          b = Pt(i + 1, j),
          c = Pt(i + 1, j + 1),
          d = Pt(i, j + 1);
        wb.quad('mossstone', a, b, c, d, { ao: false, sub: 1.4, tint: VT, room });
        wb.quad('mossstone', a, d, c, b, { ao: false, sub: 1.4, tint: [0.5, 0.5, 0.48], room });
      }
    }
    // el anillo del techo llano, roto por dentro
    for (let k = 0; k < n; k++) {
      const t = ((k + 0.5) / n) * Math.PI * 2;
      if (rng.chance(0.45)) continue;
      const r = rm - rng.range(0.2, 1.4);
      wb.push();
      wb.translate(Math.cos(t) * r, YT + 0.1, cz + Math.sin(t) * r);
      wb.rotateY(-t);
      wb.rotateZ(rng.range(-0.35, 0.1));
      wb.box('mossstone', -0.9, -0.25, -0.9, 0.3, 0.25, 0.9, { ao: false, room, tint: VT, faces: 'tnsewb' });
      wb.pop();
    }
  }
  ctx.endGroup();
  // ------------------------------------------------------------ el cráter
  // (fuera de la muralla norte; la losa de suelo del cuadro va aparte: entera
  // en 'craterLid', y en su lugar, al reventar, el borde roto de 'crater')
  const C = CISTERN.CRATER;
  ctx.floorHoles.push([-C, cz - C, C, cz + C]);
  ctx.beginGroup('craterLid');
  ctx.col.add(-C, -1, cz - C, C, 0, cz + C).cam = true;
  wb.box('dirt', -C, -0.2, cz - C, C, -0.06, cz + C, { faces: 't', ao: false, sub: 8, tint: [0.62, 0.58, 0.54] });
  ctx.endGroup();
  ctx.beginGroup('crater');
  {
    const RC = rd + 0.6; // el agujero
    const N = 36;
    const sq = (t) => {
      const c = Math.cos(t),
        s = Math.sin(t);
      const m = C / Math.max(Math.abs(c), Math.abs(s));
      return V3(c * m, -0.06, cz + s * m);
    };
    const lip = [];
    for (let k = 0; k < N; k++) lip.push(RC + rng.range(-0.6, 0.9));
    lip.push(lip[0]);
    const L = (k, y, f = 1) => {
      const t = (k / N) * Math.PI * 2;
      return V3(Math.cos(t) * lip[k] * f, y, cz + Math.sin(t) * lip[k] * f);
    };
    // la tierra de alrededor, levantada hacia el borde
    for (let k = 0; k < N; k++) {
      const t0 = (k / N) * Math.PI * 2,
        t1 = ((k + 1) / N) * Math.PI * 2;
      wb.quad('dirt', L(k, 1.1), L(k + 1, 1.1), sq(t1), sq(t0), { ao: false, sub: 3, tint: [0.56, 0.5, 0.46], uv: 0.35 });
      // la cara del borde, que cae hacia la cisterna
      wb.quad('dirt', L(k, 1.1), L(k, YT - 0.4, 0.94), L(k + 1, YT - 0.4, 0.94), L(k + 1, 1.1), { ao: false, sub: 2, tint: [0.4, 0.34, 0.3], uv: 0.4 });
    }
    // losas de tierra levantadas y partidas, de canto, alrededor del borde
    for (let k = 0; k < 22; k++) {
      const t = (k / 22) * Math.PI * 2 + rng.range(-0.1, 0.1);
      const r = RC + rng.range(0.6, 2.8);
      const w = rng.range(1.2, 2.6),
        h = rng.range(0.25, 0.5),
        d = rng.range(1.0, 2.2);
      wb.push();
      wb.translate(Math.cos(t) * r, 0.4 + rng.range(0, 0.6), cz + Math.sin(t) * r);
      wb.rotateY(-t);
      wb.rotateZ(-rng.range(0.25, 0.8));
      wb.box('dirt', -d / 2, -h / 2, -w / 2, d / 2, h / 2, w / 2, { ao: false, faces: 'tnsewb', tint: [0.5, 0.45, 0.41], uv: 0.4 });
      wb.pop();
    }
    // trozos de la cúpula y sillares por la tierra
    for (let k = 0; k < 16; k++) {
      const t = rng.range(0, Math.PI * 2),
        r = RC + rng.range(1.5, 6);
      const s = rng.range(0.5, 1.3);
      wb.push();
      wb.translate(Math.cos(t) * r, s * 0.3, cz + Math.sin(t) * r);
      wb.rotateY(rng.range(0, Math.PI));
      wb.rotateX(rng.range(-0.4, 0.4));
      wb.box(k % 3 ? 'mossstone' : 'ashlar', -s, -s * 0.35, -s * 0.6, s, s * 0.35, s * 0.6, { ao: false, tint: k % 3 ? VT : AT, faces: 'tnsewb' });
      wb.pop();
    }
    for (let k = 0; k < 6; k++) {
      const t = (k / 6) * Math.PI * 2 + 0.3;
      P.rubble(ctx, Math.cos(t) * (RC + 3), 0, cz + Math.sin(t) * (RC + 3), 10, 1690 + k, 2.2, { scale: 1.5, mat: 'mossstone' });
    }
    // humo que sube de la cisterna
    ctx.fires.push({ x: -2, y: -1, z: cz + 3, s: 1.6, smoke: true, light: false, embers: true, glow: false });
    ctx.fires.push({ x: 4, y: -1, z: cz - 4, s: 1.2, smoke: true, light: false, embers: false, glow: false });
    // (el suelo que se pisa alrededor del agujero)
    for (const [a, b, c, d] of [
      [-C, cz - C, C, cz - RC - 0.5],
      [-C, cz + RC + 0.5, C, cz + C],
      [-C, cz - RC - 0.5, -RC - 0.5, cz + RC + 0.5],
      [RC + 0.5, cz - RC - 0.5, C, cz + RC + 0.5],
    ])
      ctx.col.add(a, -1, b, c, 0, d);
  }
  ctx.endGroup();
}
