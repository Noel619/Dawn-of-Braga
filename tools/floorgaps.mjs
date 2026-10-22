// Rendijas sin suelo en la cripta honda: cada 5 cm, en una franja de 0,6 m
// alrededor de cada sala de la planta (LAYOUT de level_crypt2.js; las salas
// pequeñas, enteras), donde la colisión sostiene al jugador a la altura del
// suelo de la sala y hay sitio para el cuerpo, ¿hay un triángulo de suelo
// dibujado? Encuentra las tiras de un palmo que quedan cuando el canto de una
// sala no cae en la rejilla de medio metro con la que se levantan los muros
// (y que cryptwalk.mjs, que pisa cada 25 cm, no ve).
//   node tools/floorgaps.mjs      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 200 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5199/?dev=1');
await p.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const r = await p.evaluate(async () => {
  window.__pause = true;
  const g = __game;
  const { LAYOUT } = await import('/src/world/level_crypt2.js');
  // (con las puertas abiertas: también se pisan sus umbrales)
  for (const it of g.interact.list) if ((it.kind === 'door' || it.kind === 'fog') && it.box) it.box.enabled = false;
  const col = g.world.col;
  // los triángulos de suelo (normal hacia arriba) bajo la cripta, en una
  // rejilla de medio metro
  const CS = 0.5,
    X0 = -110,
    Z0 = -210;
  const grid = new Map();
  const T = g.THREE;
  const a = new T.Vector3(),
    bb = new T.Vector3(),
    c = new T.Vector3(),
    n = new T.Vector3(),
    e1 = new T.Vector3(),
    e2 = new T.Vector3();
  for (const m of g.level.meshes) {
    if (/water|glass|black|ember/.test(m.material.userData?.def?.tex || '')) continue;
    m.updateMatrixWorld();
    const pos = m.geometry.attributes.position;
    const idx = m.geometry.index;
    const nt = idx ? idx.count / 3 : pos.count / 3;
    for (let t = 0; t < nt; t++) {
      a.fromBufferAttribute(pos, idx ? idx.getX(t * 3) : t * 3).applyMatrix4(m.matrixWorld);
      bb.fromBufferAttribute(pos, idx ? idx.getX(t * 3 + 1) : t * 3 + 1).applyMatrix4(m.matrixWorld);
      c.fromBufferAttribute(pos, idx ? idx.getX(t * 3 + 2) : t * 3 + 2).applyMatrix4(m.matrixWorld);
      if (a.y > -4 && bb.y > -4 && c.y > -4) continue;
      e1.subVectors(bb, a);
      e2.subVectors(c, a);
      n.crossVectors(e1, e2);
      const L = n.length();
      if (L < 1e-9 || n.y / L < 0.6) continue;
      const tri = [a.x, a.y, a.z, bb.x, bb.y, bb.z, c.x, c.y, c.z];
      const i0 = Math.floor((Math.min(a.x, bb.x, c.x) - X0) / CS),
        i1 = Math.floor((Math.max(a.x, bb.x, c.x) - X0) / CS);
      const j0 = Math.floor((Math.min(a.z, bb.z, c.z) - Z0) / CS),
        j1 = Math.floor((Math.max(a.z, bb.z, c.z) - Z0) / CS);
      for (let i = i0; i <= i1; i++)
        for (let j = j0; j <= j1; j++) {
          const k = i * 4096 + j;
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push(tri);
        }
    }
  }
  const floorAt = (x, z, gy) => {
    for (const t of grid.get(Math.floor((x - X0) / CS) * 4096 + Math.floor((z - Z0) / CS)) || []) {
      const [ax, ay, az, bx, by, bz, cx, cy, cz] = t;
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(d) < 1e-12) continue;
      const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d,
        l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d,
        l3 = 1 - l1 - l2;
      if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
      if (Math.abs(l1 * ay + l2 * by + l3 * cy - gy) < 0.12) return true;
    }
    return false;
  };
  const free = (x, z, gy) => !col.query(x - 0.05, z - 0.05, x + 0.05, z + 0.05, []).some((q) => q.enabled !== false && !q.camOnly && q.miny < gy + 1.6 && q.maxy > gy + 0.3 && col.overlapXZ(q, x, z, 0.05));
  const out = [];
  const S = 0.05;
  for (const R of LAYOUT) {
    if (R.stair) continue;
    const [x0, z0, x1, z1] = R.r;
    const small = (x1 - x0) * (z1 - z0) < 40;
    const top = R.top ?? R.y + 3;
    const bad = [];
    for (let x = x0 - 0.6 + S / 2; x < x1 + 0.6; x += S)
      for (let z = z0 - 0.6 + S / 2; z < z1 + 0.6; z += S) {
        if (!small && x > x0 + 0.6 && x < x1 - 0.6 && z > z0 + 0.6 && z < z1 - 0.6) continue;
        // (la colisión justo en el punto: con un radio, el borde de un peldaño
        // daba por suelo lo que es su tabica)
        const gy = col.groundHeight(x, z, 0.005, top - 0.2);
        if (gy === null || Math.abs(gy - R.y) > 0.06) continue;
        if (!free(x, z, gy)) continue;
        if (!floorAt(x, z, gy)) bad.push([x, z]);
      }
    if (bad.length) {
      const xs = bad.map((q) => q[0]),
        zs = bad.map((q) => q[1]);
      out.push(`${R.id.padEnd(20)} ${String(bad.length).padStart(5)} puntos  x ${Math.min(...xs).toFixed(2)}..${Math.max(...xs).toFixed(2)}  z ${Math.min(...zs).toFixed(2)}..${Math.max(...zs).toFixed(2)}  y ${R.y}`);
    }
  }
  return out;
});
console.log(r.length ? r.join('\n') : 'sin rendijas');
if (logs.length) console.log(logs.join('\n'));
await b.close();
