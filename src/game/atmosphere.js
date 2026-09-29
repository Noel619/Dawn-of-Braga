// Atmósfera por zona: niebla, luz ambiente, luna, ceniza, gradación de color.
import * as THREE from 'three';
import { damp } from '../core/util.js';

export const ATMO = {
  city: { fog: 0x5c625e, density: 0.042, sky: 0x9aa6b2, ground: 0x2c2723, hemi: 2.2, moon: 0.9, vol: 0.038, ash: 1, exposure: 1.0, sat: 0.7, lamp: 9, bloom: 0.9 },
  prison: { fog: 0x100d0b, density: 0.06, sky: 0x8a8278, ground: 0x2a221c, hemi: 1.1, moon: 0, vol: 0, ash: 0, exposure: 1.2, sat: 0.8, lamp: 10, bloom: 1.0 },
  interior: { fog: 0x15110e, density: 0.055, sky: 0x8a8278, ground: 0x2a221c, hemi: 1.2, moon: 0.05, vol: 0, ash: 0, exposure: 1.15, sat: 0.8, lamp: 10, bloom: 1.0 },
  chapel: { fog: 0x1b1411, density: 0.045, sky: 0x9a8a80, ground: 0x2a2018, hemi: 1.4, moon: 0.05, vol: 0, ash: 0, exposure: 1.15, sat: 0.85, lamp: 9, bloom: 1.1 },
  cathedral: { fog: 0x241a1c, density: 0.03, sky: 0x8a7a80, ground: 0x2a1e1e, hemi: 1.6, moon: 0.15, vol: 0.03, ash: 0.12, exposure: 1.1, sat: 0.8, lamp: 10, bloom: 1.2 },
  ramparts: { fog: 0x666d6a, density: 0.036, sky: 0xa6b2bc, ground: 0x2c2723, hemi: 2.4, moon: 1.1, vol: 0.048, ash: 1.4, exposure: 1.0, sat: 0.68, lamp: 8, bloom: 0.9 },
  crypt: { fog: 0x070809, density: 0.065, sky: 0x5a5e66, ground: 0x1a1612, hemi: 0.75, moon: 0, vol: 0, ash: 0, exposure: 1.25, sat: 0.8, lamp: 12, bloom: 1.1 },
  arena: { fog: 0x1a080c, density: 0.028, sky: 0x70404a, ground: 0x241010, hemi: 1.1, moon: 0, vol: 0.02, ash: 0, exposure: 1.2, sat: 0.85, lamp: 11, bloom: 1.3 },
  // la bodega del canónigo: casi a oscuras, sólo el farol y las velas del altar
  cellar: { fog: 0x060505, density: 0.075, sky: 0x4a4644, ground: 0x161210, hemi: 0.55, moon: 0, vol: 0, ash: 0, exposure: 1.25, sat: 0.78, lamp: 12, bloom: 1.1 },
  tunnel: { fog: 0x09090b, density: 0.06, sky: 0x5a5e66, ground: 0x1a1612, hemi: 0.7, moon: 0, vol: 0, ash: 0, exposure: 1.25, sat: 0.8, lamp: 12, bloom: 1.0 },
  dawn: { fog: 0xc8a08a, density: 0.012, sky: 0xffd6b8, ground: 0x5a4a3a, hemi: 2.6, moon: 3.2, moonColor: 0xffa860, vol: 0.03, ash: 0, exposure: 1.05, sat: 0.95, lamp: 1, bloom: 1.1 },
};

const tmpC = new THREE.Color();

export class Atmosphere {
  constructor(scene, post, fx) {
    this.scene = scene;
    this.post = post;
    this.fx = fx;
    this.fog = new THREE.FogExp2(0x4c524f, 0.055);
    scene.fog = this.fog;
    scene.background = this.fog.color;
    this.hemi = new THREE.HemisphereLight(0x8894a0, 0x2c2723, 1.15);
    scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0x9fb2cc, 0.5);
    this.moon.position.set(-30, 60, 20);
    scene.add(this.moon);
    this.cur = { ...ATMO.city };
    this.target = ATMO.city;
    this.fogC = new THREE.Color(ATMO.city.fog);
    this.skyC = new THREE.Color(ATMO.city.sky);
    this.groundC = new THREE.Color(ATMO.city.ground);
    this.moonC = new THREE.Color(0x9fb2cc);
    this.brightness = 0;
    this.override = null;
  }
  set(name, instant = false) {
    this.target = ATMO[name] || ATMO.city;
    this.name = name;
    if (instant) {
      Object.assign(this.cur, this.target);
      this.fogC.set(this.target.fog);
      this.skyC.set(this.target.sky);
      this.groundC.set(this.target.ground);
      this.moonC.set(this.target.moonColor ?? 0x9fb2cc);
    }
  }
  update(dt, player) {
    const T = this.override ? { ...this.target, ...this.override } : this.target;
    const k = 1.6;
    for (const key of ['density', 'hemi', 'moon', 'vol', 'ash', 'exposure', 'sat', 'lamp', 'bloom']) this.cur[key] = damp(this.cur[key], T[key], k, dt);
    this.fogC.lerp(tmpC.set(T.fog), 1 - Math.exp(-k * dt));
    this.skyC.lerp(tmpC.set(T.sky), 1 - Math.exp(-k * dt));
    this.groundC.lerp(tmpC.set(T.ground), 1 - Math.exp(-k * dt));
    this.moonC.lerp(tmpC.set(T.moonColor ?? 0x9fb2cc), 1 - Math.exp(-k * dt));
    const c = this.cur;
    this.fog.color.copy(this.fogC);
    this.fog.density = c.density;
    this.hemi.color.copy(this.skyC);
    this.hemi.groundColor.copy(this.groundC);
    this.hemi.intensity = c.hemi;
    this.moon.intensity = c.moon;
    this.moon.color.copy(this.moonC);
    const U = this.post.U;
    U.uFogColor.value.copy(this.fogC);
    U.uVol.value = c.vol;
    U.uSkyGlow.value = this.name === 'dawn' ? 0 : this.name === 'city' || this.name === 'ramparts' ? 1 : 0;
    U.uSun.value = damp(U.uSun.value, this.name === 'dawn' ? 1 : 0, 1, dt);
    // luz del amanecer: rasante desde el norte
    const mp = this.name === 'dawn' ? [18, 14, -80] : [-30, 60, 20];
    this.moon.position.x = damp(this.moon.position.x, mp[0], 1, dt);
    this.moon.position.y = damp(this.moon.position.y, mp[1], 1, dt);
    this.moon.position.z = damp(this.moon.position.z, mp[2], 1, dt);
    U.uExposure.value = c.exposure;
    U.uSat.value = c.sat;
    U.uBloom.value = c.bloom;
    U.uBrightness.value = this.brightness;
    U.uVolY.value = player ? player.pos.y : 0;
    if (this.fx && this.fx.ash) this.fx.ash.mat.uniforms.uAmount.value = c.ash;
    if (player) player.lampBase = c.lamp;
    // el plano lejano se ajusta a la niebla: lo que la niebla oculta no se dibuja
    if (this.camera) {
      const far = Math.min(170, Math.max(46, 2.6 / Math.max(0.005, c.density)));
      if (Math.abs(this.camera.far - far) > 1) {
        this.camera.far = far;
        this.camera.updateProjectionMatrix();
      }
    }
  }
}
