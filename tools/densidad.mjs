// La densidad de detalle de cada sala: los triángulos del mundo (la geometría
// fija, horneada) cuyo centro cae dentro de cada zona (en planta y entre su
// suelo y su techo), por metro cuadrado de planta. Sólo las zonas de
// interior (o las que se pidan). De la más pobre a la más rica.
//   node tools/densidad.mjs                  (todas las de interior)
//   node tools/densidad.mjs salon,cocina     (sólo ésas)
//   ATMO=interior,chapel,prison node tools/densidad.mjs
//   (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const only = process.argv[2] ? process.argv[2].split(',') : null;
const atmos = (process.env.ATMO || 'interior,chapel,prison,sala,cellar,crypt,lair,tunnel').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 180 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5199/?dev=1');
await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
const rows = await p.evaluate(
  ([only, atmos]) => {
    const g = __game;
    const zones = g.level.L.zones.filter((z) => (only ? only.includes(z.id) : atmos.includes(z.atmo)));
    // (una zona por id: se suman sus rectángulos)
    const by = new Map();
    for (const z of zones) {
      if (!by.has(z.id)) by.set(z.id, { id: z.id, atmo: z.atmo, rects: [] });
      by.get(z.id).rects.push(...z.rects);
    }
    const Z = [...by.values()].map((z) => ({ ...z, area: z.rects.reduce((a, r) => a + (r[2] - r[0]) * (r[3] - r[1]), 0), tris: 0 }));
    const meshes = g.level.meshes || [];
    for (const m of meshes) {
      const geo = m.geometry;
      const P = geo.attributes.position.array;
      const I = geo.index ? geo.index.array : null;
      const n = I ? I.length : P.length / 3;
      for (let i = 0; i < n; i += 3) {
        const a = I ? I[i] : i,
          b2 = I ? I[i + 1] : i + 1,
          c = I ? I[i + 2] : i + 2;
        const x = (P[a * 3] + P[b2 * 3] + P[c * 3]) / 3,
          y = (P[a * 3 + 1] + P[b2 * 3 + 1] + P[c * 3 + 1]) / 3,
          zz = (P[a * 3 + 2] + P[b2 * 3 + 2] + P[c * 3 + 2]) / 3;
        for (const z of Z)
          for (const r of z.rects)
            if (x > r[0] && x < r[2] && zz > r[1] && zz < r[3] && y > r[4] && y < r[5]) {
              z.tris++;
              break;
            }
      }
    }
    return Z.map((z) => ({ id: z.id, atmo: z.atmo, area: Math.round(z.area), tris: z.tris, d: z.area > 0 ? z.tris / z.area : 0 })).sort((a, b) => a.d - b.d);
  },
  [only, atmos]
);
console.log('zona'.padEnd(26), 'atmo'.padEnd(10), 'm²'.padStart(6), 'triáng.'.padStart(9), 'tri/m²'.padStart(8));
for (const r of rows) console.log(r.id.padEnd(26), r.atmo.padEnd(10), String(r.area).padStart(6), String(r.tris).padStart(9), r.d.toFixed(1).padStart(8));
if (logs.length) console.log(logs.join('\n'));
await b.close();
