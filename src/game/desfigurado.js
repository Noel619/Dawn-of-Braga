// El Desfigurado, en la luz de la cloaca (su cuerpo: entities/desfigurado.js;
// su sitio: world/cloaca.js).
//
//  - En la luz, de pie, mirando al cielo por el agujero de la casa quemada.
//    Si andas cerca, le oyes murmurar («Hermosa...»). Si te acercas mucho, te
//    pide, sin volverse, que no le tapes la luz.
//  - Al hablarle se vuelve hacia ti (y le ves la otra mitad de la cara): la
//    primera vez te cuenta lo suyo en dos tandas y te da una flor blanca;
//    la segunda, lo de la peste (y se ríe sin saber de qué); luego, cada vez,
//    una de sus cosas. Si te vas, se vuelve a la luz (y te dice adiós).
//  - Los resquicios de la locura: los respingos de la cabeza, la mano mala
//    que se le va a la cara hinchada, la risa.
//
// Banderas: desf:visto (ya te ha pedido que no tapes la luz), desf:met (te
// ha contado lo suyo; la flor), desf:peste.
import * as THREE from 'three';
import { DIALOG } from './story.js';
import { CLOACA } from '../world/cloaca.js';
import { approachAngle, damp, clamp } from '../core/util.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];

export class DesfiguradoQuest {
  constructor(g) {
    this.g = g;
    this.npc = g.enemies.find((e) => e.type === 'desfigurado') || null;
    this.talkIt = g.interact.list.find((i) => i.id === 't_desfigurado');
    this._hOff = new THREE.Vector3(0, 0.42, 0);
    this.who = {
      id: 'desfigurado',
      name: 'El Desfigurado',
      voice: 'npcTalk',
      pitch: 0.72,
      head: (out) => (this.npc ? this.npc.rig.worldPos('head', out, this._hOff) : out.set(CLOACA.desfigurado.x, CLOACA.isla.y + 1.9, CLOACA.desfigurado.z)),
    };
    this.reset();
  }

  get F() {
    return this.g.flags;
  }

  reset() {
    this.script = null;
    this.mode = 'cielo';
    this.mt = 0;
    this.awayT = 0;
    this.murT = 3;
    this.ticT = 4 + Math.random() * 6;
    this.caraT = 10 + Math.random() * 8;
    this.tic = 0;
    this.cara = 0;
    this.caraOn = 0;
    this.risa = 0;
    this.risaOn = 0;
    this.look = 0;
    this.talkK = 0;
    this.W = { cielo: 1, vuelto: 0 };
    this.locoK = Math.floor(Math.random() * DIALOG.desfLoco.length);
    this.dijoAdios = true;
  }

  // ------------------------------------------------------------ cada fotograma
  update(dt) {
    this.updateScript();
    const it = this.talkIt,
      e = this.npc;
    if (it) it.hidden = !this.canTalk();
    if (it && e) {
      it.x = e.pos.x;
      it.y = e.pos.y;
      it.z = e.pos.z;
    }
  }

  // A su sitio (al descansar, al morir, al cargar): en la luz, mirando arriba;
  // el cayado, apoyado en el pilar (no en la mano).
  npcReset(e) {
    const D = CLOACA.desfigurado;
    e.body.pos.set(D.x, CLOACA.isla.y, D.z);
    e.yaw = D.yaw;
    e.state = 'dormant';
    e.idle = 'cielo';
    for (const m of e.rig.meshes) if (m.userData.grp === 'cayado') m.visible = false;
    this.reset();
    e.data = { W: { cielo: 1 } };
  }

  // Lo que hace en cada momento (lo llama su tipo).
  npcAI(e, dt, player) {
    const g = this.g;
    this.mt += dt;
    e.stT += dt;
    e.state = 'dormant';
    e.idle = 'cielo';
    const dx = player.pos.x - e.pos.x,
      dz = player.pos.z - e.pos.z;
    const d = Math.hypot(dx, dz);
    const cerca = d < 10 && Math.abs(player.pos.y - e.pos.y) < 3 && !player.dead;
    const talking = g.speech && g.speech.busy(this.who);
    const D = CLOACA.desfigurado;
    if (this.mode === 'cielo') {
      // en la luz: vuelve a su sitio de mirar
      e.yaw = approachAngle(e.yaw, D.yaw, 0.8 * dt);
      // lo que murmura para sí, si andas cerca (y no habla ya)
      this.murT -= dt;
      if (cerca && this.murT <= 0 && !talking) {
        this.murT = 7 + Math.random() * 6;
        g.speech.say(this.who, pick(DIALOG.desfMurmura), { dur: 2.6 });
      }
      // te nota: sin volverse, que no le tapes la luz (una vez)
      if (cerca && d < 4.2 && !this.F['desf:visto']) {
        this.F['desf:visto'] = true;
        g.speech.say(this.who, DIALOG.desfVe, { dur: 3.6 });
        this.tic = 1;
        this.ticSide = 1;
      }
    } else {
      // vuelto: de cara a ti (todo el cuerpo, despacio, como le cuesta)
      e.yaw = approachAngle(e.yaw, Math.atan2(dx, dz), (talking ? 1.6 : 0.9) * dt);
      this.awayT = cerca && d < 6.5 ? 0 : this.awayT + dt;
      if (!this.script && !talking && this.awayT > 3.5) {
        this.mode = 'cielo';
        this.mt = 0;
        if (!this.dijoAdios) {
          this.dijoAdios = true;
          if (cerca) g.speech.say(this.who, pick(DIALOG.desfAdios), { dur: 3.2 });
        }
      }
    }
    // los pesos de las posturas, suavizados
    const want = this.mode === 'cielo' ? { cielo: 1, vuelto: 0 } : { cielo: 0, vuelto: 1 };
    for (const k in want) this.W[k] = damp(this.W[k] ?? 0, want[k], 1.6, dt);
    // la cabeza hacia ti: cuando habla contigo (no cuando mira arriba)
    const wantLook = this.mode === 'vuelto' ? 1 : 0;
    this.look = damp(this.look, wantLook, 2.2, dt);
    let rel = Math.atan2(dx, dz) - e.yaw;
    while (rel > Math.PI) rel -= Math.PI * 2;
    while (rel < -Math.PI) rel += Math.PI * 2;
    rel = clamp(rel, -1.2, 1.2);
    // hablar
    this.talkK = damp(this.talkK, talking && this.mode === 'vuelto' ? 1 : talking ? 0.35 : 0, 6, dt);
    // los respingos (más a menudo cuando habla de la peste)
    this.ticT -= dt * (this.script && this.script.peste ? 2.2 : 1);
    if (this.ticT <= 0) {
      this.ticT = 6 + Math.random() * 9;
      this.tic = 1;
      this.ticSide = Math.random() < 0.5 ? -1 : 1;
    }
    if (this.tic > 0) this.tic = Math.max(0, this.tic - dt / 0.38);
    // la mano mala a la cara (se rasca la mejilla hinchada), a ratos
    this.caraT -= dt;
    if (this.caraT <= 0) {
      this.caraT = 14 + Math.random() * 12;
      this.caraOn = 2.6;
    }
    if (this.caraOn > 0) this.caraOn -= dt;
    this.cara = damp(this.cara, this.caraOn > 0 ? 1 : 0, 3, dt);
    // la risa
    if (this.risaOn > 0) this.risaOn -= dt;
    this.risa = damp(this.risa, this.risaOn > 0 ? 1 : 0, 5, dt);
    e.data = {
      W: { cielo: this.W.cielo, vuelto: this.W.vuelto },
      look: [rel, this.look],
      talk: this.talkK,
      tic: this.tic > 0 ? 1 - this.tic : 0,
      ticSide: this.ticSide || 1,
      cara: this.cara,
      risa: this.risa,
    };
    e.vx = e.vz = 0;
    e.animate(dt);
  }

  // ------------------------------------------------------------ hablar
  canTalk() {
    const e = this.npc;
    return !!e && e.obj.visible && !e.scripted;
  }
  // Un guion de pasos: { say: [...] }, { fn }, { risa }.
  run(steps, o = {}) {
    this.script = { steps: steps.slice(), cur: null, ...o };
  }
  updateScript() {
    const S = this.script;
    const g = this.g;
    if (!S || g.ui.modal) return;
    if (S.cur && S.cur.say && g.speech.busy(this.who)) return;
    S.cur = null;
    const st = S.steps.shift();
    if (!st) {
      this.script = null;
      return;
    }
    S.cur = st;
    if (st.say) g.speech.queue(this.who, st.say);
    if (st.risa) this.risaOn = st.risa;
    if (st.fn) st.fn();
  }
  talk() {
    const g = this.g;
    if (this.script) {
      g.speech.skip(this.who);
      return;
    }
    if (!this.canTalk()) return;
    this.mode = 'vuelto';
    this.mt = 0;
    this.awayT = 0;
    this.dijoAdios = false;
    this.F['desf:visto'] = true;
    if (!this.F['desf:met'])
      this.run([
        { say: DIALOG.desfMeet },
        { say: DIALOG.desfMeet2.slice(0, 3) },
        {
          fn: () => {
            this.F['desf:met'] = true;
            this.caraOn = 0;
          },
        },
        { say: DIALOG.desfMeet2.slice(3) },
        {
          fn: () => {
            if (!g.inventory.has('flor_blanca')) g.later(350, () => g.giveItem('flor_blanca'));
            g.saveGame && g.saveGame();
          },
        },
      ]);
    else if (!this.F['desf:peste'])
      this.run(
        [
          { say: DIALOG.desfPeste.slice(0, 2) },
          { say: DIALOG.desfPeste.slice(2), risa: 3.2 },
          {
            fn: () => {
              this.F['desf:peste'] = true;
              g.saveGame && g.saveGame();
            },
          },
        ],
        { peste: true }
      );
    else {
      const L = DIALOG.desfLoco;
      const line = L[this.locoK++ % L.length];
      this.run([{ say: line, risa: line[0].startsWith('¿Lo oyes') ? 0 : Math.random() < 0.2 ? 1.6 : 0 }]);
    }
  }

  // ------------------------------------------------------------ partida
  applyFlags() {
    if (this.npc) this.npcReset(this.npc);
    else this.reset();
  }
  onRespawn() {
    this.g.speech && this.g.speech.hush(this.who);
    if (this.npc) this.npcReset(this.npc);
    else this.reset();
  }
}
