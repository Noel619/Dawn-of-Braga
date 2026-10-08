// Deo Ignoto: la segunda pelea, desde la plaza contra el dios anclado en la
// nave reventada.
//
//   brazos de delante   agarran las torres; cuando ruge, las estrujan y caen
//                       sillares sobre el atrio
//   brazos de los lados sobre los tejados de los barrios: los rastrillan y
//                       llueven tejas sobre la plaza
//   brazos alzados      golpean la plaza por turnos (su sombra te sigue) y la
//                       mano se queda plantada: se trepa por el dorso hasta el
//                       sigilo del codo. Mientras estés encima no la levanta
//                       (se sacude). Muerto el sigilo, el brazo se desploma
//                       sobre las casas.
//   la máscara          muertos los dos brazos alzados, suelta las torres, se
//                       desploma hacia el atrio y la cara queda a ras de la
//                       plaza: se trepa por la grieta y se le apuñalan los ojos.
//                       La máscara se parte y el dios se hunde en la cisterna.
import * as THREE from 'three';
import { DEO_CLIPS as C, deoRig, DeoArms } from './deo_anim.js';
import { ClimbRoute } from './climb.js';
import { ColFX } from '../../entities/colossus/colfx.js';
import { Debris } from './debris.js';
import { clamp } from '../../core/util.js';

export const DEO_POS = { x: 0, z: -84 };
// dónde puede caer la palma de un golpe (dentro de la plaza)
const PLAZA = { x0: -15.5, z0: -54.5, x1: 19.5, z1: -42.5 };
// de qué lado golpea cada brazo alzado (x del mundo): por fuera de su torre
// (si no, el antebrazo pasa por encima de ella); el centro del atrio, entre
// las torres, queda a salvo de los golpes, pero no de los sillares que caen
const SIDE = { 4: [14, 19.5], 5: [-16, -13.5] };

const _v = new THREE.Vector3(),
  _v2 = new THREE.Vector3(),
  _v3 = new THREE.Vector3();
const rnd = (a, b) => a + Math.random() * (b - a);
// la máscara (como en deo.js): centro, escala y giro, en el espacio del modelo
const MASK = { c: new THREE.Vector3(0, 45.6, 15.4), s: 1.55, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.314159, 0, 0)) };
// la cabeza tumbada, en esferas (unidades de la máscara): el jugador no se
// mete dentro (la frente y el cráneo, la boca y el mentón, las mejillas)
const HEAD_BALLS = [
  [0, 1.0, -3.0, 5.2],
  [0, -2.6, -2.0, 3.9],
  [3.0, -1.0, -2.4, 3.0],
  [-3.0, -1.0, -2.4, 3.0],
];
// dónde apoya las manos al desplomarse (palmas, mundo): las de delante a los
// lados de la cara; las de los lados, sobre los tejados del claustro y del barrio
const BOW_PLANT = { 0: [15.5, -53], 1: [-15.5, -53], 2: [31, -67], 3: [-31, -67] };

export class DeoBoss {
  constructor(game, M) {
    this.g = game;
    this.M = M;
    this.E = M.extra;
    this.R = deoRig(M, {});
    this.R.look.target = new THREE.Vector3();
    this.arms = new DeoArms(this.R, M);
    this.arms.onEvent = (e, i, at) => this.onArm(e, i, at);
    this.R.action.onEvent = (e) => this.onEvent(e);
    this.R.base.onEvent = (e) => this.onEvent(e);
    // sigilos: el del codo de cada brazo alzado y los dos ojos
    this.sigils = this.E.sigils.map((s) => {
      const rw = M.restWorld[s.bone];
      const meshes = M.parts.filter((m) => m.userData.grp === 'sigil:' + s.id);
      for (const m of meshes) m.material = m.material.clone();
      return { id: s.id, b: M.byName[s.bone], off: new THREE.Vector3(s.pos[0] - rw.x, s.pos[1] - rw.y, s.pos[2] - rw.z), r: s.r, max: s.hp, hp: s.hp, eye: !!s.eye, arm: s.arm ?? null, dead: false, meshes };
    });
    this.sig = Object.fromEntries(this.sigils.map((s) => [s.id, s]));
    this._routes = Object.entries(this.E.climb).map(([id, def]) => {
      const r = new ClimbRoute(id, def, M, this);
      // (los antebrazos, tendidos hacia la plaza, se andan de pie)
      r.standY = id === 'mascara' ? 0.72 : 0.35;
      return r;
    });
    this.route = Object.fromEntries(this._routes.map((r) => [r.id, r]));
    // la máscara de bronce y su diadema (se parten al final)
    const bronze = M._mat('colBronze', { side: THREE.FrontSide }),
      gold = M._mat('gold', { side: THREE.FrontSide });
    this.mask = M.byName.head.children.filter((m) => m.isMesh && (m.material === bronze || m.material === gold));
    // efectos: los ojos y la boca arden por dentro
    this.fx = new ColFX(M);
    this.eyeGlow = this.E.fx.eyes.map((e) => this.fx.glow(e.bone, e.p, 3.4, 0xffa040, { pulse: 0.25 }));
    this.mouthGlow = this.fx.glow(this.E.fx.mouth.bone, this.E.fx.mouth.p, 6, 0xff5010, { pulse: 0.3, opacity: 0.7 });
    const L = game.fx.lights;
    this.lights = {
      eyes: L.add({ x: 0, y: -80, z: 0, color: 0xffa050, intensity: 30, range: 22, flicker: 1, priority: 8, on: false }),
      sig: L.add({ x: 0, y: -80, z: 0, color: 0xffc070, intensity: 16, range: 12, flicker: 1, priority: 7, on: false }),
    };
    this.bronze = new Debris(game.scene, 40, { color: 0x8a6a3a });
    const self = this;
    this.proxy = {
      boss: true,
      type: 'deo',
      T: { name: 'Deo Ignoto', height: 56, stalker: false },
      pos: new THREE.Vector3(0, 0, -61),
      lockHeight: 34,
      body: { radius: 6 },
      lockRange: 80,
      data: { phase: 1 },
      get lockable() {
        return self.visible && !self.dead && self.st !== 'rise';
      },
      get dead() {
        return self.dead;
      },
      get hp() {
        return self.sigils.reduce((a, s) => a + Math.max(0, s.hp), 0);
      },
      get maxHp() {
        return self.sigils.reduce((a, s) => a + s.max, 0);
      },
      distTo(p) {
        return Math.max(0, Math.hypot(p.x - self.proxy.pos.x, p.z - self.proxy.pos.z) - 6);
      },
    };
    this.visible = false;
    this.dead = false;
    this.st = 'hidden';
    this.stT = 0;
    this.slamT = 6;
    this.rakeT = 14;
    this.roarT = 20;
    this.shakeT = 6;
    this.next = 4;
    this.falling = [];
    this.marks = [];
    this.onDead = null;
    this.onBow = null;
  }

  // ---------------------------------------------------------- montaje
  show(on) {
    this.visible = on;
    const g = this.g;
    if (on && !this.M.root.parent) g.scene.add(this.M.root);
    if (!on && this.M.root.parent) this.M.root.parent.remove(this.M.root);
    for (const k in this.lights) this.lights[k].on = on;
  }
  // en la nave, entero y a la espera
  place(state = 'fight') {
    const M = this.M;
    M.root.position.set(DEO_POS.x, 0, DEO_POS.z);
    M.root.rotation.set(0, 0, 0);
    M.root.updateMatrixWorld(true);
    this.dead = false;
    for (const s of this.sigils) {
      s.hp = s.max;
      s.dead = false;
      for (const m of s.meshes) {
        m.visible = true;
        if (m.material.emissive) m.material.emissiveIntensity = 2.2;
      }
    }
    for (const m of this.mask) m.visible = true;
    for (const g of [...this.eyeGlow, this.mouthGlow]) g.visible = true;
    this.arms = new DeoArms(this.R, M);
    this.arms.onEvent = (e, i, at) => this.onArm(e, i, at);
    this.R.base = new this.R.base.constructor();
    this.R.action = new this.R.action.constructor();
    this.R.base.onEvent = (e) => this.onEvent(e);
    this.R.action.onEvent = (e) => this.onEvent(e);
    for (const j in this.R.add) delete this.R.add[j];
    this.R.shakeA = 0;
    this.R.playBase(C.idle, { blend: 0.01 });
    this.R.update(1 / 60);
    this.st = state;
    this.stT = 0;
    this.bowAt = 0;
    this.plantT = 0;
    this.shaking = 0;
    this._shakeIn = 0;
    this._roarBlastT = 0;
    this.slamT = 5;
    this.rakeT = 14;
    this.roarT = 22;
    this.shakeT = 6;
    this.next = 4;
    this.phase = 1;
    this.proxy.data.phase = 1;
    this.proxy.lockHeight = 34;
    this.proxy.pos.set(0, 0, -61);
    this.clearFalling();
    this.bronze.clear();
    this.show(true);
  }
  dispose() {
    this.show(false);
    this.clearFalling();
  }
  routes() {
    return this._routes;
  }
  center(out) {
    if (this.st === 'bow' || this.st === 'bowed' || this.st === 'dying') return this.maskP(0, 0.5, -1, out);
    return out.copy(this.M.byName.chest.getWorldPosition(out));
  }
  // un punto de la máscara (unidades de la máscara, como en deo.js) en el mundo
  maskP(x, y, z, out) {
    out.set(x * MASK.s, y * MASK.s, z * MASK.s).applyQuaternion(MASK.q).add(MASK.c);
    return this.bp('head', out.x, out.y, out.z, out);
  }
  _head(out) {
    return this.M.byName.head.getWorldPosition(out);
  }

  // ---------------------------------------------------------- brotar
  startRise() {
    this.place('rise');
    this.R.play(C.rise, { blend: 0.01 });
    this.R.action.update(0);
    this.R.update(1 / 60);
  }

  // ---------------------------------------------------------- cada fotograma
  update(dt) {
    if (!this.visible) return;
    const g = this.g,
      p = g.player;
    this.stT += dt;
    const climb = g.finale.climb;
    const R = this.R;
    R.look.target.set(p.pos.x, p.pos.y + 1, p.pos.z);
    R.look.w = this.st === 'fight' ? 1 : 0;
    const frozen = g.dev.freezeAI;
    switch (this.st) {
      case 'rise':
        if (R.action.done && this.stT > C.rise.dur - 0.05) {
          this.st = 'fight';
          this.stT = 0;
          R.stop(0.6);
          this.onRisen && this.onRisen();
        }
        break;
      case 'fight':
        if (!frozen) this._fight(dt);
        // muertos los dos brazos alzados, se desploma (a los 3,2 s)
        if (this.bowAt > 0) {
          this.bowAt -= dt;
          if (this.bowAt <= 0) this.startBow();
        }
        break;
      case 'bow':
        if (this.plantT > 0) {
          this.plantT -= dt;
          if (this.plantT <= 0) this._bowPlant();
        }
        this._dragDead(dt);
        if (this.stT > C.bow.dur - 0.05) {
          this.st = 'bowed';
          this.stT = 0;
          this.shakeT = 7;
          // tumbado: la respiración en la capa de abajo (los rugidos, encima)
          R.playBase(C.bowLoop, { blend: 0.01 });
          R.stop(0.4);
          this.proxy.lockHeight = 7;
          this.proxy.pos.set(0, 0, -50);
        }
        break;
      case 'bowed':
        if (!frozen) this._bowed(dt);
        this._dragDead(dt);
        break;
      case 'dying':
        if (this.stT > C.death.dur - 0.05 && !this.dead) {
          this.dead = true;
          this.st = 'dead';
          this.show(false);
          this.onDead && this.onDead();
        }
        break;
    }
    // la sacudida avisada (al reventarle un ojo)
    if (this._shakeIn > 0) {
      this._shakeIn -= dt;
      if (this._shakeIn <= 0) this.shaking = 2.2;
      else if (climb.active) climb.shakeWarn = Math.max(climb.shakeWarn, this._shakeIn);
    }
    // shake: decae solo
    if (this.shaking > 0) {
      this.shaking -= dt;
      R.shakeA = Math.min(1, R.shakeA + dt * 4);
    } else R.shakeA = Math.max(0, R.shakeA - dt * 2);
    climb.shake = this.st === 'bowed' ? R.shakeA : this._armShake || 0;
    this.arms.update(dt);
    R.update(dt, { pre: () => this.arms.ik() });
    this._fx(dt);
    this._falling(dt);
    // rutas: el brazo alzado plantado y vivo; la máscara, desplomado
    for (const i of [4, 5]) {
      const r = this.route['brazo' + i];
      if (r) r.on = this.arms.planted(i) && !this.sig['brazo' + i].dead;
    }
    if (this.route.mascara) this.route.mascara.on = this.st === 'bowed';
    if (!climb.active) this._push();
  }

  // ---------------------------------------------------------- pelea
  _fight(dt) {
    const g = this.g,
      p = g.player,
      climb = g.finale.climb;
    const A = this.arms;
    const live = [4, 5].filter((i) => !this.sig['brazo' + i].dead);
    const onArm = climb.active && climb.route && /^brazo/.test(climb.route.id) ? +climb.route.id.slice(5) : -1;
    // una mano plantada: espera; si estás encima, no la levanta (se sacude)
    for (const i of live) {
      const a = A.arms[i];
      if (a.st !== 'planted') continue;
      a.plantT = (a.plantT || 0) + dt;
      if (onArm === i) {
        a.plantT = Math.min(a.plantT, 3);
        this.shakeT -= dt;
        if (this.shakeT <= 0.9 && this.shakeT > 0) climb.shakeWarn = 0.5;
        if (this.shakeT <= 0) {
          this.shakeT = rnd(5.5, 8);
          A.hurt(i);
          this._armShakeT = 2.2;
          g.audio && g.audio.play('beastRoarBig', this._head(_v), { k: 0.7 });
        }
      } else if (a.plantT > (this.phase >= 2 ? 6.5 : 8.5)) {
        A.lift(i);
        a.plantT = 0;
      }
    }
    if (this._armShakeT > 0) {
      this._armShakeT -= dt;
      this._armShake = Math.min(1, (this._armShake || 0) + dt * 4);
    } else this._armShake = Math.max(0, (this._armShake || 0) - dt * 2.5);
    // el siguiente golpe
    const busy = live.some((i) => A.arms[i].st === 'windup' || A.arms[i].st === 'fall');
    const plantedN = live.filter((i) => A.arms[i].st === 'planted').length;
    this.slamT -= dt;
    if (this.slamT <= 0 && !busy && plantedN === 0 && live.length && onArm < 0) {
      // el brazo de su lado (o el que quede)
      let i = p.pos.x >= 2 ? 4 : 5;
      if (!live.includes(i)) i = live[0];
      if (A.arms[i].st === 'rest') {
        this._slam(i);
        this.slamT = this.phase >= 2 ? rnd(4.5, 6.5) : rnd(6.5, 9);
      } else this.slamT = 0.5;
    }
    // rastrillo de los tejados
    this.rakeT -= dt;
    if (this.rakeT <= 0) {
      this.rakeT = rnd(13, 18);
      const i = p.pos.x >= 2 ? 2 : 3;
      if (A.arms[i].st === 'rest') this._rake(i);
    }
    // ruge y estruja las torres
    this.roarT -= dt;
    if (this.roarT <= 0 && !busy) {
      this.roarT = rnd(18, 24);
      this._roar(true);
    }
    // la sombra del golpe sigue al jugador hasta que cae
    for (const i of live) {
      const a = A.arms[i];
      if (a.st === 'windup' && a.mark) {
        const left = a.dur - a.t;
        if (left > 0.6) {
          this._slamTarget(i, a.palmT);
          a.target = A._wristFor(i, a.palmT, a.fwd, a.target);
        }
        this._moveMark(a.mark, a.palmT, 5.5, Math.min(1, a.t / 0.8));
      }
    }
  }
  _slamTarget(i, out) {
    const p = this.g.player;
    const S = SIDE[i];
    out.set(clamp(p.pos.x + p.vx * 0.5, Math.max(PLAZA.x0, S[0]), Math.min(PLAZA.x1, S[1])), 0, clamp(p.pos.z + p.vz * 0.5, PLAZA.z0, PLAZA.z1));
    out.y = 0;
    return out;
  }
  _slam(i) {
    const A = this.arms;
    const t = this._slamTarget(i, new THREE.Vector3());
    A.slam(i, t, { windup: this.phase >= 2 ? 1.7 : 2.1, fall: 0.9 });
    const a = A.arms[i];
    a.mark = this._mark(0xff7020);
    a.plantT = 0;
    this.g.audio && this.g.audio.play('stoneCreak', this._head(_v), { k: 1.2 });
  }
  _rake(i) {
    const A = this.arms;
    const side = i === 2 ? 1 : -1;
    const at = new THREE.Vector3(side * 17, 8, -58);
    A.rake(i, at, { dur: 4.6 });
    // tejas y vigas que caen sobre la plaza
    for (let k = 0; k < 8; k++) this._fallLater(1.4 + k * 0.22, 'tile', side);
    this.g.audio && this.g.audio.play('woodBreak', at, { k: 1.4 });
  }
  _roar(squeeze) {
    const g = this.g;
    this.R.play(C.roar, { blend: 0.3 });
    if (squeeze) {
      this.arms.squeeze(0);
      this.arms.squeeze(1);
      for (let k = 0; k < 6; k++) this._fallLater(1.6 + k * 0.3, 'block', k % 2 ? 1 : -1);
    }
    g.audio && g.audio.play('beastRoarBig', this._head(_v), { k: 1.6 });
  }

  // ---------------------------------------------------------- desplomado
  startBow() {
    this.st = 'bow';
    this.stT = 0;
    this.clearFalling();
    this.R.play(C.bow, { blend: 0.4 });
    // suelta las torres y, al caer, se apoya en la plaza y en los tejados
    this.plantT = 2.6;
    this._deadFrom = null;
    this.onBow && this.onBow();
  }
  _bowPlant() {
    const col = this.g.world.col;
    for (const i of [0, 1, 2, 3]) {
      const [x, z] = BOW_PLANT[i];
      const y = i < 2 ? 0 : col.groundHeight(x, z, 0.5, 30) + 0.4;
      const fwd = i < 2 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(Math.sign(x), 0, 0.35);
      this.arms.plant(i, new THREE.Vector3(x, y, z), { dur: i < 2 ? 1.7 : 2.3, fwd });
    }
  }
  // los brazos muertos se arrastran por los tejados con el cuerpo: la mano
  // caída sigue al hombro (sin despegarse del todo de donde cayó)
  _dragDead(dt) {
    for (const i of [4, 5]) {
      const a = this.arms.arms[i];
      if (a.st !== 'dead' || !a.pinned) continue;
      const sh = this.M.byName[`a${i}s`].getWorldPosition(_v);
      if (!a.drag) a.drag = { off: a.pin.clone().sub(sh), sh0: sh.clone() };
      // la mano: el hombro de ahora más lo que se apartaba, recogido un poco
      _v2.copy(a.drag.off).multiplyScalar(0.8).add(sh);
      _v2.y = this.g.world.col.groundHeight(_v2.x, _v2.z, 0.5, 30) + 1.2;
      a.pin.lerp(_v2, 1 - Math.exp(-dt * 1.6));
    }
  }
  _bowed(dt) {
    const g = this.g,
      p = g.player,
      climb = g.finale.climb;
    const onMask = climb.active && climb.route && climb.route.id === 'mascara';
    // acabado el rugido, vuelve a respirar
    const A = this.R.action;
    if (A.clip === C.bowRoar && A.done && A.targetWeight > 0) this.R.stop(0.6);
    this.shakeT -= dt;
    if (onMask) {
      // te sacude de la cara
      if (this.shakeT <= 0.9 && this.shakeT > 0) climb.shakeWarn = 0.5;
      if (this.shakeT <= 0) {
        this.shakeT = rnd(5.5, 8);
        this.shaking = 2.0;
        g.audio && g.audio.play('beastRoarBig', this._head(_v), { k: 0.9 });
      }
    } else if (this.shakeT <= 0) {
      // ruge: el aliento tira al suelo a quien esté delante de la cara y
      // llueven las piedras que el desplome lanzó al cielo
      this.shakeT = rnd(7, 10);
      this.R.play(C.bowRoar, { blend: 0.3 });
      this._roarBlastT = 0.9;
      for (let k = 0; k < 5; k++) this._fallLater(1.2 + k * 0.4, 'sky', 0);
    }
    if (this._roarBlastT > 0) {
      this._roarBlastT -= dt;
      if (this._roarBlastT <= 0) {
        const m = this.maskP(0, -2.8, 2.5, _v);
        const d = Math.hypot(p.pos.x - m.x, p.pos.z - m.z);
        g.combat.ring(m.x, 0.15, m.z + 2, 14, 0xff9040, 0.8);
        if (d < 13 && !p.dead && !climb.active) this._hurt(24, m, { knock: 11 });
      }
    }
  }

  // ---------------------------------------------------------- sigilos
  sigilPos(s, out) {
    return out.copy(s.off).applyMatrix4(s.b.matrixWorld);
  }
  sigilNear(hand) {
    for (const s of this.sigils) {
      if (s.dead) continue;
      if (s.eye && this.st !== 'bowed') continue;
      if (!s.eye && !this.arms.planted(s.arm)) continue;
      // (el ojo, al fondo de la cuenca: se alcanza desde cualquier sitio de ella)
      if (this.sigilPos(s, _v3).distanceTo(hand) < s.r + (s.eye ? 2.4 : 1.6)) return s;
    }
    return null;
  }
  stab(id, power) {
    const s = this.sig[id];
    if (!s || s.dead) return;
    const g = this.g;
    s.hp = Math.max(0, s.hp - power);
    const at = this.sigilPos(s, _v);
    g.fx.blood.emit(at.x, at.y, at.z, 40 + Math.round(power * 40), { speed: 7 + power * 4, up: 2 });
    g.fx.blood.emit(at.x, at.y, at.z, 14 + Math.round(power * 16), { color: [1, 0.82, 0.4], speed: 5, life: 0.5, up: 1.5 });
    g.combat.impactFlash(at.x, at.y, at.z, 2 + power, 0xffc070);
    g.audio && g.audio.play('fleshTear', at, { k: 1 + power * 0.6 });
    g.flash = Math.max(g.flash, 0.15 + power * 0.25);
    g.flashTint = [1, 0.75, 0.4];
    // (tumbado, poco: le estás trepando por la cara)
    this.R.flinch.x.kick(this.st === 'bowed' ? -(0.08 + power * 0.14) : -(0.3 + power * 0.6));
    g.audio && g.audio.play('beastHurt', this._head(_v2), { k: 1 + power * 0.5 });
    if (!s.eye) this.arms.hurt(s.arm);
    this.shakeT = Math.min(this.shakeT, 1.5);
    if (s.hp <= 0.001) this.killSigil(s);
  }
  flesh() {
    this.shakeT = Math.min(this.shakeT, 2.5);
  }
  killSigil(s) {
    const g = this.g;
    s.dead = true;
    for (const m of s.meshes) if (m.material.emissive) m.material.emissiveIntensity = 0.05;
    const at = this.sigilPos(s, _v);
    g.fx.blood.emit(at.x, at.y, at.z, 120, { speed: 10, up: 3 });
    g.audio && g.audio.play('fleshBurst', at, { k: 1.4 });
    g.hitstop = Math.max(g.hitstop, 0.22);
    g.slowmo = { t: 0.6, k: 0.4 };
    g.camRig.shake(0.8);
    g.flash = Math.max(g.flash, 0.4);
    const climb = g.finale.climb;
    if (!s.eye) {
      // el brazo, muerto, se desploma sobre las casas (quien esté encima, fuera)
      if (climb.active) climb.release(_v2.set(0, 4, 4));
      this.arms.kill(s.arm);
      g.audio && g.audio.play('beastRoarBig', this._head(_v2), { k: 1.8 });
      const left = [4, 5].filter((i) => !this.sig['brazo' + i].dead).length;
      this.phase = left === 0 ? 3 : 2;
      this.proxy.data.phase = this.phase;
      if (left === 0) this.bowAt = 3.2;
      this.onPhase && this.onPhase(this.phase);
    } else {
      // un ojo: la llama se apaga
      const k = s.id === 'ojoL' ? 0 : 1;
      if (this.eyeGlow[k]) this.eyeGlow[k].visible = false;
      if (this.sigils.filter((x) => x.eye && !x.dead).length === 0) this.startDeath();
      else {
        // ruge de dolor y, al poco (con aviso), se revuelve para quitarte de encima
        this.R.play(C.bowRoar, { blend: 0.2 });
        this._shakeIn = 1.0;
        climb.shakeWarn = 1.0;
        this.shakeT = Math.max(this.shakeT, 6);
      }
    }
  }
  startDeath() {
    const g = this.g;
    const climb = g.finale.climb;
    // (te suelta sin hacerte daño: es el final)
    if (climb.active) climb.release(_v2.set(0, 3, 5), true);
    this.st = 'dying';
    this.stT = 0;
    this.R.play(C.death, { blend: 0.3 });
    // la máscara se parte
    const h = this.maskP(0, 0.5, 1.5, _v);
    for (const m of this.mask) m.visible = false;
    for (const gl of [...this.eyeGlow, this.mouthGlow]) gl.visible = false;
    this.bronze.burst(h, 26, { speed: 8, up: 7, size: 1.8, spread: 5, dir: _v2.set(0, 0, 0.6) });
    this.bronze.burst(this.maskP(0, -3, 1.5, _v2), 14, { speed: 6, up: 5, size: 1.4, spread: 4 });
    g.audio && g.audio.play('pillarBreak', h, { k: 1.6 });
    g.audio && g.audio.play('bellToll', h, { k: 1.3 });
    g.flash = 0.6;
    g.flashTint = [1, 0.8, 0.5];
    g.camRig.shake(1);
    this.onDying && this.onDying();
  }

  // ---------------------------------------------------------- eventos
  onArm(e, i, at) {
    const g = this.g;
    if (e === 'impact') {
      const a = this.arms.arms[i];
      if (a.mark) {
        this._removeMark(a.mark);
        a.mark = null;
      }
      const P = at.clone();
      P.y = 0;
      const p = g.player;
      const d = Math.hypot(p.pos.x - P.x, p.pos.z - P.z);
      if (d < 5.5 && p.pos.y < 3) this._hurt(85, P, { knock: 14 });
      g.combat.shockwave(P.x, 0, P.z, 10, 38, this.proxy, 12);
      g.combat.ring(P.x, 0.1, P.z, 15, 0xff7020, 0.9);
      g.fx.blood.emit(P.x, 0.6, P.z, 80, { color: [0.36, 0.33, 0.29], speed: 11, life: 1.1, up: 5 });
      g.finale.debris.burst(P, 28, { speed: 10, up: 9, size: 1.1, spread: 4 });
      g.finale.decal(P, 8);
      g.audio && g.audio.play('slam', P, { k: 1.8 });
      g.audio && g.audio.play('explosion', P, { k: 0.9 });
      g.camRig.shake(1);
      g.input.rumble(1, 1, 400);
      g.finale.onImpact && g.finale.onImpact(P, 10, 'hand');
    } else if (e === 'armFell') {
      const P = at.clone();
      g.fx.blood.emit(P.x, P.y, P.z, 90, { color: [0.36, 0.33, 0.29], speed: 10, life: 1.2, up: 5 });
      g.finale.debris.burst(P, 30, { speed: 9, up: 10, size: 1.3, spread: 5 });
      g.audio && g.audio.play('wallBreak', P, { k: 1.8 });
      g.audio && g.audio.play('explosion', P, { k: 0.9 });
      g.camRig.shake(0.9);
      g.finale.onImpact && g.finale.onImpact(P, 12, 'arm');
    } else if (e === 'plant') {
      const P = at.clone();
      g.finale.debris.burst(P, 16, { speed: 6, up: 6, size: 0.9, spread: 3 });
      g.audio && g.audio.play('slam', P, { k: 1.3 });
      g.camRig.shake(0.6);
    }
  }
  onEvent(e) {
    const g = this.g;
    if (e === 'roar') {
      g.warp = 1;
      g.camRig.shake(0.7);
      g.audio && g.audio.play('beastRoarBig', this._head(_v), { k: 1.8 });
    } else if (e === 'sideSlam') {
      for (const i of [2, 3]) {
        const P = this.arms.palm(i, new THREE.Vector3());
        g.finale.debris.burst(P, 16, { speed: 7, up: 8, size: 1.0, spread: 4 });
        g.audio && g.audio.play('wallBreak', P, { k: 1.6 });
      }
      g.camRig.shake(0.8);
    } else if (e === 'grip') {
      g.audio && g.audio.play('stoneCreak', { x: 0, y: 30, z: -60 }, { k: 1.5 });
      g.camRig.shake(0.5);
    } else if (e === 'arms') {
      g.audio && g.audio.play('fleshTear', { x: 0, y: 40, z: -84 }, { k: 2 });
    } else if (e === 'facade') {
      this.onFacade && this.onFacade();
    } else if (e === 'crash') {
      // el mentón contra el empedrado
      const at = this.maskP(0, -5.2, 0.5, new THREE.Vector3());
      at.y = 0;
      g.finale.debris.burst(at, 34, { speed: 11, up: 8, size: 1.3, spread: 6 });
      g.fx.blood.emit(at.x, 1, at.z, 110, { color: [0.4, 0.37, 0.33], speed: 12, life: 1.8, up: 4 });
      g.combat.ring(at.x, 0.1, at.z + 1, 18, 0xffb070, 1.0);
      g.finale.decal(at, 9);
      g.audio && g.audio.play('slam', at, { k: 2 });
      g.audio && g.audio.play('explosion', at, { k: 1.2 });
      g.flash = Math.max(g.flash, 0.35);
      g.camRig.shake(1);
      g.input.rumble(1, 1, 800);
      // (quien estuviera debajo, fuera)
      const p = g.player;
      if (!p.dead && this._inHead(p.pos, 1.5)) this._hurt(60, at, { knock: 16 });
    } else if (e === 'convulse') {
      g.audio && g.audio.play('beastHurt', this._head(_v), { k: 2 });
      g.camRig.shake(0.6);
    } else if (e === 'rear') {
      g.audio && g.audio.play('beastRoarBig', this._head(_v), { k: 2 });
      g.camRig.shake(0.8);
    } else if (e === 'sink') {
      g.audio && g.audio.play('stoneCreak', this._head(_v), { k: 2 });
      g.camRig.shake(0.7);
    }
  }
  _hurt(dmg, from, o = {}) {
    return this.g.combat.apply(this.proxy, { dmg, knock: o.knock ?? 9, stagger: true, unblockable: true, noParry: true }, from.x, from.z);
  }

  // ---------------------------------------------------------- lo que cae del cielo
  // sillares de las torres o tejas de los tejados, con su sombra en el suelo
  _fallLater(t, kind, side) {
    this._fallQ = this._fallQ || [];
    this._fallQ.push({ t, kind, side });
  }
  _spawnFall(kind, side) {
    const g = this.g,
      p = g.player;
    let from, to;
    if (kind === 'block') {
      // de lo alto de una torre al atrio
      from = new THREE.Vector3(side * 9 + rnd(-3, 3), rnd(24, 30), -60 + rnd(-2, 2));
      to = new THREE.Vector3(clamp(p.pos.x + rnd(-5, 5), -16, 20), 0, clamp(p.pos.z + rnd(-4, 4), -55, -43));
    } else if (kind === 'sky') {
      // lo que el desplome lanzó al aire: cae casi a plomo alrededor del jugador
      to = new THREE.Vector3(clamp(p.pos.x + rnd(-6, 6), -16, 20), 0, clamp(p.pos.z + rnd(-5, 5), -55, -41));
      if (Math.abs(to.x) < 10) to.z = Math.max(to.z, -45);
      from = new THREE.Vector3(to.x + rnd(-4, 4), rnd(26, 32), to.z - rnd(4, 9));
    } else {
      from = new THREE.Vector3(side * rnd(17, 22), rnd(10, 13), rnd(-56, -44));
      to = new THREE.Vector3(clamp(p.pos.x + rnd(-6, 6), -16, 20), 0, clamp(p.pos.z + rnd(-5, 5), -55, -43));
    }
    const T = kind === 'tile' ? 1.2 : 1.5;
    const grav = 16;
    const vel = new THREE.Vector3((to.x - from.x) / T, (to.y - from.y + 0.5 * grav * T * T) / T, (to.z - from.z) / T);
    const size = kind === 'tile' ? rnd(0.7, 1.1) : rnd(1.2, 1.8);
    const mesh = new THREE.Mesh(this._blockGeo(), this.g.finale.debris.mat);
    mesh.scale.set(size, size * 0.7, size);
    mesh.position.copy(from);
    g.scene.add(mesh);
    const mark = this._mark(0xff5010);
    this.falling.push({ kind, pos: from, vel, grav, to, mesh, mark, size, t: 0, T, spin: new THREE.Vector3(rnd(-3, 3), rnd(-3, 3), rnd(-3, 3)) });
  }
  _blockGeo() {
    return this._bg || (this._bg = new THREE.BoxGeometry(1, 1, 1));
  }
  _falling(dt) {
    const g = this.g;
    if (this._fallQ && this._fallQ.length) {
      for (const f of this._fallQ) f.t -= dt;
      while (this._fallQ.length && this._fallQ[0].t <= 0) {
        const f = this._fallQ.shift();
        this._spawnFall(f.kind, f.side);
      }
    }
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const F = this.falling[i];
      F.t += dt;
      F.vel.y -= F.grav * dt;
      F.pos.addScaledVector(F.vel, dt);
      F.mesh.position.copy(F.pos);
      F.mesh.rotation.x += F.spin.x * dt;
      F.mesh.rotation.y += F.spin.y * dt;
      this._moveMark(F.mark, F.to, F.size * 1.6, Math.min(1, F.t / F.T));
      if (F.pos.y <= F.to.y + F.size * 0.35 || F.t > F.T + 0.4) {
        const p = g.player;
        if (Math.hypot(p.pos.x - F.to.x, p.pos.z - F.to.z) < F.size + 0.8 && p.pos.y < 2.5) this._hurt(F.kind === 'tile' ? 20 : 36, F.to, { knock: 6 });
        g.finale.debris.burst(F.to, F.kind === 'tile' ? 5 : 8, { speed: 4, up: 4, size: F.size * 0.5, spread: 1 });
        g.fx.blood.emit(F.to.x, 0.3, F.to.z, 14, { color: [0.36, 0.33, 0.29], speed: 4, life: 0.6, up: 2 });
        g.audio && g.audio.play(F.kind === 'tile' ? 'woodBreak' : 'pillarBreak', F.to, { k: 0.9 });
        g.camRig.shake(0.15);
        g.scene.remove(F.mesh);
        this._removeMark(F.mark);
        this.falling.splice(i, 1);
      }
    }
  }
  clearFalling() {
    for (const F of this.falling) {
      this.g.scene.remove(F.mesh);
      this._removeMark(F.mark);
    }
    this.falling.length = 0;
    this._fallQ = [];
    for (const m of [...this.marks]) this._removeMark(m);
  }
  _mark(color) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.frustumCulled = false;
    this.g.scene.add(m);
    this.marks.push(m);
    return m;
  }
  _moveMark(m, at, r, a) {
    if (!m) return;
    m.position.set(at.x, (at.y || 0) + 0.06, at.z);
    m.scale.set(r, 1, r);
    m.material.opacity = 0.4 * a * (0.75 + 0.25 * Math.sin(this.g.time * 14));
  }
  _removeMark(m) {
    if (!m) return;
    this.g.scene.remove(m);
    m.geometry.dispose();
    m.material.dispose();
    const i = this.marks.indexOf(m);
    if (i >= 0) this.marks.splice(i, 1);
  }

  // ---------------------------------------------------------- efectos
  _fx(dt) {
    const g = this.g;
    this.fx.update(g.time);
    this.bronze.update(dt, (x, z) => g.world.col.groundHeight(x, z, 0.1, 2));
    const L = this.lights;
    const h = this.bp('head', 0, 45, 14, _v);
    L.eyes.x = h.x;
    L.eyes.y = h.y;
    L.eyes.z = h.z;
    L.eyes.intensity = this.st === 'dying' ? 0 : 26 + Math.sin(g.time * 3) * 5;
    // el sigilo que se puede apuñalar ahora, con luz
    const s = this.sigils.find((x) => !x.dead && ((x.eye && this.st === 'bowed') || (!x.eye && this.arms.planted(x.arm))));
    if (s) {
      this.sigilPos(s, _v2);
      L.sig.x = _v2.x;
      L.sig.y = _v2.y;
      L.sig.z = _v2.z;
      L.sig.on = true;
    } else L.sig.on = false;
    for (const x of this.sigils) {
      if (x.dead) continue;
      for (const m of x.meshes) if (m.material.emissive) m.material.emissiveIntensity = 1.8 + Math.sin(g.time * 3 + x.r * 5) * 0.7;
    }
  }
  bp(bone, x, y, z, out) {
    const rw = this.M.restWorld[bone];
    return out.set(x - rw.x, y - rw.y, z - rw.z).applyMatrix4(this.M.byName[bone].matrixWorld);
  }
  // el jugador no se mete en las manos plantadas
  // ¿está p dentro de la cabeza tumbada (con margen r)? Devuelve la esfera
  _inHead(p, r = 0.4) {
    for (const b of HEAD_BALLS) {
      const c = this.maskP(b[0], b[1], b[2], _v3);
      const R = b[3] * MASK.s + r;
      // (la altura del jugador: de los pies a la cabeza)
      const hy = clamp(c.y, p.y, p.y + 1.8);
      const dy = hy - c.y;
      if (Math.abs(dy) >= R) continue;
      const rh = Math.sqrt(R * R - dy * dy);
      if (Math.hypot(p.x - c.x, p.z - c.z) < rh) return { c: c.clone(), rh };
    }
    return null;
  }
  _push() {
    const g = this.g,
      p = g.player;
    if (p.dead || p.puppet) return;
    if (this.st === 'bow' || this.st === 'bowed' || this.st === 'dying') {
      for (let k = 0; k < 3; k++) {
        const h = this._inHead(p.pos);
        if (!h) break;
        const dx = p.pos.x - h.c.x,
          dz = p.pos.z - h.c.z;
        const d = Math.hypot(dx, dz) || 1e-4;
        p.pos.x = h.c.x + (dx / d) * (h.rh + 0.01);
        p.pos.z = h.c.z + (dz / d) * (h.rh + 0.01);
      }
    }
    for (const i of [0, 1, 4, 5]) {
      const a = this.arms.arms[i];
      if (a.st !== 'planted' && a.st !== 'dead') continue;
      const P = this.arms.palm(i, _v);
      if (P.y > 6) continue;
      const dx = p.pos.x - P.x,
        dz = p.pos.z - P.z;
      const d = Math.hypot(dx, dz);
      const R = 3.2;
      if (d < R && d > 1e-4) {
        p.pos.x = P.x + (dx / d) * R;
        p.pos.z = P.z + (dz / d) * R;
      }
    }
  }
  playerSwing() {
    return false;
  }
}
