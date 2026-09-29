// Modelos de las armas del Condenado (primitivas low-poly, estilo PS1).
// Todas se construyen en el espacio de la mano derecha: el mango recorre el
// eje +Z a y = -0.05 (el centro del puño) y la punta queda hacia +Z. En las
// armas de un solo filo el filo mira hacia -Y (el lado de los nudillos), que
// es el que va por delante al cortar; el lomo hacia +Y.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { partGeometry } from './rig.js';
import { objMat } from '../gfx/materials.js';
import { swordParts, shieldParts } from './models.js';

const Y = -0.05; // eje del mango en el espacio de la mano

// Perfil 2D (u a lo largo de la hoja, v a lo ancho) extruido con grosor d y
// girado para que u -> +Z, v -> +Y y el grosor quede en X.
function profile(pts, u0, d, mat, j) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.lineTo(pts[0][0], pts[0][1]);
  return { j, type: 'shape', shape: s, s: [1, 1, d], p: [0, Y, u0], r: [0, -90, 0], mat, uvk: 1.2 };
}

// ------------------------------------------------------------- facón
// Cuchillo gaucho: hoja recta de un filo con contrafilo en la punta,
// gavilanes en S de plata, cabo de asta con virola y pomo de plata.
export function faconParts(j = 'sword') {
  return [
    { j, type: 'cyl', s: [0.018, 0.02, 0.12], p: [0, Y, 0.005], r: [90, 0, 0], seg: 6, mat: 'wooddark' },
    { j, type: 'cyl', s: [0.022, 0.022, 0.018], p: [0, Y, 0.066], r: [90, 0, 0], seg: 6, mat: 'silver' },
    { j, type: 'cyl', s: [0.021, 0.025, 0.03], p: [0, Y, -0.068], r: [90, 0, 0], seg: 6, mat: 'silver' },
    { j, type: 'ico', s: [0.02], p: [0, Y, -0.088], mat: 'silver' },
    // gavilanes en S
    { j, type: 'box', s: [0.016, 0.03, 0.012], p: [0, Y, 0.08], mat: 'silver' },
    { j, type: 'box', s: [0.01, 0.05, 0.01], p: [0, Y - 0.036, 0.087], r: [-28, 0, 0], mat: 'silver' },
    { j, type: 'box', s: [0.01, 0.042, 0.01], p: [0, Y + 0.032, 0.074], r: [-28, 0, 0], mat: 'silver' },
    { j, type: 'ico', s: [0.009], p: [0, Y - 0.058, 0.098], mat: 'silver' },
    { j, type: 'ico', s: [0.008], p: [0, Y + 0.05, 0.063], mat: 'silver' },
    // hoja
    profile(
      [
        [0, 0.017],
        [0.3, 0.016],
        [0.352, 0.012],
        [0.388, 0.003],
        [0.352, -0.01],
        [0.3, -0.016],
        [0.03, -0.018],
        [0, -0.013],
      ],
      0.086,
      0.006,
      'plate',
      j
    ),
    // lomo más grueso y oscuro (se lee de un solo filo)
    { j, type: 'box', s: [0.008, 0.005, 0.3], p: [0, Y + 0.014, 0.236], mat: 'iron' },
  ];
}

// ------------------------------------------------------------- hacha
// Hacha barbuda a dos manos (la del verdugo): mango largo de fresno con
// empuñaduras de cuero, cabeza de hierro con filo de acero y martillo detrás.
export function axeParts(j = 'sword') {
  return [
    { j, type: 'box', s: [0.03, 0.038, 1.1], p: [0, Y, -0.02], mat: 'wooddark' },
    { j, type: 'box', s: [0.037, 0.045, 0.17], p: [0, Y, -0.45], mat: 'leather' },
    { j, type: 'box', s: [0.036, 0.044, 0.11], p: [0, Y, 0.0], mat: 'leather' },
    { j, type: 'box', s: [0.042, 0.052, 0.035], p: [0, Y, -0.585], mat: 'iron' },
    // tachones
    ...[-0.25, 0.2].map((z) => ({ j, type: 'box', s: [0.036, 0.046, 0.018], p: [0, Y, z], mat: 'iron' })),
    // cabeza: ojo, martillo y hoja barbuda (filo hacia -Y)
    { j, type: 'box', s: [0.05, 0.07, 0.15], p: [0, Y, 0.45], mat: 'iron' },
    { j, type: 'box', s: [0.042, 0.05, 0.075], p: [0, Y + 0.058, 0.45], mat: 'iron' },
    profile(
      [
        [0.515, -0.03],
        [0.55, -0.12],
        [0.6, -0.232],
        [0.575, -0.25],
        [0.52, -0.262],
        [0.43, -0.268],
        [0.34, -0.252],
        [0.27, -0.215],
        [0.295, -0.17],
        [0.35, -0.095],
        [0.385, -0.03],
      ],
      0,
      0.017,
      'iron',
      j
    ),
    // filo de acero brillante
    profile(
      [
        [0.6, -0.232],
        [0.575, -0.25],
        [0.52, -0.262],
        [0.43, -0.268],
        [0.34, -0.252],
        [0.27, -0.215],
        [0.29, -0.2],
        [0.345, -0.228],
        [0.43, -0.242],
        [0.515, -0.236],
        [0.567, -0.222],
      ],
      0,
      0.02,
      'plate',
      j
    ),
  ];
}

// ------------------------------------------------------------- lanza
// Lanza de guerra con alas (orejas) bajo la moharra, regatón de hierro,
// cinta roja y empuñadura de cuero donde se agarra.
export function spearParts(j = 'sword') {
  return [
    { j, type: 'cyl', s: [0.017, 0.017, 2.14], p: [0, Y, 0.27], r: [90, 0, 0], seg: 6, mat: 'wooddark' },
    { j, type: 'cyl', s: [0.021, 0.021, 0.18], p: [0, Y, 0.01], r: [90, 0, 0], seg: 6, mat: 'leather' },
    // regatón
    { j, type: 'cyl', s: [0.021, 0.019, 0.06], p: [0, Y, -0.8], r: [90, 0, 0], seg: 6, mat: 'iron' },
    { j, type: 'cone', s: [0.02, 0.1], p: [0, Y, -0.88], r: [-90, 0, 0], seg: 5, mat: 'iron' },
    // cubo, alas y moharra en hoja de laurel con nervio
    { j, type: 'cyl', s: [0.017, 0.022, 0.13], p: [0, Y, 1.36], r: [90, 0, 0], seg: 6, mat: 'iron' },
    { j, type: 'box', s: [0.13, 0.014, 0.022], p: [0, Y, 1.32], mat: 'iron' },
    { j, type: 'box', s: [0.02, 0.018, 0.034], p: [0.066, Y, 1.335], r: [0, 25, 0], mat: 'iron' },
    { j, type: 'box', s: [0.02, 0.018, 0.034], p: [-0.066, Y, 1.335], r: [0, -25, 0], mat: 'iron' },
    profile(
      [
        [0, 0.013],
        [0.06, 0.036],
        [0.15, 0.031],
        [0.26, 0.014],
        [0.34, 0],
        [0.26, -0.014],
        [0.15, -0.031],
        [0.06, -0.036],
        [0, -0.013],
      ],
      1.42,
      0.009,
      'plate',
      j
    ),
    { j, type: 'box', s: [0.014, 0.012, 0.3], p: [0, Y, 1.57], mat: 'iron' },
    // cinta
    { j, type: 'cyl', s: [0.023, 0.023, 0.05], p: [0, Y, 1.24], r: [90, 0, 0], seg: 6, mat: 'clothRed' },
    { j, type: 'box', s: [0.004, 0.03, 0.13], p: [0.012, Y - 0.02, 1.17], r: [0, 0, 0], mat: 'clothRed', ds: true },
  ];
}

// ------------------------------------------------------------- katana
// Katana sagrada: la trajo de Japón un jesuita y fue bendecida en la
// catedral. Hoja curva de acero que brilla tenuemente, tsuba de hierro,
// mango trenzado y una cruz de oro atada al pomo.
const K_LEN = 0.74;
const K_SORI = 0.019;
export const katanaCurve = (u) => K_SORI * (u / K_LEN) * (u / K_LEN);
function katanaBlade() {
  const spine = [],
    edge = [];
  const us = [0, 0.1, 0.22, 0.34, 0.46, 0.57, 0.66];
  const w = (u) => 0.031 - 0.007 * (u / K_LEN);
  for (const u of us) {
    spine.push([u, katanaCurve(u) + w(u) / 2]);
    edge.push([u, katanaCurve(u) - w(u) / 2]);
  }
  // kissaki: el lomo sigue hasta la punta y el filo sube a su encuentro
  const tip = [K_LEN, katanaCurve(K_LEN) + 0.006];
  const yok = [0.7, katanaCurve(0.7) - 0.005];
  return [...spine, [0.715, katanaCurve(0.715) + 0.011], tip, yok, ...edge.reverse()];
}
export function katanaParts(j = 'sword') {
  const parts = [
    // tsuka: trenzado oscuro con rombos claros y menuki de oro
    { j, type: 'box', s: [0.026, 0.033, 0.25], p: [0, Y, -0.112], mat: 'clothDark' },
    { j, type: 'box', s: [0.03, 0.037, 0.016], p: [0, Y, 0.012], mat: 'gold' },
    { j, type: 'box', s: [0.03, 0.037, 0.016], p: [0, Y, -0.243], mat: 'black' },
    { j, type: 'box', s: [0.006, 0.012, 0.034], p: [0.014, Y, -0.1], mat: 'gold' },
    { j, type: 'box', s: [0.006, 0.012, 0.034], p: [-0.014, Y, -0.13], mat: 'gold' },
    // tsuba y habaki
    { j, type: 'cyl', s: [0.043, 0.043, 0.008], p: [0, Y, 0.024], r: [90, 0, 0], seg: 8, mat: 'iron' },
    { j, type: 'box', s: [0.012, 0.035, 0.026], p: [0, Y, 0.04], mat: 'gold' },
    // hoja
    profile(katanaBlade(), 0.032, 0.007, 'holySteel', j),
    // cruz de oro atada al pomo con un cordón rojo
    { j, type: 'box', s: [0.005, 0.005, 0.05], p: [0, Y, -0.272], mat: 'clothRed' },
    { j, type: 'box', s: [0.005, 0.008, 0.05], p: [0, Y, -0.318], mat: 'gold' },
    { j, type: 'box', s: [0.005, 0.032, 0.008], p: [0, Y, -0.305], mat: 'gold' },
  ];
  // rombos del trenzado a ambos lados
  for (let i = 0; i < 6; i++) {
    const z = -0.215 + i * 0.038;
    for (const x of [0.0135, -0.0135]) parts.push({ j, type: 'box', s: [0.002, 0.012, 0.012], p: [x, Y, z], r: [45, 0, 0], mat: 'clothWhite' });
  }
  return parts;
}

// Saya (vaina) lacada de la katana, curvada como la hoja: +Z hacia la
// contera, +Y hacia el lado del lomo (se lleva con el filo hacia arriba).
export function sayaParts(j = 'saya') {
  const band = [];
  const us = [0, 0.15, 0.3, 0.45, 0.6, 0.72, 0.79];
  for (const u of us) band.push([u, katanaCurve(Math.min(u, K_LEN)) + 0.02]);
  for (const u of [...us].reverse()) band.push([u, katanaCurve(Math.min(u, K_LEN)) - 0.02]);
  const s = new THREE.Shape();
  s.moveTo(band[0][0], band[0][1]);
  for (let i = 1; i < band.length; i++) s.lineTo(band[i][0], band[i][1]);
  return [
    { j, type: 'shape', shape: s, s: [1, 1, 0.028], p: [0, 0, 0], r: [0, -90, 0], mat: 'lacquer', uvk: 1.2 },
    { j, type: 'box', s: [0.034, 0.046, 0.03], p: [0, 0, 0.012], mat: 'bone' },
    { j, type: 'box', s: [0.032, 0.044, 0.03], p: [0, katanaCurve(K_LEN) + 0.001, 0.78], mat: 'gold' },
    { j, type: 'box', s: [0.036, 0.012, 0.02], p: [0, 0.024, 0.11], mat: 'black' },
    { j, type: 'box', s: [0.012, 0.03, 0.12], p: [0.018, 0.0, 0.1], mat: 'clothWhite' },
  ];
}

// ------------------------------------------------------------- utilidades
// Fusiona piezas por material en mallas dentro de un grupo.
export function buildParts(parts, matFn = null) {
  const by = new Map();
  for (const pt of parts) {
    const key = pt.mat + (pt.ds ? '|ds' : '');
    if (!by.has(key)) by.set(key, { mat: pt.mat, ds: pt.ds, geos: [] });
    by.get(key).geos.push(partGeometry(pt));
  }
  const group = new THREE.Group();
  const meshes = [];
  for (const gr of by.values()) {
    const geo = gr.geos.length > 1 ? mergeGeometries(gr.geos) : gr.geos[0];
    geo.computeBoundingSphere();
    const mat = matFn ? matFn(gr.mat, gr.ds) : objMat(gr.mat, gr.ds ? { side: THREE.DoubleSide } : {});
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.matName = gr.mat;
    group.add(mesh);
    meshes.push(mesh);
  }
  return { group, meshes };
}

export const WEAPON_PARTS = {
  facon: faconParts,
  hacha: axeParts,
  lanza: spearParts,
  espada: (j) => swordParts(j),
  katana: katanaParts,
};

// Escudo colgado a la espalda (cuando se empuña un arma a dos manos).
export function backShield(matFn = null) {
  const o = buildParts(shieldParts('x'), matFn);
  o.group.position.set(0, 0.25, -0.215);
  o.group.rotation.set(0.1, Math.PI, 0);
  return o;
}

// Saya al costado izquierdo, pasada por el cinto, con el filo hacia arriba
// (espacio de la cadera: boca de la vaina, eje hacia la contera y lado del lomo).
export const SAYA = (() => {
  const Z = new THREE.Vector3(0.12, -0.36, -1).normalize();
  const Yv = new THREE.Vector3(0, -1, 0).addScaledVector(Z, Z.y).normalize();
  const X = new THREE.Vector3().crossVectors(Yv, Z).normalize();
  return { mouth: new THREE.Vector3(0.14, 0.07, 0.15), X, Y: Yv, Z };
})();
export function hipSaya(matFn = null) {
  const o = buildParts(sayaParts('x'), matFn);
  o.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(SAYA.X, SAYA.Y, SAYA.Z));
  o.group.position.copy(SAYA.mouth);
  return o;
}
