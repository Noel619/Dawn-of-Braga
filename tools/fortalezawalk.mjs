// La fortaleza a pie (PLAN_FORTALEZA.md, fases 1 y 2): de la coracha a todas
// sus salas, por sus caracoles, sus escaleras, sus tribunas, su galería y su
// pasadizo, abriendo sus puertas y cogiendo lo que hay en ellas, como un
// jugador (andando de punto en punto, sin teletransportes salvo para volver).
//   node tools/fortalezawalk.mjs      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 480, height: 270 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
await p.goto('http://localhost:5199/?dev=1&items=espada,escudo');
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
  // los peldaños de un caracol (el del rincón del sureste de una torre: x1,
  // z1), de u0 a u1
  window.__caracol = (x1, z1, u0, u1) => {
    const cx = x1 - 1.6, cz = z1 - 1.6, r = 0.95;
    const pts = [];
    const st = u1 > u0 ? 1 : -1;
    for (let u = u0; st > 0 ? u <= u1 : u >= u1; u += st) {
      const a = ((270 + 22.5 * (u + 0.5)) * Math.PI) / 180;
      pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
    }
    return __walk(pts);
  };
});
const T = (s) => p.evaluate(s);
const out = [];
const step = async (name, s) => {
  const r = await T(s);
  out.push(name + ': ' + JSON.stringify(r));
};
// 1. de la coracha a la torre de la coracha (a su altura), el altar
await step('coracha', "(()=>{const g=__game;g.player.spawn(-60,9,-100.8,Math.PI);__sim(0.5);return __walk([[-60,-95.4],[-63,-95.4],[-66.5,-95.4]])})()");
await step('altar', "(()=>{__walk([[-71.0,-95.2]]);return __useHere('a_coracha')})()");
// 2. la escalera al pasadizo (+12) y el pasadizo hasta la puerta de la torre del homenaje
await step('escalera pasadizo', "__walk([[-66.6,-97.4],[-66.4,-99.3],[-71.8,-99.1],[-73.4,-98.8]])");
await step('pasadizo', "__walk([[-75,-98.79],[-77,-98.79],[-81,-98.79],[-83.6,-98.79]])");
await step('puerta torre', "__useHere('x_puerta_pasadizo')");
await step('vuelta', "__walk([[-77,-98.79],[-74.5,-98.79],[-72.8,-99.1],[-67.2,-99.3],[-66.4,-97],[-66.4,-93.4],[-66.4,-91.0]])");
// 3. el caracol abajo, al oratorio del Rey (+4,5): la tribuna de la capilla y la llave del capellán
await step('baja al oratorio', "__caracol(-64,-88,31,15)");
await step('sale al oratorio', "__walk([[-66.4,-92.6],[-68,-92.6],[-68,-89.0],[-73.3,-89.0],[-73.3,-87.4],[-73.5,-85.6]])");
await step('llave capellan', "__ir('i_llave_capellan', 0.6)");
await p.waitForTimeout(600);
await step('cordón suelto', "(()=>{const g=__game;return {tenso:g.groups['cordon:tenso']&&g.groups['cordon:tenso'].meshes.some(m=>m.visible),suelto:g.groups['cordon:suelto']&&g.groups['cordon:suelto'].meshes.some(m=>m.visible)}})()");
await step('tribuna', "__walk([[-73.6,-80],[-73.6,-70],[-73.6,-63.0],[-68,-62.6],[-65.2,-63.2]])");
await step('baja tribuna', "__walk([[-65.2,-64.4],[-65.2,-71.4],[-68.6,-72.4],[-68.6,-68.6],[-74.2,-68]])");
await step('altar capilla', "(()=>{__walk([[-68.6,-68.6],[-68.6,-79],[-69.6,-83.4]]);return __useHere('a_capilla_real')})()");
// 4. la cámara del Rey (por el oratorio) y su escalera a la antecámara
await step('a la cámara', "(()=>{const g=__game;g.player.spawn(-70,4.5,-93,Math.PI);__sim(0.3);return __walk([[-73.4,-95.6],[-75,-95.6],[-77.6,-95.6]])})()");
await step('baja a la antecámara', "__walk([[-82.0,-96.4],[-84.25,-96.4],[-84.25,-95.2],[-84.25,-89.0],[-82.4,-88.6]])");
// 5. el caracol abajo, al tesoro: la llave del camarero y su nota
await step('tesoro', "(()=>{const g=__game;g.player.spawn(-66.5,9,-95.4,Math.PI);__sim(0.3);__walk([[-66.4,-93.4],[-66.4,-91.0]]);return __caracol(-64,-88,31,1)})()");
await step('sale', "__walk([[-64.8,-91.2],[-64.8,-92.6],[-68,-94]])");
await step('llave camarero', "(()=>{const it=__game.interact.list.find(i=>i.id==='i_llave_camarero');__walk([[it.x+0.6,it.z-1.0]]);return __useHere('i_llave_camarero')})()");
await step('nota camarero', "__ir('n_camarero', 0.8)");
// 6. la puerta del tesoro (atrancada por dentro), la antecámara y su puerta al patio
await step('a la puerta del tesoro', "__walk([[-72,-92.8],[-73.4,-92.8]])");
await step('d_tesoro', "__useHere('d_tesoro')");
await step('antecámara', "__walk([[-76.4,-92.8],[-80,-92.8],[-82.8,-89]])");
await step('d_antecamara', "__ir('d_antecamara', 0.9)");
await step('al patio', "__walk([[-82.8,-85.4],[-84,-80],[-90,-72]])");
// 7. la cancillería y el Tombo: el caracol hasta arriba, el arca de los tres sellos
await step('d_cancilleria', "(()=>{__walk([[-78,-52]]);return __ir('d_cancilleria', 1.0)})()");
await step('sala', "__walk([[-73.6,-52],[-69.2,-50],[-69.2,-47.4]])");
await step('d_tombo', "__ir('d_tombo', 1.0)");
await step('Tombo', "__walk([[-69.2,-44.4],[-69.2,-42],[-64.8,-39.6],[-64.8,-38.0]])");
await step('sube', "(()=>{__walk([[-64.9,-37.9],[-65.25,-37.0]]);return __caracol(-64,-34,0,47)})()");
await step('arriba', "__walk([[-66.5,-36.7],[-66.5,-38.4],[-66.5,-41.0],[-70,-41]])");
await step('arca', "__ir('a_camara3', 0.3)");
await p.waitForTimeout(2500);
await step('llave del canciller', "(()=>{const g=__game;g.ui.closeAll();return {llave:g.inventory.has('llave_canciller'),estado:g.state,ps:g.player.state,modal:g.ui.stack.map(s=>s.name)}})()");
// 8. el servicio, la cocina y el secadero; la galería del salón, a la torre de la reina
await step('al patio otra vez', "(()=>{const g=__game;g.player.spawn(-100,0,-55,Math.PI);__sim(0.3);return __walk([[-110,-50],[-114,-47.6]])})()");
await step('d_despensa', "__useHere('d_despensa')");
await step('despensa', "__walk([[-114,-44.2],[-116,-42],[-123.6,-42],[-123.6,-44.5]])");
await step('d_servicio', "__useHere('d_servicio')");
await step('salón', "__walk([[-123.6,-47.8],[-123.6,-49.0],[-124.2,-50.4],[-124.4,-52],[-128.4,-56],[-128.4,-62]])");
await step('cocina', "(()=>{const g=__game;g.player.spawn(-124,0,-38.6,-Math.PI/2);__sim(0.3);__walk([[-125.4,-38.6]]);const r=__useHere('d_cocina');const w=__walk([[-127,-38.6],[-129.0,-38.6],[-128.9,-40.9],[-128.9,-42.0]]);return {r,w}})()");
await step('secadero', "__walk([[-131,-42.05],[-134.6,-42.05],[-136.8,-42.2]])");
await step('galería', "__walk([[-136.8,-43.6],[-136.8,-46],[-136.8,-60],[-136.8,-75],[-136.8,-86.8]])");
await step('paje', "__ir('n_paje', 0.6)");
await step('a la torre de la reina', "__walk([[-136.8,-86.8],[-136.8,-88.4],[-136.8,-90.4],[-133.5,-91.4]])");
await step('relicario', "__ir('i_relicario_reina', 0.9)");
await step('al caracol', "__walk([[-131.5,-93.6],[-130.4,-93.4],[-130.4,-92.2]])");
await step('sube a la cámara', "__caracol(-128,-89.2,15,31)");
await step('cámara de la reina', "__walk([[-130.4,-92.2],[-130.4,-94.4],[-131.5,-96.0]])");
await step('libro de horas', "__ir('n_reina', 0.7)");
await step('baja', "(()=>{__walk([[-130.4,-94.4],[-130.4,-92.2]]);return __caracol(-128,-89.2,31,0)})()");
await step('estrado', "(()=>{__walk([[-128.8,-93.4],[-128.8,-94.0]]);const d=__useHere('d_torre_reina');const w=__walk([[-126.6,-94.0],[-124,-94.0],[-120,-91]]);return {d,w}})()");
await step('d_reina', "__ir('d_reina', 0.9)");
await step('sala de la reina', "(()=>{const g=__game;g.player.spawn(-131.5,5.5,-94,Math.PI/2);__sim(0.3);__walk([[-128.8,-94.0]]);const d=__useHere('d_sala_reina');const w=__walk([[-126.6,-94.0],[-123,-94.0],[-117,-94]]);return {d,w}})()");
// 9. la Corte; el cuerpo de guardia y la puerta (el rastrillo)
await step('corte', "(()=>{const g=__game;g.player.maxHp=g.player.hp=1e6;g.player.spawn(-128.4,0,-60,Math.PI);__sim(0.3);const w=__walk([[-128.4,-64],[-124.3,-66],[-124.3,-80],[-124.3,-83.5]]);return {w,estado:g.corte.state,y:+g.player.pos.y.toFixed(2)}})()");
await step('guardia', "(()=>{const g=__game;g.corte.onRespawn&&g.corte.onRespawn();g.player.spawn(-85,0,-52,0);__sim(0.3);__walk([[-82,-47.6]]);const r=__useHere('d_guardia');const w=__walk([[-82,-44],[-86,-41.6]]);return {r,w}})()");
await step('rastrillo', "(()=>{const g=__game;g.player.spawn(-98,0,-50,0);__sim(0.3);return __walk([[-98,-46],[-98,-40],[-98,-32]])})()");
out.push('llaves: ' + (await T("['llave_camarero','llave_capellan','llave_canciller'].map(k=>k+':'+__game.inventory.has(k)).join(' ')")));
console.log(out.join('\n'));
console.log(logs.slice(0, 10).join('\n'));
await b.close();
