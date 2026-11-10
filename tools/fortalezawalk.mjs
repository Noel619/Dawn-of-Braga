// La fortaleza a pie (PLAN_FORTALEZA.md, fases 1 a 6): de la coracha a todas
// sus salas, por sus caracoles, sus escaleras, sus tribunas, su galería y su
// pasadizo; la torre del homenaje, de abajo arriba, y la puerta, con su
// guardia, su torno, su puente y su cadalso; la cárcel, de la trampilla del
// almacén de la torre al rastrillo de la mazmorra del castillo; abriendo sus
// puertas y cogiendo lo que hay en ellas, como un jugador (andando de punto en
// punto, sin teletransportes salvo para volver).
//   node tools/fortalezawalk.mjs      (requiere npx vite --port 5199)
//   SOLO4=1 node tools/fortalezawalk.mjs   (sólo lo de la fase 4)
//   SOLO5=1 node tools/fortalezawalk.mjs   (sólo lo de la fase 5: la cárcel)
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
// (SOLO4=1: sólo lo de la fase 4, los recorridos 12 a 14; SOLO5=1, sólo lo de
// la fase 5, el 15; SOLO7=1, sólo lo de la fase 7, el 16)
const solo = process.env.SOLO4 ? 4 : process.env.SOLO5 ? 5 : process.env.SOLO7 ? 7 : 0;
const run = async (name, s) => {
  const r = await T(s);
  out.push(name + ': ' + JSON.stringify(r));
};
const step = async (name, s) => {
  if (!solo) await run(name, s);
};
const step4 = async (name, s) => {
  if (!solo || solo === 4) await run(name, s);
};
const step5 = async (name, s) => {
  if (!solo || solo === 5) await run(name, s);
};
const step7 = async (name, s) => {
  if (!solo || solo === 7) await run(name, s);
};
// 1. de la coracha a la torre de la coracha (a su altura), el altar
await step('coracha', "(()=>{const g=__game;g.player.spawn(-60,9,-100.8,Math.PI);__sim(0.5);return __walk([[-60,-95.4],[-63,-95.4],[-66.5,-95.4]])})()");
await step('altar', "(()=>{__walk([[-71.0,-95.2]]);return __useHere('a_coracha')})()");
// 2. la escalera al pasadizo (+12) y el pasadizo hasta la puerta de la torre del homenaje
await step('escalera pasadizo', "__walk([[-66.6,-97.4],[-66.4,-99.3],[-71.8,-99.1],[-73.4,-98.8]])");
await step('pasadizo', "__walk([[-75,-98.79],[-77,-98.79],[-81,-98.79],[-83.6,-98.79]])");
await step('puerta torre', "__useHere('d_pasadizo_torre')");
await step('vuelta', "__walk([[-77,-98.79],[-74.5,-98.79],[-72.8,-99.1],[-67.2,-99.3],[-66.4,-97],[-66.4,-93.4],[-66.4,-91.0]])");
// 3. el caracol abajo, al oratorio del Rey (+4,5): la tribuna de la capilla y la llave del capellán
await step('baja al oratorio', "__caracol(-64,-88,31,15)");
// (fase 7: lo que le faltaba al oratorio) la oración del Rey, en su reclinatorio
await step('oración del Rey', "(()=>{__walk([[-66.4,-92.6],[-68,-92.6],[-68,-90.6]]);return __ir('n_oracion_rey', 0.9)})()");
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
await step('corte', "(()=>{const g=__game;g.player.maxHp=g.player.hp=1e6;g.player.spawn(-128.4,0,-60,Math.PI);__sim(0.3);const w=__walk([[-128.4,-64],[-124.3,-66],[-124.3,-80],[-124.3,-82.9]]);return {w,estado:g.corte.state,y:+g.player.pos.y.toFixed(2)}})()");
await step('guardia', "(()=>{const g=__game;g.corte.onRespawn&&g.corte.onRespawn();g.player.spawn(-85,0,-52,0);__sim(0.3);__walk([[-82,-47.6]]);const r=__useHere('d_guardia');const w=__walk([[-82,-44],[-86,-41.6]]);return {r,w}})()");
await step('rastrillo', "(()=>{const g=__game;g.player.spawn(-98,0,-50,0);__sim(0.3);return __walk([[-98,-46],[-98,-40],[-98,-32]])})()");
// (fase 7: lo que le faltaba al zaguán) el de la guardia, contra el rastrillo, y las buhederas
await step('el del rastrillo', "__ir('x_zaguan_muerto', 0.5)");
await step('buhederas', "__ir('x_buhederas', 0.6)");
// 10. la torre del homenaje: por el pasadizo (su puerta, ya caída), la sala
// del consejo y la cámara (+12); por el caracol, la guardia (+6) y la puerta
// de la escalinata; el almacén (la trampilla de la cárcel, la ampolla); la
// sala del trono (+18: el Rey), la galería y la terraza (la niebla)
await step('al consejo', "(()=>{const g=__game;g.player.spawn(-82,12,-98.79,-Math.PI/2);__sim(0.3);return __walk([[-84.4,-98.79],[-86.4,-98.79],[-88.4,-98.79],[-92,-99]])})()");
await step('a la cámara', "__walk([[-95,-99.8],[-95,-101],[-95,-102.6],[-100,-104.6],[-104.2,-108.6]])");
await step('caracol a la guardia', "(()=>{__walk([[-105.2,-108.6],[-105.85,-108.1]]);return __husillo(-106.8,-107.8,0,31,15)})()");
await step('guardia de la torre', "__walk([[-105.3,-108.5],[-104.2,-108.6],[-102,-106],[-102,-102.6],[-102,-101],[-102,-99.4],[-98,-92],[-98,-89.6]])");
await step('d_torre_patio', "__useHere('d_torre_patio')");
await step('rellano', "__walk([[-98,-88.4],[-98,-87],[-98,-85.4]])");
await step('al caracol', "__walk([[-98,-87],[-98,-92],[-102,-99.4],[-102,-102.6],[-104.2,-108.6]])");
await step('caracol abajo', "(()=>{__walk([[-105.2,-108.6],[-105.85,-108.1]]);return __husillo(-106.8,-107.8,0,15,0)})()");
// (fase 7: lo que le faltaba al granero) la muela de mano y su artesa
await step('muela del granero', "(()=>{__walk([[-105.5,-107.2],[-104.2,-107.0],[-100,-104],[-98.2,-102.9],[-96.4,-102.9]]);return __useHere('x_muela_torre')})()");
await step('almacén', "__walk([[-95,-102.6],[-95,-101],[-95,-99.4],[-97,-96]])");
await step('ampolla', "__ir('i_ampolla5', 0.8)");
// (sin la palanca, la trampilla de la cárcel no se abre: se mira)
await step('trampilla', "__ir('t_bajada_carcel', 0.5)");
await step('caracol al trono', "(()=>{__walk([[-97,-96],[-95,-99.4],[-95,-102.6],[-100,-104],[-104.2,-107.0],[-105.2,-107.2],[-105.87,-107.6]]);return __husillo(-106.8,-107.8,0,0,47)})()");
await step('sala del trono', "__walk([[-105.3,-108.5],[-104.2,-108.6],[-101,-106],[-98,-102.5],[-98,-100.5],[-98,-96.2]])");
await step('el Rey', "(()=>{const g=__game;g.player.yaw=0;__sim(0.2);return {prompt:g.promptTarget&&g.promptTarget.id,rey:g.rey.mode}})()");
await step('caracol a la galería', "(()=>{__walk([[-98,-100.5],[-98,-102.5],[-101,-106],[-104.2,-108.6],[-105.2,-108.6],[-105.85,-108.1]]);return __husillo(-106.8,-107.8,0,47,59)})()");
await step('galería', "__walk([[-107.6,-108.9],[-107.6,-109.9],[-107.6,-110.7],[-100,-110.7],[-90,-110.7],[-86.3,-110.7],[-86.3,-100],[-86.3,-90]])");
await step('virotes galería', "__ir('i_virotes_trono', 0.6)");
await step('caracol a la terraza', "(()=>{__walk([[-86.3,-100],[-86.3,-110.7],[-100,-110.7],[-107.6,-110.7],[-107.6,-109.9],[-107.6,-108.9],[-107.4,-108.6]]);return __husillo(-106.8,-107.8,1350,0,19)})()");
await step('niebla del Caballero', "(()=>{const g=__game;const f=g.interact.list.find(i=>i.id==='f_caballero');return {y:+g.player.pos.y.toFixed(2),zona:g.zone&&g.zone.id,niebla:!!(f&&f.obj&&f.obj.visible)}})()");
// 11. la puerta de la fortaleza: la guardia (ya abierta) y su escalera, la
// armería, la cámara del torno (la palanca del rastrillo, el alcaide, el
// torno del puente); por el paso y el puente, al patio de armas; el cadalso,
// el boquete del bolaño, el taller (la ballesta) y el tabique, que se
// derriba desde él
await step('escalera de la guardia', "(()=>{const g=__game;g.player.spawn(-82,0,-48,0);__sim(0.3);return __walk([[-82,-46.5],[-82,-44.0],[-86,-43],[-88.2,-43.0],[-89.3,-44.3],[-89.3,-37.0]])})()");
await step('espada de la guardia', "(()=>{__walk([[-89.3,-36.4],[-87.6,-36.6],[-84.4,-35.9]]);return __useHere('i_espada')})()");
await step('virotes armería', "(()=>{__walk([[-85.2,-37.2],[-85.2,-39.5],[-85.7,-41.3],[-86.3,-42.6]]);return __ir('i_virotes_armeria', 0.8)})()");
await step('cámara del torno', "__walk([[-85.7,-41.3],[-85.2,-39.5],[-85.2,-37.0],[-89.3,-36.4],[-89.6,-35.6],[-92.5,-35.6]])");
await step('palanca del rastrillo', "(()=>{__walk([[-96,-35.9],[-102,-35.2],[-103.45,-33.7]]);return __useHere('p_rastrillo_fort')})()");
await step('alcaide', "(()=>{__walk([[-101,-34.8]]);return __ir('n_alcaide', 0.7)})()");
await step('torno', "(()=>{__walk([[-98,-34.6]]);return __useHere('b_puente_fort')})()");
await step('puente', "(()=>{__sim(5);const g=__game;return {puente:!!g.flags['puente:fortaleza'],rastrillo:g.interact.list.find(i=>i.id==='d_rastrillo_fort').open}})()");
await step('al patio de armas', "__walk([[-98,-35.2],[-96,-35.9],[-92.5,-35.6],[-89.6,-35.6],[-89.3,-36.6],[-89.3,-37.2],[-89.3,-44.2],[-88.2,-43.0],[-86,-43],[-82,-44],[-82,-47.2],[-90,-47.5],[-98,-47.5],[-98,-45],[-98,-31.5],[-98,-27],[-98,-22.5],[-90,-18],[-80,-14]])");
await step('cadalso', "(()=>{const g=__game;g.player.spawn(-92.5,5.5,-35.6,Math.PI);__sim(0.3);return __walk([[-92.2,-31.0],[-92.2,-29.6],[-92.2,-28.1]])})()");
await step('virotes cadalso', "__ir('i_virotes_cadalso', 0.6)");
await step('boquete', "__walk([[-89.1,-28.1],[-89.1,-31.1],[-83,-31.1],[-81,-31.1],[-81,-33.2],[-81,-35.2],[-81.6,-36.4]])");
await step('ballesta', "(()=>{__walk([[-79.6,-37.2]]);return __ir('i_ballesta', 0.9)})()");
await step('nota del ballestero', "__ir('n_ballestero', 0.8)");
await step('tabique', "(()=>{__walk([[-81.6,-36.6],[-81.9,-37.4]]);return __useHere('d_tabique_taller')})()");
await step('a la armería', "(()=>{__sim(2);return __walk([[-83.8,-37.4],[-85.4,-36.6],[-89.3,-36.4]])})()");
// 12. (fase 4) la torre de la coracha a +12: la escalera de tablas, el
// sobrado, la puerta del sur y el puente; el adarve de levante hasta la
// terraza de la cancillería; la puerta del Tombo, atrancada por dentro: se
// desatranca desde la planta de las arcas y se sale a la terraza
await step4('escalera a +12', "(()=>{const g=__game;g.player.spawn(-70,9,-93,Math.PI);__sim(0.3);return __walk([[-73.6,-91.0],[-73.6,-88.7],[-72.6,-88.7],[-69.0,-88.7],[-67.2,-88.7],[-65.0,-88.7]])})()");
await step4('puente y adarve', "__walk([[-65.0,-87.0],[-65.0,-85.3],[-64.2,-85.3],[-63.3,-84.2],[-63.3,-76],[-63.3,-66],[-63.3,-61.0]])");
await step4('terraza', "__walk([[-66,-58],[-72,-55],[-74.6,-52]])");
await step4('puerta del Tombo, por fuera', "(()=>{__walk([[-66,-49.0],[-66,-48.2]]);const w=__walk([[-66,-47.0],[-66,-46.6]]);return {w,u:__useHere('d_tombo_terraza')}})()");
await step4('desde las arcas', "(()=>{const g=__game;g.player.spawn(-66.0,13.5,-42.6,Math.PI);__sim(0.3);__walk([[-66,-43.4]]);return __useHere('d_tombo_terraza')})()");
await step4('a la terraza', "__walk([[-66,-44.6],[-66,-46.4],[-66,-48.4],[-70,-52]])");
// 13. (fase 4) el jardín del Rey: la puerta de la torre de la reina, el
// crucero y la fuente, la alberca, el pomar, el palomar, el vivero, la
// escalera del adarve, el adarve y el mirador (la ampolla)
await step4('puerta del jardín', "(()=>{const g=__game;g.player.spawn(-130.6,0,-96,Math.PI);__sim(0.3);__walk([[-130.6,-99.2]]);return __useHere('d_jardin')})()");
await step4('al crucero', "__walk([[-130.6,-101.2],[-130.6,-103.6],[-130.6,-108.0],[-130.6,-111.6],[-127,-111.6]])");
await step4('fuente', "__ir('x_fuente_rey', 2.4)");
await step4('glorieta', "__walk([[-126.8,-114.2],[-124.5,-114.4],[-122.2,-114.0],[-122.2,-111.6]])");
await step4('a la alberca', "__walk([[-118,-111.6],[-113,-116],[-110,-120.4],[-100,-120.4],[-96,-120.4]])");
await step4('alberca', "__ir('x_alberca', 0.8)");
await step4('al pomar', "__walk([[-96,-120.4],[-90,-120.4],[-86,-120.4],[-84,-114.4],[-83.6,-112.6],[-80.4,-112.6]])");
await step4('palomar', "__ir('x_palomar', 0.6)");
await step4('vivero', "(()=>{__walk([[-80.6,-112.6],[-81.4,-108.4],[-80.6,-105.2]]);return __ir('x_vivero', 0.6)})()");
await step4('colmenas', "__ir('x_colmenas', 1.0)");
await step4('escalera del adarve', "(()=>{__walk([[-68,-106],[-64.2,-112],[-64.6,-119.4],[-65.6,-121.2]]);return __walk([[-66.4,-121.2],[-70,-121.2],[-74,-121.2],[-75.6,-121.2],[-75.4,-122.4],[-75.4,-124.0]])})()");
await step4('por el adarve', "__walk([[-80,-124],[-90,-124],[-96,-124]])");
await step4('mirador', "__walk([[-98,-125],[-98,-126.0],[-96.6,-126.7]])");
await step4('ampolla del mirador', "__ir('i_ampolla_jardin', 0.6)");
await step4('vista', "__ir('x_mirador', 0.5)");
// (fase 6) la garita del ballestero, al cabo de poniente del adarve: el
// ballestero (aquí, de un golpe) deja sus virotes
await step4('a la garita', "__walk([[-98,-124.2],[-106,-124.2],[-112,-124.2],[-113.9,-124.0]])");
await step4('virotes del ballestero', "(()=>{const g=__game;const e=g.enemies.find(q=>q.id==='e_ballestero_jardin');e.dead=false;e.state='dormant';e.hp=1;e.takeHit(500,50,-112,-124,true);__sim(2);const r=__ir('i_virotes_garita',0.6);return {...r,flag:!!g.flags['dead:ballestero_jardin']}})()");
// 14. (fase 4) la poterna: desde la despensa, desatrancada, al corral de la
// cocina y por su cancela al patio de armas
await step4('poterna, por dentro', "(()=>{const g=__game;g.player.spawn(-113,0,-37,0);__sim(0.3);__walk([[-113,-35.2]]);return __useHere('d_poterna')})()");
await step4('al corral', "__walk([[-113,-33.6],[-113,-32.2],[-113,-30.6],[-111.6,-28.2],[-111.6,-25.0],[-111.6,-23.6],[-104,-18]])");
// 15. (fase 5) la cárcel de la fortaleza: la trampilla del almacén de la torre
// (sin palanca no se abre; con ella, salta una argolla y sus hojas quedan de
// pie); la bajada, la sala de los carceleros (el libro de los presos), la
// cárcel (la maza de los carceleros, en la celda de la puerta arrancada, que
// se coge desde el umbral; la celda abierta del fondo y su ampolla; en las
// cerradas no se entra), la puerta del aljibe y su andén (los virotes del
// caído), el paso de las celdas de castigo, el cuarto de los verdugos, el
// paso bajo el foso, la capilla de los reos y la subida al rellano: lo último
// del carcelero mayor y su palanca, que sube el rastrillo; por él, al pasillo
// de las celdas de la mazmorra del castillo y a la celda del principio
await step5('trampilla, sin palanca', "(()=>{const g=__game;g.inventory.items.delete('palanca');g.player.spawn(-106,0,-96,0);__sim(0.3);return __ir('t_bajada_carcel', 0.4)})()");
await step5('trampilla, con palanca', "(()=>{const g=__game;g.giveItem('palanca');g.ui.closeAll();__sim(0.2);const r=__useHere('t_bajada_carcel');__sim(1.5);const it=g.interact.list.find(i=>i.id==='t_bajada_carcel');return {...r,flag:!!g.flags['trampa:carcel'],tapa:it.box.enabled,hojas:it.leafBoxes.map(b=>b.enabled)}})()");
await step5('bajada', "__walk([[-106,-93.3],[-106,-91],[-106,-88],[-106,-85.5],[-106,-83]])");
await step5('libro de la cárcel', "__ir('n_libro_carcel', 0.9)");
await step5('a la cárcel', "__walk([[-106,-80],[-106,-77],[-106,-74],[-106,-68.25]])");
await step5('maza de la celda', "(()=>{const g=__game;__walk([[-107.6,-68.25]]);const r=__ir('i_maza', 0.9);const w=__walk([[-107.6,-68.25],[-106,-68.25]]);return {...r,arma:g.player.weaponId,vuelta:w}})()");
await step5('celda del fondo', "__walk([[-106,-60],[-106,-54.75],[-107.6,-54.75],[-109.5,-54.75],[-110.6,-54.2]])");
await step5('ampolla de la celda', "__ir('i_ampolla_carcel', 0.5)");
await step5('celda cerrada', "(()=>{const g=__game;__walk([[-109.5,-54.75],[-107.6,-54.75],[-106,-54.75],[-106,-63.75]]);const w=__walk([[-111,-63.75]]);return {atascado:!!w.stuck,dentro:g.player.pos.x<-108.7}})()");
await step5('al aljibe', "__walk([[-106,-63.75],[-106,-68.25],[-102,-68.25],[-100.3,-68.25],[-98.6,-68.25],[-97.25,-67]])");
await step5('andén', "__walk([[-97.25,-62],[-97.6,-59.6]])");
await step5('virotes del aljibe', "__ir('i_virotes_aljibe', 0.5)");
await step5('al paso', "__walk([[-97.25,-55],[-97,-53],[-97,-48],[-97,-42.5]])");
// (fase 7: lo que le faltaba al paso) el preso de la celda de castigo, que
// no sale de su nicho (la roca de detrás no tiene suelo)
await step5('preso de castigo', "(()=>{const g=__game;__sim(1);const e=g.enemies.find(e=>e.spec&&e.spec.id==='e_preso_castigo');return {caged:!!e.spec.caged,pos:[+e.pos.x.toFixed(2),+e.pos.y.toFixed(2),+e.pos.z.toFixed(2)]}})()");
await step5('verdugos', "__walk([[-97,-40],[-97,-35],[-97,-30],[-97,-28]])");
await step5('bajo el foso', "__walk([[-97,-25],[-97,-20],[-97,-16.5]])");
await step5('capilla', "__walk([[-96.5,-14.6],[-95.5,-13.4],[-94.2,-12]])");
await step5('subida', "__walk([[-93.2,-12],[-92,-12],[-91.2,-12],[-90.3,-12.1]])");
await step5('carcelero mayor', "__ir('n_carcelero_mayor', 0.7)");
await step5('palanca del rastrillo', "(()=>{const g=__game;__walk([[-90.25,-12.1]]);const r=__useHere('p_rastrillo_carcel');__sim(4);const d=g.interact.list.find(i=>i.id==='d_rastrillo_carcel');return {...r,abierto:!!g.flags['door:d_rastrillo_carcel'],caja:d.box.enabled,open:+d.open.toFixed(2)}})()");
await step5('a la celda del principio', "__walk([[-89.3,-12],[-88.2,-12],[-87.6,-12.6],[-87.6,-14.6],[-87.6,-16.2]])");
await step5('lo cogido', "(()=>{const g=__game;return {maza:!!g.flags['take:i_maza'],ampolla:!!g.flags['take:i_ampolla_carcel'],virotes:!!g.flags['take:i_virotes_aljibe'],libro:!!g.flags['note:libroCarcel'],carcelero:!!g.flags['note:carceleroMayor']}})()");
// 16. (fase 7) el paseo de las cámaras: de la tribuna de la capilla, por su
// puerta y sus peldaños, al paseo; la vuelta entera por los tres brazos; las
// puertas de la cámara del Rey y de la sala de la reina, atrancadas por
// dentro; la vista del patio y los virotes; y, desde la cámara del Rey, su
// puerta desatrancada y los peldaños arriba, al paseo
await step7('a la tribuna', "(()=>{const g=__game;g.player.spawn(-73.3,4.5,-78,-Math.PI/2);__sim(0.4);return __ir('d_paseo_tribuna', 1.0)})()");
await step7('al paseo', "__walk([[-74.6,-78],[-75.4,-78],[-76.4,-78],[-77.6,-78]])");
await step7('puerta del Rey, por fuera', "(()=>{const w=__walk([[-78,-80],[-78,-84.9]]);return {w,u:__useHere('d_paseo_rey')}})()");
await step7('la vuelta', "__walk([[-78,-60],[-78,-48.2],[-90,-47.6],[-106,-47.6],[-118,-48.2],[-118,-70],[-118,-84.9]])");
await step7('puerta de la reina, por fuera', "__useHere('d_paseo_reina')");
await step7('la vista', "(()=>{__walk([[-118,-60],[-118,-48.2],[-94,-48.2]]);return __ir('x_paseo', 1.0)})()");
await step7('virotes del paseo', "(()=>{__walk([[-94,-48.2],[-79,-48.2]]);return __ir('i_virotes_paseo', 0.6)})()");
await step7('puerta del Rey, por dentro', "(()=>{const g=__game;g.player.spawn(-78,4.5,-90,0);__sim(0.4);return __ir('d_paseo_rey', 1.0)})()");
await step7('arriba, al paseo', "__walk([[-78,-87.6],[-78,-86.6],[-78,-85.4],[-78,-84]])");
out.push('llaves: ' + (await T("['llave_camarero','llave_capellan','llave_canciller'].map(k=>k+':'+__game.inventory.has(k)).join(' ')")));
console.log(out.join('\n'));
console.log(logs.slice(0, 10).join('\n'));
await b.close();
