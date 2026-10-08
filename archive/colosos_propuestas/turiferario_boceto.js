// PLAN A, primera forma: EL TURIFERARIO, coloso (21 m; 26 con la aureola).
//
// El arzobispo, crecido hasta las bóvedas: un sacerdote enjuto y encorvado,
// con la cabeza colgando por delante de una joroba alta como de buitre. De la
// cintura para abajo ya no hay hombre: un tronco de carne con los cuerpos de
// los fieles fundidos, que el alba (lino manchado de cera y sangre) apenas
// tapa: se le ha rasgado en jirones de la rodilla al suelo y por detrás se
// alarga en una cola de cuerpos que arrastra por las calles. Encima, la
// casulla carmesí con sus cenefas de oro, larga por detrás como una capa (la
// cruz en Y de la espalda es el camino para trepar). Por delante está rota
// y el costillar abierto como dos puertas: dentro arde el núcleo, el carbón
// del incienso. Por cara, una jaula de hierro con púas; la mitra se le ha
// partido en dos y cada mitad se ha quedado clavada en un cuerno de hueso;
// detrás de la cabeza, una aureola de hierro con once cirios encendidos.
// Brazos larguísimos de huesos y piel; con la derecha arrastra, por una
// cadena, la campana mayor de la Sé hecha incensario: ascuas dentro, humo y
// llamas por los agujeros.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Sculpt, ColossusModel, tubeGeo, hardGeo, V } from './sculpt_v1.js';
import { ColFX } from './colfx_v1.js';
import { colMat } from '../../src/gfx/materials.js';
import { RNG } from '../../src/core/util.js';

const DEG = Math.PI / 180;

export const TUR_BONES = [
  { name: 'root', pos: [0, 0, 0] },
  { name: 'hips', parent: 'root', pos: [0, 8.2, 0] },
  { name: 'spine', parent: 'hips', pos: [0, 10.6, -0.3] },
  { name: 'chest', parent: 'spine', pos: [0, 13.2, 0.3] },
  { name: 'neck', parent: 'chest', pos: [0, 15.4, 1.5] },
  { name: 'head', parent: 'neck', pos: [0, 16.3, 3.0] },
  { name: 'jaw', parent: 'head', pos: [0, 16.25, 3.75] },
  { name: 'armL', parent: 'chest', pos: [3.25, 15.0, 0.1] },
  { name: 'foreL', parent: 'armL', pos: [5.35, 10.6, 1.6] },
  { name: 'handL', parent: 'foreL', pos: [5.4, 5.6, 4.6] },
  { name: 'armR', parent: 'chest', pos: [-3.25, 15.0, 0.1] },
  { name: 'foreR', parent: 'armR', pos: [-5.2, 10.4, 1.0] },
  { name: 'handR', parent: 'foreR', pos: [-5.9, 5.3, 2.7] },
  { name: 'legL', parent: 'hips', pos: [1.5, 7.9, 0.2] },
  { name: 'footL', parent: 'legL', pos: [1.9, 0.9, 2.9] },
  { name: 'legR', parent: 'hips', pos: [-1.5, 7.9, 0.2] },
  { name: 'footR', parent: 'legR', pos: [-2.1, 0.9, 2.3] },
  { name: 'trainA', parent: 'hips', pos: [0, 1.2, -4.2] },
  { name: 'trainB', parent: 'trainA', pos: [0, 0.8, -8.2] },
  { name: 'trainC', parent: 'trainB', pos: [0, 0.6, -12.0] },
];

// ------------------------------------------------------------ utilidades geométricas
function perp(axis, a) {
  const t = Math.abs(axis.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
  const u = t.clone().cross(axis).normalize();
  const w = axis.clone().cross(u).normalize();
  return u.multiplyScalar(Math.cos(a)).addScaledVector(w, Math.sin(a));
}
function withColor(g, v = 0.85) {
  const n = g.attributes.position.count;
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(v), 3));
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}
// toro que rodea el eje dado, centrado en c
export function torusAround(R, t, c, axis, seg = 20) {
  const g = new THREE.TorusGeometry(R, t, 4, seg).toNonIndexed();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), axis.clone().normalize()));
  g.translate(c.x, c.y, c.z);
  return withColor(g);
}
// arco de toro (grados) en un plano horizontal, delante (+z) de c
function torusArc(R, t, c, a0, da, seg = 12) {
  const g = new THREE.TorusGeometry(R, t, 4, seg, da * DEG).toNonIndexed();
  g.rotateZ((90 + a0) * DEG);
  g.rotateX(Math.PI / 2);
  g.rotateY(Math.PI);
  g.translate(c[0], c[1], c[2]);
  return withColor(g);
}
// cadena de eslabones a lo largo de una curva
export function chainGeo(pts, linkR = 0.3, t = 0.075) {
  const curve = new THREE.CatmullRomCurve3(pts);
  const L = curve.getLength();
  const n = Math.max(2, Math.floor(L / (linkR * 1.55)));
  const geos = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const p = curve.getPointAt(u);
    const tg = curve.getTangentAt(u);
    const g = new THREE.TorusGeometry(linkR, t, 4, 10).toNonIndexed();
    g.scale(0.62, 1, 1);
    const side = perp(tg, i % 2 ? Math.PI / 2 : 0);
    g.applyMatrix4(new THREE.Matrix4().makeBasis(side.clone().cross(tg).normalize(), tg, side));
    g.translate(p.x, p.y, p.z);
    geos.push(withColor(g, 0.8));
  }
  return mergeGeometries(geos);
}

// ------------------------------------------------------------ la campana-incensario
// Grupo propio (en el juego se mueve como un péndulo): la campana con la
// corona en el origen y la boca hacia -Y (se orienta con setBell).
const BELL_H = 6.2;
function buildBell() {
  const grp = new THREE.Group();
  const H = BELL_H;
  const k = H / 3.4;
  const prof = [
    [1.62, 0],
    [1.68, 0.12],
    [1.5, 0.34],
    [1.2, 0.8],
    [1.02, 1.4],
    [0.98, 2.1],
    [0.94, 2.7],
    [0.8, 3.05],
    [0.5, 3.3],
    [0.02, 3.4],
  ].map(([r, y]) => [r * k, y * k]);
  const parts = { colBronze: [], iron: [], ember: [] };
  // el torno va de la boca (y = 0) a la corona: se baja para que la corona quede en el origen
  parts.colBronze.push(hardGeo({ type: 'lathe', points: prof, seg: 18, p: [0, -H, 0], mat: 'colBronze', ao: false }));
  for (const [y, rr, t] of [
    [0.1, 1.66, 0.12],
    [1.42, 1.04, 0.08],
    [2.72, 0.96, 0.08],
  ])
    parts.colBronze.push(torusAround(rr * k, t * k, V(0, -H + y * k, 0), V(0, 1, 0), 24));
  // inscripción en relieve: una banda con letras (cajitas)
  for (let i = 0; i < 26; i++) {
    if (i % 6 === 5) continue;
    const a = (i / 26) * Math.PI * 2;
    const r = 1.01 * k;
    parts.colBronze.push(hardGeo({ type: 'box', s: [0.16, 0.26, 0.05], p: [Math.cos(a) * r, -H + 2.4 * k, Math.sin(a) * r], r: [0, -a / DEG + 90, 0], mat: 'colBronze' }));
  }
  // asas de la corona
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const side = V(Math.cos(a), 0, Math.sin(a));
    parts.iron.push(torusAround(0.42, 0.12, side.clone().multiplyScalar(0.4).add(V(0, 0.15, 0)), V(-Math.sin(a), 0, Math.cos(a))));
  }
  // agujeros del incensario (ascuas)
  for (let kk = 0; kk < 2; kk++)
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + kk * 0.31;
      const y = -H + (1.25 + kk * 0.85) * k;
      const rr = (kk ? 0.99 : 1.06) * k;
      parts.ember.push(hardGeo({ type: 'box', s: [0.42, 0.62, 0.1], p: [Math.cos(a) * rr, y, Math.sin(a) * rr], r: [0, -a / DEG + 90, 0], mat: 'ember', ao: false }));
    }
  for (const [m, geos] of Object.entries(parts)) {
    const mesh = new THREE.Mesh(mergeGeometries(geos), colMat(m, { side: m === 'colBronze' ? THREE.DoubleSide : THREE.FrontSide }));
    mesh.frustumCulled = false;
    grp.add(mesh);
  }
  return grp;
}

// ======================================================================= modelo
export function buildTuriferarioColossus(o = {}) {
  const M = new ColossusModel(TUR_BONES);
  const rng = new RNG(o.seed || 7);
  const sc = new Sculpt({ cell: o.cell || 0.24, bones: M.index, noise: { amp: 0.07, freq: 0.9, oct: 3, lump: 0.22, lumpFreq: 0.16, vein: 0.07, veinFreq: 0.42 }, aoDist: 2.2, aoStrength: 1.1, matNoise: 0.7 });
  const mir = (fn) => {
    fn(1, 'L');
    fn(-1, 'R');
  };
  const H = [];
  const tube = (bone, mat, pts, radii, opt = {}) => H.push({ bone, mat, geo: tubeGeo(pts.map((p) => V(...p)), radii, opt) });

  // ------------------------------------------------------------ el tronco de carne bajo el alba
  sc.rc([0, 8.6, -0.2], [0, 0.6, -0.4], 2.4, 3.6, { bone: 'hips', mat: 'colFlesh', k: 1.0, n: 1.6, vn: 1.6 });
  sc.ell([0, 0.9, -0.3], [4.3, 1.1, 4.0], { bone: 'hips', mat: 'colFlesh', k: 1.0, n: 1.4 });
  // ------------------------------------------------------------ el alba, rasgada de la rodilla abajo
  const NF = 20;
  for (let i = 0; i < NF; i++) {
    const a = (i / NF) * Math.PI * 2 + rng.range(-0.07, 0.07);
    const back = Math.max(0, -Math.cos(a));
    const front = Math.max(0, Math.cos(a));
    const rTop = 2.05 + rng.range(-0.15, 0.15);
    const rBot = 3.4 + front * 0.4 + rng.range(-0.3, 0.3);
    const yb = rng.range(2.6, 4.6) - back * 1.4;
    const top = [Math.sin(a) * rTop, 9.0, Math.cos(a) * rTop * 0.85 - 0.2];
    const bot = [Math.sin(a) * rBot * (1 - back * 0.2), yb, Math.cos(a) * rBot - back * 1.3];
    const mid = [(top[0] + bot[0]) * 0.5 * 1.03, (top[1] + yb) * 0.5, (top[2] + bot[2]) * 0.5];
    sc.rc(top, mid, 0.58, 0.8 + rng.range(-0.1, 0.1), { bone: 'hips', mat: 'colAlb', k: 0.55, tint: [0.95, 0.92, 0.86] });
    sc.rc(mid, bot, 0.8, 0.75 + rng.range(-0.15, 0.2), { bone: back > 0.6 ? 'trainA' : 'hips', mat: 'colAlb', k: 0.55, tint: [0.86, 0.78, 0.72] });
    // jirones hasta el suelo
    const nStrip = rng.int(1, 2);
    for (let k = 0; k < nStrip; k++) {
      const aa = a + rng.range(-0.12, 0.12);
      const len = yb - rng.range(0.0, 1.4);
      const w = rng.range(0.5, 0.95);
      const r = rBot * (1 - back * 0.2) + 0.55;
      H.push({ bone: 'hips', mat: 'colAlb', ds: true, geo: hardGeo({ type: 'box', s: [w, len, 0.06], p: [Math.sin(aa) * r, yb - len / 2 + 0.1, Math.cos(aa) * r - back * 1.3], r: [rng.range(-4, 10), aa / DEG, rng.range(-6, 6)], taper: [0.35, 1], mat: 'colAlb', tint: [0.7, 0.52, 0.46] }) });
    }
  }
  sc.ell([0, 6.0, -0.2], [2.5, 4.0, 2.3], { bone: 'hips', mat: 'colAlb', k: 1.0, tint: [0.9, 0.86, 0.8] });
  // la carne revienta el alba
  for (const [x, y, z, r, rot] of [
    [3.0, 5.6, -1.4, [0.9, 1.3, 0.7], [0, 40, 10]],
    [-2.6, 6.6, 1.6, [0.8, 1.0, 0.6], [0, -50, -8]],
    [1.2, 6.8, -2.6, [0.7, 1.0, 0.6], [10, 0, 0]],
  ])
    sc.ell([x, y, z], r, { bone: 'hips', mat: 'colFlesh', k: 0.6, rot, n: 2.4, vn: 2 });

  // ------------------------------------------------------------ cuerpos fundidos: en la base y en la cola
  sc.ell([0, 0.9, -5.6], [3.5, 1.2, 3.4], { bone: 'trainA', mat: 'colFlesh', k: 1.4, n: 1.4 });
  sc.ell([0, 0.75, -8.8], [2.8, 1.0, 3.0], { bone: 'trainB', mat: 'colFlesh', k: 1.4, n: 1.4 });
  sc.ell([0.3, 0.6, -11.6], [2.0, 0.8, 2.4], { bone: 'trainC', mat: 'colFlesh', k: 1.2, n: 1.4 });
  sc.ell([0.6, 0.45, -13.8], [1.2, 0.55, 1.5], { bone: 'trainC', mat: 'colFlesh', k: 0.9, n: 1.4 });
  const bodies = [];
  const body = (x, y, z, yaw, s, bone, roll = 0) => {
    const dx = Math.sin(yaw),
      dz = Math.cos(yaw);
    sc.ell([x, y, z], [0.42 * s, 0.3 * s, 0.8 * s], { bone, mat: 'colSkin', k: 0.38, rot: [0, yaw / DEG, roll], tint: [0.95, 0.9, 0.84], n: 0.5 });
    sc.ell([x + dx * 0.98 * s, y + 0.12, z + dz * 0.98 * s], [0.26 * s, 0.3 * s, 0.29 * s], { bone, mat: 'colSkin', k: 0.2, tint: [0.98, 0.92, 0.86], n: 0.35 });
    sc.rc([x - dx * 0.5 * s, y, z - dz * 0.5 * s], [x - dx * 1.45 * s + dz * 0.2, y + 0.25, z - dz * 1.45 * s - dx * 0.2], 0.17 * s, 0.13 * s, { bone, mat: 'colSkin', k: 0.18, n: 0.3 });
    bodies.push({ x, y, z, yaw, s, bone });
  };
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    const z = -3.4 - t * 10.6 + rng.range(-0.4, 0.4);
    const w = 3.3 - t * 2.1;
    const bone = z > -6.6 ? 'trainA' : z > -10.3 ? 'trainB' : 'trainC';
    body(rng.range(-w, w), 1.45 - t * 0.7 + rng.range(-0.15, 0.2), z, rng.range(0, Math.PI * 2), rng.range(0.85, 1.15), bone, rng.range(-30, 30));
  }
  for (let i = 0; i < 22; i++) {
    const a = rng.range(-Math.PI * 0.8, Math.PI * 0.8);
    const r = 3.9 + Math.cos(a) * 0.3 + rng.range(-0.3, 0.3);
    body(Math.sin(a) * r, rng.range(0.5, 2.6), Math.cos(a) * r, a + Math.PI / 2 + rng.range(-0.6, 0.6), rng.range(0.85, 1.12), 'hips', rng.range(-70, 70));
  }

  // ------------------------------------------------------------ la casulla (carmesí, larga por detrás)
  const NC = 20;
  const hem = [];
  for (let i = 0; i < NC; i++) {
    const a = (i / NC) * Math.PI * 2;
    const sa = Math.sin(a),
      ca = Math.cos(a);
    const tornFront = Math.abs(a) < 0.5 || Math.abs(a - Math.PI * 2) < 0.5;
    const top = [sa * 3.0, 14.4 + 0.9 * Math.abs(sa), ca * 2.0 - 0.45];
    if (tornFront) top[1] = 11.0;
    // costados altos (el hueco de los brazos), delante a la rodilla, detrás como una capa
    const yb = (ca > 0 ? 6.6 : 4.4 - Math.max(0, -ca) * 0.8) + 2.6 * sa * sa + rng.range(-0.25, 0.25);
    const rb = 4.1 + Math.abs(sa) * 0.8;
    const zb = ca * (ca > 0 ? 3.7 : 3.9) - 0.4;
    const bot = [sa * rb, yb, zb];
    const mid = [(top[0] + bot[0]) * 0.5 * 1.04, (top[1] + bot[1]) * 0.5, (top[2] + bot[2]) * 0.5 + (ca > 0 ? 0.25 : -0.25)];
    sc.rc(top, mid, 0.56, 0.68, { bone: 'chest', mat: 'colRobe', k: 0.5 });
    sc.rc(mid, bot, 0.68, 0.62 + rng.range(-0.08, 0.12), { bone: 'spine', mat: 'colRobe', k: 0.5 });
    hem.push([sa * (rb + 0.55), yb - 0.15, ca * ((ca > 0 ? 3.7 : 3.9) + 0.55) - 0.4]);
  }
  for (let i = 0; i < NC; i++) sc.rc(hem[i], hem[(i + 1) % NC], 0.3, 0.3, { bone: 'spine', mat: 'colOrphrey', k: 0.18, n: 0.25, vn: 0 });
  for (let i = 0; i < NC; i++) {
    if (rng.chance(0.3)) continue;
    const p0 = hem[i];
    const len = rng.range(1.2, 3.0);
    const a2 = Math.atan2(p0[0], p0[2]);
    H.push({ bone: 'spine', mat: 'colRobe', ds: true, geo: hardGeo({ type: 'box', s: [rng.range(0.45, 0.85), len, 0.06], p: [p0[0] * 0.99, p0[1] - len / 2 + 0.05, p0[2] * 0.99], r: [rng.range(-6, 6), a2 / DEG, rng.range(-6, 6)], taper: [0.3, 1], mat: 'colRobe' }) });
  }
  // hombros, joroba y relleno
  sc.ell([0, 14.8, -0.9], [3.5, 2.0, 2.5], { bone: 'chest', mat: 'colRobe', k: 1.0, rot: [-18, 0, 0] });
  sc.ell([0, 15.9, -1.5], [2.3, 1.6, 1.9], { bone: 'chest', mat: 'colRobe', k: 0.9 });
  sc.ell([0, 10.8, -0.6], [3.0, 3.6, 2.6], { bone: 'spine', mat: 'colRobe', k: 1.0 });
  // la cruz en Y de la espalda (camino para trepar)
  for (const s of [1, -1]) sc.rc([s * 2.5, 16.3, -1.3], [s * 0.1, 13.7, -3.25], 0.38, 0.4, { bone: 'chest', mat: 'colOrphrey', k: 0.2, n: 0.25, vn: 0 });
  sc.tube(
    [
      [0, 13.7, -3.28],
      [0, 11.4, -3.75],
      [0, 8.8, -4.25],
      [0, 6.0, -4.65],
      [0, 4.2, -4.85],
    ],
    [0.42, 0.42, 0.42, 0.4, 0.36],
    { bones: ['chest', 'spine', 'spine', 'spine', 'spine'], mat: 'colOrphrey', k: 0.2, n: 0.25, vn: 0 }
  );
  sc.tube(
    [
      [0, 10.9, 3.15],
      [0, 8.8, 3.75],
      [0, 6.9, 4.05],
    ],
    [0.38, 0.4, 0.36],
    { bones: ['spine', 'spine', 'spine'], mat: 'colOrphrey', k: 0.2, n: 0.25, vn: 0 }
  );

  // ------------------------------------------------------------ el pecho abierto
  sc.ell([0, 13.0, 1.0], [2.3, 2.3, 1.8], { bone: 'chest', mat: 'colFlesh', k: 0.9 });
  sc.ell([0, 13.1, 2.3], [1.3, 1.6, 0.95], { sub: true, k: 0.5 });
  for (const s of [1, -1]) sc.ell([s * 2.1, 12.4, 2.0], [0.7, 1.9, 0.5], { bone: 'chest', mat: 'colRobe', k: 0.4, rot: [10, s * 25, s * 12] });

  // ------------------------------------------------------------ cuello y cabeza
  sc.rc([0, 15.0, 0.8], [0, 16.2, 2.8], 1.0, 0.6, { bone: 'neck', mat: 'colSkin', k: 0.7 });
  for (const s of [1, -1]) sc.rc([s * 0.45, 15.6, 0.4], [s * 0.3, 16.4, 2.6], 0.32, 0.22, { bone: 'neck', mat: 'colSkin', k: 0.3, tint: [0.9, 0.85, 0.8] });
  sc.ell([0, 16.95, 3.35], [0.95, 1.2, 1.15], { bone: 'head', mat: 'colSkin', k: 0.45, tint: [0.92, 0.9, 0.86] });
  sc.ell([0, 16.35, 4.15], [0.68, 0.64, 0.68], { bone: 'head', mat: 'colSkin', k: 0.4 });
  for (const s of [1, -1]) {
    sc.ell([s * 0.56, 16.7, 4.1], [0.31, 0.26, 0.33], { bone: 'head', mat: 'colSkin', k: 0.2 });
    sc.ell([s * 0.31, 16.98, 4.5], [0.24, 0.22, 0.23], { sub: true, k: 0.12 });
  }
  sc.ell([0, 16.45, 4.8], [0.12, 0.17, 0.2], { sub: true, k: 0.08 });
  sc.ell([0, 15.8, 3.95], [0.62, 0.3, 0.68], { bone: 'jaw', mat: 'colSkin', k: 0.3, rot: [18, 0, 0] });
  sc.ell([0, 16.0, 4.44], [0.42, 0.27, 0.33], { sub: true, k: 0.12 });

  // ------------------------------------------------------------ brazos de huesos y piel
  mir((s, S) => {
    const sh = M.restWorld['arm' + S],
      el = M.restWorld['fore' + S],
      wr = M.restWorld['hand' + S];
    sc.ell([sh.x * 0.95, sh.y - 0.15, sh.z], [1.25, 1.2, 1.3], { bone: 'arm' + S, mat: 'colRobe', k: 0.6 });
    sc.rc(sh.toArray(), el.toArray(), 0.86, 0.52, { bone: 'arm' + S, mat: 'colSkin', k: 0.4 });
    sc.ell([sh.x * 1.02 + (el.x - sh.x) * 0.3, sh.y - 1.5, sh.z + 0.3], [0.6, 1.25, 0.6], { bone: 'arm' + S, mat: 'colSkin', k: 0.35, rot: [0, 0, s * 22] });
    sc.ell([sh.x + s * 0.25 + (el.x - sh.x) * 0.22, sh.y - 1.2, sh.z - 0.1], [1.0, 1.25, 0.95], { bone: 'arm' + S, mat: 'colAlb', k: 0.45, rot: [0, 0, s * 20], tint: [0.88, 0.82, 0.76] });
    sc.ell(el.toArray(), [0.48, 0.48, 0.48], { bone: 'fore' + S, mat: 'colBone', k: 0.25 });
    sc.rc(el.toArray(), [el.x + s * 0.1, el.y + 0.25, el.z - 1.0], 0.3, 0.05, { bone: 'fore' + S, mat: 'colBone', k: 0.12 });
    sc.rc([el.x + s * 0.18, el.y - 0.1, el.z], [wr.x + s * 0.18, wr.y, wr.z - 0.05], 0.3, 0.2, { bone: 'fore' + S, mat: 'colSkin', k: 0.22 });
    sc.rc([el.x - s * 0.2, el.y - 0.25, el.z + 0.2], [wr.x - s * 0.15, wr.y + 0.05, wr.z + 0.1], 0.26, 0.18, { bone: 'fore' + S, mat: 'colSkin', k: 0.22, tint: [0.9, 0.86, 0.8] });
    sc.ell(wr.toArray(), [0.36, 0.32, 0.36], { bone: 'hand' + S, mat: 'colBone', k: 0.22 });
    // jirones de la manga
    for (let i = 0; i < 6; i++) {
      const c = sh.clone().lerp(el, 0.25 + i * 0.1);
      const len = rng.range(1.4, 3.2);
      const ang = rng.range(0, Math.PI * 2);
      H.push({ bone: 'arm' + S, mat: 'colAlb', ds: true, geo: hardGeo({ type: 'box', s: [rng.range(0.35, 0.6), len, 0.05], p: [c.x + Math.cos(ang) * 0.75, c.y - len / 2 - 0.6, c.z + Math.sin(ang) * 0.75], r: [rng.range(-8, 8), -ang / DEG + 90, s * rng.range(4, 14)], taper: [0.35, 1], mat: 'colAlb', tint: [0.8, 0.66, 0.6] }) });
    }
  });
  // palmas
  const pL = M.restWorld.handL,
    pR = M.restWorld.handR;
  sc.ell([pL.x - 0.05, pL.y - 0.6, pL.z + 0.45], [0.55, 0.75, 0.38], { bone: 'handL', mat: 'colSkin', k: 0.3, rot: [-38, 0, 8] });
  sc.ell([pR.x + 0.05, pR.y - 0.65, pR.z + 0.35], [0.6, 0.66, 0.52], { bone: 'handR', mat: 'colSkin', k: 0.3, rot: [-20, 0, -6] });

  // ------------------------------------------------------------ pies
  mir((s, S) => {
    const f = M.restWorld['foot' + S];
    sc.ell([f.x, 0.6, f.z + 0.4], [0.8, 0.56, 1.38], { bone: 'foot' + S, mat: 'colSkin', k: 0.4, tint: [0.86, 0.8, 0.74] });
    for (let i = 0; i < 5; i++) {
      const x = f.x + (i - 2) * 0.28 * s + s * 0.05;
      const len = [1.05, 0.95, 0.9, 0.8, 0.65][i];
      sc.rc([x, 0.34, f.z + 1.25], [x + (i - 2) * 0.07 * s, 0.17, f.z + 1.25 + len], 0.21 - i * 0.012, 0.13, { bone: 'foot' + S, mat: 'colSkin', k: 0.12, n: 0.3 });
    }
  });

  const geo = sc.build();
  M.skinned(geo, sc.mats);
  M.sculptStats = sc.stats;

  // ======================================================================= piezas duras
  // dedos de la mano izquierda (abierta, tendida hacia delante: garras)
  for (let i = 0; i < 4; i++) {
    const x = pL.x - 0.6 + i * 0.36;
    const len = [2.6, 3.1, 3.0, 2.4][i];
    const a0 = [x, pL.y - 1.0, pL.z + 0.8];
    const k1 = [x + 0.05, a0[1] - 0.6, a0[2] + len * 0.42];
    const k2 = [x + 0.03, a0[1] - 1.45, a0[2] + len * 0.62];
    const tip = [x - 0.04, a0[1] - 2.2, a0[2] + len * 0.7];
    tube('handL', 'colSkin', [a0, k1, k2, tip], [0.21, 0.18, 0.14, 0.08], { radial: 6, perM: 3 });
    for (const kk of [k1, k2]) H.push({ bone: 'handL', mat: 'colSkin', geo: hardGeo({ type: 'sphere', s: [0.21], seg: 6, seg2: 4, p: kk, mat: 'colSkin' }) });
    H.push({ bone: 'handL', mat: 'colBone', geo: hardGeo({ type: 'cone', s: [0.1, 0.48], p: [tip[0], tip[1] - 0.18, tip[2] + 0.03], r: [170, 0, 0], mat: 'colBone' }) });
  }
  tube('handL', 'colSkin', [[pL.x + 0.4, pL.y - 0.4, pL.z + 0.4], [pL.x + 0.85, pL.y - 0.95, pL.z + 1.0], [pL.x + 0.95, pL.y - 1.5, pL.z + 1.6]], [0.23, 0.17, 0.1], { radial: 6 });
  // la derecha, cerrada sobre la cadena
  for (let i = 0; i < 4; i++) {
    const x = pR.x + 0.55 - i * 0.3;
    const y = pR.y - 0.9;
    tube('handR', 'colSkin', [[x, y, pR.z + 0.7], [x, y - 0.5, pR.z + 1.2], [x - 0.05, y - 0.9, pR.z + 0.85], [x - 0.05, y - 0.65, pR.z + 0.35]], [0.22, 0.2, 0.17, 0.14], { radial: 6, perM: 4 });
  }
  // púas del espinazo que rompen la casulla en la joroba
  for (let i = 0; i < 6; i++) {
    const y = 16.6 - i * 0.78,
      z = -1.75 - i * 0.34;
    const L2 = 1.6 - i * 0.16;
    H.push({ bone: 'chest', mat: 'colBone', geo: hardGeo({ type: 'cone', s: [0.3 - i * 0.02, L2], seg: 6, p: [0, y + L2 * 0.25, z - L2 * 0.4], r: [-62 - i * 4, 0, 0], mat: 'colBone' }) });
  }
  // costillas abiertas como puertas y el esternón
  for (let i = 0; i < 5; i++) {
    const y = 14.1 - i * 0.55;
    for (const s of [1, -1])
      tube(
        'chest',
        'colBone',
        [
          [s * 0.25, y, 2.55],
          [s * 0.9, y + 0.1, 3.05],
          [s * 1.55, y - 0.05, 2.95],
          [s * 2.0, y - 0.25, 2.25],
        ],
        [0.14, 0.13, 0.11, 0.08],
        { radial: 5, perM: 3 }
      );
  }
  tube('chest', 'colBone', [[0, 14.4, 2.3], [0, 13.2, 2.45], [0, 11.9, 2.2]], [0.16, 0.15, 0.13], { radial: 5 });
  // el núcleo ardiente
  H.push({ bone: 'chest', mat: 'redGlow', geo: hardGeo({ type: 'sphere', s: [0.8], seg: 10, seg2: 7, p: [0, 13.05, 1.85], mat: 'redGlow', ao: false }) });
  H.push({ bone: 'chest', mat: 'ember', geo: hardGeo({ type: 'ico', s: [1.05, 1.2, 0.8], detail: 1, p: [0, 13.0, 1.5], mat: 'ember', ao: false }) });
  // jaula de hierro con púas sobre la cara
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.25;
    const z0 = 4.6 - Math.abs(x) * 0.55;
    tube('head', 'iron', [[x * 1.4, 17.98, 3.6], [x * 1.15, 17.58, z0 + 0.15], [x, 16.7, z0 + 0.32], [x * 0.9, 15.8, z0]], [0.07, 0.07, 0.07, 0.07], { radial: 4, perM: 3 });
  }
  for (const [y, r] of [
    [17.58, 1.15],
    [16.7, 1.21],
    [15.95, 0.99],
  ])
    H.push({ bone: 'head', mat: 'iron', geo: torusArc(r, 0.075, [0, y, 3.5], -70, 140) });
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.33;
    H.push({ bone: 'head', mat: 'iron', geo: hardGeo({ type: 'cone', s: [0.08, 0.7], seg: 4, p: [x * 1.3, 18.25, 3.75 - Math.abs(x) * 0.2], r: [20, 0, -x * 30], mat: 'iron' }) });
  }
  // la mitra partida, clavada en dos cuernos de hueso, y sus ínfulas
  const mitre = new THREE.Shape();
  mitre.moveTo(-0.75, 0);
  mitre.lineTo(0.75, 0);
  mitre.lineTo(0.68, 1.5);
  mitre.quadraticCurveTo(0.45, 2.3, 0, 2.75);
  mitre.quadraticCurveTo(-0.45, 2.3, -0.68, 1.5);
  mitre.lineTo(-0.75, 0);
  for (const s2 of [1, -1]) {
    tube('head', 'colBone', [[s2 * 0.35, 17.75, 3.15], [s2 * 0.7, 18.7, 2.95], [s2 * 1.1, 19.7, 2.7], [s2 * 1.35, 20.6, 2.3]], [0.4, 0.28, 0.16, 0.04], { radial: 7, perM: 2.5 });
    const base = [s2 * 0.95, 18.0, 3.05];
    const rot = [8, s2 * -10, s2 * -24];
    H.push({ bone: 'head', mat: 'clothWhite', ds: true, geo: hardGeo({ type: 'shape', shape: mitre, s: [1, 1, 0.1], p: base, r: rot, mat: 'clothWhite' }) });
    const m4 = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rot[0] * DEG, rot[1] * DEG, rot[2] * DEG));
    const off = (x, y, z) => V(x, y, z).applyMatrix4(m4).add(V(...base)).toArray();
    H.push({ bone: 'head', mat: 'colOrphrey', geo: hardGeo({ type: 'box', s: [0.26, 2.35, 0.12], p: off(0, 1.2, 0.04), r: rot, mat: 'colOrphrey' }) });
    H.push({ bone: 'head', mat: 'colOrphrey', geo: hardGeo({ type: 'box', s: [1.4, 0.24, 0.12], p: off(0, 0.25, 0.04), r: rot, mat: 'colOrphrey' }) });
    H.push({ bone: 'head', mat: 'colOrphrey', geo: hardGeo({ type: 'box', s: [0.8, 0.2, 0.13], p: off(0, 1.6, 0.05), r: rot, mat: 'colOrphrey' }) });
    H.push({ bone: 'neck', mat: 'colOrphrey', ds: true, geo: hardGeo({ type: 'box', s: [0.42, 2.6, 0.05], p: [s2 * 0.42, 16.0, 2.0], r: [-38, s2 * 8, s2 * 6], taper: [0.8, 1], mat: 'colOrphrey' }) });
  }
  // la aureola de hierro con sus cirios y rayos
  const halo = { c: V(0, 18.9, 1.95), R: 3.45, tilt: -14 };
  const hq = new THREE.Quaternion().setFromEuler(new THREE.Euler(halo.tilt * DEG, 0, 0));
  const hax = V(0, 0, 1).applyQuaternion(hq);
  const onHalo = (a, rr = halo.R) => V(Math.cos(a) * rr, Math.sin(a) * rr, 0).applyQuaternion(hq).add(halo.c);
  H.push({ bone: 'head', mat: 'iron', geo: torusAround(halo.R, 0.14, halo.c, hax, 30) });
  H.push({ bone: 'head', mat: 'iron', geo: torusAround(halo.R * 0.82, 0.08, halo.c, hax, 26) });
  for (const a of [-0.4, Math.PI + 0.4, -Math.PI / 2]) tube('head', 'iron', [halo.c.toArray(), onHalo(a).toArray()], [0.09, 0.09], { radial: 4 });
  const candleTops = [];
  for (let i = 0; i < 11; i++) {
    const a = (Math.PI * 1.16 * (i + 0.5)) / 11 - Math.PI * 0.08;
    const b = onHalo(a);
    const h = 1.9 + Math.sin(i * 2.7) * 0.45 + (i === 5 ? 1.1 : 0) + rng.range(0, 0.4);
    const r = 0.3 + rng.range(-0.03, 0.05);
    H.push({ bone: 'head', mat: 'iron', geo: hardGeo({ type: 'cyl', s: [0.46, 0.36, 0.12], seg: 8, p: [b.x, b.y + 0.04, b.z], mat: 'iron' }) });
    H.push({ bone: 'head', mat: 'candle', geo: hardGeo({ type: 'cyl', s: [r * 0.92, r, h], seg: 8, p: [b.x, b.y + h / 2 + 0.1, b.z], mat: 'candle', ao: false }) });
    for (let k = 0; k < 3; k++) {
      const aa = rng.range(0, Math.PI * 2);
      H.push({ bone: 'head', mat: 'candle', geo: hardGeo({ type: 'box', s: [0.09, rng.range(0.3, 0.9), 0.07], p: [b.x + Math.cos(aa) * r, b.y + h * rng.range(0.4, 0.8), b.z + Math.sin(aa) * r], r: [0, -aa / DEG, 0], mat: 'candle' }) });
    }
    candleTops.push(V(b.x, b.y + h + 0.12, b.z));
    const ra = a + Math.PI / 22;
    tube('head', 'iron', [onHalo(ra, halo.R + 0.05).toArray(), onHalo(ra, halo.R + 1.3 + (i % 2) * 0.6).toArray()], [0.11, 0.01], { radial: 4, cap: false });
  }
  // brazos de los fieles que se alzan de la cola y de la base
  for (const b of bodies) {
    if (!rng.chance(0.5)) continue;
    const sx = rng.sign();
    const base = [b.x + Math.cos(b.yaw) * 0.38 * sx, b.y + 0.15, b.z - Math.sin(b.yaw) * 0.38 * sx];
    const up = rng.range(1.0, 2.1);
    const lean = rng.range(-0.6, 0.6);
    tube(b.bone, 'colSkin', [base, [base[0] + lean * 0.4, base[1] + up * 0.55, base[2] + 0.15], [base[0] + lean, base[1] + up, base[2] + rng.range(-0.3, 0.4)]], [0.13, 0.11, 0.08], { radial: 5, perM: 3 });
  }
  M.rigid(H);

  // ------------------------------------------------------------ la campana (grupo aparte) y su cadena
  const bell = buildBell();
  M.root.add(bell);
  const chain = new THREE.Mesh(new THREE.BufferGeometry(), colMat('iron'));
  chain.frustumCulled = false;
  M.root.add(chain);
  const fx = new ColFX(M);
  const bellFx = new THREE.Group();
  bell.add(bellFx);
  // la mano derecha cerrada: el punto de la cadena (en el espacio del hueso)
  const gripLocal = V(0.1, -1.25, 0.6);
  const api = {
    // coloca la campana: top (corona) y axis (de la boca a la corona) en el
    // espacio del modelo; la cadena se tiende desde la mano derecha
    setBell(top, axis, sag = 1.2) {
      top = top.isVector3 ? top : V(...top);
      M.root.updateMatrixWorld(true);
      const hand = M.byName.handR.localToWorld(gripLocal.clone());
      M.root.worldToLocal(hand);
      // sin eje: la cadena tensa (la campana se alinea con ella)
      axis = !axis ? hand.clone().sub(top) : axis.isVector3 ? axis : V(...axis);
      bell.position.copy(top);
      bell.quaternion.setFromUnitVectors(V(0, 1, 0), axis.clone().normalize());
      const mid = hand.clone().lerp(top, 0.5);
      mid.y -= sag;
      chain.geometry.dispose();
      chain.geometry = chainGeo([hand, mid, top], 0.42, 0.1);
    },
    pose(name) {
      const P = TUR_POSES[name];
      M.pose(P.pose);
      this.setBell(P.bell.top, P.bell.axis, P.bell.sag ?? 1.2);
    },
  };
  api.pose('idle');

  // ------------------------------------------------------------ fuegos
  for (const c of candleTops) fx.flame('head', c.toArray(), [0.85, 1.6]);
  fx.glow('chest', [0, 13.05, 2.3], 4.4, 0xff5a1c, { pulse: 0.2 });
  fx.flame('chest', [0.15, 12.6, 2.2], [1.1, 1.9]);
  fx.flame('chest', [-0.3, 12.8, 2.0], [0.9, 1.5]);
  fx.light('chest', [0, 13.1, 3.4], 0xff6a2a, 60, 16);
  for (const s of [1, -1]) fx.glow('head', [s * 0.31, 16.98, 4.55], 0.8, 0xffb060, { pulse: 0.08 });
  // la campana: ascuas por la boca, llamas por los agujeros (sprites hijos de la campana)
  const addBellSprite = (p, s, glow) => {
    const sp = glow ? fx.glow('root', [0, 0, 0], s, 0xff6020, { pulse: 0.25 }) : fx.flame('root', [0, 0, 0], s);
    sp.parent.remove(sp);
    sp.position.set(...p);
    bellFx.add(sp);
  };
  addBellSprite([0, -BELL_H - 0.3, 0], 6.0, true);
  addBellSprite([0, -BELL_H + 0.1, 0], [2.6, 3.6]);
  addBellSprite([1.2, -BELL_H * 0.55, 0.6], [1.0, 1.6]);
  addBellSprite([-1.0, -BELL_H * 0.45, -0.7], [0.9, 1.4]);
  const bl = new THREE.PointLight(0xff7a30, 90, 22, 1.6);
  bl.position.set(0, -BELL_H - 1.2, 0);
  bellFx.add(bl);
  fx.lights.push({ l: bl, base: 90, ph: 1.3 });
  return { model: M, fx, api, info: { name: 'El Turiferario (coloso)', height: 21, halo: 26 } };
}

// Poses para las capturas (grados por hueso) y dónde va la campana.
export const TUR_POSES = {
  idle: { pose: {}, bell: { top: [-9.8, 6.1, 4.6], axis: [0.1, 1, 0.04], sag: 1.6 } },
  // se inclina hacia ti, tiende la garra izquierda y alza la campana para el mazazo
  menace: {
    pose: {
      spine: [8, 0, 0],
      chest: [10, -8, 0],
      neck: [6, 0, 0],
      head: [-14, 0, 0],
      jaw: [12, 0, 0],
      armL: [-48, 0, 12],
      foreL: [-30, 0, 0],
      handL: [-10, 0, 0],
      armR: [-30, 0, -78],
      foreR: [0, 0, -30],
    },
    bell: { top: [-17.5, 10.0, 7.0], axis: null, sag: 0.25 },
  },
};
