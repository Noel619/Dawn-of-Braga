// El Cerco: lo que ve el Rey en tus jugadas (para explicártelas si juegas
// mal). Sin búsqueda: sólo lo que se ve a una jugada, que es lo que se puede
// explicar señalando una casilla con el dedo.
//   escape  tu rey tenía una línea libre hasta las afueras y no salió
//   fork    tu rey podía ponerse donde ve dos salidas (y no lo atrapan allí)
//   king    tu rey se ha quedado donde lo atrapo a la siguiente
//   hang    la que has movido (u otra) se ha quedado donde la cojo en medio
//   throne  tu rey lleva mucho en su trono
// y lo bueno: la horquilla, la salida que obliga a tapar, la que mata.
import { ATT, DEF, KING, EMPTY, SQ, THRONE, RAYS, NB, isEdge, mFrom, mTo, mv } from './rules.js';
import { kingCanBeTaken } from './partidas.js';

// Las líneas libres del rey si estuviera en 'at' (con 'from' vacía): sus
// casillas del borde, una por línea.
function linesFrom(b, at, from = -1) {
  const out = [];
  const was = from >= 0 ? b[from] : 0;
  if (from >= 0) b[from] = EMPTY;
  for (let d = 0; d < 4; d++) {
    const ray = RAYS[at][d];
    if (!ray.length) continue;
    let ok = true;
    for (let j = 0; j < ray.length; j++)
      if (b[ray[j]] !== EMPTY) {
        ok = false;
        break;
      }
    if (ok) out.push(ray[ray.length - 1]);
  }
  if (from >= 0) b[from] = was;
  return out;
}
// La primera jugada de los de fuera que atrapa al rey (o -1).
function takeKingMove(g) {
  if (g.turn !== ATT || g.king < 0) return -1;
  const k = g.king;
  for (const m of g.moves()) {
    const to = mTo(m);
    if (NB[to * 4] !== k && NB[to * 4 + 1] !== k && NB[to * 4 + 2] !== k && NB[to * 4 + 3] !== k) continue;
    const u = g.make(m);
    const won = g.result && g.result.winner === ATT;
    g.unmake(u);
    if (won) return m;
  }
  return -1;
}
// Las de dentro que los de fuera pueden coger a la siguiente: casilla ->
// la jugada que la coge.
function hanging(g) {
  const out = new Map();
  if (g.turn !== ATT) return out;
  for (const m of g.moves()) {
    const u = g.make(m);
    for (let i = 0; i < u.caps.length; i += 2) if (u.caps[i + 1] === DEF && !out.has(u.caps[i])) out.set(u.caps[i], m);
    g.unmake(u);
  }
  return out;
}

// Mira tu jugada m en g (antes de hacerla; mueven los de dentro). Devuelve
// { bad: [...], good: [...] }: cada cosa, { kind, sq: casillas que señalar,
// line: casillas de la línea (para marcarlas), m: la jugada que se le
// escapó o con la que te castiga }.
export function examine(g, m, stillKing = 0) {
  const bad = [],
    good = [];
  if (g.turn !== DEF || g.result) return { bad, good };
  const b = g.b;
  const k = g.king;
  const from = mFrom(m),
    to = mTo(m);
  const p = b[from];
  // lo que había antes de mover
  const open = k >= 0 ? linesFrom(b, k) : [];
  let fork = null;
  if (k >= 0 && !open.length) {
    for (const t of g.targets(k)) {
      const ls = linesFrom(b, t, k);
      if (ls.length < 2) continue;
      // (que no lo atrapen allí mismo)
      const c = g.clone();
      c.make(mv(k, t));
      if (kingCanBeTaken(c)) continue;
      fork = { sq: t, ls };
      break;
    }
  }
  // (lo que podían hacerte ya: si movieran ellos)
  const was = g.clone();
  was.turn = ATT;
  was.rehash();
  const hangBefore = hanging(was);
  const dangerBefore = kingCanBeTaken(was);
  // la jugada
  const c = g.clone();
  const u = c.make(m);
  const won = c.result && c.result.winner === DEF;
  if (won) {
    good.push({ kind: 'win', sq: [to] });
    return { bad, good };
  }
  const caps = u.caps.length / 2;
  if (caps) good.push({ kind: 'take', sq: [to], n: caps });
  const after = c.king >= 0 ? linesFrom(c.b, c.king) : [];
  if (after.length >= 2) {
    // (una horquilla de verdad, que no le cogen el rey en el acto: nada que
    // explicar)
    good.push({ kind: 'fork', sq: [c.king], line: after });
    if (!kingCanBeTaken(c)) return { bad, good };
  } else if (after.length === 1) good.push({ kind: 'threat', sq: [c.king], line: after });
  // lo malo, de más grave a menos
  if (open.length) bad.push({ kind: 'escape', sq: [open[0]], line: open, from: k, m: mv(k, open[0]) });
  else if (fork && after.length < 2) bad.push({ kind: 'fork', sq: [fork.sq], line: fork.ls, from: k, m: mv(k, fork.sq) });
  // (aunque se asome a las afueras: si lo pueden atrapar, lo atrapan)
  const tk = takeKingMove(c);
  // (walked: se ha metido él; si no, ya lo estaba y no lo has sacado)
  if (tk >= 0) bad.push({ kind: 'king', sq: [mTo(tk), c.king], m: tk, walked: p === KING || !dangerBefore });
  // (si ha matado, es un cambio: no se cuenta)
  const hangAfter = caps ? new Map() : hanging(c);
  for (const [sq, hm] of hangAfter) {
    if (hangBefore.has(sq) && sq !== to) continue;
    // (la que acaba de mover, o una que ha dejado sin amparo)
    bad.push({ kind: 'hang', sq: [sq, mTo(hm)], m: hm, moved: sq === to });
    break;
  }
  if (p !== KING && stillKing >= 10 && k === THRONE) bad.push({ kind: 'throne', sq: [k] });
  return { bad, good };
}
