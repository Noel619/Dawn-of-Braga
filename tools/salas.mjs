// La luz de cada sala: pone la cámara a la altura de los ojos en cada zona
// (en el centro de cada rectángulo y, en las grandes, también en sus cuartos),
// mirando en cuatro rumbos, y mide lo que se ve: el brillo medio (luma de 0 a
// 255), lo que queda a oscuras (luma < 14) y lo que se quema (> 235). También
// la luz horneada que recibe quien está en el centro (la sonda: lo que ilumina
// al jugador y a las criaturas). Guarda una hoja por sala (sus vistas, una al
// lado de otra) en tools/shots/salas/ y saca una tabla, de la más oscura a la
// más clara.
//   node tools/salas.mjs                 (las salas del castillo y la fortaleza)
//   node tools/salas.mjs salon,cocina    (sólo ésas)
//   (requiere npx vite --port 5199; con SIN=1, sin hojas: sólo la tabla)
import { chromium } from 'playwright';
import fs from 'fs';
const only = process.argv[2] ? process.argv[2].split(',') : null;
const out = 'tools/shots/salas';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const W = 480,
  H = 270;
const p = await b.newPage({ viewport: { width: W, height: H } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5199/?dev=1');
await p.waitForFunction(() => window.__ready, null, { timeout: 180000 });
const spots = await p.evaluate((only) => {
  window.__pause = true;
  const g = __game;
  g.ui.closeAll();
  g.ui.showHud(false);
  g.enemies.forEach((e) => {
    e.obj.visible = false;
    if (e.shadow) e.shadow.visible = false;
  });
  g.player.obj.visible = false;
  g.playerShadow.visible = false;
  // (el castillo, sus mazmorras y la fortaleza, con sus jardines y adarves)
  const inside = (r) => r[0] < -40 && r[2] > -160 && r[1] < 30 && r[3] > -140;
  const S = [];
  const seen = new Set();
  for (const z of g.level.L.zones) {
    if (only ? !only.includes(z.id) : !z.rects.some(inside)) continue;
    // (una zona puede repetirse: la mazmorra, por tramos)
    const key = z.id + ':' + z.rects.map((r) => r.join()).join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    for (const r of z.rects) {
      if (!only && !inside(r)) continue;
      const [x0, z0, x1, z1, y0, y1] = r;
      if ((x1 - x0) * (z1 - z0) < 3) continue;
      const pts = [[(x0 + x1) / 2, (z0 + z1) / 2]];
      if ((x1 - x0) * (z1 - z0) > 220)
        for (const [u, v] of [
          [0.25, 0.25],
          [0.75, 0.75],
        ])
          pts.push([x0 + (x1 - x0) * u, z0 + (z1 - z0) * v]);
      for (const [x, zz] of pts) {
        const gy = g.world.col.groundHeight(x, zz, 0.1, Math.min(y1 - 0.5, y0 + 3));
        if (gy === null || gy === undefined || gy < y0 - 0.5) continue;
        S.push({ id: z.id, atmo: z.atmo, room: z.room || null, x, y: gy, z: zz, long: x1 - x0 > z1 - z0 ? 'x' : 'z' });
      }
    }
  }
  return S;
}, only);

// las vistas de un punto: cuatro rumbos a la altura de los ojos
async function views(s) {
  return p.evaluate(
    ([s]) => {
      const g = __game,
        T = g.THREE;
      const zn = g.zoneAt({ x: s.x, y: s.y + 0.5, z: s.z });
      g.atmo.set((zn || { atmo: s.atmo }).atmo, true);
      g.zone = null;
      const eye = s.y + 1.6;
      g.player.body.pos.set(s.x, s.y, s.z);
      const res = [];
      for (let k = 0; k < 4; k++) {
        const yaw = (k / 4) * Math.PI * 2 + (s.long === 'x' ? Math.PI / 2 : 0);
        const tx = s.x + Math.sin(yaw),
          tz = s.z + Math.cos(yaw);
        g.camRig.override = { pos: new T.Vector3(s.x, eye, s.z), look: new T.Vector3(tx, eye - 0.08, tz), speed: 1000 };
        for (let i = 0; i < 3; i++) g.update(1 / 30);
        g.camera.position.set(s.x, eye, s.z);
        g.camera.lookAt(tx, eye - 0.08, tz);
        g.camera.updateMatrixWorld();
        g.render();
        const gl = g.renderer.getContext();
        const w = gl.drawingBufferWidth,
          h = gl.drawingBufferHeight;
        const buf = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        let sum = 0,
          dark = 0,
          burn = 0;
        const n = w * h;
        for (let i = 0; i < buf.length; i += 4) {
          const l = 0.299 * buf[i] + 0.587 * buf[i + 1] + 0.114 * buf[i + 2];
          sum += l;
          if (l < 14) dark++;
          else if (l > 235) burn++;
        }
        // la vista, a un lienzo pequeño para la hoja
        const c = document.createElement('canvas');
        c.width = 240;
        c.height = 135;
        c.getContext('2d').drawImage(g.renderer.domElement, 0, 0, 240, 135);
        res.push({ lum: sum / n, dark: dark / n, burn: burn / n, img: c.toDataURL('image/png') });
      }
      g.camRig.override = null;
      const rid = zn && zn.room ? g.level.ctx.wb.roomId(zn.room) : 0;
      const pr = g.probe.sample(s.x, s.y + 1.1, s.z, rid);
      return { res, probe: (pr[0] + pr[1] + pr[2]) / 3 };
    },
    [s]
  );
}

const rooms = new Map();
for (const s of spots) {
  const v = await views(s);
  const R = rooms.get(s.id) || { id: s.id, atmo: s.atmo, v: [], probe: [], imgs: [] };
  for (const r of v.res) R.v.push(r);
  R.probe.push(v.probe);
  if (R.imgs.length < 8) R.imgs.push(...v.res.map((r) => r.img));
  rooms.set(s.id, R);
}
// las hojas: cuatro vistas por fila (y otra fila si hay otro punto)
if (!process.env.SIN)
  for (const R of rooms.values()) {
    const png = await p.evaluate(async (imgs) => {
      const c = document.createElement('canvas');
      const rows = Math.ceil(imgs.length / 4);
      c.width = 960;
      c.height = 135 * rows;
      const x = c.getContext('2d');
      for (let i = 0; i < imgs.length; i++) {
        const im = new Image();
        im.src = imgs[i];
        await im.decode();
        x.drawImage(im, (i % 4) * 240, Math.floor(i / 4) * 135);
      }
      return c.toDataURL('image/png').split(',')[1];
    }, R.imgs);
    fs.writeFileSync(`${out}/${R.id}.png`, Buffer.from(png, 'base64'));
  }
const tab = [...rooms.values()].map((R) => {
  const lums = R.v.map((v) => v.lum);
  return {
    id: R.id,
    atmo: R.atmo,
    lum: lums.reduce((a, c) => a + c, 0) / lums.length,
    min: Math.min(...lums),
    max: Math.max(...lums),
    dark: R.v.reduce((a, v) => a + v.dark, 0) / R.v.length,
    burn: R.v.reduce((a, v) => a + v.burn, 0) / R.v.length,
    probe: R.probe.reduce((a, c) => a + c, 0) / R.probe.length,
  };
});
tab.sort((a, c) => a.lum - c.lum);
console.log('sala                    atmósfera   brillo  (mín–máx)   oscuro  quemado  sonda');
for (const t of tab)
  console.log(
    t.id.padEnd(23),
    t.atmo.padEnd(10),
    t.lum.toFixed(1).padStart(7),
    `(${t.min.toFixed(0)}–${t.max.toFixed(0)})`.padStart(11),
    `${(t.dark * 100).toFixed(0)} %`.padStart(7),
    `${(t.burn * 100).toFixed(1)} %`.padStart(8),
    t.probe.toFixed(2).padStart(6)
  );
if (logs.length) console.log(logs.join('\n'));
await b.close();
