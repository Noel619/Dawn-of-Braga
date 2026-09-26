// Recorrido de capturas: node tools/tour.mjs <prefix> "x,y,z,yawDeg[,pitch,camYawDeg]" ...
import { chromium } from 'playwright';
const [prefix, ...spots] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5199/?dev=1' + (process.env.Q || ''));
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
await p.evaluate(() => { window.__pause = true; const g = __game; g.input.enabledPointerLock = false; g.input.onPointerLockLost = null; g.ui.closeAll(); g.player.maxHp = g.player.hp = 1e6; const t = g.interact.list.find((i) => i.kind === 'trigger'); if (t) t.done = true; });
let i = 0;
for (const s of spots) {
  const [x, y, z, yaw, pitch, camyaw] = s.split(',').map(Number);
  await p.evaluate(([x, y, z, yaw, pitch, camyaw]) => {
    const g = __game;
    g.player.spawn(x, y, z, (yaw * Math.PI) / 180);
    g.camRig.snapTo(g.player);
    if (!isNaN(pitch)) g.camRig.pitch = pitch;
    if (!isNaN(camyaw)) g.camRig.yaw = (camyaw * Math.PI) / 180;
    g.atmo.set((g.zoneAt(g.player.pos) || { atmo: 'city' }).atmo, true);
    g.zone = null;
    __sim(+(window.__simT || 1.2));
    g.camRig.pitch = isNaN(pitch) ? g.camRig.pitch : pitch;
    g.render();
  }, [x, y, z, yaw, pitch, camyaw]);
  await p.screenshot({ path: `tools/shots/${prefix}${i++}.png` });
}
console.log(logs.slice(0, 30).join('\n'));
await b.close();
