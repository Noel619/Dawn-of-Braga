// Los cocimientos del Desfigurado.
//
// Lo que se cosecha en lo hondo (game/cloacas.js: el musgo de luz, la raíz
// amarga, la flor de lo hondo) se cuece en la mesa de su botica, en el
// Vergel (world/vergel.js), cuando él te la ha dejado (desf:cocimientos: al
// hablarle de su cura). Dos cocimientos:
//  - el verde, el flojo: dos de musgo y una de raíz; el aliento vuelve casi
//    el doble de deprisa, un rato corto. Se llevan tres como mucho;
//  - el negro, el fuerte: la flor, dos de raíz y dos de musgo; el aliento
//    vuelve casi el triple de deprisa y se anda más ligero, un rato largo. Se
//    lleva uno como mucho.
// Se beben con su tecla (1 y 2; en el mando, la cruz a izquierda y derecha),
// como una ampolla, y lo que se bebe se pierde: no se rellenan al descansar
// ni al caer (son objetos del inventario, no ampollas). El efecto, en el
// jugador (entities/player.js: tonico).
// En la mesa se echan al puchero de uno en uno y, según lo que hay dentro, va
// saliendo uno u otro (queSale); cuando es justo su receta, se cuece. La
// pantalla, en game/mesa.js.
import { MSG } from './story.js';

export const TONICOS = {
  verde: { item: 'cocimiento_verde', max: 3, st: 1.85, vel: 1, dur: 40, receta: [['musgo_luz', 2], ['raiz_amarga', 1]] },
  negro: { item: 'cocimiento_negro', max: 1, st: 2.7, vel: 1.15, dur: 60, receta: [['flor_hondo', 1], ['raiz_amarga', 2], ['musgo_luz', 2]] },
};
export const INGREDIENTES = ['musgo_luz', 'raiz_amarga', 'flor_hondo'];

// ¿Se puede cocer? null si sí; si no, por qué.
export function noSePuede(g, tipo) {
  const T = TONICOS[tipo];
  const inv = g.inventory;
  if (inv.count(T.item) >= T.max) return 'lleno';
  for (const [id, n] of T.receta) if (inv.count(id) < n) return 'falta';
  return null;
}

// (el sonido lo pone la mesa: el hervor y, al cuajar, el del objeto)
export function cocer(g, tipo) {
  const T = TONICOS[tipo];
  if (noSePuede(g, tipo)) return false;
  for (const [id, n] of T.receta) g.inventory.add(id, -n);
  g.inventory.add(T.item, 1);
  g.saveGame && g.saveGame();
  return true;
}

// ---------------------------------------------------------------- el puchero
// En la mesa (game/mesa.js) los ingredientes se echan al puchero de uno en
// uno; lo que hay dentro es una lista, en el orden en que se echó. Caben los
// de la receta más larga.
export const CABEN = Math.max(...Object.values(TONICOS).map((T) => T.receta.reduce((s, [, n]) => s + n, 0)));

// lo que hay en el puchero, por ingredientes: { musgo_luz: 2, ... }
export function cuenta(puchero) {
  const c = {};
  for (const id of puchero) c[id] = (c[id] || 0) + 1;
  return c;
}

// Lo que va saliendo con lo que hay en el puchero:
//  - vacio: no hay nada;
//  - tipo: el cocimiento al que va (el de la receta más cercana: antes la que
//    se completa sólo echando, luego la que pide sacar menos y luego la que
//    pide menos en total; a igualdad, el verde);
//  - listo: lo de dentro es justo su receta; falta y sobra: [[id, n]], lo que
//    hay que echar o sacar para que lo sea;
//  - otro: el otro cocimiento, si también se llega a él echando más (con el
//    verde hecho, el negro: la flor y otra raíz): { tipo, falta };
//  - lleno: de ése ya se llevan los que caben.
export function queSale(g, puchero) {
  if (!puchero.length) return { vacio: true, tipo: null, listo: false, falta: [], sobra: [], otro: null, lleno: false };
  const c = cuenta(puchero);
  const ops = Object.keys(TONICOS).map((tipo, orden) => {
    const pide = Object.fromEntries(TONICOS[tipo].receta);
    const falta = [],
      sobra = [];
    for (const id of INGREDIENTES) {
      const d = (pide[id] || 0) - (c[id] || 0);
      if (d > 0) falta.push([id, d]);
      else if (d < 0) sobra.push([id, -d]);
    }
    const suma = (l) => l.reduce((s, [, n]) => s + n, 0);
    return { tipo, falta, sobra, orden, nS: suma(sobra), n: suma(falta) + suma(sobra) };
  });
  ops.sort((a, b) => (a.nS > 0) - (b.nS > 0) || a.nS - b.nS || a.n - b.n || a.orden - b.orden);
  const [q] = ops;
  const otro = ops.find((o) => o !== q && !o.nS);
  const T = TONICOS[q.tipo];
  return {
    vacio: false,
    tipo: q.tipo,
    listo: !q.falta.length && !q.sobra.length,
    falta: q.falta,
    sobra: q.sobra,
    otro: otro ? { tipo: otro.tipo, falta: otro.falta } : null,
    lleno: g.inventory.count(T.item) >= T.max,
  };
}

// Cuece lo que hay en el puchero si es justo una receta (y cabe): el tipo, o
// null.
export function cocerPuchero(g, puchero) {
  const q = queSale(g, puchero);
  if (!q.listo || q.lleno) return null;
  return cocer(g, q.tipo) ? q.tipo : null;
}

// La mesa: se abre su pantalla (game/mesa.js). Si él no te la ha dejado, no
// se toca.
export function abrirMesa(g, it) {
  if (!g.flags['desf:cocimientos']) {
    g.ui.toast(MSG.mesaAjena, 5);
    return;
  }
  const p = g.player;
  if (it) p.playInteract('interact', Math.atan2(it.x - p.pos.x, it.z - p.pos.z));
  const s = g.ui.open('mesa', { onBack: () => g.ui.close() });
  g.state = 'paused';
  s.data.onClose = () => {
    if (g.state === 'paused') g.state = 'play';
  };
}
