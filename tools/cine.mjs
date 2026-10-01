// Fotogramas de la cinemática de la bodega en los segundos indicados.
//   node tools/cine.mjs prefijo t1,t2,...
//   (COLS=n: además, una hoja con todos los fotogramas: tools/shots/<prefijo>_hoja.png)
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
const COLS = +(process.env.COLS || 0);
const TW = 400, TH = 225;
if (COLS)
  await p.evaluate(([n, COLS, TW, TH]) => {
    const c = document.createElement('canvas');
    c.width = TW * COLS;
    c.height = TH * Math.ceil(n / COLS);
    c.id = 'hoja';
    c.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;display:none';
    document.body.appendChild(c);
  }, [T.length, COLS, TW, TH]);
let t = 0, n = 0;
for (const target of T) {
  const r = await p.evaluate((dt) => {
    const g = __game;
    const steps = Math.round(dt * 30);
    for (let i = 0; i < steps; i++) g.update(1 / 30);
    g.render();
    const e = g.bosses.descoyuntado;
    return { t: g.cutscene ? +g.cutscene.t.toFixed(2) : 'end', ppos: g.player.pos.toArray().map((v) => +v.toFixed(2)), ps: g.player.state, boss: e.pos.toArray().map((v) => +v.toFixed(2)), vis: e.obj.visible, mode: e.D.mode, hunt: g.hunt.active, eye: +e.D.eyeK.toFixed(2), halo: e.D._halos ? e.D._halos.map((s) => s.visible && +s.material.opacity.toFixed(2)) : null };
  }, target - t);
  t = target;
  if (COLS)
    await p.evaluate(([k, COLS, TW, TH, label]) => {
      const c = document.getElementById('hoja');
      const cx = c.getContext('2d');
      __game.render();
      cx.drawImage(__game.renderer.domElement, (k % COLS) * TW, Math.floor(k / COLS) * TH, TW, TH);
      cx.fillStyle = '#fff';
      cx.font = '13px monospace';
      cx.fillText(label, (k % COLS) * TW + 5, Math.floor(k / COLS) * TH + 14);
    }, [n, COLS, TW, TH, String(target)]);
  else await p.screenshot({ path: `tools/shots/${prefix}${n}.png` });
  n++;
  console.log(JSON.stringify(r));
}
if (COLS) {
  await p.evaluate(() => (document.getElementById('hoja').style.display = 'block'));
  await p.setViewportSize({ width: TW * COLS, height: TH * Math.ceil(T.length / COLS) });
  await (await p.$('#hoja')).screenshot({ path: `tools/shots/${prefix}_hoja.png` });
}
console.log(logs.slice(0, 10).join('\n'));
await b.close();
