// La Corte de los Infieles (PLAN_CASTILLO.md, §8): no un jefe, la corte
// entera. Veintidós cortesanos de rodillas en dos filas ante el trono vacío,
// y al pie del estrado el mayordomo (las veintitrés puñaladas de César).
//
// Al pisar el estrado, la puerta del servicio se cierra de golpe y empieza el
// tambor. Se levantan de uno en uno, en el orden en que estaban, y te rodean.
// El compás manda: en cada golpe ataca uno solo, el que el compás señala, que
// alza el cuchillo un tiempo antes (se ve venir) y te lo clava en el golpe
// siguiente; los demás cierran el corro con los cuchillos en alto. Tres
// oleadas (siete, ocho y siete), cada una más deprisa; si te sales del corro
// (una voltereta, una carrera), se deshace unos tiempos mientras te vuelven a
// rodear. Callado el tambor, el mayordomo, solo. Cae y se acaba: se abre la
// puerta del servicio, las puertas grandes se desatrancan desde dentro (el
// atajo al patio) y su llave queda en el suelo.
//
// Si mueres, vuelven a sus sitios, de rodillas. Vencidos, sus cuerpos se
// quedan en la sala (e.spec.story: 'corte:vencida').
import { MSG } from './story.js';
import { PACO } from '../world/level_paco.js';
import { approachAngle, damp } from '../core/util.js';

const OLAS = [7, 8, 7];
// (segundos por golpe en cada oleada)
const TEMPO = [0.92, 0.78, 0.66];
// (cuánto antes del golpe arranca la puñalada: su golpe entra a los 0,42 s)
const LEAD = 0.42;

export class Corte {
  constructor(game) {
    this.g = game;
    this.list = game.enemies.filter((e) => e.type === 'cortesano').sort((a, b) => a.spec.orden - b.spec.orden);
    this.may = game.enemies.find((e) => e.type === 'mayordomo') || null;
    this.reset();
  }

  reset() {
    this.camAng = undefined;
    this.state = 'idle';
    this.t = 0;
    this.ola = -1;
    this.next = 0;
    this.queue = [];
    this.marked = null;
    this.turn = 0;
    this.rest = 0;
    this.rot = 0;
    this.silence = 0;
  }

  get won() {
    return !!this.g.flags['corte:vencida'];
  }

  // ¿Sobre el estrado? (lo que la despierta)
  enEstrado(p) {
    const Sa = PACO.sala;
    return p.x > Sa.x0 + Sa.t && p.x < Sa.estrado && p.z > Sa.z0 + Sa.t && p.z < Sa.z1 - Sa.t && p.y > Sa.y + 0.2 && p.y < Sa.y + 3;
  }

  servicio() {
    return this.g.interact.list.find((i) => i.id === 'd_servicio');
  }

  // Al principio de la partida o al cargarla.
  applyFlags() {
    this.reset();
    if (this.won) this.state = 'won';
  }

  // El jugador ha muerto: todos vuelven a sus sitios (los vuelve a poner el
  // juego, como a todos) y la puerta del servicio, abierta.
  onRespawn() {
    if (this.won) return;
    if (this.state === 'fight') this.openService();
    this.reset();
  }

  openService() {
    const g = this.g;
    const sv = this.servicio();
    if (!sv) return;
    if (sv.lock0) sv.lock = sv.lock0;
    sv.lock0 = null;
    g.interact.setOpen(sv, true);
    g.flags['door:' + sv.id] = true;
  }

  // Golpeado alguno de rodillas antes de tiempo: se levanta la corte entera.
  // (y si ya peleaban, ése se suma al corro sin esperar a su oleada)
  provoked(e) {
    if (this.state === 'idle' && !this.won) this.start();
    if (this.state === 'fight' && e && e.type === 'cortesano' && !e.data.corte) {
      e.data.corte = true;
      this.queue = this.queue.filter((q) => q !== e);
    }
  }

  start() {
    const g = this.g;
    if (!this.list.length) return;
    this.state = 'fight';
    this.t = 0;
    this.next = 0.8;
    this.ola = 0;
    this.queue = this.wave(0);
    this.turn = 0;
    // la puerta del servicio, de golpe, y atrancada (no se abre ni de un lado
    // ni del otro mientras dure)
    const sv = this.servicio();
    if (sv) {
      if (sv.done) g.interact.slamShut(sv);
      sv.lock0 = sv.lock0 || sv.lock;
      sv.lock = { type: 'barred', side: 0 };
      sv.barredMsg = 'corteCerrada';
      g.audio && g.audio.play('slam', { x: sv.x, y: sv.y, z: sv.z });
    }
    g.ui.area(MSG.corteArea);
    g.camRig.shake(0.3);
  }

  wave(i) {
    const a = OLAS.slice(0, i).reduce((s, n) => s + n, 0);
    return this.list.slice(a, a + OLAS[i]);
  }

  // los de la oleada que siguen en pie, ya levantados
  risen() {
    return this.list.filter((e) => !e.dead && e.data.corte && e.state !== 'rise');
  }

  update(dt) {
    if (this.state !== 'fight') {
      if (this.state === 'idle' && !this.won && this.list.length) {
        const p = this.g.player;
        if (!p.dead && this.enEstrado(p.pos)) this.start();
      }
      return;
    }
    const g = this.g,
      p = g.player;
    if (p.dead) return;
    this.t += dt;
    this.rot += dt * 0.24;
    if (this.ola < OLAS.length) {
      if (this.t >= this.next) this.onBeat();
      // el señalado: que su cuchillo caiga en el golpe
      const m = this.marked;
      if (m && (m.dead || m.state === 'hurt' || m.state === 'stagger' || m.state === 'parried')) {
        m.data.marked = false;
        this.marked = null;
      } else if (m && !m.data.struck && m.state === 'chase' && this.t >= this.next - LEAD) {
        const d = Math.hypot(m.pos.x - p.pos.x, m.pos.z - p.pos.z);
        if (d < 2.5) {
          m.data.struck = true;
          m.data.marked = false;
          m.startAttack(m.T.STAB);
          this.marked = null;
        }
      }
      // ¿acabada la oleada?
      const w = this.wave(this.ola);
      if (!this.queue.length && w.every((e) => e.dead)) {
        this.ola++;
        if (this.ola < OLAS.length) {
          this.queue = this.wave(this.ola);
          // (unos golpes de tambor sin nadie, y la siguiente)
          this.rest = 3;
        } else {
          // calla el tambor: el mayordomo, solo
          this.silence = 1.6;
          g.audio && g.audio.play('corteFin', p.pos);
        }
      }
    } else if (this.silence > 0) {
      this.silence -= dt;
      if (this.silence <= 0 && this.may && !this.may.dead) {
        this.may.data.corte = true;
        this.may.alert();
      }
    } else if (!this.may || this.may.dead) this.victory();
  }

  // Un golpe del tambor.
  onBeat() {
    const g = this.g,
      p = g.player;
    this.next += TEMPO[Math.min(this.ola, TEMPO.length - 1)];
    g.audio && g.audio.play('corteTambor', p.pos, { k: this.ola });
    // se levanta el siguiente (de uno en uno, en su orden)
    if (this.rest > 0) {
      this.rest--;
      return;
    }
    const nx = this.queue.shift();
    if (nx && !nx.dead) {
      nx.data.corte = true;
      nx.alert();
    }
    // el corro, deshecho (te saliste de él): unos tiempos sin golpes
    const up = this.risen();
    if (up.length >= 3) {
      let cx = 0,
        cz = 0;
      for (const e of up) {
        cx += e.pos.x;
        cz += e.pos.z;
      }
      cx /= up.length;
      cz /= up.length;
      if (Math.hypot(cx - p.pos.x, cz - p.pos.z) > 2.2) return;
    }
    // el que señala el compás (por turno, entre los que están en pie)
    if (this.marked) return;
    const ready = up.filter((e) => e.state === 'chase');
    if (!ready.length || up.length < 2) return;
    ready.sort((a, b) => a.spec.orden - b.spec.orden);
    const m = ready.find((e) => e.spec.orden > this.turn) || ready[0];
    this.turn = m.spec.orden;
    m.data.marked = true;
    m.data.struck = false;
    m.flare = 1;
    this.marked = m;
    g.audio && g.audio.play('corteMarca', m.pos);
  }

  // El corro: cada uno a su sitio alrededor del jugador, mirándole; el
  // señalado, más cerca. Deja un hueco del lado de la cámara (que no se le
  // metan delante), que gira despacio con ella. (Lo llama la IA de cada
  // cortesano: T.think.)
  think(e, player, d, dt) {
    if (this.state !== 'fight' || e.type !== 'cortesano') return null;
    const up = this.risen();
    const i = Math.max(0, up.indexOf(e)),
      n = Math.max(1, up.length);
    const cam = this.g.camera.position;
    const ca = Math.atan2(cam.x - player.pos.x, cam.z - player.pos.z);
    if (this.camAng === undefined || this.camT !== this.t) {
      this.camAng = this.camAng === undefined ? ca : this.camAng + Math.atan2(Math.sin(ca - this.camAng), Math.cos(ca - this.camAng)) * Math.min(1, dt * 1.6);
      this.camT = this.t;
    }
    const gap = 1.5;
    const ang = this.camAng + gap / 2 + ((i + 0.5) / n) * (Math.PI * 2 - gap) + Math.sin(this.rot) * 0.25;
    const R = e.data.marked ? 1.6 : 2.7 + Math.max(0, n - 7) * 0.12;
    const tx = player.pos.x + Math.sin(ang) * R,
      tz = player.pos.z + Math.cos(ang) * R;
    const dd = Math.hypot(tx - e.pos.x, tz - e.pos.z);
    if (dd > 0.35) e.chaseTo(tx, tz, dd > 3 ? e.T.run : e.T.walk, dt, player.pos.y);
    else {
      e.vx = damp(e.vx, 0, 8, dt);
      e.vz = damp(e.vz, 0, 8, dt);
    }
    e.yaw = approachAngle(e.yaw, e.angleTo(player.pos), (e.T.turn ?? 6) * dt);
    return 'handled';
  }

  victory() {
    const g = this.g;
    this.state = 'won';
    g.flags['corte:vencida'] = true;
    // la puerta del servicio, otra vez abierta; las grandes, desatrancadas
    // desde dentro: el atajo al patio
    this.openService();
    const sd = g.interact.list.find((i) => i.id === 'd_sala');
    if (sd && !sd.done) {
      g.interact.setOpen(sd);
      g.flags['door:' + sd.id] = true;
      g.audio && g.audio.play('bar', { x: sd.x, y: sd.y, z: sd.z });
    }
    g.later(1400, () => g.ui.area(MSG.corteVencida));
    g.saveGame();
  }
}
