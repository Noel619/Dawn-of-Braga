// Recorre el recinto del Paço a pie (fase 4a): de la torre de la coracha por
// su escalera al patio; el cuerpo de guardia; la puerta (se desatranca), el
// puente y la puerta nueva del castillo; la escalera del foso, el foso y de
// vuelta. Dice dónde se atasca, si se atasca.
//   node tools/pacowalk.mjs      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 200 } });
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5199/?dev=1&items=espada,escudo');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
const r = await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  g.ui.closeAll();
  g.input.enabledPointerLock = false;
  const P = g.player;
  P.maxHp = P.hp = 9999;
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
  const at = (label) => out.push(`  ${label}: (${P.pos.x.toFixed(2)}, ${P.pos.y.toFixed(2)}, ${P.pos.z.toFixed(2)}) zona ${g.zone && g.zone.id}`);
  P.spawn(-59.6, 9, -64, 0);
  for (let i = 0; i < 30; i++) g.update(1 / 60);
  out.push(go([[-60, -66], [-60, -68.6], [-62.4, -68.6], [-63.4, -68.6], [-63.4, -70.5]], 'coracha → rellano'));
  at('rellano');
  out.push(go([[-63.4, -76], [-63.4, -81.0], [-63.4, -83.0]], 'escalera abajo'));
  at('pie');
  out.push(go([[-70, -82.5], [-71, -84.6], [-71, -85.3, 'd_sala'], [-72, -80], [-82, -60], [-82, -53.2, 'd_guardia_paco'], [-82, -51.4], [-82, -49.5], [-78, -49.5]], 'patio → cuerpo de guardia'));
  at('guardia');
  out.push(go([[-82, -49.5], [-82, -53.5], [-66.5, -56], [-66.5, -52.8, 'd_paco'], [-66.5, -49], [-66.5, -44], [-66.5, -30], [-66.5, -24], [-66.5, -21], [-66.5, -17]], 'puerta → puente → castillo'));
  at('patio de armas');
  out.push(go([[-66.5, -21], [-66.5, -30], [-66.5, -42.3], [-68.9, -42.35], [-71, -42.35], [-73.5, -42.35]], 'puente → escalera del foso'));
  at('pie de la escalera del foso');
  out.push(go([[-73.5, -38], [-72, -34.5], [-66.5, -34.5], [-63.4, -34.5], [-63.4, -27], [-66.5, -27.5], [-72, -33], [-76, -31.6], [-80, -31.6], [-86, -36], [-80, -31.6], [-76, -31.6], [-74.4, -38], [-74.6, -42.35]], 'el foso'));
  at('en el foso');
  out.push(go([[-71, -42.35], [-68.9, -42.35], [-66.5, -42.3], [-66.5, -46], [-66.5, -56]], 'de vuelta al patio'));
  at('patio');
  out.push('d_paco abierta: ' + !!g.flags['door:d_paco']);
  return out;
});
console.log(r.join('\n'));
console.log(errs.join('\n'));
await b.close();
