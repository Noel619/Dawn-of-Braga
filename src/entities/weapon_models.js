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

// ------------------------------------------------------------- hacha
// Hacha barbuda de mango largo (la de los leñadores del Gerês): un mango de
// fresno de 1,25 m con dos empuñaduras de cuero abajo, cerca del regatón,
// donde van las manos (la derecha, en z = 0; la izquierda, en AXE.grip2,
// casi en el cabo), y la cabeza de hierro lejos de ellas, con su filo de
// acero y el martillo detrás: alcanza, y el mango no se mete en el cuerpo.
// (z a lo largo del mango, desde el puño derecho: el ojo de la cabeza, el
// cabo, la izquierda; el centro del filo y del ojo, para quien lo necesite)
export const AXE = { eye: 0.74, butt: -0.42, top: 0.82, grip2: -0.3 };
const AXE_UP = AXE.eye - 0.45; // (cuánto más arriba va la cabeza que en el dibujo de la hoja)
export const AXE_HEAD = { eye: [0, Y, AXE.eye], edge: [0, Y - 0.25, AXE.eye - 0.01] };
export function axeParts(j = 'sword') {
  const L = AXE.top - AXE.butt;
  return [
    { j, type: 'box', s: [0.03, 0.038, L], p: [0, Y, (AXE.top + AXE.butt) / 2], mat: 'wooddark' },
    { j, type: 'box', s: [0.037, 0.045, 0.17], p: [0, Y, AXE.grip2], mat: 'leather' },
    { j, type: 'box', s: [0.036, 0.044, 0.12], p: [0, Y, 0.0], mat: 'leather' },
    { j, type: 'box', s: [0.042, 0.052, 0.035], p: [0, Y, AXE.butt + 0.0175], mat: 'iron' },
    // tachones
    ...[-0.15, 0.3, 0.5].map((z) => ({ j, type: 'box', s: [0.036, 0.046, 0.018], p: [0, Y, z], mat: 'iron' })),
    // cabeza: ojo, martillo y hoja barbuda (filo hacia -Y)
    { j, type: 'box', s: [0.05, 0.07, 0.15], p: [0, Y, AXE.eye], mat: 'iron' },
    { j, type: 'box', s: [0.042, 0.05, 0.075], p: [0, Y + 0.058, AXE.eye], mat: 'iron' },
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
      AXE_UP,
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
      AXE_UP,
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

// ------------------------------------------------------------- la oxidada
// La espada de munición, comida de herrumbre: hoja algo más corta, roja de
// óxido, con mellas en los filos; la cruz de hierro, torcida; el puño, con la
// tira de cuero medio deshecha.
export function oxidadaParts(j = 'sword') {
  const y = -0.05,
    len = 0.84;
  return [
    { j, type: 'cyl', s: [0.02, 0.023, 0.19], p: [0, y, 0.0], r: [90, 0, 0], seg: 6, mat: 'leather' },
    { j, type: 'box', s: [0.05, 0.012, 0.022], p: [0.018, y + 0.016, 0.04], r: [0, 0, 20], mat: 'leather' },
    { j, type: 'box', s: [0.24, 0.032, 0.04], p: [0, y, 0.105], r: [0, 0, 4], mat: 'iron' },
    { j, type: 'box', s: [0.045, 0.045, 0.045], p: [0.12, y + 0.01, 0.105], r: [0, 0, 45], mat: 'iron' },
    { j, type: 'box', s: [0.045, 0.045, 0.045], p: [-0.12, y - 0.006, 0.105], r: [0, 0, 45], mat: 'iron' },
    { j, type: 'box', s: [0.056, len, 0.014], p: [0, y, 0.125 + len / 2], r: [-90, 0, 0], taper: [0.24, 1], mat: 'plateRust' },
    { j, type: 'box', s: [0.012, len * 0.75, 0.018], p: [0, y, 0.145 + len * 0.375], r: [-90, 0, 0], mat: 'iron' },
    // las mellas: muescas oscuras en los dos filos
    ...[
      [0.026, 0.34],
      [-0.025, 0.5],
      [0.022, 0.66],
    ].map(([x, z]) => ({ j, type: 'box', s: [0.012, 0.018, 0.03], p: [x, y, z], mat: 'black' })),
    { j, type: 'ico', s: [0.034], p: [0, y, -0.115], mat: 'iron' },
  ];
}

// ------------------------------------------------------------- utilidades
// Un perfil (como profile) girado ang grados alrededor del eje del mango: las
// aletas de la maza, repartidas alrededor de su cabeza. (La geometría se hace
// aquí, ya girada: la pieza es de tipo 'geo'.)
function radialProfile(pts, u0, d, ang, mat, j) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.lineTo(pts[0][0], pts[0][1]);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  // (u -> +Z, v -> +Y y el grosor en X, como profile; luego, alrededor del eje)
  g.applyMatrix4(new THREE.Matrix4().makeRotationY(-Math.PI / 2));
  g.applyMatrix4(new THREE.Matrix4().makeRotationZ((ang * Math.PI) / 180));
  g.translate(0, Y, u0);
  return { j, type: 'geo', geo: g, uvk: 1.2, mat };
}

// ------------------------------------------------------------- maza
// La maza de armas de la guarnición (la que está en una de las celdas del
// pasillo de la mazmorra): cabeza de hierro de seis aletas, cada una con el
// canto gastado y brillante de tanto golpe, sobre su alma y rematada por una
// perilla en punta; el mango, de hierro, con su collar bajo la cabeza y dos
// anillos; el puño, forrado de cuero, y el pomo abajo. Corta (dos palmos y
// medio) y cargada de la cabeza. Es redonda: no tiene filo que llevar por
// delante.
// (z a lo largo del mango, desde el puño: la cabeza, de head0 a head1; r, lo
// que se abren sus aletas)
export const MACE = { head0: 0.35, head1: 0.5, top: 0.535, butt: -0.13, r: 0.06 };
// la aleta, de perfil (u a lo largo del mango, v hacia fuera): arranca dentro
// del alma, sale en rampa hasta su canto, recto, y se corta arriba en bisel
// hasta la punta
const ALETA = [
  [0, 0.012],
  [0.006, 0.022],
  [0.04, 0.057],
  [0.1, MACE.r],
  [0.128, 0.05],
  [0.146, 0.026],
  [0.15, 0.016],
  [0.15, 0.012],
];
export function maceParts(j = 'sword') {
  const H0 = MACE.head0,
    H1 = MACE.head1;
  // el canto de cada aleta: la tira de fuera (de la panza a la punta), un dedo
  // de ancha, en acero gastado
  const rim = ALETA.slice(1, 7);
  const canto = [...rim, ...rim.slice().reverse().map(([u, v]) => [u + (u < 0.05 ? 0.004 : u > 0.13 ? -0.004 : 0), v - 0.0075])];
  const P = [
    // el puño de cuero, sus dos vueltas y el pomo
    { j, type: 'cyl', s: [0.0195, 0.0205, 0.17], p: [0, Y, 0], r: [90, 0, 0], seg: 8, mat: 'leather' },
    ...[-0.045, 0.04].map((z) => ({ j, type: 'cyl', s: [0.0218, 0.0218, 0.008], p: [0, Y, z], r: [90, 0, 0], seg: 8, mat: 'leather' })),
    { j, type: 'cyl', s: [0.022, 0.025, 0.02], p: [0, Y, -0.095], r: [90, 0, 0], seg: 8, mat: 'iron' },
    { j, type: 'ico', s: [0.02, 0.016, 0.02], p: [0, Y, -0.113], mat: 'iron' },
    // la virola sobre el puño, el mango de hierro con sus dos anillos y el
    // collar bajo la cabeza
    { j, type: 'cyl', s: [0.022, 0.0215, 0.016], p: [0, Y, 0.09], r: [90, 0, 0], seg: 8, mat: 'iron' },
    { j, type: 'cyl', s: [0.0145, 0.0145, H0 - 0.09], p: [0, Y, (H0 + 0.09) / 2], r: [90, 0, 0], seg: 6, mat: 'iron' },
    ...[0.19, 0.27].map((z) => ({ j, type: 'cyl', s: [0.0175, 0.0175, 0.01], p: [0, Y, z], r: [90, 0, 0], seg: 6, mat: 'iron' })),
    { j, type: 'cyl', s: [0.022, 0.026, 0.016], p: [0, Y, H0 - 0.004], r: [90, 0, 0], seg: 6, mat: 'iron' },
    // el alma de la cabeza y la perilla en punta de arriba
    { j, type: 'cyl', s: [0.021, 0.023, H1 - H0 + 0.006], p: [0, Y, (H0 + H1) / 2], r: [90, 0, 0], seg: 6, mat: 'iron' },
    { j, type: 'cone', s: [0.018, MACE.top - H1], p: [0, Y, (H1 + MACE.top) / 2], r: [90, 0, 0], seg: 4, mat: 'iron' },
  ];
  // las seis aletas (entre los vértices del alma) con su canto
  for (let k = 0; k < 6; k++) {
    const a = 30 + k * 60;
    P.push(radialProfile(ALETA, H0, 0.0085, a, 'iron', j));
    P.push(radialProfile(canto, H0, 0.0105, a, 'plate', j));
  }
  return P;
}

// ------------------------------------------------------------- martillo de guerra
// Martillo de guerra a dos manos: mango de fresno de vara y cuarto, herrado
// arriba con dos lengüetas que bajan de la cabeza (con sus remaches), y dos
// empuñaduras de cuero abajo, donde van las manos (la derecha, en z = 0; la
// izquierda, en HAMMER.grip2, cerca del regatón, que es un casquillo de
// hierro; corto: no se mete en el cuerpo al golpear). La cabeza, lejos de las manos: la boca, cuadrada y abierta, con
// cuatro dientes de punta de diamante (hacia -Y: la que golpea, su «filo»);
// detrás, el pico de cuervo (hacia +Y), algo vencido hacia el mango; y arriba,
// la punta.
// (z a lo largo del mango, desde el puño derecho: el centro de la cabeza, el
// cabo y la punta; face y pick: lo que salen la boca y el pico del eje)
export const HAMMER = { head: 0.74, butt: -0.36, top: 0.925, grip2: -0.27, face: 0.13, pick: 0.215 };
export function warhammerParts(j = 'sword') {
  const H = HAMMER.head;
  // (el pico: una pirámide de cuatro caras desde el alma de la cabeza,
  // vencida 14° hacia el mango)
  const pa = (-14 * Math.PI) / 180,
    pl = 0.19,
    p0 = 0.032;
  return [
    // el mango, ochavado
    { j, type: 'cyl', s: [0.0185, 0.0185, 0.8 - HAMMER.butt], p: [0, Y, (0.8 + HAMMER.butt) / 2], r: [90, 0, 0], seg: 8, mat: 'wooddark' },
    // las empuñaduras de cuero, con sus vueltas
    { j, type: 'cyl', s: [0.0225, 0.0225, 0.13], p: [0, Y, 0], r: [90, 0, 0], seg: 8, mat: 'leather' },
    { j, type: 'cyl', s: [0.0225, 0.0225, 0.17], p: [0, Y, HAMMER.grip2], r: [90, 0, 0], seg: 8, mat: 'leather' },
    ...[0.065, -0.065, HAMMER.grip2 + 0.085, HAMMER.grip2 - 0.085].map((z) => ({ j, type: 'cyl', s: [0.0245, 0.0245, 0.008], p: [0, Y, z], r: [90, 0, 0], seg: 8, mat: 'leather' })),
    // el regatón: un casquillo de hierro con su botón
    { j, type: 'cyl', s: [0.021, 0.024, 0.045], p: [0, Y, HAMMER.butt + 0.02], r: [90, 0, 0], seg: 8, mat: 'iron' },
    { j, type: 'cyl', s: [0.024, 0.016, 0.014], p: [0, Y, HAMMER.butt - 0.009], r: [90, 0, 0], seg: 8, mat: 'iron' },
    // el anillo donde empiezan las lengüetas, las lengüetas y sus remaches
    { j, type: 'cyl', s: [0.022, 0.022, 0.016], p: [0, Y, 0.5], r: [90, 0, 0], seg: 8, mat: 'iron' },
    ...[1, -1].flatMap((sx) => [
      { j, type: 'box', s: [0.005, 0.017, 0.25], p: [sx * 0.0195, Y, 0.625], mat: 'iron' },
      ...[0.55, 0.66].map((z) => ({ j, type: 'box', s: [0.007, 0.008, 0.008], p: [sx * 0.022, Y, z], mat: 'iron' })),
    ]),
    // el alma de la cabeza
    { j, type: 'box', s: [0.054, 0.068, 0.12], p: [0, Y, H], mat: 'iron' },
    // la boca: abierta hacia la cara, con la cara de acero y sus cuatro dientes
    { j, type: 'box', s: [0.07, 0.08, 0.07], p: [0, Y - 0.074, H], taper: [1.2, 1.2], mat: 'iron' },
    { j, type: 'box', s: [0.088, 0.012, 0.088], p: [0, Y - 0.118, H], mat: 'plate' },
    ...[
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ].map(([sx, sz]) => ({ j, type: 'cone', s: [0.013, 0.014], p: [sx * 0.022, Y - 0.131, H + sz * 0.022], r: [180, 0, 0], seg: 4, mat: 'plate' })),
    // el pico de cuervo, con su cuello
    { j, type: 'box', s: [0.04, 0.03, 0.05], p: [0, Y + 0.045, H - 0.004], mat: 'iron' },
    { j, type: 'cone', s: [0.023, pl], p: [0, Y + p0 + (Math.cos(pa) * pl) / 2, H + (Math.sin(pa) * pl) / 2], r: [-14, 0, 0], seg: 4, mat: 'iron' },
    // la punta de arriba, con su base
    { j, type: 'box', s: [0.032, 0.032, 0.022], p: [0, Y, H + 0.065], mat: 'iron' },
    { j, type: 'cone', s: [0.016, 0.11], p: [0, Y, H + 0.13], r: [90, 0, 0], seg: 4, mat: 'iron' },
  ];
}

export const WEAPON_PARTS = {
  oxidada: oxidadaParts,
  hacha: axeParts,
  lanza: spearParts,
  espada: (j) => swordParts(j),
  solingen: solingenParts,
  ballesta: ballestaParts,
  maza: maceParts,
  martillo_guerra: warhammerParts,
};

// Escudo colgado a la espalda (cuando se empuña un arma a dos manos): por
// encima de la capa, que queda sujeta debajo (player.js no la deja
// separarse de la espalda más de lo que cabe entre los dos).
export function backShield(matFn = null) {
  const o = buildParts(shieldParts('x'), matFn);
  o.group.position.set(0, 0.25, -0.245);
  o.group.rotation.set(0.1, Math.PI, 0);
  return o;
}
