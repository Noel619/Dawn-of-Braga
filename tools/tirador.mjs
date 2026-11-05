// El tirador del paseo de las cámaras (PLAN_FORTALEZA.md, fase 7, #27): un
// ballestero del Rey que tira al patio de honor desde la baranda del sur y no
// baja. Con el jugador en medio del patio: despierta, se queda en su puesto
// (a +5,5) y le acierta; bajo la galería del claustro (sin línea de tiro), no
// le hace nada y vuelve a la guardia; de vuelta al patio, despierta otra vez.
//   node tools/tirador.mjs      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 200 } });
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:' + (process.env.PORT || 5199) + '/?dev=1&items=espada,escudo');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
const r = await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  g.ui.closeAll();
  g.input.enabledPointerLock = false;
  const P = g.player;
  const t = g.enemies.find((e) => e.spec.id === 'e_tirador_paseo');
  // los demás, fuera
  for (const e of g.enemies) if (e !== t && !e.boss) { e.dead = true; e.state = 'dead'; e.stT = 99; e.obj.visible = false; }
  const res = {};
  const run = (name, x, y, z, secs) => {
    P.maxHp = P.hp = 1000;
    P.spawn(x, y, z, Math.PI);
    const hp0 = P.hp;
    const states = new Set();
    let shots = 0, maxDy = 0;
    const was = g.virotes.list.length;
    for (let k = 0; k < secs * 30; k++) {
      g.update(1 / 30);
      states.add(t.state + (t.atk ? ':' + t.atk.name : ''));
      maxDy = Math.max(maxDy, Math.abs(t.pos.y - 5.5));
    }
    res[name] = { hpLost: hp0 - P.hp, states: [...states], tirador: [t.pos.x, t.pos.y, t.pos.z].map((v) => +v.toFixed(2)), maxDy: +maxDy.toFixed(2), aware: t.aware };
  };
  run('patio centro', -100, 0, -62, 12);
  run('bajo la galería sur', -100, 0, -48, 8);
  run('patio otra vez', -96, 0, -66, 8);
  return res;
});
for (const [k, v] of Object.entries(r)) console.log(k.padEnd(22), JSON.stringify(v));
const ok = r['patio centro'].hpLost > 0 && r['patio centro'].maxDy < 0.05 && r['bajo la galería sur'].hpLost === 0 && r['patio otra vez'].states.includes('attack:shoot');
console.log(ok ? 'OK' : 'FALLA');
console.log(errs.join('\n'));
await b.close();
