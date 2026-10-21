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
export function flip(g) {
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

// ------------------------------------------------------- los hermanos de Dumio
// Un monje muerto de pie con su hábito pardo, la capucha puesta y lo suyo en
// las manos. Marco: los pies en el origen, mirando a +z. Devuelve el cuerpo,
// la cabeza (calavera y capucha, en el marco de su eje: el cuello) y dónde va
// ese eje, para girarla aparte; eyes: las cuencas, en el marco de la cabeza.
// hold: 'farol', 'libro', 'pico', 'reloj', 'cruz', 'calavera'.
const HABIT = [0.5, 0.4, 0.31];
// (el cilindro de arriba con un radio y el de abajo con otro: se hace con su
// propia geometría)
function sleeve(a, b, r0, r1, mat, tint) {
  const d = new THREE.Vector3().subVectors(b, a);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
  const g = geo(`sleeve:${r0.toFixed(3)}:${r1.toFixed(3)}`, () => new THREE.CylinderGeometry(r1, r0, 1, 8, 1, false));
  return part(g, mat, M4().compose(a.clone().add(b).multiplyScalar(0.5), q, V(1, d.length(), 1)), tint);
}
// mano de hueso: la palma y los dedos, hacia 'dir' (en el marco del monje)
function boneHand(p, dir, side) {
  const P = [];
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), dir.clone().normalize());
  const m = M4().compose(p, q, V(1, 1, 1));
  P.push(part(geo('palm', () => new THREE.BoxGeometry(0.055, 0.018, 0.06)), 'bone', m.clone().multiply(TRS(0, 0, 0.02))));
  for (let k = 0; k < 4; k++) {
    const x = -0.021 + k * 0.014;
    P.push(...moveParts(boneParts(V(x, 0, 0.05), V(x, -0.022, 0.09), 0.005), m));
  }
  P.push(...moveParts(boneParts(V(side * 0.03, 0, 0.02), V(side * 0.045, -0.012, 0.055), 0.005), m));
  return P;
}
export const MONK_HEAD = { y: 1.5, skull: [0, 0.16, 0.025] };
export function monkParts(hold = 'cruz', o = {}) {
  const P = [];
  const robeT = o.tint ?? HABIT;
  const prof = [
    [0.33, 0.0],
    [0.315, 0.2],
    [0.28, 0.55],
    [0.225, 0.92],
    [0.215, 1.12],
    [0.235, 1.32],
    [0.24, 1.42],
    [0.17, 1.5],
    [0.08, 1.53],
  ];
  P.push(part(geo('habit', () => latheShell(prof, 12)), 'burlap', TRS(0, 0, 0, Q(), 1, 1, 0.8), robeT));
  P.push(part(geo('habitHem', () => new THREE.CircleGeometry(0.32, 12)), 'black', TRS(0, 0.012, 0, Q(-Math.PI / 2, 0, 0), 1, 1, 0.8)));
  // los pliegues del hábito (unas tiras más oscuras)
  for (const a of [-0.9, -0.35, 0.3, 0.85]) {
    const x = Math.sin(a) * 0.29,
      z = Math.cos(a) * 0.29 * 0.8;
    P.push(sleeve(V(x, 0.02, z), V(x * 0.75, 0.9, z * 0.75), 0.022, 0.012, 'burlap', robeT.map((c) => c * 0.75)));
  }
  // el cordón, con su caída de nudos
  P.push(part(geo('cord', () => new THREE.TorusGeometry(0.222, 0.014, 4, 14)), 'rope', TRS(0, 0.93, 0, Q(Math.PI / 2, 0, 0), 1, 1, 0.8)));
  P.push(sleeve(V(0.06, 0.93, 0.18), V(0.08, 0.45, 0.24), 0.01, 0.01, 'rope', null));
  for (const y of [0.78, 0.62, 0.48]) P.push(part(geo('knot', () => new THREE.SphereGeometry(0.018, 5, 4)), 'rope', TRS(0.06 + (0.93 - y) * 0.04, y, 0.18 + (0.93 - y) * 0.13)));
  // la capucha caída sobre los hombros (el cuello)
  P.push(part(geo('cowl', () => new THREE.TorusGeometry(0.13, 0.055, 5, 12)), 'burlap', TRS(0, 1.47, -0.01, Q(Math.PI / 2, 0, 0), 1.15, 1, 0.75), robeT.map((c) => c * 0.9)));
  // los pies (los huesos asoman bajo el hábito)
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) P.push(...boneParts(V(s * 0.08 + (k - 1) * 0.02, 0.012, 0.22), V(s * 0.085 + (k - 1) * 0.024, 0.012, 0.31), 0.008));
  // los brazos: manga ancha hasta la muñeca y la mano de hueso
  const W = {
    farol: [V(0.17, 1.06, 0.22), V(-0.13, 1.0, 0.17)],
    libro: [V(0.11, 1.17, 0.24), V(-0.11, 1.17, 0.24)],
    pico: [V(0.13, 0.98, 0.22), V(-0.12, 1.3, 0.23)],
    reloj: [V(0.085, 1.1, 0.25), V(-0.085, 1.1, 0.25)],
    cruz: [V(0.05, 1.2, 0.23), V(-0.05, 1.16, 0.23)],
    calavera: [V(0.1, 1.03, 0.25), V(-0.1, 1.03, 0.25)],
  }[hold] || [V(0.05, 1.2, 0.23), V(-0.05, 1.16, 0.23)];
  W.forEach((w, i) => {
    const s = i === 0 ? 1 : -1;
    const sh = V(s * 0.22, 1.4, -0.01);
    const el = V(s * 0.25, 1.12, 0.06).lerp(V(w.x * 1.3, (w.y + 1.12) / 2, w.z * 0.4), 0.25);
    P.push(sleeve(sh, el, 0.075, 0.08, 'burlap', robeT));
    const cuff = w.clone().lerp(el, 0.18);
    P.push(sleeve(el, cuff, 0.08, 0.1, 'burlap', robeT));
    P.push(part(geo('cuffIn', () => new THREE.CircleGeometry(0.095, 8)), 'black', M4().compose(cuff.clone().lerp(w, 0.02), new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), w.clone().sub(el).normalize()), V(1, 1, 1))));
    P.push(...boneParts(cuff, w, 0.012));
    P.push(...boneHand(w, w.clone().sub(el), -s));
  });
  // lo que lleva
  P.push(...heldParts(hold));
  // la cabeza: calavera algo más grande que la de las filas y la capucha puesta
  const head = [];
  const sk = MONK_HEAD.skull;
  head.push(...moveParts(skullParts({ jaw: true, open: o.open ?? 0.3, tint: [0.88, 0.84, 0.76] }), TRS(sk[0], sk[1], sk[2], Q(), 1.06)));
  // (la capucha, abierta por delante: el hueco de la esfera, hacia +z)
  head.push(part(geo('hood', () => new THREE.SphereGeometry(0.165, 12, 8, Math.PI * 0.86, Math.PI * 1.28, 0, Math.PI * 0.72)), 'burlap', TRS(0, 0.17, -0.01, Q(), 1, 1.12, 1.08), robeT));
  head.push(part(geo('hoodIn', () => flip(new THREE.SphereGeometry(0.158, 12, 8, Math.PI * 0.86, Math.PI * 1.28, 0, Math.PI * 0.72))), 'black', TRS(0, 0.17, -0.01, Q(), 1, 1.12, 1.08)));
  head.push(part(geo('hoodPeak', () => new THREE.ConeGeometry(0.06, 0.16, 6)), 'burlap', TRS(0, 0.33, -0.1, Q(-0.6, 0, 0)), robeT));
  // las cuencas (donde se les encienden los ojos)
  const eyes = [-1, 1].map((s) => [sk[0] + s * 0.025, sk[1] - 0.013, sk[2] + 0.068]);
  return { body: P, head, headY: MONK_HEAD.y, eyes };
}

// lo que tiene en las manos cada hermano
function heldParts(hold) {
  const blk = geo('hdBox', () => new THREE.BoxGeometry(1, 1, 1));
  const P = [];
  if (hold === 'farol') {
    // el farol del portero, colgado de la mano derecha (encendido)
    const x = 0.17,
      y = 0.86,
      z = 0.26;
    P.push(part(geo('lanRing', () => new THREE.TorusGeometry(0.025, 0.005, 3, 8)), 'iron', TRS(x, 1.05, z)));
    P.push(sleeve(V(x, 1.03, z), V(x, y + 0.12, z), 0.004, 0.004, 'iron'));
    P.push(part(geo('lanRoof', () => new THREE.ConeGeometry(0.075, 0.07, 4)), 'iron', TRS(x, y + 0.13, z, Q(0, Math.PI / 4, 0))));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(part(blk, 'iron', TRS(x + sx * 0.048, y + 0.02, z + sz * 0.048, Q(), 0.012, 0.2, 0.012)));
    P.push(part(blk, 'linen', TRS(x, y + 0.02, z, Q(), 0.09, 0.17, 0.09), [1.0, 0.72, 0.38]));
    P.push(part(blk, 'iron', TRS(x, y - 0.085, z, Q(), 0.11, 0.015, 0.11)));
    P.push(part(blk, 'ember', TRS(x, y + 0.0, z, Q(), 0.03, 0.06, 0.03)));
  } else if (hold === 'libro') {
    // el libro abierto, entre las dos manos, de cara a él
    const m = TRS(0, 1.2, 0.27, Q(-0.9, 0, 0));
    for (const s of [-1, 1]) {
      P.push(part(blk, 'leather', m.clone().multiply(TRS(s * 0.085, 0, 0, Q(0, 0, s * 0.18), 0.17, 0.012, 0.23)), [0.5, 0.25, 0.18]));
      P.push(part(blk, 'linen', m.clone().multiply(TRS(s * 0.08, 0.014, 0, Q(0, 0, s * 0.14), 0.155, 0.018, 0.215)), [0.86, 0.82, 0.7]));
    }
  } else if (hold === 'pico') {
    // el pico del cavador, cruzado delante del cuerpo
    const a = V(0.15, 0.82, 0.24),
      b = V(-0.17, 1.52, 0.22);
    P.push(sleeve(a, b, 0.016, 0.018, 'wooddark'));
    const d = b.clone().sub(a).normalize();
    const side = V(0, 0, 1).cross(d).normalize();
    for (const s of [-1, 1]) {
      const tip = b.clone().add(side.clone().multiplyScalar(s * 0.2)).add(d.clone().multiplyScalar(-0.05));
      P.push(sleeve(b, tip, 0.024, 0.006, 'iron'));
    }
    P.push(part(blk, 'iron', M4().compose(b, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d), V(0.05, 0.06, 0.05))));
  } else if (hold === 'reloj') {
    // el reloj de arena, entre las manos
    const c = V(0, 1.1, 0.27);
    for (const s of [-1, 1]) P.push(part(geo('hgDisc', () => new THREE.CylinderGeometry(0.06, 0.06, 0.018, 8)), 'wooddark', TRS(c.x, c.y + s * 0.11, c.z)));
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      P.push(part(geo('hgPost', () => new THREE.CylinderGeometry(0.007, 0.007, 0.22, 4)), 'wooddark', TRS(c.x + Math.cos(a) * 0.05, c.y, c.z + Math.sin(a) * 0.05)));
    }
    for (const s of [-1, 1]) P.push(part(geo('hgBulb', () => new THREE.ConeGeometry(0.042, 0.1, 8)), 'linen', TRS(c.x, c.y + s * 0.05, c.z, Q(s > 0 ? Math.PI : 0, 0, 0)), [0.8, 0.84, 0.86]));
    P.push(part(geo('hgSand', () => new THREE.ConeGeometry(0.03, 0.045, 8)), 'straw', TRS(c.x, c.y - 0.075, c.z), [0.8, 0.62, 0.36]));
  } else if (hold === 'calavera') {
    P.push(...moveParts(skullParts({ jaw: false, tint: [0.84, 0.8, 0.72] }), TRS(0, 1.1, 0.29, Q(-0.2, 0, 0), 0.9)));
  } else {
    // la cruz de palo, apretada contra el pecho
    P.push(part(blk, 'wooddark', TRS(0, 1.2, 0.25, Q(-0.15, 0, 0), 0.025, 0.32, 0.025)));
    P.push(part(blk, 'wooddark', TRS(0, 1.27, 0.26, Q(-0.15, 0, 0), 0.17, 0.025, 0.025)));
  }
  return P;
}

// ------------------------------------------------------- los obispos del panteón
// El sepulcro de un obispo: la caja de caliza con su arquería ciega
// (columnillas y arcos), la tapa moldurada y, encima, el obispo yacente: la
// almohada, la cabeza con su mitra, el cuerpo bajo la casulla con el palio,
// las manos juntas, el báculo al costado y, a los pies, el león. Marco: el
// suelo en el origen, a lo largo de x (la cabeza hacia +x), el frente hacia
// +z. L, W: medio largo y medio ancho de la caja; veiled: la cara tapada
// con un paño de piedra, como los Velados.
const BODY = [
  [0.05, 0],
  [0.13, 0.04],
  [0.17, 0.25],
  [0.19, 0.6],
  [0.21, 0.9],
  [0.235, 1.12],
  [0.24, 1.3],
  [0.2, 1.38],
  [0.07, 1.42],
];
const bodyR = (t) => {
  for (let i = 1; i < BODY.length; i++)
    if (t <= BODY[i][1]) {
      const [r0, t0] = BODY[i - 1],
        [r1, t1] = BODY[i];
      return r0 + ((r1 - r0) * (t - t0)) / (t1 - t0);
    }
  return BODY[BODY.length - 1][0];
};
export function bishopTombParts(o = {}) {
  const L = o.L ?? 1.05,
    W = o.W ?? 0.48;
  const T = o.tint ?? [0.66, 0.63, 0.57];
  const S = 'limestone';
  const dk = T.map((c) => c * 0.5);
  const blk = geo('hdBox', () => new THREE.BoxGeometry(1, 1, 1));
  const P = [];
  const box = (x, y, z, sx, sy, sz, tint = T, q = Q()) => P.push(part(blk, S, TRS(x, y, z, q, sx, sy, sz), tint));
  // el zócalo, la caja y la tapa (la moldura y la losa)
  const yb = 0.12,
    yc = 0.78,
    yl = 0.92;
  box(0, yb / 2, 0, 2 * L + 0.16, yb, 2 * W + 0.16, T.map((c) => c * 0.88));
  box(0, (yb + yc) / 2, 0, 2 * L, yc - yb, 2 * W);
  box(0, yc + 0.035, 0, 2 * L + 0.1, 0.07, 2 * W + 0.1, T.map((c) => c * 0.94));
  box(0, (yc + 0.07 + yl) / 2, 0, 2 * L + 0.03, yl - yc - 0.07, 2 * W + 0.03);
  // la arquería ciega del frente y de la espalda
  const n = Math.max(3, Math.round((2 * L) / 0.42)),
    bay = (2 * L) / n,
    a = bay / 2 - 0.045;
  const ys = yc - 0.07 - a;
  for (const s of [-1, 1]) {
    const q = Q(0, s < 0 ? Math.PI : 0, 0),
      z = s * W;
    for (let i = 0; i < n; i++) {
      const x = -L + (i + 0.5) * bay;
      // el hondo (en sombra) y su medio punto
      box(x, (yb + 0.04 + ys) / 2, z + s * 0.003, 2 * a - 0.02, ys - yb - 0.04, 0.006, dk);
      P.push(part(geo('tombArchIn', () => new THREE.CircleGeometry(1, 10, 0, Math.PI)), S, TRS(x, ys, z + s * 0.007, q, a - 0.01), dk));
      // el arco y las columnillas, con su basa y su capitel
      P.push(part(geo('tombArch', () => new THREE.TorusGeometry(1, 0.06, 4, 12, Math.PI)), S, TRS(x, ys, z + s * 0.018, q, a, a, 0.3), T));
      for (const c of [-1, 1]) {
        const cx = x + c * a;
        P.push(part(geo('tombCol', () => new THREE.CylinderGeometry(0.022, 0.024, 1, 6)), S, TRS(cx, (yb + 0.05 + ys - 0.03) / 2, z + s * 0.022, Q(), 1, ys - 0.03 - yb - 0.05, 1), T));
        box(cx, ys - 0.015, z + s * 0.022, 0.07, 0.03, 0.05, T.map((v) => v * 0.95));
        box(cx, yb + 0.03, z + s * 0.022, 0.065, 0.025, 0.05, T.map((v) => v * 0.95));
      }
    }
  }
  // las cruces de las cabeceras
  for (const s of [-1, 1]) {
    box(s * (L + 0.012), (yb + yc) / 2 + 0.02, 0, 0.025, 0.42, 0.07);
    box(s * (L + 0.012), (yb + yc) / 2 + 0.1, 0, 0.025, 0.07, 0.28);
  }
  if (o.effigy === false) return P;

  // --- el obispo yacente (a escala de la caja)
  const e = Math.min(1, (2 * L - 0.1) / 2.0);
  const sy = 0.75;
  const xf = -L + 0.06 + 0.16 * e; // (donde empiezan los pies)
  const X = (t) => xf + t * e;
  const top = (t, z = 0) => {
    const r = bodyR(t) * e;
    return yl + sy * r * Math.sqrt(Math.max(0, 1 - (z / r) ** 2));
  };
  const ST = T.map((c) => c * 1.04);
  // el cuerpo (la casulla y el alba: un torno tendido y aplastado)
  P.push(part(geo('effBody', () => latheShell(BODY.map(([r, t]) => [r, t]), 14)), S, M4().compose(V(xf, yl, 0), Q(0, 0, -Math.PI / 2), V(sy * e, e, e)), ST));
  // el borde de la casulla y el del alba
  for (const [t, d] of [
    [0.62, 0.012],
    [0.08, 0.01],
  ])
    P.push(part(geo('effHem', () => new THREE.TorusGeometry(1, 0.06, 4, 16)), S, M4().compose(V(X(t), yl, 0), Q(0, Math.PI / 2, 0), V(bodyR(t) * e + d, bodyR(t) * e * sy + d, 0.2 * e)), T.map((c) => c * 0.96)));
  // el palio: la Y sobre el pecho y la tira hasta las rodillas (en tramos
  // pegados a la casulla)
  const band = (t0, z0, t1, z1, k = 4) => {
    for (let i = 0; i < k; i++) {
      const ta = t0 + ((t1 - t0) * i) / k,
        tb = t0 + ((t1 - t0) * (i + 1)) / k;
      const za = z0 + ((z1 - z0) * i) / k,
        zb = z0 + ((z1 - z0) * (i + 1)) / k;
      P.push(sleeve(V(X(ta), top(ta, za) - 0.002, za), V(X(tb), top(tb, zb) - 0.002, zb), 0.013 * e, 0.013 * e, S, T.map((c) => c * 1.1)));
    }
  };
  band(0.66, 0, 1.06, 0);
  for (const s of [-1, 1]) band(1.06, 0, 1.3, s * 0.15 * e, 3);
  // los antebrazos (salen de la casulla por los costados) y las manos
  // juntas sobre el pecho, apuntando a la barbilla
  const wr = (s) => V(X(1.0), top(1.0) + 0.03 * e, s * 0.03 * e);
  for (const s of [-1, 1]) {
    const el = V(X(0.84), top(0.84, s * 0.15 * e) - 0.035 * e, s * 0.15 * e);
    P.push(sleeve(el, wr(s), 0.04 * e, 0.032 * e, S, ST));
    box(X(1.0) + 0.045 * e, top(1.0) + 0.065 * e, s * 0.013 * e, 0.11 * e, 0.032 * e, 0.024 * e, ST, Q(0, 0, 0.75));
  }
  // los pies, y el león echado a sus pies
  for (const s of [-1, 1]) box(X(0.0) + 0.01, yl + 0.075 * e, s * 0.055 * e, 0.06 * e, 0.13 * e, 0.065 * e, ST, Q(0, 0, -0.15));
  P.push(part(geo('lionBody', () => new THREE.SphereGeometry(1, 10, 6)), S, TRS(xf - 0.08 * e, yl + 0.06 * e, -0.02, Q(), 0.09 * e, 0.075 * e, 0.2 * e), T));
  P.push(part(geo('lionBody', () => new THREE.SphereGeometry(1, 10, 6)), S, TRS(xf - 0.08 * e, yl + 0.09 * e, 0.2 * e, Q(), 0.075 * e, 0.075 * e, 0.07 * e), T.map((c) => c * 0.96)));
  P.push(part(geo('lionBody', () => new THREE.SphereGeometry(1, 10, 6)), S, TRS(xf - 0.1 * e, yl + 0.08 * e, 0.27 * e, Q(), 0.04 * e, 0.035 * e, 0.035 * e), T));
  // la almohada (con sus borlas), la cabeza, la barba y la mitra
  const xh = X(1.42) + 0.1 * e,
    yh = yl + 0.08 * e + 0.085 * e;
  box(xh + 0.03 * e, yl + 0.04 * e, 0, 0.36 * e, 0.08 * e, 0.42 * e, T.map((c) => c * 0.97), Q(0, 0, -0.05));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(part(geo('tassel', () => new THREE.SphereGeometry(1, 5, 4)), S, TRS(xh + 0.03 * e + sx * 0.18 * e, yl + 0.04 * e, sz * 0.21 * e, Q(), 0.022 * e), T));
  P.push(part(geo('effHead', () => new THREE.SphereGeometry(1, 12, 8)), S, TRS(xh, yh, 0, Q(), 0.1 * e, 0.092 * e, 0.088 * e), ST));
  if (o.veiled) {
    // el paño de piedra que le tapa la cara y cae sobre la almohada
    P.push(part(geo('veilCap', () => new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)), S, TRS(xh - 0.025 * e, yh - 0.01 * e, 0, Q(), 0.15 * e, 0.1 * e, 0.135 * e), T.map((c) => c * 0.92)));
    P.push(part(geo('veilSkirt', () => new THREE.CylinderGeometry(1, 1.25, 1, 12, 1, true)), S, TRS(xh - 0.025 * e, yh - 0.06 * e, 0, Q(), 0.15 * e, 0.1 * e, 0.135 * e), T.map((c) => c * 0.9)));
  } else {
    box(xh + 0.005, yh + 0.088 * e, 0, 0.055 * e, 0.03 * e, 0.024 * e, ST);
    P.push(part(geo('effBeard', () => new THREE.SphereGeometry(1, 8, 6)), S, TRS(xh - 0.075 * e, yh + 0.02 * e, 0, Q(0, 0, 0.5), 0.07 * e, 0.045 * e, 0.065 * e), ST));
  }
  const mitre = geo('mitre', () => {
    const sh = new THREE.Shape();
    sh.moveTo(-0.09, 0);
    sh.lineTo(0.09, 0);
    sh.quadraticCurveTo(0.105, 0.15, 0, 0.25);
    sh.quadraticCurveTo(-0.105, 0.15, -0.09, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.13, bevelEnabled: false, curveSegments: 6 });
    g.translate(0, 0, -0.065);
    // (se adelgaza hacia arriba: de perfil, también acaba en punta)
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * (1 - 0.75 * Math.min(1, p.getY(i) / 0.25)));
    g.computeVertexNormals();
    return g;
  });
  // (la anchura de la mitra a lo ancho del sepulcro, su alto hacia la
  // cabecera y su grueso hacia arriba)
  const mb = M4().makeBasis(V(0, 0, 1), V(1, 0, 0), V(0, 1, 0));
  P.push(part(mitre, S, M4().setPosition(xh + 0.035 * e, yh + 0.01 * e, 0).multiply(mb).multiply(M4().makeScale(e, e, e)), ST));
  box(xh + 0.06 * e, yh + 0.01 * e, 0, 0.03 * e, 0.135 * e, 0.185 * e, T.map((c) => c * 1.08));
  // el báculo, al costado derecho, con su voluta junto a la almohada
  const zb = 0.24 * e;
  P.push(sleeve(V(X(0.12), yl + 0.03 * e, zb), V(X(1.5), yl + 0.11 * e, zb), 0.016 * e, 0.016 * e, S, T.map((c) => c * 1.06)));
  P.push(part(geo('crook', () => new THREE.TorusGeometry(1, 0.22, 5, 12, Math.PI * 1.5)), S, TRS(X(1.5) + 0.06 * e, yl + 0.11 * e, zb - 0.05 * e, Q(-Math.PI / 2, 0, Math.PI), 0.065 * e), T.map((c) => c * 1.06)));
  return P;
}
