// Una tela colgada que se mueve de verdad (el estandarte del presbiterio,
// al que se agarra el jugador al caer en la nave): una malla de puntos con
// inercia (Verlet), gravedad, un poco de viento y las distancias entre
// vecinos (de lado, de arriba abajo y en diagonal) que se mantienen. Unos
// puntos van clavados (a la barra), otros los lleva el guion (las manos del
// que se agarra); soltar los de la barra la rasga.
import * as THREE from 'three';
import { getTexture } from '../../gfx/textures.js';
import { registerMaterialPatch } from '../../gfx/materials.js';

const _v = new THREE.Vector3();

export class Cloth {
  // o: { w, h (metros), nx, ny (puntos), tex, x, y, z (el centro de la barra),
  //      rotY, wind }
  constructor(scene, o) {
    this.scene = scene;
    const nx = (this.nx = o.nx ?? 6),
      ny = (this.ny = o.ny ?? 10);
    this.w = o.w;
    this.h = o.h;
    this.wind = o.wind ?? 0.6;
    const geo = new THREE.PlaneGeometry(o.w, o.h, nx - 1, ny - 1);
    geo.translate(0, -o.h / 2, 0);
    geo.rotateY(o.rotY ?? 0);
    geo.translate(o.x, o.y, o.z);
    this.geo = geo;
    const P = geo.attributes.position;
    this.p = [];
    this.q = [];
    for (let i = 0; i < P.count; i++) {
      this.p.push(new THREE.Vector3().fromBufferAttribute(P, i));
      this.q.push(new THREE.Vector3().fromBufferAttribute(P, i));
    }
    // restricciones: [a, b, largo]
    this.links = [];
    const id = (i, j) => j * nx + i;
    const L = (a, b) => this.links.push([a, b, this.p[a].distanceTo(this.p[b])]);
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        if (i < nx - 1) L(id(i, j), id(i + 1, j));
        if (j < ny - 1) L(id(i, j), id(i, j + 1));
        if (i < nx - 1 && j < ny - 1) {
          L(id(i, j), id(i + 1, j + 1));
          L(id(i + 1, j), id(i, j + 1));
        }
      }
    this.id = id;
    // clavados: índice -> Vector3 (o función que lo da)
    this.pins = new Map();
    for (let i = 0; i < nx; i++) this.pins.set(id(i, 0), this.p[id(i, 0)].clone());
    const mat = new THREE.MeshLambertMaterial({ map: getTexture(o.tex ?? 'bannerBlack'), alphaTest: 0.5, side: THREE.DoubleSide });
    registerMaterialPatch(mat, {});
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.t = 0;
  }
  // clava un punto (i, j) en un sitio (Vector3 o función que lo da)
  pin(i, j, at) {
    this.pins.set(this.id(i, j), at);
  }
  unpin(i, j) {
    this.pins.delete(this.id(i, j));
  }
  // dónde está un punto (i, j)
  at(i, j, out = new THREE.Vector3()) {
    return out.copy(this.p[this.id(i, j)]);
  }
  // un empujón a toda la tela (m/s)
  kick(vx, vy, vz, dt = 1 / 60) {
    for (let k = 0; k < this.p.length; k++) {
      if (this.pins.has(k)) continue;
      this.q[k].x -= vx * dt;
      this.q[k].y -= vy * dt;
      this.q[k].z -= vz * dt;
    }
  }
  update(dt) {
    if (dt <= 0) return;
    dt = Math.min(dt, 1 / 30);
    this.t += dt;
    const g = -9.8 * dt * dt;
    const wx = Math.sin(this.t * 1.3) * this.wind * dt * dt,
      wz = Math.cos(this.t * 0.9) * this.wind * 0.6 * dt * dt;
    // inercia (con roce del aire)
    for (let k = 0; k < this.p.length; k++) {
      const p = this.p[k],
        q = this.q[k];
      const vx = (p.x - q.x) * 0.985,
        vy = (p.y - q.y) * 0.985,
        vz = (p.z - q.z) * 0.985;
      q.copy(p);
      p.x += vx + wx;
      p.y += vy + g;
      p.z += vz + wz;
    }
    const fix = () => {
      for (const [k, at] of this.pins) {
        const t = typeof at === 'function' ? at(_v) : at;
        if (t) this.p[k].copy(t);
      }
    };
    for (let it = 0; it < 8; it++) {
      fix();
      for (const [a, b, len] of this.links) {
        const A = this.p[a],
          B = this.p[b];
        _v.subVectors(B, A);
        const d = _v.length();
        if (d < 1e-6) continue;
        const pa = this.pins.has(a),
          pb = this.pins.has(b);
        if (pa && pb) continue;
        const diff = (d - len) / d;
        const ka = pa ? 0 : pb ? 1 : 0.5,
          kb = pb ? 0 : pa ? 1 : 0.5;
        A.addScaledVector(_v, diff * ka);
        B.addScaledVector(_v, -diff * kb);
      }
    }
    fix();
    const P = this.geo.attributes.position;
    for (let k = 0; k < this.p.length; k++) P.setXYZ(k, this.p[k].x, this.p[k].y, this.p[k].z);
    P.needsUpdate = true;
    this.geo.computeVertexNormals();
  }
  dispose() {
    this.scene.remove(this.mesh);
    this.geo.dispose();
  }
}
