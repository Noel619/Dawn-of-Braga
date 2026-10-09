// El gigante de la película: el Turiferario (21 m) movido por el guion.
//
// No piensa: los actos le dicen dónde ponerse, qué clip hacer y hacia dónde
// llevar las manos. Lo que sí hace solo es lo que tiene un cuerpo: la
// animación por capas (colossus_rig.js: base, acción, respiración, la cabeza
// que mira, los muelles de la ropa, de los jirones, de la aureola y de la
// cola, los pies en el suelo), la campana colgando de su cadena (bell.js),
// las llamas de los cirios, el brillo del núcleo, sus luces (del pool del
// juego), las pisadas (temblor, polvo, sonido) y un cuerpo de cápsulas para
// que el jugador no lo atraviese y la cámara no se meta dentro.
//
// Espacio del modelo: el origen en el suelo entre los pies, mira hacia +z;
// +x es su izquierda.
import * as THREE from 'three';
import { TUR_CLIPS, turRig } from './turiferario_anim.js';
import { GIANT_CLIPS } from './giant_anim.js';
import { BellChain } from './bell.js';
import { ColBody } from './colbody.js';
import { ColFX } from '../../entities/colossus/colfx.js';
import { clamp } from '../../core/util.js';

const _v = new THREE.Vector3(),
  _v2 = new THREE.Vector3(),
  _v3 = new THREE.Vector3(),
  _q = new THREE.Quaternion();

// el avance de un clip en el instante t (tabla [segundo, metros])
export function sampleMove(tab, t) {
  if (t <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) {
    if (t <= tab[i][0]) {
      const [t0, m0] = tab[i - 1],
        [t1, m1] = tab[i];
      const u = (t - t0) / Math.max(1e-6, t1 - t0);
      // (suave dentro de cada tramo: arranca y frena con la zancada)
      const s = u * u * (3 - 2 * u);
      return m0 + (m1 - m0) * (0.35 * u + 0.65 * s);
    }
  }
  return tab[tab.length - 1][1];
}

export class Giant {
  constructor(game, M) {
    this.g = game;
    this.M = M;
    this.E = M.extra;
    const col = game.world.col;
    // el suelo (el empedrado, no los trastos); el guion puede cambiarlo (el
    // fondo del pozo de la cisterna, el borde del cráter)
    this.groundAt = (x, z) => (this.groundFn ? this.groundFn(x, z) : col.groundHeight(x, z, 0.2, 0.7));
    this.R = turRig(M, { groundAt: (x, z) => this.groundAt(x, z) });
    this.R.look.target = new THREE.Vector3();
    this.R.action.onEvent = (e, c) => this.onEvent(e, c);
    this.R.base.onEvent = (e, c) => this.onEvent(e, c);
    this.bell = new BellChain(game.scene, M.groups.bell, { bellH: this.E.sizes.bellH, radius: 3.0, len: this.E.sizes.chain.len, groundAt: (x, z) => this.groundAt(x, z) });
    this.bell.mesh.visible = false;
    this.bell.bell.visible = false;
    this.col = new ColBody();
    this.fx = new ColFX(M);
    for (const c of this.E.fx.candles) this.fx.flame(c.bone, c.p, [0.55, 1.05]);
    this.coreGlow = this.fx.glow('chest', [0, 12.25, 1.35], 3.4, 0xff6a20, { pulse: 0.22 });
    this.bellGlow = new THREE.Sprite(this.coreGlow.material.clone());
    this.bellGlow.scale.set(5, 5, 1);
    this.bellGlow.position.set(0, -this.E.sizes.bellH * 0.75, 0);
    this.bellGlow.material.color.setHex(0xff5a14);
    this.bell.bell.add(this.bellGlow);
    // los ojos: dos brasas tras la jaula (se ven en los primeros planos)
    this.eyes = [-1, 1].map((s) => this.fx.glow('head', [0.42 * s, 16.3, 4.42], 0.55, 0xff8a30, { pulse: 0.1 }));
    const L = game.fx.lights;
    this.lights = {
      core: L.add({ x: 0, y: -50, z: 0, color: 0xff7a30, intensity: 26, range: 15, flicker: 1, priority: 6, on: false }),
      bell: L.add({ x: 0, y: -50, z: 0, color: 0xff6a20, intensity: 20, range: 12, flicker: 1, priority: 5, on: false }),
      halo: L.add({ x: 0, y: -50, z: 0, color: 0xffb060, intensity: 14, range: 13, flicker: 1, priority: 4, on: false }),
    };
    this.pos = new THREE.Vector3();
    this.yaw = 0;
    this.fixY = null; // altura fija de la raíz (si no, la del suelo)
    this.visible = false;
    this.ik = {}; // { L: { target, pole, w, rot }, R: ... } manos llevadas a un punto
    this.footIK = {}; // { L/R: { target, pole, w } } pies (agarrarse a un borde)
    this.lookW = 1;
    this.lookAt = null; // Vector3 o null (el jugador)
    this.pushPlayer = true;
    this.steps = true;
    this.onEventHook = null;
    this.speedK = 1;
    this.shake = 0;
    // el avance de los clips (giant_anim.js: 'move', 'vel'): lo enciende el
    // guion cuando el gigante va de un sitio a otro
    this.rootMotion = false;
    this._mv = { clip: null, t: 0, m: 0 };
  }

  // ------------------------------------------------------------ montaje
  show(on) {
    this.visible = on;
    const g = this.g;
    if (on && !this.M.root.parent) g.scene.add(this.M.root);
    if (!on && this.M.root.parent) this.M.root.parent.remove(this.M.root);
    this.bell.mesh.visible = on && this.bellOn !== false;
    this.bell.bell.visible = on && this.bellOn !== false;
    for (const k in this.lights) this.lights[k].on = on;
  }
  // la campana colgando (o no: la suelta en la cisterna al final)
  setBell(on) {
    this.bellOn = on;
    this.bell.mesh.visible = this.visible && on;
    this.bell.bell.visible = this.visible && on;
  }
  dispose() {
    this.show(false);
    this.bell.dispose();
    const L = this.g.fx.lights;
    for (const k in this.lights) {
      const i = L.sources.indexOf(this.lights[k]);
      if (i >= 0) L.sources.splice(i, 1);
    }
  }
  // De pie en (x, z) mirando hacia yaw, con la pose del clip base (o la de
  // reposo) ya aplicada, la ropa y la cola asentadas y la campana colgando.
  place(x, z, yaw, o = {}) {
    this.pos.set(x, 0, z);
    this.yaw = yaw;
    this.fixY = o.y ?? null;
    this.ik = {};
    this.footIK = {};
    this.R.groundOn = o.ground !== false;
    this.bell.noGround = !!o.bellNoGround;
    this._applyRoot();
    this.R.base = new this.R.base.constructor();
    this.R.action = new this.R.action.constructor();
    this.R.base.onEvent = (e, c) => this.onEvent(e, c);
    this.R.action.onEvent = (e, c) => this.onEvent(e, c);
    this.R.playBase(this.clip(o.base || 'idle'), { blend: 0.01 });
    if (o.clip) this.R.play(this.clip(o.clip), { blend: 0.01, t0: o.t0 ?? 0 });
    this.R.shakeA = 0;
    for (const j in this.R.add) delete this.R.add[j];
    // (los muelles de la ropa y la cola se asientan con la pose quieta: el
    // clip no avanza mientras tanto)
    const sa = this.R.action.speed,
      sb = this.R.base.speed;
    this.R.action.speed = 0;
    this.R.base.speed = 0;
    this.R.update(1 / 60);
    this.R.resetDyn();
    for (let i = 0; i < 30; i++) this.R.update(1 / 30);
    this.R.action.speed = sa;
    this.R.base.speed = sb;
    this.bell.reset(this.handGrip(_v));
    for (let i = 0; i < 60; i++) this.bell.update(1 / 60, this.handGrip(_v));
    this.show(true);
  }
  clip(name) {
    const c = GIANT_CLIPS[name] || TUR_CLIPS[name];
    if (!c) throw new Error('Clip del gigante desconocido: ' + name);
    return c;
  }
  // acción (golpes, gestos): con fundido sobre la base
  play(name, o = {}) {
    this.R.play(this.clip(name), { blend: o.blend ?? 0.25, speed: o.speed ?? 1, t0: o.t0 ?? 0 });
    this.actName = name;
  }
  // base (bucles: reposo, andar, correr)
  base(name, o = {}) {
    this.R.playBase(this.clip(name), { blend: o.blend ?? 0.4, speed: o.speed ?? 1, t0: o.t0 ?? 0 });
    this.baseName = name;
  }
  stopAction(blend = 0.4) {
    this.R.stop(blend);
    this.actName = null;
  }
  get actT() {
    return this.R.action.t;
  }
  get actDone() {
    return !this.R.action.clip || this.R.action.done;
  }
  _applyRoot() {
    const r = this.M.root;
    this.pos.y = this.fixY ?? this.groundAt(this.pos.x, this.pos.z);
    r.position.copy(this.pos);
    r.rotation.set(0, this.yaw, 0);
    r.updateMatrixWorld(true);
  }
  // punto (espacio del modelo en reposo) pegado a un hueso → mundo
  bp(bone, x, y, z, out = new THREE.Vector3()) {
    const rw = this.M.restWorld[bone];
    return out.set(x - rw.x, y - rw.y, z - rw.z).applyMatrix4(this.M.byName[bone].matrixWorld);
  }
  // punto del espacio del modelo (la raíz) → mundo
  wp(x, y, z, out = new THREE.Vector3()) {
    return out.set(x, y, z).applyMatrix4(this.M.root.matrixWorld);
  }
  // dirección del modelo → mundo
  wd(x, y, z, out = new THREE.Vector3()) {
    return out.set(x, y, z).applyQuaternion(_q.setFromAxisAngle(_v3.set(0, 1, 0), this.yaw));
  }
  boneQ(bone, out = new THREE.Quaternion()) {
    return this.M.byName[bone].getWorldQuaternion(out);
  }
  forward(out = new THREE.Vector3()) {
    return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }
  head(out = new THREE.Vector3()) {
    return this.bp('head', 0, 16.6, 3.6, out);
  }
  // la cara (delante de la jaula: donde mira la cámara en los primeros planos)
  face(out = new THREE.Vector3()) {
    return this.bp('head', 0, 16.2, 4.9, out);
  }
  handGrip(out = new THREE.Vector3()) {
    return this.bp('handR', -5.3, 5.2, 2.75, out);
  }
  // el hueco de la mano izquierda (donde queda el que agarra)
  palmL(out = new THREE.Vector3()) {
    return this.bp('handL', 5.35, 4.95, 2.85, out);
  }
  chest(out = new THREE.Vector3()) {
    return this.bp('chest', 0, 12.25, 1.5, out);
  }
  // hombro izquierdo, por encima (donde va el jugador aferrado a la casulla)
  shoulderL(out = new THREE.Vector3()) {
    return this.bp('clavL', 1.75, 15.25, -1.25, out);
  }
  // pelota de la mano/pie a un punto (IK) este fotograma
  reachHand(S, target, pole, w = 1, o = {}) {
    this.ik[S] = { target, pole, w, rot: o.rot || null, stretch: o.stretch || 1 };
  }
  freeHand(S) {
    delete this.ik[S];
  }

  // ------------------------------------------------------------ cada fotograma
  update(dt) {
    if (!this.visible) return;
    const g = this.g;
    const p = g.player;
    const R = this.R;
    // la cabeza busca al jugador (o lo que diga el guion)
    const L = this.lookAt || _v.set(p.pos.x, p.pos.y + 1.2, p.pos.z);
    R.look.target.copy(L);
    R.look.w = this.lookW;
    R.speed = this.speedK;
    // resuella cuando no hace nada
    this.breathT = (this.breathT ?? 4) - dt;
    if (this.breathT <= 0 && this.actDone) {
      this.breathT = 6 + Math.random() * 4;
      g.audio && g.audio.play('colossusBreath', this.head(_v2), { k: 1 });
      R.flinch.x.kick(-0.25);
    }
    R.shakeA = this.shake;
    if (this.rootMotion) this._rootMotion(dt);
    this._applyRoot();
    R.update(dt, { pre: () => this._ik() });
    this._colBody();
    this.bell.update(dt, this.handGrip(_v));
    this._fx(dt);
    if (this.pushPlayer && !p.puppet && !p.dead) this._push();
  }
  // El avance del clip de acción (su tabla 'move': metros a lo largo del
  // frente) o, si no hay, el del bucle base ('vel', m/s)
  _rootMotion(dt) {
    const A = this.R.action,
      B = this.R.base;
    const c = A.clip;
    let d = 0;
    if (c && c.move && A.weight > 0.5) {
      const m = sampleMove(c.move, Math.min(A.t, c.dur));
      const M = this._mv;
      // (un clip nuevo, o el mismo otra vez: se cuenta desde aquí)
      if (M.clip !== c || A.t < M.t) {
        M.clip = c;
        M.m = m;
      }
      d = m - M.m;
      M.m = m;
      M.t = A.t;
    } else if (B.clip && B.clip.vel && (!c || A.weight < 0.5)) d = B.clip.vel * B.speed * this.R.speed * dt;
    if (d) this.pos.addScaledVector(this.forward(_v3), d);
  }
  _ik() {
    for (const S of ['L', 'R']) {
      const h = this.ik[S];
      if (!h || h.w <= 0.001) continue;
      this.R.reach('arm' + S, 'fore' + S, 'hand' + S, h.target, h.pole, h.w, { rot: h.rot, stretch: h.stretch });
    }
    for (const S of ['L', 'R']) {
      const f = this.footIK[S];
      if (!f || f.w <= 0.001) continue;
      this.R.reach('leg' + S, 'shin' + S, 'foot' + S, f.target, f.pole, f.w);
    }
  }

  // ------------------------------------------------------------ eventos de los clips
  onEvent(e, c) {
    const g = this.g;
    if ((e === 'stepL' || e === 'stepR' || e === 'handL' || e === 'handR') && this.steps) {
      const bone = e === 'stepL' ? 'footL' : e === 'stepR' ? 'footR' : e === 'handL' ? 'handL' : 'handR';
      const f = this.M.byName[bone].getWorldPosition(_v);
      f.y = this.groundAt(f.x, f.z);
      const p = g.player;
      const d = Math.hypot(p.pos.x - f.x, p.pos.z - f.z);
      const k = e[0] === 'h' ? 0.75 : 1;
      g.camRig.shake(clamp(0.55 - d * 0.018, 0.05, 0.55) * k);
      g.input.rumble(0.3 * k, 0.45 * k, 160);
      g.audio && g.audio.play('beastStep', f, { k: 1.7 * k });
      if (Math.random() < 0.5) g.audio && g.audio.play('chainRun', this.bell.center(_v2), { k: 0.5 });
      g.fx.blood.emit(f.x, f.y + 0.3, f.z, 16, { color: [0.36, 0.33, 0.29], speed: 3.2, life: 0.8, up: 1.3 });
    }
    if (this.onEventHook) this.onEventHook(e, c);
  }

  // ------------------------------------------------------------ efectos
  _fx(dt) {
    const g = this.g;
    this.fx.update(g.time);
    const core = this.bp('chest', 0, 12.25, 2.2, _v);
    const L = this.lights;
    L.core.x = core.x;
    L.core.y = core.y;
    L.core.z = core.z;
    L.core.intensity = 22 + Math.sin(g.time * 5) * 4;
    const bc = this.bell.center(_v2);
    L.bell.x = bc.x;
    L.bell.y = bc.y - 1;
    L.bell.z = bc.z;
    L.bell.on = this.visible && this.bellOn !== false;
    const hc = this.bp('halo', 0, 19.5, 2, _v3);
    L.halo.x = hc.x;
    L.halo.y = hc.y;
    L.halo.z = hc.z;
    // humo y chispas del incensario
    if (this.bellOn !== false) {
      this._smokeT = (this._smokeT || 0) - dt;
      if (this._smokeT <= 0) {
        this._smokeT = 0.12;
        g.fx.blood.emit(bc.x, bc.y - 1.5, bc.z, 2, { color: [1, 0.55, 0.15], speed: 1.2, life: 0.8, up: 2.5, gravity: -1 });
      }
    }
  }

  // ------------------------------------------------------------ choques
  _colBody() {
    const B = this.M.byName,
      C = this.col;
    const W = (n, out) => B[n].getWorldPosition(out);
    const a = _v,
      b = _v2;
    C.begin();
    for (const S of ['L', 'R']) {
      C.add(W('leg' + S, a), W('shin' + S, b), 0.85);
      C.add(W('shin' + S, a), W('foot' + S, b), 0.62);
      C.add(W('foot' + S, a), W('toe' + S, b), 0.55);
    }
    const pel = W('pelvis', a);
    C.add(_v3.set(pel.x, pel.y + 0.4, pel.z), b.set(pel.x, pel.y - 2.2, pel.z), 2.35);
    const radii = [1.45, 1.4, 1.2, 1.0, 0.85];
    W('tail1', a);
    for (let i = 2; i <= 6; i++) {
      W('tail' + i, b);
      C.add(a, b, radii[i - 2]);
      a.copy(b);
    }
    if (this.bellOn !== false) {
      const Bl = this.bell;
      C.add(Bl.top, Bl.mouth(b).addScaledVector(Bl.up, Bl.H * 0.12), Bl.R * 0.82);
    }
    // las manos (cerca del suelo empujan; si no, sólo tapan a la cámara)
    for (const S of ['L', 'R']) {
      const h = W('hand' + S, a);
      const low = h.y - this.groundAt(h.x, h.z) < 2.6;
      C.add(h, h, 1.2, low);
    }
    // (para la cámara)
    C.add(W('spine1', a), W('chest', b), 2.0, false);
    C.add(W('chest', a), W('neck2', b), 1.25, false);
    const hd = this.head(a);
    C.add(hd, hd, 1.35, false);
    for (const S of ['L', 'R']) {
      C.add(W('arm' + S, a), W('fore' + S, b), 0.55, false);
      C.add(W('fore' + S, a), W('hand' + S, b), 0.42, false);
    }
  }
  _push() {
    const g = this.g,
      p = g.player;
    if (this.col.push(p.pos, p.body.radius, p.body.height) > 0) {
      g.world.col.resolve(p.pos, p.body.radius, p.pos.y, p.body.height, p.body.stepH ?? 0.5);
      p.visY = p.pos.y;
    }
  }
}
