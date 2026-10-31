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

// ------------------------------------------------------------- Solingen
// La espada del padre de Henrique, del Sacro Imperio, de las de hace cien
// años: hoja ancha de filos paralelos que se afilan en el último tercio, con
// sus biseles y un vaceo ancho que llega casi a la punta; en el vaceo, letras
// de latón incrustadas, en una cara + IN NOMINE DOMINI + y en la otra el
// nombre del que la forjó, + CONRADVS ME FECIT +. Guarda recta de hierro, en
// el plano de la hoja, que se ensancha en las puntas; puño de cuero sobre
// madera con tres anillos de cordel debajo; pomo de rueda con su chaflán, el
// botón y una cruz de latón en cada cara; encima, el remache de la espiga.
// Es la espada que está clavada en la repisa del hogar de Henrique: de cerca
// se tiene que poder leer.
const SOL_L = 0.96; // la hoja, de la guarda a la punta
const SOL_B = 0.13; // donde arranca la hoja
// la inscripción: de dónde a dónde, a lo largo de la hoja, y su ancho (el del
// vaceo); en la textura, cada cara su franja (de 0 a 1 en v, de abajo arriba)
const SOL_INS = { z0: SOL_B + 0.04, z1: SOL_B + 0.34, w: 0.02, x: 0.0065, bands: [[0.875, 0.59375], [0.375, 0.09375]] };

// Las dos tiras de la inscripción, sobre el vaceo: la de +X lleva la primera
// franja de la textura y la de -X, la segunda. Se leen de la guarda a la
// punta (en la de +X, con la cabeza de las letras hacia -Y; en la de -X,
// hacia +Y: así las dos se leen de izquierda a derecha).
function inscriptionGeo() {
  const I = SOL_INS;
  const pos = [],
    nor = [],
    uv = [];
  for (const [sx, band] of [
    [1, I.bands[0]],
    [-1, I.bands[1]],
  ]) {
    const x = sx * I.x;
    const up = -sx; // hacia dónde va la cabeza de las letras (en y)
    const yT = Y + (up * I.w) / 2,
      yB = Y - (up * I.w) / 2;
    const [vT, vB] = band;
    // A (z0, arriba), B (z1, arriba), C (z1, abajo), D (z0, abajo)
    const A = [x, yT, I.z0, 0, vT],
      B = [x, yT, I.z1, 1, vT],
      C = [x, yB, I.z1, 1, vB],
      D = [x, yB, I.z0, 0, vB];
    // (el orden de los vértices, según la cara: la normal hacia fuera)
    const n = (D[1] - A[1]) * (C[2] - A[2]) - (D[2] - A[2]) * (C[1] - A[1]);
    const tris = Math.sign(n) === sx ? [A, D, C, A, C, B] : [A, C, D, A, B, C];
    for (const v of tris) {
      pos.push(v[0], v[1], v[2]);
      nor.push(sx, 0, 0);
      uv.push(v[3], v[4]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}
let INS_GEO = null;

export function solingenParts(j = 'sword') {
  const L = SOL_L,
    B = SOL_B;
  const mirror = (pts) => [...pts, ...pts.slice(0, -1).reverse().map(([u, v]) => [u, -v])];
  INS_GEO = INS_GEO || inscriptionGeo();
  const parts = [
    // el puño: algo panzudo, de cuero; debajo, tres anillos de cordel
    { j, type: 'cyl', s: [0.0205, 0.0215, 0.184], p: [0, Y, -0.004], r: [90, 0, 0], seg: 8, mat: 'leather' },
    ...[-0.052, -0.004, 0.044].map((z) => ({ j, type: 'cyl', s: [0.0232, 0.0232, 0.009], p: [0, Y, z], r: [90, 0, 0], seg: 8, mat: 'leather' })),
    // las virolas, junto a la guarda y junto al pomo
    { j, type: 'cyl', s: [0.0245, 0.023, 0.016], p: [0, Y, 0.09], r: [90, 0, 0], seg: 8, mat: 'pavonado' },
    { j, type: 'cyl', s: [0.023, 0.0255, 0.014], p: [0, Y, -0.098], r: [90, 0, 0], seg: 8, mat: 'pavonado' },
    // el pomo de rueda (en el plano de la hoja): el disco, el chaflán, el
    // botón; la cruz de latón en cada cara y el remache encima
    { j, type: 'cyl', s: [0.047, 0.047, 0.022], p: [0, Y, -0.13], r: [0, 0, 90], seg: 12, mat: 'pavonado' },
    { j, type: 'cyl', s: [0.039, 0.039, 0.031], p: [0, Y, -0.13], r: [0, 0, 90], seg: 12, mat: 'pavonado' },
    { j, type: 'cyl', s: [0.025, 0.025, 0.041], p: [0, Y, -0.13], r: [0, 0, 90], seg: 10, mat: 'pavonado' },
    ...[1, -1].flatMap((sx) => [
      { j, type: 'box', s: [0.003, 0.0065, 0.034], p: [sx * 0.0215, Y, -0.13], mat: 'gold' },
      { j, type: 'box', s: [0.003, 0.034, 0.0065], p: [sx * 0.0215, Y, -0.13], mat: 'gold' },
    ]),
    { j, type: 'cyl', s: [0.0085, 0.011, 0.012], p: [0, Y, -0.182], r: [90, 0, 0], seg: 6, mat: 'pavonado' },
    // la guarda: en medio, el escusón; los brazos, que engordan hacia las
    // puntas, y los remates
    { j, type: 'box', s: [0.03, 0.05, 0.036], p: [0, Y, 0.112], mat: 'pavonado' },
    { j, type: 'box', s: [0.022, 0.11, 0.026], p: [0, Y + 0.08, 0.112], taper: [0.78, 0.8], mat: 'pavonado' },
    { j, type: 'box', s: [0.022, 0.11, 0.026], p: [0, Y - 0.08, 0.112], r: [0, 0, 180], taper: [0.78, 0.8], mat: 'pavonado' },
    { j, type: 'box', s: [0.029, 0.02, 0.033], p: [0, Y + 0.143, 0.112], mat: 'pavonado' },
    { j, type: 'box', s: [0.029, 0.02, 0.033], p: [0, Y - 0.143, 0.112], mat: 'pavonado' },
    // la hoja: los filos (finos, a todo lo ancho), el lomo de los biseles
    // (más grueso y más estrecho) y el vaceo, oscuro
    profile(
      mirror([
        [0, 0.03],
        [L * 0.6, 0.0285],
        [L * 0.84, 0.021],
        [L * 0.95, 0.0095],
        [L, 0],
      ]),
      B,
      0.006,
      'plate',
      j
    ),
    profile(
      mirror([
        [0, 0.0195],
        [L * 0.6, 0.0182],
        [L * 0.84, 0.0128],
        [L * 0.95, 0.005],
        [L * 0.985, 0],
      ]),
      B,
      0.0105,
      'plate',
      j
    ),
    profile(
      mirror([
        [0, 0.0105],
        [L * 0.55, 0.0094],
        [L * 0.78, 0.004],
        [L * 0.82, 0],
      ]),
      B + 0.012,
      0.0118,
      'vaceo',
      j
    ),
    // las letras, en el vaceo
    { j, type: 'geo', geo: INS_GEO, uvk: 1, mat: 'inscripcion' },
  ];
  return parts;
}

// ------------------------------------------------------------- ballesta
// La ballesta de estribo del maestro ballestero: cureña de nogal con la
// culata alta, el arco de acero atado con cuerda a la cabeza, la cuerda tensa
// hasta la nuez, la llave larga por debajo y el estribo de hierro delante,
// donde se mete el pie para montarla. La mano derecha agarra la cureña junto
// a la llave; la izquierda, más adelante (grip2).
const XB = { z0: -0.27, z1: 0.46, prodZ: 0.42, tip: 0.33, nut: 0.06 };
export function ballestaParts(j = 'sword') {
  const P = [
    // la cureña, que se ensancha hacia la culata
    { j, type: 'box', s: [0.048, 0.056, XB.z1 - XB.z0 - 0.1], p: [0, Y + 0.004, (XB.z0 + XB.z1) / 2 + 0.05], mat: 'wooddark' },
    { j, type: 'box', s: [0.056, 0.1, 0.16], p: [0, Y - 0.018, XB.z0 + 0.08], taper: [0.85, 1.0], mat: 'wooddark' },
    { j, type: 'box', s: [0.06, 0.012, 0.05], p: [0, Y - 0.06, XB.z0 + 0.03], mat: 'iron' },
    // la canal del virote, la nuez y su pasador
    { j, type: 'box', s: [0.012, 0.004, 0.36], p: [0, Y + 0.0325, 0.22], mat: 'black' },
    { j, type: 'cyl', s: [0.022, 0.022, 0.05], p: [0, Y + 0.04, XB.nut], r: [0, 0, 90], seg: 8, mat: 'bone' },
    // la llave, larga, por debajo
    { j, type: 'box', s: [0.012, 0.012, 0.22], p: [0, Y - 0.05, -0.06], r: [6, 0, 0], mat: 'iron' },
    // los herrajes de la cabeza
    { j, type: 'box', s: [0.062, 0.068, 0.03], p: [0, Y + 0.004, XB.prodZ - 0.05], mat: 'iron' },
    { j, type: 'box', s: [0.07, 0.06, 0.07], p: [0, Y + 0.012, XB.prodZ], mat: 'rope' },
    // el estribo
    { j, type: 'torus', s: [0.055, 0.009], p: [0, Y + 0.005, XB.z1 + 0.05], r: [0, 90, 0], seg: 10, seg2: 3, mat: 'iron' },
  ];
  // el arco de acero: dos palas que se curvan hacia atrás
  for (const sx of [-1, 1]) {
    const tx = sx * XB.tip,
      tz = XB.prodZ - 0.07;
    const mx = tx / 2,
      mz = (XB.prodZ + tz) / 2;
    const L = Math.hypot(tx, tz - XB.prodZ);
    P.push({ j, type: 'box', s: [L, 0.026, 0.018], p: [mx, Y + 0.012, mz], r: [0, (Math.atan2(XB.prodZ - tz, sx * XB.tip) * 180) / Math.PI, 0], taper: [1, 0.7], mat: 'iron' });
    // la cuerda, de la punta a la nuez
    const dx = -tx,
      dz = XB.nut - tz;
    const Ls = Math.hypot(dx, dz);
    P.push({ j, type: 'box', s: [0.006, 0.006, Ls], p: [tx / 2, Y + 0.03, (tz + XB.nut) / 2], r: [0, (Math.atan2(dx, dz) * 180) / Math.PI, 0], mat: 'rope' });
  }
  return P;
}
// El virote montado en la canal (se ve sólo con la ballesta cargada).
export function viroteParts(j = 'sword') {
  return [
    { j, type: 'box', s: [0.011, 0.011, 0.34], p: [0, Y + 0.044, 0.25], mat: 'wooddark' },
    { j, type: 'cone', s: [0.013, 0.05], p: [0, Y + 0.044, 0.445], r: [90, 0, 0], seg: 4, mat: 'iron' },
    { j, type: 'box', s: [0.002, 0.026, 0.06], p: [0, Y + 0.058, 0.11], mat: 'clothWhite' },
  ];
}

export const WEAPON_PARTS = {
  facon: faconParts,
  hacha: axeParts,
  lanza: spearParts,
  espada: (j) => swordParts(j),
  solingen: solingenParts,
  katana: katanaParts,
  ballesta: ballestaParts,
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
