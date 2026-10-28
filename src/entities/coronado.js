// El Coronado: uno de los curados del Físico. Era un vecino sano del barrio
// (por eso, según Mestre Clemente, estaba enfermo): le durmió con la esponja,
// le abrió el cráneo con el trépano para que saliera el vapor de la peste y,
// para que la herida no se cerrara (el alma tiene que respirar), le atornilló
// un armazón de hierro: el aro a la altura de la frente, cuatro tornillos
// metidos en el hueso y, saliendo de él, varillas abiertas como una corona,
// con un cascabel en la punta de cada una, porque el que lleva cascabel no se
// esconde: así sabe siempre dónde está su rebaño. Va en camisón de lino, sucio
// y manchado, descalzo, con los brazos vendados de las sangrías y la cruz de
// cal a la espalda; un ojo cosido («el que miraba demasiado»; el otro, abierto
// de par en par, no parpadea); la boca, atada con una correa que pasa entre
// los dientes («la que preguntaba»). La cabeza le cuelga hacia un lado, del
// peso. No está infectado: está curado.
//
// Cómo se porta (CORONADO_TYPE):
//  - se le oye antes de verle: los cascabeles suenan a cada paso, y cuando
//    se queda quieto, a cada respingo de la cabeza;
//  - si te ve (el Físico les enseñó a reconocer la peste: eres tú, el sano),
//    sacude la cabeza con todas sus fuerzas: los cascabeles suenan por todo
//    el barrio y el Físico sabe dónde estás (game/fisico.js);
//  - el garfio que le quedó en la mano (se puede desviar), el cabezazo con la
//    corona (las varillas por delante: no se desvía) y el agarrón: si te
//    coge, te sujeta y sacude la cabeza (más cascabeles); forcejeando te
//    sueltas; si no, el cabezazo y te tira.
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { Rig, clip } from './rig.js';
import { MAT_DEFS } from '../gfx/materials.js';
import { tube, merge, place, gSph, gBox, gCyl, gTorus, folds, table, mix, sstep, ribbon, head } from './sculpt.js';
import { humanoidJoints, torso, pelvis, arms, legs, neckHead, gown, cord, TAU } from './figure.js';
import { DEG, clamp, damp, approachAngle, angleDiff } from '../core/util.js';
import { GAIT } from './locomotion.js';

export const CO_K = 1.02;
const K = CO_K;

// las varillas de la corona: [ángulo alrededor (desde la cara), largo,
// cuánto se abren, cuánto se tuercen]
const RODS = [
  [0.55, 0.27, 0.06, 0.2],
  [1.25, 0.31, 0.08, -0.15],
  [2.0, 0.24, 0.07, 0.25],
  [2.75, 0.3, 0.05, -0.1],
  [-2.75, 0.28, 0.06, 0.15],
  [-2.0, 0.33, 0.09, -0.25],
  [-1.25, 0.26, 0.07, 0.1],
  [-0.55, 0.29, 0.06, -0.2],
];
// el aro de la corona: centro y semiejes (en el espacio de la cabeza)
const RING = { y: 0.19, z: 0.004, rx: 0.106, rz: 0.124 };
const ringAt = (a, o = 0) => [Math.sin(a) * (RING.rx + o), RING.y, RING.z + Math.cos(a) * (RING.rz + o)];
// la punta de cada varilla (donde cuelga su cascabel)
const rodTip = (a, len, open, twist) => {
  const [x, y, z] = ringAt(a);
  const ox = Math.sin(a + twist) * open,
    oz = Math.cos(a + twist) * open;
  return [x + ox, y + len, z + oz];
};

// UV en metros por caras (como en el Turiferario)
function boxUV(g) {
  const h = g.index ? g.toNonIndexed() : g;
  const p = h.attributes.position;
  const uv = new Float32Array(p.count * 2);
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3(),
    n = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    n.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b));
    const ax = Math.abs(n.x),
      ay = Math.abs(n.y),
      az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const q = k === 0 ? a : k === 1 ? b : c;
      let u, v;
      if (ax >= ay && ax >= az) [u, v] = [q.z, q.y];
      else if (ay >= az) [u, v] = [q.x, q.z];
      else [u, v] = [q.x, q.y];
      uv[(i + k) * 2] = u;
      uv[(i + k) * 2 + 1] = v;
    }
  }
  h.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return h;
}
const P = (j, mat, geo, o = {}) => ({ j, type: 'geo', geo: boxUV(geo), mat, uvk: (MAT_DEFS[mat]?.uv ?? 1) * 1.6 * K, ...o });
const PD = (j, mat, geo, o = {}) => P(j, mat, geo, { ds: true, ...o });

// un pie descalzo, flaco, de dedos largos (la suela a ras del suelo)
function pieDescalzo() {
  const g = [
    tube(
      [
        [0, -0.012, -0.055],
        [0, -0.02, 0.03],
        [0, -0.026, 0.1],
      ],
      (s) =>
        table(
          [
            [0, 0.03, 0.027],
            [0.5, 0.04, 0.021],
            [1, 0.043, 0.013],
          ],
          s
        ),
      { up: [0, 1, 0], n: 6, seg: 8, caps: true, capL: 0.02 }
    ),
  ];
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.017 + (i === 0 ? -0.004 : 0);
    const l = [0.06, 0.055, 0.05, 0.045, 0.038][i];
    g.push(
      tube(
        [
          [x, -0.028, 0.094],
          [x * 1.1, -0.03, 0.094 + l * 0.6],
          [x * 1.15, -0.038, 0.094 + l],
        ],
        (s) => (i === 0 ? 0.01 : 0.0075) * mix(1, 0.72, s),
        { n: 4, seg: 5, caps: true, capL: 0.005 }
      )
    );
  }
  return merge(g);
}

// Las vendas de un antebrazo: el lino enrollado del codo a la muñeca (un
// manguito algo abultado, con la costura de cada vuelta en espiral), las
// manchas de las sangrías por dentro del brazo y el cabo suelto, colgando.
// (En el espacio del antebrazo: de y0 a y1, de radio r0 a r1.)
function vendas(y0, y1, r0, r1, seed) {
  const R = (s) => mix(r0, r1, s) + 0.0075;
  const venda = [
    tube(
      [
        [0, y0, 0],
        [0, mix(y0, y1, 0.5), 0.002],
        [0, y1, 0],
      ],
      (s, a) => R(s) * (1 + 0.05 * Math.sin(a * 2 + s * 9 + seed)),
      { n: 10, seg: 10, caps: true, capL: 0.006 }
    ),
  ];
  // la costura de las vueltas
  const turns = 6,
    N = 96;
  const pts = [];
  for (let k = 0; k <= N; k++) {
    const s = k / N;
    const a = s * turns * TAU + seed;
    const r = R(s) + 0.0012;
    pts.push([Math.sin(a) * r, mix(y0, y1, s) - 0.012 * Math.cos(a), Math.cos(a) * r]);
  }
  const costura = tube(pts, 0.0016, { n: N, seg: 4 });
  // el cabo, que cuelga de la muñeca
  const e = pts[N];
  venda.push(tube([e, [e[0] * 1.3, e[1] - 0.05, e[2] * 1.2], [e[0] * 1.5, e[1] - 0.1, e[2] * 1.1 + 0.01]], [0.011, 0.002], { n: 6, seg: 4, up: [Math.sin(turns * TAU + seed), 0, Math.cos(turns * TAU + seed)] }));
  // la sangre que pasó la venda, por dentro del brazo (hacia +x en el
  // izquierdo, -x en el derecho: lo da el signo de seed)
  const sx = seed > 1.5 ? -1 : 1;
  const sangre = [];
  for (const [v, h, w] of [
    [0.3, 0.035, 0.022],
    [0.42, 0.05, 0.016],
    [0.75, 0.025, 0.018],
  ]) {
    const r = R(v) + 0.0006;
    const a = sx * 0.85;
    sangre.push(place(new THREE.SphereGeometry(1, 8, 6), [Math.sin(a) * r, mix(y0, y1, v), Math.cos(a) * r], [0, (a * 180) / Math.PI, 0], [w * 0.5, h * 0.5, 0.0025]));
  }
  return { venda: merge(venda), costura, sangre: merge(sangre) };
}

// la cabeza: chupada, las cuencas hondas, la nariz afilada
const HEAD_O = { gaunt: 0.022, socket: 0.019, brow: 0.012, nose: 0.024, noseW: 1.1, cheek: 0.008, jaw: 0.88, chin: 0.004, mouth: 0.0, lips: 0.0, ears: 0.017 };
// Lo rapado de una cabeza: sus triángulos de la coronilla (por encima de
// las sienes, y por delante, de la frente), un poco hinchados (k).
function rapado(g, k) {
  const h = g.index ? g.toNonIndexed() : g.clone();
  const p = h.attributes.position;
  const keep = [];
  const v = new THREE.Vector3();
  const cy = 0.12;
  for (let i = 0; i < p.count; i += 3) {
    let ok = true;
    for (let j = 0; j < 3; j++) {
      v.fromBufferAttribute(p, i + j);
      // (la línea del pelo: alta en la frente, baja en la nuca, a la
      // altura de las orejas por los lados)
      const front = Math.max(0, v.z) / 0.09;
      const cut = mix(0.172, 0.208, Math.min(1, front)) - 0.05 * Math.max(0, -v.z / 0.1);
      if (v.y < cut) ok = false;
    }
    if (!ok) continue;
    for (let j = 0; j < 3; j++) {
      v.fromBufferAttribute(p, i + j);
      keep.push(v.x * k, cy + (v.y - cy) * k, v.z * k);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
  out.computeVertexNormals();
  return out;
}

// el perfil del camisón: [y (en el pecho), medio ancho, medio fondo], de
// abajo arriba; ceñido al cuerpo (los brazos van fuera), que se abre de la
// cintura abajo
const CAMISA = [
  [-0.74, 0.228, 0.196],
  [-0.48, 0.212, 0.174],
  [-0.22, 0.192, 0.15],
  [-0.02, 0.177, 0.134],
  [0.16, 0.174, 0.14],
  [0.32, 0.181, 0.146],
  [0.42, 0.192, 0.146],
  [0.47, 0.214, 0.138],
  [0.51, 0.2, 0.124],
  [0.545, 0.15, 0.104],
  [0.575, 0.098, 0.084],
  [0.6, 0.072, 0.07],
];
// (la espalda del camisón sigue la joroba)
const camCZ = (y) => -0.03 * sstep(0.05, 0.42, y);

export function buildCoronado() {
  const joints = humanoidJoints(K, { arm: 1.08 });
  // los cascabeles cuelgan de la punta de cada varilla (se mecen: ver
  // postPose)
  RODS.forEach(([a, len, open, tw], i) => {
    const t = rodTip(a, len, open, tw);
    joints.push({ name: 'b' + i, parent: 'head', pos: [t[0] * K, t[1] * K, t[2] * K] });
  });
  const parts = [];
  const sk = 'coSkin';
  const UV = (mat) => (MAT_DEFS[mat]?.uv ?? 1) * 1.6 * K;
  const fig = (list) => list.map((p) => ({ ...p, geo: boxUV(p.geo), uvk: UV(p.mat) }));

  // ---------------------------------------------------------- el cuerpo
  // flaco, encorvado, la piel gris; los pies descalzos
  parts.push(P('chest', sk, torso({ w: 0.86, dep: 0.9, hunch: 0.7, pecs: 0, blades: 0.06 })));
  parts.push(P('hips', sk, pelvis({ w: 0.9, dep: 0.92 })));
  parts.push(...fig(neckHead({ mat: sk, neckR: 0.041, neckF: 0.035, tendons: true, head: HEAD_O })));
  // la cabeza rapada: la sombra del pelo que vuelve a salir, del cogote a
  // la frente (una cáscara apenas más grande que el cráneo, recortada)
  parts.push(P('head', 'coStubble', rapado(head(HEAD_O), 1.012)));
  // (los brazos, sin la bola del hombro: la tapa el camisón)
  parts.push(...fig(arms({ mat: sk, armT: 0.8, arm: 1.08, upper: false, hand: { len: 1.2, thick: 0.8, curl: 0.42, claw: 0.32, spread: 0.4 }, handR: { curl: 0.92, claw: 0.1, spread: 0.08 } })));
  for (const s of ['L', 'R'])
    parts.push(
      P(
        'arm' + s,
        sk,
        tube(
          [
            [0, -0.015, 0],
            [0, -0.15, 0.004],
            [0, -0.324, 0],
          ],
          (q) => table([[0, 0.036, 0.038], [0.5, 0.031, 0.033], [1, 0.027, 0.028]], q),
          { n: 8, seg: 10, caps: true, capL: 0.03 }
        )
      )
    );
  parts.push(...fig(legs({ mat: sk, legT: 0.76, thighs: false }).filter((p) => !p.j.startsWith('foot'))));
  parts.push(P('footL', sk, pieDescalzo()), P('footR', sk, place(pieDescalzo(), [0, 0, 0], [0, 0, 0], [-1, 1, 1])));

  // ---------------------------------------------------------- la cara
  // (los ojos, en sus cuencas: x ±0,031, y 0,141)
  const EY = 0.141;
  // el de la derecha (-x), abierto de par en par, sin parpadear: el blanco
  // inyectado, la niña chica y un brillo frío; el cerco rojo
  parts.push(P('head', 'bone', gSph(0.0145, [-0.031, EY, 0.066], [1, 0.92, 0.8], 10, 8)));
  parts.push(P('head', 'black', gSph(0.0052, [-0.0305, EY + 0.001, 0.0772], [1, 1, 0.45], 8, 6)));
  parts.push(P('head', 'eyeCold', gSph(0.0016, [-0.0292, EY + 0.0025, 0.0796], [1, 1, 1], 6, 4)));
  parts.push(P('head', 'coBlood', gTorus(0.0128, 0.0016, [-0.031, EY, 0.0715], [0, 0, 0], 14, 3)));
  // el de la izquierda, cosido: el párpado hinchado y morado, la costura
  // negra de lado a lado y sus puntos, y el moratón alrededor
  parts.push(P('head', 'coBruise', gSph(1, [0.032, EY - 0.002, 0.06], [0.026, 0.02, 0.017], 10, 8)));
  parts.push(P('head', 'coBruise', gSph(1, [0.031, EY, 0.068], [0.0165, 0.0115, 0.0115], 10, 8)));
  {
    const g = [gBox(0.03, 0.0022, 0.003, [0.031, EY, 0.0795], [0, 10, -4])];
    for (let i = 0; i < 6; i++) {
      const x = 0.019 + i * 0.0047;
      g.push(gBox(0.0018, 0.0145, 0.0026, [x, EY - 0.0005, 0.0792 - Math.abs(x - 0.031) * 0.35], [8, (x - 0.031) * 600, (i % 2 ? 1 : -1) * 18]));
    }
    parts.push(P('head', 'black', merge(g)));
  }
  // la correa de la boca: la vuelta ceñida a la cabeza (por las mejillas
  // hundidas, tirante), el bocado de madera entre los dientes, los labios
  // estirados alrededor, rozados, y la hebilla en la mejilla
  {
    const YB = 0.06;
    const pts = [],
      ups = [];
    for (let k = 0; k <= 32; k++) {
      const a = (k / 32) * TAU;
      const front = Math.cos(a) > 0;
      const rx = front ? 0.0535 : 0.0745,
        rz = front ? 0.0935 : 0.079;
      pts.push([Math.sin(a) * rx, YB + 0.014 * Math.max(0, -Math.cos(a)) ** 2, Math.cos(a) * rz]);
      ups.push([Math.sin(a) / rx, 0, Math.cos(a) / rz]);
    }
    parts.push(P('head', 'leather', tube(pts, [0.0075, 0.0022], { n: 64, seg: 4, upFn: (q) => ups[Math.round(q * 32)] })));
    parts.push(P('head', 'black', gBox(0.046, 0.019, 0.012, [0, YB, 0.0862])));
    parts.push(P('head', 'wooddark', gCyl(0.0075, 0.0075, 0.082, 6, [0, YB, 0.0905], [0, 0, 90])));
    parts.push(P('head', 'coBlood', merge([gSph(1, [0.024, YB, 0.088], [0.006, 0.0045, 0.0025], 6, 4), gSph(1, [-0.024, YB, 0.088], [0.006, 0.0045, 0.0025], 6, 4)])));
    parts.push(P('head', 'iron', merge([gBox(0.017, 0.02, 0.004, [0.0505, YB, 0.068], [0, 48, 0]), gBox(0.004, 0.022, 0.006, [0.052, YB, 0.0695], [0, 48, 0])])));
  }
  // los puntos de la cabeza rapada: una costura de la sien a la nuca
  {
    const g = [];
    for (let i = 0; i < 10; i++) {
      const a = 1.15 + i * 0.2;
      const y = 0.205 + Math.sin(i * 0.7) * 0.006 + i * 0.002;
      const p = [Math.sin(a) * 0.084, y, Math.cos(a) * 0.092 - 0.006];
      g.push(gBox(0.0022, 0.013, 0.0026, p, [0, (a * 180) / Math.PI, 12]));
    }
    parts.push(P('head', 'black', merge(g)));
  }
  // ---------------------------------------------------------- la corona
  {
    const iron = [],
      blood = [];
    // el aro
    const ring = [];
    for (let k = 0; k <= 32; k++) ring.push(ringAt((k / 32) * TAU));
    iron.push(tube(ring, 0.0085, { n: 64, seg: 5 }));
    // los cuatro tornillos metidos en el hueso (delante, a los lados de la
    // frente; detrás, en la nuca) y la sangre seca que bajó de cada uno
    for (const a of [0.7, -0.7, 2.5, -2.5]) {
      const o = ringAt(a, 0.012),
        i = ringAt(a, -0.03);
      iron.push(tube([o, i], 0.0055, { n: 2, seg: 6 }));
      iron.push(gSph(0.012, o, [1, 1, 1], 6, 4));
      iron.push(gBox(0.022, 0.006, 0.006, o, [0, (a * 180) / Math.PI, 0]));
      const front = Math.cos(a) > 0;
      const len = front ? 0.075 : 0.11;
      blood.push(gBox(0.0055, len, 0.003, [i[0] * 1.02, RING.y - len / 2 - 0.004, i[2] * 1.02 + (front ? 0.004 : 0)], [0, (a * 180) / Math.PI, 0]));
      if (front) blood.push(gBox(0.0035, 0.045, 0.003, [i[0] * 0.97 - Math.sign(a) * 0.007, RING.y - 0.045, i[2] * 1.04], [0, (a * 180) / Math.PI, 7]));
    }
    // las varillas: del aro hacia arriba y hacia fuera, algo torcidas, con
    // una púa a media altura en algunas
    RODS.forEach(([a, len, open, tw], i) => {
      const b = ringAt(a);
      const t = rodTip(a, len, open, tw);
      const m = [mix(b[0], t[0], 0.5) + Math.sin(a) * 0.012, mix(b[1], t[1], 0.5), mix(b[2], t[2], 0.5) + Math.cos(a) * 0.012];
      iron.push(tube([b, m, [t[0], t[1] + 0.01, t[2]]], (s) => mix(0.0065, 0.004, s), { n: 8, seg: 5 }));
      if (i % 3 === 1) {
        const q = [mix(b[0], t[0], 0.6), mix(b[1], t[1], 0.6), mix(b[2], t[2], 0.6)];
        iron.push(tube([q, [q[0] + Math.sin(a) * 0.035, q[1] + 0.01, q[2] + Math.cos(a) * 0.035]], (s) => mix(0.004, 0.0008, s), { n: 2, seg: 4 }));
      }
    });
    parts.push(P('head', 'iron', merge(iron)));
    parts.push(P('head', 'coBlood', merge(blood)));
    // los cascabeles (en sus articulaciones): la bola, la raja, la anilla
    RODS.forEach((_, i) => {
      parts.push(P('b' + i, 'bronze', merge([gSph(0.021, [0, -0.026, 0], [1, 1, 1], 10, 8), gTorus(0.007, 0.002, [0, -0.002, 0], [0, 90, 0], 8, 3)])));
      parts.push(P('b' + i, 'black', merge([gBox(0.003, 0.004, 0.03, [0, -0.038, 0]), gSph(0.004, [0, -0.044, 0.012], [1, 1, 1], 5, 3)])));
    });
  }

  // ---------------------------------------------------------- el camisón
  // de lino, sucio, hasta media pierna, partido en la cintura (el faldón va
  // en la cadera: si se encorva, sigue cayendo), con su cordón; el bajo roto
  // y negro de arrastrarlo
  {
    const cut = -0.06,
      lap = 0.09,
      seed = 6;
    const hem = (t) => -0.72 - 0.03 * Math.max(0, Math.sin(t * 5 + 1)) ** 3 + 0.05 * Math.max(0, folds(t, 13, 9)) ** 2 - 0.025 * Math.max(0, -Math.cos(t));
    const o = { n: 10, dep: 0.03, seed, nt: 64, y0: CAMISA[0][0], fy: 0.46 };
    const hemUp = (t) => cut - lap - 0.02 * Math.max(0, folds(t, 5, seed + 1));
    const up = gown(CAMISA, hemUp, { ...o, nv: 12, cz: (v) => camCZ(mix(cut - lap, 0.6, v)) });
    const low = gown(CAMISA, hem, { ...o, top: cut + lap, nv: 14, cz: (v) => camCZ(mix(-0.72, cut + lap, v)) });
    parts.push(PD('chest', 'coLinen', up.geo));
    parts.push(PD('hips', 'coLinen', place(low.geo, [0, 0.1, 0])));
    const span = (B, t0, t1) => [(u, v) => B.at(mix(t0, t1, u), v), (u, v) => B.n(mix(t0, t1, u), Math.min(0.99, Math.max(0.01, v)))];
    const rib = (S, path, w, d = 0.004, steps = 10) => ribbon(S[0], S[1], path, w, d, { steps });
    // la sangre: le gotea de la corona y de la boca atada y le baja por el
    // pecho en chorretones (cada uno con su gota al final); en el faldón,
    // los restregones de las manos y las salpicaduras
    const fU = span(up, -0.9, 0.9);
    const fL = span(low, -0.9, 0.9);
    // una mancha plana pegada a la tela, en (u, v), de semiejes w y h
    const blot = (S, u, v, w, h, rot = 0) => {
      const p = S[0](u, v),
        n = S[1](u, v);
      return place(new THREE.SphereGeometry(1, 8, 6), [p[0] + n[0] * 0.003, p[1] + n[1] * 0.003, p[2] + n[2] * 0.003], [0, (Math.atan2(n[0], n[2]) * 180) / Math.PI, rot], [w, h, 0.0022]);
    };
    // un chorretón de (u, v0) hacia abajo: ancho arriba, fino abajo, con su
    // gota
    const drip = (S, u, v0, v1, w, wob = 0.012) => {
      const vm = mix(v0, v1, 0.55);
      return merge([
        ribbon(S[0], S[1], [[u, v0], [u + wob, mix(v0, vm, 0.5)], [u - wob * 0.3, vm]], w, 0.0035, { steps: 8 }),
        ribbon(S[0], S[1], [[u - wob * 0.3, vm], [u + wob * 0.6, mix(vm, v1, 0.5)], [u + wob * 0.2, v1]], w * 0.55, 0.0035, { steps: 8 }),
        blot(S, u + wob * 0.2, v1 - 0.008, w * 0.42, w * 0.6),
      ]);
    };
    const sangreUp = [
      blot(fU, 0.53, 0.955, 0.034, 0.026, 10),
      blot(fU, 0.555, 0.925, 0.022, 0.03, -20),
      blot(fU, 0.47, 0.94, 0.016, 0.013),
      drip(fU, 0.545, 0.93, 0.52, 0.02),
      drip(fU, 0.585, 0.9, 0.7, 0.012, -0.01),
      drip(fU, 0.47, 0.93, 0.78, 0.011, 0.008),
    ];
    parts.push(P('chest', 'coBlood', merge(sangreUp)));
    const sangreLow = [
      ribbon(fL[0], fL[1], [[0.27, 0.86], [0.31, 0.8], [0.33, 0.77]], 0.014, 0.0035, { steps: 8 }),
      ribbon(fL[0], fL[1], [[0.3, 0.9], [0.345, 0.83], [0.36, 0.8]], 0.011, 0.0035, { steps: 8 }),
      ribbon(fL[0], fL[1], [[0.33, 0.93], [0.37, 0.87]], 0.008, 0.0035, { steps: 6 }),
      blot(fL, 0.66, 0.6, 0.03, 0.022, 30),
      blot(fL, 0.7, 0.55, 0.012, 0.012),
      blot(fL, 0.42, 0.22, 0.016, 0.012),
      blot(fL, 0.58, 0.16, 0.01, 0.01),
    ];
    parts.push(P('hips', 'coBlood', place(merge(sangreLow), [0, 0.1, 0])));
    // el bajo, negro de arrastrarlo
    const all = span(low, -Math.PI, Math.PI);
    const barro = [];
    for (let k = 0; k < 4; k++) barro.push(rib(all, [[k / 4, 0.03], [(k + 1) / 4 + 0.01, 0.035]], 0.07, 0.003, 14));
    parts.push(P('hips', 'coDirt', place(merge(barro), [0, 0.1, 0])));
    // la cruz de cal del Físico, a la espalda
    const bU = span(up, Math.PI - 1.1, Math.PI + 1.1);
    parts.push(P('chest', 'plaster', merge([rib(bU, [[0.5, 0.96], [0.494, 0.7], [0.503, 0.38]], 0.055, 0.005, 16), rib(bU, [[0.13, 0.735], [0.5, 0.75], [0.87, 0.74]], 0.05, 0.005, 28)])));
    // el cordón de la cintura, con su cabo y sus nudos
    parts.push(P('hips', 'rope', cord(0.1, 0.188, 0.142, 0.009, Object.assign([[0.07, 0.1, 0.12], [0.09, -0.02, 0.14], [0.085, -0.16, 0.15]], { knots: [[0.088, -0.07, 0.145], [0.085, -0.16, 0.15]] }))));
    // las mangas, hasta el codo, holgadas, con la vuelta remangada
    // (la boca de arriba, metida en el hombro del camisón, hacia el cuerpo)
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1;
      const g = tube(
        [
          [-sx * 0.012, -0.005, -0.002],
          [-sx * 0.004, -0.1, 0.004],
          [0, -0.28, 0],
        ],
        (q) => table([[0, 0.05, 0.047], [0.35, 0.056, 0.053], [1, 0.054, 0.051]], q),
        { n: 8, seg: 12, mod: (a, q) => 1 + 0.08 * folds(a, 3, (s === 'L' ? 3 : 8) + q * 2) * q }
      );
      parts.push(PD('arm' + s, 'coLinen', g));
      parts.push(P('arm' + s, 'coLinen', gTorus(0.053, 0.01, [0, -0.28, 0], [90, 0, 0], 14, 5)));
    }
  }
  // ---------------------------------------------------------- las vendas
  for (const s of ['L', 'R']) {
    const v = vendas(-0.02, -0.235, 0.036, 0.025, s === 'L' ? 1 : 2);
    parts.push(P('fore' + s, 'coBandage', v.venda));
    parts.push(P('fore' + s, 'coDirt', v.costura));
    parts.push(P('fore' + s, 'coBlood', v.sangre));
  }
  // la venda suelta de la espinilla izquierda, que arrastra
  parts.push(P('shinL', 'coBandage', merge([tube([[0.03, -0.22, 0.03], [0.05, -0.33, 0.04], [0.075, -0.42, 0.07]], [0.012, 0.0022], { n: 6, seg: 4, up: [0.7, 0, 0.7] }), vendas(-0.12, -0.24, 0.044, 0.037, 0.4).venda])));
  parts.push(P('shinL', 'coDirt', vendas(-0.12, -0.24, 0.044, 0.037, 0.4).costura));
  // ---------------------------------------------------------- el garfio
  // (en la mano derecha: el mango de madera atravesado en el puño y el hierro
  // en jota, con la punta afilada)
  parts.push(P('handR', 'wooddark', gBox(0.03, 0.03, 0.13, [0.004, -0.075, 0.03])));
  parts.push(
    P(
      'handR',
      'iron',
      merge([
        tube(
          [
            [0.004, -0.075, 0.09],
            [0.004, -0.09, 0.18],
            [0.004, -0.15, 0.26],
            [0.004, -0.235, 0.255],
            [0.004, -0.275, 0.19],
            [0.004, -0.26, 0.13],
          ],
          (s) => mix(0.011, 0.003, s * s),
          { n: 18, seg: 6 }
        ),
        gTorus(0.02, 0.005, [0.004, -0.075, -0.045], [0, 90, 0], 8, 3),
      ])
    )
  );
  parts.push(P('handR', 'coBlood', gSph(1, [0.004, -0.235, 0.255], [0.016, 0.02, 0.011], 6, 4)));

  // (todo hecho para una altura de 1: se escala)
  const out = parts.map((pt) => ({ ...pt, p: (pt.p || [0, 0, 0]).map((x) => x * K), sc: (pt.sc || [1, 1, 1]).map((x) => x * K) }));
  return new Rig({ joints, parts: out });
}

// ======================================================================= clips
// la postura de siempre: encorvado, la cabeza vencida hacia un lado por el
// peso de la corona, el garfio colgando
const CO_BASE = { chest: [18, 0, 3], head: [6, 8, 17], armL: [-14, 0, 9], foreL: [-22, 0, 0], armR: [-22, 0, -9], foreR: [-32, 0, 0], handR: [18, 0, 0] };
// una sacudida: la cabeza de lado a lado (n vaivenes de dt cada uno)
const shake = (t0, n, dt, amp, o = {}) => {
  const k = [];
  for (let i = 0; i < n; i++) {
    const s = i % 2 ? 1 : -1;
    const f = 1 - (i / n) * (o.decay ?? 0);
    k.push([t0 + i * dt, { chest: [20 + (o.bend ?? 0), -s * 9 * f, s * 5 * f], head: [10 + (o.nod ?? 0) * (i % 3 === 0 ? 1 : -0.5), s * amp * f, s * amp * 0.6 * f], armL: [-30, 0, 30 + s * 8], foreL: [-40, 0, 0], armR: [-36, 0, -30 + s * 8], foreR: [-46, 0, 0], handR: [20, 0, 0] }, 'snap']);
  }
  return k;
};
export const CO_CLIPS = {
  // te ve: un respingo, y sacude la cabeza como un perro mojado: los
  // cascabeles por todo el barrio; luego echa la cabeza atrás (el grito que
  // se le queda en la correa)
  alert: clip('co_alert', 1.75, [
    [0, { ...CO_BASE }],
    [0.16, { chest: [4, 0, 0], head: [-16, -10, 8], armL: [-20, 0, 26], foreL: [-30, 0, 0], armR: [-26, 0, -26], foreR: [-40, 0, 0] }, 'snap'],
    ...shake(0.3, 9, 0.105, 42, { decay: 0.2, nod: 10 }),
    [1.3, { chest: [-6, 0, 0], head: [-34, 0, 4], armL: [-40, 0, 46], foreL: [-30, 0, 0], armR: [-44, 0, -46], foreR: [-40, 0, 0], handR: [24, 0, 0] }],
    [1.75, { ...CO_BASE }],
  ]),
  // sacudiendo la cabeza mientras te tiene agarrado (en bucle)
  sacude: clip('co_sacude', 0.84, [[0, { chest: [26, 0, 0], head: [16, 0, 0], armL: [-80, 0, 18], foreL: [-30, 0, 0], armR: [-80, 0, -18], foreR: [-30, 0, 0], handR: [10, 0, 0] }], ...shake(0.0, 8, 0.105, 38, { bend: 6 }).map(([t, p, e]) => [t, { ...p, armL: [-80, 0, 18], foreL: [-30, 0, 0], armR: [-80, 0, -18], foreR: [-30, 0, 0] }, e]), [0.84, { chest: [26, 0, 0], head: [16, 0, 0], armL: [-80, 0, 18], foreL: [-30, 0, 0], armR: [-80, 0, -18], foreR: [-30, 0, 0], handR: [10, 0, 0] }]]),
  // el garfio: lo levanta por encima del hombro y lo baja en diagonal
  garfio: clip('co_garfio', 1.45, [
    [0, { ...CO_BASE }],
    [0.5, { chest: [4, 34, 6], head: [-6, -14, 10], armR: [-165, 0, -42], foreR: [-62, 0, 0], handR: [40, 0, 0], armL: [-34, 0, 30], foreL: [-30, 0, 0], legL: [8, 0, 0], legR: [-14, 0, 0], shinR: [16, 0, 0] }, 'hold'],
    [0.66, { chest: [36, -36, -4], head: [12, 10, 14], armR: [-44, 0, 22], foreR: [-8, 0, 0], handR: [70, 0, 0], armL: [-20, 0, 24], foreL: [-30, 0, 0], legL: [20, 0, 0], legR: [-32, 0, 0], shinR: [26, 0, 0], root: [0, -7, 4] }, 'strike'],
    [0.95, { chest: [32, -40, -4], head: [10, 12, 16], armR: [-36, 0, 26], foreR: [-12, 0, 0], handR: [66, 0, 0], armL: [-22, 0, 24], foreL: [-30, 0, 0], legL: [20, 0, 0], legR: [-32, 0, 0], shinR: [26, 0, 0], root: [0, -7, 4] }, 'settle'],
    [1.45, { ...CO_BASE }],
  ]),
  // el agarrón: se agacha con los brazos por delante y se tira encima
  agarre: clip('co_agarre', 1.6, [
    [0, { ...CO_BASE }],
    [0.48, { chest: [34, 0, 0], head: [-8, 0, 10], armL: [-70, 0, 34], foreL: [-30, 0, 0], armR: [-70, 0, -34], foreR: [-30, 0, 0], legL: [-30, 0, 0], shinL: [50, 0, 0], legR: [-24, 0, 0], shinR: [46, 0, 0], root: [0, -12, -4] }, 'hold'],
    [0.66, { chest: [40, 0, 0], head: [-14, 0, 6], armL: [-100, 0, 14], foreL: [-6, 0, 0], armR: [-100, 0, -14], foreR: [-6, 0, 0], legL: [-40, 0, 0], shinL: [30, 0, 0], legR: [30, 0, 0], shinR: [26, 0, 0], root: [0, -6, 10] }, 'strike'],
    [0.86, { chest: [44, 0, 0], head: [-10, 0, 6], armL: [-86, 0, 4], foreL: [-30, 0, 0], armR: [-86, 0, -4], foreR: [-30, 0, 0], legL: [-40, 0, 0], shinL: [30, 0, 0], legR: [30, 0, 0], shinR: [26, 0, 0], root: [0, -8, 8] }],
    [1.6, { ...CO_BASE }],
  ]),
  // el cabezazo: echa atrás la cabeza y la clava por delante, con las
  // varillas de la corona como un rastrillo
  cabezazo: clip('co_cabezazo', 1.35, [
    [0, { ...CO_BASE }],
    [0.5, { chest: [-14, 0, 0], head: [-40, 0, 0], armL: [-20, 0, 40], foreL: [-30, 0, 0], armR: [-26, 0, -40], foreR: [-40, 0, 0], legL: [8, 0, 0], legR: [-18, 0, 0], shinR: [20, 0, 0], root: [0, -2, -6] }, 'hold'],
    [0.64, { chest: [46, 0, 0], head: [40, 0, 0], armL: [10, 0, 26], foreL: [-20, 0, 0], armR: [6, 0, -26], foreR: [-30, 0, 0], legL: [-30, 0, 0], shinL: [20, 0, 0], legR: [26, 0, 0], shinR: [18, 0, 0], root: [0, -10, 10] }, 'snap'],
    [0.95, { chest: [42, 0, 0], head: [34, 0, 0], armL: [6, 0, 26], foreL: [-20, 0, 0], armR: [2, 0, -26], foreR: [-30, 0, 0], legL: [-30, 0, 0], shinL: [20, 0, 0], legR: [26, 0, 0], shinR: [18, 0, 0], root: [0, -10, 10] }],
    [1.35, { ...CO_BASE }],
  ]),
  hurt: clip('co_hurt', 0.55, [
    [0, { chest: [-4, 16, -6], head: [-30, -10, 26], armL: [-30, 0, 40], armR: [-30, 0, -40], root: [0, -4, -8] }, 'snap'],
    [0.55, { ...CO_BASE }],
  ]),
  stagger: clip('co_stagger', 1.35, [
    [0, { chest: [-18, 24, 0], head: [-40, 0, 26], armL: [-20, 0, 70], armR: [-20, 0, -70], root: [0, -8, -14], legL: [-20, 0, 0], shinL: [40, 0, 0] }, 'snap'],
    [0.6, { chest: [56, 0, 8], head: [30, 0, 20], armL: [0, 0, 20], armR: [0, 0, -20], root: [0, -34, 0], legL: [-66, 0, 0], shinL: [100, 0, 0], legR: [-40, 0, 0], shinR: [96, 0, 0] }],
    [1.35, { ...CO_BASE }],
  ]),
  parried: clip('co_parried', 1.6, [
    [0, { chest: [-20, -20, 0], head: [-40, 10, 30], armR: [-150, 0, -50], foreR: [-30, 0, 0], armL: [-30, 0, 50], root: [0, -4, -10], legL: [10, 0, 0], legR: [-20, 0, 0], shinR: [20, 0, 0] }, 'snap'],
    [0.5, { chest: [-14, -14, 0], head: [-30, 8, 26], armR: [-120, 0, -50], foreR: [-30, 0, 0], armL: [-24, 0, 44], root: [0, -6, -12] }],
    [1.6, { ...CO_BASE }],
  ]),
  // cae de rodillas, se vence de bruces y los cascabeles suenan por última
  // vez contra el suelo
  death: clip(
    'co_death',
    2.4,
    [
      [0, { chest: [-10, 10, 0], head: [-30, 0, 20], armL: [-30, 0, 40], armR: [-30, 0, -40] }, 'snap'],
      [0.6, { chest: [20, 0, 10], head: [20, 0, 30], armL: [0, 0, 30], armR: [0, 0, -30], root: [0, -44, 0], legL: [-90, 0, 0], shinL: [120, 0, 0], legR: [-80, 0, 0], shinR: [120, 0, 0], footL: [40, 0, 0], footR: [40, 0, 0] }],
      [1.2, { chest: [80, 0, 10], head: [30, 0, 40], armL: [-20, 0, 50], foreL: [-30, 0, 0], armR: [-20, 0, -50], foreR: [-30, 0, 0], root: [0, -74, 30], legL: [-60, 0, 0], shinL: [100, 0, 0], legR: [-60, 0, 0], shinR: [110, 0, 0], footL: [40, 0, 0], footR: [40, 0, 0] }, 'snap'],
      [2.4, { chest: [84, 0, 10], head: [26, 0, 46], armL: [-14, 0, 56], foreL: [-30, 0, 0], armR: [-14, 0, -56], foreR: [-30, 0, 0], root: [0, -76, 32], legL: [-58, 0, 0], shinL: [100, 0, 0], legR: [-58, 0, 0], shinR: [110, 0, 0], footL: [40, 0, 0], footR: [40, 0, 0] }],
    ],
    { ground: false }
  ),
};

// ======================================================================= tipo
const sees = (e) => e.aware && e.sees;
// la cabeza: su giro el fotograma anterior (para que se mezan los cascabeles)
const _hq = new THREE.Quaternion(),
  _hq0 = new THREE.Quaternion();

// El agarrón: si alcanza, te sujeta por los hombros y sacude la cabeza.
function grab(e, g) {
  const p = g.player;
  const d = e.distTo(p.pos);
  const a = Math.abs(angleDiff(e.yaw, e.angleTo(p.pos)));
  if (p.dead || p.iframe || d > 1.6 || a > 55 * DEG || Math.abs(p.pos.y - e.pos.y) > 0.9 || p.state === 'grabbed' || p.state === 'pinned') return;
  p.startGrabbed && p.startGrabbed(e);
  e.data.grabT = g.time;
  e.state = 'agarrando';
  e.stT = 0;
  e.atk = null;
  e.data.grabMash = p.mash || 0;
  e.anim.play(CO_CLIPS.sacude, { blend: 0.08, loop: true });
  g.audio && g.audio.play('grab', p.pos);
  g.camRig.shake(0.35);
  g.fisico && g.fisico.alarma(e.pos.x, e.pos.y, e.pos.z, 'coronado');
}
function release(e, escaped) {
  const g = e.game;
  const p = g.player;
  const fx = Math.sin(e.yaw),
    fz = Math.cos(e.yaw);
  e.anim.stop(0.15);
  if (p.state === 'grabbed') {
    if (escaped) p.releaseGrab && p.releaseGrab(2.6, -fx * 0.2 + fx, fz, 0);
    else {
      // el cabezazo con la corona
      g.audio && g.audio.play('hitFlesh', p.pos);
      p.releaseGrab && p.releaseGrab(4.5, fx, fz, 16);
      g.camRig.shake(0.45);
    }
  }
  if (escaped) {
    e.state = 'stagger';
    e.stT = 0;
    e.anim.play(CO_CLIPS.stagger, { blend: 0.05 });
  } else {
    e.state = 'chase';
    e.stT = 0;
    e.cooldown = 1.4;
  }
}

export const CORONADO_TYPE = {
  name: 'Coronado',
  build: buildCoronado,
  hp: 74,
  poise: 26,
  radius: 0.38,
  height: 1.9,
  lockHeight: 1.45,
  walk: 1.05,
  run: 2.5,
  runDist: 3.2,
  sight: 11,
  fov: 100,
  hear: 3,
  turn: 2.8,
  stride: 2.3,
  approach: 1.45,
  leash: 20,
  parryDur: 1.6,
  alertTime: 1.75,
  clips: CO_CLIPS,
  voice: 'coronado',
  blood: [0.42, 0.06, 0.05],
  biped: { scale: K, style: { ...GAIT.shamble, limp: 0.62, lean: 12 }, stance: 0.05 },
  attacks: [
    { name: 'garfio', clip: CO_CLIPS.garfio, dur: 1.45, min: 0, max: 2.1, hits: [[0.6, 0.74]], dmg: 15, range: 2.0, arc: 90, lunge: [[0.55, 0.72, 2.4]], weight: 3, cd: 0.8 },
    { name: 'cabezazo', clip: CO_CLIPS.cabezazo, dur: 1.35, min: 0, max: 1.9, hits: [[0.6, 0.72]], dmg: 18, stDmg: 34, range: 1.7, arc: 60, lunge: [[0.55, 0.68, 3.6]], weight: 1.6, cd: 1.2, noParry: true },
    {
      name: 'agarre',
      clip: CO_CLIPS.agarre,
      dur: 1.6,
      min: 0.6,
      max: 3.0,
      hits: [],
      dmg: 0,
      range: 1.6,
      arc: 60,
      lunge: [[0.55, 0.8, 5.2]],
      weight: 1.6,
      cd: 2.5,
      noParry: true,
      trackUntil: 0.5,
      // (no vuelve a agarrar enseguida)
      cond: (e) => e.game.time - (e.data.grabT ?? -99) > 6,
      events: [{ t: 0.68, fn: grab }, { t: 0.78, fn: grab }],
    },
  ],
  // te ve: sacude la cabeza (y viene el Físico)
  wake: (e) => {
    const g = e.game;
    g.fisico && g.fisico.alarma(e.pos.x, e.pos.y, e.pos.z, 'coronado');
    return false;
  },
  states: {
    // sujeto: te tiene; forcejeando, te sueltas
    agarrando: (e, dt, pl) => {
      const D = e.data;
      e.vx = damp(e.vx, 0, 10, dt);
      e.vz = damp(e.vz, 0, 10, dt);
      const fx = Math.sin(e.yaw),
        fz = Math.cos(e.yaw);
      if (pl.state !== 'grabbed' || pl.dead) {
        e.state = 'chase';
        e.stT = 0;
        e.anim.stop(0.15);
        return false;
      }
      // (te tiene delante, a un brazo)
      pl.pos.x = damp(pl.pos.x, e.pos.x + fx * 0.85, 12, dt);
      pl.pos.z = damp(pl.pos.z, e.pos.z + fz * 0.85, 12, dt);
      pl.yaw = Math.atan2(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z);
      D.shT = (D.shT || 0) - dt;
      if (D.shT <= 0) {
        D.shT = 0.42;
        e.game.audio && e.game.audio.enemyVoice(e, 'shake');
      }
      if ((pl.mash || 0) - (D.grabMash || 0) >= 7) release(e, true);
      else if (e.stT > 2.6) release(e, false);
      return false;
    },
  },
  // (sujetándote, no se dobla: hay que soltarse)
  preHit: (e, dmg) => (e.state === 'agarrando' ? { dmg: dmg * 0.6, poise: 0 } : null),
  onReset: (e) => {
    e.data.grabMash = 0;
    e.data.bells = null;
  },
  update: (e, dt, pl) => {
    const D = e.data;
    // los cascabeles: a cada paso (y a cada respingo, quieto)
    const spd = Math.hypot(e.vx, e.vz);
    D.jT = (D.jT ?? Math.random()) - dt * (spd > 0.2 ? 1.6 + spd * 0.8 : 0.35);
    if (D.jT <= 0 && !e.dead && e.obj.visible) {
      D.jT = 0.5 + Math.random() * (spd > 0.2 ? 0.25 : 2.5);
      e.game.audio && e.game.audio.enemyVoice(e, spd > 0.2 ? 'step' : 'idle');
      if (spd < 0.2) D.tw = 1;
    }
    if (D.tw) D.tw = Math.max(0, D.tw - dt * 3);
    // mientras sacude la cabeza al verte, suenan sin parar
    if (e.state === 'alert' && e.stT > 0.3 && e.stT < 1.3) {
      D.shT = (D.shT || 0) - dt;
      if (D.shT <= 0) {
        D.shT = 0.21;
        e.game.audio && e.game.audio.enemyVoice(e, 'shake');
      }
    }
  },
  // el respingo de la cabeza, quieto
  idlePose: (e, kind, t) => {
    const D = e.data;
    const tw = D.tw || 0;
    const sw = Math.sin(t * 0.9 + e.phase) * 3;
    if (kind === 'sit') {
      // sentado (a la mesa, en un camastro): la cabeza colgando, las manos
      // en las rodillas
      return rad({ chest: [26, 0, 4], head: [26 + tw * 20, tw * 20, 22], armL: [-40, 0, 14], foreL: [-40, 0, 0], armR: [-44, 0, -14], foreR: [-46, 0, 0], handR: [20, 0, 0], legL: [-88, 0, 4], shinL: [90, 0, 0], legR: [-86, 0, -4], shinR: [92, 0, 0], root: [0, -45, -6] });
    }
    return rad({ ...CO_BASE, chest: [18 + sw * 0.4, sw, 3], head: [6 + tw * 14, 8 - tw * 30 * Math.sin(t * 40), 17 + tw * 10] });
  },
  loco: (e, t, spd) => {
    const g = e.gait;
    const sw = g ? g.armSwing / DEG : 0;
    const bob = Math.sin(e.phase * 2) * Math.min(1, spd);
    return rad({
      chest: [20 + Math.min(1, spd / 2.4) * 10, 0, 3 + bob * 2],
      head: [4, 8 + bob * 6, 17 + bob * 8],
      armL: [-14 + sw * 0.6, 0, 10],
      foreL: [-22, 0, 0],
      armR: [-22 - sw * 0.5, 0, -10],
      foreR: [-34, 0, 0],
      handR: [18, 0, 0],
    });
  },
  // los cascabeles se mecen con los movimientos de la cabeza
  postPose: (e, pose, dt) => {
    const D = e.data;
    const h = e.rig.joints.head;
    h.getWorldQuaternion(_hq);
    if (!D.bells) D.bells = RODS.map(() => ({ x: 0, z: 0, vx: 0, vz: 0 }));
    if (D.hq) {
      _hq0.copy(D.hq).invert().premultiply(_hq);
      // (lo que giró la cabeza este fotograma, en sus ejes)
      const ang = 2 * Math.acos(Math.min(1, Math.abs(_hq0.w)));
      const s = Math.sqrt(1 - Math.min(1, _hq0.w * _hq0.w)) || 1;
      const ax = (_hq0.x / s) * ang,
        az = (_hq0.z / s) * ang,
        ay = (_hq0.y / s) * ang;
      for (const b of D.bells) {
        b.vx += (-ax * 14 - ay * 4) / Math.max(dt, 1e-3) * dt;
        b.vz += (-az * 14 + ay * 4) / Math.max(dt, 1e-3) * dt;
      }
    } else D.hq = new THREE.Quaternion();
    D.hq.copy(_hq);
    D.bells.forEach((b, i) => {
      b.vx += (-b.x * 90 - b.vx * 6) * dt;
      b.vz += (-b.z * 90 - b.vz * 6) * dt;
      b.x = clamp(b.x + b.vx * dt, -0.9, 0.9);
      b.z = clamp(b.z + b.vz * dt, -0.9, 0.9);
      pose['b' + i] = [b.x, 0, b.z];
    });
  },
};

function rad(p) {
  const o = {};
  for (const k in p) o[k] = k === 'root' ? p[k].map((v) => v / 100) : p[k].map((v) => v * DEG);
  return o;
}
void approachAngle;
void sees;
