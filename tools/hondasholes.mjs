// Suelo sin dibujar en las cloacas hondas y el Sumidero (world/cloacas_hondas.js,
// world/sumidero.js): en cada celda de medio metro que se pisa de las
// rejillas H1, H2, H3, H4 y H5 (a la altura de su nivel; en H5, en la repisa,
// la senda y la playa), ¿hay una cara de suelo dibujada donde la colisión
// sostiene al jugador (a 35 cm como mucho)? Y lo que cuelga: ¿hay algo que
// flote sobre el agua de un canal (una cara de suelo dibujada a la altura
// del andén, sin colisión debajo)?
//   node tools/hondasholes.mjs      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 200 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:' + (process.env.PORT || 5199) + '/?dev=1');
await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
const r = await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  const T = g.THREE;
  const rc = new T.Raycaster();
  // (lo del subsuelo está en la capa 1: game/culling.js)
  rc.layers.enableAll();
  const meshes = g.level.meshes.filter((m) => !/water|glass|black|ember|musgoGlow|hongo|flor|hoja|hierba/.test((m.userData.bucket || '').split('|')[0].split('#').pop()));
  const down = new T.Vector3(0, -1, 0);
  const o = new T.Vector3();
  const col = g.world.col;
  for (const it of g.interact.list) if ((it.kind === 'door' || it.kind === 'fog') && it.box) it.box.enabled = false;
  const ray = (x, gy, z) => {
    o.set(x, gy + 0.6, z);
    rc.set(o, down);
    rc.far = 2.2;
    return rc.intersectObjects(meshes, false)[0];
  };
  const seen = (x, gy, z) => {
    for (const [dx, dz] of [
      [0, 0],
      [0.06, 0],
      [-0.06, 0],
      [0, 0.06],
      [0, -0.06],
    ]) {
      const h = ray(x + dx, gy, z + dz);
      if (h && h.point.y > gy - 0.35) return true;
    }
    return false;
  };
  const L = g.level;
  const levels = { H1: [-17], H2: [-23], H3: [-29, -29.4], H4: [-35], H5: [-23, -27.75] };
  const holes = [];
  let n = 0;
  for (const [k, ys] of Object.entries(levels)) {
    const w = L[k];
    if (!w) continue;
    for (let j = 0; j < w.h; j++)
      for (let i = 0; i < w.w; i++) {
        if (w.cells[j * w.w + i] !== 1) continue;
        const x = w.x0 + (i + 0.5) * w.res,
          z = w.z0 + (j + 0.5) * w.res;
        for (const y0 of ys) {
          // (el suelo de la colisión cerca de esa altura)
          const gy = col.groundHeight(x, z, 0.05, y0 + 0.6);
          if (gy < y0 - 1.3 || gy > y0 + 0.6) continue;
          // (lo que es agua honda, del Sumidero, no se pisa; ni lo que hay
          // debajo de la senda, maciza)
          if (k === 'H5' && gy < -28.0) continue;
          if (k === 'H5' && col.groundHeight(x, z, 0.05, gy + 6) > gy + 0.3) continue;
          n++;
          if (!seen(x, gy, z)) holes.push([k, +x.toFixed(2), +gy.toFixed(2), +z.toFixed(2)]);
        }
      }
  }
  // agrupar (1,5 m)
  const gr = [];
  for (const h of holes) {
    let q = gr.find((c) => c.k === h[0] && Math.hypot(c.x - h[1], c.z - h[3]) < 1.5 && Math.abs(c.y - h[2]) < 0.5);
    if (!q) gr.push((q = { k: h[0], x: h[1], y: h[2], z: h[3], n: 0 }));
    q.n++;
  }
  gr.sort((a, b) => b.n - a.n);
  return { celdas: n, agujeros: holes.length, grupos: gr.slice(0, 60).map((q) => `${q.k} ${String(q.n).padStart(4)}  (${q.x}, ${q.y}, ${q.z})`) };
});
console.log(`celdas: ${r.celdas}  sin suelo: ${r.agujeros}`);
for (const l of r.grupos) console.log('  ' + l);
if (logs.length) console.log(logs.join('\n'));
await b.close();
