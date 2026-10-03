// Recorre la progresión completa verificando cada cierre/objeto.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
p.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_CERT') && !m.text().includes('404')) logs.push('console.error: ' + m.text()); });
await p.goto('http://localhost:5199/?dev=1&items=');
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  g.input.enabledPointerLock = false;
  g.input.onPointerLockLost = null;
  g.ui.closeAll();
  g.enemies.forEach((e) => { if (!e.boss) { e.dead = true; e.state = 'dead'; e.stT = 99; e.obj.visible = false; } });
  window.__noEnemies = () => g.enemies.forEach((e) => { if (!e.boss && !e.dead) { e.dead = true; e.state = 'dead'; e.stT = 99; } });
  // usa el interactuable id colocándose delante
  window.__use = (id, dist = 1.0) => {
    const it = g.interact.list.find((i) => i.id === id);
    if (!it) return 'NO EXISTE ' + id;
    const ix = it.ix ?? it.x, iz = it.iz ?? it.z;
    const tries = [[0, dist], [0, -dist], [dist, 0], [-dist, 0], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7]];
    for (const [dx, dz] of tries) {
      const x = ix + dx, z = iz + dz;
      const y = g.world.col.groundHeight(x, z, 0.1, it.y + 1.5);
      g.player.spawn(x, y, z, Math.atan2(ix - x, iz - z));
      __noEnemies();
      __sim(0.1);
      if (g.promptTarget && g.promptTarget.id === id) {
        const r = __sim(0.2, [], ['KeyE']);
        const m = g.ui.stack.map((s) => s.name);
        for (let k = 0; k < 3; k++) if (g.ui.modal) { __sim(0.5); __sim(0.1, [], ['KeyE']); }
        __sim(2.5);
        return { ok: true, id, modal: m, done: it.done, toast: [...document.querySelectorAll('.toast')].map((t) => t.textContent).slice(-1)[0] };
      }
    }
    return { ok: false, id, prompt: g.promptTarget && g.promptTarget.id, pos: [g.player.pos.x, g.player.pos.y, g.player.pos.z], st: g.state, ps: g.player.state, modal: g.ui.stack.map(s=>s.name), dead: g.player.dead };
  };
});
const steps = [
  "__use('i_espada')", "__use('i_escudo')", "__use('n_carcelero')", "__use('d_carcel')",
  "__use('d_barricada')",
  "__use('d_fragua')", "__use('i_palanca')", "__use('i_piedra')", "__use('n_herrero')",
  "__use('d_barricada')", "__use('d_souto')", "__use('i_ampolla1')", "__use('n_madre')",
  "__use('a_praca')", "__use('a_castelo')",
  "__use('n_tabernero')", "__use('x_mesa_taberna')", "__use('n_tejedora')", "__use('n_panadero')", "__use('n_mozo')", "__use('i_ampolla3')", "__use('d_corral')",
  "__use('d_canon')", "__use('i_llave')", "__use('n_canonigo')",
  // bodega del canónigo (opcional): tranca, cinemática, el Descoyuntado y su rosario
  "__use('n_ama')", "__use('d_sotano')",
  "(()=>{const g=__game;g.player.spawn(59.5,0,-25.2,Math.PI);__noEnemies();for(let i=0;i<40&&!g.cutscene;i++)__sim(0.05,['KeyW']);const had=!!g.cutscene;for(let i=0;i<400&&g.cutscene;i++)__sim(0.05);return {cine:had,flag:!!g.flags['cine:sotano'],ended:!g.cutscene,ps:g.player.state,pos:[g.player.pos.x,g.player.pos.y,g.player.pos.z].map(v=>+v.toFixed(2))}})()",
  // encerrado: la puerta está atrancada y el rastrillo de la cisterna, bajado
  "(()=>{const g=__game;const d=g.interact.list.find(i=>i.id==='d_sotano');const r=g.interact.list.find(i=>i.id==='d_rastrillo');return {hunt:g.hunt.active,door:d.done,open:+d.open.toFixed(2),gate:r.done,boss:g.bosses.descoyuntado.D.mode}})()",
  // (el pozo no se alcanza con el rastrillo bajado)
  "(()=>{const g=__game;g.player.spawn(55,-6.6,-45.2,Math.PI);g.camRig.yaw=Math.PI;__sim(0.1);for(let i=0;i<30;i++){g.camRig.yaw=Math.PI;__sim(0.05,['KeyW'])}return {z:+g.player.pos.z.toFixed(2),blocked:g.player.pos.z>-46.6}})()",
  "__use('d_rastrillo')",
  // las tres palancas (él, quieto mientras)
  // (cada palanca cuesta unos siete segundos y medio de tirones)
  "(()=>{const g=__game;g.bosses.descoyuntado.D.setMode('scripted');const r=__use('p_lagar');const early=!!g.flags['lever:p_lagar'];for(let i=0;i<14;i++){g.bosses.descoyuntado.D.setMode('scripted');__sim(0.5)}return {...r,early,pulled:!!g.flags['lever:p_lagar']}})()",
  // al morir, todo vuelve a su sitio (la palanca, arriba)
  "(()=>{const g=__game;g.respawn();return {lever:!!g.flags['lever:p_lagar'],gate:g.interact.list.find(i=>i.id==='d_rastrillo').open,broken:g.breakables.list.filter(b=>b.broken).length}})()",
  "(()=>{const g=__game;g.bosses.descoyuntado.D.setMode('scripted');__use('p_lagar');for(let i=0;i<14;i++){g.bosses.descoyuntado.D.setMode('scripted');__sim(0.5)}return {pulled:!!g.flags['lever:p_lagar']}})()",
  "(()=>{const g=__game;g.bosses.descoyuntado.D.setMode('scripted');__use('p_cripta');for(let i=0;i<14;i++){g.bosses.descoyuntado.D.setMode('scripted');__sim(0.5)}return {pulled:!!g.flags['lever:p_cripta']}})()",
  "(()=>{const g=__game;g.bosses.descoyuntado.D.setMode('scripted');__use('p_osario');for(let i=0;i<14;i++){if(g.bosses.descoyuntado.D.stage!=='rage')g.bosses.descoyuntado.D.setMode('scripted');__sim(0.5)}return {levers:['p_lagar','p_cripta','p_osario'].map(k=>!!g.flags['lever:'+k]),gate:!!g.flags['door:d_rastrillo'],stage:g.bosses.descoyuntado.D.stage}})()",
  // por el rastrillo abierto, al pozo, y arriba
  "(()=>{const g=__game;g.bosses.descoyuntado.D.setMode('scripted');g.player.spawn(55,-6.6,-45.2,Math.PI);g.camRig.yaw=Math.PI;__sim(0.1);for(let i=0;i<50;i++){g.bosses.descoyuntado.D.setMode('scripted');g.camRig.yaw=Math.PI;__sim(0.05,['KeyW'])}const through=g.player.pos.z<-47.5;g.player.spawn(53.4,-6.6,-54,Math.PI/2);__sim(0.1);const t=g.promptTarget&&g.promptTarget.id;__sim(0.2,[],['KeyE']);__sim(2);return {through,prompt:t,flag:!!g.flags['pozo:salida'],hunt:g.hunt.active,pos:[g.player.pos.x,g.player.pos.y,g.player.pos.z].map(v=>+v.toFixed(2))}})()",
  "(()=>{const g=__game;g.bosses.descoyuntado.reset();const r=__use('x_pozo_calle',1.2);__sim(2);return {r:r.ok,hunt:g.hunt.active,y:+g.player.pos.y.toFixed(2)}})()",
  "(()=>{const g=__game;const b=g.bosses.descoyuntado;b.hp=1;b.die();__sim(1);return {active:!!g.activeBoss,hunt:g.hunt.active}})()",
  "new Promise(r=>setTimeout(()=>r({boss:__game.flags['boss:descoyuntado'],door:__game.flags['door:d_sotano']}),6000))",
  "__use('i_rosario')", "__use('n_bodega')", "__use('n_pozo')", "({maxSt:__game.player.maxSt})",
  "__use('a_capela')",
  "__use('d_claustro')", "__use('i_relicario1')", "__use('n_claustro')", "__use('d_claustro_se')",
  "__use('d_se')", "__use('d_cripta')",
  "__use('i_ampolla2')", "__use('n_muralla')",
  "(()=>{const g=__game;g.bosses.impaled.hp=1;g.bosses.impaled.die();__sim(3);return {boss:g.flags['boss:impaled'], deadState:g.bosses.impaled.state}})()",
  "new Promise(r=>setTimeout(()=>r(__game.flags['boss:impaled']),3000))",
  "__use('i_manivela')",
  // la torre del homenaje: la poterna del adarve, el libro de la guarnición,
  // el torno del puente levadizo (atajo al patio) y el almacén
  "__use('d_poterna')", "__use('n_guarnicion')", "__use('i_relicario3')", "__use('b_homenaje')",
  "(()=>{const g=__game;__sim(3);const it=g.interact.list.find(i=>i.id==='b_homenaje');const x=g.interact.list.find(i=>i.id==='x_puente');return {flag:!!g.flags['puente:homenaje'],deck:it.deckBox.enabled,up:it.upBox.enabled,k:+it.k.toFixed(2),aviso:!(x.unless&&g.flags[x.unless])}})()",
  "__use('h_almacen_arriba')", "__use('i_ampolla5')",
  "__use('d_postigo')",
  "__use('d_cripta')", "__use('a_cripta')", "__use('i_anillo')", "__use('n_arzobispo')", "__use('i_relicario2')", "__use('n_romana')",
  "__use('d_sello')",
  "(()=>{const g=__game;const it=g.interact.list.find(i=>i.id==='f_boss');g.enterFog(it);__sim(1);g.bosses.turibulario.hp=1;g.bosses.turibulario.die();__sim(1);return {active:!!g.activeBoss}})()",
  "new Promise(r=>setTimeout(()=>r({boss:__game.flags['boss:turibulario'], exit:__game.flags['door:d_salida']}),3000))",
  "(()=>{const g=__game;const y=g.world.col.groundHeight(0,-195,0.2,1);g.player.spawn(0,y,-195,Math.PI);__sim(0.5);for(let i=0;i<30;i++){__sim(0.2,['KeyW']);if(g.state==='ending')break;}return {state:g.state,pos:[g.player.pos.x,g.player.pos.y,g.player.pos.z]}})()",
  "({inv:[...__game.inventory.items.entries()], maxHp:__game.player.maxHp, maxSt:__game.player.maxSt, flasks:__game.player.maxFlasks, dmg:__game.player.dmgMul, notes:Object.keys(__game.flags).filter(k=>k.startsWith('note:')).length})",
];
for (const s of steps) {
  let r;
  try { r = await p.evaluate(s); } catch (e) { r = 'ERR ' + e.message; }
  console.log(s.slice(0, 40).padEnd(42), JSON.stringify(r));
}
console.log(logs.slice(0, 20).join('\n'));
await b.close();
