// Texturas 100% procedurales, dibujadas píxel a píxel en canvas a baja
// resolución (32–128 px) para una estética de consola de 32/128 bits.
import * as THREE from 'three';
import { RNG, fbm2, vnoise2, worley2, hash2, clamp, lerp } from '../core/util.js';

const cache = new Map();
let ANISO = 1;
// filtrado anisótropo para las texturas del mundo (suelos a ras sin ruido)
export function setMaxAnisotropy(n) {
  ANISO = Math.max(1, Math.min(8, n | 0));
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Rellena un canvas llamando fn(x, y, out) por píxel. out = [r,g,b,a] 0..255
function pixels(w, h, fn) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const out = [0, 0, 0, 255];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      out[3] = 255;
      fn(x, y, out);
      const i = (y * w + x) * 4;
      d[i] = clamp(out[0], 0, 255);
      d[i + 1] = clamp(out[1], 0, 255);
      d[i + 2] = clamp(out[2], 0, 255);
      d[i + 3] = clamp(out[3], 0, 255);
    }
  ctx.putImageData(img, 0, 0);
  return c;
}

function toTex(canvas, { repeat = true, srgb = true, smoothMin = true, nearest = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
  // Cerca: píxeles nítidos. Lejos: mipmaps para evitar ruido de aliasing.
  t.minFilter = smoothMin ? THREE.LinearMipmapLinearFilter : THREE.NearestFilter;
  t.generateMipmaps = smoothMin;
  t.anisotropy = smoothMin ? ANISO : 1;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

const set = (o, r, g, b, a = 255) => {
  o[0] = r;
  o[1] = g;
  o[2] = b;
  o[3] = a;
};
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// Filas de bloques repetibles: devuelve para cada píxel {row, id, lx, ly, w, h}
function blockLayout(W, H, rowHeights, minW, maxW, seed, stagger = true) {
  const rng = new RNG(seed);
  const map = new Array(W * H);
  let y0 = 0,
    id = 0;
  rowHeights.forEach((rh, r) => {
    // anchos que suman W
    const widths = [];
    let rest = W;
    while (rest > 0) {
      let w = rng.int(minW, maxW);
      if (rest - w < minW) w = rest;
      widths.push(w);
      rest -= w;
    }
    const off = stagger ? rng.int(0, W - 1) : 0;
    let x0 = 0;
    widths.forEach((w) => {
      const bid = id++;
      for (let yy = 0; yy < rh; yy++)
        for (let xx = 0; xx < w; xx++) {
          const px = (x0 + xx + off) % W;
          const py = y0 + yy;
          if (py < H) map[py * W + px] = { r, id: bid, lx: xx, ly: yy, w, h: rh };
        }
      x0 += w;
    });
    y0 += rh;
  });
  return map;
}

// --- huesos pintados en canvas (los aparejos de los osarios)
const boneCol = (k, tone) => `rgb(${(k[0] * tone) | 0},${(k[1] * tone) | 0},${(k[2] * tone) | 0})`;
const BONE_LO = [112, 100, 76],
  BONE_MID = [156, 144, 112],
  BONE_HI = [198, 186, 152];
// dibuja fn(ox, oy) en las copias que hagan falta para que la textura case
// por los bordes (r: lo que sobresale la pieza de su centro)
function wrapDraw(S, x, y, r, fn) {
  for (const ox of x - r < 0 ? [0, S] : x + r > S ? [0, -S] : [0])
    for (const oy of y - r < 0 ? [0, S] : y + r > S ? [0, -S] : [0]) fn(x + ox, y + oy);
}
// un hueso largo de canto: caña y dos cabezas (de a a b, w de grueso)
function paintBone(g, ax, ay, bx, by, w, tone) {
  const len = Math.hypot(bx - ax, by - ay);
  g.save();
  g.translate(ax, ay);
  g.rotate(Math.atan2(by - ay, bx - ax));
  g.fillStyle = '#0d0a08';
  g.fillRect(0, -w * 0.62, len, w * 1.24);
  for (const x of [0, len]) {
    g.beginPath();
    g.ellipse(x, 0, w * 1.05, w * 1.15, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = boneCol(BONE_MID, tone);
  g.fillRect(0, -w * 0.42, len, w * 0.84);
  for (const x of [0, len])
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(x, s * w * 0.42, w * 0.62, w * 0.58, 0, 0, Math.PI * 2);
      g.fill();
    }
  g.fillStyle = boneCol(BONE_HI, tone);
  g.fillRect(w * 0.5, -w * 0.38, len - w, w * 0.26);
  g.fillStyle = boneCol(BONE_LO, tone);
  g.fillRect(w * 0.5, w * 0.2, len - w, w * 0.22);
  g.restore();
}
// una calavera de frente (s: medio ancho)
function paintSkull(g, x, y, s, tone) {
  g.fillStyle = '#0d0a08';
  g.beginPath();
  g.ellipse(x, y, s * 1.12, s * 1.18, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = boneCol(BONE_MID, tone);
  g.beginPath();
  g.ellipse(x, y - s * 0.12, s, s * 0.92, 0, 0, Math.PI * 2);
  g.fill();
  g.fillRect(x - s * 0.55, y + s * 0.3, s * 1.1, s * 0.62);
  g.fillStyle = boneCol(BONE_HI, tone);
  g.beginPath();
  g.ellipse(x - s * 0.18, y - s * 0.5, s * 0.55, s * 0.32, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#0b0807';
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.ellipse(x + sx * s * 0.4, y + s * 0.08, s * 0.27, s * 0.3, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillRect(x - s * 0.08, y + s * 0.38, s * 0.16, s * 0.22);
  g.fillStyle = '#2a211a';
  for (let k = -2; k <= 2; k++) g.fillRect(x + k * s * 0.2 - 0.5, y + s * 0.7, 1, s * 0.22);
}
// Letrero pintado: letras negras sobre una banda de cal, desconchada y
// ennegrecida por el humo de las velas.
function paintLetrero(text, W = 256, H = 16, seed = 1) {
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  g.fillStyle = '#b9b09a';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#1a1410';
  g.font = `bold ${Math.round(H * 0.7)}px serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, W / 2, H / 2 + 1, W - 8);
  // filetes arriba y abajo
  g.fillRect(2, 1, W - 4, 1);
  g.fillRect(2, H - 2, W - 4, 1);
  const img = g.getImageData(0, 0, W, H);
  const rng = new RNG(seed);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const n = fbm2(x / 9, y / 5, 3, 0, seed + 3);
      // desconchones (se ve la piedra) y humo
      if (n > 0.72) {
        img.data[i] = 92;
        img.data[i + 1] = 86;
        img.data[i + 2] = 76;
      }
      const k = (0.78 + rng.next() * 0.18) * (1 - Math.max(0, n - 0.45) * 0.4);
      img.data[i] *= k;
      img.data[i + 1] *= k;
      img.data[i + 2] *= k;
    }
  g.putImageData(img, 0, 0);
  return c;
}

// Letras arañadas en la piedra (trazos temblones de tres rayas), sobre
// transparente. lines: una o dos líneas en mayúsculas.
const SCRATCH = {
  M: [[0, 1, 0, 0], [0, 0, 0.5, 0.6], [0.5, 0.6, 1, 0], [1, 0, 1, 1]],
  A: [[0, 1, 0.5, 0], [0.5, 0, 1, 1], [0.2, 0.62, 0.8, 0.62]],
  S: [[1, 0.05, 0.1, 0.1], [0.1, 0.1, 0.05, 0.45], [0.05, 0.45, 0.95, 0.55], [0.95, 0.55, 0.9, 0.95], [0.9, 0.95, 0, 0.95]],
  B: [[0, 0, 0, 1], [0, 0, 0.8, 0.12], [0.8, 0.12, 0.75, 0.45], [0.75, 0.45, 0, 0.5], [0, 0.5, 0.95, 0.62], [0.95, 0.62, 0.85, 0.98], [0.85, 0.98, 0, 1]],
  J: [[0.9, 0, 0.9, 0.8], [0.9, 0.8, 0.5, 1], [0.5, 1, 0.05, 0.8]],
  O: [[0.5, 0, 0.05, 0.3], [0.05, 0.3, 0.1, 0.75], [0.1, 0.75, 0.5, 1], [0.5, 1, 0.95, 0.7], [0.95, 0.7, 0.9, 0.25], [0.9, 0.25, 0.5, 0]],
  L: [[0, 0, 0.05, 1], [0.05, 1, 0.9, 0.95]],
  C: [[0.95, 0.12, 0.5, 0], [0.5, 0, 0.05, 0.3], [0.05, 0.3, 0.1, 0.75], [0.1, 0.75, 0.5, 1], [0.5, 1, 0.95, 0.85]],
  P: [[0, 1, 0, 0], [0, 0, 0.8, 0.1], [0.8, 0.1, 0.85, 0.42], [0.85, 0.42, 0, 0.52]],
  N: [[0, 1, 0, 0], [0, 0, 1, 1], [1, 1, 1, 0]],
  E: [[0.9, 0, 0, 0.02], [0, 0.02, 0.05, 1], [0.05, 1, 0.9, 0.98], [0.02, 0.5, 0.7, 0.48]],
  R: [[0, 1, 0, 0], [0, 0, 0.8, 0.1], [0.8, 0.1, 0.85, 0.42], [0.85, 0.42, 0, 0.52], [0.3, 0.52, 0.95, 1]],
  I: [[0.5, 0, 0.5, 1]],
};
SCRATCH['Á'] = [...SCRATCH.A, [0.4, -0.22, 0.68, -0.4]];
SCRATCH['Í'] = [...SCRATCH.I, [0.4, -0.22, 0.68, -0.4]];
function scratchText(lines, W, H, seed) {
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const rng = new RNG(seed);
  const ch = H * 0.31,
    lh = H / lines.length;
  lines.forEach((text, li) => {
    const n = text.length;
    const cw = Math.min(ch * 0.9, (W - 8) / (n * 1.35)),
      gap = cw * 0.35;
    let x = (W - (n * cw + (n - 1) * gap)) / 2;
    const y0 = li * lh + (lh - ch) / 2 + 2;
    for (const chr of text) {
      for (const [a, b, cc, d] of SCRATCH[chr] || [])
        for (let k = 0; k < 3; k++) {
          const j = () => rng.range(-0.8, 0.8);
          g.strokeStyle = k === 1 ? 'rgba(206,196,176,1)' : 'rgba(150,142,128,1)';
          g.lineWidth = k === 1 ? 1.6 : 1;
          g.beginPath();
          g.moveTo(x + a * cw + j() + k * 0.7, y0 + b * ch + j());
          g.lineTo(x + cc * cw + j() + k * 0.7, y0 + d * ch + j());
          g.stroke();
        }
      x += cw + gap;
    }
  });
  return c;
}

// Letras talladas en la piedra (toscas, en dos renglones): el surco oscuro y
// el canto de abajo, claro.
function paintCarved(lines, W, H, seed) {
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const n = fbm2(x / 7, y / 7, 3, 0, seed);
      const k = 128 + n * 46;
      img.data[i] = k * 1.02;
      img.data[i + 1] = k * 0.97;
      img.data[i + 2] = k * 0.88;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  g.font = `bold ${Math.round((H / lines.length) * 0.62)}px serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  lines.forEach((t, k) => {
    const y = ((k + 0.5) * H) / lines.length;
    g.fillStyle = 'rgba(220,210,190,0.9)';
    g.fillText(t, W / 2 + 0.6, y + 1.2, W - 10);
    g.fillStyle = '#2a221c';
    g.fillText(t, W / 2, y, W - 10);
  });
  grain(g, W, 0.88, 0.18, seed + 1);
  return c;
}

// grano en todo el canvas
function grain(g, S, a = 0.85, b = 0.25, seed = 1) {
  const img = g.getImageData(0, 0, S, g.canvas.height);
  const rng = new RNG(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const k = a + rng.next() * b;
    img.data[i] *= k;
    img.data[i + 1] *= k;
    img.data[i + 2] *= k;
  }
  g.putImageData(img, 0, 0);
}

// -------------------------------------------------------------- superficies
const GEN = {
  cobble() {
    const S = 64,
      cells = 5;
    const tones = [
      [98, 94, 86],
      [84, 82, 78],
      [106, 97, 84],
      [76, 73, 69],
      [92, 86, 80],
    ];
    return pixels(S, S, (x, y, o) => {
      const [f1, f2, id] = worley2((x / S) * cells, (y / S) * cells, cells, 3, 0.8);
      const n = fbm2(x / 6, y / 6, 3, S / 6, 5);
      const edge = f2 - f1;
      if (edge < 0.09) {
        const k = 26 + n * 18;
        set(o, k + 4, k + 2, k - 2);
      } else {
        const t = tones[id % tones.length];
        const dome = 1.08 - f1 * 0.62;
        const k = dome * (0.82 + n * 0.36);
        const hi = edge < 0.14 ? 0.86 : 1;
        set(o, t[0] * k * hi, t[1] * k * hi, t[2] * k * hi);
        if (hash2(x, y, 9) > 0.965) set(o, o[0] * 0.7, o[1] * 0.7, o[2] * 0.7);
      }
    });
  },

  flag() {
    const S = 64;
    const map = blockLayout(S, S, [16, 16, 16, 16], 14, 28, 11);
    const rng = new RNG(4);
    const cracks = new Set();
    for (let c = 0; c < 7; c++) {
      let x = rng.int(0, S - 1),
        y = rng.int(0, S - 1);
      for (let s = 0; s < 14; s++) {
        cracks.add(((y + S) % S) * S + ((x + S) % S));
        x += rng.int(-1, 1);
        y += rng.chance(0.6) ? 1 : 0;
        x += rng.chance(0.5) ? 1 : 0;
      }
    }
    return pixels(S, S, (x, y, o) => {
      const b = map[y * S + x];
      const n = fbm2(x / 5, y / 5, 3, S / 5, 21);
      if (b.lx === 0 || b.ly === 0) {
        set(o, 30, 28, 25);
        return;
      }
      const tone = 0.78 + hash2(b.id, 3, 5) * 0.3;
      let k = tone * (0.84 + n * 0.3);
      if (b.ly === 1 || b.lx === 1) k *= 1.1;
      if (b.ly === b.h - 1 || b.lx === b.w - 1) k *= 0.8;
      if (cracks.has(y * S + x)) k *= 0.55;
      set(o, 104 * k, 100 * k, 92 * k);
      if (hash2(x, y, 31) > 0.975) set(o, o[0] * 1.2, o[1] * 1.2, o[2] * 1.2);
    });
  },

  wallstone() {
    const S = 64;
    const map = blockLayout(S, S, [9, 11, 8, 12, 10, 14], 9, 22, 7);
    return pixels(S, S, (x, y, o) => {
      const b = map[y * S + x];
      const n = fbm2(x / 4, y / 4, 3, S / 4, 13);
      if (b.lx === 0 || b.ly === 0) {
        const k = 58 + n * 20;
        set(o, k, k - 2, k - 6);
        return;
      }
      const hv = hash2(b.id, 1, 77);
      const base = mix3([96, 92, 84], [112, 102, 88], hv);
      let k = 0.8 + n * 0.34;
      if (b.ly === 1 || b.lx === 1) k *= 1.14;
      if (b.ly === b.h - 1 || b.lx === b.w - 1) k *= 0.74;
      const sp = hash2(x, y, 3);
      if (sp > 0.93) k *= 0.62;
      else if (sp < 0.04) k *= 1.25;
      set(o, base[0] * k, base[1] * k, base[2] * k);
    });
  },

  // Granito labrado de la catedral, con vetas de lluvia verticales.
  ashlar() {
    const S = 64;
    return pixels(S, S, (x, y, o) => {
      const row = Math.floor(y / 16);
      const xo = (x + (row % 2) * 16) % S;
      const lx = xo % 32,
        ly = y % 16;
      const id = row * 4 + Math.floor(xo / 32);
      const n = fbm2(x / 5, y / 5, 3, S / 5, 41);
      const streak = fbm2(x / 3, y / 40, 2, 0, 42);
      if (lx === 0 || ly === 0) {
        set(o, 60, 58, 54);
        return;
      }
      const tone = 0.86 + hash2(id, 2, 8) * 0.22;
      let k = tone * (0.86 + n * 0.22) * (0.8 + streak * 0.3);
      if (ly === 1 || lx === 1) k *= 1.1;
      if (ly === 15 || lx === 31) k *= 0.78;
      const sp = hash2(x, y, 5);
      if (sp > 0.9) k *= 0.55;
      else if (sp < 0.06) k *= 1.22;
      set(o, 146 * k, 140 * k, 128 * k);
    });
  },

  plaster() {
    const S = 64;
    const map = blockLayout(S, S, [8, 8, 8, 8, 8, 8, 8, 8], 10, 16, 99);
    const rng = new RNG(12);
    const cracks = new Set();
    for (let c = 0; c < 4; c++) {
      let x = rng.int(0, S),
        y = rng.int(0, S);
      for (let s = 0; s < 22; s++) {
        cracks.add(((y + S) % S) * S + ((x + S) % S));
        y += 1;
        x += rng.int(-1, 1);
      }
    }
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 10, y / 10, 4, S / 10, 17);
      const stain = fbm2(x / 16, y / 7, 3, 0, 3);
      const peel = fbm2(x / 14 + 3, y / 14, 4, S / 14, 23);
      if (peel > 0.69) {
        // enfoscado caído: piedra/ladrillo debajo
        const b = map[y * S + x];
        if (b.lx === 0 || b.ly === 0) set(o, 78, 70, 60);
        else {
          const k = 0.85 + hash2(b.id, 0, 1) * 0.25;
          set(o, 126 * k, 104 * k, 82 * k);
        }
        if (peel < 0.705) set(o, 110, 100, 86);
        return;
      }
      let k = 0.8 + n * 0.3;
      k *= 1 - Math.max(0, stain - 0.55) * 1.2;
      if (cracks.has(y * S + x)) k *= 0.6;
      if (hash2(x, y, 44) > 0.97) k *= 0.85;
      set(o, 176 * k, 162 * k, 136 * k);
    });
  },

  timber() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const g = fbm2(x / 2, y / 18, 3, 0, 5);
      const k = 0.7 + 0.3 * Math.sin(x * 1.7 + g * 9) * 0.5 + g * 0.3;
      set(o, 62 * k, 43 * k, 28 * k);
    });
  },

  planks() {
    const S = 64,
      PW = 8;
    return pixels(S, S, (x, y, o) => {
      const p = Math.floor(x / PW),
        lx = x % PW;
      const tone = 0.8 + hash2(p, 0, 3) * 0.35;
      const g = fbm2(x / 1.5, y / 16, 3, 0, p * 3);
      let k = tone * (0.72 + g * 0.45);
      if (lx === 0) k *= 0.35;
      else if (lx === 1) k *= 1.1;
      else if (lx === PW - 1) k *= 0.75;
      const endY = Math.floor(hash2(p, 5, 1) * S);
      if (y === endY) k *= 0.4;
      if ((y === 6 || y === 57) && (lx === 3 || lx === 4)) {
        set(o, 40, 38, 36);
        if (lx === 3) set(o, 90, 86, 80);
        return;
      }
      set(o, 104 * k, 74 * k, 48 * k);
    });
  },

  wooddark() {
    const S = 64;
    return pixels(S, S, (x, y, o) => {
      const g = fbm2(x / 32, y / 1.6, 3, 2, 8);
      const k = 0.65 + g * 0.55 + Math.sin(y * 0.9 + g * 12) * 0.08;
      set(o, 58 * k, 40 * k, 28 * k);
    });
  },

  // Tejas árabes portuguesas (telha de canudo) con musgo y hollín.
  roof() {
    const S = 64,
      TW = 8,
      TH = 11;
    return pixels(S, S, (x, y, o) => {
      const col = Math.floor(x / TW);
      const lx = (x % TW) + 0.5;
      const yo = (y + (col % 2) * 5) % S;
      const row = Math.floor(yo / TH),
        ly = yo % TH;
      const concave = col % 2 === 0;
      const c = Math.cos(((lx - TW / 2) / (TW / 2)) * (Math.PI / 2));
      let shade = concave ? 0.7 + 0.25 * (1 - c) : 0.62 + 0.45 * c;
      if (ly >= TH - 2) shade *= 0.55;
      if (ly === 0) shade *= 1.15;
      const tone = 0.8 + hash2(col, row, 6) * 0.35;
      const moss = fbm2(x / 12, y / 12, 4, S / 12, 61);
      const soot = fbm2(x / 20 + 9, y / 20, 3, S / 20, 62);
      let base = [150, 74, 50];
      if (moss > 0.6) base = mix3(base, [50, 58, 36], (moss - 0.6) * 3);
      if (soot > 0.58) base = mix3(base, [30, 26, 24], Math.min(1, (soot - 0.58) * 3));
      const k = shade * tone;
      set(o, base[0] * k, base[1] * k, base[2] * k);
    });
  },

  dirt() {
    const S = 64;
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 8, y / 8, 4, S / 8, 71);
      const [f1] = worley2((x / S) * 9, (y / S) * 9, 9, 72, 0.9);
      const wet = fbm2(x / 16, y / 16, 3, S / 16, 73);
      let base = mix3([62, 52, 42], [88, 74, 58], n);
      if (f1 < 0.2) base = mix3(base, [120, 114, 104], 0.6 * (1 - f1 / 0.2));
      if (wet > 0.62) base = mix3(base, [34, 30, 28], Math.min(1, (wet - 0.62) * 4));
      const sp = hash2(x, y, 2);
      const k = sp > 0.95 ? 0.7 : 1;
      set(o, base[0] * k, base[1] * k, base[2] * k);
    });
  },

  iron() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 4, y / 4, 3, S / 4, 81);
      const rust = fbm2(x / 6 + 4, y / 6, 4, S / 6, 82);
      let c = mix3([52, 52, 56], [70, 70, 74], n);
      if (rust > 0.52) c = mix3(c, [112, 58, 30], Math.min(1, (rust - 0.52) * 3));
      const lx = x % 16,
        ly = y % 16;
      if ((lx === 3 || lx === 12) && (ly === 3 || ly === 12)) c = [110, 104, 96];
      if ((lx === 4 || lx === 13) && (ly === 4 || ly === 13)) c = [26, 24, 22];
      set(o, c[0], c[1], c[2]);
    });
  },

  bronze() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 4, y / 4, 3, S / 4, 91);
      const v = fbm2(x / 7 + 2, y / 7, 4, S / 7, 92);
      let c = mix3([118, 86, 42], [160, 120, 60], n);
      if (v > 0.55) c = mix3(c, [70, 118, 98], Math.min(1, (v - 0.55) * 3.2));
      set(o, c[0], c[1], c[2]);
    });
  },

  // Bronce viejo de campana: pátina verde en manchas y en chorretones (en
  // una campana torneada la 'v' sigue el perfil: chorrean de la corona al
  // borde), mugre y algún brillo de metal gastado.
  bronzeAged() {
    const S = 64;
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 8, y / 8, 4, S / 8, 301);
      const f = fbm2(x / 2, y / 2, 2, S / 2, 302);
      const st = fbm2(x / 4, 3.7, 3, S / 4, 303) * (0.55 + 0.6 * fbm2(x / 8, y / 8, 2, S / 8, 304));
      const pat = fbm2(x / 16, y / 16, 4, S / 16, 305);
      let c = mix3([116, 84, 44], [164, 120, 62], n);
      const g = Math.max(0, pat - 0.5) * 2.6 + Math.max(0, st - 0.5) * 2.2;
      if (g > 0) c = mix3(c, mix3([58, 112, 92], [104, 156, 126], f), Math.min(1, g));
      if (n < 0.32) c = mix3(c, [44, 34, 24], (0.32 - n) * 2);
      if (f > 0.76 && g < 0.3) c = mix3(c, [205, 165, 98], Math.min(1, (f - 0.76) * 3));
      set(o, c[0], c[1], c[2]);
    });
  },

  // Cuerda de cáñamo: cabos retorcidos en diagonal.
  rope() {
    const S = 16;
    return pixels(S, S, (x, y, o) => {
      const u = ((x + y) % 8) / 8;
      const k = 0.6 + 0.4 * Math.sin(u * Math.PI);
      const n = fbm2(x / 4, y / 4, 2, S / 4, 311);
      const c = mix3([92, 72, 44], [150, 124, 80], n);
      set(o, c[0] * k, c[1] * k, c[2] * k);
    });
  },

  // Mortaja: lino blanco con pliegues, tierra y sangre vieja.
  shroud() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const fold = 0.8 + 0.2 * Math.sin((x / S) * Math.PI * 6 + fbm2(x / 8, y / 8, 2, S / 8, 321) * 3);
      const n = fbm2(x / 4, y / 4, 3, S / 4, 322);
      const dirt = fbm2(x / 8, y / 8, 3, S / 8, 323);
      let c = mix3([186, 188, 194], [224, 224, 228], n).map((v) => v * fold);
      if (dirt > 0.62) c = mix3(c, [118, 110, 98], Math.min(1, (dirt - 0.62) * 2.5));
      const w = (x + y) % 2 === 0 ? 1 : 0.94;
      set(o, c[0] * w, c[1] * w, c[2] * w);
    });
  },

  // Encaje: calado de rombos.
  lace() {
    const S = 16;
    return pixels(S, S, (x, y, o) => {
      const u = Math.abs(((x + y) % 8) - 4),
        v = Math.abs(((x - y + 16) % 8) - 4);
      const c = u + v < 3 ? [62, 64, 74] : [232, 232, 236];
      set(o, c[0], c[1], c[2]);
    });
  },

  // Piel de muerta: blanca, cerúlea, con venas azuladas.
  skinPale() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 4, y / 4, 3, S / 4, 331);
      const v = 1 - Math.abs(fbm2(x / 6, y / 6, 3, S / 6, 332) * 2 - 1);
      let c = mix3([166, 170, 176], [198, 200, 204], n);
      if (v > 0.88) c = mix3(c, [94, 106, 140], (v - 0.88) * 6);
      set(o, c[0], c[1], c[2]);
    });
  },

  chainmail() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const row = Math.floor(y / 3);
      const xo = x + (row % 2) * 2;
      const cx = (xo % 4) - 1.5,
        cy = (y % 3) - 1;
      const d = Math.hypot(cx, cy * 1.2);
      const n = fbm2(x / 5, y / 5, 2, S / 5, 3);
      let k = d > 0.8 && d < 1.9 ? 1 : 0.28;
      if (cy < 0 && k === 1) k = 1.25;
      k *= 0.8 + n * 0.3;
      set(o, 118 * k, 118 * k, 122 * k);
    });
  },

  plate() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const b = fbm2(x / 1.2, y / 24, 2, 0, 5);
      const dent = fbm2(x / 5, y / 5, 3, S / 5, 6);
      const rust = fbm2(x / 8, y / 8, 3, S / 8, 7);
      let c = mix3([84, 86, 92], [124, 126, 132], b);
      c = mix3(c, [40, 40, 44], Math.max(0, dent - 0.6) * 2);
      if (rust > 0.62) c = mix3(c, [100, 50, 28], Math.min(1, (rust - 0.62) * 3));
      set(o, c[0], c[1], c[2]);
    });
  },

  // Placa vieja: acero ennegrecido con vetas de forja, abolladuras, óxido,
  // sangre seca en las juntas y arañazos que brillan.
  plateRust() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const b = fbm2(x / 1.3, y / 20, 2, 0, 205);
      const dent = fbm2(x / 5, y / 5, 3, S / 5, 206);
      const rust = fbm2(x / 7, y / 7, 4, S / 7, 207);
      const grime = fbm2(x / 4 + 9, y / 4, 3, S / 4, 208);
      let c = mix3([62, 62, 66], [104, 104, 108], b);
      c = mix3(c, [24, 24, 26], Math.max(0, dent - 0.56) * 2.2);
      if (rust > 0.5) c = mix3(c, [104, 50, 26], Math.min(1, (rust - 0.5) * 2.4));
      if (grime > 0.66) c = mix3(c, [46, 10, 10], Math.min(1, (grime - 0.66) * 3));
      if (hash2(x, y >> 2, 209) > 0.965) c = mix3(c, [164, 162, 160], 0.55);
      set(o, c[0], c[1], c[2]);
    });
  },
  // Malla vieja: anillas oscuras, con óxido y costras.
  mailRust() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const row = Math.floor(y / 3);
      const xo = x + (row % 2) * 2;
      const cx = (xo % 4) - 1.5,
        cy = (y % 3) - 1;
      const d = Math.hypot(cx, cy * 1.2);
      const n = fbm2(x / 5, y / 5, 2, S / 5, 211);
      const rust = fbm2(x / 6, y / 6, 3, S / 6, 212);
      let k = d > 0.8 && d < 1.9 ? 1 : 0.22;
      if (cy < 0 && k === 1) k = 1.22;
      k *= 0.75 + n * 0.3;
      let c = [84 * k, 82 * k, 84 * k];
      if (rust > 0.55) c = mix3(c, [88 * k, 42 * k, 22 * k], Math.min(1, (rust - 0.55) * 3));
      set(o, c[0], c[1], c[2]);
    });
  },

  leather() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 3, y / 3, 3, S / 3, 15);
      let c = mix3([58, 38, 24], [88, 60, 38], n);
      if (x % 16 === 2 && y % 3 === 0) c = [140, 120, 90];
      set(o, c[0], c[1], c[2]);
    });
  },

  burlap() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const w = (x + y) % 2 === 0 ? 1 : 0.84;
      const n = fbm2(x / 4, y / 4, 3, S / 4, 16);
      const blood = fbm2(x / 7, y / 7, 3, S / 7, 18);
      let c = mix3([92, 78, 56], [120, 102, 74], n);
      if (blood > 0.6) c = mix3(c, [70, 14, 12], Math.min(1, (blood - 0.6) * 3));
      set(o, c[0] * w, c[1] * w, c[2] * w);
    });
  },

  clothRed() {
    return clothGen([96, 20, 22], 19);
  },
  clothDark() {
    return clothGen([34, 32, 34], 20);
  },
  clothBlue() {
    return clothGen([36, 44, 64], 21);
  },
  clothWhite() {
    return clothGen([150, 144, 130], 22);
  },

  skin() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 4, y / 4, 3, S / 4, 31);
      const v = 1 - Math.abs(fbm2(x / 6, y / 6, 3, S / 6, 32) * 2 - 1);
      let c = mix3([150, 128, 112], [176, 152, 132], n);
      if (v > 0.9) c = mix3(c, [96, 80, 110], (v - 0.9) * 8);
      set(o, c[0], c[1], c[2]);
    });
  },

  // Piel corrupta: gris cerúleo con venas negras y llagas.
  skinCorrupt() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 4, y / 4, 3, S / 4, 33);
      const v = 1 - Math.abs(fbm2(x / 5, y / 5, 4, S / 5, 34) * 2 - 1);
      const sore = fbm2(x / 4 + 7, y / 4, 3, S / 4, 35);
      let c = mix3([104, 106, 92], [138, 134, 116], n);
      if (v > 0.86) c = mix3(c, [28, 22, 30], Math.min(1, (v - 0.86) * 7));
      if (sore > 0.66) c = mix3(c, [110, 20, 22], Math.min(1, (sore - 0.66) * 4));
      set(o, c[0], c[1], c[2]);
    });
  },

  // Cuero de la Bestia: piel morada y negruzca, tirante, con venas y llagas.
  hide() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 4, y / 4, 3, S / 4, 61);
      const v = 1 - Math.abs(fbm2(x / 5, y / 5, 4, S / 5, 62) * 2 - 1);
      const sore = fbm2(x / 4 + 3, y / 4, 3, S / 4, 63);
      let c = mix3([54, 34, 38], [88, 56, 54], n);
      if (v > 0.84) c = mix3(c, [16, 8, 12], Math.min(1, (v - 0.84) * 7));
      if (sore > 0.64) c = mix3(c, [146, 30, 26], Math.min(1, (sore - 0.64) * 4));
      set(o, c[0], c[1], c[2]);
    });
  },

  flesh() {
    return fleshGen(false);
  },
  // ------------------------------------------------------------ colosos
  // Piel de cadáver para superficies enormes: ocre pálido con manchas
  // grandes y suaves, lividez amoratada, poros, venas finas y escasas y
  // alguna llaga. Menos contraste que la piel de las criaturas (a 3 m por
  // repetición, un moteado fuerte se vuelve ruido).
  colSkin() {
    const S = 64;
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 8, y / 8, 4, 8, 401);
      const lv = fbm2(x / 16, y / 16, 3, 4, 402);
      const m = fbm2(x / 2, y / 2, 2, 32, 403);
      const v = 1 - Math.abs(fbm2(x / 8, y / 8, 4, 8, 404) * 2 - 1);
      const [f1, , id] = worley2((x / S) * 4, (y / S) * 4, 4, 405, 0.9);
      let c = mix3([128, 118, 100], [166, 156, 134], n);
      if (lv > 0.56) c = mix3(c, [108, 90, 108], Math.min(0.8, (lv - 0.56) * 3));
      c = c.map((q) => q * (0.94 + m * 0.12));
      if (v > 0.93) c = mix3(c, [70, 54, 74], Math.min(0.75, (v - 0.93) * 10));
      if (hash2(id, 3, 406) > 0.86 && f1 < 0.14) {
        const k = 1 - f1 / 0.14;
        c = mix3(c, k > 0.55 ? [126, 28, 26] : [84, 40, 42], Math.min(1, k * 1.6));
      }
      set(o, c[0], c[1], c[2]);
    });
  },
  // carne de coloso: las mismas fibras con menos pústulas (y su brillo)
  colFleshTex() {
    return fleshGen(false, 0.88);
  },
  colFleshEmit() {
    return fleshGen(true, 0.88);
  },
  // Tordo rodado: pelo gris claro con rodelas (círculos claros en una red
  // más oscura), el pelo peinado en una dirección y mugre.
  tordo() {
    const S = 64;
    return pixels(S, S, (x, y, o) => {
      const [f1] = worley2((x / S) * 8, (y / S) * 8, 8, 411, 0.8);
      const n = fbm2(x / 8, y / 8, 3, 8, 412);
      const dirt = fbm2(x / 16, y / 16, 3, 4, 413);
      const bl = fbm2(x / 8 + 5, y / 8, 3, 8, 415);
      const hair = 0.92 + hash2(x, Math.floor(y / 4), 414) * 0.14;
      // rodelas: círculos claros en una red gris más oscura (menos contraste)
      let c = mix3([124, 122, 116], [88, 86, 84], Math.min(1, Math.max(0, (f1 - 0.18) * 2.2)));
      c = mix3(c, [150, 148, 140], Math.max(0, n - 0.62) * 1.4);
      if (dirt > 0.52) c = mix3(c, [70, 62, 54], Math.min(0.8, (dirt - 0.52) * 2.4));
      if (bl > 0.66) c = mix3(c, [86, 28, 26], Math.min(0.8, (bl - 0.66) * 3));
      set(o, c[0] * hair, c[1] * hair, c[2] * hair);
    });
  },
  // Crin y cola: mechones largos, negros y apelmazados.
  mane() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const st = fbm2(x / 1, y / 16, 2, 0, 421);
      const k = 0.55 + st * 0.7;
      set(o, 34 * k, 30 * k, 30 * k);
    });
  },
  // Lino de una sobrepelliz: blanco gastado, con la trama, los pliegues y la
  // mugre de días bajo tierra.
  linen() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const w = (x + y) % 2 === 0 ? 1 : 0.94;
      const fold = 0.88 + 0.12 * Math.sin((x / S) * Math.PI * 8 + fbm2(x / 8, y / 8, 2, S / 8, 441) * 2.4);
      const n = fbm2(x / 4, y / 4, 3, S / 4, 442);
      const dirt = fbm2(x / 8, y / 8, 3, S / 8, 443);
      let c = mix3([196, 190, 176], [222, 218, 206], n).map((v) => v * fold * w);
      if (dirt > 0.64) c = mix3(c, [128, 116, 98], Math.min(0.7, (dirt - 0.64) * 2.5));
      set(o, c[0], c[1], c[2]);
    });
  },
  // Canas: mechones grises y blancos.
  hairGrey() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const st = fbm2(x / 1, y / 12, 2, 0, 446);
      const k = 0.6 + st * 0.55;
      set(o, 178 * k, 176 * k, 170 * k);
    });
  },
  // Brocado de oro viejo (las cenefas de la casulla): rombos, mugre y sangre.
  orphrey() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const u = Math.abs(((x + y) % 16) - 8),
        v = Math.abs(((x - y + 32) % 16) - 8);
      const n = fbm2(x / 4, y / 4, 3, 8, 431);
      const dirt = fbm2(x / 8, y / 8, 3, 4, 432);
      let c = u + v < 5 ? [176, 138, 62] : u + v < 7 ? [96, 66, 30] : [140, 104, 46];
      c = c.map((q) => q * (0.8 + n * 0.35));
      if (dirt > 0.6) c = mix3(c, [70, 16, 14], Math.min(0.85, (dirt - 0.6) * 3));
      set(o, c[0], c[1], c[2]);
    });
  },
  clothPurple() {
    return clothGen([60, 30, 72], 441);
  },
  // Sigilo del Pacto grabado en la carne de un coloso: un anillo con marcas,
  // la Y del palio dentro y tres puntos; las líneas son tajos que arden (la
  // misma textura hace de emisión) sobre carne requemada.
  sigil() {
    const S = 64,
      c = S / 2 - 0.5;
    return pixels(S, S, (x, y, o) => {
      const dx = x - c,
        dy = y - c;
      const r = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      const n = fbm2(x / 6, y / 6, 3, 8, 461);
      let line = 0;
      // el anillo doble y sus marcas
      if (Math.abs(r - 27) < 1.6) line = 1;
      if (Math.abs(r - 22.5) < 0.9) line = 0.8;
      if (r > 22.5 && r < 27 && Math.abs(((a / (Math.PI * 2)) * 12 + 12) % 1 - 0.5) < 0.07) line = 0.9;
      // la Y: el palo y los dos brazos
      const dLine = (ax, ay, bx, by) => {
        const vx = bx - ax,
          vy = by - ay;
        const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
        return Math.hypot(x - (ax + vx * t), y - (ay + vy * t));
      };
      const w = Math.min(dLine(c, c + 1, c, c + 17), dLine(c, c + 1, c - 13, c - 13), dLine(c, c + 1, c + 13, c - 13));
      if (w < 1.7) line = 1;
      for (const [px, py] of [
        [c, c - 9],
        [c - 9, c + 8],
        [c + 9, c + 8],
      ])
        if (Math.hypot(x - px, y - py) < 2.2) line = 1;
      if (r > 30.5) line = 0;
      // carne requemada alrededor, más oscura junto a los tajos
      const burn = Math.max(0, 1 - r / 32);
      let col = [70 + n * 40, 22 + n * 14, 18 + n * 10];
      col = col.map((q) => q * (0.55 + 0.45 * (1 - burn * 0.5)));
      if (line > 0) {
        const k = line * (0.8 + n * 0.3);
        col = mix3(col, [255, 196, 96], Math.min(1, k));
      }
      set(o, col[0], col[1], col[2]);
    });
  },
  // Lino del alba de un coloso: marfil sucio con trama, manchas de cera,
  // hollín y sangre vieja (sin pliegues pintados: los pone la malla).
  albTex() {
    const S = 64;
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 8, y / 8, 4, 8, 451);
      const st = fbm2(x / 16, y / 16, 3, 4, 452);
      const bl = fbm2(x / 8 + 9, y / 8, 3, 8, 453);
      const w = (x + y) % 2 === 0 ? 1 : 0.95;
      let c = mix3([176, 168, 150], [206, 198, 178], n);
      if (st > 0.56) c = mix3(c, [150, 128, 96], Math.min(0.7, (st - 0.56) * 2.5));
      if (bl > 0.64) c = mix3(c, [96, 30, 28], Math.min(0.85, (bl - 0.64) * 3.2));
      set(o, c[0] * w, c[1] * w, c[2] * w);
    });
  },
  // Masa de carne: crema rosada y húmeda, con capilares rojos, estrías más
  // claras (la piel que no da más de sí), moratones y poros.
  doughTex() {
    const S = 64;
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 8, y / 8, 4, 8, 471);
      const m = fbm2(x / 16, y / 16, 3, 4, 472);
      const cap = 1 - Math.abs(fbm2(x / 8, y / 8, 4, 8, 473) * 2 - 1);
      const wob = fbm2(x / 16, y / 16, 2, 4, 474) * 6;
      const str = 1 - Math.abs(Math.sin(((y + wob) / S) * Math.PI * 10));
      const br = fbm2(x / 8 + 7, y / 8, 3, 8, 475);
      let c = mix3([184, 140, 124], [220, 184, 160], n);
      c = mix3(c, [162, 112, 104], Math.max(0, m - 0.55) * 1.6);
      if (str > 0.93 && fbm2(x / 4, y / 16, 2, 16, 476) > 0.55) c = mix3(c, [236, 214, 196], 0.55);
      if (cap > 0.9) c = mix3(c, [150, 48, 50], Math.min(0.85, (cap - 0.9) * 9));
      if (br > 0.66) c = mix3(c, [128, 86, 112], Math.min(0.7, (br - 0.66) * 3));
      if (hash2(x, y, 477) > 0.97) c = c.map((q) => q * 0.8);
      set(o, c[0], c[1], c[2]);
    });
  },
  // Paño carmesí de la casulla: más vivo que el rojo de las criaturas, con
  // el brillo del terciopelo gastado, la trama y la mugre.
  velvetRed() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 4, y / 4, 3, 8, 461);
      const sh = fbm2(x / 8, y / 8, 3, 4, 462);
      const dirt = fbm2(x / 16, y / 16, 2, 2, 463);
      const w = (x + y) % 2 === 0 ? 1 : 0.9;
      let c = mix3([92, 14, 20], [150, 30, 34], n);
      c = mix3(c, [178, 58, 56], Math.max(0, sh - 0.62) * 1.8);
      if (dirt > 0.6) c = mix3(c, [46, 12, 14], Math.min(0.7, (dirt - 0.6) * 2.4));
      set(o, c[0] * w, c[1] * w, c[2] * w);
    });
  },

  fleshEmit() {
    return fleshGen(true);
  },
  // Pus: amarillo verdoso, grumoso, con burbujas y vetas de sangre (la
  // gruta de Leonor y su cuerpo); y lo que brilla de él en la oscuridad
  pus() {
    return pusGen(false);
  },
  pusEmit() {
    return pusGen(true);
  },
  // Piel hinchada de Leonor: blanca, tirante y translúcida, con venas azules,
  // lividez amoratada y pústulas amarillas
  skinPus() {
    const S = 64;
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 6, y / 6, 4, S / 6, 401);
      const v = 1 - Math.abs(fbm2(x / 7, y / 7, 4, S / 7, 402) * 2 - 1);
      const liv = fbm2(x / 12 + 5, y / 12, 3, S / 12, 403);
      const [f1, , id] = worley2((x / S) * 7, (y / S) * 7, 7, 404, 0.85);
      const pust = hash2(id, 3, 405) > 0.62 && f1 < 0.2;
      let c = mix3([168, 160, 150], [206, 198, 186], n);
      if (liv > 0.6) c = mix3(c, [118, 92, 120], Math.min(1, (liv - 0.6) * 2.6));
      if (v > 0.88) c = mix3(c, [70, 84, 126], Math.min(1, (v - 0.88) * 7));
      if (pust) {
        const k = 1 - f1 / 0.2;
        c = mix3(c, [212, 186, 86], k * 0.9);
        if (k > 0.75) c = mix3(c, [244, 232, 170], (k - 0.75) * 3);
      }
      set(o, c[0], c[1], c[2]);
    });
  },
  // Piedra de los guardianes: caliza oscura de grano fino, picada, con vetas
  // y grietas por las que asoma la brasa (su emisión, aparte)
  stoneGuard() {
    return guardGen(false);
  },
  stoneGuardEmit() {
    return guardGen(true);
  },

  bone() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 3, y / 3, 3, S / 3, 51);
      let c = mix3([168, 156, 124], [206, 194, 162], n);
      if (hash2(x, y, 52) > 0.94) c = [110, 100, 80];
      set(o, c[0], c[1], c[2]);
    });
  },

  // Piedra tosca (bolaños, peñas, cascotes): granito sin juntas, con motas,
  // grietas finas y manchas de liquen.
  // Prado: hierba corta con briznas, matas más oscuras, calvas secas y
  // alguna flor (la otra orilla del río).
  grass() {
    const S = 64;
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 9, y / 9, 4, S / 9, 171);
      const m = fbm2(x / 3, y / 3, 2, S / 3, 172);
      const dry = fbm2(x / 14 + 5, y / 14, 3, S / 14, 173);
      let c = mix3([58, 76, 40], [92, 104, 54], n);
      // briznas: rayitas verticales claras y oscuras
      const b = hash2(x, Math.floor(y / 3), 174);
      if (b > 0.86) c = mix3(c, [128, 136, 76], 0.55);
      else if (b < 0.12) c = mix3(c, [34, 46, 26], 0.6);
      c = mix3(c, [c[0] * 0.8, c[1] * 0.85, c[2] * 0.8], m * 0.6);
      if (dry > 0.63) c = mix3(c, [124, 112, 70], Math.min(0.7, (dry - 0.63) * 3));
      const f = hash2(x, y, 175);
      if (f > 0.993) c = [210, 204, 170];
      else if (f > 0.988) c = [196, 168, 70];
      set(o, c[0], c[1], c[2]);
    });
  },

  // Follaje: racimos de hojas (celdas con el borde en sombra y brillos).
  leaves() {
    const S = 64;
    return pixels(S, S, (x, y, o) => {
      const [f1, f2] = worley2((x / S) * 10, (y / S) * 10, 10, 176, 0.95);
      const n = fbm2(x / 6, y / 6, 3, S / 6, 177);
      let c = mix3([34, 52, 28], [70, 92, 46], n);
      const edge = f2 - f1;
      if (edge < 0.08) c = mix3(c, [16, 24, 14], 0.7);
      else if (f1 < 0.18) c = mix3(c, [104, 124, 66], 0.45 * (1 - f1 / 0.18));
      set(o, c[0], c[1], c[2]);
    });
  },

  rock() {
    const S = 64;
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 7, y / 7, 4, S / 7, 71);
      const m = fbm2(x / 2.5, y / 2.5, 2, S / 2.5, 72);
      const cr = Math.abs(fbm2(x / 11, y / 11, 3, S / 11, 73) - 0.5);
      let k = 0.72 + n * 0.42 + (m - 0.5) * 0.22;
      if (cr < 0.022) k *= 0.62;
      const sp = hash2(x, y, 74);
      if (sp > 0.94) k *= 0.64;
      else if (sp < 0.05) k *= 1.28;
      let c = [116 * k, 110 * k, 100 * k];
      const li = fbm2(x / 8, y / 8, 3, S / 8, 75);
      if (li > 0.64) c = mix3(c, [84, 90, 68], Math.min(0.55, (li - 0.64) * 3));
      set(o, c[0], c[1], c[2]);
    });
  },

  mossstone() {
    const S = 64;
    const map = blockLayout(S, S, [10, 12, 10, 12, 10, 10], 12, 24, 57);
    return pixels(S, S, (x, y, o) => {
      const b = map[y * S + x];
      const n = fbm2(x / 4, y / 4, 3, S / 4, 58);
      const moss = fbm2(x / 9, y / 9, 4, S / 9, 59);
      let c;
      if (b.lx === 0 || b.ly === 0) c = [26, 26, 24];
      else {
        const t = hash2(b.id, 2, 2);
        c = mix3([66, 66, 62], [84, 80, 72], t);
        let k = 0.8 + n * 0.35;
        if (b.ly === 1) k *= 1.12;
        if (b.ly === b.h - 1) k *= 0.75;
        c = [c[0] * k, c[1] * k, c[2] * k];
      }
      if (moss > 0.58) c = mix3(c, [38, 54, 30], Math.min(0.85, (moss - 0.58) * 3));
      set(o, c[0], c[1], c[2]);
    });
  },

  // Muro del osario: calaveras dibujadas a mano alzada por código.
  skulls() {
    const S = 128,
      N = 8,
      cs = S / N;
    const c = makeCanvas(S, S);
    const g = c.getContext('2d');
    g.fillStyle = '#1b1612';
    g.fillRect(0, 0, S, S);
    const rng = new RNG(66);
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const cx = i * cs + cs / 2 + (j % 2) * (cs / 2) + rng.range(-1, 1);
        const cy = j * cs + cs / 2 + rng.range(-1, 1);
        const tone = rng.range(0.7, 1.05);
        const col = (r, gg, b) =>
          `rgb(${(r * tone) | 0},${(gg * tone) | 0},${(b * tone) | 0})`;
        for (const ox of cx > S - cs / 2 ? [0, -S] : [0]) {
          const x = cx + ox;
          g.fillStyle = col(150, 138, 108);
          g.beginPath();
          g.ellipse(x, cy - 1, cs * 0.42, cs * 0.38, 0, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = col(190, 178, 146);
          g.beginPath();
          g.ellipse(x - 1, cy - 3, cs * 0.26, cs * 0.18, 0, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = col(128, 116, 90);
          g.fillRect(x - cs * 0.25, cy + 2, cs * 0.5, cs * 0.3);
          g.fillStyle = '#0b0807';
          g.beginPath();
          g.ellipse(x - cs * 0.17, cy, cs * 0.12, cs * 0.13, 0, 0, Math.PI * 2);
          g.ellipse(x + cs * 0.17, cy, cs * 0.12, cs * 0.13, 0, 0, Math.PI * 2);
          g.fill();
          g.fillRect(x - 1, cy + 2, 2, 3);
          g.fillStyle = '#2a211a';
          for (let t = -2; t <= 2; t++) g.fillRect(x + t * 2 - 0.5, cy + 5, 1, 3);
        }
      }
    // grano
    const img = g.getImageData(0, 0, S, S);
    for (let i = 0; i < img.data.length; i += 4) {
      const k = 0.85 + Math.random() * 0.25;
      img.data[i] *= k;
      img.data[i + 1] *= k;
      img.data[i + 2] *= k;
    }
    g.putImageData(img, 0, 0);
    return c;
  },

  // Fémures apilados de cabeza, en hiladas como de ladrillo (el aparejo de
  // un osario ordenado): tres hiladas de cabezas (dobles, las del fémur por
  // abajo; redondas, las de arriba; las de la tibia) y una de huesos tendidos.
  femurs() {
    const S = 128;
    const c = makeCanvas(S, S);
    const g = c.getContext('2d');
    g.fillStyle = '#120e0b';
    g.fillRect(0, 0, S, S);
    const rng = new RNG(71);
    for (let row = 0; row < 16; row++) {
      const y = row * 8 + 4;
      if (row % 4 === 3) {
        // la hilada de huesos tendidos (cuatro por vuelta, casan por el borde)
        const off = rng.range(0, 32);
        for (let k = 0; k < 4; k++) {
          const x0 = off + k * 32 + rng.range(-0.6, 0.6),
            x1 = x0 + 32 - rng.range(1.2, 2.2);
          const tone = rng.range(0.72, 1.02);
          const yy = y + rng.range(-0.4, 0.4),
            yb = yy + rng.range(-0.4, 0.4);
          for (const ox of [0, -S, S]) paintBone(g, x0 + 3 + ox, yy, x1 - 3 + ox, yb, 2.9, tone);
        }
        continue;
      }
      for (let k = 0; k < 16; k++) {
        const x = k * 8 + (row % 2) * 4 + rng.range(-0.7, 0.7);
        const yy = y + rng.range(-0.5, 0.5);
        const tone = rng.range(0.66, 1.05);
        const kind = rng.next();
        wrapDraw(S, x, yy, 5, (px, py) => {
          g.fillStyle = '#0b0807';
          g.beginPath();
          g.ellipse(px, py + 0.5, 4.3, 4.1, 0, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = boneCol(BONE_MID, tone);
          if (kind < 0.5) {
            // los dos cóndilos del fémur
            for (const s of [-1, 1]) {
              g.beginPath();
              g.ellipse(px + s * 1.7, py, 2.35, 3.3, 0, 0, Math.PI * 2);
              g.fill();
            }
            g.fillStyle = boneCol(BONE_HI, tone);
            for (const s of [-1, 1]) g.fillRect(px + s * 1.7 - 1.3, py - 2.6, 1.9, 1.4);
            g.fillStyle = boneCol(BONE_LO, tone * 0.9);
            for (const s of [-1, 1]) g.fillRect(px + s * 1.7 - 1.4, py + 1.8, 2.6, 1.2);
            g.fillStyle = '#1c1611';
            g.fillRect(px - 0.4, py - 1.2, 0.8, 3.6);
          } else if (kind < 0.88) {
            // la cabeza redonda
            g.beginPath();
            g.ellipse(px, py, 3.7, 3.6, 0, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = boneCol(BONE_HI, tone);
            g.beginPath();
            g.ellipse(px - 1, py - 1.3, 1.8, 1.3, 0, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = boneCol(BONE_LO, tone);
            g.fillRect(px - 2, py + 1.8, 4.2, 1.3);
          } else {
            // la tibia, de tres caras (redondeada)
            g.beginPath();
            g.ellipse(px, py - 0.3, 3.8, 3.2, 0, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = boneCol(BONE_LO, tone);
            g.fillRect(px - 0.6, py - 2.6, 1.2, 4.4);
            g.fillStyle = boneCol(BONE_HI, tone);
            g.fillRect(px - 2.6, py - 2.4, 1.8, 1.2);
          }
        });
      }
    }
    grain(g, S, 0.84, 0.26, 72);
    return c;
  },

  // Rosetones de huesos (como en las capillas de huesos): una calavera en
  // medio, ocho huesos en estrella, un aro de vértebras y, en las esquinas,
  // fémures cruzados; el fondo, de cabezas de hueso.
  boneRosette() {
    const S = 128;
    const c = makeCanvas(S, S);
    const g = c.getContext('2d');
    g.fillStyle = '#120e0b';
    g.fillRect(0, 0, S, S);
    const rng = new RNG(73);
    // el relleno: cabezas de hueso pequeñas, apretadas
    for (let y = 2; y < S; y += 4)
      for (let x = ((y / 4) | 0) % 2 ? 2 : 0; x < S + 2; x += 4) {
        const tone = rng.range(0.48, 0.74);
        wrapDraw(S, x, y, 3, (px, py) => {
          g.fillStyle = boneCol(BONE_MID, tone);
          g.beginPath();
          g.ellipse(px, py, 1.9, 1.8, 0, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = boneCol(BONE_HI, tone);
          g.fillRect(px - 1, py - 1.2, 1.2, 0.9);
        });
      }
    const cx = 64,
      cy = 64;
    // la sombra de la estrella (más honda en medio)
    for (let r = 46; r > 6; r -= 4) {
      g.fillStyle = 'rgba(8,6,5,0.16)';
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
    }
    // la estrella de huesos (los largos en cruz, los cortos en aspa)
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const r0 = 13,
        r1 = k % 2 ? 34 : 40;
      paintBone(g, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, 2.6, rng.range(0.85, 1.05));
    }
    // el aro de vértebras
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2;
      const x = cx + Math.cos(a) * 42,
        y = cy + Math.sin(a) * 42;
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.fillStyle = '#0b0807';
      g.fillRect(-3, -3.6, 6, 7.2);
      g.fillStyle = boneCol(BONE_MID, rng.range(0.8, 1));
      g.fillRect(-2.2, -2.8, 4.4, 5.6);
      g.fillStyle = boneCol(BONE_HI, 1);
      g.fillRect(-2.2, -2.8, 4.4, 1.2);
      g.restore();
    }
    paintSkull(g, cx, cy, 11, 1.02);
    // en las esquinas (casan en un rosetón pequeño): dos fémures en aspa y
    // una calavera chica
    for (const [x, y] of [
      [0, 0],
      [S, 0],
      [0, S],
      [S, S],
    ]) {
      paintBone(g, x - 16, y - 16, x + 16, y + 16, 2.4, 0.92);
      paintBone(g, x + 16, y - 16, x - 16, y + 16, 2.4, 0.86);
      paintSkull(g, x, y, 6.5, 0.95);
    }
    grain(g, S, 0.84, 0.26, 74);
    return c;
  },

  // Montón de huesos revueltos (los osarios sin orden): huesos largos en
  // todas las direcciones, alguna calavera, costillas, oscuro entre medias.
  bonePile() {
    const S = 128;
    const c = makeCanvas(S, S);
    const g = c.getContext('2d');
    g.fillStyle = '#0f0b09';
    g.fillRect(0, 0, S, S);
    const rng = new RNG(75);
    for (let k = 0; k < 140; k++) {
      const x = rng.range(0, S),
        y = rng.range(0, S);
      const a = rng.range(0, Math.PI * 2),
        len = rng.range(12, 30);
      const tone = rng.range(0.45, 0.95);
      const bx = x + Math.cos(a) * len,
        by = y + Math.sin(a) * len;
      for (const ox of [0, -S, S]) for (const oy of [0, -S, S]) paintBone(g, x + ox, y + oy, bx + ox, by + oy, rng.range(1.6, 2.6), tone);
      if (k % 9 === 0) {
        const sx = rng.range(0, S),
          sy = rng.range(0, S),
          ss = rng.range(6, 8),
          st = rng.range(0.7, 0.95);
        wrapDraw(S, sx, sy, 10, (px, py) => paintSkull(g, px, py, ss, st));
      }
    }
    grain(g, S, 0.8, 0.3, 76);
    return c;
  },

  // «MÁS ABAJO», arañado en la piedra a punta de hueso (recortado: lo de
  // alrededor es transparente). Para materiales con alphaTest.
  scratchMasAbajo() {
    return scratchText(['MÁS', 'ABAJO'], 128, 64, 91);
  },
  scratchCampana() {
    return scratchText(['LA CAMPANA', 'SÍ ES POR MÍ'], 192, 64, 92);
  },

  // El círculo de sal del ama en el suelo (granos, con huecos), recortado.
  saltRing() {
    const S = 64;
    return pixels(S, S, (x, y, o) => {
      const d = Math.hypot(x - S / 2 + 0.5, y - S / 2 + 0.5) / (S / 2);
      const n = hash2(x, y, 93);
      const band = Math.abs(d - 0.82) < 0.07 + fbm2(x / 5, y / 5, 2, 0, 94) * 0.05;
      if (band && n > 0.25) set(o, 236, 232, 222, 255);
      else if (d < 0.97 && n > 0.985) set(o, 220, 216, 206, 255);
      else set(o, 0, 0, 0, 0);
    });
  },

  // Los símbolos de los rodillos de la caja de música (seis, en fila): el
  // sol, la luna, la estrella, la campana, el gallo y la cruz, pintados en
  // marfil.
  nanaSymbols() {
    const T = 16,
      N = 6;
    const c = makeCanvas(T * N, T);
    const g = c.getContext('2d');
    for (let k = 0; k < N; k++) {
      const x = k * T;
      g.fillStyle = '#cdbf9c';
      g.fillRect(x, 0, T, T);
      g.fillStyle = '#7a6448';
      g.fillRect(x, 0, T, 1);
      g.fillRect(x, T - 1, T, 1);
      const cx = x + T / 2,
        cy = T / 2;
      if (k === 0) {
        // el sol con sus rayos
        g.fillStyle = '#c07a18';
        for (let r = 0; r < 8; r++) {
          const a = (r / 8) * Math.PI * 2;
          g.fillRect(Math.round(cx + Math.cos(a) * 5.5 - 0.5), Math.round(cy + Math.sin(a) * 5.5 - 0.5), 1.5, 1.5);
        }
        g.fillStyle = '#e0a020';
        g.beginPath();
        g.arc(cx, cy, 3.6, 0, Math.PI * 2);
        g.fill();
      } else if (k === 1) {
        // la luna, en creciente
        g.fillStyle = '#5a6a88';
        g.beginPath();
        g.arc(cx, cy, 5.2, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#cdbf9c';
        g.beginPath();
        g.arc(cx + 2.6, cy - 1.2, 4.6, 0, Math.PI * 2);
        g.fill();
      } else if (k === 2) {
        // la estrella de seis puntas
        g.fillStyle = '#3a5aa0';
        for (const off of [0, Math.PI / 3]) {
          g.beginPath();
          for (let r = 0; r < 3; r++) {
            const a = off + (r / 3) * Math.PI * 2 - Math.PI / 2;
            g.lineTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6);
          }
          g.closePath();
          g.fill();
        }
      } else if (k === 3) {
        // la campana
        g.fillStyle = '#5a3c20';
        g.beginPath();
        g.moveTo(cx - 1.5, cy - 5);
        g.lineTo(cx + 1.5, cy - 5);
        g.quadraticCurveTo(cx + 3.5, cy - 4, cx + 3.6, cy + 1);
        g.lineTo(cx + 5.5, cy + 4);
        g.lineTo(cx - 5.5, cy + 4);
        g.lineTo(cx - 3.6, cy + 1);
        g.quadraticCurveTo(cx - 3.5, cy - 4, cx - 1.5, cy - 5);
        g.fill();
        g.fillRect(cx - 1, cy + 4, 2, 2);
        g.fillRect(cx - 0.5, cy - 7, 1, 2);
      } else if (k === 4) {
        // el gallo, de perfil, con su cresta roja
        g.fillStyle = '#3a2a1a';
        g.beginPath();
        g.ellipse(cx - 0.5, cy + 1.5, 4.2, 3, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(cx + 3, cy - 2.5, 1.8, 2.2, 0, 0, Math.PI * 2);
        g.fill();
        // la cola
        g.beginPath();
        g.moveTo(cx - 4, cy + 1);
        g.lineTo(cx - 7, cy - 4);
        g.lineTo(cx - 3, cy - 1);
        g.fill();
        g.fillStyle = '#b02018';
        g.fillRect(cx + 2, cy - 6, 3, 1.6);
        g.fillRect(cx + 4.5, cy - 2, 1.5, 1.5);
        g.fillStyle = '#c08a20';
        g.fillRect(cx + 4.6, cy - 3.2, 2, 1);
        g.fillRect(cx - 1.5, cy + 4.2, 1, 2.5);
        g.fillRect(cx + 0.8, cy + 4.2, 1, 2.5);
      } else {
        // la cruz
        g.fillStyle = '#6a1a14';
        g.fillRect(cx - 1, cy - 6, 2.2, 12);
        g.fillRect(cx - 4.5, cy - 2.5, 9, 2.2);
      }
    }
    return c;
  },

  // La Virgen del Carmen del ama: tabla pintada con la Virgen de hábito
  // pardo y manto blanco, el Niño, el escapulario en la mano y estrellas.
  virgenCarmen() {
    const W = 32,
      H = 48;
    const c = makeCanvas(W, H);
    const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#2a3a5a');
    bg.addColorStop(1, '#1a2238');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    // estrellas
    g.fillStyle = '#d8c070';
    for (const [x, y] of [[4, 6], [27, 5], [6, 20], [26, 18], [3, 34], [28, 31]]) g.fillRect(x, y, 1, 1);
    // el manto blanco (un arco hasta los pies) y el hábito pardo
    g.fillStyle = '#d8d0bc';
    g.beginPath();
    g.moveTo(16, 7);
    g.quadraticCurveTo(28, 14, 26, 44);
    g.lineTo(6, 44);
    g.quadraticCurveTo(4, 14, 16, 7);
    g.fill();
    g.fillStyle = '#6a4a2c';
    g.beginPath();
    g.moveTo(16, 13);
    g.quadraticCurveTo(23, 20, 21, 44);
    g.lineTo(11, 44);
    g.quadraticCurveTo(9, 20, 16, 13);
    g.fill();
    // el escapulario (un cuadrado pardo en la mano) y el Niño en brazos
    g.fillStyle = '#4a3018';
    g.fillRect(20, 26, 4, 4);
    g.fillStyle = '#e8d8b8';
    g.fillRect(12, 20, 5, 6);
    g.fillStyle = '#e0b890';
    g.beginPath();
    g.arc(14.5, 19, 1.8, 0, Math.PI * 2);
    g.fill();
    // la cara, la toca y la corona con el halo
    g.fillStyle = '#e8c8a0';
    g.beginPath();
    g.arc(16, 10, 2.6, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#e0b030';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(16, 9.5, 5, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
    g.fillStyle = '#d0a020';
    g.fillRect(13.5, 5.5, 5, 1.5);
    // el marco dorado
    g.strokeStyle = '#8a6a28';
    g.lineWidth = 2;
    g.strokeRect(1, 1, W - 2, H - 2);
    grain(g, W, 0.86, 0.2, 95);
    return c;
  },

  // Columbario de calaveras (el osario de las ánimas): hileras de nichos
  // chicos de medio punto en la piedra, cada uno con su calavera (alguno
  // vacío, alguno tapiado).
  skullNiches() {
    const S = 128,
      CW = 16,
      CH = 32;
    const c = makeCanvas(S, S);
    const g = c.getContext('2d');
    const rng = new RNG(97);
    // la piedra, con sus juntas
    const img = g.createImageData(S, S);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const i = (y * S + x) * 4;
        const n = fbm2(x / 6, y / 6, 3, S / 6, 98);
        const k = 92 + n * 40;
        img.data[i] = k * 1.02;
        img.data[i + 1] = k * 0.97;
        img.data[i + 2] = k * 0.88;
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    for (let row = 0; row < S / CH; row++)
      for (let col = 0; col < S / CW; col++) {
        const x = col * CW + (row % 2) * (CW / 2),
          y = row * CH;
        const kind = rng.next();
        const draw = (ox) => {
          const X = x + ox;
          // el nicho: medio punto, hondo y oscuro
          g.fillStyle = kind < 0.1 ? '#6a645a' : '#100c0a';
          g.beginPath();
          g.moveTo(X + 2, y + 27);
          g.lineTo(X + 2, y + 12);
          g.arc(X + CW / 2, y + 12, CW / 2 - 2, Math.PI, 0);
          g.lineTo(X + CW - 2, y + 27);
          g.closePath();
          g.fill();
          // la repisa
          g.fillStyle = '#7e786c';
          g.fillRect(X + 1, y + 27, CW - 2, 2);
          g.fillStyle = '#3a342c';
          g.fillRect(X + 1, y + 29, CW - 2, 1);
          if (kind < 0.1) {
            // tapiado: una cruz rayada
            g.fillStyle = '#3e3a32';
            g.fillRect(X + CW / 2 - 0.5, y + 10, 1, 12);
            g.fillRect(X + CW / 2 - 3, y + 14, 6, 1);
          } else if (kind > 0.16) paintSkull(g, X + CW / 2, y + 21.5, 4.6, rng.range(0.7, 1.0));
        };
        draw(0);
        if (x + CW > S) draw(-S);
      }
    grain(g, S, 0.86, 0.22, 99);
    return c;
  },

  // El retablo de ánimas: las almas del purgatorio entre las llamas, con las
  // manos alzadas; un ángel saca a una de una cuerda, y arriba la Virgen.
  animasRetablo() {
    const W = 48,
      H = 64;
    const c = makeCanvas(W, H);
    const g = c.getContext('2d');
    const rng = new RNG(101);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#3a3050');
    sky.addColorStop(0.45, '#6a3020');
    sky.addColorStop(1, '#2a0c06');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    // las nubes y la Virgen arriba
    g.fillStyle = '#b8a890';
    for (let k = 0; k < 7; k++) {
      g.beginPath();
      g.ellipse(6 + k * 6.2, 20 + Math.sin(k * 1.7) * 1.5, 5, 2.6, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#2a4a8a';
    g.beginPath();
    g.moveTo(24, 4);
    g.quadraticCurveTo(31, 9, 30, 19);
    g.lineTo(18, 19);
    g.quadraticCurveTo(17, 9, 24, 4);
    g.fill();
    g.fillStyle = '#e8c8a0';
    g.beginPath();
    g.arc(24, 6.5, 2, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#e0b030';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(24, 6.5, 3.6, 0, Math.PI * 2);
    g.stroke();
    // el ángel con la cuerda
    g.fillStyle = '#d8d0c0';
    g.beginPath();
    g.ellipse(36, 28, 2.5, 4.5, 0.3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#c8c0b0';
    g.beginPath();
    g.moveTo(37, 26);
    g.lineTo(44, 22);
    g.lineTo(40, 30);
    g.fill();
    g.strokeStyle = '#a08860';
    g.beginPath();
    g.moveTo(35, 31);
    g.lineTo(31, 40);
    g.stroke();
    // las llamas
    for (let y = 36; y < H; y++)
      for (let x = 0; x < W; x++) {
        const n = fbm2(x / 3, y / 5, 3, 0, 102);
        const v = (y - 36) / (H - 36);
        if (n + v * 0.6 > 0.62) {
          g.fillStyle = n > 0.7 ? '#ffd060' : n > 0.6 ? '#f08020' : '#b02810';
          g.fillRect(x, y, 1, 1);
        }
      }
    // las ánimas: cuerpos pálidos hasta la cintura, con las manos alzadas
    for (let k = 0; k < 6; k++) {
      const x = 5 + k * 7.6 + rng.range(-1, 1),
        y = 44 + (k % 2) * 4;
      g.fillStyle = '#e0c0a0';
      g.fillRect(x - 2, y, 4, 7);
      g.beginPath();
      g.arc(x, y - 2, 2, 0, Math.PI * 2);
      g.fill();
      g.fillRect(x - 3.5, y - 6, 1, 6);
      g.fillRect(x + 2.5, y - 6, 1, 6);
      g.fillStyle = '#3a2010';
      g.fillRect(x - 0.8, y - 2.6, 0.6, 0.6);
      g.fillRect(x + 0.3, y - 2.6, 0.6, 0.6);
    }
    // otra vez llamas por delante de las ánimas, abajo
    for (let y = 52; y < H; y++)
      for (let x = 0; x < W; x++) {
        const n = fbm2(x / 2.5, y / 4, 3, 0, 103);
        if (n > 0.56) {
          g.fillStyle = n > 0.66 ? '#ffb040' : '#c83818';
          g.fillRect(x, y, 1, 1);
        }
      }
    g.strokeStyle = '#8a6a28';
    g.lineWidth = 2;
    g.strokeRect(1, 1, W - 2, H - 2);
    grain(g, W, 0.88, 0.18, 104);
    return c;
  },

  // Las lápidas de los nichos del osario de las ánimas (una por fila): los
  // nombres de cuatro canónigos y tres sin él (lisa, picada y con una cruz).
  lapidasAnimas() {
    const W = 128,
      R = 16,
      N = 8;
    const c = makeCanvas(W, R * N);
    const g = c.getContext('2d');
    const names = ['D. PELAGIVS', 'D. MENENDVS', 'D. GVNDISALVVS', 'D. FROILA', '', '#', '+', ''];
    const rng = new RNG(105);
    names.forEach((t, k) => {
      const y = k * R;
      g.fillStyle = '#a49a88';
      g.fillRect(0, y, W, R);
      g.fillStyle = '#7a7264';
      g.fillRect(0, y, W, 1);
      g.fillRect(0, y + R - 1, W, 1);
      g.fillStyle = '#2a2420';
      if (t === '#') {
        // el nombre, picado a cincel: sólo quedan los golpes
        for (let i = 0; i < 46; i++) g.fillRect(14 + rng.range(0, 100), y + 4 + rng.range(0, 8), rng.range(1, 3), rng.range(1, 2));
      } else if (t === '+') {
        g.fillRect(W / 2 - 0.5, y + 3, 1.5, 10);
        g.fillRect(W / 2 - 3, y + 6, 6.5, 1.5);
      } else if (t) {
        g.font = 'bold 10px serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(t, W / 2, y + R / 2 + 1, W - 10);
      }
    });
    grain(g, W, 0.86, 0.2, 106);
    return c;
  },

  // la inscripción del osario de San Martín
  letreroDumio() {
    return paintCarved(['LO QVE TV ERES FVIMOS', 'LO QVE SOMOS SERAS'], 256, 80, 111);
  },

  // el letrero del osario de la Hermandad (en los dos muros)
  letreroOssos1() {
    return paintLetrero('NÓS OSSOS QUE AQUI ESTAMOS', 256, 16, 81);
  },
  letreroOssos2() {
    return paintLetrero('PELOS VOSSOS ESPERAMOS', 256, 16, 82);
  },

  // Vidriera gótica: paneles de color emplomados.
  glass() {
    const W = 32,
      H = 64;
    const pal = [
      [150, 18, 20],
      [40, 40, 120],
      [170, 110, 20],
      [110, 14, 40],
      [30, 90, 60],
      [160, 30, 16],
    ];
    return pixels(W, H, (x, y, o) => {
      const [f1, f2, id] = worley2((x / W) * 3, (y / H) * 6, 3, 88, 0.9);
      const n = fbm2(x / 3, y / 3, 2, 0, 89);
      if (f2 - f1 < 0.1 || x % 16 === 0 || y % 16 === 0) {
        set(o, 16, 14, 12);
        return;
      }
      const c = pal[id % pal.length];
      const k = 0.75 + n * 0.5;
      set(o, c[0] * k, c[1] * k, c[2] * k);
    });
  },

  mosaic() {
    const S = 128,
      T = 4;
    const pal = {
      k: [34, 30, 28],
      c: [190, 178, 146],
      r: [148, 68, 44],
      o: [168, 128, 60],
    };
    return pixels(S, S, (x, y, o) => {
      const tx = Math.floor(x / T),
        ty = Math.floor(y / T);
      const N = S / T;
      if (x % T === 0 || y % T === 0) {
        set(o, 60, 54, 46);
        return;
      }
      const cx = tx - N / 2 + 0.5,
        cy = ty - N / 2 + 0.5;
      const r = Math.hypot(cx, cy);
      const border = Math.min(tx, ty, N - 1 - tx, N - 1 - ty);
      let c = pal.c;
      if (border === 1) c = pal.k;
      else if (border === 2) c = (tx + ty) % 4 < 2 ? pal.r : pal.c;
      else if (border === 3) c = pal.k;
      else if (Math.abs(r - 9) < 0.8 || Math.abs(r - 5) < 0.7) c = pal.r;
      else if (r < 3) c = pal.o;
      else if (r < 9 && Math.abs(cx) < 0.9) c = pal.k;
      else if (r < 9 && Math.abs(cy) < 0.9) c = pal.k;
      const dmg = fbm2(x / 16, y / 16, 3, S / 16, 90);
      const k = 0.8 + hash2(tx, ty, 91) * 0.3;
      if (dmg > 0.64) c = [70, 60, 50];
      set(o, c[0] * k, c[1] * k, c[2] * k);
    });
  },

  candle() {
    const S = 16;
    return pixels(S, S, (x, y, o) => {
      const d = fbm2(x / 1.5, y / 8, 2, 0, 3);
      const k = 0.82 + d * 0.3;
      set(o, 214 * k, 202 * k, 170 * k);
    });
  },

  straw() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const s = fbm2(x / 0.8, y / 10, 2, 0, 9);
      const k = 0.6 + s * 0.6;
      set(o, 160 * k, 130 * k, 64 * k);
    });
  },

  blood() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 4, y / 4, 3, S / 4, 101);
      set(o, 60 + n * 30, 6 + n * 6, 8 + n * 6);
    });
  },

  water() {
    const S = 32;
    return pixels(S, S, (x, y, o) => {
      const n = fbm2(x / 5, y / 5, 3, S / 5, 111);
      set(o, 40 + n * 20, 50 + n * 22, 56 + n * 22);
    });
  },

  black() {
    return pixels(4, 4, (x, y, o) => set(o, 8, 8, 8));
  },
  white() {
    return pixels(4, 4, (x, y, o) => set(o, 255, 255, 255));
  },
};

function clothGen(base, seed) {
  const S = 32;
  return pixels(S, S, (x, y, o) => {
    const w = (x + y) % 2 === 0 ? 1 : 0.86;
    const n = fbm2(x / 5, y / 5, 3, S / 5, seed);
    const dirt = fbm2(x / 8, y / 8, 3, S / 8, seed + 1);
    let k = (0.75 + n * 0.4) * w;
    if (dirt > 0.6) k *= 0.7;
    set(o, base[0] * k, base[1] * k, base[2] * k);
  });
}

function pusGen(emit) {
  const S = 64;
  return pixels(S, S, (x, y, o) => {
    const n = fbm2(x / 6, y / 6, 4, S / 6, 411);
    const n2 = fbm2(x / 3, y / 3, 3, S / 3, 412);
    const vein = 1 - Math.abs(fbm2(x / 10, y / 10, 4, S / 10, 413) * 2 - 1);
    const [f1, , id] = worley2((x / S) * 6, (y / S) * 6, 6, 414, 0.9);
    const bub = hash2(id, 2, 415) > 0.5 && f1 < 0.22;
    if (emit) {
      const k = bub ? 1 - f1 / 0.22 : 0;
      const g = 0.25 + n * 0.35 + k * 0.6;
      set(o, 150 * g, 140 * g, 30 * g);
      return;
    }
    let c = mix3([118, 104, 30], [186, 168, 64], n);
    c = mix3(c, [96, 112, 34], Math.max(0, n2 - 0.55) * 1.6);
    if (vein > 0.9) c = mix3(c, [120, 34, 20], Math.min(1, (vein - 0.9) * 8));
    if (bub) {
      const k = 1 - f1 / 0.22;
      c = mix3(c, [236, 224, 140], k * k);
    }
    set(o, c[0], c[1], c[2]);
  });
}

function guardGen(emit) {
  const S = 64;
  return pixels(S, S, (x, y, o) => {
    const n = fbm2(x / 5, y / 5, 4, S / 5, 421);
    const g = hash2(x, y, 422);
    // grietas: los bordes de las celdas de Worley, finas y quebradas; sólo
    // las más hondas dejan ver la brasa (las demás, surcos oscuros)
    const [f1, f2] = worley2((x / S) * 2, (y / S) * 2, 2, 423, 1);
    const crack = f2 - f1 < 0.03 + fbm2(x / 4, y / 4, 2, S / 4, 424) * 0.025;
    const hot = crack && fbm2(x / 16, y / 16, 2, S / 16, 425) > 0.58;
    if (emit) {
      if (hot) set(o, 255, 90 + n * 60, 30);
      else set(o, 0, 0, 0);
      return;
    }
    let c = mix3([104, 100, 94], [150, 144, 134], n);
    if (g > 0.93) c = mix3(c, [54, 50, 46], 0.7);
    if (g < 0.04) c = mix3(c, [150, 144, 132], 0.6);
    if (crack) c = hot ? [44, 18, 10] : [48, 44, 40];
    set(o, c[0], c[1], c[2]);
  });
}

function fleshGen(emit, pustK = 0.72) {
  const S = 64;
  return pixels(S, S, (x, y, o) => {
    const n = fbm2(x / 6, y / 6, 4, S / 6, 121);
    // fibras musculares: ruido muy estirado en una dirección que ondula
    const wob = fbm2(x / 16, y / 16, 2, S / 16, 126) * 6;
    const fib = fbm2((x + wob) / 1.6, (y + wob) / 11, 3, 0, 127);
    const v = 1 - Math.abs(fbm2(x / 9, y / 9, 4, S / 9, 122) * 2 - 1);
    const bruise = fbm2(x / 10 + 3, y / 10, 3, S / 10, 128);
    const fat = fbm2(x / 5, y / 5, 3, S / 5, 123);
    const [f1, , id] = worley2((x / S) * 5, (y / S) * 5, 5, 124, 0.9);
    const pust = hash2(id, 1, 125) > pustK && f1 < 0.16;
    if (emit) {
      if (pust) {
        const k = 1 - f1 / 0.16;
        set(o, 200 * k, 120 * k, 40 * k);
      } else if (v > 0.93) {
        const k = (v - 0.93) * 12;
        set(o, 120 * k, 14 * k, 8 * k);
      } else set(o, 0, 0, 0);
      return;
    }
    let c = mix3([58, 10, 16], [118, 26, 32], n);
    if (fib > 0.56) c = mix3(c, [150, 60, 62], Math.min(1, (fib - 0.56) * 3));
    if (fib < 0.4) c = mix3(c, [38, 6, 12], Math.min(1, (0.4 - fib) * 2.5));
    if (bruise > 0.6) c = mix3(c, [62, 30, 58], Math.min(1, (bruise - 0.6) * 3));
    if (fat > 0.7) c = mix3(c, [168, 128, 104], Math.min(1, (fat - 0.7) * 3.5));
    if (v > 0.86) c = mix3(c, [26, 4, 16], Math.min(1, (v - 0.86) * 8));
    if (pust) {
      const k = 1 - f1 / 0.16;
      c = mix3(c, [196, 170, 96], k * k);
    }
    set(o, c[0], c[1], c[2]);
  });
}

// -------------------------------------------------------------- sprites
const SPRITES = {
  // Atlas de fuego: 8 fotogramas de 32x64 generados con ruido que asciende.
  fire() {
    const FW = 32,
      FH = 64,
      F = 8;
    const c = pixels(FW * F, FH, (x, y, o) => {
      const f = Math.floor(x / FW),
        lx = x % FW;
      const u = (lx - FW / 2) / (FW / 2);
      const v = 1 - y / FH; // 0 base, 1 punta
      const t = (f / F) * Math.PI * 2;
      const nx = lx / 6 + Math.cos(t) * 1.3;
      const ny = y / 6 + f * 1.4;
      const n = fbm2(nx, ny + Math.sin(t) * 1.3, 4, 0, 131);
      const width = (1 - v) * 0.95 + 0.05;
      let intensity = 1 - Math.abs(u) / (width + 0.001);
      intensity = intensity * (1.25 - v * 1.15) + (n - 0.5) * 1.1 - v * 0.2;
      intensity = clamp(intensity, 0, 1);
      if (intensity <= 0.05) {
        set(o, 0, 0, 0, 0);
        return;
      }
      let col;
      if (intensity > 0.8) col = [255, 240, 200];
      else if (intensity > 0.6) col = [255, 196, 80];
      else if (intensity > 0.38) col = [240, 120, 30];
      else if (intensity > 0.2) col = [180, 52, 16];
      else col = [90, 20, 10];
      set(o, col[0], col[1], col[2], clamp(intensity * 3.2, 0, 1) * 255);
    });
    const t = toTex(c, { repeat: false, smoothMin: false });
    t.userData = { frames: F };
    return t;
  },

  puff() {
    const S = 64;
    return toTex(
      pixels(S, S, (x, y, o) => {
        const d = Math.hypot(x - S / 2 + 0.5, y - S / 2 + 0.5) / (S / 2);
        const n = fbm2(x / 9, y / 9, 4, 0, 141);
        const a = clamp((1 - d) * 1.4 * (0.4 + n * 0.9), 0, 1);
        set(o, 255, 255, 255, a * a * 255);
      }),
      { repeat: false, nearest: false }
    );
  },

  shadow() {
    const S = 32;
    return toTex(
      pixels(S, S, (x, y, o) => {
        const d = Math.hypot(x - S / 2 + 0.5, y - S / 2 + 0.5) / (S / 2);
        const a = clamp(1 - d, 0, 1);
        set(o, 0, 0, 0, Math.pow(a, 0.8) * 220);
      }),
      { repeat: false, nearest: false }
    );
  },

  splat() {
    const S = 64;
    const rng = new RNG(151);
    const blobs = [];
    for (let i = 0; i < 9; i++)
      blobs.push([rng.range(16, 48), rng.range(16, 48), rng.range(4, 13)]);
    return toTex(
      pixels(S, S, (x, y, o) => {
        let a = 0;
        for (const [bx, by, br] of blobs) {
          const d = Math.hypot(x - bx, y - by) / br;
          a = Math.max(a, 1 - d);
        }
        const n = fbm2(x / 4, y / 4, 3, 0, 152);
        a = a * 1.6 + (n - 0.5) * 0.8;
        if (a < 0.2) {
          set(o, 0, 0, 0, 0);
          return;
        }
        const k = 0.6 + n * 0.5;
        set(o, 80 * k, 8 * k, 10 * k, 235);
      }),
      { repeat: false }
    );
  },

  // Sigilo del Pacto pintado con sangre.
  sigil() {
    const S = 64;
    const c = makeCanvas(S, S);
    const g = c.getContext('2d');
    g.strokeStyle = 'rgba(110,10,10,0.95)';
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(32, 32, 24, 0.3, Math.PI * 2 - 0.2);
    g.stroke();
    g.beginPath();
    g.moveTo(32, 6);
    g.lineTo(32, 58);
    g.moveTo(14, 22);
    g.lineTo(50, 44);
    g.moveTo(50, 22);
    g.lineTo(38, 29);
    g.moveTo(20, 50);
    g.lineTo(30, 40);
    g.stroke();
    g.fillStyle = 'rgba(110,10,10,0.95)';
    g.beginPath();
    g.arc(32, 32, 6, 0, Math.PI * 2);
    g.fill();
    // chorretones
    for (let i = 0; i < 6; i++) {
      const x = 12 + Math.random() * 40;
      g.fillRect(x, 32 + Math.random() * 10, 2, 8 + Math.random() * 18);
    }
    return toTex(c, { repeat: false });
  },

  glow() {
    const S = 32;
    return toTex(
      pixels(S, S, (x, y, o) => {
        const d = Math.hypot(x - S / 2 + 0.5, y - S / 2 + 0.5) / (S / 2);
        const a = clamp(1 - d, 0, 1);
        set(o, 255, 255, 255, a * a * 255);
      }),
      { repeat: false, nearest: false }
    );
  },

  // Tela rasgada con agujeros (estandartes)
  bannerBlack() {
    return bannerGen([22, 20, 22], true, 161);
  },
  bannerRed() {
    return bannerGen([100, 18, 20], false, 162);
  },
  // El estandarte del abuelo de Henrique: campo de oro con el águila negra
  // del Sacro Imperio (las alas abiertas, el pico y las garras rojas)
  bannerEagle() {
    const W = 32,
      H = 64;
    const c = pixels(W, H, (x, y, o) => {
      const n = fbm2(x / 4, y / 4, 3, 0, 171);
      const cut = H - 5 - vnoise2(x / 2, 0, 0, 172) * 10;
      if (y > cut) {
        set(o, 0, 0, 0, 0);
        return;
      }
      const w = (x + y) % 2 ? 0.9 : 1;
      const k = (0.75 + n * 0.4) * w;
      let col = [196 * k, 150 * k, 46 * k];
      const cx = x - W / 2 + 0.5,
        cy = y - 24;
      const ax = Math.abs(cx);
      // cuerpo y cola
      const body = (ax < 2.6 && cy > -6 && cy < 8) || (cy >= 8 && cy < 13 && ax < 1.5 + (cy - 8) * 0.7);
      // alas: plumas que bajan en escalera hacia fuera
      const wing = ax >= 2 && ax < 13 && cy > -6 + ax * 0.25 && cy < -1 + ax * 0.55 + ((Math.floor(ax / 2.2) % 2) ? 1.5 : 0);
      // cabeza vuelta (a la izquierda del que mira) y cuello
      const head = Math.hypot(cx + 1.4, cy + 8.5) < 2.4;
      const beak = cx < -3 && cx > -5.6 && cy > -9.5 && cy < -7.5;
      // patas abiertas con las garras
      const leg = cy >= 6 && cy < 12 && ax > 2.4 && ax < 4.2 + (cy - 6) * 0.4;
      if (body || wing || head || leg) col = [16, 12, 12];
      if (beak || (leg && cy > 10.5) || (Math.abs(cx + 3) < 0.6 && cy > -7.6 && cy < -6)) col = [170, 24, 18];
      if (head && Math.abs(cx + 1.0) < 0.6 && Math.abs(cy + 9.2) < 0.6) col = [220, 200, 120];
      set(o, col[0], col[1], col[2], 255);
    });
    return toTex(c, { repeat: false });
  },
};

function bannerGen(base, sigil, seed) {
  const W = 32,
    H = 64;
  const c = pixels(W, H, (x, y, o) => {
    const n = fbm2(x / 4, y / 4, 3, 0, seed);
    const tear = fbm2(x / 3, y / 5, 3, 0, seed + 1);
    const edge = y / H;
    // bajo deshilachado
    const cut = H - 6 - vnoise2(x / 2, 0, 0, seed + 2) * 14;
    if (y > cut || (tear > 0.7 && edge > 0.3)) {
      set(o, 0, 0, 0, 0);
      return;
    }
    let col = base.slice();
    const w = (x + y) % 2 ? 0.88 : 1;
    const k = (0.7 + n * 0.5) * w;
    col = [col[0] * k, col[1] * k, col[2] * k];
    const cx = x - W / 2 + 0.5,
      cy = y - 22;
    const r = Math.hypot(cx, cy);
    if (sigil) {
      if (Math.abs(r - 9) < 1.3 || (Math.abs(cx) < 1 && Math.abs(cy) < 13) || r < 3)
        col = [120, 14, 12];
    } else if ((Math.abs(cx) < 1.5 && Math.abs(cy) < 10) || (Math.abs(cy + 3) < 1.5 && Math.abs(cx) < 7))
      col = [170, 150, 90];
    set(o, col[0], col[1], col[2], 255);
  });
  return toTex(c, { repeat: false });
}

// El sigilo del Pacto tallado en la carne de un coloso (punto débil): los
// tajos del anillo, la Y y los tres puntos arden como brasas; alrededor, la
// carne requemada y agrietada, con vetas de fuego que se abren hacia fuera y
// se deshacen en la piel (transparente en el borde: no es un disco).
SPRITES.sigilFlesh = () => {
  const S = 128,
    c = S / 2 - 0.5;
  const rng = new RNG(4617);
  // grietas: polilíneas que salen de la herida hacia fuera
  const cracks = [];
  for (let i = 0; i < 11; i++) {
    let a = (i / 11) * Math.PI * 2 + rng.range(-0.3, 0.3);
    let r = 30 + rng.range(-3, 6);
    const pts = [[c + Math.cos(a) * r, c + Math.sin(a) * r]];
    const n = 3 + Math.floor(rng.range(0, 4));
    for (let k = 0; k < n; k++) {
      a += rng.range(-0.45, 0.45);
      r += rng.range(3, 6.5);
      pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]);
    }
    cracks.push(pts);
  }
  // los tajos: trazos de cuchillo (polilíneas con anchura que se afina en
  // las puntas). El anillo, abierto y desigual; la Y; tres puntos quemados
  const strokes = [];
  {
    const pts = [];
    const a0 = -Math.PI / 2 + 0.55,
      a1 = a0 + Math.PI * 2 - 1.0;
    for (let k = 0; k <= 26; k++) {
      const a = a0 + ((a1 - a0) * k) / 26;
      const r = 33 + Math.sin(a * 3 + 1) * 1.6 + rng.range(-0.8, 0.8);
      pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]);
    }
    strokes.push({ pts, w: 2.6 });
  }
  const jag = (ax, ay, bx, by, n = 5) => {
    const pts = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const nx = -(by - ay),
        ny = bx - ax,
        l = Math.hypot(nx, ny) || 1;
      const o = k === 0 || k === n ? 0 : rng.range(-1.1, 1.1);
      pts.push([ax + (bx - ax) * t + (nx / l) * o, ay + (by - ay) * t + (ny / l) * o]);
    }
    return pts;
  };
  strokes.push({ pts: jag(c + 0.5, c + 1, c - 1, c + 25), w: 2.8 });
  strokes.push({ pts: jag(c, c + 1, c - 19, c - 17), w: 2.5 });
  strokes.push({ pts: jag(c, c + 1, c + 18, c - 18), w: 2.5 });
  const dots = [
    [c + 1, c - 13, 3.2],
    [c - 13, c + 13, 2.8],
    [c + 13, c + 12, 3.0],
  ];
  const segD = (x, y, ax, ay, bx, by) => {
    const vx = bx - ax,
      vy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1)));
    return [Math.hypot(x - (ax + vx * t), y - (ay + vy * t)), t];
  };
  const cv = pixels(S, S, (x, y, o) => {
    const dx = x - c,
      dy = y - c;
    const r = Math.hypot(dx, dy);
    const n = fbm2(x / 9, y / 9, 3, 8, 471);
    const n2 = fbm2(x / 3.5, y / 3.5, 2, 8, 472);
    // distancia al tajo más cercano (con su anchura afinada en las puntas)
    let d = 99;
    for (const st of strokes) {
      const L = st.pts.length - 1;
      for (let k = 0; k < L; k++) {
        const [dd, t] = segD(x, y, st.pts[k][0], st.pts[k][1], st.pts[k + 1][0], st.pts[k + 1][1]);
        const u = (k + t) / L;
        const w = st.w * (0.35 + 0.65 * Math.sin(Math.min(1, u * 1.15) * Math.PI)) * (0.8 + n2 * 0.45);
        d = Math.min(d, dd - w);
      }
    }
    for (const [px, py, pr] of dots) d = Math.min(d, Math.hypot(x - px, y - py) - pr * (0.85 + n2 * 0.3));
    // vetas de fuego de las grietas
    let cr = 99,
      ct = 0;
    for (const pts of cracks)
      for (let k = 0; k < pts.length - 1; k++) {
        const [dd, t] = segD(x, y, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]);
        const tt = (k + t) / (pts.length - 1);
        const w = dd - (0.9 - tt * 0.7);
        if (w < cr) {
          cr = w;
          ct = tt;
        }
      }
    // la carne requemada alrededor: irregular, se deshace en la piel
    const edge = 50 + (n - 0.5) * 22;
    const burn = Math.max(0, Math.min(1, (edge - r) / 20));
    // cerca de los tajos, carbonizada
    const near = Math.exp(-Math.max(0, d) / 5);
    let col = [44 + n * 26 + n2 * 14, 16 + n * 10, 12 + n * 7];
    col = mix3(col, [14, 6, 5], near * 0.8);
    let al = burn * (0.55 + n2 * 0.25) + near * 0.35;
    // el tajo: brasa roja en el borde y blanca-amarilla en lo hondo
    const core = d < 0 ? Math.min(1, -d / 1.4) : 0;
    const rim = d < 0 ? 1 : Math.exp(-d / 1.4) * 0.8;
    const crack = cr < 0 ? (1 - ct * 0.7) * 0.85 : Math.exp(-cr / 1.1) * (1 - ct) * 0.5;
    const ember = Math.max(rim, crack);
    if (ember > 0.02) {
      col = mix3(col, [196, 52, 18], Math.min(1, ember));
      al = Math.max(al, ember * 0.95);
    }
    if (core > 0) col = mix3(col, [255, 178, 84], core * (0.75 + n2 * 0.25));
    if (r > 62) al = 0;
    set(o, col[0], col[1], col[2], Math.min(1, al) * 255);
  });
  return toTex(cv, { repeat: false, nearest: false });
};

export function getTexture(name) {
  if (cache.has(name)) return cache.get(name);
  let t;
  if (SPRITES[name]) t = SPRITES[name]();
  else if (GEN[name]) t = toTex(GEN[name]());
  else throw new Error('Textura desconocida: ' + name);
  cache.set(name, t);
  return t;
}

// Canvas crudo (para iconos de UI, etc.)
export function getCanvas(name) {
  return GEN[name]();
}

export function makeTextureFromCanvas(c, opts) {
  return toTex(c, opts);
}
