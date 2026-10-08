// Hoja de poses de los colosos del jefe final: monta el coloso en el estudio,
// muestrea sus clips en varios instantes (con los muelles de la ropa y la cola
// simulados desde el principio del clip, como en el juego) y compone las
// vistas en una sola imagen.
//   node tools/colposes.mjs out.png turiferario "idle@0,1.4,2.9" "sweep@0,1.25,1.8,2.5@90,12,50,10"
//   CAM="yawDeg,altura,distancia,alturaMirada"  (por defecto 30,12,44,10);
//   un tercer campo en una muestra pone su propia cámara
//   CELL="ancho,alto" (por defecto 320,360)   COLS=n (por defecto 4)
//   BONES=footL,footR   imprime la posición en el mundo de esos huesos
//   FOG=0.001           densidad de la niebla del estudio (Deo, de lejos)
// Requiere npx vite --port 5199.
import { chromium } from 'playwright';
import fs from 'node:fs';

const [out, kind, ...specs] = process.argv.slice(2);
const cam = (process.env.CAM || '30,12,44,10').split(',').map(Number);
const cell = (process.env.CELL || '320,360').split(',').map(Number);
const cols = +(process.env.COLS || 4);
const bones = (process.env.BONES || '').split(',').filter(Boolean);
const fog = +(process.env.FOG || 0);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: cell[0], height: cell[1] } });
const logs = [];
p.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text());
});
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
await p.goto('http://localhost:5199/?dev=1&at=0,0,-44&yaw=0');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
const res = await p.evaluate(
  async ([kind, specs, cam, cell, cols, bones, fog]) => {
    window.__pause = true;
    const g = __game;
    const T = g.THREE;
    g.ui.closeAll();
    g.ui.showHud(false);
    g.input.enabledPointerLock = false;
    g.enemies.forEach((e) => {
      e.obj.visible = false;
      if (e.shadow) e.shadow.visible = false;
    });
    const { ColossusLab } = await import('/src/dev/colossus_lab.js');
    const { Animator } = await import('/src/entities/rig.js');
    const lab = new ColossusLab(g);
    const st = lab.studio();
    const bld = await lab.build(kind);
    lab.place(bld, 0, 0, 0, 0, st);
    lab.atmo('studio', fog ? { density: fog, far: 600 } : { far: 600 });
    // escenas: (R, t, ctx) simulan t segundos con sus propios controles
    let R, clips, scenes;
    if (kind === 'turiferario') {
      const A = await import('/src/game/finale/turiferario_anim.js');
      R = A.turRig(bld.model, {});
      clips = A.TUR_CLIPS;
      scenes = A.TUR_SCENES || {};
    } else {
      const A = await import('/src/game/finale/deo_anim.js');
      R = A.deoRig(bld.model, {});
      clips = A.DEO_CLIPS;
      scenes = A.DEO_SCENES || {};
    }
    const items = [];
    for (const s of specs) {
      const [name, ts, cs] = s.split('@');
      const cm = cs ? cs.split(',').map(Number) : cam;
      for (const t of ts.split(',').map(Number)) items.push({ name, t, cam: cm });
    }
    const rows = Math.ceil(items.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cell[0] * cols;
    cv.height = cell[1] * rows;
    const cx = cv.getContext('2d');
    cx.fillStyle = '#111';
    cx.fillRect(0, 0, cv.width, cv.height);
    const C = g.camera;
    C.fov = 40;
    C.aspect = cell[0] / cell[1];
    C.far = 400;
    C.updateProjectionMatrix();
    const setCam = (cm) => {
      const yaw = (cm[0] * Math.PI) / 180;
      C.position.set(Math.sin(yaw) * cm[2], cm[1], Math.cos(yaw) * cm[2]);
      C.lookAt(0, cm[3], 0);
      C.updateMatrixWorld();
    };
    const info = [];
    const _v = new T.Vector3();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const c = clips[it.name];
      const sc = scenes[it.name];
      if (!c && !sc) {
        info.push(it.name + ': no existe');
        continue;
      }
      R.base = new Animator();
      R.action = new Animator();
      R.time = 0;
      for (const j in R.add) delete R.add[j];
      R.resetDyn();
      if (sc) sc(R, it.t, { model: bld.model, THREE: T });
      else {
        R.base.play(c, { blend: 0.001 });
        const n = Math.max(1, Math.round(it.t * 60));
        for (let k = 0; k < n; k++) R.update(it.t / n);
        if (it.t === 0) R.update(0);
      }
      bld.model.root.updateMatrixWorld(true);
      setCam(it.cam);
      lab.renderStudio();
      const x = (i % cols) * cell[0],
        y = Math.floor(i / cols) * cell[1];
      cx.drawImage(g.renderer.domElement, x, y, cell[0], cell[1]);
      cx.fillStyle = 'rgba(0,0,0,0.55)';
      cx.fillRect(x, y, cell[0], 22);
      cx.fillStyle = '#f0e0c0';
      cx.font = '14px monospace';
      cx.fillText(it.name + ' @ ' + it.t.toFixed(2) + ' s', x + 6, y + 16);
      cx.strokeStyle = '#000';
      cx.strokeRect(x + 0.5, y + 0.5, cell[0] - 1, cell[1] - 1);
      if (bones.length) {
        const row = [it.name + '@' + it.t];
        for (const bn of bones) {
          const bo = bld.model.byName[bn];
          if (!bo) continue;
          bo.getWorldPosition(_v);
          row.push(bn + ' ' + _v.x.toFixed(2) + ',' + _v.y.toFixed(2) + ',' + _v.z.toFixed(2));
        }
        info.push(row.join('  '));
      }
    }
    return { png: cv.toDataURL('image/png'), info };
  },
  [kind, specs, cam, cell, cols, bones, fog]
);
fs.writeFileSync(out, Buffer.from(res.png.split(',')[1], 'base64'));
if (res.info.length) console.log(res.info.join('\n'));
if (logs.length) console.log(logs.slice(0, 20).join('\n'));
await b.close();
