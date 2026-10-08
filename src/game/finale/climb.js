// Trepar a los colosos.
//
// Cada coloso trae sus caminos (extra.climb): puntos pegados a sus huesos
// (en el espacio del modelo, en reposo) con la normal hacia fuera. Aquí se
// convierten en rutas que siguen al cuerpo animado: el jugador se mueve a lo
// largo (s) y a lo ancho (u) de la ruta, colgado de cara a la superficie o,
// donde es casi horizontal (la joroba, los hombros), de pie.
//
//   agarrarse   interactuar junto a una ruta
//   moverse     el stick o WASD (adelante, hacia el sigilo; a los lados)
//   aguante     colgado se gasta; de pie (o en un sitio de descanso) se recupera
//   aferrarse   mantener la guardia: cuando se sacude, si no te aferras te tira
//   apuñalar    mantener el ataque para cargar y soltarlo; en un sigilo hiere
//   soltarse    la esquiva (te dejas caer de espaldas)
//   caer        desde alto hace daño según la altura
//
// El jugador va como marioneta (player.puppet): esta clase le pone la
// posición, el giro y las animaciones de trepar.
import * as THREE from 'three';
import { clip } from '../../entities/rig.js';
import { clamp, damp } from '../../core/util.js';

const _v = new THREE.Vector3(),
  _v2 = new THREE.Vector3(),
  _v3 = new THREE.Vector3(),
  _q = new THREE.Quaternion(),
  _m = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);

// ============================================================ animaciones del jugador
// (de cara a la superficie: +z va hacia ella; ángulos como en el resto del
// jugador: -X alza los brazos y adelanta las piernas)
const HANG = {
  root: [0, 0, 0],
  hips: [6, 0, 0],
  chest: [10, 0, 0],
  head: [-20, 0, 0],
  armL: [-150, 0, 22],
  foreL: [-48, 0, 0],
  handL: [12, 0, 0],
  armR: [-150, 0, -22],
  foreR: [-48, 0, 0],
  handR: [12, 0, 0],
  legL: [-48, 0, 10],
  shinL: [70, 0, 0],
  footL: [-12, 0, 0],
  legR: [-28, 0, -10],
  shinR: [54, 0, 0],
  footR: [-8, 0, 0],
};
const K = (t, o = {}, ease) => [t, { ...HANG, ...o }, ease];
const mir = (o) => {
  const out = {};
  for (const [j, v] of Object.entries(o)) {
    const n = j.endsWith('L') ? j.slice(0, -1) + 'R' : j.endsWith('R') ? j.slice(0, -1) + 'L' : j;
    out[n] = j === 'root' ? [-v[0], v[1], v[2]] : [v[0], -v[1], -v[2]];
  }
  return out;
};
// la estocada: el arma al revés (la hoja sale por debajo del puño) y en alto
const SWORD_REV = [180, 0, 0];
export const PLAYER_CLIPS = {};
{
  const C = PLAYER_CLIPS;
  C.cl_hang = clip(
    'cl_hang',
    2.6,
    [K(0), K(1.3, { chest: [12, 2, 0], head: [-16, 4, 0], foreL: [-52, 0, 0], foreR: [-44, 0, 0], legL: [-44, 0, 10], legR: [-32, 0, -10], root: [0, -2, 0] }), K(2.6)],
    { loop: true, ground: false }
  );
  // trepar hacia arriba: una mano sube mientras la pierna contraria empuja
  const upA = { armL: [-172, 0, 16], foreL: [-18, 0, 0], armR: [-118, 0, -24], foreR: [-86, 0, 0], legL: [-24, 0, 8], shinL: [36, 0, 0], legR: [-74, 0, -12], shinR: [98, 0, 0], hips: [8, 6, 0], chest: [12, -4, 0], head: [-24, -6, 0], root: [0, -4, 0] };
  C.cl_up = clip('cl_up', 1.2, [K(0, upA), K(0.6, mir(upA)), K(1.2, upA)], { loop: true, ground: false });
  // de lado: brazos y piernas se abren y se juntan
  const sideA = { armL: [-150, 0, 40], foreL: [-30, 0, 0], armR: [-150, 0, -8], foreR: [-62, 0, 0], legL: [-40, 0, 28], shinL: [62, 0, 0], legR: [-34, 0, -2], shinR: [60, 0, 0], hips: [6, 0, -4] };
  const sideB = { armL: [-150, 0, 12], foreL: [-60, 0, 0], armR: [-150, 0, -36], foreR: [-34, 0, 0], legL: [-42, 0, 4], shinL: [66, 0, 0], legR: [-32, 0, -24], shinR: [58, 0, 0], hips: [6, 0, 4] };
  C.cl_side = clip('cl_side', 1.3, [K(0, sideA), K(0.65, sideB), K(1.3, sideA)], { loop: true, ground: false });
  // aferrado: pegado al cuerpo, la cabeza metida, todo encogido
  const grip = { chest: [24, 0, 0], head: [16, 0, 0], hips: [16, 0, 0], armL: [-128, 0, 12], foreL: [-96, 0, 0], handL: [24, 0, 0], armR: [-128, 0, -12], foreR: [-96, 0, 0], handR: [24, 0, 0], legL: [-74, 0, 16], shinL: [104, 0, 0], legR: [-66, 0, -16], shinR: [98, 0, 0] };
  C.cl_grip = clip('cl_grip', 0.5, [K(0, grip), K(0.25, { ...grip, chest: [26, 3, 0], head: [18, -4, 0] }), K(0.5, grip)], { loop: true, ground: false });
  // de pie encima (la joroba, los hombros): agachado, haciendo equilibrio
  const stand = { root: [0, -22, 0], hips: [8, 0, 0], chest: [24, 0, 0], head: [-14, 0, 0], armL: [-34, 0, 46], foreL: [-30, 0, 0], handL: [0, 0, 0], armR: [-34, 0, -46], foreR: [-30, 0, 0], handR: [0, 0, 0], legL: [-46, 0, 14], shinL: [76, 0, 0], footL: [-24, 0, 0], legR: [-40, 0, -14], shinR: [70, 0, 0], footR: [-22, 0, 0] };
  C.cl_stand = clip('cl_stand', 2.2, [K(0, stand), K(1.1, { ...stand, armL: [-30, 0, 52], armR: [-38, 0, -40], chest: [22, 3, 2] }), K(2.2, stand)], { loop: true, ground: false });
  const stepA = { ...stand, legL: [-62, 0, 12], shinL: [84, 0, 0], legR: [-18, 0, -12], shinR: [58, 0, 0], root: [0, -18, 0], armL: [-24, 0, 50], armR: [-44, 0, -42] };
  C.cl_walk = clip('cl_walk', 1.0, [K(0, stepA), K(0.5, mir(stepA)), K(1.0, stepA)], { loop: true, ground: false });
  // la puñalada: se agarra con la izquierda, alza el arma y la clava
  const charge = { chest: [-12, 0, 0], head: [-14, 0, 0], armL: [-150, 0, 18], foreL: [-56, 0, 0], armR: [-176, 0, -14], foreR: [-26, 0, 0], handR: [-12, 0, 0], sword: SWORD_REV, legL: [-44, 0, 10], shinL: [72, 0, 0], legR: [-34, 0, -10], shinR: [60, 0, 0] };
  C.cl_charge = clip('cl_charge', 1.2, [K(0, { ...charge, armR: [-150, 0, -20], foreR: [-50, 0, 0] }), K(0.35, charge, 'out'), K(0.8, { ...charge, chest: [-14, 2, 0], armR: [-178, 0, -12] }), K(1.2, charge)], { loop: true, ground: false });
  const thrust = { chest: [26, 0, 0], head: [8, 0, 0], armL: [-148, 0, 18], foreL: [-60, 0, 0], armR: [-74, 0, -10], foreR: [-8, 0, 0], handR: [6, 0, 0], sword: SWORD_REV, hips: [12, 0, 0], legL: [-56, 0, 10], shinL: [84, 0, 0], legR: [-40, 0, -10], shinR: [66, 0, 0] };
  C.cl_stab = clip('cl_stab', 0.62, [K(0, charge), K(0.12, thrust, 'snap'), K(0.36, { ...thrust, chest: [24, 0, 0], armR: [-78, 0, -10] }), K(0.62, { ...HANG, sword: SWORD_REV })], { ground: false, events: [{ t: 0.12, name: 'stab' }] });
  // cae dando manotazos
  const fall = { root: [0, 0, 0], hips: [-12, 0, 0], chest: [-20, 0, 0], head: [-30, 0, 0], armL: [-150, 0, 60], foreL: [-30, 0, 0], armR: [-140, 0, -70], foreR: [-40, 0, 0], legL: [-40, 0, 10], shinL: [60, 0, 0], legR: [-10, 0, -10], shinR: [50, 0, 0] };
  C.cl_fall = clip('cl_fall', 0.8, [K(0, fall), K(0.4, { ...fall, armL: [-130, 0, 80], armR: [-160, 0, -50], legL: [-20, 0, 10], legR: [-44, 0, -10] }), K(0.8, fall)], { loop: true, ground: false });
}

// ============================================================ rutas
// Ruta pegada a los huesos de un modelo (ColossusModel).
export class ClimbRoute {
  constructor(id, def, M, owner) {
    this.id = id;
    this.def = def;
    this.M = M;
    this.owner = owner;
    this.width = def.width ?? 1;
    this.next = def.next || {};
    this.sigil = def.sigil || null;
    this.kneel = !!def.kneel;
    this.pts = def.pts.map((pt) => {
      const rw = M.restWorld[pt.bone];
      return {
        b: M.byName[pt.bone],
        off: new THREE.Vector3(pt.p[0] - rw.x, pt.p[1] - rw.y, pt.p[2] - rw.z),
        rp: new THREE.Vector3(...pt.p),
        n: new THREE.Vector3(...pt.n).normalize(),
        rest: !!pt.rest,
        P: new THREE.Vector3(),
        N: new THREE.Vector3(),
      };
    });
    this.cum = [0];
    for (let i = 1; i < this.pts.length; i++) this.cum.push(this.cum[i - 1] + this.pts[i].rp.distanceTo(this.pts[i - 1].rp));
    this.L = this.cum[this.cum.length - 1];
    this.on = true;
    this._t = -1;
  }
  // posiciones y normales del cuerpo tal y como está ahora
  eval(frame) {
    if (frame !== undefined && frame === this._t) return;
    this._t = frame;
    for (const pt of this.pts) {
      pt.P.copy(pt.off).applyMatrix4(pt.b.matrixWorld);
      pt.b.getWorldQuaternion(_q);
      pt.N.copy(pt.n).applyQuaternion(_q);
    }
  }
  _seg(s) {
    const c = this.cum;
    let i = 0;
    while (i < c.length - 2 && c[i + 1] < s) i++;
    const D = c[i + 1] - c[i] || 1e-6;
    return [i, clamp((s - c[i]) / D, 0, 1)];
  }
  // punto (P), dirección a lo largo (T), normal (N) y si es sitio de descanso
  sample(s, P, T, N) {
    const [i, u] = this._seg(clamp(s, 0, this.L));
    const a = this.pts[i],
      b = this.pts[i + 1];
    P.lerpVectors(a.P, b.P, u);
    T.subVectors(b.P, a.P).normalize();
    N.lerpVectors(a.N, b.N, u);
    // la normal, perpendicular a la ruta
    N.addScaledVector(T, -N.dot(T)).normalize();
    return u < 0.5 ? a.rest : b.rest;
  }
  // el punto de la ruta más cercano a p: { s, u (de lado), d }
  nearest(p) {
    let best = { s: 0, u: 0, d: 1e9 };
    for (let i = 0; i < this.pts.length - 1; i++) {
      const a = this.pts[i].P,
        b = this.pts[i + 1].P;
      _v.subVectors(b, a);
      const L2 = _v.lengthSq() || 1e-6;
      const t = clamp(_v2.subVectors(p, a).dot(_v) / L2, 0, 1);
      _v2.copy(a).addScaledVector(_v, t);
      _v3.subVectors(p, _v2);
      // (a lo ancho cuenta poco: la ruta tiene anchura)
      const n = this.pts[i].N;
      const side = _v.clone().normalize().cross(n);
      const u = clamp(_v3.dot(side), -this.width / 2, this.width / 2);
      const d = _v3.addScaledVector(side, -u).length();
      if (d < best.d) best = { s: this.cum[i] + t * (this.cum[i + 1] - this.cum[i]), u, d };
    }
    return best;
  }
}

// La cadena de la campana como ruta (de la campana, s = 0, a la mano).
export class ChainRoute {
  constructor(id, chain, o = {}) {
    this.id = id;
    this.chain = chain;
    this.width = 0;
    this.next = {};
    this.sigil = o.sigil || null;
    this.L = chain.len;
    this.on = false;
    this.side = new THREE.Vector3(1, 0, 0);
  }
  eval() {}
  sample(s, P, T, N) {
    this.chain.at(s, P, T);
    // la normal: hacia donde está el jugador (alrededor de la cadena)
    N.copy(this.side).addScaledVector(T, -this.side.dot(T));
    if (N.lengthSq() < 1e-4) N.copy(UP).cross(T);
    N.normalize();
    return false;
  }
  nearest(p) {
    const r = this.chain.nearest(p);
    this.chain.at(r.s, _v, _v2);
    this.side.subVectors(p, _v).normalize();
    return { s: r.s, u: 0, d: r.d };
  }
}

// ============================================================ trepar
export class Climb {
  constructor(game) {
    this.g = game;
    this.state = 'off'; // 'off' | 'on' | 'fall'
    this.route = null;
    this.s = 0;
    this.u = 0;
    this.mode = 'hang';
    this.boss = null;
    this.shake = 0; // lo pone el coloso (0..1)
    this.shakeWarn = 0;
    this.slip = 0;
    this.charge = 0;
    this.act = null; // 'charge' | 'stab'
    this.actT = 0;
    this.grip = false;
    this.offset = new THREE.Vector3(); // fundido al cambiar de ruta
    this.quat = new THREE.Quaternion();
    this.fwd = new THREE.Vector3(0, 0, 1);
    this.P = new THREE.Vector3();
    this.T = new THREE.Vector3();
    this.N = new THREE.Vector3();
    this.cand = null;
    this.frame = 0;
    this.noLookT = 0;
  }
  get active() {
    return this.state === 'on';
  }
  // ---------------------------------------------------------- agarrarse
  // ¿hay una ruta a mano? (para el aviso «Agarrarse»)
  findGrab() {
    const p = this.g.player;
    this.cand = null;
    if (this.state !== 'off' || !this.boss || p.dead || p.state !== 'free' || !p.body.grounded) return null;
    const chest = (this._chest = this._chest || new THREE.Vector3()).set(p.pos.x, p.pos.y + 1.2, p.pos.z);
    let best = null;
    for (const r of this.boss.routes()) {
      if (!r.on) continue;
      r.eval(this.frame);
      const n = r.nearest(chest);
      if (n.d > 2.3) continue;
      r.sample(n.s, _v, _v2, this.N);
      const h = _v.y - p.pos.y;
      if (h < -0.4 || h > 3.1) continue;
      if (!best || n.d < best.d) best = { r, ...n };
    }
    this.cand = best;
    return best;
  }
  grab(c = this.cand) {
    if (!c) return false;
    const p = this.g.player;
    this.state = 'on';
    this.route = c.r;
    this.s = c.s;
    this.u = c.u;
    this.slip = 0;
    this.charge = 0;
    this.act = null;
    this.grip = false;
    this.offset.set(0, 0, 0);
    p.puppet = true;
    p.state = 'free';
    p.blocking = false;
    p.anim.stop(0);
    p.body.grounded = false;
    this._gear(false);
    // (desde donde estaba: el cuerpo llega a la ruta en un momento)
    const from = p.pos.clone();
    this._pose(0, true);
    this.offset.copy(from).sub(this.root);
    p.body.pos.copy(from);
    p.obj.position.copy(from);
    this._play('cl_hang', 0.15);
    this.g.audio && this.g.audio.play('grab', p.pos);
    this.g.lockTarget = null;
    // la cámara, detrás del jugador mirando hacia el coloso
    if (this.boss.center) {
      const c = this.boss.center(_v);
      this.g.camRig.recenter(Math.atan2(c.x - p.pos.x, c.z - p.pos.z));
    }
    this.boss.onClimb && this.boss.onClimb(true, this.route);
    return true;
  }
  // soltarse: v (mundo) es la velocidad con la que sale despedido
  release(v = null, soft = false) {
    if (this.state !== 'on') return;
    const p = this.g.player;
    this.state = soft ? 'off' : 'fall';
    this.fallFrom = p.pos.y;
    p.puppet = false;
    p.state = 'free';
    p.anim.stop(0.25);
    p.body.vy = v ? v.y : 0;
    p.vx = v ? v.x : 0;
    p.vz = v ? v.z : 0;
    const f = this.fwd;
    if (Math.hypot(f.x, f.z) > 0.1) p.yaw = Math.atan2(f.x, f.z);
    p.obj.quaternion.setFromAxisAngle(UP, p.yaw);
    this._gear(true);
    if (!soft) this._play('cl_fall', 0.1);
    const r = this.route;
    this.route = null;
    this.boss && this.boss.onClimb && this.boss.onClimb(false, r);
  }
  // el coloso se ha ido (muere, se reinicia): suelta sin más
  reset() {
    const p = this.g.player;
    if (this.state === 'on') {
      p.puppet = false;
      p.state = 'free';
      p.anim.stop(0);
      this._gear(true);
    }
    this.state = 'off';
    this.route = null;
    this.cand = null;
    this.shake = this.shakeWarn = 0;
  }
  _gear(on) {
    const p = this.g.player;
    if (on) p.updateGear();
    else {
      p.rig.joints.sword.visible = false;
      p.rig.joints.shield.visible = false;
      p.shieldBack.group.visible = false;
    }
  }
  _play(name, blend = 0.2, speed = 1) {
    const p = this.g.player;
    const c = PLAYER_CLIPS[name];
    if (this._clip !== name || p.anim.clip !== c) {
      p.anim.play(c, { blend, speed });
      this._clip = name;
    }
    p.anim.speed = speed;
  }

  // ---------------------------------------------------------- cada fotograma
  update(dt) {
    this.frame++;
    const g = this.g,
      p = g.player;
    if (this.state === 'fall') {
      // en el aire hasta tocar el suelo: daño según la altura
      if (p.body.grounded || p.dead) {
        const h = this.fallFrom - p.pos.y;
        this.state = 'off';
        if (!p.dead && h > 4.5) {
          const dmg = Math.round((h - 4.5) * 7.5);
          p.hp -= dmg;
          p.lastHitT = g.time;
          g.hurtFlash = Math.max(g.hurtFlash, 0.7);
          g.camRig.shake(Math.min(0.7, 0.2 + h * 0.03));
          g.audio && g.audio.play('playerHurt', p.pos);
          if (p.hp <= 0) p.die();
          else {
            p.state = 'stagger';
            p.stT = 0;
            p.anim.play(p.clips.stagger, { blend: 0.05 });
          }
        }
      }
      return;
    }
    if (this.state !== 'on') return;
    if (p.dead || !this.boss) {
      this.release();
      return;
    }
    const r = this.route;
    if (!r.on) {
      // (la ruta ya no vale: la mano se levanta, la cadena se suelta)
      this.release(_v.copy(this.N).multiplyScalar(3).add(UP));
      return;
    }
    const inp = g.input;
    const allow = g.state === 'play' && !g.ui.modal && !g.cine;
    // agarre firme y aguante
    this.grip = allow && inp.down('block');
    this.shakeWarn = Math.max(0, this.shakeWarn - dt);
    // soltarse
    if (allow && inp.pressed('dodge') && !this.act) {
      this.release(_v.copy(this.N).multiplyScalar(3.2).addScaledVector(UP, 2.4));
      return;
    }
    // apuñalar (mantener el ataque, soltar)
    const sig = this.boss.sigilNear ? this.boss.sigilNear(this.handPos(_v2)) : null;
    if (this.act === 'stab') {
      // la hoja entra a los 0,12 s del golpe (al ritmo del juego, no del reloj)
      const t0 = this.actT;
      this.actT += dt;
      if (t0 < 0.12 && this.actT >= 0.12) this._stabHit();
      if (this.actT >= 0.62) this.act = null;
    } else if (allow && p.hasSword && inp.down('light') && !this.grip) {
      if (this.act !== 'charge') {
        this.act = 'charge';
        this.charge = 0;
      }
      this.charge = Math.min(1, this.charge + dt / 1.1);
    } else if (this.act === 'charge') {
      // suelta: la puñalada (más fuerte cuanto más cargada)
      this.act = 'stab';
      this.actT = 0;
      this.power = 0.34 + 0.66 * this.charge;
      this.stabSig = sig;
      this._play('cl_stab', 0.05);
      p.rig.joints.sword.visible = true;
      p.useSt(6);
    }
    // movimiento
    const mv = allow && !this.grip && !this.act ? inp.move() : { x: 0, y: 0 };
    const mag = Math.min(1, Math.hypot(mv.x, mv.y));
    r.eval(this.frame);
    const rest = r.sample(this.s, this.P, this.T, this.N);
    const stand = this.N.y > 0.72;
    this.mode = stand ? 'stand' : 'hang';
    let ds = 0,
      du = 0;
    if (mag > 0.12) {
      // adelante (W, stick arriba) siempre hacia el sigilo: las rutas van de
      // donde se agarra a donde se apuñala (cola → espalda → nuca, dedos →
      // hombro, campana → mano); a los lados, según la cámara
      const cam = g.camera;
      const cr = _v.set(1, 0, 0).applyQuaternion(cam.quaternion);
      const side = _v2.copy(this.T).cross(this.N).normalize();
      ds = mv.y;
      du = r.width > 0 ? mv.x * (side.dot(cr) >= 0 ? 1 : -1) : 0;
      const k = Math.hypot(ds, du);
      if (k > 1) {
        ds /= k;
        du /= k;
      }
    }
    const spd = stand ? 2.3 : 1.45;
    this.s += ds * spd * dt;
    this.u = clamp(this.u + du * (stand ? 2.0 : 1.0) * dt, -r.width / 2, r.width / 2);
    // los extremos: pasar a la ruta de al lado o bajarse al suelo
    if (this.s > r.L) {
      if (r.next.end) this._transfer(r.next.end);
      else this.s = r.L;
    } else if (this.s < 0) {
      if (r.next.start) this._transfer(r.next.start);
      else {
        this.s = 0;
        r.sample(0, _v, _v2, _v3);
        const gy = g.world.col.groundHeight(_v.x, _v.z, 0.3, _v.y + 1);
        if (_v.y - gy < 2.2 && ds < -0.3) {
          // al pie de la ruta: se baja al suelo
          this.release(null, true);
          p.body.pos.y = gy;
          p.body.grounded = true;
          return;
        }
      }
    }
    // aguante
    const moving = Math.abs(ds) + Math.abs(du) > 0.15;
    let dst = stand || rest ? -30 : moving ? 8 : 5;
    if (this.grip) dst = 14;
    if (this.act === 'charge') dst = 7;
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
      this.release(_v.copy(this.N).multiplyScalar(1.5));
      return;
    }
    // sacudidas: si no te aferras, te tira
    if (this.shake > 0.25 && !this.grip) {
      this.slip += this.shake * dt * (stand ? 2.4 : 1.7);
      if (this.slip >= 1) {
        g.ui.toast('Te ha sacudido de encima.', 2.5);
        this.release(_v.copy(this.N).multiplyScalar(6 + this.shake * 5).addScaledVector(UP, 4));
        return;
      }
    } else this.slip = Math.max(0, this.slip - dt * 0.8);
    // animación
    if (this.act === 'charge') this._play('cl_charge', 0.15);
    else if (this.act === 'stab') {
      /* (la puñalada ya suena) */
    } else if (this.grip || (this.shake > 0.25 && !stand)) this._play('cl_grip', 0.12);
    else if (stand) this._play(moving ? 'cl_walk' : 'cl_stand', 0.25, moving ? 1.1 : 1);
    else if (moving) this._play(Math.abs(ds) >= Math.abs(du) ? 'cl_up' : 'cl_side', 0.2, (ds < -0.1 ? -1 : 1) * clamp(Math.hypot(ds, du) * 1.15, 0.5, 1.2));
    else this._play('cl_hang', 0.3);
    if (this.act !== 'stab' && this.act !== 'charge') p.rig.joints.sword.visible = false;
    else p.rig.joints.sword.visible = true;
    // sacudida visible en el propio jugador
    if (this.shake > 0.05) g.camRig.shake(this.shake * dt * 1.5);
    // la cámara vuelve sola detrás del jugador si no se toca
    const lk = inp.look(dt);
    this.noLookT = Math.abs(lk.x) + Math.abs(lk.y) > 0.002 ? 0 : this.noLookT + dt;
    this._pose(dt, false, ds, du);
  }

  _transfer(id) {
    const r2 = this.boss.routes().find((r) => r.id === id);
    if (!r2 || !r2.on) {
      this.s = clamp(this.s, 0, this.route.L);
      return;
    }
    const old = this.root.clone();
    r2.eval(this.frame);
    const n = r2.nearest(this.P);
    this.route = r2;
    this.s = clamp(n.s, 0.05, r2.L - 0.05);
    this.u = clamp(n.u, -r2.width / 2, r2.width / 2);
    this._pose(0, true);
    this.offset.copy(old).sub(this.root);
  }

  // dónde va el jugador (raíz en los pies) y hacia dónde mira
  _pose(dt, snap, ds = 0) {
    const g = this.g,
      p = g.player,
      r = this.route;
    r.eval(this.frame);
    r.sample(this.s, this.P, this.T, this.N);
    const side = _v.copy(this.T).cross(this.N).normalize();
    const at = _v2.copy(this.P).addScaledVector(side, this.u);
    const stand = this.N.y > 0.72;
    // arriba del jugador: colgado, la vertical proyectada en la superficie;
    // de pie, casi la vertical del mundo
    const up = _v3;
    if (stand) up.copy(UP).lerp(this.N, 0.3).normalize();
    else {
      up.copy(UP).addScaledVector(this.N, -UP.dot(this.N));
      if (up.lengthSq() < 0.05) up.copy(this.T).multiplyScalar(this.T.y >= 0 ? 1 : -1);
      up.normalize();
    }
    let fwd;
    if (stand) {
      // de pie: mirando hacia donde anda (o como estaba)
      const mvd = _v.copy(this.T).multiplyScalar(Math.sign(ds) || 0);
      if (Math.abs(ds) > 0.1) this.fwd.lerp(mvd.setY(0).normalize(), 1 - Math.exp(-(dt || 1) * 8));
      fwd = this.fwd.clone().addScaledVector(up, -this.fwd.dot(up));
      if (fwd.lengthSq() < 1e-3) fwd.copy(this.T);
      fwd.normalize();
    } else fwd = this.N.clone().negate().addScaledVector(up, this.N.dot(up)).normalize();
    this.fwd.copy(fwd);
    const x = new THREE.Vector3().crossVectors(up, fwd).normalize();
    const y = new THREE.Vector3().crossVectors(fwd, x).normalize();
    _m.makeBasis(x, y, fwd);
    const qT = new THREE.Quaternion().setFromRotationMatrix(_m);
    if (snap) this.quat.copy(qT);
    else this.quat.slerp(qT, 1 - Math.exp(-dt * 12));
    // la raíz (los pies): colgado, el pecho contra la superficie
    const root = (this.root = this.root || new THREE.Vector3());
    if (stand) root.copy(at).addScaledVector(this.N, 0.06);
    else root.copy(at).addScaledVector(this.N, 0.42).addScaledVector(y, -1.22);
    if (!snap) this.offset.multiplyScalar(Math.exp(-dt * 7));
    const fx = root.x + this.offset.x,
      fy = root.y + this.offset.y,
      fz = root.z + this.offset.z;
    p.body.pos.set(fx, fy, fz);
    p.visY = fy;
    p.vx = p.vz = 0;
    p.body.vy = 0;
    p.yaw = Math.atan2(fwd.x, fwd.z);
    p.obj.position.set(fx, fy, fz);
    p.obj.quaternion.copy(this.quat);
    p.obj.updateMatrixWorld(true);
    // cámara: si no se toca, vuelve a mirar desde fuera hacia el coloso (con
    // el jugador delante y el cuerpo detrás: nunca entre la fachada y él)
    if (!snap && this.noLookT > 1.0 && this.boss && this.boss.center) {
      const c = this.boss.center(_v);
      const want = Math.atan2(c.x - fx, c.z - fz);
      const cr = g.camRig;
      let d = want - cr.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      cr.yaw += d * (1 - Math.exp(-dt * 1.4));
      cr.pitch += (0.32 - cr.pitch) * (1 - Math.exp(-dt * 1.4));
    }
  }

  // las manos (para el sigilo al alcance)
  handPos(out) {
    const p = this.g.player;
    return out.set(0, 1.75, 0.25).applyQuaternion(this.quat).add(p.body.pos);
  }

  _stabHit() {
    const g = this.g,
      p = g.player;
    if (this.state !== 'on' || !this.boss) return;
    const hp = this.handPos(new THREE.Vector3());
    const tip = hp.clone().add(_v.set(0, -0.2, 0.7).applyQuaternion(this.quat));
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

  // el aviso que toca (agarrarse, apuñalar, aferrarse)
  prompt() {
    if (this.state === 'on') {
      if (this.shakeWarn > 0 || this.shake > 0.2) return { kind: 'colossus', label: 'Aferrarse', glyph: 'block' };
      if (this.boss && this.boss.sigilNear && this.boss.sigilNear(this.handPos(_v))) return { kind: 'colossus', label: this.act === 'charge' ? 'Suelta para apuñalar' : 'Apuñalar (mantén)', glyph: 'light' };
      return null;
    }
    if (this.state === 'off' && this.findGrab()) return { kind: 'colossus', label: 'Agarrarse', glyph: 'interact', grab: true };
    return undefined;
  }
}
