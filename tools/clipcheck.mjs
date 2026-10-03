// Interpenetraciones en las animaciones de una criatura: recorre la marcha,
// la espera y cada clip (cada 1/30 s) y mide cuánto se meten unas piezas en
// otras (el arma en la cabeza o en las piernas, un brazo en la campana...)
// y en el suelo, con volúmenes simplificados (esferas, cápsulas, cajas y,
// para la campana, el sólido de revolución de su perfil).
//   node tools/clipcheck.mjs <tipo> [clip,clip...]     (requiere npx vite --port 5199)
// Sale con código 1 si algo se mete más de MAX metros.
import { chromium } from 'playwright';
const type = process.argv[2] || 'bell';
const only = process.argv[3] ? process.argv[3].split(',') : null;
const MAX = +(process.env.MAX || 0.03);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 180 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
await p.goto('http://localhost:5199/?dev=1&at=0,0,-44&yaw=0');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
const r = await p.evaluate(
  async ([type, only]) => {
    window.__pause = true;
    const g = __game;
    const T3 = g.THREE;
    const M = await import('/src/entities/enemy_models.js');
    // volúmenes por criatura: [nombre, articulación, tipo, datos]
    //   s: esfera [c, r]   c: cápsula [a, b, r]   o: caja [centro, semiejes]
    //   bell: campana (perfil exterior de M.bellRadius) en su articulación
    const VOL = {
      bell: {
        parts: [
          ['bell', 'bellJ', 'bell', []],
          ['yugo', 'bellJ', 'o', [[0.05, 0.99, 0], [0.33, 0.065, 0.09]]],
          ['torso', 'chest', 'o', [[0, 0.36, 0], [0.37, 0.3, 0.24]]],
          ['tripa', 'chest', 's', [[0, 0.24, 0.17], 0.16]],
          ['joroba', 'chest', 's', [[0, 0.5, -0.2], 0.22]],
          ['cadera', 'hips', 'o', [[0, -0.08, 0], [0.3, 0.17, 0.21]]],
          ['musloL', 'legL', 'c', [[0, -0.04, 0], [0, -0.6, 0], 0.13]],
          ['musloR', 'legR', 'c', [[0, -0.04, 0], [0, -0.6, 0], 0.13]],
          ['tibiaL', 'shinL', 'c', [[0, -0.04, 0], [0, -0.5, 0], 0.1]],
          ['tibiaR', 'shinR', 'c', [[0, -0.04, 0], [0, -0.5, 0], 0.1]],
          ['brazoL', 'armL', 'c', [[0, -0.12, 0], [0, -0.42, 0], 0.12]],
          ['brazoR', 'armR', 'c', [[0, -0.12, 0], [0, -0.42, 0], 0.12]],
          ['antebrazoL', 'foreL', 'c', [[0, -0.02, 0], [0, -0.38, 0], 0.11]],
          ['antebrazoR', 'foreR', 'c', [[0, -0.02, 0], [0, -0.38, 0], 0.11]],
          ['manoL', 'handL', 's', [[0, -0.12, 0.02], 0.11]],
          ['manoR', 'handR', 's', [[0, -0.08, 0], 0.11]],
          ['astil', 'handR', 'c', [[0, -0.08, 0.13], [0, -0.08, 1.0], 0.048]],
          ['bola', 'handR', 's', [[0, -0.08, 1.16], 0.2]],
          ['cola', 'handR', 'c', [[0, -0.08, 1.37], [0, -0.08, 1.5], 0.05]],
          ['delantal', 'apron', 'o', [[0, -0.255, 0], [0.26, 0.265, 0.018]]],
          ['delantal2', 'apron2', 'o', [[0, -0.25, 0], [0.29, 0.26, 0.018]]],
        ],
        pairs: [
          [['astil', 'bola', 'cola'], ['bell', 'yugo', 'torso', 'tripa', 'joroba', 'cadera', 'musloL', 'musloR', 'tibiaL', 'tibiaR', 'brazoL', 'antebrazoL', 'manoL', 'delantal', 'delantal2']],
          [['brazoL', 'brazoR', 'antebrazoL', 'antebrazoR', 'manoL', 'manoR'], ['bell', 'yugo']],
          [['antebrazoL', 'manoL'], ['torso', 'tripa', 'musloL', 'musloR', 'antebrazoR', 'manoR', 'brazoR']],
          [['antebrazoR', 'manoR'], ['torso', 'tripa', 'musloL', 'musloR', 'brazoL']],
          [['musloL', 'musloR', 'tibiaL', 'tibiaR', 'tripa'], ['delantal', 'delantal2']],
        ],
        ground: ['bell', 'yugo', 'bola', 'cola', 'astil', 'manoL', 'manoR', 'torso', 'cadera', 'joroba', 'tibiaL', 'tibiaR', 'musloL', 'musloR'],
      },
      mourner: {
        parts: [
          ['cabeza', 'head', 's', [[0, 0.15, 0.02], 0.11]],
          ['torso', 'chest', 'o', [[0, 0.32, 0], [0.13, 0.3, 0.085]]],
          // la falda en reposo: un cono desde la cintura (ondea y se abre)
          ['falda', 'hips', 'cone', [-0.08, 0.17, -1.36, 0.45]],
          ['brazoL', 'armL', 'c', [[0, -0.06, 0], [0, -0.6, 0], 0.055]],
          ['brazoR', 'armR', 'c', [[0, -0.06, 0], [0, -0.6, 0], 0.055]],
          ['antebrazoL', 'foreL', 'c', [[0, -0.03, 0], [0, -0.58, 0], 0.028]],
          ['antebrazoR', 'foreR', 'c', [[0, -0.03, 0], [0, -0.58, 0], 0.028]],
          ['manoL', 'handL', 'c', [[0, -0.03, 0], [0, -0.3, 0.04], 0.028]],
          ['manoR', 'handR', 'c', [[0, -0.03, 0], [0, -0.3, 0.04], 0.028]],
          ['mangaL', 'sleeveL', 'c', [[0, -0.1, 0], [0, -0.46, 0], 0.11]],
          ['mangaR', 'sleeveR', 'c', [[0, -0.1, 0], [0, -0.46, 0], 0.11]],
          ['peloL', 'hairL', 'c', [[0, -0.05, 0], [0, -0.32, 0], 0.012]],
          ['peloR', 'hairR', 'c', [[0, -0.05, 0], [0, -0.32, 0], 0.012]],
          ['velo', 'veil', 'o', [[0, -0.58, 0], [0.19, 0.6, 0.012]]],
        ],
        pairs: [
          [['manoL', 'manoR', 'antebrazoL', 'antebrazoR', 'mangaL', 'mangaR'], ['falda', 'torso', 'cabeza']],
          [['velo'], ['torso', 'falda', 'brazoL', 'brazoR']],
          [['peloL', 'peloR'], ['torso']],
        ],
        ground: ['manoL', 'manoR', 'cabeza', 'torso', 'mangaL', 'mangaR', 'velo'],
        skipDeath: ['falda'],
      },
    };
    const V = VOL[type];
    if (!V) return { err: 'sin volúmenes para ' + type };
    const E = g.enemies.find((e) => e.type === type);
    E.spec = { ...E.spec, x: 0, y: 0, z: -44, yaw: 0, idle: 'stand' };
    E.home = { x: 0, y: 0, z: -44, yaw: 0 };
    const P = g.player;
    P.body.pos.set(0, 0, -20);
    const byName = Object.fromEntries(V.parts.map((q) => [q[0], q]));
    const _a = new T3.Vector3(),
      _b = new T3.Vector3(),
      _c = new T3.Vector3(),
      _inv = new T3.Matrix4();
    const mw = (j) => E.rig.joints[j].matrixWorld;
    const W = (j, v, out) => out.set(v[0], v[1], v[2]).applyMatrix4(mw(j));
    // muestras de un volumen como esferas en el mundo [x, y, z, r]
    function spheres(q) {
      const [, j, kind, d] = q;
      if (kind === 's') {
        W(j, d[0], _a);
        return [[_a.x, _a.y, _a.z, d[1]]];
      }
      if (kind === 'c') {
        const out = [];
        W(j, d[0], _a);
        W(j, d[1], _b);
        const n = Math.max(2, Math.ceil(_a.distanceTo(_b) / (d[2] * 0.6)));
        for (let i = 0; i <= n; i++) {
          _c.lerpVectors(_a, _b, i / n);
          out.push([_c.x, _c.y, _c.z, d[2]]);
        }
        return out;
      }
      return null;
    }
    // penetración de una esfera del mundo en un volumen (caja o campana)
    function penInto(sp, q) {
      const [, j, kind, d] = q;
      _inv.copy(mw(j)).invert();
      _a.set(sp[0], sp[1], sp[2]).applyMatrix4(_inv);
      const r = sp[3];
      if (kind === 'o') {
        const [c, h] = d;
        const lx = _a.x - c[0],
          ly = _a.y - c[1],
          lz = _a.z - c[2];
        const qx = Math.max(-h[0], Math.min(h[0], lx)),
          qy = Math.max(-h[1], Math.min(h[1], ly)),
          qz = Math.max(-h[2], Math.min(h[2], lz));
        const dd = Math.hypot(lx - qx, ly - qy, lz - qz);
        if (dd > 0) return r - dd;
        return r + Math.min(h[0] - Math.abs(lx), h[1] - Math.abs(ly), h[2] - Math.abs(lz));
      }
      if (kind === 'bell') {
        const rr = Math.hypot(_a.x, _a.z);
        let pen = -9;
        for (let i = -4; i <= 4; i++) {
          const y = _a.y + (r * i) / 4.5;
          const R = M.bellRadius(y);
          if (!R) continue;
          const w = Math.sqrt(Math.max(0, r * r - (y - _a.y) ** 2));
          pen = Math.max(pen, R + w - rr);
        }
        return pen;
      }
      if (kind === 'cone') {
        // [y0, r0, y1, r1]: cono sólido a lo largo de y (y0 > y1)
        const [y0, r0, y1, r1] = d;
        const rr = Math.hypot(_a.x, _a.z);
        let pen = -9;
        for (let i = -4; i <= 4; i++) {
          const y = _a.y + (r * i) / 4.5;
          if (y > y0 || y < y1) continue;
          const R = r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
          const w = Math.sqrt(Math.max(0, r * r - (y - _a.y) ** 2));
          pen = Math.max(pen, R + w - rr);
        }
        return pen;
      }
      // esfera/cápsula contra esfera/cápsula
      const S = spheres(q);
      let pen = -9;
      for (const s2 of S) pen = Math.max(pen, r + s2[3] - Math.hypot(sp[0] - s2[0], sp[1] - s2[1], sp[2] - s2[2]));
      return pen;
    }
    function penPair(qa, qb) {
      let sa = spheres(qa),
        target = qb;
      if (!sa) {
        sa = spheres(qb);
        target = qa;
      }
      if (!sa) return -9;
      let pen = -9;
      for (const sp of sa) pen = Math.max(pen, penInto(sp, target));
      return pen;
    }
    // puntos para el suelo
    function lowest(q) {
      const S = spheres(q);
      if (S) return Math.min(...S.map((s) => s[1] - s[3]));
      const [, j, kind, d] = q;
      let lo = 9;
      if (kind === 'o') {
        const [c, h] = d;
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) lo = Math.min(lo, W(j, [c[0] + sx * h[0], c[1] + sy * h[1], c[2] + sz * h[2]], _a).y);
      } else if (kind === 'bell') {
        for (const y of [0.1, 0.2, 0.42, 0.56, 0.76, 0.855])
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2,
              R = M.bellRadius(Math.min(0.85, Math.max(0.1, y)));
            lo = Math.min(lo, W(j, [Math.sin(a) * R, y, Math.cos(a) * R], _a).y);
          }
      }
      return lo;
    }
    const res = {};
    const A = E.anim;
    function check(label, t) {
      E.obj.updateMatrixWorld(true);
      const rec = res[label] || (res[label] = { pairs: {}, ground: {} });
      for (const [as, bs] of V.pairs)
        for (const an of as)
          for (const bn of bs) {
            if (an === bn) continue;
            if (label === 'death' && V.skipDeath && (V.skipDeath.includes(an) || V.skipDeath.includes(bn))) continue;
            const pen = penPair(byName[an], byName[bn]);
            const k = an + '↔' + bn;
            if (!rec.pairs[k] || pen > rec.pairs[k][0]) rec.pairs[k] = [+pen.toFixed(3), +t.toFixed(2)];
          }
      const gy = E.pos.y - E.sink;
      for (const n of V.ground) {
        const pen = gy - lowest(byName[n]);
        if (!rec.ground[n] || pen > rec.ground[n][0]) rec.ground[n] = [+pen.toFixed(3), +t.toFixed(2)];
      }
    }
    // marcha (quieto, andando) y clips
    for (const sp of [0, E.T.walk]) {
      if (only && !only.includes('loco')) break;
      E.reset();
      E.state = 'chase';
      E.vx = 0;
      E.vz = sp;
      for (let k = 0; k < 90; k++) E.animate(1 / 60);
      for (let i = 0; i < 40; i++) {
        if (E.gait) E.gait.phase = i / 40;
        E.animate(1 / 600);
        E.obj.updateMatrixWorld(true);
        if (E.gait) E.gait.phase = i / 40;
        E.animate(1 / 600);
        check('loco@' + sp, i / 40);
      }
    }
    for (const name in E.T.clips) {
      if (only && !only.includes(name)) continue;
      const c = E.T.clips[name];
      E.reset();
      E.state = name === 'death' ? 'dead' : 'attack';
      E.vx = E.vz = 0;
      for (let t = 0; t <= c.dur + 1e-6; t += 1 / 30) {
        A.play(c, { blend: 0 });
        A.from = null;
        A.xf = 1;
        A.w = 1;
        A.t = t;
        // (dos veces: lo que cuelga se orienta con las matrices de la anterior)
        E.animate(1 / 600);
        E.obj.updateMatrixWorld(true);
        A.t = t;
        E.animate(1 / 600);
        check(name, t);
      }
    }
    // resumen: lo que se mete
    const out = {};
    for (const [label, rec] of Object.entries(res)) {
      const bad = [];
      for (const [k, [pen, t]] of Object.entries(rec.pairs)) if (pen > 0) bad.push([k, pen, t]);
      for (const [k, [pen, t]] of Object.entries(rec.ground)) if (pen > 0) bad.push(['suelo↔' + k, pen, t]);
      bad.sort((x, y) => y[1] - x[1]);
      out[label] = bad;
    }
    return out;
  },
  [type, only]
);
let worst = 0;
if (r.err) console.log(r.err);
else
  for (const [label, bad] of Object.entries(r)) {
    const shown = bad.filter((x) => x[1] > 0.005);
    const w = shown.length ? shown[0][1] : 0;
    worst = Math.max(worst, w);
    console.log(`${label.padEnd(12)} ${shown.length ? shown.slice(0, 6).map(([k, pen, t]) => `${k} ${(pen * 100).toFixed(1)}cm@${t}`).join('  ') : 'limpio'}`);
  }
if (errs.length) console.log(errs.join('\n'));
console.log('peor: ' + (worst * 100).toFixed(1) + ' cm');
await b.close();
process.exit(worst > MAX || errs.length ? 1 : 0);
