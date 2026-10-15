// Bocadillos de diálogo sobre la cabeza de quien habla (Henrique, Leonor):
// un globo de pergamino oscuro con su piquito, el nombre arriba y la frase
// que se va escribiendo letra a letra. Siguen a la cabeza por la pantalla; si
// quien habla queda fuera de cuadro o muy lejos, el globo baja al pie de la
// pantalla, como un subtítulo.
//
//   speech.say(who, texto, { dur })   una frase (sustituye a la que hubiera)
//   speech.queue(who, [frases])       varias seguidas; .busy(who) mientras
//   speech.skip(who)                  la frase siguiente (o termina la actual)
// who = { id, name, head(out) -> Vector3 }.
import * as THREE from 'three';
import { Bitmap, PAL as P, attachBackdrop, bayer } from '../ui/pixel.js';

// letras por segundo al escribirse
const CPS = 40;

const CSS = `
#speech { position: absolute; inset: 0; pointer-events: none; }
#speech .bub { position: absolute; transform: translate(-50%, -100%); max-width: min(36ch, 70vw); padding: calc(var(--u) * 4) calc(var(--u) * 7) calc(var(--u) * 7); color: var(--bone-hi); text-shadow: var(--sh); text-align: center; opacity: 0; transition: opacity 0.2s steps(3); }
#speech .bub.on { opacity: 1; }
#speech .bub.sub { transform: translate(-50%, 0); }
#speech .bub > :not(canvas.pxbg) { position: relative; z-index: 1; }
#speech .who { display: block; font-family: 'Silkscreen', monospace; font-size: var(--fs-small); line-height: calc(11px * var(--un)); letter-spacing: calc(1px * var(--un)); text-transform: uppercase; color: #f5d88a; margin-bottom: calc(var(--u) * 1); }
#speech .who.leonor { color: #d8d070; }
#speech .txt { font-family: 'Handjet', monospace; font-size: var(--fs-hand); line-height: calc(21px * var(--m)); white-space: pre-wrap; }
#speech .bub canvas.pxbg { position: absolute; left: 0; top: 0; z-index: 0; }
`;

// El globo: pergamino oscuro con el borde dorado gastado y un piquito abajo
// en el centro (los subtítulos, sin piquito).
function bubbleBitmap(w, h, tail = true) {
  const b = new Bitmap(w, h);
  const th = tail ? 5 : 0;
  const H = h - th;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < w; x++) {
      // esquinas redondeadas (dos píxeles)
      const cx = Math.min(x, w - 1 - x),
        cy = Math.min(y, H - 1 - y);
      if (cx + cy < 2) continue;
      const edge = cx === 0 || cy === 0 || cx + cy === 2;
      const edge2 = cx === 1 || cy === 1;
      let c;
      if (edge) c = y < H / 2 ? P.gold2 : P.gold1;
      else if (edge2) c = P.ink0;
      else c = (x + y) % 2 && bayer(x, y) > 0.7 ? P.ink2 : y < 3 ? P.ink3 : P.ink1;
      b.set(x, y, c);
    }
  if (tail) {
    const m = Math.floor(w / 2);
    for (let k = 0; k < th + 1; k++) {
      const half = Math.max(0, 4 - k);
      for (let x = m - half; x <= m + half; x++) b.set(x, H - 1 + k, x === m - half || x === m + half ? P.gold1 : P.ink1);
    }
    b.set(m, H - 1 + th, P.gold1);
  }
  return b;
}

export class Speech {
  constructor(game) {
    this.g = game;
    this.list = new Map(); // id -> { who, el, txt, line, t, dur, shown, queue }
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    this.root = document.createElement('div');
    this.root.id = 'speech';
    document.getElementById('hud').appendChild(this.root);
    this._v = new THREE.Vector3();
  }

  _el(who) {
    let b = this.list.get(who.id);
    if (b) return b;
    const el = document.createElement('div');
    el.className = 'bub';
    el.innerHTML = `<b class="who ${who.cls || ''}"></b><span class="txt"></span>`;
    this.root.appendChild(el);
    b = { who, el, nameEl: el.firstChild, txt: el.lastChild, line: '', t: 0, dur: 0, shown: -1, queue: [], sub: null };
    b.nameEl.textContent = who.name;
    this.list.set(who.id, b);
    this._backdrop(b, false);
    return b;
  }
  _backdrop(b, sub) {
    if (b.sub === sub) return;
    b.sub = sub;
    b.el.classList.toggle('sub', sub);
    b.el.querySelector(':scope > canvas.pxbg')?.remove();
    b.el._pxRO && b.el._pxRO.disconnect();
    attachBackdrop(b.el, (w, h) => bubbleBitmap(w, h, !sub), () => this.g.ui.sc.u);
  }

  // Lo que se queda la frase entera a la vista, ya escrita (s).
  static dur(text) {
    return Math.min(7, Math.max(1.6, 1.2 + text.length * 0.028));
  }

  say(who, text, o = {}) {
    const b = this._el(who);
    b.queue.length = 0;
    this._start(b, text, o.dur);
  }
  queue(who, lines) {
    const b = this._el(who);
    b.queue = lines.slice();
    this._start(b, b.queue.shift());
  }
  _start(b, text, dur) {
    b.line = text;
    b.t = 0;
    b.dur = dur ?? Speech.dur(text);
    b.shown = -1;
    b.txt.textContent = '';
    b.el.classList.add('on');
    const g = this.g;
    if (g.audio && b.who.voice !== false) {
      const P = b.who.head(this._v);
      g.audio.play(b.who.voice || 'npcTalk', { x: P.x, y: P.y, z: P.z }, { len: Math.min(3.5, text.length / CPS + 0.3), k: b.who.pitch ?? 1 });
    }
  }
  busy(who) {
    const b = this.list.get(who.id);
    return !!b && (b.line !== '' || b.queue.length > 0);
  }
  // La frase siguiente: si la actual aún se está escribiendo, se completa.
  skip(who) {
    const b = this.list.get(who.id);
    if (!b || !b.line) return;
    const full = b.t * CPS >= b.line.length;
    if (!full) b.t = b.line.length / CPS;
    else this._next(b);
  }
  _next(b) {
    if (b.queue.length) this._start(b, b.queue.shift());
    else this.hush(b.who);
  }
  hush(who) {
    const b = this.list.get(who.id);
    if (!b) return;
    b.line = '';
    b.queue.length = 0;
    b.el.classList.remove('on');
  }
  clear() {
    for (const b of this.list.values()) this.hush(b.who);
  }

  update(dt) {
    const g = this.g;
    const cam = g.camera;
    const W = innerWidth,
      H = innerHeight;
    // (en pausa o con un menú abierto, quietos y escondidos)
    const show = (g.state === 'play' || g.state === 'paused') && !g.ui.modal;
    for (const b of this.list.values()) {
      if (!b.line) continue;
      b.el.style.visibility = show ? '' : 'hidden';
      if (!show) continue;
      b.t += dt;
      // la frase se escribe a 40 letras por segundo
      const n = Math.min(b.line.length, Math.floor(b.t * CPS));
      if (n !== b.shown) {
        b.shown = n;
        b.txt.textContent = b.line.slice(0, n);
      }
      if (b.t >= b.dur + b.line.length / CPS) {
        this._next(b);
        if (!b.line) continue;
      }
      // sobre la cabeza, o al pie de la pantalla si no se ve (fuera de
      // cuadro, muy lejos o detrás de un muro); demasiado lejos para oírlo
      // (otra calle, otro piso), nada
      const p = b.who.head(this._v);
      const pp = g.player.pos;
      const far = Math.hypot(p.x - pp.x, (p.y - pp.y) * 1.6, p.z - pp.z) > (b.who.hearR ?? 34);
      b.el.style.visibility = far ? 'hidden' : '';
      if (far) continue;
      const d = Math.hypot(p.x - cam.position.x, p.z - cam.position.z);
      b.losT = (b.losT ?? 0) - dt;
      if (b.losT <= 0) {
        b.losT = 0.25;
        const c = cam.position;
        b.los = g.world.col.lineOfSight(c.x, c.y, c.z, p.x, p.y - 0.25, p.z);
      }
      const v = p.project(cam);
      const onScreen = v.z < 1 && Math.abs(v.x) < 0.92 && v.y < 0.92 && v.y > -0.85 && d < 26 && b.los !== false;
      const sub = !onScreen || !!b.who.subtitle;
      this._backdrop(b, sub);
      if (sub) {
        b.el.style.left = Math.round(W / 2) + 'px';
        b.el.style.top = Math.round(H * 0.66) + 'px';
      } else {
        b.el.style.left = Math.round(((v.x + 1) / 2) * W) + 'px';
        b.el.style.top = Math.round(((1 - v.y) / 2) * H) + 'px';
      }
    }
  }
}
