// Cinemática de la bodega del canónigo (una vez, al asomarse a la escalera).
//
//  1. Baja la escalera; la cámara va delante, de espaldas, mirándole a él.
//     Desde abajo sube un ruido húmedo de algo que mastica.
//  2. Al pie de la escalera la cámara gira por detrás de él y se ve la sala:
//     junto al altar, de espaldas, el canónigo devora un cadáver.
//  3. Un hueso cruje bajo su bota. Se hace el silencio. La cabeza del revés
//     gira despacio hasta mirarle; el cuerpo se da la vuelta de golpe.
//  4. Se alza, grita, y arroja el cadáver contra la pared.
//  5. Arriba, a contraluz en la puerta, una mujer (el ama) cierra de un
//     portazo y echa la tranca: «Perdóneme, señor…».
//  6. Abajo, la sala vacía. Algo cruza de un salto, de lado a lado, y se
//     pierde en la bóveda. Empieza la caza.
// Se puede saltar con «interactuar».
import * as THREE from 'three';
import { CANON, stairY } from '../world/level_canon.js';
import { CELLAR } from '../world/level_cellar.js';
import { Rig } from '../entities/rig.js';
import { humanoidJoints } from '../entities/models.js';
import { registerMaterialPatch, additiveFog } from '../gfx/materials.js';
import { getTexture } from '../gfx/textures.js';
import { DEG, clamp } from '../core/util.js';

const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => sm((t - a) / (b - a));
const F = CELLAR.FLOOR;

// Guion (segundos)
const T_BOTTOM = 5.2; // llega abajo
const T_SWING = [4.6, 6.4]; // la cámara gira por detrás de él
const T_CRUNCH = 8.6; // el hueso cruje bajo su bota
const T_HEAD = [9.3, 10.9]; // la cabeza gira hasta mirarle
const T_TURN = [10.9, 11.5]; // se da la vuelta
const T_SCREAM = [11.8, 13.5]; // se alza y grita
const T_THROW = 13.25; // arroja el cadáver
const T_DOOR = [14.2, 16.9]; // arriba: la puerta
const T_SLAM = 15.5;
const T_LEAP = [17.7, 18.3]; // cruza de un salto
const T_END = 19.4;

// Silueta del ama: falda larga, toca y un brazo tendido hacia la puerta.
function buildAma() {
  const joints = humanoidJoints(0.9);
  const parts = [
    { j: 'hips', type: 'box', s: [0.5, 0.95, 0.42], p: [0, -0.46, 0], taper: [1.55, 1.4], mat: 'clothDark' },
    { j: 'chest', type: 'box', s: [0.34, 0.5, 0.24], p: [0, 0.24, 0], taper: [0.9, 0.9], mat: 'clothDark' },
    { j: 'head', type: 'box', s: [0.2, 0.25, 0.22], p: [0, 0.12, 0], mat: 'clothDark' },
    { j: 'head', type: 'box', s: [0.28, 0.5, 0.3], p: [0, 0.02, -0.03], taper: [1.3, 1.2], mat: 'clothDark' },
    { j: 'armL', type: 'box', s: [0.09, 0.3, 0.09], p: [0, -0.14, 0], mat: 'clothDark' },
    { j: 'foreL', type: 'box', s: [0.08, 0.27, 0.08], p: [0, -0.13, 0], mat: 'clothDark' },
    { j: 'armR', type: 'box', s: [0.09, 0.3, 0.09], p: [0, -0.14, 0], mat: 'clothDark' },
    { j: 'foreR', type: 'box', s: [0.08, 0.27, 0.08], p: [0, -0.13, 0], mat: 'clothDark' },
    { j: 'handR', type: 'box', s: [0.07, 0.1, 0.05], p: [0, -0.05, 0], mat: 'clothDark' },
  ];
  const black = registerMaterialPatch(new THREE.MeshBasicMaterial({ color: 0x050404, fog: true }));
  const r = new Rig({ joints, parts }, { matFn: () => black });
  // la vela en la mano izquierda
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.12, 6), registerMaterialPatch(new THREE.MeshBasicMaterial({ color: 0x8a7a60, fog: true })));
  wax.position.set(0, -0.08, 0.02);
  r.joints.handL.add(wax);
  const flame = new THREE.Sprite(glowMat(0xffc070, 1));
  flame.scale.setScalar(0.34);
  flame.position.set(0, 0.05, 0);
  wax.add(flame);
  r.flame = flame;
  return r;
}

const glowMat = (color, opacity) =>
  additiveFog(new THREE.SpriteMaterial({ map: getTexture('glow'), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity, fog: true }));

// La luz de la casa, al otro lado de la puerta: ella se recorta a contraluz.
// Después del portazo sólo queda una raya de luz bajo la puerta, que se va.
function buildBacklight() {
  const grp = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.9), registerMaterialPatch(new THREE.MeshBasicMaterial({ color: 0x5a3a1e, fog: true })));
  wall.position.set(CANON.cellarDoor.x, 1.3, CANON.cellarDoor.z + 1.25);
  wall.rotation.y = Math.PI;
  grp.add(wall);
  const halo = new THREE.Sprite(glowMat(0xffa850, 0.8));
  halo.scale.set(2.6, 3.2, 1);
  halo.position.set(CANON.cellarDoor.x + 0.2, 1.3, CANON.cellarDoor.z + 1.1);
  grp.add(halo);
  const line = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.035),
    additiveFog(new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }))
  );
  line.position.set(CANON.cellarDoor.x, 0.02, CANON.cellarDoor.z - 0.22);
  grp.add(line);
  grp.userData = { wall, halo, line };
  grp.visible = false;
  return grp;
}

export class CellarCutscene {
  constructor(game) {
    this.g = game;
    this.t = 0;
    this.cues = new Set();
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.v = new THREE.Vector3();
    this.w = new THREE.Vector3();
    const S = CANON.stair;
    this.stand = new THREE.Vector3(S.x, 0, S.top + 0.1);
    this.bottomZ = S.bottom - 1.55;
    this.feast = CELLAR.feast;
  }

  start() {
    const g = this.g;
    const p = g.player;
    this.boss = g.bosses.descoyuntado;
    this.hunt = g.hunt;
    p.spawn(this.stand.x, this.stand.y, this.stand.z, Math.PI);
    p.state = 'free';
    p.autoDir = { x: 0, z: -1, m: 0.5 };
    g.lockTarget = null;
    g.ui.showHud(false);
    g.audio.stopMusic();
    g.audio.play('dread');
    const e = this.boss;
    if (e) {
      e.reset();
      e.scripted = true;
      e.state = 'bossIdle';
      const D = e.D;
      e.pos.set(this.feast.x, F, this.feast.z);
      e.yaw = this.feast.yaw;
      D.plantAll();
      D.eatT = 1;
      D.eat = 1;
      D.eyeT = 0.5;
      e.obj.visible = true;
    }
    this.hunt.resetCorpse();
    this.ama = buildAma();
    this.ama.root.visible = false;
    g.scene.add(this.ama.root);
    this.back = buildBacklight();
    g.scene.add(this.back);
    this.door = g.interact.list.find((i) => i.id === 'd_sotano');
    this.apply(0);
  }

  // Un suceso del guion, una sola vez.
  cue(name, at) {
    if (this.t < at || this.cues.has(name)) return false;
    this.cues.add(name);
    return true;
  }

  // Salta al final (botón de interactuar).
  skip() {
    if (this.t < T_LEAP[0] - 0.1) {
      this.t = T_END - 0.05;
      this.skipped = true;
      this.g.audio.stopMusic();
    }
  }

  update(dt) {
    this.t += dt;
    this.apply(dt);
    return this.t < T_END;
  }

  apply(dt) {
    const g = this.g;
    const t = this.t;
    const p = g.player;
    const a = g.audio;
    const U = g.post.U;
    const e = this.boss;
    const D = e && e.D;
    // franjas negras, grano y viñeta
    const bars = t < T_END - 0.6 ? sm(t / 0.8) : 1 - sm((t - (T_END - 0.6)) / 0.5);
    U.uBars.value = 0.115 * bars;
    U.uVignette.value = 1.25 + 0.9 * bars;
    this.grain = 0.05 * bars;

    // --- el jugador baja y se detiene al pie de la escalera
    if (p.autoDir && p.pos.z <= this.bottomZ) {
      p.autoDir = null;
      p.state = 'cine';
    }
    if (!p.autoDir && p.state !== 'cine') p.state = 'cine';
    if (t > T_CRUNCH - 0.5 && t < T_CRUNCH + 0.2 && p.state === 'cine' && p.pos.z > this.bottomZ - 0.5) {
      // un paso más: el hueso
      p.body.pos.z -= dt * 0.9;
    }

    // --- cámara
    const head = this.v.set(p.pos.x, p.visY + 1.5, p.pos.z);
    let fov = 55,
      roll = 0;
    const cf = this.feast;
    if (t < T_SWING[0]) {
      // delante de él, escalera abajo, mirándole
      const cz = p.pos.z - 2.5;
      this.pos.set(p.pos.x + Math.sin(t * 1.3) * 0.04, stairY(cz) + 1.35 + Math.sin(t * 1.7) * 0.02, cz);
      this.look.copy(head);
      fov = 55;
    } else if (t < T_SWING[1]) {
      // gira alrededor de él hasta quedar detrás, a su derecha
      const u = seg(t, T_SWING[0], T_SWING[1]);
      const ang = Math.PI * u; // 0: delante (-z), PI: detrás (+z)
      const r = lerp(2.5, 1.9, u);
      this.pos.set(p.pos.x + Math.sin(ang) * r * 0.8 + u * 1.2, p.visY + lerp(1.35, 2.05, u), p.pos.z - Math.cos(ang) * r);
      this.look.set(lerp(head.x, cf.x, u), lerp(head.y, F + 0.9, u), lerp(head.z, cf.z, u));
      fov = lerp(55, 46, u);
    } else if (t < T_HEAD[0]) {
      // por encima del hombro: el festín, y se acerca despacio
      const u = seg(t, T_SWING[1], T_HEAD[0]);
      this.pos.set(p.pos.x + 1.6 - u * 0.2, p.visY + 2.05 - u * 0.15, p.pos.z + 1.1 - u * 0.5);
      this.look.set(cf.x + 0.1, F + 0.8, cf.z - 0.2);
      fov = lerp(46, 36, u);
    } else if (t < T_SCREAM[0]) {
      // bajo, casi a ras de suelo: la cabeza gira bajo el cuerpo y le mira
      const u = seg(t, T_HEAD[0], T_TURN[1]);
      this.pos.set(lerp(58.3, 58.5, u), F + lerp(0.7, 0.9, u), lerp(-39.9, -39.6, u));
      this.look.set(cf.x, F + lerp(0.5, 0.8, u), cf.z - 0.4);
      fov = 46;
    } else if (t < T_DOOR[0]) {
      // el grito, desde su derecha y algo más abajo; el cadáver vuela hacia aquí
      const u = seg(t, T_SCREAM[0], T_DOOR[0]);
      this.pos.set(p.pos.x + 1.35, p.visY + 1.35, p.pos.z + 0.25 - u * 0.15);
      this.look.set(lerp(cf.x, 60.2, u * 0.5), F + lerp(2.0, 1.4, u), cf.z + 1.6 * u);
      fov = 52;
    } else if (t < T_DOOR[1]) {
      // arriba, la puerta: a contraluz, alguien la cierra
      const u = seg(t, T_DOOR[0], T_DOOR[1]);
      this.pos.set(CANON.stair.x + 0.35, stairY(-30.8) + 1.45, -30.8);
      this.look.set(CANON.stair.x, 1.2 - u * 0.15, CANON.cellarDoor.z);
      fov = lerp(44, 38, u);
    } else {
      // la sala vacía; algo la cruza de un salto
      const u = seg(t, T_DOOR[1], T_END);
      this.pos.set(p.pos.x + 1.3, p.visY + 1.8, p.pos.z + 0.9);
      this.look.set(59.4 + Math.sin(t * 0.8) * 0.2, F + 1.2 + u * 0.3, -42);
      fov = 54;
    }
    // respingo con el grito y el portazo
    if (t > T_SCREAM[0] + 0.3 && t < T_SCREAM[0] + 0.7) roll += 0.03 * Math.sin(t * 60);
    if (t < T_END - 0.55) g.camRig.override = { pos: this.pos, look: this.look, fov, roll, snap: true };
    else if (!this.cues.has('camBack')) {
      this.cues.add('camBack');
      g.camRig.override = null;
      g.camRig.snapTo(p);
      g.camRig.yaw = Math.PI;
      g.camRig.pitch = 0.2;
    }

    // --- sonido
    const S = CANON.stair;
    if (this.cue('creak', 1.1)) a.play('stairCreak', { x: S.x, y: stairY(-29) + 0.2, z: -29 });
    if (this.cue('creak2', 3.4)) a.play('stairCreak', { x: S.x + 0.8, y: stairY(-33) + 0.2, z: -33 });
    // masticar: se oye durante toda la bajada, cada vez más cerca
    if (t < T_CRUNCH) {
      this.chewT = (this.chewT ?? 0.3) - dt;
      if (this.chewT <= 0) {
        this.chewT = 0.35 + Math.random() * 0.5;
        a.play('chew', { x: cf.x, y: F + 0.8, z: cf.z - 0.6 });
      }
    }
    if (this.cue('crunch', T_CRUNCH)) {
      a.play('boneCrack', { x: p.pos.x, y: p.pos.y, z: p.pos.z }, { k: 1.2 });
      a.play('silence');
    }
    if (this.cue('drip', T_CRUNCH + 0.7)) a.play('drip', { x: cf.x + 2, y: F + 3, z: cf.z });
    if (this.cue('neck', T_HEAD[0] + 0.1)) a.play('neckTwist', { x: cf.x, y: F + 0.8, z: cf.z });
    if (this.cue('turn', T_TURN[0])) a.play('boneCrack', { x: cf.x, y: F + 1, z: cf.z }, { n: 5, k: 1 });
    if (this.cue('scream', T_SCREAM[0] + 0.25)) {
      a.play('descScream', { x: cf.x, y: F + 1.8, z: cf.z });
      g.camRig.shake(0.5);
      g.input.rumble(0.8, 0.9, 700);
    }
    if (this.cue('whisperAma', T_DOOR[0] + 0.5)) a.play('amaWhisper', { x: S.x, y: 1.4, z: CANON.cellarDoor.z + 0.4 });
    if (this.cue('slam', T_SLAM)) {
      a.play('doorSlam', { x: S.x, y: 1.2, z: CANON.cellarDoor.z });
      g.camRig.shake(0.35);
      g.input.rumble(1, 0.7, 250);
    }
    if (this.cue('bar', T_SLAM + 0.55)) a.play('bar', { x: S.x, y: 1.2, z: CANON.cellarDoor.z });
    if (this.cue('scuttle', T_LEAP[0] - 0.15)) a.play('scuttle', { x: 56, y: F + 1, z: -40.5 });
    if (this.cue('scuttle2', T_LEAP[1])) a.play('scuttle', { x: 63.5, y: F + 4, z: -41.5 });

    // --- el farol tiembla al gritar y al pasar él
    let lamp = 1;
    if (t > T_SCREAM[0] && t < T_SCREAM[1]) lamp = 0.6 + 0.4 * Math.abs(Math.sin(t * 29));
    if (t > T_LEAP[0] && t < T_LEAP[1] + 0.2) lamp = 0.55 + 0.45 * Math.abs(Math.sin(t * 37));
    p.lampK = lamp;

    // --- el canónigo
    if (D) this.creature(dt, t, e, D, p);

    // --- el ama cierra la puerta
    const ama = this.ama;
    const door = this.door;
    ama.root.visible = t > T_DOOR[0] && t < T_SLAM + 0.05;
    if (ama.root.visible) {
      const reach = seg(t, T_DOOR[0] + 0.3, T_SLAM - 0.25);
      ama.root.position.set(S.x + 0.15, 0, CANON.cellarDoor.z + 0.55 - reach * 0.25);
      ama.root.rotation.y = Math.PI;
      ama.apply({
        chest: [0.18 + reach * 0.1, 0, 0],
        head: [0.35 + Math.sin(t * 1.3) * 0.03, 0.15, 0.1],
        armR: [-1.25 * reach - 0.2, 0, -0.1],
        foreR: [-0.3, 0, 0],
        armL: [-0.2, 0, 0.15],
        foreL: [-1.2, 0, 0],
      });
    }
    if (door && this.cue('doorClose', T_SLAM - 0.2)) g.interact.slamShut(door);
    // la luz de arriba: tiembla con la vela; tras el portazo, una raya bajo la puerta
    const bk = this.back;
    bk.visible = t > T_DOOR[0] && t < T_DOOR[1];
    if (bk.visible) {
      const fl = 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.3);
      const U = bk.userData;
      const open = t < T_SLAM;
      U.wall.visible = U.halo.visible = open;
      U.halo.material.opacity = 0.8 * fl;
      ama.flame.material.opacity = fl;
      U.line.visible = !open;
      U.line.material.opacity = fl * (1 - seg(t, T_SLAM + 0.4, T_DOOR[1] - 0.2));
    }

    if (this.cue('end', T_END - 0.3)) this.finish();
  }

  // El canónigo: come, se detiene, gira la cabeza, se vuelve, grita y arroja
  // el cadáver; mientras cierran la puerta desaparece, y luego cruza de un
  // salto por delante de la cámara hasta la bóveda.
  creature(dt, t, e, D, p) {
    const cf = this.feast;
    const h = this.hunt;
    const corpse = h.corpse.root;
    D.lookP.set(p.pos.x, p.visY + 1.5, p.pos.z);
    if (t < T_CRUNCH) {
      // come
      D.eatT = 1;
      D.T.h = 0.72;
      D.T.pitch = 0.28;
      D.lookW = 0;
      D.feast = h.bitePoint();
      this.eatHands(D, t);
    } else if (t < T_TURN[1]) {
      // silencio; la cabeza gira del revés hasta mirarle; luego el cuerpo
      D.eatT = 0;
      D.jawT = 0.15;
      if (!this.cues.has('let')) {
        this.cues.add('let');
        D.releaseAll();
      }
      if (t > T_HEAD[0]) {
        D.twistT = Math.PI * 0.92;
        D.eyeT = 1.7;
      }
      if (t > T_TURN[0]) {
        const u = seg(t, T_TURN[0], T_TURN[1]);
        e.yaw = Math.PI - Math.PI * u;
        D.twist = D.twistT = Math.PI * 0.92 * (1 - u);
        D.lookW = u;
      }
      D.T.h = lerp(0.72, 0.95, seg(t, T_TURN[0], T_TURN[1]));
      D.T.pitch = lerp(0.28, 0, seg(t, T_TURN[0], T_TURN[1]));
    } else if (t < T_DOOR[0]) {
      // se alza con el cadáver en la mano, grita y lo arroja
      e.yaw = 0;
      D.twistT = D.twist = 0;
      D.lookW = 1;
      const rise = seg(t, T_TURN[1] + 0.1, T_SCREAM[0] + 0.3);
      const down = seg(t, T_THROW + 0.2, T_DOOR[0]);
      D.rear = 0.85 * rise * (1 - down);
      D.T.h = 0.95 + 0.55 * rise * (1 - down);
      D.jawT = t > T_SCREAM[0] + 0.2 && t < T_SCREAM[1] ? 1 : 0.2;
      D.tiltT = t > T_SCREAM[0] + 0.2 && t < T_SCREAM[1] ? Math.sin(t * 22) * 0.35 : 0;
      const lf = D.L[0],
        rf = D.L[1];
      // brazo izquierdo abierto; el derecho sostiene el cadáver y lo lanza
      D.local(0.95, 1.9 * rise + 0.3, 1.0, this.w);
      D.hold(lf, this.w.x, this.w.y, this.w.z, rise * (1 - down));
      if (t < T_THROW) {
        const sw = seg(t, T_THROW - 0.45, T_THROW);
        D.local(lerp(-0.9, -0.2, sw), lerp(0.6 + 1.6 * rise, 2.6, sw), lerp(0.9, -0.4, sw) + sw * 1.8, this.w);
        D.hold(rf, this.w.x, this.w.y, this.w.z, 1);
        // el cadáver cuelga de su mano
        corpse.position.set(this.w.x, this.w.y - 0.9, this.w.z);
        corpse.rotation.set(0.3 + sw * 1.2, 1.2 + rise * 0.6, 0.2);
      } else {
        if (!this.fly) {
          // vuela contra la pared, junto a la escalera
          this.fly = { t: 0, x0: corpse.position.x, y0: corpse.position.y, z0: corpse.position.z, x1: 63.6, z1: -37.4, dur: 0.62 };
          D.release(rf);
          D.hold(rf, this.w.x, this.w.y, this.w.z, 0);
        }
        const f = this.fly;
        f.t += dt;
        const u = clamp(f.t / f.dur, 0, 1);
        if (u < 1) {
          corpse.position.set(lerp(f.x0, f.x1, u), lerp(f.y0, F + 0.9, u) + Math.sin(Math.PI * u) * 1.6, lerp(f.z0, f.z1, u));
          corpse.rotation.x += dt * 9;
          corpse.rotation.z += dt * 5;
        } else if (!f.landed) {
          f.landed = true;
          h.poseCorpse('curl', f.x1, F, f.z1 + 0.1, -2.2);
          this.g.audio.play('corpseThud', { x: f.x1, y: F + 0.5, z: f.z1 });
          this.g.fx.blood.emit(f.x1, F + 1.0, f.z1, 30, { speed: 4 });
          this.g.camRig.shake(0.3);
        }
      }
    } else if (t < T_LEAP[0]) {
      // se ha ido (mientras mirabas arriba): agazapado a la izquierda, fuera
      // del plano
      e.obj.visible = false;
      D.releaseAll();
      D.rear = 0;
      D.jawT = 0;
      D.tiltT = 0;
      e.vx = e.vz = 0;
      e.pos.set(54.2, F, -40.9);
      e.yaw = Math.PI / 2;
      D.plane = 'floor';
      D.plantAll();
      D.T.h = 0.55;
      D.hS.x = 0.55;
    } else {
      // el cruce: de un salto, de lado a lado, retorciéndose hasta la bóveda
      if (!this.leapt) {
        this.leapt = true;
        e.obj.visible = true;
        D.jump('floor', T_LEAP[1] - T_LEAP[0], { x: 64.2, z: -41.2, arc: 1.4, spin: 1.1 });
        D.eyeT = 1.4;
      }
      if (!D.air) {
        // y se escabulle hacia lo oscuro, por el arco del osario
        e.vx = 5;
        e.vz = 0.4;
        e.yaw = Math.PI / 2;
        e.pos.x += dt * 5;
        e.pos.z += dt * 0.4;
        if (t > T_LEAP[1] + 0.5) e.obj.visible = false;
      }
    }
    e.animate(dt);
  }

  // Las manos del canónigo tiran del cadáver mientras come.
  eatHands(D, t) {
    const c = D.feast;
    if (!c) return;
    const lf = D.L[0],
      rf = D.L[1];
    const j = Math.sin(t * 3.1) * 0.12;
    D.hold(lf, c.x + 0.3 + j, c.y + 0.12 + Math.max(0, Math.sin(t * 4.3)) * 0.35, c.z + 0.1);
    D.hold(rf, c.x - 0.35 - j, c.y + 0.1 + Math.max(0, Math.sin(t * 3.7 + 1)) * 0.3, c.z - 0.1);
    // el cadáver se sacude con cada tirón
    const r = this.hunt.corpse;
    const k = Math.sin(t * 4.3) * 0.08;
    r.joints.chest.rotation.z = k;
    r.joints.head.rotation.y = 0.7 + Math.sin(t * 5.1) * 0.3;
  }

  // Todo en su sitio para empezar la caza.
  finish() {
    const g = this.g;
    const e = this.boss;
    const h = this.hunt;
    if (this.door && !this.cues.has('doorClose')) {
      this.cues.add('doorClose');
      g.interact.slamShut(this.door);
      g.interact.poseDoor(this.door, 0);
      this.door.open = 0;
      this.door.closing = 0;
    }
    if (!this.fly || !this.fly.landed) h.poseCorpse('curl', 63.6, F, -37.3, -2.2);
    this.ama.root.visible = false;
    this.back.visible = false;
    if (e) {
      e.scripted = false;
      e.obj.visible = true;
      // colgado del techo de la galería de los toneles, lejos de ti
      const P = CELLAR.perches.find((q) => q.x < 46 && q.z < -45) || CELLAR.perches[5];
      e.pos.set(P.x, F, P.z);
      e.D.air = null;
      e.D.plane = 'ceil';
      e.D.ceilY = null;
      e.D.plantAll();
      e.D.releaseAll();
      e.D.rear = 0;
      e.D.jawT = 0;
      e.D.twist = e.D.twistT = 0;
      e.data.air = true;
    }
    h.start('intro');
  }

  end() {
    const g = this.g;
    if (!this.cues.has('end')) {
      this.cues.add('end');
      this.finish();
    }
    const p = g.player;
    p.autoDir = null;
    if (p.state === 'cine') p.state = 'free';
    p.lampK = 1;
    g.post.U.uBars.value = 0;
    g.post.U.uVignette.value = 1.25;
    g.camRig.override = null;
    if (!this.cues.has('camBack')) {
      g.camRig.snapTo(p);
      g.camRig.yaw = Math.PI;
      g.camRig.pitch = 0.2;
    }
    g.scene.remove(this.ama.root);
    g.scene.remove(this.back);
    g.ui.showHud(true);
    if (!this.skippedToast) {
      this.skippedToast = true;
      g.ui.toast('Te han encerrado con él. Busca otra salida.', 5);
    }
  }
}
