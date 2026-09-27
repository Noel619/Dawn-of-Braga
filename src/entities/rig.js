// Rig articulado de primitivas low-poly + animador por fotogramas clave
// (muestreado a 20 fps para el característico movimiento "a saltos" de PS1).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { objMat, MAT_DEFS } from '../gfx/materials.js';
import { DEG } from '../core/util.js';

// ------------------------------------------------------------- geometrías
function taperBox(w, h, d, tb = 1, td = 1, tbx = null) {
  // caja cuyo extremo inferior (y<0) se escala por (tb, td)
  const g = new THREE.BoxGeometry(w, h, d);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) < 0) {
      p.setX(i, p.getX(i) * (tbx ?? tb));
      p.setZ(i, p.getZ(i) * td);
    }
  }
  g.computeVertexNormals();
  return g;
}

export function partGeometry(pt) {
  const s = pt.s || [0.2, 0.2, 0.2];
  let g;
  switch (pt.type || 'box') {
    case 'box':
      g = pt.taper ? taperBox(s[0], s[1], s[2], pt.taper[0], pt.taper[1] ?? pt.taper[0]) : new THREE.BoxGeometry(s[0], s[1], s[2]);
      break;
    case 'cyl':
      g = new THREE.CylinderGeometry(s[0], s[1] ?? s[0], s[2] ?? 0.3, pt.seg || 6, 1, !!pt.open);
      break;
    case 'cone':
      g = new THREE.ConeGeometry(s[0], s[1], pt.seg || 6);
      break;
    case 'sphere':
      g = new THREE.SphereGeometry(s[0], pt.seg || 6, pt.seg2 || 4);
      if (s[1] !== undefined) g.scale(1, s[1] / s[0], (s[2] ?? s[0]) / s[0]);
      break;
    case 'ico':
      g = new THREE.IcosahedronGeometry(s[0], pt.detail || 0);
      if (s[1] !== undefined) g.scale(1, s[1] / s[0], (s[2] ?? s[0]) / s[0]);
      break;
    case 'torus':
      g = new THREE.TorusGeometry(s[0], s[1], pt.seg2 || 4, pt.seg || 8);
      break;
    case 'plane':
      g = new THREE.PlaneGeometry(s[0], s[1], pt.segX || 1, pt.segY || 1);
      break;
    case 'shape':
      g = new THREE.ExtrudeGeometry(pt.shape, { depth: s[2] ?? 0.05, bevelEnabled: false });
      g.translate(0, 0, -(s[2] ?? 0.05) / 2);
      break;
    case 'lathe':
      g = new THREE.LatheGeometry(pt.points.map((q) => new THREE.Vector2(q[0], q[1])), pt.seg || 8);
      break;
    default:
      throw new Error('tipo de pieza ' + pt.type);
  }
  if (g.index) g = g.toNonIndexed();
  // escala de UV acorde a la densidad de texel del material
  const def = MAT_DEFS[pt.mat] || { uv: 1 };
  const size = Math.max(s[0], s[1] ?? s[0], s[2] ?? s[0]) * (pt.type === 'cyl' || pt.type === 'sphere' ? 3 : 1);
  const k = pt.uvk ?? Math.max(0.25, size * def.uv * 1.6);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k);
  const m = new THREE.Matrix4();
  const r = pt.r || [0, 0, 0];
  m.compose(
    new THREE.Vector3(...(pt.p || [0, 0, 0])),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0] * DEG, r[1] * DEG, r[2] * DEG)),
    new THREE.Vector3(...(pt.sc || [1, 1, 1]))
  );
  g.applyMatrix4(m);
  // limpiar atributos no estándar para poder fusionar
  for (const k2 of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k2)) g.deleteAttribute(k2);
  return g;
}

// ------------------------------------------------------------- rig
const _qj = new THREE.Quaternion();

export class Rig {
  // def = { joints: [{name, parent, pos:[x,y,z]}], parts: [{j, type, s, p, r, mat}] }
  constructor(def, opts = {}) {
    this.root = new THREE.Group();
    this.joints = {};
    this.rest = {};
    this.meshes = [];
    this.restQ = {};
    for (const j of def.joints) {
      const o = new THREE.Group();
      o.name = j.name;
      o.position.set(...(j.pos || [0, 0, 0]));
      if (j.rot) o.rotation.set(j.rot[0] * DEG, j.rot[1] * DEG, j.rot[2] * DEG);
      this.rest[j.name] = { pos: o.position.clone(), rot: o.rotation.clone() };
      this.restQ[j.name] = o.quaternion.clone();
      this.joints[j.name] = o;
      (j.parent ? this.joints[j.parent] : this.root).add(o);
    }
    // agrupar piezas por (articulación, material)
    const groups = new Map();
    for (const pt of def.parts) {
      const key = pt.j + '|' + pt.mat + '|' + (pt.ds ? 1 : 0);
      if (!groups.has(key)) groups.set(key, { j: pt.j, mat: pt.mat, ds: pt.ds, geos: [] });
      groups.get(key).geos.push(partGeometry(pt));
    }
    for (const gr of groups.values()) {
      const geo = gr.geos.length > 1 ? mergeGeometries(gr.geos) : gr.geos[0];
      geo.computeBoundingSphere();
      const mat = opts.matFn ? opts.matFn(gr.mat, gr.ds) : objMat(gr.mat, gr.ds ? { side: THREE.DoubleSide } : {});
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.matName = gr.mat;
      this.joints[gr.j].add(mesh);
      this.meshes.push(mesh);
    }
  }

  // Aplica una pose: { joint: [rx, ry, rz] } (radianes, relativo al reposo)
  apply(pose, rootOffset) {
    if (pose.root && !rootOffset) rootOffset = pose.root;
    for (const name in this.joints) {
      const j = this.joints[name];
      const rq = this.restQ[name];
      const p = pose[name];
      if (p) {
        e2q(p, _qj);
        j.quaternion.copy(_qj.premultiply(rq));
      } else j.quaternion.copy(rq);
    }
    if (this.joints.hips) {
      const rp = this.rest.hips.pos;
      if (rootOffset) this.joints.hips.position.set(rp.x + rootOffset[0], rp.y + rootOffset[1], rp.z + rootOffset[2]);
      else this.joints.hips.position.copy(rp);
    }
  }

  // Posición mundial de una articulación.
  worldPos(name, out = new THREE.Vector3(), local = null) {
    const j = this.joints[name];
    j.updateWorldMatrix(true, false);
    if (local) return out.copy(local).applyMatrix4(j.matrixWorld);
    return out.setFromMatrixPosition(j.matrixWorld);
  }

  // materiales propios (para destellos y ojos sin afectar a otras criaturas)
  own() {
    if (!this._own) {
      for (const m of this.meshes) {
        m.material = m.material.clone();
        m.userData.baseEI = m.material.emissiveIntensity;
      }
      this._own = true;
    }
  }

  setTint(color, emissive = null) {
    // usado para destellos de daño: clona materiales la primera vez
    this.own();
    for (const m of this.meshes) {
      if (m.material.emissive) {
        if (!m.userData.baseEm) m.userData.baseEm = m.material.emissive.clone();
        if (emissive) m.material.emissive.copy(emissive);
        else m.material.emissive.copy(m.userData.baseEm);
      }
    }
  }
}

// ------------------------------------------------------------- rotaciones
// Las poses se escriben como ángulos de Euler (orden XYZ, radianes) por
// articulación, pero toda mezcla se hace con cuaterniones (slerp): así una
// voltereta de 360° no "desgira" al volver a la locomoción.
const _qa = new THREE.Quaternion();
const _qb = new THREE.Quaternion();
const Z3 = [0, 0, 0];

export function e2q(e, q = new THREE.Quaternion()) {
  const c1 = Math.cos(e[0] / 2),
    c2 = Math.cos(e[1] / 2),
    c3 = Math.cos(e[2] / 2);
  const s1 = Math.sin(e[0] / 2),
    s2 = Math.sin(e[1] / 2),
    s3 = Math.sin(e[2] / 2);
  q.x = s1 * c2 * c3 + c1 * s2 * s3;
  q.y = c1 * s2 * c3 - s1 * c2 * s3;
  q.z = c1 * c2 * s3 + s1 * s2 * c3;
  q.w = c1 * c2 * c3 - s1 * s2 * s3;
  return q;
}

export function q2e(q, out = [0, 0, 0]) {
  const x = q.x,
    y = q.y,
    z = q.z,
    w = q.w;
  const m11 = 1 - 2 * (y * y + z * z),
    m12 = 2 * (x * y - w * z),
    m13 = 2 * (x * z + w * y);
  const m22 = 1 - 2 * (x * x + z * z),
    m23 = 2 * (y * z - w * x);
  const m32 = 2 * (y * z + w * x),
    m33 = 1 - 2 * (x * x + y * y);
  out[1] = Math.asin(Math.max(-1, Math.min(1, m13)));
  if (Math.abs(m13) < 0.9999999) {
    out[0] = Math.atan2(-m23, m33);
    out[2] = Math.atan2(-m12, m11);
  } else {
    out[0] = Math.atan2(m32, m22);
    out[2] = 0;
  }
  return out;
}

// Interpolación esférica entre dos rotaciones de Euler.
export function slerpE(a, b, t, out = [0, 0, 0]) {
  if (t <= 0) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
  }
  if (t >= 1) {
    out[0] = b[0];
    out[1] = b[1];
    out[2] = b[2];
    return out;
  }
  e2q(a, _qa);
  e2q(b, _qb);
  _qa.slerp(_qb, t);
  return q2e(_qa, out);
}

// ------------------------------------------------------------- clips
// Crea un clip: keys = [[t, {joint:[x,y,z] (grados; 'root' en cm)}, ease], ...]
// ease del tramo que llega a esa clave:
//   (por defecto) curva Hermite continua que fluye a través de las claves
//   'snap'   golpe: sale disparado y frena al llegar (impactos)
//   'hold'   llega frenando y se detiene en la clave (anticipación)
//   'linear' velocidad constante, 'in' acelera, 'out' frena
// opts.ground (por defecto true si el clip mueve las piernas): los pies se
// plantan en el suelo mediante IK; false para volteretas, caídas, etc.
export function clip(name, dur, keys, opts = {}) {
  const joints = new Set();
  for (const [, pose] of keys) for (const j in pose) joints.add(j);
  const J = [...joints];
  const k = keys.map(([t, pose, ease]) => {
    const p = {};
    for (const j of J) {
      const v = pose[j];
      p[j] = v ? v.map((x) => (j === 'root' || j.startsWith('ik') ? x / 100 : x * DEG)) : [0, 0, 0];
    }
    return { t, pose: p, ease: ease || 'smooth', m: {} };
  });
  // tangentes (Catmull-Rom con tiempos no uniformes)
  for (let i = 0; i < k.length; i++) {
    for (const j of J) {
      const m = [0, 0, 0];
      const into = k[i].ease;
      const out = k[i + 1] ? k[i + 1].ease : 'smooth';
      // antes de un golpe ('snap') siempre hay una pausa de anticipación
      if (i > 0 && i < k.length - 1 && into !== 'snap' && into !== 'hold' && into !== 'in' && out !== 'hold' && out !== 'snap') {
        const a = k[i - 1],
          b = k[i + 1];
        const dt = Math.max(1e-4, b.t - a.t);
        for (let c = 0; c < 3; c++) m[c] = (b.pose[j][c] - a.pose[j][c]) / dt;
      } else if (into === 'linear' && i > 0) {
        const a = k[i - 1];
        const dt = Math.max(1e-4, k[i].t - a.t);
        for (let c = 0; c < 3; c++) m[c] = (k[i].pose[j][c] - a.pose[j][c]) / dt;
      }
      k[i].m[j] = m;
    }
  }
  const legs = joints.has('legL') || joints.has('legR') || joints.has('shinL') || joints.has('shinR');
  return {
    name,
    dur,
    keys: k,
    joints,
    loop: !!opts.loop,
    events: opts.events || [],
    mask: opts.mask || null,
    root: opts.root || null,
    ground: opts.ground ?? legs,
    legs,
  };
}

const EASE = {
  linear: (a) => a,
  smooth: (a) => a * a * (3 - 2 * a),
  in: (a) => a * a,
  out: (a) => 1 - (1 - a) * (1 - a),
  snap: (a) => 1 - Math.pow(1 - a, 3),
  hold: (a) => a * a * (3 - 2 * a),
};

export function sampleClip(c, t, out = {}) {
  const keys = c.keys;
  for (const j in out) if (!(j in keys[0].pose)) delete out[j];
  if (c.loop) t = ((t % c.dur) + c.dur) % c.dur;
  if (t <= keys[0].t) {
    for (const j in keys[0].pose) (out[j] || (out[j] = [0, 0, 0])).splice(0, 3, ...keys[0].pose[j]);
    return out;
  }
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].t <= t) i++;
  if (i >= keys.length - 1) {
    const last = keys[keys.length - 1];
    if (c.loop) {
      const a = (t - last.t) / (c.dur - last.t || 1);
      const e = EASE.smooth(Math.min(1, a));
      for (const j in last.pose) {
        const pa = last.pose[j],
          pb = keys[0].pose[j];
        const o = out[j] || (out[j] = [0, 0, 0]);
        for (let q = 0; q < 3; q++) o[q] = pa[q] + (pb[q] - pa[q]) * e;
      }
      return out;
    }
    for (const j in last.pose) (out[j] || (out[j] = [0, 0, 0])).splice(0, 3, ...last.pose[j]);
    return out;
  }
  const A = keys[i],
    B = keys[i + 1];
  const D = B.t - A.t;
  const u = (t - A.t) / D;
  if (B.ease === 'smooth' || B.ease === 'hold') {
    // Hermite cúbica
    const u2 = u * u,
      u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1,
      h10 = u3 - 2 * u2 + u,
      h01 = -2 * u3 + 3 * u2,
      h11 = u3 - u2;
    for (const j in A.pose) {
      const pa = A.pose[j],
        pb = B.pose[j],
        ma = A.m[j],
        mb = B.m[j];
      const o = out[j] || (out[j] = [0, 0, 0]);
      for (let q = 0; q < 3; q++) o[q] = h00 * pa[q] + h10 * D * ma[q] + h01 * pb[q] + h11 * D * mb[q];
    }
  } else {
    const e = (EASE[B.ease] || EASE.smooth)(u);
    for (const j in A.pose) {
      const pa = A.pose[j],
        pb = B.pose[j];
      const o = out[j] || (out[j] = [0, 0, 0]);
      for (let q = 0; q < 3; q++) o[q] = pa[q] + (pb[q] - pa[q]) * e;
    }
  }
  return out;
}

// Mezcla 'over' sobre 'base' con peso w (slerp por articulación), sólo en las
// articulaciones de mask (o todas). jw: peso extra por articulación.
export function blendInto(base, over, w, mask = null, jw = null) {
  if (w <= 0) return base;
  for (const j in over) {
    if (mask && !mask.has(j)) continue;
    const ww = jw ? w * (jw[j] ?? 1) : w;
    if (ww <= 0) continue;
    const b = over[j];
    if (j === 'root' || j.startsWith('ik') || j.startsWith('elbow')) {
      const a = base[j] || Z3;
      base[j] = [a[0] + (b[0] - a[0]) * ww, a[1] + (b[1] - a[1]) * ww, a[2] + (b[2] - a[2]) * ww];
    } else base[j] = slerpE(base[j] || Z3, b, ww, base[j] && base[j] !== Z3 ? base[j] : [0, 0, 0]);
  }
  return base;
}

// Suma una rotación (Euler) a la pose: base[j] = base[j] · add
export function addRot(base, j, add) {
  e2q(base[j] || Z3, _qa);
  e2q(add, _qb);
  _qa.multiply(_qb);
  base[j] = q2e(_qa, base[j] || [0, 0, 0]);
}

export const UPPER = new Set(['chest', 'head', 'neck', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'spine', 'shield', 'ikL', 'ikR', 'bladeL', 'bladeR', 'elbowL', 'elbowR']);

const smooth01 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// Reproductor de clips: muestreo continuo, fundido cruzado entre clips con
// slerp y entrada/salida suave sobre la locomoción.
export class Animator {
  constructor() {
    this.clip = null;
    this.t = 0;
    this.speed = 1;
    this.w = 0; // peso interno 0..1
    this.targetWeight = 0;
    this.fadeIn = 0.08;
    this.fadeOut = 0.15;
    this.from = null;
    this.xf = 1;
    this.xfDur = 0.1;
    this.cur = {};
    this.jw = {};
    this.onEvent = null;
    this.resolve = null;
    this.done = true;
    this._s = {};
  }
  get weight() {
    return smooth01(this.w);
  }
  set weight(v) {
    this.w = v;
  }
  play(c, { speed = 1, blend = 0.09, t0 = 0 } = {}) {
    // fundido desde lo que se estaba viendo
    if (this.clip && this.w > 0.02) {
      this.from = {};
      for (const j in this.cur) this.from[j] = this.cur[j].slice();
      this.fromW = {};
      for (const j in this.cur) this.fromW[j] = (this.jw[j] ?? 1) * this.weight;
      this.xf = 0;
      this.xfDur = Math.max(0.02, blend);
      this.w = 1;
    } else {
      this.from = null;
      this.xf = 1;
    }
    this.clip = c;
    this.t = t0;
    this.speed = speed;
    this.done = false;
    this.targetWeight = 1;
    this.fadeIn = Math.max(0.03, blend);
  }
  stop(blend = 0.15) {
    this.targetWeight = 0;
    this.fadeOut = Math.max(0.001, blend);
    this.done = true;
  }
  get progress() {
    return this.clip ? this.t / this.clip.dur : 1;
  }
  update(dt) {
    if (!this.clip) return null;
    const c = this.clip;
    const prevT = this.t;
    if (!this.done || c.loop) this.t += dt * this.speed;
    for (const ev of c.events) {
      if (ev.t > prevT && ev.t <= this.t && this.onEvent) this.onEvent(ev.name, c.name);
    }
    if (!c.loop && this.t >= c.dur) {
      this.t = c.dur;
      if (!this.done) {
        this.done = true;
        if (this.onEvent) this.onEvent('end', c.name);
      }
    }
    const s = sampleClip(c, this.t, this._s);
    // p.ej. IK de brazos: convierte canales de trayectoria en rotaciones
    if (this.resolve) this.resolve(s);
    const out = this.cur;
    for (const j in out) if (!(j in s) && !(this.from && j in this.from)) delete out[j];
    const jw = this.jw;
    for (const j in jw) delete jw[j];
    if (this.from && this.xf < 1) {
      this.xf = Math.min(1, this.xf + dt / this.xfDur);
      const k = smooth01(this.xf);
      for (const j in s) {
        const f = this.from[j];
        if (f) {
          const fw = this.fromW[j] ?? 1;
          out[j] = j === 'root' ? [f[0] + (s[j][0] - f[0]) * k, f[1] + (s[j][1] - f[1]) * k, f[2] + (s[j][2] - f[2]) * k] : slerpE(f, s[j], k, out[j] || [0, 0, 0]);
          jw[j] = fw + (1 - fw) * k;
        } else {
          out[j] = (out[j] || [0, 0, 0]).fill(0).map((_, q) => s[j][q]);
          jw[j] = k;
        }
      }
      for (const j in this.from) {
        if (j in s) continue;
        out[j] = this.from[j].slice();
        jw[j] = (this.fromW[j] ?? 1) * (1 - k);
      }
    } else {
      this.from = null;
      for (const j in s) {
        const o = out[j] || (out[j] = [0, 0, 0]);
        o[0] = s[j][0];
        o[1] = s[j][1];
        o[2] = s[j][2];
      }
    }
    // peso global del clip sobre la locomoción
    if (this.targetWeight > 0) this.w = Math.min(1, this.w + dt / this.fadeIn);
    else this.w = Math.max(0, this.w - dt / this.fadeOut);
    return out;
  }
}

// Muelle amortiguado (movimiento secundario: capa, retrocesos, inercia).
export class Spring {
  constructor(k = 140, d = 16) {
    this.x = 0;
    this.v = 0;
    this.k = k;
    this.d = d;
  }
  update(dt, target = 0) {
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = this.k * (target - this.x) - this.d * this.v;
      this.v += a * h;
      this.x += this.v * h;
    }
    return this.x;
  }
  kick(v) {
    this.v += v;
  }
}
