// La cámara contra muros, rejas y techos: en puntos del castillo y de las
// mazmorras (pegados a paredes, junto a las rejas de las celdas, en escaleras),
// doce orientaciones y tres inclinaciones en cada uno. Tras asentarse, ¿queda
// la cámara tras un muro (el rayo desde el pivote choca antes de llegar a
// ella) o a menos de 0,12 m de una caja?
//   node tools/camclip.mjs [puerto]      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const port = process.argv[2] || '5199';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 200 } });
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
await p.goto(`http://localhost:${port}/?dev=1`);
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
const r = await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  g.ui.closeAll();
  for (const e of g.enemies) if (!e.boss) { e.dead = true; e.state = 'dead'; e.stT = 99; e.obj.visible = false; }
  const P = g.player, col = g.world.col, cam = g.camera, rig = g.camRig;
  const pts = [
    // mazmorras: pasillo de las celdas, junto a las rejas, galerías, escalera
    [-80, -5, -12.0], [-87.5, -5, -12.9], [-84.0, -5, -11.1], [-71, -5, -4], [-75, -5, 0.4], [-66, -5, 5.2],
    [-86.5, -5, 0], [-91.5, -5, 10], [-87, -2.2, 8], [-80, -5, 12.4], [-64, -5, -11.5], [-71, -5, 8.7],
    // torre de la cárcel y su sala de arriba
    [-85.5, 0, 11.5], [-83, 0, 6], [-86, 4.4, 9],
    // torre del homenaje, plantas y escaleras
    [-90, 0, -20], [-78, 0, -6], [-90, 4.5, -10.5], [-78, 4.5, -18], [-75.15, 6.5, -9.5], [-88, 9, -8], [-80, 9, -18], [-90, 9, -17],
    // patio y puerta
    [-70, 0, 0], [-72, 0, -10], [-55, 0, -2], [-54.4, 0, 2.5],
  ];
  let bad = [], n = 0, near = 0;
  for (const [x, y, z] of pts) {
    for (let k = 0; k < 12; k++)
      for (const pitch of [-0.3, 0.22, 0.7]) {
        P.spawn(x, y, z, 0);
        rig.snapTo(P);
        rig.yaw = (k / 12) * Math.PI * 2;
        rig.pitch = pitch;
        rig.curDist = rig.dist;
        for (let i = 0; i < 45; i++) g.update(1 / 60);
        n++;
        const pv = rig.pivot, c = cam.position;
        const dx = c.x - pv.x, dy = c.y - pv.y, dz = c.z - pv.z, d = Math.hypot(dx, dy, dz);
        const hit = d > 0.01 ? col.raycast(pv.x, pv.y, pv.z, dx / d, dy / d, dz / d, d, (b) => b.cam !== false) : Infinity;
        const close = col.sphereHits(c.x, c.y, c.z, 0.12, (b) => b.cam !== false);
        if (hit < d - 0.02) bad.push(`tras muro: p(${x},${y},${z}) yaw ${k * 30}º pitch ${pitch} d ${d.toFixed(2)} hit ${hit.toFixed(2)}`);
        else if (close) { near++; if (near <= 12) bad.push(`pegada: p(${x},${y},${z}) yaw ${k * 30}º pitch ${pitch} cam (${c.x.toFixed(2)},${c.y.toFixed(2)},${c.z.toFixed(2)})`); }
      }
  }
  return { n, near, bad };
});
console.log(`pruebas: ${r.n}  pegadas: ${r.near}  problemas: ${r.bad.length}`);
console.log(r.bad.slice(0, 40).join('\n'));
if (errs.length) console.log(errs.join('\n'));
await b.close();
process.exit(r.bad.length || errs.length ? 1 : 0);
