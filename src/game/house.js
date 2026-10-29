// El guion de la Casa del Alemán (Callejón del Postigo).
//
//  1. Llegas a la plazuela: la puerta de la casa, reventada; dentro, en la
//     planta baja, las criaturas. Tres aporrean la puerta de la escalera para
//     subir a por Henrique, que se ha atrancado arriba; las otras, por la
//     casa. Él te llama desde la ventana de la sala alta.
//  2. Muertas las de dentro, baja: de verdad, de la ventana a la escalera,
//     escalera abajo, le quita la tranca a la puerta y sale a la sala. Si
//     estás dentro, va a la puerta de la calle, la encaja como puede y le
//     echa la barra de la fragua; si no, te espera junto a ella: «¡Entra,
//     rápido!». Vienen más, por las ventanas.
//  3. La defensa: tres oleadas. Cada criatura llega a una ventana, aporrea
//     la contraventana hasta reventarla, salta dentro y va a por ti o a por
//     él (él se defiende con su falcata, pero no aguanta solo). Si cae
//     Henrique, o caes tú, todo vuelve a empezar desde el último altar.
//  4. Vencidas: abre la puerta, cuenta quién es y te pide que le ayudes a
//     hacer de la casa un sitio seguro: tapiar las cinco ventanas rotas (un
//     tablón cada una; él te da martillo y clavos). Los tablones, por ahí (y
//     uno arriba, en el granero).
//  5. Tapiadas las cinco: te lleva al hogar, donde está clavada la espada de
//     su padre, la de Solingen, y te dice que la saques tú. Luego, la llave
//     del sótano y lo de Leonor.
//  6. Después reza junto al hogar; vencida Leonor, por fin descansa.
//
// Banderas: ale:door (las de dentro, muertas: Henrique ha bajado), ale:def
// (la defensa, ganada), ale:lore (lo ha contado y te ha dado el martillo),
// board:<ventana> (tapiada), ale:espada (la espada, sacada del hogar),
// ale:reward (la llave) y boss:leonor.
import * as THREE from 'three';
import { ALEMAN } from '../world/level_postigo.js';
import { DIALOG, MSG } from './story.js';
import { objMat, cloneMat } from '../gfx/materials.js';
import { moveBody } from '../world/collision.js';
import { TALK_CLIPS, HENRIQUE_CLIPS } from '../entities/henrique.js';
import { buildParts, solingenParts } from '../entities/weapon_models.js';
import { angleDiff, approachAngle, damp, clamp, DEG } from '../core/util.js';

const V3 = THREE.Vector3;
const A = ALEMAN;
const W = A.win;
const ROT = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
// dónde está Henrique en cada momento
const POST = { x: 50, z: -101.4 }; // en la sala, entre la puerta y la mesa
const DOOR_IN = { x: 50, z: -98.7 };
const WINDOW_AT = { x: 50, y: A.upWin.floor, z: A.house.z1 - 0.5 };
// (de rodillas ante el hogar; se llega por el pasillo del este de la mesa)
const PRAY = { x: 50.2, z: -107.75 };
const TO_PRAY = [
  [51.95, -102.8],
  [51.95, -107.3],
  [PRAY.x, PRAY.z],
];
// junto al hogar, mientras sacas tú la espada de su padre
const BY_HEARTH = { x: 51.6, z: -107.35 };
// lo que anda al bajar: de la ventana de la sala alta a la cuchillería, al
// rellano, escalera abajo hasta el rellanito de su puerta (ahí le quita la
// tranca: AT_DOOR) y a la sala; y, en la sala, a la puerta de la calle
const DOWN = [
  [50.6, -98.4],
  [52.3, -99.0],
  [53.9, -99.0],
  [58.2, -99.9],
  [59.15, -100.7],
  [59.15, -101.9],
  [58.3, -102.0],
  [53.95, -102.0],
  [53.45, -102.0],
  [52.2, -102.0],
  [DOOR_IN.x, DOOR_IN.z],
];
const AT_DOOR = 8;

export class HouseQuest {
  constructor(g) {
    this.g = g;
    this.npc = g.enemies.find((e) => e.type === 'henrique') || null;
    this.doorDemons = g.enemies.filter((e) => e.spec.story === 'ale:door');
    this.waveEnemies = g.enemies.filter((e) => e.spec.wave);
    this.door = g.interact.list.find((i) => i.id === 'd_aleman');
    this.stairDoor = g.interact.list.find((i) => i.id === 'd_escalera_ale');
    this.relicIt = g.interact.list.find((i) => i.id === 'r_solingen');
    this.talkIt = g.interact.list.find((i) => i.id === 't_henrique');
    this.boards = g.interact.list.filter((i) => i.kind === 'board');
    this.who = {
      id: 'henrique',
      name: 'Henrique',
      voice: 'npcTalk',
      head: (out) => (this.npc && this.npc.obj.visible ? this.npc.rig.worldPos('head', out, this._hOff) : out.set(WINDOW_AT.x, WINDOW_AT.y + 2.2, WINDOW_AT.z)),
    };
    this._hOff = new V3(0, 0.5, 0);
    this.windows = A.windows.map((w) => this.buildWindow(w));
    this.relic = this.buildRelic();
    this.mode = 'street';
    this.t = 0;
    this.mt = 0;
    this.script = null;
    this.active = [];
    this.wave = 0;
    this.lastBark = -9;
    this.shoutT = 3;
    this.poundT = 0;
    this.seen = false;
    this._v = new V3();
  }

  get F() {
    return this.g.flags;
  }
  boarded(id) {
    return !!this.F['board:' + id];
  }
  boardsLeft() {
    return this.windows.filter((w) => !this.boarded(w.spec.id)).length;
  }

  // ------------------------------------------------------------ ventanas
  // Las contraventanas (dos hojas de tablas con sus herrajes) y los tablones
  // que la tapian, en el marco de la fachada: x a lo largo, z hacia fuera.
  buildWindow(spec) {
    const g = this.g;
    const grp = new THREE.Group();
    grp.position.set(spec.x, W.sill, spec.z);
    grp.rotation.y = ROT[spec.side];
    const hw = W.w / 2,
      h = W.top - W.sill;
    const zn = g.zoneAt({ x: spec.inner[0], y: 1, z: spec.inner[1] });
    const pr = g.probe.sample(spec.inner[0], 1.4, spec.inner[1], zn && zn.room ? g.level.ctx.wb.roomId(zn.room) : 0);
    const mat = (name) => {
      const m = cloneMat(objMat(name));
      if (m._u) {
        m._u.uProbe.value.set(pr[0], pr[1], pr[2]);
        m._u.uGround.value.set(0, 0.34);
      }
      return m;
    };
    const wood = mat('planks'),
      iron = mat('iron'),
      dark = mat('wooddark');
    const leaves = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * hw, 0, -0.07);
      const lw = hw - 0.01;
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(lw, h - 0.02, 0.05), wood);
      leaf.position.set((-s * lw) / 2, h / 2, 0);
      pivot.add(leaf);
      for (const y of [0.22, h - 0.22]) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(lw * 0.9, 0.05, 0.065), iron);
        band.position.set((-s * lw) / 2, y, 0);
        pivot.add(band);
      }
      pivot.userData = { side: s, vy: 0, fall: 0 };
      grp.add(pivot);
      leaves.push(pivot);
    }
    const boards = [];
    for (let k = 0; k < 3; k++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(W.w + 0.42, 0.18, 0.045), k === 1 ? dark : wood);
      b.position.set(0, 0.2 + k * 0.4, -A.house.t - 0.04);
      b.rotation.z = [0.08, -0.06, 0.11][k];
      b.visible = false;
      grp.add(b);
      boards.push(b);
    }
    g.scene.add(grp);
    return { spec, grp, leaves, boards, state: 'intact', shake: 0, bt: 0, nb: 3 };
  }
  setWindow(w, state) {
    w.state = state;
    w.shake = 0;
    const intact = state === 'intact';
    for (const lf of w.leaves) {
      lf.visible = intact || (state !== 'boarded' && lf.userData.side < 0) || (state === 'boarded' && lf.userData.side < 0);
      lf.rotation.set(0, 0, 0);
      lf.position.y = 0;
      if (!intact && lf.userData.side < 0) {
        // la hoja que queda, colgando torcida de un gozne
        lf.rotation.set(0, -1.9, 0.38);
      }
      if (!intact && lf.userData.side > 0) lf.visible = false;
    }
    w.nb = state === 'boarded' ? 3 : 0;
    w.boards.forEach((b, i) => (b.visible = i < w.nb));
  }
  // La contraventana revienta hacia dentro: astillas, la hoja derecha sale
  // despedida y la izquierda se queda colgando.
  breakWindow(w) {
    const g = this.g;
    w.state = 'breaking';
    w.bt = 0;
    const [ix, iz] = w.spec.inner;
    g.fx.blood.emit(ix, W.sill + 0.6, iz, 40, { color: [0.16, 0.1, 0.06], speed: 5, life: 0.9, up: 2, dir: { x: -w.spec.nx, z: -w.spec.nz } });
    g.fx.blood.emit(ix, W.sill + 0.4, iz, 16, { color: [0.12, 0.1, 0.08], speed: 2.2, life: 1, up: 0.8, gravity: 3 });
    g.audio && g.audio.play('shutterBreak', { x: ix, y: 1.4, z: iz });
    const d = Math.hypot(g.player.pos.x - ix, g.player.pos.z - iz);
    if (d < 9) g.camRig.shake(0.25 * (1 - d / 9));
  }
  updateWindows(dt) {
    for (const w of this.windows) {
      if (w.state === 'intact' && w.shake > 0) {
        w.shake = Math.max(0, w.shake - dt * 3);
        for (const lf of w.leaves) lf.rotation.y = lf.userData.side * Math.sin(this.t * 60 + lf.userData.side) * 0.05 * w.shake;
      } else if (w.state === 'breaking') {
        w.bt += dt;
        const u = Math.min(1, w.bt / 0.45);
        const [L, R] = w.leaves;
        // la izquierda se abre de golpe y queda torcida
        L.rotation.set(0, -1.9 * Math.min(1, u * 1.6), 0.38 * u);
        // la derecha vuela hacia dentro dando vueltas y cae al suelo
        R.rotation.set(-u * 2.6, u * 2.2, 0);
        R.position.set(0, -u * u * W.sill * 0.9, -u * 1.6);
        if (u >= 1) {
          R.visible = false;
          w.state = 'broken';
        }
      } else if (w.state === 'boarding') {
        w.bt += dt;
        const n = Math.min(3, 1 + Math.floor(w.bt / 0.32));
        w.boards.forEach((b, i) => {
          b.visible = i < n;
          // (el tablón llega torcido y el martillo lo asienta)
          const k = Math.min(1, Math.max(0, (w.bt - i * 0.32) / 0.12));
          b.position.z = -A.house.t - 0.04 - (1 - k) * 0.12;
        });
        if (w.bt > 1.0) {
          w.state = 'boarded';
          w.nb = 3;
        }
      }
    }
  }

  // ------------------------------------------------------------ la espada
  // La espada de Solingen, clavada de punta en la repisa del hogar (el mismo
  // modelo que se empuña, con la luz de la sala): la hoja de canto, con IN
  // NOMINE DOMINI en la cara que mira a la sala, leído de arriba abajo.
  buildRelic() {
    const g = this.g;
    const M = A.mantel;
    const zn = g.zoneAt({ x: M.x, y: 1.5, z: M.z + 0.5 });
    const pr = g.probe.sample(M.x, 2.0, M.z + 0.4, zn && zn.room ? g.level.ctx.wb.roomId(zn.room) : 0);
    const { group } = buildParts(solingenParts('x'), (name, ds) => {
      const m = cloneMat(objMat(name, ds ? { side: THREE.DoubleSide } : {}));
      if (m._u) {
        m._u.uProbe.value.set(pr[0], pr[1], pr[2]);
        m._u.uGround.value.set(0, 0.34);
      }
      return m;
    });
    const grp = new THREE.Group();
    grp.add(group);
    // (de la mano al mundo: +X de la mano, hacia la sala; +Y, hacia el oeste;
    // la hoja, +Z, hacia abajo. La punta, en (0, -0.05, 1.09) de la mano,
    // diez centímetros dentro de la madera)
    grp.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new V3(0, 0, 1), new V3(-1, 0, 0), new V3(0, -1, 0)));
    grp.position.set(M.x - 0.05, M.y - 0.1 + 1.09, M.z);
    grp.userData.y0 = grp.position.y;
    g.scene.add(grp);
    return grp;
  }
  relicGone() {
    return !!(this.F['ale:espada'] || this.F['ale:reward']);
  }
  relicLabel() {
    return this.relicReady ? 'Sacar la espada' : 'Examinar la espada';
  }
  // Examinarla; o, cuando él te la da, sacarla.
  useRelic() {
    const g = this.g;
    if (this.relicReady) {
      this.pullSword();
      return;
    }
    g.ui.toast(MSG.reliquia, 5);
    const e = this.npc;
    if (e && (this.mode === 'lore' || this.mode === 'boards') && Math.hypot(g.player.pos.x - e.pos.x, g.player.pos.z - e.pos.z) < 9) this.bark(pick(DIALOG.henriqueNoToques), 3);
  }
  pullSword() {
    const g = this.g;
    if (this.pull || this.relicGone()) return;
    const p = g.player;
    const M = A.mantel;
    this.relicReady = false;
    p.playInteract('interact', Math.atan2(M.x - p.pos.x, M.z - p.pos.z), 1.3);
    g.audio && g.audio.play('scrape', { x: M.x, y: M.y + 0.6, z: M.z });
    this.pull = { t: 0 };
  }
  updateRelic(dt) {
    const r = this.relic;
    if (this.pull) {
      // sale de la madera, despacio al principio
      this.pull.t += dt;
      const u = Math.min(1, this.pull.t / 0.85);
      r.position.y = r.userData.y0 + u * u * 0.34;
      if (u >= 1) {
        this.pull = null;
        r.visible = false;
        r.position.y = r.userData.y0;
        this.F['ale:espada'] = true;
        const g = this.g;
        g.audio && g.audio.play('relicReveal');
        g.giveItem('solingen');
        g.saveGame();
      }
    } else r.visible = !this.relicGone();
    const it = this.relicIt;
    if (it) it.hidden = !r.visible || !!this.pull;
  }

  // ------------------------------------------------------------ estado
  // Desde las banderas (partida nueva, cargada, tras morir).
  applyFlags() {
    const F = this.F;
    this.script = null;
    this.active = [];
    this.g.speech && this.g.speech.hush(this.who);
    const def = !!F['ale:def'];
    for (const w of this.windows) this.setWindow(w, def ? (this.boarded(w.spec.id) ? 'boarded' : 'broken') : 'intact');
    for (const e of this.waveEnemies) e.foe = null;
    this.relicReady = false;
    this.pull = null;
    this.goTo = null;
    this.openT = 0;
    if (!F['ale:door']) this.mode = 'street';
    else if (!def) this.mode = 'waiting';
    else if (!F['ale:lore']) this.mode = 'lore';
    else if (this.boardsLeft() > 0) this.mode = 'boards';
    else if (!F['ale:reward']) this.mode = 'reward';
    else this.mode = 'after';
    this.mt = 0;
    this.seen = false;
    this.loreStarted = false;
    this.route = null;
    this.ri = 0;
    this.waitT = 0;
    // la puerta de la calle: reventada (abierta) hasta la defensa, en la que
    // la cierra él, y abierta desde que la gana; la de la escalera, atrancada
    // hasta que baja
    const d = this.door;
    if (d) {
      if (!d.done) this.g.interact.setOpen(d, true);
      F['door:d_aleman'] = true;
    }
    const sd = this.stairDoor;
    if (sd && F['ale:door']) {
      if (!sd.done) this.g.interact.setOpen(sd, true);
      F['door:d_escalera_ale'] = true;
    } else if (sd && sd.done) this.g.interact.slamShut(sd);
    if (this.relic) {
      this.relic.visible = !this.relicGone();
      this.relic.position.y = this.relic.userData.y0;
    }
    if (this.npc) this.npcReset(this.npc);
  }
  // Tras morir (tú o él): la defensa, desde el principio.
  onRespawn() {
    if (this.mode === 'shut' || this.mode === 'waves' || this.mode === 'failed') {
      this.mode = 'waiting';
      delete this.F['ale:def'];
    }
    this.applyFlags();
  }

  // ------------------------------------------------------------ Henrique
  npcReset(e) {
    e.foe = null;
    e.data.guard = false;
    e.hp = e.maxHp;
    const m = this.mode;
    if (m === 'street') this.place(e, WINDOW_AT.x, WINDOW_AT.y, WINDOW_AT.z, 0, 'window');
    else if (m === 'waiting') this.place(e, DOOR_IN.x, 0, DOOR_IN.z, 0, 'stand');
    else if (m === 'after') this.place(e, PRAY.x, 0, PRAY.z, Math.PI, this.F['boss:leonor'] ? 'grief' : 'pray');
    else this.place(e, POST.x, 0, POST.z, 0, 'stand');
  }
  place(e, x, y, z, yaw, idle) {
    e.scripted = false;
    e.body.pos.set(x, y, z);
    e.body.vy = 0;
    e.vx = e.vz = 0;
    e.yaw = yaw;
    e.state = 'dormant';
    e.idle = idle;
    e.obj.visible = true;
    e.shadow.visible = y < 1;
    e.dead = false;
  }
  // Ha caído: si es en la defensa, la defensa se pierde. Fuera de ella no se
  // le puede matar (no le llega nada).
  npcDown(e) {
    if (this.mode !== 'waves' && this.mode !== 'shut') {
      e.hp = e.maxHp;
      return true;
    }
    const g = this.g;
    e.hp = 1;
    e.state = 'down';
    e.stT = 0;
    e.vx = e.vz = 0;
    e.anim.play(HENRIQUE_CLIPS.death, { blend: 0.06 });
    g.audio && g.audio.enemyVoice(e, 'death');
    this.mode = 'failed';
    this.mt = 0;
    g.speech && g.speech.hush(this.who);
    g.slowmo = { t: 1.2, k: 0.35 };
    g.hitstop = Math.max(g.hitstop, 0.2);
    g.lockTarget = null;
    for (const a of this.active) a.e.foe = null;
    g.henriqueFell();
    return true;
  }

  // Lo que hace en cada momento (lo llama su tipo: entities/henrique.js).
  npcAI(e, dt, player) {
    const g = this.g;
    e.stT += dt;
    e.cooldown -= dt;
    e.flash -= dt;
    e.poiseT -= dt;
    if (e.poiseT <= 0) e.poise = e.T.poise;
    const m = this.mode;
    let speed = 0;
    let move = true;
    let tx = null,
      tz = null;
    const look = (x, z, k = 6) => (e.yaw = approachAngle(e.yaw, Math.atan2(x - e.pos.x, z - e.pos.z), k * dt));
    const hurt = e.state === 'hurt' || e.state === 'stagger';
    if (hurt) {
      e.vx = damp(e.vx, 0, 5, dt);
      e.vz = damp(e.vz, 0, 5, dt);
      const dur = e.state === 'hurt' ? e.T.clips.hurt.dur : e.T.clips.stagger.dur;
      if (e.stT >= dur) {
        e.state = 'dormant';
        e.idle = 'guard';
        e.anim.stop(0.15);
        if (Math.random() < 0.5) this.bark(pick(DIALOG.henriqueHurt), 1.6);
      }
    } else if (m === 'street') {
      // asomado a la ventana de la sala alta: quieto, medio cuerpo fuera
      move = false;
      e.body.pos.set(WINDOW_AT.x, WINDOW_AT.y, WINDOW_AT.z);
      e.yaw = 0;
      e.state = 'dormant';
      e.idle = 'window';
    } else if (m === 'coming') {
      // baja: corre por la planta alta hasta la escalera, escalera abajo; al
      // pie le quita la tranca a la puerta (se para un momento) y sale a la
      // sala, hacia la puerta de la calle
      e.data.guard = false;
      const r = DOWN[this.ri];
      if (this.waitT > 0) this.waitT -= dt;
      else if (r) {
        const dp = Math.hypot(r[0] - e.pos.x, r[1] - e.pos.z);
        if (dp < (this.ri === DOWN.length - 1 ? 0.35 : 0.5)) {
          if (this.ri === AT_DOOR) this.openStair();
          this.ri++;
        } else {
          tx = r[0];
          tz = r[1];
          speed = this.ri >= AT_DOOR + 1 ? e.T.walk * 1.3 : e.T.run;
        }
      }
      e.state = speed > 0 ? 'chase' : 'dormant';
      e.idle = 'stand';
    } else if (m === 'failed' || e.state === 'down') {
      move = false;
      e.vx = e.vz = 0;
    } else if (m === 'waves' || m === 'shut') {
      e.data.guard = true;
      // a por la criatura más cercana que haya dentro (sin alejarse mucho
      // de la sala) y, si la tiene encima, la falcata
      let best = null,
        bd = 9;
      for (const a of this.active) {
        const o = a.e;
        if (o.dead || a.phase !== 'fight') continue;
        const d = Math.hypot(o.pos.x - e.pos.x, o.pos.z - e.pos.z);
        if (d < bd) {
          bd = d;
          best = o;
        }
      }
      if (e.state === 'attack' && e.atk) {
        e.vx = damp(e.vx, 0, 8, dt);
        e.vz = damp(e.vz, 0, 8, dt);
        const atk = e.atk;
        if (best) look(best.pos.x, best.pos.z, 4);
        if (!e.atkHit && e.stT >= atk.hit) {
          e.atkHit = true;
          this.npcStrike(e, atk);
        }
        if (e.stT >= atk.dur) {
          e.state = 'dormant';
          e.idle = 'guard';
          e.atk = null;
          e.cooldown = 0.9 + Math.random() * 0.9;
        }
      } else if (best && bd < 2.3 && e.cooldown <= 0) {
        const c = Math.random() < 0.6 ? HENRIQUE_CLIPS.swing : HENRIQUE_CLIPS.backhand;
        e.state = 'attack';
        e.stT = 0;
        e.atkHit = false;
        e.atk = { clip: c, dur: c.dur, hit: c === HENRIQUE_CLIPS.swing ? 0.56 : 0.5 };
        e.anim.play(c, { blend: 0.08 });
        g.audio && g.audio.enemyVoice(e, 'attack');
        if (Math.random() < 0.3) this.bark(pick(DIALOG.henriqueHit), 1.4);
      } else if (best && bd < 6 && Math.hypot(best.pos.x - POST.x, best.pos.z - POST.z) < 6.5) {
        tx = best.pos.x;
        tz = best.pos.z;
        speed = bd > 1.6 ? e.T.walk : 0;
        look(best.pos.x, best.pos.z);
      } else {
        const dp = Math.hypot(POST.x - e.pos.x, POST.z - e.pos.z);
        if (dp > 0.5) {
          tx = POST.x;
          tz = POST.z;
          speed = e.T.walk;
        }
        const f = best || player;
        look(f.pos.x, f.pos.z, 3);
      }
      if (e.state !== 'attack') e.state = speed > 0 ? 'chase' : 'dormant';
      e.idle = 'guard';
    } else {
      // tranquilo: en su sitio, mirándote si estás cerca (o a donde le
      // lleve el guion: junto al hogar, para la espada)
      e.data.guard = false;
      const home = this.goTo || (m === 'waiting' ? DOOR_IN : m === 'after' ? PRAY : POST);
      // (a rezar, rodeando la mesa)
      const r = this.route;
      if (r && r.length && m === 'after') {
        if (Math.hypot(r[0][0] - e.pos.x, r[0][1] - e.pos.z) < 0.4) r.shift();
      }
      const wp = r && r.length && m === 'after' ? { x: r[0][0], z: r[0][1] } : home;
      const dp = Math.hypot(wp.x - e.pos.x, wp.z - e.pos.z);
      if (dp > 0.45 || wp !== home) {
        tx = wp.x;
        tz = wp.z;
        speed = e.T.walk * 0.8;
      }
      const dPl = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
      const talking = g.speech && g.speech.busy(this.who);
      // (rezando, de cara al fuego; si le hablas, se vuelve)
      if (m === 'after' && !talking && speed === 0) e.yaw = approachAngle(e.yaw, Math.PI, 2 * dt);
      else if ((dPl < 7 && Math.abs(player.pos.y - e.pos.y) < 2) || talking) look(player.pos.x, player.pos.z, talking ? 5 : 2.5);
      e.state = speed > 0 ? 'chase' : 'dormant';
      e.idle = m === 'after' ? (this.F['boss:leonor'] ? 'grief' : talking ? 'stand' : 'pray') : 'stand';
    }
    if (tx !== null && speed > 0) e.steerTo(tx, tz, speed, dt);
    else if (!hurt && e.state !== 'attack') {
      e.vx = damp(e.vx, 0, 8, dt);
      e.vz = damp(e.vz, 0, 8, dt);
    }
    if (move) {
      moveBody(g.world.col, e.body, e.vx * dt, e.vz * dt, dt);
      // que no le atraviese el jugador
      const p = g.player;
      const dx = e.pos.x - p.pos.x,
        dz = e.pos.z - p.pos.z;
      const dd = Math.hypot(dx, dz);
      const min = e.body.radius + p.body.radius;
      if (dd < min && dd > 0.001 && Math.abs(e.pos.y - p.pos.y) < 1.5) {
        const push = (min - dd) * 0.5;
        e.pos.x += (dx / dd) * push;
        e.pos.z += (dz / dd) * push;
        p.pos.x -= (dx / dd) * push;
        p.pos.z -= (dz / dd) * push;
      }
    }
    e.animate(dt);
  }
  // El tajo de la falcata: a la criatura que tenga delante.
  npcStrike(e) {
    const g = this.g;
    for (const a of this.active) {
      const o = a.e;
      if (o.dead || a.phase !== 'fight') continue;
      const dx = o.pos.x - e.pos.x,
        dz = o.pos.z - e.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.4 + o.body.radius) continue;
      if (Math.abs(angleDiff(e.yaw, Math.atan2(dx, dz))) > 70 * DEG) continue;
      const r = o.takeHit(13, 26, e.pos.x, e.pos.z, false, 0);
      if (r === 'none') continue;
      const hy = o.pos.y + Math.min(1.3, o.T.height * 0.55);
      g.fx.blood.emit(o.pos.x - dx * 0.2, hy, o.pos.z - dz * 0.2, 18, { dir: { x: dx / (d || 1), z: dz / (d || 1) }, speed: 4 });
      g.audio && g.audio.play(r === 'blocked' ? 'clang' : 'hit', o.pos);
      if (r === 'kill') g.audio && g.audio.enemyVoice(o, 'death');
      else if (r !== 'blocked') g.audio && g.audio.enemyVoice(o, 'hurt');
      // le ha dado: a veces se vuelve contra él
      if (r === 'hit' && !o.foe && Math.random() < 0.35) o.foe = e;
      break;
    }
  }

  // ------------------------------------------------------------ hablar
  bark(text, dur) {
    const s = this.g.speech;
    if (!s || this.g.time - this.lastBark < 2.5) return;
    if (s.busy(this.who) && this.script) return;
    this.lastBark = this.g.time;
    s.say(this.who, text, { dur });
  }
  // Un guion de pasos: { say: [...] }, { give: 'objeto' }, { clip }, { wait: s },
  // { walk: [x, z] } (va hasta ahí), { until: () => bool } (espera) y { fn }.
  run(steps) {
    this.script = { steps: steps.slice(), cur: null, t: 0 };
  }
  updateScript(dt) {
    const S = this.script;
    const g = this.g;
    if (!S) return;
    if (g.ui.modal) return;
    S.t += dt;
    if (S.cur) {
      const c = S.cur;
      if (c.say && g.speech.busy(this.who)) return;
      if (c.wait !== undefined && S.t < c.wait) return;
      if (c.walk && this.npc && Math.hypot(c.walk[0] - this.npc.pos.x, c.walk[1] - this.npc.pos.z) > 0.5) return;
      if (c.until && !c.until()) return;
      S.cur = null;
    }
    const st = S.steps.shift();
    if (!st) {
      this.script = null;
      return;
    }
    S.cur = st;
    S.t = 0;
    if (st.say) {
      g.speech.queue(this.who, st.say);
      if (this.npc && this.npc.state !== 'attack') this.npc.anim.play(st.clip || pick(TALK_CLIPS), { blend: 0.25 });
    }
    if (st.give) {
      if (this.npc) this.npc.anim.play(HENRIQUE_CLIPS.give, { blend: 0.2 });
      g.giveItem(st.give);
    }
    this.goTo = st.walk ? { x: st.walk[0], z: st.walk[1] } : this.goTo;
    if (st.fn) st.fn();
  }
  // Hablar con él (el interactuable que le sigue).
  talk() {
    const g = this.g;
    if (this.script) {
      g.speech.skip(this.who);
      return;
    }
    const m = this.mode;
    if (m === 'lore') this.startLore();
    else if (m === 'boards') this.run([{ say: DIALOG.henriqueBoards(this.boardsLeft()) }]);
    else if (m === 'reward') this.startReward();
    else if (m === 'after') this.run([{ say: this.F['boss:leonor'] ? DIALOG.henriqueGrief : DIALOG.henriqueAfter, clip: TALK_CLIPS[2] }]);
    else if (m === 'waiting') this.run([{ say: DIALOG.henriqueDoor }]);
  }
  canTalk() {
    const m = this.mode;
    return this.npc && (m === 'lore' || m === 'boards' || m === 'reward' || m === 'after' || (m === 'waiting' && !this.script));
  }
  startLore() {
    if (this.loreStarted) return;
    this.loreStarted = true;
    this.run([
      { say: DIALOG.henriqueLore.slice(0, 4), clip: TALK_CLIPS[0] },
      { say: DIALOG.henriqueLore.slice(4, 6), clip: TALK_CLIPS[1] },
      { say: DIALOG.henriqueLore.slice(6), clip: TALK_CLIPS[3] },
      { give: 'martillo' },
      {
        fn: () => {
          this.F['ale:lore'] = true;
          this.mode = this.boardsLeft() > 0 ? 'boards' : 'reward';
          this.g.saveGame();
        },
      },
    ]);
  }
  // Tapiadas las ventanas: al hogar, a por la espada (la sacas tú), y luego
  // lo de Leonor y la llave. (Sacada ya la espada, sólo lo segundo.)
  startReward() {
    if (this.script) return;
    const steps = [];
    if (!this.relicGone())
      steps.push(
        { say: DIALOG.henriqueReward1, clip: TALK_CLIPS[1] },
        { walk: [BY_HEARTH.x, BY_HEARTH.z] },
        { say: DIALOG.henriqueReliquia, clip: TALK_CLIPS[3] },
        { fn: () => (this.relicReady = true) },
        { until: () => !!this.F['ale:espada'] && !this.g.ui.modal },
        { wait: 1.0 }
      );
    steps.push(
      { say: DIALOG.henriqueReward2, clip: TALK_CLIPS[2] },
      { say: DIALOG.henriqueReward3, clip: TALK_CLIPS[0] },
      { give: 'llave_sotano' },
      {
        fn: () => {
          this.F['ale:reward'] = true;
          this.mode = 'after';
          this.goTo = null;
          const e = this.npc;
          this.route = e && Math.hypot(e.pos.x - PRAY.x, e.pos.z - PRAY.z) < 3 ? [[PRAY.x, PRAY.z]] : TO_PRAY.map((p) => p.slice());
          this.g.saveGame();
        },
      }
    );
    this.run(steps);
  }

  // Llamar a una puerta: la de la escalera (atrancada desde arriba) o la de
  // la calle (cerrada en la defensa).
  knock(it) {
    const g = this.g;
    g.audio && g.audio.play('doorPound', { x: it.x, y: 1.2, z: it.z });
    const m = this.mode;
    if (it === this.stairDoor) {
      g.ui.toast(MSG.escaleraAleman, 4);
      if (this.npc && !g.speech.busy(this.who)) g.speech.say(this.who, this.doorDemons.some((d) => !d.dead) ? '¡No abro! ¡No mientras esas bestias sigan ahí abajo!' : '¡Ya bajo, ya bajo!', { dur: 3 });
      return;
    }
    if (m === 'shut' || m === 'waves') {
      this.bark('¡No abras! ¡Que no entren por la puerta también!', 2.6);
      return;
    }
    g.ui.toast(MSG.doorAleman, 4);
  }

  // ------------------------------------------------------------ tapiar
  // ¿Se puede tapiar esta ventana ya? (rota y con la defensa ganada)
  boardable(it) {
    return !!this.F['ale:lore'] && !this.boarded(it.win);
  }
  board(it) {
    const g = this.g;
    const inv = g.inventory;
    if (!inv.has('martillo')) {
      g.ui.toast(MSG.boardNoHammer, 4);
      return;
    }
    if (!inv.has('tablon')) {
      g.ui.toast(MSG.boardNoPlank, 3.5);
      g.audio && g.audio.play('locked', it);
      return;
    }
    const w = this.windows.find((q) => q.spec.id === it.win);
    if (!w) return;
    inv.add('tablon', -1);
    this.F['board:' + it.win] = true;
    it.done = true;
    w.state = 'boarding';
    w.bt = 0;
    g.player.playInteract('interact', Math.atan2(w.spec.x - g.player.pos.x, w.spec.z - g.player.pos.z), 1.1);
    g.audio && g.audio.play('hammer', { x: it.x, y: 1.4, z: it.z }, { n: 3 });
    const left = this.boardsLeft();
    g.ui.toast(MSG.boardDone(left), 4);
    if (left === 0 && this.F['ale:lore'] && !this.F['ale:reward']) {
      this.mode = 'reward';
      g.later(1800, () => this.bark('¡Ya está! ¡La última! Ven, ven a la sala.', 3.5));
    }
    g.saveGame();
  }

  // ------------------------------------------------------------ la defensa
  // Muertas las de dentro: baja (ver npcAI). Desde ya no vuelven, aunque
  // caigas antes de que llegue abajo.
  toComing() {
    const g = this.g;
    this.mode = 'coming';
    this.mt = 0;
    this.ri = 0;
    this.waitT = 0;
    this.F['ale:door'] = true;
    g.speech.hush(this.who);
    g.speech.say(this.who, DIALOG.henriqueSaved[0], { dur: 2.6 });
    g.saveGame();
  }
  // Al pie de la escalera: la tranca fuera y, un momento después, la puerta
  // abierta (en tiempo de juego: ver update).
  openStair() {
    const g = this.g;
    const d = this.stairDoor;
    this.waitT = 0.9;
    if (!d || d.done) return;
    g.audio && g.audio.play('bar', { x: d.x, y: 1.2, z: d.z });
    this.openT = 0.45;
  }
  // ¿Estás dentro de la casa, lejos de la puerta (y abajo)?
  playerInside() {
    const p = this.g.player;
    const H = A.house;
    return p.pos.x > H.x0 && p.pos.x < H.x1 && p.pos.z < H.z1 - 1.5 && p.pos.z > H.z0 && p.pos.y > -0.5 && p.pos.y < 2 && !p.dead;
  }
  toShut() {
    const g = this.g;
    this.mode = 'shut';
    this.mt = 0;
    const d = this.door;
    if (d && d.done) {
      g.interact.slamShut(d);
      g.audio && g.audio.play('doorSlam', { x: d.x, y: 1.2, z: d.z });
      setTimeout(() => g.audio && g.audio.play('bar', { x: d.x, y: 1.2, z: d.z }), 380);
    }
    // (la primera ya rasca la contraventana mientras termina de avisar)
    this.run([{ wait: 0.8 }, { say: DIALOG.henriqueShut.slice(0, 2), clip: TALK_CLIPS[3] }, { fn: () => this.startWaves() }, { say: DIALOG.henriqueShut.slice(2) }]);
  }
  startWaves() {
    if (this.mode !== 'shut') return;
    this.mode = 'waves';
    this.wave = 0;
    this.nextWave();
  }
  nextWave() {
    const g = this.g;
    this.wave++;
    const list = this.waveEnemies.filter((e) => e.spec.wave === this.wave);
    if (!list.length) {
      this.cleared();
      return;
    }
    this.active = list.map((e, i) => ({ e, win: this.windows.find((w) => w.spec.id === e.spec.win), t: -i * 1.4 - Math.random() * 0.6, phase: 'wait' }));
    this.waveT = 0;
    if (this.wave > 1) this.bark(pick(DIALOG.henriqueWave), 2.4);
    g.audio && g.audio.play('stinger');
  }
  updateWaves(dt) {
    const g = this.g;
    for (const a of this.active) {
      const e = a.e;
      const w = a.win;
      a.t += dt;
      if (a.phase === 'wait') {
        if (a.t < 0) continue;
        // llega a su ventana: fuera, de cara a ella
        e.scripted = true;
        e.dead = false;
        e.reset();
        e.scripted = true;
        e.hp = e.maxHp;
        e.body.pos.set(w.spec.out[0], 0, w.spec.out[1]);
        e.yaw = Math.atan2(-w.spec.nx, -w.spec.nz);
        e.state = 'dormant';
        e.idle = 'pound';
        e.obj.visible = true;
        e.shadow.visible = true;
        a.phase = 'pound';
        a.pt = 0;
        a.need = w.state === 'intact' ? 1.8 + Math.random() * 1.2 : 0.3 + Math.random() * 0.4;
        a.hit = 0.2;
        if (g.time - this.lastBark > 2.5) this.bark(DIALOG.henriqueWin[w.spec.id], 2.2);
      } else if (a.phase === 'pound') {
        a.pt += dt;
        if (w.state === 'intact') {
          a.hit -= dt;
          if (a.hit <= 0) {
            a.hit = 0.45 + Math.random() * 0.35;
            w.shake = 1;
            g.audio && g.audio.play('shutterPound', { x: w.spec.x, y: 1.5, z: w.spec.z });
          }
        }
        e.animate(dt);
        if (a.pt >= a.need) {
          if (w.state === 'intact') this.breakWindow(w);
          a.phase = 'vault';
          a.vt = 0;
          if (e.T.clips.alert) e.anim.play(e.T.clips.alert, { blend: 0.1 });
          g.audio && g.audio.enemyVoice(e, 'alert');
        }
      } else if (a.phase === 'vault') {
        // se tira dentro de cabeza por el hueco, por encima del alféizar: el
        // cuerpo se inclina hacia delante (gira sobre los pies) para pasar
        // bajo el dintel
        a.vt += dt;
        const u = Math.min(1, a.vt / 0.75);
        const [ox, oz] = w.spec.out,
          [ix, iz] = w.spec.in;
        const k = u * u * (3 - 2 * u);
        const s = Math.sin(Math.PI * u);
        const small = e.T.height < 1.2;
        e.body.pos.set(ox + (ix - ox) * k, s * (small ? W.sill + 0.3 : W.sill + 0.2), oz + (iz - oz) * k);
        e.state = 'alert';
        e.animate(dt);
        e.obj.rotation.order = 'YXZ';
        e.obj.rotation.x = Math.pow(s, 1.5) * (small ? 0.25 : 1.25);
        e.shadow.position.y = 0.02;
        if (u >= 1) {
          e.obj.rotation.x = 0;
          e.body.pos.y = 0;
          e.scripted = false;
          e.aware = true;
          e.state = 'chase';
          e.stT = 0;
          e.cooldown = 0.4;
          e.home = { x: ix, y: 0, z: iz, yaw: e.yaw };
          // la mayoría va a por Henrique
          e.foe = Math.random() < 0.6 && this.npc ? this.npc : null;
          a.phase = 'fight';
        }
      } else if (a.phase === 'fight') {
        // (dentro de la casa no se da por vencida ni se vuelve a su sitio)
        if (!e.dead && (e.state === 'return' || e.state === 'dormant')) {
          e.state = 'chase';
          e.aware = true;
          e.lostT = 0;
        }
        // si le tienes encima, a veces se vuelve contra ti
        if (e.foe && !e.dead) {
          const dp = Math.hypot(g.player.pos.x - e.pos.x, g.player.pos.z - e.pos.z);
          if (dp < 1.8 && Math.random() < dt * 0.6) e.foe = null;
        }
      }
    }
    // todas muertas: la siguiente oleada (o se acabó)
    if (this.active.every((a) => a.phase === 'fight' && a.e.dead)) {
      this.waveT += dt;
      if (this.waveT > 2.8) this.nextWave();
    }
    // Henrique se cura un poco entre oleadas
    if (this.npc && this.active.every((a) => a.e.dead || a.phase === 'wait')) this.npc.hp = Math.min(this.npc.maxHp, this.npc.hp + dt * 6);
  }
  cleared() {
    const g = this.g;
    this.mode = 'lore';
    this.active = [];
    this.F['ale:def'] = true;
    // abre la puerta y la deja abierta
    const d = this.door;
    if (d) {
      g.later(2500, () => {
        g.interact.setOpen(d);
        g.audio && g.audio.play('bar', { x: d.x, y: 1.2, z: d.z });
        this.F['door:d_aleman'] = true;
        g.saveGame();
      });
    }
    for (const e of this.waveEnemies) e.foe = null;
    g.audio && g.audio.play('victory');
    g.saveGame();
    g.later(3200, () => {
      if (this.mode === 'lore') this.startLore();
    });
  }

  // ¿Se enseña su vida en la barra de abajo? (en la defensa)
  allyBar() {
    return this.npc && (this.mode === 'waves' || this.mode === 'shut' || this.mode === 'failed') ? this.npc : null;
  }

  // ------------------------------------------------------------ cada fotograma
  update(dt) {
    const g = this.g;
    const e = this.npc;
    if (!e) return;
    // (la película del jefe final: aquí no pasa nada mientras tanto)
    if (g.finale && g.finale.filmActive) return;
    this.t += dt;
    this.mt += dt;
    this.updateWindows(dt);
    this.updateScript(dt);
    if (this.openT > 0) {
      this.openT -= dt;
      const d = this.stairDoor;
      if (this.openT <= 0 && d && !d.done) {
        g.interact.setOpen(d);
        this.F['door:d_escalera_ale'] = true;
        g.audio && g.audio.play('doorOpen', { x: d.x, y: 1.2, z: d.z });
      }
    }
    const p = g.player;
    const m = this.mode;
    if (m === 'street') {
      const alive = this.doorDemons.filter((d) => !d.dead);
      if (!alive.length) this.toComing();
      else {
        // los golpes en la puerta de la escalera, mientras sigan a lo suyo
        const d = this.stairDoor;
        if (d && alive.some((o) => o.state === 'dormant' && o.idle === 'pound')) {
          this.poundT -= dt;
          if (this.poundT <= 0) {
            this.poundT = 1.1 + Math.random() * 1.3;
            g.audio && g.audio.play('doorPound', { x: d.x, y: 1.2, z: d.z });
            d.shake = 1;
          }
        }
        // los gritos desde arriba, cuando hay alguien cerca para oírlos
        // (dentro de la casa, otros)
        const dd = Math.hypot(p.pos.x - A.door.x, p.pos.z - A.door.z);
        if (dd < 30 && p.pos.y > -1) {
          if (!this.seen && dd < 17) {
            this.seen = true;
            g.speech.say(this.who, DIALOG.henriqueSee, { dur: 4 });
            this.shoutT = 7;
          }
          this.shoutT -= dt;
          if (this.shoutT <= 0) {
            this.shoutT = 6 + Math.random() * 4;
            if (!g.speech.busy(this.who)) g.speech.say(this.who, pick(this.playerInside() ? DIALOG.henriqueArriba : DIALOG.henriqueWindow), { dur: 3 });
          }
        }
      }
    } else if (m === 'coming') {
      // ya abajo, junto a la puerta de la calle: si estás dentro, la cierra;
      // si no, te espera
      if (this.ri >= DOWN.length) {
        if (this.playerInside()) this.toShut();
        else {
          this.mode = 'waiting';
          g.speech.say(this.who, DIALOG.henriqueDoor[0], { dur: 3 });
        }
      }
    } else if (m === 'waiting') {
      // al entrar (bien dentro, lejos del umbral) cierra de un portazo
      if (this.playerInside()) this.toShut();
    } else if (m === 'waves') this.updateWaves(dt);
    else if (m === 'lore') {
      // (si se fue sin escucharle: al volver a acercarse)
      if (!this.loreStarted && !this.script && Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) < 6) this.startLore();
    } else if (m === 'after' && this.F['boss:leonor'] && !this.griefSaid) {
      // vencida Leonor: al volver a la casa, ya no la oye llorar
      const H = A.house;
      if (p.pos.x > H.x0 && p.pos.x < H.x1 && p.pos.z > H.z0 && p.pos.z < H.z1 && Math.abs(p.pos.y) < 2 && Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) < 9) {
        this.griefSaid = true;
        this.run([{ say: DIALOG.henriqueGrief, clip: TALK_CLIPS[2] }]);
      }
    }
    // la puerta de la escalera tiembla con los golpes
    for (const d of [this.door, this.stairDoor])
      if (d && d.shake > 0 && !d.done) {
        d.shake = Math.max(0, d.shake - dt * 4);
        for (const lf of d.leaves || []) lf.rotation.y = Math.sin(this.t * 70) * 0.015 * d.shake;
      }
    this.updateRelic(dt);
    // el interactuable de hablar le sigue
    const it = this.talkIt;
    if (it) {
      it.hidden = !this.canTalk() || !e.obj.visible;
      it.x = e.pos.x;
      it.y = e.pos.y;
      it.z = e.pos.z;
    }
    for (const b of this.boards) b.hidden = !this.boardable(b);
  }
}
