// La película del jefe final, jugada por un robot (las pulsaciones, solas:
// dev.autoQTE; las espringalas se cargan, apuntan y disparan solas; el tramo
// hasta la torre del acto 6 se anda solo). Desde cada punto de control, o
// desde el principio:
//   node tools/finale.mjs [rito|establo|torreSur|cabalgada|muralla|todos] [ok|fail]
// (fail: todas las pulsaciones falladas: se pierde vida pero se sigue)
// Comprueba que se pasa por los puntos de control en orden, que nadie muere,
// que acaba en el río (la escena del final) con las banderas del jefe y que
// no hay errores en la página. Requiere npx vite --port 5199.
import { chromium } from 'playwright';

const [from = 'todos', mode = 'ok'] = process.argv.slice(2);
const ORDER = ['rito', 'establo', 'torreSur', 'muralla'];
const starts = from === 'todos' ? ['rito', 'establo', 'torreSur', 'cabalgada', 'muralla'] : [from];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0;
for (const cp of starts) {
  const p = await b.newPage({ viewport: { width: 480, height: 270 } });
  const logs = [];
  p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  p.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('404')) logs.push('console.error: ' + m.text());
  });
  await p.goto('http://localhost:5199/?dev=1&at=0,-10,-144&yaw=180');
  await p.waitForFunction(() => window.__ready && __game.spring.idol, null, { timeout: 120000 });
  const r = await p.evaluate(
    async ([cp, mode]) => {
      window.__pause = true;
      const g = __game;
      g.ui.closeAll();
      g.input.enabledPointerLock = false;
      g.input.onPointerLockLost = null;
      await g.colossi.model('turiferario');
      g.dev.autoQTE = mode === 'fail' ? 'fail' : true;
      await g.finale.debugFilm(cp);
      const cps = [];
      let t = 0,
        minHp = g.player.hp;
      for (; t < 420; t += 1 / 30) {
        g.update(1 / 30);
        const c = g.flags['film:cp'];
        if (c && !cps.includes(c)) cps.push(c);
        minHp = Math.min(minHp, g.player.hp);
        if (g.state === 'ending' || g.player.dead) break;
      }
      return { t: Math.round(t), cps, state: g.state, dead: g.player.dead, minHp: Math.round(minHp), stage: g.finale.stage, turiferario: !!g.flags['boss:turiferario'], turibulario: !!g.flags['boss:turibulario'], exit: !!g.flags['door:d_salida'] };
    },
    [cp, mode]
  );
  // los puntos de control, en orden (desde el de salida)
  const want = ORDER.slice(Math.max(0, ORDER.indexOf(cp === 'cabalgada' ? 'muralla' : cp)));
  const seen = r.cps.filter((c) => ORDER.includes(c));
  const inOrder = want.every((c, i) => seen[i] === c);
  const ok = !r.dead && r.state === 'ending' && r.turiferario && r.turibulario && inOrder && !logs.length;
  if (!ok) fails++;
  console.log((ok ? 'OK   ' : 'MAL  ') + cp.padEnd(10), JSON.stringify(r));
  if (logs.length) console.log('  ' + logs.slice(0, 8).join('\n  '));
  await p.close();
}
await b.close();
process.exit(fails ? 1 : 0);
