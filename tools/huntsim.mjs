// Simula la caza en la bodega y resume qué hace el Descoyuntado.
//   node tools/huntsim.mjs [segundos] [modo: still|wander|turtle]
import { chromium } from 'playwright';
const secs = +(process.argv[2] || 90), how = process.argv[3] || 'wander';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 480, height: 270 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 5).join(' | ')));
await p.goto('http://localhost:5199/?dev=1&at=59.5,-6.6,-38&yaw=180');
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const r = await p.evaluate(([secs, how]) => {
  window.__pause = true;
  const g = __game;
  g.ui.closeAll();
  g.input.enabledPointerLock = false;
  g.flags['cine:sotano'] = true;
  g.player.spawn(59.5, -6.6, -38.5, Math.PI);
  const e = g.bosses.descoyuntado;
  const trace = [];
  const sh = g.breakables.shatter.bind(g.breakables);
  let simT = 0;
  const hs = g.hunt.stop.bind(g.hunt);
  g.hunt.stop = (r) => { trace.push(['STOP', +simT.toFixed(1), g.player.pos.toArray().map((v) => +v.toFixed(2)), g.player.state, g.inCellar(g.player.pos), e.D.mode, e.D.atk && e.D.atk.name]); return hs(r); };
  g.breakables.shatter = (it, from, inst) => { if (!inst) trace.push(['BREAK', +simT.toFixed(1), it.id, e.D.mode, e.D.atk && e.D.atk.name, e.pos.toArray().map((v) => +v.toFixed(1)), (new Error().stack || '').split('\n').slice(2, 4).join(' ')]); return sh(it, from, inst); };
  let last = '';
  const modes = {};
  let hits = 0, lastHp = 100, deaths = 0, rips = 0;
  const pts = [[59.5, -38.5], [45.5, -38], [42, -48], [42, -55], [45, -59], [68.7, -40], [68.7, -55], [60, -44], [53, -44]];
  let wp = 0, t0 = performance.now();
  for (let i = 0; i < secs * 30; i++) {
    const P = g.player;
    let hold = [];
    if (how === 'wander' && !P.dead) {
      const [x, z] = pts[wp % pts.length];
      if (Math.hypot(P.pos.x - x, P.pos.z - z) < 1.2) wp++;
      g.camRig.yaw = Math.atan2(x - P.pos.x, z - P.pos.z);
      hold = ['KeyW'];
    }
    const inp = g.input;
    inp.keys.clear();
    for (const k of hold) inp.keys.add(k);
    if (Math.random() < 0.02) { inp.keys.add('M0'); inp.kPressed.add('M0'); }
    g.update(1 / 30);
    simT += 1 / 30;
    if (P.dead) { deaths++; P.dead = false; P.state = 'free'; P.hp = 100; g.respawn && null; }
    if (P.hp < lastHp) hits++;
    lastHp = P.hp;
    if (P.hp < 30) P.hp = 100;
    const m = e.D.mode + (e.D.atk ? ':' + e.D.atk.name : '');
    modes[e.D.mode] = (modes[e.D.mode] || 0) + 1 / 30;
    if (m !== last) { trace.push([+(i / 30).toFixed(1), m, e.D.plane, +e.D.dist.toFixed(1), +e.D.hunger.toFixed(2)]); last = m; }
  }
  for (const k in modes) modes[k] = +modes[k].toFixed(1);
  return { ms: Math.round(performance.now() - t0), hunt: g.hunt.active, bossHp: e.hp, modes, hits, deaths, broken: g.breakables.list.filter((b) => b.broken).map((b) => b.id), trace: trace.slice(0, 80), nan: !isFinite(e.pos.x) };
}, [secs, how]);
console.log(JSON.stringify(r, null, 0).replace(/\],\[/g, '],\n['));
console.log(logs.slice(0, 10).join('\n'));
await b.close();
