// Animación de los colosos del jefe final.
//
// Por capas, de abajo arriba:
//   1. la base: un bucle (reposo, andar) con su propio reproductor;
//   2. la acción: los golpes, rugidos y reacciones (clips con anticipación,
//      golpe y recuperación, y retrasos escalonados: la cadera empieza, el
//      pecho la sigue, el brazo después y la campana llega la última), con
//      fundido cruzado sobre la base;
//   3. lo procedural, sumado encima: respiración, la cabeza que busca al
//      jugador, sacudidas, retrocesos con muelles;
//   4. cinemática inversa (dos huesos) para plantar pies y manos en el suelo
//      o llevar una mano a un punto (la garra, la mano que golpea la plaza);
//   5. huesos con muelles en el espacio del mundo: casulla, jirones, aureola
//      y la cola (una cadena que se arrastra por el empedrado y choca con él).
//
// Los clips son los del juego (rig.js: grados por hueso, 'root' en cm, que
// aquí mueve la pelvis); los huesos de los colosos tienen el reposo sin giro,
// así que sus ejes son los del modelo: X a su izquierda, Y arriba, Z delante
// (+X dobla hacia delante lo que apunta arriba).
import * as THREE from 'three';
import { Animator, blendInto, e2q, Spring } from '../../entities/rig.js';

const _q = new THREE.Quaternion(),
  _q2 = new THREE.Quaternion(),
  _q3 = new THREE.Quaternion(),
  _qi = new THREE.Quaternion();
const _v = new THREE.Vector3(),
  _v2 = new THREE.Vector3(),
  _v3 = new THREE.Vector3(),
  _v4 = new THREE.Vector3(),
  _v5 = new THREE.Vector3(),
  _m = new THREE.Matrix4();
const Z3 = [0, 0, 0];

// ruido suave de una dimensión (sacudidas, temblores)
export function noise1(t, seed = 0) {
  return Math.sin(t * 1.7 + seed * 3.1) * 0.5 + Math.sin(t * 3.3 + seed * 7.7) * 0.3 + Math.sin(t * 7.9 + seed * 1.3) * 0.2;
}

export class ColossusRig {
  constructor(model, o = {}) {
    this.M = model;
    this.bones = model.bones;
    this.byName = model.byName;
    this.idx = model.index;
    this.restQ = model.restQ;
    this.restP = model.restP;
    this.base = new Animator();
    this.action = new Animator();
    this.pose = {};
    this.add = {};
    this.dyn = [];
    this.chains = [];
    this.reqIK = [];
    this.speed = 1;
    this.time = 0;
    this.pelvis = o.pelvis || 'pelvis';
    this.groundAt = o.groundAt || (() => 0);
    this.look = { target: null, w: 0, yaw: 0, pitch: 0, bones: o.lookBones || [] };
    this.shakeA = 0;
    this.shakeBones = o.shakeBones || [];
    this.flinch = { x: new Spring(60, 9), z: new Spring(60, 9), bones: o.flinchBones || [] };
    this.extraPost = null;
    // pies en el suelo: [{ ankle, toe, h (altura del tobillo con el pie
    // plano), ht (altura del hueso de los dedos) }]
    this.feet = o.feet || null;
    this.gw = 1;
    this.groundOff = 0;
  }

  // ------------------------------------------------------------ reproducción
  playBase(clip, o = {}) {
    if (this.base.clip === clip && !this.base.done) return;
    this.base.play(clip, { blend: o.blend ?? 0.4, speed: o.speed ?? 1, t0: o.t0 ?? 0 });
  }
  play(clip, o = {}) {
    this.action.play(clip, { blend: o.blend ?? 0.25, speed: o.speed ?? 1, t0: o.t0 ?? 0 });
  }
  stop(blend = 0.5) {
    this.action.stop(blend);
  }
  get actionT() {
    return this.action.t;
  }

  // ------------------------------------------------------------ muelles y cadenas
  // Hueso con muelle (ropa, jirones, aureola): su punta (la de su hijo, o
  // len a lo largo de dir) sigue a la animación con retraso y peso.
  // o: { k (rigidez), d (amortiguación), g (gravedad m/s²), len, dir, child,
  //      hang (0..1: cuánto cuelga a plomo en vez de girar con su padre; la
  //      tela de un cuerpo encorvado cae vertical, no se inclina con él),
  //      ground (altura mínima de la punta sobre el suelo), fr (roce con el
  //      suelo), w (peso del muelle), maxAng (giro máximo, radianes) }
  addDyn(name, o = {}) {
    const b = this.byName[name];
    if (!b) return;
    const child = o.child ? this.byName[o.child] : b.children.find((c) => c.isBone);
    const dir = o.dir ? new THREE.Vector3(...o.dir) : child ? child.position.clone() : new THREE.Vector3(0, -1, 0);
    const len = o.len ?? dir.length();
    dir.normalize();
    this.dyn.push({ b, dir, len, k: o.k ?? 40, d: o.d ?? 6, g: o.g ?? 0, hang: o.hang ?? 0, p: new THREE.Vector3(), v: new THREE.Vector3(), init: false, ground: o.ground ?? null, fr: o.fr ?? 0, w: o.w ?? 1, maxAng: o.maxAng ?? 1.6 });
  }
  // los saca de su sitio (al teletransportar o reiniciar)
  resetDyn() {
    for (const d of this.dyn) d.init = false;
  }
  kick(vx, vy, vz, names = null) {
    for (const d of this.dyn) if (!names || names.includes(d.b.name)) d.v.add(_v.set(vx, vy, vz));
  }

  // ------------------------------------------------------------ IK
  // Lleva la punta de la cadena a, b, c (c es el hueso cuyo origen va a la
  // punta: la muñeca, el tobillo) a 'target' (mundo), con el codo o la
  // rodilla hacia 'pole' (mundo). w: peso (0..1). Se pide cada fotograma.
  // o.rot: giro de la punta en el mundo (la palma contra el suelo);
  // o.stretch: cuánto puede estirarse la cadena si no llega (1.15 = un 15 %:
  // los brazos de carne de Deo se alargan al golpear lejos).
  reach(a, b, c, target, pole, w = 1, o = {}) {
    this.reqIK.push({ a: this.byName[a], b: this.byName[b], c: this.byName[c], target: target.clone(), pole: pole.clone(), w, rot: o.rot ? o.rot.clone() : null, stretch: o.stretch || 1 });
  }

  // ------------------------------------------------------------ cada fotograma
  update(dt, ctx = {}) {
    this.time += dt;
    const sdt = dt * this.speed;
    const pose = this.pose;
    for (const k in pose) delete pose[k];
    // 1. base
    const bp = this.base.update(sdt);
    if (bp) for (const j in bp) pose[j] = bp[j].slice();
    // 2. acción
    const ap = this.action.update(sdt);
    if (ap && this.action.weight > 0) blendInto(pose, ap, this.action.weight, this.action.clip.mask, this.action.jw);
    // 3. procedural
    for (const j in this.add) {
      const a = this.add[j];
      const p = pose[j] || (pose[j] = [0, 0, 0]);
      p[0] += a[0];
      p[1] += a[1];
      p[2] += a[2];
    }
    // sacudida (se revuelve para quitarte de encima)
    if (this.shakeA > 0.001) {
      const t = this.time * 6.5;
      let i = 0;
      for (const j of this.shakeBones) {
        const k = this.shakeA * (j.k ?? 1);
        const p = pose[j.n] || (pose[j.n] = [0, 0, 0]);
        p[0] += noise1(t, i++) * 0.22 * k;
        p[1] += noise1(t * 1.1, i++) * 0.3 * k;
        p[2] += noise1(t * 0.9, i++) * 0.26 * k;
      }
    }
    // retroceso con muelles (al apuñalarle, al recibir un golpe)
    const fx = this.flinch.x.update(dt),
      fz = this.flinch.z.update(dt);
    if (Math.abs(fx) + Math.abs(fz) > 1e-4)
      for (const j of this.flinch.bones) {
        const p = pose[j.n] || (pose[j.n] = [0, 0, 0]);
        p[0] += fx * (j.k ?? 1);
        p[2] += fz * (j.k ?? 1);
      }
    // la cabeza busca al jugador
    this._look(dt, pose);
    // 4. aplicar a los huesos
    this.apply(pose);
    this._ground(dt);
    if (ctx.pre) ctx.pre(this);
    this.M.root.updateMatrixWorld(true);
    // 5. IK pedida este fotograma
    for (const r of this.reqIK) this._solveIK(r);
    this.reqIK.length = 0;
    if (this.extraPost) this.extraPost(this, dt);
    // 6. muelles y cadenas
    this._dyn(dt);
  }

  apply(pose) {
    const B = this.bones;
    for (let i = 0; i < B.length; i++) {
      const b = B[i];
      // 'root' es el desplazamiento de la pelvis (cm), no el giro del hueso raíz
      const p = b.name === 'root' ? null : pose[b.name];
      if (p) {
        e2q(p, _q);
        b.quaternion.copy(this.restQ[i]).multiply(_q);
      } else b.quaternion.copy(this.restQ[i]);
      b.position.copy(this.restP[i]);
      b.scale.set(1, 1, 1);
    }
    const r = pose.root;
    const pb = this.byName[this.pelvis];
    if (r && pb) pb.position.set(this.restP[this.idx[this.pelvis]].x + r[0], this.restP[this.idx[this.pelvis]].y + r[1], this.restP[this.idx[this.pelvis]].z + r[2]);
    // escalas por hueso (hincharse antes de reventar): canal 's_' + nombre
    for (const k in pose) {
      if (k[0] !== 's' || k[1] !== '_') continue;
      const b = this.byName[k.slice(2)];
      if (b) b.scale.set(1 + pose[k][0], 1 + pose[k][1], 1 + pose[k][2]);
    }
  }

  // Pies en el suelo: tras aplicar la pose, la pelvis sube o baja hasta que
  // el pie más bajo (el talón o la punta) toca el suelo. Así las claves no
  // tienen que acertar la altura de la cadera: la ponen las piernas. Sólo en
  // los clips con 'ground' (no al arrodillarse, morir o salir del suelo).
  _ground(dt) {
    if (!this.feet) return;
    const bc = this.base.clip,
      ac = this.action.clip;
    const bg = bc ? (bc.ground ? 1 : 0) : 1;
    const ag = ac ? (ac.ground ? 1 : 0) : bg;
    const want = bg + (ag - bg) * (ac ? this.action.weight : 0);
    this.gw += (want - this.gw) * (dt > 0 ? 1 - Math.exp(-7 * dt) : 1);
    if (this.gw < 0.002) {
      this.groundOff = 0;
      return;
    }
    const root = this.M.root;
    root.updateMatrixWorld(true);
    let c = Infinity;
    for (const f of this.feet) {
      const a = root.worldToLocal(this.byName[f.ankle].getWorldPosition(_v)).y - f.h;
      const t = root.worldToLocal(this.byName[f.toe].getWorldPosition(_v)).y - f.ht;
      c = Math.min(c, a, t);
    }
    if (!isFinite(c)) return;
    this.groundOff = -c * this.gw;
    this.byName[this.pelvis].position.y += this.groundOff;
  }

  // mirada: guiñada y cabeceo repartidos por cuello y cabeza, hacia el objetivo
  _look(dt, pose) {
    const L = this.look;
    if (!L.bones.length) return;
    let wy = 0,
      wp = 0;
    if (L.target && L.w > 0) {
      const root = this.M.root;
      const hb = this.byName[L.bones[L.bones.length - 1].n];
      hb.getWorldPosition(_v);
      _v2.copy(L.target).sub(_v);
      // al espacio del modelo
      _qi.copy(root.quaternion).invert();
      _v2.applyQuaternion(_qi);
      wy = Math.atan2(_v2.x, _v2.z);
      wp = Math.atan2(-_v2.y, Math.hypot(_v2.x, _v2.z));
      const my = L.maxYaw ?? 1,
        mp = L.maxPitch ?? 0.6;
      wy = Math.max(-my, Math.min(my, wy));
      wp = Math.max(-mp, Math.min(mp, wp - (L.pitch0 ?? 0)));
    }
    const k = 1 - Math.exp(-(L.speed ?? 2.5) * dt);
    L.yaw += (wy * L.w - L.yaw) * k;
    L.pitch += (wp * L.w - L.pitch) * k;
    for (const j of L.bones) {
      const p = pose[j.n] || (pose[j.n] = [0, 0, 0]);
      p[1] += L.yaw * j.k;
      p[0] += L.pitch * j.k;
    }
  }

  // IK de dos huesos en el espacio del mundo
  _solveIK(r) {
    const { a, b, c, target, pole, w } = r;
    if (!a || !b || !c || w <= 0) return;
    const A = a.getWorldPosition(new THREE.Vector3());
    let Bp = b.getWorldPosition(new THREE.Vector3()),
      C = c.getWorldPosition(new THREE.Vector3());
    let lab = A.distanceTo(Bp),
      lbc = Bp.distanceTo(C);
    // la orientación animada de la punta (para mezclar con 'rot' si w < 1)
    const cq0 = r.rot && w < 1 ? c.getWorldQuaternion(new THREE.Quaternion()) : null;
    const T = _v.copy(C).lerp(target, w);
    if (r.stretch > 1) {
      const need = A.distanceTo(T) / ((lab + lbc) * 0.985);
      if (need > 1) {
        const k = Math.min(r.stretch, need);
        a.scale.multiplyScalar(k);
        c.scale.multiplyScalar(1 / k);
        a.updateMatrixWorld(true);
        Bp = b.getWorldPosition(new THREE.Vector3());
        C = c.getWorldPosition(new THREE.Vector3());
        lab = A.distanceTo(Bp);
        lbc = Bp.distanceTo(C);
      }
    }
    const axis = _v2.copy(T).sub(A);
    let d = axis.length();
    if (d < 1e-4) return;
    axis.multiplyScalar(1 / d);
    d = Math.min(d, (lab + lbc) * 0.9995);
    d = Math.max(d, Math.abs(lab - lbc) + 1e-3);
    const cosA = (lab * lab + d * d - lbc * lbc) / (2 * lab * d);
    const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    // dirección del codo: la componente del polo perpendicular al eje
    const pn = _v3.copy(pole).sub(A);
    pn.addScaledVector(axis, -pn.dot(axis));
    if (pn.lengthSq() < 1e-8) pn.copy(Bp).sub(A).addScaledVector(axis, -_v4.copy(Bp).sub(A).dot(axis));
    pn.normalize();
    const E = new THREE.Vector3().copy(A).addScaledVector(axis, lab * cosA).addScaledVector(pn, lab * sinA);
    // hueso a: de (B - A) a (E - A)
    this._aim(a, _v4.copy(Bp).sub(A).normalize(), E.clone().sub(A).normalize());
    a.updateMatrixWorld(true);
    const B2 = b.getWorldPosition(new THREE.Vector3()),
      C2 = c.getWorldPosition(new THREE.Vector3());
    const Tf = new THREE.Vector3().copy(A).addScaledVector(axis, d);
    this._aim(b, C2.sub(B2).normalize(), Tf.sub(B2).normalize());
    b.updateMatrixWorld(true);
    // giro de la punta en el mundo (la palma contra el suelo)
    if (r.rot) {
      c.parent.getWorldQuaternion(_q2);
      _q3.copy(r.rot);
      if (cq0) _q3.copy(cq0).slerp(r.rot, w);
      c.quaternion.copy(_q2.invert().multiply(_q3));
      c.updateMatrixWorld(true);
    }
  }
  // gira el hueso (en el mundo) para llevar la dirección 'from' a 'to'
  _aim(bone, from, to) {
    _q.setFromUnitVectors(from, to);
    bone.getWorldQuaternion(_q2);
    _q.multiply(_q2);
    bone.parent.getWorldQuaternion(_q3);
    bone.quaternion.copy(_q3.invert().multiply(_q));
  }

  // muelles en el mundo: cada punta sigue a la animación con inercia
  _dyn(dt) {
    if (!this.dyn.length) return;
    const n = Math.max(1, Math.ceil(dt / (1 / 90)));
    const h = dt / n;
    for (const d of this.dyn) {
      const b = d.b;
      b.updateMatrixWorld(true);
      const O = b.getWorldPosition(_v);
      b.getWorldQuaternion(_q);
      const A = _v2.copy(d.dir).applyQuaternion(_q);
      // la punta animada (A) y a la que tira el muelle (T: colgando a plomo en parte)
      const T = _v5.copy(A);
      if (d.hang > 0) {
        T.y -= d.hang * (1 + T.y);
        T.x *= 1 - d.hang;
        T.z *= 1 - d.hang;
        T.normalize();
      }
      T.multiplyScalar(d.len).add(O);
      A.multiplyScalar(d.len).add(O);
      if (!d.init) {
        d.p.copy(T);
        d.v.set(0, 0, 0);
        d.init = true;
      }
      for (let s = 0; s < n; s++) {
        d.v.x += (d.k * (T.x - d.p.x) - d.d * d.v.x) * h;
        d.v.y += (d.k * (T.y - d.p.y) - d.d * d.v.y - d.g) * h;
        d.v.z += (d.k * (T.z - d.p.z) - d.d * d.v.z) * h;
        d.p.addScaledVector(d.v, h);
        // largo fijo
        _v3.copy(d.p).sub(O);
        const L = _v3.length() || 1e-6;
        d.p.copy(O).addScaledVector(_v3, d.len / L);
        // el suelo (la cola se arrastra)
        if (d.ground !== null) {
          const gy = this.groundAt(d.p.x, d.p.z) + d.ground;
          if (d.p.y < gy) {
            d.p.y = gy;
            if (d.v.y < 0) d.v.y = 0;
            const f = Math.exp(-d.fr * h);
            d.v.x *= f;
            d.v.z *= f;
          }
        }
      }
      // giro del hueso hacia su punta, limitado (que no se doble del revés)
      const cur = _v3.copy(A).sub(O).normalize();
      const want = _v4.copy(d.p).sub(O).normalize();
      const ang = Math.acos(Math.max(-1, Math.min(1, cur.dot(want))));
      if (ang > 1e-4) {
        if (ang > d.maxAng) want.copy(cur).lerp(want, d.maxAng / ang).normalize();
        if (d.w < 1) want.lerp(cur, 1 - d.w).normalize();
        this._aim(b, cur, want);
        b.updateMatrixWorld(true);
      }
    }
  }
}

// Ayudas para escribir poses (grados): mezcla dos poses.
export function mixPose(a, b, t) {
  const out = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const pa = a[k] || Z3,
      pb = b[k] || Z3;
    out[k] = [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t, pa[2] + (pb[2] - pa[2]) * t];
  }
  return out;
}
