// Rendijas a la nada en la cripta y la cripta honda: pinta el fondo de
// magenta (lo que no tapa ninguna cara) y pone la cámara en cada sala de la
// planta (LAYOUT de level_crypt2.js; en el centro y, en las grandes, también en
// los cuartos), a la altura de los ojos, mirando en ocho rumbos, al frente y
// hacia arriba. Cuenta los píxeles de fondo de cada vista y guarda las que
// tienen alguno en tools/shots/voids/ (sala_x_z_rumbo_inclinación.png).
// Encuentra lo que no ven zfight.mjs ni holes.mjs: un muro que no llega al
// arranque de su bóveda, un luneto con el hueco más ancho que las enjutas de
// su arco, una cuña sin suelo que deja la triangulación de un polígono.
//   node tools/voids.mjs [sala,sala...]      (requiere npx vite --port 5199)
// (con ABIERTO=1, con todas las puertas abiertas)
import { chromium } from 'playwright';
import fs from 'fs';
const only = process.argv[2] ? process.argv[2].split(',') : null;
const out = 'tools/shots/voids';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 480, height: 270 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5199/?dev=1');
await p.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const spots = await p.evaluate(
  async ([only, open]) => {
    window.__pause = true;
    const g = __game;
    const T = g.THREE;
    g.ui.closeAll();
    g.ui.showHud(false);
    g.enemies.forEach((e) => {
      e.obj.visible = false;
      if (e.shadow) e.shadow.visible = false;
    });
    g.player.obj.visible = false;
    g.playerShadow.visible = false;
    // (sin niebla espesa ni volumétrica: el fondo, puro; la geometría, a la vista)
    g.atmo.update = () => {};
    g.scene.background = new T.Color(1, 0, 1);
    g.scene.fog.density = 0.02;
    g.post.U.uVol.value = 0;
    if (open) for (const it of g.interact.list) if (it.kind === 'door' && it.lock && it.lock.type !== 'god') g.interact.setOpen(it, true);
    const { LAYOUT, cryptFloorY } = await import('/src/world/level_crypt2.js');
    const S = [];
    for (const R of LAYOUT) {
      if (only && !only.includes(R.id)) continue;
      const [x0, z0, x1, z1] = R.r;
      const pts = [[(x0 + x1) / 2, (z0 + z1) / 2]];
      if ((x1 - x0) * (z1 - z0) > 60)
        for (const [u, v] of [
          [0.25, 0.25],
          [0.75, 0.25],
          [0.25, 0.75],
          [0.75, 0.75],
        ])
          pts.push([x0 + (x1 - x0) * u, z0 + (z1 - z0) * v]);
      for (const [x, z] of pts) {
        const y = g.world.col.groundHeight(x, z, 0.1, (R.top ?? R.y + 3) - 0.3);
        S.push({ id: R.id, x, y: (y ?? cryptFloorY(x, z)) + 1.6, z });
      }
    }
    return S;
  },
  [only, !!process.env.ABIERTO]
);
const res = [];
let n = 0;
for (const s of spots)
  for (const pitch of [0, 0.45])
    for (let k = 0; k < 8; k++) {
      const yaw = (k / 8) * Math.PI * 2;
      const px = await p.evaluate(
        ([x, y, z, yaw, pitch]) => {
          const g = __game,
            T = g.THREE;
          const tx = x + Math.sin(yaw) * Math.cos(pitch),
            ty = y + Math.sin(pitch),
            tz = z + Math.cos(yaw) * Math.cos(pitch);
          g.player.body.pos.set(x, y - 1.6, z);
          g.camRig.override = { pos: new T.Vector3(x, y, z), look: new T.Vector3(tx, ty, tz), speed: 1000 };
          for (let i = 0; i < 2; i++) g.update(1 / 30);
          g.camera.position.set(x, y, z);
          g.camera.lookAt(tx, ty, tz);
          g.camera.updateMatrixWorld();
          g.render();
          const gl = g.renderer.getContext();
          const w = gl.drawingBufferWidth,
            h = gl.drawingBufferHeight;
          const buf = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
          // (el posproceso lava el magenta: rojo y azul muy por encima del verde)
          let c = 0;
          for (let i = 0; i < buf.length; i += 4) if (buf[i] - buf[i + 1] > 45 && buf[i + 2] - buf[i + 1] > 45 && Math.abs(buf[i] - buf[i + 2]) < 45) c++;
          return c;
        },
        [s.x, s.y, s.z, yaw, pitch]
      );
      n++;
      if (!px) continue;
      const name = `${s.id}_${s.x.toFixed(1)}_${s.z.toFixed(1)}_${k}_${pitch ? 'arriba' : 'frente'}`;
      res.push({ px, name });
      await p.screenshot({ path: `${out}/${name}.png` });
    }
res.sort((a, c) => c.px - a.px);
console.log(`vistas: ${n}  con rendijas: ${res.length}`);
for (const r of res) console.log(String(r.px).padStart(7), ' ', r.name);
if (logs.length) console.log(logs.join('\n'));
await b.close();
