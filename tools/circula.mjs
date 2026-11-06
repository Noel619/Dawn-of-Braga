// ¿Se puede andar por cada sala amueblada? (PLAN_FORTALEZA.md, fases 9 y 11)
// Por cada sala (su zona y la altura de su suelo), una rejilla de 10 cm:
// libre si el jugador (radio 0,36, 1,8 de alto, sube 0,52) cabe en ella;
// desde los puntos por donde se entra, se inunda, y se dice qué
// interactuables de la sala (y qué puntos dados: el pie de una escalera, una
// puerta) no se alcanzan. Un mueble mal puesto que tapa una puerta, el pie de
// una escalera o la salida de un caracol sale aquí antes que en el paseo.
// Una imagen por sala en tools/shots/circula_<zona>.png: libre y alcanzado,
// gris claro; libre sin alcanzar, amarillo; ocupado, oscuro; entradas, verde;
// lo que se alcanza, azul; lo que no, rojo.
//   node tools/circula.mjs [zona,...]      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
import fs from 'fs';
const SALAS = [
  { zona: 'tesoro', F: 0, entra: [[-73.2, -92.8], [-64.8, -91.9]], extra: { 'caracol': [-64.8, -91.6], 'puerta': [-73.2, -92.8] } },
  { zona: 'antecamara', F: 0, entra: [[-82.34, -88.59]] },
  { zona: 'coracha_torre', F: 9, entra: [[-66.5, -95.4]], extra: { 'pie escalera adarve': [-73.62, -88.75], 'pie escalera pasadizo': [-66.75, -99.2] } },
  { zona: 'homenaje_guardia', F: 6, entra: [[-98, -89.61]] },
  { zona: 'homenaje_dormitorio', F: 6, entra: [[-104.23, -108.67]] },
  { zona: 'reina_torre', F: 0, entra: [[-128.0, -94.0], [-129.47, -91.82]] },
  { zona: 'tombo_cartas', F: null, entra: null },
  { zona: 'despensa', F: 0, entra: [[-123.6, -44.53]] },
  { zona: 'salon_galeria', F: 5.5, entra: [[-136.8, -86.86]] },
  { zona: 'homenaje_galeria', F: 22.5, entra: [[-86.3, -89.93]] },
  { zona: 'zaguan_fortaleza', F: 0, entra: null },
  { zona: 'homenaje_granero', F: 0, entra: null },
  { zona: 'oratorio_rey', F: 4.5, entra: [[-73.7, -95.6]], extra: { 'puerta de la tribuna': [-73.3, -88.4] } },
  // (la segunda pasada de la fase 9: lo de cada día, world/amueblado.js)
  { zona: 'estrado_damas', F: 0, entra: [[-125.6, -94.0]], extra: { 'puerta del patio': [-113.4, -87.6] } },
  { zona: 'reina_oratorio', F: 5.5, entra: [[-128.4, -94.0]], extra: { 'puerta de la galería': [-136.8, -89.6] } },
  { zona: 'reina_camara', F: 11, entra: null },
  { zona: 'camara_rey', F: 4.5, entra: null, extra: { 'puerta de la torre': [-76.4, -95.6] } },
  { zona: 'homenaje_consejo', F: 12, entra: [[-95, -100.2]], extra: { 'puerta del pasadizo': [-88.2, -98.79] } },
  { zona: 'homenaje_camara', F: 12, entra: [[-95, -101.8]] },
  { zona: 'sotano_aleman', F: -3.9, entra: [[53.0, -102.0]], extra: { 'agujero de Leonor': [47.5, -109.3] } },
  { zona: 'chapel', F: 0, entra: [[49, 12.9]], extra: { 'ante el altar': [49, 18.8] } },
];
const solo = process.argv[2] ? process.argv[2].split(',') : null;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 200 } });
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:' + (process.env.PORT || 5199) + '/?dev=1');
await p.waitForFunction(() => window.__ready, null, { timeout: 180000 });
fs.mkdirSync('tools/shots', { recursive: true });
for (const S of SALAS) {
  if (solo && !solo.includes(S.zona)) continue;
  const r = await p.evaluate((S) => {
    const g = __game;
    const col = g.world.col;
    const Z = g.level.L.zones.find((z) => z.id === S.zona);
    if (!Z) return { err: 'no hay zona ' + S.zona };
    const rects = Z.rects;
    const F = S.F ?? rects[0][4] + 0.3;
    let X0 = Infinity, Z0 = Infinity, X1 = -Infinity, Z1 = -Infinity;
    for (const q of rects) { X0 = Math.min(X0, q[0]); Z0 = Math.min(Z0, q[1]); X1 = Math.max(X1, q[2]); Z1 = Math.max(Z1, q[3]); }
    const h = 0.1, R = 0.36;
    const nx = Math.ceil((X1 - X0) / h), nz = Math.ceil((Z1 - Z0) / h);
    const inZone = (x, z) => rects.some((q) => x >= q[0] && x <= q[2] && z >= q[1] && z <= q[3]);
    const cand = col.boxes.filter((bx) => bx.enabled && !bx.camOnly && bx.tag !== 'cam' && bx.maxy > F + 0.52 && bx.miny < F + 1.75 && bx.maxx > X0 - 1 && bx.minx < X1 + 1 && bx.maxz > Z0 - 1 && bx.minz < Z1 + 1);
    const free = new Uint8Array(nx * nz);
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x = X0 + (i + 0.5) * h, z = Z0 + (j + 0.5) * h;
        if (!inZone(x, z)) continue;
        let ok = true;
        for (const bx of cand) if (col.overlapXZ(bx, x, z, R)) { ok = false; break; }
        free[i + j * nx] = ok ? 1 : 0;
      }
    // las entradas: las dadas o, si no, las puertas de la sala y el punto libre más cercano a su centro
    const its = g.interact.list.filter((it) => { const x = it.ix ?? it.x, z = it.iz ?? it.z; return inZone(x, z) && Math.abs((it.y ?? F) - F) < 1.6; });
    let entra = S.entra;
    if (!entra) {
      let best = null, bd = 1e9;
      const cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if (free[i + j * nx]) { const x = X0 + (i + 0.5) * h, z = Z0 + (j + 0.5) * h, d = Math.hypot(x - cx, z - cz); if (d < bd) { bd = d; best = [x, z]; } }
      entra = best ? [best] : [];
    }
    const reach = new Uint8Array(nx * nz);
    const q = [];
    const seedAt = ([x, z]) => {
      // (la celda libre más cercana a la entrada, a menos de 0,5 m)
      let bi = -1, bd = 0.5;
      for (let i = Math.max(0, Math.floor((x - X0) / h) - 6); i <= Math.min(nx - 1, Math.floor((x - X0) / h) + 6); i++)
        for (let j = Math.max(0, Math.floor((z - Z0) / h) - 6); j <= Math.min(nz - 1, Math.floor((z - Z0) / h) + 6); j++)
          if (free[i + j * nx]) { const d = Math.hypot(X0 + (i + 0.5) * h - x, Z0 + (j + 0.5) * h - z); if (d < bd) { bd = d; bi = i + j * nx; } }
      if (bi >= 0 && !reach[bi]) { reach[bi] = 1; q.push(bi); }
      return bi >= 0;
    };
    const seeds = entra.map((e) => seedAt(e));
    while (q.length) {
      const c = q.pop();
      const i = c % nx, j = (c - i) / nx;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, bb = j + dj;
        if (a < 0 || bb < 0 || a >= nx || bb >= nz) continue;
        const k = a + bb * nx;
        if (free[k] && !reach[k]) { reach[k] = 1; q.push(k); }
      }
    }
    const near = (x, z, d) => {
      for (let i = Math.max(0, Math.floor((x - d - X0) / h)); i <= Math.min(nx - 1, Math.floor((x + d - X0) / h)); i++)
        for (let j = Math.max(0, Math.floor((z - d - Z0) / h)); j <= Math.min(nz - 1, Math.floor((z + d - Z0) / h)); j++)
          if (reach[i + j * nx] && Math.hypot(X0 + (i + 0.5) * h - x, Z0 + (j + 0.5) * h - z) <= d) return true;
      return false;
    };
    const res = [];
    for (const it of its) {
      const x = it.ix ?? it.x, z = it.iz ?? it.z;
      // (se usa desde algo más lejos que su radio de aviso, ~1,5 m; los de examinar, su r)
      const d = it.kind === 'examine' ? Math.max(0.9, (it.r ?? 1.2)) : it.kind === 'door' ? 1.4 : 1.3;
      res.push({ id: it.id, kind: it.kind, x: +x.toFixed(2), z: +z.toFixed(2), ok: near(x, z, d) });
    }
    for (const [k, [x, z]] of Object.entries(S.extra || {})) res.push({ id: k, kind: 'punto', x, z, ok: near(x, z, 0.25) });
    let nFree = 0, nReach = 0;
    for (let k = 0; k < nx * nz; k++) { nFree += free[k]; nReach += reach[k]; }
    // la imagen
    const px = 20;
    const cv = document.createElement('canvas');
    cv.width = nx * (px / 10) * 1; cv.height = nz * (px / 10);
    const c2 = cv.getContext('2d');
    c2.fillStyle = '#000'; c2.fillRect(0, 0, cv.width, cv.height);
    const s = px / 10;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const k = i + j * nx;
      const x = X0 + (i + 0.5) * h, z = Z0 + (j + 0.5) * h;
      c2.fillStyle = !inZone(x, z) ? '#000' : reach[k] ? '#bbb' : free[k] ? '#dc3' : '#334';
      c2.fillRect(i * s, j * s, s, s);
    }
    const dot = (x, z, col, r = 4) => { c2.fillStyle = col; c2.beginPath(); c2.arc(((x - X0) / h) * s, ((z - Z0) / h) * s, r, 0, 7); c2.fill(); };
    for (const e of entra) dot(e[0], e[1], '#0c0', 5);
    for (const t of res) dot(t.x, t.z, t.ok ? '#24f' : '#f22', 4);
    return { zona: S.zona, F, rect: [X0, Z0, X1, Z1].map((v) => +v.toFixed(2)), libre: +(nFree / 100).toFixed(1), alcanzado: +(nReach / 100).toFixed(1), seeds, res, png: cv.toDataURL('image/png') };
  }, S);
  if (r.err) { console.log(r.err); continue; }
  fs.writeFileSync('tools/shots/circula_' + r.zona + '.png', Buffer.from(r.png.split(',')[1], 'base64'));
  const malos = r.res.filter((t) => !t.ok);
  console.log(`${r.zona.padEnd(22)} suelo ${r.F}  libre ${r.libre} m²  alcanzado ${r.alcanzado} m²  entradas ${JSON.stringify(r.seeds)}  ${r.res.length - malos.length}/${r.res.length} alcanzables` + (malos.length ? '\n    NO: ' + malos.map((t) => `${t.id} (${t.kind}) en ${t.x},${t.z}`).join('; ') : ''));
}
console.log(errs.join('\n'));
await b.close();
