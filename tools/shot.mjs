// Captura de pantalla headless: node tools/shot.mjs <url> <out.png> [waitMs] [w] [h]
import { chromium } from 'playwright';
const [url, out, wait = '3000', w = '960', h = '540'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
p.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + '\n' + e.stack));
await p.goto(url);
await p.waitForTimeout(+wait);
if (process.env.EVAL) { try { console.log('EVAL:', JSON.stringify(await p.evaluate(process.env.EVAL))); } catch (e) { console.log('EVAL ERR', e.message); } }
if (process.env.WAIT2) await p.waitForTimeout(+process.env.WAIT2);
await p.screenshot({ path: out });
console.log(logs.slice(0, 40).join('\n'));
await b.close();
