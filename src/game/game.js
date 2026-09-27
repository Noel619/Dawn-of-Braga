// Orquestación del juego: bucle, estados y sistemas.
import * as THREE from 'three';
import { buildLevel } from '../world/level.js';
import { PostPipeline } from '../gfx/post.js';
import { G } from '../gfx/materials.js';
import { setMaxAnisotropy } from '../gfx/textures.js';
import { FireSystem, LightPool, AshSystem, ParticleBurst, DecalPool, LightShafts, FX_FAR, SwordTrail } from '../gfx/effects.js';
import { buildDecals, buildBanners } from '../gfx/decals.js';
import { BakedProbe } from '../gfx/probe.js';
import { Atmosphere } from './atmosphere.js';
import { CameraRig } from './camera.js';
import { Player } from '../entities/player.js';
import { Enemy, makeBlobShadow } from '../entities/enemy.js';
import { buildMourner, buildPenitent, buildBell } from '../entities/enemy_models.js';
import { Input, GLYPHS } from '../core/input.js';
import { Audio } from '../core/audio.js';
import { Combat } from './combat.js';
import { Fauna } from './fauna.js';
import { Interactables } from './interact.js';
import { NavGrid } from './nav.js';
import { UI } from './ui.js';
import { ITEMS, MSG, AREA_NAMES, NOTES } from './story.js';
import { loadSave, writeSave, clearSave, loadSettings, writeSettings, Inventory } from './save.js';
import { clamp, damp, angleDiff, DEG, formatTime } from '../core/util.js';

const START = { x: -84.6, y: 0, z: -15.8, yaw: Math.PI };

export class Game {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.opts = opts;
    this.THREE = THREE;
    this.time = 0;
    // ajustes guardados de versiones anteriores: se conservan audio y control,
    // pero los gráficos vuelven a los nuevos valores por defecto
    const saved = loadSettings() || {};
    if ((saved.v | 0) < 2) for (const k of ['res', 'snap', 'affine', 'crt']) delete saved[k];
    this.settings = { res: 540, snap: false, affine: 0, crt: 0, sens: 1, invertY: false, brightness: 0, music: 0.7, sfx: 0.9, fps: false, ...saved, v: 2 };
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }));
    r.setPixelRatio(1);
    setMaxAnisotropy(r.capabilities.getMaxAnisotropy());
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.08, 95);
    this.post = new PostPipeline(r);
    this.input = new Input(canvas);
    this.audio = new Audio();

    // mundo
    const t0 = performance.now();
    const lvl = (this.level = buildLevel());
    this.world = { col: lvl.ctx.col, S: lvl.S, C: lvl.C };
    for (const m of lvl.meshes) this.scene.add(m);
    buildDecals(this.scene, lvl.ctx.decals);
    buildBanners(this.scene, lvl.ctx.banners);
    const shafts = new LightShafts(this.scene);
    for (const s of lvl.ctx.shafts) shafts.add(new THREE.Vector3(...s.a), new THREE.Vector3(...s.b), s.w, s.color);
    shafts.build();
    this.fx = {};
    this.fx.fires = new FireSystem(this.scene, 240);
    for (const f of lvl.ctx.fires) this.fx.fires.add(f);
    this.fx.lights = new LightPool(this.scene, 8);
    for (const f of lvl.ctx.fires) if (f.light !== false && f.s >= 0.4) this.fx.lights.add({ x: f.x, y: f.y + 0.6 + f.s * 0.3, z: f.z, intensity: 8 + f.s * 8, range: 8 + f.s * 3 });
    for (const d of lvl.ctx.dynLights) this.fx.lights.add({ ...d, intensity: d.intensity * 2.6, color: d.color ?? 0xff7a30 });
    this.bossLight = new THREE.PointLight(0xff6a20, 0, 14, 1.5);
    this.scene.add(this.bossLight);
    this.fx.ash = new AshSystem(this.scene);
    this.fx.blood = new ParticleBurst(this.scene, 900);
    this.fx.bloodDecals = new DecalPool(this.scene, 'splat', 48, { color: 0x9a8080 });
    this.fx.blood.onLand = (x, y, z) => this.fx.bloodDecals.spawn(x, y, z, 0.35 + Math.random() * 0.5);
    this.fx.healGlow = (p) => this.fx.blood.emit(p.pos.x, p.pos.y + 1.0, p.pos.z, 26, { color: [1, 0.85, 0.5], speed: 1.5, life: 1.0, up: 1.5, gravity: -2 });
    this.fx.dissolve = (e) => {
      for (let i = 0; i < 4; i++) this.fx.blood.emit(e.pos.x, e.pos.y + 0.5 + i * 0.3, e.pos.z, 12, { color: [0.12, 0.1, 0.09], speed: 1.5, life: 1.8, up: 1.2, gravity: -0.8 });
    };

    this.fx.trail = new SwordTrail(this.scene);
    this.fauna = new Fauna(this, { crows: lvl.ctx.crows, rats: lvl.ctx.rats, flies: lvl.ctx.flies });
    this._bb = new THREE.Vector3();
    this._bt = new THREE.Vector3();
    this.atmo = new Atmosphere(this.scene, this.post, this.fx);
    this.atmo.camera = this.camera;
    this.camRig = new CameraRig(this.camera);
    this.player = new Player(this);
    this.scene.add(this.player.obj);
    this.playerShadow = makeBlobShadow(1.2);
    this.scene.add(this.playerShadow);

    // navegación
    this.navSurface = new NavGrid(lvl.S, this.world.col, (x, z) => (x > -13 && x < 13 && z < -61 && z > -108 ? 0.6 : 0));
    this.navCrypt = new NavGrid(lvl.C, this.world.col, (x, z) => (z < -137 ? -10 : -7));

    // enemigos
    this.enemies = lvl.L.enemies.map((s) => new Enemy(this, s));
    this.activeEnemies = [];
    this.bosses = { impaled: this.enemies.find((e) => e.type === 'impaled'), turibulario: this.enemies.find((e) => e.type === 'turibulario') };
    this.activeBoss = null;

    // cada personaje con sus propios materiales: luz horneada del sitio (sonda)
    this.probe = new BakedProbe(lvl.ctx.lights);
    for (const e of this.enemies) e.rig.own();
    this.player.rig.own();

    this.combat = new Combat(this);
    this.interact = new Interactables(this, lvl.L.interact);
    this.ui = new UI(this);
    this.phantoms = lvl.L.phantoms.map((p) => ({ ...p, state: 'wait' }));
    this.buildPhantom();

    this.lockTarget = null;
    this.zone = null;
    this.hitstop = 0;
    this.hurtFlash = 0;
    this.warp = 0;
    this.flash = 0;
    this.state = 'boot';
    this.fade = 0;
    this.fadeTarget = 0;
    this.buildMs = performance.now() - t0;
    this.fps = 0;
    this.newState();

    this.input.onPointerLockLost = () => {
      if (this.state === 'play' && !this.ui.modal && !this.input.freeLook) this.openPause();
    };
    this.canvas.addEventListener('click', () => {
      if (this.state === 'play' && !this.ui.modal) this.input.requestLock();
    });
    this.resize();
    addEventListener('resize', () => this.resize());
    this.applySettings();
  }

  // ------------------------------------------------------------ estado de partida
  newState() {
    this.flags = {};
    this.inventory = new Inventory();
    this.deaths = 0;
    this.playTime = 0;
    this.visited = new Set();
    this.lastAltar = null;
    this.hintsShown = {};
  }

  saveGame() {
    const p = this.player;
    writeSave({
      v: 1,
      flags: this.flags,
      inv: this.inventory.toJSON(),
      maxHp: p.maxHp,
      maxFlasks: p.maxFlasks,
      dmgMul: p.dmgMul,
      lastAltar: this.lastAltar,
      playTime: this.playTime,
      deaths: this.deaths,
      visited: [...this.visited],
      hints: this.hintsShown,
    });
  }

  loadGame(s) {
    this.newState();
    this.flags = s.flags || {};
    this.inventory = new Inventory(s.inv);
    this.deaths = s.deaths || 0;
    this.playTime = s.playTime || 0;
    this.visited = new Set(s.visited || []);
    this.lastAltar = s.lastAltar;
    this.hintsShown = s.hints || {};
    const p = this.player;
    p.maxHp = s.maxHp || 100;
    p.maxFlasks = s.maxFlasks || 3;
    p.dmgMul = s.dmgMul || 1;
  }

  applyWorldState() {
    this.interact.applyFlags(this.flags);
    for (const e of this.enemies) {
      e.reset();
      if (e.boss && this.flags['boss:' + e.type]) {
        e.dead = true;
        e.state = 'dead';
        e.obj.visible = false;
        e.shadow.visible = false;
        if (e.P.censer) e.P.censer.grp.visible = false;
      }
    }
    this.player.setEquipment(this.inventory.has('espada'), this.inventory.has('escudo'));
  }

  // ------------------------------------------------------------ ajustes
  applySettings() {
    const S = this.settings;
    this.input.sens = S.sens;
    this.input.invertY = S.invertY;
    this.atmo.brightness = S.brightness;
    this.audio.setVolumes(S.music, S.sfx);
    if (this.post.internalHeight !== S.res) this.resize();
    G.uSnap.value.set(S.snap ? this.post.w : 0, S.snap ? this.post.h : 0);
    G.uAffine.value = S.affine;
    this.post.blit.uniforms.uCrt.value = S.crt;
    writeSettings(S);
  }

  resize() {
    // lienzo en píxeles físicos para que el escalado entero sea exacto
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.max(2, Math.round(innerWidth * dpr)),
      h = Math.max(2, Math.round(innerHeight * dpr));
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h, this.settings.res);
    G.uSnap.value.set(this.settings.snap ? this.post.w : 0, this.settings.snap ? this.post.h : 0);
    const pix = Math.max(1, this.post.h / 300);
    this.fx.fires.setPixelScale(pix);
    this.fx.ash.mat.uniforms.uPix.value = pix;
    this.fx.blood.mat.uniforms.uPix.value = pix;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------ flujo
  toTitle() {
    this.state = 'title';
    this.ui.closeAll();
    this.ui.showHud(false);
    this.combat.clear();
    this.lockTarget = null;
    this.activeBoss = null;
    this.player.spawn(0, 0, 0, 0);
    this.player.obj.visible = false;
    this.atmo.set('city', true);
    this.fadeTarget = 1;
    this.titleT = 0;
    for (const e of this.enemies) e.reset();
    this.interact.applyFlags({});
    const s = this.ui.open('title', { entries: [] });
    const has = !!loadSave();
    const entries = [];
    if (has) entries.push({ label: 'Continuar', action: () => this.continueGame() });
    entries.push({
      label: 'Nueva partida',
      action: () => {
        if (has)
          this.ui.setMenu(s, [
            { label: 'Empezar de nuevo (se borra el progreso)', action: () => this.newGame() },
            { label: 'Cancelar', action: () => this.ui.setMenu(s, entries) },
          ]);
        else this.newGame();
      },
    });
    entries.push({ label: 'Opciones', action: () => this.ui.open('options') });
    entries.push({ label: 'Controles', action: () => this.ui.open('controls') });
    s.data.entries = entries;
    s.data.ready = false;
    document.getElementById('press').classList.remove('hidden');
    document.getElementById('title-menu').classList.add('hidden');
    this._titleEntries = entries;
  }

  titleActivate() {
    const s = this.ui.top;
    if (!s || s.name !== 'title' || s.data.ready) return;
    s.data.ready = true;
    s.fresh = true;
    this.audio.init();
    this.audio.music('title');
    document.getElementById('press').classList.add('hidden');
    this.ui.renderMenu(s);
    this.audio.ui('confirm');
  }

  newGame() {
    clearSave();
    this.newState();
    const p = this.player;
    p.maxHp = 100;
    p.maxFlasks = 3;
    p.dmgMul = 1;
    this.applyWorldState();
    this.ui.closeAll();
    this.audio.stopMusic();
    this.state = 'intro';
    this.fadeTarget = 0;
    this.player.obj.visible = true;
    this.player.spawn(START.x, START.y, START.z, START.yaw);
    this.player.hp = p.maxHp;
    this.player.flasks = p.maxFlasks;
    this.camRig.snapTo(this.player);
    this.camRig.yaw = -2.5;
    this.camRig.pitch = 0.62;
    this.story(MSG.intro, () => this.beginPlay(true));
  }

  continueGame() {
    const s = loadSave();
    if (!s) return this.newGame();
    this.loadGame(s);
    this.applyWorldState();
    this.ui.closeAll();
    this.audio.stopMusic();
    this.player.obj.visible = true;
    this.respawnAtAltar();
    this.fade = 0;
    this.fadeTarget = 1;
    this.beginPlay(false);
  }

  story(lines, done) {
    const s = this.ui.open('story', { skippable: true });
    const box = document.getElementById('story-lines');
    box.innerHTML = '';
    const els = lines.map((l, i) => {
      const d = document.createElement('div');
      d.className = 'line' + (i === 0 ? ' big' : '');
      if (i === 0) d.innerHTML = this.ui.gothicHtml(l);
      else d.textContent = l;
      box.appendChild(d);
      return d;
    });
    let finished = false;
    const end = () => {
      if (finished) return;
      finished = true;
      this.ui.close();
      done();
    };
    s.data.onSkip = end;
    els.forEach((el, i) => setTimeout(() => el.classList.add('show'), 600 + i * 1800));
    setTimeout(() => this.audio.play('bellToll', null), 400);
    setTimeout(() => els.forEach((el) => el.classList.remove('show')), 600 + lines.length * 1800 + 1600);
    setTimeout(end, 600 + lines.length * 1800 + 3200);
  }

  beginPlay(fromIntro) {
    this.state = 'play';
    this.ui.showHud(true);
    this.fadeTarget = 1;
    this.zone = null;
    if (fromIntro) {
      this.player.startWake();
      this.camRig.snapTo(this.player);
      this.introCam = true;
      this.camRig.override = { pos: new THREE.Vector3(-83.1, 3.2, -13.95), look: new THREE.Vector3(-84.7, 0.4, -15.9), speed: 30 };
      this.camRig.cam.position.copy(this.camRig.override.pos);
      setTimeout(() => this.hint('start'), 3800);
    }
    this.input.requestLock();
  }

  respawnAtAltar() {
    const a = this.lastAltar && this.interact.list.find((i) => i.id === this.lastAltar);
    const p = this.player;
    if (a) p.spawn(a.spawn[0], a.spawn[1], a.spawn[2], a.yaw);
    else p.spawn(START.x, START.y, START.z, START.yaw);
    p.hp = p.maxHp;
    p.st = p.maxSt;
    p.flasks = p.maxFlasks;
    this.camRig.snapTo(p);
    this.lockTarget = null;
    this.fauna.reset();
  }

  openPause() {
    if (this.ui.modal) return;
    this.state = 'paused';
    const s = this.ui.menu('pause', [
      { label: 'Continuar', action: () => this.ui.close() },
      { label: 'Inventario', action: () => this.ui.open('inv') },
      { label: 'Mapa', action: () => this.ui.open('map') },
      { label: 'Opciones', action: () => this.ui.open('options') },
      { label: 'Controles', action: () => this.ui.open('controls') },
      {
        label: 'Salir al título',
        action: () => {
          this.saveGame();
          this.toTitle();
        },
      },
    ]);
    s.data.onBack = () => this.ui.close();
    s.data.onClose = () => {
      if (this.state === 'paused') {
        this.state = 'play';
        this.input.requestLock();
      }
    };
  }

  openOverlay(name) {
    if (this.ui.modal) return;
    this.state = 'paused';
    this.ui.open(name, {
      onClose: () => {
        if (this.state === 'paused') {
          this.state = 'play';
          this.input.requestLock();
        }
      },
    });
  }

  // ------------------------------------------------------------ eventos de juego
  hint(id) {
    if (this.hintsShown[id]) return;
    this.hintsShown[id] = true;
    const d = this.input.device;
    const k = (a) => `[${GLYPHS[d][a]}]`;
    const H = {
      start: `${k('interact')} Interactuar  ·  Busca una salida de la cárcel.`,
      sword: `${k('light')} Ataque ligero  ·  ${k('heavy')} Ataque pesado  ·  ${k('dodge')} Esquivar (mantén para correr)`,
      shield: `${k('block')} Mantén para bloquear con el escudo.`,
      enemy: `${k('lock')} Fijar objetivo  ·  ${k('heal')} Beber una ampolla`,
      altar: `Descansar cura y rellena las ampollas, pero las criaturas vuelven a levantarse.`,
      map: `${k('map')} Mapa  ·  ${k('inventory')} Inventario y documentos`,
    };
    // las pistas se muestran de una en una
    this.hintQ = this.hintQ || [];
    this.hintQ.push(H[id]);
    if (!this._hintBusy) this._nextHint();
  }
  _nextHint() {
    const h = this.hintQ.shift();
    if (!h) {
      this._hintBusy = false;
      return;
    }
    this._hintBusy = true;
    this.ui.toast(h, 5.5);
    setTimeout(() => this._nextHint(), 6200);
  }

  giveItem(id) {
    const p = this.player;
    this.inventory.add(id);
    const it = ITEMS[id];
    if (id === 'espada' || id === 'escudo') p.setEquipment(this.inventory.has('espada'), this.inventory.has('escudo'));
    if (it.upgrade === 'flask') {
      p.maxFlasks++;
      p.flasks++;
    } else if (it.upgrade === 'hp') {
      p.maxHp += 25;
      p.hp += 25;
    } else if (it.upgrade === 'dmg') p.dmgMul += 0.25;
    this.ui.showItem(id);
    this.state = 'paused';
    const s = this.ui.top;
    s.data.onClose = () => {
      if (this.state === 'paused') this.state = 'play';
      if (id === 'espada') {
        this.hint('sword');
        // algo se levanta en la celda del fondo
        const e = this.enemies.find((x) => x.id === 'e_carcel1');
        if (e && !e.dead && !e.aware) setTimeout(() => e.alert(), 1200);
      }
      if (id === 'escudo') this.hint('shield');
      if (id === 'palanca') this.hint('map');
    };
    this.saveGame();
  }

  tryInteract() {
    const it = this.promptTarget;
    this.promptTarget = null;
    if (!it || (it.done && (it.kind === 'item' || it.kind === 'door'))) return;
    this.interact.use(it);
  }

  restAt(it) {
    const p = this.player;
    this.lastAltar = it.id;
    this.flags['altar:' + it.id] = true;
    p.startRest();
    p.hp = p.maxHp;
    p.flasks = p.maxFlasks;
    p.st = p.maxSt;
    this.audio.play('rest');
    this.ui.toast(MSG.rest, 4);
    this.lockTarget = null;
    this.fadeTarget = 0.55;
    setTimeout(() => (this.fadeTarget = 1), 900);
    for (const e of this.enemies) if (!e.boss) e.reset();
    this.fauna.reset();
    this.combat.clear();
    this.saveGame();
    setTimeout(() => this.hint('altar'), 1500);
  }
  onLeaveRest() {}

  fogActive(it) {
    const b = this.bosses[it.boss];
    return !(this.flags['boss:' + it.boss] || (b && b.dead));
  }

  enterFog(it) {
    const p = this.player;
    const b = this.bosses[it.boss];
    if (!b || b.dead) return;
    this.audio.play('fog');
    // cruzar la niebla
    const dir = it.enter ?? -1;
    if (it.axis === 'x') p.body.pos.z = it.z + dir * 2.2;
    else p.body.pos.x = it.x + dir * 2.2;
    p.body.pos.y = this.world.col.groundHeight(p.body.pos.x, p.body.pos.z, 0.3, p.body.pos.y + 1);
    p.visY = p.body.pos.y;
    p.yaw = it.axis === 'x' ? (dir < 0 ? Math.PI : 0) : dir < 0 ? -Math.PI / 2 : Math.PI / 2;
    this.camRig.snapTo(p);
    if (!this.activeBoss) this.startBoss(b);
  }

  startBoss(b) {
    this.activeBoss = b;
    const p = this.player.pos;
    const dx = p.x - b.pos.x,
      dz = p.z - b.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    // cámara entre el jefe y el jugador, ligeramente de lado, sin atravesar muros
    const want = Math.min(d * 0.7, b.T.height * 2.2 + 2);
    const dir = new THREE.Vector3(dx / d + (-dz / d) * 0.45, 0, dz / d + (dx / d) * 0.45).normalize();
    const eyeY = b.pos.y + b.T.height * 0.55;
    const hit = this.world.col.raycast(b.pos.x, eyeY, b.pos.z, dir.x, 0, dir.z, want, (bx) => bx.cam !== false && bx.tag !== 'fog');
    const dist = hit === Infinity ? want : Math.max(2.5, hit - 0.5);
    const camPos = new THREE.Vector3(b.pos.x + dir.x * dist, eyeY - 0.4, b.pos.z + dir.z * dist);
    this.cinematic(b.type === 'turibulario' ? 3.4 : 2.0, camPos, new THREE.Vector3(b.pos.x, b.pos.y + b.T.height * 0.65, b.pos.z));
    b.aware = true;
    b.state = 'alert';
    b.stT = 0;
    if (b.T.clips.alert) b.anim.play(b.T.clips.alert, { blend: 0.1 });
    this.audio.enemyVoice(b, 'alert');
    this.audio.music('boss');
    this.ui.area(b.T.name);
  }

  onBossPhase(b) {
    this.audio.music('boss2');
    this.camRig.shake(0.6);
    this.flash = 0.5;
    if (b.type === 'turibulario') this.atmo.override = { fog: 0x2a0806, vol: 0.05, bloom: 1.6 };
  }

  onEnemyAlert(e) {
    if (!this.hintsShown.enemy && this.inventory.has('espada')) setTimeout(() => this.hint('enemy'), 600);
    if (!e.boss && Math.random() < 0.35) this.audio.play('stinger');
  }

  onEnemyDeath(e) {
    if (this.lockTarget === e) this.lockTarget = null;
    if (e.boss) {
      this.flags['boss:' + e.type] = true;
      this.activeBoss = null;
      this.audio.stopMusic();
      this.audio.play('victory');
      this.atmo.override = null;
      setTimeout(() => {
        this.ui.area(e.type === 'impaled' ? 'EL EMPALADO HA CAÍDO' : 'EL TURIFERARIO HA CAÍDO');
        this.interact.applyFlags(this.flags);
        for (const it of this.interact.list) if (it.kind === 'door' && it.lock.type === 'boss' && it.lock.boss === e.type) this.interact.setOpen(it), (this.flags['door:' + it.id] = true);
        this.saveGame();
      }, 2500);
      if (e.type === 'turibulario') this.bossLight.intensity = 0;
    }
  }

  onPlayerDeath() {
    this.deaths++;
    this.lockTarget = null;
    this.audio.play('death');
    this.audio.stopMusic();
    setTimeout(() => {
      document.getElementById('death').classList.remove('hidden');
      requestAnimationFrame(() => document.getElementById('death').classList.add('show'));
    }, 1400);
    setTimeout(() => (this.fadeTarget = 0), 4600);
    setTimeout(() => {
      document.getElementById('death').classList.remove('show');
      document.getElementById('death').classList.add('hidden');
      this.respawn();
    }, 6400);
  }

  respawn() {
    this.cine = null;
    const b = this.activeBoss;
    this.activeBoss = null;
    this.atmo.override = null;
    this.combat.clear();
    for (const e of this.enemies) if (!(e.boss && this.flags['boss:' + e.type])) e.reset();
    this.respawnAtAltar();
    this.fadeTarget = 1;
    this.saveGame();
  }

  onTrigger(it) {
    if (it.event === 'ending') this.ending();
  }

  ending() {
    this.state = 'ending';
    this.lockTarget = null;
    const p = this.player;
    p.state = 'free';
    p.autoDir = { x: 0.05, z: -1, m: 0.42 };
    p.blocking = false;
    this.audio.music('ending');
    this.flags.finished = true;
    this.saveGame();
    this.camRig.override = { pos: new THREE.Vector3(p.pos.x + 2.6, p.pos.y + 1.4, p.pos.z + 3.5), look: new THREE.Vector3(p.pos.x, p.pos.y + 3.5, p.pos.z - 40), speed: 0.5 };
    setTimeout(() => {
      this.ui.showHud(false);
      this.post.U.uFadeColor.value.setRGB(1, 0.92, 0.82);
      this.fadeTarget = 0;
    }, 5000);
    setTimeout(() => {
      this.player.autoDir = null;
      const s = this.ui.open('ending', { ready: false, onDone: () => location.reload() });
      const body = document.getElementById('ending-body');
      const pc = body.querySelector('canvas.pxbg');
      body.innerHTML = `
        <div class="f-bast" style="margin:0 auto">Al amanecer, el río Este arrastraba ceniza hacia el mar.<br>Detrás de ti, las campanas de Braga siguieron tocando solas.<br>Nadie volvió a entrar en la ciudad.</div>
        <div style="display:grid;place-items:center;margin-top:calc(var(--u) * 6)">${this.ui.inkTitleHtml()}</div>
        <div class="stats f-hand"><span>Tiempo</span><b>${formatTime(this.playTime)}</b><span>Muertes</span><b>${this.deaths}</b><span>Documentos</span><b>${Object.keys(this.flags).filter((k) => k.startsWith('note:')).length} / ${Object.keys(NOTES).length}</b></div>
        <div class="credit f-hand">Todo en este juego (geometría, texturas, luz, sonido y música) se genera por código.</div>
        <div class="hint f-hand"><span>${this.ui.keyHtml('confirm')} Volver al título</span></div>`;
      if (pc) body.prepend(pc);
      body._pxRedraw && body._pxRedraw();
      setTimeout(() => (s.data.ready = true), 2500);
    }, 8500);
  }

  // ------------------------------------------------------------ fantasmas en la niebla
  buildPhantom() {
    // siluetas negras que se desvanecen al acercarse (varias formas)
    const black = new THREE.MeshBasicMaterial({ color: 0x080808, fog: true });
    this.phantomRigs = {};
    for (const [k, fn] of Object.entries({ mourner: buildMourner, penitent: buildPenitent, bell: buildBell })) {
      const r = fn();
      for (const m of r.meshes) m.material = black;
      r.root.visible = false;
      this.scene.add(r.root);
      this.phantomRigs[k] = r;
    }
  }
  updatePhantoms(dt) {
    const p = this.player.pos;
    let showing = null;
    for (const ph of this.phantoms) {
      if (ph.state === 'done') continue;
      if (ph.state === 'wait') {
        const d = Math.hypot(p.x - ph.trigger[0], p.z - ph.trigger[2]);
        if (d < 10 && Math.abs(p.y - ph.trigger[1]) < 4) {
          ph.state = 'show';
          ph.t = 0;
        }
      }
      if (ph.state === 'show') {
        ph.t += dt;
        const d = Math.hypot(p.x - ph.x, p.z - ph.z);
        if (d < 12 || ph.t > 8) {
          ph.state = 'done';
          if (d < 12) this.audio.play('stinger');
        } else showing = ph;
      }
    }
    for (const [k, r] of Object.entries(this.phantomRigs)) {
      const on = showing && (showing.kind || 'mourner') === k;
      r.root.visible = !!on;
      if (!on) continue;
      r.root.position.set(showing.x, showing.y + (k === 'mourner' ? 0.3 : 0), showing.z);
      r.root.rotation.y = Math.atan2(p.x - showing.x, p.z - showing.z);
      const t = this.time;
      r.apply({ chest: [0.25, 0, Math.sin(t * 0.7) * 0.06], head: [0.35, 0, 0.35 + Math.sin(t * 0.5) * 0.1], armL: [0, 0, 0.05], armR: [0, 0, -0.05] });
    }
  }

  // Plano cinematográfico breve (cámara fija, control bloqueado).
  cinematic(dur, pos, look) {
    this.cine = { t: 0, dur, pos: pos.clone(), look: look.clone() };
    this.lockTarget = null;
  }

  // ------------------------------------------------------------ fijado de objetivo
  // ¿Se ve a la criatura? (desde el pecho del jugador o desde la cámara; un
  // barril en medio no debe impedir fijar)
  canSee(e) {
    const p = this.player.pos,
      c = this.camera.position,
      col = this.world.col;
    const ty = e.pos.y + Math.min(e.lockHeight, 1.6);
    return col.lineOfSight(p.x, p.y + 1.5, p.z, e.pos.x, ty, e.pos.z) || col.lineOfSight(c.x, c.y, c.z, e.pos.x, e.pos.y + e.lockHeight, e.pos.z);
  }

  // Candidato a fijar: el más centrado en la vista y cercano. Con dirSign
  // (±1) busca el siguiente a la derecha/izquierda del actual en pantalla.
  findTarget(exclude = null, dirSign = 0) {
    const p = this.player,
      cam = this.camera;
    cam.updateMatrixWorld();
    const fwd = this._fwd || (this._fwd = new THREE.Vector3());
    fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const camYaw = Math.atan2(fwd.x, fwd.z);
    const v = this._pv || (this._pv = new THREE.Vector3());
    let curX = 0;
    if (dirSign && exclude) curX = v.set(exclude.pos.x, exclude.pos.y + exclude.lockHeight, exclude.pos.z).project(cam).x;
    let best = null,
      bs = 1e9;
    for (const e of this.activeEnemies) {
      if (!e.lockable || e === exclude) continue;
      const dx = e.pos.x - p.pos.x,
        dz = e.pos.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 20 || Math.abs(e.pos.y - p.pos.y) > 6) continue;
      // ángulo entre la vista y la dirección jugador -> criatura
      const a = Math.abs(angleDiff(camYaw, Math.atan2(dx, dz)));
      let score;
      if (dirSign) {
        v.set(e.pos.x, e.pos.y + e.lockHeight, e.pos.z).project(cam);
        if (v.z > 1 || Math.abs(v.x) > 1.3) continue;
        const sx = v.x - curX;
        if (Math.sign(sx) !== dirSign || Math.abs(sx) < 0.02) continue;
        score = Math.abs(sx) * 10 + d * 0.08;
      } else {
        // delante de la cámara (o pegada al jugador aunque quede de lado)
        if (a > 80 * DEG && d > 3) continue;
        score = a * 3.0 + d * 0.12;
      }
      if (score >= bs) continue;
      if (!this.canSee(e)) continue;
      bs = score;
      best = e;
    }
    return best;
  }

  setLock(t) {
    if (this.lockTarget === t) return;
    this.lockTarget = t;
    this._lostT = 0;
    this._seen = true;
  }

  updateLock(dt) {
    const inp = this.input;
    if (inp.pressed('lock')) {
      if (this.lockTarget) this.setLock(null);
      else {
        const t = this.findTarget();
        if (t) this.setLock(t);
        // sin nada que fijar: la cámara vuelve suavemente detrás del jugador
        else this.camRig.recenter(this.player.yaw);
      }
      this.audio.ui(this.lockTarget ? 'lock' : 'move');
    }
    const t = this.lockTarget;
    if (!t) return;
    const d = t.distTo(this.player.pos);
    if (t.dead || !t.lockable) {
      // al morir, pasa a la criatura más cercana si la hay
      const n = t.dead ? this.findTarget(t) : null;
      this.setLock(n && n.distTo(this.player.pos) < 12 ? n : null);
      return;
    }
    if (d > 24 || Math.abs(t.pos.y - this.player.pos.y) > 7) {
      this.setLock(null);
      return;
    }
    // si se pierde de vista un buen rato, se suelta
    this._losT = (this._losT || 0) - dt;
    if (this._losT <= 0) {
      this._losT = 0.25;
      this._seen = this.canSee(t);
    }
    this._lostT = this._seen ? 0 : (this._lostT || 0) + dt;
    if (this._lostT > 2.5) {
      this.setLock(null);
      return;
    }
    // cambiar de objetivo con un golpe de ratón / stick
    this._flickT = (this._flickT || 0) - dt;
    const f = inp.flick();
    if (f && this._flickT <= 0) {
      const n = this.findTarget(t, f);
      if (n) {
        this.setLock(n);
        this.audio.ui('lock');
      }
      this._flickT = 0.3;
    }
  }

  // ------------------------------------------------------------ actualización
  update(dt) {
    this.input.update(dt);
    const inp = this.input;
    if (inp.anyPressed) this.audio.init();
    // pantalla de título
    if (this.state === 'title') {
      if (inp.anyPressed) this.titleActivate();
      this.titleT += dt;
      const a = this.titleT * 0.035 + 0.6;
      this.camRig.override = { pos: new THREE.Vector3(Math.sin(a) * 13, 4.2 + Math.sin(this.titleT * 0.2) * 0.4, Math.cos(a) * 13), look: new THREE.Vector3(0, 2.5, 0), speed: 2 };
    } else if (this.introCam) {
      // plano fijo del despertar; al levantarse, la cámara pasa detrás del jugador
      if (this.player.state !== 'wake') {
        this.introCam = false;
        const c = this.camRig.cam.position;
        this.camRig.yaw = Math.atan2(this.player.pos.x - c.x, this.player.pos.z - c.z);
        this.camRig.pitch = 0.5;
        this.camRig.curDist = 2;
        this.camRig.override = null;
      } else this.camRig.override.look.set(-84.7, 0.4 + Math.min(1, this.player.stT / 3.4) * 1.1, -15.9);
    } else if (this.cine) {
      this.cine.t += dt;
      this.camRig.override = { pos: this.cine.pos, look: this.cine.look, speed: 4 };
      if (this.cine.t >= this.cine.dur) {
        this.cine = null;
        this.camRig.override = null;
        this.camRig.snapTo(this.player);
        const b = this.activeBoss;
        if (b) this.camRig.yaw = Math.atan2(b.pos.x - this.player.pos.x, b.pos.z - this.player.pos.z);
      }
    } else if (this.state !== 'ending') this.camRig.override = null;

    if (this.hitstop > 0) {
      this.hitstop -= dt;
      dt *= 0.05;
    }
    this.time += dt;
    G.uTime.value = this.time;
    // si había una pantalla abierta, su entrada no debe llegar al juego este fotograma
    const hadModal = this.ui.modal;
    this.ui.update(dt);
    if (this.ui.modal) this.promptTarget = null;

    const p = this.player;
    const playing = this.state === 'play' && !this.ui.modal && !hadModal;
    if (playing) {
      this.playTime += dt;
      if (inp.pressed('pause')) this.openPause();
      else if (inp.pressed('inventory')) this.openOverlay('inv');
      else if (inp.pressed('map')) this.openOverlay('map');
    }
    if (this.state === 'paused' && !this.ui.modal) this.state = 'play';

    const simulate = this.state === 'play' || this.state === 'intro' || this.state === 'ending' || this.state === 'title';
    if (simulate && !this.ui.modal) {
      const control = this.state === 'play' && !p.dead && !hadModal && !this.cine;
      if (this.state === 'play' || this.state === 'ending') {
        p.update(dt, inp, this.camRig, control);
        if (control) this.updateLock(dt);
      }
      // estela de la espada
      if (p.hasSword && p.obj.visible) {
        const sj = p.rig.joints.sword;
        sj.updateWorldMatrix(true, false);
        this._bb.copy(p.bladeBase).applyMatrix4(sj.matrixWorld);
        this._bt.copy(p.bladeTip).applyMatrix4(sj.matrixWorld);
        this.fx.trail.update(this.time, this._bb, this._bt, p.swinging);
      }
      // enemigos activos
      this._actT = (this._actT || 0) - dt;
      if (this._actT <= 0) {
        this._actT = 0.4;
        this.activeEnemies = this.enemies.filter((e) => {
          const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
          const lvl = Math.abs(e.pos.y - p.pos.y) < 14;
          const act = (d < 46 && lvl) || e === this.activeBoss || (e.aware && !e.dead && d < 70);
          e.obj.visible = (e.state !== 'dead' || e.stT < 5.5) && d < Math.min(90, this.camera.far + 6) && lvl && !(e.boss && e.dead && this.flags['boss:' + e.type] && e.stT > 5);
          return act;
        });
      }
      if (this.state === 'play') for (const e of this.activeEnemies) e.update(dt, p);
      else if (this.state === 'title') for (const e of this.activeEnemies) e.animate(dt);
      this.updateProbes(dt);
      this.fauna.update(dt, this.state === 'title' ? null : p, this.time);
      this.combat.update(dt);
      this.interact.update(dt);
      if (this.state === 'play') {
        this.interact.triggers(p);
        this.promptTarget = p.state === 'free' && !p.dead ? this.interact.nearest(p) : null;
        this.updatePhantoms(dt);
      } else this.promptTarget = null;
      if (p.pos.y < -40 && !p.dead) p.die();
      if (p.autoDir && p.pos.z < -211.5) p.autoDir = null;
    }
    // cámara
    this.camRig.update(dt, inp, p, this.state === 'play' ? this.lockTarget : null, this.world.col, this.state === 'play' && !this.ui.modal && !p.dead && !this.cine);

    // zona y atmósfera
    if (this.state !== 'title') {
      const z = this.zoneAt(p.pos);
      if (z && z !== this.zone) {
        this.zone = z;
        this.atmo.set(z.atmo);
        this.audio.setZone(z.atmo);
        this.audio.surface = z.atmo === 'interior' || z.atmo === 'chapel' ? 'wood' : z.id === 'castle' || z.id === 'tanners' || z.id === 'river' || z.id === 'cloister' ? 'dirt' : 'stone';
        if (!this.visited.has(z.id)) {
          this.visited.add(z.id);
          if (AREA_NAMES[z.id] && this.state === 'play' && !this.activeBoss) this.ui.area(AREA_NAMES[z.id]);
        } else if (AREA_NAMES[z.id] && this.state === 'play' && z.id !== this._lastArea && (z.atmo !== 'interior' || z.id === 'canon')) {
          if (this.time - (this._areaT || 0) > 20) this.ui.area(AREA_NAMES[z.id]);
        }
        this._lastArea = z.id;
        this._areaT = this.time;
        if (z.id === 'largo' && !this.flags.bellLargo) {
          this.flags.bellLargo = true;
          this.audio.play('bellToll', { x: 9, y: 18, z: -60 });
        }
      }
    } else this.audio.setZone('city');
    this.atmo.update(dt, p);


    // miedo: criaturas cercanas -> estática del relicario y grano en pantalla
    let fear = 0;
    if (this.state === 'play') {
      for (const e of this.activeEnemies) {
        if (e.dead || Math.abs(e.pos.y - p.pos.y) > 5) continue;
        const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
        fear = Math.max(fear, Math.max(0, 1 - d / (e.boss ? 30 : 18)) * (e.aware ? 1 : 0.7));
      }
    }
    this.fear = damp(this.fear || 0, fear, 2, dt);
    this.post.U.uGrain.value = 0.045 + this.fear * this.fear * 0.09;

    // postproceso: daño, salud baja, destellos, fundido
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.2);
    this.warp = Math.max(0, this.warp - dt * 1.5);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    const U = this.post.U;
    U.uHurt.value = this.hurtFlash;
    U.uLowHp.value = this.state === 'play' ? clamp(1 - p.hp / (p.maxHp * 0.3), 0, 1) : 0;
    U.uDesat.value = p.dead ? 0.8 : U.uLowHp.value * 0.4;
    U.uWarp.value = this.warp;
    U.uFlash.value = this.flash;
    U.uFlashColor.value.setRGB(1, 0.6, 0.3);
    this.fade = damp(this.fade, this.fadeTarget, this.fadeTarget < this.fade ? 2.2 : 1.4, dt);
    U.uFade.value = this.fade;
    if (this.state !== 'ending') U.uFadeColor.value.setRGB(0, 0, 0);

    // HUD
    if (this.state === 'play' || this.state === 'paused') this.ui.updateHud(dt);
    this.playerShadow.position.set(p.pos.x, p.pos.y + 0.02, p.pos.z);
    this.playerShadow.visible = p.obj.visible;
    this.audio.update(dt, this);
    inp.endFrame();
  }

  // Luz horneada del lugar para el jugador y las criaturas visibles (suavizada).
  updateProbes(dt) {
    this._probeT = (this._probeT || 0) - dt;
    if (this._probeT > 0) return;
    this._probeT = 0.1;
    const wb = this.level.ctx.wb;
    const upd = (e, instant) => {
      if (!e.obj.visible) return;
      const P = e.pos;
      const z = this.zoneAt(P);
      const rid = z && z.room ? wb.roomId(z.room) : 0;
      const o = this.probe.sample(P.x, P.y + 1.1, P.z, rid);
      const q = e._probe || (e._probe = [o[0], o[1], o[2]]);
      const k = instant ? 1 : 0.35;
      for (let i = 0; i < 3; i++) q[i] += (o[i] - q[i]) * k;
      const gy = e.shadow ? e.shadow.position.y - 0.02 : P.y;
      e.rig.setProbe(q[0], q[1], q[2], gy);
    };
    upd(this.player, false);
    for (const e of this.activeEnemies) upd(e, !e._probe);
  }

  zoneAt(p) {
    for (const z of this.level.L.zones) {
      for (const r of z.rects) {
        if (p.x >= r[0] && p.x <= r[2] && p.z >= r[1] && p.z <= r[3] && p.y >= r[4] && p.y <= r[5]) return z;
      }
    }
    return null;
  }

  render() {
    const c = this.camera.position;
    // los efectos se dibujan hasta donde llega la niebla y se funden antes
    FX_FAR.value = Math.min(80, this.camera.far);
    if (!this._fireT || this.time - this._fireT > 0.25 || this.time < this._fireT) {
      this._fireT = this.time;
      this.fx.fires.refresh(c.x, c.z, FX_FAR.value + 2);
    }
    const lp = this.state === 'title' ? c : this.player.pos;
    this.fx.lights.update(lp.x, lp.y + 1, lp.z, this.time);
    this.fx.ash.update(c);
    this.fx.blood.update(1 / 60, (x, y, z) => this.world.col.groundHeight(x, z, 0.05, y + 0.3));
    this.post.render(this.scene, this.camera, this.time);
  }
}
