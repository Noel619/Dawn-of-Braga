// Busca «z-fighting»: caras de la geometría del nivel que están en el mismo
// plano, miran hacia el mismo lado y se solapan (el suelo que parpadea entre
// dos texturas al mover la cámara). Agrupa los solapes por sitio y plano.
//   node tools/zfight.mjs [x0 z0 x1 z1]      (requiere npx vite --port 5199)
// Con una región, sólo mira lo que cae dentro (en planta).
import { chromium } from 'playwright';
const reg = process.argv.slice(2, 6).map(Number);
const region = reg.length === 4 && reg.every((v) => Number.isFinite(v)) ? reg : null;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 200 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5199/?dev=1');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
const r = await p.evaluate((region) => {
  window.__pause = true;
  const g = __game;
  // triángulos por plano: normal redondeada y distancia al origen en
  // escalones de 4 mm (se miran también los planos vecinos)
  const QD = 250;
  const planes = new Map();
  const tris = [];
  for (const m of g.level.meshes) {
    const pos = m.geometry.attributes.position.array;
    const idx = m.geometry.index ? m.geometry.index.array : null;
    const nt = idx ? idx.length / 3 : pos.length / 9;
    const mat = (m.userData.bucket || '').split('|')[0];
    for (let t = 0; t < nt; t++) {
      const ia = idx ? idx[t * 3] : t * 3,
        ib = idx ? idx[t * 3 + 1] : t * 3 + 1,
        ic = idx ? idx[t * 3 + 2] : t * 3 + 2;
      const ax = pos[ia * 3],
        ay = pos[ia * 3 + 1],
        az = pos[ia * 3 + 2];
      const bx = pos[ib * 3],
        by = pos[ib * 3 + 1],
        bz = pos[ib * 3 + 2];
      const cx = pos[ic * 3],
        cy = pos[ic * 3 + 1],
        cz = pos[ic * 3 + 2];
      if (region) {
        const mx = (ax + bx + cx) / 3,
          mz = (az + bz + cz) / 3;
        if (mx < region[0] || mx > region[2] || mz < region[1] || mz > region[3]) continue;
      }
      const ux = bx - ax,
        uy = by - ay,
        uz = bz - az,
        vx = cx - ax,
        vy = cy - ay,
        vz = cz - az;
      let nx = uy * vz - uz * vy,
        ny = uz * vx - ux * vz,
        nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz);
      if (l < 1e-5) continue;
      nx /= l;
      ny /= l;
      nz /= l;
      const d = nx * ax + ny * ay + nz * az;
      const kn = Math.round(nx * 200) + ',' + Math.round(ny * 200) + ',' + Math.round(nz * 200);
      const kd = Math.round(d * QD);
      const T = { a: [ax, ay, az], b: [bx, by, bz], c: [cx, cy, cz], n: [nx, ny, nz], mat, mesh: m.id, id: tris.length, area: l / 2 };
      tris.push(T);
      const key = kn + '|' + kd;
      let arr = planes.get(key);
      if (!arr) planes.set(key, (arr = []));
      arr.push(T);
    }
  }
  // base del plano para proyectar a 2D
  const basis = (n) => {
    const ax = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    let u = [n[1] * ax[2] - n[2] * ax[1], n[2] * ax[0] - n[0] * ax[2], n[0] * ax[1] - n[1] * ax[0]];
    const lu = Math.hypot(...u);
    u = u.map((v) => v / lu);
    const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
    return [u, v];
  };
  const proj = (P, u, v) => [P[0] * u[0] + P[1] * u[1] + P[2] * u[2], P[0] * v[0] + P[1] * v[1] + P[2] * v[2]];
  // área de la intersección de dos triángulos 2D (recorte de Sutherland-Hodgman)
  const areaOf = (poly) => {
    let s = 0;
    for (let i = 0; i < poly.length; i++) {
      const [x0, y0] = poly[i],
        [x1, y1] = poly[(i + 1) % poly.length];
      s += x0 * y1 - x1 * y0;
    }
    return s / 2;
  };
  const clip = (subj, clipPoly) => {
    let out = subj;
    const ccw = areaOf(clipPoly) > 0;
    for (let i = 0; i < clipPoly.length && out.length; i++) {
      const A = clipPoly[i],
        B = clipPoly[(i + 1) % clipPoly.length];
      const inside = (P) => {
        const c = (B[0] - A[0]) * (P[1] - A[1]) - (B[1] - A[1]) * (P[0] - A[0]);
        return ccw ? c >= -1e-9 : c <= 1e-9;
      };
      const inp = out;
      out = [];
      for (let j = 0; j < inp.length; j++) {
        const P = inp[j],
          Q = inp[(j + 1) % inp.length];
        const pi = inside(P),
          qi = inside(Q);
        if (pi) out.push(P);
        if (pi !== qi) {
          const dx = Q[0] - P[0],
            dy = Q[1] - P[1];
          const ex = B[0] - A[0],
            ey = B[1] - A[1];
          const den = dx * ey - dy * ex;
          if (Math.abs(den) > 1e-12) {
            const t = ((A[0] - P[0]) * ey - (A[1] - P[1]) * ex) / den;
            out.push([P[0] + dx * t, P[1] + dy * t]);
          }
        }
      }
    }
    return out;
  };
  const col = g.world.col;
  const hidden = (x, y, z) =>
    col.query(x - 0.01, z - 0.01, x + 0.01, z + 0.01, []).some((b) => !b.camOnly && b.tag !== 'floor' && y > b.miny + 0.005 && y < b.maxy - 0.005 && col.overlapXZ(b, x, z, -0.005));
  const hits = [];
  const seenPair = new Set();
  const CELL = 1.5;
  for (const [key, arr] of planes) {
    const [kn, kd] = key.split('|');
    // con los del plano vecino (misma normal, 4 mm más allá)
    const near = [...arr, ...(planes.get(kn + '|' + (+kd + 1)) || [])];
    if (near.length < 2) continue;
    const [u, v] = basis(arr[0].n);
    const grid = new Map();
    const P2 = new Map();
    for (const T of near) {
      const q = [proj(T.a, u, v), proj(T.b, u, v), proj(T.c, u, v)];
      P2.set(T.id, q);
      const x0 = Math.floor(Math.min(q[0][0], q[1][0], q[2][0]) / CELL),
        x1 = Math.floor(Math.max(q[0][0], q[1][0], q[2][0]) / CELL);
      const y0 = Math.floor(Math.min(q[0][1], q[1][1], q[2][1]) / CELL),
        y1 = Math.floor(Math.max(q[0][1], q[1][1], q[2][1]) / CELL);
      if ((x1 - x0 + 1) * (y1 - y0 + 1) > 4000) continue;
      for (let i = x0; i <= x1; i++)
        for (let j = y0; j <= y1; j++) {
          const k = i + ',' + j;
          let c = grid.get(k);
          if (!c) grid.set(k, (c = []));
          c.push(T);
        }
    }
    for (const cell of grid.values()) {
      for (let i = 0; i < cell.length; i++)
        for (let j = i + 1; j < cell.length; j++) {
          const A = cell[i],
            B = cell[j];
          // (los del plano vecino sólo cuentan contra los de este)
          const pk = A.id < B.id ? A.id + ':' + B.id : B.id + ':' + A.id;
          if (seenPair.has(pk)) continue;
          seenPair.add(pk);
          const qa = P2.get(A.id),
            qb = P2.get(B.id);
          // descarte rápido por cajas
          const ax0 = Math.min(qa[0][0], qa[1][0], qa[2][0]),
            ax1 = Math.max(qa[0][0], qa[1][0], qa[2][0]),
            ay0 = Math.min(qa[0][1], qa[1][1], qa[2][1]),
            ay1 = Math.max(qa[0][1], qa[1][1], qa[2][1]);
          const bx0 = Math.min(qb[0][0], qb[1][0], qb[2][0]),
            bx1 = Math.max(qb[0][0], qb[1][0], qb[2][0]),
            by0 = Math.min(qb[0][1], qb[1][1], qb[2][1]),
            by1 = Math.max(qb[0][1], qb[1][1], qb[2][1]);
          if (ax1 <= bx0 + 0.01 || bx1 <= ax0 + 0.01 || ay1 <= by0 + 0.01 || by1 <= ay0 + 0.01) continue;
          const inter = clip(qa, qb);
          if (inter.length < 3) continue;
          const ar = Math.abs(areaOf(inter));
          if (ar < 0.004) continue;
          // centro del solape, de vuelta a 3D
          let sx = 0,
            sy = 0;
          for (const P of inter) {
            sx += P[0];
            sy += P[1];
          }
          sx /= inter.length;
          sy /= inter.length;
          const n = A.n;
          const dd = n[0] * A.a[0] + n[1] * A.a[1] + n[2] * A.a[2];
          const c3 = [u[0] * sx + v[0] * sy + n[0] * dd, u[1] * sx + v[1] * sy + n[1] * dd, u[2] * sx + v[2] * sy + n[2] * dd];
          const gap = Math.abs(n[0] * (B.a[0] - A.a[0]) + n[1] * (B.a[1] - A.a[1]) + n[2] * (B.a[2] - A.a[2]));
          // ¿se ve? (delante de la cara, ¿hay algo macizo con colisión?)
          if (hidden(c3[0] + n[0] * 0.04, c3[1] + n[1] * 0.04, c3[2] + n[2] * 0.04)) continue;
          hits.push({ c: c3, n, area: ar, mats: [A.mat, B.mat].sort().join(' / '), gap });
        }
    }
  }
  // agrupar por sitio (2 m), normal y par de materiales
  const groups = [];
  for (const h of hits) {
    const kn = h.n.map((v) => Math.round(v * 10)).join(',');
    let gr = groups.find((q) => q.kn === kn && q.mats === h.mats && Math.hypot(q.c[0] - h.c[0], q.c[1] - h.c[1], q.c[2] - h.c[2]) < 2.5);
    if (!gr) groups.push((gr = { kn, mats: h.mats, c: h.c.slice(), area: 0, n: 0, gap: 0 }));
    gr.area += h.area;
    gr.n++;
    gr.gap = Math.max(gr.gap, h.gap);
  }
  groups.sort((a, b) => b.area - a.area);
  const nn = (kn) => ({ '0,10,0': 'arriba', '0,-10,0': 'abajo', '10,0,0': '+x', '-10,0,0': '-x', '0,0,10': '+z', '0,0,-10': '-z' })[kn] || kn;
  return {
    tris: tris.length,
    hits: hits.length,
    groups: groups
      .slice(0, 80)
      .map(
        (q) =>
          `${q.area.toFixed(2).padStart(7)} m²  ${String(q.n).padStart(4)} solapes  (${q.c.map((v) => v.toFixed(1)).join(', ')})  cara ${nn(q.kn)}  ${q.mats}${q.gap > 0.001 ? `  (a ${(q.gap * 1000).toFixed(1)} mm)` : ''}`
      ),
    nGroups: groups.length,
  };
}, region);
console.log(`triángulos: ${r.tris}  solapes: ${r.hits}  grupos: ${r.nGroups}`);
for (const l of r.groups) console.log('  ' + l);
if (logs.length) console.log(logs.join('\n'));
await b.close();
