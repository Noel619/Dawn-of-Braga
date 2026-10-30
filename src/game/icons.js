// Iconos de objetos en pixel art (32x32) dibujados por código: rampas de
// sombreado con la luz arriba a la izquierda, brillos y contorno oscuro.
import { Bitmap, PAL as P, bayer } from '../ui/pixel.js';

const BRONZE = ['#2e1c0c', '#5a3818', '#8a5a26', '#bb8738', '#e8b860', '#fff0b0'];

// Segmento grueso rasterizado por distancia: fn(t, s) -> color | null
// t: 0..1 a lo largo del eje, s: distancia con signo (negativa = lado de la luz).
function seg(b, ax, ay, bx, by, w0, w1, fn) {
  const dx = bx - ax,
    dy = by - ay;
  const L = Math.hypot(dx, dy);
  const ux = dx / L,
    uy = dy / L;
  // normal que apunta hacia abajo-derecha (lado en sombra)
  let nx = -uy,
    ny = ux;
  if (nx + ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  const m = Math.max(w0, w1) + 1;
  for (let y = Math.floor(Math.min(ay, by) - m); y <= Math.ceil(Math.max(ay, by) + m); y++)
    for (let x = Math.floor(Math.min(ax, bx) - m); x <= Math.ceil(Math.max(ax, bx) + m); x++) {
      const px = x + 0.5 - ax,
        py = y + 0.5 - ay;
      const t = (px * ux + py * uy) / L;
      if (t < 0 || t > 1) continue;
      const s = px * nx + py * ny;
      const w = w0 + (w1 - w0) * t;
      if (Math.abs(s) > w) continue;
      const c = fn(t, s / Math.max(0.5, w), x, y);
      if (c) b.set(x, y, c);
    }
}
function disc(b, cx, cy, r, fn) {
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const dx = x + 0.5 - cx,
        dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      if (d > r) continue;
      // iluminación esférica desde arriba-izquierda
      const l = (-dx - dy) / (r * 1.414) * 0.5 + 0.5 + (1 - d / r) * 0.25;
      const c = fn(l, d / r, x, y);
      if (c) b.set(x, y, c);
    }
}
const shade = (cols, l, x, y) => {
  const n = cols.length;
  const f = Math.max(0, Math.min(0.999, l)) * (n - 1);
  const i = Math.floor(f);
  return cols[Math.min(n - 1, i + (f - i > bayer(x, y) ? 1 : 0))];
};
const STEEL = [P.steel0, P.steel1, P.steel2, P.steel3, P.steel4, P.steel5];
const GOLD = [P.gold0, P.gold1, P.gold2, P.gold3, P.gold4, P.gold5];
const WOOD = [P.wood0, P.wood1, P.wood2, P.wood3, P.wood4];
const IRON = [P.void, P.iron0, P.iron1, P.iron2, P.iron3, P.iron4, P.iron5];
const RUBY = [P.ruby0, P.ruby1, P.ruby2, P.ruby3, P.ruby4];

function sparkle(b, x, y) {
  b.set(x, y, P.steel5);
  b.set(x - 1, y, P.steel4);
  b.set(x + 1, y, P.steel4);
  b.set(x, y - 1, P.steel4);
  b.set(x, y + 1, P.steel4);
}
// destello dorado (la katana bendecida)
function holySparkle(b, x, y) {
  b.set(x, y, P.gold5);
  b.set(x - 1, y, P.gold4);
  b.set(x + 1, y, P.gold4);
  b.set(x, y - 1, P.gold4);
  b.set(x, y + 1, P.gold4);
}

// Pieza de armadura: lo que cae dentro de 'inside', en acero con la luz
// arriba a la izquierda; el canto de la chapa, más oscuro.
function plate(b, inside, l = (x, y) => 0.8 - (x - 4) / 34 - (y - 3) / 46) {
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      b.set(x, y, shade(STEEL, l(x, y) - (edge ? 0.32 : 0), x, y));
    }
}

const ICONS = {
  // espada larga en diagonal: pomo abajo a la izquierda, punta arriba a la derecha
  sword(b) {
    seg(b, 12.5, 19.5, 28, 4, 2.1, 2.1, (t, s, x, y) => {
      if (t > 0.86) {
        const k = (1 - t) / 0.14;
        if (Math.abs(s) > k * 1.05) return null;
      }
      if (s < -0.45) return P.steel5;
      if (s > 0.5) return t > 0.1 && t < 0.8 && (x + y) % 5 === 0 ? P.steel1 : P.steel2;
      if (Math.abs(s) < 0.2 && t < 0.72) return P.steel2; // vaceo
      return P.steel4;
    });
    // guarda perpendicular
    seg(b, 8, 16, 16.5, 24.5, 1.3, 1.3, (t, s, x, y) => (s < -0.3 ? P.gold4 : s > 0.4 ? P.gold1 : shade(GOLD, 0.7 - t * 0.3, x, y)));
    b.set(7, 15, P.gold2);
    b.set(17, 25, P.gold1);
    // empuñadura trenzada
    seg(b, 6.5, 25.5, 11.5, 20.5, 1.25, 1.25, (t, s, x, y) => ((x + y) % 2 ? (s < 0 ? P.wood3 : P.wood2) : s < 0 ? P.wood2 : P.wood1));
    // pomo con rubí
    disc(b, 5, 27, 2.4, (l, d, x, y) => (d < 0.45 ? P.ruby2 : shade(GOLD, l, x, y)));
    b.set(4, 26, P.ruby3);
    sparkle(b, 22, 8);
    b.outline(P.void);
  },
  // facón criollo: hoja larga con contrafilo, guardas de plata en S y cabo
  // de asta oscura con virolas de plata
  facon(b) {
    // hoja: lomo (a la luz) arriba a la izquierda, filo abajo a la derecha
    seg(b, 13.5, 18.5, 28, 4, 1.9, 1.9, (t, s, x, y) => {
      if (t > 0.72) {
        const k = (t - 0.72) / 0.28;
        if (s < -1 + 2 * k) return null; // el lomo baja hasta la punta
        if (s > 1 - 0.55 * k * k) return null;
        if (s < -0.62 + 2 * k) return P.steel5; // contrafilo afilado
      }
      if (s > 0.62) return P.steel5; // filo
      if (s > 0.22) return P.steel2; // bisel en sombra
      if (s < -0.55) return P.steel4; // lomo
      return (x * 3 + y) % 7 === 0 && t < 0.7 ? P.steel2 : P.steel3;
    });
    // guardas de plata en S (los extremos se curvan en sentidos opuestos)
    seg(b, 10.8, 15.8, 16.2, 21.2, 1.0, 1.0, (t, s) => (s < 0 ? P.steel5 : P.steel3));
    b.set(11, 14, P.steel4);
    b.set(12, 14, P.steel5);
    b.set(15, 22, P.steel2);
    b.set(14, 23, P.steel3);
    // cabo: virolas de plata y asta veteada
    seg(b, 6.5, 25.5, 12.8, 19.2, 1.45, 1.45, (t, s, x, y) => {
      if (t > 0.8 || t < 0.14) return s < -0.2 ? P.steel5 : s > 0.4 ? P.steel2 : P.steel4;
      if (Math.abs(t - 0.47) < 0.05) return s < 0 ? P.steel4 : P.steel2;
      return s < -0.35 ? P.wood3 : s > 0.45 ? P.wood0 : (x + 2 * y) % 5 === 0 ? P.wood2 : P.wood1;
    });
    // pomo de plata
    disc(b, 5.4, 26.6, 1.9, (l, d, x, y) => shade(STEEL, l + 0.1, x, y));
    sparkle(b, 23, 9);
    b.outline(P.void);
  },
  // hacha barbada: mango largo con tiras de cuero y cabeza de hierro cuyo filo
  // (acero bruñido) baja en barba hacia el mango
  axe(b) {
    seg(b, 5, 28, 22.5, 8.5, 1.35, 1.35, (t, s, x, y) => {
      if ((t > 0.06 && t < 0.24) || (t > 0.52 && t < 0.62)) return (x + y) % 3 === 0 ? P.pink1 : s < 0 ? P.wood2 : P.wood1;
      return s < -0.35 ? P.wood4 : s > 0.45 ? P.wood1 : shade(WOOD, 0.6 + (bayer(x, y) - 0.5) * 0.25, x, y);
    });
    // cabeza en el marco del mango: a = a lo largo (hacia arriba), c = hacia el filo
    const hx = 20.2,
      hy = 11.1;
    const ux = 0.668,
      uy = -0.744,
      nx = 0.744,
      ny = 0.668;
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const px = x + 0.5 - hx,
          py = y + 0.5 - hy;
        const a = px * ux + py * uy,
          c = px * nx + py * ny;
        let col = null;
        // ojo y nuca
        if (Math.abs(a) <= 2.6 && c >= -3.2 && c <= 2.2) col = shade(IRON, 0.5 - c * 0.05 - a * 0.04, x, y);
        // hoja: se abre hacia el filo y la barba cae hacia el mango
        const q = (c - 2) / 8;
        if (c > 1.8 && q <= 1) {
          const top = 2.2 + q * 1.4,
            bot = -2.2 - q * q * 6.2;
          const edge = 9.8 - 0.05 * (a - (top + bot) / 2) ** 2;
          if (a <= top && a >= bot && c <= edge) col = c > edge - 1.4 ? (a > top - 1.2 ? P.steel5 : P.steel4) : shade(IRON, 0.62 - q * 0.25 + (a > 0 ? 0.08 : -0.04), x, y);
        }
        if (col) b.set(x, y, col);
      }
    sparkle(b, 26, 16);
    b.outline(P.void);
  },
  // lanza: asta larga, regatón, cubo con aletas, lazo rojo y moharra en hoja
  // de laurel con su nervio
  spear(b) {
    seg(b, 3.5, 28.5, 20.5, 11.5, 1.0, 1.0, (t, s, x, y) => (s < -0.3 ? P.wood4 : s > 0.4 ? P.wood1 : shade(WOOD, 0.55 + (bayer(x, y) - 0.5) * 0.2, x, y)));
    seg(b, 3.5, 28.5, 1.6, 30.4, 1.0, 0.35, (t, s) => (s < 0 ? P.iron4 : P.iron2));
    // lazo rojo atado bajo el cubo
    seg(b, 18.2, 13.8, 16.6, 18.2, 0.9, 0.55, (t, s) => (s < 0 ? P.blood4 : P.blood2));
    b.set(18, 13, P.blood3);
    b.set(19, 13, P.blood2);
    // cubo y aletas
    seg(b, 19.3, 12.7, 22, 10, 1.25, 1.15, (t, s, x, y) => shade(IRON, s < 0 ? 0.72 : 0.36, x, y));
    seg(b, 17.4, 10.8, 21.2, 14.6, 0.7, 0.7, (t, s) => (s < 0 ? P.iron4 : P.iron2));
    // moharra
    seg(b, 21.6, 10.4, 30, 2, 2.6, 2.6, (t, s) => {
      const w = t < 0.3 ? 0.35 + 0.65 * Math.sin(((t / 0.3) * Math.PI) / 2) : Math.pow(Math.max(0, 1 - (t - 0.3) / 0.7), 0.85);
      if (Math.abs(s) > w) return null;
      if (Math.abs(s) < 0.14 * w + 0.1) return P.steel2; // nervio
      if (s < 0) return Math.abs(s) > w - 0.3 ? P.steel5 : P.steel4;
      return Math.abs(s) > w - 0.3 ? P.steel3 : P.steel2;
    });
    sparkle(b, 25, 7);
    b.outline(P.void);
  },
  // katana sagrada: hoja curva con el temple dorado que reluce, tsuba de
  // hierro, tsuka de seda carmesí con menuki de oro y la cruz en el kashira
  katana(b) {
    const A = [12.2, 19.8],
      B = [29.5, 2.5];
    // sori: el centro de la hoja se desplaza hacia el filo
    const pt = (t) => {
      const bow = 1.7 * 4 * t * (1 - t);
      return [A[0] + (B[0] - A[0]) * t + 0.707 * bow, A[1] + (B[1] - A[1]) * t + 0.707 * bow];
    };
    const N = 12;
    for (let i = 0; i < N; i++) {
      const t0 = i / N,
        t1 = (i + 1) / N;
      const p0 = pt(t0),
        p1 = pt(t1);
      seg(b, p0[0], p0[1], p1[0], p1[1], 1.65, 1.65, (tt, s, x, y) => {
        const t = t0 + (t1 - t0) * tt;
        // kissaki: el filo sube en curva hasta el lomo
        if (t > 0.88) {
          const k = (t - 0.88) / 0.12;
          if (s > 1 - 1.9 * k * k) return null;
        }
        if (s > 0.45) return (x * 2 + y) % 5 < 2 ? P.gold4 : P.gold5; // temple
        if (s < -0.55) return P.steel3; // mune
        if (s > -0.25 && s < -0.08) return P.steel5; // shinogi
        return P.steel4;
      });
    }
    // habaki de oro y tsuba de hierro
    b.set(13, 18, P.gold4);
    b.set(14, 18, P.gold3);
    seg(b, 10.3, 17.9, 14.1, 21.7, 1.25, 1.25, (t, s, x, y) => shade(IRON, s < 0 ? 0.78 : 0.4, x, y));
    // tsuka: seda carmesí cruzada sobre piel blanca, fuchi y kashira de oro
    seg(b, 5.2, 26.8, 11.5, 20.5, 1.5, 1.5, (t, s) => {
      if (t > 0.88) return s < 0 ? P.gold4 : P.gold2;
      const ph = (t * 6) % 1;
      if (Math.abs(s) < 0.6 * (1 - Math.abs(ph * 2 - 1))) return s < 0 ? P.bone3 : P.bone1;
      return s < 0 ? P.blood2 : P.blood1;
    });
    b.set(8, 24, P.gold4); // menuki
    b.set(9, 23, P.gold3);
    disc(b, 4.5, 27.5, 1.8, (l, d, x, y) => shade(GOLD, l, x, y));
    b.set(4, 27, P.gold5); // cruz del kashira
    b.set(4, 26, P.gold5);
    b.set(3, 27, P.gold5);
    holySparkle(b, 27, 12);
    holySparkle(b, 19, 5);
    b.outline(P.void);
  },
  // escudo de lágrima con la cruz de Braga
  shield(b) {
    const inside = (x, y) => {
      const cx = 16,
        top = 4,
        bot = 29;
      if (y < top || y > bot) return false;
      const t = (y - top) / (bot - top);
      const hw = t < 0.45 ? 11 : 11 * Math.sqrt(Math.max(0, 1 - ((t - 0.45) / 0.55) ** 2));
      return Math.abs(x + 0.5 - cx) <= hw;
    };
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        if (!inside(x, y)) continue;
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        const edge2 = !inside(x - 2, y) || !inside(x + 2, y) || !inside(x, y - 2) || !inside(x, y + 2);
        const l = 0.75 - (x - 5) / 26 - (y - 4) / 50;
        if (edge) b.set(x, y, shade(IRON, 0.55 + (x < 16 ? 0.25 : -0.15) - (y > 24 ? 0.2 : 0), x, y));
        else if (edge2) b.set(x, y, shade(IRON, 0.35 + (x < 16 ? 0.1 : -0.1), x, y));
        else {
          // tablas verticales
          const plank = Math.floor((x - 5) / 4);
          const seam = (x - 5) % 4 === 0;
          b.set(x, y, seam ? P.wood1 : shade(WOOD, l + (plank % 2) * 0.08 + (bayer(x, y * 3) - 0.5) * 0.1, x, y));
        }
      }
    // cruz roja
    for (let y = 7; y <= 25; y++)
      for (let x = 14; x <= 17; x++) if (inside(x, y) && inside(x + 2, y) && inside(x - 2, y)) b.set(x, y, x === 14 ? P.blood4 : x === 17 ? P.blood2 : P.blood3);
    for (let x = 8; x <= 23; x++)
      for (let y = 12; y <= 14; y++) if (inside(x - 2, y) && inside(x + 2, y)) b.set(x, y, y === 12 ? P.blood4 : y === 14 ? P.blood2 : P.blood3);
    // umbo de hierro
    disc(b, 16, 13.5, 2.4, (l, d, x, y) => shade(IRON, l + 0.1, x, y));
    // arañazos
    for (const [x, y] of [
      [9, 20],
      [10, 21],
      [21, 7],
      [22, 8],
      [11, 8],
    ])
      b.set(x, y, P.wood4);
    b.outline(P.void);
  },
  // palanca de hierro con uña partida
  crowbar(b) {
    seg(b, 7, 27, 24, 7, 1.6, 1.6, (t, s, x, y) => (s < -0.3 ? P.iron5 : s > 0.4 ? P.iron1 : shade(IRON, 0.6 + (bayer(x, y) - 0.5) * 0.2, x, y)));
    // uña curvada
    seg(b, 24, 7, 21, 3, 1.5, 1.1, (t, s) => (s < 0 ? P.iron4 : P.iron2));
    seg(b, 21, 3, 18, 3.5, 1.1, 0.8, (t, s) => (s < 0 ? P.iron4 : P.iron2));
    b.clear(20, 3);
    b.clear(19, 4);
    // extremo en cincel
    seg(b, 7, 27, 4, 26, 1.5, 0.9, (t, s) => (s < 0 ? P.iron4 : P.iron2));
    // óxido
    for (const [x, y] of [
      [12, 21],
      [13, 20],
      [17, 15],
      [10, 23],
    ])
      b.set(x, y, P.ember1);
    b.outline(P.void);
  },
  // llave de bronce con anilla calada
  key(b) {
    // anilla
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const dx = x + 0.5 - 10,
          dy = y + 0.5 - 10;
        const d = Math.hypot(dx, dy);
        if (d > 6.2 || d < 3.2) continue;
        const l = (-dx - dy) / 12 + 0.55 + (d > 4.7 ? 0.1 : -0.15);
        b.set(x, y, shade(BRONZE, l, x, y));
      }
    // caña
    seg(b, 14, 14, 26, 26, 1.5, 1.5, (t, s, x, y) => shade(BRONZE, s < -0.2 ? 0.95 : s > 0.4 ? 0.3 : 0.62, x, y));
    // paletón con dientes
    for (const [x, y, w, h] of [
      [20, 23, 3, 5],
      [23, 26, 3, 4],
      [18, 21, 2, 3],
    ])
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) b.set(x + i - (j >> 1), y + j, i === 0 ? BRONZE[4] : j === h - 1 ? BRONZE[1] : BRONZE[2]);
    // collarín
    seg(b, 12.5, 15.5, 15.5, 12.5, 1.2, 1.2, (t, s) => (s < 0 ? BRONZE[4] : BRONZE[2]));
    b.set(7, 6, BRONZE[5]);
    b.set(8, 5, BRONZE[5]);
    b.outline(P.void);
  },
  // manivela del torno: encaje cuadrado, brazo y mango de madera
  crank(b) {
    // brazo
    seg(b, 8, 22, 23, 9, 1.6, 1.6, (t, s, x, y) => (s < -0.3 ? P.iron5 : s > 0.4 ? P.iron1 : shade(IRON, 0.62, x, y)));
    // encaje cuadrado
    for (let y = 18; y <= 26; y++)
      for (let x = 4; x <= 12; x++) {
        const d = Math.min(x - 4, y - 18, 12 - x, 26 - y);
        const hole = x >= 7 && x <= 9 && y >= 21 && y <= 23;
        b.set(x, y, hole ? P.void : d === 0 ? (x === 4 || y === 18 ? P.iron4 : P.iron1) : shade(IRON, 0.55 - (y - 18) / 30, x, y));
      }
    // mango de madera
    seg(b, 23, 9, 23, 2, 2, 2, (t, s, x, y) => (s < -0.3 ? P.wood4 : s > 0.4 ? P.wood1 : shade(WOOD, 0.6 + ((y & 1) ? 0.1 : 0), x, y)));
    seg(b, 21, 10, 25, 10, 1.1, 1.1, (t, s) => (s < 0 ? P.iron4 : P.iron2));
    b.set(22, 3, P.wood4);
    b.outline(P.void);
  },
  // anillo pastoral de oro con un gran rubí
  ring(b) {
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const dx = (x + 0.5 - 16) / 10,
          dy = (y + 0.5 - 20) / 7.2;
        const d = Math.hypot(dx, dy);
        const th = dy > 0 ? 0.36 : 0.26; // más grueso por delante
        if (d > 1 || d < 1 - th) continue;
        const l = 0.55 - dx * 0.35 - dy * 0.25 + (d > 1 - th / 2 ? 0.12 : -0.1);
        b.set(x, y, shade(GOLD, l, x, y));
      }
    // engaste
    for (let y = 8; y <= 14; y++) for (let x = 11; x <= 20; x++) if (Math.abs(x + 0.5 - 16) + Math.abs(y + 0.5 - 12) * 1.2 <= 6) b.set(x, y, shade(GOLD, 0.35 + (16 - x) / 20, x, y));
    // rubí facetado
    disc(b, 16, 10.5, 3.6, (l, d, x, y) => shade(RUBY, l * 0.9 + (d > 0.8 ? -0.2 : 0.05), x, y));
    b.set(14, 8, P.ruby4);
    b.set(15, 8, P.ruby3);
    b.set(14, 9, P.ruby3);
    sparkle(b, 22, 16);
    b.outline(P.void);
  },
  // tablón de pino con dos clavos torcidos donde estuvo clavado
  plank(b) {
    seg(b, 3.5, 24, 28.5, 9, 4.4, 4.4, (t, s, x, y) => {
      if (s < -0.72) return P.wood4;
      if (s > 0.72) return P.wood1;
      // las vetas, a lo largo de la tabla
      const v = Math.sin(t * 34 + s * 2.6 + Math.sin(t * 9) * 1.5);
      if (v > 0.82) return P.wood1;
      return shade(WOOD, 0.62 - s * 0.22 + (bayer(x, y) - 0.5) * 0.12, x, y);
    });
    // las testas, más oscuras (madera cortada)
    seg(b, 3.5, 24, 4.6, 23.3, 4.4, 4.4, (t, s, x, y) => shade(WOOD, 0.35 - s * 0.15, x, y));
    // un nudo
    disc(b, 17.5, 17, 1.6, (l, d) => (d > 0.6 ? P.wood1 : l > 0.55 ? P.wood2 : P.wood0));
    // los clavos, doblados
    const nail = (t, s) => (s < 0 ? P.iron4 : P.iron2);
    seg(b, 9.5, 21, 9.5, 15.5, 0.65, 0.65, nail);
    seg(b, 9.5, 15.5, 12.5, 13.5, 0.65, 0.65, nail);
    seg(b, 22.5, 13.5, 22, 8, 0.65, 0.65, nail);
    seg(b, 22, 8, 19.5, 6.5, 0.65, 0.65, nail);
    b.set(9, 21, P.iron5);
    b.set(22, 13, P.iron5);
    b.outline(P.void);
  },
  // martillo de herrero (cabeza de hierro, mango de fresno) y tres clavos
  hammer(b) {
    seg(b, 7, 28, 19, 10, 1.6, 1.4, (t, s, x, y) => (s < -0.3 ? P.wood4 : s > 0.4 ? P.wood1 : shade(WOOD, 0.62 + ((x + y) % 4 === 0 ? 0.12 : 0), x, y)));
    // la cabeza, atravesada
    seg(b, 12, 7, 26, 15.5, 3.2, 3.2, (t, s, x, y) => {
      if (t < 0.12 || t > 0.9) return s < 0 ? P.iron5 : P.iron2; // bocas templadas
      if (s < -0.55) return P.iron5;
      if (s > 0.55) return P.iron1;
      return shade(IRON, 0.58 + (bayer(x, y) - 0.5) * 0.18, x, y);
    });
    // la cuña del mango en el ojo de la cabeza
    b.set(18, 11, P.wood3);
    b.set(19, 11, P.wood2);
    // los clavos, sueltos al pie
    const nail = (t, s) => (s < 0 ? P.iron4 : P.iron2);
    seg(b, 21, 27, 28, 25, 0.6, 0.6, nail);
    seg(b, 22, 23.5, 28.5, 22.5, 0.6, 0.6, nail);
    seg(b, 3, 20, 8, 22.5, 0.6, 0.6, nail);
    for (const [x, y] of [
      [21, 27],
      [22, 23],
      [3, 20],
    ])
      b.set(x, y, P.iron5);
    b.outline(P.void);
  },
  // llave grande de hierro negro (la del sótano)
  keyIron(b) {
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const dx = x + 0.5 - 9,
          dy = y + 0.5 - 9;
        const d = Math.hypot(dx, dy) * (1 + Math.abs(dx * dy) / 120);
        if (d > 6.6 || d < 3.4) continue;
        const l = (-dx - dy) / 13 + 0.5 + (d > 5 ? 0.1 : -0.2);
        b.set(x, y, shade(IRON, l, x, y));
      }
    // la caña, larga y gruesa
    seg(b, 13, 13, 27, 27, 1.7, 1.7, (t, s, x, y) => shade(IRON, s < -0.25 ? 0.95 : s > 0.4 ? 0.28 : 0.6, x, y));
    // el paletón, en escalera
    for (const [x, y, w, h] of [
      [20, 25, 3, 5],
      [17, 22, 3, 4],
      [23, 28, 2, 3],
    ])
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) b.set(x + i - (j >> 1), y + j, i === 0 ? P.iron4 : j === h - 1 ? P.iron1 : P.iron2);
    // óxido en la anilla
    for (const [x, y] of [
      [4, 11],
      [12, 4],
      [13, 12],
    ])
      b.set(x, y, P.ember1);
    b.set(6, 4, P.iron5);
    b.outline(P.void);
  },
  // espada de Solingen: hoja ancha con vaceo, guarda recta de hierro y pomo
  // de rueda con su cruz de latón; las letras de latón del vaceo brillan en
  // el acero
  solingen(b) {
    seg(b, 12, 20, 28.5, 3.5, 2.6, 2.3, (t, s, x, y) => {
      if (t > 0.88) {
        const k = (1 - t) / 0.12;
        if (Math.abs(s) > k * 1.05) return null;
      }
      if (s < -0.5) return P.steel5;
      if (s > 0.55) return P.steel2;
      // el vaceo, con la inscripción en hierro (puntos dorados)
      if (Math.abs(s) < 0.22 && t < 0.78) return t > 0.12 && t < 0.62 && (x + y) % 3 === 0 ? P.gold3 : P.steel1;
      return P.steel4;
    });
    // la guarda: una barra recta, ancha
    seg(b, 6.5, 14.5, 17.5, 25.5, 1.4, 1.4, (t, s, x, y) => (s < -0.3 ? P.iron5 : s > 0.4 ? P.iron1 : shade(IRON, 0.62 - t * 0.2, x, y)));
    // el puño de cuero
    seg(b, 6.5, 25.5, 11.5, 20.5, 1.3, 1.3, (t, s, x, y) => ((x + y) % 2 ? (s < 0 ? P.wood2 : P.wood1) : s < 0 ? P.wood1 : P.wood0));
    // el pomo de rueda, con la cruz
    disc(b, 4.8, 27.2, 2.8, (l, d, x, y) => ((x === 5 && Math.abs(y - 27) <= 1) || (y === 27 && Math.abs(x - 5) <= 1) ? P.gold3 : d < 0.4 ? P.iron2 : shade(IRON, l + 0.1, x, y)));
    sparkle(b, 23, 8);
    b.outline(P.void);
  },
  // la Garra de Oro: una mano de cuatro dedos con garras, cortada por la
  // muñeca (el corte, rojo oscuro)
  claw(b) {
    const gold = (l) => (t, s, x, y) => shade(GOLD, l - s * 0.3, x, y);
    // la muñeca, con el corte abajo
    seg(b, 16, 30, 16, 23, 3.4, 3.6, (t, s, x, y) => (t < 0.18 ? (s < 0 ? P.blood2 : P.blood1) : shade(GOLD, 0.5 - s * 0.3, x, y)));
    // los cuatro dedos: dos falanges y la uña, curva hacia dentro
    const F = [
      [11.5, 16, 9, 10, 8.5, 6],
      [14.5, 14.5, 13.5, 8, 13.5, 3.5],
      [17.5, 14.5, 18.5, 8, 19, 3.5],
      [20.5, 16, 23, 10.5, 24, 6.5],
    ];
    for (const [ax, ay, bx, by, cx, cy] of F) {
      seg(b, ax, ay, bx, by, 1.7, 1.5, gold(0.62));
      seg(b, bx, by, cx, cy, 1.5, 1.2, gold(0.7));
      seg(b, cx, cy, cx + (cx < 16 ? 1.5 : -1.5), cy - 2.6, 1.0, 0.25, (t, s) => (s < 0 ? P.gold4 : P.gold1));
    }
    // la palma
    disc(b, 16, 19, 6, (l, d, x, y) => shade(GOLD, l * 0.8 + 0.1 - (d > 0.85 ? 0.15 : 0), x, y));
    // el pulgar, de lado, con su garra
    seg(b, 11, 21, 6.5, 16.5, 1.7, 1.4, gold(0.58));
    seg(b, 6.5, 16.5, 5, 13.5, 1.0, 0.25, (t, s) => (s < 0 ? P.gold4 : P.gold1));
    // los nudillos y las líneas de la palma
    for (const [x, y] of [
      [13, 17],
      [16, 16],
      [19, 17],
      [15, 21],
      [17, 22],
    ])
      b.set(x, y, P.gold1);
    sparkle(b, 23, 20);
    b.outline(P.void);
  },
  // naveta de plata con el incienso negro (unos granos humean)
  incense(b) {
    const SIL = [P.steel0, P.steel1, P.steel2, P.steel3, P.steel4, P.steel5];
    // la nave: media elipse, con la borda
    for (let y = 15; y <= 24; y++)
      for (let x = 3; x <= 28; x++) {
        const dx = (x + 0.5 - 16) / 12.5,
          dy = (y + 0.5 - 15) / 9.5;
        if (dx * dx + dy * dy > 1) continue;
        const l = 0.72 - dy * 0.55 - dx * 0.15 + (y === 15 ? 0.2 : 0);
        b.set(x, y, shade(SIL, l, x, y));
      }
    // el pie y la peana
    for (let y = 24; y <= 27; y++) for (let x = 13; x <= 18; x++) b.set(x, y, shade(SIL, 0.5 - (x - 13) / 12, x, y));
    for (let x = 10; x <= 21; x++) {
      b.set(x, 28, x < 13 ? P.steel4 : P.steel2);
      b.set(x, 29, P.steel1);
    }
    // el incienso: granos negros y grasos, con brasa en alguno
    for (let y = 11; y <= 15; y++)
      for (let x = 7; x <= 24; x++) {
        const dx = (x + 0.5 - 16) / 9,
          dy = (y + 0.5 - 15.5) / 4.5;
        if (dx * dx + dy * dy > 1) continue;
        const v = (x * 7 + y * 13) % 5;
        b.set(x, y, v === 0 ? P.ink3 : v === 1 ? P.ink0 : v === 2 ? P.ink2 : P.void);
      }
    b.set(12, 12, P.ember1);
    b.set(19, 13, P.ember1);
    b.set(16, 11, P.blood3);
    // la cucharilla, apoyada
    seg(b, 23, 14, 28.5, 7, 0.6, 0.6, (t, s) => (s < 0 ? P.steel5 : P.steel2));
    disc(b, 28.5, 6.5, 1.4, (l, d, x, y) => shade(SIL, l, x, y));
    // el humo, que no sube derecho
    for (const [x, y] of [
      [16, 9],
      [15, 8],
      [15, 7],
      [16, 6],
      [17, 5],
      [17, 4],
      [16, 3],
      [12, 9],
      [11, 7],
      [12, 6],
    ])
      b.set(x, y, P.ink3);
    sparkle(b, 9, 18);
    b.outline(P.void);
  },
  // la lágrima de Leonor: una perla clara en forma de gota, con un reflejo
  tear(b) {
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const dx = x + 0.5 - 16,
          dy = y + 0.5 - 19;
        // gota: círculo abajo que se afila hacia arriba
        const r = dy > 0 ? 8 : 8 * Math.max(0, 1 + dy / 15) ** 1.6;
        if (Math.abs(dx) > r || dy < -15 || Math.hypot(dx, Math.max(0, dy)) > 8) continue;
        const l = 0.62 - dx / 18 - dy / 26 + (Math.abs(dx) > r - 1.2 ? -0.18 : 0);
        b.set(x, y, shade([P.glass1, P.glass2, P.glass3, P.bone3, P.glass4, P.steel5], l, x, y));
      }
    // el reflejo
    b.set(12, 17, P.steel5);
    b.set(12, 18, P.steel5);
    b.set(13, 16, P.glass4);
    b.set(19, 24, P.glass4);
    sparkle(b, 23, 9);
    b.outline(P.void);
  },
  // el rey de marfil del Cerco, como la pieza del tablero: torneado, con la
  // peana de bocel y escocia, el manto acampanado con sus pliegues tallados,
  // el cuello de armiño, la cabeza barbada y la corona de oro de cinco puntas
  // con su cruz, gastada de tanto cogerla. Marfil amarillento, más oscuro en
  // lo hondo de la talla y hacia la peana.
  reyMarfil(b) {
    const IV = [P.ink3, P.parch0, P.parch1, P.parch2, P.parch3, P.parch4, P.parch5, P.bone3];
    const cx = 16;
    // el perfil, fila a fila: medio ancho y la pieza a la que pertenece
    // (t: de 0 a 1 dentro de la pieza, para el sombreado de los toros)
    const rows = [];
    const put = (y0, y1, w0, w1, part) => {
      for (let y = y0; y <= y1; y++) {
        const t = y1 > y0 ? (y - y0) / (y1 - y0) : 0.5;
        rows[y] = { w: w0 + (w1 - w0) * (part === 'mantle' ? t ** 1.35 : t), part, t };
      }
    };
    put(12, 13, 5.7, 5.4, 'collar');
    put(14, 23, 4.5, 7.1, 'mantle');
    put(24, 24, 6.6, 6.6, 'fillet');
    put(25, 26, 8.5, 8.7, 'torus');
    put(27, 27, 8.0, 8.0, 'cove');
    put(28, 30, 10.0, 9.4, 'foot');
    for (let y = 12; y <= 30; y++) {
      const R = rows[y];
      for (let x = 0; x < 32; x++) {
        const nx = (x + 0.5 - cx) / R.w;
        if (Math.abs(nx) > 1) continue;
        // un cilindro con la luz arriba a la izquierda: los cantos, oscuros
        let l = 0.62 - nx * 0.4 - nx * nx * 0.22 - (y - 12) * 0.009;
        if (R.part === 'torus' || R.part === 'collar') l += 0.16 - R.t * 0.34;
        if (R.part === 'fillet' || R.part === 'cove') l -= 0.22;
        if (R.part === 'foot') l += y === 28 ? 0.12 : y === 30 ? -0.28 : 0;
        // los pliegues del manto, que se juntan hacia los hombros, y la
        // abertura de delante
        if (R.part === 'mantle' && y > 14) for (const f of [-0.52, 0.06, 0.58]) if (Math.abs(nx - f) * R.w < 0.5) l -= f === 0.06 ? 0.3 : 0.24;
        b.set(x, y, shade(IV, l, x, y));
      }
    }
    // el armiño del cuello: motas negras
    for (const [x, y] of [
      [12, 12],
      [15, 13],
      [18, 12],
      [20, 13],
    ])
      b.set(x, y, P.ink2);
    // la cabeza: una bola, con los ojos y la barba tallados
    for (let y = 4; y <= 12; y++)
      for (let x = 11; x <= 21; x++) {
        const dx = x + 0.5 - cx,
          dy = y + 0.5 - 9.0;
        if (Math.hypot(dx, dy * 1.05) > 3.9) continue;
        let l = 0.78 - dx / 7.5 - dy / 10 - (dx * dx + dy * dy) / 40;
        // la barba: más abajo de la boca, con sus surcos
        if (dy > 1.0) l -= 0.1 + (Math.abs(dx - 0.5) % 2 < 0.6 ? 0.18 : 0);
        b.set(x, y, shade(IV, l, x, y));
      }
    b.set(14, 8, P.parch1);
    b.set(17, 8, P.parch1);
    b.set(16, 10, P.parch2);
    b.set(15, 10, P.parch3);
    // la corona: el aro (con su rubí delante), las cinco puntas (las de
    // detrás, más bajas y en sombra) y la cruz
    for (let y = 4; y <= 5; y++)
      for (let x = 11; x <= 21; x++) {
        const nx = (x + 0.5 - cx) / 5.0;
        if (Math.abs(nx) > 1) continue;
        b.set(x, y, shade(GOLD, 0.74 - nx * 0.45 - nx * nx * 0.2 - (y - 4) * 0.22, x, y));
      }
    b.set(16, 5, P.ruby3);
    b.set(13, 5, P.glass3);
    b.set(19, 5, P.glass2);
    for (const [x, top, c] of [
      [12, 2, P.gold3],
      [20, 2, P.gold2],
      [14, 3, P.gold1],
      [18, 3, P.gold1],
      [16, 2, P.gold4],
    ])
      for (let y = top; y < 4; y++) b.set(x, y, y === top ? c : P.gold2);
    b.vline(16, 0, 2, P.gold4);
    b.set(15, 1, P.gold3);
    b.set(17, 1, P.gold2);
    // el brillo del marfil, a lo largo del manto, por el lado de la luz
    for (const [x, y] of [
      [12, 16],
      [12, 17],
      [11, 19],
      [11, 20],
      [10, 22],
    ])
      b.set(x, y, P.bone3);
    sparkle(b, 23, 7);
    b.outline(P.void);
  },
  // ampolla con las lágrimas de la santa (líquido ámbar que brilla)
  flask(b) {
    drawFlask(b, true);
  },
  flaskEmpty(b) {
    drawFlask(b, false);
  },
  // relicario de plata con un hueso tras un cristal
  reliquary(b) {
    const SIL = [P.steel0, P.steel1, P.steel2, P.steel3, P.steel4, P.steel5];
    for (let y = 9; y <= 27; y++)
      for (let x = 6; x <= 25; x++) {
        const d = Math.min(x - 6, y - 9, 25 - x, 27 - y);
        const l = 0.72 - (x - 6) / 40 - (y - 9) / 36;
        b.set(x, y, d === 0 ? (x === 6 || y === 9 ? P.steel4 : P.steel1) : d === 1 ? shade(SIL, l + 0.15, x, y) : shade(SIL, l - 0.05, x, y));
      }
    // tapa a dos aguas
    for (let y = 5; y <= 9; y++) for (let x = 6 + (9 - y); x <= 25 - (9 - y); x++) b.set(x, y, y === 5 ? P.steel5 : shade(SIL, 0.8 - (y - 5) / 8 - (x - 6) / 60, x, y));
    // ventana con el hueso
    for (let y = 13; y <= 23; y++) for (let x = 10; x <= 21; x++) b.set(x, y, y === 13 || x === 10 ? P.void : P.ink2);
    seg(b, 12, 21, 19.5, 15, 1.1, 1.1, (t, s) => (s < 0 ? P.bone3 : P.bone1));
    disc(b, 12, 21, 1.6, (l, d, x, y) => shade([P.bone0, P.bone1, P.bone2, P.bone3], l, x, y));
    disc(b, 19.5, 15, 1.6, (l, d, x, y) => shade([P.bone0, P.bone1, P.bone2, P.bone3], l, x, y));
    b.set(20, 14, P.steel5); // reflejo del cristal
    b.set(19, 14, P.steel4);
    // cruz y gemas de las esquinas
    for (let y = 0; y <= 5; y++) b.set(15, y, y === 0 ? P.gold4 : P.gold3), b.set(16, y, P.gold2);
    for (let x = 13; x <= 18; x++) b.set(x, 2, x < 16 ? P.gold3 : P.gold2);
    for (const [x, y] of [
      [8, 25],
      [23, 25],
      [8, 11],
      [23, 11],
    ])
      b.set(x, y, P.ruby2);
    b.outline(P.void);
  },
  // rosario de azabache con la cruz de plata ennegrecida
  rosary(b) {
    const JET = [P.void, P.ink1, P.ink3, P.iron1, P.iron3, P.steel3];
    const SIL = [P.steel0, P.steel1, P.steel2, P.steel3, P.steel4, P.steel5];
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = 15.5 + Math.cos(a) * 9.5 + Math.sin(a) * 1.4,
        y = 11 + Math.sin(a) * 6.8;
      disc(b, x, y, 1.75, (l, d, xx, yy) => shade(i % 6 === 3 ? SIL : JET, l * 0.95 + 0.04, xx, yy));
    }
    // tramo que cuelga hasta la cruz
    for (let i = 0; i < 3; i++) disc(b, 15.2 - i * 0.5, 19.6 + i * 2.6, 1.55, (l, d, xx, yy) => shade(JET, l, xx, yy));
    for (let y = 25; y <= 31; y++) for (let x = 13; x <= 15; x++) b.set(x, y, shade(SIL, 0.85 - (y - 25) / 12 - (x - 13) * 0.14, x, y));
    for (let x = 10; x <= 18; x++) for (let y = 26; y <= 27; y++) b.set(x, y, shade(SIL, 0.9 - (x - 10) / 14 - (y - 26) * 0.18, x, y));
    sparkle(b, 23, 5);
    b.outline(P.void);
  },
  // piedra de afilar con runas que arden
  whetstone(b) {
    const ST = [P.void, P.iron0, P.iron1, P.iron2, P.iron3, P.iron4, P.iron5];
    seg(b, 5, 24, 26, 9, 4, 3.2, (t, s, x, y) => shade(ST, 0.62 - s * 0.35 + (bayer(x * 2, y) - 0.5) * 0.15, x, y));
    // runas
    for (const [x, y] of [
      [10, 20],
      [11, 19],
      [11, 21],
      [15, 17],
      [16, 16],
      [16, 18],
      [17, 17],
      [20, 13],
      [21, 14],
      [21, 12],
    ])
      b.set(x, y, P.ember3);
    for (const [x, y] of [
      [11, 20],
      [16, 17],
      [21, 13],
    ])
      b.set(x, y, P.ember4);
    // chispas
    for (const [x, y, c] of [
      [25, 4, P.ember4],
      [28, 6, P.ember3],
      [23, 3, P.ember2],
      [29, 2, P.ember2],
    ])
      b.set(x, y, c);
    b.outline(P.void);
  },
  // ---------------------------------------------------------- objetos benditos
  // la Saeta de San Sebastián: una punta de flecha negra, de hoja ancha, con
  // el muñón del asta atado con un fleje de plata y una cinta roja
  saeta(b) {
    const SIL = [P.steel0, P.steel1, P.steel2, P.steel3, P.steel4, P.steel5];
    // el asta rota (abajo a la izquierda) y su astilla
    seg(b, 4.5, 27.5, 15, 17, 1.7, 1.5, (t, s, x, y) => shade(WOOD, 0.62 - s * 0.4 - t * 0.1, x, y));
    seg(b, 3.5, 28.5, 5.5, 29.5, 0.7, 0.4, () => P.wood1);
    // el fleje de plata y la cinta
    seg(b, 12.5, 17.5, 15.5, 20.5, 2.1, 2.1, (t, s, x, y) => shade(SIL, 0.75 - s * 0.35, x, y));
    seg(b, 13, 21, 9, 27, 1.0, 0.6, (t, s, x, y) => shade(RUBY, 0.7 - s * 0.4 - t * 0.3, x, y));
    seg(b, 14.5, 21.5, 13, 28.5, 0.9, 0.5, (t, s, x, y) => shade(RUBY, 0.55 - s * 0.4 - t * 0.3, x, y));
    // la hoja: un rombo largo con su nervio
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        // a lo largo (u) y a lo ancho (v) de la diagonal de la hoja
        const px = x + 0.5 - 15.5,
          py = y + 0.5 - 16.5;
        const u = (px - py) / Math.SQRT2,
          v = (px + py) / Math.SQRT2;
        if (u < 0 || u > 15) continue;
        const w = u < 5 ? (u / 5) * 4.6 : 4.6 * (1 - (u - 5) / 10);
        if (Math.abs(v) > w) continue;
        const l = 0.55 - v / 8 + (Math.abs(v) < 0.8 ? 0.22 : 0) + (Math.abs(v) > w - 0.9 ? 0.25 : 0) - u / 60;
        b.set(x, y, shade(IRON, l, x, y));
      }
    holySparkle(b, 27, 5);
    b.outline(P.void);
  },
  // el Escapulario del ama: dos paños de lana parda unidos por dos cintas; en
  // el de delante, la Virgen del Carmen bordada (manto azul, aureola)
  escapulario(b) {
    const WOOL = [P.wood0, P.wood1, P.wood2, P.wood3, P.wood4];
    const panel = (x0, y0, w, h, front) => {
      for (let y = y0; y < y0 + h; y++)
        for (let x = x0; x < x0 + w; x++) {
          const edge = x === x0 || y === y0 || x === x0 + w - 1 || y === y0 + h - 1;
          const l = 0.62 - (x - x0) / (w * 3) - (y - y0) / (h * 3) + ((x * 3 + y * 5) % 7 === 0 ? 0.12 : 0);
          b.set(x, y, edge ? (x === x0 || y === y0 ? P.wood3 : P.wood0) : shade(WOOL, front ? l : l - 0.15, x, y));
        }
    };
    // las cintas: de un paño al otro, por encima
    seg(b, 9, 10, 20, 4, 0.7, 0.7, () => P.parch2);
    seg(b, 13, 10, 24, 6, 0.7, 0.7, () => P.parch1);
    panel(17, 3, 10, 12, false);
    panel(4, 10, 13, 17, true);
    // la Virgen: la aureola, la cara, el manto y el Niño
    for (let y = 12; y <= 14; y++) for (let x = 8; x <= 12; x++) if (Math.hypot(x - 10, y - 13.5) < 2.4 && Math.hypot(x - 10, y - 13.5) > 1.2) b.set(x, y, P.gold3);
    b.set(10, 14, P.bone3);
    b.set(9, 14, P.bone2);
    for (let y = 15; y <= 23; y++) {
      const hw = 1 + Math.floor((y - 15) / 2);
      for (let x = 10 - hw; x <= 10 + hw; x++) b.set(x, y, x < 10 ? P.glass2 : P.glass1);
    }
    b.set(10, 18, P.bone2);
    b.set(11, 18, P.bone3);
    b.set(10, 24, P.gold2);
    b.outline(P.void);
  },
  // el Óbolo de las Ánimas: una moneda de plata, vista algo de lado, con un
  // alma entre llamas grabada bajo la cruz
  obolo(b) {
    const SIL = [P.steel0, P.steel1, P.steel2, P.steel3, P.steel4, P.steel5];
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const dx = (x + 0.5 - 16) / 11,
          dy = (y + 0.5 - 17) / 9;
        const d = Math.hypot(dx, dy);
        if (d > 1) continue;
        // el canto (abajo, en sombra) y la cara, con el borde en relieve
        const rim = d > 0.82;
        const l = 0.6 - dx * 0.3 - dy * 0.35 + (rim ? 0.15 : 0) - (d > 0.95 ? 0.35 : 0);
        b.set(x, y, shade(SIL, l, x, y));
      }
    // el canto de la moneda
    for (let x = 6; x <= 26; x++) {
      const yb = 17 + Math.round(9 * Math.sqrt(Math.max(0, 1 - ((x + 0.5 - 16) / 11) ** 2)));
      b.set(x, yb, P.steel1);
      b.set(x, yb + 1, P.steel0);
    }
    // la cruz y el alma entre llamas
    for (let y = 9; y <= 13; y++) b.set(16, y, P.steel1);
    for (let x = 14; x <= 18; x++) b.set(x, 11, P.steel1);
    for (const [x, y, c] of [
      [16, 16, P.bone1],
      [16, 17, P.bone1],
      [15, 18, P.steel1],
      [17, 18, P.steel1],
      [13, 21, P.ember2],
      [14, 20, P.ember3],
      [15, 21, P.ember2],
      [17, 21, P.ember2],
      [18, 20, P.ember3],
      [19, 21, P.ember2],
      [16, 22, P.ember3],
      [14, 22, P.ember1],
      [18, 22, P.ember1],
    ])
      b.set(x, y, c);
    sparkle(b, 10, 11);
    b.outline(P.void);
  },
  // el Cerrojo de San Martín: un pasador de hierro con su tirador doblado,
  // en sus dos grapas, con la cruz grabada
  cerrojo(b) {
    // las grapas (abajo y arriba del pasador)
    for (const [cx, cy] of [
      [11, 21],
      [21, 11],
    ])
      seg(b, cx - 2.6, cy + 2.6, cx + 2.6, cy - 2.6, 2.6, 2.6, (t, s, x, y) => shade(IRON, 0.35 - s * 0.3, x, y));
    // el pasador
    seg(b, 4.5, 27.5, 26.5, 5.5, 1.8, 1.8, (t, s, x, y) => shade(IRON, 0.7 - s * 0.45, x, y));
    // el tirador, doblado hacia abajo
    seg(b, 8.5, 23.5, 12.5, 28.5, 1.4, 1.2, (t, s, x, y) => shade(IRON, 0.6 - s * 0.4, x, y));
    disc(b, 12.8, 28.6, 1.9, (l, d, x, y) => shade(IRON, l, x, y));
    // la cruz de Martín, en oro, sobre el pasador
    for (const [x, y] of [
      [17, 14],
      [16, 15],
      [18, 15],
      [17, 16],
      [15, 16],
      [19, 14],
    ])
      b.set(x, y, P.gold3);
    b.set(17, 15, P.gold4);
    holySparkle(b, 26, 4);
    b.outline(P.void);
  },
  // --- la armadura (y, apagadas, las siluetas de sus ranuras vacías)
  // yelmo de nasal con la banda de la frente remachada
  helm(b) {
    const inside = (x, y) => {
      const px = x + 0.5,
        py = y + 0.5;
      if (py < 3.5 || py > 28.5) return false;
      if (py < 15) return ((px - 16) / 10.5) ** 2 + ((py - 15) / 11.5) ** 2 <= 1;
      return Math.abs(px - 16) <= 10.5 - (py - 15) * 0.2;
    };
    plate(b, inside, (x, y) => 0.88 - (x - 5) / 30 - (y - 3) / 48);
    // la cara, abierta a los lados del nasal: los ojos y, debajo, la boca
    for (let y = 16; y <= 18; y++) for (let x = 8; x <= 23; x++) if ((x < 15 || x > 16) && inside(x - 1, y) && inside(x + 1, y)) b.set(x, y, P.void);
    for (let y = 19; y <= 28; y++) for (let x = 11; x <= 20; x++) if ((x < 15 || x > 16 || y > 24) && inside(x, y)) b.set(x, y, P.void);
    // el nasal y la cresta
    for (let y = 5; y <= 24; y++) {
      b.set(15, y, y < 13 ? P.steel5 : P.steel4);
      b.set(16, y, P.steel2);
    }
    // la banda de la frente
    for (let x = 5; x <= 26; x++)
      if (inside(x, 13)) {
        b.set(x, 13, shade(BRONZE, 0.85 - (x - 5) / 30, x, 13));
        b.set(x, 14, shade(BRONZE, 0.45 - (x - 5) / 40, x, 14));
      }
    for (const x of [8, 12, 20, 24]) b.set(x, 13, BRONZE[5]);
    b.outline(P.void);
  },
  // coraza con la arista del pecho, el cinto y las launas del faldar
  cuirass(b) {
    const inside = (x, y) => {
      const px = x + 0.5,
        py = y + 0.5;
      if (py < 4 || py > 29) return false;
      if ((px - 16) ** 2 + (py - 3) ** 2 < 30) return false; // el cuello
      const ax = Math.abs(px - 16);
      if (py < 9.5) return ax <= 13.5 - (py < 6 ? (6 - py) * 1.2 : 0);
      if (py < 22.5) return ax <= 11 - Math.max(0, py - 14) * 0.2;
      return ax <= 9.5 + (py - 22.5) * 0.45;
    };
    plate(b, inside);
    // la arista del pecho
    for (let y = 9; y <= 21; y++) {
      b.set(15, y, P.steel5);
      b.set(16, y, P.steel3);
    }
    // las hombreras, separadas del peto
    for (const x of [7, 24]) for (let y = 6; y <= 10; y++) b.set(x, y, P.steel1);
    // el cinto de cuero con su hebilla
    for (let x = 6; x <= 26; x++)
      if (inside(x, 21)) {
        b.set(x, 21, shade(WOOD, 0.8 - (x - 6) / 30, x, 21));
        b.set(x, 22, P.wood1);
      }
    b.rect(15, 21, 2, 2, P.gold4);
    b.set(16, 22, P.gold2);
    // las launas del faldar
    for (const y of [25, 28]) for (let x = 4; x <= 28; x++) if (inside(x, y)) b.set(x, y, P.steel1);
    for (const [x, y] of [
      [6, 7],
      [25, 7],
      [9, 12],
      [22, 12],
    ])
      b.set(x, y, P.steel5);
    b.outline(P.void);
  },
  // guantelete: la bocamanga, el dorso, los dedos articulados y el pulgar
  gauntlets(b) {
    const finger = (x, y) => y >= 4 && y <= 12 && x >= 9 && x <= 20 && (x - 9) % 3 !== 2;
    const inside = (x, y) => {
      const px = x + 0.5,
        py = y + 0.5;
      if (finger(x, y)) return true;
      if (py >= 12 && py < 21) return Math.abs(px - 15) <= 6.5;
      if (py >= 21 && py <= 29) return Math.abs(px - 15) <= 6 + (py - 21) * 0.55;
      return false;
    };
    plate(b, inside);
    // las junturas de los dedos y del dorso
    for (let x = 9; x <= 20; x++) {
      if ((x - 9) % 3 === 2) continue;
      for (const y of [7, 10]) b.set(x, y, P.steel1);
    }
    for (const y of [14, 17]) for (let x = 9; x <= 21; x++) if (inside(x, y)) b.set(x, y, P.steel1);
    // el pulgar
    seg(b, 21, 18, 25, 12, 1.6, 1.3, (t, s2, x, y) => shade(STEEL, 0.6 - s2 * 0.3, x, y));
    // el ribete de la bocamanga
    for (let x = 6; x <= 25; x++) if (inside(x, 21)) b.set(x, 21, BRONZE[4]);
    b.outline(P.void);
  },
  // grebas con sus rodilleras y escarpes
  greaves(b) {
    const leg = (cx) => (x, y) => {
      const px = x + 0.5,
        py = y + 0.5;
      if (py < 3 || py > 28) return false;
      if ((px - cx) ** 2 + (py - 8) ** 2 <= 17) return true; // la rodillera
      if (py < 22) return Math.abs(px - cx) <= 3.4 - (py > 12 ? (py - 12) * 0.05 : 0);
      // el escarpe, con la punta hacia delante (a la izquierda)
      return px >= cx - 3.4 - (py - 22) * 1.1 && px <= cx + 3.4;
    };
    for (const cx of [10, 22]) {
      const ins = leg(cx);
      plate(b, ins);
      for (let x = cx - 4; x <= cx + 4; x++) if (ins(x, 12)) b.set(x, 12, P.steel1);
      b.set(cx - 1, 7, P.steel5);
      b.set(cx, 6, P.steel5);
    }
    b.outline(P.void);
  },
  // colgante con la cruz y la piedra (la ranura del objeto bendito)
  amulet(b) {
    for (let i = 0; i <= 26; i++) {
      const t = i / 26;
      b.set(6 + t * 20, 3 + Math.sin(t * Math.PI) * 8, i % 2 ? P.gold2 : P.gold4);
    }
    const inCross = (x, y) => (x >= 14 && x <= 17 && y >= 11 && y <= 28) || (x >= 9 && x <= 22 && y >= 15 && y <= 18);
    for (let y = 10; y < 30; y++) for (let x = 8; x < 24; x++) if (inCross(x, y)) b.set(x, y, shade(GOLD, 0.85 - (x - 9) / 22 - (y - 11) / 40 - (!inCross(x - 1, y) || !inCross(x + 1, y) || !inCross(x, y + 1) ? 0.25 : 0), x, y));
    disc(b, 16, 17, 1.9, (l, d, x, y) => shade(RUBY, l + 0.15, x, y));
    b.outline(P.void);
  },
  // nada (quitarse lo que hay en la ranura)
  none(b) {
    seg(b, 9, 9, 23, 23, 1.1, 1.1, () => P.iron2);
    seg(b, 23, 9, 9, 23, 1.1, 1.1, () => P.iron2);
  },
  // rollo de pergamino con lacre
  note(b) {
    const PA = [P.parch0, P.parch1, P.parch2, P.parch3, P.parch4, P.parch5];
    for (let y = 7; y <= 25; y++) for (let x = 7; x <= 24; x++) b.set(x, y, shade(PA, 0.8 - (x - 7) / 40 - (y - 7) / 60, x, y));
    // rollos arriba y abajo
    for (const yy of [6, 26]) seg(b, 5, yy, 26, yy, 2.2, 2.2, (t, s, x, y) => shade(PA, 0.7 - s * 0.35, x, y));
    // renglones
    for (let y = 11; y <= 21; y += 3) for (let x = 10; x <= 21 - ((y * 7) % 5); x++) if ((x + y) % 7) b.set(x, y, P.pink1);
    // lacre
    disc(b, 21, 22, 3, (l, d, x, y) => shade([P.blood0, P.blood1, P.blood2, P.blood3, P.blood4], l, x, y));
    b.set(21, 22, P.blood1);
    b.outline(P.void);
  },
};

function drawFlask(b, full) {
  const inBody = (x, y) => Math.hypot(x + 0.5 - 16, (y + 0.5 - 20) * 1.05) <= 8.6;
  const LIQ = [P.ember0, P.ember1, P.ember2, P.ember3, P.ember4];
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      if (!inBody(x, y)) continue;
      const dx = x + 0.5 - 16,
        dy = y + 0.5 - 20;
      const rim = !inBody(x - 1, y) || !inBody(x + 1, y) || !inBody(x, y + 1) || !inBody(x, y - 1);
      if (rim) {
        b.set(x, y, dx < 0 && dy < 2 ? P.glass3 : P.glass1);
        continue;
      }
      if (full && y >= 16) {
        const l = 0.7 - dx / 20 + (y === 16 ? 0.35 : 0) - (y > 25 ? 0.25 : 0);
        b.set(x, y, shade(LIQ, l, x, y));
      } else b.set(x, y, (x + y) % 3 === 0 ? P.glass1 : P.glass0);
    }
  // cuello y corcho
  for (let y = 6; y <= 12; y++) for (let x = 13; x <= 18; x++) b.set(x, y, x === 13 ? P.glass3 : x === 18 ? P.glass1 : y > 9 && full ? P.ember2 : P.glass0);
  for (let y = 2; y <= 6; y++) for (let x = 13; x <= 18; x++) b.set(x, y, shade(WOOD, 0.8 - (x - 13) / 8 - (y - 2) / 12, x, y));
  b.hline(12, 19, 12, P.glass2);
  // reflejo
  b.set(11, 16, P.glass4);
  b.set(10, 17, P.glass4);
  b.set(10, 18, P.glass3);
  if (full) {
    b.set(19, 22, P.ember4);
    b.set(18, 23, P.ember4);
  }
  b.outline(P.void);
}

// ---------------------------------------------------------------- pequeños (9x9)
const SMALL = {
  heart(b) {
    for (const [x, y, w] of [
      [1, 1, 3],
      [5, 1, 3],
      [0, 2, 9],
      [0, 3, 9],
      [1, 4, 7],
      [2, 5, 5],
      [3, 6, 3],
      [4, 7, 1],
    ])
      b.rect(x, y, w, 1, P.blood3);
    b.set(2, 2, P.blood4);
    b.set(1, 3, P.blood4);
    b.hline(3, 5, 5, P.blood2);
    b.set(4, 6, P.blood2);
  },
  flask(b) {
    b.rect(3, 0, 3, 2, P.wood3);
    b.rect(3, 2, 3, 2, P.glass1);
    b.disc(4.5, 5.5, 3.2, P.ember2);
    b.set(3, 4, P.glass4);
    b.set(5, 6, P.ember4);
    b.hline(2, 6, 4, P.ember3);
  },
  sword(b) {
    for (let i = 0; i < 6; i++) b.set(2 + i, 6 - i, i < 5 ? P.steel4 : P.steel5);
    for (let i = 0; i < 5; i++) b.set(3 + i, 7 - i, P.steel2);
    b.line(0, 5, 3, 8, P.gold3);
    b.set(1, 8, P.wood3);
    b.set(0, 8, P.gold2);
  },
  skull(b) {
    b.disc(4, 3.5, 3.4, P.bone2);
    b.rect(2, 6, 5, 2, P.bone1);
    b.rect(2, 3, 2, 2, P.void);
    b.rect(5, 3, 2, 2, P.void);
    b.set(4, 5, P.void);
    b.set(3, 7, P.void);
    b.set(5, 7, P.void);
    b.set(2, 1, P.bone3);
  },
  hourglass(b) {
    b.hline(1, 7, 0, P.wood3);
    b.hline(1, 7, 8, P.wood2);
    for (let y = 1; y <= 7; y++) {
      const w = Math.abs(4 - y);
      for (let x = 4 - w; x <= 4 + w; x++) b.set(x, y, (y > 4 && y < 7 && Math.abs(x - 4) < w) || (y < 4 && y > 2 && Math.abs(x - 4) < w - 1) ? P.gold3 : P.glass1);
    }
    b.set(4, 4, P.gold3);
  },
  doc(b) {
    b.rect(1, 0, 7, 9, P.parch3);
    b.vline(1, 0, 8, P.parch4);
    for (let y = 2; y <= 6; y += 2) b.hline(3, 6, y, P.pink1);
    b.set(6, 7, P.blood3);
  },
  // leyenda del mapa
  player(b) {
    b.poly(
      [
        [4.5, 0],
        [8.5, 8.5],
        [4.5, 6],
        [0.5, 8.5],
      ],
      P.bone3
    );
    b.set(4, 2, P.gold4);
  },
  altar(b) {
    for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) if (Math.abs(x - 4) + Math.abs(y - 4) <= 4) b.set(x, y, Math.abs(x - 4) + Math.abs(y - 4) >= 3 ? P.ember2 : P.ember3);
    b.set(4, 4, P.ember4);
  },
  locked(b) {
    b.rect(1, 1, 7, 7, P.blood3);
    b.hline(1, 7, 1, P.blood4);
    b.rect(3, 3, 3, 3, P.blood1);
  },
  open(b) {
    b.rect(1, 1, 7, 7, P.moss3);
    b.hline(1, 7, 1, P.moss4);
    b.rect(3, 3, 3, 3, P.moss1);
  },
  item(b) {
    b.disc(4, 4, 2.2, P.bone3);
    b.set(4, 4, P.gold4);
  },
  // (los objetos benditos, en el HUD; 'worn': el que se lleva, en el inventario)
  saeta(b) {
    for (let i = 0; i < 5; i++) b.set(1 + i, 7 - i, i < 2 ? P.wood3 : P.iron2);
    for (const [x, y] of [
      [5, 1],
      [6, 1],
      [7, 1],
      [7, 2],
      [7, 3],
      [6, 2],
      [5, 2],
      [6, 3],
    ])
      b.set(x, y, P.iron3);
    b.set(6, 2, P.iron5);
    b.set(3, 5, P.steel4);
  },
  escapulario(b) {
    for (let y = 2; y < 8; y++) for (let x = 1; x < 6; x++) b.set(x, y, P.wood2);
    for (let y = 1; y < 5; y++) for (let x = 5; x < 8; x++) b.set(x, y, P.wood1);
    b.set(3, 4, P.glass2);
    b.set(3, 5, P.glass2);
    b.set(3, 3, P.gold3);
  },
  obolo(b) {
    b.disc(4, 4.5, 3.2, P.steel3);
    b.disc(3.6, 4.1, 1.8, P.steel4);
    b.set(4, 5, P.ember3);
    b.set(4, 3, P.steel1);
  },
  cerrojo(b) {
    for (let i = 0; i < 7; i++) b.set(1 + i, 7 - i, P.iron3), b.set(1 + i, 8 - i, P.iron1);
    b.set(1, 8, P.iron4);
    b.set(4, 4, P.gold4);
  },
  // (las estadísticas del equipo: el aguante y lo que para la armadura)
  stamina(b) {
    b.poly(
      [
        [5.5, 0],
        [1, 5],
        [4, 5],
        [3, 9],
        [8, 3.5],
        [5, 3.5],
        [6.5, 0],
      ],
      P.moss3
    );
    b.set(5, 1, P.moss4);
    b.set(4, 2, P.moss4);
  },
  shield(b) {
    for (let y = 0; y < 9; y++) {
      const hw = y < 4 ? 3.6 : 3.6 * (1 - (y - 4) / 5.2);
      for (let x = 0; x < 9; x++) if (Math.abs(x + 0.5 - 4.5) <= hw) b.set(x, y, x < 4 ? P.iron3 : P.iron2);
    }
    b.vline(4, 1, 6, P.blood3);
    b.hline(2, 6, 3, P.blood3);
  },
  worn(b) {
    for (let i = 1; i < 8; i++) b.set(4, i, P.gold3);
    for (let i = 2; i < 7; i++) b.set(i, 3, P.gold3);
    b.set(4, 3, P.gold5);
  },
};

const cache = new Map();
export function iconBitmap(name) {
  const k = 'i:' + name;
  if (!cache.has(k)) {
    const b = new Bitmap(32, 32);
    (ICONS[name] || ICONS.note)(b);
    cache.set(k, b);
  }
  return cache.get(k);
}
// La silueta apagada de un icono, hundida en la casilla: la ranura vacía.
export function ghostIcon(name) {
  const k = 'g:' + name;
  if (!cache.has(k)) {
    const src = iconBitmap(name);
    const b = new Bitmap(32, 32);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const v = src.d[y * 32 + x];
        if (v >>> 24 === 0) continue;
        const lum = ((v & 0xff) + ((v >> 8) & 0xff) + ((v >> 16) & 0xff)) / 765;
        b.set(x, y, lum > 0.42 ? P.iron1 : P.iron0);
      }
    cache.set(k, b);
  }
  return cache.get(k);
}
export function smallIcon(name) {
  const k = 's:' + name;
  if (!cache.has(k)) {
    const b = new Bitmap(11, 11);
    const inner = new Bitmap(9, 9);
    (SMALL[name] || SMALL.item)(inner);
    b.blit(inner, 1, 1);
    b.outline(P.void);
    cache.set(k, b);
  }
  return cache.get(k);
}
// compatibilidad: URL de la imagen del icono
export function icon(name) {
  return iconBitmap(name).url();
}
