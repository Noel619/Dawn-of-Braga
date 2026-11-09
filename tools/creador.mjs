// El editor de personaje (game/creador.js): lo abre como al acabar la
// introducción, lo recorre con el teclado y fotografía cada paso; al final,
// despierta en la celda con lo elegido y comprueba que se ha guardado.
//   node tools/creador.mjs [carpeta]          (requiere npx vite --port 5199)
// Fotos (en la carpeta; por defecto, tools/shots):
//   creador_1_lista.png     la lista, de cuerpo entero
//   creador_2_rostro.png    el rostro, de cerca (otro de base)
//   creador_3_rasgos.png    los rasgos de la cara (la nariz, al máximo)
//   creador_4_azar.png      uno al azar, sin armadura y girado
//   creador_5_celda.png     despierto en la celda
import { chromium } from 'playwright';
import fs from 'fs';
const dir = process.argv[2] || 'tools/shots';
fs.mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
p.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text());
});
await p.goto('http://localhost:5199/?dev=1&items=');
await p.waitForFunction(() => window.__ready, null, { timeout: 120000 });
// (el juego, a mano: unos segundos de juego por paso, con las teclas pulsadas
// en el primer fotograma)
await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  g.fade = 0;
  g.creador.abrir(() => g.wakeUp());
});
const run = (sec, keys = []) =>
  p.evaluate(
    ([sec, keys]) => {
      const g = __game,
        inp = g.input;
      for (const k of keys) {
        inp.keys.add(k);
        inp.kPressed.add(k);
      }
      let first = true;
      for (let t = 0; t < sec; t += 1 / 30) {
        g.update(1 / 30);
        if (first) {
          for (const k of keys) {
            inp.keys.delete(k);
            inp.kReleased.add(k);
          }
          first = false;
        }
      }
      g.render();
      const c = g.creador;
      return { state: g.state, sel: c.sel, sub: c.sub, aspecto: c.a };
    },
    [sec, keys]
  );
const shot = (n) => p.screenshot({ path: `${dir}/creador_${n}.png` });
const tecla = async (k, n = 1) => {
  for (let i = 0; i < n; i++) await run(0.1, [k]);
};
await run(1.5);
await shot('1_lista');
// el rostro: uno abajo, otro de base
await tecla('ArrowDown');
await tecla('ArrowRight', 2);
await run(1.2);
await shot('2_rostro');
// los rasgos: a la nariz, al máximo
await tecla('ArrowDown');
await tecla('KeyE');
await tecla('ArrowDown', 6);
await tecla('ArrowRight', 5);
await run(1.2);
await shot('3_rasgos');
// uno al azar, sin armadura, girado (Q)
await tecla('Escape');
await p.evaluate(() => {
  const c = __game.creador;
  c.sel = c.entradas().findIndex((e) => e.id === 'azar');
  c.render();
});
await tecla('KeyE');
await p.evaluate(() => {
  const c = __game.creador;
  c.sel = c.entradas().findIndex((e) => e.id === 'vista');
  c.render();
});
await tecla('ArrowLeft');
await run(0.6, [], []);
await p.evaluate(() => {
  __game.input.keys.add('KeyQ');
});
await run(0.5);
await p.evaluate(() => {
  __game.input.keys.delete('KeyQ');
});
await run(1);
await shot('4_azar');
// despertar: «atrás» lleva a Despertar; confirmar dos veces
await tecla('Escape');
await tecla('KeyE');
const elegido = (await run(0.1, ['KeyE'])).aspecto;
await run(2);
const fin = await run(5);
await shot('5_celda');
const sv = await p.evaluate(() => JSON.parse(localStorage.getItem('dawnOfBraga.save.v1') || 'null'));
const P = await p.evaluate(() => ({ aspecto: __game.player.aspecto, armor: __game.player.armor }));
console.log('estado al final:', fin.state, '· jugador:', P.aspecto.nombre, P.aspecto.peinado, P.aspecto.barba, P.aspecto.rostro);
console.log('lo elegido y lo del jugador, iguales:', JSON.stringify(elegido) === JSON.stringify(P.aspecto));
console.log('guardado:', sv ? `v${sv.v}, ${sv.aspecto && sv.aspecto.nombre}, armadura ${Object.values(sv.armor || {}).join(' ')}` : 'NO');
if (logs.length) console.log(logs.join('\n'));
await b.close();
