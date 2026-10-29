// Recorre la progresión completa verificando cada cierre/objeto.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
p.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_CERT') && !m.text().includes('404')) logs.push('console.error: ' + m.text()); });
await p.goto('http://localhost:5199/?dev=1&items=');
await p.waitForFunction(() => window.__ready && __game.spring.idol, null, { timeout: 90000 });
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
  window.__toast = () => [...document.querySelectorAll('.toast')].map((t) => t.textContent).slice(-1)[0];
  // usa el interactuable id desde donde esté el jugador (de cara a él)
  window.__useHere = (id) => {
    const it = g.interact.list.find((i) => i.id === id);
    if (!it) return 'NO EXISTE ' + id;
    const pl = g.player;
    pl.yaw = Math.atan2((it.ix ?? it.x) - pl.pos.x, (it.iz ?? it.z) - pl.pos.z);
    __sim(0.1);
    if (!g.promptTarget || g.promptTarget.id !== id) return { ok: false, id, prompt: g.promptTarget && g.promptTarget.id, pos: [pl.pos.x, pl.pos.y, pl.pos.z].map((v) => +v.toFixed(2)) };
    __sim(0.2, [], ['KeyE']);
    for (let k = 0; k < 3; k++) if (g.ui.modal) { __sim(0.5); __sim(0.1, [], ['KeyE']); }
    __sim(2.5);
    return { ok: true, id, done: it.done, toast: __toast(), pos: [pl.pos.x, pl.pos.y, pl.pos.z].map((v) => +v.toFixed(2)) };
  };
  // anda de punto en punto (x, z), como con el stick; dice dónde se atasca
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
      if (t >= 20 || pl.dead) return { stuck: [x, z], pos: [pl.pos.x, pl.pos.y, pl.pos.z].map((v) => +v.toFixed(2)), dead: pl.dead };
    }
    __sim(0.3);
    return { pos: [pl.pos.x, pl.pos.y, pl.pos.z].map((v) => +v.toFixed(2)), zone: g.zone && g.zone.id, hp: Math.round(pl.hp) };
  };
});
const steps = [
  "__use('i_espada')", "__use('i_escudo')", "__use('n_carcelero')", "__use('d_carcel')",
  // la barricada de los Pelames, desde este lado, ni con la palanca se mueve
  "(()=>{const g=__game;g.player.spawn(26.9,0,0,Math.PI/2);__noEnemies();__sim(0.2);return __useHere('d_barricada')})()",
  "__use('i_palanca')", "__use('n_herrero')",
  "(()=>{const g=__game;g.player.spawn(26.9,0,0,Math.PI/2);__noEnemies();__sim(0.2);return __useHere('d_barricada')})()",
  // el barrio de los Pellejeros, andando (sin el Físico, sus trampas ni el
  // equilibrio de las cornisas: lo suyo se prueba aparte; aquí, lo que se
  // abre, se coge y se lee): el portón de la cuarentena (la palanca); la
  // casa de la viuda: la escalera, la cornisa, la llave de la tintorería en
  // el arcón de la alcoba, la tranca de la alcoba, la puerta del patio, las
  // cajas de la tapia; la quemada; la tintorería (la llave), la nota del
  // tintorero, el secadero, el pescante; los tejados (la viga de la
  // calleja); el palomero y su palomar (la piedra de afilar); el tejado de la
  // Casa de los Inocentes y la claraboya; el tratado (desván), la historia
  // clínica (alcoba), el otro tratado (botica); el quirófano: la pelea (se le
  // vence de un golpe; la escena, saltada): la llave de la cordelería y la
  // puerta del patio; el patio, el callejón, la cordelería (la nota del
  // cordelero) y su puerta a los Pelames
  "(()=>{const g=__game;window.__fu=g.fisico.update;window.__tu=g.trampas.update;window.__cu=g.cornisas.update;g.fisico.update=()=>{};g.trampas.update=()=>{};g.cornisas.update=()=>{};g.flags['fisico:intro']=true;g.player.spawn(12.4,0,44,Math.PI/2);__noEnemies();__sim(0.2);return __useHere('d_porton')})()",
  "__walk([[20,43.6],[24,43.6],[24,43]])", "__useHere('d_zapatero')",
  "__walk([[24,40.4],[23.6,39.4]])", "__useHere('n_zapatero')",
  "__walk([[24,40.4],[24,42.6],[25.2,45.2]])", "__useHere('d_viuda')",
  "__walk([[25.2,47.6],[25,50],[25,51.6],[27.3,53.6],[27.4,54.15],[28.45,54],[28.45,50.4],[28.4,49.6],[27.6,49.4],[27.4,46.8],[27.4,45.74],[23.15,45.74],[23.15,46.6],[24.2,46.7],[24.3,47.3]])", "__useHere('i_llave_tinte')",
  "__walk([[24.6,49.55]])", "__useHere('d_alcoba')",
  "__walk([[26,49.55],[28.4,49.7],[28.45,53.9],[27.3,54.15],[25.5,54.2]])", "__useHere('d_viuda_patio')",
  "__walk([[25.5,56.3],[26.4,56.9],[27.3,56.9],[28.2,56.9],[29,56.9],[29.5,56.9],[30.4,56.9],[31.75,55.7]])", "__useHere('d_quemada_patio')",
  "__walk([[31.75,54.3],[32,52],[32.6,49],[33.3,48.4]])", "__useHere('d_quemada')",
  "__walk([[35,48.4],[40,40]])", "__useHere('d_tinte')",
  "__walk([[40,38],[39.9,33],[40.6,32.1],[45,32.1],[45,33.3],[42.4,35.2]])", "__useHere('n_tintorero')",
  "__walk([[38.2,37.2],[37,37.3],[37,34],[36.2,34.1],[34.6,34.1],[33.7,34.1],[33.5,41],[33.45,41.6],[31.45,50.1],[32.5,51.6],[34.3,52],[41.5,53.5],[48.5,53.5],[55,50],[60.8,49.6],[61.6,49.6],[63.9,45.2],[64,43.6],[66.5,43.1],[66.5,39.7],[66.5,36],[65.9,35.6]])", "__useHere('n_aprendiz')",
  "__walk([[66.6,34.8]])", "__useHere('i_piedra')",
  "__walk([[66.5,36.6],[66.5,39.9],[66.5,42.9],[64,42.6],[62.6,41.5],[61.6,40],[60.6,40],[58.6,40.9],[57.2,40.9],[56.6,38.6],[55.8,37]])", "__useHere('n_tratado2')",
  "__walk([[56.15,43],[56.15,44.5],[56.15,47.9],[57.1,48.1],[56.6,42.4],[54.6,42.4],[53.3,42.2]])", "__useHere('n_historia')",
  "__walk([[54.6,42.4],[56.6,42.4],[58.2,41.6],[58.2,39.8],[56.2,37.7],[54.6,37.7],[54.2,38.2]])", "__useHere('n_tratado1')",
  "__walk([[54.6,37.7],[56.2,37.7],[58.2,39.8],[58.2,41.6],[60,43.4],[60,47.9],[59,48.1],[57.6,42],[57.6,40]])",
  "(()=>{const g=__game;g.flags['fisico:caza']=true;g.fisico.update=window.__fu;__sim(0.5);const F=g.fisico,e=F.e;const st=F.modo;e.hp=1;e.die();for(let i=0;i<30&&g.cutscene;i++){g.cutscene.skip();__sim(0.2)}g.ui.closeAll();__sim(1);g.ui.closeAll();g.fisico.update=()=>{};return {pelea:st,boss:!!g.flags['boss:fisico'],llave:g.inventory.has('llave_cordeleria'),patio:!!g.flags['door:d_quirofano_patio'],sentado:e.dead&&e.obj.visible}})()",
  "__walk([[54.5,35],[54.5,33],[50.6,28.1]])", "__useHere('d_patio_inocentes')",
  "__walk([[48,28],[46.7,27]])", "__useHere('d_cordeleria_atras')",
  "__walk([[44,26.5],[40.9,23],[41.8,20.9],[42.3,20.9],[42.85,20.4],[42.85,16],[42.6,12],[39.75,11.9],[39.7,11.3],[39.7,6.6],[41.6,8.6]])", "__useHere('n_cordelero')",
  "__walk([[40.9,3.8]])", "__useHere('d_cordeleria')",
  // y la barricada, desde detrás: se viene abajo (el atajo de vuelta)
  "(()=>{const g=__game;g.fisico.update=window.__fu;g.trampas.update=window.__tu;g.cornisas.update=window.__cu;return __walk([[40.9,1.5],[30,0]])})()", "__useHere('d_barricada')", "__walk([[20,0]])",
  "__use('d_souto')", "__use('i_ampolla1')", "__use('n_madre')",
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
  // la cripta honda: la Confesión, el panteón de los obispos, San Martín (su
  // capilla y su osario), las catacumbas (el oratorio y el atajo de la sala
  // de llegada), los Inocentes y la Garra (su emboscada), las tres pilas, la
  // cripta de los mártires y la sacristía del arzobispo, los Velados, el
  // incensario y la Puerta del Dios Ignoto
  "__use('n_confesion')", "__use('n_pilas')", "__use('x_primer_obispo')", "__use('a_martin')", "__use('n_martin')", "__use('n_osario')",
  // Dom Paio, en la capilla: al verte se levanta; al hablarle, lo que pasó
  "(()=>{const g=__game;const a=__use('t_paio');for(let i=0;i<4;i++)__sim(0.5);const b=__use('t_paio');for(let i=0;i<60&&g.paio.script;i++){__sim(0.5);g.speech.skip(g.paio.who)}return {first:a.ok,talk:b.ok,met:!!g.flags['paio:met'],mode:g.paio.mode}})()",
  "__use('a_oratorio')", "__use('n_rates')",
  // (los dos atajos se abren desde abajo, con su palanca: el lienzo de muro
  // de la sala de llegada, desde la escalera de las catacumbas, y la reja de
  // San Martín, desde la de los Inocentes; el muro, desde la sala, ni se
  // ofrece)
  "(()=>{const g=__game;const it=g.interact.list.find(i=>i.id==='d_atajo_llegada');g.player.spawn(-5.6,-7,-101.75,-Math.PI/2);__sim(0.2);const hidden=!(g.promptTarget&&g.promptTarget.id==='d_atajo_llegada');const r=__use('p_atajo_llegada');__sim(2.5);return {...r,hidden,lever:!!g.flags['lever:p_atajo_llegada'],open:!!g.flags['door:d_atajo_llegada'],box:it.box.enabled}})()",
  "(()=>{const g=__game;const r=__use('p_atajo_martin');__sim(3.5);const it=g.interact.list.find(i=>i.id==='d_atajo_martin');return {...r,lever:!!g.flags['lever:p_atajo_martin'],open:!!g.flags['door:d_atajo_martin'],box:it.box.enabled}})()",
  // el Custodio de la Garra: al entrar en el relicario se levanta y cae la
  // reja; vencido, sube la reja, se abre el arca y la Garra queda a la vista
  "__use('n_garra')",
  "(()=>{const g=__game;const it=g.interact.list.find(i=>i.id==='i_garra');const before=it.hidden;g.dev.god=true;g.player.spawn(-84,-12.7,-93.5,-Math.PI/2);__sim(1.5);const fight=g.activeBoss&&g.activeBoss.type;const gate=g.crypt.gate.box.enabled;const b=g.bosses.custodio;b.hp=1;b.takeHit(50,50,g.player.pos.x,g.player.pos.z,false);for(let i=0;i<10;i++)__sim(0.5);g.dev.god=false;return {hiddenBefore:before,fight,gate,dead:b.dead,flag:!!g.flags['boss:custodio'],gateAfter:g.crypt.gate.box.enabled,arca:g.crypt.arca.target,garraShown:!it.hidden}})()",
  "new Promise(r=>setTimeout(()=>{const g=__game;const it=g.interact.list.find(i=>i.id==='i_garra');r({garraShown:!it.hidden})},3000))",
  "__use('i_garra')",
  "(()=>{const g=__game;return {garra:g.inventory.has('garra')}})()",
  "(()=>{const g=__game;const r=__use('p_pila_oeste');for(let i=0;i<14;i++)__sim(0.5);return {...r,pulled:!!g.flags['lever:p_pila_oeste']}})()",
  "__use('n_martires')", "__use('d_sacristia')", "__use('i_incienso')", "__use('n_incienso')",
  "(()=>{const g=__game;const r=__use('p_pila_este');for(let i=0;i<14;i++)__sim(0.5);return {...r,pulled:!!g.flags['lever:p_pila_este']}})()",
  "__use('n_velados')",
  // (los Velados despiertan al pisar la nave: a la espalda sube la reja de
  // la escalinata; vencidos, baja, y se abre la reja del pozo)
  "(()=>{const g=__game;g.dev.god=true;g.player.spawn(-55,-8.2,-152,Math.PI/2);__sim(1);const before=!!g.activeBoss;g.player.spawn(-46,-13,-152,Math.PI/2);__sim(2);const fight=g.activeBoss&&g.activeBoss.type;const gate=g.crypt.vgate.target;const a=g.bosses.guardianL,b=g.bosses.guardianR;a.hp=1;a.die();__sim(1);const next=g.activeBoss&&g.activeBoss.type;b.hp=1;b.die();__sim(1);g.dev.god=false;return {before,fight,gate,next,all:!!g.flags['boss:guardianes']}})()",
  "new Promise(r=>setTimeout(()=>{const g=__game;for(let i=0;i<10;i++)__sim(0.5);r({L:g.flags['boss:guardianL'],R:g.flags['boss:guardianR'],gate:g.crypt.vgate.target,gateUp:g.crypt.vgate.box.enabled,reja:!!g.flags['door:d_reja_pozo'],paioGone:!!g.flags['paio:gone'],npc:g.paio.npc.obj.visible})},3000))",
  // (en la capilla queda su breviario; en el pozo, él, convertido: hasta
  // que cae, la cadena no se echa)
  "__use('n_paio')",
  "(()=>{const g=__game;const r=__use('p_pila_honda');for(let i=0;i<4;i++)__sim(0.5);return {guarded:!g.flags['lever:p_pila_honda'],toast:r.toast}})()",
  "(()=>{const g=__game;g.dev.god=true;g.player.spawn(-36,-16,-176,Math.PI);__sim(2);const fight=g.activeBoss&&g.activeBoss.type;const h=g.bosses.paioHollow;h.hp=1;h.takeHit(50,50,g.player.pos.x,g.player.pos.z,false);__sim(3);g.dev.god=false;return {fight,dead:h.dead,flag:!!g.flags['boss:paioHollow']}})()",
  "(()=>{const g=__game;const r=__use('p_pila_honda');for(let i=0;i<14;i++)__sim(0.5);return {...r,pulled:!!g.flags['lever:p_pila_honda']}})()",
  "__use('d_dios')",
  "__use('x_incensario')",
  "(()=>{const g=__game;g.player.spawn(-19.5,-10,-152,Math.PI/2);for(let i=0;i<24;i++)__sim(0.5);return {incense:!!g.flags['god:incense'],full:g.crypt.circlesFull(),flows:g.crypt.flows.length,insc:g.crypt.inscK,missing:g.crypt.missing()}})()",
  "(()=>{const g=__game;const r=__use('d_dios');for(let i=0;i<14;i++)__sim(0.5);return {...r,open:!!g.flags['door:d_dios'],garra:g.inventory.has('garra')}})()",
  // el arzobispo pelea en la cisterna; vencido, el rito: empieza la película
  "(()=>{const g=__game;g.dev.god=true;const it=g.interact.list.find(i=>i.id==='f_boss');g.enterFog(it);__sim(1.5);const fight=g.activeBoss&&g.activeBoss.type;if(g.cutscene)g.cutscene.skip();__sim(0.5);const b=g.bosses.turibulario;b.die();__sim(1.5);const cine=!!g.cutscene;if(g.cutscene)g.cutscene.skip();__sim(0.3);g.ui.closeAll();__sim(0.5);return {fight,cine,rite:!!g.flags['finale:rite'],gone:!!g.bosses.turibulario.dead,stage:g.finale.stage,cp:g.flags['film:cp']}})()",
  // la película entera, con las pulsaciones acertadas solas: de la cisterna
  // al río (los puntos de control, en orden; nadie muere)
  "(()=>{const g=__game;g.dev.autoQTE=true;const cps=[];let t=0;for(;t<600;t+=1/30){g.update(1/30);const c=g.flags['film:cp'];if(c&&!cps.includes(c))cps.push(c);if(g.state==='ending'||g.player.dead)break;}g.dev.autoQTE=false;g.dev.god=false;return {t:Math.round(t),cps,state:g.state,dead:g.player.dead,stage:g.finale.stage,turiferario:!!g.flags['boss:turiferario'],turibulario:!!g.flags['boss:turibulario'],exit:!!g.flags['door:d_salida']}})()",
  "({inv:[...__game.inventory.items.entries()], maxHp:__game.player.maxHp, maxSt:__game.player.maxSt, flasks:__game.player.maxFlasks, dmg:__game.player.dmgMul, notes:Object.keys(__game.flags).filter(k=>k.startsWith('note:')).length})",
];
for (const s of steps) {
  let r;
  try { r = await p.evaluate(s); } catch (e) { r = 'ERR ' + e.message; }
  console.log(s.slice(0, 40).padEnd(42), JSON.stringify(r));
}
console.log(logs.slice(0, 20).join('\n'));
await b.close();
