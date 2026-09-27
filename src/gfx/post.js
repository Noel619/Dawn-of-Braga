// Pipeline de render de baja resolución:
//  escena (HDR, baja res + profundidad) -> bloom -> composición
//  (niebla volumétrica por raymarching, gradación de color, viñeta, grano,
//  cuantización 15 bits con tramado Bayer) -> escalado "nearest" a pantalla.
import * as THREE from 'three';
import { G } from './materials.js';

const VS = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const NOISE = `
float h13(vec3 p){ p = fract(p*0.1031); p += dot(p, p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float vn3(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p); f = f*f*(3.0-2.0*f);
  float a=h13(i), b=h13(i+vec3(1,0,0)), c=h13(i+vec3(0,1,0)), d=h13(i+vec3(1,1,0));
  float e=h13(i+vec3(0,0,1)), g=h13(i+vec3(1,0,1)), h=h13(i+vec3(0,1,1)), k=h13(i+vec3(1,1,1));
  return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y), mix(mix(e,g,f.x),mix(h,k,f.x),f.y), f.z);
}
float fbm3(vec3 p){ return vn3(p)*0.55 + vn3(p*2.03+7.1)*0.3 + vn3(p*4.1+3.3)*0.15; }
float bayer4(vec2 p){
  ivec2 q = ivec2(mod(p, 4.0));
  int i = q.x + q.y*4;
  float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
  return m[i]/16.0;
}`;

const BRIGHT_FS = `
uniform sampler2D tScene; uniform vec2 uTexel;
varying vec2 vUv;
void main(){
  vec3 c = vec3(0.0);
  c += texture2D(tScene, vUv + uTexel*vec2(-1.0,-1.0)).rgb;
  c += texture2D(tScene, vUv + uTexel*vec2( 1.0,-1.0)).rgb;
  c += texture2D(tScene, vUv + uTexel*vec2(-1.0, 1.0)).rgb;
  c += texture2D(tScene, vUv + uTexel*vec2( 1.0, 1.0)).rgb;
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  c *= smoothstep(0.55, 1.5, l);
  gl_FragColor = vec4(c, 1.0);
}`;

const BLUR_FS = `
uniform sampler2D tSrc; uniform vec2 uDir;
varying vec2 vUv;
void main(){
  vec3 c = texture2D(tSrc, vUv).rgb * 0.227;
  c += texture2D(tSrc, vUv + uDir*1.385).rgb * 0.316;
  c += texture2D(tSrc, vUv - uDir*1.385).rgb * 0.316;
  c += texture2D(tSrc, vUv + uDir*3.23).rgb * 0.07;
  c += texture2D(tSrc, vUv - uDir*3.23).rgb * 0.07;
  gl_FragColor = vec4(c, 1.0);
}`;

const COMPOSITE_FS = `
uniform sampler2D tScene; uniform sampler2D tDepth; uniform sampler2D tBloom;
uniform vec2 uRes;
uniform mat4 uProjInv; uniform mat4 uCamWorld; uniform vec3 uCamPos;
uniform float uTime;
uniform vec3 uFogColor; uniform float uVol; uniform float uVolY; uniform float uVolScale; uniform float uSkyGlow; uniform float uSun; uniform vec3 uSunDir;
uniform float uBloom, uExposure, uSat, uContrast, uVignette, uGrain;
uniform vec3 uLift, uGain;
uniform float uHurt, uLowHp, uFade, uFlash, uQuant, uWarp, uDesat, uBrightness;
uniform vec3 uFadeColor, uFlashColor;
varying vec2 vUv;
${NOISE}
void main(){
  vec2 uv = vUv;
  // leve distorsión ondulante (campanadas, golpe fuerte)
  if (uWarp > 0.0) {
    float w = sin(uv.y*40.0 + uTime*30.0) * 0.004 * uWarp;
    uv.x += w;
  }
  vec3 col = texture2D(tScene, uv).rgb;
  float d = texture2D(tDepth, uv).x;
  vec4 ndc = vec4(uv*2.0-1.0, d*2.0-1.0, 1.0);
  vec4 vp = uProjInv * ndc; vp.xyz /= vp.w;
  float dist = length(vp.xyz);
  vec3 wp = (uCamWorld * vec4(vp.xyz, 1.0)).xyz;
  vec3 rd = normalize(wp - uCamPos);
  float dith = bayer4(gl_FragCoord.xy);
  // cielo: degradado desde el color de la niebla hacia un cenit oscuro,
  // con un resplandor rojizo de incendios en el horizonte
  if (d >= 0.99999) {
    float up = clamp(rd.y, 0.0, 1.0);
    vec3 zen = uFogColor * vec3(0.34, 0.36, 0.42);
    vec3 glow = vec3(0.35, 0.12, 0.05) * uSkyGlow * (1.0 - smoothstep(0.0, 0.25, up));
    col = mix(uFogColor + glow, zen, smoothstep(0.02, 0.75, up));
    if (uSun > 0.0) {
      float sd = max(dot(rd, normalize(uSunDir)), 0.0);
      col += vec3(1.0, 0.72, 0.42) * (pow(sd, 900.0) * 3.0 + pow(sd, 18.0) * 0.45 + pow(sd, 4.0) * 0.12) * uSun;
    }
  }

  // Niebla volumétrica: bancos de niebla que se arrastran por las calles.
  if (uVol > 0.0) {
    float maxT = min(dist, 38.0);
    float acc = 0.0;
    float stepL = maxT / 6.0;
    for (int i = 0; i < 6; i++) {
      float t = (float(i) + dith) * stepL;
      vec3 p = uCamPos + rd * t;
      vec3 q = p * uVolScale + vec3(uTime*0.045, -uTime*0.012, uTime*0.03);
      float n = fbm3(q);
      float h = exp(-max(p.y - uVolY, 0.0) * 0.22);
      acc += smoothstep(0.34, 0.78, n) * h;
    }
    acc *= stepL * uVol;
    float fv = 1.0 - exp(-acc);
    col = mix(col, uFogColor, clamp(fv, 0.0, 0.92));
  }

  col += texture2D(tBloom, uv).rgb * uBloom;
  col *= uExposure;
  // tonemap suave (conserva los negros profundos)
  col = col / (1.0 + col * 0.45) * 1.18;
  // gradación
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, uSat * (1.0 - uDesat));
  col = col * uGain + uLift * (1.0 - col);
  // viñeta
  vec2 c = vUv - 0.5;
  float vig = 1.0 - dot(c, c) * uVignette;
  col *= clamp(vig, 0.0, 1.0);
  // lineal -> sRGB
  col = pow(max(col, 0.0), vec3(1.0/2.2));
  col = (col - 0.5) * uContrast + 0.5 + uBrightness;
  // daño y salud crítica
  float edge = smoothstep(0.28, 0.75, length(c));
  col = mix(col, vec3(0.5, 0.02, 0.02), edge * uHurt * 0.6);
  float pulse = 0.5 + 0.5 * sin(uTime * 5.5);
  col = mix(col, vec3(0.25, 0.0, 0.0), edge * uLowHp * (0.35 + 0.25 * pulse));
  // grano de película
  float gr = h13(vec3(gl_FragCoord.xy, floor(uTime * 24.0))) - 0.5;
  col += gr * uGain.x * uGrain;
  // destello y fundido
  col = mix(col, uFlashColor, uFlash);
  col = mix(uFadeColor, col, uFade);
  // cuantización a 15 bits con tramado ordenado (PS1)
  col = floor(clamp(col, 0.0, 1.0) * uQuant + dith) / uQuant;
  gl_FragColor = vec4(col, 1.0);
}`;

const BLIT_FS = `
uniform sampler2D tSrc; uniform vec2 uLowRes; uniform float uCrt; uniform vec2 uScreen;
varying vec2 vUv;
void main(){
  vec3 c = texture2D(tSrc, vUv).rgb;
  if (uCrt > 0.0) {
    float ly = vUv.y * uLowRes.y;
    float sl = 0.5 + 0.5 * cos(ly * 6.2831853);
    c *= mix(1.0, 0.78 + 0.3 * sl, uCrt);
    float lx = vUv.x * uScreen.x;
    float m = mod(lx, 3.0);
    vec3 mask = m < 1.0 ? vec3(1.06,0.96,0.96) : (m < 2.0 ? vec3(0.96,1.06,0.96) : vec3(0.96,0.96,1.06));
    c *= mix(vec3(1.0), mask, uCrt * 0.6);
  }
  gl_FragColor = vec4(c, 1.0);
}`;

function fsMat(fs, uniforms) {
  return new THREE.ShaderMaterial({
    vertexShader: VS,
    fragmentShader: fs,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
}

export class PostPipeline {
  constructor(renderer) {
    this.renderer = renderer;
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);

    this.bright = fsMat(BRIGHT_FS, { tScene: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.blur = fsMat(BLUR_FS, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.U = {
      tScene: { value: null },
      tDepth: { value: null },
      tBloom: { value: null },
      uRes: { value: new THREE.Vector2() },
      uProjInv: { value: new THREE.Matrix4() },
      uCamWorld: { value: new THREE.Matrix4() },
      uCamPos: { value: new THREE.Vector3() },
      uTime: { value: 0 },
      uFogColor: { value: new THREE.Color(0.3, 0.32, 0.3) },
      uVol: { value: 0.035 },
      uSkyGlow: G.uSkyGlow,
      uSun: G.uSun,
      uSunDir: G.uSunDir,
      uVolY: { value: 0 },
      uVolScale: { value: 0.11 },
      uBloom: { value: 0.9 },
      uExposure: { value: 1.0 },
      uSat: { value: 0.78 },
      uContrast: { value: 1.08 },
      uBrightness: { value: 0 },
      uVignette: { value: 1.25 },
      uGrain: { value: 0.025 },
      uLift: { value: new THREE.Vector3(0.012, 0.018, 0.02) },
      uGain: { value: new THREE.Vector3(1.0, 0.98, 0.94) },
      uHurt: { value: 0 },
      uLowHp: { value: 0 },
      uFade: { value: 1 },
      uFadeColor: { value: new THREE.Color(0, 0, 0) },
      uFlash: { value: 0 },
      uFlashColor: { value: new THREE.Color(1, 1, 1) },
      uQuant: { value: 31 },
      uWarp: { value: 0 },
      uDesat: { value: 0 },
    };
    this.composite = fsMat(COMPOSITE_FS, this.U);
    this.blit = fsMat(BLIT_FS, {
      tSrc: { value: null },
      uLowRes: { value: new THREE.Vector2() },
      uCrt: { value: 0.35 },
      uScreen: { value: new THREE.Vector2() },
    });
    this.internalHeight = 300;
    this.rtScene = null;
  }

  // sw, sh: tamaño del lienzo en píxeles físicos. La resolución interna se
  // elige para que cada píxel interno ocupe exactamente k×k píxeles de
  // pantalla (escalado entero): sin columnas de distinto ancho que "reptan"
  // al mover la cámara.
  setSize(sw, sh, internalHeight = this.internalHeight) {
    this.internalHeight = internalHeight;
    const k = Math.max(1, Math.round(sh / Math.max(120, internalHeight)));
    const h = Math.max(120, Math.ceil(sh / k));
    const w = Math.max(160, Math.ceil(sw / k));
    this.k = k;
    this.sw = sw;
    this.sh = sh;
    this.w = w;
    this.h = h;
    [this.rtScene, this.rtFinal, this.rtB1, this.rtB2].forEach((r) => r && r.dispose());
    const depth = new THREE.DepthTexture(w, h);
    depth.type = THREE.UnsignedIntType;
    this.rtScene = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
      depthTexture: depth,
    });
    this.rtFinal = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
    });
    const bw = Math.max(40, w >> 2),
      bh = Math.max(24, h >> 2);
    const bo = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    this.rtB1 = new THREE.WebGLRenderTarget(bw, bh, bo);
    this.rtB2 = new THREE.WebGLRenderTarget(bw, bh, bo);
    this.bw = bw;
    this.bh = bh;
    this.U.uRes.value.set(w, h);
    this.blit.uniforms.uLowRes.value.set(w, h);
    this.blit.uniforms.uScreen.value.set(w * k, h * k);
  }

  _pass(mat, target) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCam);
  }

  render(scene, camera, time) {
    const r = this.renderer;
    r.setRenderTarget(this.rtScene);
    r.render(scene, camera);

    // bloom
    this.bright.uniforms.tScene.value = this.rtScene.texture;
    this.bright.uniforms.uTexel.value.set(1 / this.w, 1 / this.h);
    this._pass(this.bright, this.rtB1);
    for (let i = 0; i < 2; i++) {
      this.blur.uniforms.tSrc.value = this.rtB1.texture;
      this.blur.uniforms.uDir.value.set(1 / this.bw, 0);
      this._pass(this.blur, this.rtB2);
      this.blur.uniforms.tSrc.value = this.rtB2.texture;
      this.blur.uniforms.uDir.value.set(0, 1 / this.bh);
      this._pass(this.blur, this.rtB1);
    }

    const U = this.U;
    U.tScene.value = this.rtScene.texture;
    U.tDepth.value = this.rtScene.depthTexture;
    U.tBloom.value = this.rtB1.texture;
    U.uProjInv.value.copy(camera.projectionMatrixInverse);
    U.uCamWorld.value.copy(camera.matrixWorld);
    U.uCamPos.value.setFromMatrixPosition(camera.matrixWorld);
    U.uTime.value = time;
    this._pass(this.composite, this.rtFinal);

    this.blit.uniforms.tSrc.value = this.rtFinal.texture;
    // viewport de tamaño exacto k·w × k·h anclado arriba a la izquierda
    const k = this.k || 1;
    r.setViewport(0, this.sh - this.h * k, this.w * k, this.h * k);
    this._pass(this.blit, null);
    r.setViewport(0, 0, this.sw, this.sh);
  }
}
