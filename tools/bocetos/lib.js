// Los útiles del dibujante para los bocetos de Dawn of Braga (canvas 2D):
// el papel, la aguada de carboncillo que sigue el tono, la plumilla que
// trama donde está oscuro (y cruza las tramas donde más), las líneas de
// contorno a mano alzada (calcadas de la máscara de cada cosa), la tinta
// roja que se encharca y oscurece en los bordes, la tiza de los brillos y
// las salpicaduras.
//
// Un boceto se pinta primero como un estudio de valores (el tono, de 0
// negro a 1 blanco) y unas máscaras (lo rojo, lo que lleva contorno); luego
// se "dibuja" encima con estos útiles.

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Noise {
  constructor(seed = 1) {
    const r = mulberry(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    this.p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.p[i] = p[i & 255];
  }
  // ruido de Perlin, más o menos de -1 a 1
  n2(x, y) {
    const p = this.p;
    let X = Math.floor(x),
      Y = Math.floor(y);
    x -= X;
    y -= Y;
    X &= 255;
    Y &= 255;
    const u = x * x * x * (x * (x * 6 - 15) + 10),
      v = y * y * y * (y * (y * 6 - 15) + 10);
    const g = (h, a, b) => {
      switch (h & 7) {
        case 0:
          return a + b;
        case 1:
          return -a + b;
        case 2:
          return a - b;
        case 3:
          return -a - b;
        case 4:
          return a;
        case 5:
          return -a;
        case 6:
          return b;
        default:
          return -b;
      }
    };
    const aa = p[p[X] + Y],
      ab = p[p[X] + Y + 1],
      ba = p[p[X + 1] + Y],
      bb = p[p[X + 1] + Y + 1];
    const l1 = g(aa, x, y) + u * (g(ba, x - 1, y) - g(aa, x, y));
    const l2 = g(ab, x, y - 1) + u * (g(bb, x - 1, y - 1) - g(ab, x, y - 1));
    return (l1 + v * (l2 - l1)) * 0.7;
  }
  fbm(x, y, oct = 4) {
    let s = 0,
      a = 1,
      f = 1,
      t = 0;
    for (let i = 0; i < oct; i++) {
      s += a * this.n2(x * f, y * f);
      t += a;
      a *= 0.5;
      f *= 2.03;
    }
    return s / t;
  }
}

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const mix = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const cv = (W, H) => {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  return c;
};
export const gray = (v, a = 1) => {
  const g = Math.round(clamp(v) * 255);
  return `rgba(${g},${g},${g},${a})`;
};

// ------------------------------------------------------------ campos
// Un campo de valores (0..1) que se pinta con el canvas y se lee luego.
export class Field {
  constructor(W, H, fill = 0) {
    this.W = W;
    this.H = H;
    this.c = cv(W, H);
    this.x = this.c.getContext('2d');
    this.x.fillStyle = gray(fill);
    this.x.fillRect(0, 0, W, H);
    this.d = null;
  }
  read() {
    const id = this.x.getImageData(0, 0, this.W, this.H).data;
    const d = (this.d = new Float32Array(this.W * this.H));
    for (let i = 0; i < d.length; i++) d[i] = id[i * 4] / 255;
    return this;
  }
  at(x, y) {
    const W = this.W,
      H = this.H;
    x = x < 0 ? 0 : x > W - 1.001 ? W - 1.001 : x;
    y = y < 0 ? 0 : y > H - 1.001 ? H - 1.001 : y;
    const i = x | 0,
      j = y | 0,
      fx = x - i,
      fy = y - j,
      d = this.d,
      k = j * W + i;
    return (d[k] * (1 - fx) + d[k + 1] * fx) * (1 - fy) + (d[k + W] * (1 - fx) + d[k + W + 1] * fx) * fy;
  }
  blurred(px, fill = 0) {
    const f = new Field(this.W, this.H, fill);
    f.x.filter = `blur(${px}px)`;
    f.x.drawImage(this.c, 0, 0);
    f.x.filter = 'none';
    return f;
  }
}

// ------------------------------------------------------------ formas
// camino suave y cerrado (o abierto) por los puntos (Catmull-Rom)
export function smoothPath(x, pts, closed = true, tension = 0.5) {
  const n = pts.length;
  if (n < 2) return;
  const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  x.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1),
      p1 = P(i),
      p2 = P(i + 1),
      p3 = P(i + 2);
    const k = tension / 3;
    x.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
  }
  if (closed) x.closePath();
}
export function blob(x, pts, fill, tension = 0.5) {
  x.beginPath();
  smoothPath(x, pts, true, tension);
  x.fillStyle = fill;
  x.fill();
}
export function poly(x, pts, fill) {
  x.beginPath();
  x.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
  x.closePath();
  x.fillStyle = fill;
  x.fill();
}
// un miembro: de a a b, de grueso r0 a r1 (redondo en las puntas)
export function capsule(x, a, b, r0, r1, fill) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l,
    ny = dx / l;
  x.beginPath();
  x.moveTo(a[0] + nx * r0, a[1] + ny * r0);
  x.lineTo(b[0] + nx * r1, b[1] + ny * r1);
  x.arc(b[0], b[1], r1, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI, true);
  x.lineTo(a[0] - nx * r0, a[1] - ny * r0);
  x.arc(a[0], a[1], r0, Math.atan2(-ny, -nx), Math.atan2(-ny, -nx) + Math.PI, true);
  x.closePath();
  x.fillStyle = fill;
  x.fill();
}
export function ellipse(x, cx, cy, rx, ry, fill, rot = 0) {
  x.beginPath();
  x.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
  x.fillStyle = fill;
  x.fill();
}
// una mancha de luz (degradado radial)
export function glow(x, cx, cy, r, color0, color1 = 'rgba(0,0,0,0)', sy = 1) {
  x.save();
  x.translate(cx, cy);
  x.scale(1, sy);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, color0);
  g.addColorStop(1, color1);
  x.fillStyle = g;
  x.beginPath();
  x.arc(0, 0, r, 0, Math.PI * 2);
  x.fill();
  x.restore();
}

// ------------------------------------------------------------ contornos
// Marching squares sobre un campo: las líneas donde vale level (en px).
export function contours(field, level = 0.5, step = 2) {
  const W = Math.floor((field.W - 1) / step),
    H = Math.floor((field.H - 1) / step);
  const S = W + 1;
  const v = new Float32Array(S * (H + 1));
  for (let j = 0; j <= H; j++) for (let i = 0; i <= W; i++) v[j * S + i] = field.at(i * step, j * step) - level + 1e-6;
  const P = new Map();
  const segs = [];
  const ept = (id, px, py) => {
    if (!P.has(id)) P.set(id, [px * step, py * step]);
    return id;
  };
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const a = v[j * S + i],
        b = v[j * S + i + 1],
        c = v[(j + 1) * S + i + 1],
        d = v[(j + 1) * S + i];
      const idx = (a > 0 ? 1 : 0) | (b > 0 ? 2 : 0) | (c > 0 ? 4 : 0) | (d > 0 ? 8 : 0);
      if (idx === 0 || idx === 15) continue;
      const T = () => ept((j * S + i) * 2, i + a / (a - b), j);
      const R = () => ept((j * S + i + 1) * 2 + 1, i + 1, j + b / (b - c));
      const B = () => ept(((j + 1) * S + i) * 2, i + d / (d - c), j + 1);
      const L = () => ept((j * S + i) * 2 + 1, i, j + a / (a - d));
      switch (idx) {
        case 1:
        case 14:
          segs.push([L(), T()]);
          break;
        case 2:
        case 13:
          segs.push([T(), R()]);
          break;
        case 3:
        case 12:
          segs.push([L(), R()]);
          break;
        case 4:
        case 11:
          segs.push([R(), B()]);
          break;
        case 6:
        case 9:
          segs.push([T(), B()]);
          break;
        case 7:
        case 8:
          segs.push([L(), B()]);
          break;
        default: {
          const m = (a + b + c + d) / 4;
          if (m > 0 === (idx === 5)) segs.push([L(), B()], [T(), R()]);
          else segs.push([L(), T()], [R(), B()]);
        }
      }
    }
  const adj = new Map();
  segs.forEach((s, k) => {
    for (const e of s) {
      if (!adj.has(e)) adj.set(e, []);
      adj.get(e).push(k);
    }
  });
  const used = new Uint8Array(segs.length);
  const lines = [];
  for (let k = 0; k < segs.length; k++) {
    if (used[k]) continue;
    used[k] = 1;
    const fwd = [segs[k][1]],
      bwd = [segs[k][0]];
    for (const [arr, start] of [
      [fwd, segs[k][1]],
      [bwd, segs[k][0]],
    ]) {
      let end = start;
      for (;;) {
        const nb = (adj.get(end) || []).find((q) => !used[q]);
        if (nb === undefined) break;
        used[nb] = 1;
        const s = segs[nb];
        end = s[0] === end ? s[1] : s[0];
        arr.push(end);
      }
    }
    const ids = bwd.reverse().concat(fwd);
    lines.push(ids.map((e) => P.get(e)));
  }
  return lines;
}
// Ramer-Douglas-Peucker
export function simplify(pts, eps = 1.5) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop();
    const [ax, ay] = pts[a],
      [bx, by] = pts[b];
    const dx = bx - ax,
      dy = by - ay,
      l = Math.hypot(dx, dy);
    let md = 0,
      mi = -1;
    for (let i = a + 1; i < b; i++) {
      // (en un lazo cerrado los extremos coinciden: la distancia al punto)
      const d = l < 1e-6 ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay) : Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / l;
      if (d > md) {
        md = d;
        mi = i;
      }
    }
    if (md > eps && mi > 0) {
      keep[mi] = 1;
      st.push([a, mi], [mi, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}
export function resample(pts, step = 3) {
  const out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    let [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    let seg = Math.hypot(bx - ax, by - ay);
    while (acc + seg >= step) {
      const t = (step - acc) / seg;
      ax = ax + (bx - ax) * t;
      ay = ay + (by - ay) * t;
      out.push([ax, ay]);
      seg = Math.hypot(bx - ax, by - ay);
      acc = 0;
    }
    acc += seg;
  }
  if (out.length < 2) out.push(pts[pts.length - 1]);
  return out;
}

// ------------------------------------------------------------ la plumilla
// Un trazo: los puntos (ya remuestreados), de i0 a i1; grueso w con presión
// (fino en las puntas), un temblor de pulso jit (px) a lo largo.
function strokeRun(x, P, i0, i1, o) {
  const n = i1 - i0;
  if (n < 2) return;
  const N = o.noise,
    seed = o.seed ?? 0;
  const L = [],
    R = [];
  for (let i = i0; i <= i1; i++) {
    const t = (i - i0) / n;
    const a = P[Math.max(i0, i - 1)],
      b = P[Math.min(i1, i + 1)];
    let dx = b[0] - a[0],
      dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    const nx = -dy,
      ny = dx;
    const press = (o.taper === false ? 1 : Math.pow(Math.sin(Math.PI * t), 0.45)) * (1 + 0.28 * N.n2(i * 0.045, seed * 3.1));
    const hw = Math.max(0.15, (o.w * press) / 2);
    const j = (o.jit ?? 1) * N.n2(i * 0.03 + seed * 7.7, 3.3);
    const px = P[i][0] + nx * j,
      py = P[i][1] + ny * j;
    L.push([px + nx * hw, py + ny * hw]);
    R.push([px - nx * hw, py - ny * hw]);
  }
  x.beginPath();
  x.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < L.length; i++) x.lineTo(L[i][0], L[i][1]);
  for (let i = R.length - 1; i >= 0; i--) x.lineTo(R[i][0], R[i][1]);
  x.closePath();
  x.fill();
}
// Una línea a mano alzada por pts: cada lift px (más o menos) levanta la
// pluma; passes: repasos un poco desplazados (lo de boceto).
export function pen(x, pts, o) {
  const step = o.step ?? 3;
  if (pts.length < 2) return;
  const P = resample(pts, step);
  if (P.length < 3) return;
  const r = o.rng;
  x.fillStyle = o.color ?? 'rgba(22,15,10,0.92)';
  const passes = o.passes ?? 1;
  for (let ps = 0; ps < passes; ps++) {
    const off = ps === 0 ? [0, 0] : [(r() - 0.5) * (o.spread ?? 3), (r() - 0.5) * (o.spread ?? 3)];
    const Q = ps === 0 ? P : P.map(([a, b]) => [a + off[0], b + off[1]]);
    let k = 0;
    while (k < Q.length - 2) {
      const L = Math.max(4, Math.round(((o.lift ?? 240) * (0.45 + r())) / step));
      const end = Math.min(Q.length - 1, k + L);
      strokeRun(x, Q, k, end, { ...o, w: (o.w ?? 2) * (ps ? 0.6 : 1), seed: (o.seed ?? 0) + k * 0.13 + ps });
      k = end - (r() < 0.6 ? 2 : 0) + (r() < 0.2 ? 2 : 0);
      if (k >= Q.length - 2) break;
    }
  }
}
// La trama: rayas paralelas (ángulo ang, cada sp px) donde la oscuridad del
// tono pasa de thr (y en la región, si la hay); rayas de len px como mucho,
// afinadas, con su temblor.
export function hatch(x, tone, o) {
  const W = tone.W,
    H = tone.H;
  const r = o.rng,
    N = o.noise;
  const sp = o.sp ?? 7,
    thr = o.thr ?? 0.5,
    len = o.len ?? 70,
    step = 3;
  const D = Math.hypot(W, H) / 2 + 10,
    cx = W / 2,
    cy = H / 2;
  x.fillStyle = o.color ?? 'rgba(24,16,11,0.7)';
  const bx = o.box || [0, 0, W, H];
  for (let off = -D; off <= D; off += sp * (0.8 + 0.4 * r())) {
    const ang = o.ang + (r() - 0.5) * (o.angJit ?? 0.05);
    const ca = Math.cos(ang),
      sa = Math.sin(ang);
    let run = [];
    const flush = () => {
      if (run.length > 3) strokeRun(x, run, 0, run.length - 1, { w: (o.w ?? 1.1) * (0.75 + 0.5 * r()), jit: o.jit ?? 0.8, noise: N, seed: off * 0.01 });
      run = [];
    };
    const lim = len * (0.5 + r());
    for (let t = -D; t <= D; t += step) {
      const px = cx + ca * t - sa * off,
        py = cy + sa * t + ca * off;
      if (px < bx[0] || py < bx[1] || px >= bx[2] || py >= bx[3]) {
        flush();
        continue;
      }
      const dark = 1 - tone.at(px, py);
      const reg = o.region ? o.region.at(px, py) : 1;
      const n = N.n2(px * 0.012 + off * 0.001, py * 0.012) * (o.nAmp ?? 0.12);
      if (reg > 0.5 && dark > thr + n) {
        run.push([px, py]);
        if (run.length * step > lim) flush();
      } else flush();
    }
    flush();
  }
}

// ------------------------------------------------------------ las aguadas
// Pigmento (rgb 0..255) donde dice la máscara (0..1, suave): se encharca y
// se oscurece en los bordes, con el grano del papel. Se multiplica.
export function wash(x, mask, rgb, o = {}) {
  const W = mask.W,
    H = mask.H,
    N = o.noise;
  const soft = mask.blurred(o.blur ?? 4).read();
  const wide = mask.blurred((o.blur ?? 4) * 4 + 6).read();
  const t = cv(W, H),
    tx = t.getContext('2d');
  const id = tx.createImageData(W, H),
    d = id.data;
  const al = o.alpha ?? 0.85,
    edge = o.edge ?? 0.6,
    gr = o.grain ?? 0.18,
    ns = o.ns ?? 0.004,
    nb = o.nb ?? 0.12,
    st = o.streak || null;
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const k = j * W + i;
      let m = soft.d[k];
      if (m <= 0.002) {
        d[k * 4] = d[k * 4 + 1] = d[k * 4 + 2] = 255;
        d[k * 4 + 3] = 255;
        continue;
      }
      // el borde se come con el ruido (la aguada no llega pareja)
      const nz = N.fbm(i * ns, j * ns, 3);
      m = clamp(m + nz * nb);
      const e = clamp((soft.d[k] - wide.d[k]) * 3) * edge;
      let g = 1 - gr * (0.5 + 0.5 * N.n2(i * 0.35, j * 0.35));
      // las pasadas del pincel (una textura estirada en su dirección)
      if (st) g *= 1 - st[2] * (0.5 + 0.5 * N.fbm(i * st[0] + 17, j * st[1] + 5, 2));
      const a = clamp(Math.pow(m, o.gamma ?? 1) * al * g + e);
      d[k * 4] = 255 - (255 - rgb[0]) * a;
      d[k * 4 + 1] = 255 - (255 - rgb[1]) * a;
      d[k * 4 + 2] = 255 - (255 - rgb[2]) * a;
      d[k * 4 + 3] = 255;
    }
  tx.putImageData(id, 0, 0);
  x.save();
  x.globalCompositeOperation = 'multiply';
  x.drawImage(t, 0, 0);
  x.restore();
}
// La aguada de carboncillo: la oscuridad del tono, con el grano del papel
// (en lo poco oscuro, el carbón sólo coge en los granos).
export function charcoal(x, tone, rgb, o = {}) {
  const W = tone.W,
    H = tone.H,
    N = o.noise;
  const t = cv(W, H),
    tx = t.getContext('2d');
  const id = tx.createImageData(W, H),
    d = id.data;
  const k0 = o.k ?? 0.85,
    gamma = o.gamma ?? 1.15;
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const k = j * W + i;
      const dark = Math.pow(1 - tone.d[k], gamma);
      const tooth = 0.5 + 0.5 * N.n2(i * 0.42, j * 0.42) * 0.8 + 0.25 * N.n2(i * 0.09, j * 0.09);
      const a = clamp(dark * k0 * (0.7 + 0.6 * sstep(1 - dark - 0.15, 1 - dark + 0.25, tooth)));
      d[k * 4] = 255 - (255 - rgb[0]) * a;
      d[k * 4 + 1] = 255 - (255 - rgb[1]) * a;
      d[k * 4 + 2] = 255 - (255 - rgb[2]) * a;
      d[k * 4 + 3] = 255;
    }
  tx.putImageData(id, 0, 0);
  x.save();
  x.globalCompositeOperation = 'multiply';
  x.drawImage(t, 0, 0);
  x.restore();
}

// ------------------------------------------------------------ el papel
export function paper(x, W, H, N, r, base = [231, 219, 194]) {
  const id = x.createImageData(W, H),
    d = id.data;
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const k = (j * W + i) * 4;
      const f = 1 + 0.035 * N.fbm(i * 0.004, j * 0.004, 3) + 0.022 * N.n2(i * 0.5, j * 0.08) + 0.018 * N.n2(i * 0.9, j * 0.9);
      // las manchas del tiempo
      const st = sstep(0.25, 0.6, N.fbm(i * 0.0016 + 40, j * 0.0016 + 9, 3)) * 0.07;
      d[k] = base[0] * f * (1 - st * 0.6);
      d[k + 1] = base[1] * f * (1 - st);
      d[k + 2] = base[2] * f * (1 - st * 1.4);
      d[k + 3] = 255;
    }
  x.putImageData(id, 0, 0);
}
// las esquinas, más oscuras; y lo que el papel ha cogido de tanto andar
export function vignette(x, W, H, k = 0.35) {
  x.save();
  x.globalCompositeOperation = 'multiply';
  const g = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, `rgba(${Math.round(255 * (1 - k))},${Math.round(255 * (1 - k * 1.1))},${Math.round(255 * (1 - k * 1.3))},1)`);
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  x.restore();
}
// salpicaduras: gotas de tamaños muy distintos alrededor de (cx, cy), y
// algún chorreón
export function splatter(x, cx, cy, R, n, color, r, o = {}) {
  x.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2,
      d = Math.pow(r(), o.pow ?? 1.6) * R;
    const s = Math.pow(r(), 3) * (o.max ?? 9) + 0.6;
    const px = cx + Math.cos(a) * d,
      py = cy + Math.sin(a) * d * (o.sy ?? 1);
    x.beginPath();
    x.ellipse(px, py, s * (1 + r() * 0.5), s, a, 0, Math.PI * 2);
    x.fill();
    if (s > 4 && r() < (o.drip ?? 0.25)) {
      const l = s * (3 + r() * 8);
      x.beginPath();
      x.moveTo(px - s * 0.4, py);
      x.quadraticCurveTo(px - s * 0.3, py + l * 0.6, px, py + l);
      x.quadraticCurveTo(px + s * 0.3, py + l * 0.6, px + s * 0.4, py);
      x.fill();
    }
  }
}

// lápiz: una línea fina y gris de encaje (la del boceto), algo temblona
export function pencil(x, pts, o) {
  pen(x, pts, { w: o.w ?? 1.1, jit: o.jit ?? 0.8, lift: o.lift ?? 400, passes: o.passes ?? 1, spread: 1.5, color: o.color ?? 'rgba(70,62,58,0.28)', rng: o.rng, noise: o.noise, step: 4 });
}
// una pincelada de gouache (o de tinta): de grueso w, afinada, por pts
export function brush(x, pts, o) {
  pen(x, pts, { w: o.w ?? 6, jit: o.jit ?? 1.5, lift: o.lift ?? 2000, passes: 1, color: o.color, rng: o.rng, noise: o.noise, step: 2.5 });
}
// partículas: ceniza que sube (copos girados) alrededor de un camino
export function ash(x, path, n, o) {
  const r = o.rng;
  for (let i = 0; i < n; i++) {
    const t = Math.pow(r(), o.pow ?? 1);
    const k = Math.min(path.length - 2, Math.floor(t * (path.length - 1)));
    const f = t * (path.length - 1) - k;
    const p = [mix(path[k][0], path[k + 1][0], f), mix(path[k][1], path[k + 1][1], f)];
    const sp = (o.spread ?? 60) * (0.3 + t);
    const px = p[0] + (r() - 0.5) * 2 * sp,
      py = p[1] + (r() - 0.5) * 2 * sp * 0.6;
    const s = (o.size ?? 3) * (0.4 + r() * r() * 2.2) * (1 - t * 0.5);
    x.save();
    x.translate(px, py);
    x.rotate(r() * Math.PI);
    x.fillStyle = r() < (o.lightK ?? 0.5) ? o.light : o.dark;
    x.beginPath();
    x.moveTo(-s, -s * 0.3);
    x.lineTo(s * 0.4, -s * 0.6);
    x.lineTo(s, s * 0.2);
    x.lineTo(-s * 0.2, s * 0.5);
    x.closePath();
    x.fill();
    x.restore();
  }
}

// ------------------------------------------------------------ el buril
// Grabado: líneas que siguen la forma (las da 'lines': listas de puntos) y
// engordan con la oscuridad del tono (el ancho, no la densidad: como en
// las láminas grabadas). Donde la oscuridad no llega a t0 la línea se corta.
export function engrave(x, tone, lines, o) {
  const N = o.noise,
    reg = o.region || null;
  const max = o.max ?? 2.2,
    t0 = o.t0 ?? 0.15,
    g = o.gamma ?? 0.9,
    step = o.step ?? 2;
  x.fillStyle = o.color ?? 'rgba(18,10,8,0.95)';
  let seed = 0;
  for (const line of lines) {
    if (line.length < 2) continue;
    const P = resample(line, step);
    seed += 1.37;
    let run = [];
    const flush = () => {
      if (run.length >= 3) {
        const L = [],
          R = [];
        for (let i = 0; i < run.length; i++) {
          const [px, py, hw] = run[i];
          const a = run[Math.max(0, i - 1)],
            b = run[Math.min(run.length - 1, i + 1)];
          let dx = b[0] - a[0],
            dy = b[1] - a[1];
          const l = Math.hypot(dx, dy) || 1;
          dx /= l;
          dy /= l;
          L.push([px - dy * hw, py + dx * hw]);
          R.push([px + dy * hw, py - dx * hw]);
        }
        x.beginPath();
        x.moveTo(L[0][0], L[0][1]);
        for (let i = 1; i < L.length; i++) x.lineTo(L[i][0], L[i][1]);
        for (let i = R.length - 1; i >= 0; i--) x.lineTo(R[i][0], R[i][1]);
        x.closePath();
        x.fill();
      }
      run = [];
    };
    for (let i = 0; i < P.length; i++) {
      const [px, py] = P[i];
      if (px < 0 || py < 0 || px >= tone.W || py >= tone.H || (reg && reg.at(px, py) < 0.5)) {
        flush();
        continue;
      }
      const d = 1 - tone.at(px, py) + (N ? N.n2(px * 0.02 + seed, py * 0.02) * (o.nAmp ?? 0.04) : 0);
      const k = (d - t0) / (1 - t0);
      if (k <= 0.02) {
        flush();
        continue;
      }
      const hw = (max * Math.pow(Math.min(1, k), g)) / 2;
      // el temblor del buril, muy poco
      const j = N ? N.n2(i * 0.05 + seed, 1.7) * (o.jit ?? 0.35) : 0;
      run.push([px, py + j, Math.max(0.12, hw)]);
    }
    flush();
  }
}
// familias de líneas para el buril
// paralelas, con ángulo ang (radianes), cada sp px, por la caja [x0,y0,x1,y1];
// wob: ondulación suave (px) para que no sean de regla
export function parallel(ang, sp, box, o = {}) {
  const [x0, y0, x1, y1] = box;
  const cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2;
  const D = Math.hypot(x1 - x0, y1 - y0) / 2 + 4;
  const ca = Math.cos(ang),
    sa = Math.sin(ang);
  const out = [];
  const N = o.noise;
  let k = 0;
  for (let off = -D; off <= D; off += sp, k++) {
    const line = [];
    for (let t = -D; t <= D; t += 6) {
      let px = cx + ca * t - sa * off,
        py = cy + sa * t + ca * off;
      if (N && o.wob) {
        const w = N.n2(t * 0.004 + k * 0.31, off * 0.004) * o.wob;
        px += -sa * w;
        py += ca * w;
      }
      line.push([px, py]);
    }
    out.push(line);
  }
  return out;
}
// curvas: para cada u de 0 a 1 (n de ellas), la curva f(u, v) con v de 0 a 1
export function family(n, f, steps = 80) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n,
      line = [];
    for (let j = 0; j <= steps; j++) line.push(f(u, j / steps));
    out.push(line);
  }
  return out;
}

// una capa aparte (para dibujar algo y borrarle lo que tape otra cosa)
export function layer(W, H, fn, erase = null) {
  const c = cv(W, H),
    x = c.getContext('2d');
  fn(x);
  if (erase) {
    x.save();
    x.globalCompositeOperation = 'destination-out';
    x.drawImage(erase.c, 0, 0);
    x.restore();
  }
  return c;
}
// la máscara como imagen (blanco opaco donde vale 1, transparente donde 0)
export function maskImage(f) {
  const c = cv(f.W, f.H),
    x = c.getContext('2d');
  const id = x.createImageData(f.W, f.H);
  for (let i = 0; i < f.d.length; i++) {
    id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255;
    id.data[i * 4 + 3] = Math.round(clamp(f.d[i]) * 255);
  }
  x.putImageData(id, 0, 0);
  return { c };
}
// resta de máscaras: a - b
export function maskMinus(a, b) {
  const f = new Field(a.W, a.H);
  f.d = new Float32Array(a.d.length);
  for (let i = 0; i < a.d.length; i++) f.d[i] = Math.max(0, a.d[i] - b.d[i]);
  return f;
}

// ------------------------------------------------------------ más útiles
// las púas de una aureola (triángulos desde el aro), y dónde acaba cada una
export function haloSpikes(x, fill, cx, cy, r0, r1, n = 15, broken = [4, 11], rot = -Math.PI / 2, wBase = 7, sy = 1) {
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    const L = broken.includes(i) ? r0 + (r1 - r0) * 0.4 : r1 * (0.9 + 0.1 * Math.sin(i * 2.7));
    const ca = Math.cos(a),
      sa = Math.sin(a);
    poly(x, [
      [cx + ca * (r0 - 5) - sa * wBase, cy + (sa * (r0 - 5) + ca * wBase) * sy],
      [cx + ca * L, cy + sa * L * sy],
      [cx + ca * (r0 - 5) + sa * wBase, cy + (sa * (r0 - 5) - ca * wBase) * sy],
    ], fill);
  }
}
export const spikeTips = (cx, cy, r0, r1, n = 15, broken = [4, 11], rot = -Math.PI / 2) =>
  Array.from({ length: n }, (_, i) => {
    const a = rot + (i / n) * Math.PI * 2;
    const L = broken.includes(i) ? r0 + (r1 - r0) * 0.4 : r1 * (0.9 + 0.1 * Math.sin(i * 2.7));
    return { a, L, p: [cx + Math.cos(a) * L, cy + Math.sin(a) * L], broken: broken.includes(i) };
  });

// ------------------------------------------------------------ sombrear
// Sombreado por píxel dentro de una máscara (para el tono): la normal sale
// del borde (la máscara emborronada) y lo demás lo dice fn.
export function shadeInto(T, mask, blurPx, box, fn) {
  const B = mask.blurred(blurPx).read();
  const [x0, y0, x1, y1] = box.map(Math.round);
  for (let y = Math.max(1, y0); y < Math.min(T.H - 1, y1); y++)
    for (let xx = Math.max(1, x0); xx < Math.min(T.W - 1, x1); xx++) {
      const k = y * T.W + xx;
      const m = mask.d[k];
      if (m < 0.01) continue;
      const gx = (B.d[k + 1] - B.d[k - 1]) * 0.5,
        gy = (B.d[k + T.W] - B.d[k - T.W]) * 0.5;
      const s = Math.hypot(gx, gy) * blurPx * 2.2;
      const nl = Math.hypot(gx, gy) || 1;
      const nx = (-gx / nl) * Math.min(1, s),
        ny = (-gy / nl) * Math.min(1, s);
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      T.d[k] = mix(T.d[k], fn(xx, y, nx, ny, nz, B.d[k]), m);
    }
}

// (las máscaras ya leídas y cambiadas se vuelven a pintar, para las aguadas)
export function toCanvasF(f) {
  const id = f.x.createImageData(f.W, f.H);
  for (let i = 0; i < f.d.length; i++) {
    const v = Math.round(clamp(f.d[i]) * 255);
    id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v;
    id.data[i * 4 + 3] = 255;
  }
  f.x.putImageData(id, 0, 0);
  return f;
}

// La lámina: el dibujo sobre un pliego más grande, con la huella de la
// plancha alrededor y el pie debajo (el número y el título, y una línea
// más pequeña).
export function plate(c, title, sub, o = {}) {
  const W = c.width,
    H = c.height;
  const m = o.margin ?? 90,
    foot = o.foot ?? 150;
  const src = cv(W, H);
  src.getContext('2d').drawImage(c, 0, 0);
  c.width = W + m * 2;
  c.height = H + m + foot;
  const x = c.getContext('2d');
  const N = new Noise(o.seed ?? 5),
    r = mulberry(o.seed ?? 5);
  paper(x, c.width, c.height, N, r, o.paper || [236, 226, 204]);
  // la huella de la plancha: un rehundido algo más oscuro, y su filo
  x.fillStyle = 'rgba(120,100,80,0.12)';
  x.fillRect(m - 22, m - 22, W + 44, H + 44);
  x.strokeStyle = 'rgba(90,70,56,0.35)';
  x.lineWidth = 2;
  x.strokeRect(m - 22, m - 22, W + 44, H + 44);
  x.drawImage(src, m, m);
  x.strokeStyle = 'rgba(20,12,8,0.9)';
  x.lineWidth = 3;
  x.strokeRect(m - 1.5, m - 1.5, W + 3, H + 3);
  // el pie
  x.fillStyle = 'rgba(30,20,14,0.92)';
  x.textAlign = 'center';
  x.textBaseline = 'alphabetic';
  x.font = `${o.size ?? 46}px FreeSerif, "DejaVu Serif", serif`;
  const cx = c.width / 2;
  if ('letterSpacing' in x) x.letterSpacing = '6px';
  x.fillText(title, cx, H + m + 78);
  x.font = `italic ${o.subSize ?? 30}px FreeSerif, "DejaVu Serif", serif`;
  if ('letterSpacing' in x) x.letterSpacing = '1px';
  x.fillStyle = 'rgba(60,40,30,0.85)';
  x.fillText(sub, cx, H + m + 124);
}
