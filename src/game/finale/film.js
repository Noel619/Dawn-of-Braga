// La película del jefe final: el armazón.
//
// Cada acto (film_*.js) es una corrutina: un generador en el que cada `yield`
// espera un fotograma y devuelve su dt (el del mundo: ya a cámara lenta si la
// hay). Aquí está lo que comparten:
//
//   corrutinas  run / also / wait / until; las de fondo corren a la vez
//   cámara      planos fijos, travellings (de un encuadre a otro), una
//               función por fotograma (seguir a algo) y cámara al hombro
//               (temblor suave); giro y campo de visión
//   franjas     las franjas negras y la viñeta de las cinemáticas
//   tiempo      cámara lenta del mundo (las pulsaciones corren en tiempo real)
//   jugador     marioneta: posición, rumbo, inclinación y clip; daño que en
//               las cinemáticas no mata (la vida no baja de 1)
//   pulsaciones los avisos (qte.js); al saltar una cinemática, se dan por
//               acertadas
//   saltar      «interactuar» en una cinemática: fundido a negro y el juego
//               corre a toda velocidad (sin sonido) hasta el siguiente momento
//               jugable o el final del tramo
import * as THREE from 'three';
import { clamp, damp } from '../../core/util.js';

const V3 = THREE.Vector3;
const UP = new V3(0, 1, 0);
export const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
export const smoother = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
export const lerp = (a, b, k) => a + (b - a) * k;
export const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
export const easeIn = (u) => Math.pow(clamp(u, 0, 1), 3);
const _q = new THREE.Quaternion(),
  _q2 = new THREE.Quaternion(),
  _e = new THREE.Euler();

// ruido suave para la cámara al hombro
function noise(t, s) {
  return Math.sin(t * 1.31 + s * 4.1) * 0.5 + Math.sin(t * 2.73 + s * 1.7) * 0.32 + Math.sin(t * 5.9 + s * 9.3) * 0.18;
}

export class Film {
  constructor(game) {
    this.g = game;
    this.co = null;
    this.bg = [];
    this.cam = null; // { pos, look, fov, roll, speed, snap }
    this.camFn = null; // (dt) => cam: un plano que se calcula cada fotograma
    this.hand = 0; // amplitud de la cámara al hombro (m)
    this.handT = 0;
    this.bars = 0;
    this.barsTo = 0;
    this.timeK = 1;
    this.timeTo = 1;
    this.timeRate = 6;
    this.cine = false; // ¿cinemática? (fallar no mata; se puede saltar)
    this.skipping = false;
    this.skipOK = false;
    this.attach = null; // () => { pos, yaw, tilt (cuaternión) }: dónde va el jugador
    this.tilt = new THREE.Quaternion();
    this.pClipName = null;
    this.t = 0;
    this._pos = new V3();
    this._look = new V3();
  }

  // ------------------------------------------------------------ corrutinas
  run(gen) {
    this.co = gen;
    this.bg = [];
  }
  also(gen) {
    this.bg.push(gen);
    return gen;
  }
  stop() {
    this.co = null;
    this.bg = [];
    this.timeK = this.timeTo = 1;
    this.g.timeK = 1;
    this.attach = null;
    this.tilt.identity();
    this.cam = null;
    this.camFn = null;
    if (this.skipping) this.skipStop();
  }
  get active() {
    return !!this.co;
  }
  *wait(t) {
    while (t > 0) t -= yield;
  }
  // hasta que fn() sea verdad (o pasen max segundos)
  *until(fn, max = 1e9) {
    let t = 0;
    while (!fn() && t < max) t += yield;
  }
  // hasta que el clip de acción de un rig llegue al instante t (o acabe)
  *waitClip(R, t) {
    while (R.action.clip && !R.action.done && R.action.t < t) yield;
  }
  // un aviso de pulsación; devuelve si se acertó (al saltar: acertado)
  *prompt(o) {
    if (this.skipping) return true;
    let res = null;
    this.g.qte.start({ ...o, onDone: (ok) => (res = ok) });
    while (res === null) {
      if (this.skipping) {
        this.g.qte.cancel();
        return true;
      }
      yield;
    }
    return res;
  }
  // un aviso que corre mientras pasa otra cosa: devuelve un objeto cuyo
  // .ok es null hasta que se resuelve
  promptAsync(o) {
    const r = { ok: null };
    if (this.skipping) {
      r.ok = true;
      return r;
    }
    this.g.qte.start({ ...o, onDone: (ok) => (r.ok = ok) });
    return r;
  }

  // ------------------------------------------------------------ cámara
  // Un plano: pos y look (Vector3 o [x, y, z]); o: { fov, roll, speed, snap }
  shot(pos, look, o = {}) {
    this.camFn = null;
    this.cam = {
      pos: pos.isVector3 ? pos.clone() : new V3(...pos),
      look: look.isVector3 ? look.clone() : new V3(...look),
      fov: o.fov ?? 55,
      roll: o.roll ?? 0,
      speed: o.speed ?? 6,
      snap: o.snap ?? true,
    };
    return this.cam;
  }
  // Un travelling de un encuadre a otro en dur segundos (con su curva).
  // a, b: { pos, look, fov, roll }. Se puede seguir haciendo otras cosas:
  // devuelve la corrutina para also().
  *move(a, b, dur, ease = sm) {
    const P0 = a.pos.isVector3 ? a.pos.clone() : new V3(...a.pos),
      P1 = b.pos.isVector3 ? b.pos.clone() : new V3(...b.pos);
    const L0 = a.look.isVector3 ? a.look.clone() : new V3(...a.look),
      L1 = b.look.isVector3 ? b.look.clone() : new V3(...b.look);
    const f0 = a.fov ?? 55,
      f1 = b.fov ?? f0,
      r0 = a.roll ?? 0,
      r1 = b.roll ?? r0;
    let t = 0;
    this.camFn = null;
    const c = (this.cam = { pos: P0.clone(), look: L0.clone(), fov: f0, roll: r0, snap: true, speed: 6 });
    while (t < dur) {
      t += yield;
      if (this.cam !== c) return;
      const u = ease(Math.min(1, t / dur));
      c.pos.lerpVectors(P0, P1, u);
      c.look.lerpVectors(L0, L1, u);
      c.fov = lerp(f0, f1, u);
      c.roll = lerp(r0, r1, u);
    }
  }
  // un plano que se recalcula cada fotograma: fn(dt, t) => { pos, look, fov, roll }
  follow(fn) {
    let t = 0;
    this.cam = null;
    this.camFn = (dt) => {
      t += dt;
      const c = fn(dt, t);
      if (c) this.cam = { snap: true, speed: 6, fov: 55, roll: 0, ...c };
    };
  }
  // devuelve la cámara al jugador (detrás de él, mirando hacia yaw)
  release(yaw = null, pitch = 0.22) {
    const g = this.g;
    this.cam = null;
    this.camFn = null;
    g.camRig.override = null;
    g.camRig.snapTo(g.player);
    if (yaw !== null) g.camRig.yaw = yaw;
    g.camRig.pitch = pitch;
    g.camRig.cam.fov = g.camRig.fovBase;
    g.camRig.cam.updateProjectionMatrix();
  }

  // ------------------------------------------------------------ franjas y tiempo
  setBars(k, instant = false) {
    this.barsTo = k;
    if (instant) this.bars = k;
  }
  slow(k, rate = 6) {
    this.timeTo = k;
    this.timeRate = rate;
  }
  // entra en una cinemática (franjas, se puede saltar, fallar no mata)
  cinema(on, o = {}) {
    const g = this.g;
    this.cine = on;
    this.skipOK = on && o.skip !== false;
    this.setBars(on ? 1 : 0, o.instant);
    g.ui.showHud(!on);
    if (!on) this.hand = 0;
  }

  // ------------------------------------------------------------ el jugador
  puppet(on) {
    const p = this.g.player;
    p.puppet = on;
    if (on) {
      p.state = 'cine';
      p.vx = p.vz = 0;
      p.body.vy = 0;
      p.blocking = false;
      p.charging = false;
      p.anim.speed = 1;
      if (p.flask) p.flask.visible = false;
    } else {
      this.attach = null;
      this.tilt.identity();
      if (!p.dead) {
        p.state = 'free';
        p.body.grounded = true;
      }
    }
  }
  setP(x, y, z, yaw = null) {
    const p = this.g.player;
    if (x && x.isVector3) {
      yaw = y ?? yaw;
      y = x.y;
      z = x.z;
      x = x.x;
    }
    p.body.pos.set(x, y, z);
    p.visY = y;
    if (yaw !== null && yaw !== undefined) p.yaw = yaw;
  }
  pClip(c, o = {}) {
    const p = this.g.player;
    const clip = typeof c === 'string' ? p.clips[c] : c;
    if (!clip) return;
    this.pClipName = clip.name;
    p.anim.play(clip, { blend: o.blend ?? 0.12, speed: o.speed ?? 1, t0: o.t0 ?? 0 });
  }
  // Daño al jugador. En una cinemática no mata (la vida no baja de 1).
  hurt(dmg, from = null, o = {}) {
    const g = this.g,
      p = g.player;
    if (p.dead) return;
    if (g.dev && g.dev.god) dmg = 0;
    p.hp -= dmg;
    if (this.cine || o.noKill) p.hp = Math.max(1, p.hp);
    p.lastHitT = g.time;
    p.flinchX.kick(-9);
    g.hurtFlash = Math.max(g.hurtFlash, o.flash ?? 0.8);
    g.camRig.shake(o.shake ?? 0.5);
    g.input.rumble(1, 0.8, 260);
    if (o.blood !== false) g.fx.blood.emit(p.pos.x, p.pos.y + 1.2, p.pos.z, 28, { speed: 4.5, up: 1.5 });
    g.audio && g.audio.play('playerHurt', p.pos);
    if (o.heavy) g.audio && g.audio.play('hitHeavy', p.pos);
    if (p.hp <= 0) {
      p.hp = 0;
      p.puppet = false;
      this.attach = null;
      p.die();
    }
  }

  // ------------------------------------------------------------ saltar
  // (interactuar en una cinemática): a toda velocidad hasta que se acabe el
  // tramo que se puede saltar (cinema(false) o skipStop())
  trySkip() {
    if (!this.skipOK || this.skipping || !this.co) return;
    const g = this.g;
    this.skipping = true;
    g.fadeTarget = 0;
    this._fadeWait = 0.35;
    g.audio && g.audio.hushWorld && g.audio.hushWorld(true);
  }
  skipStop() {
    if (!this.skipping) return;
    const g = this.g;
    this.skipping = false;
    g.ffSteps = 1;
    g.fadeTarget = 1;
    g.audio && g.audio.hushWorld && g.audio.hushWorld(false);
  }

  // ------------------------------------------------------------ cada fotograma
  update(dt) {
    const g = this.g;
    this.t += dt;
    // (al saltar: primero el fundido, luego a toda velocidad)
    if (this.skipping) {
      if (this._fadeWait > 0) {
        this._fadeWait -= dt;
        if (this._fadeWait <= 0) g.ffSteps = 8;
      }
      if (!this.skipOK) this.skipStop();
    }
    if (this.co) {
      const r = this.co.next(dt);
      if (r.done) this.co = null;
    }
    for (let i = this.bg.length - 1; i >= 0; i--) if (this.bg[i].next(dt).done) this.bg.splice(i, 1);
    // tiempo del mundo (lo aplica game.update en el fotograma siguiente)
    this.timeK = damp(this.timeK, this.timeTo, this.timeRate, dt / Math.max(0.05, this.timeK));
    if (Math.abs(this.timeK - this.timeTo) < 0.002) this.timeK = this.timeTo;
    g.timeK = this.timeK;
    // franjas y viñeta
    this.bars = damp(this.bars, this.barsTo, 4.5, dt / Math.max(0.05, this.timeK));
    const U = g.post.U;
    U.uBars.value = 0.115 * this.bars;
    U.uVignette.value = 1.25 + 0.9 * this.bars;
    this.applyPlayer();
    this.applyCam(dt);
  }
  // el jugador sigue a lo que le lleva (la mano, la losa, el virote)
  applyPlayer() {
    const p = this.g.player;
    if (!p.puppet || p.dead) return;
    if (this.attach) {
      const a = this.attach();
      if (a) {
        if (a.pos) this.setP(a.pos.x, a.pos.y, a.pos.z, a.yaw ?? null);
        if (a.tilt) this.tilt.copy(a.tilt);
      }
    }
    // la posición y el giro, ya (sin esperar al fotograma siguiente)
    p.obj.position.set(p.body.pos.x, p.visY, p.body.pos.z);
    _q.setFromAxisAngle(UP, p.yaw);
    p.obj.quaternion.copy(this.tilt).multiply(_q);
    p.obj.updateMatrixWorld(true);
  }
  applyCam(dt) {
    const g = this.g;
    if (this.camFn) this.camFn(dt);
    if (!this.cam) return;
    const c = this.cam;
    this._pos.copy(c.pos);
    this._look.copy(c.look);
    // cámara al hombro: un vaivén suave, más en la mirada que en la posición
    if (this.hand > 0) {
      this.handT += dt;
      const h = this.hand,
        t = this.handT;
      this._pos.x += noise(t, 1) * h * 0.4;
      this._pos.y += noise(t, 2) * h * 0.3;
      this._pos.z += noise(t, 3) * h * 0.4;
      this._look.x += noise(t * 0.8, 4) * h;
      this._look.y += noise(t * 0.8, 5) * h * 0.8;
      this._look.z += noise(t * 0.8, 6) * h;
    }
    g.camRig.override = { pos: this._pos, look: this._look, fov: c.fov, roll: c.roll, speed: c.speed, snap: c.snap };
  }
}

// Un recorrido (las huidas guiadas): una poligonal en planta, con su
// longitud; at(s) da el punto y la dirección a s metros del principio y
// project(x, z), cuánto se ha avanzado.
export class Path {
  constructor(pts) {
    this.p = pts.map(([x, y, z]) => new V3(x, y, z));
    this.L = [0];
    for (let i = 1; i < this.p.length; i++) this.L.push(this.L[i - 1] + Math.hypot(this.p[i].x - this.p[i - 1].x, this.p[i].z - this.p[i - 1].z));
    this.len = this.L[this.L.length - 1];
  }
  at(s, out = {}) {
    s = clamp(s, 0, this.len);
    let i = 1;
    while (i < this.L.length - 1 && this.L[i] < s) i++;
    const a = this.p[i - 1],
      b = this.p[i];
    const segL = this.L[i] - this.L[i - 1] || 1;
    const u = (s - this.L[i - 1]) / segL;
    out.x = a.x + (b.x - a.x) * u;
    out.y = a.y + (b.y - a.y) * u;
    out.z = a.z + (b.z - a.z) * u;
    out.tx = (b.x - a.x) / segL;
    out.tz = (b.z - a.z) / segL;
    return out;
  }
  project(x, z) {
    let best = 0,
      bd = Infinity;
    for (let i = 1; i < this.p.length; i++) {
      const a = this.p[i - 1],
        b = this.p[i];
      const dx = b.x - a.x,
        dz = b.z - a.z;
      const l2 = dx * dx + dz * dz || 1;
      const u = clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1);
      const d = Math.hypot(x - (a.x + dx * u), z - (a.z + dz * u));
      if (d < bd) {
        bd = d;
        best = this.L[i - 1] + u * Math.sqrt(l2);
      }
    }
    return best;
  }
}

// Un punto en el espacio de un hueso (o de un objeto): local -> mundo.
export function boneWorld(obj, x, y, z, out = new V3()) {
  obj.updateMatrixWorld(true);
  return out.set(x, y, z).applyMatrix4(obj.matrixWorld);
}
// Cuaternión de inclinación (grados: cabeceo, alabeo) para el jugador.
export function tiltQ(pitch = 0, roll = 0, yaw = 0, out = new THREE.Quaternion()) {
  _e.set((pitch * Math.PI) / 180, (yaw * Math.PI) / 180, (roll * Math.PI) / 180, 'YXZ');
  return out.setFromEuler(_e);
}
export { _q2 as _tmpQ };
