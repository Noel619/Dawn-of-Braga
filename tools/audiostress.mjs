// Prueba de carga del audio en situaciones de juego (sin altavoces): una horda
// que te descubre y pelea, un umbral de puerta que se cruza una y otra vez, un
// recorrido por las zonas y la pelea con el Descoyuntado. La cámara se mueve y
// gira a 60 Hz como en el juego (el oyente cambia en cada fotograma).
// Mide, por escenario:
//   cpu     segundos de cálculo del hilo de audio por segundo de audio
//   js      milisegundos de JavaScript del audio por segundo (hilo principal)
//   jsMax   el peor fotograma (ms): lo que puede costar un tirón; peor = la
//           llamada más cara y lo que tardó
//   pico    pico de la salida (dBFS); recorte = muestras por encima de 0 dBFS
//           y sobreMenos1 = por encima de -1 dBFS
//   gr      reducción máxima y media de cada compresor (dB; el primero es el
//           limitador final): cuánto «aplasta» la mezcla
//   nodos   nodos de audio creados por segundo; conv = convolvers creados;
//           panners = PannerNode creados (caros con el oyente en movimiento)
//   voces   presupuesto de voces: admitidas, rechazadas, aplazadas al
//           fotograma siguiente, apartadas y el máximo sonando a la vez
// Uso: node tools/audiostress.mjs [escenario...]   (servidor vite en :5199)
import { chromium } from 'playwright';
const only = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
p.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push('CONSOLE: ' + m.text()));
await p.goto('http://localhost:5199/package.json');
const res = await p.evaluate(async (only) => {
  const { Audio } = await import('http://localhost:5199/src/core/audio.js');
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
    // giro en torno al eje Y (la cámara solo guiña en esta prueba)
    applyQuaternion(q) {
      const c = Math.cos(q.yaw || 0),
        s = Math.sin(q.yaw || 0);
      const x = this.x * c + this.z * s,
        z = -this.x * s + this.z * c;
      this.x = x;
      this.z = z;
      return this;
    }
  }
  // generador con semilla: cada escenario suena igual en cada pasada
  let seed = 1;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rnd = (a, b) => a + rand() * (b - a);
  const pick = (a) => a[Math.floor(rand() * a.length)];

  const fakeGame = () => ({
    THREE: { Vector3: V3 },
    camera: { position: new V3(0, 1.8, 4.5), quaternion: { yaw: 0 } },
    player: { pos: new V3(0, 0, 0), hp: 100, maxHp: 100, dead: false },
    state: 'play',
    fear: 0,
    activeEnemies: [],
    fx: { fires: { list: [] } },
    fauna: null,
    interact: { list: [] },
    world: null,
  });
  // la cámara sigue al jugador por detrás
  const placeCam = (g) => {
    const yaw = g.camera.quaternion.yaw;
    const P = g.player.pos;
    g.camera.position.set(P.x + Math.sin(yaw) * 4.5, P.y + 1.8, P.z + Math.cos(yaw) * 4.5);
  };

  // ---------------------------------------------------------------- escenarios
  const enemy = (voice, x, z) => ({ pos: new V3(x, 0, z), T: { voice }, aware: false, dead: false, boss: false, stepT: rand(), voiceT: rand() * 3 });
  const S = {
    // explorar la ciudad: pasos, fuegos, sucesos y la música de la zona
    explorar: {
      secs: 24,
      setup(au, g) {
        au.setZone('city');
        g.fx.fires.list = [
          { on: true, s: 1, x: 6, y: 0, z: -4 },
          { on: true, s: 1.2, x: -9, y: 0, z: -12 },
          { on: true, s: 0.8, x: 3, y: 0, z: -20 },
          { on: true, s: 1, x: -4, y: 0, z: 8 },
        ];
      },
      step(au, g, t, dt, st) {
        g.player.pos.z -= dt * 1.4;
        g.camera.quaternion.yaw = Math.sin(t * 0.4) * 0.8;
        st.stepT = (st.stepT || 0) - dt;
        if (st.stepT <= 0) {
          st.stepT = 0.45;
          st.side = !st.side;
          au.play('step', null, { side: st.side ? 1 : 0, w: 1 });
        }
      },
    },
    // ocho criaturas te descubren a la vez y pelean contigo
    horda: {
      secs: 26,
      setup(au, g, st) {
        au.setZone('city');
        const voices = ['soldier', 'penitent', 'hound', 'crawler', 'soldier', 'penitent', 'mourner', 'soldier'];
        st.E = voices.map((v, i) => {
          const a = (i / voices.length) * Math.PI * 2;
          const r = rnd(5, 18);
          return enemy(v, Math.cos(a) * r, Math.sin(a) * r);
        });
        g.activeEnemies = st.E;
      },
      step(au, g, t, dt, st) {
        const P = g.player.pos;
        const combat = t > 4;
        g.fear = combat ? 0.95 : 0.4;
        // la cámara gira deprisa con el fijado de objetivo
        g.camera.quaternion.yaw = combat ? Math.sin(t * 1.7) * 1.6 : t * 0.3;
        if (combat && !st.alerted) {
          st.alerted = true;
          for (const e of st.E) {
            e.aware = true;
            au.enemyVoice(e, 'alert');
          }
          au.play('stinger');
        }
        for (const e of st.E) {
          if (e.dead) continue;
          const dx = P.x - e.pos.x,
            dz = P.z - e.pos.z;
          const d = Math.hypot(dx, dz);
          if (combat && d > 2.2) {
            e.pos.x += (dx / d) * dt * 2.2;
            e.pos.z += (dz / d) * dt * 2.2;
          }
          e.stepT -= dt;
          if (e.stepT <= 0) {
            e.stepT = combat ? rnd(0.3, 0.45) : rnd(0.5, 0.7);
            au.enemyStep(e);
          }
          e.voiceT -= dt;
          if (e.voiceT <= 0) {
            e.voiceT = combat ? rnd(1.2, 2.2) : rnd(2, 5);
            au.enemyVoice(e, combat ? 'attack' : 'idle');
            if (combat && rand() < 0.3) au.play(rand() < 0.5 ? 'block' : 'playerHurt', P);
            else if (combat && rand() < 0.2) au.play('clang', e.pos);
          }
        }
        if (combat) {
          st.swingT = (st.swingT || 0) - dt;
          if (st.swingT <= 0) {
            st.swingT = 0.65;
            au.play(pick(['swing', 'swingHeavy', 'swingAxe']), P);
            const alive = st.E.filter((e) => !e.dead);
            const e = alive.sort((a, b) => Math.hypot(a.pos.x - P.x, a.pos.z - P.z) - Math.hypot(b.pos.x - P.x, b.pos.z - P.z))[0];
            if (e && rand() < 0.6) {
              au.play(rand() < 0.4 ? 'hitHeavy' : 'hit', e.pos);
              e.hits = (e.hits || 0) + 1;
              if (e.hits >= 4) {
                e.dead = true;
                au.enemyVoice(e, 'death');
              } else au.enemyVoice(e, 'hurt');
            }
          }
          st.stepT = (st.stepT || 0) - dt;
          if (st.stepT <= 0) {
            st.stepT = 0.38;
            au.play(rand() < 0.1 ? 'roll' : 'step', null, { run: true, side: (st.side = !st.side) ? 1 : 0 });
          }
        }
      },
    },
    // de pie en una puerta: la zona cambia una y otra vez (calle / casa)
    umbral: {
      secs: 22,
      setup(au) {
        au.setZone('city');
      },
      step(au, g, t, dt, st) {
        g.camera.quaternion.yaw = Math.sin(t * 0.9) * 1.2;
        st.zT = (st.zT || 0.5) - dt;
        if (st.zT <= 0) {
          st.zT = rnd(0.12, 0.7);
          st.in = !st.in;
          au.setZone(st.in ? 'interior' : 'city');
          au.surface = st.in ? 'wood' : 'stone';
        }
        st.stepT = (st.stepT || 0) - dt;
        if (st.stepT <= 0) {
          st.stepT = 0.5;
          au.play('step', null, { side: (st.side = !st.side) ? 1 : 0 });
        }
      },
    },
    // recorrido rápido por las zonas: salas y temas que se funden
    recorrido: {
      secs: 30,
      setup(au) {
        au.setZone('city');
      },
      step(au, g, t, dt, st) {
        const route = [
          [0, 'city'],
          [3, 'interior'],
          [6, 'city'],
          [8.5, 'cathedral'],
          [12.5, 'crypt'],
          [16, 'tunnel'],
          [18, 'cellar'],
          [21, 'city'],
          [24, 'ramparts'],
          [27, 'chapel'],
        ];
        let z = 'city';
        for (const [t0, zz] of route) if (t >= t0) z = zz;
        if (z !== st.z) {
          st.z = z;
          au.setZone(z);
          if (rand() < 0.5) au.play('discover');
          if (z === 'cathedral') au.play('doorOpen', { x: 0, y: 0, z: -2 });
        }
        g.player.pos.z -= dt * 1.6;
        g.camera.quaternion.yaw = Math.sin(t * 0.6) * 1.1;
        st.stepT = (st.stepT || 0) - dt;
        if (st.stepT <= 0) {
          st.stepT = 0.42;
          au.play('step', null, { side: (st.side = !st.side) ? 1 : 0, run: true });
        }
      },
    },
    // la pelea con el Descoyuntado en la bodega
    jefe: {
      secs: 26,
      setup(au, g, st) {
        au.setZone('cellar');
        au.music('bossCellar');
        st.D = enemy('descoyuntado', 6, -3);
        st.D.boss = true;
        st.D.aware = true;
        g.activeEnemies = [st.D];
        au.enemyVoice(st.D, 'alert');
      },
      step(au, g, t, dt, st) {
        const D = st.D;
        const P = g.player.pos;
        g.fear = 1;
        g.camera.quaternion.yaw = Math.sin(t * 1.3) * 1.8;
        D.pos.x = Math.cos(t * 0.7) * 6;
        D.pos.z = Math.sin(t * 0.9) * 6;
        if (t > 13 && !st.phase2) {
          st.phase2 = true;
          au.music('bossCellar2');
          au.play('rageScream', D.pos);
        }
        D.stepT -= dt;
        if (D.stepT <= 0) {
          D.stepT = rnd(0.18, 0.3);
          au.enemyStep(D);
        }
        st.actT = (st.actT || 1) - dt;
        if (st.actT <= 0) {
          st.actT = rnd(0.7, 1.4);
          const k = pick(['crack', 'scuttle', 'snarl', 'pounceWhoosh', 'slamSoft', 'boneCrack', 'leapBack', 'boneBlock', 'descScream', 'giggle', 'chew']);
          au.play(k, D.pos, { n: 3, k: 0.8 });
          if (rand() < 0.5) au.enemyVoice(D, pick(['attack', 'hurt']));
          if (rand() < 0.25) au.play(pick(['playerHurt', 'block', 'grab', 'bite']), P);
        }
        st.swingT = (st.swingT || 0) - dt;
        if (st.swingT <= 0) {
          st.swingT = rnd(0.6, 1.1);
          au.play(pick(['swingKatana', 'thrust', 'swingAxe']), P);
          if (rand() < 0.5) au.play(pick(['hitAxe', 'hit', 'boneBlock']), D.pos);
        }
        st.stepT = (st.stepT || 0) - dt;
        if (st.stepT <= 0) {
          st.stepT = 0.36;
          au.play(rand() < 0.15 ? 'roll' : 'step', null, { run: true, side: (st.side = !st.side) ? 1 : 0 });
        }
      },
    },
    // lo más pesado a la vez, de cerca: derrumbe, explosión, rugido, campana
    estruendo: {
      secs: 12,
      setup(au) {
        au.setZone('cathedral');
      },
      step(au, g, t, dt, st) {
        g.camera.quaternion.yaw = t * 0.8;
        const at = [
          [1, 'pillarBreak', { x: 4, y: 0, z: -3 }],
          [1.05, 'explosion', { x: -3, y: 0, z: -6 }],
          [1.1, 'roar', { x: 6, y: 0, z: 2 }],
          [1.2, 'bellToll', { x: 0, y: 12, z: -30 }],
          [1.3, 'rageScream', { x: 3, y: 0, z: 3 }],
          [1.35, 'slam', { x: 2, y: 0, z: -1 }],
          [1.4, 'guardbreak', { x: 0, y: 0, z: 0 }],
          [5, 'wallBreak', { x: -5, y: 0, z: -4 }],
          [5.02, 'seal', { x: 1, y: 0, z: -2 }],
          [5.1, 'descScream', { x: 5, y: 0, z: -5 }],
          [5.2, 'scare', null],
        ];
        st.i = st.i || 0;
        while (st.i < at.length && t >= at[st.i][0]) {
          const [, n, pos] = at[st.i++];
          au.play(n, pos);
        }
      },
    },
  };

  // ---------------------------------------------------------------- render
  const db = (x) => (x > 0 ? Math.round(20 * Math.log10(x) * 10) / 10 : -999);
  const run = async (name, sc) => {
    seed = 12345;
    const sr = 48000,
      secs = sc.secs;
    const ctx = new OfflineAudioContext(2, sr * secs, sr);
    // contador de nodos creados
    const count = { all: 0, conv: 0, panner: 0 };
    for (const k of Object.getOwnPropertyNames(BaseAudioContext.prototype)) {
      if (!k.startsWith('create') || typeof ctx[k] !== 'function' || k === 'createBuffer' || k === 'createPeriodicWave') continue;
      const f = ctx[k].bind(ctx);
      ctx[k] = (...a) => {
        count.all++;
        if (k === 'createConvolver') count.conv++;
        if (k === 'createPanner') count.panner++;
        return f(...a);
      };
    }
    const comps = [];
    const mkComp = ctx.createDynamicsCompressor;
    ctx.createDynamicsCompressor = (...a) => {
      const c = mkComp(...a);
      comps.push(c);
      return c;
    };
    const au = new Audio();
    au.init(ctx);
    // en el juego, lo pesado se precalcula durante la pantalla de título:
    // se espera a que termine (si el motor no lo dice, 2 s)
    await new Promise((res) => {
      const t0 = performance.now();
      const chk = () => (au._jobsOn || (au._jobsOn === undefined && performance.now() - t0 < 2000) ? setTimeout(chk, 50) : res());
      setTimeout(chk, 200);
    });
    const g = fakeGame();
    const st = {};
    sc.setup(au, g, st);
    placeCam(g);
    au.update(1 / 60, g);
    // cronómetro de cada llamada al audio desde el juego
    // (update y algunas voces llaman a play por dentro: solo cuenta la llamada exterior)
    const worst = { ms: 0, que: '' };
    let js = 0,
      frameJs = 0,
      jsMax = 0,
      depth = 0;
    const wrap = (obj, k) => {
      const f = obj[k].bind(obj);
      obj[k] = (...a) => {
        if (depth) return f(...a);
        depth++;
        const w = performance.now();
        try {
          return f(...a);
        } finally {
          const dt = performance.now() - w;
          frameJs += dt;
          if (dt > worst.ms && ctx.currentTime > 0.5) {
            worst.ms = Math.round(dt * 10) / 10;
            worst.que = k + (typeof a[0] === 'string' ? ':' + a[0] : a[1] && typeof a[1] === 'string' ? ':' + a[1] : '');
          }
          depth--;
        }
      };
    };
    for (const k of ['play', 'enemyVoice', 'enemyStep', 'setZone', 'music', 'update', 'ui']) wrap(au, k);
    // presupuesto de voces: admitidas, rechazadas, aplazadas, apartadas y el
    // máximo de voces sonando a la vez
    const vs = { si: 0, no: 0, aplazadas: 0, apartadas: 0, max: 0 };
    if (au.admit) {
      const ad = au.admit.bind(au);
      au.admit = (...a) => {
        const r = ad(...a);
        if (r === 1) vs.si++;
        else if (r === -1) vs.aplazadas++;
        else vs.no++;
        return r;
      };
      const stl = au.steal.bind(au);
      au.steal = (v) => {
        vs.apartadas++;
        return stl(v);
      };
    }
    // reducción de ganancia de cada compresor (el primero es el limitador final)
    const gr = [],
      grSum = [];
    let frames = 0;
    const step = 1 / 60;
    for (let t = step; t < secs - 0.05; t += step) {
      const at = (Math.round((t * sr) / 128) * 128) / sr;
      ctx.suspend(at).then(() => {
        frameJs = 0;
        const now = ctx.currentTime;
        sc.step(au, g, now, step, st);
        placeCam(g);
        au.update(step, g);
        js += frameJs;
        if (now > 0.5) jsMax = Math.max(jsMax, frameJs);
        if (now > 1.5)
          comps.forEach((c, i) => {
            gr[i] = Math.max(gr[i] || 0, -c.reduction);
            grSum[i] = (grSum[i] || 0) - c.reduction;
          });
        frames++;
        if (au.voices) vs.max = Math.max(vs.max, au.voices.filter((v) => v.until > now).length);
        ctx.resume();
      });
    }
    const w0 = performance.now();
    const buf = await ctx.startRendering();
    const wall = (performance.now() - w0) / 1000;
    let peak = 0,
      over = 0,
      hot = 0,
      sum = 0,
      n = 0,
      nan = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = Math.floor(sr * 0.3); i < d.length; i++) {
        const v = d[i];
        if (!Number.isFinite(v)) {
          nan++;
          continue;
        }
        const a = Math.abs(v);
        if (a > peak) peak = a;
        if (a > 1) over++;
        if (a > 0.891) hot++;
        sum += v * v;
        n++;
      }
    }
    return {
      cpu: Math.round(((wall - js / 1000) / secs) * 1000) / 1000,
      js: Math.round((js / secs) * 10) / 10,
      jsMax: Math.round(jsMax * 10) / 10,
      peor: worst.que + ' ' + worst.ms,
      pico: db(peak),
      rms: db(Math.sqrt(sum / Math.max(1, n))),
      recorte: over,
      sobreMenos1: hot,
      gr: gr.map((v) => Math.round(v * 10) / 10),
      grMedia: grSum.map((v) => Math.round((v / Math.max(1, frames)) * 10) / 10),
      nodos: Math.round(count.all / secs),
      conv: count.conv,
      panners: count.panner,
      nan,
      ...(au.admit ? { voces: vs } : {}),
    };
  };
  const out = {};
  {
    // línea base: lo que cuesta suspender y reanudar el render 60 veces por segundo
    const sr = 48000,
      secs = 10;
    const ctx = new OfflineAudioContext(2, sr * secs, sr);
    for (let t = 1 / 60; t < secs - 0.05; t += 1 / 60) ctx.suspend((Math.round((t * sr) / 128) * 128) / sr).then(() => ctx.resume());
    const w0 = performance.now();
    await ctx.startRendering();
    out.base = { cpu: Math.round(((performance.now() - w0) / 1000 / secs) * 1000) / 1000 };
  }
  for (const [k, sc] of Object.entries(S)) if (!only.length || only.includes(k)) out[k] = await run(k, sc);
  return out;
}, only);
for (const [k, v] of Object.entries(res)) console.log(k.padEnd(10), JSON.stringify(v));
if (errs.length) console.log(errs.slice(0, 10).join('\n'));
await b.close();
