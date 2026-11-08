// Hoja de las armaduras del jugador (src/entities/armaduras.js): monta un
// maniquí por figura (el cuerpo sin armadura, cada armadura o una mezcla de
// piezas), le copia la pose del jugador de verdad (un golpe, la guardia, la
// marcha...) y lo fotografía desde varios lados; filas: figuras, columnas:
// vistas.
//   node tools/armaduras.mjs out.png desnudo guardia caballero cuero
//   node tools/armaduras.mjs out.png head=caballero+body=cuero+legs=guardia
//   node tools/armaduras.mjs out.png caballero cuero@180   (@grados: girada)
//   (requiere npx vite --port 5199)
// ENV:
//   VISTAS="az,el,dist,yMira[,xMira];..."  grados y metros (por defecto:
//                                 frente, tres cuartos, perfil y espalda; 0 =
//                                 de frente; xMira, a su izquierda)
//   POSE=light1@0.3 | loco@4.5@0.25 | block@0.2 ...  la del jugador: un clip
//                                 en un instante, o la marcha (velocidad y fase)
//   ARMA=espada                   el jugador empuña ese arma (y el maniquí,
//                                 espada y escudo; sin ARMA, las manos vacías)
//   CELDA=260,420                 tamaño de cada foto
//   FAROL=0                       sin el farol del cinto
//   MIRA=handR                    las vistas miran a esa articulación (yMira
//                                 y xMira, desde ella)
//   ESCENA=x,y,z                  en el juego, en ese sitio, con su luz y su
//                                 niebla (sin ESCENA: en un plató neutro)
//   COLUMNAS=4                    con una sola vista, las figuras en cuadrícula
//                                 (una por celda, con su rótulo)
import { chromium } from 'playwright';
import fs from 'fs';
const [out = 'tools/shots/armaduras.png', ...figs] = process.argv.slice(2);
const figuras = figs.length ? figs : ['desnudo', 'guardia', 'caballero', 'cuero'];
const vistas = (process.env.VISTAS || '0,6,2.9,0.95;35,6,2.9,0.95;90,6,2.9,0.95;180,6,2.9,0.95').split(';').map((v) => v.split(',').map(Number));
const celda = (process.env.CELDA || '260,420').split(',').map(Number);
const pose = process.env.POSE || '';
const arma = process.env.ARMA || '';
const farol = process.env.FAROL !== '0';
const mira = process.env.MIRA || '';
const escena = process.env.ESCENA || '';
const columnas = vistas.length === 1 ? +(process.env.COLUMNAS || 0) : 0;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
// (la ventana, en la proporción de la celda: así no se recorta nada)
const VW = 720,
  VH = Math.round((VW * celda[1]) / celda[0]);
const p = await b.newPage({ viewport: { width: VW, height: VH } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
p.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text());
});
await p.goto('http://localhost:5199/?dev=1&yaw=0&at=' + (escena || '0,0,-44'));
await p.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const res = await p.evaluate(
  async ([figuras, vistas, celda, pose, arma, farol, mira, escena, columnas]) => {
    const g = __game;
    const T = g.THREE;
    g.ui.closeAll();
    g.ui.showHud(false);
    g.input.enabledPointerLock = false;
    const A = await import('/src/entities/armaduras.js');
    const P = g.player;
    // dónde: en el plató (en 0, 0, -44) o en el juego, donde aparece el jugador
    let X = 0,
      Y = 0,
      Z = -44,
      probe = [1.15, 1.1, 1.05];
    if (escena) {
      // (unos segundos de juego: que se asiente la luz, la niebla y el agua)
      for (let k = 0; k < 40; k++) g.update(1 / 30);
      X = P.pos.x;
      Y = P.pos.y;
      Z = P.pos.z;
      const z = g.zoneAt(P.pos);
      const wb = g.level.ctx.wb;
      probe = g.probe.sample(X, Y + 1.1, Z, z && z.room ? wb.roomId(z.room) : 0);
      g.enemies.forEach((e) => ((e.obj.visible = false), e.shadow && (e.shadow.visible = false)));
    } else {
      for (const m of g.level.meshes) m.visible = false;
      g.enemies.forEach((e) => ((e.obj.visible = false), e.shadow && (e.shadow.visible = false)));
      g.scene.fog.density = 0.0001;
      g.atmo.update = () => {};
      g.post.U.uVol.value = 0;
      g.post.U.uFogColor.value.setRGB(0.16, 0.16, 0.18);
      const floor = new T.Mesh(new T.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), new T.MeshLambertMaterial({ color: 0x3a3632 }));
      floor.position.set(0, -0.002, -44);
      g.scene.add(floor);
      const grid = new T.GridHelper(8, 16, 0x6a5a44, 0x3e3428);
      grid.position.set(0, 0.001, -44);
      g.scene.add(grid);
      g.atmo.hemi.intensity = 2.4;
      g.atmo.moon.intensity = 1.6;
    }
    window.__pause = true;
    P.obj.visible = false;
    // la pose, del jugador de verdad
    P.spawn(X, Y, Z, 0);
    P.setEquipment(!!arma, !!arma);
    if (arma) P.equipWeapon(arma);
    let poseInfo = 'reposo';
    if (pose) {
      const parts = pose.split('@');
      if (parts[0] === 'loco') {
        P.state = 'free';
        P.vx = 0;
        P.vz = +parts[1] || 0;
        for (let k = 0; k < 90; k++) P.animate(1 / 60);
        P.gait.phase = +parts[2] || 0;
        P.animate(1 / 600);
      } else {
        const c = P.clips[parts[0]];
        if (!c) return { err: 'no hay clip ' + parts[0] + ' (hay: ' + Object.keys(P.clips).join(', ') + ')' };
        P.state = 'cine';
        const An = P.anim;
        An.play(c, { blend: 0 });
        An.from = null;
        An.xf = 1;
        An.w = 1;
        An.t = +parts[1] || 0;
        P.animate(1 / 600);
        P.animate(1 / 600);
      }
      P.obj.updateMatrixWorld(true);
      poseInfo = pose;
    }
    const copiaPose = (rig) => {
      if (!pose) return;
      for (const k in rig.joints) {
        const src = P.rig.joints[k];
        if (!src) continue;
        rig.joints[k].quaternion.copy(src.quaternion);
        rig.joints[k].position.copy(src.position);
      }
    };
    const W = celda[0],
      H = celda[1];
    const lab = 22;
    // (filas: figuras, columnas: vistas; o, con COLUMNAS, una figura por celda)
    const nc = columnas || vistas.length,
      nr = columnas ? Math.ceil(figuras.length / columnas) : figuras.length;
    const sheet = document.createElement('canvas');
    sheet.width = W * nc;
    sheet.height = (H + lab) * nr;
    const sc = sheet.getContext('2d');
    sc.fillStyle = '#111';
    sc.fillRect(0, 0, sheet.width, sheet.height);
    const gl = document.getElementById('gl');
    const info = [];
    let row = 0;
    for (const f of figuras) {
      // 'guardia' (las cuatro piezas), 'desnudo', o ranura=armadura+...; y
      // @grados, girada
      const [fig, giro = 0] = f.split('@');
      let eq = fig;
      if (fig.includes('=')) {
        eq = {};
        for (const kv of fig.split('+')) {
          const [k, v] = kv.split('=');
          eq[k] = v === '-' ? null : v;
        }
      }
      const rig = A.buildArmado(eq, { farol, espada: !!arma, escudo: !!arma });
      rig.own();
      rig.root.position.set(X, Y, Z);
      rig.root.rotation.y = (+giro * Math.PI) / 180;
      g.scene.add(rig.root);
      rig.setProbe(probe[0], probe[1], probe[2], Y);
      copiaPose(rig);
      rig.root.updateMatrixWorld(true);
      let tris = 0;
      for (const m of rig.meshes) tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
      info.push(`${f}: ${rig.meshes.length} mallas, ${Math.round(tris)} triángulos`);
      let col = 0;
      // (MIRA: el centro de las vistas, en esa articulación)
      const o = mira && rig.joints[mira] ? rig.worldPos(mira, new T.Vector3()) : new T.Vector3(X, Y, Z);
      for (const [az, el, dist, yl, xl = 0] of vistas) {
        const a = (az * Math.PI) / 180,
          e = (el * Math.PI) / 180;
        const c = new T.Vector3(o.x + xl + Math.sin(a) * Math.cos(e) * dist, o.y + yl + Math.sin(e) * dist, o.z + Math.cos(a) * Math.cos(e) * dist);
        const look = new T.Vector3(o.x + xl, o.y + yl, o.z);
        g.camRig.override = { pos: c, look, speed: 1000, fov: 40 };
        g.camRig.update(1, g.input, P, null, g.world.col, false);
        g.camera.position.copy(c);
        g.camera.lookAt(look);
        g.camera.fov = 40;
        g.camera.updateProjectionMatrix();
        g.render();
        const cx = columnas ? row % columnas : col,
          cy = columnas ? Math.floor(row / columnas) : row;
        sc.drawImage(gl, 0, 0, gl.width, gl.height, cx * W, cy * (H + lab) + lab, W, H);
        col++;
      }
      sc.fillStyle = '#e8d8b0';
      sc.font = '15px monospace';
      const etiqueta = columnas ? f : `${f}   [${poseInfo}${arma ? ' · ' + arma : ''}]`;
      sc.fillText(etiqueta, (columnas ? (row % columnas) * W : 0) + 8, (columnas ? Math.floor(row / columnas) : row) * (H + lab) + 16);
      g.scene.remove(rig.root);
      row++;
    }
    return { png: sheet.toDataURL('image/png'), info };
  },
  [figuras, vistas, celda, pose, arma, farol, mira, escena, columnas]
);
if (res.err) console.log(res.err);
else {
  fs.writeFileSync(out, Buffer.from(res.png.split(',')[1], 'base64'));
  console.log(res.info.join('\n'));
}
if (logs.length) console.log(logs.join('\n'));
await b.close();
