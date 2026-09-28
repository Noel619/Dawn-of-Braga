// Coste de CPU del audio (sin suspensiones): segundos de cálculo por segundo
// de audio para el ambiente solo y para cada tema con todas sus capas.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage();
await p.goto('http://localhost:5199/package.json');
const r = await p.evaluate(async () => {
  const { Audio } = await import('http://localhost:5199/src/core/audio.js');
  class V3 { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } applyQuaternion() { return this; } }
  const game = (st) => ({ THREE: { Vector3: V3 }, camera: { position: new V3(0, 1.6, 4), quaternion: {} }, player: { pos: new V3(), hp: 100, maxHp: 100, dead: false }, state: st, fear: 0, activeEnemies: [], fx: { fires: { list: [{ on: true, s: 1, x: 3, y: 0, z: 1 }] } }, fauna: null, interact: { list: [] }, world: null });
  const out = {};
  const secs = 30, sr = 44100;
  // el render se suspende cada 0,25 s para que el juego falso programe lo
  // siguiente, igual que en tiempo real (0,4 s de antelación)
  const run = async (label, setup, st = 'intro') => {
    const ctx = new OfflineAudioContext(2, sr * secs, sr);
    const au = new Audio();
    const g = game(st);
    if (setup) {
      au.init(ctx);
      au.score.lookahead = 0.4;
      setup(au, g);
    }
    for (let t = 0.25; t < secs - 0.1; t += 0.25)
      ctx.suspend(t).then(() => {
        if (setup) au.update(0.25, g);
        ctx.resume();
      });
    if (setup) au.update(0.25, g);
    const w = performance.now();
    await ctx.startRendering();
    out[label] = Math.round(((performance.now() - w) / 1000 / secs) * 1000) / 1000;
  };
  await run('vacio', null);
  await run('ambiente', (au, g) => au.setZone('city'));
  for (const th of ['city', 'cathedral', 'crypt', 'boss', 'boss2', 'bossFinal', 'bossFinal2', 'ending'])
    await run('tema:' + th, (au, g) => {
      g.fear = 1;
      g.activeEnemies = [{ pos: new V3(3, 0, 0), aware: true, dead: false, boss: false }];
      au.music(th);
    }, 'play');
  return out;
});
console.log(JSON.stringify(r, null, 1));
await b.close();
