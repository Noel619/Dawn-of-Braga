// La mesa del Desfigurado: la pantalla de los cocimientos (game/alquimia.js).
//
// A la izquierda, lo que traes de lo hondo; en medio, su puchero al fuego,
// donde se echan los ingredientes de uno en uno (se ven caer, salpicar,
// flotar y teñir el caldo) y, debajo, lo que hay dentro y lo que va saliendo;
// a la derecha, en una hoja de su cuaderno, lo que te enseñó: las dos
// recetas, con lo que ya está en el puchero marcado en dorado. Cuando lo de
// dentro es justo una receta, se cuece: el fuego se aviva, hierve, lo de
// dentro se hunde, el caldo se pone del color que es y sale el cocimiento.
// Lo echado no se gasta hasta cocerlo: al dejar la mesa vuelve a la bolsa.
//
// Teclado y mando: las flechas (la cruz, el stick) van de lo que traes al
// puchero, al botón de cocer y a las recetas; «confirmar» echa, saca, cuece
// o prepara (vacía el puchero y echa lo de la receta); X saca (lo elegido
// del puchero o lo último que se echó); C (Y en el mando) cuece. Con el
// ratón se pincha todo, y se arrastra al puchero (y fuera de él, para
// sacarlo); el clic derecho saca.
import { TONICOS, INGREDIENTES, CABEN, cuenta, queSale, cocerPuchero } from './alquimia.js';
import { ITEMS, MSG } from './story.js';
import { iconBitmap, ghostIcon, smallIcon } from './icons.js';
import { PAL as P, Bitmap, bayer, hash, vnoise, ramp, spriteHtml, spriteImg, slotBitmap, attachBackdrop, parchmentBitmap } from '../ui/pixel.js';
import { clamp } from '../core/util.js';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------------------------------------------------------------- el puchero
// El lienzo (en píxeles de arte) y las medidas del puchero: la boca por fuera
// y por dentro, el caldo y la panza.
export const PW = 136,
  PH = 100;
const CX = 68;
const BOCA = { y: 40, rx: 37, ry: 10 };
const DENTRO = { y: 40.5, rx: 31, ry: 7.5 };
const CALDO = { y: 43, rx: 30, ry: 7 };
const PANZA = [40, 84];
// el ancho de la panza a cada altura: se abulta y se redondea abajo
function panza(y) {
  const t = (y - PANZA[0]) / (PANZA[1] - PANZA[0]);
  return 36 + 9 * Math.sin(Math.PI * t * 0.85) - (t > 0.8 ? ((t - 0.8) / 0.2) ** 2 * 14 : 0);
}
const enElipse = (x, y, cx, E) => ((x + 0.5 - cx) / E.rx) ** 2 + ((y + 0.5 - E.y) / E.ry) ** 2 <= 1;
// barro cocido, con la lumbre de abajo
const BARRO = ['#140b06', '#2b160b', '#482413', '#69381d', '#8b4f29', '#ac6936', '#cc8a50'];
const LUMBRE = [P.blood1, P.blood2, P.blood3, P.ember2, P.ember3, P.ember4, P.gold5];
const PIEDRA = [P.void, P.iron0, P.iron1, P.iron2, P.iron3, P.iron4];
const LENA = [P.wood0, P.wood1, P.wood2, P.wood3];
// El color del caldo según lo que hay dentro (de lo oscuro a lo claro).
export const CALDOS = {
  agua: [P.ink1, P.glass0, P.glass1, P.glass2, P.glass3],
  verdoso: [P.moss0, P.glass0, P.moss1, P.moss2, P.glass3],
  rojizo: [P.blood0, P.wood1, P.blood1, P.wood2, P.ember1],
  oscuro: [P.void, P.ink1, P.moss0, P.ink3, P.moss1],
  turbio: [P.ink1, P.wood0, P.wood1, P.iron2, P.wood2],
  verde: [P.moss1, P.moss2, P.moss3, P.moss4, '#dde9a6'],
  negro: [P.void, P.void, P.ink1, P.ruby0, P.ruby1],
};
// lo que se echa cae aquí (el centro del caldo, si no se ha soltado en otro
// sitio) y flota en uno de estos sitios
const SITIOS = [
  [-13, -1],
  [10, 1],
  [-1, 3],
  [20, -2],
  [-22, 2],
  [3, -3],
];

// El puchero al fuego, a resolución de arte. o:
//  t: el tiempo, en segundos; caldo: { a, b, k } (la paleta de antes, la de
//  ahora y cuánto ha pasado de una a otra: se mezclan tramadas); flota:
//  [{ id, x, y, t0 }] (lo de dentro, flotando: desde que cae, en t0, más lo
//  que tarda en caer); caen: [{ id, x, y, t0 }] (lo que se acaba de echar:
//  cae, salpica y deja su onda); hierve: 0..1 (al cocer:
//  el fuego, las burbujas, el vapor y lo de dentro, que se hunde); brillo:
//  0..1 (el fogonazo de cuando cuaja); sale: { icon, k, a } (el cocimiento
//  hecho, que sube del caldo: k, cuánto ha subido; a, lo que se ve todavía);
//  sobre: si lo que se arrastra está encima (la boca, dorada).
export function pucheroBitmap(o) {
  const t = o.t || 0;
  const hierve = o.hierve || 0;
  const calor = 1 + hierve * 0.8;
  const tf = Math.floor(t * 12) / 12;
  const b = new Bitmap(PW, PH);
  // (al hervir fuerte, el puchero tiembla)
  const cx = CX + (hierve > 0.45 && Math.floor(t * 18) % 3 === 0 ? 1 : 0);
  // ---- el resplandor de la lumbre, detrás (tramado)
  for (let y = 30; y < PH; y++)
    for (let x = 0; x < PW; x++) {
      const d = Math.hypot((x - CX) / 66, (y - 96) / 50);
      if (d >= 1) continue;
      const k = (1 - d) ** 2 * (0.62 + 0.3 * calor) + (vnoise(x * 0.12, tf * 2.5, 7) - 0.5) * 0.1;
      if (k < bayer(x, y) * 0.9 + 0.1) continue;
      b.set(x, y, k > 0.62 ? P.ember1 : P.ember0);
    }
  // ---- las llamas de detrás (lamen la panza y asoman por los lados)
  llamas(b, cx, tf, calor, 93, 40, 1, 47);
  // ---- la leña
  const lena = new Bitmap(PW, PH);
  for (const [x0, y0, x1, y1] of [
    [CX - 32, 91, CX + 28, 96],
    [CX - 26, 96, CX + 33, 90],
  ])
    for (let k = 0; k <= 60; k++) {
      const f = k / 60;
      const lx = x0 + (x1 - x0) * f,
        ly = y0 + (y1 - y0) * f;
      for (let dy = -2; dy <= 2; dy++) {
        const X = Math.round(lx),
          Y = Math.round(ly + dy);
        // (las grietas encendidas, que laten)
        const ascua = hash(X >> 1, Y, 31) > 0.78 && vnoise(X * 0.4, tf * 3, 33) > 0.45;
        lena.set(X, Y, ascua ? (dy === 0 ? P.ember3 : P.ember2) : LENA[clamp(2 - dy + (dy < 0 ? 1 : 0), 0, 3)]);
      }
    }
  lena.outline(P.void);
  b.blit(lena, 0, 0);
  // ---- el puchero: la panza, las asas, la boca, el caldo (y su contorno)
  const pot = new Bitmap(PW, PH);
  for (let y = PANZA[0]; y <= PANZA[1]; y++) {
    const w = panza(y);
    for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) {
      const nx = (x + 0.5 - cx) / w;
      if (Math.abs(nx) > 1) continue;
      const ny = (y - PANZA[0]) / (PANZA[1] - PANZA[0]);
      let l = 0.7 - nx * 0.36 - ny * 0.2 + (1 - nx * nx) * 0.1;
      // el hollín de abajo
      if (ny > 0.5) l -= (ny - 0.5) * 1.15;
      // el canto, más oscuro
      if (Math.abs(nx) > 0.9) l -= 0.16;
      // la franja que le pintaron, con su raya clara
      if (y === 52) l -= 0.3;
      else if (y === 53) l += 0.07;
      else if (y === 55 && (x + Math.round(Math.sin(x * 0.7) * 1.2)) % 4 === 0) l -= 0.22;
      let c = ramp(BARRO, l, x, y);
      // la lumbre, por debajo: el canto de abajo se enciende
      const fl = ((ny - 0.74) / 0.26) * (0.65 + 0.35 * vnoise(x * 0.3, tf * 4, 5)) * (0.75 + 0.25 * calor);
      if (fl > bayer(x, y) + 0.12) c = fl > 0.95 ? P.ember2 : fl > 0.6 ? P.ember1 : P.ember0;
      pot.set(x, y, c);
    }
  }
  // las asas: dos aros de barro en los hombros
  for (const s of [-1, 1]) {
    const ax = cx + s * 41.5,
      ay = 49;
    for (let y = ay - 6; y <= ay + 6; y++)
      for (let x = Math.floor(ax - 6); x <= Math.ceil(ax + 6); x++) {
        const d = Math.hypot(x + 0.5 - ax, (y + 0.5 - ay) * 1.15);
        if (d > 5 || d < 2.6) continue;
        if (Math.abs(x + 0.5 - cx) < panza(y) - 0.5) continue;
        pot.set(x, y, ramp(BARRO, 0.62 - s * 0.2 - (y - ay) / 14, x, y));
      }
  }
  // la boca: el labio, la pared de dentro y el caldo
  const caldo = o.caldo || { a: CALDOS.agua, b: CALDOS.agua, k: 1 };
  const brillo = o.brillo || 0;
  const ondas = [];
  for (const c of o.caen || []) {
    const e = t - c.t0 - 0.22;
    if (e > 0 && e < 1.1) ondas.push([c.x, c.y, 2 + e * 15, 1 - e / 1.1]);
  }
  for (let y = Math.floor(BOCA.y - BOCA.ry - 1); y <= Math.ceil(BOCA.y + BOCA.ry + 1); y++)
    for (let x = Math.floor(cx - BOCA.rx - 1); x <= Math.ceil(cx + BOCA.rx + 1); x++) {
      if (!enElipse(x, y, cx, BOCA)) continue;
      const nx = (x + 0.5 - cx) / BOCA.rx;
      if (!enElipse(x, y, cx, DENTRO)) {
        // el labio: claro arriba, con el canto de fuera más oscuro
        const fuera = !enElipse(x - 1, y, cx, BOCA) || !enElipse(x + 1, y, cx, BOCA) || !enElipse(x, y + 1, cx, BOCA) || !enElipse(x, y - 1, cx, BOCA);
        const dentro = enElipse(x, y + 1, cx, DENTRO) || enElipse(x, y - 1, cx, DENTRO) || enElipse(x + 1, y, cx, DENTRO) || enElipse(x - 1, y, cx, DENTRO);
        let l = 0.86 - nx * 0.3 - (y > BOCA.y ? 0.12 : 0);
        if (fuera) l -= 0.25;
        if (dentro) l -= 0.18;
        // (con algo encima para echar: la boca, dorada)
        pot.set(x, y, o.sobre ? ramp([P.gold1, P.gold2, P.gold3, P.gold4, P.gold5], l + 0.1, x, y) : ramp(BARRO, l, x, y));
        continue;
      }
      if (!enElipse(x, y, cx, CALDO)) {
        // la pared de dentro, en sombra (más oscura cuanto más abajo)
        pot.set(x, y, ramp(BARRO, 0.42 - (y - (DENTRO.y - DENTRO.ry)) / 16 - nx * 0.1, x, y));
        continue;
      }
      // el caldo: la luz arriba a la izquierda, el reflejo, las olas y las
      // ondas de lo que cae
      const dx = (x + 0.5 - cx) / CALDO.rx,
        dy = (y + 0.5 - CALDO.y) / CALDO.ry;
      let l = 0.52 - dx * 0.16 - dy * 0.12;
      l += Math.sin(x * 0.45 + t * 2.4 + y * 0.8) * 0.06 * (1 + hierve);
      if ((dx + 0.38) ** 2 * 5 + (dy + 0.3) ** 2 * 2.4 < 0.1) l += 0.32;
      // (el borde de atrás, a la sombra del labio)
      if (dy < -0.62) l -= 0.22;
      for (const [ox, oy, r, a] of ondas) {
        const d = Math.hypot(x + 0.5 - ox, (y + 0.5 - oy) * 3.2);
        if (Math.abs(d - r) < 0.75 && bayer(x, y) < a) l += 0.3;
      }
      l += brillo * 0.45;
      const pal = bayer(x, y) < caldo.k ? caldo.b : caldo.a;
      pot.set(x, y, ramp(pal, l, x, y));
    }
  // las burbujas: crecen y revientan (al hervir, muchas)
  const pal = caldo.k >= 0.5 ? caldo.b : caldo.a;
  const nb = Math.round(2 + hierve * 18);
  for (let k = 0; k < nb; k++) {
    const ph = t * (0.45 + hash(k, 1, 9) * 0.6 + hierve * 1.6) + hash(k, 2, 9);
    const cyc = Math.floor(ph),
      f = ph - cyc;
    const bx = Math.round(cx + (hash(k, cyc, 11) * 2 - 1) * CALDO.rx * 0.78),
      by = Math.round(CALDO.y + (hash(k, cyc, 13) * 2 - 1) * CALDO.ry * 0.55);
    if (!enElipse(bx, by, cx, CALDO)) continue;
    if (f < 0.82) {
      const r = (f / 0.82) * (0.8 + hash(k, cyc, 17) * 1.6 + hierve);
      if (r < 1) pot.set(bx, by, pal[3]);
      else {
        for (let a = 0; a < 8; a++) pot.set(bx + Math.round(Math.cos((a / 8) * 6.283) * r), by + Math.round(Math.sin((a / 8) * 6.283) * r * 0.7), pal[3]);
        pot.set(bx - 1, by - 1, pal[4]);
      }
    } else for (const [ex, ey] of [[-2, 0], [2, 0], [0, -1], [-1, 1], [1, 1]]) if (hash(k, cyc, ex * 5 + ey) > 0.3) pot.set(bx + ex, by + ey, pal[4]);
  }
  // lo que flota (al hervir, se hunde)
  for (const it of o.flota || []) {
    if (it.t0 !== undefined && t < it.t0 + 0.22) continue;
    const ic = smallIcon(ICONO[it.id]);
    const bob = hierve ? 0 : Math.round(Math.sin(t * 2.1 + it.x * 0.7) * 0.6);
    const hundido = Math.round(hierve * 2.2 * 9);
    const x0 = Math.round(cx - CX + it.x - 5),
      y0 = Math.round(it.y - 6 + bob + hundido),
      linea = Math.round(it.y + 2 + bob);
    for (let y = 0; y < ic.h; y++)
      for (let x = 0; x < ic.w; x++) {
        const v = ic.d[y * ic.w + x];
        if (!(v >>> 24)) continue;
        const X = x0 + x,
          Y = y0 + y;
        if (!enElipse(X, Y, cx, CALDO) && Y > CALDO.y - 3) continue;
        // (lo que queda bajo el caldo se ve apenas, a través)
        if (Y > linea) {
          if (bayer(X, Y) < 0.6 || !enElipse(X, Y, cx, CALDO)) continue;
          pot.set(X, Y, pal[1]);
        } else if (pot.inb(X, Y)) pot.d[Y * PW + X] = v;
      }
  }
  pot.outline(P.void);
  b.blit(pot, 0, 0);
  // ---- las llamas de delante (sólo abajo: envuelven el culo del puchero)
  llamas(b, cx, tf + 0.37, calor, 95, 10, 0.72, 34);
  // ---- las piedras del hogar (no cambian: se dibujan una vez)
  b.blit(piedrasBitmap(), 0, 0);
  // ---- lo que cae: el ingrediente, su salpicadura
  for (const c of o.caen || []) {
    const e = t - c.t0;
    if (e < 0) continue;
    if (e < 0.22) {
      const ic = smallIcon(ICONO[c.id]);
      const f = e / 0.22;
      b.blit(ic, Math.round(cx - CX + c.x - 5), Math.round(-12 + (c.y - 6 + 12) * f * f));
    } else if (e < 0.75) {
      const s = e - 0.22;
      for (let k = 0; k < 7; k++) {
        const a = Math.PI * (0.15 + 0.7 * hash(k, 3, Math.round(c.t0 * 100))),
          v = 22 + hash(k, 4, Math.round(c.t0 * 100)) * 26;
        const X = Math.round(cx - CX + c.x + Math.cos(a) * v * s * 0.7),
          Y = Math.round(c.y - Math.sin(a) * v * s + 70 * s * s);
        if (Y > c.y + 1) continue;
        b.set(X, Y, pal[4]);
        if (s < 0.25) b.set(X, Y + 1, pal[3]);
      }
    }
  }
  // ---- el vapor: volutas tramadas que suben, se tuercen y se deshacen
  const nv = Math.round(6 + hierve * 10);
  for (let k = 0; k < nv; k++) {
    const vel = 0.14 + hash(k, 3, 21) * 0.08 + hierve * 0.3;
    const ph0 = t * vel + hash(k, 4, 21);
    const cyc = Math.floor(ph0);
    const x0 = cx + (hash(k, cyc, 23) * 2 - 1) * 20;
    // (la cabeza de la voluta y su estela, más débil)
    for (let j = 0; j < 4; j++) {
      const f = ph0 - cyc - j * 0.045;
      if (f <= 0) continue;
      const vx = x0 + Math.sin(f * 6 + k * 1.7) * 5 * f,
        vy = CALDO.y - 6 - f * 46;
      const r = 1.2 + f * 3.4;
      const a = (1 - f) * Math.min(1, f / 0.1) * (0.62 + hierve * 0.35) * (1 - j * 0.2);
      for (let y = Math.floor(vy - r); y <= Math.ceil(vy + r); y++)
        for (let x = Math.floor(vx - r); x <= Math.ceil(vx + r); x++) {
          const d = Math.hypot(x + 0.5 - vx, y + 0.5 - vy) / r;
          if (d > 1 || bayer(x, y) > a * (1.15 - d * 0.6)) continue;
          if (b.on(x, y) && y > BOCA.y - BOCA.ry) continue;
          b.set(x, y, a > 0.55 && d < 0.5 ? P.bone2 : a > 0.3 ? P.bone0 : P.iron3);
        }
    }
  }
  // ---- el cocimiento hecho: sube del caldo (lo de debajo, tapado) y se
  // queda un momento encima de la boca, hasta que se deshace
  if (o.sale) {
    const ic = iconBitmap(o.sale.icon);
    const k = o.sale.k,
      a = o.sale.a ?? 1;
    // (sale del caldo y se queda con el culo asomando de la boca)
    const x0 = cx - 16,
      y0 = Math.round(CALDO.y - k * 37 + (k >= 1 ? Math.sin(t * 3) : 0));
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const v = ic.d[y * 32 + x];
        if (!(v >>> 24)) continue;
        const X = x0 + x,
          Y = y0 + y;
        // (bajo el caldo no se ve; al deshacerse, tramado)
        if (Y > CALDO.y - 1 + Math.abs(X + 0.5 - cx) * 0.05 && enElipse(X, Y, cx, BOCA)) continue;
        if (Y > BOCA.y + 2) continue;
        if ((a < 1 && bayer(X, Y) > a) || !b.inb(X, Y)) continue;
        b.d[Y * PW + X] = v;
      }
    // (y su brillo alrededor)
    for (let j = 0; j < 8; j++) {
      const an = t * 2 + (j / 8) * 6.283;
      const X = Math.round(cx + Math.cos(an) * 20),
        Y = Math.round(y0 + 16 + Math.sin(an) * 12);
      if (a > 0.3 && Y < BOCA.y - 2 && Y > 0) b.set(X, Y, j % 2 ? P.gold4 : P.gold5);
    }
  }
  // (el fogonazo: chispas que saltan del caldo)
  if (brillo > 0.05)
    for (let k = 0; k < 10; k++) {
      const X = Math.round(cx + (hash(k, 7, 41) * 2 - 1) * 26),
        Y = Math.round(CALDO.y - 3 - hash(k, 8, 41) * 22 * (1.2 - brillo));
      if (bayer(X, Y) < brillo) {
        b.set(X, Y, P.gold5);
        b.set(X + 1, Y, pal[4]);
      }
    }
  return b;
}

// Las piedras del hogar, en arco delante de la lumbre (con la lumbre en lo
// alto de cada una).
let _piedras = null;
function piedrasBitmap() {
  if (_piedras) return _piedras;
  const piedras = new Bitmap(PW, PH);
  [
    [CX - 47, 95, 7, 4],
    [CX - 33, 97, 8, 4],
    [CX - 17, 98, 8, 3.5],
    [CX - 1, 98.5, 8, 3.5],
    [CX + 15, 98, 8, 3.5],
    [CX + 31, 97, 8, 4],
    [CX + 46, 95, 7, 4],
  ].forEach(([sx, sy, rx, ry], k) => {
    for (let y = Math.floor(sy - ry); y <= Math.ceil(sy + ry); y++)
      for (let x = Math.floor(sx - rx); x <= Math.ceil(sx + rx); x++) {
        const dx = (x + 0.5 - sx) / rx,
          dy = (y + 0.5 - sy) / ry;
        if (dx * dx + dy * dy > 1) continue;
        // (con la lumbre en lo alto)
        const arriba = dy < -0.55 && Math.abs(dx) < 0.7;
        piedras.set(x, y, arriba && hash(x, y, k) > 0.35 ? P.ember1 : ramp(PIEDRA, 0.62 - dx * 0.25 - dy * 0.35 + hash(x >> 1, y, k) * 0.12, x, y));
      }
  });
  piedras.outline(P.void);
  return (_piedras = piedras);
}

// Las llamas: columnas que suben desde y0 (más altas en medio), con su
// corazón casi blanco y las puntas rojas, a saltos. alto: lo más que suben.
function llamas(b, cx, tf, calor, y0, alto, k, ancho = 38) {
  for (let x = cx - ancho; x <= cx + ancho; x++) {
    const dx = Math.abs(x - cx);
    const e = dx < ancho - 14 ? 1 : 1 - ((dx - ancho + 14) / 14) ** 2;
    if (e <= 0) continue;
    const h = Math.min(alto, (6 + 14 * vnoise(x * 0.22, tf * 2.6, 3) + 6 * vnoise(x * 0.07, tf * 1.2, 4)) * e * calor * k);
    for (let y = y0; y > y0 - h; y--) {
      const f = (y0 - y) / h;
      // (las puntas se rompen)
      if (f > 0.6 && hash(x, y, Math.round(tf * 12)) < (f - 0.6) * 1.4) continue;
      const centro = dx < 18;
      b.set(x, y, ramp(LUMBRE, (centro ? 0.95 : 0.75) - f * 0.85, x, y));
    }
  }
}

// los iconos pequeños de lo que se echa (icons.js)
const ICONO = { musgo_luz: 'musgoLuz', raiz_amarga: 'raizAmarga', flor_hondo: 'florHondo' };
// lo que hace cada uno en el cocimiento (lo que contó él)
const PAPEL = { musgo_luz: 'Da el aliento', raiz_amarga: 'Hace que agarre', flor_hondo: 'Lo vuelve negro' };
// lo que falta, dicho corto: «la flor», «otra raíz», «dos de musgo más»
const corto = (id, n) => (id === 'flor_hondo' ? 'la flor' : n === 1 ? (id === 'raiz_amarga' ? 'otra raíz' : 'otro musgo') : `${n} de ${id === 'raiz_amarga' ? 'raíz' : 'musgo'} más`);
// lo que hace cada cocimiento, en su receta
const EFECTO = {
  verde: 'El aliento vuelve casi al doble de deprisa. Cuarenta segundos.',
  negro: 'El aliento, casi al triple, y las piernas van solas. Un minuto.',
};

// Una muesca de la receta: llena (ya está en el puchero), por echar, o que
// falta (no traes bastante).
function muescaBitmap(kind) {
  const b = new Bitmap(7, 7);
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 7; x++) {
      const d = Math.abs(x - 3) + Math.abs(y - 3);
      if (d > 3) continue;
      let c;
      if (kind === 'llena') c = d === 3 ? P.gold1 : d === 2 ? P.gold2 : x + y < 6 ? P.gold4 : P.gold3;
      else if (kind === 'falta') c = d === 3 ? P.blood2 : P.parch3;
      else c = d === 3 ? P.pink1 : P.parch2;
      b.set(x, y, c);
    }
  if (kind === 'falta') for (let i = 2; i <= 4; i++) b.set(i, i, P.blood2), b.set(6 - i, i, P.blood2);
  if (kind === 'llena') b.set(2, 2, P.gold5);
  return b;
}

// ---------------------------------------------------------------- la pantalla
export class Mesa {
  constructor(ui) {
    this.ui = ui;
    this.g = ui.g;
    this.s = null;
    this.cv = $('mesa-cv');
    this.libro = $('mesa-libro');
    // (la semilla: que el cerco de ninguna mancha cruce un frasco)
    attachBackdrop(this.libro, (w, h) => parchmentBitmap(w, h, 13), () => this.ui.sc.u);
    // (el clic derecho saca: sin el menú del navegador)
    $('mesa').addEventListener('contextmenu', (e) => e.preventDefault());
    this._slot = slotBitmap(36, false);
    this._slotSel = slotBitmap(36, true);
    this._hueco = slotBitmap(17, false);
    this._huecoSel = slotBitmap(17, true);
    this._muesca = { llena: muescaBitmap('llena'), vacia: muescaBitmap('vacia'), falta: muescaBitmap('falta') };
    this.reducido = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    addEventListener('resize', () => this.s && this.render());
    addEventListener('blur', () => this.drag && this.soltarDrag());
  }

  get inv() {
    return this.g.inventory;
  }
  au(kind, o) {
    const a = this.g.audio;
    if (!a) return;
    if (kind === 'move' || kind === 'confirm' || kind === 'lock' || kind === 'open' || kind === 'close') a.ui(kind);
    else a.play(kind, null, o || {});
  }

  // Cada vez que se abre: el puchero vacío, con agua.
  reset(s) {
    this.s = s;
    this.puchero = [];
    this.flota = [];
    this.caen = [];
    this.foco = { z: 'ing', i: Math.max(0, INGREDIENTES.findIndex((id) => this.inv.count(id) > 0)) };
    this.ultimo = { ing: this.foco.i, pot: 0, rec: 0 };
    this.t = 0;
    this._acc = 1;
    this.caldo = { a: CALDOS.agua, b: CALDOS.agua, k: 1, key: 'agua' };
    this.cuece = null;
    this.hecho = null;
    this.aviso = null;
    this.sobre = false;
    this.soltarDrag();
  }
  cerrar() {
    this.soltarDrag();
    this.s = null;
  }

  // lo que queda en la bolsa de un ingrediente (lo echado, aún no se gasta)
  quedan(id) {
    return this.inv.count(id) - this.puchero.filter((x) => x === id).length;
  }
  sale() {
    return queSale(this.g, this.puchero);
  }

  // ------------------------------------------------------------ lo que se hace
  // Echar uno al puchero (x: dónde se soltó, en el lienzo).
  echar(id, x = null) {
    if (this.cuece) return false;
    if (this.quedan(id) <= 0) return this.avisar(`No te queda ${ITEMS[id].name.toLowerCase()}.`);
    if (this.puchero.length >= CABEN) return this.avisar('En el puchero no cabe más.');
    const [sx, sy] = this.sitioLibre(x);
    const it = { id, x: sx, y: sy, t0: this.t };
    this.puchero.push(id);
    this.flota.push(it);
    this.caen.push(it);
    this.hecho = null;
    this.aviso = null;
    this.au('plop', { k: 0.9 + hash(this.puchero.length, 1, 5) * 0.25 });
    this.cambiaCaldo();
    this.render();
    return true;
  }
  // Sacar el i-ésimo de lo que hay dentro.
  sacar(i) {
    if (this.cuece || i < 0 || i >= this.puchero.length) return false;
    this.puchero.splice(i, 1);
    const [it] = this.flota.splice(i, 1);
    this.caen = this.caen.filter((c) => c !== it);
    this.hecho = null;
    this.aviso = null;
    this.au('plop', { k: 1.5, gain: 0.35 });
    if (this.foco.z === 'pot') {
      if (!this.puchero.length) this.foco = { z: 'btn', i: 0 };
      else this.foco.i = Math.min(this.foco.i, this.puchero.length - 1);
    }
    this.cambiaCaldo();
    this.render();
    return true;
  }
  // Preparar una receta: lo de dentro vuelve a la bolsa y se echa lo suyo
  // (lo que haya: si falta algo, se dice).
  preparar(tipo) {
    if (this.cuece) return;
    const T = TONICOS[tipo];
    const nombre = ITEMS[T.item].name.toLowerCase();
    if (this.inv.count(T.item) >= T.max) return this.avisar(`Del ${tipo} ya llevas los que caben: ${T.max === 1 ? 'uno' : T.max} como mucho.`);
    // (lo de dentro vuelve a la bolsa: lo que hay para la receta es todo)
    const falta = T.receta.map(([id, k]) => [id, k - this.inv.count(id)]).filter(([, k]) => k > 0);
    if (falta.length) return this.avisar(`Para el ${nombre} te falta ${falta.map(([id, k]) => `${k} de ${ITEMS[id].name.toLowerCase()}`).join(' y ')}.`);
    this.puchero = [];
    this.flota = [];
    this.caen = [];
    let n = 0;
    for (const [id, k] of T.receta)
      for (let j = 0; j < k; j++) {
        if (this.quedan(id) <= 0) continue;
        const [sx, sy] = this.sitioLibre();
        const it = { id, x: sx, y: sy, t0: this.t + n * 0.12 };
        this.puchero.push(id);
        this.flota.push(it);
        this.caen.push(it);
        n++;
      }
    this.hecho = null;
    this.aviso = null;
    for (let j = 0; j < Math.min(n, 5); j++) setTimeout(() => this.s && this.au('plop', { k: 0.85 + j * 0.07 }), j * 120);
    this.cambiaCaldo();
    if (this.sale().listo) this.foco = { z: 'btn', i: 0 };
    this.render();
  }
  // Cocer lo de dentro, si es justo una receta.
  cocer() {
    if (this.cuece) return;
    const q = this.sale();
    if (!q.listo) return this.avisar(q.vacio ? 'El puchero está vacío: echa algo antes.' : q.sobra.length ? 'Así no agarra: sobra algo.' : 'Aún le falta.');
    if (q.lleno) return this.avisar(`Ya llevas los que caben: ${TONICOS[q.tipo].max === 1 ? 'uno' : TONICOS[q.tipo].max} como mucho.`);
    const tipo = cocerPuchero(this.g, this.puchero);
    if (!tipo) return this.au('lock');
    // (lo de dentro se gasta ya; lo que se ve, después)
    this.cuece = { t: 0, dur: 2.1, tipo, flota: this.flota, desde: this.caldo.key };
    this.puchero = [];
    this.flota = [];
    this.caen = [];
    this.aviso = null;
    this.au('hervor');
    this.render();
  }

  // un sitio en el caldo donde no flote ya nada (x: el que se pidió)
  sitioLibre(x = null) {
    if (x !== null) {
      const X = clamp(Math.round(x), CX - CALDO.rx + 8, CX + CALDO.rx - 8);
      return [X, CALDO.y + Math.round(Math.sin(X) * 2)];
    }
    for (const [dx, dy] of SITIOS) if (!this.flota.some((f) => Math.abs(f.x - (CX + dx)) < 7)) return [CX + dx, CALDO.y + dy];
    const k = this.puchero.length;
    return [CX + (hash(k, 2, 3) * 2 - 1) * 18, CALDO.y + (hash(k, 3, 3) * 2 - 1) * 2];
  }
  // el color del caldo según lo que hay dentro (se mezcla poco a poco)
  colorCaldo() {
    const q = this.sale();
    if (q.vacio) return 'agua';
    if (q.listo) return q.tipo;
    if (q.sobra.length) return 'turbio';
    const c = cuenta(this.puchero);
    if (c.flor_hondo) return 'oscuro';
    return (c.musgo_luz || 0) >= (c.raiz_amarga || 0) ? 'verdoso' : 'rojizo';
  }
  cambiaCaldo(key = this.colorCaldo()) {
    if (key === this.caldo.key) return;
    // (de lo que se veía, a lo nuevo)
    const a = this.caldo.k >= 0.5 ? this.caldo.b : this.caldo.a;
    this.caldo = { a, b: CALDOS[key], k: 0, key };
  }
  avisar(text) {
    this.aviso = { text, t: 2.6 };
    this.au('lock');
    this.render();
    return false;
  }

  // ------------------------------------------------------------ moverse
  // Las zonas: lo que traes (ing), lo que hay en el puchero (pot), el botón de
  // cocer (btn) y las recetas (rec).
  mover(dx, dy) {
    const F = this.foco;
    const n = this.puchero.length;
    const ir = (z, i) => {
      if (z === F.z && i === F.i) return;
      if (F.z !== 'btn') this.ultimo[F.z] = F.i;
      this.foco = { z, i };
      this.ui.g.audio && this.ui.g.audio.ui('move');
      this.render();
    };
    if (F.z === 'ing') {
      if (dy) return ir('ing', (F.i + dy + INGREDIENTES.length) % INGREDIENTES.length);
      if (dx > 0) return n && F.i < 2 ? ir('pot', Math.min(this.ultimo.pot, n - 1)) : ir('btn', 0);
      return;
    }
    if (F.z === 'pot') {
      if (dx) {
        const i = F.i + dx;
        if (i < 0) return ir('ing', this.ultimo.ing);
        if (i >= n) return ir('rec', this.ultimo.rec);
        return ir('pot', i);
      }
      if (dy > 0) return ir('btn', 0);
      return;
    }
    if (F.z === 'btn') {
      if (dy < 0 && n) return ir('pot', Math.min(this.ultimo.pot, n - 1));
      if (dx < 0) return ir('ing', this.ultimo.ing);
      if (dx > 0) return ir('rec', this.ultimo.rec);
      return;
    }
    if (dy) return ir('rec', (F.i + dy + 2) % 2);
    if (dx < 0) return F.i === 0 && n ? ir('pot', n - 1) : ir('btn', 0);
  }
  // confirm, sacar, cocer, back
  accion(a) {
    if (this.cuece) return;
    const F = this.foco;
    if (a === 'back') return this.ui.close();
    if (a === 'cocer') return this.cocer();
    if (a === 'sacar') {
      if (!this.puchero.length) return this.au('lock');
      return this.sacar(F.z === 'pot' ? F.i : this.puchero.length - 1);
    }
    if (F.z === 'ing') return this.echar(INGREDIENTES[F.i]);
    if (F.z === 'pot') return this.sacar(F.i);
    if (F.z === 'btn') return this.cocer();
    if (F.z === 'rec') return this.preparar(Object.keys(TONICOS)[F.i]);
  }
  // con el ratón: elegir lo que hay debajo (sólo si se ha movido de verdad:
  // al repintar, el puntero quieto «entra» en lo que queda debajo)
  pasa(z, i, ev) {
    if (this.drag || this.cuece) return;
    if (ev && !ev.movementX && !ev.movementY) return;
    if (this.foco.z === z && this.foco.i === i) return;
    if (this.foco.z !== 'btn') this.ultimo[this.foco.z] = this.foco.i;
    this.foco = { z, i };
    this.render();
  }

  // ------------------------------------------------------------ arrastrar
  // Se agarra lo que traes (o lo de dentro) y se suelta en el puchero (o
  // fuera de él). Si no se mueve, es un clic.
  agarrar(ev, src) {
    if (this.cuece) return;
    if (ev.button === 2) {
      ev.preventDefault();
      if (src.z === 'pot') this.sacar(src.i);
      else {
        const i = this.puchero.lastIndexOf(src.id);
        if (i >= 0) this.sacar(i);
        else this.au('lock');
      }
      return;
    }
    if (ev.button !== 0) return;
    ev.preventDefault();
    this.soltarDrag();
    const d = { src, x0: ev.clientX, y0: ev.clientY, moved: false, ghost: null };
    d.move = (e) => this.arrastra(e);
    d.up = (e) => this.suelta(e);
    addEventListener('pointermove', d.move);
    addEventListener('pointerup', d.up);
    addEventListener('pointercancel', d.up);
    this.drag = d;
  }
  arrastra(e) {
    const d = this.drag;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 5) return;
    if (!d.moved) {
      // (no se puede arrastrar lo que no se tiene)
      if (d.src.z === 'ing' && this.quedan(d.src.id) <= 0) {
        this.soltarDrag();
        return this.avisar(`No te queda ${ITEMS[d.src.id].name.toLowerCase()}.`);
      }
      d.moved = true;
      d.ghost = spriteImg(iconBitmap(ITEMS[d.src.id].icon), 1, 'mesa-drag');
      document.body.appendChild(d.ghost);
      document.body.style.cursor = 'grabbing';
    }
    const u = this.ui.sc.u;
    d.ghost.style.left = Math.round(e.clientX - 16 * u) + 'px';
    d.ghost.style.top = Math.round(e.clientY - 16 * u) + 'px';
    const sobre = this.sobrePuchero(e);
    if (sobre !== this.sobre) {
      this.sobre = sobre;
      this.dibujar();
    }
  }
  suelta(e) {
    const d = this.drag;
    if (!d) return;
    const sobre = this.sobrePuchero(e);
    this.soltarDrag();
    const { src } = d;
    if (!d.moved) {
      // un clic: echar, sacar
      if (src.z === 'ing') {
        this.foco = { z: 'ing', i: src.i };
        this.echar(src.id);
      } else this.sacar(src.i);
      return;
    }
    if (src.z === 'ing' && sobre) {
      const r = this.cv.getBoundingClientRect();
      this.echar(src.id, ((e.clientX - r.left) / r.width) * PW);
    } else if (src.z === 'pot' && !sobre) this.sacar(src.i);
  }
  soltarDrag() {
    const d = this.drag;
    if (d) {
      removeEventListener('pointermove', d.move);
      removeEventListener('pointerup', d.up);
      removeEventListener('pointercancel', d.up);
      if (d.ghost) d.ghost.remove();
      document.body.style.cursor = this.ui.modal ? 'default' : '';
    }
    this.drag = null;
    if (this.sobre) {
      this.sobre = false;
      this.dibujar();
    }
  }
  sobrePuchero(e) {
    const r = $('mesa-puchero').getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }

  // ------------------------------------------------------------ pintar
  render() {
    const s = this.ui.top;
    if (!s || s.name !== 'mesa') return;
    if (s !== this.s) this.reset(s);
    const u = this.ui.sc.u;
    if (this._u !== u) {
      this._u = u;
      this.cv.style.width = PW * u + 'px';
      this.cv.style.height = PH * u + 'px';
      this.libro._pxRedraw && this.libro._pxRedraw();
    }
    // (en ventanas pequeñas: con el píxel de arte más grande que la letra,
    // u1, las columnas van por la letra; estrecha o baja, fuera lo que sobra:
    // la pista y lo que hace cada cocimiento)
    const m = $('mesa').querySelector('.mesa');
    m.classList.toggle('u1', u === 1);
    $('mesa').querySelector('.panel').classList.toggle('u1', u === 1);
    m.classList.toggle('estrecha', (innerWidth * 0.96) / u < (u === 1 ? 700 : 452));
    m.classList.toggle('baja', (innerHeight * 0.92) / u < (u === 1 ? 420 : 250));
    const q = this.sale();
    this.renderIng();
    this.renderDentro();
    this.renderSale(q);
    this.renderBoton(q);
    this.renderRecetas(q);
    this.renderHint(q);
    this.dibujar();
  }
  // la pista de debajo de lo que traes (según se juegue con ratón o mando)
  renderPista() {
    const pad = this.ui.device() === 'pad';
    $('mesa-pista').textContent = pad ? 'Lo que echas no se gasta hasta que lo cueces.' : 'Pincha o arrastra al puchero. Nada se gasta hasta cocerlo.';
  }
  // lo que traes: la casilla (con lo que queda), el nombre y lo que hace
  renderIng() {
    const box = $('mesa-ing');
    box.innerHTML = '';
    INGREDIENTES.forEach((id, i) => {
      const sel = this.foco.z === 'ing' && this.foco.i === i;
      const n = this.quedan(id);
      const it = ITEMS[id];
      const row = document.createElement('div');
      row.className = 'm-ing' + (sel ? ' sel' : '') + (n > 0 ? '' : ' off');
      row.innerHTML =
        `<div class="slot">${spriteHtml(sel ? this._slotSel : this._slot)}${spriteHtml(n > 0 ? iconBitmap(it.icon) : ghostIcon(it.icon), 1, 'ic')}<span class="n f-small">×${n}</span></div>` +
        `<div class="tx"><div class="nm">${esc(it.name)}</div><div class="rl">${esc(PAPEL[id])}</div></div>`;
      row.addEventListener('pointerdown', (ev) => this.agarrar(ev, { z: 'ing', i, id }));
      row.addEventListener('mousemove', (ev) => this.pasa('ing', i, ev));
      box.appendChild(row);
    });
  }
  // lo que hay dentro: un hueco por cada cosa que cabe
  renderDentro() {
    const box = $('mesa-dentro');
    box.innerHTML = '';
    for (let i = 0; i < CABEN; i++) {
      const id = this.puchero[i];
      const sel = this.foco.z === 'pot' && this.foco.i === i && !!id;
      const h = document.createElement('div');
      h.className = 'm-hueco' + (id ? ' lleno' : '') + (sel ? ' sel' : '');
      h.innerHTML = spriteHtml(sel ? this._huecoSel : this._hueco) + (id ? spriteHtml(smallIcon(ICONO[id]), 1, 'ic') : '');
      if (id) {
        h.title = ITEMS[id].name;
        h.addEventListener('pointerdown', (ev) => this.agarrar(ev, { z: 'pot', i, id }));
        h.addEventListener('mousemove', (ev) => this.pasa('pot', i, ev));
      }
      box.appendChild(h);
    }
  }
  // lo que va saliendo: el cocimiento (apagado hasta que cuaja) y qué le falta
  renderSale(q) {
    const box = $('mesa-sale');
    const nom = (id, n) => `${n} de ${ITEMS[id].name.toLowerCase()}`;
    const lista = (l) => {
      const p = l.map(([id, n]) => nom(id, n));
      return p.length > 1 ? p.slice(0, -1).join(', ') + ' y ' + p[p.length - 1] : p[0];
    };
    let ic = null,
      cls = '',
      tit,
      sub;
    const H = this.hecho,
      K = this.cuece;
    if (K) {
      ic = ghostIcon(ITEMS[TONICOS[K.tipo].item].icon);
      tit = 'Cociendo…';
      sub = 'Lo dejas hervir, removiendo, hasta que cuaja.';
      cls = 'cuece';
    } else if (H) {
      const T = TONICOS[H.tipo];
      ic = iconBitmap(ITEMS[T.item].icon);
      tit = ITEMS[T.item].name;
      sub = `${MSG.cocido(ITEMS[T.item].name)} Llevas ${this.inv.count(T.item)} de ${T.max}.`;
      // (recién hecho: sale de golpe; al repintar después, ya no)
      cls = 'hecho' + (H.t < 0.4 ? ' nuevo' : '');
    } else if (q.vacio) {
      const nada = INGREDIENTES.every((id) => this.inv.count(id) <= 0);
      tit = 'Agua al fuego';
      sub = nada ? 'No traes nada de lo hondo: ni musgo, ni raíz, ni flor.' : 'Echa lo que traigas de lo hondo.';
      cls = 'vacio';
    } else {
      const T = TONICOS[q.tipo];
      const nombre = ITEMS[T.item].name;
      if (q.listo) {
        ic = iconBitmap(ITEMS[T.item].icon);
        tit = nombre;
        sub = q.lleno ? `Ya llevas los que caben (${T.max}).` : 'Listo para cocer.';
        // (con el verde hecho, el negro: la flor y otra raíz)
        if (!q.lleno && q.otro && q.otro.falta.every(([id, n]) => this.quedan(id) >= n)) sub += ` Con ${q.otro.falta.map(([id, n]) => corto(id, n)).join(' y ')}, saldría ${q.otro.tipo}.`;
        cls = q.lleno ? 'lleno' : 'listo';
      } else if (q.sobra.length) {
        ic = ghostIcon(ITEMS[T.item].icon);
        tit = 'Así no agarra';
        sub = `Sobra ${lista(q.sobra)}.`;
        cls = 'mal';
      } else {
        ic = ghostIcon(ITEMS[T.item].icon);
        tit = `Va saliendo ${q.tipo}`;
        sub = `Le falta ${lista(q.falta)}.`;
        cls = 'va';
      }
    }
    if (this.aviso) {
      sub = this.aviso.text;
      cls += ' aviso' + (this.aviso.t > 2.3 ? ' nuevo' : '');
    }
    this._rays = this._rays || raysBitmap(64);
    box.className = 'm-sale ' + cls;
    box.innerHTML =
      `<div class="slot m-res">${H ? spriteHtml(this._rays, 1, 'rays') : ''}${spriteHtml(cls.startsWith('listo') || H ? this._slotSel : this._slot, 1, 'sl')}${ic ? spriteHtml(ic, 1, 'ic') : ''}</div>` +
      `<div class="tx"><div class="t f-bast">${esc(tit)}</div><div class="s">${esc(sub)}</div></div>`;
  }
  // el botón de cocer (como los de los menús: estandarte y espadas)
  renderBoton(q) {
    const box = $('mesa-cocer');
    box.innerHTML = '';
    const sel = this.foco.z === 'btn';
    const ok = q.listo && !q.lleno && !this.cuece;
    const label = ok ? `Cocer el ${q.tipo}` : 'Cocer';
    const { u, ih } = this.ui.sc;
    const lw = Math.max(110, Math.ceil(this.ui.textW(label) / u) + 56);
    box.style.width = lw * u + 'px';
    const b = document.createElement('button');
    b.className = 'it' + (sel ? ' sel' : '') + (ok ? '' : ' off');
    if (sel) b.style.backgroundImage = `url(${this.ui.banner(lw, ih, 'ember')})`;
    b.innerHTML = (sel ? spriteHtml(this.ui.cursor, 1, 'cur') + spriteHtml(this.ui.cursor, 1, 'cur r') : '') + esc(label);
    b.addEventListener('mousemove', (ev) => this.pasa('btn', 0, ev));
    b.addEventListener('click', () => this.cocer());
    box.appendChild(b);
  }
  // la hoja del cuaderno: las dos recetas, con lo que hay dentro marcado
  renderRecetas(q) {
    const box = $('mesa-recetas');
    const c = cuenta(this.puchero);
    let h = `<div class="m-tit f-bast">Lo que te enseñó</div>`;
    Object.keys(TONICOS).forEach((tipo, i) => {
      const T = TONICOS[tipo];
      const it = ITEMS[T.item];
      const sel = this.foco.z === 'rec' && this.foco.i === i;
      const listo = q.listo && q.tipo === tipo;
      const pide = T.receta
        .map(([id, n]) => {
          const dentro = c[id] || 0;
          const hay = dentro + Math.max(0, this.quedan(id));
          let m = '';
          for (let k = 0; k < n; k++) m += spriteHtml(k < dentro ? this._muesca.llena : k < hay ? this._muesca.vacia : this._muesca.falta);
          return `<span class="q" title="${esc(it.name)}">${spriteHtml(smallIcon(ICONO[id]))}<span class="ms">${m}</span></span>`;
        })
        .join('');
      const lleva = this.inv.count(T.item);
      if (i) h += '<div class="m-raya"></div>';
      h +=
        `<div class="m-rec${sel ? ' sel' : ''}${listo ? ' listo' : ''}" data-i="${i}">` +
        `<div class="nm f-bast">${esc(it.name)}</div>` +
        `<div class="ic">${spriteHtml(iconBitmap(it.icon))}</div>` +
        `<div class="tx"><div class="pide">${pide}</div><div class="ll f-small">Llevas ${lleva} de ${T.max}</div></div>` +
        `<div class="ef">${esc(EFECTO[tipo])}</div></div>`;
    });
    box.innerHTML = h;
    box.querySelectorAll('.m-rec').forEach((el) => {
      const i = +el.dataset.i;
      el.addEventListener('mousemove', (ev) => this.pasa('rec', i, ev));
      el.addEventListener('click', () => {
        this.foco = { z: 'rec', i };
        this.preparar(Object.keys(TONICOS)[i]);
      });
    });
  }
  // la barra de ayuda (se pincha también)
  renderHint(q) {
    this._dev = this.ui.device();
    this.renderPista();
    const F = this.foco;
    const conf = F.z === 'ing' ? 'Echar' : F.z === 'pot' ? 'Sacar' : F.z === 'btn' ? 'Cocer' : 'Preparar';
    const acts = [['confirm', conf]];
    if (this.puchero.length && F.z !== 'pot') acts.push(['unequip', 'Sacar']);
    if (q.listo && !q.lleno && F.z !== 'btn') acts.push(['cocer', 'Cocer']);
    acts.push(['back', 'Dejar la mesa']);
    const h = $('mesa-hint');
    h.innerHTML = acts.map(([a, label]) => `<span data-a="${a}">${this.ui.keyHtml(a)} ${esc(label)}</span>`).join('');
    h.querySelectorAll('span[data-a]').forEach((el) =>
      el.addEventListener('click', () => {
        const a = el.dataset.a;
        this.accion(a === 'unequip' ? 'sacar' : a);
      })
    );
  }

  // el puchero, a su ritmo (unos doce dibujos por segundo)
  dibujar() {
    const K = this.cuece;
    let hierve = 0,
      brillo = 0,
      flota = this.flota,
      caldo = this.caldo;
    if (K) {
      const f = K.t / K.dur;
      hierve = Math.min(1, f * 2.2) * (f > 0.86 ? (1 - f) / 0.14 : 1);
      brillo = f > 0.72 && f < 0.92 ? 1 - Math.abs(f - 0.8) / 0.12 : 0;
      flota = f < 0.55 ? K.flota : [];
      const k = clamp((f - 0.3) / 0.4, 0, 1);
      caldo = { a: CALDOS[K.desde] || CALDOS.agua, b: CALDOS[K.tipo], k };
      // (al final, se cuela: vuelve el agua)
      if (f > 0.9) caldo = { a: CALDOS[K.tipo], b: CALDOS.agua, k: (f - 0.9) / 0.1 };
    }
    // (el cocimiento sube del caldo al final del hervor y se queda un poco)
    let sale = null;
    if (K && K.t / K.dur > 0.7) sale = { icon: ITEMS[TONICOS[K.tipo].item].icon, k: Math.min(1, (K.t / K.dur - 0.7) / 0.26) };
    else if (this.hecho && this.hecho.t < 1.7) sale = { icon: ITEMS[TONICOS[this.hecho.tipo].item].icon, k: 1, a: 1 - Math.max(0, (this.hecho.t - 1.1) / 0.6) };
    const bm = pucheroBitmap({ t: this.t, caldo, flota, caen: this.caen, hierve, brillo, sale, sobre: this.sobre });
    const cv = this.cv;
    if (cv.width !== PW || cv.height !== PH) {
      cv.width = PW;
      cv.height = PH;
    }
    bm.paint(cv.getContext('2d'));
  }

  // ------------------------------------------------------------ cada fotograma
  update(s, dt, inp, dir, conf, back) {
    if (s !== this.s) this.reset(s);
    this.t += dt;
    // la mezcla del color del caldo
    if (this.caldo.k < 1) this.caldo.k = Math.min(1, this.caldo.k + dt * 1.6);
    // lo que cae ya ha caído
    if (this.caen.length) this.caen = this.caen.filter((c) => this.t - c.t0 < 1.4);
    if (this.aviso) {
      this.aviso.t -= dt;
      if (this.aviso.t <= 0) {
        this.aviso = null;
        this.render();
      }
    }
    if (this.hecho) this.hecho.t += dt;
    const K = this.cuece;
    if (K) {
      K.t += dt;
      if (K.t >= K.dur) {
        this.cuece = null;
        this.hecho = { tipo: K.tipo, t: 0 };
        this.caldo = { a: CALDOS.agua, b: CALDOS.agua, k: 1, key: 'agua' };
        this.au('item');
        this.render();
      }
    }
    // (se ha cogido el mando, o el ratón: las teclas de la ayuda, al día)
    if (this.ui.device() !== this._dev) this.render();
    this._acc += dt;
    if (this._acc >= (this.reducido ? 0.25 : 1 / 12)) {
      this._acc = 0;
      this.dibujar();
    }
    if (K) return;
    if (dir.x || dir.y) this.mover(dir.x, dir.y);
    if (conf) this.accion('confirm');
    else if (inp.pressed('unequip')) this.accion('sacar');
    else if (inp.pressed('cocer')) this.accion('cocer');
    else if (back) this.accion('back');
  }
}

// Rayos dorados tramados (tras el cocimiento recién hecho).
function raysBitmap(s) {
  const b = new Bitmap(s, s);
  const c = s / 2;
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const dx = x + 0.5 - c,
        dy = y + 0.5 - c;
      const d = Math.hypot(dx, dy) / c;
      if (d > 1) continue;
      const a = Math.atan2(dy, dx);
      const ray = Math.pow(Math.max(0, Math.cos(a * 6)), 6) * 0.8 + 0.25;
      const t = ray * (1 - d) * 1.6;
      if (t < bayer(x, y) * 0.9 + 0.08) continue;
      b.set(x, y, t > 0.9 ? P.gold3 : t > 0.5 ? P.gold2 : P.gold1);
    }
  return b;
}
