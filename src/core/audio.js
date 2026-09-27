// Motor de audio 100% sintetizado con WebAudio: efectos, voces, ambiente
// espacializado, reverberación generada y música procedural.

const rnd = (a, b) => a + Math.random() * (b - a);

export class Audio {
  constructor() {
    this.ok = false;
    this.vol = { music: 0.7, sfx: 0.9 };
    this.zone = 'city';
    this.musicName = null;
    this.nextAmb = 5;
  }

  init() {
    if (this.ok) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.ok = true;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.attack.value = 0.005;
    comp.release.value = 0.2;
    this.master.connect(comp).connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = this.vol.sfx;
    this.sfx.connect(this.master);
    this.mus = ctx.createGain();
    this.mus.gain.value = this.vol.music;
    this.mus.connect(this.master);
    this.amb = ctx.createGain();
    this.amb.gain.value = 0.9;
    this.amb.connect(this.sfx);
    // reverberación
    this.verb = ctx.createConvolver();
    this.verb.buffer = this.makeIR(3.4, 2.6);
    this.verbIn = ctx.createGain();
    this.verbOut = ctx.createGain();
    this.verbOut.gain.value = 0.35;
    this.verbIn.connect(this.verb).connect(this.verbOut).connect(this.master);
    // buffers de ruido
    this.white = this.noiseBuf('white', 2);
    this.brown = this.noiseBuf('brown', 4);
    this.pink = this.noiseBuf('pink', 3);
    this.crackleBuf = this.makeCrackle(6);
    this.staticBuf = this.makeStatic(4);
    this.listener = ctx.listener;
    this.startAmbience();
  }

  setVolumes(music, sfx) {
    this.vol.music = music;
    this.vol.sfx = sfx;
    if (!this.ok) return;
    this.mus.gain.setTargetAtTime(music, this.ctx.currentTime, 0.1);
    this.sfx.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.1);
  }

  // ------------------------------------------------------------ generadores
  noiseBuf(kind, sec) {
    const ctx = this.ctx;
    const n = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0,
      b0 = 0,
      b1 = 0,
      b2 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w;
      else if (kind === 'brown') {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else {
        b0 = 0.99765 * b0 + w * 0.099;
        b1 = 0.963 * b1 + w * 0.2965;
        b2 = 0.57 * b2 + w * 1.0527;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
      }
    }
    return b;
  }
  makeIR(sec, decay) {
    const ctx = this.ctx;
    const n = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < n; i++) {
        const t = i / n;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < 400 ? i / 400 : 1);
      }
    }
    return b;
  }
  makeCrackle(sec) {
    const ctx = this.ctx;
    const n = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    let low = 0;
    for (let i = 0; i < n; i++) {
      low = low * 0.995 + (Math.random() * 2 - 1) * 0.005;
      d[i] = low * 6;
    }
    for (let k = 0; k < sec * 40; k++) {
      const p = Math.floor(Math.random() * (n - 800));
      const a = rnd(0.2, 1) * (Math.random() < 0.1 ? 1.8 : 1);
      const len = Math.floor(rnd(40, 400));
      for (let i = 0; i < len; i++) d[p + i] += (Math.random() * 2 - 1) * a * Math.exp(-i / (len * 0.25));
    }
    return b;
  }
  makeStatic(sec) {
    const ctx = this.ctx;
    const n = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    let env = 0;
    for (let i = 0; i < n; i++) {
      if (Math.random() < 0.0004) env = rnd(0.4, 1);
      env *= 0.9995;
      const hiss = (Math.random() * 2 - 1) * (0.25 + env * 0.75);
      d[i] = hiss * (Math.random() < 0.002 ? 3 : 1);
    }
    return b;
  }

  // ------------------------------------------------------------ utilidades de síntesis
  t() {
    return this.ctx.currentTime;
  }
  out(pos, opts = {}) {
    // devuelve nodo de entrada conectado (con panner si hay posición)
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = opts.gain ?? 1;
    let node = g;
    if (pos) {
      const p = ctx.createPanner();
      p.panningModel = 'equalpower';
      p.distanceModel = 'inverse';
      p.refDistance = opts.ref ?? 3;
      p.maxDistance = 80;
      p.rolloffFactor = opts.roll ?? 1.1;
      p.positionX.value = pos.x;
      p.positionY.value = (pos.y ?? 0) + 1;
      p.positionZ.value = pos.z;
      g.connect(p);
      node = p;
    }
    node.connect(opts.bus || this.sfx);
    const send = this.ctx.createGain();
    send.gain.value = opts.verb ?? 0.3;
    node.connect(send).connect(this.verbIn);
    setTimeout(() => {
      try {
        g.disconnect();
        node.disconnect();
        send.disconnect();
      } catch (e) {}
    }, (opts.life ?? 4) * 1000);
    return g;
  }
  noise(dest, t0, dur, { type = 'bandpass', f0 = 1000, f1 = null, q = 1, gain = 0.5, a = 0.005, buf = null, rate = 1 } = {}) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = buf || this.white;
    s.playbackRate.value = rate;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(f0, t0);
    if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t0, Math.random() * 1.5);
    s.stop(t0 + dur + 0.05);
    return f;
  }
  tone(dest, t0, dur, { type = 'sine', f0 = 440, f1 = null, gain = 0.3, a = 0.005, curve = 'exp', detune = 0 } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.detune.value = detune;
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + a);
    if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    else {
      g.gain.setValueAtTime(gain, t0 + dur * 0.7);
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    }
    o.connect(g).connect(dest);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
    return o;
  }
  // voz con formantes (gritos, lamentos, coro)
  voice(dest, t0, dur, { f0 = 200, f1 = null, vowel = 'a', gain = 0.3, vib = 5, vibD = 6, type = 'sawtooth', breath = 0.1, a = 0.05 } = {}) {
    const ctx = this.ctx;
    const V = { a: [700, 1220, 2600], e: [500, 1900, 2500], i: [300, 2300, 3000], o: [450, 800, 2800], u: [320, 800, 2400] }[vowel];
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = vib;
    const lg = ctx.createGain();
    lg.gain.value = vibD;
    lfo.connect(lg).connect(o.detune);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + a);
    g.gain.setValueAtTime(gain, t0 + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const mix = ctx.createGain();
    for (const [i, f] of V.entries()) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = 8 - i * 2;
      const fg = ctx.createGain();
      fg.gain.value = [1, 0.5, 0.2][i];
      o.connect(bp).connect(fg).connect(mix);
    }
    mix.connect(g).connect(dest);
    o.start(t0);
    lfo.start(t0);
    o.stop(t0 + dur + 0.05);
    lfo.stop(t0 + dur + 0.05);
    if (breath > 0) this.noise(dest, t0, dur, { type: 'bandpass', f0: V[1], q: 2, gain: breath, a });
  }
  bell(dest, t0, f, gain = 0.4, len = 5) {
    const R = [0.5, 1, 1.19, 1.5, 2.0, 2.51, 2.66, 3.01, 4.16, 5.43];
    R.forEach((r, i) => this.tone(dest, t0, len * (1.2 - i * 0.08), { f0: f * r * (1 + (Math.random() - 0.5) * 0.004), gain: gain * [0.6, 1, 0.7, 0.5, 0.45, 0.3, 0.25, 0.2, 0.15, 0.1][i], a: 0.003 }));
    this.noise(dest, t0, 0.08, { type: 'highpass', f0: 2500, gain: gain * 0.4 });
  }

  // ------------------------------------------------------------ efectos
  play(name, pos = null) {
    if (!this.ok) return;
    const t = this.t();
    const P = pos && pos.x !== undefined ? pos : null;
    let d;
    switch (name) {
      case 'crow': {
        // graznido: sierra ronca con formantes nasales, uno o dos "craa"
        d = this.out(P, { gain: 0.55, verb: 0.45, ref: 4, life: 3 });
        const n = Math.random() < 0.5 ? 1 : 2;
        for (let i = 0; i < n; i++) {
          const t0 = t + i * (0.26 + Math.random() * 0.08);
          const f = 520 + Math.random() * 160;
          this.voice(d, t0, 0.22, { f0: f, f1: f * 0.72, vowel: 'a', gain: 0.22, vib: 38, vibD: 90, breath: 0.08, a: 0.012 });
          this.noise(d, t0, 0.18, { type: 'bandpass', f0: 1400, q: 3, gain: 0.08, a: 0.01 });
        }
        break;
      }
      case 'swing':
        d = this.out(P, { gain: 0.55, verb: 0.1, life: 1 });
        this.noise(d, t, 0.24, { f0: 500, f1: 2600, q: 1.4, gain: 0.5, a: 0.06 });
        break;
      case 'swingHeavy':
        d = this.out(P, { gain: 0.7, verb: 0.15, life: 1.2 });
        this.noise(d, t, 0.38, { f0: 300, f1: 1500, q: 1.2, gain: 0.6, a: 0.12 });
        this.tone(d, t + 0.05, 0.3, { f0: 110, f1: 60, gain: 0.25, a: 0.05 });
        break;
      case 'hit':
      case 'hitHeavy': {
        const h = name === 'hitHeavy';
        d = this.out(P, { gain: h ? 1 : 0.8, verb: 0.2, life: 1.2 });
        this.tone(d, t, h ? 0.25 : 0.16, { f0: h ? 120 : 160, f1: 45, gain: 0.8 });
        this.noise(d, t, 0.12, { type: 'lowpass', f0: 1400, f1: 300, gain: 0.7 });
        this.noise(d, t + 0.02, 0.2, { type: 'bandpass', f0: 700, f1: 350, q: 4, gain: 0.35, buf: this.brown, rate: 3 });
        break;
      }
      case 'clang':
      case 'block':
      case 'guardbreak': {
        d = this.out(P, { gain: 0.7, verb: 0.35, life: 2 });
        const base = name === 'block' ? 380 : 520;
        [1, 2.63, 4.13, 5.92, 8.6].forEach((r, i) => this.tone(d, t, 0.9 - i * 0.12, { f0: base * r * rnd(0.98, 1.02), gain: 0.22 / (i + 1), a: 0.002 }));
        this.noise(d, t, 0.05, { type: 'highpass', f0: 3000, gain: 0.5 });
        if (name === 'block') this.tone(d, t, 0.12, { f0: 180, f1: 90, gain: 0.5 });
        if (name === 'guardbreak') {
          this.tone(d, t, 0.5, { f0: 90, f1: 40, gain: 0.7 });
          this.noise(d, t + 0.05, 0.4, { type: 'lowpass', f0: 800, gain: 0.5 });
        }
        break;
      }
      case 'playerHurt':
        d = this.out(P, { gain: 0.8, verb: 0.2, life: 1.2 });
        this.voice(d, t, 0.28, { f0: 150, f1: 95, vowel: 'u', gain: 0.35, vib: 0, breath: 0.15, a: 0.01 });
        this.tone(d, t, 0.15, { f0: 140, f1: 50, gain: 0.6 });
        this.noise(d, t, 0.1, { type: 'lowpass', f0: 1200, gain: 0.5 });
        break;
      case 'roll':
        d = this.out(P, { gain: 0.5, verb: 0.1, life: 1.2 });
        this.noise(d, t, 0.3, { f0: 1200, f1: 400, q: 0.8, gain: 0.35, a: 0.05 });
        this.tone(d, t + 0.3, 0.12, { f0: 90, f1: 50, gain: 0.35 });
        this.noise(d, t + 0.3, 0.12, { type: 'lowpass', f0: 600, gain: 0.3 });
        break;
      case 'step': {
        d = this.out(null, { gain: 0.3, verb: 0.08, life: 0.5 });
        const s = this.surface || 'stone';
        if (s === 'stone') this.noise(d, t, 0.05, { f0: rnd(1500, 2400), q: 1.5, gain: 0.4, a: 0.002 });
        else if (s === 'wood') this.tone(d, t, 0.07, { f0: rnd(200, 260), f1: 150, gain: 0.35 });
        else this.noise(d, t, 0.07, { type: 'lowpass', f0: rnd(500, 800), gain: 0.5, a: 0.004, buf: this.brown, rate: 4 });
        this.tone(d, t, 0.05, { f0: 70, f1: 45, gain: 0.25 });
        break;
      }
      case 'heal':
        d = this.out(P, { gain: 0.5, verb: 0.7, life: 3 });
        [880, 1318, 1760, 2637].forEach((f, i) => this.tone(d, t + i * 0.06, 1.6, { f0: f, gain: 0.08, a: 0.1 }));
        this.noise(d, t, 1.0, { type: 'bandpass', f0: 3000, q: 3, gain: 0.08, a: 0.5 });
        break;
      case 'slam':
        d = this.out(P, { gain: 1, verb: 0.4, life: 2.5, ref: 5 });
        this.tone(d, t, 0.7, { f0: 70, f1: 28, gain: 1 });
        this.noise(d, t, 0.6, { type: 'lowpass', f0: 900, f1: 150, gain: 0.8 });
        for (let i = 0; i < 8; i++) this.noise(d, t + rnd(0.05, 0.5), 0.04, { f0: rnd(800, 2500), q: 2, gain: 0.2 });
        break;
      case 'bellToll':
        d = this.out(P, { gain: 0.9, verb: 0.8, life: 9, ref: 8, roll: 0.6 });
        this.bell(d, t, 98, 0.45, 7);
        break;
      case 'roar':
        d = this.out(P, { gain: 1, verb: 0.6, life: 4, ref: 8 });
        this.voice(d, t, 2.0, { f0: 70, f1: 55, vowel: 'o', gain: 0.6, vib: 7, vibD: 40, breath: 0.4, a: 0.15 });
        this.voice(d, t, 2.0, { f0: 104, f1: 80, vowel: 'a', gain: 0.4, vib: 5.5, vibD: 30, breath: 0, a: 0.2 });
        break;
      case 'wail':
        d = this.out(P, { gain: 0.8, verb: 0.8, life: 3 });
        this.voice(d, t, 1.4, { f0: 620, f1: 480, vowel: 'i', gain: 0.25, vib: 6, vibD: 60, breath: 0.2, type: 'triangle', a: 0.1 });
        break;
      case 'wailHit':
        d = this.out(P, { gain: 0.6, verb: 0.7, life: 2 });
        this.noise(d, t, 0.4, { f0: 2000, f1: 500, q: 2, gain: 0.4 });
        break;
      case 'fireWhoosh':
        d = this.out(P, { gain: 0.7, verb: 0.3, life: 2 });
        this.noise(d, t, 0.6, { f0: 250, f1: 1400, q: 0.8, gain: 0.6, a: 0.1, buf: this.brown, rate: 3 });
        break;
      case 'explosion':
        d = this.out(P, { gain: 1, verb: 0.5, life: 3, ref: 6 });
        this.noise(d, t, 1.2, { type: 'lowpass', f0: 2400, f1: 150, gain: 0.9 });
        this.tone(d, t, 0.8, { f0: 60, f1: 25, gain: 1 });
        break;
      case 'burn':
        d = this.out(P, { gain: 0.4, verb: 0.1, life: 1 });
        this.noise(d, t, 0.25, { type: 'highpass', f0: 3000, gain: 0.3 });
        break;
      case 'doorOpen':
        d = this.out(P, { gain: 0.7, verb: 0.45, life: 3 });
        this.creak(d, t, 1.1, rnd(70, 95));
        this.tone(d, t, 0.05, { type: 'square', f0: 900, f1: 400, gain: 0.08 });
        break;
      case 'gateOpen':
        d = this.out(P, { gain: 0.8, verb: 0.5, life: 4 });
        for (let i = 0; i < 26; i++) this.noise(d, t + i * 0.08 + rnd(0, 0.05), 0.04, { f0: rnd(1800, 3500), q: 6, gain: 0.18 });
        this.noise(d, t, 2.2, { type: 'lowpass', f0: 300, gain: 0.35, a: 0.2, buf: this.brown, rate: 2 });
        this.creak(d, t + 0.2, 1.6, 140);
        break;
      case 'unlock':
        d = this.out(P, { gain: 0.6, verb: 0.3, life: 1.5 });
        [0, 0.12, 0.3].forEach((dt) => this.noise(d, t + dt, 0.03, { f0: 3200, q: 8, gain: 0.35 }));
        this.tone(d, t + 0.3, 0.1, { type: 'square', f0: 300, f1: 150, gain: 0.05 });
        break;
      case 'locked':
        d = this.out(P, { gain: 0.6, verb: 0.3, life: 1.5 });
        for (let i = 0; i < 4; i++) this.noise(d, t + i * 0.07, 0.04, { f0: rnd(1500, 2500), q: 5, gain: 0.3 });
        this.tone(d, t, 0.12, { f0: 110, f1: 70, gain: 0.3 });
        break;
      case 'bar':
        d = this.out(P, { gain: 0.7, verb: 0.4, life: 2 });
        this.noise(d, t, 0.5, { type: 'bandpass', f0: 500, f1: 250, q: 2, gain: 0.4, buf: this.brown, rate: 4 });
        this.tone(d, t + 0.5, 0.2, { f0: 120, f1: 60, gain: 0.6 });
        break;
      case 'boards':
        d = this.out(P, { gain: 0.9, verb: 0.35, life: 2.5 });
        [0, 0.25, 0.45, 0.8].forEach((dt) => {
          this.noise(d, t + dt, 0.08, { f0: rnd(900, 1800), q: 3, gain: 0.6, a: 0.001 });
          this.tone(d, t + dt, 0.12, { f0: rnd(180, 260), f1: 90, gain: 0.35 });
        });
        break;
      case 'seal':
        d = this.out(P, { gain: 0.9, verb: 0.6, life: 4.5 });
        this.noise(d, t, 3, { type: 'lowpass', f0: 220, gain: 0.7, a: 0.4, buf: this.brown, rate: 1.5 });
        this.tone(d, t, 3, { f0: 42, gain: 0.5, a: 0.5 });
        break;
      case 'pickup':
        d = this.out(null, { gain: 0.5, verb: 0.5, life: 3, bus: this.sfx });
        [659, 880, 1319].forEach((f, i) => this.tone(d, t + i * 0.09, 1.3, { f0: f, gain: 0.12, a: 0.01 }));
        break;
      case 'paper':
        d = this.out(null, { gain: 0.5, verb: 0.1, life: 1 });
        for (let i = 0; i < 5; i++) this.noise(d, t + i * 0.06, 0.07, { f0: rnd(2500, 5000), q: 1, gain: 0.25 });
        break;
      case 'rest':
        d = this.out(null, { gain: 0.6, verb: 0.9, life: 6, bus: this.mus });
        [146.8, 220, 293.7, 370].forEach((f, i) => this.voice(d, t + i * 0.15, 4, { f0: f, vowel: 'a', gain: 0.1, vib: 5, vibD: 8, breath: 0.03, a: 1.2 }));
        break;
      case 'death':
        d = this.out(null, { gain: 0.8, verb: 0.9, life: 7, bus: this.mus });
        [65.4, 69.3, 98, 103.8].forEach((f) => this.voice(d, t, 5, { f0: f, vowel: 'o', gain: 0.2, vib: 3, vibD: 10, breath: 0.05, a: 0.8 }));
        this.bell(d, t + 0.2, 55, 0.35, 6);
        break;
      case 'item':
        this.play('pickup');
        break;
      case 'stinger':
        d = this.out(null, { gain: 0.6, verb: 0.8, life: 4, bus: this.mus });
        [233, 247, 262].forEach((f) => this.voice(d, t, 1.6, { f0: f, f1: f * 0.92, vowel: 'e', gain: 0.1, vib: 7, vibD: 25, breath: 0.1, a: 0.02, type: 'sawtooth' }));
        this.noise(d, t, 0.8, { f0: 5000, f1: 800, q: 2, gain: 0.2 });
        break;
      case 'fog':
        d = this.out(null, { gain: 0.6, verb: 0.9, life: 4 });
        this.noise(d, t, 1.6, { f0: 400, f1: 3000, q: 1, gain: 0.3, a: 0.5 });
        break;
      case 'victory':
        d = this.out(null, { gain: 0.7, verb: 0.9, life: 8, bus: this.mus });
        [98, 146.8, 196, 246.9, 293.7].forEach((f, i) => this.voice(d, t + i * 0.2, 5.5, { f0: f, vowel: 'a', gain: 0.1, vib: 5, vibD: 7, breath: 0.02, a: 1.4 }));
        this.bell(d, t + 0.5, 196, 0.25, 6);
        break;
    }
  }

  creak(dest, t0, dur, f) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t0);
    for (let i = 0; i < 8; i++) o.frequency.setValueAtTime(f * rnd(0.7, 1.5), t0 + (i / 8) * dur);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const am = ctx.createOscillator();
    am.frequency.value = 23;
    const amg = ctx.createGain();
    amg.gain.value = 0.12;
    am.connect(amg).connect(g.gain);
    o.connect(bp).connect(g).connect(dest);
    o.start(t0);
    am.start(t0);
    o.stop(t0 + dur + 0.1);
    am.stop(t0 + dur + 0.1);
  }

  ui(kind) {
    if (!this.ok) return;
    const t = this.t();
    const d = this.out(null, { gain: 0.35, verb: 0.2, life: 1.2 });
    if (kind === 'move') this.tone(d, t, 0.06, { f0: 1100, gain: 0.08 });
    else if (kind === 'confirm') {
      this.tone(d, t, 0.25, { f0: 660, gain: 0.1 });
      this.tone(d, t + 0.07, 0.35, { f0: 990, gain: 0.08 });
    } else if (kind === 'open') this.noise(d, t, 0.25, { f0: 600, f1: 1800, q: 1, gain: 0.12, a: 0.08 });
    else if (kind === 'lock') {
      // "clic" metálico seco al fijar
      this.tone(d, t, 0.05, { type: 'square', f0: 1900, f1: 1500, gain: 0.05 });
      this.tone(d, t + 0.03, 0.12, { f0: 2600, gain: 0.05 });
    } else this.noise(d, t, 0.2, { f0: 1600, f1: 500, q: 1, gain: 0.1, a: 0.04 });
  }

  // ------------------------------------------------------------ voces de criaturas
  enemyVoice(e, kind) {
    if (!this.ok) return;
    const now = this.t();
    if (kind !== 'death' && e._vt && now - e._vt < 0.35) return;
    e._vt = now;
    const t = now;
    const v = e.T.voice;
    const d = this.out(e.pos, { gain: 0.9, verb: 0.45, life: 4, ref: v === 'boss' || v === 'impaled' ? 7 : 3 });
    const V = (o) => this.voice(d, t, o.dur ?? 0.6, o);
    switch (v) {
      case 'penitent':
        if (kind === 'alert') V({ dur: 0.9, f0: rnd(380, 460), f1: 700, vowel: 'i', gain: 0.22, vib: 9, vibD: 50, breath: 0.25, a: 0.03 });
        else if (kind === 'attack') V({ dur: 0.35, f0: 220, f1: 330, vowel: 'e', gain: 0.18, vib: 0, breath: 0.3 });
        else if (kind === 'hurt') V({ dur: 0.3, f0: 500, f1: 300, vowel: 'a', gain: 0.2, breath: 0.2 });
        else if (kind === 'death') V({ dur: 1.2, f0: 300, f1: 90, vowel: 'o', gain: 0.22, vib: 12, vibD: 40, breath: 0.3 });
        else if (kind === 'idle') this.whisper(d, t, 1.4, 0.12);
        break;
      case 'soldier':
        if (kind === 'alert') V({ dur: 0.9, f0: 95, f1: 80, vowel: 'o', gain: 0.35, vib: 6, vibD: 20, breath: 0.2 });
        else if (kind === 'attack') {
          V({ dur: 0.3, f0: 110, vowel: 'u', gain: 0.2, breath: 0.1 });
          this.noise(d, t, 0.2, { f0: 2400, q: 4, gain: 0.15 });
        } else if (kind === 'hurt') V({ dur: 0.3, f0: 120, f1: 90, vowel: 'u', gain: 0.25 });
        else if (kind === 'death') {
          V({ dur: 1.0, f0: 100, f1: 50, vowel: 'o', gain: 0.25, breath: 0.2 });
          for (let i = 0; i < 6; i++) this.noise(d, t + 0.5 + rnd(0, 0.5), 0.05, { f0: rnd(1500, 3500), q: 6, gain: 0.2 });
        }
        break;
      case 'crawler':
        if (kind === 'alert' || kind === 'attack') {
          V({ dur: kind === 'alert' ? 0.7 : 0.35, f0: rnd(900, 1100), f1: 1600, vowel: 'i', gain: 0.18, vib: 30, vibD: 100, breath: 0.3, type: 'square' });
        } else if (kind === 'hurt') V({ dur: 0.25, f0: 1200, f1: 800, vowel: 'e', gain: 0.18, type: 'square' });
        else if (kind === 'death') V({ dur: 0.8, f0: 900, f1: 200, vowel: 'e', gain: 0.18, vib: 20, vibD: 80, type: 'square' });
        else if (kind === 'idle') for (let i = 0; i < 8; i++) this.noise(d, t + i * 0.06, 0.02, { f0: 3000, q: 10, gain: 0.2 });
        break;
      case 'hound':
        if (kind === 'alert') {
          this.noise(d, t, 0.8, { type: 'lowpass', f0: 500, gain: 0.5, buf: this.brown, rate: 8 });
          V({ dur: 0.8, f0: 130, f1: 110, vowel: 'o', gain: 0.25, vib: 28, vibD: 60, breath: 0.2 });
        } else if (kind === 'attack') {
          V({ dur: 0.18, f0: 300, f1: 200, vowel: 'a', gain: 0.3, breath: 0.2, a: 0.005 });
          this.noise(d, t + 0.15, 0.05, { f0: 2500, q: 2, gain: 0.3 });
        } else if (kind === 'hurt') V({ dur: 0.25, f0: 700, f1: 500, vowel: 'i', gain: 0.2 });
        else if (kind === 'death') V({ dur: 0.9, f0: 600, f1: 250, vowel: 'i', gain: 0.2, vib: 8, vibD: 30 });
        break;
      case 'bell':
        if (kind === 'alert') {
          this.bell(d, t, 130, 0.3, 3.5);
          V({ dur: 1.2, f0: 70, f1: 60, vowel: 'o', gain: 0.3, vib: 5, vibD: 20, breath: 0.3 });
        } else if (kind === 'attack') V({ dur: 0.8, f0: 65, vowel: 'u', gain: 0.25, breath: 0.4 });
        else if (kind === 'hurt') this.bell(d, t, 130 * rnd(0.95, 1.05), 0.12, 1.5);
        else if (kind === 'death') {
          this.bell(d, t, 110, 0.35, 5);
          V({ dur: 2, f0: 70, f1: 35, vowel: 'o', gain: 0.3, breath: 0.3 });
        }
        break;
      case 'mourner':
        if (kind === 'alert') V({ dur: 1.8, f0: 520, f1: 680, vowel: 'i', gain: 0.18, vib: 5, vibD: 40, breath: 0.2, type: 'triangle', a: 0.2 });
        else if (kind === 'attack') V({ dur: 1.0, f0: 600, f1: 450, vowel: 'e', gain: 0.16, vib: 6, vibD: 50, breath: 0.2, type: 'triangle' });
        else if (kind === 'hurt') V({ dur: 0.4, f0: 700, f1: 500, vowel: 'a', gain: 0.16, type: 'triangle' });
        else if (kind === 'death') V({ dur: 2.2, f0: 650, f1: 200, vowel: 'i', gain: 0.18, vib: 4, vibD: 60, breath: 0.2, type: 'triangle' });
        else if (kind === 'idle') for (let i = 0; i < 3; i++) this.voice(d, t + i * 0.5, 0.4, { f0: 480 - i * 20, f1: 430, vowel: 'a', gain: 0.08, type: 'triangle', breath: 0.15 });
        break;
      case 'impaled':
      case 'boss':
        if (kind === 'alert') this.play('roar', e.pos);
        else if (kind === 'attack') V({ dur: 0.7, f0: v === 'boss' ? 55 : 65, vowel: 'o', gain: 0.35, vib: 6, vibD: 25, breath: 0.35 });
        else if (kind === 'hurt') V({ dur: 0.4, f0: 80, f1: 60, vowel: 'u', gain: 0.2, breath: 0.2 });
        else if (kind === 'death') {
          V({ dur: 3.5, f0: 90, f1: 30, vowel: 'o', gain: 0.45, vib: 4, vibD: 30, breath: 0.4, a: 0.2 });
          this.bell(d, t + 0.5, 73, 0.3, 7);
        }
        break;
    }
  }

  enemyStep(e) {
    if (!this.ok) return;
    const t = this.t();
    const v = e.T.voice;
    const d = this.out(e.pos, { gain: 0.8, verb: 0.3, life: 3, ref: 4 });
    if (v === 'bell') {
      this.bell(d, t, 175 * rnd(0.98, 1.02), 0.05, 1.8);
      this.tone(d, t, 0.2, { f0: 60, f1: 35, gain: 0.5 });
    } else {
      this.tone(d, t, 0.3, { f0: 55, f1: 30, gain: 0.7 });
      this.noise(d, t, 0.2, { type: 'lowpass', f0: 500, gain: 0.4 });
    }
  }

  whisper(dest, t0, dur, gain) {
    const n = Math.floor(dur / 0.12);
    for (let i = 0; i < n; i++) {
      const vw = ['a', 'e', 'i', 'o', 'u'][Math.floor(Math.random() * 5)];
      const V = { a: 1100, e: 1800, i: 2300, o: 800, u: 700 }[vw];
      this.noise(dest, t0 + i * 0.12 + rnd(0, 0.04), rnd(0.06, 0.14), { f0: V, q: 5, gain: gain * rnd(0.4, 1), a: 0.02 });
      if (Math.random() < 0.3) this.noise(dest, t0 + i * 0.12, 0.05, { type: 'highpass', f0: 5000, gain: gain * 0.6 });
    }
  }

  // ------------------------------------------------------------ ambiente
  startAmbience() {
    const ctx = this.ctx;
    // viento
    const w = ctx.createBufferSource();
    w.buffer = this.pink;
    w.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 450;
    wf.Q.value = 0.7;
    this.windF = wf;
    this.windG = ctx.createGain();
    this.windG.gain.value = 0.0;
    w.connect(wf).connect(this.windG).connect(this.amb);
    w.start();
    // zumbido grave
    this.drone = ctx.createGain();
    this.drone.gain.value = 0;
    const dl = ctx.createBiquadFilter();
    dl.type = 'lowpass';
    dl.frequency.value = 220;
    this.droneF = dl;
    for (const [f, type] of [
      [41.2, 'sawtooth'],
      [41.5, 'sawtooth'],
      [61.7, 'triangle'],
      [82.4, 'sine'],
    ]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = type === 'sawtooth' ? 0.12 : 0.18;
      o.connect(g).connect(dl);
      o.start();
    }
    dl.connect(this.drone).connect(this.amb);
    // habitación / goteo
    const rt = ctx.createBufferSource();
    rt.buffer = this.brown;
    rt.loop = true;
    const rf = ctx.createBiquadFilter();
    rf.type = 'lowpass';
    rf.frequency.value = 160;
    this.roomG = ctx.createGain();
    this.roomG.gain.value = 0;
    rt.connect(rf).connect(this.roomG).connect(this.amb);
    rt.start();
    // río
    const rv = ctx.createBufferSource();
    rv.buffer = this.pink;
    rv.loop = true;
    const rvf = ctx.createBiquadFilter();
    rvf.type = 'bandpass';
    rvf.frequency.value = 900;
    rvf.Q.value = 0.5;
    this.riverG = ctx.createGain();
    this.riverG.gain.value = 0;
    rv.connect(rvf).connect(this.riverG).connect(this.amb);
    rv.start();
    // crepitar del fuego (posicional, sigue al fuego más cercano)
    this.fire = [];
    for (let i = 0; i < 2; i++) {
      const s = ctx.createBufferSource();
      s.buffer = this.crackleBuf;
      s.loop = true;
      s.playbackRate.value = 0.9 + i * 0.2;
      const p = ctx.createPanner();
      p.panningModel = 'equalpower';
      p.distanceModel = 'inverse';
      p.refDistance = 2;
      p.rolloffFactor = 1.4;
      const g = ctx.createGain();
      g.gain.value = 0;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 180;
      s.connect(hp).connect(g).connect(p).connect(this.amb);
      s.start(0, i * 2);
      this.fire.push({ p, g });
    }
    // zumbido de moscas (posicional: sigue al cadáver más cercano)
    {
      const bf = ctx.createBiquadFilter();
      bf.type = 'bandpass';
      bf.frequency.value = 1100;
      bf.Q.value = 1.4;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 6.1;
      const lg = ctx.createGain();
      lg.gain.value = 22;
      lfo.connect(lg);
      for (const f of [187, 211, 243]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        lg.connect(o.frequency);
        const g = ctx.createGain();
        g.gain.value = 0.3;
        o.connect(g).connect(bf);
        o.start();
      }
      // vaivén de volumen: las moscas se acercan y se alejan
      const wob = ctx.createGain();
      wob.gain.value = 0.65;
      const lfo2 = ctx.createOscillator();
      lfo2.frequency.value = 0.37;
      const lg2 = ctx.createGain();
      lg2.gain.value = 0.35;
      lfo2.connect(lg2).connect(wob.gain);
      const p = ctx.createPanner();
      p.panningModel = 'equalpower';
      p.distanceModel = 'inverse';
      p.refDistance = 0.8;
      p.rolloffFactor = 1.6;
      const g = ctx.createGain();
      g.gain.value = 0;
      bf.connect(wob).connect(g).connect(p).connect(this.amb);
      lfo.start();
      lfo2.start();
      this.flyBuzz = { p, g };
    }
    // susurros / estática del miedo
    const st = ctx.createBufferSource();
    st.buffer = this.staticBuf;
    st.loop = true;
    const sf = ctx.createBiquadFilter();
    sf.type = 'bandpass';
    sf.frequency.value = 1800;
    sf.Q.value = 0.9;
    this.staticG = ctx.createGain();
    this.staticG.gain.value = 0;
    st.connect(sf).connect(this.staticG).connect(this.sfx);
    st.start();
    this.fear = 0;
    this.heartT = 0;
  }

  setZone(atmo) {
    this.zone = atmo;
  }

  // Llamar cada fotograma
  update(dt, game) {
    if (!this.ok) return;
    const ctx = this.ctx;
    const t = this.t();
    const cam = game.camera;
    const L = this.listener;
    const f = new game.THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    if (L.positionX) {
      L.positionX.setTargetAtTime(cam.position.x, t, 0.05);
      L.positionY.setTargetAtTime(cam.position.y, t, 0.05);
      L.positionZ.setTargetAtTime(cam.position.z, t, 0.05);
      L.forwardX.setTargetAtTime(f.x, t, 0.05);
      L.forwardY.setTargetAtTime(f.y, t, 0.05);
      L.forwardZ.setTargetAtTime(f.z, t, 0.05);
      L.upX.value = 0;
      L.upY.value = 1;
      L.upZ.value = 0;
    } else if (L.setPosition) {
      L.setPosition(cam.position.x, cam.position.y, cam.position.z);
      L.setOrientation(f.x, f.y, f.z, 0, 1, 0);
    }
    const z = this.zone;
    const outdoor = z === 'city' || z === 'ramparts' || z === 'dawn';
    const W = z === 'ramparts' ? 0.5 : z === 'city' ? 0.28 : z === 'dawn' ? 0.12 : z === 'cathedral' ? 0.06 : 0.02;
    this.windG.gain.setTargetAtTime(W, t, 1.5);
    this.windF.frequency.setTargetAtTime(350 + Math.sin(t * 0.13) * 180 + Math.sin(t * 0.41) * 80, t, 0.5);
    const D = z === 'crypt' || z === 'tunnel' ? 0.3 : z === 'arena' ? 0.35 : z === 'cathedral' ? 0.25 : z === 'dawn' ? 0.0 : 0.12;
    this.drone.gain.setTargetAtTime(D, t, 2);
    this.droneF.frequency.setTargetAtTime(160 + Math.sin(t * 0.07) * 70, t, 1);
    this.roomG.gain.setTargetAtTime(outdoor ? 0 : 0.35, t, 1);
    this.riverG.gain.setTargetAtTime(z === 'dawn' ? 0.35 : 0, t, 2);
    const V = { city: 0.3, ramparts: 0.2, interior: 0.18, prison: 0.3, chapel: 0.45, cathedral: 0.9, crypt: 0.65, arena: 0.8, tunnel: 0.55, dawn: 0.2 }[z] ?? 0.3;
    this.verbOut.gain.setTargetAtTime(V, t, 0.8);

    // fuegos cercanos
    const fires = game.fx.fires.list;
    const cp = game.player.pos;
    const near = [];
    for (const fr of fires) {
      if (!fr.on || fr.s < 0.4) continue;
      const d = (fr.x - cp.x) ** 2 + (fr.z - cp.z) ** 2 + (fr.y - cp.y) ** 2;
      if (d < 400) near.push([d, fr]);
    }
    near.sort((a, b) => a[0] - b[0]);
    this.fire.forEach((F, i) => {
      const n = near[i];
      if (n) {
        F.p.positionX.setTargetAtTime(n[1].x, t, 0.1);
        F.p.positionY.setTargetAtTime(n[1].y + 0.5, t, 0.1);
        F.p.positionZ.setTargetAtTime(n[1].z, t, 0.1);
        F.g.gain.setTargetAtTime(0.18 * Math.min(1.6, n[1].s), t, 0.3);
      } else F.g.gain.setTargetAtTime(0, t, 0.3);
    });

    // moscas
    const fl = game.fauna && game.state !== 'title' ? game.fauna.nearestFlies(cp, 7) : null;
    if (fl) {
      const B = this.flyBuzz.p;
      B.positionX.setTargetAtTime(fl.x, t, 0.1);
      B.positionY.setTargetAtTime(fl.y + 0.3, t, 0.1);
      B.positionZ.setTargetAtTime(fl.z, t, 0.1);
    }
    this.flyBuzz.g.gain.setTargetAtTime(fl ? 0.05 : 0, t, 0.4);

    // miedo: susurros y estática según criaturas cercanas (calculado por el juego)
    this.fear = game.fear || 0;
    this.staticG.gain.setTargetAtTime(this.fear * this.fear * 0.16, t, 0.2);
    if (this.fear > 0.35 && Math.random() < dt * this.fear * 0.7) {
      const d = this.out({ x: cp.x + rnd(-4, 4), y: cp.y + 1, z: cp.z + rnd(-4, 4) }, { gain: 0.5 * this.fear, verb: 0.6, life: 3 });
      this.whisper(d, t, rnd(0.6, 1.4), 0.1);
    }

    // latido con poca vida
    const hpk = game.player.hp / game.player.maxHp;
    if (hpk < 0.32 && !game.player.dead) {
      this.heartT -= dt;
      if (this.heartT <= 0) {
        this.heartT = 0.55 + hpk * 1.5;
        const d = this.out(null, { gain: 0.9, verb: 0.05, life: 1 });
        this.tone(d, t, 0.14, { f0: 58, f1: 38, gain: 0.8 });
        this.tone(d, t + 0.2, 0.16, { f0: 52, f1: 34, gain: 0.6 });
      }
    }

    // sucesos ambientales aleatorios
    this.nextAmb -= dt;
    if (this.nextAmb <= 0) {
      this.nextAmb = rnd(9, 22);
      const a = Math.random() * Math.PI * 2;
      const far = { x: cp.x + Math.cos(a) * rnd(25, 45), y: cp.y + 5, z: cp.z + Math.sin(a) * rnd(25, 45) };
      const r = Math.random();
      if (outdoor && z !== 'dawn') {
        if (r < 0.3) {
          const d = this.out(far, { gain: 0.9, verb: 0.9, life: 9, ref: 20, roll: 0.4 });
          this.bell(d, t, rnd(80, 120), 0.18, 6);
        } else if (r < 0.55) {
          const d = this.out(far, { gain: 0.6, verb: 0.9, life: 4, ref: 20, roll: 0.4 });
          this.voice(d, t, 1.6, { f0: rnd(500, 700), f1: rnd(300, 400), vowel: 'a', gain: 0.1, vib: 7, vibD: 60, breath: 0.2 });
        } else if (r < 0.75) {
          const d = this.out(far, { gain: 0.6, verb: 0.8, life: 4, ref: 20, roll: 0.4 });
          this.voice(d, t, 2.4, { f0: 300, f1: 420, vowel: 'u', gain: 0.1, vib: 4, vibD: 30, breath: 0.1, type: 'triangle' });
        } else {
          const d = this.out(far, { gain: 0.7, verb: 0.7, life: 3, ref: 15 });
          this.creak(d, t, 1.4, rnd(60, 90));
        }
      } else if (z === 'crypt' || z === 'tunnel' || z === 'arena') {
        const d = this.out({ x: cp.x + rnd(-8, 8), y: cp.y + 3, z: cp.z + rnd(-8, 8) }, { gain: 0.6, verb: 0.9, life: 3 });
        if (r < 0.6) for (let i = 0; i < rnd(1, 4); i++) this.tone(d, t + i * rnd(0.3, 0.9), 0.12, { f0: rnd(1200, 2400), f1: rnd(600, 900), gain: 0.12 });
        else this.whisper(d, t, 1.6, 0.08);
        this.nextAmb = rnd(4, 10);
      } else if (z === 'dawn') {
        const d = this.out(far, { gain: 0.5, verb: 0.3, life: 2 });
        for (let i = 0; i < rnd(2, 5); i++) this.tone(d, t + i * 0.13, 0.1, { f0: rnd(2500, 4000), f1: rnd(3000, 5000), gain: 0.06 });
        this.nextAmb = rnd(2, 6);
      } else {
        const d = this.out(far, { gain: 0.4, verb: 0.6, life: 3 });
        this.creak(d, t, 1.0, rnd(60, 110));
      }
    }
    this.musicUpdate(dt);
  }

  // ------------------------------------------------------------ música
  music(name) {
    if (!this.ok || this.musicName === name) return;
    this.musicName = name;
    this.mStep = 0;
    this.mNext = this.t() + 0.1;
    if (this.mBus) {
      const old = this.mBus;
      old.gain.setTargetAtTime(0, this.t(), 0.6);
      setTimeout(() => old.disconnect(), 3000);
    }
    this.mBus = this.ctx.createGain();
    this.mBus.gain.value = 0;
    this.mBus.gain.setTargetAtTime(1, this.t(), 0.8);
    this.mBus.connect(this.mus);
    const send = this.ctx.createGain();
    send.gain.value = 0.6;
    this.mBus.connect(send).connect(this.verbIn);
    if (name === 'title' || name === 'ending') {
      // pedal de órgano sostenido
      const g = this.ctx.createGain();
      g.gain.value = 0;
      g.gain.setTargetAtTime(name === 'ending' ? 0.08 : 0.1, this.t(), 2);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 500;
      const base = name === 'ending' ? 73.4 : 82.4;
      for (const r of [1, 1.5, 2, 2.004]) {
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = base * r;
        o.connect(lp);
        o.start();
        this._stopLater(o, name);
      }
      lp.connect(g).connect(this.mBus);
    }
  }
  _stopLater(o, name) {
    const check = () => {
      if (this.musicName !== name) {
        try {
          o.stop(this.t() + 2);
        } catch (e) {}
      } else setTimeout(check, 500);
    };
    setTimeout(check, 500);
  }
  musicUpdate() {
    if (!this.mBus || !this.musicName) return;
    const ctx = this.ctx;
    const ahead = this.t() + 0.25;
    while (this.mNext < ahead) {
      const t = this.mNext;
      const n = this.musicName;
      const s = this.mStep++;
      if (n === 'title') {
        // canto llano en modo frigio (mi)
        const mel = [0, 1, 3, 1, 0, -2, 0, 3, 5, 3, 1, 0, 1, -2, 0, 0];
        const lens = [2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 2, 3];
        const i = s % mel.length;
        const f = 164.8 * Math.pow(2, mel[i] / 12);
        const dur = lens[i] * 0.9;
        for (const [k, dt] of [
          [1, 0],
          [2, 0.02],
          [0.5, 0.01],
        ])
          this.voice(this.mBus, t + dt, dur * 1.05, { f0: f * k, vowel: s % 8 < 4 ? 'a' : 'o', gain: k === 1 ? 0.05 : 0.025, vib: 4.5, vibD: 9, breath: 0.012, a: 0.25 });
        if (i === 0 && s % 32 === 0) this.bell(this.mBus, t, 82.4, 0.12, 7);
        this.mNext += dur;
      } else if (n === 'boss' || n === 'boss2') {
        const bpm = n === 'boss2' ? 150 : 132;
        const beat = 60 / bpm / 2;
        const bar = s % 12;
        // tambores graves
        if ([0, 3, 6, 8, 9].includes(bar)) {
          this.tone(this.mBus, t, 0.35, { f0: bar === 0 ? 110 : 90, f1: 42, gain: bar === 0 ? 0.5 : 0.32 });
          this.noise(this.mBus, t, 0.12, { type: 'lowpass', f0: 600, gain: 0.2 });
        }
        if (bar === 4 || bar === 10) this.noise(this.mBus, t, 0.18, { type: 'bandpass', f0: 1800, q: 1, gain: 0.12 });
        // coro disonante cada 2 compases
        if (s % 24 === 0) {
          const chords = [
            [110, 130.8, 155.6],
            [103.8, 123.5, 146.8],
            [98, 116.5, 146.8],
            [92.5, 110, 138.6],
          ];
          const ch = chords[Math.floor(s / 24) % chords.length];
          for (const f of ch) {
            this.voice(this.mBus, t, beat * 23, { f0: f * 2, vowel: 'a', gain: 0.045, vib: 5, vibD: 12, breath: 0.01, a: 0.4 });
            this.voice(this.mBus, t, beat * 23, { f0: f, vowel: 'o', gain: 0.05, vib: 4, vibD: 10, breath: 0.01, a: 0.3 });
          }
          if (Math.floor(s / 24) % 2 === 0) this.bell(this.mBus, t, 55, 0.1, 5);
        }
        // metal agudo en fase 2
        if (n === 'boss2' && s % 3 === 0) this.tone(this.mBus, t, beat * 2.5, { type: 'sawtooth', f0: 880 * (s % 24 < 12 ? 1 : 0.944), gain: 0.012 });
        this.mNext += beat;
      } else if (n === 'ending') {
        const prog = [
          [146.8, 220, 293.7, 369.9],
          [123.5, 185, 246.9, 293.7],
          [98, 146.8, 196, 246.9],
          [110, 164.8, 220, 277.2],
        ];
        const ch = prog[s % prog.length];
        ch.forEach((f, i) => this.voice(this.mBus, t + i * 0.1, 6.2, { f0: f, vowel: i % 2 ? 'o' : 'a', gain: 0.035, vib: 4, vibD: 6, breath: 0.008, a: 1.6 }));
        if (s % 2 === 0) this.bell(this.mBus, t + 1, ch[2] * 2, 0.06, 6);
        this.mNext += 6;
      } else {
        this.mNext += 1;
      }
    }
  }
  stopMusic() {
    if (!this.ok) return;
    this.musicName = null;
    if (this.mBus) {
      const old = this.mBus;
      old.gain.setTargetAtTime(0, this.t(), 1.2);
      setTimeout(() => old.disconnect(), 5000);
      this.mBus = null;
    }
  }
}
