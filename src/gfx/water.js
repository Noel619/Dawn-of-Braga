// Agua quieta de interior (la cisterna del canónigo, el fondo del pozo):
// negra, con un temblor lento, el reflejo pálido de la luz que baja por el
// pozo y anillos que se abren donde cae una gota. Las gotas caen solas de
// la bóveda cada pocos segundos (y suenan donde caen).
import * as THREE from 'three';
import { G } from './materials.js';

const MAX_DRIPS = 6;

function waterMat(o) {
  const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
  u.uTime = G.uTime;
  u.uDeep = { value: new THREE.Color(o.deep ?? 0x05080a) };
  u.uSky = { value: new THREE.Color(o.sky ?? 0x2a3038) };
  u.uGlint = { value: new THREE.Color(o.glint ?? 0xb8c8dc) };
  u.uLight = { value: new THREE.Vector3(...(o.light || [0, 10, 0])) };
  u.uLightK = { value: o.lightK ?? 1 };
  u.uDrips = { value: Array.from({ length: MAX_DRIPS }, () => new THREE.Vector4(0, 0, -99, 0)) };
  // el farol del jugador (se refleja en el agua) y la mancha de luz que cae del pozo
  u.uLamp = { value: new THREE.Vector3(0, -99, 0) };
  u.uLampK = { value: 0 };
  u.uSpot = { value: new THREE.Vector4(...(o.spot || [0, 0, 0, 0])) };
  // oleaje (alto de las ondas) y corriente (hacia dónde corre el agua)
  u.uAmp = { value: o.amp ?? 0.035 };
  u.uFlow = { value: new THREE.Vector2(...(o.flow || [0, 0])) };
  return new THREE.ShaderMaterial({
    uniforms: u,
    fog: true,
    vertexShader: `varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vW = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uDeep; uniform vec3 uSky; uniform vec3 uGlint;
      uniform vec3 uLight; uniform float uLightK; uniform vec4 uDrips[${MAX_DRIPS}];
      uniform vec3 uLamp; uniform float uLampK; uniform vec4 uSpot; uniform float uAmp; uniform vec2 uFlow;
      varying vec3 vW;
      #include <fog_pars_fragment>
      float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float ns(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hs(i),hs(i+vec2(1,0)),f.x), mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x), f.y); }
      float H(vec2 p){
        vec2 fl = uFlow * uTime;
        float h = ns((p - fl)*1.3 + vec2(uTime*0.07, -uTime*0.05))*0.5 + ns((p - fl*1.4)*2.9 - vec2(uTime*0.11, uTime*0.09))*0.25;
        h *= uAmp;
        for (int i = 0; i < ${MAX_DRIPS}; i++){
          vec4 d = uDrips[i];
          float age = uTime - d.z;
          if (age < 0.0 || age > 3.5) continue;
          float r = length(p - d.xy);
          float front = age * 0.55;
          float env = exp(-abs(r - front) * 7.0) * exp(-age * 1.1) * d.w;
          h += sin((r - front) * 38.0) * env * 0.012;
        }
        return h;
      }
      void main(){
        vec2 p = vW.xz;
        float e = 0.02;
        float h0 = H(p);
        vec3 N = normalize(vec3(-(H(p + vec2(e,0.)) - h0) / e, 1.0, -(H(p + vec2(0.,e)) - h0) / e));
        vec3 V = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
        vec3 L = normalize(uLight - vW);
        vec3 R = reflect(-V, N);
        float spec = pow(max(dot(R, L), 0.0), 90.0) * uLightK;
        float sheen = pow(max(dot(R, L), 0.0), 8.0) * 0.12 * uLightK;
        vec3 col = uDeep + uSky * fres * 0.6 + uGlint * (spec * 1.6 + sheen);
        // el farol: su llama se refleja (un punto que tiembla con las ondas)
        vec3 Lp = normalize(uLamp - vW);
        float lsp = pow(max(dot(R, Lp), 0.0), 140.0) * 2.4 + pow(max(dot(R, Lp), 0.0), 12.0) * 0.12;
        col += vec3(1.0, 0.62, 0.28) * lsp * uLampK * exp(-length(uLamp - vW) * 0.08);
        // luz que cae desde arriba: una mancha pálida que las ondas rompen
        if (uSpot.w > 0.0) {
          vec2 q = p + N.xz * 0.6;
          float dd = length(q - uSpot.xy) / uSpot.z;
          float cau = 0.65 + 0.35 * ns(q * 7.0 + uTime * 0.6) * ns(q * 5.0 - uTime * 0.4);
          col += uGlint * uSpot.w * smoothstep(1.0, 0.1, dd) * cau * 0.35;
        }
        gl_FragColor = vec4(col, 1.0);
        #ifdef USE_FOG
          #ifdef FOG_EXP2
            float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
          #else
            float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
          #endif
          gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
        #endif
      }`,
  });
}

// ctx.waters: [{ shape: 'rect', r: [x0, z0, x1, z1] } | { shape: 'circle', x, z, r }, con y, light, lightK]
export class Waters {
  constructor(game, list) {
    this.g = game;
    this.list = [];
    for (const w of list) {
      const geo = w.shape === 'circle' ? new THREE.CircleGeometry(w.r, 20) : new THREE.PlaneGeometry(w.r[2] - w.r[0], w.r[3] - w.r[1], 1, 1);
      geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, waterMat(w));
      if (w.shape === 'circle') m.position.set(w.x, w.y, w.z);
      else m.position.set((w.r[0] + w.r[2]) / 2, w.y, (w.r[1] + w.r[3]) / 2);
      game.scene.add(m);
      this.list.push({ ...w, m, next: 1 + Math.random() * 3, slot: 0 });
    }
  }

  // Una gota (o algo que cae) en (x, z): el anillo se abre desde ahí.
  ripple(x, z, amp = 1) {
    for (const w of this.list) {
      if (!this.inside(w, x, z)) continue;
      const D = w.m.material.uniforms.uDrips.value;
      D[w.slot].set(x, z, G.uTime.value, amp);
      w.slot = (w.slot + 1) % D.length;
    }
  }
  inside(w, x, z) {
    return w.shape === 'circle' ? Math.hypot(x - w.x, z - w.z) < w.r : x > w.r[0] && x < w.r[2] && z > w.r[1] && z < w.r[3];
  }

  update(dt) {
    const g = this.g;
    const p = g.player.pos;
    const lamp = g.player.lamp;
    if (lamp) lamp.getWorldPosition(this._lp || (this._lp = new THREE.Vector3()));
    for (const w of this.list) {
      const U = w.m.material.uniforms;
      if (lamp) {
        U.uLamp.value.copy(this._lp);
        U.uLampK.value = lamp.visible && g.player.obj.visible ? Math.min(1.5, lamp.intensity / 8) : 0;
      }
      if (w.drips === false) continue;
      w.next -= dt;
      if (w.next > 0) continue;
      w.next = 1.4 + Math.random() * 3.5;
      let x, z;
      if (w.shape === 'circle') {
        const a = Math.random() * Math.PI * 2,
          r = Math.sqrt(Math.random()) * w.r * 0.85;
        x = w.x + Math.cos(a) * r;
        z = w.z + Math.sin(a) * r;
      } else {
        x = w.r[0] + Math.random() * (w.r[2] - w.r[0]);
        z = w.r[1] + Math.random() * (w.r[3] - w.r[1]);
      }
      this.ripple(x, z, 0.6 + Math.random() * 0.6);
      if (g.audio && Math.hypot(p.x - x, p.z - z) < 16 && Math.abs(p.y - w.y) < 4) g.audio.play('drip', { x, y: w.y, z });
    }
  }
}
