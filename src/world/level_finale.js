// Lo que rompe el jefe final (la película: finale/film_*.js), en grupos que
// se muestran u ocultan (ver level.js: beginGroup): la cisterna (el pozo, las
// columnas, la cúpula) y el cráter de fuera de la muralla norte, la brecha de
// la muralla, la cabecera de la catedral y la nave, que se rompe por tramos.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, blocker, stairs } from './builders.js';
import * as P from './props.js';
import { idolFootprint } from '../entities/idol.js';

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
// la sangre negra que anega la cisterna tras la cabalgada (sobre su suelo)
export const BLOOD_Y = 2.4;

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

// La fuente sin nombre: el manantial que los romanos cubrieron con la cúpula
// y Martín con su reja, en el centro de la cisterna. Por ella toca el mundo lo
// que hay detrás de la puerta, y en ella se alza su ídolo (entities/idol.js;
// lo pone y lo mueve game/spring.js). El arzobispo se arrodilló delante para
// pactar con él y se quedó atado a él, sin que se vea nada que los ate.
// El brocal de piedra vieja, a ras del suelo; la reja de Martín, con un
// collar que abraza el hábito del ídolo y, a poniente, el boquete donde se
// arrodilló el arzobispo; las cadenas de los zunchos; lo que le han traído;
// y el suelo, agrietado alrededor.
// (r: la boca; rim: el brocal; water: el agua; holeR: el boquete de la reja)
export const SPRING = { x: 0, z: CISTERN.cz, r: 1.95, rim: 2.4, water: CISTERN.AY - 1.4, holeR: 0.48 };

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
  const PC = 8,
    N = 28;
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
  // En el medio se alza el ídolo (entities/idol.js; lo pone y lo mueve
  // game/spring.js): mira a poniente (su +z es el -x del mundo). Del ídolo
  // al mundo: (x, y, z) suyo -> (cx - z, y, cz + x)
  const W = (lx, ly, lz) => V3(cx - lz, ly, cz + lx);
  const FP = idolFootprint();
  const tc = Math.cos(FP.tw || 0),
    ts = Math.sin(FP.tw || 0);
  // ¿dentro del collar? (la estatua: un óvalo; el monolito: su losa, girada)
  const inColl = FP.rect
    ? (x, z) => {
        const lx = z - cz,
          lz = cx - x;
        return Math.abs(lx * tc - lz * ts) < FP.ax + 0.12 && Math.abs(lx * ts + lz * tc) < FP.az + 0.12;
      }
    : (x, z) => ((x - cx) / (FP.rz + 0.09)) ** 2 + ((z - cz) / (FP.rx + 0.09)) ** 2 < 1;
  // la reja de Martín: barrotes cruzados a ras del suelo, de la boca a un
  // collar de hierro que abraza al ídolo; a poniente, donde se arrodilló el
  // arzobispo, arrancados y doblados hacia arriba
  const yb = AY - 0.055;
  const breach = (x, z) => x - cx < -0.5 && Math.abs(z - cz) < 1.05;
  for (const ax of [0, 1])
    for (let o = -R1 + 0.16; o < R1 - 0.1; o += 0.3) {
      const half = Math.sqrt(Math.max(0, R1 * R1 - o * o)) - 0.02;
      // (los tramos: de la boca al collar, sin lo de dentro ni el boquete)
      let a = -half;
      const step = 0.05;
      for (let u = -half; u <= half + 1e-6; u += step) {
        const [x, z] = ax === 0 ? [cx + u, cz + o] : [cx + o, cz + u];
        const cut = inColl(x, z) || breach(x, z);
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
  // el collar
  if (FP.rect) {
    const C = [
      [FP.ax + 0.12, FP.az + 0.12],
      [-FP.ax - 0.12, FP.az + 0.12],
      [-FP.ax - 0.12, -FP.az - 0.12],
      [FP.ax + 0.12, -FP.az - 0.12],
    ].map(([x, z]) => W(x * tc + z * ts, AY - 0.02, -x * ts + z * tc));
    for (let i = 0; i < 4; i++) {
      const a = C[i],
        b = C[(i + 1) % 4];
      const len = a.distanceTo(b);
      wb.geometry('iron', new THREE.BoxGeometry(0.1, 0.07, len + 0.1), new THREE.Matrix4().compose(a.clone().lerp(b, 0.5), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(b.x - a.x, b.z - a.z), 0)), V3(1, 1, 1)), { ao: false, room });
    }
  } else wb.geometry('iron', new THREE.TorusGeometry(1, 0.05, 4, 26), new THREE.Matrix4().compose(V3(cx, AY - 0.02, cz), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), V3(FP.rz + 0.09, FP.rx + 0.09, 1)), { ao: false, room });
  // los barrotes arrancados del boquete, doblados hacia arriba
  for (let k = 0; k < 9; k++) {
    const z = cz - 0.95 + k * 0.24 + rng.range(-0.04, 0.04);
    const x = cx - Math.sqrt(Math.max(0, R1 * R1 - (z - cz) ** 2)) + 0.05;
    const L = rng.range(0.35, 0.75);
    wb.push();
    wb.translate(x + rng.range(0.15, 0.55), AY - 0.03, z);
    wb.rotateY(Math.PI + rng.range(-0.35, 0.35));
    wb.rotateZ(rng.range(0.55, 1.25));
    wb.box('iron', 0, -0.03, -0.03, L, 0.03, 0.03, { ao: false, room });
    wb.pop();
  }
  // las cadenas: del zuncho de abajo a unas argollas del brocal, flojas; dos
  // reventadas (una tirada sobre la reja, otra que cuelga del zuncho)
  // (un eslabón: el aro de pie a lo largo de la cadena, estirado, y uno sí
  // y otro no girado un cuarto de vuelta)
  const link = (p, q, i) => {
    const d = p.distanceTo(q);
    const M = new THREE.Matrix4().makeTranslation((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);
    M.multiply(new THREE.Matrix4().lookAt(p, q, Math.abs(q.y - p.y) > d * 0.95 ? V3(1, 0, 0) : V3(0, 1, 0)));
    M.multiply(new THREE.Matrix4().makeRotationZ(i % 2 ? Math.PI / 2 : 0));
    M.multiply(new THREE.Matrix4().makeScale(1, 1, Math.max(1, (d + 0.03) / 0.09)));
    M.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    wb.geometry('iron', new THREE.TorusGeometry(0.045, 0.013, 3, 6), M, { ao: false, room });
  };
  for (const [k, kind] of [
    [0, 'broken'],
    [1, 'stub'],
    [2, 'whole'],
    [3, 'whole'],
  ]) {
    const A = FP.anchors[k];
    const p0 = W(A[0], AY + A[1], A[2]);
    const dir = V3(p0.x - cx, 0, p0.z - cz).normalize();
    const p1 = V3(cx + dir.x * 2.18, AY + 0.07, cz + dir.z * 2.18);
    // la argolla del brocal
    wb.geometry('iron', new THREE.TorusGeometry(0.07, 0.018, 4, 8), new THREE.Matrix4().compose(V3(p1.x, AY + 0.06, p1.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(dir.x, dir.z), 0)), V3(1, 1, 1)), { ao: false, room });
    wb.box('iron', p1.x - 0.08, AY + 0.04, p1.z - 0.08, p1.x + 0.08, AY + 0.06, p1.z + 0.08, { ao: false, room });
    const n = 16;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const pt = V3(p0.x + (p1.x - p0.x) * u, p0.y + (p1.y - p0.y) * u - Math.sin(u * Math.PI) * 0.22, p0.z + (p1.z - p0.z) * u);
      pt.y = Math.max(AY + 0.025, pt.y);
      pts.push(pt);
    }
    const upto = kind === 'stub' ? 5 : n;
    for (let i = 0; i < upto; i++) {
      if (kind === 'broken' && i === 9) continue;
      const p = pts[i].clone(),
        q = pts[i + 1].clone();
      // (lo reventado: los eslabones de la punta, caídos sobre la reja)
      if (kind === 'broken' && i < 9) {
        p.y = Math.max(AY + 0.02, p.y - 0.05 * i);
        q.y = Math.max(AY + 0.02, q.y - 0.05 * (i + 1));
      }
      if (kind === 'stub') {
        p.lerp(V3(p0.x, AY + 0.05, p0.z), (i / 5) * 0.4);
        q.y = Math.max(AY + 0.02, q.y - 0.12 * (i + 1));
      }
      link(p, q, i);
    }
  }
  // lo que le han traído, de todas las épocas, al borde del agua: lucernas
  // romanas, monedas, una espada comida por el óxido, huesos, un rosario y
  // cabos de vela; casi todo a poniente, donde se arrodilla el que pide
  const lamp = (x, z, rot) => {
    const m = new THREE.Matrix4().compose(V3(x, AY + 0.045, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), V3(1, 1, 1));
    wb.geometry('plaster', new THREE.SphereGeometry(0.065, 8, 4), m.clone().multiply(new THREE.Matrix4().makeScale(1, 0.45, 1.1)), { ao: false, room, tint: [0.62, 0.36, 0.24] });
    wb.geometry('plaster', new THREE.BoxGeometry(0.04, 0.025, 0.07), m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.005, 0.09)), { ao: false, room, tint: [0.56, 0.32, 0.22] });
    wb.geometry('black', new THREE.CylinderGeometry(0.012, 0.012, 0.01, 6), m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.03, 0)), { ao: false, room });
  };
  for (const [a, r] of [
    [3.0, 2.15],
    [3.35, 2.2],
    [2.75, 2.25],
    [3.62, 2.12],
    [2.2, 2.3],
    [4.1, 2.25],
  ])
    lamp(cx + Math.cos(a) * r, cz + Math.sin(a) * r, a + rng.range(-0.6, 0.6));
  for (let i = 0; i < 28; i++) {
    const a = Math.PI + rng.range(-1.3, 1.3),
      r = rng.range(1.9, 2.5);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.2, 0.2), 0, rng.range(-0.2, 0.2)));
    wb.geometry(rng.chance(0.3) ? 'gold' : 'bronzeAged', new THREE.CylinderGeometry(0.014, 0.014, 0.004, 7), new THREE.Matrix4().compose(V3(cx + Math.cos(a) * r, AY + 0.046, cz + Math.sin(a) * r), q, V3(1, 1, 1)), { ao: false, room });
  }
  // la espada romana, comida por el óxido
  {
    const m = new THREE.Matrix4().compose(V3(cx - 2.25, AY + 0.055, cz + 1.0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.5, 0.04)), V3(1, 1, 1));
    wb.geometry('plateRust', new THREE.BoxGeometry(0.05, 0.012, 0.5), m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.12)), { ao: false, room });
    wb.geometry('plateRust', new THREE.BoxGeometry(0.11, 0.02, 0.03), m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.004, -0.14)), { ao: false, room });
    wb.geometry('wooddark', new THREE.CylinderGeometry(0.016, 0.016, 0.1, 5), m.clone().multiply(new THREE.Matrix4().compose(V3(0, 0.006, -0.21), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), V3(1, 1, 1))), { ao: false, room });
  }
  // el rosario, en un corro sobre el brocal, y los cabos de vela
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    wb.geometry('bone', new THREE.SphereGeometry(0.013, 5, 3), new THREE.Matrix4().makeTranslation(cx - 2.0 + Math.cos(a) * 0.1, AY + 0.052, cz - 1.05 + Math.sin(a) * 0.075), { ao: false, room });
  }
  for (const [x, z, h] of [
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
  // ------------------------------------------------------------ la sangre
  // Tras la cabalgada la cisterna se ha anegado de la sangre negra del dios,
  // que hierve (en ella se cura el gigante y en ella se hunde: acto 6): un
  // charco espeso que llena la sala hasta media altura de los muñones
  ctx.beginGroup('cisternBlood');
  {
    const yb = AY + BLOOD_Y;
    const n = 10;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const x0 = -15 + (30 * i) / n,
          x1 = -15 + (30 * (i + 1)) / n,
          z0 = cz - 15 + (30 * j) / n,
          z1 = cz - 15 + (30 * (j + 1)) / n;
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
      const r = Math.hypot(x, z - cz) / 12.8;
      return r >= 1 ? -0.06 : -0.06 + 4.86 * Math.pow(1 - r * r, 1.2);
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

// ======================================================================
// LA TORRE OESTE DE LA PUERTA SUR
// ======================================================================
// La de la primera espringala (la película, actos 3 y 4): maciza hasta lo
// alto, con un cadalso de madera encima, más ancho que la torre y con su
// pretil de tablas, donde la guarnición montó la espringala (la pone la
// película: finale/springald.js). Se sube por una escalera larga de madera,
// sobre caballetes, que sale de la plaza y se apoya en la torre.
export const TOWER_S = {
  x: -5.5,
  z: 60,
  w: 4.5,
  h: 12,
  // el cadalso: [x0, z0, x1, z1] y la altura de su suelo
  deck: [-8.9, 56.6, -2.1, 63.4],
  deckY: 12.15,
  // la escalera: sube hacia el sur desde la plaza
  stair: { x: -5.5, z0: 43.6, n: 40, rise: 0.3, run: 0.33, w: 1.8 },
  // la espringala, en medio del cadalso, mirando al norte
  gun: [-5.5, 12.15, 60.4],
};

export function springaldTowerS(ctx) {
  const wb = ctx.wb;
  const T = TOWER_S;
  const x0 = T.x - T.w / 2,
    x1 = T.x + T.w / 2,
    z0 = T.z - T.w / 2,
    z1 = T.z + T.w / 2;
  // el cuerpo de la torre (sin almenas: arriba va el cadalso) y su cornisa
  solid(ctx, 'wallstone', x0, 0, z0, x1, T.h, z1, { sub: 2.2, aoH: 3, faces: 'nsew' });
  wb.box('wallstone', x0 - 0.3, T.h - 0.5, z0 - 0.3, x1 + 0.3, T.h, z1 + 0.3, { ao: false, sub: 3, faces: 'tnsewb', mats: { t: 'flag' } });
  for (let y = 4; y < T.h - 2; y += 4.5)
    for (const [sx, sz, rx, rz] of [
      [T.x, z1 + 0.02, 0.12, 0],
      [x0 - 0.02, T.z, 0, 0.12],
    ])
      wb.box('black', sx - rx - 0.001, y, sz - rz - 0.001, sx + rx + 0.001, y + 1.2, sz + rz + 0.001, { ao: false, grime: false });
  // ---- el cadalso: tablas sobre vigas que vuelan de la torre, y un pretil
  // (grupo 'torreSurTop': lo revienta el gigante con el brazo; sus restos,
  // en 'torreSurTopRuin')
  const [dx0, dz0, dx1, dz1] = T.deck;
  const dy = T.deckY;
  ctx.beginGroup('torreSurTop');
  const PT = [0.62, 0.55, 0.48];
  wb.box('planks', dx0, dy - 0.15, dz0, dx1, dy, dz1, { ao: false, faces: 'tnsewb', uv: 0.5, tint: PT, sub: 2 });
  ctx.col.add(dx0, dy - 0.4, dz0, dx1, dy, dz1);
  // vigas por debajo, que asoman por los cuatro lados, y tornapuntas
  for (let k = 0; k < 4; k++) {
    const u = lerp4(dx0 + 0.5, dx1 - 0.5, k / 3);
    wb.box('timber', u - 0.13, dy - 0.45, dz0 - 0.2, u + 0.13, dy - 0.15, dz1 + 0.2, { ao: false, tint: [0.7, 0.6, 0.5] });
    const v = lerp4(dz0 + 0.5, dz1 - 0.5, k / 3);
    wb.box('timber', dx0 - 0.2, dy - 0.72, v - 0.12, dx1 + 0.2, dy - 0.45, v + 0.12, { ao: false, tint: [0.66, 0.56, 0.46] });
  }
  for (const [ax, az, bx, bz] of [
    [x0, T.z, dx0 + 0.2, T.z],
    [x1, T.z, dx1 - 0.2, T.z],
    [T.x, z0, T.x, dz0 + 0.2],
    [T.x, z1, T.x, dz1 - 0.2],
  ])
    strut(wb, new THREE.Vector3(ax, T.h - 2.6, az), new THREE.Vector3(bx, dy - 0.5, bz), 0.12);
  // el pretil: postes y tablas (con un hueco al norte, donde llega la
  // escalera)
  const S = T.stair;
  const gx0 = S.x - S.w / 2 - 0.05,
    gx1 = S.x + S.w / 2 + 0.05;
  const rail = (a0, b0, a1, b1) => {
    wb.box('planks', a0, dy, b0, a1, dy + 1.05, b1, { ao: false, uv: 0.5, tint: [0.56, 0.5, 0.44], faces: 'tnsewb' });
    blocker(ctx, a0, dy, b0, a1, dy + 1.4, b1);
  };
  rail(dx0, dz1 - 0.1, dx1, dz1);
  rail(dx0, dz0 + 0.1, dx0 + 0.1, dz1 - 0.1);
  rail(dx1 - 0.1, dz0 + 0.1, dx1, dz1 - 0.1);
  rail(dx0, dz0, gx0, dz0 + 0.1);
  rail(gx1, dz0, dx1, dz0 + 0.1);
  for (const [px, pz] of [
    [dx0, dz0],
    [dx1, dz0],
    [dx0, dz1],
    [dx1, dz1],
    [gx0, dz0],
    [gx1, dz0],
    [dx0, T.z],
    [dx1, T.z],
    [T.x, dz1],
  ])
    wb.box('timber', px - 0.12, dy - 0.15, pz - 0.12, px + 0.12, dy + 1.3, pz + 0.12, { ao: false, tint: [0.62, 0.52, 0.42] });
  ctx.endGroup();
  towerTopRuin(ctx);
  // ---- la escalera, sobre caballetes, con sus pasamanos (grupo
  // 'torreSurStair': el gigante se la lleva por delante)
  ctx.beginGroup('torreSurStair');
  stairs(ctx, S.x, 0, S.z0, 's', S.w, S.n, S.rise, S.run, 'planks', { faces: 'tnsewb' });
  const L = S.n * S.run,
    H = S.n * S.rise;
  for (const sx of [-1, 1]) {
    const x = S.x + sx * (S.w / 2 + 0.05);
    // la zanca y el pasamanos
    strut(wb, new THREE.Vector3(x, -0.05, S.z0), new THREE.Vector3(x, H - 0.05, S.z0 + L), 0.11, 'timber');
    strut(wb, new THREE.Vector3(x, 1.05, S.z0 + 0.2), new THREE.Vector3(x, H + 1.05, S.z0 + L), 0.06, 'timber');
    for (let k = 1; k < 8; k++) {
      const z = S.z0 + (k / 8) * L,
        y = (k / 8) * H;
      wb.box('timber', x - 0.05, y, z - 0.05, x + 0.05, y + 1.05, z + 0.05, { ao: false, tint: [0.62, 0.52, 0.42] });
    }
    // que nadie se caiga por los lados
    for (let k = 0; k < S.n; k += 4) {
      const za = S.z0 + k * S.run,
        zb = za + 4 * S.run;
      const ya = k * S.rise;
      blocker(ctx, x - 0.08, ya, za, x + 0.08, ya + 1.2 + 4 * S.rise, zb);
    }
  }
  // los caballetes
  for (const z of [47, 50.5, 54]) {
    const y = ((z - S.z0) / L) * H - 0.1;
    for (const sx of [-1, 1]) {
      const x = S.x + sx * (S.w / 2 + 0.25);
      strut(wb, new THREE.Vector3(x + sx * 0.6, 0, z), new THREE.Vector3(x, y, z), 0.12, 'timber');
    }
    wb.box('timber', S.x - S.w / 2 - 0.35, y - 0.25, z - 0.12, S.x + S.w / 2 + 0.35, y, z + 0.12, { ao: false, tint: [0.62, 0.52, 0.42] });
  }
  ctx.endGroup();
  stairRuin(ctx);
}
// Lo que queda de lo alto de la torre: la cornisa con cascotes y astillas,
// dos vigas partidas que asoman y cuelgan, un poste del pretil en pie y
// tablas sueltas
function towerTopRuin(ctx) {
  const wb = ctx.wb;
  const T = TOWER_S;
  const rng = new RNG(5521);
  ctx.beginGroup('torreSurTopRuin');
  const y = T.h;
  P.rubble(ctx, T.x + 0.4, y, T.z - 0.3, 12, 5522, 1.4, { scale: 0.8, mat: 'wallstone' });
  for (let k = 0; k < 7; k++) {
    wb.push();
    wb.translate(T.x + rng.range(-1.8, 1.8), y + 0.12, T.z + rng.range(-1.8, 1.8));
    wb.rotateY(rng.range(0, Math.PI));
    wb.rotateZ(rng.range(-0.25, 0.25));
    wb.box('planks', -rng.range(0.5, 1.1), -0.04, -0.12, rng.range(0.5, 1.1), 0.04, 0.12, { ao: false, tint: [0.56, 0.5, 0.44] });
    wb.pop();
  }
  // vigas partidas: asoman de la torre y cuelgan
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
// La escalera tras la embestida: el tramo de abajo, y del resto sólo la
// zanca rota y los peldaños por el suelo
function stairRuin(ctx) {
  const wb = ctx.wb;
  const S = TOWER_S.stair;
  const rng = new RNG(5531);
  ctx.beginGroup('torreSurStairRuin');
  const n = 14;
  stairs(ctx, S.x, 0, S.z0, 's', S.w, n, S.rise, S.run, 'planks', { faces: 'tnsewb' });
  for (const sx of [-1, 1]) {
    const x = S.x + sx * (S.w / 2 + 0.05);
    strut(wb, new THREE.Vector3(x, -0.05, S.z0), new THREE.Vector3(x, n * S.rise - 0.05, S.z0 + n * S.run), 0.11, 'timber');
    // (la zanca partida, caída sobre la plaza)
    strut(wb, new THREE.Vector3(x, n * S.rise - 0.1, S.z0 + n * S.run), new THREE.Vector3(x + sx * 1.6, 0.1, S.z0 + n * S.run + 3.4), 0.1, 'timber');
  }
  for (let k = 0; k < 16; k++) {
    wb.push();
    wb.translate(S.x + rng.range(-3, 3), 0.06, S.z0 + n * S.run + rng.range(0.5, 9));
    wb.rotateY(rng.range(0, Math.PI));
    wb.rotateZ(rng.range(-0.2, 0.2));
    wb.box('planks', -rng.range(0.5, 0.9), -0.05, -0.15, rng.range(0.5, 0.9), 0.05, 0.15, { ao: false, tint: [0.56, 0.5, 0.44] });
    wb.pop();
  }
  ctx.endGroup();
}
const lerp4 = (a, b, k) => a + (b - a) * k;
// un madero (o una viga) de a a b
function strut(wb, a, b, r, mat = 'timber') {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  wb.geometry(mat, new THREE.BoxGeometry(r * 2, len, r * 2), new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1)), { ao: false, tint: [0.62, 0.52, 0.42] });
}
