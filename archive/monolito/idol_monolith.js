// El ídolo de la fuente en forma de monolito: el montaje y lo que se mueve
// (la geometría, en idol_monolith_geo.js, que se calcula en un hilo de
// fondo). El material de la piedra es el de los colosos (triplanar, colores
// en los vértices, la luz del sitio) y, en el sombreador, las almas: cada
// cara y cada mano empuja un poco, como si respirase; la que grita (cry)
// empuja más y se le enciende la boca; los brazos se mecen, y los párpados
// del ojo se abultan cerrados y se retiran abiertos (setOpen). Lo de dentro
// del ojo mira (lookAt).
import * as THREE from 'three';
import { objMat, cloneMat, colMat, cutoutMat, registerMaterialPatch } from '../../src/gfx/materials.js';
import { getTexture } from '../../src/gfx/textures.js';
import { NSOUL, MONO } from './idol_monolith_geo.js';

const TAU = Math.PI * 2;
const V3 = THREE.Vector3;

// ============================================================ el material
// El de la piedra: el de los colosos (triplanar, colores en los vértices y
// la luz del sitio) y, encima, las almas.
function soulMaterial() {
  const m = cloneMat(colMat('idolMono', { tri: 1.15 }));
  const U = {
    uScream: { value: new Float32Array(NSOUL) },
    uOpen: { value: 0 },
    uPulse: { value: 0 },
    uWake: { value: 0 },
    uGlowCol: { value: new THREE.Color(2.4, 0.3, 0.09) },
  };
  const base = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    base(sh, r);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec4 aSoul;
attribute vec4 aSway;
uniform float uScream[${NSOUL}];
uniform float uOpen;
uniform float uPulse;
uniform float uWake;
varying float vGlow;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
{
  // el alma que empuja (y la que grita, más), los párpados y los brazos
  float sc = aSoul.z < -0.5 ? 0.0 : uScream[int(aSoul.z + 0.5)];
  float br = sin(uTime * 0.7 + aSoul.w) * 0.5 + 0.5;
  transformed += objectNormal * aSoul.x * (0.012 * br + 0.075 * sc);
  if (aSway.w < -0.5) transformed += objectNormal * mix(aSway.x, aSway.y, uOpen);
  else transformed += aSway.xyz * (sin(uTime * 0.53 + aSway.w) + 0.4 * sin(uTime * 1.37 + aSway.w * 1.7));
  vGlow = aSoul.y * (0.12 + 0.38 * uPulse + 2.6 * sc + uWake);
}`
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform vec3 uGlowCol;
varying float vGlow;`
      )
      .replace(
        '#include <aomap_fragment>',
        `totalEmissiveRadiance += uGlowCol * vGlow;
#include <aomap_fragment>`
      );
  };
  const ck = m.customProgramCacheKey();
  m.customProgramCacheKey = () => ck + '-almas';
  m.userData.U = U;
  return m;
}

// un BufferGeometry con los arrays de unos datos
function geom(a, uv = false) {
  const g = new THREE.BufferGeometry();
  const S = { position: 3, normal: 3, uv: 2, color: 3, aSoul: 4, aSway: 4 };
  for (const k in S) if (a[k]) g.setAttribute(k, new THREE.BufferAttribute(a[k], S[k]));
  if (a.index) g.setIndex(new THREE.BufferAttribute(a.index, 1));
  if (uv && !a.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(a.position.length / 1.5), 2));
  if (!a.normal) g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

// ============================================================ el monolito
export class Monolith {
  // d: lo que devuelve monolithData (idol_monolith_geo.js)
  constructor(d) {
    this.isMonolith = true;
    this.root = new THREE.Group();
    this.joints = { base: this.root };
    this.restQ = {};
    this.meshes = [];
    this.mats = [];
    this.ms = d.ms;
    const mat = (this.mat = soulMaterial());
    this.U = mat.userData.U;
    const add = (g, m, own = true) => {
      const mesh = new THREE.Mesh(g, m);
      this.root.add(mesh);
      this.meshes.push(mesh);
      if (own && !this.mats.includes(m)) this.mats.push(m);
      return mesh;
    };
    add(geom(d.body, true), mat);
    add(geom(d.arms, true), mat);
    add(geom(d.gold), cloneMat(objMat('idolGold')));
    add(geom(d.cut), cloneMat(objMat('redGlow')));
    add(geom(d.drips), cloneMat(objMat('blood')));
    add(geom(d.band), cloneMat(objMat('plateRust')));
    add(geom(d.studs), cloneMat(objMat('iron')));
    if (d.prints) add(geom(d.prints), cutoutMat('ochreHand', { lit: true, side: THREE.FrontSide }), false);
    this.stump = new V3(...d.stump);
    // ---------------------------------------------- el ojo
    const c = new V3(...d.eye.c),
      n = new V3(...d.eye.n);
    const eye = (this.eye = new THREE.Group());
    eye.position.copy(c);
    eye.quaternion.setFromUnitVectors(new V3(0, 0, 1), n);
    this.eyeRest = eye.quaternion.clone();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(MONO.eyeR, 24, 18), cloneMat(objMat('idolEyeball')));
    const cap = new THREE.SphereGeometry(MONO.eyeR * 1.006, 24, 10, 0, TAU, 0, 0.62);
    cap.rotateX(Math.PI / 2);
    const rc = MONO.eyeR * Math.sin(0.62);
    const pa = cap.attributes.position,
      uv = cap.attributes.uv;
    for (let i = 0; i < pa.count; i++) uv.setXY(i, pa.getX(i) / (2 * rc) + 0.5, pa.getY(i) / (2 * rc) + 0.5);
    const irisM = registerMaterialPatch(new THREE.MeshBasicMaterial({ map: getTexture('idolIris') }));
    const iris = new THREE.Mesh(cap, irisM);
    eye.add(ball, iris);
    this.root.add(eye);
    this.meshes.push(ball, iris);
    this.mats.push(ball.material, irisM);
    this.irisMat = irisM;
    // las almas que pueden gritar
    this.souls = d.souls.map((S) => (S ? { p: new V3(...S.p), n: new V3(...S.n), s: S.s, face: S.face } : null));
    this.env = new Float32Array(NSOUL);
    this.hold = new Float32Array(NSOUL);
    this.open = 0;
    this._yaw = 0;
    this._pitch = 0;
    this._q = new THREE.Quaternion();
    this._qi = this.eyeRest.clone().invert();
    this._e = new THREE.Euler();
    this._v = new V3();
  }

  own() {}
  setProbe(r, g, b, groundY, ao = 0.34) {
    for (const m of this.mats) {
      if (!m._u) continue;
      m._u.uProbe.value.set(r, g, b);
      m._u.uGround.value.set(groundY, ao);
    }
  }
  // la luz de dentro: el latido de la fuente y lo que la avive (0..1)
  setPulse(p, wake = 0) {
    this.U.uPulse.value = p;
    this.U.uWake.value = wake;
  }
  // el ojo: 0, cerrado; 1, abierto del todo
  setOpen(v) {
    this.open = v;
    this.U.uOpen.value = v;
    this.irisMat.color.setScalar(0.25 + 1.6 * v);
  }
  // que mire a un punto (en el espacio del ídolo), sin pasarse
  lookAt(L, dt, k = 0.6) {
    const e = this.eye;
    const loc = this._v.copy(L).sub(e.position).normalize().applyQuaternion(this._qi);
    const yaw = Math.max(-0.55, Math.min(0.55, Math.atan2(loc.x, loc.z)));
    const pitch = Math.max(-0.45, Math.min(0.35, Math.atan2(loc.y, Math.hypot(loc.x, loc.z))));
    this._yaw += Math.max(-k * dt, Math.min(k * dt, yaw - this._yaw));
    this._pitch += Math.max(-k * dt, Math.min(k * dt, pitch - this._pitch));
    e.quaternion.copy(this.eyeRest).multiply(this._q.setFromEuler(this._e.set(-this._pitch, this._yaw, 0, 'YXZ')));
  }
  // que grite el alma i (dura hold segundos)
  cry(i, hold = 0.9) {
    if (i < 0 || i >= NSOUL) return;
    this.hold[i] = Math.max(this.hold[i], hold);
  }
  update(dt) {
    const S = this.U.uScream.value;
    for (let i = 0; i < NSOUL; i++) {
      if (this.hold[i] > 0) {
        this.hold[i] -= dt;
        this.env[i] = Math.min(1, this.env[i] + dt / 0.22);
      } else this.env[i] = Math.max(0, this.env[i] - dt / 1.3);
      S[i] = this.env[i] * this.env[i] * (3 - 2 * this.env[i]);
    }
  }
  dispose() {
    for (const m of this.meshes) m.geometry.dispose();
    for (const m of this.mats) m.dispose();
  }
}
