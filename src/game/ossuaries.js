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
import { meshParts, helmetParts, chainParts, chestParts, musicBoxParts, drumGeometry, drumCapParts, MBOX } from '../world/ossuary_props.js';

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
    const m = this.freshMat(name, tint);
    this.mats.set(k, m);
    return m;
  }
  // (uno propio, que se puede tocar sin tocar los demás)
  freshMat(name, tint = null) {
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
  // ruido que oye el Descoyuntado (mientras viva, viene a ver qué pasa)
  noise(k = 1) {
    const h = this.g.hunt;
    const b = h && h.active ? h.boss : null;
    if (b && !b.dead && b.D && b.D.onNoise) b.D.onNoise(this.s.x, this.s.z, k);
  }
  label() {
    return 'Examinar';
  }
  use() {}
  // la vista de cerca (ver Ossuaries.openView)
  viewInput() {}
  onViewClose() {}
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

// --------------------------------------------------------------- la nana
// El osario de las bodegas del canónigo: en la capilla del ama, la caja de
// música que le tocaba de niño, con cuatro rodillos de seis símbolos y su
// manivela. Se usa de cerca. Con los rodillos en la nana del ama (el sol,
// la luna, la campana y el gallo) y dándole cuerda, la toca entera y se abre
// el cajón. Cada vuelta de rodillo y cada prueba suenan por toda la bodega.
const NANA_SYM = ['sol', 'luna', 'estrella', 'campana', 'gallo', 'cruz'];
// la frase que toca cada símbolo (MIDI); las cuatro buenas son la nana
const NANA_PHRASE = {
  sol: [69, 67, 65, 64],
  luna: [62, 65, 69, 67],
  estrella: [72, 74, 76, 74],
  campana: [69, 69, 74, 72],
  gallo: [69, 67, 64, 62],
  cruz: [62, 62, 61, 62],
};
const NANA_STEP = 0.36;
class MusicBox extends Puzzle {
  constructor(g, s) {
    super(g, s);
    const mf = this.matFn();
    const B = MBOX;
    const R = musicBoxParts();
    const grp = new THREE.Group();
    grp.position.set(s.x, s.y, s.z);
    grp.rotation.y = s.rot ?? 0;
    grp.add(meshParts(R.body, mf));
    this.start = s.start ?? [2, 5, 0, 3];
    this.drums = B.drumX.map((x, i) => {
      const piv = new THREE.Group();
      piv.position.set(x, B.drumY, B.D / 2 - 0.022);
      const m = this.freshMat('nanaSymbols');
      piv.add(new THREE.Mesh(drumGeometry(B.drumR, B.drumLen), m));
      piv.add(meshParts(drumCapParts(B.drumR, B.drumLen), mf));
      grp.add(piv);
      return { piv, m, k: this.start[i], a: 0, target: 0 };
    });
    const crank = meshParts(R.crank, mf);
    const cp = new THREE.Group();
    cp.position.set(...B.crank);
    cp.add(crank);
    grp.add(cp);
    this.crank = { piv: cp, a: 0, spin: 0 };
    const drawer = meshParts(R.drawer, mf);
    const dp = new THREE.Group();
    dp.position.set(0, B.drawerY + 0.004, B.D / 2 + 0.002);
    dp.add(drawer);
    grp.add(dp);
    this.drawer = { piv: dp, k: 0, target: 0 };
    // el marcador de lo elegido (un clavito de latón que no se apaga)
    this.marker = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 4), new THREE.MeshBasicMaterial({ color: 0xe8c060 }));
    this.marker.rotation.x = Math.PI;
    this.marker.visible = false;
    grp.add(this.marker);
    g.scene.add(grp);
    this.grp = grp;
    this.sel = 0;
    this.busy = false;
    this.part({ id: 'pz_' + s.id, x: s.x, y: s.y - (s.table ?? 0), z: s.z, ix: s.x + Math.sin(s.rot ?? 0) * 0.85, iz: s.z + Math.cos(s.rot ?? 0) * 0.85, r: 1.15 });
    this.poseDrums(true);
  }
  // un punto del marco de la caja, en el mundo
  world(x, y, z) {
    return new V3(x, y, z).applyAxisAngle(new V3(0, 1, 0), this.s.rot ?? 0).add(new V3(this.s.x, this.s.y, this.s.z));
  }
  label() {
    return 'Examinar la caja de música';
  }
  use() {
    const g = this.g;
    // (un poco hacia la manivela: entra en el cuadro)
    const pos = this.world(0.2, 0.52, 0.82),
      look = this.world(0.09, 0.2, 0.0);
    g.ossuaries.openView(this, pos, look, [
      { kb: 'A D', pad: 'Cruceta', label: 'Elegir' },
      { kb: 'W S', pad: 'Cruceta', label: 'Girar el rodillo' },
      { act: 'interact', label: 'Dar cuerda' },
      { act: 'back', label: 'Dejarla' },
    ]);
    this.sel = 0;
    this.marker.visible = true;
    this.poseMarker();
    if (!this.F['hint:nana']) {
      this.F['hint:nana'] = true;
      g.ui.toast(MSG.nanaCaja, 5);
    }
  }
  onViewClose() {
    this.marker.visible = false;
    for (const d of this.drums) d.m.emissive && d.m.emissive.setRGB(0, 0, 0);
  }
  viewInput(inp) {
    if (this.busy) return;
    const n = this.drums.length;
    const dir = inp.menuDir();
    if (dir.x) {
      this.sel = (this.sel + dir.x + n + 1) % (n + 1);
      this.g.audio && this.g.audio.ui('move');
      this.poseMarker();
    }
    if (this.sel < n && dir.y) this.turn(this.sel, -dir.y);
    else if (inp.pressed('interact') || inp.pressed('confirm')) {
      if (this.sel < n) this.turn(this.sel, 1);
      else this.wind();
    }
  }
  turn(i, d) {
    const D = this.drums[i];
    D.k = (D.k + d + 6) % 6;
    D.target += (d * Math.PI) / 3;
    const p = this.world(MBOX.drumX[i], MBOX.drumY, MBOX.D / 2);
    this.sound('drumClick', p);
    this.noise(0.35);
  }
  wind() {
    const g = this.g;
    this.busy = true;
    const at = this.world(0, 0.25, 0.1);
    this.crank.spin = 3;
    this.sound('crankWind', at);
    this.noise(1);
    const syms = this.drums.map((d) => NANA_SYM[d.k]);
    const right = syms.every((x, i) => x === this.s.order[i]);
    const notes = [];
    for (const x of syms) notes.push(...NANA_PHRASE[x], null);
    // (mal, se atasca a media frase)
    const play = right ? notes : notes.slice(0, 9 + Math.floor(Math.random() * 4));
    this.after(1.3, () => this.sound('musicBoxTune', at, { notes: play, step: NANA_STEP, wrong: !right }));
    const T = 1.3 + play.length * NANA_STEP;
    if (right) {
      this.after(T + 0.2, () => {
        this.solve();
        this.drawer.target = 1;
        this.sound('drawerOpen', at);
      });
      this.after(T + 1.0, () => {
        this.reveal(0.04, 0.6);
        this.sound('relicReveal', at);
        g.ui.toast(MSG.nanaBien, 5);
        this.noise(1.5);
      });
      this.after(T + 1.8, () => {
        this.busy = false;
        g.ossuaries.closeView();
      });
    } else
      this.after(T, () => {
        this.sound('boxJam', at);
        this.busy = false;
        if (!this.F['hint:nanaMal']) {
          this.F['hint:nanaMal'] = true;
          g.ui.toast(MSG.nanaMal, 4);
        }
      });
  }
  poseMarker() {
    const B = MBOX;
    const n = this.drums.length;
    if (this.sel < n) this.marker.position.set(B.drumX[this.sel], B.drumY + 0.085, B.D / 2 + 0.01);
    else this.marker.position.set(B.crank[0] + 0.04, B.crank[1] + 0.07, B.crank[2]);
    this.drums.forEach((d, i) => d.m.emissive && d.m.emissive.setRGB(i === this.sel ? 0.16 : 0, i === this.sel ? 0.12 : 0, i === this.sel ? 0.06 : 0));
  }
  poseDrums(instant = false) {
    for (const d of this.drums) {
      if (instant) d.a = d.target = (d.k * Math.PI) / 3;
      d.piv.rotation.x = d.a;
    }
  }
  update(dt) {
    super.update(dt);
    let moving = false;
    for (const d of this.drums)
      if (d.a !== d.target) {
        const st = 7 * dt;
        d.a = Math.abs(d.target - d.a) < st ? d.target : d.a + Math.sign(d.target - d.a) * st;
        moving = true;
      }
    if (moving) this.poseDrums();
    const C = this.crank;
    if (C.spin > 0) {
      const st = Math.min(C.spin, dt / 0.4);
      C.spin -= st;
      C.a += st * Math.PI * 2;
      C.piv.rotation.x = C.a;
    }
    const D = this.drawer;
    if (D.k !== D.target) {
      D.k = D.target > D.k ? Math.min(1, D.k + dt / 0.7) : 0;
      D.piv.position.z = MBOX.D / 2 + 0.002 + ease(D.k) * MBOX.drawerOpen;
    }
    if (this.marker.visible) this.marker.position.y += Math.sin(this.g.time * 6) * 0.0004;
  }
  applyFlags() {
    super.applyFlags();
    const on = this.solved;
    this.busy = false;
    this.drums.forEach((d, i) => (d.k = on ? NANA_SYM.indexOf(this.s.order[i]) : this.start[i]));
    this.poseDrums(true);
    this.drawer.k = this.drawer.target = on ? 1 : 0;
    this.drawer.piv.position.z = MBOX.D / 2 + 0.002 + (on ? MBOX.drawerOpen : 0);
    this.crank.spin = 0;
  }
}

// ------------------------------------------------------------ las ánimas
// El osario de la cripta de la Sé: los canónigos en sus nichos, cada uno con
// su óbolo en la boca. Hay que llevar al cepillo del retablo los óbolos de
// los tres que nadie nombra; si coges el de uno que tiene nombre, el muerto
// lo reclama y lo que llevas vuelve a su sitio. Con los tres en el cepillo
// se abre la portezuela de la predela.
class ForgottenSouls extends Puzzle {
  constructor(g, s) {
    super(g, s);
    // (con un brillo propio: se ve en la boca aunque el nicho esté a oscuras)
    const bronze = this.freshMat('gold', [0.95, 0.72, 0.42]);
    if (bronze.emissive) bronze.emissive.setRGB(0.3, 0.2, 0.07);
    const coinGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.006, 12);
    this.niches = s.niches.map((n, i) => {
      // el óbolo, entre los dientes de la calavera (vertical, de cara)
      const ry = n.face > 0 ? Math.PI / 2 : -Math.PI / 2;
      const coin = new THREE.Mesh(coinGeo, bronze);
      const fx = Math.sin(ry),
        fz = Math.cos(ry);
      // (la calavera, a 1,12: la boca, algo más abajo y más adelante)
      coin.position.set(n.x + fx * 0.088, s.y + 1.1 - 0.068, n.z + fz * 0.088);
      coin.rotation.set(Math.PI / 2, 0, 0);
      coin.rotation.order = 'YXZ';
      coin.rotation.y = ry;
      g.scene.add(coin);
      const it = this.part({ id: 'pz_' + s.id + '_' + i, x: n.x, y: s.y, z: n.z, ix: n.x + n.face * 0.75, iz: n.z, r: 1.05, niche: i });
      return { ...n, i, coin, it, state: 'home' };
    });
    const C = s.cepillo;
    this.part({ id: 'pz_' + s.id + '_cepillo', x: C.x, y: s.y, z: C.z, ix: C.x - s.door.side * 0.55, iz: C.z, r: 1.15, cepillo: true });
    // la portezuela de la predela (gira en su canto de un lado)
    const D = s.door;
    const piv = new THREE.Group();
    piv.position.set(D.x - D.side * 0.012, D.y, D.z - 0.2);
    const wood = this.mat('wooddark', [0.6, 0.45, 0.26]);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.26, 0.4), wood);
    leaf.position.set(0, 0.13, 0.2);
    piv.add(leaf);
    const gold = this.mat('gold');
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.14, 0.03), gold);
    cross.position.set(-D.side * 0.012, 0.13, 0.2);
    piv.add(cross);
    const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.03, 0.1), gold);
    cross2.position.set(-D.side * 0.012, 0.16, 0.2);
    piv.add(cross2);
    g.scene.add(piv);
    this.door = { piv, k: 0, target: 0 };
  }
  carried() {
    return this.niches.filter((n) => n.state === 'carried');
  }
  label(it) {
    if (it.cepillo) return this.carried().length ? 'Echar los óbolos en el cepillo' : 'Examinar el cepillo';
    return 'Coger el óbolo';
  }
  use(it) {
    const g = this.g,
      p = g.player;
    if (this.busy) return;
    if (it.cepillo) {
      const c = this.carried();
      if (!c.length) {
        g.ui.toast(MSG.cepilloVacio, 4.5);
        return;
      }
      p.playInteract('interact', Math.atan2(this.s.cepillo.x - p.pos.x, this.s.cepillo.z - p.pos.z));
      this.busy = true;
      this.after(0.35, () => this.give(c));
      return;
    }
    const n = this.niches[it.niche];
    p.playInteract('interact', Math.atan2(n.x - p.pos.x, n.z - p.pos.z));
    this.busy = true;
    this.after(0.3, () => this.take(n));
  }
  take(n) {
    this.busy = false;
    n.state = 'carried';
    n.coin.visible = false;
    n.it.hidden = true;
    this.sound('coinTake', n.coin.position);
    if (n.named) {
      // es suyo: lo reclama, y con él todo lo que llevas
      this.busy = true;
      this.after(0.7, () => this.claim(n));
    } else {
      const k = this.carried().length;
      this.g.ui.toast(k === 1 ? MSG.oboloUno : MSG.obolos(k), 2.5);
    }
  }
  claim(n) {
    this.sound('soulClaim', n.coin.position);
    let k = 0;
    for (const o of this.carried()) {
      const oo = o;
      this.after(0.25 + k++ * 0.12, () => {
        oo.state = 'home';
        oo.coin.visible = true;
        oo.it.hidden = false;
        this.sound('coinDrop', oo.coin.position, { stone: true });
      });
    }
    this.after(0.4 + k * 0.12, () => {
      this.busy = false;
      this.g.ui.toast(MSG.animaReclama, 4.5);
    });
  }
  give(list) {
    const c = this.s.cepillo;
    list.forEach((n, k) => {
      n.state = 'given';
      this.after(k * 0.22, () => this.sound('coinDrop', { x: c.x, y: c.y, z: c.z }));
    });
    const T = list.length * 0.22 + 0.3;
    const done = this.niches.filter((n) => !n.named).every((n) => n.state === 'given');
    this.after(T, () => {
      if (done) return this.complete();
      this.busy = false;
      this.g.ui.toast(MSG.cepilloCae, 3.5);
    });
  }
  complete() {
    const D = this.s.door;
    const at = { x: D.x, y: D.y + 0.2, z: D.z };
    this.solve();
    this.sound('helmetChord', at, { notes: [50, 57, 62, 66] });
    this.after(0.9, () => {
      this.door.target = 1;
      this.sound('chestOpen', at);
    });
    this.after(1.6, () => {
      this.reveal(0.05, 0.8);
      this.sound('relicReveal', at);
      this.g.ui.toast(MSG.animasBien, 5);
      this.busy = false;
    });
  }
  update(dt) {
    super.update(dt);
    const D = this.door;
    if (D.k !== D.target) {
      D.k = D.target > D.k ? Math.min(1, D.k + dt / 1.1) : 0;
      // (hacia el pasillo)
      D.piv.rotation.y = -this.s.door.side * ease(D.k) * 1.8;
    }
  }
  applyFlags() {
    super.applyFlags();
    const on = this.solved;
    this.busy = false;
    for (const n of this.niches) {
      n.state = on && !n.named ? 'given' : 'home';
      n.coin.visible = n.state === 'home';
      n.it.hidden = n.state !== 'home';
    }
    this.door.k = this.door.target = on ? 1 : 0;
    this.door.piv.rotation.y = -this.s.door.side * (on ? 1.8 : 0);
  }
}

const KINDS = { toque: TolledHelmets, nana: MusicBox, animas: ForgottenSouls };

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
  // La vista de cerca de un mecanismo (como en los Resident Evil): la cámara
  // fija delante, el jugador quieto (y fuera de cuadro) y los controles de
  // la pieza abajo. Se sale con «atrás», o sola si algo te golpea.
  openView(puzzle, pos, look, hint) {
    const g = this.g;
    this.view = { puzzle, pos, look, t: 0 };
    g.player.vx = g.player.vz = 0;
    g.player.obj.visible = false;
    g.ui.showPuzzleHint(hint);
  }
  closeView() {
    const g = this.g;
    const V = this.view;
    if (!V) return;
    this.view = null;
    V.puzzle.onViewClose();
    g.player.obj.visible = true;
    g.ui.hidePuzzleHint();
    g.camRig.override = null;
    g.camRig.snapTo(g.player);
  }
  update(dt) {
    for (const p of this.list) p.update(dt);
    const V = this.view;
    if (!V) return;
    const g = this.g,
      p = g.player;
    V.t += dt;
    if (p.dead || p.state !== 'free' || g.ui.modal) return this.closeView();
    if (V.t < 0.2) return;
    if (g.input.pressed('back')) return this.closeView();
    V.puzzle.viewInput(g.input, dt);
  }
  applyFlags() {
    if (this.view) this.closeView();
    for (const p of this.list) p.applyFlags();
  }
  onRespawn() {
    if (this.view) this.closeView();
    for (const p of this.list) p.onRespawn();
  }
}
