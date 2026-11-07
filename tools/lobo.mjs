// La pelea con el Lobishome (entities/lobishome.js, game/lobishome.js): la
// niebla, la aparición, el acecho por el laberinto (dónde está y qué hace,
// segundo a segundo), un brasero encendido con el farol, la segunda fase (el
// aullido), la tercera (la luna del pozo lo deja quieto) y la muerte (la
// niebla se levanta). Con fotos en tools/scratch/red.
//   node tools/lobo.mjs      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 480, height: 300 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
await p.goto('http://localhost:5199/?dev=1&items=espada,escudo');
await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
fs.mkdirSync('tools/scratch/red', { recursive: true });
await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  g.input.enabledPointerLock = false;
  g.ui.closeAll();
  g.state = 'play';
  window.__lobo = () => g.bosses.lobishome;
  window.__st = () => { const e = __lobo(); return { modo: e.data.modo, st: e.state, fase: e.data.fase, hp: Math.round(e.hp), pos: [+e.pos.x.toFixed(1), +e.pos.y.toFixed(1), +e.pos.z.toFixed(1)], vis: +(g.lobo.vis ?? 0).toFixed(2), atk: e.atk && e.atk.name }; };
});
const foto = async (name, cam, look) => {
  const png = await p.evaluate(async ([c, l]) => {
    const g = __game, T = g.THREE;
    g.ui.showHud(false);
    g.camera.position.set(...c); g.camera.lookAt(...l); g.camera.updateMatrixWorld();
    g.camRig.override = { pos: new T.Vector3(...c), look: new T.Vector3(...l), speed: 1000, snap: true };
    g.render();
    const u = g.renderer.domElement.toDataURL('image/png').split(',')[1];
    g.camRig.override = null;
    return u;
  }, [cam, look]);
  fs.writeFileSync(`tools/scratch/red/${name}.png`, Buffer.from(png, 'base64'));
};
const T = (s) => p.evaluate(s);
const out = [];
const run = async (n, s) => out.push(n + ': ' + JSON.stringify(await T(s)));
await run('antes', "(()=>{const g=__game;g.dev.god=true;g.player.spawn(27.5,-17,-12.6,Math.PI);__sim(0.5);return {...__st(), fog:g.fogActive(g.interact.list.find(i=>i.id==='f_lobo'))}})()");
await run('niebla', "(()=>{const g=__game;const it=g.interact.list.find(i=>i.id==='f_lobo');g.enterFog(it);__sim(0.4);return {activo:!!g.activeBoss, ...__st(), ppos:[g.player.pos.x,g.player.pos.z].map(v=>+v.toFixed(1))}})()");
await foto('lb_aparicion', [27.6, -15.4, -15.6], [19.8, -15.6, -16.0]);
await run('intro', "(()=>{__sim(3.4);return __st()})()");
// el acecho: 12 s, cada segundo dónde está y qué hace
await run('acecho', "(()=>{const r=[];for(let i=0;i<14;i++){__sim(1.0);const s=__st();r.push(s.modo+'/'+s.st+'@'+s.pos[0]+','+s.pos[2]+' v'+s.vis+(s.atk?' '+s.atk:''));}return r})()");
await foto('lb_acecho', [27.6, -15.2, -15.0], [27.5, -16.4, -22.0]);
// un brasero: encenderlo (el del cruce de la entrada)
await run('brasero', "(()=>{const g=__game;g.player.spawn(27.6,-17,-15.9,0);__sim(0.3);const it=g.interact.list.find(i=>i.id==='ib_br_40');g.player.yaw=Math.atan2(it.x-g.player.pos.x,it.z-g.player.pos.z);__sim(0.2);const pr=g.promptTarget&&g.promptTarget.id;__sim(0.15,[],['KeyE']);__sim(1.4);const b=g.lobo.braseros.find(q=>q.id==='br_40');return {pr,lit:b.lit,luz:+g.lobo.luzEn(b.x+1,-17,b.z+1).toFixed(2)}})()");
// fotos del cuerpo: a la luz del brasero, de pie y a cuatro patas
await run('posa', "(()=>{const g=__game,e=__lobo();e.scripted=true;e.body.pos.set(29.0,-17,-16.0);e.yaw=-Math.PI/2;e.data.cuatro=false;e.data.cuatroW=0;e.state='chase';e.anim.stop(0);for(let i=0;i<6;i++)g.update(1/30);return __st()})()");
await foto('lb_de_pie', [25.6, -15.6, -14.6], [29.0, -15.9, -16.0]);
await run('posa4', "(()=>{const g=__game,e=__lobo();e.data.cuatro=true;e.data.cuatroW=1;for(let i=0;i<20;i++){e.vx=0;e.vz=0;g.update(1/30);}return __st()})()");
await foto('lb_cuatro', [25.6, -15.6, -14.6], [29.0, -16.2, -16.0]);
// la segunda fase: de pie, a la luz; el aullido apaga los braseros cerca
await run('fase2', "(()=>{const g=__game,e=__lobo();e.scripted=false;e.hp=e.maxHp*0.6;const r=[];for(let i=0;i<10;i++){__sim(0.6);const s=__st();r.push(s.modo+'/'+s.st+(s.atk?' '+s.atk:''));}return {r,braseros:g.lobo.braseros.filter(b=>b.lit).length,farol:+g.lobo.farolK.toFixed(2)}})()");
// la tercera: la luna del pozo
await run('fase3', "(()=>{const g=__game,e=__lobo();e.hp=e.maxHp*0.25;__sim(4.5);const s=__st();e.body.pos.set(g.lobo.luna.x,-17,g.lobo.luna.z);e.state='lobo';e.data.modo='acecho';e.data.dest=null;__sim(0.4);return {antes:s,luna:e.data.modo,quieto:e.data.luna}})()");
await run('muerte', "(()=>{const g=__game,e=__lobo();const hp=e.hp;e.takeHit(5000,50,e.pos.x+1,e.pos.z,true);__sim(4);return {dead:e.dead,flag:!!g.flags['boss:lobishome'],fog:g.fogActive(g.interact.list.find(i=>i.id==='f_lobo')),activo:!!g.activeBoss}})()");
console.log(out.join('\n'));
console.log(logs.join('\n') || 'sin errores');
await b.close();
