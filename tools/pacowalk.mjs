// Recorre el recinto del Paço a pie (fase 4a): de la torre de la coracha por
// su escalera al patio; el cuerpo de guardia; la puerta (se desatranca), el
// puente y la puerta nueva del castillo; la escalera del foso, el foso y de
// vuelta; y por el servicio (el callejón, las caballerizas, la cocina y el
// paso) a la Sala de la Corte; las cámaras del Rey y su tesoro, y el pasadizo
// quemado hasta la torre. Dice dónde se atasca, si se atasca.
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
        // (en una viga, lo que se empuja de lado endereza: contra lo que se
        // tuerce, y a lo largo, hacia donde se va)
        if (P.balance) {
          const B = P.balance;
          const along = Math.sign(dx * B.ax + dz * B.az || 1);
          const corr = -Math.sign(B.lean) * Math.min(0.9, Math.abs(B.lean) * 2.5 + 0.15);
          P.autoDir = { x: B.ax * along + B.az * corr, z: B.az * along - B.ax * corr, m: 1 };
        }
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
  // por el servicio a la sala (fase 4b): el callejón, el patio de las
  // caballerizas, la cocina, el paso y la puerta del servicio
  out.push(go([[-67.8, -60], [-67.8, -84.2], [-64, -84.6], [-64, -85.6, 'd_cuadras'], [-64, -95], [-64, -108], [-70.5, -110], [-71.8, -113, 'd_cocina_e'], [-74, -113], [-76, -111], [-74.9, -109.3, 'd_cocina_s'], [-74.9, -107], [-74.9, -104.6, 'd_servicio'], [-74.9, -102], [-74.5, -96], [-80, -95]], 'patio → servicio → sala'));
  at('sala');
  out.push(go([[-88, -95], [-95, -95]], 'por el pasillo de la corte'));
  at('ante el estrado');
  // las cámaras del Rey (fase 4c), con la corte ya vencida: la puerta del
  // estrado, la escalera del Rey, la antecámara, la cámara, la del pasadizo,
  // el boquete al tesoro, la llave del camarero y la puerta a la galería; y
  // el pasadizo quemado, viga a viga, hasta la alcoba de la torre
  g.flags['corte:vencida'] = true;
  g.corte.applyFlags();
  P.spawn(-99.9, 1.95, -88.4, 0);
  for (let i = 0; i < 30; i++) g.update(1 / 60);
  out.push(go([[-99.9, -87.0, 'd_sala_camaras'], [-99.9, -85.3], [-98.6, -85.1], [-94.9, -85.1], [-93.5, -84.0], [-96.0, -79.0], [-97.0, -74.8], [-97.0, -72.6], [-98.0, -70.0], [-98.0, -62.0], [-97.0, -61.4], [-97.0, -59.2], [-95.5, -55.0], [-96.7, -51.9]], 'estrado → cámaras → boquete'));
  for (let i = 0; i < 90; i++) g.update(1 / 60);
  at('en el tesoro');
  g.interact.use(g.interact.list.find((i) => i.id === 'i_llave_camarero'));
  for (let i = 0; i < 60; i++) g.update(1 / 60);
  g.ui.closeAll();
  out.push('llave del camarero: ' + g.inventory.has('llave_camarero'));
  out.push(go([[-95.0, -53.3], [-94.6, -53.3, 'd_camara3'], [-92.0, -53.3], [-91.8, -60]], 'tesoro → galería'));
  P.spawn(-93.2, 4.9, -50.0, Math.PI);
  for (let i = 0; i < 30; i++) g.update(1 / 60);
  out.push(go([[-93.2, -47.8], [-93.2, -46.0], [-93.2, -44.0], [-93.2, -39.0], [-93.2, -37.6], [-93.2, -35.0], [-93.2, -30.0], [-93.2, -27.5], [-93.2, -24.0]], 'el pasadizo quemado'));
  return out;
});
console.log(r.join('\n'));
console.log(errs.join('\n'));
await b.close();
