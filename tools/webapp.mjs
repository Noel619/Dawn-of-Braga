// La web instalable: sobre la versión compilada (docs/, servida en
// http://localhost:5197, p. ej. con `cd docs && python3 -m http.server 5197`),
// que el manifiesto y los iconos se sirvan y el navegador la dé por instalable
// (sin errores de instalabilidad de Chrome), que el service worker se
// registre y quede al mando, y que, sin red, el juego vuelva a abrirse y
// arranque.
//   node tools/webapp.mjs
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:5197/';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
const fails = [];
const ok = (c, m, x) => {
  console.log((c ? 'OK   ' : 'MAL  ') + m + (x !== undefined ? '  ' + JSON.stringify(x) : ''));
  if (!c) fails.push(m);
};
await p.goto(URL);
await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
// el manifiesto y sus iconos
const man = await p.evaluate(async () => {
  const link = document.querySelector('link[rel=manifest]');
  const r = await fetch(link.href);
  const m = await r.json();
  const icons = [];
  for (const ic of m.icons) {
    const im = new Image();
    im.src = new URL(ic.src, link.href).href;
    await im.decode().catch(() => {});
    icons.push({ src: ic.src, sizes: ic.sizes, w: im.naturalWidth, h: im.naturalHeight, purpose: ic.purpose });
  }
  const apple = document.querySelector('link[rel=apple-touch-icon]');
  const ai = new Image();
  ai.src = apple.href;
  await ai.decode().catch(() => {});
  return { name: m.name, display: m.display, orientation: m.orientation, start: m.start_url, icons, apple: [ai.naturalWidth, ai.naturalHeight] };
});
ok(man.icons.every((i) => i.sizes === `${i.w}x${i.h}`) && man.apple[0] === 180, 'manifiesto e iconos (con su tamaño)', man);
// el service worker, registrado y al mando
const sw = await p.evaluate(async () => {
  const reg = await navigator.serviceWorker.ready;
  for (let i = 0; i < 50 && !navigator.serviceWorker.controller; i++) await new Promise((r) => setTimeout(r, 100));
  return { scope: reg.scope, active: !!reg.active, controller: !!navigator.serviceWorker.controller };
});
ok(sw.active, 'service worker registrado y activo', sw);
// lo que dice Chrome de si se puede instalar
const cdp = await ctx.newCDPSession(p);
const inst = await cdp.send('Page.getInstallabilityErrors').catch((e) => ({ error: e.message }));
ok(inst.installabilityErrors && inst.installabilityErrors.length === 0, 'Chrome la da por instalable', inst);
// sin red: vuelve a abrirse y arranca
await p.reload();
await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
await ctx.setOffline(true);
await p.reload();
const off = await p.waitForFunction(() => window.__ready, null, { timeout: 300000 }).then(() => true).catch(() => false);
ok(off, 'sin red, el juego se abre y arranca');
await ctx.setOffline(false);
ok(!errs.length, 'sin errores en la página', errs.slice(0, 3));
await b.close();
console.log(fails.length ? `\n${fails.length} MAL` : '\ntodo bien');
process.exit(fails.length ? 1 : 0);
