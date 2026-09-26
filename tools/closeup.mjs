// Primer plano de una criatura: node tools/closeup.mjs prefix type state(dormant|chase) [idle]
import { chromium } from 'playwright';
const [prefix, type, st = 'chase', idle = 'stand', at = '0,0,8'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5199/?dev=1&at=' + at + '&yaw=180');
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
await p.waitForTimeout(800);
await p.evaluate(() => (window.__pause = true));
for (let k = 0; k < 4; k++) {
  await p.evaluate(([type, st, idle, k]) => {
    const g = __game;
    if (k === 0) {
      g.enemies.forEach((e) => { if (!e.boss) { e.dead = true; e.state = 'dead'; e.stT = 99; e.obj.visible = false; } });
      const e = g.enemies.find((x) => x.type === type);
      const P = g.player.pos;
      e.spec = { ...e.spec, x: P.x, y: P.y, z: P.z - 3.5, yaw: Math.PI * 0.15, idle };
      e.home = { x: P.x, y: P.y, z: P.z - 3.5, yaw: 0 };
      e.reset();
      if (st !== 'dormant') { e.state = st; e.aware = true; }
      g.player.obj.visible = false;
      g.player.body.pos.x += 30;
      window.__E = e;
    }
    const e = window.__E;
    e.update(0.4, g.player);
    if (st !== 'dormant') { e.state = 'chase'; e.vx = Math.sin(e.yaw) * e.T.walk; e.vz = Math.cos(e.yaw) * e.T.walk; e.pos.x -= e.vx * 0.4; e.pos.z -= e.vz * 0.4; }
    const P = e.pos;
    const ang = 0.5 + k * 0.7;
    g.camRig.override = { pos: new g.THREE.Vector3(P.x + Math.sin(ang) * 3.4 * (e.T.height / 1.8 + 0.3), P.y + e.T.height * 0.75, P.z + Math.cos(ang) * 3.4 * (e.T.height / 1.8 + 0.3)), look: new g.THREE.Vector3(P.x, P.y + e.T.height * 0.5, P.z), speed: 100 };
    g.camRig.update(0.1, g.input, g.player, null, g.world.col, false);
    g.atmo.update(0.1, g.player);
    g.render();
  }, [type, st, idle, k]);
  await p.screenshot({ path: `tools/shots/${prefix}${k}.png` });
}
console.log(logs.join('\n'));
await b.close();
