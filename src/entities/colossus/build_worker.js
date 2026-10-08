// Hilo de fondo: genera la geometría de los colosos del jefe final (unos
// segundos de cálculo) sin parar el juego. Recibe { id, kind } y devuelve
// los datos empaquetados con sus arrays transferidos.
import { turiferarioData } from './turiferario.js';
import { deoData } from './deo.js';
import { packData } from './model.js';

const KINDS = { turiferario: turiferarioData, deo: deoData };

self.onmessage = (ev) => {
  const { id, kind, opts } = ev.data || {};
  try {
    const fn = KINDS[kind];
    if (!fn) throw new Error('coloso desconocido: ' + kind);
    const t0 = performance.now();
    const d = fn(opts || {});
    const [packed, transfer] = packData(d);
    packed.workerMs = Math.round(performance.now() - t0);
    self.postMessage({ id, ok: true, data: packed }, transfer);
  } catch (e) {
    self.postMessage({ id, ok: false, error: String((e && e.stack) || e) });
  }
};
