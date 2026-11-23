// La bruma negra del Físico, en la cisterna de la cloaca (game/fisico_rama.js).
//
// No es la niebla de los jefes (que es luz: se suma a lo de detrás): es humo
// negro, que tapa. Lo que trae dentro, lo dice él en su nota: el aire malo, que
// ya no le hace falta la máscara para no respirar porque lo lleva dentro. Sale
// de la galería, detrás de él; cubre el rellano; cae por el pretil como una
// cascada negra, al lado de la de agua; y se extiende por el suelo de la sala,
// a ras de las rodillas. Durante la pelea cierra las dos salidas de la sala (lo
// alto de la escalera y la boca de la galería del desagüe) con un muro que no
// se pasa. Cada capa tiene su fuerza (0..1), que va hacia donde le digan.
import * as THREE from 'three';
import { G } from '../gfx/materials.js';
import { CLOACA, DESAGUE } from '../world/cloaca.js';

const R = CLOACA.sala.rellano;
const YR = CLOACA.tunel.y;
const SA = CLOACA.sala;

function brumaMat(o = {}) {
  const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
  u.uTime = G.uTime;
  u.uK = { value: 0 };
  // (caer: lo que corre hacia abajo; suelo: la mancha que crece desde uC)
  u.uFlow = { value: o.flow ?? 0.05 };
  u.uScale = { value: new THREE.Vector2(...(o.scale ?? [3, 3])) };
  u.uR = { value: 0 };
  u.uC = { value: new THREE.Vector2(...(o.c ?? [0, 0])) };
  u.uRadial = { value: o.radial ? 1 : 0 };
  u.uEdge = { value: new THREE.Vector4(...(o.edge ?? [0.12, 0.12, 0.12, 0.12])) };
  return new THREE.ShaderMaterial({
    uniforms: u,
    fog: true,
    vertexShader: `varying vec2 vUv; varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float uTime; uniform float uK; uniform float uFlow; uniform vec2 uScale; uniform float uR; uniform vec2 uC; uniform float uRadial; uniform vec4 uEdge;
      varying vec2 vUv; varying vec3 vW;
      #include <fog_pars_fragment>
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float a = 0.0, w = 0.55; for (int i = 0; i < 4; i++) { a += n(p) * w; p = p * 2.03 + vec2(1.7, 9.2); w *= 0.5; } return a; }
      void main(){
        vec2 p = vUv * uScale;
        float a = fbm(p + vec2(uTime * 0.04, uTime * uFlow));
        a = a * 0.7 + fbm(p * 1.9 + vec2(-uTime * 0.07, uTime * uFlow * 1.6)) * 0.3;
        float edge = smoothstep(0.0, uEdge.x, vUv.x) * smoothstep(1.0, 1.0 - uEdge.y, vUv.x) * smoothstep(0.0, uEdge.z, vUv.y) * smoothstep(1.0, 1.0 - uEdge.w, vUv.y);
        float alpha = uK * edge * (0.55 + smoothstep(0.25, 0.8, a) * 0.45);
        if (uRadial > 0.5) {
          float d = distance(vW.xz, uC);
          // (el borde de la mancha, deshilachado)
          alpha *= 1.0 - smoothstep(uR - 2.2 + a * 1.6, uR + a * 1.6, d);
        }
        #ifdef USE_FOG
          #ifdef FOG_EXP2
            float fk = exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
          #else
            float fk = 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
          #endif
          alpha *= mix(0.4, 1.0, fk);
          // (pegada a la cámara se aclara: no tapa medio encuadre)
          alpha *= smoothstep(0.3, 1.8, vFogDepth);
        #endif
        vec3 col = vec3(0.012, 0.01, 0.016) + vec3(0.02, 0.016, 0.026) * a;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.92));
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export class BrumaNegra {
  constructor(g) {
    this.g = g;
    this.capas = {};
    this.muros = [];
    this.on = false;
    const add = (k, geo, o, pos, rot) => {
      const m = new THREE.Mesh(geo, brumaMat(o));
      m.position.set(...pos);
      if (rot) m.rotation.set(...rot);
      m.renderOrder = 7;
      m.visible = false;
      m.frustumCulled = false;
      g.scene.add(m);
      this.capas[k] = { m, k: 0, want: 0, rate: o.rate ?? 0.8 };
      return m;
    };
    const w = R[2] - R[0];
    // la que sale de la galería, detrás del rellano (de pared a pared, del
    // suelo de la galería a su bóveda)
    add('galeria', new THREE.PlaneGeometry(w + 0.4, 3.4), { scale: [2.2, 2.2], flow: 0.08, edge: [0.08, 0.08, 0.02, 0.25] }, [(R[0] + R[2]) / 2, YR + 1.7, R[1] + 0.15]);
    // la que cubre el rellano, a ras de su suelo (dos capas)
    add('rellano', new THREE.PlaneGeometry(w + 0.6, R[3] - R[1] + 0.8), { scale: [2.5, 1.2], flow: 0.03, edge: [0.15, 0.15, 0.2, 0.2] }, [(R[0] + R[2]) / 2, YR + 0.35, (R[1] + R[3]) / 2], [-Math.PI / 2, 0, 0]);
    add('rellano2', new THREE.PlaneGeometry(w + 0.6, R[3] - R[1] + 0.8), { scale: [3.1, 1.6], flow: -0.04, edge: [0.15, 0.15, 0.2, 0.2] }, [(R[0] + R[2]) / 2, YR + 0.9, (R[1] + R[3]) / 2], [-Math.PI / 2, 0, 0]);
    // la cascada negra: por el frente del pretil, hasta el suelo de la sala
    add('cae', new THREE.PlaneGeometry(w + 0.6, YR + 1.0 - SA.y), { scale: [2.4, 4.2], flow: 0.45, edge: [0.12, 0.12, 0.35, 0.12], rate: 0.6 }, [(R[0] + R[2]) / 2, (YR + 1.0 + SA.y) / 2, R[3] + 0.32]);
    // la del suelo de la sala: crece desde el pie del rellano
    add('suelo', new THREE.PlaneGeometry(SA.x1 - SA.x0, SA.z1 - SA.z0), { scale: [6, 7], flow: 0.02, radial: true, c: [(R[0] + R[2]) / 2, R[3] + 0.6], edge: [0.03, 0.03, 0.03, 0.03] }, [(SA.x0 + SA.x1) / 2, SA.y + 0.55, (SA.z0 + SA.z1) / 2], [-Math.PI / 2, 0, 0]);
    add('suelo2', new THREE.PlaneGeometry(SA.x1 - SA.x0, SA.z1 - SA.z0), { scale: [4.2, 5.1], flow: -0.03, radial: true, c: [(R[0] + R[2]) / 2, R[3] + 0.6], edge: [0.03, 0.03, 0.03, 0.03] }, [(SA.x0 + SA.x1) / 2, SA.y + 1.05, (SA.z0 + SA.z1) / 2], [-Math.PI / 2, 0, 0]);
    // los muros de la pelea: lo alto de la escalera y la galería del desagüe
    const E = SA.esc;
    this.murosDef = [
      { x: R[2] + 0.25, z: E.z, w: E.w + 0.3, h: 3.0, y: YR, axis: 'z' },
      { x: SA.x1 - 0.3, z: DESAGUE.z, w: DESAGUE.w + 0.3, h: 2.8, y: SA.y, axis: 'z' },
    ];
    for (const M of this.murosDef) {
      const m = add('muro' + this.muros.length, new THREE.PlaneGeometry(M.w, M.h), { scale: [1.6, 2.2], flow: 0.12, edge: [0.08, 0.08, 0.05, 0.3] }, [M.x, M.y + M.h / 2, M.z], [0, Math.PI / 2, 0]);
      this.muros.push({ ...M, m, box: null });
    }
    this.R = 0;
    this.Rwant = 0;
  }
  // a dónde va cada capa (0..1); suelo: lo que ha crecido (m)
  pon(o) {
    for (const k in o) if (this.capas[k]) this.capas[k].want = o[k];
    if (o.radio !== undefined) this.Rwant = o.radio;
  }
  // de golpe (al cargar, al caer)
  ya(o) {
    this.pon(o);
    for (const k in o) if (this.capas[k]) this.capas[k].k = o[k];
    if (o.radio !== undefined) this.R = o.radio;
  }
  // los muros de la pelea: se ponen (con su caja) o se quitan
  cierra(on) {
    const col = this.g.world.col;
    for (const M of this.muros) {
      if (on && !M.box) {
        const t = 0.3;
        M.box = col.add(M.x - t, M.y, M.z - M.w / 2, M.x + t, M.y + M.h, M.z + M.w / 2, 'fog');
        M.box.cam = false;
      } else if (!on && M.box) {
        M.box.enabled = false;
        M.box.minx = M.box.maxx = -9999;
        M.box = null;
      }
    }
    this.pon(Object.fromEntries(this.muros.map((_, i) => ['muro' + i, on ? 1 : 0])));
  }
  // ¿Está el jugador ante un muro? (para decirle que por ahí no se pasa)
  anteMuro(p) {
    return this.muros.some((M) => M.box && Math.abs(p.x - M.x) < 1.2 && Math.abs(p.z - M.z) < M.w / 2 + 0.3 && Math.abs(p.y - M.y) < 2);
  }
  update(dt) {
    let alguna = false;
    for (const k in this.capas) {
      const C = this.capas[k];
      const d = C.want - C.k;
      C.k += Math.sign(d) * Math.min(Math.abs(d), dt * C.rate);
      C.m.visible = C.k > 0.003;
      C.m.material.uniforms.uK.value = C.k;
      if (C.m.visible) alguna = true;
    }
    const dR = this.Rwant - this.R;
    this.R += Math.sign(dR) * Math.min(Math.abs(dR), dt * 2.4);
    for (const k of ['suelo', 'suelo2']) this.capas[k].m.material.uniforms.uR.value = this.R;
    this.on = alguna;
    // el humo que sale de la galería y del borde de la mancha, en hilachas
    if (alguna && this.capas.galeria.k > 0.2) {
      this.hT = (this.hT ?? 0) - dt;
      if (this.hT <= 0) {
        this.hT = 0.08;
        const g = this.g;
        const x = R[0] + Math.random() * (R[2] - R[0]);
        g.fx.blood.emit(x, YR + 0.2 + Math.random() * 1.5, R[1] + 0.3 + Math.random() * 1.0, 2, { color: [0.03, 0.025, 0.04], speed: 0.6, life: 1.4, up: 0.3, gravity: -0.3 });
      }
    }
  }
  // todo fuera, de golpe
  quita() {
    this.cierra(false);
    for (const k in this.capas) {
      this.capas[k].k = this.capas[k].want = 0;
      this.capas[k].m.visible = false;
    }
    this.R = this.Rwant = 0;
  }
}
