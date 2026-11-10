// Vistas de juego (con el jugador, su farol y la cámara de siempre):
//   node tools/vista.mjs prefijo "x,y,z,yaw[,pitch[,dist]]" ...
// Pone al jugador en (x, y, z) mirando a yaw, deja la cámara detrás (con su
// inclinación y distancia), deja correr medio segundo y hace la foto en
// tools/shots/<prefijo><i>.png. (ENEMIGOS=1: con las criaturas; si no, sin
// ellas.) (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const [prefix, ...views] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.W || 640), height: +(process.env.H || 360) } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
p.on('console', (m) => { if (m.type() === 'error') logs.push('console: ' + m.text()); });
await p.goto('http://localhost:' + (process.env.PORT || 5199) + '/?dev=1&items=espada,escudo');
await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
await p.evaluate((enemigos) => {
  window.__pause = true;
  const g = __game;
  g.input.enabledPointerLock = false;
  g.ui.closeAll();
  g.state = 'play';
  g.dev.god = true;
  if (!enemigos) g.enemies.forEach((e) => { if (!e.boss) { e.dead = true; e.state = 'dead'; e.stT = 99; } e.obj.visible = false; e.shadow && (e.shadow.visible = false); });
}, !!process.env.ENEMIGOS);
let i = 0;
for (const v of views) {
  const [x, y, z, yaw, pitch = 0.3, dist] = v.split(',').map(Number);
  const r = await p.evaluate(([x, y, z, yaw, pitch, dist, extra]) => {
    const g = __game;
    g.player.spawn(x, y, z, yaw);
    g.camRig.snapTo(g.player);
    g.camRig.yaw = yaw;
    g.camRig.pitch = pitch;
    if (dist) g.camRig.dist = dist;
    if (extra) eval(extra);
    for (let k = 0; k < 20; k++) { g.camRig.yaw = yaw; g.camRig.pitch = pitch; g.update(1 / 30); }
    g.renderer.info.autoReset = false;
    g.renderer.info.reset();
    g.render();
    const inf = g.renderer.info.render;
    g.renderer.info.autoReset = true;
    const P = g.player.pos;
    return { pos: [P.x, P.y, P.z].map((v) => +v.toFixed(2)), zona: g.zone && g.zone.id, estado: g.player.state, llamadas: inf.calls, tri: inf.triangles };
  }, [x, y, z, yaw, pitch, dist || 0, process.env.EXTRA || '']);
  await p.screenshot({ path: `tools/shots/${prefix}${i++}.png` });
  console.log(prefix + (i - 1), JSON.stringify(r));
}
if (logs.length) console.log(logs.join('\n'));
await b.close();
