// Un jugador de prueba para la pelea con el Físico: la misma cabeza en el
// simulador (fisico_sim.mjs) y en el motor de verdad (fisicobanco.mjs, que la
// carga en la página y la traduce a teclas).
//
// Ve al Físico con su retraso de persona (S.reac; más, ciego por la cal o en
// la nube); al verle empezar un golpe decide qué hará (rodar hacia su lado,
// desviar, cubrirse o nada) y cuándo (cuando calcula que llega, con su error y
// lo que se adelanta); si el golpe se va (un amago) o tarda más de la cuenta
// (retenido), lo ve o no, según su lectura. Castiga lo que deja abierto,
// guarda su distancia y le rodea, golpea en rachas, bebe cuando le toca (lejos
// o donde sea), huye herido si es de los que huyen, se sale del fuego y de la
// nube, se ocupa de los Coronados que tiene encima y, si se cansa de esperar,
// entra.
//
// Lo que ve (ve): { t, x, z, estado ('libre', 'ataca', 'herido', 'tambalea',
// 'deseq', 'guion', 'sedando', 'trepanando'), atk (el nombre del golpe), atkT
// (su reloj), serial, amago }. Lo que sabe de sí (yo): { x, z, hp, maxHp, st,
// flasks, estado ('libre', 'ataca', 'rueda', 'bebe', 'herido', 'cogido'...),
// combo, atkHeavy, atkRiposte, ciego, lento }. Lo que hay (mundo): { fuegos,
// nubes, coros } (con x, z; los Coronados, con hp). Lo que quiere (I): mx, mz
// (hacia dónde, en el mundo), spd, cubre, golpe ('ligero', 'fuerte'), accion
// ('rueda', 'desvia', 'bebe', 'gracia') con accionT, y rueda ([dx, dz, atrás]).
import { ATK, SALA } from './fisico_datos.mjs';
import { RETIENE } from '../src/game/fisico_mente.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const gauss = (r) => {
  let u = 0;
  while (u === 0) u = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
};

export class Bot {
  constructor(S, r) {
    this.S = S;
    this.r = r;
    this.visto = [];
    this.plan = null;
    this.serialVisto = 0;
    this.lado = r() < 0.5 ? 1 : -1;
    this.ladoT = 0;
    this.I = { mx: 0, mz: 0, spd: 0, golpe: null, cubre: false, accion: null, accionT: 0, rueda: null };
    this.huyeT = 0;
    this.calma = 0;
    this.paciencia = (1.5 + r() * 3) * (1.6 - S.agresion);
    this.racha = 1;
    this.tgt = null;
  }
  ve(s) {
    this.visto.push(s);
  }
  // lo que ve de él, con su retraso
  veo(t, yo) {
    const S = this.S;
    const V = this.visto;
    const reac = S.reac + (yo.ciego ? 0.25 : 0) + (yo.lento ? 0.08 : 0);
    const tv = t - reac;
    let o = V[0];
    for (let i = V.length - 1; i >= 0; i--)
      if (V[i].t <= tv) {
        o = V[i];
        break;
      }
    while (V.length > 2 && V[1].t < t - 1.5) V.shift();
    return o;
  }
  // hacia dónde rodar (su lado): [dx, dz, paso atrás]
  dirRueda(yo, sx, sz) {
    const r = this.r;
    const ux = sx - yo.x,
      uz = sz - yo.z;
    const m = Math.hypot(ux, uz) || 1;
    const fx = ux / m,
      fz = uz / m;
    const lx = fz,
      lz = -fx;
    const q = r();
    const L = this.S.lado;
    let dx,
      dz,
      back = false;
    if (q < L[0]) [dx, dz] = [lx + fx * 0.15, lz + fz * 0.15];
    else if (q < L[0] + L[1]) [dx, dz] = [-lx + fx * 0.15, -lz + fz * 0.15];
    else if (q < L[0] + L[1] + L[2]) {
      [dx, dz] = [-fx, -fz];
      back = r() < 0.3;
    } else [dx, dz] = [fx, fz];
    return [dx, dz, back];
  }
  // lo que hará ante un golpe suyo que ve venir
  planea(yo, o) {
    const S = this.S;
    const r = this.r;
    const a = ATK[o.atk];
    if (!a || a.name === 'campanilla' || a.name === 'sahumerio') return null;
    const d = Math.hypot(yo.x - o.x, yo.z - o.z);
    if (d > a.range + 1.4) return null;
    const ciego = yo.ciego ? 0.4 : 1;
    let pr = S.pRueda * ciego,
      pd = S.pDesvia * ciego,
      pc = S.pCubre * ciego;
    // (lo que no se desvía ni se para: a rodar)
    if (a.noParry) {
      pr = Math.min(0.95, pr + (pd + pc) * 0.8);
      pd = pc = 0;
    }
    // (sin aliento no se cubre nadie: el escudo se le cae; rueda, si sabe)
    if (yo.st < 35 && pc > 0) {
      pr += pc * 0.8;
      pc = 0;
    }
    const q = r();
    const tipo = q < pd ? 'desvia' : q < pd + pc ? 'cubre' : q < pd + pc + pr ? 'rueda' : null;
    if (!tipo) return null;
    const t0 = o.t - o.atkT;
    const lead = tipo === 'rueda' ? 0.17 : tipo === 'desvia' ? 0.08 : 0.35;
    const hits = a.hits.length ? a.hits.map((h) => h[0]) : a.ev;
    return { serial: o.serial, tipo, a, t0, hits, i: 0, tAct: t0 + hits[0] - lead + gauss(r) * S.sigma - S.bias, lead, cubreHasta: t0 + a.lastHit + 0.3 };
  }
  piensa(t, dt, yo, mundo) {
    const S = this.S;
    const r = this.r;
    const I = this.I;
    const o = this.veo(t, yo);
    if (!o) return I;
    const d = Math.hypot(yo.x - o.x, yo.z - o.z);
    // los suyos: si uno está encima y él lejos, a por él
    let tgt = null;
    for (const c of mundo.coros) if (c.hp > 0 && Math.hypot(c.x - yo.x, c.z - yo.z) < 2.2 && d > 3.5) tgt = c;
    this.tgt = tgt;
    // lo que ve venir (un amago también parece un golpe: se planea igual)
    if (o.estado === 'ataca' && o.serial !== this.serialVisto) {
      this.serialVisto = o.serial;
      this.plan = this.planea(yo, o);
    }
    const PL = this.plan;
    if (PL) {
      // ¿se ha ido el golpe (amago) o se ha retenido? (lo ve, si lee bien)
      const mismo = o.serial === PL.serial;
      if (t >= PL.tAct - 0.02) {
        if (mismo && o.estado !== 'ataca' && r() < S.lectura) this.plan = null;
        else if (mismo && o.estado === 'ataca' && o.atkT + (t - o.t) < PL.hits[PL.i] - PL.lead - 0.12 && r() < S.lectura) {
          // (va más despacio de lo que esperaba: espera a verlo llegar)
          PL.tAct = t + Math.max(0.05, (PL.hits[PL.i] - PL.lead - o.atkT) / RETIENE.paso - (t - o.t));
        } else {
          if (PL.tipo === 'rueda') {
            I.rueda = this.dirRueda(yo, o.x, o.z);
            I.accion = 'rueda';
            I.accionT = t;
          } else if (PL.tipo === 'desvia') {
            I.accion = 'desvia';
            I.accionT = t;
          }
          // (con varios tajos, al siguiente)
          PL.i++;
          if (PL.tipo === 'cubre' || PL.i >= PL.hits.length) {
            if (PL.tipo !== 'cubre') this.plan = null;
          } else PL.tAct = PL.t0 + PL.hits[PL.i] - PL.lead + gauss(r) * S.sigma - S.bias;
        }
      }
      if (this.plan && this.plan.tipo === 'cubre') {
        I.cubre = t >= this.plan.tAct && t < this.plan.cubreHasta;
        if (t >= this.plan.cubreHasta) {
          this.plan = null;
          I.cubre = false;
        }
      }
    } else I.cubre = false;
    // ------------------------------------------------ moverse, golpear, beber
    if (yo.estado === 'cogido') return I;
    const ux = (o.x - yo.x) / (d || 1),
      uz = (o.z - yo.z) / (d || 1);
    const lx = uz,
      lz = -ux;
    I.golpe = null;
    let mx = 0,
      mz = 0,
      spd = 3.6;
    // en el fuego o en la nube: fuera
    let fuera = null;
    for (const f of mundo.fuegos) if (Math.hypot(yo.x - f.x, yo.z - f.z) < 1.6) fuera = f;
    for (const n of mundo.nubes) if (Math.hypot(yo.x - n.x, yo.z - n.z) < 2.6 && r() < 0.6) fuera = fuera || n;
    const A = o.atk ? ATK[o.atk] : null;
    const vulnerable = (o.estado === 'ataca' && A && o.atkT > A.lastHit + 0.05 && A.dur - o.atkT > 0.3) || o.estado === 'herido' || o.estado === 'tambalea' || o.estado === 'deseq' || o.estado === 'guion' || o.estado === 'sedando';
    const hpK = yo.hp / yo.maxHp;
    // huir herido (el huidizo), y beber lejos
    if (S.huye && hpK < 0.4 && yo.flasks > 0) this.huyeT = Math.max(this.huyeT, 2.5);
    this.huyeT -= dt;
    if (this.huyeT > 0 && d < 6) {
      const sx = clamp(yo.x - ux * 3, SALA.x0 + 1, SALA.x1 - 1),
        sz = clamp(yo.z - uz * 3, SALA.z0 + 1, SALA.z1 - 1);
      let vx = sx - yo.x,
        vz = sz - yo.z;
      if (Math.hypot(vx, vz) < 0.5) {
        vx = lx * this.lado;
        vz = lz * this.lado;
      }
      const m = Math.hypot(vx, vz) || 1;
      mx = vx / m;
      mz = vz / m;
      spd = yo.st > 15 ? 6.7 : 3.6;
    } else if (hpK < S.curaHp && yo.flasks > 0 && yo.estado === 'libre' && (d > S.curaDist || vulnerable || S.curaDist === 0) && !(o.estado === 'ataca' && d < 4 && S.curaDist > 0)) {
      I.accion = 'bebe';
      I.accionT = t;
    } else if (fuera) {
      // (del fuego se sale soltando la guardia, a la carrera si hace falta)
      const vx = yo.x - fuera.x,
        vz = yo.z - fuera.z;
      const m = Math.hypot(vx, vz) || 1;
      mx = vx / m;
      mz = vz / m;
      if (fuera.t !== undefined || mundo.fuegos.includes(fuera)) {
        I.cubre = false;
        spd = yo.st > 20 ? 6.7 : 3.6;
      }
    } else if (tgt) {
      const cd = Math.hypot(tgt.x - yo.x, tgt.z - yo.z);
      if (cd > 2.0) {
        mx = (tgt.x - yo.x) / cd;
        mz = (tgt.z - yo.z) / cd;
      } else if (r() < S.agresion * 0.5) I.golpe = 'ligero';
    } else if (o.estado === 'deseq' && d < 2.6 && yo.estado === 'libre') {
      I.accion = 'gracia';
      I.accionT = t;
    } else if (vulnerable && r() < S.agresion) {
      if (d > 2.55) {
        mx = ux;
        mz = uz;
        spd = d > 4 ? 6.7 : 4.5;
      } else I.golpe = r() < S.pesado && (o.estado === 'tambalea' || o.estado === 'deseq' || o.estado === 'guion') ? 'fuerte' : 'ligero';
    } else if (this.calma > this.paciencia && yo.estado === 'libre') {
      // (se cansa de esperar: entra a golpear)
      if (d > 2.3) {
        mx = ux;
        mz = uz;
        spd = d > 4 ? 6.7 : 3.6;
      } else {
        I.golpe = 'ligero';
        this.calma = 0;
        this.paciencia = (1.5 + r() * 3) * (1.6 - S.agresion);
      }
    } else {
      // guardar la distancia y rodearle
      this.ladoT -= dt;
      if (this.ladoT <= 0) {
        this.ladoT = 1.5 + r() * 2.5;
        if (r() < 0.5) this.lado = -this.lado;
      }
      const quiere = hpK < S.curaHp && yo.flasks > 0 && S.curaDist > 0 ? S.curaDist + 1 : S.distancia;
      const e = clamp(d - quiere, -1, 1);
      mx = ux * e + lx * this.lado * 0.6;
      mz = uz * e + lz * this.lado * 0.6;
      const m = Math.hypot(mx, mz) || 1;
      mx /= m;
      mz /= m;
      spd = d > 6 ? 6.7 : 3.6;
      // (golpear a la vez que él no ataca: lo que se atreve)
      if (d < 2.5 && o.estado === 'libre' && r() < S.agresion * 0.9 * dt * 3) I.golpe = 'ligero';
    }
    // la racha: cuántos golpes, decidido al empezar
    if (I.golpe && yo.estado === 'libre') this.racha = r() < 0.6 ? S.combo : 1 + Math.floor(r() * S.combo);
    if (yo.estado === 'ataca' && !yo.atkHeavy && !yo.atkRiposte && yo.combo + 1 < (this.racha || 1) && !I.rueda) I.golpe = 'ligero';
    I.mx = mx;
    I.mz = mz;
    I.spd = spd;
    // (la calma: el tiempo sin golpear)
    if (yo.estado === 'ataca') this.calma = 0;
    else this.calma += dt;
    return I;
  }
}
