// Bodegas del canónigo: carga el nivel, comprueba que la cisterna (el pozo)
// sólo se alcanza por el rastrillo y hace capturas de cada sala.
//   node tools/cellar.mjs [capturas]   (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const shots = process.argv[2] === 'capturas';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 800, height: 450 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
p.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) logs.push('console.error: ' + m.text()); });
await p.goto('http://localhost:5199/?dev=1&at=59.5,-6.6,-38&yaw=180');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
const r = await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  g.ui.closeAll();
  const col = g.world.col;
  const B = g.level.B;
  // relleno por celdas de 0,25 m desde el pie de la escalera: ¿dónde cabe el
  // jugador (radio 0,3 m, 1,7 m de alto)?
  const res = 0.25;
  const x0 = B.x0, z0 = B.z0, W = Math.round((B.w * B.res) / res), H = Math.round((B.h * B.res) / res);
  const F = -6.6;
  const free = (x, z) => {
    const bs = col.query(x - 0.3, z - 0.3, x + 0.3, z + 0.3, []);
    for (const b of bs) {
      if (b.enabled === false || b.camOnly) continue;
      if (b.maxy <= F + 0.45 || b.miny >= F + 1.7) continue;
      if (!col.overlapXZ(b, x, z, 0.3)) continue;
      return false;
    }
    return col.groundHeight(x, z, 0.05, F + 0.5) > F - 0.3;
  };
  const seen = new Uint8Array(W * H);
  const q = [];
  const start = [Math.round((59.5 - x0) / res), Math.round((-37 - z0) / res)];
  q.push(start);
  seen[start[1] * W + start[0]] = 1;
  let n = 0;
  while (q.length) {
    const [i, j] = q.pop();
    n++;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, c = j + dj;
      if (a < 0 || c < 0 || a >= W || c >= H || seen[c * W + a]) continue;
      const x = x0 + (a + 0.5) * res, z = z0 + (c + 0.5) * res;
      if (z > -32.5) continue;
      if (!free(x, z)) continue;
      seen[c * W + a] = 1;
      q.push([a, c]);
    }
  }
  const at = (x, z) => seen[Math.floor((z - z0) / res) * W + Math.floor((x - x0) / res)] === 1;
  const rooms = { lagar: [32, -47.5], cripta: [49, -78], osario: [68.8, -60], ramal: [65, -63], antecamara: [43, -60], toneles: [45.5, -42], celda: [54.5, -34] };
  const out = { cells: n, wellReachable: at(53.2, -54) || at(55, -52.2) || at(60, -52) || at(52, -49), rooms: {} };
  for (const k in rooms) out.rooms[k] = at(...rooms[k]);
  out.stats = g.level.stats;
  out.levers = g.interact.list.filter((i) => i.kind === 'lever').map((i) => i.id);
  out.gate = !!g.interact.list.find((i) => i.id === 'd_rastrillo');
  out.waters = g.waters.list.length;
  return out;
});
console.log(JSON.stringify(r));
if (shots) {
  const views = {
    lagar: [37, -5.0, -37, 30, -6, -52],
    lagar2: [27.5, -4.8, -58, 35, -5.8, -40],
    cripta: [49, -4.4, -74, 49, -5.6, -83],
    osario: [68.8, -5.2, -38, 68.8, -5.8, -60],
    ramal: [68.5, -5.2, -62.5, 63, -5.6, -63],
    cisterna: [55, -4.6, -47.2, 55, -6.2, -56],
    pozo: [55, -5.0, -50.3, 55, -6.2, -54],
    pila: [33, -4.8, -54, 28.6, -5.9, -57.6],
    rastrillo: [57.5, -5.0, -41, 55, -5.5, -47],
    antecamara: [42, -5.1, -48, 43, -5.6, -62],
    sala: [59.5, -4.6, -37.5, 59, -5.8, -45],
    comedero: [61.5, -4.9, -41, 59, -6.6, -44.4],
    huesos: [35.5, -4.9, -45, 32.3, -6.6, -47.6],
    cripta2: [49, -4.6, -74.5, 44, -6, -79],
    galeria: [45.5, -4.9, -39, 45.5, -6.2, -45.8],
  };
  for (const [k, v] of Object.entries(views)) {
    await p.evaluate((v) => {
      const g = __game;
      // el jugador (con su farol) justo detrás de la cámara
      const dx = v[3] - v[0], dz = v[5] - v[2], dl = Math.hypot(dx, dz) || 1;
      g.player.spawn(v[0] - (dx / dl) * 0.6, -6.6, v[2] - (dz / dl) * 0.6, Math.atan2(dx, dz));
      g.ui.showHud(false);
      for (let i = 0; i < 20; i++) g.update(1 / 30);
      g.atmo.setZone ? 0 : 0;
      Object.assign(g.atmo.cur, g.atmo.target);
      g.atmo.fogC.set(g.atmo.target.fog);
      g.atmo.skyC.set(g.atmo.target.sky);
      g.atmo.groundC.set(g.atmo.target.ground);
      g.update(1 / 30);
      for (const m of g.player.rig.meshes) m.visible = false;
      g.camera.position.set(v[0], v[1], v[2]);
      g.camera.lookAt(v[3], v[4], v[5]);
      g.camera.updateMatrixWorld();
      g.render();
    }, v);
    await p.screenshot({ path: `tools/shots/cellar_${k}.png` });
  }
}
console.log(logs.slice(0, 12).join('\n'));
await b.close();
