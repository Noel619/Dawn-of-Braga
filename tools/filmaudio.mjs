// El sonido de la película del jefe final, medido sin altavoces. Dos pasadas:
// primero el juego de verdad ve la película (el robot, desde un punto de
// control, con las pulsaciones acertadas) y se graba cada llamada al audio
// con lo que el audio lee del juego (la cámara, el jugador, el estado); luego
// esas llamadas se reproducen solas, a 60 Hz, en un OfflineAudioContext (así
// el coste del juego, sus recolecciones de basura incluidas, no se cuela en
// la medida). Mide, en total y por segundo:
//   cpu     segundos de cálculo del hilo de audio por segundo de audio (lo
//           que en un portátil lento se convierte en cortes y chasquidos)
//   js      milisegundos de JavaScript del audio por segundo (hilo principal)
//   pico    pico de la salida (dBFS) y muestras por encima de -1 dBFS
//   gr      reducción del limitador final (dB): cuánto «aplasta» la mezcla
//   rms     nivel medio (dBFS)
//   nodos   nodos de audio creados por segundo; voces a la vez (máximo)
//   duck    la música atenuada (0..1, media): si siempre está abajo, no se oye
// y los peores segundos (por cpu, por limitador y por nodos) con lo que sonó
// en ellos.
//   node tools/filmaudio.mjs [rito|nave|grab|establo|torreSur|cabalgada|muralla] [segundos] [skip]
//   (skip: salta las cinemáticas como el jugador, con el juego a toda
//   velocidad mientras tanto)
//   ROWS=1 la tabla de cada segundo; MUS=0 sin música; WAV=ruta.wav guarda
//   lo que suena (para escucharlo)
// Requiere npx vite --port 5199.
import { chromium } from 'playwright';
import fs from 'node:fs';

const [cp = 'rito', secsArg = '0', skip = ''] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 480, height: 270 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
p.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('404')) logs.push('console.error: ' + m.text());
});
await p.goto('http://localhost:5199/?dev=1&at=0,-10,-144&yaw=180');
await p.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const res = await p.evaluate(
  async ([cp, secsArg, skip, env]) => {
    window.__pause = true;
    const g = __game;
    g.ui.closeAll();
    g.input.enabledPointerLock = false;
    g.input.onPointerLockLost = null;
    await g.colossi.model('turiferario');
    g.dev.autoQTE = true;
    const { Audio } = await import('/src/core/audio.js');
    const sr = 48000;
    const MAXS = +secsArg || 260;
    const step = 1 / 60;

    // ------------------------------------------------ 1. grabar
    // (un Audio sin arrancar: sus métodos no hacen nada; se graban)
    const real = g.audio;
    const rec = new Audio();
    const frames = [];
    let cur = [];
    const P3 = (v) => (v && v.x !== undefined ? { x: v.x, y: v.y ?? 0, z: v.z } : null);
    let eid = 0;
    const E = (e) => {
      if (!e.__aid) e.__aid = ++eid;
      return { id: e.__aid, pos: P3(e.pos), T: { voice: e.T && e.T.voice, friendly: !!(e.T && e.T.friendly) }, boss: !!e.boss, dead: !!e.dead, aware: !!e.aware };
    };
    const C = (o) => (o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v && v.x !== undefined ? P3(v) : v])) : o);
    rec.play = (name, pos, o) => cur.push(['play', name, P3(pos), C(o || {})]);
    rec.enemyVoice = (e, kind) => cur.push(['enemyVoice', E(e), kind]);
    rec.enemyStep = (e) => cur.push(['enemyStep', E(e)]);
    rec.setZone = (z) => cur.push(['setZone', z]);
    rec.music = (n) => cur.push(['music', n]);
    rec.stopMusic = () => cur.push(['stopMusic']);
    rec.hushWorld = (on) => cur.push(['hushWorld', on]);
    rec.ui = (k) => cur.push(['ui', k]);
    rec.init = () => {};
    rec.setVolumes = () => {};
    rec.update = (dt, game) => {
      const c = game.camera,
        pl = game.player,
        F = game.finale;
      cur.push(['update', dt, { cam: [c.position.x, c.position.y, c.position.z, c.quaternion.x, c.quaternion.y, c.quaternion.z, c.quaternion.w], pl: [pl.pos.x, pl.pos.y, pl.pos.z, pl.hp, pl.maxHp, pl.dead ? 1 : 0], state: game.state, fear: game.fear || 0, wind: F ? F.windK || 0 : 0, hero: F ? F.heroK || 0 : 0, surface: rec.surface, act: (game.activeEnemies || []).map(E) }]);
    };
    g.audio = rec;
    await g.finale.debugFilm(cp);
    let ended = -1,
      skipT = 0;
    for (let f = 0; f < MAXS * 60; f++) {
      if (skip && g.finale.film.skipOK && !g.finale.film.skipping && !g.qte.active) {
        skipT += step;
        if (skipT > 0.5) {
          g.finale.film.trySkip();
          skipT = 0;
        }
      }
      const n = g.ffSteps > 1 ? g.ffSteps : 1;
      for (let i = 0; i < n; i++) g.update(step);
      frames.push(cur);
      cur = [];
      if (g.state === 'ending') {
        ended = (f + 1) * step;
        break;
      }
    }
    // (unos segundos más, el final)
    for (let f = 0; f < 6 * 60; f++) {
      g.update(step);
      frames.push(cur);
      cur = [];
    }
    g.audio = real;

    // ------------------------------------------------ 2. reproducir
    const SECS = Math.ceil(frames.length * step) + 1;
    const ctx = new OfflineAudioContext(2, sr * SECS, sr);
    const count = { all: 0 };
    for (const k of Object.getOwnPropertyNames(BaseAudioContext.prototype)) {
      if (!k.startsWith('create') || typeof ctx[k] !== 'function' || k === 'createBuffer' || k === 'createPeriodicWave') continue;
      const f = ctx[k].bind(ctx);
      ctx[k] = (...a) => {
        count.all++;
        return f(...a);
      };
    }
    const t00 = performance.now();
    const au = new Audio();
    au.init(ctx);
    au.setVolumes(env.mus ?? g.settings.music ?? 0.7, g.settings.sfx ?? 0.9);
    // (lo pesado se precalcula en la pantalla de título)
    await new Promise((res) => {
      const t0 = performance.now();
      const baking = () => au.bakeProgress && au.bakeProgress()[0] < au.bakeProgress()[1] && performance.now() - t0 < 60000;
      const chk = () => (au._jobsOn || baking() || performance.now() - t0 < 1500 ? setTimeout(chk, 50) : res());
      setTimeout(chk, 200);
    });
    const bakeT = Math.round(performance.now() - t00);
    // el juego que ve el audio en la reproducción (el mundo, los fuegos y los
    // altares, los de verdad)
    const V3 = g.THREE.Vector3;
    const fg = { THREE: g.THREE, camera: { position: new V3(), quaternion: new g.THREE.Quaternion() }, player: { pos: new V3(), hp: 1, maxHp: 1, dead: false }, state: 'play', fear: 0, finale: { climb: { active: false }, windK: 0, heroK: 0 }, fx: g.fx, fauna: g.fauna, interact: g.interact, world: g.world, activeEnemies: [] };
    const ents = new Map();
    const ent = (s) => {
      let e = ents.get(s.id);
      if (!e) ents.set(s.id, (e = { pos: new V3(), T: {} }));
      e.pos.set(s.pos.x, s.pos.y, s.pos.z);
      e.T.voice = s.T.voice;
      e.T.friendly = s.T.friendly;
      e.boss = s.boss;
      e.dead = s.dead;
      e.aware = s.aware;
      return e;
    };
    const plays = [];
    let jsT = 0;
    const lim = au.limiter;
    const per = [];
    const S = (i) => per[i] || (per[i] = { cpu: 0, js: 0, gr: 0, nodes: 0, vmax: 0, duck: 0, n: 0, plays: {}, rooms: 0, zone: '' });
    let tResume = 0,
      lastNodes = 0;
    frames.forEach((calls, fi) => {
      const at = (Math.round((((fi + 1) * step) * sr) / 128) * 128) / sr;
      ctx.suspend(at).then(() => {
        const now = ctx.currentTime;
        const s = S(Math.floor(now));
        s.cpu += (performance.now() - tResume) / 1000;
        const w = performance.now();
        for (const c of calls) {
          try {
            if (c[0] === 'play') {
              plays.push([now, c[1]]);
              au.play(c[1], c[2], c[3]);
            } else if (c[0] === 'enemyVoice') au.enemyVoice(ent(c[1]), c[2]);
            else if (c[0] === 'enemyStep') au.enemyStep(ent(c[1]));
            else if (c[0] === 'setZone') au.setZone(c[1]);
            else if (c[0] === 'music') au.music(c[1]);
            else if (c[0] === 'stopMusic') au.stopMusic();
            else if (c[0] === 'hushWorld') au.hushWorld(c[1]);
            else if (c[0] === 'ui') au.ui(c[1]);
            else if (c[0] === 'update') {
              const st = c[2];
              fg.camera.position.set(st.cam[0], st.cam[1], st.cam[2]);
              fg.camera.quaternion.set(st.cam[3], st.cam[4], st.cam[5], st.cam[6]);
              fg.player.pos.set(st.pl[0], st.pl[1], st.pl[2]);
              fg.player.hp = st.pl[3];
              fg.player.maxHp = st.pl[4];
              fg.player.dead = !!st.pl[5];
              fg.state = st.state;
              fg.fear = st.fear;
              fg.finale.windK = st.wind;
              fg.finale.heroK = st.hero;
              if (st.surface) au.surface = st.surface;
              fg.activeEnemies = st.act.map(ent);
              au.update(c[1], fg);
            }
          } catch (e) {
            if (!window.__err) window.__err = String(e && e.stack);
          }
        }
        s.js += performance.now() - w;
        s.gr = Math.max(s.gr, -lim.reduction);
        s.nodes += count.all - lastNodes;
        lastNodes = count.all;
        s.vmax = Math.max(s.vmax, au.voices.filter((v) => v.until > now).length);
        s.duck += au.duckG.gain.value;
        s.rooms = Math.max(s.rooms, Object.values(au.rooms).filter((R) => R.on).length);
        s.zone = au.zone + (au.score.cur ? ':' + au.score.cur.name + (au.score.old.length ? '+' + au.score.old.length : '') : '');
        s.n++;
        tResume = performance.now();
        ctx.resume();
      });
    });
    tResume = performance.now();
    const buf = await ctx.startRendering();
    // niveles por segundo
    const db = (x) => (x > 0 ? Math.round(20 * Math.log10(x) * 10) / 10 : -999);
    const L = buf.getChannelData(0),
      R = buf.getChannelData(1);
    let peak = 0,
      hot = 0,
      sum = 0,
      nn = 0;
    for (let i = 0; i < per.length; i++) {
      const s = S(i);
      let pk = 0,
        sm = 0,
        c = 0;
      for (let k = i * sr; k < Math.min(L.length, (i + 1) * sr); k++) {
        const a = Math.max(Math.abs(L[k]), Math.abs(R[k]));
        if (a > pk) pk = a;
        if (a > 0.891) hot++;
        sm += L[k] * L[k] + R[k] * R[k];
        c += 2;
      }
      s.peak = db(pk);
      s.rms = db(Math.sqrt(sm / Math.max(1, c)));
      peak = Math.max(peak, pk);
      sum += sm;
      nn += c;
    }
    for (const [t, name] of plays) {
      const s = S(Math.floor(t));
      s.plays[name] = (s.plays[name] || 0) + 1;
    }
    // (lo que suena, en 16 bits, para escucharlo)
    let wav = null;
    if (env.wav) {
      const n = L.length,
        out = new DataView(new ArrayBuffer(44 + n * 4));
      const W = (o, s) => [...s].forEach((ch, i) => out.setUint8(o + i, ch.charCodeAt(0)));
      W(0, 'RIFF');
      out.setUint32(4, 36 + n * 4, true);
      W(8, 'WAVE');
      W(12, 'fmt ');
      out.setUint32(16, 16, true);
      out.setUint16(20, 1, true);
      out.setUint16(22, 2, true);
      out.setUint32(24, sr, true);
      out.setUint32(28, sr * 4, true);
      out.setUint16(32, 4, true);
      out.setUint16(34, 16, true);
      W(36, 'data');
      out.setUint32(40, n * 4, true);
      for (let i = 0; i < n; i++) {
        out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true);
        out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true);
      }
      const bytes = new Uint8Array(out.buffer);
      let s = '';
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      wav = btoa(s);
    }
    const rows = per.map((s, i) => ({ t: i, cpu: +s.cpu.toFixed(3), js: Math.round(s.js), gr: +s.gr.toFixed(1), peak: s.peak, rms: s.rms, nodes: s.nodes, voices: s.vmax, duck: +(s.duck / Math.max(1, s.n)).toFixed(2), rooms: s.rooms, zone: s.zone, plays: s.plays }));
    const upto = ended > 0 ? Math.ceil(ended) : rows.length;
    // (el primer segundo: el limitador arranca con un valor sin sentido)
    const film = rows.slice(1, upto);
    const avg = (k) => +(film.reduce((a, r) => a + r[k], 0) / Math.max(1, film.length)).toFixed(3);
    const top = (k, n = 8) =>
      film
        .slice()
        .sort((a, b) => b[k] - a[k])
        .slice(0, n);
    return {
      err: window.__err || null,
      wav,
      total: { bake: bakeT, baked: au.bakeProgress ? au.bakeProgress().join('/') : '-', secs: upto, ended: ended > 0 ? +ended.toFixed(1) : null, cpu: avg('cpu'), cpuMax: Math.max(...film.map((r) => r.cpu)), js: avg('js'), jsMax: Math.max(...film.map((r) => r.js)), peak: db(peak), over1dB: hot, rms: db(Math.sqrt(sum / Math.max(1, nn))), grMax: Math.max(...film.map((r) => r.gr)), grAvg: avg('gr'), nodes: avg('nodes'), nodesMax: Math.max(...film.map((r) => r.nodes)), voicesMax: Math.max(...film.map((r) => r.voices)), duck: avg('duck') },
      topCpu: top('cpu'),
      topGr: top('gr'),
      topNodes: top('nodes', 5),
      rows: rows.map((r) => [r.t, r.cpu, r.js, r.gr, r.peak, r.rms, r.nodes, r.voices, r.duck, r.rooms, r.zone].join(' ')),
    };
  },
  [cp, secsArg, skip, { mus: process.env.MUS !== undefined ? +process.env.MUS : undefined, wav: !!process.env.WAV }]
);
console.log('TOTAL', JSON.stringify(res.total));
console.log('-- peores por cpu');
for (const r of res.topCpu) console.log(JSON.stringify(r));
console.log('-- peores por limitador');
for (const r of res.topGr) console.log(JSON.stringify(r));
console.log('-- más nodos');
for (const r of res.topNodes) console.log(JSON.stringify(r));
if (process.env.ROWS) console.log('t cpu js gr peak rms nodes voices duck rooms zone\n' + res.rows.join('\n'));
if (res.err) console.log('ERROR', res.err);
if (res.wav && process.env.WAV) fs.writeFileSync(process.env.WAV, Buffer.from(res.wav, 'base64'));
if (logs.length) console.log(logs.slice(0, 10).join('\n'));
await b.close();
