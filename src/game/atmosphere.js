// Atmósfera por zona: niebla, luz ambiente, luna, ceniza, gradación de color.
import * as THREE from 'three';
import { damp } from '../core/util.js';
import { G } from '../gfx/materials.js';

export const ATMO = {
  city: { fog: 0x5c625e, density: 0.042, sky: 0x9aa6b2, ground: 0x2c2723, hemi: 2.2, moon: 0.9, vol: 0.038, ash: 1, exposure: 1.0, sat: 0.7, lamp: 9, bloom: 0.9 },
  // la fortaleza (su patio de honor, sus jardines): el aire más limpio, por
  // encima del humo de la ciudad; las siluetas se leen a sesenta metros. (Lo
  // de más allá de cien, la niebla ya se lo ha comido —queda menos del 2 %—:
  // no se dibuja. Con el plano lejano de la niebla, a 130, desde el jardín o
  // los adarves se dibujaba media ciudad.)
  // (hf: la niebla de altura —materials.js, uHFog—: de y0 a y1 la densidad
  // baja hasta la fracción k; la torre del homenaje y las de las esquinas
  // asoman sobre la bruma. El plano lejano, el de siempre: a 140-150 m los
  // patios costaban más que la plaza del Pan, y desde el patio de armas la
  // torre la tapa el cuerpo de la puerta)
  castillo: { fog: 0x56606a, density: 0.02, sky: 0x95a3b4, ground: 0x2c2723, hemi: 2.25, moon: 1.15, vol: 0.022, ash: 0.5, exposure: 1.02, sat: 0.68, lamp: 9, bloom: 0.95, far: 100, hf: [9, 24, 0.3] },
  // el patio de armas: el aire de la fortaleza, que se ve entera desde él
  // (PLAN_FORTALEZA.md, §3), algo más cargado de ceniza; suena como la
  // ciudad (core/audio.js)
  armas: { fog: 0x585f64, density: 0.022, sky: 0x96a4b2, ground: 0x2c2723, hemi: 2.22, moon: 1.05, vol: 0.026, ash: 0.75, exposure: 1.01, sat: 0.69, lamp: 9, bloom: 0.93, far: 100, hf: [9, 24, 0.3] },
  // lo alto de la torre del homenaje: por encima del humo, la noche clara y
  // la luna grande sobre la fortaleza (moonDisc: el disco en el cielo)
  luna: { fog: 0x4d5563, density: 0.026, sky: 0x95a5bc, ground: 0x2c2723, hemi: 2.3, moon: 1.8, moonPos: [25, 16, -54], moonColor: 0xaebfdc, vol: 0.016, ash: 0.45, exposure: 1.05, sat: 0.72, lamp: 9, bloom: 1.0, moonDisc: 1 },
  // el gran salón: un interior (suena como una nave)
  sala: { fog: 0x16110e, density: 0.045, sky: 0x8a8278, ground: 0x2a221c, hemi: 1.3, moon: 0.05, vol: 0, ash: 0, exposure: 1.15, sat: 0.8, lamp: 10, bloom: 1.05 },
  prison: { fog: 0x100d0b, density: 0.06, sky: 0x8a8278, ground: 0x2a221c, hemi: 1.1, moon: 0, vol: 0, ash: 0, exposure: 1.2, sat: 0.8, lamp: 10, bloom: 1.0 },
  interior: { fog: 0x15110e, density: 0.055, sky: 0x8a8278, ground: 0x2a221c, hemi: 1.2, moon: 0.05, vol: 0, ash: 0, exposure: 1.15, sat: 0.8, lamp: 10, bloom: 1.0 },
  chapel: { fog: 0x1b1411, density: 0.045, sky: 0x9a8a80, ground: 0x2a2018, hemi: 1.4, moon: 0.05, vol: 0, ash: 0, exposure: 1.15, sat: 0.85, lamp: 9, bloom: 1.1 },
  cathedral: { fog: 0x241a1c, density: 0.03, sky: 0x8a7a80, ground: 0x2a1e1e, hemi: 1.6, moon: 0.15, vol: 0.03, ash: 0.12, exposure: 1.1, sat: 0.8, lamp: 10, bloom: 1.2 },
  ramparts: { fog: 0x666d6a, density: 0.036, sky: 0xa6b2bc, ground: 0x2c2723, hemi: 2.4, moon: 1.1, vol: 0.048, ash: 1.4, exposure: 1.0, sat: 0.68, lamp: 8, bloom: 0.9 },
  crypt: { fog: 0x070809, density: 0.065, sky: 0x5a5e66, ground: 0x1a1612, hemi: 0.75, moon: 0, vol: 0, ash: 0, exposure: 1.25, sat: 0.8, lamp: 12, bloom: 1.1 },
  // el círculo de la cisterna: rojo hondo y poca luz de relleno (la estatua
  // del fondo se recorta, negra, contra el resplandor que tiene detrás)
  arena: { fog: 0x15060a, density: 0.026, sky: 0x5c2e34, ground: 0x1c0a0a, hemi: 0.8, moon: 0, vol: 0.012, ash: 0, exposure: 1.25, sat: 0.9, lamp: 11, bloom: 1.3 },
  // el pasillo de las columnas de la cisterna: hondo y a oscuras (la niebla,
  // fina: se ve lejos, hasta el rojo del círculo del fondo)
  colonnade: { fog: 0x0e0607, density: 0.024, sky: 0x5a3c3e, ground: 0x160c0a, hemi: 0.8, moon: 0, vol: 0.015, ash: 0, exposure: 1.25, sat: 0.85, lamp: 11.5, bloom: 1.25 },
  // la bodega del canónigo: casi a oscuras, sólo el farol y las velas del altar
  cellar: { fog: 0x050404, density: 0.078, sky: 0x403c3a, ground: 0x12100e, hemi: 0.4, moon: 0, vol: 0, ash: 0, exposure: 1.2, sat: 0.76, lamp: 11.5, bloom: 1.15 },
  // la antesala del Dios Ignoto: honda, roja, con el aire espeso de incienso
  sanctum: { fog: 0x1c0807, density: 0.024, sky: 0x6a3a3a, ground: 0x1e0c0a, hemi: 0.95, moon: 0, vol: 0.02, ash: 0.15, exposure: 1.25, sat: 0.9, lamp: 11, bloom: 1.35 },
  // la gruta de Leonor: niebla de pus, amarillenta, y el brillo de los charcos
  // la cloaca: la galería, a oscuras, húmeda y verdosa; la sala de la luz,
  // con la niebla más clara y fría, y la luna que se ve por el agujero de la
  // casa quemada (casi encima: moonPos)
  cloaca: { fog: 0x080b0a, density: 0.062, sky: 0x46524e, ground: 0x121612, hemi: 0.6, moon: 0, vol: 0, ash: 0, exposure: 1.25, sat: 0.82, lamp: 11.5, bloom: 1.15 },
  cloaca_luz: { fog: 0x111a22, density: 0.03, sky: 0x6a7c94, ground: 0x18201a, hemi: 1.35, moon: 0, moonPos: [0.6, 60, -0.4], moonColor: 0xd2e0f6, moonDisc: 1, vol: 0.018, ash: 0, exposure: 1.32, sat: 0.95, lamp: 9.5, bloom: 1.4 },
  // el Vergel (world/vergel.js): la gruta llena de vida bajo el huerto seco;
  // la luna, casi encima, por la sima; más verde y más saturada que la sala
  // de la luz. Lo oscuro: el paso del nordeste, hacia las catacumbas, casi
  // negro y con la niebla espesa
  vergel: { fog: 0x14231f, density: 0.017, sky: 0x5f7c72, ground: 0x1a2618, hemi: 1.35, moon: 0, moonPos: [0.15, 60, -0.1], moonColor: 0xd2e0f6, moonDisc: 1, vol: 0.02, ash: 0, exposure: 1.34, sat: 1.04, lamp: 9.5, bloom: 1.45 },
  oscuro: { fog: 0x020303, density: 0.12, sky: 0x141818, ground: 0x050605, hemi: 0.32, moon: 0, vol: 0, ash: 0, exposure: 1.18, sat: 0.7, lamp: 12, bloom: 1.0 },
  // las cloacas hondas (world/cloacas_hondas.js): la lobera, a oscuras y
  // fría (el farol y los braseros son la luz: game/lobishome.js); las viejas,
  // pardas; los aljibes, verdosos del agua; lo hondo, todo el verde que da
  // luz, con la niebla clara y la saturación alta
  lobera: { fog: 0x030405, density: 0.085, sky: 0x1c2026, ground: 0x07080a, hemi: 0.4, moon: 0, vol: 0, ash: 0, exposure: 1.2, sat: 0.72, lamp: 12.5, bloom: 1.1 },
  viejas: { fog: 0x070605, density: 0.072, sky: 0x302c28, ground: 0x0d0b09, hemi: 0.46, moon: 0, vol: 0, ash: 0, exposure: 1.22, sat: 0.78, lamp: 12, bloom: 1.05 },
  aljibes: { fog: 0x06100e, density: 0.055, sky: 0x34504a, ground: 0x0a1210, hemi: 0.62, moon: 0, vol: 0.01, ash: 0, exposure: 1.25, sat: 0.86, lamp: 11.5, bloom: 1.25 },
  hondo: { fog: 0x0a1c18, density: 0.03, sky: 0x40806e, ground: 0x0e2018, hemi: 1.05, moon: 0, vol: 0.02, ash: 0, exposure: 1.32, sat: 1.12, lamp: 10, bloom: 1.6 },
  // el Sumidero (world/sumidero.js): la caverna del lago, negra y fría; la
  // niebla, fina (se adivina la otra orilla en lo poco que alumbran la luna
  // del sumidero y lo verde del fondo) y una bruma baja sobre el agua. El
  // venero, la cueva bajo el agua, verde del musgo que da luz
  // (el plano lejano, el de la caverna: lo de más allá —la lobera encima, lo
  // hondo— no se ve desde dentro y no se dibuja)
  sumidero: { fog: 0x03060a, density: 0.034, sky: 0x1e2a34, ground: 0x050708, hemi: 0.55, moon: 0, vol: 0.016, ash: 0, exposure: 1.26, sat: 0.84, lamp: 12, bloom: 1.25, far: 62 },
  venero: { fog: 0x03100e, density: 0.05, sky: 0x2c5a50, ground: 0x061210, hemi: 0.7, moon: 0, vol: 0, ash: 0, exposure: 1.28, sat: 1.0, lamp: 11, bloom: 1.45, far: 40 },
  lair: { fog: 0x0c0d05, density: 0.07, sky: 0x4c5030, ground: 0x15150a, hemi: 0.55, moon: 0, vol: 0, ash: 0, exposure: 1.25, sat: 0.85, lamp: 11.5, bloom: 1.25 },
  tunnel: { fog: 0x09090b, density: 0.06, sky: 0x5a5e66, ground: 0x1a1612, hemi: 0.7, moon: 0, vol: 0, ash: 0, exposure: 1.25, sat: 0.8, lamp: 12, bloom: 1.0 },
  dawn: { fog: 0xc8a08a, density: 0.012, sky: 0xffd6b8, ground: 0x5a4a3a, hemi: 2.6, moon: 3.2, moonColor: 0xffa860, vol: 0.03, ash: 0, exposure: 1.05, sat: 0.95, lamp: 1, bloom: 1.1 },
};

const tmpC = new THREE.Color();
const HF0 = [9, 24, 1];

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
      this.cur.hfv = [...(this.target.hf || HF0)];
      this.fogC.set(this.target.fog);
      this.skyC.set(this.target.sky);
      this.groundC.set(this.target.ground);
      this.moonC.set(this.target.moonColor ?? 0x9fb2cc);
    }
  }
  update(dt, player) {
    const T = this.override ? { ...this.target, ...this.override } : this.target;
    const k = 1.6;
    // (un corte de plano: la niebla y la luz cambian de golpe)
    if (this.override && this.override.snap) {
      this.override.snap = false;
      for (const key of ['density', 'hemi', 'moon', 'vol', 'ash', 'exposure', 'sat', 'lamp', 'bloom']) this.cur[key] = T[key];
      this.cur.hfv = [...(T.hf || HF0)];
      this.fogC.set(T.fog);
      this.skyC.set(T.sky);
      if (T.moonPos) this.moon.position.set(...T.moonPos);
    }
    for (const key of ['density', 'hemi', 'moon', 'vol', 'ash', 'exposure', 'sat', 'lamp', 'bloom']) this.cur[key] = damp(this.cur[key], T[key], k, dt);
    // (la niebla de altura: sin ella, densidad arriba 1)
    const hf = T.hf || HF0;
    const ch = this.cur.hfv || (this.cur.hfv = [...hf]);
    for (let i = 0; i < 3; i++) ch[i] = damp(ch[i], hf[i], k, dt);
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
    U.uSkyGlow.value = this.name === 'dawn' ? 0 : this.name === 'city' || this.name === 'castillo' || this.name === 'armas' || this.name === 'ramparts' || this.name === 'luna' ? 1 : 0;
    U.uMoonK.value = damp(U.uMoonK.value, T.moonDisc || 0, 1.5, dt);
    U.uMoonDir.value.copy(this.moon.position).normalize();
    U.uSun.value = damp(U.uSun.value, this.name === 'dawn' ? 1 : 0, 1, dt);
    // luz del amanecer: rasante desde el norte
    // (la película del jefe final puede mover la luna: de contraluz)
    const mp = T.moonPos || (this.name === 'dawn' ? [18, 14, -80] : [-30, 60, 20]);
    const mk = T.moonPos ? 6 : 1;
    this.moon.position.x = damp(this.moon.position.x, mp[0], mk, dt);
    this.moon.position.y = damp(this.moon.position.y, mp[1], mk, dt);
    this.moon.position.z = damp(this.moon.position.z, mp[2], mk, dt);
    U.uExposure.value = c.exposure;
    U.uSat.value = c.sat;
    U.uBloom.value = c.bloom;
    U.uBrightness.value = this.brightness;
    U.uVolY.value = player ? player.pos.y : 0;
    if (this.fx && this.fx.ash) this.fx.ash.mat.uniforms.uAmount.value = c.ash;
    if (player) player.lampBase = c.lamp;
    // el plano lejano se ajusta a la niebla: lo que la niebla oculta no se dibuja
    if (this.camera) {
      // (el jefe final puede pedir más: Deo Ignoto mide noventa metros)
      // (con niebla de altura, lo alto asoma más lejos: el plano lejano, el
      // de la atmósfera)
      // (farCap: bajo el agua no se ve más allá de unos metros: game/nado.js)
      const far = Math.min(T.far || 170, this.farCap || 1e9, Math.max(46, (c.hfv[2] < 0.99 ? 3.4 : 2.6) / Math.max(0.005, c.density)));
      if (Math.abs(this.camera.far - far) > 1) {
        this.camera.far = far;
        this.camera.updateProjectionMatrix();
      }
      G.uHFog.value.set(c.hfv[0], c.hfv[1], c.hfv[2], this.camera.far);
    }
  }
}
