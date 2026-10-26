// El ídolo de la fuente en forma de monolito: su geometría (la estatua
// sigue en idol.js; el montaje, los materiales y lo que se mueve, en
// idol_monolith.js). Una piedra de pie, de siete metros y medio, que nadie
// labró: tosca, con lajas partidas como cualquier peña, un poco vencida hacia
// delante (hacia el que se arrodilla) y con la cima rota y hueca como un
// cántaro. Por dentro está llena: por toda la piedra empujan caras y manos,
// como contra un paño mojado, de todos los tamaños (algunas, más grandes que
// un hombre; alguna del revés, alguna que se derrite, alguna a medio salir);
// las bocas, abiertas en un grito, tienen luz dentro. Por el costado
// izquierdo la parte una grieta honda y encendida, a cuyos bordes se agarran
// manos; por la espalda se le marcan un espinazo y unas costillas. Del hueco
// de arriba salen brazos que se agarran al borde o se estiran hacia la
// cúpula y, entre ellos, uno más grande y negro, con dos codos y sin mano:
// la mano de oro es la Garra (Martín se la cortó). Otros dos asoman por
// desgarrones de la piedra.
//
// Encima, lo de los que la encontraron primero, los de los castros:
// alrededor del ojo, tres anillos picados como los de las peñas, con sus
// rayos y sus cazoletas; espirales, cazoletas con anillos, un laberinto y
// una cenefa de dientes de sierra, rellenos de almagre, y manos en negativo
// sopladas con almagre al pie. Y lo de Martín: los dos zunchos de hierro (el
// de abajo la ciñe y le hace cintura; el de arriba, reventado, le pasa por
// la boca a una de las caras). En la cara de delante, el ojo: la piedra se le
// retira alrededor como unos párpados y deja ver lo de dentro, que mira.
//
// Mira hacia +z; el origen, en el centro de la fuente a ras del suelo (el
// agua queda 1,4 m más abajo). El cuerpo es una sola malla (una rejilla
// alrededor de un eje que se tuerce); a cada vértice le van su color, su alma
// (aSoul: cuánto empuja, cuánta luz, cuál es y su fase) y, en los párpados y
// los brazos, cómo se mueve (aSway). Todo sin DOM: se calcula en un hilo de
// fondo (idol_worker.js) y se monta en el principal.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RNG, fbm3, vnoise3 } from '../../src/core/util.js';
import { tube, hand, sstep, mix, table } from '../../src/entities/sculpt.js';

const TAU = Math.PI * 2;
const V3 = THREE.Vector3;
const wrapPi = (a) => {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
};
const smin = (a, b, k) => {
  const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k));
  return b + (a - b) * h - k * h * (1 - h);
};
const g2 = (x, y) => Math.exp(-x * x - y * y);

// ============================================================ medidas
// cuántas almas pueden gritar por separado (el sombreador las lleva en un
// vector de uniformes)
export const NSOUL = 48;
export const MONO = {
  y0: -1.7, // el pie, bajo el agua
  rim: 7.2, // la boca rota de arriba, de media
  floor: 6.5, // el fondo del hueco
  wall: 0.17, // el grueso de la pared de la boca
  eyeY: 5.55, // el ojo, en la cara de delante
  eyeR: 0.32, // el radio de lo que hay detrás
  eyeIn: 0.34, // lo hondo que está su centro
  bandA: 0.35,
  bandB: 1.55,
};
// medio ancho (x) y medio grueso (z) de la piedra, de abajo arriba (al pie,
// dentro del collar de la reja: el mismo para la estatua)
const PROF = [
  [-1.7, 1.0, 0.84],
  [-0.8, 0.99, 0.83],
  [0.0, 0.95, 0.79],
  [0.35, 0.93, 0.775],
  [0.8, 1.02, 0.85],
  [1.6, 1.1, 0.9],
  [2.4, 1.13, 0.92],
  [3.4, 1.07, 0.88],
  [4.4, 0.97, 0.81],
  [5.4, 0.86, 0.73],
  [6.3, 0.76, 0.65],
  [7.2, 0.67, 0.57],
  [8.2, 0.6, 0.52],
];
// la sección: entre elipse y rectángulo (una laja, no una columna)
const SE = 2.5;
// lajas que se le partieron: planos que la recortan a trozos (ángulo, de
// qué altura a cuál y cuánto se come del radio arriba y abajo)
const PLANES = [
  { ph: 0.6, y0: 3.4, y1: 6.4, k0: 0.92, k1: 0.86 },
  { ph: -2.6, y0: 0.8, y1: 4.0, k0: 0.88, k1: 0.92 },
  { ph: 1.9, y0: 4.4, y1: 7.9, k0: 0.88, k1: 0.82 },
  { ph: -1.0, y0: 5.6, y1: 8.0, k0: 0.9, k1: 0.8 },
  { ph: 2.9, y0: 2.0, y1: 5.2, k0: 0.9, k1: 0.86 },
  { ph: -0.6, y0: -0.9, y1: 1.2, k0: 0.95, k1: 0.97 },
];
// la boca rota de arriba: dientes de piedra (ángulo, alto y ancho); por
// delante baja, que por ahí sale el brazo grande
const RIM = [
  [0.05, -0.2, 0.6],
  [0.8, 0.55, 0.26],
  [1.55, 0.25, 0.36],
  [2.45, 0.85, 0.24],
  [3.25, 0.4, 0.32],
  [4.15, 0.72, 0.26],
  [4.95, 0.3, 0.4],
  [5.65, 0.5, 0.22],
];

// (en una tabla: se mira cientos de miles de veces)
const PLUT = (() => {
  const n = 1100,
    T = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const [ax, az] = table(PROF, -1.8 + i * 0.01);
    T[i * 2] = ax;
    T[i * 2 + 1] = az;
  }
  return T;
})();
const _pr = [0, 0];
function prof(y) {
  const f = Math.max(0, Math.min(1098.999, (y + 1.8) * 100));
  const i = Math.floor(f),
    t = f - i;
  _pr[0] = PLUT[i * 2] + (PLUT[i * 2 + 2] - PLUT[i * 2]) * t;
  _pr[1] = PLUT[i * 2 + 1] + (PLUT[i * 2 + 3] - PLUT[i * 2 + 1]) * t;
  return _pr;
}
// el eje: se le va la cabeza hacia delante, sobre el que se arrodilla
export function spine(y) {
  const k = sstep(0.6, 7.8, y);
  return [0.06 * Math.sin(y * 0.7), 0.46 * Math.pow(k, 1.7)];
}
const twist = (y) => 0.1 * sstep(0, 7.5, y);
// el radio de una superelipse de medios ejes ax, az en la dirección th
// (desde +z hacia +x)
function seR(th, ax, az) {
  const s = Math.abs(Math.sin(th)) / ax,
    c = Math.abs(Math.cos(th)) / az;
  return 1 / Math.pow(Math.pow(s, SE) + Math.pow(c, SE), 1 / SE);
}
export function rimY(th) {
  let y = MONO.rim;
  for (const [c, h, w] of RIM) {
    const d = Math.abs(wrapPi(th - c)) / w;
    if (d < 1) y += h * Math.pow(1 - d, 1.6);
  }
  return y + 0.07 * (2 * vnoise3(Math.cos(th) * 5, Math.sin(th) * 5, 0.5, 51) - 1);
}
// el radio de la piedra (desde el eje) en la dirección th a la altura y,
// antes de las almas; bandA: el zuncho de abajo, que la ciñe
function stoneR(th, y, bandA) {
  const P = prof(y);
  const ax = P[0],
    az = P[1];
  const tw = twist(y);
  let r = seR(th - tw, ax, az);
  const cx = Math.cos(th),
    sx = Math.sin(th);
  r *= 1 + 0.085 * (2 * fbm3(cx * 1.2 + 3.1, y * 0.5, sx * 1.2, 3, 41) - 1) + 0.03 * (2 * fbm3(cx * 3.4, y * 1.5 + 7, sx * 3.4, 2, 43) - 1);
  for (const P of PLANES) {
    const w = sstep(P.y0 - 0.35, P.y0 + 0.25, y) * sstep(P.y1 + 0.35, P.y1 - 0.25, y);
    if (w <= 0) continue;
    const d = wrapPi(th - P.ph);
    if (Math.abs(d) > 1.25) continue;
    const u = (y - P.y0) / (P.y1 - P.y0);
    const rp = ((P.k0 + (P.k1 - P.k0) * u) * seR(P.ph - tw, ax, az)) / Math.cos(d);
    r = mix(r, smin(r, rp, 0.05), w);
  }
  // los regueros que deja el agua al bajar
  r += 0.014 * (2 * fbm3(cx * 9, y * 0.32, sx * 9, 2, 47) - 1);
  if (bandA) {
    const wb = sstep(0.24, 0.07, Math.abs(y - MONO.bandA));
    if (wb > 0) r = mix(r, Math.min(r, bandA(th) - 0.03), wb);
  }
  return r;
}
// el radio "de media" a la altura y (para medir en metros por la piedra)
const Rn = (y) => {
  const P = prof(y);
  return (P[0] + P[1]) * 0.52;
};
// el centro del ojo en la cara de delante, antes de las almas (para quien
// tenga que encuadrarlo antes de que exista el monolito)
export function monoEye() {
  const c = spine(MONO.eyeY);
  return [c[0], MONO.eyeY, c[1] + stoneR(0, MONO.eyeY, null)];
}

// ============================================================ las almas
// Una cara que empuja desde dentro. (a, b): en unidades de la cara (la
// barbilla, en -0.55; la frente, en 0.5), a hacia la derecha de quien la
// mira. Devuelve el relieve (en unidades de la cara) y lo demás en O.
function faceField(a, b, F, O) {
  b = b / F.stretch + a * F.shear;
  const ax = Math.abs(a);
  const R = Math.hypot(a / 0.43, (b + 0.03) / 0.6);
  if (R > 1.25) return false;
  // (lo que asoma: un borde roto, no un óvalo; lo demás sigue bajo la piedra)
  const nz = vnoise3(a * 3.1 + F.ph, b * 3.1, F.ph * 0.37, 77);
  const em = sstep(-0.12, 0.28, 1.0 - R + (nz - 0.5) * 0.8 + F.emerge);
  if (em <= 0) return false;
  const m = R < 1 ? Math.sqrt(1 - R * R) : 0;
  let h = 0.17 * Math.pow(m, 0.8);
  // la frente y las cejas (alzadas por el medio: angustia)
  const browY = 0.15 + F.ang * 0.06 * (1 - Math.min(1, ax / 0.3));
  h += 0.035 * Math.exp(-(((b - browY) / 0.045) ** 2)) * sstep(0.36, 0.12, ax);
  // las cuencas: vacías, o los párpados cerrados
  const eg = g2((ax - 0.145) / 0.068, (b - 0.06) / 0.052);
  const closed = F.eyes === 'closed' || (F.eyes === 'mixed' && a > 0);
  h -= (closed ? 0.03 : 0.11) * eg;
  if (closed) h += 0.03 * g2((ax - 0.145) / 0.06, (b - 0.045) / 0.028);
  // la nariz
  h += 0.05 * Math.exp(-((a / 0.032) ** 2)) * sstep(0.1, 0.02, b) * sstep(-0.17, -0.09, b);
  h += 0.034 * g2(a / 0.048, (b + 0.125) / 0.038);
  h -= 0.02 * g2((ax - 0.032) / 0.016, (b + 0.15) / 0.016);
  // pómulos, y las mejillas chupadas
  h += 0.03 * g2((ax - 0.2) / 0.06, (b + 0.01) / 0.06);
  h -= 0.035 * F.gaunt * g2((ax - 0.19) / 0.06, (b + 0.24) / 0.09);
  // la boca: un grito, hondo
  const mb = -0.32 - 0.05 * F.o;
  const q = Math.hypot(a / (0.095 * F.w), (b - mb) / (0.13 * F.o));
  let glow = 0;
  if (q < 1) {
    h -= 0.32 * Math.sqrt(1 - q * q);
    glow = sstep(0.95, 0.3, q);
  }
  h += 0.028 * Math.exp(-(((q - 1.1) / 0.16) ** 2));
  // la barbilla, caída
  h += 0.04 * g2(a / 0.12, (b - (mb - 0.13 * F.o - 0.08)) / 0.07);
  O.h = h * em;
  O.pale = em * sstep(1.1, 0.5, R);
  O.push = em * sstep(1.15, 0.4, R);
  O.glow = em * (glow + (closed ? 0 : 0.3 * eg * F.eyeGlow));
  // lo que le cae de los ojos
  O.tear = F.tears && !closed ? em * Math.exp(-(((ax - 0.145) / 0.024) ** 2)) * sstep(0.04, -0.01, b) * sstep(mb - 0.05, mb + 0.2, b) : 0;
  return true;
}

// Una mano que empuja desde dentro, con la palma contra la piedra. (a, b):
// en largos de palma; los dedos, hacia +b; el pulgar, hacia +a si side > 0.
function handField(a, b, H, O) {
  if (Math.abs(a) > 1.3 || b < -1.5 || b > 1.6) return false;
  const s = H.side;
  let h = 0;
  const pq = Math.pow(Math.abs(a) / 0.46, 3) + Math.pow(Math.abs(b) / 0.5, 3);
  if (pq < 1) h = 0.16 * Math.pow(1 - pq, 0.4);
  // la muñeca, que se hunde en la piedra
  if (b < -0.35 && b > -1.5) {
    const wq = (a / 0.3) ** 2;
    if (wq < 1) h = Math.max(h, 0.13 * Math.sqrt(1 - wq) * sstep(-1.45, -0.6, b));
  }
  // los dedos
  for (let i = 0; i < 4; i++) {
    const ka = s * (-0.33 + i * 0.22),
      kb = 0.42;
    const ang = s * (i - 1.5) * H.spread * 0.22 + H.jit[i];
    const L = [0.7, 0.86, 0.92, 0.82][i] * H.len,
      r = [0.085, 0.095, 0.1, 0.095][i];
    const dx = Math.sin(ang),
      dy = Math.cos(ang);
    const px = a - ka,
      py = b - kb;
    const t = Math.max(0, Math.min(1, (px * dx + py * dy) / L));
    const d = Math.hypot(px - dx * L * t, py - dy * L * t);
    if (d < r) {
      let hf = 0.13 * Math.sqrt(1 - (d / r) ** 2);
      if (H.claw) hf *= mix(1, 0.3, sstep(0.55, 1.0, t));
      hf += 0.025 * Math.exp(-(((t - 0.47) / 0.07) ** 2)) + 0.018 * Math.exp(-(((t - 0.76) / 0.06) ** 2));
      h = Math.max(h, hf);
    }
  }
  // el pulgar
  {
    const ang = s * 0.95,
      L = 0.62,
      r = 0.105;
    const dx = Math.sin(ang),
      dy = Math.cos(ang);
    const px = a - s * 0.36,
      py = b + 0.12;
    const t = Math.max(0, Math.min(1, (px * dx + py * dy) / L));
    const d = Math.hypot(px - dx * L * t, py - dy * L * t);
    if (d < r) h = Math.max(h, 0.12 * Math.sqrt(1 - (d / r) ** 2));
  }
  if (h <= 0) return false;
  O.h = h;
  O.mask = sstep(0.0, 0.05, h);
  return true;
}

// un brazo de espiral de Arquímedes (r = a0 + bp φ): distancia al surco
function spiralDist(u, v, a0, bp, turns, dir) {
  const rho = Math.hypot(u, v);
  let phi = Math.atan2(v, u) * dir;
  if (phi < 0) phi += TAU;
  let best = 1e9;
  for (let k = 0; k <= Math.ceil(turns); k++) {
    const p = phi + k * TAU;
    if (p > turns * TAU) break;
    best = Math.min(best, Math.abs(rho - (a0 + bp * p)));
  }
  return best;
}
// distancia de (px, py) al segmento a-b (y en SEG_T, dónde cae en él)
let SEG_T = 0;
function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax,
    vy = by - ay;
  const l2 = vx * vx + vy * vy || 1e-9;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
  SEG_T = t;
  return Math.hypot(px - ax - vx * t, py - ay - vy * t);
}
// el centro y el medio ancho (en ángulo) de una línea de puntos [th, y, ...]
function thBox(P, pad) {
  let x = 0,
    z = 0;
  for (const p of P) {
    x += Math.cos(p[0]);
    z += Math.sin(p[0]);
  }
  const c = Math.atan2(z, x);
  let w = 0;
  for (const p of P) w = Math.max(w, Math.abs(wrapPi(p[0] - c)));
  return [c, w + pad];
}

// ============================================================ dónde va cada cosa
function layout(rng) {
  const L = { faces: [], hands: [], carvings: [], cracks: [], tears: [], prints: [], bulges: [], rift: null };
  const EYE = { th: 0, y: MONO.eyeY };
  // (distancia por la piedra entre dos puntos (th, y))
  const dist = (t0, y0, t1, y1) => Math.hypot(wrapPi(t1 - t0) * Rn((y0 + y1) / 2), y1 - y0);
  // el ojo, con sus anillos tallados alrededor
  const inEye = (th, y, m = 0) => dist(th, y, EYE.th, EYE.y) < 0.92 + m;
  const nearBand = (y, m) => Math.abs(y - MONO.bandA) < m || Math.abs(y - MONO.bandB) < m;

  // ---------------------------------------------- la grieta grande
  // una herida de arriba abajo por el costado izquierdo (visto de frente),
  // honda, con luz dentro; por ella se agarran manos y salen brazos
  {
    const K = [
      [-1.2, 6.15],
      [-1.38, 5.15],
      [-1.3, 4.3],
      [-1.52, 3.35],
      [-1.46, 2.4],
    ];
    const pts = [];
    for (let i = 0; i < K.length - 1; i++)
      for (let k = 0; k < 6; k++) {
        const t = k / 6;
        const th = mix(K[i][0], K[i + 1][0], t) + (k ? rng.range(-0.04, 0.04) : 0),
          y = mix(K[i][1], K[i + 1][1], t);
        pts.push([th, y]);
      }
    pts.push(K[K.length - 1]);
    const n = pts.length;
    L.rift = pts.map(([th, y], i) => [th, y, 0.05 + 0.2 * Math.pow(Math.sin((Math.PI * i) / (n - 1)), 0.7)]);
  }
  const riftD = (th, y) => {
    let best = 9;
    for (const [t, yy, w] of L.rift) best = Math.min(best, dist(th, y, t, yy) - w);
    return best;
  };

  let idx = 0;
  const face = (o) => {
    const F = {
      s: 0.55,
      a: 0,
      d: 0.85,
      o: 1,
      w: 1,
      eyes: 'hollow',
      gaunt: 0.8,
      stretch: 1,
      shear: 0,
      emerge: 0,
      ang: 0.5,
      tears: rng.chance(0.4),
      eyeGlow: rng.range(0.5, 1),
      ph: rng.range(0, TAU),
      ...o,
    };
    F.idx = idx++;
    L.faces.push(F);
    return F;
  };
  // ---------------------------------------------- las de delante, a mano
  // la que grita bajo el ojo (la boca del monolito, si se mira de lejos)
  face({ th: 0.0, y: 4.18, s: 0.9, a: 0.02, o: 1.5, d: 0.85, stretch: 1.22, eyes: 'hollow', tears: true, eyeGlow: 1, emerge: 0.12 });
  // una enorme, a medio salir, con los ojos cerrados
  face({ th: -0.6, y: 2.85, s: 1.2, a: 0.22, o: 0.7, d: 0.5, eyes: 'closed', gaunt: 1.2, emerge: -0.12, ang: 1 });
  // una del revés
  face({ th: 0.78, y: 4.35, s: 0.72, a: 2.95, o: 1.1, d: 0.85 });
  // una que se derrite
  face({ th: 0.5, y: 2.45, s: 0.62, a: -0.2, o: 1.35, d: 0.95, stretch: 1.55, shear: 0.25 });
  // la del zuncho en la boca
  face({ th: -0.12, y: MONO.bandB + 0.2, s: 0.55, a: 0.05, o: 1.15, d: 0.95, emerge: 0.1 });
  // unas pequeñas, apiñadas a la izquierda del ojo
  face({ th: -0.98, y: 5.5, s: 0.36, a: -0.5, o: 1.2, d: 1 });
  face({ th: -1.0, y: 6.05, s: 0.32, a: 0.4, o: 0.9, d: 1, eyes: 'mixed' });
  face({ th: -0.72, y: 6.4, s: 0.3, a: 0.1, o: 1.3, d: 1 });
  // ---------------------------------------------- las demás, por toda la piedra
  // (de todos los tamaños: unas pocas grandes, más medianas y muchas
  // pequeñas; pueden montarse un poco unas en otras)
  for (let tries = 0; tries < 9000 && L.faces.length < 40; tries++) {
    const th = rng.range(0, TAU),
      y = rng.range(-0.7, 6.6);
    const r = rng.next();
    const s = (r < 0.15 ? rng.range(0.75, 1.05) : r < 0.6 ? rng.range(0.45, 0.7) : rng.range(0.28, 0.42)) * (y < 0.3 ? 0.85 : 1);
    if (inEye(th, y, s * 0.4)) continue;
    if (nearBand(y, s * 0.4)) continue;
    if (riftD(th, y) < s * 0.35) continue;
    const back = Math.abs(wrapPi(th - Math.PI)) * Rn(y);
    if (back < 0.55 && y > 1.5 && y < 6.3) continue;
    if (Math.abs(wrapPi(th)) * Rn(y) < 0.65 && y > 0.45 && y < 1.4) continue; // la espiral doble
    if (back < 0.55 && y > 0.45 && y < 1.4) continue; // el laberinto
    let ok = true;
    for (const G of L.faces) if (dist(th, y, G.th, G.y) < (s + G.s) * 0.44) ok = false;
    if (!ok) continue;
    const q = rng.next();
    const tilt = q < 0.12 ? rng.range(2.6, 3.7) : q < 0.3 ? rng.sign() * rng.range(0.9, 1.7) : rng.range(-0.45, 0.45);
    face({
      th,
      y,
      s,
      a: tilt,
      d: rng.range(0.45, 1.0) * (s > 0.8 ? 0.65 : 1),
      o: rng.range(0.55, 1.45),
      w: rng.range(0.75, 1.35),
      eyes: rng.pick(['hollow', 'hollow', 'hollow', 'closed', 'mixed']),
      gaunt: rng.range(0.5, 1.2),
      stretch: rng.chance(0.3) ? rng.range(1.15, 1.7) : 1,
      shear: rng.chance(0.3) ? rng.range(-0.35, 0.35) : 0,
      emerge: rng.range(-0.3, 0.12),
      ang: rng.range(0, 1),
    });
  }
  // ---------------------------------------------- las manos
  // junto a las caras, como contra un cristal (o en las mejillas, como el
  // que grita), y sueltas; y las que se agarran a los bordes de la grieta
  const handOk = (th, y, k) => {
    if (inEye(th, y, k * 0.6)) return false;
    if (nearBand(y, k * 0.55)) return false;
    if (riftD(th, y) < k * 0.5) return false;
    for (const F of L.faces) if (dist(th, y, F.th, F.y) < F.s * 0.42 + k * 0.55) return false;
    for (const H of L.hands) if (dist(th, y, H.th, H.y) < (H.k + k) * 0.75) return false;
    return true;
  };
  const addHand = (o) => {
    const H = { side: 1, spread: 1, len: 1, claw: false, d: 0.85, jit: [0, 1, 2, 3].map(() => rng.range(-0.08, 0.08)), ...o };
    L.hands.push(H);
    return H;
  };
  for (const F of [...L.faces]) {
    if (!rng.chance(0.6)) continue;
    const cheeks = F.s < 0.8 && rng.chance(0.25);
    const sides = cheeks || rng.chance(0.45) ? [-1, 1] : [rng.sign()];
    for (const sd of sides) {
      const k = F.s * rng.range(0.38, 0.47);
      const ca = Math.cos(F.a),
        sa = Math.sin(F.a);
      const lx = sd * F.s * (cheeks ? 0.5 : 0.68),
        ly = F.s * (cheeks ? -0.12 : rng.range(-0.05, 0.25));
      const ds = lx * ca - ly * sa,
        dy = lx * sa + ly * ca;
      const y = F.y + dy;
      const th = F.th + ds / Rn(y);
      if (!cheeks && !handOk(th, y, k)) continue;
      addHand({ th, y, k, a: F.a + sd * (cheeks ? 0.15 : rng.range(0.1, 0.45)), side: -sd, spread: cheeks ? 0.5 : rng.range(0.6, 1.4), claw: rng.chance(0.3), d: F.d, idx: F.idx, ph: F.ph });
    }
  }
  // (las del borde de la grieta: los dedos hacia fuera, la muñeca dentro)
  for (const t of [0.18, 0.32, 0.47, 0.6, 0.74, 0.86]) {
    const i = Math.round(t * (L.rift.length - 1));
    const [th, y, w] = L.rift[i];
    const [t2, y2] = L.rift[Math.min(L.rift.length - 1, i + 1)];
    const tx = wrapPi(t2 - th) * Rn(y),
      ty = y2 - y;
    const tl = Math.hypot(tx, ty) || 1;
    const sd = i % 2 ? 1 : -1;
    const px = (-ty / tl) * sd,
      py = (tx / tl) * sd;
    const k = rng.range(0.26, 0.36);
    const off = w + k * 0.45;
    addHand({ th: th + (px * off) / Rn(y), y: y + py * off, k, a: Math.atan2(-px, py), side: rng.sign(), spread: rng.range(0.9, 1.5), claw: true, d: 1, idx: idx < NSOUL ? idx++ : -1, ph: rng.range(0, TAU) });
  }
  for (let tries = 0; tries < 3000 && L.hands.length < 52; tries++) {
    const th = rng.range(0, TAU),
      y = rng.range(-0.6, 6.5);
    const k = rng.chance(0.3) ? rng.range(0.32, 0.46) : rng.range(0.16, 0.3);
    if (!handOk(th, y, k)) continue;
    const back = Math.abs(wrapPi(th - Math.PI)) * Rn(y);
    if (back < 0.6 && y > 1.5 && y < 6.3) continue;
    if (Math.abs(wrapPi(th)) * Rn(y) < 0.65 && y > 0.45 && y < 1.4) continue;
    if (back < 0.55 && y > 0.45 && y < 1.4) continue;
    const r = rng.next();
    addHand({ th, y, k, a: r < 0.2 ? rng.range(2.4, 3.9) : rng.range(-0.8, 0.8), side: rng.sign(), spread: rng.range(0.5, 1.6), claw: rng.chance(0.45), d: rng.range(0.5, 1.0), idx: idx < NSOUL ? idx++ : -1, ph: rng.range(0, TAU) });
  }
  // ---------------------------------------------- los cuerpos
  // bultos blandos, de hombros y espaldas, que empujan la piedra
  for (let tries = 0; tries < 400 && L.bulges.length < 18; tries++) {
    const th = rng.range(0, TAU),
      y = rng.range(0.6, 6.4);
    if (inEye(th, y, 0.2) || nearBand(y, 0.45) || riftD(th, y) < 0.4) continue;
    L.bulges.push({ th, y, rx: rng.range(0.35, 0.7), ry: rng.range(0.35, 0.9), h: rng.range(0.04, 0.09) });
  }
  // ---------------------------------------------- las tallas de los castros
  // (alrededor del ojo, anillos como los de las peñas; abajo, delante, una
  // espiral doble; detrás, un laberinto; en las lajas, espirales grandes;
  // cazoletas con sus anillos y sueltas; al pie, una cenefa de dientes)
  L.carvings.push({ type: 'eyeRings', th: 0, y: MONO.eyeY, r: 0.95 });
  L.carvings.push({ type: 'spiral2', th: 0, y: 0.97, r: 0.62, depth: 1, ochre: 0.85 });
  L.carvings.push({ type: 'laby', th: Math.PI, y: 0.95, r: 0.46, depth: 1, ochre: 0.7 });
  L.carvings.push({ type: 'spiral', th: -2.6, y: 2.4, a0: 0.02, bp: 0.024, turns: 2.7, dir: 1, r: 0.45, ochre: 0.75 });
  L.carvings.push({ type: 'spiral', th: 2.9, y: 3.55, a0: 0.02, bp: 0.021, turns: 2.5, dir: -1, r: 0.36, ochre: 0.65 });
  for (const [th, y, rings, ochre] of [
    [1.55, 2.25, [0.07, 0.14, 0.21], 0.75],
    [2.35, 0.95, [0.06, 0.12], 0.6],
    [-2.0, 1.15, [0.08, 0.16, 0.24, 0.32], 0.8],
    [-2.45, 0.95, [0.07, 0.14], 0.55],
    [-0.98, 0.9, [0.06, 0.12, 0.18], 0.7],
  ])
    L.carvings.push({ type: 'cup', th, y, rings, r: rings[rings.length - 1] + 0.06, ochre, tail: rng.chance(0.6) });
  for (let i = 0; i < 18; i++) L.carvings.push({ type: 'cup', th: rng.range(0, TAU), y: rng.range(-0.3, 2.4), rings: [], r: 0.06, ochre: 0.5, cup: rng.range(0.022, 0.035) });
  L.carvings.push({ type: 'chevron', y: -0.33 });
  // ---------------------------------------------- las grietas
  // (finas, que caminan hacia abajo y se parten; con algo de luz dentro)
  const crack = (th, y, len, w, dirY = -1) => {
    const C = [];
    let t = th,
      yy = y,
      ang = Math.atan2(dirY, rng.range(-0.4, 0.4));
    const n = Math.round(len / 0.06);
    for (let i = 0; i <= n; i++) {
      C.push([t, yy, w * (1 - (i / n) * 0.8)]);
      ang += rng.range(-0.5, 0.5);
      ang = mix(ang, Math.atan2(dirY, 0), 0.25);
      t += (Math.cos(ang) * 0.06) / Rn(yy);
      yy += Math.sin(ang) * 0.06;
      if (i > 3 && rng.chance(0.07) && len > 0.5) L.cracks.push(crack(t, yy, len * 0.4 * rng.range(0.6, 1), w * 0.6, dirY));
    }
    return C;
  };
  L.cracks.push(crack(2.45, 7.2, 1.8, 0.026));
  L.cracks.push(crack(4.15, 7.1, 1.3, 0.024));
  L.cracks.push(crack(-0.12, MONO.bandB + 0.02, 0.9, 0.02));
  L.cracks.push(crack(1.25, 6.0, 1.1, 0.022));
  L.cracks.push(crack(-1.4, 2.35, 1.0, 0.022));
  // ---------------------------------------------- las manos en negativo
  const printOk = (th, y) => {
    for (const F of L.faces) if (dist(th, y, F.th, F.y) < F.s * 0.6 + 0.17) return false;
    for (const H of L.hands) if (dist(th, y, H.th, H.y) < H.k * 1.3 + 0.17) return false;
    for (const P of L.prints) if (dist(th, y, P.th, P.y) < 0.3) return false;
    if (nearBand(y, 0.18)) return false;
    return true;
  };
  for (let tries = 0; tries < 900 && L.prints.length < 12; tries++) {
    const th = rng.range(-1.35, 1.35) + (rng.chance(0.25) ? Math.PI : 0),
      y = rng.range(0.5, 2.25);
    if (Math.abs(wrapPi(th)) * Rn(y) < 0.68 && y > 0.45 && y < 1.4) continue;
    if (printOk(th, y)) L.prints.push({ th, y, size: rng.range(0.22, 0.3), a: rng.range(-0.45, 0.45) });
  }
  return L;
}

// ============================================================ el cuerpo
// Recorre la rejilla y deja en cada vértice su posición, su normal y lo que
// lleva: el empuje y el alma (aSoul), los párpados o el vaivén (aSway) y su
// color.
function buildBody(rng, L, bandA, o) {
  const NU = o.nu ?? 272,
    NO = o.no ?? 440,
    NL = 3,
    NI = 26;
  const NV = NO + NL + NI;
  const W = NU + 1,
    H = NV + 1;
  const n = W * H;
  const pos = new Float32Array(n * 3);
  const TH = new Float32Array(n),
    Y = new Float32Array(n);
  const reg = new Uint8Array(n);
  const deep = new Float32Array(n);
  for (let i = 0; i <= NU; i++) {
    const th = ((i % NU) / NU) * TAU;
    const sn = Math.sin(th),
      cs = Math.cos(th);
    const yr = rimY(th);
    const rr = stoneR(th, yr, bandA);
    const ct = spine(yr);
    for (let j = 0; j < H; j++) {
      const k = j * W + i;
      let y, R, c;
      if (j <= NO) {
        y = MONO.y0 + (yr - MONO.y0) * (j / NO);
        R = stoneR(th, y, bandA);
        c = spine(y);
      } else if (j <= NO + NL) {
        // el labio roto de arriba: de fuera adentro, por encima del grueso
        const l = j - NO;
        const jag = 0.035 * (2 * vnoise3(cs * 9, sn * 9, l * 1.7, 53) - 1);
        R = l === 1 ? rr - 0.03 : l === 2 ? rr - MONO.wall + 0.05 : rr - MONO.wall;
        y = yr + (l === 1 ? 0.025 : l === 2 ? -0.005 : -0.07) + jag;
        c = ct;
        reg[k] = 1;
      } else {
        // por dentro, hacia el fondo del hueco
        const s = (j - NO - NL) / NI;
        y = mix(yr - 0.07, MONO.floor, Math.pow(s, 0.8));
        R = (rr - MONO.wall) * Math.pow(1 - s, 0.85);
        c = spine(y);
        reg[k] = 2;
        deep[k] = s;
      }
      pos[k * 3] = c[0] + sn * R;
      pos[k * 3 + 1] = y;
      pos[k * 3 + 2] = c[1] + cs * R;
      TH[k] = th;
      Y[k] = y;
    }
  }
  const idx = new Uint32Array(NV * NU * 6);
  let q = 0;
  for (let j = 0; j < NV; j++)
    for (let i = 0; i < NU; i++) {
      const a = j * W + i,
        b = a + W;
      idx[q++] = a;
      idx[q++] = a + 1;
      idx[q++] = b;
      idx[q++] = a + 1;
      idx[q++] = b + 1;
      idx[q++] = b;
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  const normals = () => {
    geo.computeVertexNormals();
    const N = geo.attributes.normal;
    // la costura (la columna 0 y la última son la misma) y el fondo
    const avg = (list) => {
      let x = 0,
        y = 0,
        z = 0;
      for (const k of list) {
        x += N.getX(k);
        y += N.getY(k);
        z += N.getZ(k);
      }
      const l = Math.hypot(x, y, z) || 1;
      for (const k of list) N.setXYZ(k, x / l, y / l, z / l);
    };
    for (let j = 0; j < H; j++) avg([j * W, j * W + NU]);
    avg(Array.from({ length: W }, (_, i) => NV * W + i));
    return N;
  };
  const N0 = normals().array.slice();
  const P0 = pos.slice();

  // ------------------------------------------------ lo que hay en la piedra
  // (por casillas de altura y de ángulo, para no mirarlo todo en cada
  // vértice)
  const BIN = 0.25,
    NB = Math.ceil((8.2 - MONO.y0) / BIN),
    NS = 40;
  const bins = Array.from({ length: NB * NS }, () => []);
  // f, de y0 a y1, en los ángulos thc ± thw (thw >= π: alrededor)
  const put = (f, y0, y1, thc = 0, thw = 9) => {
    const b0 = Math.max(0, Math.floor((y0 - MONO.y0) / BIN)),
      b1 = Math.min(NB - 1, Math.floor((y1 - MONO.y0) / BIN));
    let s0 = 0,
      s1 = NS - 1;
    if (thw < Math.PI) {
      s0 = Math.floor(((thc - thw) / TAU) * NS);
      s1 = Math.floor(((thc + thw) / TAU) * NS);
    }
    for (let b = b0; b <= b1; b++) for (let k = s0; k <= s1; k++) bins[b * NS + (((k % NS) + NS) % NS)].push(f);
  };
  // (el medio ancho en ángulo de algo de radio r en metros, a la altura y)
  const RMIN = 0.5;
  const tw = (r) => r / RMIN + 0.02;
  for (const F of L.faces) {
    F.kind = 'face';
    F.ext = F.s * (0.82 + 0.4 * Math.abs(F.shear)) * Math.max(1, F.stretch);
    put(F, F.y - F.ext, F.y + F.ext, F.th, tw(F.ext));
  }
  for (const Hd of L.hands) {
    Hd.kind = 'hand';
    Hd.ext = Hd.k * 1.6;
    put(Hd, Hd.y - Hd.ext, Hd.y + Hd.ext, Hd.th, tw(Hd.ext));
  }
  for (const C of L.carvings) {
    C.kind = C.type;
    if (C.type === 'chevron') put(C, C.y - 0.3, C.y + 0.3);
    else if (C.type === 'eyeRings') put(C, C.y - C.r - 0.05, C.y + C.r + 0.05, 0, tw(C.r + 0.05));
    else put(C, C.y - C.r - 0.05, C.y + C.r + 0.05, C.th, tw(C.r + 0.08));
  }
  for (const U of L.bulges) {
    U.kind = 'bulge';
    put(U, U.y - U.ry, U.y + U.ry, U.th, tw(U.rx));
  }
  {
    let y0 = 1e9,
      y1 = -1e9;
    for (const p of L.rift) {
      y0 = Math.min(y0, p[1] - p[2]);
      y1 = Math.max(y1, p[1] + p[2]);
    }
    const box = thBox(L.rift, 0.6);
    put({ kind: 'rift', pts: L.rift, y0, y1, box }, y0 - 0.3, y1 + 0.3, box[0], box[1]);
  }
  for (const C of L.cracks) {
    let y0 = 1e9,
      y1 = -1e9;
    for (const p of C) {
      y0 = Math.min(y0, p[1]);
      y1 = Math.max(y1, p[1]);
    }
    const box = thBox(C, 0.08);
    put({ kind: 'crack', pts: C, y0, y1, box }, y0 - 0.05, y1 + 0.05, box[0], box[1]);
  }
  for (const T of L.tears) {
    T.kind = 'tear';
    put(T, T.y - 0.35, T.y + 0.35, T.th, tw(0.35));
  }
  put({ kind: 'spine' }, 1.5, 6.5, Math.PI, tw(1.3));
  put({ kind: 'eye' }, MONO.eyeY - 0.75, MONO.eyeY + 0.75, 0, tw(0.75));

  const aSoul = new Float32Array(n * 4),
    aSway = new Float32Array(n * 4);
  const hgt = new Float32Array(n);
  const pale = new Float32Array(n),
    ochre = new Float32Array(n),
    tear = new Float32Array(n),
    dark = new Float32Array(n),
    glowA = new Float32Array(n);
  const O = {};
  for (let k = 0; k < n; k++) {
    aSoul[k * 4 + 2] = -1;
    if (reg[k] !== 0) {
      // el labio y el hueco: algo de rugosidad, y la luz del fondo
      if (reg[k] === 2) glowA[k] = 0.25 + 0.75 * sstep(0.15, 0.9, deep[k]);
      dark[k] = reg[k] === 2 ? 0.55 : 0.15;
      continue;
    }
    const th = TH[k],
      y = Y[k];
    const rn = Rn(y);
    const b = Math.floor((y - MONO.y0) / BIN);
    if (b < 0 || b >= NB) continue;
    const cell = bins[b * NS + (Math.floor((th / TAU) * NS) % NS)];
    let h = 0,
      pl = 0,
      och = 0,
      tr = 0,
      dk = 0,
      gl = 0,
      push = 0,
      sid = -1,
      sph = 0;
    for (const f of cell) {
      switch (f.kind) {
        case 'face': {
          const dth = wrapPi(th - f.th);
          const ds = dth * rn,
            dy = y - f.y;
          if (Math.abs(ds) > f.ext || Math.abs(dy) > f.ext) break;
          const ca = Math.cos(f.a),
            sa = Math.sin(f.a);
          const a = (ds * ca + dy * sa) / f.s,
            bb = (-ds * sa + dy * ca) / f.s;
          if (!faceField(a, bb, f, O)) break;
          h += O.h * f.s * f.d;
          pl = Math.max(pl, O.pale * (0.5 + 0.5 * f.d));
          gl = Math.max(gl, O.glow);
          tr = Math.max(tr, O.tear);
          if (O.push > push) {
            push = O.push;
            sid = f.idx;
            sph = f.ph;
          }
          break;
        }
        case 'hand': {
          const ds = wrapPi(th - f.th) * rn,
            dy = y - f.y;
          if (Math.abs(ds) > f.ext || Math.abs(dy) > f.ext) break;
          const ca = Math.cos(f.a),
            sa = Math.sin(f.a);
          const a = (ds * ca + dy * sa) / f.k,
            bb = (-ds * sa + dy * ca) / f.k;
          if (!handField(a, bb, f, O)) break;
          h += O.h * f.k * f.d;
          pl = Math.max(pl, O.mask * 0.75 * (0.5 + 0.5 * f.d));
          if (f.idx >= 0 && O.mask > push) {
            push = O.mask;
            sid = f.idx;
            sph = f.ph;
          }
          break;
        }
        case 'bulge': {
          const ds = wrapPi(th - f.th) * rn,
            dy = y - f.y;
          const q2 = (ds / f.rx) ** 2 + (dy / f.ry) ** 2;
          if (q2 >= 1) break;
          h += f.h * (1 - q2) * (1 - q2);
          break;
        }
        case 'rift': {
          if (y < f.y0 - 0.3 || y > f.y1 + 0.3 || Math.abs(wrapPi(th - f.box[0])) > f.box[1]) break;
          const P = f.pts;
          let best = 1e9,
            bw = 0;
          for (let i = 0; i < P.length - 1; i++) {
            const a = P[i],
              c = P[i + 1];
            if (Math.abs(a[1] - y) > 0.5 && Math.abs(c[1] - y) > 0.5) continue;
            const d = segDist(0, 0, wrapPi(a[0] - th) * rn, a[1] - y, wrapPi(c[0] - th) * rn, c[1] - y);
            if (d < best) {
              best = d;
              bw = mix(a[2], c[2], SEG_T);
            }
          }
          if (best > bw * 2.6 + 0.08) break;
          // honda por dentro, con el borde levantado como un desgarrón
          h -= 0.34 * sstep(bw, bw * 0.3, best);
          h += 0.05 * Math.exp(-(((best - bw * 1.2) / (bw * 0.3 + 0.025)) ** 2));
          gl = Math.max(gl, 0.75 * sstep(bw * 0.9, bw * 0.25, best));
          dk = Math.max(dk, 0.55 * sstep(bw * 2.4, bw, best));
          break;
        }
        case 'eyeRings': {
          const ds = wrapPi(th) * rn,
            dy = y - f.y;
          const rho = Math.hypot(ds, dy);
          if (rho > 0.98 || rho < 0.4) break;
          const phi = Math.atan2(dy, ds);
          let g = 0;
          const wob = 0.018 * Math.sin(phi * 3 + 0.7) + 0.012 * Math.sin(phi * 7 + 2.1) + 0.02 * (vnoise3(Math.cos(phi) * 3, Math.sin(phi) * 3, 0.3, 61) - 0.5);
          for (const rr of [0.5, 0.64, 0.78]) {
            // (el de fuera, abierto por abajo, donde baja el surco)
            if (rr > 0.7 && Math.abs(wrapPi(phi + Math.PI / 2)) < 0.12) continue;
            g = Math.max(g, sstep(0.02, 0.005, Math.abs(rho - rr - wob * (rr / 0.6))));
          }
          // los rayos de entre los dos de dentro
          if (rho > 0.5 && rho < 0.64) {
            const k = Math.round((phi / TAU) * 16);
            const e = phi - (k * TAU) / 16;
            g = Math.max(g, sstep(0.018, 0.005, Math.abs(Math.sin(e) * rho)));
          }
          // el surco que baja, y las cazoletas de fuera
          if (dy < -0.7 && Math.abs(ds) < 0.03) g = Math.max(g, sstep(0.02, 0.005, Math.abs(ds)));
          for (let k = 0; k < 9; k++) {
            const pa = -Math.PI / 2 + ((k + 0.5) / 9) * TAU;
            const cd = Math.hypot(ds - Math.cos(pa) * 0.89, dy - Math.sin(pa) * 0.89);
            if (cd < 0.035) {
              h -= 0.025 * Math.sqrt(1 - (cd / 0.035) ** 2);
              g = Math.max(g, 0.9);
            }
          }
          h -= 0.02 * g;
          och = Math.max(och, g * 0.9);
          break;
        }
        case 'spiral': {
          const ds = wrapPi(th - f.th) * rn,
            dy = y - f.y;
          if (Math.abs(ds) > f.r + 0.05 || Math.abs(dy) > f.r + 0.05) break;
          const g = sstep(0.02, 0.004, spiralDist(ds, dy, f.a0, f.bp, f.turns, f.dir));
          h -= 0.02 * g;
          och = Math.max(och, g * f.ochre);
          break;
        }
        case 'spiral2': {
          const ds = wrapPi(th) * rn,
            dy = y - f.y;
          if (Math.abs(ds) > f.r + 0.05 || Math.abs(dy) > f.r) break;
          const d = Math.min(spiralDist(ds + 0.25, dy, 0.015, 0.019, 2.4, 1), spiralDist(ds - 0.25, -dy, 0.015, 0.019, 2.4, 1));
          const g = sstep(0.02, 0.004, d);
          h -= 0.017 * g;
          och = Math.max(och, g * f.ochre);
          break;
        }
        case 'laby': {
          const ds = wrapPi(th - f.th) * rn,
            dy = y - f.y;
          const rho = Math.hypot(ds, dy);
          if (rho > f.r + 0.03) break;
          const phi = Math.atan2(dy, ds);
          let g = 0;
          const rings = [0.07, 0.14, 0.21, 0.28, 0.35, 0.42];
          rings.forEach((rr, i) => {
            const gap = i % 2 ? Math.PI / 2 : -Math.PI / 2;
            if (Math.abs(wrapPi(phi - gap)) < 0.24) return;
            g = Math.max(g, sstep(0.017, 0.004, Math.abs(rho - rr)));
            // los tabiques que unen un anillo con el siguiente
            if (i < rings.length - 1)
              for (const e of [gap - 0.24, gap + 0.24]) {
                const d = segDist(ds, dy, Math.cos(e) * rr, Math.sin(e) * rr, Math.cos(e) * rings[i + 1], Math.sin(e) * rings[i + 1]);
                g = Math.max(g, sstep(0.017, 0.004, d));
              }
          });
          if (rho < 0.03) {
            h -= 0.025 * sstep(0.03, 0, rho);
            g = Math.max(g, 0.8);
          }
          h -= 0.017 * g;
          och = Math.max(och, g * f.ochre);
          break;
        }
        case 'cup': {
          const ds = wrapPi(th - f.th) * rn,
            dy = y - f.y;
          if (Math.abs(ds) > f.r || Math.abs(dy) > f.r) break;
          const rho = Math.hypot(ds, dy);
          const cr = f.cup ?? 0.035;
          let g = 0;
          for (const rr of f.rings) g = Math.max(g, sstep(0.017, 0.004, Math.abs(rho - rr)));
          if (f.tail && f.rings.length && dy < 0 && Math.abs(ds) < 0.02) g = Math.max(g, sstep(0.017, 0.004, Math.abs(ds)) * sstep(-f.r, -f.r + 0.04, dy));
          if (rho < cr) {
            h -= 0.03 * Math.sqrt(1 - (rho / cr) ** 2);
            g = Math.max(g, 0.9);
          }
          h -= 0.016 * g;
          och = Math.max(och, g * f.ochre);
          break;
        }
        case 'chevron': {
          // (la costura de la cenefa, por detrás)
          const s = ((th + Math.PI) % TAU) * rn;
          const P = 0.26,
            A = 0.085;
          const x = s / P;
          const tri = 2 * Math.abs(x - Math.floor(x + 0.5));
          const zig = f.y + A * (2 * tri - 1);
          let g = sstep(0.022, 0.006, Math.abs(y - zig) * 0.75);
          for (const yy of [f.y - 0.15, f.y + 0.15]) g = Math.max(g, sstep(0.016, 0.004, Math.abs(y - yy)));
          h -= 0.016 * g;
          och = Math.max(och, g * 0.6);
          break;
        }
        case 'crack': {
          if (y < f.y0 - 0.05 || y > f.y1 + 0.05 || Math.abs(wrapPi(th - f.box[0])) > f.box[1]) break;
          const P = f.pts;
          let best = 1e9,
            bw = 0;
          for (let i = 0; i < P.length - 1; i++) {
            const a = P[i],
              c = P[i + 1];
            if (Math.abs(a[1] - y) > 0.12 && Math.abs(c[1] - y) > 0.12) continue;
            const d = segDist(0, 0, wrapPi(a[0] - th) * rn, a[1] - y, wrapPi(c[0] - th) * rn, c[1] - y);
            if (d < best) {
              best = d;
              bw = mix(a[2], c[2], SEG_T);
            }
          }
          if (best > bw * 3) break;
          const g = sstep(bw, bw * 0.2, best);
          h -= 0.035 * g;
          gl = Math.max(gl, 0.45 * g);
          dk = Math.max(dk, sstep(bw * 3, bw, best) * 0.5);
          break;
        }
        case 'tear': {
          const ds = wrapPi(th - f.th) * rn,
            dy = y - f.y;
          const rho = Math.hypot(ds, dy);
          if (rho > 0.35) break;
          const ra = f.ra;
          h += 0.045 * Math.exp(-(((rho - (ra + 0.045)) / 0.025) ** 2)) - 0.06 * sstep(ra + 0.04, ra - 0.01, rho);
          gl = Math.max(gl, 0.9 * Math.exp(-(((rho - (ra + 0.012)) / 0.014) ** 2)));
          dk = Math.max(dk, sstep(ra + 0.08, ra, rho) * 0.4);
          break;
        }
        case 'spine': {
          const ds = wrapPi(th - Math.PI) * rn;
          const ad = Math.abs(ds);
          if (ad > 1.25 || y < 1.5) break;
          let hs = 0;
          for (let i = 0; i < 14; i++) {
            const yv = 1.8 + i * 0.34;
            if (Math.abs(y - yv) > 0.3) continue;
            hs += 0.085 * g2(ds / 0.14, (y - yv) / 0.12) + 0.05 * g2(ds / 0.05, (y - yv + 0.06) / 0.14) - 0.02 * g2(ds / 0.11, (y - yv - 0.17) / 0.05);
          }
          if (ad > 0.1)
            for (let r = 0; r < 7; r++) {
              const u = (ad - 0.12) / 1.08;
              if (u < 0 || u > 1) continue;
              const yr = 5.0 - r * 0.34 - 0.42 * Math.pow(u, 1.3);
              hs += 0.055 * Math.exp(-(((y - yr) / 0.055) ** 2)) * sstep(1.0, 0.7, u) * sstep(0, 0.08, u);
            }
          h += hs;
          pl = Math.max(pl, sstep(0.0, 0.04, hs) * 0.35);
          break;
        }
        case 'eye': {
          const ds = wrapPi(th) * rn,
            dy = y - MONO.eyeY;
          if (Math.abs(ds) > 0.75 || Math.abs(dy) > 0.75) break;
          // un ojo de lado a lado almendrado, de pie: la intersección de dos
          // círculos (sd < 0, dentro)
          const sd = Math.max(Math.hypot(ds - 0.281, dy), Math.hypot(ds + 0.281, dy)) - 0.411;
          h += 0.04 * Math.exp(-(((sd - 0.05) / 0.06) ** 2)) + 0.03 * g2(ds / 0.22, (dy - 0.38) / 0.08) - 0.01 * sstep(0, -0.05, sd);
          const wob = 0.012 * Math.sin(dy * 31 + 0.6) + 0.007 * Math.sin(dy * 67 + 2.1);
          gl = Math.max(gl, 0.4 * Math.exp(-(((ds - wob) / 0.012) ** 2)) * sstep(0.0, -0.05, sd));
          dk = Math.max(dk, 0.6 * sstep(0.06, -0.04, sd));
          // los párpados: cerrados, abultan; abiertos, se hunden
          aSway[k * 4] = 0.045 * sstep(0.03, -0.06, sd);
          aSway[k * 4 + 1] = -0.24 * sstep(0.015, -0.05, sd);
          aSway[k * 4 + 3] = -1;
          break;
        }
      }
    }
    hgt[k] = h;
    pale[k] = pl;
    ochre[k] = och;
    tear[k] = tr;
    dark[k] = dk;
    glowA[k] = gl;
    aSoul[k * 4] = push;
    aSoul[k * 4 + 2] = sid;
    aSoul[k * 4 + 3] = sph;
  }
  // la piedra se mueve donde está el alma (y donde no, se queda)
  for (let k = 0; k < n; k++) {
    const h = hgt[k];
    if (!h) continue;
    pos[k * 3] += N0[k * 3] * h;
    pos[k * 3 + 1] += N0[k * 3 + 1] * h;
    pos[k * 3 + 2] += N0[k * 3 + 2] * h;
  }
  geo.attributes.position.needsUpdate = true;
  normals();
  for (let k = 0; k < n; k++) aSoul[k * 4 + 1] = glowA[k];

  // ------------------------------------------------ el color
  // oclusión: lo hundido respecto de lo de alrededor, más oscuro
  const blur = new Float32Array(n);
  const R2 = 3;
  for (let j = 0; j < H; j++)
    for (let i = 0; i <= NU; i++) {
      let s = 0,
        c = 0;
      for (let dj = -R2; dj <= R2; dj++) {
        const jj = j + dj;
        if (jj < 0 || jj >= H) continue;
        for (let di = -R2; di <= R2; di++) {
          const ii = (((i + di) % NU) + NU) % NU;
          s += hgt[jj * W + ii];
          c++;
        }
      }
      blur[j * W + i] = s / c;
    }
  const col = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    const x = P0[k * 3],
      y = P0[k * 3 + 1],
      z = P0[k * 3 + 2];
    const nz = fbm3(x * 0.8 + 11, y * 0.6, z * 0.8, 3, 61);
    let base = 0.78 * (0.78 + 0.45 * nz);
    // mojada y negra junto al agua; hollín arriba
    base *= mix(0.55, 1, sstep(-1.4, 0.2, y)) * mix(1, 0.7, sstep(6.2, 7.6, y));
    let r = base * 1.02,
      g = base * 0.96,
      b = base * 0.97;
    // las almas, pálidas como la ceniza
    const p = pale[k];
    r = mix(r, 1.55, p * 0.75);
    g = mix(g, 1.45, p * 0.75);
    b = mix(b, 1.33, p * 0.75);
    // el almagre
    const oc = ochre[k];
    if (oc > 0) {
      r = mix(r, 1.05, oc * 0.8);
      g = mix(g, 0.32, oc * 0.8);
      b = mix(b, 0.18, oc * 0.8);
    }
    // lo que llora
    const t = tear[k];
    if (t > 0) {
      r = mix(r, 0.62, t * 0.85);
      g = mix(g, 0.05, t * 0.85);
      b = mix(b, 0.04, t * 0.85);
    }
    const cav = hgt[k] - blur[k];
    let ao = Math.max(0.22, Math.min(1.15, 1 + cav * 7));
    if (reg[k] === 2) ao *= mix(0.7, 0.25, deep[k]);
    ao *= 1 - dark[k] * 0.75;
    col[k * 3] = r * ao;
    col[k * 3 + 1] = g * ao;
    col[k * 3 + 2] = b * ao;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSoul', new THREE.BufferAttribute(aSoul, 4));
  geo.setAttribute('aSway', new THREE.BufferAttribute(aSway, 4));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  geo.computeBoundingSphere();
  return { geo, W, H, NU, NO, TH, Y, P0, N0, reg, push: aSoul };
}

// ============================================================ los brazos
// Un brazo de alma (del codo o de más abajo, metido en la piedra, a la mano):
// pts, el camino; r(s), el radio; la mano, con la palma hacia palm.
function soulArm(pts, rFn, ho, palm, sway, phase, knobs = []) {
  // (la sección, más ancha que gruesa, con los tendones marcados)
  const parts = [tube(pts, (s) => [rFn(s), rFn(s) * 0.8], { n: 24, seg: 12, caps: false, mod: (a, v) => 1 + 0.07 * Math.max(0, Math.cos(a * 3 + v * 2)) * sstep(0.35, 0.8, v) - 0.04 * Math.cos(a * 2) })];
  const P = pts.map((p) => new V3(...p));
  // (los huesos que se marcan: el codo, la muñeca)
  if (knobs.length) {
    const curve = new THREE.CatmullRomCurve3(P, false, 'centripetal');
    for (const [t, r, sx = 1, sy = 1] of knobs) {
      const c = curve.getPointAt(t),
        d = curve.getTangentAt(t);
      const g = new THREE.SphereGeometry(r, 9, 7);
      g.scale(sx, sy, 1);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d));
      g.translate(c.x, c.y, c.z);
      parts.push(g);
    }
  }
  const end = P[P.length - 1];
  const D = end.clone().sub(P[P.length - 2]).normalize();
  const hg = hand(ho);
  // la mano: su -y, a lo largo del antebrazo; su -x (la palma), hacia palm
  const pn = new V3(...palm);
  pn.sub(D.clone().multiplyScalar(pn.dot(D))).normalize();
  const X = pn.clone().multiplyScalar(-(ho.side ?? 1)),
    Yv = D.clone().negate(),
    Z = new V3().crossVectors(X, Yv);
  const M = new THREE.Matrix4().makeBasis(X, Yv, Z).setPosition(end);
  hg.applyMatrix4(M);
  parts.push(hg);
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  // el vaivén: nada en la raíz, todo en la punta, de lado
  const root = P[0];
  const tip = end.clone().add(D.clone().multiplyScalar(0.25 * (ho.k ?? 1)));
  const ax = tip.clone().sub(root);
  const len = ax.length();
  ax.normalize();
  const side = new V3().crossVectors(ax, new V3(0, 1, 0));
  if (side.lengthSq() < 0.01) side.set(1, 0, 0);
  side.normalize().add(new V3(0, 0.3, 0)).normalize();
  const pa = g.attributes.position;
  const sw = new Float32Array(pa.count * 4);
  const _p = new V3();
  for (let i = 0; i < pa.count; i++) {
    _p.fromBufferAttribute(pa, i).sub(root);
    const t = Math.max(0, Math.min(1, _p.dot(ax) / len));
    const k = sway * Math.pow(t, 1.6);
    sw[i * 4] = side.x * k;
    sw[i * 4 + 1] = side.y * k;
    sw[i * 4 + 2] = side.z * k;
    sw[i * 4 + 3] = phase;
  }
  g.setAttribute('aSway', new THREE.BufferAttribute(sw, 4));
  return g;
}

// atributos que el material de la piedra espera (color, almas, vaivén, UV)
function finish(g, color, glow = 0) {
  const n = g.attributes.position.count;
  if (!g.attributes.normal) g.computeVertexNormals();
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    c[i * 3] = color[0];
    c[i * 3 + 1] = color[1];
    c[i * 3 + 2] = color[2];
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  const s = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    s[i * 4 + 1] = glow;
    s[i * 4 + 2] = -1;
  }
  g.setAttribute('aSoul', new THREE.BufferAttribute(s, 4));
  if (!g.attributes.aSway) g.setAttribute('aSway', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color', 'aSoul', 'aSway'].includes(k)) g.deleteAttribute(k);
  return g;
}

// la línea del zuncho de abajo (puntos alrededor) como radio por ángulo
function polar(line) {
  const P = line.map((p) => ({ t: (Math.atan2(p[0], p[2]) + TAU) % TAU, r: Math.hypot(p[0], p[2]) })).sort((a, b) => a.t - b.t);
  const n = P.length;
  return (t) => {
    t = ((t % TAU) + TAU) % TAU;
    let i = n - 1;
    for (let k = 0; k < n; k++)
      if (P[k].t > t) {
        i = k - 1;
        break;
      }
    const a = P[(i + n) % n],
      b = P[(i + 1) % n];
    const p0 = P[(i - 1 + n) % n],
      p3 = P[(i + 2) % n];
    let span = b.t - a.t;
    if (span <= 0) span += TAU;
    let u = t - a.t;
    if (u < 0) u += TAU;
    u /= span;
    const u2 = u * u,
      u3 = u2 * u;
    return 0.5 * (2 * a.r + (-p0.r + b.r) * u + (2 * p0.r - 5 * a.r + 4 * b.r - p3.r) * u2 + (-p0.r + 3 * a.r - 3 * b.r + p3.r) * u3);
  };
}

// las manos de almagre: los triángulos de la piedra que caen dentro de cada
// una, copiados un pelo por fuera, con su textura encima
function prints(B, list) {
  if (!list.length) return null;
  const pos = B.geo.attributes.position,
    nrm = B.geo.attributes.normal,
    idx = B.geo.index.array;
  const out = [],
    uvs = [];
  for (const P of list) {
    const ca = Math.cos(P.a),
      sa = Math.sin(P.a);
    const loc = (k) => {
      const ds = wrapPi(B.TH[k] - P.th) * Rn(B.Y[k]),
        dy = B.Y[k] - P.y;
      return [(ds * ca + dy * sa) / P.size + 0.5, (-ds * sa + dy * ca) / P.size + 0.5];
    };
    // (las filas que pueden caer dentro: la altura, más o menos, sale de la
    // fila)
    const j0 = Math.max(0, Math.floor(((P.y - P.size - MONO.y0) / (MONO.rim + 0.9 - MONO.y0)) * B.NO) - 2),
      j1 = Math.min(B.NO - 1, Math.ceil(((P.y + P.size - MONO.y0) / (MONO.rim - 0.3 - MONO.y0)) * B.NO) + 2);
    for (let j = j0; j <= j1; j++)
      for (let i = 0; i < B.NU; i++)
        for (let h = 0; h < 2; h++) {
          const t = ((j * B.NU + i) * 2 + h) * 3;
          const a = idx[t],
            b = idx[t + 1],
            c = idx[t + 2];
          if (Math.abs(B.Y[a] - P.y) > P.size) continue;
          const U = [loc(a), loc(b), loc(c)];
          if (U.some(([u, v]) => u < 0 || u > 1 || v < 0 || v > 1)) continue;
          for (const [k, [u, v]] of [
            [a, U[0]],
            [b, U[1]],
            [c, U[2]],
          ]) {
            out.push(pos.getX(k) + nrm.getX(k) * 0.006, pos.getY(k) + nrm.getY(k) * 0.006, pos.getZ(k) + nrm.getZ(k) * 0.006);
            uvs.push(u, v);
          }
        }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

// una línea alrededor de la piedra (ya con sus almas) a la altura y, por
// fuera de lo que más sobresale ahí, a off de ello
function hugRing(B, y, off) {
  const pos = B.geo.attributes.position.array;
  const NB = 72;
  const r = new Float32Array(NB);
  for (let k = 0; k < B.W * (B.NO + 1); k++) {
    const yy = pos[k * 3 + 1];
    if (Math.abs(yy - y) > 0.07) continue;
    const x = pos[k * 3],
      z = pos[k * 3 + 2];
    const t = (Math.atan2(x, z) + TAU) % TAU;
    const b = Math.floor((t / TAU) * NB) % NB;
    r[b] = Math.max(r[b], Math.hypot(x, z));
  }
  const out = [];
  for (let i = 0; i < NB; i++) {
    const rr = Math.max(r[i], r[(i + 1) % NB], r[(i + NB - 1) % NB]) + off;
    const t = ((i + 0.5) / NB) * TAU;
    out.push(new V3(Math.sin(t) * rr, y, Math.cos(t) * rr));
  }
  return out;
}

// los zunchos: el de abajo, por la línea que le pasan (la de la reja); el
// de arriba, por fuera de la piedra a esa altura, reventado. Devuelve la
// cinta (hierro podrido) y las cruces y los clavos (hierro)
function bands(B, lineA) {
  const parts = [],
    iron = [];
  const ring = (C, y, w, d, gap) => {
    // C: puntos de la línea media, alrededor; una cinta de w de alto y d
    // de grueso, con las caras hacia fuera
    const n = C.length;
    const pos = [];
    const nrm = (p) => new V3(p.x, 0, p.z).normalize();
    for (let i = 0; i < n; i++) {
      if (gap && gap(i, n)) continue;
      const a = C[i],
        b = C[(i + 1) % n];
      const na = nrm(a),
        nb = nrm(b);
      const ao = a.clone().add(na.clone().multiplyScalar(d / 2)),
        bo = b.clone().add(nb.clone().multiplyScalar(d / 2));
      const ai = a.clone().add(na.clone().multiplyScalar(-d / 2)),
        bi = b.clone().add(nb.clone().multiplyScalar(-d / 2));
      const up = (p, s) => p.clone().setY(y + (s * w) / 2);
      const quad = (p, q, r, s) => pos.push(...p.toArray(), ...q.toArray(), ...r.toArray(), ...p.toArray(), ...r.toArray(), ...s.toArray());
      quad(up(ao, -1), up(bo, -1), up(bo, 1), up(ao, 1));
      quad(up(bi, -1), up(ai, -1), up(ai, 1), up(bi, 1));
      quad(up(ao, 1), up(bo, 1), up(bi, 1), up(ai, 1));
      quad(up(ai, -1), up(bi, -1), up(bo, -1), up(ao, -1));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    const uv = new Float32Array((pos.length / 3) * 2);
    for (let i = 0; i < pos.length / 3; i++) {
      uv[i * 2] = (Math.atan2(pos[i * 3], pos[i * 3 + 2]) + Math.PI) * 1.3;
      uv[i * 2 + 1] = pos[i * 3 + 1] * 2;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    parts.push(g);
  };
  // (la cruz remachada o el clavo, sobre la cinta, en el punto p)
  const stud = (p, y, cross) => {
    const n = new V3(p.x, 0, p.z).normalize();
    const t = new V3(n.z, 0, -n.x);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(t, new V3(0, 1, 0), n));
    const c = new V3(p.x, y, p.z).add(n.clone().multiplyScalar(0.03));
    if (cross) {
      iron.push(new THREE.BoxGeometry(0.05, 0.4, 0.03).applyQuaternion(q).translate(c.x, c.y + 0.02, c.z));
      iron.push(new THREE.BoxGeometry(0.24, 0.045, 0.03).applyQuaternion(q).translate(c.x, c.y + 0.1, c.z));
    } else iron.push(new THREE.SphereGeometry(0.032, 5, 3).translate(c.x, c.y, c.z));
  };
  // el de abajo
  const yA = MONO.bandA;
  let CA;
  if (lineA) {
    const F = polar(lineA);
    CA = Array.from({ length: 72 }, (_, i) => {
      const t = (i / 72) * TAU;
      const r = F(t);
      return new V3(Math.sin(t) * r, yA, Math.cos(t) * r);
    });
  } else CA = hugRing(B, yA, 0.045);
  ring(CA, yA, 0.12, 0.035);
  CA.forEach((p, i) => i % 9 === 4 && stud(p, yA, (i / 9) % 2 < 1));
  // el de arriba, reventado por la derecha (los cabos, doblados hacia fuera)
  const yB = MONO.bandB;
  const CB = hugRing(B, yB, 0.038);
  const gapB = (i, n) => {
    const t = (i / n) * TAU;
    return t > 0.35 * Math.PI && t < 0.62 * Math.PI;
  };
  ring(CB, yB, 0.11, 0.032, gapB);
  CB.forEach((p, i) => {
    const t = (i / CB.length) * TAU;
    if (i % 9 === 4 && !(t > 0.3 * Math.PI && t < 0.67 * Math.PI)) stud(p, yB, (i / 9) % 2 < 1);
  });
  for (const t of [0.35 * Math.PI, 0.62 * Math.PI]) {
    const i = Math.round((t / TAU) * CB.length) % CB.length;
    const p = CB[i];
    const n = new V3(p.x, 0, p.z).normalize();
    const tg = new V3(n.z, 0, -n.x).multiplyScalar(t < Math.PI / 2 ? 1 : -1);
    const end = p.clone().add(n.clone().multiplyScalar(0.22)).add(tg.multiplyScalar(0.12)).setY(yB + 0.13);
    const L = end.distanceTo(p);
    const b = new THREE.BoxGeometry(0.03, 0.1, L);
    b.lookAt(end.clone().sub(p));
    b.translate((p.x + end.x) / 2, (yB + end.y) / 2, (p.z + end.z) / 2);
    parts.push(b.toNonIndexed());
  }
  const nonIdx = (L) => mergeGeometries(L.map((g) => (g.index ? g.toNonIndexed() : g)));
  return { band: nonIdx(parts), studs: nonIdx(iron) };
}

// ============================================================ todo junto
// Los datos del monolito (arrays sueltos, para pasarlos de un hilo a otro):
// el cuerpo, los brazos (los de las almas y el de la Garra, con el material
// de la piedra), lo del muñón (el aro de oro, el corte encendido, lo que
// gotea), los zunchos, las manos de almagre, dónde va el ojo y dónde está
// cada alma. o.bandA: la línea media del zuncho de abajo (puntos [x, y, z]
// alrededor), la misma que la de la estatua; o.nu, o.no: columnas y filas.
export function monolithData(seed = 1667, o = {}) {
  const t0 = performance.now();
  const rng = new RNG(seed);
  const bandA = o.bandA ? polar(o.bandA) : null;
  const L = layout(rng);
  // los brazos de los desgarrones (la piedra se les abre alrededor) y los
  // de la grieta grande
  const SIDE = [
    { th: 0.8, y: 3.25, up: 0.75, tw: -0.2, len: 0.85, k: 2.3, claw: 0, curl: 0.12, spread: 1.4, palm: 'up' },
    { th: 2.05, y: 2.2, up: -0.15, tw: 0.25, len: 0.75, k: 2.1, claw: 0.25, curl: 0.35, spread: 1.5, palm: 'down' },
    { rift: 0.38, up: 0.55, tw: -0.6, len: 0.95, k: 2.3, claw: 0.5, curl: 0.5, spread: 1.0, palm: 'out' },
    { rift: 0.72, up: 0.2, tw: -0.9, len: 0.7, k: 2.0, claw: 0.2, curl: 0.25, spread: 1.6, palm: 'up' },
  ];
  for (const S of SIDE) {
    if (S.rift !== undefined) {
      const P = L.rift[Math.round(S.rift * (L.rift.length - 1))];
      S.th = P[0];
      S.y = P[1];
      S.inRift = true;
    } else L.tears.push({ th: S.th, y: S.y, ra: 0.05 * S.k });
  }
  const B = buildBody(rng, L, bandA, o);
  const t1 = performance.now();
  // un punto de la piedra (antes de las almas) y su normal, por (th, y)
  const at = (th, y) => {
    const i = Math.round((((th % TAU) + TAU) % TAU) / (TAU / B.NU));
    const yr = rimY(th);
    const j = Math.max(0, Math.min(B.NO, Math.round(((y - MONO.y0) / (yr - MONO.y0)) * B.NO)));
    const k = j * B.W + (i % B.NU);
    return { p: new V3(B.P0[k * 3], B.P0[k * 3 + 1], B.P0[k * 3 + 2]), n: new V3(B.N0[k * 3], B.N0[k * 3 + 1], B.N0[k * 3 + 2]) };
  };

  // ---------------------------------------------- los brazos de las almas
  const arms = [];
  const cTop = spine(MONO.rim);
  const C0 = new V3(cTop[0], MONO.floor + 0.15, cTop[1]);
  const radial = (ph) => new V3(Math.sin(ph), 0, Math.cos(ph));
  const armR = (k) => (s) => k * (s < 0.5 ? mix(1.15, 0.95, s * 2) + 0.2 * Math.exp(-(((s - 0.5) / 0.05) ** 2)) : mix(0.95, 0.7, (s - 0.5) * 2) + 0.1 * Math.exp(-(((s - 0.62) / 0.08) ** 2)));
  // (los que se estiran hacia la cúpula, desde el hueco: del codo a la mano
  // fuera, el resto dentro)
  for (const A of [
    { ph: 2.55, lean: 0.25, up: 0.85, fore: 0.85, k: 2.4, curl: 0.1, spread: 1.5, claw: 0, ph0: 0.3, elbow: 0.3 },
    { ph: 1.3, lean: 0.7, up: 0.75, fore: 0.7, k: 2.2, curl: 0.62, spread: 0.9, claw: 0.45, ph0: 2.1, elbow: -0.45 },
    { ph: 3.8, lean: 0.45, up: 0.9, fore: 0.8, k: 2.5, curl: 0.3, spread: 1.2, claw: 0.1, ph0: 4.0, elbow: 0.35 },
    { ph: 4.6, lean: 0.62, up: 0.7, fore: 0.75, k: 2.1, curl: 0.2, spread: 1.6, claw: 0.0, ph0: 5.4, elbow: -0.25 },
    { ph: 5.55, lean: 0.38, up: 0.55, fore: 0.62, k: 1.8, curl: 0.55, spread: 0.8, claw: 0.6, ph0: 3.3, elbow: 0.5 },
    { ph: 0.75, lean: 0.85, up: 0.6, fore: 0.55, k: 1.9, curl: 0.4, spread: 1.1, claw: 0.3, ph0: 1.4, elbow: -0.2 },
  ]) {
    const R = radial(A.ph);
    const root = C0.clone().add(R.clone().multiplyScalar(0.16));
    const d1 = R.clone().multiplyScalar(Math.sin(A.lean)).add(new V3(0, Math.cos(A.lean), 0));
    const elbow = root.clone().add(d1.clone().multiplyScalar(A.up));
    const d2 = d1.clone().applyAxisAngle(new V3(0, 1, 0), A.elbow).add(new V3(0, 0.35, 0)).normalize();
    const wrist = elbow.clone().add(d2.clone().multiplyScalar(A.fore));
    arms.push(
      soulArm(
        [root.toArray(), root.clone().lerp(elbow, 0.5).toArray(), elbow.toArray(), elbow.clone().lerp(wrist, 0.5).toArray(), wrist.toArray()],
        armR(A.k * 0.046),
        { side: 1, k: A.k, curl: A.curl * 0.35, spread: A.spread * 1.15, claw: 0, len: 0.95, thick: 1.7 },
        R.clone().add(new V3(0, 0.6, 0)).toArray(),
        0.1,
        A.ph0,
        [
          [0.5, A.k * 0.056, 1, 1.3],
          [0.97, A.k * 0.036, 1.3, 0.8],
        ]
      )
    );
  }
  // (los que se agarran al borde por fuera, como para salir)
  for (const A of [
    { ph: 5.0, k: 2.0, ph0: 1.2 },
    { ph: 1.85, k: 1.9, ph0: 5.1 },
  ]) {
    const R = radial(A.ph);
    const yr = rimY(A.ph);
    const ro = stoneR(A.ph, yr, null);
    const ct = spine(yr);
    const c = new V3(ct[0], 0, ct[1]);
    const root = C0.clone().add(R.clone().multiplyScalar(0.1)).add(new V3(0, 0.05, 0));
    const over = c.clone().add(R.clone().multiplyScalar(ro - MONO.wall * 0.5)).setY(yr + 0.14);
    const out = c.clone().add(R.clone().multiplyScalar(ro + 0.1)).setY(yr - 0.04);
    const down = c.clone().add(R.clone().multiplyScalar(ro + 0.08)).setY(yr - 0.3);
    arms.push(
      soulArm(
        [root.toArray(), root.clone().lerp(over, 0.55).add(new V3(0, 0.15, 0)).toArray(), over.toArray(), out.toArray(), down.toArray()],
        (s) => A.k * 0.046 * mix(1.1, 0.75, s),
        { side: 1, k: A.k, curl: 0.42, spread: 1.0, claw: 0.1, len: 0.95, thick: 1.7 },
        R.clone().negate().toArray(),
        0.02,
        A.ph0
      )
    );
  }
  // (los de los desgarrones y la grieta)
  for (const S of SIDE) {
    const { p, n } = at(S.th, S.y);
    const th = new V3(Math.cos(S.th), 0, -Math.sin(S.th));
    const d = n.clone().add(new V3(0, S.up, 0)).add(th.clone().multiplyScalar(S.tw)).normalize();
    const root = p.clone().add(n.clone().multiplyScalar(S.inRift ? -0.42 : -0.18));
    const exit = p.clone().add(n.clone().multiplyScalar(S.inRift ? -0.12 : 0.02)).add(d.clone().multiplyScalar(0.1));
    const mid = p.clone().add(d.clone().multiplyScalar(S.len * 0.55)).add(new V3(0, 0.04 + S.up * 0.06, 0));
    const wrist = p.clone().add(d.clone().multiplyScalar(S.len)).add(new V3(0, 0.12 + S.up * 0.1, 0));
    const palm = S.palm === 'up' ? [0, 1, 0] : S.palm === 'down' ? [0, -1, 0] : n.toArray();
    arms.push(
      soulArm(
        [root.toArray(), exit.toArray(), mid.toArray(), wrist.toArray()],
        (s) => S.k * 0.046 * (mix(1.1, 0.68, s) + 0.14 * Math.exp(-(((s - 0.42) / 0.12) ** 2))),
        { side: 1, k: S.k, curl: S.curl * 0.35, spread: S.spread * 1.15, claw: 0, len: 0.95, thick: 1.7 },
        palm,
        0.06,
        S.th * 3 + S.y,
        [[0.985, S.k * 0.034, 1.3, 0.8]]
      )
    );
  }
  const soul = mergeGeometries(arms.map((g) => finish(g, [0.9, 0.85, 0.8], 0)));
  shadeArms(soul, cTop, 0.42);

  // ---------------------------------------------- el brazo de la Garra
  // más grande que los otros y negro, huesudo, con dos codos; donde estuvo
  // la mano de oro, el corte de Martín: un aro de oro, la luz de dentro y lo
  // que gotea
  const R = radial(0.1);
  const root = C0.clone().add(R.clone().multiplyScalar(0.22)).add(new V3(0, 0.05, 0));
  const j1 = root.clone().add(new V3(0.03, 0.95, 0.32));
  const j2 = j1.clone().add(new V3(0.06, 0.42, 0.62));
  const wr = j2.clone().add(new V3(-0.04, -0.3, 0.5));
  const godParts = [];
  const seg = (a, b, r0, r1, bulge, bend) => {
    const m = a.clone().lerp(b, 0.5).add(new V3(0, bend, 0));
    return tube([a.toArray(), m.toArray(), b.toArray()], (s) => {
      const r = mix(r0, r1, s) * (1 + bulge * Math.exp(-(((s - 0.3) / 0.18) ** 2)));
      return [r, r * 0.85];
    }, { n: 14, seg: 12, caps: false, mod: (a, v) => 1 + 0.06 * Math.max(0, Math.cos(a * 3 + v * 3)) });
  };
  godParts.push(seg(root, j1, 0.17, 0.125, 0.14, 0), seg(j1, j2, 0.13, 0.1, 0.12, 0.08), seg(j2, wr, 0.1, 0.078, 0.16, 0.05));
  for (const [p, r, sy] of [
    [j1, 0.16, 1.25],
    [j2, 0.13, 1.3],
    [wr, 0.092, 0.7],
  ]) {
    const g = new THREE.SphereGeometry(r, 12, 8);
    g.scale(1, sy, 1);
    g.translate(p.x, p.y, p.z);
    godParts.push(g);
  }
  const god = mergeGeometries(godParts.map((x) => finish(x.index ? x.toNonIndexed() : x, [0.2, 0.18, 0.19], 0)));
  const armGeo = mergeGeometries([soul, god]);
  const D = wr.clone().sub(j2).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), D);
  const gold = new THREE.TorusGeometry(0.098, 0.026, 5, 16);
  gold.rotateX(Math.PI / 2);
  gold.applyQuaternion(q);
  gold.translate(wr.x + D.x * 0.03, wr.y + D.y * 0.03, wr.z + D.z * 0.03);
  const cut = new THREE.CylinderGeometry(0.082, 0.082, 0.02, 12);
  cut.applyQuaternion(q);
  cut.translate(wr.x + D.x * 0.045, wr.y + D.y * 0.045, wr.z + D.z * 0.045);
  const drips = [];
  for (const [x, z, l] of [
    [0.05, 0.03, 0.22],
    [-0.04, -0.02, 0.14],
    [0.01, -0.06, 0.3],
  ]) {
    const c = new THREE.ConeGeometry(0.014, l, 4);
    c.rotateX(Math.PI);
    c.translate(wr.x + x, wr.y - 0.05 - l / 2, wr.z + z);
    drips.push(c);
  }

  // ---------------------------------------------- el ojo, los zunchos, el almagre
  const E = at(0, MONO.eyeY);
  const eyeC = E.p.clone().add(E.n.clone().multiplyScalar(-MONO.eyeIn));
  const bd = bands(B, o.bandA);
  const pr = prints(B, L.prints);
  // las almas que pueden gritar: dónde están (en el espacio del ídolo)
  const souls = [];
  for (const F of L.faces) {
    const { p, n } = at(F.th, F.y);
    souls[F.idx] = { p: p.add(n.clone().multiplyScalar(0.1)).toArray(), n: n.toArray(), s: F.s, face: true };
  }
  for (const Hd of L.hands)
    if (Hd.idx >= 0 && !souls[Hd.idx]) {
      const { p, n } = at(Hd.th, Hd.y);
      souls[Hd.idx] = { p: p.toArray(), n: n.toArray(), s: Hd.k, face: false };
    }
  const arr = (g) => {
    const out = {};
    for (const k of Object.keys(g.attributes)) out[k] = g.attributes[k].array;
    if (g.index) out.index = g.index.array;
    return out;
  };
  B.geo.deleteAttribute('uv');
  return {
    body: arr(B.geo),
    arms: arr(armGeo),
    gold: arr(gold.toNonIndexed()),
    cut: arr(cut.toNonIndexed()),
    drips: arr(mergeGeometries(drips).toNonIndexed()),
    band: arr(bd.band),
    studs: arr(bd.studs),
    prints: pr ? arr(pr) : null,
    eye: { c: eyeC.toArray(), n: E.n.toArray() },
    souls: Array.from({ length: souls.length }, (_, i) => souls[i] || null),
    stump: wr.toArray(),
    stumpDir: D.toArray(),
    ms: { body: Math.round(t1 - t0), rest: Math.round(performance.now() - t1) },
  };
}
// (los arrays de unos datos, para pasarlos de hilo sin copiarlos)
export function monoTransfer(d) {
  const set = new Set();
  for (const k of ['body', 'arms', 'gold', 'cut', 'drips', 'band', 'studs', 'prints']) if (d[k]) for (const a of Object.values(d[k])) if (a && a.buffer) set.add(a.buffer);
  return [...set];
}

// los brazos de las almas: más oscuros donde salen de la piedra, con
// manchas, y lo que queda dentro del hueco, a la luz del fondo
function shadeArms(g, cTop, wet) {
  const pa = g.attributes.position,
    co = g.attributes.color,
    so = g.attributes.aSoul;
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i),
      y = pa.getY(i),
      z = pa.getZ(i);
    const n = fbm3(x * 4.1, y * 4.1, z * 4.1, 2, 91);
    const r = Math.hypot(x - cTop[0], z - cTop[1]);
    const inside = y < MONO.rim - 0.05 && r < 0.55;
    let k = 0.72 + 0.4 * n;
    if (inside) k *= mix(0.35, 0.8, sstep(MONO.floor, MONO.rim, y));
    co.setXYZ(i, co.getX(i) * k, co.getY(i) * k * (1 - wet * 0.08), co.getZ(i) * k * (1 - wet * 0.1));
    if (inside) so.setY(i, 0.35 * sstep(MONO.rim - 0.1, MONO.floor + 0.2, y));
  }
}
