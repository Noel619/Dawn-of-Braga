// Fotogramas de la película del jefe final (finale/film_*.js) en los
// segundos pedidos, en una hoja.
//   node tools/film.mjs <punto de control> t1,t2,... [salida.png]
//   (rito, establo, torreSur, muralla; los segundos, desde que empieza)
//   COLS=n (4)  W,H (tamaño de cada fotograma: 480x270)  QTE=fail (fallarlas)
//   SET="js" código que se ejecuta antes de empezar (g = __game)
//   CAM="x,y,z,lx,ly,lz[,fov]" una cámara fija para todos los fotogramas
//   (o CAM="rel:dx,dy,dz,ldy[,fov]": junto al jugador)
// Las pulsaciones se aciertan solas (modo de pruebas: dev.autoQTE).
// Requiere npx vite --port 5199.
import { chromium } from 'playwright';
import fs from 'node:fs';

const [cp = 'rito', times = '0,2,4,6', out = 'tools/shots/film/hoja.png'] = process.argv.slice(2);
const T = times.split(',').map(Number);
const COLS = +(process.env.COLS || 4);
const TW = +(process.env.W || 480),
  TH = +(process.env.H || 270);
fs.mkdirSync(out.replace(/[^/]+$/, ''), { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: TW * 2, height: TH * 2 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 6).join(' | ')));
p.on('console', (m) => {
  if (m.type() === 'error' || m.text().startsWith('[f]')) logs.push(m.type() + ': ' + m.text());
});
await p.goto('http://localhost:5199/?dev=1&at=0,-10,-144&yaw=180');
await p.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await p.evaluate(
  async ([cp, qte, set, n, COLS, TW, TH, cam]) => {
    window.__pause = true;
    const g = __game;
    g.ui.closeAll();
    g.input.enabledPointerLock = false;
    g.input.onPointerLockLost = null;
    g.settings.res = 540;
    g.resize();
    await g.colossi.model('turiferario');
    g.dev.autoQTE = qte === 'fail' ? 'fail' : true;
    if (set) eval(set);
    if (cam) window.__cam = cam.startsWith('rel:') ? { rel: true, v: cam.slice(4).split(',').map(Number) } : { v: cam.split(',').map(Number) };
    await g.finale.debugFilm(cp);
    const c = document.createElement('canvas');
    c.width = TW * COLS;
    c.height = TH * Math.ceil(n / COLS);
    c.id = 'hoja';
    c.style.cssText = 'display:none';
    document.body.appendChild(c);
  },
  [cp, process.env.QTE || '', process.env.SET || '', T.length, COLS, TW, TH, process.env.CAM || '']
);
let t = 0;
for (let i = 0; i < T.length; i++) {
  const r = await p.evaluate(
    ([dt, k, COLS, TW, TH, label]) => {
      const g = __game;
      const steps = Math.round(dt * 30);
      for (let s = 0; s < steps; s++) g.update(1 / 30);
      if (window.__cam) {
        const c = g.camera,
          q = window.__cam;
        if (q.rel) {
          const P = g.player.pos;
          c.position.set(P.x + q.v[0], P.y + q.v[1], P.z + q.v[2]);
          c.lookAt(P.x, P.y + q.v[3], P.z);
          if (q.v[4]) c.fov = q.v[4];
        } else {
          c.position.set(q.v[0], q.v[1], q.v[2]);
          c.lookAt(q.v[3], q.v[4], q.v[5]);
          if (q.v[6]) c.fov = q.v[6];
        }
        c.updateProjectionMatrix();
        c.updateMatrixWorld();
      }
      g.render();
      const c = document.getElementById('hoja');
      const cx = c.getContext('2d');
      cx.drawImage(g.renderer.domElement, (k % COLS) * TW, Math.floor(k / COLS) * TH, TW, TH);
      cx.fillStyle = 'rgba(0,0,0,0.6)';
      cx.fillRect((k % COLS) * TW, Math.floor(k / COLS) * TH, 64, 16);
      cx.fillStyle = '#fff';
      cx.font = '12px monospace';
      cx.fillText(label, (k % COLS) * TW + 4, Math.floor(k / COLS) * TH + 12);
      const G = g.finale.giant;
      const pp = g.player.pos;
      return { t: label, hp: Math.round(g.player.hp), p: [pp.x, pp.y, pp.z].map((v) => +v.toFixed(1)), gt: G && G.R.action.clip ? G.R.action.clip.name + '@' + G.R.action.t.toFixed(2) : null, cp: g.flags['film:cp'], qte: g.qte.active ? g.qte.cur.label : '' };
    },
    [T[i] - t, i, COLS, TW, TH, String(T[i])]
  );
  t = T[i];
  console.log(JSON.stringify(r));
}
const png = await p.evaluate(() => document.getElementById('hoja').toDataURL('image/png'));
fs.writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
if (logs.length) console.log(logs.slice(0, 30).join('\n'));
await b.close();
