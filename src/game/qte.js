// Pulsaciones rápidas (QTE) de las secuencias con la Bestia de Carne.
//
// Un aviso en el centro de la pantalla: la tecla (o el botón del mando) que
// hay que pulsar, dentro de un anillo que se va vaciando, y lo que hace
// («¡Esquiva!», «¡Salta!»...). El tiempo del aviso corre en tiempo real
// aunque el juego vaya a cámara lenta mientras tanto. Dos clases:
//   - una pulsación a tiempo (si se pulsa otro botón de acción, se falla);
//   - machacar: pulsarla una y otra vez hasta llenar el anillo antes de que
//     se acabe el tiempo (forcejear, trepar).
import { GLYPHS } from '../core/input.js';
import { PAL, keyBitmap, keyBlinkHtml } from '../ui/pixel.js';

const $ = (id) => document.getElementById(id);
// botones de acción que cuentan como «otro botón» (fallo)
const ACTIONS = ['light', 'heavy', 'block', 'dodge', 'interact'];
const R = 27; // radio del anillo (píxeles de arte)
const HOLE = (R - 7.5) * 2; // el hueco de dentro, donde va la tecla

export class QTE {
  constructor(game) {
    this.g = game;
    this.cur = null;
    this.el = $('qte');
    this.cv = $('qte-cv');
    this.cv.width = R * 2;
    this.cv.height = R * 2;
    this.ctx = this.cv.getContext('2d');
    this.outT = 0;
    this._key = null;
  }

  get active() {
    return !!this.cur;
  }
  // factor de cámara lenta mientras hay un aviso
  get slow() {
    return this.cur ? this.cur.slow : 1;
  }

  // o: { action, label, window (s), mash (pulsaciones, 0 = una sola), slow,
  //      lenient (no falla por otro botón), onDone(ok) }
  start(o) {
    this.cur = { action: o.action, label: o.label, win: o.window ?? 1.2, mash: o.mash || 0, n: 0, t: 0, slow: o.slow ?? 0.22, lenient: !!o.lenient, onDone: o.onDone, delay: o.delay ?? 0.05 };
    this._key = null;
    this.el.classList.remove('ok', 'fail', 'hidden');
    this.el.classList.toggle('mash', !!o.mash);
    this.render();
    this.el.classList.add('show');
    this.g.audio && this.g.audio.play('qte', null);
  }

  cancel() {
    this.cur = null;
    this.el.classList.remove('show', 'mash');
  }

  // dt en tiempo real
  update(dt) {
    if (this.outT > 0) {
      this.outT -= dt;
      if (this.outT <= 0) this.el.classList.remove('show', 'ok', 'fail', 'mash');
    }
    const q = this.cur;
    if (!q) return;
    const inp = this.g.input;
    q.t += dt;
    if (q.t > q.delay) {
      if (inp.pressed(q.action)) {
        if (q.mash) {
          q.n++;
          this.g.audio && this.g.audio.play('qteTick', null, { k: q.n / q.mash });
          this.el.classList.remove('bump');
          void this.el.offsetWidth;
          this.el.classList.add('bump');
          if (q.n >= q.mash) return this.finish(true);
        } else return this.finish(true);
      } else if (!q.mash && !q.lenient && ACTIONS.some((a) => a !== q.action && inp.pressed(a))) return this.finish(false);
    }
    if (q.t >= q.win + q.delay) return this.finish(false);
    this.render();
  }

  finish(ok) {
    const q = this.cur;
    this.cur = null;
    this.el.classList.add(ok ? 'ok' : 'fail');
    this.outT = 0.4;
    this.g.audio && this.g.audio.play(ok ? 'qteOk' : 'qteFail', null);
    this.drawRing(ok ? 1 : 0, ok ? PAL.gold4 : PAL.blood3);
    if (q && q.onDone) q.onDone(ok);
  }

  render() {
    const q = this.cur;
    if (!q) return;
    const d = this.g.input.device;
    const glyph = GLYPHS[d][q.action] || '?';
    const k = d + ':' + glyph + ':' + q.label;
    if (k !== this._key) {
      this._key = k;
      // la tecla (o el ratón con su botón) parpadeando, como si se pulsara,
      // al doble si cabe en el anillo (el espacio, en corto: la barra)
      const g = glyph === 'Espacio' ? '␣' : glyph;
      const kb = keyBitmap(g, d === 'pad');
      $('qte-key').innerHTML = keyBlinkHtml(g, d === 'pad', kb.w * 2 > HOLE ? 1 : 2);
      $('qte-label').textContent = q.label;
    }
    // el anillo: lo que queda de tiempo (o lo que se lleva machacado)
    const left = 1 - Math.min(1, Math.max(0, q.t - q.delay) / q.win);
    if (q.mash) this.drawRing(q.n / q.mash, PAL.ember3, left);
    else this.drawRing(left, left < 0.3 ? PAL.blood4 : PAL.bone3);
  }

  // Anillo pixelado: arco lleno hasta la fracción f (desde arriba, en el
  // sentido de las agujas del reloj); con t2, un segundo arco fino (tiempo).
  drawRing(f, col, t2 = null) {
    const c = this.ctx;
    c.clearRect(0, 0, R * 2, R * 2);
    const a1 = f * Math.PI * 2;
    for (let y = 0; y < R * 2; y++)
      for (let x = 0; x < R * 2; x++) {
        const dx = x + 0.5 - R,
          dy = y + 0.5 - R;
        const r = Math.hypot(dx, dy);
        if (r > R - 0.5 || r < R - 7.5) continue;
        let a = Math.atan2(dx, -dy);
        if (a < 0) a += Math.PI * 2;
        let fill = null;
        if (r > R - 1.5 || r < R - 6.5) fill = PAL.void;
        else if (a <= a1) fill = r > R - 3 ? col : r > R - 5 ? col : col;
        else fill = PAL.ink2;
        // tiempo (machacar): un hilo por dentro
        if (t2 !== null && r < R - 5.5 && r >= R - 6.5) fill = a <= t2 * Math.PI * 2 ? PAL.bone1 : PAL.void;
        c.fillStyle = fill;
        c.fillRect(x, y, 1, 1);
      }
  }
}
