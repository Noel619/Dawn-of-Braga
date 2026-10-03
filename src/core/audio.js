// Motor de audio 100% sintetizado con WebAudio.
// - Buses de música, efectos, ambiente e interfaz hacia un limitador final;
//   la música se atenúa (ducking) con los golpes fuertes y se oye «tras una
//   puerta» en el menú de pausa.
// - Reverberación por convolución con salas generadas (calle, habitación,
//   capilla, catedral, cripta, exterior) que se funden al cambiar de zona.
// - Sonidos posicionales con absorción del aire y oclusión: lo que suena tras
//   un muro llega apagado.
// - Ambiente por capas (viento a rachas, la ciudad ardiendo, río, fuegos,
//   moscas, el zumbido de los altares, el miedo) y sucesos propios de cada zona.
// - Música adaptativa por zona y peligro (audio_music.js).
import { SoundLib, mtof } from './audio_lib.js';
import { MusicEngine } from './audio_music.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// tema musical de cada atmósfera
const ZONE_MUSIC = {
  city: 'city',
  ramparts: 'ramparts',
  interior: 'interior',
  prison: 'prison',
  chapel: 'sanctuary',
  cathedral: 'cathedral',
  crypt: 'crypt',
  tunnel: 'crypt',
  arena: 'crypt',
  cellar: 'crypt',
  dawn: 'ending',
};
// sala (respuesta de impulso) y cantidad de reverberación
const ZONE_ROOM = {
  city: ['street', 0.3],
  ramparts: ['open', 0.2],
  interior: ['room', 0.34],
  prison: ['room', 0.42],
  chapel: ['hall', 0.5],
  cathedral: ['cathedral', 0.72],
  crypt: ['crypt', 0.6],
  tunnel: ['crypt', 0.55],
  arena: ['hall', 0.55],
  cellar: ['crypt', 0.5],
  dawn: ['open', 0.16],
};
// capas de fondo: viento, rumor del incendio, tono de sala, dron grave, río
const ZONE_BED = {
  city: [0.22, 0.1, 0, 0, 0],
  ramparts: [0.42, 0.07, 0, 0, 0],
  interior: [0.05, 0.035, 0.12, 0, 0],
  prison: [0.03, 0, 0.16, 0.02, 0],
  chapel: [0.03, 0.02, 0.07, 0, 0],
  cathedral: [0.05, 0.02, 0.1, 0.02, 0],
  crypt: [0, 0, 0.14, 0.06, 0],
  tunnel: [0.06, 0, 0.12, 0.05, 0],
  arena: [0.02, 0, 0.12, 0.07, 0],
  cellar: [0, 0, 0.15, 0.08, 0],
  dawn: [0.1, 0, 0, 0, 0.3],
};
const OUTDOOR = { city: 1, ramparts: 1, dawn: 1 };
// distancia máxima a la que merece la pena sintetizar cada sonido
const FAR = { bellToll: 400, roar: 120, explosion: 120, slam: 90, gateOpen: 60, crow: 60, crack: 80, scuttle: 45 };
// formantes (Hz, ancho de banda, ganancia) para voces y gritos
const VOW = {
  a: [
    [730, 90, 1],
    [1090, 110, 0.5],
    [2440, 160, 0.25],
  ],
  e: [
    [530, 80, 1],
    [1840, 120, 0.45],
    [2480, 160, 0.22],
  ],
  i: [
    [300, 70, 1],
    [2250, 140, 0.4],
    [3000, 180, 0.2],
  ],
  o: [
    [570, 80, 1],
    [840, 90, 0.5],
    [2410, 150, 0.15],
  ],
  u: [
    [320, 70, 1],
    [870, 90, 0.3],
    [2240, 150, 0.1],
  ],
};

export class Audio {
  constructor() {
    this.ok = false;
    this.vol = { music: 0.7, sfx: 0.9 };
    this.zone = 'city';
    this.surface = 'stone';
    this.override = null; // música explícita: título, jefes, final
    this.silenceUntil = 0; // silencio musical tras morir o vencer
    this.nextAmb = 6;
    this.lis = { x: 0, y: 0, z: 0 };
    this.game = null;
    this.combatK = 0;
    this.gust = 0.5;
    this.gustTo = 0.5;
    this.gustT = 0;
    this.heartT = 0;
    this.fear = 0;
    this.stingT = 0;
    this.zoneMusT = 0;
    this._slow = 0;
    this._duckUntil = 0;
    this._duckLvl = 1;
  }

  // ------------------------------------------------------------ arranque
  init(ctx = null) {
    if (this.ok) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        ctx = new AC({ latencyHint: 'interactive' });
      } catch (e) {
        ctx = new AC();
      }
    }
    this.ctx = ctx;
    this.ok = true;
    const lib = (this.lib = new SoundLib(ctx));
    this.white = lib.noise('white', 2);
    this.pink = lib.noise('pink', 3);
    this.brown = lib.noise('brown', 4);
    this.raspCurve = this.makeRasp(4);

    // --- mezcla final con limitador
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -9;
    lim.knee.value = 8;
    lim.ratio.value = 12;
    lim.attack.value = 0.002;
    lim.release.value = 0.22;
    this.master.connect(lim).connect(ctx.destination);
    // efectos y ambiente -> mundo (se apaga en pausa) -> volumen de efectos
    this.sfxVol = ctx.createGain();
    this.sfxVol.gain.value = this.vol.sfx;
    this.sfxVol.connect(this.master);
    this.worldBus = ctx.createGain();
    this.worldBus.connect(this.sfxVol);
    this.sfx = ctx.createGain();
    this.sfx.connect(this.worldBus);
    this.amb = ctx.createGain();
    this.amb.connect(this.worldBus);
    // interfaz: seca y fuera de la pausa
    this.uiVol = ctx.createGain();
    this.uiVol.gain.value = this.vol.sfx;
    this.uiVol.connect(this.master);
    this.uiBus = ctx.createGain();
    this.uiBus.gain.value = 0.9;
    this.uiBus.connect(this.uiVol);

    // --- reverberación de los efectos (sala de la zona)
    this.verbIn = ctx.createGain();
    this.verbHP = ctx.createBiquadFilter();
    this.verbHP.type = 'highpass';
    this.verbHP.frequency.value = 170;
    this.verbIn.connect(this.verbHP);
    this.verbOut = ctx.createGain();
    this.verbOut.gain.value = 0.3;
    this.verbOut.connect(this.worldBus);
    this.room = null;
    this.setRoom('street', 0.3, 0.05);

    // --- música: compresión suave, filtro de pausa, atenuación y volumen
    this.musVol = ctx.createGain();
    this.musVol.gain.value = this.vol.music;
    this.musVol.connect(this.master);
    this.duckG = ctx.createGain();
    this.duckG.connect(this.musVol);
    this.musLP = ctx.createBiquadFilter();
    this.musLP.type = 'lowpass';
    this.musLP.frequency.value = 20000;
    this.musLP.Q.value = 0.5;
    this.musLP.connect(this.duckG);
    const mcomp = ctx.createDynamicsCompressor();
    mcomp.threshold.value = -20;
    mcomp.knee.value = 10;
    mcomp.ratio.value = 3;
    mcomp.attack.value = 0.02;
    mcomp.release.value = 0.4;
    mcomp.connect(this.musLP);
    this.musIn = ctx.createGain();
    this.musIn.gain.value = 0.85;
    this.musIn.connect(mcomp);
    // la música tiene su propia sala, grande y fija
    this.musSend = ctx.createGain();
    const mhp = ctx.createBiquadFilter();
    mhp.type = 'highpass';
    mhp.frequency.value = 200;
    const mconv = ctx.createConvolver();
    mconv.buffer = lib.ir('hall');
    const mret = ctx.createGain();
    mret.gain.value = 0.55;
    this.musSend.connect(mhp).connect(mconv).connect(mret).connect(this.musLP);
    this.score = new MusicEngine(ctx, lib, this.musIn, this.musSend);

    this.startAmbience();
    this.prewarm();
  }

  // Precalcula en segundo plano los buffers pesados (salas, campanas...).
  prewarm() {
    const lib = this.lib;
    const jobs = [
      () => ['taiko', 'frame', 'tabor', 'thud', 'heart', 'rim', 'gong'].forEach((k) => lib.drum(k)),
      () => this.churchBell(),
      () => this.smallBell(),
      () => lib.chain(1.2),
      () => lib.ir('room'),
      () => lib.ir('crypt'),
      () => lib.ir('open'),
      () => lib.ir('cathedral'),
    ];
    const run = () => {
      const j = jobs.shift();
      if (!j) return;
      try {
        j();
      } catch (e) {}
      setTimeout(run, 80);
    };
    setTimeout(run, 150);
  }

  setVolumes(music, sfx) {
    this.vol.music = music;
    this.vol.sfx = sfx;
    if (!this.ok) return;
    const t = this.t();
    this.musVol.gain.setTargetAtTime(music, t, 0.1);
    this.sfxVol.gain.setTargetAtTime(sfx, t, 0.1);
    this.uiVol.gain.setTargetAtTime(sfx, t, 0.1);
  }

  // Cambia la sala de reverberación con un fundido entre las dos.
  setRoom(kind, level, fade = 1.5) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    this.verbOut.gain.setTargetAtTime(level, t, Math.max(0.01, fade / 3));
    if (this.room && this.room.kind === kind) return;
    const conv = ctx.createConvolver();
    conv.buffer = this.lib.ir(kind);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(1, t + fade);
    this.verbHP.connect(conv).connect(g).connect(this.verbOut);
    const old = this.room;
    if (old) {
      old.g.gain.cancelScheduledValues(t);
      old.g.gain.setValueAtTime(old.g.gain.value, t);
      old.g.gain.linearRampToValueAtTime(0.0001, t + fade);
      setTimeout(() => {
        try {
          this.verbHP.disconnect(old.conv);
          old.conv.disconnect();
          old.g.disconnect();
        } catch (e) {}
      }, (fade + 4) * 1000);
    }
    this.room = { kind, conv, g };
  }

  setZone(atmo) {
    if (atmo === this.zone && this._roomSet) return;
    this.zone = atmo;
    if (!this.ok) return;
    this._roomSet = true;
    const [kind, lvl] = ZONE_ROOM[atmo] || ZONE_ROOM.city;
    this.setRoom(kind, lvl);
  }

  // ------------------------------------------------------------ utilidades
  t() {
    return this.ctx.currentTime;
  }
  churchBell() {
    return this.lib.bell(mtof(45), { kind: 'church', dur: 9 });
  }
  smallBell() {
    return this.lib.bell(mtof(76), { kind: 'small', dur: 4 });
  }
  makeRasp(k) {
    const n = 1024,
      c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      c[i] = Math.tanh(x * k) / Math.tanh(k);
    }
    return c;
  }
  dist(p) {
    const L = this.lis;
    return Math.hypot(p.x - L.x, (p.y ?? L.y) - L.y, p.z - L.z);
  }
  // Atenúa la música unos instantes (golpes, rugidos, campanas).
  duck(amount, hold = 0.3) {
    if (!this.ok) return;
    const t = this.t();
    const target = 1 - amount;
    if (this._duckUntil > t && target >= this._duckLvl) return;
    this._duckLvl = target;
    this._duckUntil = t + hold;
    const g = this.duckG.gain;
    if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t);
    else g.cancelScheduledValues(t);
    g.setTargetAtTime(target, t, 0.03);
    g.setTargetAtTime(1, t + hold, 0.5);
  }
  // Fija un parámetro solo si cambia (evita llenar la línea de tiempo).
  setP(param, v, tc = 0.2) {
    if (param._v !== undefined && Math.abs(param._v - v) <= Math.abs(v) * 0.01 + 1e-5) return;
    param._v = v;
    param.setTargetAtTime(v, this.ctx.currentTime, tc);
  }
  panner(ref = 3, roll = 1.1, max = 100) {
    const p = this.ctx.createPanner();
    p.panningModel = 'equalpower';
    p.distanceModel = 'inverse';
    p.refDistance = ref;
    p.maxDistance = max;
    p.rolloffFactor = roll;
    return p;
  }
  // Coloca un panner; jump = salto inmediato (sin deslizar).
  setPos(p, x, y, z, glide = true) {
    const t = this.t();
    if (p.positionX) {
      for (const [a, v] of [
        [p.positionX, x],
        [p.positionY, y],
        [p.positionZ, z],
      ]) {
        if (glide) a.setTargetAtTime(v, t, 0.08);
        else {
          a.cancelScheduledValues(t);
          a.setValueAtTime(v, t);
        }
      }
    } else p.setPosition(x, y, z);
  }
  // ¿Hay un muro entre el oyente y la fuente?
  occluded(x, y, z, d) {
    const col = this.game && this.game.world && this.game.world.col;
    if (!col) return false;
    const L = this.lis;
    const len = d - 0.7;
    if (len <= 0.5) return false;
    const hit = col.raycast(L.x, L.y, L.z, (x - L.x) / d, (y - L.y) / d, (z - L.z) / d, len, (b) => b.tag !== 'floor' && b.tag !== 'fog' && !b.camOnly && b.maxy - b.miny > 1.2);
    return hit < len;
  }

  // Cadena de salida de un sonido: ganancia -> (absorción/oclusión) ->
  // panorama 3D -> bus, con envío a la reverberación de la sala.
  out(pos, o = {}) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = o.gain ?? 1;
    let node = g;
    let wet = o.verb ?? 0.25;
    if (pos) {
      const L = this.lis;
      const px = pos.x,
        py = (pos.y ?? L.y - 1) + 1,
        pz = pos.z;
      const d = Math.hypot(px - L.x, py - L.y, pz - L.z);
      let cut = 20000 * Math.exp(-d / 38);
      if (o.occlude !== false && d > 2.5 && this.occluded(px, py, pz, d)) {
        cut = Math.min(cut, 650);
        g.gain.value *= 0.6;
        wet *= 1.5;
      }
      if (cut < 15000) {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = Math.max(350, cut);
        lp.Q.value = 0.5;
        g.connect(lp);
        node = lp;
      }
      const p = this.panner(o.ref ?? 3, o.roll ?? 1.1);
      this.setPos(p, px, py, pz, false);
      node.connect(p);
      node = p;
      wet *= 1 + Math.min(1.2, d / 30);
    }
    node.connect(o.bus || this.sfx);
    let send = null;
    if (wet > 0.001) {
      send = ctx.createGain();
      send.gain.value = wet;
      node.connect(send).connect(this.verbIn);
    }
    setTimeout(
      () => {
        try {
          g.disconnect();
          node.disconnect();
          if (send) send.disconnect();
        } catch (e) {}
      },
      (o.life ?? 3) * 1000,
    );
    return g;
  }

  noise(dest, t0, dur, { type = 'bandpass', f0 = 1000, f1 = null, q = 1, gain = 0.5, a = 0.005, buf = null, rate = 1, curve = 'exp' } = {}) {
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
    a = Math.min(a, dur * 0.9);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + a);
    if (curve === 'lin') {
      g.gain.setValueAtTime(Math.max(0.0002, gain), t0 + Math.max(a, dur * 0.6));
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    } else g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t0, Math.random() * s.buffer.duration * 0.8);
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
    a = Math.min(a, dur * 0.9);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + a);
    if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    else {
      g.gain.setValueAtTime(gain, t0 + Math.max(a, dur * 0.7));
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    }
    o.connect(g).connect(dest);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
    return o;
  }
  // Reproduce un buffer de la biblioteca con filtros y envolvente opcionales.
  smp(dest, t0, buffer, o = {}) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = buffer;
    s.playbackRate.value = o.rate ?? 1;
    let n = s;
    for (const [type, f] of [
      ['lowpass', o.lp],
      ['highpass', o.hp],
    ]) {
      if (!f) continue;
      const fl = ctx.createBiquadFilter();
      fl.type = type;
      fl.frequency.value = f;
      n.connect(fl);
      n = fl;
    }
    const g = ctx.createGain();
    const G = o.gain ?? 1;
    if (o.dur) {
      const r = Math.min(0.08, o.dur * 0.3);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(G, t0 + 0.004);
      g.gain.setValueAtTime(G, t0 + o.dur - r);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    } else g.gain.value = G;
    n.connect(g).connect(dest);
    s.start(t0, o.offset ?? 0);
    if (o.dur) s.stop(t0 + o.dur + 0.02);
    return s;
  }

  // Voz con formantes: gritos, gruñidos, lamentos. v1 = vocal final (se
  // desliza), rasp = aspereza subarmónica, dist = saturación, jit = temblor.
  voice(dest, t0, dur, o = {}) {
    const { f0 = 200, f1 = null, vowel = 'a', v1 = null, gain = 0.3, vib = 5, vibD = 6, type = 'sawtooth', breath = 0.1, a = 0.05, rasp = 0, dist = 0, jit = 0, rel = 0.35 } = o;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    if (f1) osc.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const nodes = [osc];
    if (vibD > 0) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = vib;
      const lg = ctx.createGain();
      lg.gain.value = vibD;
      lfo.connect(lg).connect(osc.detune);
      nodes.push(lfo);
    }
    if (jit > 0) {
      const js = ctx.createBufferSource();
      js.buffer = this.white;
      js.loop = true;
      const jl = ctx.createBiquadFilter();
      jl.type = 'lowpass';
      jl.frequency.value = 18;
      const jg = ctx.createGain();
      jg.gain.value = jit * 30;
      js.connect(jl).connect(jg).connect(osc.detune);
      nodes.push(js);
    }
    const src = ctx.createGain();
    osc.connect(src);
    if (rasp > 0) {
      // modulación subarmónica: voz rota, gruñido
      const sub = ctx.createOscillator();
      sub.type = 'square';
      sub.frequency.setValueAtTime(f0 * 0.5, t0);
      if (f1) sub.frequency.exponentialRampToValueAtTime(f1 * 0.5, t0 + dur);
      const sg = ctx.createGain();
      sg.gain.value = rasp * 0.5;
      src.gain.value = 1 - rasp * 0.5;
      sub.connect(sg).connect(src.gain);
      nodes.push(sub);
    }
    let exc = src;
    if (dist > 0) {
      const ws = ctx.createWaveShaper();
      ws.curve = this.raspCurve;
      ws.oversample = '2x';
      src.connect(ws);
      exc = ws;
    }
    const V = VOW[vowel] || VOW.a;
    const V1 = v1 ? VOW[v1] : null;
    const mix = ctx.createGain();
    mix.gain.value = 2.4;
    V.forEach(([fr, bw, amp], i) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(fr, t0);
      if (V1) bp.frequency.linearRampToValueAtTime(V1[i][0], t0 + dur * 0.8);
      bp.Q.value = fr / bw;
      const fg = ctx.createGain();
      fg.gain.value = amp;
      exc.connect(bp).connect(fg).connect(mix);
    });
    const g = ctx.createGain();
    const A = Math.min(a, dur * 0.5);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + A);
    g.gain.setValueAtTime(gain, t0 + Math.max(A, dur * (1 - rel)));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    mix.connect(g).connect(dest);
    for (const n of nodes) {
      n.start(t0);
      n.stop(t0 + dur + 0.05);
    }
    if (breath > 0) this.noise(dest, t0, dur, { type: 'bandpass', f0: V[1][0], f1: V1 ? V1[1][0] : null, q: 1.6, gain: breath * gain * 1.2, a: A });
  }

  // Chirrido de madera (fricción que se agarra y suelta) con resonancias.
  creak(dest, t0, dur, f, gain = 0.22) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t0);
    const n = Math.max(3, Math.floor(dur * 7));
    for (let i = 1; i <= n; i++) o.frequency.linearRampToValueAtTime(f * rnd(0.55, 1.6), t0 + (i / n) * dur);
    const mix = ctx.createGain();
    for (const [fr, q, a] of [
      [rnd(500, 700), 7, 1],
      [rnd(1100, 1500), 9, 0.6],
      [rnd(2300, 2900), 10, 0.3],
    ]) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = fr;
      bp.Q.value = q;
      const bg = ctx.createGain();
      bg.gain.value = a;
      o.connect(bp).connect(bg).connect(mix);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.08, dur * 0.3));
    for (let i = 1; i < n; i++) g.gain.linearRampToValueAtTime(gain * rnd(0.3, 1), t0 + (i / n) * dur * 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    mix.connect(g).connect(dest);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }
  // Metal: parciales inarmónicos (espadas, armaduras, rejas).
  metal(dest, t0, base, gain = 0.2, dur = 0.8, o = {}) {
    const R = o.ratios ?? [1, 2.76, 5.4, 8.93, 13.3];
    R.forEach((r, i) => {
      const f = base * r * rnd(0.985, 1.015);
      if (f < 16000) this.tone(dest, t0, dur * Math.max(0.2, 1 - i * 0.15), { f0: f, gain: gain / (1 + i * 0.8), a: 0.001 });
    });
    this.noise(dest, t0, 0.04, { type: 'highpass', f0: 3500, gain: gain * 1.2, a: 0.001 });
  }
  // Cascotes: clics cortos repartidos en el tiempo.
  debris(dest, t0, n, spread, o = {}) {
    for (let i = 0; i < n; i++) this.noise(dest, t0 + Math.pow(Math.random(), 1.6) * spread, rnd(0.02, 0.06), { f0: rnd(o.f0 ?? 700, o.f1 ?? 2600), q: rnd(2, 6), gain: rnd(0.05, 0.2) * (o.gain ?? 1), a: 0.001 });
  }
  // Cota de malla, cadenas: un fragmento del buffer de cadena.
  jingle(dest, t0, dur = 0.15, gain = 0.2, rate = 1) {
    this.smp(dest, t0, this.lib.chain(1.2), { gain, rate: rate * rnd(0.9, 1.1), offset: Math.random() * (1.1 - dur), dur, hp: 1500 });
  }
  whisper(dest, t0, dur, gain) {
    const n = Math.max(2, Math.floor(dur / 0.13));
    for (let i = 0; i < n; i++) {
      const V = VOW[pick(['a', 'e', 'i', 'o', 'u'])];
      const tt = t0 + i * 0.13 + rnd(0, 0.04);
      if (Math.random() < 0.3) this.noise(dest, tt, rnd(0.05, 0.1), { type: 'highpass', f0: rnd(4000, 6500), gain: gain * 0.5, a: 0.01 });
      else {
        const l = rnd(0.08, 0.16);
        this.noise(dest, tt, l, { f0: V[0][0] * 1.4, q: 4, gain: gain * rnd(0.4, 1), a: 0.02 });
        this.noise(dest, tt, l, { f0: V[1][0], q: 6, gain: gain * rnd(0.3, 0.7), a: 0.02 });
      }
    }
  }
  // Rezo ininteligible: sílabas cortas con vocales al azar.
  mutter(d, t, dur, f0) {
    let tt = t;
    while (tt < t + dur) {
      const l = rnd(0.1, 0.22);
      this.voice(d, tt, l, { f0: f0 * rnd(0.92, 1.08), vowel: pick(['a', 'e', 'o', 'u']), v1: pick(['a', 'e', 'i', 'o', 'u']), gain: 0.06, vibD: 0, breath: 0.8, a: 0.02, jit: 25 });
      tt += l + rnd(0.02, 0.12);
    }
  }
  // Hueso que se sale de su sitio: chasquido seco, golpe sordo y algo húmedo.
  boneCrack(d, t, k = 1) {
    this.noise(d, t, 0.012, { type: 'highpass', f0: rnd(2200, 3800), gain: 0.5 * k, a: 0.0005 });
    this.noise(d, t, 0.03, { f0: rnd(900, 1500), q: 3, gain: 0.35 * k, a: 0.001 });
    this.tone(d, t, 0.05, { f0: rnd(170, 240), f1: 70, gain: 0.3 * k, a: 0.001 });
    this.noise(d, t + 0.01, 0.07, { f0: rnd(500, 800), q: 2, gain: 0.12 * k, a: 0.005, buf: this.brown, rate: 4 });
  }
  chitter(d, t, dur, gain) {
    const n = Math.floor(dur / 0.035);
    for (let i = 0; i < n; i++) if (Math.random() < 0.7) this.noise(d, t + i * 0.035 + rnd(0, 0.01), 0.015, { f0: rnd(2500, 4500), q: 8, gain: gain * rnd(0.4, 1), a: 0.001 });
  }
  bodyFall(d, t, k = 1, armor = false) {
    this.tone(d, t, 0.3 * k, { f0: 85 / Math.sqrt(k), f1: 35, gain: 0.6 });
    this.noise(d, t, 0.25 * k, { type: 'lowpass', f0: 900, f1: 200, gain: 0.45, a: 0.003, buf: this.brown, rate: 3 });
    this.tone(d, t + 0.18 * k, 0.15, { f0: 110, f1: 55, gain: 0.25 });
    if (armor) {
      this.jingle(d, t, 0.5, 0.25);
      this.metal(d, t + 0.05, rnd(500, 700), 0.08, 0.6);
    }
  }
  // Pisada según el suelo (el pie izquierdo y el derecho suenan distinto).
  stepSound(d, t, k = 1, side = 0, surface = null) {
    const s = surface || this.surface || 'stone';
    const pv = side ? 1.04 : 0.97;
    if (s === 'stone') {
      this.tone(d, t, 0.06, { f0: 95 * pv, f1: 50, gain: 0.35 * k });
      this.noise(d, t, 0.045, { f0: rnd(1700, 2600) * pv, q: 1.4, gain: 0.3 * k, a: 0.002 });
      if (Math.random() < 0.3) this.noise(d, t + 0.03, 0.08, { f0: rnd(3000, 4500), q: 2, gain: 0.07 * k, a: 0.01 });
    } else if (s === 'wood') {
      this.tone(d, t, 0.09, { f0: rnd(160, 210) * pv, f1: 110, gain: 0.4 * k });
      this.noise(d, t, 0.06, { f0: 700 * pv, q: 3, gain: 0.25 * k, a: 0.002, buf: this.brown, rate: 4 });
      if (Math.random() < 0.08) this.creak(d, t + 0.03, 0.35, rnd(90, 140), 0.07);
    } else {
      this.noise(d, t, 0.09, { type: 'lowpass', f0: rnd(600, 900) * pv, gain: 0.5 * k, a: 0.006, buf: this.brown, rate: 4 });
      this.noise(d, t + 0.02, 0.07, { f0: rnd(1500, 2200), q: 1.2, gain: 0.08 * k, a: 0.01 });
      this.tone(d, t, 0.06, { f0: 70, f1: 45, gain: 0.25 * k });
    }
  }

  // ------------------------------------------------------------ efectos
  play(name, pos = null, o = {}) {
    if (!this.ok) return;
    const t = this.t() + 0.005;
    const P = pos && pos.x !== undefined ? pos : null;
    if (P && this.dist(P) > (FAR[name] ?? 70)) return;
    let d;
    switch (name) {
      case 'crow': {
        d = this.out(P, { gain: 0.5, verb: 0.5, ref: 5, life: 3 });
        const n = 1 + Math.floor(Math.random() * 3);
        const base = rnd(480, 640);
        for (let i = 0; i < n; i++) {
          const f = base * rnd(0.95, 1.05);
          this.voice(d, t + i * rnd(0.28, 0.4), rnd(0.2, 0.3), { f0: f, f1: f * 0.7, vowel: 'a', v1: 'o', gain: 0.24, vib: 30, vibD: 60, breath: 0.4, a: 0.012, rasp: 0.7, dist: 1, rel: 0.5 });
        }
        // aleteo
        if (Math.random() < 0.4) for (let i = 0; i < 6; i++) this.noise(d, t + n * 0.35 + i * 0.11, 0.08, { type: 'lowpass', f0: 900, gain: 0.12, a: 0.02, buf: this.pink });
        break;
      }
      case 'swing':
      case 'swingHeavy': {
        const h = name === 'swingHeavy';
        d = this.out(P, { gain: h ? 0.75 : 0.6, verb: 0.08, life: 1.5, occlude: false });
        const dur = h ? 0.42 : 0.26;
        // silbido del filo: ruido que barre hacia el agudo y cae
        this.noise(d, t, dur, { f0: h ? 280 : 450, f1: h ? 1300 : 2400, q: 2.2, gain: 0.5, a: dur * 0.55, curve: 'lin' });
        this.noise(d, t + dur * 0.35, dur * 0.6, { f0: h ? 1800 : 3200, f1: 900, q: 3, gain: 0.12, a: dur * 0.2 });
        if (h) {
          this.tone(d, t + 0.06, 0.34, { f0: 95, f1: 55, gain: 0.22, a: 0.08 });
          this.voice(d, t, 0.26, { f0: 125, f1: 105, vowel: 'a', v1: 'o', gain: 0.1, vibD: 0, breath: 0.6, a: 0.02, rel: 0.6 });
        }
        this.jingle(d, t, 0.14, h ? 0.08 : 0.05);
        break;
      }
      // ---- armas
      case 'swingKnife': {
        // facón: silbido corto y agudo con un tintineo de la guarda
        d = this.out(P, { gain: 0.55, verb: 0.06, life: 1.2, occlude: false });
        this.noise(d, t, 0.15, { f0: 900, f1: 3800, q: 2.4, gain: 0.45, a: 0.07, curve: 'lin' });
        this.noise(d, t + 0.06, 0.1, { f0: 4200, f1: 2200, q: 3, gain: 0.1, a: 0.02 });
        this.metal(d, t, rnd(2600, 3000), 0.012, 0.2, { ratios: [1, 2.7] });
        break;
      }
      case 'swingAxe': {
        // hacha: masa que corta el aire, crujido del mango y esfuerzo
        d = this.out(P, { gain: 0.85, verb: 0.12, life: 2, occlude: false });
        this.noise(d, t, 0.55, { f0: 160, f1: 900, q: 1.6, gain: 0.6, a: 0.3, curve: 'lin', buf: this.brown, rate: 3 });
        this.noise(d, t + 0.18, 0.35, { f0: 600, f1: 260, q: 2, gain: 0.25, a: 0.08 });
        this.tone(d, t + 0.1, 0.45, { f0: 78, f1: 46, gain: 0.3, a: 0.12 });
        this.creak(d, t, 0.18, rnd(110, 150), 0.05);
        this.voice(d, t, 0.34, { f0: 118, f1: 96, vowel: 'a', v1: 'u', gain: 0.12, vibD: 0, breath: 0.7, a: 0.03, rasp: 0.3, rel: 0.6 });
        this.jingle(d, t + 0.05, 0.2, 0.1);
        break;
      }
      case 'thrust': {
        // lanza: estocada seca, el asta que vibra y la malla
        d = this.out(P, { gain: 0.6, verb: 0.08, life: 1.2, occlude: false });
        this.noise(d, t, 0.13, { f0: 1100, f1: 2800, q: 2, gain: 0.45, a: 0.05, curve: 'lin' });
        this.noise(d, t + 0.05, 0.09, { f0: 2400, f1: 1300, q: 2.5, gain: 0.14, a: 0.01 });
        this.tone(d, t + 0.02, 0.16, { f0: rnd(170, 200), f1: 140, gain: 0.1, type: 'triangle' });
        this.jingle(d, t, 0.12, 0.06);
        break;
      }
      case 'swingKatana': {
        // katana: silbido limpio y afinado, con un leve brillo sagrado
        d = this.out(P, { gain: 0.6, verb: 0.12, life: 1.6, occlude: false });
        this.noise(d, t, 0.2, { f0: 1600, f1: 5200, q: 5, gain: 0.34, a: 0.1, curve: 'lin' });
        this.noise(d, t + 0.08, 0.14, { f0: 5200, f1: 2600, q: 4, gain: 0.12, a: 0.02 });
        this.tone(d, t + 0.02, 0.5, { f0: rnd(2380, 2460), gain: 0.012, a: 0.05 });
        this.smp(d, t + 0.1, this.smallBell(), { gain: 0.018, rate: mtof(88) / mtof(76) });
        break;
      }
      case 'iai': {
        // desenvainado: roce del acero contra la boca de la saya y el destello
        d = this.out(P, { gain: 0.75, verb: 0.3, life: 3, occlude: false });
        this.noise(d, t, 0.12, { type: 'highpass', f0: 3200, gain: 0.16, a: 0.01 });
        this.metal(d, t + 0.02, 2800, 0.05, 1.1, { ratios: [1, 1.5, 2.76] });
        this.noise(d, t + 0.05, 0.22, { f0: 1800, f1: 6000, q: 4, gain: 0.4, a: 0.06, curve: 'lin' });
        [83, 88, 95].forEach((m, i) => this.smp(d, t + 0.1 + i * 0.05, this.smallBell(), { gain: 0.05, rate: mtof(m) / mtof(76) }));
        this.voice(d, t + 0.08, 1.2, { f0: mtof(69), vowel: 'a', gain: 0.03, vib: 5, vibD: 8, breath: 0.4, a: 0.1, type: 'triangle' });
        this.duck(0.2, 0.5);
        break;
      }
      case 'flick': {
        // chiburi: sacudida rápida de la hoja y gotas al suelo
        d = this.out(P, { gain: 0.5, verb: 0.1, life: 1.2, occlude: false });
        this.noise(d, t, 0.1, { f0: 2400, f1: 900, q: 3, gain: 0.25, a: 0.02 });
        for (let i = 0; i < 4; i++) this.noise(d, t + 0.12 + i * rnd(0.03, 0.06), 0.03, { f0: rnd(900, 1500), q: 4, gain: 0.08, a: 0.002, buf: this.brown, rate: 4 });
        break;
      }
      case 'hitAxe': {
        // hacha en carne y hueso
        d = this.out(P, { gain: 1, verb: 0.2, life: 1.8 });
        this.tone(d, t, 0.32, { f0: 120, f1: 38, gain: 0.85 });
        this.noise(d, t, 0.1, { type: 'lowpass', f0: 3000, f1: 400, gain: 0.8, a: 0.001 });
        this.noise(d, t + 0.01, 0.34, { f0: 650, f1: 220, q: 3, gain: 0.45, buf: this.brown, rate: 3 });
        this.debris(d, t + 0.01, 6, 0.08, { f0: 1600, f1: 3400, gain: 1.4 });
        this.tone(d, t, 0.45, { f0: 58, f1: 28, gain: 0.55 });
        this.duck(0.25, 0.3);
        break;
      }
      case 'axeGround': {
        // la cabeza del hacha se clava en el suelo
        d = this.out(P, { gain: 0.9, verb: 0.35, life: 2.5, ref: 5 });
        this.tone(d, t, 0.5, { f0: 70, f1: 30, gain: 0.8 });
        this.noise(d, t, 0.45, { type: 'lowpass', f0: 1100, f1: 160, gain: 0.6, a: 0.002 });
        this.metal(d, t, rnd(420, 480), 0.07, 0.6, { ratios: [1, 2.3, 3.9] });
        this.debris(d, t + 0.03, 10, 0.5, { gain: 1.1 });
        this.duck(0.3, 0.4);
        break;
      }
      case 'hit':
      case 'hitHeavy': {
        const h = name === 'hitHeavy';
        d = this.out(P, { gain: h ? 1 : 0.85, verb: 0.2, life: 1.5 });
        this.tone(d, t, h ? 0.28 : 0.18, { f0: h ? 130 : 170, f1: 42, gain: 0.75 }); // cuerpo
        this.noise(d, t, 0.09, { type: 'lowpass', f0: 3500, f1: 400, gain: 0.7, a: 0.001 }); // chasquido
        this.noise(d, t + 0.01, h ? 0.3 : 0.2, { f0: 750, f1: 260, q: 3.5, gain: 0.4, buf: this.brown, rate: 3 }); // carne
        this.noise(d, t + 0.03, 0.16, { f0: rnd(1200, 1700), f1: 500, q: 5, gain: 0.12, buf: this.brown, rate: 5 }); // salpicadura
        if (h) {
          this.debris(d, t + 0.01, 4, 0.06, { f0: 1800, f1: 3500, gain: 1.2 }); // hueso
          this.tone(d, t, 0.4, { f0: 60, f1: 30, gain: 0.5 });
        }
        this.duck(h ? 0.2 : 0.1, 0.25);
        break;
      }
      case 'clang': {
        d = this.out(P, { gain: 0.75, verb: 0.35, life: 2.5 });
        this.metal(d, t, rnd(480, 600), 0.22, 1.1);
        this.metal(d, t + 0.002, rnd(1300, 1700), 0.08, 0.5);
        this.tone(d, t, 0.1, { f0: 220, f1: 110, gain: 0.35 });
        this.noise(d, t, 0.25, { f0: 5000, f1: 2500, q: 1, gain: 0.1, a: 0.001 }); // chispas
        break;
      }
      // parry: choque seco y brillante, el acero que canta, chispas y un golpe
      // sordo (con escudo, la madera y el tachón; a dos manos, sólo acero)
      case 'parry': {
        const sh = o.kind === 'shield',
          haft = o.kind === 'haft';
        d = this.out(P, { gain: 1, verb: 0.5, life: 3.2, occlude: false });
        this.metal(d, t, rnd(sh ? 640 : haft ? 520 : 1050, sh ? 760 : haft ? 600 : 1250), 0.3, 1.7, { ratios: [1, 2.32, 4.25, 6.63, 9.38] });
        this.metal(d, t + 0.003, rnd(2300, 2800), 0.12, 1.0);
        this.noise(d, t, 0.05, { type: 'highpass', f0: 4200, gain: 0.55, a: 0.0005 });
        this.noise(d, t, 0.4, { f0: 6200, f1: 2400, q: 2, gain: 0.17, a: 0.001 }); // chispas
        this.tone(d, t, 0.2, { f0: sh ? 150 : 200, f1: 60, gain: 0.6 });
        if (sh || haft) this.noise(d, t, 0.12, { f0: 800, f1: 300, q: 2, gain: 0.32, buf: this.brown, rate: 4, a: 0.001 });
        if (!sh) this.noise(d, t + 0.02, 0.22, { f0: 3000, f1: 7000, q: 6, gain: 0.08, a: 0.01, curve: 'lin' }); // la hoja que se desliza
        this.duck(0.4, 0.45);
        break;
      }
      // un hueso lanzado que se aparta de un golpe
      case 'deflect': {
        d = this.out(P, { gain: 0.8, verb: 0.3, life: 2, occlude: false });
        this.metal(d, t, rnd(1200, 1500), 0.12, 0.4, { ratios: [1, 2.6, 4.1] });
        this.boneCrack(d, t, 0.6);
        this.noise(d, t, 0.15, { f0: 5000, f1: 2500, q: 2, gain: 0.08, a: 0.001 });
        break;
      }
      // el golpe de gracia: el arma entra hasta dentro, hueso que cede y un
      // golpe hondo
      case 'riposte': {
        d = this.out(P, { gain: 1, verb: 0.4, life: 3.2, occlude: false });
        this.tone(d, t, 0.55, { f0: 92, f1: 28, gain: 0.95 });
        this.noise(d, t, 0.12, { type: 'lowpass', f0: 3200, f1: 300, gain: 0.85, a: 0.001 });
        this.noise(d, t + 0.02, 0.5, { f0: 620, f1: 170, q: 3, gain: 0.58, buf: this.brown, rate: 3 });
        this.boneCrack(d, t + 0.03, 1.6);
        this.boneCrack(d, t + 0.1, 1.15);
        this.noise(d, t + 0.05, 0.32, { f0: rnd(1100, 1500), f1: 400, q: 5, gain: 0.24, buf: this.brown, rate: 5 });
        this.metal(d, t, rnd(240, 280), 0.06, 1.2, { ratios: [1, 2.1, 3.7] });
        this.duck(0.55, 0.7);
        break;
      }
      // aviso: este golpe no se puede desviar (un toque grave y disonante)
      case 'peril': {
        d = this.out(P, { gain: 1, verb: 0.55, life: 2.6, occlude: false });
        this.tone(d, t, 0.6, { f0: 98, gain: 0.36, type: 'sawtooth', a: 0.008 });
        this.tone(d, t, 0.6, { f0: 104.5, gain: 0.32, type: 'sawtooth', a: 0.008 });
        this.metal(d, t, 330, 0.22, 1.0, { ratios: [1, 1.41, 2.83] });
        this.metal(d, t + 0.01, 1480, 0.08, 0.5, { ratios: [1, 1.19] });
        this.noise(d, t, 0.2, { f0: 2400, f1: 900, q: 6, gain: 0.12, a: 0.005 });
        break;
      }
      case 'block': {
        d = this.out(P, { gain: 0.8, verb: 0.3, life: 2, occlude: false });
        this.tone(d, t, 0.16, { f0: 200, f1: 85, gain: 0.6 }); // madera del escudo
        this.noise(d, t, 0.12, { f0: 900, f1: 400, q: 2, gain: 0.4, buf: this.brown, rate: 4, a: 0.001 });
        this.metal(d, t, rnd(360, 420), 0.13, 0.7); // tachón y cerco de hierro
        this.jingle(d, t + 0.02, 0.2, 0.1);
        this.duck(0.12, 0.2);
        break;
      }
      case 'guardbreak': {
        d = this.out(P, { gain: 1, verb: 0.4, life: 3, occlude: false });
        this.metal(d, t, rnd(300, 340), 0.25, 1.4);
        this.metal(d, t + 0.01, rnd(700, 800), 0.12, 0.9);
        this.tone(d, t, 0.6, { f0: 95, f1: 38, gain: 0.8 });
        this.noise(d, t + 0.03, 0.5, { type: 'lowpass', f0: 1100, f1: 200, gain: 0.5 });
        this.noise(d, t + 0.08, 0.3, { f0: 1500, f1: 600, q: 3, gain: 0.2, buf: this.brown, rate: 4 }); // la madera cruje
        this.jingle(d, t + 0.05, 0.4, 0.18);
        this.duck(0.3, 0.5);
        break;
      }
      case 'playerHurt': {
        d = this.out(P, { gain: 0.85, verb: 0.15, life: 1.5, occlude: false });
        this.voice(d, t + 0.02, 0.32, { f0: rnd(145, 165), f1: 100, vowel: pick(['a', 'u', 'o']), v1: 'u', gain: 0.22, vibD: 0, breath: 0.6, a: 0.01, rasp: 0.35, jit: 20 });
        this.tone(d, t, 0.18, { f0: 140, f1: 48, gain: 0.7 });
        this.noise(d, t, 0.08, { type: 'lowpass', f0: 2600, f1: 500, gain: 0.5, a: 0.001 });
        this.noise(d, t + 0.01, 0.2, { f0: 700, f1: 280, q: 3, gain: 0.3, buf: this.brown, rate: 3 });
        this.jingle(d, t + 0.02, 0.25, 0.12);
        this.duck(0.25, 0.3);
        break;
      }
      case 'roll': {
        d = this.out(P, { gain: 0.6, verb: 0.08, life: 1.5, occlude: false });
        this.noise(d, t, 0.34, { f0: 900, f1: 350, q: 0.9, gain: 0.3, a: 0.08, buf: this.pink }); // ropa
        this.jingle(d, t + 0.05, 0.3, 0.12);
        this.stepSound(d, t + 0.32, 1.3);
        break;
      }
      case 'step': {
        d = this.out(null, { gain: 0.34, verb: 0.08, life: 0.8 });
        const k = (o.run ? 1.35 : 1) * clamp(o.w ?? 1, 0.4, 1);
        this.stepSound(d, t, k, o.side);
        if (Math.random() < (o.run ? 0.8 : 0.35)) this.jingle(d, t + 0.01, 0.1, 0.035 * k);
        break;
      }
      case 'land': {
        const v = clamp(((o.v ?? 7) - 5) / 8, 0, 1);
        d = this.out(null, { gain: 0.5 + v * 0.4, verb: 0.12, life: 1.2 });
        this.stepSound(d, t, 1.2 + v * 0.6);
        this.stepSound(d, t + 0.05, 0.9, 1);
        this.jingle(d, t, 0.3, 0.15);
        if (v > 0.4) this.voice(d, t + 0.02, 0.2, { f0: 130, f1: 100, vowel: 'u', gain: 0.1, vibD: 0, breath: 0.7, a: 0.01 });
        break;
      }
      case 'heal': {
        d = this.out(P, { gain: 0.6, verb: 0.5, life: 4, occlude: false });
        // tragos
        for (let i = 0; i < 2; i++) this.tone(d, t + i * 0.22, 0.12, { f0: rnd(260, 320), f1: 150, gain: 0.25, a: 0.01 });
        this.noise(d, t, 0.4, { f0: 500, q: 3, gain: 0.08, buf: this.brown, rate: 2, a: 0.05 });
        // resplandor sagrado
        [76, 83, 88, 95].forEach((m, i) => this.smp(d, t + 0.45 + i * 0.07, this.smallBell(), { gain: 0.07, rate: mtof(m) / mtof(76) }));
        this.voice(d, t + 0.4, 1.6, { f0: mtof(74), vowel: 'a', gain: 0.04, vib: 5, vibD: 8, breath: 0.3, a: 0.4, type: 'triangle' });
        this.noise(d, t + 0.4, 1.3, { f0: 3500, q: 2.5, gain: 0.05, a: 0.5 });
        break;
      }
      case 'slam': {
        d = this.out(P, { gain: 1, verb: 0.45, life: 3.5, ref: 6 });
        this.tone(d, t, 0.8, { f0: 72, f1: 26, gain: 1 });
        this.noise(d, t, 0.7, { type: 'lowpass', f0: 1200, f1: 120, gain: 0.8, a: 0.002 });
        this.smp(d, t, this.lib.drum('taiko'), { gain: 0.6, rate: 0.6 });
        this.debris(d, t + 0.05, 14, 0.8, { gain: 1.2 });
        this.duck(0.4, 0.6);
        break;
      }
      case 'bellToll': {
        d = this.out(P, { gain: 0.9, verb: 0.8, life: 20, ref: 10, roll: 0.5, occlude: false });
        this.smp(d, t, this.churchBell(), { gain: 0.45, rate: mtof(43) / mtof(45) });
        this.smp(d, t, this.churchBell(), { gain: 0.18, rate: mtof(31) / mtof(45), lp: 700 }); // zumbido grave
        this.duck(0.2, 2);
        break;
      }
      case 'roar': {
        d = this.out(P, { gain: 1, verb: 0.6, life: 4, ref: 9, roll: 0.8 });
        this.voice(d, t, 2.1, { f0: 68, f1: 52, vowel: 'o', v1: 'a', gain: 0.5, vib: 7, vibD: 35, breath: 0.8, a: 0.12, rasp: 0.8, dist: 1, jit: 40 });
        this.voice(d, t + 0.05, 2.0, { f0: 101, f1: 78, vowel: 'a', v1: 'u', gain: 0.32, vib: 5.5, vibD: 30, breath: 0, a: 0.2, rasp: 0.5, dist: 1 });
        this.voice(d, t + 0.1, 1.8, { f0: 150, f1: 120, vowel: 'e', gain: 0.12, vib: 9, vibD: 50, breath: 0, a: 0.3, rasp: 0.6 });
        this.noise(d, t, 2, { type: 'lowpass', f0: 400, gain: 0.4, a: 0.2, buf: this.brown, rate: 2, curve: 'lin' });
        this.duck(0.35, 1.6);
        break;
      }
      case 'wail': {
        d = this.out(P, { gain: 0.8, verb: 0.8, life: 3 });
        for (const [k, g] of [
          [1, 0.2],
          [1.012, 0.14],
          [0.5, 0.08],
        ])
          this.voice(d, t, 1.4, { f0: 620 * k, f1: 470 * k, vowel: 'i', v1: 'a', gain: g, vib: 6, vibD: 60, breath: 0.25, type: 'triangle', a: 0.1, jit: 25 });
        this.noise(d, t, 1.2, { f0: 2500, f1: 800, q: 3, gain: 0.06, a: 0.3 });
        break;
      }
      case 'wailHit': {
        d = this.out(P, { gain: 0.7, verb: 0.7, life: 2 });
        this.noise(d, t, 0.45, { f0: 2400, f1: 450, q: 2, gain: 0.4, a: 0.002 });
        this.voice(d, t, 0.35, { f0: 900, f1: 500, vowel: 'i', gain: 0.1, type: 'triangle', breath: 0.3, a: 0.005 });
        break;
      }
      case 'fireWhoosh': {
        d = this.out(P, { gain: 0.8, verb: 0.3, life: 2.5 });
        this.noise(d, t, 0.7, { f0: 220, f1: 1500, q: 0.8, gain: 0.6, a: 0.12, buf: this.brown, rate: 3 });
        this.noise(d, t + 0.1, 0.9, { type: 'lowpass', f0: 600, gain: 0.3, a: 0.1, buf: this.brown, rate: 1.5 });
        this.smp(d, t + 0.05, this.lib.crackle(6), { gain: 0.5, offset: rnd(0, 4), dur: 0.9, hp: 400 });
        break;
      }
      case 'explosion': {
        d = this.out(P, { gain: 1, verb: 0.55, life: 4, ref: 7, roll: 0.9 });
        this.tone(d, t, 0.9, { f0: 64, f1: 24, gain: 1 });
        this.noise(d, t, 1.4, { type: 'lowpass', f0: 3000, f1: 140, gain: 0.95, a: 0.002 });
        this.smp(d, t, this.lib.drum('taiko'), { gain: 0.7, rate: 0.5 });
        this.smp(d, t + 0.1, this.lib.crackle(6), { gain: 0.6, offset: rnd(0, 3), dur: 1.6, hp: 300 });
        this.debris(d, t + 0.15, 12, 1.2);
        this.duck(0.5, 0.9);
        break;
      }
      case 'burn': {
        d = this.out(P, { gain: 0.5, verb: 0.1, life: 1.5, occlude: false });
        this.noise(d, t, 0.35, { type: 'highpass', f0: 2800, gain: 0.25, a: 0.01 });
        this.smp(d, t, this.lib.crackle(6), { gain: 0.35, offset: rnd(0, 5), dur: 0.4, hp: 1200 });
        break;
      }
      case 'doorOpen': {
        d = this.out(P, { gain: 0.75, verb: 0.45, life: 3.5 });
        this.noise(d, t, 0.05, { f0: 2400, q: 6, gain: 0.25, a: 0.001 }); // pestillo
        this.tone(d, t, 0.05, { type: 'square', f0: 700, f1: 380, gain: 0.05 });
        const len = rnd(0.9, 1.3);
        this.creak(d, t + 0.12, len, rnd(70, 110), 0.22);
        this.tone(d, t + 0.2 + len, 0.25, { f0: 110, f1: 60, gain: 0.3 }); // la hoja llega al tope
        this.noise(d, t + 0.2 + len, 0.15, { type: 'lowpass', f0: 800, gain: 0.2, buf: this.brown, rate: 3 });
        break;
      }
      case 'gateOpen': {
        d = this.out(P, { gain: 0.85, verb: 0.55, life: 5, ref: 5 });
        this.smp(d, t, this.lib.chain(1.2), { gain: 0.45, rate: 0.8 });
        this.smp(d, t + 0.9, this.lib.chain(1.2), { gain: 0.35, rate: 0.7 });
        this.noise(d, t, 2.4, { type: 'lowpass', f0: 280, gain: 0.35, a: 0.2, buf: this.brown, rate: 2, curve: 'lin' }); // el torno
        this.creak(d, t + 0.2, 1.9, 150, 0.2);
        this.metal(d, t + 2.3, 190, 0.2, 1.2, { ratios: [1, 2.3, 3.9, 5.6] });
        this.tone(d, t + 2.3, 0.4, { f0: 80, f1: 40, gain: 0.5 });
        break;
      }
      case 'unlock': {
        d = this.out(P, { gain: 0.7, verb: 0.3, life: 3.5 });
        this.noise(d, t, 0.25, { f0: 3500, f1: 2500, q: 4, gain: 0.06, a: 0.05 }); // la llave entra
        for (const dt of [0.3, 0.42]) {
          this.noise(d, t + dt, 0.03, { f0: 3000, q: 8, gain: 0.35, a: 0.001 });
          this.metal(d, t + dt, rnd(1800, 2200), 0.03, 0.2);
        }
        this.tone(d, t + 0.55, 0.12, { f0: 180, f1: 90, gain: 0.35 }); // el cerrojo corre
        this.noise(d, t + 0.55, 0.1, { f0: 1500, q: 3, gain: 0.2 });
        this.creak(d, t + 0.8, rnd(0.9, 1.2), rnd(70, 100), 0.2);
        break;
      }
      case 'locked': {
        d = this.out(P, { gain: 0.7, verb: 0.3, life: 2 });
        for (let i = 0; i < 3; i++) {
          const tt = t + i * 0.11 + rnd(0, 0.02);
          this.noise(d, tt, 0.04, { f0: rnd(1400, 2200), q: 5, gain: 0.3, a: 0.001 });
          this.tone(d, tt, 0.1, { f0: rnd(100, 130), f1: 70, gain: 0.3 });
        }
        break;
      }
      case 'bar': {
        d = this.out(P, { gain: 0.75, verb: 0.4, life: 3.5 });
        this.noise(d, t, 0.55, { f0: 520, f1: 260, q: 2, gain: 0.35, a: 0.05, buf: this.brown, rate: 4, curve: 'lin' }); // la tranca se desliza
        this.creak(d, t + 0.05, 0.45, 60, 0.08);
        this.tone(d, t + 0.62, 0.22, { f0: 140, f1: 60, gain: 0.55 }); // cae al suelo
        this.tone(d, t + 0.82, 0.14, { f0: 170, f1: 80, gain: 0.25 });
        this.creak(d, t + 1.1, 1.0, rnd(70, 100), 0.18);
        break;
      }
      case 'boards': {
        d = this.out(P, { gain: 0.95, verb: 0.35, life: 3.5 });
        for (const dt of [0, 0.35, 0.62, 1.0]) {
          this.creak(d, t + dt, 0.14, rnd(90, 160), 0.12); // la palanca fuerza
          this.noise(d, t + dt + 0.12, 0.1, { f0: rnd(900, 1900), q: 3, gain: 0.55, a: 0.001 }); // la madera salta
          this.tone(d, t + dt + 0.12, 0.14, { f0: rnd(170, 250), f1: 90, gain: 0.35 });
          this.debris(d, t + dt + 0.14, 3, 0.1, { f0: 2000, f1: 4000, gain: 0.8 }); // astillas
          this.tone(d, t + dt + 0.42, 0.18, { f0: rnd(120, 160), f1: 70, gain: 0.25 }); // el tablón cae
        }
        break;
      }
      case 'woodBreak': {
        d = this.out(P, { gain: 1, verb: 0.35, life: 3 });
        this.tone(d, t, 0.3, { f0: 150, f1: 50, gain: 0.8 }); // el golpe en el tablero
        this.noise(d, t, 0.07, { type: 'lowpass', f0: 4200, f1: 600, gain: 0.8, a: 0.001 }); // chasquido
        this.noise(d, t + 0.015, 0.24, { f0: rnd(1300, 1900), f1: 650, q: 3, gain: 0.45, a: 0.002, buf: this.brown, rate: 4 }); // la veta se raja
        this.creak(d, t + 0.02, 0.2, rnd(110, 150), 0.14);
        this.debris(d, t + 0.03, 8, 0.25, { f0: 1800, f1: 4200, gain: 1.1 }); // astillas
        this.tone(d, t + 0.34, 0.2, { f0: rnd(130, 160), f1: 60, gain: 0.45 }); // cae una mitad
        this.tone(d, t + 0.43, 0.2, { f0: rnd(110, 140), f1: 55, gain: 0.4 }); // y la otra
        this.debris(d, t + 0.36, 5, 0.3, { f0: 600, f1: 1800 });
        this.duck(0.25, 0.4);
        break;
      }
      case 'seal': {
        d = this.out(P, { gain: 0.95, verb: 0.65, life: 6 });
        this.metal(d, t, 900, 0.12, 1.2, { ratios: [1, 2.4, 4.1] }); // el anillo encaja
        this.noise(d, t + 0.3, 3.2, { type: 'lowpass', f0: 240, gain: 0.7, a: 0.4, buf: this.brown, rate: 1.4, curve: 'lin' }); // la losa se hunde
        this.tone(d, t + 0.3, 3.2, { f0: 40, gain: 0.45, a: 0.5, curve: 'lin' });
        this.debris(d, t + 0.5, 16, 2.8, { f0: 500, f1: 1800 });
        this.tone(d, t + 3.4, 0.6, { f0: 70, f1: 30, gain: 0.7 });
        this.duck(0.3, 3);
        break;
      }
      case 'pickup':
      case 'item': {
        d = this.out(null, { gain: 0.6, verb: 0.5, life: 3.5 });
        this.noise(d, t, 0.18, { f0: 2500, f1: 5000, q: 1, gain: 0.07, a: 0.05 });
        [76, 80, 83, 88].forEach((m, i) => this.smp(d, t + 0.05 + i * 0.075, this.lib.pluck(mtof(m), { bright: 0.8, dur: 2 }), { gain: 0.2 }));
        this.smp(d, t + 0.35, this.smallBell(), { gain: 0.06, rate: mtof(88) / mtof(76) });
        break;
      }
      case 'paper': {
        d = this.out(null, { gain: 0.55, verb: 0.1, life: 1.5 });
        for (let i = 0; i < 7; i++) this.noise(d, t + i * rnd(0.04, 0.08), rnd(0.04, 0.1), { f0: rnd(2200, 5500), q: rnd(0.8, 2), gain: rnd(0.1, 0.25), a: 0.004 });
        this.noise(d, t, 0.45, { type: 'highpass', f0: 3000, gain: 0.04, a: 0.1 });
        break;
      }
      case 'rest': {
        d = this.out(null, { gain: 0.6, verb: 0.6, life: 4 });
        this.noise(d, t, 0.9, { f0: 200, f1: 900, q: 0.8, gain: 0.35, a: 0.3, buf: this.brown, rate: 3 }); // prenden las velas
        this.smp(d, t + 0.3, this.lib.crackle(6), { gain: 0.4, offset: rnd(0, 4), dur: 1.4, hp: 500 });
        this.score.stinger('rest');
        break;
      }
      case 'death': {
        d = this.out(P, { gain: 0.8, verb: 0.3, life: 3, occlude: false });
        this.voice(d, t, 0.9, { f0: 150, f1: 70, vowel: 'a', v1: 'u', gain: 0.2, vibD: 0, breath: 0.7, a: 0.02, rasp: 0.5, jit: 30 });
        this.bodyFall(d, t + 0.9, 1.2, true);
        this.score.stinger('death');
        this.silenceUntil = Math.max(this.silenceUntil, this.t() + 8);
        break;
      }
      case 'stinger':
        if (this.t() > this.stingT) {
          this.stingT = this.t() + 8;
          this.score.stinger('alert');
        }
        break;
      case 'phantom':
        this.score.stinger('phantom');
        break;
      case 'discover':
        this.score.stinger('discover');
        break;
      case 'fog': {
        d = this.out(null, { gain: 0.6, verb: 0.9, life: 3 });
        this.noise(d, t, 1.4, { f0: 300, f1: 2600, q: 0.8, gain: 0.3, a: 0.6, buf: this.pink });
        this.score.stinger('fog');
        break;
      }
      // todas las articulaciones a la vez: el crujido del Descoyuntado
      case 'crack': {
        d = this.out(P, { gain: 0.9, verb: 0.6, life: 4, ref: 6 });
        for (let i = 0; i < 9; i++) this.boneCrack(d, t + Math.pow(i / 9, 1.4) * 0.5 + rnd(0, 0.03), rnd(0.7, 1.2));
        this.tone(d, t + 0.05, 0.6, { f0: 70, f1: 34, gain: 0.5 });
        this.voice(d, t + 0.1, 1.1, { f0: 380, f1: 880, vowel: 'a', v1: 'i', gain: 0.16, vib: 18, vibD: 90, breath: 0.6, type: 'square', rasp: 0.6, jit: 40 });
        this.duck(0.3, 0.6);
        break;
      }
      // manos y pies que golpean la piedra a toda prisa
      case 'scuttle': {
        d = this.out(P, { gain: 0.7, verb: 0.4, life: 2.5, ref: 4 });
        const n = 6 + Math.floor(Math.random() * 5);
        for (let i = 0; i < n; i++) {
          const tt = t + i * rnd(0.035, 0.07);
          this.noise(d, tt, 0.03, { type: 'lowpass', f0: rnd(500, 900), gain: rnd(0.25, 0.45), a: 0.001, buf: this.brown, rate: 4 });
          if (Math.random() < 0.25) this.boneCrack(d, tt, 0.5);
        }
        this.chitter(d, t, 0.3, 0.08);
        break;
      }
      case 'boneCrack':
        d = this.out(P, { gain: 0.8, verb: 0.7, life: 3, ref: 4 });
        this.boneCrack(d, t, o.k ?? 1);
        if (o.n) for (let i = 1; i < o.n; i++) this.boneCrack(d, t + i * rnd(0.09, 0.2), rnd(0.5, 0.9));
        break;
      // respiración ronca pegada a la oreja
      case 'breathClose': {
        d = this.out(null, { gain: 0.8, verb: 0.15, life: 3.5, occlude: false });
        this.noise(d, t, 1.2, { f0: 500, f1: 1300, q: 1.2, gain: 0.16, a: 0.5, buf: this.pink, curve: 'lin' });
        this.voice(d, t + 1.25, 1.3, { f0: 72, f1: 60, vowel: 'o', v1: 'u', gain: 0.1, vibD: 0, breath: 1.4, a: 0.1, rasp: 0.9, jit: 40 });
        break;
      }
      case 'stairCreak':
        d = this.out(P, { gain: 0.7, verb: 0.6, life: 3, ref: 3 });
        this.creak(d, t, rnd(0.5, 0.9), rnd(55, 80), 0.18);
        break;
      // la llama del farol que se ahoga
      case 'lampOut': {
        d = this.out(P, { gain: 0.6, verb: 0.2, life: 2, ref: 2 });
        this.noise(d, t, 0.35, { type: 'lowpass', f0: 700, f1: 200, gain: 0.3, a: 0.01, buf: this.brown, rate: 2 });
        this.smp(d, t, this.lib.crackle(6), { gain: 0.25, offset: rnd(0, 4), dur: 0.5, hp: 800 });
        break;
      }
      // «Deo ignoto…», susurrado muy cerca
      case 'whisperClose': {
        d = this.out(null, { gain: 0.8, verb: 0.3, life: 4, occlude: false });
        this.whisper(d, t, 1.4, 0.13);
        this.mutter(d, t + 0.2, 1.3, 96);
        break;
      }
      // el grito del susto
      case 'scare': {
        d = this.out(null, { gain: 1, verb: 0.35, life: 3, occlude: false });
        this.voice(d, t, 0.8, { f0: 820, f1: 1500, vowel: 'i', v1: 'e', gain: 0.22, vib: 28, vibD: 120, breath: 0.5, type: 'square', rasp: 0.7, jit: 60 });
        this.voice(d, t, 0.8, { f0: 190, f1: 120, vowel: 'a', gain: 0.18, vib: 9, vibD: 40, breath: 0.6, rasp: 0.8, dist: 1 });
        for (let i = 0; i < 4; i++) this.boneCrack(d, t + i * 0.06, 1.2);
        this.score.stinger('scare');
        this.duck(0.8, 1.2);
        break;
      }
      // ---- la bodega del canónigo
      // algo que mastica: desgarro húmedo, sorber y un hueso que cede
      case 'chew': {
        d = this.out(P, { gain: 0.95, verb: 0.6, life: 2.5, ref: 6, roll: 0.9 });
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const tt = t + i * rnd(0.1, 0.2);
          this.noise(d, tt, rnd(0.08, 0.18), { f0: rnd(350, 700), f1: rnd(200, 400), q: 2.5, gain: rnd(0.25, 0.4), a: 0.005, buf: this.brown, rate: 3 });
          this.noise(d, tt + 0.02, rnd(0.05, 0.1), { f0: rnd(1500, 2600), q: 5, gain: rnd(0.05, 0.1), a: 0.003, buf: this.pink });
        }
        if (Math.random() < 0.35) this.boneCrack(d, t + rnd(0.1, 0.3), 0.55);
        if (Math.random() < 0.3) this.noise(d, t + 0.25, 0.35, { f0: 900, f1: 1800, q: 3, gain: 0.08, a: 0.05, buf: this.pink }); // sorbe
        if (Math.random() < 0.25) this.voice(d, t + 0.1, 0.4, { f0: 90, f1: 80, vowel: 'u', gain: 0.05, vibD: 0, breath: 1.2, rasp: 0.8, jit: 30 });
        break;
      }
      // el silencio de golpe: la música se apaga un instante
      case 'silence':
        this.duck(0.9, 1.6);
        break;
      case 'drip':
        d = this.out(P, { gain: 0.7, verb: 1, life: 3, ref: 3 });
        this.smp(d, t, this.lib.drip(rnd(900, 1500)), { gain: 0.35 });
        break;
      // el cuello que gira: vértebras una a una
      case 'neckTwist': {
        d = this.out(P, { gain: 0.8, verb: 0.5, life: 3, ref: 4 });
        for (let i = 0; i < 7; i++) this.boneCrack(d, t + i * rnd(0.12, 0.2), rnd(0.35, 0.6));
        this.noise(d, t, 1.3, { f0: 300, f1: 180, q: 2, gain: 0.08, a: 0.3, buf: this.brown, rate: 2, curve: 'lin' });
        break;
      }
      // el grito del canónigo: su voz de hombre rota en un chillido
      case 'descScream': {
        d = this.out(P, { gain: 1, verb: 0.7, life: 5, ref: 9, roll: 0.7 });
        this.voice(d, t, 2.1, { f0: 150, f1: 95, vowel: 'a', v1: 'o', gain: 0.32, vib: 7, vibD: 40, breath: 0.8, a: 0.05, rasp: 0.8, dist: 1, jit: 40 });
        this.voice(d, t + 0.15, 1.9, { f0: 520, f1: 1150, vowel: 'a', v1: 'i', gain: 0.18, vib: 24, vibD: 120, breath: 0.5, type: 'square', rasp: 0.6, jit: 60 });
        this.voice(d, t + 0.3, 1.6, { f0: 1100, f1: 1600, vowel: 'i', gain: 0.07, vib: 30, vibD: 90, breath: 0.4, type: 'triangle', jit: 50 });
        for (let i = 0; i < 8; i++) this.boneCrack(d, t + i * rnd(0.08, 0.2), rnd(0.6, 1.1));
        this.noise(d, t, 2, { type: 'lowpass', f0: 500, gain: 0.25, a: 0.1, buf: this.brown, rate: 2, curve: 'lin' });
        this.debris(d, t + 0.4, 10, 1.4, { f0: 2000, f1: 5000, gain: 0.4 }); // cae polvo de la bóveda
        this.duck(0.6, 1.8);
        break;
      }
      // palanca de pared: el hierro cede, chirría y encaja abajo
      case 'leverPull': {
        d = this.out(P, { gain: 0.85, verb: 0.45, life: 3.5, ref: 4 });
        this.creak(d, t + 0.1, 1.1, rnd(55, 75), 0.26);
        this.noise(d, t, 1.2, { type: 'lowpass', f0: 420, gain: 0.25, a: 0.3, buf: this.brown, rate: 3, curve: 'lin' });
        this.metal(d, t + 1.28, 240, 0.28, 0.9, { ratios: [1, 2.4, 4.1] });
        this.tone(d, t + 1.28, 0.25, { f0: 120, f1: 55, gain: 0.55 });
        this.jingle(d, t + 1.3, 0.5, 0.22, 0.8);
        break;
      }
      // un tirón de la palanca: el hierro cede un palmo, chirriando
      case 'leverCreak': {
        d = this.out(P, { gain: 0.8, verb: 0.45, life: 2.5, ref: 4 });
        this.creak(d, t + 0.35, 0.6, rnd(50, 80), 0.24);
        this.noise(d, t + 0.35, 0.5, { type: 'lowpass', f0: 380, gain: 0.2, a: 0.05, buf: this.brown, rate: 3, curve: 'lin' });
        this.jingle(d, t + 0.8, 0.2, 0.1, 0.8);
        break;
      }
      // abajo del todo: encaja
      case 'leverClunk': {
        d = this.out(P, { gain: 0.9, verb: 0.5, life: 3, ref: 5 });
        this.metal(d, t, 240, 0.3, 1, { ratios: [1, 2.4, 4.1] });
        this.tone(d, t, 0.25, { f0: 120, f1: 55, gain: 0.6 });
        this.jingle(d, t + 0.05, 0.5, 0.22, 0.8);
        break;
      }
      // un saco que revienta: arpillera rasgada y el grano que cae
      case 'sackTear': {
        d = this.out(P, { gain: 0.8, verb: 0.3, life: 2.5 });
        this.noise(d, t, 0.25, { type: 'highpass', f0: 1800, gain: 0.25, a: 0.01, curve: 'lin' });
        this.noise(d, t + 0.1, 1.2, { f0: 3000, f1: 1500, q: 0.8, gain: 0.18, a: 0.05, buf: this.pink, curve: 'lin' });
        this.tone(d, t, 0.2, { f0: 110, f1: 60, gain: 0.35 });
        break;
      }
      // escarba la tierra con las manos: terrones que caen, uñas en la piedra
      case 'dig': {
        d = this.out(P, { gain: 0.85 * (o.k ?? 1), verb: 0.45, life: 2.5, ref: 4 });
        for (let i = 0; i < 5; i++) {
          const tt = t + i * rnd(0.09, 0.16);
          this.noise(d, tt, 0.12, { type: 'lowpass', f0: 900, f1: 250, gain: 0.3, a: 0.003, buf: this.brown, rate: 3 });
          this.noise(d, tt + 0.02, 0.05, { f0: 3200, q: 3, gain: 0.08, a: 0.002 });
        }
        this.debris(d, t + 0.15, 6, 0.5, { f0: 500, f1: 1400, gain: 0.45 });
        break;
      }
      // la cadena corre por encima, dentro de la bóveda
      case 'chainRun': {
        d = this.out(P, { gain: 0.8 * (o.k ?? 1), verb: 0.6, life: 3, ref: 6 });
        this.smp(d, t, this.lib.chain(0.9), { gain: 0.4, rate: rnd(0.8, 1.05) });
        this.noise(d, t, 0.8, { type: 'lowpass', f0: 300, gain: 0.18, a: 0.05, buf: this.brown, rate: 2, curve: 'lin' });
        break;
      }
      // el rastrillo sube un palmo y se queda colgando
      case 'gateStep': {
        d = this.out(P, { gain: 0.9, verb: 0.6, life: 4, ref: 6 });
        this.smp(d, t, this.lib.chain(0.8), { gain: 0.45, rate: 0.75 });
        this.creak(d, t + 0.1, 0.8, 110, 0.2);
        this.metal(d, t + 0.9, 170, 0.25, 1.1, { ratios: [1, 2.3, 3.9, 5.6] });
        this.tone(d, t + 0.9, 0.3, { f0: 70, f1: 38, gain: 0.45 });
        break;
      }
      // enloquece: un alarido largo que se rompe, huesos y golpes contra el suelo
      case 'rageScream': {
        d = this.out(P, { gain: 1, verb: 0.75, life: 6, ref: 10, roll: 0.8 });
        this.voice(d, t, 2.8, { f0: 120, f1: 70, vowel: 'a', v1: 'u', gain: 0.36, vib: 5, vibD: 60, breath: 1, a: 0.08, rasp: 1, dist: 1, jit: 60 });
        this.voice(d, t + 0.1, 2.5, { f0: 610, f1: 1400, vowel: 'a', v1: 'e', gain: 0.2, vib: 28, vibD: 160, breath: 0.6, type: 'square', rasp: 0.7, jit: 80 });
        this.voice(d, t + 0.6, 1.9, { f0: 1300, f1: 900, vowel: 'i', gain: 0.08, vib: 34, vibD: 120, breath: 0.5, type: 'triangle', jit: 70 });
        for (let i = 0; i < 12; i++) this.boneCrack(d, t + i * rnd(0.12, 0.24), rnd(0.7, 1.2));
        for (const k of [0.9, 1.35, 1.8, 2.2]) {
          this.tone(d, t + k, 0.3, { f0: 90, f1: 36, gain: 0.6 });
          this.noise(d, t + k, 0.25, { type: 'lowpass', f0: 800, f1: 150, gain: 0.3, a: 0.002, buf: this.brown, rate: 3 });
        }
        this.debris(d, t + 0.8, 16, 2, { f0: 1500, f1: 5000, gain: 0.5 });
        this.duck(0.7, 2.6);
        break;
      }
      // gruñido corto (amenaza, lee tu golpe)
      case 'snarl': {
        d = this.out(P, { gain: 0.8, verb: 0.35, life: 2.5 });
        this.voice(d, t, 0.6, { f0: 95, f1: 80, vowel: 'o', v1: 'a', gain: 0.22, vibD: 0, breath: 1.2, a: 0.03, rasp: 1, jit: 50 });
        this.chitter(d, t + 0.1, 0.3, 0.12);
        break;
      }
      // salto atrás: silbido y cuatro manos que golpean el suelo
      case 'leapBack': {
        d = this.out(P, { gain: 0.8, verb: 0.3, life: 2 });
        this.noise(d, t, 0.35, { f0: 1500, f1: 400, q: 1.2, gain: 0.3, a: 0.04, buf: this.pink, curve: 'lin' });
        for (let i = 0; i < 4; i++) this.noise(d, t + 0.42 + i * 0.045, 0.06, { type: 'lowpass', f0: 900, f1: 200, gain: 0.35, a: 0.002, buf: this.brown, rate: 3 });
        this.chitter(d, t + 0.45, 0.2, 0.08);
        break;
      }
      // para tu golpe con los antebrazos: hueso contra acero
      case 'boneBlock': {
        d = this.out(P, { gain: 0.95, verb: 0.3, life: 2 });
        this.metal(d, t, rnd(900, 1300), 0.2, 0.25, { ratios: [1, 1.7, 2.9] });
        this.boneCrack(d, t, 1.1);
        this.noise(d, t, 0.08, { type: 'highpass', f0: 2500, gain: 0.3, a: 0.001 });
        break;
      }
      // un miembro que se parte (muerte)
      case 'limbSnap': {
        d = this.out(P, { gain: 0.9, verb: 0.5, life: 2.5 });
        this.boneCrack(d, t, 1.4);
        this.boneCrack(d, t + 0.05, 1);
        this.voice(d, t + 0.02, 0.5, { f0: 300, f1: 180, vowel: 'e', v1: 'o', gain: 0.12, vib: 12, vibD: 40, breath: 0.8, rasp: 0.6, jit: 40 });
        break;
      }
      // el cuerpo se desploma
      case 'bodyFall': {
        d = this.out(P, { gain: 1, verb: 0.5, life: 3, ref: 5 });
        this.tone(d, t, 0.4, { f0: 75, f1: 32, gain: 0.8 });
        this.noise(d, t, 0.35, { type: 'lowpass', f0: 700, f1: 120, gain: 0.45, a: 0.002, buf: this.brown, rate: 3 });
        this.debris(d, t + 0.05, 8, 0.6, { f0: 800, f1: 2500, gain: 0.5 });
        break;
      }
      // estertor: el último aire, entre chasquidos
      case 'deathRattle': {
        d = this.out(P, { gain: 0.85, verb: 0.6, life: 5 });
        this.voice(d, t, 2.6, { f0: 85, f1: 60, vowel: 'a', v1: 'u', gain: 0.18, vibD: 20, vib: 9, breath: 1.4, a: 0.2, rasp: 1, jit: 60 });
        for (let i = 0; i < 6; i++) this.boneCrack(d, t + 0.4 + i * rnd(0.25, 0.5), rnd(0.4, 0.8));
        break;
      }
      // «Perdóneme, señor…»: una mujer, en voz baja, al otro lado de la puerta
      case 'amaWhisper': {
        d = this.out(P, { gain: 0.9, verb: 0.35, life: 4, ref: 5, occlude: false });
        const syl = [
          ['e', 'e'],
          ['o', 'o'],
          ['e', 'e'],
          ['e', 'a'],
          ['o', 'o'],
        ];
        let tt = t;
        syl.forEach(([v0, v1], i) => {
          const l = i === 4 ? 0.5 : rnd(0.13, 0.19);
          this.voice(d, tt, l, { f0: 215 - i * 6, f1: 205 - i * 8, vowel: v0, v1, gain: 0.05, vibD: 0, breath: 1.6, a: 0.02, jit: 20 });
          tt += l + (i === 2 ? 0.28 : 0.03);
        });
        this.whisper(d, t, 1.6, 0.05);
        break;
      }
      // portazo: la hoja contra el marco, el eco en la escalera
      case 'doorSlam': {
        d = this.out(P, { gain: 1, verb: 0.8, life: 4, ref: 8, roll: 0.6, occlude: false });
        this.tone(d, t, 0.5, { f0: 95, f1: 40, gain: 0.95 });
        this.noise(d, t, 0.12, { type: 'lowpass', f0: 2600, f1: 500, gain: 0.8, a: 0.001 });
        this.noise(d, t + 0.01, 0.4, { f0: 500, f1: 180, q: 2, gain: 0.5, buf: this.brown, rate: 3 });
        this.metal(d, t + 0.02, rnd(500, 600), 0.05, 0.5, { ratios: [1, 2.3] }); // los herrajes
        this.debris(d, t + 0.05, 6, 0.6, { f0: 1500, f1: 4000, gain: 0.5 });
        this.duck(0.5, 0.8);
        break;
      }
      case 'corpseThud':
        d = this.out(P, { gain: 1, verb: 0.5, life: 3, ref: 5 });
        this.bodyFall(d, t, 1.1);
        for (let i = 0; i < 3; i++) this.boneCrack(d, t + 0.02 + i * 0.05, 0.8);
        this.noise(d, t + 0.02, 0.3, { f0: 700, f1: 260, q: 3, gain: 0.35, buf: this.brown, rate: 3 });
        break;
      // risita rota, entre dientes (desde la oscuridad)
      case 'giggle': {
        d = this.out(P, { gain: 0.8, verb: 0.7, life: 4, ref: 4 });
        const n = 4 + Math.floor(Math.random() * 4);
        const f = rnd(170, 230);
        for (let i = 0; i < n; i++) this.voice(d, t + i * rnd(0.11, 0.17), 0.1, { f0: f * (1 - i * 0.03), f1: f * 0.85, vowel: 'e', v1: 'i', gain: 0.07, vibD: 0, breath: 1.3, a: 0.01, rasp: 0.5, jit: 40 });
        if (Math.random() < 0.5) this.boneCrack(d, t + n * 0.14, 0.5);
        break;
      }
      // la voz del ama, lejos: «¿Señor?» (él la imita)
      case 'amaCall': {
        d = this.out(P, { gain: 0.85, verb: 1, life: 4, ref: 4, roll: 0.9 });
        this.voice(d, t, 0.22, { f0: 230, f1: 240, vowel: 'e', gain: 0.07, vib: 5, vibD: 10, breath: 0.6, a: 0.03 });
        this.voice(d, t + 0.26, 0.5, { f0: 250, f1: 330, vowel: 'o', gain: 0.07, vib: 5, vibD: 18, breath: 0.6, a: 0.04, jit: 25 });
        break;
      }
      // pasos que no son tuyos: suenan detrás, un poco desacompasados
      case 'mimicSteps': {
        d = this.out(P, { gain: 0.55, verb: 0.35, life: 4, ref: 3 });
        for (let i = 0; i < 4; i++) this.stepSound(d, t + i * rnd(0.42, 0.5), 0.8, i % 2, 'stone');
        break;
      }
      case 'whisperNear': {
        d = this.out(P, { gain: 0.7, verb: 0.5, life: 3.5, ref: 2.5, occlude: false });
        this.whisper(d, t, rnd(0.9, 1.5), 0.09);
        this.mutter(d, t + 0.2, 1.1, 92);
        break;
      }
      case 'pounceWhoosh':
        d = this.out(P, { gain: 0.8, verb: 0.2, life: 2 });
        this.noise(d, t, 0.45, { f0: 300, f1: 1500, q: 1.2, gain: 0.4, a: 0.1, buf: this.pink, curve: 'lin' });
        this.chitter(d, t, 0.25, 0.1);
        break;
      case 'slamSoft':
        d = this.out(P, { gain: 0.9, verb: 0.4, life: 2.5, ref: 4 });
        this.tone(d, t, 0.35, { f0: 80, f1: 34, gain: 0.7 });
        this.noise(d, t, 0.3, { type: 'lowpass', f0: 900, f1: 180, gain: 0.45, a: 0.002, buf: this.brown, rate: 3 });
        this.debris(d, t + 0.03, 5, 0.35, { f0: 600, f1: 1600, gain: 0.7 });
        break;
      // te agarra: manos en los hombros, un chasquido, su aliento
      case 'grab':
        d = this.out(P, { gain: 0.95, verb: 0.3, life: 3, occlude: false });
        this.noise(d, t, 0.2, { f0: 600, f1: 300, q: 1.5, gain: 0.4, buf: this.brown, rate: 3 });
        this.jingle(d, t, 0.3, 0.2);
        this.voice(d, t + 0.1, 0.9, { f0: 80, f1: 70, vowel: 'o', v1: 'u', gain: 0.12, vibD: 0, breath: 1.4, a: 0.05, rasp: 0.9, jit: 40 });
        this.duck(0.4, 1);
        break;
      case 'bite':
        d = this.out(P, { gain: 1, verb: 0.2, life: 2, occlude: false });
        this.noise(d, t, 0.06, { type: 'highpass', f0: 2600, gain: 0.35, a: 0.001 });
        this.noise(d, t + 0.01, 0.25, { f0: 800, f1: 300, q: 3, gain: 0.5, buf: this.brown, rate: 4 });
        this.boneCrack(d, t + 0.03, 0.8);
        this.tone(d, t, 0.2, { f0: 140, f1: 60, gain: 0.5 });
        break;
      // la piedra del pilar cruje antes de ceder
      case 'stoneCreak':
        d = this.out(P, { gain: 0.9, verb: 0.6, life: 3, ref: 5 });
        this.noise(d, t, 0.7, { f0: 220, f1: 120, q: 3, gain: 0.5, a: 0.1, buf: this.brown, rate: 2, curve: 'lin' });
        this.debris(d, t, 12, 0.7, { f0: 1500, f1: 4500, gain: 0.5 });
        break;
      case 'pillarBreak':
      case 'wallBreak': {
        d = this.out(P, { gain: 1, verb: 0.75, life: 5, ref: 9, roll: 0.6 });
        this.tone(d, t, 1.1, { f0: 60, f1: 26, gain: 1 });
        this.noise(d, t, 1.4, { type: 'lowpass', f0: 1600, f1: 140, gain: 0.85, a: 0.002 });
        this.smp(d, t, this.lib.drum('taiko'), { gain: 0.55, rate: 0.5 });
        this.debris(d, t + 0.02, 26, 1.6, { gain: 1.3 });
        this.debris(d, t + 0.4, 12, 1.8, { f0: 400, f1: 1200, gain: 0.9 }); // los sillares caen
        this.duck(0.5, 1);
        break;
      }
      case 'rackBreak':
        d = this.out(P, { gain: 1, verb: 0.5, life: 4, ref: 6 });
        this.tone(d, t, 0.4, { f0: 140, f1: 55, gain: 0.8 });
        this.noise(d, t, 0.1, { type: 'lowpass', f0: 4000, f1: 600, gain: 0.7, a: 0.001 });
        this.creak(d, t + 0.02, 0.3, rnd(100, 150), 0.18);
        this.debris(d, t + 0.03, 14, 0.5, { f0: 1800, f1: 4200, gain: 1.1 });
        for (let i = 0; i < 3; i++) this.tone(d, t + 0.25 + i * rnd(0.12, 0.2), 0.3, { f0: rnd(90, 130), f1: 50, gain: 0.45 }); // los toneles ruedan
        this.noise(d, t + 0.3, 1.2, { f0: 900, f1: 400, q: 1, gain: 0.1, a: 0.1, buf: this.pink }); // el vino se derrama
        this.duck(0.3, 0.5);
        break;
      case 'woodHit':
        d = this.out(P, { gain: 0.85, verb: 0.3, life: 2 });
        this.tone(d, t, 0.2, { f0: rnd(150, 190), f1: 80, gain: 0.6 });
        this.noise(d, t, 0.08, { f0: rnd(1200, 1800), q: 3, gain: 0.4, a: 0.001, buf: this.brown, rate: 4 });
        this.debris(d, t, 4, 0.1, { f0: 2000, f1: 4000 });
        break;
      // chillido desde el techo, un instante antes de caer
      case 'dropCry':
        d = this.out(P, { gain: 0.95, verb: 0.6, life: 3, ref: 6 });
        this.voice(d, t, 0.5, { f0: 700, f1: 1300, vowel: 'i', gain: 0.14, vib: 30, vibD: 100, breath: 0.6, type: 'square', rasp: 0.5, jit: 50 });
        this.chitter(d, t, 0.4, 0.15);
        break;
      case 'boneThrow':
        d = this.out(P, { gain: 0.7, verb: 0.3, life: 2 });
        this.noise(d, t, 0.3, { f0: 700, f1: 1800, q: 2, gain: 0.25, a: 0.05, curve: 'lin' });
        break;
      case 'boneClatter':
        d = this.out(P, { gain: 0.75, verb: 0.5, life: 2 });
        for (let i = 0; i < 4; i++) this.tone(d, t + i * rnd(0.05, 0.12), 0.06, { f0: rnd(600, 1100), f1: 400, gain: 0.18, type: 'triangle' });
        break;
      // pates de hierro, uno tras otro
      case 'climb':
        d = this.out(null, { gain: 0.7, verb: 0.6, life: 3 });
        for (let i = 0; i < 5; i++) {
          this.metal(d, t + i * 0.24, rnd(700, 900), 0.04, 0.25, { ratios: [1, 2.7] });
          this.jingle(d, t + i * 0.24 + 0.05, 0.1, 0.06);
        }
        break;
      // al asomarse a la escalera de la bodega: pavor
      case 'dread':
        this.score.stinger('dread');
        this.silenceUntil = Math.max(this.silenceUntil, this.t() + 12);
        break;
      case 'victory':
        this.score.stinger('victory');
        this.silenceUntil = Math.max(this.silenceUntil, this.t() + 11);
        break;
    }
  }

  ui(kind) {
    if (!this.ok) return;
    const t = this.t() + 0.003;
    const d = this.out(null, { gain: 0.5, verb: 0, life: 2, bus: this.uiBus });
    switch (kind) {
      case 'move':
        this.smp(d, t, this.lib.pluck(mtof(pick([86, 88])), { bright: 0.6, dur: 0.6 }), { gain: 0.08 });
        this.noise(d, t, 0.03, { f0: 3000, q: 2, gain: 0.04, a: 0.001 });
        break;
      case 'confirm':
        [64, 71, 76].forEach((m, i) => this.smp(d, t + i * 0.05, this.lib.pluck(mtof(m), { bright: 0.7, dur: 1.5 }), { gain: 0.14 }));
        break;
      case 'open':
        this.noise(d, t, 0.3, { f0: 500, f1: 2000, q: 0.9, gain: 0.12, a: 0.1, buf: this.pink });
        this.smp(d, t + 0.05, this.lib.pluck(mtof(52), { bright: 0.4, dur: 1.5 }), { gain: 0.12 });
        break;
      case 'close':
        this.noise(d, t, 0.22, { f0: 1800, f1: 500, q: 0.9, gain: 0.1, a: 0.04, buf: this.pink });
        this.tone(d, t + 0.12, 0.08, { f0: 160, f1: 90, gain: 0.12 });
        break;
      case 'lock':
        this.tone(d, t, 0.04, { type: 'square', f0: 1900, f1: 1400, gain: 0.04 });
        this.metal(d, t + 0.01, 2600, 0.03, 0.25);
        break;
      default:
        this.noise(d, t, 0.2, { f0: 1600, f1: 500, q: 1, gain: 0.1, a: 0.04 });
    }
  }

  // ------------------------------------------------------------ criaturas
  enemyVoice(e, kind) {
    if (!this.ok) return;
    const now = this.t();
    if (kind !== 'death' && e._vt && now - e._vt < 0.35) return;
    const v = e.T.voice;
    const big = v === 'boss' || v === 'impaled' || v === 'bell';
    if (this.dist(e.pos) > (big ? 110 : 55)) return;
    e._vt = now;
    const t = now + 0.005;
    const d = this.out(e.pos, { gain: 0.9, verb: 0.45, life: 5, ref: big ? 7 : 3 });
    const V = (o) => this.voice(d, t + (o.dt || 0), o.dur ?? 0.6, o);
    const pv = e._pv || (e._pv = rnd(0.9, 1.12)); // cada criatura con su timbre
    switch (v) {
      case 'penitent':
        if (kind === 'alert') V({ dur: 1.0, f0: 360 * pv, f1: 640 * pv, vowel: 'a', v1: 'i', gain: 0.22, vib: 9, vibD: 45, breath: 0.5, a: 0.04, rasp: 0.35, jit: 30 });
        else if (kind === 'attack') {
          V({ dur: 0.32, f0: 210 * pv, f1: 280 * pv, vowel: 'e', gain: 0.18, vibD: 0, breath: 0.7, a: 0.01, rasp: 0.3 });
          this.noise(d, t + 0.25, 0.03, { type: 'highpass', f0: 2500, gain: 0.3, a: 0.001 }); // restallido del flagelo
        } else if (kind === 'hurt') V({ dur: 0.32, f0: 480 * pv, f1: 290 * pv, vowel: 'a', gain: 0.2, breath: 0.5, a: 0.01, rasp: 0.25, jit: 20 });
        else if (kind === 'death') {
          V({ dur: 1.3, f0: 300 * pv, f1: 85, vowel: 'o', v1: 'u', gain: 0.22, vib: 11, vibD: 40, breath: 0.6, rasp: 0.3 });
          this.bodyFall(d, t + 0.9, 0.7);
        } else if (kind === 'idle') {
          if (Math.random() < 0.5) this.whisper(d, t, 1.4, 0.1);
          else this.mutter(d, t, 1.6, 110 * pv);
        }
        break;
      case 'soldier':
        if (kind === 'alert') {
          V({ dur: 0.95, f0: 92 * pv, f1: 118 * pv, vowel: 'a', v1: 'o', gain: 0.32, vib: 6, vibD: 18, breath: 0.4, rasp: 0.45, dist: 1 });
          this.jingle(d, t, 0.3, 0.15);
        } else if (kind === 'attack') {
          V({ dur: 0.3, f0: 110 * pv, f1: 95, vowel: 'u', v1: 'a', gain: 0.2, vibD: 0, breath: 0.6, a: 0.01, rasp: 0.3 });
          this.jingle(d, t, 0.2, 0.12);
        } else if (kind === 'hurt') {
          V({ dur: 0.3, f0: 125 * pv, f1: 90, vowel: 'u', gain: 0.24, breath: 0.4, rasp: 0.3 });
          this.metal(d, t, rnd(600, 750), 0.07, 0.5);
        } else if (kind === 'death') {
          V({ dur: 1.1, f0: 105 * pv, f1: 48, vowel: 'o', v1: 'u', gain: 0.25, breath: 0.5, rasp: 0.4 });
          this.bodyFall(d, t + 0.8, 1, true);
        } else if (kind === 'idle') this.mutter(d, t, 1.2, 90 * pv);
        break;
      case 'crawler':
        if (kind === 'alert' || kind === 'attack') {
          V({ dur: kind === 'alert' ? 0.7 : 0.32, f0: rnd(900, 1100), f1: 1600, vowel: 'i', gain: 0.16, vib: 30, vibD: 100, breath: 0.6, type: 'square', rasp: 0.4 });
          this.chitter(d, t, 0.4, 0.2);
        } else if (kind === 'hurt') V({ dur: 0.25, f0: 1200, f1: 800, vowel: 'e', gain: 0.16, type: 'square', breath: 0.4 });
        else if (kind === 'death') {
          V({ dur: 0.8, f0: 900, f1: 180, vowel: 'e', v1: 'u', gain: 0.16, vib: 20, vibD: 80, type: 'square', breath: 0.5 });
          this.noise(d, t + 0.1, 0.4, { f0: 600, f1: 250, q: 3, gain: 0.3, buf: this.brown, rate: 3 });
        } else if (kind === 'idle') this.chitter(d, t, 0.6, 0.25);
        break;
      case 'hound':
        if (kind === 'alert') {
          V({ dur: 0.9, f0: 95, f1: 120, vowel: 'o', gain: 0.22, vib: 26, vibD: 40, breath: 0.6, rasp: 0.9, dist: 1 }); // gruñido
          V({ dt: 0.95, dur: 0.18, f0: 380, f1: 260, vowel: 'a', gain: 0.3, vibD: 0, breath: 0.4, a: 0.005, rasp: 0.5, dist: 1 }); // ladrido
        } else if (kind === 'attack') {
          V({ dur: 0.2, f0: 320, f1: 210, vowel: 'a', gain: 0.3, breath: 0.5, a: 0.005, rasp: 0.6, dist: 1 });
          this.noise(d, t + 0.16, 0.04, { f0: 2500, q: 2, gain: 0.35, a: 0.001 }); // dentellada
          this.tone(d, t + 0.16, 0.05, { f0: 300, f1: 150, gain: 0.2 });
        } else if (kind === 'hurt') V({ dur: 0.25, f0: 720, f1: 520, vowel: 'i', gain: 0.2, breath: 0.3, a: 0.005 });
        else if (kind === 'death') V({ dur: 1.0, f0: 620, f1: 240, vowel: 'i', v1: 'u', gain: 0.18, vib: 8, vibD: 30, breath: 0.4 });
        else if (kind === 'idle') {
          // jadeo
          this.noise(d, t, 0.5, { f0: 500, q: 1.5, gain: 0.05, buf: this.brown, rate: 5, a: 0.1 });
          this.noise(d, t + 0.6, 0.45, { f0: 700, q: 1.5, gain: 0.05, buf: this.brown, rate: 5, a: 0.1 });
        }
        break;
      case 'bell':
        if (kind === 'alert') {
          // (suena cuando el puño da en la campana)
          this.smp(d, t + 0.36, this.churchBell(), { gain: 0.45, rate: mtof(48) / mtof(45) });
          V({ dt: 0.15, dur: 1.3, f0: 68, f1: 58, vowel: 'o', gain: 0.3, vib: 5, vibD: 20, breath: 0.5, rasp: 0.5, dist: 1 });
        } else if (kind === 'attack') V({ dur: 0.8, f0: 64, vowel: 'u', v1: 'a', gain: 0.25, breath: 0.7, rasp: 0.6 });
        else if (kind === 'hurt') this.smp(d, t, this.churchBell(), { gain: 0.2, rate: (mtof(48) / mtof(45)) * rnd(0.97, 1.03) });
        else if (kind === 'death') {
          this.smp(d, t, this.churchBell(), { gain: 0.55 });
          V({ dur: 2.1, f0: 70, f1: 34, vowel: 'o', v1: 'u', gain: 0.3, breath: 0.6, rasp: 0.5 });
          this.bodyFall(d, t + 1.3, 1.6, true);
        }
        break;
      case 'mourner':
        if (kind === 'alert') V({ dur: 1.8, f0: 520, f1: 690, vowel: 'i', v1: 'a', gain: 0.17, vib: 5, vibD: 40, breath: 0.4, type: 'triangle', a: 0.2, jit: 20 });
        else if (kind === 'attack') V({ dur: 1.0, f0: 610, f1: 440, vowel: 'e', gain: 0.16, vib: 6, vibD: 50, breath: 0.4, type: 'triangle' });
        else if (kind === 'hurt') V({ dur: 0.4, f0: 700, f1: 500, vowel: 'a', gain: 0.16, type: 'triangle', breath: 0.3 });
        else if (kind === 'death') V({ dur: 2.3, f0: 650, f1: 190, vowel: 'i', v1: 'o', gain: 0.18, vib: 4, vibD: 60, breath: 0.4, type: 'triangle' });
        else if (kind === 'idle') for (let i = 0; i < 3; i++) V({ dt: i * 0.45, dur: 0.38, f0: 480 - i * 25, f1: 420 - i * 25, vowel: 'a', gain: 0.08, type: 'triangle', breath: 0.5, jit: 30 }); // sollozos
        break;
      case 'descoyuntado':
        if (kind === 'alert') {
          V({ dur: 1.4, f0: 118 * pv, f1: 64, vowel: 'o', v1: 'u', gain: 0.24, vib: 5, vibD: 30, breath: 0.7, rasp: 0.7, jit: 30 });
          V({ dt: 1.1, dur: 0.9, f0: 420, f1: 960, vowel: 'a', v1: 'i', gain: 0.16, vib: 22, vibD: 110, breath: 0.5, type: 'square', rasp: 0.5, jit: 40 });
          for (let i = 0; i < 6; i++) this.boneCrack(d, t + 0.2 + i * rnd(0.12, 0.2), rnd(0.7, 1.1));
        } else if (kind === 'attack') {
          V({ dur: 0.45, f0: 150 * pv, f1: 105, vowel: 'a', v1: 'e', gain: 0.2, vibD: 0, breath: 0.8, a: 0.01, rasp: 0.6, jit: 30 });
          this.boneCrack(d, t + 0.05, 0.9);
        } else if (kind === 'hurt') {
          this.boneCrack(d, t, 1.1);
          V({ dt: 0.03, dur: 0.35, f0: 210 * pv, f1: 140, vowel: 'e', gain: 0.18, breath: 0.6, a: 0.01, rasp: 0.4 });
        } else if (kind === 'death') {
          V({ dur: 3.4, f0: 130 * pv, f1: 38, vowel: 'a', v1: 'u', gain: 0.26, vib: 5, vibD: 40, breath: 0.7, a: 0.1, rasp: 0.6, jit: 25 });
          for (let i = 0; i < 12; i++) this.boneCrack(d, t + 0.3 + i * rnd(0.12, 0.26), rnd(0.6, 1.1));
          this.bodyFall(d, t + 1.6, 1.4);
          this.whisper(d, t + 3.2, 1.6, 0.09);
          this.duck(0.35, 3);
        } else if (kind === 'idle') {
          this.mutter(d, t, 1.8, 98 * pv);
          if (Math.random() < 0.6) this.boneCrack(d, t + rnd(0.3, 1.5), 0.7);
        }
        break;
      case 'impaled':
      case 'boss': {
        const lo = v === 'boss' ? 0.8 : 1;
        if (kind === 'alert') this.play('roar', e.pos);
        else if (kind === 'attack') V({ dur: 0.75, f0: 62 * lo, f1: 52 * lo, vowel: 'o', v1: 'a', gain: 0.35, vib: 6, vibD: 25, breath: 0.8, rasp: 0.7, dist: 1 });
        else if (kind === 'hurt') V({ dur: 0.45, f0: 82 * lo, f1: 60 * lo, vowel: 'u', gain: 0.24, breath: 0.6, rasp: 0.5 });
        else if (kind === 'death') {
          V({ dur: 3.6, f0: 90 * lo, f1: 28, vowel: 'o', v1: 'u', gain: 0.45, vib: 4, vibD: 30, breath: 0.7, a: 0.2, rasp: 0.6, dist: 1 });
          this.smp(d, t + 0.5, this.churchBell(), { gain: 0.4, rate: mtof(38) / mtof(45) });
          this.bodyFall(d, t + 2.4, 2.2, v === 'impaled');
          this.duck(0.4, 3);
        }
        break;
      }
    }
  }

  enemyStep(e) {
    if (!this.ok) return;
    const v = e.T.voice;
    const big = v === 'bell' || v === 'boss' || v === 'impaled';
    if (this.dist(e.pos) > (big ? 45 : 22)) return;
    const t = this.t() + 0.005;
    const d = this.out(e.pos, { gain: big ? 0.9 : 0.6, verb: 0.25, life: 2.5, ref: big ? 5 : 2.5 });
    if (v === 'bell') {
      this.smp(d, t, this.smallBell(), { gain: 0.06, rate: rnd(0.45, 0.5) });
      this.tone(d, t, 0.25, { f0: 62, f1: 34, gain: 0.35 });
    } else if (big) {
      this.tone(d, t, 0.4, { f0: 55, f1: 28, gain: 0.45 });
      this.noise(d, t, 0.3, { type: 'lowpass', f0: 500, gain: 0.3, a: 0.003 });
      this.debris(d, t + 0.03, 3, 0.25, { f0: 600, f1: 1500, gain: 0.7 });
      if (v === 'impaled') this.jingle(d, t, 0.3, 0.15, 0.6);
    } else if (v === 'soldier') {
      this.tone(d, t, 0.12, { f0: 90, f1: 48, gain: 0.45 });
      this.noise(d, t, 0.06, { f0: rnd(1500, 2200), q: 1.4, gain: 0.2, a: 0.002 });
      this.jingle(d, t, 0.12, 0.1);
    } else if (v === 'hound') this.noise(d, t, 0.05, { type: 'lowpass', f0: 700, gain: 0.25, a: 0.004, buf: this.brown, rate: 4 });
    else if (v === 'crawler') this.chitter(d, t, 0.1, 0.12);
    else if (v === 'descoyuntado') {
      // palmada de una mano en la piedra y, a veces, un hueso
      this.noise(d, t, 0.045, { type: 'lowpass', f0: 650, gain: 0.35, a: 0.002, buf: this.brown, rate: 4 });
      if (Math.random() < 0.3) this.boneCrack(d, t + 0.02, 0.5);
    }
    else if (v === 'mourner') this.noise(d, t, 0.3, { f0: 600, f1: 300, q: 0.8, gain: 0.05, a: 0.1, buf: this.pink });
    else {
      // pie descalzo que a veces se arrastra
      this.noise(d, t, 0.06, { f0: rnd(700, 1000), q: 1.2, gain: 0.25, a: 0.002 });
      this.tone(d, t, 0.08, { f0: 75, f1: 45, gain: 0.3 });
      if (Math.random() < 0.3) this.noise(d, t + 0.05, 0.25, { f0: 1200, f1: 700, q: 0.8, gain: 0.05, a: 0.05 });
    }
  }

  // ------------------------------------------------------------ ambiente continuo
  _loop(buf, rate = 1, off = 0) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.playbackRate.value = rate;
    s.start(0, off % buf.duration);
    return s;
  }
  _filt(type, f, q = 0.7) {
    const b = this.ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    return b;
  }
  _gain(v = 0) {
    const g = this.ctx.createGain();
    g.gain.value = v;
    return g;
  }
  _osc(f, type = 'sine') {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.start();
    return o;
  }
  // Capa perezosa: sus nodos solo existen mientras suena (ahorra CPU).
  layer(make) {
    return { make, on: null, offAt: 0 };
  }
  // Fija el volumen de una capa; la crea al subir y la destruye tras un rato
  // en silencio. Devuelve la capa viva (o null).
  layerGain(L, v, tc = 0.3) {
    const t = this.t();
    if (v > 0.0005) {
      if (!L.on) L.on = L.make();
      L.offAt = 0;
      this.setP(L.on.g.gain, v, tc);
      return L.on;
    }
    if (L.on) {
      this.setP(L.on.g.gain, 0, tc);
      if (!L.offAt) L.offAt = t + Math.min(6, tc * 5) + 2;
      else if (t > L.offAt) {
        for (const n of L.on.src) {
          try {
            n.stop();
          } catch (e) {}
        }
        try {
          L.on.out.disconnect();
        } catch (e) {}
        L.on = null;
        L.offAt = 0;
      }
    }
    return null;
  }

  startAmbience() {
    const A = this;
    this.L = {
      // viento: dos capas estéreo que siguen las rachas
      wind: this.layer(() => {
        const g = A._gain(0);
        const lp = A._filt('lowpass', 9000, 0.5);
        g.connect(lp).connect(A.amb);
        const src = [],
          bp = [];
        for (const [pan, off] of [
          [-0.7, 0],
          [0.7, 1.3],
        ]) {
          const f = A._filt('bandpass', 420, 0.8);
          const p = A.ctx.createStereoPanner();
          p.pan.value = pan;
          const s = A._loop(A.pink, 1, off);
          s.connect(f).connect(p).connect(g);
          src.push(s);
          bp.push(f);
        }
        return { g, out: lp, src, bp, lp };
      }),
      // silbido del viento en almenas y túneles
      whistle: this.layer(() => {
        const g = A._gain(0);
        const bp = A._filt('bandpass', 900, 14);
        const s = A._loop(A.white, 1, 0.5);
        s.connect(bp).connect(g).connect(A.amb);
        return { g, out: g, src: [s], bp };
      }),
      // rumor lejano de la ciudad en llamas
      roar: this.layer(() => {
        const g = A._gain(0);
        const s = A._loop(A.brown, 0.7);
        s.connect(A._filt('lowpass', 240, 0.6)).connect(g).connect(A.amb);
        return { g, out: g, src: [s] };
      }),
      // tono de sala
      room: this.layer(() => {
        const g = A._gain(0);
        const s = A._loop(A.brown, 0.5, 2);
        s.connect(A._filt('lowpass', 130, 0.7)).connect(g).connect(A.amb);
        return { g, out: g, src: [s] };
      }),
      // dron subterráneo
      drone: this.layer(() => {
        const g = A._gain(0);
        const lp = A._filt('lowpass', 120, 1.2);
        const src = [];
        for (const f of [41.2, 41.6, 61.7]) {
          const o = A._osc(f, 'triangle');
          o.connect(A._gain(0.3)).connect(lp);
          src.push(o);
        }
        const s = A._loop(A.brown, 0.4, 1);
        s.connect(A._filt('bandpass', 70, 1.5)).connect(lp);
        src.push(s);
        lp.connect(g).connect(A.amb);
        return { g, out: g, src };
      }),
      // río: corriente + borboteo agudo
      river: this.layer(() => {
        const g = A._gain(0);
        const a = A._loop(A.pink, 1, 0.7);
        a.connect(A._filt('bandpass', 700, 0.45)).connect(g);
        const sp = A._gain(0.25);
        const b = A._loop(A.white, 1, 1.1);
        b.connect(A._filt('highpass', 2800, 0.7)).connect(sp).connect(g);
        const am = A._osc(7.3);
        am.connect(A._gain(0.18)).connect(sp.gain);
        g.connect(A.amb);
        return { g, out: g, src: [a, b, am] };
      }),
      // moscas sobre los cadáveres
      flies: this.layer(() => {
        const g = A._gain(0);
        const bf = A._filt('bandpass', 1100, 1.4);
        const lfo = A._osc(6.1);
        const lg = A._gain(22);
        lfo.connect(lg);
        const src = [lfo];
        for (const f of [187, 211, 243]) {
          const o = A._osc(f, 'sawtooth');
          lg.connect(o.frequency);
          o.connect(A._gain(0.3)).connect(bf);
          src.push(o);
        }
        const wob = A._gain(0.65);
        const lfo2 = A._osc(0.37);
        lfo2.connect(A._gain(0.35)).connect(wob.gain);
        src.push(lfo2);
        const p = A.panner(0.8, 1.6);
        bf.connect(wob).connect(g).connect(p).connect(A.amb);
        return { g, out: p, src, p };
      }),
      // zumbido de los altares: un acorde cálido que respira
      altar: this.layer(() => {
        const g = A._gain(0);
        const lp = A._filt('lowpass', 1800, 0.5);
        const src = [];
        for (const [m, v] of [
          [50, 0.3],
          [57, 0.22],
          [62, 0.18],
          [66, 0.12],
          [74, 0.06],
        ]) {
          const o = A._osc(mtof(m));
          o.detune.value = rnd(-4, 4);
          const og = A._gain(v);
          const l = A._osc(rnd(0.07, 0.2));
          l.connect(A._gain(v * 0.6)).connect(og.gain);
          o.connect(og).connect(lp);
          src.push(o, l);
        }
        const p = A.panner(1.5, 1.4);
        lp.connect(g).connect(p).connect(A.amb);
        return { g, out: p, src, p };
      }),
      // estática del miedo
      fear: this.layer(() => {
        const g = A._gain(0);
        const s = A._loop(A.lib.static(4));
        s.connect(A._filt('bandpass', 1800, 0.9)).connect(g).connect(A.sfx);
        return { g, out: g, src: [s] };
      }),
    };
    // fuegos cercanos: crepitar + rugido de la llama, posicionales
    this.fireSlots = [0, 1, 2].map((i) => ({
      fire: null,
      L: this.layer(() => {
        const g = A._gain(0);
        const c = A._loop(A.lib.crackle(6), 0.9 + i * 0.12, i * 1.7);
        c.connect(A._filt('highpass', 200)).connect(g);
        const r = A._loop(A.brown, 1.2, i);
        r.connect(A._filt('lowpass', 380, 0.8)).connect(A._gain(0.5)).connect(g);
        const p = A.panner(2, 1.3);
        g.connect(p).connect(A.amb);
        return { g, out: p, src: [c, r], p };
      }),
    }));
  }

  // Sucesos ambientales de cada zona; devuelve la espera hasta el siguiente.
  ambEvent(z, cp, t) {
    const far = (r0 = 25, r1 = 45, h = 5) => {
      const a = Math.random() * Math.PI * 2,
        r = rnd(r0, r1);
      return { x: cp.x + Math.cos(a) * r, y: cp.y + h, z: cp.z + Math.sin(a) * r };
    };
    const near = (r = 8, h = 2) => ({ x: cp.x + rnd(-r, r), y: cp.y + h, z: cp.z + rnd(-r, r) });
    const O = (pos, gain, extra = {}) => this.out(pos, { gain, verb: 0.9, life: 8, ref: 18, roll: 0.35, occlude: false, ...extra });
    const r = Math.random();
    if (z === 'city' || z === 'ramparts') {
      if (r < 0.13) {
        const d = O(far(40, 70, 15), 0.8, { life: 18 });
        this.smp(d, t, this.churchBell(), { gain: 0.3, rate: mtof(pick([40, 43, 45])) / mtof(45), lp: 1800 });
      } else if (r < 0.26) {
        const d = O(far(), 0.6); // grito lejano
        this.voice(d, t, rnd(1.2, 2), { f0: rnd(480, 700), f1: rnd(280, 380), vowel: 'a', v1: pick(['o', 'i']), gain: 0.12, vib: 7, vibD: 60, breath: 0.5, jit: 30 });
      } else if (r < 0.36) {
        const d = O(far(), 0.55); // perro que aúlla
        this.voice(d, t, 2.6, { f0: 280, f1: 430, vowel: 'u', v1: 'o', gain: 0.11, vib: 4, vibD: 30, breath: 0.3, type: 'triangle' });
        this.voice(d, t + 2.4, 1.4, { f0: 430, f1: 300, vowel: 'o', gain: 0.08, vib: 4, vibD: 30, breath: 0.3, type: 'triangle' });
      } else if (r < 0.48) this.play('crow', far(15, 30, 6));
      else if (r < 0.57) {
        const d = O(far(20, 40, 3), 0.8); // se desploma una viga
        this.tone(d, t, 0.8, { f0: 60, f1: 30, gain: 0.6 });
        this.noise(d, t, 1.2, { type: 'lowpass', f0: 900, f1: 150, gain: 0.5, a: 0.01, buf: this.brown, rate: 2 });
        this.debris(d, t + 0.1, 12, 1.5, { f0: 500, f1: 1600 });
      } else if (r < 0.66) {
        const d = O(far(15, 30, 4), 0.6, { roll: 0.6 });
        this.creak(d, t, rnd(1, 2), rnd(55, 90), 0.2);
      } else if (r < 0.75) this.procession(O(far(30, 50, 3), 0.5), t);
      else if (r < 0.84 && z === 'ramparts') this.warHorn(O(far(60, 90, 5), 0.8), t);
      else if (r < 0.92) {
        const d = O(far(20, 40, 3), 0.5);
        this.smp(d, t, this.lib.chain(1.2), { gain: 0.3, rate: rnd(0.6, 0.9) });
      } else {
        const d = O(far(25, 45, 2), 0.5); // espadas a lo lejos
        for (let i = 0; i < 3; i++) this.metal(d, t + i * rnd(0.25, 0.5), rnd(450, 600), 0.06, 0.6);
      }
      return rnd(7, 18);
    }
    if (z === 'interior' || z === 'prison' || z === 'chapel') {
      const I = (pos, g, life = 4) => O(pos, g, { ref: 3, roll: 1, verb: 0.5, life });
      if (r < 0.3) this.creak(I(near(6, 2.5), 0.5), t, rnd(0.5, 1.4), rnd(60, 120), 0.15);
      else if (r < 0.46 && z !== 'chapel') {
        const d = I(near(5, 0), 0.4, 2); // ratas
        const n = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) this.tone(d, t + i * rnd(0.08, 0.2), 0.07, { f0: rnd(3200, 4600), f1: rnd(2600, 5200), gain: 0.05, type: 'triangle' });
        this.noise(d, t, 0.6, { f0: 3000, q: 1, gain: 0.02, a: 0.1 });
      } else if (r < 0.62) this.smp(I(near(6, 2), 0.5, 3), t, this.lib.drip(rnd(900, 1800)), { gain: 0.25 });
      else if (r < 0.76 && z === 'prison') this.smp(I(near(10, 1), 0.5), t, this.lib.chain(1.2), { gain: 0.35, rate: rnd(0.7, 1) });
      else if (r < 0.88) {
        const d = I(near(5, 3), 0.35, 3); // cae polvo
        this.noise(d, t, rnd(0.6, 1.4), { type: 'highpass', f0: 2500, gain: 0.03, a: 0.2, buf: this.pink });
        this.debris(d, t, 6, 0.8, { f0: 3000, f1: 6000, gain: 0.3 });
      } else if (z === 'chapel') {
        const d = I(near(8, 4), 0.3, 3); // paloma en el tejado
        this.voice(d, t, 0.5, { f0: 330, f1: 290, vowel: 'u', gain: 0.05, vibD: 0, breath: 0.3, type: 'sine' });
        this.voice(d, t + 0.6, 0.7, { f0: 320, f1: 270, vowel: 'u', gain: 0.05, vibD: 0, breath: 0.3, type: 'sine' });
      } else if (z === 'prison') {
        const d = O(far(10, 20, 1), 0.5, { ref: 3, roll: 1 }); // lamento en otra celda
        this.voice(d, t, 1.8, { f0: 150, f1: 120, vowel: 'o', v1: 'u', gain: 0.07, vib: 5, vibD: 20, breath: 0.6, jit: 20 });
      }
      return rnd(6, 14);
    }
    if (z === 'cathedral') {
      if (r < 0.22) {
        const d = O(far(10, 25, 0), 0.4, { ref: 4 }); // pasos que no son tuyos
        for (let i = 0; i < 6; i++) this.stepSound(d, t + i * 0.55, 0.8, i % 2, 'stone');
      } else if (r < 0.42) this.whisper(O(near(10, 3), 0.5, { ref: 3, roll: 1 }), t, rnd(1, 2), 0.07);
      else if (r < 0.58) {
        const d = O(far(8, 20, 12), 0.5, { ref: 4 }); // aleteo en la bóveda
        for (let i = 0; i < 8; i++) this.noise(d, t + i * 0.09, 0.07, { type: 'lowpass', f0: 1000, gain: 0.15, a: 0.01, buf: this.pink });
      } else if (r < 0.74) {
        const d = O(far(10, 25, 0), 0.6, { ref: 4 }); // piedra que se arrastra
        this.noise(d, t, rnd(1.5, 2.5), { f0: 300, f1: 180, q: 2, gain: 0.25, a: 0.3, buf: this.brown, rate: 3, curve: 'lin' });
      } else if (r < 0.9) {
        const d = O(far(10, 20, 8), 0.4, { ref: 5 }); // una nota de órgano, sola
        this.tone(d, t, 3.5, { type: 'triangle', f0: mtof(pick([38, 43, 45])), gain: 0.08, a: 0.6, curve: 'lin' });
        this.tone(d, t, 3.5, { type: 'sine', f0: mtof(pick([50, 55, 57])), gain: 0.04, a: 0.8, curve: 'lin' });
      } else {
        const d = O(far(30, 50, 20), 0.7, { life: 18 });
        this.smp(d, t, this.churchBell(), { gain: 0.25, rate: mtof(38) / mtof(45), lp: 1500 });
      }
      return rnd(6, 14);
    }
    if (z === 'crypt' || z === 'tunnel' || z === 'arena') {
      if (r < 0.4) {
        const d = O(near(9, 3), 0.55, { ref: 3, roll: 1, verb: 1, life: 4 });
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) this.smp(d, t + i * rnd(0.3, 0.9), this.lib.drip(rnd(800, 1900)), { gain: 0.3 });
      } else if (r < 0.55) {
        const d = O(near(10, 1), 0.5, { ref: 3, roll: 1 }); // huesos que ruedan
        for (let i = 0; i < 5; i++) this.tone(d, t + i * rnd(0.05, 0.14), 0.05, { f0: rnd(600, 1100), f1: 400, gain: 0.1, type: 'triangle' });
      } else if (r < 0.7) this.whisper(O(near(12, 2), 0.5, { ref: 3, roll: 1 }), t, rnd(1.2, 2.4), 0.08);
      else if (r < 0.85) {
        const d = O(far(12, 25, 0), 0.6, { ref: 4 });
        this.noise(d, t, rnd(1.2, 2.2), { f0: 260, f1: 160, q: 2, gain: 0.25, a: 0.2, buf: this.brown, rate: 3, curve: 'lin' });
      } else {
        const d = O(far(15, 30, 0), 0.7, { ref: 5 }); // golpe sordo en la roca
        this.tone(d, t, 0.6, { f0: 55, f1: 30, gain: 0.5 });
        this.debris(d, t + 0.1, 5, 0.8, { f0: 400, f1: 1200 });
      }
      return rnd(3, 8);
    }
    if (z === 'cellar') {
      const d = O(near(8, 1.5), 0.6, { ref: 3, roll: 1, verb: 0.9, life: 4 });
      if (r < 0.3) this.smp(d, t, this.lib.drip(rnd(700, 1500)), { gain: 0.3 });
      else if (r < 0.5) this.boneCrack(d, t, 0.6);
      else if (r < 0.65) this.mutter(d, t, rnd(1.2, 2), 96);
      else if (r < 0.8) this.noise(d, t, rnd(1, 1.8), { f0: 320, f1: 190, q: 2, gain: 0.18, a: 0.2, buf: this.brown, rate: 3, curve: 'lin' });
      else this.creak(d, t, rnd(0.6, 1.2), rnd(50, 80), 0.12);
      return rnd(3, 7);
    }
    if (z === 'dawn') {
      this.birdsong(O(far(8, 25, rnd(3, 8)), 0.4, { verb: 0.3, ref: 6, life: 3 }), t);
      return rnd(1.2, 4);
    }
    return rnd(8, 16);
  }
  procession(d, t) {
    const root = pick([48, 50, 52]);
    let tt = t;
    for (const s of [0, 2, 3, 2, 0, -2, 0]) {
      const l = rnd(0.5, 0.9);
      for (const k of [0, -12]) this.voice(d, tt, l * 1.05, { f0: mtof(root + s + k), vowel: pick(['a', 'o']), gain: 0.05, vib: 4.5, vibD: 8, breath: 0.2, a: 0.08 });
      tt += l;
    }
  }
  warHorn(d, t) {
    const f = mtof(pick([43, 45]));
    this.voice(d, t, 1.8, { f0: f * 0.97, f1: f, vowel: 'o', gain: 0.12, vib: 4, vibD: 8, breath: 0.3, a: 0.2 });
    this.voice(d, t + 1.9, 2.6, { f0: f * 1.5, f1: f * 1.48, vowel: 'o', gain: 0.1, vib: 4, vibD: 8, breath: 0.3, a: 0.2 });
  }
  birdsong(d, t) {
    const kind = Math.floor(Math.random() * 3);
    const base = rnd(2600, 4200);
    const n = 3 + Math.floor(Math.random() * 6);
    let tt = t;
    for (let i = 0; i < n; i++) {
      const l = kind === 0 ? rnd(0.05, 0.09) : kind === 1 ? rnd(0.12, 0.2) : 0.04;
      const f0 = base * (kind === 1 ? rnd(0.9, 1.2) : rnd(0.95, 1.05));
      const f1 = kind === 2 ? f0 * 1.5 : f0 * rnd(0.7, 1.4);
      this.tone(d, tt, l, { f0, f1, gain: 0.05, a: 0.005 });
      tt += l + (kind === 2 ? 0.02 : rnd(0.03, 0.12));
    }
  }

  // ------------------------------------------------------------ música
  music(name) {
    if (!this.ok) return;
    this.override = name;
    this.score.setTheme(name, name.startsWith('boss') ? 0.8 : 2.5);
  }
  stopMusic() {
    if (!this.ok) return;
    this.override = null;
    this.silenceUntil = Math.max(this.silenceUntil, this.t() + 4);
    this.score.setTheme(null, 1.6);
  }

  // ------------------------------------------------------------ cada fotograma
  update(dt, game) {
    if (!this.ok) return;
    this.game = game;
    const t = this.t();
    // oyente = cámara (solo se reprograma si se ha movido o girado)
    const cam = game.camera;
    const L = this.ctx.listener;
    const f = (this._fwd = this._fwd || new game.THREE.Vector3()).set(0, 0, -1).applyQuaternion(cam.quaternion);
    const cp0 = cam.position;
    const lk = this._lk || (this._lk = [1e9, 0, 0, 0, 0, 0]);
    if (Math.abs(lk[0] - cp0.x) + Math.abs(lk[1] - cp0.y) + Math.abs(lk[2] - cp0.z) > 0.01 || Math.abs(lk[3] - f.x) + Math.abs(lk[4] - f.y) + Math.abs(lk[5] - f.z) > 0.002) {
      lk[0] = cp0.x;
      lk[1] = cp0.y;
      lk[2] = cp0.z;
      lk[3] = f.x;
      lk[4] = f.y;
      lk[5] = f.z;
      if (L.positionX) {
        L.positionX.setTargetAtTime(cp0.x, t, 0.05);
        L.positionY.setTargetAtTime(cp0.y, t, 0.05);
        L.positionZ.setTargetAtTime(cp0.z, t, 0.05);
        L.forwardX.setTargetAtTime(f.x, t, 0.05);
        L.forwardY.setTargetAtTime(f.y, t, 0.05);
        L.forwardZ.setTargetAtTime(f.z, t, 0.05);
        if (!this._upSet) {
          this._upSet = true;
          L.upX.value = 0;
          L.upY.value = 1;
          L.upZ.value = 0;
        }
      } else if (L.setPosition) {
        L.setPosition(cp0.x, cp0.y, cp0.z);
        L.setOrientation(f.x, f.y, f.z, 0, 1, 0);
      }
    }
    this.lis.x = cam.position.x;
    this.lis.y = cam.position.y;
    this.lis.z = cam.position.z;

    const p = game.player;
    const cp = p.pos;
    const z = this.zone;
    const play = game.state === 'play';
    const paused = game.state === 'paused';
    // pausa: el mundo se aleja y la música suena tras una puerta
    if (paused !== !!this._paused) {
      this._paused = paused;
      this.worldBus.gain.setTargetAtTime(paused ? 0.25 : 1, t, 0.15);
      this.musLP.frequency.setTargetAtTime(paused ? 900 : 20000, t, 0.2);
    }

    // rachas de viento: paseo aleatorio suavizado
    this.gustT -= dt;
    if (this.gustT <= 0) {
      this.gustT = rnd(1.2, 4);
      this.gustTo = Math.random() < 0.25 ? rnd(0.8, 1) : rnd(0.15, 0.6);
    }
    this.gust += (this.gustTo - this.gust) * Math.min(1, dt * 0.8);

    this._slow -= dt;
    if (this._slow <= 0) {
      this._slow = 0.1;
      const bed = ZONE_BED[z] || ZONE_BED.city;
      const w = this.layerGain(this.L.wind, bed[0] * (0.45 + this.gust * 0.9), 0.3);
      if (w) {
        const wf = 260 + this.gust * 520;
        this.setP(w.bp[0].frequency, wf, 0.3);
        this.setP(w.bp[1].frequency, wf * 1.23, 0.3);
        this.setP(w.lp.frequency, OUTDOOR[z] ? 9000 : 450, 0.5);
      }
      const wh = this.layerGain(this.L.whistle, z === 'ramparts' || z === 'tunnel' ? Math.max(0, this.gust - 0.5) * 0.08 : 0, 0.4);
      if (wh) this.setP(wh.bp.frequency, 700 + this.gust * 600, 0.5);
      this.layerGain(this.L.roar, bed[1], 1.5);
      this.layerGain(this.L.room, bed[2], 1.5);
      this.layerGain(this.L.drone, bed[3], 2);
      this.layerGain(this.L.river, bed[4], 2);

      // fuegos: cada hueco sigue a uno de los tres más cercanos sin saltar
      const fires = game.fx && game.fx.fires ? game.fx.fires.list : [];
      const near = [];
      for (const fr of fires) {
        if (!fr.on || fr.s < 0.3) continue;
        const d2 = (fr.x - cp.x) ** 2 + (fr.z - cp.z) ** 2 + (fr.y - cp.y) ** 2;
        if (d2 < 500) near.push([d2, fr]);
      }
      near.sort((a, b) => a[0] - b[0]);
      const top = near.slice(0, 3).map((n) => n[1]);
      const free = top.filter((fr) => !this.fireSlots.some((s) => s.fire === fr));
      for (const s of this.fireSlots) {
        if (!s.fire || !top.includes(s.fire)) {
          s.fire = free.shift() || null;
          s.moved = true;
        }
        const on = this.layerGain(s.L, s.fire ? 0.2 * Math.min(1.6, s.fire.s) : 0, 0.3);
        if (on && s.fire && (s.moved || !on.placed)) {
          this.setPos(on.p, s.fire.x, s.fire.y + 0.6, s.fire.z, false);
          on.placed = true;
          s.moved = false;
        }
      }

      // moscas
      const fl = game.fauna && game.state !== 'title' ? game.fauna.nearestFlies(cp, 7) : null;
      const fb = this.layerGain(this.L.flies, fl ? 0.05 : 0, 0.4);
      if (fb && fl) {
        this.setPos(fb.p, fl.x, fl.y + 0.3, fl.z, !!fb.placed);
        fb.placed = true;
      }

      // altar más cercano
      if (!this.altars && game.interact) this.altars = game.interact.list.filter((it) => it.kind === 'altar');
      let best = null,
        bd = 16;
      for (const a of this.altars || []) {
        const dd = Math.hypot(a.x - cp.x, (a.y || 0) - cp.y, a.z - cp.z);
        if (dd < bd) {
          bd = dd;
          best = a;
        }
      }
      const ah = this.layerGain(this.L.altar, best && (play || paused) ? 0.07 : 0, 0.6);
      if (ah && best) {
        this.setPos(ah.p, best.x, (best.y || 0) + 1.2, best.z, !!ah.placed && best === this._altar);
        ah.placed = true;
        this._altar = best;
      }

      // miedo
      this.fear = game.fear || 0;
      this.layerGain(this.L.fear, play ? this.fear * this.fear * 0.12 : 0, 0.2);
    }

    // susurros cuando algo acecha
    if (play && this.fear > 0.35 && Math.random() < dt * this.fear * 0.6) {
      const a = Math.random() * Math.PI * 2;
      const d = this.out({ x: cp.x + Math.cos(a) * 3, y: cp.y, z: cp.z + Math.sin(a) * 3 }, { gain: 0.5 * this.fear, verb: 0.6, life: 3, occlude: false });
      this.whisper(d, t, rnd(0.6, 1.4), 0.1);
    }

    // latido con poca vida
    const hpk = p.maxHp ? p.hp / p.maxHp : 1;
    if (play && hpk < 0.32 && !p.dead) {
      this.heartT -= dt;
      if (this.heartT <= 0) {
        this.heartT = 0.55 + hpk * 1.6;
        const d = this.out(null, { gain: 0.9 - hpk, verb: 0.02, life: 1.5 });
        this.smp(d, t, this.lib.drum('heart'), { gain: 0.7, lp: 400 });
      }
    }

    // sucesos ambientales
    this.nextAmb -= dt;
    if (this.nextAmb <= 0) this.nextAmb = game.state === 'intro' || game.state === 'ending' ? 4 : this.ambEvent(z, cp, t) * (game.state === 'title' ? 1.5 : 1);

    // música: peligro -> capas de tensión y combate
    let combat = 0;
    if (play && !p.dead) {
      for (const e of game.activeEnemies || []) {
        if (e.dead || !e.aware || e.boss || Math.abs(e.pos.y - cp.y) > 6) continue;
        const dd = Math.hypot(e.pos.x - cp.x, e.pos.z - cp.z);
        combat = Math.max(combat, clamp(1.25 - dd / 22, 0, 1));
      }
    }
    // sube deprisa y baja despacio: no «bombea» al perder de vista a un enemigo
    this.combatK += (combat - this.combatK) * Math.min(1, dt * (combat > this.combatK ? 2.5 : 0.25));
    this.score.setIntensity(play ? clamp((this.fear - 0.12) / 0.7, 0, 1) : 0, clamp(this.combatK, 0, 1));

    // música: explícita (título, jefes, final) o la de la zona
    const cur = this.score.cur ? this.score.cur.name : null;
    let want = null;
    if (this.override) want = this.override;
    else if ((play || paused) && t >= this.silenceUntil) want = ZONE_MUSIC[z] || 'city';
    if (this.vol.music <= 0.001) want = null; // música apagada: no se programa nada
    // la música de zona espera a que la zona se asiente (umbrales, puertas)
    if (want && !this.override && cur && cur !== want) {
      if (!this.zoneMusT) this.zoneMusT = t;
      if (t - this.zoneMusT < 1.6) want = cur;
    } else this.zoneMusT = 0;
    if (want !== cur) this.score.setTheme(want, this.override ? (want && want.startsWith('boss') ? 0.8 : 2.5) : 3.5);
    this.score.update();
  }
}
