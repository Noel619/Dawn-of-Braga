// Rachas de quietud del Descoyuntado durante la caza: cuánto rato pasa a la
// vista (no metido en una gruta) sin moverse ni atacar, y en qué modo.
//   node tools/idlesim.mjs [segundos] [jugador] [semilla]
//   jugador: wander (anda sin parar), stopgo (anda y se para a ratos),
//            still (quieto), look (quieto, girando la cámara)
// Requiere npx vite --port 5199. Sale con código 1 si alguna racha pasa de
// MAX segundos.
import { chromium } from 'playwright';
const secs = +(process.argv[2] || 240),
  how = process.argv[3] || 'stopgo',
  seed = +(process.argv[4] || 1);
const MAX = 6;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 180 } });
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
await p.goto('http://localhost:5199/?dev=1&at=59.5,-6.6,-38&yaw=180&items=espada,escudo');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
const r = await p.evaluate(
  ([secs, how, seed, MAX]) => {
    window.__pause = true;
    // azar repetible (la IA usa Math.random)
    let s = seed >>> 0;
    Math.random = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const g = __game;
    g.ui.closeAll();
    g.input.enabledPointerLock = false;
    g.flags['cine:sotano'] = true;
    const P = g.player;
    P.spawn(59.5, -6.6, -38.5, Math.PI);
    const e = g.bosses.descoyuntado;
    const D = e.D;
    const inp = g.input;
    const route = [
      [59.5, -38.5],
      [45.5, -38],
      [32, -40],
      [32, -55],
      [43, -60],
      [44, -70],
      [49, -78],
      [62, -77.7],
      [68.8, -60],
      [68.8, -40],
      [60, -41],
    ];
    let wp = 0,
      path = null,
      pathI = 0,
      pathGoal = null,
      pathT = 0,
      stopT = 0,
      walkT = 4;
    const goTo = (x, z) => {
      pathT -= 1 / 30;
      if (!pathGoal || Math.hypot(pathGoal[0] - x, pathGoal[1] - z) > 0.5 || pathT <= 0) {
        const res = g.navCellar.path(P.pos.x, P.pos.z, x, z, 20000);
        path = res ? res.pts : null;
        pathI = 1;
        pathGoal = [x, z];
        pathT = 1;
      }
      let tx = x,
        tz = z;
      if (path && pathI < path.length) {
        if (Math.hypot(path[pathI][0] - P.pos.x, path[pathI][1] - P.pos.z) < 0.6) pathI++;
        if (pathI < path.length) [tx, tz] = path[pathI];
      }
      g.camRig.yaw = Math.atan2(tx - P.pos.x, tz - P.pos.z);
      return Math.hypot(P.pos.x - x, P.pos.z - z);
    };
    const streaks = [];
    let cur = null;
    const modes = {};
    let hidden = 0,
      deaths = 0,
      attacks = 0,
      lastAtk = null;
    for (let i = 0; i < secs * 30; i++) {
      const T = i / 30;
      inp.keys.clear();
      if (!P.dead && P.state !== 'grabbed' && P.state !== 'pinned') {
        let move = how === 'wander';
        if (how === 'stopgo') {
          if (walkT > 0) {
            walkT -= 1 / 30;
            move = true;
            if (walkT <= 0) stopT = 4 + Math.random() * 8;
          } else {
            stopT -= 1 / 30;
            if (stopT <= 0) walkT = 3 + Math.random() * 6;
          }
        }
        if (how === 'look') g.camRig.yaw += (1 / 30) * 0.6;
        if (move) {
          const [x, z] = route[wp % route.length];
          if (goTo(x, z) < 1.2) wp++;
          inp.keys.add('KeyW');
        }
      }
      g.update(1 / 30);
      if (P.dead) {
        deaths++;
        P.dead = false;
        P.state = 'free';
        P.hp = P.maxHp;
      }
      P.hp = Math.max(P.hp, 1);
      modes[D.mode] = (modes[D.mode] || 0) + 1 / 30;
      if (D.atk && D.atk !== lastAtk) attacks++;
      lastAtk = D.atk;
      if (D.hidden || !e.obj.visible) {
        hidden += 1 / 30;
        if (cur) streaks.push(cur), (cur = null);
        continue;
      }
      const sp = Math.hypot(e.vx, e.vz);
      const busy = D.mode === 'attack' || D.mode === 'evade' || D.mode === 'guard' || D.mode === 'down' || D.mode === 'stun' || D.mode === 'hurt' || D.mode === 'rageIntro' || D.mode === 'taunt' || !!D.air;
      if (sp < 0.35 && !busy) {
        if (!cur) cur = { t0: +T.toFixed(1), dur: 0, modes: {}, d: 0 };
        cur.dur += 1 / 30;
        cur.modes[D.mode] = (cur.modes[D.mode] || 0) + 1;
        cur.d = +D.dist.toFixed(1);
      } else if (cur) {
        streaks.push(cur);
        cur = null;
      }
    }
    if (cur) streaks.push(cur);
    const long = streaks
      .filter((q) => q.dur > 2.5)
      .map((q) => ({ t: q.t0, dur: +q.dur.toFixed(1), d: q.d, modes: Object.fromEntries(Object.entries(q.modes).map(([k, v]) => [k, +(v / 30).toFixed(1)])) }));
    for (const k in modes) modes[k] = +modes[k].toFixed(1);
    const still = streaks.reduce((a, q) => a + q.dur, 0);
    return { secs, how, still: +still.toFixed(1), hidden: +hidden.toFixed(1), attacks, deaths, worst: long.reduce((a, q) => Math.max(a, q.dur), 0), long, modes, stage: D.stage };
  },
  [secs, how, seed, MAX]
);
console.log(JSON.stringify(r, null, 0));
if (errs.length) console.log(errs.join('\n'));
await b.close();
process.exit(r.worst > MAX || errs.length ? 1 : 0);
