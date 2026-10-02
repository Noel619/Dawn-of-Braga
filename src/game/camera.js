// Cámara en tercera persona al estilo Souls: seguimiento suave, colisión,
// recentrado animado, fijado de objetivo que encuadra a los dos y temblor.
import * as THREE from 'three';
import { clamp, damp, dampAngle, angleDiff, smoothstep } from '../core/util.js';

const _dir = new THREE.Vector3();
const _tp = new THREE.Vector3();

export class CameraRig {
  constructor(camera) {
    this.cam = camera;
    this.yaw = 0;
    this.pitch = 0.22;
    this.dist = 4.1;
    this.curDist = 4.1;
    this.side = 0;
    this.pivot = new THREE.Vector3();
    this.trauma = 0;
    this.lookAt = new THREE.Vector3();
    this.override = null; // {pos, look} para escenas
    this.fovBase = 60;
    this.fovKick = 0;
    this.recenterT = 0;
    this.recenterYaw = 0;
    this.lockW = 0; // 0..1: transición suave al fijar/soltar
  }

  snapTo(player) {
    this.pivot.set(player.pos.x, player.visY + 1.55, player.pos.z);
    this.yaw = player.yaw;
    this.curDist = this.dist;
    this.recenterT = 0;
  }

  // Gira la cámara hasta quedar detrás del jugador (animado, no instantáneo).
  recenter(yaw) {
    this.recenterYaw = yaw;
    this.recenterT = 0.7;
  }

  shake(a) {
    this.trauma = Math.min(1, this.trauma + a);
  }

  update(dt, input, player, target, col, allowLook = true) {
    const cam = this.cam;
    if (this.override) {
      const o = this.override;
      // snap: la escena coloca la cámara exactamente (travellings de cinemática)
      if (o.snap) {
        cam.position.copy(o.pos);
        this.lookAt.copy(o.look);
      } else {
        cam.position.lerp(o.pos, 1 - Math.exp(-(o.speed ?? 3) * dt));
        this.lookAt.lerp(o.look, 1 - Math.exp(-(o.speed ?? 3) * dt));
      }
      cam.lookAt(this.lookAt);
      if (o.roll) cam.rotateZ(o.roll);
      if (o.fov && Math.abs(cam.fov - o.fov) > 0.01) {
        cam.fov = o.fov;
        cam.updateProjectionMatrix();
      }
      this._applyShake(dt);
      return;
    }
    const look = allowLook ? input.look(dt) : { x: 0, y: 0 };
    this.lockW = damp(this.lockW, target ? 1 : 0, 6, dt);
    // hombro: con objetivo fijado, la cámara se aparta un poco para no taparlo
    this.side = damp(this.side, target ? 0.72 : 0, 5, dt);
    const sx = -Math.cos(this.yaw) * this.side,
      sz = Math.sin(this.yaw) * this.side;
    const px = player.pos.x + sx,
      py = player.visY + 1.55,
      pz = player.pos.z + sz;
    // seguimiento: casi rígido en horizontal (sin mareo), algo de retardo en vertical
    this.pivot.x = damp(this.pivot.x, px, 18, dt);
    this.pivot.z = damp(this.pivot.z, pz, 18, dt);
    this.pivot.y = damp(this.pivot.y, py, 10, dt);

    if (target) {
      this.recenterT = 0;
      const tx = target.pos.x - player.pos.x,
        tz = target.pos.z - player.pos.z;
      const d = Math.hypot(tx, tz);
      const desiredYaw = Math.atan2(tx, tz);
      // más rápido cuanto más se escapa el objetivo del encuadre, pero con
      // velocidad angular limitada: un barrido, nunca un salto. Con la
      // criatura encima (te agarra, te cae encima, se te cuela por debajo)
      // la dirección hacia ella da vueltas sin sentido: ahí apenas gira
      const near = smoothstep(0.7, 2.6, d);
      const err = Math.abs(angleDiff(this.yaw, desiredYaw));
      const ny = dampAngle(this.yaw, desiredYaw, (5 + Math.min(err, 1.5) * 5) * (0.25 + 0.75 * near), dt);
      const maxStep = (1 + 5.5 * near) * dt;
      this.yaw += clamp(angleDiff(this.yaw, ny), -maxStep, maxStep);
      const th = target.pos.y + (target.lockHeight ?? 1.4) * 0.75 - (player.visY + 1.4);
      const big = clamp(((target.T && target.T.height) || 1.8) / 1.8, 1, 3);
      const desiredPitch = clamp(0.24 + (big - 1) * 0.08 + Math.atan2(-th, Math.max(d, 2.5)) * 0.55 + clamp((6 - d) * 0.03, 0, 0.14), -0.1, 0.66);
      this.pitch = damp(this.pitch, desiredPitch, 4.5, dt);
    } else {
      if (Math.abs(look.x) + Math.abs(look.y) > 0.004) this.recenterT = 0;
      if (this.recenterT > 0) {
        this.recenterT -= dt;
        const ny = dampAngle(this.yaw, this.recenterYaw, 11, dt);
        this.yaw += clamp(angleDiff(this.yaw, ny), -9 * dt, 9 * dt);
        this.pitch = damp(this.pitch, 0.24, 8, dt);
        if (Math.abs(angleDiff(this.yaw, this.recenterYaw)) < 0.01) this.recenterT = 0;
      }
      this.yaw -= look.x;
      this.pitch = clamp(this.pitch + look.y, -0.6, 1.15);
    }

    let want = this.dist + this.lockW * 0.6;
    if (target && target.T && target.T.height > 2.6) want += Math.min(2.2, (target.T.height - 2.6) * 0.8) * this.lockW;
    // techo bajo (interiores, vigas, bóvedas): en vez de pegarse al jugador o
    // meterse entre las vigas, la cámara baja y mira más de frente. El tope
    // se mide sobre la cabeza del jugador y se suaviza (baja deprisa, sube
    // despacio) para no dar tirones al pasar de una sala a otra
    const up = col.raycast(this.pivot.x, this.pivot.y, this.pivot.z, 0, 1, 0, 9, (b) => b.cam !== false);
    const cap = up === Infinity ? 1.5 : Math.asin(clamp((up - 0.38) / Math.max(1, want), -0.25, 0.99));
    if (this.pitchCap === undefined) this.pitchCap = cap;
    this.pitchCap = damp(this.pitchCap, cap, cap < this.pitchCap ? 14 : 2.5, dt);
    const pe = Math.min(this.pitch, this.pitchCap);
    const cp = Math.cos(pe),
      sp = Math.sin(pe);
    const dir = _dir.set(Math.sin(this.yaw) * cp, -sp, Math.cos(this.yaw) * cp);
    // colisión de cámara: se acerca al instante, se aleja suavemente
    const hit = col.raycast(this.pivot.x, this.pivot.y, this.pivot.z, -dir.x, -dir.y, -dir.z, want + 0.3, (b) => b.cam !== false);
    let allowed = want;
    if (hit !== Infinity) allowed = Math.max(0.5, hit - 0.28);
    if (allowed < this.curDist) this.curDist = damp(this.curDist, allowed, 30, dt);
    else this.curDist = damp(this.curDist, allowed, 3.5, dt);

    cam.position.set(this.pivot.x - dir.x * this.curDist, this.pivot.y - dir.y * this.curDist, this.pivot.z - dir.z * this.curDist);
    // no bajar del suelo
    const minY = player.visY + 0.3;
    if (cam.position.y < minY) cam.position.y = minY;

    // punto de mira: delante del jugador; con objetivo, entre ambos
    this.lookAt.copy(this.pivot).addScaledVector(dir, 1);
    this.lookAt.y += 0.3;
    if (target && this.lockW > 0.01) {
      _tp.set(target.pos.x, target.pos.y + (target.lockHeight ?? 1.4) * 0.7, target.pos.z);
      _tp.lerp(this.pivot, 0.55);
      this.lookAt.lerp(_tp, this.lockW * 0.8);
    }
    cam.lookAt(this.lookAt);
    // FOV
    // (al correr se abre; en el golpe de gracia se cierra sobre él)
    const rip = player.state === 'attack' && player.atk && player.atk.riposte;
    this.fovKick = damp(this.fovKick, player.sprinting ? 5 : rip ? -8 : 0, rip ? 7 : 4, dt);
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
      this.cam.position.x += Math.sin(t * 61) * 0.07 * s;
      this.cam.position.y += Math.sin(t * 53 + 1) * 0.07 * s;
      this.trauma = Math.max(0, this.trauma - dt * 2.0);
    }
  }
}
