// Capturas de los colosos (propuestas de jefe final) en la ciudad.
//   node tools/colshot.mjs <spec.json>
// spec: { w, h, res, at: "x,y,z", setup: "js (async) que prepara la escena",
//         shots: [{ name, cam: [cx,cy,cz], look: [tx,ty,tz], fov, js }] }
// El js de setup recibe window.__game; puede importar módulos del servidor de
// desarrollo (await import('/src/...')). Requiere npx vite --port 5199.
import { chromium } from 'playwright';
import fs from 'node:fs';

const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const W = spec.w || 960,
  H = spec.h || 540;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
const logs = [];
p.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning' || m.text().startsWith('[col]')) logs.push(m.type() + ': ' + m.text());
});
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 5).join(' | ')));
await p.goto('http://localhost:5199/?dev=1&at=' + (spec.at || '2,0,-46') + '&yaw=' + (spec.yaw ?? 180));
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
await p.evaluate(
  ([res]) => {
    window.__pause = true;
    const g = __game;
    g.ui.closeAll();
    g.ui.showHud(false);
    g.input.enabledPointerLock = false;
    g.input.onPointerLockLost = null;
    g.enemies.forEach((e) => {
      e.obj.visible = false;
      if (e.shadow) e.shadow.visible = false;
      e.dead = true;
      e.state = 'dead';
    });
    if (res) {
      g.settings.res = res;
      g.post.setSize(window.innerWidth, window.innerHeight, res);
    }
  },
  [spec.res || 0]
);
if (spec.setup) {
  const r = await p.evaluate(`(async () => { const g = window.__game; ${spec.setup} })()`);
  if (r !== undefined) console.log('setup:', JSON.stringify(r));
}
const outDir = spec.out || 'tools/shots';
fs.mkdirSync(outDir, { recursive: true });
for (const s of spec.shots) {
  const t0 = Date.now();
  const r = await p.evaluate(
    async ([s]) => {
      const g = window.__game,
        T = g.THREE;
      const cam = g.camera;
      if (s.pre) await eval(`(async () => { ${s.pre} })()`);
      const steps = s.steps ?? 2;
      for (let k = 0; k < steps; k++) {
        if (window.__colTick) window.__colTick(1 / 30, k);
        g.update(1 / 30);
      }
      if (s.fov) cam.fov = s.fov;
      cam.position.set(...s.cam);
      cam.lookAt(...s.look);
      if (s.roll) cam.rotateZ(s.roll);
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      if (window.__colBeforeRender) window.__colBeforeRender(s);
      let out;
      if (s.js) out = await eval(`(async () => { ${s.js} })()`);
      if (window.__colRender) window.__colRender(s);
      else g.render();
      return out;
    },
    [s]
  );
  await p.screenshot({ path: `${outDir}/${s.name}.png` });
  console.log(s.name, Date.now() - t0 + 'ms', r !== undefined ? JSON.stringify(r) : '');
}
if (logs.length) console.log(logs.slice(0, 30).join('\n'));
await b.close();
