// Capturas del Descoyuntado en distintos estados (requiere npx vite --port 5199).
//   node tools/boss.mjs prefijo "js que prepara la escena" "cx,cy,cz,tx,ty,tz" pasos
import { chromium } from 'playwright';
const [prefix, setup, view, steps = '60', every = '20'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.W || 800), height: +(process.env.H || 450) } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
await p.goto('http://localhost:5199/?dev=1&at=59.5,-6.6,-38&yaw=180');
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
await p.evaluate(() => { window.__pause = true; const g = __game; g.ui.closeAll(); g.ui.showHud(false); g.input.enabledPointerLock = false; g.input.onPointerLockLost = null; });
const info = await p.evaluate(setup);
console.log('setup', JSON.stringify(info));
const [cx, cy, cz, tx, ty, tz] = view ? view.split(',').map(Number) : [];
let n = 0;
for (let i = 0; i < +steps; i++) {
  const r = await p.evaluate(([cx, cy, cz, tx, ty, tz, shot]) => {
    const g = __game, T = g.THREE;
    if (window.__hook) window.__hook();
    g.update(1 / 30);
    if (cx !== undefined && !isNaN(cx)) {
      g.camera.position.set(cx, cy, cz);
      g.camera.lookAt(tx, ty, tz);
      g.camera.updateMatrixWorld();
    }
    if (shot) g.render();
    const e = g.bosses.descoyuntado;
    return { mode: e.D.mode, plane: e.D.plane, pos: e.pos.toArray().map((v) => +v.toFixed(2)), hp: Math.round(g.player.hp), ps: g.player.state, seen: e.D.seen, hunger: +e.D.hunger.toFixed(2), vis: e.obj.visible };
  }, [cx, cy, cz, tx, ty, tz, i % +every === +every - 1]);
  if (i % +every === +every - 1) {
    await p.screenshot({ path: `tools/shots/${prefix}${n++}.png` });
    console.log(i, JSON.stringify(r));
  }
}
console.log(logs.slice(0, 10).join('\n'));
await b.close();
