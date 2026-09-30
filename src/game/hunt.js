// La caza en las bodegas del canónigo.
// Empieza al acabar la cinemática (o, las veces siguientes, al llegar al pie
// de la escalera: arriba, alguien cierra la puerta de un portazo y echa la
// tranca). Mientras dura, el Descoyuntado es el jefe activo, pero su barra
// sólo se ve cuando pelea contigo; la música es la de la caza (tensión, la
// caja de música rota) y pasa a la de pelea cuando se te echa encima.
// Termina al salir por el pozo del Postigo, al morir (todo vuelve a su sitio:
// él a su cadáver) o al matarlo (alguien retira la tranca y huye).
import * as THREE from 'three';
import { Rig } from '../entities/rig.js';
import { villagerDef, CORPSE_POSES } from '../entities/models.js';
import { CELLAR } from '../world/level_cellar.js';
import { CANON } from '../world/level_canon.js';
import { DEG } from '../core/util.js';

export class CellarHunt {
  constructor(game) {
    this.g = game;
    this.active = false;
    this.boss = game.bosses.descoyuntado || null;
    this.music = null;
    // el cadáver que se come (se mueve: la cinemática lo arroja lejos)
    const rig = new Rig(villagerDef('soldier', 3));
    rig.own();
    this.corpse = rig;
    game.scene.add(rig.root);
    this.corpseAt = new THREE.Vector3();
    this.resetCorpse();
  }

  // Tumbado boca arriba junto al altar, donde come.
  resetCorpse() {
    const [x, z] = CELLAR.feast.corpse;
    this.poseCorpse('back', x, CELLAR.FLOOR, z, 1.2);
  }
  poseCorpse(name, x, y, z, yaw) {
    const r = this.corpse;
    const P = CORPSE_POSES[name];
    const pose = {};
    for (const k in P) pose[k] = P[k].map((v) => v * DEG);
    r.apply(pose);
    r.joints.hips.position.y = name === 'sit' ? 0.2 : 0.16;
    r.root.position.set(x, y, z);
    r.root.rotation.set(0, yaw, 0);
    r.root.updateMatrixWorld(true);
    this.lightCorpse();
  }
  // luz horneada del sitio sobre el cadáver
  lightCorpse() {
    const g = this.g;
    const p = this.corpse.root.position;
    const zn = g.zoneAt({ x: p.x, y: p.y + 0.5, z: p.z });
    const pr = g.probe.sample(p.x, p.y + 0.6, p.z, zn && zn.room ? g.level.ctx.wb.roomId(zn.room) : 0);
    this.corpse.setProbe(pr[0], pr[1], pr[2], p.y);
  }
  // Punto del cadáver que muerde (el pecho), en el mundo.
  bitePoint(out = this.corpseAt) {
    return this.corpse.worldPos('chest', out);
  }

  start(kind) {
    const b = this.boss;
    const g = this.g;
    if (this.active || !b || b.dead) return;
    this.active = true;
    g.activeBoss = b;
    b.scripted = false;
    // al volver a bajar: la puerta se cierra de golpe allá arriba
    if (kind === 'return') {
      const door = g.interact.list.find((i) => i.id === 'd_sotano');
      if (door && (door.done || door.open > 0.01)) {
        g.interact.slamShut(door);
        g.audio && g.audio.play('doorSlam', { x: door.x, y: 1, z: door.z });
        setTimeout(() => g.audio && g.audio.play('bar', { x: door.x, y: 1, z: door.z }), 500);
        g.ui.toast('Allá arriba, la puerta se cierra de un portazo. Alguien echa la tranca.', 4.5);
      }
    }
    b.D.startHunting(kind);
    this.music = null;
    g.saveGame();
  }

  stop(reset = true) {
    const g = this.g;
    const b = this.boss;
    if (!this.active) return;
    this.active = false;
    if (g.activeBoss === b) g.activeBoss = null;
    if (b && reset && !b.dead) b.reset();
    if (b && !b.dead) this.resetCorpse();
    this.music = null;
    if (g.audio && b && !b.dead) g.audio.stopMusic();
  }

  // Muerte del jugador, título: todo a su sitio.
  reset() {
    this.stop(false);
    if (this.boss && !this.boss.dead) this.resetCorpse();
  }

  update(dt) {
    const g = this.g;
    const b = this.boss;
    if (!b) return;
    const p = g.player;
    // dónde come
    if (b.D && !b.dead) b.D.feast = b.D.mode === 'lair' ? this.bitePoint() : null;
    if (b.dead) {
      if (this.active) this.stop(false);
      return;
    }
    if (g.state !== 'play' || g.cutscene) return;
    // (la escalera, hasta la puerta atrancada, también es la bodega)
    const onStair = p.pos.z < CANON.cellarDoor.z - 0.2 && p.pos.z > CANON.stair.bottom - 1 && Math.abs(p.pos.x - CANON.stair.x) < 1.8 && p.pos.y < 0.6;
    const inC = (g.inCellar(p.pos) || onStair) && !p.dead;
    if (!this.active) {
      // al pie de la escalera (o en el fondo del pozo): empieza otra vez
      if (inC && g.flags['cine:sotano'] && p.pos.z < CANON.stair.bottom + 1.2) this.start('return');
      return;
    }
    if (!inC && !p.dead) {
      this.stop();
      return;
    }
    // música: la caza, o la pelea cuando se te echa encima
    const D = b.D;
    const want = D.engaged ? (D.phase >= 2 ? 'bossCellar2' : 'bossCellar') : 'cellarHunt';
    if (want !== this.music && g.audio) {
      this.music = want;
      g.audio.music(want);
    }
  }
}
