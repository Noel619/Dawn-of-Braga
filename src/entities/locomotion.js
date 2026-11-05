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
const _hmL = { x: 0, z: 0 };
const _hmR = { x: 0, z: 0 };
const _lc = { x: 0, z: 0 };
const _lw = { x: 0, z: 0 };
const _lf = { x: 0, z: 0 };
const _k1 = new THREE.Vector3();

// Estilos de marcha (valores en metros para una escala 1 y grados).
export const GAIT = {
  soldier: {},
  shamble: { strideBase: 0.55, strideK: 0.36, liftWalk: 0.07, bobWalk: 0.012, swayWalk: 0.045, rollWalk: 5, twistWalk: 5, limp: 0.35, lean: 8 },
  heavy: { strideBase: 0.9, strideK: 0.3, liftWalk: 0.12, bobWalk: 0.04, swayWalk: 0.06, rollWalk: 4, twistWalk: 6, crouchWalk: 0.06, lean: 6, dutyWalk: 0.66, stepDur: 1.3 },
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
    // pies anclados (o.lock; ver _anchor)
    this.lockW = 0;
    this.anc = { L: { x: 0, z: 0, has: false }, R: { x: 0, z: 0, has: false } };
    this.stp = { L: null, R: null };
    this.stepLift = { L: 0, R: 0 };
    this._planId = null;
    this._fr = { px: 0, pz: 0, sy: 0, cy: 1 };
    this._over = { L: false, R: false };
    this.lkS = { L: 0, R: 0 };
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
    // (con los pies anclados no hay ciclo de marcha: el cuerpo se mueve por
    // encima de ellos y los pasos los da _anchor)
    const lock = clamp(o.lock || 0, 0, 1);
    const moveT = sstep(0.06, 0.75, v) * (1 - lock);
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
      if (!air && up > u + 0.5 && (mw > 0.25 || shuffle > 0.3) && lock < 0.5 && this.onStep) this.onStep(side, mw);
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
    this._anchor(dt, o, lock, sy, cy, k);
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
    if (lock > 0.001) {
      // (mientras un pie anclado da su paso, la pelvis carga sobre el otro y
      // baja un poco)
      const sl = this.stepLift.L - this.stepLift.R;
      P.root[0] -= sl * 0.032 * k * lock;
      P.root[1] -= Math.max(this.stepLift.L, this.stepLift.R) * 0.014 * k * lock;
      P.hips[2] -= sl * 2.5 * DEG * lock;
    }
    const ctw = lerp(S.chestTwistWalk, S.chestTwistRun, run) * mw * DEG * Math.cos(TAU * this.phase);
    P.chest = [this.lean * 0.65 + breath * 0.014 * (1 + (o.exert || 0)), -pelvisYaw + ctw, -pelvisRoll * 0.7 - this.bank * 0.35 - shift * 1.5];
    P.head = [-this.lean * 0.75 - breath * 0.008, -ctw * 0.6, -this.bank * 0.4];
    this.armSwing = lerp(S.armWalk, S.armRun, run) * mw * DEG * Math.cos(TAU * this.phase);
    this.elbow = run * mw;
    this.phaseDelta = fract(this.phase - prevPhase);
    return P;
  }

  // (el pie anclado ya lejos de donde lo quiere la marcha: mejor soltarlo
  // ya, por el aire, que esperar a que le toque levantarse)
  _far(side, k) {
    const a = this._toL(this.anc[side].x, this.anc[side].z, _lf);
    const t = this.target[side];
    return Math.hypot(a.x - t.x, a.z - t.z) > 0.3 * k;
  }

  // del espacio del personaje (+z delante, +x izquierda) al mundo, y vuelta
  _toW(lx, lz, out) {
    const F = this._fr;
    out.x = F.px + lx * F.cy + lz * F.sy;
    out.z = F.pz - lx * F.sy + lz * F.cy;
    return out;
  }
  _toL(wx, wz, out) {
    const F = this._fr;
    const dx = wx - F.px,
      dz = wz - F.pz;
    out.x = dx * F.cy - dz * F.sy;
    out.z = dx * F.sy + dz * F.cy;
    return out;
  }

  // Pies anclados (o.lock, 0..1). Mientras golpea, se tambalea o le desvían
  // un golpe, la criatura no anda: cada pie se queda donde pisó, en el
  // mundo, aunque el cuerpo avance, gire o se eche atrás por encima de él (y
  // la cadera y las rodillas lo absorben); cuando uno queda demasiado lejos
  // de su sitio, da un paso, de uno en uno. Si el cuerpo va a avanzar
  // (o.plan: {x, z} lo que le queda de impulso en el mundo, t lo que tarda,
  // foot el pie que sale, id), ese pie sale con él y cae por delante de
  // donde acabará el cuerpo: el paso del golpe, el que lleva el peso al
  // arma; el otro se queda atrás, estirado. o.hold: aguanta esa zancada (el
  // golpe aún no ha acabado); sin él, los pies se recogen.
  _anchor(dt, o, lock, sy, cy, k) {
    const F = this._fr;
    const W = this.lkS;
    if (o.pos) {
      // (si el cuerpo ha saltado de sitio —vuelve a su puesto, lo ponen en
      // otra parte—, los anclajes de antes ya no valen)
      if (Math.hypot(o.pos.x - F.px, o.pos.z - F.pz) > 1.5) W.L = W.R = 0;
      F.px = o.pos.x;
      F.pz = o.pos.z;
    }
    F.sy = sy;
    F.cy = cy;
    const A = this.anc,
      ST = this.stp;
    // (al soltarse el anclaje —acabó el golpe—, cada pie se suelta cuando
    // la marcha lo levanta, no los dos a la vez arrastrándose hasta su sitio;
    // mientras no lo levanta, o si la criatura se queda quieta, sigue
    // plantado, y quieta se recoge a pasos si hace falta)
    const want = o.lockT ?? (lock > 0.5 ? 1 : 0);
    for (const side of ['L', 'R']) {
      const w0 = W[side];
      if (want > 0) W[side] = Math.max(W[side], lock);
      // (o.quieto: también quieto se anclan, y al echar a andar cada pie se
      // suelta al levantarlo: el primer paso no resbala)
      else if (o.quieto && this.mw < 0.04 && !this.stp[side]) W[side] = 1;
      else if ((this.mw > 0.15 && (this._u[side] >= this.duty || this._far(side, k))) || this._over[side]) {
        W[side] = damp(W[side], 0, 14, dt);
        if (W[side] < 0.002) W[side] = 0;
      }
      // (un pie que se ancla ahora, se ancla donde está)
      if (w0 === 0 && W[side] > 0) {
        this._toW(this.target[side].x, this.target[side].z, A[side]);
        A[side].has = true;
        ST[side] = null;
      }
    }
    lock = Math.max(W.L, W.R);
    this.lockW = lock;
    if (lock < 0.001 || !o.pos) {
      // (sin anclar, los anclajes siguen a los pies de la marcha)
      for (const side of ['L', 'R']) {
        const t = this.target[side];
        this._toW(t.x, t.z, A[side]);
        A[side].has = true;
        ST[side] = null;
        this.stepLift[side] = 0;
      }
      this._planId = null;
      return;
    }
    const S = this.S;
    const home = (side, out) => {
      out.x = this.legOff[side].x * S.width;
      out.z = (side === 'L' ? 1 : -1) * this.stance * k * 0.5;
      return out;
    };
    const H = { L: home('L', _hmL), R: home('R', _hmR) };
    for (const side of ['L', 'R'])
      if (!A[side].has) {
        this._toW(this.target[side].x, this.target[side].z, A[side]);
        A[side].has = true;
      }
    const slow = S.stepDur ?? 1;
    // el paso del golpe
    const P = o.plan;
    if (P && P.id !== this._planId) {
      this._planId = P.id;
      const d = Math.hypot(P.x, P.z);
      if (d > 0.08 * k) {
        const side = P.foot === 'L' ? 'L' : 'R';
        const other = side === 'L' ? 'R' : 'L';
        // (si el otro pie estaba en el aire, se posa donde iba)
        if (ST[other]) ST[other].t = ST[other].dur;
        const lx = (P.x * cy - P.z * sy) / d,
          lz = (P.x * sy + P.z * cy) / d;
        const st = ST[side] || { fx: A[side].x, fz: A[side].z };
        if (ST[side]) {
          // (ya estaba dando un paso: sale desde donde está)
          const sx = st.lastX ?? A[side].x,
            sz = st.lastZ ?? A[side].z;
          st.fx = sx;
          st.fz = sz;
        }
        ST[side] = { t: 0, dur: clamp(P.t + 0.07, 0.18, 0.46) * slow, fx: st.fx, fz: st.fz, plan: true, dx: lx, dz: lz, reach: Math.min(0.3 * k, d * 0.5), lift: (0.09 + Math.min(0.16, d * 0.08)) * k };
      }
    }
    // (el pie de atrás que la pierna ya no alcanza mientras el cuerpo va
    // lanzado no se arrastra: despega él también y cae junto al cuerpo, un
    // poco por detrás; con los dos en el aire, el golpe es un salto)
    if (P && P.id === this._planId)
      for (const side of ['L', 'R'])
        if (this._over[side] && !ST[side]) {
          const d = Math.hypot(P.x, P.z);
          const lx = d > 1e-4 ? (P.x * cy - P.z * sy) / d : 0,
            lz = d > 1e-4 ? (P.x * sy + P.z * cy) / d : 1;
          ST[side] = { t: 0, dur: clamp(P.t + 0.1, 0.18, 0.4) * slow, fx: A[side].x, fz: A[side].z, plan: true, dx: lx, dz: lz, reach: -0.06 * k, lift: (0.07 + Math.min(0.1, d * 0.05)) * k };
        }
    this._over.L = this._over.R = false;
    // los pasos para recogerse: el pie más desplazado, si pasa del umbral
    // (si ya anda, los pasos los da la marcha)
    if (!ST.L && !ST.R && this.mw < 0.15) {
      const thr = (o.hold ? 0.55 : 0.16) * k;
      let best = null,
        bd = thr;
      for (const side of ['L', 'R']) {
        const a = this._toL(A[side].x, A[side].z, _lc);
        const dd = Math.hypot((a.x - H[side].x) * 1.6, a.z - H[side].z);
        if (dd > bd) {
          bd = dd;
          best = side;
        }
      }
      if (best) ST[best] = { t: 0, dur: (0.22 + Math.min(0.12, bd * 0.16)) * slow, fx: A[best].x, fz: A[best].z, plan: false, lift: (0.06 + Math.min(0.05, bd * 0.08)) * k };
    }
    for (const side of ['L', 'R']) {
      const st = ST[side];
      const t = this.target[side];
      let lx,
        lz,
        ly = this.ankleH,
        pitch = 0;
      if (st) {
        st.t += dt;
        const s = clamp(st.t / st.dur, 0, 1);
        const e = s * s * (3 - 2 * s);
        let tx = H[side].x,
          tz = H[side].z;
        if (st.plan) {
          if (P && P.id === this._planId) {
            tx += P.x * cy - P.z * sy;
            tz += P.x * sy + P.z * cy;
          }
          tx += st.dx * st.reach;
          tz += st.dz * st.reach;
        }
        const f = this._toL(st.fx, st.fz, _lc);
        lx = f.x + (tx - f.x) * e;
        lz = f.z + (tz - f.z) * e;
        const arc = Math.pow(Math.sin(Math.PI * s), 0.85);
        ly += st.lift * arc;
        // (despega la puntera, y el talón llega antes que ella)
        pitch = s < 0.5 ? lerp(0.42, 0.1, s / 0.5) : lerp(0.1, -0.2, (s - 0.5) / 0.5);
        this.stepLift[side] = arc;
        this._toW(lx, lz, _lw);
        st.lastX = _lw.x;
        st.lastZ = _lw.z;
        if (s >= 1) {
          this._toW(tx, tz, A[side]);
          ST[side] = null;
          this.stepLift[side] = 0;
          if (this.onStep) this.onStep(side, 1);
        }
      } else {
        const a = this._toL(A[side].x, A[side].z, _lc);
        lx = a.x;
        lz = a.z;
        this.stepLift[side] = 0;
      }
      const w = W[side];
      t.x = lerp(t.x, lx, w);
      t.z = lerp(t.z, lz, w);
      // (el pie que se suelta va por el aire hasta su sitio de la marcha,
      // no arrastrándose por el suelo)
      t.y = lerp(t.y, ly, w) + (want === 0 && !st ? 4 * w * (1 - w) * 0.1 * k : 0);
      this.pitch[side] = lerp(this.pitch[side], pitch, w);
    }
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
      if (this.lkS[side] > 0.3 && !this.stp[side] && clipW < 0.5) {
        // (el pie anclado que la pierna ya no alcanza —el de atrás en una
        // zancada larga— se arrastra: su anclaje viene hacia el cuerpo; sólo
        // si está bien apartado de la cadera: de pie, la pierna va casi
        // estirada y eso no es una zancada)
        const hip = _k1.copy(this.legOff[side]).applyQuaternion(_hq).add(_hp);
        const reach = (this.L1 + this.L2) * 0.999;
        const dx = tgt.x - hip.x,
          dy = tgt.y - hip.y,
          dz = tgt.z - hip.z;
        const hz = Math.hypot(dx, dz);
        if (hz > 0.24 * this.scale && dx * dx + dy * dy + dz * dz > reach * reach && Math.abs(dy) < reach * 0.97) {
          const f = Math.max(0.24 * this.scale, Math.sqrt(reach * reach - dy * dy)) / hz;
          if (f < 1) {
            tgt.x = hip.x + dx * f;
            tgt.z = hip.z + dz * f;
            this._toW(tgt.x, tgt.z, this.anc[side]);
            this._over[side] = true;
          }
        }
      }
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

// Saca el escudo del cuerpo: si algún punto de su silueta queda dentro del
// torso, la cadera o el muslo izquierdo (cajas de las piezas del modelo, algo
// holgadas), lo desplaza hacia fuera o hacia delante por el camino más corto.
// Llamar después de stabilizeShield().
// (rejilla sobre toda la lágrima, no sólo el contorno: una hombrera puede
// asomar por el centro del escudo sin tocar ningún borde)
const SHIELD_PTS = [];
for (let y = -0.4; y <= 0.4; y += 0.1)
  for (let i = -3; i <= 3; i++) {
    // semiancho de la lágrima a esa altura (recta arriba, curva hacia la punta)
    const hw = y > 0.05 ? 0.3 : 0.3 * Math.sqrt(Math.max(0, 1 - Math.pow((0.05 - y) / 0.47, 2)));
    if (hw < 0.02 && i !== 0) continue;
    for (const z of [-0.03, 0.04]) SHIELD_PTS.push(new THREE.Vector3((i / 3) * hw, y, z));
  }
// cajas de las piezas del modelo (centro y giro en Z en el espacio de su
// articulación, semiejes con 1 cm de holgura)
const BODY_BOXES = [
  { j: 'chest', c: [0, 0.26, 0], rz: 0, h: [0.23, 0.27, 0.15] },
  // hombrera izquierda
  { j: 'chest', c: [0.25, 0.47, 0], rz: -18, h: [0.1, 0.06, 0.12] },
  { j: 'hips', c: [0, -0.12, 0], rz: 0, h: [0.24, 0.2, 0.15] },
  { j: 'legL', c: [0, -0.22, 0], rz: 0, h: [0.09, 0.24, 0.095] },
];
for (const B of BODY_BOXES) {
  B.L = new THREE.Matrix4().makeRotationZ(B.rz * DEG).setPosition(B.c[0], B.c[1], B.c[2]);
  B.q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), B.rz * DEG);
  B.inv = new THREE.Matrix4();
  B.M = new THREE.Matrix4();
  B.wq = new THREE.Quaternion();
  // esquinas, centros de aristas y de caras: una pieza pequeña (la hombrera)
  // puede atravesar el escudo entre dos puntos de su rejilla
  B.pts = [];
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) if (a || b || c) B.pts.push(new THREE.Vector3(a * B.h[0], b * B.h[1], c * B.h[2]));
}
// grosor del escudo en su espacio (correas por detrás, cruz pintada delante)
const SH_BACK = -0.05,
  SH_FRONT = 0.037;
const shieldHalfW = (y) => (y > 0.05 ? 0.3 : 0.3 * Math.sqrt(Math.max(0, 1 - Math.pow((0.05 - y) / 0.46, 2))));
const _kp = new THREE.Vector3();
const _kd = new THREE.Vector3();
const _ki = new THREE.Matrix4();
// hold (opcional, Vector3 en el espacio del pecho): lo que se apartó el
// escudo el fotograma anterior; vuelve a su sitio poco a poco en vez de
// saltar, y se actualiza con lo que haya hecho falta ahora.
const _kw = new THREE.Vector3();
const _kq = new THREE.Quaternion();
export function keepShieldOut(rig, hold = null, dt = 0, margin = 0.012) {
  const sj = rig.joints.shield;
  const fore = rig.joints.foreL;
  const chest = rig.joints.chest;
  if (!sj || !fore || !chest) return 0;
  for (const B of BODY_BOXES) {
    const J = rig.joints[B.j];
    B.M.multiplyMatrices(J.matrixWorld, B.L);
    B.inv.copy(B.M).invert();
    J.getWorldQuaternion(B.wq).multiply(B.q);
  }
  fore.getWorldQuaternion(_sw);
  _sw.invert();
  chest.getWorldQuaternion(_kq);
  _kw.set(0, 0, 0);
  if (hold && hold.lengthSq() > 1e-10) {
    hold.multiplyScalar(Math.exp(-7 * dt));
    _kw.copy(hold).applyQuaternion(_kq);
    sj.position.add(_kd.copy(_kw).applyQuaternion(_sw));
  }
  for (let it = 0; it < 4; it++) {
    sj.updateMatrixWorld(true);
    _ki.copy(sj.matrixWorld).invert();
    let best = 0,
      bb = null,
      ax = 0;
    for (const B of BODY_BOXES) {
      // puntos del escudo dentro de la pieza: hacia fuera (el escudo va a la
      // izquierda) o hacia delante; nunca hacia atrás ni al otro costado
      for (const p of SHIELD_PTS) {
        _kp.copy(p).applyMatrix4(sj.matrixWorld).applyMatrix4(B.inv);
        if (Math.abs(_kp.x) >= B.h[0] || Math.abs(_kp.y) >= B.h[1] || Math.abs(_kp.z) >= B.h[2]) continue;
        const ox = B.h[0] - _kp.x,
          oz = B.h[2] - _kp.z;
        const d = Math.min(ox, oz);
        if (d > best) {
          best = d;
          bb = B;
          ax = ox <= oz ? 0 : 2;
        }
      }
      // puntos de la pieza dentro del escudo: el escudo se aparta de frente
      for (const p of B.pts) {
        _kp.copy(p).applyMatrix4(B.M).applyMatrix4(_ki);
        if (_kp.z <= SH_BACK || _kp.z >= SH_FRONT || _kp.y < -0.41 || _kp.y > 0.36 || Math.abs(_kp.x) >= shieldHalfW(_kp.y)) continue;
        const d = _kp.z - SH_BACK;
        if (d > best) {
          best = d;
          bb = null;
          ax = 3;
        }
      }
    }
    if (best <= 0) break;
    // dirección de salida en el mundo -> espacio del antebrazo
    if (ax === 3) _kd.set(0, 0, 1).transformDirection(sj.matrixWorld);
    else _kd.set(ax === 0 ? 1 : 0, 0, ax === 2 ? 1 : 0).applyQuaternion(bb.wq);
    _kd.multiplyScalar(best + margin);
    _kw.add(_kd);
    sj.position.add(_kd.applyQuaternion(_sw));
  }
  sj.updateMatrixWorld(true);
  if (hold) hold.copy(_kw).applyQuaternion(_kq.invert());
  return _kw.length();
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

// mode 'euler': el giro de la hoja (bladeR[2]) se mide respecto al plano
// vertical de la propia hoja (con giro 0 el filo mira hacia abajo), no respecto
// al antebrazo. Esa referencia es continua mientras lo sean los canales de la
// clave, así que la mano nunca da media vuelta de golpe cuando la hoja se
// alinea con el antebrazo (estocadas). Por defecto, la referencia original.
export function solveArm(pose, rig, side, mode = null) {
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
    bladeDir(bl, _Z);
    if (mode === 'euler') {
      const sp = Math.sin(bl[1]);
      _Y.set(-sp * Math.sin(bl[0]), Math.cos(bl[1]), -sp * Math.cos(bl[0]));
    } else {
      const fdir = _up.set(0, -1, 0).applyQuaternion(_qf);
      _Y.copy(fdir).negate();
      _Y.addScaledVector(_Z, -_Y.dot(_Z));
      if (_Y.lengthSq() < 1e-6) _Y.set(0, 1, 0).addScaledVector(_Z, -_Z.y);
    }
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
