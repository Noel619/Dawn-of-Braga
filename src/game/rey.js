// El Rey y su último juego (la sala del alcaide, en la torre del homenaje).
//
// Sentado en su sitial ante el tablero del Cerco, se muere: cuando sonó la
// campana se arrodilló, como toda su corte, y algo le come por dentro. Quiere
// una última partida (su cuerpo: entities/rey.js; el juego: game/cerco/).
//
//  1. Antes de conocerte, inclinado sobre el tablero, murmura colocando las
//     piezas. Al verte intenta levantarse y no puede.
//  2. Al hablarle te cuenta quién es y qué quiere; luego, sentarse a jugar:
//     la vista de cerca (la cámara sobre el tablero y él enfrente).
//  3. La primera vez te explica las reglas y te deja el pergamino de su padre.
//  4. Juegan. Él lleva a los de fuera y piensa en un hilo de fondo; tú, al
//     rey. Comenta, recuerda, tose, se adormila; juega peor cuanto peor está.
//  5. Si le ganas (en cualquiera de las tres), te da tu rey de marfil y se
//     muere echado atrás en su sitial. Si pierdes las tres, se pone a colocar
//     otra partida y se muere con el rey en la mano, antes de llegar al trono.
//
// Banderas: rey:met (ya se conocen), rey:reglas (ya las explicó), rey:n
// (partidas jugadas), rey:ganada, rey:muerto, rey:final ('a' | 'b') y
// rey:tablero (cómo quedó el tablero), note:cerco y las take: de lo que deja.
import * as THREE from 'three';
import { DIALOG, MSG, NOTES } from './story.js';
import { REY_CLIPS, fingertip } from '../entities/rey.js';
import { REY_MESA, squareWorld } from '../world/rey_mesa.js';
import { Cerco, ATT, DEF, KING, SQ, N, rowOf, colOf, mv, mFrom, mTo, THRONE, NB } from './cerco/rules.js';
import { CercoBoard } from './cerco/board.js';
import { Thinker } from './cerco/thinker.js';
import { moveOpts } from './cerco/levels.js';
import { clamp } from '../core/util.js';
import { attachBackdrop, bannerBitmap } from '../ui/pixel.js';
import { clip } from '../entities/rig.js';

const V3 = THREE.Vector3;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const sm = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const B = REY_MESA.board,
  SEAT = REY_MESA.seat,
  BENCH = REY_MESA.bench;
const HEIGHT = { [ATT]: 0.062, [DEF]: 0.066, [KING]: 0.094 };
// los planos de la mesa: sobre el tablero (tu turno) y con el Rey (el suyo)
const CAM = {
  play: { pos: new V3(B.x, B.y + 0.72, B.z - 0.62), look: new V3(B.x, B.y, B.z + 0.02) },
  king: { pos: new V3(B.x + 0.22, B.y + 0.6, B.z - 0.98), look: new V3(B.x, B.y + 0.24, B.z + 0.44) },
  // los finales: de lado, a su altura; y desde lejos, la sala entera
  side: { pos: new V3(B.x + 1.35, B.y + 0.62, B.z - 0.05), look: new V3(SEAT.x, B.y + 0.3, SEAT.z - 0.05) },
  face: { pos: new V3(B.x - 0.35, B.y + 0.62, B.z - 0.45), look: new V3(SEAT.x, B.y + 0.55, SEAT.z - 0.12) },
  wide: { pos: new V3(B.x + 2.6, B.y + 1.9, B.z - 3.2), look: new V3(B.x, B.y + 0.1, B.z + 0.3) },
};
const CSS = `
#cerco { position: absolute; top: calc(var(--u) * 6); left: 50%; transform: translateX(-50%); padding: calc(var(--u) * 3) calc(var(--u) * 14); color: var(--bone-hi); text-shadow: var(--sh); font-family: 'Silkscreen', monospace; font-size: var(--fs-small); letter-spacing: calc(1px * var(--un)); text-transform: uppercase; white-space: nowrap; opacity: 0; transition: opacity 0.3s steps(3); pointer-events: none; }
#cerco > :not(canvas.pxbg) { position: relative; z-index: 1; }
#cerco.show { opacity: 1; }
#cerco b { color: #f5d88a; font-weight: normal; }
`;

export class ReyQuest {
  constructor(g) {
    this.g = g;
    this.npc = g.enemies.find((e) => e.type === 'rey') || null;
    this.talkIt = g.interact.list.find((i) => i.id === 't_rey');
    this.board = new CercoBoard(g);
    this.thinker = new Thinker();
    this.cerco = new Cerco();
    this._h = new V3(0, 0.32, 0.02);
    this._v = new V3();
    this._w = new V3();
    this.who = {
      id: 'rey',
      name: 'El Rey',
      voice: 'reyTalk',
      pitch: 1,
      hearR: 18,
      head: (out) => (this.npc ? this.npc.rig.worldPos('head', out, this._h) : out.set(SEAT.x, SEAT.y + 1.3, SEAT.z)),
    };
    // el marcador de la partida, arriba
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    this.hud = document.createElement('div');
    this.hud.id = 'cerco';
    this.hud.innerHTML = '<span></span>';
    document.getElementById('hud').appendChild(this.hud);
    attachBackdrop(this.hud, (w, h) => bannerBitmap(w, h, 'dark'), () => g.ui.sc.u);
    // sentado, el ratón va suelto y señala la casilla que tiene debajo
    this.mouseAt = null;
    g.canvas.addEventListener('mousemove', (ev) => {
      if (this.seat) this.mouseAt = { x: ev.clientX, y: ev.clientY, moved: true };
    });
    this._ray = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();
    this.reset();
  }

  get F() {
    return this.g.flags;
  }
  get dead() {
    return !!this.F['rey:muerto'];
  }
  get played() {
    return this.F['rey:n'] | 0;
  }

  reset() {
    this.mode = this.F && this.F['rey:met'] ? 'idle' : 'wait';
    this.view = null;
    this.seat = null; // la partida en la mesa (lo que pasa mientras estás sentado)
    this.script = null;
    this.sayT = 4;
    this.coughT = 6;
    this.lineCool = 0;
    this.noticed = false;
    this.memK = 0;
    this.hudText = '';
    this.hud && this.hud.classList.remove('show');
  }

  // ------------------------------------------------------------ hablar
  say(text, dur) {
    const sp = this.g.speech;
    if (!sp || !text) return;
    sp.say(this.who, text, dur ? { dur } : {});
  }
  // una de la lista (con descanso: que no hable a cada jugada)
  remark(list, p = 1, cool = 7) {
    if (this.lineCool > 0 || Math.random() > p) return false;
    this.lineCool = cool;
    this.say(pick(list));
    return true;
  }
  busy() {
    return this.g.speech && this.g.speech.busy(this.who);
  }
  typing() {
    const b = this.g.speech && this.g.speech.list.get(this.who.id);
    return !!b && !!b.line && b.shown < b.line.length;
  }
  // Un guion de pasos: { say: [...] } | { wait: s } | { clip } | { fn }.
  run(steps, done = null) {
    this.script = { steps: steps.slice(), cur: null, t: 0, done };
  }
  updateScript(dt) {
    const S = this.script;
    if (!S || this.g.ui.modal) return;
    S.t += dt;
    const c = S.cur;
    if (c) {
      if (c.say && this.busy()) return;
      if (c.wait && S.t < c.wait) return;
      if (c.until && !c.until()) return;
    }
    S.cur = null;
    S.t = 0;
    const st = S.steps.shift();
    if (!st) {
      this.script = null;
      if (S.done) S.done();
      return;
    }
    S.cur = st;
    if (st.say) this.g.speech.queue(this.who, Array.isArray(st.say) ? st.say : [st.say]);
    if (st.clip) this.play(st.clip);
    if (st.fn) st.fn();
  }
  play(name, blend = 0.3) {
    const e = this.npc;
    if (!e || !REY_CLIPS[name]) return;
    e.anim.play(REY_CLIPS[name], { blend });
    this.clipName = name;
  }
  clipBusy() {
    const e = this.npc;
    return !!e && !!e.anim.clip && !e.anim.done;
  }
  // deja el gesto que se queda quieto (pensar, adormilarse, tender la pieza)
  release(blend = 0.45) {
    const e = this.npc;
    if (e && e.anim.clip && e.anim.clip.hold && e.anim.targetWeight > 0) e.anim.stop(blend);
  }
  // Un ataque de tos: el gesto y su sonido (n: cuántos golpes).
  cough(kind = 'cough', n = 3) {
    this.play(kind);
    this.g.audio && this.g.audio.play('reyCough', this.who.head(this._v), { n });
  }

  // ------------------------------------------------------------ el interactuable
  canTalk() {
    const e = this.npc;
    return !!e && !this.seat && !this.script && this.mode !== 'wait';
  }
  label() {
    if (this.dead) return 'Examinar';
    if (!this.F['rey:met']) return 'Hablar';
    return 'Sentarse a jugar';
  }
  talk() {
    const g = this.g;
    if (this.dead) {
      g.ui.toast(this.F['rey:final'] === 'a' ? MSG.reyMuertoA : MSG.reyMuertoB, 5);
      return;
    }
    if (this.script) {
      g.speech.skip(this.who);
      return;
    }
    if (!this.F['rey:met']) {
      this.mode = 'talk';
      this.run([{ say: DIALOG.reyMeet, clip: 'nod' }, { fn: () => (this.F['rey:met'] = true) }, { say: DIALOG.reyMeetEnd }], () => {
        this.mode = 'idle';
        g.saveGame();
      });
      return;
    }
    this.sit();
  }

  // ------------------------------------------------------------ cada fotograma
  update(dt) {
    const g = this.g;
    const e = this.npc;
    this.lineCool -= dt;
    this.board.update(dt);
    this.updateScript(dt);
    // el interactuable: hablar, sentarse o examinarle
    const it = this.talkIt;
    if (it) {
      it.hidden = !e || (!this.dead && !this.canTalk() && !this.script) || !!this.seat;
      it.label = this.label();
    }
    // antes de conocerte: te ve llegar
    if (e && this.mode === 'wait' && !this.noticed && !this.dead) {
      const p = g.player.pos;
      const d = Math.hypot(p.x - e.pos.x, p.z - e.pos.z);
      if (d < 6.5 && Math.abs(p.y - e.pos.y) < 2.5 && !g.player.dead) this.notice();
    }
    if (this.seat) this.updateSeat(dt);
    // el marcador
    this.hud.classList.toggle('show', !!this.seat && !!this.hudText && !g.ui.modal);
  }

  // Te ve: se intenta levantar y no puede.
  notice() {
    this.noticed = true;
    this.mode = 'talk';
    this.run(
      [
        { say: DIALOG.reySee, clip: 'rise' },
        { wait: 2.4 },
        { fn: () => this.cough('cough', 3) },
        { say: DIALOG.reySee2 },
      ],
      () => (this.mode = 'idle')
    );
  }

  // ------------------------------------------------------------ su cuerpo
  npcReset(e) {
    e.body.pos.set(SEAT.x, SEAT.y, SEAT.z);
    e.yaw = SEAT.yaw;
    e.state = 'dormant';
    e.idle = 'sit';
    e.data.reach = null;
    e.data.look = null;
    if (this.dead) this.poseDead(e);
  }
  // muerto: su postura final, y quieto
  poseDead(e) {
    e.scripted = false;
    e.data.dead = { kind: this.F['rey:final'] === 'a' ? 'back' : 'slump', k: 1 };
    e.data.tired = 1;
    e.anim.stop(0);
    e.anim.weight = 0;
    e.animate(0.016);
    e.scripted = true;
    e.obj.visible = true;
  }
  npcAI(e, dt, player) {
    const g = this.g;
    const D = e.data;
    e.state = 'dormant';
    e.vx = e.vz = 0;
    const S = this.seat;
    // lo mal que está: cada partida, peor
    D.tired = Math.min(1, 0.35 + this.played * 0.22 + (S && S.final ? 0.2 : 0));
    // la boca, mientras habla
    D.talk = this.typing() ? 0.7 : 0;
    // a dónde mira
    if (!S) {
      const p = player.pos;
      const d = Math.hypot(p.x - e.pos.x, p.z - e.pos.z);
      if ((this.mode !== 'wait' || this.noticed) && d < 9 && Math.abs(p.y - e.pos.y) < 2.5) D.look = this._w.set(p.x, p.y + 1.6, p.z);
      else D.look = this._w.set(B.x, B.y, B.z);
      D.reach = null;
      // solo: tose, murmura y coloca piezas
      this.coughT -= dt;
      if (this.coughT <= 0 && !this.clipBusy() && !this.script) {
        this.coughT = 9 + Math.random() * 10 - D.tired * 4;
        if (Math.random() < 0.7) this.cough('cough', 3);
        else this.cough('coughLong', 5);
      }
      this.sayT -= dt;
      if (this.sayT <= 0 && !this.busy() && !this.script && d < 12 && Math.abs(player.pos.y - e.pos.y) < 2.5) {
        this.sayT = 8 + Math.random() * 6;
        if (this.mode === 'wait' && !this.noticed) {
          this.say(pick(DIALOG.reyMutter));
          if (!this.clipBusy()) this.play('think');
        } else if (this.F['rey:met'] && !this.dead && d < 6) this.say(pick(DIALOG.reyWait));
      }
    }
    e.animate(dt);
  }

  // ------------------------------------------------------------ sentarse
  sit() {
    const g = this.g;
    const p = g.player;
    // (con algo suelto cerca, no)
    if (this.threat()) {
      g.ui.toast(MSG.reyAhoraNo, 3);
      this.say(pick(DIALOG.reyThreatNear));
      return;
    }
    this.mode = 'table';
    this.script = null;
    g.speech.hush(this.who);
    // el jugador, en el banco (como una marioneta: no le mueve nadie)
    p.puppet = true;
    p.state = 'cine';
    p.vx = p.vz = 0;
    p.body.pos.set(BENCH.x, BENCH.y, BENCH.z);
    p.yaw = 0;
    p.anim.play(SIT_CLIP, { blend: 0.2 });
    g.lockTarget = null;
    this.gear(false);
    this.view = { pos: CAM.king.pos.clone(), look: CAM.king.look.clone() };
    g.player.obj.visible = false;
    // (el ratón, suelto: se ve el cursor y con él se señala)
    this.mouseAt = null;
    g.input.exitLock();
    g.canvas.style.cursor = 'default';
    this.seat = { phase: 'intro', t: 0, k: 0, leaveT: 0, sel: -1, moves: 0, final: null };
    this.board.setCursor(8, 4, false);
    g.audio && g.audio.music('cerco');
    // la primera vez, las reglas; luego, a jugar
    const first = !this.F['rey:reglas'];
    const back = this.played > 0 || this.F['rey:sentado'];
    this.F['rey:sentado'] = true;
    this.run(
      [
        ...(first
          ? [
              { say: DIALOG.reyRules, clip: 'nod' },
              {
                fn: () => {
                  this.F['rey:reglas'] = true;
                  this.F['note:cerco'] = true;
                  g.audio && g.audio.play('paper');
                  g.ui.showNote(NOTES.cerco);
                },
              },
              { wait: 0.5 },
            ]
          : back
            ? [{ say: pick(DIALOG.reyBack) }]
            : []),
        { fn: () => this.newGame() },
      ],
      null
    );
  }
  // las armas, fuera de la vista mientras está sentado
  gear(on) {
    const p = this.g.player;
    if (on) p.updateGear();
    else {
      p.rig.joints.sword.visible = false;
      p.rig.joints.shield.visible = false;
      if (p.shieldBack) p.shieldBack.group.visible = false;
      if (p.saya) p.saya.group.visible = false;
    }
  }
  // ¿hay alguna criatura despierta cerca? (entonces no se juega)
  threat() {
    const g = this.g;
    const p = g.player;
    return g.activeEnemies.some((e) => !e.dead && !e.T.friendly && e.aware && e.obj.visible && Math.abs(e.pos.y - p.pos.y) < 3 && Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < 16);
  }
  // Te levantas de la mesa.
  stand() {
    const g = this.g;
    const p = g.player;
    const S = this.seat;
    this.seat = null;
    this.view = null;
    this.mode = this.dead ? 'dead' : 'idle';
    this.board.clearMarks();
    g.ui.hidePuzzleHint();
    this._hintKey = null;
    this.who.subY = null;
    g.canvas.style.cursor = '';
    g.input.requestLock();
    p.puppet = false;
    // (de pie, junto al banco, mirando a la mesa y a él)
    p.spawn(BENCH.x, BENCH.y, BENCH.z - 0.75, 0);
    p.obj.visible = true;
    this.gear(true);
    g.camRig.override = null;
    g.camRig.snapTo(p);
    g.camRig.yaw = 0;
    if (this.npc) {
      this.npc.data.reach = null;
      this.npc.data.hold = null;
    }
    if (!this.dead) g.audio && g.audio.stopMusic();
    this.hudText = '';
    return S;
  }

  // ------------------------------------------------------------ la partida
  newGame() {
    const S = this.seat;
    if (!S) return;
    this.cerco.reset();
    this.board.setPosition(null);
    S.phase = 'start';
    S.t = 0;
    S.moves = 0;
    S.sel = -1;
    S.last = null;
    S.over = null;
    const n = this.played;
    this.gameNo = n;
    this.g.audio && this.g.audio.play('pieceSet', B);
    this.setHud();
    this.say(DIALOG.reyStart[Math.min(n, DIALOG.reyStart.length - 1)]);
  }
  setHud(turn = null) {
    const n = this.played + 1;
    const t = turn === 'you' ? 'Mueves tú' : turn === 'king' ? 'Piensa el Rey' : '';
    this.hudText = `Partida <b>${n}</b> de 3${t ? ' · ' + t : ''}`;
    this.hud.firstChild.innerHTML = this.hudText;
  }

  updateSeat(dt) {
    const g = this.g;
    const S = this.seat;
    const e = this.npc;
    S.t += dt;
    // el plano: hacia el tablero o hacia él
    const want = S.cam || (S.phase === 'you' || S.phase === 'youMove' ? 'play' : 'king');
    const C = CAM[want];
    const v = this.view;
    const k = Math.min(1, dt * (S.camSpeed ?? 2.2));
    v.pos.lerp(C.pos, k);
    v.look.lerp(C.look, k);
    // en tu turno su voz viene de arriba (no se le ve la cara)
    this.who.subY = want === 'play' ? 0.07 : null;
    // si algo te ataca o te mueres, se acabó la mesa (y la partida no cuenta)
    if (g.player.dead || (this.threat() && !S.final)) {
      this.stand();
      g.ui.toast(MSG.reyInterrumpido, 3);
      return;
    }
    if (g.ui.modal) return;
    // (la pausa, con la P o Start: Esc es «atrás» en la mesa)
    if (g.input.pressed('pause') && !g.input.pressed('back') && !S.final) {
      g.openPause();
      return;
    }
    // la vista: los controles de abajo
    this.hint(S);
    const D = e ? e.data : {};
    switch (S.phase) {
      case 'intro':
        // (el guion de antes de la partida)
        D.look = this._w.copy(g.camera.position);
        break;
      case 'start':
        D.look = this._w.set(B.x, B.y, B.z);
        if (S.t > 1.8 && !this.busy()) this.kingTurn();
        break;
      case 'think':
        this.updateThink(dt, D);
        break;
      case 'reach':
        this.updateReach(dt, D);
        break;
      case 'you':
        this.updateYou(dt, D);
        break;
      case 'youMove':
        D.look = this._w.set(B.x, B.y, B.z);
        if (S.t > S.wait) this.afterMove(DEF);
        break;
      case 'over':
        this.updateOver(dt, D);
        break;
      case 'again':
        this.updateAgain(dt, D);
        break;
      case 'final':
        this.updateFinal(dt, D);
        break;
    }
  }

  // Los controles que se ven abajo, según el momento.
  hint(S) {
    const g = this.g;
    let list = null;
    if (S.phase === 'you') {
      if (S.leaveT > 0) list = [{ act: 'back', label: MSG.cercoLeave }];
      else if (S.sel >= 0)
        list = [
          { kb: 'W A S D', pad: 'Cruceta', label: 'Mover' },
          { act: 'interact', label: 'Mover aquí' },
          { act: 'back', label: 'Soltar' },
        ];
      else
        list = [
          { kb: 'W A S D', pad: 'Cruceta', label: 'Mover' },
          { act: 'interact', label: 'Elegir' },
          { act: 'heal', label: 'Reglas' },
          { act: 'back', label: 'Levantarse' },
        ];
    } else if (S.phase === 'again')
      list = [
        { act: 'interact', label: 'Otra partida' },
        { act: 'back', label: 'Levantarse' },
      ];
    else if (S.phase === 'final' && S.final && S.final.prompt) list = [{ act: 'interact', label: S.final.prompt }];
    const key = list ? list.map((x) => x.label).join('|') : '';
    if (key === this._hintKey) return;
    this._hintKey = key;
    if (list) g.ui.showPuzzleHint(list);
    else g.ui.hidePuzzleHint();
  }

  // ---- su turno: piensa
  kingTurn() {
    const S = this.seat;
    S.phase = 'think';
    S.t = 0;
    S.result = null;
    S.board = this.cerco.save();
    const lv = Math.min(2, this.gameNo);
    const o = moveOpts(lv, Math.random());
    S.tired = o.isTired;
    // lo que tarda en pensar (teatro: la búsqueda suele tardar menos)
    S.minT = 1.3 + Math.random() * (1.3 + lv * 0.9) + (S.moves === 0 ? 0.6 : 0);
    // (en la segunda y la tercera, a veces se adormila mientras piensa)
    S.doze = lv > 0 && S.moves > 2 && Math.random() < 0.1 + lv * 0.08 ? { at: 1 + Math.random() * 1.5, dur: 2.4 + Math.random() * 2.2 } : null;
    if (S.doze) S.minT += S.doze.dur + 1.4;
    this.setHud('king');
    const tok = (S.tok = {});
    this.thinker
      .think(S.board, { depth: o.depth, ms: o.ms, noise: o.noise, jitter: o.jitter, seed: (Math.random() * 4294967296) >>> 0 })
      .then((r) => {
        if (this.seat && this.seat.tok === tok) S.result = r;
      })
      .catch((err) => {
        console.warn('[cerco]', err);
        if (this.seat && this.seat.tok === tok) {
          const ms = this.cerco.moves();
          S.result = { move: ms[Math.floor(Math.random() * ms.length)], score: 0 };
        }
      });
    if (this.npc && !this.clipBusy()) this.play('think');
    // un recuerdo, de vez en cuando, mientras piensa
    if (S.moves > 1 && Math.random() < 0.22 && this.memK < DIALOG.reyMemory.length && this.lineCool <= 0) {
      this.say(DIALOG.reyMemory[this.memK++]);
      this.lineCool = 12;
    }
  }
  updateThink(dt, D) {
    const S = this.seat;
    D.look = this._w.set(B.x, B.y, B.z);
    const e = this.npc;
    // adormilado: la cabeza se le cae; despierta de golpe
    if (S.doze) {
      const z = S.doze;
      if (!z.on && S.t > z.at) {
        z.on = true;
        this.play('doze', 0.6);
      }
      if (z.on && !z.woke) D.sleepy = Math.min(1, (D.sleepy ?? 0) + dt * 0.6);
      if (z.on && !z.woke && S.t > z.at + z.dur) {
        z.woke = true;
        D.sleepy = 0;
        this.play('wake', 0.1);
        this.g.audio && this.g.audio.play('reyGasp', this.who.head(this._v));
        this.say(pick(DIALOG.reyDoze));
      }
    } else D.sleepy = Math.max(0, (D.sleepy ?? 0) - dt);
    // la tos, más a menudo cuanto peor está
    this.coughT -= dt;
    if (this.coughT <= 0 && !this.clipBusy() && S.t > 0.8) {
      this.coughT = Math.max(5, 16 - this.gameNo * 4 + Math.random() * 8);
      // (o el dolor: la mano al costado, a la herida)
      if (Math.random() < 0.25) {
        this.play('pain', 0.15);
        this.g.audio && this.g.audio.play('reyGasp', this.who.head(this._v));
      } else this.cough(this.gameNo >= 2 && Math.random() < 0.4 ? (Math.random() < 0.5 ? 'coughBad' : 'coughLong') : 'cough', 2 + this.gameNo * 2);
      S.minT += 2.4;
      if (Math.random() < 0.35) this.remark(DIALOG.reyCough, 1, 5);
    }
    if (S.result && S.t > S.minT && !this.clipBusy()) {
      D.sleepy = 0;
      this.startReach(S.result.move);
    } else if (!S.result && S.t > 12 && !S.slowT) {
      S.slowT = true;
      this.remark(DIALOG.reyHmm, 1, 4);
    }
    if (e && !this.clipBusy() && !S.result && S.t > 3 && Math.random() < dt * 0.15) this.play(Math.random() < 0.5 ? 'think' : 'nod');
  }

  // ---- su turno: la mano a la pieza, la lleva y la deja
  startReach(m) {
    const S = this.seat;
    const e = this.npc;
    S.phase = 'reach';
    S.t = 0;
    S.move = m;
    const from = mFrom(m),
      to = mTo(m);
    const c = this.cerco.clone();
    const u = c.make(m);
    S.caps = [];
    for (let i = 0; i < u.caps.length; i += 2) S.caps.push(u.caps[i]);
    const pc = this.board.pieceAt(from);
    const h = HEIGHT[pc ? pc.type : ATT];
    const a = this.board.sqWorld(from),
      b = this.board.sqWorld(to);
    const tip0 = e ? fingertip(e, new V3()) : new V3(a.x, a.y + 0.3, a.z);
    S.path = {
      from,
      to,
      h,
      p0: tip0,
      p1: new V3(a.x, a.y + h - 0.006, a.z),
      p2: new V3(b.x, b.y + h - 0.006, b.z),
      // (más despacio cuanto peor está; y la tercera, con un titubeo)
      reach: 0.85 + this.gameNo * 0.3 + Math.random() * 0.3,
      carry: 0.6 + this.gameNo * 0.22 + Math.hypot(b.x - a.x, b.z - a.z) * 1.3,
      falter: this.gameNo >= 1 && Math.random() < 0.25 + this.gameNo * 0.15 ? 0.3 + Math.random() * 0.4 : 0,
    };
    S.step = 'reach';
    this.release(0.5);
    if (e) e.data.reach = { pos: tip0.clone(), w: 0 };
    this.g.audio && this.g.audio.play('reyBreath', this.who.head(this._v));
  }
  updateReach(dt, D) {
    const S = this.seat;
    const P = S.path;
    const e = this.npc;
    const R = D.reach || (D.reach = { pos: new V3(), w: 0 });
    D.look = this._w.copy(S.step === 'carry' || S.step === 'place' ? P.p2 : P.p1);
    const st = S.step;
    if (st === 'reach') {
      const k = Math.min(1, S.t / P.reach);
      R.w = sm(Math.min(1, k * 1.6));
      // por encima de la pieza y luego, despacio, abajo
      const kk = sm(k);
      R.pos.lerpVectors(P.p0, P.p1, kk);
      R.pos.y += Math.sin(kk * Math.PI) * 0.12;
      if (k >= 1) {
        S.step = 'grab';
        S.t = 0;
      }
    } else if (st === 'grab') {
      R.pos.copy(P.p1);
      if (S.t > 0.28) {
        // la coge
        this.board.hold(P.from, (out) => fingertip(e, out).add(this._v.set(0, -P.h + 0.006, 0)));
        S.step = 'carry';
        S.t = 0;
        this.g.audio && this.g.audio.play('pieceSlide', P.p1);
      }
    } else if (st === 'carry') {
      // en arco hasta la casilla, con el titubeo a mitad
      let k = S.t / P.carry;
      if (P.falter && k > 0.45 && !S.faltered) {
        if (S.t < P.carry * 0.45 + P.falter) k = 0.45;
        else {
          S.faltered = true;
          S.t -= P.falter;
          k = S.t / P.carry;
        }
      }
      k = Math.min(1, k);
      const kk = sm(k);
      R.pos.lerpVectors(P.p1, P.p2, kk);
      R.pos.y += Math.sin(kk * Math.PI) * 0.07;
      if (k >= 1) {
        S.step = 'place';
        S.t = 0;
        S.faltered = false;
      }
    } else if (st === 'place') {
      R.pos.copy(P.p2);
      if (S.t > 0.12 && !S.placed) {
        S.placed = true;
        this.board.drop(P.from, P.to, S.caps);
        this.cerco.play(S.move);
        S.moves++;
        this.board.setLast(P.from, P.to);
      }
      if (S.t > 0.35) {
        S.step = 'back';
        S.t = 0;
        S.placed = false;
      }
    } else if (st === 'back') {
      const k = Math.min(1, S.t / 0.8);
      R.w = 1 - sm(k);
      R.pos.y = P.p2.y + k * 0.15;
      if (k >= 1) {
        D.reach = null;
        this.afterMove(ATT);
      }
    }
  }

  // ---- tu turno
  playerTurn() {
    const S = this.seat;
    S.phase = 'you';
    S.t = 0;
    S.sel = -1;
    S.leaveT = 0;
    this.setHud('you');
    // el cursor, donde estaba (o sobre tu rey)
    const c = this.board.cursor;
    if (!S.cursorSet) {
      S.cursorSet = true;
      c.r = rowOf[this.cerco.king] ?? 4;
      c.c = colOf[this.cerco.king] ?? 4;
    }
    this.board.setCursor(c.r, c.c, true);
    this.board.setSelected(-1);
    this.mouse = { x: 0, y: 0 };
    this.release();
  }
  updateYou(dt, D) {
    const g = this.g;
    const inp = g.input;
    const S = this.seat;
    const cur = this.board.cursor;
    // te mira la mano (el cursor)
    D.look = squareWorld(cur.r, cur.c, this._w);
    // y tose, mientras piensas
    this.coughT -= dt;
    if (this.coughT <= 0 && !this.clipBusy()) {
      this.coughT = Math.max(7, 22 - this.gameNo * 5 + Math.random() * 10);
      this.cough(this.gameNo >= 2 && Math.random() < 0.3 ? 'coughLong' : 'cough', 2 + this.gameNo);
    }
    if (S.t < 0.15) return;
    S.leaveT = Math.max(0, S.leaveT - dt);
    // el cursor: teclas, cruceta, stick o el ratón
    const dir = inp.menuDir();
    let r = cur.r,
      c = cur.c;
    if (dir.x || dir.y) {
      c = clamp(c + dir.x, 0, N - 1);
      r = clamp(r + dir.y, 0, N - 1);
      this.mouse.x = this.mouse.y = 0;
    } else if (this.mouseAt && this.mouseAt.moved) {
      // el ratón suelto: la casilla que hay bajo el puntero
      this.mouseAt.moved = false;
      const hit = this.squareUnder(this.mouseAt.x, this.mouseAt.y);
      if (hit) {
        r = hit.r;
        c = hit.c;
      }
    } else if (inp.mdx || inp.mdy) {
      const m = this.mouse;
      m.x += inp.mdx * 0.012 * (inp.sens || 1);
      m.y += inp.mdy * 0.012 * (inp.sens || 1);
      if (Math.abs(m.x) >= 1) {
        c = clamp(c + Math.sign(m.x), 0, N - 1);
        m.x -= Math.sign(m.x);
      }
      if (Math.abs(m.y) >= 1) {
        r = clamp(r + Math.sign(m.y), 0, N - 1);
        m.y -= Math.sign(m.y);
      }
    }
    if (r !== cur.r || c !== cur.c) {
      this.board.setCursor(r, c, true);
      g.audio && g.audio.ui('move');
    }
    const here = cur.r * N + cur.c;
    // (el puntero, una mano sobre lo que se puede coger o adonde se puede ir)
    if (this.mouseAt) {
      const pc = this.cerco.b[here];
      const can = S.sel < 0 ? pc === DEF || pc === KING : here === S.sel || this.cerco.legal(mv(S.sel, here)) || pc === DEF || pc === KING;
      g.canvas.style.cursor = can ? 'pointer' : 'default';
    }
    if (inp.pressed('heal')) {
      g.audio && g.audio.play('paper');
      g.ui.showNote(NOTES.cerco);
      return;
    }
    if (inp.pressed('back')) {
      if (S.sel >= 0) {
        S.sel = -1;
        this.board.setSelected(-1);
        g.audio && g.audio.ui('back');
      } else if (S.leaveT > 0) this.leave();
      else {
        S.leaveT = 3;
        g.audio && g.audio.ui('move');
      }
      return;
    }
    const click = inp.pressed('light') && (!this.mouseAt || this.squareUnder(this.mouseAt.x, this.mouseAt.y));
    if (inp.pressed('interact') || inp.pressed('confirm') || click) {
      S.leaveT = 0;
      const p = this.cerco.b[here];
      if (S.sel < 0 || (p && p !== ATT)) {
        // elegir una de las tuyas
        if (p === DEF || p === KING) {
          const tg = this.cerco.targets(here);
          if (!tg.length) {
            g.audio && g.audio.play('locked', B);
            return;
          }
          S.sel = here;
          this.board.setSelected(here, this.targetsInfo(here, tg));
          g.audio && g.audio.play('pieceSlide', this.board.sqWorld(here), { k: 0.5 });
        } else g.audio && g.audio.ui('back');
        return;
      }
      // mover la elegida aquí
      const m = mv(S.sel, here);
      if (!this.cerco.legal(m)) {
        g.audio && g.audio.play('locked', B);
        return;
      }
      this.playerMove(m);
    }
  }
  // La casilla bajo el puntero (coordenadas de la ventana), o null.
  squareUnder(x, y) {
    const g = this.g;
    const rc = g.canvas.getBoundingClientRect();
    this._ndc.set(((x - rc.left) / rc.width) * 2 - 1, -((y - rc.top) / rc.height) * 2 + 1);
    this._ray.setFromCamera(this._ndc, g.camera);
    const R = this._ray.ray;
    if (Math.abs(R.direction.y) < 1e-4) return null;
    const t = (B.y - R.origin.y) / R.direction.y;
    if (t <= 0) return null;
    const px = R.origin.x + R.direction.x * t,
      pz = R.origin.z + R.direction.z * t;
    const c = Math.round(4 - (px - B.x) / B.sq),
      r = Math.round(4 - (pz - B.z) / B.sq);
    if (r < 0 || r >= N || c < 0 || c >= N) return null;
    return { r, c };
  }
  // A dónde puede ir, y qué pasa en cada sitio: mata, gana o nada.
  targetsInfo(from, tg) {
    return tg.map((to) => {
      const c = this.cerco.clone();
      const u = c.make(mv(from, to));
      return { sq: to, kind: c.result && c.result.winner === DEF ? 'win' : u.caps.length ? 'take' : 'move' };
    });
  }
  playerMove(m) {
    const S = this.seat;
    const c = this.cerco.clone();
    const u = c.make(m);
    const caps = [];
    for (let i = 0; i < u.caps.length; i += 2) caps.push(u.caps[i]);
    this.board.setSelected(-1);
    this.board.setCursor(rowOf[mTo(m)], colOf[mTo(m)], false);
    this.board.setLast();
    const dur = this.board.move(mFrom(m), mTo(m), caps);
    this.cerco.play(m);
    S.moves++;
    S.youMoves = (S.youMoves || 0) + 1;
    S.phase = 'youMove';
    S.t = 0;
    S.wait = dur + 0.15;
    S.sel = -1;
    this.lastCaps = caps.length;
  }

  // Después de una jugada: lo que dice él, y si se acabó.
  afterMove(side) {
    const S = this.seat;
    const C = this.cerco;
    const res = C.result;
    if (res) {
      this.gameOver(res);
      return;
    }
    const lines = C.openLines();
    if (side === ATT) {
      // la suya: si ha matado, si te ha cerrado una salida, si tu rey está en peligro
      if (S.caps.length) {
        this.remark(DIALOG.reyTake, 0.7, 5);
        if (S.caps.length && Math.random() < 0.3) this.play('nod');
      } else if (S.blocking) this.remark(DIALOG.reyBlock, 0.6, 6);
      else if (S.tired && this.gameNo >= 1) this.remark(DIALOG.reyTired, 0.35, 10);
      else if (this.kingInDanger()) this.remark(DIALOG.reyDanger, 0.45, 9);
      S.blocking = false;
      this.playerTurn();
    } else {
      // la tuya: si le has matado una, si tu rey se asoma a las afueras
      if (lines >= 2) {
        this.remark(DIALOG.reyFork, 1, 3);
        this.play('shake');
      } else if (lines === 1) {
        S.blocking = true;
        this.remark(DIALOG.reyThreat, 0.8, 4);
      } else if (this.lastCaps) {
        if (this.remark(DIALOG.reyLost, 0.8, 5) && Math.random() < 0.5) {
          this.play('laugh');
          this.g.audio && this.g.audio.play('reyLaugh', this.who.head(this._v));
        }
      }
      this.kingTurn();
    }
  }
  // ¿puede el Rey atrapar a tu rey en su próxima jugada?
  kingInDanger() {
    const c = this.cerco.clone();
    if (c.turn !== ATT) return false;
    const k = c.king;
    for (const m of c.moves()) {
      const to = mTo(m);
      if (!(NB[to * 4] === k || NB[to * 4 + 1] === k || NB[to * 4 + 2] === k || NB[to * 4 + 3] === k)) continue;
      const u = c.make(m);
      const won = c.result && c.result.winner === ATT;
      c.unmake(u);
      if (won) return true;
    }
    return false;
  }

  // ---- se acabó una partida
  gameOver(res) {
    const S = this.seat;
    const g = this.g;
    S.phase = 'over';
    S.t = 0;
    S.over = res;
    this.board.setCursor(0, 0, false);
    this.board.setSelected(-1);
    this.hudText = '';
    const n = this.played + 1;
    this.F['rey:n'] = n;
    const won = res.winner === DEF;
    if (won) this.F['rey:ganada'] = true;
    g.saveGame();
    // ¿el final?
    if (won || n >= 3) {
      S.overWait = 1.6;
      S.toFinal = won ? 'a' : 'b';
      return;
    }
    // la ganó él (o tablas): lo dice, y te pide otra
    S.overWait = 2.6;
    const lines = res.winner === 0 ? DIALOG.reyDraw : n === 1 ? DIALOG.reyWin1 : DIALOG.reyWin2;
    this.run([{ wait: 1.0 }, { say: lines, clip: res.winner === 0 ? 'shake' : 'nod' }], null);
    if (res.winner === ATT) {
      this.play('laugh');
      g.audio && g.audio.play('reyLaugh', this.who.head(this._v));
    }
  }
  updateOver(dt, D) {
    const S = this.seat;
    D.look = this._w.set(B.x, B.y, B.z);
    if (S.t < S.overWait || this.script) return;
    if (S.toFinal) this.startFinal(S.toFinal);
    else {
      S.phase = 'again';
      S.t = 0;
      S.cam = null;
    }
  }
  updateAgain(dt, D) {
    const g = this.g;
    const S = this.seat;
    D.look = this._w.copy(g.camera.position);
    if (S.t < 0.4) return;
    if (g.input.pressed('interact') || g.input.pressed('confirm')) {
      S.cursorSet = false;
      this.newGame();
    } else if (g.input.pressed('back')) {
      this.stand();
      this.say(pick(DIALOG.reyLeaveBetween));
    }
  }
  // Te levantas a media partida: la pierdes (si ya habías movido).
  leave() {
    const S = this.seat;
    if (S.youMoves) {
      // (era la tercera: ya no te deja irte; se acaba aquí)
      if (this.played + 1 >= 3) {
        this.gameOver({ winner: ATT, reason: 'leave' });
        return;
      }
      this.F['rey:n'] = this.played + 1;
      this.g.saveGame();
      this.stand();
      this.say(pick(DIALOG.reyForfeit));
    } else {
      this.stand();
      this.say(pick(DIALOG.reyLeaveBetween));
    }
  }

  // ------------------------------------------------------------ los finales
  startFinal(kind) {
    const S = this.seat;
    const g = this.g;
    S.phase = 'final';
    S.t = 0;
    S.final = { kind, step: 0, t: 0 };
    g.audio && g.audio.music('reyFin');
    this.F['rey:final'] = kind;
    if (kind === 'a') {
      // has ganado: lo mira, se ríe, te da tu rey y se echa atrás
      S.cam = 'king';
      this.run([
        { wait: 1.6 },
        { say: DIALOG.reyEndWin[0] },
        { clip: 'laugh', fn: () => g.audio && g.audio.play('reyLaugh', this.who.head(this._v), { long: true }) },
        { wait: 1.6 },
        { fn: () => this.cough('coughLong', 5) },
        { wait: 3.8 },
        { say: DIALOG.reyEndWin.slice(1, 2) },
        { fn: () => this.finalGive() },
        { until: () => S.final.given },
        { say: DIALOG.reyEndWin.slice(3, 4) },
        { fn: () => this.finalDie('back') },
        { say: DIALOG.reyEndWin.slice(4) },
        { until: () => S.final.deadK >= 1 },
        { wait: 3.0 },
        { fn: () => this.finalEnd() },
      ]);
    } else {
      // tres perdidas: se ríe, flojo, y se pone a colocar otra partida
      S.cam = 'king';
      this.run([
        { wait: 1.2 },
        { say: DIALOG.reyEndLose.slice(0, 1) },
        { clip: 'laugh', fn: () => g.audio && g.audio.play('reyLaugh', this.who.head(this._v)) },
        { wait: 1.5 },
        { say: DIALOG.reyEndLose.slice(1, 3) },
        { fn: () => this.finalSetup() },
        { until: () => S.final.stopped },
        { fn: () => this.finalDie('slump') },
        { until: () => S.final.deadK >= 1 },
        { wait: 3.5 },
        { fn: () => this.finalEnd() },
      ]);
    }
  }
  updateFinal(dt, D) {
    const S = this.seat;
    const F = S.final;
    const g = this.g;
    F.t += dt;
    const e = this.npc;
    if (!e) return;
    D.tired = 1;
    // la muerte: hacia su postura, y se apaga la respiración
    if (F.dying) {
      F.deadK = Math.min(1, (F.deadK ?? 0) + dt / F.dieDur);
      D.dead = { kind: F.dying, k: sm(F.deadK) };
      D.sleepy = Math.min(1, F.deadK * 1.5);
      if (F.deadK > 0.55 && !F.breath) {
        F.breath = true;
        g.audio && g.audio.play('reyLastBreath', this.who.head(this._v));
      }
    }
    // te da tu rey: lo coge del borde y te lo tiende
    if (F.give) this.updateGive(dt, D, F);
    // coloca la cuarta partida y se le para la mano
    if (F.setup) this.updateSetup(dt, D, F);
    if (!F.give && !F.setup && !F.dying) D.look = this._w.copy(g.camera.position);
  }
  finalGive() {
    const S = this.seat;
    const F = S.final;
    const e = this.npc;
    const k = this.cerco.king >= 0 ? this.cerco.king : this.board.king.sq;
    const a = this.board.sqWorld(k);
    F.give = { step: 'reach', t: 0, sq: k, p0: fingertip(e, new V3()), p1: new V3(a.x, a.y + HEIGHT[KING] - 0.006, a.z), p2: new V3(B.x - 0.02, B.y + 0.22, B.z - 0.3) };
    e.data.reach = { pos: F.give.p0.clone(), w: 0 };
    S.cam = 'king';
  }
  updateGive(dt, D, F) {
    const G = F.give;
    const g = this.g;
    const R = D.reach;
    G.t += dt;
    D.look = this._w.copy(G.step === 'offer' || G.step === 'wait' ? g.camera.position : G.p1);
    if (G.step === 'reach') {
      const k = Math.min(1, G.t / 1.8);
      R.w = sm(Math.min(1, k * 1.5));
      R.pos.lerpVectors(G.p0, G.p1, sm(k));
      R.pos.y += Math.sin(sm(k) * Math.PI) * 0.12;
      if (k >= 1) {
        G.step = 'grab';
        G.t = 0;
      }
    } else if (G.step === 'grab') {
      R.pos.copy(G.p1);
      if (G.t > 0.4) {
        this.board.hold(G.sq, (out) => fingertip(this.npc, out).add(this._v.set(0, -HEIGHT[KING] + 0.006, 0)));
        G.step = 'offer';
        G.t = 0;
        this.play('offer', 0.5);
        this.say(DIALOG.reyEndWin[2]);
      }
    } else if (G.step === 'offer') {
      const k = Math.min(1, G.t / 2.2);
      R.pos.lerpVectors(G.p1, G.p2, sm(k));
      R.pos.y += Math.sin(sm(k) * Math.PI) * 0.08;
      if (k >= 1) {
        G.step = 'wait';
        G.t = 0;
        F.prompt = 'Tomarlo';
      }
    } else if (G.step === 'wait') {
      // la mano tendida, temblando, hasta que lo tomas
      R.pos.copy(G.p2);
      R.pos.y += Math.sin(g.time * 1.3) * 0.006;
      if (g.input.pressed('interact') || g.input.pressed('confirm')) {
        F.prompt = null;
        G.step = 'back';
        G.t = 0;
        // el rey de marfil, en tu mano (el objeto se da al morir él)
        const pc = this.board.king;
        pc.held = null;
        pc.obj.visible = false;
        g.audio && g.audio.play('pickup', B);
        F.given = true;
      }
    } else if (G.step === 'back') {
      R.w = Math.max(0, R.w - dt / 1.6);
      R.pos.y -= dt * 0.08;
      if (R.w <= 0) {
        D.reach = null;
        F.give = null;
        this.release();
      }
    }
  }
  finalSetup() {
    const S = this.seat;
    const F = S.final;
    // las que va colocando: tres de las suyas, en su sitio de salida (de las
    // de su lado, las que estén libres) y, la cuarta, tu rey (que no llega
    // al trono)
    const order = [];
    const b = this.cerco.b;
    for (const [r, c] of [
      [0, 4],
      [0, 3],
      [0, 5],
      [1, 4],
      [3, 0],
      [3, 8],
      [4, 0],
      [4, 8],
    ]) {
      const sq = r * N + c;
      if (order.length < 3 && !b[sq] && !this.board.pieceAt(sq)) order.push(sq);
    }
    F.setup = { i: 0, step: 'pick', t: 0, order };
    S.cam = 'king';
    S.camSpeed = 0.8;
  }
  updateSetup(dt, D, F) {
    const U = F.setup;
    const e = this.npc;
    const R = D.reach || (D.reach = { pos: fingertip(e, new V3()), w: 0 });
    U.t += dt;
    const slow = 1 + U.i * 0.3;
    if (U.step === 'pick') {
      // la siguiente: una de los suyos tumbada (o tu rey, la quinta)
      const last = U.i >= U.order.length;
      let pc = null;
      if (last) pc = this.board.king;
      else pc = this.board.pieces.find((p) => p.type === ATT && p.sq < 0 && !p.anim && !p.used) || this.board.pieces.find((p) => p.type === ATT && p.sq >= 0 && !p.used && !U.order.includes(p.sq));
      if (!pc) {
        U.i++;
        if (U.i > U.order.length) F.stopped = true;
        return;
      }
      pc.used = true;
      U.pc = pc;
      U.p0 = fingertip(e, new V3());
      U.p1 = pc.obj.position.clone().add(new V3(0, HEIGHT[pc.type] - 0.006, 0));
      const to = last ? THRONE : U.order[U.i];
      const w = this.board.sqWorld(to);
      U.p2 = new V3(w.x, w.y + HEIGHT[pc.type] - 0.006, w.z);
      U.to = to;
      U.step = 'reach';
      U.t = 0;
      if (U.i === 1) this.say(DIALOG.reyEndLoseMutter[0]);
      if (U.i === 2) this.say(DIALOG.reyEndLoseMutter[1]);
      if (last) this.say(DIALOG.reyEndLoseMutter[2]);
    } else if (U.step === 'reach') {
      const k = Math.min(1, U.t / (1.1 * slow));
      R.w = sm(Math.min(1, k * 1.5 + (U.i ? 1 : 0)));
      R.pos.lerpVectors(U.p0, U.p1, sm(k));
      R.pos.y += Math.sin(sm(k) * Math.PI) * 0.1;
      D.look = this._w.copy(U.p1);
      if (k >= 1) {
        U.step = 'grab';
        U.t = 0;
      }
    } else if (U.step === 'grab') {
      R.pos.copy(U.p1);
      if (U.t > 0.3 * slow) {
        const pc = U.pc;
        pc.anim = null;
        if (pc.sq >= 0) this.board.bySq[pc.sq] = null;
        pc.sq = -1;
        pc.obj.rotation.set(0, pc.type === ATT ? Math.PI : 0, 0);
        const h = HEIGHT[pc.type];
        pc.held = (out) => fingertip(e, out).add(this._v.set(0, -h + 0.006, 0));
        U.step = 'carry';
        U.t = 0;
        this.g.audio && this.g.audio.play('pieceSlide', U.p1);
      }
    } else if (U.step === 'carry') {
      const last = U.i >= U.order.length;
      let k = Math.min(1, U.t / (1.0 * slow));
      // la quinta no llega: a mitad de camino se le para la mano
      if (last && k > 0.55) {
        k = 0.55;
        U.step = 'stop';
        U.t = 0;
      }
      R.pos.lerpVectors(U.p1, U.p2, sm(k));
      R.pos.y += Math.sin(sm(k) * Math.PI) * 0.06;
      D.look = this._w.copy(U.p2);
      if (k >= 1 && U.step === 'carry') {
        U.step = 'place';
        U.t = 0;
      }
    } else if (U.step === 'place') {
      if (U.t > 0.15) {
        const pc = U.pc;
        pc.held = null;
        this.board.bySq[U.to] = pc;
        pc.sq = U.to;
        pc.obj.rotation.set(0, Math.PI, 0);
        this.g.audio && this.g.audio.play('pieceTap', U.p2, { k: 0.9 });
        U.i++;
        U.step = 'pick';
        U.t = 0;
      }
    } else if (U.step === 'stop') {
      // la mano se queda quieta en el aire... y se le cae
      if (U.t > 1.6 && !U.dropped) {
        U.dropped = true;
        const pc = U.pc;
        pc.held = null;
        const p = pc.obj.position.clone();
        const land = new V3(p.x + 0.03, B.y, p.z - 0.05);
        pc.anim = { kind: 'topple', t: 0, dur: 0.7, a: p, b: land.add(new V3(0, 0.012, 0)), stay: true };
        this.g.audio && this.g.audio.play('pieceTopple', p);
        F.stopped = true;
      }
      R.w = U.dropped ? Math.max(0, R.w - dt / 2.5) : R.w;
      if (U.dropped) R.pos.y -= dt * 0.12;
    }
  }
  // Se muere: hacia atrás, en su sitial ('back'), o doblado ('slump').
  finalDie(kind) {
    const S = this.seat;
    const F = S.final;
    F.dying = kind;
    F.dieDur = kind === 'back' ? 6 : 4.5;
    F.deadK = 0;
    S.cam = kind === 'back' ? 'face' : 'side';
    S.camSpeed = 0.5;
    this.F['rey:muerto'] = true;
    // cómo queda el tablero
    this.F['rey:tablero'] = Array.from(this.cerco.b).join('');
    // lo que te deja (ya, con la partida guardada: aunque se salga a medias)
    this.bequeath(F.kind);
    this.g.saveGame();
    this.g.later((F.dieDur + 1.5) * 1000, () => {
      if (this.seat && this.seat.final === F) {
        S.cam = 'wide';
        S.camSpeed = 0.25;
      }
    });
  }
  // El rey de marfil: si le ganaste, te lo dio (y abriga: vitalidad); si
  // no, se le cayó de los dedos.
  bequeath(kind) {
    const g = this.g;
    const id = kind === 'a' ? 'rey_marfil' : 'rey_caido';
    if (this.F['take:i_' + id]) return;
    this.F['take:i_' + id] = true;
    g.inventory.add(id);
    if (kind === 'a') {
      const p = g.player;
      const was = p.maxHp;
      p.baseMaxHp += 25;
      p.refreshMaxHp();
      p.hp += p.maxHp - was;
    }
  }
  finalEnd() {
    const g = this.g;
    const F = this.seat ? this.seat.final : null;
    const id = F && F.kind === 'b' ? 'rey_caido' : 'rey_marfil';
    this.stand();
    this.mode = 'dead';
    if (this.npc) {
      this.npc.data.reach = null;
      this.poseDead(this.npc);
    }
    g.ui.area(MSG.reyHaMuerto);
    g.saveGame();
    // y lo que te deja, en su pantalla (como al recoger algo)
    g.later(3600, () => {
      if (g.state !== 'play' || g.ui.modal) return;
      g.ui.showItem(id);
      g.state = 'paused';
      const s = g.ui.top;
      if (s)
        s.data.onClose = () => {
          if (g.state === 'paused') g.state = 'play';
        };
    });
    g.audio && g.audio.stopMusic();
  }

  // ------------------------------------------------------------ partidas guardadas
  applyFlags() {
    this.script = null;
    if (this.seat) this.stand();
    this.reset();
    this.thinker = this.thinker || new Thinker();
    // el tablero: como quedó (muerto) o la salida
    const s = this.F['rey:tablero'];
    if (this.dead && s && s.length === SQ) {
      const b = Int8Array.from(s.split('').map(Number));
      this.board.setPosition(b);
      if (this.F['rey:final'] === 'a') this.board.king.obj.visible = false;
      else {
        // (tu rey, caído junto al trono)
        const pc = this.board.king;
        if (pc.sq >= 0) this.board.bySq[pc.sq] = null;
        pc.sq = -1;
        const w = this.board.sqWorld(THRONE);
        pc.obj.position.set(w.x + 0.04, B.y + 0.012, w.z + 0.03);
        pc.obj.rotation.set(0, 0.4, Math.PI / 2);
      }
    } else this.board.setPosition(null);
    if (this.npc) this.npcReset(this.npc);
    this.mode = this.dead ? 'dead' : this.F['rey:met'] ? 'idle' : 'wait';
  }
  onRespawn() {
    this.script = null;
    if (this.seat) this.stand();
    this.g.speech && this.g.speech.hush(this.who);
    if (this.npc) this.npcReset(this.npc);
  }
}

// Sentado en el banco, las manos sobre la mesa (el jugador).
export const SIT_CLIP = clip(
  'pSit',
  1.0,
  [
    [0, { root: [0, -43, -6], hips: [-6, 0, 0], legL: [-84, 0, 6], shinL: [88, 0, 0], legR: [-84, 0, -6], shinR: [88, 0, 0], chest: [14, 0, 0], head: [10, 0, 0], armL: [-58, 0, 8], foreL: [-62, 0, 0], handL: [10, 0, 0], armR: [-58, 0, -8], foreR: [-62, 0, 0], handR: [10, 0, 0] }],
    [1.0, { root: [0, -43, -6], hips: [-6, 0, 0], legL: [-84, 0, 6], shinL: [88, 0, 0], legR: [-84, 0, -6], shinR: [88, 0, 0], chest: [14, 0, 0], head: [10, 0, 0], armL: [-58, 0, 8], foreL: [-62, 0, 0], handL: [10, 0, 0], armR: [-58, 0, -8], foreR: [-62, 0, 0], handR: [10, 0, 0] }],
  ],
  { ground: false, loop: true }
);
