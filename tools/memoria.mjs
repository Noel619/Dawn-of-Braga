// Lo que ocupa el juego en memoria al arrancar, por dónde se creó: un perfil
// por muestreo del montón de JS desde antes de cargar la página hasta que el
// juego está listo (lo que sigue vivo al final, agrupado por la función que
// lo creó y por la pila de llamadas de construcción).
//   node tools/memoria.mjs           (requiere npx vite --port 5199)
//   TOP=40 PILA=3 node tools/memoria.mjs
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:5199/?dev=1';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc', '--enable-precise-memory-info'] });
const ctx = await b.newContext({ viewport: { width: 960, height: 540 } });
const p = await ctx.newPage();
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('about:blank');
const cdp = await ctx.newCDPSession(p);
await cdp.send('HeapProfiler.enable');
await cdp.send('HeapProfiler.startSampling', { samplingInterval: 32768 });
const t0 = Date.now();
await p.goto(URL);
await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
const bootMs = Date.now() - t0;
await p.evaluate(() => {
  window.__pause = true;
  if (window.gc) window.gc();
});
const heap = await p.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null));
const { profile } = await cdp.send('HeapProfiler.stopSampling');
const TOP = +(process.env.TOP || 30);
const PILA = +(process.env.PILA || 4);
const self = new Map();
const stacks = new Map();
const walk = (n, path) => {
  const f = n.callFrame;
  const here = `${f.functionName || '(anon)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber + 1}`;
  const np = path.concat(here);
  const s = n.selfSize || 0;
  if (s) {
    self.set(here, (self.get(here) || 0) + s);
    const k = np.slice(-PILA).join('  <-  ');
    stacks.set(k, (stacks.get(k) || 0) + s);
  }
  for (const c of n.children || []) walk(c, np);
};
walk(profile.head, []);
const total = [...self.values()].reduce((a, b) => a + b, 0);
console.log(`arranque ${(bootMs / 1000).toFixed(1)} s · montón ${heap} MB · muestreado vivo ${Math.round(total / 1048576)} MB`);
console.log('--- por función que lo crea');
for (const [k, s] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP)) console.log(String(Math.round(s / 1048576)).padStart(6), 'MB ', k);
console.log('--- por pila (de dentro afuera)');
for (const [k, s] of [...stacks.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP)) console.log(String(Math.round(s / 1048576)).padStart(6), 'MB ', k.split('  <-  ').reverse().join('  ->  '));
if (logs.length) console.log(logs.join('\n'));
await b.close();
