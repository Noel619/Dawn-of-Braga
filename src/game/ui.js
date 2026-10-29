// Interfaz en pixel art: HUD dibujado a resolución de arte, menús con
// estandarte y espada como cursor, documentos en pergamino con capitular
// iluminada, inventario, mapa, opciones, muerte e historia. Navegable con
// teclado, mando y ratón.
import * as THREE from 'three';
import { GLYPHS } from '../core/input.js';
import { ITEMS, NOTES, AREA_NAMES } from './story.js';
import { RELIC_IDS } from './relics.js';
import { WEAPON_ORDER, WEAPONS } from '../entities/weapons.js';
import { iconBitmap, smallIcon, ghostIcon } from './icons.js';
import { formatTime, clamp } from '../core/util.js';
import { PAL as P, Bitmap, bayer, ramp, hash, uiScale, spriteImg, spriteHtml, attachBackdrop, panelBitmap, parchmentBitmap, bannerBitmap, dividerBitmap, cursorSword, greatSword, keyBitmap, reticleBitmap, slotBitmap, arrowBitmap, candleBitmap, notchBitmap, textBitmap } from '../ui/pixel.js';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------------------------------------------------------------- sprites propios
// Filigrana dorada a un lado de un rótulo (dir 1: se aleja hacia la derecha).
function flourish(w, dir = 1) {
  const b = new Bitmap(w, 5);
  for (let i = 0; i < w; i++) {
    const x = dir > 0 ? i : w - 1 - i;
    const e = i / w;
    if (e > 0.55 && e - 0.55 > bayer(x, 2) * 0.45) continue;
    b.set(x, 2, e < 0.3 ? P.gold3 : P.gold2);
  }
  const x0 = dir > 0 ? 1 : w - 2;
  b.set(x0, 1, P.gold3);
  b.set(x0, 3, P.gold1);
  b.set(x0 - dir, 2, P.gold4);
  b.set(x0 + dir, 2, P.gold3);
  b.outline(P.void);
  return b;
}

// Banda negra de lado a lado con los bordes tramados (pantalla de muerte).
function bandBitmap(w, h) {
  const b = new Bitmap(w, h);
  const f = Math.min(10, Math.floor(h / 4));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const e = Math.min(y, h - 1 - y);
      if (e < f && e / f < bayer(x, y)) continue;
      b.set(x, y, e < f + 2 ? P.ink0 : P.void);
    }
  return b;
}

// Capitular iluminada: letra gótica sobre campo carmesí con marco dorado.
function dropCap(ch) {
  const t = textBitmap(ch, 'gothic12', { grad: [P.gold5, P.gold4, P.gold3, P.gold2], outline: P.void });
  const s = Math.max(t.w, t.h) + 8;
  const b = new Bitmap(s, s);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const d = Math.min(x, y, s - 1 - x, s - 1 - y);
      if (d === 0) b.set(x, y, P.pink0);
      else if (d === 1) b.set(x, y, x === 1 || y === 1 ? P.gold4 : P.gold2);
      else if (d === 2) b.set(x, y, P.gold1);
      else b.set(x, y, ramp([P.blood0, P.blood1, P.blood2], 0.3 + (1 - y / s) * 0.5, x, y));
    }
  // zarcillos dorados en el campo
  for (let k = 0; k < 14; k++) {
    const x = 3 + Math.floor(hash(k, 1, ch.charCodeAt(0)) * (s - 6)),
      y = 3 + Math.floor(hash(k, 2, ch.charCodeAt(0)) * (s - 6));
    b.set(x, y, P.gold2);
  }
  b.blit(t, Math.floor((s - t.w) / 2), Math.floor((s - t.h) / 2));
  return b;
}

// Rayos dorados tramados (tras el objeto obtenido).
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

// Sello de lacre.
function sealBitmap() {
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
  // cruz en relieve
  for (let i = -4; i <= 4; i++) {
    b.set(9, 9 + i, P.blood1);
    b.set(9 + i, 8, P.blood1);
    b.set(8, 9 + i, P.blood3);
    b.set(9 + i, 7, P.blood3);
  }
  b.outline(P.void);
  return b;
}

// Portada: la gran espada clavada tras el título.
function titleArt() {
  const sw = greatSword(156);
  const logo = textBitmap('Dawn of Braga', 'gothic', { grad: [P.bone3, P.bone2, P.gold4, P.gold3, P.gold2, P.gold1], hilite: P.gold5, outline: P.void, shadow: P.blood0, glow: P.blood1, glow2: P.blood0 });
  const l1 = textBitmap('BRACARA', 'small', { color: P.bone2, outline: P.void });
  const l2 = textBitmap('AUGUSTA', 'small', { color: P.bone2, outline: P.void });
  const sub = textBitmap('Amanecer en Braga', 'bastarda', { color: P.bone2, outline: P.void });
  const W = Math.max(logo.w + 44, sw.w) + 8,
    H = sw.h + 4;
  const b = new Bitmap(W, H);
  const cx = Math.floor(W / 2);
  b.blit(sw, cx - Math.floor(sw.w / 2), 0);
  // BRACARA · AUGUSTA a los lados de la empuñadura
  const gy = 17;
  b.blit(l1, cx - 9 - l1.w, gy - Math.floor(l1.h / 2));
  b.blit(l2, cx + 10, gy - Math.floor(l2.h / 2));
  // estandarte carmesí con el título, bajo la guarda
  const ly = 48;
  const ban = bannerBitmap(logo.w + 44, logo.h + 8, 'ember');
  b.blit(ban, cx - Math.floor(ban.w / 2), ly - 4);
  b.blit(logo, cx - Math.floor(logo.w / 2), ly);
  // subtítulo en su propia banda oscura
  const sy = ly + logo.h + 10;
  const ban2 = bannerBitmap(sub.w + 36, sub.h + 4, 'dark');
  b.blit(ban2, cx - Math.floor(ban2.w / 2), sy - 2);
  b.blit(sub, cx - Math.floor(sub.w / 2), sy);
  return b;
}

// ---------------------------------------------------------------- inventario
// Las ranuras del equipo, en filas: [ranura, nombre, silueta de la vacía].
const EQUIP_ROWS = [
  {
    label: 'Armas',
    slots: [
      ['weapon', 'Mano derecha', 'sword'],
      ['shield', 'Mano izquierda', 'shield'],
    ],
  },
  {
    label: 'Armadura',
    slots: [
      ['head', 'Cabeza', 'helm'],
      ['body', 'Torso', 'cuirass'],
      ['hands', 'Manos', 'gauntlets'],
      ['legs', 'Piernas', 'greaves'],
    ],
  },
  { label: 'Objeto bendito', slots: [['relic', 'Objeto bendito', 'amulet']] },
  { label: 'Consumibles', slots: [['_flask', 'Ampollas', 'flask']] },
];
// Las clases de los objetos (la pestaña Objetos), en su orden.
const ITEM_CATS = [
  ['cons', 'Consumibles'],
  ['weapon', 'Armas'],
  ['shield', 'Escudos'],
  ['armor', 'Armaduras'],
  ['relic', 'Objetos benditos'],
  ['key', 'Objetos clave'],
  ['upgrade', 'Mejoras'],
];
const KEY_ORDER = ['palanca', 'llave_claustro', 'manivela', 'anillo', 'martillo', 'tablon', 'llave_sotano', 'garra', 'incienso'];
const UPGRADE_ORDER = ['lagrima', 'ampolla', 'relicario', 'rosario', 'piedra'];
const FLASK = { name: 'Ampolla de Santa Bárbara', desc: 'Lágrimas de la santa en un frasco de vidrio. Restauran parte de tu vitalidad. Se rellenan al descansar en un altar.' };
// lo que se dice de una ranura vacía, de «nada» en su lista y de una ranura
// sin nada que ponerse
const EMPTY = {
  weapon: 'Llevas la mano derecha vacía: sin arma no puedes atacar.',
  shield: 'Llevas la mano izquierda vacía: sin escudo no puedes bloquear ni desviar golpes, salvo con un arma a dos manos.',
  relic: 'No llevas ningún objeto bendito.',
  armor: 'No llevas nada en esta ranura.',
};
const NOTHING = {
  weapon: 'Te quedas con la mano derecha vacía. Sin arma no puedes atacar.',
  shield: 'Te quedas con la mano izquierda vacía. Sin escudo no puedes bloquear ni desviar golpes, salvo con un arma a dos manos.',
  relic: 'Te quitas el objeto bendito que llevas.',
  armor: 'Te quitas lo que llevas en esta ranura.',
};
const NONE_YET = {
  weapon: 'Aún no tienes ningún arma.',
  shield: 'Aún no tienes ningún escudo.',
  relic: 'Aún no tienes ningún objeto bendito.',
  armor: 'Aún no has encontrado ninguna pieza de armadura.',
};
// lo que se lleva puesto, y cómo se pone y se quita
const WORN = { weapon: 'En la mano', shield: 'Al brazo', relic: 'Lo llevas puesto', armor: 'La llevas puesta' };
const PUT_ON = { weapon: 'Empuñar', shield: 'Embrazar', relic: 'Ponértelo', armor: 'Ponértela' };
const TAKE_OFF = { weapon: 'Envainar', shield: 'Quitártelo', relic: 'Quitártelo', armor: 'Quitártela' };

const LEGEND = [
  ['player', 'Estás aquí'],
  ['altar', 'Altar'],
  ['locked', 'Paso cerrado'],
  ['open', 'Paso abierto'],
];

export class UI {
  constructor(game) {
    this.g = game;
    this.stack = [];
    this.toastsEl = $('toasts');
    this._v = new THREE.Vector3();
    this.invTab = 0;
    this.invSel = 0;
    // (la ranura del equipo que se está cambiando: { slot, name, at })
    this.invPick = null;
    this.sc = uiScale();
    this._applyScale();
    addEventListener('resize', () => {
      const s = uiScale();
      if (s.u !== this.sc.u || s.m !== this.sc.m) {
        this.sc = s;
        this._applyScale();
        document.querySelectorAll('.panel, .parch, .toast, #prompt, #death-band').forEach((el) => el._pxRedraw && el._pxRedraw());
        if (this.top) this.render(this.top);
      }
    });

    // sprites fijos
    const root = document.documentElement.style;
    const dith = new Bitmap(2, 2);
    dith.set(0, 0, P.void);
    dith.set(1, 1, P.void);
    root.setProperty('--dither', `url(${dith.url()})`);
    this.cursor = cursorSword();
    this.flL = flourish(26, -1);
    this.flR = flourish(26, 1);
    const U = () => this.sc.u;
    document.querySelectorAll('.panel').forEach((el) => attachBackdrop(el, (w, h) => panelBitmap(w, h, { crest: !!el.dataset.crest, seed: w + h }), U));
    document.querySelectorAll('.parch').forEach((el) => attachBackdrop(el, (w, h) => parchmentBitmap(w, h, w * 7 + h), U));
    attachBackdrop($('prompt'), (w, h) => bannerBitmap(w, h, 'dark'), U);
    attachBackdrop($('pzhint'), (w, h) => bannerBitmap(w, h, 'dark'), U);
    attachBackdrop($('death-band'), (w, h) => bandBitmap(w, h), U);
    // rótulos con filigrana
    document.querySelectorAll('.eyebrow[data-div]').forEach((el) => {
      const t = el.textContent;
      el.innerHTML = `${spriteHtml(this.flL)}<span>${esc(t)}</span>${spriteHtml(this.flR)}`;
    });
    $('title-art').appendChild(spriteImg(titleArt(), 1));
    $('death-band').appendChild(spriteImg(textBitmap('Has caído', 'gothic', { mult: 2, grad: [P.blood4, P.blood3, P.blood3, P.blood2, P.blood1, P.blood0], hilite: P.ruby3, outline: P.void, glow: P.blood1, glow2: P.blood0 }), 1));
    $('area').querySelector('.div').appendChild(spriteImg(dividerBitmap(150), 1));
    $('lock').appendChild(spriteImg(reticleBitmap(), 1));
    this.seal = sealBitmap();

    // HUD: lienzos a resolución de arte
    this.vit = $('vitals-cv');
    this.boss = $('boss-cv');
    this.ally = $('ally-cv');
    this.hpLag = 1;
    this.bossLag = 1;
    this.allyLag = 1;
    this.ebars = [];
    for (let i = 0; i < 6; i++) {
      const d = document.createElement('div');
      d.className = 'eb hidden';
      d.innerHTML = '<i></i>';
      $('ebars').appendChild(d);
      this.ebars.push(d);
    }
    // pestañas con ratón
    document.querySelectorAll('#inv .tab').forEach((t) => t.addEventListener('click', () => this.invSwitch(+t.dataset.t)));
  }

  // rótulo gótico dorado como sprite (primera línea de la introducción)
  gothicHtml(text) {
    this._goth = this._goth || new Map();
    if (!this._goth.has(text)) this._goth.set(text, textBitmap(text, 'gothic', { grad: [P.bone3, P.bone2, P.gold4, P.gold3, P.gold2], hilite: P.gold5, outline: P.void, glow: P.blood1, glow2: P.blood0 }));
    return spriteHtml(this._goth.get(text), 1);
  }
  // título en tinta oscura (pantalla final, sobre pergamino)
  inkTitleHtml() {
    if (!this._inkTitle) this._inkTitle = textBitmap('Dawn of Braga', 'gothic', { grad: [P.pink1, P.pink0, P.pink0], hilite: P.blood2, outline: P.parch1 });
    return spriteHtml(this._inkTitle, 1);
  }

  _applyScale() {
    const r = document.documentElement.style;
    const { u, m, ih } = this.sc;
    r.setProperty('--u', u + 'px');
    r.setProperty('--un', u);
    r.setProperty('--m', m);
    r.setProperty('--ih', ih);
    r.setProperty('--banner-tab', `url(${this.banner(76, ih, 'dark')})`);
  }
  // estandarte a medida (en píxeles de arte), cacheado
  banner(w, h, kind) {
    this._banners = this._banners || new Map();
    const k = w + 'x' + h + kind;
    if (!this._banners.has(k)) this._banners.set(k, bannerBitmap(w, h, kind).url());
    return this._banners.get(k);
  }
  // ancho de texto en px CSS con la fuente de los menús
  textW(t) {
    const g = (this._mc = this._mc || document.createElement('canvas').getContext('2d'));
    g.font = `${13 * (this.sc.m + 1)}px Bastarda`;
    return g.measureText(t).width;
  }

  get top() {
    return this.stack[this.stack.length - 1];
  }
  get modal() {
    return this.stack.length > 0;
  }
  device() {
    return this.g.input.device;
  }
  // Los controles de un mecanismo visto de cerca: [{ act | kb/pad, label }]
  showPuzzleHint(list) {
    this._pzList = list;
    this._pzKey = null;
    this.renderPuzzleHint();
    $('pzhint').classList.add('show');
  }
  renderPuzzleHint() {
    const list = this._pzList;
    if (!list) return;
    const d = this.device();
    const k = d + ':' + list.map((x) => x.label).join('|');
    if (k === this._pzKey) return;
    this._pzKey = k;
    $('pzhint-list').innerHTML = list
      .map((x) => {
        const glyph = x.act ? GLYPHS[d][x.act] || '?' : x[d] ?? x.kb;
        return `<span class="it"><span class="keys">${spriteHtml(keyBitmap(glyph, d === 'pad'))}</span><span>${x.label}</span></span>`;
      })
      .join('');
  }
  hidePuzzleHint() {
    this._pzList = null;
    $('pzhint').classList.remove('show');
  }
  keyHtml(action) {
    const d = this.device();
    const k = GLYPHS[d][action] || '?';
    return `<span class="keys">${spriteHtml(keyBitmap(k, d === 'pad'))}</span>`;
  }
  // rótulo de controles: 'W A S D' -> varias teclas
  keysHtml(label, pad = false) {
    return `<span class="keys">${label
      .split(' ')
      .filter(Boolean)
      .map((k) => spriteHtml(keyBitmap(k, pad)))
      .join('')}</span>`;
  }

  // ------------------------------------------------------------ pantallas
  open(name, data = {}) {
    const el = $(name);
    el.classList.remove('hidden');
    const s = { name, el, data, sel: 0, fresh: true };
    this.stack.push(s);
    // (el inventario se abre siempre en el equipo, no en la lista de una ranura)
    if (name === 'inv') this.invPick = null;
    this.g.input.exitLock();
    document.body.style.cursor = 'default';
    this.render(s);
    this.g.audio && this.g.audio.ui('open');
    return s;
  }
  close() {
    const s = this.stack.pop();
    if (!s) return;
    s.el.classList.add('hidden');
    if (s.data.onClose) s.data.onClose();
    if (!this.modal) {
      document.body.style.cursor = '';
      // de vuelta al juego, se vuelve a capturar el ratón (al cerrar un
      // documento o un objeto recogido no se pedía, y la cámara no se movía
      // hasta hacer clic)
      if (this.g.state === 'play') this.g.input.requestLock();
    }
    this.g.audio && this.g.audio.ui('close');
  }
  closeAll() {
    while (this.stack.length) this.close();
  }

  render(s) {
    if (s.name === 'title' || s.name === 'pause') this.renderMenu(s);
    if (s.name === 'inv') this.renderInv();
    if (s.name === 'options') this.renderOptions(s);
    if (s.name === 'controls') this.renderControls();
    if (s.name === 'map') this.renderMap();
    if (s.name === 'note') this.renderNoteHint();
    if (s.name === 'item') $('item-hint').innerHTML = `<span>${this.keyHtml('confirm')} Continuar</span>`;
  }

  // ------------------------------------------------------------ menús
  menu(name, entries, opts = {}) {
    return this.open(name, { entries, ...opts });
  }
  renderMenu(s) {
    const list = s.name === 'title' ? $('title-menu') : $('pause-menu');
    list.classList.remove('hidden');
    list.innerHTML = '';
    const cur = this.cursor;
    const { u, ih } = this.sc;
    // ancho de la lista en píxeles de arte: el texto más largo más las espadas
    const lw = Math.max(120, Math.ceil(Math.max(...s.data.entries.map((e) => this.textW(e.label))) / u) + 56);
    list.style.width = lw * u + 'px';
    const ban = this.banner(lw, ih, 'ember');
    s.data.entries.forEach((e, i) => {
      const b = document.createElement('button');
      const sel = i === s.sel;
      b.className = 'it' + (sel ? ' sel' : '') + (e.off ? ' off' : '');
      if (sel) b.style.backgroundImage = `url(${ban})`;
      b.innerHTML = (sel ? spriteHtml(cur, 1, 'cur') + spriteHtml(cur, 1, 'cur r') : '') + esc(e.label);
      b.addEventListener('mouseenter', () => {
        if (s.sel !== i) {
          s.sel = i;
          this.renderMenu(s);
          this.g.audio && this.g.audio.ui('move');
        }
      });
      b.addEventListener('click', () => {
        if (!e.off) e.action();
      });
      list.appendChild(b);
    });
  }
  setMenu(s, entries) {
    s.data.entries = entries;
    s.sel = Math.min(s.sel, entries.length - 1);
    this.renderMenu(s);
  }

  // ------------------------------------------------------------ opciones
  optionEntries() {
    const g = this.g,
      S = g.settings;
    const RES = [240, 300, 360, 480, 540, 720];
    const step = (v, d, k, lo, hi) => clamp(Math.round((v + d * k) / k) * k, lo, hi);
    return [
      { label: 'Volumen de música', kind: 'pct', n: () => S.music, set: (d) => (S.music = step(S.music, d, 0.1, 0, 1)) },
      { label: 'Volumen de efectos', kind: 'pct', n: () => S.sfx, set: (d) => (S.sfx = step(S.sfx, d, 0.1, 0, 1)) },
      { label: 'Sensibilidad de cámara', kind: 'text', v: () => S.sens.toFixed(1), set: (d) => (S.sens = step(S.sens, d, 0.1, 0.3, 3)) },
      { label: 'Invertir eje vertical', kind: 'bool', n: () => S.invertY, set: () => (S.invertY = !S.invertY) },
      { label: 'Brillo', kind: 'text', v: () => (S.brightness >= 0 ? '+' : '') + Math.round(S.brightness * 100), set: (d) => (S.brightness = step(S.brightness, d, 0.02, -0.1, 0.2)) },
      { label: 'Resolución interna', kind: 'text', v: () => S.res + 'p', set: (d) => (S.res = RES[(Math.max(0, RES.indexOf(S.res)) + d + RES.length) % RES.length]) },
      { label: 'Temblor de vértices (PS1)', kind: 'bool', n: () => S.snap, set: () => (S.snap = !S.snap) },
      { label: 'Deformación de texturas', kind: 'pct', n: () => S.affine, set: (d) => (S.affine = step(S.affine, d, 0.1, 0, 1)) },
      { label: 'Filtro CRT', kind: 'pct', n: () => S.crt, set: (d) => (S.crt = step(S.crt, d, 0.1, 0, 1)) },
      { label: 'Mostrar FPS', kind: 'bool', n: () => S.fps, set: () => (S.fps = !S.fps) },
      { label: 'Transcribir los documentos', kind: 'bool', n: () => S.transcript, set: () => (S.transcript = !S.transcript) },
    ];
  }
  renderOptions(s) {
    const list = $('opt-list');
    list.innerHTML = '';
    const ents = this.optionEntries();
    s.data.entries = ents;
    const aL = spriteHtml(arrowBitmap(-1)),
      aR = spriteHtml(arrowBitmap(1));
    ents.forEach((e, i) => {
      const r = document.createElement('div');
      const sel = i === s.sel;
      r.className = 'opt' + (sel ? ' sel' : '');
      let v;
      if (e.kind === 'pct') {
        const n = Math.round(e.n() * 10);
        let notches = '';
        for (let k = 0; k < 10; k++) notches += spriteHtml(notchBitmap(k < n));
        v = `<span class="notches">${notches}</span>`;
      } else if (e.kind === 'bool') v = `${spriteHtml(candleBitmap(e.n()))}<span>${e.n() ? 'Sí' : 'No'}</span>`;
      else v = `<span>${esc(e.v())}</span>`;
      r.innerHTML = `<span>${esc(e.label)}</span><span class="v">${sel ? aL : ''}${v}${sel ? aR : ''}</span>`;
      r.addEventListener('mouseenter', () => {
        if (s.sel !== i) {
          s.sel = i;
          this.renderOptions(s);
        }
      });
      r.addEventListener('click', (ev) => {
        const rect = r.getBoundingClientRect();
        e.set(ev.clientX < rect.left + rect.width * 0.75 ? -1 : 1);
        this.g.applySettings();
        this.renderOptions(s);
        this.g.audio && this.g.audio.ui('move');
      });
      list.appendChild(r);
    });
    $('opt-hint').innerHTML = `<span>${this.keyHtml('back')} Volver</span><span>${aL}${aR} Cambiar</span>`;
  }

  renderControls() {
    const rows = [
      ['Moverse', 'W A S D', 'Stick izq.'],
      ['Cámara', 'Ratón', 'Stick der.'],
      ['Ataque ligero', 'Clic izq.', 'RB'],
      ['Ataque pesado', 'F', 'RT'],
      ['Bloquear (mantener)', 'Clic der.', 'LB'],
      ['Parry: pulsar justo antes del golpe', 'Clic der.', 'LB'],
      ['Golpe de gracia (tras un parry)', 'Clic izq.', 'RB'],
      ['Esquivar / correr (mantener)', 'Espacio', 'B'],
      ['Correr', 'Mayús', 'L3'],
      ['Fijar objetivo', 'Q|Clic central', 'R3'],
      ['Cambiar objetivo', 'Ratón', 'Stick der.'],
      ['Curarse (ampolla)', 'R', 'X'],
      ['Interactuar', 'E', 'A'],
      ['Inventario', 'Tab I', 'Y'],
      ['Mapa', 'M', 'View'],
      ['Pausa', 'Esc', 'Start'],
    ];
    const one = (s) => (s.includes('|') ? s.split('|') : s.includes('.') || s.length > 5 ? [s] : s.split(' '));
    const keys = (s, pad) => `<span class="k">${one(s)
      .map((k) => spriteHtml(keyBitmap(k, pad)))
      .join('')}</span>`;
    $('ctl-list').innerHTML = `<span class="h f-small">Acción</span><span class="h f-small">Teclado</span><span class="h f-small">Mando</span>` + rows.map((r) => `<span>${esc(r[0])}</span>${keys(r[1], false)}${keys(r[2], true)}`).join('');
    $('ctl-hint').innerHTML = `<span>${this.keyHtml('back')} Volver</span>`;
  }

  // ------------------------------------------------------------ inventario
  // A lo Dark Souls, en tres pestañas. El Equipo: las ranuras de lo que se
  // lleva (las dos manos, la armadura, el objeto bendito y, para verla, la
  // ampolla); «confirmar» abre lo que se puede poner en la ranura (con
  // «nada», para quitárselo) y «quitar» la vacía. Los Objetos: lo que se lleva
  // encima, por clases; lo que se puede llevar puesto se pone o se quita
  // también desde ahí. Los Documentos. Con el ratón se pincha todo: las
  // casillas, las pestañas y las teclas de la ayuda.
  invSwitch(tab) {
    this.invTab = (tab + 3) % 3;
    this.invSel = 0;
    this.invPick = null;
    this.renderInv();
  }
  // las ranuras del equipo, de una en una: { slot, name, ghost }
  equipSlots() {
    return EQUIP_ROWS.flatMap((r) => r.slots.map(([slot, name, ghost]) => ({ slot, name, ghost })));
  }
  // lo que se puede poner en la ranura que se está cambiando (null: nada)
  pickOptions() {
    return [null, ...this.g.equipOptions(this.invPick.slot)];
  }
  // lo que se lleva encima, por clases: { id, cat, n?, worn? }
  itemEntries() {
    const g = this.g,
      inv = g.inventory,
      p = g.player;
    const out = [];
    const add = (id, cat, o = {}) => out.push({ id, cat, ...o });
    add('_flask', 'cons', { n: p.flasks + '/' + p.maxFlasks });
    for (const w of WEAPON_ORDER) {
      const id = WEAPONS[w].item;
      if (inv.has(id)) add(id, 'weapon', { worn: g.equipped('weapon') === id });
    }
    if (inv.has('escudo')) add('escudo', 'shield', { worn: g.equipped('shield') === 'escudo' });
    for (const k in ITEMS) if (ITEMS[k].armor && inv.has(k)) add(k, 'armor', { worn: g.equipped(ITEMS[k].armor) === k });
    for (const k of RELIC_IDS) if (inv.has(k)) add(k, 'relic', { worn: p.relic === k });
    for (const k of KEY_ORDER) if (inv.has(k)) add(k, 'key', k === 'tablon' ? { n: '×' + inv.count(k) } : {});
    for (const k in ITEMS) if (ITEMS[k].key && !KEY_ORDER.includes(k) && inv.has(k)) add(k, 'key');
    for (const k of UPGRADE_ORDER) if (inv.has(k)) add(k, 'upgrade', k === 'relicario' || k === 'ampolla' ? { n: '×' + inv.count(k) } : {});
    return out;
  }
  readDocs() {
    return Object.keys(NOTES).filter((k) => this.g.flags['note:' + k]);
  }
  // las filas de casillas de lo que se ve (para moverse con las flechas)
  invLines() {
    const chunk = (idx) => {
      const out = [];
      for (let k = 0; k < idx.length; k += 4) out.push(idx.slice(k, k + 4));
      return out;
    };
    if (this.invTab === 0) {
      if (this.invPick) return chunk(this.pickOptions().map((_, i) => i));
      let i = 0;
      return EQUIP_ROWS.map((r) => r.slots.map(() => i++));
    }
    if (this.invTab === 1) {
      const ents = this.itemEntries();
      return ITEM_CATS.flatMap(([cat]) => chunk(ents.map((e, i) => (e.cat === cat ? i : -1)).filter((i) => i >= 0)));
    }
    return this.readDocs().map((_, i) => [i]);
  }
  invMove(dx, dy) {
    const lines = this.invLines();
    let li = lines.findIndex((l) => l.includes(this.invSel));
    if (li < 0) return;
    let ci = lines[li].indexOf(this.invSel);
    if (dx) ci = clamp(ci + dx, 0, lines[li].length - 1);
    if (dy) {
      li = clamp(li + dy, 0, lines.length - 1);
      ci = Math.min(ci, lines[li].length - 1);
    }
    const ns = lines[li][ci];
    if (ns === this.invSel) return;
    this.invSel = ns;
    this.renderInv();
    this.g.audio && this.g.audio.ui('move');
  }
  // Lo que hace cada tecla (o su rótulo pinchado): confirm, unequip, back,
  // tabL, tabR.
  invAction(a) {
    const g = this.g,
      au = g.audio;
    const done = () => {
      au && au.ui('confirm');
      this.renderInv();
    };
    if (a === 'tabL' || a === 'tabR') {
      this.invSwitch(this.invTab + (a === 'tabR' ? 1 : -1));
      au && au.ui('move');
      return;
    }
    // de la lista de una ranura se vuelve al equipo; si no, se cierra
    const unpick = () => {
      this.invSel = this.invPick.at;
      this.invPick = null;
    };
    if (a === 'back') {
      if (!this.invPick) return this.close();
      unpick();
      au && au.ui('move');
      this.renderInv();
      return;
    }
    if (this.invTab === 0) {
      if (this.invPick) {
        if (a !== 'confirm') return;
        g.equip(this.invPick.slot, this.pickOptions()[this.invSel]);
        unpick();
        return done();
      }
      const S = this.equipSlots()[this.invSel];
      if (!S || S.slot === '_flask') return;
      if (a === 'unequip') {
        if (!g.equipped(S.slot)) return;
        g.equip(S.slot, null);
        return done();
      }
      if (a !== 'confirm') return;
      // (nada que ponerse en ella: no se abre)
      if (!g.equipOptions(S.slot).length) return au && au.ui('lock');
      this.invPick = { slot: S.slot, name: S.name, at: this.invSel };
      this.invSel = Math.max(0, this.pickOptions().indexOf(g.equipped(S.slot)));
      return done();
    }
    if (this.invTab === 1) {
      const e = this.itemEntries()[this.invSel];
      const slot = e && g.slotOf(e.id);
      if (!slot) return;
      const on = g.equipped(slot) === e.id;
      if (a === 'confirm') g.equip(slot, on ? null : e.id);
      else if (a === 'unequip' && on) g.equip(slot, null);
      else return;
      return done();
    }
    if (a === 'confirm') {
      const read = this.readDocs();
      if (read[this.invSel]) this.showNote(NOTES[read[this.invSel]]);
    }
  }
  // Una casilla: el icono (o la silueta de la ranura vacía), la cuenta y la
  // marca de lo que se lleva puesto. Al pasar el ratón se elige; al
  // pincharla, se usa.
  invSlot(i, bm, o = {}) {
    const d = document.createElement('div');
    const sel = i === this.invSel;
    d.className = 'slot' + (sel ? ' sel' : '');
    this._slot = this._slot || slotBitmap(36, false);
    this._slotSel = this._slotSel || slotBitmap(36, true);
    d.innerHTML = spriteHtml(sel ? this._slotSel : this._slot) + (bm ? spriteHtml(bm, 1, 'ic') : '') + (o.n ? `<span class="n f-small">${esc(o.n)}</span>` : '') + (o.worn ? spriteHtml(smallIcon('worn'), 1, 'worn') : '');
    d.addEventListener('mousemove', (ev) => this.invHover(i, ev));
    d.addEventListener('click', () => {
      this.invSel = i;
      this.invAction('confirm');
    });
    return d;
  }
  // Al pasar el ratón se elige, pero sólo si se ha movido de verdad: al
  // repintar con el teclado, el navegador avisa de que el puntero quieto
  // «entra» en la casilla que queda debajo, y ésta robaba la selección.
  invHover(i, ev) {
    if (!ev.movementX && !ev.movementY) return;
    if (this.invSel !== i) {
      this.invSel = i;
      this.renderInv();
    }
  }
  // un grupo de casillas con su rótulo
  invGroup(label, els) {
    const g = document.createElement('div');
    g.className = 'grp';
    g.innerHTML = `<div class="lbl f-small">${esc(label)}</div>`;
    const grid = document.createElement('div');
    grid.className = 'grid';
    for (const e of els) grid.appendChild(e);
    g.appendChild(grid);
    return g;
  }
  // La barra de ayuda: [acción, rótulo]; 'tabs', las dos pestañas.
  invHint(acts) {
    const h = $('inv-hint');
    h.innerHTML = acts.map(([a, label]) => `<span data-a="${a}">${a === 'tabs' ? this.keyHtml('tabL') + this.keyHtml('tabR') : this.keyHtml(a)} ${esc(label)}</span>`).join('');
    h.querySelectorAll('span[data-a]').forEach((el) => el.addEventListener('click', () => this.invAction(el.dataset.a === 'tabs' ? 'tabR' : el.dataset.a)));
  }
  // Nombre, descripción y lo que hace: los objetos benditos, lo que dan y lo
  // que quitan; las armas a dos manos, dónde va el escudo; la armadura, lo que
  // para; y si se lleva puesto.
  itemInfo(id) {
    const g = this.g,
      it = ITEMS[id];
    const fx = it.relic ? `<ul class="fx">${it.pros.map((t) => `<li class="pro">${esc(t)}</li>`).join('')}${it.cons.map((t) => `<li class="con">${esc(t)}</li>`).join('')}</ul>` : '';
    const W = it.weapon && WEAPONS[it.weapon];
    let extra = '';
    if (W && W.hands === 2) extra += '<p class="f-small">A dos manos: el escudo va a la espalda.</p>';
    if (it.armor) extra += `<p class="f-small">Defensa: ${it.def || 0}</p>`;
    const slot = g.slotOf(id);
    // (el escudo, con un arma a dos manos, a la espalda)
    if (slot && g.equipped(slot) === id) extra += `<p class="f-small on">${slot === 'shield' && g.player.twoHanded && g.player.hasSword ? 'A la espalda' : WORN[slot] || WORN.armor}</p>`;
    return `<h3 class="f-bast">${esc(it.name)}</h3><p>${esc(it.desc)}</p>${fx}${extra}`;
  }
  statsHtml() {
    const g = this.g,
      p = g.player;
    const row = (ic, label, v) => `<span class="ico">${spriteHtml(smallIcon(ic))}${label}</span><b>${v}</b>`;
    const def = Math.round(p.armorDef() * 100);
    return `<div class="stats">${row('heart', 'Vitalidad', `${Math.ceil(p.hp)} / ${p.maxHp}`)}${row('stamina', 'Aguante', p.maxSt)}${row('flask', 'Ampollas', `${p.flasks} / ${p.maxFlasks}`)}${row('sword', 'Daño', Math.round(p.dmgMul * 100) + '%')}${def ? row('shield', 'Defensa', def + '%') : ''}${row('skull', 'Muertes', g.deaths)}${row('hourglass', 'Tiempo', formatTime(g.playTime))}</div>`;
  }
  renderInv() {
    document.querySelectorAll('#inv .tab').forEach((t) => t.classList.toggle('on', +t.dataset.t === this.invTab));
    const left = $('inv-left'),
      det = $('inv-detail');
    left.innerHTML = '';
    if (this.invTab === 0) this.renderEquip(left, det);
    else if (this.invTab === 1) this.renderItems(left, det);
    else this.renderDocs(left, det);
    // (lo elegido, a la vista: las listas largas se desplazan)
    left.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
  }
  renderEquip(left, det) {
    const g = this.g,
      p = g.player;
    const sep = `<div class="sep">${spriteHtml(dividerBitmap(110))}</div>`;
    const flask = () => iconBitmap(p.flasks > 0 ? 'flask' : 'flaskEmpty');
    if (this.invPick) {
      // la lista de lo que se puede poner en la ranura
      const P0 = this.invPick;
      const opts = this.pickOptions();
      this.invSel = clamp(this.invSel, 0, opts.length - 1);
      const cur = g.equipped(P0.slot);
      left.appendChild(this.invGroup(P0.name, opts.map((id, i) => this.invSlot(i, iconBitmap(id ? ITEMS[id].icon : 'none'), { worn: id ? id === cur : !cur }))));
      const id = opts[this.invSel];
      det.innerHTML = `<div class="eye f-small">${esc(P0.name)}</div>` + (id ? this.itemInfo(id) : `<h3 class="f-bast">Nada</h3><p>${esc(NOTHING[P0.slot] || NOTHING.armor)}</p>`);
      this.invHint([
        ['confirm', 'Elegir'],
        ['back', 'Volver'],
      ]);
      return;
    }
    const slots = this.equipSlots();
    this.invSel = clamp(this.invSel, 0, slots.length - 1);
    let i = 0;
    for (const row of EQUIP_ROWS) {
      const els = row.slots.map(([slot, , ghost]) => {
        const k = i++;
        if (slot === '_flask') return this.invSlot(k, flask(), { n: p.flasks + '/' + p.maxFlasks });
        const id = g.equipped(slot);
        return this.invSlot(k, id ? iconBitmap(ITEMS[id].icon) : ghostIcon(ghost));
      });
      left.appendChild(this.invGroup(row.label, els));
    }
    const S = slots[this.invSel];
    let h = `<div class="eye f-small">${esc(S.name)}</div>`;
    const id = S.slot === '_flask' ? null : g.equipped(S.slot);
    if (S.slot === '_flask') h += `<h3 class="f-bast">${esc(FLASK.name)}</h3><p>${esc(FLASK.desc)}</p>`;
    else if (id) h += this.itemInfo(id);
    else h += `<h3 class="f-bast dim">Vacía</h3><p>${esc(EMPTY[S.slot] || EMPTY.armor)}</p>`;
    const can = S.slot !== '_flask' && g.equipOptions(S.slot).length > 0;
    if (S.slot !== '_flask' && !can) h += `<p class="f-small">${esc(NONE_YET[S.slot] || NONE_YET.armor)}</p>`;
    if (!(id && ITEMS[id].relic)) h += sep + this.statsHtml();
    det.innerHTML = h;
    this.invHint([...(can ? [['confirm', 'Cambiar']] : []), ...(id ? [['unequip', 'Quitar']] : []), ['tabs', 'Pestañas'], ['back', 'Cerrar']]);
  }
  renderItems(left, det) {
    const g = this.g,
      p = g.player;
    const sep = `<div class="sep">${spriteHtml(dividerBitmap(110))}</div>`;
    const ents = this.itemEntries();
    this.invSel = clamp(this.invSel, 0, Math.max(0, ents.length - 1));
    for (const [cat, label] of ITEM_CATS) {
      const els = [];
      ents.forEach((e, i) => {
        if (e.cat === cat) els.push(this.invSlot(i, iconBitmap(e.id === '_flask' ? (p.flasks > 0 ? 'flask' : 'flaskEmpty') : ITEMS[e.id].icon), e));
      });
      if (els.length) left.appendChild(this.invGroup(label, els));
    }
    const e = ents[this.invSel];
    const cat = ITEM_CATS.find((c) => c[0] === e.cat)[1];
    let h = `<div class="eye f-small">${esc(cat)}</div>`;
    h += e.id === '_flask' ? `<h3 class="f-bast">${esc(FLASK.name)}</h3><p>${esc(FLASK.desc)}</p>` : this.itemInfo(e.id);
    if (e.cat !== 'relic') h += sep + this.statsHtml();
    det.innerHTML = h;
    // (lo que se puede llevar puesto: se pone o se quita)
    const slot = g.slotOf(e.id);
    const act = slot ? (g.equipped(slot) === e.id ? TAKE_OFF[slot] || TAKE_OFF.armor : PUT_ON[slot] || PUT_ON.armor) : null;
    this.invHint([...(act ? [['confirm', act]] : []), ['tabs', 'Pestañas'], ['back', 'Cerrar']]);
  }
  renderDocs(left, det) {
    const read = this.readDocs();
    this.invSel = clamp(this.invSel, 0, Math.max(0, read.length - 1));
    const box = document.createElement('div');
    box.className = 'docs f-hand';
    if (!read.length) box.innerHTML = '<div class="doc">Aún no has encontrado documentos.</div>';
    const di = spriteHtml(smallIcon('doc'));
    read.forEach((k, i) => {
      const d = document.createElement('div');
      d.className = 'doc' + (i === this.invSel ? ' sel' : '');
      d.innerHTML = di + `<span>${esc(NOTES[k].title)}</span>`;
      d.addEventListener('mousemove', (ev) => this.invHover(i, ev));
      d.addEventListener('click', () => this.showNote(NOTES[k]));
      box.appendChild(d);
    });
    left.appendChild(box);
    const k = read[this.invSel];
    if (k) {
      const t = NOTES[k].text;
      const prev = t.length > 230 ? t.slice(0, t.lastIndexOf(' ', 230)) + '…' : t;
      det.innerHTML = `<h3 class="f-bast">${esc(NOTES[k].title)}</h3><p style="white-space:pre-wrap">${esc(prev)}</p>`;
    } else det.innerHTML = this.statsHtml();
    this.invHint([...(read.length ? [['confirm', 'Leer']] : []), ['tabs', 'Pestañas'], ['back', 'Cerrar']]);
  }

  showNote(note) {
    $('note-title').textContent = note.title;
    const box = $('note-text');
    box.innerHTML = '';
    const text = note.text.trim();
    // capitular iluminada con la primera letra
    const m = text.match(/^[«"¿¡(]*([A-Za-zÁÉÍÓÚÑáéíóúñ])/);
    let rest = text;
    if (m) {
      const cap = m[1].toUpperCase();
      box.appendChild(spriteImg(dropCap(cap), 1, 'drop'));
      rest = text.slice(0, m[0].length - 1) + text.slice(m[0].length);
    }
    box.scrollTop = 0;
    const paras = rest.split(/\n\s*\n/);
    paras.forEach((t) => {
      const p = document.createElement('p');
      p.textContent = t;
      box.appendChild(p);
    });
    // la transcripción: el mismo texto en letra de leer (la bastarda de los
    // documentos cuesta a veces descifrarla)
    const tr = $('note-tr-text');
    tr.innerHTML = '';
    tr.scrollTop = 0;
    for (const t of text.split(/\n\s*\n/)) {
      const p = document.createElement('p');
      p.textContent = t;
      tr.appendChild(p);
    }
    this.showTranscript(this.g.settings.transcript);
    // lacre al pie
    const parch = box.parentElement;
    parch.querySelector('.seal')?.remove();
    const s = spriteImg(this.seal, 1, 'seal');
    parch.appendChild(s);
    this.open('note');
  }
  showTranscript(on) {
    $('note-wrap').classList.toggle('tr', !!on);
  }
  // Muestra u oculta la transcripción (y se recuerda para los siguientes).
  toggleTranscript() {
    const S = this.g.settings;
    S.transcript = !S.transcript;
    this.g.applySettings();
    this.showTranscript(S.transcript);
    this.renderNoteHint();
    this.g.audio && this.g.audio.ui('move');
  }
  renderNoteHint() {
    const h = $('note-hint');
    h.innerHTML = `<span>${this.keyHtml('confirm')} Cerrar</span><span class="tg">${this.keyHtml('transcribe')} ${this.g.settings.transcript ? 'Ocultar la transcripción' : 'Transcripción'}</span>`;
    h.querySelector('.tg').addEventListener('click', () => this.toggleTranscript());
  }
  showItem(id) {
    const it = ITEMS[id];
    const box = $('item-icon');
    box.innerHTML = '';
    this._rays = this._rays || raysBitmap(72);
    box.appendChild(spriteImg(this._rays, 1, 'rays'));
    box.appendChild(spriteImg(slotBitmap(40, true), 1));
    box.appendChild(spriteImg(iconBitmap(it.icon), 1));
    $('item-name').textContent = it.name;
    $('item-desc').textContent = it.desc;
    this.open('item');
  }

  // ------------------------------------------------------------ mapa
  renderMap() {
    const g = this.g;
    const u = this.sc.u;
    const cvs = $('map-canvas');
    const W = Math.max(160, Math.min(330, Math.floor((innerWidth * 0.84) / u) - 30)),
      H = Math.max(100, Math.min(200, Math.floor((innerHeight * 0.66) / u) - 40));
    const b = parchmentBitmap(W, H, 91);
    // (la bodega del canónigo va en el plano de la ciudad, bajo su casa)
    const cellar = g.inCellar(g.player.pos);
    const dungeon = !cellar && g.inDungeon(g.player.pos);
    const crypt = g.player.pos.y < -3 && !cellar && !dungeon;
    const ey = $('map-eyebrow').querySelector('span');
    const where = crypt ? 'Bajo la catedral' : cellar ? 'Bajo la casa del canónigo' : dungeon ? 'Bajo el castillo' : 'Braga intramuros';
    if (ey) ey.textContent = where + (g.zone && AREA_NAMES[g.zone.id] ? ' · ' + AREA_NAMES[g.zone.id] : '');
    const layer = crypt ? 'crypt' : cellar ? 'cellar' : dungeon ? 'dungeon' : undefined;
    const rects = g.level.L.map.filter((m) => m.level === layer && (layer || m.id !== 'river' || g.visited.has('river')));
    const seen = rects.filter((m) => g.visited.has(m.id));
    let x0 = 1e9,
      z0 = 1e9,
      x1 = -1e9,
      z1 = -1e9;
    for (const m of seen.length ? seen : rects) {
      x0 = Math.min(x0, m.r[0]);
      z0 = Math.min(z0, m.r[1]);
      x1 = Math.max(x1, m.r[2]);
      z1 = Math.max(z1, m.r[3]);
    }
    // margen alrededor de lo explorado (y un mínimo para no ampliar de más)
    const mx = Math.max(12, (60 - (x1 - x0)) / 2),
      mz = Math.max(12, (60 - (z1 - z0)) / 2);
    x0 -= mx;
    x1 += mx;
    z0 -= mz;
    z1 += mz;
    const pad = 10;
    const sc = Math.min((W - pad * 2) / (x1 - x0), (H - pad * 2) / (z1 - z0));
    const ox = (W - (x1 - x0) * sc) / 2 - x0 * sc,
      oz = (H - (z1 - z0) * sc) / 2 - z0 * sc;
    const X = (x) => Math.round(x * sc + ox),
      Z = (z) => Math.round(z * sc + oz);
    // zonas visitadas: tinta sobre pergamino con sombreado tramado
    const vis = rects.filter((m) => g.visited.has(m.id));
    for (const m of vis) {
      const [a, bb, c, d] = m.r;
      for (let y = Z(bb); y < Z(d); y++)
        for (let x = X(a); x < X(c); x++) {
          if (m.cut && x >= X(m.cut[0]) && x < X(m.cut[2]) && y >= Z(m.cut[1]) && y < Z(m.cut[3])) continue;
          if (!b.on(x, y)) continue;
          b.set(x, y, (x + y) % 3 === 0 ? P.parch1 : P.parch2);
        }
    }
    for (const m of vis) {
      const [a, bb, c, d] = m.r;
      const L = X(a),
        R = X(c) - 1,
        T = Z(bb),
        B = Z(d) - 1;
      for (let x = L; x <= R; x++) {
        if (b.on(x, T)) b.set(x, T, P.pink1);
        if (b.on(x, B)) b.set(x, B, P.pink0);
      }
      for (let y = T; y <= B; y++) {
        if (b.on(L, y)) b.set(L, y, P.pink1);
        if (b.on(R, y)) b.set(R, y, P.pink0);
      }
    }
    // rótulos: primero las zonas grandes; sólo donde caben sin pisarse
    const placed = [];
    // (las zonas con 'label' comparten rótulo: los pisos de la torre del homenaje)
    const here = this.g.zone && this.g.zone.id;
    const hereKey = (vis.find((m) => m.id === here) || {}).label ?? here;
    const byArea = [...new Map(vis.map((m) => [m.label ?? m.id, m])).values()].sort((a, bb) => (bb.r[2] - bb.r[0]) * (bb.r[3] - bb.r[1]) - (a.r[2] - a.r[0]) * (a.r[3] - a.r[1]));
    for (const m of byArea) {
      const key = m.label ?? m.id;
      const name = AREA_NAMES[key] || m.id;
      const t = textBitmap(name.toUpperCase(), 'small', { color: key === hereKey ? P.blood2 : P.pink0 });
      const zw = (m.r[2] - m.r[0]) * sc,
        zh = (m.r[3] - m.r[1]) * sc;
      const cx = X((m.r[0] + m.r[2]) / 2),
        cz = Z((m.r[1] + m.r[3]) / 2);
      const tx = clamp(cx - Math.floor(t.w / 2), 2, W - t.w - 2),
        tz = clamp(cz - Math.floor(t.h / 2), 2, H - t.h - 2);
      const fits = t.w <= Math.max(zw, zh) * 1.6 + 8;
      const clash = placed.some((q) => tx < q[0] + q[2] + 2 && tx + t.w + 2 > q[0] && tz < q[1] + q[3] && tz + t.h > q[1]);
      if ((!fits || clash) && key !== hereKey) continue;
      placed.push([tx, tz, t.w, t.h]);
      const halo = new Bitmap(t.w, t.h);
      halo.blit(t, 0, 0);
      halo.outline(P.parch4);
      b.blit(halo, tx, tz);
    }
    // puertas, altares y objetos en zonas visitadas (de este plano: en el de
    // las bodegas salían las puertas de la casa de arriba y no el rastrillo)
    const inVisited = (x, z) => vis.some((m) => x >= m.r[0] - 2 && x <= m.r[2] + 2 && z >= m.r[1] - 2 && z <= m.r[3] + 2);
    const layerOf = (it) => (g.inCellar(it) ? 'cellar' : g.inDungeon(it) ? 'dungeon' : it.y < -3 ? 'crypt' : undefined);
    for (const it of g.interact.list) {
      if (layerOf(it) !== layer) continue;
      if (!inVisited(it.x, it.z)) continue;
      const x = X(it.x),
        z = Z(it.z);
      let ic = null;
      // (una puerta escondida no sale en el mapa hasta que se abre)
      if (it.kind === 'door' && it.hidden && !it.done) continue;
      if (it.kind === 'door') ic = it.done || it.lock.type === 'none' ? 'open' : 'locked';
      else if (it.kind === 'altar') ic = 'altar';
      else if (it.kind === 'item' && !it.done && !it.hidden) ic = 'item';
      if (!ic) continue;
      const s = smallIcon(ic);
      if (ic === 'item' || ic === 'open' || ic === 'locked') {
        // versión reducida: un rombo o cuadrado de 3 px
        const col = ic === 'item' ? P.bone3 : ic === 'open' ? P.moss3 : P.blood3;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (ic !== 'item' || Math.abs(dx) + Math.abs(dy) <= 1) b.set(x + dx, z + dy, col);
        b.set(x - 2, z, P.void);
        continue;
      }
      b.blit(s, x - 5, z - 5);
    }
    // jugador: flecha girada
    const p = g.player;
    const px = X(p.pos.x),
      pz = Z(p.pos.z);
    const a = -p.yaw + Math.PI;
    const rot = (dx, dy) => [px + dx * Math.cos(a) - dy * Math.sin(a), pz + dx * Math.sin(a) + dy * Math.cos(a)];
    const arrow = new Bitmap(W, H);
    arrow.poly([rot(0, -5.5), rot(4, 4.5), rot(0, 2), rot(-4, 4.5)], P.bone3);
    arrow.set(Math.round(rot(0, -2)[0]), Math.round(rot(0, -2)[1]), P.gold4);
    arrow.outline(P.void);
    b.blit(arrow, 0, 0);
    // rosa de los vientos (fuera del borde rasgado: la N se cortaba)
    const nx = W - 20,
      ny = 22;
    b.line(nx, ny - 6, nx, ny + 6, P.pink1);
    b.line(nx - 6, ny, nx + 6, ny, P.pink1);
    b.poly(
      [
        [nx + 0.5, ny - 8],
        [nx + 2.5, ny],
        [nx + 0.5, ny - 1],
        [nx - 1.5, ny],
      ],
      P.blood2
    );
    const N = textBitmap('N', 'small', { color: P.pink0 });
    b.blit(N, nx + 4, ny - 11);
    cvs.width = W;
    cvs.height = H;
    b.paint(cvs.getContext('2d'));
    cvs.style.width = W * u + 'px';
    cvs.style.height = H * u + 'px';
    $('map-legend').innerHTML = LEGEND.map(([ic, t]) => `<span>${spriteHtml(smallIcon(ic))}${t}</span>`).join('');
    $('map-hint').innerHTML = `<span>${this.keyHtml('back')} Cerrar</span>`;
  }

  // ------------------------------------------------------------ HUD
  toast(text, dur = 3.4) {
    const d = document.createElement('div');
    d.className = 'toast';
    const s = document.createElement('span');
    // [E], [Clic izq.]... se muestran como teclas
    if (/\[[^\]]+\]/.test(text)) {
      const pad = this.device() === 'pad';
      s.innerHTML = esc(text).replace(/\[([^\]]+)\]/g, (_, k) => `<span class="keys">${spriteHtml(keyBitmap(k, pad))}</span>`);
    } else s.textContent = text;
    d.appendChild(s);
    this.toastsEl.appendChild(d);
    attachBackdrop(d, (w, h) => bannerBitmap(w, h, 'dark'), () => this.sc.u);
    const kill = (el) => {
      el._pxRO && el._pxRO.disconnect();
      el.remove();
    };
    while (this.toastsEl.children.length > 3) kill(this.toastsEl.firstChild);
    setTimeout(() => d.classList.add('out'), dur * 1000);
    setTimeout(() => kill(d), dur * 1000 + 700);
  }
  // quita los avisos que haya en pantalla (al saltar de un sitio a otro)
  clearToasts() {
    while (this.toastsEl.firstChild) {
      const el = this.toastsEl.firstChild;
      el._pxRO && el._pxRO.disconnect();
      el.remove();
    }
  }
  area(name) {
    const a = $('area');
    a.querySelector('.name').textContent = name;
    a.classList.add('show');
    clearTimeout(this._areaTO);
    this._areaTO = setTimeout(() => a.classList.remove('show'), 3200);
  }
  showHud(v) {
    $('hud').classList.toggle('hidden', !v);
    if (v) $('hud').classList.remove('cine');
  }
  // En una escena: el HUD fuera, salvo los bocadillos (y los avisos).
  cineHud(on) {
    $('hud').classList.toggle('cine', on);
    if (on) $('hud').classList.remove('hidden');
  }

  // Barra con marco de hierro, relleno sombreado y rastro del daño (y, con el
  // Óbolo de las Ánimas, la vida en el aire que aún se puede recuperar:
  // dorada, tramada).
  _bar(b, x, y, len, h, frac, lag, cols, rally = 0) {
    b.rect(x, y, len + 2, h + 2, P.void);
    for (let i = 0; i < len; i++) b.set(x + 1 + i, y, i % 5 === 0 ? P.iron3 : P.iron2);
    const f = Math.round(frac * len),
      r = Math.round(Math.min(1, frac + rally) * len),
      l = Math.round(Math.max(frac, lag) * len);
    for (let j = 0; j < h; j++)
      for (let i = 0; i < len; i++) {
        const X = x + 1 + i,
          Y = y + 1 + j;
        let c;
        if (i < f) c = cols[Math.min(cols.length - 1, j)];
        else if (i < r) c = (X + Y) % 2 ? (j === 0 ? P.gold4 : P.gold3) : P.gold2;
        else if (i < l) c = j === 0 ? P.bone3 : P.bone1;
        else c = (X + Y) % 2 ? P.ink0 : P.ink1;
        b.set(X, Y, c);
      }
    // brillo del extremo
    if (f > 0 && f < len) b.vline(x + f, y + 1, y + h, P.bone3);
  }
  drawVitals(dt) {
    const p = this.g.player;
    const hpLen = Math.round(clamp(p.maxHp, 50, 300) * 1.1),
      stLen = Math.round(clamp(p.maxSt, 50, 300) * 0.95);
    const W = 13 + Math.max(hpLen, stLen) + 4,
      H = 38;
    const hf = clamp(p.hp / p.maxHp, 0, 1);
    // rastro del daño: espera un momento y luego baja
    if (hf < this.hpLag) {
      this._lagHold = (this._lagHold ?? 0) + dt;
      if (this._lagHold > 0.45) this.hpLag = Math.max(hf, this.hpLag - dt * 0.6);
    } else {
      this.hpLag = hf;
      this._lagHold = 0;
    }
    const rf = p.rally > 0 ? clamp(p.rally / p.maxHp, 0, 1) : 0;
    const key = [W, Math.round(hf * hpLen), Math.round(this.hpLag * hpLen), Math.round(rf * hpLen), Math.round((p.st / p.maxSt) * stLen), p.st <= 0, p.flasks, p.maxFlasks, p.relic].join(',');
    if (key === this._vitKey && this._vitU === this.sc.u) return;
    this._vitKey = key;
    this._vitU = this.sc.u;
    const b = new Bitmap(W, H);
    // medallón
    b.disc(5, 6, 5.2, P.iron2);
    b.disc(5, 6, 3.6, P.blood1);
    b.disc(4.6, 5.6, 2.2, P.blood3);
    b.set(4, 4, P.ruby4);
    b.set(3, 5, P.blood4);
    this._bar(b, 11, 1, hpLen, 6, hf, this.hpLag, [P.blood4, P.blood3, P.blood3, P.blood2, P.blood2, P.blood1], rf);
    const stCols = p.st <= 0 ? [P.ember1, P.blood1, P.blood1, P.blood0] : [P.moss4, P.moss3, P.moss3, P.moss2];
    this._bar(b, 11, 10, stLen, 4, clamp(p.st / p.maxSt, 0, 1), 0, stCols);
    // ampollas (gris cuando no queda ninguna)
    const fl = smallIcon('flask');
    const fb = new Bitmap(fl.w, fl.h);
    fb.blit(fl, 0, 0);
    if (p.flasks === 0) fb.map((x, y, v) => (v >>> 24 ? (bayer(x, y) < 0.5 ? P.iron1 : P.iron2) : undefined));
    b.blit(fb, 11, 19);
    const n = textBitmap(String(p.flasks), 'small', { color: p.flasks ? P.bone3 : P.iron3, outline: P.void });
    b.blit(n, 23, 20);
    // el objeto bendito que se lleva
    if (p.relic) b.blit(smallIcon(ITEMS[p.relic].icon), 33, 19);
    b.outline(P.void);
    const cv = this.vit;
    if (cv.width !== W || cv.height !== H) {
      cv.width = W;
      cv.height = H;
    }
    b.paint(cv.getContext('2d'));
    cv.style.width = W * this.sc.u + 'px';
    cv.style.height = H * this.sc.u + 'px';
  }
  drawBoss(b0, dt) {
    const W = Math.max(120, Math.min(260, Math.floor((innerWidth * 0.62) / this.sc.u))),
      H = 8;
    // (los Velados: una sola barra con la vida de los dos)
    const pr = b0.partner;
    const f = pr ? clamp((Math.max(0, b0.hp) + (pr.dead ? 0 : Math.max(0, pr.hp))) / (b0.maxHp + pr.maxHp), 0, 1) : clamp(b0.hp / b0.maxHp, 0, 1);
    if (f < this.bossLag) this.bossLag = Math.max(f, this.bossLag - dt * 0.35);
    else this.bossLag = f;
    const key = [W, Math.round(f * W), Math.round(this.bossLag * W)].join(',');
    if (key === this._bossKey && this._bossU === this.sc.u) return;
    this._bossKey = key;
    this._bossU = this.sc.u;
    const b = new Bitmap(W + 4, H + 2);
    this._bar(b, 1, 0, W, H - 2, f, this.bossLag, [P.blood4, P.blood3, P.blood2, P.blood2, P.blood1, P.blood0]);
    // remates de hierro en los extremos
    for (const x of [0, W + 3]) b.vline(x, 1, H - 2, P.iron3);
    const cv = this.boss;
    cv.width = b.w;
    cv.height = b.h;
    b.paint(cv.getContext('2d'));
    cv.style.width = b.w * this.sc.u + 'px';
    cv.style.height = b.h * this.sc.u + 'px';
  }

  // La vida de Henrique mientras le defiendes: más corta y en verde.
  drawAlly(e, dt) {
    const W = 96,
      H = 6;
    const f = clamp(e.hp / e.maxHp, 0, 1);
    if (f < this.allyLag) this.allyLag = Math.max(f, this.allyLag - dt * 0.4);
    else this.allyLag = f;
    const key = [Math.round(f * W), Math.round(this.allyLag * W), f < 0.3 && Math.floor(this.g.time * 4) % 2].join(',');
    if (key === this._allyKey && this._allyU === this.sc.u) return;
    this._allyKey = key;
    this._allyU = this.sc.u;
    const b = new Bitmap(W + 4, H + 2);
    // (con poca vida, parpadea en rojo)
    const low = f < 0.3 && Math.floor(this.g.time * 4) % 2;
    this._bar(b, 1, 0, W, H - 2, f, this.allyLag, low ? [P.blood4, P.blood3, P.blood2, P.blood1] : [P.moss4, P.moss3, P.moss2, P.moss2]);
    for (const x of [0, W + 3]) b.vline(x, 1, H - 2, P.iron3);
    const cv = this.ally;
    cv.width = b.w;
    cv.height = b.h;
    b.paint(cv.getContext('2d'));
    cv.style.width = b.w * this.sc.u + 'px';
    cv.style.height = b.h * this.sc.u + 'px';
  }

  updateHud(dt) {
    const g = this.g,
      p = g.player;
    this.drawVitals(dt);
    // aliado
    const ab = $('allybar');
    const al = g.house && g.house.allyBar();
    if (al) {
      ab.classList.add('show');
      this.drawAlly(al, dt);
    } else {
      ab.classList.remove('show');
      this.allyLag = 1;
    }
    // indicación de interacción
    const pr = $('prompt');
    const t = g.promptTarget;
    // (atrapado o derribado por el Descoyuntado: forcejea; con alguien
    // desequilibrado a tu alcance tras un parry: el golpe de gracia)
    const struggle = (p.state === 'grabbed' || p.state === 'pinned') && !p.dead;
    const rip = !struggle && !p.dead && (p.state === 'free' || p.state === 'parry') && p.hasSword && !!p.riposteTarget();
    if ((t || struggle || rip) && !this.modal && g.state === 'play') {
      const label = struggle ? 'Forcejea' : rip ? 'Golpe de gracia' : g.interact.label(t);
      const d = this.device();
      const glyph = GLYPHS[d][struggle || rip ? 'light' : (t && t.glyph) || 'interact'];
      const k = d + ':' + glyph + ':' + label;
      if (k !== this._promptKey) {
        this._promptKey = k;
        $('prompt-label').textContent = label;
        $('prompt-key').innerHTML = spriteHtml(keyBitmap(glyph, d === 'pad'));
      }
      pr.classList.add('show');
    } else pr.classList.remove('show');
    // (los controles de un mecanismo, al día con el teclado o el mando)
    if (this._pzList) this.renderPuzzleHint();
    // jefe
    const bb = $('bossbar');
    const b = g.activeBoss;
    // (el que caza en la bodega sólo enseña su barra cuando pelea contigo)
    if (b && !b.dead && (!b.T.stalker || (b.D && b.D.engaged))) {
      bb.classList.add('show');
      const nm = bb.querySelector('.name');
      if (nm.textContent !== b.T.name) nm.textContent = b.T.name;
      this.drawBoss(b, dt);
    } else {
      bb.classList.remove('show');
      this.bossLag = 1;
    }
    // retícula de fijado
    const lk = $('lock');
    const lt = g.lockTarget;
    const W = innerWidth,
      H = innerHeight;
    if (lt && !lt.dead) {
      const v = this._v.set(lt.pos.x, lt.pos.y + lt.lockHeight * 0.85, lt.pos.z).project(g.camera);
      if (v.z < 1) {
        const s = 15 * this.sc.u;
        lk.style.transform = `translate(${Math.round(((v.x + 1) / 2) * W - s / 2)}px, ${Math.round(((1 - v.y) / 2) * H - s / 2)}px)`;
        lk.classList.add('show');
      } else lk.classList.remove('show');
    } else lk.classList.remove('show');
    // barras de enemigos
    let n = 0;
    for (const e of g.activeEnemies) {
      if (n >= this.ebars.length) break;
      // (Henrique lleva su propia barra, abajo, mientras le defiendes)
      if (e.dead || e.boss || e.T.friendly || !e.obj.visible) continue;
      if (e.hitShown > 0) e.hitShown -= dt;
      if (!(e.hitShown > 0 || e === lt)) continue;
      const v = this._v.set(e.pos.x, e.pos.y + e.T.height + 0.35, e.pos.z).project(g.camera);
      if (v.z >= 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) continue;
      const d = this.ebars[n++];
      d.classList.remove('hidden');
      d.style.left = Math.round(((v.x + 1) / 2) * W) + 'px';
      d.style.top = Math.round(((1 - v.y) / 2) * H) + 'px';
      d.firstChild.style.width = Math.round(clamp(e.hp / e.maxHp, 0, 1) * 22) * this.sc.u + 'px';
    }
    for (; n < this.ebars.length; n++) this.ebars[n].classList.add('hidden');
    const f = $('fps');
    f.classList.toggle('hidden', !g.settings.fps);
    if (g.settings.fps) f.textContent = g.fps + ' fps';
  }

  // ------------------------------------------------------------ entrada de menús
  update(dt) {
    const s = this.top;
    if (!s) return;
    // ignorar la entrada del mismo fotograma en que se abrió la pantalla
    if (s.fresh) {
      s.fresh = false;
      return;
    }
    const inp = this.g.input;
    const dir = inp.menuDir();
    const conf = inp.pressed('confirm') || inp.pressed('interact');
    const back = inp.pressed('back') || inp.pressed('pause');
    const au = this.g.audio;
    switch (s.name) {
      case 'title':
      case 'pause': {
        if (s.name === 'title' && !s.data.ready) return;
        const n = s.data.entries.length;
        if (dir.y) {
          s.sel = (s.sel + dir.y + n) % n;
          this.renderMenu(s);
          au && au.ui('move');
        }
        if (conf) {
          const e = s.data.entries[s.sel];
          if (e && !e.off) {
            au && au.ui('confirm');
            e.action();
          }
        } else if (back && s.data.onBack) s.data.onBack();
        break;
      }
      case 'options': {
        const n = s.data.entries.length;
        if (dir.y) {
          s.sel = (s.sel + dir.y + n) % n;
          this.renderOptions(s);
          au && au.ui('move');
        }
        if (dir.x || conf) {
          s.data.entries[s.sel].set(dir.x || 1);
          this.g.applySettings();
          this.renderOptions(s);
          au && au.ui('move');
        }
        if (back) this.close();
        break;
      }
      case 'controls':
      case 'map':
        if (back || conf || (s.name === 'map' && inp.pressed('map'))) this.close();
        break;
      case 'note':
      case 'item':
        if (s.t === undefined) s.t = 0;
        s.t += dt;
        // documentos largos en pantallas pequeñas: el texto se desplaza (y su
        // transcripción con él)
        if (s.name === 'note' && dir.y) {
          $('note-text').scrollBy(0, dir.y * 19 * (this.sc.m + 1) * 2);
          $('note-tr-text').scrollBy(0, dir.y * 21 * this.sc.m * 2);
        }
        if (s.name === 'note' && inp.pressed('transcribe')) this.toggleTranscript();
        if (s.t > 0.35 && (conf || back)) this.close();
        break;
      case 'inv': {
        // (Tab o I, con lo que se abre, lo cierran desde cualquier sitio;
        // «atrás» vuelve de la lista de una ranura al equipo. La pestaña
        // derecha va con la R: con la E, que es «confirmar», cambiaba de
        // pestaña en vez de elegir)
        if (inp.pressed('inventory')) {
          this.close();
          break;
        }
        if (back) this.invAction('back');
        else if (inp.pressed('tabL')) this.invAction('tabL');
        else if (inp.pressed('tabR')) this.invAction('tabR');
        else {
          if (dir.x || dir.y) this.invMove(dir.x, dir.y);
          if (conf) this.invAction('confirm');
          else if (inp.pressed('unequip')) this.invAction('unequip');
        }
        break;
      }
      case 'story':
        if (s.data.skippable && (conf || back) && s.data.onSkip) s.data.onSkip();
        break;
      case 'ending':
        if (s.data.ready && conf) s.data.onDone();
        break;
    }
  }
}
