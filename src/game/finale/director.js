// El jefe final: el guion, de la cisterna al río.
//
//   off      todavía no (no se ha visto el rito de la cisterna)
//   wait     visto el rito: el Turiferario espera bajo el atrio (o, si ya
//            salió y has muerto, de pie en la plaza)
//   intro    sale del empedrado (o se vuelve y ruge, si ya había salido)
//   tur      la pelea en la plaza
//   burst    revienta (y detrás se alza Deo Ignoto)
//   deoWait  la segunda pelea, pendiente (la nave en ruinas)
//   done     muerto el dios
//
// Banderas: finale:rite (visto el rito), finale:turSeen (ya ha salido del
// suelo una vez), boss:turiferario (fase 1 ganada) y boss:turibulario (la de
// siempre: muerto el dios, se abre la reja del río).
import * as THREE from 'three';
import { Climb } from './climb.js';
import { TurBoss, TUR_HOME } from './turiferario_boss.js';
import { Debris } from './debris.js';

const _v = new THREE.Vector3();
const DOOR = { x: 0, z: -60.4 };
// la plaza durante la pelea: los escombros cierran las salidas
const ARENA = { x0: -17.4, z0: -59.6, x1: 21.4, z1: -40.6 };
const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

export class Finale {
  constructor(game) {
    this.g = game;
    this.climb = new Climb(game);
    this.debris = new Debris(game.scene);
    this._ground = (x, z) => game.world.col.groundHeight(x, z, 0.1, 2);
    this.tur = null;
    this.stage = 'off';
    this.decals = [];
    this.t = 0;
    this._placed = false;
  }
  get fighting() {
    return this.stage === 'tur' || this.stage === 'intro';
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
        this.climb.boss = t;
        return t;
      });
    return this._turP;
  }

  // ---------------------------------------------------------- banderas
  applyFlags() {
    const F = this.g.flags;
    this.climb.reset();
    this.clearDecals();
    this._placed = false;
    if (this.tur) this.tur.show(false);
    if (F['boss:turibulario']) this.stage = 'done';
    else if (F['boss:turiferario']) this.stage = 'deoWait';
    else if (F['finale:rite']) this.stage = 'wait';
    else this.stage = 'off';
    this._leaveFight();
  }
  reset() {
    this.bellFall = null;
    this.deathCam = null;
    this.climb.reset();
    this.clearDecals();
    this.debris.clear();
    this.stage = 'off';
    this._placed = false;
    if (this.tur) {
      this.tur.show(false);
      this.tur.clearDrops();
    }
    this._leaveFight();
  }
  // al morir: la pelea vuelve a empezar (el coloso espera en la plaza)
  onRespawn() {
    if (this.stage === 'intro' || this.stage === 'tur') this.stage = 'wait';
    this.climb.reset();
    this.clearDecals();
    this.debris.clear();
    this._placed = false;
    if (this.tur) {
      this.tur.show(false);
      this.tur.clearDrops();
    }
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
    if (g.activeBoss && this.tur && g.activeBoss === this.tur.proxy) g.activeBoss = null;
  }

  // ---------------------------------------------------------- cada fotograma
  update(dt) {
    const g = this.g,
      p = g.player;
    this.t += dt;
    if (this.stage === 'wait') {
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
      if (this.tur.st === 'dying' && this.deathCam) {
        this.dyingT += dt;
        const k = Math.min(1, this.dyingT / 5);
        g.camRig.override = { pos: this.deathCam.pos.clone().lerp(this.deathCam.look, k * 0.12), look: this.deathCam.look, speed: this.dyingT < 0.1 ? 40 : 3, fov: 64 };
      }
    } else if (this.stage === 'burst') {
      this._burst(dt);
    }
    this._decals(dt);
    this.debris.update(dt, this._ground);
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
    const want = this.climb.active ? 1.6 : 2.4;
    cr.distBias = (cr.distBias || 0) + (want - (cr.distBias || 0)) * (1 - Math.exp(-dt * 2));
    // pistas, la primera vez
    this.hintsT += dt;
    if (this.hintsT > 6 && !g.hintsShown.colossus) {
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
    if (this.burstT > 6) {
      this._burstMsg = false;
      this.stage = 'deoWait';
      g.camRig.distBias = 0;
      g.saveGame();
      this.onDeoPending && this.onDeoPending();
    }
    void dt;
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
    if (this.stage !== 'tur') return undefined;
    return this.climb.prompt();
  }
  interact(it) {
    if (it && it.grab) this.climb.grab();
  }
  playerSwing(player, atk) {
    if (this.stage === 'tur' && this.tur) this.tur.playerSwing(player, atk);
  }
  onImpact() {}

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
