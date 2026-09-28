// Biblioteca de síntesis: buffers generados en JS (ruidos, respuestas de
// impulso de salas, cuerdas pulsadas Karplus-Strong, campanas aditivas,
// tambores, gotas, cadenas). Todo se calcula una vez y se guarda en caché.

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

// Pequeño generador pseudoaleatorio con semilla (sonidos reproducibles).
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SoundLib {
  constructor(ctx) {
    this.ctx = ctx;
    this.sr = ctx.sampleRate;
    this.cache = new Map();
  }

  _buf(ch, sec) {
    return this.ctx.createBuffer(ch, Math.max(1, Math.floor(this.sr * sec)), this.sr);
  }
  _get(key, make) {
    let b = this.cache.get(key);
    if (!b) {
      b = make();
      this.cache.set(key, b);
    }
    return b;
  }

  // ------------------------------------------------------------ ruidos
  noise(kind = 'white', sec = 2) {
    return this._get('noise:' + kind + ':' + sec, () => {
      const b = this._buf(1, sec);
      const d = b.getChannelData(0);
      let last = 0,
        b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === 'white') d[i] = w;
        else if (kind === 'brown') {
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        } else {
          // rosa (Paul Kellet)
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856;
          b4 = 0.55 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        }
      }
      // fundido en los extremos para que el bucle no chasquee
      const f = Math.min(400, d.length >> 3);
      for (let i = 0; i < f; i++) {
        const k = i / f;
        d[i] *= k;
        d[d.length - 1 - i] *= k;
      }
      return b;
    });
  }

  // Crepitar de fuego: fondo grave + chasquidos.
  crackle(sec = 6) {
    return this._get('crackle', () => {
      const b = this._buf(1, sec);
      const d = b.getChannelData(0);
      let low = 0;
      for (let i = 0; i < d.length; i++) {
        low = low * 0.995 + (Math.random() * 2 - 1) * 0.005;
        d[i] = low * 5;
      }
      for (let k = 0; k < sec * 55; k++) {
        const p = Math.floor(Math.random() * (d.length - 900));
        const a = rnd(0.15, 1) * (Math.random() < 0.1 ? 1.9 : 1);
        const len = Math.floor(rnd(30, 500));
        const tone = Math.random() < 0.3 ? rnd(1500, 4000) : 0;
        for (let i = 0; i < len; i++) {
          const e = Math.exp(-i / (len * 0.22));
          d[p + i] += ((Math.random() * 2 - 1) * 0.8 + (tone ? Math.sin((TAU * tone * i) / this.sr) * 0.5 : 0)) * a * e;
        }
      }
      return b;
    });
  }

  // Estática del miedo: siseo con ráfagas.
  static(sec = 4) {
    return this._get('static', () => {
      const b = this._buf(1, sec);
      const d = b.getChannelData(0);
      let env = 0;
      for (let i = 0; i < d.length; i++) {
        if (Math.random() < 0.0004) env = rnd(0.4, 1);
        env *= 0.9995;
        d[i] = (Math.random() * 2 - 1) * (0.25 + env * 0.75) * (Math.random() < 0.002 ? 3 : 1);
      }
      return b;
    });
  }

  // ------------------------------------------------------------ salas
  // Respuesta de impulso: reflexiones tempranas + cola difusa que se oscurece
  // con el tiempo (las altas se apagan antes, como en la piedra).
  ir(kind) {
    const P = {
      room: { sec: 1.1, decay: 3.2, damp: 0.55, early: 6, pre: 0.004, spread: 0.02 },
      hall: { sec: 2.2, decay: 2.2, damp: 0.35, early: 8, pre: 0.012, spread: 0.05 },
      cathedral: { sec: 4.6, decay: 1.8, damp: 0.25, early: 10, pre: 0.03, spread: 0.12 },
      crypt: { sec: 3.0, decay: 2.0, damp: 0.5, early: 12, pre: 0.008, spread: 0.04 },
      street: { sec: 1.8, decay: 3.6, damp: 0.45, early: 5, pre: 0.02, spread: 0.08 },
      open: { sec: 2.4, decay: 4.2, damp: 0.6, early: 3, pre: 0.04, spread: 0.18 },
    }[kind];
    return this._get('ir:' + kind, () => {
      const b = this._buf(2, P.sec);
      const n = b.length;
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        const r = mulberry(1234 + c * 77 + kind.length);
        let lp = 0;
        for (let i = 0; i < n; i++) {
          const t = i / n;
          const env = Math.pow(1 - t, P.decay) * Math.exp(-t * 1.5);
          // el filtro paso bajo se va cerrando: cola cada vez más oscura
          const k = 1 - Math.min(0.97, P.damp + t * (1 - P.damp) * 0.9);
          lp += (r() * 2 - 1 - lp) * k;
          d[i] = lp * env * (i < 200 ? i / 200 : 1);
        }
        // reflexiones tempranas discretas
        for (let e = 0; e < P.early; e++) {
          const at = Math.floor((P.pre + r() * P.spread) * this.sr);
          if (at < n) d[at] += (r() < 0.5 ? -1 : 1) * rnd(0.3, 0.8) * (1 - e / P.early);
        }
      }
      return b;
    });
  }

  // ------------------------------------------------------------ instrumentos
  // Cuerda pulsada (Karplus-Strong con amortiguación y posición de púa):
  // salterio, arpa, laúd. bright: 0..1 brillo; decay en segundos aprox.
  pluck(freq, o = {}) {
    const bright = o.bright ?? 0.5,
      dur = o.dur ?? 3.2;
    const key = 'pluck:' + freq.toFixed(2) + ':' + bright + ':' + dur;
    return this._get(key, () => {
      const b = this._buf(1, dur);
      const d = b.getChannelData(0);
      const sr = this.sr;
      const N = Math.max(2, Math.round(sr / freq));
      const buf = new Float32Array(N);
      const r = mulberry(Math.round(freq * 100));
      // excitación: ruido filtrado según el brillo, con muesca de la posición de púa
      let lp = 0;
      for (let i = 0; i < N; i++) {
        const w = r() * 2 - 1;
        lp += (w - lp) * (0.25 + bright * 0.7);
        buf[i] = lp;
      }
      const pick = Math.max(1, Math.floor(N * 0.13));
      for (let i = N - 1; i >= pick; i--) buf[i] -= buf[i - pick] * 0.6;
      // factor de pérdida por vuelta para ~dur segundos de caída
      const loss = Math.pow(0.001, 1 / (dur * freq));
      const damp = 0.5 - bright * 0.12;
      let idx = 0,
        prev = 0;
      let body1 = 0,
        body2 = 0;
      for (let i = 0; i < d.length; i++) {
        const cur = buf[idx];
        const next = buf[(idx + 1) % N];
        const v = (cur * (1 - damp) + next * damp) * loss;
        buf[idx] = v;
        idx = (idx + 1) % N;
        // resonancia de caja (pasabanda suave ~ 220 Hz) para cuerpo de madera
        body1 += (cur - body1) * 0.06;
        body2 += (body1 - body2) * 0.06;
        d[i] = cur * 0.85 + (body1 - body2) * 1.6 + (prev - cur) * 0.05;
        prev = cur;
      }
      // ataque suave para evitar el chasquido
      for (let i = 0; i < 64 && i < d.length; i++) d[i] *= i / 64;
      fadeTail(d, 0.1);
      normalize(d, 0.8);
      return b;
    });
  }

  // Campana de iglesia: parciales inarmónicos con caídas distintas y batido.
  bell(freq, o = {}) {
    const dur = o.dur ?? 7,
      kind = o.kind ?? 'church';
    return this._get('bell:' + kind + ':' + freq.toFixed(2) + ':' + dur, () => {
      const b = this._buf(2, dur);
      const sr = this.sr;
      const P =
        kind === 'church'
          ? [
              [0.5, 1.0, 1.0],
              [1.0, 0.8, 0.9],
              [1.183, 0.55, 0.7],
              [1.506, 0.35, 0.55],
              [2.0, 0.6, 0.45],
              [2.514, 0.25, 0.3],
              [2.662, 0.2, 0.25],
              [3.011, 0.18, 0.2],
              [4.166, 0.12, 0.13],
              [5.433, 0.08, 0.09],
              [6.796, 0.05, 0.06],
            ]
          : [
              // campanilla/cascabel: más aguda y breve
              [1.0, 1.0, 0.8],
              [2.76, 0.5, 0.35],
              [5.4, 0.3, 0.2],
              [8.93, 0.15, 0.1],
              [13.3, 0.08, 0.06],
            ];
      for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        const r = mulberry(Math.round(freq * 13) + c);
        for (const [ratio, amp, decK] of P) {
          const f = freq * ratio * (1 + (r() - 0.5) * 0.002);
          if (f > sr * 0.45) continue;
          const beat = 0.6 + r() * 1.4; // batido lento entre parciales gemelos
          const tau = dur * decK * 0.45;
          const dec = Math.exp(-1 / (tau * sr));
          // dos fasores que giran (más barato que Math.sin por muestra)
          const w = (TAU * f) / sr,
            wb = (TAU * (f + beat)) / sr;
          const cw = Math.cos(w),
            sw = Math.sin(w),
            cb = Math.cos(wb),
            sb = Math.sin(wb);
          const p0 = r() * TAU,
            p1 = r() * TAU;
          let x0 = Math.cos(p0),
            y0 = Math.sin(p0),
            x1 = Math.cos(p1),
            y1 = Math.sin(p1);
          let e = amp;
          const floor = amp * 0.0005;
          for (let i = 0; i < d.length; i++) {
            d[i] += (y0 + y1 * 0.45) * e;
            const nx0 = x0 * cw - y0 * sw;
            y0 = x0 * sw + y0 * cw;
            x0 = nx0;
            const nx1 = x1 * cb - y1 * sb;
            y1 = x1 * sb + y1 * cb;
            x1 = nx1;
            e *= dec;
            if (e < floor) break;
          }
        }
        // golpe del badajo
        for (let i = 0; i < sr * 0.02; i++) d[i] += (r() * 2 - 1) * (1 - i / (sr * 0.02)) * 0.5;
        for (let i = 0; i < 48; i++) d[i] *= i / 48;
        fadeTail(d, 0.3);
      }
      normalize2(b, 0.85);
      return b;
    });
  }

  // Tambores. kind: taiko (grave de guerra), frame (pandero/bodhrán),
  // tabor (tamboril con bordón), thud (golpe apagado), heart (latido), rim
  drum(kind) {
    return this._get('drum:' + kind, () => {
      const sr = this.sr;
      const dur = { taiko: 1.6, frame: 0.7, tabor: 0.45, thud: 0.5, heart: 0.9, rim: 0.12, gong: 5 }[kind];
      const b = this._buf(1, dur);
      const d = b.getChannelData(0);
      const r = mulberry(kind.length * 97);
      let ph = 0,
        lp = 0,
        bp1 = 0,
        bp2 = 0;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        let v = 0;
        if (kind === 'taiko') {
          const f = 48 + 70 * Math.exp(-t * 16);
          ph += (TAU * f) / sr;
          v = Math.sin(ph) * Math.exp(-t * 3.2) * 1.1 + Math.sin(ph * 2.3) * Math.exp(-t * 9) * 0.25;
          lp += (r() * 2 - 1 - lp) * 0.05;
          v += lp * Math.exp(-t * 20) * 2.2;
        } else if (kind === 'frame') {
          const f = 90 + 90 * Math.exp(-t * 30);
          ph += (TAU * f) / sr;
          v = Math.sin(ph) * Math.exp(-t * 7) * 0.9;
          lp += (r() * 2 - 1 - lp) * 0.2;
          v += lp * Math.exp(-t * 35) * 0.9;
        } else if (kind === 'tabor') {
          const f = 190 + 80 * Math.exp(-t * 40);
          ph += (TAU * f) / sr;
          v = Math.sin(ph) * Math.exp(-t * 16) * 0.6;
          // bordón: ruido áspero algo más largo
          const w = r() * 2 - 1;
          bp1 += (w - bp1) * 0.45;
          bp2 += (bp1 - bp2) * 0.45;
          v += (bp1 - bp2) * Math.exp(-t * 11) * 1.3;
        } else if (kind === 'thud') {
          const f = 70 + 40 * Math.exp(-t * 25);
          ph += (TAU * f) / sr;
          v = Math.sin(ph) * Math.exp(-t * 9);
          lp += (r() * 2 - 1 - lp) * 0.08;
          v += lp * Math.exp(-t * 30) * 1.2;
        } else if (kind === 'heart') {
          // lub-dub
          for (const [t0, a, f0] of [
            [0, 1, 55],
            [0.28, 0.7, 48],
          ]) {
            const tt = t - t0;
            if (tt < 0) continue;
            v += Math.sin(TAU * (f0 + 25 * Math.exp(-tt * 30)) * tt) * Math.exp(-tt * 14) * a;
          }
        } else if (kind === 'rim') {
          v = (r() * 2 - 1) * Math.exp(-t * 90) * 0.7 + Math.sin(TAU * 1700 * t) * Math.exp(-t * 60) * 0.5;
        } else if (kind === 'gong') {
          for (const [rt, a] of [
            [1, 1],
            [1.47, 0.6],
            [2.09, 0.4],
            [2.56, 0.3],
            [3.1, 0.2],
          ])
            v += Math.sin(TAU * 58 * rt * t + Math.sin(t * 3 * rt) * 0.4) * a * Math.exp(-t * (0.6 + rt * 0.3));
          v *= 0.5;
          lp += (r() * 2 - 1 - lp) * 0.1;
          v += lp * Math.exp(-t * 12) * 0.8;
        }
        d[i] = v;
      }
      for (let i = 0; i < 24; i++) d[i] *= i / 24;
      fadeTail(d, 0.12);
      normalize(d, 0.9);
      return b;
    });
  }

  // Gota de agua: burbuja con subida rápida de tono.
  drip(freq) {
    return this._get('drip:' + Math.round(freq), () => {
      const sr = this.sr;
      const b = this._buf(1, 0.35);
      const d = b.getChannelData(0);
      let ph = 0;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const f = freq * (1 + t * 9);
        ph += (TAU * f) / sr;
        d[i] = Math.sin(ph) * Math.exp(-t * 26) * (i < 30 ? i / 30 : 1);
      }
      return b;
    });
  }

  // Cadena que se sacude: muchos clics metálicos.
  chain(sec = 1.2) {
    return this._get('chain:' + sec, () => {
      const sr = this.sr;
      const b = this._buf(1, sec);
      const d = b.getChannelData(0);
      const r = mulberry(4711);
      const n = Math.floor(sec * 38);
      for (let k = 0; k < n; k++) {
        const at = Math.floor(r() * (d.length - sr * 0.05));
        const f = 2200 + r() * 3500;
        const a = 0.2 + r() * 0.8;
        for (let i = 0; i < sr * 0.04; i++) {
          const t = i / sr;
          d[at + i] += (Math.sin(TAU * f * t) * 0.6 + Math.sin(TAU * f * 2.71 * t) * 0.3 + (r() * 2 - 1) * 0.3) * a * Math.exp(-t * 120);
        }
      }
      normalize(d, 0.8);
      return b;
    });
  }
}

// Fundido de coseno en la última fracción del buffer (evita chasquidos al cortar).
function fadeTail(d, frac) {
  const n = Math.floor(d.length * frac);
  const s = d.length - n;
  for (let i = 0; i < n; i++) d[s + i] *= 0.5 + 0.5 * Math.cos((Math.PI * i) / n);
}

function normalize(d, peak) {
  let m = 0;
  for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
  if (m > 0) {
    const k = peak / m;
    for (let i = 0; i < d.length; i++) d[i] *= k;
  }
}
function normalize2(b, peak) {
  let m = 0;
  for (let c = 0; c < b.numberOfChannels; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
  }
  if (m > 0)
    for (let c = 0; c < b.numberOfChannels; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] *= peak / m;
    }
}

// Frecuencia de una nota MIDI.
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Modos (semitonos desde la tónica).
export const MODES = {
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  ionian: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygianDom: [0, 1, 4, 5, 7, 8, 10],
};

// Grado de la escala (0 = tónica, puede ser negativo o pasar de 6) -> MIDI.
export function degree(root, mode, deg) {
  const m = MODES[mode];
  const o = Math.floor(deg / 7);
  const i = ((deg % 7) + 7) % 7;
  return root + o * 12 + m[i];
}
