// Lo que se mueve en la cloaca (world/cloaca.js): la cascada que cae de la
// boca del conducto, bajo el rellano, a la alberca (una cortina de agua con
// sus hilos que bajan, que se abre al caer, y la espuma al pie), y el agua de
// la alberca, que no para de revolverse donde cae.
import * as THREE from 'three';
import { G } from '../gfx/materials.js';
import { CLOACA } from '../world/cloaca.js';

export class CloacaFX {
  constructor(g) {
    this.g = g;
    const C = CLOACA.cascada;
    this.C = C;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime, fogColor: { value: new THREE.Color() }, fogDensity: { value: 0 } },
      vertexShader: `
        varying vec2 vUv; varying float vDist;
        void main(){
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDist = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime; uniform vec3 fogColor; uniform float fogDensity;
        varying vec2 vUv; varying float vDist;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        void main(){
          // los hilos: bandas a lo ancho que bajan deprisa, rotas por el ruido
          float u = vUv.x, v = vUv.y;
          float s = n(vec2(u * 26.0, v * 3.0 + uTime * 3.4)) * 0.6 + n(vec2(u * 61.0, v * 7.0 + uTime * 5.1)) * 0.4;
          float hilos = smoothstep(0.35, 0.95, s);
          float bordes = smoothstep(0.0, 0.18, u) * smoothstep(1.0, 0.82, u);
          // arriba, lisa (sale del caño); abajo, deshecha en espuma
          float a = bordes * (0.1 + hilos * 0.42) * (0.6 + 0.4 * smoothstep(0.0, 0.25, v));
          a *= 1.0 - smoothstep(0.9, 1.0, v) * 0.5;
          vec3 c = mix(vec3(0.26, 0.32, 0.36), vec3(0.6, 0.68, 0.78), hilos);
          float fog = 1.0 - exp(-fogDensity * fogDensity * vDist * vDist);
          gl_FragColor = vec4(mix(c, fogColor, fog), a * (1.0 - fog));
        }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    // la cortina: de la boca del conducto hacia abajo, saliendo hacia delante
    // (parábola) y abriéndose al caer; dos hojas, una algo detrás de otra
    const geo = new THREE.BufferGeometry();
    const pos = [],
      uv = [],
      idx = [];
    const N = 14;
    const H = C.y0 - C.y1;
    for (const [dz, k] of [
      [0, 1],
      [-0.06, 0.82],
    ]) {
      const base = pos.length / 3;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const y = C.y0 - H * t;
        const z = C.z + dz + 0.42 * Math.sqrt(t) * k;
        const half = ((C.x1 - C.x0) / 2) * (1 + t * 0.35) * k;
        const xc = (C.x0 + C.x1) / 2;
        pos.push(xc - half, y, z, xc + half, y, z);
        uv.push(0, t, 1, t);
      }
      for (let i = 0; i < N; i++) {
        const a = base + i * 2;
        idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
      }
    }
    // la espuma del pie: un anillo plano sobre el agua
    {
      const base = pos.length / 3;
      const cx = (C.x0 + C.x1) / 2,
        cz = C.z + 0.45;
      const R0 = 0.15,
        R1 = 0.95;
      const S = 16;
      for (let i = 0; i <= S; i++) {
        const a = (i / S) * Math.PI * 2;
        pos.push(cx + Math.cos(a) * R0, C.y1 + 0.02, cz + Math.sin(a) * R0 * 0.8, cx + Math.cos(a) * R1, C.y1 + 0.02, cz + Math.sin(a) * R1 * 0.8);
        uv.push(i / S, 0.98, i / S, 0.6);
      }
      for (let i = 0; i < S; i++) {
        const a = base + i * 2;
        idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
      }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.renderOrder = 6;
    // (bajo la calle: con el subsuelo)
    this.mesh.layers.set(1);
    g.scene.add(this.mesh);
    this.rippleT = 0;
  }

  update(dt) {
    const g = this.g;
    const f = g.scene.fog;
    if (f) {
      this.mat.uniforms.fogColor.value.copy(f.color);
      this.mat.uniforms.fogDensity.value = f.density;
    }
    // (sólo cuando se puede ver: el jugador bajo la plaza, cerca)
    const p = g.player.pos;
    const C = this.C;
    const near = p.y < -2 && Math.hypot(p.x - (C.x0 + C.x1) / 2, p.z - C.z) < 40;
    this.mesh.visible = near;
    if (!near || !g.waters) return;
    // el agua de la alberca, revuelta donde cae la cascada
    this.rippleT -= dt;
    if (this.rippleT <= 0) {
      this.rippleT = 0.12 + Math.random() * 0.1;
      const cx = (C.x0 + C.x1) / 2 + (Math.random() - 0.5) * 0.9,
        cz = C.z + 0.35 + Math.random() * 0.4;
      g.waters.ripple(cx, cz, 0.7 + Math.random() * 0.6);
    }
  }
}
