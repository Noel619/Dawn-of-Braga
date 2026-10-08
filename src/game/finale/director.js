// El jefe final: el guion, de la cisterna al río.
//
//   off      todavía no (no se ha visto el rito de la cisterna)
//   wait     visto el rito: el Turiferario espera bajo el atrio (o, si ya
//            salió y has muerto, de pie en la plaza)
//   intro    sale del empedrado (o se vuelve y ruge, si ya había salido)
//   tur      la pelea en la plaza
//   burst    revienta: la campana cae tañendo
//   rise     la nave estalla y se alza Deo Ignoto
//   deoWait  la segunda pelea, pendiente (la nave en ruinas; tras morir, o al
//            cargar la partida: el dios espera y vuelve a empezar)
//   deoIntro ruge (al volver a empezar)
//   deo      la pelea contra el dios
//   end      muerto el dios: se hunde y se abre el camino al río
//   done     todo terminado
//
// Banderas: finale:rite (visto el rito), finale:turSeen (ya ha salido del
// suelo una vez), boss:turiferario (fase 1 ganada) y boss:turibulario (la de
// siempre: muerto el dios, se abre la reja del río).
import * as THREE from 'three';
import { Climb } from './climb.js';
import { TurBoss, TUR_HOME } from './turiferario_boss.js';
import { DeoBoss } from './deo_boss.js';
import { Debris } from './debris.js';
import { Wrecks } from './wrecks.js';

const _v = new THREE.Vector3();
const DOOR = { x: 0, z: -60.4 };
// la plaza durante la pelea: los escombros cierran las salidas
const ARENA = { x0: -17.4, z0: -59.6, x1: 21.4, z1: -40.6 };
const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

export class Finale {
  constructor(game) {
    this.g = game;
    this.climb = new Climb(game);
    this.debris = new Debris(game.scene);
    this._ground = (x, z) => game.world.col.groundHeight(x, z, 0.1, 2);
    this.tur = null;
    this.deo = null;
    this.stage = 'off';
    this.decals = [];
    this.t = 0;
    this._placed = false;
  }
  // la ciudad que se rompe (se crea al primer uso: el nivel ya está hecho)
  get wrecks() {
    return this._wrecks || (this._wrecks = new Wrecks(this.g));
  }
  get fighting() {
    return this.stage === 'tur' || this.stage === 'intro' || this.stage === 'deo' || this.stage === 'deoIntro' || this.stage === 'rise';
  }
  get boss() {
    return this.stage === 'deo' || this.stage === 'deoIntro' || this.stage === 'rise' ? this.deo : this.tur;
  }

  // ---------------------------------------------------------- modelos
  // El Turiferario montado (los colosos se generan al cargar el juego, en un
  // hilo de fondo: a estas alturas ya están).
  ensureTur() {
    if (this.tur) return Promise.resolve(this.tur);
    if (!this._turP)
      this._turP = this.g.colossi.model('turiferario').then((M) => {
        const t = new TurBoss(this.g, M);
        t.onBurst = () => this.onTurBurst();
        t.onPhase = (ph) => this.onTurPhase(ph);
        t.onAwake = () => {};
        t.onDying = () => this.onTurDying();
        this.tur = t;
        if (!this.climb.boss) this.climb.boss = t;
        return t;
      });
    return this._turP;
  }
  ensureDeo() {
    if (this.deo) return Promise.resolve(this.deo);
    if (!this._deoP)
      this._deoP = this.g.colossi.model('deo').then((M) => {
        const d = new DeoBoss(this.g, M);
        d.onRisen = () => {};
        d.onPhase = (ph) => this.onDeoPhase(ph);
        d.onBow = () => this.startBow();
        d.onFacade = () => this.collapseFacade();
        d.onDying = () => this.onDeoDying();
        d.onDead = () => this.onDeoDead();
        this.deo = d;
        return d;
      });
    return this._deoP;
  }

  // ---------------------------------------------------------- banderas
  // la nave entera o en ruinas (según haya reventado ya)
  setNaveRuined(on) {
    const g = this.g;
    g.setGroupVisible('naveRoof', !on);
    g.setGroupVisible('naveRuin', on);
  }
  // la fachada de la Sé entera o reventada (por Deo al desplomarse; muerto el
  // dios se queda así). La puerta se va con ella: queda la brecha.
  setFacadeRuined(on) {
    const g = this.g;
    this.facadeDown = on;
    g.setGroupVisible('fachada', !on);
    g.setGroupVisible('fachadaRuin', on);
    const it = g.interact.list.find((i) => i.id === 'd_se');
    if (!it) return;
    it.ruined = on;
    it.hidden = on;
    if (it.obj) it.obj.visible = !on;
    if (it.box) it.box.enabled = !on && !it.done;
  }
  applyFlags() {
    const F = this.g.flags;
    this.setNaveRuined(!!F['boss:turiferario']);
    this.setFacadeRuined(!!F['boss:turibulario']);
    // la plaza: en ruinas sólo tras vencer (cargar a mitad del final es como
    // volver a empezar: todo entero)
    if (F['boss:turibulario']) this.wrecks.applyFlags(F);
    else {
      this.wrecks.reset();
      this.g.resetArea('largo');
    }
    // la cisterna tras el rito: la cúpula reventada, la reja del río cegada
    // hasta que muere el dios
    this.g.setGroupVisible('cisternCrown', !F['finale:rite']);
    this.g.setGroupVisible('riteRubble', !!F['finale:rite']);
    this.g.setGroupVisible('riteGrate', !!F['finale:rite'] && !F['boss:turibulario']);
    // la pira del atrio, reventada desde que salió el coloso
    this.g.setGroupVisible('pyre', !F['finale:turSeen']);
    this.climb.reset();
    this.clearDecals();
    this.debris.clear();
    this._placed = false;
    this.bellFall = null;
    this.deathCam = null;
    this.cam = null;
    if (this.tur) this.tur.show(false);
    if (this.deo) this.deo.show(false);
    if (F['boss:turibulario']) this.stage = 'done';
    else if (F['boss:turiferario']) this.stage = 'deoWait';
    else if (F['finale:rite']) this.stage = 'wait';
    else this.stage = 'off';
    // la campana tumbada en la plaza y el altar del cruceiro encendido
    if (F['boss:turiferario']) this.ensureTur().then(() => this.layBell());
    // (y sigue encendido tras la victoria: un sitio para descansar en la plaza)
    this.cruceiro(!!F['boss:turiferario']);
    this._leaveFight();
  }
  reset() {
    this.setNaveRuined(false);
    this.setFacadeRuined(false);
    this.wrecks.reset();
    for (const [n, on] of [
      ['cisternCrown', true],
      ['riteRubble', false],
      ['riteGrate', false],
    ])
      this.g.setGroupVisible(n, on);
    this.g.setGroupVisible('pyre', true);
    this.bellFall = null;
    this.deathCam = null;
    this.cam = null;
    this.climb.reset();
    this.clearDecals();
    this.debris.clear();
    this.stage = 'off';
    this._placed = false;
    if (this.tur) {
      this.tur.show(false);
      this.tur.clearDrops();
    }
    if (this.deo) this.deo.dispose();
    this.cruceiro(false);
    this._leaveFight();
  }
  // al morir: la pelea vuelve a empezar (el coloso espera en la plaza; el
  // dios, en la nave)
  onRespawn() {
    if (this.stage === 'intro' || this.stage === 'tur') this.stage = 'wait';
    if (this.stage === 'deo' || this.stage === 'deoIntro' || this.stage === 'rise') this.stage = 'deoWait';
    // (si se había desplomado, vuelve a empezar de pie agarrado a las torres)
    if (this.stage === 'deoWait' && this.facadeDown) this.setFacadeRuined(false);
    // y la plaza, entera otra vez (sólo se queda en ruinas al vencer)
    if (!this.g.flags['boss:turibulario'] && (this.stage === 'wait' || this.stage === 'deoWait')) {
      this.wrecks.reset();
      this.g.resetArea('largo');
    }
    this.bowCam = null;
    this.climb.reset();
    this.clearDecals();
    this.debris.clear();
    this._placed = false;
    this.cam = null;
    if (this.tur && this.stage === 'wait') {
      this.tur.show(false);
      this.tur.clearDrops();
    }
    if (this.deo) this.deo.dispose();
    this._leaveFight();
  }
  _leaveFight() {
    const g = this.g;
    g.extraTargets = null;
    if (this.stage !== 'burst' && g.atmo) g.atmo.override = null;
    if (g.camRig) {
      g.camRig.distBias = 0;
      g.camRig.pivotBias = 0;
    }
    if (g.activeBoss && ((this.tur && g.activeBoss === this.tur.proxy) || (this.deo && g.activeBoss === this.deo.proxy))) g.activeBoss = null;
  }

  // ---------------------------------------------------------- cada fotograma
  update(dt) {
    const g = this.g,
      p = g.player;
    this.t += dt;
    // tras el rito no queda nadie entre la cisterna y la plaza (ni después)
    if (g.flags['finale:rite']) {
      this._clearT = (this._clearT || 0) - dt;
      if (this._clearT <= 0) {
        this._clearT = 0.5;
        this.clearPath();
      }
    }
    if (this.stage === 'wait') {
      if (g.flags['finale:rite'] && !g.flags['finale:turSeen']) this._ascent(dt);
      // el coloso, cargado de antemano; si ya salió una vez, espera de pie en la plaza
      if (!this.tur) this.ensureTur();
      const near = Math.hypot(p.pos.x - TUR_HOME.x, p.pos.z - TUR_HOME.z) < 95;
      if (this.tur && near && !this._placed) {
        this._placed = true;
        if (g.flags['finale:turSeen']) this.tur.place(TUR_HOME.x, TUR_HOME.z, this._yawTo(DOOR.x, DOOR.z), { state: 'idle', wait: 1e9 });
      }
      if (this._placed && g.flags['finale:turSeen'] && this.tur.visible) this.tur.update(dt);
      // al salir por la puerta de la Sé a la plaza
      if (this.tur && g.state === 'play' && !p.dead && this.inLargo(p.pos) && p.pos.z > -58.8) this.startIntro(!g.flags['finale:turSeen']);
    } else if (this.stage === 'intro') {
      this.tur.update(dt);
      this._intro(dt);
    } else if (this.stage === 'tur') {
      this.tur.update(dt);
      this.climb.update(dt);
      this._arena(dt);
      this._bellSweep(dt);
      if (this.tur.st === 'dying' && this.deathCam) {
        this.dyingT += dt;
        const k = Math.min(1, this.dyingT / 5);
        g.camRig.override = { pos: this.deathCam.pos.clone().lerp(this.deathCam.look, k * 0.12), look: this.deathCam.look, speed: this.dyingT < 0.1 ? 40 : 3, fov: 64 };
      }
    } else if (this.stage === 'burst') {
      this._burst(dt);
    } else if (this.stage === 'rise') {
      this.deo.update(dt);
      this._bellFall(dt);
      this._rise(dt);
    } else if (this.stage === 'deoWait') {
      if (!this.deo) this.ensureDeo();
      if (this.deo && !this._placed && Math.hypot(p.pos.x, p.pos.z + 60) < 110) {
        this._placed = true;
        this.deo.place('fight');
        this.deo.st = 'wait';
      }
      if (this._placed) this.deo.update(dt);
      if (this.deo && this._placed && g.state === 'play' && !p.dead && this.inLargo(p.pos) && p.pos.z > -58.8) this.startDeoIntro();
    } else if (this.stage === 'deoIntro') {
      this.deo.update(dt);
      this.introT += dt;
      g.camRig.override = { pos: new THREE.Vector3(p.pos.x + 3, 2.4, p.pos.z + 4), look: new THREE.Vector3(0, 34, -70), speed: 2.5, fov: 72 };
      p.state = 'cine';
      if (this.introT > 3.4) this.startDeoFight();
    } else if (this.stage === 'deo') {
      this.deo.update(dt);
      this.climb.update(dt);
      if (this.bowCam) this._bowCam(dt);
      else this._arena(dt);
      // los rastrillos de los brazos de los lados rompen tejados y muros
      for (const i of [2, 3]) {
        const a = this.deo.arms.arms[i];
        if (a.st === 'rake' && a.w > 0.5) this.wrecks.hit(this.deo.arms.palm(i, _v), 4.5, 'rake');
      }
      if (this.deo.st === 'dying' && this.cam) this._camShot(dt);
    } else if (this.stage === 'end') {
      this._end(dt);
    }
    this._decals(dt);
    this.debris.update(dt, this._ground);
  }
  // Tras el rito, el camino de vuelta está vacío (la calma antes de la
  // tormenta): ni en la cripta, ni en la nave, ni en la plaza queda nadie.
  // (Las criaturas vuelven a su puesto al descansar o al morir: se quitan
  // otra vez.)
  clearPath() {
    for (const e of this.g.enemies) {
      if (e.boss || (e.dead && !e.obj.visible)) continue;
      const P = e.pos;
      const crypt = P.y < -3 && P.z < -100 && P.z > -170,
        nave = P.y > -1 && Math.abs(P.x) < 13.5 && P.z < -61 && P.z > -112,
        largo = P.y > -1 && P.x > -19 && P.x < 23 && P.z > -62 && P.z < -39;
      if (!crypt && !nave && !largo) continue;
      e.dead = true;
      e.state = 'dead';
      e.stT = 99;
      e.scripted = true;
      e.obj.visible = false;
      if (e.shadow) e.shadow.visible = false;
    }
  }
  // La subida, tras el rito: temblores, polvo que cae de las bóvedas,
  // rugidos lejanos y las campanas de la Sé, que tocan solas.
  _ascent(dt) {
    const g = this.g,
      p = g.player;
    if (g.state !== 'play' || p.dead || g.cutscene || g.ui.modal) return;
    this.ascT = (this.ascT ?? 4) - dt;
    if (this.ascT > 0) return;
    this.ascT = 7 + Math.random() * 8;
    const r = (a) => (Math.random() - 0.5) * a;
    g.camRig.shake(0.22 + Math.random() * 0.2);
    g.input.rumble(0.4, 0.5, 400);
    g.audio && g.audio.play('stoneCreak', { x: p.pos.x + r(8), y: p.pos.y + 5, z: p.pos.z + r(8) }, { k: 0.8 });
    // bajo techo, polvo de las bóvedas
    const under = p.pos.y < -3 || (Math.abs(p.pos.x) < 13 && p.pos.z < -61.5 && p.pos.z > -108);
    if (under) for (let k = 0; k < 6; k++) g.fx.blood.emit(p.pos.x + r(8), p.pos.y + (p.pos.y < -3 ? 3.2 : 9), p.pos.z + r(8), 8, { color: [0.45, 0.42, 0.38], speed: 0.6, life: 2.2, up: -1.5 });
    const k = Math.random();
    if (k < 0.45) g.audio && g.audio.play('bellToll', { x: 9, y: 18, z: -60 }, { k: 0.7 });
    else if (k < 0.75) g.audio && g.audio.play('beastRoarBig', { x: 4.5, y: 0, z: -47 }, { k: 0.5 });
  }
  inLargo(P) {
    return P.x > -18 && P.x < 22 && P.z > -60.2 && P.z < -40 && P.y < 4;
  }
  _yawTo(x, z) {
    return Math.atan2(x - TUR_HOME.x, z - TUR_HOME.z);
  }

  // ---------------------------------------------------------- la presentación
  startIntro(first) {
    const g = this.g,
      p = g.player,
      t = this.tur;
    this.stage = 'intro';
    this.introT = 0;
    this.first = first;
    this.climb.reset();
    g.lockTarget = null;
    const yaw = Math.atan2(p.pos.x - TUR_HOME.x, p.pos.z - TUR_HOME.z);
    t.place(TUR_HOME.x, TUR_HOME.z, yaw, { state: 'idle', wait: 1e9 });
    if (first) t.emerge();
    else t.attack('roar');
    // la pira salta en pedazos
    if (first) {
      g.setGroupVisible('pyre', false);
      this.debris.burst(new THREE.Vector3(4.5, 0.5, -47), 24, { speed: 7, up: 9, size: 0.7, spread: 2 });
    }
    // el jugador se para a mirar
    p.state = 'cine';
    p.stT = 0;
    p.vx = p.vz = 0;
    p.blocking = false;
    p.anim.stop(0.25);
    g.audio && g.audio.stopMusic();
    g.audio && g.audio.play('dread', p.pos);
    if (first) {
      g.audio && g.audio.play('stoneCreak', { x: TUR_HOME.x, y: 0, z: TUR_HOME.z }, { k: 1.4 });
      g.camRig.shake(0.4);
    }
    this.introCamFrom = g.camera.position.clone();
  }
  _intro(dt) {
    const g = this.g,
      p = g.player,
      t = this.tur;
    this.introT += dt;
    const T = this.introT;
    const H = TUR_HOME;
    const dur = this.first ? 8.1 : 2.6;
    const head = t.M.byName.head.getWorldPosition(new THREE.Vector3());
    const side = Math.sign(p.pos.x - H.x) || 1;
    if (this.first) {
      let pos, look, fov, cut;
      if (T < 2.6) {
        // por encima del hombro, a ras de suelo: el empedrado revienta
        cut = this._shot !== 'a';
        this._shot = 'a';
        // (a ras de suelo, desde el lado del atrio: el empedrado revienta)
        const u = smooth(T / 2.6);
        pos = new THREE.Vector3(H.x + 9.5 - u * 1.5, 1.1 + u * 0.5, H.z - 7.5);
        look = new THREE.Vector3(H.x, 1.4 + Math.max(0, head.y) * 0.3, H.z);
        fov = 64;
      } else if (T < 6.1) {
        // de lado y de lejos: se ve salir entero
        cut = this._shot !== 'b';
        this._shot = 'b';
        const u = smooth((T - 2.6) / 3.5);
        pos = new THREE.Vector3(H.x - 15.5 - u * 1.2, 3 + u * 2.2, H.z - 6 - u * 3);
        look = new THREE.Vector3(H.x, Math.max(3, head.y * 0.62), H.z);
        fov = 72;
      } else {
        // ruge: desde los pies del jugador, mirando arriba
        cut = this._shot !== 'c';
        this._shot = 'c';
        const u = smooth((T - 6.1) / 2);
        pos = new THREE.Vector3(p.pos.x - side * 3, p.visY + 1.0 + u * 0.4, p.pos.z + 2.4);
        look = new THREE.Vector3(H.x, head.y - 1 - u * 2, H.z);
        fov = 74;
      }
      g.camRig.override = { pos, look, speed: 2.5, snap: cut, fov };
      if (cut) g.camRig.cam.position.copy(pos);
      // polvo que cae de las fachadas
      if (Math.random() < dt * 8) g.fx.blood.emit(H.x + (Math.random() - 0.5) * 30, 8 + Math.random() * 4, H.z + (Math.random() - 0.5) * 14, 6, { color: [0.4, 0.37, 0.33], speed: 1, life: 1.4, up: -1 });
    } else {
      const pos = new THREE.Vector3(p.pos.x + side * 2.5, 2.2, p.pos.z - 3);
      g.camRig.override = { pos, look: new THREE.Vector3(t.pos.x, 11, t.pos.z), speed: 3, fov: 68 };
    }
    p.state = 'cine';
    if (T >= dur) this.startFight();
  }
  startFight() {
    const g = this.g,
      p = g.player,
      t = this.tur;
    this.stage = 'tur';
    g.camRig.override = null;
    g.camRig.snapTo(p);
    g.camRig.yaw = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
    p.state = 'free';
    this._shot = null;
    g.activeBoss = t.proxy;
    g.extraTargets = [t.proxy];
    // fijado en el coloso (Q lo suelta)
    g.setLock(t.proxy);
    g.audio && g.audio.music(t.phase >= 2 ? 'bossFinal2' : 'bossFinal');
    g.ui.area(t.proxy.T.name);
    // menos niebla: que se le vea entero
    g.atmo.override = t.phase >= 2 ? { fog: 0x2a0806, density: 0.026, vol: 0.05, bloom: 1.6 } : { density: 0.026, vol: 0.06 };
    g.flags['finale:turSeen'] = true;
    if (t.st === 'emerge' || t.st === 'attack') t.setIdle(0.8);
    this.hintsT = 0;
    this.climb.boss = t;
    // (el dios, montado de antemano: sale en cuanto revienta el coloso)
    this.ensureDeo();
  }
  // durante la pelea: no se sale de la plaza; la cámara, más lejos
  _arena(dt) {
    const g = this.g,
      p = g.player;
    if (!this.climb.active && !p.puppet && !p.dead) {
      const P = p.pos;
      P.x = Math.min(ARENA.x1, Math.max(ARENA.x0, P.x));
      P.z = Math.min(ARENA.z1, Math.max(ARENA.z0, P.z));
    }
    const cr = g.camRig;
    const want = this.climb.active ? (this.stage === 'deo' ? 2.4 : 1.6) : this.stage === 'deo' ? 3.4 : 2.4;
    cr.distBias = (cr.distBias || 0) + (want - (cr.distBias || 0)) * (1 - Math.exp(-dt * 2));
    // pistas, la primera vez
    this.hintsT += dt;
    if (this.hintsT > 6 && !g.hintsShown.colossus && this.stage === 'tur') {
      g.hintsShown.colossus = true;
      g.say('No le harás nada a golpes: trépale y apuñala sus sigilos. La cola se arrastra por el suelo: agárrate a ella.');
    }
    if (this.climb.active && !g.hintsShown.climb) {
      g.hintsShown.climb = true;
      g.say('Mantén la guardia para aferrarte cuando se sacuda. La esquiva te suelta.');
    }
  }
  onTurPhase(ph) {
    const g = this.g;
    if (ph === 2) {
      g.audio && g.audio.music('bossFinal2');
      g.atmo.override = { fog: 0x2a0806, density: 0.026, vol: 0.05, bloom: 1.6 };
      g.say('El Turiferario enloquece: la cera de sus cirios arde.');
    } else if (ph === 3) {
      g.say('Cae de rodillas con el pecho abierto. Trepa por la casulla hasta el núcleo.');
    }
    g.flash = Math.max(g.flash, 0.4);
    g.camRig.shake(0.6);
  }

  // ---------------------------------------------------------- revienta
  // apuñalado el núcleo: plano de lejos mientras se hincha
  onTurDying() {
    const g = this.g,
      t = this.tur;
    this.dyingT = 0;
    // de lado y algo por delante, por donde la plaza deja más sitio (dentro
    // de ella: la cámara no se mete en una casa)
    const f = t.forward();
    const side = new THREE.Vector3(f.z, 0, -f.x);
    let best = null;
    for (const sg of [-1, 1])
      for (const fw of [6, 2, -3]) {
        const c = new THREE.Vector3(t.pos.x + side.x * sg * 20 + f.x * fw, 4.5, t.pos.z + side.z * sg * 20 + f.z * fw);
        c.x = Math.min(ARENA.x1 - 0.6, Math.max(ARENA.x0 + 0.6, c.x));
        c.z = Math.min(-41.2, Math.max(-55, c.z));
        const d = Math.hypot(c.x - t.pos.x, c.z - t.pos.z);
        if (!best || d > best.d) best = { c, d };
      }
    this.deathCam = { pos: best.c, look: t.bp('chest', 0, 10.5, 0.5, new THREE.Vector3()) };
    g.lockTarget = null;
    g.audio && g.audio.stopMusic();
  }
  onTurBurst() {
    const g = this.g,
      t = this.tur;
    this.stage = 'burst';
    this.burstT = 0;
    const c = t.bp('chest', 0, 12, 1, new THREE.Vector3());
    this.burstAt = c.clone();
    // sangre, ceniza de incienso y fuego
    g.fx.blood.emit(c.x, c.y, c.z, 220, { speed: 14, life: 1.6, up: 5 });
    g.fx.blood.emit(c.x, c.y, c.z, 120, { color: [0.5, 0.46, 0.42], speed: 10, life: 2.2, up: 4 });
    g.fx.blood.emit(c.x, c.y, c.z, 90, { color: [1, 0.55, 0.15], speed: 9, life: 1.2, up: 4, gravity: -1 });
    g.combat.ring(t.pos.x, t.pos.y + 0.1, t.pos.z, 22, 0xff5020, 1.2);
    g.audio && g.audio.play('fleshBurst', c, { k: 2 });
    g.audio && g.audio.play('explosion', c, { k: 1.6 });
    g.flash = 0.75;
    g.flashTint = [1, 0.45, 0.2];
    g.camRig.shake(1);
    g.input.rumble(1, 1, 700);
    g.hitstop = 0.25;
    t.show(false);
    t.clearDrops();
    // la campana se suelta y cae, tañendo
    const B = t.bell;
    this.bellFall = { pos: B.top.clone(), up: B.up.clone(), v: new THREE.Vector3((Math.random() - 0.5) * 3, 2, (Math.random() - 0.5) * 3), t: 0, hits: 0 };
    B.bell.visible = true;
    g.scene.add(B.bell);
    // (el fuego de dentro se apaga: quedan ascuas)
    t.bellGlow.scale.set(2.2, 2.2, 1);
    t.bellGlow.material.opacity = 0.55;
    this.climb.reset();
    g.activeBoss = null;
    g.extraTargets = null;
    g.audio && g.audio.stopMusic();
    g.atmo.override = null;
    g.flags['boss:turiferario'] = true;
  }
  _burst(dt) {
    const g = this.g;
    this.burstT += dt;
    this._bellFall(dt);
    // la cámara, aún lejos, mientras llueven sangre y ceniza
    if (this.deathCam && this.burstT < 3.5) g.camRig.override = { pos: this.deathCam.pos, look: this.deathCam.look.clone().setY(Math.max(3, this.deathCam.look.y - this.burstT * 2.5)), speed: 2, fov: 64 };
    else if (this.deathCam) {
      this.deathCam = null;
      g.camRig.override = null;
      g.camRig.snapTo(g.player);
    }
    if (this.burstT < 4 && Math.random() < dt * 12) {
      const a = this.burstAt;
      g.fx.blood.emit(a.x + (Math.random() - 0.5) * 16, a.y + 6, a.z + (Math.random() - 0.5) * 16, 6, { color: [0.5, 0.46, 0.42], speed: 1, life: 2, up: -2 });
    }
    if (this.burstT > 2.2 && !this._burstMsg) {
      this._burstMsg = true;
      g.ui.area('EL TURIFERARIO HA REVENTADO');
      g.audio && g.audio.play('victory');
    }
    // y detrás, la nave estalla
    if (this.burstT > 5.5 && this.deo) {
      this._burstMsg = false;
      this.startRise();
    } else if (this.burstT > 5.5 && !this.deo) this.ensureDeo();
  }

  // ---------------------------------------------------------- se alza Deo Ignoto
  startRise() {
    const g = this.g,
      p = g.player;
    this.stage = 'rise';
    this.riseT = 0;
    this.deathCam = null;
    this.climb.boss = this.deo;
    p.state = 'cine';
    p.vx = p.vz = 0;
    g.lockTarget = null;
    // menos niebla y el plano lejano más allá: el dios mide noventa metros
    g.atmo.override = { density: 0.013, vol: 0.05, far: 240, bloom: 1.3 };
    g.audio && g.audio.play('stoneCreak', { x: 0, y: 10, z: -80 }, { k: 2 });
    g.audio && g.audio.play('dread', p.pos);
    g.camRig.shake(0.4);
    this._riseBoom = false;
  }
  _rise(dt) {
    const g = this.g,
      p = g.player;
    this.riseT += dt;
    const T = this.riseT;
    // temblores y polvo de la fachada
    if (T < 1.6) {
      g.camRig.shake(dt * 0.6);
      if (Math.random() < dt * 14) g.fx.blood.emit((Math.random() - 0.5) * 22, 12 + Math.random() * 12, -60.5, 5, { color: [0.4, 0.37, 0.33], speed: 1, life: 1.6, up: -1 });
    }
    // la nave revienta desde dentro y el dios empieza a salir
    if (T >= 1.6 && !this._riseBoom) {
      this._riseBoom = true;
      this.setNaveRuined(true);
      for (const z of [-68, -78, -88, -98]) {
        const at = new THREE.Vector3((Math.random() - 0.5) * 8, 14, z);
        this.debris.burst(at, 26, { speed: 13, up: 18, size: 2.0, spread: 6 });
        g.fx.blood.emit(at.x, at.y, at.z, 70, { color: [0.4, 0.37, 0.33], speed: 12, life: 2.4, up: 6 });
        g.fx.blood.emit(at.x, at.y - 4, at.z, 30, { speed: 9, life: 1.4, up: 6 });
      }
      g.audio && g.audio.play('explosion', { x: 0, y: 12, z: -80 }, { k: 2 });
      g.audio && g.audio.play('wallBreak', { x: 0, y: 12, z: -75 }, { k: 2 });
      g.audio && g.audio.play('bellToll', { x: 9, y: 18, z: -60 }, { k: 1.4 });
      g.flash = 0.55;
      g.flashTint = [1, 0.7, 0.45];
      g.camRig.shake(1);
      g.input.rumble(1, 1, 900);
      this.deo.startRise();
    }
    // planos: la fachada desde la plaza; los brazos que salen; la cabeza
    let pos, look, fov, cut;
    if (T < 7.5) {
      cut = this._shot !== 'r1';
      this._shot = 'r1';
      const u = smooth(T / 7.5);
      pos = new THREE.Vector3(7 - u * 3, 2.2 + u * 1.5, -42.5);
      look = new THREE.Vector3(0, 14 + u * 22, -72);
      fov = 74;
    } else if (T < 12.5) {
      cut = this._shot !== 'r2';
      this._shot = 'r2';
      const u = smooth((T - 7.5) / 5);
      pos = new THREE.Vector3(-15 + u * 2, 4 + u * 3, -44);
      look = new THREE.Vector3(4, 26 + u * 8, -74);
      fov = 76;
    } else {
      cut = this._shot !== 'r3';
      this._shot = 'r3';
      const u = smooth((T - 12.5) / 3.5);
      const head = this.deo._head(new THREE.Vector3());
      pos = new THREE.Vector3(p.pos.x + 2.5, p.visY + 1.2 + u * 0.4, p.pos.z + 3);
      look = head.clone().add(new THREE.Vector3(0, -4 - u * 3, 0));
      fov = 66;
    }
    g.camRig.override = { pos, look, speed: 2.2, snap: cut, fov };
    if (cut) g.camRig.cam.position.copy(pos);
    p.state = 'cine';
    if (T >= 1.6 + 14.6) this.startDeoFight();
  }
  startDeoIntro() {
    const g = this.g,
      p = g.player;
    this.stage = 'deoIntro';
    this.introT = 0;
    this.climb.boss = this.deo;
    this.deo.place('fight');
    this.deo.st = 'wait';
    this.deo._roar(false);
    p.state = 'cine';
    p.vx = p.vz = 0;
    g.lockTarget = null;
    g.atmo.override = { density: 0.013, vol: 0.05, far: 240, bloom: 1.3 };
  }
  startDeoFight() {
    const g = this.g,
      p = g.player,
      d = this.deo;
    this.stage = 'deo';
    this._shot = null;
    g.camRig.override = null;
    g.camRig.snapTo(p);
    g.camRig.yaw = Math.atan2(0 - p.pos.x, -70 - p.pos.z);
    g.camRig.pitch = -0.1;
    p.state = 'free';
    d.st = 'fight';
    d.stT = 0;
    this.climb.boss = d;
    g.activeBoss = d.proxy;
    g.extraTargets = [d.proxy];
    g.setLock(d.proxy);
    g.audio && g.audio.music('bossFinal2');
    g.ui.area(d.proxy.T.name);
    g.atmo.override = { density: 0.013, vol: 0.05, far: 240, bloom: 1.3 };
    // el altar del cruceiro: aquí se vuelve si caes
    this.cruceiro(true);
    g.lastAltar = 'a_cruceiro';
    g.flags['altar:a_cruceiro'] = true;
    g.saveGame();
    this.hintsT = 0;
    if (!g.hintsShown.deo) {
      g.hintsShown.deo = true;
      g.say('Sus manos alzadas golpean la plaza y se quedan plantadas: trepa por el dorso hasta el sigilo del codo.');
    }
  }
  onDeoPhase(ph) {
    const g = this.g;
    g.flash = Math.max(g.flash, 0.4);
    g.camRig.shake(0.7);
    if (ph === 2) g.say('Un brazo se desploma sobre las casas. Le queda el otro.');
  }
  onDeoDying() {
    const g = this.g,
      p = g.player;
    g.audio && g.audio.stopMusic();
    g.lockTarget = null;
    // desde un lado de la plaza (el del jugador), algo apartado de la cara
    const sx = p.pos.x >= 0 ? 1 : -1;
    this.cam = { t: 0, pos: new THREE.Vector3(sx * 17, 4.2, -41.2), look: new THREE.Vector3(0, 8, -54), follow: true };
  }
  _camShot(dt) {
    const g = this.g;
    this.cam.t += dt;
    let look = this.cam.look.clone().setY(Math.max(4, this.cam.look.y - this.cam.t * 1.5));
    // (sigue a la cabeza mientras se encabrita y se hunde)
    if (this.cam.follow && this.deo && this.deo.visible) {
      const h = this.deo._head(new THREE.Vector3());
      this.cam.look.lerp(h.setY(Math.max(3, h.y + 2)), 1 - Math.exp(-dt * 2.5));
      look = this.cam.look.clone();
    }
    g.camRig.override = { pos: this.cam.pos, look, speed: this.cam.t < 0.1 ? 40 : 2.5, fov: 70 };
  }

  // ---------------------------------------------------------- se desploma
  // Muertos los brazos alzados: un plano del dios encabritándose y otro de la
  // caída sobre la fachada; el jugador, apartado de donde cae la cabeza.
  startBow() {
    const g = this.g,
      p = g.player;
    this.bowCam = { t: 0 };
    this.climb.reset();
    g.lockTarget = null;
    p.state = 'cine';
    p.vx = p.vz = 0;
    // fuera de donde cae la cara (y de las manos de delante)
    const side = p.pos.x >= 2 ? 1 : -1;
    const safe = { x: side > 0 ? 9.5 : -6.5, z: -42.2 };
    if (Math.abs(p.pos.x) < 11 && p.pos.z < -44) p.spawn(safe.x, 0, safe.z, Math.atan2(-safe.x, -54 - safe.z));
    this.bowSide = side;
  }
  _bowCam(dt) {
    const g = this.g,
      p = g.player,
      C = this.bowCam;
    C.t += dt;
    const T = C.t;
    let pos, look, fov, cut;
    if (T < 2.3) {
      // se encabrita y ruge: desde abajo, en la plaza
      cut = C.shot !== 'b1';
      C.shot = 'b1';
      const u = smooth(T / 2.3);
      pos = new THREE.Vector3(this.bowSide * (13 - u * 2), 2.4, -41.4);
      look = new THREE.Vector3(0, 40 + u * 6, -72);
      fov = 76;
    } else if (T < 5.6) {
      // la caída: plano abierto desde el otro lado de la plaza
      cut = C.shot !== 'b2';
      C.shot = 'b2';
      const u = smooth((T - 2.3) / 3.3);
      pos = new THREE.Vector3(-this.bowSide * (11 - u * 1.5), 6.5 - u * 2.5, -41.6);
      look = new THREE.Vector3(this.bowSide * 1.5, 22 - u * 13, -62 + u * 8);
      fov = 74;
    } else {
      // la cara, ya en el suelo: desde el jugador
      cut = C.shot !== 'b3';
      C.shot = 'b3';
      const u = smooth((T - 5.6) / 1.6);
      // (sin salir de la plaza: detrás están las casas)
      pos = new THREE.Vector3(clamp(p.pos.x + this.bowSide * 2.2, ARENA.x0 + 0.8, ARENA.x1 - 0.8), p.visY + 1.9 - u * 0.3, Math.min(p.pos.z + 2.6, ARENA.z1 - 0.4));
      look = new THREE.Vector3(1.2, 7 - u * 1.5, -50);
      fov = 68;
    }
    g.camRig.override = { pos, look, speed: 2.4, snap: cut, fov };
    if (cut) g.camRig.cam.position.copy(pos);
    p.state = 'cine';
    if (T > 7.2) {
      this.bowCam = null;
      g.camRig.override = null;
      g.camRig.snapTo(p);
      g.camRig.yaw = Math.atan2(1 - p.pos.x, -50 - p.pos.z);
      g.camRig.pitch = 0.18;
      p.state = 'free';
      g.setLock(this.deo.proxy);
      g.say('Se ha desplomado sobre el atrio: trepa por la grieta de la máscara hasta sus ojos.');
    }
  }
  // el pecho del dios revienta la fachada y las torres
  collapseFacade() {
    const g = this.g;
    if (this.facadeDown) return;
    this.setFacadeRuined(true);
    // (y lo alto de los muros que la flanquean)
    this.wrecks.hit(new THREE.Vector3(-15.5, 3.5, -59), 3.5, 'facade');
    this.wrecks.hit(new THREE.Vector3(17.5, 3.5, -59), 4.5, 'facade');
    for (const [x, y, z, n] of [
      [-9, 20, -60, 30],
      [9, 20, -60, 30],
      [0, 12, -60.5, 34],
      [0, 6, -57, 20],
      [-9, 8, -57, 16],
      [9, 8, -57, 16],
    ]) {
      const at = new THREE.Vector3(x, y, z);
      this.debris.burst(at, n, { speed: 11, up: 8, size: 2.2, spread: 4.5, dir: new THREE.Vector3(0, 0, 0.5) });
      g.fx.blood.emit(x, y, z, 60, { color: [0.42, 0.39, 0.35], speed: 11, life: 2.6, up: 4 });
    }
    // polvo que se queda flotando sobre el atrio
    for (let k = 0; k < 10; k++) g.fx.blood.emit(-12 + k * 2.6, 2 + Math.random() * 3, -57 + Math.random() * 4, 18, { color: [0.45, 0.42, 0.38], speed: 3, life: 3.4, up: 1.5, gravity: -0.6 });
    g.audio && g.audio.play('wallBreak', { x: 0, y: 10, z: -60 }, { k: 2.2 });
    g.audio && g.audio.play('pillarBreak', { x: -9, y: 14, z: -60 }, { k: 1.8 });
    g.audio && g.audio.play('pillarBreak', { x: 9, y: 14, z: -60 }, { k: 1.8 });
    g.audio && g.audio.play('bellToll', { x: 9, y: 10, z: -58 }, { k: 1.2 });
    g.camRig.shake(1);
    g.input.rumble(1, 1, 900);
  }
  // muerto el dios: se hunde, la reja del río queda abierta
  onDeoDead() {
    const g = this.g;
    this.stage = 'end';
    this.endT = 0;
    this.climb.reset();
    g.activeBoss = null;
    g.extraTargets = null;
    g.flags['boss:turibulario'] = true;
    // (el dios revienta la reja del río al hundirse: el camino queda libre)
    g.setGroupVisible('riteGrate', false);
    g.ui.area('DEO IGNOTO HA CAÍDO');
    g.audio && g.audio.play('victory');
    // la puerta de la Sé, reventada; la reja del río, abierta
    for (const it of g.interact.list) {
      if (it.kind !== 'door') continue;
      if (it.id === 'd_se' || (it.lock.type === 'boss' && it.lock.boss === 'turibulario')) {
        g.interact.setOpen(it);
        g.flags['door:' + it.id] = true;
      }
    }
    g.saveGame();
  }
  _end(dt) {
    const g = this.g;
    this.endT += dt;
    if (this.cam && this.endT < 3) this._camShot(dt);
    else if (this.cam) {
      this.cam = null;
      g.camRig.override = null;
      g.camRig.snapTo(g.player);
      g.atmo.override = { density: 0.03, vol: 0.04 };
    }
    if (this.endT > 6 && !this._endMsg) {
      this._endMsg = true;
      g.say('Bajo las ruinas de la nave sigue la escalera de la cripta. La reja del río está reventada.');
    }
    if (this.endT > 10) {
      this._endMsg = false;
      this.stage = 'done';
      g.atmo.override = null;
    }
  }

  // ---------------------------------------------------------- la campana y el cruceiro
  // tras el estallido, la campana se queda tumbada en el atrio (cuando Deo se
  // desploma, su cara la tapa: al hundirse vuelve a verse)
  layBell() {
    const t = this.tur;
    if (!t || this.bellFall) return;
    const B = t.bell;
    B.bell.visible = true;
    B.mesh.visible = false;
    if (B.bell.parent !== this.g.scene) this.g.scene.add(B.bell);
    B.bell.position.set(1.5, t.groundAt(1.5, -49.5) + B.R * 0.95, -49.5);
    B.bell.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.94, 0.1, 0.32).normalize());
    t.bellGlow.scale.set(2.2, 2.2, 1);
    t.bellGlow.material.opacity = 0.5;
  }
  // el altar del cruceiro: velas encendidas al pie de la cruz
  cruceiro(on) {
    const g = this.g;
    const it = g.interact.list.find((i) => i.id === 'a_cruceiro');
    if (it) it.hidden = !on;
    if (on && !this._cruFires) {
      this._cruFires = [];
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        const f = g.fx.fires.add({ x: -9.5 + Math.cos(a) * 0.9, y: 0.25, z: -47.5 + Math.sin(a) * 0.9, s: 0.12, light: false, embers: false, glow: true });
        f.keep = true;
        this._cruFires.push(f);
      }
      this._cruLight = g.fx.lights.add({ x: -9.5, y: 1.2, z: -47.5, color: 0xffb060, intensity: 10, range: 9 });
      g.fx.fires.refresh(g.camera.position.x, g.camera.position.z);
    } else if (!on && this._cruFires) {
      for (const f of this._cruFires) f.on = false;
      this._cruFires = null;
      if (this._cruLight) this._cruLight.on = false;
      this._cruLight = null;
      g.fx.fires.refresh(g.camera.position.x, g.camera.position.z);
    }
  }

  // la campana cae al empedrado, rebota y se queda tumbada
  _bellFall(dt) {
    const F = this.bellFall;
    if (!F || !this.tur) return;
    const g = this.g,
      B = this.tur.bell;
    F.t += dt;
    F.v.y -= 16 * dt;
    F.pos.addScaledVector(F.v, dt);
    // se tumba poco a poco
    const side = new THREE.Vector3(F.v.x, 0, F.v.z);
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
    side.normalize();
    F.up.lerp(side, Math.min(1, dt * 1.5)).normalize();
    const gy = this.tur.groundAt(F.pos.x, F.pos.z) + Math.max(B.R * 0.95, B.H * Math.max(0, F.up.y));
    if (F.pos.y < gy) {
      F.pos.y = gy;
      if (F.v.y < -3 && F.hits < 3) {
        F.hits++;
        F.v.y *= -0.3;
        F.v.x *= 0.7;
        F.v.z *= 0.7;
        g.audio && g.audio.play('bellToll', F.pos, { k: 1.2 - F.hits * 0.25 });
        g.camRig.shake(0.5 - F.hits * 0.1);
        this.debris.burst(new THREE.Vector3(F.pos.x, gy - B.R, F.pos.z), 10, { speed: 4, up: 4, size: 0.6, spread: 2 });
      } else {
        F.v.y = 0;
        F.v.x *= Math.exp(-dt * 2);
        F.v.z *= Math.exp(-dt * 2);
      }
    }
    B.bell.position.copy(F.pos);
    B.bell.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), F.up);
  }

  // ---------------------------------------------------------- jugador
  // el aviso de esta pelea (agarrarse, apuñalar, aferrarse) o undefined
  prompt() {
    if (this.stage !== 'tur' && this.stage !== 'deo') return undefined;
    return this.climb.prompt();
  }
  interact(it) {
    if (it && it.grab) this.climb.grab();
  }
  playerSwing(player, atk) {
    if (this.stage === 'tur' && this.tur) this.tur.playerSwing(player, atk);
  }
  // un golpe de un coloso contra el suelo o las casas: lo que se rompe
  onImpact(at, r, kind) {
    this.wrecks.hit(at, r, kind);
  }
  // la campana, al barrer el aire deprisa, rompe tejados y muros
  _bellSweep(dt) {
    const t = this.tur;
    if (!t || !t.visible || !t.bell) return;
    const c = t.bell.center(this._bc || (this._bc = new THREE.Vector3()));
    if (this._bp) {
      const sp = c.distanceTo(this._bp) / Math.max(dt, 1e-3);
      if (sp > 7 && c.y > 1.6) this.wrecks.hit(c, t.bell.R + 0.6, 'air');
    } else this._bp = new THREE.Vector3();
    this._bp.copy(c);
  }

  // ---------------------------------------------------------- grietas en el suelo
  decal(at, r) {
    const g = this.g;
    if (!this._crackTex) this._crackTex = crackTexture();
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this._crackTex, color: 0x000000, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.position.set(at.x, at.y + 0.03, at.z);
    m.rotation.y = Math.random() * Math.PI * 2;
    m.scale.set(r, 1, r);
    m.renderOrder = 1;
    g.scene.add(m);
    this.decals.push({ m, t: 0 });
    if (this.decals.length > 16) {
      const d = this.decals.shift();
      g.scene.remove(d.m);
      d.m.geometry.dispose();
      d.m.material.dispose();
    }
  }
  _decals(dt) {
    for (const d of this.decals) {
      d.t += dt;
      if (d.t > 50) d.m.material.opacity = Math.max(0, 0.85 * (1 - (d.t - 50) / 20));
    }
  }
  clearDecals() {
    for (const d of this.decals) {
      this.g.scene.remove(d.m);
      d.m.geometry.dispose();
      d.m.material.dispose();
    }
    this.decals.length = 0;
  }

  // ---------------------------------------------------------- pruebas
  // (modo de pruebas) directo a la plaza con el coloso ya fuera
  async debugTur(o = {}) {
    const g = this.g,
      p = g.player;
    await this.ensureTur();
    g.flags['finale:rite'] = true;
    if (o.seen !== false) g.flags['finale:turSeen'] = true;
    delete g.flags['boss:turiferario'];
    this.stage = 'wait';
    this._placed = false;
    p.spawn(o.x ?? 1, 0, o.z ?? -57.5, o.yaw ?? 0);
    g.camRig.snapTo(p);
    this.update(0);
  }
  // (modo de pruebas) directo a la pelea contra Deo Ignoto; rise: con la
  // nave reventando y el dios saliendo
  async debugDeo(o = {}) {
    const g = this.g,
      p = g.player;
    await this.ensureTur();
    await this.ensureDeo();
    g.flags['finale:rite'] = true;
    g.flags['finale:turSeen'] = true;
    g.flags['boss:turiferario'] = true;
    delete g.flags['boss:turibulario'];
    this.applyFlags();
    p.spawn(o.x ?? 2, 0, o.z ?? -48, o.yaw ?? Math.PI);
    g.camRig.snapTo(p);
    if (o.rise) {
      this.setNaveRuined(false);
      this.tur.show(false);
      this.burstT = 5.6;
      this.stage = 'burst';
      this.startRise();
    } else {
      this.stage = 'deoWait';
      this._placed = false;
      this.update(0);
    }
  }
}

// grietas radiales (alfa) para el empedrado roto
function crackTexture() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  x.clearRect(0, 0, S, S);
  const grd = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(255,255,255,0.9)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = grd;
  x.beginPath();
  x.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = 'rgba(255,255,255,1)';
  x.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    let a = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
    let px = S / 2,
      py = S / 2;
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(px, py);
    const n = 6 + Math.floor(Math.random() * 4);
    for (let k = 0; k < n; k++) {
      a += (Math.random() - 0.5) * 0.7;
      px += Math.cos(a) * (S / 2 / n) * (0.8 + Math.random() * 0.4);
      py += Math.sin(a) * (S / 2 / n) * (0.8 + Math.random() * 0.4);
      x.lineTo(px, py);
      x.lineWidth = Math.max(0.6, 3 - k * 0.4);
    }
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
