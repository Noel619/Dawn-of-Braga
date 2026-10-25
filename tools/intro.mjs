// Fotogramas de la introducción (game/intro/intro.js) en los segundos
// pedidos, en una hoja; debajo de cada uno, el plano y el rótulo que se ve.
//   node tools/intro.mjs [plano] t1,t2,... [salida.png]
//   (plano, de la corta: fuente, ara, cerrojos, asedio, rodillas, campana,
//   gente, celda, mirada, titulo; de la crónica (CUT=cronica): fuente, roma,
//   martin, se, asedio, arzobispo, puerta, pacto, campana, sello, preso,
//   mirada, titulo; los segundos, desde que empieza)
//   CUT=intro|cronica (intro)  COLS=n (4)  W,H (tamaño de cada fotograma: 480x270)
//   FULL=1  además, una captura de la página entera en cada segundo (con los
//   rótulos de verdad): tools/shots/intro/<plano>_<t>.png
//   END=1  sigue hasta que acaba y comprueba que la partida empieza bien
//   IDOLO=estatua  con el ídolo en forma de estatua (si no, el monolito)
// Requiere npx vite --port 5199.
import { chromium } from 'playwright';
import fs from 'node:fs';

const [from = 'fuente', times = '0,2,4,6', out = 'tools/shots/intro/hoja.png'] = process.argv.slice(2);
const T = times.split(',').map(Number);
const COLS = +(process.env.COLS || 4);
const TW = +(process.env.W || 480),
  TH = +(process.env.H || 270);
fs.mkdirSync('tools/shots/intro', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: TW * 2, height: TH * 2 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 6).join(' | ')));
p.on('console', (m) => {
  if (m.type() === 'error') logs.push(m.type() + ': ' + m.text());
});
await p.goto('http://localhost:5199/?dev=1' + (process.env.IDOLO ? '&idolo=' + process.env.IDOLO : ''));
await p.waitForFunction(() => window.__ready && __game.spring.idol, null, { timeout: 120000 });
await p.evaluate(
  ([from, n, COLS, TW, TH, cut]) => {
    window.__pause = true;
    const g = __game;
    g.ui.closeAll();
    g.input.enabledPointerLock = false;
    g.input.onPointerLockLost = null;
    g.settings.res = 540;
    g.resize();
    g.newGame();
    if (from !== 'fuente' || cut !== 'intro') {
      g.intro.abort();
      g.intro.start(() => g.beginPlay(true), { from, cut });
    }
    const c = document.createElement('canvas');
    c.width = TW * COLS;
    c.height = TH * Math.ceil(n / COLS);
    c.id = 'hoja';
    c.style.cssText = 'display:none';
    document.body.appendChild(c);
  },
  [from, T.length, COLS, TW, TH, process.env.CUT || 'intro']
);
let t = 0;
for (let i = 0; i < T.length; i++) {
  const r = await p.evaluate(
    ([dt, k, COLS, TW, TH, label]) => {
      const g = __game;
      const steps = Math.round(dt * 30);
      for (let s = 0; s < steps; s++) g.update(1 / 30);
      g.render();
      const c = document.getElementById('hoja');
      const cx = c.getContext('2d');
      const x = (k % COLS) * TW,
        y = Math.floor(k / COLS) * TH;
      cx.drawImage(g.renderer.domElement, x, y, TW, TH);
      const cap = document.getElementById('intro-cap');
      const txt = cap && cap.classList.contains('show') ? cap.textContent : '';
      cx.fillStyle = 'rgba(0,0,0,0.65)';
      cx.fillRect(x, y, 120, 16);
      cx.fillStyle = '#fff';
      cx.font = '12px monospace';
      cx.fillText(label + ' ' + (g.intro.shot || ''), x + 4, y + 12);
      if (txt) {
        cx.fillStyle = 'rgba(0,0,0,0.55)';
        cx.fillRect(x, y + TH - 18, TW, 18);
        cx.fillStyle = '#f0e7d2';
        cx.fillText(txt.slice(0, 70), x + 4, y + TH - 5);
      }
      const cam = g.camera.position;
      return { t: label, shot: g.intro.shot, active: g.intro.active, state: g.state, cap: txt, cam: [cam.x, cam.y, cam.z].map((v) => +v.toFixed(1)), ghosts: g.intro.ghosts.length, fade: +g.fade.toFixed(2) };
    },
    [T[i] - t, i, COLS, TW, TH, String(T[i])]
  );
  t = T[i];
  console.log(JSON.stringify(r));
  if (process.env.FULL) await p.screenshot({ path: `tools/shots/intro/${from}_${T[i]}.png` });
}
if (process.env.END) {
  const r = await p.evaluate(() => {
    const g = __game;
    let n = 0;
    while (g.intro.active && n < 30 * 400) {
      g.update(1 / 30);
      n++;
    }
    for (let k = 0; k < 30 * 5; k++) g.update(1 / 30);
    const P = g.player.pos;
    return { secs: +(n / 30).toFixed(1), state: g.state, intro: g.intro.active, pState: g.player.state, pos: [P.x, P.y, P.z].map((v) => +v.toFixed(2)), visible: g.player.obj.visible, bell: g.groups.campanaSe.on, door: g.crypt && g.crypt.leaves.map((l) => +l.rotation.y.toFixed(2)), hud: !document.getElementById('hud').classList.contains('hidden') };
  });
  console.log('END', JSON.stringify(r));
}
const png = await p.evaluate(() => document.getElementById('hoja').toDataURL('image/png'));
fs.writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
if (logs.length) console.log(logs.slice(0, 30).join('\n'));
await b.close();
