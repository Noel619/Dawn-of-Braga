// Hilo de fondo: calcula la geometría del monolito de la fuente (unos
// cientos de miles de vértices) sin parar el juego. Recibe { seed, opts } y
// devuelve los datos con sus arrays transferidos.
import { monolithData, monoTransfer } from './idol_monolith_geo.js';

self.onmessage = (ev) => {
  const { seed, opts } = ev.data || {};
  try {
    const d = monolithData(seed, opts || {});
    self.postMessage({ ok: true, data: d }, monoTransfer(d));
  } catch (e) {
    self.postMessage({ ok: false, error: String((e && e.stack) || e) });
  }
};
