// El santuario del Dios Desconocido: lo que hay tras la puerta de la antesala
// (la cisterna, como la llamaron los que la cerraron). Norte = -Z.
//
// Por la puerta se entra al Paso, estrecho y a oscuras, que sube hacia el
// norte pegado a la roca; al fondo, el atrio y, por un arco, el Pasillo de
// los Gigantes: cuatro pares de columnas inmensas (lo que levantó Roma) que
// van hacia el sur, cada vez más bajas (el techo baja con el monte de
// encima), hasta la boca del Círculo, con DEO · IGNOTO en el dintel. El
// Círculo es de antes de Roma: un corro de roca viva bajo una bóveda de
// cueva, con seis contrafuertes de roca y, entre ellos, nichos con velas,
// huesos y lo que han ido dejando. En el centro, la fuente sin nombre (por
// ahí toca el mundo el dios; ahí se arrodilló el arzobispo, de cara a la
// estatua) y, al fondo, en una sima abierta en la roca, la estatua que
// encontraron los romanos (entities/idol_statue*.js; la pone y la mueve
// game/spring.js): se alza del agua roja de abajo y se agarra con una mano
// al borde. Por el este, la reja de la galería del río.
//
// El jefe final se pelea en el Círculo; el rito (finale/film_rise.js) hunde
// su centro en un pozo, tira los contrafuertes y revienta la bóveda: los
// grupos de siempre ('cisternFloorC', 'cisternPit', 'cisternCols',
// 'cisternDome', 'cisternCrown'), con lo de dentro nuevo; lo que queda, en
// level_finale.js (cisternRuins).
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { stairs, archRing, barrelVault, rampVault } from './builders.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';
import { perlin } from '../entities/colossus/sculpt.js';
import { chainFloorAnchors } from '../entities/idol_statue_geo.js';
import { CISTERN, SANCT, FLOOR_C, moundY, cisternPit, cisternSpring, cisternRuins } from './level_finale.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const { cz: CZ, AY } = CISTERN;

// matices: la sillería romana, la roca viva, las bóvedas
const AT = [0.74, 0.71, 0.66],
  CT = [0.64, 0.62, 0.58],
  RT = [0.56, 0.53, 0.5],
  VT = [0.6, 0.58, 0.55];

// ------------------------------------------------------------ la roca
// La bóveda de cueva del círculo y de la sima: por debajo del otero, con
// medio metro largo de tierra encima, y desigual
export function ceilY(x, z) {
  return moundY(x, z) - 0.95 + 0.25 * perlin(x * 0.45, 3.3, z * 0.45) + 0.1 * perlin(x * 1.3, 7.7, z * 1.3);
}
// los ángulos (desde el norte, por el este) del círculo: un punto a radio r
const ring = (t, r, y) => V3(Math.sin(t) * r, y, CZ - Math.cos(t) * r);
// lo que el círculo tiene abierto: la boca del norte, la puerta del este y
// la sima del sur (t, ángulo; y, altura)
const PORTAL_T = Math.asin(SANCT.portal.w / 2 / SANCT.R);
const DOOR_T = Math.asin(SANCT.door.w / 2 / SANCT.R);
const APSE_T = Math.asin(SANCT.apse.x1 / SANCT.R);
const wrapT = (t) => Math.atan2(Math.sin(t), Math.cos(t));
function opening(t, y) {
  const a = wrapT(t);
  if (Math.abs(a) < PORTAL_T && y < AY + SANCT.portal.h) return true;
  if (Math.abs(wrapT(a - Math.PI / 2)) < DOOR_T && y < AY + SANCT.door.h) return true;
  if (Math.abs(wrapT(a - Math.PI)) < APSE_T) return true;
  return false;
}
// los contrafuertes (ángulos) y los nichos (ángulos) entre ellos
const BUTT = [0.68, 1.22, 1.98, -0.68, -1.22, -1.98];
const NICHES = [0.95, 2.25, -0.95, -1.6, -2.25];

// Una superficie a partir de una rejilla de puntos: pt(i, j) con i en
// 0..nu y j en 0..nv; keep(i, j): la celda (i, j) va; out(p): hacia dónde
// mira la cara buena; uv(i, j, p): sus UV.
function sheet(pt, nu, nv, keep, out, uv) {
  const P = [],
    U = [],
    idx = [];
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++) {
      const p = pt(i, j);
      P.push(p.x, p.y, p.z);
      const q = uv(i, j, p);
      U.push(q[0], q[1]);
    }
  const row = nu + 1;
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3(),
    n = new THREE.Vector3();
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      if (!keep(i, j)) continue;
      const A = j * row + i,
        B = A + 1,
        C = A + row + 1,
        D = A + row;
      a.fromArray(P, A * 3);
      b.fromArray(P, B * 3);
      c.fromArray(P, C * 3);
      n.crossVectors(b.clone().sub(a), c.clone().sub(a));
      const o = out(a);
      if (n.x * o.x + n.y * o.y + n.z * o.z >= 0) idx.push(A, B, C, A, C, D);
      else idx.push(A, C, B, A, D, C);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------ el círculo
// el radio del muro de roca en el ángulo t y la altura y: desigual, con su
// zarpa abajo y los nichos
function wallR(t, y) {
  const h = y - AY;
  let r = SANCT.R + 0.3 * perlin(t * 2.0, h * 0.3, 1.7) + 0.12 * perlin(t * 6.5, h * 0.9, 5.1) + 0.04 * perlin(t * 20, h * 3, 9.3);
  r -= 0.3 * Math.max(0, 1 - h / 0.9);
  for (const tn of NICHES) {
    const d = Math.abs(wrapT(t - tn)) * SANCT.R;
    if (d > 1.05) continue;
    const wx = 1 - smooth(0.62, 1.05, d);
    const top = 2.7 + 0.45 * Math.sqrt(Math.max(0, 1 - (d / 0.85) ** 2));
    const wy = smooth(0.55, 0.8, h) * (1 - smooth(top - 0.25, top, h));
    r += 0.9 * wx * wy;
  }
  return r;
}
function smooth(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function circleWall(ctx, room) {
  const nu = 260,
    nv = 40;
  // (de abajo, bajo el suelo, a la bóveda: cada columna de la rejilla, hasta
  // la bóveda que tenga encima)
  const T = (i) => (i / nu) * TAU;
  const Y = (i, j) => {
    const t = T(i);
    const p = ring(t, SANCT.R + 0.35, 0);
    const top = ceilY(p.x, p.z) + 0.25;
    return AY - 0.3 + (top - AY + 0.3) * (j / nv);
  };
  const geo = sheet(
    (i, j) => {
      const t = T(i),
        y = Y(i, j);
      return ring(t, wallR(t, y), y);
    },
    nu,
    nv,
    (i, j) => !opening(T(i + 0.5), Y(i, j + 0.5)),
    (p) => V3(-p.x, 0, CZ - p.z),
    (i, j, p) => [T(i) * SANCT.R * 0.9, p.y * 0.9]
  );
  ctx.wb.geometry('rock', geo, null, { ao: false, room, tint: RT });
}

// un contrafuerte: un macizo de roca contra el muro, que se ensancha abajo y
// se abre arriba en la bóveda (t: su ángulo)
function buttress(ctx, t, room, seed) {
  const R0 = SANCT.R + 0.3,
    R1 = SANCT.R - 1.35;
  const half = 0.95;
  const c = ring(t, (R0 + R1) / 2, 0);
  const top = ceilY(c.x, c.z) + 0.3;
  // la sección: un rectángulo redondeado (u: por el contorno)
  const nu = 40,
    nv = 26;
  const geo = sheet(
    (i, j) => {
      const u = (i / nu) * TAU;
      const h = j / nv;
      const y = AY - 0.2 + (top - AY + 0.2) * h;
      // (ancho abajo, se estrecha y se abre arriba en la bóveda)
      const k = 1 + 0.35 * Math.max(0, 1 - h * 5) + 0.9 * Math.pow(Math.max(0, h - 0.72) / 0.28, 2);
      const cu = Math.cos(u),
        su = Math.sin(u);
      const sq = (v) => Math.sign(v) * Math.pow(Math.abs(v), 0.55);
      const radial = sq(cu) * (R0 - R1) * 0.5 * (h > 0.72 ? 1 + 0.5 * ((h - 0.72) / 0.28) : 1);
      const tang = sq(su) * half * k;
      const n = 0.12 * perlin(u * 1.5 + seed, y * 0.6, seed) + 0.06 * perlin(u * 4, y * 2.2, seed + 3);
      const r = (R0 + R1) / 2 - radial * (1 + n);
      const tt = t + (tang * (1 + n)) / r;
      return ring(tt, r, y);
    },
    nu,
    nv,
    () => true,
    (p) => {
      const q = ring(t, (R0 + R1) / 2, p.y);
      return V3(p.x - q.x, 0, p.z - q.z);
    },
    (i, j, p) => [(i / nu) * 6.5 * 0.9, p.y * 0.9]
  );
  ctx.wb.geometry('rock', geo, null, { ao: false, room, tint: RT.map((v) => v * 1.06) });
  // (lo que cuenta para el suelo y la cámara: un macizo)
  const inner = ring(t, R1, 0);
  return { x: (inner.x + c.x) / 2, z: (inner.z + c.z) / 2, t: [-Math.sin(t), Math.cos(t)], w: half * 2.2, d: R0 - R1 };
}

// La bóveda: una cueva por encima del círculo y de la sima. Lo de en medio
// (lo que revienta el gigante) va en su grupo; lo de alrededor se queda.
function vault(ctx, room) {
  const A = SANCT.apse;
  const x0 = -12.2,
    x1 = 12.2,
    z0 = CZ - 12.2,
    z1 = A.back + 0.25;
  const step = 0.5;
  const nu = Math.round((x1 - x0) / step),
    nv = Math.round((z1 - z0) / step);
  const X = (i) => x0 + i * step,
    Z = (j) => Math.min(z1, z0 + j * step);
  const inApse = (x, z) => Math.abs(x) < A.x1 + 0.25 && z > A.lip - 0.7 && z < A.back + 0.3;
  const inside = (x, z) => Math.hypot(x, z - CZ) < SANCT.R + 0.6 || inApse(x, z);
  const dome = (x, z) => Math.hypot(x, z - CZ) < 10.5 && !inApse(x, z);
  const mk = (keep) =>
    sheet(
      (i, j) => V3(X(i), ceilY(X(i), Z(j)), Z(j)),
      nu,
      nv,
      (i, j) => {
        const x = X(i + 0.5),
          z = Z(j + 0.5);
        return inside(x, z) && keep(x, z);
      },
      () => V3(0, -1, 0),
      (i, j, p) => [p.x * 0.9, p.z * 0.9]
    );
  ctx.wb.geometry('rock', mk((x, z) => !dome(x, z)), null, { ao: false, room, tint: VT });
  ctx.beginGroup('cisternDome');
  ctx.wb.geometry('rock', mk(dome), null, { ao: false, room, tint: VT });
  // estalactitas
  const rng = new RNG(1717);
  for (let k = 0; k < 46; k++) {
    const a = rng.range(0, TAU),
      r = Math.sqrt(rng.next()) * 10.2;
    const x = Math.cos(a) * r,
      z = CZ + Math.sin(a) * r;
    if (inApse(x, z)) continue;
    const L = rng.range(0.4, 1.8) * (r > 8 ? 0.7 : 1),
      w = rng.range(0.12, 0.38);
    const g = new THREE.ConeGeometry(w, L, 5).toNonIndexed();
    g.rotateX(Math.PI);
    g.translate(0, -L / 2 + 0.15, 0);
    ctx.wb.geometry('rock', g, new THREE.Matrix4().makeTranslation(x, ceilY(x, z), z), { ao: false, room, tint: VT });
  }
  ctx.endGroup();
  // (la cámara no se sale por la bóveda)
  for (let i = 0; i < nu; i += 4)
    for (let j = 0; j < nv; j += 4) {
      const x = X(i + 2),
        z = Z(j + 2);
      if (!inside(x, z)) continue;
      const y = ceilY(x, z);
      ctx.col.add(X(i), y - 0.2, Z(j), X(i + 4), y + 0.6, Z(j + 4)).cam = true;
    }
}

// el suelo del círculo: de lo que se hunde (el cuadro de en medio, en su
// grupo; ver cisternSpring y cisternPit) al muro, menos la sima
function circleFloor(ctx, room) {
  const wb = ctx.wb;
  const A = SANCT.apse;
  const PC = FLOOR_C,
    RO = SANCT.R + 0.6;
  const N = 96;
  const sq = (t) => {
    const c = Math.cos(t),
      s = Math.sin(t);
    const m = PC / Math.max(Math.abs(c), Math.abs(s));
    return V3(c * m, AY, CZ + s * m);
  };
  const Pt = SANCT.portal,
    D = SANCT.door;
  const outer = (t) => {
    const c = Math.cos(t),
      s = Math.sin(t);
    let r = RO;
    // (hasta el borde de la sima)
    if (s > 0 && Math.abs(c * r) < A.x1 + 0.3) r = Math.min(r, (A.lip - CZ) / s);
    if (s > 0 && Math.abs(c) * ((A.lip - CZ) / s) < A.x1 && CZ + s * RO > A.lip) r = Math.min(r, (A.lip - CZ) / s);
    // (y hasta el suelo de la boca del norte y el de la galería del este: si
    // no, los dos suelos, uno encima del otro, parpadean)
    if (s < 0 && Math.abs(c * r) < Pt.w / 2 + 0.8) r = Math.min(r, (CZ - Pt.z1) / -s);
    if (c > 0 && Math.abs(s * r) < D.w / 2 + 0.7) r = Math.min(r, (SANCT.R + 0.3) / c);
    return V3(c * r, AY, CZ + s * r);
  };
  for (let k = 0; k < N; k++) {
    const t0 = (k / N) * TAU,
      t1 = ((k + 1) / N) * TAU;
    // (cara arriba: del cuadro hacia el muro, en el sentido de t)
    wb.quad('flag', sq(t0), sq(t1), outer(t1), outer(t0), { ao: false, sub: 2.5, room, uv: 0.5, tint: [0.62, 0.58, 0.54] });
  }
  // (la colisión: el marco del cuadro, hasta el muro y el borde de la sima)
  const R = SANCT.R + 0.4;
  for (const [a, b, c, d] of [
    [-R, CZ - R, R, CZ - PC],
    [-R, CZ - PC, -PC, CZ + PC],
    [PC, CZ - PC, R, CZ + PC],
    [-R, CZ + PC, A.x0, CZ + R],
    [A.x1, CZ + PC, R, CZ + R],
    [A.x0, CZ + PC, A.x1, A.lip],
  ])
    ctx.col.add(a, AY - 1, b, c, AY, d);
  // manchas de sangre seca
  const rng = new RNG(1733);
  for (let k = 0; k < 9; k++) {
    const a = rng.range(0, TAU),
      r = rng.range(PC + 0.4, SANCT.R - 1.2);
    const x = Math.cos(a) * r,
      z = CZ + Math.sin(a) * r;
    if (z > A.lip - 0.8 && Math.abs(x) < A.x1 + 0.5) continue;
    const s = rng.range(0.5, 1.4);
    wb.geometry('blood', new THREE.CircleGeometry(s, 9), new THREE.Matrix4().compose(V3(x, AY + 0.03, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, rng.range(0, 3))), V3(1, rng.range(0.5, 1), 1)), { ao: false, grime: false, room });
  }
}

// la sima del fondo: las tres paredes de roca, el canto del borde (lo que
// cae del suelo del círculo) y el fondo; el agua roja la pone spring.js
function apse(ctx, room) {
  const A = SANCT.apse;
  const wb = ctx.wb;
  const zA = CZ + Math.sqrt(SANCT.R * SANCT.R - A.x1 * A.x1) - 0.4;
  // una pared de roca en un plano (x o z), de y0 a la bóveda
  const wallX = (x, f) => {
    const nu = 18,
      nv = 30;
    const Z = (i) => zA + (A.back - zA) * (i / nu);
    const Y = (i, j) => A.floor - 0.3 + (ceilY(x, Z(i)) + 0.3 - A.floor + 0.3) * (j / nv);
    return sheet(
      (i, j) => {
        const z = Z(i),
          y = Y(i, j);
        return V3(x - f * (0.18 * perlin(z * 0.7, y * 0.5, x) + 0.08 * perlin(z * 2.1, y * 1.6, x + 4)), y, z);
      },
      nu,
      nv,
      () => true,
      () => V3(f, 0, 0),
      (i, j, p) => [p.z * 0.9, p.y * 0.9]
    );
  };
  wb.geometry('rock', wallX(A.x0, 1), null, { ao: false, room, tint: RT });
  wb.geometry('rock', wallX(A.x1, -1), null, { ao: false, room, tint: RT });
  // la del fondo, con la ventana de la Confesión (la reja la pone la cripta)
  {
    const nu = 30,
      nv = 30;
    const X = (i) => A.x0 + (A.x1 - A.x0) * (i / nu);
    const Y = (i, j) => A.floor - 0.3 + (ceilY(X(i), A.back) + 0.3 - A.floor + 0.3) * (j / nv);
    const win = { x0: -1.2, x1: 1.2, y0: AY + 3.6, y1: AY + 5.0 };
    const geo = sheet(
      (i, j) => {
        const x = X(i),
          y = Y(i, j);
        const inWin = x > win.x0 - 0.2 && x < win.x1 + 0.2 && y > win.y0 - 0.2 && y < win.y1 + 0.2;
        return V3(x, y, A.back + (inWin ? 0 : 0.18 * perlin(x * 0.7, y * 0.5, 2.2) + 0.08 * perlin(x * 2.1, y * 1.6, 6.1)));
      },
      nu,
      nv,
      (i, j) => {
        const x = X(i + 0.5),
          y = Y(i + 0.5, j + 0.5);
        return !(x > win.x0 && x < win.x1 && y > win.y0 && y < win.y1);
      },
      () => V3(0, 0, -1),
      (i, j, p) => [p.x * 0.9, p.y * 0.9]
    );
    wb.geometry('rock', geo, null, { ao: false, room, tint: RT });
  }
  // el canto del borde: del suelo del círculo al fondo de la sima
  {
    const nu = 30,
      nv = 14;
    const X = (i) => A.x0 + (A.x1 - A.x0) * (i / nu);
    const geo = sheet(
      (i, j) => {
        const x = X(i),
          y = A.floor - 0.3 + (AY - A.floor + 0.3) * (j / nv);
        return V3(x, y, A.lip + (j === nv ? 0 : 0.2 * perlin(x * 0.8, y * 0.6, 3.1) + 0.08 * perlin(x * 2.4, y * 1.8, 8.4)));
      },
      nu,
      nv,
      () => true,
      () => V3(0, 0, 1),
      (i, j, p) => [p.x * 0.9, p.y * 0.9]
    );
    wb.geometry('rock', geo, null, { ao: false, room, tint: RT });
  }
  // el fondo, de roca suelta
  wb.box('rock', A.x0, A.floor - 0.4, A.lip, A.x1, A.floor, A.back, { faces: 't', ao: false, sub: 1.5, room, tint: RT.map((v) => v * 0.8), uv: 0.9 });
  // el canto, con lo que queda de un pretil: piedras desiguales
  const rng = new RNG(1741);
  for (let x = A.x0 + 0.2; x < A.x1 - 0.2; ) {
    const w = rng.range(0.5, 1.1);
    if (rng.chance(0.75)) {
      const h = rng.range(0.12, 0.34);
      wb.push();
      wb.translate(x + w / 2, AY, A.lip - 0.2);
      wb.rotateY(rng.range(-0.12, 0.12));
      wb.box('rock', -w / 2, 0, -0.2, w / 2, h, 0.2, { ao: false, room, tint: RT, uv: 0.9 });
      wb.pop();
    }
    x += w + rng.range(0.05, 0.3);
  }
  // a los dos lados del borde, los candelabros de las ofrendas: hierro y
  // velas a docenas, que le dan a la estatua de lado
  for (const s of [-1, 1]) candelabrum(ctx, s * (A.x1 - 0.55), A.lip - 0.8, room, 1745 + s);
  // la luz roja del agua de abajo (la que late, la pone spring.js)
  ctx.lights.push({ x: 0, y: A.water + 1.2, z: (A.lip + A.back) / 2, r: 1, g: 0.16, b: 0.06, radius: 14, intensity: 2.0, room });
  ctx.lights.push({ x: 0, y: A.water + 0.6, z: A.lip + 0.8, r: 1, g: 0.18, b: 0.07, radius: 8, intensity: 1.4, room });
  // y detrás de la cabeza, en la roca del fondo y en la bóveda, el rojo
  // contra el que se recorta (lo que queda del halo; el resplandor que late,
  // en spring.js)
  ctx.lights.push({ x: 0, y: AY + 7.0, z: A.back - 0.7, r: 1, g: 0.19, b: 0.07, radius: 7.5, intensity: 2.4, room });
  ctx.lights.push({ x: 0, y: AY + 8.2, z: A.back - 1.6, r: 1, g: 0.18, b: 0.07, radius: 5.5, intensity: 1.4, room });
  ctx.lights.push({ x: 0, y: AY + 1.5, z: A.back - 0.5, r: 1, g: 0.17, b: 0.06, radius: 6, intensity: 1.2, room });
}

// un candelabro de hierro de tres pisos, cargado de velas, con su luz
function candelabrum(ctx, x, z, room, seed) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  wb.cylinder('iron', x, AY, z, 0.45, 0.32, 0.14, 8, { ao: false, capTop: true, room });
  wb.cylinder('iron', x, AY + 0.14, z, 0.06, 0.05, 2.5, 6, { ao: false, room });
  for (const [y, r] of [
    [1.1, 0.75],
    [1.75, 0.55],
    [2.35, 0.34],
  ]) {
    wb.geometry('iron', new THREE.TorusGeometry(r, 0.035, 4, 16), new THREE.Matrix4().compose(V3(x, AY + y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), V3(1, 1, 1)), { ao: false, room });
    const n = Math.round(r * 13);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU;
      const cx = x + Math.cos(a) * r,
        cz = z + Math.sin(a) * r;
      const h = rng.range(0.1, 0.32);
      wb.cylinder('candle', cx, AY + y + 0.03, cz, 0.035, 0.035, h, 6, { ao: false, capTop: true, room });
      // la cera que ha chorreado
      if (rng.chance(0.4)) wb.cylinder('candle', cx, AY + y - 0.18, cz, 0.02, 0.03, 0.2, 5, { ao: false, room });
      if (ctx.fires) ctx.fires.push({ x: cx, y: AY + y + 0.08 + h, z: cz, s: 0.09, light: false, embers: false, glow: true });
    }
  }
  P.candles(ctx, x, AY, z, 7, seed + 9, { room, radius: 3, intensity: 0.5, spread: 0.7 });
  ctx.lights.push({ x, y: AY + 2.2, z, r: 1, g: 0.66, b: 0.36, radius: 11, intensity: 1.5, room });
  if (ctx.dynLights) ctx.dynLights.push({ x, y: AY + 2.6, z, intensity: 5, range: 12, priority: 3 });
  ctx.col.add(x - 0.5, AY, z - 0.5, x + 0.5, AY + 2.5, z + 0.5);
}

// la boca del círculo: un arco de sillería en la roca, con DEO · IGNOTO en el
// dintel por la cara del pasillo
function portal(ctx, room) {
  const wb = ctx.wb;
  const Pt = SANCT.portal,
    hw = Pt.w / 2;
  const top = SANCT.nave.ceil[SANCT.nave.ceil.length - 1][1];
  // (el suelo, también bajo las jambas: la rejilla deja pisar un dedo más)
  wb.box('flag', -hw - 0.7, AY - 0.3, Pt.z0, hw + 0.7, AY, Pt.z1, { faces: 't', ao: false, sub: 2, room, uv: 0.5 });
  ctx.col.add(-hw, AY - 1, Pt.z0, hw, AY, Pt.z1);
  // las jambas y los machones, hasta el arranque
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -hw - 0.7 : hw,
      x1 = s < 0 ? -hw : hw + 0.7;
    wb.box('ashlar', x0, AY, Pt.z0 - 0.05, x1, AY + Pt.h - 2.2, Pt.z1 + 0.05, { faces: s < 0 ? 'ensw' : 'wnse', sub: 1.4, aoH: 1.2, room, tint: AT });
  }
  archRing(ctx, { axis: 'x', c: 0, w: Pt.w, y0: AY + Pt.h - 2.2, rise: 2.2, ring: 0.7, t0: Pt.z0 - 0.05, t1: Pt.z1 + 0.05, top: top + 0.3, clip: [-hw - 0.7, hw + 0.7], mat: 'ashlar', spMat: 'ashlar', room, tint: AT, spTint: CT, cam: true });
  // DEO · IGNOTO, en el dintel
  wb.geometry('portalDeoIgnoto', new THREE.PlaneGeometry(6.4, 0.8), new THREE.Matrix4().compose(V3(0, top - 0.55, Pt.z0 - 0.08), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)), V3(1, 1, 1)), { ao: false, room, grime: false });
}

// ------------------------------------------------------------ el pasillo
// Una columna inmensa: plinto, basa, fuste con su éntasis, capitel y ábaco
function bigColumn(ctx, x, z, h, r, room, rng) {
  const wb = ctx.wb;
  const y = AY;
  wb.box('ashlar', x - r - 0.35, y, z - r - 0.35, x + r + 0.35, y + 0.75, z + r + 0.35, { sub: 1.4, aoH: 0.5, room, tint: AT });
  wb.cylinder('ashlar', x, y + 0.75, z, r + 0.22, r + 0.12, 0.3, 20, { ao: false, sub: 2, room, tint: AT, capTop: true });
  // (el fuste, en tres tambores: ensancha y luego adelgaza)
  const y0 = y + 1.05,
    y3 = y + h - 1.25;
  const ys = [y0, y0 + (y3 - y0) * 0.33, y0 + (y3 - y0) * 0.66, y3];
  const rs = [r, r * 1.03, r * 0.96, r * 0.86];
  for (let k = 0; k < 3; k++) wb.cylinder('ashlar', x, ys[k], z, rs[k], rs[k + 1], ys[k + 1] - ys[k], 20, { ao: false, sub: 2.5, room, tint: AT.map((v) => v * (0.94 + 0.06 * (k % 2))), phase: rng.range(0, 1) });
  // el capitel: un equino que se abre y el ábaco
  wb.cylinder('ashlar', x, y3, z, r * 0.86, r * 1.3, 0.65, 20, { ao: false, sub: 2, room, tint: AT });
  wb.box('ashlar', x - r * 1.45, y3 + 0.65, z - r * 1.45, x + r * 1.45, y + h, z + r * 1.45, { sub: 1.4, ao: false, room, tint: AT });
  // una muesca, de algo que la golpeó
  if (rng.chance(0.5)) {
    const a = rng.range(0, TAU),
      hy = rng.range(y0 + 1, y3 - 1);
    wb.push();
    wb.translate(x + Math.cos(a) * r * 0.9, hy, z + Math.sin(a) * r * 0.9);
    wb.rotateY(-a);
    wb.box('black', -0.2, -0.35, -0.3, 0.12, 0.4, 0.3, { ao: false, room, grime: false });
    wb.pop();
  }
}

function nave(ctx, room, C) {
  const wb = ctx.wb;
  const N = SANCT.nave;
  const rng = new RNG(1751);
  // el techo de cada tramo
  const lvl = (z) => {
    for (const [zz, y] of N.ceil) if (z <= zz + 1e-6) return y;
    return N.ceil[N.ceil.length - 1][1];
  };
  const segs = [];
  let za = N.z0;
  for (const [zz, y] of N.ceil) {
    segs.push([za, zz, y]);
    za = zz;
  }
  // el suelo
  wb.box('flag', N.x0, AY - 0.3, N.z0, N.x1, AY, N.z1, { faces: 't', ao: false, sub: 2.5, room, uv: 0.5, tint: [0.66, 0.62, 0.58] });
  ctx.col.add(N.x0, AY - 1, N.z0, N.x1, AY, N.z1);
  // los muros y el techo, tramo a tramo (el techo baja hacia el sur: en cada
  // escalón, su frente)
  for (const [z0, z1, y] of segs) {
    wb.box('ashlar', N.x0 - 0.6, AY, z0, N.x0, y, z1, { faces: 'e', sub: 1.6, aoH: 1.6, room, tint: CT });
    wb.box('ashlar', N.x1, AY, z0, N.x1 + 0.6, y, z1, { faces: 'w', sub: 1.6, aoH: 1.6, room, tint: CT });
    wb.box('mossstone', N.x0, y, z0, N.x1, y + 0.5, z1, { faces: 'b', ao: false, sub: 2, room, tint: VT });
    ctx.col.add(N.x0, y, z0, N.x1, y + 0.6, z1).cam = true;
    // los artesones: vigas de un lado a otro
    for (let z = z0 + 1.5; z < z1 - 0.5; z += 3)
      wb.box('ashlar', N.x0, y - 0.55, z - 0.3, N.x1, y, z + 0.3, { faces: 'bnsew', ao: false, sub: 2, room, tint: AT.map((v) => v * 0.9) });
  }
  for (let k = 1; k < segs.length; k++) {
    const z = segs[k][0],
      yHi = segs[k - 1][2],
      yLo = segs[k][2];
    // (con su cara de abajo: desde el pasillo, mirando arriba, se veía el
    // vacío por la rendija entre los dos techos)
    wb.box('ashlar', N.x0, yLo, z - 0.5, N.x1, yHi, z, { faces: 'nb', sub: 1.6, ao: false, room, tint: AT });
  }
  // el muro del sur (el de la boca del círculo) y el del norte (el del arco
  // del atrio), con sus vanos
  const yS = segs[segs.length - 1][2],
    yN = segs[0][2];
  const hw = SANCT.portal.w / 2 + 0.7;
  for (const [a, b] of [
    [N.x0, -hw],
    [hw, N.x1],
  ]) {
    wb.box('ashlar', a, AY, N.z1, b, yS, N.z1 + 0.4, { faces: 'n', sub: 1.6, aoH: 1.6, room, tint: CT });
    // (el del norte, por las dos caras: por la otra da al atrio)
    wb.box('ashlar', a, AY, N.z0 - 0.4, b, yN, N.z0, { faces: 'ns', sub: 1.6, aoH: 1.6, room, tint: CT });
  }
  // el arco grande del atrio
  const aw = SANCT.nave.aisle * 2;
  archRing(ctx, { axis: 'x', c: 0, w: aw, y0: AY + 3.6, rise: 2.2, ring: 0.6, t0: N.z0 - 0.4, t1: N.z0, top: yN, clip: [-hw, hw], mat: 'ashlar', spMat: 'ashlar', room, tint: AT, spTint: CT, cam: true });
  for (const s of [-1, 1]) wb.box('ashlar', s < 0 ? -hw : aw / 2, AY, N.z0 - 0.4, s < 0 ? -aw / 2 : hw, AY + 3.6, N.z0, { faces: 'nsew', sub: 1.4, room, tint: AT });
  // las columnas: dos filas de cuatro
  for (const z of N.cols)
    for (const s of [-1, 1]) {
      const x = s * N.colX;
      bigColumn(ctx, x, z, lvl(z) - AY, N.colR, room, rng);
      C.paint(x - N.colR - 0.35, z - N.colR - 0.35, x + N.colR + 0.35, z + N.colR + 0.35, 0);
      // y encima, el arquitrabe hasta la siguiente
    }
  for (const s of [-1, 1]) {
    const x = s * N.colX;
    for (const [z0, z1, y] of segs) wb.box('ashlar', x - 1.0, y - 1.0, z0, x + 1.0, y, z1, { faces: 'bnsew', ao: false, sub: 2, room, tint: AT.map((v) => v * 0.95) });
  }
  // la luz: braseros junto a las columnas y antorchas en los muros, a trechos
  for (const z of [N.cols[0] + 2.5, N.cols[2] + 2.5]) for (const s of [-1, 1]) P.brazier(ctx, s * 3.6, AY, z, { room, radius: 9 });
  for (const z of [N.cols[1] + 3, N.cols[3] + 2.2]) for (const s of [-1, 1]) P.wallTorch(ctx, s * (N.x1 - 0.02), AY + 3.2, z, s < 0 ? 'e' : 'w', { room, radius: 7, dyn: 2.4 });
  // los que no llegaron: arrodillados entre las columnas, de cara al círculo
  const kneel = [
    [-8.4, -181.5, 0.15],
    [8.6, -175.2, -0.1],
    [-8.7, -169.4, 0.05],
    [8.2, -186.2, 0.2],
    [-3.2, -167.8, -0.25],
  ];
  kneel.forEach(([x, z, r], i) => {
    bakeCorpse(wb, x, AY, z, r, 'kneel', i % 2 ? 'monk' : 'villager', 1760 + i);
    P.candles(ctx, x + (x < 0 ? 0.6 : -0.6), AY, z + 0.5, 3, 1770 + i, { room, radius: 3, intensity: 0.5, spread: 0.3 });
  });
  for (let k = 0; k < 8; k++) P.bones(ctx, rng.range(-9, 9), AY + 0.02, rng.range(N.z0 + 1, N.z1 - 1), 5, 1780 + k, 0.7);
}

// el atrio (al norte del pasillo) y el paso, que viene de la puerta del dios
function narthexAndPaso(ctx, room) {
  const wb = ctx.wb;
  const Nx = SANCT.narthex,
    Ps = SANCT.paso;
  // el atrio
  // (el suelo, hasta debajo de los muros: en la esquina del este quedaba un
  // palmo sin él)
  wb.box('flag', Nx.x0 - 0.5, AY - 0.3, Nx.z0 - 0.5, Nx.x1 + 0.5, AY, Nx.z1, { faces: 't', ao: false, sub: 2.5, room, uv: 0.5 });
  ctx.col.add(Nx.x0, AY - 1, Nx.z0, Nx.x1, AY, Nx.z1);
  wb.box('ashlar', Nx.x0, AY, Nx.z0 - 0.5, Nx.x1, Nx.top, Nx.z0, { faces: 's', sub: 1.6, aoH: 1.6, room, tint: CT });
  wb.box('ashlar', Nx.x0 - 0.5, AY, Nx.z0, Nx.x0, Nx.top, Nx.z1, { faces: 'e', sub: 1.6, aoH: 1.6, room, tint: CT });
  wb.box('ashlar', Nx.x1, AY, Nx.z0, Nx.x1 + 0.5, Nx.top, Nx.z1, { faces: 'w', sub: 1.6, aoH: 1.6, room, tint: CT });
  // (entre el paso y el pasillo, su muro del sur)
  wb.box('ashlar', Ps.x1, AY, Nx.z1, SANCT.nave.x0, Nx.top, Nx.z1 + 0.4, { faces: 'n', sub: 1.6, aoH: 1.6, room, tint: CT });
  barrelVault(ctx, { x0: Nx.x0, z0: Nx.z0, x1: Nx.x1, z1: Nx.z1, axis: 'x', ys: Nx.top - 1.6, rise: 1.6, mat: 'mossstone', tint: VT, room, sub: 1.0, impostTint: AT });
  ctx.col.add(Nx.x0, Nx.top, Nx.z0, Nx.x1, Nx.top + 0.5, Nx.z1).cam = true;
  P.wallTorch(ctx, -6.5, AY + 2.6, Nx.z0 + 0.02, 's', { room, radius: 7, dyn: 2.2 });
  P.wallTorch(ctx, 6.5 - 4, AY + 2.6, Nx.z0 + 0.02, 's', { room, radius: 7, dyn: 2.2 });
  // al fondo (al este), lo que queda de los que bajaron antes
  bakeCorpse(wb, Nx.x1 - 1.4, AY, Nx.z0 + 2.0, -Math.PI / 2 + 0.3, 'kneel', 'monk', 1791);
  P.candles(ctx, Nx.x1 - 0.7, AY, Nx.z0 + 1.2, 6, 1792, { room, radius: 4, intensity: 0.7, spread: 0.45 });
  P.bones(ctx, Nx.x1 - 1.5, AY + 0.02, Nx.z0 + 1.0, 8, 1793, 0.8);
  // el paso: angosto, con su bóveda de cañón
  wb.box('flag', Ps.x0, AY - 0.3, Ps.z0, Ps.x1, AY, Ps.z1, { faces: 't', ao: false, sub: 2.5, room, uv: 0.5, tint: [0.6, 0.57, 0.53] });
  ctx.col.add(Ps.x0, AY - 1, Ps.z0, Ps.x1, AY, Ps.z1);
  const door = { z0: -154.5, z1: -149.5 };
  wb.box('ashlar', Ps.x0 - 0.5, AY, Ps.z0, Ps.x0, Ps.top, door.z0, { faces: 'e', sub: 1.6, aoH: 1.6, room, tint: CT });
  wb.box('ashlar', Ps.x0 - 0.5, AY + 5.2, door.z0, Ps.x0, Ps.top, door.z1, { faces: 'e', sub: 1.6, ao: false, room, tint: CT });
  wb.box('ashlar', Ps.x1, AY, Ps.z0, Ps.x1 + 0.5, Ps.top, Ps.z1, { faces: 'w', sub: 1.6, aoH: 1.6, room, tint: CT });
  wb.box('ashlar', Ps.x0, AY, Ps.z1, Ps.x1, Ps.top, Ps.z1 + 0.4, { faces: 'n', sub: 1.6, aoH: 1.6, room, tint: CT });
  barrelVault(ctx, { x0: Ps.x0, z0: Ps.z0, x1: Ps.x1, z1: Ps.z1, axis: 'z', ys: Ps.top - 1.35, rise: 1.35, mat: 'mossstone', tint: VT, room, sub: 1.0, impostTint: AT });
  // su boca en el atrio: un arco con sus enjutas (la clave del paso queda por
  // encima del arranque de la bóveda del atrio: sin ellas, una rendija)
  archRing(ctx, { axis: 'x', c: (Ps.x0 + Ps.x1) / 2, w: Ps.x1 - Ps.x0, y0: Ps.top - 1.35, rise: 1.35, ring: 0.25, t0: Nx.z1, t1: Nx.z1 + 0.3, top: Nx.top, clip: [Ps.x0, Ps.x1], mat: 'ashlar', spMat: 'ashlar', room, tint: AT, spTint: CT, cam: true });
  ctx.col.add(Ps.x0, Ps.top, Ps.z0, Ps.x1, Ps.top + 0.5, Ps.z1).cam = true;
  for (const z of [-158.5, -169, -179.5]) P.wallTorch(ctx, Ps.x1 - 0.02, AY + 2.4, z, 'w', { room, radius: 6, dyn: 2 });
  // huesos y velas apagadas por el suelo
  const rng = new RNG(1797);
  for (let k = 0; k < 5; k++) P.bones(ctx, rng.range(Ps.x0 + 0.4, Ps.x1 - 0.4), AY + 0.02, rng.range(Ps.z0 + 2, Ps.z1 - 4), 4, 1798 + k, 0.5);
}

// la galería del río: de la puerta del este del círculo sube hacia el norte
// bajo su bóveda (en rampa sobre la escalera) y vuelve a poniente hasta la
// boca del muro del río (ver buildRiver); cerrada con su reja hasta que caiga
// el arzobispo
function riverGallery(ctx, C, L) {
  const wb = ctx.wb;
  const tr = 'tunnel';
  const TT = [0.66, 0.68, 0.64];
  const D = SANCT.door;
  const zA = D.z - D.w / 2,
    zB = D.z + D.w / 2;
  const x0 = 13,
    x1 = 17;
  const zS = -164,
    n = 34,
    run = 0.6,
    zE = zS - n * run;
  const zW = -194,
    zN = -190;
  const spr = 2.2;
  // el tramo del este (de la puerta a la esquina) y el del norte, llano
  wb.box('mossstone', SANCT.R + 0.3, AY - 0.3, zA, x1, AY, zB, { faces: 't', ao: false, room: tr, sub: 2 });
  ctx.col.add(SANCT.R + 0.3, AY - 1, zA, x1, AY, zB);
  wb.box('mossstone', x0, AY - 0.3, zS, x1, AY, zA, { faces: 't', ao: false, room: tr, sub: 2 });
  ctx.col.add(x0, AY - 1, zS, x1, AY, zA);
  stairs(ctx, (x0 + x1) / 2, AY, zS, 'n', x1 - x0, n, 10 / n, run, 'mossstone', { solidBelow: true });
  // arriba, llano, y el tramo de poniente hasta la boca
  wb.box('mossstone', x0, -0.3, zW, x1, 0, zE, { faces: 't', ao: false, room: tr, sub: 2 });
  ctx.col.add(x0, -1, zW, x1, 0, zE);
  wb.box('mossstone', -2, -0.3, zW, x0, 0, zN, { faces: 't', ao: false, room: tr, sub: 2 });
  ctx.col.add(-2, -1, zW, x0, 0, zN);
  const yG = (z) => (z > zS ? AY : z < zE ? 0 : AY + ((zS - z) / (zS - zE)) * 10);
  // los muros
  wb.box('mossstone', SANCT.R + 0.3, AY, zA - 0.5, x0, AY + spr + 1.2, zA, { faces: 's', sub: 1.6, room: tr, tint: TT });
  wb.box('mossstone', SANCT.R + 0.3, AY, zB, x1, AY + spr + 1.2, zB + 0.5, { faces: 'n', sub: 1.6, room: tr, tint: TT });
  for (const [x, f] of [
    [x0, 'e'],
    [x1, 'w'],
  ]) {
    const xa = f === 'e' ? x - 0.5 : x,
      xb = f === 'e' ? x : x + 0.5;
    if (f === 'w') wb.box('mossstone', xa, AY, zS, xb, AY + spr + 1.2, zB, { faces: f, sub: 1.6, room: tr, tint: TT });
    else wb.box('mossstone', xa, AY, zS, xb, AY + spr + 1.2, zA, { faces: f, sub: 1.6, room: tr, tint: TT });
    // por la escalera, el canto de arriba sube con ella
    for (let k = 0; k < n; k += 2) {
      const za = zS - k * run,
        zb = zS - (k + 2) * run;
      wb.box('mossstone', xa, yG(za) - 0.6, zb, xb, yG(zb) + spr + 1.2, za, { faces: f, sub: 1.6, ao: false, room: tr, tint: TT });
    }
    if (f === 'w') wb.box('mossstone', xa, 0, zW, xb, spr + 1.2, zE, { faces: f, sub: 1.6, room: tr, tint: TT });
    else wb.box('mossstone', xa, 0, zN, xb, spr + 1.2, zE, { faces: f, sub: 1.6, room: tr, tint: TT });
    ctx.col.add(xa, AY, zW, xb, spr + 1.4, zS);
  }
  wb.box('mossstone', -2, 0, zN, x0, spr + 1.2, zN + 0.5, { faces: 'n', sub: 1.6, room: tr, tint: TT });
  wb.box('mossstone', 2, 0, zW - 0.5, x1, spr + 1.2, zW, { faces: 's', sub: 1.6, room: tr, tint: TT });
  // (y la boca del muro del río: su suelo)
  wb.box('mossstone', -2, -0.3, -196.4, 2, 0, zW, { faces: 't', ao: false, room: tr, sub: 2 });
  ctx.col.add(-2, -1, -196.4, 2, 0, zW);
  ctx.col.add(-2.6, 0, zN, x0, spr + 1.4, zN + 0.5);
  ctx.col.add(2, 0, zW - 0.5, x1, spr + 1.4, zW);
  // la boca, en la roca del círculo: jambas y un arco de sillería con sus
  // enjutas (cierran lo que dejaba la roca entre el círculo y la galería)
  {
    const room = 'crypt';
    const ta = SANCT.R - 0.7,
      tb = SANCT.R + 0.8;
    for (const [za, zb, f] of [
      [zA - 0.6, zA, 'ws'],
      [zB, zB + 0.6, 'wn'],
    ]) {
      wb.box('ashlar', ta, AY, za, tb, AY + spr, zb, { faces: f, sub: 1.4, aoH: 1.2, room, tint: AT });
      ctx.col.add(ta, AY, za, tb, AY + spr + 2, zb);
    }
    archRing(ctx, { axis: 'z', c: D.z, w: D.w, y0: AY + spr, rise: D.w / 2, ring: 0.5, t0: ta, t1: tb, top: AY + D.h + 0.8, clip: [zA - 0.6, zB + 0.6], mat: 'ashlar', spMat: 'ashlar', rooms: [room, tr], tint: AT, spTint: CT, cam: true });
  }
  // las bóvedas
  barrelVault(ctx, { x0: SANCT.R + 0.3, x1: x1, z0: zA, z1: zB, axis: 'x', ys: AY + spr, mat: 'mossstone', tint: VT, room: tr, sub: 1.0, impostTint: AT });
  barrelVault(ctx, { x0, x1, z0: zS, z1: zA, axis: 'z', ys: AY + spr, mat: 'mossstone', tint: VT, room: tr, sub: 1.0, impostTint: AT });
  rampVault(ctx, { x0, x1, z0: zE, z1: zS, ys0: spr, ys1: AY + spr, mat: 'mossstone', tint: VT, room: tr, impostTint: AT });
  barrelVault(ctx, { x0, x1, z0: zW, z1: zE, axis: 'z', ys: spr, mat: 'mossstone', tint: VT, room: tr, sub: 1.0, impostTint: AT });
  barrelVault(ctx, { x0: -2, x1: x0, z0: zW, z1: zN, axis: 'x', ys: spr, mat: 'mossstone', tint: VT, room: tr, sub: 1.0, impostTint: AT });
  for (const [x, y, z, d] of [
    [x1, AY + 1.6, zA - 4, 'w'],
    [x0, -4.5, -176, 'e'],
    [x1, 1.6, -188.5, 'w'],
    [7, 1.6, zN + 0.02, 's'],
  ])
    P.wallTorch(ctx, x, y, z, d, { room: tr, radius: 6.5, dyn: 2 });
  // lo transitable (hasta -1,2 lo cierra la rejilla; por encima, los muros)
  C.paint(SANCT.R - 0.2, zA, x1, zB, 1);
  C.paint(x0, zW, x1, zA, 1);
  C.paint(-2, zW, x0, zN, 1);
  // (la losa del campo, con su hueco)
  ctx.floorHoles.push([x0, zW, x1, zS - 10]);
  ctx.floorHoles.push([-2, zW, x0, zN]);
  L.zones.push({ id: 'tunnel', rects: [[SANCT.R, zA, x1, zB, -11, -6], [x0, zW, x1, zA, -11, 4], [-2, zW, x0, zN, -1, 4]], atmo: 'tunnel', room: tr });
  L.map.push({ id: 'tunnel', r: [SANCT.R, zA, x1, zB], level: 'crypt' }, { id: 'tunnel', r: [x0, zW, x1, zA], level: 'crypt' }, { id: 'tunnel', r: [-2, zW, x0, zN], level: 'crypt' });
}

// ------------------------------------------------------------ todo
export function buildSanctum(ctx, C, L) {
  const wb = ctx.wb;
  const room = 'crypt';
  wb.setRoom(room);
  const R = SANCT.R,
    A = SANCT.apse;
  // ------------------------------------------------ el círculo
  circleWall(ctx, room);
  const butts = [];
  ctx.beginGroup('cisternCols');
  BUTT.forEach((t, i) => butts.push(buttress(ctx, t, room, 11 + i * 7)));
  ctx.endGroup();
  vault(ctx, room);
  circleFloor(ctx, room);
  // el cuadro que se hunde con el rito: su colisión y la fuente
  ctx.beginGroup('cisternFloorC');
  ctx.col.add(-FLOOR_C, AY - 1, CZ - FLOOR_C, FLOOR_C, AY, CZ + FLOOR_C);
  cisternSpring(ctx, room, VT);
  ctx.endGroup();
  cisternPit(ctx, CZ, FLOOR_C, AY, room, VT, AT);
  apse(ctx, room);
  portal(ctx, room);
  // la corona de hierro con sus velas, colgada de lo alto de la bóveda (se
  // viene abajo en el rito)
  ctx.beginGroup('cisternCrown');
  P.candleCrown(ctx, 0, AY + 8.4, CZ, ceilY(0, CZ) - 0.1, { room, r: 1.5, n: 14, radius: 13, intensity: 1.0 });
  ctx.endGroup();
  cisternRuins(ctx, { room, buttresses: butts, ceilY });
  // los nichos: velas, huesos, calaveras, lo que han ido dejando
  const rng = new RNG(1801);
  NICHES.forEach((t, i) => {
    const p = ring(t, R + 0.45, AY + 0.75);
    P.candles(ctx, p.x, AY + 0.75, p.z, 5 + (i % 3), 1802 + i, { room, radius: 4.5, intensity: 0.9, spread: 0.4 });
    P.bones(ctx, p.x * 0.97, AY + 0.78, CZ + (p.z - CZ) * 0.97, 4, 1810 + i, 0.4);
  });
  // flores de carne que salen de las juntas de la roca, hacia la sima
  P.fleshGrowth(ctx, -7.6, AY, CZ + 7.4, 1.6, 1821, { room, climb: 2.4, lift: 2 });
  P.fleshGrowth(ctx, 7.9, AY, CZ + 7.1, 1.4, 1822, { room, climb: 2.2, lift: 2 });
  P.fleshGrowth(ctx, 10.1, AY, CZ - 3.6, 1.1, 1823, { room, climb: 2.8 });
  for (let i = 0; i < 9; i++) {
    const a = rng.range(0, TAU),
      r = rng.range(FLOOR_C + 0.6, R - 1.2);
    const x = Math.cos(a) * r,
      z = CZ + Math.sin(a) * r;
    if (z > A.lip - 1 && Math.abs(x) < A.x1 + 1) continue;
    P.bones(ctx, x, AY + 0.04, z, 6, 1830 + i, 1.0);
  }
  // las argollas de las cadenas de la estatua, en el suelo, junto al borde
  for (const q of chainFloorAnchors()) {
    const x = SANCT.idol.x - q[0],
      z = SANCT.idol.z - q[2];
    wb.box('iron', x - 0.22, AY, z - 0.22, x + 0.22, AY + 0.06, z + 0.22, { ao: false, room });
    wb.geometry('iron', new THREE.TorusGeometry(0.16, 0.035, 4, 10), new THREE.Matrix4().compose(V3(x, AY + 0.12, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(x, z - SANCT.idol.z), 0)), V3(1, 1, 1)), { ao: false, room });
  }
  // la luz: la de la corona, los nichos y, por debajo de todo, el rojo
  ctx.lights.push({ x: 0, y: AY + 3, z: CZ, r: 0.8, g: 0.2, b: 0.12, radius: 16, intensity: 0.6, room });
  // ------------------------------------------------ el pasillo, el atrio, el paso
  nave(ctx, room, C);
  narthexAndPaso(ctx, room);
  // ------------------------------------------------ lo transitable
  // (lo que no se pinta lo cierra la rejilla de la cripta hasta -1,2)
  const N = SANCT.nave,
    Nx = SANCT.narthex,
    Ps = SANCT.paso;
  C.paint(Ps.x0, Ps.z0, Ps.x1, Ps.z1, 1);
  C.paint(Nx.x0, Nx.z0, Nx.x1, Nx.z1, 1);
  C.paint(N.x0, N.z0, N.x1, N.z1, 1);
  C.paint(-SANCT.portal.w / 2, SANCT.portal.z0, SANCT.portal.w / 2, SANCT.portal.z1 + 0.5, 1);
  for (let x = -R; x < R; x += 0.5)
    for (let z = CZ - R; z < CZ + R; z += 0.5) {
      const cx = x + 0.25,
        zc = z + 0.25;
      if (Math.hypot(cx, zc - CZ) > R - 0.45) continue;
      if (zc > A.lip - 0.3 && Math.abs(cx) < A.x1 + 0.3) continue;
      C.paint(x, z, x + 0.5, z + 0.5, 1);
    }
  // los contrafuertes y la mano de la estatua, en el borde de la sima
  for (const B of butts) C.paint(B.x - 0.8, B.z - 0.8, B.x + 0.8, B.z + 0.8, 0);
  C.paint(SANCT.door.x - 1.1, SANCT.door.z - SANCT.door.w / 2, SANCT.door.x + 0.5, SANCT.door.z + SANCT.door.w / 2, 1);
  riverGallery(ctx, C, L);
  // ------------------------------------------------ lo que se toca
  L.interact.push(
    // la niebla del arzobispo, en la boca del círculo: una bruma roja que
    // deja ver lo de dentro (la estatua, al fondo)
    { kind: 'fog', id: 'f_boss', boss: 'turibulario', x: 0, y: AY, z: (SANCT.portal.z0 + SANCT.portal.z1) / 2, w: SANCT.portal.w, h: SANCT.portal.h - 0.4, axis: 'x', enter: 1, tint: [0.85, 0.16, 0.07], thin: 0.5, base: 0.02 },
    // la reja de la galería del río
    { kind: 'door', id: 'd_salida', x: SANCT.door.x, y: AY, z: SANCT.door.z, w: SANCT.door.w, h: SANCT.door.h, axis: 'z', lock: { type: 'boss', boss: 'turibulario' }, mat: 'grate' }
  );
  // de rodillas sobre la fuente, de cara a la estatua y de espaldas a la
  // boca por la que vendrás
  L.enemies.push({ type: 'turibulario', x: 0, y: AY, z: CZ - 3.2, yaw: 0, idle: 'boss', id: 'b_turibulario', boss: true });
  // ------------------------------------------------ zonas y mapa
  L.zones.push(
    { id: 'paso', rects: [[Ps.x0, Ps.z0, Ps.x1, Ps.z1, -11, -4], [Nx.x0, Nx.z0, Nx.x1, Nx.z1, -11, -3]], atmo: 'crypt', room },
    { id: 'columnata', rects: [[N.x0, N.z0, N.x1, N.z1 + 1.8, -11, 4]], atmo: 'colonnade', room },
    { id: 'arena', rects: [[-R - 0.7, CZ - R - 0.7, R + 0.7, A.back + 0.3, -17, 6]], atmo: 'arena', room }
  );
  L.map.push(
    { id: 'paso', r: [Ps.x0, Ps.z0, Ps.x1, Ps.z1], level: 'crypt' },
    { id: 'paso', r: [Nx.x0, Nx.z0, Nx.x1, Nx.z1], level: 'crypt' },
    { id: 'columnata', r: [N.x0, N.z0, N.x1, N.z1], level: 'crypt' },
    { id: 'arena', r: [-R, CZ - R, R, CZ + R], level: 'crypt' },
    { id: 'arena', r: [A.x0, A.lip, A.x1, A.back], level: 'crypt' }
  );
  wb.setRoom(null);
}
