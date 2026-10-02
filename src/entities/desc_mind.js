// El Descoyuntado: la cabeza.
//
// Es su casa: siempre sabe dónde estás. Tiene dos maneras de cazarte.
//
// ACECHO. Se mueve por el techo y por sus grutas hasta puntos oscuros desde
// los que te observa; a ratos te sigue: va detrás de ti, por donde tú has
// pasado, a unos metros, casi siempre por la bóveda; si te vuelves, se queda
// quieto (a veces le ves los ojos un instante) y se aparta de tu vista, y se
// le oye respirar, crujir, dar tus mismos pasos. A veces se deja ver a lo
// lejos y se esfuma; se burla (huesos que crujen, pasos que no son tuyos, la voz del
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
// golpea el suelo, y ya no se esconde (y apenas trastabilla con tus golpes).
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
import { CELLAR, BURROW, cellarCeil } from '../world/level_cellar.js';
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
    this.noCol = false;
    this.narrow = 0;
    this.trail = [];
    this.trailT = 0;
    this.lastShadow = -20;
    this.pendingRage = null;
    this.lastSafe = null;
    this.unsafeT = 0;
    this.amb = null;
    this.lastAmbush = [];
    this.pinning = false;
    this.stillT = 0;
    this.scrX = 0;
    this.scrY = 0;
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
    this.setShade(1);
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
    this.scrX = _a.x;
    this.scrY = _a.y;
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
      else s += (vis ? -9 : 0) - front * 2.5 - Math.max(0, this.openAt(P.x, P.z) - 2.4) * 1.6;
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

  // ¿Se puede ir de (ax, az) a (bx, bz) en línea recta por suelo transitable
  // y llano, a su misma altura (sin escalones ni escalera por medio)?
  sameFloorLine(ax, az, bx, bz) {
    const nav = this.g.navCellar;
    const y = this.e.pos.y;
    if (!nav.walkable(bx, bz) || !nav.line(ax, az, bx, bz)) return false;
    const d = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.ceil(d / 0.3));
    for (let k = 0; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n,
        z = az + ((bz - az) * k) / n;
      const fy = nav.floorY(x, z);
      if (fy === null || Math.abs(fy - y) > 0.2) return false;
      if (Math.abs(this.g.world.col.groundHeight(x, z, 0.3, y + 0.5) - y) > 0.2) return false;
    }
    return true;
  },
  // Red de seguridad: si algo lo deja fuera de las salas (dentro de la roca)
  // o a otra altura, vuelve al último sitio bueno.
  keepSafe(dt) {
    const e = this.e,
      g = this.g;
    if (this.air || this.hidden || this.noCol || this.mode === 'scripted' || this.mode === 'lair' || e.dead) {
      this.unsafeT = 0;
      return;
    }
    const nav = g.navCellar;
    const i = nav.ci(e.pos.x),
      j = nav.cj(e.pos.z);
    const inGrid = i >= 0 && j >= 0 && i < nav.w && j < nav.h;
    const room = inGrid && nav.base[j * nav.w + i] === 1;
    const fy = room ? nav.floorY(e.pos.x, e.pos.z) : null;
    const good = room && fy !== null && Math.abs(e.pos.y - fy) < 0.7 && isFinite(e.pos.x) && isFinite(e.pos.y);
    if (good) {
      this.unsafeT = 0;
      if (nav.cells[j * nav.w + i] === 1) (this.lastSafe || (this.lastSafe = new THREE.Vector3())).copy(e.pos);
      return;
    }
    this.unsafeT += dt;
    if (this.unsafeT > (room ? 0.6 : 0.1) && this.lastSafe) {
      this.unsafeT = 0;
      e.pos.copy(this.lastSafe);
      e.vx = e.vz = 0;
      e.body.vy = 0;
      this.plane = 'floor';
      this.plantAll();
      this.path = null;
    }
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
    // (colgado a oscuras en la bóveda, metido en una gruta o cayendo de la
    // emboscada lleva su propia sombra)
    const ownShade = this.mode === 'burrow' || this.mode === 'ambush' || (this.atk && this.atk.name === 'drop');
    if (!ownShade && this._shade !== undefined && this._shade !== 1) this.setShade(1);
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
    // cuánto llevas sin moverte (si te paras, no se queda esperando)
    this.stillT = Math.hypot(p.vx, p.vz) < 0.6 && p.state !== 'attack' && p.state !== 'roll' ? this.stillT + dt : 0;
    // por dónde vas pasando (te sigue por tu rastro)
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = 0.35;
      const tr = this.trail;
      const last = tr[tr.length - 1];
      if (!last || Math.hypot(last.x - p.pos.x, last.z - p.pos.z) > 0.6) {
        tr.push({ x: p.pos.x, z: p.pos.z });
        if (tr.length > 48) tr.shift();
      }
    }
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
    this.eyeT = M === 'peek' || M === 'fight' || M === 'attack' || M === 'lair' || M === 'guard' || M === 'evade' || M === 'rageIntro' || M === 'lure' || M === 'taunt' || M === 'parried' ? 1.2 : M === 'perch' ? 0.35 : M === 'shadow' ? 0.12 : 0.25;
    this.creep = this.stage === 'stalk' && (M === 'stalk' || M === 'shadow' || (M === 'hunt' && !this.seen && this.dist < 12)) && this.plane === 'floor';
    this.scan = damp(this.scan, this.stage === 'stalk' && (M === 'stalk' || M === 'perch') && !this.seen ? 0.7 : 0, 2, dt);
    if (hunting && this.stage === 'stalk') {
      if (M === 'stalk' || M === 'perch' || M === 'peek' || M === 'shadow') this.hungerTick(dt);
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
      case 'shadow':
        this.shadow(dt);
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
      case 'ambush':
        this.ambushMode(dt);
        break;
      case 'parried':
        this.parriedMode(dt);
        break;
      case 'scripted':
        break;
    }
    // (al acecho en la bóveda, ni un ruido: le delataría)
    if (this.mode !== 'lair' && this.mode !== 'shadow' && this.mode !== 'ambush' && hunting && this.stage === 'stalk') this.taunts(dt);
    // compromiso (barra de vida, música): enloquecido, siempre
    const hot = this.stage === 'rage' || M === 'fight' || M === 'attack' || M === 'stun' || M === 'hurt' || M === 'down' || M === 'evade' || M === 'guard' || M === 'parried' || (M === 'hunt' && this.dist < 6);
    // patas arriba admite el golpe de gracia (y tras un parry que le rompe)
    e.parryT = this.mode === 'down' && !this.riposted && this.mT < this.downDur - 0.45 ? this.downDur - 0.45 - this.mT : 0;
    if (hot) this.lastEngaged = g.time;
    this.engaged = g.time - this.lastEngaged < 5;
    // física
    this.lastMoved = undefined;
    if (!this.air && !this.hidden && !this.noCol && this.mode !== 'scripted') {
      const bx = e.pos.x,
        bz = e.pos.z;
      moveBody(g.world.col, e.body, e.vx * dt, e.vz * dt, dt);
      this.lastMoved = Math.hypot(e.pos.x - bx, e.pos.z - bz);
      // a la carrera, lo de madera o de saco que se le cruza lo arrasa
      const sp = Math.hypot(e.vx, e.vz);
      if (sp > 3.8 && this.plane === 'floor' && this.lastMoved < sp * dt * 0.6 && g.breakables) {
        const br = g.breakables.contact(e.pos.x, e.pos.z, e.body.radius + 0.3, e.vx / sp, e.vz / sp, e.pos.y);
        if (br && br.light) {
          g.breakables.shatter(br, e.pos);
          g.camRig.shake(0.2);
        }
      }
      // no atravesar al jugador (salvo desde el techo)
      if (this.plane === 'floor' && !p.dead && !(this.atk && this.atk.name === 'grab' && this.grabbed) && !this.pinning) {
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
    this.keepSafe(dt);
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
    // (mientras te sigue, se entretiene: el hambre le crece más despacio)
    else this.hunger += dt * (0.055 + this.vuln() * 0.06 + (this.behind ? 0.03 : 0)) * (this.mode === 'shadow' ? 0.35 : 1);
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
      this.perchDur = rnd(3, 4.5);
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
      // a ratos, te sigue (si vas de un sitio a otro)
      const p = this.g.player;
      if (this.g.time - this.lastShadow > 28 && this.dist > 6 && this.dist < 30 && Math.hypot(p.vx, p.vz) > 0.8 && this.trail.length > 6 && Math.random() < 0.55) return this.startShadow();
      // hacia donde sonó algo (una palanca), o de vez en cuando se deja
      // ver; otras, se cuela por los muros
      if (this.noise && this.g.time - this.noise.t < 12) {
        const P = this.choosePerch('hide', this.noise);
        if (P) this.perch = P;
        this.noise = null;
      }
      // o se adelanta a un puesto de la bóveda por donde vas a pasar
      if (!this.perch && Math.random() < 0.5) {
        const A = this.chooseAmbush();
        if (A) return this.startAmbush(A);
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
      this.perchDur = this.peeking ? 4 : rnd(2, 3.5);
    }
    if (this.mT > 12) this.perch = null;
  },

  // ----- te sigue
  startShadow() {
    this.setMode('shadow');
    this.shadowDur = rnd(14, 22);
    this.shadowSnd = rnd(2.5, 4.5);
    this.lastShadow = this.g.time;
    this.hunger = Math.min(this.hunger, 0.5);
    this.shy = 0;
    this.glintT = 0;
    this.perch = null;
  },
  // El punto de tu rastro que queda 'want' metros por detrás de ti.
  trailPoint(want) {
    const tr = this.trail;
    const p = this.g.player.pos;
    let acc = 0,
      px = p.x,
      pz = p.z;
    for (let i = tr.length - 1; i >= 0; i--) {
      const q = tr[i];
      acc += Math.hypot(q.x - px, q.z - pz);
      px = q.x;
      pz = q.z;
      if (acc >= want) return q;
    }
    return tr[0] || null;
  },
  shadow(dt) {
    const e = this.e,
      g = this.g,
      p = g.player;
    const d = this.dist;
    const psp = Math.hypot(p.vx, p.vz);
    // por la bóveda si cabe (ahí arriba casi no se le ve); si no, agazapado
    const hh = this.ceilAt(e.pos.x, e.pos.z) - e.pos.y;
    const want = this.plane === 'ceil' ? (hh > 2.9 ? 'ceil' : 'floor') : hh > 3.4 && g.time - this.planeT > 1.5 ? 'ceil' : 'floor';
    if (!this.toPlane(want) && this.air) return this.stop(dt, 4);
    // te has parado: no se queda a esperar a que sigas. Sin que le veas, o
    // se te acerca por la bóveda para caerte encima, o se adelanta a un
    // puesto de emboscada por donde irás
    if (this.stillT > 3 && !this.seen && this.mT > 3) {
      if (this.hunger > 0.3 && this.ceilAt(p.pos.x, p.pos.z) - p.pos.y > 3.6) return this.startHunt();
      const A = this.chooseAmbush();
      if (A) return this.startAmbush(A);
      this.perch = null;
      return this.setMode('stalk');
    }
    // te acercas a él: o se te echa encima o se escabulle
    if (d < 6.5 && this.closing > 1.3 && this.seen) {
      if (this.hunger > 0.55) return this.engage();
      this.giggle();
      const b = this.chooseBurrow(true);
      if (b && Math.random() < 0.5) {
        this.burrow = { ...b, t: 0, stage: 'go' };
        return this.setMode('burrow');
      }
      this.retreatTo = this.choosePerch('far');
      return this.setMode('retreat');
    }
    // le ves: se queda quieto; un instante le brillan los ojos; luego se
    // aparta de tu vista, despacio
    if (this.seen && d < 16) {
      this.shy += dt;
      if (this.shy < 0.9) {
        this.stop(dt, 16);
        this.lookAtPlayer(1);
        if (this.shy < 0.5 && this.glintT <= 0) {
          this.glintT = 0.55;
          if (Math.random() < 0.5) g.audio && g.audio.play('breathClose', this.center);
        }
      } else {
        // hacia atrás por tu propio rastro, fuera de tu vista
        const q = this.trailPoint(Math.min(22, d + 5)) || this.choosePerch('hide');
        if (q) this.moveTo(q.x, q.z, 2.4, dt, false);
        this.faceTo(p.pos.x, p.pos.z, 3, dt);
        if (this.shy > 3.5) {
          this.shy = 0;
          this.retreatTo = this.choosePerch('far');
          this.giggle();
          return this.setMode('retreat');
        }
      }
    } else {
      this.shy = Math.max(0, this.shy - dt * 0.7);
      // detrás de ti, por donde has pasado, a unos nueve metros
      const q = this.trailPoint(this.plane === 'ceil' ? 8 : 10);
      if (q) {
        const dq = Math.hypot(q.x - e.pos.x, q.z - e.pos.z);
        const sp = clamp(psp + (d - 9) * 0.7 + (dq > 6 ? 2 : 0), 0, this.plane === 'ceil' ? 5.6 : 4.6);
        if (dq > 0.6 && sp > 0.15) this.moveTo(q.x, q.z, sp, dt);
        else this.stop(dt, 6);
      } else this.stop(dt, 6);
      this.lookAtPlayer(0.8);
    }
    this.glintT -= dt;
    if (this.glintT > 0) this.eyeT = 1.6;
    // se le oye: respira, cruje, da tus mismos pasos, cosas que caen del techo
    this.shadowSnd -= dt;
    if (this.shadowSnd <= 0 && g.audio) {
      this.shadowSnd = rnd(3.5, 7);
      const r = Math.random();
      const C = this.center;
      if (r < 0.3 && d < 12) g.audio.play('breathClose', C);
      else if (r < 0.55 && psp > 0.8) g.audio.play('mimicSteps', { x: lerp(p.pos.x, e.pos.x, 0.6), y: p.pos.y, z: lerp(p.pos.z, e.pos.z, 0.6) });
      else if (r < 0.75) g.audio.play('boneCrack', C, { n: 2, k: 0.6 });
      else if (this.plane === 'ceil') {
        g.audio.play('scuttle', C, { k: 0.7 });
        g.fx.blood.emit(C.x, this.ceilAt(C.x, C.z) - 0.1, C.z, 4, { color: [0.3, 0.28, 0.26], speed: 0.3, life: 1.6, up: -0.3, gravity: 5 });
      } else g.audio.play('whisperNear', { x: p.pos.x + rnd(-2, 2), y: p.pos.y + 1.6, z: p.pos.z + rnd(-2, 2) });
    }
    if (this.mT > this.shadowDur) {
      this.perch = null;
      // (a veces, al final, se te echa encima por la espalda)
      if (this.hunger > 0.75 && !this.seen) return this.startHunt();
      this.setMode('stalk');
    }
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

  // Por dentro de la roca: va hasta la boca de una de sus grutas, la husmea,
  // mete las manos, se encoge y entra gateando hasta perderse en lo oscuro;
  // se le oye escarbar y correr por dentro, y sale por la otra boca: primero
  // los ojos, en lo negro del túnel, y luego él, a rastras, hasta erguirse.
  burrowMode(dt) {
    const e = this.e,
      g = this.g;
    const B = this.burrow;
    if (!B) return this.setMode('stalk');
    B.t += dt;
    const A = B.A,
      O = B.B;
    if (B.stage === 'go') {
      if (!this.toPlane('floor') && this.air) return;
      const d = this.moveTo(A.fx, A.fz, this.seen ? 5.6 : 4.8, dt);
      if (d < 0.55 || (B.t > 7 && d < 2.2)) {
        B.stage = 'enter';
        B.t = 0;
        this.stop(dt, 20);
      } else if (B.t > 10) {
        this.burrow = null;
        return this.setMode('stalk');
      }
      return;
    }
    if (B.stage === 'enter') {
      const t = B.t;
      const inYaw = Math.atan2(-A.nx, -A.nz);
      // 1) se planta delante, gira hacia la boca y husmea
      if (t < 0.6) {
        this.stop(dt, 14);
        this.faceTo(A.x, A.z, 7, dt);
        this.T.h = lerp(1, 0.55, seg(t, 0, 0.55));
        this.T.pitch = 0.2 * seg(t, 0, 0.5);
        this.lookP.set(A.ix, A.y + 0.6, A.iz);
        this.lookW = 1;
        this.tiltT = Math.sin(t * 9) * 0.4;
        return;
      }
      // 2) mete las manos en la boca, agarrándose a los bordes
      const tx = -A.nz,
        tz = A.nx;
      if (t < 1.05) {
        e.yaw = inYaw;
        this.stop(dt, 14);
        const u = seg(t, 0.6, 1.0);
        for (const L of [this.L[0], this.L[1]]) {
          // (mirando hacia dentro, su izquierda queda hacia +t)
          const s = L.side;
          this.hold(L, A.x + tx * s * 0.72 - A.nx * 0.35 * u, A.y + 0.15 + 0.55 * Math.sin(Math.PI * u), A.z + tz * s * 0.72 - A.nz * 0.35 * u, u, 1);
        }
        this.T.shz = 0.3 * u;
        this.narrow = 0;
        if (!B.dug) {
          B.dug = true;
          g.audio && g.audio.play('dig', { x: A.x, y: A.y + 0.8, z: A.z });
        }
        return;
      }
      // 3) entra a rastras, de un tirón, como una lagartija: el cuerpo se
      // estrecha, se ennegrece en lo oscuro del túnel y sólo le quedan los
      // ojos, que se apagan (antes se arrastraba despacio, a la vista, y
      // desaparecía de golpe unos segundos después)
      if (!B.crawl) {
        B.crawl = true;
        B.crawlT = 0;
        this.releaseAll();
        this.noCol = true;
        e.data.air = true; // (no se le puede golpear a medio meter)
        g.audio && g.audio.play('scuttle', { x: A.x, y: A.y + 0.8, z: A.z });
      }
      B.crawlT += dt;
      e.yaw = inYaw;
      const sp = lerp(2.4, 4.6, seg(B.crawlT, 0, 0.3));
      e.vx = -A.nx * sp;
      e.vz = -A.nz * sp;
      e.pos.x += e.vx * dt;
      e.pos.z += e.vz * dt;
      const depth = (e.pos.x - A.x) * -A.nx + (e.pos.z - A.z) * -A.nz;
      this.narrow = clamp((depth + 1.4) / 1.6, 0, 1);
      this.T.h = lerp(0.62, 0.56, this.narrow);
      this.T.pitch = 0.1;
      this.T.shz = 0.15;
      this.lookW = 0;
      this.setShade(1 - seg(depth, -0.5, 1.0));
      this.eyeT = depth < 0.4 ? 0.9 : lerp(0.9, 0, seg(depth, 0.4, 1.4));
      if (Math.random() < dt * 6) g.fx.blood.emit(A.x, A.y + 1.4, A.z, 3, { color: [0.3, 0.26, 0.2], speed: 0.6, life: 1, up: -0.2, gravity: 6 });
      if (depth >= 1.4) {
        B.stage = 'inside';
        B.t = 0;
        B.dur = 1.2 + Math.hypot(O.x - A.x, O.z - A.z) / 9;
        this.hidden = true;
        e.obj.visible = false;
        e.vx = e.vz = 0;
        B.snd = 0;
      }
      return;
    }
    if (B.stage === 'inside') {
      // se le oye dentro de la piedra, camino de la otra boca
      B.snd -= dt;
      if (B.snd <= 0) {
        B.snd = rnd(0.25, 0.45);
        const u = clamp(B.t / B.dur, 0, 1);
        g.audio && g.audio.play(Math.random() < 0.2 ? 'boneCrack' : Math.random() < 0.35 ? 'dig' : 'scuttle', { x: lerp(A.x, O.x, u), y: A.y + 1, z: lerp(A.z, O.z, u) }, { k: 0.6 });
      }
      if (B.t >= B.dur) this.burrowOut();
      return;
    }
    if (B.stage === 'out') {
      const t = B.t;
      // primero, sólo los ojos en lo negro del túnel
      if (t < 0.8) {
        this.stop(dt, 20);
        this.setShade(0);
        this.eyeT = 1.7;
        this.lookAtPlayer(1);
        if (Math.random() < dt * 8) g.fx.blood.emit(O.x, O.y + 1.4, O.z, 3, { color: [0.3, 0.26, 0.2], speed: 0.6, life: 1, up: -0.2, gravity: 6 });
        return;
      }
      // luego sale a rastras: de lo negro del túnel va apareciendo el cuerpo
      if (!B.crawl) {
        B.crawl = true;
        g.audio && g.audio.play('scuttle', { x: O.x, y: O.y + 0.8, z: O.z });
      }
      const sp = lerp(1.8, 3.0, seg(t, 0.8, 1.3));
      e.vx = O.nx * sp;
      e.vz = O.nz * sp;
      e.pos.x += e.vx * dt;
      e.pos.z += e.vz * dt;
      const depth = (e.pos.x - O.x) * -O.nx + (e.pos.z - O.z) * -O.nz;
      this.narrow = clamp((depth + 1.4) / 1.6, 0, 1);
      this.T.h = lerp(0.62, 0.56, this.narrow);
      this.setShade(1 - seg(depth, -0.5, 1.0));
      this.eyeT = 1.2;
      this.lookAtPlayer(0.7);
      const out = (e.pos.x - O.fx) * O.nx + (e.pos.z - O.fz) * O.nz;
      if (out >= 0) {
        // fuera: se yergue, crujiendo
        this.noCol = false;
        e.data.air = false;
        this.narrow = 0;
        e.vx = e.vz = 0;
        this.T.h = 1;
        this.T.pitch = 0;
        g.audio && g.audio.play('boneCrack', this.center, { n: 4, k: 0.8 });
        this.burrow = null;
        if (this.pendingRage) {
          const r = this.pendingRage;
          this.pendingRage = null;
          return this.startRage(r);
        }
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
    const O = B.B;
    B.stage = 'out';
    B.t = 0;
    B.crawl = false;
    e.pos.set(O.ix, this.groundAt(O.ix, O.iz), O.iz);
    e.yaw = Math.atan2(O.nx, O.nz);
    this.hidden = false;
    this.noCol = true;
    e.data.air = true;
    e.obj.visible = true;
    this.setShade(0);
    this.plane = 'floor';
    this.narrow = 1;
    this.T.h = 0.56;
    this.hS.x = 0.56;
    this.T.pitch = 0;
    this.pitchS.x = 0;
    this.plantAll();
    g.audio && g.audio.play('dig', { x: O.x, y: O.y + 0.8, z: O.z });
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
      // por el suelo, agazapado (y si algo le cierra el paso, lo revienta)
      if (this.clearWay(dt)) return;
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

  // ----- emboscada desde la bóveda
  // Un puesto (CELLAR.ambush: nada más pasar un arco o una puerta, o en
  // mitad de un pasillo) por delante de por donde vas, al que puede llegar
  // antes que tú y que no estás viendo.
  chooseAmbush(o = {}) {
    const g = this.g,
      p = g.player,
      e = this.e;
    const nav = g.navCellar;
    g.camera.getWorldDirection(_b);
    // hacia dónde vas (o hacia dónde miras, si estás parado)
    let hx = p.vx,
      hz = p.vz;
    if (Math.hypot(hx, hz) < 0.6) {
      hx = _b.x;
      hz = _b.z;
    }
    const hl = Math.hypot(hx, hz) || 1;
    hx /= hl;
    hz /= hl;
    let best = null,
      bs = -1e9;
    for (const A of CELLAR.ambush) {
      if (!nav.walkable(A.x, A.z)) continue;
      const dx = A.x - p.pos.x,
        dz = A.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < (o.min ?? 5) || d > (o.max ?? 22)) continue;
      const ahead = (dx * hx + dz * hz) / (d || 1);
      const de = Math.hypot(A.x - e.pos.x, A.z - e.pos.z);
      // tiene que poder llegar antes que tú
      if (!o.rage && de > d * 1.7 + 5) continue;
      let sc = ahead * 5 - Math.abs(d - (o.want ?? 11)) * 0.35 - de * 0.1 + Math.random() * 2.5;
      if (this.pointVisible(A.x, A.top - 1, A.z)) sc -= 7;
      if (A.kind === 'door') sc += 1;
      if (this.lastAmbush.includes(A)) sc -= 6;
      if (o.score) sc += o.score(A, d);
      if (sc > bs) {
        bs = sc;
        best = A;
      }
    }
    return best;
  },
  startAmbush(A, rage = false) {
    this.amb = { A, stage: 'go', t: 0, spotT: 0, dustT: rnd(1, 2), rage };
    this.lastAmbush.push(A);
    if (this.lastAmbush.length > 4) this.lastAmbush.shift();
    this.perch = null;
    this.setMode('ambush');
  },
  // Va hasta el puesto (por la bóveda si cabe), sube y se queda colgado,
  // quieto y a oscuras (los ojos cerrados; sólo su sombra en el suelo y algo
  // de polvo que cae le delatan). Si pasas por debajo sin mirar arriba (y
  // más si vas corriendo), te cae encima. Si le ves venir, se escabulle (o,
  // si ya estás casi debajo, cae igual, pero lo esperas). Enloquecido sólo
  // espera un momento y, si no sales, entra a por ti.
  ambushMode(dt) {
    const e = this.e,
      g = this.g,
      p = g.player;
    const B = this.amb;
    if (!B) return this.setMode(this.stage === 'rage' ? 'fight' : 'stalk');
    B.t += dt;
    const A = B.A;
    const rage = B.rage;
    const giveUp = (why) => {
      this.amb = null;
      if (rage || this.stage === 'rage') return this.engage();
      if (why === 'seen') {
        this.frust += 0.4;
        this.giggle();
        this.retreatTo = this.choosePerch('far') || this.choosePerch('hide');
        return this.setMode('retreat');
      }
      this.perch = null;
      this.setMode('stalk');
    };
    if (B.stage === 'go') {
      // por la bóveda si cabe (ahí arriba casi no se le ve); si no, agazapado
      const hh = this.ceilAt(e.pos.x, e.pos.z) - e.pos.y;
      const want = this.plane === 'ceil' ? (hh > 2.9 ? 'ceil' : 'floor') : hh > 3.4 && g.time - this.planeT > 0.8 ? 'ceil' : 'floor';
      if (!this.toPlane(want) && this.air) return this.stop(dt, 4);
      // si le ves de camino: se queda quieto y luego se escabulle (o, si
      // estás cerca y tiene hambre, se te echa encima)
      if (!rage && this.seen && this.dist < 12) {
        B.frz = (B.frz || 0) + dt;
        this.stop(dt, 14);
        this.lookAtPlayer(1);
        if (B.frz > 0.7) {
          if (this.dist < 6 && this.hunger > 0.45) {
            this.amb = null;
            return this.engage();
          }
          return giveUp('seen');
        }
        return;
      }
      B.frz = Math.max(0, (B.frz || 0) - dt);
      this.lookW = damp(this.lookW, 0.3, 2, dt);
      this.lookAtPlayer(this.lookW);
      const spd = this.plane === 'ceil' ? 6.4 : this.dist > 12 ? 6 : 4.2;
      const d = this.moveTo(A.x, A.z, spd, dt);
      if (d < 0.55) {
        if (this.plane !== 'ceil') {
          if (this.ceilAt(e.pos.x, e.pos.z) - e.pos.y < 3.1) return giveUp('low');
          this.toPlane('ceil');
          return;
        }
        B.stage = 'wait';
        B.t = 0;
        g.audio && g.audio.play('scuttle', this.center, { k: 0.35 });
      } else if (B.t > (rage ? 5 : 11)) return giveUp('late');
      return;
    }
    // ---- colgado, quieto, a oscuras
    this.stop(dt, 12);
    if (this.air) return;
    if (this.plane !== 'ceil') return giveUp('fell');
    this.setShade(damp(this._shade ?? 1, 0.42, 3, dt));
    this.eyeT = 0.04;
    this.T.h = 0.8;
    this.lookAtPlayer(0.7);
    // ¿le has visto? (algo en el borde de la pantalla un instante no
    // cuenta: tiene que estar a la vista, hacia el centro, un rato)
    const noticed = this.seen && Math.abs(this.scrX) < 0.62 && this.scrY < 0.8 && this.dist < 11;
    B.spotT = noticed ? B.spotT + dt : Math.max(0, B.spotT - dt * 0.5);
    // dónde vas a estar dentro de un momento (si pasas corriendo, antes)
    const lead = p.sprinting ? 0.45 : 0.3;
    const fx = p.pos.x + p.vx * lead,
      fz = p.pos.z + p.vz * lead;
    const dNow = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    const dNext = Math.hypot(fx - e.pos.x, fz - e.pos.z);
    const below = Math.abs(p.pos.y - e.pos.y) < 1.2 && !p.dead && p.state !== 'grabbed' && p.state !== 'pinned' && p.state !== 'getup';
    const reach = p.sprinting ? 1.9 : 1.5;
    if (below && (dNow < reach || dNext < 1.2) && B.spotT < 0.35) {
      this.amb = null;
      return this.startAttack('drop', { ambush: true, fast: rage });
    }
    if (B.spotT > (p.sprinting ? 0.6 : 0.42)) {
      // le has visto: si estás casi debajo, cae igual (pero ya lo esperas)
      if (below && dNow < 3.4) {
        this.amb = null;
        return this.startAttack('drop', { ambush: false, fast: rage });
      }
      return giveUp('seen');
    }
    // lo que le delata, si te fijas: polvo que cae de la bóveda y algún crujido
    if (dNow < 7) {
      B.dustT -= dt;
      if (B.dustT <= 0) {
        B.dustT = rnd(1.2, 2.6);
        const C = this.center;
        g.fx.blood.emit(C.x + rnd(-0.3, 0.3), this.ceilAt(C.x, C.z) - 0.15, C.z + rnd(-0.3, 0.3), 3, { color: [0.3, 0.28, 0.26], speed: 0.25, life: 1.6, up: -0.2, gravity: 5 });
        if (Math.random() < 0.35) g.audio && g.audio.play('boneCrack', C, { n: 1, k: 0.3 });
      }
    }
    // ¿vienes hacia aquí? (si no te acercas, no se queda esperando)
    if (B.best === undefined || dNow < B.best - 0.5) {
      B.best = dNow;
      B.closer = B.t;
    }
    // te has parado o no vienes: sin que le veas, va a por ti por la bóveda
    // para caerte encima; si no, a otra cosa (enloquecido, entra a por ti)
    if (!rage && !this.seen && (this.stillT > 3.5 || B.t - B.closer > 4.5) && B.t > 2) {
      this.amb = null;
      if (this.hunger > 0.3 || this.stillT > 3.5) return this.startHunt();
      this.perch = null;
      return this.setMode('stalk');
    }
    if (B.t > (rage ? 4.5 : 12) || this.dist > 26) return giveUp('late');
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
    // ¿te escondes tras algo, o algo le cierra el paso? lo revienta
    if (this.clearWay(dt, rage)) return;
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
  // Lo que se interpone: si te escudas tras un pilar, un sepulcro, un santo o
  // un tonel, o si quiere llegar hasta ti y algo le atasca, lo arranca o lo
  // revienta. true si ha empezado a hacerlo.
  clearWay(dt, rage = this.stage === 'rage') {
    const e = this.e,
      g = this.g,
      p = g.player;
    const B = g.breakables;
    if (!B || this.air || this.plane !== 'floor') return false;
    const d = this.dist;
    const sh = d < 8 ? B.between(e.pos.x, e.pos.z, p.pos.x, p.pos.z, e.pos.y) : null;
    if (sh && B.edgeDist(sh, p.pos.x, p.pos.z) < 2.8) this.shieldT += dt * (1 + this.ripCount * 0.6);
    else this.shieldT = Math.max(0, this.shieldT - dt * 0.5);
    // atascado: quiere acercarse y no avanza
    const blocked = d > 3.2 && this.closing < 0.35 && this.lastMoved !== undefined && this.lastMoved < 0.02 && Math.hypot(e.vx, e.vz) > 0.5;
    this.wedgeT = blocked ? (this.wedgeT || 0) + dt : Math.max(0, (this.wedgeT || 0) - dt);
    let target = null;
    if (sh && this.shieldT > (rage ? 0.6 : 0.9)) target = sh;
    else if (this.wedgeT > 1) {
      target = B.ahead(e.pos.x, e.pos.z, (p.pos.x - e.pos.x) / (d || 1), (p.pos.z - e.pos.z) / (d || 1), 2.6, e.pos.y);
      if (!target) {
        // nada que romper: otro camino
        this.wedgeT = 0;
        this.path = null;
      }
    }
    if (!target || this.cool > 0.4) return false;
    this.shieldT = 0;
    this.wedgeT = 0;
    if (target.kind === 'pillar') {
      this.ripTarget = target;
      this.startAttack('rip');
    } else {
      this.smashTarget = target;
      this.startAttack('smash');
    }
    return true;
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
    if (po < 2.1 && d > 2.5 && d < 11) this.lureT += dt;
    else this.lureT = Math.max(0, this.lureT - dt * 2);
    if (this.lureT > 1.6 && this.lureCD <= 0) {
      // en la bóveda de la salida, a lo ancho, para caerte encima al salir
      const A = this.chooseAmbush({ rage: true, min: 3, max: 12, want: 6, score: (S) => Math.min(3, this.openAt(S.x, S.z)) * 1.5 });
      if (A && this.openAt(A.x, A.z) > 2 && Math.random() < 0.7) {
        this.lureT = 0;
        this.lureCD = 9;
        this.startAmbush(A, true);
        return true;
      }
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
    // si ruedas mucho hacia los lados, barre; si te escudas, agarra o machaca;
    // si desvías sus golpes a menudo, prueba los que no se desvían
    const sideRoller = this.learn.dodge._all && this.learn.dodge._all.n > 2 && (this.learn.dodge._all.l + this.learn.dodge._all.r) / this.learn.dodge._all.n > 0.5;
    const parrier = Math.min(1, (this.learn.parries || 0) / 6);
    if (parrier > 0 && d < 3.1) {
      add('grab', 1.4 * parrier);
      if (rage) add('slam', 1.2 * parrier);
    }
    if (parrier > 0 && d >= 3 && d < 7) add('pounce', 1.0 * parrier);
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
  onPinStart() {
    // la emboscada le ha salido bien: se calma (y se sacia un rato)
    if (this.stage === 'stalk') this.frust = Math.max(0, this.frust - 0.4);
    this.hunger = 0.2;
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
    if (this.pendingRiposteRage && this.stage === 'stalk') {
      this.pendingRiposteRage = false;
      return this.startRage('hurt');
    }
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
      // (de vuelta a lo oscuro: si tiene un puesto por delante de ti, ahí)
      const A = this.chooseAmbush();
      if (A && Math.random() < 0.6) return this.startAmbush(A);
      this.setMode('perch');
      this.perchDur = rnd(2, 3.5);
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
    // metido en una gruta: termina de salir (o sale ya) y entonces enloquece
    if (this.mode === 'burrow' && this.burrow && this.burrow.stage !== 'go') {
      this.pendingRage = reason;
      if (this.burrow.stage === 'inside') this.burrowOut();
      else if (this.burrow.stage === 'enter') {
        // (da la vuelta y sale por donde ha entrado)
        const B = this.burrow;
        B.B = B.A;
        this.burrowOut();
      }
      return;
    }
    this.stage = 'rage';
    this.rageReason = reason;
    if (this.grabbed) {
      const p = g.player;
      this.grabbed = false;
      p.releaseGrab && p.releaseGrab(4, Math.sin(e.yaw), Math.cos(e.yaw), 0);
    }
    if (this.pinning) this.endPin(false, 0);
    this.amb = null;
    this.atk = null;
    this.ev = null;
    this.releaseAll();
    this.T.yaw = this.T.bend = this.T.twist = this.T.shx = this.T.shz = 0;
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
      else {
        if (this.clearWay(dt, true)) return;
        this.moveTo(p.pos.x, p.pos.z, 6.8, dt);
      }
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
    // has salido a lo ancho (o te le acercas, o te vas lejos): pelea
    if ((po > 2.8 && d < 9) || d < 3.2 || d > 16) {
      this.lureTo = null;
      this.lureCD = 10;
      return this.engage();
    }
    if (this.mT > 4.5) {
      this.lureTo = null;
      this.lureCD = 12;
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
    if (M === 'stalk' || M === 'perch' || M === 'peek' || M === 'shadow' || M === 'ambush') {
      this.perch = null;
      this.amb = null;
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
    const tok = kind === 'attack' ? (info.heavy ? 'H' : info.run ? 'S' : 'L') : kind === 'roll' ? 'D' : kind === 'block' || kind === 'parryTry' ? 'B' : kind === 'heal' ? 'F' : null;
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
    // (enloquecido aguanta más sin trastabillar, pero el daño es el mismo)
    if (this.stage === 'rage') pk *= 0.7;
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
    if (this.stage === 'stalk' && (M === 'stalk' || M === 'perch' || M === 'peek' || M === 'shadow' || M === 'hunt' || M === 'retreat' || M === 'ambush')) {
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
      if (this.pinning) this.endPin(false, 0);
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
