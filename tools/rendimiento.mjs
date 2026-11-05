// Lo que cuesta dibujar la fortaleza: llamadas de dibujo y triángulos de un
// fotograma con la cámara del juego, desde los sitios de la fortaleza, del
// patio de armas y de la cárcel, y, para comparar, desde la plaza del Pan y
// los miradores que ya había (el fanal, la atalaya, el adarve del castillo).
// Con DESGLOSE=1 dice también de qué son las llamadas (el mundo, las
// criaturas, los objetos) y qué grupos del mundo se dibujan; con SOLO=...,
// sólo esos sitios.
//   node tools/rendimiento.mjs          (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5199/?dev=1');
await p.waitForFunction(() => window.__ready, null, { timeout: 180000 });
// [nombre, x, y, z, rumbo en grados (0: hacia +z, el sur)]
const TODOS = [
  ['plaza del Pan', 0, 0, 0, 180],
  ['plaza del Pan → norte', 0, 0, 10, 0],
  ['torre del fanal', -60, 20, -124, 0],
  ['atalaya', -60, 13, -109, 0],
  ['adarve del castillo', -62, 9, -21, 90],
  ['patio de armas → puerta', -98, 0, -18, 180],
  ['patio de armas → poniente', -80, 0, 5, -90],
  ['patio de honor → torre', -98, 0, -52, 180],
  ['patio de honor → puerta', -98, 0, -80, 0],
  ['patio de honor → salón', -105, 0, -66, -90],
  ['gran salón', -128, 0, -50, 180],
  ['cocina', -133, 0, -36, 180],
  ['capilla real', -69, 0, -62, 180],
  ['sala del trono', -98, 18, -98, 0],
  ['terraza de la torre', -98, 28, -100, 0],
  ['jardín del Rey', -120, 0, -112, 90],
  ['adarve del jardín', -80, 10, -123.8, -90],
  ['adarve de levante', -64, 13.5, -78, 0],
  ['cárcel del Rey', -106, -7, -70, 0],
];
// (SOLO=adarve,patio: sólo los sitios cuyo nombre lleve eso)
const SOLO = process.env.SOLO ? process.env.SOLO.split(',') : null;
const SITIOS = SOLO ? TODOS.filter(([n]) => SOLO.some((q) => n.includes(q))) : TODOS;
const res = await p.evaluate(
  ([SITIOS, desglose]) => {
    window.__pause = true;
    const g = __game;
    g.ui.closeAll();
    g.player.maxHp = g.player.hp = 1e6;
    const info = g.renderer.info;
    info.autoReset = false;
    const world = new Set(g.level.meshes);
    const roots = new Map(g.enemies.map((e) => [e.obj, e]));
    // (lo que se dibuja de verdad, tras el descarte de three y el de culling.js)
    const R = g.renderer;
    const orig = R.renderBufferDirect.bind(R);
    let log = null;
    R.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
      if (log) log.push(object);
      return orig(camera, scene, geometry, material, object, group);
    };
    const out = [];
    for (const [name, x, y, z, yaw] of SITIOS) {
      g.player.spawn(x, y, z, (yaw * Math.PI) / 180);
      g.camRig.snapTo(g.player);
      for (let i = 0; i < 40; i++) g.update(1 / 30);
      const zn = g.zoneAt(g.player.pos);
      if (zn) g.atmo.set(zn.atmo, true);
      g.update(1 / 30);
      g.render();
      info.reset();
      log = desglose ? [] : null;
      g.render();
      const r = { name, zone: zn ? zn.id : '-', calls: info.render.calls, tris: info.render.triangles, far: Math.round(g.camera.far), sub: g.culling ? g.culling.stats.sub : null };
      if (log) {
        const cats = {},
          groups = {};
        for (const o of log) {
          let k;
          if (world.has(o)) {
            k = 'mundo';
            const gk = String(o.userData.group || '-').split(':')[0];
            groups[gk] = (groups[gk] || 0) + 1;
          } else {
            let q = o,
              e = null;
            while (q && !e) {
              e = roots.get(q);
              q = q.parent;
            }
            k = e ? 'criaturas' : o.isPoints ? 'partículas' : 'objetos';
          }
          cats[k] = (cats[k] || 0) + 1;
        }
        r.cats = cats;
        r.groups = Object.entries(groups)
          .sort((a, c) => c[1] - a[1])
          .slice(0, 6);
      }
      log = null;
      out.push(r);
    }
    info.autoReset = true;
    return out;
  },
  [SITIOS, !!process.env.DESGLOSE]
);
console.log('sitio'.padEnd(28), 'zona'.padEnd(20), 'llamadas', 'triángulos', 'lejano');
for (const r of res) {
  console.log(r.name.padEnd(28), r.zone.padEnd(20), String(r.calls).padStart(8), String(r.tris).padStart(10), String(r.far).padStart(6), r.sub ? '(con el subsuelo)' : '');
  if (r.cats) console.log('   ', Object.entries(r.cats).map(([k, v]) => `${k} ${v}`).join(' · '), ' | grupos:', r.groups.map(([k, v]) => `${k} ${v}`).join(', '));
}
if (logs.length) console.log(logs.join('\n'));
await b.close();
