// El Cerco: cómo piensa el Rey (y, en las pruebas, también el otro bando).
//
// Búsqueda alfa-beta (negamax) con profundización iterativa, tabla de
// transposición, jugada asesina e historia para ordenar, y al final de cada
// rama una búsqueda de amenazas: si el rey tiene una línea libre hasta las
// afueras y mueven los de fuera, sólo pueden taparla (o atrapar al rey); si
// mueven los de dentro, el rey sale. Así se ven las horquillas (dos líneas a
// la vez no se tapan con una pieza), que es como se gana a este juego.
//
// La evaluación (desde los de fuera): el material, cuánto se mueve el rey y
// desde cuántas casillas abriría una línea (o dos) a las afueras, el trozo de
// tablero por el que podría escapar si sólo le cerraran el paso los de fuera
// (y si ya no le queda ninguno: el cerco cerrado) y cuántos de fuera le pegan.
//
// La fuerza se gradúa con la profundidad, el tiempo y un ruido determinista en
// la evaluación (el cansancio del Rey: ve peor, pero no regala lo evidente).
//
// Las amenazas, una detrás de otra: al final de cada rama, si mueven los de
// dentro, se miran también las jugadas que le abren una línea al rey (el rey
// que se asoma, o uno de los suyos que se aparta); los de fuera tienen que
// tapar, y vuelta a empezar, hasta que no quedan amenazas o sale la
// horquilla. Y en la búsqueda, cuando el rey está asomado, los de fuera sólo
// miran lo que tapa o se le arrima, sin gastar profundidad (como un jaque).
// Sin eso, el Rey no veía las horquillas que se preparan con dos o tres
// amenazas seguidas, que es como le gana una persona.
import { Cerco, SQ, THRONE, EMPTY, ATT, DEF, KING, RAYS, NB, isEdge, sideOf, MAX_PLY } from './rules.js';

export const WIN = 100000;
const INF = 1 << 30;
const MAXP = 128;
// lo que se alargan las ramas forzadas (el rey asomado) y cuántas amenazas
// seguidas de los de dentro se miran al final de cada rama
const EXT = 4,
  QDEF = 6;
// las dos direcciones de lado de cada una (0 arriba, 1 abajo, 2 izq., 3 der.)
const PERP = [
  [2, 3],
  [2, 3],
  [0, 1],
  [0, 1],
];
// pesos de la evaluación
const W = { att: 100, def: 180, mob: 3, t1def: 70, t1att: 28, t2def: 900, t2att: 240, edge: 9, closed: 420, small: 5, adjAtt: 34, adjDef: 9 };
const now = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();
const EXACT = 0,
  LOWER = 1,
  UPPER = 2;

export class Brain {
  constructor(bits = 18) {
    const n = 1 << bits;
    this.mask = n - 1;
    this.tKey = new Uint32Array(n);
    this.tMove = new Int32Array(n).fill(-1);
    this.tScore = new Int32Array(n);
    this.tDepth = new Int8Array(n).fill(-1);
    this.tFlag = new Int8Array(n);
    this.hist = new Int32Array(SQ * SQ);
    this.killers = new Int32Array(MAXP * 2).fill(-1);
    this.mbuf = [];
    this.sbuf = [];
    for (let i = 0; i < MAXP; i++) {
      this.mbuf.push(new Int32Array(256));
      this.sbuf.push(new Int32Array(256));
    }
    this.path = new Float64Array(MAX_PLY + MAXP + 8);
    // (para la evaluación: la cola del relleno y sus marcas)
    this.q = new Int8Array(SQ);
    this.mark = new Int32Array(SQ);
    this.stamp = 0;
    this.lbuf = [];
    for (let i = 0; i < MAXP; i++) this.lbuf.push([]);
  }

  // Piensa la jugada de 'state' (una Cerco o lo que devuelve save()).
  // opts: { depth: tope de profundidad, ms: tiempo, noise: ruido de la
  // evaluación (puntos), seed, jitter: ruido de la raíz (variedad) }
  think(state, opts = {}) {
    const g = (this.g = state instanceof Cerco ? state.clone() : new Cerco(state));
    const t0 = now();
    this.deadline = t0 + (opts.ms ?? 1000);
    // (o un tope de nodos: las pruebas, para que salga siempre lo mismo)
    this.maxNodes = opts.nodes ?? Infinity;
    this.noise = opts.noise ?? 0;
    this.seed = (opts.seed ?? 0x9e37) >>> 0;
    this.nodes = 0;
    this.stop = false;
    // (la tabla, limpia en cada jugada: lo que guardó otra búsqueda, con
    // otras repeticiones y otro cansancio, le hacía ver mal horquillas
    // que una búsqueda corta sí veía)
    this.tDepth.fill(-1);
    this.hist.fill(0);
    this.killers.fill(-1);
    // las posiciones de la partida (para no repetir)
    this.np = 0;
    for (const k of g.seen) this.path[this.np++] = k;
    this.np--; // (la última es la actual: no cuenta como repetida de sí misma)
    const root = g.moves();
    if (!root.length) return { move: -1, score: -WIN, depth: 0, nodes: 0, ms: 0 };
    // variedad: un poco de ruido en la raíz (sólo para ordenar y desempatar)
    const jit0 = opts.jitter ?? 0;
    const rj = new Map();
    let rs = this.seed ^ 0x51ed;
    for (const m of root) {
      rs = (Math.imul(rs ^ (rs >>> 15), 0x2c1b3c6d) + m) >>> 0;
      rj.set(m, jit0 ? (rs % (2 * jit0 + 1)) - jit0 : 0);
    }
    // (y la jugada que le gustaría hacer, si no es peor que la mejor en más
    // de opts.preferBonus: la de una partida que recuerda)
    const pb = root.includes(opts.prefer) ? (opts.preferBonus ?? 0) : 0;
    if (pb) rj.set(opts.prefer, rj.get(opts.prefer) + pb);
    const jit = jit0 + pb;
    let best = root[0],
      bestScore = -INF,
      done = 0;
    const maxD = opts.depth ?? 6;
    const scores = new Map();
    for (let d = 1; d <= maxD; d++) {
      // a: la mejor puntuación exacta de esta vuelta. Cada jugada se busca
      // con la ventana bajada en 'jit': así las que se quedan a menos de
      // eso de la mejor salen con su puntuación exacta y se puede elegir
      // entre ellas con la variedad; las demás sólo dicen «no es mejor»
      // (una cota), y ésas no se eligen nunca (antes, la variedad sumada a
      // una cota la volvía «la mejor»: así regalaba horquillas)
      let a = -INF,
        dBest = -1,
        dScore = -INF,
        dRaw = -INF;
      // la mejor de la vuelta anterior, primero
      const order = root.slice().sort((x, y) => (x === best ? -1 : y === best ? 1 : (scores.get(y) ?? -INF) - (scores.get(x) ?? -INF)));
      for (const m of order) {
        const u = g.make(m);
        let s;
        if (g.result) s = g.result.winner === sideOf(u.p) ? WIN - 1 : g.result.winner ? -(WIN - 1) : 0;
        else if (this.repeated(g)) s = 0;
        else {
          this.path[this.np + 1] = g.key();
          this.np++;
          s = -this.search(d - 1, -INF, a === -INF ? INF : -(a - jit), 1);
          this.np--;
        }
        g.unmake(u);
        if (this.stop) break;
        scores.set(m, s);
        if (a !== -INF && s <= a - jit) continue;
        // (la variedad, nunca sobre una partida ganada o perdida: si no,
        // prefería ganar dentro de tres jugadas a ganar ya, y vuelta a empezar)
        const sj = Math.abs(s) < WIN - 1000 ? s + rj.get(m) : s;
        if (sj > dScore) {
          dScore = sj;
          dBest = m;
          dRaw = s;
        }
        if (s > a) a = s;
      }
      if (this.stop && dBest < 0) break;
      // (de una vuelta a medias, sólo si la que sale es mejor que la de antes)
      if (!this.stop || dRaw > bestScore) {
        best = dBest;
        bestScore = dRaw;
      }
      if (this.stop) break;
      done = d;
      // (ganada o perdida sin remedio: no hace falta mirar más)
      if (Math.abs(bestScore) > WIN - 200) break;
      if (now() > t0 + (opts.ms ?? 1000) * 0.45 || this.nodes > this.maxNodes * 0.45) break;
    }
    return { move: best, score: bestScore, depth: done, nodes: this.nodes, ms: Math.round(now() - t0) };
  }

  repeated(g) {
    const k = g.key();
    for (let i = this.np; i >= 0; i--) if (this.path[i] === k) return true;
    return false;
  }

  timeUp() {
    if ((this.nodes & 1023) === 0 && (now() > this.deadline || this.nodes > this.maxNodes)) this.stop = true;
    return this.stop;
  }

  // ------------------------------------------------------------ la búsqueda
  // ext: lo que lleva alargado esta rama (las jugadas forzadas no gastan
  // profundidad, hasta EXT)
  search(depth, alpha, beta, ply, ext = 0) {
    const g = this.g;
    this.nodes++;
    if (this.timeUp()) return 0;
    // (mueven los de dentro con una línea libre: el rey sale)
    if (g.turn === DEF && g.openLines() > 0) return WIN - ply - 1;
    if (depth <= 0 || ply >= MAXP - 16) return this.quiesce(alpha, beta, ply, 0);
    if (g.ply >= MAX_PLY) return 0;
    // mueven los de fuera con el rey asomado a las afueras: sólo sirve tapar
    // o atraparle (y eso, como un jaque, no gasta profundidad)
    let lines = null;
    if (g.turn === ATT) {
      lines = this.lbuf[ply];
      lines.length = 0;
      if (!g.openLines(lines)) lines = null;
    }
    const cd = depth - 1 + (lines && ext < EXT ? 1 : 0),
      ce = ext + (lines ? 1 : 0);
    // la tabla
    const idx = g.h1 & this.mask;
    let ttMove = -1;
    if (this.tKey[idx] === g.h2 && this.tDepth[idx] >= 0) {
      ttMove = this.tMove[idx];
      if (this.tDepth[idx] >= depth) {
        let s = this.tScore[idx];
        if (s > WIN - 1000) s -= ply;
        else if (s < -WIN + 1000) s += ply;
        const f = this.tFlag[idx];
        if (f === EXACT) return s;
        if (f === LOWER && s >= beta) return s;
        if (f === UPPER && s <= alpha) return s;
      }
    }
    const n = this.gen(ply, ttMove, lines);
    // (sin jugadas: pierde; sin ninguna que tape: el rey sale a la siguiente)
    if (!n) return lines ? -(WIN - ply - 2) : -(WIN - ply);
    const ms = this.mbuf[ply];
    const a0 = alpha;
    let best = -INF,
      bestM = -1;
    for (let i = 0; i < n; i++) {
      this.pickNext(ply, i, n);
      const m = ms[i];
      const u = g.make(m);
      let s;
      if (g.result) s = g.result.winner === sideOf(u.p) ? WIN - ply - 1 : g.result.winner ? -(WIN - ply - 1) : 0;
      else if (this.repeated(g)) s = 0;
      else {
        this.path[++this.np] = g.key();
        // (la primera, con la ventana entera; las demás, primero con una nula)
        if (i === 0) s = -this.search(cd, -beta, -alpha, ply + 1, ce);
        else {
          s = -this.search(cd, -alpha - 1, -alpha, ply + 1, ce);
          if (s > alpha && s < beta && !this.stop) s = -this.search(cd, -beta, -alpha, ply + 1, ce);
        }
        this.np--;
      }
      g.unmake(u);
      if (this.stop) return 0;
      if (s > best) {
        best = s;
        bestM = m;
      }
      if (s > alpha) alpha = s;
      if (alpha >= beta) {
        if (!u.caps.length) {
          if (this.killers[ply * 2] !== m) {
            this.killers[ply * 2 + 1] = this.killers[ply * 2];
            this.killers[ply * 2] = m;
          }
          this.hist[m] += depth * depth;
        }
        break;
      }
    }
    // a la tabla
    let st = best;
    if (st > WIN - 1000) st += ply;
    else if (st < -WIN + 1000) st -= ply;
    if (this.tDepth[idx] <= depth || this.tKey[idx] !== g.h2) {
      this.tKey[idx] = g.h2;
      this.tDepth[idx] = depth;
      this.tScore[idx] = st;
      this.tMove[idx] = bestM;
      this.tFlag[idx] = best <= a0 ? UPPER : best >= beta ? LOWER : EXACT;
    }
    return best;
  }

  // Al final de una rama, sólo las amenazas del rey: si mueven los de dentro,
  // las jugadas que le abren al rey una línea a las afueras (el rey que se
  // asoma, o uno de los suyos que se aparta), y si no, lo que hay; si mueven
  // los de fuera, tapar (o atrapar al rey). Así se ven las horquillas que se
  // preparan con amenazas, una detrás de otra, más allá de la profundidad.
  quiesce(alpha, beta, ply, qd) {
    const g = this.g;
    this.nodes++;
    if (g.turn === DEF) {
      // (una línea libre: el rey sale)
      if (g.openLines() > 0) return WIN - ply - 1;
      const stand = this.evaluate();
      if (stand >= beta || qd >= QDEF || ply >= MAXP - 2) return stand;
      if (stand > alpha) alpha = stand;
      const n = this.genThreats(ply);
      const ms = this.mbuf[ply];
      let best = stand;
      for (let i = 0; i < n; i++) {
        this.pickNext(ply, i, n);
        const u = g.make(ms[i]);
        let s;
        if (g.result) s = g.result.winner === DEF ? WIN - ply - 1 : g.result.winner ? -(WIN - ply - 1) : 0;
        else s = -this.quiesce(-beta, -alpha, ply + 1, qd + 1);
        g.unmake(u);
        if (s > best) best = s;
        if (s > alpha) alpha = s;
        if (alpha >= beta) break;
      }
      return best;
    }
    const lines = this.lbuf[ply];
    lines.length = 0;
    const open = g.openLines(lines);
    if (ply >= MAXP - 2) return open ? -(WIN - ply - 2) : this.evaluate();
    // mueven los de fuera: atrapar al rey, o tapar sus líneas
    const k = g.king;
    const ms = this.mbuf[ply],
      sc = this.sbuf[ply];
    let n = 0;
    const b = g.b;
    for (let i = 0; i < SQ; i++) {
      if (b[i] !== ATT) continue;
      for (let d = 0; d < 4; d++) {
        const ray = RAYS[i][d];
        for (let j = 0; j < ray.length; j++) {
          const t = ray[j];
          if (b[t] !== EMPTY || t === THRONE) break;
          const adjK = NB[t * 4] === k || NB[t * 4 + 1] === k || NB[t * 4 + 2] === k || NB[t * 4 + 3] === k;
          if (adjK || (open && lines.includes(t))) {
            ms[n] = i * SQ + t;
            sc[n] = adjK ? 2 : 1;
            n++;
          }
        }
      }
    }
    let best = open ? -(WIN - ply - 2) : this.evaluate();
    if (!open) {
      // (sin líneas que tapar: sólo si alguna atrapa al rey)
      for (let i = 0; i < n; i++) {
        if (sc[i] !== 2) continue;
        const u = g.make(ms[i]);
        const won = g.result && g.result.winner === ATT;
        g.unmake(u);
        if (won) return WIN - ply - 1;
      }
      return best;
    }
    if (best >= beta) return best;
    if (best > alpha) alpha = best;
    for (let i = 0; i < n; i++) {
      // (primero las que atrapan o tapan arrimándose al rey)
      this.pickNext(ply, i, n);
      const u = g.make(ms[i]);
      let s;
      if (g.result) s = g.result.winner === ATT ? WIN - ply - 1 : g.result.winner ? -(WIN - ply - 1) : 0;
      else s = -this.quiesce(-beta, -alpha, ply + 1, qd + 1);
      g.unmake(u);
      if (s > best) best = s;
      if (s > alpha) alpha = s;
      if (alpha >= beta) break;
    }
    return best;
  }
  // Las amenazas de los de dentro (sin líneas libres ya): el rey a una
  // casilla desde la que ve las afueras (las de dos líneas, primero) y los
  // suyos que, apartándose, le dejan una línea libre.
  genThreats(ply) {
    const g = this.g,
      b = g.b,
      k = g.king;
    const ms = this.mbuf[ply],
      sc = this.sbuf[ply];
    let n = 0;
    if (k < 0) return 0;
    b[k] = EMPTY;
    for (let d = 0; d < 4; d++) {
      const ray = RAYS[k][d];
      for (let j = 0; j < ray.length; j++) {
        const t = ray[j];
        if (b[t] !== EMPTY) break;
        let l = 0;
        for (let d2 = 0; d2 < 4; d2++) {
          const r2 = RAYS[t][d2];
          if (!r2.length) continue;
          let ok = true;
          for (let q = 0; q < r2.length; q++)
            if (b[r2[q]] !== EMPTY) {
              ok = false;
              break;
            }
          if (ok) l++;
        }
        if (l) {
          ms[n] = k * SQ + t;
          sc[n] = l * 10;
          n++;
        }
      }
    }
    b[k] = KING;
    for (let d = 0; d < 4; d++) {
      // (el primero que hay en la fila del rey es de los suyos, y detrás de él, nada)
      const ray = RAYS[k][d];
      let j = 0;
      while (j < ray.length && b[ray[j]] === EMPTY) j++;
      if (j >= ray.length || b[ray[j]] !== DEF) continue;
      let rest = true;
      for (let q = j + 1; q < ray.length; q++)
        if (b[ray[q]] !== EMPTY) {
          rest = false;
          break;
        }
      if (!rest) continue;
      const f = ray[j];
      for (const d2 of PERP[d]) {
        const r2 = RAYS[f][d2];
        for (let q = 0; q < r2.length; q++) {
          const t = r2[q];
          if (b[t] !== EMPTY || t === THRONE) break;
          ms[n] = f * SQ + t;
          sc[n] = 5;
          n++;
        }
      }
    }
    return n;
  }

  // ------------------------------------------------------------ jugadas, en orden
  // (lines: las casillas de las líneas libres del rey; si se da, sólo las que
  // las tapan o se arriman al rey)
  gen(ply, ttMove, lines = null) {
    const g = this.g,
      b = g.b;
    const ms = this.mbuf[ply],
      sc = this.sbuf[ply];
    const side = g.turn;
    const k = g.king;
    const k1 = this.killers[ply * 2],
      k2 = this.killers[ply * 2 + 1];
    let n = 0;
    for (let i = 0; i < SQ; i++) {
      const p = b[i];
      if (!p || sideOf(p) !== side) continue;
      for (let d = 0; d < 4; d++) {
        const ray = RAYS[i][d];
        for (let j = 0; j < ray.length; j++) {
          const t = ray[j];
          if (b[t] !== EMPTY) break;
          if (t === THRONE && p !== KING) break;
          if (lines && !lines.includes(t) && NB[t * 4] !== k && NB[t * 4 + 1] !== k && NB[t * 4 + 2] !== k && NB[t * 4 + 3] !== k) continue;
          const m = i * SQ + t;
          let s = this.hist[m] >> 4;
          if (m === ttMove) s += 1e7;
          else if (m === k1) s += 4e5;
          else if (m === k2) s += 3e5;
          s += this.capGuess(i, t, p) * 2e5;
          if (p === KING) s += 6e4 + (isEdge[t] ? 1e6 : 0);
          else if (side === ATT && k >= 0) {
            // (los de fuera: arrimarse al rey y cerrarle las filas)
            const dr = Math.abs(((t / 9) | 0) - ((k / 9) | 0)),
              dc = Math.abs((t % 9) - (k % 9));
            if (dr + dc === 1) s += 5e4;
            else if (dr === 0 || dc === 0) s += 2e4;
          }
          ms[n] = m;
          sc[n] = s;
          n++;
        }
      }
    }
    return n;
  }
  // Cuántas cogería esta jugada (sin hacerla).
  capGuess(from, to, p) {
    const b = this.g.b;
    const side = sideOf(p);
    let c = 0;
    for (let d = 0; d < 4; d++) {
      const nn = NB[to * 4 + d];
      if (nn < 0) continue;
      const q = b[nn];
      if (!q || q === KING || sideOf(q) === side) continue;
      const f = NB[nn * 4 + d];
      if (f < 0 || f === from) continue;
      const r = b[f];
      if (side === ATT ? r === ATT || (f === THRONE && r === EMPTY) : r === DEF || r === KING || f === THRONE) c++;
    }
    return c;
  }
  // (orden de selección: la mejor que queda pasa a la posición i)
  pickNext(ply, i, n) {
    const ms = this.mbuf[ply],
      sc = this.sbuf[ply];
    let bi = i;
    for (let j = i + 1; j < n; j++) if (sc[j] > sc[bi]) bi = j;
    if (bi !== i) {
      const tm = ms[i],
        ts = sc[i];
      ms[i] = ms[bi];
      sc[i] = sc[bi];
      ms[bi] = tm;
      sc[bi] = ts;
    }
  }

  // ------------------------------------------------------------ la evaluación
  // Desde el que mueve. (Sólo se llama sin líneas libres para el rey.)
  evaluate() {
    const g = this.g,
      b = g.b;
    let nA = 0,
      nD = 0;
    for (let i = 0; i < SQ; i++) {
      const p = b[i];
      if (p === ATT) nA++;
      else if (p === DEF) nD++;
    }
    let s = nA * W.att - nD * W.def;
    const k = g.king;
    const defMoves = g.turn === DEF;
    if (k >= 0) {
      // lo que puede hacer el rey en una jugada: cuántas casillas, y desde
      // cuántas tendría una línea (o dos: una horquilla) a las afueras
      let mob = 0,
        t1 = 0,
        t2 = 0;
      b[k] = EMPTY;
      for (let d = 0; d < 4; d++) {
        const ray = RAYS[k][d];
        for (let j = 0; j < ray.length; j++) {
          const t = ray[j];
          if (b[t] !== EMPTY) break;
          mob++;
          let l = 0;
          for (let d2 = 0; d2 < 4; d2++) {
            const r2 = RAYS[t][d2];
            if (!r2.length) continue;
            let ok = true;
            for (let q = 0; q < r2.length; q++)
              if (b[r2[q]] !== EMPTY) {
                ok = false;
                break;
              }
            if (ok) l++;
          }
          if (l >= 2) t2++;
          else if (l === 1) t1++;
        }
      }
      b[k] = KING;
      s -= mob * W.mob + t1 * (defMoves ? W.t1def : W.t1att) + t2 * (defMoves ? W.t2def : W.t2att);
      // por dónde podría escapar si sólo le cerraran el paso los de fuera
      const st = ++this.stamp;
      const q = this.q,
        mk = this.mark;
      let qh = 0,
        qt = 0,
        size = 0,
        edges = 0;
      q[qt++] = k;
      mk[k] = st;
      while (qh < qt) {
        const c = q[qh++];
        size++;
        if (isEdge[c]) edges++;
        for (let d = 0; d < 4; d++) {
          const nn = NB[c * 4 + d];
          if (nn < 0 || mk[nn] === st || b[nn] === ATT) continue;
          mk[nn] = st;
          q[qt++] = nn;
        }
      }
      if (!edges) s += W.closed + (40 - Math.min(40, size)) * W.small;
      else s -= edges * W.edge;
      // quién le pega
      for (let d = 0; d < 4; d++) {
        const nn = NB[k * 4 + d];
        if (nn < 0) continue;
        if (b[nn] === ATT) s += W.adjAtt;
        else if (b[nn] === DEF) s -= W.adjDef;
      }
    }
    // el cansancio: un ruido fijo para cada posición
    if (this.noise) {
      let h = (g.h1 ^ this.seed) >>> 0;
      h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
      h = (h ^ (h >>> 16)) >>> 0;
      s += (h % (2 * this.noise + 1)) - this.noise;
    }
    return g.turn === ATT ? s : -s;
  }
}
