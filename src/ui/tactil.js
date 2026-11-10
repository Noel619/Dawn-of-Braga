// Los controles táctiles: un mando dibujado en la pantalla (stick, cámara y
// botones) para jugar en el teléfono o en la tableta.
//
// No es un modo de juego aparte: es un mando más, que entra por el mismo
// camino que uno de verdad (core/input.js: input.touch), así que vale para
// todo lo que vale el mando —pelear, nadar, las pulsaciones rápidas de las
// cinemáticas, los menús, la mesa del Desfigurado, el Cerco del Rey, el
// editor de personaje— y los avisos de la pantalla enseñan los mismos
// botones que lleva dibujados.
//  - Jugando: a la izquierda, el stick (sale donde se apoya el pulgar; llevado
//    más allá de su aro, se corre); a la derecha, la cámara (arrastrando; un
//    golpe de lado cambia de objetivo fijado) y los botones; arriba, la pausa,
//    el mapa, el inventario y los cocimientos que se lleven. Tocar el aviso
//    («Abrir», «Hablar», «Golpe de gracia»...) es pulsar su botón.
//  - Con un menú abierto (y en el título, la introducción, el editor de
//    personaje, la mesa del Rey o la vista de cerca de un osario): la cruz,
//    los cuatro botones, los de los hombros y los del centro; lo demás de la
//    pantalla es del menú, que también se puede tocar.
//  - Opciones › Controles táctiles: automático (salen al tocar la pantalla y
//    se van al usar el teclado o un mando de verdad), siempre o nunca.
// En vertical, un aviso para girar el teléfono (y, jugando, la pausa).
import { keyBitmap, arrowBitmap, Bitmap, C, PAL } from './pixel.js';
import { PAD } from '../core/input.js';

// los botones del mando (mapeo estándar)
const A = 0,
  B = 1,
  X = 2,
  Y = 3,
  LB = 4,
  RB = 5,
  LT = 6,
  RT = 7,
  VIEW = 8,
  START = 9,
  L3 = 10,
  R3 = 11,
  UP = 12,
  DOWN = 13,
  LEFT = 14,
  RIGHT = 15;

// Dónde va cada botón: a, la esquina a la que se ancla (r/l: derecha o
// izquierda; b/t: abajo o arriba); x, y, su centro medido desde esa esquina, y
// w, su tamaño, en unidades del botón normal (s); g, su dibujo (el del mando:
// keyBitmap, o una flecha de la cruz); t, lo que hace (debajo, pequeño).
const JUEGO = [
  { i: RB, g: 'RB', t: 'Atacar', a: 'rb', x: 1.22, y: 1.32, w: 1.42 },
  { i: B, g: 'B', t: 'Esquivar', a: 'rb', x: 2.6, y: 0.72, w: 1.06 },
  { i: RT, g: 'RT', t: 'Fuerte', a: 'rb', x: 2.66, y: 1.98, w: 1.0 },
  { i: LB, g: 'LB', t: 'Bloquear', a: 'rb', x: 1.24, y: 2.92, w: 1.06 },
  { i: A, g: 'A', t: 'Usar', a: 'rb', x: 3.92, y: 0.72, w: 0.96 },
  { i: X, g: 'X', t: 'Beber', a: 'rb', x: 4.0, y: 1.92, w: 0.92 },
  { i: R3, g: 'R3', t: 'Fijar', a: 'rb', x: 2.66, y: 3.2, w: 0.86 },
  { i: START, g: 'Start', t: 'Pausa', a: 'rt', x: 0.62, y: 0.6, w: 0.8 },
  { i: VIEW, g: 'View', t: 'Mapa', a: 'rt', x: 1.5, y: 0.6, w: 0.8 },
  { i: Y, g: 'Y', t: 'Objetos', a: 'rt', x: 2.38, y: 0.6, w: 0.8 },
  // (los cocimientos del Desfigurado, cuando se llevan)
  { i: RIGHT, g: '>', t: 'Negro', a: 'rt', x: 3.26, y: 0.6, w: 0.8, item: 'cocimiento_negro' },
  { i: LEFT, g: '<', t: 'Verde', a: 'rt', x: 4.14, y: 0.6, w: 0.8, item: 'cocimiento_verde' },
];
const MENU = [
  { i: UP, g: '^', t: '', a: 'lb', x: 1.72, y: 2.66, w: 0.92 },
  { i: DOWN, g: 'v', t: '', a: 'lb', x: 1.72, y: 0.74, w: 0.92 },
  { i: LEFT, g: '<', t: '', a: 'lb', x: 0.76, y: 1.7, w: 0.92 },
  { i: RIGHT, g: '>', t: '', a: 'lb', x: 2.68, y: 1.7, w: 0.92 },
  { i: A, g: 'A', t: 'Aceptar', a: 'rb', x: 1.72, y: 0.74, w: 0.98 },
  { i: B, g: 'B', t: 'Volver', a: 'rb', x: 0.76, y: 1.7, w: 0.98 },
  { i: X, g: 'X', t: '', a: 'rb', x: 2.68, y: 1.7, w: 0.92 },
  { i: Y, g: 'Y', t: '', a: 'rb', x: 1.72, y: 2.66, w: 0.92 },
  { i: LB, g: 'LB', t: '', a: 'lt', x: 0.62, y: 0.6, w: 0.8 },
  { i: LT, g: 'LT', t: '', a: 'lt', x: 1.5, y: 0.6, w: 0.8 },
  { i: RB, g: 'RB', t: '', a: 'rt', x: 0.62, y: 0.6, w: 0.8 },
  { i: START, g: 'Start', t: '', a: 'rt', x: 1.5, y: 0.6, w: 0.8 },
  { i: VIEW, g: 'View', t: '', a: 'rt', x: 2.38, y: 0.6, w: 0.8 },
];

// el stick: su radio (en s), hasta dónde no cuenta y desde dónde se corre
const STICK_R = 0.95,
  STICK_DEAD = 0.12,
  STICK_RUN = 1.45;
// la cámara: cuánto gira un arrastre (como el ratón, algo más: la pantalla
// es pequeña)
const CAM_K = 1.7;

// Disco de botón en pixel art: cara oscura translúcida, canto claro con brillo
// arriba a la izquierda y sombra abajo a la derecha; pulsado, dorado.
const _discs = new Map();
function discBitmap(d, on) {
  const k = d + (on ? ':on' : '');
  if (_discs.has(k)) return _discs.get(k);
  const b = new Bitmap(d, d);
  const c = (d - 1) / 2,
    r = d / 2 - 0.5;
  for (let y = 0; y < d; y++)
    for (let x = 0; x < d; x++) {
      const dx = x - c,
        dy = y - c,
        q = Math.hypot(dx, dy);
      if (q > r) continue;
      const lit = dx + dy < 0;
      let col;
      if (q > r - 1) col = on ? C(PAL.gold4, 235) : lit ? C(PAL.bone2, 150) : C(PAL.bone1, 95);
      else if (q > r - 2) col = on ? C(PAL.gold2, 200) : C(PAL.ink0, 150);
      else col = on ? C(PAL.gold1, 150) : C(PAL.ink1, 110);
      b.set(x, y, col);
    }
  _discs.set(k, b);
  return b;
}
// El aro del stick: un anillo fino y el centro apenas marcado.
function ringBitmap(d) {
  const k = 'ring' + d;
  if (_discs.has(k)) return _discs.get(k);
  const b = new Bitmap(d, d);
  const c = (d - 1) / 2,
    r = d / 2 - 0.5;
  for (let y = 0; y < d; y++)
    for (let x = 0; x < d; x++) {
      const q = Math.hypot(x - c, y - c);
      if (q > r) continue;
      b.set(x, y, q > r - 1 ? C(PAL.bone2, 120) : q > r - 2 ? C(PAL.ink0, 110) : C(PAL.ink1, 45));
    }
  _discs.set(k, b);
  return b;
}

// El dibujo de un botón: el del mando o una flecha de la cruz.
function glyphBitmap(g) {
  if (g === '<' || g === '>' || g === '^' || g === 'v') return arrowBitmap(1, PAL.bone3);
  return keyBitmap(g, true);
}
const ROT = { '<': 'scaleX(-1)', '>': 'none', '^': 'rotate(-90deg)', v: 'rotate(90deg)' };

export class Tactil {
  constructor(game) {
    this.g = game;
    const inp = (this.inp = game.input);
    // lo que lee core/input.js
    this.st = { on: false, down: new Uint8Array(17), tap: new Uint8Array(17), ls: null };
    inp.touch = this.st;
    inp.onRealPad = () => this.wake(false);
    // ¿un teléfono o una tableta (el dedo es lo principal)?
    this.movil = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    // (en automático: salen al tocar la pantalla; en el teléfono, desde el
    // principio)
    this.activo = this.movil;
    this.shown = false;
    this.layout = null;
    this.touches = new Map();
    this.stick = null;
    this.cam = null;
    this.knobRun = false;
    this._build();
    this._layoutAll();
    addEventListener('resize', () => this._layoutAll());
    // tocar la pantalla: a la vista, y (dentro del gesto, como exige iOS) el
    // sonido; en el título, «pulsa cualquier botón»
    const touched = () => {
      inp.touchT = performance.now();
      if (!this.activo) this.wake(true);
    };
    document.addEventListener('touchstart', (e) => {
      touched();
      if (this.g.state === 'title') inp.anyPressed = true;
    }, { capture: true, passive: true });
    document.addEventListener('touchend', () => {
      inp.touchT = performance.now();
      this.g.audio.init();
    }, { capture: true, passive: true });
    // el teclado de verdad (no el de la pantalla, al escribir un nombre)
    addEventListener('keydown', (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (performance.now() - inp.touchT > 900) this.wake(false);
    });
    // sin la página delante, nada pulsado
    addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => document.hidden && this.releaseAll());
    if (this.movil) document.documentElement.classList.add('tactil-movil');
  }

  get modo() {
    const m = this.g.settings.tactil;
    return m === 'si' || m === 'no' ? m : 'auto';
  }
  get wanted() {
    const m = this.modo;
    return m === 'si' || (m === 'auto' && this.activo);
  }
  // En automático: a la vista (un toque) o fuera (el teclado o un mando).
  wake(on) {
    if (this.activo === on) return;
    this.activo = on;
    if (on) this._titleTexts(true);
  }

  // ------------------------------------------------------------ montaje
  _build() {
    const root = (this.root = document.createElement('div'));
    root.id = 'tactil';
    root.className = 'off';
    // (la cámara, toda la pantalla por detrás; el stick, la parte de abajo a
    // la izquierda)
    this.zCam = this._div('zona cam', root);
    this.zStick = this._div('zona stick', root);
    // el stick: su aro y su pomo (y, sin tocar, dónde se pone)
    this.ring = this._img('ring', root);
    this.knob = this._img('knob', root);
    this.hintRing = this._img('ring hint', root);
    this.btns = [];
    for (const [lay, list] of [
      ['juego', JUEGO],
      ['menu', MENU],
    ])
      for (const d of list) {
        const el = this._div('bt ' + lay, root);
        el.dataset.tb = d.i;
        const gl = document.createElement('img');
        gl.className = 'gl';
        gl.alt = '';
        gl.draggable = false;
        const bm = glyphBitmap(d.g);
        gl.src = bm.url();
        gl.style.transform = ROT[d.g] || 'none';
        el.appendChild(gl);
        if (d.t) {
          const lb = document.createElement('span');
          lb.className = 'lb';
          lb.textContent = d.t;
          el.appendChild(lb);
        }
        this.btns.push({ d, el, gl, bm, lay });
      }
    // (para leer las zonas seguras: la muesca, la barra de inicio)
    this.probe = this._div('probe', root);
    for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) root.addEventListener(ev, (e) => this._on(ev, e), { passive: false });
    document.body.appendChild(root);
    // en vertical: girar el teléfono
    const gi = (this.girar = document.createElement('section'));
    gi.id = 'girar';
    gi.innerHTML = `<div class="f-bastL">Gira el teléfono</div><div class="f-small">Dawn of Braga se juega en horizontal</div>`;
    document.body.appendChild(gi);
  }
  _div(cls, parent) {
    const d = document.createElement('div');
    d.className = cls;
    parent.appendChild(d);
    return d;
  }
  _img(cls, parent) {
    const im = document.createElement('img');
    im.className = cls;
    im.alt = '';
    im.draggable = false;
    parent.appendChild(im);
    return im;
  }

  // Tamaños y sitios, según la pantalla (y sus zonas seguras).
  _layoutAll() {
    const W = innerWidth,
      H = innerHeight;
    // el botón normal: un octavo de alto de la pantalla, entre 40 y 64 px
    const s = (this.s = Math.max(40, Math.min(64, Math.round(H * 0.125))));
    const cs = getComputedStyle(this.probe);
    const inL = parseFloat(cs.paddingLeft) || 0,
      inR = parseFloat(cs.paddingRight) || 0,
      inT = parseFloat(cs.paddingTop) || 0,
      inB = parseFloat(cs.paddingBottom) || 0;
    this.ins = { l: inL, r: inR, t: inT, b: inB };
    // (el pixel art de los discos, a 2 px por píxel)
    const k = 2;
    for (const o of this.btns) {
      const { d, el, gl, bm } = o;
      const w = Math.round((d.w * s) / k) * k;
      const cx = d.a[0] === 'r' ? W - inR - d.x * s : inL + d.x * s;
      const cy = d.a[1] === 'b' ? H - inB - d.y * s : inT + d.y * s;
      o.cx = cx;
      o.cy = cy;
      o.r = w / 2;
      Object.assign(el.style, { left: Math.round(cx - w / 2) + 'px', top: Math.round(cy - w / 2) + 'px', width: w + 'px', height: w + 'px' });
      el.style.backgroundImage = `url(${discBitmap(w / k, false).url()})`;
      o.bgOn = `url(${discBitmap(w / k, true).url()})`;
      o.bgOff = el.style.backgroundImage;
      // el dibujo del botón, a un múltiplo entero de su tamaño (nítido), que
      // ocupe algo más de la mitad del disco
      const gk = Math.max(1, Math.round((w * 0.56) / Math.max(bm.w, bm.h)));
      gl.style.width = bm.w * gk + 'px';
      gl.style.height = bm.h * gk + 'px';
      o.el.classList.toggle('sinlb', !d.t || w < 40);
    }
    // el stick
    const rr = Math.round((STICK_R * s * 2) / k) * k;
    for (const im of [this.ring, this.hintRing]) {
      im.src = ringBitmap(rr / k).url();
      im.style.width = im.style.height = rr + 'px';
    }
    const kn = Math.round((0.9 * s) / k) * k;
    this.knobOff = discBitmap(kn / k, false).url();
    this.knobOn = discBitmap(kn / k, true).url();
    this.knob.src = this.knobRun ? this.knobOn : this.knobOff;
    this.knob.style.width = this.knob.style.height = kn + 'px';
    this.hintX = inL + 1.95 * s;
    this.hintY = H - inB - 1.95 * s;
    this._place(this.hintRing, this.hintX, this.hintY);
    // las zonas: la del stick, la mitad izquierda menos la franja de arriba
    Object.assign(this.zStick.style, { left: '0px', top: Math.round(H * 0.22) + 'px', width: Math.round(inL + (W - inL - inR) * 0.45) + 'px', height: Math.round(H * 0.78) + 'px' });
  }
  // (el aro y el pomo están en la esquina de arriba: se llevan con transform)
  _place(el, x, y) {
    const w = parseFloat(el.style.width) || 0;
    el.style.transform = `translate(${Math.round(x - w / 2)}px, ${Math.round(y - w / 2)}px)`;
  }

  // ------------------------------------------------------------ cada fotograma
  update() {
    const g = this.g;
    const show = this.wanted;
    if (show !== this.shown) {
      this.shown = show;
      this.root.classList.toggle('off', !show);
      document.documentElement.classList.toggle('tactil', show);
      if (!show) this.releaseAll();
      this._titleTexts(show);
    }
    this.st.on = show;
    if (!show) return;
    const L = this._layoutFor();
    if (L !== this.layout) {
      this.layout = L;
      this.root.dataset.l = L;
      this.releaseAll();
    }
    // los cocimientos: sólo los que se llevan (y sólo se toca la página si
    // cambia)
    if (L === 'juego') {
      const inv = g.inventory;
      for (const o of this.btns) {
        if (!o.d.item) continue;
        const gone = !(inv && inv.has(o.d.item));
        if (gone !== o.gone) {
          o.gone = gone;
          o.el.classList.toggle('gone', gone);
        }
      }
    }
    // en vertical, jugando en el teléfono: la pausa (el aviso de girar lo pone
    // la hoja de estilos)
    if (this.movil && innerHeight > innerWidth && g.state === 'play' && !g.ui.modal && !g.cutscene) g.openPause();
  }
  _layoutFor() {
    const g = this.g;
    if (g.state === 'title' || g.state === 'creador' || g.state === 'intro' || g.state === 'ending' || g.ui.modal) return 'menu';
    if ((g.rey && g.rey.seat) || (g.ossuaries && g.ossuaries.view)) return 'menu';
    return 'juego';
  }
  // El título: tocar en vez de pulsar.
  _titleTexts(touch) {
    const pr = document.getElementById('press'),
      ft = document.querySelector('#title .foot');
    if (!this._t0 && pr && ft) this._t0 = [pr.textContent, ft.textContent];
    if (!this._t0) return;
    pr.textContent = touch ? 'Toca la pantalla' : this._t0[0];
    ft.textContent = touch ? 'Pantalla táctil · Mando · Teclado y ratón' : this._t0[1];
  }

  // ------------------------------------------------------------ toques
  _on(type, e) {
    const now = performance.now();
    this.inp.touchT = now;
    let mine = false;
    for (const t of e.changedTouches) {
      if (type === 'touchstart') {
        if (this._start(t)) mine = true;
      } else if (this.touches.has(t.identifier)) {
        mine = true;
        if (type === 'touchmove') this._move(t);
        else this._end(t);
      }
    }
    // (lo suyo no es un clic, ni un zum, ni un desplazamiento)
    if (mine && e.cancelable) e.preventDefault();
  }
  _start(t) {
    const el = t.target && t.target.closest ? t.target.closest('[data-tb], .zona') : null;
    if (!el || !this.root.contains(el)) return false;
    const id = t.identifier;
    this.inp.device = 'pad';
    if (el.dataset.tb !== undefined) {
      const i = +el.dataset.tb;
      const o = this.btns.find((q) => q.el === el);
      this._press(i, o);
      this.touches.set(id, { kind: 'btn', i, o });
      return true;
    }
    if (el === this.zStick && !this.stick) {
      // (el aro, entero dentro de la pantalla)
      const R = STICK_R * this.s;
      const x = Math.max(this.ins.l + R, t.clientX),
        y = Math.min(innerHeight - this.ins.b - R, Math.max(R, t.clientY));
      this.stick = { id, ox: x, oy: y };
      this.touches.set(id, { kind: 'stick' });
      this.root.classList.add('stk');
      this._place(this.ring, x, y);
      this._place(this.knob, x, y);
      this.st.ls = { x: 0, y: 0 };
      this._move(t);
      return true;
    }
    // la cámara (o, si se toca el aviso de «Abrir», «Hablar»..., su botón)
    const pa = this._promptAt(t.clientX, t.clientY);
    if (pa !== null) {
      this._press(pa, null);
      this.touches.set(id, { kind: 'btn', i: pa, o: null });
      return true;
    }
    if (!this.cam) {
      this.cam = { id, x: t.clientX, y: t.clientY };
      this.touches.set(id, { kind: 'cam' });
      return true;
    }
    // (un segundo dedo en la cámara: nada, pero tampoco es del menú)
    this.touches.set(id, { kind: 'none' });
    return true;
  }
  _move(t) {
    const T = this.touches.get(t.identifier);
    if (!T) return;
    if (T.kind === 'stick' && this.stick) {
      const S = this.stick,
        R = STICK_R * this.s;
      const dx = t.clientX - S.ox,
        dy = t.clientY - S.oy,
        d = Math.hypot(dx, dy);
      const m = Math.min(1, d / R);
      const ux = d > 0 ? dx / d : 0,
        uy = d > 0 ? dy / d : 0;
      const k = m < STICK_DEAD ? 0 : (m - STICK_DEAD) / (1 - STICK_DEAD);
      this.st.ls.x = ux * k;
      this.st.ls.y = uy * k;
      // (llevado más allá de su aro: correr, como el L3; el pomo, dorado)
      const run = d > STICK_RUN * R;
      this.st.down[L3] = run ? 1 : 0;
      if (run !== this.knobRun) {
        this.knobRun = run;
        this.knob.src = run ? this.knobOn : this.knobOff;
      }
      this._place(this.knob, S.ox + ux * Math.min(d, R), S.oy + uy * Math.min(d, R));
    } else if (T.kind === 'cam' && this.cam) {
      const C0 = this.cam;
      this.inp.mdx += (t.clientX - C0.x) * CAM_K;
      this.inp.mdy += (t.clientY - C0.y) * CAM_K;
      C0.x = t.clientX;
      C0.y = t.clientY;
    }
  }
  _end(t) {
    const T = this.touches.get(t.identifier);
    this.touches.delete(t.identifier);
    if (!T) return;
    if (T.kind === 'btn') this._release(T.i, T.o);
    else if (T.kind === 'stick') {
      this.stick = null;
      this.st.ls = null;
      this.st.down[L3] = 0;
      this.root.classList.remove('stk');
      this.knobRun = false;
      this.knob.src = this.knobOff;
    } else if (T.kind === 'cam') this.cam = null;
  }
  _press(i, o) {
    this.st.down[i] = 1;
    this.st.tap[i] = 1;
    if (o) {
      o.el.classList.add('on');
      o.el.style.backgroundImage = o.bgOn;
    }
  }
  _release(i, o) {
    // (si otro dedo sigue en el mismo botón, sigue pulsado)
    for (const T of this.touches.values()) if (T.kind === 'btn' && T.i === i) return;
    this.st.down[i] = 0;
    if (o) {
      o.el.classList.remove('on');
      o.el.style.backgroundImage = o.bgOff;
    }
  }
  releaseAll() {
    this.touches.clear();
    this.stick = null;
    this.cam = null;
    this.st.ls = null;
    this.st.down.fill(0);
    this.root.classList.remove('stk');
    this.knobRun = false;
    if (this.knobOff) this.knob.src = this.knobOff;
    for (const o of this.btns) {
      o.el.classList.remove('on');
      o.el.style.backgroundImage = o.bgOff;
    }
  }

  // ¿Se ha tocado el aviso de interactuar? Su botón (el que enseña).
  _promptAt(x, y) {
    const pr = document.getElementById('prompt');
    if (!pr || !pr.classList.contains('show')) return null;
    const r = pr.getBoundingClientRect();
    const m = 8;
    if (x < r.left - m || x > r.right + m || y < r.top - m || y > r.bottom + m) return null;
    const a = this.g.ui._promptAction || 'interact';
    const map = PAD[a];
    return map ? map[0] : A;
  }
}
