// Modo editor (dentro del modo de pruebas): una cámara libre que se separa
// del jugador y vuela por el mundo (WASD según hacia dónde mira, Espacio
// sube, C baja, Mayús deprisa; el ratón mira con el panel cerrado), que
// dice dónde está y a qué punto apunta, y que puede llevar allí al jugador.
// Con «Detener el tiempo» el mundo se queda quieto mientras la cámara vuela.
import * as THREE from 'three';

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

export class Editor {
  constructor(game) {
    this.g = game;
    this.free = false;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.fwd = new THREE.Vector3(0, 0, 1);
    this.yaw = 0;
    this.pitch = 0;
    this.speed = 9;
    this.hit = null;
    this._last = 0;
  }

  setFree(on) {
    const g = this.g,
      p = g.player;
    if (on === this.free) return;
    this.free = on;
    if (on) {
      // desde donde estaba la cámara, mirando hacia donde miraba
      const c = g.camera;
      this.pos.copy(c.position);
      c.getWorldDirection(this.fwd);
      this.yaw = Math.atan2(this.fwd.x, this.fwd.z);
      this.pitch = Math.asin(clamp(-this.fwd.y, -1, 1));
      this.fov = c.fov;
      this.wasState = p.state;
      p.state = 'cine';
      p.vx = p.vz = 0;
    } else {
      g.camRig.override = null;
      g.camRig.snapTo(p);
      if (p.state === 'cine') p.state = 'free';
    }
  }

  // (con el tiempo real: la cámara vuela aunque el mundo esté detenido)
  update() {
    const now = performance.now();
    const dt = Math.min(0.1, this._last ? (now - this._last) / 1000 : 0);
    this._last = now;
    if (!this.free) return;
    const g = this.g,
      inp = g.input;
    const lk = inp.look(dt);
    this.yaw -= lk.x;
    this.pitch = clamp(this.pitch + lk.y, -1.5, 1.5);
    const cy = Math.cos(this.pitch);
    this.fwd.set(Math.sin(this.yaw) * cy, -Math.sin(this.pitch), Math.cos(this.yaw) * cy);
    const mv = inp.move();
    const k = inp.keys;
    const up = (k.has('Space') ? 1 : 0) - (k.has('KeyC') ? 1 : 0);
    const sp = this.speed * (inp.down('sprint') || k.has('ShiftLeft') ? 4 : 1);
    const rx = -Math.cos(this.yaw),
      rz = Math.sin(this.yaw);
    this.pos.x += (this.fwd.x * mv.y + rx * mv.x) * sp * dt;
    this.pos.y += (this.fwd.y * mv.y + up) * sp * dt;
    this.pos.z += (this.fwd.z * mv.y + rz * mv.x) * sp * dt;
    this.look.copy(this.pos).add(this.fwd);
    g.camRig.override = { pos: this.pos, look: this.look, snap: true, fov: this.fov || 70 };
    g.player.state = 'cine';
    // el punto al que apunta (lo primero que choca)
    const d = g.world.col.raycast(this.pos.x, this.pos.y, this.pos.z, this.fwd.x, this.fwd.y, this.fwd.z, 120, (b) => b.enabled !== false && b.tag !== 'fog');
    this.hit = d === Infinity ? null : (this.hit || new THREE.Vector3()).copy(this.pos).addScaledVector(this.fwd, d);
  }

  // Lleva al jugador al suelo del punto al que apunta la cámara.
  playerHere() {
    const g = this.g,
      p = g.player;
    const at = this.hit || (this.free ? this.pos : null);
    if (!at) return false;
    const y = g.world.col.groundHeight(at.x, at.z, 0.3, at.y + 0.6);
    if (y < -80) return false;
    p.spawn(at.x, y, at.z, this.yaw);
    if (this.free) p.state = 'cine';
    else g.camRig.snapTo(p);
    return true;
  }

  info() {
    if (!this.free) return '';
    const f = (v) => `${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}`;
    return `cámara ${f(this.pos)}  ·  ${((this.yaw * 180) / Math.PI).toFixed(0)}°\napunta ${this.hit ? f(this.hit) : '—'}`;
  }
}
