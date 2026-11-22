// Entrena la cabeza del Físico (la red de sus tácticas: game/fisico_mente.js)
// contra los jugadores de prueba del simulador (tools/fisico_sim.mjs), con
// estrategias evolutivas: cada generación prueba muchas variaciones pequeñas de
// la red (y sus contrarias) en las mismas peleas, y la mueve hacia las que
// mejor le salen. No hace falta tarjeta gráfica: en un ordenador normal, con
// los núcleos que tenga.
//
// Lo que se premia y lo que se castiga, en fisico_sim.mjs (valor): dar sin
// que le den, dormirte; no los golpes al aire ni quedarse lejos sin pelear.
// Y lo que no podría hacer una persona no lo puede hacer él: ve con un cuarto
// de segundo de retraso, sostiene lo que decide, no amaga sin parar
// (fisico_mente.js).
//
//   node tools/entrena_fisico.mjs [generaciones] [desde: red.json] [salida]
//   (por omisión: 300 generaciones, desde cero, a src/game/fisico_red.json)
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import os from 'os';
import fs from 'fs';
import { pelea, valor, ESTILOS, estilo, historiaDe, rng32 } from './fisico_sim.mjs';
import { Red, N_IN, N_OUT, OPCIONES } from '../src/game/fisico_mente.js';

const NH = 32;
const NP = Red.tam(N_IN, NH, N_OUT);

// el ruido de una variación (siempre el mismo para la misma semilla)
function ruido(seed, out) {
  const r = rng32(seed);
  for (let i = 0; i < out.length; i += 2) {
    let u = r();
    if (u < 1e-12) u = 1e-12;
    const v = r();
    const m = Math.sqrt(-2 * Math.log(u));
    out[i] = m * Math.cos(2 * Math.PI * v);
    if (i + 1 < out.length) out[i + 1] = m * Math.sin(2 * Math.PI * v);
  }
  return out;
}

// Una pelea de un escenario: el estilo, su semilla, con cuánta vida empieza él
// y lo que tiene apuntado de ese jugador.
function juega(red, E) {
  const r = rng32(E.seed ^ 0x9e3779b9);
  const S = estilo(E.estilo, r);
  const H = E.hist > 0 ? historiaDe(S, E.hist, r) : null;
  const st = pelea({ red, estiloObj: S, seed: E.seed, vida: E.vida, historia: H, tmax: E.tmax || 200 });
  return st;
}

if (!isMainThread) {
  // ------------------------------------------------------------ un núcleo
  const p = new Float32Array(NP);
  const eps = new Float32Array(NP);
  parentPort.on('message', (m) => {
    const theta = new Float32Array(m.theta);
    const out = [];
    for (const T of m.tareas) {
      if (T.seed == null) p.set(theta);
      else {
        ruido(T.seed, eps);
        for (let i = 0; i < NP; i++) p[i] = theta[i] + T.signo * m.sigma * eps[i];
      }
      const red = T.manual ? null : Red.plana(p, N_IN, NH, N_OUT);
      let v = 0;
      const det = { dado: 0, recibido: 0, muertes: 0, aire: 0, duerme: 0, vencido: 0, t: 0, amagos: 0, retenidos: 0, ops: new Array(N_OUT).fill(0) };
      const esc = T.esc || m.escenarios;
      for (const E of esc) {
        const st = juega(red, E);
        v += valor(st);
        if (T.detalle) {
          det.dado += st.dado;
          det.recibido += st.recibido;
          det.muertes += st.muertes;
          det.aire += st.aire;
          det.duerme += st.duerme;
          det.vencido += st.fin === 'vencido' ? 1 : 0;
          det.t += st.t;
          det.amagos += st.amagos;
          det.retenidos += st.retenidos;
          st.ops.forEach((x, k) => (det.ops[k] += x));
        }
      }
      out.push({ id: T.id, v: v / esc.length, n: esc.length, det: T.detalle ? det : null });
    }
    parentPort.postMessage(out);
  });
} else {
  // ------------------------------------------------------------ el entrenamiento
  const GEN = +(process.argv[2] || 300);
  const desde = process.argv[3] && process.argv[3] !== '-' ? process.argv[3] : null;
  const salida = process.argv[4] || new URL('../src/game/fisico_red.json', import.meta.url).pathname;
  const POB = 48; // variaciones por generación (la mitad, contrarias)
  const ESC = 12; // peleas de cada variación
  const SIGMA = 0.05;
  // (lo que se mueve en cada paso: de 0,03 a 0,008, poco a poco)
  const LR0 = 0.03,
    LR1 = 0.008;
  const DECAY = 0.002;
  const NW = Math.max(1, Math.min(os.cpus().length, 8));
  const workers = Array.from({ length: NW }, () => new Worker(new URL(import.meta.url)));
  const corre = (theta, tareas, escenarios, sigma) =>
    new Promise((res) => {
      const parts = Array.from({ length: NW }, () => []);
      tareas.forEach((T, i) => parts[i % NW].push(T));
      let pend = 0;
      const out = [];
      parts.forEach((p, i) => {
        if (!p.length) return;
        pend++;
        const w = workers[i];
        const on = (m) => {
          w.off('message', on);
          out.push(...m);
          if (--pend === 0) res(out);
        };
        w.on('message', on);
        w.postMessage({ theta: Array.from(theta), tareas: p, escenarios, sigma });
      });
    });
  const nombres = Object.keys(ESTILOS);
  const r = rng32(20261122);
  const escenario = (seed) => {
    const q = r();
    return { estilo: nombres[Math.floor(r() * nombres.length)], seed, vida: q < 0.7 ? 1 : q < 0.85 ? 0.5 : 0.25, hist: r() < 0.6 ? 5 + Math.floor(r() * 30) : 0 };
  };
  // las peleas de la prueba (siempre las mismas): de cada estilo, tantas
  const VAL = [];
  let vs = 900001;
  for (const e of nombres) for (let i = 0; i < 12; i++) VAL.push({ estilo: e, seed: vs++, vida: i < 8 ? 1 : i < 10 ? 0.5 : 0.25, hist: i % 2 ? 20 : 0 });
  // de dónde se empieza
  let theta = new Float32Array(NP);
  if (desde) {
    const J = Red.ajusta(JSON.parse(fs.readFileSync(desde, 'utf8')));
    const R = new Red(J);
    let k = 0;
    for (const a of [R.w1, R.b1, R.w2, R.b2]) for (const v of a) theta[k++] = v;
    console.log('desde', desde);
  } else {
    const ri = rng32(7);
    const g = () => {
      const u = Math.max(1e-12, ri());
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * ri());
    };
    let k = 0;
    for (let i = 0; i < N_IN * NH; i++) theta[k++] = g() * Math.sqrt(1 / N_IN);
    k += NH;
    for (let i = 0; i < NH * N_OUT; i++) theta[k++] = g() * 0.05;
  }
  const m1 = new Float32Array(NP),
    m2 = new Float32Array(NP);
  const b1 = 0.9,
    b2 = 0.999;
  const eps = new Float32Array(NP);
  const grad = new Float32Array(NP);
  const guarda = (th, meta) => {
    const R = Red.plana(Float32Array.from(th), N_IN, NH, N_OUT);
    fs.writeFileSync(salida, JSON.stringify(R.toJSON(meta)) + '\n');
  };
  // la prueba: las mismas peleas siempre, repartidas entre los núcleos
  const prueba = async (th, manual = false) => {
    const k = Math.ceil(VAL.length / NW);
    const tareas = [];
    for (let i = 0; i < NW; i++) tareas.push({ id: i, seed: null, manual, detalle: true, esc: VAL.slice(i * k, (i + 1) * k) });
    const res = (await corre(th, tareas.filter((x) => x.esc.length), VAL, 0)).sort((a, b) => a.id - b.id);
    const det = { dado: 0, recibido: 0, muertes: 0, aire: 0, duerme: 0, vencido: 0, t: 0, amagos: 0, retenidos: 0, ops: new Array(N_OUT).fill(0) };
    let v = 0;
    for (const x of res) {
      v += x.v * x.n;
      for (const key in det) {
        if (key === 'ops') x.det.ops.forEach((q, j) => (det.ops[j] += q));
        else det[key] += x.det[key];
      }
    }
    return { v: v / VAL.length, det };
  };
  const resumen = (a) => {
    const n = VAL.length;
    const d = a.det;
    const tot = d.ops.reduce((x, y) => x + y, 0) || 1;
    const top = d.ops
      .map((v, k) => [OPCIONES[k], v])
      .sort((x, y) => y[1] - x[1])
      .slice(0, 7)
      .map(([k, v]) => `${k} ${Math.round((v / tot) * 100)}`)
      .join(' ');
    return `valor ${a.v.toFixed(3)} · te quita ${(d.dado / n).toFixed(0)} · le quitas ${(d.recibido / n).toFixed(0)} · caes ${(d.muertes / n).toFixed(2)} · aire ${(d.aire / n).toFixed(1)} · duerme ${(d.duerme / n).toFixed(2)} · amagos ${(d.amagos / n).toFixed(1)} · ret ${(d.retenidos / n).toFixed(1)} · ${(d.t / n).toFixed(0)} s · vence ${d.vencido}/${n} · ${top}`;
  };
  const man = await prueba(theta, true);
  console.log('a mano  ', resumen(man));
  let mejor = await prueba(theta);
  console.log('inicio  ', resumen(mejor));
  let mejorV = mejor.v;
  const log = [];
  const t0 = Date.now();
  for (let gen = 1; gen <= GEN; gen++) {
    const esc = Array.from({ length: ESC }, () => escenario(Math.floor(r() * 2 ** 31)));
    const semillas = Array.from({ length: POB / 2 }, () => Math.floor(r() * 2 ** 31));
    const tareas = [];
    semillas.forEach((s, i) => {
      tareas.push({ id: 2 * i, seed: s, signo: 1 });
      tareas.push({ id: 2 * i + 1, seed: s, signo: -1 });
    });
    const res = await corre(theta, tareas, esc, SIGMA);
    res.sort((a, b) => a.id - b.id);
    // las notas, por puesto (de -0,5 a 0,5)
    const orden = res.map((x, i) => [x.v, i]).sort((a, b) => a[0] - b[0]);
    const nota = new Float32Array(POB);
    orden.forEach(([, i], k) => (nota[i] = k / (POB - 1) - 0.5));
    grad.fill(0);
    semillas.forEach((s, i) => {
      ruido(s, eps);
      const w = nota[2 * i] - nota[2 * i + 1];
      for (let j = 0; j < NP; j++) grad[j] += w * eps[j];
    });
    const LR = LR1 + (LR0 - LR1) * 0.5 * (1 + Math.cos((Math.PI * (gen - 1)) / GEN));
    for (let j = 0; j < NP; j++) {
      const g = -grad[j] / (POB * SIGMA) + DECAY * theta[j];
      m1[j] = b1 * m1[j] + (1 - b1) * g;
      m2[j] = b2 * m2[j] + (1 - b2) * g * g;
      const mh = m1[j] / (1 - b1 ** gen),
        vh = m2[j] / (1 - b2 ** gen);
      theta[j] -= (LR * mh) / (Math.sqrt(vh) + 1e-8);
    }
    const media = res.reduce((a, x) => a + x.v, 0) / res.length;
    log.push({ gen, media });
    if (gen % 10 === 0 || gen === GEN) {
      const a = await prueba(theta);
      const nuevo = a.v > mejorV;
      if (nuevo) {
        mejorV = a.v;
        mejor = a;
        guarda(theta, { entrenada: new Date().toISOString().slice(0, 10), generaciones: gen, valor: +a.v.toFixed(3), aMano: +man.v.toFixed(3), contra: nombres, oculta: NH });
      }
      console.log(`gen ${String(gen).padStart(4)} · ${((Date.now() - t0) / 1000 / 60).toFixed(1)} min · media ${media.toFixed(3)} · prueba ${resumen(a)}${nuevo ? ' · guardada' : ''}`);
    } else if (gen % 2 === 0) console.log(`gen ${String(gen).padStart(4)} · media ${media.toFixed(3)}`);
  }
  console.log('mejor   ', resumen(mejor));
  for (const w of workers) w.terminate();
}
