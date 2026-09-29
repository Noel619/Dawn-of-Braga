// Efectos: fuego (billboards instanciados con atlas animado), halos, humo,
// brasas, ceniza cayendo, sangre, chispas y pool de luces dinámicas.
import * as THREE from 'three';
import { getTexture } from './textures.js';
import { G, registerMaterialPatch } from './materials.js';

const SNAP = `
vec4 psxSnap(vec4 p){ vec2 s = uSnap*0.5; if(uSnap.x > 0.0 && p.w>0.05){ p.xy = floor(p.xy/p.w*s+0.5)/s*p.w; } return p; }`;

const FOG_PARS = `
uniform vec3 fogColor; uniform float fogDensity; uniform float uFar;
float farFade(float d){ return 1.0 - smoothstep(uFar * 0.72, uFar, d); }`;

// radio de dibujo de los efectos (se ajusta al plano lejano)
export const FX_FAR = { value: 60 };

function commonUniforms(extra = {}) {
  return THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTime: G.uTime,
      uSnap: G.uSnap,
      uFar: FX_FAR,
      ...extra,
    },
  ]);
}

// ------------------------------------------------------------------ fuego
export class FireSystem {
  constructor(scene, max = 160) {
    this.max = max;
    this.list = [];
    this.scene = scene;

    const mk = (count, vs, fs, tex, blending, extraUniforms = {}) => {
      const geo = new THREE.InstancedBufferGeometry();
      const base = new THREE.PlaneGeometry(1, 1);
      geo.index = base.index;
      geo.setAttribute('position', base.attributes.position);
      geo.setAttribute('uv', base.attributes.uv);
      const iPos = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
      geo.setAttribute('iPos', iPos);
      geo.instanceCount = 0;
      const u = commonUniforms({ tMap: { value: getTexture(tex) }, ...extraUniforms });
      // Asegurar que el uniform de tiempo es compartido (merge clona)
      u.uTime = G.uTime;
      u.uSnap = G.uSnap;
      u.uFar = FX_FAR;
      const mat = new THREE.ShaderMaterial({
        vertexShader: vs,
        fragmentShader: fs,
        uniforms: u,
        transparent: true,
        depthWrite: false,
        blending,
        fog: true,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = 5;
      scene.add(mesh);
      return { geo, iPos, mesh, mat };
    };

    const FIRE_VS = `
      attribute vec4 iPos; // xyz + escala
      uniform float uTime; uniform vec2 uSnap;
      varying vec2 vUv; varying float vFog; varying float vFrame;
      ${SNAP}
      ${FOG_PARS}
      void main(){
        vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        float s = iPos.w;
        float ph = fract(iPos.x*0.37 + iPos.z*0.73);
        vec3 wp = iPos.xyz + camRight * position.x * s * 0.62 + vec3(0.0, (position.y + 0.5) * s * 1.25, 0.0);
        vec4 mv = viewMatrix * vec4(wp, 1.0);
        gl_Position = psxSnap(projectionMatrix * mv);
        vFrame = floor(mod(uTime * 11.0 + ph * 8.0, 8.0));
        vUv = uv;
        float d = length(mv.xyz);
        vFog = exp(-fogDensity*fogDensity*d*d*0.55) * farFade(d);
      }`;
    const FIRE_FS = `
      uniform sampler2D tMap;
      varying vec2 vUv; varying float vFog; varying float vFrame;
      void main(){
        vec4 c = texture2D(tMap, vec2((vUv.x + vFrame) / 8.0, vUv.y));
        if (c.a < 0.05) discard;
        gl_FragColor = vec4(c.rgb * c.a * 2.2 * vFog, 1.0);
      }`;
    this.fire = mk(max * 2, FIRE_VS, FIRE_FS, 'fire', THREE.AdditiveBlending);

    const GLOW_VS = `
      attribute vec4 iPos;
      uniform float uTime; uniform vec2 uSnap;
      varying vec2 vUv; varying float vA;
      ${SNAP}
      ${FOG_PARS}
      void main(){
        vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        float s = iPos.w * 3.2;
        float fl = 0.85 + 0.15*sin(uTime*13.0 + iPos.x*5.0) * sin(uTime*7.3 + iPos.z*3.0);
        vec3 wp = iPos.xyz + vec3(0.0, iPos.w*0.45, 0.0) + (camRight * position.x + camUp * position.y) * s * fl;
        vec4 mv = viewMatrix * vec4(wp, 1.0);
        gl_Position = psxSnap(projectionMatrix * mv);
        vUv = uv;
        float d = length(mv.xyz);
        vA = exp(-fogDensity*fogDensity*d*d*0.35) * fl * farFade(d);
      }`;
    const GLOW_FS = `
      uniform sampler2D tMap; uniform vec3 uColor;
      varying vec2 vUv; varying float vA;
      void main(){
        float a = texture2D(tMap, vUv).a;
        gl_FragColor = vec4(uColor * a * vA * 0.55, 1.0);
      }`;
    this.glow = mk(max, GLOW_VS, GLOW_FS, 'glow', THREE.AdditiveBlending, { uColor: { value: new THREE.Color(1.0, 0.45, 0.12) } });

    const SMOKE_VS = `
      attribute vec4 iPos;
      uniform float uTime; uniform vec2 uSnap;
      varying vec2 vUv; varying float vA;
      ${SNAP}
      ${FOG_PARS}
      void main(){
        vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        float ph = fract(iPos.x*0.131 + iPos.z*0.277 + iPos.y*0.51);
        float t = fract(uTime * 0.09 + ph);
        float s = iPos.w * (1.0 + t * 3.5);
        vec3 c = vec3(iPos.x, 0.0, iPos.z) + vec3(sin(ph*40.0 + t*2.0)*t*2.0 + t*3.0, 0.0, cos(ph*20.0)*t*1.5);
        c.y = iPos.y + t * 9.0;
        vec3 wp = c + (camRight * position.x + camUp * position.y) * s;
        vec4 mv = viewMatrix * vec4(wp, 1.0);
        gl_Position = psxSnap(projectionMatrix * mv);
        vUv = uv;
        float d = length(mv.xyz);
        vA = sin(t * 3.14159) * 0.55 * exp(-fogDensity*fogDensity*d*d*0.5) * farFade(d);
      }`;
    const SMOKE_FS = `
      uniform sampler2D tMap;
      varying vec2 vUv; varying float vA;
      void main(){
        float a = texture2D(tMap, vUv).a * vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vec3(0.07, 0.065, 0.06), a);
      }`;
    this.smoke = mk(max * 4, SMOKE_VS, SMOKE_FS, 'puff', THREE.NormalBlending);
    this.smoke.mesh.renderOrder = 4;

    // brasas
    const EMB = 24;
    this.emberPer = EMB;
    const eg = new THREE.BufferGeometry();
    this.emberPos = new Float32Array(max * EMB * 4);
    eg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * EMB * 3), 3));
    this.emberAttr = new THREE.BufferAttribute(this.emberPos, 4);
    eg.setAttribute('iPos', this.emberAttr);
    eg.setDrawRange(0, 0);
    const eu = commonUniforms({ uPix: { value: 1 } });
    eu.uTime = G.uTime;
    eu.uSnap = G.uSnap;
    eu.uFar = FX_FAR;
    this.emberMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec4 iPos; uniform float uTime; uniform vec2 uSnap; uniform float uPix;
        varying float vA;
        ${SNAP}
        ${FOG_PARS}
        void main(){
          float id = iPos.w;
          float ph = fract(sin(id*12.9898)*43758.5453);
          float sp = 0.25 + ph*0.35;
          float t = fract(uTime * sp + ph * 7.0);
          float s = max(0.6, fract(id*0.618)*1.8);
          vec3 p = iPos.xyz + vec3(sin(id*3.1 + t*6.0)*t*1.4*s, t*t*6.0*s + t*1.2, cos(id*1.7 + t*5.0)*t*1.4*s);
          vec4 mv = viewMatrix * vec4(p, 1.0);
          gl_Position = psxSnap(projectionMatrix * mv);
          gl_PointSize = uPix * 2.0 * (8.0 / max(1.0, -mv.z));
          float d = length(mv.xyz);
          vA = (1.0 - t) * exp(-fogDensity*fogDensity*d*d*0.4) * farFade(d);
        }`,
      fragmentShader: `
        varying float vA;
        void main(){ gl_FragColor = vec4(vec3(1.0, 0.45, 0.1) * vA * 2.5, 1.0); }`,
      uniforms: eu,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: true,
    });
    this.embers = new THREE.Points(eg, this.emberMat);
    this.embers.frustumCulled = false;
    scene.add(this.embers);
  }

  add(f) {
    this.list.push({ x: f.x, y: f.y, z: f.z, s: f.s ?? 1, light: f.light !== false, smoke: !!f.smoke, embers: f.embers ?? f.s > 0.5, on: true, glow: f.glow !== false });
    return this.list[this.list.length - 1];
  }

  // Actualiza qué fuegos cercanos se dibujan (llamar cada ~0.25 s)
  refresh(cx, cz, radius = FX_FAR.value) {
    let nf = 0,
      ng = 0,
      ns = 0,
      ne = 0;
    const F = this.fire.iPos.array,
      Gl = this.glow.iPos.array,
      S = this.smoke.iPos.array,
      E = this.emberPos;
    const cap = this.max;
    for (const f of this.list) {
      if (!f.on) continue;
      const dx = f.x - cx,
        dz = f.z - cz;
      if (dx * dx + dz * dz > radius * radius) continue;
      if (nf >= cap * 2 - 2) break;
      // dos llamas cruzadas por fuego grande para volumen
      F.set([f.x, f.y, f.z, f.s], nf * 4);
      nf++;
      if (f.s > 0.6) {
        F.set([f.x + 0.12 * f.s, f.y, f.z - 0.1 * f.s, f.s * 0.8], nf * 4);
        nf++;
      }
      if (f.glow && ng < cap) {
        Gl.set([f.x, f.y, f.z, f.s], ng * 4);
        ng++;
      }
      if (f.smoke && ns < cap * 4 - 4) {
        for (let i = 0; i < 4; i++) {
          S.set([f.x + i * 0.013, f.y + f.s * 0.8, f.z + i * 0.021, f.s * 0.9], ns * 4);
          ns++;
        }
      }
      if (f.embers && ne < cap * this.emberPer - this.emberPer) {
        const n = f.s > 1.2 ? this.emberPer : 8;
        for (let i = 0; i < n; i++) {
          E.set([f.x, f.y + 0.2, f.z, ne + i * 1.37 + f.x], ne * 4);
          ne++;
        }
      }
    }
    this.fire.geo.instanceCount = nf;
    this.glow.geo.instanceCount = ng;
    this.smoke.geo.instanceCount = ns;
    this.fire.iPos.needsUpdate = this.glow.iPos.needsUpdate = this.smoke.iPos.needsUpdate = true;
    this.embers.geometry.setDrawRange(0, ne);
    this.emberAttr.needsUpdate = true;
  }

  setPixelScale(k) {
    this.emberMat.uniforms.uPix.value = k;
  }
}

// ------------------------------------------------------------ luces dinámicas
// Un número fijo de luces puntuales (evita recompilar shaders). Cada ranura se
// asigna a una de las fuentes más cercanas; cuando deja de serlo se apaga
// suavemente antes de pasar a otra fuente (nada de saltos de iluminación).
export class LightPool {
  constructor(scene, n = 8) {
    this.slots = [];
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight(0xff8a3a, 0, 12, 1.6);
      scene.add(l);
      this.slots.push({ light: l, src: null, w: 0, target: 0 });
    }
    this.sources = [];
    this._t = null;
  }
  get lights() {
    return this.slots.map((s) => s.light);
  }
  add(src) {
    // src: {x,y,z, color, intensity, range, flicker, on}
    const s = { color: 0xff7a30, intensity: 6, range: 11, flicker: 1, on: true, ...src };
    s._c = new THREE.Color(s.color);
    this.sources.push(s);
    return s;
  }
  update(cx, cy, cz, t) {
    const dt = this._t === null ? 1 / 60 : Math.min(0.1, Math.max(0, t - this._t));
    this._t = t;
    const cand = [];
    for (const s of this.sources) {
      if (!s.on) continue;
      const d = (s.x - cx) ** 2 + (s.y - cy) ** 2 * 0.5 + (s.z - cz) ** 2;
      if (d > 44 * 44) continue;
      cand.push([d - (s.priority || 0) * 400, s]);
    }
    cand.sort((a, b) => a[0] - b[0]);
    const n = this.slots.length;
    const want = new Set();
    for (let i = 0; i < Math.min(n, cand.length); i++) want.add(cand[i][1]);
    const assigned = new Set();
    for (const sl of this.slots) {
      if (sl.src && want.has(sl.src) && !assigned.has(sl.src)) {
        sl.target = 1;
        assigned.add(sl.src);
      } else sl.target = 0;
    }
    for (const c of cand) {
      const s = c[1];
      if (!want.has(s) || assigned.has(s)) continue;
      const free = this.slots.find((sl) => sl.target === 0 && sl.w <= 0.001);
      if (!free) break;
      free.src = s;
      free.target = 1;
      assigned.add(s);
    }
    for (const sl of this.slots) {
      const step = dt / 0.45;
      sl.w = sl.target > sl.w ? Math.min(sl.target, sl.w + step) : Math.max(sl.target, sl.w - step);
      const L = sl.light;
      if (sl.w <= 0.001 && sl.target === 0) sl.src = null;
      const s = sl.src;
      if (!s) {
        L.intensity = 0;
        continue;
      }
      const ph = s.x * 1.3 + s.z * 0.7;
      const fl = s.flicker ? 0.8 + 0.1 * Math.sin(t * 13 + ph) + 0.1 * Math.sin(t * 29.7 + ph * 2) : 1;
      const d = Math.sqrt((s.x - cx) ** 2 + (s.y - cy) ** 2 * 0.5 + (s.z - cz) ** 2);
      const fade = Math.min(1, Math.max(0, (42 - d) / 12));
      const w = sl.w * sl.w * (3 - 2 * sl.w);
      L.position.set(s.x + (s.flicker ? Math.sin(t * 7 + ph) * 0.04 : 0), s.y, s.z);
      L.color.copy(s._c);
      L.distance = s.range;
      L.intensity = s.intensity * fl * fade * w;
    }
  }
}

// ------------------------------------------------------------ ceniza
export class AshSystem {
  constructor(scene, count = 1400) {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = Math.random() * 48;
      p[i * 3 + 1] = Math.random() * 22;
      p[i * 3 + 2] = Math.random() * 48;
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const u = commonUniforms({ uCam: { value: new THREE.Vector3() }, uAmount: { value: 1 }, uPix: { value: 1 }, uColor: { value: new THREE.Color(0.52, 0.5, 0.47) } });
    u.uTime = G.uTime;
    u.uSnap = G.uSnap;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: `
        uniform float uTime; uniform vec2 uSnap; uniform vec3 uCam; uniform float uPix;
        varying float vA;
        ${SNAP}
        ${FOG_PARS}
        void main(){
          vec3 box = vec3(48.0, 22.0, 48.0);
          vec3 p = position;
          float id = position.x*0.13 + position.z*0.29;
          p.y -= uTime * (0.55 + fract(id)*0.5);
          p.x += uTime * 0.35 + sin(uTime*0.7 + id*6.0) * 1.2;
          p.z += sin(uTime*0.5 + id*4.0) * 1.0;
          p = mod(p - uCam + box*0.5, box) - box*0.5 + uCam;
          vec4 mv = viewMatrix * vec4(p, 1.0);
          gl_Position = psxSnap(projectionMatrix * mv);
          gl_PointSize = uPix * max(1.0, 1.6 * (6.0 / max(1.0, -mv.z)));
          float d = length(mv.xyz);
          vA = exp(-fogDensity*fogDensity*d*d*0.8) * 0.65;
        }`,
      fragmentShader: `
        uniform vec3 uColor; uniform float uAmount;
        varying float vA;
        void main(){ gl_FragColor = vec4(uColor, vA * uAmount); }`,
      uniforms: u,
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
    scene.add(this.points);
  }
  update(camPos) {
    this.mat.uniforms.uCam.value.copy(camPos);
  }
}

// ------------------------------------------------------------ sangre / chispas
export class ParticleBurst {
  constructor(scene, count = 600) {
    this.count = count;
    this.p = new Float32Array(count * 3);
    this.v = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    this.grav = new Float32Array(count);
    this.col = new Float32Array(count * 3);
    // sólo la sangre mancha el suelo (no las chispas, el polvo ni las brasas),
    // y una vez: al posarse la gota volvía a "caer" en cada fotograma y
    // repartía manchas sin parar, que se reciclaban enseguida
    this.stain = new Uint8Array(count);
    this.head = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo = g;
    const u = commonUniforms({ uPix: { value: 1 } });
    u.uTime = G.uTime;
    u.uSnap = G.uSnap;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: `
        uniform vec2 uSnap; uniform float uPix;
        attribute vec3 color; varying vec3 vC;
        ${SNAP}
        void main(){
          vec4 mv = viewMatrix * vec4(position, 1.0);
          gl_Position = psxSnap(projectionMatrix * mv);
          gl_PointSize = uPix * max(1.0, 7.0 / max(0.5, -mv.z) * 2.0);
          vC = color;
        }`,
      fragmentShader: `varying vec3 vC; void main(){ if (vC.r+vC.g+vC.b <= 0.0) discard; gl_FragColor = vec4(vC, 1.0); }`,
      uniforms: u,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.onLand = null;
  }

  emit(x, y, z, n, opts = {}) {
    const spd = opts.speed ?? 4;
    const c = opts.color ?? [0.45, 0.02, 0.03];
    const stain = (opts.stain ?? !opts.color) ? 1 : 0;
    const dir = opts.dir;
    for (let i = 0; i < n; i++) {
      const k = this.head;
      this.head = (this.head + 1) % this.count;
      this.p[k * 3] = x;
      this.p[k * 3 + 1] = y;
      this.p[k * 3 + 2] = z;
      let vx = (Math.random() - 0.5) * spd,
        vy = Math.random() * spd * 0.8 + (opts.up ?? 1),
        vz = (Math.random() - 0.5) * spd;
      if (dir) {
        vx += dir.x * spd * 0.8;
        vz += dir.z * spd * 0.8;
      }
      this.v[k * 3] = vx;
      this.v[k * 3 + 1] = vy;
      this.v[k * 3 + 2] = vz;
      this.life[k] = opts.life ?? 0.9 + Math.random() * 0.5;
      const f = 0.7 + Math.random() * 0.5;
      this.col[k * 3] = c[0] * f;
      this.col[k * 3 + 1] = c[1] * f;
      this.col[k * 3 + 2] = c[2] * f;
      this.grav[k] = opts.gravity ?? 14;
      this.stain[k] = stain;
    }
  }

  update(dt, groundFn) {
    const g = 14;
    for (let k = 0; k < this.count; k++) {
      if (this.life[k] <= 0) continue;
      this.life[k] -= dt;
      if (this.life[k] <= 0) {
        this.col[k * 3] = this.col[k * 3 + 1] = this.col[k * 3 + 2] = 0;
        this.p[k * 3 + 1] = -999;
        continue;
      }
      this.v[k * 3 + 1] -= this.grav[k] * dt;
      this.p[k * 3] += this.v[k * 3] * dt;
      this.p[k * 3 + 1] += this.v[k * 3 + 1] * dt;
      this.p[k * 3 + 2] += this.v[k * 3 + 2] * dt;
      const gy = groundFn ? groundFn(this.p[k * 3], this.p[k * 3 + 1], this.p[k * 3 + 2]) : 0;
      if (this.grav[k] > 0 && this.p[k * 3 + 1] < gy + 0.02) {
        this.p[k * 3 + 1] = gy + 0.02;
        this.v[k * 3] *= 0.2;
        this.v[k * 3 + 2] *= 0.2;
        this.v[k * 3 + 1] = 0;
        if (this.stain[k]) {
          this.stain[k] = 0;
          if (this.onLand && Math.random() < 0.25) this.onLand(this.p[k * 3], gy, this.p[k * 3 + 2]);
        }
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}

// ------------------------------------------------------------ decals
export class DecalPool {
  constructor(scene, texName, max = 48, opts = {}) {
    this.meshes = [];
    this.head = 0;
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = registerMaterialPatch(
      new THREE.MeshBasicMaterial({
        map: getTexture(texName),
        transparent: true,
        depthWrite: false,
        opacity: opts.opacity ?? 0.9,
        color: opts.color ?? 0xffffff,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
        fog: true,
      })
    );
    for (let i = 0; i < max; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      m.renderOrder = 2;
      scene.add(m);
      this.meshes.push(m);
    }
  }
  spawn(x, y, z, size, rot = Math.random() * Math.PI * 2) {
    const m = this.meshes[this.head];
    this.head = (this.head + 1) % this.meshes.length;
    m.position.set(x, y + 0.015, z);
    m.rotation.y = rot;
    m.scale.set(size, 1, size);
    m.visible = true;
    return m;
  }
}

// ------------------------------------------------------------ haces de luz
// Haces volumétricos falsos (vidrieras, rejillas): cintas aditivas con polvo.
export class LightShafts {
  constructor(scene) {
    this.scene = scene;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime },
      vertexShader: `
        attribute vec3 color; attribute float aAlong;
        varying vec2 vUv; varying vec3 vC; varying float vDist;
        void main(){
          vUv = uv; vC = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDist = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv; varying vec3 vC; varying float vDist;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
        void main(){
          float across = sin(vUv.x * 3.14159);
          across = across * across * across;
          float along = smoothstep(0.0, 0.2, vUv.y) * pow(1.0 - vUv.y, 1.3);
          // motas de polvo que caen lentamente
          vec2 g = floor(vec2(vUv.x * 22.0, vUv.y * 60.0 + uTime * 1.2));
          float dust = step(0.985, h(g)) * 1.5;
          float near = smoothstep(2.0, 7.0, vDist);
          float a = across * along * near;
          gl_FragColor = vec4(vC * (a * 0.13 + dust * a * 0.4), 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.pos = [];
    this.uv = [];
    this.col = [];
    this.idx = [];
  }
  // haz desde 'a' (ventana) hasta 'b' (suelo), con anchura w
  add(a, b, w, color) {
    const n = this.pos.length / 3;
    const dir = new THREE.Vector3().subVectors(b, a);
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize().multiplyScalar(w / 2);
    const c = new THREE.Color(color);
    // dos cintas cruzadas para que se vea desde cualquier ángulo
    const side2 = new THREE.Vector3().crossVectors(dir, side).normalize().multiplyScalar(w / 2);
    for (const s of [side, side2]) {
      const k = this.pos.length / 3;
      const pts = [a.clone().sub(s), a.clone().add(s), b.clone().add(s.clone().multiplyScalar(1.6)), b.clone().sub(s.clone().multiplyScalar(1.6))];
      for (const p of pts) this.pos.push(p.x, p.y, p.z);
      this.uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      for (let i = 0; i < 4; i++) this.col.push(c.r, c.g, c.b);
      this.idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
    }
  }
  build() {
    if (!this.pos.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, this.mat);
    m.renderOrder = 7;
    m.frustumCulled = false;
    this.scene.add(m);
    this.mesh = m;
  }
}

// ------------------------------------------------------------ estela de espada
// Cinta aditiva entre la base y la punta de la hoja durante los tajos; los
// puntos se suavizan con Catmull-Rom para que el arco sea continuo aunque el
// juego vaya a pocos fotogramas.
export class SwordTrail {
  constructor(scene, o = {}) {
    this.max = o.samples ?? 14;
    this.sub = o.sub ?? 4;
    this.life = o.life ?? 0.16;
    this.samples = [];
    const n = (this.max - 1) * this.sub + 1;
    this.n = n;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 2 * 3);
    this.alpha = new Float32Array(n * 2);
    this.side = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      this.side[i * 2] = 0;
      this.side[i * 2 + 1] = 1;
    }
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    g.setAttribute('aSide', new THREE.BufferAttribute(this.side, 1));
    const idx = [];
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
    g.setIndex(idx);
    g.setDrawRange(0, 0);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(o.color ?? 0xffe2b0) }, uCore: { value: new THREE.Color(0xffffff) } },
      vertexShader: `
        attribute float aAlpha; attribute float aSide;
        varying float vA; varying float vS;
        void main(){ vA = aAlpha; vS = aSide; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform vec3 uColor; uniform vec3 uCore;
        varying float vA; varying float vS;
        void main(){
          // más intensa hacia la punta y en el borde de ataque
          float edge = smoothstep(0.0, 1.0, vS);
          vec3 c = mix(uColor * 0.5, mix(uColor, uCore, edge * edge * vA), edge);
          gl_FragColor = vec4(c * vA * (0.25 + edge * 0.9), 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9;
    scene.add(this.mesh);
  }
  // base/tip: Vector3 en el mundo; active: si la hoja está cortando
  update(time, base, tip, active) {
    const S = this.samples;
    if (active) {
      S.push({ t: time, b: base.clone(), p: tip.clone() });
      if (S.length > this.max) S.shift();
    }
    while (S.length && time - S[0].t > this.life) S.shift();
    const k = S.length;
    if (k < 2) {
      this.geo.setDrawRange(0, 0);
      return;
    }
    const P = this.pos,
      A = this.alpha;
    let v = 0;
    const cr = (p0, p1, p2, p3, u, out) => {
      const u2 = u * u,
        u3 = u2 * u;
      out.set(
        0.5 * (2 * p1.x + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3),
        0.5 * (2 * p1.y + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3),
        0.5 * (2 * p1.z + (-p0.z + p2.z) * u + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * u2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * u3)
      );
      return out;
    };
    const tb = this._tb || (this._tb = new THREE.Vector3());
    const tp = this._tp || (this._tp = new THREE.Vector3());
    for (let i = 0; i < k - 1; i++) {
      const s0 = S[Math.max(0, i - 1)],
        s1 = S[i],
        s2 = S[i + 1],
        s3 = S[Math.min(k - 1, i + 2)];
      const steps = i === k - 2 ? this.sub + 1 : this.sub;
      for (let q = 0; q < steps && v < this.n; q++) {
        const u = q / this.sub;
        cr(s0.b, s1.b, s2.b, s3.b, u, tb);
        cr(s0.p, s1.p, s2.p, s3.p, u, tp);
        const age = time - (s1.t + (s2.t - s1.t) * u);
        const a = Math.max(0, 1 - age / this.life);
        P.set([tb.x, tb.y, tb.z], v * 6);
        P.set([tp.x, tp.y, tp.z], v * 6 + 3);
        A[v * 2] = a * a;
        A[v * 2 + 1] = a * a;
        v++;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.geo.setDrawRange(0, Math.max(0, (v - 1) * 6));
  }
}
