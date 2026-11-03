// Recorre el castillo como un jugador, a pie: de la celda donde se despierta
// a la calle del Soto (las mazmorras, las catacumbas, el aljibe, la escalera
// de la torre de la cárcel, el patio de armas y la torre-puerta en recodo).
// Con «torre», además: la puerta de la fortaleza (del patio de honor, por la
// guardia, al torno del puente levadizo, y de vuelta al patio de armas por el
// puente) y la torre del homenaje (del pasadizo del Rey a la terraza).
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
        [-85, 12],
        [-91.5, 12],
        [-91.5, 8.2],
        [-90.6, 8.0],
        [-84.5, 8.0],
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
        // (por el arco de la barbacana, a la calle del Soto)
        [-40, 0],
        [-36, 0.6],
      ],
      'patio → calle'
    )
  );
  if (torre) {
    // la puerta de la fortaleza: del patio de honor, por la guardia y su
    // escalera, a la armería y a la cámara del torno (el rastrillo y el
    // puente); de vuelta abajo, por el paso y el puente, al patio de armas
    P.spawn(-82, 0, -50, 0);
    for (let i = 0; i < 30; i++) g.update(1 / 60);
    const subir = [
      [-82, -47.0, 'd_guardia'],
      [-82, -44.0],
      [-86, -43],
      [-88.2, -43.0],
      [-89.3, -44.3],
      [-89.3, -37.0],
      [-89.3, -36.4],
      [-89.6, -35.6],
      [-92.5, -35.6],
    ];
    out.push(
      go(
        [
          ...subir,
          [-96, -35.9],
          [-102, -35.2],
          [-103.45, -33.7, 'p_rastrillo_fort'],
          [-98, -34.6, 'b_puente_fort'],
          [-98, -35.2],
          [-96, -35.9],
          ...subir.slice(1).reverse(),
          [-82, -47.2],
          [-90, -47.5],
          [-98, -47.5],
          [-98, -45],
          [-98, -31.5],
          [-98, -27],
          [-98, -22.5],
          [-90, -18],
          [-80, -14],
        ],
        'patio de honor → guardia → torno → puente → patio de armas'
      )
    );
    out.push(`rastrillo: ${g.flags['door:d_rastrillo_fort'] || g.flags['lever:p_rastrillo_fort'] ? 'alzado' : 'echado'} · puente: ${g.flags['puente:fortaleza'] ? 'bajado' : 'alzado'}`);
    // la torre del homenaje: del pasadizo de la cámara del Rey (la puerta
    // quemada), por la sala del consejo y la cámara, al caracol del rincón
    // del noroeste y por él a la terraza (con el Caballero de la Orden ya
    // vencido: si no, su niebla cierra la puerta de la caseta)
    g.flags['boss:caballero'] = true;
    const cab = g.enemies.find((q) => q.type === 'caballero');
    if (cab) {
      cab.dead = true;
      cab.state = 'dead';
      cab.stT = 99;
    }
    g.interact.applyFlags(g.flags);
    // (el caracol: su centro; a0, el ángulo de su primer peldaño; de u0 a u1)
    const husillo = (a0, u0, u1, r = 0.95) => {
      const pts = [];
      for (let u = u0; u <= u1; u++) {
        const a = ((a0 + 22.5 * (u + 0.5)) * Math.PI) / 180;
        pts.push([-106.8 + Math.cos(a) * r, -107.8 + Math.sin(a) * r]);
      }
      return pts;
    };
    P.spawn(-80, 12, -98.79, -Math.PI / 2);
    for (let i = 0; i < 30; i++) g.update(1 / 60);
    out.push(
      go(
        [
          [-83.4, -98.79],
          [-84.4, -98.79, 'd_pasadizo_torre'],
          [-86.4, -98.79],
          [-88.4, -98.79],
          [-92, -99],
          [-95, -99.8],
          [-95, -102.6],
          [-100, -104.6],
          [-104.2, -108.6],
          [-105.2, -108.6],
          ...husillo(0, 31, 59),
          ...husillo(1350, 0, 19),
          [-104.2, -108.6],
          [-102.6, -108.6],
          [-97, -98],
        ],
        'pasadizo → consejo → caracol → terraza'
      )
    );
  }
  return out;
}, torre);
for (const l of r) console.log(l);
if (errs.length) console.log(errs.join('\n'));
await b.close();
process.exit(r.every((l) => !l.includes('atascado')) && !errs.length ? 0 : 1);
