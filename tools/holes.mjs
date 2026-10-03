// Busca zonas transitables sin suelo visible: por cada celda caminable lanza un
// rayo hacia abajo contra la geometría dibujada y comprueba que haya una
// superficie a la altura de la colisión. Agrupa los agujeros encontrados.
// Con «alto» revisa lo que está en alto (adarves, torres, la atalaya, la
// coracha, los pisos de la torre del homenaje): lo recorre por inundación
// desde varios puntos, como andaría el jugador (escalones de medio metro, sin
// atravesar muros ni almenas).
//   node tools/holes.mjs [paso=1] [alto]      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const step = +(process.argv[2] || 1);
const alto = process.argv.includes('alto');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 200 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5199/?dev=1');
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const r = await p.evaluate(([step, alto]) => {
  window.__pause = true;
  const g = __game;
  const T = g.THREE;
  const rc = new T.Raycaster();
  const meshes = g.level.meshes.filter((m) => !/water|glass|black|ember/.test(m.material.userData?.def?.tex || ''));
  const down = new T.Vector3(0, -1, 0);
  const o = new T.Vector3();
  const holes = [];
  const col = g.world.col;
  // ¿hay suelo dibujado bajo (x, gy, z)?
  const seen = (x, gy, z) => {
    o.set(x, gy + 0.6, z);
    rc.set(o, down);
    rc.far = 2.2;
    const hit = rc.intersectObjects(meshes, false)[0];
    return { ok: !!hit && hit.point.y > gy - 0.35, y: hit ? hit.point.y : null };
  };
  if (alto) {
    // inundación por lo alto: celdas de 0,25 m, suelo = la caja más alta bajo
    // los pies (+0,55), con 1,6 m libres encima y sin pared al pasar
    const R = 0.25;
    const key = (i, j, y) => i + ',' + j + ',' + Math.round(y * 4);
    const seeds = [
      [74, 9, -60],
      [74, 9, -38.5],
      [74, 9, -80],
      [45, 10, -124],
      [65, 10, -124],
      [30, 10, -124],
      [0, 10, -124],
      [-30, 10, -124],
      [-50, 10, -124],
      [-60, 18, -123],
      [-60, 11.5, -110.5],
      [-60, 9, -90],
      [-60, 9, -64],
      [-70, 9, -21.5],
      [-80.5, 9, -12],
      [-80.5, 4.6, -12],
    ];
    const done = new Set();
    const q = [];
    const free = (x, z, gy) => !col.query(x - 0.12, z - 0.12, x + 0.12, z + 0.12, []).some((b) => !b.camOnly && b.miny < gy + 1.6 && b.maxy > gy + 0.05 && col.overlapXZ(b, x, z, 0.12));
    for (const [x, y, z] of seeds) {
      const gy = col.groundHeight(x, z, 0.05, y + 0.5);
      q.push([Math.round(x / R), Math.round(z / R), gy]);
    }
    let n = 0;
    while (q.length && n < 400000) {
      const [i, j, y] = q.pop();
      const k = key(i, j, y);
      if (done.has(k)) continue;
      done.add(k);
      n++;
      const x = i * R,
        z = j * R;
      const s = seen(x, y, z);
      if (!s.ok) holes.push([+x.toFixed(2), +y.toFixed(2), +z.toFixed(2), s.y === null ? null : +s.y.toFixed(2)]);
      for (const [di, dj] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = (i + di) * R,
          nz = (j + dj) * R;
        const ny = col.groundHeight(nx, nz, 0.05, y + 0.55);
        if (ny < 2.5 || Math.abs(ny - y) > 0.55) continue;
        if (!free(nx, nz, ny)) continue;
        q.push([i + di, j + dj, ny]);
      }
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
    return { tested: n, holes: holes.length, groups: groups.sort((a, b) => b.n - a.n).map((q) => `${q.n} celdas  x[${q.minx}..${q.maxx}] z[${q.minz}..${q.maxz}] y=${q.y} ${q.hitY === null ? 'sin suelo' : 'suelo a ' + q.hitY}`) };
  }
  // [rejilla, techo de búsqueda del suelo]: nivel de calle, cripta y la
  // bodega del canónigo (con su escalera)
  const grids = [
    [g.level.S, -1, 1.2],
    [g.level.C, -10.6, -5.5],
    [g.level.B, -7.6, 0.1],
  ];
  let tested = 0;
  for (const [W, y0, y1] of grids) {
    for (let j = 0; j < W.h; j += Math.round(step / W.res)) {
      for (let i = 0; i < W.w; i += Math.round(step / W.res)) {
        if (W.cells[j * W.w + i] !== 1) continue;
        const x = W.x0 + (i + 0.5) * W.res,
          z = W.z0 + (j + 0.5) * W.res;
        // la galería del río pertenece a la cripta (rampa de -10 a 0)
        if (W === g.level.S && z < -166 && z > -186 && Math.abs(x) < 3) continue;
        // la boca del pozo de la cisterna (el pretil tapa un hueco abierto)
        if (W === g.level.B && Math.hypot(x - 55, z + 54) < 1.4) continue;
        // (y el aljibe de la cisterna y la pila del Lagar: su pretil rodea el líquido)
        if (W === g.level.B && x > 50.2 && x < 61.8 && z > -59.8 && z < -58.1) continue;
        if (W === g.level.B && x > 26 && x < 31.2 && z > -60 && z < -55.4) continue;
        // superficie pisable más alta bajo y1: con 1.6 m libres encima
        const boxes = g.world.col.query(x - 0.01, z - 0.01, x + 0.01, z + 0.01, []).filter((b) => !b.camOnly && !b.brk && g.world.col.overlapXZ(b, x, z, 0));
        const tops = boxes.map((b) => b.maxy).filter((t) => t <= y1 + 0.01 && t >= y0 - 1).sort((a, b) => b - a);
        let gy = null;
        for (const t of tops) {
          if (boxes.some((b) => b.miny < t + 1.6 && b.maxy > t + 0.05)) continue;
          gy = t;
          break;
        }
        if (gy === null) continue;
        tested++;
        o.set(x, gy + 0.6, z);
        rc.set(o, down);
        rc.far = 2.2;
        const hit = rc.intersectObjects(meshes, false)[0];
        // hay suelo si algo visible queda a la altura del suelo o encima (atrezo)
        const ok = hit && hit.point.y > gy - 0.35;
        if (!ok) holes.push([+x.toFixed(1), +gy.toFixed(2), +z.toFixed(1), hit ? +hit.point.y.toFixed(2) : null]);
      }
    }
  }
  // agrupar agujeros cercanos
  const groups = [];
  for (const h of holes) {
    let gr = groups.find((q) => Math.abs(q.cx - h[0]) < 3 && Math.abs(q.cz - h[2]) < 3 && Math.abs(q.y - h[1]) < 1);
    if (!gr) groups.push((gr = { cx: h[0], cz: h[2], y: h[1], n: 0, minx: h[0], maxx: h[0], minz: h[2], maxz: h[2], hitY: h[3] }));
    gr.n++;
    gr.minx = Math.min(gr.minx, h[0]);
    gr.maxx = Math.max(gr.maxx, h[0]);
    gr.minz = Math.min(gr.minz, h[2]);
    gr.maxz = Math.max(gr.maxz, h[2]);
    gr.cx = (gr.minx + gr.maxx) / 2;
    gr.cz = (gr.minz + gr.maxz) / 2;
  }
  return { tested, holes: holes.length, groups: groups.sort((a, b) => b.n - a.n).map((q) => `${q.n} celdas  x[${q.minx}..${q.maxx}] z[${q.minz}..${q.maxz}] y=${q.y} ${q.hitY === null ? 'sin suelo' : 'suelo a ' + q.hitY}`) };
}, [step, alto]);
console.log('celdas probadas:', r.tested, ' agujeros:', r.holes);
for (const q of r.groups) console.log('  ' + q);
console.log(logs.join('\n'));
await b.close();
