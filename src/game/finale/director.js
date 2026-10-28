// El jefe final: la película (ver PLAN_JEFE_FINAL.md).
//
// Al vencer al arzobispo en la cisterna empieza la película: seis actos
// (film_*.js) con cinemáticas, pulsaciones y tramos guiados, del pozo de la
// cisterna a la muralla, la nave, la ciudad y de vuelta al cráter. Aquí está
// lo que los une: el gigante, los cascotes y los trozos que caen, el estado
// del mundo en cada punto de control, morir y volver, guardar a mitad, y el
// final (el normal, o en el futuro Deo Ignoto con el objeto verdadero).
//
//   off    todavía no (el arzobispo sigue en la cisterna)
//   film   la película
//   done   vencido: la ciudad en ruinas, la reja del río abierta
//
// Banderas: finale:rite (vencido el arzobispo: ya no hay niebla ni nadie en
// la cisterna), film:cp (el punto de control: rito, establo, torreSur,
// muralla), boss:turiferario (el gigante, hundido en la cisterna) y
// boss:turibulario (la de siempre: abre la reja del río).
//
// ------------------------------------------------------------------------
// EL FUTURO (no está hecho; notas de diseño)
//
// El objeto verdadero (nombre provisional). Un objeto difícil de conseguir:
// hay que forjarlo, y se llega a él a través de varios PNJ que se irán
// añadiendo al juego (quién lo forja, de qué, qué piden a cambio). Lo que
// hace: al acabar con un ser maligno, muestra su verdadera forma, su Alma,
// la única a la que de verdad se puede dañar. Si se hiere el Alma de una
// criatura, ya no puede volver a la existencia; pero matar su forma terrenal
// revela la verdadera, que es más peligrosa.
//
// De momento sólo se usará con Deo Ignoto. Con el objeto, al hundirse el
// gigante en la cisterna (final del acto 6), una cinemática más: su Alma, el
// dios que dormía bajo la catedral, sube del cráter; y empieza la pelea
// contra Deo Ignoto (jefe opcional). Sin el objeto, no hay pelea: se pasa
// directamente al final normal. La pelea de Deo que ya existe (deo_boss.js,
// deo_anim.js, climb.js, surface.js; su puesta en escena era la nave y el
// atrio) se queda en el código, sin enganchar a este director: habrá que
// rehacer su entrada (que salga del cráter) y su arena, y volver a
// engancharla (con sus instancias del modo de pruebas).
// Ver hasTrueItem() y endFilm().
// ------------------------------------------------------------------------
import * as THREE from 'three';
import { Film } from './film.js';
import { Giant } from './giant.js';
import { Debris } from './debris.js';
import { Chunks } from './chunks.js';
import { DustClouds } from './dust.js';
import { Collapses, sampleSurface } from './collapse.js';
import { Wrecks } from './wrecks.js';
import { ACTS } from './film_acts.js';
import { NAVE } from '../../world/level_finale.js';
import { clamp } from '../../core/util.js';

const V3 = THREE.Vector3;
const rnd = (a, b) => a + Math.random() * (b - a);
// de qué materiales del mundo salen trozos (los demás, telas, velas, sangre,
// agua, no se parten)
const SOLID = new Set(['cobble', 'flag', 'wallstone', 'ashlar', 'plaster', 'timber', 'planks', 'wooddark', 'roof', 'dirt', 'mossstone', 'rock', 'mosaic', 'glass', 'straw', 'iron', 'skulls', 'bone']);
const WOOD = new Set(['timber', 'planks', 'wooddark', 'straw']);

// el objeto verdadero (nombre provisional; ver arriba)
export const TRUE_ITEM = 'verdadero';
// los puntos de control, en orden
export const CPS = ['rito', 'establo', 'torreSur', 'muralla'];
// (la película no trepa: para quien pregunte por la escalada, nada)
const NO_CLIMB = Object.freeze({ active: false, reset() {}, update() {}, prompt: () => undefined });

export class Finale {
  constructor(game) {
    this.g = game;
    this.film = new Film(game);
    this.debris = new Debris(game.scene, 260);
    // astillas y tejas, aparte (su material y su forma)
    this.splinters = new Debris(game.scene, 140, { tex: 'timber', color: 0x8a7a68, shape: 'splinter' });
    this.tiles = new Debris(game.scene, 140, { tex: 'roof', color: 0xa07060, shape: 'tile' });
    this.dust = new DustClouds(game.scene, 520);
    this.dust.groundAt = (x, z, y) => game.world.col.groundHeight(x, z, 0.3, y + 0.5, true);
    this.chunks = new Chunks(game, this.debris);
    this.chunks.dust = this.dust;
    this.collapses = new Collapses(game);
    this.giant = null;
    this.stage = 'off';
    this.cp = null;
    // viento en lo alto (0..1) y música heroica (0..1): los lee audio.js
    this.windK = 0;
    this.heroK = 0;
    this.lights = [];
  }
  get climb() {
    return NO_CLIMB;
  }
  // (compatibilidad: el modo de pruebas)
  get tur() {
    return this.giant;
  }
  get filmActive() {
    return this.stage === 'film';
  }
  get wrecks() {
    return this._wrecks || (this._wrecks = new Wrecks(this.g));
  }

  // El gigante, montado (el modelo se genera al cargar el juego, en un hilo
  // de fondo: a estas alturas ya está).
  ensureGiant() {
    if (this.giant) return Promise.resolve(this.giant);
    if (!this._giantP)
      this._giantP = this.g.colossi.model('turiferario').then((M) => {
        this.giant = new Giant(this.g, M);
        return this.giant;
      });
    return this._giantP;
  }
  // (en una corrutina) espera al modelo si todavía no está
  *waitGiant() {
    this.ensureGiant();
    while (!this.giant) yield;
    return this.giant;
  }
  // ¿lleva el jugador el objeto verdadero? (nadie lo tiene todavía)
  hasTrueItem() {
    return this.g.inventory.has(TRUE_ITEM);
  }

  // ---------------------------------------------------------- el mundo
  // Cómo está cada cosa en cada punto de control (k: 0 = todo entero, 1 =
  // establo, 2 = torre sur, 3 = muralla, 4 = vencido). Lo que rompe la
  // película por el camino (los tramos de la nave, los bancos) lo rompen los
  // actos; aquí, cómo queda.
  setWorld(k) {
    const g = this.g;
    const on = (n, v) => g.setGroupVisible(n, v);
    const broken = k >= 1;
    // la cisterna y el cráter
    on('cisternFloorC', !broken);
    // (la estatua de la sima, que miraba el rito: otra vez a lo suyo)
    if (g.spring) {
      g.spring.eyeTo = null;
      g.spring.lookAt = null;
      g.spring.boost = 0;
    }
    on('cisternPit', broken);
    on('cisternCols', !broken);
    on('cisternColsRuin', broken);
    on('cisternDome', !broken);
    on('cisternDomeRuin', broken);
    on('cisternCrown', !broken);
    on('craterLid', !broken);
    on('crater', broken);
    // (la sangre negra que anega la cisterna: desde la cabalgada)
    on('cisternBlood', k >= 3);
    // la trampilla de la torre del oeste de la brecha (acto 6)
    on('trampillaN', true);
    on('trampillaNOpen', false);
    // (lo del rito viejo, que ya no se usa)
    on('riteRubble', false);
    on('riteGrate', false);
    // la brecha de la muralla norte
    on('muroN', !broken);
    on('muroNRuin', broken);
    // la catedral: la cabecera, el tejado y la bóveda por tramos, los
    // fajones, las coronas, el estandarte, las arquerías y los bancos (las
    // ruinas de la nave, a la vista: cada tramo sale cuando cae)
    on('abside', !broken);
    on('absideRuin', broken);
    on('cabecera', !broken);
    on('cabeceraRuin', broken);
    on('naveRoof', !broken);
    on('naveRuin', true);
    for (let i = 0; i < NAVE.secs.length; i++) {
      on('naveRoof:' + i, !broken);
      on('naveRuin:' + i, broken);
      // (las del sur caen en la cabalgada, acto 5)
      const arcBroken = i < 3 ? broken : k >= 3;
      on('naveArc:' + i, !arcBroken);
      on('naveArcRuin:' + i, arcBroken);
    }
    for (let i = 0; i < NAVE.faj.length; i++) on('naveFaj:' + i, !broken);
    for (let i = 0; i < NAVE.crowns.length; i++) on('naveCrown:' + i, !broken);
    on('naveBanner', !broken);
    for (let i = 0; i < NAVE.pews.length; i++) {
      on('naveBancos:' + i, !broken);
      on('naveBancosRuin:' + i, broken);
    }
    // los bloques que revientan casa a casa: el norte del corral y la
    // Herrería (acto 3), el centro (acto 5)
    this.waveState('corralN', k >= 2);
    this.waveState('herreria', k >= 2);
    this.waveState('centro', k >= 3);
    // la fachada de la catedral y las almenas al oeste de la brecha (acto 5)
    on('fachada', k < 3);
    on('fachadaRuin', k >= 3);
    for (const n of Object.keys(g.groups)) {
      if (n.startsWith('almenaN:')) on(n, k < 3);
      else if (n.startsWith('almenaNRuin:')) on(n, k >= 3);
      // (las de lo alto de la torre del oeste: el acto 6)
      else if (n.startsWith('almenaT:')) on(n, k < 4);
      else if (n.startsWith('almenaTRuin:')) on(n, k >= 4);
    }
    // lo alto de la torre oeste de la puerta sur (acto 4), su trampilla y su
    // puerta, que revienta la campana (acto 3: desde ahí, ya no se examina)
    on('torreSurTop', k < 3);
    on('torreSurTopRuin', k >= 3);
    on('trampillaS', true);
    on('trampillaSOpen', false);
    on('torreSurDoor', k < 2);
    on('torreSurDoorOpen', k >= 2);
    const td = g.interact.list.find((i) => i.id === 'x_torre_sur');
    if (td) td.hidden = k >= 2;
    // el tejado del establo
    on('wreck:establo', !broken);
    on('wreck:establo:ruin', broken);
    on('wreck:establo:techo', !broken);
    on('wreck:establo:techoRuin', broken);
    this.worldK = k;
  }
  // un bloque de casas que revienta en ola (ver WAVES en builders.js):
  // entero, o todo en ruinas; las ruinas de cada casa salen cuando ésta cae
  waveState(wg, broken) {
    const g = this.g;
    const on = (n, v) => g.setGroupVisible(n, v);
    const keys = Object.keys(g.groups);
    on(wg, !broken);
    for (const n of keys) if (n.startsWith(wg + ':') || n.startsWith(wg + 'Prop:')) on(n, !broken);
    on(wg + 'Ruin', true);
    for (const n of keys) if (n.startsWith(wg + 'Ruin:')) on(n, broken);
  }
  // una casa de un bloque se viene abajo (o: lo de crumble; crumble: false,
  // de golpe y sin más)
  breakHouse(name, o = {}) {
    const g = this.g;
    if (!g.groups[name] || !g.groups[name].on) return false;
    const wg = name.split(':')[0];
    const ruin = name.replace(wg + ':', wg + 'Ruin:');
    if (o.crumble === false) {
      g.setGroupVisible(name, false);
      g.setGroupVisible(ruin, true);
      return true;
    }
    this.crumble(name, { ruin, ...o });
    return true;
  }
  // lo que vuela y lo que se está viniendo abajo, fuera (y lo que caía, otra
  // vez en su sitio)
  clearBits() {
    this.collapses.clear();
    this.chunks.clear();
    this.debris.clear();
    this.splinters.clear();
    this.tiles.clear();
    this.dust.clear();
  }

  // ---------------------------------------------------------- derrumbes
  // El color del polvo en un sitio: el de la luz que hay (la de la luna, la
  // de las antorchas cercanas)
  // (como un muro de piedra clara: la luz del cielo y de la luna de la
  // atmósfera de ahora, más la horneada de las antorchas del sitio; en
  // lineal, como las luces)
  dustColor(at, k = 1) {
    const g = this.g;
    const z = g.zoneAt(at);
    const rid = z && z.room && g.level.ctx.wb.roomId ? g.level.ctx.wb.roomId(z.room) : 0;
    const o = g.probe ? g.probe.sample(at.x, (at.y ?? 0) + 1, at.z, rid) : [0, 0, 0];
    const A = g.atmo,
      h = A.hemi,
      m = A.moon;
    const alb = 0.3 * (this.dustK ?? 1) * k;
    const sky = (c, cm) => (c * h.intensity * 0.8 + cm * m.intensity * 0.4) / Math.PI;
    return [Math.min(0.8, alb * (sky(h.color.r, m.color.r) + o[0])), Math.min(0.8, alb * (sky(h.color.g, m.color.g) + o[1])), Math.min(0.8, alb * (sky(h.color.b, m.color.b) + o[2]))];
  }
  // Polvo de un golpe en 'at' (o: lo de DustClouds.burst, y n)
  puff(at, n = 6, o = {}) {
    this.dust.burst(at, n, { color: this.dustColor(at), ...o });
  }
  // Un pedazo del mundo (un grupo) se viene abajo de verdad: se ladea hacia
  // donde lo empujan y se hunde (collapse.js); de su superficie salen trozos
  // con su material, lejos del golpe; polvo en el golpe, una ola de polvo a
  // ras del suelo alrededor y una nube que se queda flotando; cascotes,
  // astillas, tejas y el estruendo.
  // o: { from (de dónde viene el golpe), dir (hacia dónde cae; si no, lejos
  //   de from), ruin (el grupo de la ruina), n (trozos), size (de los
  //   trozos), speed, up, tilt, drop, dur, delay, dust (0..2), sound
  //   ('houseFall', 'wallBreak'... o false), shake, at (el centro del golpe) }
  // Devuelve lo que cae (o null si ya estaba roto).
  crumble(name, o = {}) {
    const g = this.g;
    const box0 = this._box || (this._box = new THREE.Box3());
    const G = g.groups[name];
    if (!G || !G.on) return null;
    // hacia dónde cae (lejos del golpe)
    let dir = o.dir ? new V3(o.dir.x, 0, o.dir.z) : null;
    if (!dir && o.from) {
      for (const m of G.meshes) if (m.geometry.boundingBox) box0.union(m.geometry.boundingBox);
      const c0 = box0.getCenter(new V3());
      box0.makeEmpty();
      dir = new V3(c0.x - o.from.x, 0, c0.z - o.from.z);
    }
    if (dir && dir.lengthSq() > 1e-6) dir.normalize();
    else dir = null;
    const C = this.collapses.start(name, { ...o, dir });
    if (!C) return null;
    const box = C.box;
    const ctr = box.getCenter(new V3()),
      size = box.getSize(new V3());
    const foot = Math.max(1, size.x * size.z);
    const at = o.at || ctr;
    const away = (p, out) => {
      if (dir) return out.copy(dir);
      out.set(p.x - (o.from ? o.from.x : ctr.x), 0, p.z - (o.from ? o.from.z : ctr.z));
      return out.lengthSq() > 1e-6 ? out.normalize() : out.set(0, 0, 1);
    };
    // trozos de su superficie (no los del suelo, ni los de lo que no se parte)
    const n = o.n ?? clamp(Math.round(5 + Math.sqrt(foot) * 1.4 + size.y * 0.6), 5, 26);
    const pts = sampleSurface(C.meshes, n, (p) => p.y > box.min.y + 0.35);
    const sp = o.speed ?? 1;
    let wood = 0,
      roof = 0;
    const a = new V3();
    for (const q of pts) {
      if (!SOLID.has(q.mat)) continue;
      const big = Math.random() < 0.28;
      const s = (o.size ?? 1) * (big ? rnd(0.85, 1.45) : rnd(0.32, 0.75));
      const isWood = WOOD.has(q.mat),
        isRoof = q.mat === 'roof';
      if (isWood) wood++;
      if (isRoof) roof++;
      const dim = isRoof ? [s * 1.3, 0.16, s * 0.95] : isWood ? [0.24 + s * 0.08, 0.22 + s * 0.06, s * 2.2] : q.mat === 'glass' ? [s * 0.5, s * 0.7, 0.05] : [s * 1.2, s * 0.72, s];
      away(q.p, a);
      // (lejos del golpe, hacia fuera de la cara de la que sale, y arriba)
      const v = new V3(a.x * rnd(2.5, 8) * sp + q.n.x * rnd(0.5, 2.5) + rnd(-1.2, 1.2), rnd(0.5, 5) * (o.up ?? 1) + q.n.y * 1.5, a.z * rnd(2.5, 8) * sp + q.n.z * rnd(0.5, 2.5) + rnd(-1.2, 1.2));
      this.chunks.add({ mat: q.mat, size: dim, pos: q.p, rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: v, spin: [rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)], shatter: isWood ? 99 : big ? 9 : 12, life: rnd(8, 12), dust: !isWood, quiet: true });
    }
    // cascotes, astillas y tejas
    const dk = o.dust ?? 1;
    const top = new V3(ctr.x, box.min.y + size.y * 0.6, ctr.z);
    const ad = dir ? dir.clone().multiplyScalar(0.5) : null;
    this.debris.burst(top, Math.round(clamp(10 + foot * 0.25, 10, 34)), { speed: 7 * sp, up: 5, size: 0.9, spread: Math.max(1.2, Math.sqrt(foot) * 0.35), dir: ad });
    if (wood || o.wood) this.splinters.burst(top, Math.round(8 + wood * 3), { speed: 8 * sp, up: 6, size: 1, spread: 1.5, dir: ad });
    if (roof || o.roof) this.tiles.burst(new V3(ctr.x, box.max.y - 0.5, ctr.z), Math.round(10 + roof * 3), { speed: 7 * sp, up: 6, size: 1, spread: Math.max(1.5, Math.sqrt(foot) * 0.4), dir: ad });
    // el polvo: el golpe, la ola a ras de suelo, la nube que se queda
    const col = this.dustColor(ctr);
    const D = this.dust;
    const R = Math.max(1.5, Math.sqrt(foot) * 0.5);
    D.burst(at, Math.round(4 * dk), { color: col, size: 2.2 + R * 0.4, speed: 7 * sp, up: 1.5, dir: ad ? ad.clone().multiplyScalar(6) : null, life: 3.5, grow: 2, alpha: 0.5 });
    D.ring({ x: ctr.x, y: box.min.y, z: ctr.z }, Math.round(clamp(8 + R * 2, 8, 18) * dk), { color: col, r0: R * 0.7, speed: 6 + R, size: 2 + R * 0.3, life: 5, grow: 1.6, alpha: 0.45, rise: 0.25, up: 0.3 });
    D.burst({ x: ctr.x, y: box.min.y + size.y * 0.35, z: ctr.z }, Math.round(clamp(4 + R, 4, 10) * dk), { color: col, size: 3 + R * 0.6, speed: 1.5, up: 1, spread: R, h: size.y * 0.5, life: 7.5, grow: 1, alpha: 0.32, rise: 0.4, stagger: 0.5 });
    // (y lo que cae aún, en las chispas de polvo de siempre)
    for (let k = 0; k < 2; k++) g.fx.blood.emit(ctr.x + rnd(-R, R), box.min.y + rnd(0.5, size.y), ctr.z + rnd(-R, R), 24, { color: [col[0] * 0.7, col[1] * 0.7, col[2] * 0.7], speed: 4, life: 2, up: 1, gravity: 0.6 });
    const snd = o.sound ?? (foot > 30 || size.y > 6 ? 'houseFall' : 'wallBreak');
    if (snd && g.audio) g.audio.play(snd, { x: ctr.x, y: ctr.y, z: ctr.z }, { k: 1.6 });
    if (o.shake !== false) {
      const d = Math.hypot(g.camera.position.x - ctr.x, g.camera.position.z - ctr.z);
      g.camRig.shake(clamp((o.shake ?? 1) * (1.1 - d * 0.025), 0.12, 1.2));
      g.input.rumble(0.6, 0.9, 300);
    }
    return C;
  }

  cpIndex(cp) {
    const i = CPS.indexOf(cp);
    return i < 0 ? 0 : i;
  }

  // ---------------------------------------------------------- banderas
  applyFlags() {
    const F = this.g.flags;
    this.film.stop();
    this.clearBits();
    if (this.giant) this.giant.show(false);
    if (F['boss:turiferario']) {
      this.stage = 'done';
      this.setWorld(4);
    } else if (F['finale:rite']) {
      // (a mitad de la película: se vuelve a su último punto de control)
      this.stage = 'film';
      this.cp = F['film:cp'] || 'rito';
      this.setWorld(this.cpIndex(this.cp));
      this._resumeOnPlay = true;
    } else {
      this.stage = 'off';
      this.setWorld(0);
    }
  }
  reset() {
    this.film.stop();
    this.film.cinema(false);
    this.clearBits();
    this.clearOwned();
    this.g.chaseRun = false;
    if (this.giant) this.giant.show(false);
    this.stage = 'off';
    this.cp = null;
    this._resumeOnPlay = false;
    this.setWorld(0);
  }

  // ---------------------------------------------------------- empezar
  // Vencido el arzobispo (game.archbishopDefeated): la película.
  startFilm(archbishop = null) {
    const g = this.g;
    this.stage = 'film';
    g.flags['finale:rite'] = true;
    this.setCP('rito', false);
    this.archbishop = archbishop || g.bosses.turibulario || null;
    this.runFrom('rito', { fromFight: !!archbishop });
  }
  // un punto de control alcanzado (y se guarda)
  setCP(cp, save = true) {
    const g = this.g;
    this.cp = cp;
    g.flags['film:cp'] = cp;
    if (save) g.saveGame();
  }
  // la película desde un punto de control
  runFrom(cp, o = {}) {
    const g = this.g;
    this.cp = cp;
    this._resumeOnPlay = false;
    this.clearBits();
    this.clearOwned();
    this._clothDone = false;
    g.chaseRun = false;
    this.promptFn = null;
    this.gow1 = null;
    this.arm = null;
    this._approach = null;
    if (this.giant) {
      this.giant.onEventHook = null;
      this.giant.rootMotion = false;
      this.giant.groundFn = null;
      this.giant.ik = {};
      this.giant._armScript = false;
    }
    this.setWorld(this.cpIndex(cp));
    const act = ACTS[cp];
    this.film.run(act(this, o));
  }
  // tras morir: desde el último punto de control
  retry() {
    const g = this.g,
      p = g.player;
    g.qte.cancel();
    this.film.skipStop();
    p.dead = false;
    p.hp = p.maxHp;
    p.st = p.maxSt;
    p.flasks = p.maxFlasks;
    p.state = 'free';
    p.puppet = false;
    g.fadeTarget = 1;
    this.runFrom(this.cp || 'rito', { retry: true });
  }
  // al morir fuera de la película (contra el arzobispo, o en cualquier otro
  // sitio): aquí no hay nada que deshacer, salvo lo que quede volando
  onRespawn() {
    this.clearBits();
  }
  // fin de la película: el gigante, hundido en la cisterna
  endFilm() {
    const g = this.g;
    this.stage = 'done';
    g.flags['boss:turiferario'] = true;
    g.flags['boss:turibulario'] = true;
    delete g.flags['film:cp'];
    this.setWorld(4);
    // la reja del río, abierta
    for (const it of g.interact.list) {
      if (it.kind !== 'door') continue;
      if (it.lock.type === 'boss' && it.lock.boss === 'turibulario') {
        g.interact.setOpen(it);
        g.flags['door:' + it.id] = true;
      }
    }
    g.saveGame();
    // (con el objeto verdadero, aquí empezaría lo de Deo Ignoto; ver arriba)
  }

  // ---------------------------------------------------------- cada fotograma
  update(dt) {
    const g = this.g;
    // (se cargó la partida a mitad: al empezar a jugar, desde el punto de control)
    if (this._resumeOnPlay && g.state === 'play' && !g.ui.modal) this.runFrom(this.cp || 'rito', { resume: true });
    if (this.stage === 'film') {
      // saltar la cinemática (no mientras haya un aviso de pulsación)
      if (this.film.skipOK && g.input.pressed('interact') && !g.qte.active && (g.time - (this._qteEnd || -9)) > 0.6) this.film.trySkip();
      if (g.qte.active) this._qteEnd = g.time;
      this.film.update(dt);
      if (this.giant && this.giant.visible) this.giant.update(dt);
    }
    // (la cámara libre no se mete dentro del gigante)
    g.camRig.body = this.stage === 'film' && this.giant && this.giant.visible ? this.giant.col : null;
    if (this.stage === 'film') for (const o of this.ticks || []) o.update(dt);
    this.collapses.update(dt);
    this.chunks.update(dt);
    const dg = this._dg || (this._dg = (x, z) => g.world.col.groundHeight(x, z, 0.1, 30, true));
    this.debris.update(dt, dg);
    this.splinters.update(dt, dg);
    this.tiles.update(dt, dg);
    this.dust.update(dt);
    this._lights(dt);
  }
  // luces propias de la película (del pool del juego)
  light(o) {
    const L = this.g.fx.lights.add({ intensity: 0, range: 12, flicker: 1, priority: 7, on: true, ...o });
    this.lights.push(L);
    return L;
  }
  // lo que pone la película en la escena (mallas, telas, haces de luz): se
  // quita al volver a un punto de control
  own(o) {
    (this.owned || (this.owned = [])).push(o);
    return o;
  }
  // y lo que además se mueve solo cada fotograma (la espringala, su cadena)
  tick(o) {
    (this.ticks || (this.ticks = [])).push(o);
    return this.own(o);
  }
  clearOwned() {
    const g = this.g;
    for (const L of this.lights) L.on = false;
    const src = g.fx.lights.sources;
    for (const L of this.lights) {
      const i = src.indexOf(L);
      if (i >= 0) src.splice(i, 1);
    }
    this.lights.length = 0;
    for (const o of this.owned || []) {
      if (o.dispose) o.dispose();
      else if (o.parent) o.parent.remove(o);
    }
    this.owned = [];
    this.ticks = [];
    this.springald = null;
    this.springald2 = null;
    this._clothDone = true;
  }
  dropLight(L) {
    L.on = false;
    const i = this.lights.indexOf(L);
    if (i >= 0) this.lights.splice(i, 1);
  }
  _lights() {}

  // ---------------------------------------------------------- pruebas
  // (modo de pruebas) la película desde un punto de control, como si se
  // llegara jugando (con el arzobispo de rodillas, si es el principio)
  async debugFilm(cp = 'rito') {
    const g = this.g;
    await this.ensureGiant();
    g.flags['finale:rite'] = true;
    delete g.flags['boss:turiferario'];
    delete g.flags['boss:turibulario'];
    this.stage = 'film';
    this.archbishop = g.bosses.turibulario || null;
    this.setCP(cp, false);
    this.runFrom(cp, { debug: true });
  }

  // ---------------------------------------------------------- jugador
  prompt() {
    if (this.stage !== 'film' || !this.promptFn) return undefined;
    return this.promptFn();
  }
  interact(it) {
    if (it && it.onUse) it.onUse();
  }
  playerSwing() {}
  onImpact(at, r, kind) {
    this.wrecks.hit(at, r, kind);
  }
}
