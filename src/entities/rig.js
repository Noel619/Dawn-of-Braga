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
export class Rig {
  // def = { joints: [{name, parent, pos:[x,y,z]}], parts: [{j, type, s, p, r, mat}] }
  constructor(def, opts = {}) {
    this.root = new THREE.Group();
    this.joints = {};
    this.rest = {};
    this.meshes = [];
    for (const j of def.joints) {
      const o = new THREE.Group();
      o.name = j.name;
      o.position.set(...(j.pos || [0, 0, 0]));
      if (j.rot) o.rotation.set(j.rot[0] * DEG, j.rot[1] * DEG, j.rot[2] * DEG);
      this.rest[j.name] = { pos: o.position.clone(), rot: o.rotation.clone() };
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
      const r = this.rest[name].rot;
      const p = pose[name];
      if (p) j.rotation.set(r.x + p[0], r.y + p[1], r.z + p[2]);
      else j.rotation.copy(r);
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

  setTint(color, emissive = null) {
    // usado para destellos de daño: clona materiales la primera vez
    if (!this._own) {
      for (const m of this.meshes) m.material = m.material.clone();
      this._own = true;
    }
    for (const m of this.meshes) {
      if (m.material.emissive) {
        if (!m.userData.baseEm) m.userData.baseEm = m.material.emissive.clone();
        if (emissive) m.material.emissive.copy(emissive);
        else m.material.emissive.copy(m.userData.baseEm);
      }
    }
  }
}

// ------------------------------------------------------------- clips
// Crea un clip: keys = [[t, {joint:[x,y,z] (grados)}], ...]
export function clip(name, dur, keys, opts = {}) {
  const k = keys.map(([t, pose, ease]) => {
    const p = {};
    // 'root' = desplazamiento de cadera en cm; el resto en grados
    for (const j in pose) p[j] = pose[j].map((v) => (j === 'root' ? v / 100 : v * DEG));
    return { t, pose: p, ease: ease || 'smooth' };
  });
  return { name, dur, keys: k, loop: !!opts.loop, events: opts.events || [], mask: opts.mask || null, root: opts.root || null };
}

const EASE = {
  linear: (a) => a,
  smooth: (a) => a * a * (3 - 2 * a),
  in: (a) => a * a,
  out: (a) => 1 - (1 - a) * (1 - a),
  snap: (a) => 1 - Math.pow(1 - a, 4),
};

export function sampleClip(c, t, out = {}) {
  for (const k in out) delete out[k];
  const keys = c.keys;
  if (c.loop) t = ((t % c.dur) + c.dur) % c.dur;
  if (t <= keys[0].t) {
    Object.assign(out, keys[0].pose);
    return out;
  }
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].t <= t) i++;
  if (i >= keys.length - 1) {
    const last = keys[keys.length - 1];
    if (c.loop) {
      // interpolar del último al primero
      const a = (t - last.t) / (c.dur - last.t || 1);
      lerpPose(last.pose, keys[0].pose, EASE.smooth(Math.min(1, a)), out);
      return out;
    }
    Object.assign(out, last.pose);
    return out;
  }
  const A = keys[i],
    B = keys[i + 1];
  const a = (t - A.t) / (B.t - A.t);
  lerpPose(A.pose, B.pose, (EASE[B.ease] || EASE.smooth)(a), out);
  return out;
}

const Z3 = [0, 0, 0];
export function lerpPose(a, b, t, out = {}) {
  for (const j in a) {
    const pa = a[j],
      pb = b[j] || Z3;
    out[j] = [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t, pa[2] + (pb[2] - pa[2]) * t];
  }
  for (const j in b) {
    if (a[j]) continue;
    const pb = b[j];
    out[j] = [pb[0] * t, pb[1] * t, pb[2] * t];
  }
  return out;
}

// Mezcla 'over' sobre 'base' con peso w, sólo en las articulaciones de mask (o todas).
export function blendInto(base, over, w, mask = null) {
  const joints = new Set([...Object.keys(base), ...Object.keys(over)]);
  for (const j of joints) {
    if (mask && !mask.has(j)) continue;
    const a = base[j] || Z3,
      b = over[j] || Z3;
    base[j] = [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w];
  }
  return base;
}

export const UPPER = new Set(['chest', 'head', 'neck', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'spine']);

// Reproductor de clips con fundido cruzado y eventos.
export class Animator {
  constructor(fps = 20) {
    this.clip = null;
    this.t = 0;
    this.speed = 1;
    this.fade = 0;
    this.fadeDur = 0.1;
    this.from = {};
    this.cur = {};
    this.fps = fps;
    this.onEvent = null;
    this.done = true;
    this.weight = 0;
    this.targetWeight = 0;
  }
  play(c, { speed = 1, blend = 0.09, t0 = 0 } = {}) {
    // snapshot de la pose actual para el fundido
    this.from = { ...this.cur };
    this.clip = c;
    this.t = t0;
    this.speed = speed;
    this.fade = blend > 0 ? 0 : 1;
    this.fadeDur = blend;
    this.done = false;
    this.targetWeight = 1;
    if (this.weight < 0.05) this.fade = 1;
  }
  stop(blend = 0.15) {
    this.targetWeight = 0;
    this.fadeOut = blend;
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
    // eventos
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
    // muestreo "a saltos"
    const ts = this.fps > 0 ? Math.floor(this.t * this.fps) / this.fps : this.t;
    const s = sampleClip(c, ts, this._tmp || (this._tmp = {}));
    this.fade = Math.min(1, this.fade + dt / Math.max(0.001, this.fadeDur));
    const f = this.fade;
    const out = {};
    lerpPose(this.from, s, f * f * (3 - 2 * f), out);
    this.cur = out;
    // peso global (entrada/salida del clip sobre la locomoción)
    if (this.targetWeight > this.weight) this.weight = Math.min(1, this.weight + dt / 0.08);
    else this.weight = Math.max(0, this.weight - dt / (this.fadeOut || 0.15));
    return out;
  }
}
