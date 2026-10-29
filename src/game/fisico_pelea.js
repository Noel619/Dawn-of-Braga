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
import * as THREE from 'three';
import { DIALOG } from './story.js';
import { FI_CLIPS, fiSay, fiGrp } from '../entities/fisico.js';
import { additiveFog } from '../gfx/materials.js';
import { getTexture } from '../gfx/textures.js';
import { damp, dampAngle } from '../core/util.js';

// el quirófano (donde empieza la pelea), el brasero, la mesa y por dónde
// entran los que llama (del zaguán, por el hueco del tabique)
const QUIR = { x0: 50.1, z0: 34.6, x1: 60.4, z1: 40.75 };
const BRASERO = { x: 57.4, z: 38.9, ante: [56.55, 38.35] };
const SALE = { x: 57.0, z: 38.2 };
const LLAMADOS = ['e_coronado_llamado1', 'e_coronado_llamado2'];
const HUECO = { x: 57.6, z: 41.6 };
// la nube de beleño: radio, lo que dura, lo que frena
const NUBE = { r: 2.4, t: 9, lento: 0.55 };
// lo que arde a la vez (la paja del suelo)
const MAX_FUEGOS = 4;

const dentro = (r, p) => p.x > r.x0 && p.x < r.x1 && p.z > r.z0 && p.z < r.z1;

export class PeleaFisico {
  constructor(g, F) {
    this.g = g;
    this.F = F;
    this.nubes = [];
    this.fuegos = 0;
    // lo que pasa dentro de un rato (en tiempo de juego: en pausa, espera)
    this.citas = [];
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
    F.show(SALE.x, SALE.z, Math.atan2(p.pos.x - SALE.x, p.pos.z - SALE.z));
    e.D.engaged = true;
    e.data.fase = 1;
    e.data.llamo = false;
    F.setMusic(null);
    g.startBoss(e);
    F.say(DIALOG.fisicoPelea, 3.4);
  }

  // ------------------------------------------------------------ lo que piensa
  think(e, pl, d, dt) {
    if (e.state === 'guion') return 'handled';
    // los tiempos: a media vida, la máscara; con un cuarto, el fuego
    const k = e.hp / e.maxHp;
    if (e.data.fase === 1 && k <= 0.5) return this.guionEmpieza('mascara');
    if (e.data.fase === 2 && k <= 0.25) return this.guionEmpieza('brasero');
    e.data.calOk = e.data.fase === 3 && this.g.time - (e.data.calT ?? -99) > 9;
    if (e.state === 'attack' && e.atk && e.atk.name === 'cal') e.data.calT = this.g.time;
    return null;
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
    const d = g.interact.list.find((i) => i.id === 'd_quirofano_patio');
    if (d) {
      g.interact.setOpen(d, true);
      g.flags['door:d_quirofano_patio'] = true;
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
export const MESA_CANTO = { x: 54.6, z: 37.98 };
