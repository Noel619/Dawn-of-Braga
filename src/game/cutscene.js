// Cinemática de la bodega del canónigo. Al asomarse a la escalera, la cámara
// baja de espaldas por los peldaños mirando siempre al personaje (la bodega no
// se ve nunca), con un zoom de vértigo y franjas negras. A media bajada algo
// cruza el plano pegado al objetivo, a cuatro patas, sin que el personaje se
// entere; abajo, el farol se ahoga, una cabeza del revés baja del techo
// delante de la cámara, chilla y corte a negro.
import * as THREE from 'three';
import { CANON, stairY } from '../world/level_canon.js';

const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const lerp = (a, b, k) => a + (b - a) * k;

// Guion (segundos)
const T_DOLLY = 7.0; // la cámara baja la escalera
const T_CROSS = [5.05, 5.85]; // el bicho cruza el plano de un salto
const T_LAMP = 7.25; // se ahoga el farol
const T_HEAD = [7.55, 8.15]; // la cabeza baja del techo
const T_CUT = 8.2; // corte a negro
const T_BACK = 9.3; // vuelve la imagen
const T_END = 9.7;

export class CellarCutscene {
  constructor(game) {
    this.g = game;
    this.t = 0;
    this.cues = new Set();
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.v = new THREE.Vector3();
    const S = CANON.stair;
    // el personaje en el rellano, mirando escalera abajo
    this.stand = new THREE.Vector3(S.x, 0, S.top + 0.2);
    // la cámara: delante de su cara -> al pie de la escalera
    this.p0 = new THREE.Vector3(S.x, 1.55, S.top - 0.8);
    this.p1 = new THREE.Vector3(S.x, -2.05, S.bottom + 0.03);
  }

  start() {
    const g = this.g;
    const p = g.player;
    this.boss = g.bosses.descoyuntado;
    p.spawn(this.stand.x, this.stand.y, this.stand.z, Math.PI);
    p.state = 'cine';
    g.lockTarget = null;
    g.ui.showHud(false);
    g.audio.stopMusic();
    g.audio.play('dread');
    if (this.boss) {
      this.boss.scripted = true;
      this.boss.obj.visible = false;
      this.boss.shadow.visible = false;
    }
    this.apply(0);
  }

  // Un suceso del guion, una sola vez.
  cue(name, at) {
    if (this.t < at || this.cues.has(name)) return false;
    this.cues.add(name);
    return true;
  }

  // Salta al corte a negro (botón de interactuar).
  skip() {
    if (this.t < T_CUT) {
      this.t = T_CUT;
      this.cues.add('scare');
      this.g.audio.stopMusic();
    }
  }

  // Avanza el guion; devuelve false al terminar.
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
    // franjas negras, grano y viñeta
    const bars = t < T_BACK ? sm(t / 0.8) : 1 - sm((t - T_BACK) / 0.4);
    U.uBars.value = 0.115 * bars;
    U.uVignette.value = 1.25 + 0.9 * bars;
    this.grain = 0.05 * bars;
    p.yaw = Math.PI;
    p.vx = p.vz = 0;

    // --- cámara: travelling de espaldas escalera abajo, siempre mirándolo
    const u = sm(Math.min(1, t / T_DOLLY));
    this.pos.lerpVectors(this.p0, this.p1, u);
    // cámara en mano, apenas
    this.pos.x += Math.sin(t * 1.3) * 0.025;
    this.pos.y += Math.sin(t * 1.7 + 1) * 0.018;
    const face = lerp(1.5, 1.1, u);
    this.look.set(this.stand.x + Math.sin(t * 0.9) * 0.02, face, this.stand.z);
    let fov = lerp(54, 30, u);
    let roll = Math.sin(t * 0.7) * 0.01;
    // el golpe final: la cámara da un respingo
    if (t > T_HEAD[1] - 0.08 && t < T_CUT) {
      roll += 0.06;
      fov -= 3;
    }
    // (al volver la imagen la cámara ya es la del juego)
    if (t < T_BACK) g.camRig.override = { pos: this.pos, look: this.look, fov, roll, snap: true };

    // --- sonido
    const S = CANON.stair;
    const C = CANON.cellar;
    if (this.cue('creak', 1.4)) a.play('stairCreak', { x: S.x, y: stairY(this.pos.z) + 0.2, z: this.pos.z });
    if (this.cue('crackFar', 2.7)) a.play('boneCrack', { x: 57.5, y: C.y + 1, z: -39 }, { n: 3, k: 0.8 });
    if (this.cue('creak2', 3.3)) a.play('stairCreak', { x: S.x + 0.8, y: stairY(-30) + 0.2, z: -30 });
    if (this.cue('breath', 3.9)) a.play('breathClose');
    if (this.cue('scuttle', T_CROSS[0] - 0.08)) a.play('scuttle', { x: S.x, y: this.pos.y, z: this.pos.z + 1.2 });
    if (this.cue('crackNear', T_CROSS[0] + 0.1)) a.play('boneCrack', { x: S.x, y: this.pos.y, z: this.pos.z + 1.3 }, { n: 2, k: 1.1 });
    if (this.cue('lampOut', T_LAMP)) a.play('lampOut', p.pos);
    if (this.cue('whisper', T_HEAD[0] - 0.1)) a.play('whisperClose');
    if (this.cue('scare', T_HEAD[1] - 0.05)) {
      a.play('scare');
      g.camRig.shake(0.35);
      g.input.rumble(1, 0.8, 400);
    }

    // --- el farol: tiembla cuando pasa el bicho y se ahoga al final
    let lamp = 1;
    if (t > T_CROSS[0] && t < T_CROSS[1] + 0.3) lamp = 0.55 + 0.45 * Math.abs(Math.sin(t * 37));
    if (t > T_LAMP) lamp = Math.max(0.1, 1 - (t - T_LAMP) / 0.25) * (0.7 + 0.3 * Math.sin(t * 23));
    if (t >= T_BACK) lamp = 1;
    p.lampK = lamp;

    // --- la criatura
    const e = this.boss;
    if (e) {
      const T = e.T;
      if (t >= T_CROSS[0] && t <= T_CROSS[1]) {
        // salta de una pared a otra de la escalera, con los cuatro miembros
        // abiertos, entre la cámara y el personaje
        const k = (t - T_CROSS[0]) / (T_CROSS[1] - T_CROSS[0]);
        const z = -30.4;
        e.state = 'cine';
        e.data.lift = e.data.flip = 0;
        e.body.pos.set(lerp(62.6, 56.4, k), stairY(z) + 0.75 * Math.sin(Math.PI * k), z);
        e.yaw = -Math.PI / 2;
        e.vx = -7.5;
        e.vz = 0;
        e.obj.visible = true;
        // la pose del salto, quieta
        const A = e.anim;
        if (A.clip !== T.clips.pounce) A.play(T.clips.pounce, { blend: 0 });
        A.from = null;
        A.xf = 1;
        A.w = 1;
        A.done = true;
        A.t = 0.9;
        e.animate(Math.max(dt, 1 / 60));
      } else if (t >= T_HEAD[0] && t < T_CUT) {
        // la cabeza, del revés, baja del techo delante del objetivo
        const k = sm((t - T_HEAD[0]) / (T_HEAD[1] - T_HEAD[0] - 0.15));
        // (entre la cámara y el personaje: le tapa)
        this.v.set(S.x + Math.sin(t * 3) * 0.02, lerp(C.top + 0.15, -1.46, k), this.p1.z + 0.9);
        e.state = 'cine';
        e.obj.visible = true;
        e.shadow.visible = false;
        if (T.scriptPose) T.scriptPose(e, 'hang', t, this.v);
        // una luz fría y débil deja ver la cara
        g.bossLight.color.setHex(0x8090b0);
        g.bossLight.distance = 2.4;
        g.bossLight.intensity = 0.9 * k;
        g.bossLight.position.set(this.v.x + 0.35, this.v.y - 0.45, this.v.z - 0.6);
      } else {
        e.obj.visible = false;
        e.shadow.visible = false;
      }
    }

    // --- corte a negro y vuelta
    if (t >= T_CUT && t < T_BACK) {
      g.fade = 0;
      g.fadeTarget = 0;
      if (e) e.obj.visible = false;
      g.bossLight.intensity = 0;
    }
    if (this.cue('back', T_BACK)) this.restore();
  }

  // De vuelta al juego: el personaje en lo alto de la escalera, la criatura en
  // su sitio (colgada en la bodega) y la cámara detrás de él mirando abajo.
  restore() {
    const g = this.g;
    const p = g.player;
    const e = this.boss;
    if (e) {
      e.scripted = false;
      e.reset();
    }
    g.bossLight.intensity = 0;
    g.bossLight.color.setHex(0xff6a20);
    g.bossLight.distance = 14;
    p.lampK = 1;
    g.camRig.override = null;
    g.camRig.snapTo(p);
    g.camRig.yaw = Math.PI;
    g.camRig.pitch = 0.42;
    g.fadeTarget = 1;
  }

  end() {
    const g = this.g;
    if (!this.cues.has('back')) this.restore();
    const p = g.player;
    if (p.state === 'cine') p.state = 'free';
    g.post.U.uBars.value = 0;
    g.post.U.uVignette.value = 1.25;
    g.camRig.override = null;
    g.ui.showHud(true);
  }
}
