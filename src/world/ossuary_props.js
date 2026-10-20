// Piezas de los osarios: calaveras, yelmos, los emblemas de la guardia, el
// arca, escudos y armas. Cada modelo es una lista de piezas { geo, mat, m,
// tint } en su marco (+y arriba, la cara hacia +z), que sirve igual para
// hornearla en el mundo (bakeParts) que para montarla en mallas que se
// mueven (meshParts, game/ossuaries.js).
import * as THREE from 'three';
import { RNG } from '../core/util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const M4 = () => new THREE.Matrix4();
const Q = (x = 0, y = 0, z = 0, o = 'XYZ') => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, o));
const TRS = (x, y, z, q = Q(), sx = 1, sy = sx, sz = sx) => M4().compose(V(x, y, z), q, V(sx, sy, sz));
const part = (geo, mat, m = M4(), tint = null) => ({ geo, mat, m, tint });
// todas las piezas de un modelo, llevadas a otro marco
export const moveParts = (parts, m) => parts.map((p) => ({ ...p, m: m.clone().multiply(p.m) }));

// cache de geometrías (las mismas calaveras se repiten cientos de veces)
const GC = new Map();
const geo = (key, fn) => {
  if (!GC.has(key)) GC.set(key, fn());
  return GC.get(key);
};
// vuelve una geometría del revés (las caras, hacia dentro: el interior de
// un cubo, de una malla)
function flip(g) {
  const a = g.index.array;
  for (let i = 0; i < a.length; i += 3) {
    const t = a[i + 1];
    a[i + 1] = a[i + 2];
    a[i + 2] = t;
  }
  const n = g.attributes.normal.array;
  for (let i = 0; i < n.length; i++) n[i] = -n[i];
  return g;
}

export function bakeParts(wb, parts, m, o = {}) {
  for (const p of parts) wb.geometry(p.mat, p.geo, m ? m.clone().multiply(p.m) : p.m, { ao: false, room: o.room, tint: p.tint ?? o.tint ?? null, grime: p.mat !== 'black' && o.grime !== false });
}

export function meshParts(parts, mat) {
  const g = new THREE.Group();
  for (const p of parts) {
    const mesh = new THREE.Mesh(p.geo, mat(p.mat, p.tint));
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(p.m);
    g.add(mesh);
  }
  return g;
}

// un hueso largo de a a b (caña y cabezas)
export function boneParts(a, b, r, mat = 'bone') {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const out = [part(geo('boneShaft', () => new THREE.CylinderGeometry(0.8, 1, 1, 6)), mat, M4().compose(mid, q, V(r, len, r)))];
  const knob = geo('boneKnob', () => new THREE.SphereGeometry(1, 6, 4));
  for (const [p, s] of [
    [a, -1],
    [b, 1],
  ]) {
    // dos cóndilos en cada cabeza
    const side = V(1, 0, 0).applyQuaternion(q).multiplyScalar(r * 0.7);
    for (const k of [-1, 1]) out.push(part(knob, mat, M4().compose(p.clone().add(side.clone().multiplyScalar(k)).add(d.clone().normalize().multiplyScalar(s * r * 0.2)), q, V(r * 1.05, r * 1.15, r * 1.05))));
  }
  return out;
}

// ----------------------------------------------------------------- calavera
// Origen en el centro del cráneo; la cara hacia +z. o.jaw: con la mandíbula;
// o.open: lo que se le abre (0..1); o.tint: el tono del hueso.
export function skullParts(o = {}) {
  const t = o.tint ?? null;
  const P = [];
  const sph = geo('skSph', () => new THREE.SphereGeometry(1, 9, 7));
  const sph5 = geo('skSph5', () => new THREE.SphereGeometry(1, 6, 5));
  const blk = geo('skBox', () => new THREE.BoxGeometry(1, 1, 1));
  // el cráneo (más ancho atrás) y la frente
  P.push(part(sph, 'bone', TRS(0, 0.014, -0.016, Q(), 0.068, 0.07, 0.083), t));
  P.push(part(sph, 'bone', TRS(0, 0.0, 0.032, Q(0.25, 0, 0), 0.058, 0.05, 0.05), t));
  // la cara: el arco de las cejas, los pómulos y el maxilar
  P.push(part(blk, 'bone', TRS(0, 0.006, 0.064, Q(-0.1, 0, 0), 0.084, 0.016, 0.026), t));
  for (const s of [-1, 1]) {
    P.push(part(sph5, 'bone', TRS(s * 0.043, -0.03, 0.05, Q(), 0.02, 0.017, 0.026), t));
    P.push(part(blk, 'bone', TRS(s * 0.048, -0.024, 0.02, Q(0, s * 0.2, 0), 0.01, 0.014, 0.05), t));
  }
  P.push(part(blk, 'bone', TRS(0, -0.036, 0.052, Q(-0.16, 0, 0), 0.06, 0.044, 0.044), t));
  // las cuencas (redondas, hondas), la nariz y los dientes de arriba
  for (const s of [-1, 1]) P.push(part(sph5, 'black', TRS(s * 0.0235, -0.012, 0.066, Q(0, 0, s * 0.25), 0.0185, 0.017, 0.012)));
  P.push(part(geo('skNose', () => new THREE.ConeGeometry(1, 1, 3)), 'black', TRS(0, -0.036, 0.0735, Q(Math.PI, 0, 0), 0.009, 0.02, 0.004)));
  P.push(part(blk, 'bone', TRS(0, -0.058, 0.064, Q(), 0.044, 0.014, 0.02), t ? t.map((c) => Math.min(1, c * 1.1)) : [1.08, 1.06, 1.0]));
  for (const x of [-0.011, 0, 0.011]) P.push(part(blk, 'black', TRS(x, -0.058, 0.0745, Q(), 0.0022, 0.012, 0.002)));
  if (o.jaw !== false) {
    const a = (o.open ?? 0.1) * 0.5;
    const jm = TRS(0, -0.062, 0.0, Q(a, 0, 0));
    P.push(part(blk, 'bone', jm.clone().multiply(TRS(0, -0.018, 0.05, Q(), 0.054, 0.02, 0.036)), t));
    P.push(part(blk, 'bone', jm.clone().multiply(TRS(0, -0.004, 0.061, Q(), 0.04, 0.012, 0.016)), t ? t.map((c) => Math.min(1, c * 1.1)) : [1.08, 1.06, 1.0]));
    for (const x of [-0.01, 0.01]) P.push(part(blk, 'black', jm.clone().multiply(TRS(x, -0.004, 0.0695, Q(), 0.0022, 0.011, 0.002))));
    for (const s of [-1, 1]) {
      P.push(part(blk, 'bone', jm.clone().multiply(TRS(s * 0.033, -0.016, 0.03, Q(0, s * 0.35, 0), 0.012, 0.018, 0.05)), t));
      P.push(part(blk, 'bone', jm.clone().multiply(TRS(s * 0.043, 0.006, 0.008, Q(0.25, 0, 0), 0.011, 0.048, 0.018)), t));
    }
  }
  return P;
}

// ------------------------------------------------------------------- yelmos
// Origen en el centro de la cabeza (el de la calavera); la cara hacia +z.
// kind: 'kettle' (capacete de ala ancha, el de los ballesteros), 'bascinet'
// (bacinete apuntado con su almófar de malla), 'nasal' (cónico con
// nasal), 'cap' (cervillera, el casquete del que va a por agua).
const latheShell = (pts, seg = 12) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const inner = (pts, k = 0.93) =>
  pts
    .slice()
    .reverse()
    .map(([x, y]) => [x * k, y - 0.004]);
const HELMET_PROFILE = {
  kettle: [
    [0.17, -0.052],
    [0.172, -0.044],
    [0.128, -0.02],
    [0.104, -0.012],
    [0.104, 0.03],
    [0.094, 0.07],
    [0.07, 0.1],
    [0.035, 0.118],
    [0.0, 0.122],
  ],
  bascinet: [
    [0.106, -0.012],
    [0.104, 0.02],
    [0.092, 0.07],
    [0.066, 0.115],
    [0.03, 0.15],
    [0.0, 0.17],
  ],
  nasal: [
    [0.1, -0.03],
    [0.106, -0.02],
    [0.104, 0.01],
    [0.09, 0.055],
    [0.06, 0.105],
    [0.025, 0.15],
    [0.0, 0.172],
  ],
  cap: [
    [0.1, -0.012],
    [0.104, 0.0],
    [0.1, 0.035],
    [0.084, 0.072],
    [0.055, 0.098],
    [0.0, 0.11],
  ],
};
export function helmetParts(kind, o = {}) {
  const pr = HELMET_PROFILE[kind] || HELMET_PROFILE.cap;
  const mat = o.mat ?? 'plateRust';
  const P = [];
  P.push(part(geo('helm:' + kind, () => latheShell(pr, 14)), mat));
  P.push(part(geo('helmIn:' + kind, () => latheShell(inner(pr), 14)), 'black'));
  const blk = geo('hBox', () => new THREE.BoxGeometry(1, 1, 1));
  const rivet = geo('hRivet', () => new THREE.SphereGeometry(1, 4, 3));
  if (kind === 'kettle') {
    // la cresta de delante a atrás y el ribete del ala
    P.push(part(blk, mat, TRS(0, 0.1, 0, Q(), 0.012, 0.03, 0.17)));
    P.push(part(geo('hRim', () => new THREE.TorusGeometry(1, 0.03, 3, 18)), 'iron', TRS(0, -0.05, 0, Q(Math.PI / 2, 0, 0), 0.171, 0.171, 0.171)));
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      P.push(part(rivet, 'iron', TRS(Math.cos(a) * 0.106, 0.0, Math.sin(a) * 0.106, Q(), 0.007)));
    }
  } else if (kind === 'bascinet') {
    // las carrilleras y el cogote: bajan por los lados y por detrás, la cara
    // queda al aire
    const low = [
      [0.104, -0.1],
      [0.107, -0.04],
      [0.106, -0.006],
    ];
    P.push(part(geo('helmLow', () => new THREE.LatheGeometry(low.map(([x, y]) => new THREE.Vector2(x, y)), 12, Math.PI * 0.27, Math.PI * 1.46)), mat));
    P.push(part(geo('helmLowIn', () => new THREE.LatheGeometry(inner(low).map(([x, y]) => new THREE.Vector2(x, y)), 12, Math.PI * 0.27, Math.PI * 1.46)), 'black'));
    // el almófar: malla colgada del borde, abierta por la cara
    P.push(part(geo('hAvent', () => new THREE.CylinderGeometry(0.106, 0.132, 0.09, 14, 1, true, Math.PI * 0.3, Math.PI * 1.4)), o.mail ?? 'mailRust', TRS(0, -0.145, 0)));
    P.push(part(geo('hAventIn', () => flip(new THREE.CylinderGeometry(0.1, 0.126, 0.09, 14, 1, true, Math.PI * 0.3, Math.PI * 1.4))), o.mail ?? 'mailRust', TRS(0, -0.145, 0), [0.35, 0.3, 0.28]));
    for (let k = 0; k < 9; k++) {
      const a = Math.PI * 0.4 + (k / 8) * Math.PI * 1.2;
      P.push(part(rivet, 'bronze', TRS(Math.sin(a) * 0.106, -0.085, Math.cos(a) * 0.106, Q(), 0.008)));
    }
  } else if (kind === 'nasal') {
    P.push(part(geo('hBand', () => new THREE.CylinderGeometry(0.108, 0.108, 0.03, 14, 1, true)), 'iron', TRS(0, -0.016, 0)));
    // el nasal, de la banda a la punta de la nariz
    P.push(part(blk, 'iron', TRS(0, -0.06, 0.104, Q(-0.08, 0, 0), 0.024, 0.09, 0.012)));
    P.push(part(blk, mat, TRS(0, 0.07, 0.07, Q(-0.9, 0, 0), 0.01, 0.07, 0.016)));
  } else {
    P.push(part(geo('hBandC', () => new THREE.CylinderGeometry(0.106, 0.106, 0.022, 14, 1, true)), 'iron', TRS(0, -0.004, 0)));
    P.push(part(rivet, 'iron', TRS(0, 0.11, 0, Q(), 0.012)));
  }
  // el barboquejo (correa de cuero), suelto
  if (o.strap)
    for (const s of [-1, 1]) P.push(part(blk, 'leather', TRS(s * 0.1, kind === 'kettle' ? -0.06 : -0.07, 0.01, Q(0, 0, s * 0.12), 0.012, 0.07, 0.018)));
  return P;
}

// Calavera con su yelmo (un hermano de la guarnición, en su fila)
export function helmetedSkullParts(kind, o = {}) {
  const P = skullParts({ jaw: o.jaw, open: o.open, tint: o.tint });
  // (un poco menor que colgado: la calavera es más chica que la cabeza con
  // su forro; la banda, sobre las cejas)
  const lift = kind === 'kettle' ? 0.03 : kind === 'cap' ? 0.03 : 0.022;
  return P.concat(moveParts(helmetParts(kind, { strap: false, mail: o.mail }), TRS(0, lift, -0.006, Q(o.tilt ?? 0, 0, o.roll ?? 0), 0.86)));
}

// ------------------------------------------------------------------ cadena
// eslabones de a a b
export function chainParts(a, b, link = 0.05) {
  const d = new THREE.Vector3().subVectors(b, a);
  const n = Math.max(1, Math.round(d.length() / link));
  const g = geo('link', () => new THREE.TorusGeometry(0.018, 0.0055, 3, 6));
  const q0 = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
  const P = [];
  for (let k = 0; k < n; k++) {
    const p = a.clone().add(d.clone().multiplyScalar((k + 0.5) / n));
    const q = q0.clone().multiply(Q(0, k % 2 ? Math.PI / 2 : 0, 0));
    P.push(part(g, 'iron', M4().compose(p, q, V(1, 1.5, 1))));
  }
  return P;
}

// -------------------------------------------------------- los de la guardia
// La llave del portero: grande, de hierro, tendida (a lo largo de x).
export function keyParts() {
  const blk = geo('kBox', () => new THREE.BoxGeometry(1, 1, 1));
  return [
    part(geo('kBow', () => new THREE.TorusGeometry(0.055, 0.013, 4, 10)), 'iron', TRS(-0.2, 0.013, 0, Q(Math.PI / 2, 0, 0))),
    part(geo('kBowIn', () => new THREE.TorusGeometry(0.03, 0.008, 3, 8)), 'iron', TRS(-0.2, 0.013, 0, Q(Math.PI / 2, 0, 0))),
    part(geo('kShank', () => new THREE.CylinderGeometry(0.012, 0.012, 1, 6)), 'iron', TRS(0.03, 0.013, 0, Q(0, 0, Math.PI / 2), 1, 0.36, 1)),
    part(blk, 'iron', TRS(-0.13, 0.013, 0, Q(), 0.03, 0.03, 0.03)),
    part(blk, 'iron', TRS(0.18, 0.013, 0.035, Q(), 0.05, 0.02, 0.06)),
    part(blk, 'iron', TRS(0.165, 0.013, 0.07, Q(), 0.018, 0.022, 0.02)),
    part(blk, 'iron', TRS(0.2, 0.013, 0.07, Q(), 0.014, 0.022, 0.02)),
  ];
}

// La ballesta del que vela en el muro: la cureña, el arco, la cuerda, el
// estribo y la nuez (a lo largo de z, el arco hacia +z).
export function crossbowParts() {
  const blk = geo('cbBox', () => new THREE.BoxGeometry(1, 1, 1));
  const P = [
    part(blk, 'wooddark', TRS(0, 0.03, -0.05, Q(), 0.055, 0.05, 0.62)),
    part(blk, 'wooddark', TRS(0, 0.012, -0.36, Q(0.25, 0, 0), 0.05, 0.05, 0.08)),
    part(blk, 'iron', TRS(0, 0.052, 0.0, Q(), 0.03, 0.012, 0.05)),
    part(blk, 'iron', TRS(0, -0.01, -0.12, Q(0.4, 0, 0), 0.014, 0.012, 0.16)),
  ];
  // el arco (de acero) y su cuerda tensa
  P.push(part(geo('cbProd', () => new THREE.TorusGeometry(0.42, 0.014, 4, 14, Math.PI * 0.55)), 'iron', TRS(0, 0.035, -0.12, Q(Math.PI / 2, 0, Math.PI * 0.225))));
  const tipA = V(Math.cos(Math.PI * 0.225) * 0.42, 0.035, -0.12 + Math.sin(Math.PI * 0.225) * 0.42);
  for (const s of [-1, 1]) {
    const tip = V(s * tipA.x, tipA.y, tipA.z);
    const nut = V(0, 0.055, 0.02);
    const d = new THREE.Vector3().subVectors(nut, tip);
    P.push(part(blk, 'rope', M4().compose(tip.clone().add(nut).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), d.clone().normalize()), V(d.length(), 0.006, 0.006))));
  }
  P.push(part(geo('cbStir', () => new THREE.TorusGeometry(0.05, 0.008, 3, 8)), 'iron', TRS(0, 0.035, 0.31, Q(0, 0, 0), 1, 1, 1)));
  return P;
}

// La bocina del que avisa desde lo alto: un cuerno curvo con sus aros de
// latón y la boquilla (en el plano xy, la boca hacia +x).
export function hornParts() {
  const P = [];
  const n = 8;
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n;
    const a = Math.PI * (0.95 - u * 0.75);
    pts.push(V(Math.cos(a) * 0.2, Math.sin(a) * 0.16 + 0.02, 0));
  }
  const seg = geo('hornSeg', () => new THREE.CylinderGeometry(1, 1, 1, 8, 1, true));
  for (let k = 0; k < n; k++) {
    const a = pts[k],
      b = pts[k + 1];
    const d = new THREE.Vector3().subVectors(b, a);
    const r0 = 0.012 + (k / n) ** 1.6 * 0.05,
      r1 = 0.012 + ((k + 1) / n) ** 1.6 * 0.05;
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
    const g = geo('hornF' + k, () => new THREE.CylinderGeometry(r1, r0, 1, 8, 1, true));
    P.push(part(g, 'bone', M4().compose(a.clone().add(b).multiplyScalar(0.5), q, V(1, d.length() * 1.04, 1)), [0.78, 0.66, 0.5]));
  }
  const last = pts[n],
    prev = pts[n - 1];
  const dq = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), new THREE.Vector3().subVectors(last, prev).normalize());
  // la boca (oscura por dentro), los aros y la boquilla
  P.push(part(geo('hornMouth', () => new THREE.CircleGeometry(0.06, 8)), 'black', M4().compose(last, dq.clone().multiply(Q(-Math.PI / 2, 0, 0)), V(1, 1, 1))));
  for (const k of [2, 5, n - 0.25]) {
    const i = Math.min(n - 1, Math.floor(k));
    const p = pts[i].clone().lerp(pts[i + 1], k - i);
    const r = 0.012 + (k / n) ** 1.6 * 0.05 + 0.004;
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), new THREE.Vector3().subVectors(pts[i + 1], pts[i]).normalize());
    P.push(part(seg, 'bronze', M4().compose(p, q, V(r, 0.02, r))));
  }
  P.push(part(geo('hornTip', () => new THREE.CylinderGeometry(0.008, 0.014, 0.04, 6)), 'bronze', M4().compose(pts[0], new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), new THREE.Vector3().subVectors(pts[0], pts[1]).normalize()), V(1, 1, 1))));
  // la correa
  P.push(part(geo('hornStrap', () => new THREE.TorusGeometry(0.15, 0.008, 3, 12, Math.PI)), 'leather', TRS(0.02, 0.04, 0, Q(0, 0, Math.PI))));
  return P;
}

// El cubo del que baja a por el agua: duelas, aros de hierro y el asa de
// cuerda.
export function bucketParts() {
  const P = [];
  P.push(part(geo('bkBody', () => new THREE.CylinderGeometry(0.13, 0.11, 0.24, 12, 1, true)), 'planks', TRS(0, 0.12, 0), [0.7, 0.6, 0.5]));
  P.push(part(geo('bkIn', () => flip(new THREE.CylinderGeometry(0.124, 0.104, 0.235, 12, 1, true))), 'wooddark', TRS(0, 0.12, 0)));
  P.push(part(geo('bkBot', () => new THREE.CircleGeometry(0.108, 12)), 'wooddark', TRS(0, 0.02, 0, Q(-Math.PI / 2, 0, 0))));
  const hoop = geo('bkHoop', () => new THREE.TorusGeometry(1, 0.06, 3, 14));
  for (const [y, r] of [
    [0.04, 0.114],
    [0.2, 0.128],
  ])
    P.push(part(hoop, 'iron', TRS(0, y, 0, Q(Math.PI / 2, 0, 0), r, r, r * 1.6)));
  P.push(part(geo('bkHandle', () => new THREE.TorusGeometry(0.125, 0.008, 3, 10, Math.PI)), 'rope', TRS(0, 0.24, 0, Q(0, 0, 0))));
  // las orejetas
  for (const s of [-1, 1]) P.push(part(geo('bkEar', () => new THREE.BoxGeometry(0.03, 0.05, 0.03)), 'wooddark', TRS(s * 0.128, 0.225, 0)));
  return P;
}

// ------------------------------------------------------------------- el arca
// El arca de la Hermandad: madera con flejes de hierro, la tapa en artesa y
// la barra que la cierra por delante, pasada por dos grapas, con un
// candado de calavera. Devuelve el cuerpo, la tapa (con su bisagra en el
// origen de su marco) y la barra, por separado. Larga en x, el frente a +z.
export function chestParts(o = {}) {
  const W = o.w ?? 0.86,
    D = o.d ?? 0.46,
    H = o.h ?? 0.42;
  const blk = geo('chBox', () => new THREE.BoxGeometry(1, 1, 1));
  const wood = o.wood ?? 'wooddark';
  const body = [part(blk, wood, TRS(0, H / 2 + 0.05, 0, Q(), W, H, D))];
  // los pies, los flejes y las cantoneras
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) body.push(part(blk, wood, TRS(sx * (W / 2 - 0.05), 0.025, sz * (D / 2 - 0.05), Q(), 0.1, 0.05, 0.1)));
  for (const x of [-W * 0.32, 0, W * 0.32]) {
    body.push(part(blk, 'iron', TRS(x, H / 2 + 0.05, D / 2 + 0.006, Q(), 0.05, H + 0.01, 0.012)));
    body.push(part(blk, 'iron', TRS(x, H / 2 + 0.05, -D / 2 - 0.006, Q(), 0.05, H + 0.01, 0.012)));
  }
  for (const sx of [-1, 1]) body.push(part(blk, 'iron', TRS(sx * (W / 2 + 0.006), H / 2 + 0.05, 0, Q(), 0.012, H + 0.01, D * 0.7)));
  body.push(part(blk, 'iron', TRS(0, 0.09, D / 2 + 0.008, Q(), W + 0.02, 0.035, 0.012)));
  // el emblema de la Hermandad en el frente: calavera sobre dos tibias
  body.push(...moveParts(skullParts({ jaw: false, tint: [0.85, 0.82, 0.74] }), TRS(-W * 0.16, H * 0.55, D / 2 + 0.02, Q(), 0.55)));
  body.push(...moveParts(skullParts({ jaw: false, tint: [0.85, 0.82, 0.74] }), TRS(W * 0.16, H * 0.55, D / 2 + 0.02, Q(), 0.55)));
  // las dos grapas por las que pasa la barra
  const yBar = H + 0.05 - 0.04;
  for (const sx of [-1, 1]) body.push(part(geo('chStaple', () => new THREE.TorusGeometry(0.03, 0.008, 3, 8, Math.PI)), 'iron', TRS(sx * W * 0.32, yBar - 0.01, D / 2 + 0.016, Q(0, 0, 0))));
  // el hueco (oscuro) que deja ver la tapa abierta, y el lecho de terciopelo
  body.push(part(blk, 'black', TRS(0, H + 0.051, 0, Q(), W - 0.06, 0.002, D - 0.06)));
  body.push(part(blk, 'clothRed', TRS(0, H - 0.07, 0, Q(), W - 0.08, 0.02, D - 0.08), [0.6, 0.3, 0.3]));
  // la tapa: en artesa, con su bisagra atrás (marco: origen en la bisagra)
  const lid = [];
  lid.push(part(blk, wood, TRS(0, 0.035, D / 2, Q(), W + 0.02, 0.07, D + 0.02)));
  lid.push(part(blk, wood, TRS(0, 0.09, D / 2, Q(), W - 0.1, 0.05, D - 0.12)));
  for (const x of [-W * 0.32, 0, W * 0.32]) {
    lid.push(part(blk, 'iron', TRS(x, 0.072, D / 2, Q(), 0.05, 0.012, D + 0.03)));
    lid.push(part(blk, 'iron', TRS(x, 0.03, D + 0.016, Q(), 0.05, 0.07, 0.012)));
  }
  // la barra: de grapa a grapa, con el candado de calavera en medio
  const bar = [];
  bar.push(part(geo('chBar', () => new THREE.CylinderGeometry(0.014, 0.014, 1, 6)), 'iron', TRS(0, 0, 0, Q(0, 0, Math.PI / 2), 1, W * 0.86, 1)));
  bar.push(part(blk, 'iron', TRS(W * 0.43 + 0.02, 0, 0, Q(), 0.03, 0.05, 0.05)));
  bar.push(...moveParts(skullParts({ jaw: true, open: 0.05 }), TRS(0, -0.01, 0.03, Q(), 0.62)));
  return { body, lid, bar, H: H + 0.05, D, W, yBar };
}

// ------------------------------------------------------------- escudo, armas
// Escudo de los de la guarnición (de los del castillo: negro con la cruz
// blanca de la Hermandad), colgado: cara a +z.
export function shieldParts(o = {}) {
  const shape = new THREE.Shape();
  const w = o.w ?? 0.24,
    h = o.h ?? 0.32;
  shape.moveTo(-w, h * 0.45);
  shape.lineTo(w, h * 0.45);
  shape.quadraticCurveTo(w, -h * 0.2, 0, -h * 0.55);
  shape.quadraticCurveTo(-w, -h * 0.2, -w, h * 0.45);
  const body = geo('shield' + w + ':' + h, () => new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false, curveSegments: 5 }));
  const P = [part(body, o.mat ?? 'planks', TRS(0, 0, -0.03), o.tint ?? [0.18, 0.16, 0.15])];
  const blk = geo('shBox', () => new THREE.BoxGeometry(1, 1, 1));
  // la cruz (o la banda), en relieve
  const c = o.charge ?? [0.82, 0.78, 0.7];
  if (o.device === 'band') P.push(part(blk, 'planks', TRS(0, 0.02, 0.004, Q(0, 0, -0.7), w * 0.5, h * 1.25, 0.006), c));
  else {
    P.push(part(blk, 'planks', TRS(0, -0.02, 0.004, Q(), w * 0.34, h * 0.86, 0.006), c));
    P.push(part(blk, 'planks', TRS(0, h * 0.14, 0.004, Q(), w * 1.6, h * 0.22, 0.006), c));
  }
  // el ribete de hierro de arriba y unas tachuelas
  P.push(part(blk, 'iron', TRS(0, h * 0.45, -0.012, Q(), w * 2.02, 0.025, 0.04)));
  return P;
}

// Espada tendida (a lo largo de +y desde la empuñadura): hoja, arriaz y
// pomo.
export function swordParts(len = 0.9, o = {}) {
  const blk = geo('swBox', () => new THREE.BoxGeometry(1, 1, 1));
  const mat = o.mat ?? 'plate';
  return [
    part(blk, mat, TRS(0, 0.12 + len / 2, 0, Q(), 0.052, len, 0.01)),
    part(blk, 'iron', TRS(0, 0.12 + len * 0.4, 0, Q(), 0.012, len * 0.75, 0.012)),
    part(geo('swTip', () => new THREE.ConeGeometry(0.023, 0.08, 4).rotateY(Math.PI / 4).scale(1, 1, 0.18)), mat, TRS(0, 0.12 + len + 0.04, 0)),
    part(blk, 'iron', TRS(0, 0.12, 0, Q(), 0.2, 0.025, 0.025)),
    part(blk, 'leather', TRS(0, 0.05, 0, Q(), 0.03, 0.13, 0.03)),
    part(geo('swPommel', () => new THREE.SphereGeometry(0.03, 5, 4)), 'iron', TRS(0, -0.025, 0)),
  ];
}

// Moharra de lanza (la punta) con su cubo, de y=0 hacia +y.
export function spearheadParts(len = 0.3) {
  return [
    part(geo('spBlade' + len, () => new THREE.ConeGeometry(0.035, len, 4).scale(1, 1, 0.3)), 'plateRust', TRS(0, 0.06 + len / 2, 0)),
    part(geo('spSock', () => new THREE.CylinderGeometry(0.014, 0.02, 0.12, 6)), 'iron', TRS(0, 0.0, 0)),
  ];
}

// El trofeo de la Hermandad: el escudo en medio y, alrededor, espadas y
// moharras en rayos (como las panoplias de las armerías). En el plano xy.
export function trophyParts(o = {}) {
  const rng = new RNG(o.seed ?? 3);
  const P = moveParts(shieldParts({ w: 0.3, h: 0.42 }), TRS(0, 0, 0.06));
  const n = o.n ?? 12;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + Math.PI / n;
    // (los rayos de abajo, más cortos: no tocan el altar)
    const down = Math.sin(a) < -0.5;
    const r0 = 0.34;
    const m = TRS(Math.cos(a) * r0, Math.sin(a) * r0, 0, Q(0, 0, a - Math.PI / 2));
    if (k % 2 === 0) P.push(...moveParts(swordParts(down ? 0.5 : 0.75 + rng.range(-0.05, 0.05)), m.clone().multiply(TRS(0, -0.02, 0))));
    else P.push(...moveParts(spearheadParts(down ? 0.22 : 0.32), m.clone().multiply(TRS(0, 0.06, 0))));
  }
  return P;
}

// ------------------------------------------------------ la caja de música
// Un rodillo: prisma de seis caras a lo largo de x, cada cara con uno de los
// símbolos del atlas 'nanaSymbols' (la cara k queda delante, hacia +z, con
// el rodillo girado k·60° en x).
export function drumGeometry(r = 0.05, len = 0.075) {
  return geo('nanaDrum' + r + ':' + len, () => {
    const pos = [],
      uv = [],
      nor = [],
      idx = [];
    const d = (a) => [Math.sin(a), Math.cos(a)];
    for (let k = 0; k < 6; k++) {
      const c = (k * Math.PI) / 3,
        a0 = c - Math.PI / 6,
        a1 = c + Math.PI / 6;
      const [s0, c0] = d(a0),
        [s1, c1] = d(a1),
        [sn, cn] = d(c);
      const b = pos.length / 3;
      for (const [x, s, cc, v] of [
        [-len / 2, s0, c0, 0],
        [len / 2, s0, c0, 0],
        [len / 2, s1, c1, 1],
        [-len / 2, s1, c1, 1],
      ]) {
        pos.push(x, s * r, cc * r);
        nor.push(0, sn, cn);
        uv.push((k + (x > 0 ? 1 : 0)) / 6, v);
      }
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  });
}
// las tapas del rodillo, con su aro de latón (en el marco del rodillo)
export function drumCapParts(r = 0.05, len = 0.075) {
  const hex = geo('drumCap' + r, () => new THREE.CylinderGeometry(r * 1.0, r * 1.0, 0.008, 6));
  const rim = geo('drumRim' + r, () => new THREE.CylinderGeometry(r * 1.12, r * 1.12, 0.01, 12));
  const P = [];
  for (const s of [-1, 1]) {
    // (la caja de seis caras, con el canto alineado con las del prisma)
    P.push(part(hex, 'wooddark', TRS(s * (len / 2 + 0.004), 0, 0, Q(0, 0, Math.PI / 2).multiply(Q(0, Math.PI / 6, 0)))));
    P.push(part(rim, 'bronze', TRS(s * (len / 2 + 0.012), 0, 0, Q(0, 0, Math.PI / 2))));
  }
  P.push(part(geo('drumAxle', () => new THREE.CylinderGeometry(0.008, 0.008, 1, 6)), 'iron', TRS(0, 0, 0, Q(0, 0, Math.PI / 2), 1, len + 0.05, 1)));
  return P;
}

// La caja de música del ama: de nogal, con cantoneras de latón, cuatro
// rodillos en su frente, la manivela a la derecha y el cajón abajo.
// Devuelve el cuerpo, los rodillos (sus centros), la manivela (su eje) y el
// cajón, por separado. Origen en el centro de la base; el frente hacia +z.
export const MBOX = { W: 0.58, H: 0.39, D: 0.36, drumY: 0.255, drumR: 0.048, drumLen: 0.072, drumX: [-0.18, -0.06, 0.06, 0.18], crank: [0.312, 0.255, 0.07], drawerY: 0.035, drawerH: 0.1, drawerOpen: 0.22 };
export function musicBoxParts() {
  const B = MBOX;
  const blk = geo('mbBox', () => new THREE.BoxGeometry(1, 1, 1));
  const wood = 'wooddark';
  const body = [];
  const hw = B.W / 2,
    hd = B.D / 2;
  const yD1 = B.drawerY + B.drawerH;
  body.push(part(blk, wood, TRS(0, 0.0175, 0, Q(), B.W + 0.02, 0.035, B.D + 0.02)));
  // a los lados y detrás del cajón
  for (const s of [-1, 1]) body.push(part(blk, wood, TRS(s * (hw - 0.03), (B.drawerY + yD1) / 2, 0, Q(), 0.06, B.drawerH, B.D)));
  body.push(part(blk, wood, TRS(0, (B.drawerY + yD1) / 2, -hd + 0.025, Q(), B.W - 0.12, B.drawerH, 0.05)));
  body.push(part(blk, 'black', TRS(0, (B.drawerY + yD1) / 2, -0.02, Q(), B.W - 0.12, B.drawerH - 0.004, B.D - 0.1)));
  // el cuerpo de arriba, la tapa y su moldura
  const yT = B.H - 0.03;
  body.push(part(blk, wood, TRS(0, (yD1 + yT) / 2, 0, Q(), B.W, yT - yD1, B.D)));
  body.push(part(blk, wood, TRS(0, yT + 0.015, 0, Q(), B.W + 0.03, 0.03, B.D + 0.03)));
  body.push(part(blk, wood, TRS(0, yD1 + 0.008, hd + 0.006, Q(), B.W + 0.012, 0.016, 0.012)));
  // las ventanas de los rodillos (oscuras) y un marco de latón alrededor
  for (const x of B.drumX) {
    body.push(part(blk, 'black', TRS(x, B.drumY, hd + 0.0015, Q(), B.drumLen + 0.024, B.drumR * 1.5, 0.003)));
    body.push(part(blk, 'bronze', TRS(x, B.drumY + B.drumR * 0.8, hd + 0.004, Q(), B.drumLen + 0.03, 0.008, 0.008)));
    body.push(part(blk, 'bronze', TRS(x, B.drumY - B.drumR * 0.8, hd + 0.004, Q(), B.drumLen + 0.03, 0.008, 0.008)));
  }
  // cantoneras de latón
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      for (const y of [0.05, yT + 0.01]) body.push(part(blk, 'bronze', TRS(sx * (hw + 0.004), y, sz * (hd + 0.004), Q(), 0.03, 0.05, 0.03)));
  // en la tapa: la cruz del Carmen, de latón, y el agujero de la cuerda
  body.push(part(blk, 'bronze', TRS(0, yT + 0.032, 0, Q(), 0.03, 0.004, 0.16)));
  body.push(part(blk, 'bronze', TRS(0, yT + 0.032, -0.03, Q(), 0.1, 0.004, 0.03)));
  // la placa del eje de la manivela
  body.push(part(geo('mbBoss', () => new THREE.CylinderGeometry(0.04, 0.04, 0.012, 10)), 'bronze', TRS(hw + 0.005, B.crank[1], B.crank[2], Q(0, 0, Math.PI / 2))));
  // la manivela (marco: el eje, en x)
  const crank = [
    part(geo('mbAxle', () => new THREE.CylinderGeometry(0.012, 0.012, 0.06, 6)), 'iron', TRS(0.0, 0, 0, Q(0, 0, Math.PI / 2))),
    part(blk, 'iron', TRS(0.03, -0.065, 0, Q(), 0.016, 0.145, 0.022)),
    part(geo('mbKnob', () => new THREE.CylinderGeometry(0.016, 0.019, 0.065, 6)), wood, TRS(0.062, -0.13, 0, Q(0, 0, Math.PI / 2))),
  ];
  // el cajón (marco: su frente cerrado, a ras del cuerpo)
  const dh = B.drawerH - 0.008;
  const drawer = [
    part(blk, wood, TRS(0, dh / 2, -0.012, Q(), B.W - 0.13, dh, 0.022)),
    part(blk, wood, TRS(0, 0.006, -0.16, Q(), B.W - 0.14, 0.012, 0.3)),
    part(blk, wood, TRS(-(B.W - 0.15) / 2, dh * 0.4, -0.16, Q(), 0.012, dh * 0.8, 0.3)),
    part(blk, wood, TRS((B.W - 0.15) / 2, dh * 0.4, -0.16, Q(), 0.012, dh * 0.8, 0.3)),
    part(blk, wood, TRS(0, dh * 0.4, -0.305, Q(), B.W - 0.14, dh * 0.8, 0.012)),
    part(blk, 'clothRed', TRS(0, 0.014, -0.16, Q(), B.W - 0.16, 0.006, 0.28), [0.45, 0.25, 0.22]),
    part(geo('mbPull', () => new THREE.SphereGeometry(0.014, 6, 4)), 'bronze', TRS(0, dh / 2, 0.006)),
  ];
  return { body, crank, drawer };
}

// La silla baja del ama, con su chal; el frente hacia +z.
export function chairParts(o = {}) {
  const blk = geo('chBox2', () => new THREE.BoxGeometry(1, 1, 1));
  const P = [];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) P.push(part(blk, 'wooddark', TRS(sx * 0.18, 0.17, sz * 0.16, Q(), 0.035, 0.34, 0.035)));
  P.push(part(blk, 'straw', TRS(0, 0.35, 0, Q(), 0.42, 0.04, 0.38), [0.62, 0.52, 0.36]));
  for (const sx of [-1, 1]) P.push(part(blk, 'wooddark', TRS(sx * 0.18, 0.62, -0.17, Q(-0.1, 0, 0), 0.035, 0.56, 0.035)));
  for (const y of [0.55, 0.75]) P.push(part(blk, 'wooddark', TRS(0, y, -0.18, Q(-0.1, 0, 0), 0.38, 0.05, 0.02)));
  // el chal, doblado sobre el respaldo y caído por el asiento
  if (o.shawl !== false) {
    P.push(part(blk, 'clothDark', TRS(0, 0.82, -0.17, Q(-0.1, 0, 0.05), 0.44, 0.05, 0.08), [0.42, 0.36, 0.4]));
    P.push(part(blk, 'clothDark', TRS(0.02, 0.6, -0.21, Q(-0.12, 0, 0.04), 0.4, 0.42, 0.015), [0.42, 0.36, 0.4]));
    P.push(part(blk, 'clothDark', TRS(0.05, 0.38, 0.04, Q(0, 0.2, 0), 0.24, 0.02, 0.3), [0.42, 0.36, 0.4]));
  }
  return P;
}

// La rueca y el huso del ama (apoyada, a lo largo de +y, con el copo de
// lana arriba).
export function distaffParts() {
  return [
    part(geo('dfStick', () => new THREE.CylinderGeometry(0.012, 0.016, 1.1, 5)), 'wooddark', TRS(0, 0.55, 0)),
    part(geo('dfWool', () => new THREE.SphereGeometry(0.075, 6, 5)), 'linen', TRS(0, 1.0, 0, Q(), 1, 1.6, 1), [0.82, 0.78, 0.7]),
    part(geo('dfSpindle', () => new THREE.CylinderGeometry(0.004, 0.01, 0.26, 5)), 'wooddark', TRS(0.14, 0.4, 0.03, Q(0, 0, 0.3))),
    part(geo('dfWhorl', () => new THREE.CylinderGeometry(0.02, 0.02, 0.015, 8)), 'bone', TRS(0.12, 0.32, 0.03, Q(0, 0, 0.3))),
  ];
}
