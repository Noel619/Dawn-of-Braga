// Quien le busca las jugadas al Rey: el hilo de fondo (ai_worker.js) y, si el
// navegador no deja abrirlo, el hilo principal con poco tiempo (algo más
// flojo, sin parones).
import AIWorker from './ai_worker.js?worker&inline';
import { Brain } from './ai.js';

export class Thinker {
  constructor() {
    this.worker = null;
    this.noWorker = false;
    this.seq = 0;
    this.wait = new Map();
    this.brain = null;
  }
  _w() {
    if (this.worker || this.noWorker) return this.worker;
    try {
      this.worker = new AIWorker();
      this.worker.onmessage = (ev) => {
        const { id, ok, r, error } = ev.data;
        const cb = this.wait.get(id);
        this.wait.delete(id);
        if (cb) ok ? cb.res(r) : cb.rej(new Error(error));
      };
      this.worker.onerror = (e) => {
        console.warn('[cerco] el hilo de fondo falló; el Rey piensa en el principal', e.message || e);
        this.noWorker = true;
        const pend = [...this.wait.values()];
        this.wait.clear();
        this.worker = null;
        for (const cb of pend) cb.retry();
      };
    } catch (e) {
      this.noWorker = true;
      this.worker = null;
    }
    return this.worker;
  }
  // La jugada para 'state' (lo que devuelve Cerco.save()): una promesa con
  // { move, score, depth, nodes, ms }.
  think(state, opts) {
    return new Promise((res, rej) => {
      const local = () =>
        setTimeout(() => {
          try {
            this.brain = this.brain || new Brain(16);
            res(this.brain.think(state, { ...opts, ms: Math.min(opts.ms ?? 1000, 220), depth: Math.min(opts.depth ?? 6, 4) }));
          } catch (e) {
            rej(e);
          }
        }, 0);
      const w = this._w();
      if (!w) return local();
      const id = ++this.seq;
      this.wait.set(id, { res, rej, retry: local });
      w.postMessage({ id, state, opts });
    });
  }
}
