// Lo que rompe el jefe final (la película: finale/film_*.js), en grupos que
// se muestran u ocultan (ver level.js: beginGroup): la cisterna (el pozo, las
// columnas, la cúpula) y el cráter de fuera de la muralla norte, la brecha de
// la muralla, la cabecera de la catedral y la nave, que se rompe por tramos.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, blocker, subtractRects, archRing } from './builders.js';
import { bakeCorpse } from '../entities/models.js';
import * as P from './props.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// Medidas de la cisterna y del cráter (las comparte la película).
export const CISTERN = {
  cz: -152, // centro
  AY: -10, // suelo
  YT: 0.5, // la bóveda del círculo, junto al muro
  DOME: 5.2, // y en medio, lo más alto
  RP: 6.6, // radio del pozo
  DEPTH: 17, // hondo del pozo (bajo el suelo)
  CRATER: 13.5, // medio lado del cuadro del cráter en la superficie
};
// la sangre negra que anega la cisterna tras la cabalgada (sobre su suelo)
export const BLOOD_Y = 2.4;

// el otero de tierra que tapa la cisterna en el campo (antes de que el
// gigante lo reviente): su radio y su alto en medio; la bóveda del círculo,
// por debajo (ver sanctum.js)
export const MOUND = { r: 13.4, h: 6.2 };
export const moundY = (x, z) => {
  const r = Math.hypot(x, z - CISTERN.cz) / MOUND.r;
  return r >= 1 ? -0.06 : -0.06 + MOUND.h * Math.pow(1 - r * r, 1.2);
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

// La fuente sin nombre: el manantial que Martín cerró con su reja, en el
// centro del círculo de la cisterna. Por ella toca el mundo lo que hay
// detrás de la puerta; al fondo del círculo, en la sima, se alza su estatua
// (entities/idol_statue*.js; la pone y la mueve game/spring.js). El
// arzobispo se arrodilló sobre la fuente, de cara a la estatua, para pactar
// con ella y se quedó atado a ella, sin que se vea nada que los ate.
// El brocal de piedra vieja, a ras del suelo; la reja de Martín y, al norte,
// el boquete donde se arrodilló el arzobispo; lo que le han traído; y el
// suelo, agrietado alrededor.
// (r: la boca; rim: el brocal; water: el agua; holeR: el boquete de la reja)
export const SPRING = { x: 0, z: CISTERN.cz, r: 1.95, rim: 2.4, water: CISTERN.AY - 1.4, holeR: 0.48 };
// el cuadro del suelo que se hunde con el rito (medio lado; ver cisternPit)
export const FLOOR_C = 7.5;

// El santuario de la cisterna (world/sanctum.js): el círculo de roca con la
// fuente en el centro; al sur, la sima de la estatua; al norte, el pasillo
// de las columnas, su atrio y el paso que viene de la puerta del dios.
export const SANCT = {
  R: 11, // el radio del círculo (su centro, el de la fuente)
  // la sima: de lado a lado (x), del borde a la pared del fondo (z), su
  // suelo y su agua
  apse: { x0: -6.9, x1: 6.9, lip: -143.5, back: -135.9, floor: -16.3, water: -15.3 },
  // la estatua: el pie, en el agua de la sima; mira al norte
  idol: { x: 0, y: -15.3, z: -139.8 },
  // el pasillo de las columnas: sus muros, la nave, las dos filas (x y
  // radio) con sus tramos (z) y el techo, que baja hacia el sur con el monte
  // de encima ([hasta z, altura])
  nave: { x0: -10, x1: 10, z0: -188, z1: -163.6, aisle: 4.4, colX: 6, colR: 1.2, cols: [-184, -178, -172, -166], ceil: [[-180, 3.0], [-175, 0.5], [-163.6, -1.0]] },
  narthex: { x0: -15, x1: 5, z0: -192, z1: -188, top: -4 },
  paso: { x0: -15, x1: -12.3, z0: -188, z1: -149.5, top: -5.4 },
  // la boca del círculo (la del pasillo) y la puerta del río, al este
  portal: { w: 8.8, h: 7.6, z0: -163.6, z1: -161.9 },
  door: { x: 11.35, z: -152, w: 4, h: 4.2 },
};

// Un anillo plano del círculo de radio R al cuadrado de medio lado PC (en
// y), partido en M anillos para la luz horneada, con la textura alineada con
// el mundo (u = x, v = z): sin juntas en estrella entre los gajos
function planarRing(cx, cz, y, R, PC, N, M) {
  const pos = [],
    nor = [],
    uv = [];
  const P = (t, j) => {
    const c = Math.cos(t),
      s = Math.sin(t);
    const m = PC / Math.max(Math.abs(c), Math.abs(s));
    const r = R + (m - R) * (j / M);
    return [cx + c * r, y, cz + s * r];
  };
  for (let k = 0; k < N; k++) {
    const t0 = (k / N) * Math.PI * 2,
      t1 = ((k + 1) / N) * Math.PI * 2;
    for (let j = 0; j < M; j++) {
      const a = P(t0, j),
        b = P(t1, j),
        c = P(t1, j + 1),
        d = P(t0, j + 1);
      for (const v of [a, b, c, a, c, d]) {
        pos.push(...v);
        nor.push(0, 1, 0);
        uv.push(v[0], v[2]);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

export function cisternSpring(ctx, room, VT) {
  const wb = ctx.wb;
  const { AY } = CISTERN;
  const { x: cx, z: cz, r: R1, rim: R2, water: YW, holeR } = SPRING;
  // (N, múltiplo de 8: el anillo llega justo a las esquinas del cuadro; con
  // 28 quedaban cuatro rendijas sin suelo)
  const PC = FLOOR_C,
    N = 32;
  const rng = new RNG(1691);
  const C = (t, r, y) => V3(cx + Math.cos(t) * r, y, cz + Math.sin(t) * r);
  // el suelo de alrededor (del brocal al cuadro) y la sangre encima
  wb.geometry('flag', planarRing(cx, cz, AY, R2, PC, N, 4), null, { ao: false, room, uvScale: 0.5 });
  wb.geometry('blood', planarRing(cx, cz, AY + 0.04, R2 + 0.06, PC, N, 4), null, { ao: false, grime: false, room, uvScale: 0.2 });
  for (let k = 0; k < N; k++) {
    const t0 = (k / N) * Math.PI * 2,
      t1 = ((k + 1) / N) * Math.PI * 2;
    // el brocal: un aro de piedra negra y gastada, un dedo por encima del
    // suelo, con su canto por fuera
    const rimT = [0.32, 0.3, 0.29];
    wb.quad('mossstone', C(t0, R1, AY + 0.04), C(t1, R1, AY + 0.04), C(t1, R2, AY + 0.04), C(t0, R2, AY + 0.04), { ao: false, sub: 1, room, tint: rimT });
    wb.quad('mossstone', C(t0, R2, AY + 0.04), C(t1, R2, AY + 0.04), C(t1, R2, AY - 0.02), C(t0, R2, AY - 0.02), { ao: false, sub: 1, room, tint: rimT });
    // el pozo, hasta el agua y algo más (caras hacia dentro)
    wb.quad('mossstone', C(t0, R1, AY + 0.04), C(t0, R1, YW - 0.3), C(t1, R1, YW - 0.3), C(t1, R1, AY + 0.04), { ao: false, sub: 1.2, room, tint: VT.map((v) => v * 0.55) });
  }
  // la reja de Martín: barrotes cruzados a ras del suelo, de lado a lado de
  // la boca; al norte, donde se arrodilló el arzobispo, arrancados y doblados
  // hacia arriba
  const yb = AY - 0.055;
  const breach = (x, z) => z - cz < -0.5 && Math.abs(x - cx) < 1.05;
  for (const ax of [0, 1])
    for (let o = -R1 + 0.16; o < R1 - 0.1; o += 0.3) {
      const half = Math.sqrt(Math.max(0, R1 * R1 - o * o)) - 0.02;
      // (los tramos: de lado a lado, sin el boquete)
      let a = -half;
      const step = 0.05;
      for (let u = -half; u <= half + 1e-6; u += step) {
        const [x, z] = ax === 0 ? [cx + u, cz + o] : [cx + o, cz + u];
        const cut = breach(x, z);
        const end = u + step > half + 1e-6;
        if (cut || end) {
          const b = cut ? u - step * 0.5 : half;
          if (b - a > 0.08) {
            if (ax === 0) wb.box('iron', cx + a, yb, cz + o - 0.03, cx + b, AY - 0.005, cz + o + 0.03, { ao: false, room });
            else wb.box('iron', cx + o - 0.03, yb, cz + a, cx + o + 0.03, AY - 0.005, cz + b, { ao: false, room });
          }
          a = u + step;
        }
      }
    }
  // un aro de hierro en el borde, donde se clavan los barrotes
  wb.geometry('iron', new THREE.TorusGeometry(R1 - 0.02, 0.045, 4, 32), new THREE.Matrix4().compose(V3(cx, AY - 0.02, cz), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), V3(1, 1, 1)), { ao: false, room });
  // los barrotes arrancados del boquete, doblados hacia arriba
  for (let k = 0; k < 9; k++) {
    const x = cx - 0.95 + k * 0.24 + rng.range(-0.04, 0.04);
    const z = cz - Math.sqrt(Math.max(0, R1 * R1 - (x - cx) ** 2)) + 0.05;
    const L = rng.range(0.35, 0.75);
    wb.push();
    wb.translate(x, AY - 0.03, z + rng.range(0.15, 0.55));
    wb.rotateY(Math.PI / 2 + rng.range(-0.35, 0.35));
    wb.rotateZ(rng.range(0.55, 1.25));
    wb.box('iron', 0, -0.03, -0.03, L, 0.03, 0.03, { ao: false, room });
    wb.pop();
  }
  // lo que le han traído, de todas las épocas, al borde del agua: lucernas
  // romanas, monedas, una espada comida por el óxido, huesos, un rosario y
  // cabos de vela; casi todo al norte, donde se arrodilla el que pide
  const lamp = (x, z, rot) => {
    const m = new THREE.Matrix4().compose(V3(x, AY + 0.045, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), V3(1, 1, 1));
    wb.geometry('plaster', new THREE.SphereGeometry(0.065, 8, 4), m.clone().multiply(new THREE.Matrix4().makeScale(1, 0.45, 1.1)), { ao: false, room, tint: [0.62, 0.36, 0.24] });
    wb.geometry('plaster', new THREE.BoxGeometry(0.04, 0.025, 0.07), m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.005, 0.09)), { ao: false, room, tint: [0.56, 0.32, 0.22] });
    wb.geometry('black', new THREE.CylinderGeometry(0.012, 0.012, 0.01, 6), m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.03, 0)), { ao: false, room });
  };
  for (const [a, r] of [
    [4.4, 2.15],
    [4.75, 2.2],
    [4.15, 2.25],
    [5.02, 2.12],
    [3.6, 2.3],
    [5.5, 2.25],
  ])
    lamp(cx + Math.cos(a) * r, cz + Math.sin(a) * r, a + rng.range(-0.6, 0.6));
  for (let i = 0; i < 28; i++) {
    const a = -Math.PI / 2 + rng.range(-1.3, 1.3),
      r = rng.range(1.9, 2.5);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.2, 0.2), 0, rng.range(-0.2, 0.2)));
    wb.geometry(rng.chance(0.3) ? 'gold' : 'bronzeAged', new THREE.CylinderGeometry(0.014, 0.014, 0.004, 7), new THREE.Matrix4().compose(V3(cx + Math.cos(a) * r, AY + 0.046, cz + Math.sin(a) * r), q, V3(1, 1, 1)), { ao: false, room });
  }
  // la espada romana, comida por el óxido
  {
    const m = new THREE.Matrix4().compose(V3(cx + 1.0, AY + 0.055, cz - 2.25), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 2.07, 0.04)), V3(1, 1, 1));
    wb.geometry('plateRust', new THREE.BoxGeometry(0.05, 0.012, 0.5), m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.12)), { ao: false, room });
    wb.geometry('plateRust', new THREE.BoxGeometry(0.11, 0.02, 0.03), m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.004, -0.14)), { ao: false, room });
    wb.geometry('wooddark', new THREE.CylinderGeometry(0.016, 0.016, 0.1, 5), m.clone().multiply(new THREE.Matrix4().compose(V3(0, 0.006, -0.21), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), V3(1, 1, 1))), { ao: false, room });
  }
  // el rosario, en un corro sobre el brocal, y los cabos de vela
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    wb.geometry('bone', new THREE.SphereGeometry(0.013, 5, 3), new THREE.Matrix4().makeTranslation(cx - 1.05 + Math.cos(a) * 0.075, AY + 0.052, cz - 2.0 + Math.sin(a) * 0.1), { ao: false, room });
  }
  for (const [z, x, h] of [
    [-2.3, -0.4, 0.07],
    [-2.2, 0.35, 0.12],
    [-2.35, 0.75, 0.05],
    [-1.95, -1.35, 0.09],
  ])
    wb.cylinder('candle', cx + x, AY + 0.04, cz + z, 0.03, 0.026, h, 6, { ao: false, capTop: true, room });
  P.bones(ctx, cx + 1.6, AY + 0.04, cz + 1.7, 5, 1693, 0.5);
  // grietas en el suelo, alrededor de la fuente: el suelo no aguanta lo que
  // tiene encima (oscuras; alguna, con el rojo de abajo)
  for (let k = 0; k < 12; k++) {
    let a = (k / 12) * Math.PI * 2 + rng.range(-0.2, 0.2);
    let r = R2 + 0.05;
    let x = cx + Math.cos(a) * r,
      z = cz + Math.sin(a) * r;
    const len = rng.range(1.2, 3.2);
    for (let d = 0; d < len; d += 0.22) {
      a += rng.range(-0.25, 0.25);
      r += 0.22;
      const nx = cx + Math.cos(a) * r,
        nz = cz + Math.sin(a) * r;
      const w = 0.05 * (1 - d / len) + 0.012;
      const mx = (x + nx) / 2,
        mz = (z + nz) / 2;
      const hot = k % 4 === 0 && d < len * 0.4;
      wb.geometry(hot ? 'redGlow' : 'black', new THREE.BoxGeometry(w, 0.012, Math.hypot(nx - x, nz - z) + w), new THREE.Matrix4().compose(V3(mx, AY + 0.046, mz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(nx - x, nz - z), 0)), V3(1, 1, 1)), { ao: false, grime: false, room });
      x = nx;
      z = nz;
    }
  }
  // la luz roja del fondo del pozo (la que late la pone game/spring.js)
  ctx.lights.push({ x: cx, y: AY - 0.9, z: cz, r: 1, g: 0.2, b: 0.1, radius: 3.6, intensity: 1.3, room });
}

// Lo que queda de la cisterna tras salir el gigante (los muñones de los
// contrafuertes del círculo, el borde roto de la bóveda) y el cráter de la
// superficie. o: { room, buttresses: [{ x, z, t, w, d }] (t: hacia dentro),
// ceilY(x, z): la bóveda }
export function cisternRuins(ctx, o) {
  const wb = ctx.wb;
  const { room } = o;
  const { cz, AY } = CISTERN;
  const R = SANCT.R;
  const rng = new RNG(1671);
  const RT = [0.5, 0.48, 0.46],
    VT = [0.68, 0.68, 0.65],
    AT = [0.88, 0.85, 0.79];
  // ------------------------------------------------------------ los contrafuertes
  ctx.beginGroup('cisternColsRuin');
  o.buttresses.forEach((B, i) => {
    const h = rng.range(1.4, 3.8);
    // el muñón: bloques de roca apilados, el de arriba roto en dientes
    wb.push();
    wb.translate(B.x, AY, B.z);
    wb.rotateY(Math.atan2(B.t[0], B.t[1]));
    wb.box('rock', -B.w / 2, 0, -B.d / 2, B.w / 2, h, B.d / 2, { sub: 1.2, aoH: 1.2, room, tint: RT, uv: 0.9 });
    for (let k = 0; k < 4; k++) {
      const x = rng.range(-B.w / 2 + 0.2, B.w / 2 - 0.2),
        z = rng.range(-B.d / 2 + 0.2, B.d / 2 - 0.2);
      wb.box('rock', x - 0.25, h, z - 0.22, x + 0.25, h + rng.range(0.25, 0.8), z + 0.22, { ao: false, room, tint: RT, uv: 0.9 });
    }
    wb.pop();
    // lo que cayó, hacia el centro (lo que no fue al pozo)
    for (let k = 0; k < 3; k++) {
      const d = rng.range(1.0, 2.6);
      const px = B.x + B.t[0] * d + rng.range(-0.8, 0.8),
        pz = B.z + B.t[1] * d + rng.range(-0.8, 0.8);
      if (Math.hypot(px, pz - cz) < CISTERN.RP + 0.8) continue;
      const sz = rng.range(0.5, 1.0);
      wb.push();
      wb.translate(px, AY + sz * 0.45, pz);
      wb.rotateY(rng.range(0, Math.PI));
      wb.rotateZ(rng.range(-0.4, 0.4));
      wb.box('rock', -sz, -sz * 0.5, -sz * 0.8, sz, sz * 0.5, sz * 0.8, { ao: false, room, tint: RT, uv: 0.9, faces: 'tnsewb' });
      wb.pop();
    }
    P.rubble(ctx, B.x + B.t[0] * 1.4, AY, B.z + B.t[1] * 1.4, 7, 1680 + i, 1.2, { scale: 1.2, mat: 'rock', room });
  });
  ctx.endGroup();
  // ------------------------------------------------------------ la bóveda
  // (el borde del agujero, mellado: dientes de roca que cuelgan)
  ctx.beginGroup('cisternDomeRuin');
  for (let k = 0; k < 40; k++) {
    const t = (k / 40) * Math.PI * 2 + rng.range(-0.05, 0.05);
    const r = rng.range(9.9, 10.7);
    const x = Math.cos(t) * r,
      z = cz + Math.sin(t) * r;
    if (z > SANCT.apse.lip - 0.3 && Math.abs(x) < SANCT.apse.x1 + 0.4) continue;
    const y = o.ceilY(x, z);
    const L = rng.range(0.6, 2.2),
      w = rng.range(0.35, 0.8);
    const g = new THREE.ConeGeometry(w, L, 5).toNonIndexed();
    g.rotateX(Math.PI);
    g.translate(0, -L / 2 + 0.25, 0);
    wb.geometry('rock', g, new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.35, 0.35), rng.range(0, 3), rng.range(-0.35, 0.35))), V3(1, 1, 1)), { ao: false, room, tint: RT });
  }
  // peñascos de la bóveda por el suelo que queda
  for (let k = 0; k < 9; k++) {
    const t = rng.range(0, Math.PI * 2),
      r = rng.range(8.3, R - 0.8);
    const x = Math.cos(t) * r,
      z = cz + Math.sin(t) * r;
    if (z > SANCT.apse.lip - 0.5 && Math.abs(x) < SANCT.apse.x1 + 0.5) continue;
    const sz = rng.range(0.5, 1.1);
    wb.push();
    wb.translate(x, AY + sz * 0.4, z);
    wb.rotateY(rng.range(0, Math.PI));
    wb.rotateX(rng.range(-0.3, 0.3));
    wb.box('rock', -sz, -sz * 0.55, -sz * 0.75, sz, sz * 0.55, sz * 0.75, { ao: false, room, tint: RT, uv: 0.9, faces: 'tnsewb' });
    wb.pop();
  }
  ctx.endGroup();
  // ------------------------------------------------------------ la sangre
  // Tras la cabalgada la cisterna se ha anegado de la sangre negra del dios,
  // que hierve (en ella se cura el gigante y en ella se hunde: acto 6): un
  // charco espeso que llena el círculo y la sima, hasta la cintura de la
  // estatua
  ctx.beginGroup('cisternBlood');
  {
    const yb = AY + BLOOD_Y;
    const A = SANCT.apse;
    const n = 24;
    const inside = (x, z) => Math.hypot(x, z - cz) < R + 0.6 || (Math.abs(x) < A.x1 + 0.05 && z > A.lip - 0.2 && z < A.back + 0.05);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const x0 = -12 + (24 * i) / n,
          x1 = -12 + (24 * (i + 1)) / n,
          z0 = cz - 12 + (27 * j) / n,
          z1 = cz - 12 + (27 * (j + 1)) / n;
        if (!inside((x0 + x1) / 2, (z0 + z1) / 2)) continue;
        wb.quad('fleshStatic', V3(x0, yb, z0), V3(x0, yb, z1), V3(x1, yb, z1), V3(x1, yb, z0), { ao: false, tint: [0.34, 0.08, 0.06], uv: 0.25, room });
      }
    // (hierve: humo y pavesas que suben por el cráter)
    for (const [x, z, sz] of [
      [-5, cz + 4, 1.4],
      [6, cz - 2, 1.2],
      [-2, cz - 7, 1.0],
      [3, cz + 8, 1.0],
    ])
      ctx.fires.push({ x, y: yb + 0.2, z, s: sz, smoke: true, light: true, embers: true, glow: true });
  }
  ctx.endGroup();
  // ------------------------------------------------------------ el cráter
  // (fuera de la muralla norte; la losa de suelo del cuadro va aparte: entera
  // en 'craterLid', y en su lugar, al reventar, el borde roto de 'crater')
  const C = CISTERN.CRATER;
  ctx.floorHoles.push([-C, cz - C, C, cz + C]);
  // (entero: un otero de tierra en el campo, que tapa lo alto de la cúpula de
  // la cisterna; del color del campo de alrededor, ver level_sacred.js)
  ctx.beginGroup('craterLid');
  ctx.col.add(-C, -1, cz - C, C, 0, cz + C).cam = true;
  {
    const n = 18;
    const hm = (x, z) => {
      const r = Math.hypot(x, z - cz) / MOUND.r;
      return r >= 1 ? -0.06 : -0.06 + MOUND.h * Math.pow(1 - r * r, 1.2);
    };
    const T0 = [0.56, 0.5, 0.46],
      T1 = [0.6, 0.66, 0.5];
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const x0 = -C + (2 * C * i) / n,
          x1 = -C + (2 * C * (i + 1)) / n,
          za = cz - C + (2 * C * j) / n,
          zb = cz - C + (2 * C * (j + 1)) / n;
        const k = Math.min(1, Math.max(0, hm((x0 + x1) / 2, (za + zb) / 2) / 2.5));
        const tint = T0.map((v, c) => v + (T1[c] - v) * k);
        wb.quad('dirt', V3(x0, hm(x0, za), za), V3(x0, hm(x0, zb), zb), V3(x1, hm(x1, zb), zb), V3(x1, hm(x1, za), za), { ao: false, tint, uv: 0.35 });
      }
  }
  ctx.endGroup();
  ctx.beginGroup('crater');
  {
    const RC = 10.5; // el agujero (el de la bóveda del círculo)
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
      wb.quad('dirt', L(k, 1.1), L(k, -0.6, 0.94), L(k + 1, -0.6, 0.94), L(k + 1, 1.1), { ao: false, sub: 2, tint: [0.4, 0.34, 0.3], uv: 0.4 });
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
    // trozos de la bóveda y de la roca por la tierra
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

// Las almenas del lienzo al oeste de la brecha, una a una: el gigante
// restriega el antebrazo por ellas para quitarse de encima al jugador (la
// película, acto 5) y revientan a su paso. Cada una en 'almenaN:i' y su muñón
// en 'almenaNRuin:i' (oculto hasta entonces). (Como merlons() en builders.js:
// 0,9 de ancho, 0,7 de hueco, 1,1 de alto.)
export const MERLONS_N = { x0: -19, x1: BREACH.x0, z: -125.7, y: 10, w: 0.9, gap: 0.7, h: 1.1, t: 0.6 };
export function merlonSpans() {
  const { x0, x1, w, gap } = MERLONS_N;
  const L = x1 - x0;
  const n = Math.floor((L + gap) / (w + gap));
  const start = (L - (n * w + (n - 1) * gap)) / 2;
  return Array.from({ length: n }, (_, i) => x0 + start + i * (w + gap)).map((a) => [a, a + w]);
}
export function merlonsN(ctx) {
  const wb = ctx.wb;
  const { z, y, h, t } = MERLONS_N;
  const rng = new RNG(1919);
  merlonSpans().forEach(([a, b], i) => {
    ctx.beginGroup('almenaN:' + i);
    wb.box('wallstone', a, y, z - t / 2, b, y + h, z + t / 2, { ao: false, sub: 2 });
    ctx.endGroup();
    // el muñón, mellado, y un par de piedras en el adarve
    ctx.beginGroup('almenaNRuin:' + i);
    let x = a;
    while (x < b - 0.01) {
      const w = Math.min(b - x, rng.range(0.25, 0.45));
      wb.box('wallstone', x, y, z - t / 2 + rng.range(0, 0.12), x + w, y + rng.range(0.12, 0.5), z + t / 2 - rng.range(0, 0.12), { ao: false, sub: 2 });
      x += w;
    }
    for (let k = 0; k < 2; k++) {
      const s = rng.range(0.22, 0.4);
      wb.push();
      wb.translate(rng.range(a - 0.4, b + 0.4), y + s * 0.4, z + rng.range(0.6, 1.8));
      wb.rotateY(rng.range(0, Math.PI));
      wb.rotateZ(rng.range(-0.4, 0.4));
      wb.box('wallstone', -s, -s * 0.45, -s * 0.7, s, s * 0.45, s * 0.7, { ao: false });
      wb.pop();
    }
    ctx.endGroup();
  });
}

// La torre de la muralla norte al oeste de la brecha (la levanta
// level_walls.js: gateTower). Dentro, una escala de mano de la sala a una
// trampilla en lo alto ('trampillaN' cerrada, 'trampillaNOpen' abierta);
// arriba, la segunda espringala (la película, acto 6).
export const TOWER_N = {
  x: -30,
  z: -124,
  w: 6,
  top: 16,
  // el hueco de la trampilla [x0, z0, x1, z1] y el pie de la escala
  hatch: [-31.55, -126.1, -30.45, -125.0],
  ladder: { x: -31, z: -126.1, lean: 0.08 },
  // la espringala: el pie del pivote y el del bolardo
  gun: [-29.3, 16, -124.7],
  bollard: [-31.75, 16, -122.35],
};
// las almenas del lado norte de lo alto (las revientan la mano del gigante y
// la cadena): cada una en 'almenaT:i', su muñón en 'almenaTRuin:i'. La de la
// esquina del noreste no está: por esa tronera tira la espringala (y la del
// este de la esquina tampoco: ver level_walls.js, gateTower)
export function towerNMerlons(ctx) {
  const wb = ctx.wb;
  const x0 = TOWER_N.x - TOWER_N.w / 2 - 0.3,
    L = TOWER_N.w + 0.6,
    z = TOWER_N.z - TOWER_N.w / 2,
    y = TOWER_N.top;
  const n = Math.floor((L + 0.7) / 1.6);
  const start = (L - (n * 0.9 + (n - 1) * 0.7)) / 2;
  const rng = new RNG(2121);
  for (let i = 0; i < n - 1; i++) {
    const a = x0 + start + i * 1.6,
      b = a + 0.9;
    ctx.beginGroup('almenaT:' + i);
    wb.box('wallstone', a, y, z - 0.3, b, y + 1.1, z + 0.3, { ao: false, sub: 2 });
    ctx.endGroup();
    ctx.beginGroup('almenaTRuin:' + i);
    let x = a;
    while (x < b - 0.01) {
      const w = Math.min(b - x, rng.range(0.25, 0.45));
      wb.box('wallstone', x, y, z - 0.3 + rng.range(0, 0.12), x + w, y + rng.range(0.12, 0.5), z + 0.3 - rng.range(0, 0.12), { ao: false, sub: 2 });
      x += w;
    }
    ctx.endGroup();
  }
}
// la trampilla de lo alto: cerrada (con su colisión) y abierta
export function towerNHatch(ctx) {
  const wb = ctx.wb;
  const [hx0, hz0, hx1, hz1] = TOWER_N.hatch;
  const y = TOWER_N.top;
  const lid = (open) => {
    wb.push();
    if (open) {
      // (abierta hacia el sur, de pie sobre su gozne)
      wb.translate(0, y, hz1 + 0.05);
      wb.rotateX(-Math.PI * 0.56);
      wb.translate(0, -y, -(hz1 + 0.05));
    }
    for (let i = 0; i < 4; i++) {
      const a = hx0 - 0.04 + ((hx1 - hx0 + 0.08) * i) / 4;
      wb.box('planks', a + 0.01, y, hz0 - 0.04, a + (hx1 - hx0 + 0.08) / 4 - 0.01, y + 0.07, hz1 + 0.04, { ao: false });
    }
    for (const z of [hz0 + 0.18, hz1 - 0.18]) wb.box('iron', hx0 - 0.02, y + 0.07, z - 0.04, hx1 + 0.02, y + 0.09, z + 0.04, { ao: false });
    wb.cylinder('iron', (hx0 + hx1) / 2, y + 0.09, (hz0 + hz1) / 2, 0.09, 0.09, 0.02, 8, { ao: false, capTop: true });
    wb.pop();
  };
  ctx.beginGroup('trampillaN');
  lid(false);
  ctx.col.add(hx0, y - 0.3, hz0, hx1, y + 0.07, hz1);
  ctx.endGroup();
  ctx.beginGroup('trampillaNOpen');
  lid(true);
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
          wb.box('ashlar', x - t * rng.range(0.4, 1), h, za0, x + t * rng.range(0.4, 1), h + rng.range(0.2, 0.9), Math.min(b, za0 + rng.range(0.3, 0.8)), { ao: false, faces: 'tnsew', tint: RT, room });
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

// ======================================================================
// LA TORRE OESTE DE LA PUERTA SUR
// ======================================================================
// La de la primera espringala (la película, actos 3 y 4). Encima, un cadalso
// de madera, más ancho que la torre y con su pretil de tablas, donde la
// guarnición montó la espringala (la pone la película: finale/springald.js).
// La torre es hueca: abajo tiene su puerta, de cara a la plaza, y dentro un
// husillo (una escalera de caracol de piedra alrededor de un machón) sube a
// la sala de los guardas; de ella, una escala lleva a la trampilla del
// cadalso. (Antes se subía por una escalera de madera de trece metros, sobre
// caballetes, plantada en medio de la plaza.) La puerta está atrancada por
// dentro: los de la torre se encerraron arriba, y arriba siguen. En la
// película la revienta la campana del gigante ('torreSurDoor', entera;
// 'torreSurDoorOpen', reventada).
export const TOWER_S = {
  x: -5.5,
  z: 60,
  w: 4.5,
  h: 12,
  // el grueso de los muros
  t: 0.7,
  // el cadalso: [x0, z0, x1, z1] y la altura de su suelo
  deck: [-8.9, 56.6, -2.1, 63.4],
  deckY: 12.15,
  // la puerta, en el muro del norte (x: su centro)
  door: { x: -5.5, w: 1.1, h: 2.3 },
  // el husillo: arranca junto a la puerta (a0: el ángulo, en grados, desde
  // +x hacia +z: 270, el norte) y sube girando hacia el este, da grados por
  // peldaño; n peldaños (dos vueltas), alrededor del machón (radio r0)
  spiral: { a0: 270, da: 22.5, n: 32, r0: 0.2 },
  // el suelo de la sala de los guardas: la mitad del este (por la otra sube
  // el husillo, que llega por el norte)
  roomY: 8.4,
  // la trampilla del cadalso (en el rincón del sureste) y la escala, contra
  // el muro del sur
  hatch: [-4.95, 60.6, -4.05, 61.5],
  ladder: { x: -4.5, z: 61.55, lean: 0.08 },
  // la espringala, en medio del cadalso, mirando al norte
  gun: [-5.5, 12.15, 60.4],
};
const TS_IN = (() => {
  const T = TOWER_S;
  const h = T.w / 2 - T.t;
  return { x0: T.x - h, z0: T.z - h, x1: T.x + h, z1: T.z + h, h };
})();
// Por dónde se sube el husillo: a u peldaños de la puerta (de 0 a n), a r
// del machón; la altura del peldaño que se pisa y el rumbo de quien sube.
export function towerSpiral(u, r = 0.95) {
  const T = TOWER_S,
    S = T.spiral;
  const a = ((S.a0 + S.da * u) * Math.PI) / 180;
  const rise = T.roomY / S.n;
  return { x: T.x + Math.cos(a) * r, y: Math.min(T.roomY, Math.max(0, Math.ceil(u - 0.001)) * rise), z: T.z + Math.sin(a) * r, yaw: Math.atan2(-Math.sin(a), Math.cos(a)) };
}

// Prisma recto: el polígono de planta pts ([x, z], convexo, en cualquier
// sentido) de y0 a y1, con su tapa, su fondo y sus costados.
function prism(wb, mat, pts, y0, y1, o = {}) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i],
      [bx, bz] = pts[(i + 1) % pts.length];
    area += az * bx - ax * bz;
  }
  // (la tapa mira arriba si se recorre así; si no, se da la vuelta)
  const P = area > 0 ? pts : [...pts].reverse();
  const n = P.length;
  const top = P.map(([x, z]) => V3(x, y1, z)),
    bot = P.map(([x, z]) => V3(x, y0, z));
  if (o.top !== false) for (let i = 1; i < n - 1; i++) wb.tri(mat, top[0], top[i], top[i + 1], o);
  if (o.bottom !== false) for (let i = 1; i < n - 1; i++) wb.tri(mat, bot[0], bot[i + 1], bot[i], o);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (o.skipSide && o.skipSide(P[i], P[j])) continue;
    wb.quad(mat, bot[i], bot[j], top[j], top[i], o);
  }
}

// Una cara de un muro de la torre (de fuera, 'out', o de dentro) con su
// colisión: caja [x0, y0, z0, x1, y1, z1] y las caras que se ven.
function towerWall(ctx, b, outF, inF, room, o = {}) {
  const wb = ctx.wb;
  const T = [0.74, 0.71, 0.67];
  if (outF) wb.box('wallstone', ...b, { faces: outF, sub: 2.2, aoH: 3, room: 'out', tint: o.tint });
  if (inF) wb.box('wallstone', ...b, { faces: inF, sub: 1.6, aoH: 1.4, room, tint: T, baseY: o.baseY ?? 0 });
  if (o.collide !== false) ctx.col.add(...b);
}

export function springaldTowerS(ctx, S, L) {
  const wb = ctx.wb;
  const T = TOWER_S;
  const room = 'torreSur';
  const x0 = T.x - T.w / 2,
    x1 = T.x + T.w / 2,
    z0 = T.z - T.w / 2,
    z1 = T.z + T.w / 2;
  const { x0: ix0, z0: iz0, x1: ix1, z1: iz1 } = TS_IN;
  const D = T.door;
  const dx0 = D.x - D.w / 2,
    dx1 = D.x + D.w / 2;
  const H = T.h;
  // ---- los muros (por fuera, de la calle; por dentro, de la torre): el del
  // norte, con la puerta y su dintel
  towerWall(ctx, [x0, 0, z0, dx0, H, iz0], 'nwt', 's', room);
  towerWall(ctx, [dx1, 0, z0, x1, H, iz0], 'net', 's', room);
  towerWall(ctx, [dx0, D.h, z0, dx1, H, iz0], 'nt', 's', room);
  // (el hueco: jambas y dintel por dentro del grueso)
  wb.box('wallstone', dx0 - 0.01, 0, z0, dx0, D.h, iz0, { faces: 'e', ao: false, room: 'out', tint: [0.7, 0.67, 0.63] });
  wb.box('wallstone', dx1, 0, z0, dx1 + 0.01, D.h, iz0, { faces: 'w', ao: false, room: 'out', tint: [0.7, 0.67, 0.63] });
  wb.box('wallstone', dx0, D.h, z0, dx1, D.h + 0.01, iz0, { faces: 'b', ao: false, room: 'out', tint: [0.6, 0.57, 0.53] });
  towerWall(ctx, [x0, 0, iz1, x1, H, z1], 'swet', 'n', room);
  towerWall(ctx, [x0, 0, iz0, ix0, H, iz1], 'wt', 'e', room);
  towerWall(ctx, [ix1, 0, iz0, x1, H, iz1], 'et', 'w', room);
  // la cornisa, alrededor (lo de dentro lo tapa el cadalso; sin él, el hueco
  // queda abierto)
  const CT = { ao: false, sub: 3, mats: { t: 'flag' } };
  wb.box('wallstone', x0 - 0.3, H - 0.5, z0 - 0.3, x1 + 0.3, H, z0, { ...CT, faces: 'tnsewb' });
  wb.box('wallstone', x0 - 0.3, H - 0.5, z1, x1 + 0.3, H, z1 + 0.3, { ...CT, faces: 'tnsewb' });
  wb.box('wallstone', x0 - 0.3, H - 0.5, z0, x0, H, z1, { ...CT, faces: 'twb' });
  wb.box('wallstone', x1, H - 0.5, z0, x1 + 0.3, H, z1, { ...CT, faces: 'teb' });
  // las saeteras: por fuera (la del norte, sobre la puerta) y por dentro
  for (let y = 4; y < H - 2; y += 4.5)
    for (const [sx, sz, rx, rz] of [
      [T.x, z0 - 0.02, 0.12, 0],
      [x0 - 0.02, T.z, 0, 0.12],
      [T.x, z1 + 0.02, 0.12, 0],
    ])
      wb.box('black', sx - rx - 0.001, y, sz - rz - 0.001, sx + rx + 0.001, y + 1.2, sz + rz + 0.001, { ao: false, grime: false });
  for (let y = 4; y < H - 2; y += 4.5)
    for (const [sx, sz, rx, rz, f] of [
      [T.x, iz0 + 0.01, 0.2, 0, 's'],
      [ix0 + 0.01, T.z, 0, 0.2, 'e'],
      [T.x, iz1 - 0.01, 0.2, 0, 'n'],
    ])
      wb.box('black', sx - rx - 0.005, y - 0.1, sz - rz - 0.005, sx + rx + 0.005, y + 1.3, sz + rz + 0.005, { ao: false, grime: false, faces: f, room });
  // el umbral y el marco de sillería: jambas, el dintel de una pieza y, por
  // encima, el arco de descarga
  wb.box('ashlar', dx0, 0, z0 - 0.04, dx1, 0.04, iz0, { ao: false, faces: 'tnsew' });
  for (const [a, b] of [
    [dx0 - 0.26, dx0],
    [dx1, dx1 + 0.26],
  ])
    for (let k = 0; k < 4; k++) wb.box('ashlar', a, (k * D.h) / 4, z0 - 0.06, b, ((k + 1) * D.h) / 4 - 0.015, z0 + 0.01, { ao: false, faces: 'nsewt', tint: k % 2 ? [0.62, 0.6, 0.57] : [0.68, 0.66, 0.62] });
  wb.box('ashlar', dx0 - 0.34, D.h, z0 - 0.08, dx1 + 0.34, D.h + 0.42, z0 + 0.01, { ao: false, faces: 'tnsewb', tint: [0.7, 0.68, 0.64] });
  archRing(ctx, { axis: 'x', c: D.x, w: D.w + 0.5, y0: D.h + 0.42, rise: 0.38, ring: 0.2, t0: z0 - 0.04, t1: z0 + 0.002, proud: 0, mat: 'ashlar', cam: false, seats: false });
  // ---- dentro: el suelo y lo que queda junto a la puerta
  wb.box('flag', ix0, -0.05, iz0, ix1, 0.02, iz1, { faces: 't', ao: false, room, tint: [0.62, 0.58, 0.54] });
  // las grapas de la tranca, a los lados del hueco
  for (const x of [dx0 - 0.12, dx1 + 0.12]) wb.box('iron', x - 0.06, 1.0, iz0, x + 0.06, 1.28, iz0 + 0.14, { ao: false, room });
  // una antorcha que todavía arde, de cara al husillo (sin luz que salga a
  // la plaza por el muro: sólo la de dentro)
  {
    const [tx, ty, tz] = [ix1 - 0.3, 2.0, 59.0];
    wb.box('iron', ix1 - 0.32, ty - 0.03, tz - 0.03, ix1, ty + 0.03, tz + 0.03, { ao: false, room });
    wb.cylinder('wooddark', tx, ty - 0.1, tz, 0.035, 0.05, 0.5, 5, { ao: false, room });
    ctx.fires.push({ x: tx, y: ty + 0.38, z: tz, s: 0.4, light: false, embers: true });
    ctx.lights.push({ x: tx - 0.4, y: ty + 0.5, z: tz + 0.3, r: 1, g: 0.5, b: 0.18, radius: 6.5, intensity: 1.3, room });
  }
  // ---- el husillo: el machón y los peldaños, de piedra, cada uno una cuña
  // del machón al muro (en los rincones, más larga)
  const Sp = T.spiral;
  const rise = T.roomY / Sp.n;
  wb.cylinder('ashlar', T.x, 0, T.z, Sp.r0, Sp.r0, T.roomY + 0.02, 8, { room, capTop: true, tint: [0.66, 0.64, 0.6] });
  ctx.col.add(T.x - Sp.r0, 0, T.z - Sp.r0, T.x + Sp.r0, T.roomY, T.z + Sp.r0);
  const rad = (d) => (d * Math.PI) / 180;
  const edge = (a) => TS_IN.h / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
  const pt = (a, r) => [T.x + Math.cos(a) * r, T.z + Math.sin(a) * r];
  // (los costados que quedan contra el machón o contra el muro no se ven)
  const onWall = (q) => Math.abs(Math.abs(q[0] - T.x) - TS_IN.h) < 1e-3 || Math.abs(Math.abs(q[1] - T.z) - TS_IN.h) < 1e-3;
  const onNewel = (q) => Math.abs(Math.hypot(q[0] - T.x, q[1] - T.z) - Sp.r0) < 1e-3;
  const hidden = (p, q) => (onWall(p) && onWall(q)) || (onNewel(p) && onNewel(q));
  for (let i = 0; i < Sp.n; i++) {
    const a0 = rad(Sp.a0 + Sp.da * i),
      a1 = rad(Sp.a0 + Sp.da * (i + 1));
    // el contorno: del machón, por el muro (con el rincón, si cae dentro)
    const poly = [pt(a0, Sp.r0), pt(a0, edge(a0))];
    for (let c = Math.ceil((a0 - Math.PI / 4) / (Math.PI / 2)); ; c++) {
      const ac = Math.PI / 4 + (c * Math.PI) / 2;
      if (ac <= a0 + 1e-4) continue;
      if (ac >= a1 - 1e-4) break;
      poly.push(pt(ac, edge(ac)));
    }
    poly.push(pt(a1, edge(a1)), pt(a1, Sp.r0));
    const yt = (i + 1) * rise,
      yb = i ? i * rise - 0.3 : 0;
    const tint = i % 2 ? [0.64, 0.62, 0.58] : [0.7, 0.68, 0.64];
    prism(wb, 'ashlar', poly, yb, yt, { room, ao: false, tint, sub: 4, bottom: i > 0, skipSide: hidden });
    // (su colisión: lo que se pisa, por la mitad de la huella)
    const am = (a0 + a1) / 2,
      ro = edge(am) - 0.08,
      rm = (Sp.r0 + ro) / 2;
    ctx.col.addOBB(T.x + Math.cos(am) * rm, T.z + Math.sin(am) * rm, (ro - Sp.r0) / 2, Math.max(0.12, rm * Math.sin(rad(Sp.da) / 2) * 0.95), -am, yb, yt);
  }
  // ---- la sala de los guardas: el suelo de tablas en la mitad del este,
  // sobre su viga, con su barandilla al hueco del husillo (abierta por el
  // norte, por donde llega)
  const RY = T.roomY;
  wb.box('planks', T.x, RY - 0.12, iz0, ix1, RY, iz1, { faces: 'twb', ao: false, room, uv: 0.5, tint: [0.78, 0.72, 0.64] });
  wb.box('timber', T.x - 0.02, RY - 0.34, iz0, T.x + 0.2, RY - 0.12, iz1, { ao: false, room, faces: 'nsewb', tint: [0.66, 0.56, 0.46] });
  for (const z of [59.2, 60.8]) wb.box('timber', T.x + 0.2, RY - 0.3, z - 0.09, ix1, RY - 0.12, z + 0.09, { ao: false, room, faces: 'nsewb', tint: [0.62, 0.52, 0.42] });
  ctx.col.add(T.x, RY - 0.34, iz0, ix1, RY, iz1).cam = true;
  railingTS(ctx, T.x + 0.06, 59.75, T.x + 0.06, iz1, RY, room);
  // las cuatro paredes de la sala, hasta las vigas del cadalso: el hueco de
  // la torre queda abierto por arriba en la ruina
  // la escala hasta la trampilla
  P.ladder(ctx, T.ladder.x, RY, T.ladder.z, T.deckY - RY - 0.02, Math.PI, T.ladder.lean);
  // los guardas que atrancaron la puerta: uno sentado contra el muro, con su
  // ballesta, y el otro tendido junto a la escala; un tonel, virotes, un
  // farol que aún alumbra
  bakeCorpse(wb, -4.55, RY, iz0 + 0.32, 0.25, 'sit', 'soldier', 13);
  P.decal(ctx, -4.5, RY + 0.02, 59.1, 0.9);
  P.barrel(ctx, ix1 - 0.34, RY, 60.15, { r: 0.28, h: 0.78 });
  P.arrows(ctx, -4.75, RY, 59.75, 4, 5541, 0.35);
  P.dropped(ctx, -5.0, RY, 59.25, 2.2, 'helmet');
  P.hangingLamp(ctx, -4.7, T.deckY - 0.72, 59.6, { room, radius: 6, intensity: 1.1, dyn: 0, len: 0.45 });
  // ---- el cadalso: tablas sobre vigas que vuelan de la torre, y un pretil
  // (grupo 'torreSurTop': lo revienta el gigante con el brazo; sus restos,
  // en 'torreSurTopRuin')
  const [ex0, ez0, ex1, ez1] = T.deck;
  const dy = T.deckY;
  const [hx0, hz0, hx1, hz1] = T.hatch;
  ctx.beginGroup('torreSurTop');
  const PT = [0.62, 0.55, 0.48];
  for (const r of subtractRects([ex0, ez0, ex1, ez1], [T.hatch])) {
    wb.box('planks', r[0], dy - 0.13, r[1], r[2], dy, r[3], { ao: false, faces: 'tnsewb', uv: 0.5, tint: PT, sub: 2 });
    ctx.col.add(r[0], dy - 0.4, r[1], r[2], dy, r[3]);
  }
  // vigas por debajo, que asoman por los cuatro lados (ninguna pasa por la
  // trampilla: por dentro son el techo de la sala), y tornapuntas
  // (lo que queda dentro de la torre, de la luz de la sala)
  const beam = (b, tint) => {
    const inside = (lo, hi, a0, a1) => [
      [lo, a0, 'out'],
      [a0, a1, room],
      [a1, hi, 'out'],
    ];
    const along = b.ax === 'z';
    const crosses = along ? b.u > ix0 && b.u < ix1 : b.u > iz0 && b.u < iz1;
    const parts = crosses ? inside(b.lo, b.hi, along ? iz0 : ix0, along ? iz1 : ix1) : [[b.lo, b.hi, 'out']];
    for (const [a0, a1, rm] of parts) {
      if (along) wb.box('timber', b.u - b.r, b.y0, a0, b.u + b.r, b.y1, a1, { ao: false, tint, room: rm, faces: 'nsewb' });
      else wb.box('timber', a0, b.y0, b.u - b.r, a1, b.y1, b.u + b.r, { ao: false, tint, room: rm, faces: 'nsewb' });
    }
  };
  for (const u of [-8.4, -7.4, -5.6, -3.6, -2.6]) beam({ ax: 'z', u, r: 0.13, lo: ez0 - 0.2, hi: ez1 + 0.2, y0: dy - 0.43, y1: dy - 0.13 }, [0.7, 0.6, 0.5]);
  for (const u of [57.1, 58.75, 60.3, 62.0, 62.9]) beam({ ax: 'x', u, r: 0.12, lo: ex0 - 0.2, hi: ex1 + 0.2, y0: dy - 0.7, y1: dy - 0.43 }, [0.66, 0.56, 0.46]);
  // (la trampilla, en su marco)
  for (const [a, b, c, d] of [
    [hx0 - 0.08, hz0 - 0.08, hx1 + 0.08, hz0],
    [hx0 - 0.08, hz1, hx1 + 0.08, hz1 + 0.08],
    [hx0 - 0.08, hz0, hx0, hz1],
    [hx1, hz0, hx1 + 0.08, hz1],
  ])
    wb.box('wooddark', a, dy - 0.13, b, c, dy + 0.012, d, { ao: false, faces: 'tnsewb' });
  for (const [ax, az, bx, bz] of [
    [x0, T.z, ex0 + 0.2, T.z],
    [x1, T.z, ex1 - 0.2, T.z],
    [T.x, z0, T.x, ez0 + 0.2],
    [T.x, z1, T.x, ez1 - 0.2],
  ])
    strut(wb, new THREE.Vector3(ax, T.h - 2.6, az), new THREE.Vector3(bx, dy - 0.5, bz), 0.12);
  // el pretil: postes y tablas, cerrado
  const rail = (a0, b0, a1, b1) => {
    wb.box('planks', a0, dy, b0, a1, dy + 1.05, b1, { ao: false, uv: 0.5, tint: [0.56, 0.5, 0.44], faces: 'tnsewb' });
    blocker(ctx, a0, dy, b0, a1, dy + 1.4, b1);
  };
  rail(ex0, ez1 - 0.1, ex1, ez1);
  rail(ex0, ez0 + 0.1, ex0 + 0.1, ez1 - 0.1);
  rail(ex1 - 0.1, ez0 + 0.1, ex1, ez1 - 0.1);
  rail(ex0, ez0, ex1, ez0 + 0.1);
  for (const [px, pz] of [
    [ex0, ez0],
    [ex1, ez0],
    [ex0, ez1],
    [ex1, ez1],
    [T.x, ez0],
    [ex0, T.z],
    [ex1, T.z],
    [T.x, ez1],
  ])
    wb.box('timber', px - 0.12, dy - 0.15, pz - 0.12, px + 0.12, dy + 1.3, pz + 0.12, { ao: false, tint: [0.62, 0.52, 0.42] });
  // la tapa de la trampilla: cerrada ('trampillaS', con su colisión) y
  // abierta ('trampillaSOpen', de pie sobre su gozne, hacia el norte)
  const lid = (open) => {
    wb.push();
    if (open) {
      wb.translate(0, dy, hz0 - 0.04);
      wb.rotateX(Math.PI * 0.56);
      wb.translate(0, -dy, -(hz0 - 0.04));
    }
    for (let i = 0; i < 4; i++) {
      const a = hx0 - 0.04 + ((hx1 - hx0 + 0.08) * i) / 4;
      wb.box('planks', a + 0.01, dy, hz0 - 0.04, a + (hx1 - hx0 + 0.08) / 4 - 0.01, dy + 0.07, hz1 + 0.04, { ao: false });
    }
    for (const z of [hz0 + 0.18, hz1 - 0.18]) wb.box('iron', hx0 - 0.02, dy + 0.07, z - 0.04, hx1 + 0.02, dy + 0.09, z + 0.04, { ao: false });
    wb.cylinder('iron', (hx0 + hx1) / 2, dy + 0.09, (hz0 + hz1) / 2, 0.09, 0.09, 0.02, 8, { ao: false, capTop: true });
    wb.pop();
  };
  ctx.beginGroup('trampillaS');
  lid(false);
  ctx.col.add(hx0, dy - 0.3, hz0, hx1, dy + 0.07, hz1);
  ctx.endGroup();
  ctx.beginGroup('trampillaSOpen');
  lid(true);
  ctx.endGroup();
  ctx.endGroup();
  towerTopRuin(ctx);
  // ---- la puerta: atrancada ('torreSurDoor': la hoja de tablas con sus
  // herrajes, por fuera, y la tranca, por dentro) y reventada por la campana
  // ('torreSurDoorOpen': la hoja colgando de un gozne, la tranca partida en el
  // suelo y astillas)
  const zd = z0 + 0.22;
  ctx.beginGroup('torreSurDoor');
  wb.box('planks', dx0 + 0.01, 0.02, zd - 0.05, dx1 - 0.01, D.h - 0.01, zd + 0.05, { ao: false, faces: 'nsb', tint: [0.7, 0.62, 0.54], room: 'out' });
  wb.box('planks', dx0 + 0.01, 0.02, zd - 0.05, dx1 - 0.01, D.h - 0.01, zd + 0.05, { ao: false, faces: 's', tint: [0.6, 0.54, 0.48], room });
  for (const y of [0.35, 1.15, 1.95]) {
    wb.box('iron', dx0 + 0.04, y, zd - 0.08, dx1 - 0.04, y + 0.07, zd - 0.05, { ao: false, faces: 'tnsewb', room: 'out' });
    for (const x of [dx0 + 0.18, D.x, dx1 - 0.18]) wb.box('iron', x - 0.025, y + 0.01, zd - 0.1, x + 0.025, y + 0.06, zd - 0.08, { ao: false, room: 'out' });
  }
  wb.box('iron', dx1 - 0.2, 1.05, zd - 0.12, dx1 - 0.14, 1.2, zd - 0.05, { ao: false, room: 'out' });
  wb.box('timber', dx0 - 0.2, 1.05, iz0 + 0.02, dx1 + 0.2, 1.23, iz0 + 0.16, { ao: false, room, tint: [0.66, 0.56, 0.46] });
  ctx.col.add(dx0, 0, z0, dx1, D.h, iz0);
  ctx.endGroup();
  ctx.beginGroup('torreSurDoorOpen');
  {
    // (colgando del gozne de arriba, del lado del oeste, y caída hacia dentro)
    wb.push();
    wb.translate(dx0 + 0.04, D.h - 0.12, zd);
    wb.rotateY(-1.15);
    wb.rotateZ(-0.22);
    wb.box('planks', 0, -(D.h - 0.2), -0.05, D.w - 0.08, 0.08, 0.05, { ao: false, faces: 'tnsewb', tint: [0.66, 0.58, 0.5] });
    for (const y of [-1.85, -1.05, -0.25]) wb.box('iron', 0.03, y, -0.08, D.w - 0.12, y + 0.07, -0.05, { ao: false, faces: 'tnsewb' });
    wb.pop();
    // la tranca, partida, y astillas por dentro y por fuera
    for (const [x, z, r, l] of [
      [-5.9, 59.05, 0.5, 0.8],
      [-5.0, 58.85, -0.3, 0.62],
    ]) {
      wb.push();
      wb.translate(x, 0.09, z);
      wb.rotateY(r);
      wb.box('timber', -l / 2, -0.09, -0.07, l / 2, 0.09, 0.07, { ao: false, room, tint: [0.66, 0.56, 0.46] });
      wb.box('timber', l / 2, -0.06, -0.05, l / 2 + 0.12, 0.05, 0.02, { ao: false, room, tint: [0.86, 0.78, 0.66] });
      wb.pop();
    }
    const rr = new RNG(5551);
    for (let i = 0; i < 9; i++) {
      wb.push();
      wb.translate(D.x + rr.range(-1.1, 1.1), 0.03, z0 + rr.range(-1.6, 1.4));
      wb.rotateY(rr.range(0, Math.PI));
      wb.box('planks', -rr.range(0.12, 0.4), -0.02, -0.04, rr.range(0.12, 0.4), 0.02, 0.04, { ao: false, tint: [0.8, 0.72, 0.62] });
      wb.pop();
    }
  }
  ctx.endGroup();
  // ---- lo transitable (sin muros invisibles de la rejilla dentro de la
  // torre: los pone ella), la puerta y la zona de dentro (sin rótulo: sólo
  // se entra en la película)
  if (S) {
    S.paint(dx0, z0, dx1, iz0 + 0.1, 1);
    S.paint(ix0, iz0, ix1, iz1, 1);
  }
  if (L) {
    L.interact.push({ kind: 'examine', id: 'x_torre_sur', text: 'torreSurDoor', x: D.x, y: 1, z: z0 - 0.5, r: 1.7 });
    L.zones.push({ id: 'torre_sur', rects: [[ix0, iz0, ix1, iz1, -1, 12]], atmo: 'interior', room });
  }
}
// Barandilla de la sala de los guardas (pasamanos, balaústres y colisión) a
// lo largo de z.
function railingTS(ctx, x, za, _x, zb, y, room) {
  const wb = ctx.wb;
  const n = Math.max(2, Math.round((zb - za) / 0.34));
  for (let i = 0; i <= n; i++) {
    const z = za + ((zb - za) * i) / n;
    const s = i === 0 || i === n ? 0.05 : 0.022;
    wb.box('wooddark', x - s, y, z - s, x + s, y + 0.92, z + s, { ao: false, room });
  }
  wb.box('wooddark', x - 0.045, y + 0.9, za - 0.05, x + 0.045, y + 0.97, zb, { ao: false, room, faces: 'tnsewb' });
  ctx.col.add(x - 0.06, y, za - 0.05, x + 0.06, y + 0.97, zb).noSight = true;
}
// Lo que queda de lo alto de la torre: los muros mellados, con cascotes y
// astillas encima; dos tablas que se quedaron atravesadas sobre el hueco y
// las que cayeron dentro, a la sala de los guardas; tres vigas partidas que
// asoman y cuelgan, y un poste del pretil en pie
function towerTopRuin(ctx) {
  const wb = ctx.wb;
  const T = TOWER_S;
  const rng = new RNG(5521);
  ctx.beginGroup('torreSurTopRuin');
  const y = T.h;
  const x0 = T.x - T.w / 2,
    x1 = T.x + T.w / 2,
    z0 = T.z - T.w / 2,
    z1 = T.z + T.w / 2;
  const t = T.t / 2;
  for (const [x, z, n, s] of [
    [T.x - 0.3, z0 + t, 5, 0.6],
    [T.x + 0.7, z1 - t, 6, 0.7],
    [x0 + t, T.z - 0.5, 4, 0.6],
    [x1 - t, T.z + 0.6, 5, 0.5],
  ])
    P.rubble(ctx, x, y, z, n, 5522 + n * 7 + Math.round(x * 3), s * 0.5, { scale: 0.55, mat: 'wallstone', collide: false });
  // (atravesadas de muro a muro, sobre el hueco)
  for (const [x, z, r, l] of [
    [T.x + 0.3, T.z + 0.2, 0.25, 3.9],
    [T.x - 0.4, T.z - 0.5, -1.2, 3.7],
  ]) {
    wb.push();
    wb.translate(x, y + 0.05, z);
    wb.rotateY(r);
    wb.rotateZ(rng.range(-0.05, 0.05));
    wb.box('planks', -l / 2, -0.04, -0.13, l / 2, 0.04, 0.13, { ao: false, faces: 'tnsewb', tint: [0.56, 0.5, 0.44] });
    wb.pop();
  }
  // (las que cayeron por el hueco, sobre el suelo de la sala)
  for (let k = 0; k < 4; k++) {
    wb.push();
    wb.translate(T.x + rng.range(0.4, 1.2), T.roomY + 0.05 + k * 0.03, T.z + rng.range(-1.1, 1.1));
    wb.rotateY(rng.range(0, Math.PI));
    wb.rotateZ(rng.range(-0.12, 0.12));
    wb.box('planks', -rng.range(0.5, 0.9), -0.04, -0.12, rng.range(0.5, 0.9), 0.04, 0.12, { ao: false, faces: 'tnsewb', tint: [0.56, 0.5, 0.44] });
    wb.pop();
  }
  // vigas partidas: asoman de los muros y cuelgan
  for (const [ax, az, bx, by, bz] of [
    [T.x - 1.2, T.z + 2.2, T.x - 1.0, y - 2.4, T.z + 3.6],
    [T.x + 2.2, T.z - 0.4, T.x + 3.3, y - 1.6, T.z + 0.2],
    [T.x + 0.6, T.z - 2.2, T.x + 0.9, y - 3.2, T.z - 3.1],
  ])
    strut(wb, new THREE.Vector3(ax, y - 0.55, az), new THREE.Vector3(bx, by, bz), 0.13, 'timber');
  // un poste del pretil, en pie, con un trozo de tabla
  wb.box('timber', T.x - 2.32, y - 0.6, T.z + 2.18, T.x - 2.08, y + 1.1, T.z + 2.42, { ao: false, tint: [0.5, 0.42, 0.34] });
  wb.push();
  wb.translate(T.x - 1.6, y + 0.6, T.z + 2.3);
  wb.rotateZ(-0.5);
  wb.box('planks', -0.6, -0.05, -0.03, 0.6, 0.05, 0.03, { ao: false, tint: [0.5, 0.44, 0.38] });
  wb.pop();
  ctx.endGroup();
}
const lerp4 = (a, b, k) => a + (b - a) * k;
// un madero (o una viga) de a a b
function strut(wb, a, b, r, mat = 'timber') {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  wb.geometry(mat, new THREE.BoxGeometry(r * 2, len, r * 2), new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1)), { ao: false, tint: [0.62, 0.52, 0.42] });
}
