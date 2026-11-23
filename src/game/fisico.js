// El Físico de los Inocentes: la cabeza del barrio de los Pellejeros.
//
// Mestre Clemente (entities/fisico.js) no es una criatura que espera en su
// sitio: el barrio es suyo y lo recorre. Esto decide dónde está y qué hace.
//
//  - Te vigila desde el principio: la cortina (fisico_cine.js), y luego
//    sale de su casa, viene andando hasta el fondo de la rúa, te mira, ladea
//    la cabeza y se vuelve. Antes de la caza no se deja alcanzar: si te
//    acercas, se marcha.
//  - Cuarentena: mientras estás arriba, en casa de la cerera, baja la rúa y
//    clava tablas en su puerta por fuera; y, cazando, tapia la puerta de la
//    casa en la que te has metido (si tiene otra salida).
//  - La caza empieza en la tintorería (entra detrás de ti). Desde entonces,
//    lo que hace ruido le trae: los cascabeles de un Coronado, las
//    campanillas de una cuerda, un cepo que salta, una puerta que se arranca
//    (trampas.js). Sale de su casa, por su puerta (es la única: se le ve
//    salir), va a donde fue el ruido, husmea, te busca por donde estuviste la
//    última vez y, si no te encuentra, se vuelve a su casa andando (y vuelve
//    a salir).
//  - Por los tejados no te sigue: te acompaña desde la calle, debajo, sin
//    quitarte los ojos de encima.
//  - Su vida es una sola, la de la calle y la de su quirófano: lo que le
//    hagas se queda. Herido, te echa la cal a los ojos y se retira a su casa;
//    con la mitad de la vida o menos se encierra en ella y te espera en la
//    sala grande, donde la pelea empieza con la vida que le quedó.
//  - Quiere atraparte, no matarte: el gancho de la vara te trae, la esponja
//    te duerme (forcejea) y, si te duermes, la camilla (fisico_cine.js).
//  - Habla siempre bajo, sin prisa: piensa en voz alta (story.js, DIALOG).
//  - Te estudia: lleva tu historia clínica (fisico_historia.js), en la calle
//    y en su sala, y la usa (barre hacia donde ruedas, retiene el golpe si te
//    adelantas, amaga...); la hoja de su mesa crece con lo que apunta.
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { BR } from '../world/level_barrio.js';
import { DIALOG, MSG, NOTA_VIVA } from './story.js';
import { FI_CLIPS, fiSay, fiGrp } from '../entities/fisico.js';
import { PeleaFisico, EN_SU_MESA } from './fisico_pelea.js';
import { Historia } from './fisico_historia.js';
import { RETIENE } from './fisico_mente.js';
import { clamp } from '../core/util.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const inR = (r, x, z, m = 0) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m;
// el barrio entero (lo que él tiene por suyo)
const BARRIO = { x0: 14, z0: 3, x1: 73, z1: 58 };
// las calles (a ras de suelo), por donde anda
const CALLES = [BR.rua, BR.plazuela];
// las casas en las que entra a buscarte: su zona, su puerta y, delante y
// detrás de la puerta, dónde se pone (para tapiarla: el lado de fuera)
const CASAS = [
  { zona: 'zapatero', puerta: 'd_zapatero', fuera: [27.0, 42.0], dentro: [27.0, 40.0], lado: 1, otra: 'd_zapatero_corral' },
  { zona: 'viuda', puerta: 'd_viuda', fuera: [27.5, 47.0], dentro: [27.5, 49.0], lado: -1, otra: 'd_viuda_patio' },
  { zona: 'tintoreria_pellejeros', puerta: 'd_tinte', fuera: [40.0, 42.0], dentro: [40.0, 40.0], lado: 1, otra: null },
];
// por dónde sale y por dónde se va: la puerta de su casa, a la plazuela (no
// sale de las casas de los otros: sale de la suya, a la vista, y vuelve a
// ella andando; se le puede ver venir y seguir hasta su puerta); yaw,
// saliendo a la calle
const ENTRADAS = [{ id: 'casa', x: 48.7, z: 46.5, yaw: -Math.PI / 2 }];
// (dentro de su casa, tras su puerta: donde se pone al volver a ella)
const ZAGUAN = { x: 51.0, z: 46.5 };
// cuánto tarda en volver tras irse (s), y lo que le aguanta a uno antes de
// retirarse (de su vida, en una aparición)
const VUELVE = [22, 38];
const AGUANTA = 0.2;
// Su vida es una sola, la de la caza y la de su quirófano (flags
// 'fisico:vida'): lo que le hagas en la calle se queda, y no se cura al
// volver a salir. Con la mitad o menos se encierra en su casa y ya no sale
// (flags 'fisico:encerrado'): te espera en su quirófano, y la pelea empieza
// en el tiempo que le toque. En la calle nunca baja de un cuarto (lo último,
// el fuego, se pelea en su casa).
const ENCIERRA = 0.5;
const SUELO = 0.25;

export class Fisico {
  constructor(g) {
    this.g = g;
    this.e = g.enemies.find((x) => x.type === 'fisico') || null;
    // la pelea de su quirófano (fisico_pelea.js)
    this.pelea = new PeleaFisico(g, this);
    // (la hoja de su mesa: lo que tiene apuntado de ti, debajo)
    NOTA_VIVA.historia = () => (g.flags && g.flags['fisico:historia'] ? this.H.texto() : '');
    this.reset();
  }
  // La historia clínica: lo que tiene apuntado de ti, en la partida (flags
  // 'fisico:historia'; al cargar otra, la de esa).
  get H() {
    const f = this.g.flags;
    const d = f['fisico:historia'];
    if (!this._H || this._H.d !== d) {
      this._H = new Historia(d);
      f['fisico:historia'] = this._H.d;
    }
    return this._H;
  }
  // Lo que haces delante de él (game.onPlayerAction): rodar, desviar,
  // cubrirte, beber, golpear.
  observa(kind, info) {
    const e = this.e;
    const g = this.g;
    if (!e || !this.shown || g.flags['boss:fisico'] || (this.modo !== 'caza' && this.modo !== 'pelea')) return;
    const p = g.player;
    const d = e.distTo(p.pos);
    if (d > 9 || Math.abs(p.pos.y - e.pos.y) > 2) return;
    this.H.accion(kind, info || {}, { t: g.time, px: p.pos.x, pz: p.pos.z, ex: e.pos.x, ez: e.pos.z, hpK: p.hp / p.maxHp, d });
  }
  // Lo que ha pasado con un golpe suyo que llegaba (combat.apply: 'hit',
  // 'block', 'guardbreak', 'parry', 'dodge').
  onStrike(e, a, r) {
    if (this.modo !== 'caza' && this.modo !== 'pelea') return;
    const R = r === 'hit' ? 'entra' : r === 'block' ? 'cubre' : r === 'guardbreak' ? 'rompe' : r === 'parry' ? 'desvia' : r === 'dodge' ? 'esquiva' : null;
    const G = this.H.golpe;
    // (te ha dado donde lo esperaba: has rodado adonde sueles, o antes de
    // tiempo, y te ha cogido; lo dice, de vez en cuando)
    if (r === 'hit' && e && (e.aimOff || e.data.reten) && G && G.reac && this.g.time - (this.aciertaT ?? -99) > 25) {
      this.aciertaT = this.g.time;
      this.say(DIALOG.fisicoAcierta, 2.4);
    }
    if (R && a && a.name) this.H.resultado(a.name, R);
  }
  // Lo que pasa, apuntado: 'tejado', 'casa', 'cepo', 'dormido', 'suelta',
  // 'muere'.
  apunta(k) {
    if (this.e && !this.g.flags['boss:fisico']) this.H.evento(k);
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
    this.fraguaT = 0;
    this.huyendo = false;
    this.galeriaDicho = false;
    this.pelea.reset();
    if (this.e && !(this.g.flags && this.g.flags['boss:fisico'])) this.hide();
  }
  // Te has ido del barrio por el otro camino. Si no le has tocado nunca (ni
  // en la calle ni en su sala), se le ha escapado un paciente: se va del
  // barrio detrás de ti, adonde va el agua (game/fisico_rama.js), y deja una
  // nota en su mesa de operar. Si le heriste, se queda en su casa,
  // esperándote, como siempre.
  escapa() {
    const g = this.g;
    const F = g.flags;
    const e = this.e;
    const limpio = !F['fisico:pelea'] && (F['fisico:vida'] == null || F['fisico:vida'] >= e.maxHp);
    if (limpio) {
      F['fisico:escapado'] = true;
      // (y si aún no conoces al de la cloaca, la noche que le conozcas estará
      // allí, detrás de él: game/fisico_rama.js; si ya le conocías, se va del
      // barrio y nada más: «nos veremos donde va el agua»)
      if (!F['desf:met']) {
        F['rama:cisterna'] = true;
        const D = g.desfigurado;
        if (D && D.npc) D.npcReset(D.npc);
      }
      this.fuera(9999);
      g.audio && g.audio.play('campanilla', { x: 42, y: 2, z: 10 });
      g.ui.toast(MSG.fisicoEscapado, 5);
      this.notaIda();
    } else F['fisico:huido'] = true;
    g.saveGame();
  }
  notaIda() {
    const n = this.g.interact.list.find((i) => i.id === 'n_fisico_ida');
    if (!n) return;
    n.hidden = !this.g.flags['fisico:escapado'];
    if (n.obj) n.obj.visible = !n.hidden;
  }
  onRespawn() {
    // (al morir: se va; las tablas que clavó, clavadas siguen; si has caído
    // con él encima, lo apunta)
    if (this.e && this.shown && (this.modo === 'caza' || this.modo === 'pelea')) this.apunta('muere');
    this.reset();
    this.setMusic(null);
  }
  applyFlags() {
    const g = this.g;
    for (const c of CASAS) if (g.flags['tapia:' + c.puerta]) this.tapiar(c, true);
    // (la nota de su mesa de operar: sólo si se le escapó el paciente)
    this.notaIda();
    // (vencido: sentado en su mesa, muerto)
    if (g.flags['boss:fisico']) this.pelea.sentado();
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
    // (sale con la vida que le quedó: no se cura entre una salida y otra)
    e.hp = this.vida;
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
    // (y fuera de escena se queda: el que vuelve a ponerlo todo en su sitio al
    // caer el jugador, Enemy.reset, le dejaba de pie en su quirófano, aunque
    // se hubiera ido del barrio)
    e.spec.held = true;
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
  // La vida que le queda (la de la caza: la pelea de su quirófano empieza con
  // ella y, si caes en ella, vuelve a empezar con ella)
  get vida() {
    const e = this.e;
    const v = this.g.flags['fisico:vida'];
    return e ? Math.max(1, Math.min(e.maxHp, v ?? e.maxHp)) : 0;
  }
  set vida(v) {
    if (this.e) this.g.flags['fisico:vida'] = Math.max(1, Math.min(this.e.maxHp, Math.round(v)));
  }
  get encerrado() {
    return !!this.g.flags['fisico:encerrado'];
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
  // ves; si las ves todas, la más lejana de ti. (Hoy es una sola: la suya.)
  entrada(x, z, salir = false, lejos = 6) {
    const p = this.g.player.pos;
    let best = null,
      bd = Infinity;
    for (const E of ENTRADAS) {
      const dp = Math.hypot(E.x - p.x, E.z - p.z);
      if (dp < lejos) continue;
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
  // (a la vista, como cualquiera: se le puede seguir hasta su puerta; no se
  // esfuma en una esquina)
  marcha(huye = false, encierra = false) {
    const e = this.e;
    if (!this.shown) return this.fuera();
    this.modo = 'marcha';
    e.aware = false;
    const E = encierra ? ENTRADAS[0] : this.entrada(e.pos.x, e.pos.z, true);
    const sp = huye ? e.T.run : e.T.walk * 1.15;
    this.walk(E.x, E.z, sp, () => {
      const g = this.g;
      g.audio && g.audio.play('doorSlam', { x: E.x, y: 1, z: E.z });
      // (encerrado: la tranca, por dentro; ya no sale)
      if (encierra || this.encerrado) {
        this.pelea.luego(0.7, () => g.audio && g.audio.play('chestBar', { x: E.x, y: 1, z: E.z }));
        if (this.enBarrio(g.player.pos)) g.ui.toast(MSG.fisicoEncerrado || 'Al otro lado de la plazuela, una tranca cae en su sitio.', 4);
      }
      this.fuera();
    }, { r: 0.6 });
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
    if (!this.e || g.flags['boss:fisico'] || this.modo === 'pelea' || this.modo === 'cine' || this.encerrado) return;
    if (!this.enBarrio({ x, y, z })) return;
    this.alarm = { x, y, z, src, t: g.time };
    // (si ya anda cerca, va directamente)
    if (this.modo === 'busca' || this.modo === 'marcha' || this.modo === 'sombra') this.busca(x, z, y, src);
    else if (this.modo === 'fuera') this.cool = Math.min(this.cool, src === 'cepo' || src === 'campanillas' ? 1.5 : 3);
  }
  // Va a ver qué ha sido (o a donde te vio por última vez).
  busca(x, z, y = 0, src = null) {
    const g = this.g;
    const e = this.e;
    if (!g.flags['fisico:caza']) return this.vigila(x, z);
    this.modo = 'busca';
    this.setMusic('busca');
    const go = () =>
      this.walk(x, z, e.T.walk * 1.35, () => {
        // llega: husmea, mira alrededor; luego busca donde te vio, o se va
        this.searchN++;
        this.say(src === 'campanillas' ? DIALOG.fisicoCampanillas : DIALOG.fisicoBusca, 3.2);
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
    // (de cerca no se deja ver: si estás junto a su puerta, no sale)
    if (Math.hypot(ENTRADAS[0].x - p.x, ENTRADAS[0].z - p.z) < 10) return;
    // (se pone en la calle, a una distancia, donde le veas; sale por una
    // puerta lejos de ti: de cerca no se deja ver)
    const E = this.entrada(x, z, false, 10);
    this.show(E.x, E.z, E.yaw);
    this.modo = 'vigia';
    const tx = clamp(p.x + Math.sign(E.x - p.x) * 11, BR.rua.x0 + 1, BR.plazuela.x1 - 1);
    const tz = inR(BR.rua, tx, 44.5) ? 44.5 : clamp(p.z, BR.plazuela.z0 + 1, BR.plazuela.z1 - 1);
    this.walk(tx, tz, null, () => {
      // (cogido en un cepo: te mira forcejear, y se va)
      const cepo = g.trampas && g.trampas.held;
      this.say(cepo ? DIALOG.fisicoCepoTodavia : DIALOG.fisicoVigila, 3.4);
      this.look(cepo ? 5 : 4, () => this.marcha(), { clip: 'ladea' });
    }, { r: 1.5 });
  }

  // ------------------------------------------------------------ ganchos
  // Te ve (por primera vez en esta aparición): ¿se te echa encima?
  onWake(e) {
    const g = this.g;
    if (this.modo === 'pelea') return false;
    // (en la cisterna le lleva su guion: game/fisico_rama.js)
    if (this.modo === 'rama') {
      e.aware = true;
      return true;
    }
    // antes de la caza, no: se queda mirándote (y encerrado en su sala, te
    // espera: no sale a por ti)
    if (!g.flags['fisico:caza'] || this.modo === 'sombra' || this.modo === 'vigia' || this.modo === 'marcha' || this.modo === 'espera') {
      e.aware = false;
      return true;
    }
    this.modo = 'caza';
    this.setMusic('caza');
    this.say(DIALOG.fisicoVe, 3);
    e.anim.play(FI_CLIPS.alert, { blend: 0.15 });
    // (un encuentro nuevo, para su historia: lo viejo pesa menos)
    if (g.time - (this.encuentroT ?? -999) > 60) this.H.encuentro('caza');
    this.encuentroT = g.time;
    return false;
  }
  // Persiguiéndote: lo que piensa (lo demás, el tipo: los golpes).
  think(e, pl, d, dt) {
    const g = this.g;
    if (this.modo === 'pelea') return this.pelea.think(e, pl, d, dt);
    if (this.modo === 'rama') return 'handled';
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
    const cepo = g.trampas && g.trampas.held;
    if (cepo && e.sees && d < 9 && this.cepoDicho !== cepo) {
      this.cepoDicho = cepo;
      this.apunta('cepo');
      this.say(DIALOG.fisicoCepo, 3);
    } else if (this.sayT <= 0 && e.sees && d < 12) this.say(d < 4 ? DIALOG.fisicoCerca : DIALOG.fisicoVe, 3);
    // la cal, sólo cuando se va a retirar (o en la pelea)
    e.data.calOk = !!e.data.retirada || this.modo === 'pelea';
    return null;
  }
  // Fuera de la pelea no muere, pero lo que le hagas se queda: aguanta un
  // poco y se retira (herido, más deprisa); con la mitad o menos, se encierra
  // en su casa. En la calle no baja de un cuarto.
  preHit(e, dmg, poise) {
    if (this.modo === 'pelea') return this.pelea.preHit(e, dmg, poise);
    const suelo = Math.ceil(e.maxHp * SUELO);
    const d = Math.max(0, Math.min(dmg, e.hp - suelo));
    const queda = e.hp - d;
    if (!e.data.retirada && (this.hp0 - queda > e.maxHp * AGUANTA || queda <= e.maxHp * ENCIERRA)) {
      e.data.retirada = true;
      this.retirada(queda <= e.maxHp * ENCIERRA);
      return { dmg: d, poise: 0 };
    }
    return d !== dmg ? { dmg: d, poise } : null;
  }
  onHit(e, r) {
    if (this.modo === 'pelea' || this.modo === 'cine' || this.modo === 'rama') return;
    // (lo que le has hecho, apuntado: el golpe de gracia no pasa por preHit,
    // y tampoco le deja en la calle por debajo de un cuarto)
    const suelo = Math.ceil(e.maxHp * SUELO);
    if (e.hp < suelo) e.hp = suelo;
    if (e.hp < this.vida) this.vida = e.hp;
    if (!e.data.retirada && e.hp <= e.maxHp * ENCIERRA) {
      e.data.retirada = true;
      this.retirada(true);
    }
    // (herido, te busca: aunque no te viera)
    if (r === 'hit' && this.g.flags['fisico:caza'] && !e.aware && !e.data.retirada && this.modo !== 'marcha' && this.modo !== 'pelea') {
      e.aware = true;
      e.state = 'chase';
      this.modo = 'caza';
    }
  }
  // Herido: la cal a los ojos (si estás cerca) y se va, deprisa, a su casa.
  // Con la mitad de la vida o menos (encierra), ya no vuelve a salir: se
  // encierra y te espera en su quirófano.
  retirada(encierra = false) {
    const e = this.e;
    const g = this.g;
    this.say(encierra ? DIALOG.fisicoEncierra : DIALOG.fisicoHerido, 3.4);
    if (encierra) {
      g.flags['fisico:encerrado'] = true;
      this.alarm = null;
    }
    this.vida = e.hp;
    g.saveGame();
    const d = e.distTo(g.player.pos);
    const go = () => {
      e.data.retirada = true;
      this.marcha(true, encierra);
      this.cool = 55;
    };
    if (d < 5.5 && e.state !== 'attack') {
      e.state = 'attack';
      e.atk = null;
      e.startAttack({ ...e.T.attacks.find((a) => a.name === 'cal'), cond: null });
      // (en tiempo de juego: en pausa, espera)
      this.pelea.luego(1.5, go);
    } else go();
  }
  onHook() {
    this.say(DIALOG.fisicoGancho, 2.4);
    this.onStrike(this.e, { name: 'gancho' }, 'hit');
  }
  onSponge() {
    this.onStrike(this.e, { name: 'esponja' }, 'hit');
    this.sleep = 0;
    this.say(DIALOG.fisicoEsponja, 2.6);
    const g = this.g;
    g.qte && g.qte.start({ action: 'light', label: MSG.forcejea || '¡Forcejea!', mash: 9, window: 2.8, slow: 1, lenient: true, onDone: () => {} });
  }
  onSpongeEscape() {
    this.apunta('suelta');
    this.sleep = 0;
    this.say(DIALOG.fisicoSuelta, 2.6);
  }
  // Se duerme: la camilla (o, en la pelea, un buen rato indefenso).
  onAsleep(e) {
    const g = this.g;
    this.apunta('dormido');
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
      this.onStrike(e, { name: 'cal' }, 'hit');
      g.ui.toast(MSG.calOjos || 'La cal en los ojos: no ves nada.', 2.5);
    }
  }
  // Cada fotograma del cuerpo (desde su update).
  updateBody(e, dt, pl) {
    // mirando hacia arriba (te sigue por los tejados)
    e.data.lookUp = this.modo === 'sombra' && pl.pos.y - e.pos.y > 2.5;
    // la historia: sus golpes (lo que haces al verlos venir), y lo que te
    // alejas (si huyes herido)
    if (this.modo === 'caza' || this.modo === 'pelea') {
      const H = this.H;
      const g = this.g;
      if (e.state === 'attack' && e.atk && e.atkSerial !== this.serialVisto) {
        this.serialVisto = e.atkSerial;
        const a = e.atk;
        const first = a.hits && a.hits.length ? a.hits[0][0] : a.events && a.events.length ? a.events[0].t : a.dur * 0.5;
        // (retenido, el impacto llega más tarde)
        const ret = e.data.reten ? first * RETIENE.hasta * (1 / RETIENE.paso - 1) : 0;
        H.ataca(a.name, g.time, first + ret, a.dur + ret, !!e.data.amago);
      } else if (e.state !== 'attack' && H.golpe) H.cierra();
      this.muestraT = (this.muestraT ?? 0) - dt;
      if (this.muestraT <= 0) {
        const d = e.distTo(pl.pos);
        H.muestra(0.25, d, (d - (this.prevD ?? d)) / 0.25, pl.hp / pl.maxHp);
        this.prevD = d;
        this.muestraT = 0.25;
      }
    }
    if (this.modo === 'pelea' || this.modo === 'caza') this.pelea.cuerpo(e, dt, pl);
  }

  // ------------------------------------------------------------ guion
  // Te sigue por la calle mientras vas por los tejados.
  sombra() {
    const e = this.e;
    if (this.modo === 'sombra') return;
    if (this.modo === 'caza') this.apunta('tejado');
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
    if (bd > 14) best = [41.8, 46.4];
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
    if (this.modo === 'caza') this.apunta('casa');
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
    this.pelea.update(dt);
    // (su barra, también en la calle mientras te caza: lo que le haces se
    // queda, y se ve)
    if (e.D) e.D.barra = this.shown && (this.modo === 'caza' || this.modo === 'marcha') && !!F['fisico:caza'];
    // (se le ha escapado un paciente sin que le tocara: se ha ido del barrio
    // a buscarle donde va el agua; lo de la cisterna lo lleva
    // game/fisico_rama.js)
    if (F['fisico:escapado']) {
      if (this.modo !== 'rama' && this.modo !== 'fuera') this.fuera(9999);
      return;
    }
    if (p.dead || this.modo === 'cine' || this.modo === 'pelea') return;
    // (te vas sin la llave, por el otro camino: el ventano de la tintorería y
    // la trampilla del almacén, y por dentro de la cordelería a los Pelames)
    if (F['fisico:caza'] && F['hatch:almacen'] && !F['fisico:huido'] && p.pos.z < 2.6 && p.pos.x > 36 && p.pos.x < 47 && p.pos.y < 2) {
      this.escapa();
      return;
    }
    const inB = this.enBarrio(p.pos);
    // (la pelea: en su quirófano; no recién soltado de su mesa: hasta que
    // no sale de la casa, huye)
    if (this.huyendo && this.g.zoneAt(p.pos)?.id !== 'casa_inocentes') this.huyendo = false;
    if (F['fisico:caza'] && !this.huyendo && this.modo !== 'fragua' && this.pelea.quiere(p)) {
      this.pelea.empieza();
      return;
    }
    // (encerrado y herido: te espera en su sala grande, en su mesa, cosiéndose
    // la herida; se le ve desde la galería y al entrar)
    if (this.encerrado && this.modo === 'fuera' && this.g.zoneAt(p.pos)?.id === 'casa_inocentes') {
      this.espera();
      return;
    }
    if (this.modo === 'espera') {
      // (te ve asomado a la galería: que bajes)
      if (!this.galeriaDicho && p.pos.y > 3.5 && p.pos.y < 6 && inR(BR.sala, p.pos.x, p.pos.z)) {
        this.galeriaDicho = true;
        this.say(DIALOG.fisicoEsperaGaleria, 3.4);
      }
      return;
    }
    // ---- el guion
    // (la cortina: al pasar el portón, la primera vez)
    if (!F['fisico:intro'] && F['door:d_porton'] && inR(BR.rua, p.pos.x, p.pos.z) && p.pos.x > 15.6 && p.pos.y < 1) {
      if (g.fisicoCine && g.fisicoCine.cortina) g.fisicoCine.cortina(this);
      else F['fisico:intro'] = true;
      return;
    }
    // (al fondo de la rúa, la primera vez que pasas de la del zapatero)
    if (F['fisico:intro'] && !F['fisico:calleja'] && this.modo === 'fuera' && inR(BR.rua, p.pos.x, p.pos.z) && p.pos.x > 22.5 && p.pos.y < 1) {
      F['fisico:calleja'] = true;
      this.calleja();
      return;
    }
    // (la viuda: mientras estás arriba, te clava la puerta)
    const casa = this.casaDe(p.pos);
    if (casa && casa.zona === 'viuda' && p.pos.y > 3) this.upT += dt;
    // (tarda en bajar la rúa desde su casa: sale a los doce segundos de subir)
    if (!F['fisico:viuda'] && this.modo === 'fuera' && casa && casa.zona === 'viuda' && p.pos.y > 3 && (this.upT > 12 || F['take:i_llave_tinte'])) {
      F['fisico:viuda'] = true;
      this.viuda();
      return;
    }
    // (la tintorería: entra detrás de ti y empieza la caza)
    if (casa && casa.zona === 'tintoreria_pellejeros') this.inT += dt;
    if (!F['fisico:caza'] && F['door:d_tinte'] && casa && casa.zona === 'tintoreria_pellejeros' && (p.pos.y > 3 || this.inT > 12 || F['campanillas:b_tinte']) && this.modo !== 'tapia') {
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
        // (encerrado en su casa: ya no sale; te espera en su quirófano)
        if (this.encerrado) break;
        this.cool -= dt;
        if (this.cool > 0) break;
        if (this.alarm) {
          const A = this.alarm;
          this.alarm = null;
          if (F['fisico:caza']) {
            this.aparece(A.x, A.z, null, e.T.walk * 1.35);
            this.busca(A.x, A.z, A.y < 1 ? 0 : A.y, A.src);
          } else if (F['fisico:calleja'] || A.src === 'cepo') this.vigila(A.x, A.z);
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
      // (te has soltado de la mesa: él sigue en la fragua, y vuelve)
      case 'fragua':
        this.fraguaT -= dt;
        if (this.fraguaT <= 0) this.vuelveFragua();
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

  // Encerrado en su casa, herido: en su mesa, de espaldas a la puerta,
  // cosiéndose (ordena sus hierros); no sale a por ti.
  espera() {
    const e = this.e;
    this.show(EN_SU_MESA.x, EN_SU_MESA.z, Math.atan2(BR.mesa.x - EN_SU_MESA.x, BR.mesa.z - EN_SU_MESA.z));
    this.modo = 'espera';
    e.aware = false;
    e.state = 'mira';
    e.stT = 0;
    e.data.look = { t: 1e9, x: BR.mesa.x, z: BR.mesa.z, track: false };
    e.anim.play(FI_CLIPS.ordena, { blend: 0.2 });
    this.setMusic(null);
  }

  // Vuelve de la fragua y la mesa está vacía: a buscarte (por su casa,
  // primero; si te ve, a por ti).
  vuelveFragua() {
    const g = this.g;
    const e = this.e;
    const M = BR.mesa;
    this.show(M.x, 35.0, 0);
    this.setMusic('busca');
    this.say(DIALOG.fisicoSuelto, 3.2);
    this.last = [M.x, 0, M.z + 0.8];
    this.searchN = 0;
    const d = g.interact.list.find((i) => i.id === 'd_quirofano_patio');
    if (d) g.interact.setOpen(d, true);
    g.audio && g.audio.play('doorOpen', { x: M.x, y: 1, z: 34.3 });
    if (e.T.perceive(e, g.player)) {
      this.modo = 'caza';
      this.setMusic('caza');
      e.aware = true;
      e.state = 'chase';
      e.stT = 0;
      return;
    }
    // (si no te ve: a la puerta de la calle, por donde huiría cualquiera; y
    // de allí, a buscarte)
    this.busca(ZAGUAN.x, ZAGUAN.z, 0);
  }

  // ------------------------------------------------------------ escenas
  // Al fondo de la rúa: sale de su casa, viene andando hasta donde la rúa
  // se abre a la plazuela, te mira, ladea la cabeza y se vuelve a su puerta.
  calleja() {
    const E = ENTRADAS[0];
    this.show(E.x, E.z, E.yaw);
    this.g.audio && this.g.audio.play('doorOpen', { x: E.x, y: 1, z: E.z });
    this.modo = 'vigia';
    this.walk(36.4, 44.5, this.e.T.walk * 1.25, () => {
      this.say(DIALOG.fisicoCalleja, 3.6);
      this.look(4.5, () => this.marcha(), { clip: 'ladea' });
    }, { face: -Math.PI / 2 });
  }
  // La viuda: te clava la puerta mientras estás arriba; luego se va por la
  // calleja, y se para a mirar tu ventana.
  // (sale de su casa y baja la rúa hasta la puerta de la cerera; la clava; y
  // se para a mirar la ventana de la sala)
  viuda() {
    const c = CASAS.find((k) => k.zona === 'viuda');
    const E = ENTRADAS[0];
    const e = this.e;
    this.show(E.x, E.z, E.yaw);
    this.g.audio && this.g.audio.play('doorOpen', { x: E.x, y: 1, z: E.z });
    this.modo = 'tapia';
    this.walk(c.fuera[0], c.fuera[1], e.T.walk * 1.6, () => {
      e.data.tapia = {
        t: 6.5,
        x: c.fuera[0],
        z: 48.0,
        face: 0,
        then: () => {
          this.tapiar(c);
          this.g.flags['tapia:' + c.puerta] = true;
          this.g.saveGame();
          this.modo = 'vigia';
          this.walk(30.6, 45.4, null, () => {
            this.say(DIALOG.fisicoViudaVentana, 3.6);
            this.look(3.2, () => this.marcha(), { x: 24.5, z: 48.0, clip: 'ladea' });
          });
        },
      };
      e.state = 'tapia';
      e.stT = 0;
      this.say(DIALOG.fisicoTapia, 3.4);
    }, { r: 0.5 });
  }
  // La tintorería: entra por la puerta, detrás de ti.
  tintoreria() {
    const e = this.e;
    const c = CASAS.find((k) => k.zona === 'tintoreria_pellejeros');
    this.show(c.fuera[0], c.fuera[1], Math.PI);
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

export { CASAS, ENTRADAS, CALLES, ZAGUAN };
