// La cripta honda, andada: inunda desde el templo romano como andaría el
// jugador (escalones de medio metro, 1,6 m libres encima, sin atravesar muros
// ni puertas cerradas) y dice a qué salas de la planta (LAYOUT) se llega y a
// cuáles no. Con «abierto», con todas las puertas y rejas abiertas (lo que
// tiene que alcanzarse al final); sin él, con las de partida (lo que se
// alcanza nada más bajar). Y, de lo pisado, dónde no se ve suelo debajo
// (agujeros: la colisión sostiene pero no hay nada dibujado).
//   node tools/cryptwalk.mjs [abierto]      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const abierto = process.argv.includes('abierto');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 200 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5199/?dev=1');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
const r = await p.evaluate(async (abierto) => {
  window.__pause = true;
  const g = __game;
  const { LAYOUT } = await import('/src/world/level_crypt2.js');
  const col = g.world.col;
  const C = g.level.C;
  const inCrypt = (x, z) => x >= C.x0 && x <= C.x0 + C.w * C.res && z >= C.z0 && z <= C.z0 + C.h * C.res;
  if (abierto) {
    for (const it of g.interact.list) if ((it.kind === 'door' || it.kind === 'fog') && it.box && inCrypt(it.x, it.z)) it.box.enabled = false;
    if (g.crypt.gate && g.crypt.gate.box) g.crypt.gate.box.enabled = false;
    if (g.crypt.vgate && g.crypt.vgate.box) g.crypt.vgate.box.enabled = false;
  }
  const R = 0.25;
  const key = (i, j, y) => i + ',' + j + ',' + Math.round(y * 4);
  const free = (x, z, gy) => !col.query(x - 0.12, z - 0.12, x + 0.12, z + 0.12, []).some((q) => q.enabled !== false && !q.camOnly && q.miny < gy + 1.6 && q.maxy > gy + 0.55 && col.overlapXZ(q, x, z, 0.12));
  const seeds = [[-11, -7, -120]];
  const done = new Set();
  const reached = [];
  const q = [];
  for (const [x, y, z] of seeds) q.push([Math.round(x / R), Math.round(z / R), col.groundHeight(x, z, 0.05, y + 0.5)]);
  let n = 0;
  while (q.length && n < 600000) {
    const [i, j, y] = q.pop();
    const k = key(i, j, y);
    if (done.has(k)) continue;
    done.add(k);
    n++;
    reached.push([i * R, j * R, y]);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = (i + di) * R,
        nz = (j + dj) * R;
      if (!inCrypt(nx, nz)) continue;
      const ny = col.groundHeight(nx, nz, 0.05, y + 0.55);
      if (ny < -17 || ny > -5 || Math.abs(ny - y) > 0.55) continue;
      if (!free(nx, nz, ny)) continue;
      q.push([i + di, j + dj, ny]);
    }
  }
  // agujeros: cada medio metro de lo pisado, ¿hay suelo dibujado debajo?
  const T = g.THREE;
  const rc = new T.Raycaster();
  const meshes = g.level.meshes.filter((m) => !/water|glass|black|ember/.test(m.material.userData?.def?.tex || ''));
  const down = new T.Vector3(0, -1, 0);
  const o = new T.Vector3();
  const holes = [];
  for (const [x, z, y] of reached) {
    if (Math.abs((x * 2) % 1) > 0.01 || Math.abs((z * 2) % 1) > 0.01) continue;
    o.set(x, y + 0.6, z);
    rc.set(o, down);
    rc.far = 2.2;
    const hit = rc.intersectObjects(meshes, false)[0];
    if (!hit || hit.point.y < y - 0.35) holes.push([x, y, z, hit ? +hit.point.y.toFixed(2) : null]);
  }
  const groups = [];
  for (const h of holes) {
    let gr = groups.find((q) => Math.abs(q.cx - h[0]) < 1.5 && Math.abs(q.cz - h[2]) < 1.5 && Math.abs(q.y - h[1]) < 0.6);
    if (!gr) groups.push((gr = { cx: h[0], cz: h[2], y: h[1], n: 0, minx: h[0], maxx: h[0], minz: h[2], maxz: h[2], hitY: h[3] }));
    gr.n++;
    gr.minx = Math.min(gr.minx, h[0]);
    gr.maxx = Math.max(gr.maxx, h[0]);
    gr.minz = Math.min(gr.minz, h[2]);
    gr.maxz = Math.max(gr.maxz, h[2]);
    gr.cx = (gr.minx + gr.maxx) / 2;
    gr.cz = (gr.minz + gr.maxz) / 2;
  }
  const holeList = groups.sort((a, b) => b.n - a.n).map((q) => `${q.n} celdas  x[${q.minx}..${q.maxx}] z[${q.minz}..${q.maxz}] y=${q.y.toFixed(2)} ${q.hitY === null ? 'sin suelo' : 'suelo a ' + q.hitY}`);
  // por sala: cuántas celdas suyas se pisan (y a qué alturas)
  const out = [];
  for (const g2 of LAYOUT) {
    if (g2.ghost) continue;
    const [x0, z0, x1, z1] = g2.r;
    const hits = reached.filter(([x, z]) => x > x0 + 0.1 && x < x1 - 0.1 && z > z0 + 0.1 && z < z1 - 0.1);
    const area = Math.max(1, Math.round(((x1 - x0 - 0.2) * (z1 - z0 - 0.2)) / (R * R)));
    out.push({ id: g2.id, n: hits.length, pct: Math.round((100 * hits.length) / area), ys: hits.length ? [Math.min(...hits.map((h) => h[2])), Math.max(...hits.map((h) => h[2]))].map((v) => +v.toFixed(2)) : null });
  }
  return { tested: n, out, holes: holeList };
}, abierto);
console.log((abierto ? 'con todo abierto' : 'nada más bajar') + ': ' + r.tested + ' celdas pisadas');
for (const o of r.out) console.log(`  ${o.n ? (o.pct < 50 ? '~ ' : '  ') : 'NO'} ${o.id.padEnd(20)} ${String(o.n).padStart(5)} celdas ${String(o.pct).padStart(3)}%  ${o.ys ? 'y ' + o.ys.join('..') : ''}`);
console.log('agujeros: ' + r.holes.length + ' sitios');
for (const h of r.holes) console.log('  ' + h);
console.log(logs.join('\n'));
await b.close();
