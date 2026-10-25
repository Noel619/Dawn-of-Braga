// La fuente sin nombre, en el centro de la cisterna (su piedra y su reja:
// world/level_finale.js, cisternSpring; el ídolo que se alza en ella:
// entities/idol.js). Aquí lo que se mueve: el agua negra, que respira con una
// luz roja por debajo, a latidos; las pavesas que suben por la reja; el latido
// que se oye. Lo que ata al arzobispo con ella no se ve. Cuando el rito
// empieza (el suelo se hunde: grupo 'cisternFloorC'), todo esto se va con él.
import * as THREE from 'three';
import { SPRING, CISTERN } from '../world/level_finale.js';
import { G } from '../gfx/materials.js';
import { buildIdol, IDOL } from '../entities/idol.js';

const { AY } = CISTERN;

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
        // anillos lentos que salen del medio y una luz roja muy honda que se
        // mueve como si algo nadase debajo
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
    // la de la corona de velas que cuelga encima: la que le saca al ídolo la
    // cabeza, los hombros y el halo
    this.topLight = game.fx.lights.add({ x: SPRING.x - 2.4, y: AY + 8.9, z: SPRING.z + 0.8, color: 0xffc896, intensity: 0, range: 12, flicker: 0.25, priority: 4, on: false });
    this.t = 0;
    this.beatT = 0;
    this.emberT = 0;
    // (la introducción aviva la fuente: 0..1)
    this.boost = 0;
    // el ídolo, mirando a poniente: a la puerta, y al que se arrodilla
    // delante. Su cabeza sigue, muy despacio, a quien se acerca (o lo que
    // diga la introducción: lookAt = Vector3), y el ojo de la costura se le
    // entreabre (eye: 0..1, o lo que diga la introducción: eyeTo)
    this.idol = buildIdol();
    const R = this.idol.root;
    R.position.set(SPRING.x, AY, SPRING.z);
    R.rotation.y = -Math.PI / 2;
    R.traverse((o) => (o.frustumCulled = false));
    game.scene.add(R);
    this.idol.own();
    this.glows = this.idol.mats.filter((m) => m.emissive && m.emissiveIntensity > 0.9);
    for (const m of this.glows) m.userData.baseEI = m.emissiveIntensity;
    this.eye = this.idol.meshes.filter((m) => m.userData.grp === 'eye');
    // (el monolito no tiene cabeza que volver: sólo el ojo)
    this.head = this.idol.joints.head || null;
    this.headQ = this.head ? this.idol.restQ.head.clone() : null;
    this.yaw = 0;
    this.pitch = 0;
    this.open = 0;
    this.lookAt = null;
    this.eyeTo = null;
    this.sink = 0; // el rito: cuánto se ha hundido con el suelo
    this.whisperT = 0;
    this._lp = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
  }

  // la luz del sitio (la de la cisterna), una vez que el juego tiene sondas
  probeIdol() {
    const g = this.g;
    if (this._probed || !g.probe) return;
    this._probed = true;
    const P = { x: SPRING.x - 2, y: AY + 1, z: SPRING.z };
    const zn = g.zoneAt(P);
    const rid = zn && zn.room ? g.level.ctx.wb.roomId(zn.room) : 0;
    const o = g.probe.sample(P.x, AY + 2.5, P.z, rid);
    this.idol.setProbe(Math.max(0.24, o[0]), Math.max(0.13, o[1]), Math.max(0.11, o[2]), AY - 1.4, 0.2);
  }

  updateIdol(dt, pulse, near) {
    const g = this.g,
      R = this.idol.root;
    R.position.y = AY - this.sink;
    R.visible = (this.intact && this.sink <= 0) || (this.sink > 0 && this.sink < 9);
    if (!R.visible || !near) return;
    this.probeIdol();
    // a quién mira: lo que diga la introducción o el jugador, si anda cerca
    const p = g.player.pos;
    let T = this.lookAt;
    const dp = Math.hypot(p.x - SPRING.x, p.z - SPRING.z);
    if (!T && g.state === 'play' && dp < 16 && Math.abs(p.y - AY) < 4) T = this._lp.set(p.x, p.y + 1.6, p.z);
    let wy = 0,
      wp = 0;
    if (T) {
      const L = R.worldToLocal(this._lp.copy(T));
      wy = Math.max(-0.8, Math.min(0.8, Math.atan2(L.x, L.z)));
      // (mira al frente: apenas baja la cabeza hacia lo que mira)
      const down = Math.atan2(IDOL.eye[1] - L.y, Math.max(1, Math.hypot(L.x, L.z)));
      wp = Math.max(0, Math.min(0.14, down * 0.2));
    }
    // despacio: una piedra que no debería moverse
    const k = this.lookAt ? 0.6 : 0.22;
    this.yaw += Math.max(-k * dt, Math.min(k * dt, wy - this.yaw));
    this.pitch += Math.max(-k * dt, Math.min(k * dt, wp - this.pitch));
    if (this.head) {
      this._q.setFromEuler(this._e.set(this.pitch, this.yaw, 0));
      this.head.quaternion.copy(this.headQ).multiply(this._q);
    }
    // el ojo: se entreabre al que se acerca (del todo, a dos pasos)
    const want = this.eyeTo ?? (g.state === 'play' ? Math.max(0, Math.min(1, (6 - dp) / 3.5)) : 0);
    this.open += (want - this.open) * Math.min(1, dt * 1.2);
    for (const m of this.eye) m.scale.set(1 + this.open * 2.6, 1 + this.open * 0.25, 1);
    // la luz de la costura, del ojo y de los glifos late con la fuente
    for (const m of this.glows) m.emissiveIntensity = m.userData.baseEI * (0.45 + 0.75 * pulse + this.open * 0.8);
    // y de cerca se oye lo que dice (no se entiende)
    this.whisperT -= dt;
    if (g.state === 'play' && dp < 5 && this.whisperT <= 0) {
      this.whisperT = 1.6 + Math.random() * 2.4;
      g.audio && g.audio.play(Math.random() < 0.5 ? 'whisperNear' : 'whisperClose', { x: SPRING.x + (Math.random() - 0.5) * 2, y: AY + 4.5, z: SPRING.z + (Math.random() - 0.5) * 2 });
    }
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
    const pulse = Math.min(1, beat(this.t) + this.boost);
    this.water.material.uniforms.uPulse.value = pulse;
    this.light.on = near;
    this.light.intensity = 1.6 + 6.5 * pulse + this.boost * 9;
    this.topLight.on = near && this.idol.root.visible;
    this.topLight.intensity = 2.6;
    this.updateIdol(dt, pulse, near || this.sink > 0);
    if (!near) return;
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
  }
}
