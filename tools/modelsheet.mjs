// Hoja de modelo: construye un rig suelto (importando su módulo desde Vite),
// lo pone bien iluminado en un sitio abierto y lo fotografía desde varios
// ángulos, en una pose (un clip en un instante, o la de reposo).
//   node tools/scratch/msheet.mjs out_prefix /src/entities/coronado.js buildCoronado [clipsExport.clip@t] [views]
// views: "az,el,dist,yLook;..." (grados, metros). ENV: AT=x,y,z (dónde), PROBE=r,g,b
import { chromium } from 'playwright';
const [out, mod, fn, clipArg = '', viewsArg = '0,8,3.2,1.1;45,8,3.2,1.1;90,8,3.2,1.1;180,8,3.2,1.1;0,4,1.1,1.6'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.W || 720), height: +(process.env.H || 720) } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + e.stack));
p.on('console', (m) => { if (m.type() === 'error') logs.push('ERR: ' + m.text()); });
if (process.env.POSE) await p.addInitScript((j) => (window.__POSE = JSON.parse(j)), process.env.POSE);
if (process.env.JOINTS) await p.addInitScript((j) => (window.__JOINTS = j.split(',')), process.env.JOINTS);
if (process.env.HIDE) await p.addInitScript((j) => (window.__HIDE = j.split(',')), process.env.HIDE);
if (process.env.SHOW) await p.addInitScript((j) => (window.__SHOW = j.split(',')), process.env.SHOW);
await p.goto('http://localhost:5199/?dev=1');
await p.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const views = viewsArg.split(';').map((v) => v.split(',').map(Number));
const res = await p.evaluate(
  async ([mod, fn, clipArg, at, probe]) => {
    window.__pause = true;
    const g = __game;
    const T = g.THREE;
    g.ui.closeAll();
    g.ui.showHud(false);
    g.enemies.forEach((e) => { e.obj.visible = false; e.shadow && (e.shadow.visible = false); });
    g.player.obj.visible = false;
    g.playerShadow && (g.playerShadow.visible = false);
    g.scene.fog.density = 0.002;
    g.atmo.update = () => {};
    g.post.U.uVol.value = 0;
    const M = await import(mod);
    const rig = M[fn]();
    rig.own();
    g.scene.add(rig.root);
    const [x, y, z] = at;
    rig.root.position.set(x, y, z);
    rig.setProbe(probe[0], probe[1], probe[2], y);
    // la pose
    let info = 'reposo';
    if (clipArg) {
      // 'CLIPS.nombre@t' (un clip en el instante t) o 'TYPE.idlePose@kind'
      const [cname, ct] = clipArg.split('@');
      const [ex, key] = cname.split('.');
      let pose;
      if (key === 'idlePose') pose = M[ex].idlePose({ data: {}, phase: 0, game: g }, ct || 'stand', 0, 0);
      else {
        const R = await import('/src/entities/rig.js');
        pose = R.sampleClip(M[ex][key], +(ct || 0), {});
      }
      rig.apply(pose);
      info = cname + '@' + ct;
    }
    // (POSE: articulaciones a pisar, en grados, sobre la pose de antes)
    if (window.__POSE) {
      const cur = {};
      for (const k in rig.joints) {
        const q = rig.joints[k].quaternion.clone().premultiply(rig.restQ[k].clone().invert());
        const e = new T.Euler().setFromQuaternion(q, 'XYZ');
        cur[k] = [e.x, e.y, e.z];
      }
      for (const k in window.__POSE) cur[k] = window.__POSE[k].map((v) => (v * Math.PI) / 180);
      rig.apply(cur);
    }
    // (HIDE: grupos de piezas a ocultar, separados por comas; SHOW: a mostrar)
    for (const m of rig.meshes) {
      const gr = m.userData.grp;
      if (!gr) continue;
      if ((window.__HIDE || []).includes(gr)) m.visible = false;
      if ((window.__SHOW || []).includes(gr)) m.visible = true;
    }
    rig.root.updateMatrixWorld(true);
    window.__RIG = rig;
    window.__AT = at;
    // (JOINTS: dónde quedan esas articulaciones, respecto a AT)
    let jinfo = '';
    for (const j of window.__JOINTS || []) {
      const v = rig.worldPos(j, new T.Vector3());
      jinfo += ` ${j}=(${(v.x - x).toFixed(2)},${(v.y - y).toFixed(2)},${(v.z - z).toFixed(2)})`;
    }
    return info + ' keys:' + Object.keys(M).join(',') + jinfo;
  },
  [mod, fn, clipArg, (process.env.AT || '-10,0,44').split(',').map(Number), (process.env.PROBE || '1.15,1.1,1.05').split(',').map(Number)]
);
console.log(res);
let i = 0;
for (const [az, el, dist, yl] of views) {
  await p.evaluate(([az, el, dist, yl]) => {
    const g = __game;
    const T = g.THREE;
    const [x, y, z] = window.__AT;
    const a = (az * Math.PI) / 180,
      e = (el * Math.PI) / 180;
    const c = new T.Vector3(x + Math.sin(a) * Math.cos(e) * dist, y + yl + Math.sin(e) * dist, z + Math.cos(a) * Math.cos(e) * dist);
    const look = new T.Vector3(x, y + yl, z);
    g.camRig.override = { pos: c, look, speed: 1000, fov: 40 };
    for (let k = 0; k < 2; k++) g.update(1 / 30);
    g.camera.position.copy(c);
    g.camera.lookAt(look);
    g.camera.fov = 40;
    g.camera.updateProjectionMatrix();
    g.render();
  }, [az, el, dist, yl]);
  await p.screenshot({ path: `${out}${i++}.png` });
}
console.log(logs.join('\n'));
await b.close();
