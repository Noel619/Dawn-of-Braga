// Hoja de posturas de Miguel, el tonelero (entities/morador.js): en el rincón
// llorando, mirando por encima del hombro, encogido, mordiéndose el brazo y
// ahorcado; cada una desde delante y desde atrás.
//   node tools/morador.mjs out.png      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const [out = 'tools/shots/morador.png'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5199/?dev=1&at=0,0,-44&yaw=0');
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const res = await p.evaluate(async () => {
  window.__pause = true;
  const g = __game;
  const T = g.THREE;
  g.ui.closeAll();
  g.ui.showHud(false);
  g.input.enabledPointerLock = false;
  for (const m of g.level.meshes) m.visible = false;
  g.enemies.forEach((e) => ((e.obj.visible = false), (e.shadow.visible = false)));
  g.scene.fog.density = 0.0001;
  g.atmo.update = () => {};
  g.post.U.uVol.value = 0;
  g.post.U.uFogColor.value.setRGB(0.18, 0.18, 0.2);
  const floor = new T.Mesh(new T.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), new T.MeshLambertMaterial({ color: 0x3a3632 }));
  floor.position.set(0, -0.002, -44);
  g.scene.add(floor);
  g.atmo.hemi.intensity = 2.4;
  g.atmo.moon.intensity = 1.6;
  g.player.obj.visible = false;
  g.player.body.pos.set(0, 0, -30);
  const E = g.enemies.find((e) => e.type === 'morador');
  g.souto.npc = null; // (que su guion no le mueva)
  E.body.pos.set(0, 0, -44);
  E.yaw = 0;
  E.obj.visible = true;
  E.state = 'dormant';
  const poses = [
    ['llora', { sob: 1 }, [0, 0], 0, 1],
    ['te mira', { sob: 1 }, [2.2, 1], 0.35, 0.25],
    ['encogido', { cower: 1 }, [2.0, 0.45], 1, 0],
    ['se muerde', { bite: 1 }, [2.0, 0.2], 1, 0],
    ['ahorcado', { hang: 1 }, [0, 0], 0, 0],
  ];
  const cams = [
    [0.4, 1.0, 2.4],
    [-2.6, 1.3, -1.2],
  ];
  const cw = 320,
    ch = 300;
  const sheet = document.createElement('canvas');
  sheet.width = poses.length * cw;
  sheet.height = cams.length * ch;
  const sc = sheet.getContext('2d');
  const gl = document.getElementById('gl');
  for (let i = 0; i < poses.length; i++) {
    const [, W, look, shake, sob] = poses[i];
    E.data.W = { sob: 0, cower: 0, bite: 0, hang: 0, ...W };
    E.data.look = look;
    E.data.shake = shake;
    E.data.sob = sob;
    E.body.pos.y = W.hang ? 0.5 : 0;
    for (let k = 0; k < 3; k++) E.animate(1 / 60);
    for (let j = 0; j < cams.length; j++) {
      const [cx, cy, cz] = cams[j];
      g.camera.position.set(cx, cy + (W.hang ? 0.6 : 0), -44 + cz);
      g.camera.lookAt(0, W.hang ? 1.3 : 0.5, -44);
      g.camera.updateMatrixWorld();
      g.render();
      sc.drawImage(gl, (gl.width - (gl.height * cw) / ch) / 2, 0, (gl.height * cw) / ch, gl.height, i * cw, j * ch, cw, ch);
    }
    sc.fillStyle = '#fff';
    sc.font = '14px monospace';
    sc.fillText(poses[i][0], i * cw + 8, 18);
  }
  return sheet.toDataURL('image/png');
});
const fs = await import('fs');
fs.writeFileSync(out, Buffer.from(res.split(',')[1], 'base64'));
console.log(logs.join('\n') || 'ok');
await b.close();
