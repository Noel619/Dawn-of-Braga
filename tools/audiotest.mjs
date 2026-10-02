// Prueba del audio sin altavoces: renderiza con OfflineAudioContext cada tema
// musical (calma, tensión y combate) y cada efecto, y mide picos, RMS, NaN y
// el coste de CPU (segundos de cálculo por segundo de audio).
// Uso: node tools/audiotest.mjs [temas|efectos|todo] (servidor vite en :5199)
import { chromium } from 'playwright';
const mode = process.argv[2] || 'todo';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
p.on('console', (m) => m.type() === 'error' && errs.push('CONSOLE: ' + m.text()));
await p.goto('http://localhost:5199/package.json');
await p.setContent('<html><body>audio</body></html>');
const res = await p.evaluate(async (mode) => {
  const base = 'http://localhost:5199';
  const { Audio } = await import(base + '/src/core/audio.js');
  class V3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    applyQuaternion() {
      return this;
    }
  }
  const stats = (buf, t0 = 0, t1 = null) => {
    const sr = buf.sampleRate;
    let peak = 0,
      sum = 0,
      n = 0,
      nan = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      const a = Math.floor(t0 * sr),
        e = Math.min(d.length, t1 ? Math.floor(t1 * sr) : d.length);
      for (let i = a; i < e; i++) {
        const v = d[i];
        if (!Number.isFinite(v)) {
          nan++;
          continue;
        }
        const av = Math.abs(v);
        if (av > peak) peak = av;
        sum += v * v;
        n++;
      }
    }
    const db = (x) => (x > 0 ? Math.round(20 * Math.log10(x) * 10) / 10 : -999);
    return { peak: db(peak), rms: db(Math.sqrt(sum / Math.max(1, n))), nan };
  };
  // juego falso: lo mínimo que lee Audio.update
  const fakeGame = (over = {}) => ({
    THREE: { Vector3: V3 },
    camera: { position: new V3(0, 1.6, 4), quaternion: {} },
    player: { pos: new V3(0, 0, 0), hp: 100, maxHp: 100, dead: false },
    state: 'play',
    fear: 0,
    activeEnemies: [],
    fx: { fires: { list: [] } },
    fauna: null,
    interact: { list: [] },
    world: null,
    ...over,
  });
  async function render(secs, setup, step) {
    const sr = 44100;
    const ctx = new OfflineAudioContext(2, sr * secs, sr);
    const au = new Audio();
    au.init(ctx);
    const g = fakeGame();
    setup && setup(au, g);
    for (let t = 0.05; t < secs - 0.05; t += 0.05) {
      ctx.suspend(t).then(() => {
        step && step(au, g, ctx.currentTime);
        au.update(0.05, g);
        ctx.resume();
      });
    }
    au.update(0.05, g);
    const w0 = performance.now();
    const buf = await ctx.startRendering();
    const wall = (performance.now() - w0) / 1000;
    return { buf, wall };
  }
  const out = {};
  if (mode === 'temas' || mode === 'todo') {
    const themes = ['title', 'city', 'ramparts', 'interior', 'prison', 'sanctuary', 'cathedral', 'crypt', 'boss', 'boss2', 'bossCellar', 'bossCellar2', 'cellarHunt', 'bossFinal', 'bossFinal2', 'ending'];
    for (const th of themes) {
      // 0-24 s calma, 24-40 s tensión, 40-60 s combate
      const { buf, wall } = await render(
        60,
        (au) => au.music(th),
        (au, g, t) => {
          g.fear = t > 24 ? 0.85 : 0;
          g.activeEnemies = t > 40 ? [{ pos: new V3(3, 0, 0), aware: true, dead: false, boss: false }] : [];
        },
      );
      out[th] = { calma: stats(buf, 3, 24), tension: stats(buf, 27, 40), combate: stats(buf, 43, 60), cpu: Math.round((wall / 60) * 1000) / 1000 };
    }
    // música de zona automática y cambio de zona
    const { buf } = await render(
      30,
      (au) => au.setZone('city'),
      (au, g, t) => {
        if (t > 15) au.setZone('crypt');
      },
    );
    out.zonas = { ciudad: stats(buf, 2, 15), cripta: stats(buf, 20, 30) };
  }
  if (mode === 'efectos' || mode === 'todo') {
    const names = ['crow', 'swing', 'swingHeavy', 'hit', 'hitHeavy', 'clang', 'block', 'guardbreak', 'playerHurt', 'roll', 'step', 'land', 'heal', 'slam', 'bellToll', 'roar', 'wail', 'wailHit', 'fireWhoosh', 'explosion', 'burn', 'doorOpen', 'gateOpen', 'unlock', 'locked', 'bar', 'boards', 'seal', 'pickup', 'paper', 'rest', 'death', 'stinger', 'phantom', 'discover', 'fog', 'victory', 'crack', 'scuttle', 'boneCrack', 'breathClose', 'stairCreak', 'lampOut', 'whisperClose', 'scare', 'dread', 'chew', 'silence', 'drip', 'neckTwist', 'descScream', 'amaWhisper', 'doorSlam', 'corpseThud', 'giggle', 'amaCall', 'mimicSteps', 'whisperNear', 'pounceWhoosh', 'slamSoft', 'grab', 'bite', 'stoneCreak', 'pillarBreak', 'wallBreak', 'rackBreak', 'woodHit', 'dropCry', 'boneThrow', 'boneClatter', 'climb', 'leverPull', 'chainRun', 'gateStep', 'rageScream', 'snarl', 'leapBack', 'boneBlock', 'limbSnap', 'bodyFall', 'deathRattle', 'leverCreak', 'leverClunk', 'sackTear', 'dig', 'parry', 'deflect', 'riposte', 'peril'];
    for (const n of names) {
      const { buf, wall } = await render(
        6,
        (au, g) => {
          g.state = 'intro'; // sin música de zona
          au.setVolumes(0, 0.9);
        },
        (au, g, t) => {
          if (Math.abs(t - 0.5) < 0.026) au.play(n, n === 'step' || n === 'pickup' || n === 'paper' ? null : { x: 2, y: 0, z: 0 }, { v: 12, run: true, w: 1 });
        },
      );
      out['fx:' + n] = { ...stats(buf, 0.4, 6), cpu: Math.round((wall / 6) * 1000) / 1000 };
    }
    const voices = ['penitent', 'soldier', 'crawler', 'hound', 'bell', 'mourner', 'impaled', 'descoyuntado', 'boss'];
    for (const v of voices)
      for (const k of ['alert', 'attack', 'hurt', 'death', 'idle']) {
        const { buf } = await render(
          5,
          (au, g) => {
            g.state = 'intro';
            au.setVolumes(0, 0.9);
          },
          (au, g, t) => {
            if (Math.abs(t - 0.5) < 0.026) {
              const e = { pos: { x: 3, y: 0, z: 0 }, T: { voice: v } };
              au.enemyVoice(e, k);
              au.enemyStep(e);
            }
          },
        );
        out['voz:' + v + ':' + k] = stats(buf, 0.4, 5);
      }
    // ambiente de cada zona, sin música
    for (const z of ['city', 'ramparts', 'interior', 'prison', 'chapel', 'cathedral', 'crypt', 'tunnel', 'cellar', 'dawn']) {
      const { buf, wall } = await render(
        20,
        (au, g) => {
          au.setVolumes(0, 0.9);
          au.setZone(z);
          g.fx.fires.list = [{ on: true, s: 1, x: 4, y: 0, z: 2 }];
        },
        null,
      );
      out['amb:' + z] = { ...stats(buf, 3, 20), cpu: Math.round((wall / 20) * 1000) / 1000 };
    }
  }
  return out;
}, mode);
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(26), JSON.stringify(v));
console.log(errs.slice(0, 10).join('\n'));
await b.close();
