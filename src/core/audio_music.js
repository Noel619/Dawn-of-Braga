// Música adaptativa 100% sintetizada. Cada zona tiene su tema (modo, tempo,
// instrumentos) con tres capas que se mezclan según la situación:
//   base     -> exploración (dron, coro, salterio, campanas...)
//   tension  -> criaturas cerca (clúster de cuerdas, latido)
//   combat   -> criaturas que te persiguen (tambores, metales, ostinato)
// Los cambios de zona se funden a compás. Instrumentos: órgano (ondas
// periódicas), coro con formantes, cuerdas frotadas, zanfona, metales, salterio
// y arpa (Karplus-Strong), campanas, tambores de guerra, pandero y tamboril.
import { mtof, degree } from './audio_lib.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const chance = (p) => Math.random() < p;

// Formantes de coro masculino (Hz, ancho de banda Hz, ganancia)
const VOWELS = {
  a: [[730, 90, 1], [1090, 110, 0.5], [2440, 160, 0.22]],
  o: [[570, 80, 1], [840, 90, 0.45], [2410, 150, 0.15]],
  u: [[320, 70, 1], [870, 90, 0.3], [2240, 150, 0.1]],
  e: [[530, 80, 1], [1840, 120, 0.4], [2480, 160, 0.2]],
  i: [[290, 70, 1], [2250, 140, 0.35], [3000, 180, 0.2]],
};

export class MusicEngine {
  constructor(ctx, lib, out, verb) {
    this.ctx = ctx;
    this.lib = lib;
    this.out = out; // bus de música
    this.verb = verb; // envío a reverberación
    this.cur = null; // instancia del tema actual
    this.old = [];
    this.tension = 0;
    this.combat = 0;
    this.lookahead = 0.3; // segundos que se programan por adelantado
    this.waves = {};
    this._banks = new WeakMap();
    this._mkWaves();
  }

  // --------------------------------------------------------------- utilidades
  _mkWaves() {
    const ctx = this.ctx;
    const mk = (amps) => {
      const re = new Float32Array(amps.length + 1),
        im = new Float32Array(amps.length + 1);
      amps.forEach((a, i) => (im[i + 1] = a));
      return ctx.createPeriodicWave(re, im, { disableNormalization: false });
    };
    // registros de órgano: flauta, principal, lleno y lengüetería
    this.waves.flute = mk([1, 0.22, 0.05, 0.02]);
    this.waves.principal = mk([1, 0.55, 0.32, 0.2, 0.12, 0.08, 0.05, 0.04]);
    this.waves.full = mk([1, 0.7, 0.5, 0.45, 0.3, 0.25, 0.18, 0.2, 0.1, 0.1, 0.06, 0.08]);
    this.waves.reed = mk([1, 0.9, 0.8, 0.65, 0.55, 0.45, 0.4, 0.33, 0.28, 0.24, 0.2, 0.17, 0.14, 0.12]);
  }

  t() {
    return this.ctx.currentTime;
  }

  // Envolvente ADSR sobre un GainNode ya conectado.
  env(g, t, dur, peak, a = 0.02, r = 0.3, s = 1) {
    const G = g.gain;
    G.setValueAtTime(0.0001, t);
    G.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    if (s !== 1) G.exponentialRampToValueAtTime(Math.max(0.0002, peak * s), t + a + Math.min(0.4, dur * 0.3));
    const end = Math.max(t + a + 0.01, t + dur);
    G.setValueAtTime(Math.max(0.0002, peak * s), end);
    G.exponentialRampToValueAtTime(0.0001, end + r);
    return end + r;
  }

  // Posición estéreo de una nota: la sección se reparte por el panorama.
  _pan(node, v) {
    const p = this.ctx.createStereoPanner();
    p.pan.value = v;
    node.connect(p);
    return p;
  }

  _stop(nodes, at) {
    for (const n of nodes) {
      try {
        n.stop(at + 0.05);
      } catch (e) {}
    }
  }

  // --------------------------------------------------------------- instrumentos
  // Órgano (una onda periódica por nota) con trémolo suave.
  organ(dest, t, dur, midi, vel = 0.1, stop = 'principal', o = {}) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(this.waves[stop]);
    osc.frequency.value = mtof(midi);
    osc.detune.value = rnd(-3, 3);
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = o.cutoff ?? Math.min(9000, mtof(midi) * 9);
    osc.connect(lp).connect(g);
    this._pan(g, o.pan ?? rnd(-0.25, 0.25)).connect(dest);
    const end = this.env(g, t, dur, vel, o.a ?? 0.07, o.r ?? 0.5);
    osc.start(t);
    osc.stop(end + 0.05);
    return osc;
  }

  // Banco de formantes compartido (uno por destino y vocal): las notas del
  // coro solo crean sus osciladores y su envolvente, no sus filtros.
  _bank(dest, vowel, shift) {
    let m = this._banks.get(dest);
    if (!m) {
      m = new Map();
      this._banks.set(dest, m);
    }
    const key = vowel + shift.toFixed(2);
    let input = m.get(key);
    if (!input) {
      const ctx = this.ctx;
      input = ctx.createGain();
      for (const [fr, bw, amp] of VOWELS[vowel] || VOWELS.a) {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = fr * shift;
        bp.Q.value = (fr * shift) / bw;
        const bg = ctx.createGain();
        bg.gain.value = amp * 2.2;
        input.connect(bp).connect(bg).connect(dest);
      }
      m.set(key, input);
    }
    return input;
  }

  // Voz de coro con formantes (dos osciladores desafinados = conjunto).
  choir(dest, t, dur, midi, vel = 0.06, vowel = 'a', o = {}) {
    const ctx = this.ctx;
    const f = mtof(midi);
    const shift = o.shift ?? (midi > 62 ? 1.18 : 1);
    const g = ctx.createGain();
    this._pan(g, o.pan ?? rnd(-0.35, 0.35)).connect(this._bank(dest, vowel, shift));
    const vib = ctx.createOscillator();
    vib.frequency.value = rnd(4.6, 5.6);
    const vg = ctx.createGain();
    vg.gain.value = o.vib ?? 9;
    vib.connect(vg);
    vib.start(t);
    const nodes = [vib];
    for (const det of o.solo ? [0] : [-7, 6]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      osc.detune.value = det + rnd(-2, 2);
      if (o.glide) osc.frequency.exponentialRampToValueAtTime(mtof(midi + o.glide), t + dur);
      vg.connect(osc.detune);
      osc.connect(g);
      osc.start(t);
      nodes.push(osc);
    }
    // aliento (solo en notas largas; pasa por los mismos formantes)
    if (dur > 1.2) {
      const ns = ctx.createBufferSource();
      ns.buffer = this.lib.noise('pink', 3);
      ns.loop = true;
      const ng = ctx.createGain();
      ng.gain.value = (o.breath ?? 0.18) * 0.6;
      ns.connect(ng).connect(g);
      ns.start(t, Math.random() * 2);
      nodes.push(ns);
    }
    const end = this.env(g, t, dur, vel, o.a ?? 0.45, o.r ?? 1.2);
    this._stop(nodes, end);
  }

  // Cuerdas frotadas (conjunto o solista); trem = trémolo (Hz).
  strings(dest, t, dur, midi, vel = 0.05, o = {}) {
    const ctx = this.ctx;
    const f = mtof(midi);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(f * 1.5, t);
    lp.frequency.linearRampToValueAtTime(Math.min(8000, f * (o.bright ?? 5)), t + (o.a ?? 0.3));
    const g = ctx.createGain();
    let dst = g;
    const nodes = [];
    if (o.trem) {
      const tg = ctx.createGain();
      tg.gain.value = 0.6;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = o.trem;
      const lg = ctx.createGain();
      lg.gain.value = 0.4;
      lfo.connect(lg).connect(tg.gain);
      g.connect(tg);
      dst = tg;
      nodes.push(lfo);
    }
    const vib = ctx.createOscillator();
    vib.frequency.value = rnd(5, 6);
    const vg = ctx.createGain();
    vg.gain.value = o.vib ?? 7;
    vib.connect(vg);
    nodes.push(vib);
    for (const det of o.solo ? [0] : [-6, 7]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      osc.detune.value = det;
      vg.connect(osc.detune);
      osc.connect(lp);
      nodes.push(osc);
    }
    lp.connect(g);
    this._pan(dst, o.pan ?? rnd(-0.3, 0.3)).connect(dest);
    const end = this.env(g, t, dur, vel, o.a ?? 0.3, o.r ?? 0.6);
    for (const n of nodes) n.start(t);
    this._stop(nodes, end);
  }

  // Zanfona / viela: voz nasal para las melodías.
  vielle(dest, t, dur, midi, vel = 0.05, o = {}) {
    const ctx = this.ctx;
    const f = mtof(midi);
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = f * 0.5;
    const g2 = ctx.createGain();
    g2.gain.value = 0.18;
    const vib = ctx.createOscillator();
    vib.frequency.value = rnd(5.2, 6.2);
    const vg = ctx.createGain();
    vg.gain.value = 10;
    vib.connect(vg).connect(osc.detune);
    const nasal = ctx.createBiquadFilter();
    nasal.type = 'peaking';
    nasal.frequency.value = 1350;
    nasal.Q.value = 3;
    nasal.gain.value = 9;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(6000, f * 7);
    const g = ctx.createGain();
    osc.connect(nasal);
    osc2.connect(g2).connect(nasal);
    nasal.connect(lp).connect(g).connect(dest);
    const end = this.env(g, t, dur, vel, o.a ?? 0.06, o.r ?? 0.25);
    for (const n of [osc, osc2, vib]) n.start(t);
    this._stop([osc, osc2, vib], end);
  }

  // Metales (cuerno/sacabuche): el filtro se abre con la nota.
  brass(dest, t, dur, midi, vel = 0.06, o = {}) {
    const ctx = this.ctx;
    const f = mtof(midi);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(f * 1.2, t);
    lp.frequency.exponentialRampToValueAtTime(Math.min(7000, f * (o.bright ?? 6)), t + (o.a ?? 0.12) + 0.1);
    lp.frequency.exponentialRampToValueAtTime(Math.min(7000, f * 3), t + dur);
    const g = ctx.createGain();
    const nodes = [];
    for (const det of [-5, 4]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f * 0.985, t);
      osc.frequency.exponentialRampToValueAtTime(f, t + 0.09);
      osc.detune.value = det;
      osc.connect(lp);
      nodes.push(osc);
    }
    lp.connect(g);
    this._pan(g, o.pan ?? rnd(-0.2, 0.2)).connect(dest);
    const end = this.env(g, t, dur, vel, o.a ?? 0.12, o.r ?? 0.4);
    for (const n of nodes) n.start(t);
    this._stop(nodes, end);
  }

  // Muestra de la biblioteca (salterio, campana, tambor...).
  sample(dest, t, buf, vel = 0.3, rate = 1, o = {}) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = vel;
    let node = s;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      s.connect(f);
      node = f;
    }
    if (o.pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = o.pan;
      node.connect(p);
      node = p;
    }
    node.connect(g).connect(dest);
    s.start(t);
    if (o.dur) s.stop(t + o.dur);
    return s;
  }
  pluck(dest, t, midi, vel = 0.2, o = {}) {
    return this.sample(dest, t, this.lib.pluck(mtof(midi), { bright: o.bright ?? 0.55, dur: o.dur ?? 3 }), vel, 1, { pan: o.pan ?? rnd(-0.4, 0.4) });
  }
  // Campanas: una muestra de referencia por tipo, transportada con la
  // velocidad de reproducción (una campana más grave suena también más larga).
  bell(dest, t, midi, vel = 0.2, o = {}) {
    const kind = o.kind ?? 'church';
    const ref = kind === 'church' ? 45 : 76;
    const buf = this.lib.bell(mtof(ref), { kind, dur: kind === 'church' ? 9 : 4 });
    return this.sample(dest, t, buf, vel, mtof(midi) / mtof(ref), { lp: o.lp, pan: o.pan });
  }
  drum(dest, t, kind, vel = 0.4, rate = 1, o = {}) {
    return this.sample(dest, t, this.lib.drum(kind), vel, rate, o);
  }

  // Oleada "al revés": ruido filtrado que crece y se corta.
  swell(dest, t, dur, vel = 0.08, f0 = 300, f1 = 2400) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.lib.noise('pink', 3);
    s.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    s.connect(bp).connect(g).connect(dest);
    s.start(t, Math.random() * 2);
    s.stop(t + dur + 0.15);
  }

  // Susurros corales (ruido por formantes).
  whisper(dest, t, dur, vel = 0.05) {
    const ctx = this.ctx;
    const n = Math.max(2, Math.floor(dur / 0.16));
    for (let i = 0; i < n; i++) {
      const V = VOWELS[pick(['a', 'e', 'i', 'o', 'u'])];
      const s = ctx.createBufferSource();
      s.buffer = this.lib.noise('white', 2);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = V[1][0] * rnd(0.9, 1.3);
      bp.Q.value = 5;
      const g = ctx.createGain();
      const t0 = t + i * 0.16 + rnd(0, 0.05);
      const d = rnd(0.08, 0.18);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vel * rnd(0.4, 1), t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      const p = ctx.createStereoPanner();
      p.pan.value = rnd(-0.8, 0.8);
      s.connect(bp).connect(g).connect(p).connect(dest);
      s.start(t0, Math.random());
      s.stop(t0 + d + 0.05);
    }
  }

  // Dron sostenido (varias voces) con filtro que respira; devuelve controles.
  drone(dest, midis, o = {}) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = o.cutoff ?? 300;
    lp.Q.value = o.q ?? 1.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = o.rate ?? 0.07;
    const lg = ctx.createGain();
    lg.gain.value = (o.cutoff ?? 300) * (o.depth ?? 0.45);
    lfo.connect(lg).connect(lp.frequency);
    lfo.start();
    const oscs = [];
    for (const m of midis) {
      for (const det of o.detune ?? [-8, 7]) {
        const osc = ctx.createOscillator();
        if (o.wave && this.waves[o.wave]) osc.setPeriodicWave(this.waves[o.wave]);
        else osc.type = o.type ?? 'sawtooth';
        osc.frequency.value = mtof(m);
        osc.detune.value = det;
        const og = ctx.createGain();
        og.gain.value = 1 / (midis.length * 1.6);
        osc.connect(og).connect(lp);
        osc.start();
        oscs.push({ osc, m });
      }
    }
    lp.connect(g).connect(dest);
    const nodes = [...oscs.map((q) => q.osc), lfo];
    return {
      gain: g,
      // cambia de acorde deslizando cada voz
      set: (ms, t, glide = 1.5) => {
        let k = 0;
        for (const m of ms)
          for (let d = 0; d < (o.detune ?? [-8, 7]).length; d++) {
            const q = oscs[k++];
            if (q) q.osc.frequency.setTargetAtTime(mtof(m), t, glide / 3);
          }
      },
      stop: (at) => this._stop(nodes, at),
    };
  }

  // --------------------------------------------------------------- temas
  // Cambia de tema con fundido; name null = silencio.
  setTheme(name, fade = 3) {
    if (this.cur && this.cur.name === name) return;
    const t = this.t();
    if (this.cur) {
      const c = this.cur;
      c.bus.gain.cancelScheduledValues(t);
      c.bus.gain.setValueAtTime(c.bus.gain.value, t);
      c.bus.gain.linearRampToValueAtTime(0.0001, t + fade);
      c.stopAt = t + fade + 0.2;
      if (c.drone) c.drone.stop(t + fade + 0.1);
      if (c.drone2) c.drone2.stop(t + fade + 0.1);
      this.old.push(c);
    }
    this.cur = null;
    if (!name || !THEMES[name]) return;
    const T = THEMES[name];
    const ctx = this.ctx;
    const bus = ctx.createGain();
    bus.gain.value = 0.0001;
    bus.gain.linearRampToValueAtTime(T.level ?? 1, t + Math.max(0.5, fade * 0.8));
    bus.connect(this.out);
    const send = ctx.createGain();
    send.gain.value = T.verb ?? 0.55;
    bus.connect(send).connect(this.verb);
    const L = {};
    for (const k of ['base', 'tension', 'combat']) {
      L[k] = ctx.createGain();
      L[k].gain.value = k === 'base' ? 1 : 0.0001;
      L[k].connect(bus);
    }
    const inst = { name, T, bus, send, L, beat: 0, next: t + 0.15, spb: 60 / T.bpm, data: {}, chordI: 0 };
    if (T.drone) {
      const d = T.drone;
      inst.drone = this.drone(L.base, d.notes(T, 0), d);
      inst.drone.gain.gain.setTargetAtTime(d.level ?? 0.1, t, 1.2);
    }
    if (T.drone2) {
      const d = T.drone2;
      inst.drone2 = this.drone(L.base, d.notes(T, 0), d);
      inst.drone2.gain.gain.setTargetAtTime(d.level ?? 0.06, t, 1.5);
    }
    this.cur = inst;
  }

  // Intensidad (0..1) de tensión y combate: se funde en cada capa.
  setIntensity(tension, combat) {
    this.tension = tension;
    this.combat = combat;
  }

  // Tempo actual (el combate puede acelerar ciertos temas).
  update() {
    const t = this.t();
    // limpieza de temas ya fundidos
    this.old = this.old.filter((c) => {
      if (t > c.stopAt) {
        try {
          c.bus.disconnect();
          c.send.disconnect();
        } catch (e) {}
        return false;
      }
      return true;
    });
    const c = this.cur;
    if (!c) return;
    const T = c.T;
    // capas según la situación (solo se reprograma si cambia de verdad)
    const ten = T.noTension ? 0 : this.tension;
    const com = T.noTension ? 0 : this.combat;
    if (Math.abs(ten - (c._ten ?? -1)) > 0.02 || Math.abs(com - (c._com ?? -1)) > 0.02) {
      const up = com > (c._com ?? 0);
      c.L.tension.gain.setTargetAtTime(Math.max(0.0001, ten * (1 - com * 0.5)), t, 0.8);
      c.L.combat.gain.setTargetAtTime(Math.max(0.0001, com), t, up ? 0.4 : 2.0);
      c.L.base.gain.setTargetAtTime(1 - com * (T.duck ?? 0.45), t, 1.2);
      c._ten = ten;
      c._com = com;
    }
    // si el reloj se ha adelantado (pestaña oculta), se saltan los pulsos perdidos
    if (c.next < t) {
      const miss = Math.ceil((t - c.next) / c.spb);
      c.beat += miss;
      c.next += miss * c.spb;
    }
    // secuenciador por pulsos con antelación
    const ahead = t + this.lookahead;
    let guard = 0;
    while (c.next < ahead && guard++ < Math.max(32, this.lookahead * 8)) {
      const bt = c.next;
      const beat = c.beat;
      const bar = Math.floor(beat / (T.meter ?? 4));
      const inBar = beat % (T.meter ?? 4);
      // acorde (cada T.chordBars compases)
      const cb = T.chordBars ?? 2;
      if (inBar === 0 && bar % cb === 0) {
        c.chordI = Math.floor(bar / cb) % T.prog.length;
        if (c.drone && T.drone.follow !== false) c.drone.set(T.drone.notes(T, T.prog[c.chordI]), bt, T.drone.glide ?? 2);
        if (c.drone2 && T.drone2.follow) c.drone2.set(T.drone2.notes(T, T.prog[c.chordI]), bt, T.drone2.glide ?? 2);
      }
      const S = { m: this, c, T, t: bt, beat, bar, inBar, spb: c.spb, chord: T.prog[c.chordI], L: c.L, ten, com };
      try {
        T.step(S);
      } catch (e) {
        console.error(e);
      }
      c.beat++;
      c.next += c.spb;
    }
  }

  // Grado del modo del tema -> MIDI (oct: octavas sobre la raíz).
  deg(T, d, oct = 0) {
    return degree(T.root + oct * 12, T.mode, d);
  }
  // Acorde de tríada sobre el grado 'd' (tres notas: 1-3-5 del modo).
  triad(T, d, oct = 0) {
    return [this.deg(T, d, oct), this.deg(T, d + 2, oct), this.deg(T, d + 4, oct)];
  }

  // --------------------------------------------------------------- golpes de efecto
  stinger(name) {
    const t = this.t() + 0.02;
    const d = this.out;
    if (name === 'alert') {
      // sforzando disonante de cuerdas + tambor
      for (const m of [50, 51, 56]) this.strings(d, t, 0.5, m, 0.05, { a: 0.02, r: 1.2, bright: 8, trem: 12 });
      this.drum(d, t, 'taiko', 0.55);
      this.swell(d, t - 0.01, 0.5, 0.05, 2000, 6000);
    } else if (name === 'pickup') {
      [76, 80, 83, 88].forEach((m, i) => this.pluck(d, t + i * 0.08, m, 0.22, { bright: 0.8 }));
      this.bell(d, t + 0.32, 88, 0.08, { kind: 'small', dur: 3 });
    } else if (name === 'rest') {
      for (const m of [50, 57, 62, 66, 69]) this.choir(d, t, 3.2, m, 0.045, 'a', { a: 1.2, r: 2.4 });
      for (const m of [38, 50, 57]) this.organ(d, t, 3.6, m, 0.05, 'flute', { a: 0.8, r: 2.4 });
      this.bell(d, t + 0.3, 74, 0.1, { kind: 'small', dur: 5 });
      this.bell(d, t + 1.1, 81, 0.06, { kind: 'small', dur: 5 });
    } else if (name === 'death') {
      this.bell(d, t, 33, 0.5, { dur: 8 });
      for (const m of [45, 46, 52, 53]) this.choir(d, t + 0.2, 3.5, m, 0.05, 'o', { glide: -5, a: 0.8, r: 2 });
      this.swell(d, t, 1.4, 0.07, 150, 900);
      this.drum(d, t, 'gong', 0.4);
    } else if (name === 'victory') {
      const prog = [
        [45, 52, 57, 60],
        [50, 53, 57, 62],
        [45, 52, 57, 61],
      ];
      prog.forEach((ch, i) => ch.forEach((m) => this.choir(d, t + i * 2.2, 2.8, m, 0.045, i === 2 ? 'a' : 'o', { a: 0.6, r: 2 })));
      this.bell(d, t, 45, 0.25, { dur: 8 });
      this.bell(d, t + 4.4, 69, 0.12, { kind: 'small', dur: 5 });
      this.organ(d, t + 4.4, 4, 33, 0.06, 'principal', { a: 0.6, r: 2.5 });
    } else if (name === 'fog') {
      this.swell(d, t, 1.4, 0.07, 400, 3200);
      this.whisper(d, t + 0.3, 1.6, 0.05);
    } else if (name === 'discover') {
      this.bell(d, t, 64, 0.07, { kind: 'small', dur: 4, pan: -0.2 });
      this.pluck(d, t + 0.35, 71, 0.12);
      this.pluck(d, t + 0.7, 76, 0.1);
    } else if (name === 'phantom') {
      for (const m of [58, 59, 64]) this.strings(d, t, 1.4, m, 0.035, { a: 0.9, r: 1.5, trem: 7, bright: 9 });
      this.whisper(d, t, 1.2, 0.05);
    }
  }
}

// ======================================================================= temas
// Cada tema: bpm, raíz (MIDI) y modo, progresión de grados, drones y step(S)
// que se llama en cada pulso y programa las notas de sus capas.

// Motivos de canto llano (grados; se transportan al acorde).
const CHANT = [
  [0, 1, 2, 1, 0, -1, 0],
  [4, 5, 4, 3, 2, 3, 4],
  [0, 2, 3, 4, 5, 4, 3, 2, 1, 0],
  [2, 1, 2, 0, 1, -1, 0, 0],
  [4, 3, 2, 3, 1, 0],
];

// capa de tensión común: clúster de cuerdas en trémolo y latido
function tensionLayer(S, o = {}) {
  if (S.ten < 0.03) return; // capa en silencio: no se programa nada
  const { m, T, t, inBar, bar, spb, L, chord } = S;
  if (inBar === 0 && bar % 2 === 0) {
    const r = m.deg(T, chord, o.oct ?? 1);
    for (const n of [r, r + 1, r + 7]) m.strings(L.tension, t, spb * 8, n + 12, 0.022, { a: 2.2, r: 1.8, trem: rnd(6, 9), bright: 7 });
  }
  if (inBar === 0 || (inBar === 2 && S.ten > 0.6)) m.drum(L.tension, t, 'heart', 0.35, 0.95 + S.ten * 0.1);
  if (inBar === 0 && bar % 4 === 3 && chance(0.6)) m.whisper(L.tension, t + spb, spb * 3, 0.035);
}

// capa de combate común: pandero en corcheas, tambor de guerra, metales y ostinato
function combatLayer(S, o = {}) {
  if (S.com < 0.03) return;
  const { m, T, t, inBar, bar, spb, L, chord } = S;
  const e = spb / 2;
  const pat = o.pat ?? [1, 0, 0.6, 0.4, 1, 0.5, 0.6, 0.4];
  for (let k = 0; k < 2; k++) {
    const v = pat[(inBar * 2 + k) % pat.length];
    if (v > 0) m.drum(L.combat, t + k * e, 'frame', 0.26 * v, 1 + (k ? 0.08 : 0));
  }
  if (inBar === 0) {
    m.drum(L.combat, t, 'taiko', 0.5);
    const r = m.deg(T, chord, 0);
    m.brass(L.combat, t, spb * 1.6, r, 0.05, { a: 0.05, bright: 7 });
    m.brass(L.combat, t, spb * 1.6, r + 7, 0.035, { a: 0.05, bright: 7 });
  }
  if (inBar === 2 && chance(0.7)) m.drum(L.combat, t, 'taiko', 0.3, 1.15);
  if (inBar === 3) m.drum(L.combat, t + e, 'tabor', 0.22);
  // ostinato de cuerdas graves
  const r0 = m.deg(T, chord, 0);
  const seq = o.ost ?? [0, 1, 0, 1, 0, 1, 3, 1];
  for (let k = 0; k < 2; k++) {
    const d = seq[(inBar * 2 + k) % seq.length];
    m.strings(L.combat, t + k * e, e * 0.85, r0 + (d === 3 ? 3 : d), 0.03, { a: 0.01, r: 0.08, bright: 6, solo: true });
  }
}

const THEMES = {
  // ---------------------------------------------------------------- título
  title: {
    bpm: 54,
    root: 40,
    mode: 'phrygian',
    prog: [0, 0, 1, 0],
    chordBars: 4,
    level: 0.9,
    verb: 0.75,
    noTension: true,
    drone: { notes: (T, d) => [degree(T.root - 12, T.mode, d), degree(T.root - 12, T.mode, d + 4)], wave: 'principal', cutoff: 900, level: 0.1, rate: 0.05, depth: 0.2, detune: [-3, 3] },
    step(S) {
      const { m, T, t, beat, bar, inBar, spb, L } = S;
      // canto llano en organum (melodía + quintas paralelas debajo)
      const mel = [0, 1, 3, 1, 0, -2, 0, 3, 5, 3, 1, 0, 1, -2, 0, 0];
      const lens = [2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 2, 3];
      const d = S.c.data;
      if (d.i === undefined) {
        d.i = 0;
        d.wait = 0;
      }
      if (d.wait > 0) {
        d.wait--;
        return;
      }
      if (d.i >= mel.length) {
        d.i = 0;
        d.wait = 6; // respiración entre frases
        m.bell(L.base, t, 52, 0.14, { dur: 8 });
        return;
      }
      if (d.i === 0) m.bell(L.base, t, 40, 0.1, { dur: 8, lp: 1400 });
      const semis = mel[d.i];
      const len = lens[d.i];
      const midi = T.root + 12 + semis;
      const vw = bar % 4 < 2 ? 'a' : 'o';
      m.choir(L.base, t, spb * len * 1.02, midi, 0.05, vw, { a: 0.18, r: 0.5 });
      m.choir(L.base, t, spb * len * 1.02, midi - 7, 0.035, 'o', { a: 0.2, r: 0.5 });
      if (d.i % 4 === 0) m.pluck(L.base, t, midi + 12, 0.08, { bright: 0.4 });
      d.i++;
      d.wait = len - 1;
      void beat;
      void inBar;
    },
  },

  // ---------------------------------------------------------------- calles
  city: {
    bpm: 56,
    root: 40,
    mode: 'phrygian',
    prog: [0, 1, 0, 6],
    chordBars: 2,
    verb: 0.6,
    drone: { notes: (T, d) => [degree(T.root - 12, T.mode, d), degree(T.root - 12, T.mode, d + 4)], type: 'sawtooth', cutoff: 230, q: 2, level: 0.085, rate: 0.06 },
    step(S) {
      const { m, T, t, bar, inBar, spb, L, chord } = S;
      const d = S.c.data;
      // coro lejano al cambiar de acorde
      if (inBar === 0 && bar % 2 === 0 && chance(0.7)) for (const n of m.triad(T, chord, 0)) m.choir(L.base, t, spb * 7, n, 0.022, 'o', { a: 1.6, r: 2.5 });
      // melodía de zanfona: frases de 4 compases que van y vienen
      if (inBar === 0 && bar % 4 === 0) d.play = chance(0.6);
      if (d.play && inBar === 0 && bar % 4 === 1) {
        const mot = pick(CHANT);
        let tt = t;
        for (const g of mot) {
          const dur = spb * pick([0.5, 1, 1, 1.5]);
          m.vielle(L.base, tt, dur * 0.95, m.deg(T, chord + g, 1), 0.035);
          tt += dur;
        }
      }
      // salterio disperso, agudo y lejano
      if (chance(0.16)) m.pluck(L.base, t + spb * pick([0, 0.5]), m.deg(T, chord + pick([0, 2, 4, 7]), 2), rnd(0.05, 0.1), { bright: 0.35 });
      // campana distante
      if (inBar === 0 && bar % 8 === 4) m.bell(L.base, t, 47, 0.1, { dur: 8, lp: 1600 });
      tensionLayer(S);
      combatLayer(S);
    },
  },

  // ---------------------------------------------------------------- murallas
  ramparts: {
    bpm: 60,
    root: 43,
    mode: 'aeolian',
    prog: [0, 0, 5, 6],
    chordBars: 2,
    verb: 0.7,
    drone: { notes: (T, d) => [degree(T.root - 12, T.mode, d), degree(T.root - 12, T.mode, d + 4), degree(T.root, T.mode, d)], type: 'sawtooth', cutoff: 260, level: 0.09, rate: 0.05 },
    step(S) {
      const { m, T, t, bar, inBar, spb, L } = S;
      // llamada de cuerno lejana
      if (inBar === 0 && bar % 8 === 2) {
        const call = chance(0.5) ? [[0, 2], [4, 1], [7, 3]] : [[7, 1.5], [4, 0.5], [3, 1], [4, 3]];
        let tt = t;
        for (const [g, l] of call) {
          m.brass(L.base, tt, spb * l, m.deg(T, g, 0) + 12, 0.035, { bright: 4, a: 0.2, r: 1.2 });
          tt += spb * l;
        }
      }
      // tambores del campamento de los sitiadores, al otro lado de la muralla
      // (bum... ba-bum en los pulsos 0, 1½ y 2)
      if (bar % 4 === 1 && inBar <= 2) m.drum(L.base, t + (inBar === 1 ? spb * 0.5 : 0), 'taiko', 0.16, 0.9, { lp: 500 });
      if (inBar === 0 && bar % 4 === 0 && chance(0.6)) for (const n of m.triad(T, S.chord, 0)) m.choir(L.base, t, spb * 6, n, 0.02, 'u', { a: 2, r: 2.5 });
      tensionLayer(S);
      combatLayer(S);
    },
  },

  // ---------------------------------------------------------------- interiores
  interior: {
    bpm: 50,
    root: 45,
    mode: 'aeolian',
    prog: [0, 5, 6, 4],
    chordBars: 2,
    verb: 0.45,
    drone: { notes: (T, d) => [degree(T.root - 12, T.mode, d), degree(T.root - 12, T.mode, d + 4)], type: 'triangle', cutoff: 420, level: 0.07, rate: 0.08, detune: [-4, 4] },
    step(S) {
      const { m, T, t, bar, inBar, spb, L, chord } = S;
      // caja de música olvidada: acordes quebrados de salterio, con huecos
      const rest = bar % 8 >= 6;
      if (!rest) {
        const tri = m.triad(T, chord, 1);
        for (let k = 0; k < 2; k++) {
          if (chance(0.25)) continue;
          const n = tri[(inBar * 2 + k) % 3] + (inBar === 3 && k ? 12 : 0);
          m.pluck(L.base, t + k * spb * 0.5, n, rnd(0.06, 0.12), { bright: 0.45 });
        }
      }
      if (inBar === 0 && bar % 4 === 2 && chance(0.6)) m.choir(L.base, t, spb * 5, m.deg(T, chord, 0), 0.02, 'u', { a: 1.8, r: 2 });
      tensionLayer(S, { oct: 1 });
      combatLayer(S, { pat: [0.8, 0, 0.5, 0, 0.8, 0.4, 0.5, 0] });
    },
  },

  // ---------------------------------------------------------------- cárcel
  prison: {
    bpm: 48,
    root: 37,
    mode: 'phrygian',
    prog: [0, 1],
    chordBars: 4,
    verb: 0.55,
    drone: { notes: (T, d) => [degree(T.root - 12, T.mode, d), degree(T.root - 12, T.mode, d + 4)], type: 'triangle', cutoff: 220, level: 0.08, rate: 0.05 },
    step(S) {
      const { m, T, t, bar, inBar, spb, L } = S;
      if (inBar === 0 && bar % 3 === 0) {
        m.pluck(L.base, t, T.root + 24, 0.1, { bright: 0.3, dur: 4 });
        m.pluck(L.base, t + spb * 1.5, T.root + 24, 0.05, { bright: 0.25, dur: 4 });
      }
      if (inBar === 2 && bar % 4 === 1 && chance(0.5)) m.pluck(L.base, t, T.root + 25 + 12, 0.04, { bright: 0.2 });
      if (inBar === 0 && bar % 8 === 5) m.swell(L.base, t, spb * 3, 0.03, 150, 700);
      tensionLayer(S, { oct: 1 });
      combatLayer(S);
    },
  },

  // ---------------------------------------------------------------- capillas y altares (a salvo)
  sanctuary: {
    bpm: 46,
    root: 50,
    mode: 'mixolydian',
    prog: [0, 6, 3, 0],
    chordBars: 2,
    verb: 0.8,
    noTension: true,
    drone: { notes: (T, d) => [degree(T.root - 24, T.mode, d), degree(T.root - 12, T.mode, d + 4)], wave: 'flute', cutoff: 1200, level: 0.07, rate: 0.04, depth: 0.15, detune: [-2, 2] },
    step(S) {
      const { m, T, t, bar, inBar, spb, L, chord } = S;
      if (inBar === 0 && bar % 2 === 0) {
        for (const n of m.triad(T, chord, -1)) m.organ(L.base, t, spb * 7.6, n, 0.035, 'flute', { a: 1.2, r: 1.8 });
        for (const n of m.triad(T, chord, 0)) m.choir(L.base, t + 0.1, spb * 7.4, n, 0.02, 'a', { a: 1.6, r: 2.2, shift: 1.2 });
        m.bell(L.base, t, m.deg(T, chord, 2), 0.05, { kind: 'small', dur: 5 });
      }
      // canto consolador
      if (inBar === 0 && bar % 8 === 4) {
        const mel = [0, 1, 2, 1, 0, -1, 0];
        let tt = t;
        mel.forEach((g, i) => {
          const l = i === mel.length - 1 ? 2 : 1;
          m.organ(L.base, tt, spb * l * 0.95, m.deg(T, g, 1), 0.03, 'flute', { a: 0.15, r: 0.6 });
          tt += spb * l;
        });
      }
      if (chance(0.1)) m.pluck(L.base, t + spb * 0.5, m.deg(T, chord + pick([0, 2, 4]), 2), 0.05, { bright: 0.5 });
    },
  },

  // ---------------------------------------------------------------- catedral
  cathedral: {
    bpm: 50,
    root: 38,
    mode: 'dorian',
    prog: [0, 3, 0, 6, 4, 0],
    chordBars: 2,
    verb: 0.95,
    drone: { notes: (T, d) => [degree(T.root - 12, T.mode, d), degree(T.root - 12, T.mode, d + 4)], wave: 'principal', cutoff: 800, level: 0.09, rate: 0.03, depth: 0.2, detune: [-2, 2] },
    step(S) {
      const { m, T, t, bar, inBar, spb, L, chord } = S;
      const d = S.c.data;
      // acordes de órgano lleno
      if (inBar === 0 && bar % 2 === 0) for (const n of m.triad(T, chord, 0)) m.organ(L.base, t, spb * 7.8, n, 0.025, 'full', { a: 0.5, r: 1.6 });
      // canto gregoriano: frases de 8 compases y 4 de silencio
      const ph = bar % 12;
      if (ph < 8 && inBar === 0 && (ph % 2 === 0)) {
        const mot = CHANT[(Math.floor(bar / 12) + ph / 2) % CHANT.length];
        let tt = t;
        mot.forEach((g, i) => {
          const l = i === mot.length - 1 ? 2 : pick([1, 1, 0.5]);
          if (tt - t > spb * 8) return;
          const n = m.deg(T, chord + g, 1);
          m.choir(L.base, tt, spb * l, n, 0.045, i % 2 ? 'o' : 'a', { a: 0.12, r: 0.4 });
          m.choir(L.base, tt, spb * l, n - 12, 0.03, 'o', { a: 0.12, r: 0.4 });
          tt += spb * l;
        });
      }
      if (inBar === 0 && bar % 8 === 0) m.bell(L.base, t, 38, 0.14, { dur: 9 });
      void d;
      tensionLayer(S, { oct: 1 });
      combatLayer(S, { pat: [1, 0, 0.5, 0, 0.8, 0, 0.5, 0.5] });
    },
  },

  // ---------------------------------------------------------------- cripta
  crypt: {
    bpm: 42,
    root: 33,
    mode: 'phrygian',
    prog: [0, 1, 0, 0],
    chordBars: 4,
    verb: 0.9,
    drone: { notes: (T, d) => [degree(T.root - 12, T.mode, d), degree(T.root, T.mode, d), degree(T.root, T.mode, d + 1)], type: 'sawtooth', cutoff: 150, q: 3, level: 0.12, rate: 0.03 },
    drone2: { notes: (T) => [T.root], type: 'sine', cutoff: 160, level: 0.08, detune: [0], rate: 0.02, follow: false },
    step(S) {
      const { m, T, t, bar, inBar, spb, L } = S;
      if (inBar === 0 && bar % 2 === 0) {
        const r = Math.random();
        if (r < 0.3) m.swell(L.base, t, spb * rnd(2, 4), 0.04, 120, rnd(600, 1600));
        else if (r < 0.55) for (const n of [T.root + 12, T.root + 13, T.root + 19]) m.choir(L.base, t, spb * 6, n, 0.022, 'u', { a: 2.5, r: 2.5 });
        else if (r < 0.75) m.bell(L.base, t, T.root + 6, 0.07, { dur: 7, lp: 900 });
        else m.swell(L.base, t, spb * 1.5, 0.025, 3000, 6000);
      }
      if (chance(0.06)) m.pluck(L.base, t, T.root + 36 + pick([0, 1, 7]), 0.04, { bright: 0.2 });
      tensionLayer(S, { oct: 2 });
      combatLayer(S, { pat: [1, 0, 0, 0.6, 1, 0, 0.6, 0] });
    },
  },

  // ---------------------------------------------------------------- jefe: el Empalado
  boss: {
    bpm: 132,
    root: 38,
    mode: 'phrygianDom',
    prog: [0, 1, 0, 6],
    chordBars: 2,
    verb: 0.45,
    noTension: true,
    drone: { notes: (T, d) => [degree(T.root - 12, T.mode, d)], type: 'sawtooth', cutoff: 180, level: 0.1, rate: 0.2 },
    step(S) {
      bossStep(S, 0);
    },
  },
  boss2: {
    bpm: 148,
    root: 38,
    mode: 'phrygianDom',
    prog: [0, 1, 3, 1],
    chordBars: 2,
    verb: 0.45,
    noTension: true,
    drone: { notes: (T, d) => [degree(T.root - 12, T.mode, d)], type: 'sawtooth', cutoff: 220, level: 0.11, rate: 0.3 },
    step(S) {
      bossStep(S, 1);
    },
  },

  // ---------------------------------------------------------------- jefe final: el Turiferario (Dies irae)
  bossFinal: {
    bpm: 104,
    root: 36,
    mode: 'phrygian',
    prog: [0, 1, 0, 6, 5, 1, 0, 0],
    chordBars: 1,
    verb: 0.8,
    noTension: true,
    drone: { notes: (T, d) => [degree(T.root - 12, T.mode, d), degree(T.root - 24, T.mode, d)], wave: 'reed', cutoff: 600, level: 0.08, rate: 0.1, detune: [-3, 3] },
    step(S) {
      finalStep(S, 0);
    },
  },
  bossFinal2: {
    bpm: 124,
    root: 36,
    mode: 'phrygian',
    prog: [0, 1, 0, 6, 5, 1, 4, 0],
    chordBars: 1,
    verb: 0.8,
    noTension: true,
    drone: { notes: (T, d) => [degree(T.root - 12, T.mode, d), degree(T.root - 24, T.mode, d)], wave: 'reed', cutoff: 900, level: 0.09, rate: 0.2, detune: [-4, 4] },
    step(S) {
      finalStep(S, 1);
    },
  },

  // ---------------------------------------------------------------- amanecer
  ending: {
    bpm: 60,
    root: 50,
    mode: 'ionian',
    prog: [0, 4, 5, 2, 3, 0, 3, 4],
    chordBars: 2,
    verb: 0.85,
    noTension: true,
    drone: { notes: (T, d) => [degree(T.root - 24, T.mode, d), degree(T.root - 12, T.mode, d + 4)], wave: 'flute', cutoff: 1400, level: 0.06, rate: 0.05, depth: 0.1, detune: [-3, 3] },
    step(S) {
      const { m, T, t, bar, inBar, spb, L, chord } = S;
      if (inBar === 0 && bar % 2 === 0) {
        for (const n of m.triad(T, chord, -1)) m.strings(L.base, t, spb * 7.6, n, 0.022, { a: 1.2, r: 1.6, bright: 4 });
        for (const n of m.triad(T, chord, 0)) m.choir(L.base, t, spb * 7.4, n, 0.02, 'a', { a: 1.4, r: 2, shift: 1.2 });
        m.bell(L.base, t, m.deg(T, chord, 2), 0.05, { kind: 'small', dur: 5 });
      }
      // arpa en corcheas
      const tri = m.triad(T, chord, 1);
      for (let k = 0; k < 2; k++) if (chance(0.8)) m.pluck(L.base, t + k * spb * 0.5, tri[(inBar * 2 + k) % 3] + (k && inBar === 3 ? 12 : 0), 0.07, { bright: 0.6 });
      // melodía esperanzada cada 4 compases
      if (inBar === 0 && bar % 4 === 1) {
        const mel = [[2, 1], [1, 0.5], [0, 0.5], [1, 1], [2, 1], [4, 2], [3, 1], [2, 1]];
        let tt = t;
        for (const [g, l] of mel) {
          m.vielle(L.base, tt, spb * l * 0.95, m.deg(T, chord + g, 1), 0.028, { a: 0.1 });
          tt += spb * l;
        }
      }
    },
  },
};

// Jefe menor: tambores de guerra en semicorcheas, ostinato, metales y coro.
function bossStep(S, phase) {
  const { m, T, t, bar, inBar, spb, L, chord } = S;
  const s16 = spb / 4;
  const pat = [2, 0, 0, 1, 0, 0, 1, 0, 2, 0, 1, 0, 0, 1, 0, 1];
  for (let k = 0; k < 4; k++) {
    const step = inBar * 4 + k;
    const v = pat[step];
    if (v === 2) m.drum(L.base, t + k * s16, 'taiko', 0.55);
    else if (v === 1) m.drum(L.base, t + k * s16, 'frame', 0.3, 1.1);
    if (phase && k % 2 === 1) m.drum(L.base, t + k * s16, 'tabor', 0.14 + (k === 3 ? 0.08 : 0));
  }
  if (inBar === 1 || inBar === 3) m.drum(L.base, t, 'tabor', 0.3);
  // ostinato de cuerdas graves en corcheas
  const seq = [0, 0, 1, 0, 0, 0, 2, 1];
  const r0 = m.deg(T, chord, -1);
  for (let k = 0; k < 2; k++) {
    const g = seq[(inBar * 2 + k) % seq.length];
    m.strings(L.base, t + k * spb * 0.5, spb * 0.42, degree(r0, T.mode, g) , 0.04, { a: 0.01, r: 0.06, bright: 7, solo: true });
  }
  // metales al cambiar de acorde
  if (inBar === 0 && bar % 2 === 0) for (const n of m.triad(T, chord, 0)) m.brass(L.base, t, spb * 7, n, 0.035, { a: 0.3, r: 0.8, bright: 5 });
  // coro: golpes y, en la segunda fase, un clúster sostenido
  if (inBar === 0 && bar % 2 === 1) for (const n of m.triad(T, chord, 0)) m.choir(L.base, t, spb * 1.2, n + 12, 0.04, 'a', { a: 0.03, r: 0.4 });
  if (phase && inBar === 0 && bar % 4 === 0) for (const n of [T.root + 24, T.root + 25, T.root + 31]) m.choir(L.base, t, spb * 15, n, 0.025, 'i', { a: 2, r: 1, shift: 1.25 });
  if (phase && inBar === 2) m.strings(L.base, t, spb * 2, m.deg(T, chord, 2) + 12, 0.02, { trem: 14, a: 0.1, r: 0.2, bright: 9 });
  if (inBar === 0 && bar % 4 === 0) m.bell(L.base, t, 38, 0.2, { dur: 6 });
}

// Jefe final: órgano, coro con el Dies irae, campanas del incensario, tambores.
function finalStep(S, phase) {
  const { m, T, t, bar, inBar, spb, L, chord } = S;
  // Dies irae (grados del modo, en frases de 8 notas)
  const dies = [2, 1, 2, 0, 1, -1, 0, 0, 2, 2, 3, 2, 1, 0, -1, 1, 2, 1, 0, 0];
  const d = S.c.data;
  if (d.i === undefined) d.i = 0;
  // una nota del canto por pulso, con respiración cada 8
  const ph = Math.floor(S.beat / 8) % 3;
  if (ph < 2 || phase) {
    const g = dies[d.i % dies.length];
    const n = degree(T.root + 12, T.mode, g);
    m.choir(L.base, t, spb * 0.98, n, phase ? 0.05 : 0.045, S.beat % 2 ? 'e' : 'a', { a: 0.05, r: 0.25 });
    m.choir(L.base, t, spb * 0.98, n - 12, 0.035, 'o', { a: 0.05, r: 0.25 });
    if (phase) m.choir(L.base, t, spb * 0.98, n + 12, 0.025, 'a', { a: 0.05, r: 0.25, shift: 1.25 });
    d.i++;
  }
  // órgano de lengüetería en cada compás
  if (inBar === 0) for (const n of m.triad(T, chord, 0)) m.organ(L.base, t, spb * 3.9, n, 0.024, 'reed', { a: 0.05, r: 0.5 });
  // tambores pesados
  if (inBar === 0) m.drum(L.base, t, 'taiko', 0.55);
  if (inBar === 2) m.drum(L.base, t + spb * 0.5, 'taiko', 0.4, 1.1);
  if (phase) for (let k = 0; k < 2; k++) m.drum(L.base, t + k * spb * 0.5, 'frame', 0.2 + (k ? 0 : 0.08), 1.05);
  // gong y campanas del incensario
  if (inBar === 0 && bar % 4 === 0) m.drum(L.base, t, 'gong', 0.35);
  if (inBar === 1 && chance(0.5 + phase * 0.3)) for (let k = 0; k < 3; k++) m.bell(L.base, t + k * 0.09, T.root + 30 + pick([0, 1, 6]), 0.035, { kind: 'small', dur: 2.5 });
  if (phase && inBar === 3) m.swell(L.base, t, spb, 0.04, 800, 5000);
}
