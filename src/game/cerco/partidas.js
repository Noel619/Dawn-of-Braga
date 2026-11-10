// Las partidas que recuerda el Rey: las jugadas (partidas_jugadas.js, las
// simula tools/partidas.mjs), lo que pasó en cada una y cómo reconocerlas en
// la que se juega. Lo que cuenta de ellas, en story.js (PARTIDAS).
//
// Una jugada «es la misma» que la de una partida recordada si es la misma
// pieza de la misma casilla a la misma casilla, o la misma vista desde otro
// lado del tablero (las ocho simetrías: el tablero no tiene derecho ni revés).
// Se reconocen:
//  - las aperturas: la posición, jugada a jugada, es la de una partida (y el
//    Rey, cuando le toca, puede seguirla: así abría su padre);
//  - las jugadas señaladas de cada una: la horquilla del hijo, la salida del
//    pequeño, la que iba a mover el pequeño cuando sonó la campana...;
//  - y las costumbres: la reina, que movía la misma arriba y abajo; el
//    alcaide, que no sacaba el rey; Don Gonçalo, que mataba con el rey...
// Sin three.js: lo usan la mesa (game/rey.js) y las pruebas (tools/cerco.mjs).
import { Cerco, ATT, DEF, KING, N, SQ, THRONE, THRONE_ADJ, NB, isEdge, rowOf, colOf, mv, mFrom, mTo, Z1, Z2, ZT1, ZT2 } from './rules.js';
import { JUGADAS } from './partidas_jugadas.js';

// ------------------------------------------------------------ simetrías
// SYM[s][i]: la casilla i vista con la simetría s (0, la misma)
export const SYM = [];
for (let s = 0; s < 8; s++) {
  const t = new Int8Array(SQ);
  for (let i = 0; i < SQ; i++) {
    let r = rowOf[i],
      c = colOf[i];
    if (s & 4) [r, c] = [c, r];
    if (s & 1) c = N - 1 - c;
    if (s & 2) r = N - 1 - r;
    t[i] = r * N + c;
  }
  SYM.push(t);
}
// La clave de una posición vista con la simetría s (como Cerco.key()).
export function symKey(b, turn, s) {
  const T = SYM[s];
  let h1 = 0,
    h2 = 0;
  for (let i = 0; i < SQ; i++) {
    const p = b[i];
    if (!p) continue;
    const j = T[i];
    h1 ^= Z1[j * 4 + p];
    h2 ^= Z2[j * 4 + p];
  }
  if (turn === DEF) {
    h1 ^= ZT1;
    h2 ^= ZT2;
  }
  return (h1 >>> 0) * 2097152 + ((h2 >>> 0) >>> 11);
}
// Una jugada vista con la simetría s.
export const symMove = (m, s) => mv(SYM[s][mFrom(m)], SYM[s][mTo(m)]);
// Casilla por su nombre (a9 … i1).
export const sqOf = (s) => (N - +s.slice(1)) * N + 'abcdefghi'.indexOf(s[0]);

// ------------------------------------------------------------ lo que pasó
// ¿Se cerró el cerco? (el rey no llega a las afueras ni pasando por los suyos)
export function closedRing(g) {
  const k = g.king;
  if (k < 0) return false;
  const seen = new Uint8Array(SQ);
  const q = [k];
  seen[k] = 1;
  while (q.length) {
    const c = q.pop();
    if (isEdge[c]) return false;
    for (let d = 0; d < 4; d++) {
      const n = NB[c * 4 + d];
      if (n < 0 || seen[n] || g.b[n] === ATT) continue;
      seen[n] = 1;
      q.push(n);
    }
  }
  return true;
}
// Lo que pasa con una jugada, en la partida g (antes de hacerla) y u (lo
// que devuelve make/play): la pieza, el bando, lo que mata, las líneas que
// deja al rey, si sale o lo atrapan (y dónde), si deshace la anterior suya...
export function moveInfo(g, m, u, prevSame = -1) {
  const p = u.p;
  let caps = 0,
    kingTaken = false;
  for (let i = 0; i < u.caps.length; i += 2) {
    if (u.caps[i + 1] === KING) kingTaken = true;
    else caps++;
  }
  const res = g.result;
  const kingAt = g.king >= 0 ? g.king : u.king;
  return {
    m,
    p,
    side: p === ATT ? ATT : DEF,
    caps,
    lines: g.king >= 0 ? g.openLines() : 0,
    escape: !!res && res.reason === 'escape',
    kingTaken,
    where: kingTaken ? (kingAt === THRONE ? 'throne' : THRONE_ADJ.includes(kingAt) ? 'adj' : 'open') : null,
    kingAt,
    // (la misma pieza vuelve a donde estaba: arriba y abajo)
    back: prevSame >= 0 && mFrom(m) === mTo(prevSame) && mTo(m) === mFrom(prevSame),
  };
}

// ------------------------------------------------------------ las partidas
// Cada una: { id, moves, pend, keys: [[8 claves] por jugada], info: [...] }
// (keys[n]: la posición tras n jugadas; info[n]: lo que pasó en la n+1).
export const PARTIDAS_JUGADAS = [];
for (const id in JUGADAS) {
  const J = JUGADAS[id];
  const moves = J.moves.split(' ').map((t) => mv(sqOf(t.slice(0, 2)), sqOf(t.slice(2))));
  const g = new Cerco();
  const keys = [];
  const info = [];
  const last = { [ATT]: -1, [DEF]: -1 };
  const k8 = () => {
    const a = [];
    for (let s = 0; s < 8; s++) a.push(symKey(g.b, g.turn, s));
    return a;
  };
  keys.push(k8());
  for (const m of moves) {
    if (!g.legal(m)) {
      console.warn('[partidas] jugada imposible en', id, m);
      break;
    }
    const side = g.turn;
    const u = g.play(m);
    const I = moveInfo(g, m, u, last[side]);
    I.closed = side === ATT && closedRing(g);
    last[side] = m;
    info.push(I);
    keys.push(k8());
  }
  const pend = J.pend ? mv(sqOf(J.pend.slice(0, 2)), sqOf(J.pend.slice(2))) : -1;
  PARTIDAS_JUGADAS.push({ id, moves, pend, keys, info, result: g.result, plies: moves.length, pendPiece: pend >= 0 ? g.b[mFrom(pend)] : 0 });
}
export const partida = (id) => PARTIDAS_JUGADAS.find((p) => p.id === id) || null;

// ------------------------------------------------------------ jugadas señaladas
// Las de cada partida que se reconocen sueltas, a media partida (no sólo
// siguiendo la apertura): { id, kind, ply, m, p, need } con need(I): lo que
// tiene que pasar también en la tuya.
export const SENALADAS = [];
{
  const add = (id, kind, i, need = null) => {
    const P = partida(id);
    if (!P || i < 0 || i >= P.info.length) return;
    const I = P.info[i];
    SENALADAS.push({ id, kind, ply: i + 1, m: I.m, p: I.p, side: I.side, need });
  };
  for (const P of PARTIDAS_JUGADAS) {
    const I = P.info;
    // la horquilla (el rey ve dos caminos) y la salida
    const fork = I.findIndex((x) => x.p === KING && x.lines >= 2);
    if (fork >= 0) add(P.id, 'fork', fork, (x) => x.lines >= 2);
    const esc = I.findIndex((x) => x.escape);
    if (esc >= 0) add(P.id, 'escape', esc, (x) => x.escape);
    // la última jugada de los de dentro antes de que atraparan al rey: la que
    // lo perdió (el rey que se mete, o uno de los suyos que se aparta)
    const taken = I.findIndex((x) => x.kingTaken);
    if (taken > 0 && I[taken - 1].side === DEF) add(P.id, 'fatal', taken - 1);
    // dos de un golpe; el rey que mata
    const dbl = I.findIndex((x) => x.caps >= 2 && x.side === DEF);
    if (dbl >= 0) add(P.id, 'double', dbl, (x) => x.caps >= 2);
    const kk = I.findIndex((x) => x.p === KING && x.caps > 0);
    if (kk >= 0) add(P.id, 'kingKill', kk, (x) => x.caps > 0);
    // la que iba a jugar (la partida a medias)
    if (P.pend >= 0) {
      SENALADAS.push({ id: P.id, kind: 'pend', ply: P.plies + 1, m: P.pend, p: P.pendPiece, side: P.plies % 2 ? DEF : ATT, need: null });
    }
  }
}

// ------------------------------------------------------------ el que recuerda
// Sigue la partida que se juega y dice qué recuerda cada jugada:
//   onMove(g, m, u) tras jugar m (g, ya jugada; u, lo que devolvió play)
//     -> [{ id, kind, sym, ... }]: lo que le recuerda (puede ser nada)
//   book(g) -> { id, m, sym } | null: la jugada de una partida recordada
//     que puede seguir el Rey (le toca a los de fuera)
export class Recuerdos {
  constructor() {
    this.reset();
  }
  reset() {
    // las partidas que se siguen desde el principio (id -> simetría o -1)
    this.inBook = new Map();
    for (const P of PARTIDAS_JUGADAS) this.inBook.set(P.id, 0xff);
    this.last = { [ATT]: -1, [DEF]: -1 };
    this.backs = 0;
    this.kingStill = 0;
    this.history = [];
    this.wasClosed = false;
  }
  // ¿En qué partidas sigue la posición de g (tras g.ply jugadas)? Mapa id ->
  // máscara de simetrías.
  _follow(g) {
    const n = g.ply;
    const k0 = symKey(g.b, g.turn, 0);
    for (const P of PARTIDAS_JUGADAS) {
      const mask = this.inBook.get(P.id) || 0;
      if (!mask) continue;
      if (n >= P.keys.length) {
        this.inBook.set(P.id, 0);
        continue;
      }
      let nm = 0;
      for (let s = 0; s < 8; s++) if (mask & (1 << s) && P.keys[n][s] === k0) nm |= 1 << s;
      this.inBook.set(P.id, nm);
    }
  }
  book(g) {
    const n = g.ply;
    const out = [];
    for (const P of PARTIDAS_JUGADAS) {
      const mask = this.inBook.get(P.id) || 0;
      if (!mask || n >= P.moves.length || P.info[n].side !== ATT) continue;
      for (let s = 0; s < 8; s++)
        if (mask & (1 << s)) {
          const m = symMove(P.moves[n], s);
          if (g.legal(m)) {
            out.push({ id: P.id, m, sym: s });
            break;
          }
        }
    }
    return out;
  }
  // ¿La jugada 'm' (de la pieza p) es la señalada S, con alguna simetría?
  static same(S, m, p) {
    if (S.p !== p) return -1;
    for (let s = 0; s < 8; s++) if (symMove(S.m, s) === m) return s;
    return -1;
  }
  onMove(g, m, u) {
    const side = u.p === ATT ? ATT : DEF;
    const I = moveInfo(g, m, u, this.last[side]);
    I.closed = side === ATT && closedRing(g);
    this.last[side] = m;
    this.history.push(I);
    const hits = [];
    // la apertura: ¿sigue alguna? (las que seguían y siguen)
    const before = new Map(this.inBook);
    this._follow(g);
    for (const [id, mask] of this.inBook) {
      if (!mask) {
        // (se sale de una que seguía hacía rato)
        if (before.get(id) && g.ply >= 6) hits.push({ id, kind: 'leave', side, ply: g.ply });
        continue;
      }
      hits.push({ id, kind: 'book', side, ply: g.ply, sym: Math.log2(mask & -mask) | 0 });
    }
    // las señaladas (a media partida: fuera de la apertura que se sigue)
    for (const S of SENALADAS) {
      if (S.side !== side) continue;
      const s = Recuerdos.same(S, m, u.p);
      if (s < 0) continue;
      if (S.need && !S.need(I)) continue;
      // (la que iba a jugar el pequeño: tiene que ser a media partida)
      if (S.kind === 'pend' && g.ply < 8) continue;
      // (la que perdió al rey: sólo si de verdad se le puede atrapar ya)
      if (S.kind === 'fatal' && !kingCanBeTaken(g)) continue;
      hits.push({ id: S.id, kind: S.kind, side, ply: g.ply, sym: s, exact: g.ply === S.ply });
    }
    // las costumbres
    if (side === DEF) {
      if (I.back) {
        this.backs++;
        if (this.backs >= 2) hits.push({ id: 'reina', kind: 'habit', side, ply: g.ply });
      } else this.backs = 0;
      if (u.p === KING) this.kingStill = 0;
      else if (++this.kingStill === 12 && g.king === THRONE) hits.push({ id: 'alcaide', kind: 'habit', side, ply: g.ply });
      if (I.p === KING && I.caps > 0) hits.push({ id: 'goncalo', kind: 'habit', side, ply: g.ply });
      if (I.caps >= 2) hits.push({ id: 'goncalo', kind: 'habit2', side, ply: g.ply });
    } else {
      if (I.closed && !this.wasClosed) hits.push({ id: 'arzobispo', kind: 'habit', side, ply: g.ply });
      this.wasClosed = I.closed;
      if (I.kingTaken && I.where === 'throne') hits.push({ id: 'alcaide', kind: 'taken', side, ply: g.ply });
    }
    if (g.ply === 100) hits.push({ id: 'canciller', kind: 'habit', side, ply: g.ply });
    if (g.result && g.result.reason === 'repeat') hits.push({ id: 'reina', kind: 'draw', side, ply: g.ply });
    return hits;
  }
}

// ¿Pueden los de fuera atrapar al rey con su próxima jugada? (mueven ellos)
export function kingCanBeTaken(g) {
  if (g.turn !== ATT || g.king < 0) return false;
  const c = g.clone();
  const k = c.king;
  for (const m of c.moves()) {
    const to = mTo(m);
    if (NB[to * 4] !== k && NB[to * 4 + 1] !== k && NB[to * 4 + 2] !== k && NB[to * 4 + 3] !== k) continue;
    const u = c.make(m);
    const won = c.result && c.result.winner === ATT;
    c.unmake(u);
    if (won) return true;
  }
  return false;
}
