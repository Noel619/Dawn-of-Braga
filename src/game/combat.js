// Resolución de combate y efectos de ataque (ondas, proyectiles, fuego).
import * as THREE from 'three';
import { angleDiff, DEG, clamp } from '../core/util.js';
import { getTexture } from '../gfx/textures.js';
import { additiveFog } from '../gfx/materials.js';

const ringGeo = new THREE.RingGeometry(0.85, 1, 32).rotateX(-Math.PI / 2);

export class Combat {
  constructor(game) {
    this.game = game;
    this.projectiles = [];
    this.pools = [];
    this.rings = [];
    this.tempFires = [];
    this.glowTex = getTexture('glow');
    this.flashes = [];
  }

  // destello breve en el punto de impacto
  impactFlash(x, y, z, size = 1.2, color = 0xffe0b0) {
    const s = this._orb(color, size);
    s.position.set(x, y, z);
    this.flashes.push({ s, t: 0, dur: 0.1, size });
  }

  // ------------------------------------------------------------ jugador -> enemigos
  playerSwing(player, atk) {
    const g = this.game;
    for (const e of g.activeEnemies) {
      if (e.dead || player.hitSet.has(e) || !e.obj.visible || e.state === 'ceiling') continue;
      const dx = e.pos.x - player.pos.x,
        dz = e.pos.z - player.pos.z;
      const d = Math.hypot(dx, dz) || 0.001;
      const dy = e.pos.y - player.pos.y;
      if (dy < -e.T.height - 0.3 || dy > 1.9) continue;
      if (d > atk.range + e.body.radius) continue;
      const ang = Math.abs(angleDiff(player.yaw, Math.atan2(dx, dz)));
      if (d > e.body.radius + 0.6 && ang > atk.arc * 0.5 * DEG) continue;
      if (!g.world.col.lineOfSight(player.pos.x, player.pos.y + 1.2, player.pos.z, e.pos.x, e.pos.y + Math.min(1.2, e.T.height * 0.5), e.pos.z)) continue;
      player.hitSet.add(e);
      // por la espalda o sin que se lo espere: golpe crítico
      const behind = Math.abs(angleDiff(e.yaw, Math.atan2(player.pos.x - e.pos.x, player.pos.z - e.pos.z))) > 125 * DEG;
      const crit = !e.boss && (!e.aware || behind);
      const dmg = Math.round(atk.dmg * player.dmgMul * (crit ? 1.7 : 1) * (0.92 + Math.random() * 0.16));
      const r = e.takeHit(dmg, atk.poise * (crit ? 2 : 1), player.pos.x, player.pos.z, !!atk.heavy, atk.dir || 0);
      if (crit && r !== 'blocked' && r !== 'none') {
        g.hitstop = Math.max(g.hitstop, 0.14);
        g.fx.blood.emit(e.pos.x, e.pos.y + Math.min(1.3, e.T.height * 0.55), e.pos.z, 24, { speed: 5 });
      }
      const hx = e.pos.x - (dx / d) * e.body.radius * 0.6,
        hy = e.pos.y + Math.min(1.3, e.T.height * 0.55),
        hz = e.pos.z - (dz / d) * e.body.radius * 0.6;
      if (r === 'blocked') {
        this.impactFlash(hx, hy, hz, 1.1, 0xffd080);
        g.fx.blood.emit(hx, hy, hz, 14, { color: [1.0, 0.8, 0.4], speed: 5, life: 0.35, up: 1.5 });
        g.audio && g.audio.play('clang', e.pos);
        g.hitstop = Math.max(g.hitstop, 0.07);
        g.camRig.shake(0.12);
        player.useSt(14);
        g.input.rumble(0.4, 0.6, 90);
      } else if (r !== 'none') {
        const f = player.forward();
        this.impactFlash(hx, hy, hz, atk.heavy ? 1.7 : 1.2, 0xff9070);
        g.fx.blood.emit(hx, hy, hz, atk.heavy ? 34 : 20, { dir: { x: f.x, z: f.z }, speed: atk.heavy ? 6 : 4.5 });
        g.audio && g.audio.play(atk.heavy ? 'hitHeavy' : 'hit', e.pos);
        g.hitstop = Math.max(g.hitstop, atk.heavy ? 0.12 : 0.07);
        g.camRig.shake(atk.heavy ? 0.28 : 0.14);
        g.input.rumble(atk.heavy ? 0.8 : 0.45, 0.5, atk.heavy ? 140 : 80);
        if (r === 'kill') {
          g.fx.blood.emit(hx, hy, hz, 30, { speed: 6 });
          g.audio && g.audio.enemyVoice(e, 'death');
        } else g.audio && g.audio.enemyVoice(e, 'hurt');
      }
    }
  }

  // ------------------------------------------------------------ enemigos -> jugador
  enemyStrike(e, a, i) {
    const p = this.game.player;
    if (p.dead) return true;
    const dx = p.pos.x - e.pos.x,
      dz = p.pos.z - e.pos.z;
    const d = Math.hypot(dx, dz);
    const dy = p.pos.y - e.pos.y;
    if (dy < -1.5 || dy > e.T.height) return false;
    if (d > (a.range ?? 2) + p.body.radius) return false;
    const ang = Math.abs(angleDiff(e.yaw, Math.atan2(dx, dz)));
    if (d > e.body.radius + 0.6 && ang > (a.arc ?? 90) * 0.5 * DEG) return false;
    return this.apply(e, a, e.pos.x, e.pos.z);
  }

  enemyStrikeAt(e, a, x, z) {
    return this.apply(e, a, x, z);
  }

  apply(src, a, sx, sz) {
    const g = this.game;
    const p = g.player;
    const r = p.receiveHit({ dmg: a.dmg, stDmg: a.stDmg, unblockable: a.unblockable, stagger: a.stagger, knock: a.knock, chip: a.chip }, sx, sz);
    if (r === 'dodge' || r === 'none') return false;
    const hy = p.pos.y + 1.2;
    if (r === 'block' || r === 'guardbreak') {
      g.fx.blood.emit(p.pos.x, hy, p.pos.z, 16, { color: [1.0, 0.8, 0.4], speed: 5, life: 0.35, up: 1.5 });
      g.audio && g.audio.play(r === 'guardbreak' ? 'guardbreak' : 'block', p.pos);
      g.camRig.shake(r === 'guardbreak' ? 0.4 : 0.15);
      g.hitstop = Math.max(g.hitstop, 0.05);
      g.input.rumble(0.3, 0.5, 90);
    } else {
      g.fx.blood.emit(p.pos.x, hy, p.pos.z, 22, { speed: 4.5 });
      g.audio && g.audio.play('playerHurt', p.pos);
      g.camRig.shake(a.dmg >= 30 ? 0.5 : 0.3);
      g.hitstop = Math.max(g.hitstop, 0.06);
      g.hurtFlash = 1;
      g.input.rumble(0.9, 0.7, 200);
    }
    return true;
  }

  // Onda de choque en el suelo.
  shockwave(x, y, z, r, dmg, src, knock = 7) {
    const g = this.game;
    this.ring(x, y, z, r, 0x8a7a66, 0.45);
    g.fx.blood.emit(x, y + 0.2, z, 30, { color: [0.35, 0.32, 0.28], speed: 7, life: 0.7, up: 2 });
    g.audio && g.audio.play('slam', { x, y, z });
    const dd = Math.hypot(g.player.pos.x - x, g.player.pos.z - z);
    g.camRig.shake(clamp(0.6 - dd * 0.04, 0.1, 0.6));
    const p = g.player;
    // no castigar dos veces el mismo golpe (impacto directo + onda)
    const recent = p.lastHitT !== undefined && g.time - p.lastHitT < 0.4;
    if (!recent && dd < r + 0.3 && Math.abs(p.pos.y - y) < 1.2 && p.body.grounded) this.apply(src, { dmg, knock, stagger: true, chip: 0.25 }, x, z);
  }

  // Tañido / rugido: onda que aturde (sólo se evita esquivando).
  toll(e, r, dmg, kind = 'bell') {
    const g = this.game;
    this.ring(e.pos.x, e.pos.y + 0.1, e.pos.z, r, kind === 'roar' ? 0xff4020 : 0xc8b070, 0.8);
    g.audio && g.audio.play(kind === 'roar' ? 'roar' : 'bellToll', e.pos);
    g.warp = 1;
    g.camRig.shake(0.45);
    const p = g.player;
    const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    if (d < r && Math.abs(p.pos.y - e.pos.y) < 3) this.apply(e, { dmg, unblockable: true, stagger: true, knock: 4 }, e.pos.x, e.pos.z);
  }

  ring(x, y, z, r, color, dur) {
    const m = new THREE.Mesh(ringGeo, additiveFog(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
    m.position.set(x, y + 0.08, z);
    m.scale.set(0.2, 1, 0.2);
    this.game.scene.add(m);
    this.rings.push({ m, r, t: 0, dur });
  }

  // ------------------------------------------------------------ proyectiles
  _orb(color, size) {
    const sm = additiveFog(new THREE.SpriteMaterial({ map: this.glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: true }));
    const s = new THREE.Sprite(sm);
    s.scale.set(size, size, 1);
    this.game.scene.add(s);
    return s;
  }

  wail(e) {
    const g = this.game;
    const h = e.rig.worldPos('head');
    const p = g.player.pos;
    const dir = new THREE.Vector3(p.x - h.x, p.y + 1.2 - h.y, p.z - h.z).normalize();
    const spd = 7.5;
    this.projectiles.push({
      kind: 'wail',
      pos: h.clone(),
      vel: dir.multiplyScalar(spd),
      spd,
      homing: 1.5,
      life: 4.5,
      dmg: 17,
      src: e,
      sprite: this._orb(0xa0c8ff, 1.3),
      core: this._orb(0xffffff, 0.45),
      color: [0.5, 0.65, 1.0],
    });
    g.audio && g.audio.play('wail', h);
  }

  ember(e) {
    const g = this.game;
    const c = e.P.censer ? e.P.censer.pos.clone() : e.pos.clone().add(new THREE.Vector3(0, 4, 0));
    const p = g.player.pos;
    // tiro balístico con algo de adelanto y dispersión
    const tx = p.x + g.player.vx * 0.6 + (Math.random() - 0.5) * 3,
      tz = p.z + g.player.vz * 0.6 + (Math.random() - 0.5) * 3;
    const T = 1.1;
    const grav = 12;
    const vel = new THREE.Vector3((tx - c.x) / T, (p.y - c.y + 0.5 * grav * T * T) / T, (tz - c.z) / T);
    this.projectiles.push({ kind: 'ember', pos: c, vel, grav, life: 3, dmg: 20, src: e, sprite: this._orb(0xff7a20, 1.6), core: this._orb(0xffe0a0, 0.6), color: [1, 0.45, 0.1] });
    g.audio && g.audio.play('fireWhoosh', c);
  }

  fireBurst(x, y, z, r, dmg, src) {
    const g = this.game;
    this.ring(x, y, z, r, 0xff6a20, 0.6);
    g.fx.blood.emit(x, y + 0.4, z, 40, { color: [1, 0.5, 0.12], speed: 8, life: 0.8, up: 3 });
    g.audio && g.audio.play('explosion', { x, y, z });
    g.flash = Math.max(g.flash, 0.35);
    g.camRig.shake(0.55);
    // fuego temporal
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const f = g.fx.fires.add({ x: x + Math.cos(a) * r * 0.4, y, z: z + Math.sin(a) * r * 0.4, s: 1.4, smoke: i === 0 });
      this.tempFires.push({ f, t: 1.2 });
    }
    g.fx.fires.refresh(g.camera.position.x, g.camera.position.z);
    const p = g.player;
    const d = Math.hypot(p.pos.x - x, p.pos.z - z);
    if (d < r && Math.abs(p.pos.y - y) < 2) this.apply(src, { dmg, stagger: true, knock: 8, chip: 0.3 }, x, z);
    if (src && src.data && src.data.phase === 2) this.firePool(x, y, z, 2.2, 5);
  }

  firePool(x, y, z, r, dur) {
    const g = this.game;
    const fires = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.random();
      fires.push(g.fx.fires.add({ x: x + Math.cos(a) * r * 0.5, y, z: z + Math.sin(a) * r * 0.5, s: 0.9, smoke: false }));
    }
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 16).rotateX(-Math.PI / 2), additiveFog(new THREE.MeshBasicMaterial({ map: getTexture('glow'), color: 0xff4a10, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })));
    m.position.set(x, y + 0.05, z);
    g.scene.add(m);
    this.pools.push({ x, y, z, r, t: dur, fires, m, tick: 0 });
    g.fx.fires.refresh(g.camera.position.x, g.camera.position.z);
  }

  update(dt) {
    const g = this.game;
    const p = g.player;
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const F = this.flashes[i];
      F.t += dt;
      const k = F.t / F.dur;
      F.s.scale.setScalar(F.size * (1 - k * 0.6));
      F.s.material.opacity = 1 - k;
      if (k >= 1) {
        g.scene.remove(F.s);
        F.s.material.dispose();
        this.flashes.splice(i, 1);
      }
    }
    // anillos
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const R = this.rings[i];
      R.t += dt;
      const k = R.t / R.dur;
      const s = R.r * (0.2 + 0.8 * Math.sqrt(k));
      R.m.scale.set(s, 1, s);
      R.m.material.opacity = 0.8 * (1 - k);
      if (k >= 1) {
        g.scene.remove(R.m);
        R.m.material.dispose();
        this.rings.splice(i, 1);
      }
    }
    // proyectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const P = this.projectiles[i];
      P.life -= dt;
      if (P.homing && !p.dead) {
        const want = new THREE.Vector3(p.pos.x - P.pos.x, p.pos.y + 1.2 - P.pos.y, p.pos.z - P.pos.z).normalize().multiplyScalar(P.spd);
        P.vel.lerp(want, Math.min(1, P.homing * dt));
      }
      if (P.grav) P.vel.y -= P.grav * dt;
      const step = P.vel.length() * dt;
      const dir = P.vel.clone().normalize();
      const hitWall = g.world.col.raycast(P.pos.x, P.pos.y, P.pos.z, dir.x, dir.y, dir.z, step + 0.1, (b) => b.maxy - b.miny > 0.2);
      P.pos.addScaledVector(P.vel, dt);
      P.sprite.position.copy(P.pos);
      P.core.position.copy(P.pos);
      const s = 1 + Math.sin(g.time * 30 + i) * 0.15;
      P.sprite.scale.setScalar((P.kind === 'wail' ? 1.3 : 1.6) * s);
      g.fx.blood.emit(P.pos.x, P.pos.y, P.pos.z, 1, { color: P.color, speed: 0.6, life: 0.4, up: 0.2, gravity: -1 });
      let dead = P.life <= 0 || hitWall !== Infinity;
      const pd = Math.hypot(P.pos.x - p.pos.x, P.pos.y - (p.pos.y + 1.1), P.pos.z - p.pos.z);
      if (!dead && pd < 0.8 && !p.dead) {
        const r = p.receiveHit({ dmg: P.dmg, stagger: P.kind === 'ember', knock: 4 }, P.pos.x - P.vel.x, P.pos.z - P.vel.z);
        if (r !== 'dodge' && r !== 'none') {
          dead = true;
          if (r === 'hit') {
            g.hurtFlash = 1;
            g.camRig.shake(0.3);
            g.audio && g.audio.play('playerHurt', p.pos);
          } else g.audio && g.audio.play('block', p.pos);
        }
      }
      if (dead) {
        g.fx.blood.emit(P.pos.x, P.pos.y, P.pos.z, 18, { color: P.color, speed: 4, life: 0.5, up: 1 });
        if (P.kind === 'ember') {
          g.audio && g.audio.play('fireWhoosh', P.pos);
          const gy = g.world.col.groundHeight(P.pos.x, P.pos.z, 0.2, P.pos.y + 0.5);
          if (P.src && P.src.data && P.src.data.phase === 2) this.firePool(P.pos.x, gy, P.pos.z, 1.5, 4);
          const d2 = Math.hypot(p.pos.x - P.pos.x, p.pos.z - P.pos.z);
          if (d2 < 1.6 && !p.dead) this.apply(P.src, { dmg: 12, knock: 4 }, P.pos.x, P.pos.z);
        } else g.audio && g.audio.play('wailHit', P.pos);
        g.scene.remove(P.sprite);
        g.scene.remove(P.core);
        P.sprite.material.dispose();
        P.core.material.dispose();
        this.projectiles.splice(i, 1);
      }
    }
    // charcos de fuego
    for (let i = this.pools.length - 1; i >= 0; i--) {
      const F = this.pools[i];
      F.t -= dt;
      F.tick -= dt;
      F.m.material.opacity = Math.min(0.8, F.t) * (0.8 + 0.2 * Math.sin(g.time * 12 + i));
      const d = Math.hypot(p.pos.x - F.x, p.pos.z - F.z);
      if (d < F.r && F.tick <= 0 && !p.dead && Math.abs(p.pos.y - F.y) < 1 && !p.iframe) {
        F.tick = 0.5;
        p.hp -= 6;
        g.hurtFlash = Math.max(g.hurtFlash, 0.6);
        g.audio && g.audio.play('burn', p.pos);
        if (p.hp <= 0) p.die();
      }
      if (F.t <= 0) {
        for (const f of F.fires) f.on = false;
        g.scene.remove(F.m);
        F.m.geometry.dispose();
        F.m.material.dispose();
        this.pools.splice(i, 1);
        g.fx.fires.refresh(g.camera.position.x, g.camera.position.z);
      }
    }
    // fuegos temporales
    for (let i = this.tempFires.length - 1; i >= 0; i--) {
      const T = this.tempFires[i];
      T.t -= dt;
      if (T.t <= 0) {
        T.f.on = false;
        this.tempFires.splice(i, 1);
      }
    }
    if (this.tempFires.length === 0 && this._hadTemp) g.fx.fires.refresh(g.camera.position.x, g.camera.position.z);
    this._hadTemp = this.tempFires.length > 0;
    // limpiar fuegos apagados de la lista
    if (Math.random() < 0.02) g.fx.fires.list = g.fx.fires.list.filter((f) => f.on);
  }

  clear() {
    const g = this.game;
    for (const P of this.projectiles) {
      g.scene.remove(P.sprite);
      g.scene.remove(P.core);
      P.sprite.material.dispose();
      P.core.material.dispose();
    }
    this.projectiles.length = 0;
    for (const F of this.pools) {
      for (const f of F.fires) f.on = false;
      g.scene.remove(F.m);
      F.m.geometry.dispose();
      F.m.material.dispose();
    }
    this.pools.length = 0;
    for (const T of this.tempFires) T.f.on = false;
    this.tempFires.length = 0;
    for (const R of this.rings) {
      g.scene.remove(R.m);
      R.m.material.dispose();
    }
    this.rings.length = 0;
  }
}
