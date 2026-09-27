// Capturas de todas las pantallas de la interfaz: node tools/uishots.mjs [ancho alto]
// (requiere npx vite --port 5199). Las imágenes quedan en tools/shots/ui_*.png
import { chromium } from 'playwright';
const W = +(process.argv[2] || 1280),
  H = +(process.argv[3] || 720);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
p.on('console', (m) => m.type() === 'error' && !/ERR_CERT|404/.test(m.text()) && logs.push('console.error ' + m.text()));
await p.goto('http://localhost:5199/?dev=1&items=espada,escudo,palanca,llave_claustro,relicario,ampolla,piedra,anillo,manivela&at=-62,0,-8&yaw=200');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
const step = async (name, fn, wait = 350) => {
  await p.evaluate(fn);
  await p.waitForTimeout(wait);
  await p.evaluate(() => {
    const g = __game;
    for (let i = 0; i < 2; i++) g.update(1 / 30);
    g.render();
  });
  await p.waitForTimeout(150);
  await p.screenshot({ path: `tools/shots/ui_${name}.png` });
};
await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  for (const k of ['celda', 'carcelero', 'madre', 'herrero']) g.flags['note:' + k] = true;
  g.visited = new Set(['prison', 'castle', 'souto', 'praca', 'ruase', 'largo', 'pelames', 'tanners', 'muralla', 'ferraria', 'smithy']);
  g.deaths = 3;
  g.playTime = 1834;
  g.player.hp = 64;
});
await step('hud', () => {
  const g = __game;
  g.ui.showHud(true);
  g.ui.area('Patio del Castillo');
  g.ui.toast('La puerta está cegada con tablones clavados. Necesitas algo para arrancarlos.', 30);
  g.promptTarget = g.interact.list.find((i) => i.id === 'a_castelo');
  const e = g.enemies.find((e) => e.id === 'e_patio1');
  g.lockTarget = e;
  e.hitShown = 5;
}, 900);
await step('pause', () => __game.openPause());
await step('options', () => { __game.ui.open('options'); });
await step('controls', () => { __game.ui.close(); __game.ui.open('controls'); });
await step('inv', () => { __game.ui.close(); __game.ui.open('inv'); });
await step('docs', () => { const u = __game.ui; u.invTab = 1; u.invSel = 1; u.renderInv(); });
await step('note', () => { const { NOTES } = window.__notes || {}; __game.ui.showNote(__game.interact ? __game.ui.g.level && Object.values(__game.ui.constructor.NOTES || {})[0] || null : null); }, 50).catch(() => {});
await step('note', () => { __game.ui.closeAll(); __game.interact.list.find((i) => i.id === 'n_carcelero') && __game.interact.use ? 0 : 0; __game.ui.showNote({ title: 'Nota del carcelero', text: 'Tercera noche del asedio.\n\nLos de fuera ya no gritan. Cantan, toda la noche, frente a la muralla, en una lengua que no es de hombres.\n\nEl arzobispo bajó otra vez a la cripta con dos canónigos. Sólo subieron ellos dos.\n\nAl preso de la primera celda lo dejo sin comer. Que Dios me perdone: no pienso abrir esa puerta.' }); });
await step('item', () => { __game.ui.closeAll(); __game.ui.showItem('relicario'); });
await step('map', () => { __game.ui.closeAll(); __game.ui.open('map'); });
await step('death', () => { __game.ui.closeAll(); const d = document.getElementById('death'); d.classList.remove('hidden'); d.classList.add('show'); }, 2200);
await step('title', () => {
  const d = document.getElementById('death');
  d.classList.remove('show');
  d.classList.add('hidden');
  const g = __game;
  g.toTitle();
  g.titleActivate();
}, 600);
console.log(logs.join('\n') || 'sin errores');
await b.close();
