// PLAN C, primera forma: LA PROCESIÓN (98 m de largo, 30 de alto con la cabeza alzada).
//
// «Las puertas de la catedral están atrancadas por dentro. Durante dos días
// oímos rezar al otro lado. Después, sólo la campana.» Los fieles que se
// encerraron en la Sé con las cofradías y sus pasos se han fundido en una
// sola procesión que repta: un ciempiés de nazarenos. Cada anillo del cuerpo
// es un nudo de penitentes con sus túnicas cosidas a la carne; los capirotes
// (morados, blancos y rojos, según la cofradía) le forman una cresta a lo
// largo del lomo y sus brazos y piernas, larguísimos, son las patas. A
// cuestas lleva los tres pasos de la Semana Santa, con sus faldones, su
// candelería encendida y su palio, y las imágenes derretidas en carne: son
// los puntos débiles. A la cabeza, un nazareno gigante se alza como una cobra
// con la cruz de guía entre los brazos; los ojos le arden tras el antifaz.
// Por detrás arrastra cadenas y un incensario que humea.
//
// El cuerpo no lleva piel con huesos: cada anillo es una malla rígida que
// sigue un camino (como haría en el juego, siguiendo al de delante); sólo
// hay tres anillos distintos (geometría compartida).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Sculpt, ColossusModel, tubeGeo, hardGeo, V } from './sculpt_v1.js';
import { ColFX } from './colfx_v1.js';
import { colMat } from '../../src/gfx/materials.js';
import { RNG } from '../../src/core/util.js';

const DEG = Math.PI / 180;
const SEG = 4.3; // separación entre anillos
// cofradías: [capirote, túnica (esculpida), túnica (piezas)]
const BROTHERHOODS = [
  ['clothPurple', 'colRobeWhite', 'clothWhite'],
  ['clothWhite', 'colRobeDark', 'clothDark'],
  ['clothRed', 'colRobeWhite', 'clothWhite'],
];

// ------------------------------------------------------------ un anillo del cuerpo
// (espacio local: centro del anillo en el origen, +z hacia delante, +y arriba)
function segmentGeo(variant, seed) {
  const rng = new RNG(seed);
  const [hood, robeS, robe] = BROTHERHOODS[variant % 3];
  const sc = new Sculpt({ cell: 0.2, noise: { amp: 0.05, freq: 1.0, oct: 2, lump: 0.14, lumpFreq: 0.3, vein: 0.05, veinFreq: 0.5 }, aoDist: 1.6, aoStrength: 1.2, matNoise: 0.5, matFreq: 0.6 });
  // el núcleo de carne y la túnica que lo envuelve
  sc.ell([0, 0, 0], [2.2, 1.9, 2.5], { mat: 'colFlesh', k: 0.8 });
  sc.ell([0, 0.35, 0], [2.35, 1.75, 2.2], { mat: robeS, k: 0.6 });
  sc.ell([0, -0.9, 0.1], [1.7, 1.3, 2.3], { mat: 'colFlesh', k: 0.8 });
  // los penitentes fundidos: torsos que salen del lomo, inclinados hacia atrás
  const pen = [];
  const n = 4;
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * rng.range(0.5, 1.2);
    const z = (i < 2 ? 0.9 : -0.9) + rng.range(-0.3, 0.3);
    const tilt = rng.range(-18, 18);
    const base = [x, 1.3, z];
    const top = [x * 1.25, 2.9 + rng.range(-0.2, 0.3), z - 0.4];
    sc.rc(base, top, 0.75, 0.55, { mat: robeS, k: 0.4 });
    pen.push({ top, tilt, side });
  }
  // las costuras de carne entre la túnica (rajas)
  for (let i = 0; i < 3; i++) sc.ell([rng.range(-1.6, 1.6), rng.range(-0.2, 1.2), rng.range(-1.6, 1.6)], [0.5, 0.35, 0.9], { mat: 'colFlesh', k: 0.3, rot: [0, rng.range(0, 180), 0], n: 1.5 });
  const g = sc.build();
  g.deleteAttribute('skinIndex');
  g.deleteAttribute('skinWeight');
  const H = [];
  const add = (mat, geo, ds = false) => H.push({ mat, geo, ds });
  const tube = (mat, pts, radii, o = {}) => add(mat, tubeGeo(pts.map((p) => V(...p)), radii, o));
  // capirotes: el cono, la capa que cae sobre los hombros y el antifaz con
  // los agujeros de los ojos
  for (const p of pen) {
    const t = V(...p.top);
    const h = rng.range(2.2, 2.9);
    add(hood, hardGeo({ type: 'cone', s: [0.56, h], seg: 10, p: [t.x, t.y + 0.55 + h / 2, t.z - 0.05], r: [-10, 0, p.side * 5], mat: hood }));
    add(hood, hardGeo({ type: 'cyl', s: [0.6, 1.05, 1.1], seg: 10, p: [t.x, t.y + 0.05, t.z], r: [-6, 0, 0], mat: hood }));
    add(hood, hardGeo({ type: 'box', s: [0.95, 1.0, 0.07], p: [t.x, t.y - 0.25, t.z + 0.95], r: [12, 0, 0], taper: [1.2, 1], mat: hood }), true);
    for (const sx of [-1, 1]) add('black', hardGeo({ type: 'box', s: [0.16, 0.12, 0.06], p: [t.x + sx * 0.17, t.y + 0.38, t.z + 0.62], r: [-6, 0, 0], mat: 'black', ao: false }));
    // un brazo que se alza con un cirio, a veces
    if (rng.chance(0.35)) {
      const hand = [t.x + p.side * 0.9, t.y + 0.9, t.z + 0.6];
      tube('colSkin', [[t.x + p.side * 0.5, t.y - 0.5, t.z], [t.x + p.side * 0.95, t.y + 0.1, t.z + 0.4], hand], [0.14, 0.12, 0.1], { radial: 5 });
      add('candle', hardGeo({ type: 'cyl', s: [0.07, 0.07, 1.4], seg: 6, p: [hand[0], hand[1] + 0.6, hand[2]], mat: 'candle', ao: false }));
    }
  }
  // patas: dos pares, un brazo y una pierna de cada lado (dobladas como de ciempiés)
  for (const s of [1, -1])
    for (const [k, z, arm] of [
      [0, 1.2, true],
      [1, -1.2, false],
    ]) {
      const hip = [s * 1.7, -0.4, z];
      const knee = [s * 3.4, 1.4 + (arm ? 0.2 : 0), z + (arm ? 0.6 : -0.4)];
      const foot = [s * 4.4, -2.55, z + (arm ? 1.0 : -0.6)];
      tube(arm ? 'colSkin' : 'colSkin', [hip, knee, foot], [arm ? 0.38 : 0.46, arm ? 0.28 : 0.33, arm ? 0.2 : 0.24], { radial: 6, perM: 2 });
      add('colSkin', hardGeo({ type: 'sphere', s: [arm ? 0.32 : 0.38], seg: 6, seg2: 4, p: knee, mat: 'colSkin' }));
      // la manga o la pernera de la túnica
      add(robe, hardGeo({ type: 'cyl', s: [arm ? 0.5 : 0.56, arm ? 0.42 : 0.5, 1.5], seg: 7, p: [(hip[0] + knee[0]) / 2, (hip[1] + knee[1]) / 2, (hip[2] + knee[2]) / 2], r: [0, 0, -s * 47], mat: robe, open: true }), true);
      if (arm) {
        // mano abierta apoyada en el suelo
        for (let f = 0; f < 4; f++) tube('colSkin', [[foot[0], foot[1] + 0.1, foot[2]], [foot[0] + s * 0.25, foot[1] - 0.05, foot[2] + (f - 1.5) * 0.18 + 0.45]], [0.07, 0.05], { radial: 4 });
      } else add('colSkin', hardGeo({ type: 'box', s: [0.36, 0.24, 0.9], p: [foot[0], foot[1] - 0.05, foot[2] + 0.3], mat: 'colSkin' }));
    }
  // una cuerda de esparto a la cintura y un cíngulo con borla
  tube('rope', [[-2.2, 0.0, 1.0], [0, 0.4, 2.25], [2.2, 0.0, 1.0]], [0.09, 0.09, 0.09], { radial: 4 });
  return { flesh: g, hard: H, matNames: sc.mats };
}

// ------------------------------------------------------------ un paso de Semana Santa
// (espacio local del anillo que lo lleva; la plataforma sobre el lomo)
function pasoParts(kind, rng) {
  const P = [];
  const add = (mat, geo, ds = false) => P.push({ mat, geo, ds });
  const box = (mat, s, p, r = [0, 0, 0], o = {}) => add(mat, hardGeo({ type: 'box', s, p, r, mat, ...o }), !!o.ds);
  const Y = 3.1;
  // la parihuela: canasto dorado y faldones de terciopelo bordado
  box('wooddark', [3.6, 0.5, 5.8], [0, Y, 0]);
  box('gold', [3.8, 0.24, 6.0], [0, Y + 0.3, 0]);
  for (const s of [1, -1]) {
    box('clothPurple', [0.06, 1.7, 5.8], [s * 1.86, Y - 0.85, 0], [0, 0, s * 4], { ds: true });
    box('colOrphrey', [0.08, 0.3, 5.8], [s * 1.9, Y - 0.1, 0], [0, 0, s * 4]);
  }
  for (const s of [1, -1]) {
    box('clothPurple', [3.6, 1.7, 0.06], [0, Y - 0.85, s * 2.92], [s * -4, 0, 0], { ds: true });
    box('colOrphrey', [3.6, 0.3, 0.08], [0, Y - 0.1, s * 2.96], [s * -4, 0, 0]);
  }
  // la candelería: filas de cirios en candeleros de plata delante de la imagen
  const candles = [];
  for (let r = 0; r < 4; r++)
    for (let i = 0; i < 7 - r; i++) {
      const x = (i - (6 - r) / 2) * 0.42;
      const z = 2.3 - r * 0.38;
      const h = 0.6 + r * 0.3;
      add('silver', hardGeo({ type: 'cyl', s: [0.07, 0.11, h], seg: 6, p: [x, Y + 0.42 + h / 2, z], mat: 'silver' }));
      add('candle', hardGeo({ type: 'cyl', s: [0.06, 0.06, 0.55], seg: 6, p: [x, Y + 0.42 + h + 0.28, z], mat: 'candle', ao: false }));
      candles.push([x, Y + 0.42 + h + 0.6, z]);
    }
  // el palio: varales de plata y el techo de terciopelo con sus bambalinas
  if (kind === 'virgen') {
    for (const sx of [-1, 1]) for (const zz of [-2.6, -0.9, 0.9, 2.6]) add('silver', hardGeo({ type: 'cyl', s: [0.07, 0.07, 4.2], seg: 6, p: [sx * 1.6, Y + 2.4, zz], mat: 'silver' }));
    box('clothPurple', [3.6, 0.2, 5.8], [0, Y + 4.5, 0]);
    for (const s of [1, -1]) {
      box('clothPurple', [0.05, 0.9, 5.8], [s * 1.82, Y + 4.05, 0], [0, 0, 0], { ds: true });
      box('colOrphrey', [0.07, 0.18, 5.8], [s * 1.84, Y + 3.66, 0]);
    }
    // la Dolorosa: manto negro en campana, la cara, la corona y la ráfaga de plata
    add('clothDark', hardGeo({ type: 'lathe', points: [[1.15, 0], [1.05, 0.6], [0.8, 1.4], [0.55, 2.0], [0.42, 2.45], [0.3, 2.7], [0.02, 2.75]], seg: 12, p: [0, Y + 0.45, -0.6], mat: 'clothDark' }));
    add('colSkin', hardGeo({ type: 'sphere', s: [0.32, 0.4, 0.34], seg: 8, seg2: 6, p: [0, Y + 3.05, -0.45], mat: 'colSkin' }));
    add('clothWhite', hardGeo({ type: 'box', s: [0.7, 0.8, 0.5], p: [0, Y + 2.9, -0.48], taper: [1.3, 1], mat: 'clothWhite' }));
    add('silver', hardGeo({ type: 'torus', s: [0.85, 0.05], seg: 20, p: [0, Y + 3.35, -0.75], mat: 'silver' }));
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      add('silver', hardGeo({ type: 'cone', s: [0.05, 0.6], seg: 4, p: [Math.cos(a) * 1.15, Y + 3.35 + Math.sin(a) * 1.15, -0.77], r: [0, 0, a / DEG - 90], mat: 'silver' }));
    }
    add('gold', hardGeo({ type: 'cyl', s: [0.3, 0.24, 0.35], seg: 8, p: [0, Y + 3.55, -0.45], mat: 'gold' }));
    // lágrimas de sangre y las manos juntas
    for (const sx of [-1, 1]) add('blood', hardGeo({ type: 'box', s: [0.04, 0.28, 0.02], p: [sx * 0.12, Y + 2.95, -0.13], mat: 'blood', ao: false }));
  } else {
    // el Nazareno con la cruz a cuestas, doblado bajo ella
    add('clothPurple', hardGeo({ type: 'lathe', points: [[0.9, 0], [0.8, 0.8], [0.6, 1.6], [0.48, 2.1], [0.02, 2.2]], seg: 10, p: [0, Y + 0.45, -0.4], r: [14, 0, 0], mat: 'clothPurple' }));
    add('colSkin', hardGeo({ type: 'sphere', s: [0.3, 0.36, 0.32], seg: 8, seg2: 6, p: [0, Y + 2.55, 0.05], mat: 'colSkin' }));
    add('wooddark', hardGeo({ type: 'box', s: [0.32, 0.32, 5.2], p: [0.4, Y + 2.3, -1.0], r: [-18, 8, 0], mat: 'wooddark' }));
    add('wooddark', hardGeo({ type: 'box', s: [2.6, 0.3, 0.3], p: [0.42, Y + 2.65, 0.3], r: [-18, 8, 0], mat: 'wooddark' }));
    add('gold', hardGeo({ type: 'torus', s: [0.45, 0.04], seg: 16, p: [0, Y + 2.75, -0.15], mat: 'gold' }));
  }
  return { parts: P, candles };
}

// ------------------------------------------------------------ el modelo
// path: puntos del camino (cabeza primero) [x, y, z]; up: normal del suelo en
// cada punto (opcional). La cabeza se alza sobre el primero.
export function buildProcesion(o = {}) {
  const rng = new RNG(o.seed || 41);
  const S = o.scale ?? 1.6;
  const path = (o.path || [
    [0, 2.6, 26],
    [4, 2.6, 16],
    [2, 2.6, 6],
    [-4, 2.6, -2],
    [-6, 2.6, -12],
    [-1, 2.6, -22],
    [6, 2.6, -30],
    [6, 2.6, -40],
  ]).map((p) => V(...p).multiplyScalar(1 / S));
  const ups = (o.ups || path.map(() => [0, 1, 0])).map((u) => V(...u).normalize());
  const curve = new THREE.CatmullRomCurve3(path, false, 'centripetal');
  const upCurve = new THREE.CatmullRomCurve3(ups.map((u, i) => path[i].clone().add(u)), false, 'centripetal');
  const L = curve.getLength();
  const N = Math.min(o.segments || 14, Math.floor(L / SEG));
  const bones = [{ name: 'root', pos: [0, 0, 0] }];
  const frames = [];
  for (let i = 0; i < N; i++) {
    const u = Math.min(1, (i * SEG) / L);
    const p = curve.getPointAt(u);
    const tg = curve.getTangentAt(u).negate(); // hacia la cabeza
    const up = upCurve.getPointAt(u).sub(p).normalize();
    const side = up.clone().cross(tg).normalize();
    const upO = tg.clone().cross(side).normalize();
    frames.push({ p, m: new THREE.Matrix4().makeBasis(side, upO, tg) });
    bones.push({ name: 's' + i, parent: 'root', pos: p.toArray() });
  }
  bones.push({ name: 'head', parent: 's0', pos: frames[0].p.clone().add(V(0, 5, 0)).toArray() });
  const M = new ColossusModel(bones);
  // tres anillos distintos, compartidos
  const variants = [0, 1, 2].map((v) => segmentGeo(v, 100 + v * 17));
  const mats = { flesh: null };
  for (let i = 1; i < N; i++) {
    const v = variants[i % 3];
    const f = frames[i];
    const bone = M.byName['s' + i];
    // escala: los anillos de la cola, más pequeños
    const k = i > N - 4 ? 1 - (i - (N - 4)) * 0.12 : 1;
    const local = new THREE.Matrix4().copy(f.m).scale(V(k, k, k * 1.08));
    const flesh = new THREE.Mesh(v.flesh, v.mats || (v.mats = v.matNames.map((m) => colMat(m))));
    flesh.matrixAutoUpdate = false;
    flesh.matrix.copy(local);
    flesh.frustumCulled = false;
    bone.add(flesh);
    if (!v.hardMeshes) {
      const by = new Map();
      for (const h of v.hard) {
        const key = h.mat + (h.ds ? '|ds' : '');
        if (!by.has(key)) by.set(key, { mat: h.mat, ds: h.ds, geos: [] });
        by.get(key).geos.push(h.geo);
      }
      v.hardMeshes = [...by.values()].map((b) => ({ geo: mergeGeometries(b.geos), mat: colMat(b.mat, { side: b.ds ? THREE.DoubleSide : THREE.FrontSide }) }));
    }
    for (const hm of v.hardMeshes) {
      const m = new THREE.Mesh(hm.geo, hm.mat);
      m.matrixAutoUpdate = false;
      m.matrix.copy(local);
      m.frustumCulled = false;
      bone.add(m);
    }
  }
  void mats;
  // la cabeza: el nazareno gigante que se alza con la cruz de guía
  const H = [];
  const f0 = frames[0];
  const toW = (x, y, z) => V(x, y, z).applyMatrix4(f0.m).add(f0.p);
  {
    const sc = new Sculpt({ cell: 0.24, bones: M.index, noise: { amp: 0.05, freq: 1.0, oct: 2, lump: 0.15, lumpFreq: 0.25, vein: 0.05, veinFreq: 0.5 }, aoDist: 2, aoStrength: 1.2, matNoise: 0.5, matFreq: 0.5 });
    // el anillo de delante, más grueso, y el torso que se alza como una cobra
    sc.ell(toW(0, 0, 0).toArray(), [2.6, 2.2, 2.8], { bone: 's0', mat: 'colFlesh', k: 0.9 });
    sc.ell(toW(0, 0.4, 0).toArray(), [2.7, 2.0, 2.5], { bone: 's0', mat: 'colRobeWhite', k: 0.7 });
    sc.rc(toW(0, 1.2, -0.3).toArray(), toW(0, 5.2, 1.4).toArray(), 2.2, 1.65, { bone: 'head', mat: 'colRobeWhite', k: 0.9 });
    sc.rc(toW(0, 5.2, 1.4).toArray(), toW(0, 8.4, 2.2).toArray(), 1.65, 1.25, { bone: 'head', mat: 'colRobeWhite', k: 0.7 });
    sc.ell(toW(0, 3.2, 1.0).toArray(), [1.6, 1.4, 1.2], { bone: 'head', mat: 'colFlesh', k: 0.6, n: 1.5 });
    // los hombros y los brazos que abrazan la cruz
    for (const s of [1, -1]) {
      sc.ell(toW(s * 1.5, 7.9, 2.0).toArray(), [1.0, 0.9, 1.0], { bone: 'head', mat: 'colRobeWhite', k: 0.6 });
      sc.rc(toW(s * 1.8, 7.7, 2.2).toArray(), toW(s * 1.4, 5.6, 3.9).toArray(), 0.7, 0.55, { bone: 'head', mat: 'colRobeWhite', k: 0.4 });
      sc.rc(toW(s * 1.4, 5.6, 3.9).toArray(), toW(s * 0.45, 6.6, 4.1).toArray(), 0.5, 0.4, { bone: 'head', mat: 'colSkin', k: 0.35 });
    }
    const g = sc.build();
    M.skinned(g, sc.mats);
    // el capirote gigante, el antifaz y los ojos
    const hoodTop = toW(0, 13.6, 2.0);
    const hb = toW(0, 8.9, 2.4);
    H.push({ bone: 'head', mat: 'clothPurple', geo: coneBetween(hb, hoodTop, 1.45) });
    H.push({ bone: 'head', mat: 'clothPurple', ds: true, geo: panel(toW(0, 7.6, 3.55), f0.m, [2.6, 3.0], [10, 0, 0], 'clothPurple') });
    for (const s of [1, -1]) H.push({ bone: 'head', mat: 'black', geo: panel(toW(s * 0.45, 8.9, 3.42), f0.m, [0.42, 0.3], [10, 0, 0], 'black') });
    // la cruz de guía: el asta y la cruz de plata labrada, con su manguilla
    const pole0 = toW(0.0, 3.0, 4.6),
      pole1 = toW(0.0, 15.5, 5.6);
    H.push({ bone: 'head', mat: 'silver', geo: tubeGeo([pole0, pole1], [0.16, 0.14], { radial: 7 }) });
    const cx = toW(0, 14.6, 5.55);
    H.push({ bone: 'head', mat: 'silver', geo: panel(cx, f0.m, [3.4, 0.36], [0, 0, 0], 'silver', 0.3) });
    H.push({ bone: 'head', mat: 'silver', geo: panel(toW(0, 15.2, 5.6), f0.m, [0.36, 2.2], [0, 0, 0], 'silver', 0.3) });
    for (const [x, y] of [
      [1.75, 14.6],
      [-1.75, 14.6],
      [0, 16.35],
    ])
      H.push({ bone: 'head', mat: 'gold', geo: hardGeo({ type: 'sphere', s: [0.28], seg: 8, seg2: 6, p: toW(x, y, 5.6).toArray(), mat: 'gold' }) });
    H.push({ bone: 'head', mat: 'clothPurple', ds: true, geo: panel(toW(0, 12.4, 5.7), f0.m, [0.9, 1.8], [0, 0, 0], 'clothPurple') });
  }
  // los pasos sobre los anillos 3, 7 y 11
  const pasoFx = [];
  for (const [si, kind] of [
    [3, 'cristo'],
    [7, 'virgen'],
    [11, 'cristo'],
  ]) {
    if (si >= N) continue;
    const f = frames[si];
    const { parts, candles } = pasoParts(kind, rng);
    const by = new Map();
    for (const pt of parts) {
      const key = pt.mat + (pt.ds ? '|ds' : '');
      if (!by.has(key)) by.set(key, { mat: pt.mat, ds: pt.ds, geos: [] });
      by.get(key).geos.push(pt.geo);
    }
    for (const b of by.values()) {
      const m = new THREE.Mesh(mergeGeometries(b.geos), colMat(b.mat, { side: b.ds ? THREE.DoubleSide : THREE.FrontSide }));
      m.matrixAutoUpdate = false;
      m.matrix.copy(f.m);
      m.frustumCulled = false;
      M.byName['s' + si].add(m);
    }
    pasoFx.push({ si, candles: candles.map((c) => V(...c).applyMatrix4(f.m).add(f.p)) });
    // la carne que se ha comido la parihuela por debajo
    void kind;
  }
  // la cola: cadenas que arrastra y un incensario
  {
    const fl = frames[N - 1];
    const a = V(0, -0.5, -2.0).applyMatrix4(fl.m).add(fl.p);
    const b = a.clone().add(V(0, -2.3, 0)).addScaledVector(V(0, 0, -1).applyMatrix4(fl.m), 3);
    H.push({ bone: 's' + (N - 1), mat: 'iron', geo: tubeGeo([a, a.clone().lerp(b, 0.5).add(V(0, -0.6, 0)), b], [0.08, 0.08, 0.08], { radial: 4 }) });
    H.push({ bone: 's' + (N - 1), mat: 'colBronze', geo: hardGeo({ type: 'sphere', s: [0.55], seg: 8, seg2: 6, p: b.toArray(), mat: 'colBronze' }) });
  }
  M.rigid(H);
  // ------------------------------------------------------------ fuegos: candelería, ojos
  const fx = new ColFX(M);
  for (const p of pasoFx) for (const c of p.candles) fx.flame('s' + p.si, c.toArray(), [0.36, 0.62]);
  for (const p of pasoFx) fx.light('s' + p.si, frames[p.si].p.clone().add(V(0, 5.5, 0)).toArray(), 0xffb060, 40, 18);
  for (const s of [1, -1]) {
    fx.glow('head', toW(s * 0.45, 8.9, 3.7).toArray(), 1.6, 0xffa050, { pulse: 0.1 });
    fx.glow('head', toW(s * 0.45, 8.9, 3.65).toArray(), 0.5, 0xffffff, { pulse: 0.05 });
  }
  M.root.scale.setScalar(S);
  // largo: del anillo de la cabeza a las cadenas y el incensario de la cola;
  // alto: de la cabeza alzada sobre el primer punto del camino
  return { model: M, fx, info: { name: 'La Procesión', length: Math.round(((N - 1) * SEG + 5.4) * S), segments: N, height: Math.round((path[0].y + 16.6) * S) } };
}

// cono (capirote) de la base a la punta
function coneBetween(a, b, r) {
  const d = b.clone().sub(a);
  const L = d.length();
  const g = hardGeo({ type: 'cone', s: [r, L], seg: 10, p: [0, L / 2, 0], mat: 'clothPurple' });
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()));
  g.translate(a.x, a.y, a.z);
  return g;
}
// panel plano (w×h) en c, orientado con el marco m y girado r (grados)
function panel(c, m, wh, r, mat, depth = 0.06) {
  const g = hardGeo({ type: 'box', s: [wh[0], wh[1], depth], p: [0, 0, 0], r, mat });
  const rot = new THREE.Matrix4().extractRotation(m);
  g.applyMatrix4(rot);
  g.translate(c.x, c.y, c.z);
  return g;
}
