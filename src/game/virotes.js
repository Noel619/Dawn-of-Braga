// Los virotes de las ballestas (PLAN_CASTILLO.md, §9): los que tiras tú y
// los que te tiran los ballesteros. Vuelan rectos y deprisa (caen un poco),
// se clavan en lo que tocan, y ahí se quedan un rato; en las criaturas hieren
// y a las pequeñas las desequilibran. También cortan cuerdas: lo que se
// apunte con addRope({ a, b, r, onCut }) se rompe al pasarle un virote cerca.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { objMat } from '../gfx/materials.js';
import { DEG, angleDiff } from '../core/util.js';

const SPEED = 44; // m/s
const GRAV = 2.6; // lo que caen (m/s²): poco, a estas distancias
const LIFE = 2.2;
const STUCK = 30; // lo que dura clavado en un muro (s)
const MAX_STUCK = 24;

const _a = new THREE.Vector3(),
  _b = new THREE.Vector3(),
  _d = new THREE.Vector3(),
  _q = new THREE.Quaternion(),
  _z = new THREE.Vector3(0, 0, 1);

// el virote, a lo largo de +z con la punta delante (z = 0, la punta)
function boltGeos() {
  const shaft = new THREE.BoxGeometry(0.014, 0.014, 0.36);
  shaft.translate(0, 0, -0.2);
  const head = new THREE.ConeGeometry(0.016, 0.06, 4);
  head.rotateX(Math.PI / 2);
  head.translate(0, 0, -0.01);
  const f1 = new THREE.BoxGeometry(0.003, 0.03, 0.07);
  f1.translate(0, 0.012, -0.34);
  const f2 = new THREE.BoxGeometry(0.03, 0.003, 0.07);
  f2.translate(0, 0, -0.34);
  return { wood: mergeGeometries([shaft, f1, f2]), iron: head };
}

// Distancia mínima entre el segmento p0-p1 y el segmento vertical (x, y0..y1, z).
function segToAxis(p0, p1, x, y0, y1, z) {
  // muestreo fino del segmento (los virotes recorren menos de un metro por paso)
  let best = Infinity,
    bt = 0;
  for (let k = 0; k <= 6; k++) {
    const t = k / 6;
    const px = p0.x + (p1.x - p0.x) * t,
      py = p0.y + (p1.y - p0.y) * t,
      pz = p0.z + (p1.z - p0.z) * t;
    const cy = Math.max(y0, Math.min(y1, py));
    const d = Math.hypot(px - x, py - cy, pz - z);
    if (d < best) {
      best = d;
      bt = t;
    }
  }
  return [best, bt];
}
// Distancia entre dos segmentos (muestreo).
function segToSeg(p0, p1, a, b) {
  let best = Infinity;
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    _a.set(p0.x + (p1.x - p0.x) * t, p0.y + (p1.y - p0.y) * t, p0.z + (p1.z - p0.z) * t);
    // el punto de a-b más cercano a _a
    _d.subVectors(b, a);
    const L2 = _d.lengthSq() || 1;
    const u = Math.max(0, Math.min(1, _b.subVectors(_a, a).dot(_d) / L2));
    _b.copy(a).addScaledVector(_d, u);
    best = Math.min(best, _a.distanceTo(_b));
  }
  return best;
}

export class Virotes {
  constructor(game) {
    this.g = game;
    this.list = [];
    this.stuck = [];
    this.ropes = [];
    const G = boltGeos();
    this.geoW = G.wood;
    this.geoI = G.iron;
    this.matW = objMat('wooddark');
    this.matI = objMat('iron');
  }

  mesh() {
    const o = new THREE.Group();
    o.add(new THREE.Mesh(this.geoW, this.matW), new THREE.Mesh(this.geoI, this.matI));
    this.g.scene.add(o);
    return o;
  }

  // Una cuerda que un virote puede cortar (a, b: sus extremos; r: su grosor
  // para el acierto; onCut, al cortarse).
  addRope(o) {
    const R = { a: new THREE.Vector3(...o.a), b: new THREE.Vector3(...o.b), r: o.r ?? 0.12, onCut: o.onCut, cut: false, id: o.id };
    this.ropes.push(R);
    return R;
  }

  // Un virote desde 'from' en la dirección 'dir' (normalizada). owner:
  // 'player' (hiere a las criaturas) o la criatura que lo tira (hiere al
  // jugador).
  fire(from, dir, o = {}) {
    const B = { pos: from.clone(), vel: dir.clone().multiplyScalar(o.speed ?? SPEED), life: LIFE, owner: o.owner, dmg: o.dmg ?? 40, poise: o.poise ?? 30, obj: this.mesh() };
    B.obj.position.copy(B.pos);
    B.obj.quaternion.setFromUnitVectors(_z, dir);
    this.list.push(B);
    const au = this.g.audio;
    au && au.play('xbowShot', from);
    return B;
  }

  // El jugador tira: a lo que tiene fijado (al pecho) o, si nada, al frente.
  playerShoot(p, target, atk) {
    const g = this.g;
    const from = new THREE.Vector3(p.pos.x, p.pos.y + 1.42, p.pos.z);
    const f = p.forward();
    from.x += f.x * 0.55;
    from.z += f.z * 0.55;
    let dir;
    if (target && !target.dead) {
      const ty = target.pos.y + Math.min(1.3, target.T.height * 0.6);
      dir = new THREE.Vector3(target.pos.x - from.x, ty - from.y, target.pos.z - from.z);
      // (lo que cae por el camino)
      const d = dir.length();
      dir.y += 0.5 * GRAV * (d / SPEED) ** 2;
      dir.normalize();
    } else {
      // sin fijar: al frente, con lo que mire la cámara arriba o abajo (poco)
      const pitch = Math.max(-0.35, Math.min(0.35, -(g.camRig ? g.camRig.pitch - 0.18 : 0)));
      dir = new THREE.Vector3(f.x * Math.cos(pitch), Math.sin(pitch), f.z * Math.cos(pitch)).normalize();
    }
    this.fire(from, dir, { owner: 'player', dmg: Math.round((atk ? atk.dmg : 48) * p.dmgMul), poise: atk ? atk.poise : 34 });
    g.camRig && g.camRig.shake(0.1);
    g.input && g.input.rumble(0.5, 0.3, 90);
    g.onPlayerAction && g.onPlayerAction('shoot', {});
  }

  // Una criatura tira al jugador (con algo de puntería: adelanta un poco a
  // donde va, y falla de vez en cuando).
  enemyShoot(e, o = {}) {
    const g = this.g;
    const p = g.player;
    if (p.dead) return;
    const from = new THREE.Vector3(e.pos.x, e.pos.y + (o.h ?? 1.45), e.pos.z);
    const fy = Math.sin(e.yaw),
      fz = Math.cos(e.yaw);
    from.x += fy * 0.5;
    from.z += fz * 0.5;
    const lead = o.lead ?? 0.25;
    const tx = p.pos.x + p.vx * lead,
      tz = p.pos.z + p.vz * lead,
      ty = p.pos.y + 1.15;
    const dir = new THREE.Vector3(tx - from.x, ty - from.y, tz - from.z);
    const d = dir.length();
    dir.y += 0.5 * GRAV * (d / SPEED) ** 2;
    dir.normalize();
    const sp = o.spread ?? 0.035;
    dir.x += (Math.random() - 0.5) * 2 * sp;
    dir.y += (Math.random() - 0.5) * sp;
    dir.z += (Math.random() - 0.5) * 2 * sp;
    dir.normalize();
    this.fire(from, dir, { owner: e, dmg: o.dmg ?? 26 });
  }

  update(dt) {
    const g = this.g;
    const col = g.world.col;
    const p = g.player;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const B = this.list[i];
      B.life -= dt;
      B.vel.y -= GRAV * dt;
      const p0 = _a.copy(B.pos);
      const step = B.vel.length() * dt;
      _d.copy(B.vel).normalize();
      const wall = col.raycast(B.pos.x, B.pos.y, B.pos.z, _d.x, _d.y, _d.z, step + 0.05, (b) => !b.camOnly && !b.noSight && b.tag !== 'fog');
      const p1 = _b.copy(B.pos).addScaledVector(B.vel, dt);
      if (wall !== Infinity) p1.copy(B.pos).addScaledVector(_d, Math.max(0, wall - 0.02));
      let done = false;
      // las cuerdas
      for (const R of this.ropes) {
        if (R.cut || segToSeg(p0, p1, R.a, R.b) > R.r) continue;
        R.cut = true;
        if (R.onCut) R.onCut(R, B);
        g.audio && g.audio.play('ropeSnap', p1);
      }
      // a quién da
      if (B.owner === 'player') {
        for (const e of g.activeEnemies) {
          if (e.dead || e.T.friendly || !e.obj.visible || e.state === 'ceiling') continue;
          const [dd, t] = segToAxis(p0, p1, e.pos.x, e.pos.y + 0.2, e.pos.y + e.T.height - 0.1, e.pos.z);
          if (dd > e.body.radius + 0.12) continue;
          this.hitEnemy(B, e, p0.clone().lerp(p1, t));
          done = true;
          break;
        }
      } else if (!p.dead && B.owner) {
        const [dd] = segToAxis(p0, p1, p.pos.x, p.pos.y + 0.2, p.pos.y + 1.75, p.pos.z);
        if (dd < p.body.radius + 0.1) {
          const r = g.combat.apply(B.owner, { dmg: B.dmg, noParry: true, knock: 3, stagger: false }, B.pos.x - B.vel.x, B.pos.z - B.vel.z);
          if (r) done = true;
        }
      }
      B.pos.copy(p1);
      B.obj.position.copy(B.pos);
      if (B.vel.lengthSq() > 0.01) B.obj.quaternion.setFromUnitVectors(_z, _d.copy(B.vel).normalize());
      if (!done && wall !== Infinity) {
        // se clava donde da (y se queda)
        this.stick(B);
        this.list.splice(i, 1);
        continue;
      }
      if (done || B.life <= 0) {
        g.scene.remove(B.obj);
        this.list.splice(i, 1);
      }
    }
    for (let i = this.stuck.length - 1; i >= 0; i--) {
      const S = this.stuck[i];
      S.t -= dt;
      if (S.t <= 0) {
        g.scene.remove(S.obj);
        this.stuck.splice(i, 1);
      }
    }
  }

  stick(B) {
    const g = this.g;
    B.obj.position.addScaledVector(_d.copy(B.vel).normalize(), 0.06);
    this.stuck.push({ obj: B.obj, t: STUCK });
    while (this.stuck.length > MAX_STUCK) g.scene.remove(this.stuck.shift().obj);
    g.fx && g.fx.blood.emit(B.pos.x, B.pos.y, B.pos.z, 6, { color: [0.62, 0.56, 0.48], speed: 2.2, life: 0.4, up: 0.6 });
    g.audio && g.audio.play('xbowThud', B.pos);
  }

  hitEnemy(B, e, at) {
    const g = this.g;
    const p = g.player;
    // por la espalda o sin que se lo espere: crítico
    const behind = Math.abs(angleDiff(e.yaw, Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z))) > 125 * DEG;
    const crit = (!e.boss && (!e.aware || behind)) || e.parryT > 0;
    const dmg = Math.round(B.dmg * (crit ? 1.6 : 1) * (0.92 + Math.random() * 0.16));
    // (a las pequeñas las tumba: el virote pesa)
    const poise = B.poise * (e.T.height < 2.2 ? 1.6 : 0.6);
    const r = e.takeHit(dmg, poise, at.x - B.vel.x * 0.05, at.z - B.vel.z * 0.05, false, 0);
    if (r === 'none') return;
    const hy = at.y;
    if (r === 'blocked') {
      g.combat.impactFlash(at.x, hy, at.z, 1.0, 0xffd080);
      g.audio && g.audio.play('clang', e.pos);
      return;
    }
    if (!e.aware && e.alert) e.alert();
    g.combat.impactFlash(at.x, hy, at.z, 1.1, 0xff9070);
    _d.copy(B.vel).normalize();
    g.fx.blood.emit(at.x, hy, at.z, crit ? 26 : 16, { dir: { x: _d.x, z: _d.z }, speed: 4.5, color: e.T.blood });
    g.audio && g.audio.play('xbowHit', e.pos);
    g.hitstop = Math.max(g.hitstop, crit ? 0.1 : 0.05);
    if (r === 'kill') g.audio && g.audio.enemyVoice(e, 'death');
    else g.audio && g.audio.enemyVoice(e, 'hurt');
  }

  // Al morir, al cargar o al cambiar de sitio: fuera los que vuelan.
  clear() {
    for (const B of this.list) this.g.scene.remove(B.obj);
    this.list.length = 0;
  }
  // Y los clavados (al reiniciar el mundo).
  reset() {
    this.clear();
    for (const S of this.stuck) this.g.scene.remove(S.obj);
    this.stuck.length = 0;
  }
}
