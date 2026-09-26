// Utilidades matemáticas, RNG determinista y ruido procedural.

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp01((v - a) / (b - a));
export const smoothstep = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
// Amortiguación independiente del framerate.
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export function wrapAngle(a) {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}
export const angleDiff = (a, b) => wrapAngle(b - a);
export function dampAngle(a, b, lambda, dt) {
  return a + angleDiff(a, b) * (1 - Math.exp(-lambda * dt));
}
export function approachAngle(a, b, maxStep) {
  const d = angleDiff(a, b);
  if (Math.abs(d) <= maxStep) return b;
  return a + Math.sign(d) * maxStep;
}
export const dist2 = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);

// ---------- RNG ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed = 1) {
    this.f = mulberry32(seed);
  }
  next() {
    return this.f();
  }
  range(a, b) {
    return a + (b - a) * this.f();
  }
  int(a, b) {
    return Math.floor(a + (b - a + 1) * this.f());
  }
  pick(arr) {
    return arr[Math.floor(this.f() * arr.length)];
  }
  chance(p) {
    return this.f() < p;
  }
  sign() {
    return this.f() < 0.5 ? -1 : 1;
  }
}

// ---------- Ruido ----------
function hash2(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
function hash3(x, y, z, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
export { hash2, hash3 };

const fade = (t) => t * t * (3 - 2 * t);

// Ruido de valor 2D; si period > 0, es periódico (texturas repetibles).
export function vnoise2(x, y, period = 0, seed = 0) {
  const xi = Math.floor(x),
    yi = Math.floor(y);
  const xf = x - xi,
    yf = y - yi;
  let x0 = xi,
    x1 = xi + 1,
    y0 = yi,
    y1 = yi + 1;
  if (period > 0) {
    x0 = ((x0 % period) + period) % period;
    x1 = ((x1 % period) + period) % period;
    y0 = ((y0 % period) + period) % period;
    y1 = ((y1 % period) + period) % period;
  }
  const u = fade(xf),
    v = fade(yf);
  const a = hash2(x0, y0, seed),
    b = hash2(x1, y0, seed),
    c = hash2(x0, y1, seed),
    d = hash2(x1, y1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function fbm2(x, y, oct = 4, period = 0, seed = 0) {
  let s = 0,
    amp = 0.5,
    f = 1,
    norm = 0;
  for (let i = 0; i < oct; i++) {
    s += amp * vnoise2(x * f, y * f, period > 0 ? period * f : 0, seed + i * 17);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return s / norm;
}

export function vnoise3(x, y, z, seed = 0) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    zi = Math.floor(z);
  const xf = fade(x - xi),
    yf = fade(y - yi),
    zf = fade(z - zi);
  const c000 = hash3(xi, yi, zi, seed),
    c100 = hash3(xi + 1, yi, zi, seed),
    c010 = hash3(xi, yi + 1, zi, seed),
    c110 = hash3(xi + 1, yi + 1, zi, seed),
    c001 = hash3(xi, yi, zi + 1, seed),
    c101 = hash3(xi + 1, yi, zi + 1, seed),
    c011 = hash3(xi, yi + 1, zi + 1, seed),
    c111 = hash3(xi + 1, yi + 1, zi + 1, seed);
  return lerp(
    lerp(lerp(c000, c100, xf), lerp(c010, c110, xf), yf),
    lerp(lerp(c001, c101, xf), lerp(c011, c111, xf), yf),
    zf
  );
}

export function fbm3(x, y, z, oct = 3, seed = 0) {
  let s = 0,
    amp = 0.5,
    f = 1,
    norm = 0;
  for (let i = 0; i < oct; i++) {
    s += amp * vnoise3(x * f, y * f, z * f, seed + i * 31);
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return s / norm;
}

// Worley (celular) periódico: devuelve [F1, F2, id de celda].
export function worley2(x, y, cells, seed = 0, jitter = 0.85) {
  const xi = Math.floor(x),
    yi = Math.floor(y);
  let f1 = 9,
    f2 = 9,
    id = 0;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = xi + i,
        cy = yi + j;
      const wx = ((cx % cells) + cells) % cells,
        wy = ((cy % cells) + cells) % cells;
      const px = cx + 0.5 + (hash2(wx, wy, seed) - 0.5) * jitter;
      const py = cy + 0.5 + (hash2(wx, wy, seed + 7) - 0.5) * jitter;
      const d = Math.hypot(px - x, py - y);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = wy * cells + wx;
      } else if (d < f2) f2 = d;
    }
  return [f1, f2, id];
}

export function formatTime(sec) {
  const h = Math.floor(sec / 3600),
    m = Math.floor((sec % 3600) / 60),
    s = Math.floor(sec % 60);
  const mm = String(m).padStart(2, '0'),
    ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
