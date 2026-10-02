// Simula la caza en las bodegas y resume qué hace el Descoyuntado.
//   node tools/huntsim.mjs [segundos] [modo] [ver]
//   modos: still (quieto), wander (pasea), fight (pelea: combos de tres,
//   rueda a la derecha cuando le atacan, se cura), levers (echa las tres
//   palancas y sale por el pozo, peleando si hace falta), parry (pelea
//   desviando sus zarpazos, barridos y mordiscos en vez de rodar)
//   ver: 1 para sacar cada cambio de modo del jefe
import { chromium } from 'playwright';
const secs = +(process.argv[2] || 90),
  how = process.argv[3] || 'wander',
  verbose = process.argv[4] === '1';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 480, height: 270 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 5).join(' | ')));
await p.goto('http://localhost:5199/?dev=1&at=59.5,-6.6,-38&yaw=180&items=espada,escudo');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
const r = await p.evaluate(
  ([secs, how, verbose]) => {
    window.__pause = true;
    const g = __game;
    g.ui.closeAll();
    g.input.enabledPointerLock = false;
    g.flags['cine:sotano'] = true;
    g.player.spawn(59.5, -6.6, -38.5, Math.PI);
    const e = g.bosses.descoyuntado;
    const D = e.D;
    // escape: las tres palancas ya echadas; huyes al pozo con él enloquecido
    if (how === 'escape') {
      for (const l of g.interact.list.filter((i) => i.kind === 'lever')) g.flags['lever:' + l.id] = true;
      g.interact.applyFlags(g.flags);
      g.player.spawn(57, -6.6, -41, Math.PI);
    }
    const trace = [];
    let simT = 0;
    const sh = g.breakables.shatter.bind(g.breakables);
    g.breakables.shatter = (it, from, inst) => {
      if (!inst) trace.push(['BREAK', +simT.toFixed(1), it.id, D.mode, D.atk && D.atk.name]);
      return sh(it, from, inst);
    };
    const origRage = D.startRage.bind(D);
    D.startRage = (why) => {
      if (D.stage !== 'rage') trace.push(['RAGE', +simT.toFixed(1), why, 'hp', e.hp, 'frust', +D.frust.toFixed(2)]);
      return origRage(why);
    };
    let last = '';
    const modes = {};
    const stages = {};
    let hits = 0,
      lastHp = g.player.hp,
      deaths = 0,
      dealt = 0,
      lastBoss = e.hp,
      reads = 0,
      blocks = 0,
      evades = 0,
      stageDealt = { stalk: 0, rage: 0 };
    const oldObs = D.readFx.bind(D);
    D.readFx = () => {
      reads++;
      return oldObs();
    };
    const oldBlock = D.blockFx.bind(D);
    D.blockFx = (x, z) => {
      blocks++;
      return oldBlock(x, z);
    };
    let parries = 0,
      downs = 0;
    const oldPar = D.parried.bind(D);
    D.parried = (a) => {
      parries++;
      const r = oldPar(a);
      if (D.parryFull) downs++;
      return r;
    };
    const oldEv = D.startEvade.bind(D);
    D.startEvade = (k, t) => {
      const r = oldEv(k, t);
      if (r) evades++;
      return r;
    };
    const P = g.player;
    const inp = g.input;
    const wander = [
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
    const leverList = g.interact.list.filter((i) => i.kind === 'lever');
    let wp = 0,
      path = null,
      pathI = 0,
      pathGoal = null,
      pathT = 0;
    let parryErr = 0;
    let combo = 0,
      comboT = 0,
      rollCD = 0,
      prevSpace = false,
      pulled = 0,
      climbed = false;
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
    const t0 = performance.now();
    for (let i = 0; i < secs * 30; i++) {
      const hold = [];
      const taps = [];
      rollCD -= 1 / 30;
      comboT -= 1 / 30;
      const d = Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z);
      const bossNear = !e.dead && e.obj.visible && D.plane === 'floor' && !D.hidden && d < 7 && D.mode !== 'lair';
      const allPulled = leverList.every((l) => g.flags['lever:' + l.id]);
      const fighting = (how === 'fight' || how === 'parry' || (how === 'levers' && !allPulled)) && bossNear && !P.dead;
      if (P.state === 'grabbed' || P.state === 'pinned') {
        // atrapado o derribado: forcejea
        if (i % 3 === 0) taps.push('M0');
      } else if (fighting) {
        // de cara al jefe
        const yaw = Math.atan2(e.pos.x - P.pos.x, e.pos.z - P.pos.z);
        g.camRig.yaw = yaw;
        if (P.state === 'free' || P.state === 'attack') P.yaw = yaw;
        // parry: pulsa la guardia justo antes de cada zarpazo, barrido o
        // mordisco (con algo de error, como una persona)
        const STRIKE = { claw: 0.55, claw2: 0.55, riposte: 0.36, sweep: 0.56, lunge: 0.31 };
        const sAt = how === 'parry' && D.mode === 'attack' && D.atk ? STRIKE[D.atk.name] * (D.atk.fast ? 0.62 : 1) : null;
        const second = D.atk && D.atk.name === 'claw2' && D.atkT > 0.95;
        if (sAt && !D.atk.hold && Math.abs((second ? D.atkT - 0.75 : D.atkT) - (sAt - 0.08 + parryErr)) < 1 / 60 && d < 4.5) {
          taps.push('M2');
          parryErr = (Math.random() - 0.5) * 0.12;
        } else if (how !== 'parry' && D.mode === 'attack' && D.atkT < 0.35 && d < 4.2 && rollCD <= 0 && Math.random() < 0.7) {
          // rueda a la derecha cuando empieza un golpe (su costumbre)
          hold.push('KeyD');
          taps.push('Space');
          rollCD = 1.2;
        } else if (P.hp < P.maxHp * 0.4 && P.flasks > 0 && d > 4 && P.state === 'free') taps.push('KeyR');
        else if (d > 2.4) hold.push('KeyW');
        else if (P.state === 'free' || P.state === 'attack') {
          // combos de tres flojos (a veces uno fuerte)
          if (comboT <= 0 && P.st > 25) {
            if (combo < 3) {
              taps.push(Math.random() < 0.12 ? 'KeyF' : 'M0');
              combo++;
              comboT = 0.33;
            } else {
              combo = 0;
              comboT = 0.9;
            }
          }
        }
      } else if (how === 'wander' || how === 'fight') {
        const [x, z] = wander[wp % wander.length];
        if (goTo(x, z) < 1.2) wp++;
        hold.push('KeyW');
      } else if ((how === 'levers' || how === 'escape') && !climbed) {
        if (how === 'escape' && D.stage !== 'rage' && simT > 2) D.startRage('escape');
        const L = leverList.find((l) => !g.flags['lever:' + l.id]);
        if (L) {
          const dd = goTo(L.x, L.z);
          if (dd > 0.6) hold.push('KeyW');
          else if (P.state === 'free') {
            P.yaw = Math.atan2(-L.nx, -L.nz);
            g.camRig.yaw = P.yaw;
            if (g.promptTarget === L) taps.push('KeyE');
            else hold.push('KeyW');
          }
        } else {
          pulled = 3;
          const W = g.interact.list.find((q) => q.id === 'x_pozo');
          const dd = goTo(W.x - 1.6, W.z);
          if (dd > 0.5) hold.push('KeyW');
          else {
            P.yaw = Math.atan2(W.x - P.pos.x, W.z - P.pos.z);
            g.camRig.yaw = P.yaw;
            if (g.promptTarget && g.promptTarget.id === 'x_pozo') taps.push('KeyE');
          }
          if (g.flags['pozo:salida'] && P.pos.y > -1) climbed = true;
        }
      }
      inp.keys.clear();
      for (const k of hold) inp.keys.add(k);
      for (const k of taps) {
        if (k === 'Space') continue;
        inp.keys.add(k);
        inp.kPressed.add(k);
      }
      if (taps.includes('Space')) {
        inp.keys.add('Space');
        inp.kPressed.add('Space');
        prevSpace = true;
      } else if (prevSpace) {
        inp.kReleased.add('Space');
        prevSpace = false;
      }
      g.update(1 / 30);
      simT += 1 / 30;
      if (P.dead) {
        deaths++;
        trace.push(['DEATH', +simT.toFixed(1), D.mode, D.stage]);
        P.dead = false;
        P.state = 'free';
        P.hp = P.maxHp;
      }
      if (P.hp < lastHp) hits++;
      lastHp = P.hp;
      if (e.hp < lastBoss) {
        dealt += lastBoss - e.hp;
        stageDealt[D.stage] += lastBoss - e.hp;
      }
      lastBoss = e.hp;
      if (e.dead && !trace.some((t) => t[0] === 'KILL')) trace.push(['KILL', +simT.toFixed(1)]);
      if ((how === 'levers' || how === 'escape') && climbed) break;
      const m = D.mode + (D.atk ? ':' + D.atk.name : '');
      modes[D.mode] = (modes[D.mode] || 0) + 1 / 30;
      stages[D.stage] = (stages[D.stage] || 0) + 1 / 30;
      if (m !== last) {
        if (verbose) trace.push([+(i / 30).toFixed(1), m, D.plane, +D.dist.toFixed(1), +D.hunger.toFixed(2), +D.frust.toFixed(2)]);
        last = m;
      }
    }
    for (const k in modes) modes[k] = +modes[k].toFixed(1);
    for (const k in stages) stages[k] = +stages[k].toFixed(1);
    return {
      ms: Math.round(performance.now() - t0),
      simT: +simT.toFixed(1),
      hunt: g.hunt.active,
      bossHp: e.hp,
      dealt,
      stageDealt,
      stage: D.stage,
      frust: +D.frust.toFixed(2),
      modes,
      stages,
      hits,
      deaths,
      reads,
      blocks,
      evades,
      parries,
      downs,
      parryLearned: D.learn.parries || 0,
      learned: D.learn.n,
      combos: D.learn.combos,
      dodge: D.learn.dodge._all,
      levers: leverList.filter((l) => g.flags['lever:' + l.id]).length,
      climbed,
      broken: g.breakables.list.filter((b) => b.broken).map((b) => b.id),
      trace: trace.slice(0, 120),
      nan: !isFinite(e.pos.x),
    };
  },
  [secs, how, verbose]
);
console.log(JSON.stringify(r, null, 0).replace(/\],\[/g, '],\n['));
console.log(logs.slice(0, 10).join('\n'));
await b.close();
