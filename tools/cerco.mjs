// El Cerco (el juego del Rey), en la consola: comprueba las reglas, mide la
// IA y juega partidas de prueba entre niveles.
//   node tools/cerco.mjs reglas          comprueba capturas, trono, rey y huida
//   node tools/cerco.mjs velocidad       nodos por segundo y profundidad
//   node tools/cerco.mjs liga n rey rival k   n partidas: el Rey (nivel 0-2) contra un rival de
//                                        prueba de los de dentro (0-3); k escala los tiempos
//   node tools/cerco.mjs partida rey rival una partida, jugada a jugada
import { Cerco, ATT, DEF, KING, EMPTY, N, mv, mvName, mTo } from '../src/game/cerco/rules.js';
import { Brain, WIN } from '../src/game/cerco/ai.js';
import { LEVELS, DEF_LEVELS, moveOpts } from '../src/game/cerco/levels.js';

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
else if (cmd === 'velocidad') speed();
else if (cmd === 'liga') league(+(process.argv[3] || 4), +(process.argv[4] || 0), +(process.argv[5] || 0), +(process.argv[6] || 1));
else if (cmd === 'partida') {
  const g = play(LEVELS[+(process.argv[3] || 0)], DEF_LEVELS[+(process.argv[4] || 1)], 77, true);
  console.log(g.toString(), g.result);
}
process.exit(fails ? 1 : 0);
