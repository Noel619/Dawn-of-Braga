// Hilo de fondo: esculpe la estatua de la fuente (unos segundos de cálculo)
// sin parar el juego. Recibe { opts } y devuelve los datos empaquetados con
// sus arrays transferidos.
import { statueData } from './idol_statue_geo.js';
import { packData } from './colossus/model.js';

self.onmessage = (ev) => {
  const { opts } = ev.data || {};
  try {
    const t0 = performance.now();
    const d = statueData(opts || {});
    const [packed, transfer] = packData(d);
    packed.workerMs = Math.round(performance.now() - t0);
    self.postMessage({ ok: true, data: packed }, transfer);
  } catch (e) {
    self.postMessage({ ok: false, error: String((e && e.stack) || e) });
  }
};
