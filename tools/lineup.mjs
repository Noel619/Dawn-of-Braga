// Muestra criaturas persiguiendo/atacando: node tools/lineup.mjs prefix type1,type2 x,y,z
import { chromium } from 'playwright';
const [prefix, types, at] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5199/?dev=1&at=' + at + '&yaw=180');
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
await p.waitForTimeout(1000);
await p.evaluate(() => (window.__pause = true));
let n = 0;
for (const t of types.split(',')) {
  const r = await p.evaluate((t) => {
    const g = __game;
    g.enemies.forEach((e) => { if (!e.boss) { e.dead = true; e.state = 'dead'; e.stT = 99; e.obj.visible = false; } });
    const e = g.enemies.find((x) => x.type === t);
    const P = g.player.pos;
    e.spec = { ...e.spec, x: P.x, y: P.y + (t === 'crawler' ? 0 : 0), z: P.z - 5.5, yaw: 0, idle: 'stand' };
    e.home = { x: P.x, y: P.y, z: P.z - 5.5, yaw: 0 };
    e.reset();
    e.state = 'chase';
    e.aware = true;
    e.cooldown = 0;
    g.player.yaw = Math.PI;
    g.camRig.snapTo(g.player);
    g.camRig.yaw = Math.PI;
    g.player.hp = 9999;
    g.player.maxHp = 9999;
    return __sim(0.5);
  }, t);
  for (let k = 0; k < 3; k++) {
    await p.evaluate(() => {
      const g = __game, P = g.player.pos, e = g.enemies.find((x) => !x.dead && !x.boss) || g.player;
      const mx = (P.x + e.pos.x) / 2, mz = (P.z + e.pos.z) / 2;
      __sim(0.45);
      g.camRig.override = { pos: new g.THREE.Vector3(mx + 4.5, P.y + 1.8, mz + 1.5), look: new g.THREE.Vector3(mx, P.y + 1.0, mz), speed: 100 };
      g.camRig.update(0.1, g.input, g.player, null, g.world.col, false);
      g.render();
    });
    await p.screenshot({ path: `tools/shots/${prefix}${n++}.png` });
  }
}
console.log(logs.join('\n'));
await b.close();
