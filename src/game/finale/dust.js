// Las nubes de polvo de los derrumbes: bocanadas grandes y blandas que salen
// disparadas con el golpe, se frenan enseguida (el polvo pesa poco), crecen,
// se arrastran por el suelo como una ola, suben despacio y se quedan flotando
// unos segundos antes de deshacerse. Todo en una malla instanciada (un solo
// dibujado, cientos de bocanadas); el color es el de la luz del sitio (la
// luna, las antorchas que hay cerca) y se funde con la niebla como el resto.
import * as THREE from 'three';
import { G } from '../../gfx/materials.js';
import { FX_FAR } from '../../gfx/effects.js';
import { makeTextureFromCanvas } from '../../gfx/textures.js';

const rnd = (a, b) => a + Math.random() * (b - a);

// Una bocanada: bultos redondos que se solapan (coliflor), con la parte de
// arriba más clara (la luz viene de arriba) y el borde deshilachado.
function puffTexture() {
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x2 = c.getContext('2d');
  const img = x2.createImageData(S, S);
  // (con semilla: la misma en cada partida)
  let seed = 913;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const lumps = [];
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2,
      d = r() * 0.42;
    lumps.push([0.5 + Math.cos(a) * d, 0.52 + Math.sin(a) * d * 0.85, 0.2 + r() * 0.2]);
  }
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const u = (x + 0.5) / S,
        v = (y + 0.5) / S;
      let a = 0,
        top = 0;
      for (const [lx, ly, lr] of lumps) {
        const d = Math.hypot(u - lx, v - ly) / lr;
        if (d < 1) {
          const k = 1 - d * d;
          a = Math.max(a, k);
          // (lo alto de cada bulto, más claro)
          top = Math.max(top, k * Math.max(0, (ly - v) / lr + 0.4));
        }
      }
      // grano (la textura del polvo)
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const g = n - Math.floor(n);
      a = Math.max(0, a * (0.8 + g * 0.35) - 0.06);
      const fall = Math.max(0, 1 - Math.hypot(u - 0.5, v - 0.5) * 1.9);
      a *= Math.min(1, fall * 1.6);
      const l = Math.min(1, 0.62 + top * 0.5 + (0.5 - v) * 0.22);
      const o = (y * S + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.round(l * 255);
      img.data[o + 3] = Math.round(Math.min(1, a) * 255);
    }
  x2.putImageData(img, 0, 0);
  return makeTextureFromCanvas(c, { repeat: false, nearest: false });
}

const VS = `
attribute vec4 iA; // centro y tamaño
attribute vec4 iB; // color y opacidad
attribute float iR; // giro
uniform vec2 uSnap; uniform float uFar;
uniform vec3 fogColor; uniform float fogDensity;
varying vec2 vUv; varying vec4 vC; varying float vFog;
vec4 psxSnap(vec4 p){ vec2 s = uSnap*0.5; if(uSnap.x > 0.0 && p.w>0.05){ p.xy = floor(p.xy/p.w*s+0.5)/s*p.w; } return p; }
void main(){
  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float c = cos(iR), s = sin(iR);
  vec2 q = vec2(position.x * c - position.y * s, position.x * s + position.y * c);
  vec3 wp = iA.xyz + (camRight * q.x + camUp * q.y) * iA.w;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  gl_Position = psxSnap(projectionMatrix * mv);
  vUv = uv;
  float d = length(mv.xyz);
  // (la que se pega a la cámara se desvanece: no tapa la pantalla entera)
  float near = smoothstep(iA.w * 0.35, iA.w * 1.4 + 0.6, -mv.z);
  vFog = exp(-fogDensity * fogDensity * d * d * 0.45) * (1.0 - smoothstep(uFar * 0.8, uFar * 1.05, d));
  vC = vec4(iB.rgb, iB.a * near);
}`;
const FS = `
uniform sampler2D tMap; uniform vec3 fogColor;
varying vec2 vUv; varying vec4 vC; varying float vFog;
void main(){
  vec4 t = texture2D(tMap, vUv);
  float a = t.a * vC.a;
  if (a < 0.01) discard;
  vec3 col = mix(fogColor, vC.rgb * t.rgb, vFog);
  gl_FragColor = vec4(col, a * (0.3 + 0.7 * vFog));
}`;

export class DustClouds {
  constructor(scene, max = 520) {
    this.max = max;
    const geo = new THREE.InstancedBufferGeometry();
    const base = new THREE.PlaneGeometry(1, 1);
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);
    this.A = new Float32Array(max * 4);
    this.B = new Float32Array(max * 4);
    this.R = new Float32Array(max);
    this.aA = new THREE.InstancedBufferAttribute(this.A, 4).setUsage(THREE.DynamicDrawUsage);
    this.aB = new THREE.InstancedBufferAttribute(this.B, 4).setUsage(THREE.DynamicDrawUsage);
    this.aR = new THREE.InstancedBufferAttribute(this.R, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iA', this.aA);
    geo.setAttribute('iB', this.aB);
    geo.setAttribute('iR', this.aR);
    geo.instanceCount = 0;
    const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { tMap: { value: null }, uSnap: G.uSnap, uFar: FX_FAR }]);
    u.uSnap = G.uSnap;
    u.uFar = FX_FAR;
    u.tMap.value = puffTexture();
    this.mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: u, transparent: true, depthWrite: false, fog: true });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
    scene.add(this.mesh);
    this.geo = geo;
    this.list = [];
    this.free = [];
    for (let i = 0; i < max; i++) {
      this.list.push({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 1, grow: 1, a0: 0.5, t: 0, life: 4, rot: 0, w: 0, c: [0.3, 0.3, 0.3], drag: 2.4, rise: 0.4, floor: -1e9 });
      this.free.push(max - 1 - i);
    }
    this._oldest = 0;
    // el suelo (lo pone el director: el de la colisión)
    this.groundAt = null;
  }
  _take() {
    if (this.free.length) return this.list[this.free.pop()];
    // (lleno: se recicla la más vieja)
    let best = null;
    for (const d of this.list) if (!best || d.t / d.life > best.t / best.life) best = d;
    return best;
  }
  // Un estallido de polvo en 'at': n bocanadas. o: { speed (m/s), up, dir
  // (Vector3: empuje), size (m), grow (m/s), life (s), color [r,g,b], alpha,
  // spread (radio de salida), drag, rise (m/s² hacia arriba), ground (rueda
  // por el suelo) }
  burst(at, n, o = {}) {
    const sp = o.speed ?? 5,
      up = o.up ?? 1.5,
      size = o.size ?? 2.2,
      spread = o.spread ?? 1,
      life = o.life ?? 4.5,
      col = o.color ?? [0.3, 0.29, 0.28];
    for (let i = 0; i < n; i++) {
      const d = this._take();
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * spread;
      d.on = true;
      d.t = -(o.stagger ? Math.random() * o.stagger : 0);
      d.p.set(at.x + Math.cos(a) * r, at.y + (o.h ? Math.random() * o.h : rnd(-0.2, 0.4)), at.z + Math.sin(a) * r);
      const s = sp * rnd(0.35, 1);
      d.v.set(Math.cos(a) * s, up * rnd(0.3, 1.2), Math.sin(a) * s);
      if (o.dir) d.v.addScaledVector(o.dir, rnd(0.6, 1.2));
      d.s = size * rnd(0.55, 1.15);
      d.grow = (o.grow ?? 1.2) * rnd(0.6, 1.3);
      d.life = life * rnd(0.7, 1.3);
      d.a0 = (o.alpha ?? 0.55) * rnd(0.75, 1.1);
      d.rot = Math.random() * Math.PI * 2;
      d.w = rnd(-0.5, 0.5);
      const k = rnd(0.88, 1.1);
      d.c[0] = col[0] * k;
      d.c[1] = col[1] * k;
      d.c[2] = col[2] * k;
      d.drag = o.drag ?? 2.4;
      d.rise = o.rise ?? 0.35;
      d.ground = o.ground !== false;
    }
  }
  // Una cortina de polvo a lo largo de un segmento (un muro que se viene
  // abajo entero): n bocanadas de a a b
  line(a, b, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const u = (i + Math.random()) / n;
      this.burst({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u }, 1, o);
    }
  }
  // La onda de polvo a ras de suelo de un golpe tremendo: un anillo que se
  // abre deprisa y se arrastra
  ring(at, n, o = {}) {
    const sp = o.speed ?? 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd(-0.15, 0.15);
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      this.burst({ x: at.x + dir.x * (o.r0 ?? 0.8), y: at.y + 0.3, z: at.z + dir.z * (o.r0 ?? 0.8) }, 1, { ...o, speed: 0.6, dir: dir.multiplyScalar(sp), up: o.up ?? 0.5, spread: 0.2 });
    }
  }
  clear() {
    this.free.length = 0;
    for (let i = 0; i < this.max; i++) {
      this.list[i].on = false;
      this.free.push(this.max - 1 - i);
    }
    this.geo.instanceCount = 0;
  }
  update(dt) {
    let n = 0;
    const A = this.A,
      B = this.B,
      R = this.R;
    for (let i = 0; i < this.max; i++) {
      const d = this.list[i];
      if (!d.on) continue;
      d.t += dt;
      if (d.t < 0) continue;
      if (d.t >= d.life) {
        d.on = false;
        this.free.push(i);
        continue;
      }
      // (el polvo pesa poco: se frena enseguida y luego flota y sube)
      const k = Math.exp(-d.drag * dt);
      d.v.x *= k;
      d.v.z *= k;
      d.v.y = d.v.y * k + d.rise * dt;
      d.p.addScaledVector(d.v, dt);
      // a ras del suelo, se arrastra en vez de hundirse
      if (d.ground && this.groundAt) {
        const gy = this.groundAt(d.p.x, d.p.z, d.p.y) + d.s * 0.28;
        if (d.p.y < gy) {
          d.p.y = gy;
          if (d.v.y < 0) d.v.y = 0;
        }
      }
      d.s += d.grow * dt * Math.max(0.25, 1 - d.t / d.life);
      d.rot += d.w * dt;
      const u = d.t / d.life;
      // aparece de golpe (el golpe) y se deshace despacio
      const a = d.a0 * Math.min(1, d.t / 0.06) * Math.pow(1 - u, 1.4);
      const o = n * 4;
      A[o] = d.p.x;
      A[o + 1] = d.p.y;
      A[o + 2] = d.p.z;
      A[o + 3] = d.s;
      B[o] = d.c[0];
      B[o + 1] = d.c[1];
      B[o + 2] = d.c[2];
      B[o + 3] = a;
      R[n] = d.rot;
      n++;
    }
    this.geo.instanceCount = n;
    if (n) {
      this.aA.needsUpdate = true;
      this.aB.needsUpdate = true;
      this.aR.needsUpdate = true;
    }
  }
}
