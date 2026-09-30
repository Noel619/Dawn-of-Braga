// Fotogramas de la cinemática de la bodega en los segundos indicados.
//   node tools/cine.mjs prefijo t1,t2,...
import { chromium } from 'playwright';
const [prefix, times] = process.argv.slice(2);
const T = times.split(',').map(Number);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.W || 800), height: +(process.env.H || 450) } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 5).join(' | ')));
await p.goto('http://localhost:5199/?dev=1&at=59.5,0,-24.5&yaw=180');
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  g.ui.closeAll();
  g.input.enabledPointerLock = false;
  g.input.onPointerLockLost = null;
  const d = g.interact.list.find((i) => i.id === 'd_sotano');
  g.interact.setOpen(d, true);
  g.flags['door:d_sotano'] = true;
  g.player.spawn(59.5, 0, -25.4, Math.PI);
  for (let i = 0; i < 10; i++) g.update(1 / 30);
  g.startCutscene();
});
let t = 0, n = 0;
for (const target of T) {
  const r = await p.evaluate((dt) => {
    const g = __game;
    const steps = Math.round(dt * 30);
    for (let i = 0; i < steps; i++) g.update(1 / 30);
    g.render();
    const e = g.bosses.descoyuntado;
    return { t: g.cutscene ? +g.cutscene.t.toFixed(2) : 'end', ppos: g.player.pos.toArray().map((v) => +v.toFixed(2)), ps: g.player.state, boss: e.pos.toArray().map((v) => +v.toFixed(2)), vis: e.obj.visible, mode: e.D.mode, hunt: g.hunt.active };
  }, target - t);
  t = target;
  await p.screenshot({ path: `tools/shots/${prefix}${n++}.png` });
  console.log(JSON.stringify(r));
}
console.log(logs.slice(0, 10).join('\n'));
await b.close();
