// Cascotes: trozos de piedra que saltan del empedrado, de las fachadas y de
// las bóvedas (con física sencilla: gravedad, botes y roce), en una sola malla
// instanciada con un número fijo de trozos que se reutilizan.
import * as THREE from 'three';
import { getTexture } from '../../gfx/textures.js';

const _m = new THREE.Matrix4(),
  _q = new THREE.Quaternion(),
  _s = new THREE.Vector3(),
  _a = new THREE.Vector3();

function rockGeo() {
  const g = new THREE.IcosahedronGeometry(0.5, 0).toNonIndexed();
  const p = g.attributes.position;
  // irregular: cada vértice desplazado (los compartidos, igual)
  const seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = p.getX(i).toFixed(3) + ',' + p.getY(i).toFixed(3) + ',' + p.getZ(i).toFixed(3);
    if (!seen.has(k)) seen.set(k, 0.7 + Math.random() * 0.5);
    const f = seen.get(k);
    p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.75, p.getZ(i) * f);
  }
  g.computeVertexNormals();
  return g;
}

export class Debris {
  constructor(scene, n = 120) {
    this.scene = scene;
    const tex = getTexture('ashlar');
    this.mat = new THREE.MeshLambertMaterial({ map: tex, color: 0x9a9088 });
    this.mesh = new THREE.InstancedMesh(rockGeo(), this.mat, n);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.n = n;
    this.list = [];
    this.next = 0;
    for (let i = 0; i < n; i++) this.list.push({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), w: new THREE.Vector3(), s: 1, t: 0, life: 6, rest: false });
  }
  // un estallido de n trozos en 'at': speed (m/s), up (impulso vertical), size
  burst(at, n, o = {}) {
    const sp = o.speed ?? 6,
      up = o.up ?? 5,
      size = o.size ?? 0.6,
      r = o.spread ?? 0.6;
    for (let k = 0; k < n; k++) {
      const d = this.list[this.next];
      this.next = (this.next + 1) % this.n;
      const a = Math.random() * Math.PI * 2;
      const rr = Math.random() * r;
      d.on = true;
      d.rest = false;
      d.p.set(at.x + Math.cos(a) * rr, at.y + Math.random() * 0.4, at.z + Math.sin(a) * rr);
      const s = sp * (0.4 + Math.random() * 0.8);
      d.v.set(Math.cos(a) * s + (o.dir ? o.dir.x * sp : 0), up * (0.5 + Math.random() * 0.8), Math.sin(a) * s + (o.dir ? o.dir.z * sp : 0));
      d.q.setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
      d.w.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(14);
      d.s = size * (0.35 + Math.random() * 0.9);
      d.t = 0;
      d.life = o.life ?? 7 + Math.random() * 4;
    }
  }
  update(dt, groundAt) {
    let c = 0;
    for (const d of this.list) {
      if (!d.on) continue;
      d.t += dt;
      if (!d.rest) {
        d.v.y -= 16 * dt;
        d.p.addScaledVector(d.v, dt);
        const gy = groundAt(d.p.x, d.p.z) + d.s * 0.3;
        if (d.p.y < gy) {
          d.p.y = gy;
          if (d.v.y < -2) {
            d.v.y *= -0.32;
            d.v.x *= 0.6;
            d.v.z *= 0.6;
            d.w.multiplyScalar(0.6);
          } else {
            d.v.set(0, 0, 0);
            d.rest = true;
          }
        }
        const wl = d.w.length();
        if (wl > 0.01 && !d.rest) d.q.multiply(_q.setFromAxisAngle(_a.copy(d.w).multiplyScalar(1 / wl), wl * dt));
      }
      // al final de su vida se hunde en el suelo
      let sc = d.s;
      if (d.t > d.life) sc *= Math.max(0, 1 - (d.t - d.life) / 1.5);
      if (d.t > d.life + 1.5) {
        d.on = false;
        continue;
      }
      _m.compose(d.p, d.q, _s.set(sc, sc, sc));
      this.mesh.setMatrixAt(c++, _m);
    }
    this.mesh.count = c;
    if (c) this.mesh.instanceMatrix.needsUpdate = true;
  }
  clear() {
    for (const d of this.list) d.on = false;
    this.mesh.count = 0;
  }
}
