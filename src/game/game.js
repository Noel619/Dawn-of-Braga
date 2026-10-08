// Orquestación del juego: bucle, estados y sistemas.
import * as THREE from 'three';
import { buildLevel } from '../world/level.js';
import { PostPipeline } from '../gfx/post.js';
import { G, registerMaterialPatch } from '../gfx/materials.js';
import { setMaxAnisotropy } from '../gfx/textures.js';
import { FireSystem, LightPool, AshSystem, ParticleBurst, DecalPool, LightShafts, FX_FAR, SwordTrail } from '../gfx/effects.js';
import { buildDecals, buildBanners } from '../gfx/decals.js';
import { BakedProbe } from '../gfx/probe.js';
import { Atmosphere } from './atmosphere.js';
import { CameraRig } from './camera.js';
import { Player } from '../entities/player.js';
import { WEAPONS, WEAPON_ORDER } from '../entities/weapons.js';
import { Enemy, makeBlobShadow } from '../entities/enemy.js';
import { buildMourner, buildPenitent, buildBell } from '../entities/enemy_models.js';
import { Input, GLYPHS } from '../core/input.js';
import { Audio } from '../core/audio.js';
import { Combat } from './combat.js';
import { Fauna } from './fauna.js';
import { Interactables } from './interact.js';
import { NavGrid } from './nav.js';
import { WalkGrid } from '../world/walkgrid.js';
import { UI } from './ui.js';
import { ITEMS, MSG, AREA_NAMES, NOTES } from './story.js';
import { loadSave, writeSave, clearSave, loadSettings, writeSettings, Inventory } from './save.js';
import { clamp, damp, angleDiff, DEG, formatTime } from '../core/util.js';
import { CANON, stairY } from '../world/level_canon.js';
import { CellarCutscene } from './cutscene.js';
import { Breakables } from './breakables.js';
import { CellarHunt } from './hunt.js';
import { Waters } from '../gfx/water.js';
import { CELLAR } from '../world/level_cellar.js';
import { CASTLE } from '../world/level_castle.js';
import { RIVER } from '../world/level_sacred.js';
import { DevMode } from '../dev/devmode.js';
import { QTE } from './qte.js';
import { BeastChase } from './beast_chase.js';
import { ColossusBank } from '../entities/colossus/bank.js';
import { Finale } from './finale/director.js';

// en la celda de las mazmorras del castillo
const START = CASTLE.start;
// el plano fijo del despertar: desde el fondo de la celda; al levantarse,
// la reja reventada y el pasillo quedan delante
const WAKE_CAM = { pos: [START.x - 1.0, START.y + 2.0, START.z - 1.45], look: [START.x + 0.2, START.y + 0.4, START.z + 0.6] };
// música de cada jefe (fase 1 y fase 2)
const BOSS_MUSIC = { impaled: ['boss', 'boss2'], turibulario: ['bossFinal', 'bossFinal2'], descoyuntado: ['bossCellar', 'bossCellar2'] };

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
    const banners = buildBanners(this.scene, lvl.ctx.banners);
    const shafts = new LightShafts(this.scene);
    for (const s of lvl.ctx.shafts) shafts.add(new THREE.Vector3(...s.a), new THREE.Vector3(...s.b), s.w, s.color);
    shafts.build();
    // agua de la cisterna y del pozo
    this.waters = new Waters(this, lvl.ctx.waters || []);
    this.fx = {};
    this.fx.fires = new FireSystem(this.scene, 240);
    // grupos del mundo que se ocultan juntos (ver level.js: beginGroup)
    this.groups = {};
    const grp = (name) => this.groups[name] || (this.groups[name] = { meshes: [], boxes: [], fires: [], lights: [], on: true });
    for (const m of lvl.meshes) if (m.userData.group) grp(m.userData.group).meshes.push(m);
    for (const m of banners) if (m.userData.group) grp(m.userData.group).meshes.push(m);
    for (const b of lvl.ctx.col.boxes) if (b.group) grp(b.group).boxes.push(b);
    for (const f of lvl.ctx.fires) {
      const e = this.fx.fires.add(f);
      // (los de un grupo no se purgan al apagarse: vuelven al mostrarlo)
      if (f.group) {
        e.keep = true;
        grp(f.group).fires.push(e);
      }
    }
    this.fx.lights = new LightPool(this.scene, 8);
    for (const f of lvl.ctx.fires) if (f.light !== false && f.s >= 0.4) {
      const l = this.fx.lights.add({ x: f.x, y: f.y + 0.6 + f.s * 0.3, z: f.z, intensity: 8 + f.s * 8, range: 8 + f.s * 3 });
      if (f.group) grp(f.group).lights.push(l);
    }
    for (const d of lvl.ctx.dynLights) {
      const l = this.fx.lights.add({ ...d, intensity: d.intensity * 2.6, color: d.color ?? 0xff7a30 });
      if (d.group) grp(d.group).lights.push(l);
    }
    this.bossLight = new THREE.PointLight(0xff6a20, 0, 14, 1.5);
    this.scene.add(this.bossLight);
    // las ruinas de la nave y de la fachada, ocultas hasta que revientan
    this.setGroupVisible('naveRuin', false);
    this.setGroupVisible('fachadaRuin', false);
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
    this.navDungeon = new NavGrid(lvl.D, this.world.col, () => CASTLE.dun.y);
    // los pisos altos de la torre del homenaje, con sus muros y tabiques
    {
      const K = CASTLE.keep;
      this.navKeep = [K.F1, K.F2].map((fy) => {
        const w = new WalkGrid(K.x0, K.z0, K.x1, K.z1, 0.5);
        w.paint(K.x0 + K.t, K.z0 + K.t, K.x1 - K.t, K.z1 - K.t, 1);
        return new NavGrid(w, this.world.col, () => fy);
      });
    }
    // (con holgura para el cuerpo del Descoyuntado: no se atasca en pilares ni arcos)
    // (la altura de la escalera, sólo en su hueco: la celda del canónigo, al
    // lado, está a ras de la bodega)
    const S = CANON.stair;
    this.navCellar = new NavGrid(lvl.B, this.world.col, (x, z) => (z > S.bottom && x > S.x - S.w / 2 - 0.1 && x < S.x + S.w / 2 + 0.1 ? stairY(z) : CANON.cellar.y), { pad: 0.7 });

    // enemigos
    this.enemies = lvl.L.enemies.map((s) => new Enemy(this, s));
    this.activeEnemies = [];
    this.bosses = {};
    for (const e of this.enemies) if (e.boss) this.bosses[e.type] = e;
    this.activeBoss = null;

    // cada personaje con sus propios materiales: luz horneada del sitio (sonda)
    this.probe = new BakedProbe(lvl.ctx.lights);
    for (const e of this.enemies) e.rig.own();
    this.player.rig.own();
    // pilares y estantes de las bodegas
    this.breakables = new Breakables(this, lvl.L.breakables);
    this.navCellar.refresh(CELLAR.bounds[0], CELLAR.bounds[1], CELLAR.bounds[2], CELLAR.bounds[3]);
    // la caza en las bodegas del canónigo
    this.hunt = new CellarHunt(this);
    this.CELLAR = CELLAR; // (para las herramientas de prueba)

    this.combat = new Combat(this);
    this.interact = new Interactables(this, lvl.L.interact);
    // (el rastrillo de la cisterna cierra el paso también a las criaturas)
    this.navCellar.refresh(CELLAR.bounds[0], CELLAR.bounds[1], CELLAR.bounds[2], CELLAR.bounds[3]);
    this.ui = new UI(this);
    // la segunda forma del Empalado y la huida por la muralla norte
    this.qte = new QTE(this);
    this.chase = new BeastChase(this);
    this.beastTransform = (e) => this.chase.transform(e);
    // modo desarrollador (F2; sólo en localhost o desde la IP del autor)
    this.dev = new DevMode(this);
    // los colosos del jefe final: se generan en un hilo de fondo mientras se
    // juega (unos segundos de cálculo que así no se notan)
    this.colossi = new ColossusBank();
    setTimeout(() => this.colossi.warm(), 1500);
    // el jefe final (el Turiferario coloso y Deo Ignoto): su guion
    this.finale = new Finale(this);
    this.extraTargets = null;
    this.phantoms = lvl.L.phantoms.map((p) => ({ ...p, state: 'wait' }));
    this.buildPhantom();

    this.lockTarget = null;
    this.zone = null;
    this.hitstop = 0;
    this.hurtFlash = 0;
    this.warp = 0;
    this.flash = 0;
    this.state = 'boot';
    this.run = 0; // sube al volver al título (ver later())
    this.fade = 0;
    this.fadeTarget = 0;
    this.buildMs = performance.now() - t0;
    this.fps = 0;
    this.newState();

    this.input.onPointerLockLost = () => {
      // (con el panel del modo desarrollador abierto el juego sigue)
      if (this.state === 'play' && !this.ui.modal && !this.input.freeLook && !this.dev.open) this.openPause();
    };
    this.canvas.addEventListener('click', () => {
      // (un clic en el juego cierra el panel del modo desarrollador)
      if (this.dev.open) this.dev.close();
      else if (this.state === 'play' && !this.ui.modal) this.input.requestLock();
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
    this.savedWeapon = null;
  }

  saveGame() {
    const p = this.player;
    writeSave({
      v: 1,
      flags: this.flags,
      inv: this.inventory.toJSON(),
      maxHp: p.maxHp,
      maxFlasks: p.maxFlasks,
      maxSt: p.maxSt,
      dmgMul: p.dmgMul,
      weapon: p.weaponId,
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
    p.maxSt = s.maxSt || 100;
    p.dmgMul = s.dmgMul || 1;
    this.savedWeapon = s.weapon || null;
  }

  // Armas: ¿tiene alguna? y cuál empuñar (la guardada si aún la tiene; si no,
  // la última del orden en que se encuentran).
  hasWeapon() {
    return WEAPON_ORDER.some((id) => this.inventory.has(WEAPONS[id].item));
  }
  equipBestWeapon(prefer = null) {
    const owned = WEAPON_ORDER.filter((id) => this.inventory.has(WEAPONS[id].item));
    // (sin ninguna, la espada: oculta hasta recogerla, como siempre)
    const id = prefer && owned.includes(prefer) ? prefer : owned[owned.length - 1] || 'espada';
    if (id !== this.player.weaponId) this.player.equipWeapon(id);
  }

  applyWorldState() {
    this.interact.applyFlags(this.flags, true);
    this.breakables.applyFlags(this.flags, true);
    for (const ph of this.phantoms) ph.state = 'wait';
    this.phantomA = 0;
    for (const e of this.enemies) {
      e.reset();
      if (e.boss && this.flags['boss:' + e.type]) {
        e.dead = true;
        e.state = 'dead';
        e.obj.visible = false;
        e.shadow.visible = false;
        if (e.P.censer) e.P.censer.grp.visible = false;
      } else if (e.type === 'impaled' && this.flags['impaled:beast']) this.hideImpaled(e);
    }
    this.equipBestWeapon(this.savedWeapon || this.player.weaponId);
    this.player.setEquipment(this.hasWeapon(), this.inventory.has('escudo'));
    this.finale.applyFlags();
  }

  // El Empalado ya es la Bestia: no vuelve a estar arrodillado en el Postigo
  // (la niebla sigue ahí hasta escapar de ella).
  hideImpaled(e) {
    e.scripted = true;
    e.state = 'dead';
    e.stT = 99;
    e.obj.visible = false;
    e.shadow.visible = false;
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
  // Temporizador de la partida en curso: no se dispara si entretanto se ha
  // salido al título (la muerte, al vencer a un jefe, las pistas...). Antes,
  // al salir al título durante la muerte, la banda «Has caído» aparecía sobre
  // la portada, la portada se fundía a negro y el jugador reaparecía en el
  // altar en mitad de la partida que se cargara después.
  later(ms, fn) {
    const run = this.run;
    return setTimeout(() => {
      if (this.run === run) fn();
    }, ms);
  }

  toTitle() {
    this.run = (this.run || 0) + 1;
    this.endCutscene();
    this.hunt.reset();
    this.chase.reset();
    const death = document.getElementById('death');
    death.classList.remove('show');
    death.classList.add('hidden');
    this._pauseAfterDeath = false;
    this.hintQ = [];
    this._hintBusy = false;
    // nada de la partida anterior queda a medias: ni planos de cámara, ni el
    // pozo, ni la niebla roja de la segunda fase del Turiferario (seguía en
    // toda la ciudad al continuar)
    this.cine = null;
    this.slowmo = null;
    this.climb = null;
    this.finale.reset();
    this.introCam = false;
    this.atmo.override = null;
    this.bossLight.intensity = 0;
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
    this.interact.applyFlags({}, true);
    this.breakables.applyFlags({}, true);
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
    p.maxSt = 100;
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
      this.camRig.override = { pos: new THREE.Vector3(...WAKE_CAM.pos), look: new THREE.Vector3(...WAKE_CAM.look), speed: 30 };
      this.camRig.cam.position.copy(this.camRig.override.pos);
      this.later(3800, () => this.hint('start'));
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
    // durante la muerte no (se podía salir al título con la secuencia a
    // medias): la pausa se abre al volver al altar
    if (this.player.dead) {
      this._pauseAfterDeath = true;
      return;
    }
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
    if (this.ui.modal || this.player.dead) return;
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
      shield: `${k('block')} Mantén para bloquear  ·  Púlsalo justo antes del golpe: parry`,
      parry: `¡Parry! Está desequilibrado: ${k('light')} golpe de gracia. Los golpes en rojo no se pueden desviar.`,
      enemy: `${k('lock')} Fijar objetivo  ·  ${k('heal')} Beber una ampolla`,
      altar: `Descansar cura y rellena las ampollas, pero las criaturas vuelven a levantarse.`,
      map: `${k('map')} Mapa  ·  ${k('inventory')} Inventario y documentos`,
    };
    // las pistas se muestran de una en una
    this.hintQ = this.hintQ || [];
    this.hintQ.push(H[id]);
    if (!this._hintBusy) this._nextHint();
  }
  // Muestra u oculta un grupo del mundo (mallas, colisiones, fuegos y luces):
  // el tejado de la nave cuando revienta, sus ruinas
  setGroupVisible(name, on) {
    const G = this.groups[name];
    if (!G || G.on === on) return;
    G.on = on;
    for (const m of G.meshes) m.visible = on;
    for (const b of G.boxes) b.enabled = on;
    for (const f of G.fires) f.on = on;
    for (const l of G.lights) l.on = on;
    this.fx.fires.refresh(this.camera.position.x, this.camera.position.z);
  }
  // Un mensaje del guion en la cola de las pistas (de uno en uno: varios a la
  // vez se amontonaban sobre el aviso de botón)
  say(text) {
    this.hintQ = this.hintQ || [];
    this.hintQ.push(text);
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
    this.later(6200, () => this._nextHint());
  }

  giveItem(id) {
    const p = this.player;
    this.inventory.add(id);
    const it = ITEMS[id];
    // un arma nueva se empuña al recogerla
    if (it.weapon && WEAPONS[it.weapon]) p.equipWeapon(it.weapon);
    if (it.weapon || id === 'escudo') p.setEquipment(this.hasWeapon(), this.inventory.has('escudo'));
    if (it.upgrade === 'flask') {
      p.maxFlasks++;
      p.flasks++;
    } else if (it.upgrade === 'hp') {
      p.maxHp += 25;
      p.hp += 25;
    } else if (it.upgrade === 'dmg') p.dmgMul += 0.25;
    else if (it.upgrade === 'st') {
      p.maxSt += 30;
      p.st = p.maxSt;
    }
    this.ui.showItem(id);
    this.state = 'paused';
    const s = this.ui.top;
    s.data.onClose = () => {
      if (this.state === 'paused') this.state = 'play';
      if (id === 'espada') {
        this.hint('sword');
        // algo se levanta en la celda del fondo
        const e = this.enemies.find((x) => x.id === 'e_carcel1');
        if (e && !e.dead && !e.aware) this.later(1200, () => e.alert());
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
    if (it.kind === 'colossus') return this.finale.interact(it);
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
    this.later(900, () => (this.fadeTarget = 1));
    for (const e of this.enemies) if (!e.boss) e.reset();
    this.fauna.reset();
    this.combat.clear();
    this.saveGame();
    this.later(1500, () => this.hint('altar'));
  }
  onLeaveRest() {}

  fogActive(it) {
    const b = this.bosses[it.boss];
    return !(this.flags['boss:' + it.boss] || (b && b.dead));
  }

  enterFog(it) {
    const p = this.player;
    const b = this.bosses[it.boss];
    if (this.chase.active) return;
    // (ya transformado: directamente a la huida)
    if (it.boss === 'impaled' && this.flags['impaled:beast'] && !this.flags['boss:impaled']) {
      this.audio.play('fog');
      this.chase.resume();
      return;
    }
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
    // (el que cuelga del techo: la cámara baja y mira hacia arriba mientras cae)
    const hang = !!b.T.hangs;
    const eyeY = b.pos.y + (hang ? 1.2 : b.T.height * 0.55);
    const hit = this.world.col.raycast(b.pos.x, eyeY, b.pos.z, dir.x, 0, dir.z, want, (bx) => bx.cam !== false && bx.tag !== 'fog');
    const dist = hit === Infinity ? want : Math.max(2.5, hit - 0.5);
    const camPos = new THREE.Vector3(b.pos.x + dir.x * dist, eyeY - 0.4, b.pos.z + dir.z * dist);
    this.cinematic(b.T.introDur ?? (b.type === 'turibulario' ? 3.4 : hang ? 2.8 : 2.0), camPos, new THREE.Vector3(b.pos.x, b.pos.y + (hang ? 1.5 : b.T.height * 0.65), b.pos.z));
    if (b.T.onWake) b.T.onWake(b, this);
    else {
      b.aware = true;
      b.state = 'alert';
      b.stT = 0;
      if (b.T.clips.alert) b.anim.play(b.T.clips.alert, { blend: 0.1 });
    }
    this.audio.enemyVoice(b, 'alert');
    this.audio.music((BOSS_MUSIC[b.type] || BOSS_MUSIC.impaled)[0]);
    this.ui.area(b.T.name);
  }

  onBossPhase(b) {
    this.audio.music((BOSS_MUSIC[b.type] || BOSS_MUSIC.impaled)[1]);
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
      this.later(2500, () => {
        this.ui.area(`${e.T.name.toUpperCase()} HA CAÍDO`);
        this.interact.applyFlags(this.flags);
        for (const it of this.interact.list) if (it.kind === 'door' && it.lock.type === 'boss' && it.lock.boss === e.type) this.interact.setOpen(it), (this.flags['door:' + it.id] = true);
        this.saveGame();
      });
      if (e.type === 'turibulario') this.bossLight.intensity = 0;
      // muerto el canónigo, alguien retira la tranca de la bodega y huye
      if (e.type === 'descoyuntado') {
        this.later(5200, () => {
          const door = this.interact.list.find((i) => i.id === 'd_sotano');
          if (door && !door.done) {
            this.audio.play('bar', { x: door.x, y: 1, z: door.z });
            this.interact.setOpen(door);
            this.flags['door:d_sotano'] = true;
            this.ui.toast('Arriba cae la tranca de la bodega. Unos pasos se alejan deprisa.', 5);
            this.saveGame();
          }
        });
      }
    }
  }

  onPlayerDeath() {
    this.deaths++;
    this.lockTarget = null;
    this.audio.play('death');
    this.audio.stopMusic();
    const band = document.getElementById('death');
    this.later(1400, () => {
      band.classList.remove('hidden');
      requestAnimationFrame(() => band.classList.add('show'));
    });
    this.later(4600, () => (this.fadeTarget = 0));
    this.later(6400, () => {
      band.classList.remove('show');
      band.classList.add('hidden');
      this.respawn();
    });
  }

  respawn() {
    this.cine = null;
    this.slowmo = null;
    this.endCutscene();
    this.hunt.reset();
    // huyendo de la Bestia: desde el último punto de control de la huida
    if (this.chase.active) {
      this.combat.clear();
      this.lockTarget = null;
      for (const e of this.enemies) if (!(e.boss && this.flags['boss:' + e.type]) && e.type !== 'impaled') e.reset();
      this.player.spawn(this.player.pos.x, this.player.pos.y, this.player.pos.z, this.player.yaw);
      this.chase.retry();
      if (this._pauseAfterDeath) {
        this._pauseAfterDeath = false;
        if (this.state === 'play') this.openPause();
      }
      return;
    }
    // mientras el canónigo siga vivo, sus bodegas vuelven a estar como
    // estaban: palancas arriba, rastrillo bajado y todo entero otra vez
    if (!this.flags['boss:descoyuntado']) this.resetCellar();
    // y lo alto del Postigo, mientras el Empalado siga ahí
    if (!this.flags['boss:impaled']) this.resetArea('postigo');
    this.climb = null;
    this.finale.onRespawn();
    const b = this.activeBoss;
    this.activeBoss = null;
    this.atmo.override = null;
    this.combat.clear();
    for (const e of this.enemies) if (!(e.boss && this.flags['boss:' + e.type])) e.reset();
    this.respawnAtAltar();
    this.fadeTarget = 1;
    this.saveGame();
    // (la pausa que se pidió mientras caía)
    if (this._pauseAfterDeath) {
      this._pauseAfterDeath = false;
      if (this.state === 'play') this.openPause();
    }
  }

  onTrigger(it) {
    if (it.event === 'ending') this.ending();
    // al asomarse a la escalera de la bodega (una vez, y sólo si el
    // Descoyuntado sigue ahí abajo)
    else if (it.event === 'sotano' && !this.flags['cine:sotano'] && !this.flags['boss:descoyuntado'] && !this.cutscene) this.startCutscene();
  }

  startCutscene() {
    this.hunt.reset();
    this.cutscene = new CellarCutscene(this);
    this.cutscene.start();
    this.flags['cine:sotano'] = true;
    this.saveGame();
  }
  endCutscene() {
    const c = this.cutscene;
    this.cutscene = null;
    if (c) c.end();
  }

  // Las bodegas, como al principio de la caza (tras morir en ellas).
  resetCellar() {
    const F = this.flags;
    for (const k of Object.keys(F)) if (k.startsWith('lever:')) delete F[k];
    delete F['door:d_rastrillo'];
    for (const it of this.breakables.list) delete F['broken:' + it.id];
    this.breakables.applyFlags(F, true);
    for (const it of this.interact.list) if (it.kind === 'lever' || it.id === 'd_rastrillo') this.interact.reset(it);
  }

  // Lo que se rompió en una zona vuelve a estar entero (al morir).
  resetArea(area) {
    const F = this.flags;
    for (const it of this.breakables.list) if (it.area === area) delete F['broken:' + it.id];
    for (const it of this.breakables.list) if (it.area === area && it.broken) this.breakables.restore(it);
  }

  // Una palanca del rastrillo de la cisterna: la cadena corre por la bóveda
  // (se oye pasar por encima, camino del rastrillo) y la reja sube un palmo.
  onLever(it, n, gate) {
    const a = this.audio;
    this.ui.toast(MSG.palanca(n), 4.5);
    this.camRig.shake(0.2);
    if (a) {
      a.play('chainRun', { x: it.x, y: it.y + 3, z: it.z });
      if (gate) {
        for (let k = 1; k <= 4; k++) {
          const u = k / 5;
          setTimeout(() => a.play('chainRun', { x: it.x + (gate.x - it.x) * u, y: it.y + 4, z: it.z + (gate.z - it.z) * u }, { k: 0.8 }), k * 260);
        }
        setTimeout(() => a.play(n >= 3 ? 'gateOpen' : 'gateStep', { x: gate.x, y: gate.y + 2, z: gate.z }), 1300);
      }
    }
    this.hunt && this.hunt.onLever(it, n);
  }
  // Un golpe desviado (la criatura ya ha reaccionado): la primera vez que
  // queda desequilibrada, la pista del golpe de gracia.
  onParry(src, a) {
    const open = src && (src.parryT > 0 || (src.D && src.D.mode === 'parried' && src.D.parryFull));
    if (open && !a.deflect) this.hint('parry');
    this.dev.note(`parry${a.deflect ? ' (hueso)' : ''} · ${src ? src.type : '?'}${a && a.name ? ' · ' + a.name : ''}${open ? ' · DESEQUILIBRADO' : ''}`);
  }
  onRiposte(e, r, dmg) {
    this.dev.note(`golpe de gracia · ${e.type} · ${dmg}${r === 'kill' ? ' · muerto' : ''}`);
  }

  // Lo que hace el jugador (golpes, esquivas, curas): el Descoyuntado aprende.
  onPlayerAction(kind, info) {
    const b = this.activeBoss;
    if (b && b.D && b.D.observe) b.D.observe(kind, info);
  }

  // ¿Está en la bodega del canónigo (o en su escalera)?
  // Bajo el castillo: las mazmorras, las catacumbas y el aljibe.
  // ¿En un piso alto de la torre del homenaje?
  inKeep(p) {
    const K = CASTLE.keep;
    return p.x > K.x0 && p.x < K.x1 && p.z > K.z0 && p.z < K.z1 && p.y > K.F1 - 0.6 && p.y < K.R - 0.5;
  }

  inDungeon(p) {
    const D = CASTLE.dun;
    return p.x > D.x0 && p.x < D.x1 && p.z > D.z0 && p.z < D.z1 && p.y < -1.2 && p.y > D.y - 3;
  }

  inCellar(p) {
    const C = CANON.cellar;
    return p.x > C.x0 - 1 && p.x < C.x1 + 1 && p.z > C.z0 - 1 && p.z < CANON.stair.top + 0.5 && p.y < -0.5 && p.y > C.y - 2;
  }

  // El pozo del Postigo: la salida de las bodegas (y, una vez descubierta,
  // un camino de vuelta desde la calle).
  canClimbWell() {
    return !this.climb && this.player.pos.y < -3;
  }
  climbWell() {
    this.wellMove('up');
  }
  descendWell() {
    this.wellMove('down');
  }
  wellMove(dir) {
    const p = this.player;
    if (this.climb || p.dead) return;
    this.climb = { dir, t: 0, hp: p.hp };
    p.playInteract('interact');
    p.state = 'cine';
    p.vx = p.vz = 0;
    this.lockTarget = null;
    this.fadeTarget = 0;
    this.audio.play('climb', p.pos);
  }
  // La escalera de mano de la trampilla (sala de armas <-> cárcel).
  hatchMove(it) {
    const p = this.player;
    if (this.climb || p.dead) return;
    this.climb = { dir: 'to', t: 0, hp: p.hp, to: it.to, msg: it.end === 'top' ? MSG[it.msgDown] ?? MSG.hatchDown : MSG[it.msgUp] ?? MSG.hatchUp };
    p.playInteract('interact');
    p.state = 'cine';
    p.vx = p.vz = 0;
    this.lockTarget = null;
    this.fadeTarget = 0;
    this.audio.play('climb', p.pos);
  }
  updateClimb(dt) {
    const c = this.climb;
    if (!c) return;
    const p = this.player;
    c.t += dt;
    // si algo te alcanza mientras trepas, te caes del pozo
    if (p.state !== 'cine' || p.dead) {
      this.climb = null;
      this.fadeTarget = 1;
      return;
    }
    if (c.t < 1.25) return;
    this.climb = null;
    const W = CELLAR.well,
      SW = CELLAR.streetWell;
    if (c.dir === 'to') {
      p.spawn(c.to[0], c.to[1], c.to[2], c.to[3]);
      this.ui.toast(c.msg, 3.5);
    } else if (c.dir === 'up') {
      p.spawn(SW.x, 0, SW.z + 1.75, 0);
      this.flags['pozo:salida'] = true;
      this.hunt.stop();
      this.ui.toast('Sales por el pozo del Postigo. Abajo, algo chilla y se revuelve.', 4.5);
      setTimeout(() => this.audio.play('dropCry', { x: SW.x, y: -4, z: SW.z }), 700);
    } else {
      p.spawn(W.x - 1.9, CELLAR.FLOOR, W.z, -Math.PI / 2);
      this.ui.toast('Bajas por los pates de hierro hasta la cisterna.', 3.5);
    }
    p.hp = Math.max(p.hp, 1);
    this.camRig.snapTo(p);
    this.fadeTarget = 1;
    this.saveGame();
  }

  // La escena final, en la orilla del Este al amanecer. El jugador baja al
  // embarcadero y lo anda hasta la punta, junto a la barca; la cámara hace
  // tres planos: le sigue por la ribera, le espera desde el agua (con la
  // muralla y el humo de la ciudad detrás) y, al final, se alza a su espalda
  // sobre el río y el sol que sale tras la otra orilla. Luego, el fundido y
  // el pergamino. Todo con el reloj del juego (antes, con temporizadores: un
  // plano fijo y el jugador andando contra la orilla hasta el fundido).
  ending() {
    this.state = 'ending';
    this.lockTarget = null;
    const p = this.player;
    p.state = 'free';
    p.blocking = false;
    this.audio.music('ending');
    this.flags.finished = true;
    this.saveGame();
    this.ui.showHud(false);
    const path = RIVER.path.map(([x, z]) => new THREE.Vector3(x, 0, z));
    let len = Math.hypot(path[0].x - p.pos.x, path[0].z - p.pos.z);
    for (let i = 1; i < path.length; i++) len += path[i].distanceTo(path[i - 1]);
    this.end = {
      t: 0,
      path,
      wp: 0,
      // (a paso, y algo más deprisa si se entra en la orilla lejos del
      // embarcadero: que llegue a la punta hacia los diez segundos)
      m: clamp(len / 9.5 / 4, 0.42, 0.55),
      head: new THREE.Vector3(path[0].x - p.pos.x, 0, path[0].z - p.pos.z).normalize(),
      from: { pos: this.camera.position.clone(), look: this.camRig.lookAt.clone() },
      look: new THREE.Vector3(p.pos.x, p.pos.y + 1.3, p.pos.z),
      tB: null,
      tC: null,
      faded: false,
      card: false,
    };
  }

  updateEnding(dt) {
    const E = this.end;
    if (!E) return;
    const p = this.player;
    E.t += dt;
    const t = E.t;
    // el paseo: de un punto del camino al siguiente; en la punta se para
    if (E.wp < E.path.length) {
      const w = E.path[E.wp];
      const dx = w.x - p.pos.x,
        dz = w.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.35) {
        E.wp++;
        if (E.wp === 1 && E.tB === null) E.tB = Math.max(t, 3.6);
        if (E.wp >= E.path.length) {
          p.autoDir = null;
          if (E.tC === null) E.tC = Math.max(t, (E.tB ?? t) + 3.8);
        }
      } else p.autoDir = { x: dx / d, z: dz / d, m: E.m };
      if (p.autoDir) E.head.set(p.autoDir.x, 0, p.autoDir.z);
    }
    // (por si algo lo detiene por el camino: los planos siguen igual)
    if (E.tB === null && t > 7) E.tB = t;
    if (E.tC === null && t > 14) {
      E.tC = t;
      p.autoDir = null;
    }
    const ease = (u) => {
      const k = clamp(u, 0, 1);
      return k * k * (3 - 2 * k);
    };
    const pos = new THREE.Vector3(),
      look = new THREE.Vector3();
    let fov = 58;
    // la mirada sigue al jugador con algo de retardo (sin tirones)
    E.look.x = damp(E.look.x, p.pos.x, 4, dt);
    E.look.y = damp(E.look.y, p.pos.y + 1.3, 4, dt);
    E.look.z = damp(E.look.z, p.pos.z, 4, dt);
    if (E.tC !== null && t >= E.tC) {
      // plano C: a su espalda y en alto, sobre el río y el sol naciente
      const u = ease((t - E.tC) / 6.5);
      pos.set(5.3 - 1.6 * u, 2.3 + 3.2 * u, -214.4 + 4.4 * u);
      look.set(8.4 + 1.2 * u, 1.7 + 1.0 * u, -236 - 16 * u);
      fov = 54;
    } else if (E.tB !== null && t >= E.tB) {
      // plano B: desde el agua, viéndole venir por el embarcadero
      const u = ease((t - E.tB) / 5.5);
      pos.set(10.9 - 0.7 * u, 1.15 + 0.35 * u, -230.2 + 2.4 * u);
      look.copy(E.look);
      fov = 46;
    } else {
      // plano A: le sigue por la ribera, a su espalda y algo a la izquierda,
      // saliendo poco a poco de donde estaba la cámara del juego
      const h = E.head;
      const left = new THREE.Vector3(-h.z, 0, h.x);
      pos.set(p.pos.x, p.pos.y + 1.85, p.pos.z).addScaledVector(h, -3.8).addScaledVector(left, 1.25);
      look.set(p.pos.x, p.pos.y + 1.2, p.pos.z).addScaledVector(h, 7);
      const k = ease(t / 1.6);
      pos.lerpVectors(E.from.pos, pos, k);
      look.lerpVectors(E.from.look, look, k);
    }
    this.camRig.override = { pos, look, snap: true, fov };
    // el fundido (a la luz del amanecer) y el pergamino
    if (E.tC !== null && !E.faded && t > E.tC + 3.2) {
      E.faded = true;
      this.post.U.uFadeColor.value.setRGB(1, 0.92, 0.82);
      this.fadeTarget = 0;
    }
    if (E.tC !== null && !E.card && t > E.tC + 5.6) {
      E.card = true;
      p.autoDir = null;
      this.showEndingCard();
    }
  }

  showEndingCard() {
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
  }

  // ------------------------------------------------------------ fantasmas en la niebla
  buildPhantom() {
    // siluetas oscuras que se desvanecen al acercarse (varias formas). Llevan
    // la misma niebla que el escenario (color del cielo en esa dirección):
    // con la niebla estándar se fundían con un gris frío y, contra la niebla
    // cálida de la ciudad, se veían a lo lejos como siluetas azules
    const black = registerMaterialPatch(new THREE.MeshBasicMaterial({ color: 0x080808, fog: true, transparent: true, opacity: 0 }));
    this.phantomMat = black;
    this.phantomRigs = {};
    for (const [k, fn] of Object.entries({ mourner: buildMourner, penitent: buildPenitent, bell: buildBell })) {
      const r = fn();
      for (const m of r.meshes) m.material = black;
      r.root.visible = false;
      this.scene.add(r.root);
      this.phantomRigs[k] = r;
    }
    this.phantomA = 0;
    this.phantomLast = null;
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
          if (d < 12) this.audio.play('phantom');
        } else showing = ph;
      }
    }
    // aparece poco a poco y se deshace deprisa (sin saltos de un fotograma a otro)
    if (showing) this.phantomLast = showing;
    this.phantomA = showing ? Math.min(1, this.phantomA + dt / 0.9) : Math.max(0, this.phantomA - dt / 0.45);
    const ph = this.phantomA > 0 ? this.phantomLast : null;
    this.phantomMat.opacity = this.phantomA * this.phantomA * (3 - 2 * this.phantomA);
    for (const [k, r] of Object.entries(this.phantomRigs)) {
      const on = ph && (ph.kind || 'mourner') === k;
      r.root.visible = !!on;
      if (!on) continue;
      r.root.position.set(ph.x, ph.y + (k === 'mourner' ? 0.3 : 0), ph.z);
      r.root.rotation.y = Math.atan2(p.x - ph.x, p.z - ph.z);
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
    // (y los colosos del jefe final, que no son criaturas de la lista)
    const list = this.extraTargets ? this.activeEnemies.concat(this.extraTargets) : this.activeEnemies;
    for (const e of list) {
      if (!e.lockable || e === exclude) continue;
      const dx = e.pos.x - p.pos.x,
        dz = e.pos.z - p.pos.z;
      const d = Math.hypot(dx, dz) - (e.lockRange ? e.body.radius : 0);
      // (sólo a una altura parecida: no la de otro piso, ni la de abajo en el
      // patio desde la muralla)
      const dy = Math.abs(e.pos.y - p.pos.y);
      if (d > (e.lockRange ? e.lockRange : 20) || dy > 3.2) continue;
      // ángulo entre la vista y la dirección jugador -> criatura
      const a = Math.abs(angleDiff(camYaw, Math.atan2(dx, dz)));
      let score;
      if (dirSign) {
        v.set(e.pos.x, e.pos.y + e.lockHeight, e.pos.z).project(cam);
        if (v.z > 1 || Math.abs(v.x) > 1.3) continue;
        const sx = v.x - curX;
        if (Math.sign(sx) !== dirSign || Math.abs(sx) < 0.02) continue;
        score = Math.abs(sx) * 10 + d * 0.08 + dy * 0.3;
      } else {
        // delante de la cámara (o pegada al jugador aunque quede de lado)
        if (a > 80 * DEG && d > 3) continue;
        score = a * 3.0 + d * 0.12 + dy * 0.5;
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
    // al fijar, el giro de cámara que se traía no cuenta como «cambiar de
    // objetivo» (pulsar Q mientras se movía el ratón saltaba del enemigo de
    // delante al de al lado)
    if (t && !this.lockTarget) {
      this.input.flickAcc = 0;
      this._flickT = 0.3;
    }
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
    if (d > (t.lockRange ?? 24) || Math.abs(t.pos.y - this.player.pos.y) > 7) {
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
      } else this.camRig.override.look.set(WAKE_CAM.look[0], WAKE_CAM.look[1] + Math.min(1, this.player.stT / 3.4) * 1.1, WAKE_CAM.look[2]);
    } else if (this.cutscene) {
      // (en pausa se detiene; con «interactuar» se salta al corte)
      if (this.state === 'play' && !this.ui.modal) {
        if (this.cutscene.t > 1 && inp.pressed('interact')) this.cutscene.skip();
        if (!this.cutscene.update(dt)) this.endCutscene();
      }
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
    } else if (this.state === 'ending') {
      if (!this.ui.modal) this.updateEnding(dt);
    } else this.camRig.override = null;

    // (los avisos de pulsación corren en tiempo real; el juego, mientras, a
    // cámara lenta)
    if (this.state === 'play' && !this.ui.modal) this.qte.update(dt);
    if (this.qte.active) dt *= this.qte.slow;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      dt *= 0.05;
    }
    // (un instante a cámara lenta: el golpe de gracia)
    if (this.slowmo) {
      this.slowmo.t -= dt;
      dt *= this.slowmo.k;
      if (this.slowmo.t <= 0) this.slowmo = null;
    }
    // (modo desarrollador: cámara lenta o rápida)
    if (this.dev.timeScale !== 1) dt *= this.dev.timeScale;
    this.time += dt;
    G.uTime.value = this.time;
    // si había una pantalla abierta, su entrada no debe llegar al juego este fotograma
    const hadModal = this.ui.modal;
    this.ui.update(dt);
    // (la IA de la bodega aprovecha que acabas de leer algo)
    if (hadModal && !this.ui.modal) this.lastModalT = this.time;
    if (this.ui.modal) this.promptTarget = null;

    const p = this.player;
    const playing = this.state === 'play' && !this.ui.modal && !hadModal;
    if (playing) {
      this.playTime += dt;
      if (inp.pressed('pause')) this.openPause();
      else if (inp.pressed('inventory') && !this.cutscene) this.openOverlay('inv');
      else if (inp.pressed('map') && !this.cutscene) this.openOverlay('map');
    }
    if (this.state === 'paused' && !this.ui.modal) this.state = 'play';

    const simulate = this.state === 'play' || this.state === 'intro' || this.state === 'ending' || this.state === 'title';
    if (simulate && !this.ui.modal) {
      const control = this.state === 'play' && !p.dead && !hadModal && !this.cine && !this.cutscene && !(this.chase.active && this.chase.lock);
      if (this.state === 'play' || this.state === 'ending') {
        p.update(dt, inp, this.camRig, control);
        if (control) this.updateLock(dt);
      }
      // estela del arma (su color depende del arma empuñada)
      if (this._trailW !== p.weaponId) {
        this._trailW = p.weaponId;
        this.fx.trail.mat.uniforms.uColor.value.setHex(p.weapon.trailColor || 0xffe2b0);
      }
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
          // (a la que mueve una cinemática la muestra y la oculta el guion; el
          // Descoyuntado, metido en una de sus grutas, no se ve: antes esto lo
          // volvía a mostrar y su cuerpo se quedaba unos segundos dentro del
          // túnel, a la vista, hasta salir por la otra boca)
          const gone = e.T.deathDur ?? 5.5;
          if (!e.scripted) e.obj.visible = (e.state !== 'dead' || e.stT < gone) && d < Math.min(90, this.camera.far + 6) && lvl && !(e.boss && e.dead && this.flags['boss:' + e.type] && e.stT > gone - 0.5) && !(e.D && e.D.hidden);
          return act;
        });
      }
      // (durante una cinemática las criaturas esperan)
      // (modo desarrollador: con la IA congelada sólo respiran)
      if (this.state === 'play' && !this.cutscene && !this.dev.freezeAI) for (const e of this.activeEnemies) e.update(dt, p);
      else if (this.state === 'title' || this.dev.freezeAI) for (const e of this.activeEnemies) e.animate(dt);
      this.updateProbes(dt);
      this.fauna.update(dt, this.state === 'title' ? null : p, this.time);
      this.combat.update(dt);
      this.breakables.update(dt);
      this.waters.update(dt);
      if (this.state === 'play') {
        this.hunt.update(dt);
        this.updateClimb(dt);
        this.chase.update(dt);
        this.finale.update(dt);
      }
      // partículas al ritmo del juego (antes, a 1/60 s por fotograma dibujado:
      // en pantallas de 120-144 Hz volaban al doble de velocidad)
      this.fx.blood.update(dt, this._partGround || (this._partGround = (x, y, z) => this.world.col.groundHeight(x, z, 0.05, y + 0.3)));
      this.interact.update(dt);
      if (this.state === 'play') {
        this.interact.triggers(p);
        this.promptTarget = p.state === 'free' && !p.dead ? this.interact.nearest(p) : null;
        // (el jefe final: agarrarse al coloso, apuñalar, aferrarse)
        const fp = this.finale.prompt();
        if (fp !== undefined) this.promptTarget = fp;
        this.updatePhantoms(dt);
      } else this.promptTarget = null;
      if (p.pos.y < -40 && !p.dead) p.die();
    }
    // cámara
    this.camRig.update(dt, inp, p, this.state === 'play' ? this.lockTarget : null, this.world.col, this.state === 'play' && !this.ui.modal && !p.dead && !this.cine && !this.cutscene && !(this.chase.active && this.chase.lock));

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
          if (AREA_NAMES[z.id] && this.state === 'play' && (!this.activeBoss || this.activeBoss.T.stalker) && !(this.chase.active && this.chase.lock)) {
            this.ui.area(AREA_NAMES[z.id]);
            this.audio.play('discover');
          }
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
    this.post.U.uGrain.value = 0.045 + this.fear * this.fear * 0.09 + (this.cutscene ? this.cutscene.grain || 0 : 0);

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
    // destello: naranja por defecto; dorado tras el iai de la katana
    const ft = this.flashTint || [1, 0.6, 0.3];
    U.uFlashColor.value.setRGB(ft[0], ft[1], ft[2]);
    if (this.flash <= 0) this.flashTint = null;
    this.fade = damp(this.fade, this.fadeTarget, this.fadeTarget < this.fade ? 2.2 : 1.4, dt);
    U.uFade.value = this.fade;
    if (this.state !== 'ending') U.uFadeColor.value.setRGB(0, 0, 0);

    // HUD
    if (this.state === 'play' || this.state === 'paused') this.ui.updateHud(dt);
    this.dev.update(dt);
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
    this.post.render(this.scene, this.camera, this.time);
  }
}
