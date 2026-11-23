// La rama de la cisterna: el Físico al que se le escapó el paciente.
//
// Si te vas del barrio de los Pellejeros sin pelear con él y sin haberle
// tocado nunca (por el ventano de la tintorería y la trampilla del almacén
// del cáñamo: game/fisico.js, escapa), no te espera en su casa: se va detrás
// de ti, adonde va el agua, con los mejores de su rebaño, y para entonces ya
// sabe más (de ti: su historia clínica; y de lo suyo: ha empezado a cambiarse
// a sí mismo, entities/fisico.js, el grupo 'evol').
//
// Esa noche, en la cisterna de la cloaca, el Desfigurado no está en la isla:
// está arriba, en el pretil del rellano, sobre la cascada (oye cascabeles por
// el canal y quiere verlos venir). Te habla allí, te da la flor y te dice que
// sigas el agua. Cuando bajas a la sala, la escena (una cita del final de
// Scarface): él, en lo alto, con los brazos abiertos, hablándole a la luz y a
// ti; detrás, de lo oscuro de la galería, sale el Físico sin hacer ruido (los
// cascabeles, tapados con cera); «Hermosa...», y la hoja de amputar le sale
// por el pecho; cae, a cámara lenta, por la cascada, a la alberca, y se queda
// boca abajo, en cruz, en el agua, que se tiñe. Arriba, el Físico le mira, te
// mira y te habla; detrás de él se extiende la bruma negra (game/bruma_negra.js), cae
// por el pretil y cubre el suelo; toca la campanilla y de la bruma salen sus
// monstruosidades: los Coronados de la bruma (entities/coronado.js), que
// obedecen a la campanilla: una vez, cercad; dos, sujetadle; tres, todos a
// una (y si uno te sujeta, las tres, enseguida).
//
// La pelea, en la sala, con las dos salidas cerradas por la bruma y él en lo
// alto, donde no se le alcanza: dos tandas de tres. Al acabar, te dice dónde
// te espera (abajo, donde va el agua) y se va por la galería con su bruma. Si
// caes, vuelve a empezar al volver a bajar (sin la escena). Del Desfigurado
// queda el cuerpo en la alberca: en el cordón del cuello, la llave de la reja
// que no quería darte; y en su botica, su cuaderno, que te deja su mesa.
//
// Banderas: fisico:escapado (se le escapó), desf:muerto (la escena), rama:bruma
// (vencidos los de la bruma).
import * as THREE from 'three';
import { DIALOG, MSG } from './story.js';
import { CLOACA } from '../world/cloaca.js';
import { FI_CLIPS, fiGrp, fiSay } from '../entities/fisico.js';
import { damp, dampAngle, clamp, lerp } from '../core/util.js';
import { BrumaNegra } from './bruma_negra.js';
import { DueloFisico } from './fisico_duelo.js';

const SA = CLOACA.sala;
const R = SA.rellano;
const YR = CLOACA.tunel.y;
const YS = SA.y;
const AGUA = CLOACA.canal.agua;
const PRE = CLOACA.pretil;
const FLO = CLOACA.flota;
const TAU = Math.PI * 2;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
// el Físico: de lo oscuro del andén de poniente de la galería; por el
// rellano, a la espalda del Desfigurado; y luego, en el pretil
const SALE = { x: -15.2, z: 6.2 };
const PASO = { x: -15.1, z: 9.35 };
const ESPALDA = { x: PRE.x - Math.sin(PRE.yaw) * 0.74, z: PRE.z - Math.cos(PRE.yaw) * 0.74 };
const ARRIBA = { x: PRE.x - 0.05, z: PRE.z - 0.12 };
// la altura de la escalera de la sala (de su pie, en la sala, a lo alto, en
// el rellano)
const yEsc = (x) => YS + ((x - SA.esc.x) / (R[2] - SA.esc.x)) * (YR - YS);
// de dónde salen los de la bruma: por la escalera (bajando de la bruma del
// rellano) y por la galería del desagüe
const SALIDAS = [
  { x: -10.8, z: SA.esc.z },
  { x: -0.8, z: 23.4 },
  { x: -9.4, z: SA.esc.z },
  { x: -0.8, z: 24.6 },
  { x: -11.9, z: SA.esc.z },
  { x: -0.8, z: 24.0 },
];
// las tomas de la escena: de t0 a t1, la cámara de a a b, mirando de la a lb,
// con su abertura; y la luz (la de la luna que rebota en el agua de la
// alberca: game.bossLight, fría), donde la ponga cada una [x, y, z, fuerza].
// (desde la sala no se ve lo de detrás del pretil si no se mira de lejos y
// desde arriba; en la isla, la higuera; y en -12.4, 13.4, un pilar)
const TOMAS = [
  // 1. él, en lo alto, con los brazos abiertos, contra el arco de la galería
  { t0: 0, t1: 5.2, a: [-14.6, -6.7, 15.4], b: [-14.4, -6.35, 13.8], la: [-13.95, -4.0, 10.1], lb: [-13.95, -3.9, 10.1], fov: 38, luz: [-13.2, -4.2, 12.4, 1.4] },
  // 2. detrás, de lo oscuro de la galería, sale el Físico
  { t0: 5.2, t1: 8.4, a: [-11.2, -3.95, 11.9], b: [-11.5, -3.9, 11.6], la: [-14.5, -3.75, 9.0], lb: [-14.3, -3.8, 9.5], fov: 40, luz: [-13.2, -4.2, 12.4, 1.4] },
  // 3. «Hermosa...», de frente: la hoja le sale por el pecho
  { t0: 8.4, t1: 10.4, a: [-13.4, -3.85, 12.95], b: [-13.45, -3.85, 12.75], la: [-14.0, -3.55, 9.9], lb: [-14.02, -3.6, 9.95], fov: 42, luz: [-13.2, -4.2, 12.4, 1.6] },
  // 4. la caída, a cámara lenta (la cámara le sigue)
  { t0: 10.4, t1: 13.6, a: [-10.6, -6.7, 11.9], b: [-10.8, -6.9, 11.8], la: [-13.9, -4.4, 10.3], lb: [-13.6, -8.9, 11.2], fov: 55, sigue: true, luz: [-14.4, -6.9, 12.3, 1.8] },
  // 5. boca abajo, en cruz, en la alberca, desde arriba (a ras del agua no se
  // ve: la capa, oscura, de canto); y la cámara se aparta y sube hasta él, en
  // el pretil, mirándole (acaba donde empieza la siguiente: una sola toma)
  { t0: 13.6, t1: 18.0, a: [-13.5, -5.9, 13.3], b: [-14.3, -6.9, 14.8], la: [-13.3, -9.0, 11.85], lb: [-14.0, -3.7, 9.95], fov: 46, sube: [15.4, 17.6], luz: [-14.4, -6.9, 12.3, 1.8] },
  // 6. el Físico, en el pretil; detrás, la bruma
  { t0: 18.0, t1: 23.5, a: [-14.3, -6.9, 14.8], b: [-14.15, -6.8, 14.2], la: [-14.0, -3.7, 9.95], lb: [-14.0, -3.6, 9.95], fov: 38, luz: [-13.4, -4.6, 12.0, 1.3] },
  // 7. la campanilla; y de la bruma, ellos, por la escalera (la luz, al pie)
  { t0: 23.5, t1: 27.0, a: [-4.4, -6.8, 15.6], b: [-4.9, -6.9, 15.1], la: [-10.6, -7.0, 10.2], lb: [-10.8, -7.2, 10.4], fov: 56, luz: [-9.8, -7.0, 11.4, 1.5] },
];
// (en la pelea, la luz se queda sobre él, en el pretil)
const LUZ_PELEA = [-13.4, -4.6, 12.0, 1.0];

// Su muerte: adonde va (la luz de la luna, en la isla, donde estaba siempre
// el otro), de dónde vienen sus pasos (siempre los mismos: el corte de la
// primera toma lo esconde) y dónde estás tú, a un lado. Anda a poniente; se
// para pasada la luz, para caer de espaldas con el pecho en ella.
const IY = CLOACA.isla.y;
const MC = { x: CLOACA.desfigurado.x + 0.05, z: CLOACA.desfigurado.z };
const MF = { x: -1, z: 0 };
const MUERTE = {
  C: MC,
  f: MF,
  S: { x: MC.x - MF.x * 3.0, z: MC.z - MF.z * 3.0 },
  P: { x: MC.x + MF.x * 1.0, z: MC.z + MF.z * 1.0 },
  // (su cabeza, tumbado de espaldas: detrás de donde miraba)
  H: { x: MC.x - MF.x * 0.6, z: MC.z - MF.z * 0.6 },
  Q: { x: MC.x, z: MC.z + 2.5 },
  // (hacia dónde vuelve la cabeza para mirarte: tu lado)
  lado: 1,
  llega: 4.0,
  cae: 8.6,
  fin: 27.0,
};
// la luna, en lo alto del agujero (lo que mira)
const LUNA = { x: MC.x + 1.6, y: 34, z: MC.z - 2.4 };
// las tomas de su muerte (como las de la escena: de t0 a t1, de a a b,
// mirando de la a lb; sigue: a su pecho; sube: cuándo va de la a lb)
const TOMAS_MUERTE = [
  // 1. a la luz, como puede (desde poniente, de frente; sin la higuera)
  { t0: 0, t1: 4.2, a: [-11.8, IY + 1.05, 20.6], b: [-11.4, IY + 1.1, 20.2], la: [-8, IY + 1.2, 18.3], lb: [-9, IY + 1.2, 18.3], fov: 44, sigue: true, luz: [-8.2, IY + 3.4, 18.3, 1.0] },
  // 2. se quita la máscara y mira arriba: la toma sube con él
  // (de tres cuartos, a la altura de su cara: la de debajo de la máscara)
  { t0: 4.2, t1: 8.6, a: [-10.35, IY + 2.05, 18.95], b: [-10.25, IY + 1.95, 18.85], la: [-9.2, IY + 1.85, 18.3], lb: [-8.9, IY + 6.4, 18.2], sube: [6.4, 8.3], fov: 40, luz: [-10.1, IY + 2.3, 18.6, 1.6] },
  // 3. cae de espaldas (de lado, desde el sudeste)
  { t0: 8.6, t1: 10.2, a: [-5.6, IY + 1.15, 21.2], b: [-5.9, IY + 1.05, 20.9], la: [-8.6, IY + 1.4, 18.3], lb: [-8.3, IY + 0.4, 18.3], fov: 50, luz: [-8.2, IY + 3.0, 18.6, 1.0] },
  // 4. desde arriba: la luna le mira a él (tumbado en la luz, los brazos
  // abiertos; la cabeza, arriba del encuadre)
  { t0: 10.2, t1: 15.5, a: [-8.75, IY + 6.0, 18.3], b: [-8.7, IY + 4.6, 18.3], la: [-8.05, IY + 0.2, 18.3], lb: [-8.05, IY + 0.2, 18.3], fov: 46, luz: [-8.0, IY + 3.0, 18.4, 1.2] },
  // 5. su cara, de cerca, de tu lado: se vuelve hacia ti
  // (de tu lado, por encima de la hierba, más allá de su mano abierta)
  { t0: 15.5, t1: 22.6, a: [-7.35, IY + 0.8, 19.6], b: [-7.4, IY + 0.72, 19.45], la: [-7.45, IY + 0.15, 18.3], lb: [-7.45, IY + 0.15, 18.3], fov: 34, luz: [-7.6, IY + 1.4, 19.2, 1.3] },
  // 6. y la cámara sube por la luz, hasta la luna
  { t0: 22.6, t1: 27.5, a: [-7.6, IY + 0.9, 18.55], b: [-8.2, IY + 7.0, 18.6], la: [-7.6, IY + 0.2, 18.3], lb: [LUNA.x, LUNA.y, LUNA.z], sube: [23.8, 26.4], fov: 50, luz: [-8.0, IY + 2.4, 18.5, 1.0] },
];
const FIN_ESCENA = 27.0;

export class RamaCisterna {
  constructor(g) {
    this.g = g;
    this.bruma = new BrumaNegra(g);
    this.fase = null;
    this.t = 0;
    this.cues = new Set();
    this.citas = [];
    this.fEst = { k: 'quieto' };
    this._v = new THREE.Vector3();
    this.cam = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
    // el cuerpo, en la alberca: la llave de la reja, del cordón del cuello
    this.cuerpo = g.interact.list.find((i) => i.id === 'x_desf_cuerpo') || null;
    if (this.cuerpo) this.cuerpo.onUse = (gg) => this.registra(gg);
    // y el suyo, en la luz de la isla
    this.cuerpoF = g.interact.list.find((i) => i.id === 'x_fisico_cuerpo') || null;
    // su cabeza en el duelo (game/fisico_duelo.js)
    this.duelo = new DueloFisico(g, g.fisico, this);
    this.applyFlags();
  }
  get F() {
    // (al construirse el juego aún no hay partida)
    return this.g.flags || {};
  }
  get fis() {
    return this.g.fisico ? this.g.fisico.e : null;
  }
  get desf() {
    return this.g.desfigurado || null;
  }
  get minions() {
    return this.g.enemies.filter((e) => e.type === 'coronado_bruma');
  }
  // ¿Le espera esto? (se le escapó antes de que conocieras al de la cloaca:
  // game/fisico.js, escapa; y aún no se ha acabado)
  get activa() {
    const F = this.F;
    return !!F['rama:cisterna'] && !F['boss:fisico'] && !F['rama:bruma'];
  }
  enSala(p) {
    return p.y < YS + 1.2 && p.y > YS - 1 && p.x > SA.x0 && p.x < SA.x1 && p.z > SA.z0 + 1.0 && p.z < SA.z1;
  }
  luego(s, fn) {
    this.citas.push({ t: s, fn });
  }

  // ------------------------------------------------------------ cada fotograma
  update(dt) {
    const g = this.g;
    this.bruma.update(dt);
    for (let i = this.citas.length - 1; i >= 0; i--) {
      const c = this.citas[i];
      if ((c.t -= dt) > 0) continue;
      this.citas.splice(i, 1);
      c.fn();
    }
    // (su cuaderno: sin él, lo que te enseña es lo que dejó escrito)
    const F = this.F;
    if (F['desf:muerto'] && F['note:remedios'] && !F['desf:cocimientos']) {
      F['desf:cocimientos'] = true;
      g.ui.toast(MSG.cuadernoAprendes, 5);
      g.saveGame();
    }
    if (this.cuerpo) this.cuerpo.hidden = !F['desf:muerto'];
    if (this.cuerpoF) this.cuerpoF.hidden = !F['rama:fisico'];
    if (this.sangre && this.sangreK < 1) this.mancha(Math.min(1, this.sangreK + dt / 7));
    // la bruma que le sale de la corona
    const e = this.fis;
    if (e && (this.g.fisico.modo === 'rama' || this.g.fisico.modo === 'duelo') && e.obj.visible) {
      this.vapT = (this.vapT ?? 0) - dt;
      if (this.vapT <= 0) {
        this.vapT = 0.09;
        const h = e.rig.joints.head;
        if (h) h.getWorldPosition(this._v);
        else this._v.set(e.pos.x, e.pos.y + 2.0, e.pos.z);
        g.fx.blood.emit(this._v.x, this._v.y + 0.25, this._v.z, 2, { color: [0.03, 0.025, 0.04], speed: 0.45, life: 1.3, up: 0.6, gravity: -0.5 });
      }
    }
    if (this.fase === 'escena') return this.escena(dt);
    if (this.fase === 'pelea') return this.pelea(dt);
    if (this.fase === 'baja') return this.baja(dt);
    if (this.fase === 'duelo') return this.enDuelo(dt);
    if (this.fase === 'muerte') return this.muerte(dt);
    if (!this.activa) return;
    const p = g.player;
    if (p.dead || g.state !== 'play' || g.cine || g.climb) return;
    // esperando: la escena (cuando, tras hablarle en el pretil, bajas a la
    // sala) o, si ya pasó, la pelea otra vez
    // (la escena: aunque no le hayas hablado, si ya le has visto; si estáis
    // hablando, al acabar; lo que murmura para sí, lo corta)
    if (!F['desf:muerto']) {
      const D = this.desf;
      if (F['desf:llegada'] && D && D.sitio === 'pretil' && !D.rev && !D.script && this.enSala(p.pos)) this.empiezaEscena();
    } else if (this.enSala(p.pos)) this.empiezaOtraVez();
  }

  // La postura del Desfigurado en la escena (npcMuerte): hacia o, desde la
  // que tenía (sin saltos).
  pose(o) {
    const D = this.desf;
    const prev = D.muerte ? D.muerte.Wn : D.npc.data && D.npc.data.W;
    D.muerte = { ...o, Wn: prev ? { ...prev } : undefined };
  }

  // ------------------------------------------------------------ el Físico
  // Le saca en la cisterna (cambiado), en (x, z), mirando a yaw.
  saca(x, z, yaw, y = YR) {
    const F = this.g.fisico;
    const e = this.fis;
    if (!F || !e) return;
    // (sin el «hm» de cuando se le saca: está en lo oscuro, y no se le oye)
    if (this.g.audio && this.g.audio.ok) e._vt = this.g.audio.t();
    F.show(x, z, yaw);
    e.anim.stop(0.01);
    F.modo = 'rama';
    e.body.pos.set(x, y, z);
    e.body.vy = 0;
    e.yaw = yaw;
    e.obj.position.copy(e.body.pos);
    e.aware = true;
    e.state = 'rama';
    e.stT = 0;
    e.atk = null;
    e.D.engaged = false;
    e.D.barra = false;
    e.home = { x, y, z, yaw };
    // (allí arriba no se le alcanza: ni se le fija ni se le hiere; data.air,
    // como a lo que va por el techo)
    e.data.air = true;
    for (const k of ['sombrero', 'vara', 'esponja', 'campanilla']) fiGrp(e, k, false);
    for (const k of ['mascara', 'evol', 'campanillaR']) fiGrp(e, k, true);
    // (la hoja delante, la campanilla a la espalda)
    e.data.zurdo = true;
    this.fEst = { k: 'quieto' };
  }
  // y se va (al acabar, o si caes)
  retira() {
    const F = this.g.fisico;
    if (F && (F.modo === 'rama' || F.modo === 'duelo' || F.modo === 'muere')) {
      F.hide();
      F.modo = 'fuera';
    }
  }
  // Lo que hace en su estado 'rama' (entities/fisico.js): quieto (mirando a
  // algo, o a ti) o andando por sus puntos.
  estadoFisico(e, dt, pl) {
    const S = this.fEst || { k: 'quieto' };
    if (S.k === 'anda' && S.pts && S.pts.length) {
      const [tx, tz] = S.pts[0];
      const d = Math.hypot(tx - e.pos.x, tz - e.pos.z);
      if (d < 0.15) {
        S.pts.shift();
        if (!S.pts.length) {
          const then = S.then;
          this.fEst = { k: 'quieto', mira: S.mira };
          if (then) then();
        }
        return true;
      }
      e.steerTo(tx, tz, S.v ?? 1, dt, true);
      return true;
    }
    e.vx = damp(e.vx, 0, 8, dt);
    e.vz = damp(e.vz, 0, 8, dt);
    if (S.mira) {
      const tx = S.mira === 'jugador' ? pl.pos.x : S.mira.x,
        tz = S.mira === 'jugador' ? pl.pos.z : S.mira.z;
      e.yaw = dampAngle(e.yaw, Math.atan2(tx - e.pos.x, tz - e.pos.z), 3, dt);
    }
    return false;
  }
  // La campanilla de las órdenes: en alto, n veces.
  tane(n) {
    const g = this.g;
    const e = this.fis;
    if (e) e.anim.play(FI_CLIPS.tane, { blend: 0.1 });
    for (let i = 0; i < n; i++) this.luego(0.32 + i * 0.26, () => g.audio && g.audio.play('campanilla', e ? { x: e.pos.x, y: e.pos.y + 2.2, z: e.pos.z } : null));
  }

  // ------------------------------------------------------------ la escena
  empiezaEscena() {
    const g = this.g;
    const p = g.player;
    const D = this.desf;
    this.fase = 'escena';
    this.t = 0;
    this.cues = new Set();
    p.state = 'cine';
    p.vx = p.vz = 0;
    p.autoDir = null;
    g.lockTarget = null;
    g.speech && g.speech.hush(D.who);
    // (si has bajado saltando a la alberca, a la orilla: que no te caiga
    // encima)
    const A = CLOACA.alberca;
    if (p.pos.x > A[0] - 0.5 && p.pos.x < A[2] + 0.5 && p.pos.z > A[1] - 0.5 && p.pos.z < A[3] + 0.5) p.spawn(-9.6, YS, 12.6, Math.atan2(PRE.x + 9.6, PRE.z - 12.6));
    // (fuera el HUD, salvo los bocadillos; y el rótulo del sitio, si acaba
    // de salir)
    g.ui.cineHud(true);
    const ar = document.getElementById('area');
    if (ar) ar.classList.remove('show');
    // él, en el pretil, con los brazos abiertos, a la luz (y a ti): de cara a
    // la sala (al hablarte se había vuelto hacia ti)
    D.npc.yaw = PRE.yaw;
    this.pose({ k: 'predica', W: { predica: 1 }, rapido: 2.5 });
    // el Físico, en lo oscuro de la galería
    this.saca(SALE.x, SALE.z, 0);
    g.audio && g.audio.stopMusic();
  }
  escena(dt) {
    const g = this.g;
    const p = g.player;
    const e = this.fis;
    const D = this.desf;
    const t = (this.t += dt);
    const cue = (id, at) => (t >= at && !this.cues.has(id) ? (this.cues.add(id), true) : false);
    p.state = 'cine';
    p.vx = p.vz = 0;
    g.post.U.uBars.value = 0.11 * sm(t / 0.7);
    // (saltarla: a lo que queda)
    if (t > 1.5 && t < 23 && !g.ui.modal && g.input.pressed('interact')) return this.salta();
    // 1. Él, en lo alto, con los brazos abiertos, hablándole a la luz y a ti
    if (cue('d1', 0.4)) g.speech.say(D.who, DIALOG.desfUltimo[0], { dur: 2.2 });
    if (cue('d2', 2.6)) g.speech.say(D.who, DIALOG.desfUltimo[1], { dur: 2.6 });
    if (cue('d3', 5.4)) {
      g.speech.say(D.who, DIALOG.desfUltimo[2], { dur: 2.0 });
      this.pose({ k: 'predica', W: { predica: 0.6, cielo: 0.4 }, rapido: 2 });
    }
    // 2. Detrás, de lo oscuro de la galería, sale el Físico
    if (cue('sale', 4.4)) this.fEst = { k: 'anda', pts: [[PASO.x, PASO.z], [ESPALDA.x, ESPALDA.z]], v: 1.05, mira: { x: PRE.x, z: PRE.z } };
    if (cue('cielo', 7.4)) this.pose({ k: 'cielo', W: { cielo: 1 }, rapido: 2 });
    // (la boca, mientras habla)
    if (D.muerte && !D.muerte.muerto) D.muerte.talk = g.speech.busy(D.who) ? 1 : 0;
    // 3. «Hermosa...», y la hoja le sale por el pecho
    if (cue('hermosa', 8.5)) g.speech.say(D.who, 'Hermosa...', { dur: 1.5 });
    if (cue('apunala', 9.1)) {
      // (por si no hubiera llegado del todo a su espalda)
      e.body.pos.x = lerp(e.body.pos.x, ESPALDA.x, 0.7);
      e.body.pos.z = lerp(e.body.pos.z, ESPALDA.z, 0.7);
      this.fEst = { k: 'quieto', mira: { x: PRE.x, z: PRE.z } };
      e.yaw = PRE.yaw;
      e.anim.play(FI_CLIPS.apunala, { blend: 0.1 });
    }
    if (cue('dentro', 9.1 + 0.72)) this.atraviesa();
    // 4. Cae, a cámara lenta, por la cascada, a la alberca
    if (cue('lento', 10.4)) g.timeK = 0.45;
    if (cue('cae', 11.0)) this.caida = { t: 0 };
    if (this.caida) this.cae(dt);
    if (cue('rapido', 12.9)) g.timeK = 1;
    // 5. Boca abajo, en cruz, en el agua (la toma sube luego hasta el pretil)
    // 6. Arriba, el Físico: le mira, te mira, te habla; detrás, la bruma
    if (cue('alpretil', 13.2)) this.fEst = { k: 'anda', pts: [[ARRIBA.x, ARRIBA.z]], v: 0.6, mira: { x: FLO.x + Math.sin(FLO.yaw) * 0.8, z: FLO.z + Math.cos(FLO.yaw) * 0.8 } };
    if (cue('dice1', 18.3)) fiSay(e, DIALOG.fisicoRamaMuerto, 2.6);
    if (cue('bruma1', 18.8)) this.bruma.pon({ galeria: 1, rellano: 0.9, rellano2: 0.6 });
    if (cue('mira', 20.6)) this.fEst = { k: 'quieto', mira: 'jugador' };
    if (cue('dice2', 20.9)) fiSay(e, DIALOG.fisicoRamaTu[0], 2.4);
    if (cue('dice3', 23.3)) fiSay(e, DIALOG.fisicoRamaTu[1], 2.6);
    if (cue('bruma2', 21.0)) this.bruma.pon({ cae: 1 });
    if (cue('bruma3', 22.0)) this.bruma.pon({ suelo: 0.9, suelo2: 0.6, radio: 30 });
    // 7. La campanilla; y de la bruma, ellos
    if (cue('tane', 23.6)) this.tane(3);
    if (cue('salen', 24.4)) {
      this.salidos = 0;
      this.salen(3);
    }
    this.camara(t);
    if (t >= FIN_ESCENA) this.empiezaPelea();
  }
  // las tomas
  camara(t) {
    const g = this.g;
    let T = TOMAS[TOMAS.length - 1];
    for (const q of TOMAS)
      if (t >= q.t0 && t < q.t1) {
        T = q;
        break;
      }
    const u = sm((t - T.t0) / (T.t1 - T.t0));
    // (la del cuerpo: primero el cuerpo, y luego sube hasta el pretil)
    const ul = T.sube ? sm((t - T.sube[0]) / (T.sube[1] - T.sube[0])) : u;
    const C = this.cam;
    const { a, b, la, lb } = T;
    C.pos.set(lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u));
    C.look.set(lerp(la[0], lb[0], ul), lerp(la[1], lb[1], ul), lerp(la[2], lb[2], ul));
    // (la caída: mirando al cuerpo)
    if (T.sigue) {
      const n = this.desf.npc.body.pos;
      C.look.set(n.x, n.y + 0.7, n.z);
    }
    g.camRig.override = { pos: C.pos, look: C.look, fov: T.fov, snap: true };
    this.luz(...T.luz);
  }
  // La luz de la escena (y de la pelea): la de la luna que rebota en el agua.
  luz(x, y, z, k) {
    const L = this.g.bossLight;
    if (!L) return;
    if (!this.luz0) this.luz0 = { color: L.color.getHex(), distance: L.distance };
    L.color.setHex(0x8ea4cc);
    L.distance = 12;
    L.position.set(x, y, z);
    L.intensity = k;
  }
  luzFuera() {
    const L = this.g.bossLight;
    if (!L || !this.luz0) return;
    L.intensity = 0;
    L.color.setHex(this.luz0.color);
    L.distance = this.luz0.distance;
    this.luz0 = null;
  }
  // La hoja, por la espalda: le sale por el pecho.
  atraviesa() {
    const g = this.g;
    const D = this.desf;
    const n = D.npc;
    this.F['desf:muerto'] = true;
    D.script = null;
    this.pose({ k: 'atravesado', W: { atravesado: 1 }, rapido: 14 });
    const fx = Math.sin(PRE.yaw),
      fz = Math.cos(PRE.yaw);
    const c = n.rig.joints.chest ? n.rig.worldPos('chest', this._v) : this._v.set(PRE.x, YR + 1.2, PRE.z);
    g.fx.blood.emit(c.x + fx * 0.22, c.y + 0.22, c.z + fz * 0.22, 40, { dir: { x: fx * 0.6, z: fz * 0.6 }, speed: 2.6, life: 0.8, up: 0.6, stain: true });
    g.audio && g.audio.play('fleshTear', c);
    g.audio && g.audio.play('boneCrack', c);
    g.camRig.shake(0.2);
  }
  // La caída: del pretil, por la cascada, a la alberca (boca abajo, en cruz).
  cae(dt) {
    const g = this.g;
    const C = this.caida;
    const D = this.desf;
    const n = D.npc;
    C.t += dt;
    const T = 1.1;
    const u = Math.min(1, C.t / T);
    const x = lerp(PRE.x, FLO.x, u),
      z = lerp(PRE.z, FLO.z, u);
    const y0 = YR,
      y1 = FLO.y;
    const y = y0 + (y1 - y0) * u * u + 0.28 * Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u);
    n.body.pos.set(x, y, z);
    this.pose({ k: 'cae', W: { cae: 1 }, rapido: 7, pitch: 1.62 * Math.pow(u, 0.8), roll: 0.05 * u, muerto: true });
    if (u >= 1) {
      this.caida = null;
      g.audio && g.audio.play('splash', { x, y: AGUA, z });
      g.audio && g.audio.play('bodyFall', { x, y: AGUA, z });
      const fx = Math.sin(FLO.yaw),
        fz = Math.cos(FLO.yaw);
      g.fx.blood.emit(x + fx * 0.8, AGUA + 0.05, z + fz * 0.8, 60, { color: [0.72, 0.8, 0.84], speed: 3.6, life: 0.9, up: 2.6 });
      g.fx.blood.emit(x + fx * 0.6, AGUA + 0.05, z + fz * 0.6, 30, { speed: 1.2, life: 1.6, up: 0.4, gravity: 2, stain: true });
      this.pose({ k: 'flota', W: { flota: 1 }, rapido: 5, pitch: 1.62, roll: 0.05, muerto: true });
      this.mancha(0.02);
      g.saveGame();
    }
  }
  // Saltar la escena: a lo que queda (él muerto, en el agua; el Físico en el
  // pretil, la bruma) y la campanilla.
  salta() {
    const g = this.g;
    const D = this.desf;
    g.speech && g.speech.hush(D.who);
    if (!this.F['desf:muerto']) this.atraviesa();
    this.caida = null;
    g.timeK = 1;
    D.npc.body.pos.set(FLO.x, FLO.y, FLO.z);
    D.npc.yaw = FLO.yaw;
    this.pose({ k: 'flota', W: { flota: 1 }, rapido: 30, pitch: 1.62, roll: 0.05, muerto: true });
    this.mancha(0.6);
    const e = this.fis;
    e.body.pos.set(ARRIBA.x, YR, ARRIBA.z);
    this.fEst = { k: 'quieto', mira: 'jugador' };
    this.bruma.pon({ galeria: 1, rellano: 0.9, rellano2: 0.6, cae: 1, suelo: 0.9, suelo2: 0.6, radio: 30 });
    for (const k of ['d1', 'd2', 'd3', 'sale', 'cielo', 'hermosa', 'apunala', 'dentro', 'lento', 'cae', 'rapido', 'alpretil', 'dice1', 'bruma1', 'mira', 'dice2', 'dice3', 'bruma2', 'bruma3']) this.cues.add(k);
    this.t = 23.4;
    g.saveGame();
  }

  // ------------------------------------------------------------ la pelea
  // De la bruma, n de ellos (por la escalera y por la galería del desagüe).
  salen(n) {
    const g = this.g;
    const libres = this.minions.filter((c) => c.scripted && !c.dead);
    for (let i = 0; i < n && libres.length; i++) {
      const c = libres.shift();
      const S = SALIDAS[(this.salidos ?? 0) % SALIDAS.length];
      this.salidos = (this.salidos ?? 0) + 1;
      const y = S.x < R[2] + 6 && S.x > SA.esc.x - 0.2 && Math.abs(S.z - SA.esc.z) < 1 ? yEsc(S.x) : YS;
      c.scripted = false;
      c.body.pos.set(S.x, y, S.z);
      c.body.vy = 0;
      c.yaw = Math.atan2(g.player.pos.x - S.x, g.player.pos.z - S.z);
      c.obj.visible = true;
      c.shadow.visible = true;
      c.aware = true;
      c.state = 'chase';
      c.stT = 0;
      // (mientras dura la escena no atacan: el jugador no se puede mover)
      c.cooldown = (this.fase === 'escena' ? Math.max(0, FIN_ESCENA - this.t) : 0) + 1.0 + i * 0.3;
      c.home = { x: c.pos.x, y, z: c.pos.z, yaw: c.yaw };
      c.data.slot = Math.random() * TAU;
      g.audio && g.audio.enemyVoice(c, 'alert');
      g.fx.blood.emit(S.x, y + 1.2, S.z, 16, { color: [0.03, 0.025, 0.04], speed: 1.6, life: 1.2, up: 1.2, gravity: -0.4 });
    }
  }
  empiezaPelea() {
    const g = this.g;
    const p = g.player;
    this.fase = 'pelea';
    this.t = 0;
    g.camRig.override = null;
    g.camRig.snapTo(p);
    g.post.U.uBars.value = 0;
    g.camera.fov = g.camRig.fovBase;
    g.camera.updateProjectionMatrix();
    if (p.state === 'cine') p.state = 'free';
    g.timeK = 1;
    g.ui.showHud(true);
    this.luz(...LUZ_PELEA);
    // (la del suelo sigue creciendo desde donde la dejó la escena)
    this.bruma.pon({ galeria: 1, rellano: 0.9, rellano2: 0.6, cae: 1, suelo: 0.9, suelo2: 0.6, radio: 30 });
    this.bruma.cierra(true);
    this.ola = 1;
    this.ordenT = 5;
    this.ciclo = -1;
    this.dijoT = 9;
    this.fEst = { k: 'quieto', mira: 'jugador' };
    g.audio && g.audio.music('bossCellar');
    g.saveGame();
  }
  // Si caes en la pelea y vuelves a bajar: él, ya en el pretil; la bruma,
  // otra vez; y ellos.
  empiezaOtraVez() {
    const g = this.g;
    this.saca(ARRIBA.x, ARRIBA.z, PRE.yaw);
    this.fEst = { k: 'quieto', mira: 'jugador' };
    this.luz(...LUZ_PELEA);
    fiSay(this.fis, DIALOG.fisicoRamaOtraVez, 3);
    this.bruma.pon({ galeria: 1, rellano: 0.9, rellano2: 0.6, cae: 1, suelo: 0.9, suelo2: 0.6, radio: 30 });
    this.bruma.cierra(true);
    this.fase = 'pelea';
    this.t = 0;
    this.ola = 1;
    this.salidos = 0;
    this.ordenT = 7;
    this.ciclo = -1;
    // (y baja enseguida: con los tres que llama, el duelo)
    this.otraVez = true;
    this.dijoT = 12;
    this.luego(1.0, () => this.tane(3));
    this.luego(1.8, () => this.salen(3));
    g.audio && g.audio.music('bossCellar');
  }
  // los suyos que pelean (y los que han caído)
  vivos() {
    return this.minions.filter((c) => !c.dead && !c.scripted && c.obj.visible);
  }
  muertos() {
    return this.minions.filter((c) => c.dead).length;
  }
  // ¿Te tiene sujeto uno de ellos?
  teSujetan() {
    return this.minions.some((c) => !c.dead && c.state === 'agarrando');
  }
  // (lo de todos los fotogramas de la pelea: la bruma de las salidas)
  muro() {
    const g = this.g;
    if (this.bruma.anteMuro(g.player.pos) && (this.muroT ?? 0) <= g.time) {
      this.muroT = g.time + 6;
      g.ui.toast(MSG.brumaMuro, 3);
    }
  }
  // La primera tanda: él, en el pretil, mirándote pelear con ellos (y
  // apuntando: su historia clínica de ti sigue abierta), dando las órdenes.
  pelea(dt) {
    const g = this.g;
    const p = g.player;
    const e = this.fis;
    this.t += dt;
    if (p.dead) return;
    const vivos = this.vivos();
    // (cuando de ellos queda uno, o se cansa de mirar: baja él)
    if (this.t > 3 && !this.citas.length && (vivos.length <= 1 || this.t > (this.otraVez ? 4.5 : 70))) return this.empiezaBaja();
    // si uno te sujeta: las tres, enseguida (todos a una)
    const sujeto = p.state === 'grabbed' && vivos.some((c) => c.state === 'agarrando');
    if (sujeto && !this.sujetoDicho) {
      this.sujetoDicho = true;
      this.ordena('carga', vivos);
      this.ordenT = 6;
    }
    if (!sujeto) this.sujetoDicho = false;
    // las órdenes, siempre en el mismo orden (que se aprenda): una vez,
    // cercad; dos, sujetadle; tres, todos a una; y un respiro (a su aire). Con
    // uno solo no hay nada que cercar
    this.ordenT -= dt;
    if (this.ordenT <= 0 && vivos.length) {
      this.ciclo = ((this.ciclo ?? -1) + 1) % 3;
      const k = vivos.length === 1 ? 'carga' : ['cerco', 'sujeta', 'carga'][this.ciclo];
      this.ordena(k, vivos);
      this.ordenT = k === 'cerco' ? 4.8 : k === 'sujeta' ? 5.5 : 8 + Math.random() * 2.5;
    }
    // y habla, de vez en cuando
    this.dijoT -= dt;
    if (this.dijoT <= 0 && e) {
      this.dijoT = 11 + Math.random() * 6;
      fiSay(e, pick(DIALOG.fisicoRamaPelea), 3);
    }
    this.muro();
  }
  // Una orden: la campanilla (una vez, cercad; dos, sujetadle; tres, todos a
  // una), lo que dice, y a cada uno lo suyo.
  ordena(k, vivos) {
    const g = this.g;
    const e = this.fis;
    const n = k === 'cerco' ? 1 : k === 'sujeta' ? 2 : 3;
    this.tane(n);
    if (e) fiSay(e, DIALOG.fisicoRamaOrden[k], 1.8);
    const t0 = g.time + 0.35 + n * 0.26;
    const hasta = t0 + (k === 'cerco' ? 4.5 : k === 'sujeta' ? 3.5 : 4.0);
    const p = g.player.pos;
    let quien = null;
    if (k === 'sujeta') {
      let bd = 1e9;
      for (const c of vivos) {
        const d = c.distTo(p);
        if (d < bd) {
          bd = d;
          quien = c;
        }
      }
    }
    // (el cerco: cada uno a su sitio alrededor, empezando por donde ya está)
    const ord = vivos.map((c) => [Math.atan2(c.pos.x - p.x, c.pos.z - p.z), c]).sort((a, b) => a[0] - b[0]);
    const a0 = ord.length ? ord[0][0] : 0;
    ord.forEach(([, c], i) => {
      c.data.slot = a0 + (i * TAU) / ord.length;
      c.data.orden = { k, t0, hasta, quien };
    });
  }

  // ------------------------------------------------------------ baja
  // «Basta de mirar»: por el rellano, a lo alto de la escalera, y se mete en
  // su bruma; sale por debajo, ya en la escalera (el muro de bruma no le
  // para: es suya; pasa a través sin que se le vea).
  empiezaBaja() {
    const e = this.fis;
    this.fase = 'baja';
    this.t = 0;
    this.enBruma = null;
    fiSay(e, DIALOG.fisicoRamaBaja[0], 2.2);
    // (hasta pegado a la bruma: su caja no le deja pasar de ahí, y no hace
    // falta)
    this.fEst = { k: 'anda', pts: [[-13.7, SA.esc.z], [R[2] - 0.6, SA.esc.z]], v: 1.3, then: () => (this.enBruma = this.t) };
  }
  baja(dt) {
    this.t += dt;
    this.muro();
    if ((this.enBruma != null && this.t - this.enBruma > 0.6) || this.t > 9) this.empiezaDuelo();
  }
  // Abajo: sale de la bruma de lo alto de la escalera, ya en ella; la
  // segunda tanda, de la bruma; y el duelo (game/fisico_duelo.js).
  empiezaDuelo() {
    const g = this.g;
    const F = g.fisico;
    const e = this.fis;
    const p = g.player;
    this.fase = 'duelo';
    this.t = 0;
    const x = R[2] + 1.3;
    e.body.pos.set(x, yEsc(x) + 0.02, SA.esc.z);
    e.body.vy = 0;
    e.yaw = Math.atan2(p.pos.x - x, p.pos.z - SA.esc.z);
    e.obj.position.copy(e.body.pos);
    e.data.air = false;
    F.modo = 'duelo';
    e.state = 'chase';
    e.stT = 0;
    e.aware = true;
    e.cooldown = 1.5;
    this.fEst = { k: 'quieto' };
    g.fx.blood.emit(x, e.body.pos.y + 1.4, SA.esc.z, 20, { color: [0.03, 0.025, 0.04], speed: 1.6, life: 1.3, up: 1.2, gravity: -0.4 });
    this.duelo.empiezaDuelo();
    // (su nombre, su barra, su música)
    g.startBoss(e);
    this.luego(2.2, () => fiSay(e, DIALOG.fisicoRamaBaja[1], 3.4));
    // la segunda tanda (si cuando bajó quedaba alguno de la primera, con él)
    if (!this.otraVez) this.luego(1.4, () => this.salen(3));
    this.otraVez = false;
  }
  // El duelo: lo que piensa, lo lleva su cabeza (game/fisico_duelo.js);
  // aquí, lo que ve y le pasa (sus dudas), su luz y la bruma de las salidas.
  enDuelo(dt) {
    const e = this.fis;
    this.t += dt;
    this.duelo.update(dt);
    if (!e || e.state === 'dead') return;
    this.duelo.duda(dt);
    // (la luz fría, sobre él: que se le vea en lo oscuro)
    this.luz(e.pos.x + 0.6, e.pos.y + 3.4, e.pos.z + 0.6, 1.0);
    this.muro();
  }

  // ------------------------------------------------------------ su muerte
  // (entities/fisico.js, onDefeat) Vencido: su muerte la lleva su guion.
  muere(e) {
    e.hp = 1;
    if (this.fase === 'duelo') this.empiezaMuerte();
    return true;
  }
  // Se le cae la campanilla (la última vez que suena), y sin él los suyos se
  // desploman y la bruma se deshace. Anda como puede hasta la luz, donde
  // estaba siempre el otro; se quita la máscara; mira arriba, la luna; cae de
  // espaldas. Tumbado, la ve, y entiende: lo que se mueve hacia ella, lo que
  // quiere, está vivo; el que no se arrodilló, también. Trata de decírtelo; se
  // ahoga en su sangre a media frase.
  empiezaMuerte() {
    const g = this.g;
    const p = g.player;
    const F = g.fisico;
    const e = this.fis;
    this.fase = 'muerte';
    this.t = 0;
    this.cues = new Set();
    this.citas = [];
    this.duelo.citas = [];
    F.modo = 'muere';
    e.scripted = true;
    // (el destello del último golpe: se apaga en su update, que ya no corre)
    e.flash = 0;
    e.atk = null;
    e.state = 'chase';
    e.vx = e.vz = 0;
    e.data.lookUp = false;
    e.anim.speed = 1;
    e.D.engaged = false;
    g.lockTarget = null;
    g.speech && e.P.who && g.speech.hush(e.P.who);
    p.state = 'cine';
    p.vx = p.vz = 0;
    p.autoDir = null;
    g.ui.cineHud(true);
    g.audio && g.audio.stopMusic();
    // la campanilla, al suelo (suena una vez más)
    fiGrp(e, 'campanillaR', false);
    g.audio && g.audio.play('campanilla', { x: e.pos.x, y: e.pos.y + 1, z: e.pos.z });
    // los suyos: sin él (sin la bruma que les tenía en pie), se desploman
    for (const c of this.vivos()) {
      c.data.orden = null;
      c.die();
    }
    if (p.state === 'grabbed' && p.releaseGrab) p.releaseGrab(0.5, 0, 0, 0);
    p.state = 'cine';
    // la bruma se deshace
    this.bruma.cierra(false);
    this.bruma.pon({ suelo: 0, suelo2: 0, cae: 0, radio: 0, galeria: 0, rellano: 0, rellano2: 0 });
    // (a la luz: de donde vienen sus pasos, siempre los mismos —el corte de la
    // primera toma lo esconde—; tú, a un lado)
    const M = MUERTE;
    const yI = (x, z) => g.world.col.groundHeight(x, z, 0.3, YS + 2);
    e.body.pos.set(M.S.x, yI(M.S.x, M.S.z), M.S.z);
    e.yaw = Math.atan2(M.f.x, M.f.z);
    e.obj.position.copy(e.body.pos);
    e.anim.play(FI_CLIPS.tambalea, { blend: 0.2, loop: true });
    p.spawn(M.Q.x, yI(M.Q.x, M.Q.z), M.Q.z, Math.atan2(M.P.x - M.Q.x, M.P.z - M.Q.z));
    p.state = 'cine';
    this.yace = null;
    this.lunaOn(true);
  }
  muerte(dt) {
    const g = this.g;
    const p = g.player;
    const e = this.fis;
    const M = MUERTE;
    const t = (this.t += dt);
    const cue = (id, at) => (t >= at && !this.cues.has(id) ? (this.cues.add(id), true) : false);
    p.state = 'cine';
    p.vx = p.vz = 0;
    g.post.U.uBars.value = 0.11 * sm(t / 0.7);
    if (t > 2 && t < 26 && !g.ui.modal && g.input.pressed('interact')) return this.finMuerte();
    // 1. a la luz, como puede
    if (t < M.llega) {
      const u = t / M.llega;
      const x = lerp(M.S.x, M.P.x, u),
        z = lerp(M.S.z, M.P.z, u);
      const v = Math.hypot(M.P.x - M.S.x, M.P.z - M.S.z) / M.llega;
      e.body.pos.set(x, g.world.col.groundHeight(x, z, 0.3, YS + 2), z);
      e.vx = M.f.x * v;
      e.vz = M.f.z * v;
      // (le cuesta: tose, gotea)
      this.gotaT = (this.gotaT ?? 0) - dt;
      if (this.gotaT <= 0) {
        this.gotaT = 0.5 + Math.random() * 0.4;
        g.fx.blood.emit(x, e.body.pos.y + 1.1, z, 3, { speed: 0.6, life: 0.8, up: 0.2, stain: true });
      }
    } else {
      e.vx = damp(e.vx, 0, 10, dt);
      e.vz = damp(e.vz, 0, 10, dt);
    }
    // 2. se quita la máscara y mira arriba: la luna
    if (cue('quita', M.llega)) e.anim.play(FI_CLIPS.quita, { blend: 0.25 });
    // (sin máscara: el aire de aquí abajo, por primera vez, con su boca)
    if (cue('mascara', M.llega + 0.85)) {
      fiGrp(e, 'mascara', false);
      g.audio && g.audio.play('reyGasp', { x: e.pos.x, y: e.pos.y + 1.8, z: e.pos.z });
    }
    if (cue('mira', M.llega + 1.8)) e.anim.play(FI_CLIPS.mira, { blend: 0.4, loop: true });
    if (cue('ah', 6.8)) fiSay(e, DIALOG.fisicoRamaMuere[0], 2.0);
    // 3. cae de espaldas (a cámara lenta)
    if (cue('cae', M.cae)) {
      e.anim.play(FI_CLIPS.caeAtras, { blend: 0.12 });
      e.state = 'dead';
      g.timeK = 0.55;
      this.yace = { pitch: 0, cabeza: 0, alto: 0 };
    }
    if (this.yace && t >= M.cae && t < M.cae + 1.0) {
      const u = Math.min(1, (t - M.cae) / 0.9);
      this.yace.pitch = -(Math.PI / 2) * u * u;
      this.yace.alto = 0.11 * u;
    }
    if (cue('suelo', M.cae + 0.9)) {
      this.yace.pitch = -Math.PI / 2;
      this.yace.alto = 0.11;
      e.anim.play(FI_CLIPS.yace, { blend: 0.2, loop: true });
      g.audio && g.audio.play('bodyFall', { x: e.pos.x, y: e.pos.y, z: e.pos.z });
      g.camRig.shake(0.15);
      g.fx.blood.emit(M.H.x, e.body.pos.y + 0.1, M.H.z, 14, { color: [0.2, 0.26, 0.14], speed: 1.2, life: 0.9, up: 1.0 });
    }
    if (cue('normal', M.cae + 1.4)) g.timeK = 1;
    // 4. tumbado, la ve; y lo dice
    if (cue('todo', 11.0)) fiSay(e, DIALOG.fisicoRamaMuere[1], 3.2);
    // 5. se vuelve hacia ti: trata de decírtelo
    if (this.yace && t > 15.8 && t < 22) this.yace.cabeza = damp(this.yace.cabeza, M.lado * 0.95, 2.2, dt);
    if (cue('tu', 16.6)) fiSay(e, DIALOG.fisicoRamaMuere[2], 2.6);
    if (cue('unico', 19.4)) fiSay(e, DIALOG.fisicoRamaMuere[3], 4);
    // (y a media frase, la sangre)
    if (cue('ahoga', 20.5)) {
      g.speech && e.P.who && g.speech.hush(e.P.who);
      e.anim.play(FI_CLIPS.ahoga, { blend: 0.08, loop: true });
      g.audio && g.audio.play('choke', { x: e.pos.x, y: e.pos.y, z: e.pos.z });
    }
    if (t > 20.5 && t < 22.6) {
      this.sangreT = (this.sangreT ?? 0) - dt;
      if (this.sangreT <= 0) {
        this.sangreT = 0.16 + Math.random() * 0.1;
        const h = e.rig.joints.jaw || e.rig.joints.head;
        h.getWorldPosition(this._v);
        g.fx.blood.emit(this._v.x, this._v.y + 0.06, this._v.z, 5, { speed: 0.9, life: 0.7, up: 1.3, stain: true });
      }
    }
    if (cue('quieto', 22.6)) {
      e.anim.play(FI_CLIPS.yace, { blend: 0.9, loop: true });
      g.audio && g.audio.play('reyLastBreath', { x: e.pos.x, y: e.pos.y, z: e.pos.z });
    }
    // (y vuelve la cara a la luna, con los ojos abiertos)
    if (this.yace && t > 22.6) this.yace.cabeza = damp(this.yace.cabeza, M.lado * 0.2, 0.9, dt);
    if (cue('respira', 23.2)) e.anim.speed = 0.05;
    this.camaraMuerte(t);
    e.animate(dt);
    if (t >= M.fin) this.finMuerte();
  }
  // las tomas de su muerte
  camaraMuerte(t) {
    const g = this.g;
    const e = this.fis;
    let T = TOMAS_MUERTE[TOMAS_MUERTE.length - 1];
    for (const q of TOMAS_MUERTE)
      if (t >= q.t0 && t < q.t1) {
        T = q;
        break;
      }
    const u = sm((t - T.t0) / (T.t1 - T.t0));
    const ul = T.sube ? sm((t - T.sube[0]) / (T.sube[1] - T.sube[0])) : u;
    const C = this.cam;
    const { a, b, la, lb } = T;
    C.pos.set(lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u));
    C.look.set(lerp(la[0], lb[0], ul), lerp(la[1], lb[1], ul), lerp(la[2], lb[2], ul));
    if (T.sigue) {
      const h = e.rig.joints.chest || e.rig.joints.head;
      h.getWorldPosition(this._v);
      C.look.set(this._v.x, this._v.y + 0.3, this._v.z);
    }
    g.camRig.override = { pos: C.pos, look: C.look, fov: T.fov, snap: true };
    this.luz(...T.luz);
  }
  // Acaba: muerto, tumbado en la luz, para siempre; su nombre, y lo de los
  // jefes (game.onEnemyDeath).
  finMuerte() {
    const g = this.g;
    const p = g.player;
    const F = g.fisico;
    const e = this.fis;
    this.fase = 'tras';
    this.t = 0;
    g.speech && e.P.who && g.speech.hush(e.P.who);
    this.F['rama:fisico'] = true;
    this.F['rama:bruma'] = true;
    this.yaceCuerpo();
    F.modo = 'fuera';
    g.camRig.override = null;
    g.camRig.snapTo(p);
    g.camera.fov = g.camRig.fovBase;
    g.camera.updateProjectionMatrix();
    g.post.U.uBars.value = 0;
    g.timeK = 1;
    if (p.state === 'cine') p.state = 'free';
    g.ui.showHud(true);
    this.bruma.quita();
    this.lunaOn(false);
    this.luzFuera();
    g.onEnemyDeath(e);
    g.saveGame();
  }
  // Su cuerpo, en la luz de la isla (al acabar, y al cargar).
  yaceCuerpo() {
    const g = this.g;
    const e = this.fis;
    if (!e) return;
    const M = MUERTE;
    e.reset();
    e.flash = 0;
    e.spec.held = false;
    e.dead = true;
    e.hp = 0;
    e.state = 'dead';
    e.scripted = true;
    e.D = e.D || {};
    e.D.engaged = false;
    e.D.hidden = false;
    e.obj.visible = true;
    e.shadow.visible = false;
    for (const k of ['mascara', 'sombrero', 'vara', 'esponja', 'campanilla', 'campanillaR']) fiGrp(e, k, false);
    fiGrp(e, 'evol', true);
    e.data.zurdo = true;
    e.body.pos.set(M.P.x, g.world.col.groundHeight(M.P.x, M.P.z, 0.3, YS + 2), M.P.z);
    e.yaw = Math.atan2(M.f.x, M.f.z);
    e.obj.position.copy(e.body.pos);
    this.yace = { pitch: -Math.PI / 2, cabeza: M.lado * 0.2, alto: 0.11 };
    e.anim.play(FI_CLIPS.yace, { blend: 0, t0: 0 });
    e.anim.speed = 0;
    e.animate(0.05);
    if (this.cuerpoF) this.cuerpoF.hidden = false;
  }
  // (el cuerpo entero, de su raíz: cayendo de espaldas, tumbado; y la cabeza,
  // hacia ti: entities/fisico.js)
  rootRot(e) {
    const Y = this.yace;
    const o = e.obj;
    if (Y && Y.pitch) {
      o.rotation.order = 'YXZ';
      o.rotation.x = Y.pitch;
      o.rotation.z = 0;
      o.position.y = e.body.pos.y + (Y.alto || 0);
      if (Y.cabeza && e.rig.joints.head) e.rig.joints.head.rotateY(Y.cabeza);
    } else if (o.rotation.x || o.rotation.z) {
      o.rotation.x = 0;
      o.rotation.z = 0;
    }
  }
  // La luna, en lo alto del agujero (sólo para su muerte: desde la ciudad no
  // se ve un disco de más).
  lunaOn(on) {
    if (on && !this.luna) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(2.6, 28), new THREE.MeshBasicMaterial({ color: 0xe6edf7, fog: false }));
      m.position.set(LUNA.x, LUNA.y, LUNA.z);
      m.lookAt(MUERTE.C.x, YS, MUERTE.C.z);
      m.renderOrder = -1;
      this.g.scene.add(m);
      this.luna = m;
    }
    if (this.luna) this.luna.visible = on;
  }

  // La sangre en el agua, alrededor de él: crece despacio y se queda (k, de
  // 0 a 1).
  mancha(k) {
    if (!this.sangre) {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const x = c.getContext('2d');
      const gr = x.createRadialGradient(32, 32, 2, 32, 32, 31);
      gr.addColorStop(0, 'rgba(58,6,8,0.9)');
      gr.addColorStop(0.5, 'rgba(50,5,7,0.6)');
      gr.addColorStop(1, 'rgba(40,4,6,0)');
      x.fillStyle = gr;
      x.fillRect(0, 0, 64, 64);
      // (deshilachada: unas manchas más, alrededor)
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + Math.sin(i * 7.3);
        const r = 12 + (i % 3) * 4;
        const g2 = x.createRadialGradient(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 1, 32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 9);
        g2.addColorStop(0, 'rgba(52,5,7,0.45)');
        g2.addColorStop(1, 'rgba(52,5,7,0)');
        x.fillStyle = g2;
        x.fillRect(0, 0, 64, 64);
      }
      const tex = new THREE.CanvasTexture(c);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
      m.rotation.x = -Math.PI / 2;
      const o = new THREE.Object3D();
      o.add(m);
      // (en medio del cuerpo, a lo largo de él)
      o.position.set(FLO.x + Math.sin(FLO.yaw) * 0.85, AGUA + 0.012, FLO.z + Math.cos(FLO.yaw) * 0.85);
      o.rotation.y = FLO.yaw;
      m.renderOrder = 6;
      this.g.scene.add(o);
      this.sangre = o;
      this.sangreM = m;
    }
    this.sangreK = k;
    this.sangre.visible = k > 0;
    const e = 1 - (1 - k) * (1 - k);
    this.sangreM.scale.set(0.6 + 1.6 * e, 1.0 + 1.9 * e, 1);
    this.sangreM.material.opacity = 0.75 * Math.min(1, k * 3);
  }

  // ------------------------------------------------------------ lo que queda
  // El cuerpo, en la alberca: la llave de la reja, del cordón del cuello.
  registra(g) {
    const F = this.F;
    if (!F['desf:muerto']) return false;
    if (!g.inventory.has('llave_reja') && !F['desf:llave']) {
      F['desf:llave'] = true;
      g.giveItem('llave_reja');
      // (y si nunca le hablaste, la flor que te habría dado)
      const flor = !F['desf:met'] && !g.inventory.has('flor_blanca');
      if (flor) g.giveItem('flor_blanca');
      g.ui.toast(flor ? MSG.desfCuerpoFlor : MSG.desfCuerpoLlave, 5);
      g.saveGame();
      return true;
    }
    g.ui.toast(F['desf:llave'] ? MSG.desfCuerpoNada : MSG.desfCuerpo, 5);
    return true;
  }

  // ------------------------------------------------------------ partida
  applyFlags() {
    this.fase = null;
    this.citas = [];
    this.bruma.quita();
    this.luzFuera();
    if (this.F['desf:muerto']) this.mancha(1);
    else if (this.sangre) this.mancha(0);
    if (this.cuerpo) this.cuerpo.hidden = !this.F['desf:muerto'];
    this.lunaOn(false);
    // (muerto en la cisterna: tumbado en la luz, para siempre)
    this.yace = null;
    if (this.F['rama:fisico']) this.yaceCuerpo();
    if (this.cuerpoF) this.cuerpoF.hidden = !this.F['rama:fisico'];
  }
  onRespawn() {
    const g = this.g;
    if (!this.fase && !this.bruma.on) return;
    // (la pelea vuelve a empezar al volver a bajar; él se va; la bruma, fuera)
    for (const c of this.minions) c.reset();
    // (si caes en la escena: el HUD, otra vez)
    if (this.fase === 'escena') {
      g.ui.showHud(true);
      g.post.U.uBars.value = 0;
    }
    this.fase = null;
    this.citas = [];
    this.duelo.citas = [];
    this.caida = null;
    this.otraVez = false;
    this.retira();
    this.bruma.quita();
    this.luzFuera();
    this.lunaOn(false);
    g.timeK = 1;
    if (g.camRig.override && this.cam && g.camRig.override.pos === this.cam.pos) g.camRig.override = null;
  }
}
