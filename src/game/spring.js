// La fuente sin nombre, en el centro de la cisterna (su piedra, su reja y el
// ídolo: world/level_finale.js, cisternSpring). Aquí lo que se mueve: el agua
// negra, que respira con una luz roja por debajo, a latidos; las pavesas que
// suben por la reja; el latido que se oye; y, mientras el arzobispo pelea, el
// cordón de carne que le ata a ella: sale del pecho del ídolo, sube por el
// boquete de la reja, se arrastra por el suelo y se le mete por la espalda.
// Por ahí le llega lo que hay detrás de la puerta: es su cuerpo en el mundo.
// Cuando el rito empieza (el suelo se hunde: grupo 'cisternFloorC'), todo esto
// se va con él.
import * as THREE from 'three';
import { SPRING, CISTERN } from '../world/level_finale.js';
import { objMat, cloneMat, G } from '../gfx/materials.js';

const V3 = THREE.Vector3;
const { AY } = CISTERN;
const SEG = 56,
  RAD = 7;

// el latido: dos golpes y un silencio (0..1)
export function beat(t, period = 1.7) {
  const u = (t % period) / period;
  const a = Math.exp(-((u - 0.04) ** 2) / 0.0012),
    b = Math.exp(-((u - 0.2) ** 2) / 0.0016) * 0.7;
  return Math.min(1, a + b);
}

function waterMat() {
  const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
  u.uTime = G.uTime;
  u.uPulse = { value: 0 };
  u.uC = { value: new THREE.Vector2(SPRING.x, SPRING.z) };
  u.uR = { value: SPRING.r };
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
    fragmentShader: `uniform float uTime; uniform float uPulse; uniform vec2 uC; uniform float uR;
      varying vec3 vW;
      #include <fog_pars_fragment>
      float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float ns(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hs(i),hs(i+vec2(1,0)),f.x), mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec2 q = vW.xz - uC;
        float r = length(q) / uR;
        // anillos lentos que salen del medio (donde entra el cordón) y una
        // luz roja muy honda que se mueve como si algo nadase debajo
        float ring = sin(r * 22.0 - uTime * 1.6) * exp(-r * 1.6) * 0.5 + 0.5;
        float deep = ns(q * 1.7 + vec2(uTime * 0.13, -uTime * 0.09)) * ns(q * 3.1 - vec2(uTime * 0.07, uTime * 0.11));
        float glow = (0.38 + 0.62 * uPulse) * (0.45 + 0.55 * deep) * smoothstep(1.05, 0.0, r);
        vec3 col = vec3(0.012, 0.006, 0.008) + vec3(0.95, 0.12, 0.05) * glow + vec3(0.3, 0.06, 0.03) * ring * 0.08 * (0.4 + uPulse);
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

export class Spring {
  constructor(game) {
    this.g = game;
    const geo = new THREE.CircleGeometry(SPRING.r, 28);
    geo.rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(geo, waterMat());
    this.water.position.set(SPRING.x, SPRING.water, SPRING.z);
    game.scene.add(this.water);
    this.light = game.fx.lights.add({ x: SPRING.x, y: AY - 0.75, z: SPRING.z, color: 0xff2a10, intensity: 0, range: 7.5, flicker: 0, priority: 5, on: false });
    this.t = 0;
    this.beatT = 0;
    this.emberT = 0;
    // el cordón
    const n = (SEG + 1) * (RAD + 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const uv = new Float32Array(n * 2);
    for (let j = 0; j <= SEG; j++) for (let k = 0; k <= RAD; k++) uv.set([(k / RAD) * 1.2, j * 0.35], (j * (RAD + 1) + k) * 2);
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const idx = [];
    for (let j = 0; j < SEG; j++)
      for (let k = 0; k < RAD; k++) {
        const a = j * (RAD + 1) + k,
          b = a + RAD + 1;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new V3(SPRING.x, AY, SPRING.z), 30);
    this.cordMat = cloneMat(objMat('flesh'));
    // (la luz del sitio: la de la cisterna, roja y baja)
    if (this.cordMat._u) this.cordMat._u.uProbe.value.set(0.42, 0.22, 0.2);
    this.cord = new THREE.Mesh(g, this.cordMat);
    this.cord.frustumCulled = false;
    this.cord.visible = false;
    game.scene.add(this.cord);
    this.curve = new THREE.CatmullRomCurve3([new V3(), new V3(), new V3(), new V3()], false, 'centripetal');
    this._pts = [];
    this._c = [];
    for (let j = 0; j <= SEG; j++) this._c.push(new V3());
    this._t = new V3();
    this._n = new V3();
    this._b = new V3();
    this._v = new V3();
    this._back = new V3();
    // (en la espalda del arzobispo, sobre la cadera; su modelo mira hacia +z)
    this._attach = new V3(0, -0.12, -0.5);
    this.on = true;
  }

  // ¿está la fuente (el suelo de la cisterna, entero)?
  get intact() {
    const G0 = this.g.groups && this.g.groups.cisternFloorC;
    return !G0 || G0.on;
  }

  update(dt) {
    const g = this.g;
    this.t += dt;
    const intact = this.intact;
    const cam = g.camera.position;
    const near = intact && Math.abs(cam.y - AY) < 14 && Math.hypot(cam.x - SPRING.x, cam.z - SPRING.z) < 40;
    this.water.visible = intact;
    const pulse = beat(this.t);
    this.water.material.uniforms.uPulse.value = pulse;
    this.light.on = near;
    this.light.intensity = 1.6 + 6.5 * pulse;
    if (!near) {
      this.cord.visible = false;
      return;
    }
    // las pavesas que suben por la reja
    this.emberT -= dt;
    if (this.emberT <= 0) {
      this.emberT = 0.18 + Math.random() * 0.3;
      const a = Math.random() * Math.PI * 2,
        r = Math.sqrt(Math.random()) * SPRING.r * 0.9;
      g.fx.blood.emit(SPRING.x + Math.cos(a) * r, AY + 0.05, SPRING.z + Math.sin(a) * r, 1, { color: [1, 0.36, 0.12], speed: 0.25, life: 2.4, up: 0.9, gravity: -0.35 });
    }
    // el latido, que se oye cerca (y más fuerte cuanto más cerca)
    const p = g.player.pos;
    const dp = Math.hypot(p.x - SPRING.x, p.z - SPRING.z);
    if (this.t - this.beatT > 1.7 && g.state === 'play' && dp < 16 && Math.abs(p.y - AY) < 4) {
      this.beatT = this.t - ((this.t % 1.7) - 0.04);
      g.audio && g.audio.play('coreBeat', { x: SPRING.x, y: AY - 0.8, z: SPRING.z }, { k: 0.18 + 0.3 * Math.max(0, 1 - dp / 16) });
    }
    this.updateCord(dt);
  }

  // El arzobispo, si está vivo y en su cisterna (ni vencido, ni en el rito)
  archbishop() {
    const g = this.g;
    if (g.flags['finale:rite'] || (g.finale && g.finale.filmActive)) return null;
    const e = g.bosses && g.bosses.turibulario;
    if (!e || e.dead || e.scripted || !e.obj.visible) return null;
    if (Math.abs(e.pos.y - AY) > 3 || Math.hypot(e.pos.x - SPRING.x, e.pos.z - SPRING.z) > 14) return null;
    return e;
  }

  updateCord() {
    const e = this.archbishop();
    this.cord.visible = !!(e && this.intact);
    if (!this.cord.visible) return;
    const g = this.g;
    const R = 0.14;
    // dónde se le mete: en la espalda, sobre la cadera
    const B = e.rig.worldPos('hips', this._v, this._attach).clone();
    const fx = Math.sin(e.yaw),
      fz = Math.cos(e.yaw);
    const C = new V3(SPRING.x, AY + R, SPRING.z);
    const A = new V3(...SPRING.chest);
    const pts = [A, new V3(A.x + 0.05, AY - 0.45, A.z + 0.05), new V3(SPRING.x + 0.1, AY + 0.25, SPRING.z + 0.08)];
    // detrás de él, en el suelo
    const behind = new V3(e.pos.x - fx * 1.1, AY + R, e.pos.z - fz * 1.1);
    const dC = Math.hypot(e.pos.x - C.x, e.pos.z - C.z);
    if (dC > 1.6) {
      // del boquete hacia él por el suelo; si el camino recto le pasa por
      // debajo (la fuente le queda delante), lo rodea por un lado
      const out = new V3(e.pos.x - C.x, 0, e.pos.z - C.z).normalize();
      const f1 = new V3(C.x + out.x * 0.9, AY + R, C.z + out.z * 0.9);
      pts.push(f1);
      const sx = -fz,
        sz = fx;
      const toC = (C.x - e.pos.x) * fx + (C.z - e.pos.z) * fz;
      if (toC > -0.4) {
        const side = (C.x - e.pos.x) * sx + (C.z - e.pos.z) * sz >= 0 ? 1 : -1;
        pts.push(new V3(e.pos.x + sx * side * 1.6 + fx * 0.3, AY + R, e.pos.z + sz * side * 1.6 + fz * 0.3));
      }
      pts.push(behind);
    } else pts.push(new V3((behind.x + C.x) / 2, AY + 0.4, (behind.z + C.z) / 2));
    // y sube a la espalda
    pts.push(new V3((behind.x + B.x) / 2, (behind.y + B.y) / 2 - 0.2, (behind.z + B.z) / 2), B);
    this.curve.points = pts;
    this.curve.updateArcLengths();
    const c = this._c;
    for (let j = 0; j <= SEG; j++) this.curve.getPointAt(j / SEG, c[j]);
    // marcos que no se retuercen (transporte paralelo)
    const P = this.cord.geometry.attributes.position,
      Nn = this.cord.geometry.attributes.normal;
    const T = this._t,
      Nv = this._n,
      Bv = this._b;
    T.subVectors(c[1], c[0]).normalize();
    Nv.set(1, 0, 0);
    if (Math.abs(T.x) > 0.9) Nv.set(0, 0, 1);
    Nv.addScaledVector(T, -Nv.dot(T)).normalize();
    const time = g.time;
    // la carne late y algo corre por dentro hacia él
    const glow = 0.5 + 0.9 * beat(this.t);
    this.cordMat.emissiveIntensity = glow * (e.data.phase === 2 ? 1.5 : 1);
    for (let j = 0; j <= SEG; j++) {
      const u = j / SEG;
      if (j > 0) {
        const t2 = this._v.subVectors(c[Math.min(SEG, j + 1)], c[j - 1]).normalize();
        Nv.addScaledVector(t2, -Nv.dot(t2)).normalize();
        T.copy(t2);
      }
      Bv.crossVectors(T, Nv).normalize();
      const swell = 1 + 0.35 * Math.max(0, Math.sin(u * 26 - time * 5.5)) ** 3;
      const r = (u < 0.12 ? 0.17 : u > 0.82 ? R + (u - 0.82) * 0.6 : R) * swell;
      for (let k = 0; k <= RAD; k++) {
        const a = (k / RAD) * Math.PI * 2;
        const ca = Math.cos(a),
          sa = Math.sin(a);
        const nx = Nv.x * ca + Bv.x * sa,
          ny = Nv.y * ca + Bv.y * sa,
          nz = Nv.z * ca + Bv.z * sa;
        const i = j * (RAD + 1) + k;
        P.setXYZ(i, c[j].x + nx * r, c[j].y + ny * r, c[j].z + nz * r);
        Nn.setXYZ(i, nx, ny, nz);
      }
    }
    P.needsUpdate = true;
    Nn.needsUpdate = true;
  }
}
