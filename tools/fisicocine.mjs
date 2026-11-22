// Fotogramas de las escenas del Físico (game/fisico_cine.js) en el barrio de
// ahora: la cortina (al entrar en la rúa), la camilla (te ha dormido: la rúa,
// su puerta y la sala grande) y su muerte (sentado en el canto de su mesa).
//   node tools/fisicocine.mjs [cortina|camilla|muerte] t1,t2,...
//   -> tools/shots/fcine_<escena>_<i>.png y una hoja, fcine_<escena>_hoja.png
//   (requiere npx vite --port 5199)
import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
const [escena = 'cortina', times = '1,3,4.5,5.6,7'] = process.argv.slice(2);
const T = times.split(',').map(Number);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.W || 800), height: +(process.env.H || 450) } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 5).join(' | ')));
await p.goto('http://localhost:' + (process.env.PORT || 5199) + '/?dev=1&items=espada,escudo');
await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
const info = await p.evaluate((escena) => {
  window.__pause = true;
  const g = __game;
  g.ui.closeAll();
  g.input.enabledPointerLock = false;
  g.input.onPointerLockLost = null;
  g.state = 'play';
  g.enemies.forEach((e) => { if (!e.boss && !/coronado/.test(e.id || '')) { e.dead = true; e.state = 'dead'; e.obj.visible = false; } });
  const F = g.fisico;
  const sim = (s) => { for (let t = 0; t < s; t += 1 / 30) g.update(1 / 30); };
  if (escena === 'cortina') {
    g.flags['door:d_porton'] = true;
    const d = g.interact.list.find((i) => i.id === 'd_porton');
    if (d) g.interact.setOpen(d, true);
    g.player.spawn(15.0, 0, 44.5, Math.PI / 2);
    sim(0.1);
    g.player.spawn(16.0, 0, 44.5, Math.PI / 2);
    sim(0.1);
  } else if (escena === 'camilla') {
    for (const k of ['door:d_porton', 'fisico:intro', 'fisico:calleja', 'fisico:viuda', 'fisico:caza']) g.flags[k] = true;
    g.player.spawn(28, 0, 44.5, Math.PI / 2);
    sim(0.2);
    F.captura();
  } else if (escena === 'muerte') {
    for (const k of ['door:d_porton', 'fisico:intro', 'fisico:calleja', 'fisico:viuda', 'fisico:caza']) g.flags[k] = true;
    g.player.spawn(59.0, 0, 45.0, Math.PI / 2);
    sim(0.3);
    g.dev.god = true;
    sim(3.5);
    const e = F.e;
    e.hp = 1;
    e.die();
  }
  return { cut: !!g.cutscene, modo: F.modo };
}, escena);
let t = 0;
let i = 0;
for (const tt of T) {
  await p.evaluate((dt) => {
    const g = __game;
    for (let k = 0; k < Math.round(dt * 30); k++) g.update(1 / 30);
    g.render();
  }, tt - t);
  t = tt;
  await p.screenshot({ path: `tools/shots/fcine_${escena}_${i++}.png` });
}
console.log(JSON.stringify(info));
try {
  execFileSync('python3', ['tools/grid.py', `fcine_${escena}_`, String(T.length), String(Math.min(3, T.length))]);
  console.log(`tools/shots/fcine_${escena}__grid.png`);
} catch (e) {
  console.log('(sin hoja)', e.message);
}
if (logs.length) console.log(logs.join('\n'));
await b.close();
