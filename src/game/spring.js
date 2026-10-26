// La fuente sin nombre, en el centro del círculo de la cisterna (su piedra y
// su reja: world/level_finale.js, cisternSpring), y la estatua de la sima del
// fondo (entities/idol*.js). Aquí lo que se mueve: el agua negra de la
// fuente, que respira con una luz roja por debajo, a latidos; las pavesas
// que suben por la reja; el latido que se oye; el agua roja de la sima, que
// late con ella; y la estatua: vuelve la cabeza, muy despacio, hacia quien
// entra en el círculo; la costura de la cara se le abre (es un ojo) cuando
// se le acerca, y lo de dentro le sigue; la brasa del pecho late. Lo que ata
// al arzobispo con la fuente no se ve. Cuando el rito empieza (el suelo se
// hunde: grupo 'cisternFloorC'), la fuente se va con él; la estatua se queda
// en su sima.
import * as THREE from 'three';
import { SPRING, SANCT, CISTERN } from '../world/level_finale.js';
import { G } from '../gfx/materials.js';
import { buildIdol, IDOL, loadIdol, idolToWorld } from '../entities/idol.js';

const { AY, cz: CZ } = CISTERN;
const A = SANCT.apse;

// el latido: dos golpes y un silencio (0..1)
export function beat(t, period = 1.7) {
  const u = (t % period) / period;
  const a = Math.exp(-((u - 0.04) ** 2) / 0.0012),
    b = Math.exp(-((u - 0.2) ** 2) / 0.0016) * 0.7;
  return Math.min(1, a + b);
}

// el agua: negra, con una luz roja que se mueve por debajo; más encendida
// hacia el centro (c) en un radio R
function waterMat(cx, czz, R, k = 1) {
  const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
  u.uTime = G.uTime;
  u.uPulse = { value: 0 };
  u.uC = { value: new THREE.Vector2(cx, czz) };
  u.uR = { value: R };
  u.uK = { value: k };
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
    fragmentShader: `uniform float uTime; uniform float uPulse; uniform vec2 uC; uniform float uR; uniform float uK;
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
        float glow = (0.38 + 0.62 * uPulse) * (0.45 + 0.55 * deep) * smoothstep(1.05, 0.0, r) * uK;
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

// ¿está p dentro del santuario (el círculo o el pasillo de las columnas)?
function inSanctum(p) {
  if (p.y < AY - 2 || p.y > AY + 8) return false;
  if (Math.hypot(p.x, p.z - CZ) < SANCT.R + 0.5) return true;
  const N = SANCT.nave;
  return p.x > N.x0 && p.x < N.x1 && p.z > N.z0 && p.z < N.z1 + 2;
}

export class Spring {
  constructor(game) {
    this.g = game;
    const geo = new THREE.CircleGeometry(SPRING.r, 28);
    geo.rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(geo, waterMat(SPRING.x, SPRING.z, SPRING.r));
    this.water.position.set(SPRING.x, SPRING.water, SPRING.z);
    game.scene.add(this.water);
    // el agua de la sima, al pie de la estatua
    const pg = new THREE.PlaneGeometry(A.x1 - A.x0, A.back - A.lip);
    pg.rotateX(-Math.PI / 2);
    const pz = (A.lip + A.back) / 2;
    this.pool = new THREE.Mesh(pg, waterMat(0, pz, 6.5, 0.8));
    this.pool.position.set((A.x0 + A.x1) / 2, A.water, pz);
    game.scene.add(this.pool);
    this.light = game.fx.lights.add({ x: SPRING.x, y: AY - 0.75, z: SPRING.z, color: 0xff2a10, intensity: 0, range: 7.5, flicker: 0, priority: 5, on: false });
    // la de la corona de velas que cuelga de la bóveda
    this.topLight = game.fx.lights.add({ x: 0, y: AY + 8.1, z: CZ, color: 0xffc896, intensity: 0, range: 16, flicker: 0.25, priority: 4, on: false });
    // la roja de la sima, que le sube por el cuerpo a la estatua: una por
    // delante, a ras del borde, y otra abajo, junto al agua
    this.abyssLight = game.fx.lights.add({ x: 0, y: AY - 1.6, z: A.lip + 0.4, color: 0xff2a0c, intensity: 0, range: 17, flicker: 0.08, priority: 6, on: false });
    this.poolLight = game.fx.lights.add({ x: 0, y: A.water + 0.9, z: A.lip + 2.4, color: 0xff3010, intensity: 0, range: 9, flicker: 0.12, priority: 4, on: false });
    this.faceLight = game.fx.lights.add({ x: 0, y: AY + 3.2, z: A.lip - 2.2, color: 0xff4a1c, intensity: 0, range: 10, flicker: 0.1, priority: 5, on: false });
    // la de la brasa del pecho
    this.emberLight = game.fx.lights.add({ x: 0, y: AY + 3.6, z: -141.7, color: 0xff4a18, intensity: 0, range: 4.5, flicker: 0.3, priority: 3, on: false });
    this.t = 0;
    this.beatT = 0;
    this.emberT = 0;
    // (la introducción aviva la fuente: 0..1)
    this.boost = 0;
    this.open = 0;
    this.lookAt = null;
    this.eyeTo = null;
    this.sink = 0; // (el rito: cuánto se ha hundido el suelo; la estatua se queda)
    this.whisperT = 0;
    this.groanT = 4;
    this._lp = new THREE.Vector3();
    this._lq = new THREE.Vector3();
    this.makeIdol();
  }

  // La estatua, en su sima, mirando al norte: a la boca del círculo y al
  // que se arrodilla en la fuente. Mientras se esculpe en el hilo de fondo,
  // nada.
  makeIdol() {
    if (this.idol) return;
    const I = buildIdol();
    if (!I) {
      loadIdol().then(() => this.makeIdol());
      return;
    }
    this.idol = I;
    const R = I.root;
    R.position.set(IDOL.x, IDOL.y, IDOL.z);
    R.rotation.y = IDOL.yaw;
    R.updateMatrixWorld(true);
    this.g.scene.add(R);
    I.own();
    const e = idolToWorld(I.extra.ember);
    this.emberLight.x = e.x;
    this.emberLight.y = e.y;
    this.emberLight.z = e.z - 0.6;
    this._probed = false;
  }

  // la luz del sitio (la del círculo), una vez que el juego tiene sondas
  probeIdol() {
    const g = this.g;
    if (this._probed || !g.probe) return;
    this._probed = true;
    const P = { x: 0, y: AY + 1, z: A.lip - 2.5 };
    const zn = g.zoneAt(P);
    const rid = zn && zn.room ? g.level.ctx.wb.roomId(zn.room) : 0;
    const o = g.probe.sample(P.x, AY + 2.5, P.z, rid);
    this.idol.setProbe(Math.max(0.34, o[0]), Math.max(0.2, o[1]), Math.max(0.18, o[2]), A.water, 0.25);
  }

  updateIdol(dt, pulse, near) {
    const I = this.idol;
    if (!I) return;
    const g = this.g,
      R = I.root;
    R.visible = near;
    if (!near) return;
    this.probeIdol();
    // a quién mira: a lo que diga la introducción o al jugador, si está en el
    // círculo o en el pasillo
    const p = g.player.pos;
    const play = g.state === 'play';
    const inside = play && inSanctum(p);
    let T = this.lookAt;
    if (!T && inside) T = this._lp.set(p.x, p.y + 1.6, p.z);
    if (T) {
      const L = R.worldToLocal(this._lq.copy(T));
      I.setLook(L, dt, this.lookAt ? 0.5 : 0.14);
      I.lookAt(L, dt, this.lookAt ? 0.9 : 0.5);
    }
    // el ojo: se abre al que entra en el círculo y se acerca (del todo, a
    // unos pasos del borde de la sima); en la pelea, abierto
    const dLip = Math.hypot(p.x, Math.max(0, A.lip - p.z));
    const inRing = inside && Math.hypot(p.x, p.z - CZ) < SANCT.R + 0.5;
    const want = this.eyeTo ?? (inRing ? (g.activeBoss ? 1 : Math.max(0, Math.min(1, (17 - dLip) / 9))) : 0);
    this.open += (want - this.open) * Math.min(1, dt * (want > this.open ? 0.7 : 1.4));
    I.setOpen(this.open);
    I.setPulse(pulse, this.boost * 0.8);
    // de cerca se le oye lo que dice (no se entiende) y, cuando se mueve,
    // la piedra que cruje
    this.whisperT -= dt;
    if (inRing && dLip < 9 && this.whisperT <= 0) {
      this.whisperT = 1.8 + Math.random() * 2.6;
      g.audio && g.audio.play(Math.random() < 0.5 ? 'whisperNear' : 'whisperClose', { x: (Math.random() - 0.5) * 4, y: AY + 2 + Math.random() * 3, z: A.lip + 1.5 });
    }
    this.groanT -= dt;
    if (inRing && this.groanT <= 0) {
      this.groanT = 9 + Math.random() * 9;
      g.audio && g.audio.play('stoneCreak', { x: 0, y: AY + 3, z: A.lip + 2 }, { k: 0.35 });
    }
  }

  // ¿está la fuente (el suelo del círculo, entero)?
  get intact() {
    const G0 = this.g.groups && this.g.groups.cisternFloorC;
    return !G0 || G0.on;
  }

  update(dt) {
    const g = this.g;
    this.t += dt;
    const intact = this.intact;
    const cam = g.camera.position;
    // (cerca: la cámara en el santuario, o en el cráter que lo abre)
    const near = cam.y > AY - 9 && cam.y < 40 && cam.x > -18 && cam.x < 20 && cam.z > -194 && cam.z < -128;
    const nearRing = near && Math.abs(cam.y - AY) < 16 && Math.hypot(cam.x, cam.z - CZ) < 40;
    this.water.visible = intact;
    this.pool.visible = near;
    const pulse = Math.min(1, beat(this.t) + this.boost);
    this.water.material.uniforms.uPulse.value = pulse;
    this.pool.material.uniforms.uPulse.value = pulse;
    this.light.on = nearRing && intact;
    this.light.intensity = 1.6 + 6.5 * pulse + this.boost * 9;
    const shown = !!this.idol && this.idol.root.visible;
    this.topLight.on = nearRing && intact;
    this.topLight.intensity = 2.4;
    this.abyssLight.on = near && shown;
    this.abyssLight.intensity = 9 + 7 * pulse + this.boost * 6;
    this.poolLight.on = near && shown;
    this.poolLight.intensity = 4 + 4 * pulse + this.boost * 4;
    this.faceLight.on = near && shown;
    this.faceLight.intensity = 3.5 + 2.5 * pulse + this.boost * 3 + this.open * 2;
    this.emberLight.on = near && shown;
    this.emberLight.intensity = 0.8 + 2.4 * pulse + this.boost * 3;
    this.updateIdol(dt, pulse, near);
    if (!nearRing || !intact) return;
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
