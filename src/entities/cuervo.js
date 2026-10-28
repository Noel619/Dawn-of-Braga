// El cuervo cebado: uno de los cuervos de la ciudad, que comieron tanto de
// los muertos de la calle que crecieron como no crece un pájaro: del tamaño
// de un perro, con dos metros y pico de alas, la pechuga pelada y en carne
// viva, el pescuezo largo y desnudo, lleno de bultos, el pico como una reja
// de arado y, encima de los ojos, más ojos.
//
// Vive en los tejados de los Pellejeros. Se posa en lo alto (el palomar, los
// hastiales escalonados, las cumbreras) y mira: estos sí ven, y de lejos. Si
// te ve, grazna, se tira del tejado y vuela en círculos sobre ti; de pronto
// se queda en el aire con las alas arriba, chilla, y se lanza en picado con
// las garras por delante: ruédate a un lado o desvíalo (si lo desvías, cae
// aturdido al tejado, a merced del golpe de gracia). El golpe empuja: en un
// tejado, cuidado con el alero. A veces se posa cerca y da picotazos; en el
// suelo es fácil de herir. Si te metes bajo techo o te alejas, vuelve a su
// sitio.
import * as THREE from 'three';
import { Rig, clip } from './rig.js';
import { DEG, clamp, damp, dampAngle, angleDiff } from '../core/util.js';

const S = Math.sin,
  C = Math.cos;
const R3 = (x, y, z) => [x * DEG, y * DEG, z * DEG];

// ======================================================================= EL MODELO
// (mirando a +z; los pies, en y = 0; el cuerpo, a 0,42)
const BODY_Y = 0.42;
export function buildCuervo() {
  const joints = [
    { name: 'body', pos: [0, BODY_Y, 0] },
    { name: 'neck', parent: 'body', pos: [0, 0.08, 0.2] },
    { name: 'head', parent: 'neck', pos: [0, 0.19, 0.05] },
    { name: 'jaw', parent: 'head', pos: [0, -0.028, 0.06] },
    { name: 'wingL', parent: 'body', pos: [0.13, 0.08, 0.1] },
    { name: 'handL', parent: 'wingL', pos: [0.4, 0, 0] },
    { name: 'wingR', parent: 'body', pos: [-0.13, 0.08, 0.1] },
    { name: 'handR', parent: 'wingR', pos: [-0.4, 0, 0] },
    { name: 'tail', parent: 'body', pos: [0, 0.03, -0.26] },
    { name: 'legL', parent: 'body', pos: [0.08, -0.12, 0.02] },
    { name: 'footL', parent: 'legL', pos: [0, -0.27, 0.03] },
    { name: 'legR', parent: 'body', pos: [-0.08, -0.12, 0.02] },
    { name: 'footR', parent: 'legR', pos: [0, -0.27, 0.03] },
  ];
  const F = 'feathers',
    SK = 'crowSkin',
    B = 'beak';
  const parts = [];
  const P = (o) => parts.push(o);
  // ---- el cuerpo: el lomo de plumas, la pechuga pelada con su herida, los
  // mechones que se le caen
  P({ j: 'body', type: 'sphere', s: [0.165, 0.15, 0.3], p: [0, 0, -0.03], seg: 9, seg2: 6, mat: F });
  P({ j: 'body', type: 'sphere', s: [0.14, 0.1, 0.22], p: [0, 0.06, -0.07], seg: 8, seg2: 5, mat: F });
  P({ j: 'body', type: 'sphere', s: [0.115, 0.11, 0.12], p: [0, -0.045, 0.13], seg: 8, seg2: 6, mat: SK });
  P({ j: 'body', type: 'box', s: [0.06, 0.07, 0.02], p: [0.03, -0.05, 0.245], r: [0, 0, 20], mat: 'blood' });
  P({ j: 'body', type: 'box', s: [0.03, 0.03, 0.02], p: [-0.04, -0.09, 0.22], mat: 'blood' });
  for (const [x, y, z, rx, rz] of [
    [0.13, 0.05, 0.08, 20, -40],
    [-0.12, 0.07, 0.05, 10, 50],
    [0.05, 0.13, -0.12, -40, 10],
    [-0.08, 0.12, -0.2, -30, -20],
  ])
    P({ j: 'body', type: 'box', s: [0.025, 0.11, 0.008], p: [x, y, z], r: [rx, 0, rz], mat: F });
  // ---- el pescuezo, pelado y lleno de bultos; la gorguera de plumas en la base
  P({ j: 'neck', type: 'cyl', s: [0.105, 0.135, 0.09], p: [0, 0.0, -0.01], r: [20, 0, 0], seg: 8, mat: F });
  P({ j: 'neck', type: 'cyl', s: [0.042, 0.058, 0.22], p: [0, 0.1, 0.02], r: [12, 0, 0], seg: 7, mat: SK });
  for (const [x, y, z, r] of [
    [0.04, 0.07, 0.04, 0.03],
    [-0.035, 0.12, 0.03, 0.025],
    [0.02, 0.16, -0.01, 0.022],
    [-0.02, 0.05, -0.03, 0.028],
  ])
    P({ j: 'neck', type: 'ico', s: [r], p: [x, y, z], mat: SK });
  // ---- la cabeza: el cráneo emplumado (calvo por arriba), los ojos (tres
  // pares, los de arriba más pequeños) y el pico, largo, ganchudo, con el
  // borde mellado
  P({ j: 'head', type: 'sphere', s: [0.068, 0.066, 0.092], p: [0, 0.012, 0], seg: 8, seg2: 6, mat: F });
  P({ j: 'head', type: 'sphere', s: [0.045, 0.03, 0.05], p: [0, 0.07, -0.01], seg: 7, seg2: 4, mat: SK });
  for (let i = 0; i < 3; i++)
    for (const sx of [1, -1]) {
      const s = 0.017 - i * 0.004;
      P({ j: 'head', type: 'box', s: [0.008, s, s * 1.2], p: [sx * 0.064, 0.018 + i * 0.019, 0.036 - i * 0.024], r: [0, sx * 18, 0], mat: 'eyeGlow' });
      P({ j: 'head', type: 'box', s: [0.006, s * 1.6, s * 1.8], p: [sx * 0.061, 0.018 + i * 0.019, 0.036 - i * 0.024], r: [0, sx * 18, 0], mat: 'black' });
    }
  P({ j: 'head', type: 'cone', s: [0.036, 0.25], p: [0, 0.0, 0.18], r: [90, 0, 0], sc: [1, 1, 0.75], seg: 5, mat: B });
  P({ j: 'head', type: 'cone', s: [0.016, 0.07], p: [0, -0.03, 0.3], r: [140, 0, 0], seg: 4, mat: B });
  P({ j: 'head', type: 'box', s: [0.05, 0.03, 0.06], p: [0, 0.012, 0.07], mat: B });
  P({ j: 'jaw', type: 'cone', s: [0.026, 0.19], p: [0, -0.008, 0.1], r: [90, 0, 0], sc: [1, 1, 0.6], seg: 4, mat: B });
  // ---- las alas: la de dentro (las cobijas y el borde de ataque pelado, que
  // deja ver el hueso) y la mano (las remeras, abiertas en abanico, con
  // huecos donde se le han caído, y los dedos, que asoman)
  for (const sx of [1, -1]) {
    const w = sx > 0 ? 'wingL' : 'wingR',
      h = sx > 0 ? 'handL' : 'handR';
    P({ j: w, type: 'box', s: [0.4, 0.024, 0.25], p: [sx * 0.2, 0, -0.07], mat: F });
    P({ j: w, type: 'box', s: [0.36, 0.03, 0.11], p: [sx * 0.19, 0.016, 0.0], mat: F });
    P({ j: h, type: 'cyl', s: [0.016, 0.02, 0.16], p: [sx * 0.08, 0.01, 0.04], r: [0, 0, 90], seg: 5, mat: SK });
    for (let i = 0; i < 7; i++) {
      if (i === 2 || i === 5) continue;
      const a = (-8 - i * 9) * sx,
        L = 0.46 - i * 0.03;
      const ar = a * DEG;
      P({ j: h, type: 'box', s: [L, 0.012, 0.075], p: [sx * (0.12 + (L / 2) * C(ar)) , -0.002 * i, 0.03 - Math.abs(L / 2 * S(ar)) - i * 0.01], r: [0, a, 0], mat: F });
    }
    // (el dedo, por el hueco de las plumas que faltan)
    P({ j: h, type: 'cyl', s: [0.008, 0.012, 0.24], p: [sx * 0.24, 0.006, -0.06], r: [0, sx * -24, 90 * sx], seg: 4, mat: 'bone' });
    // las garras
    const l = sx > 0 ? 'legL' : 'legR',
      f = sx > 0 ? 'footL' : 'footR';
    P({ j: l, type: 'cyl', s: [0.018, 0.024, 0.27], p: [0, -0.135, 0], seg: 5, mat: B });
    P({ j: l, type: 'sphere', s: [0.05, 0.06, 0.05], p: [0, 0.0, 0], seg: 6, seg2: 4, mat: F });
    for (const ry of [-24, 0, 24, 180]) {
      const r = ry * DEG,
        L = ry === 180 ? 0.08 : 0.11;
      P({ j: f, type: 'box', s: [0.016, 0.016, L], p: [S(r) * L * 0.5, -0.02, C(r) * L * 0.5], r: [0, ry, 0], mat: B });
      P({ j: f, type: 'cone', s: [0.009, 0.06], p: [S(r) * L, -0.035, C(r) * L], r: [ry === 180 ? -120 : 120, ry, 0], seg: 4, mat: 'bone' });
    }
  }
  // ---- la cola, en abanico
  for (let i = -2; i <= 2; i++) P({ j: 'tail', type: 'box', s: [0.065, 0.012, 0.34], p: [i * 0.03, -i * i * 0.002, -0.16], r: [0, i * 9, 0], mat: F });
  return new Rig({ joints, parts });
}

// ======================================================================= LAS POSTURAS
// las alas plegadas a lo largo del cuerpo
function fold(p, k = 1) {
  p.wingL = R3(0, 86 * k, 5 * k);
  p.handL = R3(0, 8 * k, 2 * k);
  p.wingR = R3(0, -86 * k, -5 * k);
  p.handR = R3(0, -8 * k, -2 * k);
}
// las alas en vuelo: el aleteo (ph 0..1 de un aletazo) o planeando
function wings(p, ph, flap, sweep = 0) {
  const s = S(ph * Math.PI * 2),
    c = C(ph * Math.PI * 2);
  const up = 10 + flap * 50 * s;
  const tuck = flap * 28 * Math.max(0, -s);
  p.wingL = R3(-8 * flap * c, sweep * 55, up);
  p.handL = R3(0, sweep * 35 + tuck, flap * 26 * S(ph * Math.PI * 2 - 0.7) - 4);
  p.wingR = R3(-8 * flap * c, -sweep * 55, -up);
  p.handR = R3(0, -sweep * 35 - tuck, -(flap * 26 * S(ph * Math.PI * 2 - 0.7) - 4));
}
function legs(p, a, spread = 0) {
  p.legL = R3(a, 0, spread);
  p.legR = R3(a, 0, -spread);
  p.footL = R3(-a * 0.5 + spread, 0, 0);
  p.footR = R3(-a * 0.5 + spread, 0, 0);
}

// posado: el cuerpo levantado, la cabeza que se vuelve a tirones, que de
// vez en cuando se rasca bajo el ala o sacude las alas
function perchPose(e, t, p) {
  const D = e.data;
  const pre = D.preen || 0,
    shake = D.shake || 0;
  p.body = R3(-15 + S(t * 1.7) * 1.5 + pre * 18, 0, 0);
  p.neck = R3(-8 + pre * 50, (D.hy || 0) * 0.3 + pre * 40, 0);
  p.head = R3(8 + pre * 30, (D.hy || 0) * 0.7 + pre * 50, (D.ht || 0) + pre * 30);
  p.jaw = R3(D.caw ? 28 * D.caw : 0, 0, 0);
  fold(p, 1 - shake * 0.6);
  if (shake) {
    const f = S(t * 40) * shake;
    p.wingL[2] += f * 0.5;
    p.wingR[2] -= f * 0.5;
  }
  p.tail = R3(-14, 0, 0);
  legs(p, 22, 0);
  return p;
}

// en el aire: el cuerpo, con su cabeceo y su alabeo; el pescuezo estirado
function flyPose(e, t, p) {
  const D = e.data;
  const st = e.state;
  const pitch = D.pitch || 0,
    bank = D.bank || 0;
  p.body = [pitch, 0, bank];
  p.neck = R3(16, 0, 0);
  p.head = R3(-14 + S(t * 2.3) * 4, 0, -bank / DEG * 0.4);
  p.tail = R3(6, 0, 0);
  if (st === 'windup') {
    // en el aire, quieto: las alas muy arriba, la cabeza atrás, el pico
    // abierto, las garras por delante
    const k = Math.min(1, e.stT / 0.3);
    p.body = R3(-38 * k, 0, 0);
    wings(p, D.flapPh || 0, 1.25);
    p.neck = R3(-30 * k, 0, 0);
    p.head = R3(-10 * k, 0, 0);
    p.jaw = R3(36 * k, 0, 0);
    legs(p, -55 * k, 18 * k);
    p.tail = R3(-20, 0, 0);
    return p;
  }
  if (st === 'dive') {
    // en picado: las alas recogidas hacia atrás, las garras y el pico por
    // delante
    wings(p, 0.25, 0.25, 0.85);
    p.neck = R3(26, 0, 0);
    p.head = R3(-24, 0, 0);
    p.jaw = R3(30, 0, 0);
    legs(p, -70, 22);
    return p;
  }
  const flap = st === 'takeoff' || st === 'climb' ? 1 : D.flapK ?? 0.4;
  wings(p, D.flapPh || 0, flap);
  legs(p, st === 'takeoff' ? 40 * Math.min(1, e.stT * 3) : 82, 0);
  p.jaw = R3(D.caw ? 30 * D.caw : 0, 0, 0);
  return p;
}

// en el tejado: a saltitos, las alas a medio abrir para no caerse; el
// picotazo; aturdido, tirado de lado, aleteando
function groundPose(e, t, p) {
  const D = e.data;
  const st = e.state;
  if (st === 'stunned' || st === 'parried' || st === 'stagger') {
    const air = !e.body.grounded;
    p.body = R3(air ? 40 : 10, 0, air ? S(t * 9) * 60 : 78 + S(t * 13) * 6);
    wings(p, (t * 3.2) % 1, 0.8);
    p.wingR = R3(0, -20, -60 + S(t * 19) * 20);
    p.neck = R3(30 + S(t * 7) * 20, 0, 20);
    p.head = R3(10, S(t * 11) * 30, 0);
    p.jaw = R3(20 + S(t * 15) * 15, 0, 0);
    legs(p, -30 + S(t * 17) * 30, 10);
    return p;
  }
  const hop = D.hop || 0;
  p.body = R3(-12 + hop * 10, 0, 0);
  p.neck = R3(6, (D.hy || 0) * 0.3, 0);
  p.head = R3(0, (D.hy || 0) * 0.7, 0);
  wings(p, (t * 0.7) % 1, 0.08);
  p.wingL = R3(-10, 40, 22 + S(t * 3) * 6);
  p.wingR = R3(-10, -40, -22 - S(t * 3) * 6);
  p.handL = R3(0, 30, -6);
  p.handR = R3(0, -30, 6);
  legs(p, 18 - hop * 30, 0);
  p.tail = R3(-6, 0, 0);
  p.jaw = R3(D.caw ? 30 * D.caw : 0, 0, 0);
  return p;
}

// muerto: cae del aire dando vueltas; en el suelo, de espaldas, las alas
// abiertas
function deathPose(e, t, p) {
  if (!e.body.grounded) {
    p.body = R3(t * 400, 0, t * 260);
    wings(p, 0.3, 0.3);
    return p;
  }
  p.body = R3(0, 0, 170);
  p.root = [0, -BODY_Y + 0.1, 0];
  p.wingL = R3(0, 20, -12);
  p.handL = R3(0, 20, 0);
  p.wingR = R3(0, -20, 12);
  p.handR = R3(0, -20, 0);
  p.neck = R3(40, 30, 0);
  p.head = R3(20, 0, 40);
  p.jaw = R3(30, 0, 0);
  legs(p, -40, 20);
  return p;
}

// ======================================================================= LA CONDUCTA
const CRW = {
  sight: 19,
  cruise: 3.6, // altura sobre ti, volando en círculos
  radius: 4.6,
  speed: 6.2,
  dive: 12.5,
  leash: 16,
};
// los ataques (para el reparto de golpes de combat.apply)
const DIVE = { name: 'picado', dmg: 14, stDmg: 26, knock: 2.8 };
const PECK = { name: 'picotazo', dmg: 9, stDmg: 16, range: 1.25, arc: 70, knock: 1.2 };

function ground(e, x, z, yMax) {
  return e.game.world.col.groundHeight(x, z, 0.3, yMax);
}

// ¿Está bajo techo? (ahí ni se le ve ni se le alcanza)
function covered(e, pl) {
  return e.game.world.col.groundHeight(pl.pos.x, pl.pos.z, 0.05, pl.pos.y + 60) > pl.pos.y + 2.1;
}
// ¿Se ve al jugador desde el pájaro (de la cabeza a la cabeza)? (los
// faldones de los tejados no cuentan para lineOfSight: se miran aparte, a
// trechos, por si la línea pasa por debajo de alguno)
function sightTo(e, pl) {
  const col = e.game.world.col;
  if (covered(e, pl)) return false;
  const ax = e.pos.x,
    ay = e.pos.y + BODY_Y + 0.15,
    az = e.pos.z;
  const bx = pl.pos.x,
    by = pl.pos.y + 1.4,
    bz = pl.pos.z;
  for (let k = 1; k < 6; k++) {
    const u = k / 6;
    const y = ay + (by - ay) * u;
    if (col.groundHeight(ax + (bx - ax) * u, az + (bz - az) * u, 0.05, y + 30) > y + 0.05) return false;
  }
  return col.lineOfSight(ax, ay, az, bx, by, bz);
}
// ¿Está el jugador en los tejados que guarda? (spec.guard: [x0, z0, x1, z1])
function guards(e, pl, m = 0) {
  const G = e.spec.guard;
  if (!G) return Math.hypot(pl.pos.x - e.home.x, pl.pos.z - e.home.z) < CRW.leash + m;
  return pl.pos.x > G[0] - m && pl.pos.x < G[2] + m && pl.pos.z > G[1] - m && pl.pos.z < G[3] + m;
}

// Vuela hacia (tx, ty, tz) con la velocidad v (y una aceleración acc): sin
// meterse en los muros ni bajar a ras de lo que tenga debajo (salvo low:
// en picado, al posarse).
function fly(e, tx, ty, tz, v, acc, dt, low = false) {
  const D = e.data;
  const V = D.v || (D.v = new THREE.Vector3());
  const dx = tx - e.pos.x,
    dy = ty - e.pos.y,
    dz = tz - e.pos.z;
  const d = Math.hypot(dx, dy, dz) || 1;
  const s = Math.min(v, d * 2.2);
  V.x = damp(V.x, (dx / d) * s, acc, dt);
  V.y = damp(V.y, (dy / d) * s, acc, dt);
  V.z = damp(V.z, (dz / d) * s, acc, dt);
  move(e, dt, low);
}
function move(e, dt, low) {
  const D = e.data;
  const V = D.v;
  const col = e.game.world.col;
  e.pos.x += V.x * dt;
  e.pos.y += V.y * dt;
  e.pos.z += V.z * dt;
  // (por encima de los tejados y de la calle)
  const g = ground(e, e.pos.x, e.pos.z, e.pos.y + BODY_Y);
  const min = g + (low ? 0.05 : 1.1);
  if (e.pos.y < min) {
    e.pos.y = damp(e.pos.y, min, low ? 30 : 8, dt);
    if (V.y < 0) V.y *= 0.5;
  }
  if (col.resolve(e.pos, 0.32, e.pos.y + 0.15, 0.55, 0)) D.bump = (D.bump || 0) + dt;
  // la orientación: hacia donde va, con su cabeceo y su alabeo
  const h = Math.hypot(V.x, V.z);
  if (h > 0.6) {
    const yaw = Math.atan2(V.x, V.z);
    const turn = angleDiff(e.yaw, yaw);
    e.yaw = dampAngle(e.yaw, yaw, 5, dt);
    D.bank = damp(D.bank || 0, clamp(-turn * 1.2, -0.8, 0.8), 4, dt);
  } else D.bank = damp(D.bank || 0, 0, 4, dt);
  D.pitch = damp(D.pitch || 0, clamp(-Math.atan2(V.y, Math.max(h, 0.5)), -0.9, 1.2), 6, dt);
  e.vx = V.x;
  e.vz = V.z;
}

function setState(e, s) {
  e.state = s;
  e.stT = 0;
}

// el aleteo: la fase y el ruido de cada aletazo
function flapping(e, dt, rate) {
  const D = e.data;
  const prev = D.flapPh || 0;
  D.flapPh = (prev + dt * rate) % 1;
  if (D.flapPh < prev && e.game.audio && e.distTo(e.game.player.pos) < 22) e.game.audio.enemyStep(e);
}

// el graznido: el pico se abre un momento
function caw(e, kind = 'idle') {
  e.data.caw = 1;
  e.game.audio && e.game.audio.enemyVoice(e, kind);
}

// ¿Dónde posarse cerca del jugador? (en lo que él pisa, a su altura, con
// sitio: a 2-3,5 m de él, a un lado)
function landSpot(e, pl) {
  const col = e.game.world.col;
  for (let k = 0; k < 6; k++) {
    const a = Math.atan2(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z) + (Math.random() - 0.5) * 2;
    const r = 2 + Math.random() * 1.5;
    const x = pl.pos.x + S(a) * r,
      z = pl.pos.z + C(a) * r;
    const g = col.groundHeight(x, z, 0.3, pl.pos.y + 1.2);
    if (Math.abs(g - pl.pos.y) > 0.7) continue;
    // (sin nada encima, que bajar a un sitio con techo, no)
    if (col.raycast(x, g + 0.3, z, 0, 1, 0, 3, (b) => !b.camOnly && !b.ramp) < 3) continue;
    if (!col.lineOfSight(x, g + 0.5, z, pl.pos.x, pl.pos.y + 1, pl.pos.z)) continue;
    return [x, g, z];
  }
  return null;
}

// ---- la máquina de estados (T.ai: el cuervo se lleva solo, en el aire)
function crowAI(e, dt, pl) {
  const T = e.T;
  const D = e.data;
  const col = e.game.world.col;
  e.stT += dt;
  e.cooldown -= dt;
  e.flash -= dt;
  e.poiseT -= dt;
  if (e.poiseT <= 0) e.poise = T.poise;
  if (D.caw) D.caw = Math.max(0, D.caw - dt * 3);
  // mira (cada poco)
  e.percT -= dt;
  if (e.percT <= 0) {
    e.percT = 0.2;
    e.sees = !pl.dead && !(e.game.dev && e.game.dev.invisible) && e.distTo(pl.pos) < CRW.sight && Math.abs(pl.pos.y - e.pos.y) < 11 && sightTo(e, pl);
    if (e.sees) e.lostT = 0;
  }
  if (!e.sees) e.lostT += dt;
  // (vuelve a su sitio si lo pierdes de vista un rato o te vas de sus
  // tejados)
  const mine = guards(e, pl, 2);
  D.outT = mine ? 0 : (D.outT || 0) + dt;
  const giveUp = !e.dead && (pl.dead || e.lostT > 5 || D.outT > 2.5);
  switch (e.state) {
    case 'dormant': {
      // posado: la cabeza a tirones, se rasca, se sacude, grazna
      e.vx = e.vz = 0;
      D.hyT = (D.hyT ?? 1) - dt;
      if (D.hyT <= 0) {
        D.hyT = 0.4 + Math.random() * 1.4;
        D.hyW = (Math.random() - 0.5) * 140;
        D.ht = (Math.random() - 0.5) * 30;
      }
      D.hy = damp(D.hy || 0, D.hyW || 0, 22, dt);
      D.evT = (D.evT ?? 3 + Math.random() * 4) - dt;
      if (D.evT <= 0) {
        D.evT = 3 + Math.random() * 6;
        const r = Math.random();
        if (r < 0.35) D.preenT = 1.4;
        else if (r < 0.6) D.shakeT = 0.6;
        else if (e.distTo(pl.pos) < 30) caw(e);
      }
      D.preenT = Math.max(0, (D.preenT || 0) - dt);
      D.shakeT = Math.max(0, (D.shakeT || 0) - dt);
      D.preen = damp(D.preen || 0, D.preenT > 0 ? 1 : 0, 6, dt);
      D.shake = damp(D.shake || 0, D.shakeT > 0 ? 1 : 0, 10, dt);
      if (e.sees && guards(e, pl)) e.alert();
      break;
    }
    case 'alert':
      // te ha visto: se vuelve, grazna, y se tira
      e.yaw = dampAngle(e.yaw, e.angleTo(pl.pos), 8, dt);
      D.preen = damp(D.preen || 0, 0, 10, dt);
      if (e.stT > 0.55) {
        setState(e, 'takeoff');
        D.v = new THREE.Vector3(S(e.yaw) * 2, 3.2, C(e.yaw) * 2);
      }
      break;
    case 'takeoff': {
      flapping(e, dt, 4.2);
      const ty = Math.max(pl.pos.y + CRW.cruise, e.home.y + 1);
      fly(e, e.pos.x + S(e.yaw) * 3, ty, e.pos.z + C(e.yaw) * 3, CRW.speed, 2.5, dt);
      if (e.stT > 0.9) {
        setState(e, 'circle');
        D.circT = 1.5 + Math.random() * 1.5;
      }
      break;
    }
    case 'circle': {
      if (giveUp) {
        setState(e, 'return');
        break;
      }
      // en círculo sobre ti, a ratos aleteando, a ratos planeando
      D.ang = (D.ang ?? Math.atan2(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z)) + dt * (CRW.speed / CRW.radius) * (D.dir || (D.dir = Math.random() < 0.5 ? 1 : -1));
      const tx = pl.pos.x + S(D.ang) * CRW.radius,
        tz = pl.pos.z + C(D.ang) * CRW.radius;
      fly(e, tx, pl.pos.y + CRW.cruise + S(e.stT * 1.3) * 0.4, tz, CRW.speed, 2.2, dt);
      D.flapK = damp(D.flapK ?? 0.4, S(e.stT * 0.9) > 0.2 ? 0.9 : 0.15, 2, dt);
      flapping(e, dt, 2.2 + D.flapK * 1.6);
      D.circT -= dt;
      if (Math.random() < dt * 0.15) caw(e);
      if (D.circT <= 0 && e.sees && e.cooldown <= 0) {
        // a veces baja a picotearte; casi siempre, en picado
        if (D.dives >= 2 && Math.random() < 0.45 && (D.land = landSpot(e, pl))) setState(e, 'descend');
        else {
          setState(e, 'windup');
          caw(e, 'attack');
          e.flare = 1;
        }
      }
      break;
    }
    case 'windup': {
      // quieto en el aire, de cara a ti: el aviso
      const V = D.v;
      V.multiplyScalar(Math.exp(-6 * dt));
      move(e, dt);
      flapping(e, dt, 5.5);
      e.yaw = dampAngle(e.yaw, e.angleTo(pl.pos), 10, dt);
      D.pitch = damp(D.pitch || 0, 0, 8, dt);
      D.bank = damp(D.bank || 0, 0, 8, dt);
      if (e.stT > 0.62) {
        // a donde vas a estar: un poco por delante de ti
        const lead = 0.22;
        const tx = pl.pos.x + (pl.vx || 0) * lead,
          tz = pl.pos.z + (pl.vz || 0) * lead,
          ty = pl.pos.y + 1.15 - BODY_Y;
        const dx = tx - e.pos.x,
          dy = ty - e.pos.y,
          dz = tz - e.pos.z;
        const d = Math.hypot(dx, dy, dz) || 1;
        D.diveDir = new THREE.Vector3(dx / d, dy / d, dz / d);
        D.diveLen = d + 2.2;
        D.diveGone = 0;
        D.hitDone = false;
        D.bump = 0;
        D.v.copy(D.diveDir).multiplyScalar(CRW.dive * 0.6);
        setState(e, 'dive');
      }
      break;
    }
    case 'dive': {
      // en línea recta, cada vez más deprisa; al pasar junto a ti, el golpe
      const V = D.v;
      const sp = Math.min(CRW.dive, V.length() + 30 * dt);
      V.copy(D.diveDir).multiplyScalar(sp);
      const y0 = e.pos.y;
      move(e, dt, true);
      D.diveGone += sp * dt;
      if (!D.hitDone && !pl.dead) {
        const cx = e.pos.x,
          cy = e.pos.y + BODY_Y,
          cz = e.pos.z;
        const d = Math.hypot(pl.pos.x - cx, pl.pos.y + 1.1 - cy, pl.pos.z - cz);
        if (d < 1.0) {
          D.hitDone = true;
          const r = e.game.combat.enemyStrikeAt(e, DIVE, e.pos.x - D.diveDir.x * 2, e.pos.z - D.diveDir.z * 2);
          // (desviado: ya lo ha tirado parried(); si te da o lo paras, sigue)
          if (r === 'parry') break;
        }
      }
      // (contra el tejado o un muro: se acaba el picado)
      const blocked = e.pos.y > y0 + 0.02 && D.diveDir.y < -0.2;
      if (D.diveGone > D.diveLen || blocked || (D.bump || 0) > 0.15) {
        D.bump = 0;
        D.dives = (D.dives || 0) + 1;
        setState(e, 'climb');
        e.cooldown = 1.0 + Math.random() * 1.2;
      }
      break;
    }
    case 'climb': {
      // remonta, alejándose
      flapping(e, dt, 4.2);
      const a = Math.atan2(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z);
      fly(e, pl.pos.x + S(a) * (CRW.radius + 1), pl.pos.y + CRW.cruise + 0.5, pl.pos.z + C(a) * (CRW.radius + 1), CRW.speed, 2.6, dt);
      if (e.stT > 1.3) {
        setState(e, 'circle');
        D.ang = undefined;
        D.circT = 1.6 + Math.random() * 2;
      }
      break;
    }
    case 'descend': {
      // baja a posarse cerca de ti
      flapping(e, dt, 3.6);
      const [x, y, z] = D.land;
      fly(e, x, y, z, CRW.speed * 0.8, 3, dt, true);
      if (Math.hypot(x - e.pos.x, y - e.pos.y, z - e.pos.z) < 0.35 || e.stT > 2.5) {
        setState(e, 'ground');
        e.body.vy = 0;
        e.body.grounded = true;
        D.groundT = 2.5 + Math.random() * 2;
        D.pitch = D.bank = 0;
        e.cooldown = 0.4;
      }
      break;
    }
    case 'ground': {
      // en el tejado: a saltitos hacia ti y, cerca, el picotazo
      D.groundT -= dt;
      const d = e.distTo(pl.pos);
      e.yaw = dampAngle(e.yaw, e.angleTo(pl.pos), 6, dt);
      D.hopT = (D.hopT || 0) - dt;
      let vx = 0,
        vz = 0;
      if (d > 1.15 && D.hopT <= 0) {
        D.hopT = 0.45;
        D.hopV = 1;
      }
      if (D.hopV > 0) {
        D.hopV = Math.max(0, D.hopV - dt * 3);
        vx = S(e.yaw) * 2.2 * D.hopV;
        vz = C(e.yaw) * 2.2 * D.hopV;
      }
      D.hop = D.hopV || 0;
      e.vx = vx;
      e.vz = vz;
      walk(e, dt);
      if (d < 1.4 && e.cooldown <= 0 && Math.abs(pl.pos.y - e.pos.y) < 0.8) {
        setState(e, 'peck');
        caw(e, 'attack');
        e.anim.play(T.clips.peck, { blend: 0.05 });
        D.peckDone = false;
        break;
      }
      if (D.groundT <= 0 || giveUp || d > 6) {
        setState(e, 'takeoff');
        D.v = new THREE.Vector3(0, 3.5, 0);
        caw(e);
      }
      break;
    }
    case 'peck': {
      e.vx = e.vz = 0;
      walk(e, dt);
      if (e.stT < 0.3) e.yaw = dampAngle(e.yaw, e.angleTo(pl.pos), 8, dt);
      if (!D.peckDone && e.stT >= 0.34) {
        D.peckDone = true;
        e.game.combat.enemyStrike(e, PECK, 0);
      }
      if (e.stT >= 0.75) {
        setState(e, 'ground');
        e.cooldown = 0.6 + Math.random() * 0.6;
      }
      break;
    }
    case 'hurt': {
      // herido en el aire: se le van las plumas, se le tuerce el vuelo y
      // remonta; en el tejado, da un salto atrás
      if (e.body.grounded && !D.v) {
        e.vx = damp(e.vx, 0, 6, dt);
        e.vz = damp(e.vz, 0, 6, dt);
        walk(e, dt);
        if (e.stT > 0.4) setState(e, 'ground');
        break;
      }
      if (!D.v) D.v = new THREE.Vector3();
      D.v.y += 3 * dt;
      move(e, dt);
      flapping(e, dt, 6);
      if (e.stT > 0.45) setState(e, 'climb');
      break;
    }
    case 'parried':
    case 'stagger':
    case 'stunned': {
      // desviado o tirado de un golpe fuerte: cae al tejado y se debate (a
      // merced del golpe de gracia mientras dure parryT)
      if (e.state !== 'stunned') {
        e.state = 'stunned';
        D.v = null;
        e.body.grounded = false;
        e.body.vy = Math.min(0, e.body.vy || 0);
      }
      e.parryT = Math.max(0, e.parryT - dt);
      e.vx = damp(e.vx, 0, 2, dt);
      e.vz = damp(e.vz, 0, 2, dt);
      walk(e, dt);
      if (e.stT > 2.4) {
        e.parryT = 0;
        setState(e, 'takeoff');
        D.v = new THREE.Vector3(0, 3.5, 0);
        caw(e);
      }
      break;
    }
    case 'return': {
      // a su sitio
      flapping(e, dt, 3);
      const h = e.home;
      const far = Math.hypot(h.x - e.pos.x, h.z - e.pos.z);
      fly(e, h.x, far > 2 ? Math.max(h.y + 1.2, e.pos.y) : h.y, h.z, CRW.speed * 0.8, 2.4, dt, far < 2);
      if (e.sees && !pl.dead && guards(e, pl)) {
        setState(e, 'circle');
        D.circT = 1 + Math.random();
        break;
      }
      if (Math.hypot(h.x - e.pos.x, h.y - e.pos.y, h.z - e.pos.z) < 0.25 || e.stT > 12) {
        e.pos.set(h.x, h.y, h.z);
        setState(e, 'dormant');
        e.aware = false;
        e.hp = e.maxHp;
        e.yaw = h.yaw;
        D.v = null;
        D.dives = 0;
        D.pitch = D.bank = 0;
      }
      break;
    }
    case 'dead': {
      // cae dando vueltas; en el suelo se queda, y se deshace
      if (!e.body.grounded) {
        e.body.vy = (e.body.vy || 0) - 22 * dt;
        e.pos.y += e.body.vy * dt;
        e.pos.x += e.vx * dt;
        e.pos.z += e.vz * dt;
        const g = ground(e, e.pos.x, e.pos.z, e.pos.y + 0.5);
        if (e.pos.y <= g) {
          e.pos.y = g;
          e.body.grounded = true;
          e.body.vy = 0;
          e.game.audio && e.game.audio.play('hit', e.pos);
        }
      }
      if (e.stT > 2.4) {
        e.sink += dt * 0.25;
        if (!D.dissolved) {
          D.dissolved = true;
          e.game.fx && e.game.fx.dissolve && e.game.fx.dissolve(e);
        }
      }
      if (e.stT > 5.5) {
        e.obj.visible = false;
        e.shadow.visible = false;
      }
      break;
    }
  }
  if (e.state !== 'stunned') e.parryT = 0;
  e.animate(dt);
  // la sombra, en lo que tiene debajo (no a la altura del pájaro)
  const gy = ground(e, e.pos.x, e.pos.z, e.pos.y + 0.3);
  const hgt = Math.max(0, e.pos.y - gy);
  e.shadow.position.y = gy + 0.02;
  e.shadow.scale.setScalar(Math.max(0.3, 1.6 - hgt * 0.15));
  e.shadow.visible = e.obj.visible && hgt < 9;
}

// en el tejado (posado, aturdido o muerto): con su cuerpo y la gravedad
function walk(e, dt) {
  const b = e.body;
  if (!b.grounded && e.state !== 'dead') {
    b.vy = (b.vy || 0) - 22 * dt;
    b.pos.y += b.vy * dt;
    const g = e.game.world.col.groundHeight(b.pos.x, b.pos.z, 0.2, b.pos.y + 0.5);
    if (b.pos.y <= g) {
      b.pos.y = g;
      b.vy = 0;
      b.grounded = true;
      if (e.state === 'stunned') {
        e.game.audio && e.game.audio.play('hit', e.pos);
        e.game.fx.blood.emit(e.pos.x, e.pos.y + 0.2, e.pos.z, 14, { color: [0.08, 0.08, 0.1], speed: 2.2, life: 1.2, up: 1.5, gravity: -2 });
      }
    }
    b.pos.x += e.vx * dt;
    b.pos.z += e.vz * dt;
    e.game.world.col.resolve(b.pos, b.radius, b.pos.y, 0.6, 0.3);
    return;
  }
  // (moveBody, como cualquiera que pisa)
  const col = e.game.world.col;
  const nx = b.pos.x + e.vx * dt,
    nz = b.pos.z + e.vz * dt;
  // no se tira del alero andando
  if (Math.abs(col.groundHeight(nx, nz, 0.15, b.pos.y + 0.4) - b.pos.y) > 0.6) {
    e.vx = e.vz = 0;
    return;
  }
  b.pos.x = nx;
  b.pos.z = nz;
  col.resolve(b.pos, b.radius, b.pos.y, 0.6, 0.3);
  const g = col.groundHeight(b.pos.x, b.pos.z, 0.2, b.pos.y + 0.4);
  if (g < b.pos.y - 0.05) b.grounded = false;
  else b.pos.y = g;
}

// ======================================================================= EL TIPO
const crClips = {
  alert: clip('alert', 0.6, [
    [0, {}],
    [0.6, {}],
  ]),
  hurt: clip('hurt', 0.35, [
    [0, { neck: [-30, 0, 20], head: [-20, 30, 0] }, 'snap'],
    [0.35, {}],
  ]),
  stagger: clip('stagger', 0.5, [
    [0, {}],
    [0.5, {}],
  ]),
  death: clip('death', 3, [
    [0, {}],
    [3, {}],
  ]),
  // el picotazo: atrás el pescuezo y, de golpe, el pico por delante
  peck: clip('peck', 0.75, [
    [0, { neck: [-20, 0, 0], head: [10, 0, 0], jaw: [0, 0, 0] }],
    [0.26, { neck: [-50, 0, 0], head: [30, 0, 0], jaw: [34, 0, 0], body: [-20, 0, 0] }],
    [0.36, { neck: [70, 0, 0], head: [-6, 0, 0], jaw: [8, 0, 0], body: [18, 0, 0] }, 'snap'],
    [0.75, { neck: [6, 0, 0], head: [0, 0, 0], jaw: [0, 0, 0], body: [-12, 0, 0] }],
  ]),
};

export const CUERVO_TYPE = {
  name: 'Cuervo cebado',
  build: buildCuervo,
  hp: 38,
  poise: 10,
  radius: 0.36,
  height: 0.9,
  lockHeight: 0.5,
  walk: 1.5,
  sight: CRW.sight,
  hear: 4,
  turn: 6,
  parryDur: 2.2,
  clips: crClips,
  voice: 'cuervo',
  blood: [0.2, 0.05, 0.05],
  attacks: [],
  ai: crowAI,
  // te ha visto: se vuelve y grazna (lo demás, en crowAI)
  wake: (e) => {
    e.state = 'alert';
    e.stT = 0;
    e.data.caw = 1;
    return true;
  },
  // desviado el picado: se viene abajo, aturdido
  onParried: (e) => {
    e.state = 'stunned';
    e.stT = 0;
    e.data.v = null;
    e.body.grounded = false;
    e.body.vy = 0;
    e.anim.stop(0.05);
  },
  // herido: plumas negras por el aire
  onHit: (e, kind) => {
    const g = e.game;
    g.fx.blood.emit(e.pos.x, e.pos.y + BODY_Y, e.pos.z, 16, { color: [0.07, 0.07, 0.09], speed: 2.4, life: 1.4, up: 1.2, gravity: -2.5 });
    if (kind === 'kill') {
      e.body.grounded = false;
      e.body.vy = Math.max(1, e.body.vy || 0);
      if (e.data.v) {
        e.vx = e.data.v.x * 0.4;
        e.vz = e.data.v.z * 0.4;
      }
    }
  },
  loco: (e, t) => {
    const p = {};
    const st = e.state;
    if (st === 'dead') return deathPose(e, e.stT, p);
    if (st === 'ground' || st === 'peck' || st === 'stunned' || (st === 'hurt' && e.body.grounded && !e.data.v)) return groundPose(e, t, p);
    if (st === 'alert') return perchPose(e, t, p);
    return flyPose(e, t, p);
  },
  idlePose: (e, kind, t) => perchPose(e, t, {}),
  onReset: (e) => {
    e.data.v = null;
    e.body.grounded = true;
  },
};
