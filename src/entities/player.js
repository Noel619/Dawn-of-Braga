// El Condenado: controlador del jugador (combate Soulslike).
import * as THREE from 'three';
import { buildPlayer } from './models.js';
import { Animator, blendInto, UPPER, Spring, addRot } from './rig.js';
import { Biped, stabilizeShield, keepShieldOut } from './locomotion.js';
import { WEAPONS, weaponSet, resolveWeaponArms } from './weapons.js';
import { buildParts, backShield, hipSaya } from './weapon_models.js';
import { moveBody } from '../world/collision.js';
import { clamp, damp, dampAngle, approachAngle, angleDiff, wrapAngle, DEG, lerp } from '../core/util.js';
import { objMat } from '../gfx/materials.js';

// Los clips y golpes de cada arma están en weapons.js / weapon_moves.js.

// velocidades (m/s)
const WALK = 2.2,
  JOG = 4.5,
  RUN = 6.7,
  STRAFE = 3.6,
  BLOCKWALK = 1.9;

export class Player {
  constructor(game) {
    this.game = game;
    this.hasSword = true;
    this.hasShield = true;
    this.rig = buildPlayer({ sword: false });
    this.obj = this.rig.root;
    // armas: cada una en su grupo bajo la articulación de la mano derecha
    this.weaponObjs = {};
    for (const id in WEAPONS) {
      const o = buildParts(WEAPONS[id].parts('x'));
      o.group.visible = false;
      this.rig.joints.sword.add(o.group);
      this.rig.meshes.push(...o.meshes);
      this.weaponObjs[id] = o;
    }
    // escudo a la espalda (armas a dos manos) y saya de la katana
    this.shieldBack = backShield();
    this.rig.joints.chest.add(this.shieldBack.group);
    this.rig.meshes.push(...this.shieldBack.meshes);
    this.saya = hipSaya();
    this.rig.joints.hips.add(this.saya.group);
    this.rig.meshes.push(...this.saya.meshes);
    this.cloakZ0 = this.rig.joints.cloak.position.z;
    this.resolveArms = (p) => resolveWeaponArms(p, this.rig, this.weapon);
    this.body = { pos: new THREE.Vector3(), radius: 0.36, height: 1.8, stepH: 0.52, grounded: true, vy: 0 };
    this.visY = 0;
    this.yaw = 0;
    this.vx = 0;
    this.vz = 0;
    this.anim = new Animator();
    this.anim.onEvent = (e, c) => this.onAnimEvent(e, c);
    this.anim.resolve = this.resolveArms;
    this.gait = new Biped(this.rig, { stance: 0.16 });
    this.gait.onStep = (side, w) => this.onStep(side, w);
    this._groundFn = (x, z) => game.world.col.groundHeight(x, z, 0.08, this.body.pos.y + 0.6);
    this._gpos = new THREE.Vector3();
    this.flinchX = new Spring(170, 15);
    this.flinchY = new Spring(170, 15);
    this.cloakX = new Spring(60, 7);
    this.cloakZ = new Spring(60, 7);
    this.lampS = new Spring(90, 6);
    // escudo con algo de juego en la muñeca (no va clavado al pecho)
    this.shieldYaw = new Spring(110, 13);
    this.shieldPitch = new Spring(120, 12);
    this.shieldRoll = new Spring(90, 9);
    this.shieldYaw.x = 0.42;
    this.shieldPitch.x = -0.03;
    this._shCarry = [1, 0, 0];
    this.shieldHold = new THREE.Vector3();
    this.headYaw = 0;
    this.exert = 0;
    this.phase = 0;
    this.state = 'free';
    this.stT = 0;
    this.maxHp = 100;
    this.hp = 100;
    this.maxSt = 100;
    this.st = 100;
    this.stDelay = 0;
    this.maxFlasks = 3;
    this.flasks = 3;
    this.dmgMul = 1;
    this.combo = 0;
    this.comboT = 0;
    this.buffer = null;
    this.hitSet = new Set();
    this.iframe = false;
    this.blocking = false;
    this.blockW = 0;
    this.sprinting = false;
    this.moveMag = 0;
    this.swinging = false;
    this.flask = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.14, 6), objMat('glass'));
    this.flask.position.set(0, -0.08, 0.04);
    this.flask.visible = false;
    this.rig.joints.handL.add(this.flask);
    this.charge = 0;
    this.charging = false;
    this.atkMul = 1;
    this.atkT = 0;
    this.hitWin = -1;
    this.heavyIdx = 0;
    // luz de la lámpara del cinto
    this.lamp = new THREE.PointLight(0xffa860, 9, 12, 1.5);
    this.lamp.position.set(0, -0.08, 0.1);
    this.rig.joints.lantern.add(this.lamp);
    this.lampBase = 9;
    this.lampK = 1;
    this.dead = false;
    this.lastHitBy = null;
    // extremos de la hoja (espacio de la articulación del arma) para la estela
    this.bladeBase = new THREE.Vector3(0, -0.05, 0.2);
    this.bladeTip = new THREE.Vector3(0, -0.05, 1.02);
    this.equipWeapon('espada');
  }

  // Empuña un arma del registro (facon, hacha, lanza, espada, katana).
  equipWeapon(id) {
    const W = WEAPONS[id] || WEAPONS.espada;
    this.weapon = W;
    this.weaponId = W.id;
    this.twoHanded = W.hands === 2;
    this.set = weaponSet(W, this.rig);
    this.clips = this.set.clips;
    this.blockRad = this.set.blockRad;
    for (const k in this.weaponObjs) this.weaponObjs[k].group.visible = k === W.id;
    this.bladeBase.fromArray(W.trail[0]);
    this.bladeTip.fromArray(W.trail[1]);
    if (this.state === 'attack') {
      this.state = 'free';
      this.anim.stop(0.1);
    }
    this.updateGear();
  }

  setEquipment(sword, shield) {
    this.hasSword = sword;
    this.hasShield = shield;
    this.updateGear();
  }

  // Escudo al brazo o a la espalda (la capa lo cubre), saya al cinto.
  updateGear() {
    const two = this.twoHanded && this.hasSword;
    this.rig.joints.sword.visible = this.hasSword;
    this.rig.joints.shield.visible = this.hasShield && !two;
    this.shieldBack.group.visible = this.hasShield && two;
    this.rig.joints.cloak.position.z = this.cloakZ0 - (this.hasShield && two ? 0.075 : 0);
    this.saya.group.visible = !!this.weapon.saya && this.hasSword;
  }

  // Con escudo, o con el propio arma si es a dos manos.
  canBlock() {
    return this.hasSword && this.twoHanded ? true : this.hasShield;
  }

  // Punto del arma (espacio de la mano) en el mundo.
  weaponPoint(local, out = new THREE.Vector3()) {
    const sj = this.rig.joints.sword;
    sj.updateWorldMatrix(true, false);
    return out.set(local[0], local[1], local[2]).applyMatrix4(sj.matrixWorld);
  }

  get pos() {
    return this.body.pos;
  }

  spawn(x, y, z, yaw) {
    this.body.pos.set(x, y, z);
    this.body.vy = 0;
    this.visY = y;
    this.yaw = yaw;
    this.vx = this.vz = 0;
    this.state = 'free';
    this.anim.stop(0);
    this.anim.weight = 0;
    this.dead = false;
    this.iframe = false;
    this.blocking = false;
    this.blockW = 0;
    this.buffer = null;
    this.gait._yaw = null;
    this.obj.position.set(x, y, z);
    this.obj.rotation.y = yaw;
  }

  forward() {
    return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) };
  }

  useSt(n) {
    this.st = Math.max(-10, this.st - n);
    this.stDelay = 0.75;
  }

  // ------------------------------------------------------------ acciones
  canAct() {
    return this.st > 0;
  }

  startAttack(def, idx = 0) {
    this.state = 'attack';
    this.stT = 0;
    this.atkT = 0;
    this.atk = def;
    this.hitSet.clear();
    this.hitWin = -1;
    this.charge = 0;
    this.charging = false;
    this.chargeDone = !def.charge;
    this.atkMul = 1;
    this.useSt(def.st);
    this.anim.play(def.clip, { blend: this.anim.weight > 0.3 ? 0.07 : 0.1 });
    this.combo = idx;
    this.game.onPlayerAttackStart && this.game.onPlayerAttackStart(def);
  }

  // Pesado: encadenado tras otro pesado pasa al siguiente de la lista.
  startHeavy(chained) {
    const H = this.set.heavy;
    const i = chained ? (this.heavyIdx + 1) % H.length : 0;
    this.heavyIdx = i;
    this.startAttack(H[i], 0);
  }

  startRoll(dirx, dirz) {
    this.state = 'roll';
    this.stT = 0;
    this.useSt(18);
    const m = Math.hypot(dirx, dirz);
    if (m < 0.1) {
      // paso atrás
      this.rollBack = true;
      const f = this.forward();
      this.rollDir = { x: -f.x, z: -f.z };
      this.anim.play(this.clips.backstep, { blend: 0.06 });
    } else {
      this.rollBack = false;
      this.rollDir = { x: dirx / m, z: dirz / m };
      this.yaw = Math.atan2(this.rollDir.x, this.rollDir.z);
      this.anim.play(this.clips.roll, { blend: 0.05 });
    }
    this.game.audio && this.game.audio.play('roll', this.pos);
  }

  startHeal() {
    if (this.flasks <= 0) {
      this.game.ui && this.game.ui.toast('No te quedan ampollas');
      return;
    }
    this.flasks--;
    this.state = 'heal';
    this.stT = 0;
    this.flask.visible = true;
    this.anim.play(this.clips.heal, { blend: 0.14 });
  }

  // 'smash': golpe de arriba abajo (romper un mueble); 'yaw' encara el objeto.
  playInteract(kind = 'interact', yaw = null) {
    this.state = 'interact';
    this.stT = 0;
    this.vx = this.vz = 0;
    this.interactKind = kind;
    this.interactYaw = yaw;
    // el golpe para romper es el pesado del arma que se empuña
    const smash = this.set.heavy[0].clip;
    this.anim.play(kind === 'push' ? this.clips.push : kind === 'smash' ? smash : this.clips.interact, { blend: 0.12 });
    this.interactDur = kind === 'push' ? 0.8 : kind === 'smash' ? 1.0 : 0.7;
  }

  startRest() {
    this.state = 'rest';
    this.stT = 0;
    this.vx = this.vz = 0;
    this.anim.play(this.clips.rest, { blend: 0.3 });
  }

  startWake() {
    this.state = 'wake';
    this.stT = 0;
    this.anim.play(this.clips.wake, { blend: 0 });
    this.anim.weight = 1;
  }

  onAnimEvent(e) {
    const g = this.game;
    // (al romper un mueble suena el pesado del arma empuñada)
    const a = this.state === 'interact' ? this.set.heavy[0] : this.atk;
    if (e === 'swing') g.audio && g.audio.play(a && a.snd ? a.snd : a && a.heavy ? 'swingHeavy' : 'swing', this.pos);
    // el hacha muerde el suelo
    if (e === 'impact' && this.state === 'attack' && a && a.impact) g.combat && g.combat.playerImpact && g.combat.playerImpact(this, a);
    // katana: desenvainado y destello sagrado
    if (e === 'draw') g.audio && g.audio.play('iai', this.pos);
    if (e === 'flash' && this.state === 'attack') {
      const k = Math.min(1, this.charge / ((a && a.charge && a.charge.max) || 1));
      g.flash = Math.max(g.flash || 0, 0.25 + k * 0.45);
      g.flashTint = [1, 0.9, 0.62];
      g.camRig && g.camRig.shake(0.12 + k * 0.2);
    }
    if (e === 'flick') g.audio && g.audio.play('flick', this.pos);
    if (e === 'drink') {
      const amt = Math.round(this.maxHp * 0.45);
      this.hp = Math.min(this.maxHp, this.hp + amt);
      this.game.audio && this.game.audio.play('heal', this.pos);
      this.game.fx && this.game.fx.healGlow(this);
    }
  }

  onStep(side, w) {
    const g = this.game;
    if (g.state !== 'play' || !this.body.grounded || w < 0.2) return;
    g.audio && g.audio.play('step', null, { side, w, run: this.sprinting });
  }

  // Criatura a la que "se pega" el ataque sin fijar (apuntado suave).
  softTarget(dirYaw, maxAng, maxD) {
    let best = null,
      bs = 1e9;
    for (const e of this.game.activeEnemies) {
      if (!e.lockable) continue;
      const dx = e.pos.x - this.pos.x,
        dz = e.pos.z - this.pos.z;
      const d = Math.hypot(dx, dz) - e.body.radius;
      if (d > maxD || Math.abs(e.pos.y - this.pos.y) > 1.8) continue;
      const a = Math.abs(angleDiff(dirYaw, Math.atan2(dx, dz)));
      if (a > maxAng) continue;
      const s = d + a * 1.5;
      if (s < bs) {
        bs = s;
        best = e;
      }
    }
    return best;
  }

  // ------------------------------------------------------------ daño
  // Devuelve 'hit' | 'block' | 'dodge' | 'guardbreak'
  receiveHit(atk, fromX, fromZ) {
    if (this.dead || this.state === 'wake') return 'none';
    if (this.iframe) return 'dodge';
    const dx = fromX - this.pos.x,
      dz = fromZ - this.pos.z;
    const toSrc = Math.atan2(dx, dz);
    const facing = Math.abs(angleDiff(this.yaw, toSrc)) < 80 * DEG;
    if (this.blocking && this.blockW > 0.5 && facing && !atk.unblockable && this.canBlock()) {
      // a dos manos se para con el arma: cuesta más aguante y entra más daño
      const bk = this.twoHanded && this.hasSword ? this.weapon.blockK || { st: 1.3, chip: 0.2 } : null;
      const cost = (atk.stDmg ?? atk.dmg * 1.1) * (bk ? bk.st : 1);
      this.useSt(cost);
      const d = Math.hypot(dx, dz) || 1;
      this.vx = (-dx / d) * 3.2;
      this.vz = (-dz / d) * 3.2;
      this.flinchX.kick(-3);
      if (this.st <= 0) {
        this.hp -= Math.round(atk.dmg * 0.5);
        this.state = 'stagger';
        this.stT = 0;
        this.blocking = false;
        this.anim.play(this.clips.stagger, { blend: 0.03 });
        if (this.hp <= 0) this.die();
        return 'guardbreak';
      }
      this.hp -= Math.round(atk.dmg * (bk ? Math.max(bk.chip, atk.chip ?? 0) : atk.chip ?? 0.08));
      this.anim.play(this.clips.blockHit, { blend: 0.03 });
      this.state = 'blockhit';
      this.stT = 0;
      if (this.hp <= 0) this.die();
      return 'block';
    }
    this.hp -= atk.dmg;
    this.lastHitBy = atk;
    this.lastHitT = this.game.time;
    const d = Math.hypot(dx, dz) || 1;
    const kb = atk.knock ?? (atk.dmg >= 30 ? 6 : 3.5);
    this.vx = (-dx / d) * kb;
    this.vz = (-dz / d) * kb;
    this.flask.visible = false;
    // retroceso físico (se suma a la animación de daño)
    this.flinchX.kick(-6 - atk.dmg * 0.12);
    this.flinchY.kick((Math.random() - 0.5) * 8);
    if (this.hp <= 0) {
      this.die();
      return 'hit';
    }
    this.blocking = false;
    if (atk.dmg >= 30 || atk.stagger) {
      this.state = 'stagger';
      this.anim.play(this.clips.stagger, { blend: 0.04 });
    } else {
      this.state = 'hurt';
      this.anim.play(this.clips.hurt, { blend: 0.04 });
    }
    this.yaw = toSrc; // encarar al atacante
    this.stT = 0;
    return 'hit';
  }

  // Atrapado por el Descoyuntado: sin control; forcejear (pulsar ataque,
  // esquiva o interactuar) suelta antes.
  startGrabbed() {
    this.state = 'grabbed';
    this.stT = 0;
    this.mash = 0;
    this.blocking = false;
    this.buffer = null;
    this.vx = this.vz = 0;
    this.flask.visible = false;
    this.anim.play(this.clips.hurt, { blend: 0.05 });
  }
  receiveBite(dmg) {
    if (this.dead) return;
    this.hp -= dmg;
    this.lastHitT = this.game.time;
    this.flinchX.kick(-7);
    this.flinchY.kick((Math.random() - 0.5) * 10);
    this.anim.play(this.clips.hurt, { blend: 0.03 });
    this.game.audio && this.game.audio.play('playerHurt', this.pos);
    if (this.hp <= 0) this.die();
  }
  releaseGrab(knock, fx, fz, dmg = 0) {
    if (this.dead) return;
    this.hp -= dmg;
    if (this.hp <= 0) return this.die();
    this.state = 'stagger';
    this.stT = 0;
    this.vx = fx * knock;
    this.vz = fz * knock;
    this.anim.play(this.clips.stagger, { blend: 0.04 });
  }

  die() {
    this.hp = 0;
    if (this.dead) return;
    this.dead = true;
    this.state = 'dead';
    this.stT = 0;
    this.blocking = false;
    this.anim.play(this.clips.death, { blend: 0.08 });
    this.game.onPlayerDeath && this.game.onPlayerDeath();
  }

  // ------------------------------------------------------------ update
  update(dt, input, cam, allowControl = true) {
    const g = this.game;
    this.stT += dt;
    this.comboT -= dt;
    const target = g.lockTarget;

    // entrada de movimiento relativa a cámara
    const mv = allowControl ? input.move() : { x: 0, y: 0 };
    const cy = cam.yaw;
    const fx = Math.sin(cy),
      fz = Math.cos(cy);
    const rx = -Math.cos(cy),
      rz = Math.sin(cy);
    let wx = fx * mv.y + rx * mv.x,
      wz = fz * mv.y + rz * mv.x;
    if (this.autoDir) {
      // caminata automática (escena final)
      wx = this.autoDir.x * this.autoDir.m;
      wz = this.autoDir.z * this.autoDir.m;
    }
    const mag = Math.min(1, Math.hypot(wx, wz));
    this.moveMag = mag;

    // buffer de entrada (0.4 s)
    if (allowControl) {
      for (const a of ['light', 'heavy', 'heal', 'interact']) if (input.pressed(a)) this.buffer = { a, t: 0.4 };
      if (input.released('dodge') && input.held('dodge') === 0 && this._dodgeHeld < 0.3) this.buffer = { a: 'dodge', t: 0.35 };
    }
    this._dodgeHeld = allowControl ? input.held('dodge') : 0;
    if (this.buffer) {
      this.buffer.t -= dt;
      if (this.buffer.t <= 0) this.buffer = null;
    }
    const take = (a) => {
      if (this.buffer && this.buffer.a === a) {
        this.buffer = null;
        return true;
      }
      return false;
    };
    const has = (a) => this.buffer && this.buffer.a === a;

    // regeneración de aguante
    this.stDelay -= dt;
    if (this.stDelay <= 0 && this.state !== 'attack' && this.state !== 'roll' && !this.sprinting) {
      const rate = this.blocking ? 20 : 45;
      this.st = Math.min(this.maxSt, this.st + rate * dt);
    }

    let desiredSpeed = 0;
    let faceTarget = null;
    let turnRate = 14;
    const st = this.state;
    this.iframe = false;
    this.sprinting = false;
    this.swinging = false;

    // la carga de un pesado sólo existe mientras se ataca
    if (st !== 'attack' && this.charging) {
      this.charging = false;
      this.anim.speed = 1;
    }

    if (st === 'free' || st === 'blockhit') {
      const wantBlock = allowControl && input.down('block') && this.canBlock() && st === 'free';
      this.blocking = wantBlock || st === 'blockhit';
      const sprintHeld = allowControl && (input.held('dodge') > 0.3 || input.down('sprint'));
      this.sprinting = sprintHeld && mag > 0.3 && this.st > 0 && !this.blocking;
      if (this.sprinting) {
        this.st -= 14 * dt;
        this.stDelay = 0.45;
      }
      const base = this.blocking ? BLOCKWALK : this.sprinting ? RUN : target ? STRAFE : mag < 0.55 ? lerp(0, WALK, mag / 0.55) / Math.max(mag, 0.01) : JOG;
      desiredSpeed = base * mag;
      if (st === 'blockhit') {
        desiredSpeed = 0;
        if (this.anim.done) this.state = 'free';
      }
      // orientación
      if (target && !this.sprinting) faceTarget = Math.atan2(target.pos.x - this.pos.x, target.pos.z - this.pos.z);
      else if (mag > 0.1) faceTarget = Math.atan2(wx, wz);
      turnRate = this.sprinting ? 9 : 15;

      if (st === 'free') {
        const M = this.set;
        if (take('dodge') && this.canAct()) this.startRoll(wx, wz);
        else if (has('light') && this.hasSword && this.canAct()) {
          take('light');
          const idx = this.comboT > 0 ? (this.combo + 1) % M.light.length : 0;
          this.orientForAttack(target, wx, wz, mag);
          // lanza: se clava sin bajar el escudo
          if (this.blocking && M.guard) this.startAttack(M.guard, this.combo);
          else if (this.sprinting && Math.hypot(this.vx, this.vz) > 5) this.startAttack(M.run, M.light.length - 1);
          else this.startAttack(M.light[idx], idx);
        } else if (has('heavy') && this.hasSword && this.canAct()) {
          take('heavy');
          this.orientForAttack(target, wx, wz, mag);
          this.startHeavy(false);
        } else if (take('heal')) this.startHeal();
        else if (take('interact')) g.tryInteract && g.tryInteract();
      }
    } else if (st === 'attack') {
      const a = this.atk;
      const M = this.set;
      this.blocking = !!a.keepBlock && this.canBlock();
      // reloj del golpe: se detiene mientras se carga un pesado
      if (a.charge && !this.chargeDone) {
        const c = a.charge;
        if (this.atkT >= c.at) {
          if (allowControl && input.down('heavy') && this.charge < c.max) {
            this.charging = true;
            this.charge += dt;
            this.anim.speed = 0;
            this.anim.t = c.at;
            this.atkT = c.at;
          } else {
            this.chargeDone = true;
            this.charging = false;
            this.anim.speed = 1;
            this.atkMul = 1 + c.dmg * Math.min(1, this.charge / c.max);
          }
        }
      }
      if (!this.charging) this.atkT += dt;
      const t = this.atkT;
      // seguimiento durante la preparación: giro rápido hacia el objetivo del
      // golpe al empezar, luego corrección suave
      if (t < a.hit[0]) {
        let ty = this.aimYaw;
        if (target) ty = Math.atan2(target.pos.x - this.pos.x, target.pos.z - this.pos.z);
        else if (mag > 0.2 && t > 0.08) ty = Math.atan2(wx, wz);
        if (ty !== null && ty !== undefined) this.yaw = approachAngle(this.yaw, ty, (t < 0.1 ? 20 : 8) * dt);
      }
      // estocada (desplazamiento con perfil suave)
      const [l0, l1, ls] = a.lunge;
      const f = this.forward();
      if (t >= l0 && t <= l1) {
        // no atravesar a la criatura: frenar si ya está pegada
        const near = target && target.distTo(this.pos) < target.body.radius + this.body.radius + 0.5;
        const u = (t - l0) / (l1 - l0);
        const sp = ls * Math.sin(Math.PI * u) * 1.45 * (near ? 0.15 : 1);
        this.vx = f.x * sp;
        this.vz = f.z * sp;
      } else {
        this.vx = damp(this.vx, 0, 12, dt);
        this.vz = damp(this.vz, 0, 12, dt);
      }
      // ventanas de impacto (un golpe puede tener varias: cada una vuelve a herir)
      for (let i = 0; i < a.hits.length; i++) {
        const [h0, h1] = a.hits[i];
        if (t >= h0 && t <= h1) {
          if (this.hitWin !== i) {
            if (this.hitWin >= 0) this.hitSet.clear();
            this.hitWin = i;
          }
          this.swinging = true;
          g.combat.playerSwing(this, a);
          break;
        } else if (t >= h0 - 0.06 && t <= h1 + 0.05) this.swinging = true;
      }
      // encadenar
      if (t >= a.cancel) {
        if (has('light') && this.canAct() && !a.heavy && this.hasSword) {
          take('light');
          this.orientForAttack(target, wx, wz, mag);
          if (a.keepBlock && M.guard && input.down('block')) this.startAttack(M.guard, this.combo);
          else {
            const idx = (this.combo + 1) % M.light.length;
            this.startAttack(M.light[idx], idx);
          }
        } else if (has('heavy') && this.canAct()) {
          take('heavy');
          this.orientForAttack(target, wx, wz, mag);
          this.startHeavy(!!a.heavy);
        } else if (has('dodge') && this.canAct()) {
          take('dodge');
          this.startRoll(wx, wz);
        }
      }
      // moverse corta la recuperación
      if (this.state === 'attack' && t >= a.move && mag > 0.35) {
        this.state = 'free';
        this.comboT = 0.3;
        this.anim.stop(0.22);
      }
      if (this.state === 'attack' && this.atkT >= a.clip.dur) {
        this.state = 'free';
        this.comboT = 0.35;
        this.anim.stop(0.14);
      }
      desiredSpeed = -1; // velocidad gestionada arriba
    } else if (st === 'roll') {
      const dur = this.rollBack ? 0.46 : 0.64;
      const t = this.stT / dur;
      this.iframe = this.rollBack ? this.stT > 0.03 && this.stT < 0.26 : this.stT > 0.04 && this.stT < 0.42;
      const spd = this.rollBack ? 5.6 * Math.max(0, 1 - t * 1.6) : 7.6 * Math.pow(Math.max(0, 1 - t), 0.6);
      this.vx = this.rollDir.x * spd;
      this.vz = this.rollDir.z * spd;
      desiredSpeed = -1;
      if (this.stT > dur * 0.7) {
        if (has('light') && this.canAct() && this.hasSword) {
          take('light');
          this.orientForAttack(target, wx, wz, mag);
          this.startAttack(this.set.roll, 0);
        } else if (has('dodge') && this.canAct() && this.stT > dur * 0.82) {
          take('dodge');
          this.startRoll(wx, wz);
        } else if (mag > 0.35 && this.stT > dur * 0.86) {
          // salir corriendo del final de la voltereta
          this.state = 'free';
          this.anim.stop(0.2);
        }
      }
      if (this.state === 'roll' && this.stT >= dur) {
        this.state = 'free';
        this.anim.stop(this.rollBack ? 0.16 : 0.12);
      }
    } else if (st === 'heal') {
      desiredSpeed = 1.3 * mag;
      if (mag > 0.1) faceTarget = target ? Math.atan2(target.pos.x - this.pos.x, target.pos.z - this.pos.z) : Math.atan2(wx, wz);
      turnRate = 6;
      if (this.stT >= 1.15) {
        this.state = 'free';
        this.flask.visible = false;
        this.anim.stop(0.2);
      }
    } else if (st === 'hurt' || st === 'stagger') {
      const dur = st === 'hurt' ? 0.42 : 1.0;
      this.vx = damp(this.vx, 0, 6, dt);
      this.vz = damp(this.vz, 0, 6, dt);
      desiredSpeed = -1;
      if (this.stT >= dur) {
        this.state = 'free';
        this.anim.stop(0.18);
      } else if (st === 'hurt' && this.stT > 0.24 && has('dodge') && this.canAct()) {
        take('dodge');
        this.startRoll(wx, wz);
      }
    } else if (st === 'interact') {
      desiredSpeed = 0;
      if (this.interactYaw !== null && this.interactYaw !== undefined) {
        faceTarget = this.interactYaw;
        turnRate = 16;
      }
      if (this.interactKind === 'smash' && this.stT > 0.4 && this.stT < 0.6) this.swinging = true;
      if (this.stT >= this.interactDur) {
        this.state = 'free';
        this.anim.stop(0.2);
      }
    } else if (st === 'rest') {
      desiredSpeed = 0;
      if (this.stT > 1.0 && allowControl && (mag > 0.3 || input.pressed('dodge') || input.pressed('interact') || input.pressed('back'))) {
        this.state = 'free';
        this.anim.stop(0.45);
        g.onLeaveRest && g.onLeaveRest();
      }
    } else if (st === 'wake') {
      desiredSpeed = 0;
      if (this.stT >= 3.4) {
        this.state = 'free';
        this.anim.stop(0.4);
      }
    } else if (st === 'dead') {
      desiredSpeed = 0;
      this.vx = damp(this.vx, 0, 5, dt);
      this.vz = damp(this.vz, 0, 5, dt);
    } else if (st === 'cine') {
      desiredSpeed = 0;
    } else if (st === 'grabbed') {
      desiredSpeed = -1;
      this.vx = this.vz = 0;
      this.buffer = null;
      if (allowControl) for (const a of ['light', 'heavy', 'dodge', 'interact', 'block']) if (input.pressed(a)) this.mash = (this.mash || 0) + 1;
    }

    // velocidad horizontal: acelera rápido, frena algo más rápido
    if (desiredSpeed >= 0) {
      let dx = 0,
        dz = 0;
      if (mag > 0.01) {
        dx = (wx / Math.max(mag, 0.001)) * desiredSpeed;
        dz = (wz / Math.max(mag, 0.001)) * desiredSpeed;
      }
      const speeding = dx * dx + dz * dz > this.vx * this.vx + this.vz * this.vz;
      const k = st === 'free' ? (speeding ? 10 : 14) : 6;
      this.vx = damp(this.vx, dx, k, dt);
      this.vz = damp(this.vz, dz, k, dt);
    }
    if (faceTarget !== null) this.yaw = dampAngle(this.yaw, faceTarget, turnRate, dt);

    // física (y golpe al aterrizar tras una caída)
    const airVy = this.body.grounded ? 0 : this.body.vy || 0;
    moveBody(g.world.col, this.body, this.vx * dt, this.vz * dt, dt);
    if (airVy < -5.5 && this.body.grounded && g.state === 'play') g.audio && g.audio.play('land', this.pos, { v: -airVy });

    // escudo arriba/abajo
    this.blockW = damp(this.blockW, this.blocking ? 1 : 0, 16, dt);
    this.exert = damp(this.exert, this.sprinting ? 1 : this.state === 'attack' ? 0.6 : 0, this.sprinting ? 0.8 : 0.25, dt);
    this.animate(dt);
  }

  // Hacia dónde irá el golpe (el giro se hace en los primeros fotogramas).
  orientForAttack(target, wx, wz, mag) {
    this.aimYaw = this.yaw;
    if (target) {
      this.aimYaw = Math.atan2(target.pos.x - this.pos.x, target.pos.z - this.pos.z);
      return;
    }
    // apuntado suave: sin fijar, el golpe busca a la criatura de delante
    const dir = mag > 0.2 ? Math.atan2(wx, wz) : this.yaw;
    const soft = this.softTarget(dir, mag > 0.2 ? 40 * DEG : 75 * DEG, 3.4);
    if (soft) this.aimYaw = Math.atan2(soft.pos.x - this.pos.x, soft.pos.z - this.pos.z);
    else if (mag > 0.2) this.aimYaw = dir;
  }

  // Locomoción procedural + clip de acción + IK de piernas + muelles.
  animate(dt) {
    const g = this.game;
    const t = g.time;
    const target = g.lockTarget;
    const gait = this.gait;
    const pose = gait.update(dt, this.vx, this.vz, this.yaw, {
      time: t,
      grounded: this.body.grounded,
      crouch: this.blockW * 0.05 + (target ? 0.025 : 0),
      exert: this.exert,
      ground: this._groundFn,
      pos: this._gpos.set(this.body.pos.x, this.visY, this.body.pos.z),
    });
    // brazos por IK: guardia del arma con balanceo al andar; al correr, el
    // arma atrás (o al hombro) y, si es a dos manos, la izquierda suelta el mango
    const sw = Math.cos(gait.phase * Math.PI * 2) * gait.mw;
    const run = gait.runW * gait.mw;
    const two = this.twoHanded && this.hasSword;
    if (this.hasSword) this.weapon.carry(pose, sw, run);
    else {
      pose.armR = [-sw * 0.45, 0, -0.1];
      pose.foreR = [-0.25 - run * 0.9, 0, 0];
      pose.handR = [0, 0, 0];
    }
    // escudo: en guardia delante del cuerpo al estar quieto o con un objetivo
    // fijado; al andar el brazo se relaja y lo abre hacia fuera, y al correr
    // lo lleva al costado, de canto a la marcha (delante del pecho, con el
    // braceo, se metía en el torso)
    const lk = target ? 1 : 0;
    const shR = run * (1 - lk),
      shW = gait.mw * (1 - shR) * (1 - lk),
      shG = 1 - shW - shR;
    this._shCarry = [shG, shW, shR];
    if (!two) {
      if (this.hasShield)
        pose.ikL = [
          0.2 * shG + 0.24 * shW + 0.29 * shR,
          0.2 * shG + 0.17 * shW + (0.16 + Math.abs(sw) * 0.02) * shR,
          (0.31 - sw * 0.03 * lk) * shG + (0.28 - sw * 0.05) * shW + (0.26 - sw * 0.1) * shR,
        ];
      else {
        pose.armL = [sw * 0.45, 0, 0.1];
        pose.foreL = [-0.25 - run * 0.9, 0, 0];
      }
    }
    // bloqueo (tren superior): con escudo o con el arma
    if (this.blockW > 0.01) blendInto(pose, this.blockRad, this.blockW, UPPER);
    this.resolveArms(pose);
    // clip de acción
    const ap = this.anim.update(dt);
    const c = this.anim.clip;
    const aw = ap ? this.anim.weight : 0;
    let clipPose = null;
    if (ap && aw > 0) {
      if (c.legs && c.ground) clipPose = ap;
      blendInto(pose, ap, aw, c.mask, this.anim.jw);
    }
    // piernas por IK (pies plantados); los clips sin apoyo mandan sobre ellas
    const ikW = c && c.legs && !c.ground ? 1 - aw : 1;
    if (ikW > 0.001) gait.solve(pose, { w: ikW, clipPose, clipW: clipPose ? aw : 0, clipGround: true });
    // cabeza hacia el objetivo fijado
    let hy = 0;
    if (target && !this.dead) hy = clamp(angleDiff(this.yaw, Math.atan2(target.pos.x - this.pos.x, target.pos.z - this.pos.z)), -0.9, 0.9);
    this.headYaw = damp(this.headYaw, hy, 8, dt);
    if (Math.abs(this.headYaw) > 0.001) {
      addRot(pose, 'chest', [0, this.headYaw * 0.35, 0]);
      addRot(pose, 'head', [0, this.headYaw * 0.55, 0]);
    }
    // retrocesos (muelles) al recibir golpes
    const fx = this.flinchX.update(dt),
      fy = this.flinchY.update(dt);
    if (Math.abs(fx) + Math.abs(fy) > 0.002) {
      addRot(pose, 'chest', [fx * 0.05, fy * 0.04, 0]);
      addRot(pose, 'head', [fx * 0.05, fy * 0.05, 0]);
    }
    // capa con inercia
    const f = this.forward();
    const fwdSp = this.vx * f.x + this.vz * f.z;
    const sideSp = this.vx * -f.z + this.vz * f.x;
    const cx = this.cloakX.update(dt, clamp(fwdSp * 0.11 + gait.acc * 0.012, -0.2, 0.95));
    const cz = this.cloakZ.update(dt, clamp(-sideSp * 0.08, -0.4, 0.4) + Math.sin(t * 1.3) * 0.03);
    // la capa cuelga hacia abajo: compensa la inclinación del torso
    const chestP = pose.chest ? wrapAngle(pose.chest[0]) : 0;
    const hipsP = pose.hips ? wrapAngle(pose.hips[0]) : 0;
    const rollW = this.state === 'roll' ? 0 : 1;
    pose.cloak = [cx + 0.07 - (chestP * 0.6 + hipsP * 0.5) * rollW + Math.sin(gait.phase * Math.PI * 4) * 0.025 * gait.mw, 0, cz];
    const ls = this.lampS.update(dt, clamp(-fwdSp * 0.05, -0.4, 0.4));
    pose.lantern = [ls + Math.sin(gait.phase * Math.PI * 4) * 0.08 * gait.mw, 0, 0];
    this.rig.apply(pose);

    // posición visual (suavizado de escalones)
    this.visY = this.body.grounded ? damp(this.visY, this.body.pos.y, 18, dt) : this.body.pos.y;
    if (Math.abs(this.visY - this.body.pos.y) > 1) this.visY = this.body.pos.y;
    this.obj.position.set(this.body.pos.x, this.visY, this.body.pos.z);
    this.obj.rotation.y = this.yaw;
    this.phase = gait.phase * Math.PI * 2;
    // escudo: orientado respecto al pecho (de cara en guardia, abierto al
    // andar, de canto al correr) con muelles que lo dejan balancearse con el
    // brazo y quedarse atrás en los giros; subido al bloquear y, pase lo que
    // pase, fuera del cuerpo
    if (this.hasShield && !two) {
      const healW = this.state === 'heal' ? clamp(1 - Math.abs(this.stT - 0.62) / 0.5, 0, 1) : 0;
      const rolling = this.state === 'roll' || this.state === 'dead' || this.state === 'wake' || this.state === 'rest';
      const [cg, cw, cr] = this._shCarry;
      const turn = clamp(-gait.yawRate * 0.05, -0.3, 0.3) * (cw + cr);
      const yawT = 0.42 * cg + 0.72 * cw + 1.25 * cr + sw * (0.14 * cw + 0.12 * cr) + turn;
      // (casi vertical: inclinado hacia atrás, el canto de arriba se metía en la hombrera)
      const pitchT = -0.03 * cg - 0.01 * cw + (0.02 + sw * 0.1) * cr;
      const sy = this.shieldYaw.update(dt, yawT),
        sp = this.shieldPitch.update(dt, pitchT);
      stabilizeShield(this.rig, {
        w: rolling ? 0.35 : lerp(0.94, 0.75, healW),
        yaw: lerp(sy, 0.1, this.blockW) + healW * 1.15,
        pitch: lerp(sp, -0.04, this.blockW),
        roll: this.shieldRoll.update(dt, sw * 0.08 * (cw + cr)) * (1 - this.blockW),
        out: 0.07,
        along: 0.13,
        // el antebrazo cruza la parte alta del escudo (como con los tiros de
        // un escudo de lágrima); al bloquear, centrado para cubrir la cara
        raise: -(0.05 * cg + 0.12 * cw + 0.14 * cr) * (1 - this.blockW),
      });
      this.shieldPush = keepShieldOut(this.rig, this.shieldHold, dt);
    }
    // parpadeo de la lámpara
    // (lampK: las cinemáticas pueden hacerlo titilar o apagarse)
    this.lamp.intensity = this.lampBase * this.lampK * (0.9 + 0.07 * Math.sin(t * 11) + 0.05 * Math.sin(t * 23.7));
  }
}


