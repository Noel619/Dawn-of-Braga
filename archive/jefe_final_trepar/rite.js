// El rito de la cisterna: el arzobispo, vencido.
//
// Primero se pelea con él en la cisterna (el Turiferario de cuatro metros y
// medio, con su incensario: enemies.js). Cuando le quitas la vida no muere:
// cae de rodillas ante el altar del Dios Desconocido y empieza esto. Fundido
// a negro y, de rodillas frente al jugador, jadea, alza la cabeza, se
// incorpora con lo que le queda y alza el incensario; la sangre del suelo de
// la cisterna hierve, la carne del dios brota entre las losas, le sube por las
// piernas y le envuelve, y le arrastra hacia arriba a través de la cúpula.
// Temblor, polvo, fundido a negro: «Arriba, la ciudad tiembla. Las campanas
// de la Sé tocan solas.» Los escombros de la cúpula ciegan la reja del río
// (ver el grupo 'riteRubble' en level_sacred.js).
//
//  1. Por encima del hombro del jugador: de rodillas, vencido, jadea.
//  2. De frente y desde abajo: se incorpora y alza el incensario.
//  3. Plano abierto: la sangre hierve y la carne le sube por el cuerpo.
//  4. Desde abajo: la carne le arrastra hacia la cúpula y la revienta.
// Se puede saltar con «interactuar».
import * as THREE from 'three';
import { Debris } from './debris.js';
import { clamp } from '../../core/util.js';

const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const seg = (t, a, b) => sm((t - a) / (b - a));
const lin = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const lerp = (a, b, k) => a + (b - a) * k;
const rnd = (a, b) => a + Math.random() * (b - a);

const AY = -10; // el suelo de la cisterna
const TOP = -7; // la puerta del sello, en lo alto de la escalera
const CZ = -152; // el centro de la cúpula
const DOME = 4.0; // su clave
// donde reza: ante el altar, de espaldas a la entrada
export const RITE_SPOT = { x: 0, z: -157.6, yaw: Math.PI };
// al pie de la escalera, donde se queda el jugador
const STAND_Z = -142.6;

// Guion (segundos)
const T_DARK = 0.7; // fundido a negro tras el último golpe
const T_IN = 1.0; // vuelve la imagen (ya colocados)
const T1 = 4.0; // fin del plano por encima del hombro
const T2 = 6.6; // fin del plano de frente
const T_LOOK = 2.0; // alza la cabeza
const T_RISE = 2.6; // se incorpora
const T_RAISE = 4.1; // alza el incensario
const T_BOIL = 5.4; // la sangre hierve
const T_GROW = [6.0, 8.8]; // la carne le sube por el cuerpo
const T_LIFT = [9.2, 11.9]; // le arrastra hacia la cúpula
const T_BREAK = 11.6; // la revienta
const T_FADE = 12.0;
const T_END = 13.2;
// dónde queda el jugador, frente a él
const FACE = { x: 0.7, z: RITE_SPOT.z + 6.4 };

// La carne del dios: tentáculos que brotan del suelo alrededor del arzobispo
// y le suben, enroscándose, hasta el pecho (crecen con el rango de dibujo).
function buildTendrils() {
  const grp = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x4a130f, emissive: 0x120302 });
  const list = [];
  const SEG = 44,
    RAD = 7;
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2 + rnd(-0.2, 0.2);
    const r0 = rnd(2.4, 3.8);
    const turn = (i % 2 ? 1 : -1) * rnd(1.4, 2.1);
    const h = rnd(3.0, 3.9);
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const u = k / 8;
      const a = a0 + turn * u;
      const r = lerp(r0, 0.62 + 0.12 * Math.sin(u * 6 + i), Math.min(1, u * 1.7));
      pts.push(new THREE.Vector3(Math.cos(a) * r, k === 0 ? -0.25 : u * h, Math.sin(a) * r));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, SEG, 1, RAD, false);
    // grueso en la raíz, fino en la punta
    const P = geo.attributes.position;
    const c = new THREE.Vector3(),
      v = new THREE.Vector3();
    for (let j = 0; j <= SEG; j++) {
      const u = j / SEG;
      curve.getPointAt(u, c);
      const r = lerp(0.42, 0.09, Math.pow(u, 0.8)) * (1 + 0.18 * Math.sin(u * 23 + i));
      for (let q = 0; q <= RAD; q++) {
        const idx = j * (RAD + 1) + q;
        v.fromBufferAttribute(P, idx).sub(c).multiplyScalar(r).add(c);
        P.setXYZ(idx, v.x, v.y, v.z);
      }
    }
    geo.computeVertexNormals();
    geo.setDrawRange(0, 0);
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false;
    grp.add(m);
    list.push({ geo, per: RAD * 6, segs: SEG, delay: rnd(0, 0.9), speed: rnd(0.85, 1.2) });
  }
  return { grp, list, mat };
}

export class RiteCutscene {
  // from: el arzobispo que acaba de caer vencido (o null: el modo de pruebas
  // lo pone de rodillas ante el altar)
  constructor(game, from = null) {
    this.g = game;
    this.rite = true;
    this.t = 0;
    this.cues = new Set();
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.boilT = 0;
    this.from = from;
  }

  start() {
    const g = this.g,
      p = g.player;
    this.boss = this.from || g.bosses.turibulario || null;
    p.state = 'cine';
    p.vx = p.vz = 0;
    p.blocking = false;
    p.autoDir = null;
    g.lockTarget = null;
    g.activeBoss = null;
    g.ui.showHud(false);
    g.audio.stopMusic();
    g.audio.play('dread');
    this.home = new THREE.Vector3(RITE_SPOT.x, AY, RITE_SPOT.z);
    this.tend = buildTendrils();
    this.tend.grp.position.copy(this.home);
    this.tend.grp.visible = false;
    g.scene.add(this.tend.grp);
    this.debris = new Debris(g.scene, 70, { color: 0x7e7c74 });
    this.light = g.fx.lights.add({ x: RITE_SPOT.x, y: AY + 1.4, z: RITE_SPOT.z + 2, color: 0xff3412, intensity: 0, range: 18, flicker: 1, priority: 9, on: true });
    // (sin pelea, desde el modo de pruebas: ya colocados)
    if (!this.from) this.place();
    else g.fadeTarget = 0;
    this.apply(0);
  }
  // Bajo el fundido: el arzobispo de rodillas ante el altar, de cara al
  // jugador, y el jugador frente a él.
  place() {
    const g = this.g,
      p = g.player,
      e = this.boss;
    this.placed = true;
    if (e) {
      e.scripted = true;
      e.dead = false;
      e.state = 'bossIdle';
      e.atk = null;
      e.data.censerTarget = null;
      e.pos.set(RITE_SPOT.x, AY, RITE_SPOT.z);
      if (e.body) e.body.pos.set(RITE_SPOT.x, AY, RITE_SPOT.z);
      e.yaw = 0;
      e.obj.visible = true;
      e.anim.stop(0.01);
      if (e.T.onReset) e.T.onReset(e);
      // (el incensario, en el suelo junto a él, alumbra menos: no le quema)
      e.data.lightK = 0.32;
      this.showCenser(true);
    }
    p.spawn(FACE.x, AY, FACE.z, Math.PI);
    p.state = 'cine';
    this.tend.grp.visible = true;
    g.combat.clear();
  }

  // Un suceso del guion, una sola vez.
  cue(name, at) {
    if (this.t < at || this.cues.has(name)) return false;
    this.cues.add(name);
    return true;
  }

  // Salta al final (botón de interactuar).
  skip() {
    if (this.t < T_END - 1) {
      this.t = T_END - 0.05;
      this.skipped = true;
    }
  }

  update(dt) {
    this.t += dt;
    this.apply(dt);
    return this.t < T_END;
  }

  // el incensario, su cadena y sus velas (van sueltos por la escena)
  showCenser(on) {
    const e = this.boss,
      c = e && e.P.censer;
    if (!c) return;
    c.grp.visible = on;
    for (const l of c.links) l.visible = on;
    for (const s of c.candles) s.visible = on;
    if (!on && c.light) c.light.intensity = 0;
  }

  apply(dt) {
    const g = this.g;
    const t = this.t;
    const p = g.player;
    const a = g.audio;
    const U = g.post.U;
    const e = this.boss;
    // franjas negras y viñeta
    const bars = t < T_END - 0.6 ? sm(t / 0.8) : 1 - sm((t - (T_END - 0.6)) / 0.5);
    U.uBars.value = 0.115 * bars;
    U.uVignette.value = 1.25 + 0.9 * bars;

    // --- tras el último golpe, a negro; bajo el fundido se colocan
    if (!this.placed && t >= T_DARK) this.place();
    if (this.cue('fadeIn', T_IN)) g.fadeTarget = 1;
    if (p.state !== 'cine' && !p.dead) p.state = 'cine';

    // --- el arzobispo
    const lift = Math.pow(lin(t, T_LIFT[0], T_LIFT[1]), 1.7);
    const liftY = lift * (DOME - AY + 3);
    if (e && !this.cues.has('gone') && this.placed) {
      if (this.cue('look', T_LOOK)) a.enemyVoice(e, 'hurt');
      if (this.cue('rise', T_RISE)) {
        e.state = 'alert';
        e.anim.play(e.T.clips.intro, { blend: 0.05 });
      }
      if (this.cue('raise', T_RAISE)) {
        e.state = 'attack';
        e.atk = null;
        e.anim.play(e.T.clips.volley, { blend: 0.25 });
      }
      if (this.cue('struggle', T_GROW[0] + 0.9)) e.anim.play(e.T.clips.roar, { blend: 0.2 });
      if (this.cue('struggle2', T_GROW[0] + 3.3)) e.anim.play(e.T.clips.roar, { blend: 0.3 });
      // (de cara al jugador)
      e.yaw = 0;
      // apresado, se revuelve; arrastrado, sube dando tumbos
      const grip = lin(t, T_GROW[0] + 0.8, T_GROW[1]);
      const sx = Math.sin(t * 17) * 0.06 * grip + Math.sin(t * 5.3) * 0.25 * lift;
      e.pos.set(this.home.x + sx, AY + liftY, this.home.z + Math.cos(t * 4.1) * 0.2 * lift);
      e.obj.rotation.z = Math.sin(t * 6.3) * 0.08 * (grip + lift);
      // el incensario: en alto mientras lo alza; luego cuelga y se balancea
      if (t > T_RAISE + 0.4 && t < T_GROW[0] + 0.7) {
        e.data.censerTarget = new THREE.Vector3(e.pos.x, e.pos.y + 6.2, e.pos.z + 0.4);
        e.data.censerPull = 8;
      } else e.data.censerTarget = null;
      e.animate(dt);
      // (la física del incensario va en el update del tipo; en 'attack' no le
      // quita el objetivo)
      if (e.T.update) {
        const st = e.state;
        e.state = 'attack';
        e.T.update(e, dt, p);
        e.state = st;
      }
      // atraviesa la cúpula
      if (t > T_BREAK + 0.25 && this.cue('gone', T_BREAK + 0.25)) {
        e.obj.visible = false;
        e.shadow.visible = false;
        this.showCenser(false);
      }
    }

    // (vencido, antes del fundido: de rodillas donde cayó)
    if (e && !this.placed) {
      e.vx = e.vz = 0;
      e.animate(dt);
    }

    // --- la carne del dios: brota, le sube por el cuerpo, se estira con él
    const T = this.tend;
    for (const q of T.list) {
      const u = clamp(((t - T_GROW[0] - q.delay) / (T_GROW[1] - T_GROW[0])) * q.speed, 0, 1);
      q.geo.setDrawRange(0, Math.floor(sm(u) * q.segs) * q.per);
    }
    const st = 1 + liftY / 3.6;
    T.grp.scale.set(1 / Math.sqrt(st), st, 1 / Math.sqrt(st));
    // (late, como si tuviera pulso)
    T.mat.emissive.setRGB(0.05 + 0.03 * Math.sin(t * 9), 0.008, 0.006);

    // --- la sangre hierve
    if (t > T_BOIL) {
      const k = Math.min(1, (t - T_BOIL) / 1.4) * (t > T_FADE ? 0.4 : 1);
      this.boilT -= dt;
      let n = 0;
      while (this.boilT <= 0 && n++ < 40) {
        this.boilT += 0.016 / Math.max(0.05, k);
        const x = rnd(-11, 11),
          z = rnd(-164, -141);
        g.fx.blood.emit(x, AY + 0.06, z, 2, { color: [0.45, 0.05, 0.04], speed: 1.2, life: 0.5, up: 2.4 });
      }
      // vapor alrededor de él
      if (Math.random() < dt * 14 * k) g.fx.blood.emit(this.home.x + rnd(-3, 3), AY + 0.3, this.home.z + rnd(-3, 3), 3, { color: [0.5, 0.42, 0.4], speed: 0.6, life: 1.6, up: 1.2, gravity: -1.5 });
    }
    // la luz roja que sube del suelo
    if (this.light) {
      const k = t < T_BOIL ? 0 : Math.min(1, (t - T_BOIL) / 1.2) * (t > T_FADE ? 1 - lin(t, T_FADE, T_END) : 1);
      this.light.intensity = 26 * k * (0.8 + 0.2 * Math.sin(t * 13));
      this.light.y = AY + 1.4 + liftY * 0.6;
    }
    // temblores
    if (t > T_BOIL && t < T_END) g.camRig.shake(dt * (t > T_LIFT[0] ? 1.1 : 0.45));

    // --- la cúpula revienta
    if (this.cue('break', T_BREAK)) {
      const at = new THREE.Vector3(0, DOME - 0.6, CZ);
      this.debris.burst(at, 46, { speed: 5, up: 1, size: 1.3, spread: 2.6 });
      g.fx.blood.emit(at.x, at.y, at.z, 120, { color: [0.42, 0.4, 0.37], speed: 7, life: 2.4, up: -1 });
      g.fx.blood.emit(at.x, at.y + 1, at.z, 50, { speed: 6, life: 1.4, up: 2 });
      // (la corona de velas se viene abajo; queda el agujero de la clave)
      g.setGroupVisible('cisternCrown', false);
      g.setGroupVisible('riteRubble', true);
      g.flash = Math.max(g.flash, 0.4);
      g.flashTint = [1, 0.7, 0.5];
      g.camRig.shake(1);
      g.input.rumble(1, 1, 900);
    }
    if (t > T_BREAK && t < T_END && Math.random() < dt * 10) g.fx.blood.emit(rnd(-4, 4), DOME - 1, CZ + rnd(-4, 4), 6, { color: [0.42, 0.4, 0.37], speed: 1, life: 2, up: -2 });
    this.debris.update(dt, () => AY);
    if (this.cue('fade', T_FADE)) g.fadeTarget = 0;

    // --- cámara
    let fov = 56;
    let cam = true;
    if (t < T_IN) {
      // (el fundido a negro, con la cámara del juego)
      cam = false;
    } else if (t < T1) {
      // por encima del hombro del jugador: de rodillas, vencido, jadea
      const u = seg(t, T_IN, T1);
      this.pos.set(FACE.x + lerp(1.25, 1.05, u), AY + lerp(2.35, 2.15, u), FACE.z + lerp(3.4, 2.8, u));
      this.look.set(RITE_SPOT.x - 0.3, AY + lerp(1.8, 2.3, u), RITE_SPOT.z);
      fov = lerp(50, 44, u);
    } else if (t < T2) {
      // de frente y desde abajo: se incorpora y alza el incensario
      const u = seg(t, T1, T2);
      this.pos.set(lerp(-2.8, -2.4, u), AY + lerp(0.9, 1.1, u), RITE_SPOT.z + lerp(5.0, 4.6, u));
      this.look.set(RITE_SPOT.x, AY + lerp(2.8, 4.8, u), RITE_SPOT.z);
      fov = 58;
    } else if (t < T_LIFT[0]) {
      // plano abierto: la sangre hierve y la carne le sube por el cuerpo
      const u = seg(t, T2, T_LIFT[0]);
      this.pos.set(lerp(-8.6, -7.8, u), AY + lerp(3.2, 2.6, u), lerp(-149.0, -149.8, u));
      this.look.set(RITE_SPOT.x, AY + lerp(1.6, 2.6, u), RITE_SPOT.z);
      fov = lerp(60, 54, u);
    } else {
      // desde abajo: le arrastra hacia la cúpula y la atraviesa
      const u = seg(t, T_LIFT[0], T_END);
      this.pos.set(lerp(4.2, 3.8, u), AY + lerp(1.2, 0.9, u), lerp(-147.2, -146.6, u));
      const ly = e && e.obj.visible ? e.pos.y + 2.2 : DOME - 0.5;
      this.look.set(RITE_SPOT.x * 0.6, Math.min(DOME, ly), lerp(RITE_SPOT.z, CZ, u));
      fov = lerp(64, 70, u);
    }
    if (cam && t < T_END - 0.05) g.camRig.override = { pos: this.pos, look: this.look, fov, snap: true };

    // --- sonido
    const BP = { x: RITE_SPOT.x, y: AY + 2.4, z: RITE_SPOT.z };
    if (this.cue('toll', T_IN + 0.2)) a.play('bellToll', { x: 0, y: 4, z: -150 }, { k: 0.6 });
    if (this.cue('pray', T_IN + 0.5) && e) a.enemyVoice(e, 'idle');
    if (this.cue('creak', T_RISE + 0.3)) a.play('stoneCreak', BP, { k: 0.7 });
    if (this.cue('call', T_RAISE + 0.7) && e) a.enemyVoice(e, 'alert');
    if (this.cue('boil', T_BOIL)) {
      a.play('burn', BP, { k: 1.4 });
      a.play('drip', { x: 3, y: AY + 1, z: CZ });
    }
    if (this.cue('flesh', T_GROW[0] + 0.2)) a.play('fleshTear', BP, { k: 1.2 });
    if (this.cue('flesh2', T_GROW[0] + 1.6)) a.play('fleshTear', BP, { k: 1.5 });
    if (this.cue('scream', T_GROW[0] + 1.0)) a.play('rageScream', BP, { k: 0.9 });
    if (this.cue('god', T_LIFT[0] - 0.2)) {
      a.play('beastRoarBig', { x: 0, y: 0, z: CZ }, { k: 1.2 });
      a.play('stoneCreak', { x: 0, y: DOME, z: CZ }, { k: 1.6 });
    }
    if (this.cue('crash', T_BREAK)) {
      a.play('wallBreak', { x: 0, y: DOME, z: CZ }, { k: 2 });
      a.play('explosion', { x: 0, y: DOME, z: CZ }, { k: 1.1 });
      a.play('pillarBreak', { x: 0, y: DOME, z: CZ }, { k: 1.4 });
    }
    if (this.cue('bells', T_FADE + 0.3)) a.play('bellToll', null, { k: 0.8 });
  }

  // Al acabar (o al saltarla): el arzobispo ya no está, la cúpula reventada,
  // la reja del río cegada; fundido a negro, el letrero y de vuelta a jugar.
  end() {
    const g = this.g,
      p = g.player;
    const e = this.boss;
    if (e) {
      e.dead = true;
      e.state = 'dead';
      e.stT = 99;
      e.obj.visible = false;
      e.shadow.visible = false;
      e.obj.rotation.z = 0;
      this.showCenser(false);
    }
    g.bossLight.intensity = 0;
    if (e) e.data.lightK = 1;
    if (this.tend) {
      g.scene.remove(this.tend.grp);
      for (const q of this.tend.list) q.geo.dispose();
      this.tend.mat.dispose();
    }
    if (this.debris) {
      this.debris.clear();
      g.scene.remove(this.debris.mesh);
    }
    if (this.light) this.light.on = false;
    g.setGroupVisible('cisternCrown', false);
    g.setGroupVisible('riteRubble', true);
    p.autoDir = null;
    // (al pie de la escalera, de cara a la subida)
    p.spawn(0, AY, STAND_Z, 0);
    p.state = 'free';
    g.post.U.uBars.value = 0;
    g.post.U.uVignette.value = 1.25;
    g.camRig.override = null;
    g.camRig.snapTo(p);
    g.camRig.yaw = 0;
    g.camRig.pitch = 0.15;
    g.flags['finale:rite'] = true;
    // la niebla del sello ya no está
    for (const it of g.interact.list) if (it.kind === 'fog' && it.boss === 'turibulario') g.interact.clearFog(it);
    g.finale.applyFlags();
    g.saveGame();
    // (cortada por el modo de pruebas: sin letrero)
    if (this.silent) return;
    g.fade = 0;
    g.fadeTarget = 0;
    g.story(['Arriba, la ciudad tiembla.', 'Las campanas de la Sé tocan solas.'], () => {
      g.fadeTarget = 1;
      g.ui.showHud(true);
      g.say('Los escombros de la cúpula ciegan la reja del río. Arriba, en la Sé, tocan las campanas.');
    });
  }
}
