// El Descoyuntado: cuerpo procedural e IA de acecho.
//
// CUERPO. Nada de ciclos de marcha enlatados: cada mano y cada pie se plantan
// de verdad en el suelo (o en el techo, boca abajo) y sólo se despegan cuando
// el cuerpo se ha alejado demasiado de ellos; entonces dan un paso en arco
// hasta donde el cuerpo va a estar. Los brazos y las piernas se resuelven con
// cinemática inversa de dos huesos con el codo y la rodilla por encima del
// cuerpo, como una araña. El tronco tiene inercia (se inclina al acelerar y al
// girar, se hunde al apoyar), la cabeza del revés sigue al jugador (y a veces
// se tuerce sola) y la mandíbula mastica y grita. Los ataques mueven manos y
// cuerpo hacia puntos reales del mundo (donde estás tú, el pilar que agarra).
//
// IA. Es su casa: siempre sabe dónde estás. No te persigue: te caza.
//   acecho   se mueve por el techo y por las madrigueras de los muros hasta
//            puntos oscuros desde los que te observa, lejos del farol y fuera
//            de tu vista; si le miras mientras se mueve, se queda quieto.
//   asomarse a veces se deja ver a lo lejos, a propósito, y se esfuma.
//   burla    huesos que crujen, pasos que no son tuyos, la voz del ama que te
//            llama, algo que corre por dentro de las paredes, un hueso que te
//            tiran desde la oscuridad.
//   emboscada cuando tiene hambre y tú estás de espaldas, curándote, leyendo,
//            sin aliento o en un pasillo: cae del techo detrás de ti, salta
//            desde la oscuridad o te agarra por la espalda.
//   pelea    rodea, amaga, castiga lo que repites (aprende qué golpes le
//            esquivas y cuáles te alcanzan), arranca el pilar tras el que te
//            escudas y se retira herido para volver cuando menos lo esperes.
//   furia    con poca vida deja de esconderse.
import * as THREE from 'three';
import { clamp, damp, lerp, angleDiff, approachAngle, DEG } from '../core/util.js';
import { e2q, q2e, Spring } from './rig.js';
import { moveBody } from '../world/collision.js';
import { DESC } from './enemy_models.js';
import { CELLAR, cellarCeil } from '../world/level_cellar.js';

const V3 = THREE.Vector3;
const _a = new V3(),
  _b = new V3(),
  _c = new V3(),
  _d = new V3(),
  _e = new V3(),
  _f = new V3(),
  _t = new V3(),
  _o = new V3(),
  _p = new V3();
const _m = new THREE.Matrix4(),
  _inv = new THREE.Matrix4();
const _qa = new THREE.Quaternion(),
  _qb = new THREE.Quaternion(),
  _qc = new THREE.Quaternion();
const AX = new V3(1, 0, 0),
  AY = new V3(0, 1, 0),
  AZ = new V3(0, 0, 1);
const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const seg = (t, a, b) => sm((t - a) / (b - a));
const rnd = (a, b) => a + Math.random() * (b - a);
const approach = (v, to, step) => (v < to ? Math.min(to, v + step) : Math.max(to, v - step));

// Miembros: [nombre, lado (+1 izq.), delantero, hombro/cadera (espacio del
// tronco), brazo, antebrazo, apoyo de reposo (x, z) en el plano de apoyo]
const LIMBS = [
  ['lf', 1, true, [0.27, 0.04, 0.44], DESC.LAf, DESC.LBf, [1.12, 1.3]],
  ['rf', -1, true, [-0.27, 0.04, 0.44], DESC.LAf, DESC.LBf, [-1.12, 1.3]],
  ['lb', 1, false, [0.23, 0.04, -0.48], DESC.LAb, DESC.LBb, [1.02, -1.22]],
  ['rb', -1, false, [-0.23, 0.04, -0.48], DESC.LAb, DESC.LBb, [-1.02, -1.22]],
];

// Ataques: alcance, arco (grados), daño y duración.
const ATK = {
  claw: { dur: 1.25, range: 2.9, arc: 85, dmg: 18, near: true },
  claw2: { dur: 1.75, range: 2.8, arc: 110, dmg: 15, near: true },
  pounce: { dur: 1.85, range: 2.2, arc: 110, dmg: 26, stagger: true, knock: 7 },
  grab: { dur: 1.35, range: 2.0, arc: 70, dmg: 0, unblockable: true },
  rip: { dur: 1.7, range: 3.2, arc: 120, dmg: 20, stagger: true, knock: 6 },
  crack: { dur: 1.9, dmg: 16 },
  throw: { dur: 1.2, dmg: 9 },
  drop: { dur: 1.3, range: 2.6, arc: 360, dmg: 28, stagger: true, knock: 6 },
};

export class Desc {
  constructor(e) {
    this.e = e;
    this.g = e.game;
    this.L = LIMBS.map(([n, side, front, sh, a, b, home]) => ({
      n,
      side,
      front,
      grp: n === 'lf' || n === 'rb' ? 0 : 1,
      sh: new V3(...sh),
      a,
      b,
      home: new V3(home[0], 0, home[1]),
      foot: new V3(),
      from: new V3(),
      to: new V3(),
      step: -1,
      dur: 0.3,
      ov: new V3(),
      ovW: 0,
      ovTo: 0,
      idleT: 0,
    }));
    this.pose = {};
    this.plane = 'floor';
    this.air = null;
    this.hS = new Spring(110, 15);
    this.hS.x = 1;
    this.pitchS = new Spring(90, 13);
    this.rollS = new Spring(90, 13);
    this.shX = new Spring(80, 13);
    this.shZ = new Spring(80, 13);
    this.T = { h: 1, pitch: 0, roll: 0, shx: 0, shz: 0 };
    this.lookP = new V3();
    this.lookW = 0;
    this.lookY = 0;
    this.lookX = 0;
    this.twist = 0;
    this.twistT = 0;
    this.jaw = 0;
    this.jawT = 0;
    this.eat = 0;
    this.eatT = 0;
    this.rear = 0;
    this.tilt = 0;
    this.tiltT = 0;
    this.tiltClock = 2;
    this.eyeK = 1;
    this.eyeT = 1;
    this.ceilY = null;
    this.prevYaw = 0;
    this.yawRate = 0;
    this.pv = new V3();
    this.acc = 0;
    this.center = new V3();
    this.plantClock = 0;
    this.stepSnd = 0;
    this.feast = null; // punto (mundo) donde come
    this.resetAI();
  }

  // ------------------------------------------------------------------ cuerpo
  groundAt(x, z) {
    const e = this.e;
    const y = e.game.world.col.groundHeight(x, z, 0.1, e.pos.y + 0.7);
    return y < e.pos.y - 0.8 ? e.pos.y : y;
  }
  ceilAt(x, z) {
    const c = cellarCeil(x, z);
    return c === null ? (this.ceilY ?? this.e.pos.y + 4) : c;
  }
  // Punto del plano de apoyo (x, z locales del cuerpo) en el mundo.
  planePoint(lx, lz, out, flip = this.plane === 'ceil') {
    const e = this.e;
    const c = Math.cos(e.yaw),
      s = Math.sin(e.yaw);
    const x = flip ? -lx : lx;
    out.x = e.pos.x + x * c + lz * s;
    out.z = e.pos.z - x * s + lz * c;
    out.y = flip ? this.ceilAt(out.x, out.z) : this.groundAt(out.x, out.z);
    return out;
  }
  // Punto a la altura y sobre el suelo delante/al lado (local) del cuerpo.
  local(lx, ly, lz, out) {
    const e = this.e;
    const c = Math.cos(e.yaw),
      s = Math.sin(e.yaw);
    out.set(e.pos.x + lx * c + lz * s, e.pos.y + ly, e.pos.z - lx * s + lz * c);
    return out;
  }
  ideal(L, out, lead) {
    const e = this.e;
    this.planePoint(L.home.x, L.home.z, out);
    out.x += e.vx * lead;
    out.z += e.vz * lead;
    if (this.plane === 'ceil') out.y = this.ceilAt(out.x, out.z);
    else out.y = this.groundAt(out.x, out.z);
    return out;
  }
  plantAll() {
    for (const L of this.L) {
      this.ideal(L, L.foot, 0);
      L.step = -1;
      L.ovW = L.ovTo = 0;
    }
  }
  // Suelta un miembro que un ataque movía: da un paso hasta su apoyo.
  release(L) {
    if (L.ovW <= 0.001 && L.ovTo <= 0) return;
    const cur = this.footPos(L, _f);
    L.from.copy(cur).lerp(L.ov, L.ovW);
    this.ideal(L, L.to, 0.1);
    L.step = 0;
    L.dur = 0.22;
    L.ovW = L.ovTo = 0;
  }
  releaseAll() {
    for (const L of this.L) this.release(L);
  }
  hold(L, x, y, z, w = 1) {
    L.ov.set(x, y, z);
    L.ovTo = w;
  }

  footPos(L, out) {
    if (L.step < 0) return out.copy(L.foot);
    const u = clamp(L.step, 0, 1);
    out.lerpVectors(L.from, L.to, sm(u));
    const lift = (0.26 + Math.min(0.3, Math.hypot(this.e.vx, this.e.vz) * 0.05)) * Math.sin(Math.PI * u);
    out.y += this.plane === 'ceil' ? -lift : lift;
    return out;
  }

  gait(dt) {
    const e = this.e;
    const spd = Math.hypot(e.vx, e.vz);
    const dur = lerp(0.36, 0.15, clamp(spd / 6.5, 0, 1));
    const lead = dur * 0.95;
    const thr = 0.32 + spd * 0.085;
    let stepping = 0;
    const prog = [2, 2];
    for (const L of this.L) {
      if (L.step < 0) continue;
      L.step += dt / L.dur;
      this.ideal(L, L.to, lead * 0.5);
      if (L.step >= 1) {
        L.foot.copy(L.to);
        L.step = -1;
        this.onPlant(L, spd);
      } else {
        stepping++;
        prog[L.grp] = Math.min(prog[L.grp], L.step);
      }
    }
    // el que más se ha quedado atrás, primero
    const order = this.L.filter((L) => L.step < 0 && L.ovTo <= 0 && L.ovW <= 0.01);
    for (const L of order) L._err = L.foot.distanceTo(this.ideal(L, _a, lead));
    order.sort((a, b) => b._err - a._err);
    for (const L of order) {
      L.idleT = L._err > 0.16 ? L.idleT + dt : 0;
      const other = prog[1 - L.grp];
      const urgent = L._err > thr * 2.4;
      if (!urgent && (stepping >= 2 || other < 0.55)) continue;
      if (L._err > thr || (spd < 0.3 && L.idleT > 0.45) || urgent) {
        L.from.copy(L.foot);
        this.ideal(L, L.to, lead);
        L.step = 0;
        L.dur = dur * rnd(0.85, 1.15);
        stepping++;
        prog[L.grp] = 0;
        L.idleT = 0;
      }
    }
  }
  onPlant(L, spd) {
    // el tronco se hunde un poco con cada apoyo
    this.hS.kick(-0.35 - spd * 0.05);
    const g = this.g;
    if (g.audio && g.time - this.stepSnd > 0.11 && Math.random() < 0.7) {
      this.stepSnd = g.time;
      const d = Math.hypot(g.player.pos.x - this.e.pos.x, g.player.pos.z - this.e.pos.z);
      if (d < 22 && this.e.obj.visible) g.audio.enemyStep(this.e);
    }
  }

  // Dos huesos en el espacio del tronco: el codo por encima y hacia fuera.
  solve(L, T, pose) {
    const S = L.sh;
    const toT = _a.subVectors(T, S);
    let d = toT.length();
    const a = L.a,
      b = L.b;
    d = clamp(d, Math.abs(b - a) + 0.03, a + b - 0.015);
    const u = toT.normalize();
    const cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
    const sinA = Math.sqrt(1 - cosA * cosA);
    const pole = _b.set(L.side * 0.62, 1, L.front ? 0.3 : -0.3);
    pole.addScaledVector(u, -pole.dot(u));
    if (pole.lengthSq() < 1e-6) pole.set(0, 1, 0);
    pole.normalize();
    const E = _c.copy(S).addScaledVector(u, a * cosA).addScaledVector(pole, a * sinA);
    const Tp = _t.copy(S).addScaledVector(u, d);
    // brazo: su +Y hacia el codo, girado según el plano de la flexión
    const yA = _d.subVectors(E, S).normalize();
    const n = _e.crossVectors(u, pole).normalize();
    const xA = _f.crossVectors(yA, n).normalize();
    _m.makeBasis(xA, yA, n);
    _qa.setFromRotationMatrix(_m);
    // antebrazo: su +Y hacia el codo; los dedos (+Z) hacia fuera, a ras de suelo
    const yB = _d.subVectors(E, Tp).normalize();
    const out = _o.set(Tp.x - S.x, 0, Tp.z - S.z);
    if (out.lengthSq() < 1e-4) out.set(L.side, 0, 0);
    out.normalize();
    out.addScaledVector(yB, -out.dot(yB));
    if (out.lengthSq() < 1e-5) out.copy(n);
    out.normalize();
    const xB = _f.crossVectors(yB, out).normalize();
    _m.makeBasis(xB, yB, out);
    _qb.setFromRotationMatrix(_m);
    _qc.copy(_qa).invert().multiply(_qb);
    pose[L.n + 'A'] = q2e(_qa, pose[L.n + 'A'] || [0, 0, 0]);
    pose[L.n + 'B'] = q2e(_qc, pose[L.n + 'B'] || [0, 0, 0]);
  }

  // Empieza un salto de un plano a otro (suelo <-> techo) o por el aire
  // hasta un punto.
  jump(to, dur = 0.42, o = {}) {
    const e = this.e;
    const from = this.plane;
    this.air = {
      t: 0,
      dur,
      from,
      to,
      x0: e.pos.x,
      z0: e.pos.z,
      x1: o.x ?? e.pos.x,
      z1: o.z ?? e.pos.z,
      y0: this.center.y || e.pos.y + 1,
      arc: o.arc ?? 0.5,
      roll0: from === 'ceil' ? Math.PI : 0,
      roll1: to === 'ceil' ? Math.PI : 0,
      spin: o.spin ?? 0,
    };
    e.data.air = true;
    for (const L of this.L) {
      L.step = -1;
      L.ovW = L.ovTo = 0;
    }
  }
  // Destino (y del centro del cuerpo) de un salto.
  airY(to, x, z, h) {
    return to === 'ceil' ? this.ceilAt(x, z) - h : this.groundAt(x, z) + h;
  }

  animate(dt) {
    const e = this.e;
    const g = this.g;
    const rig = e.rig;
    const obj = e.obj;
    const T = this.T;
    const t = g.time;
    if (!obj.visible) {
      e.shadow.visible = false;
      return;
    }
    // velocidad, aceleración y giro
    const spd = Math.hypot(e.vx, e.vz);
    const fwd = e.vx * Math.sin(e.yaw) + e.vz * Math.cos(e.yaw);
    const pf = this.pv.x * Math.sin(e.yaw) + this.pv.z * Math.cos(e.yaw);
    this.acc = damp(this.acc, (fwd - pf) / Math.max(dt, 1e-3), 8, dt);
    this.pv.set(e.vx, 0, e.vz);
    this.yawRate = damp(this.yawRate, angleDiff(this.prevYaw, e.yaw) / Math.max(dt, 1e-3), 10, dt);
    this.prevYaw = e.yaw;
    // tronco: altura, cabeceo y alabeo con muelles
    const bob = Math.sin(t * 1.3 + e.phase) * 0.025;
    const h = this.hS.update(dt, T.h + bob);
    const pitch = this.pitchS.update(dt, T.pitch + clamp(this.acc * 0.025, -0.3, 0.3) - this.rear * 0.9);
    const roll = this.rollS.update(dt, T.roll + clamp(-this.yawRate * spd * 0.03, -0.35, 0.35));
    const shx = this.shX.update(dt, T.shx),
      shz = this.shZ.update(dt, T.shz);
    // techo bajo el que va
    const cy = this.ceilAt(e.pos.x, e.pos.z);
    this.ceilY = this.ceilY === null ? cy : damp(this.ceilY, cy, 6, dt);
    // raíz: en el suelo, en el techo (boca abajo) o por el aire
    let rollZ = 0,
      Cy,
      cx = e.pos.x,
      cz = e.pos.z;
    const A = this.air;
    if (A) {
      A.t += dt;
      const u = clamp(A.t / A.dur, 0, 1);
      const k = sm(u);
      cx = lerp(A.x0, A.x1, u);
      cz = lerp(A.z0, A.z1, u);
      e.pos.x = cx;
      e.pos.z = cz;
      const y1 = this.airY(A.to, cx, cz, h);
      Cy = lerp(A.y0, y1, k) + A.arc * Math.sin(Math.PI * u) * (A.to === 'ceil' && A.from === 'floor' ? 0.3 : 1);
      rollZ = lerp(A.roll0, A.roll1, k) + A.spin * Math.sin(Math.PI * u);
      if (u >= 1) {
        this.air = null;
        this.plane = A.to;
        e.data.air = A.to === 'ceil';
        this.plantAll();
        this.hS.kick(-2.2);
        if (A.to === 'floor') this.onLand && this.onLand(A);
      }
    } else if (this.plane === 'ceil') {
      rollZ = Math.PI;
      Cy = this.ceilY - h;
    } else Cy = e.pos.y + h - e.sink;
    _qa.setFromAxisAngle(AY, e.yaw);
    _qb.setFromAxisAngle(AZ, rollZ);
    obj.quaternion.copy(_qa).multiply(_qb);
    _a.set(0, h, 0).applyQuaternion(obj.quaternion);
    obj.position.set(cx - _a.x, Cy - _a.y, cz - _a.z);
    // las patas
    if (!A) this.gait(dt);
    for (const L of this.L) L.ovW = approach(L.ovW, L.ovTo, dt * (L.ovTo > L.ovW ? 9 : 7));
    const pose = this.pose;
    const jerk = (k) => {
      const v = Math.sin(t * 1.7 + k * 2.3) * Math.sin(t * 0.61 + k);
      return v > 0.82 ? Math.sin(t * 53 + k * 7) * 0.25 : 0;
    };
    const fx = e.flX.update(dt),
      fy = e.flY.update(dt);
    pose.body = [pitch + fx * 0.05 + jerk(1) * 0.2, fy * 0.05 + jerk(2) * 0.15, roll];
    const body = rig.joints.body;
    body.position.set(shx, h, shz);
    body.quaternion.copy(e2q(pose.body, _qc));
    obj.updateMatrixWorld(true);
    _inv.copy(body.matrixWorld).invert();
    for (const L of this.L) {
      const P = this.footPos(L, _p);
      if (A) {
        // en el aire: brazos por delante, piernas recogidas atrás
        const fl = this.plane === 'ceil' ? -1 : 1;
        const s = L.side;
        const reach = A.to === 'floor' && A.x1 !== A.x0 ? 1 : 0.4;
        this.localPoint(L.front ? s * 0.9 : s * 0.8, L.front ? 0.2 : 0.55, L.front ? 1.6 + reach * 0.6 : -1.7, P);
        void fl;
      }
      if (L.ovW > 0) P.lerp(L.ov, L.ovW);
      this.solve(L, P.applyMatrix4(_inv), pose);
    }
    this.headPose(dt, pose);
    rig.apply(pose);
    for (const j in e.lastPose) if (!(j in pose)) delete e.lastPose[j];
    for (const j in pose) e.lastPose[j] = pose[j];
    // centro (percepción, cámara) y sombra en el suelo (en el techo, sólo la
    // sombra lo delata)
    body.updateMatrixWorld(true);
    this.center.setFromMatrixPosition(body.matrixWorld);
    const gy = this.groundAt(this.center.x, this.center.z);
    e.shadow.position.set(this.center.x, gy + 0.02, this.center.z);
    e.shadow.visible = true;
    const hs = clamp(1.35 - (this.center.y - gy) * 0.14, 0.5, 1.3);
    e.shadow.scale.set(e.T.radius * 3.2 * hs, 1, e.T.radius * 3.2 * hs);
    this.eyes(dt);
    // destello al recibir un golpe
    if (e.flash > 0) {
      if (!e._flashing) {
        rig.setTint(null, new THREE.Color(0.6, 0.15, 0.1));
        e._flashing = true;
      }
    } else if (e._flashing) {
      rig.setTint(null, null);
      e._flashing = false;
    }
  }
  // Punto en el espacio local de la raíz -> mundo.
  localPoint(x, y, z, out) {
    out.set(x, y, z).applyMatrix4(this.e.obj.matrixWorld);
    return out;
  }

  headPose(dt, pose) {
    const t = this.g.time;
    const e = this.e;
    let yaw = 0,
      pit = 0;
    if (this.lookW > 0.001) {
      const l = _a.copy(this.lookP).applyMatrix4(_inv);
      const dx = l.x,
        dy = l.y - 0.02,
        dz = l.z - 0.6;
      yaw = clamp(Math.atan2(dx, dz), -1.35, 1.35) * this.lookW;
      pit = clamp(Math.atan2(dy, Math.hypot(dx, dz)), -0.9, 0.9) * this.lookW;
    }
    this.lookY = lerp(this.lookY, yaw, 1 - Math.exp(-9 * dt));
    this.lookX = lerp(this.lookX, pit, 1 - Math.exp(-7 * dt));
    this.twist = lerp(this.twist, this.twistT, 1 - Math.exp(-3.2 * dt));
    // de vez en cuando la cabeza se tuerce sola, de golpe
    this.tiltClock -= dt;
    if (this.tiltClock <= 0) {
      this.tiltClock = rnd(1.5, 5);
      this.tiltT = Math.random() < 0.45 ? rnd(-1.2, 1.2) : 0;
    }
    this.tilt = lerp(this.tilt, this.tiltT, 1 - Math.exp(-14 * dt));
    this.eat = approach(this.eat, this.eatT, dt * 2.2);
    this.jaw = lerp(this.jaw, this.jawT, 1 - Math.exp(-16 * dt));
    const eat = this.eat;
    const chew = eat * (Math.sin(t * 9.3) * 0.5 + 0.5);
    const tear = eat * Math.sin(t * 5.7) * Math.sin(t * 13.1);
    const hy = this.lookY + this.twist;
    pose.neck = [26 * DEG + eat * 0.8 + Math.sin(t * 1.1) * 0.05, hy * 0.45 + tear * 0.35, Math.sin(t * 0.5) * 0.1 + this.rear * 0.2];
    pose.head = [30 * DEG - this.lookX * 0.85 + eat * (0.2 + Math.sin(t * 8.1) * 0.25), hy * 0.55 + tear * 0.25, this.tilt + (e.dead ? 0.8 : 0)];
    pose.jaw = [-(this.jaw * 0.85 + chew * 0.45), 0, 0];
  }

  eyes(dt) {
    const e = this.e;
    this.eyeK = lerp(this.eyeK, this.eyeT * (1 + (e.flare || 0) * 3), 1 - Math.exp(-6 * dt));
    if (!e._eyes) {
      e.rig.own();
      e._eyes = e.rig.meshes.filter((m) => m.userData.matName === 'eyeGlow');
    }
    for (const m of e._eyes) m.material.emissiveIntensity = (m.userData.baseEI ?? 2.2) * this.eyeK;
    e.flare = Math.max(0, (e.flare || 0) - dt * 1.8);
  }

  // ------------------------------------------------------------------ IA
  resetAI() {
    this.mode = 'lair';
    this.mT = 0;
    this.hunger = 0.1;
    this.seen = false;
    this.seenT = 0;
    this.unseenT = 0;
    this.behind = false;
    this.senseT = 0;
    this.perch = null;
    this.lastPerches = [];
    this.path = null;
    this.pathT = 0;
    this.goal = new V3();
    this.freezeT = 0;
    this.tauntT = rnd(6, 10);
    this.peekCD = 25;
    this.engaged = false;
    this.engageT = 0;
    this.engageDmg = 0;
    this.lastEngaged = -99;
    this.atk = null;
    this.atkT = 0;
    this.cool = 0;
    this.score = { claw: 0, claw2: 0, pounce: 0, grab: 0, rip: 0, crack: 0, throw: 0, drop: 0 };
    this.shieldT = 0;
    this.ripCount = 0;
    this.blockT = 0;
    this.rollN = 0;
    this.phase = 1;
    this.burrow = null;
    this.stuckT = 0;
    this.lastPos = new V3();
    this.projectiles = this.projectiles || [];
    this.circle = Math.random() < 0.5 ? 1 : -1;
    this.hurtT = 0;
    this.huntT = 0;
    this.inFight = false;
    this.retreatN = 0;
    this.dist = 99;
    this.planeT = -99;
    this.ambush = false;
  }

  reset() {
    const e = this.e;
    this.plane = 'floor';
    this.air = null;
    this.hS.x = 0.8;
    this.T.h = 0.8;
    this.T.pitch = 0;
    this.T.roll = 0;
    this.rear = 0;
    this.twist = this.twistT = 0;
    this.jawT = 0;
    this.eatT = 1;
    this.eat = 1;
    this.eyeT = 0.6;
    this.lookW = 0;
    this.ceilY = null;
    e.data.air = false;
    e.obj.visible = true;
    this.hidden = false;
    this.resetAI();
    this.plantAll();
    this.clearProjectiles();
  }

  setMode(m) {
    if (this.mode === m) return;
    this.mode = m;
    this.mT = 0;
    this.path = null;
  }

  // Lo que ve el jugador de él (y dónde mira el jugador).
  sense() {
    const e = this.e,
      g = this.g,
      cam = g.camera,
      p = g.player;
    const c = this.center;
    const dc = cam.position.distanceTo(c);
    _a.copy(c).project(cam);
    const onScreen = _a.z < 1 && Math.abs(_a.x) < 0.94 && Math.abs(_a.y) < 0.94;
    const dp = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    const pr = e._probe;
    const lit = dp < 8.5 || (pr && pr[0] + pr[1] + pr[2] > 0.9) || this.eyeT > 1.2;
    let vis = e.obj.visible && !this.hidden && onScreen && dc < 16 && lit;
    if (vis) vis = g.world.col.lineOfSight(cam.position.x, cam.position.y, cam.position.z, c.x, c.y, c.z);
    this.seen = vis;
    // ¿el jugador mira hacia él?
    cam.getWorldDirection(_b);
    const ang = Math.acos(clamp((_b.x * (c.x - cam.position.x) + _b.z * (c.z - cam.position.z)) / (Math.hypot(_b.x, _b.z) * Math.hypot(c.x - cam.position.x, c.z - cam.position.z) + 1e-6), -1, 1));
    this.behind = ang > 105 * DEG;
    this.facingAng = ang;
    this.dist = dp;
    this.los = g.world.col.lineOfSight(e.pos.x, e.pos.y + 1.2, e.pos.z, p.pos.x, p.pos.y + 1.3, p.pos.z);
  }

  // Lo vulnerable que está el jugador ahora mismo.
  vuln() {
    const g = this.g,
      p = g.player;
    let v = 0;
    if (p.state === 'heal') v += 1.2;
    if (p.state === 'interact' || p.state === 'rest') v += 1;
    if (g.time - (g.lastModalT || -99) < 1.2) v += 1; // acaba de leer algo
    if (p.st < p.maxSt * 0.3) v += 0.6;
    if (p.state === 'roll' || p.state === 'attack') v += 0.25;
    if (this.behind && !this.seen) v += 0.6;
    if (p.hp < p.maxHp * 0.35) v += 0.4;
    return v;
  }

  inCellar(x, z) {
    return cellarCeil(x, z) !== null;
  }

  // ¿Vería el jugador este punto (a esta altura)?
  pointVisible(x, y, z) {
    const g = this.g,
      cam = g.camera;
    _a.set(x, y, z).project(cam);
    if (!(_a.z < 1 && Math.abs(_a.x) < 1 && Math.abs(_a.y) < 1)) return false;
    return g.world.col.lineOfSight(cam.position.x, cam.position.y, cam.position.z, x, y, z);
  }

  // Elige un punto de acecho: kind 'hide' (fuera de su vista, detrás si
  // puede), 'peek' (delante, a lo lejos, a la vista) o 'far' (lejos).
  choosePerch(kind) {
    const g = this.g,
      p = g.player.pos;
    const cam = g.camera;
    cam.getWorldDirection(_b);
    let best = null,
      bs = -1e9;
    const want = kind === 'peek' ? 11 : kind === 'far' ? 16 : lerp(13, 7.5, clamp(this.hunger, 0, 1));
    for (const P of CELLAR.perches) {
      const d = Math.hypot(P.x - p.x, P.z - p.z);
      if (d < (kind === 'peek' ? 7.5 : 5.5) || d > (kind === 'far' ? 26 : 19)) continue;
      const cy = this.ceilAt(P.x, P.z) - 1;
      const vis = this.pointVisible(P.x, cy, P.z);
      const front = (_b.x * (P.x - p.x) + _b.z * (P.z - p.z)) / (Math.hypot(_b.x, _b.z) * d + 1e-6);
      let s = -Math.abs(d - want) + Math.random() * 2.5;
      if (kind === 'peek') s += (vis ? 8 : -6) + front * 4;
      else s += (vis ? -9 : 0) - front * 2.5;
      if (this.lastPerches.includes(P)) s -= 6;
      const dm = Math.hypot(P.x - this.e.pos.x, P.z - this.e.pos.z);
      s -= dm * 0.08;
      if (s > bs) {
        bs = s;
        best = P;
      }
    }
    if (best) {
      this.lastPerches.push(best);
      if (this.lastPerches.length > 4) this.lastPerches.shift();
    }
    return best;
  }

  // Madriguera cuya boca más cercana a él queda a mano y cuya otra boca
  // acerca (o aleja, 'far') al jugador.
  chooseBurrow(far = false) {
    const e = this.e,
      p = this.g.player.pos;
    let best = null,
      bs = 1e9;
    for (const pair of CELLAR.burrows)
      for (let k = 0; k < 2; k++) {
        const A = pair[k],
          B = pair[1 - k];
        const dA = Math.hypot(A.fx - e.pos.x, A.fz - e.pos.z);
        if (dA > 12) continue;
        const dB = Math.hypot(B.fx - p.x, B.fz - p.z);
        if (!far && (dB < 4 || dB > 13)) continue;
        if (far && dB < 12) continue;
        if (this.pointVisible(A.x, A.y + 0.5, A.z) && this.seen) continue;
        const s = dA + (far ? -dB * 0.3 : Math.abs(dB - 7)) + Math.random() * 3;
        if (s < bs) {
          bs = s;
          best = { A, B };
        }
      }
    return best;
  }

  // Movimiento con A* por la rejilla de las bodegas.
  moveTo(x, z, speed, dt, face = true) {
    const e = this.e;
    const nav = this.g.navCellar;
    let tx = x,
      tz = z;
    if (nav && !nav.line(e.pos.x, e.pos.z, x, z)) {
      this.pathT -= dt;
      if (!this.path || this.pathT <= 0 || Math.hypot(this.goal.x - x, this.goal.z - z) > 1.2) {
        const r = nav.path(e.pos.x, e.pos.z, x, z, 6000);
        this.path = r ? r.pts : null;
        this.pathI = 1;
        this.pathT = 0.6;
        this.goal.set(x, 0, z);
      }
      if (this.path && this.pathI < this.path.length) {
        const [px, pz] = this.path[this.pathI];
        if (Math.hypot(px - e.pos.x, pz - e.pos.z) < 0.7) this.pathI++;
        if (this.pathI < this.path.length) [tx, tz] = this.path[this.pathI];
      }
    } else this.path = null;
    const dx = tx - e.pos.x,
      dz = tz - e.pos.z;
    const d = Math.hypot(dx, dz);
    const k = Math.min(1, d / 0.8);
    const wx = d > 0.01 ? (dx / d) * speed * k : 0,
      wz = d > 0.01 ? (dz / d) * speed * k : 0;
    e.vx = damp(e.vx, wx, 7, dt);
    e.vz = damp(e.vz, wz, 7, dt);
    if (face && d > 0.15) e.yaw = approachAngle(e.yaw, Math.atan2(dx, dz), (4 + speed) * dt);
    return Math.hypot(x - e.pos.x, z - e.pos.z);
  }
  stop(dt, k = 8) {
    const e = this.e;
    e.vx = damp(e.vx, 0, k, dt);
    e.vz = damp(e.vz, 0, k, dt);
  }
  faceTo(x, z, rate, dt) {
    const e = this.e;
    e.yaw = approachAngle(e.yaw, Math.atan2(x - e.pos.x, z - e.pos.z), rate * dt);
  }
  lookAtPlayer(w = 1) {
    const p = this.g.player.pos;
    this.lookP.set(p.x, p.y + 1.5, p.z);
    this.lookW = w;
  }

  // Cambia de plano (salta al techo o se deja caer) si hace falta.
  toPlane(plane) {
    if (this.air || this.plane === plane) return !this.air && this.plane === plane;
    this.planeT = this.g.time;
    if (plane === 'ceil') {
      const c = this.ceilAt(this.e.pos.x, this.e.pos.z);
      if (c - this.e.pos.y < 3.1) return false;
      this.g.audio && this.g.audio.play('scuttle', this.e.pos);
    }
    this.jump(plane, plane === 'ceil' ? 0.4 : 0.35, { arc: plane === 'ceil' ? 0.2 : 0.1 });
    return false;
  }

  // ------------------------------------------------------------------ ciclo
  think(dt) {
    const e = this.e,
      g = this.g,
      p = g.player;
    this.mT += dt;
    e.stT += dt;
    this.cool -= dt;
    this.hurtT -= dt;
    e.flash -= dt;
    e.poiseT -= dt;
    if (e.poiseT <= 0) e.poise = e.T.poise;
    this.updateProjectiles(dt);
    if (e.dead) return this.dead(dt);
    this.senseT -= dt;
    if (this.senseT <= 0) {
      this.senseT = 0.12;
      this.sense();
    }
    if (this.seen) {
      this.seenT += dt;
      this.unseenT = 0;
    } else {
      this.unseenT += dt;
      this.seenT = 0;
    }
    // fases
    const f = e.hp / e.maxHp;
    const ph = f < 0.3 ? 3 : f < 0.62 ? 2 : 1;
    if (ph > this.phase) {
      this.phase = ph;
      if (ph === 3) {
        g.onBossPhase && g.onBossPhase(e);
        g.audio && g.audio.enemyVoice(e, 'alert');
      }
    }
    // lo que hace el jugador (para aprender)
    if (p.blocking) this.blockT = Math.min(6, this.blockT + dt);
    else this.blockT = Math.max(0, this.blockT - dt * 0.5);
    if (p.state === 'roll' && !this._rolling) this.rollN = Math.min(8, this.rollN + 1);
    this._rolling = p.state === 'roll';
    this.rollN = Math.max(0, this.rollN - dt * 0.12);
    // golpes recibidos (Enemy.takeHit cambia el estado)
    if (e.state === 'hurt' || e.state === 'stagger') {
      const heavy = e.state === 'stagger';
      e.state = 'hunt';
      this.endAttack();
      this.releaseAll();
      if (this.plane === 'ceil' && !this.air) this.jump('floor', 0.3, { arc: 0 });
      this.setMode(heavy ? 'stun' : 'hurt');
      this.stunDur = heavy ? 1.5 : 0.42;
    }
    // quién se ve y quién no
    this.eyeT = this.mode === 'peek' || this.mode === 'fight' || this.mode === 'attack' || this.mode === 'lair' ? 1.2 : this.mode === 'perch' ? 0.35 : 0.25;
    const M = this.mode;
    if (this.huntActive()) {
      if (M === 'stalk' || M === 'perch' || M === 'peek') this.hungerTick(dt);
      this.peekCD -= dt;
    }
    switch (M) {
      case 'lair':
        this.lair(dt);
        break;
      case 'stalk':
        this.stalk(dt);
        break;
      case 'perch':
        this.perchMode(dt);
        break;
      case 'peek':
        this.peek(dt);
        break;
      case 'burrow':
        this.burrowMode(dt);
        break;
      case 'hunt':
        this.huntMode(dt);
        break;
      case 'fight':
        this.fight(dt);
        break;
      case 'attack':
        this.attack(dt);
        break;
      case 'retreat':
        this.retreat(dt);
        break;
      case 'hurt':
      case 'stun':
        this.stunned(dt);
        break;
      case 'scripted':
        break;
    }
    if (this.mode !== 'lair' && this.huntActive()) this.taunts(dt);
    // compromiso (barra de vida, música)
    const hot = M === 'fight' || M === 'attack' || M === 'stun' || M === 'hurt' || (M === 'hunt' && this.dist < 6);
    if (hot) this.lastEngaged = g.time;
    this.engaged = g.time - this.lastEngaged < 5;
    // física
    if (!this.air && !this.hidden && this.mode !== 'scripted') {
      moveBody(g.world.col, e.body, e.vx * dt, e.vz * dt, dt);
      // no atravesar al jugador (salvo desde el techo)
      if (this.plane === 'floor' && !p.dead && !(this.atk && this.atk.name === 'grab' && this.grabbed)) {
        const dx = e.pos.x - p.pos.x,
          dz = e.pos.z - p.pos.z;
        const dd = Math.hypot(dx, dz);
        const min = e.body.radius + p.body.radius;
        if (dd < min && dd > 0.001 && Math.abs(e.pos.y - p.pos.y) < 1.5) {
          const push = (min - dd) * 0.5;
          e.pos.x += (dx / dd) * push;
          e.pos.z += (dz / dd) * push;
          p.pos.x -= (dx / dd) * push * 0.7;
          p.pos.z -= (dz / dd) * push * 0.7;
        }
      }
    }
    // atascos: si no avanza, se olvida del camino
    this.stuckT += dt;
    if (this.stuckT > 1) {
      if (this.lastPos.distanceTo(e.pos) < 0.2 && Math.hypot(e.vx, e.vz) > 1) this.path = null;
      this.lastPos.copy(e.pos);
      this.stuckT = 0;
    }
  }

  huntActive() {
    return !!(this.g.hunt && this.g.hunt.active);
  }

  hungerTick(dt) {
    const k = this.phase === 1 ? 1 : this.phase === 2 ? 1.6 : 3;
    if (this.seen) this.hunger -= dt * 0.12;
    else this.hunger += dt * (0.035 + this.vuln() * 0.05 + (this.behind ? 0.02 : 0)) * k;
    this.hunger = clamp(this.hunger, 0, 1.6);
    // ¿emboscada?
    if (this.hunger >= 1 && this.vuln() > 0.5 && !this.seen) this.startHunt();
    else if (this.hunger >= 1.35 && !this.seen) this.startHunt();
    else if (this.phase === 3) this.startHunt();
  }

  // -------------------------------------------------------------- modos
  // En su guarida: come, hasta que empieza la caza.
  lair(dt) {
    const e = this.e,
      g = this.g;
    this.stop(dt);
    this.eatT = 1;
    this.T.h = 0.72;
    this.T.pitch = 0.28;
    this.eyeT = 0.8;
    this.lookW = damp(this.lookW, 0, 3, dt);
    // las manos arrancan pedazos del cadáver
    const c = this.feast;
    if (c) {
      const t = g.time;
      const lf = this.L[0],
        rf = this.L[1];
      const j = Math.sin(t * 3.1) * 0.12;
      this.hold(lf, c.x + 0.3 + j, c.y + 0.15 + Math.max(0, Math.sin(t * 4.3)) * 0.35, c.z + 0.1);
      this.hold(rf, c.x - 0.35 - j, c.y + 0.12 + Math.max(0, Math.sin(t * 3.7 + 1)) * 0.3, c.z - 0.1);
    }
    // se le oye comer desde la casa
    this.chewT = (this.chewT ?? 0) - dt;
    if (this.chewT <= 0) {
      this.chewT = rnd(0.45, 0.95);
      const d = Math.hypot(g.player.pos.x - e.pos.x, g.player.pos.z - e.pos.z);
      if (d < 40 && g.audio) g.audio.play('chew', { x: this.center.x, y: this.center.y - 0.6, z: this.center.z });
    }
  }

  // Comienza la caza (tras la cinemática o al volver a bajar).
  startHunting(kind = 'return') {
    const e = this.e;
    this.eatT = 0;
    this.releaseAll();
    e.state = 'hunt';
    e.aware = true;
    this.hunger = kind === 'intro' ? 0.05 : 0.35;
    this.T.h = 1;
    this.T.pitch = 0;
    if (kind === 'intro') {
      // ya se ha ido: está en la oscuridad, colgado de algún techo
      this.setMode('perch');
      this.perchDur = rnd(6, 9);
    } else {
      // te ha oído bajar: deja de comer, te mira y se escabulle
      this.setMode('retreat');
      this.retreatTo = this.choosePerch('far') || this.choosePerch('hide');
      this.g.audio && this.g.audio.enemyVoice(e, 'alert');
    }
  }

  stalk(dt) {
    const e = this.e;
    if (!this.perch) {
      // de vez en cuando se deja ver; otras, se cuela por los muros
      if (this.peekCD <= 0 && Math.random() < 0.3) {
        const P = this.choosePerch('peek');
        if (P) {
          this.perch = P;
          this.peeking = true;
          this.peekCD = rnd(30, 50);
        }
      }
      if (!this.perch && Math.random() < 0.25) {
        const b = this.chooseBurrow();
        if (b) {
          this.burrow = { ...b, t: 0, stage: 'go' };
          this.setMode('burrow');
          return;
        }
      }
      if (!this.perch) this.perch = this.choosePerch('hide') || CELLAR.perches[Math.floor(Math.random() * CELLAR.perches.length)];
    }
    const P = this.perch;
    // por el techo si cabe; por el suelo si no
    const hh = this.ceilAt(e.pos.x, e.pos.z) - e.pos.y;
    const want = this.plane === 'ceil' ? (hh > 2.9 ? 'ceil' : 'floor') : hh > 3.4 && this.g.time - this.planeT > 1.2 ? 'ceil' : 'floor';
    if (!this.toPlane(want) && this.air) {
      this.stop(dt, 4);
      return;
    }
    // si le ves mientras se mueve, se queda quieto
    if (this.seen && this.dist < 14) {
      this.freezeT += dt;
      this.stop(dt, 14);
      this.lookAtPlayer(1);
      if (this.freezeT > rnd(0.7, 1.4)) {
        this.freezeT = 0;
        // te acercas: o huye o viene a por ti
        if (this.dist < 6 && (this.hunger > 0.7 || this.phase > 1)) this.engage();
        else {
          this.retreatTo = this.choosePerch('far');
          this.setMode('retreat');
          this.giggle();
        }
      }
      return;
    }
    this.freezeT = Math.max(0, this.freezeT - dt);
    this.lookW = damp(this.lookW, 0.4, 2, dt);
    this.lookAtPlayer(this.lookW);
    const spd = this.plane === 'ceil' ? 4.6 : 3.6;
    const d = this.moveTo(P.x, P.z, spd, dt);
    if (d < 0.8) {
      this.setMode(this.peeking ? 'peek' : 'perch');
      this.perchDur = this.peeking ? 7 : rnd(4, 9);
    }
    if (this.mT > 14) this.perch = null;
  }

  perchMode(dt) {
    this.stop(dt, 10);
    this.lookAtPlayer(0.9);
    // se mece, cruje, mira
    this.T.h = this.plane === 'ceil' ? 0.85 : 0.75;
    if (this.seen && this.seenT > 0.6) {
      // le has visto: se va (o, si estás cerca y tiene hambre, ataca)
      if (this.dist < 5.5 && this.hunger > 0.5) this.engage();
      else {
        this.retreatTo = this.choosePerch('hide');
        this.setMode('retreat');
      }
      return;
    }
    if (this.mT > this.perchDur) {
      this.perch = null;
      this.peeking = false;
      this.setMode('stalk');
    }
  }

  // Se deja ver a lo lejos. Cuando lo ves, un instante, y se esfuma.
  peek(dt) {
    this.stop(dt, 10);
    this.lookAtPlayer(1);
    this.eyeT = 1.6;
    if (this.seenT > rnd(0.5, 0.9) || this.mT > this.perchDur || this.dist < 6) {
      this.peeking = false;
      this.perch = null;
      if (this.dist < 6 && this.hunger > 0.6) return this.engage();
      this.giggle();
      const b = this.chooseBurrow(true);
      if (b && Math.random() < 0.5) {
        this.burrow = { ...b, t: 0, stage: 'go' };
        this.setMode('burrow');
      } else {
        this.retreatTo = this.choosePerch('far');
        this.setMode('retreat');
      }
    }
  }

  // Por dentro de los muros: sube a la boca, desaparece, se le oye correr
  // dentro de la piedra y sale por la otra.
  burrowMode(dt) {
    const e = this.e,
      g = this.g;
    const B = this.burrow;
    if (!B) return this.setMode('stalk');
    B.t += dt;
    if (B.stage === 'go') {
      if (!this.toPlane('floor') && this.air) return;
      const d = this.moveTo(B.A.fx, B.A.fz, 5.2, dt);
      if (d < 1.1 || B.t > 6) {
        B.stage = 'in';
        B.t = 0;
        e.yaw = Math.atan2(-B.A.nx, -B.A.nz);
        this.stop(dt, 20);
        g.audio && g.audio.play('scuttle', { x: B.A.x, y: B.A.y, z: B.A.z });
      }
    } else if (B.stage === 'in') {
      // trepa a la boca (el cuerpo se estira hacia ella) y se mete
      this.stop(dt, 20);
      const u = clamp(B.t / 0.45, 0, 1);
      this.T.h = lerp(1, 2.6, u);
      this.T.pitch = -1.2 * u;
      for (const L of this.L.slice(0, 2)) this.hold(L, B.A.x + (L.side * 0.3 * -B.A.nz), B.A.y + 0.5, B.A.z + L.side * 0.3 * B.A.nx);
      if (u >= 1) {
        B.stage = 'inside';
        B.t = 0;
        B.dur = 1.6 + Math.hypot(B.B.x - B.A.x, B.B.z - B.A.z) / 7;
        this.hidden = true;
        e.obj.visible = false;
        e.data.air = true;
        this.releaseAll();
        this.T.h = 1;
        this.T.pitch = 0;
        this.hS.x = 1;
        this.pitchS.x = 0;
        B.snd = 0;
      }
    } else if (B.stage === 'inside') {
      // se le oye dentro de la piedra, camino de la otra boca
      B.snd -= dt;
      if (B.snd <= 0) {
        B.snd = rnd(0.25, 0.45);
        const u = clamp(B.t / B.dur, 0, 1);
        g.audio && g.audio.play(Math.random() < 0.25 ? 'boneCrack' : 'scuttle', { x: lerp(B.A.x, B.B.x, u), y: B.A.y, z: lerp(B.A.z, B.B.z, u) }, { k: 0.6 });
      }
      if (B.t >= B.dur) {
        B.stage = 'out';
        B.t = 0;
        e.pos.set(B.B.fx, this.groundAt(B.B.fx, B.B.fz), B.B.fz);
        e.yaw = Math.atan2(B.B.nx, B.B.nz);
        this.hidden = false;
        e.obj.visible = true;
        this.plane = 'floor';
        this.plantAll();
        this.T.h = 2.2;
        this.hS.x = 2.2;
        this.T.pitch = -0.9;
        this.pitchS.x = -0.9;
        g.audio && g.audio.play('scuttle', { x: B.B.x, y: B.B.y, z: B.B.z });
      }
    } else if (B.stage === 'out') {
      this.T.h = lerp(2.2, 1, seg(B.t, 0, 0.5));
      this.T.pitch = lerp(-0.9, 0, seg(B.t, 0, 0.5));
      if (B.t > 0.5) {
        e.data.air = false;
        this.burrow = null;
        // si sale cerca de ti y tiene hambre: a por ti
        if (this.hunger > 0.9 && this.dist < 9) this.startHunt();
        else {
          this.perch = null;
          this.setMode('stalk');
        }
      }
    }
  }

  // Emboscada: se acerca sin que le veas y ataca.
  startHunt() {
    if (this.mode === 'hunt' || this.mode === 'attack' || this.mode === 'fight') return;
    this.setMode('hunt');
    this.huntT = 0;
    this.perch = null;
  }
  huntMode(dt) {
    const e = this.e,
      g = this.g,
      p = g.player;
    this.huntT += dt;
    const cam = g.camera;
    cam.getWorldDirection(_b);
    const bl = Math.hypot(_b.x, _b.z) || 1;
    // detrás de ti
    let bx = p.pos.x - (_b.x / bl) * 2.3,
      bz = p.pos.z - (_b.z / bl) * 2.3;
    if (!g.navCellar.walkable(bx, bz)) {
      bx = p.pos.x;
      bz = p.pos.z;
    }
    const d = this.dist;
    this.lookAtPlayer(1);
    // desde el techo: se pone encima, un poco detrás, y se deja caer
    if (this.plane === 'ceil' && !this.air) {
      const dd = this.moveTo(bx, bz, 5.4, dt);
      if (dd < 1.3 || (d < 2.4 && this.behind)) return this.startAttack('drop');
      if (this.seen && d > 6 && this.seenT > 0.5) {
        this.retreatTo = this.choosePerch('hide');
        return this.setMode('retreat');
      }
    } else if (!this.air) {
      // por el suelo, agazapado
      this.T.h = 0.72;
      const spd = this.seen ? 5.4 : d > 9 ? 4.6 : 3.2;
      this.moveTo(p.pos.x, p.pos.z, spd, dt);
      if (this.los && d > 3.6 && d < 7.8 && this.cool <= 0) return this.startAttack('pounce');
      if (d < 3.1) return this.startAttack(this.vuln() > 0.9 || this.behind || this.blockT > 2.5 ? 'grab' : 'claw');
      // techo alto cerca y aún lejos: sube para caerle encima
      if (!this.seen && d > 7 && this.ceilAt(e.pos.x, e.pos.z) - e.pos.y > 3.4 && Math.random() < dt * 0.6) this.toPlane('ceil');
    }
    if (this.huntT > 14) {
      this.hunger = 0.6;
      this.setMode('stalk');
    }
  }

  // Pelea abierta.
  engage() {
    this.ambush = false;
    this.setMode('fight');
    // (un encuentro dura de que se te echa encima a que se retira)
    if (!this.inFight) {
      this.inFight = true;
      this.engageT = 0;
      this.engageDmg = 0;
    }
    this.perch = null;
    if (this.plane === 'ceil' && !this.air) this.jump('floor', 0.34, { arc: 0 });
  }
  fight(dt) {
    const e = this.e,
      g = this.g,
      p = g.player;
    if (this.air) return this.stop(dt, 3);
    this.engageT += dt;
    const d = this.dist;
    this.lookAtPlayer(1);
    this.T.h = 0.9;
    // ¿se retira? (herido, harto o jugando contigo); con furia, nunca
    const lim = this.phase === 1 ? 0.13 : 0.2;
    if (this.phase < 3 && (this.engageDmg > e.maxHp * lim || this.engageT > (this.phase === 1 ? 13 : 20))) return this.startRetreat();
    // ¿se escuda tras un pilar? lo arranca
    const sh = g.breakables && g.breakables.between(e.pos.x, e.pos.z, p.pos.x, p.pos.z, e.pos.y);
    if (sh && sh.kind === 'pillar' && d < 5) {
      const pd = Math.hypot(p.pos.x - sh.x, p.pos.z - sh.z);
      if (pd < 2.6) this.shieldT += dt * (1 + this.ripCount * 0.8);
    } else this.shieldT = Math.max(0, this.shieldT - dt * 0.5);
    if (sh && this.shieldT > 1.1 && this.cool <= 0.3) {
      this.ripTarget = sh;
      return this.startAttack('rip');
    }
    // castiga que te cures
    if (p.state === 'heal' && this.cool < 0.6) {
      if (d < 3) return this.startAttack('claw');
      if (d < 7.5 && this.los) return this.startAttack('pounce');
    }
    if (this.cool <= 0 && this.los) {
      const a = this.pickAttack(d);
      if (a) return this.startAttack(a);
    }
    // distancia: se acerca, rodea o recula
    if (d > 4.2 || !this.los) this.moveTo(p.pos.x, p.pos.z, d > 7 ? 5 : 3.2, dt);
    else {
      const ang = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z) + this.circle * 0.55;
      const r = d < 2.2 ? 3.2 : 3;
      this.moveTo(p.pos.x + Math.sin(ang) * r, p.pos.z + Math.cos(ang) * r, 2.2, dt, false);
      this.faceTo(p.pos.x, p.pos.z, 6, dt);
      if (Math.random() < dt * 0.35) this.circle = -this.circle;
    }
  }

  // Elige golpe según la distancia y lo que ha aprendido de ti.
  pickAttack(d) {
    const g = this.g,
      p = g.player;
    const W = [];
    const sc = (n) => clamp(1 + this.score[n] * 0.28, 0.3, 2.6);
    if (d < 3) {
      W.push(['claw', 3 * sc('claw')], ['claw2', 2 * sc('claw2')]);
      if (this.blockT > 1.8 || p.st < p.maxSt * 0.3) W.push(['grab', 2.2 * sc('grab')]);
      else W.push(['grab', 0.5 * sc('grab')]);
      if (this.phase >= 2 && (this.lastCrack ?? -99) < g.time - 9) W.push(['crack', 1.6]);
    }
    if (d > 3.4 && d < 8) W.push(['pounce', (d < 5 ? 0.9 : 2.2) * sc('pounce')]);
    // (a media distancia a veces prefiere acercarse)
    if (d > 3 && d < 5.5) W.push([null, 1.4]);
    if (d > 5.5 && d < 13) W.push(['throw', 0.7 * sc('throw')]);
    if (!W.length) return null;
    let tot = 0;
    for (const w of W) tot += w[1];
    let r = Math.random() * tot;
    for (const [n, w] of W) {
      r -= w;
      if (r <= 0) return n;
    }
    return W[0][0];
  }

  startRetreat() {
    this.retreatN++;
    this.inFight = false;
    const b = Math.random() < 0.4 ? this.chooseBurrow(true) : null;
    if (b) {
      this.burrow = { ...b, t: 0, stage: 'go' };
      this.setMode('burrow');
    } else {
      this.retreatTo = this.choosePerch('far') || this.choosePerch('hide');
      this.setMode('retreat');
    }
    this.hunger = this.phase === 1 ? 0.15 : 0.35;
    this.giggle();
  }

  retreat(dt) {
    const e = this.e;
    const P = this.retreatTo;
    if (!P) {
      this.perch = null;
      return this.setMode('stalk');
    }
    // salta al techo y se va a toda prisa
    if (this.mT < 0.2) this.toPlane(this.ceilAt(e.pos.x, e.pos.z) - e.pos.y > 3.2 ? 'ceil' : 'floor');
    if (this.air) return this.stop(dt, 3);
    this.lookW = damp(this.lookW, 0, 3, dt);
    const d = this.moveTo(P.x, P.z, this.plane === 'ceil' ? 6 : 5.2, dt);
    if (d < 0.9 || this.mT > 9) {
      this.perch = P;
      this.setMode('perch');
      this.perchDur = rnd(5, 10);
    }
  }

  stunned(dt) {
    const e = this.e;
    this.stop(dt, 6);
    const stun = this.mode === 'stun';
    const u = this.mT / this.stunDur;
    this.T.h = stun ? lerp(0.45, 0.9, seg(u, 0.5, 1)) : 0.85;
    this.T.roll = stun ? Math.sin(this.mT * 3) * 0.3 * (1 - u) : 0;
    this.jawT = stun ? 0.6 : 0.3;
    if (this.mT >= this.stunDur) {
      this.T.roll = 0;
      this.jawT = 0;
      if (this.phase < 3 && this.engageDmg > e.maxHp * 0.1 && Math.random() < 0.55) this.startRetreat();
      else this.engage();
    }
  }

  dead(dt) {
    const e = this.e;
    this.stop(dt, 5);
    e.stT += 0;
    this.T.h = lerp(this.T.h, 0.25, 1 - Math.exp(-2 * dt));
    this.T.pitch = 0.2;
    this.eyeT = 0;
    this.jawT = 0.7;
    this.lookW = 0;
    if (this.plane === 'ceil' && !this.air) this.jump('floor', 0.5, { arc: 0 });
    if (!this._deadSplay && !this.air) {
      this._deadSplay = true;
      for (const L of this.L) {
        this.planePoint(L.home.x * 1.7, L.home.z * 1.5, _a, false);
        this.hold(L, _a.x, _a.y + 0.05, _a.z);
      }
    }
    if (e.stT > 2.4) {
      e.sink += dt * 0.3;
      if (!e.data.dissolved) {
        e.data.dissolved = true;
        this.g.fx && this.g.fx.dissolve && this.g.fx.dissolve(e);
      }
    }
    if (e.stT > 5.5) {
      e.obj.visible = false;
      e.shadow.visible = false;
    }
  }

  // -------------------------------------------------------------- burlas
  giggle() {
    const g = this.g;
    if (g.audio && Math.random() < 0.8) g.audio.play('giggle', { x: this.center.x, y: this.center.y, z: this.center.z });
  }
  taunts(dt) {
    const e = this.e,
      g = this.g,
      p = g.player.pos;
    if (!g.audio) return;
    if (this.mode === 'fight' || this.mode === 'attack') return;
    this.tauntT -= dt;
    if (this.tauntT > 0) return;
    this.tauntT = rnd(7, 14) / (this.phase === 1 ? 1 : 1.4);
    const r = Math.random();
    const P = { x: this.center.x, y: this.center.y, z: this.center.z };
    if (r < 0.2) g.audio.play('boneCrack', P, { n: 3, k: 0.8 });
    else if (r < 0.34) this.giggle();
    else if (r < 0.48) {
      // la voz del ama, desde otro sitio
      const far = CELLAR.perches.filter((q) => Math.hypot(q.x - p.x, q.z - p.z) > 10);
      const q = far[Math.floor(Math.random() * far.length)] || P;
      g.audio.play('amaCall', { x: q.x, y: e.pos.y + 1.5, z: q.z });
    } else if (r < 0.62 && this.behind && this.dist < 11) {
      // pasos que no son tuyos, detrás
      g.audio.play('mimicSteps', { x: lerp(p.x, e.pos.x, 0.5), y: p.y, z: lerp(p.z, e.pos.z, 0.5) });
    } else if (r < 0.78) {
      // algo corre por dentro de la pared, a tu lado
      const a = Math.random() * Math.PI * 2;
      for (let k = 3; k < 7; k++) {
        const x = p.x + Math.cos(a) * k,
          z = p.z + Math.sin(a) * k;
        if (!this.inCellar(x, z)) {
          g.audio.play('scuttle', { x, y: p.y + 2.4, z });
          break;
        }
      }
    } else if (r < 0.9 && this.los && this.dist > 6 && this.dist < 13 && !this.seen && this.plane === 'floor') {
      this.startAttack('throw');
    } else g.audio.play('whisperNear', { x: p.x + rnd(-3, 3), y: p.y + 1.6, z: p.z + rnd(-3, 3) });
  }

  // -------------------------------------------------------------- ataques
  startAttack(name) {
    const e = this.e,
      g = this.g;
    if (this.plane === 'ceil' && name !== 'drop') {
      if (!this.air) this.jump('floor', 0.3, { arc: 0 });
      return;
    }
    this.ambush = this.mode === 'hunt' || this.mode === 'perch' || this.mode === 'stalk';
    this.atk = { name, ...ATK[name], t0: g.time };
    this.atkT = 0;
    this.hitDone = [];
    this.evDone = {};
    this.setMode('attack');
    e.flare = 1;
    this.eyeT = 1.4;
    this.feinted = false;
    this.hpAt = g.player.hp;
    if (name !== 'drop' && name !== 'throw') g.audio && g.audio.enemyVoice(e, 'attack');
    if (name === 'claw') this.atk.side = this.sideTo();
    this.lastAttack = name;
  }
  sideTo() {
    const e = this.e,
      p = this.g.player.pos;
    const a = angleDiff(e.yaw, Math.atan2(p.x - e.pos.x, p.z - e.pos.z));
    return a > 0 ? 1 : -1;
  }
  endAttack() {
    if (!this.atk) return;
    const a = this.atk;
    const p = this.g.player;
    // aprende: lo que te alcanzó sube; lo que esquivaste o paraste, baja
    const hit = p.hp < this.hpAt - 1;
    if (this.score[a.name] !== undefined) this.score[a.name] = clamp(this.score[a.name] + (hit ? 1 : a.whiff ? -1 : -0.4), -3, 5);
    this.atk = null;
    this.T.pitch = 0;
    this.T.roll = 0;
    this.T.shx = this.T.shz = 0;
    this.rear = 0;
    this.jawT = 0;
    this.releaseAll();
  }
  // Golpe con ventana: comprueba alcance y arco desde su posición.
  strike(i) {
    if (this.hitDone[i]) return;
    const g = this.g,
      e = this.e,
      a = this.atk,
      p = g.player;
    const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    const inRange = d < a.range + p.body.radius;
    if (g.combat.enemyStrike(e, a, i)) {
      this.hitDone[i] = true;
      g.camRig.shake(0.3);
    } else if (inRange && p.iframe) a.whiff = true;
  }
  attack(dt) {
    const a = this.atk;
    if (!a) return this.engage();
    this.atkT += dt;
    if (this.inFight) this.engageT += dt;
    const t = this.atkT;
    const fn = this['atk_' + a.name];
    if (fn) fn.call(this, t, dt, a);
    if (this.atk && t >= a.dur) {
      this.endAttack();
      this.cool = (this.phase === 3 ? rnd(0.25, 0.6) : rnd(0.6, 1.2)) + (a.name === 'crack' ? 0.6 : 0);
      if (this.mode === 'attack') {
        // tras una emboscada, a veces se aparta a jugar contigo
        if (this.phase < 3 && this.ambush && Math.random() < (this.phase === 1 ? 0.5 : 0.3)) this.startRetreat();
        else this.engage();
      }
    }
  }

  // zarpazo con un brazo: lo alza por encima del cuerpo y lo deja caer donde estás
  atk_claw(t, dt, a, idx = 0) {
    const e = this.e,
      g = this.g,
      p = g.player;
    const s = a.side || 1;
    const L = this.L[s > 0 ? 0 : 1];
    // amago: si ruedas antes de tiempo, se detiene arriba y espera
    if (idx === 0 && t < 0.5 && p.state === 'roll' && !this.feinted && Math.random() < 0.6 + this.rollN * 0.05) {
      this.feinted = true;
      this.atkT = 0.3;
      a.hold = 0.35;
    }
    if (a.hold > 0) {
      a.hold -= dt;
      this.atkT = Math.min(this.atkT, 0.46);
    }
    if (t < 0.52) {
      this.faceTo(p.pos.x, p.pos.z, 6, dt);
      const u = seg(t, 0, 0.48);
      this.T.pitch = -0.3 * u;
      this.T.roll = s * 0.15 * u;
      this.T.shx = -s * 0.18 * u;
      this.T.h = 1 + 0.25 * u;
      this.localPointYaw(s * lerp(1.1, 0.75, u), lerp(0.2, 2.7, u), lerp(1.3, 0.8, u), _a);
      this.hold(L, _a.x, _a.y, _a.z);
      this.stop(dt, 8);
      this.jawT = 0.4 * u;
    } else if (t < 0.66) {
      // el golpe: al suelo, donde estás (dentro de su alcance)
      const px = p.pos.x + p.vx * 0.08,
        pz = p.pos.z + p.vz * 0.08;
      const lx = this.toLocal(px, pz);
      const lz = clamp(lx[1], 0.8, 2.5),
        lxx = clamp(lx[0], -1.3, 1.3);
      this.localPointYaw(lxx, 0.1, lz, _b);
      const u = seg(t, 0.52, 0.62);
      this.localPointYaw(s * 0.75, 2.7, 0.8, _a);
      _a.lerp(_b, u * u);
      this.hold(L, _a.x, _a.y, _a.z);
      this.T.pitch = lerp(-0.3, 0.28, u);
      this.T.h = lerp(1.25, 0.85, u);
      this.T.shx = s * 0.1;
      this.jawT = 1;
      const f = Math.sin(e.yaw),
        c = Math.cos(e.yaw);
      e.vx = f * 3.4;
      e.vz = c * 3.4;
      if (t > 0.55) this.strike(idx);
    } else {
      this.stop(dt, 9);
      this.jawT = 0.2;
      if (t > 0.85) this.release(L);
      this.T.pitch = lerp(0.28, 0, seg(t, 0.7, 1.2));
      this.T.h = lerp(0.85, 1, seg(t, 0.7, 1.2));
    }
  }
  atk_claw2(t, dt, a) {
    // izquierda y luego derecha
    if (t < 0.95) {
      a.side = 1;
      this.atk_claw(t, dt, a, 0);
    } else {
      if (!a.second) {
        a.second = true;
        this.release(this.L[0]);
        a.side = -1;
      }
      this.atk_claw(t - 0.7, dt, a, 1);
    }
  }

  // salto: se agazapa, se lanza en arco hasta donde vas a estar y cae con las
  // cuatro manos; si se estrella contra un pilar o un muro, queda aturdido
  atk_pounce(t, dt, a) {
    const e = this.e,
      g = this.g,
      p = g.player;
    if (t < 0.55) {
      this.faceTo(p.pos.x + p.vx * 0.4, p.pos.z + p.vz * 0.4, 7, dt);
      this.stop(dt, 10);
      const u = seg(t, 0, 0.5);
      this.T.h = lerp(0.9, 0.5, u);
      this.T.pitch = 0.18 * u;
      this.jawT = 0.5 * u;
    } else if (!a.launched) {
      a.launched = true;
      const tx = p.pos.x + p.vx * 0.35,
        tz = p.pos.z + p.vz * 0.35;
      let dx = tx - e.pos.x,
        dz = tz - e.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      const L = clamp(d + 0.6, 2, 7.5);
      a.vx = (dx / d) * (L / 0.45);
      a.vz = (dz / d) * (L / 0.45);
      e.yaw = Math.atan2(dx, dz);
      a.fx = dx / d;
      a.fz = dz / d;
      a.flyT = 0;
      a.px = e.pos.x;
      a.pz = e.pos.z;
      this.jawT = 1;
      g.audio && g.audio.play('pounceWhoosh', e.pos);
    }
    if (a.launched && !a.landed) {
      a.flyT += dt;
      const u = clamp(a.flyT / 0.45, 0, 1);
      // por el aire (con choque contra lo que tenga delante)
      const before = { x: e.pos.x, z: e.pos.z };
      moveBody(g.world.col, e.body, a.vx * dt, a.vz * dt, dt);
      e.vx = e.vz = 0;
      this.T.h = lerp(0.5, 1.1, Math.sin(Math.PI * u)) + 0.9 * Math.sin(Math.PI * u);
      this.T.pitch = lerp(-0.4, 0.3, u);
      for (const L of this.L) {
        this.localPointYaw(L.side * (L.front ? 0.8 : 0.7), L.front ? 1.0 : 1.3, L.front ? 2.2 : -1.9, _a);
        this.hold(L, _a.x, _a.y, _a.z, 1);
      }
      if (a.flyT > 0.18) this.strike(0);
      const moved = Math.hypot(e.pos.x - before.x, e.pos.z - before.z);
      const want = Math.hypot(a.vx, a.vz) * dt;
      const br = g.breakables && g.breakables.contact(e.pos.x, e.pos.z, e.body.radius + 0.35, a.fx, a.fz, e.pos.y);
      if (br) return this.crash(g.breakables.crashInto(br, e.pos));
      if (moved < want * 0.35 && a.flyT > 0.08) return this.crash(false);
      if (u >= 1) {
        a.landed = true;
        this.releaseAll();
        for (const L of this.L) L.step = -1;
        this.plantAll();
        this.hS.kick(-3);
        g.audio && g.audio.play('slamSoft', e.pos);
        g.camRig.shake(0.25);
      }
    }
    if (a.landed) {
      this.stop(dt, 10);
      this.T.h = lerp(0.6, 0.95, seg(t, a.t1 || (a.t1 = t), (a.t1 || t) + 0.6));
      this.T.pitch = 0;
      this.jawT = 0.3;
    }
  }
  // Contra un pilar, un estante, el arco tapiado o un muro.
  crash(broke) {
    const e = this.e,
      g = this.g;
    this.endAttack();
    this.plantAll();
    g.camRig.shake(broke ? 0.6 : 0.45);
    g.audio && g.audio.play('slam', e.pos);
    g.audio && g.audio.enemyVoice(e, 'hurt');
    e.flash = 0.1;
    e.poise = Math.min(e.poise, e.T.poise * 0.4);
    this.setMode('stun');
    this.stunDur = broke ? 1.8 : 1.3;
    this.lastEngaged = g.time;
  }

  // agarrón por la espalda: no se para con el escudo (sí se esquiva);
  // si te atrapa, te muerde y te tira; forcejea (pulsa) para soltarte antes
  atk_grab(t, dt, a) {
    const e = this.e,
      g = this.g,
      p = g.player;
    const lf = this.L[0],
      rf = this.L[1];
    if (!this.grabbed) {
      if (t < 0.4) {
        this.faceTo(p.pos.x, p.pos.z, 8, dt);
        this.stop(dt, 8);
        const u = seg(t, 0, 0.4);
        this.T.h = 1 + 0.3 * u;
        this.T.pitch = -0.35 * u;
        for (const L of [lf, rf]) {
          this.localPointYaw(L.side * 1.2, 2.2, 1.2, _a);
          this.hold(L, _a.x, _a.y, _a.z, u);
        }
      } else if (t < 0.62) {
        const f = Math.sin(e.yaw),
          c = Math.cos(e.yaw);
        e.vx = f * 5.5;
        e.vz = c * 5.5;
        this.T.pitch = 0.2;
        for (const L of [lf, rf]) {
          this.localPointYaw(L.side * 0.45, 1.3, 2.0, _a);
          this.hold(L, _a.x, _a.y, _a.z, 1);
        }
        const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
        const ang = Math.abs(angleDiff(e.yaw, Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z)));
        if (d < a.range + 0.3 && ang < 50 * DEG && !p.iframe && !p.dead && p.state !== 'grabbed' && Math.abs(p.pos.y - e.pos.y) < 1.2) {
          this.grabbed = true;
          this.grabT = 0;
          this.bites = 0;
          p.startGrabbed && p.startGrabbed(e);
          g.audio && g.audio.play('grab', p.pos);
          g.camRig.shake(0.5);
          a.dur = 99;
        } else if (d < a.range + 0.5 && p.iframe) a.whiff = true;
      } else {
        this.stop(dt, 8);
        if (t > 0.8) this.releaseAll();
        this.T.pitch = lerp(0.2, 0, seg(t, 0.7, 1.3));
      }
      return;
    }
    // atrapado
    this.grabT += dt;
    this.stop(dt, 20);
    const gt = this.grabT;
    // lo sostiene delante, a la altura de la cabeza
    this.localPointYaw(0, 0, 1.6, _a);
    p.pos.x = damp(p.pos.x, _a.x, 12, dt);
    p.pos.z = damp(p.pos.z, _a.z, 12, dt);
    p.yaw = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
    for (const L of [lf, rf]) {
      this.localPointYaw(L.side * 0.32, 1.35, 1.55, _b);
      this.hold(L, _b.x, _b.y, _b.z, 1);
    }
    this.T.h = 1.3;
    this.T.pitch = -0.25;
    this.jawT = 0.4 + Math.max(0, Math.sin(gt * 7)) * 0.6;
    this.lookP.set(p.pos.x, p.pos.y + 1.4, p.pos.z);
    this.lookW = 1;
    // mordiscos
    const biteAt = [0.55, 1.15, 1.75];
    if (this.bites < 3 && gt > biteAt[this.bites]) {
      this.bites++;
      if (p.receiveBite) p.receiveBite(8, e);
      g.fx.blood.emit(p.pos.x, p.pos.y + 1.4, p.pos.z, 26, { speed: 4 });
      g.audio && g.audio.play('bite', p.pos);
      g.camRig.shake(0.35);
      g.hurtFlash = 1;
      g.input.rumble(1, 0.8, 180);
    }
    const escaped = (p.mash || 0) >= 6;
    if (escaped || gt > 2.25 || p.dead) {
      this.grabbed = false;
      const f = Math.sin(e.yaw),
        c = Math.cos(e.yaw);
      if (!p.dead) p.releaseGrab && p.releaseGrab(escaped ? 3.5 : 7.5, f, c, escaped ? 0 : 10);
      g.audio && g.audio.play(escaped ? 'hit' : 'slamSoft', p.pos);
      this.endAttack();
      if (escaped) {
        // se ha soltado: el Descoyuntado queda aturdido
        this.setMode('stun');
        this.stunDur = 1.2;
      } else {
        this.cool = 1;
        this.engage();
      }
    }
  }

  // arranca el pilar tras el que te escudas
  atk_rip(t, dt, a) {
    const e = this.e,
      g = this.g,
      p = g.player;
    const P = this.ripTarget;
    if (!P || P.broken) {
      this.endAttack();
      return this.engage();
    }
    const lf = this.L[0],
      rf = this.L[1];
    const dx = P.x - e.pos.x,
      dz = P.z - e.pos.z;
    const d = Math.hypot(dx, dz);
    if (!a.at) {
      // se pega al pilar
      this.faceTo(P.x, P.z, 8, dt);
      this.moveTo(P.x - (dx / d) * 1.6, P.z - (dz / d) * 1.6, 4.5, dt, false);
      this.atkT = 0;
      if (d < 2.1 || this.mT > 2.5) {
        a.at = true;
        g.audio && g.audio.enemyVoice(e, 'attack');
      }
      return;
    }
    this.faceTo(P.x, P.z, 6, dt);
    this.stop(dt, 10);
    const rx = -dz / d,
      rz = dx / d; // a lo ancho del pilar
    const u = seg(t, 0, 0.55);
    this.rear = 0.6 * u;
    this.T.h = 1 + 0.55 * u;
    for (const L of [lf, rf]) {
      const s = L.side;
      // (lado izquierdo del Descoyuntado = -rx desde su frente)
      const ox = P.x - (dx / d) * 0.55 - rx * s * 0.62,
        oz = P.z - (dz / d) * 0.55 - rz * s * 0.62;
      this.hold(L, ox, e.pos.y + lerp(1.2, 2.3, u), oz, 1);
    }
    this.jawT = 0.4 + u * 0.6;
    if (t > 0.55 && t < 0.95) {
      // tira hacia atrás: el pilar cruje
      const k = seg(t, 0.55, 0.95);
      this.T.shz = -0.4 * k;
      this.rear = 0.6 + 0.3 * k;
      if (!this.evDone.creak) {
        this.evDone.creak = true;
        g.audio && g.audio.play('stoneCreak', { x: P.x, y: P.y + 2, z: P.z });
        g.camRig.shake(0.2);
      }
    }
    if (t >= 0.95 && !this.evDone.rip) {
      this.evDone.rip = true;
      g.breakables.shatter(P, e.pos);
      this.ripCount++;
      this.shieldT = 0;
      // los sillares te caen encima si estabas detrás
      const pd = Math.hypot(p.pos.x - P.x, p.pos.z - P.z);
      if (pd < a.range && !p.dead) g.combat.apply(e, { dmg: a.dmg, stagger: true, knock: a.knock, chip: 0.3 }, P.x, P.z);
      g.audio && g.audio.enemyVoice(e, 'alert');
      this.releaseAll();
    }
    if (t > 0.95) {
      this.rear = lerp(0.9, 0, seg(t, 1.0, 1.6));
      this.T.shz = 0;
      this.T.h = lerp(1.55, 1, seg(t, 1, 1.6));
    }
  }

  // se parte todas las articulaciones a la vez: una onda que aturde
  atk_crack(t, dt, a) {
    const e = this.e,
      g = this.g;
    this.stop(dt, 10);
    this.lastCrack = g.time;
    if (t < 0.85) {
      const u = seg(t, 0, 0.8);
      this.T.h = lerp(0.9, 1.4, u);
      this.T.pitch = -0.2 * u;
      for (const L of this.L) {
        this.planePoint(L.home.x * lerp(1, 0.55, u), L.home.z * lerp(1, 0.6, u), _a);
        this.hold(L, _a.x, _a.y + 0.2 * u, _a.z, u);
      }
      this.jawT = u;
    } else if (!this.evDone.crack) {
      this.evDone.crack = true;
      g.combat.toll(e, 4.6, a.dmg, 'crack');
      for (const L of this.L) {
        this.planePoint(L.home.x * 2.05, L.home.z * 1.75, _a);
        this.hold(L, _a.x, _a.y, _a.z, 1);
      }
      this.T.h = 0.45;
      this.hS.kick(-4);
      this.T.pitch = 0;
    } else if (t > 1.4) this.releaseAll();
    if (t > 1.4) this.T.h = lerp(0.45, 1, seg(t, 1.4, 1.9));
  }

  // tira un hueso (o una calavera) desde la oscuridad
  atk_throw(t, dt, a) {
    const e = this.e,
      g = this.g,
      p = g.player;
    const L = this.L[1];
    this.stop(dt, 10);
    this.faceTo(p.pos.x, p.pos.z, 6, dt);
    if (t < 0.55) {
      const u = seg(t, 0, 0.5);
      this.localPointYaw(-0.9, lerp(0.2, 2.4, u), lerp(1.2, -0.4, u), _a);
      this.hold(L, _a.x, _a.y, _a.z, 1);
      this.T.pitch = -0.2 * u;
    } else if (!this.evDone.throw) {
      this.evDone.throw = true;
      this.localPointYaw(-0.6, 2.3, 0.8, _a);
      this.throwBone(_a, p);
      this.localPointYaw(-0.6, 0.4, 2.3, _b);
      this.hold(L, _b.x, _b.y, _b.z, 1);
    } else if (t > 0.8) this.release(L);
    if (t > 0.6) this.T.pitch = lerp(0.15, 0, seg(t, 0.6, 1.1));
  }

  // cae del techo encima de ti (su sombra lo delata un instante antes)
  atk_drop(t, dt, a) {
    const e = this.e,
      g = this.g,
      p = g.player;
    if (!a.started) {
      a.started = true;
      g.audio && g.audio.play('dropCry', { x: this.center.x, y: this.center.y, z: this.center.z });
      e.flare = 1;
    }
    if (t < 0.32) {
      // un chillido, arriba; el polvo cae
      this.stop(dt, 10);
      this.faceTo(p.pos.x, p.pos.z, 8, dt);
      if (Math.random() < dt * 20) g.fx.blood.emit(this.center.x, this.center.y + 0.5, this.center.z, 2, { color: [0.3, 0.28, 0.26], speed: 0.4, life: 1.2, up: -0.5, gravity: 4 });
      return;
    }
    if (!a.fell) {
      a.fell = true;
      this.jump('floor', 0.32, { arc: 0, x: e.pos.x, z: e.pos.z });
      this.onLand = () => {
        this.onLand = null;
        g.combat.shockwave(e.pos.x, e.pos.y, e.pos.z, 2.7, a.dmg, e, 6);
        g.camRig.shake(0.55);
        this.hS.kick(-3.5);
      };
      return;
    }
    if (!this.air) {
      this.stop(dt, 10);
      this.lookAtPlayer(1);
      if (!this.evDone.sweep && t > 0.75) {
        this.evDone.sweep = true;
        a.range = 2.4;
        a.arc = 140;
        a.dmg = 14;
        this.strike(1);
      }
    }
  }

  // Un punto relativo a su guiñada (sin la vuelta del techo), en el mundo.
  localPointYaw(lx, ly, lz, out) {
    return this.local(lx, ly, lz, out);
  }
  toLocal(x, z) {
    const e = this.e;
    const dx = x - e.pos.x,
      dz = z - e.pos.z;
    const c = Math.cos(e.yaw),
      s = Math.sin(e.yaw);
    return [dx * c - dz * s, dx * s + dz * c];
  }

  // -------------------------------------------------------------- huesos
  throwBone(from, p) {
    const g = this.g;
    const T = 0.95;
    const grav = 12;
    const tx = p.pos.x + p.vx * 0.5 + rnd(-0.6, 0.6),
      tz = p.pos.z + p.vz * 0.5 + rnd(-0.6, 0.6);
    const ty = p.pos.y + 1.1;
    const v = new V3((tx - from.x) / T, (ty - from.y + 0.5 * grav * T * T) / T, (tz - from.z) / T);
    const skull = Math.random() < 0.35;
    const m = new THREE.Mesh(skull ? new THREE.SphereGeometry(0.11, 6, 4) : new THREE.CylinderGeometry(0.025, 0.035, 0.42, 5), this.boneMat || (this.boneMat = this.e.rig.meshes.find((q) => q.userData.matName === 'bone').material));
    m.position.copy(from);
    g.scene.add(m);
    this.projectiles.push({ m, v, grav, life: 3, hit: false });
    g.audio && g.audio.play('boneThrow', from);
  }
  updateProjectiles(dt) {
    const g = this.g,
      p = g.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const P = this.projectiles[i];
      P.life -= dt;
      P.v.y -= P.grav * dt;
      P.m.position.addScaledVector(P.v, dt);
      P.m.rotation.x += dt * 14;
      P.m.rotation.z += dt * 9;
      const q = P.m.position;
      let end = P.life <= 0;
      const gy = g.world.col.groundHeight(q.x, q.z, 0.05, q.y + 0.3);
      if (q.y < gy + 0.05) {
        end = true;
        g.audio && g.audio.play('boneClatter', q);
      }
      if (!end && !P.hit && Math.hypot(q.x - p.pos.x, q.y - (p.pos.y + 1.1), q.z - p.pos.z) < 0.6 && !p.dead) {
        P.hit = true;
        if (g.combat.apply(this.e, { dmg: ATK.throw.dmg, knock: 2.5 }, q.x - P.v.x * 0.1, q.z - P.v.z * 0.1)) end = true;
      }
      if (end) {
        g.scene.remove(P.m);
        P.m.geometry.dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }
  clearProjectiles() {
    for (const P of this.projectiles || []) {
      this.g.scene.remove(P.m);
      P.m.geometry.dispose();
    }
    if (this.projectiles) this.projectiles.length = 0;
  }
}

// ------------------------------------------------------------ enganche
// (TYPES.descoyuntado.ai / animate / onReset / onHit)
export function descInit(e) {
  e.D = new Desc(e);
  e.body.stepH = 0.45;
}
export function descAI(e, dt) {
  const D = e.D;
  D.think(dt);
  D.animate(dt);
}
export function descAnimate(e, dt) {
  e.D.animate(dt);
}
export function descReset(e) {
  if (!e.D) return;
  e.D.reset();
  e.state = 'bossIdle';
}
export function descOnHit(e, r, dmg) {
  const D = e.D;
  if (!D) return;
  D.engageDmg += dmg || 0;
  D.lastEngaged = e.game.time;
  // le has alcanzado mientras acechaba: se revuelve
  if (D.mode === 'stalk' || D.mode === 'perch' || D.mode === 'peek' || D.mode === 'hunt' || D.mode === 'retreat') {
    if (r !== 'kill') D.hunger = 1;
    if (e.state !== 'hurt' && e.state !== 'stagger') D.engage();
  }
}
