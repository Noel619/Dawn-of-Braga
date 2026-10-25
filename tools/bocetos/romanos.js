// Boceto 2: los romanos dan con ella (Bracara Augusta, siglo I). Grabado a
// dos tintas, con la luz de las antorchas.
//
// Picando para los cimientos de algo, rompieron la roca y salieron a una
// cueva con un lago negro; en medio del agua, de pie, el monolito: más alto
// que cuatro hombres, de una piedra que no es de aquí, lleno de caras y de
// manos que empujan desde dentro, con la grieta encendida, el ojo cerrado
// entre sus anillos y, en lo alto, entre los brazos que salen de la boca
// rota, el brazo negro con la mano de oro (la Garra: la que Martín le
// cortaría siglos después). Nadie lo talló. El centurión, con la cresta de
// través, alza la antorcha; un legionario se mete en el agua con el pilo por
// delante; el sacerdote, con la toga sobre la cabeza, se tapa la boca; el
// esclavo que abrió el boquete ya se ha arrodillado. En la orilla hay
// huesos que no son de romanos, y en una peña, espirales que alguien grabó
// antes que ellos.
//
// El monolito es el del juego (mono3d.js lo monta y le saca la silueta, el
// tono a la luz de la antorcha y el oro de la mano).
import { mulberry, Noise, Field, gray, clamp, mix, sstep, blob, poly, capsule, ellipse, glow, contours, simplify, pen, pencil, brush, ash, wash, paper, vignette, splatter, engrave, parallel, family, layer, maskImage, maskMinus, shadeInto, toCanvasF, plate, cv } from './lib.js';
import { renderMonolith } from './mono3d.js';

const W = 2400,
  H = 1500;
const INK = 'rgba(22,13,9,0.94)';
// las luces: la antorcha del centurión, la del boquete y el candil
const TORCH = [944, 604],
  TORCH2 = [292, 752],
  LAMP = [690, 958];
const WATER = 1069; // el agua, a los pies de la estatua

// ------------------------------------------------------------ el monolito
// (a 10 m, en el agua, vuelto hacia ellos; SX, el centro de su pie. La
// silueta y el tono salen del monolito de verdad: draw() lo monta antes de
// nada; aquí, sólo cómo se dibuja con ellos)
const SX = 1600;
let MONO = null;
// la silueta, del color fill (y su reflejo en el agua: al revés, roto)
function statue(x, fill, img = 'img') {
  if (!MONO) return;
  const c = cv(W, H),
    d = c.getContext('2d');
  d.fillStyle = fill;
  d.fillRect(0, 0, W, H);
  d.globalCompositeOperation = 'destination-in';
  d.drawImage(MONO[img], 0, 0);
  x.drawImage(c, 0, 0);
}
// la mano de oro: una garra alzada, los cuatro dedos doblados hacia dentro
// y el pulgar de lado (en la muñeca del brazo grande: MONO.stump; S, su
// tamaño)
const HANDF = [
  [-0.62, 58],
  [-0.22, 70],
  [0.14, 68],
  [0.5, 56],
];
function goldHand(x, fill) {
  if (!MONO) return;
  const [wx, wy] = MONO.stump;
  const S = 1.5;
  x.save();
  x.translate(wx, wy);
  x.scale(S, S);
  x.translate(-wx, -wy + 10);
  blob(x, [
    [wx - 17, wy + 8],
    [wx - 20, wy - 14],
    [wx - 14, wy - 34],
    [wx + 2, wy - 40],
    [wx + 16, wy - 32],
    [wx + 19, wy - 12],
    [wx + 15, wy + 8],
  ], fill, 0.5);
  for (const [a0, L] of HANDF) {
    const a = -Math.PI / 2 + a0;
    const bx = wx + Math.cos(a) * 26,
      by = wy - 20 + Math.sin(a) * 26;
    const mid = [bx + Math.cos(a) * L * 0.55, by + Math.sin(a) * L * 0.55];
    // (la punta se dobla hacia dentro, como una garra)
    const a2 = a + (a0 < 0 ? 0.55 : -0.55);
    const tip = [mid[0] + Math.cos(a2) * L * 0.45, mid[1] + Math.sin(a2) * L * 0.45];
    capsule(x, [bx, by], mid, 6.5, 5.5, fill);
    capsule(x, mid, tip, 5.5, 4.2, fill);
    const a3 = a2 + (a0 < 0 ? 0.6 : -0.6);
    poly(x, [
      [tip[0] - 4, tip[1]],
      [tip[0] + Math.cos(a3) * 24, tip[1] + Math.sin(a3) * 24],
      [tip[0] + 4, tip[1]],
    ], fill);
  }
  capsule(x, [wx + 14, wy - 6], [wx + 40, wy - 26], 6, 4.6, fill);
  poly(x, [
    [wx + 38, wy - 30],
    [wx + 58, wy - 46],
    [wx + 42, wy - 22],
  ], fill);
  x.restore();
}
function reflection(x, fill) {
  x.save();
  x.translate(0, 2 * WATER + 8);
  x.scale(1, -0.62);
  statue(x, fill);
  x.restore();
}

// ------------------------------------------------------------ la cueva
// el boquete que abrieron en la roca (por donde entra la luz)
const BREACH = (() => {
  const base = [
    [70, 470],
    [140, 418],
    [236, 404],
    [318, 432],
    [384, 500],
    [418, 600],
    [424, 720],
    [404, 860],
    [380, 990],
    [300, 1040],
    [180, 1046],
    [96, 1010],
    [60, 900],
    [50, 740],
    [54, 600],
  ];
  // (el borde de roca rota: dientes)
  const out = [];
  const rr = mulberry(311);
  for (let i = 0; i < base.length; i++) {
    const a = base[i],
      b = base[(i + 1) % base.length];
    for (let k = 0; k < 4; k++) {
      const t = k / 4;
      const px = a[0] + (b[0] - a[0]) * t,
        py = a[1] + (b[1] - a[1]) * t;
      const cx = 236,
        cy = 730;
      const d = Math.hypot(px - cx, py - cy) || 1;
      const j = (rr() - 0.5) * 34 + (k % 2 ? 10 : -6);
      out.push([px + ((px - cx) / d) * j, py + ((py - cy) / d) * j]);
    }
  }
  return out;
})();
// la roca: el techo con sus colmillos, la pared de la izquierda alrededor
// del boquete, la de la derecha y el fondo
function rocks(x, fill) {
  // el techo
  blob(x, [
    [-40, -40],
    [2440, -40],
    [2440, 210],
    [2200, 180],
    [1980, 150],
    [1820, 90],
    [1700, 40],
    [1500, 30],
    [1300, 70],
    [1120, 120],
    [900, 150],
    [700, 190],
    [480, 240],
    [300, 300],
    [120, 340],
    [-40, 360],
  ], fill, 0.4);
  // la pared de la izquierda (con el boquete recortado luego)
  blob(x, [
    [-40, 300],
    [160, 330],
    [420, 360],
    [560, 470],
    [600, 640],
    [560, 820],
    [520, 1000],
    [470, 1120],
    [360, 1190],
    [-40, 1230],
  ], fill, 0.4);
  // la de la derecha
  blob(x, [
    [2440, 160],
    [2240, 200],
    [2120, 320],
    [2060, 520],
    [2080, 700],
    [2050, 880],
    [2110, 1000],
    [2250, 1060],
    [2440, 1080],
  ], fill, 0.4);
}
// el fondo de la cueva, detrás del agua (más lejos: la niebla lo aclara)
const BACK = [
  [470, 360],
  [700, 250],
  [1000, 190],
  [1300, 150],
  [1700, 120],
  [2000, 170],
  [2120, 330],
  [2100, 600],
  [2080, 940],
  [1700, 960],
  [1300, 952],
  [900, 946],
  [560, 940],
];
function stalactites(x, fill) {
  for (const [cx, top, len, w] of STALACT) {
    blob(x, [
      [cx - w, top - 20],
      [cx + w, top - 20],
      [cx + w * 0.55, top + len * 0.5],
      [cx + 2, top + len],
      [cx - 2, top + len],
      [cx - w * 0.6, top + len * 0.45],
    ], fill, 0.4);
  }
}
const STALACT = [
  [520, 230, 120, 22],
  [610, 210, 70, 14],
  [760, 180, 170, 26],
  [880, 160, 90, 16],
  [1010, 130, 140, 20],
  [1150, 110, 80, 14],
  [1260, 80, 200, 28],
  [1400, 50, 60, 12],
  [1840, 100, 120, 20],
  [1940, 140, 190, 26],
  [2040, 170, 90, 16],
  [2160, 190, 150, 22],
  [2290, 200, 80, 14],
];
// la orilla de delante: la peña donde están ellos, que baja hacia el agua
const SHORE = [
  [-40, 1120],
  [200, 1110],
  [420, 1150],
  [620, 1180],
  [820, 1172],
  [960, 1150],
  [1080, 1136],
  [1210, 1150],
  [1330, 1200],
  [1460, 1250],
  [1640, 1290],
  [1860, 1310],
  [2100, 1300],
  [2440, 1270],
  [2440, 1540],
  [-40, 1540],
];
// la peña de las espirales
const BOULDER = [1300, 1168, 92, 58];
function boulder(x, fill) {
  blob(x, [
    [BOULDER[0] - BOULDER[2], BOULDER[1] + 30],
    [BOULDER[0] - BOULDER[2] * 0.9, BOULDER[1] - 20],
    [BOULDER[0] - BOULDER[2] * 0.4, BOULDER[1] - BOULDER[3]],
    [BOULDER[0] + BOULDER[2] * 0.3, BOULDER[1] - BOULDER[3] * 0.95],
    [BOULDER[0] + BOULDER[2] * 0.9, BOULDER[1] - 24],
    [BOULDER[0] + BOULDER[2], BOULDER[1] + 30],
  ], fill, 0.5);
}

// ------------------------------------------------------------ los romanos
// el centurión: de espaldas, la antorcha en alto
function centurion(x, fill) {
  // la capa, el cuerpo, la falda con sus tiras
  blob(x, [
    [790, 806],
    [770, 900],
    [756, 1000],
    [748, 1090],
    [800, 1100],
    [868, 1098],
    [912, 1084],
    [900, 990],
    [890, 900],
    [884, 808],
    [840, 796],
  ], fill, 0.45);
  // las piernas y las grebas
  capsule(x, [818, 1060], [806, 1170], 15, 12, fill);
  capsule(x, [858, 1060], [872, 1168], 15, 12, fill);
  ellipse(x, 800, 1176, 22, 9, fill);
  ellipse(x, 878, 1174, 22, 9, fill);
  // el brazo de la antorcha, alzado
  capsule(x, [878, 822], [916, 748], 15, 12, fill);
  capsule(x, [916, 748], [934, 686], 12, 10, fill);
  ellipse(x, 936, 680, 12, 13, fill);
  // la antorcha
  capsule(x, [930, 714], [946, 622], 6, 7.5, fill);
  // el otro brazo, a la espada
  capsule(x, [794, 822], [776, 900], 15, 12, fill);
  capsule(x, [776, 900], [792, 956], 12, 10, fill);
  // el casco (con su cubrenuca) y la cresta de través: un abanico de crin
  ellipse(x, 836, 774, 24, 26, fill);
  blob(x, [
    [808, 786],
    [806, 804],
    [866, 804],
    [864, 786],
  ], fill, 0.4);
  const crest = [];
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI + (i / 20) * Math.PI;
    const rr = 44 + (i % 2) * 4;
    crest.push([836 + Math.cos(a) * rr, 770 + Math.sin(a) * rr * 0.78]);
  }
  for (let i = 20; i >= 0; i--) {
    const a = Math.PI + (i / 20) * Math.PI;
    crest.push([836 + Math.cos(a) * 26, 770 + Math.sin(a) * 26 * 0.9]);
  }
  poly(x, crest, fill);
}
// el legionario que se mete en el agua, con el escudo y el pilo
function legionary(x, fill) {
  blob(x, [
    [1030, 842],
    [1018, 900],
    [1014, 960],
    [1022, 1010],
    [1078, 1012],
    [1086, 960],
    [1082, 900],
    [1072, 842],
    [1050, 832],
  ], fill, 0.45);
  capsule(x, [1036, 1000], [1022, 1098], 13, 11, fill);
  capsule(x, [1066, 1000], [1086, 1094], 13, 11, fill);
  ellipse(x, 1050, 816, 21, 23, fill);
  // el escudo, curvo, casi de canto
  blob(x, [
    [1068, 864],
    [1100, 856],
    [1132, 866],
    [1140, 960],
    [1130, 1050],
    [1098, 1060],
    [1070, 1052],
    [1078, 960],
  ], fill, 0.35);
  // el brazo del pilo y el pilo, apuntando a la estatua
  capsule(x, [1060, 858], [1104, 880], 12, 10, fill);
  capsule(x, [1018, 912], [1300, 846], 3.2, 3.2, fill);
  poly(x, [
    [1296, 840],
    [1330, 840],
    [1298, 852],
  ], fill);
}
// el sacerdote, con la toga sobre la cabeza, que se tapa la boca
function priest(x, fill) {
  blob(x, [
    [600, 812],
    [576, 830],
    [566, 880],
    [560, 960],
    [552, 1060],
    [546, 1150],
    [560, 1206],
    [640, 1212],
    [692, 1200],
    [684, 1110],
    [672, 1000],
    [664, 900],
    [656, 840],
    [632, 812],
  ], fill, 0.45);
  // la cabeza tapada
  blob(x, [
    [590, 820],
    [588, 790],
    [604, 770],
    [628, 768],
    [646, 788],
    [650, 820],
  ], fill, 0.5);
  // la mano en la boca y el brazo del candil
  capsule(x, [650, 860], [662, 820], 11, 9, fill);
  capsule(x, [660, 880], [690, 946], 11, 8, fill);
  ellipse(x, 694, 962, 15, 7, fill);
}
// el esclavo que abrió el boquete, de rodillas, postrado
function slave(x, fill) {
  // de rodillas, encogido, con las manos en la cara
  blob(x, [
    [372, 1262],
    [380, 1200],
    [394, 1140],
    [416, 1096],
    [452, 1078],
    [486, 1092],
    [498, 1140],
    [500, 1200],
    [520, 1262],
  ], fill, 0.5);
  ellipse(x, 470, 1062, 20, 22, fill);
  capsule(x, [446, 1104], [474, 1072], 10, 8, fill);
  capsule(x, [490, 1108], [482, 1074], 10, 8, fill);
  ellipse(x, 380, 1268, 30, 9, fill);
  ellipse(x, 520, 1268, 24, 8, fill);
}
// el del boquete, con la otra antorcha
function tunnelMan(x, fill) {
  blob(x, [
    [252, 800],
    [236, 860],
    [230, 950],
    [236, 1050],
    [300, 1052],
    [304, 950],
    [296, 860],
    [282, 800],
  ], fill, 0.45);
  ellipse(x, 266, 784, 18, 20, fill);
  capsule(x, [290, 820], [298, 776], 9, 8, fill);
  capsule(x, [292, 790], [296, 744], 4, 5, fill);
}
function romans(x, fill) {
  centurion(x, fill);
  legionary(x, fill);
  priest(x, fill);
  slave(x, fill);
}

// ------------------------------------------------------------ el dibujo
export async function draw(c, o = {}) {
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  const r = mulberry(79),
    N = new Noise(79);
  const tools = { rng: r, noise: N };
  const mk = (fn, fill0 = 0) => {
    const f = new Field(W, H, fill0);
    fn(f.x);
    return f.read();
  };
  const P1 = { ...tools, w: 1.6, jit: 0.7, color: INK };

  // ---------------------------------------------------- el monolito
  // (de verdad: a 10 m, vuelto hacia la antorcha, con el ojo cerrado y la
  // mano de oro; lo de debajo del agua no se ve)
  const ZM = 11.6,
    FM = 1150,
    HCM = 1.7;
  const R = renderMonolith({
    W,
    H,
    F: FM,
    CX: 1200,
    HY: WATER - (FM / ZM) * HCM,
    HC: HCM,
    at: [((SX - 1200) * ZM) / FM, ZM],
    yaw: -0.5,
    open: 0,
    golden: true,
    handK: 0,
    contrast: 2.0,
    lights: [
      { p: [-1.2, 2.8, 7.4], color: 0xffa456, k: 9, decay: 1.25 },
      { p: [-6, 1.6, 6], color: 0xffc080, k: 2.5, decay: 1.2 },
    ],
    hemi: [0x504038, 0x0c0806, 0.1],
  });
  for (let k = 0; k < R.alpha.length; k++) R.alpha[k] *= sstep(WATER + 6, WATER - 2, (k / W) | 0);
  const fromArr = (arr) => {
    const f = new Field(W, H);
    f.d = arr;
    return toCanvasF(f);
  };
  MONO = { stump: R.stump };
  const Mhand = mk((m) => goldHand(m, gray(1)));
  for (let k = 0; k < R.alpha.length; k++) {
    if (R.kind[k] === 3) Mhand.d[k] = Math.max(Mhand.d[k], R.alpha[k]);
    R.alpha[k] = Math.max(R.alpha[k], Mhand.d[k]);
  }
  toCanvasF(Mhand);
  const Ms = fromArr(R.alpha);
  const Msb = maskMinus(Ms, Mhand);
  MONO.img = maskImage(Ms).c;
  const Mref = mk((m) => reflection(m, gray(1)));
  const Mrock = mk((m) => {
    rocks(m, gray(1));
    stalactites(m, gray(1));
    blob(m, BREACH, gray(0), 0.35);
  });
  const Mbreach = mk((m) => blob(m, BREACH, gray(1), 0.35));
  const Mshore = mk((m) => blob(m, SHORE, gray(1), 0.4));
  const Mboul = mk((m) => boulder(m, gray(1)));
  const Mr = mk((m) => romans(m, gray(1)));
  const Mt = mk((m) => tunnelMan(m, gray(1)));
  const Mwater = new Field(W, H);
  Mwater.d = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let xx = 0; xx < W; xx++) {
      const k = y * W + xx;
      Mwater.d[k] = y > 935 && Mshore.d[k] < 0.5 && Mrock.d[k] < 0.5 && Mbreach.d[k] < 0.5 ? 1 : 0;
    }

  // ---------------------------------------------------- el estudio de valores
  const Mback = mk((m) => blob(m, BACK, gray(1), 0.4));
  const T = new Field(W, H, 0.1);
  const t = T.x;
  {
    // el fondo de la cueva: roca lejana, algo más clara cerca de la luz
    blob(t, BACK, gray(0.06), 0.4);
    glow(t, TORCH[0] + 60, TORCH[1], 760, gray(0.34, 0.9), gray(0.06, 0), 0.75);
    glow(t, TORCH[0], TORCH[1], 300, gray(0.85, 0.95), gray(0.4, 0), 1);
    // detrás del monolito, la negrura
    glow(t, SX, 520, 560, gray(0.05, 0.85), gray(0.2, 0), 1.3);
    // la roca de cerca: más oscura, encendida donde le da la antorcha
    rocks(t, gray(0.1));
    stalactites(t, gray(0.12));
    // el boquete, encendido
    blob(t, BREACH, gray(0.82), 0.35);
    glow(t, 220, 760, 330, gray(1, 1), gray(0.85, 0), 1.25);
    // el agua: negra, con los reflejos de las antorchas
    for (const [lx, w0, a] of [
      [TORCH[0], 20, 0.85],
      [TORCH2[0], 12, 0.5],
      [LAMP[0], 8, 0.45],
    ]) {
      const g = t.createLinearGradient(0, 950, 0, 1500);
      g.addColorStop(0, gray(0.85, 0));
      g.addColorStop(0.15, gray(0.85, a));
      g.addColorStop(1, gray(0.85, 0));
      t.fillStyle = g;
      t.fillRect(lx - w0, 950, w0 * 2, 550);
    }
    // la orilla y la peña de las espirales
    blob(t, SHORE, gray(0.2), 0.4);
    boulder(t, gray(0.5));
    reflection(t, gray(0.03, 0.85));
    statue(t, gray(0.04));
    romans(t, gray(0.05));
    tunnelMan(t, gray(0.08));
  }
  T.read();
  // el agua (lo que no es reflejo de luz): negra
  for (let i = 0; i < T.d.length; i++) if (Mwater.d[i] > 0.5) T.d[i] = Math.min(T.d[i], 0.05 + 0.9 * Math.max(0, T.d[i] - 0.4));
  // la roca: la luz de las antorchas, que se apaga con la distancia, y una
  // ondulación grande (los planos de la piedra)
  const rockShade = (px, py, base) => {
    let v = base;
    for (const [L, k, R] of [
      [TORCH, 0.5, 520],
      [TORCH2, 0.42, 360],
    ]) {
      const d = Math.hypot(L[0] - px, L[1] - py);
      v += k * Math.exp(-d / R);
    }
    const u = N.fbm(px * 0.0035, py * 0.0035, 3);
    return clamp(v * (0.75 + 0.5 * u));
  };
  shadeInto(T, Mrock, 4, [0, 0, W, 1240], (px, py, nx, ny, nz) => rockShade(px, py, 0.04) * (0.7 + 0.3 * nz));
  shadeInto(T, Mshore, 4, [0, 1080, W, H], (px, py) => rockShade(px, py, 0.02) * (1.1 - 0.5 * clamp((py - 1150) / 350)));
  shadeInto(T, Mboul, 4, [1180, 1080, 1420, 1220], (px, py, nx, ny, nz) => {
    const lx = TORCH[0] - px,
      ly = TORCH[1] - py,
      d = Math.hypot(lx, ly);
    return clamp(0.12 + 0.8 * Math.max(0, (nx * lx + ny * ly) / d) + 0.25 * nz);
  });
  // el monolito y la mano de oro: el tono que les da la antorcha (las almas,
  // más claras que la piedra)
  for (let k = 0; k < T.d.length; k++) {
    const al = R.alpha[k];
    if (al < 0.01) continue;
    const soul = sstep(0.55, 0.9, R.alb[k]);
    if (Mhand.d[k] > 0.5) continue;
    const v = clamp(0.02 + Math.pow(R.lum[k], 1.1) * (1.1 + 0.6 * soul) + R.glow[k] * 0.5);
    T.d[k] = mix(T.d[k], v, al);
  }
  {
    const [hx, hy] = R.stump;
    shadeInto(T, Mhand, 3, [hx - 160, hy - 200, hx + 160, hy + 60], (px, py, nx, ny, nz) => {
      const lx = TORCH[0] - px,
        ly = TORCH[1] - py,
        d = Math.hypot(lx, ly);
      const dif = Math.max(0, (nx * lx + ny * ly) / d);
      return clamp(0.35 + 0.55 * dif + 0.15 * nz);
    });
  }
  // ellos: el canto encendido por sus antorchas
  shadeInto(T, Mr, 4, [300, 650, 1360, 1290], (px, py, nx, ny, nz) => {
    const lx = TORCH[0] - px,
      ly = TORCH[1] - py,
      d = Math.hypot(lx, ly);
    const rim = Math.pow(1 - nz, 1.3) * Math.max(0, (nx * lx + ny * ly) / d);
    const back = Math.pow(1 - nz, 1.5) * Math.max(0, (nx * (TORCH2[0] - px) + ny * (TORCH2[1] - py)) / Math.hypot(TORCH2[0] - px, TORCH2[1] - py));
    return clamp(0.03 + 0.8 * rim + 0.4 * back);
  });
  if (o.stage === 'tone') {
    toCanvasF(T);
    x.drawImage(T.c, 0, 0);
    return;
  }

  // ---------------------------------------------------- el papel y el lápiz
  paper(x, W, H, N, r, [233, 222, 198]);
  {
    const pc = { ...tools, color: 'rgba(60,52,48,0.24)' };
    pencil(x, [[0, 820], [W, 820]], pc);
    pencil(x, [[SX, 0], [SX, 1100]], pc);
    const circ = [];
    for (let i = 0; i <= 60; i++) circ.push([R.eyeC[0] + Math.cos((i / 60) * Math.PI * 2) * 104, R.eyeC[1] + Math.sin((i / 60) * Math.PI * 2) * 104]);
    pencil(x, circ, pc);
    pencil(x, [TORCH, R.stump], { ...pc, color: 'rgba(60,52,48,0.14)' });
    pencil(x, [TORCH, R.eyeC], { ...pc, color: 'rgba(60,52,48,0.14)' });
  }

  // ---------------------------------------------------- las planchas de color
  // la luz de las antorchas: ocre y naranja
  const WARM = mk((m) => {
    glow(m, TORCH[0], TORCH[1], 1100, gray(1), gray(0, 0), 0.85);
    glow(m, TORCH2[0], TORCH2[1], 640, gray(1), gray(0, 0), 1);
    glow(m, LAMP[0], LAMP[1], 260, gray(0.8), gray(0, 0), 0.8);
    blob(m, BREACH, gray(1), 0.35);
  });
  wash(x, WARM, [226, 138, 62], { ...tools, alpha: 0.72, blur: 18, edge: 0.3, nb: 0.12, ns: 0.0025, streak: [0.0016, 0.02, 0.2] });
  // la sombra de la cueva: un pardo hondo
  const DARK = mk((m) => {
    m.fillStyle = gray(1);
    m.fillRect(0, 0, W, H);
    glow(m, TORCH[0], TORCH[1], 900, gray(0), gray(0, 0), 0.85);
    glow(m, TORCH2[0], TORCH2[1], 520, gray(0), gray(0, 0), 1);
  });
  for (let i = 0; i < DARK.d.length; i++) DARK.d[i] = clamp(DARK.d[i] * (1 - WARM.d[i] * 0.8));
  toCanvasF(DARK);
  wash(x, DARK, [92, 62, 48], { ...tools, alpha: 0.55, blur: 24, edge: 0.4, nb: 0.18, ns: 0.003, streak: [0.02, 0.0016, 0.25] });
  // la tinta de lo más negro (el fondo, el agua, el lado de la estatua que
  // no ve la llama): una aguada que asienta las sombras
  const INKW = new Field(W, H);
  INKW.d = T.d.map((v) => clamp((0.24 - v) / 0.16));
  toCanvasF(INKW);
  wash(x, INKW, [34, 22, 18], { ...tools, alpha: 0.8, blur: 5, edge: 0.3, nb: 0.1, ns: 0.004, streak: [0.03, 0.002, 0.25] });
  // lo rojo: lo que arde dentro del monolito (la grieta, las bocas, la raja
  // del ojo cerrado)
  const RED = fromArr(R.glow.map((g) => sstep(0.08, 0.6, g)));
  wash(x, RED, [196, 30, 18], { ...tools, alpha: 0.8, blur: 6, edge: 0.3, nb: 0.06 });
  // el oro: la mano
  const GOLD = Mhand;
  wash(x, GOLD, [214, 162, 80], { ...tools, alpha: 0.8, blur: 1.5, edge: 0.25, nb: 0.02 });
  if (o.stage === 'wash') return;

  // ---------------------------------------------------- el buril
  const burin = { ...tools, t0: 0.2, max: 2.8, gamma: 0.85 };
  const notFigs = new Field(W, H);
  notFigs.d = Ms.d.map((v, i) => (v > 0.5 || Mr.d[i] > 0.5 || Mt.d[i] > 0.5 ? 0 : 1));
  // la roca: líneas de nivel del ruido (como las curvas de un mapa), y
  // cruzadas en lo más oscuro
  {
    const hf = new Field(W, H);
    hf.d = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) hf.d[y * W + xx] = 0.5 + 0.5 * (N.fbm(xx * 0.004, y * 0.004, 4) + 0.3 * N.fbm(xx * 0.015, y * 0.015, 2));
    const iso = [];
    for (let lv = 0.1; lv < 0.9; lv += 0.018) for (const l of contours(hf, lv, 3)) if (l.length > 6) iso.push(simplify(l, 1.2));
    const rockReg = new Field(W, H);
    rockReg.d = Mrock.d.map((v, i) => (v > 0.5 || Mshore.d[i] > 0.5 || Mboul.d[i] > 0.5) && notFigs.d[i] > 0.5 ? 1 : 0);
    engrave(x, T, iso, { ...burin, region: rockReg, max: 3.6, t0: 0.34, gamma: 0.7 });
    engrave(x, T, parallel(0.7, 5, [0, 0, W, H], { noise: N, wob: 3 }), { ...burin, region: rockReg, max: 3.2, t0: 0.55 });
    // el fondo de la cueva: tendidas, tranquilas (que no le quiten la vista)
    const backReg = new Field(W, H);
    backReg.d = Mback.d.map((v, i) => (v > 0.5 && rockReg.d[i] < 0.5 && Mwater.d[i] < 0.5 && notFigs.d[i] > 0.5 ? 1 : 0));
    engrave(x, T, parallel(0.0, 4.4, [0, 0, W, 1000], { noise: N, wob: 3 }), { ...burin, region: backReg, max: 3.6, t0: 0.12 });
    engrave(x, T, parallel(-0.5, 6, [0, 0, W, 1000], { noise: N, wob: 2 }), { ...burin, region: backReg, max: 2.6, t0: 0.72 });
    // los colmillos: verticales
    for (const [cx, top, len, w] of STALACT) {
      const ls = [];
      for (let xx = cx - w; xx <= cx + w; xx += 3) ls.push([[xx, top - 30], [cx + (xx - cx) * 0.1, top + len]]);
      engrave(x, T, ls, { ...burin, region: Mrock, max: 2.6 });
    }
    // la oscuridad del fondo (lo que no es roca ni agua): tendidas
    const air = new Field(W, H);
    air.d = notFigs.d.map((v, i) => (v > 0.5 && rockReg.d[i] < 0.5 && Mwater.d[i] < 0.5 && Mbreach.d[i] < 0.5 && backReg.d[i] < 0.5 ? 1 : 0));
    engrave(x, T, parallel(0.0, 4.6, [0, 0, W, 1100], { noise: N, wob: 2.5 }), { ...burin, region: air, max: 3.6 });
    engrave(x, T, parallel(0.45, 6, [0, 0, W, 1100], { noise: N, wob: 2 }), { ...burin, region: air, max: 2.6, t0: 0.7 });
    // el agua: tendidas, rotas
    const waterReg = new Field(W, H);
    waterReg.d = Mwater.d.map((v, i) => (v > 0.5 && notFigs.d[i] > 0.5 ? 1 : 0));
    const rows = [];
    for (let y = 922; y < H; y += 3.2 + (y - 920) * 0.008) {
      const l = [];
      for (let xx = -20; xx <= W + 20; xx += 6) l.push([xx, y + N.n2(xx * 0.01, y * 0.05) * 1.6]);
      rows.push(l);
    }
    engrave(x, T, rows, { ...burin, region: waterReg, max: 3.2, t0: 0.15, nAmp: 0.12 });
    // el boquete: rayos de luz que entran
    const rays = [];
    for (let a = -0.5; a <= 0.6; a += 0.012) rays.push([[236, 740], [236 + Math.cos(a) * 1600, 740 + Math.sin(a) * 1600]]);
    const rayReg = new Field(W, H);
    rayReg.d = air.d.map((v, i) => (v > 0.5 ? 1 : 0));
    engrave(x, T, rays, { ...burin, region: rayReg, max: 1.2, t0: 0.55, color: 'rgba(30,18,12,0.5)' });
  }
  // el monolito: de arriba abajo; las almas, por sus curvas de nivel; la
  // mano de oro, sesgadas
  {
    const v = family(220, (u, s) => {
      const px = mix(1340, 1860, u);
      const py = mix(40, 1080, s);
      return [px + Math.sin(py * 0.006 + px * 0.05) * 3 + N.n2(px * 0.01, py * 0.004) * 4, py];
    });
    engrave(x, T, v, { ...burin, region: Msb, max: 2.5, t0: 0.14 });
    const L = fromArr(R.lum.map((q, k) => (R.alpha[k] > 0.5 ? q : 0)));
    const Lb = L.blurred(2.2).read();
    const souls = fromArr(R.alb.map((q, k) => (q > 0.62 && Msb.d[k] > 0.5 ? 1 : 0)));
    const iso = [];
    for (let lv = 0.12; lv < 0.85; lv += 0.12) for (const l of contours(Lb, lv, 2)) if (l.length > 10) iso.push(simplify(l, 0.8));
    engrave(x, T, iso, { ...burin, region: souls, max: 1.6, t0: 0.12 });
    engrave(x, T, parallel(-0.8, 3, [R.stump[0] - 160, R.stump[1] - 220, R.stump[0] + 160, R.stump[1] + 60]), { ...burin, region: Mhand, max: 1.8, t0: 0.4, color: 'rgba(70,40,10,0.8)' });
    // el reflejo: tendidas finas
    engrave(x, T, parallel(0.0, 3.2, [1300, 1060, 1900, 1500], { noise: N, wob: 1.5 }), { ...burin, region: maskMinus(Mref, Mr), max: 3, t0: 0.05 });
  }
  // ellos: paralelas a su contorno, y verticales
  {
    const Bm = Mr.blurred(8).read();
    const iso = [];
    for (let lv = 0.52; lv < 0.99; lv += 0.04) for (const l of contours(Bm, lv, 2)) if (l.length > 6) iso.push(simplify(l, 0.8));
    engrave(x, T, iso, { ...burin, region: Mr, max: 2.8, t0: 0.05 });
    engrave(x, T, parallel(Math.PI / 2 + 0.05, 2.8, [300, 600, 1360, 1300]), { ...burin, region: Mr, max: 2.8, t0: 0.3 });
    engrave(x, T, parallel(Math.PI / 2, 3, [200, 700, 340, 1080]), { ...burin, region: Mt, max: 2.6, t0: 0.2 });
  }

  // ---------------------------------------------------- los contornos
  const outline = (Fm, w, passes, color = INK, lift = 260, min = 6) => {
    for (const l of contours(Fm, 0.5, 2)) {
      if (l.length < min) continue;
      pen(x, simplify(l, 1.0), { ...tools, w, passes, color, lift, jit: 0.9, spread: 2 });
    }
  };
  outline(Mbreach, 2.2, 2, 'rgba(30,14,8,0.9)');
  outline(mk((m) => blob(m, SHORE, gray(1), 0.4)), 2.0, 1, 'rgba(30,14,8,0.85)');
  outline(Mboul, 1.8, 1);
  outline(Ms, 2.2, 2);
  outline(Mr, 1.9, 1);
  outline(Mt, 1.6, 1, 'rgba(30,14,8,0.8)');
  // el canto de ellos que mira a la antorcha, encendido
  for (const l of contours(Mr, 0.5, 2)) {
    if (l.length < 12) continue;
    let run = [];
    const flush = () => {
      if (run.length > 2) pen(x, run, { ...tools, w: 2.2, color: 'rgba(255,190,120,0.85)', jit: 0.5, lift: 90 });
      run = [];
    };
    for (const q of simplify(l, 1.0)) {
      // (lo que queda entre la figura y la llama)
      const dx = TORCH[0] - q[0],
        dy = TORCH[1] - q[1],
        d = Math.hypot(dx, dy) || 1;
      if (Mr.at(q[0] + (dx / d) * 4, q[1] + (dy / d) * 4) < 0.5 && d < 700) run.push([q[0] + (dx / d) * 1.2, q[1] + (dy / d) * 1.2]);
      else flush();
    }
    flush();
  }
  if (o.stage === 'ink') return;

  // ---------------------------------------------------- la plumilla: detalles
  const rImg = maskImage(Mr);
  // la estatua (lo que tapen ellos, no)
  x.drawImage(
    layer(
      W,
      H,
      (d) => {
        // lo más hondo de las almas (las cuencas, las bocas), a plumilla
        const L = fromArr(R.lum.map((q, k) => (R.alpha[k] > 0.5 && R.alb[k] > 0.62 ? q : 1)));
        const Lb = L.blurred(1.6).read();
        for (const lv of [0.12, 0.22])
          for (const l of contours(Lb, lv, 2)) {
            if (l.length < 8 || l.length > 200) continue;
            pen(d, simplify(l, 1.0), { ...P1, w: lv < 0.2 ? 1.4 : 1.0, color: 'rgba(16,6,4,0.9)', lift: 999 });
          }
        // el ojo, cerrado: un hilo rojo entre los párpados
        const [ex, ey] = R.eyeC;
        pen(d, [[ex - 1, ey - 30], [ex + 1, ey], [ex - 1, ey + 30]], { ...P1, w: 2.2, color: 'rgba(200,40,24,0.95)', lift: 999 });
        // la mano de oro: su contorno, los nudillos y los brillos
        for (const l of contours(Mhand, 0.5, 1)) if (l.length > 5) pen(d, simplify(l, 0.6), { ...P1, w: 1.4, lift: 400 });
        {
          const [wx, wy] = R.stump;
          const S = 1.5;
          const at = (px, py) => [wx + (px - wx) * S, wy + (py - wy + 10) * S];
          for (const [a0, L] of HANDF) {
            const a = -Math.PI / 2 + a0;
            const bx = wx + Math.cos(a) * 26,
              by = wy - 20 + Math.sin(a) * 26;
            const k1 = at(bx + Math.cos(a) * L * 0.55, by + Math.sin(a) * L * 0.55);
            ellipse(d, k1[0], k1[1], 3.4, 2.4, 'rgba(90,60,20,0.8)');
            brush(d, [at(bx - 3, by), at(bx - 3 + Math.cos(a) * L * 0.5, by + Math.sin(a) * L * 0.5)], { ...tools, w: 2.2, color: 'rgba(255,240,190,0.85)' });
          }
          brush(d, [at(wx - 12, wy - 4), at(wx - 14, wy - 30)], { ...tools, w: 2.6, color: 'rgba(255,244,200,0.9)' });
        }
      },
      rImg
    ),
    0,
    0
  );
  // el centurión: la cresta (crin), los segmentos de la loriga, las tiras,
  // los pliegues de la capa
  for (let i = 0; i <= 26; i++) {
    const a = Math.PI + (i / 26) * Math.PI;
    const r0 = 36,
      r1 = 50 + (i % 3) * 3;
    pen(x, [[836 + Math.cos(a) * r0, 772 + Math.sin(a) * r0 * 0.9], [836 + Math.cos(a) * r1, 772 + Math.sin(a) * r1 * 0.9]], { ...P1, w: 1.4, color: 'rgba(30,10,6,0.9)', lift: 999 });
  }
  for (const k of [0, 1, 2, 3]) pen(x, [[792, 836 + k * 20], [838, 842 + k * 20], [884, 836 + k * 20]], { ...P1, w: 1.3, color: 'rgba(150,110,80,0.55)' });
  for (let i = 0; i < 9; i++) pen(x, [[786 + i * 13, 1000], [784 + i * 13, 1050]], { ...P1, w: 1.2, color: 'rgba(150,110,80,0.5)' });
  for (const [a, b, c2] of [
    [[800, 820], [784, 950], [768, 1080]],
    [[836, 812], [830, 950], [828, 1092]],
    [[872, 820], [886, 950], [898, 1080]],
  ])
    pen(x, [a, b, c2], { ...P1, w: 1.4, color: 'rgba(150,110,80,0.5)' });
  // el escudo del legionario: el canto, el umbo y los rayos de Júpiter
  pen(x, [[1110, 870], [1124, 960], [1116, 1050]], { ...P1, w: 1.4, color: 'rgba(170,120,80,0.6)' });
  ellipse(x, 1112, 958, 7, 12, 'rgba(160,110,60,0.7)');
  // el candil del sacerdote y su llama; el pico y el cesto del esclavo
  pen(x, [[560, 1300], [470, 1336]], { ...tools, w: 5, color: 'rgba(60,40,26,0.95)', lift: 999 });
  pen(x, [[452, 1320], [470, 1336], [494, 1362]], { ...tools, w: 6, color: 'rgba(80,80,84,0.95)', lift: 999 });
  ellipse(x, 300, 1250, 40, 24, 'rgba(120,90,60,0.8)');
  for (let i = 0; i < 7; i++) pen(x, [[262 + i * 12, 1232], [266 + i * 12, 1272]], { ...P1, w: 1.1, color: 'rgba(40,24,16,0.7)' });
  // las espirales de la peña (las de antes de Roma)
  for (const [cx, cy, R] of [
    [1268, 1150, 22],
    [1324, 1160, 17],
    [1296, 1188, 12],
  ]) {
    const sp = [];
    for (let i = 0; i <= 80; i++) {
      const a = (i / 80) * Math.PI * 6;
      const rr = (R * i) / 80;
      sp.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.7]);
    }
    pen(x, sp, { ...tools, w: 2.2, color: 'rgba(40,22,14,0.85)', lift: 999 });
    pen(x, sp.map(([a, b]) => [a + 1.2, b + 1]), { ...tools, w: 1.0, color: 'rgba(255,220,170,0.6)', lift: 999 });
  }
  // los huesos de la orilla (no son de romanos) y un torques en una calavera
  const skull = (cx, cy, s, rot) => {
    x.save();
    x.translate(cx, cy);
    x.rotate(rot);
    blob(x, [[-12 * s, -2 * s], [-10 * s, -9 * s], [0, -12 * s], [10 * s, -9 * s], [12 * s, -2 * s], [10 * s, 6 * s], [7 * s, 12 * s], [0, 14 * s], [-7 * s, 12 * s], [-10 * s, 6 * s]], 'rgba(196,170,132,0.92)', 0.5);
    for (const sx of [-1, 1]) blob(x, [[sx * 8 * s, 0], [sx * 5 * s, -3 * s], [sx * 1.5 * s, -1 * s], [sx * 2 * s, 3.5 * s], [sx * 6 * s, 4 * s]], 'rgba(20,10,6,0.95)', 0.5);
    poly(x, [[0, 4.5 * s], [-1.6 * s, 8 * s], [1.6 * s, 8 * s]], 'rgba(20,10,6,0.95)');
    x.restore();
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pts.push([cx + Math.cos(a + rot) * 12 * s, cy + Math.sin(a + rot) * 12.5 * s]);
    }
    pen(x, pts, { ...tools, w: 1.3, jit: 0.5, color: INK });
  };
  skull(1190, 1182, 1.0, 0.3);
  skull(1420, 1236, 1.2, -0.4);
  skull(1560, 1262, 0.95, 0.6);
  skull(1720, 1290, 1.35, -0.1);
  {
    const tq = [];
    for (let i = 0; i <= 30; i++) {
      const a = Math.PI * 0.15 + (i / 30) * Math.PI * 1.7;
      tq.push([1720 + Math.cos(a) * 22, 1306 + Math.sin(a) * 7]);
    }
    pen(x, tq, { ...tools, w: 4, color: 'rgba(214,162,80,0.95)', lift: 999 });
    ellipse(x, tq[0][0], tq[0][1], 4, 4, 'rgba(214,162,80,0.95)');
    ellipse(x, tq[30][0], tq[30][1], 4, 4, 'rgba(214,162,80,0.95)');
  }
  for (const [a, b] of [
    [[1250, 1214], [1330, 1222]],
    [[1480, 1252], [1540, 1278]],
    [[1600, 1300], [1690, 1292]],
    [[1820, 1318], [1900, 1300]],
  ]) {
    pen(x, [a, b], { ...tools, w: 6, color: 'rgba(196,170,132,0.92)', lift: 999 });
    pen(x, [a, b], { ...tools, w: 1.1, passes: 2, spread: 6, color: INK, lift: 999 });
  }
  // las ondas alrededor de las piernas del que se mete en el agua
  for (let k = 0; k < 5; k++) {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      pts.push([1054 + Math.cos(a) * (40 + k * 26), 1096 + Math.sin(a) * (7 + k * 4)]);
    }
    pen(x, pts, { ...tools, w: 1.4, color: `rgba(255,214,160,${0.5 - k * 0.08})`, lift: 140 });
  }

  // ---------------------------------------------------- las llamas
  const flame = (cx, cy, s) => {
    blob(x, [[cx - 14 * s, cy + 20 * s], [cx - 16 * s, cy], [cx - 6 * s, cy - 26 * s], [cx + 2 * s, cy - 52 * s], [cx + 10 * s, cy - 20 * s], [cx + 16 * s, cy + 2 * s], [cx + 12 * s, cy + 20 * s]], 'rgba(255,150,60,0.9)', 0.5);
    blob(x, [[cx - 8 * s, cy + 16 * s], [cx - 8 * s, cy], [cx, cy - 26 * s], [cx + 8 * s, cy], [cx + 7 * s, cy + 16 * s]], 'rgba(255,224,150,0.95)', 0.5);
    ellipse(x, cx, cy + 6 * s, 4 * s, 9 * s, 'rgba(255,252,236,1)');
    // el humo
    for (let k = 0; k < 2; k++) {
      const sm = [];
      for (let i = 0; i <= 26; i++) sm.push([cx + Math.sin(i * 0.4 + k * 2) * (4 + i * 1.4) + k * 5, cy - 50 * s - i * 9 * s]);
      pen(x, sm, { ...tools, w: 3 + k * 2, color: 'rgba(60,44,36,0.28)', lift: 999 });
    }
    for (let i = 0; i < 26; i++) ellipse(x, cx + (r() - 0.5) * 70 * s, cy - 40 * s - r() * 140 * s, 1 + r() * 1.6, 1 + r() * 1.6, r() < 0.5 ? 'rgba(255,170,80,0.9)' : 'rgba(255,240,200,0.9)');
  };
  flame(TORCH[0] + 2, TORCH[1] + 4, 1.25);
  flame(TORCH2[0] + 2, TORCH2[1] + 4, 0.85);
  flame(LAMP[0] + 4, LAMP[1] - 8, 0.4);
  // el boquete: el polvo que flota en la luz
  ash(x, [[236, 740], [520, 700], [820, 640]], 160, { ...tools, spread: 120, size: 1.6, light: 'rgba(255,236,200,0.7)', dark: 'rgba(60,40,26,0.5)', lightK: 0.75 });
  vignette(x, W, H, 0.48);
  if (o.stage !== 'raw') plate(c, 'II · LOS QUE LA ENCONTRARON PRIMERO', 'Bracara Augusta. Nadie la talló.');
}
