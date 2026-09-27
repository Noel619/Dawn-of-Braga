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
