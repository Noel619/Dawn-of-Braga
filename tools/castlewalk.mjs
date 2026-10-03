// Recorre el castillo como un jugador, a pie: de la celda donde se despierta
// a la calle del Soto (las mazmorras, las catacumbas, el aljibe, la escalera
// de la torre de la cárcel, el patio de armas y la torre-puerta en recodo).
// Con «torre», además: del adarve norte a la torre del homenaje por la
// poterna, el torno del puente levadizo y de vuelta al patio por el puente.
// Dice dónde se atasca, si se atasca.
//   node tools/castlewalk.mjs [torre]      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const torre = process.argv.includes('torre');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 200 } });
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5199/?dev=1&items=espada,escudo');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
const r = await p.evaluate((torre) => {
  window.__pause = true;
  const g = __game;
  g.ui.closeAll();
  g.input.enabledPointerLock = false;
  const P = g.player;
  P.maxHp = P.hp = 9999;
  // sin criaturas: sólo el camino
  for (const e of g.enemies)
    if (!e.boss) {
      e.dead = true;
      e.state = 'dead';
      e.stT = 99;
      e.obj.visible = false;
    }
  const out = [];
  const go = (pts, name) => {
    for (const [x, z, use] of pts) {
      let t = 0,
        best = 1e9,
        still = 0;
      while (t < 25) {
        const dx = x - P.pos.x,
          dz = z - P.pos.z,
          d = Math.hypot(dx, dz);
        if (d < 0.45) break;
        P.autoDir = { x: dx / d, z: dz / d, m: 1 };
        g.update(1 / 60);
        t += 1 / 60;
        if (d < best - 0.02) {
          best = d;
          still = 0;
        } else still += 1 / 60;
        if (still > 3) {
          P.autoDir = null;
          return `${name}: atascado yendo a (${x}, ${z}) en (${P.pos.x.toFixed(2)}, ${P.pos.y.toFixed(2)}, ${P.pos.z.toFixed(2)})`;
        }
      }
      if (use) {
        P.autoDir = null;
        for (let i = 0; i < 10; i++) g.update(1 / 60);
        const it = g.interact.list.find((i) => i.id === use);
        g.interact.use(it);
        for (let i = 0; i < 200; i++) g.update(1 / 60);
      }
    }
    P.autoDir = null;
    return `${name}: OK en (${P.pos.x.toFixed(2)}, ${P.pos.y.toFixed(2)}, ${P.pos.z.toFixed(2)}) zona ${g.zone && g.zone.id}`;
  };
  const S = g.level.L ? null : null;
  P.spawn(-87.6, -5, -16.2, 0);
  for (let i = 0; i < 30; i++) g.update(1 / 60);
  out.push(
    go(
      [
        [-87.9, -13.0],
        [-87.9, -12.0],
        [-76.5, -12.0],
        [-74.4, -12.0],
        [-71, -11.0],
        [-71, -8.0],
        [-71, -2],
        [-71, 0],
        [-71, 2.5],
        [-71, 5],
        [-65, 5],
        [-65, 7],
        [-65, 8.7],
        [-71.2, 8.7],
        [-71.2, 12],
        [-78, 12],
        [-82.6, 12],
        [-88.7, 12],
        [-88.7, 10.3],
        [-84.5, 9.6],
        [-82.9, 8.0, 'd_carcel'],
        [-79.5, 8.0],
      ],
      'mazmorras → torre de la cárcel'
    )
  );
  out.push(
    go(
      [
        [-72, 7.2],
        [-60, 7.2],
        [-54.4, 7.0],
        [-54.4, 2.5],
        [-54.4, 0.0],
        [-50, 0],
        [-44, 0],
      ],
      'patio → calle'
    )
  );
  if (torre) {
    P.spawn(-60, 9, -21.6, -Math.PI / 2);
    for (let i = 0; i < 30; i++) g.update(1 / 60);
    out.push(
      go(
        [
          [-72.2, -21.0, 'd_poterna'],
          [-75.6, -20.9],
          [-77, -18],
          [-77, -14],
          [-75.15, -13.4],
          [-75.15, -5.8],
          [-80, -6.4],
          [-84.6, -6.8, 'b_homenaje'],
          [-82, -5.5],
          [-82, -3.6],
          [-82, -1.4],
          [-82, 1.2],
          [-78.8, 1.2],
          [-71, 1.2],
          [-68, 4],
        ],
        'adarve → torre → puente → patio'
      )
    );
    out.push(`puente: ${g.flags['puente:homenaje'] ? 'bajado' : 'alzado'}`);
    // y a la terraza
    P.spawn(-77, 9, -15, Math.PI);
    for (let i = 0; i < 30; i++) g.update(1 / 60);
    out.push(
      go(
        [
          [-77.5, -20.9],
          [-78.2, -20.9],
          [-85.6, -20.9],
          [-86.6, -20.9],
          [-86.6, -18.2],
          [-86.6, -14],
        ],
        'sala del alcaide → terraza'
      )
    );
  }
  return out;
}, torre);
for (const l of r) console.log(l);
if (errs.length) console.log(errs.join('\n'));
await b.close();
process.exit(r.every((l) => !l.includes('atascado')) && !errs.length ? 0 : 1);
