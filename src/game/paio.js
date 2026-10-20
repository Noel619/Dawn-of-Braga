// Dom Paio, el canónigo que bajó tras el arzobispo (su cuerpo y su pelea:
// entities/paio.js; la cripta honda: world/level_crypt2.js).
//
//  1. En la capilla de San Martín, de rodillas a los pies del sepulcro del
//     santo, reza con una vela. Al verte se levanta de un salto («¡Atrás!»);
//     al hablarle te cuenta lo que pasó y, cada vez que vuelves, lo que le
//     falta a la puerta (lo que no lleves hecho).
//  2. Caídos los Velados, ya no está: en la capilla queda su breviario. El
//     dios le llamó por su nombre y bajó al pozo a guardar la cadena de la
//     Pila de los Condenados.
//  3. En el pozo, convertido (un jefe): despierta cuando bajas y, mientras
//     siga en pie, no se puede echar la cadena (ver game/interact.js).
//
// Banderas: paio:met (ya te ha contado lo que pasó), paio:gone (ya no está en
// la capilla) y boss:paioHollow.
import * as THREE from 'three';
import { DEEP } from '../world/level_crypt2.js';
import { DIALOG } from './story.js';
import { PAIO_CLIPS, PAIO_TALK } from '../entities/paio.js';
import { approachAngle } from '../core/util.js';

const V3 = THREE.Vector3;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const CH = DEEP.chapel;
// dónde reza: a los pies del sepulcro del santo, de espaldas a la nave
export const PAIO_POST = { x: DEEP.paio.x, y: CH.y, z: DEEP.paio.z, yaw: Math.PI };
// la vela, en la mano (para su luz)
const CANDLE = new V3(0, -0.06, 0.25);
// lo que le falta a la puerta, por orden
const HINTS = [
  ['garra', (F, g) => !F['take:i_garra'] && !g.inventory.has('garra')],
  ['oeste', (F) => !F['lever:p_pila_oeste']],
  ['este', (F) => !F['lever:p_pila_este']],
  ['incienso', (F, g) => !F['take:i_incienso'] && !g.inventory.has('incienso')],
  ['velados', (F) => !F['boss:guardianes']],
];

export class PaioQuest {
  constructor(g) {
    this.g = g;
    this.npc = g.enemies.find((e) => e.type === 'paio') || null;
    this.hollow = g.bosses.paioHollow || null;
    this.talkIt = g.interact.list.find((i) => i.id === 't_paio');
    this.book = g.interact.list.find((i) => i.id === 'n_paio');
    this._hOff = new V3(0, 0.45, 0);
    this._v = new V3();
    this.who = {
      id: 'paio',
      name: 'Dom Paio',
      voice: 'npcTalk',
      pitch: 0.86,
      head: (out) => (this.npc ? this.npc.rig.worldPos('head', out, this._hOff) : out.set(PAIO_POST.x, PAIO_POST.y + 1.6, PAIO_POST.z)),
    };
    this.script = null;
    this.mode = 'pray';
    this.mt = 0;
    this.awayT = 0;
    this.prayT = 3;
    this.hintK = 0;
  }

  get F() {
    return this.g.flags;
  }
  gone() {
    return !!this.F['paio:gone'];
  }

  // ------------------------------------------------------------ cada fotograma
  update(dt) {
    const g = this.g;
    const e = this.npc;
    // caídos los Velados, se va (cuando no le ves: no hay nadie cerca)
    if (e && !this.gone() && this.F['boss:guardianes'] && !e.scripted) {
      const d = Math.hypot(g.player.pos.x - e.pos.x, g.player.pos.z - e.pos.z);
      if (d > 16 || Math.abs(g.player.pos.y - e.pos.y) > 3) this.leave();
    }
    this.updateScript(dt);
    // el interactuable de hablar le sigue
    const it = this.talkIt;
    if (it && e) {
      it.hidden = !this.canTalk();
      it.x = e.pos.x;
      it.y = e.pos.y;
      it.z = e.pos.z;
    }
    // su breviario, en la capilla, cuando ya no está
    const b = this.book;
    if (b) {
      b.hidden = !this.gone();
      if (b.obj) b.obj.visible = !b.hidden;
    }
    // la vela
    if (e && e.P.light) {
      const lt = e.P.light;
      const on = e.obj.visible && !e.scripted;
      if (on) {
        const c = e.rig.worldPos('handL', this._v, CANDLE);
        lt.x = c.x;
        lt.y = c.y + 0.15;
        lt.z = c.z;
      }
      const want = on ? 1.2 * (1 + Math.sin(g.time * 13) * 0.06) : 0;
      lt.intensity += (want - lt.intensity) * Math.min(1, dt * 5);
    }
    // convertido, en el pozo: despierta cuando bajas a él
    const h = this.hollow;
    if (h && !h.dead && h.state === 'bossIdle' && !this.F['boss:paioHollow'] && !g.activeBoss && !g.player.dead) {
      const P = DEEP.pozo,
        p = g.player.pos;
      if (p.x > P.x0 && p.x < P.x1 && p.z > P.z0 && p.z < P.z1 - 1.2 && p.y < DEEP.DY - 2) g.startBoss(h);
    }
  }

  // Se va al pozo: desaparece de la capilla (queda su breviario).
  leave() {
    this.F['paio:gone'] = true;
    const e = this.npc;
    this.script = null;
    this.g.speech && this.g.speech.hush(this.who);
    if (e) this.hide(e);
  }
  hide(e) {
    e.scripted = true;
    e.obj.visible = false;
    e.shadow.visible = false;
    e.vx = e.vz = 0;
  }

  // ------------------------------------------------------------ su cuerpo
  // Al volver a su sitio (al descansar, al morir): de rodillas, rezando.
  npcReset(e) {
    e.body.pos.set(PAIO_POST.x, PAIO_POST.y, PAIO_POST.z);
    e.yaw = PAIO_POST.yaw;
    e.state = 'dormant';
    e.idle = 'pray';
    this.mode = 'pray';
    this.mt = 0;
    this.script = null;
    if (this.gone()) this.hide(e);
  }
  // Lo que hace en cada momento (lo llama su tipo: entities/paio.js).
  npcAI(e, dt, player) {
    const g = this.g;
    this.mt += dt;
    e.stT += dt;
    const dx = player.pos.x - e.pos.x,
      dz = player.pos.z - e.pos.z;
    const d = Math.hypot(dx, dz);
    const near = d < 7 && Math.abs(player.pos.y - e.pos.y) < 2;
    const talking = g.speech && g.speech.busy(this.who);
    const look = (k) => (e.yaw = approachAngle(e.yaw, Math.atan2(dx, dz), k * dt));
    e.state = 'dormant';
    if (this.mode === 'pray') {
      e.idle = 'pray';
      e.yaw = approachAngle(e.yaw, PAIO_POST.yaw, 2 * dt);
      // reza en voz baja (si estás cerca)
      this.prayT -= dt;
      if (this.prayT <= 0 && d < 14 && Math.abs(player.pos.y - e.pos.y) < 3) {
        this.prayT = 6 + Math.random() * 4;
        if (!talking) g.speech.say(this.who, pick(DIALOG.paioPray), { dur: 2.6 });
      }
      // te ve (o le hablas): se levanta de un salto
      if (near && !player.dead) this.startle(e);
    } else if (this.mode === 'rise') {
      e.idle = 'cower';
      look(3);
      if (this.mt > PAIO_CLIPS.rise.dur) this.setMode('cower');
    } else {
      // de pie: te sigue con la mirada; asustado hasta que le hablas
      e.idle = this.F['paio:met'] || this.mode === 'stand' ? 'stand' : 'cower';
      if (near || talking) look(talking ? 5 : 2.5);
      // si te vas, vuelve a rezar
      this.awayT = near || talking || this.script ? 0 : this.awayT + dt;
      if (this.awayT > 9) {
        this.setMode('pray');
        e.anim.play(PAIO_CLIPS.kneel, { blend: 0.25 });
      }
    }
    e.vx = e.vz = 0;
    e.animate(dt);
  }
  setMode(m) {
    this.mode = m;
    this.mt = 0;
    this.awayT = 0;
  }
  startle(e) {
    if (this.mode !== 'pray') return;
    this.setMode('rise');
    e.anim.play(PAIO_CLIPS.rise, { blend: 0.2 });
    const g = this.g;
    if (!this.F['paio:met']) g.speech.say(this.who, DIALOG.paioSee, { dur: 3 });
  }

  // ------------------------------------------------------------ hablar
  canTalk() {
    const e = this.npc;
    return !!e && !this.gone() && !e.scripted && e.obj.visible && this.mode !== 'rise';
  }
  // Un guion de pasos: { say: [...] }, { fn }.
  run(steps) {
    this.script = { steps: steps.slice(), cur: null };
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
    if (st.say) {
      g.speech.queue(this.who, st.say);
      if (this.npc) this.npc.anim.play(st.clip || pick(PAIO_TALK), { blend: 0.25 });
    }
    if (st.fn) st.fn();
  }
  // Hablar con él (el interactuable que le sigue).
  talk() {
    const g = this.g;
    if (this.script) {
      g.speech.skip(this.who);
      return;
    }
    const e = this.npc;
    if (!e) return;
    if (this.mode === 'pray') {
      this.startle(e);
      return;
    }
    this.setMode('stand');
    if (!this.F['paio:met'])
      this.run([
        { say: DIALOG.paioMeet, clip: PAIO_TALK[1] },
        { say: DIALOG.paioMeet2, clip: PAIO_TALK[0] },
        { fn: () => (this.F['paio:met'] = true) },
        { say: this.hint(), clip: PAIO_TALK[2] },
      ]);
    else this.run([{ say: this.hint(), clip: PAIO_TALK[2] }]);
  }
  // Lo siguiente que le falta a la puerta (cada vez, el siguiente de lo que
  // falte); si no falta nada, que se queda.
  hint() {
    const g = this.g;
    const miss = HINTS.filter(([, f]) => f(this.F, g)).map(([k]) => k);
    if (!miss.length) return DIALOG.paioRest;
    const k = miss[this.hintK++ % miss.length];
    return [...DIALOG.paioHint[k], ...(this.hintK % 3 === 0 ? [pick(DIALOG.paioRest)] : [])];
  }

  // Al cargar una partida: en su sitio (o ya en el pozo).
  applyFlags() {
    this.script = null;
    if (this.npc) this.npcReset(this.npc);
  }
  onRespawn() {
    this.script = null;
    this.g.speech && this.g.speech.hush(this.who);
    if (this.npc && this.gone()) this.hide(this.npc);
  }
}
