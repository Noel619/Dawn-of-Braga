// Recorre andando el barrio de los Pellejeros, de la plaza de la Herrería a
// los Pelames, por donde lo andaría uno (sin el Físico ni sus trampas, y sin
// el equilibrio de las vigas): el arco de la rúa (la palanca), la casa del
// zapatero (su libro), la de la cerera (la escalera, la viga del balcón, la
// llave, la tranca de la alcoba, el oratorio, la puerta de la plazuela), la
// tintorería (la llave, la nota, los dos tramos de su escalera, el
// secadero), el desván del zapatero (la piedra del aprendiz), la rampa de
// escombros, los tejados, la viga de la rúa, la quemada, el tejado de la
// Casa de los Inocentes y su claraboya; por dentro, el desván (el tratado),
// la escalera de ida y vuelta, la alcoba (la historia), la galería, el
// estudio, la botica (el tratado), el zaguán y la sala grande; vencido el
// Físico (de un golpe, la escena saltada), su patio, el callejón y la
// cordelería. Dice dónde se atasca.
//   node tools/barriowalk.mjs        (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 480, height: 270 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
await p.goto('http://localhost:' + (process.env.PORT || 5199) + '/?dev=1&items=espada,escudo,palanca');
await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  g.input.enabledPointerLock = false;
  g.input.onPointerLockLost = null;
  g.ui.closeAll();
  g.state = 'play';
  g.dev.god = true;
  window.__noEnemies = () => g.enemies.forEach((e) => { if (!e.boss && !e.dead) { e.dead = true; e.state = 'dead'; e.stT = 99; e.obj.visible = false; } });
  window.__toast = () => [...document.querySelectorAll('.toast')].map((t) => t.textContent).slice(-1)[0];
  window.__useHere = (id) => {
    const it = g.interact.list.find((i) => i.id === id);
    if (!it) return 'NO EXISTE ' + id;
    const pl = g.player;
    pl.yaw = Math.atan2((it.ix ?? it.x) - pl.pos.x, (it.iz ?? it.z) - pl.pos.z);
    __sim(0.1);
    if (!g.promptTarget || g.promptTarget.id !== id) return { ok: false, id, prompt: g.promptTarget && g.promptTarget.id, pos: [pl.pos.x, pl.pos.y, pl.pos.z].map((v) => +v.toFixed(2)) };
    __sim(0.2, [], ['KeyE']);
    for (let k = 0; k < 3; k++) if (g.ui.modal) { __sim(0.5); __sim(0.1, [], ['KeyE']); }
    __sim(1.5);
    g.ui.closeAll();
    return { ok: true, id, done: it.done, toast: __toast(), pos: [pl.pos.x, pl.pos.y, pl.pos.z].map((v) => +v.toFixed(2)) };
  };
  window.__walk = (pts) => {
    const pl = g.player;
    for (const [x, z] of pts) {
      let t = 0;
      for (; t < 20; t += 1 / 30) {
        const dx = x - pl.pos.x, dz = z - pl.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.25) break;
        pl.autoDir = { x: dx / d, z: dz / d, m: 1 };
        __noEnemies();
        g.update(1 / 30);
      }
      pl.autoDir = null;
      if (t >= 20 || pl.dead) return { stuck: [x, z], pos: [pl.pos.x, pl.pos.y, pl.pos.z].map((v) => +v.toFixed(2)), dead: pl.dead, zone: g.zone && g.zone.id };
    }
    __sim(0.3);
    return { pos: [pl.pos.x, pl.pos.y, pl.pos.z].map((v) => +v.toFixed(2)), zone: g.zone && g.zone.id, hp: Math.round(pl.hp) };
  };
  // (sin el Físico, sus trampas ni el equilibrio)
  window.__fu = g.fisico.update;
  g.fisico.update = () => {};
  g.trampas.update = () => {};
  g.cornisas.update = () => {};
  g.flags['fisico:intro'] = true;
  g.player.spawn(12.4, 0, 44.5, Math.PI / 2);
  __noEnemies();
  __sim(0.3);
});
const steps = [
  "__useHere('d_porton')",
  // la casa del zapatero: su puerta (entornada), el zaguán, el obrador y su libro
  "__walk([[17,44.5],[27,42.1]])", "__useHere('d_zapatero')",
  "__walk([[27,40.2],[27,38],[24.6,36.8],[22.0,37.6]])", "__useHere('n_zapatero')",
  "__walk([[24.6,36.8],[27,38.5],[27,41.8]])",
  // la cerera: la puerta, la escalera (contra la muralla), la sala
  "__walk([[27.5,46.4]])", "__useHere('d_viuda')",
  "__walk([[27.5,49.6],[26.2,54.0],[25.1,55.4],[25.1,56.65],[26.4,56.65],[30.7,56.65],[31.2,55.6],[30.4,52.0]])",
  // por la ventana de la sala, a la viga; por ella, a la de la alcoba; la llave
  "__walk([[24.5,49.2],[24.5,47.75],[23.6,47.7],[18.4,47.7],[17.5,47.75],[17.5,49.6],[17.2,50.2]])", "__useHere('i_llave_tinte')",
  // la tranca de la alcoba (por dentro), el oratorio, abajo, la puerta de la plazuela
  "__walk([[19.6,54.6]])", "__useHere('d_alcoba')",
  "__walk([[21.8,54.6],[31.7,53.2]])", "__useHere('a_viuda')",
  "__walk([[31.2,55.4],[30.6,56.65],[26.0,56.65],[25.1,56.65],[25.1,55.0],[27.5,52.5],[32.9,50.0]])", "__useHere('d_viuda_patio')",
  "__walk([[35.0,50.0],[40.0,44.0],[40.0,42.4]])", "__useHere('d_tinte')",
  // la tintorería: entre las tinas, al pie de la escalera; arriba, la nota
  "__walk([[40.0,39.8],[40.0,37.5],[35.0,37.0],[34.95,33.8],[34.95,32.35],[36.0,32.35],[40.3,32.35],[41.6,33.4],[41.6,36.6]])", "__useHere('n_tintorero')",
  // el segundo tramo, al secadero; el paso al desván del zapatero; la piedra
  "__walk([[41.2,33.95],[40.3,33.95],[35.4,33.95],[35.0,35.0],[35.0,36.0],[33.0,36.0],[17.0,36.0]])", "__useHere('i_piedra')",
  // la rampa de escombros, el boquete, el tejado, la viga de la rúa
  "__walk([[30.4,35.0],[30.4,39.3],[30.45,40.2],[30.6,41.2],[30.6,47.7],[30.8,49.2]])",
  // el tejado de la cerera, la quemada (por la cumbrera), la Casa y su claraboya
  "__walk([[33.4,54.6],[35.0,55.35],[44.0,55.35],[49.6,55.4],[51.0,52.0],[53.6,47.2],[54.6,46.2]])",
  // el desván: el tratado, la escalera de ida y vuelta (dos tramos), la alcoba y la historia
  "__walk([[56.4,48.0],[58.6,51.6],[59.9,53.8]])", "__useHere('n_tratado2')",
  "__walk([[56.4,51.0],[56.4,38.6],[56.4,37.05],[55.6,37.05],[51.2,37.05],[50.7,37.05],[50.7,35.45],[51.7,35.45]])",
  "__walk([[50.7,35.45],[50.7,38.6],[53.0,40.4],[53.0,42.0],[52.6,44.5]])", "__useHere('n_historia')",
  // la galería, el estudio, la botica y el otro tratado
  "__walk([[56.2,45.7],[58.2,45.7],[58.2,50.0],[58.2,52.2],[58.2,54.4],[56.0,54.4],[54.4,53.2]])", "__useHere('n_tratado1')",
  // abajo, por el primer tramo, al zaguán; la sala grande
  "__walk([[56.0,54.4],[58.2,54.4],[58.2,52.2],[58.2,45.7],[56.2,45.7],[53.0,42.0],[53.0,40.4],[50.7,38.6],[50.7,35.45],[51.7,35.45],[56.5,35.45],[56.5,38.0],[55.6,44.0]])", "__useHere('d_sala_inocentes')", "__walk([[58.5,44.0],[60.0,45.0]])",
  // vencido de un golpe (la escena, saltada): la llave de la cordelería y la puerta del patio
  "(()=>{const g=__game;g.flags['fisico:caza']=true;g.fisico.update=window.__fu;__sim(0.5);const F=g.fisico,e=F.e;const st=F.modo;e.hp=1;e.die();for(let i=0;i<30&&g.cutscene;i++){g.cutscene.skip();__sim(0.2)}g.ui.closeAll();__sim(1);g.ui.closeAll();g.fisico.update=()=>{};return {pelea:st,boss:!!g.flags['boss:fisico'],llave:g.inventory.has('llave_cordeleria'),patio:!!g.flags['door:d_quirofano_patio'],sentado:e.dead&&e.obj.visible}})()",
  "__walk([[59.6,40.0],[61.3,36.4],[61.3,33.0],[52.0,28.1],[50.6,28.1]])", "__useHere('d_patio_inocentes')",
  "__walk([[48,28],[46.7,27]])", "__useHere('d_cordeleria_atras')",
  "__walk([[44,26.5],[40.9,23],[41.8,20.9],[42.3,20.9],[42.85,20.4],[42.85,16],[42.6,12],[39.75,11.9],[39.7,11.3],[39.7,6.6],[41.6,8.6]])", "__useHere('n_cordelero')",
  "__walk([[40.9,3.8]])", "__useHere('d_cordeleria')",
  "__walk([[40.9,1.5],[30,0]])",
];
let fails = 0;
for (const s of steps) {
  const r = await p.evaluate(s);
  const bad = r && (r.stuck || r.ok === false || r.dead || typeof r === 'string');
  if (bad) fails++;
  console.log((bad ? '✗ ' : '  ') + s.slice(0, 70).padEnd(70), JSON.stringify(r));
}
console.log(fails ? `${fails} pasos con problemas` : 'todo el barrio, andando: bien');
if (logs.length) console.log(logs.join('\n'));
await b.close();
