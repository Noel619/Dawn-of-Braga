// Los objetos benditos: las reliquias de los osarios (ver PLAN_OSARIOS.md).
// Cada una favorece una manera de pelear y castiga otra; no suben números a
// secas. Se llevan de una en una (RELIC_SLOTS): se ponen y se quitan en el
// inventario. Sus nombres y lo que hacen, para el jugador, en story.js.

// Cuántas se pueden llevar a la vez.
export const RELIC_SLOTS = 1;

// Lo que cambia en el jugador con cada una (lo que no se dice, como sin nada):
//   blockSt: aguante que cuesta bloquear (×); blockRegen: con la guardia alzada
//   el aguante se recupera como sin ella; chip: el daño que pasa la guardia (×);
//   retaliate: tras parar un golpe, el siguiente tuyo en t segundos hace k veces;
//   rollSt, rollIF, rollDist: la voltereta (su aguante, lo que dura la
//   invulnerabilidad y su alcance, ×); sprintSt: lo que gasta correr (×);
//   perfectDodge: esquivar un golpe en el último instante ralentiza el tiempo y
//   el siguiente golpe en 1,5 s es crítico;
//   hp: vitalidad máxima (×); flask: lo que cura una ampolla (×); taken: el daño
//   que recibes (×); rally: lo que te quitan queda unos segundos en el aire y,
//   golpeando, recuperas esa fracción del daño que haces; atkSpeed: velocidad
//   de tus golpes (×);
//   parryWin: la ventana del parry (×); parrySt: cada parry devuelve todo el
//   aguante; posture: parrys de menos para desequilibrar a los grandes y a los
//   jefes; unbalance: lo que les dura el desequilibrio (×); ripK: el golpe de
//   gracia (×); noBlock: la guardia sólo desvía (no se bloquea).
const BASE = {
  blockSt: 1,
  blockRegen: false,
  chip: 1,
  retaliate: null,
  rollSt: 1,
  rollIF: 1,
  rollDist: 1,
  sprintSt: 1,
  perfectDodge: false,
  hp: 1,
  flask: 1,
  taken: 1,
  rally: 0,
  atkSpeed: 1,
  parryWin: 1,
  parrySt: false,
  posture: 0,
  unbalance: 1,
  ripK: 1,
  noBlock: false,
};

export const RELICS = {
  // la guardia: aguanta y devuelve (en las catacumbas del castillo)
  saeta: { mods: { blockSt: 0.5, blockRegen: true, chip: 0, retaliate: { t: 1.5, k: 1.5 }, rollSt: 2, rollDist: 0.8, parryWin: 0.6 } },
  // la esquiva (en las bodegas del canónigo)
  escapulario: { mods: { rollIF: 1.5, rollSt: 0.6, sprintSt: 0.5, perfectDodge: true, hp: 0.7, blockSt: 1.5 } },
  // aguantar golpeando (en la cripta de la Sé)
  obolo: { mods: { rally: 0.6, atkSpeed: 1.15, flask: 0.5, taken: 1.15 } },
  // el desvío (en la cripta de San Martín): el más fuerte
  cerrojo: { mods: { parryWin: 1.6, parrySt: true, posture: 1, unbalance: 1.4, ripK: 2, noBlock: true } },
};
export const RELIC_IDS = Object.keys(RELICS);

export function relicMods(id) {
  return { ...BASE, ...(id && RELICS[id] ? RELICS[id].mods : {}) };
}
