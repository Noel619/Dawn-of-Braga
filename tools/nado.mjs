// A nado por el Sumidero (world/sumidero.js, game/nado.js, entities/nado.js):
//  - de la galería de V20 a la repisa; se tira al lago (se va al agua, sin
//    hacerse daño) y flota;
//  - nada en la superficie hacia la luna del sumidero del pozo; se zambulle;
//    baja al fondo de la ensenada (el aliento se gasta) y entra en el
//    venero; lo cruza y sube por el tiro a la pila del ninfeo; sale a
//    respirar y se agarra al borde: de pie, en lo hondo;
//  - vuelve por el mismo sitio (la pila, el tiro, el venero, el lago) y sale
//    andando por la playa; sube la senda a la repisa;
//  - sin aliento, se ahoga.
// Con fotos en tools/shots/nado_*.png.
//   node tools/nado.mjs      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
await p.goto('http://localhost:' + (process.env.PORT || 5199) + '/?dev=1&items=espada,escudo');
await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
fs.mkdirSync('tools/shots', { recursive: true });
await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  g.input.enabledPointerLock = false;
  g.ui.closeAll();
  g.state = 'play';
  g.player.maxHp = g.player.hp = 1e6;
  g.enemies.forEach((e) => { if (!e.boss) { e.dead = true; e.state = 'dead'; e.stT = 99; } });
  const r2 = (v) => +v.toFixed(2);
  // un rato con unas teclas pulsadas, con la cámara mirando a (yaw, pitch)
  window.__go = (sec, keys, yaw, pitch) => {
    const pl = g.player;
    if (g.ui.modal || g.ui.stack.length) g.ui.closeAll();
    for (let t = 0; t < sec; t += 1 / 30) {
      if (yaw !== undefined) g.camRig.yaw = yaw;
      if (pitch !== undefined) g.camRig.pitch = pitch;
      for (const k of keys) { if (!g.input.keys.has(k)) g.input.kPressed.add(k); g.input.keys.add(k); }
      g.update(1 / 30);
    }
    for (const k of keys) { g.input.keys.delete(k); g.input.kReleased.add(k); }
    g.update(1 / 30);
    const S = pl.nadoS;
    return { st: pl.state, sub: S ? S.sub : null, pos: [pl.pos.x, pl.pos.y, pl.pos.z].map(r2), zona: g.zone && g.zone.id, aliento: r2(g.nado.aliento), hp: Math.round(pl.hp), under: g.nado.under };
  };
  // nada hacia (x, z) (yaw hacia allí), con la cámara a 'pitch'
  window.__nada = (x, z, pitch, keys = [], max = 20) => {
    const pl = g.player;
    let t = 0;
    for (; t < max; t += 1 / 30) {
      const dx = x - pl.pos.x, dz = z - pl.pos.z;
      if (Math.hypot(dx, dz) < 0.5) break;
      g.camRig.yaw = Math.atan2(dx, dz);
      g.camRig.pitch = pitch;
      for (const k of ['KeyW', ...keys]) { if (!g.input.keys.has(k)) g.input.kPressed.add(k); g.input.keys.add(k); }
      g.update(1 / 30);
    }
    for (const k of ['KeyW', ...keys]) { g.input.keys.delete(k); g.input.kReleased.add(k); }
    g.update(1 / 30);
    const S = pl.nadoS;
    return { t: r2(t), st: pl.state, sub: S ? S.sub : null, pos: [pl.pos.x, pl.pos.y, pl.pos.z].map(r2), zona: g.zone && g.zone.id, aliento: r2(g.nado.aliento) };
  };
});
const foto = async (name) => {
  await p.evaluate(() => __game.render());
  await p.screenshot({ path: `tools/shots/nado_${name}.png` });
};
const T = (s) => p.evaluate(s);
const out = [];
const run = async (n, s) => out.push(n + ': ' + JSON.stringify(await T(s)));
await run('galería', "(()=>{const g=__game;g.player.spawn(-3.5,-23,-40,Math.PI/2);__go(0.4,[]);return __go(1.6,['KeyW'],Math.PI/2,0.3)})()");
await foto('repisa');
await run('a la repisa', "__go(1.2,['KeyW'],Math.PI/2,0.3)");
await run('se tira', "__go(2.0,['KeyW'],Math.PI/2,0.3)");
await foto('cae');
await run('flota', "__go(2.5,[],Math.PI/2,0.3)");
await foto('flota');
await run('nada a la luna', "__nada(14.5,-36.5,0.25)");
await foto('superficie');
await run('se zambulle', "__go(0.4,['Space'],Math.PI,0.6)");
await run('baja', "__go(3.0,['KeyW'],Math.PI,1.1)");
await foto('bajo');
await run('arriba otra vez', "__go(5,['KeyE'],Math.PI,0.2)");
await run('sobre la ensenada', "__nada(19.5,-15.5,0.25,[],25)");
await run('se zambulle', "__go(0.4,['Space'],0,0.6)");
await run('al fondo', "__go(4.5,['Space','KeyW'],0,1.2)");
await foto('fondo');
await run('el venero', "__nada(19.5,5.6,0.28,['ShiftLeft'],25)");
await foto('venero');
await run('sube por el tiro', "__go(2.5,['KeyE'],0,0.2)");
await foto('tiro');
await run('sale a la pila', "__go(1.5,['KeyE'],0,0.2)");
await run('al borde', "__go(2.0,['KeyW'],Math.PI/2,0.3)");
await foto('pila');
await run('en lo hondo', "(()=>{const g=__game;return {st:g.player.state,pos:[g.player.pos.x,g.player.pos.y,g.player.pos.z].map(v=>+v.toFixed(2)),zona:g.zone&&g.zone.id}})()");
// la vuelta: a la pila, abajo, el venero, el lago, la playa
await run('vuelve a la pila', "(()=>{const g=__game;g.player.spawn(23.0,-35,5.6,-Math.PI/2);__go(0.3,[]);return __go(1.4,['KeyW'],-Math.PI/2,0.3)})()");
await run('sobre el tiro', "__nada(19.5,5.6,0.3,[],6)");
await run('abajo, por el tiro', "__go(3.0,['Space'],Math.PI,0.4)");
await run('el venero, al revés', "__nada(19.5,-14,0.28,[],25)");
await run('arriba, al lago', "__go(7,['KeyE'],Math.PI,0.2)");
await foto('lago_desde_abajo');
await run('a la playa', "__nada(5.5,-23,0.25,[],40)");
await run('sale andando', "__go(2.5,['KeyW'],-Math.PI/2,0.3)");
await foto('playa');
await run('la senda', "(()=>{const g=__game;const r=__go(5,['KeyW'],Math.PI,0.3);return r})()");
await run('a la repisa', "__go(2,['KeyW'],Math.PI,0.3)");
// ahogarse
await run('sin aliento', "(()=>{const g=__game;g.player.maxHp=g.player.hp=100;g.player.spawn(20,-30,-40,0);__go(0.6,[]);__go(0.3,['Space']);const r=__go(40,['Space'],0,0.4);return {...r,dead:g.player.dead}})()");
console.log(out.join('\n'));
console.log(logs.join('\n') || 'sin errores');
await b.close();
