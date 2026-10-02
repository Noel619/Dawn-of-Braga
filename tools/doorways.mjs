// Puertas y vanos de las bodegas despejados: busca los umbrales entre salas
// (bordes compartidos por dos regiones de la planta) y lista lo que estorba
// (todo lo que tiene colisión a la altura del cuerpo: toneles, sacos,
// estantes, pilares, sepulcros, atrezo) a menos de CLEAR metros del umbral,
// a uno y otro lado. Sale con código 1 si algo tapa un paso.
//   node tools/doorways.mjs        (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 180 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:5199/?dev=1&at=59.5,-6.6,-38&yaw=180');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
const r = await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  const C = g.CELLAR;
  const F = C.FLOOR;
  const CLEAR = 1.6; // metros a cada lado del umbral que deben quedar libres
  const R = C.regions.map((q, i) => ({ i, id: q.id, x0: q.r[0], z0: q.r[1], x1: q.r[2], z1: q.r[3] }));
  // umbrales: bordes compartidos (en x = cte o z = cte) entre dos regiones
  const doors = [];
  const ov = (a0, a1, b0, b1) => [Math.max(a0, b0), Math.min(a1, b1)];
  for (const A of R)
    for (const B of R) {
      if (A.i >= B.i) continue;
      for (const [ax, bx, axis] of [
        [A.x1, B.x0, 'x'],
        [A.x0, B.x1, 'x'],
        [A.z1, B.z0, 'z'],
        [A.z0, B.z1, 'z'],
      ]) {
        if (Math.abs(ax - bx) > 1e-6) continue;
        const [s0, s1] = axis === 'x' ? ov(A.z0, A.z1, B.z0, B.z1) : ov(A.x0, A.x1, B.x0, B.x1);
        if (s1 - s0 < 0.8) continue;
        // (dos trozos de la misma sala que se tocan a todo lo ancho no son un paso)
        const wa = axis === 'x' ? A.z1 - A.z0 : A.x1 - A.x0,
          wb = axis === 'x' ? B.z1 - B.z0 : B.x1 - B.x0;
        if (A.id === B.id && Math.abs(wa - wb) < 0.01 && Math.abs(s1 - s0 - wa) < 0.01) continue;
        // (la escalera es su propio paso: sus peldaños no estorban)
        if (A.id === 'stair' || B.id === 'stair') continue;
        if (doors.some((d) => d.axis === axis && Math.abs(d.at - ax) < 1e-6 && Math.abs(d.s0 - s0) < 1e-6 && Math.abs(d.s1 - s1) < 1e-6)) continue;
        doors.push({ name: `${A.id}|${B.id}`, axis, at: ax, s0, s1 });
      }
    }
  // obstáculos: cajas con colisión a la altura del cuerpo dentro de las bodegas
  const [bx0, bz0, bx1, bz1] = C.bounds;
  const named = new Map();
  for (const it of g.breakables.list) if (!it.broken && it.box) named.set(it.box, it.id);
  for (const it of g.breakables.list) if (!it.broken && it.boxes) for (const bb of it.boxes) named.set(bb, it.id);
  const obs = g.world.col.boxes.filter((bb) => bb.enabled && !bb.camOnly && bb.tag !== 'floor' && bb.tag !== 'block' && bb.tag !== 'cam' && bb.tag !== 'door' && bb.maxy > F + 0.25 && bb.miny < F + 1.7 && bb.maxx > bx0 && bb.minx < bx1 && bb.maxz > bz0 && bb.minz < bz1 && bb.maxy - bb.miny < 6.5);
  const out = [];
  for (const d of doors) {
    const hits = [];
    for (const bb of obs) {
      // distancia de la caja a la franja del paso (a lo largo, dentro del
      // vano; a lo ancho, hasta CLEAR a cada lado)
      const along = d.axis === 'x' ? [bb.minz, bb.maxz] : [bb.minx, bb.maxx];
      const across = d.axis === 'x' ? [bb.minx, bb.maxx] : [bb.minz, bb.maxz];
      if (along[1] <= d.s0 + 0.05 || along[0] >= d.s1 - 0.05) continue;
      const dist = across[0] > d.at ? across[0] - d.at : across[1] < d.at ? d.at - across[1] : 0;
      if (dist >= CLEAR) continue;
      const covered = Math.min(along[1], d.s1) - Math.max(along[0], d.s0);
      hits.push({ what: named.get(bb) || bb.tag || 'atrezo', dist: +dist.toFixed(2), covers: +covered.toFixed(2), box: [bb.minx, bb.minz, bb.maxx, bb.maxz].map((v) => +v.toFixed(2)) });
    }
    if (hits.length) out.push({ door: d.name, axis: d.axis, at: d.at, span: [d.s0, d.s1], width: +(d.s1 - d.s0).toFixed(2), hits });
  }
  // también delante de las bocas de sus grutas (por donde se mete él, con su
  // cuerpo de metro y medio) y al pie de las palancas (donde te plantas)
  const near = (x, z, r) => obs.filter((bb) => g.world.col.overlapXZ(bb, x, z, r));
  for (const pair of C.burrows)
    for (const m of pair) {
      const hits = [];
      for (let k = 0; k <= 4; k++) {
        const u = k / 4;
        for (const bb of near(m.x + (m.fx - m.x) * u, m.z + (m.fz - m.z) * u, 0.85)) if (!hits.some((h) => h.box === bb)) hits.push({ what: named.get(bb) || bb.tag || 'atrezo', dist: 0, covers: 0, box: bb });
      }
      if (hits.length) out.push({ door: `gruta (${m.x}, ${m.z})`, axis: '-', at: 0, span: [0, 0], width: 0, hits: hits.map((h) => ({ ...h, box: [h.box.minx, h.box.minz, h.box.maxx, h.box.maxz].map((v) => +v.toFixed(2)) })) });
    }
  for (const L of C.levers) {
    const hits = near(L.ix + L.nx * 0.6, L.iz + L.nz * 0.6, 0.7).map((bb) => ({ what: named.get(bb) || bb.tag || 'atrezo', dist: 0, covers: 0, box: [bb.minx, bb.minz, bb.maxx, bb.maxz].map((v) => +v.toFixed(2)) }));
    if (hits.length) out.push({ door: `palanca ${L.id}`, axis: '-', at: 0, span: [0, 0], width: 0, hits });
  }
  return { doors: doors.length, blocked: out };
});
console.log(`umbrales: ${r.doors}`);
for (const d of r.blocked) {
  console.log(`\n${d.door}  (${d.axis} = ${d.at}, ${d.span[0]}..${d.span[1]}, ancho ${d.width} m)`);
  for (const h of d.hits) console.log(`   ${h.what.padEnd(14)} a ${h.dist} m del umbral, tapa ${h.covers} m   caja ${JSON.stringify(h.box)}`);
}
if (errs.length) console.log(errs.join('\n'));
await b.close();
process.exit(r.blocked.length ? 1 : 0);
