// Perfil de rendimiento: lo que cuesta arrancar y cada fotograma.
//  - arranque: hasta que el juego está listo (construir la ciudad, las texturas)
//  - memoria: montón de JS, geometrías y texturas en la GPU, programas
//  - por sitio: milisegundos de update() y de render() (sólo el hilo de JS, y
//    con la GPU terminada), llamadas de dibujo y triángulos
//  - PERFIL=1: las funciones que más CPU gastan durante los fotogramas
//  - ASIGNA=1: dónde se crea basura (lo que acaba en pausas del recolector)
//   node tools/perfil.mjs            (requiere npx vite --port 5199)
//   SOLO=plaza,adarve FOTOS=120 node tools/perfil.mjs
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:5199/?dev=1';
const FOTOS = +(process.env.FOTOS || 90);
const VW = +(process.env.ANCHO || 960),
  VH = +(process.env.ALTO || 540);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc'] });
const ctx = await b.newContext({ viewport: { width: VW, height: VH } });
const p = await ctx.newPage();
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
p.on('console', (m) => {
  if (m.type() === 'error') logs.push('console.error: ' + m.text());
});
const cdp = await ctx.newCDPSession(p);
const t0 = Date.now();
await p.goto(URL);
await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
const bootMs = Date.now() - t0;

// [nombre, x, y, z, rumbo en grados]
const TODOS = [
  ['plaza del Pan', 0, 0, 0, 180],
  ['plaza del Pan → norte', 0, 0, 10, 0],
  ['adarve del castillo', -62, 9, -21, 90],
  ['patio de honor → puerta', -98, 0, -80, 0],
  ['adarve de levante', -64, 13.5, -78, 0],
  ['cárcel del Rey', -106, -7, -70, 0],
  ['celda (inicio)', -84.6, 0, -15.8, 180],
];
const SOLO = process.env.SOLO ? process.env.SOLO.split(',') : null;
const SITIOS = SOLO ? TODOS.filter(([n]) => SOLO.some((q) => n.includes(q))) : TODOS;

const mem = await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  if (window.gc) window.gc();
  const R = g.renderer;
  let verts = 0,
    tris = 0,
    bytes = 0,
    meshes = 0;
  const seen = new Set();
  g.scene.traverse((o) => {
    if (!o.geometry || seen.has(o.geometry)) return;
    seen.add(o.geometry);
    meshes++;
    const G = o.geometry;
    if (G.attributes.position) verts += G.attributes.position.count;
    tris += G.index ? G.index.count / 3 : G.attributes.position ? G.attributes.position.count / 3 : 0;
    for (const k in G.attributes) bytes += G.attributes[k].array.byteLength;
    if (G.index) bytes += G.index.array.byteLength;
  });
  let texBytes = 0,
    texN = 0;
  const texSeen = new Set();
  g.scene.traverse((o) => {
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms)
      for (const k in m) {
        const t = m[k];
        if (t && t.isTexture && !texSeen.has(t)) {
          texSeen.add(t);
          texN++;
          const im = t.image;
          if (im && im.width) texBytes += im.width * im.height * 4 * (t.generateMipmaps !== false ? 1.33 : 1);
        }
      }
  });
  return {
    heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
    geometries: R.info.memory.geometries,
    textures: R.info.memory.textures,
    programs: R.info.programs ? R.info.programs.length : null,
    sceneGeoms: meshes,
    verts,
    tris: Math.round(tris),
    geoMB: +(bytes / 1048576).toFixed(1),
    texN,
    texMB: +(texBytes / 1048576).toFixed(1),
    objects: (() => {
      let n = 0;
      g.scene.traverse(() => n++);
      return n;
    })(),
  };
});

const out = [];
for (const [name, x, y, z, yaw] of SITIOS) {
  // colocar y calentar
  await p.evaluate(
    ([x, y, z, yaw]) => {
      const g = __game;
      g.ui.closeAll && g.ui.closeAll();
      g.player.maxHp = g.player.hp = 1e9;
      g.player.spawn(x, y, z, (yaw * Math.PI) / 180);
      g.camRig.snapTo(g.player);
      for (let i = 0; i < 40; i++) g.update(1 / 60);
      const zn = g.zoneAt(g.player.pos);
      if (zn) g.atmo.set(zn.atmo, true);
      for (let i = 0; i < 20; i++) {
        g.update(1 / 60);
        g.render();
      }
    },
    [x, y, z, yaw]
  );
  if (process.env.PERFIL) {
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
    await cdp.send('Profiler.start');
  }
  if (process.env.ASIGNA) {
    await cdp.send('HeapProfiler.enable');
    await cdp.send('HeapProfiler.startSampling', { samplingInterval: 4096 });
  }
  const r = await p.evaluate(
    ([N, SINGPU]) => {
      const g = __game;
      const R = g.renderer;
      const gl = R.getContext();
      const px = new Uint8Array(4);
      const up = [],
        rj = [],
        rg = [];
      const h0 = performance.memory ? performance.memory.usedJSHeapSize : 0;
      let calls = 0,
        tris = 0;
      R.info.autoReset = false;
      for (let i = 0; i < N; i++) {
        const a = performance.now();
        g.update(1 / 60);
        const b2 = performance.now();
        R.info.reset();
        g.render();
        const c = performance.now();
        // (que la GPU termine: lo que tarda de verdad el fotograma; SINGPU=1, no)
        if (!SINGPU) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const d = performance.now();
        up.push(b2 - a);
        rj.push(c - b2);
        rg.push(d - b2);
        calls += R.info.render.calls;
        tris += R.info.render.triangles;
      }
      const h1 = performance.memory ? performance.memory.usedJSHeapSize : 0;
      const st = (v) => {
        const s = v.slice().sort((a, b) => a - b);
        const avg = v.reduce((a, b) => a + b, 0) / v.length;
        return { avg: +avg.toFixed(2), p50: +s[s.length >> 1].toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(2), max: +s[s.length - 1].toFixed(2) };
      };
      R.info.autoReset = true;
      return { update: st(up), renderJS: st(rj), renderGPU: st(rg), calls: Math.round(calls / N), tris: Math.round(tris / N), heapGrowKB: Math.round((h1 - h0) / 1024), enemies: g.activeEnemies.length };
    },
    [FOTOS, !!process.env.SINGPU]
  );
  r.name = name;
  if (process.env.PERFIL) {
    const { profile } = await cdp.send('Profiler.stop');
    const self = new Map();
    const dtot = profile.timeDeltas.reduce((a, b) => a + b, 0);
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    const cnt = new Map();
    for (const s of profile.samples) cnt.set(s, (cnt.get(s) || 0) + 1);
    const total = profile.samples.length;
    for (const [id, c] of cnt) {
      const n = byId.get(id);
      const f = n.callFrame;
      const k = `${f.functionName || '(anon)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber + 1}`;
      self.set(k, (self.get(k) || 0) + c);
    }
    r.top = [...self.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, +(process.env.TOP || 25))
      .map(([k, c]) => `${((100 * c) / total).toFixed(1).padStart(5)}%  ${k}`);
    r.profMs = Math.round(dtot / 1000);
  }
  if (process.env.ASIGNA) {
    const { profile } = await cdp.send('HeapProfiler.stopSampling');
    const by = new Map();
    const walk = (n) => {
      const f = n.callFrame;
      const k = `${f.functionName || '(anon)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber + 1}`;
      const s = n.selfSize || 0;
      if (s) by.set(k, (by.get(k) || 0) + s);
      for (const c of n.children || []) walk(c);
    };
    walk(profile.head);
    r.alloc = [...by.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, +(process.env.TOP || 20))
      .map(([k, s]) => `${String(Math.round(s / 1024)).padStart(7)} KB  ${k}`);
  }
  out.push(r);
}

console.log(`arranque: ${(bootMs / 1000).toFixed(1)} s · ventana ${VW}×${VH}`);
console.log('memoria:', JSON.stringify(mem));
console.log('sitio'.padEnd(26), 'upd ms (p50/p95)'.padEnd(18), 'render JS'.padEnd(14), 'render+GPU'.padEnd(14), 'llamadas', 'triáng.', 'basura KB', 'criat.');
for (const r of out) {
  console.log(
    r.name.padEnd(26),
    `${r.update.p50}/${r.update.p95}`.padEnd(18),
    `${r.renderJS.p50}/${r.renderJS.p95}`.padEnd(14),
    `${r.renderGPU.p50}/${r.renderGPU.p95}`.padEnd(14),
    String(r.calls).padStart(8),
    String(r.tris).padStart(8),
    String(r.heapGrowKB).padStart(9),
    String(r.enemies).padStart(6)
  );
  if (r.top) console.log('  CPU (' + r.profMs + ' ms):\n   ' + r.top.join('\n   '));
  if (r.alloc) console.log('  asignaciones:\n   ' + r.alloc.join('\n   '));
}
if (logs.length) console.log(logs.slice(0, 20).join('\n'));
await b.close();
