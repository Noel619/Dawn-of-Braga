// Boceto 1: el arzobispo, consumido (1167). Grabado a dos tintas.
//
// De espaldas, de rodillas en el brocal de la fuente, con los brazos en alto
// como quien ofrece algo, recortado contra la niebla que arde en el pozo;
// detrás, el ídolo: el monolito, negro y enorme (no cabe en la lámina),
// lleno de almas que empujan la piedra desde dentro, las bocas abiertas y
// con luz, y arriba el ojo, abierto entre los anillos que le picaron los de
// los castros; a los costados, la cisterna entera en rojo, y en la niebla
// roja, otros que también se arrodillaron. No hay cordón ni nada que los
// una: se le ve irse. Las manos se le deshacen en ceniza, la cruz de la
// espalda se le agrieta con la luz de dentro, el bajo de la casulla se le
// quema, y detrás de la mitra le empieza a brotar una aureola de púas como
// la del Turiferario en que se va a convertir.
//
// El monolito es el del juego (mono3d.js lo monta y le saca la silueta, el
// tono a la luz del pozo y lo que arde); el buril lo graba como lo demás.
import { mulberry, Noise, Field, gray, clamp, mix, sstep, blob, poly, capsule, ellipse, glow, contours, simplify, pen, pencil, brush, ash, wash, paper, vignette, splatter, engrave, parallel, family, layer, maskImage, maskMinus, haloSpikes, spikeTips, shadeInto, toCanvasF, plate, cv } from './lib.js';
import { renderMonolith } from './mono3d.js';

const W = 2400,
  H = 1500;
const CX = 1200;
// la cámara: a la altura de los ojos (1,9 m), el ídolo a 8 m y el
// arzobispo a 4,2 m, de rodillas en el brocal
const F = 1150,
  HY = 760,
  HC = 1.9;
const P = (X, Y, Z) => [CX + (F * X) / Z, HY - (F * (Y - HC)) / Z];
const INK = 'rgba(20,11,8,0.94)';
const OCHRE = 'rgba(214,170,96,0.92)';
const mirror = (pts) => pts.map(([a, b]) => [2 * CX - a, b]).reverse();

// ------------------------------------------------------------ la cisterna
const COLS = [
  [-10.35, 12.29],
  [-4.29, 18.35],
];
function colBox(X, Z) {
  const r = 0.45;
  const xa = P(X - r, 0, Z)[0],
    xb = P(X + r, 0, Z)[0];
  return { xa, xb, w: xb - xa, yb: P(X, 0, Z)[1], yt: P(X, 6.0, Z)[1] };
}
function column(x, fill, X, Z) {
  const { xa, xb, w, yb, yt } = colBox(X, Z);
  poly(x, [
    [xa + w * 0.05, yt],
    [xb - w * 0.05, yt],
    [xb, yb],
    [xa, yb],
  ], fill);
  poly(x, [
    [xa - w * 0.18, yb - w * 0.3],
    [xb + w * 0.18, yb - w * 0.3],
    [xb + w * 0.24, yb + 4],
    [xa - w * 0.24, yb + 4],
  ], fill);
  poly(x, [
    [xa + w * 0.02, yt + w * 0.06],
    [xb - w * 0.02, yt + w * 0.06],
    [xb + w * 0.3, yt - w * 0.42],
    [xa - w * 0.3, yt - w * 0.42],
  ], fill);
  poly(x, [
    [xa - w * 0.36, yt - w * 0.42],
    [xb + w * 0.36, yt - w * 0.42],
    [xb + w * 0.36, yt - w * 0.64],
    [xa - w * 0.36, yt - w * 0.64],
  ], fill);
}
const eachCol = (fn) => {
  for (const [X, Z] of COLS) for (const s of [1, -1]) fn(X * s, Z, s);
};
function bez(a, b, c, d, n = 40) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n,
      u = 1 - t;
    out.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]);
  }
  return out;
}
// los arcos del corro y los nervios de la cúpula, como curvas
function archCurves() {
  const out = [];
  for (const s of [1, -1]) {
    const [X1, Z1] = COLS[0],
      [X2, Z2] = COLS[1];
    const a = colBox(X1 * s, Z1),
      b = colBox(X2 * s, Z2);
    const pa = [(a.xa + a.xb) / 2, a.yt - a.w * 0.64],
      pb = [(b.xa + b.xb) / 2, b.yt - b.w * 0.64];
    out.push({ w: 48, pts: bez(pa, [pa[0] - s * 30, pa[1] - 360], [pb[0] + s * 80, pb[1] - 250], pb) });
    out.push({ w: 84, pts: bez(pa, [pa[0] + s * 110, pa[1] - 430], [pa[0] + s * 520, pa[1] - 520], [pa[0] + s * 900, pa[1] - 300]) });
    out.push({ w: 32, pts: bez(pb, [pb[0] - s * 30, pb[1] - 250], [CX + s * 330, -10], [CX + s * 110, -220]) });
  }
  return out;
}
function strokeCurve(x, pts, w, fill) {
  x.strokeStyle = fill;
  x.lineWidth = w;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts) x.lineTo(p[0], p[1]);
  x.stroke();
}
function offsets(pts, w, sp) {
  const out = [];
  for (let o = -w / 2; o <= w / 2; o += sp) {
    const l = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)],
        b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0],
        dy = b[1] - a[1];
      const n = Math.hypot(dx, dy) || 1;
      l.push([pts[i][0] - (dy / n) * o, pts[i][1] + (dx / n) * o]);
    }
    out.push(l);
  }
  return out;
}
// el muro del fondo y los laterales (z = 23 y x = ±15)
function walls(x, fill) {
  for (const s of [1, -1]) {
    const a = P(15 * s, 0, 23),
      b = P(15 * s, 8.8, 23),
      c = P(15 * s, 8.8, 11),
      d = P(15 * s, 0, 11);
    poly(x, [a, b, c, d], fill);
  }
}
// arcos ciegos en los muros laterales, con sus nichos de calaveras
function blindArches(s) {
  const out = [];
  for (const [z0, z1] of [
    [13.2, 16.2],
    [17.0, 20.0],
    [20.6, 22.8],
  ]) {
    const a = P(15 * s, 0.4, z0),
      b = P(15 * s, 0.4, z1),
      c = P(15 * s, 5.2, z1),
      d = P(15 * s, 5.2, z0);
    const top = P(15 * s, 6.6, (z0 + z1) / 2);
    out.push([a, d, [mix(d[0], top[0], 0.5), top[1] + (d[1] - top[1]) * 0.2], top, [mix(c[0], top[0], 0.5), top[1] + (c[1] - top[1]) * 0.2], c, b]);
  }
  return out;
}

// ------------------------------------------------------------ el ídolo
// (a 8 m; lo de abajo se mete en el pozo. La silueta y el tono salen del
// monolito de verdad: draw() lo monta antes de nada)
const PIT = { cy: 1054, rx: 350, ry: 86 };
const Yi = (Y) => 760 - 143.75 * (Y - 1.9);
let MONO = null;
function idol(x, fill) {
  if (!MONO) return;
  const c = cv(W, H),
    d = c.getContext('2d');
  d.fillStyle = fill;
  d.fillRect(0, 0, W, H);
  d.globalCompositeOperation = 'destination-in';
  d.drawImage(MONO.img, 0, 0);
  x.drawImage(c, 0, 0);
}

// ------------------------------------------------------------ el arzobispo
// (a 4,2 m, de espaldas; los brazos en alto)
const AR = {
  body: [
    [1170, 952],
    [1136, 962],
    [1110, 1000],
    [1086, 1066],
    [1060, 1150],
    [1030, 1226],
    [1000, 1290],
    [1060, 1312],
    [1130, 1322],
    [1200, 1326],
    [1270, 1322],
    [1340, 1312],
    [1400, 1290],
    [1370, 1226],
    [1340, 1150],
    [1314, 1066],
    [1290, 1000],
    [1264, 962],
    [1230, 952],
    [1200, 948],
  ],
  wing: [
    [1138, 972],
    [1086, 872],
    [1064, 878],
    [1046, 930],
    [1042, 1020],
    [1054, 1108],
    [1088, 1086],
    [1116, 1030],
  ],
  arm: { sh: [1140, 978], el: [1084, 868], wr: [1030, 744] },
};
function mitre(x, fill) {
  ellipse(x, CX, 910, 27, 30, fill);
  blob(x, [
    [1169, 898],
    [1170, 858],
    [1179, 826],
    [1191, 802],
    [1200, 786],
    [1209, 802],
    [1221, 826],
    [1230, 858],
    [1231, 898],
    [1200, 904],
  ], fill, 0.3);
  poly(x, [
    [1182, 898],
    [1196, 898],
    [1194, 1012],
    [1174, 1008],
  ], fill);
  poly(x, [
    [1204, 898],
    [1218, 898],
    [1226, 1008],
    [1206, 1012],
  ], fill);
  ellipse(x, 1172, 920, 6.5, 12, fill, -0.2);
  ellipse(x, 1228, 920, 6.5, 12, fill, 0.2);
}
const FINGERS = [
  [-0.62, 38],
  [-0.26, 49],
  [0.02, 53],
  [0.3, 48],
  [0.66, 34],
];
function hand(x, fill, wr, side, cut = 0, tips = null) {
  const [wx, wy] = wr;
  ellipse(x, wx - side * 3, wy - 15, 12, 17, fill, side * 0.3);
  FINGERS.forEach(([a0, L], i) => {
    const a = -Math.PI / 2 + side * (a0 * 0.8 - 0.18);
    const bx = wx - side * 3 + Math.cos(a) * 11,
      by = wy - 21 + Math.sin(a) * 11;
    const l = L * (1 - cut * (0.25 + 0.15 * ((i * 3) % 4)));
    const tip = [bx + Math.cos(a) * l, by + Math.sin(a) * l];
    capsule(x, [bx, by], tip, 3.8, 2.1, fill);
    if (tips) tips.push(tip);
  });
}
function archbishop(x, fill, tips = null) {
  blob(x, AR.body, fill, 0.5);
  blob(x, AR.wing, fill, 0.5);
  blob(x, mirror(AR.wing), fill, 0.5);
  mitre(x, fill);
  for (const side of [1, -1]) {
    const m = (p) => (side > 0 ? p : [2 * CX - p[0], p[1]]);
    const { sh, el, wr } = AR.arm;
    capsule(x, m(sh), m(el), 25, 20, fill);
    capsule(x, m(el), m(wr), 10.5, 8.5, fill);
    hand(x, fill, m(wr), -side, 0.35, tips);
  }
  ellipse(x, 1156, 1318, 18, 7, fill, -0.1);
  ellipse(x, 1244, 1318, 18, 7, fill, 0.1);
}
// la aureola que le empieza a brotar detrás de la mitra
const NEWHALO = { cx: CX, cy: 872, r0: 64, r1: 150 };
function newHalo(x, fill) {
  x.save();
  x.lineWidth = 6;
  x.strokeStyle = fill;
  x.beginPath();
  x.arc(NEWHALO.cx, NEWHALO.cy, NEWHALO.r0, Math.PI * 0.95, Math.PI * 2.05);
  x.stroke();
  x.restore();
  haloSpikes(x, fill, NEWHALO.cx, NEWHALO.cy, NEWHALO.r0, NEWHALO.r1, 15, [2, 5, 8, 9, 12], -Math.PI / 2, 5);
}
// los otros, en la niebla roja, de rodillas entre las columnas
const OTHERS = [
  [470, 928, 0.42],
  [690, 904, 0.33],
  [1712, 904, 0.34],
  [1904, 922, 0.4],
  [2070, 934, 0.46],
];
function kneeler(x, fill, cx, cy, k) {
  // (encorvado hacia el ídolo: mira hacia el centro)
  const s = cx < CX ? 1 : -1;
  const q = (dx, dy) => [cx + s * dx * k, cy + dy * k];
  blob(x, [q(-86, 0), q(-80, -60), q(-62, -120), q(-34, -166), q(4, -186), q(40, -178), q(62, -150), q(70, -104), q(66, -50), q(84, 0)], fill, 0.5);
  // la capucha, inclinada hacia delante
  blob(x, [q(20, -170), q(30, -214), q(58, -236), q(86, -226), q(98, -196), q(92, -162), q(66, -150)], fill, 0.5);
}

// ------------------------------------------------------------ cosas del suelo
// (en el estudio de valores: claras, con sus cuencas negras; luego el buril
// y la plumilla las dibujan como a todo lo demás)
const SKULLS = [
  [830, 1186, 1.3, 0.4],
  [1588, 1176, 1.15, -0.3],
  [1730, 1302, 1.9, 0.2],
  [640, 1336, 2.0, -0.5],
  [1880, 1436, 2.3, 0.6],
  [470, 1240, 1.6, 0.1],
  [1990, 1230, 1.5, -0.2],
  [1010, 1450, 2.2, -0.15],
];
const BONES = [
  [[880, 1214], [956, 1200]],
  [[1620, 1206], [1690, 1230]],
  [[540, 1420], [690, 1392]],
  [[1790, 1360], [1930, 1388]],
  [[380, 1180], [450, 1200]],
  [[2050, 1300], [2160, 1282]],
];
const CANDLES = [
  [860, 1250, 30],
  [904, 1262, 20],
  [1546, 1244, 34],
  [1590, 1258, 18],
  [700, 1220, 22],
  [1760, 1214, 26],
];
const CENSER = [1530, 1380];
function skullShape(x, cx, cy, s, rot, fill, dark) {
  x.save();
  x.translate(cx, cy);
  x.rotate(rot);
  // el cráneo, las sienes, los pómulos y la quijada
  blob(x, [
    [-12 * s, -2 * s],
    [-10 * s, -9 * s],
    [0, -12 * s],
    [10 * s, -9 * s],
    [12 * s, -2 * s],
    [10 * s, 6 * s],
    [7 * s, 12 * s],
    [0, 14 * s],
    [-7 * s, 12 * s],
    [-10 * s, 6 * s],
  ], fill, 0.5);
  if (dark) {
    blob(x, [
      [-8 * s, 0],
      [-5 * s, -3 * s],
      [-1.5 * s, -1 * s],
      [-2 * s, 3.5 * s],
      [-6 * s, 4 * s],
    ], dark, 0.5);
    blob(x, [
      [8 * s, 0],
      [5 * s, -3 * s],
      [1.5 * s, -1 * s],
      [2 * s, 3.5 * s],
      [6 * s, 4 * s],
    ], dark, 0.5);
    poly(x, [
      [0, 4.5 * s],
      [-1.6 * s, 8 * s],
      [1.6 * s, 8 * s],
    ], dark);
    x.fillStyle = dark;
    for (let i = -2; i <= 2; i++) x.fillRect(i * 2.2 * s - 0.5 * s, 10 * s, 1.0 * s, 2.6 * s);
  }
  x.restore();
}
function floorThings(x, light, dark, mid) {
  for (const [cx, cy, sc, rot] of SKULLS) {
    ellipse(x, cx + 4 * sc, cy + 12 * sc, 18 * sc, 6 * sc, dark);
    skullShape(x, cx, cy, sc, rot, light, dark);
  }
  for (const [a, b] of BONES) {
    capsule(x, a, b, 5, 5, light);
    ellipse(x, a[0], a[1], 7, 6, light);
    ellipse(x, b[0], b[1], 7, 6, light);
  }
  for (const [cx, cy, h] of CANDLES) {
    ellipse(x, cx, cy + 2, 18, 4.5, light);
    poly(x, [
      [cx - 8, cy],
      [cx + 8, cy],
      [cx + 7, cy - h],
      [cx - 7, cy - h],
    ], light);
  }
  // el incensario, tirado a su derecha
  ellipse(x, CENSER[0], CENSER[1], 30, 23, mid);
  // el báculo, caído a su izquierda
  capsule(x, [560, 1490], [990, 1330], 4, 4, mid);
}
const crookPts = () => {
  const out = [];
  for (let i = 0; i <= 34; i++) {
    const a = (i / 34) * Math.PI * 1.7;
    const rr = 36 - i * 0.62;
    out.push([990 + Math.cos(a - 2.0) * rr + 20, 1330 + Math.sin(a - 2.0) * rr - 30]);
  }
  return out;
};
// los nichos de calaveras dentro de los arcos ciegos
function niches(x, light, dark) {
  for (const s of [1, -1])
    for (const arch of blindArches(s)) {
      const [a, d, , , , c, b] = arch; // a: abajo cerca, d: arriba cerca, c: arriba lejos, b: abajo lejos
      const at = (u, v) => [mix(mix(a[0], b[0], u), mix(d[0], c[0], u), v), mix(mix(a[1], b[1], u), mix(d[1], c[1], u), v)];
      for (let row = 0; row < 5; row++)
        for (let k = 0; k < 4; k++) {
          const u = (k + 0.5) / 4,
            v = 0.12 + row * 0.19;
          const p = at(u, v);
          const sz = Math.abs(at(u + 0.1, v)[0] - p[0]) * 0.32 + 2;
          ellipse(x, p[0], p[1], sz * 1.2, sz * 1.5, dark);
          skullShape(x, p[0], p[1] + sz * 0.1, sz / 13, 0, light, dark);
        }
    }
}

// ------------------------------------------------------------ el dibujo
export async function draw(c, o = {}) {
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  const r = mulberry(1167),
    N = new Noise(1167);
  const tools = { rng: r, noise: N };
  const mk = (fn, fill0 = 0) => {
    const f = new Field(W, H, fill0);
    fn(f.x);
    return f.read();
  };
  const tips = [];

  // ---------------------------------------------------- el monolito
  // (el de verdad, a 8 m, de frente, con el ojo abierto y algunas almas
  // gritando; la luz, la del pozo, desde abajo y por delante, y un rojo
  // que le baja por detrás)
  const R = renderMonolith({
    W,
    H,
    F,
    CX,
    HY,
    HC,
    at: [0, 7.1],
    open: 1,
    cry: [0, 2, 4, 5, 9, 13],
    contrast: 2.2,
    lights: [
      { p: [0, -0.2, 5.6], color: 0xffd0a0, k: 7, decay: 1.3 },
      { p: [-3, 1.0, 6.5], color: 0xff6a3a, k: 2, decay: 1.3 },
      { p: [0, 10, 11], color: 0xff3018, k: 5, decay: 1.2 },
    ],
    hemi: [0x602018, 0x100404, 0.14],
  });
  // (lo de abajo se mete en el pozo, en la niebla)
  for (let k = 0; k < R.alpha.length; k++) R.alpha[k] *= sstep(1090, 1000, (k / W) | 0);
  const Mi = new Field(W, H);
  Mi.d = R.alpha;
  toCanvasF(Mi);
  const hotF = new Field(W, H);
  hotF.d = R.glow.map((g) => sstep(0.25, 0.75, g));
  MONO = { img: maskImage(Mi).c, hot: maskImage(hotF).c, R };
  const Mib = Mi;
  const Ma = mk((m) => archbishop(m, gray(1), tips));
  const Mn = mk((m) => newHalo(m, gray(1)));
  const Mc = mk((m) => eachCol((X, Z) => column(m, gray(1), X, Z)));
  const ARC = archCurves();
  const Marc = mk((m) => {
    for (const a of ARC) strokeCurve(m, a.pts, a.w, gray(1));
  });
  const Mw = mk((m) => walls(m, gray(1)));
  const Mk = mk((m) => {
    for (const [cx, cy, k] of OTHERS) kneeler(m, gray(1), cx, cy, k);
  });
  const Mp = mk((m) => ellipse(m, CX, PIT.cy, PIT.rx + 44, PIT.ry + 14, gray(1)));
  const Mf = mk((m) => floorThings(m, gray(1), gray(1), gray(1)));
  const MibA = maskMinus(Mib, Ma),
    MiA = maskMinus(Mi, Ma),
    MnA = maskMinus(Mn, Ma);
  const archImg = maskImage(Ma);

  // ---------------------------------------------------- el estudio de valores
  const T = new Field(W, H, 0.5);
  const t = T.x;
  {
    const g = t.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, gray(0.1));
    g.addColorStop(0.22, gray(0.4));
    g.addColorStop(0.5, gray(0.7));
    g.addColorStop(0.62, gray(0.64));
    g.addColorStop(0.82, gray(0.44));
    g.addColorStop(1, gray(0.22));
    t.fillStyle = g;
    t.fillRect(0, 0, W, H);
    // los muros, en la niebla roja; los arcos ciegos y sus calaveras
    walls(t, gray(0.62, 0.55));
    for (const s of [1, -1]) for (const a of blindArches(s)) blob(t, a, gray(0.22, 0.85), 0.2);
    niches(t, gray(0.66), gray(0.08));
    // detrás del ídolo, la nada; alrededor de la cabeza, la luz roja
    glow(t, CX, 540, 520, gray(0.04, 0.96), gray(0.4, 0), 1.25);
    glow(t, R.eyeC[0], R.eyeC[1], 300, gray(0.8, 0.95), gray(0.4, 0), 1);
    glow(t, CX, 320, 560, gray(0.62, 0.7), gray(0.4, 0), 1.6);
    for (const a of ARC) strokeCurve(t, a.pts, a.w, gray(0.14, 0.92));
    for (const [cx, cy, k] of OTHERS) kneeler(t, gray(0.24, 0.92), cx, cy, k);
    // el suelo, más claro delante del pozo
    glow(t, CX, 1200, 620, gray(0.7, 0.8), gray(0.42, 0), 0.4);
    // la niebla que sube del pozo, con sus rayos
    glow(t, CX, 990, 660, gray(0.96, 0.92), gray(0.55, 0), 0.5);
    t.save();
    t.globalCompositeOperation = 'lighter';
    t.filter = 'blur(10px)';
    for (let i = 0; i < 14; i++) {
      const bx = CX + (r() - 0.5) * 560,
        w0 = 6 + r() * 16;
      const g2 = t.createLinearGradient(0, 1060, 0, 560);
      g2.addColorStop(0, gray(0.11));
      g2.addColorStop(1, gray(0));
      t.fillStyle = g2;
      t.beginPath();
      t.moveTo(bx - w0, 1060);
      t.lineTo(bx + w0, 1060);
      t.lineTo(bx + (bx - CX) * 0.4 + w0 * 2, 560);
      t.lineTo(bx + (bx - CX) * 0.4 - w0 * 2, 560);
      t.fill();
    }
    t.restore();
    glow(t, CX, 1050, 380, gray(1, 1), gray(0.96, 0), 0.32);
    // el brocal
    ellipse(t, CX, PIT.cy + 8, PIT.rx + 44, PIT.ry + 14, gray(0.3));
    ellipse(t, CX, PIT.cy, PIT.rx + 30, PIT.ry + 8, gray(0.84));
    ellipse(t, CX, PIT.cy - 2, PIT.rx, PIT.ry, gray(1));
    // lo que hay por el suelo
    floorThings(t, gray(0.8), gray(0.08), gray(0.2));
  }
  T.read();
  eachCol((X, Z, s) => {
    const { xa, xb } = colBox(X, Z);
    shadeInto(T, Mc, 3, [xa - 70, 0, xb + 70, 1000], (px, py) => {
      const u = clamp(((px - xa) / (xb - xa)) * 2 - 1, -1, 1);
      const lit = Math.max(0, -s * u * 0.85 + Math.sqrt(1 - u * u) * 0.35);
      // las juntas de los tambores
      const joint = Math.abs(((py * 0.035) % 1) - 0.5) < 0.04 ? 0.6 : 1;
      return (0.07 + 0.64 * lit * lit) * joint + 0.04 * N.n2(px * 0.05, py * 0.004);
    });
  });
  // el monolito: el tono que le da la luz del pozo (y lo que arde, claro);
  // abajo, la niebla que sube
  for (let k = 0; k < T.d.length; k++) {
    const al = R.alpha[k];
    if (al < 0.01) continue;
    const py = (k / W) | 0;
    // (las almas, más claras que la piedra: que se lean)
    const soul = sstep(0.55, 0.9, R.alb[k]);
    const v = clamp(0.015 + Math.pow(R.lum[k], 1.1) * (1.05 + 0.5 * soul) + R.glow[k] * 0.75);
    T.d[k] = mix(T.d[k], mix(v, 0.92, sstep(760, 1080, py) * 0.85), al);
  }
  shadeInto(T, Mn, 2, [1000, 700, 1400, 1000], () => 0.14);
  shadeInto(T, Ma, 5, [940, 640, 1460, 1340], (px, py, nx, ny, nz) => {
    const rim = Math.pow(1 - nz, 1.4);
    const fold = 0.5 + 0.5 * Math.sin((px - CX) * 0.08 + Math.sin(py * 0.01) * 1.5);
    return clamp(0.02 + rim * 0.8 + 0.07 * fold * sstep(1050, 1320, py));
  });
  shadeInto(T, Mk, 3, [300, 600, 2300, 960], (px, py, nx, ny, nz) => 0.26 + 0.32 * Math.pow(1 - nz, 2));
  // lo de oro y lo que arde, dentro del tono (para que el buril lo respete)
  const paint = (fn) => {
    const f = mk(fn);
    for (let i = 0; i < T.d.length; i++) if (f.d[i] > 0.004) T.d[i] = mix(T.d[i], f.d[i] > 0.5 ? 1 : T.d[i], Math.min(1, f.d[i] * 1.6));
  };
  // (las piezas de oro, a medio tono; lo que arde, blanco)
  const gold = (fn) => {
    const f = mk(fn);
    for (let i = 0; i < T.d.length; i++) if (f.d[i] > 0.004) T.d[i] = mix(T.d[i], 0.55, Math.min(1, f.d[i]));
    return f;
  };
  const GOLDI = (d) => {
    d.lineCap = 'round';
    d.lineJoin = 'round';
    d.strokeStyle = gray(1);
    const S = (pts, w) => {
      d.lineWidth = w;
      d.beginPath();
      d.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts) d.lineTo(p[0], p[1]);
      d.stroke();
    };
    // la cruz en Y del arzobispo y la mitra
    S([[CX, 1322], [CX, 1072]], 18);
    S([[CX, 1072], [1164, 1018], [1144, 980]], 18);
    S([[CX, 1072], [1236, 1018], [1256, 980]], 18);
    S([[CX, 792], [CX, 896]], 8);
    S([[1170, 888], [CX, 897], [1230, 888]], 9);
    // el báculo
    S(crookPts(), 7);
  };
  const Mgold = gold(GOLDI);
  const HOTI = (d) => {
    d.drawImage(MONO.hot, 0, 0);
    for (const [cx, cy, h] of CANDLES) ellipse(d, cx, cy - h - 10, 5, 11, gray(1));
  };
  paint(HOTI);

  if (o.stage === 'tone') {
    toCanvasF(T);
    x.drawImage(T.c, 0, 0);
    return;
  }
  // ---------------------------------------------------- el papel y el lápiz
  paper(x, W, H, N, r);
  {
    const pc = { ...tools, color: 'rgba(60,52,48,0.26)' };
    pencil(x, [
      [0, HY],
      [W, HY],
    ], pc);
    for (const fx of [-1500, -700, 100, 700, 1700, 2300, 3100, 3900]) pencil(x, [[CX, HY], [fx, H]], { ...pc, color: 'rgba(60,52,48,0.15)' });
    pencil(x, [
      [CX, 0],
      [CX, 1330],
    ], pc);
    const circ = [];
    for (let i = 0; i <= 60; i++) circ.push([R.eyeC[0] + Math.cos((i / 60) * Math.PI * 2) * 132, R.eyeC[1] + Math.sin((i / 60) * Math.PI * 2) * 132]);
    pencil(x, circ, pc);
    pencil(x, [
      [CX, 1320],
      [1194, 1120],
      [CX, 900],
    ], pc);
    pencil(x, [
      [1020, 700],
      [1200, 960],
      [1380, 700],
    ], pc);
  }

  // ---------------------------------------------------- las planchas de color
  const GLOW = mk((m) => {
    glow(m, CX, 1030, 520, gray(1), gray(0, 0), 0.42);
    glow(m, CX, 930, 640, gray(0.75), gray(0, 0), 0.62);
    HOTI(m);
    // las grietas de la espalda
    m.lineCap = 'round';
    m.strokeStyle = gray(1);
    m.lineWidth = 9;
    for (const l of CRACKS) {
      m.beginPath();
      m.moveTo(l[0][0], l[0][1]);
      for (const p of l) m.lineTo(p[0], p[1]);
      m.stroke();
    }
  });
  const RED = mk((m) => {
    m.fillStyle = gray(0.55);
    m.fillRect(0, 0, W, H);
    for (const s of [-1, 1]) {
      const g = m.createLinearGradient(s < 0 ? 0 : W, 0, s < 0 ? 1020 : W - 1020, 0);
      g.addColorStop(0, gray(1));
      g.addColorStop(0.74, gray(1));
      g.addColorStop(1, gray(1, 0));
      m.fillStyle = g;
      m.fillRect(s < 0 ? 0 : W - 1020, 0, 1020, H);
    }
    glow(m, R.eyeC[0], R.eyeC[1], 340, gray(1), gray(0, 0), 1);
  });
  {
    // (la luz del pozo no le tiñe a él: está delante; sólo sus grietas)
    const cr = mk((m) => {
      m.lineCap = 'round';
      m.strokeStyle = gray(1);
      m.lineWidth = 9;
      for (const l of CRACKS) {
        m.beginPath();
        m.moveTo(l[0][0], l[0][1]);
        for (const q of l) m.lineTo(q[0], q[1]);
        m.stroke();
      }
    });
    for (let i = 0; i < GLOW.d.length; i++) GLOW.d[i] = Math.max(cr.d[i], GLOW.d[i] * (1 - Ma.d[i]));
    toCanvasF(GLOW);
  }
  for (let i = 0; i < RED.d.length; i++) RED.d[i] = Math.max(0, RED.d[i] - GLOW.d[i] * 0.9);
  toCanvasF(RED);
  wash(x, RED, [172, 22, 16], { ...tools, alpha: 0.92, blur: 14, edge: 0.32, nb: 0.12, ns: 0.0022, streak: [0.0012, 0.02, 0.22] });
  const DEEP = mk((m) => {
    for (const s of [-1, 1]) {
      const g = m.createLinearGradient(s < 0 ? 0 : W, 0, s < 0 ? 700 : W - 700, 0);
      g.addColorStop(0, gray(1));
      g.addColorStop(0.45, gray(0.8));
      g.addColorStop(1, gray(0, 0));
      m.fillStyle = g;
      m.fillRect(s < 0 ? 0 : W - 700, 0, 700, H);
    }
    const g2 = m.createLinearGradient(0, 1250, 0, H);
    g2.addColorStop(0, gray(0, 0));
    g2.addColorStop(1, gray(0.85));
    m.fillStyle = g2;
    m.fillRect(0, 1250, W, H - 1250);
  });
  wash(x, DEEP, [112, 10, 8], { ...tools, alpha: 0.72, blur: 20, edge: 0.5, nb: 0.2, ns: 0.003, streak: [0.02, 0.0012, 0.3] });
  wash(x, GLOW, [255, 196, 120], { ...tools, alpha: 0.72, blur: 6, edge: 0.15, nb: 0.04 });
  wash(x, Mgold, [214, 160, 78], { ...tools, alpha: 0.8, blur: 1.5, edge: 0.25, nb: 0.02 });
  if (o.stage === 'wash') return;

  // ---------------------------------------------------- el buril
  const figs = mk((m) => {
    idol(m, gray(1));
    archbishop(m, gray(1));
    newHalo(m, gray(1));
    eachCol((X, Z) => column(m, gray(1), X, Z));
    for (const a of ARC) strokeCurve(m, a.pts, a.w, gray(1));
    for (const [cx, cy, k] of OTHERS) kneeler(m, gray(1), cx, cy, k);
  });
  const notFigs = new Field(W, H);
  notFigs.d = figs.d.map((v) => (v > 0.5 ? 0 : 1));
  const notFigsWall = new Field(W, H);
  notFigsWall.d = notFigs.d.map((v, i) => (v > 0.5 && Mw.d[i] > 0.5 ? 1 : 0));
  const notFigsOpen = new Field(W, H);
  notFigsOpen.d = notFigs.d.map((v, i) => (v > 0.5 && Mw.d[i] < 0.5 ? 1 : 0));
  const burin = { ...tools, t0: 0.2, max: 2.6, gamma: 0.85 };
  engrave(x, T, parallel(0.0, 5, [0, 0, W, 860], { noise: N, wob: 3 }), { ...burin, region: notFigsOpen, max: 3.6 });
  engrave(x, T, parallel(0.52, 6.5, [0, 0, W, 860], { noise: N, wob: 2 }), { ...burin, region: notFigsOpen, t0: 0.66, max: 2.6 });
  {
    const rays = [];
    for (let a = -0.62; a <= 0.62; a += 0.0058) {
      const ca = Math.cos(a),
        sa = Math.sin(a);
      for (const s of [-1, 1])
        rays.push([
          [CX + s * ca * 560, HY - sa * 560],
          [CX + s * ca * 2400, HY - sa * 2400],
        ]);
    }
    engrave(x, T, rays, { ...burin, region: notFigsWall, max: 2.8, t0: 0.26 });
  }
  {
    const rows = [];
    for (let y = 772; y < H; y += 2.8 + (y - 760) * 0.018) {
      const l = [];
      for (let xx = -20; xx <= W + 20; xx += 8) l.push([xx, y + N.n2(xx * 0.003, y * 0.01) * 2.2]);
      rows.push(l);
    }
    engrave(x, T, rows, { ...burin, region: notFigs, max: 3.4 });
    const rays = [];
    for (let fx = -3600; fx <= 6000; fx += 150) rays.push([[CX + (fx - CX) * 0.02, HY + 8], [fx, H + 10]]);
    engrave(x, T, rays, { ...burin, region: notFigs, t0: 0.42, max: 1.6 });
  }
  eachCol((X, Z) => {
    const { xa, xb, yb, yt } = colBox(X, Z);
    const ls = [];
    for (let xx = xa - 34; xx <= xb + 34; xx += 3.2) ls.push([[xx, yt - 90], [xx, yb + 20]]);
    engrave(x, T, ls, { ...burin, region: Mc, max: 3.0 });
  });
  for (const a of ARC) engrave(x, T, offsets(a.pts, a.w, 3.6), { ...burin, region: maskMinus(Marc, Mi), max: 3.2 });
  engrave(x, T, parallel(Math.PI / 2 - 0.2, 3, [300, 600, 2300, 960]), { ...burin, region: Mk, max: 2.8 });
  {
    // la piedra, de arriba abajo, y las formas (las caras, las manos, los
    // anillos) por sus curvas de nivel
    const v = family(210, (u, s) => {
      const px = mix(960, 1440, u);
      const py = mix(-10, 1160, s);
      return [px + Math.sin(py * 0.006 + px * 0.05) * 3 + N.n2(px * 0.01, py * 0.004) * 4, py];
    });
    engrave(x, T, v, { ...burin, region: MibA, max: 2.4, t0: 0.16 });
    const L = new Field(W, H);
    L.d = R.lum.map((q, k) => (R.alpha[k] > 0.5 ? q : 0));
    toCanvasF(L);
    const Lb = L.blurred(2.2).read();
    const souls = new Field(W, H);
    souls.d = R.alb.map((q, k) => (q > 0.62 && MibA.d[k] > 0.5 ? 1 : 0));
    toCanvasF(souls);
    const iso = [];
    for (let lv = 0.12; lv < 0.85; lv += 0.12) for (const l of contours(Lb, lv, 2)) if (l.length > 10) iso.push(simplify(l, 0.8));
    engrave(x, T, iso, { ...burin, region: souls, max: 1.7, t0: 0.12 });
  }
  {
    const spk = [];
    for (const s of spikeTips(NEWHALO.cx, NEWHALO.cy, NEWHALO.r0, NEWHALO.r1, 15, [2, 5, 8, 9, 12]))
      for (let k = -1; k <= 1; k++) {
        const ca = Math.cos(s.a),
          sa = Math.sin(s.a);
        spk.push([
          [NEWHALO.cx + ca * 60 - sa * k * 2.4, NEWHALO.cy + sa * 60 + ca * k * 2.4],
          [NEWHALO.cx + ca * (s.L + 3), NEWHALO.cy + sa * (s.L + 3)],
        ]);
      }
    engrave(x, T, spk, { ...burin, region: MnA, max: 2.4, t0: 0.1, color: 'rgba(40,6,4,0.9)' });
  }
  {
    const Bm = Ma.blurred(10).read();
    const iso = [];
    for (let lv = 0.52; lv < 0.99; lv += 0.03) for (const l of contours(Bm, lv, 2)) if (l.length > 8) iso.push(simplify(l, 0.8));
    engrave(x, T, iso, { ...burin, region: Ma, max: 3.0, t0: 0.05 });
    const v = family(150, (u, s) => {
      const px = mix(990, 1410, u);
      const py = mix(860, 1330, s);
      return [px + (px - CX) * 0.2 * s + Math.sin(py * 0.02 + u * 30) * 2, py];
    });
    engrave(x, T, v, { ...burin, region: Ma, max: 3.0, t0: 0.3 });
  }

  // ---------------------------------------------------- los contornos
  const outline = (Fm, w, passes, color = INK, lift = 260, min = 6) => {
    for (const l of contours(Fm, 0.5, 2)) {
      if (l.length < min) continue;
      pen(x, simplify(l, 1.0), { ...tools, w, passes, color, lift, jit: 0.9, spread: 2 });
    }
  };
  outline(Mc, 2.0, 1, 'rgba(26,8,6,0.85)');
  outline(maskMinus(Marc, Mi), 1.6, 1, 'rgba(26,8,6,0.7)');
  outline(Mk, 1.4, 1, 'rgba(40,10,8,0.65)');
  outline(Mp, 1.8, 1);
  outline(Mf, 1.5, 1, 'rgba(26,12,8,0.85)');
  outline(MiA, 2.2, 2);
  outline(MnA, 1.4, 1, 'rgba(40,6,4,0.85)');
  outline(Ma, 2.7, 2);
  if (o.stage === 'ink') return;

  // ---------------------------------------------------- la plumilla: detalles
  const P1 = { ...tools, w: 1.6, jit: 0.7, color: INK };
  const idolDetails = layer(
    W,
    H,
    (d) => {
      // lo más hondo de las almas (las cuencas, las bocas, entre los dedos),
      // repasado a plumilla
      // (sólo en las almas: lo pálido)
      const L = new Field(W, H);
      L.d = R.lum.map((q, k) => (R.alpha[k] > 0.5 && R.alb[k] > 0.62 ? q : 1));
      toCanvasF(L);
      const Lb = L.blurred(1.6).read();
      for (const lv of [0.14, 0.24])
        for (const l of contours(Lb, lv, 2)) {
          if (l.length < 8 || l.length > 200) continue;
          pen(d, simplify(l, 1.0), { ...P1, w: lv < 0.2 ? 1.5 : 1.0, color: 'rgba(16,6,4,0.9)', lift: 999 });
        }
      // las cadenas, del zuncho de abajo al brocal
      const chainLine = (a, b, sag, n) => {
        const pts = [];
        for (let i = 0; i <= n; i++) {
          const s = i / n;
          pts.push([mix(a[0], b[0], s), mix(a[1], b[1], s) + sag * 4 * s * (1 - s)]);
        }
        for (let i = 0; i < pts.length - 1; i++) {
          const [pp, q] = [pts[i], pts[i + 1]];
          d.save();
          d.translate((pp[0] + q[0]) / 2, (pp[1] + q[1]) / 2);
          d.rotate(Math.atan2(q[1] - pp[1], q[0] - pp[0]));
          d.strokeStyle = 'rgba(30,16,12,0.94)';
          d.lineWidth = i % 2 ? 2.6 : 1.8;
          d.beginPath();
          if (i % 2) d.ellipse(0, 0, 8, 3.4, 0, 0, Math.PI * 2);
          else {
            d.moveTo(-8, 0);
            d.lineTo(8, 0);
          }
          d.stroke();
          d.restore();
        }
      };
      const yb = Math.round(Yi(0.35));
      let xl = W,
        xr = 0;
      for (let xx = 700; xx < 1700; xx++)
        if (R.alpha[yb * W + xx] > 0.5) {
          xl = Math.min(xl, xx);
          xr = Math.max(xr, xx);
        }
      chainLine([xl + 6, yb - 4], [880, 1060], 34, 16);
      chainLine([xr - 6, yb - 4], [1520, 1060], 34, 16);
    },
    archImg
  );
  x.drawImage(idolDetails, 0, 0);
  // el ojo: abierto, con la pupila de cabra; y lo que arde en las bocas
  {
    const [ex, ey] = R.eyeC;
    x.drawImage(
      layer(
        W,
        H,
        (d) => {
          d.globalCompositeOperation = 'lighter';
          d.filter = 'blur(5px)';
          d.globalAlpha = 0.85;
          d.drawImage(MONO.hot, 0, 0);
          d.filter = 'none';
          d.globalAlpha = 1;
          glow(d, ex, ey, 70, 'rgba(255,170,90,0.55)', 'rgba(255,120,60,0)', 1.5);
        },
        archImg
      ),
      0,
      0
    );
    pen(x, [[ex, ey - 26], [ex + 1, ey], [ex, ey + 26]], { ...P1, w: 5, color: 'rgba(10,3,2,0.96)', lift: 999 });
    ellipse(x, ex - 6, ey - 9, 2.4, 2.4, 'rgba(255,244,226,1)');
  }

  // el arzobispo: las ínfulas con su fleco, el pelo blanco, la cruz
  for (const [x0, x1] of [
    [1175, 1194],
    [1206, 1226],
  ])
    for (let fx = x0; fx <= x1; fx += 3) pen(x, [[fx, 1010], [fx + (r() - 0.5) * 3, 1024 + r() * 7]], { ...P1, w: 1.0, lift: 999 });
  for (let i = 0; i < 10; i++) {
    const hx = 1180 + i * 4.6;
    pen(x, [[hx, 928], [hx + (r() - 0.5) * 4, 946 + r() * 7]], { ...P1, w: 1.1, color: 'rgba(240,230,215,0.75)', lift: 999 });
  }
  for (const l of [
    [[CX, 1322], [CX, 1072]],
    [[CX, 1072], [1164, 1018], [1144, 980]],
    [[CX, 1072], [1236, 1018], [1256, 980]],
  ])
    pen(x, l, { ...P1, w: 1.2, passes: 2, spread: 18, lift: 999 });
  for (const v of [1130, 1230]) {
    pen(x, [[CX, v - 15], [CX, v + 15]], { ...P1, w: 3.2 });
    pen(x, [[CX - 9, v - 5], [CX + 9, v - 5]], { ...P1, w: 3.2 });
  }
  pen(x, [[1170, 888], [CX, 897], [1230, 888]], { ...P1, w: 1.2, passes: 2, spread: 9 });
  // las mangas del alba, blancas, caídas hasta el codo
  for (const side of [1, -1]) {
    const m = (p) => (side > 0 ? p : [2 * CX - p[0], p[1]]);
    const { el } = AR.arm;
    for (let k = 0; k < 3; k++) pen(x, [m([el[0] + 4 + k * 4, el[1] + 30 - k * 6]), m([el[0] + 14 + k * 3, el[1] + 4 - k * 6]), m([el[0] + 30, el[1] - 4 - k * 5])], { ...P1, w: 2.2, color: 'rgba(238,228,212,0.75)' });
  }
  // el canto encendido del arzobispo (la luz del pozo, por detrás)
  for (const l of contours(Ma, 0.5, 2)) {
    if (l.length < 20) continue;
    let run = [];
    for (const p of simplify(l, 1.0)) {
      if (p[1] < 1300) run.push([p[0], p[1] + 1.5]);
      else {
        if (run.length > 2) pen(x, run, { ...tools, w: 2.2, color: 'rgba(255,168,118,0.8)', jit: 0.6, lift: 120 });
        run = [];
      }
    }
    if (run.length > 2) pen(x, run, { ...tools, w: 2.2, color: 'rgba(255,168,118,0.8)', jit: 0.6, lift: 120 });
  }
  // las grietas de la espalda: le arde por dentro
  for (const [l, w] of CRACKS.map((c2, i) => [c2, [2.8, 1.9, 1.7, 1.5, 1.3][i]])) {
    pen(x, l, { ...tools, w: w + 1.2, color: 'rgba(255,64,32,0.9)', jit: 0.5, lift: 999 });
    pen(x, l, { ...tools, w: w * 0.45, color: 'rgba(255,240,200,0.97)', jit: 0.3, lift: 999 });
  }
  // el bajo de la casulla, quemándose: chispas
  for (let i = 0; i < 90; i++) {
    const u = r();
    const px = mix(1006, 1394, u),
      py = 1300 + Math.sin(u * Math.PI) * 20 + (r() - 0.5) * 10;
    ellipse(x, px, py - r() * 40, 1 + r() * 2.2, 1 + r() * 2.2, r() < 0.5 ? 'rgba(255,120,60,0.9)' : 'rgba(255,232,184,0.9)');
  }
  // la ceniza que sube
  const plume = (from, k = 1) => [from, [from[0] + (CX - from[0]) * 0.15, from[1] - 160 * k], [from[0] + (CX - from[0]) * 0.45, from[1] - 340 * k], [CX + (from[0] - CX) * 0.3, from[1] - 520 * k]];
  for (const tip of tips) ash(x, plume(tip), 70, { ...tools, spread: 28, size: 3.4, light: 'rgba(255,236,214,0.88)', dark: 'rgba(30,16,12,0.85)', lightK: 0.55 });
  ash(x, plume([CX, 786]), 80, { ...tools, spread: 32, size: 3.2, light: 'rgba(255,230,200,0.85)', dark: 'rgba(30,16,12,0.8)', lightK: 0.5 });
  for (const sx of [1136, 1264]) ash(x, plume([sx, 966], 0.7), 46, { ...tools, spread: 30, size: 2.8, light: 'rgba(255,210,170,0.75)', dark: 'rgba(30,16,12,0.7)', lightK: 0.45 });
  for (const [cx, cy, k] of OTHERS) ash(x, plume([cx, cy - 220 * k], k * 1.2), 30, { ...tools, spread: 40 * k, size: 2.4, light: 'rgba(255,190,150,0.6)', dark: 'rgba(40,10,8,0.6)', lightK: 0.4 });
  ellipse(x, 1368, 730, 3.4, 3.4, 'rgba(250,210,120,0.96)');

  // las cosas del suelo: sus rasgos a plumilla
  for (const [cx, cy, sc, rot] of SKULLS) {
    pen(x, [[cx - 10 * sc, cy + 4 * sc], [cx + 4 * sc, cy + 9 * sc], [cx + 12 * sc, cy + 2 * sc]], { ...tools, w: 1.1, jit: 0.4, color: 'rgba(40,24,16,0.7)' });
    void rot;
  }
  for (const [cx, cy, h] of CANDLES) {
    ellipse(x, cx, cy - h - 10, 2.2, 6, 'rgba(255,252,236,1)');
    pen(x, [[cx, cy - h], [cx, cy - h - 4]], { ...tools, w: 1.2, color: INK, lift: 999 });
    for (let k = 0; k < 2; k++) pen(x, [[cx - 6 + k * 9, cy - h + 2], [cx - 6 + k * 9, cy - h + 8 + r() * 10]], { ...tools, w: 2.2, color: 'rgba(238,226,200,0.85)', lift: 999 });
  }
  {
    const [ix, iy] = CENSER;
    pen(x, [[ix - 30, iy], [ix, iy + 9], [ix + 30, iy]], { ...tools, w: 2, color: INK });
    for (let i = 0; i < 6; i++) ellipse(x, ix - 18 + i * 7, iy - 14, 2.2, 3.2, 'rgba(255,110,50,0.9)');
    const ch = [];
    for (let i = 0; i <= 44; i++) {
      const a = i * 0.45;
      ch.push([ix + 34 + i * 3.4 + Math.cos(a) * 13, iy + 16 + Math.sin(a) * 7]);
    }
    pen(x, ch, { ...tools, w: 1.8, color: INK, lift: 999 });
    for (let i = 0; i < 50; i++) ellipse(x, ix - 44 - r() * 100, iy + 10 + (r() - 0.3) * 34, 1.4 + r() * 2.8, 1 + r() * 1.8, r() < 0.6 ? 'rgba(255,90,40,0.95)' : 'rgba(255,220,160,0.95)');
    for (let k = 0; k < 3; k++) {
      const sm = [];
      for (let i = 0; i <= 34; i++) sm.push([ix + Math.sin(i * 0.35 + k * 2) * (8 + i * 1.3) + k * 6, iy - 22 - i * 11]);
      pen(x, sm, { ...tools, w: 3 + k, color: 'rgba(240,226,210,0.22)', lift: 999 });
    }
  }
  pen(x, crookPts(), { ...tools, w: 1.3, color: INK, lift: 999 });
  // el corazón de la luz del pozo (detrás de él)
  x.drawImage(
    layer(
      W,
      H,
      (d) => {
        glow(d, CX, 1030, 380, 'rgba(255,246,222,0.72)', 'rgba(255,240,210,0)', 0.42);
        glow(d, CX, 1040, 200, 'rgba(255,252,240,0.8)', 'rgba(255,250,232,0)', 0.3);
      },
      archImg
    ),
    0,
    0
  );

  // ---------------------------------------------------- la tinta que salta
  splatter(x, 250, 320, 240, 90, 'rgba(150,14,10,0.8)', r, { max: 12, drip: 0.4 });
  splatter(x, 2170, 1180, 260, 80, 'rgba(150,14,10,0.75)', r, { max: 10, drip: 0.3 });
  splatter(x, 1320, 1440, 200, 40, 'rgba(20,8,6,0.6)', r, { max: 7, drip: 0.1 });
  for (let i = 0; i < 9; i++) {
    const dx = 120 + r() * 2160;
    const l = 40 + r() * r() * 360;
    pen(x, [[dx, -4], [dx + (r() - 0.5) * 6, l * 0.6], [dx + (r() - 0.5) * 4, l]], { ...tools, w: 4 + r() * 6, color: 'rgba(140,12,10,0.85)', lift: 9999 });
    ellipse(x, dx, l, 4 + r() * 3, 5 + r() * 4, 'rgba(140,12,10,0.85)');
  }
  vignette(x, W, H, 0.42);
  if (o.stage !== 'raw') plate(c, 'I · EL ARZOBISPO, CONSUMIDO', 'Braga, otoño de 1167. La decimocuarta noche del asedio.');
}

// las grietas de la espalda
const CRACKS = [
  [[CX, 1074], [1191, 1110], [1206, 1146], [1195, 1190], [1212, 1236]],
  [[1195, 1190], [1166, 1218], [1156, 1262]],
  [[1206, 1146], [1240, 1168], [1270, 1164]],
  [[1164, 1018], [1146, 1052], [1118, 1068]],
  [[1236, 1018], [1252, 1046], [1284, 1060]],
];
