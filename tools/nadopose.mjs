// La brazada de cerca (entities/nado.js): el jugador nadando en el lago del
// Sumidero, visto de lado y desde arriba, en la superficie, bajo el agua y
// flotando quieto, en varios momentos de la brazada. tools/shots/pose_*.png
//   node tools/nadopose.mjs      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 480, height: 300 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
await p.goto('http://localhost:' + (process.env.PORT || 5199) + '/?dev=1&items=espada,escudo');
await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  g.input.enabledPointerLock = false;
  g.ui.closeAll();
  g.state = 'play';
  g.ui.showHud(false);
  g.enemies.forEach((e) => { if (!e.boss) { e.dead = true; e.state = 'dead'; e.stT = 99; } });
  // (más luz, para ver la postura)
  g.atmo.override = { hemi: 6.0, density: 0.01, exposure: 1.8, fog: 0x3a4a50 };
  window.__setup = (y, sub, keys, n) => {
    const pl = g.player;
    pl.spawn(30, y, -48, -Math.PI / 2);
    for (let i = 0; i < 3; i++) g.update(1 / 30);
    if (pl.state !== 'swim') return 'NO NADA ' + pl.state;
    pl.nadoS.sub = sub;
    for (let i = 0; i < n; i++) {
      g.camRig.yaw = -Math.PI / 2;
      g.camRig.pitch = sub ? 0.28 : 0.25;
      for (const k of keys) { g.input.keys.add(k); }
      if (sub) { pl.body.pos.y = y; pl.nadoS.vy = 0; }
      g.update(1 / 30);
    }
    for (const k of keys) g.input.keys.delete(k);
    const T = g.THREE, w = (j) => pl.rig.worldPos(j, new T.Vector3());
    const r = (v) => [v.x - pl.pos.x, v.y - (pl.nadoS.v.y1 ?? 0), v.z - pl.pos.z].map((q) => +q.toFixed(2));
    return pl.state + ' vis ' + pl.obj.visible + ' fase ' + pl.nadoS.fase.toFixed(2) + ' (sobre el agua) cabeza ' + r(w('head')) + ' cadera ' + r(w('hips')) + ' pie ' + r(w('footL')) + ' mano ' + r(w('handL'));
  };
  window.__shot = (dx, dy, dz) => {
    const g = __game, T = g.THREE, P = g.player.pos;
    const c = new T.Vector3(P.x + dx, P.y + 0.95 + dy, P.z + dz);
    const l = new T.Vector3(P.x, P.y + 0.9, P.z);
    g.camRig.override = { pos: c, look: l, speed: 1000, snap: true };
    g.update(1 / 30);
    g.camera.position.copy(c);
    g.camera.lookAt(l);
    g.camera.updateMatrixWorld();
    g.render();
    g.camRig.override = null;
  };
});
let i = 0;
for (const [name, y, sub, keys, n] of [
  ['sup', -29.1, false, ['KeyW'], 40],
  ['sup', -29.1, false, ['KeyW'], 52],
  ['sup', -29.1, false, ['KeyW'], 64],
  ['quieto', -29.1, false, [], 60],
  ['bajo', -34, true, ['KeyW'], 40],
  ['bajo', -34, true, ['KeyW'], 55],
]) {
  const r = await p.evaluate(([y, sub, keys, n]) => __setup(y, sub, keys, n), [y, sub, keys, n]);
  for (const [vn, dx, dy, dz] of [
    ['lado', 0, 0.6, 3.6],
    ['tres', -2.4, 1.4, 2.4],
    ['arriba', -1.2, 3.2, 1.2],
  ]) {
    await p.evaluate(([dx, dy, dz]) => __shot(dx, dy, dz), [dx, dy, dz]);
    await p.screenshot({ path: `tools/shots/pose_${name}${i}_${vn}.png` });
  }
  console.log(name + i, r);
  i++;
}
if (logs.length) console.log(logs.join('\n'));
await b.close();
