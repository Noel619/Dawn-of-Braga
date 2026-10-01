// Cinemática de la bodega del canónigo (una vez, al asomarse a la escalera).
//
//  1. Desde la bodega, a ras de suelo, hacia la escalera: a la derecha, de
//     espaldas, el canónigo devora un cadáver junto al altar; al fondo, la luz
//     del farol baja por los peldaños, y luego él.
//  2. Por encima de su hombro, al pie de la escalera: la espalda del canónigo
//     encorvado sobre el cadáver. Un hueso cruje bajo su bota. Silencio.
//  3. Muy cerca, a ras de suelo: deja de comer, se queda rígido; la cabeza del
//     revés se va girando a tirones hasta mirarle; luego el cuerpo entero se
//     da la vuelta, a saltitos, recolocando las manos.
//  4. Se agacha, se alza con el cadáver en la mano, grita y lo arroja contra
//     el muro.
//  5. Arriba, a contraluz de una vela, el ama cierra la puerta de un portazo y
//     echa la tranca: «Perdóneme, señor…».
//  6. Abajo, sigue ahí, agazapado, mirándole; ladea la cabeza, castañetea.
//     Se aleja de espaldas, sin quitarle los ojos de encima, hasta la boca de
//     una de sus grutas, y se mete en ella marcha atrás: lo último que se ve
//     son los ojos, en lo negro. Empieza la caza.
// Se puede saltar con «interactuar».
import * as THREE from 'three';
import { CANON, stairY } from '../world/level_canon.js';
import { BURROW, CELLAR } from '../world/level_cellar.js';
import { Rig } from '../entities/rig.js';
import { humanoidJoints } from '../entities/models.js';
import { registerMaterialPatch, additiveFog } from '../gfx/materials.js';
import { getTexture } from '../gfx/textures.js';
import { clamp, approachAngle } from '../core/util.js';

const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => sm((t - a) / (b - a));
const lin = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const F = CELLAR.FLOOR;

// Guion (segundos)
const T_A = 5.9; // plano desde la bodega: baja la escalera
const T_CRUNCH = 8.0; // el hueso cruje bajo su bota
const T_B = 8.9; // fin del plano por encima del hombro
const T_HEAD = [9.2, 11.0]; // la cabeza gira, a tirones, hasta mirarle
const T_TURN = [11.0, 12.5]; // el cuerpo se da la vuelta
const T_SCREAM = [12.9, 14.6]; // se alza y grita
const T_THROW = 14.45; // arroja el cadáver
const T_DOOR = [15.0, 17.7]; // arriba: la puerta
const T_SLAM = 16.3;
const T_F1 = 19.2; // agazapado, le mira
const T_BACK = [19.2, 21.0]; // se aleja de espaldas hasta su gruta
const T_HOLE = [21.0, 23.6]; // se mete en ella marcha atrás
const T_LURK = [22.4, 23.15]; // quieto en lo oscuro: sólo los ojos
const T_END = 24.6;
// a dónde va a parar el cadáver (contra el muro de poniente)
const THROW_TO = [53.3, -41.6];
// tirones: n saltos, cada uno en la fracción k del tramo
const hop = (u, n, k = 0.3) => {
  u = clamp(u, 0, 1);
  if (u >= 1) return 1;
  const i = Math.floor(u * n),
    f = u * n - i;
  return (i + sm(Math.min(1, f / k))) / n;
};

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
    this.h = new THREE.Vector3();
    // la gruta por la que se va (la de la sala del altar) y su otra boca
    this.hole = CELLAR.burrows[0][0];
    this.holeTo = CELLAR.burrows[0][1];
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
    if (this.t < T_END - 1) {
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
    void head;
    let fov = 55,
      roll = 0;
    const cf = this.feast;
    const H = this.hole;
    if (t < T_A) {
      // desde la bodega, a ras de suelo, hacia la escalera; él, a la derecha
      const u = seg(t, 0, T_A);
      // (junto al altar, entre los pilares: la escalera a la izquierda)
      this.pos.set(lerp(61.8, 61.7, u), F + lerp(0.95, 1.1, u), lerp(-44.7, -44.5, u));
      this.look.set(lerp(57.9, 57.8, u), F + lerp(1.3, 1.55, u), lerp(-40.1, -39.9, u));
      fov = 54;
    } else if (t < T_B) {
      // por encima de su hombro: la espalda del canónigo, encorvado
      const u = seg(t, T_A, T_B);
      this.pos.set(p.pos.x + 0.85 - u * 0.15, p.visY + 1.75 - u * 0.1, p.pos.z + 1.25 - u * 0.4);
      this.look.set(cf.x + 0.05, F + 0.85, cf.z - 0.1);
      fov = lerp(46, 38, u);
    } else if (t < T_SCREAM[0]) {
      // detrás de él, a ras de suelo: por debajo de su cuerpo, entre las
      // patas, la cabeza del revés se va girando hasta mirar a la cámara;
      // luego se da la vuelta todo el cuerpo
      const v = seg(t, T_TURN[0], T_TURN[1]);
      this.pos.set(lerp(59.35, 59.4, v), F + lerp(0.5, 0.95, v), lerp(-40.6, -40.1, v));
      this.look.set(59.0, F + lerp(0.42, 0.95, v), lerp(-43.9, -43.0, v));
      fov = lerp(44, 54, v);
    } else if (t < T_DOOR[0]) {
      // el grito, desde su derecha y algo más abajo; luego sigue al cadáver
      const u = seg(t, T_SCREAM[0], T_DOOR[0]);
      const w = seg(t, T_THROW, T_THROW + 0.55);
      this.pos.set(p.pos.x + 1.35, p.visY + 1.35, p.pos.z + 0.25 - u * 0.15);
      this.look.set(lerp(cf.x, THROW_TO[0] + 1.2, w), F + lerp(lerp(1.6, 2.2, seg(t, T_SCREAM[0], T_SCREAM[0] + 0.6)), 0.8, w), lerp(cf.z, THROW_TO[1], w));
      fov = 52;
    } else if (t < T_DOOR[1]) {
      // arriba, la puerta: a contraluz, alguien la cierra
      const u = seg(t, T_DOOR[0], T_DOOR[1]);
      this.pos.set(CANON.stair.x + 0.35, stairY(-30.8) + 1.45, -30.8);
      this.look.set(CANON.stair.x, 1.2 - u * 0.15, CANON.cellarDoor.z);
      fov = lerp(44, 38, u);
    } else if (t < T_F1) {
      // abajo: sigue ahí, agazapado, mirándole
      const u = seg(t, T_DOOR[1], T_F1);
      this.pos.set(p.pos.x + 0.8, p.visY + 1.7 - u * 0.1, p.pos.z + 1.2 - u * 0.3);
      this.look.set(e.pos.x, F + 0.75, e.pos.z);
      fov = lerp(44, 38, u);
    } else {
      // de lado: se aleja de espaldas hasta su gruta y se mete en ella
      const u = seg(t, T_F1, T_END);
      // (desde el lado de levante, entre el pilar y el tonel: viene hacia
      // aquí, rodea el pilar y se mete en la gruta, a cinco metros)
      this.pos.set(63.9 + u * 0.1, F + 1.5 - u * 0.2, -41.0 - u * 0.4);
      const k = seg(t, T_HOLE[0] - 0.4, T_LURK[0] + 0.2);
      this.look.set(lerp(e.pos.x, H.x, k), F + lerp(0.8, 0.7, k), lerp(e.pos.z, H.z - 0.3, k));
      fov = lerp(52, 40, seg(t, T_HOLE[0], T_END));
    }
    // respingo con el grito
    if (t > T_SCREAM[0] + 0.45 && t < T_SCREAM[0] + 0.85) roll += 0.03 * Math.sin(t * 60);
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
    const BP = e ? { x: e.pos.x, y: F + 0.9, z: e.pos.z } : { x: cf.x, y: F + 0.9, z: cf.z };
    if (this.cue('creak', 1.1)) a.play('stairCreak', { x: S.x, y: stairY(-29) + 0.2, z: -29 });
    if (this.cue('creak2', 3.4)) a.play('stairCreak', { x: S.x + 0.8, y: stairY(-33) + 0.2, z: -33 });
    // masticar: se oye durante toda la bajada
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
    if (this.cue('neck', T_HEAD[0] + 0.05)) a.play('neckTwist', BP);
    // un chasquido por cada tirón de la cabeza y por cada salto del cuerpo
    for (let k = 0; k < 5; k++) if (this.cue('hk' + k, T_HEAD[0] + ((T_HEAD[1] - T_HEAD[0]) * k) / 5)) a.play('boneCrack', BP, { n: 1, k: 0.55 });
    for (let k = 0; k < 4; k++) if (this.cue('tk' + k, T_TURN[0] + ((T_TURN[1] - T_TURN[0]) * k) / 4)) a.play('boneCrack', BP, { n: 2, k: 0.8 });
    if (this.cue('snarl', T_TURN[1] - 0.15)) a.play('snarl', BP);
    if (this.cue('scream', T_SCREAM[0] + 0.45)) {
      a.play('descScream', { x: cf.x, y: F + 1.8, z: cf.z });
      g.camRig.shake(0.5);
      g.input.rumble(0.8, 0.9, 700);
    }
    if (this.cue('whoosh', T_THROW - 0.05)) a.play('pounceWhoosh', BP);
    if (this.cue('whisperAma', T_DOOR[0] + 0.5)) a.play('amaWhisper', { x: S.x, y: 1.4, z: CANON.cellarDoor.z + 0.4 });
    if (this.cue('slam', T_SLAM)) {
      a.play('doorSlam', { x: S.x, y: 1.2, z: CANON.cellarDoor.z });
      g.camRig.shake(0.35);
      g.input.rumble(1, 0.7, 250);
    }
    if (this.cue('bar', T_SLAM + 0.55)) a.play('bar', { x: S.x, y: 1.2, z: CANON.cellarDoor.z });
    if (this.cue('giggle', T_DOOR[1] + 0.5)) a.play('giggle', BP);
    if (this.cue('scuttle', T_BACK[0] + 0.3)) a.play('scuttle', BP);
    if (this.cue('dig', T_HOLE[0] + 0.4)) a.play('dig', { x: H.x, y: F + 0.8, z: H.z });
    if (this.cue('breath', T_LURK[0] + 0.1)) a.play('breathClose', { x: H.x, y: F + 0.6, z: H.z });
    if (this.cue('giggle2', T_LURK[1] + 0.05)) a.play('giggle', { x: H.ix, y: F + 0.6, z: H.iz });

    // --- el farol tiembla al gritar y cuando se mete en la gruta
    let lamp = 1;
    if (t > T_SCREAM[0] + 0.4 && t < T_SCREAM[1]) lamp = 0.6 + 0.4 * Math.abs(Math.sin(t * 29));
    if (t > T_LURK[1] - 0.15 && t < T_LURK[1] + 0.6) lamp = 0.6 + 0.4 * Math.abs(Math.sin(t * 23));
    p.lampK = lamp;

    // --- el canónigo
    if (D) {
      this.creature(dt, t, e, D, p);
      e.animate(dt);
    }

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

  // El canónigo, beat a beat (ver el guion arriba).
  creature(dt, t, e, D, p) {
    const cf = this.feast;
    const h = this.hunt;
    const corpse = h.corpse.root;
    const lf = D.L[0],
      rf = D.L[1];
    D.lookP.set(p.pos.x, p.visY + 1.5, p.pos.z);
    e.vx = e.vz = 0;
    if (t < T_CRUNCH) {
      // come
      D.eatT = 1;
      D.T.h = 0.72;
      D.T.pitch = 0.28;
      D.lookW = 0;
      D.feast = h.bitePoint();
      this.eatHands(D, t);
      return;
    }
    if (t < T_TURN[1]) {
      // silencio: se queda rígido, con las manos aún en el cadáver
      D.eatT = 0;
      D.feast = h.bitePoint();
      const c = D.feast;
      if (t < T_TURN[0]) {
        D.hold(lf, c.x + 0.3, c.y + 0.12, c.z + 0.1, 1, 0.9);
        D.hold(rf, c.x - 0.35, c.y + 0.1, c.z - 0.1, 1, 0.9);
      } else if (!this.cues.has('let')) {
        this.cues.add('let');
        D.releaseAll();
      }
      D.T.h = lerp(0.72, 0.8, seg(t, T_CRUNCH, T_CRUNCH + 0.4));
      D.exert = 0;
      // la cabeza: a tirones, del revés, hasta mirarle; la boca se abre
      const hu = hop(lin(t, T_HEAD[0], T_HEAD[1]), 5, 0.28);
      const jit = t > T_HEAD[0] && t < T_HEAD[1] ? Math.sin(t * 47) * 0.025 : 0;
      let tw = Math.PI * 0.92 * hu + jit;
      D.eyeT = t > T_HEAD[0] + 0.7 ? 1.8 : 0.5;
      D.jawT = 0.3 * hu;
      D.tiltT = hu * 0.25;
      D.lookW = 0;
      // el cuerpo, a saltitos, mientras la cabeza sigue clavada en él
      if (t > T_TURN[0]) {
        const v = lin(t, T_TURN[0], T_TURN[1]);
        const hb = hop(v, 4, 0.32);
        e.yaw = Math.PI - Math.PI * hb;
        tw = Math.PI * 0.92 * (1 - hb);
        D.lookW = hb;
        const f = (v * 4) % 1;
        D.T.h = 0.8 + 0.2 * hb + (f < 0.32 ? Math.sin((Math.PI * f) / 0.32) * 0.12 : 0);
        D.T.pitch = 0.28 * (1 - hb);
        D.tiltT = 0.25 * (1 - hb);
      } else D.T.pitch = 0.28;
      D.twist = D.twistT = tw;
      return;
    }
    if (t < T_DOOR[0]) {
      // se agacha, se alza con el cadáver en la mano, grita y lo arroja
      e.yaw = 0;
      D.twistT = D.twist = 0;
      D.lookW = 1;
      D.eyeT = 1.6;
      const crouch = seg(t, T_TURN[1], T_SCREAM[0]) * (1 - seg(t, T_SCREAM[0], T_SCREAM[0] + 0.3));
      const rise = seg(t, T_SCREAM[0], T_SCREAM[0] + 0.45);
      const down = seg(t, T_THROW + 0.25, T_DOOR[0]);
      D.rear = 0.85 * rise * (1 - down);
      D.T.h = 1 - 0.3 * crouch + 0.55 * rise * (1 - down) - 0.25 * down;
      D.T.bend = -0.3 * rise * (1 - down);
      const screaming = t > T_SCREAM[0] + 0.4 && t < T_SCREAM[1];
      D.jawT = screaming ? 1 : 0.25;
      D.shake = screaming ? 1 : D.shake;
      D.tiltT = screaming ? Math.sin(t * 22) * 0.35 : 0;
      // el brazo izquierdo, abierto; el derecho sostiene el cadáver
      D.local(1.0, 0.25 + 1.75 * rise * (1 - down), 1.0, this.w);
      D.hold(lf, this.w.x, this.w.y, this.w.z, rise * (1 - down) + crouch * 0.3, 0.8);
      const wind = seg(t, T_THROW - 0.38, T_THROW);
      if (t < T_THROW) {
        // (se echa hacia la izquierda para coger impulso)
        D.T.yaw = 0.45 * wind;
        D.local(lerp(-0.9, -0.7, wind), lerp(0.6 + 1.6 * rise, 2.5, wind), lerp(0.9, -0.5, wind), this.w);
        D.hold(rf, this.w.x, this.w.y, this.w.z, 1, 1);
        corpse.position.set(this.w.x, this.w.y - 0.9, this.w.z);
        corpse.rotation.set(0.3 + wind * 0.9, 1.2 + rise * 0.6, 0.2 - wind * 0.6);
      } else {
        // lo suelta a su derecha, con todo el cuerpo; el brazo sigue de largo
        const fol = seg(t, T_THROW, T_THROW + 0.3);
        D.T.yaw = lerp(0.45, -0.55, fol) * (1 - down);
        D.local(lerp(-1.3, -1.1, fol), lerp(1.9, 0.5, fol), lerp(0.6, 1.5, fol), this.w);
        D.hold(rf, this.w.x, this.w.y, this.w.z, 1 - down, -0.3);
        if (!this.fly) {
          this.fly = { t: 0, x0: corpse.position.x, y0: corpse.position.y, z0: corpse.position.z, x1: THROW_TO[0], z1: THROW_TO[1], dur: 0.6 };
        }
        const f = this.fly;
        f.t += dt;
        const u = clamp(f.t / f.dur, 0, 1);
        if (u < 1) {
          corpse.position.set(lerp(f.x0, f.x1, u), lerp(f.y0, F + 0.9, u) + Math.sin(Math.PI * u) * 1.4, lerp(f.z0, f.z1, u));
          corpse.rotation.x += dt * 9;
          corpse.rotation.z += dt * 5;
        } else if (!f.landed) {
          f.landed = true;
          h.poseCorpse('curl', f.x1, F, f.z1, 1.4);
          this.g.audio.play('corpseThud', { x: f.x1, y: F + 0.5, z: f.z1 });
          this.g.fx.blood.emit(f.x1, F + 1.0, f.z1, 30, { speed: 4 });
          this.g.camRig.shake(0.3);
        }
      }
      return;
    }
    if (!this.cues.has('settle')) {
      this.cues.add('settle');
      D.releaseAll();
      D.rear = 0;
      D.T.yaw = D.T.bend = 0;
      D.shake = 0;
      if (this.fly && !this.fly.landed) {
        this.fly.landed = true;
        h.poseCorpse('curl', THROW_TO[0], F, THROW_TO[1], 1.4);
      }
    }
    const H = this.hole;
    if (t < T_F1) {
      // agazapado, le mira; ladea la cabeza, castañetea, tamborilea los dedos
      e.yaw = 0;
      D.lookW = 1;
      D.eyeT = 1.5;
      D.T.h = 0.62;
      D.T.pitch = 0.12;
      D.tiltT = Math.sin(t * 1.6) * 0.9;
      D.chatter = t > T_DOOR[1] + 0.45 && t < T_DOOR[1] + 1.4 ? 1 : 0;
      D.local(-0.95, 0.04 + Math.max(0, Math.sin(t * 9)) * 0.22, 1.45, this.w);
      D.hold(rf, this.w.x, this.w.y, this.w.z, 1, 0.5 + Math.sin(t * 9) * 0.5);
      return;
    }
    if (t < T_BACK[1]) {
      // se aleja de espaldas, al acecho, sin quitarle los ojos de encima
      if (!this.cues.has('backoff')) {
        this.cues.add('backoff');
        D.releaseAll();
        this.back0 = [e.pos.x, e.pos.z];
      }
      D.chatter = 0;
      D.creep = true;
      // (rodea el pilar por el sur, pegado al altar: una curva)
      const u = seg(t, T_BACK[0], T_BACK[1]);
      const cx = 62.0,
        cz = -45.05;
      const x = (1 - u) * (1 - u) * this.back0[0] + 2 * u * (1 - u) * cx + u * u * H.fx,
        z = (1 - u) * (1 - u) * this.back0[1] + 2 * u * (1 - u) * cz + u * u * H.fz;
      e.vx = (x - e.pos.x) / Math.max(dt, 1e-3);
      e.vz = (z - e.pos.z) / Math.max(dt, 1e-3);
      e.pos.x = x;
      e.pos.z = z;
      e.yaw = approachAngle(e.yaw, Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z), 3 * dt);
      D.T.h = 0.6;
      D.lookW = 1;
      D.eyeT = 1.5;
      D.tiltT = Math.sin(t * 2.3) * 0.5;
      return;
    }
    if (t < T_HOLE[1]) {
      // marcha atrás, despacio, dentro de la gruta; se queda quieto en lo
      // oscuro, mirándole (lo último, los ojos), y se apagan
      const out = Math.atan2(H.nx, H.nz);
      e.yaw = approachAngle(e.yaw, out, 3 * dt);
      const LURK = 0.7; // lo que se mete antes de pararse
      let depth;
      if (t < T_LURK[0]) depth = lerp(-BURROW.front, LURK, seg(t, T_HOLE[0] + 0.15, T_LURK[0]));
      else if (t < T_LURK[1] + 0.1) depth = LURK + 0.08 * Math.sin((t - T_LURK[0]) * 3);
      else depth = lerp(LURK, BURROW.inside, seg(t, T_LURK[1] + 0.1, T_HOLE[1] - 0.1));
      const x = H.x - H.nx * depth,
        z = H.z - H.nz * depth;
      e.vx = (x - e.pos.x) / Math.max(dt, 1e-3);
      e.vz = (z - e.pos.z) / Math.max(dt, 1e-3);
      e.pos.x = x;
      e.pos.z = z;
      D.narrow = clamp((depth + 1.2) / 1.5, 0, 1);
      D.T.h = lerp(0.7, 0.62, D.narrow);
      D.lookW = 1;
      const lurk = t > T_LURK[0] && t < T_LURK[1];
      // (el tronco con la cabeza alta, para que asomen los ojos)
      D.T.pitch = -0.12;
      D.tiltT = lurk ? 0.35 * Math.sin((t - T_LURK[0]) * 2.2) : 0;
      D.chatter = lurk && t > T_LURK[0] + 0.3 && t < T_LURK[0] + 0.6 ? 1 : 0;
      D.eyeT = t < T_LURK[1] ? (lurk ? 1.9 : 1.6) : 0;
      return;
    }
    e.obj.visible = false;
    e.vx = e.vz = 0;
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
    if (!this.fly || !this.fly.landed) h.poseCorpse('curl', THROW_TO[0], F, THROW_TO[1], 1.4);
    this.ama.root.visible = false;
    this.back.visible = false;
    if (e) {
      e.scripted = false;
      const D = e.D;
      D.air = null;
      D.plane = 'floor';
      D.releaseAll();
      D.rear = 0;
      D.jawT = 0;
      D.chatter = 0;
      D.creep = false;
      D.twist = D.twistT = 0;
      D.T.yaw = D.T.bend = 0;
    }
    h.start('intro');
    // va por dentro de la roca, de la gruta de la sala hasta la de la cripta
    if (e && !e.dead) {
      const D = e.D;
      D.burrow = { A: this.hole, B: this.holeTo, t: 0, stage: 'inside', dur: 3.5, snd: 0.6 };
      D.setMode('burrow');
      D.hidden = true;
      D.noCol = true;
      D.narrow = 1;
      e.data.air = true;
      e.obj.visible = false;
      e.pos.set(this.hole.ix, F, this.hole.iz);
    }
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
