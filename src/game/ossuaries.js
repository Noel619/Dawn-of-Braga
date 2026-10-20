// Los osarios y sus puzles. Cada osario guarda un objeto bendito (ver
// game/relics.js) tras un mecanismo; su nivel pone los datos en L.puzzles
// ({ kind, id, item, ... }) y aquí se montan las piezas que se mueven, se
// atienden sus interacciones (los interactuables de tipo 'puzzle') y se
// guarda lo resuelto en las banderas ('puzzle:<id>'). Lo que va a medias no
// se guarda: al morir o al cargar, vuelve a empezar.
import * as THREE from 'three';
import { objMat, cloneMat } from '../gfx/materials.js';
import { clamp } from '../core/util.js';
import { MSG } from './story.js';
import { meshParts, helmetParts, chainParts, chestParts } from '../world/ossuary_props.js';

const V3 = THREE.Vector3;
const ease = (k) => k * k * (3 - 2 * k);

class Puzzle {
  constructor(g, s) {
    this.g = g;
    this.s = s;
    this.id = s.id;
    this.flag = 'puzzle:' + s.id;
    this.parts = [];
    this.mats = new Map();
    this.timers = [];
    // (la sonda de luz, en medio del osario)
    this.probeAt = s.probe ?? [s.x ?? 0, (s.y ?? 0) + 1.2, s.z ?? 0];
  }
  get F() {
    return this.g.flags;
  }
  get solved() {
    return !!this.F[this.flag];
  }
  // material de objeto con la luz horneada del sitio
  mat(name, tint = null) {
    const k = name + (tint ? ':' + tint.join() : '');
    if (this.mats.has(k)) return this.mats.get(k);
    const g = this.g;
    let m;
    if (name === 'black') m = new THREE.MeshBasicMaterial({ color: 0x060404 });
    else {
      m = cloneMat(objMat(name));
      const [x, y, z] = this.probeAt;
      const zn = g.zoneAt({ x, y, z });
      const pr = g.probe.sample(x, y, z, zn && zn.room ? g.level.ctx.wb.roomId(zn.room) : 0);
      if (m._u) {
        m._u.uProbe.value.set(pr[0], pr[1], pr[2]);
        m._u.uGround.value.set(this.s.y ?? 0, 0.3);
      }
      if (tint) m.color = new THREE.Color(tint[0], tint[1], tint[2]);
    }
    this.mats.set(k, m);
    return m;
  }
  matFn() {
    return (name, tint) => this.mat(name, tint);
  }
  // una pieza que se toca: un interactuable 'puzzle' que nos llama
  part(o) {
    const it = this.g.interact.create({ kind: 'puzzle', puzzle: this, r: 1.25, ...o });
    this.parts.push(it);
    return it;
  }
  // algo dentro de t segundos (se cancela al reiniciar)
  after(t, fn) {
    this.timers.push({ t, fn });
  }
  tick(dt) {
    if (!this.timers.length) return;
    const due = [];
    for (const tm of this.timers) {
      tm.t -= dt;
      if (tm.t <= 0) due.push(tm);
    }
    if (!due.length) return;
    this.timers = this.timers.filter((tm) => tm.t > 0);
    for (const tm of due) tm.fn();
  }
  sound(name, p, o) {
    const g = this.g;
    g.audio && g.audio.play(name, p ? { x: p.x, y: p.y, z: p.z } : null, o);
  }
  // el objeto bendito que guarda (el interactuable 'item' con afterFlag)
  get relic() {
    return this.g.interact.list.find((i) => i.kind === 'item' && i.id === this.s.item) || null;
  }
  // lo resuelve: lo apunta, cierra sus piezas y saca el objeto
  solve() {
    this.F[this.flag] = true;
    for (const it of this.parts) it.done = true;
    this.g.saveGame();
  }
  // muestra el objeto bendito subiendo desde dy por debajo de su sitio
  reveal(dy = 0.25, dur = 1.4) {
    const it = this.relic;
    if (!it || this.F['take:' + it.id]) return;
    it.hidden = false;
    it.obj.visible = true;
    this.rise = { it, y1: it.y, y0: it.y - dy, k: 0, dur };
    it.obj.position.y = it.y - dy;
  }
  updateRise(dt) {
    const R = this.rise;
    if (!R) return;
    R.k = Math.min(1, R.k + dt / R.dur);
    R.it.obj.position.y = R.y0 + (R.y1 - R.y0) * ease(R.k);
    if (R.k >= 1) this.rise = null;
  }
  label() {
    return 'Examinar';
  }
  use() {}
  update(dt) {
    this.tick(dt);
    this.updateRise(dt);
  }
  // el estado guardado (resuelto o no); lo de a medias se pierde
  applyFlags() {
    this.timers = [];
    this.rise = null;
    for (const it of this.parts) it.done = this.solved;
  }
  onRespawn() {
    if (!this.solved) this.applyFlags();
  }
}

// ------------------------------------------------------------------ el toque
// El osario de la guarnición (catacumbas del castillo): cuatro yelmos
// colgados de una barra, cada uno con lo suyo debajo y su vela. Se tañen en
// el orden de la guardia; uno fuera de orden y se apagan todas. Con los
// cuatro, se descorre la barra del arca de la Hermandad.
class TolledHelmets extends Puzzle {
  constructor(g, s) {
    super(g, s);
    this.step = 0;
    this.busy = false;
    const mf = this.matFn();
    this.helmets = s.helmets.map((h, i) => {
      const piv = new THREE.Group();
      piv.position.set(h.x, s.barY, h.z);
      // la cadena hasta la coronilla y el yelmo colgado de ella, boca abajo
      // de la campana (como un esquilón)
      const top = HELMET_TOP[h.kind] ?? 0.12;
      // (acero claro y un poco mayores que los de las filas: se leen de lejos)
      const HS = 1.12;
      const len = s.barY - h.y - top * HS;
      const hm = new THREE.Matrix4().makeTranslation(0, -len - top * HS, 0).multiply(new THREE.Matrix4().makeScale(HS, HS, HS));
      const parts = [...chainParts(new V3(0, 0, 0), new V3(0, -len + 0.01, 0), 0.045), ...helmetParts(h.kind, { mat: 'plate', mail: 'chainmail' }).map((p) => ({ ...p, m: hm.clone().multiply(p.m) }))];
      const m = meshParts(parts, mf);
      m.rotation.y = h.rot ?? 0;
      piv.add(m);
      g.scene.add(piv);
      // la vela de su repisa (apagada) y su luz
      const fire = g.fx.fires.add({ x: h.candle[0], y: h.candle[1], z: h.candle[2], s: 0.09, light: false, embers: false, glow: true });
      fire.on = false;
      fire.keep = true;
      const light = g.fx.lights.add({ x: h.candle[0], y: h.candle[1] + 0.15, z: h.candle[2], color: 0xffa050, intensity: 0, range: 4.5, flicker: 1, on: false, priority: 1 });
      const it = this.part({ id: 'pz_' + s.id + '_' + i, x: h.x, y: s.y, z: h.z, ix: h.x + s.face * 0.75, iz: h.z, r: 1.05, helmet: i });
      return { ...h, i, piv, fire, light, it, th: 0, w: 0, lit: false };
    });
    // el arca, en su altar
    const A = s.arca;
    const C = chestParts({ w: 0.86, d: 0.46, h: 0.4 });
    const grp = new THREE.Group();
    grp.position.set(A.x, A.y, A.z);
    grp.rotation.y = A.rot ?? 0;
    grp.add(meshParts(C.body, mf));
    const lid = new THREE.Group();
    lid.position.set(0, C.H, -C.D / 2);
    lid.add(meshParts(C.lid, mf));
    grp.add(lid);
    const bar = meshParts(C.bar, mf);
    bar.matrixAutoUpdate = true;
    bar.position.set(0, C.yBar, C.D / 2 + 0.03);
    grp.add(bar);
    g.scene.add(grp);
    const inner = new V3(0, C.H + 0.25, 0).applyAxisAngle(new V3(0, 1, 0), A.rot ?? 0).add(new V3(A.x, A.y, A.z));
    const glow = g.fx.lights.add({ x: inner.x, y: inner.y, z: inner.z, color: 0xffd080, intensity: 0, range: 5, flicker: 0.15, on: false, priority: 2 });
    this.arca = { grp, lid, bar, C, glow, open: 0, slide: 0, target: 0, barTarget: 0 };
    // y el propio arca, por si se toca antes de tiempo
    this.part({ id: 'pz_' + s.id + '_arca', x: A.x, y: s.y, z: A.z, ix: A.x + s.face * 0.9, iz: A.z, r: 1.3, arca: true });
  }
  label(it) {
    if (it.arca) return 'Examinar el arca';
    return 'Tañer el yelmo';
  }
  use(it) {
    const g = this.g,
      p = g.player;
    if (it.arca) {
      g.ui.toast(MSG.arcaCerrada, 4);
      this.sound('locked', it);
      return;
    }
    if (this.busy) return;
    const h = this.helmets[it.helmet];
    p.playInteract('interact', Math.atan2(h.x - p.pos.x, h.z - p.pos.z));
    this.busy = true;
    this.after(0.3, () => this.strike(h));
  }
  strike(h) {
    const s = this.s;
    this.busy = false;
    // (empujado hacia el muro: se mece en el plano del golpe)
    h.w += -s.face * 2.4;
    const right = s.order[this.step] === h.emblem && !h.lit;
    this.sound('helmetRing', { x: h.x, y: h.y, z: h.z }, { note: h.note, kind: h.kind });
    this.g.input && this.g.input.rumble(0.25, 0.15, 60);
    if (right) {
      this.light(h, true);
      this.step++;
      if (this.step >= s.order.length) this.complete();
      return;
    }
    // fuera de orden: un soplo frío por el osario y se apagan las velas
    this.busy = true;
    this.after(0.45, () => {
      this.sound('ossuaryDraft', { x: h.x, y: h.y + 1, z: h.z });
      let k = 0;
      for (const o of this.helmets)
        if (o.lit) {
          const oo = o;
          this.after(0.12 + k++ * 0.1, () => this.light(oo, false, true));
        }
      this.after(0.3 + k * 0.1, () => {
        this.step = 0;
        this.busy = false;
        if (!this.F['hint:toque']) {
          this.F['hint:toque'] = true;
          this.g.ui.toast(MSG.toqueMal, 4);
        }
      });
    });
  }
  light(h, on, snuff = false) {
    h.lit = on;
    h.fire.on = on;
    h.light.on = on;
    h.light.intensity = on ? 2.4 : 0;
    const c = this.g.camera.position;
    this.g.fx.fires.refresh(c.x, c.z);
    if (snuff) this.sound('candleOut', { x: h.candle[0], y: h.candle[1], z: h.candle[2] });
    else if (on) this.sound('candleLit', { x: h.candle[0], y: h.candle[1], z: h.candle[2] });
  }
  complete() {
    const s = this.s,
      A = this.arca;
    this.solve();
    this.busy = true;
    const at = { x: s.arca.x, y: s.arca.y + 0.4, z: s.arca.z };
    // los cuatro a la vez, las velas se avivan
    this.after(0.9, () => {
      this.sound('helmetChord', { x: this.helmets[1].x, y: this.helmets[1].y, z: this.helmets[1].z }, { notes: this.helmets.map((h) => h.note) });
      for (const h of this.helmets) {
        h.w += (Math.random() - 0.5) * 0.8;
        h.light.intensity = 3.4;
      }
    });
    // la barra se descorre y la tapa se abre
    this.after(1.7, () => {
      A.barTarget = 1;
      this.sound('chestBar', at);
    });
    this.after(2.7, () => {
      A.target = 1;
      A.glow.on = true;
      this.sound('chestOpen', at);
    });
    this.after(3.1, () => {
      this.reveal(0.3, 1.6);
      this.sound('relicReveal', at);
      this.g.ui.toast(MSG.toqueBien, 4.5);
    });
    this.after(4.5, () => {
      this.busy = false;
      for (const h of this.helmets) h.light.intensity = 2.4;
    });
  }
  update(dt) {
    super.update(dt);
    // los yelmos se mecen (péndulo amortiguado)
    for (const h of this.helmets) {
      if (Math.abs(h.th) < 1e-4 && Math.abs(h.w) < 1e-4) continue;
      const om = 3.1;
      h.w += (-om * om * h.th - 0.9 * h.w) * dt;
      h.th += h.w * dt;
      h.th = clamp(h.th, -0.6, 0.6);
      h.piv.rotation.z = h.th;
    }
    // el arca
    const A = this.arca;
    if (A.slide !== A.barTarget) {
      A.slide = A.barTarget > A.slide ? Math.min(1, A.slide + dt / 0.8) : 0;
      this.poseArca();
    }
    if (A.open !== A.target) {
      A.open = A.target > A.open ? Math.min(1, A.open + dt / 1.6) : 0;
      this.poseArca();
    }
  }
  poseArca() {
    const A = this.arca;
    // (la barra sale por su lado, y al final cae colgando de la grapa)
    const k = ease(A.slide);
    A.bar.position.x = k * A.C.W * 0.62;
    A.bar.rotation.z = -Math.max(0, k - 0.8) * 2.2;
    A.lid.rotation.x = -ease(A.open) * 1.95;
    A.glow.intensity = ease(A.open) * 1.8;
  }
  applyFlags() {
    super.applyFlags();
    const on = this.solved;
    this.step = on ? this.s.order.length : 0;
    this.busy = false;
    for (const h of this.helmets) {
      h.th = h.w = 0;
      h.piv.rotation.z = 0;
      h.lit = on;
      h.fire.on = on;
      h.light.on = on;
      h.light.intensity = on ? 2.4 : 0;
    }
    const A = this.arca;
    A.slide = A.barTarget = on ? 1 : 0;
    A.open = A.target = on ? 1 : 0;
    A.glow.on = on;
    this.poseArca();
    const c = this.g.camera.position;
    this.g.fx.fires.refresh(c.x, c.z);
  }
}
// dónde queda la coronilla de cada yelmo (desde su origen)
const HELMET_TOP = { kettle: 0.122, bascinet: 0.17, nasal: 0.172, cap: 0.11 };

const KINDS = { toque: TolledHelmets };

export class Ossuaries {
  constructor(g) {
    this.g = g;
    this.list = [];
    for (const s of g.level.L.puzzles || []) {
      const K = KINDS[s.kind];
      if (K) this.list.push(new K(g, s));
    }
  }
  get(id) {
    return this.list.find((p) => p.id === id) || null;
  }
  update(dt) {
    for (const p of this.list) p.update(dt);
  }
  applyFlags() {
    for (const p of this.list) p.applyFlags();
  }
  onRespawn() {
    for (const p of this.list) p.onRespawn();
  }
}
