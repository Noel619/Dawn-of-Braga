// Prueba de estrés: entradas aleatorias por todo el mapa buscando excepciones y NaN.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 480, height: 270 } });
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
// ARMA=facon|hacha|lanza|espada|katana para probar con otra arma
await p.goto('http://localhost:5199/?dev=1&items=espada,escudo' + (process.env.ARMA ? '&arma=' + process.env.ARMA : ''));
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const r = await p.evaluate(() => {
  window.__pause = true;
  const g = __game; g.input.enabledPointerLock = false; g.input.onPointerLockLost = null; g.ui.closeAll(); g.audio.init();
  const spots = [[-66, 0, 0], [-40, 0, 0], [0, 0, 6], [0, 0, -30], [0, 0, -48], [0, 0.6, -75], [24, 0, -74], [50, 0, 0], [68, 0, -20], [74, 9, -30], [74, 9, -60], [0, 0, 50], [-20, 0, 50], [0, -7, -104], [0, -7, -120], [10, -7, -120], [-10, -7, -122], [0, -10, -150], [55, -0, -50]];
  const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
  const taps = ['M0', 'KeyF', 'Space', 'KeyR', 'KeyQ', 'KeyE', 'M2'];
  let nan = 0, deaths = 0, steps = 0;
  const report = [];
  for (let round = 0; round < spots.length * 2; round++) {
    const s = spots[round % spots.length];
    g.player.spawn(s[0], s[1], s[2], Math.random() * 6.28);
    g.player.hp = g.player.maxHp;
    g.camRig.snapTo(g.player);
    if (g.player.dead) { g.player.dead = false; }
    for (let k = 0; k < 40; k++) {
      const hold = [keys[Math.floor(Math.random() * 4)]];
      if (Math.random() < 0.3) hold.push('ShiftLeft');
      const tap = Math.random() < 0.6 ? [taps[Math.floor(Math.random() * taps.length)]] : [];
      __sim(0.25 + Math.random() * 0.3, hold, tap);
      steps++;
      if (g.ui.modal) { g.ui.closeAll(); g.state = 'play'; }
      if (g.player.dead) { deaths++; g.player.dead = false; g.player.state = 'free'; g.player.hp = g.player.maxHp; }
      const P = g.player.pos;
      if (!isFinite(P.x) || !isFinite(P.y) || !isFinite(P.z)) { nan++; g.player.spawn(s[0], s[1], s[2], 0); }
      for (const e of g.activeEnemies) if (!isFinite(e.pos.x) || !isFinite(e.pos.y)) { nan++; report.push(['enemyNaN', e.id]); }
      if (P.y < -12) report.push(['fell', s, P.toArray()]);
    }
  }
  return { steps, nan, deaths, report: report.slice(0, 10), enemiesDead: g.enemies.filter((e) => e.dead).length };
});
console.log(JSON.stringify(r));
console.log(errs.slice(0, 10).join('\n'));
// estado del audio tras la prueba
console.log(JSON.stringify(await p.evaluate(() => {
  const a = __game.audio;
  return { ok: a.ok, ctx: a.ctx && a.ctx.state, tema: a.score && a.score.cur && a.score.cur.name, zona: a.zone, sala: a.room && a.room.kind, capas: a.L && Object.entries(a.L).filter(([k, v]) => v.on).map(([k]) => k) };
})));
await b.close();
