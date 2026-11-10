// Las partidas que recuerda el Rey (game/cerco/partidas.js), simuladas con la
// IA del Cerco: cada una con sus jugadores (la IA a su fuerza, o con sus
// manías: el niño que juega al tuntún, el alcaide que no saca el rey, la
// reina que mueve la misma arriba y abajo...) y lo que tiene que pasar en ella
// (quién gana, cómo y hacia qué jugada). Prueba semillas hasta dar con una que
// lo cumpla y escribe las jugadas en src/game/cerco/partidas_jugadas.js.
// (Lo que cuenta el Rey de cada una y el libro de Mestre Alberto, en
// story.js, PARTIDAS y NOTES.partidas, dicen lo que pasa en éstas: cuántas
// jugadas, cuántas mató cada uno, dónde atraparon al rey... Si se vuelven a
// simular, hay que repasarlos.)
//   node tools/partidas.mjs            todas
//   node tools/partidas.mjs hijo       una (y las demás, como estaban)
//   node tools/partidas.mjs ver hijo   una, jugada a jugada (sin escribir)
import { writeFileSync, existsSync } from 'node:fs';
import { Cerco, ATT, DEF, KING, N, SQ, THRONE, THRONE_ADJ, mFrom, mTo, mvName, sqName, isEdge, NB } from '../src/game/cerco/rules.js';
import { Brain } from '../src/game/cerco/ai.js';

const OUT = new URL('../src/game/cerco/partidas_jugadas.js', import.meta.url);

// ------------------------------------------------------------ jugadores
// (todos deterministas: la IA con tope de nodos, y el azar con la semilla)
const brains = new Map();
const brain = (k) => brains.get(k) || (brains.set(k, new Brain(16)), brains.get(k));
// la IA a una fuerza: { depth, nodes, noise, jitter }; open: más variedad en
// las primeras jugadas (que no empiecen todas igual)
const ai =
  (o, open = 0) =>
  (g, rnd) => {
    const jitter = g.ply < open ? Math.max(o.jitter || 0, 40) : o.jitter || 0;
    return brain(g.turn).think(g, { ms: 1e9, ...o, jitter, seed: (rnd() * 4294967296) >>> 0 }).move;
  };
// sin la jugada que pierde en el acto (si hay otra)
function safe(g, ms) {
  const me = g.turn;
  const ok = ms.filter((m) => {
    const c = g.clone();
    c.play(m);
    if (c.result) return c.result.winner !== (me === ATT ? DEF : ATT);
    // ¿el otro gana a la siguiente?
    for (const r of c.moves()) {
      const u = c.make(r);
      const lost = !!c.result && !!c.result.winner && c.result.winner !== me;
      c.unmake(u);
      if (lost) return false;
    }
    return true;
  });
  return ok.length ? ok : ms;
}
// al tuntún, pero sin regalar la partida en el acto
const tuntun = () => (g, rnd) => {
  const ms = safe(g, g.moves());
  return ms[Math.floor(rnd() * ms.length)];
};
// la IA, pero sin mover al rey (si tiene otra cosa que mover)
const sinRey =
  (o) =>
  (g, rnd) => {
    const ms = g.moves().filter((m) => g.b[mFrom(m)] !== KING);
    if (!ms.length) return ai(o)(g, rnd);
    const br = brain('sinRey');
    // (la IA elige; si elige el rey, la mejor de las otras a poca profundidad)
    const r = br.think(g, { ms: 1e9, ...o, seed: (rnd() * 4294967296) >>> 0 }).move;
    if (g.b[mFrom(r)] !== KING) return r;
    let best = ms[0],
      bs = -Infinity;
    for (const m of ms) {
      const c = g.clone();
      c.play(m);
      if (c.result && c.result.winner === ATT) continue;
      const s = -br.think(c, { depth: 2, nodes: 40000, ms: 1e9 }).score;
      if (s > bs) {
        bs = s;
        best = m;
      }
    }
    return best;
  };
// la que mata siempre que puede (con el rey, mejor), y si no, la IA
const matador =
  (o) =>
  (g, rnd) => {
    let best = -1,
      bc = 0;
    for (const m of safe(g, g.moves())) {
      const c = g.clone();
      const u = c.make(m);
      const n = u.caps.length / 2 + (g.b[mFrom(m)] === KING && u.caps.length ? 0.5 : 0);
      if (n > bc) {
        bc = n;
        best = m;
      }
    }
    return best >= 0 ? best : ai(o)(g, rnd);
  };
// la que, desde la jugada 'from', mueve la misma pieza adelante y atrás (y
// si el otro también la deshace, tablas)
const vaiven = (o, from) => (g, rnd, H) => {
  if (g.ply < from) return ai(o)(g, rnd);
  // la última suya: la deshace (si se puede)
  const mine = H.filter((h) => h.side === g.turn);
  const last = mine[mine.length - 1];
  if (last) {
    const back = mTo(last.m) * SQ + mFrom(last.m);
    if (g.legal(back)) {
      const c = g.clone();
      c.play(back);
      if (!c.result || c.result.winner !== (g.turn === ATT ? DEF : ATT)) return back;
    }
  }
  return ai(o)(g, rnd);
};

// ------------------------------------------------------------ lo que pasa
// ¿se cerró el cerco? (el rey no llega a las afueras ni pasando por los suyos)
function closed(g) {
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

// ------------------------------------------------------------ las partidas
// att / def: los jugadores; want(g, H): si la partida vale; stop: hasta qué
// jugada (la que quedó a medias); tries: cuántas semillas probar.
const FUERTE = { depth: 5, nodes: 500000, jitter: 6 };
const MEDIO = { depth: 4, nodes: 250000, jitter: 10 };
const FLOJO = { depth: 2, nodes: 40000, noise: 40, jitter: 20 };
const caps = (H, side) => H.reduce((n, h) => n + (h.side === side ? h.caps : 0), 0);
const kingSq = (H) => {
  const last = H[H.length - 1];
  return last ? last.kingAt : -1;
};
const P = {
  // su padre (fuera) contra él, de niño (dentro): se lo coge pronto, en medio
  banco: { att: ai(FUERTE, 4), def: ai({ depth: 1, nodes: 8000, noise: 90, jitter: 60 }, 4), want: (g, H) => g.result && g.result.winner === ATT && g.ply <= 34 && !THRONE_ADJ.includes(kingSq(H)) && kingSq(H) !== THRONE },
  // él (fuera) contra su hijo, de once años (dentro): horquilla y fuera
  hijo: {
    att: ai({ depth: 3, nodes: 120000, jitter: 14 }, 4),
    def: ai({ depth: 4, nodes: 400000, jitter: 6 }, 4),
    want: (g, H) => g.result && g.result.winner === DEF && g.ply >= 30 && g.ply <= 90 && H.some((h) => h.p === KING && h.lines >= 2),
  },
  // él (fuera) contra la reina (dentro): la misma arriba y abajo, y tablas
  reina: { att: vaiven(MEDIO, 30), def: vaiven({ depth: 2, nodes: 50000, jitter: 20 }, 28), want: (g) => g.result && g.result.reason === 'repeat' && g.ply >= 34 },
  // él (fuera) contra el alcaide (dentro), que no saca el rey: en su trono
  alcaide: { att: ai(FUERTE, 4), def: sinRey({ depth: 3, nodes: 120000, jitter: 8 }), want: (g, H) => g.result && g.result.winner === ATT && kingSq(H) === THRONE },
  // él (fuera) contra Don Gonçalo (dentro): mata mucho, con el rey también
  goncalo: {
    att: ai({ depth: 3, nodes: 90000, jitter: 12 }, 4),
    def: matador({ depth: 2, nodes: 40000, jitter: 16 }),
    // (de las que pierde, la que más mata: con el rey, y dos de un golpe, mejor)
    want: (g, H) => g.result && g.result.winner === ATT && caps(H, DEF) >= 3 && kingSq(H) !== THRONE,
    best: (g, H) => caps(H, DEF) + 3 * H.filter((h) => h.p === KING && h.caps > 0).length + 3 * H.filter((h) => h.side === DEF && h.caps >= 2).length,
    tries: 30,
  },
  // el arzobispo (fuera) contra él (dentro): cierra el cerco despacio
  arzobispo: { att: ai(FUERTE, 4), def: ai({ depth: 3, nodes: 150000, jitter: 10 }, 4), want: (g, H) => g.result && g.result.winner === ATT && g.ply >= 40 && H.some((h) => h.closed) },
  // él (fuera) contra Mestre Alberto, el canciller (dentro): la más larga
  // (best: de las que valen, la que más puntúe; aquí, la más larga)
  canciller: { att: ai({ depth: 4, nodes: 150000, jitter: 8 }, 4), def: ai({ depth: 4, nodes: 150000, jitter: 8 }, 4), want: (g) => g.result && g.result.winner === ATT && g.ply >= 72, best: (g) => g.ply, tries: 24 },
  // él (fuera) contra el pequeño (dentro): le deja la puerta abierta
  pequeno: { att: tuntun(), def: ai({ depth: 2, nodes: 30000, noise: 30, jitter: 20 }, 2), want: (g) => g.result && g.result.winner === DEF && g.ply >= 14 && g.ply <= 40 },
  // él (fuera) contra el pequeño (dentro), la noche de la campana: a medias
  campana: { att: ai(MEDIO, 4), def: ai({ depth: 3, nodes: 100000, jitter: 12 }, 4), stop: 37, want: (g) => !g.result && g.ply === 37 },
  // un cruzado de Colonia (fuera) contra él (dentro), en el real de Lisboa
  lisboa: { att: ai(FUERTE, 4), def: ai({ depth: 3, nodes: 150000, jitter: 10 }, 4), want: (g, H) => g.result && g.result.winner === ATT && g.ply >= 30 && caps(H, ATT) >= 3 },
};

function simulate(id, seed) {
  const S = P[id];
  const g = new Cerco();
  let s = seed >>> 0;
  const rnd = () => ((s = (Math.imul(s ^ (s >>> 13), 0x5bd1e995) + 0x9e3779b9) >>> 0) / 4294967296);
  const H = [];
  const stop = S.stop || 999;
  while (!g.result && g.ply < stop) {
    const side = g.turn;
    const m = (side === ATT ? S.att : S.def)(g, rnd, H);
    if (m < 0 || !g.legal(m)) break;
    const p = g.b[mFrom(m)];
    const u = g.play(m);
    H.push({ m, p, side, caps: u.caps.length / 2 - (u.caps.includes(KING) ? 1 : 0), lines: g.openLines(), kingAt: g.king >= 0 ? g.king : u.king, closed: side === ATT && closed(g) });
  }
  // la que iba a jugar (la partida a medias)
  let pend = -1;
  if (!g.result && S.stop) pend = (g.turn === ATT ? S.att : S.def)(g, rnd, H);
  return { g, H, pend };
}

const args = process.argv.slice(2);
const look = args[0] === 'ver';
const only = look ? args.slice(1) : args;
const ids = only.length ? only : Object.keys(P);
const prev = existsSync(OUT) ? (await import(OUT.href)).JUGADAS : {};
const res = { ...prev };
for (const id of ids) {
  const S = P[id];
  if (!S) {
    console.log('¿' + id + '?');
    continue;
  }
  const t0 = Date.now();
  let found = null;
  for (let i = 0; i < (look ? +(process.env.TRIES || 8) : S.tries || 40); i++) {
    const seed = 1000 + i * 7919 + id.length * 131;
    const r = simulate(id, seed);
    if (S.want(r.g, r.H)) {
      if (!S.best) {
        found = { ...r, seed };
        break;
      }
      if (!found || S.best(r.g, r.H) > S.best(found.g, found.H)) found = { ...r, seed };
      process.stdout.write(String(r.g.ply) + ' ');
      continue;
    }
    if (look) {
      const R = r.g.result;
      console.log(`  ${seed}: ${R ? (R.winner === ATT ? 'fuera' : R.winner === DEF ? 'dentro' : 'tablas') + ' ' + R.reason : 'a medias'} en ${r.g.ply}; matan fuera ${caps(r.H, ATT)}, dentro ${caps(r.H, DEF)} (el rey ${r.H.filter((h) => h.p === KING && h.caps).length}); rey en ${kingSq(r.H) >= 0 ? sqName(kingSq(r.H)) : '-'}`);
    } else process.stdout.write('.');
  }
  if (!found) {
    console.log(`\n${id}: ninguna semilla vale (${Math.round((Date.now() - t0) / 1000)} s)`);
    continue;
  }
  const { g, H, pend, seed } = found;
  const str = H.map((h) => sqName(mFrom(h.m)) + sqName(mTo(h.m))).join(' ');
  res[id] = { moves: str, ...(pend >= 0 ? { pend: sqName(mFrom(pend)) + sqName(mTo(pend)) } : {}) };
  console.log(`\n${id}: semilla ${seed}, ${g.ply} jugadas, ${g.result ? (g.result.winner === ATT ? 'ganan los de fuera' : g.result.winner === DEF ? 'ganan los de dentro' : 'tablas') + ' (' + g.result.reason + ')' : 'a medias'} — ${Math.round((Date.now() - t0) / 1000)} s`);
  if (look) {
    H.forEach((h, i) => console.log(i + 1, h.side === ATT ? 'F' : 'D', mvName(h.m), h.caps ? 'mata ' + h.caps : '', h.lines ? 'líneas ' + h.lines : '', h.closed ? 'CERRADO' : ''));
    console.log(g.toString());
    if (pend >= 0) console.log('iba a jugar', mvName(pend));
  }
}
if (!look) {
  const body = Object.entries(res)
    .map(([k, v]) => `  ${k}: { moves: '${v.moves}'${v.pend ? `, pend: '${v.pend}'` : ''} },`)
    .join('\n');
  writeFileSync(
    OUT,
    `// Las jugadas de las partidas que recuerda el Rey: las escribe
// tools/partidas.mjs (simuladas con la IA del Cerco); no se tocan a mano. Lo
// que se busca en ellas, en partidas.js; lo que se cuenta de ellas (story.js:
// PARTIDAS y el libro, NOTES.partidas), de éstas: si cambian, se repasa.
// (casillas como en el ajedrez: columnas a-i, filas 9-1 desde el lado del Rey;
// pend: la que iba a jugar, en la partida que quedó a medias)
export const JUGADAS = {
${body}
};
`
  );
  console.log('escrito', OUT.pathname);
}
