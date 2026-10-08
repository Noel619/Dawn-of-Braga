// Interfaz en pixel art: HUD dibujado a resolución de arte, menús con
// estandarte y espada como cursor, documentos en pergamino con capitular
// iluminada, inventario, mapa, opciones, muerte e historia. Navegable con
// teclado, mando y ratón.
import * as THREE from 'three';
import { GLYPHS } from '../core/input.js';
import { ITEMS, NOTES, AREA_NAMES } from './story.js';
import { WEAPON_ORDER, WEAPONS } from '../entities/weapons.js';
import { iconBitmap, smallIcon } from './icons.js';
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
    this.hpLag = 1;
    this.bossLag = 1;
    this.ebars = [];
    for (let i = 0; i < 6; i++) {
      const d = document.createElement('div');
      d.className = 'eb hidden';
      d.innerHTML = '<i></i>';
      $('ebars').appendChild(d);
      this.ebars.push(d);
    }
    // pestañas con ratón
    document.querySelectorAll('#inv .tab').forEach((t) =>
      t.addEventListener('click', () => {
        this.invTab = +t.dataset.t;
        this.invSel = 0;
        this.renderInv();
      })
    );
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
    if (!this.modal) document.body.style.cursor = '';
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
    if (s.name === 'note') $('note-hint').innerHTML = `<span>${this.keyHtml('confirm')} Cerrar</span>`;
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
  invEntries() {
    const g = this.g;
    const out = [];
    const inv = g.inventory;
    // armas en el orden en que se encuentran
    for (const w of WEAPON_ORDER) if (inv.has(WEAPONS[w].item)) out.push({ id: WEAPONS[w].item });
    if (inv.has('escudo')) out.push({ id: 'escudo' });
    out.push({ id: '_flask', n: g.player.flasks + '/' + g.player.maxFlasks });
    for (const k of ['palanca', 'llave_claustro', 'manivela', 'anillo']) if (inv.has(k)) out.push({ id: k });
    const c = (k) => inv.count(k);
    if (c('relicario')) out.push({ id: 'relicario', n: '×' + c('relicario') });
    if (c('ampolla')) out.push({ id: 'ampolla', n: '×' + c('ampolla') });
    if (c('piedra')) out.push({ id: 'piedra' });
    // (el rosario del canónigo no aparecía nunca en el inventario)
    if (c('rosario')) out.push({ id: 'rosario' });
    return out;
  }
  statsHtml() {
    const g = this.g,
      p = g.player;
    const row = (ic, label, v) => `<span class="ico">${spriteHtml(smallIcon(ic))}${label}</span><b>${v}</b>`;
    return `<div class="stats">${row('heart', 'Vitalidad', `${Math.ceil(p.hp)} / ${p.maxHp}`)}${row('flask', 'Ampollas', `${p.flasks} / ${p.maxFlasks}`)}${row('sword', 'Daño', Math.round(p.dmgMul * 100) + '%')}${row('skull', 'Muertes', g.deaths)}${row('hourglass', 'Tiempo', formatTime(g.playTime))}</div>`;
  }
  renderInv() {
    const g = this.g;
    document.querySelectorAll('#inv .tab').forEach((t) => t.classList.toggle('on', +t.dataset.t === this.invTab));
    const grid = $('inv-grid'),
      docs = $('inv-docs'),
      det = $('inv-detail');
    grid.classList.toggle('hidden', this.invTab !== 0);
    docs.classList.toggle('hidden', this.invTab !== 1);
    const sep = `<div class="sep">${spriteHtml(dividerBitmap(110))}</div>`;
    if (this.invTab === 0) {
      const ents = this.invEntries();
      this.invSel = clamp(this.invSel, 0, ents.length - 1);
      grid.innerHTML = '';
      const slot = slotBitmap(36, false),
        slotSel = slotBitmap(36, true);
      ents.forEach((e, i) => {
        const d = document.createElement('div');
        d.className = 'slot';
        const ic = e.id === '_flask' ? (g.player.flasks > 0 ? 'flask' : 'flaskEmpty') : ITEMS[e.id].icon;
        const ib = iconBitmap(ic);
        d.innerHTML = spriteHtml(i === this.invSel ? slotSel : slot) + spriteHtml(ib, 1, 'ic') + (e.n ? `<span class="n f-small">${esc(e.n)}</span>` : '');
        d.addEventListener('mouseenter', () => {
          if (this.invSel !== i) {
            this.invSel = i;
            this.renderInv();
          }
        });
        grid.appendChild(d);
      });
      const e = ents[this.invSel];
      if (e) {
        const it = e.id === '_flask' ? { name: 'Ampolla de Santa Bárbara', desc: 'Lágrimas de la santa en un frasco de vidrio. Restauran parte de tu vitalidad. Se rellenan al descansar en un altar.' } : ITEMS[e.id];
        det.innerHTML = `<h3 class="f-bast">${esc(it.name)}</h3><p>${esc(it.desc)}</p>${sep}${this.statsHtml()}`;
      } else det.innerHTML = this.statsHtml();
      $('inv-hint').innerHTML = `<span>${this.keyHtml('tabL')}${this.keyHtml('tabR')} Pestañas</span><span>${this.keyHtml('back')} Cerrar</span>`;
    } else {
      const read = Object.keys(NOTES).filter((k) => g.flags['note:' + k]);
      this.invSel = clamp(this.invSel, 0, Math.max(0, read.length - 1));
      docs.innerHTML = read.length ? '' : '<div class="doc">Aún no has encontrado documentos.</div>';
      const di = spriteHtml(smallIcon('doc'));
      read.forEach((k, i) => {
        const d = document.createElement('div');
        d.className = 'doc' + (i === this.invSel ? ' sel' : '');
        d.innerHTML = di + `<span>${esc(NOTES[k].title)}</span>`;
        d.addEventListener('mouseenter', () => {
          if (this.invSel !== i) {
            this.invSel = i;
            this.renderInv();
          }
        });
        d.addEventListener('click', () => this.showNote(NOTES[k]));
        docs.appendChild(d);
      });
      const k = read[this.invSel];
      if (k) {
        const t = NOTES[k].text;
        const prev = t.length > 230 ? t.slice(0, t.lastIndexOf(' ', 230)) + '…' : t;
        det.innerHTML = `<h3 class="f-bast">${esc(NOTES[k].title)}</h3><p style="white-space:pre-wrap">${esc(prev)}</p>`;
      } else det.innerHTML = this.statsHtml();
      // (con teclado la E lee el documento: no se anuncia también como pestaña)
      const tabs = this.keyHtml('tabL') + (read.length && this.device() === 'kb' ? '' : this.keyHtml('tabR'));
      $('inv-hint').innerHTML = `<span>${tabs} Pestañas</span><span>${this.keyHtml('confirm')} Leer</span><span>${this.keyHtml('back')} Cerrar</span>`;
    }
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
    // lacre al pie
    const parch = box.parentElement;
    parch.querySelector('.seal')?.remove();
    const s = spriteImg(this.seal, 1, 'seal');
    parch.appendChild(s);
    this.open('note');
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
  }

  // Barra con marco de hierro, relleno sombreado y rastro del daño.
  _bar(b, x, y, len, h, frac, lag, cols) {
    b.rect(x, y, len + 2, h + 2, P.void);
    for (let i = 0; i < len; i++) b.set(x + 1 + i, y, i % 5 === 0 ? P.iron3 : P.iron2);
    const f = Math.round(frac * len),
      l = Math.round(Math.max(frac, lag) * len);
    for (let j = 0; j < h; j++)
      for (let i = 0; i < len; i++) {
        const X = x + 1 + i,
          Y = y + 1 + j;
        let c;
        if (i < f) c = cols[Math.min(cols.length - 1, j)];
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
    const key = [W, Math.round(hf * hpLen), Math.round(this.hpLag * hpLen), Math.round((p.st / p.maxSt) * stLen), p.st <= 0, p.flasks, p.maxFlasks].join(',');
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
    this._bar(b, 11, 1, hpLen, 6, hf, this.hpLag, [P.blood4, P.blood3, P.blood3, P.blood2, P.blood2, P.blood1]);
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
    const f = clamp(b0.hp / b0.maxHp, 0, 1);
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

  updateHud(dt) {
    const g = this.g,
      p = g.player;
    this.drawVitals(dt);
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
      if (e.dead || e.boss || !e.obj.visible) continue;
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
        // documentos largos en pantallas pequeñas: el texto se desplaza
        if (s.name === 'note' && dir.y) $('note-text').scrollBy(0, dir.y * 19 * (this.sc.m + 1) * 2);
        if (s.t > 0.35 && (conf || back)) this.close();
        break;
      case 'inv': {
        // en Documentos, «confirmar» lee el documento: con teclado la E es a la
        // vez confirmar y pestaña derecha, y cambiaba de pestaña sin leerlo
        const reading = this.invTab === 1 && conf && Object.keys(NOTES).some((k) => this.g.flags['note:' + k]);
        if (!reading && (inp.pressed('tabL') || inp.pressed('tabR') || (this.invTab === 1 && dir.x))) {
          this.invTab = 1 - this.invTab;
          this.invSel = 0;
          this.renderInv();
          au && au.ui('move');
          break;
        }
        if (this.invTab === 0) {
          const cols = 4;
          const d = dir.x + dir.y * cols;
          if (d) {
            const nn = this.invEntries().length;
            const ns = this.invSel + d;
            if (ns >= 0 && ns < nn) {
              this.invSel = ns;
              this.renderInv();
              au && au.ui('move');
            }
          }
        } else {
          if (dir.y) {
            this.invSel += dir.y;
            this.renderInv();
            au && au.ui('move');
          }
          if (conf) {
            const read = Object.keys(NOTES).filter((k) => this.g.flags['note:' + k]);
            if (read[this.invSel]) this.showNote(NOTES[read[this.invSel]]);
            break;
          }
        }
        if (back || inp.pressed('inventory')) this.close();
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
