// El Descoyuntado: cuerpo procedural (este archivo), golpes y esquivas
// (desc_moves.js) y cabeza (desc_mind.js: acecho, furia y lo que aprende de
// ti).
//
// CUERPO. Nada de ciclos de marcha enlatados: cada mano y cada pie se plantan
// de verdad en el suelo (o en el techo, boca abajo) y sólo se despegan cuando
// el cuerpo se ha alejado demasiado de ellos; entonces dan un paso en arco
// hasta donde el cuerpo va a estar. Tres andares: al acecho (bajo, pasos
// altos y lentos, con pausas), al paso (en diagonal, como una araña) y al
// galope (las manos juntas y luego los pies, el espinazo se dobla y se
// estira). Brazos y piernas se resuelven con cinemática inversa de dos
// huesos con el codo y la rodilla por encima del cuerpo. El tronco va en dos
// mitades (se tuerce al girar y se dobla al galopar), las costillas respiran
// (más deprisa cuanto más se cansa y cuando enloquece), los dedos se cierran
// al levantar la mano y se abren al golpear, los jirones de la sotana cuelgan
// siempre hacia el suelo (también boca abajo, en el techo) y se quedan atrás
// al correr, la cabeza del revés sigue al jugador, se tuerce sola, escudriña
// y tiembla de rabia, y la mandíbula mastica, castañetea y grita. En el aire
// puede dar una voltereta entera hacia atrás.
import * as THREE from 'three';
import { clamp, damp, lerp, angleDiff } from '../core/util.js';
import { e2q, q2e, Spring } from './rig.js';
import { DESC, DESC_CLOTH } from './enemy_models.js';
import { cellarCeil } from '../world/level_cellar.js';
import { additiveFog } from '../gfx/materials.js';
import { getTexture } from '../gfx/textures.js';
import { MOVES } from './desc_moves.js';
import { sm, lin, rnd, approach } from './desc_util.js';
import { MIND } from './desc_mind.js';

const V3 = THREE.Vector3;
const _a = new V3(),
  _b = new V3(),
  _c = new V3(),
  _d = new V3(),
  _e = new V3(),
  _f = new V3(),
  _t = new V3(),
  _o = new V3(),
  _p = new V3(),
  _g = new V3();
const _m = new THREE.Matrix4(),
  _invB = new THREE.Matrix4(),
  _invP = new THREE.Matrix4();
const _qa = new THREE.Quaternion(),
  _qb = new THREE.Quaternion(),
  _qc = new THREE.Quaternion(),
  _qBw = new THREE.Quaternion(),
  _qPw = new THREE.Quaternion();
const AX = new V3(1, 0, 0),
  AY = new V3(0, 1, 0),
  AZ = new V3(0, 0, 1),
  DOWN = new V3(0, -1, 0);
// Miembros: [nombre, lado (+1 izq.), delantero, articulación padre, hombro
// o cadera (espacio del padre), brazo, antebrazo, apoyo de reposo (x, z) en
// el plano de apoyo]
const LIMBS = [
  ['lf', 1, true, 'body', [0.27, 0.04, 0.44], DESC.LAf, DESC.LBf, [1.12, 1.3]],
  ['rf', -1, true, 'body', [-0.27, 0.04, 0.44], DESC.LAf, DESC.LBf, [-1.12, 1.3]],
  ['lb', 1, false, 'pelvis', [0.23, 0.04, -0.48 - DESC.pelvisZ], DESC.LAb, DESC.LBb, [1.02, -1.22]],
  ['rb', -1, false, 'pelvis', [-0.23, 0.04, -0.48 - DESC.pelvisZ], DESC.LAb, DESC.LBb, [-1.02, -1.22]],
];

export class Desc {
  constructor(e) {
    this.e = e;
    this.g = e.game;
    this.L = LIMBS.map(([n, side, front, par, sh, a, b, home]) => ({
      n,
      side,
      front,
      par,
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
      curl: 0.1,
      curlT: 0.1,
      curlHold: null,
      wrist: 0,
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
    this.yawS = new Spring(120, 15);
    this.bendS = new Spring(70, 11);
    this.twistS = new Spring(70, 11);
    this.T = { h: 1, pitch: 0, roll: 0, shx: 0, shz: 0, yaw: 0, bend: 0, twist: 0 };
    this.lookP = new V3();
    this.lookW = 0;
    this.lookY = 0;
    this.lookX = 0;
    this.twist = 0;
    this.twistT = 0;
    this.jaw = 0;
    this.jawT = 0;
    this.chatter = 0;
    this.eat = 0;
    this.eatT = 0;
    this.rear = 0;
    this.tilt = 0;
    this.tiltT = 0;
    this.tiltClock = 2;
    this.scan = 0;
    this.shake = 0;
    this.neckExt = 0;
    this.neckExtT = 0;
    this.eyeK = 1;
    this.eyeT = 1;
    this.eyeRed = 0;
    this.exert = 0;
    this.breath = 0;
    this.rageK = 0;
    this.creep = false;
    this.gaitMode = 'walk';
    this.stepLift = 0.26;
    this.ceilY = null;
    this.prevYaw = 0;
    this.yawRate = 0;
    this.pv = new V3();
    this.acc = 0;
    this.center = new V3();
    this.stepSnd = 0;
    this.feast = null; // punto (mundo) donde come
    // jirones: dirección actual (en el espacio de su padre) y su velocidad
    this.cloth = DESC_CLOTH.map(([par, x, z]) => ({ par, sx: Math.sign(x), back: z < -0.35, dir: new V3(0, -1, 0), vel: new V3() }));
    this.resetAI();
  }

  // ------------------------------------------------------------------ apoyo
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
  localPointYaw(lx, ly, lz, out) {
    return this.local(lx, ly, lz, out);
  }
  // Punto en el espacio local de la raíz -> mundo.
  localPoint(x, y, z, out) {
    out.set(x, y, z).applyMatrix4(this.e.obj.matrixWorld);
    return out;
  }
  toLocal(x, z) {
    const e = this.e;
    const dx = x - e.pos.x,
      dz = z - e.pos.z;
    const c = Math.cos(e.yaw),
      s = Math.sin(e.yaw);
    return [dx * c - dz * s, dx * s + dz * c];
  }
  ideal(L, out, lead) {
    const e = this.e;
    const k = this.gaitMode === 'creep' ? 0.9 : this.gaitMode === 'gallop' ? 1.08 : 1;
    // (en un túnel estrecho: las manos y los pies se recogen bajo el cuerpo
    // y se estiran hacia delante y hacia atrás)
    const nw = this.narrow || 0;
    this.planePoint(L.home.x * k * lerp(1, 0.4, nw), L.home.z * k * lerp(1, 1.75, nw), out);
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
  // Suelta un miembro que un golpe movía: da un paso hasta su apoyo.
  release(L) {
    L.curlHold = null;
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
  // Lleva la mano (o el pie) a un punto del mundo; curl: cómo cierra los dedos.
  hold(L, x, y, z, w = 1, curl = null) {
    L.ov.set(x, y, z);
    L.ovTo = w;
    if (curl !== null) L.curlHold = curl;
  }

  footPos(L, out) {
    if (L.step < 0) return out.copy(L.foot);
    const u = clamp(L.step, 0, 1);
    out.lerpVectors(L.from, L.to, sm(u));
    // (el arco sube deprisa y baja despacio: la mano se posa, no cae)
    const lift = this.stepLift * Math.sin(Math.PI * Math.pow(u, 0.8));
    out.y += this.plane === 'ceil' ? -lift : lift;
    return out;
  }

  // ------------------------------------------------------------------ marcha
  gait(dt) {
    const e = this.e;
    const spd = Math.hypot(e.vx, e.vz);
    const mode = spd > 5.3 ? 'gallop' : this.creep && spd < 3.5 ? 'creep' : 'walk';
    if (mode !== this.gaitMode) {
      this.gaitMode = mode;
      // al galope van juntas las dos manos y luego los dos pies
      for (const L of this.L) L.grp = mode === 'gallop' ? (L.front ? 0 : 1) : L.n === 'lf' || L.n === 'rb' ? 0 : 1;
    }
    let dur, thr;
    if (mode === 'gallop') {
      dur = lerp(0.2, 0.15, clamp((spd - 5) / 4, 0, 1));
      thr = 0.45 + spd * 0.06;
      this.stepLift = 0.36;
    } else if (mode === 'creep') {
      dur = lerp(0.62, 0.42, clamp(spd / 3, 0, 1));
      thr = 0.2 + spd * 0.06;
      this.stepLift = 0.44;
    } else {
      dur = lerp(0.36, 0.17, clamp(spd / 5.5, 0, 1));
      thr = 0.32 + spd * 0.085;
      this.stepLift = 0.26 + Math.min(0.26, spd * 0.05);
    }
    const lead = dur * 0.95;
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
    // al acecho: se para un instante entre paso y paso
    if (mode === 'creep') {
      this.creepPause = (this.creepPause ?? 0) - dt;
      if (this.creepPause > 0 && stepping === 0) return;
    }
    for (const L of order) {
      L.idleT = L._err > 0.16 ? L.idleT + dt : 0;
      const other = prog[1 - L.grp];
      const urgent = L._err > thr * 2.4;
      // al galope, el compañero de grupo arranca a la vez
      const partner = mode === 'gallop' && prog[L.grp] < 0.25 && L._err > thr * 0.35;
      if (!urgent && !partner && (stepping >= 2 || other < 0.55)) continue;
      if (L._err > thr || partner || (spd < 0.3 && L.idleT > 0.45) || urgent) {
        L.from.copy(L.foot);
        this.ideal(L, L.to, lead);
        L.step = 0;
        L.dur = dur * (partner ? 1 : rnd(0.85, 1.15));
        stepping++;
        prog[L.grp] = 0;
        L.idleT = 0;
        if (mode === 'creep') this.creepPause = rnd(0.05, 0.35);
      }
    }
  }
  onPlant(L, spd) {
    // el tronco se hunde con cada apoyo; al galope cabecea (manos, pies)
    this.hS.kick(-0.35 - spd * 0.05);
    if (this.gaitMode === 'gallop') {
      this.pitchS.kick(L.front ? 1.4 : -1.1);
      this.bendS.kick(L.front ? -1.6 : 1.6);
    }
    const g = this.g;
    if (g.audio && g.time - this.stepSnd > 0.11 && Math.random() < 0.7) {
      this.stepSnd = g.time;
      const d = Math.hypot(g.player.pos.x - this.e.pos.x, g.player.pos.z - this.e.pos.z);
      if (d < 22 && this.e.obj.visible) g.audio.enemyStep(this.e);
    }
  }

  // ------------------------------------------------------------------ IK
  // Dos huesos en el espacio del padre (tronco o pelvis): el codo por encima
  // y hacia fuera.
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
    // (en un túnel, codos y rodillas se doblan hacia delante y hacia atrás,
    // no hacia arriba: no caben)
    const nw = this.narrow || 0;
    // (a ras de suelo y hacia los lados, como un lagarto)
    const pole = _b.set(L.side * lerp(0.62, 0.95, nw), lerp(1, -0.2, nw), (L.front ? 1 : -1) * lerp(0.3, 0.15, nw));
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

  // ------------------------------------------------------------------ saltos
  // De un plano a otro (suelo <-> techo) o por el aire hasta un punto; flip:
  // vuelta de campana (radianes; negativo = hacia atrás).
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
      flip: o.flip ?? 0,
      tuck: o.tuck ?? 0,
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

  // Oscurece el cuerpo (k = 1, como siempre; 0, negro): al meterse en sus
  // grutas se funde con lo oscuro del túnel y sólo le quedan los ojos (la
  // carne deja de relucir también).
  setShade(k) {
    k = clamp(k, 0, 1);
    const cur = this._shade ?? 1;
    // (sin cambio apreciable no se tocan los materiales; los extremos, exactos)
    if (k === cur || (Math.abs(k - cur) < 0.003 && k !== 0 && k !== 1)) return;
    this._shade = k;
    const rig = this.e.rig;
    rig.own();
    if (!this._eyeMats) this._eyeMats = new Set(rig.meshes.filter((q) => q.userData.matName === 'eyeGlow').map((q) => q.material));
    for (const m of rig.mats) {
      const ud = m.userData;
      if (this._eyeMats.has(m)) continue;
      if (m.color) {
        if (!ud.baseColor) ud.baseColor = m.color.clone();
        m.color.copy(ud.baseColor).multiplyScalar(k);
      }
      if (m.emissive) {
        if (ud.baseEI0 === undefined) ud.baseEI0 = m.emissiveIntensity;
        m.emissiveIntensity = ud.baseEI0 * k;
      }
    }
  }

  // Un golpe recibido se nota en todo el cuerpo: se aparta del golpe, se
  // tuerce y la cabeza da un latigazo.
  flinch(fromX, fromZ, heavy) {
    const e = this.e;
    const [lx, lz] = this.toLocal(fromX, fromZ);
    const d = Math.hypot(lx, lz) || 1;
    const k = heavy ? 2.6 : 1.5;
    this.shX.kick((-lx / d) * k);
    this.shZ.kick((-lz / d) * k);
    this.rollS.kick((lx / d) * k * 1.4);
    this.pitchS.kick((lz / d) * k * 1.2);
    this.twistS.kick((lx > 0 ? -1 : 1) * k * 1.3);
    this.hS.kick(heavy ? -2.2 : -1.1);
    this.tiltT = (Math.random() < 0.5 ? -1 : 1) * rnd(0.6, 1.3);
    this.jawT = Math.max(this.jawT, 0.7);
    // la mano del lado del golpe se levanta un instante
    const L = this.L[lx > 0 ? 0 : 1];
    if (L.step < 0 && L.ovTo <= 0 && !this.air && this.plane === 'floor') {
      L.from.copy(L.foot);
      this.ideal(L, L.to, 0);
      L.step = 0;
      L.dur = 0.3;
    }
    e.flash = Math.max(e.flash, 0.12);
  }

  // ------------------------------------------------------------------ cuadro
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
    // cansancio (respira más deprisa) y rabia
    this.exert = Math.max(0, this.exert - dt * 0.08) + (spd > 4 ? dt * 0.05 : 0);
    this.exert = Math.min(1, this.exert);
    // tronco: altura, cabeceo, alabeo, giro y las dos mitades, con muelles
    const bob = Math.sin(t * 1.3 + e.phase) * 0.025 + (this.gaitMode === 'creep' ? -0.12 : 0);
    const h = this.hS.update(dt, T.h + bob);
    const pitch = this.pitchS.update(dt, T.pitch + clamp(this.acc * 0.025, -0.3, 0.3) - this.rear * 0.9);
    const roll = this.rollS.update(dt, T.roll + clamp(-this.yawRate * spd * 0.03, -0.35, 0.35));
    const shx = this.shX.update(dt, T.shx),
      shz = this.shZ.update(dt, T.shz);
    const byaw = this.yawS.update(dt, T.yaw);
    const bend = this.bendS.update(dt, T.bend + this.rear * 0.35);
    const twist = this.twistS.update(dt, T.twist - clamp(this.yawRate * 0.12, -0.45, 0.45) - byaw * 0.5);
    // techo bajo el que va
    const cy = this.ceilAt(e.pos.x, e.pos.z);
    this.ceilY = this.ceilY === null ? cy : damp(this.ceilY, cy, 6, dt);
    // raíz: en el suelo, en el techo (boca abajo) o por el aire
    let rollZ = 0,
      flipX = 0,
      tuck = 0,
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
      // la vuelta de campana, con el cuerpo recogido en medio
      flipX = A.flip * sm(lin(u, 0.05, 0.9));
      tuck = A.tuck * Math.sin(Math.PI * u);
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
    if (flipX) obj.quaternion.multiply(_qc.setFromAxisAngle(AX, flipX));
    _a.set(0, h, 0).applyQuaternion(obj.quaternion);
    obj.position.set(cx - _a.x, Cy - _a.y, cz - _a.z);
    // las patas
    if (!A) this.gait(dt);
    for (const L of this.L) L.ovW = approach(L.ovW, L.ovTo, dt * (L.ovTo > L.ovW ? 9 : 7));
    const pose = this.pose;
    // espasmos: de vez en cuando algo se le tuerce solo, de golpe
    const jerk = (k) => {
      const v = Math.sin(t * 1.7 + k * 2.3) * Math.sin(t * 0.61 + k);
      return v > 0.82 ? Math.sin(t * 53 + k * 7) * 0.25 : 0;
    };
    const rk = this.rageK;
    const tremble = rk * 0.04 * Math.sin(t * 47) * Math.sin(t * 13.1);
    const fx = e.flX.update(dt),
      fy = e.flY.update(dt);
    pose.body = [pitch + fx * 0.05 + jerk(1) * 0.2 + tremble, byaw + fy * 0.05 + jerk(2) * 0.15, roll + tremble];
    pose.pelvis = [bend + jerk(4) * 0.12, twist, -roll * 0.35 + (this.gaitMode === 'walk' ? Math.sin(t * 7) * spd * 0.012 : 0)];
    const body = rig.joints.body;
    body.position.set(shx, h, shz);
    body.quaternion.copy(e2q(pose.body, _qc));
    const pel = rig.joints.pelvis;
    pel.quaternion.copy(e2q(pose.pelvis, _qc));
    obj.updateMatrixWorld(true);
    _invB.copy(body.matrixWorld).invert();
    _invP.copy(pel.matrixWorld).invert();
    body.getWorldQuaternion(_qBw);
    pel.getWorldQuaternion(_qPw);
    for (const L of this.L) {
      const P = this.footPos(L, _p);
      if (A) {
        // en el aire: brazos por delante, piernas recogidas atrás (y, en la
        // voltereta, todo pegado al cuerpo)
        const s = L.side;
        const reach = A.to === 'floor' && A.x1 !== A.x0 ? 1 : 0.4;
        const tk = 1 - tuck * 0.55;
        this.localPoint(L.front ? s * 0.9 * tk : s * 0.8 * tk, L.front ? 0.2 + tuck * 0.5 : 0.55 + tuck * 0.4, (L.front ? 1.6 + reach * 0.6 : -1.7) * tk, P);
      }
      if (L.ovW > 0) P.lerp(L.ov, L.ovW);
      this.solve(L, P.applyMatrix4(L.par === 'pelvis' ? _invP : _invB), pose);
      // la mano: dedos cerrados al levantarla, abiertos al apoyarla
      if (L.front) {
        L.curlT = L.curlHold !== null ? L.curlHold : L.step >= 0 || A ? 0.6 : L.ovW > 0.5 ? 0.45 : 0.05;
        L.curl = damp(L.curl, L.curlT, L.curlHold !== null ? 16 : 10, dt);
        L.wrist = damp(L.wrist, L.step >= 0 ? 0.45 : L.curlHold !== null ? -0.25 : 0, 10, dt);
        pose[L.n + 'H'] = [L.wrist + jerk(L.side + 5) * 0.4, 0, 0];
        pose[L.n + 'F'] = [L.curl * 1.35 + Math.sin(t * 3.1 + L.side) * 0.05 * (1 - L.curl), 0, 0];
      }
    }
    this.headPose(dt, pose);
    this.clothPose(dt, pose, spd);
    rig.apply(pose);
    for (const j in e.lastPose) if (!(j in pose)) delete e.lastPose[j];
    for (const j in pose) e.lastPose[j] = pose[j];
    // respiración: las costillas se abren y se cierran
    const rate = 1.1 + this.exert * 2.6 + rk * 1.8;
    this.breath += dt * rate * Math.PI * 2 * 0.5;
    const br = Math.sin(this.breath) * (0.45 + this.exert * 0.6 + rk * 0.4) + (e.dead ? 0 : 0);
    rig.joints.ribs.scale.set(1 + br * 0.05, 1 + br * 0.14, 1 + br * 0.03);
    // centro (percepción, cámara) y sombra en el suelo (en el techo, sólo la
    // sombra lo delata)
    body.updateMatrixWorld(true);
    this.center.setFromMatrixPosition(body.matrixWorld);
    const gy = this.groundAt(this.center.x, this.center.z);
    e.shadow.position.set(this.center.x, gy + 0.02, this.center.z);
    // (metido en lo oscuro de una gruta, tampoco hay sombra)
    e.shadow.visible = (this._shade ?? 1) > 0.35;
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

  headPose(dt, pose) {
    const t = this.g.time;
    const e = this.e;
    let yaw = 0,
      pit = 0;
    if (this.lookW > 0.001) {
      const l = _a.copy(this.lookP).applyMatrix4(_invB);
      const dx = l.x,
        dy = l.y - 0.02,
        dz = l.z - 0.6;
      yaw = clamp(Math.atan2(dx, dz), -1.35, 1.35) * this.lookW;
      pit = clamp(Math.atan2(dy, Math.hypot(dx, dz)), -0.9, 0.9) * this.lookW;
    }
    // escudriña: la cabeza barre de lado a lado (cuando no te ve)
    if (this.scan > 0.01) yaw = lerp(yaw, Math.sin(t * 0.9) * 1.15 + Math.sin(t * 2.3) * 0.15, this.scan);
    this.lookY = lerp(this.lookY, yaw, 1 - Math.exp(-9 * dt));
    this.lookX = lerp(this.lookX, pit, 1 - Math.exp(-7 * dt));
    this.twist = lerp(this.twist, this.twistT, 1 - Math.exp(-3.2 * dt));
    // de vez en cuando la cabeza se tuerce sola, de golpe
    this.tiltClock -= dt;
    if (this.tiltClock <= 0) {
      this.tiltClock = rnd(1.5, 5) / (1 + this.rageK);
      this.tiltT = Math.random() < 0.45 ? rnd(-1.2, 1.2) : 0;
    }
    this.tilt = lerp(this.tilt, this.tiltT, 1 - Math.exp(-14 * dt));
    this.eat = approach(this.eat, this.eatT, dt * 2.2);
    this.jaw = lerp(this.jaw, this.jawT, 1 - Math.exp(-16 * dt));
    this.neckExt = lerp(this.neckExt, this.neckExtT, 1 - Math.exp(-14 * dt));
    this.shake = Math.max(0, this.shake - dt * 1.5);
    const eat = this.eat;
    const chew = eat * (Math.sin(t * 9.3) * 0.5 + 0.5);
    const tear = eat * Math.sin(t * 5.7) * Math.sin(t * 13.1);
    // rabia: la cabeza tiembla y a ratos se sacude entera
    const sh = Math.min(1, this.shake + this.rageK * 0.25);
    const shY = sh * (Math.sin(t * 31) * 0.14 + Math.sin(t * 17.3) * 0.1);
    const shX = sh * Math.sin(t * 27.1) * 0.1;
    const hy = this.lookY + this.twist + shY;
    // cuello estirado (mordisco): recto hacia delante; también a rastras
    // por sus túneles (si no, la cabeza le colgaría por el suelo)
    const ne = Math.max(this.neckExt, this.narrow || 0);
    // (el cuello cuelga hacia el suelo desde el pecho; estirado apunta
    // hacia delante y la cabeza se endereza para morder)
    pose.neck = [lerp(26 * 0.01745 + eat * 0.8 + Math.sin(t * 1.1) * 0.05, -1.15, ne), hy * 0.45 * (1 - ne * 0.6) + tear * 0.35, Math.sin(t * 0.5) * 0.1 + this.rear * 0.2];
    pose.head = [lerp(30 * 0.01745 - this.lookX * 0.85 + eat * (0.2 + Math.sin(t * 8.1) * 0.25), 1.45, ne) + shX, hy * 0.55 + tear * 0.25, this.tilt * (1 - ne) + (e.dead ? 0.8 : 0)];
    // castañeteo (se ríe) o mastica o grita
    const chat = this.chatter > 0 ? Math.max(0, Math.sin(t * 38)) * 0.35 * this.chatter : 0;
    pose.jaw = [-(this.jaw * 0.85 + chew * 0.45 + chat), 0, 0];
  }

  // Jirones: cada uno busca colgar hacia el suelo (en el espacio de su
  // padre), arrastrado por el viento de la carrera; un muelle por jirón y
  // nunca por dentro del tronco.
  clothPose(dt, pose, spd) {
    const e = this.e;
    const t = this.g.time;
    const vx = e.vx,
      vz = e.vz,
      vy = (this.center.y - (this._cy ?? this.center.y)) / Math.max(dt, 1e-3);
    this._cy = this.center.y;
    const k = 55,
      dmp = 5.5;
    this.cloth.forEach((c, i) => {
      const q = c.par === 'pelvis' ? _qPw : _qBw;
      _qa.copy(q).invert();
      // gravedad + arrastre (en el mundo) -> espacio del padre
      _g.set(-vx * 0.09 + Math.sin(t * 2.3 + i) * 0.05, -1 - Math.min(0, vy) * 0.03, -vz * 0.09 + Math.sin(t * 1.7 + i * 1.3) * 0.05);
      if (this.air) _g.y += 0.6;
      _g.applyQuaternion(_qa).normalize();
      // muelle sobre la dirección
      c.vel.addScaledVector(_g.sub(c.dir), k * dt).multiplyScalar(Math.max(0, 1 - dmp * dt));
      c.dir.addScaledVector(c.vel, dt).normalize();
      // no atravesar el tronco: los de los lados se abren por fuera; el de
      // atrás, por detrás
      if (c.back) {
        if (c.dir.z > 0.25) c.dir.z = 0.25;
        if (c.dir.y > -0.1) c.dir.z = Math.min(c.dir.z, -0.55);
      } else {
        if (c.dir.x * c.sx < -0.25) c.dir.x = -0.25 * c.sx;
        if (c.dir.y > -0.15 && c.dir.x * c.sx < 0.55) c.dir.x = 0.55 * c.sx;
      }
      c.dir.normalize();
      _qb.setFromUnitVectors(DOWN, c.dir);
      pose['cl' + i] = q2e(_qb, pose['cl' + i] || [0, 0, 0]);
    });
    void spd;
  }

  eyes(dt) {
    const e = this.e;
    this.eyeK = lerp(this.eyeK, this.eyeT * (1 + (e.flare || 0) * 3), 1 - Math.exp(-6 * dt));
    if (!e._eyes) {
      e.rig.own();
      e._eyes = e.rig.meshes.filter((m) => m.userData.matName === 'eyeGlow');
      this._eyeC0 = e._eyes[0] ? e._eyes[0].material.emissive.clone() : new THREE.Color(0xffc070);
    }
    // enloquecido: los ojos se le ponen rojos
    this.eyeRed = damp(this.eyeRed, this.rageK, 2, dt);
    // (cuando los abre del todo, un halo: en lo oscuro sólo se le ven los ojos)
    // (los dos ojos van en una misma malla: un halo en cada punta de su caja)
    if (!this._halos) {
      this._halos = [];
      for (const m of e._eyes) {
        m.geometry.computeBoundingBox();
        const bb = m.geometry.boundingBox;
        const w = bb.max.x - bb.min.x;
        for (const x of [bb.min.x + w * 0.12, bb.max.x - w * 0.12]) {
          const sp = new THREE.Sprite(additiveFog(new THREE.SpriteMaterial({ map: getTexture('glow'), color: 0xffb060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: true })));
          sp.position.set(x, (bb.min.y + bb.max.y) / 2, bb.max.z);
          sp.renderOrder = 3;
          sp.userData.eye = m;
          m.add(sp);
          this._halos.push(sp);
        }
      }
    }
    for (const m of e._eyes) {
      m.material.emissiveIntensity = (m.userData.baseEI ?? 2.2) * this.eyeK;
      if (!e._flashing) m.material.emissive.copy(this._eyeC0).lerp(_RED, this.eyeRed);
    }
    const halo = clamp((this.eyeK - 0.95) * 0.75, 0, 0.75);
    for (const sp of this._halos) {
      sp.visible = halo > 0.01;
      if (!sp.visible) continue;
      sp.material.opacity = halo;
      sp.material.color.copy(sp.userData.eye.material.emissive);
      sp.userData.eye.getWorldScale(_ws);
      sp.scale.set(0.2 / _ws.x, 0.2 / _ws.y, 1);
    }
    e.flare = Math.max(0, (e.flare || 0) - dt * 1.8);
  }
}
const _RED = new THREE.Color(1, 0.1, 0.04);
const _ws = new THREE.Vector3();

Object.assign(Desc.prototype, MOVES, MIND);

// ------------------------------------------------------------ enganche
// (TYPES.descoyuntado.init / ai / animate / onReset / onHit / preHit)
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
export function descOnHit(e, r, dmg, heavy) {
  if (e.D) e.D.onHit(r, dmg, heavy);
}
export function descPreHit(e, dmg, poise, fromX, fromZ, heavy) {
  return e.D ? e.D.preHit(dmg, poise, fromX, fromZ, heavy) : null;
}
