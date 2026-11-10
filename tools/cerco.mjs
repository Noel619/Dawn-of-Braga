// El Cerco (el juego del Rey), en la consola: comprueba las reglas, mide la
// IA y juega partidas de prueba entre niveles.
//   node tools/cerco.mjs reglas          comprueba capturas, trono, rey y huida
//   node tools/cerco.mjs partidas        las partidas que recuerda el Rey: que se
//                                        reconozcan al repetirlas (también al revés)
//   node tools/cerco.mjs maestro         lo que te explica el Rey: los fallos que ve
//   node tools/cerco.mjs velocidad       nodos por segundo y profundidad
//   node tools/cerco.mjs liga n rey rival k   n partidas: el Rey (nivel 0-2) contra un rival de
//                                        prueba de los de dentro (0-3); k escala los tiempos
//   node tools/cerco.mjs partida rey rival una partida, jugada a jugada
import { Cerco, ATT, DEF, KING, EMPTY, N, mv, mvName, mTo, mFrom, sqName } from '../src/game/cerco/rules.js';
import { Brain, WIN } from '../src/game/cerco/ai.js';
import { LEVELS, DEF_LEVELS, moveOpts } from '../src/game/cerco/levels.js';
import { PARTIDAS_JUGADAS, SENALADAS, Recuerdos, symMove, SYM } from '../src/game/cerco/partidas.js';
import { examine } from '../src/game/cerco/maestro.js';

const sq = (s) => {
  const c = 'abcdefghi'.indexOf(s[0]),
    r = N - +s.slice(1);
  return r * N + c;
};
const M = (a, b) => mv(sq(a), sq(b));
// Un tablero a mano: filas de 9 (A, D, K, . o +), la primera la del lado del Rey.
function board(rows, turn = ATT) {
  const g = new Cerco();
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      const ch = rows[r][c];
      g.b[r * N + c] = ch === 'A' ? ATT : ch === 'D' ? DEF : ch === 'K' ? KING : EMPTY;
    }
  g.turn = turn;
  g.king = g.b.indexOf(KING);
  g.rehash();
  g.seen = [g.key()];
  return g;
}

let fails = 0;
const check = (name, ok) => {
  console.log((ok ? 'ok   ' : 'MAL  ') + name);
  if (!ok) fails++;
};

function rules() {
  // salida
  let g = new Cerco();
  check('empiezan los de fuera, 16 contra 8 y el rey', g.turn === ATT && g.count(ATT) === 16 && g.count(DEF) === 8 && g.count(KING) === 1);
  check('nadie más que el rey para en el trono', !g.legal(M('e7', 'e5')) && !g.legal(M('e6', 'e4')));
  // coger en medio
  g = board(['.........', '.........', '.........', '...AD....', '....+A...', '.........', '.........', '.K.......', '.........'], ATT);
  g.play(M('f5', 'f6'));
  check('cogido en medio (en horizontal)', g.b[sq('e6')] === EMPTY && g.count(DEF) === 0);
  g = board(['.........', '....A....', '....D....', '.A.......', '....+....', '.........', '.........', '.K.......', '.........'], ATT);
  g.play(M('b6', 'e6'));
  check('cogido en medio (en vertical)', g.count(DEF) === 0);
  // meterse entre dos no mata
  g = board(['.........', '.........', '.A.A.....', '.........', '....+....', '.........', '..D......', '.K.......', '.........'], DEF);
  g.play(M('c3', 'c7'));
  check('meterse entre dos no mata', g.count(DEF) === 1 && g.b[sq('c7')] === DEF);
  // el trono vacío coge a los de dentro
  g = board(['.........', '.........', '.....A...', '....D....', '....+....', '.........', '.........', '.K.......', '.........'], ATT);
  g.play(M('f7', 'e7'));
  check('el trono vacío coge a los de dentro', g.b[sq('e6')] === EMPTY);
  // el trono coge a los de fuera
  g = board(['.........', '.........', '.........', '.........', '....+A...', '.........', '......D..', '.K.......', '.........'], DEF);
  g.play(M('g3', 'g5'));
  check('el trono coge a los de fuera', g.b[sq('f5')] === EMPTY);
  // el rey también mata
  g = board(['.........', '.........', '.........', '.........', '....+....', '.........', '...AD....', '..K......', '.........'], DEF);
  g.play(M('c2', 'c3'));
  check('el rey también mata', g.b[sq('d3')] === EMPTY);
  // el rey en el trono: por los cuatro lados
  g = board(['.........', '.........', '.........', '....A....', '...AK....', '....A....', '.........', '.....A...', '.........'], ATT);
  check('con tres no basta en el trono', !g.kingTrapped());
  g.play(M('f2', 'f5'));
  check('en el trono, por los cuatro lados', g.result && g.result.winner === ATT);
  // junto al trono: por los tres que le quedan
  g = board(['.........', '.........', '....A....', '...AK....', '....+....', '.........', '.........', '.....A...', '.........'], ATT);
  g.play(M('f2', 'f6'));
  check('junto al trono, por los tres que le quedan', g.result && g.result.winner === ATT);
  // lejos del trono, en medio, como cualquiera
  g = board(['.........', '.........', '..A......', '..K......', '....+....', '.........', '.........', '.........', '..A......'], ATT);
  g.play(M('c1', 'c5'));
  check('lejos del trono, cogido en medio', g.result && g.result.winner === ATT);
  // la huida
  g = board(['.........', '.........', '.........', '..K......', '....+....', '.........', '.........', '.........', 'A........'], DEF);
  g.play(M('c6', 'c9'));
  check('el rey sale por las afueras', g.result && g.result.winner === DEF);
  // tablas por repetición
  g = board(['A........', '.........', '.........', '.........', '....K....', '.........', '.........', '.........', '........D'], ATT);
  for (let i = 0; i < 2; i++) {
    g.play(M('a9', 'b9'));
    g.play(M('i1', 'h1'));
    g.play(M('b9', 'a9'));
    g.play(M('h1', 'i1'));
  }
  check('tablas por repetición', g.result && g.result.winner === 0 && g.result.reason === 'repeat');
  // hacer y deshacer devuelve el tablero
  g = new Cerco();
  const s0 = g.toString(),
    k0 = g.key();
  const us = [];
  for (let i = 0; i < 40 && !g.result; i++) {
    const ms = g.moves();
    us.push(g.make(ms[(i * 7919) % ms.length]));
  }
  while (us.length) g.unmake(us.pop());
  check('hacer y deshacer', g.toString() === s0 && g.key() === k0);
  // la IA ve una horquilla (el rey se pone donde tiene dos líneas libres)
  const br = new Brain(16);
  g = board(['.........', '...A.....', '.........', 'A..K..A..', '....+....', '.........', '...A.....', '.........', '.........'], DEF);
  let r = br.think(g, { depth: 3, ms: 3000 });
  check('los de dentro ven la horquilla (' + mvName(r.move) + ', ' + r.score + ')', r.score > WIN - 50 && g.openLines() === 0);
  // y los de fuera, que con dos líneas libres está perdido
  g = board(['.........', '.........', '.........', 'A.K...A..', '....+....', '.........', '...A.....', '.........', '.........'], ATT);
  r = br.think(g, { depth: 3, ms: 3000 });
  check('los de fuera saben que dos líneas no se tapan (' + r.score + ')', r.score < -WIN + 50);
  // y que una sí: la tapan
  g = board(['.........', '.........', '.A.......', 'A.K...A..', '....+....', '.........', '...A.....', '.........', '..A......'], ATT);
  r = br.think(g, { depth: 3, ms: 3000 });
  const lines = [];
  g.openLines(lines);
  check('los de fuera tapan la línea libre (' + mvName(r.move) + ')', lines.includes(mTo(r.move)));
  console.log(fails ? `${fails} mal` : 'todo bien');
}

// Las partidas que recuerda el Rey: cada una se puede jugar entera (son
// legales), y repetida jugada a jugada (tal cual o con una simetría) sigue
// en su apertura y da sus jugadas señaladas.
function partidas() {
  check('diez partidas', PARTIDAS_JUGADAS.length === 10);
  for (const P of PARTIDAS_JUGADAS) {
    check(`${P.id}: ${P.plies} jugadas legales`, P.info.length === P.moves.length);
    for (const s of [0, 5]) {
      const g = new Cerco();
      const R = new Recuerdos();
      let inBook = true;
      const kinds = new Set();
      for (let i = 0; i < P.moves.length && !g.result; i++) {
        const m = symMove(P.moves[i], s);
        // (el Rey, cuando le toca, la propone para seguirla: esa jugada o la
        // misma vista de otro lado, si la posición aún es simétrica)
        if (g.turn === ATT && i < 14 && !R.book(g).some((b) => b.id === P.id)) inBook = false;
        const u = g.play(m);
        for (const h of R.onMove(g, m, u)) if (h.id === P.id) kinds.add(h.kind);
        if (!R.inBook.get(P.id)) inBook = false;
      }
      const want = SENALADAS.filter((x) => x.id === P.id && x.kind !== 'pend').map((x) => x.kind);
      const got = want.filter((k) => kinds.has(k));
      check(`${P.id}${s ? ' (vuelta)' : ''}: la sigue de principio a fin${want.length ? ' y da ' + want.join(', ') : ''}`, inBook && kinds.has('book') && got.length === want.length);
    }
  }
  // la que iba a jugar el pequeño: puesta la posición, su jugada la reconoce
  const C = PARTIDAS_JUGADAS.find((p) => p.id === 'campana');
  const g = new Cerco();
  const R = new Recuerdos();
  for (const m of C.moves) R.onMove(g, m, g.play(m));
  const hits = R.onMove(g, C.pend, g.play(C.pend));
  check('la de la campana: la que iba a mover el pequeño (' + mvName(C.pend) + ')', hits.some((h) => h.id === 'campana' && h.kind === 'pend'));
  // el Rey sigue la jugada que prefiere si no es peor (y no si lo es)
  const br = new Brain(16);
  const s0 = new Cerco();
  const P0 = PARTIDAS_JUGADAS[0];
  const r1 = br.think(s0, { depth: 3, nodes: 60000, ms: 1e9, prefer: P0.moves[0], preferBonus: 30 });
  check('el Rey abre como en ' + P0.id + ' (' + mvName(r1.move) + ')', r1.move === P0.moves[0]);
  console.log(fails ? `${fails} mal` : 'todo bien');
}

// Lo que te explica el Rey: posiciones con un fallo de cada clase.
function maestro() {
  const kinds = (g, m) => {
    const ex = examine(g, m);
    return ex.bad.map((b) => b.kind);
  };
  // la salida, libre (a la izquierda): no sale
  let g = board(['..A......', '.........', '.A.......', '...A.....', '....+....', '.........', '..K....A.', '.D.......', '..A.A....'], DEF);
  check('no sale con la línea libre: escape', kinds(g, M('b2', 'b1'))[0] === 'escape');
  check('sale: nada que decir', !kinds(g, M('c3', 'a3')).length);
  // la horquilla: el rey en d5, sin líneas; desde d7 vería dos
  g = board(['...A.....', '.........', '.........', '.........', 'A..K+...A', '.........', '.........', '.D.......', '...A.....'], DEF);
  const ex = examine(g, M('b2', 'b1'));
  check('no ve la horquilla: fork (' + (ex.bad[0] ? sqName(ex.bad[0].sq[0]) : '-') + ')', ex.bad[0] && ex.bad[0].kind === 'fork');
  check('la ve: nada que decir', !kinds(g, M('d5', 'd7')).length);
  // el rey, a tiro: junto a uno de los míos, y el otro llega
  g = board(['..A......', '.........', '.........', '.........', '....+....', 'A.K.....A', '.........', '.........', '..A....D.'], DEF);
  check('se mete a tiro: king', kinds(g, M('c4', 'b4')).includes('king'));
  // la pieza que se queda donde la cogen en medio
  g = board(['...A.....', '.........', '.........', '.........', 'A..K+...A', '.........', '...D.....', '..A......', '...AA....'], DEF);
  check('se queda en medio: hang', kinds(g, M('d3', 'd2')).includes('hang'));
  console.log(fails ? `${fails} mal` : 'todo bien');
}

function speed() {
  const g = new Cerco();
  const br = new Brain();
  for (const [d, ms] of [
    [3, 5000],
    [4, 5000],
    [5, 5000],
    [6, 8000],
  ]) {
    const r = br.think(g, { depth: d, ms });
    console.log(`profundidad ${d}: ${mvName(r.move)} ${r.score} — ${r.depth} completas, ${r.nodes} nodos en ${r.ms} ms (${Math.round(r.nodes / Math.max(1, r.ms))}k/s)`);
  }
}

// Jugadores de prueba para los de dentro: el corredor (lleva al rey hacia la
// línea libre más cercana, si no, la mejor de profundidad 1) y la IA a
// distintos niveles.
function play(level, defOpts, seed, log = false, k = 1) {
  const g = new Cerco();
  const ba = new Brain(),
    bd = new Brain();
  let s = seed;
  const rnd = () => ((s = (Math.imul(s ^ (s >>> 13), 0x5bd1e995) + 1) >>> 0) / 4294967296);
  while (!g.result) {
    const att = g.turn === ATT;
    let o = att ? moveOpts(LEVELS.indexOf(level), rnd()) : defOpts;
    o = { ...o, ms: o.ms * k };
    const r = (att ? ba : bd).think(g, { ...o, seed: (rnd() * 4294967296) >>> 0 });
    if (r.move < 0) break;
    g.play(r.move);
    if (log) console.log(g.ply, att ? 'fuera ' : 'dentro', mvName(r.move), r.score, 'p' + r.depth + (o.isTired ? ' (cansado)' : ''));
  }
  return g;
}

// Una tanda de partidas: el Rey (nivel 'lv', con su cansancio) contra un
// jugador de prueba de los de dentro (nivel 'op'); k escala los tiempos.
function league(n, lv, op, k) {
  const L = LEVELS[lv],
    O = DEF_LEVELS[op];
  let w = 0,
    l = 0,
    d = 0,
    plies = 0;
  for (let i = 0; i < n; i++) {
    const g = play(L, O, 1234 + i * 977, false, k);
    plies += g.ply;
    if (g.result.winner === ATT) w++;
    else if (g.result.winner === DEF) l++;
    else d++;
  }
  console.log(`Rey, partida ${lv + 1}, contra dentro p${DEF_LEVELS[op].depth}: gana ${w}, pierde ${l}, tablas ${d} (media ${Math.round(plies / n)} jugadas)`);
}

const cmd = process.argv[2] || 'reglas';
if (cmd === 'reglas') rules();
else if (cmd === 'partidas') partidas();
else if (cmd === 'maestro') maestro();
else if (cmd === 'velocidad') speed();
else if (cmd === 'liga') league(+(process.argv[3] || 4), +(process.argv[4] || 0), +(process.argv[5] || 0), +(process.argv[6] || 1));
else if (cmd === 'partida') {
  const g = play(LEVELS[+(process.argv[3] || 0)], DEF_LEVELS[+(process.argv[4] || 1)], 77, true);
  console.log(g.toString(), g.result);
}
process.exit(fails ? 1 : 0);
