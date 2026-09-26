// Interfaz: HUD, menús navegables con teclado/mando/ratón, documentos,
// inventario, mapa, opciones, muerte e historia.
import * as THREE from 'three';
import { GLYPHS } from '../core/input.js';
import { ITEMS, NOTES, AREA_NAMES } from './story.js';
import { icon } from './icons.js';
import { formatTime, clamp } from '../core/util.js';

const $ = (id) => document.getElementById(id);
const PAD_CLASS = { A: 'a', B: 'b', X: 'x', Y: 'y' };

export class UI {
  constructor(game) {
    this.g = game;
    this.stack = [];
    this.toastsEl = $('toasts');
    this.areaT = 0;
    $('flask-icon').src = icon('flask');
    this.ebars = [];
    for (let i = 0; i < 6; i++) {
      const d = document.createElement('div');
      d.className = 'eb hidden';
      d.innerHTML = '<i></i>';
      $('ebars').appendChild(d);
      this.ebars.push(d);
    }
    this._v = new THREE.Vector3();
    this.invTab = 0;
    this.invSel = 0;
    // pestañas con ratón
    document.querySelectorAll('#inv .tab').forEach((t) =>
      t.addEventListener('click', () => {
        this.invTab = +t.dataset.t;
        this.invSel = 0;
        this.renderInv();
      })
    );
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
    const cls = d === 'pad' && PAD_CLASS[k] ? `key pad ${PAD_CLASS[k]}` : 'key';
    return `<b class="${cls}">${k}</b>`;
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
    const s = this.open(name, { entries, ...opts });
    return s;
  }
  renderMenu(s) {
    const list = s.name === 'title' ? $('title-menu') : $('pause-menu');
    list.classList.remove('hidden');
    list.innerHTML = '';
    s.data.entries.forEach((e, i) => {
      const b = document.createElement('button');
      b.className = 'it' + (i === s.sel ? ' sel' : '') + (e.off ? ' off' : '');
      b.textContent = e.label;
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
    const pct = (v) => Math.round(v * 100) + '%';
    const onoff = (v) => (v ? 'Sí' : 'No');
    const RES = [240, 300, 360, 480];
    return [
      { label: 'Volumen de música', v: () => pct(S.music), set: (d) => (S.music = clamp(Math.round((S.music + d * 0.1) * 10) / 10, 0, 1)) },
      { label: 'Volumen de efectos', v: () => pct(S.sfx), set: (d) => (S.sfx = clamp(Math.round((S.sfx + d * 0.1) * 10) / 10, 0, 1)) },
      { label: 'Sensibilidad de cámara', v: () => S.sens.toFixed(1), set: (d) => (S.sens = clamp(Math.round((S.sens + d * 0.1) * 10) / 10, 0.3, 3)) },
      { label: 'Invertir eje vertical', v: () => onoff(S.invertY), set: () => (S.invertY = !S.invertY) },
      { label: 'Brillo', v: () => (S.brightness >= 0 ? '+' : '') + Math.round(S.brightness * 100), set: (d) => (S.brightness = clamp(Math.round((S.brightness + d * 0.02) * 100) / 100, -0.1, 0.2)) },
      { label: 'Resolución interna', v: () => S.res + 'p', set: (d) => (S.res = RES[(RES.indexOf(S.res) + d + RES.length) % RES.length] || 300) },
      { label: 'Temblor de vértices (PS1)', v: () => onoff(S.snap), set: () => (S.snap = !S.snap) },
      { label: 'Deformación de texturas', v: () => pct(S.affine), set: (d) => (S.affine = clamp(Math.round((S.affine + d * 0.1) * 10) / 10, 0, 1)) },
      { label: 'Filtro CRT', v: () => pct(S.crt), set: (d) => (S.crt = clamp(Math.round((S.crt + d * 0.1) * 10) / 10, 0, 1)) },
      { label: 'Mostrar FPS', v: () => onoff(S.fps), set: () => (S.fps = !S.fps) },
    ];
  }
  renderOptions(s) {
    const list = $('opt-list');
    list.innerHTML = '';
    const ents = this.optionEntries();
    s.data.entries = ents;
    ents.forEach((e, i) => {
      const r = document.createElement('div');
      r.className = 'opt' + (i === s.sel ? ' sel' : '');
      r.innerHTML = `<span>${e.label}</span><span class="v">‹ ${e.v()} ›</span>`;
      r.addEventListener('mouseenter', () => {
        s.sel = i;
        this.renderOptions(s);
      });
      r.addEventListener('click', (ev) => {
        const rect = r.getBoundingClientRect();
        e.set(ev.clientX < rect.left + rect.width * 0.75 ? -1 : 1);
        this.g.applySettings();
        this.renderOptions(s);
      });
      list.appendChild(r);
    });
    $('opt-hint').innerHTML = `<span>${this.keyHtml('back')} Volver</span><span>◄ ► Cambiar</span>`;
  }

  renderControls() {
    const rows = [
      ['Moverse', 'W A S D', 'Stick izq.'],
      ['Cámara', 'Ratón', 'Stick der.'],
      ['Ataque ligero', 'Clic izq.', 'RB'],
      ['Ataque pesado', 'F', 'RT'],
      ['Bloquear', 'Clic der.', 'LB'],
      ['Esquivar / correr (mantener)', 'Espacio', 'B'],
      ['Correr', 'Mayús', 'L3'],
      ['Fijar objetivo', 'Q / Rueda', 'R3'],
      ['Cambiar objetivo', 'Mover ratón', 'Stick der.'],
      ['Curarse (ampolla)', 'R', 'X'],
      ['Interactuar', 'E', 'A'],
      ['Inventario', 'Tab / I', 'Y'],
      ['Mapa', 'M', 'View'],
      ['Pausa', 'Esc', 'Start'],
    ];
    $('ctl-list').innerHTML = `<span class="h">Acción</span><span class="h">Teclado</span><span class="h">Mando</span>` + rows.map((r) => `<span>${r[0]}</span><span>${r[1]}</span><span>${r[2]}</span>`).join('');
    $('ctl-hint').innerHTML = `<span>${this.keyHtml('back')} Volver</span>`;
  }

  // ------------------------------------------------------------ inventario
  invEntries() {
    const g = this.g;
    const out = [];
    const inv = g.inventory;
    if (inv.has('espada')) out.push({ id: 'espada' });
    if (inv.has('escudo')) out.push({ id: 'escudo' });
    out.push({ id: '_flask', n: g.player.flasks + '/' + g.player.maxFlasks });
    for (const k of ['palanca', 'llave_claustro', 'manivela', 'anillo']) if (inv.has(k)) out.push({ id: k });
    const c = (k) => inv.count(k);
    if (c('relicario')) out.push({ id: 'relicario', n: '×' + c('relicario') });
    if (c('ampolla')) out.push({ id: 'ampolla', n: '×' + c('ampolla') });
    if (c('piedra')) out.push({ id: 'piedra' });
    return out;
  }
  renderInv() {
    const g = this.g;
    document.querySelectorAll('#inv .tab').forEach((t) => t.classList.toggle('on', +t.dataset.t === this.invTab));
    const grid = $('inv-grid'),
      docs = $('inv-docs'),
      det = $('inv-detail');
    grid.classList.toggle('hidden', this.invTab !== 0);
    docs.classList.toggle('hidden', this.invTab !== 1);
    const p = g.player;
    const stats = `<div class="stats"><span>Vitalidad</span><b>${Math.ceil(p.hp)} / ${p.maxHp}</b><span>Ampollas</span><b>${p.flasks} / ${p.maxFlasks}</b><span>Daño</span><b>${Math.round(p.dmgMul * 100)}%</b><span>Muertes</span><b>${g.deaths}</b><span>Tiempo</span><b>${formatTime(g.playTime)}</b></div>`;
    if (this.invTab === 0) {
      const ents = this.invEntries();
      this.invSel = clamp(this.invSel, 0, ents.length - 1);
      grid.innerHTML = '';
      ents.forEach((e, i) => {
        const d = document.createElement('div');
        d.className = 'slot' + (i === this.invSel ? ' sel' : '');
        const ic = e.id === '_flask' ? 'flask' : ITEMS[e.id].icon;
        d.innerHTML = `<img src="${icon(ic)}" alt="">${e.n ? `<span class="n">${e.n}</span>` : ''}`;
        d.addEventListener('mouseenter', () => {
          this.invSel = i;
          this.renderInv();
        });
        grid.appendChild(d);
      });
      const e = ents[this.invSel];
      if (e) {
        const it = e.id === '_flask' ? { name: 'Ampolla de Santa Bárbara', desc: 'Lágrimas de la santa en un frasco de vidrio. Restauran parte de tu vitalidad. Se rellenan al descansar en un altar.' } : ITEMS[e.id];
        det.innerHTML = `<h3>${it.name}</h3><p>${it.desc}</p>${stats}`;
      } else det.innerHTML = stats;
      $('inv-hint').innerHTML = `<span>${this.keyHtml('tabL')}${this.keyHtml('tabR')} Pestañas</span><span>${this.keyHtml('back')} Cerrar</span>`;
    } else {
      const read = Object.keys(NOTES).filter((k) => g.flags['note:' + k]);
      this.invSel = clamp(this.invSel, 0, Math.max(0, read.length - 1));
      docs.innerHTML = read.length ? '' : '<div class="doc">Aún no has encontrado documentos.</div>';
      read.forEach((k, i) => {
        const d = document.createElement('div');
        d.className = 'doc' + (i === this.invSel ? ' sel' : '');
        d.textContent = NOTES[k].title;
        d.addEventListener('mouseenter', () => {
          this.invSel = i;
          this.renderInv();
        });
        d.addEventListener('click', () => this.showNote(NOTES[k]));
        docs.appendChild(d);
      });
      const k = read[this.invSel];
      det.innerHTML = k ? `<h3>${NOTES[k].title}</h3><p style="white-space:pre-wrap">${NOTES[k].text}</p>` : stats;
      $('inv-hint').innerHTML = `<span>${this.keyHtml('tabL')}${this.keyHtml('tabR')} Pestañas</span><span>${this.keyHtml('confirm')} Leer</span><span>${this.keyHtml('back')} Cerrar</span>`;
    }
  }

  showNote(note) {
    $('note-title').textContent = note.title;
    $('note-text').textContent = note.text;
    this.open('note');
  }
  showItem(id) {
    const it = ITEMS[id];
    $('item-icon').src = icon(it.icon);
    $('item-name').textContent = it.name;
    $('item-desc').textContent = it.desc;
    this.open('item');
  }

  // ------------------------------------------------------------ mapa
  renderMap() {
    const g = this.g;
    const cvs = $('map-canvas');
    const c = cvs.getContext('2d');
    const W = cvs.width,
      H = cvs.height;
    c.fillStyle = '#16120e';
    c.fillRect(0, 0, W, H);
    const crypt = g.player.pos.y < -3;
    $('map-eyebrow').textContent = crypt ? 'Mapa · Bajo la Sé' : 'Mapa · Braga intramuros';
    const rects = g.level.L.map.filter((m) => (m.level === 'crypt') === crypt && (crypt || m.id !== 'river' || g.visited.has('river')));
    let x0 = 1e9,
      z0 = 1e9,
      x1 = -1e9,
      z1 = -1e9;
    for (const m of rects) {
      x0 = Math.min(x0, m.r[0]);
      z0 = Math.min(z0, m.r[1]);
      x1 = Math.max(x1, m.r[2]);
      z1 = Math.max(z1, m.r[3]);
    }
    const pad = 30;
    const sc = Math.min((W - pad * 2) / (x1 - x0), (H - pad * 2) / (z1 - z0));
    const ox = (W - (x1 - x0) * sc) / 2 - x0 * sc,
      oz = (H - (z1 - z0) * sc) / 2 - z0 * sc;
    const X = (x) => x * sc + ox,
      Z = (z) => z * sc + oz;
    // textura de pergamino
    for (let i = 0; i < 900; i++) {
      c.fillStyle = `rgba(${60 + Math.random() * 30},${48 + Math.random() * 20},30,0.08)`;
      c.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
    for (const m of rects) {
      const vis = g.visited.has(m.id);
      c.fillStyle = vis ? '#4a4034' : 'rgba(74,64,52,0.18)';
      c.strokeStyle = vis ? '#8a7a5c' : 'rgba(138,122,92,0.25)';
      c.lineWidth = 1.5;
      const [a, b, cc, d] = m.r;
      c.fillRect(X(a), Z(b), (cc - a) * sc, (d - b) * sc);
      c.strokeRect(X(a), Z(b), (cc - a) * sc, (d - b) * sc);
      if (m.cut) {
        c.fillStyle = '#16120e';
        c.fillRect(X(m.cut[0]), Z(m.cut[1]), (m.cut[2] - m.cut[0]) * sc, (m.cut[3] - m.cut[1]) * sc);
      }
    }
    // etiquetas
    c.font = '15px "IM Fell English SC", serif';
    c.textAlign = 'center';
    const done = new Set();
    for (const m of rects) {
      if (done.has(m.id) || !g.visited.has(m.id)) continue;
      done.add(m.id);
      const cx = X((m.r[0] + m.r[2]) / 2),
        cz = Z((m.r[1] + m.r[3]) / 2);
      c.fillStyle = 'rgba(0,0,0,0.6)';
      c.fillText(AREA_NAMES[m.id] || m.id, cx + 1, cz + 5);
      c.fillStyle = '#e8d8b0';
      c.fillText(AREA_NAMES[m.id] || m.id, cx, cz + 4);
    }
    // puertas, altares y objetos en zonas visitadas
    const inVisited = (x, z) => rects.some((m) => g.visited.has(m.id) && x >= m.r[0] - 2 && x <= m.r[2] + 2 && z >= m.r[1] - 2 && z <= m.r[3] + 2);
    for (const it of g.interact.list) {
      if ((it.y < -3) !== crypt) continue;
      if (!inVisited(it.x, it.z)) continue;
      const x = X(it.x),
        z = Z(it.z);
      if (it.kind === 'door') {
        c.fillStyle = it.done ? '#6a9a50' : it.lock.type === 'none' ? '#8a7a5c' : '#c03028';
        c.fillRect(x - 4, z - 4, 8, 8);
      } else if (it.kind === 'altar') {
        c.fillStyle = '#e0a040';
        c.beginPath();
        c.moveTo(x, z - 7);
        c.lineTo(x + 6, z);
        c.lineTo(x, z + 7);
        c.lineTo(x - 6, z);
        c.fill();
      } else if (it.kind === 'item' && !it.done && !it.hidden) {
        c.fillStyle = '#f0e6c8';
        c.beginPath();
        c.arc(x, z, 2.5, 0, Math.PI * 2);
        c.fill();
      }
    }
    // jugador
    const p = g.player;
    const px = X(p.pos.x),
      pz = Z(p.pos.z);
    c.save();
    c.translate(px, pz);
    c.rotate(-p.yaw + Math.PI);
    c.fillStyle = '#e8d8b0';
    c.strokeStyle = '#000';
    c.beginPath();
    c.moveTo(0, -10);
    c.lineTo(6, 7);
    c.lineTo(0, 3);
    c.lineTo(-6, 7);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
    // rosa de los vientos
    c.fillStyle = '#8a7a5c';
    c.font = '16px "IM Fell English SC", serif';
    c.fillText('N', W - 40, 40);
    c.fillRect(W - 41, 46, 2, 20);
    $('map-hint').innerHTML = `<span>${this.keyHtml('back')} Cerrar</span>`;
  }

  // ------------------------------------------------------------ HUD
  toast(text, dur = 3.4) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = text;
    this.toastsEl.appendChild(d);
    while (this.toastsEl.children.length > 3) this.toastsEl.firstChild.remove();
    setTimeout(() => d.classList.add('out'), dur * 1000);
    setTimeout(() => d.remove(), dur * 1000 + 900);
  }
  area(name) {
    const a = $('area');
    a.textContent = name;
    a.classList.add('show');
    clearTimeout(this._areaTO);
    this._areaTO = setTimeout(() => a.classList.remove('show'), 3200);
  }
  showHud(v) {
    $('hud').classList.toggle('hidden', !v);
  }

  updateHud(dt) {
    const g = this.g,
      p = g.player;
    const hpW = p.maxHp * 2.5,
      stW = p.maxSt * 2.1;
    const hb = $('hpbar'),
      sb = $('stbar');
    hb.style.width = hpW + 'px';
    sb.style.width = stW + 'px';
    const hf = clamp(p.hp / p.maxHp, 0, 1);
    hb.children[1].style.width = hf * 100 + '%';
    const lag = hb.children[0];
    if (hf * 100 < (this._lagW ?? 100)) {
      this._lagW = this._lagW ?? 100;
    }
    lag.style.width = hf * 100 + '%';
    sb.children[0].style.width = clamp(p.st / p.maxSt, 0, 1) * 100 + '%';
    sb.classList.toggle('empty', p.st <= 0);
    $('flask-n').textContent = p.flasks;
    $('flasks').classList.toggle('empty', p.flasks === 0);
    // indicación de interacción
    const pr = $('prompt');
    const t = g.promptTarget;
    if (t && !this.modal && g.state === 'play') {
      $('prompt-label').textContent = g.interact.label(t);
      const k = $('prompt-key');
      const d = this.device();
      const glyph = GLYPHS[d].interact;
      k.textContent = glyph;
      k.className = d === 'pad' ? 'key pad a' : 'key';
      pr.classList.add('show');
    } else pr.classList.remove('show');
    // jefe
    const bb = $('bossbar');
    const b = g.activeBoss;
    if (b && !b.dead) {
      bb.classList.add('show');
      bb.querySelector('.name').textContent = b.T.name;
      bb.querySelector('.fill').style.width = clamp(b.hp / b.maxHp, 0, 1) * 100 + '%';
      bb.querySelector('.lag').style.width = clamp(b.hp / b.maxHp, 0, 1) * 100 + '%';
    } else bb.classList.remove('show');
    // retícula de fijado
    const lk = $('lock');
    const lt = g.lockTarget;
    const W = innerWidth,
      H = innerHeight;
    if (lt && !lt.dead) {
      const v = this._v.set(lt.pos.x, lt.pos.y + lt.lockHeight * 0.85, lt.pos.z).project(g.camera);
      if (v.z < 1) {
        lk.style.left = ((v.x + 1) / 2) * W + 'px';
        lk.style.top = ((1 - v.y) / 2) * H + 'px';
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
      d.style.left = ((v.x + 1) / 2) * W + 'px';
      d.style.top = ((1 - v.y) / 2) * H + 'px';
      d.firstChild.style.width = clamp(e.hp / e.maxHp, 0, 1) * 100 + '%';
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
        if (s.t > 0.35 && (conf || back)) this.close();
        break;
      case 'inv': {
        if (inp.pressed('tabL') || inp.pressed('tabR') || (this.invTab === 1 && dir.x)) {
          this.invTab = 1 - this.invTab;
          this.invSel = 0;
          this.renderInv();
          au && au.ui('move');
          break;
        }
        if (this.invTab === 0) {
          const cols = Math.max(1, Math.floor($('inv-grid').clientWidth / 80));
          const d = dir.x + dir.y * cols;
          if (d) {
            this.invSel += d;
            this.renderInv();
            au && au.ui('move');
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
