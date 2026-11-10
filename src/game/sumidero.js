// Lo que se mueve en el Sumidero (world/sumidero.js):
//  - la bruma que se arrastra a ras del lago (tres capas, que se deshacen
//    vistas de canto y de cerca);
//  - lo que flota en el lago (tablas, ramas), que da vueltas despacio y se
//    mece;
//  - los peces ciegos, pálidos, que nadan en lo hondo junto al musgo que da
//    luz, y que huyen de quien bucea;
//  - las burbujas que suben del venero, en la ensenada: desde la superficie
//    se ve el agua que borbotea encima de la cueva (y se oye).
import * as THREE from 'three';
import { G, objMat } from '../gfx/materials.js';
import { SUMIDERO, enLago, dentro } from '../world/sumidero.js';

const _m = new THREE.Matrix4(),
  _q = new THREE.Quaternion(),
  _e = new THREE.Euler(),
  _p = new THREE.Vector3(),
  _s = new THREE.Vector3();

export class SumideroFX {
  constructor(g) {
    this.g = g;
    const S = SUMIDERO;
    let seed = 4711;
    this.rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    this.bruma();
    this.flotantes();
    this.peces();
    this.burT = 0;
    this.borT = 0;
    // (dónde sale el venero, y dónde borbotea arriba)
    this.boca = { x: 19.5, y: S.fondo + 0.6, z: -13.4 };
  }

  // ------------------------------------------------------------ la bruma
  bruma() {
    const S = SUMIDERO;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime, uCol: { value: new THREE.Color(0.07, 0.085, 0.09) }, fogColor: { value: new THREE.Color() }, fogDensity: { value: 0 } },
      vertexShader: `
        varying vec3 vW; varying float vDist;
        void main(){
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vW = wp.xyz;
          vec4 mv = viewMatrix * wp;
          vDist = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime; uniform vec3 uCol; uniform vec3 fogColor; uniform float fogDensity;
        varying vec3 vW; varying float vDist;
        float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main(){
          vec2 p = vW.xz * 0.16 + vec2(uTime * 0.012, uTime * 0.007) + vW.y * 3.1;
          float b = n(p) * 0.6 + n(p * 2.3 - uTime * 0.02) * 0.4;
          b = smoothstep(0.55, 0.92, b);
          // (vista de canto o muy de cerca, se deshace: ni rayas ni manchas;
          // de lejos, la niebla ya hace lo suyo)
          vec3 V = normalize(cameraPosition - vW);
          float a = b * 0.1 * smoothstep(0.08, 0.5, abs(V.y)) * smoothstep(1.5, 5.0, vDist) * (1.0 - smoothstep(16.0, 30.0, vDist));
          float fog = 1.0 - exp(-fogDensity * fogDensity * vDist * vDist);
          gl_FragColor = vec4(mix(uCol, fogColor, fog), a * (1.0 - fog * 0.7));
        }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.brumaMat = mat;
    const grp = new THREE.Group();
    const [x0, z0, x1, z1] = [0, -59, 47, -12];
    for (const [dy, k] of [
      [0.14, 1],
      [0.42, 1.3],
      [0.85, 1.7],
    ]) {
      const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 1, 1);
      geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, mat);
      m.position.set((x0 + x1) / 2 + k, S.agua + dy, (z0 + z1) / 2 - k);
      m.renderOrder = 4;
      m.layers.set(1);
      m.frustumCulled = false;
      grp.add(m);
    }
    grp.visible = false;
    this.g.scene.add(grp);
    this.brumaG = grp;
  }

  // ------------------------------------------------------------ lo que flota
  flotantes() {
    const S = SUMIDERO;
    const tabla = new THREE.BoxGeometry(1.3, 0.05, 0.2);
    const rama = new THREE.CylinderGeometry(0.03, 0.05, 1.1, 5);
    rama.rotateZ(Math.PI / 2);
    this.flot = [];
    const kinds = [
      { geo: tabla, mat: objMat('planks', { tint: 0x6a5a48 }) },
      { geo: rama, mat: objMat('wooddark', { tint: 0x5a4636 }) },
    ];
    this.flotIM = kinds.map((K) => {
      const m = new THREE.InstancedMesh(K.geo, K.mat, 6);
      m.frustumCulled = false;
      m.count = 0;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.layers.set(1);
      this.g.scene.add(m);
      return m;
    });
    for (let i = 0; i < 9; i++) {
      // (en el agua, lejos de los muros)
      let x, z;
      for (let k = 0; k < 40; k++) {
        x = 6 + this.rnd() * 36;
        z = -54 + this.rnd() * 38;
        if (enLago(x, z) && enLago(x + 3, z) && enLago(x - 3, z) && enLago(x, z + 3) && enLago(x, z - 3)) break;
      }
      this.flot.push({ k: i % 3 === 2 ? 1 : 0, cx: x, cz: z, r: 0.8 + this.rnd() * 2.2, a: this.rnd() * 6.28, w: (0.012 + this.rnd() * 0.02) * (this.rnd() < 0.5 ? -1 : 1), yaw: this.rnd() * 6.28, spin: (this.rnd() - 0.5) * 0.06, ph: this.rnd() * 6.28 });
    }
    void S;
  }

  // ------------------------------------------------------------ los peces
  peces() {
    const geo = new THREE.ConeGeometry(0.045, 0.24, 5);
    geo.rotateX(Math.PI / 2);
    // (la cola)
    const cola = new THREE.ConeGeometry(0.05, 0.08, 3);
    cola.rotateX(-Math.PI / 2);
    cola.translate(0, 0, -0.14);
    const g2 = mergeGeo(geo, cola);
    g2.scale(1, 0.7, 1);
    this.pezIM = new THREE.InstancedMesh(g2, objMat('florCera', { tint: 0xc8d0c8 }), 40);
    this.pezIM.frustumCulled = false;
    this.pezIM.count = 0;
    this.pezIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pezIM.layers.set(1);
    this.g.scene.add(this.pezIM);
    const S = SUMIDERO;
    // (los bancos: junto a la boca del venero, en lo hondo, y junto a los
    // musgos de los muros)
    const bancos = [
      [19.5, S.fondo + 2.2, -16.5, 14],
      [12.0, S.agua - 5.5, -45.0, 9],
      [36.0, S.agua - 7.0, -30.0, 9],
      [28.0, S.agua - 9.0, -50.0, 8],
    ];
    this.pez = [];
    for (const [x, y, z, n] of bancos)
      for (let i = 0; i < n; i++)
        this.pez.push({ c: [x, y, z], r: 1.2 + this.rnd() * 2.4, a: this.rnd() * 6.28, w: (0.25 + this.rnd() * 0.35) * (i % 2 ? 1 : -1), dy: (this.rnd() - 0.5) * 1.6, ph: this.rnd() * 6.28, hx: 0, hz: 0, hy: 0, sc: 0.7 + this.rnd() * 0.6 });
  }

  update(dt) {
    const g = this.g;
    const p = g.player.pos;
    const S = SUMIDERO;
    const z = g.zone && g.zone.id;
    const aqui = (z === 'sumidero' || z === 'venero') && p.y < S.techo + 1;
    this.brumaG.visible = aqui;
    if (!aqui) {
      for (const m of this.flotIM) m.count = 0;
      this.pezIM.count = 0;
      return;
    }
    const f = g.scene.fog;
    if (f) {
      this.brumaMat.uniforms.fogColor.value.copy(f.color);
      this.brumaMat.uniforms.fogDensity.value = f.density;
    }
    const t = g.time;
    // lo que flota
    const cnt = [0, 0];
    for (const q of this.flot) {
      q.a += q.w * dt;
      q.yaw += q.spin * dt;
      const x = q.cx + Math.cos(q.a) * q.r,
        zz = q.cz + Math.sin(q.a) * q.r * 0.7;
      _e.set(Math.sin(t * 0.9 + q.ph) * 0.05, q.yaw, Math.cos(t * 0.7 + q.ph) * 0.06, 'YXZ');
      _q.setFromEuler(_e);
      _m.compose(_p.set(x, S.agua + 0.005 + Math.sin(t * 1.1 + q.ph) * 0.012, zz), _q, _s.set(1, 1, 1));
      this.flotIM[q.k].setMatrixAt(cnt[q.k]++, _m);
    }
    this.flotIM.forEach((m, i) => {
      m.count = cnt[i];
      m.instanceMatrix.needsUpdate = true;
    });
    // los peces (sólo bajo el agua: desde arriba no se ven)
    const bajo = p.y < S.agua - 0.6;
    if (bajo) {
      let n = 0;
      for (const q of this.pez) {
        q.a += q.w * dt;
        const bx = q.c[0] + Math.cos(q.a) * q.r,
          by = q.c[1] + q.dy + Math.sin(q.a * 1.7 + q.ph) * 0.3,
          bz = q.c[2] + Math.sin(q.a) * q.r * 0.8;
        // (huyen del que bucea: se apartan de golpe y vuelven despacio)
        const dx = bx + q.hx - p.x,
          dy = by + q.hy - (p.y + 0.9),
          dz = bz + q.hz - p.z;
        const d = Math.hypot(dx, dy, dz);
        if (d < 2.6) {
          const k = ((2.6 - d) / 2.6) * 7 * dt;
          q.hx += (dx / (d || 1)) * k;
          q.hy += (dy / (d || 1)) * k * 0.5;
          q.hz += (dz / (d || 1)) * k;
        }
        const back = Math.exp(-dt * 0.6);
        q.hx *= back;
        q.hy *= back;
        q.hz *= back;
        const x = bx + q.hx,
          y = Math.max(S.fondo + 0.3, Math.min(S.agua - 0.4, by + q.hy)),
          zz = bz + q.hz;
        // (hacia donde nadan, con su coleteo)
        const yaw = Math.atan2(-Math.sin(q.a) * q.w, Math.cos(q.a) * q.w * 0.8) + Math.sin(t * 9 + q.ph) * 0.12;
        _e.set(0, yaw, 0, 'YXZ');
        _q.setFromEuler(_e);
        _m.compose(_p.set(x, y, zz), _q, _s.set(q.sc, q.sc, q.sc));
        this.pezIM.setMatrixAt(n++, _m);
      }
      this.pezIM.count = n;
      this.pezIM.instanceMatrix.needsUpdate = true;
    } else this.pezIM.count = 0;
    // las burbujas del venero: suben de la boca hasta arriba
    const B = this.boca;
    const cerca = Math.hypot(p.x - B.x, p.z - B.z) < 30;
    this.burT -= dt;
    if (cerca && this.burT <= 0 && g.fx && g.fx.blood) {
      this.burT = 0.22 + Math.random() * 0.25;
      const life = 8.2;
      g.fx.blood.emit(B.x + (Math.random() - 0.5) * 1.2, B.y, B.z + (Math.random() - 0.5) * 0.8, 1 + (Math.random() < 0.4 ? 1 : 0), { color: [0.62, 0.78, 0.76], speed: 0.18, up: 0.6, gravity: -0.35, life, stain: false });
    }
    // y arriba, el agua que borbotea encima de la cueva
    this.borT -= dt;
    if (cerca && this.borT <= 0) {
      this.borT = 0.35 + Math.random() * 0.45;
      const x = B.x + (Math.random() - 0.5) * 1.6,
        zz = B.z + (Math.random() - 0.5) * 1.2;
      if (dentro(x, zz)) {
        g.waters && g.waters.ripple(x, zz, 0.5 + Math.random() * 0.5, S.agua);
        if (Math.random() < 0.3 && g.audio && Math.hypot(p.x - x, p.z - zz) < 12) g.audio.play('burbujas', { x, y: S.agua, z: zz }, { gain: 0.22 });
      }
    }
  }
}

// (dos geometrías en una)
function mergeGeo(a, b) {
  const A = a.index ? a.toNonIndexed() : a,
    B = b.index ? b.toNonIndexed() : b;
  const geo = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const x = A.attributes[name],
      y = B.attributes[name];
    const arr = new Float32Array(x.array.length + y.array.length);
    arr.set(x.array);
    arr.set(y.array, x.array.length);
    geo.setAttribute(name, new THREE.BufferAttribute(arr, x.itemSize));
  }
  return geo;
}
