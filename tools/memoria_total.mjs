// La memoria de verdad del juego, segundo a segundo: lo que ocupan en el
// sistema el proceso de la página (el montón de JS, los arrays de la
// geometría, los hilos de fondo, el audio, el DOM) y el de la GPU (los
// búferes y las texturas de WebGL, los shaders), con su pico. Es lo que mira
// un teléfono para cerrar una pestaña que gasta demasiado (en el iPhone,
// Safari la recarga sin decir nada). Del arranque al título y, desde el
// título, una partida nueva entera hasta despertar en la celda y unos
// segundos de juego; o (DEV=1) directo a jugar.
//   node tools/memoria_total.mjs     (requiere npx vite --port 5199; URL=... otra versión)
//   SEG=60 node tools/memoria_total.mjs
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.env.URL || 'http://localhost:5199/';
const SEG = +(process.env.SEG || 45);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--autoplay-policy=no-user-gesture-required', '--js-flags=--expose-gc'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: +(process.env.DPR || 2), isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
p.on('crash', () => errs.push('CRASH: el proceso de la página se ha caído'));
const cdp = await ctx.newCDPSession(p);
const bcdp = await b.newBrowserCDPSession();

// (el proceso de la página y el de la GPU, por su tipo)
async function procs() {
  const { processInfo } = await bcdp.send('SystemInfo.getProcessInfo');
  return processInfo.filter((q) => q.type === 'renderer' || q.type === 'GPU');
}
function status(pid) {
  try {
    const s = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
    const kb = (k) => +(s.match(new RegExp(k + ':\\s+(\\d+)')) || [0, 0])[1];
    return { rss: Math.round(kb('VmRSS') / 1024), pico: Math.round(kb('VmHWM') / 1024) };
  } catch (e) {
    return null;
  }
}
const t0 = Date.now();
const rows = [];
let marca = 'carga';
async function muestra() {
  const ps = await procs();
  const r = { t: +((Date.now() - t0) / 1000).toFixed(0), marca };
  for (const q of ps) {
    const s = status(q.id);
    if (!s) continue;
    const k = q.type === 'GPU' ? 'gpu' : 'pag';
    // (con varias páginas de proceso, la mayor: la del juego)
    if (!r[k] || s.rss > r[k].rss) r[k] = s;
  }
  // (preguntar a la página cada segundo deja basura de las propias consultas
  // y falsea la medida: el montón, sólo con HEAP=1)
  if (process.env.HEAP) r.heap = await p.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null)).catch(() => null);
  rows.push(r);
  return r;
}
const tick = setInterval(() => muestra().catch(() => {}), 1000);
const dev = !!process.env.DEV;
await p.goto(URL + (dev ? '?dev=1' : ''));
await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
marca = dev ? 'jugando' : 'título';
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
const tapA = async () => {
  const pt = await p.evaluate(() => { const o = __game.tactil.btns.find((q) => q.lay === 'menu' && q.d.i === 0); const r = o.el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await touch('touchStart', [pt]);
  await touch('touchEnd', []);
  return pt;
};
if (!dev) {
  await p.waitForTimeout(8000);
  // «Toca la pantalla», «Nueva partida»
  await touch('touchStart', [{ x: 422, y: 120 }]);
  await touch('touchEnd', []);
  await p.waitForTimeout(1500);
  await tapA();
  marca = 'introducción';
  await p.waitForTimeout(6000);
  // saltarla: mantener A
  const pt = await p.evaluate(() => { const o = __game.tactil.btns.find((q) => q.lay === 'menu' && q.d.i === 0); const r = o.el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await touch('touchStart', [pt]);
  await p.waitForFunction(() => __game.state !== 'intro', null, { timeout: 120000 }).catch(() => {});
  await touch('touchEnd', []);
  marca = 'editor';
  await p.waitForFunction(() => __game.state === 'creador', null, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(4000);
  // «Despertar» dos veces (arriba, A, A)
  const up = await p.evaluate(() => { const o = __game.tactil.btns.find((q) => q.lay === 'menu' && q.d.i === 12); const r = o.el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await touch('touchStart', [up]);
  await touch('touchEnd', []);
  await p.waitForTimeout(800);
  await tapA();
  await p.waitForTimeout(800);
  await tapA();
  await p.waitForFunction(() => __game.state === 'play', null, { timeout: 120000 }).catch(() => {});
  marca = 'jugando';
}
// unos segundos de juego, con el stick hacia delante a ratos
for (let s = 0; s < SEG; s += 3) {
  await touch('touchStart', [{ x: 140, y: 290 }]);
  await touch('touchMove', [{ x: 140, y: 250 }]);
  await p.waitForTimeout(1500);
  await touch('touchEnd', []);
  await p.waitForTimeout(1500);
}
clearInterval(tick);
await muestra().catch(() => {});
// (¿basura que el recolector no había recogido, o memoria que se queda?)
marca = 'tras gc';
await p.evaluate(() => window.gc && window.gc()).catch(() => {});
await p.waitForTimeout(2000);
await muestra().catch(() => {});
const info = await p.evaluate(() => ({ state: __game.state, jugado: Math.round(__game.playTime || 0), colosos: Object.keys(__game.colossi.data), audio: !!__game.audio.ok, horneados: __game.audio.bakeProgress ? __game.audio.bakeProgress().join('/') : '-' })).catch((e) => ({ err: e.message }));
console.log('t(s)  marca          página MB (pico)   GPU MB (pico)   montón JS MB');
for (const r of rows) console.log(String(r.t).padStart(4), (r.marca || '').padEnd(14), r.pag ? `${String(r.pag.rss).padStart(6)} (${r.pag.pico})`.padEnd(18) : '-'.padEnd(18), r.gpu ? `${String(r.gpu.rss).padStart(6)} (${r.gpu.pico})`.padEnd(15) : '-'.padEnd(15), String(r.heap ?? '-').padStart(6));
const last = rows[rows.length - 1];
console.log(`\npico de la página: ${Math.max(...rows.map((r) => (r.pag ? r.pag.pico : 0)))} MB · pico de la GPU: ${Math.max(...rows.map((r) => (r.gpu ? r.gpu.pico : 0)))} MB · al final: ${JSON.stringify(info)}`);
if (errs.length) console.log(errs.join('\n'));
await b.close();
