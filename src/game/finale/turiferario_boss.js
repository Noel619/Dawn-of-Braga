// El Turiferario, coloso: la pelea en el centro de la ciudad.
//
// Sale del empedrado del atrio de la Sé (las manzanas de alrededor revientan
// con él: ver director.js) y pelea por todo el centro: el atrio, las ruinas y
// la plaza del pan; si huyes, te sigue entre los escombros. No se le hiere a
// golpes: hay que treparle y apuñalar sus sigilos (la nuca, el dorso de la
// mano de la cadena y, de rodillas, el núcleo del pecho). Los caminos para
// subir se abren con sus propios ataques:
//   la cola        la arrastra siempre: de la punta a la espalda y la nuca
//   la cadena      tras el mazazo la campana se queda clavada: hasta la mano
//   la garra       si el zarpazo falla, la mano se queda plantada: al hombro
//   la casulla     de rodillas: hasta el pecho abierto
//
// Fases: 1, los dos sigilos vivos; 2, muerto uno (más rápido, lluvia de cera
// y doble giro); 3, muertos los dos: cae de rodillas con el costillar
// abierto. Apuñalado el núcleo, se hincha y revienta (lo sigue director.js).
import * as THREE from 'three';
import { TUR_CLIPS as C, WALK, turRig } from './turiferario_anim.js';
import { BellChain } from './bell.js';
import { ChainRoute, PLAYER_CLIPS } from './climb.js';
import { SkinSurface } from './surface.js';
import { ColBody } from './colbody.js';
import { Field } from './field.js';
import { sigilDecal } from '../../entities/colossus/sigil_decal.js';
import { ColFX } from '../../entities/colossus/colfx.js';
import { clamp, angleDiff } from '../../core/util.js';

// el campo de batalla: el atrio de la Sé, las manzanas que revientan al salir
// él y la plaza del pan. Dónde puede plantarse (la pelvis: y siempre a
// STAND_R de las casas que quedan en pie, ver field.js) y hasta dónde llegan
// la cola y la campana (las casas de alrededor las paran: chocan contra las
// fachadas y les revientan los tejados)
export const LARGO = { x0: -18, z0: -56, x1: 22, z1: -40 };
export const BATTLE = { x0: -19, z0: -52.5, x1: 17.5, z1: 10 };
const STAND = BATTLE;
const STAND_R = 4.2;
const WALLS = [-27, -58, 25, 16];
export const TUR_HOME = { x: 4.5, z: -46.5 };

const _v = new THREE.Vector3(),
  _v2 = new THREE.Vector3(),
  _v3 = new THREE.Vector3(),
  _v4 = new THREE.Vector3(),
  _q = new THREE.Quaternion();
const DEG = Math.PI / 180;
const rnd = (a, b) => a + Math.random() * (b - a);
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const strike = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.pow(1 - u, 3) * (1 + 3 * u));

// distancia de p al segmento a-b (en el plano), y el punto
function segDist2D(px, pz, ax, az, bx, bz) {
  const dx = bx - ax,
    dz = bz - az;
  const L2 = dx * dx + dz * dz || 1e-6;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / L2, 0, 1);
  const cx = ax + dx * t,
    cz = az + dz * t;
  return { d: Math.hypot(px - cx, pz - cz), cx, cz, t };
}

// la zona de la piel según su hueso dominante
function turZone(b) {
  if (/^tail/.test(b)) return 'cola';
  if (/^(arm|fore|hand|f\d|th)L/.test(b)) return 'brazoL';
  if (/^(arm|fore|hand|f\d|th)R/.test(b)) return 'brazoR';
  if (/^(leg|shin|foot|toe)/.test(b)) return 'pierna';
  if (b === 'head' || b === 'jaw' || b === 'halo') return 'cabeza';
  if (/^rib/.test(b)) return 'pecho';
  return 'espalda';
}

export class TurBoss {
  constructor(game, M) {
    this.g = game;
    this.M = M;
    this.E = M.extra;
    const col = game.world.col;
    // (el suelo de la plaza, no los trastos: la pira, el carro)
    this.groundAt = (x, z) => col.groundHeight(x, z, 0.2, 0.7);
    this.R = turRig(M, { groundAt: this.groundAt });
    // las casas en pie alrededor (las del centro, en ruinas durante la pelea,
    // no cuentan)
    const houses = (game.level.ctx.houseRects || []).filter((r) => !r.sub && !(r.groups ? r.groups.includes('centro') : r.group === 'centro'));
    this.field = new Field(game.level.S, { x0: WALLS[0] - 8, z0: WALLS[1] - 8, x1: WALLS[2] + 8, z1: WALLS[3] + 8 }, { houses });
    this.R.bounds = WALLS;
    this.R.field = this.field;
    this.R.look.target = new THREE.Vector3();
    this.R.action.onEvent = (e, c) => this.onEvent(e, c);
    this.R.base.onEvent = (e, c) => this.onEvent(e, c);
    // la campana y su cadena
    this.bell = new BellChain(game.scene, M.groups.bell, { bellH: this.E.sizes.bellH, radius: 3.0, len: this.E.sizes.chain.len, groundAt: this.groundAt, bounds: WALLS, field: this.field });
    // contra una fachada: revienta piedra (ver _bellWall)
    this.bell.onWall = (at, n, sp) => this._bellWall(at, n, sp);
    this.bell.mesh.visible = false;
    this.bell.bell.visible = false;
    // por dónde se trepa: toda su piel (la carne, la casulla y el alba; lo
    // que tapa la ropa se trepa por fuera, por la tela) y la cadena de la
    // campana cuando se queda clavada
    this.chainRoute = new ChainRoute('cadena', this.bell, { sigil: 'mano' });
    const mesh = (n) => M.meshes.find((m) => m.name === n);
    this.surface = new SkinSurface(M, [
      { mesh: mesh('body'), tag: 'carne', zone: (t, b) => turZone(b), coveredBy: [1, 2] },
      { mesh: mesh('casulla'), tag: 'casulla', ds: true, zone: (t, b) => (/^casB/.test(b) ? 'espalda' : 'casulla') },
      { mesh: mesh('alba'), tag: 'alba', ds: true, zone: () => 'alba', coveredBy: [1], coverDist: 2.2 },
    ]);
    this.surface.enabled = (z) => this.zoneOn(z);
    // su cuerpo para chocar (el jugador no lo atraviesa; la cámara no se mete)
    this.col = new ColBody();
    // sigilos: tallados en su propia piel (se doblan y respiran con ella); el
    // núcleo, el carbón del pecho
    const body = M.meshes.find((m) => m.name === 'body');
    this.sigils = this.E.sigils.map((s) => {
      const rw = M.restWorld[s.bone];
      const meshes = s.core ? [] : [sigilDecal(M, body, s.pos, s.normal, s.r * 1.35, { rot: s.id === 'mano' ? 0.4 : 0 })];
      return { id: s.id, b: M.byName[s.bone], off: new THREE.Vector3(s.pos[0] - rw.x, s.pos[1] - rw.y, s.pos[2] - rw.z), r: s.r, max: s.hp, hp: s.hp, core: !!s.core, dead: false, meshes, n: new THREE.Vector3(...(s.normal || [0, 0, 1])).normalize() };
    });
    this.sig = Object.fromEntries(this.sigils.map((s) => [s.id, s]));
    // llamas, brillos y luces (las luces, del pool del juego: ningún shader se recompila)
    this.fx = new ColFX(M);
    for (const c of this.E.fx.candles) this.fx.flame(c.bone, c.p, [0.55, 1.05]);
    this.coreGlow = this.fx.glow('chest', [0, 12.25, 1.35], 3.4, 0xff6a20, { pulse: 0.22 });
    this.bellGlow = new THREE.Sprite(this.coreGlow.material.clone());
    this.bellGlow.scale.set(5, 5, 1);
    this.bellGlow.position.set(0, -this.E.sizes.bellH * 0.75, 0);
    this.bellGlow.material.color.setHex(0xff5a14);
    this.bell.bell.add(this.bellGlow);
    const L = game.fx.lights;
    this.lights = {
      core: L.add({ x: 0, y: -50, z: 0, color: 0xff7a30, intensity: 26, range: 15, flicker: 1, priority: 6, on: false }),
      bell: L.add({ x: 0, y: -50, z: 0, color: 0xff6a20, intensity: 20, range: 12, flicker: 1, priority: 5, on: false }),
      halo: L.add({ x: 0, y: -50, z: 0, color: 0xffb060, intensity: 14, range: 13, flicker: 1, priority: 4, on: false }),
    };
    // lo que ve el resto del juego (barra del jefe, fijado, golpes de combat.js)
    const self = this;
    this.proxy = {
      boss: true,
      type: 'turiferario',
      T: { name: 'El Turiferario', height: 21, stalker: false },
      pos: new THREE.Vector3(),
      lockHeight: 12,
      body: { radius: 3.2 },
      lockRange: 40,
      data: { phase: 1 },
      get lockable() {
        return self.visible && !self.dead && self.st !== 'emerge';
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
        return Math.max(0, Math.hypot(p.x - self.pos.x, p.z - self.pos.z) - 3.2);
      },
    };
    this.pos = new THREE.Vector3();
    this.yaw = 0;
    this.visible = false;
    this.dead = false;
    this.st = 'hidden';
    this.stT = 0;
    this.atk = null;
    this.phase = 1;
    this.cool = {};
    this.thinkT = 0;
    this.shakeCool = 4;
    this.drops = [];
    this.marks = [];
    this.onBurst = null;
    this.onPhase = null;
    this.onHurtPlayer = null;
    this.grabbed = false;
    this.speedK = 1;
    this.handIK = null; // { target, w } la garra
    this.pain = 0;
  }

  // ---------------------------------------------------------- montaje
  show(on) {
    this.visible = on;
    const g = this.g;
    if (on && !this.M.root.parent) g.scene.add(this.M.root);
    if (!on && this.M.root.parent) this.M.root.parent.remove(this.M.root);
    this.bell.mesh.visible = on;
    this.bell.bell.visible = on;
    for (const k in this.lights) this.lights[k].on = on;
  }
  dispose() {
    this.show(false);
    this.bell.dispose();
    const L = this.g.fx.lights;
    for (const k in this.lights) {
      const i = L.sources.indexOf(this.lights[k]);
      if (i >= 0) L.sources.splice(i, 1);
    }
    this.clearDrops();
  }
  // en la plaza, de pie, mirando a (lx, lz); todo entero otra vez
  place(x, z, yaw, o = {}) {
    this.bellGlow.scale.set(5, 5, 1);
    this.bellGlow.material.opacity = 1;
    this.R.groundOn = true;
    this.bell.noGround = false;
    this.pos.set(x, this.groundAt(x, z), z);
    this.yaw = yaw;
    this.dead = false;
    this.phase = 1;
    this.speedK = 1;
    this.R.speed = 1;
    this.cool = {};
    this.pain = 0;
    this.grabbed = false;
    this.handIK = null;
    for (const s of this.sigils) {
      s.hp = s.max;
      s.dead = false;
      if (s.glow) s.glow.visible = true;
      for (const m of s.meshes) {
        m.visible = true;
        if (m.material.emissive) m.material.emissiveIntensity = 2.2;
      }
    }
    this.coreGlow.visible = true;
    this.proxy.data.phase = 1;
    this._applyRoot();
    this.R.base = new this.R.base.constructor();
    this.R.action = new this.R.action.constructor();
    this.R.base.onEvent = (e, c) => this.onEvent(e, c);
    this.R.action.onEvent = (e, c) => this.onEvent(e, c);
    this.R.playBase(C.idle, { blend: 0.01 });
    this.R.shakeA = 0;
    for (const j in this.R.add) delete this.R.add[j];
    this.R.update(1 / 60);
    this.R.resetDyn();
    for (let i = 0; i < 30; i++) this.R.update(1 / 30);
    this.bell.reset(this.handGrip(_v));
    for (let i = 0; i < 60; i++) this.bell.update(1 / 60, this.handGrip(_v));
    this.st = o.state || 'idle';
    this.stT = 0;
    this.atk = null;
    this.thinkT = o.wait ?? 1.5;
    this.clearDrops();
    this.show(true);
  }
  _applyRoot() {
    const r = this.M.root;
    this.pos.y = this.groundAt(this.pos.x, this.pos.z);
    r.position.copy(this.pos);
    r.rotation.set(0, this.yaw, 0);
    r.updateMatrixWorld(true);
    this.proxy.pos.copy(this.pos);
  }
  // punto (espacio del modelo en reposo) pegado a un hueso → mundo
  bp(bone, x, y, z, out) {
    const rw = this.M.restWorld[bone];
    return out.set(x - rw.x, y - rw.y, z - rw.z).applyMatrix4(this.M.byName[bone].matrixWorld);
  }
  // punto del espacio del modelo (sin hueso: la raíz) → mundo
  wp(x, y, z, out) {
    return out.set(x, y, z).applyMatrix4(this.M.root.matrixWorld);
  }
  // el centro del cuerpo (la cámara de trepar mira hacia aquí)
  center(out) {
    return this.bp('chest', 0, 11, -0.5, out);
  }
  handGrip(out) {
    return this.bp('handR', -5.3, 5.2, 2.75, out);
  }
  palmL(out) {
    return this.bp('handL', 5.3, 5.3, 2.7, out);
  }
  ropes() {
    return [this.chainRoute];
  }
  // ¿se puede trepar ahora por esta zona? (la cola, no mientras barre)
  zoneOn(z) {
    if (z === 'cola') return !(this.st === 'attack' && this.atk && (this.atk.name === 'tail' || this.atk.name === 'spin')) && this.st !== 'emerge' && this.st !== 'dying';
    return this.st !== 'emerge' && this.st !== 'dying' && this.st !== 'dead';
  }
  // ¿(x, z) cae sobre las ruinas de una casa del centro?
  onRuins(x, z) {
    const S = this.g.level.S;
    const i = Math.floor((x - S.x0) / S.res),
      j = Math.floor((z - S.z0) / S.res);
    return i >= 0 && j >= 0 && i < S.w && j < S.h && S.cells[j * S.w + i] === 2;
  }
  forward(out = _v4) {
    return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }
  // jugador respecto al coloso: distancia (en el suelo) y ángulo (0 = de frente)
  rel() {
    const p = this.g.player.pos;
    const dx = p.x - this.pos.x,
      dz = p.z - this.pos.z;
    return { d: Math.hypot(dx, dz), a: angleDiff(this.yaw, Math.atan2(dx, dz)), dx, dz };
  }

  // ---------------------------------------------------------- estados
  setIdle(wait = rnd(0.6, 1.5)) {
    this.st = 'idle';
    this.stT = 0;
    this.atk = null;
    this.thinkT = wait / this.speedK;
    this.R.playBase(C.idle, { blend: 0.6 });
    if (this.R.action.clip && !this.R.action.done) this.R.stop(0.6);
    else this.R.stop(0.5);
    this.bell.guide = null;
  }
  emerge() {
    this.st = 'emerge';
    this.stT = 0;
    this.R.playBase(C.idle, { blend: 0.01 });
    this.R.play(C.emerge, { blend: 0.01 });
    this.R.action.update(0);
    this.bell.guide = null;
    // sale de la tierra: la cola y la campana suben con él (y los pies no
    // buscan el suelo: está enterrado)
    this.R.gw = 0;
    this.R.groundOn = false;
    this.bell.noGround = true;
    this.R.update(1 / 60);
    this.R.resetDyn();
    this.bell.reset(this.handGrip(_v));
    this.bell.noGround = true;
  }
  attack(name) {
    const clips = { sweep: C.sweep, slam: C.slam, stompL: C.stompL, stompR: C.stompR, grab: C.grab, tail: C.tail, roar: C.roar, wax: C.wax, spin: C.spin, pull: C.pull };
    this.st = 'attack';
    this.stT = 0;
    this.atk = { name, t: 0, clip: clips[name], hit: false, done: {} };
    this.R.play(this.atk.clip, { blend: name === 'pull' ? 0.15 : 0.3 });
    this.cool[name] = { sweep: 7, slam: 11, stompL: 5, stompR: 5, grab: 10, tail: 8, roar: 22, wax: 18, spin: 16, pull: 0 }[name] || 6;
    const s0 = this['s_' + name];
    if (s0) s0.call(this);
  }
  startWalk() {
    this.st = 'walk';
    this.stT = 0;
    this.R.playBase(C.walk, { blend: 0.5, speed: this.speedK });
  }
  startTurn() {
    this.st = 'turn';
    this.stT = 0;
    this.R.playBase(C.walk, { blend: 0.5, speed: 0.55 * this.speedK });
  }
  startShake() {
    this.st = 'shake';
    this.stT = 0;
    this.atk = null;
    this.bell.guide = null;
    this.g.audio && this.g.audio.play('beastRoar', this._head(_v), { k: 0.9 });
  }

  // ---------------------------------------------------------- cada fotograma
  update(dt) {
    if (!this.visible) return;
    const g = this.g;
    const p = g.player;
    const climb = g.finale.climb;
    this.stT += dt;
    for (const k in this.cool) this.cool[k] = (this.cool[k] || 0) - dt;
    this.shakeCool -= dt;
    this.wallT = (this.wallT || 0) - dt;
    const R = this.R;
    // la cabeza busca al jugador (menos si está encima)
    R.look.target.set(p.pos.x, p.pos.y + 1.2, p.pos.z);
    R.look.w = this.st === 'emerge' || this.st === 'dying' || this.st === 'dead' ? 0 : climb.active ? 0.35 : 1;
    switch (this.st) {
      case 'emerge':
        // (casi fuera: la cola y la campana vuelven a tocar el suelo)
        if (this.stT > 4.9 && !R.groundOn) {
          R.groundOn = true;
          this.bell.noGround = false;
        }
        if (R.action.done && this.stT > C.emerge.dur - 0.05) {
          this.setIdle(0.8);
          this.onAwake && this.onAwake();
        }
        break;
      case 'idle':
        this.thinkT -= dt;
        if (this.thinkT <= 0 && !g.dev.freezeAI) this.think();
        break;
      case 'walk':
        this._walk(dt);
        break;
      case 'turn':
        this._turn(dt);
        break;
      case 'attack':
        this._attack(dt);
        break;
      case 'stuck':
        // la campana clavada: tira de la cadena sin soltarla
        if (this.stT > (this.stuckDur || 6.5) && !g.dev.freezeAI) this.attack('pull');
        break;
      case 'planted':
        this._plantIK(1);
        if (this.stT > 5.6 && !g.dev.freezeAI) {
          this.st = 'grabBack';
          this.stT = 0;
          R.play(C.grabBack, { blend: 0.3 });
        }
        break;
      case 'grabBack':
        this._plantIK(1 - ease(this.stT / 0.9));
        if (this.stT > C.grabBack.dur) {
          this.handIK = null;
          this.setIdle(0.6);
        }
        break;
      case 'hold':
        this._hold(dt);
        break;
      case 'shake':
        this._shake(dt);
        break;
      case 'hurt':
        if (this.stT > 2.5) this._afterHurt();
        break;
      case 'kneel':
        this._kneel(dt);
        break;
      case 'dying':
        break;
    }
    // un poco más deprisa en la fase 2
    R.speed = this.speedK;
    this._applyRoot();
    R.update(dt, { pre: () => this._ik() });
    // la piel por la que se trepa y el cuerpo para chocar, con la pose de
    // este fotograma
    this.surface.update();
    this._colBody();
    // la campana
    const hand = this.handGrip(_v);
    this.bell.update(dt, hand);
    // sacudida para el que trepa
    climb.shake = this.R.shakeA;
    // efectos
    this._fx(dt);
    this._drops(dt);
    // empuja al jugador fuera de los pies, la cola, la campana y la mano
    if (!climb.active && !this.grabbed) this._push();
    // la cadena se trepa con la campana clavada
    this.chainRoute.on = this.st === 'stuck' && !!this.bell.stuck;
  }
  _ik() {
    if (this.handIK && this.handIK.w > 0.001) {
      const h = this.handIK;
      const sh = this.M.byName.armL.getWorldPosition(_v3);
      const pole = _v2.copy(sh).add(this.forward(_v4).multiplyScalar(-3)).add(_v.set(0, -4, 0));
      // la palma, contra el suelo
      this.R.reach('armL', 'foreL', 'handL', h.target, pole, h.w);
    }
  }
  _head(out) {
    return this.bp('head', 0, 16.6, 3.6, out);
  }

  // ---------------------------------------------------------- decidir
  think() {
    const g = this.g;
    const climb = g.finale.climb;
    if (climb.active) {
      if (this.shakeCool <= 0) return this.startShake();
      return this.setIdle(0.5);
    }
    if (this.grabbed) return;
    const { d, a } = this.rel();
    const A = Math.abs(a);
    const ok = (n) => !(this.cool[n] > 0);
    // a su espalda: coletazo o se vuelve
    if (A > 110 * DEG && d < 18 && ok('tail')) return this.attack('tail');
    if (A > 38 * DEG) return this.startTurn();
    if (d > 19.5) {
      // lejos (huyendo por las ruinas): le llueve cera, o va a por él
      if (d > 23 && ok('wax') && Math.random() < 0.45) return this.attack('wax');
      return this.startWalk();
    }
    const C2 = [];
    const add = (n, w) => ok(n) && C2.push([n, w]);
    if (d < 7.5) {
      add(a > 0 ? 'stompL' : 'stompR', 4);
      add('roar', 0.8);
      add('grab', 1);
    } else if (d < 13) {
      add('grab', 3);
      add('sweep', 3);
      add('slam', 2);
      add('roar', 0.6);
    } else {
      add('slam', 3);
      add('sweep', 2);
      if (C2.length === 0) return this.startWalk();
    }
    if (this.phase >= 2) {
      if (d < 15) add('spin', 2);
      add('wax', 1.6);
    }
    if (!C2.length) return this.setIdle(0.5);
    let tot = C2.reduce((s, c) => s + c[1], 0);
    let r = Math.random() * tot;
    for (const [n, w] of C2) {
      r -= w;
      if (r <= 0) return this.attack(n);
    }
    this.attack(C2[0][0]);
  }

  _walk(dt) {
    const { d, a } = this.rel();
    const turn = 0.5 * this.speedK;
    this.yaw += clamp(a, -turn * dt, turn * dt);
    const sp = WALK.speed * this.speedK;
    const f = this.forward();
    const P = _v3.set(this.pos.x + f.x * sp * dt, 0, this.pos.z + f.z * sp * dt);
    P.x = clamp(P.x, STAND.x0, STAND.x1);
    P.z = clamp(P.z, STAND.z0, STAND.z1);
    // (se arrima a las casas en pie y resbala por sus fachadas)
    this.field.push(P, STAND_R);
    this.pos.x = P.x;
    this.pos.z = P.z;
    if (d < 14 || this.stT > 4.5) this.setIdle(0.3);
  }
  _turn(dt) {
    const { a } = this.rel();
    const turn = 0.62 * this.speedK;
    this.yaw += clamp(a, -turn * dt, turn * dt);
    if (Math.abs(a) < 14 * DEG || this.stT > 4) this.setIdle(0.25);
  }

  // ---------------------------------------------------------- ataques
  _attack(dt) {
    const A = this.atk;
    A.t += dt * this.speedK;
    const u = this['u_' + A.name];
    if (u) u.call(this, A.t, dt);
    if (this.st !== 'attack' || this.atk !== A) return;
    if (A.t >= A.clip.dur - 0.02) {
      const e = this['e_' + A.name];
      if (e) e.call(this);
      else this.setIdle();
    }
  }
  // el arco de la campana alrededor del cuerpo (ángulo desde el frente, + a su izquierda)
  _arc(phi, r, y, out) {
    return this.wp(Math.sin(phi) * r, y, Math.cos(phi) * r, out);
  }
  _bellHit(dmg, o = {}) {
    // la campana golpea si va deprisa y toca al jugador
    const g = this.g,
      p = g.player;
    if (this.atk.hit || p.dead) return;
    if (this.bell.vel.length() < (o.minSpeed ?? 5)) return;
    const c = this.bell.center(_v);
    const pc = _v2.set(p.pos.x, p.pos.y + 1, p.pos.z);
    if (c.distanceTo(pc) < this.bell.R + 0.55) {
      const r = this.hurt(dmg, c, { knock: o.knock ?? 11, stagger: true });
      if (r) {
        this.atk.hit = true;
        g.audio && g.audio.play('bellToll', c, { k: 0.7 });
      }
    }
  }
  hurt(dmg, from, o = {}) {
    const g = this.g;
    const r = g.combat.apply(this.proxy, { dmg, knock: o.knock ?? 8, stagger: o.stagger ?? true, unblockable: o.unblockable ?? true, noParry: true, chip: 0.4 }, from.x, from.z);
    if (r && this.onHurtPlayer) this.onHurtPlayer(r, dmg);
    return r;
  }

  // barrido: la campana va atrás y barre por delante, a ras de suelo
  s_sweep() {
    this.bell.guide = { target: new THREE.Vector3(), k: 9, d: 5 };
  }
  u_sweep(t) {
    const B = this.bell;
    if (t < 1.25) this._arc(-140 * DEG, 11, 3.2, B.guide.target), (B.guide.k = 9);
    else if (t < 2.65) {
      const u = strike(clamp((t - 1.25) / 1.2, 0, 1));
      const phi = (-140 + 250 * u) * DEG;
      this._arc(phi, 13, 3.4, B.guide.target);
      B.guide.k = 34;
      B.guide.d = 6;
      if (t > 1.5 && t < 2.5) this._bellHit(this.phase >= 2 ? 46 : 40);
    } else B.guide = null;
  }
  // mazazo: la alza sobre la cabeza y la descarga donde estás
  s_slam() {
    this.bell.guide = { target: new THREE.Vector3(), k: 14, d: 7, antiGrav: true };
    this.slamAt = null;
    this.mark = this._mark(0xff6a20);
  }
  u_slam(t) {
    const B = this.bell,
      g = this.g,
      p = g.player;
    // la sombra te sigue hasta que la campana cae
    if (!this.slamAt) {
      const f = this.forward();
      const { d, a } = this.rel();
      const dd = clamp(d, 7.5, 15.5),
        aa = clamp(a, -35 * DEG, 35 * DEG);
      const ang = this.yaw + aa;
      _v3.set(this.pos.x + Math.sin(ang) * dd, 0, this.pos.z + Math.cos(ang) * dd);
      _v3.x = clamp(_v3.x, WALLS[0] + 3, WALLS[2] - 3);
      _v3.z = clamp(_v3.z, WALLS[1] + 3, WALLS[3] - 3);
      this.field.push(_v3, this.bell.R + 0.2);
      _v3.y = this.groundAt(_v3.x, _v3.z);
      this._moveMark(this.mark, _v3, 3.2 + t * 0.6, Math.min(1, t / 0.8));
      if (t >= 1.5) this.slamAt = _v3.clone();
      void f;
    } else this._moveMark(this.mark, this.slamAt, 4.6, 1);
    if (t < 1.55) {
      this.wp(-1.5, 23, -3.5, B.guide.target);
      B.guide.k = 16;
      B.guide.antiGrav = true;
    } else if (t < 2.05) {
      B.guide.target.copy(this.slamAt).y += 4.2;
      B.guide.k = 70;
      B.guide.d = 3;
      B.guide.antiGrav = false;
      if (t > 1.9) {
        // (que llegue a tiempo: el último tramo, a la fuerza)
        B.top.lerp(B.guide.target, 0.3);
      }
    }
    if (t >= 2.05 && !this.atk.done.impact) {
      this.atk.done.impact = true;
      this._slamImpact();
    }
  }
  _slamImpact() {
    const g = this.g,
      B = this.bell,
      at = this.slamAt;
    // la campana se hunde en el empedrado, de lado
    B.top.copy(at).y += this.E.sizes.bellH * 0.55;
    B.up.set(Math.sin(this.yaw) * 0.45, 0.85, Math.cos(this.yaw) * 0.45).normalize();
    B.stick();
    B.guide = null;
    this._removeMark(this.mark);
    this.mark = null;
    const y = at.y;
    // el golpe directo y la onda
    const p = g.player;
    const dd = Math.hypot(p.pos.x - at.x, p.pos.z - at.z);
    if (dd < 3.8 && Math.abs(p.pos.y - y) < 3) this.hurt(this.phase >= 2 ? 62 : 55, at, { knock: 12 });
    g.combat.shockwave(at.x, y, at.z, 7.5, 26, this.proxy, 9);
    g.combat.ring(at.x, y, at.z, 11, 0xff6a20, 0.8);
    g.fx.blood.emit(at.x, y + 0.5, at.z, 60, { color: [0.36, 0.33, 0.29], speed: 9, life: 1.0, up: 4 });
    g.fx.blood.emit(at.x, y + 1, at.z, 30, { color: [1, 0.5, 0.12], speed: 6, life: 0.7, up: 3 });
    g.audio && g.audio.play('bellToll', at, { k: 1.4 });
    g.audio && g.audio.play('explosion', at, { k: 0.8 });
    g.camRig.shake(0.9);
    g.flash = Math.max(g.flash, 0.3);
    g.input.rumble(1, 1, 300);
    this.crack(at, 4.5);
    if (this.phase >= 2) g.combat.firePool(at.x, y, at.z, 3.2, 6);
    g.finale.debris.burst(at, 26, { speed: 9, up: 9, size: 0.9, spread: 3 });
    g.finale.onImpact && g.finale.onImpact(at, 7, 'bell');
  }
  e_slam() {
    // clavada: tira sin soltar
    this.st = 'stuck';
    this.stT = 0;
    this.stuckDur = this.phase >= 2 ? 5.2 : 6.8;
    this.R.play(C.stuck, { blend: 0.4 });
    this.atk = null;
  }
  s_pull() {
    this.bell.guide = null;
  }
  u_pull(t) {
    if (t >= 1.12 && !this.atk.done.rip) {
      this.atk.done.rip = true;
      const B = this.bell,
        g = this.g;
      const c = B.center(_v);
      B.release(_v2.set(-Math.sin(this.yaw) * 6, 16, -Math.cos(this.yaw) * 6));
      g.fx.blood.emit(c.x, c.y - 2, c.z, 40, { color: [0.36, 0.33, 0.29], speed: 7, life: 0.9, up: 3 });
      g.audio && g.audio.play('wallBreak', c, { k: 0.9 });
      g.audio && g.audio.play('chainRun', c);
      g.finale.debris.burst(_v4.set(c.x, this.groundAt(c.x, c.z), c.z), 18, { speed: 5, up: 8, size: 0.8, spread: 2.5 });
      g.camRig.shake(0.4);
      // si estabas en la cadena, te vas con ella
      const cl = g.finale.climb;
      if (cl.active && cl.zone === 'cadena') cl.release(_v3.set(-Math.sin(this.yaw) * 5, 9, -Math.cos(this.yaw) * 5));
    }
  }
  // pisotón: onda alrededor del pie
  u_stompL(t) {
    this._stomp(t, 'footL');
  }
  u_stompR(t) {
    this._stomp(t, 'footR');
  }
  _stomp(t, foot) {
    if (t >= 1.28 && !this.atk.done.stomp) {
      this.atk.done.stomp = true;
      const g = this.g;
      const f = this.M.byName[foot].getWorldPosition(_v);
      f.y = this.groundAt(f.x, f.z);
      const p = g.player;
      if (Math.hypot(p.pos.x - f.x, p.pos.z - f.z) < 2.6) this.hurt(58, f, { knock: 10 });
      g.combat.shockwave(f.x, f.y, f.z, 7, this.phase >= 2 ? 32 : 28, this.proxy, 9);
      g.fx.blood.emit(f.x, f.y + 0.4, f.z, 40, { color: [0.36, 0.33, 0.29], speed: 7, life: 0.8, up: 2.5 });
      g.camRig.shake(0.6);
      this.crack(f, 3);
      g.finale.debris.burst(f, 14, { speed: 6, up: 6, size: 0.6, spread: 2 });
      g.finale.onImpact && g.finale.onImpact(f, 6, 'foot');
    }
  }
  // zarpazo: la garra baja a por ti
  s_grab() {
    this.grabAt = new THREE.Vector3();
    this.handIK = { target: new THREE.Vector3(), w: 0 };
  }
  u_grab(t) {
    const g = this.g,
      p = g.player;
    const H = this.handIK;
    if (t < 1.45) {
      // apunta adonde estás (con algo de adelanto), dentro de su alcance
      const lead = 0.5;
      _v.set(p.pos.x + p.vx * lead, 0, p.pos.z + p.vz * lead);
      const dx = _v.x - this.pos.x,
        dz = _v.z - this.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      const dd = clamp(d, 4.5, 11.5);
      _v.set(this.pos.x + (dx / d) * dd, 0, this.pos.z + (dz / d) * dd);
      _v.y = this.groundAt(_v.x, _v.z) + 1.4;
      this.grabAt.lerp(_v, t < 0.2 ? 1 : 0.2);
    }
    H.target.copy(this.grabAt);
    H.w = ease((t - 1.05) / 0.45);
    if (t >= 1.62 && !this.atk.done.grab) {
      this.atk.done.grab = true;
      const palm = this.palmL(_v);
      g.camRig.shake(0.45);
      g.fx.blood.emit(this.grabAt.x, this.grabAt.y - 1, this.grabAt.z, 30, { color: [0.36, 0.33, 0.29], speed: 5, life: 0.7, up: 2 });
      g.audio && g.audio.play('slamSoft', this.grabAt);
      const caught = !p.dead && !p.iframe && Math.hypot(p.pos.x - palm.x, p.pos.z - palm.z) < 3.3 && Math.abs(p.pos.y - this.grabAt.y) < 3.5;
      if (caught) this.startHold();
      else {
        this.crack(_v.copy(this.grabAt).setY(this.groundAt(this.grabAt.x, this.grabAt.z)), 2.2);
        g.finale.debris.burst(_v, 10, { speed: 4, up: 5, size: 0.5, spread: 1.5 });
      }
    }
  }
  e_grab() {
    // falló: la mano se queda plantada (se puede trepar por el brazo)
    this.st = 'planted';
    this.stT = 0;
    this.atk = null;
    this.R.play(C.planted, { blend: 0.3 });
  }
  _plantIK(w) {
    if (!this.handIK) return;
    this.handIK.w = w;
  }
  // te tiene: te sube a la cara y aprieta; forcejear te suelta
  startHold() {
    const g = this.g,
      p = g.player;
    this.st = 'hold';
    this.stT = 0;
    this.atk = null;
    this.grabbed = true;
    this.holdMash = 0;
    this.holdHits = 0;
    p.puppet = true;
    p.state = 'grabbed';
    p.anim.play(p.clips.hurt, { blend: 0.05 });
    this.R.play(C.hold, { blend: 0.35 });
    this.handIK.w = 0;
    g.audio && g.audio.play('grab', p.pos);
    g.lockTarget = null;
  }
  _hold(dt) {
    const g = this.g,
      p = g.player,
      inp = g.input;
    this.handIK.w = Math.max(0, 1 - this.stT * 2.5);
    // el jugador, en el puño
    const palm = this.palmL(_v);
    p.body.pos.set(palm.x, palm.y - 1.0, palm.z);
    p.visY = p.body.pos.y;
    p.obj.position.copy(p.body.pos);
    const toHead = this._head(_v2).sub(palm);
    p.yaw = Math.atan2(toHead.x, toHead.z);
    p.obj.quaternion.setFromAxisAngle(_v3.set(0, 1, 0), p.yaw);
    p.anim.speed = 1;
    if (g.state === 'play' && !g.ui.modal) for (const a of ['light', 'heavy', 'dodge', 'interact', 'block']) if (inp.pressed(a)) this.holdMash++;
    // aprieta
    const ticks = [1.0, 2.0, 2.9];
    if (this.holdHits < ticks.length && this.stT >= ticks[this.holdHits]) {
      this.holdHits++;
      p.receiveBite(13);
      g.fx.blood.emit(palm.x, palm.y, palm.z, 26, { speed: 4 });
      g.audio && g.audio.play('boneCrack', palm);
      g.camRig.shake(0.35);
      if (p.dead) return this._letGo(null);
    }
    if (this.holdMash >= 9 && this.stT > 0.4) {
      // se escurre del puño
      g.ui.toast('Te escurres de la garra.', 2.2);
      return this._letGo(_v3.set(0, 1, 0));
    }
    if (this.stT > 3.4 && !this.throwing) {
      this.throwing = true;
      this.R.play(C.throw, { blend: 0.2 });
    }
  }
  _letGo(v) {
    const g = this.g,
      p = g.player;
    this.grabbed = false;
    this.throwing = false;
    p.puppet = false;
    if (!p.dead) {
      p.state = 'stagger';
      p.stT = 0;
      p.anim.play(p.clips.stagger, { blend: 0.05 });
    }
    p.vx = v ? v.x : 0;
    p.vz = v ? v.z : 0;
    p.body.vy = v ? v.y : 0;
    p.body.grounded = false;
    p.obj.quaternion.setFromAxisAngle(_v4.set(0, 1, 0), p.yaw);
    const cl = g.finale.climb;
    // muerto en el puño: cae con la muerte (no se levanta como si nada)
    cl.state = p.dead ? 'dead' : 'fall';
    cl.fallFrom = p.pos.y;
    cl.fallT = 0;
    if (p.dead) {
      p.state = 'dead';
      p.anim.play(PLAYER_CLIPS.cl_fall, { blend: 0.1 });
    }
    this.handIK = null;
    this.setIdle(1.2);
  }
  // coletazo
  u_tail(t) {
    if (t < 1.35 || t > 2.3 || this.atk.hit) return;
    const g = this.g,
      p = g.player;
    if (p.dead || p.pos.y > this.pos.y + 4) return;
    const names = ['tail2', 'tail3', 'tail4', 'tail5', 'tail6'];
    let prev = this.M.byName.tail1.getWorldPosition(_v);
    for (const n of names) {
      const b = this.M.byName[n].getWorldPosition(_v2);
      const s = segDist2D(p.pos.x, p.pos.z, prev.x, prev.z, b.x, b.z);
      if (s.d < 1.7) {
        const r = this.hurt(36, _v3.set(s.cx, 0, s.cz), { knock: 12 });
        if (r) {
          this.atk.hit = true;
          g.audio && g.audio.play('hitHeavy', p.pos);
        }
        return;
      }
      prev = _v.copy(b);
    }
  }
  // rugido: onda que aturde (se evita rodando a tiempo)
  u_roar(t) {
    if (t >= 1.25 && !this.atk.done.roar) {
      this.atk.done.roar = true;
      this._roarWave(15, 12);
    }
  }
  _roarWave(r, dmg) {
    const g = this.g;
    const h = this._head(_v);
    g.audio && g.audio.play('beastRoarBig', h);
    g.warp = 1;
    g.camRig.shake(0.55);
    g.combat.ring(this.pos.x, this.pos.y + 0.1, this.pos.z, r, 0xff4020, 0.9);
    const p = g.player;
    const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    if (dmg > 0 && d < r && !g.finale.climb.active) this.hurt(dmg, this.pos, { knock: 5, stagger: true });
  }
  // doble giro (fase 2): dos vueltas con la campana extendida
  s_spin() {
    this.bell.guide = { target: new THREE.Vector3(), k: 8, d: 5 };
    this.spinYaw = this.yaw;
  }
  u_spin(t, dt) {
    const B = this.bell;
    if (t < 1.0) this._arc(-60 * DEG, 10, 3, B.guide.target);
    else if (t < 4.4) {
      // dos vueltas (la raíz gira; la campana, por fuera)
      const u = (t - 1.0) / 3.4;
      const k = u < 0.12 ? (u / 0.12) ** 2 * 0.12 : u > 0.88 ? 1 - ((1 - u) / 0.12) ** 2 * 0.12 : u;
      this.yaw = this.spinYaw + k * Math.PI * 4;
      this._arc(-40 * DEG, 13.5, 3.6, B.guide.target);
      B.guide.k = 40;
      B.guide.d = 6;
      // cada vuelta puede golpear una vez
      const lap = Math.floor(k * 2);
      if (this.atk.lap !== lap) {
        this.atk.lap = lap;
        this.atk.hit = false;
      }
      this._bellHit(38, { minSpeed: 7 });
      if (Math.floor(t * 2.2) !== this.atk.whoosh) {
        this.atk.whoosh = Math.floor(t * 2.2);
        this.g.audio && this.g.audio.play('chainRun', B.center(_v));
      }
    } else B.guide = null;
    void dt;
  }
  // lluvia de cera (fase 2; y en la 1, si huyes lejos): los cirios gotean
  // fuego a tu alrededor
  u_wax(t) {
    if (t >= 1.3 && !this.atk.done.wax) {
      this.atk.done.wax = true;
      const n = 12;
      // (una gota cada 0,17 s, al ritmo del juego)
      this.dropQ = Array.from({ length: n }, (_, i) => i * 0.17);
      this.g.audio && this.g.audio.play('fireWhoosh', this._head(_v));
    }
  }

  // ---------------------------------------------------------- sacudirse
  _shake(dt) {
    const R = this.R,
      g = this.g;
    const climb = g.finale.climb;
    const t = this.stT;
    if (t < 0.9) {
      climb.shakeWarn = 0.5;
      R.shakeA = 0.22 * (t / 0.9);
    } else if (t < 3.3) {
      if (!this.atk) {
        this.atk = { name: 'shake' };
        R.play(C.shake, { blend: 0.25 });
        g.audio && g.audio.play('beastRoarBig', this._head(_v), { k: 0.8 });
      }
      R.shakeA = Math.min(1, R.shakeA + dt * 4);
    } else {
      R.shakeA = Math.max(0, R.shakeA - dt * 2.5);
      if (R.shakeA <= 0.01) {
        R.shakeA = 0;
        this.shakeCool = rnd(5.5, 8.5) / this.speedK;
        if (this.phase >= 3) {
          this.st = 'kneel';
          this.stT = 4;
          R.play(C.kneelLoop, { blend: 0.5 });
          this.atk = null;
        } else this.setIdle(0.4);
      }
    }
  }

  // ---------------------------------------------------------- de rodillas (fase 3)
  startKneel() {
    this.st = 'kneel';
    this.stT = 0;
    this.atk = null;
    this.bell.guide = null;
    this.R.play(C.kneel, { blend: 0.4 });
    this.handIK = null;
  }
  _kneel() {
    const R = this.R,
      g = this.g;
    if (this.stT > C.kneel.dur && R.action.clip === C.kneel) R.play(C.kneelLoop, { blend: 0.5 });
    if (this.stT > 4 && !g.dev.freezeAI) {
      const climb = g.finale.climb;
      if (climb.active && this.shakeCool <= 0) {
        // se revuelve de rodillas (y no se levanta)
        this.st = 'shake';
        this.stT = 0;
        this.atk = null;
        return;
      }
      if (!climb.active && (this.cool.kroar || 0) <= 0 && this.rel().d < 14) {
        this.cool.kroar = 9;
        this._roarWave(12, 9);
        R.flinch.x.kick(-1.2);
      }
    }
  }

  // ---------------------------------------------------------- sigilos
  sigilPos(s, out) {
    return out.copy(s.off).applyMatrix4(s.b.matrixWorld);
  }
  // un sigilo vivo al alcance de las manos (el núcleo, sólo de rodillas)
  sigilNear(hand) {
    for (const s of this.sigils) {
      if (s.dead) continue;
      if (s.core && this.st !== 'kneel' && !(this.st === 'shake' && this.phase >= 3)) continue;
      if (this.sigilPos(s, _v3).distanceTo(hand) < s.r + 0.9) return s;
    }
    return null;
  }
  stab(id, power, tip) {
    const s = this.sig[id];
    if (!s || s.dead) return;
    const g = this.g;
    s.hp = Math.max(0, s.hp - power);
    const at = this.sigilPos(s, _v);
    g.fx.blood.emit(at.x, at.y, at.z, 30 + Math.round(power * 40), { speed: 6 + power * 4, up: 2 });
    g.fx.blood.emit(at.x, at.y, at.z, 10 + Math.round(power * 16), { color: [1, 0.82, 0.4], speed: 5, life: 0.5, up: 1.5 });
    g.combat.impactFlash(at.x, at.y, at.z, 1.6 + power, 0xffc070);
    g.audio && g.audio.play('fleshTear', at, { k: 0.8 + power * 0.6 });
    if (power > 0.8) g.audio && g.audio.play('boneCrack', at, { k: 1.3 });
    g.flash = Math.max(g.flash, 0.15 + power * 0.25);
    g.flashTint = [1, 0.75, 0.4];
    this.R.flinch.x.kick(-(0.6 + power * 1.4));
    this.R.flinch.z.kick((Math.random() - 0.5) * 1.2);
    this.M.setFlash && this.M.setFlash(0xff8040, 0.6);
    this._flashT = 0.25;
    // la sangre negra sale a borbotones por la herida
    (this.spurts || (this.spurts = [])).push({ s, t: 0, dur: 0.8 + power * 1.1, k: 0.6 + power });
    // le duele: se sacudirá antes
    this.shakeCool = Math.min(this.shakeCool, 1.2 + Math.random());
    g.audio && g.audio.play('beastHurt', this._head(_v2), { k: 0.6 + power * 0.5 });
    if (s.hp <= 0.001) this.killSigil(s);
  }
  // un pinchazo en la carne (no hiere: le irrita)
  flesh() {
    this.shakeCool = Math.min(this.shakeCool, 2.5);
    this.R.flinch.x.kick(-0.25);
  }
  killSigil(s) {
    const g = this.g;
    s.dead = true;
    s.hp = 0;
    if (s.glow) s.glow.visible = false;
    for (const m of s.meshes) if (m.material.emissive) m.material.emissiveIntensity = 0.05;
    const at = this.sigilPos(s, _v);
    g.fx.blood.emit(at.x, at.y, at.z, 90, { speed: 8, up: 3 });
    g.fx.blood.emit(at.x, at.y, at.z, 40, { color: [1, 0.8, 0.35], speed: 6, life: 0.7, up: 2 });
    g.audio && g.audio.play('fleshBurst', at);
    g.hitstop = Math.max(g.hitstop, 0.22);
    g.slowmo = { t: 0.5, k: 0.4 };
    g.camRig.shake(0.7);
    g.flash = Math.max(g.flash, 0.4);
    g.input.rumble(1, 1, 400);
    if (s.core) return this.startDeath();
    const left = this.sigils.filter((x) => !x.core && !x.dead).length;
    // de dolor: la mano a la herida (y quien esté encima, fuera)
    this.st = 'hurt';
    this.stT = 0;
    this.atk = null;
    this.bell.guide = null;
    if (this.bell.stuck) this.bell.release(_v2.set(0, 6, 0));
    this.handIK = null;
    this.R.play(s.id === 'nuca' ? C.hurtNuca : C.hurtMano, { blend: 0.12 });
    g.audio && g.audio.play('beastRoarBig', this._head(_v2));
    const climb = g.finale.climb;
    if (climb.active) climb.release(_v3.copy(climb.N).multiplyScalar(7).add(_v2.set(0, 5, 0)));
    this.phase = left === 0 ? 3 : 2;
    this.proxy.data.phase = this.phase;
    if (this.phase === 2) this.speedK = 1.14;
  }
  _afterHurt() {
    if (this.phase >= 3) {
      this.startKneel();
      this.onPhase && this.onPhase(3);
      return;
    }
    this.onPhase && this.onPhase(this.phase);
    // ruge al pasar de fase
    this.attack('roar');
    this.cool.roar = 22;
  }
  startDeath() {
    this.st = 'dying';
    this.stT = 0;
    this.atk = null;
    this.bell.guide = null;
    this.handIK = null;
    this.R.shakeA = 0;
    this.R.play(C.death, { blend: 0.25 });
    this.onDying && this.onDying();
    const climb = this.g.finale.climb;
    if (climb.active) climb.release(_v3.copy(climb.N).multiplyScalar(5).add(_v2.set(0, 3, 0)));
    this.g.audio && this.g.audio.play('beastRoarBig', this._head(_v2), { k: 1.3 });
  }

  // ---------------------------------------------------------- eventos de los clips
  onEvent(e) {
    const g = this.g;
    if (e === 'stepL' || e === 'stepR') {
      const f = this.M.byName[e === 'stepL' ? 'footL' : 'footR'].getWorldPosition(_v);
      f.y = this.groundAt(f.x, f.z);
      const p = g.player;
      const d = Math.hypot(p.pos.x - f.x, p.pos.z - f.z);
      g.camRig.shake(clamp(0.5 - d * 0.02, 0.06, 0.5));
      g.audio && g.audio.play('beastStep', f, { k: 1.6 });
      g.fx.blood.emit(f.x, f.y + 0.3, f.z, 14, { color: [0.36, 0.33, 0.29], speed: 3, life: 0.7, up: 1.2 });
      // sobre las ruinas de una casa: las pisotea (cascotes y vigas que saltan)
      if (this.onRuins(f.x, f.z)) {
        g.finale.debris.burst(_v2.set(f.x, f.y + 0.4, f.z), 7, { speed: 4, up: 4.5, size: 0.75, spread: 1.6 });
        if (Math.random() < 0.5) g.audio && g.audio.play(Math.random() < 0.5 ? 'woodBreak' : 'wallBreak', f, { k: 0.9 });
      }
      if (d < 2.4 && !g.finale.climb.active) this.hurt(45, f, { knock: 9 });
      g.finale.onImpact && g.finale.onImpact(f, 2.5, 'step');
    } else if (e === 'swing') g.audio && g.audio.play('swingHeavy', this.bell.center(_v), { k: 1.6 });
    else if (e === 'break') {
      const at = this.wp(0, 0, 2, _v);
      g.fx.blood.emit(at.x, at.y + 0.5, at.z, 70, { color: [0.36, 0.33, 0.29], speed: 9, life: 1.1, up: 4 });
      g.audio && g.audio.play('wallBreak', at, { k: 1.2 });
      g.camRig.shake(0.8);
      this.crack(at, 7);
      g.finale.debris.burst(at, 30, { speed: 7, up: 11, size: 1.0, spread: 5 });
    } else if (e === 'rise') {
      g.camRig.shake(0.5);
      g.audio && g.audio.play('stoneCreak', this.pos, { k: 1.2 });
    } else if (e === 'roar' && this.st === 'emerge') this._roarWave(16, 0);
    else if (e === 'knees') {
      const at = this.wp(0, 0, 1.5, _v);
      g.camRig.shake(0.8);
      g.audio && g.audio.play('slam', at, { k: 1.4 });
      g.fx.blood.emit(at.x, at.y + 0.4, at.z, 50, { color: [0.36, 0.33, 0.29], speed: 7, life: 0.9, up: 2.5 });
      this.crack(at, 5);
      g.finale.debris.burst(at, 16, { speed: 6, up: 5, size: 0.7, spread: 4 });
    } else if (e === 'convulse') {
      g.camRig.shake(0.4);
      g.audio && g.audio.play('beastHurt', this._head(_v), { k: 1.2 });
    } else if (e === 'burst') {
      this.dead = true;
      this.st = 'dead';
      this.onBurst && this.onBurst();
    } else if (e === 'throw' && this.grabbed) {
      const f = this.forward();
      this._letGo(_v3.set(f.x * 9, 7, f.z * 9));
      g.audio && g.audio.play('pounceWhoosh', g.player.pos);
    }
  }

  // La campana contra la fachada de una casa en pie: tañe, revienta piedra y
  // polvo, y si es de las que se rompen, le hunde el tejado.
  _bellWall(at, n, sp) {
    const g = this.g;
    if (this.wallT > 0 || !this.visible || this.st === 'emerge') return;
    this.wallT = 0.5;
    const k = clamp((sp - 3.5) / 10, 0, 1);
    g.finale.debris.burst(at, Math.round(6 + 16 * k), { speed: 2.5 + 5 * k, up: 2.5 + 4 * k, size: 0.55 + 0.5 * k, spread: 1.4, dir: n });
    g.fx.blood.emit(at.x, at.y, at.z, Math.round(12 + 24 * k), { color: [0.43, 0.4, 0.36], speed: 2 + 3 * k, life: 1.8, up: 1.2, gravity: 1 });
    g.audio && g.audio.play('bellToll', at, { k: 0.45 + 0.5 * k });
    if (k > 0.25) g.audio && g.audio.play('wallBreak', at, { k: 0.7 + 0.7 * k });
    const d = Math.hypot(g.player.pos.x - at.x, g.player.pos.z - at.z);
    g.camRig.shake(clamp((0.2 + 0.4 * k) * (1 - d / 40), 0.04, 0.6));
    if (k > 0.3) g.input.rumble(0.3 * k, 0.5 * k, 220);
    g.finale.onImpact && g.finale.onImpact(at, 2.6 + 2 * k, k > 0.3 ? 'air' : 'bell');
  }

  // ---------------------------------------------------------- efectos
  _fx(dt) {
    const g = this.g;
    this.fx.update(g.time);
    // luces del pool, siguiendo al cuerpo
    const core = this.bp('chest', 0, 12.25, 2.2, _v);
    const L = this.lights;
    L.core.x = core.x;
    L.core.y = core.y;
    L.core.z = core.z;
    const open = this.st === 'kneel' || this.st === 'dying' ? 1.6 : 1;
    L.core.intensity = 22 * open + Math.sin(g.time * 5) * 4;
    const bc = this.bell.center(_v2);
    L.bell.x = bc.x;
    L.bell.y = bc.y - 1;
    L.bell.z = bc.z;
    const hc = this.bp('halo', 0, 19.5, 2, _v3);
    L.halo.x = hc.x;
    L.halo.y = hc.y;
    L.halo.z = hc.z;
    this.coreGlow.visible = !this.sig.nucleo.dead;
    // humo y chispas del incensario
    this._smokeT = (this._smokeT || 0) - dt;
    if (this._smokeT <= 0) {
      this._smokeT = 0.12;
      g.fx.blood.emit(bc.x, bc.y - 1.5, bc.z, 2, { color: [1, 0.55, 0.15], speed: 1.2, life: 0.8, up: 2.5, gravity: -1 });
    }
    // los borbotones de las heridas (negros: la sangre del dios)
    if (this.spurts && this.spurts.length) {
      for (let i = this.spurts.length - 1; i >= 0; i--) {
        const S = this.spurts[i];
        S.t += dt;
        if (S.t > S.dur) {
          this.spurts.splice(i, 1);
          continue;
        }
        const at = this.sigilPos(S.s, _v3);
        const n = _v4.copy(S.s.n).transformDirection(S.s.b.matrixWorld);
        // a golpes, como un corazón
        const beat = 0.5 + 0.5 * Math.sin(S.t * 14);
        const sp = (3 + 5 * beat) * S.k * (1 - S.t / S.dur);
        g.fx.blood.emit(at.x + n.x * 0.15, at.y + n.y * 0.15, at.z + n.z * 0.15, Math.max(1, Math.round(4 * beat * S.k)), { color: [0.07, 0.015, 0.012], speed: sp * 0.35, dir: { x: n.x * 1.6, z: n.z * 1.6 }, up: n.y * sp + 1, life: 1.1, gravity: 12 });
      }
    }
    // destello de daño
    if (this._flashT > 0) {
      this._flashT -= dt;
      if (this._flashT <= 0) this.M.setFlash && this.M.setFlash(null, 0);
    }
    // los sigilos vivos laten
    for (const s of this.sigils) {
      if (s.dead) continue;
      // (late como una brasa, más deprisa cuanto más herido)
      const hurt = 1 - s.hp / s.max;
      for (const m of s.meshes) if (m.material.emissive) m.material.emissiveIntensity = 1.15 + Math.sin(g.time * (2.4 + hurt * 3) + s.r * 7) * (0.45 + hurt * 0.2);
    }
  }
  // grietas en el empedrado (marcas negras que se desvanecen poco a poco)
  crack(at, r) {
    this.g.finale.decal && this.g.finale.decal(at, r);
  }
  // la sombra/aviso del mazazo
  _mark(color) {
    const g = this.g;
    const m = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.frustumCulled = false;
    g.scene.add(m);
    this.marks.push(m);
    return m;
  }
  _moveMark(m, at, r, a) {
    if (!m) return;
    m.position.set(at.x, at.y + 0.06, at.z);
    m.scale.set(r, 1, r);
    m.material.opacity = 0.35 * a * (0.75 + 0.25 * Math.sin(this.g.time * 14));
  }
  _removeMark(m) {
    if (!m) return;
    this.g.scene.remove(m);
    m.geometry.dispose();
    m.material.dispose();
    const i = this.marks.indexOf(m);
    if (i >= 0) this.marks.splice(i, 1);
  }
  // una gota de cera ardiendo desde un cirio hasta cerca del jugador
  _drop(first) {
    if (!this.visible || this.dead) return;
    const g = this.g,
      p = g.player;
    const c = this.E.fx.candles[Math.floor(Math.random() * this.E.fx.candles.length)];
    const from = this.bp(c.bone, c.p[0], c.p[1], c.p[2], new THREE.Vector3());
    const r = first ? 0 : rnd(1, 6.5);
    const a = Math.random() * Math.PI * 2;
    const to = new THREE.Vector3(p.pos.x + p.vx * 0.8 + Math.cos(a) * r, 0, p.pos.z + p.vz * 0.8 + Math.sin(a) * r);
    to.x = clamp(to.x, WALLS[0] + 0.5, WALLS[2] - 0.5);
    to.z = clamp(to.z, WALLS[1] + 0.5, WALLS[3] - 0.5);
    this.field.push(to, 0.8);
    to.y = this.groundAt(to.x, to.z);
    const T = 1.5;
    const grav = 14;
    const vel = new THREE.Vector3((to.x - from.x) / T, (to.y - from.y + 0.5 * grav * T * T) / T, (to.z - from.z) / T);
    const orb = g.combat._orb(0xff8a30, 1.1);
    orb.position.copy(from);
    const mark = this._mark(0xff5010);
    this._moveMark(mark, to, 1.6, 0.2);
    this.drops.push({ pos: from, vel, grav, t: 0, T, to, orb, mark });
  }
  _drops(dt) {
    const g = this.g;
    if (this.dropQ && this.dropQ.length) {
      for (let i = 0; i < this.dropQ.length; i++) this.dropQ[i] -= dt;
      while (this.dropQ.length && this.dropQ[0] <= 0) {
        const first = this.dropQ.length === 12;
        this.dropQ.shift();
        this._drop(first);
      }
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const D = this.drops[i];
      D.t += dt;
      D.vel.y -= D.grav * dt;
      D.pos.addScaledVector(D.vel, dt);
      D.orb.position.copy(D.pos);
      this._moveMark(D.mark, D.to, 1.6, Math.min(1, D.t / D.T));
      if (Math.random() < 0.5) g.fx.blood.emit(D.pos.x, D.pos.y, D.pos.z, 1, { color: [1, 0.6, 0.2], speed: 0.4, life: 0.4, up: 0.2, gravity: -1 });
      if (D.pos.y <= D.to.y + 0.2 || D.t > D.T + 0.5) {
        const p = g.player;
        if (Math.hypot(p.pos.x - D.to.x, p.pos.z - D.to.z) < 1.7 && Math.abs(p.pos.y - D.to.y) < 2) this.hurt(18, D.to, { knock: 4, stagger: false, unblockable: false });
        g.combat.firePool(D.to.x, D.to.y, D.to.z, 1.6, 4.5);
        g.fx.blood.emit(D.to.x, D.to.y + 0.3, D.to.z, 16, { color: [1, 0.5, 0.12], speed: 4, life: 0.5, up: 2 });
        g.audio && g.audio.play('burn', D.to);
        g.scene.remove(D.orb);
        D.orb.material.dispose();
        this._removeMark(D.mark);
        this.drops.splice(i, 1);
      }
    }
  }
  clearDrops() {
    this.dropQ = null;
    for (const D of this.drops) {
      this.g.scene.remove(D.orb);
      D.orb.material.dispose();
      this._removeMark(D.mark);
    }
    this.drops.length = 0;
    for (const m of [...this.marks]) this._removeMark(m);
    this.mark = null;
  }

  // ---------------------------------------------------------- choques con el jugador
  // El cuerpo en cápsulas: las piernas, el faldón del alba (no se pasa entre
  // los jirones hasta las piernas), la cola, la campana, la mano plantada; y,
  // sólo para la cámara, el torso, el cuello, la cabeza y los brazos.
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
    const gy = this.groundAt(pel.x, pel.z);
    const top = _v3.set(pel.x, pel.y + 0.4, pel.z);
    C.add(top, b.set(pel.x, Math.min(pel.y - 0.5, gy + 2.6), pel.z), 2.35);
    // la cola, tramo a tramo, y su punta
    const radii = [1.45, 1.4, 1.2, 1.0, 0.85];
    W('tail1', a);
    for (let i = 2; i <= 6; i++) {
      W('tail' + i, b);
      C.add(a, b, radii[i - 2]);
      a.copy(b);
    }
    B.tail6.getWorldQuaternion(_q);
    C.add(a, b.set(0, -0.15, -2.6).applyQuaternion(_q).add(a), 0.55);
    // la campana (del yugo a la boca)
    const Bl = this.bell;
    C.add(Bl.top, Bl.mouth(b).addScaledVector(Bl.up, Bl.H * 0.12), Bl.R * 0.82);
    if (this.st === 'planted' || this.st === 'grabBack') {
      const pl = this.palmL(a);
      C.add(pl, pl, 1.35);
    }
    // (para la cámara)
    C.add(W('spine1', a), W('chest', b), 2.0, false);
    C.add(W('chest', a), W('neck2', b), 1.25, false);
    const hd = this._head(a);
    C.add(hd, hd, 1.35, false);
    for (const S of ['L', 'R']) {
      C.add(W('arm' + S, a), W('fore' + S, b), 0.55, false);
      C.add(W('fore' + S, a), W('hand' + S, b), 0.42, false);
    }
  }
  _push() {
    const g = this.g,
      p = g.player;
    if (p.dead || p.puppet) return;
    if (this.col.push(p.pos, p.body.radius, p.body.height) > 0) {
      // (y que el empujón no le meta en un muro)
      g.world.col.resolve(p.pos, p.body.radius, p.pos.y, p.body.height, p.body.stepH ?? 0.5);
      p.visY = p.pos.y;
    }
  }
  // golpes del jugador en el suelo: no le hieren (sólo le irritan)
  playerSwing(player, atk) {
    if (!this.visible || this.dead) return false;
    if (player.hitSet.has(this)) return false;
    const P = player.pos;
    const B = this.M.byName;
    const reach = (atk.range ?? 2.3) + 0.6;
    const f = player.forward();
    const tip = _v4.set(P.x + f.x * reach * 0.7, P.y + 1, P.z + f.z * reach * 0.7);
    const tests = [];
    for (const S of ['L', 'R']) tests.push([B['shin' + S], B['foot' + S], 1.1]);
    tests.push([B.tail3, B.tail4, 1.3], [B.tail4, B.tail5, 1.2], [B.tail5, B.tail6, 1.0]);
    if (this.st === 'planted') tests.push([B.handL, B.f2L, 1.4]);
    for (const [a, b, r] of tests) {
      const A = a.getWorldPosition(_v),
        Bp = b.getWorldPosition(_v2);
      const s = segDist2D(tip.x, tip.z, A.x, A.z, Bp.x, Bp.z);
      const y = A.y + (Bp.y - A.y) * s.t;
      if (s.d < r + 0.8 && Math.abs(tip.y - y) < r + 1.8) {
        player.hitSet.add(this);
        const g = this.g;
        g.fx.blood.emit(s.cx, tip.y, s.cz, atk.heavy ? 18 : 10, { speed: 3.5, up: 1 });
        g.combat.impactFlash(s.cx, tip.y, s.cz, 0.9, 0xff9070);
        g.audio && g.audio.play(atk.heavy ? 'hitHeavy' : 'hit', tip);
        g.hitstop = Math.max(g.hitstop, atk.heavy ? 0.08 : 0.05);
        this.pain += atk.heavy ? 14 : 7;
        this.R.flinch.x.kick(-0.08 * (atk.heavy ? 2 : 1));
        // a fuerza de golpes en los pies se tambalea y apoya la garra
        if (this.pain >= 110 && this.st === 'idle') {
          this.pain = 0;
          this.handIK = { target: new THREE.Vector3(), w: 0 };
          const pl = this.palmL(_v3);
          this.handIK.target.set(pl.x, this.groundAt(pl.x, pl.z) + 1.4, pl.z);
          this.st = 'planted';
          this.stT = 0;
          this.R.play(C.planted, { blend: 0.4 });
          g.audio && g.audio.play('beastHurt', this._head(_v3));
        }
        return true;
      }
    }
    return false;
  }
}
