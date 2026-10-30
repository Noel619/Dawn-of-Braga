// El Rey piensa en un hilo de fondo (game/cerco/thinker.js): así la mesa, el
// Rey y su tos siguen vivos mientras busca.
import { Brain } from './ai.js';

const brain = new Brain();
self.onmessage = (ev) => {
  const { id, state, opts } = ev.data;
  try {
    self.postMessage({ id, ok: true, r: brain.think(state, opts) });
  } catch (e) {
    self.postMessage({ id, ok: false, error: String((e && e.message) || e) });
  }
};
