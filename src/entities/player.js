// El Condenado: controlador del jugador (combate Soulslike).
import * as THREE from 'three';
import { buildPlayer } from './models.js';
import { Animator, clip, blendInto, UPPER, Spring, addRot } from './rig.js';
import { Biped, stabilizeShield, solveArm } from './locomotion.js';
import { moveBody } from '../world/collision.js';
import { clamp, damp, dampAngle, approachAngle, angleDiff, wrapAngle, DEG, lerp } from '../core/util.js';
import { objMat } from '../gfx/materials.js';

// ---------------------------------------------------------------- poses base
// Los brazos se animan con IK: ikR/ikL = muñeca en espacio del pecho (cm,
// +z delante, +y arriba, +x izquierda); bladeR = dirección de la hoja
// [yaw, pitch, roll] en grados (yaw>0 izquierda, pitch>0 arriba, pitch>90
// apunta hacia atrás por encima de la cabeza). Así un tajo es literalmente
// "llevar la mano de aquí a allí con la hoja apuntando así".
const GUARD_IK = { ikR: [-26, 16, 26], bladeR: [-6, 42, 0], ikL: [17, 22, 27] };
const STANCE = { legL: [14, 0, 4], shinL: [18, 0, 0], legR: [-22, 0, -4], shinR: [22, 0, 0], root: [0, -5, 0] };
const LUNGE = { legL: [30, 0, 4], shinL: [10, 0, 0], legR: [-45, 0, -4], shinR: [40, 0, 0], root: [0, -14, 8] };
const BLOCK_IK = { ikL: [8, 54, 33], elbowL: [0.9, -0.25, -0.35], ikR: [-28, 20, 18], bladeR: [-18, 52, 0], chest: [8, -14, 0], head: [6, 10, 0] };

let C = null; // clips: se construyen con la primera instancia (la guardia en Euler sale de la IK)
let LIGHT = null,
  HEAVY = null;
export const PLAYER_CLIPS = {};

function buildClips(rig) {
  // guardia resuelta a rotaciones para los clips que animan brazos a mano
  const gp = rad({ ...GUARD_IK });
  solveArm(gp, rig, 'R');
  solveArm(gp, rig, 'L');
  const GUARD = {};
  for (const k of ['armR', 'foreR', 'handR', 'armL', 'foreL', 'handL']) GUARD[k] = gp[k].map((v) => v / DEG);
  const G = GUARD_IK;
  C = {
    light1: clip(
      'light1',
      0.62,
      [
        [0, { ...STANCE, root: [0, -2, 0], chest: [4, -16, 0], ...G }],
        [0.14, { ...STANCE, chest: [8, -52, 0], head: [0, 20, 0], ikR: [-42, 64, -6], bladeR: [-150, 42, 0], elbowR: [-0.7, -0.1, -0.7], ikL: [22, 18, 24] }, 'hold'],
        [0.26, { ...STANCE, root: [0, -7, 4], chest: [14, 46, 0], head: [-4, -24, 0], ikR: [20, 6, 46], bladeR: [72, -28, 0], elbowR: [-0.4, -0.8, -0.3], ikL: [28, 14, 12] }, 'snap'],
        [0.4, { ...STANCE, root: [0, -6, 3], chest: [12, 58, 0], head: [-2, -26, 0], ikR: [30, 2, 30], bladeR: [112, -38, 0], elbowR: [-0.3, -0.8, -0.4], ikL: [28, 16, 12] }],
        [0.62, { ...G, chest: [2, 6, 0] }],
      ],
      { events: [{ t: 0.17, name: 'swing' }] }
    ),
    light2: clip(
      'light2',
      0.6,
      [
        [0, { ...STANCE, chest: [8, 50, 0], ikR: [26, 4, 36], bladeR: [100, -30, 0], elbowR: [-0.3, -0.8, -0.4], ikL: [28, 16, 14] }],
        [0.12, { ...STANCE, chest: [8, 60, 0], head: [0, -20, 0], ikR: [26, 56, 10], bladeR: [152, 32, 0], elbowR: [0.2, -0.3, -0.9], ikL: [28, 14, 10] }, 'hold'],
        [0.25, { ...STANCE, root: [0, -7, 4], chest: [12, -48, 0], head: [0, 22, 0], ikR: [-42, 22, 40], bladeR: [-82, -4, 0], elbowR: [-0.6, -0.7, -0.2], ikL: [14, 24, 30] }, 'snap'],
        [0.38, { ...STANCE, root: [0, -6, 3], chest: [10, -58, 0], head: [0, 24, 0], ikR: [-50, 22, 20], bladeR: [-122, -10, 0], elbowR: [-0.6, -0.7, -0.2], ikL: [14, 24, 30] }],
        [0.6, { ...G, chest: [2, -6, 0] }],
      ],
      { events: [{ t: 0.16, name: 'swing' }] }
    ),
    light3: clip(
      'light3',
      0.84,
      [
        [0, { ...STANCE, chest: [-4, -10, 0], ikR: [-22, 34, 22], bladeR: [0, 62, 0], ikL: [18, 22, 26] }],
        [0.24, { ...STANCE, root: [0, 2, -4], chest: [-18, -12, 0], head: [-8, 0, 0], ikR: [-12, 96, -8], bladeR: [0, 128, 0], elbowR: [-0.8, 0.1, -0.5], ikL: [20, 26, 24] }, 'hold'],
        [0.36, { ...LUNGE, chest: [30, 0, 0], head: [-12, 0, 0], ikR: [-8, 2, 54], bladeR: [0, -30, 0], elbowR: [-0.5, -0.8, 0], ikL: [20, 12, 22] }, 'snap'],
        [0.56, { ...LUNGE, chest: [26, 0, 0], head: [-8, 0, 0], ikR: [-8, -2, 52], bladeR: [0, -38, 0], elbowR: [-0.5, -0.8, 0], ikL: [20, 12, 22] }],
        [0.84, { ...G }],
      ],
      { events: [{ t: 0.29, name: 'swing' }] }
    ),
    heavy: clip(
      'heavy',
      1.05,
      [
        [0, { ...G, root: [0, -2, 0] }],
        [0.2, { legL: [20, 0, 8], shinL: [20, 0, 0], legR: [-24, 0, -8], shinR: [26, 0, 0], root: [0, -4, -3], chest: [-12, 14, 0], head: [-6, -8, 0], ikR: [-18, 72, 4], bladeR: [0, 112, 0], elbowR: [-0.8, 0, -0.5], ikL: [16, 30, 26] }],
        [0.4, { legL: [20, 0, 8], shinL: [20, 0, 0], legR: [-30, 0, -8], shinR: [30, 0, 0], root: [0, -2, -5], chest: [-26, 12, 0], head: [-12, -6, 0], ikR: [-14, 100, -14], bladeR: [0, 166, 0], elbowR: [-0.8, 0.2, -0.4], ikL: [16, 34, 24] }, 'hold'],
        [0.53, { legL: [36, 0, 6], shinL: [10, 0, 0], legR: [-56, 0, -4], shinR: [56, 0, 0], root: [0, -24, 14], chest: [42, 0, 0], head: [-20, 0, 0], ikR: [-6, -8, 60], bladeR: [0, -46, 0], elbowR: [-0.5, -0.8, 0], ikL: [22, 8, 20] }, 'snap'],
        [0.78, { legL: [36, 0, 6], shinL: [10, 0, 0], legR: [-56, 0, -4], shinR: [56, 0, 0], root: [0, -22, 14], chest: [38, 0, 0], head: [-14, 0, 0], ikR: [-6, -10, 58], bladeR: [0, -50, 0], elbowR: [-0.5, -0.8, 0], ikL: [22, 8, 20] }],
        [1.05, { ...G }],
      ],
      { events: [{ t: 0.45, name: 'swing' }] }
    ),
    roll: clip(
      'roll',
      0.64,
      [
        [0, { root: [0, -20, 0], chest: [30, 0, 0], legL: [-40, 0, 0], shinL: [60, 0, 0], legR: [-20, 0, 0], shinR: [60, 0, 0], armL: [-60, 0, 0], foreL: [-80, 0, 0], armR: [-50, 0, 0], foreR: [-80, 0, 0] }],
        [0.1, { root: [0, -45, 0], hips: [70, 0, 0], chest: [40, 0, 0], head: [30, 0, 0], legL: [-110, 0, 0], shinL: [130, 0, 0], legR: [-100, 0, 0], shinR: [130, 0, 0], armL: [-70, 0, 0], foreL: [-100, 0, 0], armR: [-70, 0, 0], foreR: [-100, 0, 0] }],
        [0.24, { root: [0, -60, 0], hips: [180, 0, 0], chest: [45, 0, 0], head: [30, 0, 0], legL: [-120, 0, 0], shinL: [140, 0, 0], legR: [-120, 0, 0], shinR: [140, 0, 0], armL: [-70, 0, 0], foreL: [-100, 0, 0], armR: [-70, 0, 0], foreR: [-100, 0, 0] }, 'linear'],
        [0.38, { root: [0, -48, 0], hips: [300, 0, 0], chest: [40, 0, 0], head: [20, 0, 0], legL: [-100, 0, 0], shinL: [130, 0, 0], legR: [-90, 0, 0], shinR: [120, 0, 0], armL: [-50, 0, 0], foreL: [-90, 0, 0], armR: [-50, 0, 0], foreR: [-90, 0, 0] }, 'linear'],
        [0.5, { root: [0, -22, 0], hips: [360, 0, 0], chest: [22, 0, 0], legL: [-50, 0, 0], shinL: [80, 0, 0], legR: [-10, 0, 0], shinR: [60, 0, 0], armL: [-30, 0, 10], foreL: [-60, 0, 0], armR: [-30, 0, -10], foreR: [-60, 0, 0] }],
        [0.64, { hips: [360, 0, 0], ...GUARD, root: [0, -6, 0] }],
      ],
      { ground: false }
    ),
    backstep: clip('backstep', 0.46, [
      [0, { ...GUARD, chest: [-10, 0, 0] }],
      [0.12, { ...GUARD, root: [0, 4, 0], chest: [-16, 0, 0], legL: [-24, 0, 0], shinL: [34, 0, 0], legR: [16, 0, 0], shinR: [26, 0, 0] }],
      [0.3, { ...GUARD, root: [0, -12, 0], chest: [10, 0, 0], legL: [-20, 0, 0], shinL: [40, 0, 0], legR: [10, 0, 0], shinR: [40, 0, 0] }],
      [0.46, { ...GUARD }],
    ]),
    blockHit: clip('blockHit', 0.32, [
      [0, { ...BLOCK_IK, chest: [-12, -14, 0], head: [-8, 10, 0], ikL: [6, 46, 26], root: [0, -6, -10] }, 'snap'],
      [0.32, { ...BLOCK_IK, root: [0, 0, 0] }],
    ]),
    heal: clip(
      'heal',
      1.15,
      [
        [0, { ...G }],
        [0.3, { ikR: [-26, 6, 18], bladeR: [-10, -30, 0], ikL: [8, 58, 26], elbowL: [1, -0.4, 0.1], head: [-5, 0, 0] }],
        [0.55, { ikR: [-26, 6, 18], bladeR: [-10, -30, 0], ikL: [5, 68, 17], elbowL: [1, -0.2, 0.1], head: [-30, 0, 0], chest: [-8, 0, 0] }, 'hold'],
        [0.85, { ikR: [-26, 6, 18], bladeR: [-10, -30, 0], ikL: [5, 68, 17], elbowL: [1, -0.2, 0.1], head: [-30, 0, 0], chest: [-8, 0, 0] }],
        [1.15, { ...G }],
      ],
      { mask: UPPER, events: [{ t: 0.62, name: 'drink' }] }
    ),
    hurt: clip('hurt', 0.42, [
      [0, { chest: [-26, 14, 0], head: [-24, 0, 0], armL: [-40, 0, 45], foreL: [-30, 0, 0], armR: [-30, 0, -45], foreR: [-40, 0, 0], root: [0, -6, -8], legL: [-15, 0, 0], shinL: [20, 0, 0], legR: [10, 0, 0], shinR: [25, 0, 0] }, 'snap'],
      [0.42, { ...GUARD }],
    ]),
    stagger: clip('stagger', 1.0, [
      [0, { chest: [-34, -15, 0], head: [-30, 0, 0], armL: [-20, 0, 70], foreL: [-20, 0, 0], armR: [-20, 0, -70], foreR: [-20, 0, 0], root: [0, -10, -10], legL: [-25, 0, 0], shinL: [40, 0, 0], legR: [15, 0, 0], shinR: [40, 0, 0] }, 'snap'],
      [0.5, { chest: [30, 0, 0], head: [20, 0, 0], armL: [-10, 0, 30], armR: [-10, 0, -30], root: [0, -25, 0], legL: [-40, 0, 0], shinL: [60, 0, 0], legR: [-10, 0, 0], shinR: [60, 0, 0] }],
      [1.0, { ...GUARD }],
    ]),
    death: clip(
      'death',
      2.0,
      [
        [0, { chest: [-30, 0, 0], head: [-30, 0, 0], armL: [-20, 0, 40], armR: [-20, 0, -40], root: [0, -5, 0] }, 'snap'],
        [0.5, { chest: [20, 0, 0], head: [30, 0, 0], armL: [0, 0, 10], armR: [0, 0, -10], foreR: [-10, 0, 0], root: [0, -45, 0], legL: [-95, 0, 5], shinL: [100, 0, 0], legR: [-95, 0, -5], shinR: [100, 0, 0] }],
        [1.1, { hips: [80, 0, 0], chest: [10, 0, 0], head: [20, 30, 0], armL: [-160, 0, 20], armR: [-30, 0, -60], root: [0, -78, 0], legL: [-10, 0, 5], shinL: [20, 0, 0], legR: [-5, 0, -8], shinR: [30, 0, 0] }, 'in'],
        [2.0, { hips: [86, 0, 0], chest: [4, 0, 0], head: [20, 40, 0], armL: [-160, 0, 20], armR: [-30, 0, -60], root: [0, -80, 0], legL: [-4, 0, 5], shinL: [10, 0, 0], legR: [-4, 0, -8], shinR: [10, 0, 0] }],
      ],
      { ground: false }
    ),
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
    rest: clip('rest', 1.0, [[0, { root: [0, -48, 0], chest: [22, 0, 0], head: [35, 0, 0], legL: [-95, 0, 6], shinL: [95, 0, 0], legR: [5, 0, -4], shinR: [100, 0, 0], armR: [-48, 0, -6], foreR: [-45, 0, 0], handR: [60, 0, 0], armL: [-48, 0, 6], foreL: [-60, 0, 0] }]], { ground: false }),
    wake: clip(
      'wake',
      3.4,
      [
        [0, { root: [0, -80, 0], hips: [-88, 0, 0], chest: [-4, 0, 0], head: [-10, 30, 0], armL: [-10, 0, 60], armR: [-20, 0, -50], legL: [-4, 0, 6], legR: [-6, 0, -6] }],
        [1.2, { root: [0, -80, 0], hips: [-88, 0, 0], chest: [-4, 0, 0], head: [-10, -20, 0], armL: [-10, 0, 60], armR: [-20, 0, -50], legL: [-4, 0, 6], legR: [-6, 0, -6] }],
        [1.9, { root: [0, -72, 0], hips: [-20, 0, 0], chest: [30, 0, 0], head: [30, 0, 0], armL: [20, 0, 20], foreL: [-30, 0, 0], armR: [20, 0, -20], foreR: [-30, 0, 0], legL: [-90, 0, 10], shinL: [40, 0, 0], legR: [-80, 0, -10], shinR: [60, 0, 0] }],
        [2.6, { root: [0, -48, 0], chest: [30, 0, 0], head: [25, 0, 0], legL: [-95, 0, 6], shinL: [95, 0, 0], legR: [5, 0, -4], shinR: [100, 0, 0], armL: [-40, 0, 10], foreL: [-40, 0, 0], armR: [-40, 0, -10], foreR: [-40, 0, 0] }],
        [3.4, { head: [10, 0, 0], armL: [0, 0, 5], armR: [0, 0, -5] }],
      ],
      { ground: false }
    ),
  };
  Object.assign(PLAYER_CLIPS, C);
  // hit: ventana de impacto; cancel: desde cuándo se encadena otro ataque o
  // se rueda; move: desde cuándo moverse corta la recuperación.
  LIGHT = [
    { clip: C.light1, dmg: 20, st: 13, hit: [0.18, 0.3], cancel: 0.34, move: 0.46, lunge: [0.06, 0.28, 2.8], range: 2.35, arc: 130, poise: 18, dir: -1 },
    { clip: C.light2, dmg: 22, st: 13, hit: [0.17, 0.29], cancel: 0.33, move: 0.45, lunge: [0.06, 0.26, 2.6], range: 2.35, arc: 130, poise: 18, dir: 1 },
    { clip: C.light3, dmg: 31, st: 17, hit: [0.3, 0.42], cancel: 0.56, move: 0.62, lunge: [0.22, 0.4, 3.6], range: 2.5, arc: 80, poise: 32, dir: 0 },
  ];
  HEAVY = { clip: C.heavy, dmg: 54, st: 30, hit: [0.46, 0.6], cancel: 0.8, move: 0.86, lunge: [0.4, 0.58, 3.8], range: 2.65, arc: 90, poise: 70, heavy: true, dir: 0 };
  // ataque en carrera: el tajo vertical con una zancada larga
  RUNATK = { clip: C.light3, dmg: 30, st: 18, hit: [0.3, 0.42], cancel: 0.56, move: 0.62, lunge: [0.02, 0.4, 5.6], range: 2.5, arc: 80, poise: 34, dir: 0 };
}
let RUNATK = null;

const BLOCK_RAD = rad(BLOCK_IK);

// grados/cm -> radianes/m
function rad(p) {
  const o = {};
  for (const k in p) o[k] = p[k].map((v) => (k === 'root' || k.startsWith('ik') ? v / 100 : k.startsWith('elbow') ? v : v * DEG));
  return o;
}

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
    this.rig = buildPlayer();
    this.obj = this.rig.root;
    if (!C) buildClips(this.rig);
    this.clips = C;
    this.resolveArms = (p) => {
      solveArm(p, this.rig, 'R');
      solveArm(p, this.rig, 'L');
    };
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
    // luz de la lámpara del cinto
    this.lamp = new THREE.PointLight(0xffa860, 9, 12, 1.5);
    this.lamp.position.set(0, -0.08, 0.1);
    this.rig.joints.lantern.add(this.lamp);
    this.lampBase = 9;
    this.dead = false;
    this.lastHitBy = null;
    // extremos de la hoja (espacio de la articulación de la espada) para la estela
    this.bladeBase = new THREE.Vector3(0, -0.05, 0.2);
    this.bladeTip = new THREE.Vector3(0, -0.05, 1.02);
  }

  setEquipment(sword, shield) {
    this.hasSword = sword;
    this.hasShield = shield;
    this.rig.joints.sword.visible = sword;
    this.rig.joints.shield.visible = shield;
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
    this.atk = def;
    this.hitSet.clear();
    this.useSt(def.st);
    this.anim.play(def.clip, { blend: this.anim.weight > 0.3 ? 0.07 : 0.1 });
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
      this.anim.play(C.backstep, { blend: 0.06 });
    } else {
      this.rollBack = false;
      this.rollDir = { x: dirx / m, z: dirz / m };
      this.yaw = Math.atan2(this.rollDir.x, this.rollDir.z);
      this.anim.play(C.roll, { blend: 0.05 });
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
    this.anim.play(C.heal, { blend: 0.14 });
  }

  // 'smash': golpe de arriba abajo (romper un mueble); 'yaw' encara el objeto.
  playInteract(kind = 'interact', yaw = null) {
    this.state = 'interact';
    this.stT = 0;
    this.vx = this.vz = 0;
    this.interactKind = kind;
    this.interactYaw = yaw;
    this.anim.play(kind === 'push' ? C.push : kind === 'smash' ? C.heavy : C.interact, { blend: 0.12 });
    this.interactDur = kind === 'push' ? 0.8 : kind === 'smash' ? 1.0 : 0.7;
  }

  startRest() {
    this.state = 'rest';
    this.stT = 0;
    this.vx = this.vz = 0;
    this.anim.play(C.rest, { blend: 0.3 });
  }

  startWake() {
    this.state = 'wake';
    this.stT = 0;
    this.anim.play(C.wake, { blend: 0 });
    this.anim.weight = 1;
  }

  onAnimEvent(e) {
    if (e === 'swing') this.game.audio && this.game.audio.play(this.state === 'interact' || (this.atk && this.atk.heavy) ? 'swingHeavy' : 'swing', this.pos);
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
    if (this.blocking && this.blockW > 0.5 && facing && !atk.unblockable && this.hasShield) {
      const cost = atk.stDmg ?? atk.dmg * 1.1;
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
        this.anim.play(C.stagger, { blend: 0.03 });
        if (this.hp <= 0) this.die();
        return 'guardbreak';
      }
      this.hp -= Math.round(atk.dmg * (atk.chip ?? 0.08));
      this.anim.play(C.blockHit, { blend: 0.03 });
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
      this.anim.play(C.stagger, { blend: 0.04 });
    } else {
      this.state = 'hurt';
      this.anim.play(C.hurt, { blend: 0.04 });
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
    this.anim.play(C.death, { blend: 0.08 });
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

    if (st === 'free' || st === 'blockhit') {
      const wantBlock = allowControl && input.down('block') && this.hasShield && st === 'free';
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
        if (take('dodge') && this.canAct()) this.startRoll(wx, wz);
        else if (has('light') && this.hasSword && this.canAct()) {
          take('light');
          const idx = this.comboT > 0 ? (this.combo + 1) % 3 : 0;
          this.orientForAttack(target, wx, wz, mag);
          if (this.sprinting && Math.hypot(this.vx, this.vz) > 5) this.startAttack(RUNATK, 2);
          else this.startAttack(LIGHT[idx], idx);
        } else if (has('heavy') && this.hasSword && this.canAct()) {
          take('heavy');
          this.orientForAttack(target, wx, wz, mag);
          this.startAttack(HEAVY, 0);
        } else if (take('heal')) this.startHeal();
        else if (take('interact')) g.tryInteract && g.tryInteract();
      }
    } else if (st === 'attack') {
      this.blocking = false;
      const a = this.atk;
      const t = this.stT;
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
      // ventana de impacto
      if (t >= a.hit[0] && t <= a.hit[1]) {
        this.swinging = true;
        g.combat.playerSwing(this, a);
      } else if (t >= a.hit[0] - 0.06 && t <= a.hit[1] + 0.05) this.swinging = true;
      // encadenar
      if (t >= a.cancel) {
        if (has('light') && this.canAct() && !a.heavy && this.hasSword) {
          take('light');
          const idx = (this.combo + 1) % 3;
          this.orientForAttack(target, wx, wz, mag);
          this.startAttack(LIGHT[idx], idx);
        } else if (has('heavy') && this.canAct()) {
          take('heavy');
          this.orientForAttack(target, wx, wz, mag);
          this.startAttack(HEAVY, 0);
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
      if (this.state === 'attack' && this.stT >= a.clip.dur) {
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
          this.startAttack({ ...LIGHT[0], dmg: 24 }, 0);
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
    // brazos por IK: guardia con balanceo al andar; al correr, la espada atrás
    const sw = Math.cos(gait.phase * Math.PI * 2) * gait.mw;
    const run = gait.runW * gait.mw;
    if (this.hasSword) {
      pose.ikR = [lerp(-0.26, -0.3, run), lerp(0.16, 0.08, run) + Math.abs(sw) * 0.02, lerp(0.26 + sw * 0.07, 0.02 + sw * 0.26, run)];
      pose.bladeR = [lerp(-6, -165, run) * DEG, lerp(42, -28, run) * DEG, 0];
    } else {
      pose.armR = [-sw * 0.45, 0, -0.1];
      pose.foreR = [-0.25 - run * 0.9, 0, 0];
      pose.handR = [0, 0, 0];
    }
    if (this.hasShield) pose.ikL = [lerp(0.17, 0.24, run), lerp(0.22, 0.2, run), lerp(0.27 - sw * 0.04, 0.16 - sw * 0.14, run)];
    else {
      pose.armL = [sw * 0.45, 0, 0.1];
      pose.foreL = [-0.25 - run * 0.9, 0, 0];
    }
    // bloqueo (tren superior)
    if (this.blockW > 0.01) blendInto(pose, BLOCK_RAD, this.blockW, UPPER);
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
    // escudo: siempre de cara, subido al bloquear
    if (this.hasShield) {
      const healW = this.state === 'heal' ? clamp(1 - Math.abs(this.stT - 0.62) / 0.5, 0, 1) : 0;
      const rolling = this.state === 'roll' || this.state === 'dead' || this.state === 'wake' || this.state === 'rest';
      stabilizeShield(this.rig, {
        w: rolling ? 0.35 : lerp(0.92, 0.75, healW),
        yaw: lerp(0.42, 0.1, this.blockW) + healW * 1.15,
        pitch: lerp(-0.14, -0.04, this.blockW),
        out: 0.07,
        along: 0.13,
      });
    }
    // parpadeo de la lámpara
    this.lamp.intensity = this.lampBase * (0.9 + 0.07 * Math.sin(t * 11) + 0.05 * Math.sin(t * 23.7));
  }
}


