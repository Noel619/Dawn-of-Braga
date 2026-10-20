// La cámara de la película del jefe final metida en algo: cada pocos
// fotogramas se lanza una rejilla de rayos desde la cámara (contra lo que se
// ve: el mundo, el gigante con su piel, los trozos) y se mide qué parte de la
// pantalla tiene algo a menos de NEAR metros (un muro, las púas de la joroba,
// la mano, una almena). Se apuntan los malos momentos y con qué choca.
//   node tools/filmclip.mjs [rito|establo|torreSur|cabalgada|muralla] [paso s] [umbral] [hoja.png]
//   (paso: cada cuánto se mide, 0.25 s; umbral: fracción de pantalla, 0.12)
//   NEAR=0.45 (m)
// Requiere npx vite --port 5199.
import { chromium } from 'playwright';
import fs from 'node:fs';

const [cp = 'rito', stepArg = '0.25', thrArg = '0.12', out = 'tools/shots/filmclip.png'] = process.argv.slice(2);
const NEAR = +(process.env.NEAR || 0.45);
fs.mkdirSync(out.replace(/[^/]+$/, '') || '.', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
await p.goto('http://localhost:5199/?dev=1&at=0,-10,-144&yaw=180');
await p.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const res = await p.evaluate(
  async ([cp, step, thr, NEAR]) => {
    window.__pause = true;
    const g = __game;
    const THREE = g.THREE;
    g.ui.closeAll();
    g.input.enabledPointerLock = false;
    g.input.onPointerLockLost = null;
    await g.colossi.model('turiferario');
    g.dev.autoQTE = true;
    // (qué plano es: la línea del guion que lo puso)
    const F0 = g.finale.film;
    for (const name of ['follow', 'shot', 'move']) {
      const orig = F0[name];
      F0[name] = function (...args) {
        const st = new Error().stack.split('\n').slice(2);
        const fr = st.map((l) => (l.match(/(film_[a-z]+\.js):(\d+)/) || [])[0]).filter(Boolean);
        F0._src = fr.slice(0, 2).join('<');
        return orig.apply(this, args);
      };
    }
    await g.finale.debugFilm(cp);
    // una rejilla de rayos desde la cámara (lo que se ve: sin lo transparente,
    // las partículas ni el polvo), hasta NEAR metros
    const rc = new THREE.Raycaster();
    rc.near = 0;
    rc.far = NEAR;
    const cam = g.camera;
    const NX = 11,
      NY = 7;
    const ok = (o) => {
      for (let q = o; q; q = q.parent) if (!q.visible) return false;
      const m = o.material;
      return !(o.isPoints || o.isSprite || (m && (m.transparent || m.isShaderMaterial)));
    };
    const measure = () => {
      let close = 0,
        closest = 1e9;
      const what = new Map();
      for (let i = 0; i < NX; i++)
        for (let j = 0; j < NY; j++) {
          rc.setFromCamera(new THREE.Vector2(-0.95 + (1.9 * i) / (NX - 1), -0.82 + (1.64 * j) / (NY - 1)), cam);
          const h = rc.intersectObjects(g.scene.children, true).find((h) => ok(h.object));
          if (!h) continue;
          close++;
          closest = Math.min(closest, h.distance);
          const o = h.object;
          const k = (o.userData.bucket || o.userData.group || o.type + (o.isSkinnedMesh ? ':piel' : '')).split('|')[0];
          what.set(k, (what.get(k) || 0) + 1);
        }
      return { frac: close / (NX * NY), closest, what: [...what.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]).join(',') };
    };
    const bad = [];
    const all = [];
    let t = 0;
    const steps = Math.round(step * 30);
    for (let k = 0; k < 420 / step; k++) {
      for (let s = 0; s < steps; s++) g.update(1 / 30);
      t += steps / 30;
      if (g.state === 'ending' || g.player.dead) break;
      // (sólo en las cinemáticas y en los planos del guion)
      const F = g.finale.film;
      if (!F.cam) continue;
      cam.updateMatrixWorld();
      const m = measure();
      const G = g.finale.giant;
      const row = { t: +t.toFixed(2), frac: +m.frac.toFixed(3), near: +m.closest.toFixed(2), what: m.what, cam: [cam.position.x, cam.position.y, cam.position.z].map((v) => +v.toFixed(1)), gt: G && G.R.action.clip ? G.R.action.clip.name + '@' + G.R.action.t.toFixed(2) : null, qte: g.qte.active ? g.qte.cur.label : '', cp: g.flags['film:cp'], src: F._src || '' };
      all.push(row);
      if (m.frac >= thr) bad.push(row);
    }
    return { bad, n: all.length };
  },
  [cp, +stepArg, +thrArg, NEAR]
);
console.log('medidos', res.n, 'malos', res.bad.length);
for (const r of res.bad) console.log(JSON.stringify(r));
if (logs.length) console.log(logs.slice(0, 10).join('\n'));
fs.writeFileSync(out.replace(/\.png$/, '.json'), JSON.stringify(res.bad));
await b.close();
