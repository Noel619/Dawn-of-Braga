// La cloaca a pie (zona nueva: world/cloaca.js): de la despensa de la
// Taberna del Cuervo, por la trampilla clavada (sin la palanca no se abre;
// con ella, sí), la escalera de mano, la bodega, el boquete y su bajada, la
// galería del canal, el rellano de la sala de la luz, su escalera y la isla;
// hablar con el Desfigurado (su flor) y volver arriba por la trampilla.
//   node tools/cloacawalk.mjs      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 480, height: 270 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
await p.goto('http://localhost:' + (process.env.PORT || 5199) + '/?dev=1&items=espada,escudo');
await p.waitForFunction(() => window.__ready, null, { timeout: 180000 });
await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  g.input.enabledPointerLock = false;
  g.input.onPointerLockLost = null;
  g.ui.closeAll();
  g.player.maxHp = g.player.hp = 1e6;
  window.__noEnemies = () => g.enemies.forEach((e) => { if (!e.boss && !e.dead && e.type !== 'cortesano' && e.type !== 'mayordomo') { e.dead = true; e.state = 'dead'; e.stT = 99; } });
  __noEnemies();
  const r2 = (v) => +v.toFixed(2);
  window.__toast = () => [...document.querySelectorAll('.toast')].map((t) => t.textContent).slice(-1)[0];
  // usa el interactuable desde donde está el jugador (de cara a él)
  window.__useHere = (id) => {
    const it = g.interact.list.find((i) => i.id === id);
    if (!it) return 'NO EXISTE ' + id;
    const pl = g.player;
    pl.yaw = Math.atan2((it.ix ?? it.x) - pl.pos.x, (it.iz ?? it.z) - pl.pos.z);
    __sim(0.1);
    if (!g.promptTarget || g.promptTarget.id !== id) return { ok: false, id, prompt: g.promptTarget && g.promptTarget.id, pos: [pl.pos.x, pl.pos.y, pl.pos.z].map(r2) };
    __sim(0.2, [], ['KeyE']);
    for (let k = 0; k < 3; k++) if (g.ui.modal) { __sim(0.5); __sim(0.1, [], ['KeyE']); g.ui.closeAll(); }
    __sim(1.5);
    return { ok: true, id, done: it.done, toast: __toast() };
  };
  // anda de punto en punto (x, z); dice dónde se atasca
  window.__walk = (pts) => {
    const pl = g.player;
    if (g.ui.modal || g.ui.stack.length) g.ui.closeAll();
    if (g.state !== 'play') g.state = 'play';
    for (const [x, z] of pts) {
      let t = 0;
      for (; t < 20; t += 1 / 30) {
        const dx = x - pl.pos.x, dz = z - pl.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.22) break;
        pl.autoDir = { x: dx / d, z: dz / d, m: 0.8 };
        __noEnemies();
        g.update(1 / 30);
      }
      pl.autoDir = null;
      if (t >= 20 || pl.dead) return { stuck: [x, z], pos: [pl.pos.x, pl.pos.y, pl.pos.z].map(r2), dead: pl.dead };
    }
    __sim(0.3);
    return { pos: [pl.pos.x, pl.pos.y, pl.pos.z].map(r2), zone: g.zone && g.zone.id };
  };
  // se acerca andando a un interactuable (hasta d de él) y lo usa
  window.__ir = (id, d = 0.9) => {
    const it = g.interact.list.find((i) => i.id === id);
    if (!it) return 'NO EXISTE ' + id;
    const pl = g.player;
    const ix = it.ix ?? it.x, iz = it.iz ?? it.z;
    const dx = pl.pos.x - ix, dz = pl.pos.z - iz, L = Math.hypot(dx, dz) || 1;
    const w = __walk([[ix + (dx / L) * d, iz + (dz / L) * d]]);
    const u = __useHere(id);
    return u.ok ? u : { ...u, w };
  };
  // los peldaños de un caracol (su centro; a0, el ángulo de su primer
  // peldaño, en grados), de u0 a u1
  window.__husillo = (cx, cz, a0, u0, u1) => {
    const r = 0.95;
    const pts = [];
    const st = u1 > u0 ? 1 : -1;
    for (let u = u0; st > 0 ? u <= u1 : u >= u1; u += st) {
      const a = ((a0 + 22.5 * (u + 0.5)) * Math.PI) / 180;
      pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
    }
    return __walk(pts);
  };
  // (el del rincón del sureste de una torre: x1, z1)
  window.__caracol = (x1, z1, u0, u1) => __husillo(x1 - 1.6, z1 - 1.6, 270, u0, u1);
});
const T = (s) => p.evaluate(s);
const out = [];
const run = async (name, s) => out.push(name + ': ' + JSON.stringify(await T(s)));
// 1. en la despensa de la taberna, sin la palanca: la trampilla, clavada
await run('despensa', "(()=>{const g=__game;g.player.spawn(-16.6,0,-14.3,Math.PI/2);__sim(0.5);return __walk([[-15.9,-14.0]])})()");
await run('sin palanca', "(()=>{const r=__useHere('h_bodega_arriba');return {...r, abierta: !!__game.flags['hatch:bodega']}})()");
// 2. con la palanca: se arrancan los tablones; y se baja
await run('con palanca', "(()=>{__game.inventory.add('palanca');const r=__useHere('h_bodega_arriba');return {...r, abierta: !!__game.flags['hatch:bodega']}})()");
await run('baja', "(()=>{const g=__game;__useHere('h_bodega_arriba');__sim(2.0);const p=g.player.pos;return {pos:[p.x,p.y,p.z].map(v=>+v.toFixed(2)), zona: g.zone&&g.zone.id}})()");
// 3. la bodega, el boquete y la bajada al canal
await run('bodega', "__walk([[-15.8,-14.6],[-15.3,-12.6],[-15.3,-11.6],[-15.3,-10.2],[-15.3,-9.0]])");
// 4. la galería, por el andén de poniente, hasta el rellano de la sala
await run('galeria', "__walk([[-15.3,-6.0],[-15.3,-1.0],[-15.3,4.0],[-15.3,8.2],[-15.2,9.6]])");
// (y por el canal, con el agua al tobillo, un trecho)
await run('canal', "__walk([[-14.0,2.0],[-14.0,5.0],[-15.2,6.5]])");
// 5. el rellano, la escalera de la sala y la isla
await run('rellano', "__walk([[-15.2,9.6],[-13.9,9.7],[-12.6,9.7]])");
await run('escalera sala', "__walk([[-11.0,9.7],[-9.0,9.7],[-7.0,9.7],[-6.6,10.6]])");
await run('a la isla', "__walk([[-6.9,12.6],[-7.6,14.6],[-8.2,16.3]])");
// 6. hablar con él (lo suyo y la flor)
await run('hablar', "(()=>{const g=__game;const r=__useHere('t_desfigurado');for(let k=0;k<40;k++){g.speech.skip(g.desfigurado.who);__sim(0.4);}return {...r, met: !!g.flags['desf:met'], flor: g.inventory.has('flor_blanca')}})()");
// 7. por el puente del oeste y la orilla, a la cascada; y de vuelta arriba
await run('puente oeste', "__walk([[-10.9,18.0],[-12.6,18.0],[-13.8,18.0],[-15.2,18.0],[-15.2,14.6]])");
await run('vuelta', "__walk([[-11.8,12.0],[-7.2,10.9],[-7.0,9.7],[-9.0,9.7],[-12.6,9.7],[-15.2,9.6],[-15.3,4.0],[-15.3,-6.0],[-15.3,-9.0],[-15.3,-11.6],[-15.3,-12.6],[-15.9,-13.9]])");
await run('sube', "(()=>{const g=__game;const r=__useHere('h_bodega_abajo');__sim(2.0);const p=g.player.pos;return {...r,pos:[p.x,p.y,p.z].map(v=>+v.toFixed(2)), zona: g.zone&&g.zone.id}})()");
console.log(out.join('\n'));
if (logs.length) console.log(logs.join('\n'));
await b.close();
