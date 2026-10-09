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
// atrio) se queda en el código y se puede probar desde el modo de pruebas;
// habrá que rehacer su entrada (que salga del cráter) y su arena.
// Ver hasTrueItem() y endFilm().
// ------------------------------------------------------------------------
import * as THREE from 'three';
import { Film } from './film.js';
import { Giant } from './giant.js';
import { Debris } from './debris.js';
import { Chunks } from './chunks.js';
import { Wrecks } from './wrecks.js';
import { ACTS } from './film_acts.js';
import { NAVE } from '../../world/level_finale.js';

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
    this.debris = new Debris(game.scene, 160);
    this.chunks = new Chunks(game, this.debris);
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
    on('cisternPit', broken);
    on('cisternCols', !broken);
    on('cisternColsRuin', broken);
    on('cisternDome', !broken);
    on('cisternDomeRuin', broken);
    on('cisternCrown', !broken);
    on('craterLid', !broken);
    on('crater', broken);
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
    // el tejado del establo
    on('wreck:establo', !broken);
    on('wreck:establo:ruin', broken);
    on('wreck:establo:techo', !broken);
    on('wreck:establo:techoRuin', broken);
    this.worldK = k;
  }
  cpIndex(cp) {
    const i = CPS.indexOf(cp);
    return i < 0 ? 0 : i;
  }

  // ---------------------------------------------------------- banderas
  applyFlags() {
    const F = this.g.flags;
    this.film.stop();
    this.chunks.clear();
    this.debris.clear();
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
    this.chunks.clear();
    this.debris.clear();
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
    this.chunks.clear();
    this.debris.clear();
    this.clearOwned();
    this._clothDone = false;
    g.chaseRun = false;
    if (this.giant) {
      this.giant.onEventHook = null;
      this.giant.rootMotion = false;
      this.giant.groundFn = null;
      this.giant.ik = {};
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
    this.chunks.update(dt);
    this.debris.update(dt, this._dg || (this._dg = (x, z) => g.world.col.groundHeight(x, z, 0.1, 30, true)));
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
