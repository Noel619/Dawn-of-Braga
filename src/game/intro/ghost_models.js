// Las figuras de los ecos (ghosts.js): cuerpos esculpidos (no cajas) y,
// encima, lo que cada uno llevaba, que es lo que dice quién era. Todo con un
// único material (la luz del contorno: lo que se ve son los bordes, los
// pliegues y los perfiles), así que el carácter está en la silueta: la mitra
// con sus ínfulas, la casulla que cuelga de los brazos en alto, la capucha y
// la barba partida de Martín, el mazo del cantero, el turbante y la adarga.
//
// Cada figura: { joints, parts, hold, base, k }. hold: la postura de los
// brazos cuando la pose no dice otra cosa (lo que lleva en las manos); base:
// la del cuerpo, que se suma siempre (el encorvado del viejo). Algunas tienen
// variantes (la gente, los canónigos, los almohades): ghosts.js va pasando
// por ellas.
import * as THREE from 'three';
import { humanoidJoints } from '../../entities/models.js';
import { tube, cloth, skirt, surface, surfNormal, ribbon, head, hand, merge, place, gBox, gSph, gTorus, gCone, chain, folds, table, mix, sstep, bump } from '../../entities/sculpt.js';

const PI = Math.PI,
  TAU = PI * 2;
const ad = (a) => {
  a = ((a % TAU) + TAU) % TAU;
  return a > PI ? a - TAU : a;
};
// radio de una elipse de semiejes a (x) y b (z) en el ángulo t (desde +z)
const ell = (t, a, b) => 1 / Math.sqrt((Math.sin(t) / a) ** 2 + (Math.cos(t) / b) ** 2);
const G = (j, geo, o = {}) => ({ j, type: 'geo', geo, mat: 'g', ...o });
const GD = (j, geo) => ({ j, type: 'geo', geo, mat: 'g', ds: true });

// ------------------------------------------------------------ el cuerpo
const TORSO = [
  [0, 0.152, 0.104],
  [0.2, 0.156, 0.11],
  [0.42, 0.17, 0.12],
  [0.62, 0.184, 0.122],
  [0.79, 0.198, 0.106],
  [0.88, 0.172, 0.09],
  [0.94, 0.105, 0.072],
  [1, 0.06, 0.056],
];
// el tronco, de la cintura al cuello (en el pecho): w ancho, dep fondo,
// belly tripa, pecs pecho, blades omóplatos, hunch joroba
function torso(o = {}) {
  const w = o.w ?? 1,
    dp = o.dep ?? 1,
    belly = o.belly ?? 0,
    pecs = o.pecs ?? 0.03,
    hunch = o.hunch ?? 0,
    blades = o.blades ?? 0.03;
  const path = [
    [0, -0.05, 0],
    [0, 0.12, 0.004],
    [0, 0.28, 0.006 - hunch * 0.01],
    [0, 0.42, -0.006 - hunch * 0.035],
    [0, 0.5, -0.008 - hunch * 0.045],
    [0, 0.57, 0.002 - hunch * 0.02],
  ];
  return tube(
    path,
    (s) => {
      const [rx, rz] = table(TORSO, s);
      return [rx * w, rz * dp];
    },
    {
      n: 14,
      seg: 18,
      mod: (a, s) => {
        const f = ad(a),
          b = ad(a - PI);
        return 1 + belly * bump(f, s - 0.14, 1.1, 0.17) + pecs * (bump(f - 0.6, s - 0.6, 0.5, 0.09) + bump(f + 0.6, s - 0.6, 0.5, 0.09)) + blades * (bump(b - 0.75, s - 0.68, 0.45, 0.12) + bump(b + 0.75, s - 0.68, 0.45, 0.12)) + hunch * 0.07 * bump(b, s - 0.78, 0.9, 0.12);
      },
    }
  );
}
// la pelvis (en la cadera)
function pelvis(o = {}) {
  const w = o.w ?? 1,
    dp = o.dep ?? 1;
  const T = [
    [0, 0.152, 0.104],
    [0.35, 0.163, 0.11],
    [0.68, 0.172, 0.118],
    [0.9, 0.13, 0.095],
    [1, 0.07, 0.06],
  ];
  return tube(
    [
      [0, 0.16, 0],
      [0, 0.02, 0],
      [0, -0.1, -0.005],
      [0, -0.19, 0],
    ],
    (s) => {
      const [rx, rz] = table(T, s);
      return [rx * w, rz * dp];
    },
    { n: 8, seg: 16, caps: true }
  );
}
const ARM = [
  [0, 0.058, 0.056],
  [0.3, 0.056, 0.06],
  [0.65, 0.047, 0.05],
  [1, 0.041, 0.043],
];
const FORE = [
  [0, 0.045, 0.044],
  [0.3, 0.045, 0.047],
  [0.75, 0.034, 0.032],
  [1, 0.03, 0.026],
];
// los brazos y las manos; armT: el grueso; hand, handL, handR: cómo tiene
// las manos (ver sculpt.hand)
function arms(o = {}) {
  const t = o.armT ?? 1;
  const out = [];
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    if (o.upper !== false)
      out.push(
        G(
          'arm' + s,
          tube(
            [
              [0, 0.035, 0],
              [0, -0.13, 0.004],
              [0, -0.3, 0],
            ],
            (q) => table(ARM, q).map((v) => v * t),
            { n: 8, seg: 10, caps: true, capL: 0.035 }
          )
        )
      );
    out.push(
      G(
        'fore' + s,
        tube(
          [
            [0, 0.03, 0],
            [0, -0.09, 0.004],
            [0, -0.27, 0],
          ],
          (q) => table(FORE, q).map((v) => v * t * (o.foreT ?? 1)),
          { n: 8, seg: 10, caps: true, capL: 0.025 }
        )
      )
    );
    if (o.hands !== false) out.push(G('hand' + s, hand({ side: sx, ...(o.hand || {}), ...((s === 'L' ? o.handL : o.handR) || {}) })));
  }
  return out;
}
// zapatos: del talón a la punta (la suela, a ras del suelo)
function shoe(kind = 'shoe') {
  const T =
    kind === 'pointed'
      ? [
          [0, 0.034, 0.033],
          [0.35, 0.042, 0.037],
          [0.75, 0.033, 0.024],
          [1, 0.007, 0.009],
        ]
      : kind === 'sandal'
        ? [
            [0, 0.036, 0.024],
            [0.4, 0.044, 0.026],
            [0.85, 0.04, 0.02],
            [1, 0.022, 0.014],
          ]
        : [
            [0, 0.038, 0.036],
            [0.4, 0.046, 0.04],
            [0.85, 0.04, 0.03],
            [1, 0.02, 0.02],
          ];
  const len = kind === 'pointed' ? 0.27 : 0.22;
  const y0 = kind === 'sandal' ? -0.014 : -0.004;
  return tube(
    [
      [0, y0, -0.06],
      [0, y0 - 0.008, 0.04],
      [0, y0 - 0.016, len - 0.06],
    ],
    (q) => table(T, q),
    { up: [0, 1, 0], n: 8, seg: 10, caps: true, capL: 0.02 }
  );
}
function legs(o = {}) {
  const out = [];
  const t = o.legT ?? 1;
  for (const s of ['L', 'R']) {
    if (o.thighs !== false)
      out.push(
        G(
          'leg' + s,
          tube(
            [
              [0, 0.05, 0],
              [0, -0.2, 0.012],
              [0, -0.45, 0],
            ],
            (q) =>
              table(
                [
                  [0, 0.088, 0.09],
                  [0.35, 0.078, 0.084],
                  [1, 0.052, 0.056],
                ],
                q
              ).map((v) => v * t),
            { n: 8, seg: 10, caps: true, capL: 0.04 }
          )
        )
      );
    out.push(
      G(
        'shin' + s,
        tube(
          [
            [0, 0.03, 0.004],
            [0, -0.15, -0.006],
            [0, -0.43, 0],
          ],
          (q) =>
            table(
              [
                [0, 0.052, 0.055],
                [0.3, 0.054, 0.062],
                [0.8, 0.036, 0.038],
                [1, 0.033, 0.034],
              ],
              q
            ).map((v) => v * t),
          { n: 8, seg: 10, caps: true, capL: 0.03 }
        )
      )
    );
    out.push(G('foot' + s, shoe(o.feet)));
  }
  return out;
}
// el cuello (en el pecho; neckF: adelantado, el de los viejos) y la cabeza
function neckHead(o = {}) {
  const r = o.neckR ?? 0.05,
    f = o.neckF ?? 0;
  const out = [
    G(
      'chest',
      tube(
        [
          [0, 0.47, -0.014],
          [0, 0.56, -0.004 + f * 0.5],
          [0, 0.65, 0.012 + f],
        ],
        (s) => [r * mix(1.18, 0.95, s), r * mix(1.08, 0.92, s)],
        { n: 5, seg: 10 }
      )
    ),
  ];
  if (o.tendons)
    for (const sx of [1, -1])
      out.push(
        G(
          'chest',
          tube(
            [
              [sx * 0.04, 0.64, -0.004 + f],
              [sx * 0.03, 0.57, 0.03 + f * 0.5],
              [sx * 0.012, 0.5, 0.052],
            ],
            0.0085,
            { n: 5, seg: 5, caps: true, capL: 0.01 }
          )
        )
      );
  if (o.head !== false) out.push(G('head', head(o.head || {})));
  return out;
}

// ------------------------------------------------------------ la ropa
// un faldón de la cintura (top, en la cadera) al bajo (hem): r0 y r1 [ancho,
// fondo] arriba y abajo; n pliegues de hondo dep (más hondos abajo); p: cómo
// se abre (menos de 1, enseguida; más, abajo); trail: lo que arrastra por
// detrás; diag: los pliegues en diagonal (la toga); t0, t1: abierto
function robe(o = {}) {
  const top = o.top ?? 0.13,
    hem = o.hem ?? -0.9;
  const [ax0, az0] = o.r0 || [0.172, 0.122];
  const [ax1, az1] = o.r1 || [0.27, 0.23];
  const n = o.n ?? 11,
    dep = o.dep ?? 0.035,
    seed = o.seed ?? 1,
    trail = o.trail ?? 0,
    ragged = o.ragged ?? 0,
    diag = o.diag ?? 0;
  const s = skirt(
    (t, v) => {
      const k = Math.pow(1 - v, o.p ?? 0.9);
      return ell(t, mix(ax0, ax1, k), mix(az0, az1, k)) + dep * k * folds(t + diag * (1 - v), n, seed) + (o.belly ?? 0) * bump(t, v - 0.75, 1.0, 0.3);
    },
    (t) => hem - trail * Math.max(0, -Math.cos(t)) ** 2 + ragged * Math.max(0, folds(t, 17, seed + 3)) * 0.6 - (o.wave ?? 0.012) * Math.sin(t * 3 + seed),
    top,
    { nt: o.nt ?? 44, nv: o.nv ?? 10, t0: o.t0, t1: o.t1, cz: o.cz }
  );
  return s;
}
// una manga ancha y abierta en el antebrazo: del codo (r0) a la boca (r1),
// que baja hasta y1 y es más larga por detrás (droop)
function sleeve(r0 = 0.07, r1 = 0.13, y1 = -0.3, droop = 0.08, seed = 2) {
  return surface(
    (u, v) => {
      const a = u * TAU;
      const r = mix(r0, r1, Math.pow(v, 1.3)) * (1 + 0.09 * folds(a, 3, seed) * v);
      const y = mix(0.05, y1, v) - droop * v * v * Math.max(0, -Math.cos(a));
      return [Math.sin(a) * r, y, Math.cos(a) * r * 0.92 - 0.012 * v];
    },
    16,
    6,
    { closed: true, inside: (u, v) => [0, mix(0.05, y1, v), 0] }
  );
}
// la manga de arriba, holgada (en el brazo)
function upperSleeve(r0 = 0.08, r1 = 0.075, seed = 5) {
  return tube(
    [
      [0, 0.05, 0],
      [0, -0.12, 0.004],
      [0, -0.31, 0],
    ],
    (s) => mix(r0, r1, s),
    { n: 6, seg: 12, mod: (a, s) => 1 + 0.07 * folds(a, 3, seed + s * 2) }
  );
}
// la capucha puesta (en la cabeza): una cáscara abierta por delante (open:
// medio ángulo de la abertura a la altura de la cara), con el pico atrás,
// que por abajo se abre sobre los hombros; y su reborde
function hoodUp(o = {}) {
  const c = o.c || [0, 0.118, -0.012];
  const rx = o.rx ?? 0.13,
    ry = o.ry ?? 0.152,
    rz = o.rz ?? 0.142;
  const open = o.open ?? 0.62,
    peak = o.peak ?? 0.05,
    low = o.low ?? -1.05,
    fall = o.fall ?? 0.07,
    fwd = o.fwd ?? 0.02;
  const th0 = (ph) => open * (ph < 0.5 ? 1 : Math.cos(((ph - 0.5) / (PI / 2 - 0.5)) * (PI / 2))) + 0.0001;
  const at = (th, ph) => {
    const cp = Math.cos(ph),
      sp = Math.sin(ph);
    let r = 1 + (peak / ry) * bump(ad(th - PI), ph - 1.0, 0.7, 0.35);
    const fl = fall * sstep(-0.2, low, ph);
    const x = Math.sin(th) * cp * (rx * r + fl),
      y = sp * ry * r,
      z = Math.cos(th) * cp * (rz * r + fl) + fwd * sstep(0.2, 1.2, ph);
    return [c[0] + x, c[1] + y, c[2] + z];
  };
  const f = (u, v) => {
    const ph = mix(low, PI / 2, v);
    const a = th0(ph);
    return at(mix(a, TAU - a, u), ph);
  };
  const shell = surface(f, 22, 14, { inside: () => c, poles: [false, true] });
  // el reborde: por el filo de la abertura, de abajo a arriba y otra vez abajo
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const ph = mix(low + 0.05, PI / 2 - 0.02, i / 12);
    pts.push(at(th0(ph), ph));
  }
  for (let i = 11; i >= 0; i--) {
    const ph = mix(low + 0.05, PI / 2 - 0.02, i / 12);
    pts.push(at(-th0(ph), ph));
  }
  const rim = tube(pts, o.rim ?? 0.012, { n: 40, seg: 6 });
  return merge([shell, rim]);
}
// una esclavina (en el pecho): del cuello (top) a sobre los hombros (bot),
// con la punta atrás (point); prof: [[v, k]] cómo se abre de arriba abajo
function capelet(o = {}) {
  const top = o.top ?? 0.62,
    bot = o.bot ?? 0.3;
  const [a0, b0] = o.r0 || [0.08, 0.078];
  const [a1, b1] = o.r1 || [0.3, 0.22];
  const P = o.prof || [
    [0, 1.1],
    [0.35, 1.0],
    [0.55, 0.93],
    [0.7, 0.78],
    [0.84, 0.5],
    [0.94, 0.2],
    [1, 0],
  ];
  return skirt(
    (t, v) => {
      const k = table(P, v)[0];
      return ell(t, mix(a0, a1, k), mix(b0, b1, k)) + (o.dep ?? 0.018) * Math.max(0, 1.6 - v * 1.6) * k * folds(t, o.n ?? 7, o.seed ?? 4);
    },
    (t) => bot - (o.point ?? 0) * Math.max(0, -Math.cos(t)) ** 4 - (o.frontDip ?? 0) * Math.max(0, Math.cos(t)) ** 4,
    top,
    { nt: 40, nv: 8, cz: o.cz }
  );
}
// una campana desde el cuello (en el pecho): PR, el perfil [[y, ancho,
// fondo], ...] de abajo arriba; hem(t), la altura del bajo; n pliegues de
// hondo dep, más hondos abajo; t0, t1: abierta por delante (un manto)
function gown(PR, hem, o = {}) {
  const top = PR[PR.length - 1][0];
  const y0 = PR[0][0];
  return skirt(
    (t, v) => {
      const y = mix(typeof hem === 'function' ? hem(t) : hem, top, v);
      const [rx, rz] = table(PR, y);
      const k = sstep(o.fy ?? 0.42, y0, y);
      return ell(t, rx, rz) + (o.dep ?? 0.03) * k * folds(t + (o.diag ?? 0) * (1 - v), o.n ?? 9, o.seed ?? 5) + (o.front ?? 0) * Math.max(0, Math.cos(t)) * k;
    },
    hem,
    top,
    { nt: o.nt ?? 48, nv: o.nv ?? 16, t0: o.t0, t1: o.t1, cz: o.cz }
  );
}
// el perfil de los hombros de una campana: del cuello (0.6) a los hombros y
// luego abajo, abriéndose hasta (ax, az) en y = yb
function shoulders(ax, az, yb, w = 1) {
  return [
    [yb, ax, az],
    [mix(yb, 0.4, 0.5), mix(ax, 0.3 * w, 0.62), mix(az, 0.185, 0.62)],
    [0.4, 0.3 * w, 0.185],
    [0.46, 0.293 * w, 0.175],
    [0.51, 0.262 * w, 0.158],
    [0.55, 0.205 * w, 0.132],
    [0.58, 0.14, 0.104],
    [0.6, 0.085, 0.08],
  ];
}
// un cordón alrededor de la cintura (en la cadera, a la altura y) y, si
// tiene, el cabo que cuelga con sus nudos
function cord(y = 0.1, rx = 0.19, rz = 0.14, r = 0.012, tail = null) {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * TAU;
    pts.push([Math.sin(a) * rx, y + 0.01 * Math.cos(a), Math.cos(a) * rz]);
  }
  const out = [tube(pts, r, { n: 48, seg: 6 })];
  if (tail) {
    out.push(tube(tail, r * 0.9, { n: 16, seg: 6, caps: true }));
    for (const k of tail.knots || []) out.push(gSph(r * 2.1, k, [1, 1.2, 1], 8, 6));
  }
  return merge(out);
}
// una tela que cuelga (ver sculpt.cloth), colocada
function drape(w, h, o, p, r = [0, 0, 0]) {
  const c = cloth(w, h, o);
  let geo = c.geo;
  if (o.trim) geo = merge([geo, ...o.trim(c)]);
  return place(geo, p, r);
}

// ------------------------------------------------------------ los objetos
// el incensario: cuelga de la mano por sus cadenas (articulación 'censer')
function thurible() {
  const yb = -0.64;
  const L = (pts, seg) =>
    new THREE.LatheGeometry(
      pts.map(([x, y]) => new THREE.Vector2(x, y)),
      seg
    );
  const bowl = place(
    L(
      [
        [0.001, -0.085],
        [0.034, -0.086],
        [0.036, -0.07],
        [0.028, -0.062],
        [0.058, -0.05],
        [0.076, -0.024],
        [0.08, 0.0],
        [0.074, 0.012],
      ],
      16
    ),
    [0, yb, 0]
  );
  const lid = place(
    L(
      [
        [0.076, 0.014],
        [0.072, 0.04],
        [0.06, 0.07],
        [0.042, 0.088],
        [0.03, 0.1],
        [0.034, 0.112],
        [0.03, 0.13],
        [0.022, 0.16],
        [0.012, 0.18],
        [0.001, 0.21],
      ],
      16
    ),
    [0, yb, 0]
  );
  const out = [bowl, lid];
  // los calados de la tapa
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    out.push(gTorus(0.012, 0.003, [Math.sin(a) * 0.066, yb + 0.045, Math.cos(a) * 0.066], [0, (a * 180) / PI, 0], 8, 4));
  }
  // las cadenas: tres al borde y una a la tapa, a un aro en la mano
  const links = (a, b) => tube([a, b], 0.0035, { n: 24, seg: 4, mod: (q, s) => 1 + 0.7 * Math.abs(Math.sin(s * 70)) });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.3;
    out.push(links([Math.sin(a) * 0.072, yb + 0.012, Math.cos(a) * 0.072], [Math.sin(a) * 0.012, -0.03, Math.cos(a) * 0.012]));
  }
  out.push(links([0, yb + 0.21, 0], [0, -0.03, 0]));
  out.push(gTorus(0.022, 0.004, [0, -0.025, 0], [90, 0, 0], 12, 4));
  out.push(gSph(0.02, [0, -0.005, 0], [1, 0.6, 1], 10, 6));
  return merge(out);
}
// el farol de Martín: cuelga de la mano por su asa (articulación 'lamp');
// la llama, en (0, -0.19, 0)
function lantern() {
  const out = [];
  out.push(gTorus(0.03, 0.005, [0, -0.015, 0], [0, 0, 0], 12, 4));
  out.push(gCone(0.078, 0.075, 4, [0, -0.085, 0], [0, 45, 0]));
  out.push(gSph(0.012, [0, -0.045, 0], [1, 1, 1], 8, 6));
  out.push(gBox(0.11, 0.012, 0.11, [0, -0.122, 0]));
  out.push(gBox(0.11, 0.014, 0.11, [0, -0.272, 0]));
  out.push(gBox(0.07, 0.02, 0.07, [0, -0.29, 0]));
  for (const [x, z] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ])
    out.push(gBox(0.012, 0.15, 0.012, [x * 0.05, -0.197, z * 0.05]));
  // los cuernos (las ventanas) y su cruz de hierro
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    out.push(gBox(0.088, 0.13, 0.003, [Math.sin(a) * 0.05, -0.197, Math.cos(a) * 0.05], [0, (a * 180) / PI, 0]));
    out.push(gBox(0.006, 0.13, 0.006, [Math.sin(a) * 0.053, -0.197, Math.cos(a) * 0.053], [0, (a * 180) / PI, 0]));
  }
  return merge(out);
}
// un asta en la mano: a lo largo de su z (delante, con el antebrazo
// horizontal: vertical), de z0 a z1, a la altura del puño
function shaft(z0, z1, r, mod = null, y = -0.045) {
  return tube(
    [
      [0, y, z0],
      [0, y, z1],
    ],
    r,
    { n: mod ? 24 : 2, seg: 7, caps: true, mod }
  );
}

// ------------------------------------------------------------ las figuras
// El arzobispo (1167): viejo, alto y seco, el cuello adelantado y lleno de
// tendones, la nariz de gavilán y una barba corta en punta. La mitra alta
// con sus ínfulas; la casulla de campana con la cruz en Y a la espalda y el
// palio encima; la alba hasta los pies; el manípulo en la muñeca; el anillo;
// el incensario. Con los brazos en alto, la casulla le cuelga de ellos.
function arch() {
  const parts = [];
  parts.push(G('chest', torso({ w: 0.98, dep: 1.0, hunch: 0.7, pecs: 0.0 })));
  parts.push(G('hips', pelvis({ w: 1.0 })));
  parts.push(...neckHead({ neckR: 0.044, neckF: 0.03, tendons: true, head: { w: 0.95, h: 1.03, nose: 0.034, hook: 0.006, brow: 0.01, socket: 0.014, gaunt: 0.01, cheek: 0.008, jaw: 0.86, chin: 0.008, ears: 0.022, beard: 0.006, beardLen: 0.045, crown: 0.006 } }));
  parts.push(...arms({ armT: 0.9, foreT: 0.92, hand: { len: 1.18, thick: 0.86, curl: 0.18, spread: 0.45 } }));
  parts.push(...legs({ feet: 'pointed', legT: 0.9 }));
  // la mitra
  {
    const y0 = 0.168,
      H = 0.31,
      W = 0.097,
      D = 0.11;
    const panel = (sz) => (u, v) => {
      const xe = W * Math.pow(Math.max(0, 1 - Math.pow(v, 1.7)), 0.62) + 0.0005;
      const x = (u * 2 - 1) * xe;
      const q = Math.max(0, 1 - (u * 2 - 1) ** 2);
      const z = sz * (D * mix(1, 0.24, v) * Math.sqrt(q) + 0.004);
      return [x, y0 + v * H - 0.02 * sz * (1 - v) * 0, z];
    };
    const geos = [];
    for (const sz of [1, -1]) {
      const F = panel(sz);
      const inside = (u, v) => [0, y0 + v * H, -sz * 0.3];
      geos.push(surface(F, 14, 12, { inside }));
      const N = (u, v) => surfNormal(F, Math.min(0.995, Math.max(0.005, u)), Math.min(0.995, Math.max(0.005, v)), inside(u, v));
      // el círculo de abajo y el título (las bandas bordadas) con su joya
      geos.push(
        ribbon(
          F,
          N,
          [
            [0.5, 0.15],
            [0.5, 0.92],
          ],
          0.034,
          0.006,
          { steps: 10 }
        )
      );
      const pj = F(0.5, 0.07),
        nj = N(0.5, 0.07);
      geos.push(gSph(0.011, [pj[0] + nj[0] * 0.01, pj[1], pj[2] + nj[2] * 0.01], [1, 1, 0.7], 8, 6));
      const pk = F(0.5, 0.5),
        nk = N(0.5, 0.5);
      geos.push(gSph(0.009, [pk[0] + nk[0] * 0.009, pk[1], pk[2] + nk[2] * 0.009], [1, 1, 0.7], 8, 6));
    }
    // el círculo: la banda bordada de abajo, alrededor
    {
      const vb = 0.075,
        xe = W * Math.pow(1 - Math.pow(vb, 1.7), 0.62),
        ze = D * mix(1, 0.24, vb) + 0.004;
      const ring = [];
      for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * TAU;
        ring.push([Math.sin(a) * (xe + 0.004), y0 + vb * H, Math.cos(a) * (ze + 0.004)]);
      }
      geos.push(tube(ring, [0.024, 0.005], { n: 80, seg: 4, upFn: (q) => [Math.sin(q * TAU) / xe, 0, Math.cos(q * TAU) / ze] }));
    }
    // las ínfulas: dos cintas que caen por la espalda, con sus flecos
    for (const sx of [1, -1]) {
      const c = cloth(0.056, 0.4, { flare: 1.25, folds: [1, 0.004], seed: sx + 2, nu: 4, nv: 8, out: (v) => -0.02 * v });
      const fr = [];
      for (let i = 0; i < 6; i++) {
        const u = (i + 0.5) / 6;
        const p = c.at(u, 1);
        fr.push(tube([p, [p[0] * 1.05, p[1] - 0.045, p[2] - 0.004]], 0.0035, { n: 2, seg: 4 }));
      }
      // una cruz bordada en cada una
      const pc = c.at(0.5, 0.78);
      fr.push(gBox(0.008, 0.05, 0.004, [pc[0], pc[1], pc[2] - 0.003]), gBox(0.034, 0.008, 0.004, [pc[0], pc[1] + 0.008, pc[2] - 0.003]));
      geos.push(place(merge([c.geo, ...fr]), [sx * 0.042, y0 + 0.035, -D + 0.012], [12, 180, -sx * 5]));
    }
    parts.push(GD('head', place(merge(geos), [0, 0.0, 0.004], [-9, 0, 0])));
  }
  // el amito: el cuello bordado alrededor del cuello
  {
    const ring = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * TAU;
      ring.push([Math.sin(a) * 0.088, 0.575 - 0.012 * Math.max(0, Math.cos(a)), Math.cos(a) * 0.08 + 0.008]);
    }
    parts.push(G('chest', tube(ring, 0.014, { n: 48, seg: 6 })));
  }
  // la casulla: una campana del cuello a media pierna, más corta en los
  // costados (donde la alzan los brazos), con su galón (delante, la columna;
  // detrás, la cruz en Y), y el palio encima
  {
    const PR = [
      [0.58, 0.085, 0.08],
      [0.54, 0.2, 0.135],
      [0.49, 0.29, 0.17],
      [0.42, 0.315, 0.19],
      [0.2, 0.325, 0.215],
      [-0.1, 0.335, 0.24],
      [-0.5, 0.35, 0.27],
    ].reverse();
    const hem = (t) => -0.24 - 0.24 * Math.abs(Math.cos(t)) ** 1.4 - 0.03 * Math.max(0, -Math.cos(t));
    const bell = skirt(
      (t, v) => {
        const y = mix(hem(t), 0.58, v);
        const [rx, rz] = table(PR, y);
        const k = sstep(0.45, -0.4, y);
        return ell(t, rx, rz) + 0.03 * k * folds(t, 9, 5) + 0.012 * Math.max(0, Math.cos(t)) * k;
      },
      hem,
      0.58,
      { nt: 52, nv: 16, cz: (v) => 0.006 }
    );
    // (en el espacio (u, v) de un trozo, de t0 a t1)
    const span = (t0, t1) => [(u, v) => bell.at(mix(t0, t1, u), v), (u, v) => bell.n(mix(t0, t1, u), Math.min(0.99, Math.max(0.01, v)))];
    const [fA, fN] = span(-0.4, 0.4),
      [bA, bN] = span(PI - 0.6, PI + 0.6);
    const g = [bell.geo];
    // delante, la columna
    g.push(
      ribbon(
        fA,
        fN,
        [
          [0.5, 0.02],
          [0.5, 0.93],
        ],
        0.075,
        0.007,
        { steps: 16 }
      )
    );
    // detrás, la cruz en Y
    g.push(
      ribbon(
        bA,
        bN,
        [
          [0.5, 0.02],
          [0.5, 0.7],
        ],
        0.08,
        0.008,
        { steps: 14 }
      ),
      ribbon(
        bA,
        bN,
        [
          [0.5, 0.7],
          [0.34, 0.8],
          [0.12, 0.9],
        ],
        0.07,
        0.008,
        { steps: 10 }
      ),
      ribbon(
        bA,
        bN,
        [
          [0.5, 0.7],
          [0.66, 0.8],
          [0.88, 0.9],
        ],
        0.07,
        0.008,
        { steps: 10 }
      )
    );
    // el galón del borde
    g.push(
      ribbon(
        (u, v) => bell.at(mix(-PI, PI, u), v),
        (u, v) => bell.n(mix(-PI, PI, u), Math.max(0.01, v)),
        Array.from({ length: 25 }, (_, i) => [i / 24, 0.012]),
        0.03,
        0.006,
        { steps: 96 }
      )
    );
    // el palio: el anillo sobre los hombros y las tiras de delante y de
    // detrás, con sus cruces
    const ring = [];
    for (let i = 0; i <= 32; i++) {
      const t = (i / 32) * TAU - PI;
      const y = 0.5 - 0.06 * Math.max(0, Math.cos(t)) ** 6 - 0.05 * Math.max(0, -Math.cos(t)) ** 6;
      const [rx, rz] = table(PR, y);
      const r = ell(t, rx, rz) + 0.012;
      ring.push([Math.sin(t) * r, y, Math.cos(t) * r + 0.006]);
    }
    g.push(tube(ring, [0.028, 0.005], { n: 64, seg: 4, upFn: (q) => [Math.sin(q * TAU - PI), 0.5, Math.cos(q * TAU - PI)] }));
    for (const [A, N] of [
      [fA, fN],
      [bA, bN],
    ]) {
      g.push(
        ribbon(
          A,
          N,
          [
            [0.5, 0.48],
            [0.5, 0.86],
          ],
          0.046,
          0.006,
          { steps: 8, off: 0.009 }
        )
      );
      for (const vv of [0.56, 0.72]) {
        const p = A(0.5, vv),
          n = N(0.5, vv);
        const ry = (Math.atan2(n[0], n[2]) * 180) / PI;
        g.push(gBox(0.008, 0.04, 0.004, [p[0] + n[0] * 0.015, p[1], p[2] + n[2] * 0.015], [0, ry, 0]), gBox(0.03, 0.008, 0.004, [p[0] + n[0] * 0.015, p[1] + 0.004, p[2] + n[2] * 0.015], [0, ry, 0]));
      }
    }
    parts.push(GD('chest', merge(g)));
    // lo que cae de los brazos (articulaciones 'drapeL/R', en el codo, que
    // cuelgan a plomo): con los brazos abajo, una manga ancha sobre el
    // antebrazo; en alto, la casulla que se alza con ellos
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1;
      const t0 = sx > 0 ? -0.5 : PI - 0.5 + PI,
        t1 = sx > 0 ? PI + 0.5 : TAU + 0.5 + PI;
      const d = skirt(
        (t, v) => mix(0.2, 0.1, Math.pow(v, 0.8)) + 0.025 * (1 - v) * folds(t, 3, 6 + sx),
        (t) => -0.5 - 0.12 * Math.max(0, Math.sin(t) * sx) - 0.04 * Math.sin(t * 2.3),
        0.07,
        { nt: 18, nv: 8, t0: Math.min(t0, t1), t1: Math.max(t0, t1) }
      );
      parts.push(GD('drape' + s, place(d.geo, [-sx * 0.02, 0, 0])));
    }
  }
  // la alba, hasta los pies, con el aparejo bordado delante
  {
    const r = robe({ top: 0.12, hem: -0.905, r0: [0.168, 0.12], r1: [0.25, 0.21], n: 13, dep: 0.03, seed: 2, trail: 0.03, p: 1.1 });
    const N = (t, v) => r.n(t, v);
    const fr = [r.geo];
    fr.push(
      ribbon(
        (u, v) => r.at(mix(-0.36, 0.36, u), v),
        (u, v) => N(mix(-0.36, 0.36, u), v),
        [
          [0, 0.1],
          [0.5, 0.1],
          [1, 0.1],
        ],
        0.1,
        0.006,
        { steps: 10 }
      )
    );
    parts.push(G('hips', merge(fr)));
  }
  // el manípulo, colgado de la muñeca izquierda, con su fleco
  {
    const c = cloth(0.06, 0.36, { flare: 1.3, folds: [1, 0.004], nu: 4, nv: 8 });
    const fr = [c.geo];
    for (let i = 0; i < 5; i++) {
      const p = c.at((i + 0.5) / 5, 1);
      fr.push(tube([p, [p[0], p[1] - 0.04, p[2]]], 0.0035, { n: 2, seg: 4 }));
    }
    parts.push(GD('foreL', place(merge(fr), [0.035, -0.17, 0.0], [0, 90, 0])));
  }
  // el anillo
  parts.push(G('handR', merge([gTorus(0.0125, 0.0035, [0.006, -0.115, -0.01], [0, 0, 90], 10, 4), gSph(0.0075, [0.019, -0.115, -0.01], [1, 1, 1], 8, 6)])));
  parts.push(G('censer', thurible()));
  const joints = humanoidJoints(1.03);
  joints.push({ name: 'censer', parent: 'handR', pos: [0, -0.08, 0.02] });
  joints.push({ name: 'drapeL', parent: 'armL', pos: [0, -0.24, 0] });
  joints.push({ name: 'drapeR', parent: 'armR', pos: [0, -0.24, 0] });
  return { joints, parts, k: 1.03, base: { chest: [5, 0, 0], head: [6, 0, 0] } };
}

// San Martín de Dumio: viejo, encorvado bajo la capucha, la barba partida
// hasta el pecho. El hábito basto con remiendos, el escapulario, la cuerda
// de tres nudos; cruzada al pecho, la cadena con la que cerró lo que no
// rompió. En la izquierda, el cayado; en la derecha, el farol.
function martin() {
  const parts = [];
  parts.push(G('chest', torso({ w: 1.12, dep: 1.12, hunch: 1.0, pecs: 0 })));
  parts.push(...neckHead({ neckR: 0.048, neckF: 0.035, head: { w: 0.98, nose: 0.032, hook: 0.004, brow: 0.011, socket: 0.014, gaunt: 0.009, cheek: 0.008, jaw: 0.9, ears: 0.0, beard: 0.014, beardLen: 0.17, fork: 0.6 } }));
  parts.push(...arms({ armT: 1.0, hand: { thick: 1.12, curl: 0.72, spread: 0.1 } }));
  parts.push(...legs({ feet: 'sandal', thighs: false }));
  parts.push(GD('head', hoodUp({ open: 0.6, peak: 0.07, fall: 0.09, fwd: 0.03, rim: 0.014 })));
  parts.push(G('chest', capelet({ top: 0.6, bot: 0.26, r1: [0.31, 0.24], point: 0.12, n: 7, dep: 0.02, seed: 4 }).geo));
  // el hábito: hondo, basto, el bajo roto
  {
    const r = robe({ top: 0.14, hem: -0.905, r0: [0.19, 0.14], r1: [0.31, 0.27], n: 9, dep: 0.05, seed: 6, trail: 0.05, ragged: 0.035, p: 0.95 });
    // los remiendos
    const pat = [];
    for (const [t, v, w, h] of [
      [0.5, 0.35, 0.09, 0.08],
      [-2.4, 0.55, 0.07, 0.1],
    ]) {
      const p = r.at(t, v),
        n = r.n(t, v);
      pat.push(gBox(w, h, 0.006, [p[0] + n[0] * 0.006, p[1], p[2] + n[2] * 0.006], [0, (Math.atan2(n[0], n[2]) * 180) / PI, 3]));
    }
    parts.push(G('hips', merge([r.geo, ...pat])));
  }
  // el escapulario, delante y detrás
  parts.push(G('chest', drape(0.28, 1.12, { flare: 1.12, folds: [2, 0.01], seed: 2, wrap: 0.2, out: (v) => 0.07 * v * v, hem: (u) => -0.04 * Math.abs(2 * u - 1), nu: 8, nv: 10 }, [0, 0.36, 0.16])));
  parts.push(G('chest', drape(0.3, 1.18, { flare: 1.12, folds: [2, 0.012], seed: 4, wrap: 0.22, out: (v) => 0.08 * v * v, nu: 8, nv: 10 }, [0, 0.4, -0.165], [0, 180, 0])));
  // la cuerda con sus tres nudos
  parts.push(
    G(
      'hips',
      cord(0.11, 0.2, 0.158, 0.012, Object.assign(
        [
          [0.09, 0.09, 0.15],
          [0.11, -0.06, 0.2],
          [0.12, -0.24, 0.22],
          [0.115, -0.44, 0.24],
          [0.12, -0.52, 0.245],
        ],
        { knots: [[0.112, -0.14, 0.212], [0.118, -0.3, 0.228], [0.118, -0.45, 0.24]] }
      ))
    )
  );
  // la cadena cruzada al pecho, del hombro izquierdo a la cadera derecha
  parts.push(
    G(
      'chest',
      merge([
        chain([0.16, 0.5, 0.11], [0.08, 0.34, 0.175], 6, 0.019, 0.0055, 0.004),
        chain([0.08, 0.34, 0.175], [-0.04, 0.18, 0.17], 7, 0.019, 0.0055, 0.004),
        chain([-0.04, 0.18, 0.17], [-0.15, 0.02, 0.15], 7, 0.019, 0.0055, 0.004),
        chain([0.16, 0.5, -0.11], [0.0, 0.32, -0.175], 7, 0.019, 0.0055, 0.004),
        chain([0.0, 0.32, -0.175], [-0.17, 0.04, -0.15], 9, 0.019, 0.0055, 0.004),
      ])
    )
  );
  // mangas anchas
  for (const s of ['L', 'R']) {
    parts.push(G('arm' + s, upperSleeve(0.085, 0.082, s === 'L' ? 3 : 7)));
    parts.push(GD('fore' + s, sleeve(0.085, 0.14, -0.27, 0.09, s === 'L' ? 1 : 4)));
  }
  // el cayado: nudoso, con la vuelta arriba
  {
    const knot = (a, s) => 1 + 0.16 * Math.max(0, Math.sin(s * 47 + 1.3)) ** 6 + 0.06 * Math.sin(s * 13 + a);
    const crook = tube(
      [
        [0, -0.045, 0.38],
        [0, -0.05, 0.5],
        [0, -0.075, 0.58],
        [0, -0.13, 0.615],
        [0, -0.175, 0.585],
        [0, -0.18, 0.53],
        [0, -0.155, 0.5],
      ],
      (s) => 0.022 * mix(1, 0.8, s),
      { n: 18, seg: 7, caps: true }
    );
    parts.push(G('handL', merge([shaft(-1.34, 0.4, 0.023, knot), crook])));
  }
  parts.push(G('lamp', lantern()));
  const joints = humanoidJoints(0.97);
  joints.push({ name: 'lamp', parent: 'handR', pos: [0, -0.07, 0.01] });
  return { joints, parts, k: 0.97, base: { chest: [11, 0, 0], head: [-2, 0, 0] }, lampY: -0.19 };
}

// El sacerdote romano: capite velato, la toga echada sobre la cabeza; la
// cara afeitada, la nariz romana, la mandíbula cuadrada y la ínfula (la
// cinta de lana) en la frente. La toga cae en diagonal, con el seno (el
// rollo que cruza por delante hasta las rodillas); debajo, la túnica.
function roman(v = 0) {
  const parts = [];
  parts.push(G('chest', torso({ w: 1.08, dep: 1.06 })));
  parts.push(...neckHead({ neckR: 0.052, head: { w: 1.04, nose: 0.032, hook: 0.005 + v * 0.003, brow: 0.011, socket: 0.011, jaw: 1.0, chin: 0.012, cheek: 0.006, ears: 0.0, crown: 0.008 } }));
  parts.push(...arms({ hand: { curl: 0.15, spread: 0.35 } }));
  parts.push(...legs({ feet: 'sandal', thighs: false }));
  parts.push(GD('head', hoodUp({ open: 0.82, peak: 0.0, fall: 0.11, fwd: -0.015, low: -1.1, rx: 0.135, rz: 0.15, ry: 0.15, rim: 0.016 })));
  // la ínfula: una cinta en la frente y sus dos colas a las sienes
  parts.push(
    G(
      'head',
      merge([
        place(gTorus(0.093, 0.007, [0, 0, 0], [90, 0, 0], 24, 4), [0, 0.185, 0.012], [-12, 0, 0], [1, 1, 1.12]),
        tube(
          [
            [0.085, 0.17, 0.0],
            [0.1, 0.08, -0.01],
            [0.105, 0.0, -0.02],
          ],
          [0.009, 0.003],
          { n: 6, seg: 4, up: [1, 0, 0] }
        ),
        tube(
          [
            [-0.085, 0.17, 0.0],
            [-0.1, 0.08, -0.01],
            [-0.105, 0.0, -0.02],
          ],
          [0.009, 0.003],
          { n: 6, seg: 4, up: [1, 0, 0] }
        ),
      ])
    )
  );
  // la toga arriba: sobre los hombros, en diagonal
  parts.push(G('chest', gown(shoulders(0.25, 0.18, -0.02, 1.0), -0.02, { n: 6, dep: 0.02, seed: 8, diag: 1.2, fy: 0.5 }).geo));
  // el umbo: lo que se saca del seno sobre el pecho
  parts.push(G('chest', place(gSph(0.07, [0, 0, 0], [1.2, 0.7, 0.55], 10, 8), [0.06, 0.22, 0.175], [0, 0, -30])));
  // la toga abajo (hasta media pierna, en diagonal) y la túnica hasta el pie
  parts.push(G('hips', robe({ top: 0.15, hem: -0.6, r0: [0.2, 0.15], r1: [0.29, 0.25], n: 7, dep: 0.045, seed: 3, diag: 1.3, p: 0.8, wave: 0.04 }).geo));
  parts.push(G('hips', robe({ top: -0.4, hem: -0.9, r0: [0.22, 0.19], r1: [0.235, 0.205], n: 12, dep: 0.012, seed: 9, p: 1 }).geo));
  // el seno: un rollo de tela que cruza por delante de la cadera derecha,
  // baja a la rodilla y sube al hombro izquierdo
  parts.push(
    G(
      'hips',
      tube(
        [
          [-0.2, 0.05, 0.11],
          [-0.17, -0.25, 0.2],
          [-0.07, -0.45, 0.25],
          [0.07, -0.42, 0.24],
          [0.17, -0.2, 0.2],
          [0.21, 0.08, 0.14],
        ],
        (s) => 0.034 * (1 - 0.3 * Math.abs(s - 0.5)),
        { n: 24, seg: 8, mod: (a, s) => 1 + 0.18 * Math.sin(a * 2 + s * 9) }
      )
    )
  );
  parts.push(G('chest', tube([[0.21, -0.02, 0.14], [0.2, 0.25, 0.16], [0.17, 0.48, 0.1], [0.15, 0.56, -0.02]], 0.03, { n: 12, seg: 8 })));
  // la toga sobre el brazo izquierdo (cuelga del antebrazo)
  parts.push(GD('foreL', sleeve(0.065, 0.1, -0.2, 0.05, 6)));
  parts.push(GD('foreL', place(cloth(0.2, 0.5, { flare: 1.3, folds: [2, 0.02], wrap: 0.1, hem: (u) => 0.15 * u, nu: 8, nv: 8 }).geo, [0.0, -0.05, -0.06], [0, 90, 0])));
  parts.push(G('armL', upperSleeve(0.085, 0.085, 2)));
  // la manga corta de la túnica en el derecho
  parts.push(GD('armR', sleeve(0.075, 0.085, -0.17, 0.02, 3)));
  return { joints: humanoidJoints(1.0), parts, k: 1.0, base: { chest: [-2, 0, 0], head: [2, 0, 0] } };
}

// El cantero: ancho, bajo, el cuello de toro, calvo con una barba espesa y
// un trapo atado a la frente. La túnica de un hombro (el derecho al aire),
// el mandil de cuero, el cinto con su bolsa; los antebrazos vendados; el
// mazo en la derecha y el cincel en la izquierda.
function cantero() {
  const parts = [];
  parts.push(G('chest', torso({ w: 1.2, dep: 1.13, pecs: 0.07, belly: 0.05, blades: 0.05 })));
  parts.push(G('hips', pelvis({ w: 1.12, dep: 1.1 })));
  parts.push(...neckHead({ neckR: 0.062, head: { w: 1.1, h: 0.97, d: 1.04, nose: 0.026, noseW: 1.4, brow: 0.013, socket: 0.011, jaw: 1.08, chin: 0.006, cheek: 0.008, ears: 0.02, beard: 0.018, beardLen: 0.05 } }));
  parts.push(...arms({ armT: 1.3, foreT: 1.18, hand: { k: 1.12, thick: 1.25, curl: 0.82, spread: 0.1 } }));
  parts.push(...legs({ legT: 1.12 }));
  // el trapo de la frente, con el nudo y las puntas detrás
  parts.push(
    G(
      'head',
      merge([
        place(gTorus(0.095, 0.011, [0, 0, 0], [90, 0, 0], 24, 5), [0, 0.19, 0.008], [-10, 0, 0], [1, 1, 1.1]),
        gSph(0.018, [0, 0.185, -0.108], [1.3, 1, 0.8], 8, 6),
        tube([[0.0, 0.18, -0.112], [0.025, 0.12, -0.13], [0.03, 0.07, -0.125]], [0.016, 0.004], { n: 5, seg: 4, up: [0, 0, 1] }),
        tube([[0.0, 0.18, -0.112], [-0.02, 0.13, -0.135], [-0.035, 0.09, -0.13]], [0.014, 0.004], { n: 5, seg: 4, up: [0, 0, 1] }),
      ])
    )
  );
  // la túnica: hasta la rodilla, y la banda sobre el hombro izquierdo
  parts.push(G('hips', robe({ top: 0.14, hem: -0.44, r0: [0.2, 0.145], r1: [0.27, 0.22], n: 9, dep: 0.03, seed: 4, p: 0.8, ragged: 0.03 }).geo));
  parts.push(
    G(
      'chest',
      merge([
        tube(
          [
            [0.2, 0.5, 0.0],
            [0.12, 0.42, 0.14],
            [0.0, 0.28, 0.165],
            [-0.12, 0.14, 0.15],
            [-0.18, 0.03, 0.1],
          ],
          [0.055, 0.012],
          { n: 16, seg: 6, up: [0, 0, 1], mod: (a, s) => 1 + 0.1 * Math.sin(s * 20) }
        ),
        tube(
          [
            [0.2, 0.5, 0.0],
            [0.12, 0.42, -0.13],
            [0.0, 0.28, -0.15],
            [-0.12, 0.14, -0.14],
            [-0.18, 0.03, -0.1],
          ],
          [0.06, 0.012],
          { n: 16, seg: 6, up: [0, 0, -1] }
        ),
        place(gSph(0.07, [0, 0, 0], [1.15, 0.5, 1.25], 10, 8), [0.2, 0.52, 0], [0, 0, -24]),
      ])
    )
  );
  // el mandil de cuero, el cinto y la bolsa
  parts.push(G('hips', drape(0.36, 0.52, { flare: 1.08, folds: [1, 0.006], wrap: 0.3, out: (v) => 0.03 * v, hem: (u) => -0.03 * Math.abs(2 * u - 1), nu: 10, nv: 6 }, [0, 0.1, 0.165])));
  parts.push(G('hips', cord(0.1, 0.205, 0.155, 0.016)));
  parts.push(G('hips', merge([place(gSph(0.05, [0, 0, 0], [0.8, 1, 0.55], 10, 8), [-0.2, -0.02, 0.06]), gTorus(0.016, 0.004, [-0.2, 0.05, 0.065], [0, 90, 0], 8, 4)])));
  // las vendas de los antebrazos y de las piernas
  for (const s of ['L', 'R']) {
    parts.push(G('fore' + s, merge([0, 1, 2].map((i) => place(gTorus(0.04 - i * 0.003, 0.008, [0, 0, 0], [90, 0, 0], 12, 4), [0, -0.17 - i * 0.03, 0], [i * 8 - 8, 0, i * 6])))));
    parts.push(G('shin' + s, merge([0, 1, 2, 3].map((i) => place(gTorus(0.05 - i * 0.004, 0.009, [0, 0, 0], [90, 0, 0], 12, 4), [0, -0.12 - i * 0.075, 0], [i % 2 ? 8 : -8, 0, 0])))));
  }
  // el mazo (cabeza de madera atravesada) y el cincel
  parts.push(G('handR', merge([shaft(-0.08, 0.24, 0.016), place(new THREE.CylinderGeometry(0.058, 0.055, 0.17, 12), [0, -0.045, 0.29], [0, 0, 90]), gTorus(0.057, 0.005, [0.07, -0.045, 0.29], [0, 90, 0], 12, 4), gTorus(0.057, 0.005, [-0.07, -0.045, 0.29], [0, 90, 0], 12, 4)])));
  parts.push(G('handL', merge([shaft(-0.06, 0.17, 0.008), place(gBox(0.03, 0.005, 0.03), [0, -0.045, 0.18])])));
  return { joints: humanoidJoints(0.96), parts, k: 0.96, base: { chest: [3, 0, 0] } };
}

// Los que se taparon la cara: monjes con un velo que les cubre la cabeza
// entera y les cae al pecho; debajo del paño se adivina la cara (la nariz,
// las cejas, la boca abierta). Encima, la capucha. Son los que Martín puso
// delante de la puerta: los Velados.
function veiled(v = 0) {
  const parts = [];
  parts.push(G('chest', torso({ w: 1.06, dep: 1.08, hunch: 0.4 })));
  parts.push(...neckHead({ head: false }));
  parts.push(...arms({ hand: { curl: 0.3, spread: 0.5, len: 1.08 } }));
  parts.push(...legs({ thighs: false }));
  // el velo: el paño sobre la cabeza y la cara, hasta el pecho
  {
    const hc = [0, 0.118, 0.012];
    const face = (t, ph) => {
      // la cara que se adivina debajo
      let d = 0.013 * bump(t, ph - 0.25, 0.7, 0.1);
      const nt = sstep(0.24, -0.12, ph);
      d += 0.03 * nt * (ph > -0.14 ? 1 : Math.exp(-(((ph + 0.14) / 0.06) ** 2))) * Math.exp(-((t / 0.12) ** 2));
      d -= 0.012 * (bump(t - 0.36, ph - 0.12, 0.2, 0.1) + bump(t + 0.36, ph - 0.12, 0.2, 0.1));
      d -= 0.008 * bump(t, ph + 0.4, 0.25, 0.06);
      d += 0.012 * bump(t, ph + 0.66, 0.3, 0.12);
      return d * Math.max(0, Math.cos(t));
    };
    const f = (u, vv) => {
      const t = (u - 0.5) * TAU;
      // de arriba (vv = 0) al borde (vv = 1): la cabeza (ph de π/2 a -0.9)
      // y el paño que cae
      const ph = mix(PI / 2, -0.9, Math.min(1, vv / 0.7));
      const fall = Math.max(0, (vv - 0.62) / 0.38);
      const cp = Math.cos(ph),
        sp = Math.sin(ph);
      const rx = 0.094 + fall * 0.11,
        rz = 0.108 + fall * 0.09;
      const fo = fall * 0.03 * folds(t, 7, 3 + v);
      let x = Math.sin(t) * (cp * rx + fo),
        z = Math.cos(t) * (cp * rz + fo),
        y = sp * 0.128 - fall * 0.22;
      if (fall > 0) {
        x = Math.sin(t) * (rx + fo);
        z = Math.cos(t) * (rz + fo);
      }
      const d = face(t, ph) * (1 - fall);
      return [hc[0] + x + Math.sin(t) * d, hc[1] + y, hc[2] + z + Math.cos(t) * d];
    };
    parts.push(GD('head', surface(f, 30, 16, { closed: true, poles: [true, false], inside: () => hc })));
  }
  parts.push(GD('head', hoodUp({ open: 0.66, peak: 0.06, fall: 0.1, rx: 0.14, ry: 0.16, rz: 0.15, c: [0, 0.122, -0.01] })));
  parts.push(G('chest', capelet({ top: 0.58, bot: 0.24, r1: [0.27, 0.21], point: 0.1, seed: 6 + v }).geo));
  parts.push(G('hips', robe({ top: 0.14, hem: -0.905, r0: [0.19, 0.14], r1: [0.3, 0.26], n: 10, dep: 0.04, seed: 11 + v, trail: 0.04, p: 0.95 }).geo));
  parts.push(G('hips', cord(0.11, 0.2, 0.155, 0.011, Object.assign([[-0.1, 0.09, 0.14], [-0.12, -0.15, 0.2], [-0.12, -0.42, 0.22]], { knots: [[-0.12, -0.2, 0.205], [-0.12, -0.36, 0.215]] }))));
  for (const s of ['L', 'R']) {
    parts.push(G('arm' + s, upperSleeve(0.085, 0.082, s === 'L' ? 4 : 8)));
    parts.push(GD('fore' + s, sleeve(0.085, 0.14, -0.26, 0.09, s === 'L' ? 2 : 5)));
  }
  return { joints: humanoidJoints(1.0), parts, k: 1.0, base: { chest: [6, 0, 0], head: [10, 0, 0] } };
}

// Un monje: el hábito, la capucha puesta, las manos en las mangas.
function monk(v = 0) {
  const parts = [];
  parts.push(G('chest', torso({ w: 1.08, dep: 1.08, hunch: 0.3 })));
  parts.push(...neckHead({ head: { nose: 0.03, gaunt: 0.008, beard: v ? 0.012 : 0, beardLen: v ? 0.06 : 0 } }));
  parts.push(...arms({}));
  parts.push(...legs({ thighs: false, feet: 'sandal' }));
  parts.push(GD('head', hoodUp({ open: 0.6, peak: 0.06 })));
  parts.push(G('chest', capelet({ top: 0.6, bot: 0.26, point: 0.1 }).geo));
  parts.push(G('hips', robe({ top: 0.14, hem: -0.905, r0: [0.19, 0.14], r1: [0.3, 0.26], n: 10, dep: 0.04, seed: 5 + v, trail: 0.04 }).geo));
  parts.push(G('hips', cord(0.11, 0.2, 0.155, 0.011)));
  for (const s of ['L', 'R']) {
    parts.push(G('arm' + s, upperSleeve(0.085, 0.082)));
    parts.push(GD('fore' + s, sleeve(0.085, 0.14, -0.26, 0.09)));
  }
  return { joints: humanoidJoints(1.0), parts, k: 1.0, hold: { armL: [-30, -14, 10], foreL: [-80, 0, -32], armR: [-30, 14, -10], foreR: [-80, 0, 32] } };
}

// Un canónigo de la Sé: la sotana hasta los pies, la sobrepelliz blanca de
// pliegues menudos con sus mangas de campana y, sobre los hombros, la
// muceta de piel con las colas colgando; la tonsura; el breviario en la
// mano. Uno seco y estirado; el otro, gordo.
function canon(v = 0) {
  const fat = v % 2 === 1;
  const parts = [];
  parts.push(G('chest', torso({ w: fat ? 1.22 : 0.98, dep: fat ? 1.25 : 1.0, belly: fat ? 0.16 : 0, hunch: fat ? 0.2 : 0.6 })));
  parts.push(
    ...neckHead({
      neckR: fat ? 0.06 : 0.045,
      neckF: fat ? 0 : 0.025,
      tendons: !fat,
      head: fat
        ? { w: 1.14, d: 1.05, nose: 0.022, noseW: 1.3, brow: 0.006, socket: 0.007, jaw: 1.15, chin: 0.014, cheek: 0.012, ears: 0.018, crown: 0.01, tonsure: 1 }
        : { w: 0.93, h: 1.05, nose: 0.036, hook: 0.004, brow: 0.01, socket: 0.013, gaunt: 0.01, jaw: 0.84, chin: 0.01, cheek: 0.007, ears: 0.022, crown: 0.01, tonsure: 1 },
    })
  );
  parts.push(...arms({ hand: { curl: 0.35, len: fat ? 0.95 : 1.1 } }));
  parts.push(...legs({ thighs: false }));
  // la sotana
  parts.push(G('hips', robe({ top: -0.3, hem: -0.905, r0: [0.24, 0.2], r1: [0.25, 0.215], n: 10, dep: 0.012, seed: 2 + v, p: 1 }).geo));
  // la sobrepelliz: una campana plisada del cuello a las rodillas, con el
  // borde de encaje
  {
    const w = fat ? 1.08 : 0.88;
    const PR = shoulders(fat ? 0.42 : 0.36, fat ? 0.38 : 0.3, -0.56, w);
    const r = gown(PR, (t) => -0.56 + 0.012 * Math.sin(t * 5 + v), { n: 26, dep: 0.012, seed: 4 + v, fy: 0.4, front: fat ? 0.05 : 0, nt: 64 });
    const lace = [];
    for (let i = 0; i < 52; i++) {
      const t = (i / 52) * TAU - PI;
      const p = r.at(t, 0.0),
        n = r.n(t, 0.03);
      lace.push(gCone(0.008, 0.018, 3, [p[0] + n[0] * 0.003, p[1] - 0.006, p[2] + n[2] * 0.003], [180, 0, 0]));
    }
    parts.push(G('chest', merge([r.geo, ...lace])));
  }
  // las mangas de campana
  for (const s of ['L', 'R']) {
    parts.push(G('arm' + s, upperSleeve(0.09, 0.1, s === 'L' ? 1 : 2)));
    parts.push(GD('fore' + s, sleeve(0.1, 0.19, -0.2, 0.06, s === 'L' ? 3 : 6)));
  }
  // la muceta de piel y sus colas
  {
    const m = capelet({ top: 0.6, bot: 0.36, r1: [fat ? 0.31 : 0.26, fat ? 0.27 : 0.2], n: 10, dep: 0.01, seed: 7, frontDip: 0.06 });
    const tails = [];
    for (let i = 0; i < 26; i++) {
      const t = (i / 26) * TAU - PI + 0.12;
      const p = m.at(t, 0.0);
      const l = 0.06 + ((i * 7) % 5) * 0.012;
      tails.push(tube([p, [p[0] * 1.03, p[1] - l * 0.6, p[2] * 1.03], [p[0] * 1.02, p[1] - l, p[2] * 1.02]], 0.011, { n: 4, seg: 5, caps: true, capL: 0.01 }));
    }
    parts.push(G('chest', merge([m.geo, ...tails])));
  }
  // el breviario
  parts.push(G('handL', merge([gBox(0.035, 0.15, 0.115, [-0.012, -0.11, 0.0], [0, 0, 6]), gBox(0.006, 0.12, 0.1, [-0.03, -0.11, 0.0], [0, 0, 6])])));
  return { joints: humanoidJoints(fat ? 0.96 : 1.04), parts, k: fat ? 0.96 : 1.04, base: fat ? { chest: [-4, 0, 0], head: [-4, 0, 0] } : { chest: [6, 0, 0], head: [8, 0, 0] } };
}

// Un soldado de la guarnición (1167): la loriga hasta las rodillas, abierta
// delante y detrás, el almófar y el yelmo cónico de nasal; el escudo de
// cometa con una flecha clavada; la lanza; la espada a la cadera. Cansado.
function soldier(v = 0) {
  const parts = [];
  parts.push(G('chest', torso({ w: 1.08, dep: 1.08, hunch: 0.3 })));
  parts.push(...neckHead({ neckR: 0.055, head: { nose: 0.03, brow: 0.011, socket: 0.013, gaunt: 0.005, jaw: 0.95, beard: 0.01, beardLen: 0.03, ears: 0 } }));
  parts.push(...arms({ armT: 1.12, hand: { curl: 0.7, thick: 1.05 } }));
  parts.push(...legs({ legT: 1.05 }));
  // el almófar: la capucha de malla, ceñida, y el yelmo con su nasal
  parts.push(G('head', hoodUp({ open: 0.55, peak: 0.0, fall: 0.06, rx: 0.106, ry: 0.13, rz: 0.118, c: [0, 0.112, 0.004], rim: 0.008, fwd: 0 })));
  parts.push(
    G(
      'head',
      merge([
        new THREE.LatheGeometry(
          [
            [0.118, 0.0],
            [0.114, 0.03],
            [0.1, 0.07],
            [0.075, 0.11],
            [0.04, 0.15],
            [0.012, 0.18],
            [0.001, 0.19],
          ].map(([x, y]) => new THREE.Vector2(x, y)),
          16
        )
          .scale(1, 1, 1.08)
          .translate(0, 0.19, 0.0),
        place(gTorus(0.118, 0.007, [0, 0, 0], [90, 0, 0], 20, 4), [0, 0.195, 0], [0, 0, 0], [1, 1, 1.08]),
        gBox(0.022, 0.11, 0.008, [0, 0.14, 0.132], [-8, 0, 0]),
      ])
    )
  );
  parts.push(G('chest', capelet({ top: 0.6, bot: 0.3, r1: [0.29, 0.22], n: 5, dep: 0.008, seed: 2 }).geo));
  // la loriga, abierta delante y detrás
  for (const [t0, t1] of [
    [0.14, PI - 0.14],
    [PI + 0.14, TAU - 0.14],
  ])
    parts.push(G('hips', robe({ top: 0.14, hem: -0.46, r0: [0.2, 0.145], r1: [0.27, 0.23], n: 6, dep: 0.012, seed: 3, p: 0.9, t0, t1, nt: 20 }).geo));
  // el cinto y la espada en su vaina, a la izquierda
  parts.push(
    G(
      'hips',
      merge([
        cord(0.08, 0.205, 0.155, 0.014),
        tube([[0.2, 0.0, 0.06], [0.24, -0.4, -0.05], [0.27, -0.72, -0.15]], [0.028, 0.014], { n: 6, seg: 6, caps: true, up: [1, 0, 0] }),
        gBox(0.02, 0.13, 0.02, [0.19, 0.1, 0.09], [-15, 0, 0]),
        gBox(0.03, 0.025, 0.16, [0.195, 0.03, 0.075], [-15, 0, 0]),
        gSph(0.022, [0.186, 0.17, 0.11], [1, 1, 1], 8, 6),
      ])
    )
  );
  // el escudo de cometa (en el antebrazo: la cara hacia +x, lo largo en y)
  {
    const W = 0.25,
      top = 0.17,
      bot = -0.66;
    const out = (y) => {
      // medio ancho a la altura y: redondo arriba, en punta abajo
      const t = (y - bot) / (top - bot);
      if (t > 0.82) return W * Math.sqrt(Math.max(0, 1 - ((t - 0.82) / 0.18) ** 2 * 0.45));
      return W * Math.pow(t / 0.82, 0.62);
    };
    const f = (u, vv) => {
      const y = mix(bot, top, vv);
      const hw = out(y) + 0.0005;
      const z = (u * 2 - 1) * hw;
      const x = 0.07 - 0.45 + Math.sqrt(0.45 * 0.45 - z * z);
      return [x, y, z + 0.09];
    };
    const sh = surface(f, 12, 14, { inside: (u, vv) => [-1, f(u, vv)[1], 0.09] });
    const g2 = [sh];
    // el reborde, la bloca y una flecha rota clavada
    const rim = [];
    for (let i = 0; i <= 24; i++) {
      const vv = i / 24;
      rim.push(f(1, vv));
    }
    for (let i = 24; i >= 0; i--) rim.push(f(0, i / 24));
    g2.push(tube(rim, 0.008, { n: 60, seg: 5 }));
    const c = f(0.5, 0.62);
    g2.push(gSph(0.035, [c[0] + 0.005, c[1], c[2]], [0.6, 1, 1], 10, 8));
    const a = f(0.68, 0.36);
    g2.push(tube([a, [a[0] + 0.26, a[1] + 0.05, a[2] + 0.04]], 0.005, { n: 2, seg: 4 }));
    g2.push(gBox(0.05, 0.002, 0.018, [a[0] + 0.25, a[1] + 0.05, a[2] + 0.04], [0, 0, 10]), gBox(0.05, 0.018, 0.002, [a[0] + 0.25, a[1] + 0.05, a[2] + 0.04], [0, 0, 10]));
    parts.push(GD('foreL', merge(g2)));
  }
  // la lanza
  parts.push(G('handR', merge([shaft(-1.0, 1.36, 0.017), place(gSph(0.05, [0, 0, 0], [0.3, 0.14, 1], 8, 6), [0, -0.045, 1.5]), place(new THREE.CylinderGeometry(0.019, 0.022, 0.08, 8), [0, -0.045, 1.38], [90, 0, 0])])));
  return { joints: humanoidJoints(1.0), parts, k: 1.0, base: { chest: [5, 0, 0], head: [5, 0, 0] } };
}

// Un almohade: alto y enjuto, la cara tapada por el lizam hasta los ojos, el
// turbante de muchas vueltas con la cola a la espalda, la túnica larga y el
// albornoz con la capucha caída; la adarga de dos lóbulos con sus borlas y
// la lanza. El abanderado lleva, en vez de adarga, el asta con la bandera y
// las tres bolas de oro arriba.
function almohad(v = 0, standard = false) {
  const parts = [];
  const k = [1.06, 1.02, 1.09][v % 3];
  parts.push(G('chest', torso({ w: 1.04, dep: 1.04 })));
  parts.push(...neckHead({ neckR: 0.05, head: { nose: 0.032, hook: 0.005, brow: 0.011, socket: 0.014, jaw: 0.92, beard: 0.01, beardLen: 0.04, ears: 0 } }));
  parts.push(...arms({ hand: { curl: 0.72 } }));
  parts.push(...legs({ thighs: false }));
  // el turbante: un bulbo de vueltas en espiral sobre la frente, y la cola
  {
    const TB = [
      [0.135, 0.098, 0.112],
      [0.17, 0.118, 0.13],
      [0.21, 0.128, 0.14],
      [0.25, 0.122, 0.134],
      [0.285, 0.1, 0.11],
      [0.31, 0.064, 0.072],
      [0.322, 0.02, 0.022],
    ];
    const tb = skirt(
      (t, vv) => {
        const y = mix(0.135 - 0.02 * Math.max(0, Math.cos(t)), 0.322, vv);
        const [rx, rz] = table(TB, y);
        const ridge = Math.pow(Math.abs(Math.sin(y * 62 + t * (v % 2 ? 0.7 : -0.7))), 0.45) - 0.55;
        return ell(t, rx, rz) * (1 + 0.07 * ridge * sstep(0.31, 0.27, y));
      },
      (t) => 0.135 - 0.02 * Math.max(0, Math.cos(t)),
      0.322,
      { nt: 36, nv: 18, closeTop: true, cz: () => -0.006 }
    );
    const g = [tb.geo];
    g.push(tube([[0.03, 0.2, -0.12], [0.045, 0.12, -0.155], [0.035, 0.0, -0.165], [0.015, -0.14, -0.155]], [0.038, 0.008], { n: 12, seg: 5, up: [0, 0, -1], mod: (a, q) => 1 + 0.15 * Math.sin(q * 17) }));
    parts.push(G('head', merge(g)));
  }
  // el lizam: de la nariz al pecho, alrededor
  if (v % 3 !== 1)
    parts.push(
      GD(
        'head',
        skirt(
          (t, vv) => ell(t, mix(0.13, 0.09, vv), mix(0.15, 0.108, vv)) + 0.012 * folds(t, 5, 2) * (1 - vv),
          (t) => -0.12 - 0.03 * Math.max(0, Math.cos(t)),
          0.118,
          { nt: 28, nv: 6, cz: (vv) => 0.018 * vv }
        ).geo
      )
    );
  // la túnica larga y el albornoz (detrás, hasta las pantorrillas; la
  // capucha caída entre los hombros)
  parts.push(G('hips', robe({ top: 0.14, hem: -0.905, r0: [0.18, 0.13], r1: [0.27, 0.24], n: 12, dep: 0.03, seed: 5 + v, p: 1.05 }).geo));
  parts.push(GD('chest', gown(shoulders(0.35, 0.31, -0.78, 0.98), (t) => -0.78 - 0.05 * Math.max(0, -Math.cos(t)) + 0.02 * Math.sin(t * 4 + v), { n: 8, dep: 0.05, seed: 8 + v, t0: 0.62, t1: TAU - 0.62, nt: 40, fy: 0.5 }).geo));
  // la capucha caída, en punta, entre los hombros
  parts.push(GD('chest', place(cloth(0.3, 0.34, { flare: 0.08, folds: [2, 0.012], wrap: 0.13, out: (vv) => -0.03 * vv, nu: 10, nv: 8 }).geo, [0, 0.58, -0.205], [-8, 180, 0])));
  // la faja con sus cabos
  parts.push(G('hips', merge([cord(0.08, 0.2, 0.15, 0.03), tube([[-0.12, 0.06, 0.13], [-0.14, -0.12, 0.17], [-0.13, -0.32, 0.18]], [0.03, 0.008], { n: 8, seg: 5, up: [0, 0, 1] })])));
  if (!standard) {
    // la adarga: dos lóbulos de cuero (la cara hacia +x), con sus borlas
    const out = (a) => {
      // perfil en polares: dos lóbulos arriba (hacia el codo) y la punta abajo
      const c = Math.cos(a),
        s = Math.sin(a);
      return 0.27 * (0.82 + 0.16 * Math.abs(s) - 0.12 * Math.max(0, c) ** 8 + 0.12 * Math.max(0, -c) ** 3);
    };
    const f = (u, vv) => {
      const a = u * TAU;
      const r = out(a) * vv;
      const z = Math.sin(a) * r,
        y = Math.cos(a) * r * 1.1;
      const x = 0.075 + 0.07 * (1 - vv * vv);
      return [x, y - 0.2, z + 0.1];
    };
    const sh = surface(f, 28, 6, { closed: true, poles: [true, false], inside: () => [-1, -0.2, 0.1] });
    const g2 = [sh];
    const rim = [];
    for (let i = 0; i <= 40; i++) rim.push(f(i / 40, 1));
    g2.push(tube(rim, 0.009, { n: 80, seg: 5 }));
    g2.push(gSph(0.03, [0.15, -0.2, 0.1], [0.7, 1, 1], 10, 8));
    for (const zz of [-0.07, 0.07]) g2.push(tube([[0.085, -0.5, 0.1 + zz], [0.09, -0.6, 0.1 + zz * 1.2], [0.09, -0.68, 0.1 + zz * 1.25]], 0.009, { n: 4, seg: 5, caps: true, capL: 0.012 }));
    parts.push(GD('foreL', merge(g2)));
    // la lanza
    parts.push(G('handR', merge([shaft(-1.05, 1.5, 0.016), place(gSph(0.045, [0, 0, 0], [0.22, 0.12, 1], 8, 6), [0, -0.045, 1.62]), place(new THREE.CylinderGeometry(0.018, 0.02, 0.07, 8), [0, -0.045, 1.52], [90, 0, 0])])));
  } else {
    // el asta, la bandera que cuelga del travesaño y el yamur
    const g2 = [tube([[0.32, -0.95, 0.12], [0.32, 3.15, 0.12]], 0.024, { n: 2, seg: 8 })];
    g2.push(tube([[0.3, 2.95, 0.12], [1.36, 2.95, 0.12]], 0.016, { n: 2, seg: 6, caps: true }));
    for (const [y, r] of [
      [3.2, 0.07],
      [3.33, 0.058],
      [3.44, 0.045],
    ])
      g2.push(gSph(r, [0.32, y, 0.12], [1, 1, 1], 12, 8));
    g2.push(gCone(0.012, 0.12, 6, [0.32, 3.53, 0.12]));
    const fl = cloth(1.0, 1.45, { folds: [3, 0.06], seed: 2, hem: (u) => 0.14 * Math.abs(2 * u - 1) - 0.06, nu: 16, nv: 14 });
    const fr = [fl.geo];
    for (let i = 0; i < 12; i++) {
      const p = fl.at((i + 0.5) / 12, 1);
      fr.push(tube([p, [p[0], p[1] - 0.09, p[2]]], 0.007, { n: 2, seg: 4 }));
    }
    g2.push(place(merge(fr), [0.84, 2.94, 0.12]));
    parts.push(GD('hips', merge(g2)));
  }
  return { joints: humanoidJoints(k), parts, k, base: { chest: [-3, 0, 0], head: [-2, 0, 0] } };
}

// La gente de Braga: variantes de hombre y de mujer
function man(v = 0) {
  const parts = [];
  const kind = v % 3;
  if (kind === 1) {
    // el viejo: calvo, la barba larga, encorvado, el bastón
    parts.push(G('chest', torso({ w: 1.0, dep: 1.02, hunch: 1.2 })));
    parts.push(...neckHead({ neckR: 0.045, neckF: 0.04, tendons: true, head: { nose: 0.032, hook: 0.005, gaunt: 0.01, socket: 0.014, brow: 0.011, jaw: 0.88, ears: 0.022, beard: 0.014, beardLen: 0.12 } }));
    parts.push(...arms({ armT: 0.9, hand: { curl: 0.7 } }));
    parts.push(...legs({ thighs: false }));
    parts.push(G('hips', robe({ top: 0.14, hem: -0.89, r0: [0.18, 0.13], r1: [0.26, 0.22], n: 9, dep: 0.03, seed: 7, ragged: 0.02 }).geo));
    parts.push(G('chest', capelet({ top: 0.6, bot: 0.24, r1: [0.29, 0.22], n: 6, seed: 2, point: 0.06 }).geo));
    parts.push(G('hips', cord(0.08, 0.19, 0.145, 0.012)));
    parts.push(G('handR', shaft(-0.82, 0.14, 0.017, (a, s) => 1 + 0.12 * Math.max(0, Math.sin(s * 31)) ** 6)));
    return { joints: humanoidJoints(0.95), parts, k: 0.95, base: { chest: [16, 0, 0], head: [-10, 0, 0] }, hold: { armR: [-22, 0, -8], foreR: [-46, 0, 0] } };
  }
  parts.push(G('chest', torso({ w: kind ? 1.04 : 1.08, dep: 1.04, belly: kind ? 0 : 0.05 })));
  parts.push(G('hips', pelvis({})));
  parts.push(...neckHead({ head: { nose: 0.028 + kind * 0.004, brow: 0.012, beard: kind ? 0 : 0.012, beardLen: kind ? 0 : 0.03, crown: kind === 2 ? 0.022 : 0.012, jaw: 0.95 } }));
  parts.push(...arms({ hand: { curl: 0.4 } }));
  parts.push(...legs({}));
  parts.push(G('hips', robe({ top: 0.14, hem: -0.46, r0: [0.19, 0.14], r1: [0.25, 0.21], n: 8, dep: 0.025, seed: 3 + kind, p: 0.9 }).geo));
  parts.push(G('hips', merge([cord(0.08, 0.195, 0.148, 0.012), place(gSph(0.045, [0, 0, 0], [0.8, 1, 0.5], 10, 8), [0.19, -0.05, 0.09])])));
  if (kind === 0) {
    // la capucha con la cola larga (el capirote) y la esclavina
    parts.push(GD('head', hoodUp({ open: 0.66, peak: 0.0, fall: 0.06 })));
    parts.push(G('head', tube([[0, 0.25, -0.08], [0, 0.2, -0.17], [0.02, 0.0, -0.2], [0.03, -0.25, -0.18], [0.02, -0.45, -0.17]], (s) => mix(0.04, 0.014, s), { n: 14, seg: 6, caps: true })));
    parts.push(G('chest', capelet({ top: 0.6, bot: 0.3, r1: [0.3, 0.23], n: 9, seed: 5, point: 0.04 }).geo));
  } else {
    // el manto prendido al hombro derecho
    parts.push(GD('chest', gown(shoulders(0.36, 0.3, -0.62, 1.06), (t) => -0.62 + 0.06 * Math.sin(t) - 0.03 * Math.max(0, -Math.cos(t)), { n: 7, dep: 0.055, seed: 6, t0: 0.15, t1: TAU - 0.75, nt: 48, fy: 0.5 }).geo));
    parts.push(G('chest', merge([gTorus(0.022, 0.006, [-0.17, 0.5, 0.1], [0, 0, 0], 10, 4), gSph(0.011, [-0.17, 0.5, 0.104], [1, 1, 0.6], 8, 6)])));
  }
  return { joints: humanoidJoints(1.0), parts, k: 1.0, base: { chest: [3, 0, 0] } };
}
function woman(v = 0) {
  const parts = [];
  const kind = v % 3;
  parts.push(G('chest', torso({ w: 0.9, dep: 0.98, pecs: 0.06 })));
  parts.push(...neckHead({ neckR: 0.042, head: { w: 0.93, h: 0.97, d: 0.97, nose: 0.022, noseW: 0.85, brow: 0.004, socket: 0.01, jaw: 0.88, chin: 0.004, cheek: 0.007, lips: 0.004, ears: 0 } }));
  parts.push(...arms({ armT: 0.86, foreT: 0.9, hand: { curl: 0.35, len: 0.95, thick: 0.85 } }));
  parts.push(...legs({ thighs: false }));
  // el vestido hasta el suelo
  parts.push(G('hips', robe({ top: 0.12, hem: -0.93, r0: [0.16, 0.12], r1: [0.29, 0.26], n: 11, dep: 0.032, seed: 4 + kind, trail: 0.06, p: 1.0 }).geo));
  for (const s of ['L', 'R']) parts.push(GD('fore' + s, sleeve(0.05, 0.1, -0.24, 0.05, s === 'L' ? 3 : 7)));
  if (kind === 0) {
    // la toca: el barboquejo y el velo hasta la espalda; las manos juntas
    parts.push(G('head', skirt((t, vv) => ell(t, mix(0.1, 0.092, vv), mix(0.11, 0.105, vv)), -0.035, 0.12, { nt: 26, nv: 4, t0: -2.4, t1: 2.4 }).geo));
    parts.push(GD('head', hoodUp({ open: 0.7, peak: -0.02, fall: 0.1, low: -1.2, rx: 0.115, rz: 0.125, ry: 0.138, c: [0, 0.12, -0.004], rim: 0.007 })));
    parts.push(GD('head', drape(0.24, 0.42, { flare: 1.6, folds: [3, 0.014], wrap: 0.1, nu: 10, nv: 8 }, [0, 0.2, -0.1], [10, 180, 0])));
    return { joints: humanoidJoints(0.93), parts, k: 0.93, base: { chest: [2, 0, 0], head: [4, 0, 0] }, hold: { armL: [-40, -24, 14], foreL: [-92, 0, -14], armR: [-40, 24, -14], foreR: [-92, 0, 14] } };
  }
  if (kind === 1) {
    // el chal sobre la cabeza, sujeto al pecho; un cesto en el brazo
    parts.push(GD('head', hoodUp({ open: 0.72, peak: 0.02, fall: 0.18, low: -1.25, rx: 0.12, rz: 0.13, ry: 0.142, rim: 0.012 })));
    parts.push(G('chest', capelet({ top: 0.56, bot: 0.05, r0: [0.12, 0.11], r1: [0.31, 0.23], n: 8, dep: 0.024, seed: 9, point: 0.2, prof: [[0, 1], [0.5, 0.95], [0.8, 0.82], [0.92, 0.55], [1, 0]] }).geo));
    parts.push(G('foreL', merge([new THREE.CylinderGeometry(0.15, 0.11, 0.15, 14, 1, true).translate(0.0, -0.04, 0.17), gTorus(0.15, 0.008, [0, 0.035, 0.17], [90, 0, 0], 16, 4), gTorus(0.11, 0.008, [0, -0.115, 0.17], [90, 0, 0], 16, 4), place(gTorus(0.13, 0.008, [0, 0, 0], [0, 90, 0], 16, 4, 0), [0, 0.03, 0.17], [0, 0, 0], [1, 1.1, 1])])));
    return { joints: humanoidJoints(0.92), parts, k: 0.92, base: { chest: [5, 0, 0], head: [6, 0, 0] }, hold: { armL: [-10, 0, 10], foreL: [-80, 0, 0], armR: [-36, 30, -10], foreR: [-110, 0, 28] } };
  }
  // la que lleva al niño en brazos, la cabeza baja hacia él
  parts.push(GD('head', hoodUp({ open: 0.75, peak: 0.0, fall: 0.12, low: -1.2, rx: 0.12, rz: 0.13, ry: 0.142, rim: 0.008 })));
  parts.push(G('chest', merge([place(gSph(0.09, [0, 0, 0], [1, 0.75, 2], 12, 8), [0.0, 0.26, 0.19], [0, 70, -20]), gSph(0.048, [-0.11, 0.32, 0.2], [1, 1, 1], 10, 8), place(cloth(0.2, 0.2, { folds: [2, 0.01], nu: 6, nv: 4 }).geo, [0.05, 0.34, 0.2], [0, 70, 0])])));
  return { joints: humanoidJoints(0.9), parts, k: 0.9, base: { chest: [4, 0, 0], head: [16, 10, 0] }, hold: { armL: [-34, -20, 10], foreL: [-80, 0, -46], armR: [-30, 22, -8], foreR: [-96, 0, 40] } };
}

// ------------------------------------------------------------ el catálogo
const DEFS = {
  arch: () => arch(),
  martin: () => martin(),
  roman: (v) => roman(v),
  cantero: () => cantero(),
  veiled: (v) => veiled(v),
  monk: (v) => monk(v),
  canon: (v) => canon(v),
  soldier: (v) => soldier(v),
  almohad: (v) => almohad(v, false),
  standard: (v) => almohad(v, true),
  man: (v) => man(v),
  woman: (v) => woman(v),
};
// cuántas variantes tiene cada una
const VARIANTS = { roman: 2, veiled: 2, monk: 2, canon: 2, almohad: 3, standard: 3, man: 3, woman: 3 };
const cache = new Map();
const turn = {};
// La figura de un eco (si no se dice la variante, la siguiente de las suyas).
export function ghostModel(kind, variant = null) {
  const n = VARIANTS[kind] || 1;
  if (variant === null) {
    variant = (turn[kind] ?? 0) % n;
    turn[kind] = (turn[kind] ?? 0) + 1;
  }
  const key = kind + ':' + variant;
  if (!cache.has(key)) {
    const d = DEFS[kind](variant);
    const k = d.k ?? 1;
    // (la ropa y el cuerpo están hechos para la altura de siempre: se escalan
    // con el esqueleto)
    d.parts = d.parts.map((pt) => ({ ...pt, p: (pt.p || [0, 0, 0]).map((x) => x * k), sc: (pt.sc || [1, 1, 1]).map((x) => x * k) }));
    for (const j of d.joints) if (['censer', 'lamp', 'drapeL', 'drapeR'].includes(j.name)) j.pos = j.pos.map((x) => x * k);
    if (d.lampY !== undefined) d.lampY *= k;
    cache.set(key, d);
  }
  return cache.get(key);
}
