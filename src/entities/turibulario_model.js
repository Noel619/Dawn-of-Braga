// El Turiferario: el arzobispo transfigurado, la primera forma del jefe
// final (la que espera de rodillas ante el ídolo y luego pelea; la segunda
// es el coloso de colossus/turiferario.js, y esta tiene que anunciarla).
//
// Cuatro metros de sacerdote enjuto: la joroba de buitre y, por delante de
// ella, la cabeza colgando de un cuello larguísimo; por cara, una jaula de
// hierro con púas remachada al cráneo, y detrás de los barrotes dos brasas y
// los dientes; la mitra partida en dos, cada mitad clavada en un cuerno de
// hueso que le sale de las sienes; detrás, la aureola de hierro con siete
// cirios que chorrean. La casulla carmesí con sus galones de oro (la cruz en
// Y a la espalda), abierta por delante: el pecho abierto como dos puertas de
// costillas y, dentro, el núcleo que arde. El palio torcido. Debajo, el alba
// hecha jirones y manchada, y asomando, los pies descalzos de dedos largos.
// Los brazos, largos de más, de piel y hueso, con las mangas rotas; en la
// muñeca derecha, el grillete del que sale la cadena del incensario.
//
// Mismo esqueleto que siempre (humanoidJoints(2.35, brazos 1.18), la cabeza
// más baja y más adelante) y las velas donde dice CANDLE_OFFSETS.
import * as THREE from 'three';
import { Rig } from './rig.js';
import { MAT_DEFS } from '../gfx/materials.js';
import { tube, cloth, skirt, surface, surfNormal, ribbon, head, hand, merge, place, gBox, gSph, gTorus, gCone, folds, table, mix, sstep, bump } from './sculpt.js';
import { PI, TAU, ell, humanoidJoints, torso, gownSplit, shoulders, robe } from './figure.js';

export const TUR_K = 2.35;
const K = TUR_K;
// la aureola: el centro y el radio del arco (en el espacio de la cabeza, a
// la altura de siempre), y dónde arde cada vela
const HALO = { y: 0.3, z: -0.08, r: 0.2 };
export const CANDLE_OFFSETS = (k = TUR_K) =>
  [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const a = Math.PI * (0.1 + (i / 6) * 0.8);
    return new THREE.Vector3(Math.cos(a) * HALO.r * k, (HALO.y + Math.sin(a) * HALO.r + 0.07) * k, HALO.z * k);
  });

// UV en metros, por caras (cada triángulo se proyecta en el plano al que más
// mira): la tela, la piel y el hierro con su textura a su escala
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
const PD = (j, mat, geo) => P(j, mat, geo, { ds: true });

// un pie descalzo, huesudo, de dedos largos (la suela a ras del suelo)
function bareFoot() {
  const g = [
    tube(
      [
        [0, -0.012, -0.055],
        [0, -0.02, 0.03],
        [0, -0.028, 0.1],
      ],
      (s) =>
        table(
          [
            [0, 0.032, 0.028],
            [0.5, 0.042, 0.022],
            [1, 0.046, 0.014],
          ],
          s
        ),
      { up: [0, 1, 0], n: 6, seg: 8, caps: true, capL: 0.02 }
    ),
  ];
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.018 + (i === 0 ? -0.004 : 0);
    const l = [0.075, 0.07, 0.064, 0.056, 0.048][i];
    g.push(
      tube(
        [
          [x, -0.03, 0.095],
          [x * 1.15, -0.03, 0.095 + l * 0.6],
          [x * 1.25, -0.04, 0.095 + l],
        ],
        (s) => (i === 0 ? 0.011 : 0.008) * mix(1, 0.7, s),
        { n: 4, seg: 5, caps: true, capL: 0.006 }
      )
    );
  }
  return merge(g);
}

export function buildTuribulario() {
  const joints = humanoidJoints(K, { arm: 1.18 });
  const J = Object.fromEntries(joints.map((j) => [j.name, j]));
  // la cabeza cuelga por delante de la joroba
  J.head.pos = [0, 0.5 * K, 0.12 * K];
  const parts = [];
  const sk = 'skinCorrupt';

  // ---------------------------------------------------------- el cuerpo
  parts.push(P('chest', sk, torso({ w: 0.94, dep: 0.98, hunch: 1.9, pecs: 0, blades: 0.07 })));
  // el cuello, larguísimo, adelantado, con los tendones
  parts.push(
    P(
      'chest',
      sk,
      merge([
        tube(
          [
            [0, 0.42, -0.03],
            [0, 0.5, 0.03],
            [0, 0.53, 0.09],
            [0, 0.52, 0.14],
          ],
          (s) => [mix(0.06, 0.043, s), mix(0.055, 0.04, s)],
          { n: 10, seg: 10 }
        ),
        ...[1, -1].map((sx) =>
          tube(
            [
              [sx * 0.035, 0.53, 0.13],
              [sx * 0.036, 0.52, 0.07],
              [sx * 0.02, 0.45, 0.07],
            ],
            0.009,
            { n: 6, seg: 5, caps: true, capL: 0.01 }
          )
        ),
      ])
    )
  );
  // el pecho abierto como dos puertas: el hueco, el núcleo y las costillas
  parts.push(P('chest', 'black', place(gSph(0.1, [0, 0, 0], [1, 1, 1], 14, 10), [0, 0.3, 0.07], [0, 0, 0], [0.95, 1.6, 0.6])));
  parts.push(P('chest', 'redGlow', place(gSph(0.07, [0, 0, 0], [1, 1, 1], 12, 8), [0, 0.29, 0.1], [0, 0, 0], [1, 1.25, 0.9])));
  {
    const ribs = [],
      flaps = [];
    for (const sx of [1, -1])
      for (let i = 0; i < 5; i++) {
        const y = 0.43 - i * 0.065;
        const w = 1 - i * 0.06;
        ribs.push(
          tube(
            [
              [sx * 0.025, y, 0.115],
              [sx * 0.09 * w, y + 0.01, 0.2],
              [sx * 0.17 * w, y - 0.005, 0.19],
              [sx * 0.2 * w, y - 0.03, 0.09],
            ],
            (s) => 0.012 * mix(1, 0.7, s),
            { n: 10, seg: 5, caps: true, capL: 0.01 }
          )
        );
      }
    // el esternón partido y la piel abierta
    for (const sx of [1, -1]) {
      ribs.push(tube([[sx * 0.025, 0.47, 0.11], [sx * 0.03, 0.3, 0.125], [sx * 0.022, 0.14, 0.11]], 0.012, { n: 8, seg: 5, caps: true, capL: 0.01 }));
      flaps.push(place(cloth(0.2, 0.36, { folds: [2, 0.012], seed: 3 + sx, hem: (u) => 0.2 * Math.abs(Math.sin(u * 7 + sx)), nu: 8, nv: 8, wrap: 0.12 }).geo, [sx * 0.13, 0.47, 0.17], [0, sx * 60, 0]));
    }
    parts.push(P('chest', 'bone', merge(ribs)));
    parts.push(PD('chest', 'flesh', merge(flaps)));
  }
  // los brazos, largos de más, de piel y hueso, con las mangas rotas
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    parts.push(
      P(
        'arm' + s,
        sk,
        tube(
          [
            [0, 0.035, 0],
            [0, -0.16, 0.004],
            [0, -0.354, 0],
          ],
          (q) => table(
            [
              [0, 0.05, 0.05],
              [0.4, 0.04, 0.044],
              [1, 0.034, 0.036],
            ],
            q
          ),
          { n: 8, seg: 10, caps: true, capL: 0.03 }
        )
      )
    );
    parts.push(
      P(
        'fore' + s,
        sk,
        merge([
          tube(
            [
              [0, 0.03, 0],
              [0, -0.12, 0.004],
              [0, -0.319, 0],
            ],
            (q) => table(
              [
                [0, 0.037, 0.036],
                [0.35, 0.034, 0.036],
                [1, 0.024, 0.021],
              ],
              q
            ),
            { n: 8, seg: 9, caps: true, capL: 0.02 }
          ),
          gSph(0.034, [0, 0.0, -0.012], [1, 1, 1], 8, 6),
        ])
      )
    );
    // el hueso que asoma por detrás del antebrazo
    parts.push(P('fore' + s, 'bone', tube([[sx * 0.008, -0.03, -0.03], [sx * 0.01, -0.16, -0.034], [sx * 0.006, -0.29, -0.022]], 0.012, { n: 8, seg: 6, caps: true, capL: 0.012 })));
    parts.push(P('hand' + s, sk, hand({ side: sx, len: 1.6, thick: 0.85, claw: 0.55, curl: s === 'R' ? 0.7 : 0.35, spread: 0.55, k: 1.12 })));
    // la manga rota del alba, sobre el hombro
    parts.push(
      PD(
        'arm' + s,
        'clothWhite',
        surface(
          (u, v) => {
            const a = u * TAU;
            const r = mix(0.075, 0.1, v) * (1 + 0.1 * folds(a, 3, sx + 2) * v);
            const y = mix(0.06, -0.2, v) - 0.08 * v * Math.max(0, Math.sin(a * 3 + sx));
            return [Math.sin(a) * r, y, Math.cos(a) * r * 0.9];
          },
          14,
          5,
          { closed: true, inside: (u, v) => [0, mix(0.06, -0.2, v), 0] }
        )
      )
    );
  }
  // el grillete de la derecha, y la cadena enroscada en el antebrazo
  parts.push(
    P(
      'foreR',
      'iron',
      merge([
        place(new THREE.CylinderGeometry(0.046, 0.046, 0.06, 12, 1, true), [0, -0.28, 0]),
        gTorus(0.047, 0.008, [0, -0.25, 0], [90, 0, 0], 12, 4),
        gTorus(0.047, 0.008, [0, -0.31, 0], [90, 0, 0], 12, 4),
        tube(
          Array.from({ length: 20 }, (_, i) => {
            const a = i * 0.9;
            return [Math.sin(a) * 0.045, -0.04 - i * 0.011, Math.cos(a) * 0.045];
          }),
          0.007,
          { n: 40, seg: 4, mod: (q, s) => 1 + 0.6 * Math.abs(Math.sin(s * 90)) }
        ),
      ])
    )
  );
  // las piernas, descarnadas (sólo asoman las espinillas y los pies)
  for (const s of ['L', 'R']) {
    parts.push(P('shin' + s, sk, tube([[0, 0.02, 0.004], [0, -0.15, -0.004], [0, -0.43, 0]], (q) => table([[0, 0.04, 0.042], [0.35, 0.04, 0.045], [1, 0.026, 0.026]], q), { n: 8, seg: 8, caps: true, capL: 0.02 })));
    parts.push(P('foot' + s, sk, bareFoot()));
  }

  // ---------------------------------------------------------- la cabeza
  const HC = [0, 0.112, 0.005];
  parts.push(P('head', sk, head({ w: 0.96, h: 1.04, nose: 0.007, noseW: 1.3, brow: 0.014, socket: 0.022, gaunt: 0.02, cheek: 0.012, jaw: 0.8, chin: 0.006, mouth: 0.011, lips: -0.002, ears: 0.012 })));
  parts.push(P('head', 'eyeGlow', merge([gSph(0.011, [0.031, 0.142, 0.07], [1.3, 0.7, 0.6], 8, 6), gSph(0.011, [-0.031, 0.142, 0.07], [1.3, 0.7, 0.6], 8, 6)])));
  parts.push(P('head', 'bone', merge(Array.from({ length: 8 }, (_, i) => gBox(0.007, 0.022 + (i % 3) * 0.004, 0.006, [(i - 3.5) * 0.008, 0.056, 0.084 - Math.abs(i - 3.5) * 0.003])))));
  // la jaula: meridianos de hierro por delante, aros, remaches y púas
  {
    const g = [];
    const R = [0.1, 0.15, 0.118];
    const at = (th, ph, o = 0) => [HC[0] + Math.sin(th) * Math.cos(ph) * (R[0] + o), HC[1] + Math.sin(ph) * (R[1] + o), HC[2] + Math.cos(th) * Math.cos(ph) * (R[2] + o)];
    for (let i = 0; i < 7; i++) {
      const th = (i / 6 - 0.5) * 2.1;
      const pts = [];
      for (let k = 0; k <= 8; k++) pts.push(at(th, mix(-0.95, 1.0, k / 8)));
      g.push(tube(pts, 0.008, { n: 16, seg: 5 }));
      g.push(gSph(0.012, at(th, -0.95), [1, 1, 1], 6, 4));
    }
    for (const ph of [-0.8, 0.05, 0.85]) {
      const pts = [];
      for (let k = 0; k <= 12; k++) pts.push(at(mix(-1.25, 1.25, k / 12), ph));
      g.push(tube(pts, 0.009, { n: 24, seg: 5 }));
    }
    // las púas, hacia fuera, por arriba
    for (let i = 0; i < 9; i++) {
      const th = (i / 8 - 0.5) * 2.6;
      const p = at(th, 0.85),
        q = at(th, 1.05, 0.07);
      const d = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
      const len = d.length();
      const c = new THREE.ConeGeometry(0.012, len, 5);
      c.translate(0, len / 2, 0);
      c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
      c.translate(p[0], p[1], p[2]);
      g.push(c);
    }
    parts.push(P('head', 'iron', merge(g)));
  }
  // los cuernos de hueso de las sienes, y en cada uno media mitra clavada
  for (const sx of [1, -1]) {
    const horn = [
      [sx * 0.07, 0.19, -0.005],
      [sx * 0.12, 0.27, -0.02],
      [sx * 0.15, 0.37, -0.035],
      [sx * 0.15, 0.45, -0.04],
    ];
    parts.push(P('head', 'bone', tube(horn, (s) => mix(0.024, 0.004, s), { n: 12, seg: 7, caps: true, capL: 0.01, mod: (a, s) => 1 + 0.12 * Math.max(0, Math.sin(s * 30)) ** 4 })));
    // la media mitra: un paño en punta, torcido, con su galón
    const W = 0.075,
      H = 0.25;
    const pn = (u, v) => {
      const xe = W * Math.pow(Math.max(0, 1 - Math.pow(v, 1.6)), 0.6) + 0.0005;
      const x = (u * 2 - 1) * xe;
      const z = 0.03 * Math.sqrt(Math.max(0, 1 - (u * 2 - 1) ** 2)) * (1 - v * 0.6);
      return [x, v * H, z];
    };
    const N = (u, v) => surfNormal(pn, Math.min(0.99, Math.max(0.01, u)), Math.min(0.99, Math.max(0.01, v)), [0, v * H, -0.2]);
    const m = merge([surface(pn, 10, 10, { inside: (u, v) => [0, v * H, -0.2] })]);
    const orph = merge([
      ribbon(
        pn,
        N,
        [
          [0.5, 0.1],
          [0.5, 0.9],
        ],
        0.028,
        0.006,
        { steps: 8 }
      ),
      ribbon(
        pn,
        N,
        [
          [0.02, 0.06],
          [0.5, 0.06],
          [0.98, 0.06],
        ],
        0.03,
        0.006,
        { steps: 10 }
      ),
    ]);
    const where = [sx * 0.13, 0.31, -0.03],
      rot = [-12, sx * 20, -sx * 28];
    parts.push(PD('head', 'clothWhite', place(m, where, rot)));
    parts.push(P('head', 'bronze', place(orph, where, rot)));
    // la ínfula que le cuelga
    parts.push(PD('head', 'clothWhite', place(cloth(0.04, 0.28, { flare: 1.2, folds: [1, 0.004], nu: 3, nv: 6, hem: (u) => 0.1 * u }).geo, [sx * 0.15, 0.31, -0.05], [10, sx * 70, sx * 6])));
  }
  // la aureola de hierro con sus siete cirios que chorrean
  {
    const g = [],
      wax = [];
    const arc = [];
    for (let i = 0; i <= 24; i++) {
      const a = PI * mix(0.03, 0.97, i / 24);
      arc.push([Math.cos(a) * HALO.r, HALO.y + Math.sin(a) * HALO.r, HALO.z]);
    }
    g.push(tube(arc, [0.012, 0.016], { n: 48, seg: 6, up: [0, 0, 1] }));
    // las púas entre los cirios y los dos brazos que la sujetan a la nuca
    for (let i = 0; i < 8; i++) {
      const a = PI * (0.1 + ((i - 0.5) / 6) * 0.8);
      if (a < 0.05 || a > PI - 0.05) continue;
      const c = new THREE.ConeGeometry(0.01, 0.07, 5);
      c.translate(0, 0.035 + HALO.r, 0);
      c.rotateZ(a - PI / 2);
      c.translate(0, HALO.y, HALO.z);
      g.push(c);
    }
    for (const sx of [1, -1]) g.push(tube([[sx * 0.17, HALO.y + 0.09, HALO.z], [sx * 0.1, 0.24, -0.07], [sx * 0.05, 0.18, -0.09]], 0.008, { n: 8, seg: 5 }));
    parts.push(P('head', 'iron', merge(g)));
    for (let i = 0; i < 7; i++) {
      const a = PI * (0.1 + (i / 6) * 0.8);
      const x = Math.cos(a) * HALO.r,
        y = HALO.y + Math.sin(a) * HALO.r;
      wax.push(place(new THREE.CylinderGeometry(0.016, 0.018, 0.09, 8), [x, y + 0.025, HALO.z]));
      // lo que chorrea por la aureola
      for (let k = 0; k < 2; k++) wax.push(place(new THREE.ConeGeometry(0.007, 0.04 + ((i + k) % 3) * 0.025, 5), [x + (k ? 0.012 : -0.01), y - 0.02 - ((i + k) % 3) * 0.012, HALO.z + 0.01], [180, 0, 0]));
    }
    parts.push(P('head', 'candle', merge(wax)));
  }

  // ---------------------------------------------------------- la ropa
  // la casulla: abierta por delante, rota abajo, con los galones de oro
  {
    const PR = shoulders(0.41, 0.36, -0.56, 1.02).map(([y, a, b]) => [y, a, b * 1.18]);
    const hem = (t) => -0.56 - 0.07 * Math.abs(Math.cos(t)) + 0.05 * Math.max(0, Math.sin(t * 7)) ** 3;
    const t0 = 0.5,
      t1 = TAU - 0.5;
    // (partida en la cintura: si se inclina, el faldón sigue cayendo)
    const { up, low } = gownSplit(PR, hem, { n: 8, dep: 0.04, seed: 9, t0, t1, nt: 56, cz: () => -0.035 });
    const span = (B, a0, a1) => [(u, v) => B.at(mix(a0, a1, u), v), (u, v) => B.n(mix(a0, a1, u), Math.min(0.99, Math.max(0.01, v)))];
    const [bA, bN] = span(up, PI - 0.6, PI + 0.6),
      [bL, bLN] = span(low, PI - 0.6, PI + 0.6);
    const [eA, eN] = span(up, t0, t1),
      [eL, eLN] = span(low, t0, t1);
    const rib = (A, N, path, w, d, o = {}) => ribbon(A, N, path, w, d, { steps: 12, ...o });
    parts.push(PD('chest', 'clothRed', up.geo));
    parts.push(PD('hips', 'clothRed', place(low.geo, [0, 0.1, 0])));
    // los galones: la cruz en Y a la espalda y los bordes de la abertura
    parts.push(
      P(
        'chest',
        'bronze',
        merge([
          rib(bA, bN, [
            [0.5, 0.0],
            [0.5, 0.55],
          ], 0.085, 0.008),
          rib(bA, bN, [
            [0.5, 0.55],
            [0.34, 0.7],
            [0.12, 0.85],
          ], 0.075, 0.008, { steps: 10 }),
          rib(bA, bN, [
            [0.5, 0.55],
            [0.66, 0.7],
            [0.88, 0.85],
          ], 0.075, 0.008, { steps: 10 }),
          rib(eA, eN, [
            [0.004, 0.0],
            [0.004, 0.93],
          ], 0.045, 0.007),
          rib(eA, eN, [
            [0.996, 0.0],
            [0.996, 0.93],
          ], 0.045, 0.007),
        ])
      )
    );
    parts.push(
      P(
        'hips',
        'bronze',
        place(
          merge([
            rib(bL, bLN, [
              [0.5, 0.02],
              [0.5, 1.0],
            ], 0.085, 0.008),
            rib(eL, eLN, [
              [0.004, 0.02],
              [0.004, 1.0],
            ], 0.045, 0.007),
            rib(eL, eLN, [
              [0.996, 0.02],
              [0.996, 1.0],
            ], 0.045, 0.007),
          ]),
          [0, 0.1, 0]
        )
      )
    );
    // los jirones que le cuelgan del bajo
    const tat = [];
    for (let i = 0; i < 9; i++) {
      const t = mix(t0 + 0.2, t1 - 0.2, (i + 0.5) / 9);
      const p = low.at(t, 0.0);
      const L = 0.16 + ((i * 5) % 4) * 0.06;
      const sh = cloth(0.07, L, { flare: 0.4, folds: [1, 0.006], nu: 3, nv: 5, seed: i });
      tat.push(place(sh.geo, [p[0] * 0.98, p[1] + 0.02, p[2] * 0.98], [0, (t * 180) / PI, 0]));
    }
    parts.push(PD('hips', 'clothRed', place(merge(tat), [0, 0.1, 0])));
    // el palio: el anillo y la tira de la espalda, torcidos, con sus cruces
    const ring = [];
    for (let i = 0; i <= 32; i++) {
      const t = (i / 32) * TAU - PI;
      const y = 0.5 - 0.07 * Math.max(0, Math.cos(t + 0.3)) ** 6 - 0.05 * Math.max(0, -Math.cos(t)) ** 6;
      const [rx, rz] = table(PR, y);
      const r = ell(t, rx, rz) + 0.014;
      ring.push([Math.sin(t) * r, y, Math.cos(t) * r - 0.035]);
    }
    parts.push(P('chest', 'clothWhite', merge([tube(ring, [0.03, 0.006], { n: 64, seg: 4, upFn: (q) => [Math.sin(q * TAU - PI), 0.5, Math.cos(q * TAU - PI)] }), ribbon(bA, bN, [[0.47, 0.3], [0.5, 0.86]], 0.05, 0.006, { steps: 8, off: 0.012 })])));
    const cr = [];
    for (const vv of [0.45, 0.66]) {
      const p = bA(0.49, vv),
        n = bN(0.49, vv);
      const ry = (Math.atan2(n[0], n[2]) * 180) / PI;
      cr.push(gBox(0.01, 0.045, 0.004, [p[0] + n[0] * 0.02, p[1], p[2] + n[2] * 0.02], [0, ry, 0]), gBox(0.034, 0.01, 0.004, [p[0] + n[0] * 0.02, p[1] + 0.005, p[2] + n[2] * 0.02], [0, ry, 0]));
    }
    parts.push(P('chest', 'black', merge(cr)));
  }
  // el alba: hasta el suelo, en jirones, manchada
  {
    const r = robe({ top: 0.12, hem: -0.9, r0: [0.17, 0.13], r1: [0.27, 0.24], n: 11, dep: 0.035, seed: 4, ragged: 0.07, p: 1.0 });
    parts.push(PD('hips', 'clothWhite', r.geo));
    const st = [];
    for (const [t, v, w, h] of [
      [0.3, 0.12, 0.16, 0.14],
      [-0.9, 0.08, 0.12, 0.1],
      [2.4, 0.18, 0.2, 0.16],
      [-2.2, 0.1, 0.14, 0.18],
    ]) {
      const p = r.at(t, v),
        n = r.n(t, v);
      st.push(place(gSph(0.5, [0, 0, 0], [1, 1, 1], 8, 6), [p[0] + n[0] * 0.004, p[1], p[2] + n[2] * 0.004], [0, (Math.atan2(n[0], n[2]) * 180) / PI, 0], [w, h, 0.012]));
    }
    parts.push(P('hips', 'blood', merge(st)));
  }
  // (todo hecho para una altura de 1: se escala)
  const out = parts.map((pt) => ({ ...pt, p: (pt.p || [0, 0, 0]).map((x) => x * K), sc: (pt.sc || [1, 1, 1]).map((x) => x * K) }));
  return new Rig({ joints, parts: out });
}
