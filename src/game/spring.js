// La fuente sin nombre, en el centro de la cisterna (su piedra y su reja:
// world/level_finale.js, cisternSpring; el ídolo que se alza en ella:
// entities/idol.js). Aquí lo que se mueve: el agua negra, que respira con una
// luz roja por debajo, a latidos; las pavesas que suben por la reja; el latido
// que se oye; y el ídolo: el ojo que se abre y mira a quien se acerca y, en el
// monolito, las almas, que gritan de una en una y piden auxilio desde dentro
// de la piedra. Lo que ata al arzobispo con ella no se ve. Cuando el rito
// empieza (el suelo se hunde: grupo 'cisternFloorC'), todo esto se va con él.
import * as THREE from 'three';
import { SPRING, CISTERN } from '../world/level_finale.js';
import { G } from '../gfx/materials.js';
import { buildIdol, IDOL, setIdolKind, loadMonolith } from '../entities/idol.js';
import { spine as monoSpine } from '../entities/idol_monolith_geo.js';

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
    // la de la corona de velas que cuelga encima: la que le saca al ídolo lo
    // de arriba
    this.topLight = game.fx.lights.add({ x: SPRING.x - 2.4, y: AY + 8.9, z: SPRING.z + 0.8, color: 0xffc896, intensity: 0, range: 12, flicker: 0.25, priority: 4, on: false });
    // la luz roja del hueco de arriba del monolito (le enciende los brazos
    // por debajo)
    this.hollowLight = game.fx.lights.add({ x: SPRING.x, y: AY + 6.9, z: SPRING.z, color: 0xff3412, intensity: 0, range: 3.4, flicker: 0.2, priority: 3, on: false });
    this.t = 0;
    this.beatT = 0;
    this.emberT = 0;
    // (la introducción aviva la fuente: 0..1)
    this.boost = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.open = 0;
    this.lookAt = null;
    this.eyeTo = null;
    this.sink = 0; // el rito: cuánto se ha hundido con el suelo
    this.whisperT = 0;
    this.cryT = 2;
    this._lp = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this.makeIdol();
  }

  // El ídolo, mirando a poniente: a la puerta, y al que se arrodilla
  // delante. Su cabeza (la estatua) o su ojo (el monolito) sigue, muy
  // despacio, a quien se acerca (o lo que diga la introducción: lookAt =
  // Vector3), y el ojo se le entreabre (eye: 0..1, o lo que diga la
  // introducción: eyeTo). Se rehace al cambiar de forma (setKind).
  makeIdol() {
    const game = this.g;
    if (this.idol) {
      game.scene.remove(this.idol.root);
      this.idol.root.traverse((o) => o.geometry && o.geometry.dispose());
      for (const m of this.idol.mats || []) m.dispose();
    }
    this.idol = buildIdol();
    if (!this.idol) {
      // (el monolito, mientras se hace en el hilo de fondo: nada)
      const kind = IDOL.kind;
      loadMonolith().then(() => {
        if (IDOL.kind === kind && !this.idol) this.makeIdol();
      });
      return;
    }
    const R = this.idol.root;
    R.position.set(SPRING.x, AY - this.sink, SPRING.z);
    R.rotation.y = -Math.PI / 2;
    R.traverse((o) => (o.frustumCulled = false));
    game.scene.add(R);
    this.idol.own();
    this.glows = this.idol.mats.filter((m) => m.emissive && m.emissiveIntensity > 0.9 && !m.userData.U);
    for (const m of this.glows) m.userData.baseEI = m.emissiveIntensity;
    this.eye = this.idol.meshes.filter((m) => m.userData.grp === 'eye');
    // (el monolito no tiene cabeza que volver: vuelve el ojo)
    this.head = this.idol.joints.head || null;
    this.headQ = this.head ? this.idol.restQ.head.clone() : null;
    this.yaw = this.pitch = 0;
    this._probed = false;
    const c = this.idol.isMonolith ? monoSpine(6.9) : [0, 0];
    this.hollowLight.x = SPRING.x - c[1];
    this.hollowLight.z = SPRING.z + c[0];
  }
  // Cambia la forma del ídolo (la estatua o el monolito), en pleno juego
  setKind(kind) {
    if (!setIdolKind(kind)) return false;
    this.makeIdol();
    return true;
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
    if (!this.idol) return;
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
    const I = this.idol;
    if (I.isMonolith) {
      // (en el monolito, lo que mira es lo de dentro del ojo, y más deprisa)
      if (T) I.lookAt(R.worldToLocal(this._lp.copy(T)), dt, this.lookAt ? 0.9 : 0.4);
      I.setOpen(this.open);
      I.setPulse(pulse, this.boost * 0.8);
      this.souls(dt, dp);
      I.update(dt);
    } else for (const m of this.eye) m.scale.set(1 + this.open * 2.6, 1 + this.open * 0.25, 1);
    // la luz de la costura, del ojo y de los glifos late con la fuente
    for (const m of this.glows) m.emissiveIntensity = m.userData.baseEI * (0.45 + 0.75 * pulse + this.open * 0.8);
    // y de cerca se oye lo que dice (no se entiende)
    this.whisperT -= dt;
    if (g.state === 'play' && dp < 5 && this.whisperT <= 0) {
      this.whisperT = 1.6 + Math.random() * 2.4;
      g.audio && g.audio.play(Math.random() < 0.5 ? 'whisperNear' : 'whisperClose', { x: SPRING.x + (Math.random() - 0.5) * 2, y: AY + 4.5, z: SPRING.z + (Math.random() - 0.5) * 2 });
    }
  }

  // Las almas del monolito: de vez en cuando una grita (empuja la piedra y
  // se le enciende la boca) y, jugando, se la oye pedir auxilio, ahogada.
  // Gritan más a menudo cuanto más cerca se está y, sobre todo, cuando el
  // ojo se abre; mejor las que dan a quien mira.
  souls(dt, dp) {
    const g = this.g,
      I = this.idol;
    this.cryT -= dt;
    if (this.cryT > 0) return;
    const play = g.state === 'play';
    const close = play ? Math.max(0, Math.min(1, (12 - dp) / 8)) : 0.4;
    this.cryT = (7.5 - 3.6 * close - 1.8 * this.open) * (0.6 + Math.random() * 0.8);
    const cam = g.camera.position;
    const R = I.root;
    const L = R.worldToLocal(this._lp.copy(cam));
    const pick = [];
    I.souls.forEach((S, i) => {
      if (!S) return;
      const dx = L.x - S.p.x,
        dy = L.y - S.p.y,
        dz = L.z - S.p.z;
      if (dx * S.n.x + dy * S.n.y + dz * S.n.z > 0) pick.push(i);
    });
    if (!pick.length) return;
    const i = pick[Math.floor(Math.random() * pick.length)];
    const S = I.souls[i];
    const loud = Math.random() < 0.45;
    I.cry(i, loud ? 1.1 : 0.7 + Math.random() * 0.5);
    if (play && g.audio) {
      const W = R.localToWorld(this._lp.copy(S.p));
      g.audio.play(loud ? 'soulScream' : 'soulPlea', { x: W.x, y: W.y, z: W.z });
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
    const shown = !!this.idol && this.idol.root.visible;
    this.topLight.on = near && shown;
    this.topLight.intensity = 2.6;
    this.hollowLight.on = near && shown && !!this.idol.isMonolith;
    this.hollowLight.y = AY + 6.9 - this.sink;
    this.hollowLight.intensity = 1.1 + 2.6 * pulse + this.boost * 3;
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
