// Recorrido de capturas: node tools/tour.mjs <prefix> "x,y,z,yawDeg[,pitch,camYawDeg]" ...
import { chromium } from 'playwright';
const [prefix, ...spots] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const logs = [];
p.on('console', (m) => { if (m.type() !== 'debug') logs.push(m.type() + ': ' + m.text()); });
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5199/' + (process.env.Q || ''));
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
await p.waitForTimeout(1500);
let i = 0;
for (const s of spots) {
  const [x, y, z, yaw, pitch, camyaw] = s.split(',').map(Number);
  await p.evaluate(([x, y, z, yaw, pitch, camyaw]) => {
    const g = window.__game;
    g.player.spawn(x, y, z, (yaw * Math.PI) / 180);
    g.camRig.snapTo(g.player);
    if (!isNaN(pitch)) g.camRig.pitch = pitch;
    if (!isNaN(camyaw)) g.camRig.yaw = (camyaw * Math.PI) / 180;
    g.atmo.set((g.zoneAt(g.player.pos) || { atmo: 'city' }).atmo, true);
    g.zone = null;
  }, [x, y, z, yaw, pitch, camyaw]);
  await p.waitForTimeout(+(process.env.WAIT || 1800));
  await p.screenshot({ path: `tools/shots/${prefix}${i++}.png` });
}
const fps = await p.evaluate(() => window.__fps);
console.log('fps(swiftshader)', fps);
console.log(logs.slice(0, 30).join('\n'));
await b.close();
