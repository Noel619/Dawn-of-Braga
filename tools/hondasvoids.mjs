// Rendijas a la nada en las cloacas hondas (world/cloacas_hondas.js) y en el
// Sumidero: pinta el fondo de magenta (lo que no tapa ninguna cara) y pone la
// cámara en cada cruce, en el medio de cada galería y en las salas de la red
// (y en los puntos de NADO_PTS, si se dan), a la altura de los ojos, mirando
// en ocho rumbos, al frente, hacia arriba y hacia abajo. Cuenta los píxeles
// de fondo de cada vista y guarda las que tienen alguno en
// tools/shots/hvoids/.
//   node tools/hondasvoids.mjs [n1,n2,...]      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
import fs from 'fs';
const only = process.argv[2] ? process.argv[2].split(',') : null;
const out = 'tools/shots/hvoids';
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) fs.unlinkSync(out + '/' + f);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 400, height: 225 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:' + (process.env.PORT || 5199) + '/?dev=1');
await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
const spots = await p.evaluate(
  async ([only]) => {
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
    g.atmo.update = () => {};
    g.scene.background = new T.Color(1, 0, 1);
    g.scene.fog.density = 0.02;
    g.post.U.uVol.value = 0;
    for (const it of g.interact.list) if (it.kind === 'door' && it.lock && it.lock.type !== 'god') g.interact.setOpen && g.interact.setOpen(it, true);
    const S = [];
    for (const R of g.level.ctx.redes || []) {
      for (const n of Object.values(R.N)) {
        if (n.boca || (only && !only.includes(n.def.id))) continue;
        S.push({ id: n.def.id + ':' + n.id, x: n.x, y: n.y + 1.6, z: n.z });
      }
      for (const t of R.T) {
        if (only && !only.includes(t.def.id)) continue;
        const x = (t.a.x + t.b.x) / 2, z = (t.a.z + t.b.z) / 2, y = (t.a.y + t.b.y) / 2;
        S.push({ id: t.def.id + ':' + t.a.id + '-' + t.b.id, x, y: y + 1.6, z });
      }
      for (const s of Object.values(R.salas)) {
        if (s.externa || (only && !only.includes(s.def.id))) continue;
        const [x0, z0, x1, z1] = s.r;
        for (const [u, v] of [[0.5, 0.5], [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]]) S.push({ id: s.def.id + ':' + s.id, x: x0 + (x1 - x0) * u, y: s.y + 1.6, z: z0 + (z1 - z0) * v });
      }
    }
    // (el Sumidero: la repisa, la senda, la playa; sobre el lago y bajo él, a
    // varias hondas; el venero, el tiro y la pila del ninfeo)
    if (!only || only.includes('sumidero')) {
      const pts = [
        [3.5, -21.4, -40], [5.5, -21.4, -44], [2.6, -24.5, -31], [5, -26.2, -22.5],
        [12, -26.4, -40], [20, -26.4, -30], [30, -26.4, -45], [38, -26.4, -32], [24, -26.4, -18], [14, -26.4, -52], [42, -26.4, -45],
        [12, -31, -40], [24, -34, -30], [32, -38, -44], [19.5, -40, -22], [19.5, -44.5, -15], [10, -33, -22],
        [19.5, -44.6, -9], [19.5, -43.8, -2], [19.5, -43, 3], [19.5, -40, 5.6], [19.5, -37.8, 5.6], [19.5, -36.4, 5.6],
      ];
      for (const [x, y, z] of pts) S.push({ id: 'sumidero', x, y, z });
    }
    return S;
  },
  [only]
);
const res = [];
let n = 0;
for (const s of spots)
  for (const pitch of [0, 0.5, -0.5])
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
          let c = 0;
          for (let i = 0; i < buf.length; i += 4) if (buf[i] - buf[i + 1] > 45 && buf[i + 2] - buf[i + 1] > 45 && Math.abs(buf[i] - buf[i + 2]) < 45) c++;
          return c;
        },
        [s.x, s.y, s.z, yaw, pitch]
      );
      n++;
      if (px < 3) continue;
      const name = `${s.id.replace(/[^\w.-]+/g, '_')}_${s.x.toFixed(1)}_${s.z.toFixed(1)}_${k}_${pitch > 0 ? 'arriba' : pitch < 0 ? 'abajo' : 'frente'}`;
      res.push({ px, name });
      await p.screenshot({ path: `${out}/${name}.png` });
    }
res.sort((a, c) => c.px - a.px);
console.log(`vistas: ${n}  con rendijas: ${res.length}`);
for (const r of res.slice(0, 80)) console.log(String(r.px).padStart(7), ' ', r.name);
if (logs.length) console.log(logs.join('\n'));
await b.close();
