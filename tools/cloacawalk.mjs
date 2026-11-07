// La cloaca a pie (zona nueva: world/cloaca.js): de la despensa de la
// Taberna del Cuervo, por la trampilla clavada (sin la palanca no se abre;
// con ella, sí), la escalera de mano, la bodega, el boquete y su bajada, la
// galería del canal, el rellano de la sala de la luz, su escalera y la isla;
// hablar con el Desfigurado (su flor); por la reja de levante, el caño y el
// Vergel entero (world/vergel.js), hasta el derrumbe de lo oscuro; y volver
// arriba por la trampilla.
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
// 7. el Vergel (world/vergel.js): por la acequia del sur, a la reja de
// levante (los barrotes doblados), el caño, el saliente, el derrubio, el
// estanque y la fuente, la botica (el cuaderno), la raya de candiles y lo
// oscuro, hasta el derrumbe; y de vuelta a la isla por el mismo camino
await run('a la reja', "__walk([[-6.0,22.4],[-5.0,24.0],[-2.0,24.0],[-0.5,24.0]])");
await run('caño', "__walk([[0.8,24.0],[2.6,24.0],[4.8,24.0]])");
await run('saliente', "__walk([[6.2,24.0],[6.6,22.8],[7.4,21.2]])");
await run('derrubio', "__walk([[9.4,19.2],[12.4,17.4],[16.0,19.0],[19.0,22.4]])");
await run('estanque', "__walk([[21.4,24.4],[25.0,24.4],[28.8,25.8],[29.4,26.2]])");
await run('fuente', "__useHere('x_fuente_vergel')");
await run('por el agua', "__walk([[27.0,28.4],[25.4,31.0],[25.2,34.4]])");
await run('a la botica', "__walk([[20.0,34.6],[15.0,33.6],[12.4,33.2],[9.6,34.4]])");
await run('cuaderno', "(()=>{const r=__useHere('n_remedios');return r})()");
await run('a la raya', "__walk([[12.6,30.0],[18.0,24.8],[22.4,16.0],[25.8,13.0]])");
await run('raya', "__useHere('x_raya')");
await run('lo oscuro', "__walk([[25.8,10.6],[26.0,8.0],[26.0,5.0],[26.0,2.6]])");
await run('derrumbe', "(()=>{const r=__useHere('x_derrumbe_oscuro');return {...r, zona: __game.zone&&__game.zone.id}})()");
await run('vuelta del vergel', "__walk([[26.0,8.0],[25.8,12.6],[20.0,20.0],[13.0,19.6],[9.0,20.6],[7.4,21.6],[6.6,22.8],[6.2,24.0],[4.0,24.0],[1.0,24.0],[-0.8,24.0],[-5.0,24.0],[-6.2,22.4],[-8.2,18.0]])");
// 8. por el puente del oeste y la orilla, a la cascada; y de vuelta arriba
await run('puente oeste', "__walk([[-10.9,18.0],[-12.6,18.0],[-13.8,18.0],[-15.2,18.0],[-15.2,14.6]])");
await run('vuelta', "__walk([[-11.8,12.0],[-7.2,10.9],[-7.0,9.7],[-9.0,9.7],[-12.6,9.7],[-15.2,9.6],[-15.3,4.0],[-15.3,-6.0],[-15.3,-9.0],[-15.3,-11.6],[-15.3,-12.6],[-15.9,-13.9]])");
await run('sube', "(()=>{const g=__game;const r=__useHere('h_bodega_abajo');__sim(2.0);const p=g.player.pos;return {...r,pos:[p.x,p.y,p.z].map(v=>+v.toFixed(2)), zona: g.zone&&g.zone.id}})()");
// 9. de vuelta abajo: ya no está en la luz sino en su botica del Vergel; lo
// que cuenta allí, tema a tema (la vida escondida; la cura y la raíz; la
// peste; lo oscuro) y luego sus cosas
await run('ya no está en la luz', "(()=>{const g=__game;__sim(0.5);const e=g.desfigurado.npc;return {sitio:g.desfigurado.sitio,pos:[e.pos.x,e.pos.y,e.pos.z].map(v=>+v.toFixed(2))}})()");
await run('a la botica', "(()=>{const g=__game;g.player.spawn(9.6,-11.5,32.6,Math.PI);__sim(1.0);return __walk([[9.0,33.8]])})()");
const charla = (flag) => "(()=>{const g=__game;g.ui.closeAll();g.state='play';__sim(0.2);const r=__useHere('t_desfigurado');const said=[];const sp=g.speech;for(let k=0;k<40;k++){const b=sp.list.get(g.desfigurado.who.id);if(b&&b.line&&said[said.length-1]!==b.line)said.push(b.line.slice(0,48));sp.skip(g.desfigurado.who);__sim(0.4);}return {ok:r.ok,flag:!!g.flags['" + flag + "'],raiz:g.inventory.has('raiz_vergel'),dijo:said.length,primera:said[0]}})()";
await run('la vida', charla('desf:vida'));
await run('la cura', charla('desf:cura'));
await run('la peste', charla('desf:peste'));
await run('lo oscuro', charla('desf:oscuro'));
await run('sus cosas', charla('desf:oscuro'));
console.log(out.join('\n'));
if (logs.length) console.log(logs.join('\n'));
await b.close();
