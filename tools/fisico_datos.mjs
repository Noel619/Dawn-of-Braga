// Lo que se sabe de la pelea con el Físico en su sala, para el simulador
// (fisico_sim.mjs), sus jugadores de prueba (fisico_bot.mjs) y el banco de
// pruebas en el motor (fisicobanco.mjs): la sala y sus muebles, los golpes de
// él y los del jugador (copiados del juego: de dónde, en cada sitio), y los
// estilos de los jugadores de prueba.
import { Historia } from '../src/game/fisico_historia.js';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ------------------------------------------------------------ la sala
export const SALA = { x0: 57.2, z0: 34.6, x1: 65.4, z1: 50.8 };
// (los muebles: x0, z0, x1, z1)
export const OBST = [
  [60.22, 41.74, 62.38, 42.66], // la mesa
  [61.85, 42.35, 62.35, 42.85], // su taburete
  [63.2, 46.6, 64.0, 47.4], // el brasero
  [57.5, 35.6, 59.3, 36.4], // el banco del norte
  [63.94, 35.62, 64.86, 37.58], // los camastros
  [63.94, 38.22, 64.86, 40.18],
  [63.94, 40.82, 64.86, 42.78],
  [63.94, 43.42, 64.86, 45.38],
  [64.72, 49.62, 65.28, 50.18],
  [62.3, 34.57, 64.3, 34.93], // el armario
  [58.65, 48.4, 60.55, 49.2], // el arcón
];
export const BRASERO_ANTE = [62.75, 46.35];
export const SALE = { x: 61.3, z: 50.2 };
export const EN_SU_MESA = { x: 60.2, z: 43.4 };
export const ENTRA = { x: 58.4, z: 44.0 };
export const HUECO = { x: 61.3, z: 50.6 };

// ------------------------------------------------------------ los golpes
// (entities/fisico.js: FI_ATTACKS; los de la pelea)
export const TIPO = { contundente: 0.1, cortante: 0.16, perforante: 0.08 };
export const ATK = {
  barrido: { dur: 1.55, min: 0, max: 3.0, hits: [[0.62, 0.8]], dmg: 18, stDmg: 22, range: 3.0, arc: 150, lunge: [[0.58, 0.72, 1.4]], cd: 0.9, tipo: 'contundente' },
  pica: { dur: 1.3, min: 1.2, max: 3.6, hits: [[0.52, 0.64]], dmg: 16, range: 3.7, arc: 28, lunge: [[0.48, 0.6, 3.2]], cd: 0.8, tipo: 'perforante' },
  gancho: { dur: 1.8, min: 2.0, max: 3.9, hits: [], range: 4.0, arc: 40, cd: 0.6, noParry: true, trackUntil: 0.55, ev: [0.64, 0.72], fn: 'engancha' },
  esponja: { dur: 1.7, min: 0, max: 2.5, hits: [], range: 1.6, arc: 60, lunge: [[0.58, 0.8, 4.4]], cd: 1.6, noParry: true, trackUntil: 0.56, ev: [0.72, 0.84], fn: 'esponja' },
  cal: { dur: 1.4, min: 1.4, max: 5.5, hits: [], range: 5.5, arc: 50, cd: 1.8, noParry: true, ev: [0.6], fn: 'cal' },
  sahumerio: { dur: 1.4, min: 1.2, max: 9, hits: [], range: 9, arc: 60, cd: 1.4, noParry: true, ev: [0.6], fn: 'sahumerio' },
  campanilla: { dur: 2.2, min: 0, max: 40, hits: [], range: 40, arc: 360, cd: 1.4, noParry: true, ev: [1.6], fn: 'llama' },
  sierra: { dur: 1.9, min: 0, max: 2.6, hits: [[0.38, 0.5], [0.8, 0.92], [1.26, 1.4]], dmg: 11, stDmg: 16, range: 2.5, arc: 120, lunge: [[0.36, 0.48, 1.2], [0.78, 0.9, 1.0], [1.22, 1.36, 1.4]], cd: 0.7, tipo: 'cortante' },
  lanceta: { dur: 1.1, min: 0.8, max: 3.2, hits: [[0.42, 0.54]], dmg: 14, range: 2.6, arc: 40, lunge: [[0.36, 0.5, 3.4]], cd: 0.5, tipo: 'perforante' },
  trepano: { dur: 1.6, min: 0, max: 2.4, hits: [], range: 1.6, arc: 50, lunge: [[0.55, 0.72, 3.6]], cd: 1.0, noParry: true, trackUntil: 0.5, ev: [0.66, 0.76], fn: 'taladra' },
  cauterio: { dur: 1.55, min: 0, max: 3.0, hits: [[0.62, 0.8]], dmg: 17, stDmg: 24, range: 2.9, arc: 150, lunge: [[0.58, 0.72, 1.4]], cd: 0.8, ev: [0.76], fn: 'prende' },
  cauterioPica: { dur: 1.3, min: 1.2, max: 3.6, hits: [[0.52, 0.64]], dmg: 16, range: 3.4, arc: 28, lunge: [[0.48, 0.6, 3.2]], cd: 0.7, ev: [0.62], fn: 'prende' },
};
for (const k in ATK) {
  const a = ATK[k];
  a.name = k;
  a.first = a.hits.length ? a.hits[0][0] : a.ev ? a.ev[0] : a.dur * 0.5;
  a.lastHit = a.hits.length ? a.hits[a.hits.length - 1][1] : a.ev ? a.ev[a.ev.length - 1] : a.first;
  a.track = a.trackUntil ?? a.first - 0.05;
}
// cuánto se adelanta al apuntar adonde sueles rodar (lo que cabe en el arco)
export const APUNTA = { barrido: 26, pica: 10, sierra: 20, lanceta: 12, cauterio: 26, cauterioPica: 10, esponja: 14, trepano: 10, gancho: 8 };
// ¿Lo tiene a mano? (las condiciones de FI_ATTACKS, sin la distancia)
export function puede(F, t, k) {
  const D = F.D;
  switch (k) {
    case 'barrido':
    case 'pica':
      return F.fase === 1;
    case 'sahumerio':
      return F.fase === 1 && t - D.humoT > 14;
    case 'gancho':
      return F.fase <= 1 && t - D.hookT > 4;
    case 'esponja':
      return F.fase <= 1 && t - D.spongeT > 9;
    case 'cal':
      return F.fase === 3 && t - D.calT > 9;
    case 'sierra':
    case 'lanceta':
      return F.fase === 2;
    case 'trepano':
      return F.fase === 2 && t - D.trepT > 8;
    case 'cauterio':
    case 'cauterioPica':
      return F.fase === 3;
  }
  return false;
}

// los golpes del jugador (la espada de la guardia)
export const PL = {
  light: [
    { dur: 0.62, hit: [0.18, 0.3], dmg: 20, st: 13, range: 2.35, arc: 130, lunge: [0.06, 0.28, 2.8], cancel: 0.34, poise: 18 },
    { dur: 0.6, hit: [0.17, 0.29], dmg: 22, st: 13, range: 2.35, arc: 130, lunge: [0.06, 0.26, 2.6], cancel: 0.33, poise: 18 },
    { dur: 0.84, hit: [0.3, 0.42], dmg: 31, st: 17, range: 2.5, arc: 80, lunge: [0.22, 0.4, 3.6], cancel: 0.56, poise: 32 },
  ],
  heavy: { dur: 1.05, hit: [0.46, 0.6], dmg: 54, st: 30, range: 2.65, arc: 90, lunge: [0.4, 0.58, 3.8], cancel: 0.8, poise: 70, heavy: true },
  riposte: { dur: 0.84, hit: [0.3, 0.42], dmg: 108, st: 0, range: 2.6, arc: 120, lunge: [0.22, 0.4, 2.0], cancel: 0.84, poise: 0, riposte: true },
};
export const RESISTE = 0.8; // (cortante: el Físico aguanta un 20 %)

// ------------------------------------------------------------ los jugadores de prueba
// reac: lo que tarda en ver (s); sigma: lo que yerra al medir un golpe (s);
// bias: lo que se adelanta (s); pRueda/pDesvia/pCubre: lo que hace al ver
// venir un golpe (si no, nada); lado: a su izquierda, derecha, atrás, hacia
// él; lectura: lo que no se deja engañar (amago, golpe retenido); agresion:
// lo que castiga y golpea; combo: golpes seguidos; pesado: los fuertes;
// curaHp: con cuánta vida bebe; curaDist: a qué distancia de él (0, donde
// sea); huye: si huye herido; distancia: la que guarda; mash: pulsaciones por
// segundo al forcejear.
export const ESTILOS = {
  agresivo: { reac: 0.24, sigma: 0.09, bias: 0.05, pRueda: 0.6, pDesvia: 0.05, pCubre: 0.1, lado: [0.4, 0.4, 0.1, 0.1], lectura: 0.3, agresion: 0.95, combo: 3, pesado: 0.15, curaHp: 0.3, curaDist: 0, huye: 0, distancia: 2.2, mash: 7 },
  cauto: { reac: 0.22, sigma: 0.07, bias: 0.08, pRueda: 0.85, pDesvia: 0.0, pCubre: 0.08, lado: [0.35, 0.35, 0.25, 0.05], lectura: 0.5, agresion: 0.45, combo: 2, pesado: 0.1, curaHp: 0.45, curaDist: 5, huye: 0, distancia: 3.6, mash: 7 },
  desviador: { reac: 0.2, sigma: 0.06, bias: 0.03, pRueda: 0.2, pDesvia: 0.7, pCubre: 0.05, lado: [0.35, 0.35, 0.2, 0.1], lectura: 0.5, agresion: 0.65, combo: 2, pesado: 0.2, curaHp: 0.35, curaDist: 4, huye: 0, distancia: 2.6, mash: 7.5 },
  rodadorI: { reac: 0.23, sigma: 0.08, bias: 0.16, pRueda: 0.9, pDesvia: 0.0, pCubre: 0.05, lado: [0.82, 0.08, 0.05, 0.05], lectura: 0.25, agresion: 0.7, combo: 3, pesado: 0.1, curaHp: 0.35, curaDist: 3, huye: 0, distancia: 2.6, mash: 7 },
  rodadorD: { reac: 0.23, sigma: 0.08, bias: 0.16, pRueda: 0.9, pDesvia: 0.0, pCubre: 0.05, lado: [0.08, 0.82, 0.05, 0.05], lectura: 0.25, agresion: 0.7, combo: 3, pesado: 0.1, curaHp: 0.35, curaDist: 3, huye: 0, distancia: 2.6, mash: 7 },
  escudero: { reac: 0.22, sigma: 0.08, bias: 0.1, pRueda: 0.15, pDesvia: 0.05, pCubre: 0.75, lado: [0.3, 0.3, 0.3, 0.1], lectura: 0.35, agresion: 0.6, combo: 2, pesado: 0.1, curaHp: 0.35, curaDist: 3, huye: 0, distancia: 2.3, mash: 6.5 },
  bebedor: { reac: 0.24, sigma: 0.09, bias: 0.08, pRueda: 0.7, pDesvia: 0.05, pCubre: 0.1, lado: [0.4, 0.4, 0.15, 0.05], lectura: 0.3, agresion: 0.7, combo: 2, pesado: 0.1, curaHp: 0.6, curaDist: 0, huye: 0, distancia: 2.6, mash: 7 },
  huidizo: { reac: 0.23, sigma: 0.08, bias: 0.1, pRueda: 0.8, pDesvia: 0.0, pCubre: 0.1, lado: [0.35, 0.35, 0.25, 0.05], lectura: 0.35, agresion: 0.6, combo: 2, pesado: 0.1, curaHp: 0.45, curaDist: 6, huye: 1, distancia: 3.0, mash: 7 },
  novato: { reac: 0.34, sigma: 0.16, bias: 0.18, pRueda: 0.6, pDesvia: 0.05, pCubre: 0.15, lado: [0.45, 0.3, 0.2, 0.05], lectura: 0.05, agresion: 0.6, combo: 3, pesado: 0.1, curaHp: 0.3, curaDist: 0, huye: 0, distancia: 2.4, mash: 5 },
  veterano: { reac: 0.18, sigma: 0.045, bias: 0.0, pRueda: 0.55, pDesvia: 0.35, pCubre: 0.05, lado: [0.3, 0.3, 0.15, 0.25], lectura: 0.75, agresion: 0.75, combo: 2, pesado: 0.25, curaHp: 0.4, curaDist: 5, huye: 0, distancia: 2.8, mash: 8.5 },
};
// Un jugador de un estilo, con algo de lo suyo (±15 %).
export function estilo(nombre, r) {
  const B = ESTILOS[nombre];
  const S = { nombre };
  for (const k in B) {
    if (Array.isArray(B[k])) {
      const a = B[k].map((v) => Math.max(0.01, v * (0.8 + r() * 0.4)));
      const s = a.reduce((x, y) => x + y, 0);
      S[k] = a.map((v) => v / s);
    } else if (typeof B[k] === 'number') S[k] = B[k] * (0.85 + r() * 0.3);
  }
  S.combo = Math.round(clamp(S.combo, 1, 3));
  S.huye = B.huye;
  return S;
}
// Lo que tendría apuntado de él tras haberle visto otras veces (n: cuántos
// golpes): lo que haría un jugador así, a ojo, con su ruido.
export function historiaDe(S, n, r) {
  const H = new Historia();
  const D = H.d;
  const reac = n * (S.pRueda + S.pDesvia + S.pCubre);
  const roll = n * S.pRueda;
  D.vistos = n;
  D.rueda.l = roll * S.lado[0] * (0.8 + r() * 0.4);
  D.rueda.r = roll * S.lado[1] * (0.8 + r() * 0.4);
  D.rueda.b = roll * S.lado[2];
  D.rueda.f = roll * S.lado[3];
  const pp = clamp((S.bias + 0.04) / 0.32, 0.03, 0.9) * (1 - S.lectura * 0.3);
  D.tiempo.pronto = reac * pp;
  D.tiempo.justo = reac * (1 - pp) * 0.85;
  D.tiempo.tarde = reac * (1 - pp) * 0.15;
  D.desvia.n = n * S.pDesvia;
  D.desvia.ok = D.desvia.n * clamp(0.75 - S.sigma * 2.5, 0.1, 0.8);
  D.desvia.pronto = D.desvia.n * pp;
  D.cubre.n = n * S.pCubre;
  D.bebe.n = 1 + n * 0.08;
  D.bebe.hp = D.bebe.n * S.curaHp;
  D.bebe.cerca = S.curaDist < 3 ? D.bebe.n * 0.7 : D.bebe.n * 0.15;
  D.huye = S.huye ? 1 + n * 0.05 : 0;
  D.golpes.t = n * 2.4;
  D.golpes.n = (n * 2.4 * S.agresion * 30) / 60;
  D.golpes.rachas = D.golpes.n / Math.max(1, S.combo);
  D.golpes.largo = D.golpes.n;
  D.peleas = 1;
  return H;
}

