// Los altares de descanso, medidos (PLAN_REFUGIOS.md, §1): para cada uno, las
// criaturas más cercanas a su punto de reaparición, con la distancia en línea
// recta, el desnivel, si desde sus ojos se ve el punto, si te percibiría nada
// más aparecer (con su vista, su oído y su campo de visión, como en
// Enemy.perceive) y lo que tendría que andar para llegar (la navegación de
// las criaturas; con mucho desnivel, la de su planta, que no sirve).
// Las criaturas, en su puesto (como quedan al descansar o al morir).
//   node tools/altares.mjs            (la tabla)
//   node tools/altares.mjs --json     (todo, en JSON)
//   (requiere npx vite --port 5199)
import { chromium } from 'playwright';

const JSON_OUT = process.argv.includes('--json');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 180 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:' + (process.env.PORT || 5199) + '/?dev=1');
await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
const out = await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  const DEG = Math.PI / 180;
  const ad = (a, b) => {
    let d = a - b;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d;
  };
  const res = [];
  for (const a of g.interact.list.filter((i) => i.kind === 'altar')) {
    const [sx, sy, sz] = a.spawn;
    const zn = g.zoneAt({ x: sx, y: sy, z: sz });
    const rows = [];
    for (const e of g.enemies) {
      const T = e.T,
        h = e.home;
      const d = Math.hypot(h.x - sx, h.z - sz);
      if (d > 40) continue;
      const dy = h.y - sy;
      const los = g.world.col.lineOfSight(h.x, h.y + (T.height || 1.8) * 0.8, h.z, sx, sy + 1.4, sz);
      let sight = T.sight || 0;
      if (['eat', 'pray', 'window', 'pound'].includes(e.idle)) sight *= 0.45;
      const hear = T.hear || 0;
      const fov = Math.abs(ad(h.yaw || 0, Math.atan2(sx - h.x, sz - h.z))) <= (T.fov ?? 120) * 0.5 * DEG;
      const amigo = !!T.friendly || !(T.sight > 0);
      const percibe = !amigo && Math.abs(dy) <= 3.2 && los && (d < hear || (d < sight && fov));
      let anda = null;
      try {
        e.body.pos.set(h.x, h.y, h.z);
        const nav = e.nav(sx, sy, sz);
        const r = nav && nav.path(h.x, h.z, sx, sz, 40000, h.y, sy);
        if (r && r.complete && r.pts) {
          let L = 0,
            px = h.x,
            pz = h.z;
          for (const q of r.pts) {
            const qx = q.x ?? q[0],
              qz = q.z ?? q[1];
            L += Math.hypot(qx - px, qz - pz);
            px = qx;
            pz = qz;
          }
          anda = +(L + Math.hypot(sx - px, sz - pz)).toFixed(1);
        }
      } catch (err) {}
      rows.push({ id: e.spec.id || '?', tipo: e.type, jefe: !!e.boss, amigo, idle: e.idle || '', d: +d.toFixed(1), dy: +dy.toFixed(1), ve: los, percibe, anda });
    }
    for (const e of g.enemies) e.reset();
    rows.sort((p, q) => p.d - q.d);
    res.push({ id: a.id, nombre: a.name, zona: zn && zn.id, spawn: a.spawn.map((v) => +v.toFixed(2)), trasJefe: a.afterBoss || null, cerca: rows });
  }
  return res;
});
if (JSON_OUT) console.log(JSON.stringify(out, null, 1));
else
  for (const a of out) {
    const hostil = a.cerca.filter((r) => !r.amigo);
    const misma = hostil.filter((r) => Math.abs(r.dy) <= 3.2);
    const peor = hostil.find((r) => r.percibe);
    console.log(`\n${a.id} · ${a.nombre} (${a.zona})${a.trasJefe ? ' · tras ' + a.trasJefe : ''}`);
    console.log(`  la hostil más cercana en su planta: ${misma[0] ? misma[0].d + ' m, ' + misma[0].tipo + (misma[0].ve ? ', te ve' : '') : 'ninguna a menos de 40 m'}`);
    console.log(`  te percibe al aparecer: ${peor ? peor.tipo + ' a ' + peor.d + ' m' : 'nadie'}`);
    for (const r of a.cerca.slice(0, 5))
      console.log(`    ${String(r.d).padStart(5)} m  dy ${String(r.dy).padStart(5)}  ${r.ve ? 've ' : '   '}${r.percibe ? 'PERCIBE ' : '        '}${r.anda != null && Math.abs(r.dy) <= 3.2 ? 'andando ' + r.anda + ' m' : ''}  ${r.tipo}${r.jefe ? ' (jefe)' : ''}${r.amigo ? ' (amigo)' : ''} ${r.id} ${r.idle}`);
  }
if (logs.length) console.log(logs.join('\n'));
await b.close();
