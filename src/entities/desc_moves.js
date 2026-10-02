// El Descoyuntado: golpes, esquivas, guardia, burlas y caídas.
//
// Cada golpe tiene preparación (se encoge, se tuerce hacia atrás, cierra los
// dedos: se ve venir), un instante de tensión, el golpe (rápido, con el
// cuerpo entero detrás) y una recuperación con inercia (el brazo sigue de
// largo, la mano se queda clavada en el suelo un momento, el tronco vuelve
// despacio): esa recuperación es tu ventana.
//   claw     zarpazo de un brazo, de arriba abajo, donde estás
//   claw2    izquierda y derecha; el segundo, adonde sueles esquivar
//   sweep    barrido bajo de lado a lado (castiga rodar hacia los lados)
//   slam     se alza y descarga las dos manos: onda de choque
//   lunge    mordisco: se lanza con el cuello estirado (rápido: interrumpe)
//   pounce   salto en arco con las cuatro manos
//   charge   carga al galope; si se estrella, cae
//   spin     gira sobre sí mismo con los brazos abiertos (al final)
//   grab     te agarra y te muerde (no se para: se esquiva o se forcejea)
//   rip      arranca el pilar tras el que te escondes
//   smash    revienta de un golpe con las dos manos el sepulcro, el santo o
//            el tonel tras el que te escondes (o que le cierra el paso)
//   crack    se parte todas las articulaciones: onda que aturde
//   throw    te tira un hueso
//   drop     cae del techo encima de ti: si te alcanza, te derriba y se te
//            queda encima mordiendo (forcejea para quitártelo de encima)
//   riposte  contraataque seco tras parar tus golpes
// Esquivas: voltereta hacia atrás, salto atrás y salto de lado. Guardia: los
// antebrazos cruzados ante la cabeza (para golpes de frente). Burlas: golpea
// el suelo, se ríe, gira la cabeza entera. Caída: boca arriba, pataleando.
import * as THREE from 'three';
import { clamp, damp, lerp, angleDiff, approachAngle, DEG } from '../core/util.js';
import { moveBody } from '../world/collision.js';
import { seg, lin, rnd, easeOutExpo, easeInBack } from './desc_util.js';

const V3 = THREE.Vector3;
const _a = new V3(),
  _b = new V3(),
  _c = new V3(),
  _h = new V3();

// Ataques: alcance, arco (grados), daño y duración.
export const ATK = {
  claw: { dur: 1.2, range: 2.9, arc: 85, dmg: 22 },
  claw2: { dur: 1.9, range: 2.8, arc: 110, dmg: 18 },
  sweep: { dur: 1.35, range: 3.3, arc: 170, dmg: 20 },
  slam: { dur: 1.75, range: 2.6, dmg: 30, stagger: true, knock: 6 },
  lunge: { dur: 0.95, range: 3.6, arc: 55, dmg: 16 },
  pounce: { dur: 1.85, range: 2.2, arc: 110, dmg: 30, stagger: true, knock: 7 },
  charge: { dur: 3.2, range: 2.4, arc: 100, dmg: 26, stagger: true, knock: 8 },
  spin: { dur: 1.95, range: 2.9, arc: 360, dmg: 14 },
  grab: { dur: 1.35, range: 2.0, arc: 70, dmg: 0, unblockable: true },
  rip: { dur: 1.7, range: 3.2, arc: 120, dmg: 24, stagger: true, knock: 6 },
  smash: { dur: 1.45, range: 2.6, arc: 140, dmg: 24, stagger: true, knock: 6 },
  crack: { dur: 1.9, dmg: 18 },
  throw: { dur: 1.2, dmg: 11 },
  drop: { dur: 9, range: 2.6, arc: 360, dmg: 16, stagger: true, knock: 5, unblockable: true },
  riposte: { dur: 0.85, range: 2.9, arc: 110, dmg: 20 },
};

export const MOVES = {
  // -------------------------------------------------------------- ataques
  startAttack(name, o = {}) {
    const e = this.e,
      g = this.g;
    // (modo desarrollador: invisible para la IA, no ataca)
    if (g.dev && g.dev.invisible) {
      if (this.mode !== 'fight' && this.mode !== 'stalk') this.setMode(this.stage === 'rage' ? 'fight' : 'stalk');
      return;
    }
    if (this.plane === 'ceil' && name !== 'drop') {
      if (!this.air) this.jump('floor', 0.3, { arc: 0 });
      return;
    }
    this.ambush = this.stage !== 'rage' && (this.mode === 'hunt' || this.mode === 'perch' || this.mode === 'stalk' || this.mode === 'ambush');
    this.atk = { name, ...ATK[name], t0: g.time, ...o };
    this.atkT = 0;
    this.hitDone = [];
    this.evDone = {};
    this.setMode('attack');
    e.flare = 1;
    this.eyeT = 1.4;
    this.feinted = false;
    this.hpAt = g.player.hp;
    this.exert = Math.min(1, this.exert + 0.15);
    if (name !== 'drop' && name !== 'throw' && name !== 'riposte' && name !== 'lunge') g.audio && g.audio.enemyVoice(e, 'attack');
    if (name === 'claw' || name === 'sweep' || name === 'riposte') this.atk.side = o.side ?? this.sideTo();
    this.lastAttack = name;
    this.onAttackStart && this.onAttackStart(name);
  },
  sideTo() {
    const e = this.e,
      p = this.g.player.pos;
    const a = angleDiff(e.yaw, Math.atan2(p.x - e.pos.x, p.z - e.pos.z));
    return a > 0 ? 1 : -1;
  },
  endAttack() {
    if (!this.atk) return;
    const a = this.atk;
    const p = this.g.player;
    // aprende: lo que te alcanzó sube; lo que esquivaste o paraste, baja
    const hit = p.hp < this.hpAt - 1;
    if (this.score[a.name] !== undefined) this.score[a.name] = clamp(this.score[a.name] + (hit ? 1 : a.whiff ? -1 : -0.4), -3, 5);
    this.atk = null;
    this.T.pitch = 0;
    this.T.roll = 0;
    this.T.shx = this.T.shz = 0;
    this.T.yaw = 0;
    this.T.bend = 0;
    this.T.twist = 0;
    this.rear = 0;
    this.jawT = 0;
    this.neckExtT = 0;
    this.releaseAll();
    this.onAttackEnd && this.onAttackEnd(a, hit);
  },
  // Golpe con ventana: comprueba alcance y arco desde su posición.
  strike(i, a = this.atk) {
    if (this.hitDone[i]) return false;
    const g = this.g,
      e = this.e,
      p = g.player;
    const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    const inRange = d < a.range + p.body.radius;
    if (g.combat.enemyStrike(e, a, i)) {
      this.hitDone[i] = true;
      g.camRig.shake(0.3);
      return true;
    } else if (inRange && p.iframe) a.whiff = true;
    return false;
  },
  // Golpe con un punto concreto (la mano que barre, la boca que muerde).
  strikeAt(i, x, y, z, r, a = this.atk) {
    if (this.hitDone[i]) return false;
    const g = this.g,
      e = this.e,
      p = g.player;
    const d = Math.hypot(p.pos.x - x, p.pos.z - z);
    if (d > r + p.body.radius || y < p.pos.y - 0.3 || y > p.pos.y + 2.3) return false;
    if (p.iframe) {
      a.whiff = true;
      return false;
    }
    if (g.combat.apply(e, a, e.pos.x, e.pos.z)) {
      this.hitDone[i] = true;
      g.camRig.shake(0.3);
      return true;
    }
    return false;
  },
  attack(dt) {
    const a = this.atk;
    if (!a) return this.engage();
    this.atkT += dt * (a.speed ?? 1);
    if (this.inFight) this.engageT += dt;
    const t = this.atkT;
    const fn = this['atk_' + a.name];
    if (fn) fn.call(this, t, dt, a);
    if (this.atk === a && t >= a.dur) {
      this.endAttack();
      if (this.mode === 'attack') this.afterAttack(a);
    }
  },
  // Punto del suelo a su alcance donde vas a estar (con lo que aprendió de
  // cómo esquivas, si lo sabe).
  aimPoint(lead = 0.1, dodge = null) {
    const p = this.g.player;
    let x = p.pos.x + p.vx * lead,
      z = p.pos.z + p.vz * lead;
    if (dodge) {
      x += dodge.x;
      z += dodge.z;
    }
    return [x, z];
  },

  // zarpazo con un brazo: lo alza por encima del cuerpo (torcido hacia
  // atrás, los dedos cerrados) y lo descarga donde estás; la mano se queda
  // clavada en el suelo un instante
  atk_claw(t, dt, a, idx = 0) {
    const e = this.e,
      g = this.g,
      p = g.player;
    const s = a.side || 1;
    const L = this.L[s > 0 ? 0 : 1];
    const W = a.fast ? 0.62 : 1; // riposta: preparación corta
    const t1 = 0.46 * W,
      t2 = 0.52 * W,
      t3 = t2 + 0.11;
    // amago: si ruedas antes de tiempo, se detiene arriba y espera
    if (idx === 0 && t < t1 && p.state === 'roll' && !this.feinted && Math.random() < 0.45 + this.rollN * 0.05 + (this.skill || 0) * 0.3) {
      this.feinted = true;
      this.atkT = t1 * 0.7;
      a.hold = 0.35;
      g.audio && g.audio.play('snarl', this.center);
    }
    if (a.hold > 0) {
      a.hold -= dt;
      this.atkT = Math.min(this.atkT, t1);
    }
    if (t < t2) {
      this.faceTo(p.pos.x, p.pos.z, 6, dt);
      const u = easeInBack(lin(t, 0, t1)) * 0.8 + seg(t, 0, t1) * 0.2;
      this.T.pitch = -0.32 * u;
      this.T.roll = s * 0.16 * u;
      this.T.shx = -s * 0.16 * u;
      this.T.shz = -0.22 * u;
      this.T.yaw = s * 0.38 * u;
      this.T.twist = -s * 0.25 * u;
      this.T.h = 1 + 0.28 * u;
      // (la mano arriba y atrás, el codo doblado por encima: un gancho)
      this.localPointYaw(s * lerp(1.1, 1.25, u), lerp(0.25, 2.25, u), lerp(1.3, -0.15, u), _a);
      this.hold(L, _a.x, _a.y, _a.z, 1, 1);
      this.stop(dt, 8);
      this.jawT = 0.45 * u;
      this.creepPause = 0;
    } else if (t < t3) {
      // el golpe: al suelo, donde estás (dentro de su alcance)
      if (!a.aim) {
        const [px, pz] = this.aimPoint(0.08, idx > 0 ? a.dodge : null);
        const [lx, lz] = this.toLocal(px, pz);
        a.aim = [clamp(lx, -1.4, 1.4), clamp(lz, 0.8, 2.6)];
      }
      this.localPointYaw(a.aim[0], 0.05, a.aim[1], _b);
      const u = easeOutExpo(lin(t, t2, t3));
      this.localPointYaw(s * 1.25, 2.25, -0.15, _a);
      // (arco: pasa por delante y por arriba antes de caer)
      _a.lerp(_b, u);
      _a.y += Math.sin(Math.PI * u) * 0.6;
      this.hold(L, _a.x, Math.max(_a.y, this.groundAt(_a.x, _a.z) + 0.04), _a.z, 1, -0.35);
      this.T.pitch = lerp(-0.32, 0.32, u);
      this.T.h = lerp(1.28, 0.82, u);
      this.T.shx = s * 0.12;
      this.T.shz = lerp(-0.22, 0.38, u);
      this.T.yaw = lerp(s * 0.38, -s * 0.32, u);
      this.T.twist = lerp(-s * 0.25, s * 0.3, u);
      this.jawT = 1;
      const f = Math.sin(e.yaw),
        c = Math.cos(e.yaw);
      e.vx = f * 3.6;
      e.vz = c * 3.6;
      if (t > t2 + 0.05) this.strike(idx);
    } else {
      // la mano clavada, el polvo, y la vuelta despacio
      if (!this.evDone['imp' + idx]) {
        this.evDone['imp' + idx] = true;
        this.localPointYaw(a.aim[0], 0.1, a.aim[1], _c);
        g.fx.blood.emit(_c.x, _c.y, _c.z, 8, { color: [0.3, 0.28, 0.26], speed: 2, life: 0.6, up: 0.6 });
        g.audio && g.audio.play('slamSoft', _c, { k: 0.4 });
        g.breakables && g.breakables.smashAround(_c.x, _c.z, 0.7, e.pos.y, e.pos);
        this.hS.kick(-1.5);
      }
      this.stop(dt, 9);
      this.jawT = 0.2;
      if (t > t3 + 0.28) this.release(L);
      else this.hold(L, L.ov.x, L.ov.y, L.ov.z, 1, 0.7);
      const u = seg(t, t3 + 0.1, t3 + 0.6);
      this.T.pitch = lerp(0.32, 0, u);
      this.T.h = lerp(0.82, 1, u);
      this.T.shz = lerp(0.38, 0, u);
      this.T.yaw = lerp(-s * 0.32, 0, u);
      this.T.twist = lerp(s * 0.3, 0, u);
    }
  },
  atk_claw2(t, dt, a) {
    // izquierda y luego derecha (el segundo, adonde sueles escapar)
    if (t < 0.95) {
      a.side = 1;
      this.atk_claw(t, dt, a, 0);
    } else {
      if (!a.second) {
        a.second = true;
        this.release(this.L[0]);
        a.side = -1;
        a.aim = null;
        a.dodge = this.predictDodge ? this.predictDodge('claw2') : null;
      }
      this.atk_claw(t - 0.75, dt, a, 1);
    }
  },
  atk_riposte(t, dt, a) {
    a.fast = true;
    this.atk_claw(t, dt, a, 0);
  },

  // barrido: el brazo cruzado sobre el cuerpo, torcido hacia el otro lado,
  // y una pasada baja de lado a lado
  atk_sweep(t, dt, a) {
    const e = this.e,
      g = this.g,
      p = g.player;
    const s = a.side || 1;
    const L = this.L[s > 0 ? 0 : 1];
    const R = 2.35;
    if (t < 0.5) {
      this.faceTo(p.pos.x, p.pos.z, 7, dt);
      this.stop(dt, 8);
      const u = easeInBack(lin(t, 0, 0.5)) * 0.7 + seg(t, 0, 0.5) * 0.3;
      // la mano, atrás y al otro lado
      const ang = lerp(s * 0.6, -s * 2.0, u);
      this.localPointYaw(Math.sin(ang) * 1.5, lerp(0.3, 1.1, u), Math.cos(ang) * 1.5, _a);
      this.hold(L, _a.x, _a.y, _a.z, 1, 1);
      this.T.yaw = -s * 0.65 * u;
      this.T.twist = s * 0.4 * u;
      this.T.h = lerp(1, 0.8, u);
      this.T.roll = -s * 0.2 * u;
      this.T.shx = s * 0.2 * u;
      this.jawT = 0.5 * u;
    } else if (t < 0.74) {
      // la pasada: un arco delante, a media altura
      const u = easeOutExpo(lin(t, 0.5, 0.74));
      const ang = lerp(-s * 2.0, s * 1.9, u);
      this.localPointYaw(Math.sin(ang) * R, 0.75, Math.cos(ang) * R, _a);
      this.hold(L, _a.x, _a.y, _a.z, 1, -0.35);
      this.T.yaw = lerp(-s * 0.65, s * 0.55, u);
      this.T.twist = lerp(s * 0.4, -s * 0.35, u);
      this.T.roll = lerp(-s * 0.2, s * 0.25, u);
      this.T.shx = lerp(s * 0.2, -s * 0.2, u);
      this.jawT = 1;
      if (!this.evDone.whoosh) {
        this.evDone.whoosh = true;
        g.audio && g.audio.play('pounceWhoosh', this.center);
      }
      if (t > 0.54 && t < 0.72) {
        this.strikeAt(0, _a.x, _a.y, _a.z, 1.15);
        g.breakables && g.breakables.smashAround(_a.x, _a.z, 0.6, e.pos.y, e.pos);
      }
    } else {
      // sigue de largo y vuelve
      this.stop(dt, 9);
      const u = seg(t, 0.74, 1.3);
      const ang = s * lerp(1.9, 2.2, seg(t, 0.74, 0.9));
      this.localPointYaw(Math.sin(ang) * R * 0.9, 0.5, Math.cos(ang) * R * 0.9, _a);
      if (t < 0.95) this.hold(L, _a.x, _a.y, _a.z, 1, 0.3);
      else this.release(L);
      this.T.yaw = lerp(s * 0.55, 0, u);
      this.T.twist = lerp(-s * 0.35, 0, u);
      this.T.roll = lerp(s * 0.25, 0, u);
      this.T.shx = lerp(-s * 0.2, 0, u);
      this.T.h = lerp(0.8, 1, u);
      this.jawT = 0.2;
    }
  },

  // se alza sobre las patas de atrás con las dos manos en alto y las
  // descarga contra el suelo delante de él: onda de choque
  atk_slam(t, dt, a) {
    const e = this.e,
      g = this.g,
      p = g.player;
    const lf = this.L[0],
      rf = this.L[1];
    if (t < 0.8) {
      if (t < 0.55) this.faceTo(p.pos.x, p.pos.z, 5, dt);
      this.stop(dt, 8);
      const u = easeInBack(lin(t, 0, 0.7)) * 0.6 + seg(t, 0, 0.7) * 0.4;
      this.rear = 0.85 * u;
      this.T.h = lerp(1, 1.65, u);
      this.T.bend = -0.3 * u;
      for (const L of [lf, rf]) {
        this.localPointYaw(L.side * lerp(1.1, 0.55, u), lerp(0.2, 3.3, u), lerp(1.3, 0.2, u), _a);
        this.hold(L, _a.x, _a.y, _a.z, 1, 1);
      }
      this.jawT = u;
      this.shake = Math.max(this.shake, u * 0.6);
      if (!this.evDone.scream && t > 0.2) {
        this.evDone.scream = true;
        g.audio && g.audio.play('snarl', this.center);
      }
    } else if (t < 0.93) {
      const u = easeOutExpo(lin(t, 0.8, 0.92));
      for (const L of [lf, rf]) {
        this.localPointYaw(L.side * 0.55, 3.3, 0.2, _a);
        this.localPointYaw(L.side * 0.38, 0.03, 2.15, _b);
        _a.lerp(_b, u);
        this.hold(L, _a.x, _a.y, _a.z, 1, -0.3);
      }
      this.rear = lerp(0.85, 0, u);
      this.T.h = lerp(1.65, 0.65, u);
      this.T.pitch = lerp(0, 0.45, u);
      this.T.bend = lerp(-0.3, 0.3, u);
      this.T.shz = 0.35 * u;
      if (t > 0.88 && !this.evDone.slam) {
        this.evDone.slam = true;
        this.localPointYaw(0, 0, 2.15, _c);
        g.combat.shockwave(_c.x, this.groundAt(_c.x, _c.z), _c.z, 2.7, a.dmg, e, a.knock);
        g.breakables && g.breakables.smashAround(_c.x, _c.z, 2.0, e.pos.y, _c);
        g.fx.blood.emit(_c.x, _c.y + 0.1, _c.z, 30, { color: [0.3, 0.28, 0.26], speed: 6, life: 0.9, up: 2.2 });
        g.camRig.shake(0.55);
        this.hS.kick(-3);
      }
    } else {
      // las manos se quedan en el suelo; se levanta despacio (tu ventana)
      this.stop(dt, 10);
      const u = seg(t, 1.15, 1.7);
      this.T.h = lerp(0.65, 1, u);
      this.T.pitch = lerp(0.45, 0, u);
      this.T.bend = lerp(0.3, 0, u);
      this.T.shz = lerp(0.35, 0, u);
      this.jawT = 0.3;
      if (t > 1.3) this.releaseAll();
    }
  },

  // mordisco: se encoge, sisea y se dispara hacia delante con el cuello
  // estirado y la boca abierta
  atk_lunge(t, dt, a) {
    const e = this.e,
      g = this.g,
      p = g.player;
    const lf = this.L[0],
      rf = this.L[1];
    if (t < 0.24) {
      this.faceTo(p.pos.x, p.pos.z, 12, dt);
      this.stop(dt, 12);
      const u = seg(t, 0, 0.22);
      this.T.shz = -0.4 * u;
      this.T.h = lerp(1, 0.72, u);
      this.T.bend = 0.25 * u;
      this.jawT = 0.6 * u;
      this.neckExtT = 0;
      if (!this.evDone.hiss) {
        this.evDone.hiss = true;
        g.audio && g.audio.play('snarl', this.center);
      }
    } else if (t < 0.46) {
      if (!a.dir) {
        const [px, pz] = this.aimPoint(0.15, a.dodge);
        const dx = px - e.pos.x,
          dz = pz - e.pos.z;
        const d = Math.hypot(dx, dz) || 1;
        a.dir = [dx / d, dz / d];
        a.dist = clamp(d - 1.2, 0.8, 3.2);
        e.yaw = Math.atan2(dx, dz);
      }
      const spd = a.dist / 0.2;
      if (t < 0.44) {
        moveBody(g.world.col, e.body, a.dir[0] * spd * dt, a.dir[1] * spd * dt, dt);
        e.vx = e.vz = 0;
      }
      const u = easeOutExpo(lin(t, 0.24, 0.4));
      this.neckExtT = 1;
      this.jawT = 1;
      this.T.shz = lerp(-0.4, 0.55, u);
      this.T.h = lerp(0.72, 0.9, u);
      this.T.pitch = 0.25 * u;
      this.T.bend = lerp(0.25, -0.2, u);
      for (const L of [lf, rf]) {
        this.localPointYaw(L.side * 0.7, 0.03, 2.1, _a);
        this.hold(L, _a.x, _a.y, _a.z, u, 0.8);
      }
      e.rig.worldPos('head', _h);
      if (t > 0.3) this.strikeAt(0, _h.x, _h.y, _h.z, 0.95);
    } else {
      if (!this.evDone.snap) {
        this.evDone.snap = true;
        g.audio && g.audio.play(this.hitDone[0] ? 'bite' : 'boneCrack', this.center, { k: 0.8 });
      }
      this.stop(dt, 10);
      this.neckExtT = 0;
      this.jawT = 0;
      const u = seg(t, 0.5, 0.95);
      this.T.shz = lerp(0.55, 0, u);
      this.T.h = lerp(0.9, 1, u);
      this.T.pitch = lerp(0.25, 0, u);
      this.T.bend = lerp(-0.2, 0, u);
      if (t > 0.6) this.releaseAll();
    }
  },

  // salto: se agazapa (las patas de atrás recogidas), se lanza en arco hasta
  // donde vas a estar y cae con las cuatro manos; si se estrella contra un
  // pilar o un muro, queda aturdido
  atk_pounce(t, dt, a) {
    const e = this.e,
      g = this.g,
      p = g.player;
    if (t < 0.55) {
      this.faceTo(p.pos.x + p.vx * 0.4, p.pos.z + p.vz * 0.4, 7, dt);
      this.stop(dt, 10);
      const u = seg(t, 0, 0.5);
      this.T.h = lerp(0.9, 0.48, u);
      this.T.pitch = 0.18 * u;
      this.T.bend = 0.35 * u;
      this.jawT = 0.5 * u;
      this.shake = Math.max(this.shake, 0.3 * u);
    } else if (!a.launched) {
      a.launched = true;
      const dodge = this.predictDodge ? this.predictDodge('pounce') : null;
      const tx = p.pos.x + p.vx * 0.35 + (dodge ? dodge.x * 0.7 : 0),
        tz = p.pos.z + p.vz * 0.35 + (dodge ? dodge.z * 0.7 : 0);
      let dx = tx - e.pos.x,
        dz = tz - e.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      const L = clamp(d + 0.6, 2, 7.5);
      a.vx = (dx / d) * (L / 0.45);
      a.vz = (dz / d) * (L / 0.45);
      e.yaw = Math.atan2(dx, dz);
      a.fx = dx / d;
      a.fz = dz / d;
      a.flyT = 0;
      this.jawT = 1;
      g.audio && g.audio.play('pounceWhoosh', e.pos);
    }
    if (a.launched && !a.landed) {
      a.flyT += dt;
      const u = clamp(a.flyT / 0.45, 0, 1);
      // por el aire (con choque contra lo que tenga delante)
      const bx = e.pos.x,
        bz = e.pos.z;
      moveBody(g.world.col, e.body, a.vx * dt, a.vz * dt, dt);
      e.vx = e.vz = 0;
      this.T.h = lerp(0.5, 1.1, Math.sin(Math.PI * u)) + 0.9 * Math.sin(Math.PI * u);
      this.T.pitch = lerp(-0.4, 0.3, u);
      this.T.bend = lerp(-0.4, 0.2, u);
      for (const L of this.L) {
        this.localPointYaw(L.side * (L.front ? 0.8 : 0.7), L.front ? 1.0 : 1.3, L.front ? 2.2 : -1.9, _a);
        this.hold(L, _a.x, _a.y, _a.z, 1, L.front ? -0.35 : null);
      }
      if (a.flyT > 0.18) this.strike(0);
      const moved = Math.hypot(e.pos.x - bx, e.pos.z - bz);
      const want = Math.hypot(a.vx, a.vz) * dt;
      const br = g.breakables && g.breakables.contact(e.pos.x, e.pos.z, e.body.radius + 0.35, a.fx, a.fz, e.pos.y);
      if (br && br.light) g.breakables.shatter(br, e.pos);
      else if (br) return this.crash(g.breakables.crashInto(br, e.pos));
      else if (moved < want * 0.35 && a.flyT > 0.08) return this.crash(false);
      if (u >= 1) {
        a.landed = true;
        this.releaseAll();
        for (const L of this.L) L.step = -1;
        this.plantAll();
        this.hS.kick(-3);
        g.audio && g.audio.play('slamSoft', e.pos);
        g.camRig.shake(0.25);
        g.breakables && g.breakables.smashAround(e.pos.x, e.pos.z, 1.2, e.pos.y, e.pos);
      }
    }
    if (a.landed) {
      this.stop(dt, 10);
      this.T.h = lerp(0.6, 0.95, seg(t, a.t1 || (a.t1 = t), (a.t1 || t) + 0.6));
      this.T.pitch = 0;
      this.T.bend = 0;
      this.jawT = 0.3;
    }
  },

  // carga: araña el suelo, agacha la cabeza y se lanza al galope hacia ti
  // (corrige poco el rumbo: apártate a tiempo); si se estrella, cae
  atk_charge(t, dt, a) {
    const e = this.e,
      g = this.g,
      p = g.player;
    if (t < 0.55) {
      this.faceTo(p.pos.x, p.pos.z, 8, dt);
      this.stop(dt, 10);
      const u = seg(t, 0, 0.5);
      this.T.h = lerp(1, 0.75, u);
      this.T.pitch = 0.22 * u;
      this.T.bend = 0.3 * u;
      this.jawT = u;
      this.shake = Math.max(this.shake, 0.5 * u);
      // escarba con una mano
      const L = this.L[t % 0.3 < 0.15 ? 0 : 1];
      this.localPointYaw(L.side * 0.9, 0.05 + Math.max(0, Math.sin(t * 20)) * 0.3, 1.5, _a);
      this.hold(L, _a.x, _a.y, _a.z, 0.6);
      if (!this.evDone.roar) {
        this.evDone.roar = true;
        g.audio && g.audio.enemyVoice(e, 'alert');
      }
      return;
    }
    if (!a.run) {
      a.run = true;
      this.releaseAll();
      a.runT = 0;
    }
    if (a.done) {
      this.stop(dt, 6);
      return;
    }
    a.runT += dt;
    const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    this.faceTo(p.pos.x, p.pos.z, 1.8, dt);
    const f = Math.sin(e.yaw),
      c = Math.cos(e.yaw);
    const spd = 8.8;
    e.vx = damp(e.vx, f * spd, 9, dt);
    e.vz = damp(e.vz, c * spd, 9, dt);
    this.T.h = 0.85;
    this.T.pitch = 0.15;
    this.jawT = 0.8;
    // choque contra lo que tenga delante
    const br = g.breakables && g.breakables.contact(e.pos.x, e.pos.z, e.body.radius + 0.4, f, c, e.pos.y);
    if (br && br.light) g.breakables.shatter(br, e.pos);
    else if (br) return this.crash(g.breakables.crashInto(br, e.pos));
    else if (a.runT > 0.25 && this.lastMoved !== undefined && this.lastMoved < spd * dt * 0.3) return this.crash(false);
    // te arrolla
    if (d < 1.9) this.strike(0);
    // llega: remata con un zarpazo o con las dos manos
    if (d < 2.8 || a.runT > 1.9) {
      a.done = true;
      this.endAttack();
      return this.startAttack(Math.random() < 0.5 ? 'slam' : 'claw', { chained: true });
    }
  },

  // gira sobre sí mismo con los brazos abiertos, avanzando hacia ti
  atk_spin(t, dt, a) {
    const e = this.e,
      g = this.g,
      p = g.player;
    const lf = this.L[0],
      rf = this.L[1];
    if (t < 0.4) {
      this.faceTo(p.pos.x, p.pos.z, 8, dt);
      this.stop(dt, 10);
      const u = seg(t, 0, 0.38);
      this.T.h = lerp(1, 0.8, u);
      this.T.yaw = 0.5 * u;
      for (const L of [lf, rf]) {
        this.localPointYaw(L.side * lerp(1.1, 1.6, u), 0.9 * u, lerp(1.3, 0.6, u), _a);
        this.hold(L, _a.x, _a.y, _a.z, u, 0.2);
      }
      this.jawT = u;
    } else if (t < 1.6) {
      // (la guiñada da vueltas: las manos, que se colocan relativas a ella, barren)
      e.yaw += dt * 12;
      const dx = p.pos.x - e.pos.x,
        dz = p.pos.z - e.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      e.vx = damp(e.vx, (dx / d) * 3.4, 6, dt);
      e.vz = damp(e.vz, (dz / d) * 3.4, 6, dt);
      this.T.yaw = 0;
      this.T.h = 0.85;
      this.T.roll = Math.sin(t * 20) * 0.12;
      for (const L of [lf, rf]) {
        this.localPointYaw(L.side * 1.75, 0.95 + Math.sin(t * 17 + L.side) * 0.15, 0.3, _a);
        this.hold(L, _a.x, _a.y, _a.z, 1, -0.2);
      }
      this.jawT = 1;
      const k = Math.floor((t - 0.4) / 0.3);
      if (!this.evDone['w' + k]) {
        this.evDone['w' + k] = true;
        g.audio && g.audio.play('pounceWhoosh', this.center, { k: 0.7 });
      }
      this.strike(k);
      g.breakables && g.breakables.smashAround(e.pos.x, e.pos.z, 1.9, e.pos.y, e.pos);
    } else {
      // mareado un instante
      this.stop(dt, 8);
      this.releaseAll();
      this.T.roll = Math.sin(t * 6) * 0.25 * (1 - seg(t, 1.6, 1.95));
      this.T.h = lerp(0.85, 1, seg(t, 1.6, 1.95));
      this.tiltT = Math.sin(t * 5) * 0.8;
    }
  },

  // Contra un pilar, un estante o un muro: si revienta algo, cae al suelo
  // pataleando; si no, se queda aturdido.
  crash(broke) {
    const e = this.e,
      g = this.g;
    this.endAttack();
    this.plantAll();
    g.camRig.shake(broke ? 0.6 : 0.45);
    g.audio && g.audio.play('slam', e.pos);
    g.audio && g.audio.enemyVoice(e, 'hurt');
    e.flash = 0.1;
    e.poise = Math.min(e.poise, e.T.poise * 0.4);
    this.lastEngaged = g.time;
    this.onCrash && this.onCrash(broke);
    if (broke) this.startDown(2.1);
    else {
      this.setMode('stun');
      this.stunDur = 1.3;
    }
  },

  // agarrón: no se para con el escudo (sí se esquiva); si te atrapa, te
  // muerde y te tira; forcejea (pulsa) para soltarte antes
  atk_grab(t, dt, a) {
    const e = this.e,
      g = this.g,
      p = g.player;
    const lf = this.L[0],
      rf = this.L[1];
    if (!this.grabbed) {
      if (t < 0.4) {
        this.faceTo(p.pos.x, p.pos.z, 8, dt);
        this.stop(dt, 8);
        const u = seg(t, 0, 0.4);
        this.T.h = 1 + 0.3 * u;
        this.T.pitch = -0.35 * u;
        this.T.shz = -0.2 * u;
        for (const L of [lf, rf]) {
          this.localPointYaw(L.side * 1.25, 2.2, 1.1, _a);
          this.hold(L, _a.x, _a.y, _a.z, u, -0.4);
        }
        this.jawT = u * 0.7;
      } else if (t < 0.62) {
        const f = Math.sin(e.yaw),
          c = Math.cos(e.yaw);
        e.vx = f * 5.5;
        e.vz = c * 5.5;
        this.T.pitch = 0.2;
        this.T.shz = 0.4;
        for (const L of [lf, rf]) {
          this.localPointYaw(L.side * 0.45, 1.3, 2.0, _a);
          this.hold(L, _a.x, _a.y, _a.z, 1, 0.5);
        }
        const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
        const ang = Math.abs(angleDiff(e.yaw, Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z)));
        if (d < a.range + 0.3 && ang < 50 * DEG && !p.iframe && !p.dead && p.state !== 'grabbed' && Math.abs(p.pos.y - e.pos.y) < 1.2) {
          this.grabbed = true;
          this.grabT = 0;
          this.bites = 0;
          p.startGrabbed && p.startGrabbed(e);
          g.audio && g.audio.play('grab', p.pos);
          g.camRig.shake(0.5);
          a.dur = 99;
        } else if (d < a.range + 0.5 && p.iframe) a.whiff = true;
      } else {
        this.stop(dt, 8);
        this.T.shz = lerp(0.4, 0, seg(t, 0.62, 1));
        if (t > 0.8) this.releaseAll();
        this.T.pitch = lerp(0.2, 0, seg(t, 0.7, 1.3));
      }
      return;
    }
    // atrapado
    this.grabT += dt;
    this.stop(dt, 20);
    const gt = this.grabT;
    // lo sostiene delante, a la altura de la cabeza, y lo sacude
    this.localPointYaw(Math.sin(gt * 9) * 0.08, 0, 1.6, _a);
    p.pos.x = damp(p.pos.x, _a.x, 12, dt);
    p.pos.z = damp(p.pos.z, _a.z, 12, dt);
    p.yaw = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
    for (const L of [lf, rf]) {
      this.localPointYaw(L.side * 0.32, 1.35, 1.55, _b);
      this.hold(L, _b.x, _b.y, _b.z, 1, 1);
    }
    this.T.h = 1.3;
    this.T.pitch = -0.25;
    this.jawT = 0.4 + Math.max(0, Math.sin(gt * 7)) * 0.6;
    this.neckExtT = 0.5 + Math.max(0, Math.sin(gt * 7)) * 0.4;
    this.lookP.set(p.pos.x, p.pos.y + 1.4, p.pos.z);
    this.lookW = 1;
    // mordiscos
    const biteAt = [0.55, 1.15, 1.75];
    if (this.bites < 3 && gt > biteAt[this.bites]) {
      this.bites++;
      if (p.receiveBite) p.receiveBite(9, e);
      g.fx.blood.emit(p.pos.x, p.pos.y + 1.4, p.pos.z, 26, { speed: 4 });
      g.audio && g.audio.play('bite', p.pos);
      g.camRig.shake(0.35);
      g.hurtFlash = 1;
      g.input.rumble(1, 0.8, 180);
    }
    const escaped = (p.mash || 0) >= 6;
    if (escaped || gt > 2.25 || p.dead) {
      this.grabbed = false;
      const f = Math.sin(e.yaw),
        c = Math.cos(e.yaw);
      if (!p.dead) p.releaseGrab && p.releaseGrab(escaped ? 3.5 : 7.5, f, c, escaped ? 0 : 10);
      g.audio && g.audio.play(escaped ? 'hit' : 'slamSoft', p.pos);
      this.endAttack();
      this.neckExtT = 0;
      if (escaped) {
        // se ha soltado: el Descoyuntado cae de espaldas
        this.onEscaped && this.onEscaped();
        this.startDown(1.6);
      } else {
        this.cool = 1;
        this.engage();
      }
    }
  },

  // arranca el pilar tras el que te escudas
  atk_rip(t, dt, a) {
    const e = this.e,
      g = this.g,
      p = g.player;
    const P = this.ripTarget;
    if (!P || P.broken) {
      this.endAttack();
      return this.engage();
    }
    const lf = this.L[0],
      rf = this.L[1];
    const dx = P.x - e.pos.x,
      dz = P.z - e.pos.z;
    const d = Math.hypot(dx, dz);
    if (!a.at) {
      // se pega al pilar
      this.faceTo(P.x, P.z, 8, dt);
      this.moveTo(P.x - (dx / d) * 1.6, P.z - (dz / d) * 1.6, 4.5, dt, false);
      this.atkT = 0;
      if (d < 2.1 || this.mT > 2.5) {
        a.at = true;
        g.audio && g.audio.enemyVoice(e, 'attack');
      }
      return;
    }
    this.faceTo(P.x, P.z, 6, dt);
    this.stop(dt, 10);
    const rx = -dz / d,
      rz = dx / d; // a lo ancho del pilar
    const u = seg(t, 0, 0.55);
    this.rear = 0.6 * u;
    this.T.h = 1 + 0.55 * u;
    for (const L of [lf, rf]) {
      const s = L.side;
      const ox = P.x - (dx / d) * 0.55 - rx * s * 0.62,
        oz = P.z - (dz / d) * 0.55 - rz * s * 0.62;
      this.hold(L, ox, e.pos.y + lerp(1.2, 2.3, u), oz, 1, 1);
    }
    this.jawT = 0.4 + u * 0.6;
    if (t > 0.55 && t < 0.95) {
      // tira hacia atrás: el pilar cruje
      const k = seg(t, 0.55, 0.95);
      this.T.shz = -0.45 * k;
      this.T.bend = -0.3 * k;
      this.rear = 0.6 + 0.3 * k;
      this.shake = 0.8;
      if (!this.evDone.creak) {
        this.evDone.creak = true;
        g.audio && g.audio.play('stoneCreak', { x: P.x, y: P.y + 2, z: P.z });
        g.camRig.shake(0.2);
      }
    }
    if (t >= 0.95 && !this.evDone.rip) {
      this.evDone.rip = true;
      g.breakables.shatter(P, e.pos);
      this.ripCount++;
      this.shieldT = 0;
      // los sillares te caen encima si estabas detrás
      const pd = Math.hypot(p.pos.x - P.x, p.pos.z - P.z);
      if (pd < a.range && !p.dead) g.combat.apply(e, { dmg: a.dmg, stagger: true, knock: a.knock, chip: 0.3 }, P.x, P.z);
      g.audio && g.audio.enemyVoice(e, 'alert');
      this.releaseAll();
    }
    if (t > 0.95) {
      this.rear = lerp(0.9, 0, seg(t, 1.0, 1.6));
      this.T.shz = 0;
      this.T.bend = 0;
      this.T.h = lerp(1.55, 1, seg(t, 1, 1.6));
    }
  },

  // revienta lo que tengas delante (un sepulcro, un santo, un tonel): se
  // pega a ello, se alza con las dos manos en alto y las descarga encima
  atk_smash(t, dt, a) {
    const e = this.e,
      g = this.g,
      p = g.player;
    const P = this.smashTarget;
    if (!P || P.broken) {
      this.endAttack();
      return this.engage();
    }
    const B = g.breakables;
    const lf = this.L[0],
      rf = this.L[1];
    if (!a.at) {
      this.faceTo(P.x, P.z, 8, dt);
      const dx = P.x - e.pos.x,
        dz = P.z - e.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      const ed = B.edgeDist(P, e.pos.x, e.pos.z);
      this.moveTo(e.pos.x + (dx / d) * (ed - 1.1), e.pos.z + (dz / d) * (ed - 1.1), 4.5, dt, false);
      this.atkT = 0;
      if (ed < 1.6 || this.mT > 2.2) {
        a.at = true;
        g.audio && g.audio.enemyVoice(e, 'attack');
      }
      return;
    }
    this.faceTo(P.x, P.z, 6, dt);
    this.stop(dt, 10);
    const top = P.y + P.h + 0.1;
    if (t < 0.55) {
      const u = easeInBack(lin(t, 0, 0.5)) * 0.6 + seg(t, 0, 0.5) * 0.4;
      this.rear = 0.75 * u;
      this.T.h = lerp(1, 1.5, u);
      this.T.bend = -0.25 * u;
      for (const L of [lf, rf]) {
        this.localPointYaw(L.side * lerp(1.1, 0.5, u), lerp(0.3, 3.1, u), lerp(1.3, 0.3, u), _a);
        this.hold(L, _a.x, _a.y, _a.z, 1, 1);
      }
      this.jawT = u;
      this.shake = Math.max(this.shake, u * 0.7);
    } else if (t < 0.67) {
      const u = easeOutExpo(lin(t, 0.55, 0.65));
      for (const L of [lf, rf]) {
        this.localPointYaw(L.side * 0.5, 3.1, 0.3, _a);
        _b.set(P.x + L.side * 0.25 * Math.cos(e.yaw), top, P.z - L.side * 0.25 * Math.sin(e.yaw));
        _a.lerp(_b, u);
        this.hold(L, _a.x, _a.y, _a.z, 1, -0.3);
      }
      this.rear = lerp(0.75, 0, u);
      this.T.h = lerp(1.5, 0.75, u);
      this.T.pitch = 0.4 * u;
      this.T.shz = 0.35 * u;
      if (t > 0.63 && !this.evDone.smash) {
        this.evDone.smash = true;
        B.shatter(P, e.pos);
        B.smashAround(P.x, P.z, 1.2, e.pos.y, e.pos);
        g.camRig.shake(0.55);
        this.hS.kick(-3);
        // los cascotes (o el tonel reventado) te alcanzan si estabas detrás
        if (B.edgeDist(P, p.pos.x, p.pos.z) < 1.7 && !p.dead) g.combat.apply(e, { dmg: a.dmg, stagger: true, knock: a.knock, chip: 0.3 }, P.x, P.z);
      }
    } else {
      const u = seg(t, 0.8, 1.4);
      this.T.h = lerp(0.75, 1, u);
      this.T.pitch = lerp(0.4, 0, u);
      this.T.shz = lerp(0.35, 0, u);
      this.T.bend = 0;
      this.jawT = 0.3;
      if (t > 0.95) this.releaseAll();
    }
  },

  // se parte todas las articulaciones a la vez: una onda que aturde
  atk_crack(t, dt, a) {
    const e = this.e,
      g = this.g;
    this.stop(dt, 10);
    this.lastCrack = g.time;
    if (t < 0.85) {
      const u = seg(t, 0, 0.8);
      this.T.h = lerp(0.9, 1.4, u);
      this.T.pitch = -0.2 * u;
      this.shake = Math.max(this.shake, u);
      for (const L of this.L) {
        this.planePoint(L.home.x * lerp(1, 0.55, u), L.home.z * lerp(1, 0.6, u), _a);
        this.hold(L, _a.x, _a.y + 0.2 * u, _a.z, u, 1);
      }
      this.jawT = u;
    } else if (!this.evDone.crack) {
      this.evDone.crack = true;
      g.combat.toll(e, 4.6, a.dmg, 'crack');
      g.breakables && g.breakables.smashAround(e.pos.x, e.pos.z, 2.6, e.pos.y, e.pos);
      for (const L of this.L) {
        this.planePoint(L.home.x * 2.05, L.home.z * 1.75, _a);
        this.hold(L, _a.x, _a.y, _a.z, 1, -0.4);
      }
      this.T.h = 0.45;
      this.hS.kick(-4);
      this.T.pitch = 0;
    } else if (t > 1.4) this.releaseAll();
    if (t > 1.4) this.T.h = lerp(0.45, 1, seg(t, 1.4, 1.9));
  },

  // tira un hueso (o una calavera) desde la oscuridad
  atk_throw(t, dt, a) {
    const g = this.g,
      p = g.player;
    const L = this.L[1];
    this.stop(dt, 10);
    this.faceTo(p.pos.x, p.pos.z, 6, dt);
    if (t < 0.55) {
      const u = easeInBack(lin(t, 0, 0.5)) * 0.6 + seg(t, 0, 0.5) * 0.4;
      this.localPointYaw(-0.9, lerp(0.2, 2.4, u), lerp(1.2, -0.5, u), _a);
      this.hold(L, _a.x, _a.y, _a.z, 1, 1);
      this.T.pitch = -0.2 * u;
      this.T.yaw = -0.35 * u;
    } else if (!this.evDone.throw) {
      this.evDone.throw = true;
      this.localPointYaw(-0.6, 2.3, 0.8, _a);
      this.throwBone(_a, p);
      this.localPointYaw(-0.6, 0.4, 2.3, _b);
      this.hold(L, _b.x, _b.y, _b.z, 1, -0.3);
      this.T.yaw = 0.3;
    } else if (t > 0.8) this.release(L);
    if (t > 0.6) {
      this.T.pitch = lerp(0.15, 0, seg(t, 0.6, 1.1));
      this.T.yaw = lerp(0.3, 0, seg(t, 0.6, 1.1));
    }
  },

  // Cae del techo encima de ti: un chillido arriba, cae el polvo (y su
  // sombra se ve en el suelo) y se deja caer adonde vas a estar. Si te
  // alcanza, te derriba y se te queda encima, mordiendo (forcejea para
  // quitártelo de encima); si ruedas a tiempo, se estrella contra el suelo
  // y tarda en rehacerse.
  atk_drop(t, dt, a) {
    const e = this.e,
      g = this.g,
      p = g.player;
    if (this.pinning) return this.pin(dt, a);
    const W = a.fast ? 0.24 : a.ambush ? 0.3 : 0.34;
    if (!a.started) {
      a.started = true;
      g.audio && g.audio.play('dropCry', { x: this.center.x, y: this.center.y, z: this.center.z });
      e.flare = 1;
    }
    if (t < W) {
      // un chillido, arriba; el polvo cae
      this.stop(dt, 10);
      this.faceTo(p.pos.x, p.pos.z, 8, dt);
      this.setShade(damp(this._shade ?? 1, 1, 14, dt));
      this.eyeT = 1.5;
      if (Math.random() < dt * 24) g.fx.blood.emit(this.center.x, this.center.y + 0.5, this.center.z, 2, { color: [0.3, 0.28, 0.26], speed: 0.4, life: 1.2, up: -0.5, gravity: 4 });
      return;
    }
    if (!a.fell) {
      a.fell = true;
      this.setShade(1);
      // adonde vas a estar al caer (sin irse más de dos metros y medio, ni
      // caer dentro de un muro o a otra altura)
      let tx = p.pos.x + p.vx * 0.3,
        tz = p.pos.z + p.vz * 0.3;
      const dx = tx - e.pos.x,
        dz = tz - e.pos.z;
      const dd = Math.hypot(dx, dz);
      if (dd > 2.4) {
        tx = e.pos.x + (dx / dd) * 2.4;
        tz = e.pos.z + (dz / dd) * 2.4;
      }
      if (!g.navCellar.walkable(tx, tz) || !this.sameFloorLine(e.pos.x, e.pos.z, tx, tz)) {
        tx = e.pos.x;
        tz = e.pos.z;
      }
      if (dd > 0.2) e.yaw = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
      this.jump('floor', 0.3, { arc: 0, x: tx, z: tz });
      this.onLand = () => {
        this.onLand = null;
        const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
        const can = !p.dead && !p.iframe && p.state !== 'grabbed' && p.state !== 'pinned' && p.state !== 'getup' && Math.abs(p.pos.y - e.pos.y) < 1.2;
        g.camRig.shake(0.55);
        this.hS.kick(-3.5);
        g.breakables && g.breakables.smashAround(e.pos.x, e.pos.z, 1.6, e.pos.y, e.pos);
        if (can && d < 1.3) return this.startPin(a);
        // ha fallado: se estrella contra el suelo (onda pequeña)
        a.landT = this.atkT;
        a.dur = this.atkT + 1.15;
        g.combat.shockwave(e.pos.x, e.pos.y, e.pos.z, 2.1, a.dmg, e, a.knock);
        if (d < 2.8 && p.iframe) a.whiff = true;
      };
      return;
    }
    if (this.air) return;
    // de bruces contra el suelo: tarda en rehacerse (tu ventana)
    this.stop(dt, 10);
    this.lookAtPlayer(1);
    const lt = t - (a.landT ?? t);
    this.T.h = lerp(0.5, 1, seg(lt, 0.35, 1.0));
    this.T.pitch = lerp(0.3, 0, seg(lt, 0.3, 0.9));
    this.jawT = 0.5;
    this.shake = Math.max(this.shake, 0.4 * (1 - seg(lt, 0, 0.8)));
  },

  // Te ha caído encima: te derriba y se te queda encima.
  startPin(a) {
    const e = this.e,
      g = this.g,
      p = g.player;
    this.pinning = true;
    this.pinT = 0;
    this.bites = 0;
    a.dur = 99;
    a.pinned = true;
    this.pinMash = 0;
    p.startPinned && p.startPinned(e);
    if (g.lockTarget === e) g.lockTarget = null;
    g.audio && g.audio.play('grab', p.pos);
    g.audio && g.audio.play('bodyFall', p.pos);
    g.camRig.shake(0.75);
    g.input.rumble(1, 0.9, 280);
    g.hurtFlash = Math.max(g.hurtFlash, 0.7);
    // el golpe de caerte encima
    p.receiveBite && p.receiveBite(10, e);
    this.onPinStart && this.onPinStart();
  },
  // A horcajadas sobre ti, de cara a tu cara: las manos junto a tus hombros,
  // los pies más allá de tus piernas y la cabeza colgando hasta tu
  // garganta. Te muerde tres veces; cada vez que forcejeas se le nota (se
  // tambalea); si forcejeas bastante, de una patada te lo quitas de encima.
  pin(dt, a) {
    const e = this.e,
      g = this.g,
      p = g.player;
    this.pinT += dt;
    const t = this.pinT;
    this.stop(dt, 30);
    e.vx = e.vz = 0;
    if (p.dead) return this.endPin(false, 0);
    // (tú, tumbado boca arriba: la cabeza hacia atrás, los pies hacia delante)
    const fx = Math.sin(p.yaw),
      fz = Math.cos(p.yaw);
    e.pos.x = damp(e.pos.x, p.pos.x + fx * 0.5, 14, dt);
    e.pos.z = damp(e.pos.z, p.pos.z + fz * 0.5, 14, dt);
    e.yaw = approachAngle(e.yaw, p.yaw + Math.PI, 14 * dt);
    for (const L of this.L) {
      this.localPointYaw(L.side * (L.front ? 0.62 : 0.74), 0, L.front ? 1.05 : -0.95, _a);
      _a.y = this.groundAt(_a.x, _a.z) + 0.03;
      this.hold(L, _a.x, _a.y, _a.z, 1, L.front ? 0.95 : null);
    }
    // mordiscos: se alza un poco, estira el cuello y lo hunde en ti
    const biteAt = [0.6, 1.25, 1.9];
    const next = biteAt[this.bites] ?? 99;
    const wind = clamp(1 - Math.abs(t - next + 0.12) / 0.22, 0, 1);
    this.T.h = 0.62 + 0.12 * wind + Math.sin(t * 9) * 0.02;
    this.T.pitch = 0.32 - 0.18 * wind;
    this.neckExtT = 0.45 + 0.55 * wind;
    this.jawT = 0.35 + 0.65 * Math.max(wind, Math.max(0, Math.sin(t * 13)) * 0.5);
    this.shake = Math.max(this.shake, 0.5);
    this.lookP.set(p.pos.x - fx * 0.5, p.pos.y + 0.25, p.pos.z - fz * 0.5);
    this.lookW = 1;
    if (this.bites < 3 && t > next) {
      this.bites++;
      if (p.receiveBite) p.receiveBite(8, e);
      g.fx.blood.emit(p.pos.x - fx * 0.45, p.pos.y + 0.35, p.pos.z - fz * 0.45, 26, { speed: 4 });
      g.audio && g.audio.play('bite', p.pos);
      g.camRig.shake(0.4);
      g.hurtFlash = 1;
      g.input.rumble(1, 0.8, 180);
      this.hS.kick(-1.6);
    }
    // forcejeas: se le nota
    if ((p.mash || 0) > this.pinMash) {
      this.pinMash = p.mash;
      this.rollS.kick((Math.random() < 0.5 ? -1 : 1) * 1.4);
      this.hS.kick(1.2);
      g.audio && g.audio.play('boneCrack', this.center, { n: 1, k: 0.35 });
    }
    if ((p.mash || 0) >= 7) return this.endPin(true, 0);
    if (t > 2.6) return this.endPin(false, 12);
  },
  // Te suelta: de una patada (escaped) cae de espaldas, pataleando; si no,
  // tras el último mordisco se aparta de un salto.
  endPin(escaped, dmg = 0) {
    const e = this.e,
      g = this.g,
      p = g.player;
    if (!this.pinning) return;
    this.pinning = false;
    const fx = Math.sin(p.yaw),
      fz = Math.cos(p.yaw);
    if (!p.dead) p.releasePin && p.releasePin(escaped, dmg);
    this.neckExtT = 0;
    if (this.atk && this.atk.name === 'drop') this.endAttack();
    if (escaped) {
      g.audio && g.audio.play('hitHeavy', p.pos);
      g.camRig.shake(0.45);
      g.input.rumble(0.8, 0.6, 160);
      this.onEscaped && this.onEscaped();
      this.startDown(1.7);
      // (la patada lo echa hacia tus pies)
      e.vx = fx * 6;
      e.vz = fz * 6;
    } else {
      if (dmg > 0) {
        g.fx.blood.emit(p.pos.x - fx * 0.45, p.pos.y + 0.35, p.pos.z - fz * 0.45, 34, { speed: 5 });
        g.audio && g.audio.play('bite', p.pos);
        g.camRig.shake(0.5);
        g.hurtFlash = 1;
      }
      this.cool = 0.8;
      if (!this.startEvade('leap')) this.engage();
    }
  },

  // -------------------------------------------------------------- esquivas
  // kind: 'flip' (voltereta hacia atrás), 'leap' (salto atrás) o 'side'.
  // then: lo que hace al caer ('counter' = se te echa encima).
  startEvade(kind, then = null) {
    const e = this.e,
      g = this.g,
      p = g.player;
    if (this.air || this.plane !== 'floor') return false;
    const dx = e.pos.x - p.pos.x,
      dz = e.pos.z - p.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const bx = dx / d,
      bz = dz / d;
    const nav = g.navCellar;
    // (sólo a suelo llano, a su misma altura: nada de caer en la escalera)
    const ok = (x, z) => this.sameFloorLine(e.pos.x, e.pos.z, x, z);
    let tx, tz, flip = 0, arc, dur, spin = 0;
    const tries = [];
    if (kind === 'side') {
      const s = Math.random() < 0.5 ? 1 : -1;
      tries.push([-bz * s, bx * s, 3], [bz * s, -bx * s, 3], [bx, bz, 3]);
    } else tries.push([bx, bz, kind === 'flip' ? 4.2 : 3.4], [bx * 0.7 - bz * 0.7, bz * 0.7 + bx * 0.7, 3.2], [bx * 0.7 + bz * 0.7, bz * 0.7 - bx * 0.7, 3.2]);
    let dirx = 0, dirz = 0, side = 0;
    for (const [ux, uz, L] of tries) {
      for (const k of [1, 0.7, 0.45]) {
        const x = e.pos.x + ux * L * k,
          z = e.pos.z + uz * L * k;
        if (ok(x, z)) {
          tx = x;
          tz = z;
          dirx = ux;
          dirz = uz;
          break;
        }
      }
      if (tx !== undefined) break;
    }
    if (tx === undefined) return false;
    // (con el techo bajo no hay voltereta: salto atrás, más bajo)
    const room = Math.min(this.ceilAt(e.pos.x, e.pos.z), this.ceilAt(tx, tz)) - e.pos.y;
    if (kind === 'flip' && room < 4.6) kind = 'leap';
    if (kind === 'side') {
      side = Math.sign(-dirx * Math.cos(e.yaw) + dirz * Math.sin(e.yaw)) || 1;
      arc = 0.65;
      dur = 0.42;
      spin = -side * 0.9;
    } else if (kind === 'flip') {
      arc = 1.7;
      dur = 0.66;
      flip = -Math.PI * 2;
    } else {
      arc = 0.75;
      dur = 0.44;
    }
    arc = Math.min(arc, Math.max(0.2, room - 3.2));
    this.releaseAll();
    this.jump('floor', dur, { x: tx, z: tz, arc, flip, spin, tuck: kind === 'flip' ? 1 : 0.4 });
    this.ev = { kind, then, t: 0 };
    this.setMode('evade');
    this.lastEvade = g.time;
    g.audio && g.audio.play('leapBack', this.center);
    this.exert = Math.min(1, this.exert + 0.12);
    return true;
  },
  evade(dt) {
    const e = this.e,
      p = this.g.player;
    const E = this.ev;
    E.t += dt;
    this.lookAtPlayer(1);
    if (this.air) {
      // encara al jugador mientras vuela (salvo en la voltereta)
      if (E.kind !== 'flip') this.faceTo(p.pos.x, p.pos.z, 8, dt);
      return this.stop(dt, 4);
    }
    this.faceTo(p.pos.x, p.pos.z, 10, dt);
    this.stop(dt, 10);
    if (E.t > 0.08 + (E.kind === 'flip' ? 0.66 : 0.44)) {
      this.ev = null;
      this.afterEvade(E);
    }
  },

  // -------------------------------------------------------------- guardia
  // Los antebrazos cruzados ante la cabeza; para los golpes de frente.
  startGuard(dur, want = 3) {
    this.guardT = dur;
    this.guardHits = 0;
    this.guardWant = want;
    this.setMode('guard');
    this.g.audio && this.g.audio.play('snarl', this.center);
  },
  guard(dt) {
    const e = this.e,
      g = this.g,
      p = g.player;
    this.guardT -= dt;
    this.faceTo(p.pos.x, p.pos.z, 9, dt);
    this.stop(dt, 10);
    const u = seg(this.mT, 0, 0.14);
    this.T.h = lerp(1, 0.92, u);
    this.T.pitch = -0.35 * u;
    this.rear = 0.3 * u;
    this.T.shz = -0.15 * u;
    for (const L of [this.L[0], this.L[1]]) {
      // (la mano izquierda cruza a la derecha y al revés)
      this.localPointYaw(-L.side * 0.3, 1.55 + (L.side > 0 ? 0.08 : 0), 1.0, _a);
      this.hold(L, _a.x, _a.y, _a.z, 1, 1);
    }
    this.lookAtPlayer(1);
    this.jawT = 0.3;
    const d = this.dist;
    if (this.guardT <= 0 || this.guardHits >= this.guardWant) {
      this.releaseAll();
      this.T.pitch = 0;
      this.rear = 0;
      this.T.shz = 0;
      if (d < 3.4 && this.guardHits > 0) this.startAttack('riposte');
      else this.engage();
    }
    void e;
  },
  // Un golpe parado: chispas, hueso contra acero, se le empuja un poco.
  blockFx(fromX, fromZ) {
    const g = this.g;
    this.guardHits++;
    this.flinch(fromX, fromZ, false);
    this.hS.kick(-0.6);
    g.audio && g.audio.play('boneBlock', this.center);
    // (el resto del efecto, chispas y aguante del jugador, lo pone el combate)
    if (this.guardHits >= this.guardWant) this.guardT = Math.min(this.guardT, 0.05);
  },

  // -------------------------------------------------------------- caída
  // Boca arriba, pataleando (tras reventar un pilar o si te sueltas de su
  // agarrón): recibe más daño mientras.
  startDown(dur) {
    this.endAttack();
    this.downDur = dur;
    this.downUp = false;
    this.setMode('down');
    this.g.audio && this.g.audio.play('bodyFall', this.center);
    this.g.audio && this.g.audio.enemyVoice(this.e, 'hurt');
    this.releaseAll();
  },
  down(dt) {
    const e = this.e,
      g = this.g;
    const t = this.mT;
    this.stop(dt, 6);
    const up = seg(t, this.downDur - 0.5, this.downDur);
    this.T.h = lerp(0.32, 1, up);
    this.T.roll = Math.sin(t * 4.2) * 0.45 * (1 - up);
    this.T.pitch = Math.sin(t * 3.1) * 0.15 * (1 - up);
    this.jawT = 0.6 + Math.sin(t * 9) * 0.3;
    this.shake = 0.6 * (1 - up);
    // las cuatro patas al aire, pataleando
    if (up < 0.5) {
      for (const L of this.L) {
        const ph = t * (L.front ? 9 : 7) + L.side * 1.3 + (L.front ? 0 : 2);
        this.localPoint(L.home.x * 0.7 + Math.sin(ph) * 0.35, 1.9 + Math.sin(ph * 1.3) * 0.5, L.home.z * 0.6 + Math.cos(ph) * 0.3, _a);
        this.hold(L, _a.x, _a.y, _a.z, 1, 0.5 + Math.sin(ph) * 0.5);
      }
    } else if (!this.downUp) {
      this.downUp = true;
      this.releaseAll();
    }
    if (t > this.downDur) {
      this.T.roll = 0;
      this.T.pitch = 0;
      this.shake = 0;
      this.afterDown();
    }
    void e;
    void g;
  },

  // -------------------------------------------------------------- burlas
  // kind: 'beat' (golpea el suelo con las dos manos, a gritos), 'laugh'
  // (castañetea, se estremece), 'headspin' (la cabeza da la vuelta entera).
  startTaunt(kind, dur) {
    this.tauntKind = kind;
    this.evDone = {};
    this.tauntDur = dur ?? (kind === 'beat' ? 2.2 : kind === 'laugh' ? 1.4 : 1.3);
    this.setMode('taunt');
    const g = this.g;
    if (kind === 'laugh') this.giggle(true);
    if (kind === 'headspin') g.audio && g.audio.play('neckTwist', this.center);
    if (kind === 'beat') g.audio && g.audio.play('snarl', this.center);
  },
  taunt(dt) {
    const g = this.g,
      p = g.player;
    const t = this.mT;
    this.stop(dt, 8);
    this.faceTo(p.pos.x, p.pos.z, 4, dt);
    this.lookAtPlayer(1);
    const k = this.tauntKind;
    if (k === 'beat') {
      this.rear = 0.4 + Math.sin(t * 10) * 0.05;
      this.T.h = 1.25;
      this.shake = 0.7;
      this.jawT = 0.8 + Math.sin(t * 13) * 0.2;
      for (const L of [this.L[0], this.L[1]]) {
        const ph = (t * 3.4 + (L.side > 0 ? 0 : 0.5)) % 1;
        const lift = ph < 0.6 ? Math.sin((ph / 0.6) * Math.PI) : 0;
        this.localPointYaw(L.side * 0.75, 0.04 + lift * 1.3, 1.9, _a);
        this.hold(L, _a.x, _a.y, _a.z, 1, 1);
        const key = 'b' + L.side + Math.floor(t * 3.4 + (L.side > 0 ? 0 : 0.5));
        if (ph > 0.6 && !this.evDone[key]) {
          this.evDone[key] = true;
          g.audio && g.audio.play('slamSoft', _a, { k: 0.6 });
          g.fx.blood.emit(_a.x, _a.y, _a.z, 5, { color: [0.3, 0.28, 0.26], speed: 1.5, life: 0.5, up: 0.5 });
          g.camRig.shake(0.08);
        }
      }
    } else if (k === 'laugh') {
      this.chatter = 1;
      this.T.h = 0.95 + Math.sin(t * 24) * 0.03;
      this.T.roll = Math.sin(t * 19) * 0.05;
      this.tiltT = 0.9;
    } else if (k === 'headspin') {
      this.twistT = Math.PI * 2 * seg(t, 0.1, 1.1);
      if (t > 1.1) this.twistT = this.twist = 0;
    }
    if (t > this.tauntDur) {
      this.releaseAll();
      this.rear = 0;
      this.shake = 0;
      this.chatter = 0;
      this.T.h = 1;
      this.T.roll = 0;
      this.twistT = this.twist = 0;
      this.afterTaunt();
    }
  },

  // -------------------------------------------------------------- huesos
  throwBone(from, p) {
    const g = this.g;
    const T = 0.95;
    const grav = 12;
    const tx = p.pos.x + p.vx * 0.5 + rnd(-0.6, 0.6),
      tz = p.pos.z + p.vz * 0.5 + rnd(-0.6, 0.6);
    const ty = p.pos.y + 1.1;
    const v = new V3((tx - from.x) / T, (ty - from.y + 0.5 * grav * T * T) / T, (tz - from.z) / T);
    const skull = Math.random() < 0.35;
    const m = new THREE.Mesh(skull ? new THREE.SphereGeometry(0.11, 6, 4) : new THREE.CylinderGeometry(0.025, 0.035, 0.42, 5), this.boneMat || (this.boneMat = this.e.rig.meshes.find((q) => q.userData.matName === 'bone').material));
    m.position.copy(from);
    g.scene.add(m);
    this.projectiles.push({ m, v, grav, life: 3, hit: false });
    g.audio && g.audio.play('boneThrow', from);
  },
  updateProjectiles(dt) {
    const g = this.g,
      p = g.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const P = this.projectiles[i];
      P.life -= dt;
      P.v.y -= P.grav * dt;
      P.m.position.addScaledVector(P.v, dt);
      P.m.rotation.x += dt * 14;
      P.m.rotation.z += dt * 9;
      const q = P.m.position;
      let end = P.life <= 0;
      const gy = g.world.col.groundHeight(q.x, q.z, 0.05, q.y + 0.3);
      if (q.y < gy + 0.05) {
        end = true;
        g.audio && g.audio.play('boneClatter', q);
      }
      if (!end && !P.hit && Math.hypot(q.x - p.pos.x, q.y - (p.pos.y + 1.1), q.z - p.pos.z) < 0.6 && !p.dead) {
        P.hit = true;
        if (g.combat.apply(this.e, { dmg: ATK.throw.dmg, knock: 2.5 }, q.x - P.v.x * 0.1, q.z - P.v.z * 0.1)) end = true;
      }
      if (end) {
        g.scene.remove(P.m);
        P.m.geometry.dispose();
        this.projectiles.splice(i, 1);
      }
    }
  },
  clearProjectiles() {
    for (const P of this.projectiles || []) {
      this.g.scene.remove(P.m);
      P.m.geometry.dispose();
    }
    if (this.projectiles) this.projectiles.length = 0;
  },
};
