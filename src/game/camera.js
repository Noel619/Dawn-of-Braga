// Cámara en tercera persona con colisión, fijado de objetivo y temblor.
import * as THREE from 'three';
import { clamp, damp, dampAngle } from '../core/util.js';

export class CameraRig {
  constructor(camera) {
    this.cam = camera;
    this.yaw = 0;
    this.pitch = 0.22;
    this.dist = 4.3;
    this.curDist = 4.3;
    this.side = 0;
    this.pivot = new THREE.Vector3();
    this.trauma = 0;
    this.lookAt = new THREE.Vector3();
    this.override = null; // {pos, look} para escenas
    this.fovBase = 62;
    this.fovKick = 0;
  }

  snapTo(player) {
    this.pivot.set(player.pos.x, player.visY + 1.5, player.pos.z);
    this.yaw = player.yaw;
    this.curDist = this.dist;
  }

  shake(a) {
    this.trauma = Math.min(1, this.trauma + a);
  }

  update(dt, input, player, target, col, allowLook = true) {
    const cam = this.cam;
    if (this.override) {
      const o = this.override;
      cam.position.lerp(o.pos, 1 - Math.exp(-(o.speed ?? 3) * dt));
      this.lookAt.lerp(o.look, 1 - Math.exp(-(o.speed ?? 3) * dt));
      cam.lookAt(this.lookAt);
      this._applyShake(dt);
      return;
    }
    const look = allowLook ? input.look(dt) : { x: 0, y: 0 };
    // desplazamiento lateral (hombro) al fijar objetivo para no tapar al enemigo
    this.side = damp(this.side, target ? 0.75 : 0, 4, dt);
    const sx = -Math.cos(this.yaw) * this.side,
      sz = Math.sin(this.yaw) * this.side;
    const pv = new THREE.Vector3(player.pos.x + sx, player.visY + 1.6, player.pos.z + sz);
    this.pivot.x = damp(this.pivot.x, pv.x, 16, dt);
    this.pivot.z = damp(this.pivot.z, pv.z, 16, dt);
    this.pivot.y = damp(this.pivot.y, pv.y, 9, dt);

    if (target) {
      const tx = target.pos.x - player.pos.x,
        tz = target.pos.z - player.pos.z;
      const d = Math.hypot(tx, tz);
      const desiredYaw = Math.atan2(tx, tz);
      this.yaw = dampAngle(this.yaw, desiredYaw, 7, dt);
      const th = (target.lockHeight ?? 1.4) + target.pos.y - (player.visY + 1.5);
      const desiredPitch = clamp(0.28 + Math.atan2(-th, Math.max(d, 2)) * 0.5, -0.05, 0.6);
      this.pitch = damp(this.pitch, desiredPitch, 5, dt);
    } else {
      this.yaw -= look.x;
      this.pitch = clamp(this.pitch + look.y, -0.55, 1.15);
    }

    const cp = Math.cos(this.pitch),
      sp = Math.sin(this.pitch);
    const dir = new THREE.Vector3(Math.sin(this.yaw) * cp, -sp, Math.cos(this.yaw) * cp);
    const want = target ? this.dist + 0.5 : this.dist;
    // colisión de cámara
    const hit = col.raycast(this.pivot.x, this.pivot.y, this.pivot.z, -dir.x, -dir.y, -dir.z, want + 0.3, (b) => b.cam !== false);
    let allowed = want;
    if (hit !== Infinity) allowed = Math.max(0.6, hit - 0.3);
    if (allowed < this.curDist) this.curDist = allowed;
    else this.curDist = damp(this.curDist, allowed, 3, dt);

    cam.position.set(this.pivot.x - dir.x * this.curDist, this.pivot.y - dir.y * this.curDist, this.pivot.z - dir.z * this.curDist);
    // no bajar del suelo
    const minY = player.visY + 0.3;
    if (cam.position.y < minY) cam.position.y = minY;

    if (target) {
      const tp = new THREE.Vector3(target.pos.x, target.pos.y + (target.lockHeight ?? 1.4) * 0.8, target.pos.z);
      this.lookAt.copy(this.pivot).lerp(tp, 0.45);
    } else {
      this.lookAt.copy(this.pivot).addScaledVector(dir, 1);
      this.lookAt.y += 0.35;
    }
    cam.lookAt(this.lookAt);
    // FOV
    this.fovKick = damp(this.fovKick, player.sprinting ? 5 : 0, 4, dt);
    const fov = this.fovBase + this.fovKick;
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    this._applyShake(dt);
  }

  _applyShake(dt) {
    if (this.trauma > 0) {
      const s = this.trauma * this.trauma;
      const t = performance.now() / 1000;
      this.cam.rotation.z += Math.sin(t * 47) * 0.02 * s;
      this.cam.position.x += Math.sin(t * 61) * 0.08 * s;
      this.cam.position.y += Math.sin(t * 53 + 1) * 0.08 * s;
      this.trauma = Math.max(0, this.trauma - dt * 1.8);
    }
  }
}
