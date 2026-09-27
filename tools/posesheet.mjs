// Hoja de poses: renderiza al jugador (o a una criatura) en varios instantes
// de un clip o de la locomoción y los compone en una sola imagen.
//   node tools/posesheet.mjs out.png "light1@0,0.14,0.26,0.4" "loco@4.5@0,0.25,0.5,0.75"
//   CAM="yawDeg,height,dist"  WHO=player|<tipo de criatura>   (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const [out, ...specs] = process.argv.slice(2);
const cam = (process.env.CAM || '35,1.2,3.4').split(',').map(Number);
const who = process.env.WHO || 'player';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
await p.goto('http://localhost:5199/?dev=1&at=0,0,-44&yaw=0');
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const res = await p.evaluate(
  async ([specs, cam, who]) => {
    window.__pause = true;
    const g = __game;
    const T = g.THREE;
    g.ui.closeAll();
    g.ui.showHud(false);
    g.input.enabledPointerLock = false;
    for (const m of g.level.meshes) m.visible = false;
    g.enemies.forEach((e) => (e.obj.visible = false, e.shadow.visible = false));
    g.scene.fog.density = 0.0001;
    g.atmo.update = () => {};
    g.post.U.uVol.value = 0;
    g.post.U.uFogColor.value.setRGB(0.18, 0.18, 0.2);
    const grid = new T.GridHelper(20, 40, 0x886644, 0x443322);
    grid.position.set(0, 0.001, -44);
    g.scene.add(grid);
    const floor = new T.Mesh(new T.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), new T.MeshLambertMaterial({ color: 0x3a3632 }));
    floor.position.set(0, -0.002, -44);
    g.scene.add(floor);
    g.atmo.hemi.intensity = 2.4;
    g.atmo.moon.intensity = 1.6;
    const P = g.player;
    let E = null;
    if (who !== 'player') {
      E = g.enemies.find((e) => e.type === who);
      E.spec = { ...E.spec, x: 0, y: 0, z: -44, yaw: 0, idle: 'stand' };
      E.home = { x: 0, y: 0, z: -44, yaw: 0 };
      E.reset();
      E.obj.visible = true;
      P.obj.visible = false;
      P.body.pos.set(0, 0, -30);
    } else P.spawn(0, 0, -44, 0);
    const actor = E || P;
    const clips = E ? E.T.clips : P.clips;
    const W = 960,
      H = 540;
    const cw = 240,
      ch = 300;
    const frames = [];
    for (const s of specs) {
      const parts = s.split('@');
      const times = (parts[parts.length - 1] || '0').split(',').map(Number);
      for (const t of times) frames.push({ kind: parts[0], arg: parts.length > 2 ? +parts[1] : null, t });
    }
    const cols = Math.min(6, frames.length);
    const rows = Math.ceil(frames.length / cols);
    const sheet = document.createElement('canvas');
    sheet.width = cols * cw;
    sheet.height = rows * ch;
    const sc = sheet.getContext('2d');
    sc.fillStyle = '#111';
    sc.fillRect(0, 0, sheet.width, sheet.height);
    const gl = document.getElementById('gl');
    let i = 0;
    for (const f of frames) {
      // estado limpio
      if (E) {
        E.reset();
        E.obj.visible = true;
        E.state = f.kind === 'loco' ? 'chase' : 'attack';
      } else {
        P.spawn(0, 0, -44, 0);
        P.state = f.kind === 'loco' ? 'free' : 'cine';
      }
      const A = actor.anim;
      if (f.kind === 'loco') {
        const sp = f.arg || 0;
        actor.vx = 0;
        actor.vz = sp;
        if (E) {
          for (let k = 0; k < 90; k++) E.animate(1 / 60);
          if (E.gait) E.gait.phase = f.t;
          else E.phase = f.t * Math.PI * 2;
          E.animate(1 / 600);
        } else {
          for (let k = 0; k < 90; k++) P.animate(1 / 60);
          P.gait.phase = f.t;
          P.animate(1 / 600);
        }
      } else {
        const c = clips[f.kind];
        if (!c) {
          frames.err = 'no clip ' + f.kind;
          continue;
        }
        A.play(c, { blend: 0 });
        A.from = null;
        A.xf = 1;
        A.w = 1;
        A.t = f.t;
        if (E) E.animate(1 / 600);
        else {
          P.animate(1 / 600);
          P.animate(1 / 600);
        }
      }
      const Pp = actor.pos;
      const ang = (cam[0] * Math.PI) / 180;
      const hh = E ? E.T.height : 1.8;
      const dist = cam[2] * Math.max(1, hh / 1.8);
      g.camRig.override = { pos: new T.Vector3(Pp.x + Math.sin(ang) * dist, Pp.y + cam[1] * Math.max(1, hh / 1.8), Pp.z + Math.cos(ang) * dist), look: new T.Vector3(Pp.x, Pp.y + hh * 0.5, Pp.z), speed: 1000 };
      g.camRig.update(1, g.input, P, null, g.world.col, false);
      g.camera.position.copy(g.camRig.override.pos);
      g.camera.lookAt(g.camRig.override.look);
      g.render();
      const gx = (i % cols) * cw,
        gy = Math.floor(i / cols) * ch;
      const srcW = (gl.width * cw) / (W * 0.62),
        srcH = (gl.height * ch) / (H * 0.95);
      sc.drawImage(gl, (gl.width - srcW) / 2, (gl.height - srcH) / 2, srcW, srcH, gx, gy, cw, ch);
      sc.fillStyle = '#e8d8b0';
      sc.font = '14px monospace';
      sc.fillText(`${f.kind}${f.arg !== null ? '@' + f.arg : ''} t=${f.t}`, gx + 6, gy + 16);
      i++;
    }
    return sheet.toDataURL('image/png');
  },
  [specs, cam, who]
);
const fs = await import('fs');
fs.writeFileSync(out, Buffer.from(res.split(',')[1], 'base64'));
console.log(logs.join('\n'));
await b.close();
