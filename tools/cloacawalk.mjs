// La cloaca a pie, de la taberna a lo hondo y vuelta (world/cloaca.js,
// world/vergel.js, world/cloacas_hondas.js):
//  - de la despensa de la Taberna del Cuervo, por la trampilla clavada (sin la
//    palanca no se abre; con ella, sí), la bodega, el boquete, la galería del
//    canal, el rellano y la escalera de la sala de la luz, la isla; hablar con
//    el Desfigurado (su flor);
//  - por la reja de levante (sus barrotes doblados), la galería del desagüe,
//    el rellano del Vergel y su escalera; el colector (la fuente, la botica:
//    el cuaderno; con él, lo suyo tema a tema: la cura y su cocimiento, la
//    mesa, la llave de la reja);
//  - la raya de candiles, la galería de la Sé y su reja (sin la llave, no;
//    con ella, sí), la escalera y la niebla de la lobera (el Lobishome,
//    vencido aquí a mano), el laberinto hasta su salida, las cloacas viejas,
//    los aljibes ahogados (el agua que frena), lo hondo (la cosecha) y el
//    pozo de la tapa, que sube al Vergel; y la mesa, a cocer.
//   node tools/cloacawalk.mjs      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 480, height: 270 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
await p.goto('http://localhost:' + (process.env.PORT || 5199) + '/?dev=1&items=espada,escudo');
await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  g.input.enabledPointerLock = false;
  g.input.onPointerLockLost = null;
  g.ui.closeAll();
  g.player.maxHp = g.player.hp = 1e6;
  window.__noEnemies = () => g.enemies.forEach((e) => { if (!e.boss && !e.dead && e.type !== 'cortesano' && e.type !== 'mayordomo' && e.type !== 'desfigurado') { e.dead = true; e.state = 'dead'; e.stT = 99; } });
  __noEnemies();
  const r2 = (v) => +v.toFixed(2);
  window.__toast = () => [...document.querySelectorAll('.toast')].map((t) => t.textContent).slice(-1)[0];
  window.__useHere = (id) => {
    const it = g.interact.list.find((i) => i.id === id);
    if (!it) return 'NO EXISTE ' + id;
    const pl = g.player;
    if (g.ui.modal) g.ui.closeAll();
    if (g.state !== 'play') g.state = 'play';
    pl.yaw = Math.atan2((it.ix ?? it.x) - pl.pos.x, (it.iz ?? it.z) - pl.pos.z);
    __sim(0.1);
    if (!g.promptTarget || g.promptTarget.id !== id) return { ok: false, id, prompt: g.promptTarget && g.promptTarget.id, pos: [pl.pos.x, pl.pos.y, pl.pos.z].map(r2) };
    __sim(0.2, [], ['KeyE']);
    for (let k = 0; k < 3; k++) if (g.ui.modal && g.ui.top && g.ui.top.name !== 'mesa') { __sim(0.5); __sim(0.1, [], ['KeyE']); g.ui.closeAll(); }
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
      for (; t < 25; t += 1 / 30) {
        const dx = x - pl.pos.x, dz = z - pl.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.25) break;
        pl.autoDir = { x: dx / d, z: dz / d, m: 0.85 };
        __noEnemies();
        g.update(1 / 30);
      }
      pl.autoDir = null;
      if (t >= 25 || pl.dead) return { stuck: [x, z], pos: [pl.pos.x, pl.pos.y, pl.pos.z].map(r2), dead: pl.dead };
    }
    __sim(0.3);
    return { pos: [pl.pos.x, pl.pos.y, pl.pos.z].map(r2), zone: g.zone && g.zone.id };
  };
  // por la rejilla de navegación de su nivel (las cloacas hondas)
  window.__ruta = (x, z, y) => {
    const pl = g.player;
    const h = g.navHondas.find((q) => pl.pos.y > q.y0 && pl.pos.y < q.y1);
    if (!h) return 'SIN NAV';
    const r = h.nav.path(pl.pos.x, pl.pos.z, x, z, 60000, pl.pos.y, y ?? pl.pos.y);
    if (!r || !r.pts) return { sinCamino: [x, z] };
    const w = __walk([...r.pts.slice(1).map((q) => [q[0], q[1]]), [x, z]]);
    return { ...w, n: r.pts.length, completo: r.complete };
  };
});
const T = (s) => p.evaluate(s);
const out = [];
const run = async (name, s) => out.push(name + ': ' + JSON.stringify(await T(s)));
const t0 = Date.now();
// 1. la despensa de la taberna, la trampilla y la bajada
await run('despensa', "(()=>{const g=__game;g.player.spawn(-16.6,0,-14.3,Math.PI/2);__sim(0.5);return __walk([[-15.9,-14.0]])})()");
await run('sin palanca', "(()=>{const r=__useHere('h_bodega_arriba');return {...r, abierta: !!__game.flags['hatch:bodega']}})()");
await run('con palanca', "(()=>{__game.inventory.add('palanca');const r=__useHere('h_bodega_arriba');return {...r, abierta: !!__game.flags['hatch:bodega']}})()");
await run('baja', "(()=>{const g=__game;__useHere('h_bodega_arriba');__sim(2.0);const p=g.player.pos;return {pos:[p.x,p.y,p.z].map(v=>+v.toFixed(2)), zona: g.zone&&g.zone.id}})()");
await run('bodega y galería', "__walk([[-15.8,-14.6],[-15.3,-12.6],[-15.3,-11.6],[-15.3,-10.2],[-15.3,-9.0],[-15.3,-1.0],[-15.3,8.2],[-15.2,9.6]])");
await run('escalera sala', "__walk([[-13.9,9.7],[-12.6,9.7],[-11.0,9.7],[-9.0,9.7],[-7.0,9.7],[-6.6,10.6],[-6.9,12.6],[-7.6,14.6],[-8.2,16.3]])");
await run('hablar', "(()=>{const g=__game;const r=__useHere('t_desfigurado');for(let k=0;k<40;k++){g.speech.skip(g.desfigurado.who);__sim(0.4);}return {...r, met: !!g.flags['desf:met'], flor: g.inventory.has('flor_blanca')}})()");
// 2. por la reja doblada a la galería del desagüe, el rellano y su escalera
await run('a la reja', "__walk([[-6.0,22.4],[-4.0,25.0],[-1.0,25.05]])");
await run('reja y galería', "(()=>{const r=__walk([[0.6,25.05],[2.6,25.05],[4.6,25.05]]);return {...r, zona: __game.zone&&__game.zone.id}})()");
await run('rellano', "__walk([[6.2,25.2],[5.85,25.9]])");
await run('escalera del rellano', "__walk([[5.85,27.4],[5.85,29.4],[6.4,30.6]])");
// 3. el colector: la fuente, la botica y él
await run('a la fuente', "__walk([[12.5,29.0],[17.5,29.4],[22.5,32.4],[31.0,32.6],[31.6,29.4]])");
await run('fuente', "__useHere('x_fuente_vergel')");
await run('a la botica', "__walk([[31.0,32.6],[24.5,33.5],[17.5,33.6],[12.5,32.6],[7.0,32.6],[6.6,36.0],[7.6,38.8],[10.3,39.6]])");
await run('cuaderno', "(()=>{const g=__game;__walk([[10.0,40.3]]);const r=__useHere('n_remedios');g.ui.closeAll();g.state='play';return r})()");
await run('ya no está en la luz', "(()=>{const g=__game;g.player.spawn(-16.6,0,-14.3,Math.PI/2);__sim(0.8);g.player.spawn(7.6,-11.5,38.8,Math.PI);__sim(1.0);const e=g.desfigurado.npc;return {sitio:g.desfigurado.sitio,pos:[e.pos.x,e.pos.y,e.pos.z].map(v=>+v.toFixed(2))}})()");
const charla = (flag) => "(()=>{const g=__game;g.ui.closeAll();g.state='play';__sim(0.2);const r=__useHere('t_desfigurado');const said=[];const sp=g.speech;for(let k=0;k<40;k++){const b=sp.list.get(g.desfigurado.who.id);if(b&&b.line&&said[said.length-1]!==b.line)said.push(b.line.slice(0,48));sp.skip(g.desfigurado.who);__sim(0.4);g.ui.closeAll();g.state='play';}return {ok:r.ok,flag:!!g.flags['" + flag + "'],verde:g.inventory.count('cocimiento_verde'),llave:g.inventory.has('llave_reja'),raiz:g.inventory.has('raiz_vergel'),dijo:said.length,primera:said[0]}})()";
await run('la vida', charla('desf:vida'));
await run('la cura', charla('desf:cura'));
await run('la peste', charla('desf:peste'));
await run('lo oscuro', charla('desf:oscuro'));
await run('la llave', charla('desf:llave'));
await run('sus cosas', charla('desf:llave'));
await run('la mesa', "(()=>{const g=__game;__walk([[7.0,38.6],[7.2,39.7]]);const r=__useHere('mesa_desf');const s=g.ui.top;const ents=s&&s.data.entries.map(e=>e.label+(e.off?' (no)':''));g.ui.closeAll();g.state='play';__sim(0.4);return {r:r.ok,pantalla:s&&s.name,ents}})()");
// 4. la raya, la galería de la Sé y su reja
await run('a la raya', "__walk([[7.0,33.0],[12.5,29.0],[17.5,26.5],[17.5,24.0],[21.4,24.0],[22.5,19.0],[27.5,14.6]])");
await run('raya', "__useHere('x_raya')");
await run('a la reja', "(()=>{const r=__walk([[27.5,12.4],[27.5,9.8],[27.5,7.4]]);return {...r,zona:__game.zone&&__game.zone.id}})()");
await run('reja sin llave', "(()=>{const g=__game;const had=g.inventory.count('llave_reja');g.inventory.add('llave_reja',-had);const r=__useHere('d_reja_se');g.inventory.add('llave_reja',had);return {...r,abierta:!!g.flags['door:d_reja_se']}})()");
await run('reja con llave', "(()=>{const g=__game;const r=__useHere('d_reja_se');__sim(1.5);return {...r,abierta:!!g.flags['door:d_reja_se'],cadena:g.groups['reja_se_cadena']&&g.groups['reja_se_cadena'].on}})()");
await run('escalera de la Sé', "(()=>{const r=__walk([[27.5,4.8],[27.5,1.0],[27.5,-1.4],[27.5,-6.0],[27.5,-10.0],[27.5,-12.8]]);return {...r,zona:__game.zone&&__game.zone.id}})()");
// 5. la lobera: la niebla, y el Lobishome (vencido aquí, a mano); por el
// laberinto a su salida
await run('niebla', "(()=>{const g=__game;const r=__useHere('f_lobo');__sim(3.6);const e=g.bosses.lobishome;e.takeHit(1e5,99,e.pos.x+1,e.pos.z,true);__sim(5);return {...r,muerto:e.dead,flag:!!g.flags['boss:lobishome'],niebla:g.fogActive(g.interact.list.find(i=>i.id==='f_lobo'))}})()");
await run('el laberinto', "__ruta(-4.5,-56,-17)");
await run('a la bajada', "__walk([[-8.0,-56.0],[-12.5,-56.0],[-12.5,-54.6]])");
await run('escalera a las viejas', "(()=>{const r=__walk([[-12.5,-52.0],[-12.5,-47.0],[-12.5,-42.6],[-12.5,-40.0]]);return {...r,zona:__game.zone&&__game.zone.id}})()");
// 6. las cloacas viejas hasta su bajada
await run('las viejas', "__ruta(-12.5,30,-23)");
await run('escalera a los aljibes', "(()=>{const r=__walk([[-12.5,32.0],[-12.5,37.0],[-12.5,42.0],[-12.5,46.0]]);return {...r,zona:__game.zone&&__game.zone.id,vadeo:__game.player.vadeo}})()");
// 7. los aljibes: el agua a la rodilla (se va despacio)
await run('aljibe primero', "(()=>{const g=__game;const t=g.time;const r=__ruta(-0.8,54,-29.4);return {...r,s:+(g.time-t).toFixed(1)}})()");
await run('aljibe segundo', "__walk([[2.8,54.0],[5.4,54.0],[5.4,45.2],[14.5,45.2],[14.5,43.4]])");
await run('escalera a lo hondo', "(()=>{const r=__walk([[14.5,42.0],[14.5,37.0],[14.5,32.6],[14.5,30.0]]);return {...r,zona:__game.zone&&__game.zone.id}})()");
// 8. lo hondo: el ninfeo, la cosecha
await run('al ninfeo', "__ruta(11.8,16.6,-35)");
await run('raíz', "(()=>{const g=__game;const r=__useHere('i_c_raiz1');__sim(1.0);return {...r,raiz:g.inventory.count('raiz_amarga')}})()");
await run('al semillero', "__ruta(-4.5,-4.8,-35)");
await run('flor', "(()=>{const g=__game;const r=__useHere('i_c_flor1');__sim(1.0);return {...r,flor:g.inventory.count('flor_hondo')}})()");
await run('musgo', "(()=>{const g=__game;const w=__ruta(-4.0,8.2,-35);const r=__useHere('i_c_musgo5');__sim(1.0);return {w,...r,musgo:g.inventory.count('musgo_luz')}})()");
// 9. el pozo de la tapa: arriba, al Vergel
await run('al pozo', "__ruta(32.5,33.0,-35)");
await run('sube', "(()=>{const g=__game;const r=__useHere('pozo_tapa');__sim(2.2);const q=g.player.pos;return {...r,pos:[q.x,q.y,q.z].map(v=>+v.toFixed(2)),zona:g.zone&&g.zone.id,tapa:!!g.flags['tapa:abierta']}})()");
// 10. a la mesa: cocer
await run('cocer', "(()=>{const g=__game;g.player.spawn(7.4,-11.5,39.6,Math.PI/2);__sim(0.5);g.inventory.add('musgo_luz',4);g.inventory.add('raiz_amarga',2);const r=__useHere('mesa_desf');const s=g.ui.top;if(s&&s.name==='mesa'){s.data.entries[1].action();s.data.entries[0].action();}g.ui.closeAll();g.state='play';return {r:r.ok,verde:g.inventory.count('cocimiento_verde'),negro:g.inventory.count('cocimiento_negro')}})()");
out.push('segundos: ' + Math.round((Date.now() - t0) / 1000));
console.log(out.join('\n'));
console.log(logs.join('\n') || 'sin errores');
await b.close();
