// El arte de la hoja de ruta, dibujado con el pixel art de la interfaz del
// juego (ui/pixel.js) y sus iconos (game/icons.js): el logo de la portada, el
// de la segunda parte, los títulos, los medallones de las fases, las barras de
// progreso, los marcos, el pergamino y el sello. Y lo que hay en el juego,
// contado de sus propios módulos. Se carga desde arte.html, servido por Vite
// (tools/hoja_de_ruta.mjs); todo sale como PNG en data: URL, a 1 píxel de arte.
import { PAL as P, Bitmap, C, bayer, hash, ramp, vnoise, loadFonts, textBitmap, panelBitmap, parchmentBitmap, bannerBitmap, dividerBitmap, greatSword, crestBitmap, candleBitmap, cursorSword } from '/src/ui/pixel.js';
import { iconBitmap } from '/src/game/icons.js';

const GOLD = [P.bone3, P.bone2, P.gold4, P.gold3, P.gold2, P.gold1];
const BLOOD = [P.ruby4, P.blood4, P.blood3, P.blood2, P.blood1, P.blood0];

// La portada del título, como la del juego (titleArt, en game/ui.js): la gran
// espada clavada tras el título, BRACARA · AUGUSTA y el estandarte carmesí.
function logo() {
  const sw = greatSword(156);
  const t = textBitmap('Dawn of Braga', 'gothic', { grad: GOLD, hilite: P.gold5, outline: P.void, shadow: P.blood0, glow: P.blood1, glow2: P.blood0 });
  const l1 = textBitmap('BRACARA', 'small', { color: P.bone2, outline: P.void });
  const l2 = textBitmap('AUGUSTA', 'small', { color: P.bone2, outline: P.void });
  const sub = textBitmap('Amanecer en Braga', 'bastarda', { color: P.bone2, outline: P.void });
  const W = Math.max(t.w + 44, sw.w) + 8,
    H = sw.h + 4;
  const b = new Bitmap(W, H);
  const cx = Math.floor(W / 2);
  b.blit(sw, cx - Math.floor(sw.w / 2), 0);
  b.blit(l1, cx - 9 - l1.w, 17 - Math.floor(l1.h / 2));
  b.blit(l2, cx + 10, 17 - Math.floor(l2.h / 2));
  const ly = 48;
  const ban = bannerBitmap(t.w + 44, t.h + 8, 'ember');
  b.blit(ban, cx - Math.floor(ban.w / 2), ly - 4);
  b.blit(t, cx - Math.floor(t.w / 2), ly);
  const sy = ly + t.h + 10;
  const ban2 = bannerBitmap(sub.w + 36, sub.h + 4, 'dark');
  b.blit(ban2, cx - Math.floor(ban2.w / 2), sy - 2);
  b.blit(sub, cx - Math.floor(sub.w / 2), sy);
  return b;
}

// El título de la segunda parte, en sangre, como pide el plan del final (§3.8).
function logoDevil() {
  const t = textBitmap('Dawn of the Devil', 'gothic', { grad: BLOOD, hilite: P.ruby4, outline: P.void, shadow: P.void, glow: P.blood1, glow2: P.blood0 });
  const pre = textBitmap('el principio de', 'bastarda', { color: P.bone1, outline: P.void });
  const W = t.w + 48,
    H = t.h + pre.h + 16;
  const b = new Bitmap(W, H);
  const cx = Math.floor(W / 2);
  b.blit(pre, cx - Math.floor(pre.w / 2), 0);
  const ban = bannerBitmap(t.w + 44, t.h + 8, 'dark');
  b.blit(ban, cx - Math.floor(ban.w / 2), pre.h + 4);
  b.blit(t, cx - Math.floor(t.w / 2), pre.h + 8);
  return b;
}

// Un título de sección: la letra bastarda en oro sobre su banda de tela, con
// sus dos remates.
function titulo(texto, kind = 'dark') {
  const t = textBitmap(texto, 'bastarda', { mult: 2, grad: GOLD, hilite: P.gold5, outline: P.void, shadow: P.blood0 });
  const ban = bannerBitmap(t.w + 64, t.h + 6, kind);
  const cr = crestBitmap();
  const W = ban.w,
    H = ban.h + 6;
  const b = new Bitmap(W, H);
  b.blit(ban, 0, 3);
  b.blit(t, Math.floor((W - t.w) / 2), 6);
  b.blit(cr, Math.floor((W - cr.w) / 2), 0);
  return b;
}

// El medallón de una fase: un disco de hierro con su aro (oro, hecha; brasa,
// la que toca; hierro, por hacer; sangre, más allá de la 1.0) y su número.
const ARO = {
  hecha: [P.gold1, P.gold2, P.gold3, P.gold4],
  curso: [P.ember0, P.ember1, P.ember2, P.ember3],
  siguiente: [P.ember0, P.ember1, P.ember2, P.ember3],
  espera: [P.iron0, P.iron1, P.iron2, P.iron3],
  pendiente: [P.iron0, P.iron1, P.iron2, P.iron3],
  mas: [P.blood0, P.blood1, P.blood2, P.blood3],
};
function medallon(num, estado) {
  const R = 22,
    S = R * 2 + 3;
  const b = new Bitmap(S, S);
  const c = R + 1;
  const aro = ARO[estado] || ARO.pendiente;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - c,
        dy = y + 0.5 - c;
      const d = Math.hypot(dx, dy);
      if (d > R) continue;
      const l = (-dx - dy) / (R * 1.414) * 0.5 + 0.5;
      if (d > R - 4) b.set(x, y, ramp(aro, l + (d > R - 1.2 ? -0.25 : 0.05), x, y));
      else if (d > R - 5) b.set(x, y, P.void);
      else b.set(x, y, ramp([P.ink0, P.ink1, P.ink2, P.ink3], 0.35 + (l - 0.5) * 0.5 + (vnoise(x * 0.3, y * 0.3, 4) - 0.5) * 0.3, x, y));
    }
  // los remaches del aro
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.round(c - 0.5 + Math.cos(a) * (R - 2)),
      y = Math.round(c - 0.5 + Math.sin(a) * (R - 2));
    b.set(x, y, estado === 'hecha' ? P.gold5 : P.iron4);
  }
  const grad = estado === 'hecha' ? GOLD : estado === 'mas' ? BLOOD : estado === 'curso' || estado === 'siguiente' ? [P.ember4, P.ember3, P.ember2, P.ember1] : [P.bone2, P.bone1, P.bone0, P.iron3];
  // (los números, en la letra pequeña: en la bastarda, I, V y X no se leen)
  let t = textBitmap(num, 'small', { mult: 2, grad, outline: P.void });
  if (t.w > S - 9) t = textBitmap(num, 'small', { grad, outline: P.void });
  b.blit(t, Math.round(c - t.w / 2), Math.round(c - t.h / 2));
  b.outline(P.void);
  return b;
}

// La barra de progreso: hierro con bisel, la regleta de diez en diez, y el
// relleno (oro si está hecha, brasa si no) con su brillo y su punta encendida.
function barra(frac, w, estado, h = 11) {
  const b = new Bitmap(w, h);
  const ix0 = 2,
    ix1 = w - 3,
    iy0 = 2,
    iy1 = h - 3;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      if (edge) b.set(x, y, P.void);
      else if (x === 1 || y === 1) b.set(x, y, P.iron3);
      else if (x === w - 2 || y === h - 2) b.set(x, y, P.iron1);
      else b.set(x, y, ramp([P.void, P.ink0, P.ink1], 0.35 + (hash(x, y, 9) - 0.5) * 0.4 + (y - iy0) / (iy1 - iy0) * -0.2, x, y));
    }
  const inner = ix1 - ix0 + 1;
  const fill = Math.round(Math.max(0, Math.min(1, frac)) * inner);
  const col = estado === 'hecha' ? [P.gold0, P.gold1, P.gold2, P.gold3, P.gold4] : estado === 'mas' ? [P.blood0, P.blood1, P.blood2, P.blood3, P.blood4] : [P.ember0, P.ember1, P.ember2, P.ember3, P.ember4];
  for (let y = iy0; y <= iy1; y++)
    for (let x = ix0; x < ix0 + fill; x++) {
      const v = 1 - (y - iy0) / Math.max(1, iy1 - iy0);
      b.set(x, y, ramp(col, 0.25 + v * 0.6 + (hash(x >> 1, y, 3) - 0.5) * 0.12, x, y));
    }
  if (fill > 1 && fill < inner) for (let y = iy0; y <= iy1; y++) b.set(ix0 + fill - 1, y, col[4]);
  if (fill > 0) for (let x = ix0; x < ix0 + fill; x++) b.set(x, iy0, x & 1 ? col[4] : col[3]);
  // la regleta
  for (let k = 1; k < 10; k++) {
    const x = ix0 + Math.round((k / 10) * inner);
    for (let y = iy1 - (k === 5 ? 3 : 1); y <= iy1; y++) b.set(x, y, x < ix0 + fill ? col[0] : P.iron2);
  }
  return b;
}

// La marca de una tarea: el rombo de los separadores, lleno de oro (hecha),
// medio lleno de brasa (a medias) o vacío (por hacer).
function marca(tipo) {
  const b = new Bitmap(9, 9);
  for (let y = 0; y < 9; y++)
    for (let x = 0; x < 9; x++) {
      const d = Math.abs(x - 4) + Math.abs(y - 4);
      if (d > 4) continue;
      let c;
      if (d === 4) c = tipo === 'hecha' ? P.gold2 : tipo === 'media' ? P.ember1 : P.iron2;
      else if (tipo === 'hecha') c = d <= 1 ? P.gold4 : P.gold3;
      else if (tipo === 'media') c = x < 4 || (x === 4 && y < 4) ? (d <= 1 ? P.ember4 : P.ember3) : P.ink1;
      else c = P.ink1;
      b.set(x, y, c);
    }
  if (tipo === 'hecha') b.set(3, 3, P.gold5);
  b.outline(P.void);
  return b;
}

// Una cifra grande, en la letra gótica del título.
function cifra(texto) {
  return textBitmap(texto, 'gothic', { grad: GOLD, hilite: P.gold5, outline: P.void, shadow: P.blood0, glow: P.blood1, glow2: P.blood0 });
}

// El sello de cera con su cruz (el de los pergaminos del juego, en game/ui.js).
function sello() {
  const b = new Bitmap(19, 19);
  for (let y = 0; y < 19; y++)
    for (let x = 0; x < 19; x++) {
      const a = Math.atan2(y - 9, x - 9);
      const r = 8 + Math.sin(a * 5) * 0.8 + hash(Math.round(a * 4), 0, 3) * 0.6;
      const d = Math.hypot(x - 9, y - 9);
      if (d > r) continue;
      const l = 0.55 - (x - 9) / 22 - (y - 9) / 22 + (d > 6 && d < 7 ? -0.2 : 0);
      b.set(x, y, ramp([P.blood0, P.blood1, P.blood2, P.blood3, P.blood4], l, x, y));
    }
  for (let i = -4; i <= 4; i++) {
    b.set(9, 9 + i, P.blood1);
    b.set(9 + i, 8, P.blood1);
    b.set(8, 9 + i, P.blood3);
    b.set(9 + i, 7, P.blood3);
  }
  b.outline(P.void);
  return b;
}

// El fondo de la página: piedra muy oscura, sin costuras (ruido mezclado por
// las cuatro esquinas) y con su tramado.
function fondo(S = 96) {
  const b = new Bitmap(S, S);
  const f = (x, y) => vnoise(x * 0.09, y * 0.11, 5) * 0.7 + vnoise(x * 0.31, y * 0.27, 9) * 0.3;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const u = x / S,
        v = y / S;
      const n = f(x, y) * (1 - u) * (1 - v) + f(x - S, y) * u * (1 - v) + f(x, y - S) * (1 - u) * v + f(x - S, y - S) * u * v;
      b.set(x, y, ramp([P.void, P.ink0, P.ink1], 0.42 + (n - 0.5) * 0.9, x, y));
    }
  return b;
}

// Lo que hay en el juego, contado de sus propios módulos.
async function contenido() {
  const S = await import('/src/game/story.js');
  const W = await import('/src/entities/weapons.js');
  const A = await import('/src/entities/armaduras.js');
  const R = await import('/src/game/relics.js');
  const E = await import('/src/entities/enemies.js');
  const nombres = (ids) => ids.map((id) => ({ id, nombre: (S.ITEMS[id] && S.ITEMS[id].name) || id, icono: (S.ITEMS[id] && S.ITEMS[id].icon) || id }));
  const armas = W.WEAPON_ORDER.map((w) => {
    const id = Object.keys(S.ITEMS).find((k) => S.ITEMS[k].weapon === w) || w;
    return { id, nombre: S.ITEMS[id] ? S.ITEMS[id].name : w, icono: S.ITEMS[id] ? S.ITEMS[id].icon : w };
  });
  const armaduras = Object.entries(A.ARMADURAS).map(([id, a]) => ({ id, nombre: a.nombre, peso: a.peso, piezas: nombres(A.RANURAS.map((r) => a.piezas[r].item)) }));
  const tipos = Object.entries(E.TYPES).map(([id, t]) => ({ id, nombre: t.name, jefe: !!t.boss }));
  const jefes = [...new Set(tipos.filter((t) => t.jefe).map((t) => t.nombre))];
  return {
    zonas: Object.keys(S.AREA_NAMES).length,
    documentos: Object.keys(S.NOTES).length,
    objetos: Object.keys(S.ITEMS).length,
    armas,
    armaduras,
    reliquias: nombres(R.RELIC_IDS),
    tipos,
    jefes,
  };
}

// Los sprites de los modelos, recortados a su silueta (con un píxel de margen):
// así se alinean por los pies y caben juntos.
export async function recortar(imagenes) {
  const out = {};
  for (const [k, o] of Object.entries(imagenes)) {
    const img = new Image();
    img.src = o.url;
    await img.decode();
    const w = img.naturalWidth,
      h = img.naturalHeight;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, w, h).data;
    let x0 = w,
      y0 = h,
      x1 = -1,
      y1 = -1;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (d[(y * w + x) * 4 + 3]) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
    if (x1 < 0) {
      out[k] = o;
      continue;
    }
    x0 = Math.max(0, x0 - 1);
    y0 = Math.max(0, y0 - 1);
    x1 = Math.min(w - 1, x1 + 1);
    y1 = Math.min(h - 1, y1 + 1);
    const c2 = document.createElement('canvas');
    c2.width = x1 - x0 + 1;
    c2.height = y1 - y0 + 1;
    c2.getContext('2d').drawImage(cv, -x0, -y0);
    out[k] = { url: c2.toDataURL('image/png'), w: c2.width, h: c2.height };
  }
  return out;
}

const url = (b) => b.url();
const URLS = (o) => Object.fromEntries(Object.entries(o).map(([k, b]) => [k, b && b.url ? { url: b.url(), w: b.w, h: b.h } : b]));

// Lo que pide tools/hoja_de_ruta.mjs (pagina.mjs, necesidades): { titulos:
// {id: [texto, banda]}, medallones: [[num, tono]], barras: [[clave, fracción,
// ancho, tono, alto]], cifras: {clave: texto}, iconos: [nombres] }.
export async function dibujar(pide) {
  await loadFonts();
  const out = {
    logo: logo(),
    logoDevil: logoDevil(),
    sello: sello(),
    fondo: fondo(),
    marco: panelBitmap(64, 64, { seed: 7 }),
    marcoCresta: panelBitmap(96, 64, { seed: 11, crest: true }),
    pergamino: parchmentBitmap(96, 72, 5),
    separador: dividerBitmap(180),
    cresta: crestBitmap(),
    velaOn: candleBitmap(true),
    velaOff: candleBitmap(false),
    cursor: cursorSword(),
  };
  const res = URLS(out);
  res.titulos = {};
  for (const [id, [texto, kind]] of Object.entries(pide.titulos || {})) {
    const b = titulo(texto, kind);
    res.titulos[id] = { url: url(b), w: b.w, h: b.h };
  }
  res.medallones = {};
  for (const [num, estado] of pide.medallones || []) {
    const b = medallon(num, estado);
    res.medallones[num + ':' + estado] = { url: url(b), w: b.w, h: b.h };
  }
  res.barras = {};
  for (const [clave, frac, w, estado, h] of pide.barras || []) {
    const b = barra(frac, w, estado, h);
    res.barras[clave] = { url: url(b), w: b.w, h: b.h };
  }
  res.cifras = {};
  for (const [clave, texto] of Object.entries(pide.cifras || {})) {
    const b = cifra(texto);
    res.cifras[clave] = { url: url(b), w: b.w, h: b.h };
  }
  res.marcas = URLS({ hecha: marca('hecha'), media: marca('media'), no: marca('no') });
  res.iconos = {};
  for (const n of pide.iconos || []) {
    const b = iconBitmap(n);
    res.iconos[n] = { url: url(b), w: b.w, h: b.h };
  }
  res.contenido = await contenido();
  return res;
}
