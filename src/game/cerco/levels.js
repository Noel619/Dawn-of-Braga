// La fuerza del Rey en cada una de sus partidas: se apaga según juega. En la
// primera busca hondo y no regala nada; en la segunda, a veces juega cansado
// (menos hondo y viendo peor: una jugada peor que la mejor, nunca una que
// pierda en el acto); en la tercera, más a menudo.
//   depth, ms: profundidad máxima y tiempo de la búsqueda
//   noise: ruido de la evaluación (puntos; una pieza de los de fuera vale 100)
//   jitter: variedad en la raíz (que no juegue siempre igual)
//   tired: probabilidad de jugar cansado, y entonces tiredOpts
export const LEVELS = [
  { depth: 6, ms: 1500, noise: 0, jitter: 6, tired: 0 },
  { depth: 5, ms: 1100, noise: 10, jitter: 10, tired: 0.18, tiredOpts: { depth: 2, ms: 300, noise: 70 } },
  { depth: 4, ms: 800, noise: 22, jitter: 14, tired: 0.32, tiredOpts: { depth: 2, ms: 250, noise: 110 } },
];

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
