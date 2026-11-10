// La fuerza del Rey en cada una de sus partidas: se apaga según juega. En la
// primera busca hondo, con tiempo, y no regala nada (antes pensaba la mitad y
// con más variedad: se dejaba ganar); en la segunda, a veces juega cansado
// (menos hondo y viendo peor: una jugada peor que la mejor, nunca una que
// pierda en el acto); en la tercera, más a menudo.
//   depth, ms: profundidad máxima y tiempo de la búsqueda
//   noise: ruido de la evaluación (puntos; una pieza de los de fuera vale 100)
//   jitter: variedad en la raíz (que no juegue siempre igual)
//   tired: probabilidad de jugar cansado, y entonces tiredOpts
export const LEVELS = [
  { depth: 8, ms: 2400, noise: 0, jitter: 3, tired: 0 },
  { depth: 6, ms: 1800, noise: 8, jitter: 8, tired: 0.15, tiredOpts: { depth: 3, ms: 500, noise: 50 } },
  { depth: 5, ms: 1300, noise: 16, jitter: 12, tired: 0.28, tiredOpts: { depth: 2, ms: 350, noise: 90 } },
];
// Lo que se deja llevar por una partida que recuerda (en la apertura): sigue
// su jugada si no es peor que la mejor en más de esto (puntos).
export const BOOK_BONUS = 30;
export const BOOK_PLIES = 14;

// Las opciones de la búsqueda para esta jugada (rnd: 0..1).
export function moveOpts(level, rnd) {
  const L = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, level))];
  const tired = L.tired > 0 && rnd < L.tired;
  const o = tired ? { ...L, ...L.tiredOpts } : { ...L };
  delete o.tiredOpts;
  delete o.tired;
  o.isTired = tired;
  return o;
}

// Rivales de prueba para los de dentro (tools/cerco.mjs).
export const DEF_LEVELS = [
  { depth: 1, ms: 300, noise: 0, jitter: 15 },
  { depth: 2, ms: 400, noise: 0, jitter: 12 },
  { depth: 3, ms: 900, noise: 0, jitter: 10 },
  { depth: 4, ms: 1500, noise: 0, jitter: 8 },
];
