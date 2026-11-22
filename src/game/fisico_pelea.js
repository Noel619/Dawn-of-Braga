// La pelea con el Físico, en su quirófano: tres tiempos, los de su aforismo
// (el de Hipócrates): lo que no curan las medicinas lo cura el hierro; lo que
// no cura el hierro, el fuego; y lo que el fuego no cura, hay que tenerlo por
// incurable.
//
//  1. Las medicinas: la vara (barre, pica, engancha), la esponja, el
//     sahumerio de beleño (una nube amarilla: dentro, todo va más lento) y la
//     campanilla, que llama a dos Coronados.
//  2. El hierro: a media vida se quita la máscara (debajo, la cara lavada y
//     el agujero de su trepanación, con su anillo de plata); la sierra, la
//     lanceta y el trépano (el agarrón: si te coge, te taladra).
//  3. El fuego: con un cuarto de vida va al brasero por los cauterios: donde
//     dan, prende la paja del suelo; y la cal a los ojos.
// Vencido, se sienta en su mesa y se toma el pulso (fisico_cine.js); en su
// cinto, la llave de la cordelería.
//
// Lo que hace en cada momento lo decide su cabeza (fisico_mente.js: una red
// pequeña, entrenada contra jugadores de prueba en tools/fisico_sim.mjs), con
// reflejos de persona, y lo que tiene apuntado de ti (la historia clínica:
// fisico_historia.js): barre hacia donde sueles rodar, retiene el golpe si te
// adelantas, amaga. Aquí se hace: andar, rodearte, apartarse, cada golpe.
// (pelea.antes = true: la manera de antes, para comparar: el motor elige los
// golpes a suertes.)
import * as THREE from 'three';
import { DIALOG } from './story.js';
import { FI_CLIPS, FI_ATTACKS, fiSay, fiGrp } from '../entities/fisico.js';
import { additiveFog } from '../gfx/materials.js';
import { getTexture } from '../gfx/textures.js';
import { damp, dampAngle, approachAngle, angleDiff, clamp, DEG } from '../core/util.js';
import { BR } from '../world/level_barrio.js';
import { Mente, Red, OP, OPCIONES, N_MOV, N_OUT, GOLPE_DE, AMAGA, DIST, RETIENE, AMAGO_EN, ENTRE_AMAGOS, PE, ALIENTO, respira, rumbo } from './fisico_mente.js';
import RED from './fisico_red.json';

// la sala grande de su casa (donde empieza la pelea: abierta hasta las
// cerchas, de ocho metros por dieciséis), el brasero, por dónde sale él (de
// las celdas de los furiosos; si se encerró herido, ya está en su mesa) y por
// dónde entran los que llama (por la misma puerta de las celdas)
const QUIR = { x0: BR.sala.x0 + 0.2, z0: BR.sala.z0 + 0.2, x1: BR.sala.x1 - 0.2, z1: BR.sala.z1 - 0.2 };
const BRASERO = { x: 63.6, z: 47.0, ante: [62.75, 46.35] };
const SALE = { x: 61.3, z: 50.2 };
export const EN_SU_MESA = { x: 60.2, z: 43.4 };
const LLAMADOS = ['e_coronado_llamado1', 'e_coronado_llamado2'];
const HUECO = { x: 61.3, z: 50.6 };
// la nube de beleño: radio, lo que dura, lo que frena
const NUBE = { r: 2.4, t: 9, lento: 0.55 };
// lo que arde a la vez (la paja del suelo)
const MAX_FUEGOS = 4;

const dentro = (r, p) => p.x > r.x0 && p.x < r.x1 && p.z > r.z0 && p.z < r.z1;
// (lo que hay hasta la pared de la sala, desde (x, z) hacia (ux, uz))
const S = BR.sala;
function pared(x, z, ux, uz) {
  let t = 99;
  if (ux > 1e-6) t = Math.min(t, (S.x1 - x) / ux);
  if (ux < -1e-6) t = Math.min(t, (S.x0 - x) / ux);
  if (uz > 1e-6) t = Math.min(t, (S.z1 - z) / uz);
  if (uz < -1e-6) t = Math.min(t, (S.z0 - z) / uz);
  return Math.max(0, t);
}
// el primer impacto de un golpe (o lo primero que hace)
const primero = (a) => (a.hits && a.hits.length ? a.hits[0][0] : a.events && a.events.length ? a.events[0].t : a.dur * 0.5);
// cuánto se adelanta al apuntar adonde sueles rodar (grados: lo que cabe en
// el arco de cada golpe)
const APUNTA = { barrido: 26, pica: 10, sierra: 20, lanceta: 12, cauterio: 26, cauterioPica: 10, esponja: 14, trepano: 10, gancho: 8 };
// lo que se puede retener (los golpes de verdad; no la campanilla, la olla ni
// la cal)
const RETENIBLE = new Set(Object.keys(APUNTA));
// la red (si está entrenada; si no, la manera hecha a mano)
const LA_RED = RED && RED.w1 ? new Red(RED) : null;
// Lo duro que es: lo que tarda en ver (s; una persona, de 0,2 a 0,35) y la
// temperatura de lo que elige (1, como se entrenó: lo mejor que sabe; más,
// más variado y algo menos exacto, como una persona). Para ablandarle sin
// cambiar su manera: reaccion 0.36, temp 2.5; para lo más duro: 0.25 y 1.
export const DUREZA = { reaccion: 0.28, temp: 1.3 };

export class PeleaFisico {
  constructor(g, F) {
    this.g = g;
    this.F = F;
    this.nubes = [];
    this.fuegos = 0;
    // lo que pasa dentro de un rato (en tiempo de juego: en pausa, espera)
    this.citas = [];
    // su cabeza: lo que ve, con su retraso, y lo que decide
    this.antes = false;
    this.mente = new Mente(LA_RED, DUREZA);
    this.M = new Uint8Array(N_OUT);
    this.op = OP.acecha;
    this.enGolpe = false;
  }
  luego(s, fn) {
    this.citas.push({ t: s, fn });
  }
  get e() {
    return this.F.e;
  }
  reset() {
    const g = this.g;
    for (const n of this.nubes) g.scene.remove(n.m);
    this.nubes = [];
    this.fuegos = 0;
    this.citas = [];
    if (g.player) g.player.lento = 1;
    this.mente.reset();
    this.op = OP.acecha;
    this.enGolpe = false;
    this.dicho = 0;
  }
  // ¿Empieza? (en el quirófano, a ras de suelo, y él no está en otra cosa)
  quiere(p) {
    return p.pos.y < 1.5 && dentro(QUIR, p.pos);
  }

  // ------------------------------------------------------------ empieza
  empieza() {
    const g = this.g;
    const F = this.F;
    const e = this.e;
    const p = g.player;
    F.modo = 'pelea';
    const S = F.encerrado ? EN_SU_MESA : SALE;
    F.show(S.x, S.z, Math.atan2(p.pos.x - S.x, p.pos.z - S.z));
    e.D.engaged = true;
    e.data.fase = 1;
    e.data.llamo = false;
    e.data.aliento = ALIENTO.max;
    F.setMusic(null);
    // la puerta de la sala, de un portazo: la consulta ha empezado (no se
    // sale hasta que acabe)
    const d = g.interact.list.find((i) => i.id === 'd_sala_inocentes');
    if (d && (d.done || d.open > 0.05)) {
      g.interact.slamShut(d);
      g.audio && g.audio.play('doorSlam', { x: d.x, y: 1, z: d.z });
    }
    g.startBoss(e);
    // (si se encerró herido, te esperaba: empieza con la vida que le quedó y,
    // si no le queda la mitad, enseguida se quita la máscara: think)
    F.say(F.encerrado ? DIALOG.fisicoEsperaba : DIALOG.fisicoPelea, 3.4);
    // una consulta nueva: su historia de ti (lo viejo pesa menos); y, al
    // rato, lo que tiene apuntado
    F.H.encuentro('pelea');
    this.mente.reset();
    this.op = OP.acecha;
    this.dicho = 0;
    this.luego(5.5, () => this.diceApunta());
  }
  // Lo que tiene apuntado de ti, dicho (lo más claro), si lo hay.
  diceApunta() {
    const F = this.F;
    if (F.modo !== 'pelea' || this.e.state === 'guion') return;
    const R = F.H.rasgos();
    const lp = F.H.ladoProbable();
    const A = DIALOG.fisicoApunta;
    let k = null;
    if (lp && lp.k > 0.45) k = lp.lado;
    else if (R.seguro > 0.4 && R.pronto > 0.4) k = 'pronto';
    else if (R.seguro > 0.4 && R.desvia > 0.3) k = 'desvia';
    else if (R.seguro > 0.4 && R.cubre > 0.3) k = 'cubre';
    else if (R.huye > 0.4) k = 'huye';
    else if (R.bebe > 0.5 && F.H.d.bebe.n >= 2) k = 'bebe';
    if (k && A[k]) {
      F.say(A[k], 3.2);
      this.dicho++;
    }
  }

  // ------------------------------------------------------------ lo que piensa
  think(e, pl, d, dt) {
    if (e.state === 'guion') return 'handled';
    // los tiempos: a media vida, la máscara; con un cuarto, el fuego
    const k = e.hp / e.maxHp;
    if (e.data.fase === 1 && k <= 0.5) return this.guionEmpieza('mascara');
    if (e.data.fase === 2 && k <= 0.25) return this.guionEmpieza('brasero');
    e.data.calOk = e.data.fase === 3 && this.g.time - (e.data.calT ?? -99) > 9;
    // (la manera de antes: el motor elige a suertes)
    if (this.antes) return null;
    return this.tactica(e, pl, d, dt);
  }

  // ------------------------------------------------------------ su cabeza
  // Lo que ve de ti (en lo que tarda en verlo: Mente.visto).
  obs(e, p) {
    const g = this.g;
    const dx = p.pos.x - e.pos.x,
      dz = p.pos.z - e.pos.z;
    const d = Math.hypot(dx, dz) || 1e-3;
    const ux = dx / d,
      uz = dz / d;
    const s = p.state;
    const pe = s === 'attack' ? PE.ataca : s === 'roll' ? PE.rueda : s === 'heal' ? PE.bebe : s === 'grabbed' || s === 'pinned' ? PE.cogido : s === 'hurt' || s === 'stagger' || s === 'blockhit' || s === 'getup' || s === 'wake' ? PE.herido : p.blocking ? PE.cubre : PE.libre;
    const dur = s === 'attack' && p.atk ? p.atk.dur || 1 : s === 'roll' ? (p.rollBack ? 0.46 : 0.64) : s === 'heal' ? 1.15 : 1;
    let nube = 0;
    for (const n of this.nubes) if (Math.hypot(p.pos.x - n.x, p.pos.z - n.z) < NUBE.r) nube = 1;
    return { t: g.time, d, rel: angleDiff(e.yaw, Math.atan2(dx, dz)), vr: -(p.vx * ux + p.vz * uz), vl: p.vx * uz - p.vz * ux, pe, pk: clamp((s === 'attack' ? p.atkT ?? p.stT : p.stT) / dur, 0, 1), php: p.hp / p.maxHp, pst: p.st / p.maxSt, pfr: p.flasks / (p.maxFlasks || 3), paredEl: pared(p.pos.x, p.pos.z, ux, uz), nube };
  }
  // ¿Lo tiene a mano? (las condiciones de cada golpe, sin la distancia)
  puede(e, k, d) {
    const a = FI_ATTACKS[k];
    return !!a && (!a.cond || !!a.cond(e, d));
  }
  // Lo que sabe de sí mismo (ahora).
  yo(e, p) {
    const g = this.g;
    const dx = p.pos.x - e.pos.x,
      dz = p.pos.z - e.pos.z;
    const d = Math.hypot(dx, dz) || 1e-3;
    let coronados = 0;
    for (const id of LLAMADOS) {
      const c = g.enemies.find((x) => x.id === id);
      if (c && !c.dead && !c.scripted && c.obj.visible) coronados++;
    }
    return { hp: e.hp / e.maxHp, fase: e.data.fase || 1, cd: Math.max(0, e.cooldown), aliento: e.data.aliento ?? ALIENTO.max, desde: g.time - (e.data.finT ?? -9), paredYo: pared(e.pos.x, e.pos.z, -dx / d, -dz / d), coronados, fuegos: this.fuegos, listo: [this.puede(e, 'gancho', d), this.puede(e, 'esponja', d), this.puede(e, 'sahumerio', d), this.puede(e, 'trepano', d), this.puede(e, 'cal', d)] };
  }
  // Lo que puede hacer, sobre lo que ha visto (o: Mente.visto).
  mascara(e, o) {
    const M = this.M;
    M.fill(0);
    for (let i = 0; i < N_MOV; i++) M[i] = 1;
    if (e.cooldown > 0) return M;
    const fase = e.data.fase || 1;
    for (let i = N_MOV; i < N_OUT; i++) {
      const k = OPCIONES[i];
      const key = k === 'amago' ? AMAGA[fase] : GOLPE_DE[k];
      if (!key || !this.puede(e, key, o.d)) continue;
      const a = FI_ATTACKS[key];
      if (o.d < a.min || o.d > a.max) continue;
      if (k === 'amago' && this.g.time - this.mente.amagoT < ENTRE_AMAGOS) continue;
      // (sin aliento para ese golpe, no)
      if ((e.data.aliento ?? ALIENTO.max) < (k === 'amago' ? ALIENTO.coste.amago : ALIENTO.coste[key] ?? 0)) continue;
      M[i] = 1;
    }
    return M;
  }
  // Cada vez que está libre (en 'chase'): la campanilla, lo que decide su
  // cabeza (cada poco) y el movimiento de lo que ha decidido.
  tactica(e, pl, d, dt) {
    const g = this.g;
    const t = g.time;
    const M = this.mente;
    // (arriba, en la galería o en un mueble: va a por ti por donde se sube; no
    // golpea al aire)
    if (Math.abs(pl.pos.y - e.pos.y) > 0.9) {
      e.chaseTo(pl.pos.x, pl.pos.z, d > 4.5 ? e.T.run : e.T.walk, dt, pl.pos.y);
      return 'handled';
    }
    // la campanilla: con sitio (lejos de ti), o a los ocho segundos de poder
    if ((e.data.fase || 1) === 1 && e.hp < e.maxHp * 0.82 && !e.data.llamo && e.cooldown <= 0) {
      if (e.data.eligeT == null) e.data.eligeT = t;
      if (d > 4 || t - e.data.eligeT > 8) {
        this.golpe(e, 'llama');
        return 'handled';
      }
    }
    if (M.toca(t)) {
      const op = M.decide(t, this.yo(e, pl), this.F.H.rasgos(), (o) => this.mascara(e, o));
      if (op >= N_MOV) {
        const amago = op === OP.amago;
        this.golpe(e, amago ? AMAGA[e.data.fase || 1] : GOLPE_DE[OPCIONES[op]], { amago });
        return 'handled';
      }
      if (op >= 0) this.op = op;
    }
    // el movimiento de lo que ha decidido (hacia donde estás ahora)
    const D = DIST[e.data.fase || 1];
    const op = this.op;
    if (!M.o || op === OP.espera) {
      e.vx = damp(e.vx, 0, 8, dt);
      e.vz = damp(e.vz, 0, 8, dt);
    } else if (op === OP.acerca) e.chaseTo(pl.pos.x, pl.pos.z, rumbo(OP.acerca, e.pos.x, e.pos.z, pl.pos.x, pl.pos.z, D, e.T.walk, e.T.run)[2], dt, pl.pos.y);
    else {
      const R = rumbo(op, e.pos.x, e.pos.z, pl.pos.x, pl.pos.z, D, e.T.walk, e.T.run, M.lado);
      if (R) e.steerTo(R[0], R[1], R[2], dt, false);
    }
    if (op !== OP.acerca) e.yaw = approachAngle(e.yaw, e.angleTo(pl.pos), (e.T.turn ?? 3.4) * dt);
    return 'handled';
  }
  // Un golpe (key: de FI_ATTACKS): amagado, retenido, apuntado.
  golpe(e, key, o = {}) {
    const a = FI_ATTACKS[key];
    e.startAttack(a);
    e.data.amago = !!o.amago;
    e.data.reten = !o.amago && this.retiene(a);
    e.aimOff = o.amago ? 0 : this.apunta(e, a);
    if (key === 'cal') e.data.calT = this.g.time;
  }
  // ¿Retiene el golpe? (si te adelantas: lo tiene apuntado)
  retiene(a) {
    const R = this.F.H.rasgos();
    const p = clamp(0.06 + R.pronto * R.seguro * 1.3, 0, 0.6);
    return RETENIBLE.has(a.name) && primero(a) > 0.45 && Math.random() < p;
  }
  // Hacia dónde apunta: un poco hacia donde sueles rodar (lo apuntado).
  apunta(e, a) {
    const lp = this.F.H.ladoProbable();
    const max = APUNTA[a.name];
    if (!lp || !max || Math.random() > lp.k) return 0;
    const p = this.g.player.pos;
    const ux = e.pos.x - p.x,
      uz = e.pos.z - p.z;
    const m = Math.hypot(ux, uz) || 1;
    // (tu izquierda, mirándole)
    const s = lp.lado === 'l' ? 1 : -1;
    const qx = p.x + (uz / m) * 2.2 * s,
      qz = p.z + (-ux / m) * 2.2 * s;
    const off = angleDiff(Math.atan2(p.x - e.pos.x, p.z - e.pos.z), Math.atan2(qx - e.pos.x, qz - e.pos.z));
    return clamp(off, -max * DEG, max * DEG);
  }
  // Cada fotograma (desde su update): lo que ve; el golpe retenido (su reloj,
  // más despacio hasta casi el impacto) y el amago (lo deja a medias); al
  // acabar un golpe, a pensar enseguida.
  cuerpo(e, dt, pl) {
    const g = this.g;
    if (this.antes) {
      if (e.state === 'attack' && e.atk && e.atk.name === 'cal') e.data.calT = g.time;
      return;
    }
    // (cazándote por la calle no piensa así, pero también te estudia: sus
    // golpes, adonde sueles rodar; retenidos, si te adelantas)
    if (this.F.modo === 'caza') {
      if (e.state === 'attack' && e.atk && e.atkSerial !== this.serialCaza) {
        this.serialCaza = e.atkSerial;
        e.data.amago = false;
        e.data.reten = this.retiene(e.atk);
        e.aimOff = this.apunta(e, e.atk);
      }
      if (e.state === 'attack' && e.atk && e.data.reten) e.anim.speed = e.stT < primero(e.atk) * RETIENE.hasta ? RETIENE.paso : 1;
      else if (e.data.reten) {
        e.data.reten = false;
        e.anim.speed = 1;
      }
      return;
    }
    this.mente.ve(g.time, this.obs(e, pl));
    // su aliento: cada golpe cuesta; se recupera respirando
    const golpeando = e.state === 'attack' && !!e.atk;
    if (golpeando && e.atkSerial !== this.serialAliento) {
      this.serialAliento = e.atkSerial;
      const k = e.data.amago ? 'amago' : e.atk.name;
      e.data.aliento = Math.max(0, (e.data.aliento ?? ALIENTO.max) - (ALIENTO.coste[k] ?? 0));
    }
    e.data.aliento = respira(e.data.aliento ?? ALIENTO.max, dt, golpeando);
    if (e.state === 'attack' && e.atk) {
      const a = e.atk;
      const first = primero(a);
      if (e.data.reten) e.anim.speed = e.stT < first * RETIENE.hasta ? RETIENE.paso : 1;
      if (e.data.amago && e.stT >= first * AMAGO_EN) {
        e.state = 'chase';
        e.atk = null;
        e.cooldown = 0;
        e.stT = 0;
        e.anim.stop(0.2);
        e.anim.speed = 1;
        e.data.amago = false;
        e.data.finT = g.time;
        this.enGolpe = false;
        this.mente.pronto(g.time, 0.05);
        return;
      }
      this.enGolpe = true;
    } else if (this.enGolpe) {
      this.enGolpe = false;
      e.anim.speed = 1;
      e.data.reten = false;
      e.data.finT = g.time;
      this.mente.pronto(g.time, 0.12);
    }
  }
  // no se salta un tiempo de un golpe: se queda a las puertas del siguiente
  preHit(e, dmg, poise) {
    if (e.state === 'guion') return { dmg: 0, poise: 0 };
    const lim = e.data.fase === 1 ? 0.5 : e.data.fase === 2 ? 0.25 : 0;
    const min = Math.ceil(e.maxHp * lim) - 1;
    if (lim && e.hp - dmg < min) return { dmg: Math.max(0, e.hp - min), poise };
    return null;
  }

  // ------------------------------------------------------------ los momentos
  guionEmpieza(k) {
    const e = this.e;
    e.state = 'guion';
    e.stT = 0;
    e.atk = null;
    e.vx = e.vz = 0;
    e.data.guion = { k, t: 0, cues: new Set() };
    if (k === 'mascara') {
      e.anim.play(FI_CLIPS.quita, { blend: 0.15 });
      // (la cámara, a su cara: de frente, por encima de tu hombro)
      const g = this.g;
      const p = g.player.pos;
      const dx = p.x - e.pos.x,
        dz = p.z - e.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      const ux = dx / d,
        uz = dz / d;
      const cam = new THREE.Vector3(e.pos.x + ux * 1.7 - uz * 0.35, e.pos.y + 1.9, e.pos.z + uz * 1.7 + ux * 0.35);
      const look = new THREE.Vector3(e.pos.x, e.pos.y + 1.85, e.pos.z);
      g.cinematic(2.9, cam, look);
    }
    return 'handled';
  }
  guion(e, dt, pl) {
    const g = this.g;
    const G = e.data.guion;
    if (!G) {
      e.state = 'chase';
      return true;
    }
    G.t += dt;
    const cue = (id, at) => (G.t >= at && !G.cues.has(id) ? (G.cues.add(id), true) : false);
    e.vx = damp(e.vx, 0, 8, dt);
    e.vz = damp(e.vz, 0, 8, dt);
    if (G.k === 'mascara') {
      e.yaw = dampAngle(e.yaw, e.angleTo(pl.pos), 2, dt);
      if (cue('dice', 0.2)) fiSay(e, DIALOG.fisicoMascara, 4);
      if (cue('quita', 1.3)) {
        fiGrp(e, 'mascara', false);
        fiGrp(e, 'sombrero', false);
        g.audio && g.audio.play('sackTear', e.pos);
      }
      // (deja caer la vara y saca la sierra y la lanceta)
      if (cue('hierros', 2.0)) {
        fiGrp(e, 'vara', false);
        fiGrp(e, 'sierra', true);
        fiGrp(e, 'lanceta', true);
        g.audio && g.audio.play('woodHit', e.pos);
      }
      if (G.t >= 2.8) this.guionFin(e, 2);
      return false;
    }
    if (G.k === 'brasero') {
      // va al brasero; allí, se agacha y saca los cauterios
      const [ax, az] = BRASERO.ante;
      if (!G.llega) {
        if (Math.hypot(ax - e.pos.x, az - e.pos.z) > 0.35 && G.t < 4) {
          e.chaseTo(ax, az, e.T.walk * 1.6, dt, 0);
          return true;
        }
        G.llega = G.t;
        e.anim.play(FI_CLIPS.brasero, { blend: 0.2 });
      }
      const t = G.t - G.llega;
      e.yaw = dampAngle(e.yaw, Math.atan2(BRASERO.x - e.pos.x, BRASERO.z - e.pos.z), 6, dt);
      if (cue('saca', G.llega + 0.9)) {
        fiGrp(e, 'sierra', false);
        fiGrp(e, 'lanceta', false);
        fiGrp(e, 'hierro', true);
        g.fx.blood.emit(BRASERO.x, 1.1, BRASERO.z, 30, { color: [1, 0.55, 0.15], speed: 3, life: 0.8, up: 2.4 });
        g.audio && g.audio.play('fireWhoosh', { x: BRASERO.x, y: 1, z: BRASERO.z });
        fiSay(e, DIALOG.fisicoFuego, 3.4);
      }
      if (t >= 2.0) this.guionFin(e, 3);
      return false;
    }
    return false;
  }
  guionFin(e, fase) {
    e.data.guion = null;
    e.data.fase = fase;
    e.state = 'chase';
    e.stT = 0;
    e.cooldown = 0.6;
    e.anim.stop(0.2);
    this.g.onBossPhase(e);
    this.mente.pronto(this.g.time, 0.1);
  }

  // ------------------------------------------------------------ las medicinas
  // El sahumerio: la olla de barro, a tus pies; la nube de beleño.
  sahumerio(e) {
    const g = this.g;
    const p = g.player.pos;
    e.data.humoT = g.time;
    const x = p.x + g.player.vx * 0.4,
      z = p.z + g.player.vz * 0.4;
    g.audio && g.audio.play('woodBreak', { x, y: 0.2, z });
    g.fx.blood.emit(x, 0.2, z, 24, { color: [0.62, 0.5, 0.3], speed: 2.5, life: 0.5, up: 1.2 });
    const mat = additiveFog(new THREE.MeshBasicMaterial({ map: getTexture('glow'), color: 0xc8b040, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    const m = new THREE.Mesh(new THREE.CircleGeometry(NUBE.r * 1.15, 18).rotateX(-Math.PI / 2), mat);
    m.position.set(x, 0.06, z);
    m.renderOrder = 3;
    g.scene.add(m);
    this.nubes.push({ x, z, t: NUBE.t, m, puff: 0 });
    this.F.say(DIALOG.fisicoSahumerio, 3);
  }
  // La campanilla: los suyos, del zaguán.
  llama(e) {
    const g = this.g;
    e.data.llamo = true;
    fiSay(e, DIALOG.fisicoLlama, 3.2);
    // (la puerta de las celdas se abre: los suyos estaban detrás)
    const dc = g.interact.list.find((i) => i.id === 'd_celdas_inocentes');
    if (dc && !dc.done) {
      g.interact.setOpen(dc);
      g.audio && g.audio.play('doorOpen', { x: dc.x, y: 1, z: dc.z });
    }
    LLAMADOS.forEach((id, i) => {
      const c = g.enemies.find((x) => x.id === id);
      if (!c || c.dead) return;
      this.luego(0.9 + i * 1.3, () => {
        if (this.F.modo !== 'pelea' || c.dead) return;
        c.scripted = false;
        c.body.pos.set(HUECO.x + (i ? 1.0 : -0.2), 0, HUECO.z + i * 0.9);
        c.body.vy = 0;
        c.yaw = Math.PI;
        c.obj.visible = true;
        c.shadow.visible = true;
        c.aware = true;
        c.state = 'chase';
        c.stT = 0;
        c.cooldown = 0.8;
        c.home = { x: c.pos.x, y: 0, z: c.pos.z, yaw: Math.PI };
        g.audio && g.audio.enemyVoice(c, 'alert');
      });
    });
  }
  onTrepano(e) {
    const g = this.g;
    this.F.say(DIALOG.fisicoTrepano, 2.6);
    g.qte && g.qte.start({ action: 'light', label: '¡Suéltate!', mash: 10, window: 3.0, slow: 1, lenient: true, onDone: () => {} });
  }

  // ------------------------------------------------------------ el fuego
  prende(x, z) {
    const g = this.g;
    if (this.fuegos >= MAX_FUEGOS || !dentro(QUIR, { x, z })) return;
    this.fuegos++;
    g.combat.firePool(x, 0, z, 1.25, 7);
    g.audio && g.audio.play('fireWhoosh', { x, y: 0.4, z });
    this.luego(7, () => (this.fuegos = Math.max(0, this.fuegos - 1)));
  }

  // ------------------------------------------------------------ vencido
  muere(e) {
    const g = this.g;
    if (this.F.modo !== 'pelea') return false;
    e.hp = 1;
    if (g.fisicoCine && g.fisicoCine.muerte) g.fisicoCine.muerte(this.F);
    return true;
  }
  // (acabada la escena) muerto de verdad: sentado en su mesa para siempre;
  // la llave de la cordelería y la puerta del patio, abierta
  final() {
    const g = this.g;
    const e = this.e;
    e.dead = true;
    e.hp = 0;
    e.state = 'dead';
    e.scripted = true;
    e.D.engaged = false;
    this.reset();
    g.onEnemyDeath(e);
    if (!g.inventory.has('llave_cordeleria')) {
      g.giveItem('llave_cordeleria');
      g.ui.toast(DIALOG.fisicoLlave, 5);
    }
    // las puertas: la del patio y la de la sala, abiertas
    for (const id of ['d_quirofano_patio', 'd_sala_inocentes']) {
      const d = g.interact.list.find((i) => i.id === id);
      if (d) {
        g.interact.setOpen(d, true);
        g.flags['door:' + id] = true;
      }
    }
    g.saveGame();
  }
  // (al cargar, ya vencido) sentado, muerto, en el canto de su mesa
  sentado() {
    const e = this.e;
    if (!e) return;
    e.reset();
    e.dead = true;
    e.hp = 0;
    e.state = 'dead';
    e.scripted = true;
    e.D = e.D || {};
    e.D.hidden = false;
    e.obj.visible = true;
    e.shadow.visible = true;
    for (const k of ['mascara', 'sombrero', 'vara']) fiGrp(e, k, false);
    e.pos.set(MESA_CANTO.x, 0, MESA_CANTO.z);
    e.yaw = 0;
    e.anim.play(FI_CLIPS.muerto, { blend: 0, t0: FI_CLIPS.muerto.dur });
    e.animate(0.05);
  }

  // ------------------------------------------------------------ cada fotograma
  update(dt) {
    const g = this.g;
    const p = g.player;
    for (let i = this.citas.length - 1; i >= 0; i--) {
      const c = this.citas[i];
      if ((c.t -= dt) > 0) continue;
      this.citas.splice(i, 1);
      c.fn();
    }
    let lento = 1;
    for (let i = this.nubes.length - 1; i >= 0; i--) {
      const n = this.nubes[i];
      n.t -= dt;
      const a = Math.min(1, (NUBE.t - n.t) * 2) * Math.min(1, n.t / 1.5);
      n.m.material.opacity = 0.42 * a * (0.85 + 0.15 * Math.sin(g.time * 2 + i));
      n.puff -= dt;
      if (n.puff <= 0) {
        n.puff = 0.12;
        const r = Math.sqrt(Math.random()) * NUBE.r;
        const t = Math.random() * Math.PI * 2;
        g.fx.blood.emit(n.x + Math.cos(t) * r, 0.2, n.z + Math.sin(t) * r, 2, { color: [0.78, 0.7, 0.32], speed: 0.4, life: 2.2, up: 0.7, gravity: -0.4 });
      }
      if (!p.dead && Math.hypot(p.pos.x - n.x, p.pos.z - n.z) < NUBE.r && p.pos.y < 1.6) {
        lento = NUBE.lento;
        this.F.sueno(0.45 * a);
      }
      if (n.t <= 0) {
        g.scene.remove(n.m);
        n.m.geometry.dispose();
        n.m.material.dispose();
        this.nubes.splice(i, 1);
      }
    }
    p.lento = lento;
  }
}

// donde se sienta a morir: el canto sur de su mesa
export const MESA_CANTO = { x: BR.mesa.x, z: BR.mesa.z + 0.38 };
