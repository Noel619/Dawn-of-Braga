// El Descoyuntado: la cabeza.
//
// Es su casa: siempre sabe dónde estás. Tiene dos maneras de cazarte.
//
// ACECHO. Se mueve por el techo y por las madrigueras de los muros hasta
// puntos oscuros desde los que te observa; a veces se deja ver a lo lejos y
// se esfuma; se burla (huesos que crujen, pasos que no son tuyos, la voz del
// ama que te llama, algo que corre dentro de la pared). Tiene hambre, y
// cuanta más tiene antes se decide: cae del techo detrás de ti, salta desde
// la oscuridad o te agarra por la espalda, sobre todo cuando le das la
// espalda, te curas, lees o echas una palanca (las oye desde cualquier
// rincón). Después de una emboscada se queda a pelear un rato y luego se
// esconde otra vez. Pero cada emboscada que le sale mal (la esquivas, la
// paras, le ves venir, le hieres, te sueltas de su agarrón) le frustra.
//
// FURIA. Cuando se harta (demasiadas emboscadas fallidas, demasiado daño o
// echas la tercera palanca), enloquece: viene a por ti, se alza, grita,
// golpea el suelo, y ya no se esconde. Tus golpes le hacen la mitad de daño.
// Prefiere pelear en sitios abiertos (el Lagar, la cripta): si te metes en
// un pasillo, se aparta a lo ancho y te espera golpeando el suelo, y si no
// sales, entra. Y aprende de ti: lleva la cuenta de lo que haces (golpes
// flojos, fuertes, a la carrera, esquivas, guardia, curas) y de qué sueles
// hacer después de qué; de cuántos golpes tienen tus combos; de hacia dónde
// ruedas cuando te ataca. Cuanto más te ve pelear, más te lee: salta atrás
// (o da una voltereta) cuando vas a golpear y te castiga en la recuperación,
// cruza los brazos para parar el resto de un combo que ya conoce y
// contraataca, se adelanta con un mordisco cuando sabe que vas a atacar, y
// apunta su segundo zarpazo adonde sueles esquivar. Con poca vida, frenesí.
import * as THREE from 'three';
import { clamp, damp, lerp, angleDiff, approachAngle, DEG } from '../core/util.js';
import { moveBody } from '../world/collision.js';
import { CELLAR, cellarCeil } from '../world/level_cellar.js';
import { seg, rnd } from './desc_util.js';

const V3 = THREE.Vector3;
const _a = new V3(),
  _b = new V3();

// ------------------------------------------------------------ aprendizaje
// L golpe flojo, H fuerte, S a la carrera, D esquiva, B guardia, F cura
const TOKENS = ['L', 'H', 'S', 'D', 'B', 'F'];
class Learner {
  constructor() {
    this.reset();
  }
  reset() {
    this.hist = [];
    this.c1 = {};
    this.c2 = {};
    this.c3 = {};
    this.n = 0;
    this.combos = [0, 0, 0, 0, 0, 0];
    this.cur = 0;
    this.lastAtkT = -9;
    this.dodge = {};
    this.atkDist = 2.6;
    this.nAtk = 0;
  }
  ctx(t) {
    const h = this.hist;
    const a = h.length > 0 && t - h[h.length - 1].t < 2.5 ? h[h.length - 1].k : '^';
    const b = h.length > 1 && a !== '^' && t - h[h.length - 2].t < 3.5 ? h[h.length - 2].k : '^';
    return [b, a];
  }
  token(k, t, dist) {
    const [b, a] = this.ctx(t);
    const inc = (o, key) => {
      o[key] = o[key] || {};
      o[key][k] = (o[key][k] || 0) + 1;
      o[key].n = (o[key].n || 0) + 1;
    };
    inc(this.c1, '_');
    inc(this.c2, a);
    inc(this.c3, b + a);
    this.hist.push({ k, t });
    if (this.hist.length > 40) this.hist.shift();
    this.n++;
    // combos: golpes seguidos (menos de un segundo entre uno y otro)
    const atk = k === 'L' || k === 'H' || k === 'S';
    if (atk) {
      if (t - this.lastAtkT < 1.0) this.cur++;
      else {
        this.closeCombo();
        this.cur = 1;
      }
      this.lastAtkT = t;
      this.atkDist = lerp(this.atkDist, dist, 0.2);
      this.nAtk++;
    } else this.closeCombo();
  }
  closeCombo() {
    if (this.cur > 0) this.combos[Math.min(5, this.cur)]++;
    this.cur = 0;
  }
  // Probabilidad de cada cosa que puedes hacer ahora.
  predict(t) {
    const [b, a] = this.ctx(t);
    const P = {};
    let tot = 0;
    for (const k of TOKENS) {
      const f = (o, key, w) => (o[key] && o[key].n ? (w * (o[key][k] || 0)) / o[key].n : 0);
      const w3 = this.c3[b + a] && this.c3[b + a].n >= 3 ? 0.6 : 0;
      const w2 = this.c2[a] && this.c2[a].n >= 2 ? 0.3 : 0;
      P[k] = f(this.c3, b + a, w3) + f(this.c2, a, w2) + f(this.c1, '_', 1 - w3 - w2) + 0.02;
      tot += P[k];
    }
    for (const k of TOKENS) P[k] /= tot;
    return P;
  }
  pAttack(t) {
    const P = this.predict(t);
    return P.L + P.H + P.S;
  }
  // Cuántos golpes le quedan a tu combo (llevas 'k').
  comboLeft(k) {
    let num = 0,
      den = 0;
    for (let len = Math.max(1, k); len <= 5; len++) {
      const c = this.combos[len] + (len === 3 ? 0.5 : 0);
      den += c;
      if (len > k) num += c * (len - k);
    }
    return den > 0 ? num / den : 0;
  }
  // Hacia dónde sueles rodar cuando te lanza 'atk' (l, r, b = atrás, f = hacia él).
  addDodge(atk, dir) {
    const D = (this.dodge[atk] = this.dodge[atk] || { l: 0, r: 0, b: 0, f: 0, n: 0 });
    D[dir]++;
    D.n++;
  }
  dodgeGuess(atk) {
    const D = this.dodge[atk] || this.dodge._all;
    if (!D || D.n < 2) return null;
    let best = null,
      bv = 0;
    for (const k of ['l', 'r', 'b', 'f'])
      if (D[k] > bv) {
        bv = D[k];
        best = k;
      }
    return bv / D.n >= 0.5 ? best : null;
  }
}

export const MIND = {
  // ------------------------------------------------------------------ estado
  resetAI() {
    this.stage = 'stalk';
    this.mode = 'lair';
    this.mT = 0;
    this.hunger = 0.1;
    this.frust = 0;
    this.frenzy = false;
    this.seen = false;
    this.seenT = 0;
    this.unseenT = 0;
    this.behind = false;
    this.senseT = 0;
    this.perch = null;
    this.lastPerches = [];
    this.path = null;
    this.pathT = 0;
    this.goal = new V3();
    this.freezeT = 0;
    this.tauntT = rnd(6, 10);
    this.peekCD = 25;
    this.engaged = false;
    this.engageT = 0;
    this.engageDmg = 0;
    this.lastEngaged = -99;
    this.atk = null;
    this.atkT = 0;
    this.cool = 0;
    this.score = { claw: 0, claw2: 0, sweep: 0, slam: 0, lunge: 0, pounce: 0, charge: 0, spin: 0, grab: 0, rip: 0, crack: 0, throw: 0, drop: 0, riposte: 0 };
    this.shieldT = 0;
    this.ripCount = 0;
    this.blockT = 0;
    this.rollN = 0;
    this.phase = 1;
    this.burrow = null;
    this.stuckT = 0;
    this.lastPos = new V3();
    this.projectiles = this.projectiles || [];
    this.circle = Math.random() < 0.5 ? 1 : -1;
    this.hurtT = 0;
    this.huntT = 0;
    this.inFight = false;
    this.retreatN = 0;
    this.dist = 99;
    this.prevDist = 99;
    this.planeT = -99;
    this.ambush = false;
    this.fightDur = 8;
    this.learn = new Learner();
    this.skill = 0.25;
    this.lureT = 0;
    this.lureCD = 0;
    this.lastAnticip = -9;
    this.lastReact = -9;
    this.burst = 0;
    this.noise = null;
    this.stalkT = 0;
    this.grabbed = false;
    this.downUp = false;
    this.ev = null;
    this.rageK = 0;
    this.creep = false;
    this.scan = 0;
    this.chatter = 0;
    this.shake = 0;
    this.open = null;
  },

  reset() {
    const e = this.e;
    this.plane = 'floor';
    this.air = null;
    this.hS.x = 0.8;
    this.T.h = 0.8;
    this.T.pitch = 0;
    this.T.roll = 0;
    this.T.yaw = this.T.bend = this.T.twist = this.T.shx = this.T.shz = 0;
    this.rear = 0;
    this.twist = this.twistT = 0;
    this.jawT = 0;
    this.eatT = 1;
    this.eat = 1;
    this.eyeT = 0.6;
    this.eyeRed = 0;
    this.lookW = 0;
    this.neckExtT = this.neckExt = 0;
    this.ceilY = null;
    this.onLand = null;
    e.data.air = false;
    e.obj.visible = true;
    e.sink = 0;
    this.hidden = false;
    this._death = null;
    this.resetAI();
    this.plantAll();
    this.clearProjectiles();
  },

  setMode(m) {
    if (this.mode === m) return;
    this.mode = m;
    this.mT = 0;
    this.path = null;
  },

  // Lo que ve el jugador de él (y dónde mira el jugador).
  sense() {
    const e = this.e,
      g = this.g,
      cam = g.camera,
      p = g.player;
    const c = this.center;
    const dc = cam.position.distanceTo(c);
    _a.copy(c).project(cam);
    const onScreen = _a.z < 1 && Math.abs(_a.x) < 0.94 && Math.abs(_a.y) < 0.94;
    const dp = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    const pr = e._probe;
    const lit = dp < 8 || (pr && pr[0] + pr[1] + pr[2] > 0.9) || this.eyeT > 1.2;
    let vis = e.obj.visible && !this.hidden && onScreen && dc < 16 && lit;
    if (vis) vis = g.world.col.lineOfSight(cam.position.x, cam.position.y, cam.position.z, c.x, c.y, c.z);
    this.seen = vis;
    // ¿el jugador mira hacia él?
    cam.getWorldDirection(_b);
    const ang = Math.acos(clamp((_b.x * (c.x - cam.position.x) + _b.z * (c.z - cam.position.z)) / (Math.hypot(_b.x, _b.z) * Math.hypot(c.x - cam.position.x, c.z - cam.position.z) + 1e-6), -1, 1));
    this.behind = ang > 105 * DEG;
    this.facingAng = ang;
    this.dist = dp;
    this.los = g.world.col.lineOfSight(e.pos.x, e.pos.y + 1.2, e.pos.z, p.pos.x, p.pos.y + 1.3, p.pos.z);
  },

  // Lo vulnerable que está el jugador ahora mismo.
  vuln() {
    const g = this.g,
      p = g.player;
    let v = 0;
    if (p.state === 'heal') v += 1.2;
    if (p.state === 'interact' || p.state === 'rest') v += p.interactKind === 'lever' ? 1.6 : 1;
    if (g.time - (g.lastModalT || -99) < 1.2) v += 1; // acaba de leer algo
    if (p.st < p.maxSt * 0.3) v += 0.6;
    if (p.state === 'roll' || p.state === 'attack') v += 0.25;
    if (this.behind && !this.seen) v += 0.6;
    if (p.hp < p.maxHp * 0.35) v += 0.4;
    return v;
  },

  inCellar(x, z) {
    return cellarCeil(x, z) !== null;
  },

  // ¿Vería el jugador este punto (a esta altura)?
  pointVisible(x, y, z) {
    const g = this.g,
      cam = g.camera;
    _a.set(x, y, z).project(cam);
    if (!(_a.z < 1 && Math.abs(_a.x) < 1 && Math.abs(_a.y) < 1)) return false;
    return g.world.col.lineOfSight(cam.position.x, cam.position.y, cam.position.z, x, y, z);
  },

  // Elige un punto de acecho: kind 'hide' (fuera de su vista, detrás si
  // puede), 'peek' (delante, a lo lejos, a la vista) o 'far' (lejos).
  choosePerch(kind, near = null) {
    const g = this.g,
      p = near || g.player.pos;
    const cam = g.camera;
    cam.getWorldDirection(_b);
    let best = null,
      bs = -1e9;
    const want = kind === 'peek' ? 11 : kind === 'far' ? 15 : lerp(12, 7, clamp(this.hunger, 0, 1));
    for (const P of CELLAR.perches) {
      const d = Math.hypot(P.x - p.x, P.z - p.z);
      if (d < (kind === 'peek' ? 7.5 : 5) || d > (kind === 'far' ? 24 : 18)) continue;
      const cy = this.ceilAt(P.x, P.z) - 1;
      const vis = this.pointVisible(P.x, cy, P.z);
      const front = (_b.x * (P.x - p.x) + _b.z * (P.z - p.z)) / (Math.hypot(_b.x, _b.z) * d + 1e-6);
      let s = -Math.abs(d - want) + Math.random() * 2.5;
      if (kind === 'peek') s += (vis ? 8 : -6) + front * 4;
      else s += (vis ? -9 : 0) - front * 2.5;
      if (this.lastPerches.includes(P)) s -= 6;
      const dm = Math.hypot(P.x - this.e.pos.x, P.z - this.e.pos.z);
      s -= dm * 0.08;
      if (s > bs) {
        bs = s;
        best = P;
      }
    }
    if (best) {
      this.lastPerches.push(best);
      if (this.lastPerches.length > 4) this.lastPerches.shift();
    }
    return best;
  },

  // Madriguera cuya boca más cercana a él queda a mano y cuya otra boca
  // acerca (o aleja, 'far') al jugador.
  chooseBurrow(far = false) {
    const e = this.e,
      p = this.g.player.pos;
    let best = null,
      bs = 1e9;
    for (const pair of CELLAR.burrows)
      for (let k = 0; k < 2; k++) {
        const A = pair[k],
          B = pair[1 - k];
        const dA = Math.hypot(A.fx - e.pos.x, A.fz - e.pos.z);
        if (dA > 12) continue;
        const dB = Math.hypot(B.fx - p.x, B.fz - p.z);
        if (!far && (dB < 4 || dB > 13)) continue;
        if (far && dB < 12) continue;
        if (this.pointVisible(A.x, A.y + 0.5, A.z) && this.seen) continue;
        const s = dA + (far ? -dB * 0.3 : Math.abs(dB - 7)) + Math.random() * 3;
        if (s < bs) {
          bs = s;
          best = { A, B };
        }
      }
    return best;
  },

  // Movimiento con A* por la rejilla de las bodegas.
  moveTo(x, z, speed, dt, face = true) {
    const e = this.e;
    const nav = this.g.navCellar;
    let tx = x,
      tz = z;
    if (nav && !nav.line(e.pos.x, e.pos.z, x, z)) {
      this.pathT -= dt;
      if (!this.path || this.pathT <= 0 || Math.hypot(this.goal.x - x, this.goal.z - z) > 1.2) {
        const r = nav.path(e.pos.x, e.pos.z, x, z, 9000);
        this.path = r ? r.pts : null;
        this.pathI = 1;
        this.pathT = 0.6;
        this.goal.set(x, 0, z);
      }
      if (this.path && this.pathI < this.path.length) {
        const [px, pz] = this.path[this.pathI];
        if (Math.hypot(px - e.pos.x, pz - e.pos.z) < 0.7) this.pathI++;
        if (this.pathI < this.path.length) [tx, tz] = this.path[this.pathI];
      }
    } else this.path = null;
    const dx = tx - e.pos.x,
      dz = tz - e.pos.z;
    const d = Math.hypot(dx, dz);
    const k = Math.min(1, d / 0.8);
    const wx = d > 0.01 ? (dx / d) * speed * k : 0,
      wz = d > 0.01 ? (dz / d) * speed * k : 0;
    e.vx = damp(e.vx, wx, 7, dt);
    e.vz = damp(e.vz, wz, 7, dt);
    if (face && d > 0.15) e.yaw = approachAngle(e.yaw, Math.atan2(dx, dz), (4 + speed) * dt);
    return Math.hypot(x - e.pos.x, z - e.pos.z);
  },
  stop(dt, k = 8) {
    const e = this.e;
    e.vx = damp(e.vx, 0, k, dt);
    e.vz = damp(e.vz, 0, k, dt);
  },
  faceTo(x, z, rate, dt) {
    const e = this.e;
    e.yaw = approachAngle(e.yaw, Math.atan2(x - e.pos.x, z - e.pos.z), rate * dt);
  },
  lookAtPlayer(w = 1) {
    const p = this.g.player.pos;
    this.lookP.set(p.x, p.y + 1.5, p.z);
    this.lookW = w;
  },

  // Cambia de plano (salta al techo o se deja caer) si hace falta.
  toPlane(plane) {
    if (this.air || this.plane === plane) return !this.air && this.plane === plane;
    this.planeT = this.g.time;
    if (plane === 'ceil') {
      const c = this.ceilAt(this.e.pos.x, this.e.pos.z);
      if (c - this.e.pos.y < 3.1) return false;
      this.g.audio && this.g.audio.play('scuttle', this.e.pos);
    }
    this.jump(plane, plane === 'ceil' ? 0.4 : 0.35, { arc: plane === 'ceil' ? 0.2 : 0.1 });
    return false;
  },

  // ------------------------------------------------------------------ ciclo
  think(dt) {
    const e = this.e,
      g = this.g,
      p = g.player;
    this.mT += dt;
    e.stT += dt;
    this.cool -= dt;
    this.hurtT -= dt;
    this.lureCD -= dt;
    this.burst = Math.max(0, this.burst - dt * 18);
    e.flash -= dt;
    e.poiseT -= dt;
    if (e.poiseT <= 0) e.poise = e.T.poise;
    this.updateProjectiles(dt);
    this.rageK = damp(this.rageK, this.stage === 'rage' ? 1 : 0, 1.5, dt);
    if (e.dead) return this.dead(dt);
    this.senseT -= dt;
    if (this.senseT <= 0) {
      this.prevDist = this.dist;
      this.senseT = 0.12;
      this.sense();
      this.closing = (this.prevDist - this.dist) / 0.12;
    }
    if (this.seen) {
      this.seenT += dt;
      this.unseenT = 0;
    } else {
      this.unseenT += dt;
      this.seenT = 0;
    }
    const hunting = this.huntActive();
    // se harta: demasiado daño, demasiadas emboscadas fallidas o demasiado
    // tiempo sin cazarte
    const f = e.hp / e.maxHp;
    if (this.stage === 'stalk' && hunting && this.mode !== 'lair' && this.mode !== 'scripted') {
      this.stalkT += dt;
      if (this.stalkT > 25) this.frust += dt / 55;
      if (f < 0.72 || this.frust >= 3) this.startRage(f < 0.72 ? 'hurt' : 'frustration');
    }
    if (this.stage === 'rage' && !this.frenzy && f < 0.35) {
      this.frenzy = true;
      this.phase = 3;
      g.onBossPhase && g.onBossPhase(e);
      g.audio && g.audio.play('rageScream', this.center);
      this.shake = 1;
    }
    this.phase = this.stage === 'stalk' ? 1 : this.frenzy ? 3 : 2;
    // lo que hace el jugador
    if (p.blocking) this.blockT = Math.min(6, this.blockT + dt);
    else this.blockT = Math.max(0, this.blockT - dt * 0.5);
    if (p.state === 'roll' && !this._rolling) this.rollN = Math.min(8, this.rollN + 1);
    this._rolling = p.state === 'roll';
    this.rollN = Math.max(0, this.rollN - dt * 0.12);
    // golpes recibidos (Enemy.takeHit cambia el estado al romperle la guardia)
    if (e.state === 'hurt' || e.state === 'stagger') {
      const heavy = e.state === 'stagger';
      e.state = 'hunt';
      if (this.mode !== 'rageIntro' && this.mode !== 'down') {
        this.endAttack();
        this.releaseAll();
        if (this.plane === 'ceil' && !this.air) this.jump('floor', 0.3, { arc: 0 });
        this.setMode(heavy ? 'stun' : 'hurt');
        // enloquecido, apenas se detiene
        this.stunDur = this.stage === 'rage' ? (heavy ? 0.7 : 0.25) : heavy ? 1.5 : 0.42;
        if (this.stage === 'stalk' && this.inFight) this.frust += heavy ? 0.5 : 0.15;
      }
    }
    // quién se ve y quién no
    const M = this.mode;
    this.eyeT = M === 'peek' || M === 'fight' || M === 'attack' || M === 'lair' || M === 'guard' || M === 'evade' || M === 'rageIntro' || M === 'lure' || M === 'taunt' ? 1.2 : M === 'perch' ? 0.35 : 0.25;
    this.creep = this.stage === 'stalk' && (M === 'stalk' || (M === 'hunt' && !this.seen && this.dist < 12)) && this.plane === 'floor';
    this.scan = damp(this.scan, this.stage === 'stalk' && (M === 'stalk' || M === 'perch') && !this.seen ? 0.7 : 0, 2, dt);
    if (hunting && this.stage === 'stalk') {
      if (M === 'stalk' || M === 'perch' || M === 'peek') this.hungerTick(dt);
      this.peekCD -= dt;
    }
    switch (M) {
      case 'lair':
        this.lair(dt);
        break;
      case 'stalk':
        this.stalk(dt);
        break;
      case 'perch':
        this.perchMode(dt);
        break;
      case 'peek':
        this.peek(dt);
        break;
      case 'burrow':
        this.burrowMode(dt);
        break;
      case 'hunt':
        this.huntMode(dt);
        break;
      case 'fight':
        this.fight(dt);
        break;
      case 'attack':
        this.attack(dt);
        break;
      case 'evade':
        this.evade(dt);
        break;
      case 'guard':
        this.guard(dt);
        break;
      case 'retreat':
        this.retreat(dt);
        break;
      case 'hurt':
      case 'stun':
        this.stunned(dt);
        break;
      case 'down':
        this.down(dt);
        break;
      case 'taunt':
        this.taunt(dt);
        break;
      case 'rageIntro':
        this.rageIntro(dt);
        break;
      case 'lure':
        this.lure(dt);
        break;
      case 'scripted':
        break;
    }
    if (this.mode !== 'lair' && hunting && this.stage === 'stalk') this.taunts(dt);
    // compromiso (barra de vida, música): enloquecido, siempre
    const hot = this.stage === 'rage' || M === 'fight' || M === 'attack' || M === 'stun' || M === 'hurt' || M === 'down' || M === 'evade' || M === 'guard' || (M === 'hunt' && this.dist < 6);
    if (hot) this.lastEngaged = g.time;
    this.engaged = g.time - this.lastEngaged < 5;
    // física
    this.lastMoved = undefined;
    if (!this.air && !this.hidden && this.mode !== 'scripted') {
      const bx = e.pos.x,
        bz = e.pos.z;
      moveBody(g.world.col, e.body, e.vx * dt, e.vz * dt, dt);
      this.lastMoved = Math.hypot(e.pos.x - bx, e.pos.z - bz);
      // no atravesar al jugador (salvo desde el techo)
      if (this.plane === 'floor' && !p.dead && !(this.atk && this.atk.name === 'grab' && this.grabbed)) {
        const dx = e.pos.x - p.pos.x,
          dz = e.pos.z - p.pos.z;
        const dd = Math.hypot(dx, dz);
        const min = e.body.radius + p.body.radius;
        if (dd < min && dd > 0.001 && Math.abs(e.pos.y - p.pos.y) < 1.5) {
          const push = (min - dd) * 0.5;
          e.pos.x += (dx / dd) * push;
          e.pos.z += (dz / dd) * push;
          p.pos.x -= (dx / dd) * push * 0.7;
          p.pos.z -= (dz / dd) * push * 0.7;
        }
      }
    }
    // atascos: si no avanza, se olvida del camino
    this.stuckT += dt;
    if (this.stuckT > 1) {
      if (this.lastPos.distanceTo(e.pos) < 0.2 && Math.hypot(e.vx, e.vz) > 1) this.path = null;
      this.lastPos.copy(e.pos);
      this.stuckT = 0;
    }
  },

  huntActive() {
    return !!(this.g.hunt && this.g.hunt.active);
  },

  hungerTick(dt) {
    const p = this.g.player;
    if (this.seen) this.hunger -= dt * 0.1;
    else this.hunger += dt * (0.055 + this.vuln() * 0.06 + (this.behind ? 0.03 : 0));
    this.hunger = clamp(this.hunger, 0, 1.6);
    // ¿emboscada?
    const lever = p.state === 'interact' && p.interactKind === 'lever' && this.dist < 16;
    if (lever || (this.hunger >= 1 && this.vuln() > 0.5 && !this.seen)) this.startHunt();
    else if (this.hunger >= 1.3 && !this.seen) this.startHunt();
  },

  // -------------------------------------------------------------- modos
  // En su guarida: come, hasta que empieza la caza.
  lair(dt) {
    const e = this.e,
      g = this.g;
    this.stop(dt);
    this.eatT = 1;
    this.T.h = 0.72;
    this.T.pitch = 0.28;
    this.eyeT = 0.8;
    this.lookW = damp(this.lookW, 0, 3, dt);
    // las manos arrancan pedazos del cadáver
    const c = this.feast;
    if (c) {
      const t = g.time;
      const lf = this.L[0],
        rf = this.L[1];
      const j = Math.sin(t * 3.1) * 0.12;
      this.hold(lf, c.x + 0.3 + j, c.y + 0.15 + Math.max(0, Math.sin(t * 4.3)) * 0.35, c.z + 0.1, 1, 0.8);
      this.hold(rf, c.x - 0.35 - j, c.y + 0.12 + Math.max(0, Math.sin(t * 3.7 + 1)) * 0.3, c.z - 0.1, 1, 0.8);
    }
    // se le oye comer desde la casa
    this.chewT = (this.chewT ?? 0) - dt;
    if (this.chewT <= 0) {
      this.chewT = rnd(0.45, 0.95);
      const d = Math.hypot(g.player.pos.x - e.pos.x, g.player.pos.z - e.pos.z);
      if (d < 40 && g.audio) g.audio.play('chew', { x: this.center.x, y: this.center.y - 0.6, z: this.center.z });
    }
  },

  // Comienza la caza (tras la cinemática o al volver a bajar).
  startHunting(kind = 'return') {
    const e = this.e;
    this.eatT = 0;
    this.releaseAll();
    e.state = 'hunt';
    e.aware = true;
    this.hunger = kind === 'intro' ? 0.3 : 0.5;
    this.T.h = 1;
    this.T.pitch = 0;
    if (kind === 'intro') {
      // ya se ha ido: está en la oscuridad, colgado de algún techo
      this.setMode('perch');
      this.perchDur = rnd(4, 6);
    } else {
      // te ha oído bajar: deja de comer, te mira y se escabulle
      this.setMode('retreat');
      this.retreatTo = this.choosePerch('far') || this.choosePerch('hide');
      this.g.audio && this.g.audio.enemyVoice(e, 'alert');
    }
  },

  stalk(dt) {
    const e = this.e;
    if (!this.perch) {
      // hacia donde sonó algo (una palanca), o de vez en cuando se deja
      // ver; otras, se cuela por los muros
      if (this.noise && this.g.time - this.noise.t < 12) {
        const P = this.choosePerch('hide', this.noise);
        if (P) this.perch = P;
        this.noise = null;
      }
      if (!this.perch && this.peekCD <= 0 && Math.random() < 0.3) {
        const P = this.choosePerch('peek');
        if (P) {
          this.perch = P;
          this.peeking = true;
          this.peekCD = rnd(28, 45);
        }
      }
      if (!this.perch && Math.random() < 0.22) {
        const b = this.chooseBurrow();
        if (b) {
          this.burrow = { ...b, t: 0, stage: 'go' };
          this.setMode('burrow');
          return;
        }
      }
      if (!this.perch) this.perch = this.choosePerch('hide') || CELLAR.perches[Math.floor(Math.random() * CELLAR.perches.length)];
    }
    const P = this.perch;
    // por el techo si cabe; por el suelo si no
    const hh = this.ceilAt(e.pos.x, e.pos.z) - e.pos.y;
    const want = this.plane === 'ceil' ? (hh > 2.9 ? 'ceil' : 'floor') : hh > 3.4 && this.g.time - this.planeT > 1.2 ? 'ceil' : 'floor';
    if (!this.toPlane(want) && this.air) {
      this.stop(dt, 4);
      return;
    }
    // si le ves mientras se mueve, se queda quieto
    if (this.seen && this.dist < 14) {
      this.freezeT += dt;
      this.stop(dt, 14);
      this.lookAtPlayer(1);
      if (this.freezeT > rnd(0.6, 1.2)) {
        this.freezeT = 0;
        // te acercas: o huye o viene a por ti
        if (this.dist < 7 && (this.hunger > 0.45 || this.closing > 1)) this.engage();
        else {
          this.retreatTo = this.choosePerch('far');
          this.setMode('retreat');
          this.giggle();
        }
      }
      return;
    }
    this.freezeT = Math.max(0, this.freezeT - dt);
    this.lookW = damp(this.lookW, 0.4, 2, dt);
    this.lookAtPlayer(this.lookW);
    // (lejos, deprisa; cerca, despacio y al acecho)
    const far = this.dist > 16;
    this.creep = !far && this.plane === 'floor';
    const spd = this.plane === 'ceil' ? (far ? 6 : 5) : far ? 6.2 : 3.4;
    const d = this.moveTo(P.x, P.z, spd, dt);
    if (d < 0.8) {
      this.setMode(this.peeking ? 'peek' : 'perch');
      this.perchDur = this.peeking ? 6 : rnd(3, 6);
    }
    if (this.mT > 12) this.perch = null;
  },

  perchMode(dt) {
    this.stop(dt, 10);
    this.lookAtPlayer(0.9);
    // se mece, cruje, mira
    this.T.h = this.plane === 'ceil' ? 0.85 : 0.75;
    if (this.seen && this.seenT > 0.6) {
      // le has visto: se va (o, si estás cerca y tiene hambre, ataca)
      if (this.dist < 7 && this.hunger > 0.35) this.engage();
      else {
        this.frust += 0.2;
        this.retreatTo = this.choosePerch('hide');
        this.setMode('retreat');
      }
      return;
    }
    if (this.mT > this.perchDur) {
      this.perch = null;
      this.peeking = false;
      this.setMode('stalk');
    }
  },

  // Se deja ver a lo lejos. Cuando lo ves, un instante, y se esfuma.
  peek(dt) {
    this.stop(dt, 10);
    this.lookAtPlayer(1);
    this.eyeT = 1.6;
    if (this.seenT > rnd(0.5, 0.9) || this.mT > this.perchDur || this.dist < 6) {
      this.peeking = false;
      this.perch = null;
      if (this.dist < 6 && this.hunger > 0.5) return this.engage();
      this.giggle();
      const b = this.chooseBurrow(true);
      if (b && Math.random() < 0.5) {
        this.burrow = { ...b, t: 0, stage: 'go' };
        this.setMode('burrow');
      } else {
        this.retreatTo = this.choosePerch('far');
        this.setMode('retreat');
      }
    }
  },

  // Por dentro de los muros: sube a la boca, desaparece, se le oye correr
  // dentro de la piedra y sale por la otra.
  burrowMode(dt) {
    const e = this.e,
      g = this.g;
    const B = this.burrow;
    if (!B) return this.setMode('stalk');
    B.t += dt;
    if (B.stage === 'go') {
      if (!this.toPlane('floor') && this.air) return;
      const d = this.moveTo(B.A.fx, B.A.fz, 5.2, dt);
      if (d < 1.1 || B.t > 6) {
        B.stage = 'in';
        B.t = 0;
        e.yaw = Math.atan2(-B.A.nx, -B.A.nz);
        this.stop(dt, 20);
        g.audio && g.audio.play('scuttle', { x: B.A.x, y: B.A.y, z: B.A.z });
      }
    } else if (B.stage === 'in') {
      // trepa a la boca (el cuerpo se estira hacia ella) y se mete
      this.stop(dt, 20);
      const u = clamp(B.t / 0.45, 0, 1);
      this.T.h = lerp(1, 2.6, u);
      this.T.pitch = -1.2 * u;
      for (const L of this.L.slice(0, 2)) this.hold(L, B.A.x + L.side * 0.3 * -B.A.nz, B.A.y + 0.5, B.A.z + L.side * 0.3 * B.A.nx, 1, 1);
      if (u >= 1) {
        B.stage = 'inside';
        B.t = 0;
        B.dur = 1.4 + Math.hypot(B.B.x - B.A.x, B.B.z - B.A.z) / 8;
        this.hidden = true;
        e.obj.visible = false;
        e.data.air = true;
        this.releaseAll();
        this.T.h = 1;
        this.T.pitch = 0;
        this.hS.x = 1;
        this.pitchS.x = 0;
        B.snd = 0;
      }
    } else if (B.stage === 'inside') {
      // se le oye dentro de la piedra, camino de la otra boca
      B.snd -= dt;
      if (B.snd <= 0) {
        B.snd = rnd(0.25, 0.45);
        const u = clamp(B.t / B.dur, 0, 1);
        g.audio && g.audio.play(Math.random() < 0.25 ? 'boneCrack' : 'scuttle', { x: lerp(B.A.x, B.B.x, u), y: B.A.y, z: lerp(B.A.z, B.B.z, u) }, { k: 0.6 });
      }
      if (B.t >= B.dur) this.burrowOut();
    } else if (B.stage === 'out') {
      this.T.h = lerp(2.2, 1, seg(B.t, 0, 0.5));
      this.T.pitch = lerp(-0.9, 0, seg(B.t, 0, 0.5));
      if (B.t > 0.5) {
        e.data.air = false;
        this.burrow = null;
        // si sale cerca de ti y tiene hambre: a por ti
        if (this.stage === 'rage') this.engage();
        else if (this.hunger > 0.8 && this.dist < 9) this.startHunt();
        else {
          this.perch = null;
          this.setMode('stalk');
        }
      }
    }
  },
  burrowOut() {
    const e = this.e,
      g = this.g;
    const B = this.burrow;
    B.stage = 'out';
    B.t = 0;
    e.pos.set(B.B.fx, this.groundAt(B.B.fx, B.B.fz), B.B.fz);
    e.yaw = Math.atan2(B.B.nx, B.B.nz);
    this.hidden = false;
    e.obj.visible = true;
    this.plane = 'floor';
    this.plantAll();
    this.T.h = 2.2;
    this.hS.x = 2.2;
    this.T.pitch = -0.9;
    this.pitchS.x = -0.9;
    g.audio && g.audio.play('scuttle', { x: B.B.x, y: B.B.y, z: B.B.z });
  },

  // Emboscada: se acerca sin que le veas y ataca.
  startHunt() {
    if (this.mode === 'hunt' || this.mode === 'attack' || this.mode === 'fight') return;
    this.setMode('hunt');
    this.huntT = 0;
    this.perch = null;
    this.spotted = 0;
  },
  huntMode(dt) {
    const e = this.e,
      g = this.g,
      p = g.player;
    this.huntT += dt;
    const cam = g.camera;
    cam.getWorldDirection(_b);
    const bl = Math.hypot(_b.x, _b.z) || 1;
    // detrás de ti
    let bx = p.pos.x - (_b.x / bl) * 2.3,
      bz = p.pos.z - (_b.z / bl) * 2.3;
    if (!g.navCellar.walkable(bx, bz)) {
      bx = p.pos.x;
      bz = p.pos.z;
    }
    const d = this.dist;
    this.lookAtPlayer(1);
    // si le ves venir de cerca, la emboscada ha fallado
    if (this.seen && d < 9) {
      this.spotted += dt;
      if (this.spotted > 0.9) {
        this.frust += 0.6;
        this.spotted = -99;
        if (this.hunger > 0.9) this.engage();
        else {
          this.retreatTo = this.choosePerch('hide');
          this.giggle();
          return this.setMode('retreat');
        }
        return;
      }
    }
    // lejos: corre por el suelo (sin que le veas) hasta tenerte cerca
    if (d > 12) {
      if (this.plane === 'ceil' && !this.air) this.jump('floor', 0.34, { arc: 0 });
      if (this.air) return this.stop(dt, 3);
      this.moveTo(p.pos.x, p.pos.z, this.seen ? 4 : 7, dt);
      if (this.huntT > 20) {
        this.hunger = 0.7;
        this.setMode('stalk');
      }
      return;
    }
    // desde el techo: se pone encima, un poco detrás, y se deja caer
    if (this.plane === 'ceil' && !this.air) {
      const dd = this.moveTo(bx, bz, 5.6, dt);
      if (dd < 1.3 || (d < 2.4 && this.behind)) return this.startAttack('drop');
    } else if (!this.air) {
      // por el suelo, agazapado
      this.T.h = 0.72;
      const spd = this.seen ? 5.6 : d > 9 ? 5 : 3.4;
      this.moveTo(p.pos.x, p.pos.z, spd, dt);
      if (this.los && d > 3.6 && d < 7.8 && this.cool <= 0) return this.startAttack(Math.random() < 0.35 ? 'lunge' : 'pounce');
      if (d < 3.1) return this.startAttack(this.vuln() > 0.9 || this.behind || this.blockT > 2.5 ? 'grab' : Math.random() < 0.4 ? 'sweep' : 'claw');
      // techo alto cerca y aún lejos: sube para caerle encima
      if (!this.seen && d > 7 && this.ceilAt(e.pos.x, e.pos.z) - e.pos.y > 3.4 && Math.random() < dt * 0.6) this.toPlane('ceil');
    }
    if (this.huntT > 18) {
      this.hunger = 0.7;
      this.setMode('stalk');
    }
  },

  // Pelea abierta.
  engage() {
    this.ambush = false;
    this.setMode('fight');
    // (un encuentro dura de que se te echa encima a que se retira)
    if (!this.inFight) {
      this.inFight = true;
      this.engageT = 0;
      this.engageDmg = 0;
      this.fightDur = rnd(7, 10);
    }
    this.perch = null;
    if (this.plane === 'ceil' && !this.air) this.jump('floor', 0.34, { arc: 0 });
  },
  fight(dt) {
    const e = this.e,
      g = this.g,
      p = g.player;
    if (this.air) return this.stop(dt, 3);
    this.engageT += dt;
    const d = this.dist;
    this.lookAtPlayer(1);
    this.T.h = this.stage === 'rage' ? 0.95 : 0.9;
    const rage = this.stage === 'rage';
    // al acecho, se retira herido o harto (para volver cuando menos lo esperes)
    if (!rage && (this.engageDmg > e.maxHp * 0.1 || this.engageT > this.fightDur)) return this.startRetreat();
    // ¿se escuda tras un pilar? lo arranca
    const sh = g.breakables && g.breakables.between(e.pos.x, e.pos.z, p.pos.x, p.pos.z, e.pos.y);
    if (sh && sh.kind === 'pillar' && d < 5) {
      const pd = Math.hypot(p.pos.x - sh.x, p.pos.z - sh.z);
      if (pd < 2.6) this.shieldT += dt * (1 + this.ripCount * 0.8);
    } else this.shieldT = Math.max(0, this.shieldT - dt * 0.5);
    if (sh && this.shieldT > (rage ? 0.8 : 1.1) && this.cool <= 0.3) {
      this.ripTarget = sh;
      return this.startAttack('rip');
    }
    // castiga que te cures
    if (p.state === 'heal' && this.cool < 0.6) {
      if (d < 3) return this.startAttack('claw');
      if (d < 7.5 && this.los) return this.startAttack(rage ? 'lunge' : 'pounce');
      if (rage && d < 12) return this.startAttack('charge');
    }
    if (rage && this.rageTactics(dt)) return;
    if (this.cool <= 0 && this.los) {
      const a = this.pickAttack(d);
      if (a) return this.startAttack(a);
    }
    // distancia: se acerca, rodea o recula (enloquecido, buscando lo ancho)
    if (d > (rage ? 5 : 4.2) || !this.los) this.moveTo(p.pos.x, p.pos.z, d > 7 ? (rage ? 6.5 : 5) : 3.4, dt);
    else this.circleAround(dt, rage);
  },
  circleAround(dt, rage) {
    const e = this.e,
      p = this.g.player;
    const d = this.dist;
    const r = d < 2.2 ? 3.4 : rage ? 3.6 : 3;
    let ang = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z) + this.circle * 0.55;
    if (rage) {
      // de los puntos de alrededor, el más despejado
      let best = ang,
        bs = -1e9;
      const nav = this.g.navCellar;
      for (let k = -2; k <= 2; k++) {
        const a = ang + k * 0.45;
        const x = p.pos.x + Math.sin(a) * r,
          z = p.pos.z + Math.cos(a) * r;
        if (!nav.walkable(x, z)) continue;
        const s = this.openAt(x, z) - Math.abs(k) * 0.35;
        if (s > bs) {
          bs = s;
          best = a;
        }
      }
      ang = best;
    }
    this.moveTo(p.pos.x + Math.sin(ang) * r, p.pos.z + Math.cos(ang) * r, rage ? 3 : 2.2, dt, false);
    this.faceTo(p.pos.x, p.pos.z, 6, dt);
    if (Math.random() < dt * 0.35) this.circle = -this.circle;
  },

  // Enloquecido: te lee (se adelanta a tu golpe, castiga tu recuperación) y
  // te saca a lo ancho. true si ha hecho algo.
  rageTactics(dt) {
    const g = this.g,
      p = g.player;
    const d = this.dist;
    const t = g.time;
    this.skill = clamp(0.3 + this.learn.n / 30, 0.3, 0.82) + (this.frenzy ? 0.08 : 0);
    // castiga la recuperación de un golpe que no le ha dado
    if (p.state === 'attack' && p.atk && p.atkT > p.atk.hit[1] + 0.02 && d < 3.8 && this.cool < 0.5 && !this.hitRecently()) {
      this.cool = 0.6;
      this.startAttack(d < 2.8 ? 'riposte' : 'lunge');
      return true;
    }
    // se adelanta: sabe que vas a golpear y muerde antes
    const free = p.state === 'free' || p.state === 'block';
    if (free && t - this.lastAnticip > 1.4 && this.cool <= 0.4 && d > 2.3 && d < this.learn.atkDist + 1.6 && this.closing > 1.4) {
      this.lastAnticip = t;
      const pa = this.learn.pAttack(t);
      if (pa > 0.5 && Math.random() < this.skill) {
        this.readFx();
        this.startAttack('lunge');
        return true;
      }
    }
    // como loco: grita, se sacude, cambia de lado de golpe y, si estás
    // lejos, golpea el suelo o gira la cabeza entera
    this.crazyT = (this.crazyT ?? rnd(4, 7)) - dt;
    if (Math.random() < dt * 0.9) this.circle = -this.circle;
    if (this.crazyT <= 0 && this.cool > 0 && d > 3.6) {
      this.crazyT = rnd(5, 9);
      const r = Math.random();
      if (d > 5.5 && r < 0.3) {
        this.startTaunt('beat', 1.2);
        return true;
      }
      if (d > 5.5 && r < 0.5) {
        this.startTaunt('headspin');
        return true;
      }
      this.shake = 1;
      this.jawT = 1;
      g.audio && g.audio.play(r < 0.8 ? 'snarl' : 'descScream', this.center, { k: 0.7 });
    }
    if (this.shake > 0.6) this.jawT = Math.max(this.jawT, this.shake);
    // te has metido en un sitio estrecho: te espera a lo ancho
    const po = this.openAt(p.pos.x, p.pos.z);
    if (po < 2.1 && d > 2.5) this.lureT += dt;
    else this.lureT = Math.max(0, this.lureT - dt * 2);
    if (this.lureT > 1.6 && this.lureCD <= 0) {
      const spot = this.findOpenSpot();
      if (spot) {
        this.lureTo = spot;
        this.lureT = 0;
        this.setMode('lure');
        return true;
      }
      this.lureCD = 8;
    }
    return false;
  },
  hitRecently() {
    return this.g.time - (this.lastHurtT ?? -9) < 0.25;
  },
  // Te ha leído: un chasquido y un destello en los ojos.
  readFx() {
    this.e.flare = 1;
    this.tiltT = (Math.random() < 0.5 ? -1 : 1) * 1.1;
    if (Math.random() < 0.5) this.giggle();
  },

  // Elige golpe según la distancia y lo que ha aprendido de ti.
  pickAttack(d, chained = false) {
    const g = this.g,
      p = g.player;
    const W = [];
    const sc = (n) => clamp(1 + this.score[n] * 0.28, 0.3, 2.6);
    const last = this.lastAttack;
    const add = (n, w) => {
      if (chained && n === last) w *= 0.25;
      W.push([n, w * sc(n)]);
    };
    const rage = this.stage === 'rage';
    // si ruedas mucho hacia los lados, barre; si te escudas, agarra o machaca
    const sideRoller = this.learn.dodge._all && this.learn.dodge._all.n > 2 && (this.learn.dodge._all.l + this.learn.dodge._all.r) / this.learn.dodge._all.n > 0.5;
    if (d < 3.1) {
      add('claw', 3);
      add('claw2', 2);
      add('sweep', rage ? (sideRoller ? 3 : 1.6) : 0.8);
      if (this.blockT > 1.8 || p.st < p.maxSt * 0.3) add('grab', 2.2);
      else add('grab', 0.5);
      if (rage) add('slam', this.blockT > 1.5 ? 2.4 : 1.2);
      if (rage && (this.lastCrack ?? -99) < g.time - 10) add('crack', 1.2);
      if (this.frenzy) add('spin', 1.6);
    }
    if (d >= 3 && d < 5.8) {
      add('lunge', rage ? 2.6 : 1.2);
      if (rage) add('sweep', 0.8);
      add('pounce', d < 4.5 ? 0.6 : 1.6);
      if (!chained) W.push([null, rage ? 0.8 : 1.4]);
    }
    if (d >= 5.8 && d < 10) {
      add('pounce', 2);
      if (rage) add('charge', 2.2);
      add('throw', 0.7);
    }
    if (d >= 10 && d < 16 && rage) {
      add('charge', 2);
      add('throw', 1.2);
    }
    if (!W.length) return null;
    let tot = 0;
    for (const w of W) tot += w[1];
    let r = Math.random() * tot;
    for (const [n, w] of W) {
      r -= w;
      if (r <= 0) return n;
    }
    return W[0][0];
  },

  // Al acabar un golpe: encadena otro (enloquecido), sigue peleando o se va.
  afterAttack(a) {
    const rage = this.stage === 'rage';
    this.cool = (this.frenzy ? rnd(0.25, 0.55) : rage ? rnd(0.45, 0.9) : rnd(0.6, 1.2)) + (a.name === 'crack' ? 0.6 : 0);
    if (rage && !a.chained && Math.random() < (this.frenzy ? 0.55 : 0.35) && this.los) {
      const n = this.pickAttack(this.dist, true);
      if (n) {
        this.startAttack(n, { chained: true, speed: this.frenzy ? 1.12 : 1 });
        return;
      }
    }
    // tras una emboscada: se queda a pelear un rato
    this.engage();
  },
  onAttackStart(name) {
    this.atkWin = { name, t: this.g.time };
  },
  onAttackEnd(a, hit) {
    if (this.ambush && this.stage === 'stalk') {
      // una emboscada que no te ha hecho nada le frustra
      if (!hit) this.frust += 1;
      else this.frust = Math.max(0, this.frust - 0.3);
    }
    if (this.atkWin) this.atkWin.end = this.g.time;
  },
  onCrash(broke) {
    if (this.stage === 'stalk') this.frust += broke ? 0.8 : 0.5;
  },
  onEscaped() {
    if (this.stage === 'stalk') this.frust += 1;
  },
  afterEvade(E) {
    const p = this.g.player;
    this.releaseAll();
    // contraataque: si sigues en tu golpe o recuperándote, se te echa encima
    if (E.then === 'counter' && this.dist < 5.5 && (p.state === 'attack' || p.state === 'free')) {
      this.cool = 0.5;
      return this.startAttack(this.dist < 2.9 ? 'riposte' : 'lunge');
    }
    this.engage();
  },
  afterDown() {
    if (this.stage === 'rage') {
      // se levanta a gritos
      if (Math.random() < 0.5) return this.startTaunt('beat', 1.2);
      return this.startEvade('leap', 'counter') || this.engage();
    }
    if (this.engageDmg > this.e.maxHp * 0.08) this.startRetreat();
    else this.engage();
  },
  afterTaunt() {
    if (this.mode === 'taunt') this.setMode(this.lureTo ? 'lure' : 'fight');
    if (this.mode === 'fight' && !this.inFight) this.engage();
  },

  startRetreat() {
    if (this.stage === 'rage') return this.engage();
    this.retreatN++;
    this.inFight = false;
    const b = Math.random() < 0.4 ? this.chooseBurrow(true) : null;
    if (b) {
      this.burrow = { ...b, t: 0, stage: 'go' };
      this.setMode('burrow');
    } else {
      this.retreatTo = this.choosePerch('far') || this.choosePerch('hide');
      this.setMode('retreat');
    }
    this.hunger = 0.3;
    this.giggle();
  },

  retreat(dt) {
    const e = this.e;
    const P = this.retreatTo;
    if (!P || this.stage === 'rage') {
      this.perch = null;
      return this.stage === 'rage' ? this.engage() : this.setMode('stalk');
    }
    // salta al techo y se va a toda prisa
    if (this.mT < 0.2) this.toPlane(this.ceilAt(e.pos.x, e.pos.z) - e.pos.y > 3.2 ? 'ceil' : 'floor');
    if (this.air) return this.stop(dt, 3);
    this.lookW = damp(this.lookW, 0, 3, dt);
    // si le persigues de cerca, se da la vuelta y pelea
    if (this.seen && this.dist < 4.5 && this.closing > 1 && this.mT > 1) return this.engage();
    const d = this.moveTo(P.x, P.z, this.plane === 'ceil' ? 6 : 5.4, dt);
    if (d < 0.9 || this.mT > 8) {
      this.perch = P;
      this.setMode('perch');
      this.perchDur = rnd(3, 6);
    }
  },

  stunned(dt) {
    const e = this.e;
    this.stop(dt, 6);
    const stun = this.mode === 'stun';
    const u = this.mT / this.stunDur;
    this.T.h = stun ? lerp(0.45, 0.9, seg(u, 0.5, 1)) : 0.85;
    this.T.roll = stun ? Math.sin(this.mT * 3) * 0.3 * (1 - u) : 0;
    this.jawT = stun ? 0.6 : 0.3;
    if (this.mT >= this.stunDur) {
      this.T.roll = 0;
      this.jawT = 0;
      if (this.stage === 'rage') {
        // enloquecido: se aparta de un salto y vuelve
        if (Math.random() < 0.5 && this.dist < 3) return this.startEvade(Math.random() < 0.5 ? 'flip' : 'leap', 'counter') || this.engage();
        return this.engage();
      }
      if (this.engageDmg > e.maxHp * 0.08 && Math.random() < 0.55) this.startRetreat();
      else this.engage();
    }
  },

  // -------------------------------------------------------------- furia
  startRage(reason) {
    const e = this.e,
      g = this.g;
    if (this.stage === 'rage' || e.dead) return;
    this.stage = 'rage';
    this.rageReason = reason;
    if (this.grabbed) {
      const p = g.player;
      this.grabbed = false;
      p.releaseGrab && p.releaseGrab(4, Math.sin(e.yaw), Math.cos(e.yaw), 0);
    }
    this.atk = null;
    this.ev = null;
    this.releaseAll();
    this.T.yaw = this.T.bend = this.T.twist = this.T.shx = this.T.shz = 0;
    // si estaba dentro de un muro, sale ya
    if (this.burrow && this.burrow.stage === 'inside') this.burrowOut();
    this.burrow = null;
    this.hidden = false;
    e.obj.visible = true;
    e.data.air = !!this.air;
    this.inFight = true;
    this.engageT = 0;
    this.ri = { stage: 'come', t: 0 };
    this.setMode('rageIntro');
    this.lastEngaged = g.time;
    g.hunt && g.hunt.onRage && g.hunt.onRage(reason);
  },
  rageIntro(dt) {
    const e = this.e,
      g = this.g,
      p = g.player;
    const R = this.ri;
    R.t += dt;
    if (this.plane === 'ceil' && !this.air) this.jump('floor', 0.35, { arc: 0 });
    if (this.air) return this.stop(dt, 3);
    this.lookAtPlayer(1);
    if (R.stage === 'come') {
      // viene a por ti (a la vista, a unos metros)
      const d = this.dist;
      if ((d < 10 && d > 3.5 && this.los) || R.t > 5) {
        R.stage = 'roar';
        R.t = 0;
        this.stop(dt, 20);
        return;
      }
      if (d <= 3.5) this.moveTo(e.pos.x + (e.pos.x - p.pos.x), e.pos.z + (e.pos.z - p.pos.z), 4, dt, false);
      else this.moveTo(p.pos.x, p.pos.z, 6.8, dt);
      this.faceTo(p.pos.x, p.pos.z, 6, dt);
      return;
    }
    // se alza, grita y golpea el suelo; los ojos se le ponen rojos
    const t = R.t;
    this.stop(dt, 12);
    this.faceTo(p.pos.x, p.pos.z, 4, dt);
    const up = seg(t, 0, 0.5) * (1 - seg(t, 2.3, 2.8));
    this.rear = up;
    this.T.h = lerp(1, 1.9, up);
    this.T.bend = -0.35 * up;
    this.jawT = up;
    this.shake = up;
    if (!R.scream && t > 0.45) {
      R.scream = true;
      g.audio && g.audio.play('rageScream', this.center);
      g.camRig.shake(0.7);
      g.input && g.input.rumble && g.input.rumble(1, 0.9, 600);
      g.flash = Math.max(g.flash || 0, 0.3);
      e.flare = 1;
      // el farol tiembla
      this.lampShake = 1.2;
    }
    if (this.lampShake > 0) {
      this.lampShake -= dt;
      p.lampK = 0.55 + 0.45 * Math.abs(Math.sin(t * 31));
      if (this.lampShake <= 0) p.lampK = 1;
    }
    // las manos: arriba, y golpes alternos contra el suelo
    for (const L of [this.L[0], this.L[1]]) {
      if (t < 0.6 || t > 2.3) {
        this.localPointYaw(L.side * 0.7, lerp(0.2, 3.1, up), lerp(1.3, 0.5, up), _a);
        this.hold(L, _a.x, _a.y, _a.z, 1, 1);
      } else {
        const ph = (t * 3.2 + (L.side > 0 ? 0 : 0.5)) % 1;
        const lift = ph < 0.55 ? Math.sin((ph / 0.55) * Math.PI) : 0;
        this.localPointYaw(L.side * 0.8, 0.04 + lift * 1.6, 1.8, _a);
        this.hold(L, _a.x, _a.y, _a.z, 1, 1);
        const key = 'r' + L.side + Math.floor(t * 3.2 + (L.side > 0 ? 0 : 0.5));
        if (ph > 0.55 && !R[key]) {
          R[key] = true;
          g.audio && g.audio.play('slamSoft', _a, { k: 0.8 });
          g.fx.blood.emit(_a.x, _a.y, _a.z, 6, { color: [0.3, 0.28, 0.26], speed: 2, life: 0.5, up: 0.6 });
          g.camRig.shake(0.12);
        }
      }
    }
    if (t > 2.8) {
      this.rear = 0;
      this.T.bend = 0;
      this.shake = 0;
      this.lampShake = 0;
      p.lampK = 1;
      this.releaseAll();
      this.cool = 0.4;
      this.engage();
    }
  },

  // Te espera a lo ancho: se aparta hasta un sitio despejado y golpea el
  // suelo, se ríe o te tira huesos. Si no vienes, entra a por ti.
  lure(dt) {
    const e = this.e,
      g = this.g,
      p = g.player;
    const S = this.lureTo;
    if (!S) return this.engage();
    this.lookAtPlayer(1);
    const d = this.dist;
    const po = this.openAt(p.pos.x, p.pos.z);
    // has salido a lo ancho (o te le acercas): pelea
    if ((po > 2.8 && d < 9) || d < 3.2) {
      this.lureTo = null;
      this.lureCD = 10;
      return this.engage();
    }
    if (this.mT > 9) {
      this.lureTo = null;
      this.lureCD = 14;
      return this.engage();
    }
    const ds = Math.hypot(S.x - e.pos.x, S.z - e.pos.z);
    if (ds > 1.2 && !S.there) this.moveTo(S.x, S.z, 5.5, dt);
    else {
      S.there = true;
      this.stop(dt, 8);
      this.faceTo(p.pos.x, p.pos.z, 5, dt);
      this.lureTauntT = (this.lureTauntT ?? 0.4) - dt;
      if (this.lureTauntT <= 0) {
        this.lureTauntT = rnd(2.5, 3.5);
        const r = Math.random();
        if (r < 0.4) this.startTaunt('beat');
        else if (r < 0.65) this.startTaunt('laugh');
        else if (r < 0.8) this.startTaunt('headspin');
        else if (this.los && d > 5) this.startAttack('throw');
      }
    }
  },

  // ------------------------------------------------------------------ sitios
  // Metros despejados alrededor de (x, z) (hasta el obstáculo más cercano).
  openAt(x, z) {
    const nav = this.g.navCellar;
    if (!this.open || this.g.time - this.openT > 8) this.buildOpen();
    const i = nav.ci(x),
      j = nav.cj(z);
    if (i < 0 || j < 0 || i >= nav.w || j >= nav.h) return 0;
    return this.open[j * nav.w + i];
  },
  buildOpen() {
    const nav = this.g.navCellar;
    const W = nav.w,
      H = nav.h;
    const D = this.open && this.open.length === W * H ? this.open : new Float32Array(W * H);
    // transformada de distancia (dos pasadas, métrica de chaflán)
    const INF = 1e6;
    for (let k = 0; k < W * H; k++) D[k] = nav.cells[k] === 1 ? INF : 0;
    const c1 = nav.res,
      c2 = nav.res * 1.414;
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        const k = j * W + i;
        if (!D[k]) continue;
        let v = D[k];
        if (i > 0) v = Math.min(v, D[k - 1] + c1);
        if (j > 0) {
          v = Math.min(v, D[k - W] + c1);
          if (i > 0) v = Math.min(v, D[k - W - 1] + c2);
          if (i < W - 1) v = Math.min(v, D[k - W + 1] + c2);
        }
        D[k] = v;
      }
    for (let j = H - 1; j >= 0; j--)
      for (let i = W - 1; i >= 0; i--) {
        const k = j * W + i;
        if (!D[k]) continue;
        let v = D[k];
        if (i < W - 1) v = Math.min(v, D[k + 1] + c1);
        if (j < H - 1) {
          v = Math.min(v, D[k + W] + c1);
          if (i < W - 1) v = Math.min(v, D[k + W + 1] + c2);
          if (i > 0) v = Math.min(v, D[k + W - 1] + c2);
        }
        D[k] = v;
      }
    this.open = D;
    this.openT = this.g.time;
  },
  // Un sitio despejado cerca de los dos (el suyo, no el tuyo).
  findOpenSpot() {
    const e = this.e,
      p = this.g.player.pos;
    let best = null,
      bs = -1e9;
    for (const S of CELLAR.open) {
      const dp = Math.hypot(S.x - p.x, S.z - p.z);
      const de = Math.hypot(S.x - e.pos.x, S.z - e.pos.z);
      if (dp > 20 || dp < 4) continue;
      const s = -dp * 0.6 - de * 0.4 + S.r;
      if (s > bs) {
        bs = s;
        best = S;
      }
    }
    if (best) return { x: best.x + rnd(-1, 1), z: best.z + rnd(-1, 1) };
    // si no, el sitio más ancho a su alrededor
    const nav = this.g.navCellar;
    let bo = 0;
    for (let k = 0; k < 40; k++) {
      const a = Math.random() * Math.PI * 2,
        r = rnd(3, 10);
      const x = e.pos.x + Math.cos(a) * r,
        z = e.pos.z + Math.sin(a) * r;
      if (!nav.walkable(x, z)) continue;
      const o = this.openAt(x, z);
      if (o > bo && o > 2.8) {
        bo = o;
        best = { x, z };
      }
    }
    return best;
  },

  // ------------------------------------------------------------------ oído
  // Una palanca (o cualquier ruido fuerte): va hacia allí con hambre.
  onNoise(x, z, k = 1) {
    this.noise = { x, z, t: this.g.time };
    if (this.stage !== 'stalk') return;
    this.hunger = Math.min(1.6, this.hunger + 0.35 * k);
    const M = this.mode;
    if (M === 'stalk' || M === 'perch' || M === 'peek') {
      this.perch = null;
      this.setMode('stalk');
      if (this.dist < 18) this.startHunt();
    }
  },

  // ------------------------------------------------------------------ aprende
  observe(kind, info = {}) {
    const g = this.g,
      p = g.player,
      e = this.e;
    const t = g.time;
    if (e.dead) return;
    const tok = kind === 'attack' ? (info.heavy ? 'H' : info.run ? 'S' : 'L') : kind === 'roll' ? 'D' : kind === 'block' ? 'B' : kind === 'heal' ? 'F' : null;
    if (!tok) return;
    this.learn.token(tok, t, this.dist);
    // hacia dónde ruedas cuando te ataca
    if (kind === 'roll' && this.atkWin && (!this.atkWin.end || t - this.atkWin.end < 0.3)) {
      const ux = (p.pos.x - e.pos.x) / (this.dist || 1),
        uz = (p.pos.z - e.pos.z) / (this.dist || 1);
      const along = info.x * ux + info.z * uz;
      const lat = info.x * Math.cos(e.yaw) - info.z * Math.sin(e.yaw);
      const dir = info.back || along > 0.5 ? 'b' : along < -0.5 ? 'f' : lat > 0 ? 'l' : 'r';
      this.learn.addDodge(this.atkWin.name, dir);
      this.learn.addDodge('_all', dir);
    }
    if (this.stage !== 'rage') return;
    if (kind === 'attack') this.react(info);
  },
  // Vas a golpear: ¿lo ve venir?
  react(info) {
    const g = this.g;
    const M = this.mode;
    // (también al final de su propio golpe: corta la recuperación)
    const recovering = M === 'attack' && this.atk && !this.grabbed && this.atkT > this.atk.dur * 0.62 && this.atk.name !== 'charge';
    if (!(M === 'fight' || M === 'lure' || M === 'taunt' || recovering)) return;
    if (this.air || this.plane !== 'floor') return;
    if (g.time - this.lastReact < 0.5) return;
    const def = info.def || {};
    const d = this.dist;
    const reach = (def.range ?? 2.4) + (def.lunge ? def.lunge[2] * 0.3 : 0.8) + 0.6;
    if (d > reach + 0.8) return;
    this.skill = clamp(0.3 + this.learn.n / 30, 0.3, 0.82) + (this.frenzy ? 0.08 : 0);
    if (Math.random() > this.skill) return;
    this.lastReact = g.time;
    if (recovering) {
      this.atk.chained = true;
      this.endAttack();
    }
    const left = this.learn.comboLeft(this.learn.cur);
    let ok = false;
    if (info.heavy) ok = this.startEvade('side', 'counter');
    else if (this.learn.cur >= 1 && left >= 0.8 && Math.random() < 0.6) {
      // conoce tu combo: para lo que queda y contraataca
      this.startGuard(0.35 + left * 0.42, Math.max(1, Math.round(left + (this.learn.cur === 1 ? 1 : 0))));
      ok = true;
    } else ok = this.startEvade(d < 2.2 || Math.random() < 0.4 ? 'flip' : 'leap', 'counter');
    if (ok) this.readFx();
  },
  // Adonde crees que vas a esquivar su 'atk' (desplazamiento en el mundo).
  predictDodge(atk) {
    if (this.stage !== 'rage') return null;
    const dir = this.learn.dodgeGuess(atk);
    if (!dir || Math.random() > this.skill) return null;
    const e = this.e,
      p = this.g.player;
    const ux = (p.pos.x - e.pos.x) / (this.dist || 1),
      uz = (p.pos.z - e.pos.z) / (this.dist || 1);
    const L = 2.4;
    if (dir === 'b') return { x: ux * L, z: uz * L };
    if (dir === 'f') return { x: -ux * L * 0.6, z: -uz * L * 0.6 };
    const s = dir === 'l' ? 1 : -1;
    const c = Math.cos(e.yaw),
      sn = Math.sin(e.yaw);
    return { x: s * c * L, z: -s * sn * L };
  },

  // ------------------------------------------------------------------ golpes
  // Antes de que Enemy.takeHit aplique el golpe: guardia, furia (la mitad
  // de daño) o tirado en el suelo (más daño).
  preHit(dmg, poise, fromX, fromZ, heavy) {
    this.lastFrom = [fromX, fromZ];
    const e = this.e;
    if (this.mode === 'guard') {
      const ang = Math.abs(angleDiff(e.yaw, Math.atan2(fromX - e.pos.x, fromZ - e.pos.z)));
      if (ang < 100 * DEG) {
        this.blockFx(fromX, fromZ);
        return 'blocked';
      }
    }
    let k = 1,
      pk = 1;
    if (this.mode === 'down') k *= 1.35;
    if (this.stage === 'rage') {
      k *= 0.5;
      pk *= 0.55;
    }
    // al alzarse y gritar no se le interrumpe
    if (this.mode === 'rageIntro') pk = 0;
    return { dmg: Math.max(1, Math.round(dmg * k)), poise: poise * pk };
  },
  onHit(r, dmg, heavy) {
    const e = this.e,
      g = this.g;
    this.engageDmg += dmg || 0;
    this.burst += dmg || 0;
    this.lastEngaged = g.time;
    this.lastHurtT = g.time;
    if (r !== 'kill' && this.lastFrom) this.flinch(this.lastFrom[0], this.lastFrom[1], heavy);
    // le has alcanzado mientras acechaba: se revuelve
    const M = this.mode;
    if (this.stage === 'stalk' && (M === 'stalk' || M === 'perch' || M === 'peek' || M === 'hunt' || M === 'retreat')) {
      if (r !== 'kill') this.hunger = 1;
      this.frust += 0.4;
      if (e.state !== 'hurt' && e.state !== 'stagger') this.engage();
    }
    // enloquecido: una ráfaga de golpes le hace apartarse de un salto
    if (this.stage === 'rage' && r === 'hit' && this.burst > e.maxHp * 0.06 && (M === 'fight' || M === 'hurt') && Math.random() < this.skill) {
      this.burst = 0;
      if (e.state === 'hurt' || e.state === 'stagger') e.state = 'hunt';
      this.startEvade(Math.random() < 0.5 ? 'flip' : 'side', 'counter');
    }
  },

  // ------------------------------------------------------------------ muerte
  // Grita, se le parten los miembros uno a uno, se desploma, patalea cada
  // vez más despacio y la cabeza, por fin, se le da la vuelta.
  dead(dt) {
    const e = this.e,
      g = this.g;
    const t = e.stT;
    this.stop(dt, 5);
    this.lookW = 0;
    this.chatter = 0;
    if (this.plane === 'ceil' && !this.air) this.jump('floor', 0.5, { arc: 0 });
    if (this.air) return;
    if (!this._death) {
      this._death = { snapped: [], fell: false, rattle: false };
      this.releaseAll();
      this.atk = null;
      if (this.grabbed) {
        const p = g.player;
        this.grabbed = false;
        p.releaseGrab && p.releaseGrab(3, Math.sin(e.yaw), Math.cos(e.yaw), 0);
      }
    }
    const Dd = this._death;
    // 0 - 0,9: se alza y grita
    const up = seg(t, 0, 0.5) * (1 - seg(t, 0.7, 1.6));
    this.rear = up * 0.9;
    this.shake = t < 3 ? 1 - seg(t, 2.4, 3) : Math.max(0, 0.6 * Math.exp(-(t - 3.2) * 0.7));
    this.jawT = t < 3 ? 1 : lerp(0.8, 0.15, seg(t, 3.5, 6.5));
    this.eyeT = t < 2.5 ? 1.4 : Math.max(0, 1.2 - (t - 2.5) * 0.4);
    // 0,9 - 2,4: los miembros se parten uno a uno
    const order = [1, 2, 0, 3];
    order.forEach((li, k) => {
      const at = 0.9 + k * 0.42;
      if (t > at && !Dd.snapped[li]) {
        Dd.snapped[li] = true;
        const L = this.L[li];
        this.planePoint(L.home.x * rnd(1.7, 2.1), L.home.z * rnd(1.4, 1.8), _a, false);
        this.hold(L, _a.x, _a.y + 0.05, _a.z, 1, rnd(0.2, 1));
        g.audio && g.audio.play('limbSnap', _a);
        this.rollS.kick(L.side * 2.5);
        this.hS.kick(-2);
      }
    });
    const nSn = Dd.snapped.filter(Boolean).length;
    this.T.h = t < 2.6 ? lerp(1, 0.55, nSn / 4) + up * 0.6 : lerp(0.55, 0.26, seg(t, 2.6, 3));
    this.T.roll = t < 2.6 ? (Dd.snapped[1] ? -0.2 : 0) + (Dd.snapped[0] ? 0.15 : 0) : lerp(-0.05, 0.35, seg(t, 2.6, 3.1));
    this.T.pitch = 0.1;
    // 2,6 - 3: se desploma
    if (t > 2.8 && !Dd.fell) {
      Dd.fell = true;
      g.audio && g.audio.play('bodyFall', this.center);
      g.camRig.shake(0.35);
      g.fx.blood.emit(this.center.x, this.center.y - 0.3, this.center.z, 24, { color: [0.3, 0.28, 0.26], speed: 3, life: 0.8, up: 1 });
    }
    if (t > 3.3 && !Dd.rattle) {
      Dd.rattle = true;
      g.audio && g.audio.play('deathRattle', this.center);
    }
    // 3 - 7: estertores cada vez más débiles; la cabeza se endereza
    if (t > 3) {
      const k = Math.exp(-(t - 3) * 0.55);
      for (const L of this.L) {
        if (Math.random() < dt * 3 * k) {
          this.planePoint(L.home.x * rnd(1.6, 2.1), L.home.z * rnd(1.3, 1.8), _a, false);
          this.hold(L, _a.x, _a.y + rnd(0, 0.6) * k, _a.z, 1, rnd(0, 1));
        }
      }
      this.twistT = Math.PI * seg(t, 3.6, 6.8);
      this.tiltT = 0;
    }
    if (t > 7.4) {
      e.sink += dt * 0.25;
      if (!e.data.dissolved) {
        e.data.dissolved = true;
        g.fx && g.fx.dissolve && g.fx.dissolve(e);
      }
    }
    if (t > 9.6) {
      e.obj.visible = false;
      e.shadow.visible = false;
    }
  },

  // -------------------------------------------------------------- burlas
  giggle(force = false) {
    const g = this.g;
    if (g.audio && (force || Math.random() < 0.8)) g.audio.play('giggle', { x: this.center.x, y: this.center.y, z: this.center.z });
  },
  taunts(dt) {
    const e = this.e,
      g = this.g,
      p = g.player.pos;
    if (!g.audio) return;
    const M = this.mode;
    if (M === 'fight' || M === 'attack' || M === 'evade' || M === 'guard' || M === 'down') return;
    this.tauntT -= dt;
    if (this.tauntT > 0) return;
    this.tauntT = rnd(7, 13);
    const r = Math.random();
    const P = { x: this.center.x, y: this.center.y, z: this.center.z };
    if (r < 0.2) g.audio.play('boneCrack', P, { n: 3, k: 0.8 });
    else if (r < 0.34) this.giggle();
    else if (r < 0.48) {
      // la voz del ama, desde otro sitio
      const far = CELLAR.perches.filter((q) => Math.hypot(q.x - p.x, q.z - p.z) > 10);
      const q = far[Math.floor(Math.random() * far.length)] || P;
      g.audio.play('amaCall', { x: q.x, y: e.pos.y + 1.5, z: q.z });
    } else if (r < 0.62 && this.behind && this.dist < 11) {
      // pasos que no son tuyos, detrás
      g.audio.play('mimicSteps', { x: lerp(p.x, e.pos.x, 0.5), y: p.y, z: lerp(p.z, e.pos.z, 0.5) });
    } else if (r < 0.78) {
      // algo corre por dentro de la pared, a tu lado
      const a = Math.random() * Math.PI * 2;
      for (let k = 3; k < 7; k++) {
        const x = p.x + Math.cos(a) * k,
          z = p.z + Math.sin(a) * k;
        if (!this.inCellar(x, z)) {
          g.audio.play('scuttle', { x, y: p.y + 2.4, z });
          break;
        }
      }
    } else if (r < 0.9 && this.los && this.dist > 6 && this.dist < 13 && !this.seen && this.plane === 'floor') {
      this.startAttack('throw');
    } else g.audio.play('whisperNear', { x: p.x + rnd(-3, 3), y: p.y + 1.6, z: p.z + rnd(-3, 3) });
  },
};
