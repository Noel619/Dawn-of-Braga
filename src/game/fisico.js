// El Físico de los Inocentes: la cabeza del barrio de los Pellejeros.
//
// Mestre Clemente (entities/fisico.js) no es una criatura que espera en su
// sitio: el barrio es suyo y lo recorre. Esto decide dónde está y qué hace.
//
//  - Te vigila desde el principio: la cortina (fisico_cine.js), y luego
//    aparece al fondo de la calleja, te mira, ladea la cabeza y se va. Antes
//    de la caza no se deja alcanzar: si te acercas, se marcha.
//  - Cuarentena: mientras estás arriba, en casa de la viuda, clava tablas en
//    su puerta por fuera; y, cazando, tapia la puerta de la casa en la que te
//    has metido (si tiene otra salida).
//  - La caza empieza en la tintorería (entra detrás de ti). Desde entonces,
//    lo que hace ruido le trae: los cascabeles de un Coronado, las
//    campanillas de una cuerda, un cepo que salta, una puerta que se arranca
//    (trampas.js). Aparece por la puerta de una de las casas que ya curó, la
//    que no ves, la más cercana; va a donde fue el ruido, husmea, te busca
//    por donde estuviste la última vez y, si no te encuentra, se va (y
//    vuelve).
//  - Por los tejados no te sigue: te acompaña desde la calle, debajo, sin
//    quitarte los ojos de encima.
//  - Si le hieres mucho, te echa la cal a los ojos y se retira; volverá.
//  - Quiere atraparte, no matarte: el gancho de la vara te trae, la esponja
//    te duerme (forcejea) y, si te duermes, la camilla (fisico_cine.js).
//  - Habla siempre bajo, sin prisa: piensa en voz alta (story.js, DIALOG).
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { BR } from '../world/level_barrio.js';
import { DIALOG, MSG } from './story.js';
import { FI_CLIPS, fiSay, fiGrp } from '../entities/fisico.js';
import { clamp } from '../core/util.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const inR = (r, x, z, m = 0) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m;
// el barrio entero (lo que él tiene por suyo)
const BARRIO = { x0: 14, z0: 3, x1: 73, z1: 58 };
// las calles (a ras de suelo), por donde anda
const CALLES = [BR.calleja, BR.plazuela];
// las casas en las que entra a buscarte: su zona, su puerta y, delante y
// detrás de la puerta, dónde se pone (para tapiarla: el lado de fuera)
const CASAS = [
  { zona: 'zapatero', puerta: 'd_zapatero', fuera: [24.0, 43.0], dentro: [24.0, 40.6], lado: 1, otra: 'd_zapatero_corral' },
  { zona: 'viuda', puerta: 'd_viuda', fuera: [25.2, 45.0], dentro: [25.2, 47.5], lado: -1, otra: 'd_viuda_patio' },
  { zona: 'quemada', puerta: 'd_quemada', fuera: [34.9, 48.4], dentro: [32.9, 48.4], lado: 1, otra: 'd_quemada_patio' },
  { zona: 'tintoreria_pellejeros', puerta: 'd_tinte', fuera: [40.0, 39.4], dentro: [40.0, 37.2], lado: 1, otra: null },
];
// por dónde aparece y por dónde se va: las puertas de las casas que ya curó
// (las de la cruz de cal); yaw, saliendo a la calle
const ENTRADAS = [
  { id: 'casa', x: 48.8, z: 45.0, yaw: -Math.PI / 2 },
  { id: 'se', x: 48.8, z: 50.0, yaw: -Math.PI / 2 },
  { id: 's5', x: 44.5, z: 50.4, yaw: Math.PI },
  { id: 'agu', x: 37.0, z: 50.4, yaw: Math.PI },
  { id: 's3', x: 31.75, z: 45.4, yaw: Math.PI },
  { id: 'n3', x: 29.4, z: 42.6, yaw: 0 },
  { id: 'n1', x: 17.6, z: 42.6, yaw: 0 },
];
// las esquinas en las que se pierde de vista cuando todas esas puertas se ven
// desde donde estás (la calleja es recta: desde ella se ve todo su largo)
const ESCONDITES = [
  [38.6, 40.0],
  [47.4, 40.2],
  [42.0, 50.2],
  [35.2, 50.2],
];
// cuánto tarda en volver tras irse (s), y lo que le aguanta a uno antes de
// retirarse (de su vida, en una aparición)
const VUELVE = [22, 38];
const AGUANTA = 0.22;

export class Fisico {
  constructor(g) {
    this.g = g;
    this.e = g.enemies.find((x) => x.type === 'fisico') || null;
    this.reset();
  }

  // ------------------------------------------------------------ estado
  reset() {
    this.modo = 'fuera';
    this.t = 0;
    this.blind = 0;
    this.cool = 0;
    this.alarm = null;
    this.last = null; // dónde te vio por última vez
    this.lostT = 0;
    this.searchN = 0;
    this.hp0 = 0;
    this.sayT = 0;
    this.roofT = 0;
    this.sleep = 0;
    this.upT = 0;
    this.inT = 0;
    this.near = 0;
    this.music = null;
    this.vigia = null;
    this.tapiado = null;
    if (this.e && !(this.g.flags && this.g.flags['boss:fisico'])) this.hide();
  }
  onRespawn() {
    // (al morir: se va; las tablas que clavó, clavadas siguen)
    this.reset();
    this.setMusic(null);
  }
  applyFlags() {
    const g = this.g;
    for (const c of CASAS) if (g.flags['tapia:' + c.puerta]) this.tapiar(c, true);
  }

  // ¿Está en el barrio? ¿En la calle? ¿En una casa (cuál)? ¿En los tejados?
  enBarrio(p) {
    return inR(BARRIO, p.x, p.z) && p.y > -1;
  }
  enCalle(p) {
    return p.y < 1.2 && CALLES.some((r) => inR(r, p.x, p.z));
  }
  casaDe(p) {
    const z = this.g.zoneAt(p);
    return z ? CASAS.find((c) => c.zona === z.id) || null : null;
  }
  enTejado(p) {
    if (!this.enBarrio(p) || p.y < 5.2) return false;
    const z = this.g.zoneAt(p);
    return !z || z.atmo !== 'interior';
  }
  // ¿Lo ve el jugador? (de la cabeza al pecho del otro, y en lo que mira la
  // cámara, más o menos)
  visto(x, y, z) {
    const g = this.g;
    const p = g.player.pos;
    if (Math.hypot(x - p.x, z - p.z) > 45) return false;
    if (!g.world.col.lineOfSight(p.x, p.y + 1.6, p.z, x, y + 1.5, z)) return false;
    const c = g.camera.position;
    const f = this._f || (this._f = new THREE.Vector3());
    g.camera.getWorldDirection(f);
    const dx = x - c.x,
      dz = z - c.z;
    const d = Math.hypot(dx, dz) || 1;
    return (dx * f.x + dz * f.z) / d > 0.35;
  }

  // ------------------------------------------------------------ el cuerpo
  // Lo saca a escena en (x, z), mirando a yaw.
  show(x, z, yaw) {
    const e = this.e;
    const g = this.g;
    e.reset();
    e.spec.held = false;
    e.scripted = false;
    e.obj.visible = true;
    e.shadow.visible = true;
    e.pos.set(x, g.world.col.groundHeight(x, z, 0.3, 1.5), z);
    e.yaw = yaw;
    e.obj.position.copy(e.pos);
    e.obj.rotation.set(0, yaw, 0);
    e.hp = e.maxHp;
    this.hp0 = e.hp;
    e.D = e.D || {};
    e.D.engaged = false;
    e.D.hidden = false;
    g.activeBoss = e;
  }
  hide() {
    const e = this.e;
    const g = this.g;
    if (!e) return;
    e.scripted = true;
    e.aware = false;
    e.state = 'dormant';
    e.obj.visible = false;
    e.shadow.visible = false;
    e.vx = e.vz = 0;
    e.D = e.D || {};
    e.D.hidden = true;
    if (g.activeBoss === e) g.activeBoss = null;
    if (g.lockTarget === e) g.lockTarget = null;
    if (g.speech && e.P.who) g.speech.hush(e.P.who);
  }
  get shown() {
    return this.e && !this.e.scripted && this.e.obj.visible;
  }
  say(lines, dur) {
    if (!this.e || !lines) return;
    fiSay(this.e, Array.isArray(lines) ? pick(lines) : lines, dur);
    this.sayT = 9 + Math.random() * 6;
  }
  // Que vaya a (x, z) (y al llegar, then).
  walk(x, z, speed, then, o = {}) {
    const e = this.e;
    e.data.goal = { x, z, y: o.y ?? 0, speed: speed ?? e.T.walk, then, face: o.face, r: o.r };
    e.state = 'camina';
    e.stT = 0;
    e.aware = false;
    e.path = null;
  }
  // Que se quede mirando (al jugador, o a un punto) t segundos.
  look(t, then, o = {}) {
    const e = this.e;
    e.data.look = { t, then, x: o.x, z: o.z, track: o.track };
    e.state = 'mira';
    e.stT = 0;
    e.aware = false;
    if (o.clip) e.anim.play(FI_CLIPS[o.clip], { blend: 0.2 });
  }

  // ------------------------------------------------------------ entradas
  // La puerta por la que sale para ir a (x, z): la más cercana que no
  // ves; si las ves todas, la más lejana de ti.
  entrada(x, z, salir = false) {
    const p = this.g.player.pos;
    let best = null,
      bd = Infinity;
    for (const E of ENTRADAS) {
      const dp = Math.hypot(E.x - p.x, E.z - p.z);
      if (dp < 6) continue;
      const seen = this.visto(E.x, 0, E.z);
      const d = Math.hypot(E.x - x, E.z - z) + (seen ? 60 : 0) + (salir ? -dp * 0.15 : 0);
      if (d < bd) {
        bd = d;
        best = E;
      }
    }
    return best || ENTRADAS[0];
  }
  // Aparece por una puerta y va a donde le llaman.
  aparece(x, z, then, speed) {
    const E = this.entrada(x, z);
    this.show(E.x, E.z, E.yaw);
    this.g.audio && this.g.audio.play('doorOpen', { x: E.x, y: 1, z: E.z });
    this.walk(x, z, speed, then, { r: 1.2 });
  }
  // Se va por la puerta más a mano (corriendo, si huye) y, al llegar, se
  // esfuma; vuelve al rato.
  marcha(huye = false) {
    const e = this.e;
    if (!this.shown) return this.fuera();
    this.modo = 'marcha';
    e.aware = false;
    const E = this.entrada(e.pos.x, e.pos.z, true);
    const sp = huye ? e.T.run : e.T.walk * 1.15;
    // (si esa puerta se ve, primero dobla la esquina más a mano que no se
    // vea, y allí se pierde)
    if (this.visto(E.x, 0, E.z)) {
      let best = null,
        bd = Infinity;
      for (const [x, z] of ESCONDITES) {
        if (this.visto(x, 0, z)) continue;
        const d = Math.hypot(x - e.pos.x, z - e.pos.z);
        if (d < bd) {
          bd = d;
          best = [x, z];
        }
      }
      if (best) {
        this.walk(best[0], best[1], sp, () => (this.visto(e.pos.x, e.pos.y, e.pos.z) ? this.marcha(huye) : this.fuera()));
        return;
      }
    }
    this.walk(E.x, E.z, sp, () => {
      this.g.audio && this.g.audio.play('doorSlam', { x: E.x, y: 1, z: E.z });
      this.fuera();
    });
  }
  fuera(cool) {
    this.modo = 'fuera';
    this.cool = cool ?? VUELVE[0] + Math.random() * (VUELVE[1] - VUELVE[0]);
    this.alarm = null;
    this.searchN = 0;
    this.hide();
    this.setMusic(null);
  }

  // ------------------------------------------------------------ avisos
  // Algo ha sonado en (x, y, z): los cascabeles de un Coronado, unas
  // campanillas, un cepo, una puerta arrancada.
  alarma(x, y, z, src) {
    const g = this.g;
    if (!this.e || g.flags['boss:fisico'] || this.modo === 'pelea' || this.modo === 'cine') return;
    if (!this.enBarrio({ x, y, z })) return;
    this.alarm = { x, y, z, src, t: g.time };
    // (si ya anda cerca, va directamente)
    if (this.modo === 'busca' || this.modo === 'marcha' || this.modo === 'sombra') this.busca(x, z);
    else if (this.modo === 'fuera') this.cool = Math.min(this.cool, src === 'cepo' || src === 'campanillas' ? 1.5 : 3);
  }
  // Va a ver qué ha sido (o a donde te vio por última vez).
  busca(x, z, y = 0) {
    const g = this.g;
    const e = this.e;
    if (!g.flags['fisico:caza']) return this.vigila(x, z);
    this.modo = 'busca';
    this.setMusic('busca');
    const go = () =>
      this.walk(x, z, e.T.walk * 1.35, () => {
        // llega: husmea, mira alrededor; luego busca donde te vio, o se va
        this.searchN++;
        this.say(DIALOG.fisicoBusca, 3.2);
        this.look(2.6, () => {
          if (this.last && this.searchN < 3 && Math.hypot(this.last[0] - e.pos.x, this.last[2] - e.pos.z) > 2) this.busca(this.last[0], this.last[2], this.last[1]);
          else this.marcha();
        }, { clip: 'husmea', track: false });
      }, { y });
    if (!this.shown) this.aparece(x, z, null, e.T.walk * 1.35), go();
    else go();
  }
  // Antes de la caza: viene a mirar, desde lejos, y se va.
  vigila(x, z) {
    const g = this.g;
    if (this.shown) return;
    const p = g.player.pos;
    // (se pone en la calle, a una distancia, donde le veas)
    const E = this.entrada(x, z);
    this.show(E.x, E.z, E.yaw);
    this.modo = 'vigia';
    const tx = clamp(p.x + Math.sign(E.x - p.x) * 11, BR.calleja.x0 + 1, BR.plazuela.x1 - 1);
    const tz = inR(BR.calleja, tx, 44) ? 44 : clamp(p.z, BR.plazuela.z0 + 1, BR.plazuela.z1 - 1);
    this.walk(tx, tz, null, () => {
      this.say(DIALOG.fisicoVigila, 3.4);
      this.look(4, () => this.marcha(), { clip: 'ladea' });
    }, { r: 1.5 });
  }

  // ------------------------------------------------------------ ganchos
  // Te ve (por primera vez en esta aparición): ¿se te echa encima?
  onWake(e) {
    const g = this.g;
    // antes de la caza, no: se queda mirándote
    if (!g.flags['fisico:caza'] || this.modo === 'sombra' || this.modo === 'vigia' || this.modo === 'marcha') {
      e.aware = false;
      return true;
    }
    this.modo = 'caza';
    this.setMusic('caza');
    this.say(DIALOG.fisicoVe, 3);
    e.anim.play(FI_CLIPS.alert, { blend: 0.15 });
    return false;
  }
  // Persiguiéndote: lo que piensa (lo demás, el tipo: los golpes).
  think(e, pl, d, dt) {
    const g = this.g;
    if (e.sees) {
      this.last = [pl.pos.x, pl.pos.y, pl.pos.z];
      this.lostT = 0;
    } else this.lostT += dt;
    // por los tejados no te sigue
    if (this.enTejado(pl.pos)) {
      this.sombra();
      return 'handled';
    }
    // te ha perdido: a donde te vio por última vez
    if (this.lostT > 5 && this.last) {
      this.searchN = 0;
      this.busca(this.last[0], this.last[2], this.last[1]);
      return 'handled';
    }
    // te metes en una casa con otra salida y no te ve: la tapia
    const c = this.casaDe(pl.pos);
    if (c && !e.sees && this.lostT > 2 && c.otra && !g.flags['tapia:' + c.puerta] && g.flags['door:' + c.otra] !== false) {
      this.cuarentena(c);
      return 'handled';
    }
    this.sayT -= dt;
    if (this.sayT <= 0 && e.sees && d < 12) this.say(d < 4 ? DIALOG.fisicoCerca : DIALOG.fisicoVe, 3);
    // la cal, sólo cuando se va a retirar (o en la pelea)
    e.data.calOk = !!e.data.retirada || this.modo === 'pelea';
    return null;
  }
  // (fuera de la pelea no muere: aguanta un poco y se retira)
  preHit(e, dmg, poise) {
    if (this.modo === 'pelea') return null;
    const lost = this.hp0 - (e.hp - dmg);
    if (lost > e.maxHp * AGUANTA && !e.data.retirada) {
      e.data.retirada = true;
      this.retirada();
      return { dmg: Math.max(0, Math.min(dmg, e.hp - 1)), poise: 0 };
    }
    if (e.hp - dmg < 1) return { dmg: Math.max(0, e.hp - 1), poise };
    return null;
  }
  onHit(e, r) {
    // (herido, te busca: aunque no te viera)
    if (r === 'hit' && this.g.flags['fisico:caza'] && !e.aware && this.modo !== 'marcha') {
      e.aware = true;
      e.state = 'chase';
      this.modo = 'caza';
    }
  }
  // Herido: la cal a los ojos (si estás cerca) y se va, deprisa.
  retirada() {
    const e = this.e;
    const g = this.g;
    this.say(DIALOG.fisicoHerido, 3.4);
    const d = e.distTo(g.player.pos);
    const go = () => {
      e.data.retirada = true;
      this.marcha(true);
      this.cool = 55;
    };
    if (d < 5.5 && e.state !== 'attack') {
      e.state = 'attack';
      e.atk = null;
      e.startAttack({ ...e.T.attacks.find((a) => a.name === 'cal'), cond: null });
      g.later(1500, go);
    } else go();
  }
  onHook() {
    this.say(DIALOG.fisicoGancho, 2.4);
  }
  onSponge() {
    this.sleep = 0;
    this.say(DIALOG.fisicoEsponja, 2.6);
    const g = this.g;
    g.qte && g.qte.start({ action: 'light', label: MSG.forcejea || '¡Forcejea!', mash: 9, window: 2.8, slow: 1, lenient: true, onDone: () => {} });
  }
  onSpongeEscape() {
    this.sleep = 0;
    this.say(DIALOG.fisicoSuelta, 2.6);
  }
  // Se duerme: la camilla (o, en la pelea, un buen rato indefenso).
  onAsleep(e) {
    const g = this.g;
    if (this.modo === 'pelea') {
      g.player.releaseGrab && g.player.releaseGrab(1.5, Math.sin(e.yaw), Math.cos(e.yaw), 28);
      this.sleep = 1;
      return;
    }
    this.captura();
  }
  // La niebla del beleño (k: de 0 a 1, lo dormido que estás).
  sueno(k) {
    this.sleep = Math.max(this.sleep, k);
  }
  // La cal: una nube blanca de su mano a ti; si te da en la cara, ciego.
  cal(e) {
    const g = this.g;
    const p = g.player;
    const hand = e.rig.worldPos('handL', this._v || (this._v = new THREE.Vector3()));
    g.fx.blood.emit(hand.x, hand.y, hand.z, 60, { color: [0.96, 0.95, 0.9], speed: 4.6, life: 0.9, up: 0.5, gravity: 1.2, dir: { x: Math.sin(e.yaw), z: Math.cos(e.yaw) } });
    g.audio && g.audio.play('calViva', hand);
    const d = e.distTo(p.pos);
    const a = Math.abs(((e.angleTo(p.pos) - e.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (d < 5.5 && a < 0.5 && !p.iframe && !p.dead) {
      p.receiveBite && p.receiveBite(6);
      this.blind = 3.2;
      g.ui.toast(MSG.calOjos || 'La cal en los ojos: no ves nada.', 2.5);
    }
  }
  // Cada fotograma del cuerpo (desde su update).
  updateBody(e, dt, pl) {
    // mirando hacia arriba (te sigue por los tejados)
    e.data.lookUp = this.modo === 'sombra' && pl.pos.y - e.pos.y > 2.5;
  }

  // ------------------------------------------------------------ guion
  // Te sigue por la calle mientras vas por los tejados.
  sombra() {
    const e = this.e;
    if (this.modo === 'sombra') return;
    this.modo = 'sombra';
    this.roofT = 0;
    this.setMusic('busca');
    e.aware = false;
    e.state = 'mira';
    e.stT = 0;
    e.data.look = { t: 999 };
    if (this.sayT < 2) this.say(DIALOG.fisicoTejado, 3.6);
  }
  updateSombra(dt) {
    const g = this.g;
    const e = this.e;
    const p = g.player.pos;
    if (!this.enTejado(p)) {
      // has bajado: a la calle (a por ti) o a una casa (a buscarte)
      if (this.enCalle(p) || this.casaDe(p)) {
        this.busca(p.x, p.z, p.y);
        this.last = [p.x, p.y, p.z];
      } else this.marcha();
      return;
    }
    this.roofT += dt;
    // (debajo de ti, en la calle, lo más cerca)
    let best = null,
      bd = Infinity;
    for (const r of CALLES) {
      const x = clamp(p.x, r.x0 + 0.8, r.x1 - 0.8),
        z = clamp(p.z, r.z0 + 0.8, r.z1 - 0.8);
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < bd) {
        bd = d;
        best = [x, z];
      }
    }
    // (lejos de las calles, te espera en medio de la plazuela)
    if (bd > 14) best = [41.5, 45];
    const d = Math.hypot(best[0] - e.pos.x, best[1] - e.pos.z);
    if (d > 2.5 && e.state !== 'camina') this.walk(best[0], best[1], d > 8 ? e.T.run * 0.8 : e.T.walk, () => this.look(999, null), { r: 1.2 });
    else if (e.state === 'camina' && e.data.goal) {
      e.data.goal.x = best[0];
      e.data.goal.z = best[1];
    }
    this.sayT -= dt;
    if (this.sayT <= 0 && this.visto(e.pos.x, e.pos.y, e.pos.z)) this.say(DIALOG.fisicoTejado, 3.6);
    // (mucho rato sin verte: se cansa y se va)
    if (this.roofT > 90 && !this.visto(e.pos.x, e.pos.y, e.pos.z)) this.marcha();
  }

  // Cuarentena: va a la puerta de la casa en la que te has metido y la
  // clava por fuera (y se va).
  cuarentena(c, then) {
    const e = this.e;
    const g = this.g;
    this.modo = 'tapia';
    e.aware = false;
    this.walk(c.fuera[0], c.fuera[1], e.T.walk * 1.3, () => {
      const it = g.interact.list.find((i) => i.id === c.puerta);
      if (it && (it.done || it.open > 0.05)) {
        g.interact.slamShut(it);
        g.audio && g.audio.play('doorSlam', { x: it.x, y: 1, z: it.z });
      }
      e.data.tapia = { t: 5.5, x: it ? it.x : c.fuera[0], z: it ? it.z : c.fuera[1], face: Math.atan2((it ? it.x : c.dentro[0]) - e.pos.x, (it ? it.z : c.dentro[1]) - e.pos.z) };
      e.data.tapia.then = () => {
        this.tapiar(c);
        g.flags['tapia:' + c.puerta] = true;
        g.saveGame();
        then ? then() : this.marcha();
      };
      e.state = 'tapia';
      e.stT = 0;
      this.say(DIALOG.fisicoTapia, 3.4);
    }, { r: 0.5 });
  }
  // Las tablas, por fuera (y la cruz de cal encima).
  tapiar(c, instant = false) {
    const g = this.g;
    const it = g.interact.list.find((i) => i.id === c.puerta);
    if (!it || it.tapiada) return;
    g.interact.tapiar(it, c.lado);
    if (!instant) g.ui.toast(MSG.tapiada || 'Al otro lado, alguien termina de clavar la puerta.', 3.5);
  }

  // ------------------------------------------------------------ música
  setMusic(kind) {
    const g = this.g;
    if (kind === this.music || !g.audio) return;
    this.music = kind;
    if (kind === 'caza') g.audio.music('bossCellar');
    else if (kind === 'busca') g.audio.music('cellarHunt');
    else g.audio.stopMusic();
  }

  // ------------------------------------------------------------ la camilla
  // (fisico_cine.js; hasta que esté, te mata)
  captura() {
    const g = this.g;
    if (g.fisicoCine && g.fisicoCine.camilla) return g.fisicoCine.camilla(this);
    g.player.die && g.player.die();
  }

  // ------------------------------------------------------------ cada fotograma
  update(dt) {
    const g = this.g;
    const e = this.e;
    if (!e || g.flags['boss:fisico']) return;
    const p = g.player;
    const F = g.flags;
    this.t += dt;
    if (this.blind > 0) this.blind -= dt;
    // el sueño se pasa poco a poco
    if (e.state !== 'sedando') this.sleep = Math.max(0, this.sleep - dt * 0.35);
    if (g.post && g.post.U.uSleep) {
      g.post.U.uSleep.value = this.sleep;
      g.post.U.uBlind.value = this.blind > 0 ? Math.min(1, this.blind) : 0;
    }
    if (p.dead || this.modo === 'cine' || this.modo === 'pelea') return;
    const inB = this.enBarrio(p.pos);
    // ---- el guion
    // (la cortina: al pasar el portón, la primera vez)
    if (!F['fisico:intro'] && F['door:d_porton'] && inR(BR.calleja, p.pos.x, p.pos.z) && p.pos.x > 15.6 && p.pos.y < 1) {
      if (g.fisicoCine && g.fisicoCine.cortina) g.fisicoCine.cortina(this);
      else F['fisico:intro'] = true;
      return;
    }
    // (al fondo de la calleja, la primera vez que pasas de la del zapatero)
    if (F['fisico:intro'] && !F['fisico:calleja'] && this.modo === 'fuera' && inR(BR.calleja, p.pos.x, p.pos.z) && p.pos.x > 22.5 && p.pos.y < 1) {
      F['fisico:calleja'] = true;
      this.calleja();
      return;
    }
    // (la viuda: mientras estás arriba, te clava la puerta)
    const casa = this.casaDe(p.pos);
    if (casa && casa.zona === 'viuda' && p.pos.y > 3) this.upT += dt;
    if (!F['fisico:viuda'] && this.modo === 'fuera' && casa && casa.zona === 'viuda' && p.pos.y > 3 && (this.upT > 25 || F['take:i_llave_tinte'])) {
      F['fisico:viuda'] = true;
      this.viuda();
      return;
    }
    // (la tintorería: entra detrás de ti y empieza la caza)
    if (casa && casa.zona === 'tintoreria_pellejeros') this.inT += dt;
    if (!F['fisico:caza'] && F['door:d_tinte'] && casa && casa.zona === 'tintoreria_pellejeros' && (p.pos.y > 3 || this.inT > 12) && this.modo !== 'tapia') {
      F['fisico:caza'] = true;
      g.saveGame();
      this.tintoreria();
      return;
    }
    // ---- fuera del barrio: se va
    if (!inB) {
      if (this.shown && this.modo !== 'marcha') this.marcha();
      if (this.modo === 'fuera') this.setMusic(null);
      return;
    }
    switch (this.modo) {
      case 'fuera': {
        this.cool -= dt;
        if (this.cool > 0) break;
        if (this.alarm) {
          const A = this.alarm;
          this.alarm = null;
          if (F['fisico:caza']) {
            this.aparece(A.x, A.z, null, e.T.walk * 1.35);
            this.busca(A.x, A.z);
          } else if (F['fisico:calleja']) this.vigila(A.x, A.z);
          break;
        }
        // cazando, por los tejados: sale a acompañarte
        if (F['fisico:caza'] && this.enTejado(p.pos)) {
          const E = this.entrada(p.pos.x, p.pos.z);
          this.show(E.x, E.z, E.yaw);
          this.sombra();
        }
        break;
      }
      case 'vigia': {
        // antes de la caza no se deja alcanzar
        if (e.distTo(p.pos) < 7 && Math.abs(p.pos.y - e.pos.y) < 2) {
          this.say(DIALOG.fisicoTodavia, 2.6);
          this.marcha();
        }
        break;
      }
      case 'sombra':
        this.updateSombra(dt);
        break;
      case 'busca': {
        // si te ve buscando, a por ti
        if (e.sees && !this.enTejado(p.pos)) {
          e.aware = true;
          e.state = 'chase';
          e.stT = 0;
          this.modo = 'caza';
          this.setMusic('caza');
          this.say(DIALOG.fisicoVe, 3);
        }
        break;
      }
      case 'caza':
        if (e.state === 'camina' || e.state === 'mira') {
          e.aware = true;
          e.state = 'chase';
        }
        break;
    }
  }

  // ------------------------------------------------------------ escenas
  // Al fondo de la calleja: sale de la esquina de la plazuela, te mira,
  // ladea la cabeza y se vuelve.
  calleja() {
    this.show(38.0, 40.0, -2.3);
    this.modo = 'vigia';
    this.walk(35.8, 43.8, null, () => {
      this.say(DIALOG.fisicoCalleja, 3.6);
      this.look(4.5, () => this.marcha(), { clip: 'ladea' });
    }, { face: -Math.PI / 2 });
  }
  // La viuda: te clava la puerta mientras estás arriba; luego se va por la
  // calleja, y se para a mirar tu ventana.
  viuda() {
    const c = CASAS.find((k) => k.zona === 'viuda');
    this.show(25.2, 44.6, 0);
    this.modo = 'tapia';
    const e = this.e;
    e.data.tapia = {
      t: 6.5,
      x: 25.2,
      z: 46.0,
      face: 0,
      then: () => {
        this.tapiar(c);
        this.g.flags['tapia:' + c.puerta] = true;
        this.g.saveGame();
        this.modo = 'vigia';
        this.walk(30.0, 44.0, null, () => {
          this.say(DIALOG.fisicoViudaVentana, 3.6);
          this.look(3.2, () => this.marcha(), { x: 27.4, z: 46.0, clip: 'ladea' });
        });
      },
    };
    e.state = 'tapia';
    e.stT = 0;
    this.say(DIALOG.fisicoTapia, 3.4);
  }
  // La tintorería: entra por la puerta, detrás de ti.
  tintoreria() {
    const e = this.e;
    this.show(40.0, 39.6, Math.PI);
    this.modo = 'caza';
    this.setMusic('caza');
    this.say(DIALOG.fisicoTintoreria, 3.6);
    e.aware = true;
    e.state = 'alert';
    e.stT = 0;
    e.anim.play(FI_CLIPS.alert, { blend: 0.15 });
    this.last = [this.g.player.pos.x, this.g.player.pos.y, this.g.player.pos.z];
  }
}

export { CASAS, ENTRADAS, CALLES };
