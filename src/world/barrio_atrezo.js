// El atrezo del barrio de los Pellejeros: lo que hay en las casas de los
// oficios (el zapatero, la cerera, el tintorero, el cordelero) y lo que dejó
// el Físico (las cruces de cal, los cepos, las campanillas, los camastros).
// Todo se dibuja en la sala que se le dé (room); las colisiones, aparte.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import * as P from './props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const M4 = () => new THREE.Matrix4();
const Q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));

// Un madero de a a b, de escuadría r (medio canto).
export function palo(wb, a, b, r, mat = 'wooddark', o = {}) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
  wb.geometry(mat, o.round ? new THREE.CylinderGeometry(r, r, 1, 6) : new THREE.BoxGeometry(r * 2, 1, r * 2), M4().compose(a.clone().add(b).multiplyScalar(0.5), q, V(1, len, 1)), { ao: false, room: o.room, tint: o.tint, grime: o.grime });
}

// ------------------------------------------------------------ el zapatero
// La banqueta del zapatero: el asiento bajo, con su cajón de las leznas, las
// tachuelas y el cuchillo de cortar suela; la horma puesta en el pie de
// hierro y el tirapié de cuero. rot: hacia dónde se sienta uno (de cara a +z).
export function banqueta(ctx, x, y, z, rot, room) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    // el asiento y las patas
    wb.box('wooddark', -0.55, 0.38, -0.22, 0.55, 0.45, 0.22, { ao: false, room, faces: 'tnsewb' });
    for (const [sx, sz] of [
      [-0.48, -0.16],
      [0.48, -0.16],
      [-0.48, 0.16],
      [0.48, 0.16],
    ])
      wb.box('wooddark', sx - 0.035, 0, sz - 0.035, sx + 0.035, 0.38, sz + 0.035, { ao: false, room });
    // el cajón de las herramientas, a un lado del asiento
    wb.box('wooddark', 0.12, 0.45, -0.2, 0.55, 0.55, 0.2, { ao: false, room, faces: 'nsewb' });
    wb.box('black', 0.15, 0.53, -0.17, 0.52, 0.535, 0.17, { ao: false, room, grime: false, faces: 't' });
    for (let i = 0; i < 5; i++) wb.box('iron', 0.18 + i * 0.07, 0.53, -0.1, 0.2 + i * 0.07, 0.62, -0.08, { ao: false, room });
    wb.box('iron', 0.2, 0.555, 0.04, 0.48, 0.565, 0.08, { ao: false, room });
    wb.box('wooddark', 0.42, 0.555, 0.03, 0.5, 0.58, 0.09, { ao: false, room });
    // el pie de hierro con una horma y un zapato a medio coser
    wb.cylinder('iron', -0.2, 0, 0.42, 0.02, 0.02, 0.62, 5, { ao: false, room });
    wb.box('iron', -0.26, 0.6, 0.36, -0.14, 0.64, 0.48, { ao: false, room });
    horma(wb, -0.2, 0.64, 0.42, 0.3, room, true);
  });
  P.colOBB(ctx, x, z, 0.6, 0.3, rot, y, y + 0.6);
}

// Una horma de madera (el pie sin dedos), de largo s, a lo largo de +z; con
// el zapato de cuero a medio hacer encima, si se le pide.
export function horma(wb, x, y, z, s, room, shoe, rot = 0) {
  wb.at(x, y, z, rot, () => {
    wb.geometry('planks', new THREE.SphereGeometry(0.5, 7, 5), M4().compose(V(0, s * 0.18, 0), new THREE.Quaternion(), V(s * 0.34, s * 0.32, s)), { ao: false, room, tint: [0.85, 0.72, 0.55] });
    wb.box('planks', -s * 0.12, s * 0.18, -s * 0.42, s * 0.12, s * 0.5, -s * 0.18, { ao: false, room, tint: [0.85, 0.72, 0.55] });
    if (shoe) wb.geometry('leather', new THREE.SphereGeometry(0.5, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.62), M4().compose(V(0, s * 0.16, s * 0.04), new THREE.Quaternion(), V(s * 0.37, s * 0.36, s * 1.04)), { ao: false, room, tint: [0.42, 0.3, 0.22] });
  });
}

// Un par de botas (o zapatos), de pie o tumbados, de cuero.
export function botas(ctx, x, y, z, rot, room, o = {}) {
  const wb = ctx.wb;
  const tall = o.tall ?? true;
  const tint = o.tint ?? [0.4, 0.28, 0.2];
  wb.at(x, y, z, rot, () => {
    for (const sx of [-0.09, 0.09]) {
      wb.push();
      wb.translate(sx, 0, 0);
      if (o.lying && sx > 0) {
        wb.rotateZ(Math.PI / 2 - 0.1);
        wb.translate(0.05, -0.05, 0);
      }
      wb.box('leather', -0.055, 0, -0.06, 0.055, 0.09, 0.2, { ao: false, room, tint });
      wb.box('leather', -0.06, 0, -0.08, 0.06, tall ? 0.38 : 0.13, 0.05, { ao: false, room, tint });
      if (tall) wb.box('leather', -0.065, 0.32, -0.085, 0.065, 0.38, 0.055, { ao: false, room, tint: tint.map((v) => v * 0.8) });
      wb.pop();
    }
  });
}

// Una piel de becerro curtida, colgada de una vara por las patas (o
// echada sobre algo): lámina de cuero con su silueta.
export function cuero(ctx, x, y, z, rot, w, h, room, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(o.seed ?? Math.round(x * 17 + z * 31));
  const tint = o.tint ?? rng.pick([
    [0.58, 0.42, 0.3],
    [0.5, 0.36, 0.26],
    [0.66, 0.5, 0.36],
  ]);
  wb.at(x, y, z, rot, () => {
    wb.push();
    wb.rotateZ(rng.range(-0.04, 0.04));
    wb.rotateX(o.tilt ?? 0);
    // el cuerpo, con los bordes mordidos: tiras de distinto largo
    const n = 6;
    for (let i = 0; i < n; i++) {
      const u0 = -w / 2 + (i * w) / n,
        u1 = u0 + w / n;
      const len = h * (i === 0 || i === n - 1 ? rng.range(0.7, 0.85) : rng.range(0.92, 1.0));
      wb.box('leather', u0, -len, -0.006, u1, 0, 0.006, { ao: false, room, faces: 'nsb', tint });
    }
    // las patas, colgando
    for (const s of [-1, 1]) wb.box('leather', s * w * 0.55 - 0.05, -h * 0.2, -0.005, s * w * 0.55 + 0.05, 0, 0.005, { ao: false, room, faces: 'ns', tint });
    wb.pop();
  });
}

// ------------------------------------------------------------ la cerera
// La caldera de la cera, sobre su trébede, con las ascuas debajo; la cera
// derretida (ámbar) y el cazo; si está apagada, la cera fría (blanca).
export function calderaCera(ctx, x, y, z, room, o = {}) {
  const wb = ctx.wb;
  const lit = o.lit !== false;
  // la trébede: el aro y las tres patas
  wb.cylinder('iron', x, y + 0.42, z, 0.36, 0.36, 0.04, 10, { ao: false, room });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    palo(wb, V(x + Math.cos(a) * 0.34, y + 0.44, z + Math.sin(a) * 0.34), V(x + Math.cos(a) * 0.44, y, z + Math.sin(a) * 0.44), 0.018, 'iron', { room });
  }
  // la caldera de cobre
  const pts = [
    [0.001, 0],
    [0.2, 0.01],
    [0.31, 0.1],
    [0.34, 0.28],
    [0.33, 0.4],
    [0.35, 0.42],
  ].map(([r, h]) => new THREE.Vector2(r, h));
  wb.geometry('bronze', new THREE.LatheGeometry(pts, 12), M4().makeTranslation(x, y + 0.3, z), { ao: false, room, tint: [0.85, 0.55, 0.35] });
  wb.cylinder('candle', x, y + 0.66, z, 0.32, 0.32, 0.01, 12, { ao: false, room, capTop: true, grime: false, tint: lit ? [1.0, 0.72, 0.32] : [0.95, 0.9, 0.8] });
  // el cazo, apoyado en el borde
  palo(wb, V(x + 0.1, y + 0.62, z - 0.05), V(x + 0.62, y + 0.95, z - 0.12), 0.015, 'iron', { room, round: true });
  // las ascuas
  if (lit) {
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1;
      wb.geometry('ember', new THREE.DodecahedronGeometry(0.06, 0), M4().compose(V(x + Math.cos(a) * 0.14, y + 0.04, z + Math.sin(a) * 0.14), Q(a, a * 2, 0), V(1, 0.7, 1)), { ao: false, room, grime: false });
    }
    ctx.fires.push({ x, y: y + 0.08, z, s: 0.32, light: false, embers: true, glow: true });
    ctx.lights.push({ x, y: y + 0.5, z, r: 1, g: 0.45, b: 0.15, radius: o.radius ?? 4.2, intensity: o.intensity ?? 0.9, room });
  }
  P.colOBB(ctx, x, z, 0.45, 0.45, 0, y, y + 0.72);
}

// Una vara de velas de baño puestas a secar: la vara, de pared a pared (o
// colgada del techo), y las velas por pares, colgadas de su pabilo.
export function varaVelas(ctx, x0, z0, x1, z1, y, room, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(o.seed ?? Math.round(x0 * 7 + z0 * 13));
  palo(wb, V(x0, y, z0), V(x1, y, z1), 0.02, 'wooddark', { room, round: true });
  const L = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.floor(L / 0.11);
  for (let i = 1; i < n; i++) {
    if (rng.chance(o.gaps ?? 0.12)) continue;
    const t = i / n;
    const x = x0 + (x1 - x0) * t,
      z = z0 + (z1 - z0) * t;
    const len = rng.range(0.28, 0.42) * (o.scale ?? 1);
    wb.box('black', x - 0.003, y - 0.06, z - 0.003, x + 0.003, y, z + 0.003, { ao: false, room, grime: false });
    wb.cylinder('candle', x, y - 0.06 - len, z, 0.014, 0.022, len, 5, { ao: false, room, capBot: true, grime: false, tint: o.tint ?? [0.95, 0.9, 0.78] });
  }
}

// Velas en su estante: de muchos tamaños, de pie, apagadas.
export function estanteVelas(ctx, x, y, z, rot, w, room) {
  const wb = ctx.wb;
  const rng = new RNG(Math.round(x * 19 + z * 7));
  wb.at(x, y, z, rot, () => {
    for (const sx of [-w / 2, w / 2 - 0.05]) wb.box('wooddark', sx, 0, -0.18, sx + 0.05, 1.9, 0.18, { ao: false, room });
    for (let i = 0; i < 4; i++) {
      const yy = 0.25 + i * 0.45;
      wb.box('wooddark', -w / 2 + 0.05, yy, -0.17, w / 2 - 0.05, yy + 0.03, 0.17, { ao: false, room, faces: 'tnsewb' });
      for (let u = -w / 2 + 0.14; u < w / 2 - 0.1; u += rng.range(0.07, 0.12)) {
        if (rng.chance(0.2)) continue;
        const h = rng.range(0.12, 0.36),
          r = rng.range(0.018, 0.045);
        wb.cylinder('candle', u, yy + 0.03, rng.range(-0.08, 0.08), r, r, h, 5, { ao: false, room, capTop: true, grime: false, tint: rng.chance(0.2) ? [0.9, 0.78, 0.5] : [0.95, 0.92, 0.82] });
      }
    }
  });
  P.colOBB(ctx, x, z, w / 2, 0.2, rot, y, y + 1.9);
}

// Panes de cera virgen apilados (los de la colmena, amarillos).
export function panesCera(ctx, x, y, z, n, room, seed = 1) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  for (let i = 0; i < n; i++) {
    const r = rng.range(0.12, 0.17);
    wb.cylinder('candle', x + rng.range(-0.04, 0.04), y + i * 0.07, z + rng.range(-0.04, 0.04), r, r * 1.05, 0.07, 9, { ao: false, room, capTop: true, grime: false, tint: [1.0, 0.82, 0.4] });
  }
}

// ------------------------------------------------------------ el tintorero
// Paños tendidos de una vara: n lienzos de colores que caen de la vara (en
// x0,z0 → x1,z1 a la altura y) hasta drop; algo movidos.
export function panos(ctx, x0, z0, x1, z1, y, drop, colors, room, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(o.seed ?? Math.round(x0 * 11 + z1 * 5));
  palo(wb, V(x0, y, z0), V(x1, y, z1), 0.025, 'wooddark', { room, round: true });
  const L = Math.hypot(x1 - x0, z1 - z0);
  const ang = Math.atan2(-(z1 - z0), x1 - x0);
  const n = o.n ?? Math.max(1, Math.floor(L / 1.0));
  for (let i = 0; i < n; i++) {
    const t0 = (i + 0.06) / n,
      t1 = (i + 0.94) / n;
    const c = rng.pick(colors);
    const xm = x0 + (x1 - x0) * ((t0 + t1) / 2),
      zm = z0 + (z1 - z0) * ((t0 + t1) / 2);
    const w = (t1 - t0) * L;
    const d = drop * rng.range(0.8, 1.0);
    wb.at(xm, y, zm, ang, () => {
      wb.push();
      wb.rotateX(rng.range(-0.08, 0.08));
      // (el paño doblado sobre la vara: por delante y por detrás)
      wb.box('clothWhite', -w / 2, -d, 0.02, w / 2, 0, 0.03, { ao: false, room, grime: false, tint: c, faces: 'nsb' });
      wb.box('clothWhite', -w / 2, -d * 0.55, -0.03, w / 2, 0, -0.02, { ao: false, room, grime: false, tint: c.map((v) => v * 0.85), faces: 'nsb' });
      wb.pop();
    });
  }
}

// Madejas teñidas colgadas de un clavo o de una vara (manojos de hilo).
export function madejas(ctx, x0, z0, x1, z1, y, colors, room, seed = 1) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  palo(wb, V(x0, y, z0), V(x1, y, z1), 0.02, 'wooddark', { room, round: true });
  const L = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.floor(L / 0.18);
  for (let i = 1; i < n; i++) {
    if (rng.chance(0.15)) continue;
    const t = i / n;
    const x = x0 + (x1 - x0) * t,
      z = z0 + (z1 - z0) * t;
    const len = rng.range(0.45, 0.7);
    wb.geometry('clothWhite', new THREE.CylinderGeometry(0.035, 0.05, len, 6), M4().compose(V(x, y - len / 2, z), Q(rng.range(-0.05, 0.05), 0, rng.range(-0.05, 0.05)), V(1, 1, 0.6)), { ao: false, room, grime: false, tint: rng.pick(colors) });
  }
}

// Piezas de paño enrolladas (rollos) apiladas, o de pie contra la pared.
export function rollos(ctx, x, y, z, rot, n, colors, room, seed = 1) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  wb.at(x, y, z, rot, () => {
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 3),
        k = i % 3;
      wb.push();
      wb.translate(-0.3 + k * 0.3 + (row % 2) * 0.15, 0.15 + row * 0.27, 0);
      wb.rotateZ(Math.PI / 2);
      wb.cylinder('clothWhite', 0, -0.7, 0, 0.14, 0.14, 1.4, 8, { ao: false, room, grime: false, capTop: true, capBot: true, tint: rng.pick(colors) });
      wb.pop();
    }
  });
  P.colOBB(ctx, x, z, 0.75, 0.6, rot, y, y + 0.15 + Math.ceil(n / 3) * 0.27);
}

// ------------------------------------------------------------ el Físico
// La cuerda con campanillas, tendida a la altura de la espinilla entre dos
// clavos: aquí, sólo los clavos (la cuerda y las campanillas, que suenan, se
// cortan y caen, son de game/trampas.js: L.bells).
export function campanillas(ctx, x0, z0, x1, z1, y, room) {
  const wb = ctx.wb;
  for (const [x, z] of [
    [x0, z0],
    [x1, z1],
  ])
    wb.box('iron', x - 0.02, y - 0.03, z - 0.02, x + 0.02, y + 0.03, z + 0.02, { ao: false, room });
}

// La cruz de cal, pintada a brochazos en una pared o en unas tablas: en el
// plano local (x a lo largo, z hacia fuera) del lado 'side' en (x, y, z).
export function cruzCal(ctx, x, y, z, rot, s = 1, room = 'out') {
  const wb = ctx.wb;
  const rng = new RNG(Math.round(x * 13 + z * 17));
  const W = [1.15, 1.13, 1.08];
  wb.at(x, y, z, rot, () => {
    wb.push();
    wb.rotateZ(rng.range(-0.08, 0.08));
    wb.box('plaster', -0.06 * s, -0.55 * s, 0, 0.06 * s, 0.55 * s, 0.006, { ao: false, faces: 's', room, tint: W });
    wb.box('plaster', -0.38 * s, 0.12 * s, 0, 0.38 * s, 0.24 * s, 0.006, { ao: false, faces: 's', room, tint: W });
    // los chorretones
    for (let i = 0; i < 3; i++) {
      const u = rng.range(-0.3, 0.3) * s;
      const d = rng.range(0.1, 0.3) * s;
      const y0 = Math.abs(u) < 0.07 * s ? -0.55 * s : 0.12 * s;
      wb.box('plaster', u - 0.012, y0 - d, 0, u + 0.012, y0, 0.006, { ao: false, faces: 's', room, tint: W });
    }
    wb.pop();
  });
}

// Un camastro con correas (el de los pacientes): el bastidor de madera, el
// jergón manchado y las tres correas abiertas con sus hebillas.
export function camastro(ctx, x, y, z, rot, room, o = {}) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -0.95, 0.38, -0.42, 0.95, 0.46, 0.42, { ao: false, room, faces: 'tnsewb' });
    for (const [sx, sz] of [
      [-0.9, -0.37],
      [0.9, -0.37],
      [-0.9, 0.37],
      [0.9, 0.37],
    ])
      wb.box('wooddark', sx - 0.05, 0, sz - 0.05, sx + 0.05, 0.46, sz + 0.05, { ao: false, room });
    wb.box('burlap', -0.9, 0.46, -0.38, 0.9, 0.58, 0.38, { ao: false, room, tint: o.tint ?? [0.62, 0.55, 0.45] });
    if (o.blood !== false) wb.box('flesh', -0.2, 0.581, -0.22, 0.35, 0.585, 0.18, { ao: false, room, faces: 't', tint: [0.45, 0.12, 0.1], grime: false });
    for (const sx of [-0.55, 0, 0.55]) {
      wb.box('leather', sx - 0.04, 0.3, -0.45, sx + 0.04, 0.6, -0.42, { ao: false, room, tint: [0.35, 0.25, 0.18] });
      wb.box('leather', sx - 0.04, 0.3, 0.42, sx + 0.04, 0.6, 0.45, { ao: false, room, tint: [0.35, 0.25, 0.18] });
      wb.box('iron', sx - 0.05, 0.5, 0.45, sx + 0.05, 0.56, 0.47, { ao: false, room });
    }
  });
  P.colOBB(ctx, x, z, 0.98, 0.46, rot, y, y + 0.6);
}
