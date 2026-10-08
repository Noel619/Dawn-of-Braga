// Trepar a los colosos.
//
// Quien trepa va agarrado a un punto de la piel que se ve (surface.js: las
// mallas de carne y de ropa del coloso, consultadas con su deformación), así
// que sigue al cuerpo cuando anda, se dobla o se sacude, y nunca flota ni se
// mete dentro. Por la piel se mueve en cualquier dirección: arriba y abajo
// según la gravedad, a los lados según la cámara; donde es casi llana (la
// joroba, los hombros, el lomo de la cola) se anda de pie. Además de la piel,
// un coloso puede tener cuerdas (la cadena de la campana clavada).
//
// Colgado, el cuerpo es un péndulo que cuelga de las manos: se balancea con
// los tirones del coloso y queda fuera de la superficie. Las manos y los pies
// se plantan en la piel y sólo se despegan, de uno en uno, cuando el cuerpo
// se ha alejado de ellos (como quien trepa de verdad); si la piel queda fuera
// del alcance de las piernas, cuelgan.
//
//   agarrarse   interactuar junto a la piel (si está alta, salta a por ella)
//   moverse     el stick o WASD
//   aguante     colgado se gasta; de pie se recupera
//   aferrarse   mantener la guardia: cuando se sacude, si no te aferras te tira
//   apuñalar    mantener el ataque para cargar y soltarlo; en un sigilo hiere
//   soltarse    la esquiva (al caer, con la guardia te vuelves a agarrar)
//   caer        desde alto hace daño según la altura
//
// El jugador va como marioneta (player.puppet): esta clase le pone la
// posición, la orientación y la pose (con cinemática inversa en brazos y
// piernas). Si muere colgado, cae con su muerte (no como si estuviera vivo).
import * as THREE from 'three';
import { clip, sampleClip } from '../../entities/rig.js';
import { clamp, damp } from '../../core/util.js';

const DEG = Math.PI / 180;
const UP = new THREE.Vector3(0, 1, 0);
const smooth01 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const _v = new THREE.Vector3(),
  _v2 = new THREE.Vector3(),
  _v3 = new THREE.Vector3(),
  _v4 = new THREE.Vector3(),
  _v5 = new THREE.Vector3(),
  _q = new THREE.Quaternion(),
  _q2 = new THREE.Quaternion(),
  _q3 = new THREE.Quaternion(),
  _m = new THREE.Matrix4();

// medidas del cuerpo (las del esqueleto del jugador)
const GRIP_HIP = 1.02; // de las manos a la cadera, colgado
const GRIP_HIP_TIGHT = 0.86; // aferrado: los brazos doblados
const HIP_Y = 0.95; // la cadera sobre los pies
const OFF = 0.24; // la cadera, fuera de la piel (el grueso del cuerpo)
const HAND_W = 0.2; // media separación de las manos
const STEP_HAND = 0.3; // una mano se suelta cuando el agarre se aleja esto
const STEP_FOOT = 0.42;
const HANG_SPEED = 1.6;
const WALK_SPEED = 2.3;

// ============================================================ poses
// (grados; el resto lo ponen el péndulo y la cinemática inversa)
const rad = (o) => {
  const out = {};
  for (const k in o) out[k] = [o[k][0] * DEG, o[k][1] * DEG, o[k][2] * DEG];
  return out;
};
// de pie sobre el coloso: agachado, haciendo equilibrio
const STAND = { hips: [8, 0, 0], chest: [24, 0, 0], head: [-14, 0, 0], armL: [-34, 0, 46], foreL: [-30, 0, 0], handL: [0, 0, 0], armR: [-34, 0, -46], foreR: [-30, 0, 0], handR: [0, 0, 0], legL: [-46, 0, 14], shinL: [76, 0, 0], footL: [-24, 0, 0], legR: [-40, 0, -14], shinR: [70, 0, 0], footR: [-22, 0, 0] };
const mirror = (o) => {
  const out = {};
  for (const [j, v] of Object.entries(o)) {
    const n = j.endsWith('L') ? j.slice(0, -1) + 'R' : j.endsWith('R') ? j.slice(0, -1) + 'L' : j;
    out[n] = [v[0], -v[1], -v[2]];
  }
  return out;
};
const K = (t, o = {}) => [t, { ...STAND, ...o }];
const STEP_A = { legL: [-62, 0, 12], shinL: [84, 0, 0], legR: [-18, 0, -12], shinR: [58, 0, 0], armL: [-24, 0, 50], armR: [-44, 0, -42] };
export const PLAYER_CLIPS = {
  cl_stand: clip('cl_stand', 2.2, [K(0), K(1.1, { armL: [-30, 0, 52], armR: [-38, 0, -40], chest: [22, 3, 2] }), K(2.2)], { loop: true, ground: false }),
  cl_walk: clip('cl_walk', 1.0, [K(0, STEP_A), K(0.5, { ...STAND, ...mirror(STEP_A) }), K(1.0, STEP_A)], { loop: true, ground: false }),
};
// cae dando manotazos
const FALL = { hips: [-12, 0, 0], chest: [-20, 0, 0], head: [-30, 0, 0], armL: [-150, 0, 60], foreL: [-30, 0, 0], armR: [-140, 0, -70], foreR: [-40, 0, 0], legL: [-40, 0, 10], shinL: [60, 0, 0], legR: [-10, 0, -10], shinR: [50, 0, 0] };
PLAYER_CLIPS.cl_fall = clip('cl_fall', 0.8, [[0, FALL], [0.4, { ...FALL, armL: [-130, 0, 80], armR: [-160, 0, -50], legL: [-20, 0, 10], legR: [-44, 0, -10] }], [0.8, FALL]], { loop: true, ground: false });
// el salto para agarrarse: se agacha, salta con los brazos arriba
PLAYER_CLIPS.cl_leap = clip(
  'cl_leap',
  0.5,
  [
    [0, { hips: [20, 0, 0], chest: [20, 0, 0], legL: [-70, 0, 6], shinL: [100, 0, 0], legR: [-70, 0, -6], shinR: [100, 0, 0], armL: [-40, 0, 10], armR: [-40, 0, -10] }],
    [0.18, { hips: [-4, 0, 0], chest: [-10, 0, 0], head: [-30, 0, 0], legL: [-6, 0, 4], shinL: [10, 0, 0], legR: [-30, 0, -4], shinR: [50, 0, 0], armL: [-170, 0, 16], armR: [-170, 0, -16] }],
    [0.5, { hips: [6, 0, 0], chest: [10, 0, 0], head: [-24, 0, 0], legL: [-40, 0, 8], shinL: [60, 0, 0], legR: [-28, 0, -8], shinR: [50, 0, 0], armL: [-160, 0, 18], armR: [-160, 0, -18] }],
  ],
  { ground: false }
);

// ============================================================ cinemática inversa
// gira el hueso (en el mundo) para llevar la dirección 'from' a 'to'
function aim(bone, from, to, w = 1) {
  _q.setFromUnitVectors(from, to);
  if (w < 1) _q.slerp(_q3.identity(), 1 - w);
  bone.getWorldQuaternion(_q2);
  _q.multiply(_q2);
  bone.parent.getWorldQuaternion(_q3);
  bone.quaternion.copy(_q3.invert().multiply(_q));
  bone.updateMatrixWorld(true);
}
const _A = new THREE.Vector3(),
  _B = new THREE.Vector3(),
  _C = new THREE.Vector3(),
  _E = new THREE.Vector3(),
  _T = new THREE.Vector3(),
  _ax = new THREE.Vector3(),
  _pn = new THREE.Vector3();
// dos huesos: a (hombro, cadera), b (codo, rodilla), c (muñeca, tobillo):
// lleva c a target con el codo hacia pole (todo en el mundo)
function ik2(a, b, c, target, pole, w = 1) {
  if (w <= 0.001) return;
  a.updateMatrixWorld(true);
  a.getWorldPosition(_A);
  b.getWorldPosition(_B);
  c.getWorldPosition(_C);
  const lab = _A.distanceTo(_B),
    lbc = _B.distanceTo(_C);
  _T.copy(_C).lerp(target, w);
  _ax.subVectors(_T, _A);
  let d = _ax.length();
  if (d < 1e-4) return;
  _ax.multiplyScalar(1 / d);
  d = clamp(d, Math.abs(lab - lbc) + 1e-3, (lab + lbc) * 0.999);
  const cosA = (lab * lab + d * d - lbc * lbc) / (2 * lab * d);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  _pn.subVectors(pole, _A);
  _pn.addScaledVector(_ax, -_pn.dot(_ax));
  if (_pn.lengthSq() < 1e-8) _pn.subVectors(_B, _A).addScaledVector(_ax, -_v5.subVectors(_B, _A).dot(_ax));
  _pn.normalize();
  _E.copy(_A).addScaledVector(_ax, lab * cosA).addScaledVector(_pn, lab * sinA);
  aim(a, _v4.subVectors(_B, _A).normalize(), _v5.subVectors(_E, _A).normalize());
  b.getWorldPosition(_B);
  c.getWorldPosition(_C);
  _T.copy(_A).addScaledVector(_ax, d);
  aim(b, _v4.subVectors(_C, _B).normalize(), _v5.subVectors(_T, _B).normalize());
}

// ============================================================ cuerdas
// La cadena de la campana como cuerda (de la campana, s = 0, a la mano).
export class ChainRoute {
  constructor(id, chain, o = {}) {
    this.id = id;
    this.chain = chain;
    this.sigil = o.sigil || null;
    this.L = chain.len;
    this.on = false;
  }
  // punto (P) y dirección hacia la mano (T)
  at(s, P, T) {
    return this.chain.at(clamp(s, 0, this.L), P, T);
  }
  nearest(p) {
    return this.chain.nearest(p);
  }
  groundAt(x, z) {
    return this.chain.groundAt(x, z);
  }
}

// Una mano o un pie que se planta en la piel y se suelta de uno en uno.
class Limb {
  constructor(side, foot) {
    this.side = side; // +1 izquierda, -1 derecha
    this.foot = foot;
    this.att = null; // punto pegado de la piel
    this.W = new THREE.Vector3(); // dónde está (mundo)
    this.N = new THREE.Vector3(0, 0, 1);
    this.stepT = -1; // < 0: plantada
    this.from = new THREE.Vector3();
    this.free = true; // sin apoyo (cuelga)
    this.w = 0; // peso de la cinemática inversa
  }
}

// ============================================================ trepar
export class Climb {
  constructor(game) {
    this.g = game;
    this.state = 'off'; // 'off' | 'on' | 'fall' | 'leap' | 'dead'
    this.boss = null;
    this.att = null; // { k, tri, b, side } en la piel
    this.rope = null; // { r: ChainRoute, s }
    this.mode = 'hang'; // 'hang' | 'stand'
    this.shake = 0; // lo pone el coloso (0..1)
    this.shakeWarn = 0;
    this.slip = 0;
    this.charge = 0;
    this.act = null; // 'charge' | 'stab'
    this.actT = 0;
    this.grip = false;
    this.P = new THREE.Vector3(); // el agarre (colgado) o el apoyo (de pie)
    this.N = new THREE.Vector3(0, 0, 1);
    this.F = new THREE.Vector3(0, 0, 1);
    this.Ns = new THREE.Vector3(0, 0, 1); // la normal suavizada
    this.Ut = new THREE.Vector3(0, 1, 0);
    this.Rt = new THREE.Vector3(1, 0, 0);
    this.H = new THREE.Vector3(); // la cadera (el péndulo)
    this.Hp = new THREE.Vector3(); // la cadera el fotograma anterior
    this.fwd = new THREE.Vector3(0, 0, 1);
    this.quat = new THREE.Quaternion();
    this.root = new THREE.Vector3();
    this.offset = new THREE.Vector3(); // fundido al cambiar de postura
    this.moveDir = new THREE.Vector3();
    this.moving = 0;
    this.hands = [new Limb(1, false), new Limb(-1, false)];
    this.feet = [new Limb(1, true), new Limb(-1, true)];
    this.cand = null;
    this.frame = 0;
    this.noLookT = 0;
    this.lastStep = 0;
    this.fallT = 0;
    this.camFocus = new THREE.Vector3();
    this.anim = { t: 0, clip: null, pose: {} };
    this._res = { k: 0, tri: 0, b: [0, 0, 0], side: 1, d: 0, P: new THREE.Vector3(), N: new THREE.Vector3() };
    this._res2 = { k: 0, tri: 0, b: [0, 0, 0], side: 1, d: 0, P: new THREE.Vector3(), N: new THREE.Vector3() };
    // (pruebas) entrada simulada: { x, y } en vez del stick
    this.autoMove = null;
  }
  get active() {
    return this.state === 'on';
  }
  get surf() {
    return this.boss && this.boss.surface;
  }
  // la zona de la piel en la que se está ('cola', 'cadena', 'brazo4'...)
  get zone() {
    if (this.state !== 'on') return null;
    if (this.rope) return this.rope.r.id;
    return this.att && this.surf ? this.surf.zoneOf(this.att) : null;
  }
  // (compatibilidad: algunos guiones preguntan por la «ruta»)
  get route() {
    const z = this.zone;
    return z ? { id: z } : null;
  }

  // ---------------------------------------------------------- agarrarse
  // ¿hay piel (o una cuerda) a mano? Para el aviso «Agarrarse».
  findGrab() {
    const p = this.g.player;
    this.cand = null;
    const B = this.boss;
    if (this.state !== 'off' || !B || !B.visible || p.dead || p.state !== 'free' || !p.body.grounded) return null;
    let best = null;
    // la piel: el punto más cercano a las manos alzadas, delante del pecho
    const S = this.surf;
    if (S) {
      const f = p.forward();
      const probe = _v.set(p.pos.x + f.x * 0.45, p.pos.y + 1.7, p.pos.z + f.z * 0.45);
      // (la cara que mira al jugador: nunca la tripa de la cola ni lo que
      // cuelga sobre el empedrado, que dejaría al jugador debajo)
      const c = S.closest(probe, 1.7, { out: this._res, prefN: _v2.set(-f.x, 0.35, -f.z).normalize(), turnK: 1.2, facing: true });
      if (c) {
        const h = c.P.y - p.pos.y;
        const hd = Math.hypot(c.P.x - p.pos.x, c.P.z - p.pos.z);
        const toMe = _v3.set(p.pos.x - c.P.x, 0, p.pos.z - c.P.z).normalize().dot(c.N);
        // (desde el suelo no se agarra lo que es llano por arriba, salvo
        // que esté bajo: se sube a ello; ni lo que mira al suelo)
        if (h > 0.45 && h < 3.4 && hd < 1.75 && (c.N.y < 0.8 || h < 1.3) && c.N.y > -0.35 && toMe > -0.2) best = { kind: 'skin', att: { k: c.k, tri: c.tri, b: c.b.slice(), side: c.side }, P: c.P.clone(), N: c.N.clone(), d: c.d, h };
      }
    }
    // las cuerdas (la cadena de la campana clavada)
    for (const r of (B.ropes && B.ropes()) || []) {
      if (!r.on) continue;
      const chest = _v3.set(p.pos.x, p.pos.y + 1.4, p.pos.z);
      const n = r.nearest(chest);
      if (n.d > 1.8) continue;
      r.at(n.s, _v4, _v5);
      const h = _v4.y - p.pos.y;
      if (h < -0.3 || h > 3.2) continue;
      if (!best || n.d < best.d) best = { kind: 'rope', r, s: n.s, d: n.d, h, P: _v4.clone() };
    }
    this.cand = best;
    return best;
  }
  grab(c = this.cand) {
    if (!c) return false;
    const g = this.g,
      p = g.player;
    const from = p.pos.clone();
    this._begin();
    if (c.kind === 'rope') {
      this.rope = { r: c.r, s: c.s, side: new THREE.Vector3(p.pos.x - c.P.x, 0, p.pos.z - c.P.z).normalize() };
      this.att = null;
    } else {
      this.rope = null;
      this.att = c.att;
    }
    // si está alta, salta a por ella
    this.state = c.h > 2.35 ? 'leap' : 'on';
    this.leapT = 0;
    this.leapFrom = from;
    this._eval();
    this._initBody(from);
    g.audio && g.audio.play('grab', p.pos);
    g.lockTarget = null;
    // la cámara, detrás del jugador mirando hacia el coloso
    if (this.boss.center) {
      const cc = this.boss.center(_v);
      g.camRig.recenter(Math.atan2(cc.x - p.pos.x, cc.z - p.pos.z));
    }
    this.boss.onClimb && this.boss.onClimb(true, this.zone || (this.rope ? this.rope.r.id : null));
    return true;
  }
  _begin() {
    const p = this.g.player;
    this.slip = 0;
    this.charge = 0;
    this.act = null;
    this.grip = false;
    this.moving = 0;
    this.noLookT = 0;
    p.puppet = true;
    p.state = 'free';
    p.blocking = false;
    p.anim.stop(0);
    p.body.grounded = false;
    p.vx = p.vz = 0;
    p.body.vy = 0;
    this._gear(false);
    for (const L of [...this.hands, ...this.feet]) {
      L.att = null;
      L.stepT = -1;
      L.free = true;
      L.w = 0;
    }
    this._stand = undefined;
    this._nsInit = false;
    this._blocked = 0;
    this.mode = 'hang';
  }
  // soltarse: v (mundo) es la velocidad con la que sale despedido; soft:
  // se baja a pie (al llegar abajo)
  release(v = null, soft = false) {
    if (this.state !== 'on' && this.state !== 'leap') return;
    const g = this.g,
      p = g.player;
    const z = this.zone;
    this.state = soft ? 'off' : 'fall';
    this.fallFrom = p.pos.y;
    this.fallT = 0;
    p.puppet = false;
    p.body.vy = v ? v.y : 0;
    p.vx = v ? v.x : 0;
    p.vz = v ? v.z : 0;
    const f = this.fwd;
    if (Math.hypot(f.x, f.z) > 0.1) p.yaw = Math.atan2(f.x, f.z);
    p.obj.quaternion.setFromAxisAngle(UP, p.yaw);
    this._gear(true);
    this.att = null;
    this.rope = null;
    if (p.dead) {
      // muerto: cae con la muerte, no se levanta como si nada
      this.state = 'dead';
      p.state = 'dead';
      p.anim.play(PLAYER_CLIPS.cl_fall, { blend: 0.1 });
    } else {
      p.state = 'free';
      if (soft) p.anim.stop(0.25);
      else p.anim.play(PLAYER_CLIPS.cl_fall, { blend: 0.12 });
    }
    g.camRig.focus = null;
    this.boss && this.boss.onClimb && this.boss.onClimb(false, z);
  }
  // el coloso se ha ido (muere, se reinicia): suelta sin más
  reset() {
    const p = this.g.player;
    if (this.state === 'on' || this.state === 'leap') {
      p.puppet = false;
      if (!p.dead) {
        p.state = 'free';
        p.anim.stop(0);
      }
      p.obj.quaternion.setFromAxisAngle(UP, p.yaw);
      this._gear(true);
    }
    this.state = 'off';
    this.att = null;
    this.rope = null;
    this.cand = null;
    this.shake = this.shakeWarn = 0;
    this.g.camRig.focus = null;
  }
  _gear(on) {
    const p = this.g.player;
    if (on) p.updateGear();
    else {
      p.rig.joints.sword.visible = false;
      p.rig.joints.shield.visible = false;
      // (el escudo, a la espalda: no desaparece)
      p.shieldBack.group.visible = p.hasShield;
      p.saya.group.visible = false;
    }
  }

  // ---------------------------------------------------------- cada fotograma
  update(dt) {
    this.frame++;
    const g = this.g,
      p = g.player;
    if (this.state === 'fall' || this.state === 'dead') return this._falling(dt);
    if (this.state !== 'on' && this.state !== 'leap') return;
    if (!this.boss || !this.boss.visible) return this.release();
    if (p.dead) return this.release(_v.copy(this.N).multiplyScalar(1.5));
    // el sitio al que se va agarrado ya no vale (la mano se levanta, la cola
    // barre, la cadena se suelta)
    if (!this._valid()) return this.release(_v.copy(this.N).multiplyScalar(3).add(UP));
    this._eval();
    if (this.state === 'leap') return this._leap(dt);
    const inp = g.input;
    const allow = g.state === 'play' && !g.ui.modal && !g.cine;
    this.grip = allow && inp.down('block');
    this.shakeWarn = Math.max(0, this.shakeWarn - dt);
    if (allow && inp.pressed('dodge') && !this.act) return this.release(_v.copy(this.N).multiplyScalar(3.2).addScaledVector(UP, 2.4));
    // apuñalar (mantener el ataque, soltar)
    const sig = this.boss.sigilNear ? this.boss.sigilNear(this.handPos(_v2)) : null;
    this.sig = sig;
    if (this.act === 'stab') {
      const t0 = this.actT;
      this.actT += dt;
      if (t0 < 0.1 && this.actT >= 0.1) this._stabHit();
      if (this.state !== 'on') return;
      if (this.actT >= 0.55) this.act = null;
    } else if (allow && p.hasSword && inp.down('light') && !this.grip) {
      if (this.act !== 'charge') {
        this.act = 'charge';
        this.charge = 0;
      }
      this.charge = Math.min(1, this.charge + dt / 1.1);
    } else if (this.act === 'charge') {
      this.act = 'stab';
      this.actT = 0;
      this.power = 0.34 + 0.66 * this.charge;
      this.stabSig = sig;
      p.useSt(4);
      g.audio && g.audio.play('swingHeavy', this.P, { k: 0.6 + this.power * 0.4 });
    }
    // movimiento
    const mv = this.autoMove || (allow && !this.grip && !this.act ? inp.move() : { x: 0, y: 0 });
    const mag = Math.min(1, Math.hypot(mv.x, mv.y));
    if (this.rope) this._moveRope(dt, mv, mag);
    else this._moveSkin(dt, mv, mag);
    if (this.state !== 'on') return;
    // aguante
    const stand = this.mode === 'stand';
    const moving = this.moving > 0.15;
    let dst = stand ? -30 : moving ? 5.2 : 3;
    if (this.grip) dst = stand ? 3 : 13;
    if (this.act === 'charge') dst = sig ? 2.5 : 6;
    if (this.shake > 0.05 && !stand) dst += 6 * this.shake;
    if (dst < 0) {
      p.stDelay -= dt;
      if (p.stDelay <= 0) p.st = Math.min(p.maxSt, p.st - dst * dt);
    } else {
      p.st -= dst * dt;
      p.stDelay = 0.6;
    }
    if (p.st <= 0 && !stand) {
      g.ui.toast('Te fallan las fuerzas.', 2.5);
      return this.release(_v.copy(this.N).multiplyScalar(1.5));
    }
    // sacudidas: si no te aferras, te tira
    if (this.shake > 0.25 && !this.grip) {
      this.slip += this.shake * dt * (stand ? 2.4 : 1.6);
      if (this.slip >= 1) {
        g.ui.toast('Te ha sacudido de encima.', 2.5);
        return this.release(_v.copy(this.N).multiplyScalar(6 + this.shake * 5).addScaledVector(UP, 4));
      }
    } else this.slip = Math.max(0, this.slip - dt * 0.8);
    if (this.shake > 0.05) g.camRig.shake(this.shake * dt * 1.5);
    // el cuerpo, la pose y la cámara
    this._body(dt);
    this._pose(dt);
    this._camera(dt);
  }

  // ¿sigue valiendo el sitio al que se va agarrado?
  _valid() {
    if (this.rope) return this.rope.r.on;
    const S = this.surf;
    if (!S || !this.att) return false;
    const part = S.parts[this.att.k];
    return S._ok(part, this.att.tri, null);
  }
  // el agarre y la normal, tal y como está ahora el cuerpo del coloso
  _eval() {
    if (this.rope) {
      const R = this.rope;
      R.r.at(R.s, this.P, this.Ut);
      // (la cadena: «arriba» es hacia la mano si sube; la normal, hacia el
      // lado del jugador, nunca por debajo)
      if (this.Ut.y < 0) this.Ut.negate();
      this.N.copy(R.side).addScaledVector(this.Ut, -R.side.dot(this.Ut));
      if (this.N.y < 0) this.N.y = 0;
      if (this.N.lengthSq() < 1e-3) this.N.crossVectors(UP, this.Ut);
      if (this.N.lengthSq() < 1e-4) this.N.set(1, 0, 0);
      this.N.normalize();
      this.F.copy(this.N);
      return;
    }
    this.surf.eval(this.att, this.P, this.N, this.F);
  }
  // marco de la superficie: Ut (arriba por la piel) y Rt (a la derecha,
  // vista desde fuera)
  _frame() {
    const N = this.N,
      cam = this.g.camera;
    const Ut = this.Ut.copy(UP).addScaledVector(N, -N.y);
    let k = Ut.length();
    // (en un techo, «arriba» es hacia donde mira la cámara)
    if (k < 0.35) {
      _v.set(0, 0, -1).applyQuaternion(cam.quaternion);
      _v.addScaledVector(N, -_v.dot(N));
      if (_v.lengthSq() > 1e-4) Ut.addScaledVector(_v.normalize(), 0.35 - k);
      k = Ut.length();
    }
    if (k < 1e-4) Ut.set(0, 0, 1);
    Ut.normalize();
    this.Rt.crossVectors(Ut, N).normalize();
  }

  _moveSkin(dt, mv, mag) {
    const g = this.g,
      S = this.surf;
    // la normal suavizada (para la postura, el cuerpo y la cámara: en la piel
    // con bultos, la de cada triángulo da bandazos)
    if (!this._nsInit) {
      this.Ns.copy(this.N);
      this._nsInit = true;
    } else this.Ns.lerp(this.N, 1 - Math.exp(-dt * 7)).normalize();
    const stand = this._standing();
    const was = this._stand;
    this.mode = stand ? 'stand' : 'hang';
    this._frame();
    let dy = 0;
    const D = _v3.set(0, 0, 0);
    if (mag > 0.12) {
      if (stand) {
        // de pie: como andando por el suelo, según la cámara
        const cam = g.camera;
        const cf = _v.set(0, 0, -1).applyQuaternion(cam.quaternion);
        const cr = _v2.set(1, 0, 0).applyQuaternion(cam.quaternion);
        cf.addScaledVector(this.N, -cf.dot(this.N)).normalize();
        cr.addScaledVector(this.N, -cr.dot(this.N)).normalize();
        D.copy(cr).multiplyScalar(mv.x).addScaledVector(cf, mv.y);
      } else D.copy(this.Rt).multiplyScalar(mv.x).addScaledVector(this.Ut, mv.y);
      if (D.lengthSq() > 1) D.normalize();
      dy = mv.y;
    }
    const spd = (stand ? WALK_SPEED : HANG_SPEED) * (this.grip ? 0 : 1);
    D.multiplyScalar(spd * dt);
    const want = D.length();
    let went = 0;
    if (want > 1e-5) {
      // el punto de la piel más cercano adonde se quiere ir (sin saltar al
      // otro lado de un dedo o de la tela: se prefiere la misma cara)
      const T = _v4.copy(this.P).add(D).addScaledVector(this.N, -0.04);
      const c = S.closest(T, Math.max(0.35, want * 3), { out: this._res, prefN: this.N, turnK: 0.6 });
      if (c && c.N.dot(this.N) > 0.2 && c.d < 0.3 + want) {
        const moved = _v5.subVectors(c.P, this.P);
        const adv = moved.dot(D) / want;
        if (adv > want * 0.15) {
          this.att = { k: c.k, tri: c.tri, b: c.b.slice(), side: c.side };
          this.moveDir.copy(moved).normalize();
          this._eval();
          went = adv;
        }
      }
      // atascado (un hueco entre la cola y la ropa, el borde de un jirón):
      // se alarga la mano a la piel de delante, si la hay a un palmo
      if (went < want * 0.15) {
        this._blocked = (this._blocked || 0) + dt;
        if (this._blocked > 0.12) {
          const dir = _v2.copy(D).normalize();
          const pref = _v.copy(this.N).sub(dir).normalize();
          for (const reach of [0.5, 0.8, 1.1]) {
            const T2 = _v4.copy(this.P).addScaledVector(dir, reach).addScaledVector(this.N, 0.15);
            const c2 = S.closest(T2, 0.6, { out: this._res, prefN: pref, turnK: 0.5 });
            if (!c2) continue;
            const adv = _v5.subVectors(c2.P, this.P).dot(dir);
            if (adv < 0.2 || c2.N.dot(this.N) < -0.2) continue;
            this.att = { k: c2.k, tri: c2.tri, b: c2.b.slice(), side: c2.side };
            this.moveDir.copy(dir);
            const old = _v5.copy(this.root).add(this.offset);
            this._eval();
            this._body(0);
            // (el cuerpo llega en un momento: se funde desde donde estaba)
            this.offset.copy(old).sub(this.root);
            this._blocked = 0;
            g.audio && g.audio.play('grab', this.P, { k: 0.5 });
            went = adv;
            break;
          }
        }
      } else this._blocked = 0;
      // al pie: se baja al suelo
      if (!stand && dy < -0.3) {
        const gy = this.g.world.col.groundHeight(this.P.x, this.P.z, 0.3, this.P.y + 0.5);
        if (this.root.y - gy < 0.35 || this.P.y - gy < 1.9) {
          this.release(null, true);
          const p = this.g.player;
          p.body.pos.set(this.root.x, gy, this.root.z);
          p.body.grounded = true;
          return;
        }
      }
    } else this._blocked = 0;
    this.moving = damp(this.moving, Math.min(went, want) / Math.max(dt, 1e-4) / (stand ? WALK_SPEED : HANG_SPEED), 10, dt);
    if (was !== undefined && was !== stand) this._flipT = 0;
  }
  // ¿de pie? (la superficie casi llana, con margen para no cambiar en el límite)
  _standing() {
    const k = (this.boss && this.boss.standY) || 0.74,
      m = 0.08;
    const n = this._nsInit ? this.Ns : this.N;
    return n.y > (this._stand ? k - m : k + m);
  }

  _moveRope(dt, mv, mag) {
    const R = this.rope;
    this._frame();
    // por la cadena: arriba y abajo (hacia la mano o hacia la campana)
    const up = R.r.at(R.s, _v, _v2).y <= R.r.at(Math.min(R.r.L, R.s + 0.3), _v3, _v4).y ? 1 : -1;
    const ds = mag > 0.12 ? mv.y * up : 0;
    const spd = this.grip ? 0 : HANG_SPEED * 0.9;
    R.s = clamp(R.s + ds * spd * dt, 0, R.r.L);
    this.moving = damp(this.moving, Math.abs(ds) * (this.grip ? 0 : 1), 10, dt);
    this.moveDir.copy(this.Ut).multiplyScalar(Math.sign(ds * up) || 1);
    this._eval();
    // tendida a ras de suelo: se anda por encima
    const gy = R.r.groundAt(this.P.x, this.P.z);
    const low = this.P.y - gy < 1.2 && Math.abs(this.Ut.y) < 0.75;
    this.mode = low ? 'stand' : 'hang';
    if (low) {
      this.N.copy(UP);
      this.P.y = Math.max(this.P.y, gy + 0.05);
    }
    // al llegar abajo, a la campana o a la mano, se queda
  }

  // ---------------------------------------------------------- el cuerpo
  // Coloca el péndulo la primera vez (desde donde estaba el jugador).
  _initBody(from) {
    this._frame();
    const stand = (this.rope ? this.mode === 'stand' : this._standing()) && this.state !== 'leap';
    this._stand = stand;
    if (stand) this.H.copy(this.P).addScaledVector(UP, HIP_Y);
    else this.H.copy(this.P).addScaledVector(UP, -GRIP_HIP).addScaledVector(this.N, OFF);
    this.Hp.copy(this.H);
    this.fwd.copy(this.N).negate().setY(0);
    if (this.fwd.lengthSq() < 1e-3) this.fwd.set(0, 0, 1);
    this.fwd.normalize();
    this._body(0, true);
    this.offset.copy(from).sub(this.root);
    this._flipT = 9;
    this._pose(0, true);
  }
  _body(dt, snap = false) {
    const stand = this.mode === 'stand';
    const flip = this._stand !== undefined && this._stand !== stand;
    const prevRoot = _v5.copy(this.root).add(this.offset);
    this._stand = stand;
    const N = this.N;
    if (stand) {
      // de pie: la cadera sobre los pies, casi vertical
      const up = _v.copy(UP).lerp(this._nsInit ? this.Ns : N, 0.2).normalize();
      this.H.copy(this.P).addScaledVector(up, HIP_Y);
      this.Hp.copy(this.H);
      this.bodyUp = (this.bodyUp || new THREE.Vector3()).copy(up);
      // mira hacia donde anda
      if (this.moving > 0.2) {
        _v.copy(this.moveDir).addScaledVector(up, -this.moveDir.dot(up));
        if (_v.lengthSq() > 1e-4) this.fwd.lerp(_v.normalize(), 1 - Math.exp(-(dt || 1) * 8)).normalize();
      }
    } else {
      // colgado: péndulo (la cadera) bajo el agarre, fuera de la piel
      const L = this.grip || this.shake > 0.3 ? GRIP_HIP_TIGHT : GRIP_HIP;
      if (snap) {
        this.H.copy(this.P).addScaledVector(UP, -L).addScaledVector(N, OFF);
        this.Hp.copy(this.H);
      } else if (dt > 0) {
        const n = Math.max(1, Math.ceil(dt / (1 / 120)));
        const h = dt / n;
        const kd = Math.exp(-3.2 * h);
        for (let i = 0; i < n; i++) {
          const vx = (this.H.x - this.Hp.x) * kd,
            vy = (this.H.y - this.Hp.y) * kd,
            vz = (this.H.z - this.Hp.z) * kd;
          this.Hp.copy(this.H);
          this.H.x += vx;
          this.H.y += vy - 9.8 * h * h;
          this.H.z += vz;
          this._hang(L);
        }
      }
      this._hang(L);
      this.bodyUp = (this.bodyUp || new THREE.Vector3()).subVectors(this.P, this.H).normalize();
      // de cara a la piel
      _v.copy(N).negate();
      _v.addScaledVector(this.bodyUp, -_v.dot(this.bodyUp));
      if (_v.lengthSq() > 0.04) this.fwd.copy(_v.normalize());
      else this.fwd.addScaledVector(this.bodyUp, -this.fwd.dot(this.bodyUp)).normalize();
    }
    const Yb = this.bodyUp;
    const Zb = _v.copy(this.fwd).addScaledVector(Yb, -this.fwd.dot(Yb));
    if (Zb.lengthSq() < 1e-4) Zb.copy(N).negate().addScaledVector(Yb, -N.dot(Yb) * -1);
    Zb.normalize();
    const Xb = _v2.crossVectors(Yb, Zb).normalize();
    _m.makeBasis(Xb, Yb, Zb);
    _q.setFromRotationMatrix(_m);
    if (snap) this.quat.copy(_q);
    else this.quat.slerp(_q, 1 - Math.exp(-dt * (stand ? 10 : 14)));
    this.root.copy(this.H).addScaledVector(Yb, -HIP_Y);
    // de pie <-> colgado la raíz salta (los pies en la piel o las manos en
    // ella): se funde
    if (flip && !snap) {
      this.offset.copy(prevRoot).sub(this.root);
      this._flipT = 0;
    }
    this._flipT = (this._flipT ?? 9) + (dt || 0);
    if (!snap) this.offset.multiplyScalar(Math.exp(-(dt || 0) * 6));
  }
  // la cadera, a su distancia del agarre y fuera de la piel
  _hang(L) {
    const P = this.P,
      N = this.N;
    _v.subVectors(this.H, P);
    // fuera de la piel (con el grueso del cuerpo)
    const out = _v.dot(N);
    if (out < OFF) _v.addScaledVector(N, OFF - out);
    // y por debajo del agarre (no se pone de cabeza)
    if (_v.y > -0.25) _v.y = -0.25;
    _v.setLength(L);
    this.H.copy(P).add(_v);
  }

  // ---------------------------------------------------------- el salto
  _leap(dt) {
    const g = this.g,
      p = g.player;
    this.leapT += dt;
    const u = smooth01(this.leapT / 0.42);
    this._frame();
    this.mode = 'hang';
    this._body(0, true);
    // de donde estaba a colgado, por un arco
    const end = _v3.copy(this.root);
    const pos = _v4.copy(this.leapFrom).lerp(end, u);
    pos.y += Math.sin(u * Math.PI) * 0.6;
    this.offset.copy(pos).sub(this.root);
    if (this.leapT < 0.04) g.audio && g.audio.play('pounceWhoosh', p.pos, { k: 0.5 });
    if (this.leapT >= 0.42) {
      this.state = 'on';
      this.offset.set(0, 0, 0);
      g.audio && g.audio.play('grab', p.pos);
      g.camRig.shake(0.08);
    }
    this._pose(dt, false, 'leap', u);
    this._camera(dt);
  }

  // ---------------------------------------------------------- la pose
  // El cuerpo, la pose base y la cinemática inversa de manos y pies.
  _pose(dt, snap = false, special = null, u = 0) {
    const p = this.g.player;
    const rig = p.rig;
    const stand = this.mode === 'stand';
    // dónde va el cuerpo
    const fx = this.root.x + this.offset.x,
      fy = this.root.y + this.offset.y,
      fz = this.root.z + this.offset.z;
    p.body.pos.set(fx, fy, fz);
    p.visY = fy;
    p.vx = p.vz = 0;
    p.body.vy = 0;
    p.yaw = Math.atan2(this.fwd.x, this.fwd.z);
    p.obj.position.set(fx, fy, fz);
    p.obj.quaternion.copy(this.quat);
    // pose base
    let pose;
    const at = this.anim;
    at.t += dt;
    if (special === 'leap') pose = sampleClip(PLAYER_CLIPS.cl_leap, u * 0.5, at.pose);
    else if (stand) {
      const c = this.moving > 0.2 ? PLAYER_CLIPS.cl_walk : PLAYER_CLIPS.cl_stand;
      pose = sampleClip(c, at.t * (c === PLAYER_CLIPS.cl_walk ? 1.1 : 1), at.pose);
    } else pose = this._hangPose(dt);
    // la capa cuelga hacia abajo
    if (!pose.cloak) pose.cloak = [0, 0, 0];
    rig.apply(pose);
    p.obj.updateMatrixWorld(true);
    // la capa: hacia abajo en el mundo
    this._cloak();
    if (special === 'leap') return;
    // manos y pies en la piel
    if (!stand) {
      this._limbs(dt, snap);
      this._ikArms(dt);
      this._ikLegs(dt);
    } else if (this.act) this._ikArms(dt);
  }
  _hangPose(dt) {
    // colgado: el pecho algo arqueado, la cabeza mira hacia arriba; las
    // piernas, si no llegan a la piel, cuelgan y se balancean con el cuerpo
    const sw = this.H.clone().sub(this.Hp).multiplyScalar(1 / Math.max(dt, 1 / 120));
    const local = _v.copy(sw).applyQuaternion(_q2.copy(this.quat).invert());
    const swing = clamp(local.z * 0.08, -0.5, 0.5),
      side = clamp(local.x * 0.06, -0.4, 0.4);
    const tight = this.grip || this.shake > 0.3 ? 1 : 0;
    this._tight = damp(this._tight || 0, tight, 8, dt || 0.016);
    const T = this._tight;
    const P = {
      hips: [6 + T * 14, 0, 0],
      chest: [10 + T * 14, 0, side * 10],
      head: [-24 + T * 30, 0, 0],
      legL: [-30 - T * 40 + swing * 40, 0, 8 + side * 20],
      shinL: [44 + T * 50, 0, 0],
      footL: [-10, 0, 0],
      legR: [-18 - T * 40 + swing * 50, 0, -8 + side * 20],
      shinR: [36 + T * 50, 0, 0],
      footR: [-8, 0, 0],
      // (los brazos los pone la cinemática inversa)
      armL: [-160, 0, 18],
      foreL: [-30, 0, 0],
      armR: [-160, 0, -18],
      foreR: [-30, 0, 0],
      cloak: [0, 0, 0],
      lantern: [swing * 30, 0, 0],
    };
    return rad(P);
  }
  _cloak() {
    const p = this.g.player;
    const c = p.rig.joints.cloak;
    if (!c) return;
    // el paño cuelga del cuello hacia abajo (su eje local -y), pero no se
    // mete en la espalda
    c.getWorldQuaternion(_q);
    const cur = _v.set(0, -1, 0).applyQuaternion(_q);
    const back = _v2.copy(this.fwd).negate();
    const want = _v3.set(0, -1, 0).addScaledVector(back, 0.35).normalize();
    aim(c, cur, want, 0.85);
  }

  // Manos y pies: cada uno plantado en un punto de la piel; se suelta y va
  // al siguiente cuando el cuerpo se aleja (de uno en uno).
  _limbs(dt, snap) {
    const S = this.surf;
    const g = this.g;
    const N = this.N;
    const Xb = _v.set(1, 0, 0).applyQuaternion(this.quat); // izquierda del jugador
    const Yb = this.bodyUp;
    const now = g.time;
    const lead = this.moving > 0.15 ? 0.16 : 0;
    // manos
    for (const L of this.hands) {
      // la derecha, apuñalando, va por libre
      if (L.side < 0 && this.act) {
        L.w = 0;
        continue;
      }
      const ideal = _v2.copy(this.P).addScaledVector(Xb, L.side * HAND_W).addScaledVector(this.moveDir, lead).addScaledVector(Yb, 0.04);
      this._limb(L, ideal, N, S, dt, snap, STEP_HAND, 0.2, now);
      L.w = 1;
    }
    // pies: en la piel si llega (pared), si no, cuelgan
    const hip = this.H;
    for (const L of this.feet) {
      const ideal = _v2.copy(hip).addScaledVector(Yb, -0.86).addScaledVector(Xb, L.side * 0.14).addScaledVector(N, -0.3);
      if (!this.rope) {
        // ¿hay piel al alcance de la pierna?
        const reach = 0.55;
        const c = L.att && L.stepT < 0 ? null : S.closest(ideal, reach, { out: this._res2, prefN: N, turnK: 0.5 });
        if (L.att || c) this._limb(L, ideal, N, S, dt, snap, STEP_FOOT, 0.24, now, c);
        // (demasiado lejos de la cadera: se suelta y cuelga)
        if (L.att && L.W.distanceTo(_v3.copy(hip).addScaledVector(Xb, L.side * 0.1)) > 0.98) {
          L.att = null;
          L.stepT = -1;
        }
        L.w = damp(L.w, L.att ? 1 : 0, 10, dt || 0.016);
      } else {
        // en la cadena: los pies la abrazan por debajo de las manos
        L.att = null;
        this.rope.r.at(clamp(this.rope.s - 1.45 - (L.side > 0 ? 0 : 0.18), 0, this.rope.r.L), L.W, _v3);
        L.W.addScaledVector(this.N, 0.12);
        L.w = damp(L.w, 0.8, 10, dt || 0.016);
      }
    }
  }
  _limb(L, ideal, N, S, dt, snap, stepDist, stepDur, now, cand = null) {
    if (this.rope) {
      // en la cadena: las manos, una sobre otra
      const s = this.rope.s + (L.side > 0 ? 0.32 : 0);
      this.rope.r.at(clamp(s, 0, this.rope.r.L), L.W, _v3);
      L.W.addScaledVector(this.N, 0.06);
      L.N.copy(this.N);
      return;
    }
    if (L.att && L.stepT < 0) {
      S.eval(L.att, L.W, L.N);
      // ¿se ha quedado atrás? (y la otra no está a medio paso)
      const far = L.W.distanceTo(ideal);
      const other = (L.foot ? this.feet : this.hands).find((o) => o !== L);
      if (snap || far > stepDist * 2.6) {
        L.att = null;
      } else if (far > stepDist && other.stepT < 0 && now - this.lastStep > 0.06) {
        const c = S.closest(ideal, 0.6, { out: this._res2, prefN: N, turnK: 0.5 });
        if (c) {
          L.from.copy(L.W);
          L.to = { k: c.k, tri: c.tri, b: c.b.slice(), side: c.side };
          L.stepT = 0;
          this.lastStep = now;
        }
      }
    }
    if (!L.att) {
      const c = cand || S.closest(ideal, 0.6, { out: this._res2, prefN: N, turnK: 0.5 });
      if (!c) {
        L.W.copy(ideal);
        L.N.copy(N);
        return;
      }
      L.att = { k: c.k, tri: c.tri, b: c.b.slice(), side: c.side };
      L.stepT = -1;
      S.eval(L.att, L.W, L.N);
      if (!snap) {
        // (aparece donde está: que no salte)
        L.from.copy(L.W);
      }
    }
    if (L.stepT >= 0) {
      L.stepT += (dt || 0) / stepDur;
      S.eval(L.to, _v3, _v4);
      const k = smooth01(L.stepT);
      L.W.copy(L.from).lerp(_v3, k).addScaledVector(N, Math.sin(Math.min(1, L.stepT) * Math.PI) * (L.foot ? 0.12 : 0.1));
      L.N.copy(_v4);
      if (L.stepT >= 1) {
        L.att = L.to;
        L.stepT = -1;
        // (el roce de la mano o del pie con la piel)
        if (!L.foot && Math.random() < 0.5) this.g.audio && this.g.audio.play('climb', L.W, { k: 0.25 });
      }
    }
  }
  _ikArms() {
    const p = this.g.player,
      J = p.rig.joints;
    const N = this.N;
    const Xb = _v.set(1, 0, 0).applyQuaternion(this.quat);
    const Yb = this.bodyUp || UP;
    for (const L of this.hands) {
      const S = L.side > 0 ? 'L' : 'R';
      const a = J['arm' + S],
        b = J['fore' + S],
        c = J['hand' + S];
      let target, w;
      if (L.side < 0 && this.act) {
        // la puñalada: el arma al revés, alzada y luego clavada
        target = this._stabHand(_v3);
        w = 1;
      } else {
        // la muñeca, un palmo antes de la piel (la palma la toca)
        target = _v3.copy(L.W).addScaledVector(L.N, 0.07).addScaledVector(Yb, -0.05);
        w = this.mode === 'stand' ? 0 : 1;
      }
      a.getWorldPosition(_v4);
      // el codo, hacia fuera y hacia abajo
      const pole = _v5.copy(_v4).addScaledVector(Xb, L.side * 0.55).addScaledVector(Yb, -0.35).addScaledVector(N, 0.3);
      ik2(a, b, c, target, pole, w);
      // la palma contra la piel, los dedos hacia arriba
      if (w > 0 && !(L.side < 0 && this.act)) {
        c.getWorldQuaternion(_q);
        const cur = _v4.set(0, -1, 0).applyQuaternion(_q);
        const want = _v5.copy(Yb).addScaledVector(L.N, -0.6).normalize();
        aim(c, cur, want, 0.8);
      }
    }
    // el arma
    const sw = J.sword;
    sw.visible = !!this.act && p.hasSword;
    if (this.act) {
      // la hoja, hacia la piel (sale por debajo del puño)
      sw.getWorldQuaternion(_q);
      const cur = _v4.set(0, 0, 1).applyQuaternion(_q);
      aim(sw, cur, _v5.copy(this.N).negate().addScaledVector(Yb, -0.2).normalize());
    }
  }
  // dónde va la mano del arma al cargar y al clavar
  _stabHand(out) {
    const Yb = this.bodyUp || UP;
    const Xb = _v4.set(1, 0, 0).applyQuaternion(this.quat);
    const base = out.copy(this.P).addScaledVector(Xb, -0.12);
    if (this.act === 'charge') {
      const k = smooth01(this.charge * 1.4);
      return base.addScaledVector(this.N, 0.35 + 0.45 * k).addScaledVector(Yb, 0.15 + 0.35 * k);
    }
    const t = this.actT;
    const k = t < 0.1 ? smooth01(t / 0.1) : t < 0.38 ? 1 : 1 - smooth01((t - 0.38) / 0.17);
    return base.addScaledVector(this.N, 0.8 - 0.62 * k).addScaledVector(Yb, 0.5 - 0.42 * k);
  }
  _ikLegs(dt) {
    const p = this.g.player,
      J = p.rig.joints;
    const Xb = _v.set(1, 0, 0).applyQuaternion(this.quat);
    for (const L of this.feet) {
      if (L.w < 0.01) continue;
      const S = L.side > 0 ? 'L' : 'R';
      const a = J['leg' + S],
        b = J['shin' + S],
        c = J['foot' + S];
      a.getWorldPosition(_v4);
      // la rodilla, hacia la piel y un poco abierta
      const pole = _v5.copy(_v4).addScaledVector(this.fwd, 0.6).addScaledVector(Xb, L.side * 0.2);
      const target = _v3.copy(L.W).addScaledVector(L.N, 0.06);
      ik2(a, b, c, target, pole, L.w);
    }
    void dt;
  }

  // ---------------------------------------------------------- la cámara
  // Detrás del jugador y fuera de la piel; si no se toca, vuelve sola a
  // mirar desde fuera hacia el coloso (el jugador delante, el cuerpo detrás).
  _camera(dt) {
    const g = this.g,
      cr = g.camRig,
      p = g.player;
    // (el foco, el pecho del jugador)
    this.camFocus.set(0, 1.25, 0).applyQuaternion(this.quat).add(p.body.pos);
    cr.focus = this.camFocus;
    const lk = g.input.look(0);
    this.noLookT = Math.abs(lk.x) + Math.abs(lk.y) > 0.002 ? 0 : this.noLookT + dt;
    if (this.noLookT > 0.9 && dt > 0) {
      const N = this._nsInit ? this.Ns : this.N;
      // desde fuera de la piel: la cámara del lado de la normal
      let want = Math.atan2(-N.x, -N.z);
      if (Math.hypot(N.x, N.z) < 0.35 && this.boss && this.boss.center) {
        // en lo alto (la joroba, los hombros): desde detrás del jugador
        want = Math.atan2(this.fwd.x, this.fwd.z);
      }
      let d = want - cr.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      cr.yaw += d * (1 - Math.exp(-dt * 1.2));
      const pw = this.mode === 'stand' ? 0.42 : 0.22;
      cr.pitch += (pw - cr.pitch) * (1 - Math.exp(-dt * 1.2));
    }
  }

  // las manos (para el sigilo al alcance)
  handPos(out) {
    return out.copy(this.P).addScaledVector(this.N, 0.15);
  }

  _stabHit() {
    const g = this.g;
    if (this.state !== 'on' || !this.boss) return;
    const hp = this.handPos(new THREE.Vector3());
    const tip = hp.clone().addScaledVector(this.N, -0.2);
    const sig = this.stabSig && this.boss.sigilNear(hp);
    const k = this.power || 0.34;
    if (sig) {
      this.boss.stab(sig.id, k, tip);
      g.hitstop = Math.max(g.hitstop, 0.1 + k * 0.12);
      g.camRig.shake(0.25 + k * 0.35);
      g.input.rumble(0.6 + k * 0.4, 0.8, 120 + k * 160);
    } else {
      this.boss.flesh && this.boss.flesh(k, tip);
      g.fx.blood.emit(tip.x, tip.y, tip.z, 8 + Math.round(k * 10), { speed: 3, up: 1 });
      g.audio && g.audio.play('hit', tip);
      g.hitstop = Math.max(g.hitstop, 0.05);
    }
    this.charge = 0;
  }

  // ---------------------------------------------------------- cayendo
  _falling(dt) {
    const g = this.g,
      p = g.player;
    this.fallT += dt;
    // (vivo, mientras cae: con la guardia se vuelve a agarrar)
    if (this.state === 'fall' && !p.dead && this.fallT > 0.18 && !p.body.grounded && g.input.down('block') && this.boss && this.boss.visible && this.surf) {
      const probe = _v.set(p.pos.x, p.pos.y + 1.7, p.pos.z);
      const c = this.surf.closest(probe, 1.1, { out: this._res });
      if (c && c.N.y < 0.8) {
        const from = p.pos.clone();
        this._begin();
        this.att = { k: c.k, tri: c.tri, b: c.b.slice(), side: c.side };
        this.state = 'on';
        this._eval();
        this._initBody(from);
        g.audio && g.audio.play('grab', p.pos);
        g.camRig.shake(0.2);
        this.boss.onClimb && this.boss.onClimb(true, this.zone);
        return;
      }
    }
    if (!p.body.grounded) return;
    const h = this.fallFrom - p.pos.y;
    if (this.state === 'dead') {
      // muerto: cae al suelo y se queda tendido
      this.state = 'off';
      p.anim.play(p.clips.death, { blend: 0.12, t0: 0.95 });
      g.audio && g.audio.play('land', p.pos, { v: 9 });
      g.fx.blood.emit(p.pos.x, p.pos.y + 0.2, p.pos.z, 14, { color: [0.36, 0.33, 0.29], speed: 2.5, life: 0.8, up: 1 });
      return;
    }
    this.state = 'off';
    if (p.dead) return;
    if (h > 4.5) {
      const dmg = Math.round((h - 4.5) * 7.5);
      p.hp -= dmg;
      p.lastHitT = g.time;
      g.hurtFlash = Math.max(g.hurtFlash, 0.7);
      g.camRig.shake(Math.min(0.7, 0.2 + h * 0.03));
      g.audio && g.audio.play('playerHurt', p.pos);
      if (p.hp <= 0) {
        p.die();
        p.anim.play(p.clips.death, { blend: 0.08, t0: 0.85 });
      } else {
        p.state = 'stagger';
        p.stT = 0;
        p.anim.play(p.clips.stagger, { blend: 0.05 });
      }
    } else if (p.anim.clip === PLAYER_CLIPS.cl_fall) p.anim.stop(0.2);
  }

  // ---------------------------------------------------------- avisos
  prompt() {
    if (this.state === 'on') {
      if (this.shakeWarn > 0 || this.shake > 0.2) return { kind: 'colossus', label: 'Aferrarse', glyph: 'block' };
      if (this.sig) return { kind: 'colossus', label: this.act === 'charge' ? 'Suelta para apuñalar' : 'Apuñalar (mantén)', glyph: 'light' };
      return null;
    }
    if (this.state === 'fall' && this.fallT > 0.18 && this.surf) return { kind: 'colossus', label: 'Agarrarse (guardia)', glyph: 'block' };
    if (this.state === 'off' && this.findGrab()) return { kind: 'colossus', label: 'Agarrarse', glyph: 'interact', grab: true };
    return undefined;
  }

  // ---------------------------------------------------------- pruebas
  // La entrada que lleva hacia un punto del mundo por la piel (para el robot
  // de las pruebas): { x, y } como el stick.
  steerTo(target) {
    if (this.state !== 'on') return { x: 0, y: 0 };
    const d = _v.subVectors(target, this.P);
    d.addScaledVector(this.N, -d.dot(this.N));
    if (d.lengthSq() < 0.01) return { x: 0, y: 0 };
    d.normalize();
    if (this.mode === 'stand') {
      const cam = this.g.camera;
      const cf = _v2.set(0, 0, -1).applyQuaternion(cam.quaternion);
      const cr = _v3.set(1, 0, 0).applyQuaternion(cam.quaternion);
      cf.addScaledVector(this.N, -cf.dot(this.N)).normalize();
      cr.addScaledVector(this.N, -cr.dot(this.N)).normalize();
      return { x: d.dot(cr), y: d.dot(cf) };
    }
    return { x: d.dot(this.Rt), y: d.dot(this.Ut) };
  }
}
