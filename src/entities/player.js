// El Condenado: controlador del jugador (combate Soulslike simplificado).
import * as THREE from 'three';
import { buildPlayer } from './models.js';
import { Animator, clip, blendInto, UPPER } from './rig.js';
import { moveBody } from '../world/collision.js';
import { clamp, damp, dampAngle, approachAngle, angleDiff, DEG, lerp } from '../core/util.js';
import { objMat } from '../gfx/materials.js';

// ---------------------------------------------------------------- clips
const GUARD = { armR: [-28, 0, -6], foreR: [-62, 0, 0], handR: [38, 0, 0], armL: [-28, 0, 14], foreL: [-58, 0, 0] };
const STANCE = { legL: [14, 0, 4], shinL: [18, 0, 0], legR: [-22, 0, -4], shinR: [22, 0, 0], root: [0, -5, 0] };

const C = {
  light1: clip(
    'light1',
    0.64,
    [
      [0, { ...STANCE, chest: [6, -38, 0], armR: [-80, 0, -70], foreR: [-30, 0, 0], handR: [60, 0, -20], armL: [-30, 0, 24], foreL: [-60, 0, 0] }],
      [0.15, { ...STANCE, chest: [8, -55, 0], armR: [-88, 0, -95], foreR: [-25, 0, 0], handR: [75, 0, -30], armL: [-30, 0, 24], foreL: [-60, 0, 0] }],
      [0.27, { ...STANCE, chest: [14, 42, 0], armR: [-90, 0, 30], foreR: [-8, 0, 0], handR: [82, 0, 20], armL: [-20, 0, 30], foreL: [-50, 0, 0] }, 'snap'],
      [0.4, { ...STANCE, chest: [12, 55, 0], armR: [-75, 0, 55], foreR: [-35, 0, 0], handR: [70, 0, 30], armL: [-20, 0, 30], foreL: [-50, 0, 0] }],
      [0.64, { ...GUARD, chest: [0, 0, 0] }],
    ],
    { events: [{ t: 0.19, name: 'swing' }] }
  ),
  light2: clip(
    'light2',
    0.62,
    [
      [0, { ...STANCE, chest: [8, 50, 0], armR: [-80, 0, 45], foreR: [-30, 0, 0], handR: [70, 0, 20], armL: [-20, 0, 30], foreL: [-50, 0, 0] }],
      [0.14, { ...STANCE, chest: [8, 58, 0], armR: [-86, 0, 60], foreR: [-20, 0, 0], handR: [78, 0, 25] }],
      [0.26, { ...STANCE, chest: [12, -45, 0], armR: [-92, 0, -80], foreR: [-8, 0, 0], handR: [82, 0, -30], armL: [-30, 0, 20], foreL: [-60, 0, 0] }, 'snap'],
      [0.4, { ...STANCE, chest: [10, -55, 0], armR: [-78, 0, -95], foreR: [-30, 0, 0], handR: [70, 0, -30] }],
      [0.62, { ...GUARD, chest: [0, 0, 0] }],
    ],
    { events: [{ t: 0.18, name: 'swing' }] }
  ),
  light3: clip(
    'light3',
    0.86,
    [
      [0, { ...STANCE, chest: [-6, -10, 0], armR: [-150, 0, -12], foreR: [-40, 0, 0], handR: [60, 0, 0] }],
      [0.26, { ...STANCE, chest: [-16, -12, 0], armR: [-205, 0, -14], foreR: [-25, 0, 0], handR: [55, 0, 0], armL: [-40, 0, 30], foreL: [-40, 0, 0] }],
      [0.38, { legL: [30, 0, 4], shinL: [10, 0, 0], legR: [-45, 0, -4], shinR: [40, 0, 0], root: [0, -14, 8], chest: [28, 0, 0], head: [-10, 0, 0], armR: [-50, 0, -4], foreR: [-4, 0, 0], handR: [84, 0, 0], armL: [-20, 0, 30], foreL: [-40, 0, 0] }, 'snap'],
      [0.56, { legL: [30, 0, 4], shinL: [10, 0, 0], legR: [-45, 0, -4], shinR: [40, 0, 0], root: [0, -14, 8], chest: [26, 0, 0], armR: [-48, 0, -4], foreR: [-6, 0, 0], handR: [80, 0, 0] }],
      [0.86, { ...GUARD }],
    ],
    { events: [{ t: 0.3, name: 'swing' }] }
  ),
  heavy: clip(
    'heavy',
    1.1,
    [
      [0, { ...GUARD }],
      [0.42, { legL: [20, 0, 8], shinL: [20, 0, 0], legR: [-30, 0, -8], shinR: [30, 0, 0], root: [0, -8, -4], chest: [-24, 10, 0], head: [-10, 0, 0], armR: [-212, 0, -16], foreR: [-30, 0, 0], handR: [50, 0, 0], armL: [-196, 0, -30], foreL: [-50, 0, 0] }],
      [0.56, { legL: [35, 0, 6], shinL: [10, 0, 0], legR: [-55, 0, -4], shinR: [55, 0, 0], root: [0, -22, 14], chest: [40, 0, 0], head: [-18, 0, 0], armR: [-44, 0, -2], foreR: [-4, 0, 0], handR: [86, 0, 0], armL: [-58, 0, -24], foreL: [-20, 0, 0] }, 'snap'],
      [0.8, { legL: [35, 0, 6], shinL: [10, 0, 0], legR: [-55, 0, -4], shinR: [55, 0, 0], root: [0, -22, 14], chest: [38, 0, 0], armR: [-42, 0, -2], foreR: [-6, 0, 0], handR: [84, 0, 0], armL: [-56, 0, -24], foreL: [-20, 0, 0] }],
      [1.1, { ...GUARD }],
    ],
    { events: [{ t: 0.47, name: 'swing' }] }
  ),
  roll: clip('roll', 0.64, [
    [0, { root: [0, -20, 0], chest: [30, 0, 0], legL: [-40, 0, 0], shinL: [60, 0, 0], legR: [-20, 0, 0], shinR: [60, 0, 0], armL: [-60, 0, 0], foreL: [-80, 0, 0], armR: [-50, 0, 0], foreR: [-80, 0, 0] }],
    [0.1, { root: [0, -45, 0], hips: [70, 0, 0], chest: [40, 0, 0], head: [30, 0, 0], legL: [-110, 0, 0], shinL: [130, 0, 0], legR: [-100, 0, 0], shinR: [130, 0, 0], armL: [-70, 0, 0], foreL: [-100, 0, 0], armR: [-70, 0, 0], foreR: [-100, 0, 0] }],
    [0.24, { root: [0, -60, 0], hips: [180, 0, 0], chest: [45, 0, 0], head: [30, 0, 0], legL: [-120, 0, 0], shinL: [140, 0, 0], legR: [-120, 0, 0], shinR: [140, 0, 0], armL: [-70, 0, 0], foreL: [-100, 0, 0], armR: [-70, 0, 0], foreR: [-100, 0, 0] }, 'linear'],
    [0.38, { root: [0, -48, 0], hips: [300, 0, 0], chest: [40, 0, 0], head: [20, 0, 0], legL: [-100, 0, 0], shinL: [130, 0, 0], legR: [-90, 0, 0], shinR: [120, 0, 0], armL: [-50, 0, 0], foreL: [-90, 0, 0], armR: [-50, 0, 0], foreR: [-90, 0, 0] }, 'linear'],
    [0.5, { root: [0, -22, 0], hips: [360, 0, 0], chest: [25, 0, 0], legL: [-50, 0, 0], shinL: [80, 0, 0], legR: [-10, 0, 0], shinR: [60, 0, 0], armL: [-30, 0, 10], foreL: [-60, 0, 0], armR: [-30, 0, -10], foreR: [-60, 0, 0] }],
    [0.64, { hips: [360, 0, 0], ...GUARD, root: [0, -6, 0] }],
  ]),
  backstep: clip('backstep', 0.46, [
    [0, { ...GUARD, chest: [-10, 0, 0] }],
    [0.12, { ...GUARD, root: [0, 6, 0], chest: [-18, 0, 0], legL: [-30, 0, 0], shinL: [40, 0, 0], legR: [20, 0, 0], shinR: [30, 0, 0] }],
    [0.3, { ...GUARD, root: [0, -12, 0], chest: [10, 0, 0], legL: [-20, 0, 0], shinL: [40, 0, 0], legR: [10, 0, 0], shinR: [40, 0, 0] }],
    [0.46, { ...GUARD }],
  ]),
  block: clip('block', 0.2, [[0, { armL: [-78, 18, -4], foreL: [-38, 0, 0], armR: [-30, 0, -10], foreR: [-70, 0, 0], handR: [40, 0, 0], chest: [6, -12, 0], head: [8, 8, 0] }]], { mask: UPPER }),
  blockHit: clip('blockHit', 0.32, [
    [0, { armL: [-60, 18, -4], foreL: [-50, 0, 0], armR: [-30, 0, -10], foreR: [-70, 0, 0], handR: [40, 0, 0], chest: [-12, -12, 0], head: [-8, 8, 0], root: [0, -4, -10] }],
    [0.32, { armL: [-78, 18, -4], foreL: [-38, 0, 0], armR: [-30, 0, -10], foreR: [-70, 0, 0], handR: [40, 0, 0], chest: [6, -12, 0] }],
  ]),
  heal: clip(
    'heal',
    1.15,
    [
      [0, { ...GUARD }],
      [0.3, { armR: [-20, 0, -10], foreR: [-50, 0, 0], handR: [40, 0, 0], armL: [-110, 0, -34], foreL: [-115, 0, 0], head: [-5, 0, 0] }],
      [0.55, { armR: [-20, 0, -10], foreR: [-50, 0, 0], handR: [40, 0, 0], armL: [-140, 0, -30], foreL: [-110, 0, 0], head: [-30, 0, 0], chest: [-8, 0, 0] }],
      [0.85, { armR: [-20, 0, -10], foreR: [-50, 0, 0], handR: [40, 0, 0], armL: [-140, 0, -30], foreL: [-110, 0, 0], head: [-30, 0, 0], chest: [-8, 0, 0] }],
      [1.15, { ...GUARD }],
    ],
    { mask: UPPER, events: [{ t: 0.62, name: 'drink' }] }
  ),
  hurt: clip('hurt', 0.5, [
    [0, { chest: [-28, 12, 0], head: [-25, 0, 0], armL: [-40, 0, 45], foreL: [-30, 0, 0], armR: [-30, 0, -45], foreR: [-40, 0, 0], root: [0, -6, -8], legL: [-15, 0, 0], shinL: [20, 0, 0], legR: [10, 0, 0], shinR: [25, 0, 0] }, 'snap'],
    [0.5, { ...GUARD }],
  ]),
  stagger: clip('stagger', 1.05, [
    [0, { chest: [-35, -15, 0], head: [-30, 0, 0], armL: [-20, 0, 70], foreL: [-20, 0, 0], armR: [-20, 0, -70], foreR: [-20, 0, 0], root: [0, -10, -10], legL: [-25, 0, 0], shinL: [40, 0, 0], legR: [15, 0, 0], shinR: [40, 0, 0] }, 'snap'],
    [0.5, { chest: [30, 0, 0], head: [20, 0, 0], armL: [-10, 0, 30], armR: [-10, 0, -30], root: [0, -25, 0], legL: [-40, 0, 0], shinL: [60, 0, 0], legR: [-10, 0, 0], shinR: [60, 0, 0] }],
    [1.05, { ...GUARD }],
  ]),
  death: clip('death', 2.0, [
    [0, { chest: [-30, 0, 0], head: [-30, 0, 0], armL: [-20, 0, 40], armR: [-20, 0, -40], root: [0, -5, 0] }, 'snap'],
    [0.5, { chest: [20, 0, 0], head: [30, 0, 0], armL: [0, 0, 10], armR: [0, 0, -10], foreR: [-10, 0, 0], root: [0, -45, 0], legL: [-95, 0, 5], shinL: [100, 0, 0], legR: [-95, 0, -5], shinR: [100, 0, 0] }],
    [1.1, { hips: [80, 0, 0], chest: [10, 0, 0], head: [20, 30, 0], armL: [-160, 0, 20], armR: [-30, 0, -60], root: [0, -78, 0], legL: [-10, 0, 5], shinL: [20, 0, 0], legR: [-5, 0, -8], shinR: [30, 0, 0] }, 'in'],
    [2.0, { hips: [86, 0, 0], chest: [4, 0, 0], head: [20, 40, 0], armL: [-160, 0, 20], armR: [-30, 0, -60], root: [0, -80, 0], legL: [-4, 0, 5], shinL: [10, 0, 0], legR: [-4, 0, -8], shinR: [10, 0, 0] }],
  ]),
  interact: clip('interact', 0.7, [
    [0, { ...GUARD }],
    [0.25, { root: [0, -35, 0], chest: [40, 0, 0], head: [20, 0, 0], legL: [-70, 0, 5], shinL: [100, 0, 0], legR: [-20, 0, -5], shinR: [80, 0, 0], armL: [-60, 0, 10], foreL: [-10, 0, 0], armR: [-20, 0, -10], foreR: [-60, 0, 0] }],
    [0.45, { root: [0, -35, 0], chest: [40, 0, 0], head: [20, 0, 0], legL: [-70, 0, 5], shinL: [100, 0, 0], legR: [-20, 0, -5], shinR: [80, 0, 0], armL: [-70, 0, 10], foreL: [-30, 0, 0], armR: [-20, 0, -10], foreR: [-60, 0, 0] }],
    [0.7, { ...GUARD }],
  ]),
  push: clip('push', 0.8, [
    [0, { ...GUARD }],
    [0.3, { chest: [20, 0, 0], armL: [-85, 0, 5], foreL: [-15, 0, 0], armR: [-85, 0, -5], foreR: [-15, 0, 0], legL: [-30, 0, 0], shinL: [20, 0, 0], legR: [25, 0, 0], shinR: [10, 0, 0] }],
    [0.6, { chest: [25, 0, 0], armL: [-80, 0, 5], foreL: [-5, 0, 0], armR: [-80, 0, -5], foreR: [-5, 0, 0], legL: [-35, 0, 0], shinL: [20, 0, 0], legR: [30, 0, 0], shinR: [10, 0, 0] }],
    [0.8, { ...GUARD }],
  ]),
  rest: clip('rest', 1.0, [[0, { root: [0, -48, 0], chest: [22, 0, 0], head: [35, 0, 0], legL: [-95, 0, 6], shinL: [95, 0, 0], legR: [5, 0, -4], shinR: [100, 0, 0], armR: [-48, 0, -6], foreR: [-45, 0, 0], handR: [60, 0, 0], armL: [-48, 0, 6], foreL: [-60, 0, 0] }]]),
  wake: clip('wake', 3.4, [
    [0, { root: [0, -80, 0], hips: [-88, 0, 0], chest: [-4, 0, 0], head: [-10, 30, 0], armL: [-10, 0, 60], armR: [-20, 0, -50], legL: [-4, 0, 6], legR: [-6, 0, -6] }],
    [1.2, { root: [0, -80, 0], hips: [-88, 0, 0], chest: [-4, 0, 0], head: [-10, -20, 0], armL: [-10, 0, 60], armR: [-20, 0, -50], legL: [-4, 0, 6], legR: [-6, 0, -6] }],
    [1.9, { root: [0, -72, 0], hips: [-20, 0, 0], chest: [30, 0, 0], head: [30, 0, 0], armL: [20, 0, 20], foreL: [-30, 0, 0], armR: [20, 0, -20], foreR: [-30, 0, 0], legL: [-90, 0, 10], shinL: [40, 0, 0], legR: [-80, 0, -10], shinR: [60, 0, 0] }],
    [2.6, { root: [0, -48, 0], chest: [30, 0, 0], head: [25, 0, 0], legL: [-95, 0, 6], shinL: [95, 0, 0], legR: [5, 0, -4], shinR: [100, 0, 0], armL: [-40, 0, 10], foreL: [-40, 0, 0], armR: [-40, 0, -10], foreR: [-40, 0, 0] }],
    [3.4, { head: [10, 0, 0], armL: [0, 0, 5], armR: [0, 0, -5] }],
  ]),
};

const LIGHT = [
  { clip: C.light1, dmg: 20, st: 13, hit: [0.2, 0.33], cancel: 0.38, lunge: [0.08, 0.3, 2.6], range: 2.35, arc: 120, poise: 18 },
  { clip: C.light2, dmg: 22, st: 13, hit: [0.19, 0.32], cancel: 0.37, lunge: [0.08, 0.28, 2.4], range: 2.35, arc: 120, poise: 18 },
  { clip: C.light3, dmg: 31, st: 17, hit: [0.33, 0.45], cancel: 0.6, lunge: [0.25, 0.42, 3.4], range: 2.5, arc: 70, poise: 32 },
];
const HEAVY = { clip: C.heavy, dmg: 54, st: 30, hit: [0.5, 0.63], cancel: 0.84, lunge: [0.44, 0.6, 3.6], range: 2.65, arc: 80, poise: 70, heavy: true };

const WALK = 3.3,
  RUN = 5.9,
  BLOCKWALK = 1.9;

export class Player {
  constructor(game) {
    this.game = game;
    this.hasSword = true;
    this.hasShield = true;
    this.rig = buildPlayer();
    this.obj = this.rig.root;
    this.obj.traverse((o) => (o.castShadow = false));
    this.body = { pos: new THREE.Vector3(), radius: 0.36, height: 1.8, stepH: 0.52, grounded: true, vy: 0 };
    this.visY = 0;
    this.yaw = 0;
    this.vx = 0;
    this.vz = 0;
    this.anim = new Animator(20);
    this.anim.onEvent = (e, c) => this.onAnimEvent(e, c);
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
    this.cloakSway = 0;
    this.moveMag = 0;
    this.flask = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.14, 6), objMat('glass'));
    this.flask.position.set(0, -0.08, 0.04);
    this.flask.visible = false;
    this.rig.joints.handL.add(this.flask);
    // luz de la lámpara del cinto
    this.lamp = new THREE.PointLight(0xffa860, 9, 12, 1.5);
    this.lamp.position.set(0, -0.08, 0.1);
    this.rig.joints.lantern.add(this.lamp);
    this.lampBase = 9;
    this.dead = false;
    this.lastHitBy = null;
  }

  setEquipment(sword, shield) {
    this.hasSword = sword;
    this.hasShield = shield;
    for (const m of this.rig.meshes) {
      const n = m.userData.matName;
      // la espada y el escudo están fusionados por material en su articulación
      if (m.parent === this.rig.joints.handR && (n === 'plate' || n === 'iron' || n === 'leather')) {
        if (n !== 'leather') m.visible = sword;
      }
      if (m.parent === this.rig.joints.foreL && n !== 'leather') m.visible = shield;
    }
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
    this.atk = def;
    this.hitSet.clear();
    this.useSt(def.st);
    this.anim.play(def.clip, { blend: 0.06 });
    this.combo = idx;
    this.game.onPlayerAttackStart && this.game.onPlayerAttackStart(def);
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
      this.anim.play(C.backstep, { blend: 0.05 });
    } else {
      this.rollBack = false;
      this.rollDir = { x: dirx / m, z: dirz / m };
      this.yaw = Math.atan2(this.rollDir.x, this.rollDir.z);
      this.anim.play(C.roll, { blend: 0.04 });
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
    this.anim.play(C.heal, { blend: 0.1 });
  }

  playInteract(kind = 'interact') {
    this.state = 'interact';
    this.stT = 0;
    this.vx = this.vz = 0;
    this.anim.play(kind === 'push' ? C.push : C.interact, { blend: 0.1 });
    this.interactDur = kind === 'push' ? 0.8 : 0.7;
  }

  startRest() {
    this.state = 'rest';
    this.stT = 0;
    this.vx = this.vz = 0;
    this.anim.play(C.rest, { blend: 0.25 });
  }

  startWake() {
    this.state = 'wake';
    this.stT = 0;
    this.anim.play(C.wake, { blend: 0 });
    this.anim.weight = 1;
  }

  onAnimEvent(e, name) {
    if (e === 'swing') this.game.audio && this.game.audio.play(this.atk && this.atk.heavy ? 'swingHeavy' : 'swing', this.pos);
    if (e === 'drink') {
      const amt = Math.round(this.maxHp * 0.45);
      this.hp = Math.min(this.maxHp, this.hp + amt);
      this.game.audio && this.game.audio.play('heal', this.pos);
      this.game.fx && this.game.fx.healGlow(this);
    }
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
    if (this.blocking && this.blockW > 0.5 && facing && !atk.unblockable && this.hasShield) {
      const cost = atk.stDmg ?? atk.dmg * 1.1;
      this.useSt(cost);
      const d = Math.hypot(dx, dz) || 1;
      this.vx = (-dx / d) * 3.2;
      this.vz = (-dz / d) * 3.2;
      if (this.st <= 0) {
        this.hp -= Math.round(atk.dmg * 0.5);
        this.state = 'stagger';
        this.stT = 0;
        this.blocking = false;
        this.anim.play(C.stagger, { blend: 0.02 });
        if (this.hp <= 0) this.die();
        return 'guardbreak';
      }
      this.hp -= Math.round(atk.dmg * (atk.chip ?? 0.08));
      this.anim.play(C.blockHit, { blend: 0.02 });
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
    if (this.hp <= 0) {
      this.die();
      return 'hit';
    }
    this.blocking = false;
    if (atk.dmg >= 30 || atk.stagger) {
      this.state = 'stagger';
      this.anim.play(C.stagger, { blend: 0.02 });
    } else {
      this.state = 'hurt';
      this.anim.play(C.hurt, { blend: 0.02 });
    }
    this.yaw = toSrc; // encarar al atacante
    this.stT = 0;
    return 'hit';
  }

  die() {
    this.hp = 0;
    if (this.dead) return;
    this.dead = true;
    this.state = 'dead';
    this.stT = 0;
    this.blocking = false;
    this.anim.play(C.death, { blend: 0.05 });
    this.game.onPlayerDeath && this.game.onPlayerDeath();
  }

  // ------------------------------------------------------------ update
  update(dt, input, cam, allowControl = true) {
    const g = this.game;
    this.stT += dt;
    this.comboT -= dt;
    const target = g.lockTarget;

    // entrada de movimiento relativa a cámara
    let mv = allowControl ? input.move() : { x: 0, y: 0 };
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

    // buffer de entrada (0.35 s)
    if (allowControl) {
      for (const a of ['light', 'heavy', 'heal', 'interact']) if (input.pressed(a)) this.buffer = { a, t: 0.35 };
      if (input.released('dodge') && input.held('dodge') === 0 && this._dodgeHeld < 0.3) this.buffer = { a: 'dodge', t: 0.3 };
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

    // regeneración de aguante
    this.stDelay -= dt;
    if (this.stDelay <= 0 && this.state !== 'attack' && this.state !== 'roll' && !this.sprinting) {
      const rate = this.blocking ? 18 : 42;
      this.st = Math.min(this.maxSt, this.st + rate * dt);
    }

    let desiredSpeed = 0;
    let faceTarget = null;
    const st = this.state;
    this.iframe = false;
    this.sprinting = false;

    if (st === 'free' || st === 'blockhit') {
      const wantBlock = allowControl && input.down('block') && this.hasShield && st === 'free';
      this.blocking = wantBlock || st === 'blockhit';
      const sprintHeld = allowControl && (input.held('dodge') > 0.3 || input.down('sprint'));
      this.sprinting = sprintHeld && mag > 0.3 && this.st > 0 && !this.blocking;
      if (this.sprinting) {
        this.st -= 15 * dt;
        this.stDelay = 0.4;
      }
      desiredSpeed = (this.blocking ? BLOCKWALK : this.sprinting ? RUN : WALK) * mag;
      if (st === 'blockhit') {
        desiredSpeed = 0;
        if (this.anim.done) this.state = 'free';
      }
      // orientación
      if (target && !this.sprinting) faceTarget = Math.atan2(target.pos.x - this.pos.x, target.pos.z - this.pos.z);
      else if (mag > 0.1) faceTarget = Math.atan2(wx, wz);

      if (st === 'free') {
        if (take('dodge') && this.canAct()) this.startRoll(wx, wz);
        else if (take('light') && this.canAct() && this.hasSword) {
          const idx = this.comboT > 0 ? (this.combo + 1) % 3 : 0;
          this.orientForAttack(target, wx, wz, mag);
          this.startAttack(LIGHT[idx], idx);
        } else if (take('heavy') && this.canAct() && this.hasSword) {
          this.orientForAttack(target, wx, wz, mag);
          this.startAttack(HEAVY, 0);
        } else if (take('heal')) this.startHeal();
        else if (take('interact')) g.tryInteract && g.tryInteract();
      }
    } else if (st === 'attack') {
      this.blocking = false;
      const a = this.atk;
      const t = this.stT;
      // seguimiento durante la preparación
      if (t < a.hit[0]) {
        let ty = null;
        if (target) ty = Math.atan2(target.pos.x - this.pos.x, target.pos.z - this.pos.z);
        else if (mag > 0.2) ty = Math.atan2(wx, wz);
        if (ty !== null) this.yaw = approachAngle(this.yaw, ty, 7 * dt);
      }
      // estocada (root motion)
      const [l0, l1, ls] = a.lunge;
      const f = this.forward();
      if (t >= l0 && t <= l1) {
        this.vx = f.x * ls;
        this.vz = f.z * ls;
      } else {
        this.vx = damp(this.vx, 0, 12, dt);
        this.vz = damp(this.vz, 0, 12, dt);
      }
      // ventana de impacto
      if (t >= a.hit[0] && t <= a.hit[1]) g.combat.playerSwing(this, a);
      // encadenar
      if (t >= a.cancel) {
        if (this.buffer && this.buffer.a === 'light' && this.canAct() && !a.heavy) {
          take('light');
          const idx = (this.combo + 1) % 3;
          this.orientForAttack(target, wx, wz, mag);
          this.startAttack(LIGHT[idx], idx);
        } else if (this.buffer && this.buffer.a === 'heavy' && this.canAct()) {
          take('heavy');
          this.orientForAttack(target, wx, wz, mag);
          this.startAttack(HEAVY, 0);
        } else if (this.buffer && this.buffer.a === 'dodge' && this.canAct()) {
          take('dodge');
          this.startRoll(wx, wz);
        }
      }
      if (this.state === 'attack' && this.stT >= a.clip.dur) {
        this.state = 'free';
        this.comboT = 0.35;
        this.anim.stop(0.12);
      }
      desiredSpeed = -1; // velocidad gestionada arriba
    } else if (st === 'roll') {
      const dur = this.rollBack ? 0.46 : 0.64;
      const t = this.stT / dur;
      this.iframe = this.rollBack ? this.stT > 0.03 && this.stT < 0.26 : this.stT > 0.05 && this.stT < 0.42;
      const spd = this.rollBack ? 5.5 * Math.max(0, 1 - t * 1.6) : 7.4 * Math.pow(Math.max(0, 1 - t), 0.6);
      this.vx = this.rollDir.x * spd;
      this.vz = this.rollDir.z * spd;
      desiredSpeed = -1;
      if (this.stT > dur * 0.72) {
        if (this.buffer && this.buffer.a === 'light' && this.canAct() && this.hasSword) {
          take('light');
          this.orientForAttack(target, wx, wz, mag);
          this.startAttack({ ...LIGHT[0], dmg: 24 }, 0);
        } else if (this.buffer && this.buffer.a === 'dodge' && this.canAct() && this.stT > dur * 0.85) {
          take('dodge');
          this.startRoll(wx, wz);
        }
      }
      if (this.state === 'roll' && this.stT >= dur) {
        this.state = 'free';
        this.anim.stop(0.0);
        this.anim.weight = this.rollBack ? 0.6 : 0;
      }
    } else if (st === 'heal') {
      desiredSpeed = 1.2 * mag;
      if (mag > 0.1) faceTarget = target ? Math.atan2(target.pos.x - this.pos.x, target.pos.z - this.pos.z) : Math.atan2(wx, wz);
      if (this.stT >= 1.15) {
        this.state = 'free';
        this.flask.visible = false;
        this.anim.stop(0.15);
      }
    } else if (st === 'hurt' || st === 'stagger') {
      const dur = st === 'hurt' ? 0.5 : 1.05;
      this.vx = damp(this.vx, 0, 6, dt);
      this.vz = damp(this.vz, 0, 6, dt);
      desiredSpeed = -1;
      if (this.stT >= dur) {
        this.state = 'free';
        this.anim.stop(0.15);
      } else if (st === 'hurt' && this.stT > 0.3 && this.buffer && this.buffer.a === 'dodge' && this.canAct()) {
        take('dodge');
        this.startRoll(wx, wz);
      }
    } else if (st === 'interact') {
      desiredSpeed = 0;
      if (this.stT >= this.interactDur) {
        this.state = 'free';
        this.anim.stop(0.15);
      }
    } else if (st === 'rest') {
      desiredSpeed = 0;
      if (this.stT > 1.0 && allowControl && (mag > 0.3 || input.pressed('dodge') || input.pressed('interact') || input.pressed('back'))) {
        this.state = 'free';
        this.anim.stop(0.4);
        g.onLeaveRest && g.onLeaveRest();
      }
    } else if (st === 'wake') {
      desiredSpeed = 0;
      if (this.stT >= 3.4) {
        this.state = 'free';
        this.anim.stop(0.3);
      }
    } else if (st === 'dead') {
      desiredSpeed = 0;
      this.vx = damp(this.vx, 0, 5, dt);
      this.vz = damp(this.vz, 0, 5, dt);
    } else if (st === 'cine') {
      desiredSpeed = 0;
    }

    // velocidad horizontal
    if (desiredSpeed >= 0) {
      let dx = 0,
        dz = 0;
      if (mag > 0.01) {
        dx = (wx / Math.max(mag, 0.001)) * desiredSpeed;
        dz = (wz / Math.max(mag, 0.001)) * desiredSpeed;
      }
      const k = st === 'free' ? 11 : 6;
      this.vx = damp(this.vx, dx, k, dt);
      this.vz = damp(this.vz, dz, k, dt);
    }
    if (faceTarget !== null) this.yaw = dampAngle(this.yaw, faceTarget, this.sprinting ? 9 : 14, dt);

    // física
    moveBody(g.world.col, this.body, this.vx * dt, this.vz * dt, dt);

    // escudo arriba/abajo
    this.blockW = damp(this.blockW, this.blocking ? 1 : 0, 18, dt);
    this.animate(dt);
  }

  orientForAttack(target, wx, wz, mag) {
    if (target) this.yaw = Math.atan2(target.pos.x - this.pos.x, target.pos.z - this.pos.z);
    else if (mag > 0.2) this.yaw = Math.atan2(wx, wz);
  }

  // Pose procedural de locomoción + clip de acción encima.
  animate(dt) {
    const speed = Math.hypot(this.vx, this.vz);
    const f = this.forward();
    // velocidad relativa al cuerpo (para caminar de lado fijado)
    const fwdSp = this.vx * f.x + this.vz * f.z;
    const sideSp = this.vx * -f.z + this.vz * f.x;
    const run = clamp((speed - 3.4) / 2.5, 0, 1);
    this.phase += dt * (speed * (2.25 - run * 0.55));
    const ph = this.phase;
    const s = clamp(speed / 3.3, 0, 1.3);
    const dir = fwdSp < -0.3 ? -1 : 1;
    const side = clamp(sideSp / 3, -1, 1);
    const A = (32 + run * 20) * s;
    const sin = Math.sin(ph),
      cos = Math.cos(ph);
    const t = this.game.time;
    const breathe = Math.sin(t * 1.7) * (1 - s);
    const pose = {
      legL: [(-sin * A * dir) * DEG, 0, (side * 10 + 3) * DEG],
      legR: [(sin * A * dir) * DEG, 0, (side * 10 - 3) * DEG],
      shinL: [(Math.max(0, -cos) * (40 + run * 45) * s + 6) * DEG, 0, 0],
      shinR: [(Math.max(0, cos) * (40 + run * 45) * s + 6) * DEG, 0, 0],
      chest: [(3 + run * 14 + breathe * 1.5) * DEG, (sin * 6 * s) * DEG, 0],
      head: [(-2 - run * 8) * DEG, (-sin * 4 * s) * DEG, 0],
      root: [0, -Math.abs(cos) * 0.05 * s - run * 0.04 + breathe * 0.006, 0],
      hips: [0, (-sin * 5 * s) * DEG, 0],
    };
    // brazos: guardia con balanceo, o carrera con espada baja
    const armSw = sin * (12 + run * 30) * s;
    if (run > 0.3) {
      pose.armR = [(armSw - 10) * DEG, 0, -12 * DEG];
      pose.foreR = [-40 * DEG, 0, 0];
      pose.handR = [70 * DEG, 0, 0];
      pose.armL = [(-armSw - 10) * DEG, 0, 14 * DEG];
      pose.foreL = [-50 * DEG, 0, 0];
    } else {
      pose.armR = [(GUARD.armR[0] + armSw * 0.4) * DEG, 0, GUARD.armR[2] * DEG];
      pose.foreR = [GUARD.foreR[0] * DEG, 0, 0];
      pose.handR = [GUARD.handR[0] * DEG, 0, 0];
      pose.armL = [(GUARD.armL[0] - armSw * 0.4) * DEG, 0, GUARD.armL[2] * DEG];
      pose.foreL = [GUARD.foreL[0] * DEG, 0, 0];
    }
    if (!this.hasSword) {
      pose.armR = [(armSw * 0.8) * DEG, 0, -6 * DEG];
      pose.foreR = [-12 * DEG, 0, 0];
      pose.handR = [0, 0, 0];
    }
    if (!this.hasShield) {
      pose.armL = [(-armSw * 0.8) * DEG, 0, 6 * DEG];
      pose.foreL = [-12 * DEG, 0, 0];
    }
    // bloqueo (sólo tren superior)
    if (this.blockW > 0.01) {
      const bp = C.block.keys[0].pose;
      blendInto(pose, bp, this.blockW, UPPER);
    }
    // clip de acción
    const ap = this.anim.update(dt);
    if (ap && this.anim.weight > 0) {
      const mask = this.anim.clip.mask;
      blendInto(pose, ap, this.anim.weight, mask);
    }
    // capa con inercia
    const sway = clamp(speed * 0.1, 0, 0.8) + Math.sin(t * 2.3) * 0.03;
    this.cloakSway = damp(this.cloakSway, sway, 6, dt);
    pose.cloak = [(this.cloakSway * 60 + 4) * DEG + (pose.chest ? -pose.chest[0] * 0.5 : 0), 0, Math.sin(t * 1.3) * 3 * DEG];
    this.rig.apply(pose);

    // posición visual (suavizado de escalones)
    this.visY = this.body.grounded ? damp(this.visY, this.body.pos.y, 18, dt) : this.body.pos.y;
    if (Math.abs(this.visY - this.body.pos.y) > 1) this.visY = this.body.pos.y;
    this.obj.position.set(this.body.pos.x, this.visY, this.body.pos.z);
    this.obj.rotation.y = this.yaw;
    // parpadeo de la lámpara
    this.lamp.intensity = this.lampBase * (0.9 + 0.07 * Math.sin(t * 11) + 0.05 * Math.sin(t * 23.7));
  }
}

export const PLAYER_CLIPS = C;
