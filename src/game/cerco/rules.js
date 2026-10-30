// El Cerco: el juego de mesa del Rey (de la familia de los tafl: un rey
// cercado que tiene que escapar y una hueste que tiene que atraparlo). Sólo
// las reglas, sin nada de three.js: las usan la mesa (game/cerco/board.js),
// el hilo de la IA (ai_worker.js) y las pruebas (tools/cerco.mjs).
//
// Tablero de 9 × 9 (casilla i = fila · 9 + columna; la fila 0 es la del lado
// del Rey). En medio, el trono; la fila de fuera, las afueras.
//  - Los de fuera (ATT): dieciséis, cuatro en medio de cada lado. Empiezan.
//  - Los de dentro: el rey (KING), en el trono, y sus ocho (DEF) en cruz.
//  - Todas las piezas andan en línea recta, tantas casillas como se quiera,
//    sin saltar a nadie. El trono es sólo del rey: nadie más se para en él ni
//    pasa por encima.
//  - Se mata cogiendo en medio: la pieza que, al mover, queda entre la que
//    llega y otra del que mueve (en línea) muere. Meterse uno mismo entre dos
//    no mata. El rey también mata. El trono muerde: es enemigo de los de
//    fuera siempre y de los de dentro cuando está vacío.
//  - El rey gana si llega a las afueras. Los de fuera ganan si lo atrapan: en
//    el trono, por los cuatro lados; junto al trono, por los tres que le
//    quedan; en cualquier otro sitio, cogiéndolo en medio.
//  - Quien no puede mover, pierde. Tablas si una posición se repite tres
//    veces o al llegar a MAX_PLY jugadas.
import { mulberry32 } from '../../core/util.js';

export const N = 9;
export const SQ = N * N;
export const THRONE = 40;
export const EMPTY = 0,
  ATT = 1,
  DEF = 2,
  KING = 3;
export const MAX_PLY = 160;
// el bando de una pieza (el rey es de los de dentro)
export const sideOf = (p) => (p === ATT ? ATT : p === EMPTY ? 0 : DEF);
export const other = (s) => (s === ATT ? DEF : ATT);

export const START = ['...AAA...', '....A....', '....D....', 'A...D...A', 'AADDKDDAA', 'A...D...A', '....D....', '....A....', '...AAA...'];

// ------------------------------------------------------------ tablas
export const rowOf = new Int8Array(SQ);
export const colOf = new Int8Array(SQ);
export const isEdge = new Uint8Array(SQ);
// vecino en cada dirección (0 arriba, 1 abajo, 2 izquierda, 3 derecha) o -1
export const NB = new Int8Array(SQ * 4).fill(-1);
// rayos: las casillas de cada dirección, de la más cercana al borde
export const RAYS = [];
const DR = [-1, 1, 0, 0],
  DC = [0, 0, -1, 1];
for (let i = 0; i < SQ; i++) {
  const r = Math.floor(i / N),
    c = i % N;
  rowOf[i] = r;
  colOf[i] = c;
  isEdge[i] = r === 0 || c === 0 || r === N - 1 || c === N - 1 ? 1 : 0;
  const rays = [];
  for (let d = 0; d < 4; d++) {
    const ray = [];
    let rr = r + DR[d],
      cc = c + DC[d];
    while (rr >= 0 && rr < N && cc >= 0 && cc < N) {
      ray.push(rr * N + cc);
      rr += DR[d];
      cc += DC[d];
    }
    if (ray.length) NB[i * 4 + d] = ray[0];
    rays.push(Int8Array.from(ray));
  }
  RAYS.push(rays);
}
// las cuatro casillas junto al trono
export const THRONE_ADJ = [THRONE - N, THRONE + N, THRONE - 1, THRONE + 1];
export const nextTo = (a, b) => Math.abs(rowOf[a] - rowOf[b]) + Math.abs(colOf[a] - colOf[b]) === 1;

// claves de Zobrist (dos de 32 bits: una para el índice, otra para comprobar)
const rz = mulberry32(0xc3c0);
const rnd32 = () => (rz() * 4294967296) >>> 0;
export const Z1 = new Uint32Array(SQ * 4),
  Z2 = new Uint32Array(SQ * 4);
for (let i = 0; i < SQ * 4; i++) {
  Z1[i] = rnd32();
  Z2[i] = rnd32();
}
export const ZT1 = rnd32(),
  ZT2 = rnd32();

// Una jugada es un entero: desde · 81 + hasta.
export const mv = (from, to) => from * SQ + to;
export const mFrom = (m) => (m / SQ) | 0;
export const mTo = (m) => m % SQ;

// ------------------------------------------------------------ la partida
export class Cerco {
  constructor(src = null) {
    this.b = new Int8Array(SQ);
    this.turn = ATT;
    this.ply = 0;
    this.king = THRONE;
    this.h1 = 0;
    this.h2 = 0;
    // claves de las posiciones ya vistas (para las repeticiones)
    this.seen = [];
    this.result = null; // { winner: ATT | DEF | 0, reason }
    if (src) this.load(src);
    else this.reset();
  }

  reset() {
    this.b.fill(EMPTY);
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        const ch = START[r][c];
        this.b[r * N + c] = ch === 'A' ? ATT : ch === 'D' ? DEF : ch === 'K' ? KING : EMPTY;
      }
    this.turn = ATT;
    this.ply = 0;
    this.king = THRONE;
    this.result = null;
    this.rehash();
    this.seen = [this.key()];
  }

  // (para el hilo de la IA: lo justo para seguir la partida)
  save() {
    return { b: Array.from(this.b), turn: this.turn, ply: this.ply, seen: this.seen.slice(), result: this.result };
  }
  load(s) {
    for (let i = 0; i < SQ; i++) this.b[i] = s.b[i];
    this.turn = s.turn;
    this.ply = s.ply;
    this.king = this.b.indexOf(KING);
    this.result = s.result || null;
    this.rehash();
    this.seen = s.seen ? s.seen.slice() : [this.key()];
  }
  clone() {
    return new Cerco(this.save());
  }

  rehash() {
    let h1 = 0,
      h2 = 0;
    for (let i = 0; i < SQ; i++) {
      const p = this.b[i];
      if (p) {
        h1 ^= Z1[i * 4 + p];
        h2 ^= Z2[i * 4 + p];
      }
    }
    if (this.turn === DEF) {
      h1 ^= ZT1;
      h2 ^= ZT2;
    }
    this.h1 = h1 >>> 0;
    this.h2 = h2 >>> 0;
  }
  // (53 bits: lo que cabe entero en un número de JavaScript)
  key() {
    return this.h1 * 2097152 + (this.h2 >>> 11);
  }
  count(p) {
    let n = 0;
    for (let i = 0; i < SQ; i++) if (this.b[i] === p) n++;
    return n;
  }

  // ------------------------------------------------------------ jugadas
  // ¿Puede esta pieza pararse en (o cruzar) la casilla t?
  static passable(p, t) {
    return t !== THRONE || p === KING;
  }
  // Destinos de la pieza que está en 'from' (en 'out', si se da).
  targets(from, out = []) {
    const b = this.b;
    const p = b[from];
    if (!p) return out;
    const rays = RAYS[from];
    for (let d = 0; d < 4; d++) {
      const ray = rays[d];
      for (let k = 0; k < ray.length; k++) {
        const t = ray[k];
        if (b[t] !== EMPTY) break;
        if (t === THRONE && p !== KING) break;
        out.push(t);
      }
    }
    return out;
  }
  // Todas las jugadas del bando 'side' (por defecto, el que mueve).
  moves(side = this.turn, out = []) {
    const b = this.b;
    for (let i = 0; i < SQ; i++) {
      const p = b[i];
      if (!p || sideOf(p) !== side) continue;
      const rays = RAYS[i];
      for (let d = 0; d < 4; d++) {
        const ray = rays[d];
        for (let k = 0; k < ray.length; k++) {
          const t = ray[k];
          if (b[t] !== EMPTY) break;
          if (t === THRONE && p !== KING) break;
          out.push(i * SQ + t);
        }
      }
    }
    return out;
  }
  hasMove(side) {
    const b = this.b;
    for (let i = 0; i < SQ; i++) {
      const p = b[i];
      if (!p || sideOf(p) !== side) continue;
      for (let d = 0; d < 4; d++) {
        const t = NB[i * 4 + d];
        if (t >= 0 && b[t] === EMPTY && (t !== THRONE || p === KING)) return true;
      }
    }
    return false;
  }
  legal(m) {
    const from = mFrom(m),
      to = mTo(m);
    const p = this.b[from];
    if (!p || sideOf(p) !== this.turn || this.result) return false;
    return this.targets(from).includes(to);
  }

  // ¿La casilla f es enemiga (para coger en medio) de la pieza de bando 'victim'?
  hostile(f, victim) {
    const q = this.b[f];
    if (victim === ATT) return q === DEF || q === KING || f === THRONE;
    // (los de dentro: el trono, sólo vacío)
    return q === ATT || (f === THRONE && q === EMPTY);
  }

  // ¿Queda atrapado el rey (con los de fuera que hay ahora)?
  kingTrapped() {
    const k = this.king,
      b = this.b;
    if (k < 0) return true;
    if (k === THRONE) {
      for (let d = 0; d < 4; d++) if (b[NB[k * 4 + d]] !== ATT) return false;
      return true;
    }
    if (THRONE_ADJ.includes(k)) {
      for (let d = 0; d < 4; d++) {
        const n = NB[k * 4 + d];
        if (n !== THRONE && b[n] !== ATT) return false;
      }
      return true;
    }
    return false;
  }

  // Mueve (sin comprobar que sea legal) y devuelve lo necesario para
  // deshacerlo: { m, p, caps: [casilla, pieza, ...], king, result, h1, h2 }.
  make(m) {
    const b = this.b;
    const from = mFrom(m),
      to = mTo(m);
    const p = b[from];
    const side = sideOf(p);
    const u = { m, p, caps: [], king: this.king, result: this.result, h1: this.h1, h2: this.h2 };
    b[from] = EMPTY;
    b[to] = p;
    let h1 = this.h1 ^ Z1[from * 4 + p] ^ Z1[to * 4 + p] ^ ZT1,
      h2 = this.h2 ^ Z2[from * 4 + p] ^ Z2[to * 4 + p] ^ ZT2;
    if (p === KING) this.king = to;
    let kingTaken = false;
    for (let d = 0; d < 4; d++) {
      const n = NB[to * 4 + d];
      if (n < 0) continue;
      const q = b[n];
      if (!q || sideOf(q) === side) continue;
      if (q === KING) {
        // (el rey, por sus reglas; lejos del trono, cogido en medio)
        if (n === THRONE || THRONE_ADJ.includes(n)) {
          if (this.kingTrapped()) kingTaken = true;
        } else {
          const f = NB[n * 4 + d];
          if (f >= 0 && b[f] === ATT) kingTaken = true;
        }
        continue;
      }
      const f = NB[n * 4 + d];
      if (f >= 0 && this.hostile(f, sideOf(q))) {
        u.caps.push(n, q);
        b[n] = EMPTY;
        h1 ^= Z1[n * 4 + q];
        h2 ^= Z2[n * 4 + q];
      }
    }
    if (kingTaken) {
      const k = this.king;
      u.caps.push(k, KING);
      b[k] = EMPTY;
      h1 ^= Z1[k * 4 + KING];
      h2 ^= Z2[k * 4 + KING];
      this.king = -1;
    }
    this.h1 = h1 >>> 0;
    this.h2 = h2 >>> 0;
    this.turn = other(side);
    this.ply++;
    // ¿se acabó?
    if (kingTaken) this.result = { winner: ATT, reason: 'king' };
    else if (p === KING && isEdge[to]) this.result = { winner: DEF, reason: 'escape' };
    else if (!this.hasMove(this.turn)) this.result = { winner: side, reason: 'stuck' };
    return u;
  }
  unmake(u) {
    const b = this.b;
    const from = mFrom(u.m),
      to = mTo(u.m);
    for (let k = 0; k < u.caps.length; k += 2) b[u.caps[k]] = u.caps[k + 1];
    b[to] = EMPTY;
    b[from] = u.p;
    this.king = u.king;
    this.result = u.result;
    this.h1 = u.h1;
    this.h2 = u.h2;
    this.turn = sideOf(u.p);
    this.ply--;
  }

  // Juega de verdad (comprueba, apunta la posición y mira las tablas).
  play(m) {
    if (!this.legal(m)) return null;
    const u = this.make(m);
    const k = this.key();
    this.seen.push(k);
    if (!this.result) {
      let n = 0;
      for (const s of this.seen) if (s === k) n++;
      if (n >= 3) this.result = { winner: 0, reason: 'repeat' };
      else if (this.ply >= MAX_PLY) this.result = { winner: 0, reason: 'limit' };
    }
    return u;
  }

  // Las líneas libres del rey hasta las afueras: cuántas (y, en 'out', sus
  // casillas, para taparlas).
  openLines(out = null) {
    const k = this.king;
    if (k < 0) return 0;
    let n = 0;
    const b = this.b;
    for (let d = 0; d < 4; d++) {
      const ray = RAYS[k][d];
      if (!ray.length) continue;
      let ok = true;
      for (let j = 0; j < ray.length; j++)
        if (b[ray[j]] !== EMPTY) {
          ok = false;
          break;
        }
      if (ok) {
        n++;
        if (out) for (let j = 0; j < ray.length; j++) out.push(ray[j]);
      }
    }
    return n;
  }

  toString() {
    let s = '';
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const i = r * N + c,
          p = this.b[i];
        s += p === ATT ? 'A' : p === DEF ? 'D' : p === KING ? 'K' : i === THRONE ? '+' : '.';
      }
      s += '\n';
    }
    return s;
  }
}

// Nombre de una casilla, como en el ajedrez (columnas a-i, filas 9-1 desde
// el lado del Rey): para las pruebas.
export const sqName = (i) => 'abcdefghi'[colOf[i]] + (N - rowOf[i]);
export const mvName = (m) => sqName(mFrom(m)) + '-' + sqName(mTo(m));
