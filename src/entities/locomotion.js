// Locomoción bípeda procedural.
//  - Ciclo de marcha cuya zancada se ajusta a la velocidad: el pie apoyado
//    retrocede exactamente a la velocidad del cuerpo, así que no patina.
//  - IK analítica de dos huesos (cadera-rodilla-tobillo) con polo de rodilla.
//  - Cadera que sube, baja, oscila y gira; hombros en contragiro; inclinación
//    al acelerar y en las curvas; pasitos al girar en el sitio.
//  - Los pies se adaptan a escalones y los clips de acción se "aterrizan".
import * as THREE from 'three';
import { e2q, q2e, slerpE } from './rig.js';
import { clamp, lerp, damp, angleDiff, DEG } from '../core/util.js';

const TAU = Math.PI * 2;
const Z3 = [0, 0, 0];
const fract = (x) => x - Math.floor(x);
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const _hp = new THREE.Vector3();
const _hq = new THREE.Quaternion();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();
const _e = new THREE.Vector3();
const _f = new THREE.Vector3();
const _g = new THREE.Vector3();
const _h = new THREE.Vector3();
const _t = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _q3 = new THREE.Quaternion();
const _q4 = new THREE.Quaternion();
const _ef = [0, 0, 0];

// Estilos de marcha (valores en metros para una escala 1 y grados).
export const GAIT = {
  soldier: {},
  shamble: { strideBase: 0.55, strideK: 0.36, liftWalk: 0.07, bobWalk: 0.012, swayWalk: 0.045, rollWalk: 5, twistWalk: 5, limp: 0.35, lean: 8 },
  heavy: { strideBase: 0.9, strideK: 0.3, liftWalk: 0.12, bobWalk: 0.04, swayWalk: 0.06, rollWalk: 4, twistWalk: 6, crouchWalk: 0.06, lean: 6, dutyWalk: 0.66 },
  glide: { liftWalk: 0.02, bobWalk: 0.0, swayWalk: 0.01, twistWalk: 2 },
};

const DEFAULT_STYLE = {
  strideBase: 0.8, // m por ciclo (dos pasos)
  strideK: 0.4, // m de zancada extra por m/s
  strideMin: 0.9,
  strideMax: 3.2,
  runFrom: 2.6, // m/s donde empieza a trotar
  runTo: 4.4,
  dutyWalk: 0.62, // fracción del ciclo con el pie apoyado
  dutyRun: 0.36,
  liftWalk: 0.1,
  liftRun: 0.24,
  crouchIdle: 0.012,
  crouchWalk: 0.03,
  crouchRun: 0.075,
  bobWalk: 0.022,
  bobRun: 0.035,
  swayWalk: 0.028,
  swayRun: 0.012,
  rollWalk: 3,
  rollRun: 2,
  twistWalk: 7,
  twistRun: 11,
  chestTwistWalk: 6,
  chestTwistRun: 10,
  lean: 2,
  leanRun: 11,
  armWalk: 16,
  armRun: 38,
  width: 1,
  limp: 0,
};

export class Biped {
  constructor(rig, o = {}) {
    const R = rig.rest;
    this.rig = rig;
    this.hipsRest = R.hips.pos.clone();
    this.legOff = { L: R.legL.pos.clone(), R: R.legR.pos.clone() };
    this.L1 = R.shinL.pos.length();
    this.hasFeet = !!R.footL;
    this.L2 = this.hasFeet ? R.footL.pos.length() : this.L1;
    // altura del tobillo sobre el suelo con la pierna estirada en reposo
    this.ankleH = o.ankleH ?? Math.max(0.02, this.hipsRest.y + this.legOff.L.y - this.L1 - this.L2);
    this.scale = o.scale ?? 1;
    this.S = { ...DEFAULT_STYLE, ...(o.style || {}) };
    this.stance = o.stance ?? 0.1; // pie izquierdo adelantado en reposo
    this.phase = Math.random();
    this.seed = Math.random() * 10;
    this.mw = 0;
    this.runW = 0;
    this.spd = 0;
    this.vf = 0;
    this.acc = 0;
    this.yawRate = 0;
    this._yaw = null;
    this.lean = 0;
    this.bank = 0;
    this.drop = 0;
    this.armSwing = 0;
    this.elbow = 0;
    this.duty = this.S.dutyWalk;
    this.target = { L: new THREE.Vector3(), R: new THREE.Vector3() };
    this.pitch = { L: 0, R: 0 };
    this.gOff = { L: 0, R: 0 };
    this._u = { L: 0, R: 0.5 };
    this.onStep = null;
    this.pose = {};
    this._legE = { L: [0, 0, 0], R: [0, 0, 0] };
    this._footE = { L: [0, 0, 0], R: [0, 0, 0] };
  }

  // vx, vz: velocidad en el mundo; yaw: orientación del cuerpo.
  // o: { time, grounded, crouch, lean, exert, ground(x,z)->y, pos }
  update(dt, vx, vz, yaw, o = {}) {
    const S = this.S,
      k = this.scale;
    dt = Math.max(1e-4, dt);
    const sy = Math.sin(yaw),
      cy = Math.cos(yaw);
    // espacio del personaje: +z delante, +x izquierda
    const vf = vx * sy + vz * cy,
      vs = vx * cy - vz * sy;
    const spd = Math.hypot(vf, vs);
    this.acc = damp(this.acc, clamp((vf - this.vf) / dt, -14, 14), 5, dt);
    this.vf = vf;
    this.spd = damp(this.spd, spd, 14, dt);
    if (this._yaw === null) this._yaw = yaw;
    const yr = angleDiff(this._yaw, yaw) / dt;
    this._yaw = yaw;
    this.yawRate = damp(this.yawRate, clamp(yr, -14, 14), 8, dt);

    const v = this.spd / k;
    const air = o.grounded === false;
    const moveT = sstep(0.06, 0.75, v);
    this.mw = air ? this.mw : damp(this.mw, moveT, 9, dt);
    this.runW = damp(this.runW, sstep(S.runFrom, S.runTo, v), 5, dt);
    const run = this.runW,
      mw = this.mw;
    const stride = clamp(S.strideBase + S.strideK * v, S.strideMin, S.strideMax) * k;
    // girar sin avanzar: pasitos en el sitio
    const shuffle = (1 - mw) * sstep(1.0, 2.6, Math.abs(this.yawRate));
    const freq = this.spd / stride + shuffle * 1.7;
    const prevPhase = this.phase;
    if (!air) this.phase = fract(this.phase + freq * dt);
    const duty = (this.duty = lerp(S.dutyWalk, S.dutyRun, run));
    const D = stride * duty * mw;
    const dirF = spd > 0.05 ? vf / spd : 1,
      dirS = spd > 0.05 ? vs / spd : 0;
    const liftH = (lerp(S.liftWalk, S.liftRun, run) * mw + shuffle * 0.06) * k;
    const limp = S.limp;

    for (const side of ['L', 'R']) {
      const off = side === 'L' ? 0 : 0.5;
      const u = fract(this.phase + off);
      const up = this._u[side];
      // pisada: el pie pasa de vuelo a apoyo
      if (!air && up > u + 0.5 && (mw > 0.25 || shuffle > 0.3) && this.onStep) this.onStep(side, mw);
      this._u[side] = u;
      let along,
        lift = 0,
        pitch;
      if (u < duty) {
        const s = u / duty;
        along = D * (0.5 - s);
        pitch = s < 0.16 ? lerp(-0.26, 0, s / 0.16) * (1 - run * 0.7) : s < 0.6 ? 0 : lerp(0, 0.55, (s - 0.6) / 0.4);
      } else {
        const s = (u - duty) / (1 - duty);
        const e = s * s * (3 - 2 * s);
        along = D * (-0.5 + e);
        lift = liftH * Math.pow(Math.sin(Math.PI * s), 0.85) * (side === 'R' ? 1 - limp * 0.6 : 1);
        pitch = s < 0.5 ? lerp(0.55, 0.15, s / 0.5) : lerp(0.15, -0.26 * (1 - run * 0.7), (s - 0.5) / 0.5);
      }
      pitch *= Math.max(mw, shuffle * 0.5);
      const sg = side === 'L' ? 1 : -1;
      const wid = this.legOff[side].x * S.width * (1 - run * 0.18);
      const idleZ = sg * this.stance * k * 0.5 * (1 - mw);
      const t = this.target[side];
      // el tobillo sube al despegar la puntera y al apoyar el talón
      const roll = Math.max(0, pitch) * 0.15 * k + Math.max(0, -pitch) * 0.06 * k;
      t.set(wid + dirS * along, this.ankleH + lift + roll, idleZ + dirF * along);
      this.pitch[side] = pitch;
      // adaptación al terreno (escalones)
      if (o.ground && o.pos) {
        const wx = o.pos.x + t.x * cy + t.z * sy,
          wz = o.pos.z - t.x * sy + t.z * cy;
        const gy = o.ground(wx, wz);
        const offG = gy === null || gy === undefined ? 0 : clamp(gy - o.pos.y, -0.55, 0.55);
        this.gOff[side] = damp(this.gOff[side], offG, 16, dt);
      } else this.gOff[side] = damp(this.gOff[side], 0, 10, dt);
    }
    this.drop = damp(this.drop, Math.min(0, this.gOff.L, this.gOff.R), 12, dt);

    // pelvis
    const p2 = fract(this.phase * 2);
    const bob = lerp(S.bobWalk, -S.bobRun, run) * mw * k * Math.cos(TAU * (p2 - duty)) - limp * 0.03 * mw * k * Math.max(0, Math.cos(TAU * (this.phase - 0.5 - duty / 2)));
    const crouch = (lerp(S.crouchIdle, lerp(S.crouchWalk, S.crouchRun, run), mw) + (o.crouch || 0)) * k;
    const sway = lerp(S.swayWalk, S.swayRun, run) * mw * k * Math.cos(TAU * (this.phase - duty / 2));
    const tw = lerp(S.twistWalk, S.twistRun, run) * mw * DEG;
    const pelvisYaw = -tw * Math.cos(TAU * this.phase);
    const pelvisRoll = lerp(S.rollWalk, S.rollRun, run) * mw * DEG * Math.cos(TAU * (this.phase - duty / 2));
    const leanT = (S.lean + S.leanRun * run) * DEG * mw + clamp(this.acc * 0.018, -0.14, 0.16) * mw + (o.lean || 0);
    this.lean = damp(this.lean, leanT, 6, dt);
    const bankT = clamp(-this.yawRate * this.spd * 0.028, -0.22, 0.22) * mw;
    this.bank = damp(this.bank, bankT, 6, dt);
    const time = o.time ?? 0;
    const idle = 1 - mw;
    const breath = Math.sin(time * (1.7 + (o.exert || 0) * 2.4) + this.seed);
    const shift = Math.sin(time * 0.43 + this.seed) * 0.012 * k * idle;
    const P = this.pose;
    for (const j in P) delete P[j];
    P.root = [sway + shift, bob - crouch + this.drop, 0];
    P.hips = [this.lean * 0.35, pelvisYaw, pelvisRoll + this.bank];
    const ctw = lerp(S.chestTwistWalk, S.chestTwistRun, run) * mw * DEG * Math.cos(TAU * this.phase);
    P.chest = [this.lean * 0.65 + breath * 0.014 * (1 + (o.exert || 0)), -pelvisYaw + ctw, -pelvisRoll * 0.7 - this.bank * 0.35 - shift * 1.5];
    P.head = [-this.lean * 0.75 - breath * 0.008, -ctw * 0.6, -this.bank * 0.4];
    this.armSwing = lerp(S.armWalk, S.armRun, run) * mw * DEG * Math.cos(TAU * this.phase);
    this.elbow = run * mw;
    this.phaseDelta = fract(this.phase - prevPhase);
    return P;
  }

  // Posición del tobillo de un clip (cinemática directa) en espacio del personaje.
  ankleFK(pose, side, out) {
    const hr = this.hipsRest,
      root = pose.root || Z3;
    _hp.set(hr.x + root[0], hr.y + root[1], hr.z + root[2]);
    e2q(pose.hips || Z3, _hq);
    const hip = out.copy(this.legOff[side]).applyQuaternion(_hq).add(_hp);
    _q1.copy(_hq).multiply(e2q(pose['leg' + side] || Z3, _q2));
    hip.add(_a.set(0, -this.L1, 0).applyQuaternion(_q1));
    _q1.multiply(e2q(pose['shin' + side] || Z3, _q2));
    return hip.add(_a.set(0, -this.L2, 0).applyQuaternion(_q1));
  }

  // Resuelve las piernas y escribe legX/shinX/footX en la pose.
  // o.clip: {pose, w, ground}: un clip de acción que también mueve las piernas.
  solve(pose, o = {}) {
    const clipW = o.clipW || 0;
    const clipPose = o.clipPose;
    // piernas del clip "aterrizadas": sus tobillos se proyectan al suelo
    for (const side of ['L', 'R']) {
      const tgt = _t.copy(this.target[side]);
      if (clipPose && clipW > 0) {
        const fk = this.ankleFK(clipPose, side, _b);
        if (o.clipGround) fk.y = Math.max(this.ankleH, Math.min(fk.y, this.ankleH + 0.35 * this.scale));
        tgt.lerp(fk, clipW);
      }
      tgt.y += this.gOff[side];
      const hr = this.hipsRest,
        root = pose.root || Z3;
      _hp.set(hr.x + root[0], hr.y + root[1], hr.z + root[2]);
      e2q(pose.hips || Z3, _hq);
      this._leg(side, _hp, _hq, tgt, this.pitch[side] * (1 - clipW), pose, o.w ?? 1);
    }
  }

  _leg(side, hipsPos, hipsQ, tgt, pitch, pose, w) {
    const L1 = this.L1,
      L2 = this.L2;
    const hip = _a.copy(this.legOff[side]).applyQuaternion(hipsQ).add(hipsPos);
    const toT = _c.subVectors(tgt, hip);
    let d = toT.length();
    const maxD = (L1 + L2) * 0.9995;
    if (d > maxD) d = maxD;
    d = Math.max(0.06, d);
    const n = toT.normalize();
    const A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const flex = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
    // polo de la rodilla: delante y un poco hacia fuera, girado con la cadera
    const sg = side === 'L' ? 1 : -1;
    const pole = _d.set(sg * 0.16, 0, 1);
    const hy = Math.atan2(2 * (hipsQ.w * hipsQ.y + hipsQ.x * hipsQ.z), 1 - 2 * (hipsQ.y * hipsQ.y + hipsQ.x * hipsQ.x));
    pole.applyAxisAngle(_e.set(0, 1, 0), hy);
    pole.addScaledVector(n, -pole.dot(n));
    if (pole.lengthSq() < 1e-6) pole.set(0, 0, 1);
    pole.normalize();
    const thigh = _e.copy(n).multiplyScalar(Math.cos(A)).addScaledVector(pole, Math.sin(A));
    const Y = _f.copy(thigh).negate();
    const Zv = _g.copy(pole).addScaledVector(Y, -pole.dot(Y)).normalize();
    const X = _h.crossVectors(Y, Zv).normalize();
    _m.makeBasis(X, Y, Zv);
    _q1.setFromRotationMatrix(_m); // muslo en espacio del personaje
    _q2.copy(hipsQ).invert().multiply(_q1);
    const legE = q2e(_q2, this._legE[side]);
    // espinilla: flexión pura de rodilla
    const shinE = [flex, 0, 0];
    // pie: plano respecto al personaje + balanceo de la marcha
    _q3.setFromAxisAngle(_d.set(1, 0, 0), flex);
    _q4.copy(_q1).multiply(_q3).invert(); // (muslo·espinilla)^-1
    _q3.setFromAxisAngle(_d.set(1, 0, 0), pitch);
    _q4.multiply(_q3);
    const footE = q2e(_q4, this._footE[side]);
    const set = (j, v) => {
      if (w >= 1 || !pose[j]) pose[j] = [v[0], v[1], v[2]];
      else pose[j] = slerpE(pose[j], v, w, pose[j]);
    };
    set('leg' + side, legE);
    set('shin' + side, shinE);
    if (this.hasFeet) set('foot' + side, footE);
  }
}

// Mantiene un escudo mirando al frente (con el pecho) aunque el antebrazo
// adopte cualquier pose: nunca apunta al cielo ni atraviesa el cuerpo.
// Llamar después de rig.apply(); o = { w, yaw, pitch, roll, out, along, raise }
const _sq = new THREE.Quaternion();
const _sw = new THREE.Quaternion();
const _sp = new THREE.Vector3();
const _sm = new THREE.Matrix4();
const _sE = new THREE.Euler();
export function stabilizeShield(rig, o = {}) {
  const sj = rig.joints.shield;
  const fore = rig.joints.foreL;
  const chest = rig.joints.chest;
  if (!sj || !fore || !chest) return;
  rig.root.updateMatrixWorld(true);
  // orientación deseada: la del pecho, girada hacia fuera e inclinada atrás
  chest.getWorldQuaternion(_sq);
  _sE.set(o.pitch ?? -0.12, o.yaw ?? 0.3, o.roll ?? 0, 'YXZ');
  _sq.multiply(_sw.setFromEuler(_sE));
  // posición: sobre el antebrazo, desplazado hacia fuera de la cara del escudo
  _sp.set(0, -(o.along ?? 0.13), 0).applyMatrix4(fore.matrixWorld);
  _sp.add(_c.set(0, o.raise ?? 0, o.out ?? 0.07).applyQuaternion(_sq));
  // pasar a coordenadas locales del antebrazo
  fore.getWorldQuaternion(_sw);
  const w = o.w ?? 0.9;
  const attached = _q1.copy(_sw).multiply(rig.restQ.shield || _q2.identity());
  attached.slerp(_sq, w);
  sj.quaternion.copy(_sw.invert().multiply(attached));
  _sm.copy(fore.matrixWorld).invert();
  sj.position.copy(_sp.applyMatrix4(_sm));
  sj.updateMatrixWorld(true);
}

// ------------------------------------------------------------ IK de brazos
// Canales de pose (espacio del pecho: +z delante, +y arriba, +x izquierda):
//   ikR / ikL      posición de la muñeca (m)
//   bladeR / bladeL dirección de la hoja [yaw, pitch, roll] (rad): yaw>0 hacia
//                  la izquierda, pitch>0 hacia arriba, roll gira el filo
//   elbowR / elbowL dirección del codo (opcional)
// Se convierten en rotaciones de armX/foreX/handX.
const _S = new THREE.Vector3();
const _W = new THREE.Vector3();
const _E = new THREE.Vector3();
const _n = new THREE.Vector3();
const _pp = new THREE.Vector3();
const _up = new THREE.Vector3();
const _X = new THREE.Vector3();
const _Y = new THREE.Vector3();
const _Z = new THREE.Vector3();
const _bd = new THREE.Vector3();
const _qu = new THREE.Quaternion();
const _qf = new THREE.Quaternion();
const _qh = new THREE.Quaternion();
const _qt = new THREE.Quaternion();
const _mb = new THREE.Matrix4();
const _axX = new THREE.Vector3(1, 0, 0);

export function bladeDir(b, out = new THREE.Vector3()) {
  const cp = Math.cos(b[1]);
  return out.set(Math.sin(b[0]) * cp, Math.sin(b[1]), Math.cos(b[0]) * cp);
}

export function solveArm(pose, rig, side) {
  const ik = pose['ik' + side];
  if (!ik) return;
  const R = rig.rest;
  const arm = R['arm' + side],
    fore = R['fore' + side],
    hand = R['hand' + side];
  if (!arm || !fore || !hand) return;
  const L1 = fore.pos.length(),
    L2 = hand.pos.length();
  _S.copy(arm.pos);
  _W.set(ik[0], ik[1], ik[2]);
  const toT = _n.subVectors(_W, _S);
  let d = toT.length();
  d = clamp(d, 0.05, (L1 + L2) * 0.999);
  toT.normalize();
  const A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const flex = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
  const sg = side === 'L' ? 1 : -1;
  const el = pose['elbow' + side];
  const pole = el ? _pp.set(el[0], el[1], el[2]) : _pp.set(sg * 0.55, -0.75, -0.4);
  pole.normalize();
  pole.addScaledVector(toT, -pole.dot(toT));
  if (pole.lengthSq() < 1e-6) pole.set(sg, 0, 0).addScaledVector(toT, -toT.x * sg);
  pole.normalize();
  const upper = _up.copy(toT).multiplyScalar(Math.cos(A)).addScaledVector(pole, Math.sin(A));
  _E.copy(_S).addScaledVector(upper, L1);
  _Y.copy(upper).negate();
  _Z.subVectors(_W, _E);
  _Z.addScaledVector(upper, -_Z.dot(upper));
  if (_Z.lengthSq() < 1e-8) _Z.copy(pole).negate();
  _Z.normalize();
  _X.crossVectors(_Y, _Z).normalize();
  _mb.makeBasis(_X, _Y, _Z);
  _qu.setFromRotationMatrix(_mb);
  pose['arm' + side] = q2e(_qu, pose['arm' + side] && pose['arm' + side] !== Z3 ? pose['arm' + side] : [0, 0, 0]);
  pose['fore' + side] = [-flex, 0, 0];
  // mano: la hoja apunta a bladeX; el resto sigue al antebrazo
  _qt.setFromAxisAngle(_axX, -flex);
  _qf.copy(_qu).multiply(_qt);
  const bl = pose['blade' + side];
  if (bl) {
    const fdir = _up.set(0, -1, 0).applyQuaternion(_qf);
    bladeDir(bl, _Z);
    _Y.copy(fdir).negate();
    _Y.addScaledVector(_Z, -_Y.dot(_Z));
    if (_Y.lengthSq() < 1e-6) _Y.set(0, 1, 0).addScaledVector(_Z, -_Z.y);
    _Y.normalize();
    if (bl[2]) _Y.applyAxisAngle(_Z, bl[2]);
    _X.crossVectors(_Y, _Z).normalize();
    _mb.makeBasis(_X, _Y, _Z);
    _qh.setFromRotationMatrix(_mb);
    _qf.invert().multiply(_qh);
    pose['hand' + side] = q2e(_qf, pose['hand' + side] && pose['hand' + side] !== Z3 ? pose['hand' + side] : [0, 0, 0]);
  } else pose['hand' + side] = pose['hand' + side] || [0, 0, 0];
  delete pose['ik' + side];
  delete pose['blade' + side];
  delete pose['elbow' + side];
}
