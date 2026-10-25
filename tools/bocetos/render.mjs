// Dibuja un boceto y lo guarda: node tools/bocetos/render.mjs arzobispo [salida.png] [stage]
// (requiere npx vite --port 5199)
import { chromium } from 'playwright';
import fs from 'node:fs';
const [name = 'arzobispo', out = `arte/bocetos/${name}.png`, stage = 'all'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
p.on('console', (m) => (m.type() === 'error' || m.type() === 'log') && logs.push(m.type() + ': ' + m.text()));
const t0 = Date.now();
await p.goto(`http://localhost:5199/tools/bocetos/index.html?b=${name}&stage=${stage}`);
await p.waitForFunction(() => window.__done, null, { timeout: 600000 });
const err = await p.evaluate(() => window.__err);
if (err) console.log('ERROR', err);
const data = await p.evaluate(() => document.getElementById('c').toDataURL('image/png'));
fs.mkdirSync(out.split('/').slice(0, -1).join('/') || '.', { recursive: true });
fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
console.log(JSON.stringify({ out, ms: Date.now() - t0 }), logs.slice(0, 12).join('\n'));
await b.close();
