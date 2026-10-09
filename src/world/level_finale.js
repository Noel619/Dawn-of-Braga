// Lo que rompe el jefe final (la película: finale/film_*.js), en grupos que
// se muestran u ocultan (ver level.js: beginGroup): la cisterna (el pozo, las
// columnas, la cúpula) y el cráter de fuera de la muralla norte, la brecha de
// la muralla, la cabecera de la catedral y la nave, que se rompe por tramos.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, blocker } from './builders.js';
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

// ======================================================================
// LA MURALLA NORTE
// ======================================================================
// El tramo de la muralla norte por donde la atraviesa el gigante (en medio
// del lienzo que va de la torre de x = 25 a la de x = -30): entero en el
// grupo 'muroN' (lo pone level_walls.js) y roto en 'muroNRuin'.
export const BREACH = { x0: -7, x1: 7, z0: -126, z1: -122, h: 10 };

export function wallBreach(ctx) {
  const wb = ctx.wb;
  const { x0, x1, z0, z1, h } = BREACH;
  const rng = new RNG(1717);
  const RT = [0.86, 0.84, 0.8];
  ctx.beginGroup('muroNRuin');
  // el muro roto en dientes: casi entero en los bordes, a ras de suelo en
  // medio (por ahí pasaron las piernas); el grueso, mellado por las dos caras
  let x = x0;
  while (x < x1 - 0.01) {
    const w = Math.min(x1 - x, rng.range(0.55, 1.25));
    const e = Math.abs(x + w / 2) / x1;
    const top = e > 0.86 ? h - rng.range(0.2, 1.8) : e > 0.62 ? rng.range(2.5, 7.5) * e : rng.range(0.25, 1.5);
    const bite = e > 0.62 ? 0.35 : 1.3;
    solid(ctx, 'wallstone', x, 0, z0 + rng.range(0, bite), x + w, top, z1 - rng.range(0, bite), { sub: 2.2, aoH: 2.5, tint: RT });
    // (y en lo alto, algún sillar suelto a punto de caer)
    if (top > 3 && rng.chance(0.5)) {
      wb.push();
      wb.translate(x + w / 2, top + 0.22, (z0 + z1) / 2 + rng.range(-1, 1));
      wb.rotateY(rng.range(-0.4, 0.4));
      wb.rotateZ(rng.range(-0.25, 0.25));
      wb.box('wallstone', -w * 0.45, -0.25, -0.5, w * 0.45, 0.25, 0.5, { ao: false, tint: RT });
      wb.pop();
    }
    x += w;
  }
  // montones de piedra a los dos lados (el grueso cayó hacia la ciudad: el
  // gigante empujaba hacia el sur)
  for (const [px, pz, n, sp, sc] of [
    [0, -119.5, 22, 3.6, 2.4],
    [-3.5, -116.5, 12, 2.4, 2.0],
    [4.2, -117.2, 12, 2.2, 2.0],
    [0.5, -128.5, 12, 2.6, 1.8],
    [-5.6, -121, 8, 1.6, 1.6],
    [5.8, -120.8, 8, 1.6, 1.6],
  ])
    P.rubble(ctx, px, 0, pz, n, 1720 + n + Math.round(px), sp, { scale: sc, mat: 'wallstone', collide: true, h: 0.9 });
  // sillares grandes por el patio de la cabecera y por fuera
  for (let i = 0; i < 16; i++) {
    const inside = i < 11;
    const px = rng.range(-9, 9),
      pz = inside ? rng.range(-121, -113.5) : rng.range(-131, -127);
    const s = rng.range(0.8, 1.5);
    wb.push();
    wb.translate(px, s * 0.32, pz);
    wb.rotateY(rng.range(0, Math.PI));
    wb.rotateX(rng.range(-0.35, 0.35));
    wb.rotateZ(rng.range(-0.35, 0.35));
    wb.box('wallstone', -s * 0.7, -s * 0.38, -s * 0.5, s * 0.7, s * 0.38, s * 0.5, { ao: false, sub: 1.2, tint: RT });
    wb.pop();
    ctx.col.add(px - s * 0.55, 0, pz - s * 0.4, px + s * 0.55, s * 0.68, pz + s * 0.4);
  }
  // las brasas del brasero que había en el adarve, ardiendo en el montón
  ctx.fires.push({ x: 2.4, y: 0.5, z: -119.6, s: 0.9, light: true, smoke: true, embers: true, glow: true });
  ctx.fires.push({ x: -2.8, y: 0.8, z: -117.4, s: 0.55, light: true, smoke: false, embers: true, glow: true });
  // que nadie se caiga del adarve por la brecha
  blocker(ctx, x1, h, z0, x1 + 0.3, h + 3, z1);
  blocker(ctx, x0 - 0.3, h, z0, x0, h + 3, z1);
  ctx.endGroup();
}

// ======================================================================
// LA NAVE DE LA CATEDRAL
// ======================================================================
// La nave (level_sacred.js: buildCathedral) se rompe por tramos, de norte a
// sur: el gigante abre el tejado de la cabecera, se mete en la nave
// reventando la cabecera y las arquerías y la bóveda se viene abajo por
// detrás del que huye. Medidas y tramos:
const _za = -95,
  _zb = -66,
  _bw = (_zb - _za) / 6;
export const NAVE = {
  FY: 0.6, // el suelo
  CUT: 11.6, // lo alto de los muros (por encima, va con el tejado)
  YV: 12.6, // el arranque de la bóveda
  RV: 4.0, // su flecha
  za: _za, // las arquerías: seis tramos entre za y zb
  zb: _zb,
  bays: 6,
  bw: _bw,
  // los cuatro tramos de la nave (de norte a sur): el presbiterio, y de dos
  // en dos los de las arquerías
  secs: [
    [-108, _za],
    [_za, _za + 2 * _bw],
    [_za + 2 * _bw, _za + 4 * _bw],
    [_za + 4 * _bw, -60],
  ],
  // los fajones (de norte a sur)
  faj: [-99.8, ...Array.from({ length: 7 }, (_, i) => _za + i * _bw), -64.6],
  // las coronas de velas
  crowns: [-93.5, -82.5, -71.5],
  // los bancos que revienta la mano del gigante (dos tandas, por z)
  pews: [
    [-82, -77.5],
    [-74, -70.5],
  ],
  // el estandarte grande del presbiterio, colgado del primer fajón
  banner: { x: 0, y: 12.4, z: -99.8, w: 2.4, h: 5.2 },
};
// el tramo de la nave de una z (lo que cae justo en el límite, al del sur)
export function naveSec(z) {
  const S = NAVE.secs;
  for (let k = 0; k < S.length; k++) if (z < S[k][1] - 1e-3) return k;
  return S.length - 1;
}

// Lo que deja el gigante en la catedral: la cabecera reventada
// ('cabeceraRuin'), las arquerías rotas ('naveArcRuin:k') y los bancos
// aplastados ('naveBancosRuin:i').
export function naveBreaks(ctx, o) {
  const wb = ctx.wb;
  const { room, FY, CUT } = o;
  const rng = new RNG(1818);
  const RT = [0.78, 0.74, 0.7];
  // un bloque tumbado (y su colisión, si pesa)
  const lump = (mat, x, y, z, sx, sy, sz, rot, tint = RT, collide = true) => {
    wb.push();
    wb.translate(x, y, z);
    wb.rotateY(rot[1]);
    wb.rotateX(rot[0]);
    wb.rotateZ(rot[2]);
    wb.box(mat, -sx / 2, -sy / 2, -sz / 2, sx / 2, sy / 2, sz / 2, { ao: false, sub: 1.2, tint, room });
    wb.pop();
    if (collide) ctx.col.add(x - sx * 0.4, y - sy / 2, z - sz * 0.4, x + sx * 0.4, y + sy * 0.4, z + sz * 0.4);
  };
  const rot = () => [rng.range(-0.4, 0.4), rng.range(0, Math.PI), rng.range(-0.4, 0.4)];
  // un muro roto en dientes a lo largo de x: alto en los bordes, bajo en
  // medio (prof(e): la altura según lo lejos que esté del medio, 0..1)
  const teeth = (x0, x1, z0, z1, prof, bite = 0.3) => {
    let x = x0;
    const half = (x1 - x0) / 2,
      xc = (x0 + x1) / 2;
    while (x < x1 - 0.01) {
      const w = Math.min(x1 - x, rng.range(0.7, 1.5));
      const e = Math.abs(x + w / 2 - xc) / half;
      const b = bite * (1 - e);
      solid(ctx, 'ashlar', x, 0, z0 + rng.range(0, b), x + w, prof(e), z1 - rng.range(0, b), { sub: 2.2, aoH: 2, tint: RT });
      x += w;
    }
  };

  // ------------------------------------------------------------ el ábside
  ctx.beginGroup('absideRuin');
  // a ras (los costados, algo más altos), y lo que cayó al patio
  teeth(-7, 7, -112, -108, (e) => (e > 0.7 ? rng.range(1.6, 4.4) : rng.range(0.2, 1.1)), 1.0);
  for (const [x, z, n, sp, sc] of [
    [0, -113.5, 18, 3.8, 2.2],
    [-8.6, -114.8, 10, 2.4, 1.8],
    [8.2, -115.2, 10, 2.4, 1.8],
  ])
    P.rubble(ctx, x, 0, z, n, 1830 + n + Math.round(x * 3), sp, { scale: sc, mat: 'ashlar', collide: true, h: 0.9 });
  for (let i = 0; i < 6; i++) {
    const s = rng.range(0.7, 1.3);
    lump('ashlar', rng.range(-11, 11), s * 0.3, rng.range(-118, -112.5), s * 1.3, s * 0.6, s * 0.9, rot());
  }
  ctx.endGroup();

  // ------------------------------------------------------------ la cabecera
  ctx.beginGroup('cabeceraRuin');
  // el muro del norte de la nave: las esquinas en pie, el medio a ras
  teeth(-13, 13, -108, -104, (e) => (e > 0.7 ? rng.range(6.5, CUT) : e > 0.45 ? rng.range(2.4, 5.6) : rng.range(0.35, 1.3)), 1.4);
  // el paso: escombros apisonados del patio al presbiterio
  wb.box('ashlar', -6, 0, -108, 6, 0.9, -104, { ao: false, faces: 't', tint: [0.6, 0.57, 0.53], uv: 0.6 });
  ctx.col.add(-6, 0, -108, 6, 0.9, -104);
  for (const [x, z, n, sp, sc] of [
    [-9.2, -103, 14, 2.4, 2.0],
    [9.4, -102.6, 14, 2.4, 2.0],
    [-3.8, -102.2, 9, 1.6, 1.5],
    [4.6, -101.4, 8, 1.5, 1.4],
    [0, -106, 16, 3.2, 1.9],
  ])
    P.rubble(ctx, x, z > -104 ? 1.2 : 0.9, z, n, 1830 + n + Math.round(x * 3), sp, { scale: sc, mat: 'ashlar', collide: true, h: 0.9, room: z > -104 ? room : undefined });
  // sillares y trozos de las vidrieras por el presbiterio
  for (let i = 0; i < 7; i++) {
    const x = rng.range(-9, 9),
      z = rng.range(-103.5, -97.5);
    const s = rng.range(0.7, 1.3);
    if (Math.abs(x) < 1.6 && z > -100.5) continue;
    lump('ashlar', x, (z > -100 ? FY : 1.2) + s * 0.3, z, s * 1.3, s * 0.6, s * 0.9, rot());
  }
  // la cruz del altar, tumbada, y la mesa partida
  wb.push();
  wb.translate(2.2, 1.45, -101.6);
  wb.rotateY(0.55);
  wb.rotateZ(Math.PI / 2 - 0.1);
  wb.box('wooddark', -0.18, -3.5, -0.15, 0.18, 3.5, 0.15, { ao: false, room });
  wb.box('wooddark', -0.2, 1.3, -2.2, 0.2, 1.7, 2.2, { ao: false, room });
  wb.pop();
  lump('ashlar', -0.7, 1.55, -102.5, 1.6, 0.7, 1.0, [0.1, 0.3, -0.35]);
  lump('ashlar', 0.9, 1.4, -102.2, 1.2, 0.6, 0.9, [-0.2, -0.4, 0.4]);
  wb.box('clothWhite', -1.4, 1.21, -103.4, 0.2, 1.24, -101.8, { ao: false, faces: 't', tint: [0.6, 0.52, 0.45], room });
  P.decal(ctx, 0.5, 1.23, -102.2, 2.6);
  ctx.endGroup();

  // ------------------------------------------------------------ las arquerías
  const { za, zb, bw, secs } = NAVE;
  // los machones de cada lado (z0, z1, grueso): el arco ancho del
  // presbiterio, los de entre tramos y el último, con el muro de poniente
  const piers = [
    [-104, -102.6, 0.45],
    [-97, -94.38, 0.6],
  ];
  for (let i = 1; i <= 5; i++) piers.push([za + i * bw - 0.6, za + i * bw + 0.6, 0.45]);
  piers.push([zb - 0.62, -64, 0.6]);
  secs.forEach(([s0, s1], k) => {
    ctx.beginGroup('naveArcRuin:' + k);
    for (const x of [-5.5, 5.5]) {
      // los muñones de los machones (partidos donde caen los tramos)
      for (const [a0, b0, t] of piers) {
        const a = Math.max(a0, s0),
          b = Math.min(b0, s1);
        if (b - a < 0.05) continue;
        const h = rng.range(1.4, 5.2);
        solid(ctx, 'ashlar', x - t, 0, a, x + t, h, b, { sub: 2, aoH: 1.5, tint: RT });
        // el corte, mellado
        for (let q = 0; q < 2; q++) {
          const za0 = a + rng.range(0, (b - a) * 0.5);
          wb.box('ashlar', x - t * rng.range(0.4, 1), h, za0, x + t * rng.range(0.4, 1), h + rng.range(0.2, 0.9), Math.min(b, za0 + rng.range(0.3, 0.8)), { ao: false, tint: RT, room });
        }
      }
      // las dovelas y los trozos de los arcos, por el suelo, a los dos lados
      const n = Math.max(2, Math.round((s1 - s0) / 2.4));
      for (let q = 0; q < n; q++) {
        const z = rng.range(Math.max(s0, -103.5), Math.min(s1, -64.5));
        // (hacia las naves laterales: el pasillo del medio queda libre)
        const px = x + Math.sign(x) * rng.range(0.8, 2.6);
        if (Math.abs(px) < 1.8) continue;
        const big = rng.chance(0.35);
        lump('ashlar', px, FY + (big ? 0.45 : 0.3), z, big ? 2.2 : 1.0, big ? 0.9 : 0.6, big ? 0.9 : 0.55, rot());
      }
      P.rubble(ctx, x + Math.sign(x) * 0.6, FY, (Math.max(s0, -104) + Math.min(s1, -64)) / 2, 10, 1850 + k * 7 + (x > 0 ? 1 : 0), Math.min(2.6, (s1 - s0) * 0.25), { scale: 1.5, mat: 'ashlar', collide: true, h: 0.8, room });
    }
    ctx.endGroup();
  });

  // ------------------------------------------------------------ los bancos
  NAVE.pews.forEach(([z0, z1], i) => {
    ctx.beginGroup('naveBancosRuin:' + i);
    for (let z = -68; z >= -83; z -= 1.7) {
      if (z < z0 || z > z1) continue;
      for (const x of [-3.0, 3.0]) {
        // tablas partidas y los pies del banco, volcados
        for (let q = 0; q < 4; q++) {
          const px = x + rng.range(-1.8, 1.8),
            pz = z + rng.range(-0.8, 0.8);
          lump('wooddark', px, FY + 0.06, pz, rng.range(0.6, 1.9), 0.07, rng.range(0.18, 0.32), [rng.range(-0.15, 0.15), rng.range(0, Math.PI), rng.range(-0.25, 0.25)], [0.5, 0.42, 0.36], false);
        }
        lump('wooddark', x + rng.range(-1, 1), FY + 0.3, z + rng.range(-0.4, 0.4), 0.5, 0.6, 0.08, [rng.range(-0.6, 0.6), rng.range(0, Math.PI), 1.2], [0.5, 0.42, 0.36], false);
      }
      P.decal(ctx, rng.range(-3.5, 3.5), FY + 0.02, z, rng.range(1.6, 2.6));
    }
    ctx.endGroup();
  });
}
