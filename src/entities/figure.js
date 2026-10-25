// Figuras humanas esculpidas (con sculpt.js) para los rigs de
// humanoidJoints(): el tronco, la pelvis, los brazos con sus manos, las
// piernas y los pies, el cuello y la cabeza; y la ropa que cae en pliegues
// (faldones, mangas, capuchas, esclavinas, campanas, mantos, cordones).
// Todo para un cuerpo de altura 1 (se escala con el esqueleto) y, salvo que
// se diga otra cosa (o.mat), con el material 'g'.
import { humanoidJoints } from './models.js';
import { tube, cloth, skirt, surface, head, hand, merge, place, gSph, folds, table, mix, sstep, bump } from './sculpt.js';

export { humanoidJoints };
export const PI = Math.PI,
  TAU = PI * 2;
export const ad = (a) => {
  a = ((a % TAU) + TAU) % TAU;
  return a > PI ? a - TAU : a;
};
// radio de una elipse de semiejes a (x) y b (z) en el ángulo t (desde +z)
export const ell = (t, a, b) => 1 / Math.sqrt((Math.sin(t) / a) ** 2 + (Math.cos(t) / b) ** 2);
export const G = (j, geo, o = {}) => ({ j, type: 'geo', geo, mat: 'g', ...o });
export const GD = (j, geo, o = {}) => ({ j, type: 'geo', geo, mat: 'g', ds: true, ...o });

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
export function torso(o = {}) {
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
export function pelvis(o = {}) {
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
export function arms(o = {}) {
  const t = o.armT ?? 1,
    L = o.arm ?? 1,
    mat = o.mat ?? 'g',
    P = (j, geo) => G(j, geo, { mat });
  const out = [];
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    if (o.upper !== false)
      out.push(
        P(
          'arm' + s,
          tube(
            [
              [0, 0.035, 0],
              [0, -0.13 * L, 0.004],
              [0, -0.3 * L, 0],
            ],
            (q) => table(ARM, q).map((v) => v * t),
            { n: 8, seg: 10, caps: true, capL: 0.035 }
          )
        )
      );
    out.push(
      P(
        'fore' + s,
        tube(
          [
            [0, 0.03, 0],
            [0, -0.09 * L, 0.004],
            [0, -0.27 * L, 0],
          ],
          (q) => table(FORE, q).map((v) => v * t * (o.foreT ?? 1)),
          { n: 8, seg: 10, caps: true, capL: 0.025 }
        )
      )
    );
    if (o.hands !== false) out.push(P('hand' + s, hand({ side: sx, ...(o.hand || {}), ...((s === 'L' ? o.handL : o.handR) || {}) })));
  }
  return out;
}
// zapatos: del talón a la punta (la suela, a ras del suelo)
export function shoe(kind = 'shoe') {
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
export function legs(o = {}) {
  const out = [];
  const t = o.legT ?? 1,
    mat = o.mat ?? 'g',
    G = (j, geo) => ({ j, type: 'geo', geo, mat });
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
export function neckHead(o = {}) {
  const r = o.neckR ?? 0.05,
    f = o.neckF ?? 0,
    mat = o.mat ?? 'g',
    G = (j, geo) => ({ j, type: 'geo', geo, mat });
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
export function robe(o = {}) {
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
export function sleeve(r0 = 0.07, r1 = 0.13, y1 = -0.3, droop = 0.08, seed = 2) {
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
export function upperSleeve(r0 = 0.08, r1 = 0.075, seed = 5) {
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
export function hoodUp(o = {}) {
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
export function capelet(o = {}) {
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
export function gown(PR, hem, o = {}) {
  const top = o.top ?? PR[PR.length - 1][0];
  const y0 = o.y0 ?? PR[0][0];
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
export function shoulders(ax, az, yb, w = 1) {
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
// Una campana partida en la cintura (la de arriba va en el pecho y la de
// abajo en la cadera: si se inclina, el faldón sigue cayendo): las dos con
// el mismo perfil y los mismos pliegues; se pisan entre cut - lap y cut +
// lap (y del pecho). Devuelve { up, low } (low, en el espacio del pecho:
// para la cadera, subir 0.1).
export function gownSplit(PR, hem, o = {}) {
  const cut = o.cut ?? -0.06,
    lap = o.lap ?? 0.09;
  const y0 = PR[0][0];
  const up = gown(PR, (t) => cut - lap - 0.02 * Math.max(0, folds(t, 5, (o.seed ?? 5) + 1)), { ...o, y0, nv: 8 });
  const low = gown(PR, hem, { ...o, top: cut + lap, y0, nv: 12 });
  return { up, low };
}
// un cordón alrededor de la cintura (en la cadera, a la altura y) y, si
// tiene, el cabo que cuelga con sus nudos
export function cord(y = 0.1, rx = 0.19, rz = 0.14, r = 0.012, tail = null) {
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
export function drape(w, h, o, p, r = [0, 0, 0]) {
  const c = cloth(w, h, o);
  let geo = c.geo;
  if (o.trim) geo = merge([geo, ...o.trim(c)]);
  return place(geo, p, r);
}

