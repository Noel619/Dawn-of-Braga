// Prueba de juego con entradas simuladas.
// node tools/play.mjs "<query>" prefix "acciones..."  acción: k:KeyW:ms | m:down/up | w:ms | s(shot) | e:js
import { chromium } from 'playwright';
const [query, prefix, ...acts] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const logs = [];
p.on('console', (m) => { if (m.type() !== 'debug' && !m.text().includes('ERR_CERT') && !m.text().includes('404')) logs.push(m.type() + ': ' + m.text()); });
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
await p.goto('http://localhost:5199/' + query);
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
await p.waitForTimeout(1500);
let n = 0;
for (const a of acts) {
  const [cmd, x, y] = a.split(':');
  if (cmd === 'k') { await p.keyboard.down(x); await p.waitForTimeout(+y || 100); await p.keyboard.up(x); }
  else if (cmd === 'kd') await p.keyboard.down(x);
  else if (cmd === 'ku') await p.keyboard.up(x);
  else if (cmd === 'm') { await p.mouse.move(480, 270); x === 'down' ? await p.mouse.down({ button: y || 'left' }) : await p.mouse.up({ button: y || 'left' }); }
  else if (cmd === 'c') { await p.mouse.move(480, 270); await p.mouse.down({ button: x || 'left' }); await p.waitForTimeout(90); await p.mouse.up({ button: x || 'left' }); }
  else if (cmd === 'w') await p.waitForTimeout(+x);
  else if (cmd === 's') await p.screenshot({ path: `tools/shots/${prefix}${n++}.png` });
  else if (cmd === 'e') { try { console.log('EVAL', JSON.stringify(await p.evaluate(a.slice(2)))); } catch (e) { console.log('EVALERR', e.message); } }
}
console.log('fps', await p.evaluate(() => window.__fps));
console.log(logs.slice(0, 40).join('\n'));
await b.close();
