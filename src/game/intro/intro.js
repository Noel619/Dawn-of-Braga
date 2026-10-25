// La introducción: lo que pasó en Braga, contado como en las de Dark Souls o
// Elden Ring, de lo más viejo a lo de ahora, y al final el preso en su celda,
// donde se empieza a jugar. Los sitios son los de verdad (la cisterna, el
// templo romano, la antesala, la Sé, la muralla, la celda), tal como están
// ahora; lo que pasó en ellos lo cuentan los ecos (ghosts.js), figuras de
// luz que aparecen y se deshacen en ceniza. Sin voz: rótulos en la franja de
// abajo, con la letra de los documentos.
//
//   la fuente   la cisterna: la reja, el agua roja, el ídolo
//   roma        el templo romano: el ara, DEO IGNOTO
//   martin      la antesala: Martín ante la puerta, los que se taparon la cara
//   se          la Sé encima, en la niebla
//   asedio      1167: la muralla, el campamento almohade, los defensores
//   arzobispo   el templo: de rodillas ante el ara; sus canónigos
//   puerta      la antesala: abre lo que Martín cerró
//   pacto       la cisterna: mete las manos en el agua; el cordón
//   campana     la campana de la Sé toca sola: la calle, la muralla, el campo
//   sello       la antesala: dos canónigos arrancan la Garra y cierran
//   preso       la celda del fondo: NO TE ARRODILLES, con los dedos
//   mirada      el ídolo, desde la reja: algo se fija en él
//   titulo      Dawn of Braga; «Braga. Tercera noche después de la caída.»
//
// Se salta manteniendo «interactuar». Al acabar (o al saltarla) todo vuelve
// a como estaba y empieza la partida (beginPlay).
import * as THREE from 'three';
import { Film, sm, smoother } from '../finale/film.js';
import { Ghost } from './ghosts.js';
import { SPRING, CISTERN } from '../../world/level_finale.js';
import { TEMPLO } from '../../world/level_sacred.js';
import { objMat } from '../../gfx/materials.js';
import { sampleClip } from '../../entities/rig.js';
import { DEG } from '../../core/util.js';
import { MSG } from '../story.js';

const V3 = THREE.Vector3;
const AY = CISTERN.AY;
const CZ = CISTERN.cz;
const YD = -5; // el suelo de las mazmorras del castillo
// el templo romano: el eje de su nave y el ara del ábside
const TX = (TEMPLO.x0 + TEMPLO.x1) / 2,
  TY = -7,
  TAZ = TEMPLO.z0 - 1.55;
// la antesala: la puerta, el estrado, los Velados
const DOOR = { x: -16, z: -152 };
// lo que se ve "de antes": sin color, más niebla, más brillo en la luz
const MEM = { sat: 0.36, bloom: 1.35 };
// la celda del fondo
const CELL = { x: -87.6, z: -16.2, wall: -18 };

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

export class Intro {
  constructor(game) {
    this.g = game;
    this.F = new Film(game);
    this.active = false;
    this.ghosts = [];
    this.shown = []; // criaturas del mundo que la intro enseña (los Velados)
    this.clock = 0;
    this.capEnd = 0;
    this.skipT = 0;
    this.hintT = 0;
  }

  // ------------------------------------------------------------ interfaz
  dom() {
    if (this.cap) return;
    const mk = (id, cls) => {
      const d = document.createElement('div');
      d.id = id;
      if (cls) d.className = cls;
      document.body.appendChild(d);
      return d;
    };
    this.cap = mk('intro-cap', 'f-bast');
    this.titleEl = mk('intro-title');
    this.skipEl = mk('intro-skip', 'f-hand');
  }
  // un rótulo en la franja de abajo, durante dur segundos (big: grande)
  say(text, dur = 4.5, o = {}) {
    this.cap.innerHTML = text
      .split('\n')
      .map((l) => `<div class="${o.big ? 'big' : ''}">${esc(l)}</div>`)
      .join('');
    this.cap.classList.add('show');
    this.capEnd = this.clock + dur;
  }
  unsay() {
    this.cap && this.cap.classList.remove('show');
    this.capEnd = 0;
  }

  // ------------------------------------------------------------ escena
  // la atmósfera de un plano (al cortar, de golpe)
  look(name, o = {}) {
    const g = this.g;
    g.atmo.set(name, true);
    g.atmo.override = { ...o, snap: true };
    g.audio && g.audio.setZone(name);
  }
  ghost(kind, o = {}) {
    const G = new Ghost(this.g, kind, o);
    this.ghosts.push(G);
    return G;
  }
  // todos los ecos se deshacen (y se tiran después)
  *fadeGhosts(dur = 1.2) {
    for (const G of this.ghosts) G.hide(dur);
    yield* this.F.wait(dur + 0.1);
    for (const G of this.ghosts) G.dispose();
    this.ghosts = [];
  }
  dropGhosts() {
    for (const G of this.ghosts) G.dispose();
    this.ghosts = [];
  }
  // una criatura del mundo que se ve en un plano (los Velados, ante su
  // puerta): el guion la muestra y la anima; al acabar se devuelve
  showEnemy(e, on = true) {
    if (!e) return;
    if (on) {
      if (!this.shown.includes(e)) this.shown.push(e);
      e.scripted = true;
      e.obj.visible = true;
    } else e.obj.visible = false;
  }

  // la campana de la torre este, que se mueve sola
  bell() {
    if (this._bell) return this._bell;
    const pts = [
      [0.0, -1.82],
      [0.4, -1.8],
      [0.58, -1.55],
      [0.66, -1.05],
      [0.86, -0.5],
      [1.08, -0.12],
      [1.12, 0.0],
      [0.98, 0.02],
    ].map(([r, y]) => new THREE.Vector2(r, y + 1.82));
    const g = new THREE.Group();
    const geo = new THREE.LatheGeometry(pts, 14);
    geo.translate(0, -1.82, 0);
    const m = new THREE.Mesh(geo, objMat('bronze', { side: THREE.DoubleSide }));
    g.add(m);
    // (la corona, con la que cuelga del cabezal)
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), objMat('iron'));
    crown.position.y = 0.27;
    g.add(crown);
    const clap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 6), objMat('iron'));
    clap.position.y = -0.8;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), objMat('iron'));
    ball.position.y = -1.5;
    const cl = new THREE.Group();
    cl.add(clap, ball);
    g.add(cl);
    g.position.set(9, 20.02, -60);
    g.visible = false;
    this.g.scene.add(g);
    this._bell = { g, cl, a: 0, v: 0, on: false };
    return this._bell;
  }

  // ------------------------------------------------------------ empezar y acabar
  start(done, o = {}) {
    const g = this.g;
    this.dom();
    this.done = done;
    this.active = true;
    this.clock = 0;
    this.skipT = 0;
    this.skipping = false;
    g.state = 'intro';
    g.zone = g.zoneAt(g.player.pos);
    g.ui.showHud(false);
    g.player.obj.visible = false;
    g.lockTarget = null;
    this.F.cinema(true, { instant: true, skip: false });
    this.F.setBars(1, true);
    g.fade = 0;
    g.fadeTarget = 0;
    const order = ['fuente', 'roma', 'martin', 'se', 'asedio', 'arzobispo', 'puerta', 'pacto', 'campana', 'sello', 'preso', 'mirada', 'titulo'];
    const from = Math.max(0, order.indexOf(o.from || 'fuente'));
    const self = this;
    this.F.run(
      (function* () {
        for (const name of order.slice(from)) {
          self.shot = name;
          yield* self['s_' + name]();
        }
      })()
    );
  }

  // Saltarla: fundido a negro y al título.
  skip() {
    if (this.skipping || !this.active) return;
    const g = this.g;
    this.skipping = true;
    this.unsay();
    g.audio && g.audio.stopMusic();
    g.fadeTarget = 0;
    const self = this;
    this.F.run(
      (function* () {
        yield* self.F.wait(0.8);
        self.cleanWorld();
        self.shot = 'titulo';
        yield* self.s_titulo(true);
      })()
    );
  }

  // Todo lo del mundo vuelve a como estaba
  cleanWorld() {
    const g = this.g;
    this.dropGhosts();
    for (const e of this.shown) {
      e.scripted = false;
      e.obj.visible = false;
    }
    this.shown = [];
    if (this._bell) this._bell.g.visible = false;
    g.setGroupVisible('campanaSe', true);
    g.setGroupVisible('carneAra', true);
    if (g.crypt) g.crypt.applyFlags();
    if (g.spring) {
      g.spring.cordFor = null;
      g.spring.boost = 0;
    }
    if (this._light) this._light.on = false;
    g.atmo.override = null;
  }

  // (volver al título a mitad: todo en su sitio, sin empezar la partida)
  abort() {
    this.done = null;
    this.finish();
  }

  finish() {
    const g = this.g;
    this.cleanWorld();
    this.unsay();
    this.titleEl && this.titleEl.classList.remove('show');
    this.skipEl && this.skipEl.classList.remove('show');
    this.F.stop();
    this.F.setBars(0, true);
    this.F.cine = false;
    g.post.U.uBars.value = 0;
    g.post.U.uVignette.value = 1.25;
    g.camRig.override = null;
    this.active = false;
    const d = this.done;
    this.done = null;
    if (d) d();
  }

  update(dt) {
    if (!this.active) return;
    const g = this.g,
      inp = g.input;
    this.clock += dt;
    // saltar: manteniendo «interactuar» (el aviso sale al tocar algo)
    if (!this.skipping) {
      if (inp.anyPressed) this.hintT = this.clock + 3;
      const h = inp.held('interact');
      this.skipEl.innerHTML = `${g.ui.keyHtml('interact')} Mantén para saltar`;
      this.skipEl.classList.toggle('show', this.clock < this.hintT || h > 0);
      if (h > 0.9) this.skip();
    } else this.skipEl.classList.remove('show');
    if (this.capEnd && this.clock > this.capEnd) this.unsay();
    this.F.update(dt);
    for (const G of this.ghosts) G.update(dt);
    for (const e of this.shown) if (e.obj.visible) e.animate(dt);
    // la campana
    const B = this._bell;
    if (B && B.g.visible) {
      // un péndulo al que se empuja (B.push): va y viene y se para
      B.v += (-B.a * 4.2 - B.v * 0.35) * dt;
      B.a += B.v * dt;
      // (de lado a lado, vista desde la plaza)
      B.g.rotation.z = B.a;
      B.cl.rotation.z = -B.a * 0.6 + Math.sin(this.clock * 3.1) * 0.05;
    }
    if (!this.F.active) this.finish();
  }

  // ------------------------------------------------------------ los planos
  // 1. La fuente: se baja desde la cúpula de la cisterna hasta la reja
  *s_fuente() {
    const g = this.g,
      F = this.F,
      a = g.audio;
    this.look('arena', { ...MEM, sat: 0.55, density: 0.032 });
    a && a.music('introMito');
    yield* F.wait(0.6);
    a && a.play('drip', { x: 0.4, y: AY - 1.2, z: CZ + 0.3 });
    g.fadeTarget = 1;
    F.also(
      (function* (self) {
        yield* F.wait(1.6);
        self.say('Bajo Braga hay una fuente que no tiene nombre.', 5);
        yield* F.wait(6.0);
        self.say('Nadie sabe qué duerme en ella.', 4.2);
      })(this)
    );
    yield* F.move({ pos: [0.6, 2.6, CZ + 0.8], look: [0.3, AY, CZ + 0.2], fov: 48 }, { pos: [2.3, AY + 2.1, CZ + 3.6], look: [0, AY - 1.1, CZ], fov: 46 }, 12.5, smoother);
    g.fadeTarget = 0;
    yield* F.wait(0.9);
  }

  // 2. Roma: el templo y su ara (sin la carne de ahora). Un cantero, de
  // rodillas, graba DEO IGNOTO; un sacerdote con la toga sobre la cabeza
  // canta, y detrás dos más se inclinan
  *s_roma() {
    const g = this.g,
      F = this.F;
    this.look('crypt', { ...MEM, density: 0.05 });
    g.setGroupVisible('carneAra', false);
    const ca = this.ghost('cantero').at(TX + 1.2, TY, TAZ + 1.05, Math.PI + 0.4).pose('kcarveUp', 0).show(1.6);
    const pr = this.ghost('roman').at(TX - 1.05, TY, TAZ + 1.95, Math.PI - 0.35).pose('sing', 0).show(2);
    this.ghost('roman').at(TX - 2.1, TY, TAZ + 4.0, Math.PI - 0.2).pose('bow', 0).show(2.4);
    this.ghost('roman').at(TX + 2.1, TY, TAZ + 4.2, Math.PI + 0.2).pose('bow', 0).show(2.4);
    g.fadeTarget = 1;
    // el cantero: a golpes de mazo
    F.also(
      (function* () {
        for (let k = 0; k < 14; k++) {
          ca.pose('kcarveUp', 0.42);
          yield* F.wait(0.45);
          ca.pose('kcarveHit', 0.12);
          g.audio && g.audio.play('dig', { x: TX + 1.0, y: TY + 0.8, z: TAZ + 0.7 }, { k: 0.45 });
          yield* F.wait(0.38);
        }
      })()
    );
    F.also(
      (function* (self) {
        yield* F.wait(1.2);
        self.say('Los romanos le alzaron un templo y, como no sabían a quién, escribieron en el ara:', 5.2);
        yield* F.wait(5.6);
        self.say('DEO IGNOTO\nAl dios desconocido.', 3.6, { big: true });
        yield* F.wait(4.2);
        self.say('Lo que supieron después se perdió con ellos.', 3.8);
        pr.pose('lookUp', 1.2);
      })(this)
    );
    yield* F.move({ pos: [TX + 0.5, TY + 1.55, TAZ + 10.5], look: [TX, TY + 1.2, TAZ], fov: 46 }, { pos: [TX - 0.2, TY + 1.15, TAZ + 4.6], look: [TX + 0.1, TY + 0.85, TAZ + 0.6], fov: 40 }, 13.6, sm);
    g.fadeTarget = 0;
    yield* this.fadeGhosts(0.9);
    g.setGroupVisible('carneAra', true);
  }

  // 3. Martín: ante la puerta, con su báculo y su farol; a los lados, dos de
  // sus monjes se tapan la cara... y donde estaban quedan los Velados
  *s_martin() {
    const g = this.g,
      F = this.F;
    this.look('sanctum', { ...MEM, density: 0.03 });
    const VL = g.bosses.guardianL,
      VR = g.bosses.guardianR;
    this.showEnemy(VL, false);
    this.showEnemy(VR, false);
    const m = this.ghost('martin').at(DOOR.x - 3.6, AY, DOOR.z, Math.PI / 2).pose('lantern', 0).show(2);
    const v1 = this.ghost('veiled').at(-21, AY, -155.6, -Math.PI / 2).pose('kneel', 0).show(2.2);
    const v2 = this.ghost('veiled').at(-21, AY, -148.4, -Math.PI / 2).pose('kneel', 0).show(2.2);
    this.light(DOOR.x - 3.2, AY + 1.6, DOOR.z + 0.3, 0xffc070, 3.2, 6);
    g.fadeTarget = 1;
    F.also(
      (function* (self) {
        yield* F.wait(1.0);
        self.say('Martín de Dumio bajó hasta ella y no la rompió: no se rompe lo que no se conoce.', 5.2);
        yield* F.wait(5.0);
        v1.pose('cover', 1.4);
        v2.pose('cover', 1.4);
        yield* F.wait(0.8);
        self.say('Le echó cuatro cerrojos y puso delante a dos que no quisieron verle.', 5);
        yield* F.wait(2.6);
        // los dos se hacen piedra: los Velados
        self.showEnemy(VL);
        self.showEnemy(VR);
        v1.hide(2.2);
        v2.hide(2.2);
      })(this)
    );
    yield* F.move({ pos: [-35.5, AY - 1.3, DOOR.z - 0.6], look: [DOOR.x, AY + 2.1, DOOR.z], fov: 50 }, { pos: [-29.5, AY - 0.7, DOOR.z + 0.4], look: [DOOR.x, AY + 2.4, DOOR.z], fov: 48 }, 14, sm);
    m.hide(1.4);
    g.fadeTarget = 0;
    yield* F.wait(1.0);
    this.light(0, 0, 0, 0, 0, 0);
    this.showEnemy(VL, false);
    this.showEnemy(VR, false);
    yield* this.fadeGhosts(0.4);
  }

  // una luz para el plano (el farol de Martín, la Garra...); intensidad 0 la apaga
  light(x, y, z, color, intensity, range) {
    const g = this.g;
    if (!this._light) this._light = g.fx.lights.add({ x, y, z, color: 0xffffff, intensity: 0, range: 6, flicker: 1, priority: 8, on: false });
    const L = this._light;
    L.x = x;
    L.y = y;
    L.z = z;
    if (color) L._c.set(color);
    L.intensity = intensity;
    L.range = range || L.range;
    L.on = intensity > 0;
  }

  // 4. La Sé, encima, en la niebla: la grúa sube desde la calle, por encima
  // del arco, hasta la fachada y sus torres
  *s_se() {
    const g = this.g,
      F = this.F;
    this.look('city', { ...MEM, sat: 0.4, density: 0.022 });
    g.fadeTarget = 1;
    F.also(
      (function* (self) {
        yield* F.wait(1.5);
        self.say('Encima se alzó la Sé. Y Braga olvidó.', 5);
      })(this)
    );
    g.audio && g.audio.play('bellToll', { x: 9, y: 19, z: -60 }, { k: 0.5 });
    yield* F.move({ pos: [0, 1.7, -20], look: [0, 10, -60], fov: 46 }, { pos: [0, 9.2, -33.5], look: [0.5, 16, -60], fov: 40 }, 10, smoother);
    g.fadeTarget = 0;
    yield* F.wait(0.9);
  }

  // 5. 1167: desde el campo, por detrás de la hueste almohade, en filas
  // frente a la muralla este; en el adarve, los defensores; a un lado, la
  // torre de asedio ardiendo (el campamento es el de verdad: las tiendas,
  // las hogueras, la torre)
  *s_asedio() {
    const g = this.g,
      F = this.F,
      a = g.audio;
    this.look('ramparts', { ...MEM, sat: 0.45, density: 0.016 });
    a && a.music('introAsedio');
    for (const [z, pose] of [
      [-31.4, 'shield'],
      [-29.2, 'spear'],
      [-26.8, 'shield'],
    ])
      this.ghost('soldier').at(74.9, 9, z, Math.PI / 2 + (Math.random() - 0.5) * 0.2).pose(pose, 0).show(1.6 + Math.random());
    this.host(1.5);
    g.fadeTarget = 1;
    F.also(
      (function* (self) {
        yield* F.wait(1.2);
        self.say('Otoño de 1167. Desde hacía tres años, Portugal perdía tierra ante los almohades.', 5.6);
        yield* F.wait(6.0);
        self.say('En octubre llegaron a Braga.', 4);
        a && a.play('warHorn', { x: 110, y: 3, z: -30 }, { k: 0.8 });
      })(this)
    );
    yield* F.move({ pos: [105, 5.0, -12.5], look: [78, 6.5, -30], fov: 46 }, { pos: [99.5, 2.4, -18.5], look: [77, 7.5, -31], fov: 48 }, 12.5, sm);
    g.fadeTarget = 0;
    yield* this.fadeGhosts(0.9);
  }

  // la hueste almohade: tres filas frente a la muralla este, mirándola
  host(fade = 1.5) {
    const out = [];
    for (let r = 0; r < 3; r++)
      for (let i = 0; i < 7; i++) {
        const x = 83 + r * 2.8 + (Math.random() - 0.5) * 0.6,
          z = -38.5 + i * 2.6 + (r % 2) * 1.3 + (Math.random() - 0.5) * 0.5;
        const kind = r === 1 && i % 3 === 1 ? 'standard' : 'almohad';
        const G = this.ghost(kind, { motes: Math.random() < 0.3 })
          .at(x, 0, z, -Math.PI / 2 + (Math.random() - 0.5) * 0.25)
          .pose(i % 3 ? 'spear' : 'shield', 0)
          .show(fade * (1 + Math.random()));
        G.mat.uniforms.uGain.value = 1.5;
        out.push(G);
      }
    return out;
  }

  // 6. El arzobispo: de rodillas ante el ara, con su incensario; detrás, sus
  // dos canónigos
  *s_arzobispo() {
    const g = this.g,
      F = this.F,
      a = g.audio;
    this.look('crypt', { ...MEM, density: 0.05 });
    a && a.music('introMito');
    g.setGroupVisible('carneAra', false);
    const ar = this.ghost('arch').at(TX, TY, TAZ + 1.55, Math.PI).pose('pray', 0).show(2);
    ar.mat.uniforms.uGain.value = 1.6;
    const c1 = this.ghost('canon').at(TX - 2.6, TY, TAZ + 2.7, Math.PI - 0.5).pose('stand', 0).show(2.4);
    const c2 = this.ghost('canon').at(TX + 2.6, TY, TAZ + 2.7, Math.PI + 0.5).pose('stand', 0).show(2.4);
    g.fadeTarget = 1;
    F.also(
      (function* (self) {
        yield* F.wait(1.0);
        self.say('El arzobispo bajó a buscar a Dios bajo la cripta, y encontró un altar sin nombre.', 5.4);
        yield* F.wait(4.0);
        c1.pose('turnR', 1.2);
        c2.pose('turnL', 1.2);
        yield* F.wait(1.8);
        self.say('Creyó que era un regalo.', 3.6);
        ar.pose('kraise', 1.6);
      })(this)
    );
    yield* F.move({ pos: [TX - 0.3, TY + 1.35, TAZ + 7.4], look: [TX, TY + 1.0, TAZ + 0.4], fov: 46 }, { pos: [TX - 0.55, TY + 1.0, TAZ + 4.4], look: [TX, TY + 1.1, TAZ + 0.6], fov: 42 }, 11, sm);
    g.fadeTarget = 0;
    yield* this.fadeGhosts(0.9);
    g.setGroupVisible('carneAra', true);
  }

  // 7. La puerta: sube por el estrado entre los Velados, pone la Garra en la
  // cerradura; la sangre llena los círculos, el incensario humea y se abre
  *s_puerta() {
    const g = this.g,
      F = this.F,
      a = g.audio,
      C = g.crypt;
    this.look('sanctum', { ...MEM, sat: 0.62, density: 0.026 });
    a && a.music('introCampana');
    const VL = g.bosses.guardianL,
      VR = g.bosses.guardianR;
    this.showEnemy(VL);
    this.showEnemy(VR);
    const ar = this.ghost('arch').at(-31.5, AY - 3, DOOR.z, Math.PI / 2).pose('stand', 0).show(1.6);
    ar.walkTo(-27, DOOR.z, 1.0, AY - 1.5);
    g.fadeTarget = 1;
    F.also(
      (function* (self) {
        yield* F.wait(1.0);
        self.say('La decimocuarta noche del asedio, abrió lo que Martín había cerrado.', 5.6);
      })(this)
    );
    let arrived = false;
    F.also(
      (function* () {
        yield* F.until(() => ar.done, 8);
        // (por el lado del incensario grande, que cuelga en medio)
        ar.walkTo(-24.6, DOOR.z + 1.5, 1.2, AY);
        yield* F.until(() => ar.done, 8);
        ar.walkTo(-20.2, DOOR.z + 1.4, 1.1, AY);
        yield* F.until(() => ar.done, 8);
        ar.walkTo(DOOR.x - 1.3, DOOR.z - 0.6, 1.0, AY);
        yield* F.until(() => ar.done, 8);
        ar.face(DOOR.x, DOOR.z - 0.6);
        ar.pose('raise', 0.8);
        yield* F.wait(0.6);
        arrived = true;
      })()
    );
    yield* F.move({ pos: [-36.5, AY - 1.4, DOOR.z + 1.4], look: [DOOR.x, AY + 2.0, DOOR.z], fov: 48 }, { pos: [-28.0, AY + 1.5, DOOR.z + 5.0], look: [DOOR.x - 1.5, AY + 1.9, DOOR.z + 0.4], fov: 48 }, 9.5, sm);
    // de cerca, por detrás de él cuando llega: la mano en alto, la Garra en
    // la cerradura; la sangre, el humo y la puerta
    yield* F.until(() => ar.root.position.x > DOOR.x - 4.2, 5);
    F.also(F.move({ pos: [DOOR.x - 4.6, AY + 1.35, DOOR.z + 2.4], look: [DOOR.x - 0.6, AY + 2.2, DOOR.z - 0.3], fov: 52 }, { pos: [DOOR.x - 5.6, AY + 1.6, DOOR.z + 1.4], look: [DOOR.x, AY + 2.4, DOOR.z - 0.1], fov: 50 }, 9, sm));
    yield* F.until(() => arrived, 4);
    if (C) {
      C.claw.visible = true;
      a && a.play('clawTurn', { x: DOOR.x, y: AY + 2.5, z: DOOR.z });
      let t = 0;
      while (t < 6.5) {
        const dt = yield;
        t += dt;
        const u0 = Math.min(1, t / 0.8);
        C.claw.position.copy(C.clawAt(-0.15 * (1 - u0)));
        C.claw.rotation.x = -sm((t - 0.8) / 0.6) * (Math.PI / 2);
        const fill = sm((t - 1.2) / 2.2);
        for (const c of C.circles) for (const f of c.fills) f.scale.setScalar(Math.max(0.001, fill));
        C.setInscription(fill);
        C.lineColor(fill, 0.85 + 0.15 * Math.sin(t * 6));
        C.doorGlow.material.opacity = fill * 0.22;
        if (t > 2.2 && !C.censer.lit) C.setCenser(true, false);
        C.updateCenser(dt);
        const o = sm((t - 3.6) / 2.8);
        for (const lf of C.leaves) lf.rotation.y = lf.userData.s * 1.45 * o;
        C.doorLight.intensity = 2 + 2.5 * o;
        C.doorLight.on = true;
        if (t > 3.6 && !this._rumble) {
          this._rumble = true;
          a && a.play('godDoor', { x: DOOR.x, y: AY + 2.5, z: DOOR.z });
          g.camRig.shake(0.6);
        }
        if (o > 0 && o < 1) g.camRig.shake(dt * 0.4);
      }
      this._rumble = false;
    }
    g.fadeTarget = 0;
    yield* this.fadeGhosts(0.9);
    this.showEnemy(VL, false);
    this.showEnemy(VR, false);
  }

  // 8. El pacto: de rodillas sobre la fuente, mete las manos por el boquete
  // de la reja; el agua se enciende, se le pega el cordón y se vuelve rojo
  *s_pacto() {
    const g = this.g,
      F = this.F,
      a = g.audio,
      S = g.spring;
    this.look('arena', { ...MEM, sat: 0.6, density: 0.03 });
    // (de rodillas en el borde del boquete, de cara a él: las manos, dentro)
    const ar = this.ghost('arch').at(SPRING.x + 0.72, AY, SPRING.z, -Math.PI / 2).pose('kneel', 0).show(1.4);
    ar.mat.uniforms.uGain.value = 1.4;
    g.fadeTarget = 1;
    F.also(
      (function* (self) {
        yield* F.wait(1.2);
        self.say('Quiso pactar con lo que había dentro.', 4.2);
        yield* F.wait(5.0);
        self.say('Y lo que había dentro se quedó con él.', 4.6);
      })(this)
    );
    F.shot([-3.4, AY + 2.5, CZ + 3.0], [0.3, AY + 0.1, CZ], { fov: 48 });
    yield* F.wait(1.6);
    ar.pose('reach', 1.6);
    yield* F.wait(1.8);
    // el agua se enciende
    let t = 0;
    a && a.play('burn', { x: 0, y: AY, z: CZ }, { k: 1.2 });
    while (t < 2.4) {
      const dt = yield;
      t += dt;
      if (S) S.boost = Math.min(1, t / 0.8);
      const k = Math.min(1, t / 2.0);
      ar.color([0.7 + 0.3 * k, 0.63 - 0.45 * k, 0.52 - 0.42 * k]);
      g.camRig.shake(dt * 0.3);
    }
    // el cordón, de la fuente a su espalda
    if (S)
      S.cordFor = {
        pos: ar.root.position,
        yaw: ar.root.rotation.y,
        phase: 2,
        attach: (out) => ar.rig.worldPos('hips', out, new V3(0, -0.05, -0.2)),
      };
    a && a.play('fleshTear', { x: 0, y: AY, z: CZ }, { k: 1.2 });
    ar.pose('kneel', 1.2);
    yield* F.move({ pos: [-3.4, AY + 2.5, CZ + 3.0], look: [0.3, AY + 0.1, CZ], fov: 48 }, { pos: [-3.0, AY + 1.5, CZ + 2.6], look: [0.5, AY + 0.8, CZ], fov: 46 }, 2.4, sm);
    ar.pose('lookUp', 1.4);
    yield* F.wait(2.6);
    if (S) S.boost = 0.4;
    g.fadeTarget = 0;
    yield* F.wait(0.9);
    if (S) {
      S.cordFor = null;
      S.boost = 0;
    }
    this.dropGhosts();
  }

  // 9. La campana toca sola: la torre; la calle, que se vuelve hacia ella;
  // el campo, donde los de fuera dejan las armas y vienen
  *s_campana() {
    const g = this.g,
      F = this.F,
      a = g.audio;
    // a) la campana
    this.look('city', { ...MEM, sat: 0.42, density: 0.045 });
    const B = this.bell();
    g.setGroupVisible('campanaSe', false);
    B.g.visible = true;
    B.a = 0;
    B.v = 0;
    g.fadeTarget = 1;
    // (de frente al vano del sur, a la altura del campanario; una luz fría
    // para que se vea el bronce)
    this.light(9, 19.4, -57.2, 0xaebcff, 2.2, 5);
    F.also(F.move({ pos: [9.4, 18.4, -45.5], look: [9, 19.2, -60], fov: 36 }, { pos: [9.2, 18.9, -49.0], look: [9, 19.3, -60], fov: 34 }, 6.6, sm));
    F.also(
      (function* (self) {
        yield* F.wait(1.4);
        self.say('Entonces la campana de la Sé tocó sola.', 4.4);
      })(this)
    );
    yield* F.wait(1.6);
    for (let k = 0; k < 2; k++) {
      B.v = 1.05;
      yield* F.wait(0.55);
      a && a.play('bellToll', { x: 9, y: 19, z: -60 }, { k: 1.4 });
      g.camRig.shake(0.35);
      g.flash = Math.max(g.flash, 0.15);
      yield* F.wait(1.6);
    }
    g.fadeTarget = 0;
    yield* F.wait(0.6);
    this.light(0, 0, 0, 0, 0, 0);
    // b) la calle: la gente se para, se vuelve hacia la Sé y se arrodilla
    this.look('city', { ...MEM, sat: 0.4, density: 0.04 });
    const folk = [];
    const spots = [
      [-1.8, -23.6, 'man'],
      [1.3, -22.4, 'woman'],
      [-0.5, -20.2, 'man'],
      [2.1, -18.4, 'woman'],
      [-2.2, -17.0, 'man'],
      [0.6, -15.2, 'man'],
    ];
    for (const [x, z, k] of spots) folk.push(this.ghost(k).at(x, 0, z, Math.random() * 6).pose('stand', 0).show(0.9));
    g.fadeTarget = 1;
    // (calle arriba, de cara a ellos: se vuelven hacia aquí, hacia la Sé)
    F.also(F.move({ pos: [0.3, 1.7, -27.8], look: [0, 1.4, -12], fov: 50 }, { pos: [0.2, 2.3, -26.8], look: [0, 1.0, -14], fov: 48 }, 7.4, sm));
    F.also(
      (function* (self) {
        yield* F.wait(0.8);
        self.say('Los que la oyeron se volvieron hacia ella.', 4.2);
      })(this)
    );
    a && a.play('bellToll', { x: 9, y: 19, z: -60 }, { k: 0.9 });
    yield* F.wait(0.8);
    for (const G of folk) {
      G.face(0, -60);
      G.pose('lookUp', 0.9);
      yield* F.wait(0.25);
    }
    yield* F.wait(1.0);
    for (const G of folk) {
      G.pose('kneel', 1.1);
      yield* F.wait(0.3);
    }
    yield* F.wait(1.6);
    g.fadeTarget = 0;
    yield* this.fadeGhosts(0.6);
    // c) el campo: los de fuera bajan las armas, se vuelven hacia la ciudad
    // y van hacia la puerta, como sonámbulos
    this.look('ramparts', { ...MEM, sat: 0.42, density: 0.016 });
    const host = this.host(0.6);
    g.fadeTarget = 1;
    F.shot([104, 3.0, -15], [80, 5.5, -50], { fov: 48 });
    F.also(
      (function* (self) {
        yield* F.wait(0.9);
        self.say('Los de fuera abrieron nuestras puertas, como si alguien los llamara.', 5);
      })(this)
    );
    a && a.play('bellToll', { x: 9, y: 19, z: -60 }, { k: 0.6 });
    yield* F.wait(1.2);
    for (const G of host) {
      G.pose('limp', 0.8 + Math.random() * 0.6);
      G.face(79, -62);
    }
    yield* F.wait(1.0);
    for (const G of host) {
      const p = G.root.position;
      const d = Math.hypot(79 - p.x, -62 - p.z);
      G.walkTo(p.x + ((79 - p.x) / d) * 6, p.z + ((-62 - p.z) / d) * 6, 0.7 + Math.random() * 0.3);
    }
    yield* F.wait(3.8);
    g.fadeTarget = 0;
    yield* this.fadeGhosts(0.8);
    B.g.visible = false;
    g.setGroupVisible('campanaSe', true);
  }

  // 10. El sello: dos canónigos le arrancan la Garra a la puerta, que se
  // cierra con él dentro; y sigue cantando
  *s_sello() {
    const g = this.g,
      F = this.F,
      a = g.audio,
      C = g.crypt;
    this.look('sanctum', { ...MEM, sat: 0.5, density: 0.026 });
    const VL = g.bosses.guardianL,
      VR = g.bosses.guardianR;
    this.showEnemy(VL);
    this.showEnemy(VR);
    // la puerta, abierta y encendida, como la dejó
    if (C) {
      C.claw.visible = true;
      C.claw.position.copy(C.clawAt(0));
      C.claw.rotation.x = -Math.PI / 2;
      for (const c of C.circles) for (const f of c.fills) f.scale.setScalar(1);
      C.setInscription(1);
      for (const lf of C.leaves) lf.rotation.y = lf.userData.s * 1.45;
      C.doorLight.intensity = 7;
      C.doorLight.on = true;
    }
    // (entran por delante del incensario grande, que cuelga en medio)
    const p1 = this.ghost('canon').at(-21.4, AY, DOOR.z - 1.6, Math.PI / 2).pose('stand', 0).show(0.8);
    const p2 = this.ghost('canon').at(-21.6, AY, DOOR.z + 1.6, Math.PI / 2).pose('stand', 0).show(0.8);
    p1.walkTo(DOOR.x - 1.2, DOOR.z - 0.75, 1.6, AY);
    p2.walkTo(DOOR.x - 1.5, DOOR.z - 0.2, 1.5, AY);
    g.fadeTarget = 1;
    F.shot([DOOR.x - 3.6, AY + 1.7, DOOR.z + 3.6], [DOOR.x, AY + 2.3, DOOR.z - 0.6], { fov: 52 });
    F.also(
      (function* (self) {
        yield* F.wait(1.0);
        self.say('Dos canónigos le arrancaron la llave a la puerta y la cerraron con él dentro.', 5.4);
      })(this)
    );
    yield* F.until(() => p1.done && p2.done, 6);
    p1.face(DOOR.x, DOOR.z - 0.6);
    p2.face(DOOR.x, DOOR.z - 0.6);
    p1.pose('raise', 0.5);
    p2.pose('raise', 0.5);
    yield* F.wait(0.8);
    p1.pose('pull', 0.4);
    p2.pose('pull', 0.4);
    // la Garra quema: el destello, y fuera
    if (C) {
      let t = 0;
      a && a.play('burn', { x: DOOR.x, y: AY + 2.5, z: DOOR.z }, { k: 1.2 });
      while (t < 0.9) {
        const dt = yield;
        t += dt;
        C.claw.position.copy(C.clawAt(-0.5 * sm(t / 0.9)));
        p1.color([1, 0.7, 0.4]);
        p2.color([1, 0.7, 0.4]);
      }
      g.flash = Math.max(g.flash, 0.6);
      C.claw.visible = false;
      // la puerta se cierra de golpe
      t = 0;
      while (t < 1.2) {
        const dt = yield;
        t += dt;
        const k = 1 - Math.min(1, (t / 1.2) ** 2);
        for (const lf of C.leaves) lf.rotation.y = lf.userData.s * 1.45 * k;
        for (const c of C.circles) for (const f of c.fills) f.scale.setScalar(Math.max(0.001, k));
        C.setInscription(k);
        C.lineColor(k, 1);
        C.doorGlow.material.opacity = k * 0.3;
        C.doorLight.intensity = 7 * k;
      }
      a && a.play('slam', { x: DOOR.x, y: AY + 2, z: DOOR.z }, { k: 1.4 });
      g.camRig.shake(0.7);
      C.doorLight.on = false;
    }
    p1.color([0.7, 0.63, 0.52]);
    p2.color([0.7, 0.63, 0.52]);
    p1.pose('limp', 1.0);
    p2.pose('limp', 1.0);
    this.say('Desde entonces, canta.', 4);
    a && a.play('whisperClose', { x: DOOR.x + 2, y: AY + 2, z: DOOR.z });
    yield* F.wait(3.6);
    g.fadeTarget = 0;
    yield* this.fadeGhosts(0.9);
    this.showEnemy(VL, false);
    this.showEnemy(VR, false);
    if (C) C.applyFlags();
  }

  // 11. El preso: en la celda del fondo, escribe con los dedos lo mismo una
  // y otra vez, hasta que se cae
  *s_preso() {
    const g = this.g,
      F = this.F,
      a = g.audio,
      p = g.player;
    this.look('prison', {});
    g.atmo.override = null;
    a && a.stopMusic();
    p.obj.visible = true;
    p.anim.stop(0.01);
    const at = new V3(CELL.x + 0.2, YD, CELL.wall + 0.66);
    p.obj.position.copy(at);
    p.obj.rotation.set(0, Math.PI, 0);
    p.obj.updateMatrixWorld(true);
    const R = p.rig;
    const W = {
      root: [0, -0.41, 0],
      legL: [-4, 0, 5],
      shinL: [92, 0, 0],
      legR: [-4, 0, -5],
      shinR: [92, 0, 0],
      chest: [-2, 0, 0],
      head: [-6, 0, 0],
      armR: [-118, 0, -12],
      foreR: [-22, 0, 0],
      armL: [-34, 0, 14],
      foreL: [-44, 0, 0],
    };
    const lying = sampleClip(p.clips.wake, 0, {});
    const toR = (P) => {
      const o = {};
      for (const j in P) o[j] = j === 'root' ? P[j] : P[j].map((v) => v * DEG);
      return o;
    };
    const Wr = toR(W);
    const pose = (k, t) => {
      // escribe: el brazo va y viene contra la pared, a trazos
      const s = Math.sin(t * 2.7),
        c = Math.sin(t * 1.3);
      const w = { ...Wr, armR: [Wr.armR[0] + s * 0.16, 0, Wr.armR[2] + c * 0.18], foreR: [Wr.foreR[0] + Math.max(0, -s) * 0.3, 0, 0], head: [Wr.head[0], c * 0.2, 0] };
      if (k <= 0) return w;
      const o = {};
      for (const j of new Set([...Object.keys(w), ...Object.keys(lying)])) {
        const A = w[j] || [0, 0, 0],
          B = lying[j] || [0, 0, 0];
        o[j] = A.map((v, i) => v + (B[i] - v) * k);
      }
      return o;
    };
    g.fadeTarget = 1;
    F.also(
      (function* (self) {
        yield* F.wait(1.4);
        self.say('En la celda del fondo, bajo el castillo, un preso no se arrodilló.', 5);
        yield* F.wait(5.8);
        self.say('Le costó las uñas y la memoria.', 4);
      })(this)
    );
    let t = 0;
    let wh = 0;
    // por encima de su hombro, contra la pared escrita
    F.shot([CELL.x - 1.0, YD + 1.65, CELL.wall + 2.6], [CELL.x + 0.1, YD + 1.25, CELL.wall], { fov: 50 });
    while (t < 9.5) {
      const dt = yield;
      t += dt;
      R.apply(pose(0, t), Wr.root);
      wh -= dt;
      if (wh <= 0) {
        wh = 0.9 + Math.random() * 0.9;
        a && a.play(Math.random() < 0.5 ? 'whisperNear' : 'whisperClose', { x: CELL.x + (Math.random() - 0.5) * 3, y: YD + 1.6, z: CELL.wall + 1.4 });
      }
      if (t > 4.2 && !this._toll) {
        this._toll = true;
        a && a.play('bellToll', { x: 9, y: 19, z: -60 }, { k: 0.5 });
      }
      if (t < 4.5) F.cam.pos.x = CELL.x - 1.0 + t * 0.06;
    }
    this._toll = false;
    // se cae hacia atrás, donde despertará
    const from = at.clone(),
      to = new V3(CELL.x, YD, CELL.z);
    t = 0;
    a && a.play('bodyFall', p.pos);
    while (t < 1.6) {
      const dt = yield;
      t += dt;
      const k = smoother(t / 1.6);
      p.obj.position.lerpVectors(from, to, k);
      p.obj.rotation.y = Math.PI + k * Math.PI;
      const P = pose(k, 9.5 + t);
      R.apply(P, P.root);
      F.cam.look.lerp(new V3(CELL.x, YD + 0.4, CELL.z), dt * 2.5);
    }
    yield* F.wait(1.2);
    g.fadeTarget = 0;
    yield* F.wait(1.0);
    p.obj.visible = false;
  }

  // 12. La mirada: desde la reja, el ídolo; late una vez. Algo se fija en él
  *s_mirada() {
    const g = this.g,
      F = this.F,
      a = g.audio,
      S = g.spring;
    this.look('arena', { sat: 0.7, density: 0.04, snap: true });
    F.shot([0.35, AY + 0.9, CZ - 0.05], [0.0, AY - 0.9, CZ + 0.6], { fov: 40 });
    g.fadeTarget = 1;
    this.say('Algo, desde abajo, se fijó en él.', 4.2);
    yield* F.wait(1.4);
    if (S) S.boost = 1;
    a && a.play('coreBeat', { x: 0, y: AY - 1, z: CZ }, { k: 1 });
    g.camRig.shake(0.25);
    yield* F.wait(0.35);
    if (S) S.boost = 0.2;
    yield* F.wait(2.0);
    g.fadeTarget = 0;
    yield* F.wait(1.0);
    if (S) S.boost = 0;
  }

  // 13. El título y el rótulo de siempre; y a despertar
  *s_titulo(skipped = false) {
    const g = this.g,
      F = this.F,
      a = g.audio;
    g.atmo.override = null;
    g.fadeTarget = 0;
    this.unsay();
    // (la cámara, ya en la celda: de ahí sale el despertar)
    F.shot([CELL.x - 1.0, YD + 2.0, CELL.z - 1.45], [CELL.x + 0.2, YD + 0.4, CELL.z + 0.6], { fov: 55 });
    this.titleEl.innerHTML = g.ui.inkTitleHtml();
    yield* F.wait(skipped ? 0.2 : 0.8);
    this.titleEl.classList.add('show');
    a && a.play('bellToll', null);
    yield* F.wait(skipped ? 2.2 : 4.0);
    this.titleEl.classList.remove('show');
    yield* F.wait(1.6);
    this.say(MSG.intro[0] + '\n' + MSG.intro[1], 3.8);
    yield* F.wait(4.4);
    this.unsay();
    yield* F.wait(0.4);
  }
}
