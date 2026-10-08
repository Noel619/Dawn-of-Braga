// Los colosos del jefe final: se generan una sola vez, en un hilo de fondo,
// en cuanto carga el juego (cuando el jugador llega al final, o pide la
// pelea en el modo de pruebas, ya están hechos). Si el navegador no deja
// abrir el hilo, se generan en el principal (un tirón de unos segundos).
import BuildWorker from './build_worker.js?worker&inline';
import { unpackData, assemble } from './model.js';

export class ColossusBank {
  constructor() {
    this.data = {};
    this.models = {};
    this.jobs = {};
    this.worker = null;
    this.noWorker = false;
    this.seq = 0;
    this.wait = new Map();
  }
  _w() {
    if (this.worker || this.noWorker) return this.worker;
    try {
      this.worker = new BuildWorker();
      this.worker.onmessage = (ev) => {
        const { id, ok, data, error } = ev.data;
        const cb = this.wait.get(id);
        this.wait.delete(id);
        if (cb) ok ? cb.res(data) : cb.rej(new Error(error));
      };
      this.worker.onerror = (e) => {
        console.warn('[colosos] el hilo de fondo falló; se generan en el principal', e.message || e);
        this.noWorker = true;
        for (const cb of this.wait.values()) cb.rej(new Error('worker'));
        this.wait.clear();
        this.worker = null;
      };
    } catch (e) {
      this.noWorker = true;
      this.worker = null;
    }
    return this.worker;
  }
  // Empieza a generarlos de uno en uno (no hace falta esperar).
  warm(kinds = ['turiferario', 'deo']) {
    let p = Promise.resolve();
    for (const k of kinds) p = p.then(() => this.get(k)).catch(() => {});
    return p;
  }
  ready(kind) {
    return !!this.data[kind];
  }
  // Datos de un coloso (promesa; se generan una vez).
  get(kind) {
    if (this.data[kind]) return Promise.resolve(this.data[kind]);
    if (this.jobs[kind]) return this.jobs[kind];
    const t0 = performance.now();
    const viaWorker = () =>
      new Promise((res, rej) => {
        const w = this._w();
        if (!w) return rej(new Error('worker'));
        const id = ++this.seq;
        this.wait.set(id, { res, rej });
        w.postMessage({ id, kind });
      }).then((packed) => unpackData(packed));
    const viaMain = async () => {
      const m = kind === 'turiferario' ? await import('./turiferario.js') : await import('./deo.js');
      return kind === 'turiferario' ? m.turiferarioData() : m.deoData();
    };
    this.jobs[kind] = viaWorker()
      .catch(() => viaMain())
      .then((d) => {
        d.ms = Math.round(performance.now() - t0);
        this.data[kind] = d;
        delete this.jobs[kind];
        return d;
      });
    return this.jobs[kind];
  }
  // El modelo montado (uno por coloso: la pelea lo reutiliza en cada intento).
  async model(kind) {
    if (this.models[kind]) return this.models[kind];
    const d = await this.get(kind);
    if (!this.models[kind]) this.models[kind] = assemble(d, { own: true });
    return this.models[kind];
  }
}
