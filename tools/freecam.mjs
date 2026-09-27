// Capturas con cámara libre: node tools/freecam.mjs prefijo "cx,cy,cz,tx,ty,tz" ...
// (sin jugador ni criaturas; requiere npx vite --port 5199)
import { chromium } from 'playwright';
const [prefix, ...views] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.W || 960), height: +(process.env.H || 540) } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5199/?dev=1');
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
await p.evaluate((clear) => {
  window.__pause = true;
  const g = __game;
  g.ui.closeAll();
  g.ui.showHud(false);
  g.enemies.forEach((e) => { e.obj.visible = false; e.shadow.visible = false; });
  g.player.obj.visible = false;
  g.playerShadow.visible = false;
  // la fauna no se asusta del jugador invisible que acompaña a la cámara
  if (g.fauna) {
    const up = g.fauna.update.bind(g.fauna);
    g.fauna.update = (dt, pl, t) => up(dt, null, t);
    g.fauna.reset();
  }
  if (clear) { g.scene.fog.density = 0.012; g.atmo.update = () => {}; g.post.U.uVol.value = 0; }
}, !!process.env.CLEAR);
let i = 0;
for (const v of views) {
  const [cx, cy, cz, tx, ty, tz] = v.split(',').map(Number);
  await p.evaluate(([cx, cy, cz, tx, ty, tz]) => {
    const g = __game, T = g.THREE;
    g.player.body.pos.set(cx, cy - 1.5, cz);
    g.camera.position.set(cx, cy, cz);
    g.camera.lookAt(tx, ty, tz);
    g.camera.updateMatrixWorld();
    g.camRig.override = { pos: new T.Vector3(cx, cy, cz), look: new T.Vector3(tx, ty, tz), speed: 1000 };
    for (let k = 0; k < 3; k++) g.update(1 / 30);
    g.camera.position.set(cx, cy, cz);
    g.camera.lookAt(tx, ty, tz);
    g.render();
  }, [cx, cy, cz, tx, ty, tz]);
  await p.screenshot({ path: `tools/shots/${prefix}${i++}.png` });
}
console.log(logs.join('\n'));
await b.close();
