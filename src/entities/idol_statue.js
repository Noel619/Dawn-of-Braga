// La estatua de la fuente montada (la geometría, en idol_statue_geo.js, que
// se esculpe en un hilo de fondo) y lo que se mueve: la cabeza, que se
// vuelve muy despacio hacia quien se acerca (setLook); el ojo de la
// costura, que se abre (setOpen: los párpados de piedra se retiran) y lo de
// dentro, que mira (lookAt); y lo que arde, que late con la fuente
// (setPulse): la costura, la brasa del pecho y el muñón.
import * as THREE from 'three';
import { objMat, cloneMat, registerMaterialPatch } from '../gfx/materials.js';
import { getTexture } from '../gfx/textures.js';
import { assemble } from './colossus/model.js';

const V3 = THREE.Vector3;
const TAU = Math.PI * 2;

// El material de la piedra (el del coloso: triplanar, colores en los
// vértices, la luz del sitio) y, en el sombreador, el ojo: los párpados
// (aLid: lo que se mueve con el ojo cerrado) y lo que arde (aGlow).
function stoneMaterial(base) {
  const m = cloneMat(base);
  const U = {
    uOpen: { value: 0 },
    uPulse: { value: 0 },
    uWake: { value: 0 },
    uSeam: { value: new THREE.Color(3.2, 0.42, 0.1) },
    uEmber: { value: new THREE.Color(0.55, 0.09, 0.03) },
  };
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec3 aLid;
attribute vec3 aGlow;
uniform float uOpen;
uniform float uPulse;
uniform float uWake;
varying vec3 vSGlow;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
transformed += aLid * (1.0 - uOpen);
// la costura arde con el ojo cerrado; la brasa y el muñón, con el latido
vSGlow = vec3(aGlow.x * (1.0 - uOpen) * (0.35 + 0.65 * uPulse + uWake), aGlow.y * (0.45 + 0.9 * uPulse + uWake), aGlow.z * (0.5 + 0.6 * uPulse + uWake));`
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform vec3 uSeam;
uniform vec3 uEmber;
varying vec3 vSGlow;`
      )
      .replace(
        '#include <aomap_fragment>',
        `totalEmissiveRadiance += uSeam * vSGlow.x + uEmber * vSGlow.y + uSeam * vSGlow.z;
#include <aomap_fragment>`
      );
  };
  const ck = m.customProgramCacheKey();
  m.customProgramCacheKey = () => ck + '-estatua';
  m.userData.U = U;
  return m;
}

export class Statue {
  // d: los datos de idol_statue_geo.js (statueData), ya desempaquetados
  constructor(d) {
    this.isStatue = true;
    const M = (this.model = assemble(d, { own: true }));
    this.root = M.root;
    this.joints = M.byName;
    this.restQ = {};
    for (const b of M.bones) this.restQ[b.name] = b.quaternion.clone();
    this.ms = d.ms;
    this.extra = d.extra;
    // la piedra, con el ojo y lo que arde
    const stone = M.meshes[0].material;
    this.mat = stoneMaterial(Array.isArray(stone) ? stone[0] : stone);
    this.U = this.mat.userData.U;
    for (const m of M.meshes) m.material = this.mat;
    this.mats = [...M.mats, this.mat];
    // la brasa del pecho: sus colores (la costra y las grietas) son su luz
    this.ember = M.parts.find((p) => p.userData.grp === 'ember') || null;
    if (this.ember) {
      const em = registerMaterialPatch(new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xffffff }));
      this.ember.material = em;
      this.mats.push(em);
    }
    // ---------------------------------------------- el ojo
    const E = d.extra.eye;
    const head = M.byName.head;
    const eye = (this.eye = new THREE.Group());
    // (en el espacio del hueso de la cabeza)
    const hw = M.restWorld.head;
    eye.position.set(E.c[0] - hw.x, E.c[1] - hw.y, E.c[2] - hw.z);
    eye.quaternion.setFromUnitVectors(new V3(0, 0, 1), new V3(...E.n));
    this.eyeRest = eye.quaternion.clone();
    const ballM = cloneMat(objMat('idolEyeball'));
    ballM.color.setHex(0x120404);
    ballM.emissive.setHex(0x1a0302);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(E.r, 24, 18), ballM);
    const cap = new THREE.SphereGeometry(E.r * 1.006, 24, 10, 0, TAU, 0, 0.66);
    cap.rotateX(Math.PI / 2);
    const rc = E.r * Math.sin(0.66);
    const pa = cap.attributes.position,
      uv = cap.attributes.uv;
    // (la pupila: una raja de arriba abajo, como la almendra)
    for (let i = 0; i < pa.count; i++) uv.setXY(i, pa.getX(i) / (2 * rc) + 0.5, pa.getY(i) / (2 * rc) + 0.5);
    const irisM = registerMaterialPatch(new THREE.MeshBasicMaterial({ map: getTexture('idolIris') }));
    const iris = new THREE.Mesh(cap, irisM);
    eye.add(ball, iris);
    head.add(eye);
    this.mats.push(ball.material, irisM);
    this.irisMat = irisM;
    this.meshes = [...M.meshes, ...M.parts, ball, iris];
    this.root.traverse((o) => (o.frustumCulled = false));
    this.open = 0;
    this._yaw = 0;
    this._pitch = 0;
    this._hy = 0;
    this._hp = 0;
    this._q = new THREE.Quaternion();
    this._qi = this.eyeRest.clone().invert();
    this._e = new THREE.Euler();
    this._v = new V3();
    this.setOpen(0);
  }

  own() {}
  setProbe(r, g, b, groundY, ao = 0.3) {
    for (const m of this.mats) {
      if (!m._u) continue;
      m._u.uProbe.value.set(r, g, b);
      m._u.uGround.value.set(groundY, ao);
    }
  }
  // lo que arde: el latido de la fuente (0..1) y lo que la avive
  setPulse(p, wake = 0) {
    this.U.uPulse.value = p;
    this.U.uWake.value = wake;
    if (this.ember) this.ember.material.color.setScalar(0.55 + 0.9 * p + wake * 1.5);
  }
  // el ojo: 0, cerrado (la costura); 1, abierto del todo
  setOpen(v) {
    this.open = v;
    this.U.uOpen.value = v;
    this.irisMat.color.setScalar(0.2 + 1.7 * v);
    this.eye.visible = v > 0.02;
  }
  // la cabeza: que se vuelva hacia un punto (en el espacio de la estatua),
  // muy despacio y poco (es piedra)
  setLook(L, dt, k = 0.18) {
    const hb = this.joints.head;
    const hw = this.model.restWorld.head;
    const dx = L.x - hw.x,
      dz = L.z - hw.z,
      dy = L.y - hw.y;
    const yaw = Math.max(-0.38, Math.min(0.38, Math.atan2(dx, Math.max(0.5, dz))));
    const pitch = Math.max(-0.2, Math.min(0.22, Math.atan2(dy + 6, Math.hypot(dx, dz)) * 0.35));
    this._hy += Math.max(-k * dt, Math.min(k * dt, yaw - this._hy));
    this._hp += Math.max(-k * dt, Math.min(k * dt, pitch - this._hp));
    hb.quaternion.copy(this.restQ.head).multiply(this._q.setFromEuler(this._e.set(-this._hp, this._hy, 0, 'YXZ')));
  }
  // lo de dentro del ojo: que mire a un punto (en el espacio de la estatua)
  lookAt(L, dt, k = 0.6) {
    const e = this.eye;
    e.parent.updateWorldMatrix(true, false);
    const W = this.root.localToWorld(this._v.copy(L));
    const loc = e.parent.worldToLocal(W).sub(e.position).normalize().applyQuaternion(this._qi);
    const yaw = Math.max(-0.6, Math.min(0.6, Math.atan2(loc.x, loc.z)));
    const pitch = Math.max(-0.5, Math.min(0.45, Math.atan2(loc.y, Math.hypot(loc.x, loc.z))));
    this._yaw += Math.max(-k * dt, Math.min(k * dt, yaw - this._yaw));
    this._pitch += Math.max(-k * dt, Math.min(k * dt, pitch - this._pitch));
    e.quaternion.copy(this.eyeRest).multiply(this._q.setFromEuler(this._e.set(-this._pitch, this._yaw, 0, 'YXZ')));
  }
  update() {}
  dispose() {
    for (const m of this.meshes) m.geometry && m.geometry.dispose();
    for (const m of this.mats) m.dispose();
  }
}
