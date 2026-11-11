// La pérdida del contexto de WebGL (WEBGL_lose_context), en el teléfono y en
// el ordenador. En el teléfono (sin la copia de la geometría): se guarda como
// al salir al título desde la pausa, si se podría (jugando sin menú o con la
// pausa abierta; con el inventario abierto, no) y, al devolverlo, se recarga
// y arranca. En el ordenador: no se guarda ni se recarga; three.js lo rehace
// y se sigue dibujando.
//   node tools/contexto.mjs   (requiere npx vite --port 5199; URL=... otra versión)
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:5199/';
const KEY = 'dawnOfBraga.save.v1';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0;
const check = (name, ok, info) => {
  if (!ok) fails++;
  console.log((ok ? 'OK   ' : 'MAL  ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : ''));
};

async function abrir(movil) {
  const ctx = await b.newContext(movil ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } : { viewport: { width: 844, height: 390 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?dev=1');
  await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
  await p.waitForTimeout(1500);
  return { ctx, p, errs };
}
// pone una marca en las banderas (sin guardar), pierde el contexto y dice si
// lo guardado lleva la marca
async function perder(p, marca, antes) {
  return p.evaluate(
    async ([marca, antes, KEY]) => {
      const g = __game;
      if (antes === 'inv') g.openOverlay('inv');
      if (antes === 'pausa') g.openPause();
      g.flags.__ctx = marca;
      const st = g.state,
        top = g.ui.stack.map((s) => s.name);
      const ext = g.renderer.getContext().getExtension('WEBGL_lose_context');
      window.__ext = ext;
      ext.loseContext();
      await new Promise((r) => setTimeout(r, 300));
      let sv = null;
      try {
        sv = JSON.parse(localStorage.getItem(KEY));
      } catch (e) {}
      return { state: st, ui: top, perdido: g.renderer.getContext().isContextLost(), guardado: !!(sv && sv.flags && sv.flags.__ctx === marca) };
    },
    [marca, antes, KEY]
  );
}

// --- el teléfono
{
  const { ctx, p, errs } = await abrir(true);
  const soltada = await p.evaluate(() => __game.level.meshes.filter((m) => !m.geometry.attributes.uv.array).length);
  check('teléfono: la geometría del mundo, sin copia en la página', soltada > 1000, { mallas: soltada });
  // con el inventario abierto: no se guarda
  const a = await perder(p, 'A', 'inv');
  check('teléfono, con el inventario abierto: no se guarda', a.perdido && !a.guardado, a);
  // al devolverlo: se recarga y arranca
  await p.evaluate(() => (window.__antes = 1));
  await Promise.all([p.waitForEvent('load', { timeout: 120000 }), p.evaluate(() => window.__ext.restoreContext())]);
  await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
  const r = await p.evaluate(() => ({ recargada: !window.__antes, nav: performance.getEntriesByType('navigation')[0].type, state: __game.state, perdido: __game.renderer.getContext().isContextLost() }));
  check('teléfono: al devolver el contexto, se recarga y arranca', r.recargada && r.nav === 'reload' && !r.perdido, r);
  await p.waitForTimeout(1500);
  // jugando, sin menú: se guarda
  const bb = await perder(p, 'B', null);
  check('teléfono, jugando: se guarda', bb.perdido && bb.guardado && bb.state === 'play', bb);
  await Promise.all([p.waitForEvent('load', { timeout: 120000 }), p.evaluate(() => window.__ext.restoreContext())]);
  await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
  await p.waitForTimeout(1500);
  // con la pausa abierta: se guarda
  const c = await perder(p, 'C', 'pausa');
  check('teléfono, en la pausa: se guarda', c.perdido && c.guardado && c.state === 'paused', c);
  check('teléfono: sin errores en la página', !errs.length, errs.slice(0, 3));
  await ctx.close();
}

// --- el ordenador
{
  const { ctx, p, errs } = await abrir(false);
  // brillo medio de la captura (sin la interfaz)
  const brillo = async () => {
    await p.evaluate(() => document.querySelectorAll('body > *:not(canvas)').forEach((e) => (e.style.visibility = 'hidden')));
    await p.waitForTimeout(1200);
    const png = await p.screenshot();
    return p.evaluate(async (b64) => {
      const im = new Image();
      im.src = 'data:image/png;base64,' + b64;
      await im.decode();
      const c = document.createElement('canvas');
      c.width = im.width;
      c.height = im.height;
      const x = c.getContext('2d');
      x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      let s = 0;
      for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2];
      return +(s / (d.length / 4) / 3).toFixed(1);
    }, png.toString('base64'));
  };
  const soltada = await p.evaluate(() => __game.level.meshes.filter((m) => !m.geometry.attributes.uv.array).length);
  check('ordenador: la geometría, con su copia', soltada === 0, { mallas: soltada });
  const b0 = await brillo();
  const d = await perder(p, 'D', null);
  check('ordenador, jugando: no se guarda', d.perdido && !d.guardado, d);
  await p.evaluate(() => (window.__antes = 1));
  await p.evaluate(() => window.__ext.restoreContext());
  await p.waitForTimeout(3000);
  const r = await p.evaluate(() => ({ mismaPagina: !!window.__antes, perdido: __game.renderer.getContext().isContextLost(), state: __game.state }));
  check('ordenador: no se recarga y el contexto vuelve', r.mismaPagina && !r.perdido, r);
  const b1 = await brillo();
  check('ordenador: tras devolverlo, se dibuja la misma escena', b0 > 3 && Math.abs(b1 - b0) <= 0.15 * b0 + 1, { antes: b0, despues: b1 });
  check('ordenador: sin errores en la página', !errs.length, errs.slice(0, 3));
  await ctx.close();
}
await b.close();
console.log(fails ? `${fails} MAL` : 'todo bien');
process.exit(fails ? 1 : 0);
