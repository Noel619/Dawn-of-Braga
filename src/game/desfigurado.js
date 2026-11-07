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
//  - Tras conocerle, la vez siguiente que bajas (al volver de arriba, al
//    descansar, al cargar) ya no está en la luz: está en su botica del
//    Vergel, buscando su cura: muele en el mortero, lee su cuaderno, se pone
//    el emplasto en la mejilla mala y, a ratos, mira arriba, a la reja de la
//    calle. Lo que cuenta entonces, por orden: su teoría (la vida no se
//    murió: se escondió aquí abajo), la cura que busca (y te da una raíz),
//    lo de la peste y su miedo a lo oscuro que entra por las catacumbas.
//
// Banderas: desf:visto (ya te ha pedido que no tapes la luz), desf:met (te
// ha contado lo suyo; la flor), desf:vida, desf:cura (la raíz), desf:peste,
// desf:oscuro.
import * as THREE from 'three';
import { DIALOG } from './story.js';
import { CLOACA } from '../world/cloaca.js';
import { VERGEL } from '../world/vergel.js';
import { approachAngle, damp, clamp } from '../core/util.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const seg = (t, a, b) => sm((t - a) / (b - a));
const V3 = THREE.Vector3;
// la llegada: la primera vez que se pisa el rellano de la sala, la cámara se
// aparta del jugador y baja despacio hasta la luz y él (dur, s): desde la
// boca de la galería, mirando al haz (A, LA), por encima del pretil y de la
// alberca (M), hasta el norte de la isla, entre los pilares, a la altura de
// su cara: de perfil, el lado sano, que mira arriba en la luz (B, LB). (La
// curva pasa por M a medio camino.)
const LLEGADA = { dur: 8.0, A: [-15.4, -3.4, 8.9], M: [-11.0, -3.3, 10.9], B: [-8.05, -6.85, 13.4], LA: [-8.4, -5.4, 18.2], LB: [-8.25, -6.65, 18.3] };
// (el punto de control de la curva: para que pase por M en s = 0,5)
const LL_C = LLEGADA.M.map((m, i) => 2 * m - 0.5 * (LLEGADA.A[i] + LLEGADA.B[i]));

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
    this.W = { cielo: 1, vuelto: 0, moler: 0, leer: 0, untar: 0 };
    // (en la botica: lo que hace y cuánto le queda)
    this.faena = 'moler';
    this.faenaT = 8 + Math.random() * 6;
    this.locoK = Math.floor(Math.random() * DIALOG.desfLoco.length);
    this.dijoAdios = true;
  }

  // ------------------------------------------------------------ cada fotograma
  update(dt) {
    this.updateLlegada(dt);
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

  // La llegada (una vez): la toma de la luz y él, con sus franjas; el jugador,
  // quieto en el rellano; a media toma, él: «Hermosa...».
  updateLlegada(dt) {
    const g = this.g,
      p = g.player;
    if (!this.rev) {
      if (this.F['desf:llegada'] || g.state !== 'play' || p.dead || g.climb || g.cine || !this.npc) return;
      const R = CLOACA.sala.rellano;
      const y = CLOACA.tunel.y;
      if (p.pos.x > R[0] && p.pos.x < R[2] && p.pos.z > R[1] - 0.3 && p.pos.z < R[3] && Math.abs(p.pos.y - y) < 0.6) {
        this.F['desf:llegada'] = true;
        this.rev = { t: 0, pos: new V3(), look: new V3() };
        p.state = 'cine';
        p.vx = p.vz = 0;
        p.autoDir = null;
        g.lockTarget = null;
      }
      return;
    }
    const L = LLEGADA;
    const t = (this.rev.t += dt);
    g.post.U.uBars.value = 0.11 * Math.min(seg(t, 0, 0.7), 1 - seg(t, L.dur - 0.7, L.dur));
    const s = seg(t, 0.2, L.dur - 0.3);
    const r = this.rev;
    const q = (i) => (1 - s) * (1 - s) * L.A[i] + 2 * s * (1 - s) * LL_C[i] + s * s * L.B[i];
    r.pos.set(q(0), q(1), q(2));
    r.look.set(L.LA[0] + (L.LB[0] - L.LA[0]) * s, L.LA[1] + (L.LB[1] - L.LA[1]) * s, L.LA[2] + (L.LB[2] - L.LA[2]) * s);
    g.camRig.override = { pos: r.pos, look: r.look, fov: 50 - 16 * s, snap: true };
    if (!r.dijo && t > 3.4) {
      r.dijo = true;
      g.speech.say(this.who, 'Hermosa...', { dur: 3.0 });
    }
    if (t >= L.dur || p.dead) this.finLlegada();
  }
  finLlegada() {
    const g = this.g,
      p = g.player;
    this.rev = null;
    g.post.U.uBars.value = 0;
    g.camRig.override = null;
    g.camRig.snapTo(p);
    g.camera.fov = g.camRig.fovBase;
    g.camera.updateProjectionMatrix();
    if (p.state === 'cine') p.state = 'free';
  }

  // A su sitio (al descansar, al morir, al cargar): en la luz, mirando arriba;
  // el cayado, apoyado en el pilar (no en la mano).
  npcReset(e) {
    this.reset();
    this.lugar(e, this.F['desf:met'] ? 'botica' : 'luz');
    e.state = 'dormant';
    for (const m of e.rig.meshes) if (m.userData.grp === 'cayado' || m.userData.grp === 'trapo') m.visible = false;
    this._trapo = false;
  }
  // A un sitio: la luz (de pie en la isla, mirando arriba) o su botica (ante
  // la mesa, faenando).
  lugar(e, sitio) {
    this.sitio = sitio;
    if (sitio === 'botica') {
      const D = VERGEL.desfigurado;
      e.body.pos.set(D.x, VERGEL.y, D.z);
      e.yaw = D.yaw;
      e.idle = 'moler';
      this.mode = 'faena';
      this.W = { cielo: 0, vuelto: 0, moler: 1, leer: 0, untar: 0 };
      e.data = { W: { moler: 1 } };
    } else {
      const D = CLOACA.desfigurado;
      e.body.pos.set(D.x, CLOACA.isla.y, D.z);
      e.yaw = D.yaw;
      e.idle = 'cielo';
      this.mode = 'cielo';
      this.W = { cielo: 1, vuelto: 0, moler: 0, leer: 0, untar: 0 };
      e.data = { W: { cielo: 1 } };
    }
    e.vx = e.vz = 0;
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
    // (ya te ha contado lo suyo: cuando te has ido de la cloaca, se baja a su
    // botica; no se le ve ir)
    if (this.sitio === 'luz' && this.F['desf:met'] && !this.script && !talking && !g.inCloaca(player.pos)) this.lugar(e, 'botica');
    const D = this.sitio === 'botica' ? VERGEL.desfigurado : CLOACA.desfigurado;
    if (this.mode === 'faena') {
      // en la botica: ante su mesa, a lo suyo; cada rato, otra cosa (moler,
      // leer el cuaderno, ponerse el emplasto, mirar arriba)
      e.yaw = approachAngle(e.yaw, D.yaw, 0.8 * dt);
      this.faenaT -= dt;
      if (this.faenaT <= 0) {
        const next = { moler: ['leer', 'untar', 'cielo'], leer: ['moler', 'moler', 'untar'], untar: ['moler', 'leer'], cielo: ['moler', 'leer'] }[this.faena] || ['moler'];
        this.faena = pick(next);
        this.faenaT = this.faena === 'cielo' ? 4 + Math.random() * 3 : this.faena === 'untar' ? 5 + Math.random() * 3 : 9 + Math.random() * 8;
        if (this.faena === 'untar') this.caraOn = 0;
      }
      this.murT -= dt;
      if (cerca && this.murT <= 0 && !talking) {
        this.murT = 8 + Math.random() * 7;
        g.speech.say(this.who, pick(DIALOG.desfMurmuraBotica), { dur: 2.6 });
      }
    } else if (this.mode === 'cielo') {
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
        this.mode = this.sitio === 'botica' ? 'faena' : 'cielo';
        this.mt = 0;
        if (!this.dijoAdios) {
          this.dijoAdios = true;
          if (cerca) g.speech.say(this.who, pick(DIALOG.desfAdios), { dur: 3.2 });
        }
      }
    }
    // los pesos de las posturas, suavizados
    const want = { cielo: 0, vuelto: 0, moler: 0, leer: 0, untar: 0 };
    if (this.mode === 'cielo') want.cielo = 1;
    else if (this.mode === 'faena') want[this.faena] = 1;
    else want.vuelto = 1;
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
    if (this.caraT <= 0 && !(this.mode === 'faena' && this.faena === 'untar')) {
      this.caraT = 14 + Math.random() * 12;
      this.caraOn = 2.6;
    }
    if (this.caraOn > 0) this.caraOn -= dt;
    this.cara = damp(this.cara, this.caraOn > 0 ? 1 : 0, 3, dt);
    // la risa
    if (this.risaOn > 0) this.risaOn -= dt;
    this.risa = damp(this.risa, this.risaOn > 0 ? 1 : 0, 5, dt);
    // (el trapo del emplasto, en la mano mala, sólo mientras se lo pone)
    const trapo = this.W.untar > 0.35;
    if (trapo !== this._trapo) {
      this._trapo = trapo;
      for (const m of e.rig.meshes) if (m.userData.grp === 'trapo') m.visible = trapo;
    }
    e.data = {
      W: { cielo: this.W.cielo, vuelto: this.W.vuelto, moler: this.W.moler, leer: this.W.leer, untar: this.W.untar },
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
        { say: DIALOG.desfMeet2.slice(3, 4) },
        {
          fn: () => {
            if (!g.inventory.has('flor_blanca')) g.giveItem('flor_blanca');
            g.saveGame && g.saveGame();
          },
        },
        // (y, cerrado lo de la flor, adónde seguir el agua)
        { say: DIALOG.desfMeet2.slice(4) },
      ]);
    else if (!this.F['desf:vida'])
      this.run([
        { say: DIALOG.desfVida.slice(0, 2) },
        { say: DIALOG.desfVida.slice(2) },
        {
          fn: () => {
            this.F['desf:vida'] = true;
            g.saveGame && g.saveGame();
          },
        },
      ]);
    else if (!this.F['desf:cura'])
      this.run([
        { say: DIALOG.desfCura.slice(0, 2) },
        { say: DIALOG.desfCura.slice(2) },
        {
          fn: () => {
            // (no la raíz que daba vida: un cocimiento de los suyos, y su mesa
            // para cocer más con lo que se traiga de lo hondo: game/alquimia.js)
            this.F['desf:cura'] = true;
            this.F['desf:cocimientos'] = true;
            if (g.inventory.count('cocimiento_verde') < 3) g.giveItem('cocimiento_verde');
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
    else if (!this.F['desf:oscuro'])
      this.run(
        [
          { say: DIALOG.desfOscuro.slice(0, 2) },
          { say: DIALOG.desfOscuro.slice(2) },
          {
            fn: () => {
              this.F['desf:oscuro'] = true;
              g.saveGame && g.saveGame();
            },
          },
        ],
        { peste: true }
      );
    else if (!this.F['desf:llave'])
      // (la llave de la reja de la galería de la Sé: se la da, a su pesar)
      this.run(
        [
          { say: DIALOG.desfLlave.slice(0, 2) },
          {
            fn: () => {
              this.F['desf:llave'] = true;
              if (!g.inventory.has('llave_reja')) g.giveItem('llave_reja');
              g.saveGame && g.saveGame();
            },
          },
          { say: DIALOG.desfLlave.slice(2) },
        ],
        { peste: true }
      );
    else if (g.flags['boss:lobishome'] && !this.F['desf:lobo'])
      // vencido el Lobishome: quién era
      this.run([
        { say: DIALOG.desfLobo.slice(0, 2) },
        { say: DIALOG.desfLobo.slice(2, 4) },
        {
          fn: () => {
            this.F['desf:lobo'] = true;
            g.saveGame && g.saveGame();
          },
        },
        { say: DIALOG.desfLobo.slice(4) },
      ]);
    else {
      // (de vez en cuando, cómo se cuecen los cocimientos)
      if (this.locoK % 3 === 2 && this.F['desf:cocimientos']) {
        this.locoK++;
        this.run([{ say: DIALOG.desfCocer }]);
        return;
      }
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
    if (this.rev) this.finLlegada();
    this.g.speech && this.g.speech.hush(this.who);
    if (this.npc) this.npcReset(this.npc);
    else this.reset();
  }
}
