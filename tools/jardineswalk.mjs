// Recorre a pie los jardines del Paço (fase 4f): de la nave de la capilla, por
// su puerta de poniente (se desatranca), al jardín de la reina; el postigo de
// la cancillería (se desatranca desde el jardín); la torre de la reina y su
// cámara (el libro de horas y el relicario); el pomar, la escalera de la
// muralla, el adarve y el mirador (la ampolla); el jardín del Rey, su fuente,
// el patio de las cocinas y, por la puerta de poniente de la cocina (se
// desatranca desde el patio), la cocina. Dice dónde se atasca, si se atasca.
//   node tools/jardineswalk.mjs      (requiere npx vite --port 5199)
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
        if (still > 3 || P.dead) {
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
        g.ui.closeAll();
      }
    }
    P.autoDir = null;
    return `${name}: OK en (${P.pos.x.toFixed(2)}, ${P.pos.y.toFixed(2)}, ${P.pos.z.toFixed(2)}) zona ${g.zone && g.zone.id}`;
  };
  const inv = () => `relicarios ${g.inventory.count('relicario')} · ampollas ${g.inventory.count('ampolla')}`;
  const inv0 = inv();
  P.spawn(-126.9, 0.3, -76.5, -Math.PI / 2);
  for (let i = 0; i < 30; i++) g.update(1 / 60);
  out.push(go([[-128.0, -76.0, 'd_capilla_o'], [-130.6, -76.0], [-134.0, -76.0], [-136.3, -73.0], [-134.8, -68.2], [-136.0, -64.4], [-136.0, -63.4, 'd_jardin_reina'], [-136.0, -61.3], [-136.0, -64.4]], 'capilla → jardín de la reina → postigo'));
  out.push(go([[-135.0, -66.6], [-134.95, -69.0], [-135.0, -71.6], [-136.6, -73.6], [-138.4, -76.4], [-138.4, -77.3, 'd_torre_reina'], [-138.4, -79.6], [-136.2, -82.6], [-136.2, -84.7], [-138.0, -84.7], [-140.9, -84.7], [-140.8, -83.4], [-137.8, -82.0, 'n_reina'], [-137.8, -82.0, 'i_relicario_reina']], 'torre de la reina → su cámara'));
  out.push(go([[-140.7, -83.4], [-140.9, -84.7], [-138.6, -84.7], [-136.2, -84.7], [-136.2, -82.6], [-138.4, -79.6], [-138.4, -77.0], [-133.4, -80.0], [-132.3, -85.0, 'd_pomar'], [-132.3, -87.8]], 'cámara → jardín → pomar'));
  out.push(go([[-133.5, -90.0], [-133.5, -119.6], [-132.2, -121.35], [-128.0, -121.35], [-124.0, -121.35], [-120.2, -121.35], [-120.2, -123.2], [-117.5, -124.0, 'i_ampolla_mirador'], [-117.6, -124.2, 'x_mirador']], 'pomar → escalera → mirador'));
  out.push(go([[-120.2, -123.2], [-120.2, -121.35], [-126.0, -121.35], [-132.2, -121.35], [-133.5, -119.6], [-133.5, -112.0], [-121.0, -112.0], [-117.0, -112.0], [-115.0, -113.4], [-110.8, -113.4], [-108.0, -112.0], [-105.0, -112.0], [-102.4, -112.0]], 'mirador → jardín del Rey → patio de las cocinas'));
  out.push(go([[-96.0, -112.8], [-84.6, -113.0, 'd_cocina_o'], [-81.4, -113.0]], 'patio → cocina'));
  const fl = ['d_capilla_o', 'd_jardin_reina', 'd_torre_reina', 'd_pomar', 'd_cocina_o'].map((id) => `${id}=${!!g.flags['door:' + id]}`).join(' ');
  out.push('puertas: ' + fl);
  out.push(`antes: ${inv0} · después: ${inv()}`);
  return out;
});
console.log(r.join('\n'));
console.log(errs.join('\n'));
await b.close();
