// PLAN B, verdadera forma: LA MASA (41 m de alto, 68 de ancho; 100 con las lenguas).
//
// «La masa no sube. Crece. Esta mañana la artesa estaba llena hasta el borde
// y latía bajo el paño.» Cuando el Tordo cae, el vientre le revienta y lo que
// llevaba dentro no deja de crecer: se traga la plaza, las casas de alrededor
// y la fachada de la Sé (las torres asoman de ella como dos tocones) hasta
// ser más grande que la catedral. Es una montaña de lóbulos que levan como el
// pan: piel pálida y tirante, carne viva en las grietas, jirones del paño del
// panadero pegados encima, caras de gente grandes como casas que empujan
// desde dentro y brazos que se estiran. Por las calles baja en lenguas que
// aplastan lo que encuentran. En lo alto, un cráter rodeado de dedos que
// respira vapor y deja ver el corazón encendido. Del caballo sólo quedan las
// patas de zancos, clavadas en ella como palos, y la calavera hundida.
import * as THREE from 'three';
import { Sculpt, ColossusModel, tubeGeo, hardGeo, V } from './sculpt.js';
import { ColFX } from './colfx.js';
import { RNG } from '../../core/util.js';

const DEG = Math.PI / 180;

// las torres de la fachada de la Sé (espacio del modelo): la masa las rodea
// y se les sube, pero asoman por encima
export const TOWERS = [
  [7, -13],
  [-11, -13],
];
// lenguas de masa por las calles: [punto inicial, punto final, radio]
// (espacio del modelo; el origen se coloca en la plaza, delante de la Sé)
const TONGUES = [
  [[0, 5, 22], [0, 3.2, 52], 8.5], // calle de la Catedral, hacia el sur
  [[24, 5, 10], [46, 3, 18], 7], // hacia el claustro y los Pellejeros
  [[-25, 5, 8], [-45, 3, 12], 7], // hacia los barrios del oeste
  [[20, 4, -18], [38, 2.5, -30], 6],
  [[-20, 4, -18], [-36, 2.5, -34], 6],
];

export function buildMasa(o = {}) {
  const M = new ColossusModel([
    { name: 'root', pos: [0, 0, 0] },
    { name: 'mass', parent: 'root', pos: [0, 14, 0] },
    { name: 'top', parent: 'mass', pos: [0, 34, -2] },
    ...TONGUES.map((t, i) => ({ name: 't' + i, parent: 'root', pos: t[0] })),
  ]);
  const rng = new RNG(o.seed || 31);
  const H = [];
  const tube = (bone, mat, pts, radii, opt = {}) => H.push({ bone, mat, geo: tubeGeo(pts.map((p) => (p.isVector3 ? p : V(...p))), radii, opt) });
  const sc = new Sculpt({
    cell: o.cell || 0.82,
    bones: M.index,
    noise: { amp: 0.4, freq: 0.16, oct: 3, lump: 1.1, lumpFreq: 0.05, vein: 0.36, veinFreq: 0.09 },
    aoDist: 8,
    aoStrength: 1.25,
    matNoise: 0.55,
    matFreq: 0.12,
    macro: [
      { freq: 0.03, color: [1.08, 0.96, 0.8], amt: 0.6, thr: 0.5 },
      { freq: 0.05, color: [0.66, 0.42, 0.44], amt: 0.55, thr: 0.62 },
    ],
  });
  const DOUGH = [1, 1, 1];
  // ------------------------------------------------------------ el monte
  sc.ell([0, 2, -2], [30, 21, 26], { bone: 'mass', mat: 'colDough', k: 5, tint: DOUGH });
  // lóbulos que levan, grandes y pequeños, apretados unos contra otros
  const lobes = [];
  const lobe = (R0, R1, rad, k, n) => {
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, Math.PI * 2);
      const el = Math.acos(rng.range(0.02, 0.97));
      const R = rng.range(R0, R1) * (1 - (el / Math.PI) * 0.4);
      const cx = Math.cos(a) * Math.sin(el) * rad * 30,
        cy = 2 + Math.cos(el) * rad * 21,
        cz = Math.sin(a) * Math.sin(el) * rad * 26 - 2;
      if (TOWERS.some(([tx, tz]) => Math.hypot(cx - tx, cz - tz) < 6.5 + R && cy + R > 17)) continue;
      const pick = rng.next();
      const mat = pick < 0.6 ? 'colDough' : pick < 0.86 ? 'colFleshDim' : 'colAlb';
      sc.ell([cx, cy, cz], [R, R * rng.range(0.65, 0.95), R], { bone: 'mass', mat, k, tint: mat === 'colAlb' ? [0.9, 0.84, 0.76] : [1, 1, 1], n: mat === 'colFleshDim' ? 1.4 : 1, vn: mat === 'colFleshDim' ? 1.6 : 0.9 });
      lobes.push({ c: [cx, cy, cz], R });
    }
  };
  lobe(6.5, 11, 0.98, 3.2, 44);
  lobe(3.2, 6, 1.12, 1.8, 70);
  lobe(1.4, 2.8, 1.2, 0.9, 90);
  // el cráter de la cima, con su labio grueso
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rng.range(-0.12, 0.12);
    const r = rng.range(3.2, 5.4);
    const R = 8.6 + rng.range(-0.8, 0.8);
    sc.ell([Math.cos(a) * R, 32.5 + rng.range(-1, 1.5), Math.sin(a) * R - 2], [r, r * rng.range(0.8, 1.2), r], { bone: 'top', mat: i % 3 ? 'colDough' : 'colFleshDim', k: 2.2, n: 1.2 });
    sc.ell([Math.cos(a) * (R - 3.5), 34.2, Math.sin(a) * (R - 3.5) - 2], [2.2, 1.6, 2.2], { bone: 'top', mat: 'colFleshDim', k: 1.5, n: 1.5, vn: 2 });
  }
  sc.ell([0, 29.5, -2], [10, 6, 10], { bone: 'top', mat: 'colFleshDim', k: 3 });
  sc.ell([0, 36.5, -2], [6.2, 6.5, 6.2], { sub: true, k: 2.5 });
  // lenguas por las calles (aplastadas contra el suelo, con bultos)
  TONGUES.forEach(([a, b, r], i) => {
    const A = V(...a),
      B = V(...b);
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const c = A.clone().lerp(B, t);
      const rr = r * (1 - t * 0.45);
      c.x += rng.range(-1.5, 1.5);
      c.z += rng.range(-1.5, 1.5);
      sc.ell(c.toArray(), [rr * rng.range(0.9, 1.15), rr * 0.62, rr * rng.range(0.9, 1.15)], { bone: 't' + i, mat: k % 3 === 1 ? 'colFleshDim' : 'colDough', k: 2.4, tint: DOUGH });
      for (let q = 0; q < 3; q++) {
        const rb = rr * rng.range(0.25, 0.45);
        sc.ell([c.x + rng.range(-rr, rr) * 0.7, c.y + rr * 0.35, c.z + rng.range(-rr, rr) * 0.7], [rb, rb * 0.8, rb], { bone: 't' + i, mat: 'colDough', k: 1.2 });
      }
    }
    sc.ell(B.clone().add(V(0, -0.5, 0)).toArray(), [r * 0.62, r * 0.38, r * 0.7], { bone: 't' + i, mat: 'colFleshDim', k: 2.2, n: 1.4 });
  });
  for (const [tx, tz] of TOWERS) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rng.range(-0.2, 0.2);
      const y = rng.range(17, 23);
      const r = rng.range(1.6, 2.6);
      sc.ell([tx + Math.cos(a) * 4.6, y, tz + Math.sin(a) * 4.6], [r, r * 1.4, r], { bone: 'mass', mat: i % 2 ? 'colDough' : 'colFleshDim', k: 1.4 });
    }
  }
  // caras de gente grandes como casas, empujando desde dentro
  const faces = [];
  for (let i = 0; i < 12; i++) {
    const L = lobes[(i * 7 + 3) % lobes.length];
    const n = V(L.c[0], L.c[1] - 2, L.c[2] + 2).normalize();
    if (n.y > 0.85) continue;
    const s = rng.range(0.9, 1.6);
    const c = V(...L.c).addScaledVector(n, L.R * 0.92);
    const yaw = Math.atan2(n.x, n.z);
    const fw = V(Math.sin(yaw), 0, Math.cos(yaw)),
      rt = V(Math.cos(yaw), 0, -Math.sin(yaw));
    sc.ell(c.toArray(), [2.6 * s, 3.3 * s, 1.9 * s], { bone: 'mass', mat: 'colDough', k: 1.5, rot: [0, yaw / DEG, 0], tint: [1.02, 0.98, 0.96], n: 0.4 });
    sc.ell(c.clone().addScaledVector(fw, 1.6 * s).add(V(0, -0.35 * s, 0)).toArray(), [0.5 * s, 0.8 * s, 0.6 * s], { bone: 'mass', mat: 'colDough', k: 0.5, rot: [0, yaw / DEG, 0] }); // nariz
    for (const sx of [-1, 1]) sc.ell(c.clone().addScaledVector(fw, 1.2 * s).addScaledVector(rt, sx * 0.95 * s).add(V(0, 0.75 * s, 0)).toArray(), [0.55 * s, 0.45 * s, 0.5 * s], { sub: true, k: 0.4 });
    sc.ell(c.clone().addScaledVector(fw, 1.4 * s).add(V(0, -1.45 * s, 0)).toArray(), [0.75 * s, 1.0 * s, 0.7 * s], { sub: true, k: 0.45 });
    faces.push({ c, s, fw, rt });
  }
  // la calavera del Tordo, hundida en la masa
  const SK = V(-6, 30, 17);
  sc.ell(SK.toArray(), [1.6, 1.9, 2.1], { bone: 'mass', mat: 'colBone', k: 0.8, rot: [-30, 20, 0] });
  sc.rc(SK.clone().add(V(0.4, -0.4, 1.4)).toArray(), SK.clone().add(V(1.6, -2.6, 5.2)).toArray(), 1.25, 0.82, { bone: 'mass', mat: 'colBone', k: 0.7 });
  for (const sx of [-1, 1]) sc.ell(SK.clone().add(V(sx * 1.15, 0.35, 1.3)).toArray(), [0.62, 0.55, 0.6], { sub: true, k: 0.2 });
  const geo = sc.build();
  M.skinned(geo, sc.mats);
  M.sculptStats = sc.stats;

  // ======================================================================= piezas duras
  // dedos alrededor del cráter, hacia dentro
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + rng.range(-0.1, 0.1);
    const base = V(Math.cos(a) * 9.2, 35.5, Math.sin(a) * 9.2 - 2);
    const inward = V(-Math.cos(a), 0, -Math.sin(a));
    const L = rng.range(4.5, 7);
    const k1 = base.clone().add(V(0, L * 0.45, 0)).addScaledVector(inward, L * 0.15);
    const k2 = k1.clone().add(V(0, L * 0.25, 0)).addScaledVector(inward, L * 0.4);
    const tip = k2.clone().add(V(0, -L * 0.1, 0)).addScaledVector(inward, L * 0.3);
    tube('top', 'colDough', [base, k1, k2, tip], [0.9, 0.78, 0.62, 0.3], { radial: 7, perM: 1.2 });
    H.push({ bone: 'top', mat: 'colBone', geo: coneAlong(tip, tip.clone().sub(k2).normalize(), 0.3, 1.2) });
  }
  // brazos que se estiran desde la masa (de gente, pero enormes)
  for (let i = 0; i < 26; i++) {
    const L = lobes[(i * 5 + 1) % lobes.length];
    const n = V(L.c[0] + rng.range(-4, 4), L.c[1] - 2 + rng.range(-3, 3), L.c[2] + 2 + rng.range(-4, 4)).normalize();
    const base = V(...L.c).addScaledVector(n, L.R * 0.85);
    const len = rng.range(5, 11);
    const up = V(rng.range(-0.3, 0.3), 1, rng.range(-0.3, 0.3)).normalize();
    const d = n.clone().multiplyScalar(0.6).addScaledVector(up, 0.5).normalize();
    const elbow = base.clone().addScaledVector(d, len * 0.5).add(V(rng.range(-1, 1), rng.range(0, 1.5), rng.range(-1, 1)));
    const wrist = elbow.clone().addScaledVector(d, len * 0.45).add(V(0, rng.range(-1, 1), 0));
    tube('mass', 'colDough', [base, elbow, wrist], [0.85, 0.62, 0.45], { radial: 7, perM: 1 });
    // la mano abierta: cuatro dedos y el pulgar
    const side = up.clone().cross(d).normalize();
    for (let f = 0; f < 5; f++) {
      const t = (f - 2) * 0.32;
      const fd = d.clone().addScaledVector(side, t).normalize();
      const fl = f === 0 ? 1.4 : rng.range(1.7, 2.3);
      const fb = wrist.clone().addScaledVector(side, t * 0.8);
      tube('mass', 'colDough', [fb, fb.clone().addScaledVector(fd, fl * 0.6).add(V(0, 0.2, 0)), fb.clone().addScaledVector(fd, fl).add(V(0, -0.15, 0))], [0.2, 0.17, 0.1], { radial: 5, perM: 2 });
    }
  }
  // las patas del Tordo, clavadas en la masa como palos (con sus herraduras)
  for (const [p, d, L] of [
    [[14, 22, 12], [0.55, 0.75, 0.35], 16],
    [[-16, 18, 10], [-0.7, 0.6, 0.4], 18],
    [[6, 28, -12], [0.2, 0.85, -0.5], 14],
    [[-9, 12, 22], [-0.3, 0.3, 0.9], 15],
  ]) {
    const dn = V(...d).normalize();
    const a = V(...p),
      b = a.clone().addScaledVector(dn, L);
    const knee = a.clone().lerp(b, 0.55).add(V(0, 0.8, 0));
    tube('mass', 'colTordo', [a, knee, b], [0.9, 0.5, 0.36], { radial: 7, perM: 0.8 });
    H.push({ bone: 'mass', mat: 'colBone', geo: hardGeo({ type: 'sphere', s: [0.62], seg: 7, seg2: 5, p: knee.toArray(), mat: 'colBone' }) });
    const hoof = b.clone().addScaledVector(dn, 0.5);
    H.push({ bone: 'mass', mat: 'wooddark', geo: cylAlong(b, dn, 0.55, 0.9, 0.8, 'wooddark') });
    H.push({ bone: 'mass', mat: 'iron', geo: cylAlong(hoof, dn, 0.82, 0.82, 0.14, 'iron') });
  }
  // la silla y la gualdrapa del caballo, arrastradas por la masa
  H.push({ bone: 'mass', mat: 'clothRed', ds: true, geo: hardGeo({ type: 'box', s: [7, 0.1, 5], p: [9, 31.5, 8], r: [24, 30, -18], mat: 'clothRed' }) });
  H.push({ bone: 'mass', mat: 'colOrphrey', geo: hardGeo({ type: 'box', s: [3.8, 0.16, 0.6], p: [9, 31.65, 8], r: [24, 30, -18], mat: 'colOrphrey' }) });
  H.push({ bone: 'mass', mat: 'colOrphrey', geo: hardGeo({ type: 'box', s: [0.6, 0.16, 3.2], p: [9, 31.65, 8], r: [24, 30, -18], mat: 'colOrphrey' }) });
  // casas tragadas: tejados, vigas y muros que asoman de la masa
  for (let i = 0; i < 14; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(24, 33);
    const y = rng.range(1, 9);
    const roof = rng.chance(0.5);
    const p = [Math.cos(a) * r, y, Math.sin(a) * r * 0.9 - 2];
    const rot = [rng.range(-40, 40), (-a / DEG) + rng.range(-20, 20), rng.range(-40, 40)];
    if (roof) {
      H.push({ bone: 'root', mat: 'roof', geo: hardGeo({ type: 'box', s: [6, 0.35, 4], p, r: rot, mat: 'roof' }) });
      H.push({ bone: 'root', mat: 'wooddark', geo: hardGeo({ type: 'box', s: [6.6, 0.3, 0.3], p: [p[0], p[1] - 0.3, p[2]], r: rot, mat: 'wooddark' }) });
    } else H.push({ bone: 'root', mat: 'plaster', geo: hardGeo({ type: 'box', s: [4.5, 3.5, 0.5], p, r: rot, mat: 'plaster' }) });
  }
  // venas gruesas que unen los corazones de la superficie (los puntos débiles)
  const hearts = [
    [16, 24, 14],
    [-18, 20, 12],
    [3, 13, 26],
    [22, 12, -10],
    [-14, 26, -10],
  ];
  for (const h of hearts) {
    const c = V(...h);
    const n = c.clone().normalize();
    const pos = c.clone().addScaledVector(n, 1.2);
    H.push({ bone: 'mass', mat: 'redGlow', geo: hardGeo({ type: 'ico', s: [1.6, 1.9, 1.6], detail: 1, p: pos.toArray(), mat: 'redGlow', ao: false }) });
    H.push({ bone: 'mass', mat: 'colFleshDim', geo: hardGeo({ type: 'torus', s: [1.8, 0.7], seg: 12, seg2: 6, p: pos.toArray(), r: [Math.atan2(n.z, n.y) / DEG, 0, -Math.atan2(n.x, n.y) / DEG], mat: 'colFleshDim' }) });
    // vena hacia el cráter, pegada a la superficie
    const pts = [];
    for (let k = 0; k <= 5; k++) {
      const t = k / 5;
      const q = pos.clone().lerp(V(0, 33, -2), t);
      const len = q.length();
      q.multiplyScalar((len + 1.2 + Math.sin(t * Math.PI) * 2.5) / len);
      pts.push(q);
    }
    tube('mass', 'colFleshDim', pts, [0.9, 0.85, 0.8, 0.75, 0.7, 0.6], { radial: 7, perM: 0.6 });
  }
  M.rigid(H);

  // ======================================================================= brillos
  const fx = new ColFX(M);
  fx.glow('top', [0, 31.5, -2], 22, 0xff5020, { pulse: 0.3, opacity: 0.85 });
  fx.glow('top', [0, 30, -2], 8, 0xffb070, { pulse: 0.2 });
  fx.light('top', [0, 38, -2], 0xff6a30, 220, 60);
  for (const h of hearts) {
    const c = V(...h);
    const n = c.clone().normalize();
    fx.glow('mass', c.clone().addScaledVector(n, 2.6).toArray(), 7, 0xff4a20, { pulse: 0.35, opacity: 0.8 });
  }
  for (const f of faces)
    for (const sx of [-1, 1]) fx.glow('mass', f.c.clone().addScaledVector(f.fw, 1.0 * f.s).addScaledVector(f.rt, sx * 0.95 * f.s).add(V(0, 0.75 * f.s, 0)).toArray(), 1.4 * f.s, 0xffa060, { pulse: 0.12 });
  // vapor del cráter
  for (let i = 0; i < 4; i++) fx.flame('top', [rng.range(-3, 3), 37 + i * 0.6, rng.range(-5, 1)], [5, 8], { color: 0x806050 });
  return { model: M, fx, info: { name: 'La Masa', height: 41, width: 68, spread: 100 } };
}

function cylAlong(b, d, r0, r1, L, mat) {
  const g = hardGeo({ type: 'cyl', s: [r1, r0, L], seg: 10, p: [0, L / 2, 0], mat, ao: false });
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d));
  g.translate(b.x, b.y, b.z);
  return g;
}
function coneAlong(b, d, r, L) {
  const g = hardGeo({ type: 'cone', s: [r, L], seg: 6, p: [0, L / 2, 0], mat: 'colBone', ao: false });
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d));
  g.translate(b.x, b.y, b.z);
  return g;
}
