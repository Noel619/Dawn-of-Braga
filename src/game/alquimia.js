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
import { ITEMS, MSG } from './story.js';

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

export function cocer(g, tipo) {
  const T = TONICOS[tipo];
  if (noSePuede(g, tipo)) return false;
  for (const [id, n] of T.receta) g.inventory.add(id, -n);
  g.inventory.add(T.item, 1);
  g.audio && g.audio.play('heal', g.player.pos);
  g.saveGame && g.saveGame();
  return true;
}

const nombre = (id, n) => {
  const it = ITEMS[id];
  return n + ' de ' + it.name.toLowerCase().replace(/^(la|el) /, '');
};
export function recetaTexto(tipo) {
  return TONICOS[tipo].receta.map(([id, n]) => nombre(id, n)).join(', ');
}

// La mesa: el menú (cocer el verde, cocer el negro, dejarla), con lo que
// llevas y lo que hace falta. Si él no te la ha dejado, no se toca.
export function abrirMesa(g, it) {
  if (!g.flags['desf:cocimientos']) {
    g.ui.toast(MSG.mesaAjena, 5);
    return;
  }
  const p = g.player;
  p.playInteract('interact', Math.atan2(it.x - p.pos.x, it.z - p.pos.z));
  const entries = () => {
    const out = [];
    for (const tipo of ['verde', 'negro']) {
      const T = TONICOS[tipo];
      const why = noSePuede(g, tipo);
      const lleva = g.inventory.count(T.item);
      out.push({
        label: `${ITEMS[T.item].name} (${lleva}/${T.max})`,
        off: !!why,
        action: () => {
          if (cocer(g, tipo)) {
            g.ui.toast(MSG.cocido(ITEMS[T.item].name), 4);
            s.data.info = info();
            g.ui.setMenu(s, entries());
            g.ui.renderMesaInfo(s);
          }
        },
      });
    }
    out.push({ label: 'Dejar la mesa', action: () => g.ui.close() });
    return out;
  };
  const info = () => {
    const inv = g.inventory;
    const lineas = [];
    lineas.push('Llevas: ' + ['musgo_luz', 'raiz_amarga', 'flor_hondo'].map((id) => `${ITEMS[id].name.toLowerCase()} ${inv.count(id)}`).join(' · ') + '.');
    for (const tipo of ['verde', 'negro']) {
      const T = TONICOS[tipo];
      const why = noSePuede(g, tipo);
      lineas.push(`${ITEMS[T.item].name}: ${recetaTexto(tipo)}.` + (why === 'lleno' ? ' Ya llevas los que caben.' : why === 'falta' ? ' Te falta.' : ''));
    }
    return lineas;
  };
  const s = g.ui.open('mesa', { entries: entries(), info: info(), onBack: () => g.ui.close() });
  g.ui.renderMesaInfo(s);
  g.state = 'paused';
  s.data.onClose = () => {
    if (g.state === 'paused') g.state = 'play';
  };
}
