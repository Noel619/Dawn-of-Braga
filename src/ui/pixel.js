// Pixel art procedural para la interfaz: paleta, mapas de bits con contorno y
// tramado, texto nítido rasterizado con fuentes pixeladas y generadores de
// sprites (marcos de piedra y hierro, pergamino, estandartes, espadas, teclas,
// ornamentos y retícula). Todo se dibuja a resolución de arte y se amplía con
// escalado entero y vecino más próximo.

export const PAL = {
  void: '#060505',
  ink0: '#0d0b0a',
  ink1: '#16120f',
  ink2: '#1f1a16',
  ink3: '#2a231d',
  iron0: '#25221f',
  iron1: '#36312c',
  iron2: '#4d4640',
  iron3: '#6c645b',
  iron4: '#968c7f',
  iron5: '#c2b8a8',
  bone0: '#7a705e',
  bone1: '#a89c85',
  bone2: '#d6cbb4',
  bone3: '#f0e7d2',
  gold0: '#3a2710',
  gold1: '#6b4a1f',
  gold2: '#9c7432',
  gold3: '#d0a24c',
  gold4: '#f5d88a',
  gold5: '#fff6cf',
  blood0: '#2b0807',
  blood1: '#55100c',
  blood2: '#861b13',
  blood3: '#b8301f',
  blood4: '#e8603f',
  ember0: '#4a1d08',
  ember1: '#8a3c10',
  ember2: '#cf6d22',
  ember3: '#f2a445',
  ember4: '#ffe39a',
  parch0: '#4b3520',
  parch1: '#7a5c38',
  parch2: '#a88a5c',
  parch3: '#cdb688',
  parch4: '#e6d6ac',
  parch5: '#f4ead0',
  pink0: '#2a1a10',
  pink1: '#5a3a22',
  steel0: '#1d2027',
  steel1: '#394150',
  steel2: '#5f6b7e',
  steel3: '#93a0b3',
  steel4: '#cbd6e3',
  steel5: '#f4f9ff',
  wood0: '#24160c',
  wood1: '#3f2715',
  wood2: '#5f3d21',
  wood3: '#86592f',
  wood4: '#b07c46',
  glass0: '#0d2230',
  glass1: '#1c4660',
  glass2: '#2f7898',
  glass3: '#5fb4cf',
  glass4: '#b8ecf6',
  moss0: '#1d2410',
  moss1: '#36431c',
  moss2: '#56662b',
  moss3: '#7e8f40',
  moss4: '#b0bd6a',
  ruby0: '#3a0610',
  ruby1: '#7a0f1f',
  ruby2: '#c02035',
  ruby3: '#ff5a6a',
  ruby4: '#ffc0c0',
};

// ---------------------------------------------------------------- color
const _ci = new Map();
// '#rrggbb' -> entero RGBA empaquetado (little-endian, como ImageData)
export function C(hex, a = 255) {
  if (typeof hex === 'number') return hex;
  const k = hex + a;
  let v = _ci.get(k);
  if (v === undefined) {
    const n = parseInt(hex.slice(1), 16);
    v = ((a << 24) | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff)) >>> 0;
    _ci.set(k, v);
  }
  return v;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

export function hash(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function vnoise(x, y, s = 0) {
  const xi = Math.floor(x),
    yi = Math.floor(y);
  const fx = x - xi,
    fy = y - yi;
  const u = fx * fx * (3 - 2 * fx),
    v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, s),
    b = hash(xi + 1, yi, s),
    c = hash(xi, yi + 1, s),
    d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, s = 0, oct = 3) {
  let t = 0,
    a = 0.5,
    f = 1,
    n = 0;
  for (let i = 0; i < oct; i++) {
    t += vnoise(x * f, y * f, s + i * 17) * a;
    n += a;
    a *= 0.5;
    f *= 2;
  }
  return t / n;
}

// Elige un color de una rampa con tramado ordenado (t en 0..1).
export function ramp(cols, t, x, y) {
  const n = cols.length;
  const f = Math.max(0, Math.min(0.9999, t)) * (n - 1);
  const i = Math.floor(f);
  const r = f - i;
  return cols[Math.min(n - 1, i + (r > bayer(x, y) ? 1 : 0))];
}

// ---------------------------------------------------------------- mapa de bits
export class Bitmap {
  constructor(w, h) {
    this.w = Math.max(1, w | 0);
    this.h = Math.max(1, h | 0);
    this.d = new Uint32Array(this.w * this.h);
  }
  inb(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  get(x, y) {
    return this.inb(x, y) ? this.d[y * this.w + x] : 0;
  }
  on(x, y) {
    return this.get(x, y) >>> 24 > 0;
  }
  set(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (this.inb(x, y)) this.d[y * this.w + x] = C(c);
  }
  clear(x, y) {
    if (this.inb(x, y)) this.d[y * this.w + x] = 0;
  }
  rect(x, y, w, h, c) {
    const v = C(c);
    for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++) for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) this.d[j * this.w + i] = v;
  }
  hline(x0, x1, y, c) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c);
  }
  vline(x, y0, y1, c) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, c);
  }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0),
      dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1,
      sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) {
        e += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        e += dx;
        y0 += sy;
      }
    }
  }
  disc(cx, cy, r, c) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + r * 0.6) this.set(x, y, c);
  }
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.05) this.set(x, y, c);
  }
  // Polígono relleno (regla par-impar, muestreo en el centro del píxel).
  poly(pts, c) {
    let y0 = Infinity,
      y1 = -Infinity;
    for (const [, y] of pts) {
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const yc = y + 0.5;
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i],
          [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, c);
    }
  }
  // Copia los píxeles opacos de otro mapa de bits.
  blit(src, dx, dy, o = {}) {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const v = src.d[y * src.w + x];
        if (v >>> 24 === 0) continue;
        const tx = o.flipX ? dx + src.w - 1 - x : dx + x,
          ty = o.flipY ? dy + src.h - 1 - y : dy + y;
        if (this.inb(tx, ty)) this.d[ty * this.w + tx] = o.color !== undefined ? C(o.color) : v;
      }
    return this;
  }
  // Contorno de 1 px alrededor de lo opaco (en cruz o también en diagonal).
  outline(c, diag = false) {
    const v = C(c);
    const add = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.on(x, y)) continue;
        if (this.on(x - 1, y) || this.on(x + 1, y) || this.on(x, y - 1) || this.on(x, y + 1) || (diag && (this.on(x - 1, y - 1) || this.on(x + 1, y - 1) || this.on(x - 1, y + 1) || this.on(x + 1, y + 1)))) add.push(y * this.w + x);
      }
    for (const i of add) this.d[i] = v;
    return this;
  }
  // Sombra proyectada: copia desplazada en un color, por debajo de lo existente.
  shadow(c, dx = 1, dy = 1) {
    const v = C(c);
    const out = new Uint32Array(this.d);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (!this.on(x, y)) continue;
        const tx = x + dx,
          ty = y + dy;
        if (this.inb(tx, ty) && !this.on(tx, ty)) out[ty * this.w + tx] = v;
      }
    this.d = out;
    return this;
  }
  map(fn) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        const r = fn(x, y, this.d[i]);
        if (r !== undefined) this.d[i] = r === null ? 0 : C(r);
      }
    return this;
  }
  canvas() {
    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    this.paint(c.getContext('2d'));
    return c;
  }
  paint(g, x = 0, y = 0) {
    const img = new ImageData(new Uint8ClampedArray(this.d.buffer.slice(0)), this.w, this.h);
    g.putImageData(img, x, y);
  }
  url() {
    if (!this._url) this._url = this.canvas().toDataURL();
    return this._url;
  }
}

// ---------------------------------------------------------------- fuentes
// Cada fuente sólo es nítida a múltiplos enteros de su rejilla (medida en px).
export const FONTS = {
  bastarda: { family: 'Bastarda', grid: 13 },
  hand: { family: 'Handjet', grid: 17 },
  small: { family: 'Silkscreen', grid: 8 },
  gothic: { family: 'Jacquard24', grid: 43 },
  gothic12: { family: 'Jacquard12', grid: 21 },
};
// Espera a que las fuentes incrustadas estén listas (se llama antes de arrancar).
let _fonts = null;
export function loadFonts() {
  if (!_fonts)
    _fonts = document.fonts
      ? Promise.race([Promise.all(Object.values(FONTS).map((f) => document.fonts.load(`${f.grid}px ${f.family}`, 'AaÑñ¿?0'))), new Promise((r) => setTimeout(r, 4000))]).catch(() => {})
      : Promise.resolve();
  return _fonts;
}

const _mc = typeof document !== 'undefined' ? document.createElement('canvas') : null;
// Máscara de un texto a su tamaño nativo: ancho, alto, línea base y bits.
export function textMask(str, font = 'bastarda', mult = 1) {
  const F = FONTS[font];
  const size = F.grid * mult;
  const g = _mc.getContext('2d', { willReadFrequently: true });
  g.font = `${size}px ${F.family}`;
  const w = Math.ceil(g.measureText(str).width) + 4;
  const h = Math.ceil(size * 1.6) + 4;
  _mc.width = Math.max(1, w);
  _mc.height = h;
  g.font = `${size}px ${F.family}`;
  g.fillStyle = '#fff';
  g.textBaseline = 'alphabetic';
  const base = Math.round(size * 1.15) + 2;
  g.fillText(str, 2, base);
  const d = g.getImageData(0, 0, w, h).data;
  let x0 = w,
    y0 = h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] >= 110) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) return { w: 1, h: 1, base: 0, bits: new Uint8Array(1), adv: w - 4 };
  // se conserva la caja vertical completa para alinear líneas entre sí
  const top = Math.max(0, Math.min(y0, base - Math.round(size * 0.9)));
  const xs = Math.min(x0, 2);
  const bw = x1 - xs + 1,
    bh = Math.min(h - 1, Math.max(y1, base + Math.round(size * 0.25))) - top + 1;
  const bits = new Uint8Array(bw * bh);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) bits[y * bw + x] = d[((y + top) * w + (x + xs)) * 4 + 3] >= 110 ? 1 : 0;
  return { w: bw, h: bh, base: base - top, bits, adv: bw };
}

// Texto como sprite: relleno liso o en degradado vertical, contorno, sombra.
export function textBitmap(str, font = 'bastarda', o = {}) {
  const m = textMask(str, font, o.mult ?? 1);
  const pad = (o.outline ? 1 : 0) + (o.shadow ? 1 : 0) + (o.glow ? 2 : 0);
  const b = new Bitmap(m.w + pad * 2, m.h + pad * 2);
  const grad = o.grad;
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++) {
      if (!m.bits[y * m.w + x]) continue;
      const col = grad ? ramp(grad, y / Math.max(1, m.h - 1), x, y) : o.color || PAL.bone2;
      b.set(x + pad, y + pad, col);
    }
  if (o.hilite) {
    // brillo en el borde superior de cada trazo
    b.map((x, y, v) => (v >>> 24 && !b.on(x, y - 1) ? o.hilite : undefined));
  }
  if (o.outline) b.outline(o.outline, !!o.diag);
  if (o.shadow) b.shadow(o.shadow, 1, 1);
  if (o.glow) {
    b.outline(o.glow);
    const g2 = o.glow2 || o.glow;
    const snap = new Uint32Array(b.d);
    for (let y = 0; y < b.h; y++)
      for (let x = 0; x < b.w; x++) {
        if (snap[y * b.w + x] >>> 24) continue;
        let n = false;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const tx = x + dx,
            ty = y + dy;
          if (tx >= 0 && tx < b.w && ty >= 0 && ty < b.h && snap[ty * b.w + tx] >>> 24) n = true;
        }
        if (n && bayer(x, y) < 0.5) b.d[y * b.w + x] = C(g2);
      }
  }
  b.base = m.base + pad;
  return b;
}

// ---------------------------------------------------------------- marcos
// Panel de hierro y piedra oscura, con esquineras doradas y remaches.
export function panelBitmap(w, h, o = {}) {
  const P = PAL;
  const b = new Bitmap(w, h);
  const seed = o.seed ?? 7;
  // fondo: piedra oscura con vetas suaves
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const n = fbm(x * 0.06, y * 0.09, seed) * 0.8 + hash(x, y, seed) * 0.2;
      const v = y / h; // un poco más oscuro abajo
      b.d[y * w + x] = C(ramp([P.ink0, P.ink1, P.ink2, P.ink3], 0.25 + (n - 0.5) * 0.7 - v * 0.18, x, y), o.alpha ?? 246);
    }
  // banda de hierro: exterior negro, bisel claro arriba-izquierda
  const B = o.border ?? 4;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = Math.min(x, y, w - 1 - x, h - 1 - y);
      if (d >= B) continue;
      let c;
      if (d === 0) c = P.void;
      else if (d === B - 1) c = P.ink0;
      else {
        const tl = x <= y ? x < w - 1 - x : y < h - 1 - y; // lado superior o izquierdo
        const lightSide = (d === x || d === y) && tl;
        const n = hash(x >> 1, y >> 1, seed + 3);
        c = d === 1 ? (lightSide ? P.iron3 : P.iron1) : lightSide ? P.iron2 : P.iron1;
        if (n > 0.9) c = P.iron0;
      }
      b.d[y * w + x] = C(c);
    }
  // filete dorado interior
  if (o.gold !== false) {
    const g = B + 1;
    for (let x = g + 6; x < w - g - 6; x++) {
      if ((x & 1) === 0) {
        b.set(x, g, P.gold1);
        b.set(x, h - 1 - g, P.gold0);
      }
    }
    for (let y = g + 6; y < h - g - 6; y++) {
      if ((y & 1) === 0) {
        b.set(g, y, P.gold1);
        b.set(w - 1 - g, y, P.gold0);
      }
    }
  }
  // remaches
  const riv = (x, y) => {
    b.set(x, y, P.iron4);
    b.set(x + 1, y, P.iron3);
    b.set(x, y + 1, P.iron3);
    b.set(x + 1, y + 1, P.iron0);
  };
  const step = 22;
  for (let x = 14; x < w - 14; x += step) {
    riv(x, 1);
    riv(x, h - 3);
  }
  for (let y = 14; y < h - 14; y += step) {
    riv(1, y);
    riv(w - 3, y);
  }
  // esquineras
  const corner = cornerBitmap();
  b.blit(corner, 0, 0);
  b.blit(corner, w - corner.w, 0, { flipX: true });
  b.blit(corner, 0, h - corner.h, { flipY: true });
  b.blit(corner, w - corner.w, h - corner.h, { flipX: true, flipY: true });
  // blasón central arriba
  if (o.crest) {
    const cr = crestBitmap();
    b.blit(cr, Math.floor((w - cr.w) / 2), 0);
  }
  return b;
}

let _corner = null;
export function cornerBitmap() {
  if (_corner) return _corner;
  const P = PAL;
  const b = new Bitmap(13, 13);
  // escuadra dorada con bisel y un rombo en el ángulo interior
  for (let i = 0; i < 12; i++) {
    b.set(i, 1, P.gold3);
    b.set(i, 2, P.gold2);
    b.set(i, 3, P.gold1);
    b.set(1, i, P.gold3);
    b.set(2, i, P.gold2);
    b.set(3, i, P.gold1);
  }
  b.set(1, 1, P.gold4);
  b.set(2, 2, P.gold4);
  // remate en punta de flecha en los extremos
  for (const [x, y] of [
    [12, 2],
    [11, 1],
    [11, 3],
  ])
    b.set(x, y, P.gold2);
  for (const [x, y] of [
    [2, 12],
    [1, 11],
    [3, 11],
  ])
    b.set(x, y, P.gold2);
  // rombo con rubí
  const cx = 6,
    cy = 6;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 2) b.set(cx + dx, cy + dy, Math.abs(dx) + Math.abs(dy) === 2 ? P.gold2 : P.gold3);
  b.set(cx, cy, P.ruby2);
  b.set(cx - 1, cy, P.ruby1);
  b.set(cx, cy - 1, P.ruby3);
  b.outline(P.void);
  _corner = b;
  return b;
}

let _crest = null;
export function crestBitmap() {
  if (_crest) return _crest;
  const P = PAL;
  const b = new Bitmap(21, 9);
  // pequeño remate: rombo grande con alas
  const cx = 10;
  for (let dy = 0; dy <= 8; dy++)
    for (let dx = -4; dx <= 4; dx++) {
      const d = Math.abs(dx) + Math.abs(dy - 4);
      if (d <= 4) b.set(cx + dx, dy, d === 4 ? P.gold2 : d >= 3 ? P.gold3 : P.gold1);
    }
  b.set(cx, 4, P.ruby2);
  b.set(cx, 3, P.ruby3);
  b.set(cx - 1, 4, P.ruby1);
  b.set(cx + 1, 4, P.ruby1);
  b.set(cx, 5, P.ruby1);
  for (let i = 5; i < 10; i++) {
    b.set(cx - i, 4, i & 1 ? P.gold3 : P.gold2);
    b.set(cx + i, 4, i & 1 ? P.gold3 : P.gold2);
  }
  b.set(cx - 5, 3, P.gold4);
  b.set(cx + 5, 3, P.gold4);
  b.outline(P.void);
  _crest = b;
  return b;
}

// Pergamino con bordes rasgados, quemaduras, manchas y fibras.
export function parchmentBitmap(w, h, seed = 3) {
  const P = PAL;
  const b = new Bitmap(w, h);
  const cols = [P.parch0, P.parch1, P.parch2, P.parch3, P.parch4, P.parch5];
  const stains = [];
  for (let i = 0; i < 5; i++) stains.push([hash(i, 1, seed) * w, hash(i, 2, seed) * h, 6 + hash(i, 3, seed) * Math.min(w, h) * 0.12]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dl = x,
        dr = w - 1 - x,
        dt = y,
        db = h - 1 - y;
      const d = Math.min(dl, dr, dt, db);
      const along = d === dl || d === dr ? y : x;
      const side = d === dl ? 1 : d === dr ? 2 : d === dt ? 3 : 4;
      // borde rasgado: ondulación + dentelladas
      const tear = 1.2 + vnoise(along * 0.22, side * 7, seed) * 3.2 + (hash(along >> 2, side, seed) > 0.93 ? 2.5 : 0);
      if (d < tear) continue;
      const k = d - tear;
      const burn = Math.max(0, 1 - k / 10);
      let t = 0.62 + (fbm(x * 0.045, y * 0.045, seed) - 0.5) * 0.45 + (hash(x, y, seed) - 0.5) * 0.08 - burn * burn * 0.75;
      for (const [sx, sy, sr] of stains) {
        const r = Math.hypot(x - sx, (y - sy) * 1.2);
        if (r < sr) t -= 0.08 + (Math.abs(r - sr * 0.85) < 1.2 ? 0.12 : 0);
      }
      // fibras horizontales
      if (hash(x >> 3, y, seed + 9) > 0.965) t -= 0.07;
      b.d[y * w + x] = C(ramp(cols, t, x, y));
    }
  // borde oscuro de 1 px siguiendo el rasgado
  const snap = new Uint32Array(b.d);
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && snap[y * w + x] >>> 24 > 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on(x, y) && (!on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1))) b.d[y * w + x] = C(P.parch0);
  return b;
}

// Banda de tela con los extremos deshilachados (fondos de avisos y selección).
export function bannerBitmap(w, h, kind = 'dark') {
  const P = PAL;
  const b = new Bitmap(w, h);
  const fade = Math.min(28, Math.floor(w / 4));
  const K = {
    dark: { top: P.ink3, mid: [P.ink0, P.ink1, P.ink2], bot: P.void, a: 235 },
    ember: { top: P.ember1, mid: [P.blood0, P.blood1, P.blood2], bot: P.blood0, a: 240 },
    gold: { top: P.gold2, mid: [P.gold0, P.gold1, P.gold1], bot: P.gold0, a: 240 },
  }[kind];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const e = Math.min(x, w - 1 - x);
      const fr = hash(0, y, 5) * 6; // flecos
      if (e < fade && (e - fr) / fade < bayer(x, y)) continue;
      let c;
      if (y === 0) c = K.top;
      else if (y === h - 1) c = K.bot;
      else c = ramp(K.mid, 0.9 - (y / h) * 0.8 + (fbm(x * 0.08, y * 0.3, 11) - 0.5) * 0.3, x, y);
      b.d[y * w + x] = C(c, K.a);
    }
  return b;
}

// Separador ornamental con rombo central.
export function dividerBitmap(w, o = {}) {
  const P = PAL;
  const h = 7;
  const b = new Bitmap(w, h);
  const cx = Math.floor(w / 2),
    cy = 3;
  for (let x = 0; x < w; x++) {
    const e = Math.abs(x - cx) / (w / 2);
    if (e > bayer(x, 0) * 0.35 + 0.65 && e > 0.72) continue;
    b.set(x, cy, e < 0.5 ? P.gold3 : P.gold2);
    if (e < 0.35) b.set(x, cy + 1, P.gold1);
  }
  for (const s of [-1, 1]) {
    const dx = Math.floor(w * 0.18) * s;
    b.set(cx + dx, cy - 1, P.gold3);
    b.set(cx + dx, cy + 1, P.gold1);
  }
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (Math.abs(dx) + Math.abs(dy) <= 3) b.set(cx + dx, cy + dy, Math.abs(dx) + Math.abs(dy) === 3 ? P.gold2 : P.gold3);
  b.set(cx, cy, o.gem ?? P.ruby2);
  b.set(cx, cy - 1, P.ruby3);
  b.set(cx, cy + 1, P.ruby1);
  b.outline(P.void);
  return b;
}

// ---------------------------------------------------------------- espadas
// Espada horizontal apuntando a la derecha (cursor de menú).
export function cursorSword() {
  const P = PAL;
  const b = new Bitmap(24, 9);
  const c = 4;
  // pomo con gema
  b.disc(2, c, 1.3, P.gold2);
  b.set(2, c, P.ruby2);
  b.set(1, c - 1, P.gold4);
  // empuñadura con cuero trenzado
  for (let x = 4; x <= 7; x++) {
    b.set(x, c - 1, (x & 1) ? P.wood3 : P.wood2);
    b.set(x, c, (x & 1) ? P.wood2 : P.wood3);
    b.set(x, c + 1, P.wood1);
  }
  // guarda con gavilanes curvados
  for (let y = c - 3; y <= c + 3; y++) b.set(8, y, y < c ? P.gold3 : P.gold2);
  b.set(9, c - 3, P.gold2);
  b.set(9, c + 3, P.gold1);
  b.set(8, c - 3, P.gold4);
  b.set(9, c, P.gold3);
  // hoja con vaceo y filo brillante
  for (let x = 10; x <= 21; x++) {
    b.set(x, c - 1, P.steel5);
    b.set(x, c, x < 18 ? P.steel2 : P.steel3);
    b.set(x, c + 1, P.steel3);
  }
  b.set(22, c, P.steel4);
  b.set(21, c + 1, P.steel2);
  b.outline(P.void);
  return b;
}

// Gran espada vertical clavada (portada), estilo pixel art con contorno.
export function greatSword(len = 118) {
  const P = PAL;
  const W = 41;
  const b = new Bitmap(W, len);
  const cx = 20;
  const pom = 8,
    grip = 22,
    guard = 7;
  const gy = pom + grip; // fila de la guarda
  const bladeTop = gy + guard;
  const tip = 14;
  // pomo: disco con rubí y aro dorado
  b.disc(cx, 4, 4.2, P.gold1);
  b.disc(cx, 4, 3.3, P.gold2);
  b.disc(cx - 1, 3, 1.6, P.gold3);
  b.disc(cx, 4, 1.8, P.ruby1);
  b.set(cx, 4, P.ruby2);
  b.set(cx - 1, 3, P.ruby3);
  b.set(cx - 2, 1, P.gold4);
  // empuñadura: cuero con tiras en diagonal
  for (let y = pom + 1; y < gy; y++)
    for (let dx = -2; dx <= 2; dx++) {
      const band = (y + dx + 64) % 4 < 2;
      const c = dx === -2 ? P.wood2 : dx === 2 ? P.wood0 : band ? P.wood3 : P.wood1;
      b.set(cx + dx, y, c);
    }
  for (let dx = -3; dx <= 3; dx++) {
    b.set(cx + dx, pom, dx < 0 ? P.gold3 : P.gold2);
    b.set(cx + dx, gy - 1, dx < 0 ? P.gold2 : P.gold1);
  }
  // guarda: barra con bisel y gavilanes curvados hacia la hoja
  for (let y = gy; y < gy + guard - 2; y++)
    for (let x = cx - 17; x <= cx + 17; x++) {
      const r = y - gy;
      const e = Math.abs(x - cx);
      if (e > 17 - (r === 0 || r === guard - 3 ? 1 : 0)) continue;
      b.set(x, y, r === 0 ? P.gold4 : r === 1 ? P.gold3 : r === guard - 3 ? P.gold1 : P.gold2);
    }
  for (const s of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      b.set(cx + s * (17 - (k >> 1)), gy + guard - 3 + k, k < 2 ? P.gold2 : P.gold1);
      b.set(cx + s * (16 - (k >> 1)), gy + guard - 3 + k, P.gold3);
    }
    b.disc(cx + s * 14, gy + guard + 1, 1.2, P.gold2);
  }
  // rubí central de la guarda
  b.rect(cx - 2, gy, 5, guard - 1, P.gold3);
  b.set(cx, gy + 2, P.ruby2);
  b.set(cx - 1, gy + 2, P.ruby1);
  b.set(cx + 1, gy + 2, P.ruby1);
  b.set(cx, gy + 1, P.ruby3);
  b.set(cx, gy + 3, P.ruby1);
  // hoja: columnas sombreadas con vaceo central y punta
  const half = 4;
  for (let y = bladeTop; y < len - 1; y++) {
    const t = (y - (len - 1 - tip)) / tip;
    const hw = t > 0 ? Math.round(half * (1 - t)) : half;
    for (let dx = -hw; dx <= hw; dx++) {
      let c;
      if (dx === -hw) c = P.steel5;
      else if (dx === hw) c = P.steel1;
      else if (dx === 0) c = t > 0.3 ? P.steel3 : P.steel2;
      else if (dx < 0) c = dx === -hw + 1 ? P.steel4 : P.steel3;
      else c = dx === hw - 1 ? P.steel2 : P.steel3;
      b.set(cx + dx, y, c);
    }
    if (y > bladeTop + 2 && t <= 0.2) b.set(cx, y, (y & 3) === 0 ? P.steel1 : P.steel2); // vaceo
  }
  b.set(cx, len - 1, P.steel3);
  // mellas y sangre seca
  for (const y of [bladeTop + 30, bladeTop + 47, bladeTop + 61]) b.clear(cx + half, y);
  for (let k = 0; k < 7; k++) b.set(cx + half - (k % 2), bladeTop + 52 + k, k % 3 ? P.blood2 : P.blood1);
  // destellos
  for (const [x, y] of [
    [cx - 3, bladeTop + 8],
    [cx - 3, bladeTop + 9],
    [cx - 2, bladeTop + 8],
  ])
    b.set(x, y, P.steel5);
  b.outline(P.void);
  return b;
}

// ---------------------------------------------------------------- piezas pequeñas
const PAD_COL = { A: PAL.moss4, B: PAL.blood4, X: PAL.glass3, Y: PAL.gold4 };
const _keys = new Map();
// Los clics, por su rótulo: qué botón del ratón se enciende.
const MOUSE_BTN = { 'Clic izq.': 'l', 'Clic der.': 'r', 'Clic central': 'm', Ratón: '' };

// Tecla o botón del mando con su rótulo. Los clics se dibujan como un ratón
// con el botón que hay que pulsar encendido y, en el mando, los botones de
// los hombros, los gatillos, los sticks y los del centro tienen su forma.
// alt: el otro fotograma del aviso que parpadea (la tecla hundida, el botón
// del ratón al rojo blanco): ver keyBlinkHtml.
export function keyBitmap(label, pad = false, alt = false) {
  const k = label + (pad ? ':p' : '') + (alt ? ':a' : '');
  if (_keys.has(k)) return _keys.get(k);
  let b;
  if (label in MOUSE_BTN) b = mouseBitmap(MOUSE_BTN[label], alt);
  else if (pad && /^[LR][BT]$/.test(label)) b = shoulderBitmap(label, alt);
  else if (pad && /^([LR]3|Stick (izq|der)\.)$/.test(label)) b = stickBitmap(label[0] === 'R' || /der/.test(label) ? 'R' : 'L', alt);
  else if (pad && (label === 'View' || label === 'Start')) b = menuBtnBitmap(label, alt);
  else b = capBitmap(label, pad, alt);
  _keys.set(k, b);
  return b;
}

// La tecla (o el botón) parpadeando entre sus dos fotogramas: para los avisos
// que piden pulsar ya (QTE).
export const keyBlinkHtml = (label, pad = false, scale = 1) => `<span class="kblink">${spriteHtml(keyBitmap(label, pad), scale)}${spriteHtml(keyBitmap(label, pad, true), scale, 'k2')}</span>`;

// Tecla con relieve (o botón redondo del mando): cara clara arriba y canto
// oscuro abajo. Hundida, la cara baja un píxel y se aclara.
function capBitmap(label, pad, pressed) {
  const P = PAL;
  // «␣»: la barra espaciadora en corto, con su símbolo (donde no cabe el rótulo)
  const space = label === '␣';
  const t = space ? null : textBitmap(label.toUpperCase(), 'small', { color: pad && PAD_COL[label] ? PAD_COL[label] : P.bone3 });
  const round = pad && label.length === 1 && !space;
  const w = round ? 13 : space ? 19 : Math.max(12, t.w + 5),
    h = 13;
  // (los redondos no bajan: se aclaran)
  const o = pressed && !round ? 1 : 0;
  const b = new Bitmap(w, h + 1);
  for (let y = o; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (round) {
        if ((x - 6) ** 2 + (y - 6) ** 2 > 40) continue;
      } else if ((x === 0 || x === w - 1) && (y === o || y === h - 1)) continue;
      const f = y - o;
      const c = y >= h - 3 + o ? P.iron0 : f === 0 || x === 0 ? (pressed ? P.iron5 : P.iron4) : f < 4 ? (pressed ? P.iron4 : P.iron3) : pressed ? P.iron3 : P.iron2;
      b.set(x, y, c);
    }
  if (space) {
    for (let x = 4; x <= w - 5; x++) b.set(x, 7 + o, P.bone3);
    for (const x of [4, w - 5]) b.rect(x, 5 + o, 1, 2, P.bone3);
  } else b.blit(t, Math.floor((w - t.w) / 2), 2 + o);
  b.outline(P.void);
  return b;
}

// Pieza con relieve de forma libre (in(x, y): si el píxel es de la pieza, en
// una caja de w x h): cara con brillo arriba y a la izquierda, canto oscuro
// abajo. Deja un píxel de margen para el contorno.
function reliefBitmap(w, h, inside, pressed) {
  const P = PAL;
  const o = pressed ? 1 : 0;
  const b = new Bitmap(w + 2, h + 2);
  const at = (x, y) => y >= o && inside(x, y - o, h - o);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      const f = y - o;
      const c = y >= h - 3 + o ? P.iron0 : !at(x, y - 1) || !at(x - 1, y) ? (pressed ? P.iron5 : P.iron4) : f < 4 ? (pressed ? P.iron4 : P.iron3) : pressed ? P.iron3 : P.iron2;
      b.set(x + 1, y + 1, c);
    }
  return b;
}

// Ratón visto desde arriba: l y r, los botones; m, la raya entre ellos; w, la
// rueda; -, la junta con el cuerpo (b).
const MOUSE = [
  '..lllmrrr..',
  '.llllmrrrr.',
  'lllllmrrrrr',
  'lllllwrrrrr',
  'lllllwrrrrr',
  'lllllmrrrrr',
  'lllllmrrrrr',
  '-----------',
  'bbbbbbbbbbb',
  'bbbbbbbbbbb',
  'bbbbbbbbbbb',
  'bbbbbbbbbbb',
  'bbbbbbbbbbb',
  '.bbbbbbbbb.',
  '..bbbbbbb..',
];
function mouseBitmap(btn, flash) {
  const P = PAL;
  const H = MOUSE.length,
    W = MOUSE[0].length;
  const at = (x, y) => (MOUSE[y] && MOUSE[y][x]) || '.';
  const b = new Bitmap(W + 2, H + 2);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const ch = at(x, y);
      if (ch === '.') continue;
      const edgeL = at(x - 1, y) === '.',
        edgeR = at(x + 1, y) === '.';
      let c;
      if (ch === 'l' || ch === 'r') {
        // el botón que se pulsa, en ascua (al pulsarse, al rojo blanco); con
        // brillo arriba y a la izquierda
        const on = btn === ch;
        const [lo, mid, hi] = on ? (flash ? [P.ember3, P.ember4, P.gold5] : [P.ember2, P.ember3, P.ember4]) : [P.iron3, P.iron4, P.iron5];
        c = at(x, y - 1) === '.' || edgeL ? hi : edgeR || at(x, y + 1) === '-' || 'mw'.includes(at(x + 1, y)) ? lo : mid;
      } else if (ch === 'w') c = btn === 'm' ? (at(x, y - 1) === 'w' ? (flash ? P.ember3 : P.ember2) : flash ? P.gold5 : P.ember4) : at(x, y - 1) === 'w' ? P.iron0 : P.bone1;
      else if (ch === 'm') c = btn === 'm' ? P.ember1 : P.iron1;
      else if (ch === '-') c = P.iron0;
      else c = edgeL ? P.iron4 : edgeR || y >= H - 2 ? P.iron1 : at(x, y - 1) === '-' ? P.iron3 : P.iron2;
      b.set(x + 1, y + 1, c);
    }
  b.outline(P.void);
  return b;
}

// Botones de los hombros (LB, RB: la esquina de fuera muy redondeada) y
// gatillos (LT, RT: más altos, redondos arriba y estrechándose por dentro).
function shoulderBitmap(label, pressed) {
  const P = PAL;
  const trig = label[1] === 'T',
    right = label[0] === 'R';
  const t = textBitmap(label, 'small', { color: P.bone3 });
  const w = Math.max(trig ? 13 : 15, t.w + (trig ? 5 : 6)),
    h = trig ? 15 : 12;
  const inside = (x, y, hh) => {
    if (x < 0 || x >= w || y < 0 || y >= hh) return false;
    const e = right ? w - 1 - x : x, // columnas desde el lado de fuera
      i = w - 1 - e; // y desde el de dentro
    if (trig) {
      if ((y === 0 && (e < 4 || i < 2)) || (y === 1 && (e < 2 || i < 1)) || (y === 2 && e < 1)) return false;
      // abajo se estrecha por dentro
      if (y >= hh - 4 && i < y - (hh - 5)) return false;
      return !(y === hh - 1 && e < 1);
    }
    if ((y === 0 && (e < 5 || i < 1)) || (y === 1 && e < 3) || (y === 2 && e < 1)) return false;
    return !(y === hh - 1 && (e < 1 || i < 1));
  };
  const b = reliefBitmap(w, h, inside, pressed);
  const o = pressed ? 1 : 0;
  b.blit(t, 1 + Math.floor((w - t.w) / 2) + (trig ? (right ? -1 : 1) : right ? -1 : 1), 1 + (trig ? 5 : 3) + o);
  b.outline(P.void);
  return b;
}

// Stick: la base, el borde de la seta y su hueco, con la letra del lado.
function stickBitmap(side, pressed) {
  const P = PAL;
  const S = 13,
    c0 = 6;
  const b = new Bitmap(S + 2, S + 2);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const d2 = (x - c0) ** 2 + (y - c0) ** 2;
      if (d2 > 40) continue;
      const up = y < c0 || (y === c0 && x < c0);
      let c;
      if (d2 > 30) c = y > 9 ? P.void : P.iron1;
      else if (d2 > 17) c = up ? (pressed ? P.iron5 : P.iron4) : pressed ? P.iron4 : P.iron3;
      else c = up ? (pressed ? P.iron3 : P.iron1) : pressed ? P.iron4 : P.iron2;
      b.set(x + 1, y + 1, c);
    }
  const t = textBitmap(side, 'small', { color: pressed ? P.gold4 : P.bone3 });
  b.blit(t, 1 + Math.floor((S - t.w) / 2) + 1, 1 + Math.floor((S - t.h) / 2) + 1);
  b.outline(P.void);
  return b;
}

// Botones del centro del mando: View (dos ventanas) y Start (tres rayas).
function menuBtnBitmap(label, pressed) {
  const P = PAL;
  const w = 15,
    h = 10;
  const inside = (x, y, hh) => x >= 0 && x < w && y >= 0 && y < hh && !((x < 2 || x > w - 3) && (y === 0 || y === hh - 1)) && !((x < 1 || x > w - 2) && (y === 1 || y === hh - 2));
  const b = reliefBitmap(w, h, inside, pressed);
  const o = pressed ? 1 : 0,
    ic = pressed ? P.gold4 : P.bone3;
  const cx = 1 + Math.floor(w / 2);
  if (label === 'Start') for (const y of [2, 4, 6]) b.rect(cx - 3, 1 + y + o - 1, 7, 1, ic);
  else {
    // dos ventanas solapadas
    const box = (x0, y0) => {
      b.rect(x0, y0, 5, 1, ic);
      b.rect(x0, y0 + 3, 5, 1, ic);
      b.rect(x0, y0, 1, 4, ic);
      b.rect(x0 + 4, y0, 1, 4, ic);
    };
    box(cx - 4, 1 + 1 + o);
    box(cx - 1, 1 + 3 + o);
  }
  b.outline(P.void);
  return b;
}

// Retícula de fijado: cuatro escuadras y un punto.
export function reticleBitmap() {
  const P = PAL;
  const b = new Bitmap(15, 15);
  const L = [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [0, 2],
  ];
  for (const [sx, sy] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ])
    for (const [x, y] of L) b.set(7 + sx * (5 - x), 7 + sy * (5 - y), P.bone3);
  b.set(7, 7, P.ember4);
  b.set(6, 7, P.ember2);
  b.set(8, 7, P.ember2);
  b.set(7, 6, P.ember2);
  b.set(7, 8, P.ember2);
  b.outline(P.blood1);
  return b;
}

// Casilla de inventario (hundida; dorada si está seleccionada).
export function slotBitmap(s, sel = false) {
  const P = PAL;
  const b = new Bitmap(s, s);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const d = Math.min(x, y, s - 1 - x, s - 1 - y);
      let c;
      if (d === 0) c = sel ? P.gold3 : P.iron1;
      else if (d === 1) c = sel ? P.gold1 : x === 1 || y === 1 ? P.void : P.iron2;
      else {
        const g = sel ? Math.max(0, 1 - Math.hypot(x - s / 2, y - s / 2) / (s * 0.55)) : 0;
        c = g > 0 ? ramp([P.ink1, P.ember0, P.ember1], g * 0.8, x, y) : ramp([P.ink0, P.ink1, P.ink2], 0.35 + (y / s) * 0.3, x, y);
      }
      b.set(x, y, c);
    }
  if (sel)
    for (const [x, y] of [
      [0, 0],
      [s - 1, 0],
      [0, s - 1],
      [s - 1, s - 1],
    ])
      b.set(x, y, P.gold4);
  return b;
}

// Flecha pequeña (◄ ►) para opciones.
export function arrowBitmap(dir = 1, col = PAL.gold3) {
  const b = new Bitmap(5, 7);
  for (let i = 0; i < 4; i++) for (let y = 3 - i; y <= 3 + i; y++) b.set(dir > 0 ? 3 - i : i, y, col);
  b.outline(PAL.void);
  return b;
}

// Vela encendida o apagada (interruptores de opciones).
export function candleBitmap(lit) {
  const P = PAL;
  const b = new Bitmap(9, 15);
  b.rect(3, 6, 3, 8, P.bone2);
  b.vline(3, 6, 13, P.bone3);
  b.vline(5, 6, 13, P.bone1);
  b.rect(1, 13, 7, 2, P.iron2);
  b.hline(1, 7, 13, P.iron3);
  b.set(4, 5, P.void);
  if (lit) {
    b.set(4, 1, P.ember3);
    b.rect(3, 2, 3, 3, P.ember2);
    b.set(4, 3, P.ember4);
    b.set(4, 2, P.ember3);
    b.set(4, 4, P.ember4);
  } else {
    b.set(5, 3, P.iron3);
    b.set(4, 1, P.iron2);
  }
  b.outline(P.void);
  return b;
}

// Muesca de regleta (barras de volumen, etc.).
export function notchBitmap(on) {
  const P = PAL;
  const b = new Bitmap(5, 11);
  for (let y = 1; y < 10; y++)
    for (let x = 1; x < 4; x++) {
      const c = on ? (y < 3 ? P.ember4 : y < 6 ? P.ember3 : P.ember2) : y < 3 ? P.iron2 : P.iron1;
      b.set(x, y, c);
    }
  b.outline(P.void);
  return b;
}

// ---------------------------------------------------------------- DOM
// Escala de la interfaz: px CSS por píxel de arte y multiplicador de texto.
// El texto va ligado al arte: su píxel es (u-1)/u del píxel de la interfaz.
export function uiScale() {
  const h = innerHeight,
    w = innerWidth;
  const u = Math.max(1, Math.min(Math.round(h / 360), Math.floor(w / 400)));
  const m = Math.max(1, u - 1);
  // alto de una fila de menú (en píxeles de arte) según el cuerpo de la bastarda
  const ih = Math.ceil((15 * (m + 1)) / u) + 2;
  return { u, m, ih };
}

// <img> con un mapa de bits ampliado sin suavizado.
// scale: múltiplo del píxel de arte (--u) con el que se muestra.
export function spriteImg(bm, scale = 1, cls = '') {
  const im = new Image();
  im.src = bm.url();
  im.className = ('spr ' + cls).trim();
  im.style.width = `calc(var(--u) * ${bm.w * scale})`;
  im.style.height = `calc(var(--u) * ${bm.h * scale})`;
  im.draggable = false;
  im.alt = '';
  return im;
}
export const spriteHtml = (bm, scale = 1, cls = '') => `<img class="spr ${cls}" alt="" draggable="false" src="${bm.url()}" style="width:calc(var(--u) * ${bm.w * scale});height:calc(var(--u) * ${bm.h * scale})">`;

// Fondo pixel art para un elemento de tamaño variable: un lienzo detrás del
// contenido que se redibuja a resolución de arte cuando cambia el tamaño.
export function attachBackdrop(el, draw, getU) {
  let cv = el.querySelector(':scope > canvas.pxbg');
  if (!cv) {
    cv = document.createElement('canvas');
    cv.className = 'pxbg';
    el.prepend(cv);
  }
  let last = '';
  const redraw = () => {
    const u = getU();
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const w = Math.max(8, Math.round(r.width / u)),
      h = Math.max(8, Math.round(r.height / u));
    const key = w + 'x' + h + 'x' + u;
    if (key === last) return;
    last = key;
    const bm = draw(w, h);
    cv.width = bm.w;
    cv.height = bm.h;
    bm.paint(cv.getContext('2d'));
    cv.style.width = bm.w * u + 'px';
    cv.style.height = bm.h * u + 'px';
  };
  const ro = new ResizeObserver(redraw);
  ro.observe(el);
  el._pxRO = ro;
  el._pxRedraw = () => {
    last = '';
    redraw();
  };
  return el._pxRedraw;
}
