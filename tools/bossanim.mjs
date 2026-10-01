// Hojas de animación del Descoyuntado: dispara cada movimiento en el Lagar
// con el jugador delante y compone una fila de fotogramas por movimiento.
//   node tools/bossanim.mjs [nombre] [movimientos separados por comas]
//   movimientos: claw, claw2, sweep, slam, lunge, pounce, charge, spin, grab,
//   rip, crack, throw, riposte, flip, leap, side, guard, beat, laugh,
//   headspin, down, rage, dead, walk, gallop, creep, ceil, idle
// (requiere npx vite --port 5199). Salida: tools/shots/anim_<nombre>.png
import { chromium } from 'playwright';
const name = process.argv[2] || 'hoja';
const moves = (process.argv[3] || 'claw,sweep,slam,lunge,flip,guard').split(',');
const COLS = +(process.env.COLS || 5);
const TW = +(process.env.TW || 384); // ancho de cada fotograma
const CAM = +(process.env.CAM || 1); // distancia de la cámara (1 = 5 m)
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 5).join(' | ')));
await p.goto('http://localhost:5199/?dev=1&at=32,-6.6,-43&yaw=180&items=espada,escudo');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
const info = await p.evaluate(
  ([moves, COLS, TW, CAM]) => {
    window.__pause = true;
    const g = __game;
    g.ui.closeAll();
    g.ui.showHud(false);
    g.input.enabledPointerLock = false;
    const W = TW,
      H = Math.round((TW * 9) / 16);
    // (más luz y menos niebla, sólo para ver bien el cuerpo)
    g.atmo.override = { exposure: 2.4, density: 0.02, hemi: 2.2, sky: 0x8a8480, ground: 0x3a3430 };
    const sheet = document.createElement('canvas');
    sheet.width = W * COLS;
    sheet.height = H * moves.length;
    sheet.id = 'sheet';
    sheet.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;';
    const cx = sheet.getContext('2d');
    cx.fillStyle = '#000';
    cx.fillRect(0, 0, sheet.width, sheet.height);
    cx.font = '14px monospace';
    const e = g.bosses.descoyuntado;
    const D = e.D;
    const P = g.player;
    const out = [];
    const DUR = { smash: 2.6, smashcask: 2.4, claw: 1.2, claw2: 1.9, sweep: 1.35, slam: 1.75, lunge: 0.95, pounce: 1.85, charge: 2.6, spin: 1.95, grab: 2.8, rip: 2.4, crack: 1.9, throw: 1.2, riposte: 0.85, flip: 0.8, leap: 0.6, side: 0.55, guard: 1.2, beat: 2.2, laugh: 1.4, headspin: 1.3, down: 2.1, rage: 3.4, dead: 9.5, walk: 1.6, gallop: 1.2, creep: 2.4, ceil: 1.6, idle: 2 };
    moves.forEach((mv, row) => {
      // todo en su sitio: él en el centro del Lagar, tú delante, a 4 m
      e.reset();
      e.dead = false;
      e.hp = e.maxHp;
      e.state = 'hunt';
      g.activeBoss = e;
      g.hunt.active = true;
      D.eatT = D.eat = 0;
      D.stage = mv === 'rage' ? 'stalk' : 'rage';
      D.rageK = mv === 'rage' ? 0 : 1;
      e.pos.set(32, -6.6, -48.5);
      e.yaw = 0;
      D.plantAll();
      P.spawn(32, -6.6, mv === 'grab' || mv === 'claw' || mv === 'riposte' || mv === 'sweep' ? -46.4 : -44.5, Math.PI);
      P.hp = P.maxHp = 9999;
      for (let i = 0; i < 20; i++) {
        D.setMode('fight');
        D.cool = 9;
        g.update(1 / 30);
      }
      D.cool = 9;
      const t0 = g.time;
      // el movimiento
      if (['claw', 'claw2', 'sweep', 'slam', 'lunge', 'pounce', 'charge', 'spin', 'grab', 'crack', 'throw', 'riposte'].includes(mv)) D.startAttack(mv);
      else if (mv === 'rip') {
        const pil = g.breakables.list.find((q) => q.id === 'pilar5');
        e.pos.set(32, -6.6, -38.5);
        P.spawn(32, -6.6, -43.2, Math.PI);
        D.plantAll();
        D.ripTarget = pil;
        D.startAttack('rip');
      } else if (mv === 'smash' || mv === 'smashcask') {
        // escondido tras un sepulcro de la cripta (o tras un tonel del Lagar)
        const tomb = mv === 'smash';
        const it = g.breakables.list.find((q) => q.id === (tomb ? 'sepulcro0' : 'tonel4'));
        if (tomb) {
          e.pos.set(47.5, -6.6, -77.2);
          P.spawn(41.3, -6.6, -77.2, Math.PI / 2);
        } else {
          e.pos.set(33.4, -6.6, -49.2);
          P.spawn(37.6, -6.6, -47.6, -Math.PI / 2);
        }
        e.yaw = Math.atan2(it.x - e.pos.x, it.z - e.pos.z);
        D.plantAll();
        D.smashTarget = it;
        D.startAttack('smash');
      } else if (mv === 'flip' || mv === 'leap' || mv === 'side') D.startEvade(mv, null);
      else if (mv === 'guard') D.startGuard(1.2, 9);
      else if (mv === 'beat' || mv === 'laugh' || mv === 'headspin') D.startTaunt(mv);
      else if (mv === 'down') D.startDown(2.1);
      else if (mv === 'rage') D.startRage('frustration');
      else if (mv === 'dead') {
        e.hp = 0;
        e.die();
      } else if (mv === 'ceil') {
        D.jump('ceil', 0.4);
      }
      const dur = DUR[mv] || 1.5;
      const dt = 1 / 30;
      const steps = Math.round(dur / dt);
      let col = 0;
      for (let i = 0; i < steps; i++) {
        P.hp = 9999;
        if (P.state === 'grabbed') P.mash = 0;
        // desplazamientos para ver la marcha
        if (mv === 'walk' || mv === 'gallop' || mv === 'creep') {
          D.setMode('scripted');
          D.creep = mv === 'creep';
          const sp = mv === 'gallop' ? 7 : mv === 'creep' ? 2.2 : 3.2;
          e.vx = 0;
          e.vz = -sp;
          e.yaw = Math.PI;
          e.pos.z += e.vz * dt;
        }
        if (mv === 'ceil' && !D.air && i > 14) {
          D.setMode('scripted');
          e.vz = -3;
          e.yaw = Math.PI;
          e.pos.z += e.vz * dt;
        }
        if (mv === 'idle') D.setMode('scripted');
        g.update(dt);
        g.atmo.override = { exposure: 2.4, density: 0.02, hemi: 2.2, sky: 0x8a8480, ground: 0x3a3430 };
        // cámara de lado, a la altura del pecho
        const c = D.center;
        const mx = c.x * 0.75 + P.pos.x * 0.25,
          mz = c.z * 0.75 + P.pos.z * 0.25;
        const cy = mv === 'ceil' ? c.y - 0.6 : -6.6 + 1.0;
        g.camera.position.set(mx + 4.6 * CAM, -6.6 + (mv === 'ceil' ? 1.2 : 2.0 * Math.min(1, CAM + 0.2)), mz + 2.2 * CAM);
        g.camera.lookAt(mx, cy, mz);
        g.camera.updateMatrixWorld();
        const want = Math.round(((col + 0.5) / COLS) * steps);
        if (i === want && col < COLS) {
          g.render();
          cx.drawImage(g.renderer.domElement, col * W, row * H, W, H);
          cx.fillStyle = '#fff';
          cx.fillText(mv + ' ' + (g.time - t0).toFixed(2), col * W + 6, row * H + 16);
          col++;
        }
      }
      out.push([mv, D.mode, +e.pos.x.toFixed(2), +e.pos.z.toFixed(2)]);
    });
    document.body.appendChild(sheet);
    return out;
  },
  [moves, COLS, TW, CAM]
);
console.log(JSON.stringify(info));
const el = await p.$('#sheet');
await p.setViewportSize({ width: TW * COLS, height: Math.round((TW * 9) / 16) * moves.length });
await el.screenshot({ path: `tools/shots/anim_${name}.png` });
console.log(logs.slice(0, 10).join('\n'));
await b.close();
