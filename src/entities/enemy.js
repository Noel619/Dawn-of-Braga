// Clase base de enemigo con IA de percepción, persecución, ataque y retorno.
import * as THREE from 'three';
import { Animator, blendInto, addRot, slerpE, Spring } from './rig.js';
import { Biped, stabilizeShield } from './locomotion.js';
import { moveBody } from '../world/collision.js';
import { TYPES } from './enemies.js';
import { angleDiff, approachAngle, damp, dampAngle, clamp, DEG } from '../core/util.js';
import { getTexture } from '../gfx/textures.js';
import { registerMaterialPatch } from '../gfx/materials.js';

const shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const _RED = new THREE.Color(1, 0.08, 0.03);
let shadowMat = null;

export function makeBlobShadow(size) {
  if (!shadowMat) shadowMat = registerMaterialPatch(new THREE.MeshBasicMaterial({ map: getTexture('shadow'), transparent: true, depthWrite: false, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  const m = new THREE.Mesh(shadowGeo, shadowMat);
  m.scale.set(size, 1, size);
  m.renderOrder = 1;
  return m;
}

export class Enemy {
  constructor(game, spec) {
    this.game = game;
    this.spec = spec;
    this.id = spec.id;
    this.type = spec.type;
    const T = (this.T = TYPES[spec.type]);
    this.rig = T.build();
    this.obj = this.rig.root;
    game.scene.add(this.obj);
    this.shadow = makeBlobShadow(T.radius * 3.2);
    game.scene.add(this.shadow);
    this.body = { pos: new THREE.Vector3(), radius: T.radius, height: T.height, stepH: T.stepH ?? 0.5, grounded: true, vy: 0 };
    this.anim = new Animator();
    this.anim.onEvent = (e) => this.onAnimEvent(e);
    // marcha bípeda con pies plantados para los humanoides
    if (T.biped) {
      this.gait = new Biped(this.rig, T.biped);
      if (T.heavy) this.gait.onStep = () => this.onAnimEvent('step');
      this._gpos = new THREE.Vector3();
      this._groundFn = (x, z) => game.world.col.groundHeight(x, z, 0.1, this.body.pos.y + 0.7);
    }
    this.legIK = 1;
    this.flX = new Spring(150, 13);
    this.flY = new Spring(150, 13);
    this.baseFrom = null;
    this.baseKind = null;
    this.lastPose = {};
    this.lockHeight = T.lockHeight;
    this.boss = !!spec.boss;
    this.home = { x: spec.x, y: spec.y, z: spec.z, yaw: spec.yaw || 0 };
    // las que acechan en el techo se cuelgan del techo real que tienen encima
    // (no a una altura a ojo: flotaban bajo las vigas o quedaban dentro del
    // forjado, y al soltarse la colisión del techo las sacaba por un lado)
    if (spec.idle === 'ceiling') {
      const col = game.world.col;
      const fl = col.groundHeight(spec.x, spec.z, 0.1, spec.y);
      let c = Infinity;
      for (const b of col.query(spec.x - 0.3, spec.z - 0.3, spec.x + 0.3, spec.z + 0.3, [])) {
        if (b.miny > fl + 1.6 && b.miny < c && !b.camOnly && col.overlapXZ(b, spec.x, spec.z, 0.2)) c = b.miny;
      }
      if (c < Infinity) this.home.y = c - 0.03;
      this.floorY = fl;
    }
    this.maxHp = T.hp;
    this.data = {};
    this.P = {}; // datos persistentes entre reinicios
    this.flash = 0;
    this.phase = Math.random() * 10;
    this.percT = Math.random() * 0.3;
    if (T.init) T.init(this);
    this.reset();
  }

  get pos() {
    return this.body.pos;
  }
  get alive() {
    return !this.dead;
  }
  // (data.air: trepando por el techo o cayendo de él, fuera del alcance)
  get lockable() {
    return !this.dead && this.obj.visible && this.state !== 'ceiling' && !this.data.air && !this.scripted;
  }

  reset() {
    const s = this.spec;
    this.body.pos.set(s.x, this.home.y, s.z);
    this.body.vy = 0;
    this.body.grounded = true;
    this.yaw = s.yaw || 0;
    this.vx = this.vz = 0;
    this.hp = this.maxHp;
    this.poise = this.T.poise;
    this.poiseT = 0;
    this.dead = false;
    this.state = s.idle === 'ceiling' ? 'ceiling' : s.idle === 'boss' ? 'bossIdle' : 'dormant';
    this.idle = s.idle || 'stand';
    this.stT = 0;
    this.cooldown = 0.5;
    this.atk = null;
    this.path = null;
    this.pathT = 0;
    this.lostT = 0;
    this.stuckT = 0;
    this.lastPos = this.body.pos.clone();
    this.anim.stop(0);
    this.anim.weight = 0;
    this.obj.visible = true;
    this.obj.position.copy(this.body.pos);
    this.obj.rotation.set(0, this.yaw, 0);
    this.sink = 0;
    this.aware = false;
    this.data = {};
    this.scripted = false;
    this.hitShown = 0;
    // sin destellos ni ojos encendidos a medias al volver a su puesto
    this.flash = 0;
    this.flare = 0;
    this.flareRed = 0;
    this.parryT = 0;
    this.parryHits = 0;
    if (this._flashing) {
      this.rig.setTint(null, null);
      this._flashing = false;
    }
    if (this._eyes) for (const m of this._eyes) m.material.emissiveIntensity = m.userData.baseEI ?? 2;
    this._flareOn = false;
    if (this.T.onReset) this.T.onReset(this);
  }

  // ------------------------------------------------------------ percepción
  distTo(p) {
    return Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
  }
  angleTo(p) {
    return Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
  }
  perceive(player) {
    // (modo desarrollador: invisible para la IA)
    if (player.dead || (this.game.dev && this.game.dev.invisible)) return false;
    const T = this.T;
    const dy = player.pos.y - this.pos.y;
    if (Math.abs(dy) > (this.state === 'ceiling' ? 5 : 3.2)) return false;
    const d = this.distTo(player.pos);
    const dormant = this.state === 'dormant' || this.state === 'ceiling';
    let sight = T.sight;
    if (dormant && (this.idle === 'eat' || this.idle === 'pray' || this.idle === 'window')) sight *= 0.45;
    let hear = T.hear;
    if (player.sprinting) hear *= 2.2;
    if (player.state === 'attack' || player.state === 'roll') hear *= 1.6;
    if (d > Math.max(sight, hear)) return false;
    const eye = this.pos.y + T.height * 0.8;
    const los = this.game.world.col.lineOfSight(this.pos.x, eye, this.pos.z, player.pos.x, player.pos.y + 1.4, player.pos.z);
    if (d < hear && los) return true;
    if (d > sight) return false;
    const ang = Math.abs(angleDiff(this.yaw, this.angleTo(player.pos)));
    if (ang > (T.fov ?? 120) * 0.5 * DEG) return false;
    return los;
  }

  alert() {
    if (this.aware) return;
    this.aware = true;
    this.state = 'alert';
    this.stT = 0;
    if (this.T.clips.alert) this.anim.play(this.T.clips.alert, { blend: 0.15 });
    this.game.audio && this.game.audio.enemyVoice(this, 'alert');
    this.game.onEnemyAlert && this.game.onEnemyAlert(this);
  }

  // ------------------------------------------------------------ movimiento
  steerTo(tx, tz, speed, dt, face = true) {
    const dx = tx - this.pos.x,
      dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz);
    let wx = 0,
      wz = 0;
    if (d > 0.05) {
      wx = dx / d;
      wz = dz / d;
    }
    // separación de otros enemigos
    for (const o of this.game.activeEnemies) {
      if (o === this || o.dead) continue;
      const ox = this.pos.x - o.pos.x,
        oz = this.pos.z - o.pos.z;
      const od = Math.hypot(ox, oz);
      const min = this.body.radius + o.body.radius + 0.3;
      if (od < min && od > 0.001) {
        wx += (ox / od) * (min - od) * 1.5;
        wz += (oz / od) * (min - od) * 1.5;
      }
    }
    const m = Math.hypot(wx, wz) || 1;
    const k = Math.min(1, d / 0.6);
    this.vx = damp(this.vx, (wx / m) * speed * k, 8, dt);
    this.vz = damp(this.vz, (wz / m) * speed * k, 8, dt);
    if (face && d > 0.1) this.yaw = approachAngle(this.yaw, Math.atan2(wx, wz), (this.T.turn ?? 5) * dt);
  }

  nav() {
    const y = this.pos.y;
    const g = this.game;
    if (g.navCellar && y < -0.5 && g.inCellar(this.pos)) return g.navCellar;
    if (g.navDungeon && g.inDungeon(this.pos)) return g.navDungeon;
    if (y < -3) return this.game.navCrypt;
    if (y < 3 && y > -1.5) return this.game.navSurface;
    return null;
  }

  // Persigue un punto con A* cuando no hay línea directa.
  chaseTo(tx, tz, speed, dt) {
    const nav = this.nav();
    if (!nav || nav.line(this.pos.x, this.pos.z, tx, tz)) {
      this.path = null;
      this.steerTo(tx, tz, speed, dt);
      return;
    }
    this.pathT -= dt;
    if (!this.path || this.pathT <= 0) {
      const r = nav.path(this.pos.x, this.pos.z, tx, tz, 5000);
      this.path = r ? r.pts : null;
      this.pathI = 1;
      this.pathT = 0.7 + Math.random() * 0.3;
    }
    if (this.path && this.pathI < this.path.length) {
      const [px, pz] = this.path[this.pathI];
      if (Math.hypot(px - this.pos.x, pz - this.pos.z) < 0.6) this.pathI++;
      this.steerTo(px, pz, speed, dt);
    } else this.steerTo(tx, tz, speed, dt);
  }

  // ------------------------------------------------------------ combate
  takeHit(dmg, poiseDmg, fromX, fromZ, heavy, dir = 0) {
    if (this.dead || this.data.air || this.scripted) return 'none';
    const T = this.T;
    // (desequilibrado tras un parry: el golpe es crítico, pero le espabila)
    if (this.state === 'parried') this.parryT = 0;
    // (el jefe puede parar el golpe, o recibir más o menos daño)
    if (T.preHit) {
      const r = T.preHit(this, dmg, poiseDmg, fromX, fromZ, heavy);
      if (r === 'blocked' || r === 'none') return r;
      if (r) {
        dmg = r.dmg;
        poiseDmg = r.poise;
      }
    }
    if (this.state === 'ceiling') this.drop();
    const toSrc = Math.atan2(fromX - this.pos.x, fromZ - this.pos.z);
    const facing = Math.abs(angleDiff(this.yaw, toSrc)) < 55 * DEG;
    if (T.canBlock && !heavy && facing && this.state !== 'attack' && this.state !== 'hurt' && this.state !== 'stagger' && Math.random() < T.blockChance) {
      if (T.clips.block) this.anim.play(T.clips.block, { blend: 0.03 });
      this.data.blockT = 0.4;
      return 'blocked';
    }
    this.hp -= dmg;
    this.flash = 0.12;
    this.hitShown = 3;
    // cada golpe se nota en el cuerpo aunque no rompa la guardia
    const mass = clamp(T.height / 1.8, 1, 3.2);
    this.flX.kick(-(heavy ? 10 : 6.5) / mass);
    this.flY.kick(((dir || (Math.random() < 0.5 ? -1 : 1)) * (heavy ? 7 : 5)) / mass);
    if (!T.heavy) {
      const dd = Math.hypot(this.pos.x - fromX, this.pos.z - fromZ) || 1;
      const kb = (heavy ? 2.4 : 1.4) / mass;
      this.vx += ((this.pos.x - fromX) / dd) * kb;
      this.vz += ((this.pos.z - fromZ) / dd) * kb;
    }
    if (!this.aware) {
      this.aware = true;
      this.game.onEnemyAlert && this.game.onEnemyAlert(this);
    }
    if (this.hp <= 0) {
      this.die();
      if (T.onHit) T.onHit(this, 'kill', dmg, heavy);
      return 'kill';
    }
    this.poise -= poiseDmg;
    this.poiseT = 3;
    if (this.poise <= 0) {
      this.poise = T.poise;
      if (T.onStagger) T.onStagger(this);
      this.state = heavy && T.clips.stagger ? 'stagger' : 'hurt';
      this.stT = 0;
      const c = this.state === 'stagger' ? T.clips.stagger : T.clips.hurt;
      if (c) this.anim.play(c, { blend: 0.03 });
      const d = Math.hypot(this.pos.x - fromX, this.pos.z - fromZ) || 1;
      const kb = heavy ? 3.5 : 2;
      this.vx = ((this.pos.x - fromX) / d) * kb;
      this.vz = ((this.pos.z - fromZ) / d) * kb;
      this.atk = null;
    } else if (this.state === 'dormant' || this.state === 'alert') {
      this.state = 'chase';
    }
    if (T.onHit) T.onHit(this, 'hit', dmg, heavy);
    return 'hit';
  }

  die() {
    this.dead = true;
    this.state = 'dead';
    this.stT = 0;
    this.hp = 0;
    this.anim.play(this.T.clips.death, { blend: 0.05 });
    this.game.onEnemyDeath && this.game.onEnemyDeath(this);
  }

  drop() {
    this.state = 'dropping';
    this.stT = 0;
    // cae en vertical desde el techo: el cuerpo físico empieza con la cabeza
    // bajo el techo (el centro del cuerpo no salta) y gira sobre sí mismo
    // mientras cae; sin resolver colisiones laterales contra el techo, que lo
    // empujaban fuera de la casa y lo dejaban de pie encima de un muro
    const bj = this.rig.rest.body ? this.rig.rest.body.pos.y : 0.8;
    this._bj = bj;
    this.body.pos.y = this.home.y - 2 * bj;
    this.body.vy = -1;
    this.body.grounded = false;
    this.data.dropGround = this.game.world.col.groundHeight(this.pos.x, this.pos.z, this.body.radius * 0.5, this.body.pos.y + 0.05);
    this.game.audio && this.game.audio.enemyVoice(this, 'alert');
    this.aware = true;
  }

  startAttack(a) {
    this.state = 'attack';
    this.flare = 1;
    // (los golpes que no se pueden desviar: los ojos en rojo, un destello
    // rojo y un toque grave)
    this.flareRed = a.noParry ? 1 : 0;
    if (a.noParry) this.perilFx();
    this.atk = a;
    this.stT = 0;
    this.hitDone = [];
    this.evDone = [];
    this.anim.play(a.clip, { blend: a.blend ?? 0.1 });
    if (a.onStart) a.onStart(this);
    this.game.audio && this.game.audio.enemyVoice(this, 'attack', a);
  }

  pickAttack(d) {
    const T = this.T;
    const opts = [];
    let total = 0;
    for (const a of T.attacks) {
      if (d < a.min || d > a.max) continue;
      if (a.cond && !a.cond(this, d)) continue;
      if (a.phase && (this.data.phase || 1) < a.phase) continue;
      const w = a.weight ?? 1;
      opts.push([a, w]);
      total += w;
    }
    if (!opts.length) return null;
    let r = Math.random() * total;
    for (const [a, w] of opts) {
      r -= w;
      if (r <= 0) return a;
    }
    return opts[0][0];
  }

  onAnimEvent(e) {
    if (e === 'step' && this.game.audio) this.game.audio.enemyStep(this);
    if (this.T.onAnimEvent) this.T.onAnimEvent(this, e);
  }

  perilFx() {
    const g = this.game;
    const h = this._hp || (this._hp = new THREE.Vector3());
    if (this.rig.joints.head) this.rig.worldPos('head', h).y += 0.15;
    else h.set(this.pos.x, this.pos.y + this.T.height * 0.85, this.pos.z);
    g.combat && g.combat.glint(h.x, h.y, h.z, 0xff2a14, 1.2 + this.T.height * 0.25);
    g.audio && g.audio.play('peril', h);
  }

  // ------------------------------------------------------------ parry
  // Le han desviado el golpe. Las criaturas pequeñas quedan desequilibradas
  // (abiertas al golpe de gracia) a la primera; las grandes y los jefes
  // necesitan varios parrys seguidos (T.parryPosture, en pocos segundos):
  // mientras, el desvío sólo les corta el golpe y les hace trastabillar.
  parried(a) {
    const T = this.T;
    const g = this.game;
    if (this.dead) return;
    if (this.D) return this.D.parried(a);
    this.parryHits = (g.time - (this.lastParriedT ?? -9) < 4 ? this.parryHits || 0 : 0) + 1;
    this.lastParriedT = g.time;
    const need = T.parryPosture ?? 1;
    this.atk = null;
    this.data.blockT = 0;
    const mass = clamp(T.height / 1.8, 1, 3.2);
    const p = g.player;
    const dx = this.pos.x - p.pos.x,
      dz = this.pos.z - p.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    this.flX.kick(-14 / mass);
    this.flY.kick(((Math.random() < 0.5 ? -1 : 1) * 8) / mass);
    if (this.parryHits < need) {
      this.state = 'hurt';
      this.stT = 0;
      if (T.clips.hurt) this.anim.play(T.clips.hurt, { blend: 0.04 });
      if (!T.heavy) {
        this.vx = (dx / d) * 1.4;
        this.vz = (dz / d) * 1.4;
      }
      this.cooldown = Math.max(this.cooldown, 0.6);
      if (T.onParried) T.onParried(this, false);
      return 'recoil';
    }
    this.parryHits = 0;
    this.state = 'parried';
    this.stT = 0;
    this.parryT = T.parryDur ?? 1.6;
    this.anim.play(T.clips.parried || T.clips.stagger, { blend: 0.03 });
    const kb = T.heavy ? 0.6 : 2.2;
    this.vx = (dx / d) * kb;
    this.vz = (dz / d) * kb;
    if (T.onParried) T.onParried(this, true);
    g.audio && g.audio.enemyVoice(this, 'hurt');
    return 'full';
  }
  // Va a recibir el golpe de gracia: se queda desequilibrado hasta que llega.
  onRiposte() {
    if (this.D) return this.D.onRiposte && this.D.onRiposte();
    const dur = this.T.parryDur ?? 1.6;
    if (this.state === 'parried') this.stT = Math.min(this.stT, dur - 0.9);
    this.parryT = Math.max(this.parryT, 0.9);
  }
  // El golpe de gracia: crítico seguro, sin guardia que valga; si no le
  // mata, le tumba hacia atrás.
  takeRiposte(dmg, fromX, fromZ) {
    if (this.dead) return 'none';
    if (this.D && this.D.takeRiposte) return this.D.takeRiposte(dmg, fromX, fromZ);
    const T = this.T;
    this.parryT = 0;
    this.hp -= dmg;
    this.flash = 0.08;
    this.hitShown = 3;
    const mass = clamp(T.height / 1.8, 1, 3.2);
    this.flX.kick(-16 / mass);
    if (this.hp <= 0) {
      this.die();
      if (T.onHit) T.onHit(this, 'kill', dmg, true);
      return 'kill';
    }
    this.poise = T.poise;
    this.state = T.clips.stagger ? 'stagger' : 'hurt';
    this.stT = 0;
    this.anim.play(T.clips.stagger || T.clips.hurt, { blend: 0.03 });
    const d = Math.hypot(this.pos.x - fromX, this.pos.z - fromZ) || 1;
    const kb = T.heavy ? 1.2 : 4;
    this.vx = ((this.pos.x - fromX) / d) * kb;
    this.vz = ((this.pos.z - fromZ) / d) * kb;
    this.atk = null;
    if (T.onHit) T.onHit(this, 'hit', dmg, true);
    return 'hit';
  }

  // ------------------------------------------------------------ actualización
  update(dt, player) {
    // en una cinemática la mueve el guion
    if (this.scripted) return;
    const T = this.T;
    // criaturas con cerebro propio (el Descoyuntado)
    if (T.ai) {
      T.ai(this, dt, player);
      return;
    }
    // (el reloj de un ataque va al ritmo de su animación: en su segunda fase
    // el Turiferario anima un 15 % más deprisa y sus golpes, sus pisotones y
    // sus ascuas llegaban tarde respecto a lo que se veía)
    this.stT += this.state === 'attack' ? dt * (this.anim.speed || 1) : dt;
    this.cooldown -= dt;
    this.flash -= dt;
    this.poiseT -= dt;
    if (this.poiseT <= 0) this.poise = T.poise;
    if (this.data.blockT) this.data.blockT -= dt;
    const d = this.distTo(player.pos);
    const toP = this.angleTo(player.pos);
    let speed = 0;
    let move = true;

    // percepción escalonada
    this.percT -= dt;
    if (this.percT <= 0) {
      this.percT = 0.2;
      this.sees = this.perceive(player);
      if (this.sees) this.lostT = 0;
    }
    if (!this.sees) this.lostT += dt;

    switch (this.state) {
      case 'dormant':
        this.vx = damp(this.vx, 0, 6, dt);
        this.vz = damp(this.vz, 0, 6, dt);
        if (this.idle === 'wander') {
          const w = this.data.wander || (this.data.wander = { x: this.home.x, z: this.home.z, t: 0 });
          w.t -= dt;
          if (w.t <= 0) {
            w.x = this.home.x + (Math.random() - 0.5) * 7;
            w.z = this.home.z + (Math.random() - 0.5) * 7;
            w.t = 4 + Math.random() * 4;
          }
          const nav = this.nav();
          if (!nav || nav.walkable(w.x, w.z)) this.steerTo(w.x, w.z, T.walk * 0.55, dt);
          else w.t = 0;
        }
        // si estás cerca sin que te vea, se le oye: rezos, jadeos, sollozos
        if (d < 14 && this.game.audio && Math.random() < dt * 0.07) this.game.audio.enemyVoice(this, 'idle');
        if (this.sees) this.alert();
        break;
      case 'ceiling':
        this.vx = this.vz = 0;
        if (d < 3.8 && Math.abs(player.pos.y - this.home.y) < 5) this.drop();
        move = false;
        break;
      case 'dropping':
        this.vx = this.vz = 0;
        if (this.body.grounded && this.stT > 0.1) {
          this.state = 'alert';
          this.stT = 0;
          if (T.clips.alert) this.anim.play(T.clips.alert, { blend: 0.05 });
          this.game.camRig.shake(0.2);
        }
        break;
      case 'bossIdle':
        this.vx = this.vz = 0;
        break;
      case 'alert':
        this.vx = damp(this.vx, 0, 8, dt);
        this.vz = damp(this.vz, 0, 8, dt);
        this.yaw = approachAngle(this.yaw, toP, (T.turn ?? 5) * dt);
        if (this.stT > (T.alertTime ?? 0.7)) {
          this.state = 'chase';
          this.anim.stop(0.2);
        }
        break;
      case 'chase': {
        if (player.dead) {
          this.state = 'return';
          break;
        }
        const leashD = Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z);
        if (!this.boss && (leashD > (T.leash ?? 30) || this.lostT > 7)) {
          this.state = 'return';
          break;
        }
        if (T.think) {
          const r = T.think(this, player, d, dt);
          if (r === 'handled') break;
        }
        if (this.cooldown <= 0) {
          const a = this.pickAttack(d);
          if (a) {
            this.startAttack(a);
            break;
          }
        }
        const keep = T.keepDist ?? 0;
        if (d > (T.approach ?? 1.6) + keep) {
          speed = d > (T.runDist ?? 6) && T.run ? T.run : T.walk;
          this.chaseTo(player.pos.x, player.pos.z, speed, dt);
        } else {
          // rodear lentamente
          const side = this.data.side || (this.data.side = Math.random() < 0.5 ? -1 : 1);
          const a = toP + side * Math.PI * 0.5;
          const sx = this.pos.x + Math.sin(a),
            sz = this.pos.z + Math.cos(a);
          this.steerTo(sx, sz, T.walk * 0.35, dt, false);
          this.yaw = approachAngle(this.yaw, toP, (T.turn ?? 5) * dt);
          if (Math.random() < dt * 0.3) this.data.side = -side;
        }
        // atasco
        this.stuckT += dt;
        if (this.stuckT > 1.2) {
          const moved = this.pos.distanceTo(this.lastPos);
          this.lastPos.copy(this.pos);
          this.stuckT = 0;
          if (moved < 0.3 && d > 2.5) this.path = null;
        }
        break;
      }
      case 'attack': {
        const a = this.atk;
        const t = this.stT;
        const firstHit = a.hits && a.hits.length ? a.hits[0][0] : a.dur * 0.5;
        const trackUntil = a.trackUntil ?? firstHit - 0.05;
        if (t < trackUntil) this.yaw = approachAngle(this.yaw, toP, (a.turn ?? T.turn ?? 5) * dt);
        let lunging = false;
        if (a.lunge) {
          for (const [l0, l1, ls] of a.lunge) {
            if (t >= l0 && t <= l1) {
              this.vx = Math.sin(this.yaw) * ls;
              this.vz = Math.cos(this.yaw) * ls;
              lunging = true;
            }
          }
        }
        if (!lunging) {
          this.vx = damp(this.vx, 0, 10, dt);
          this.vz = damp(this.vz, 0, 10, dt);
        }
        if (a.hits) {
          a.hits.forEach(([h0, h1], i) => {
            if (t >= h0 && t <= h1 && !this.hitDone[i]) {
              if (this.game.combat.enemyStrike(this, a, i)) this.hitDone[i] = true;
            }
          });
        }
        if (a.events) {
          a.events.forEach((ev, i) => {
            if (t >= ev.t && !this.evDone[i]) {
              this.evDone[i] = true;
              ev.fn(this, this.game);
            }
          });
        }
        if (a.update) a.update(this, dt, t);
        if (t >= a.dur) {
          this.state = 'chase';
          this.atk = null;
          this.cooldown = a.cd ?? T.cooldown ?? 0.8 + Math.random() * 0.8;
          this.anim.stop(0.18);
        }
        move = true;
        break;
      }
      case 'parried': {
        // desequilibrado: abierto al golpe de gracia
        this.vx = damp(this.vx, 0, 4, dt);
        this.vz = damp(this.vz, 0, 4, dt);
        this.parryT = Math.max(0, this.parryT - dt);
        if (this.stT >= (T.parryDur ?? 1.6)) {
          this.state = 'chase';
          this.parryT = 0;
          this.cooldown = 0.35 + Math.random() * 0.3;
          this.anim.stop(0.2);
        }
        break;
      }
      case 'hurt':
      case 'stagger': {
        this.vx = damp(this.vx, 0, 5, dt);
        this.vz = damp(this.vz, 0, 5, dt);
        const dur = this.state === 'hurt' ? T.clips.hurt.dur : T.clips.stagger.dur;
        if (this.stT >= dur) {
          this.state = 'chase';
          this.cooldown = 0.2 + Math.random() * 0.4;
          this.anim.stop(0.15);
        }
        break;
      }
      case 'return': {
        const hd = Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z);
        if (this.sees && !player.dead && hd < (T.leash ?? 30) * 0.7) {
          this.state = 'chase';
          break;
        }
        if (hd < 0.6) {
          this.state = 'dormant';
          this.aware = false;
          this.hp = this.maxHp;
          this.vx = this.vz = 0;
          this.yaw = this.home.yaw;
        } else this.chaseTo(this.home.x, this.home.z, T.walk, dt);
        break;
      }
      case 'dead': {
        this.vx = damp(this.vx, 0, 6, dt);
        this.vz = damp(this.vz, 0, 6, dt);
        if (this.stT > 2.4) {
          this.sink += dt * 0.35;
          if (this.stT > 2.4 && !this.data.dissolved) {
            this.data.dissolved = true;
            this.game.fx && this.game.fx.dissolve && this.game.fx.dissolve(this);
          }
        }
        if (this.stT > 5.5) {
          this.obj.visible = false;
          this.shadow.visible = false;
        }
        break;
      }
    }
    if (this.state !== 'parried') this.parryT = 0;
    if (T.update) T.update(this, dt, player, d);

    // física
    if (this.state === 'dropping') {
      // caída libre en vertical hasta el suelo que tiene debajo
      const b = this.body;
      b.vy -= 22 * dt;
      b.pos.y += b.vy * dt;
      const gy = this.data.dropGround ?? -100;
      if (b.pos.y <= gy) {
        b.pos.y = gy;
        b.vy = 0;
        b.grounded = true;
      }
    } else if (this.state !== 'ceiling' && move) {
      const floating = T.float;
      if (floating) {
        this.pos.x += this.vx * dt;
        this.pos.z += this.vz * dt;
        this.game.world.col.resolve(this.pos, this.body.radius, this.pos.y, this.body.height, 0.5);
        const g = this.game.world.col.groundHeight(this.pos.x, this.pos.z, this.body.radius, this.pos.y + 1.5);
        this.pos.y = damp(this.pos.y, g, 6, dt);
      } else moveBody(this.game.world.col, this.body, this.vx * dt, this.vz * dt, dt);
      // no atravesar al jugador (salvo si va por el techo)
      if (!this.dead && !player.dead && !this.data.air) {
        const dx = this.pos.x - player.pos.x,
          dz = this.pos.z - player.pos.z;
        const dd = Math.hypot(dx, dz);
        const min = this.body.radius + player.body.radius;
        if (dd < min && dd > 0.001 && Math.abs(this.pos.y - player.pos.y) < 1.5) {
          const push = (min - dd) * 0.5;
          this.pos.x += (dx / dd) * push;
          this.pos.z += (dz / dd) * push;
          if (this.T.heavy) {
            player.pos.x -= (dx / dd) * push;
            player.pos.z -= (dz / dd) * push;
          } else {
            player.pos.x -= (dx / dd) * push * 0.6;
            player.pos.z -= (dz / dd) * push * 0.6;
          }
        }
      }
    }
    this.animate(dt);
  }

  animate(dt) {
    const T = this.T;
    if (T.animate) {
      T.animate(this, dt);
      return;
    }
    const spd = Math.hypot(this.vx, this.vz);
    this.phase += dt * spd * (T.stride ?? 2.2);
    const t = this.game.time;
    let pose, kind;
    if (this.state === 'dormant' && T.idlePose) {
      pose = T.idlePose(this, this.idle, t, spd);
      kind = 'idle';
    } else if (this.state === 'ceiling' && T.idlePose) {
      pose = T.idlePose(this, 'ceiling', t, 0);
      kind = 'ceiling';
    } else {
      pose = T.loco(this, t, spd);
      kind = 'loco';
    }
    // al cambiar de postura base (p.ej. arrodillado -> perseguir), fundido
    if (this.baseKind && kind !== this.baseKind && this.state !== 'dead') {
      this.baseFrom = {};
      for (const j in this.lastPose) this.baseFrom[j] = this.lastPose[j].slice();
      this.baseFromT = 0;
    }
    this.baseKind = kind;
    const gait = this.gait;
    const ik = !!gait && !pose.legL;
    if (gait) {
      this.legIK = damp(this.legIK, ik ? 1 : 0, 7, dt);
      const gp = gait.update(dt, this.vx, this.vz, this.yaw, {
        time: t,
        grounded: this.body.grounded,
        ground: T.boss || T.heavy ? this._groundFn : null,
        pos: this._gpos.set(this.pos.x, this.pos.y, this.pos.z),
      });
      if (ik) {
        const r = pose.root || [0, 0, 0];
        pose.root = [r[0] + gp.root[0], r[1] + gp.root[1], r[2] + gp.root[2]];
        pose.hips = pose.hips || [0, 0, 0];
        addRot(pose, 'hips', gp.hips);
        addRot(pose, 'chest', gp.chest);
        if (pose.head) addRot(pose, 'head', gp.head);
      }
    }
    if (this.baseFrom) {
      this.baseFromT += dt / 0.35;
      if (this.baseFromT >= 1) this.baseFrom = null;
      else blendInto(pose, this.baseFrom, 1 - this.baseFromT * this.baseFromT * (3 - 2 * this.baseFromT));
    }
    const ap = this.anim.update(dt);
    const c = this.anim.clip;
    const aw = ap ? this.anim.weight : 0;
    let clipPose = null;
    if (ap && aw > 0) {
      if (c.legs && c.ground) clipPose = ap;
      blendInto(pose, ap, aw, c.mask, this.anim.jw);
    }
    // piernas por IK (pies en el suelo); poses sentadas/arrodilladas y clips
    // sin apoyo conservan las suyas
    if (gait && this.legIK > 0.001 && this.state !== 'dead') {
      const w = this.legIK * (c && c.legs && !c.ground ? 1 - aw : 1);
      if (w > 0.001) gait.solve(pose, { w, clipPose, clipW: clipPose ? aw : 0, clipGround: true });
    }
    // retroceso de los golpes
    const fx = this.flX.update(dt),
      fy = this.flY.update(dt);
    if (Math.abs(fx) + Math.abs(fy) > 0.002) {
      const j = pose.chest ? 'chest' : 'body';
      addRot(pose, j, [fx * 0.055, fy * 0.05, 0]);
      if (pose.head) addRot(pose, 'head', [fx * 0.04, fy * 0.06, 0]);
      if (pose.neck) addRot(pose, 'neck', [fx * 0.05, fy * 0.05, 0]);
    }
    if (T.postPose) T.postPose(this, pose, dt);
    this.rig.apply(pose);
    for (const j in this.lastPose) if (!(j in pose)) delete this.lastPose[j];
    for (const j in pose) this.lastPose[j] = pose[j];
    this.obj.position.set(this.pos.x, this.pos.y - this.sink, this.pos.z);
    this.obj.rotation.y = this.yaw;
    if (T.rootRot) T.rootRot(this);
    if (this.rig.joints.shield && this.obj.visible) {
      const blk = this.state === 'attack' ? 0 : this.data.blockT > 0 ? 1 : 0;
      const sh = T.shield || {};
      stabilizeShield(this.rig, { w: this.dead ? 0.2 : 0.88, yaw: sh.yaw ?? 0.3, pitch: sh.pitch ?? -0.1, out: sh.out ?? 0.08, along: sh.along ?? 0.14, raise: blk * 0.05 });
    }
    // sombra
    const g = this.state === 'ceiling' ? this.home.y - 3 : this.state === 'dropping' ? (this.data.dropGround ?? this.pos.y) : this.pos.y;
    this.shadow.position.set(this.pos.x, g + 0.02, this.pos.z);
    this.shadow.visible = this.obj.visible && this.state !== 'ceiling';
    // los ojos se encienden al preparar un ataque (telegrafiado)
    this.flare = Math.max(0, (this.flare || 0) - dt * 1.8);
    this.flareRed = Math.max(0, (this.flareRed || 0) - dt * 1.2);
    const stun = this.parryT > 0;
    if (this.flare > 0 || this._flareOn || stun) {
      this.rig.own();
      if (!this._eyes) this._eyes = this.rig.meshes.filter((m) => m.userData.matName === 'eyeGlow' || m.userData.matName === 'redGlow' || m.userData.matName === 'eyeCold');
      const k = stun ? 0.35 + 0.25 * Math.sin(this.game.time * 9) : 1 + this.flare * this.flare * 4;
      for (const m of this._eyes) {
        m.material.emissiveIntensity = (m.userData.baseEI ?? 2) * k;
        if (!m.userData.eyeC) m.userData.eyeC = m.material.emissive.clone();
        if (!this._flashing) m.material.emissive.copy(m.userData.eyeC).lerp(_RED, this.flareRed > 0 && this.state === 'attack' ? Math.min(1, this.flareRed * 1.5) : 0);
      }
      this._flareOn = this.flare > 0 || stun || this.flareRed > 0;
    }
    // destello de golpe
    if (this.flash > 0) {
      if (!this._flashing) {
        this.rig.setTint(null, new THREE.Color(0.6, 0.15, 0.1));
        this._flashing = true;
      }
    } else if (this._flashing) {
      this.rig.setTint(null, null);
      this._flashing = false;
    }
  }
}
