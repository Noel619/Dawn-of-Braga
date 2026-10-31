// El Rey y su mesa, en el navegador: capturas de la escena y una partida de
// prueba. (requiere npx vite --port 5199, o URL_BASE)
//   node tools/rey.mjs fotos            el Rey y la mesa desde varios sitios
//   node tools/rey.mjs mesa             sentarse: las reglas, su turno y el tuyo
//   node tools/rey.mjs final a|b        los finales (ganar / perder las tres)
// Las capturas van a tools/shots/rey_*.png.
import { chromium } from 'playwright';
const [cmd = 'fotos', arg] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.W || 960), height: +(process.env.H || 540) } });
const logs = [];
p.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(m.type() + ': ' + m.text()));
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + '\n' + e.stack));
// en la sala del alcaide, al norte de la mesa, mirando al Rey (URL_BASE: otro
// servidor, p. ej. la versión compilada con `npx vite preview --port 5198`)
await p.goto((process.env.URL_BASE || 'http://localhost:5199') + '/?dev=1&at=-78.55,9,-19.4&yaw=0');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
await p.evaluate(() => {
  const g = __game;
  // (sólo avanza lo que avanza la prueba: el bucle del navegador, quieto; si
  // no, el juego corría a la vez a su ritmo y los tiempos cambiaban)
  window.__pause = true;
  g.ui.closeAll();
  g.input.enabledPointerLock = false;
  // sin criaturas despiertas cerca
  for (const e of g.enemies) if (!e.T.friendly && !e.boss) e.alive && Math.hypot(e.pos.x + 78, e.pos.z + 17) < 30 && (e.dead = true, e.state = 'dead', e.obj.visible = false);
});
let shot = 0;
const snap = async (name) => {
  await p.evaluate(() => {
    const g = __game;
    if (g.rey.view == null && window.__hidePlayer) g.player.obj.visible = false;
    g.render();
  });
  // (con el render por software, la primera vista de algo nuevo tarda: margen)
  await p.screenshot({ path: `tools/shots/rey_${name || shot++}.png`, timeout: 120000 });
};
// avanza el juego n segundos (a 30 por segundo); keys: teclas pulsadas al principio
const sim = (sec, tap = []) => p.evaluate(([sec, tap]) => window.__sim(sec, [], tap), [sec, tap]);
const cam = (c, l) =>
  p.evaluate(
    ([c, l]) => {
      const g = __game,
        T = g.THREE;
      g.camRig.override = { pos: new T.Vector3(...c), look: new T.Vector3(...l), speed: 1000 };
      for (let k = 0; k < 3; k++) g.update(1 / 30);
      g.camera.position.set(...c);
      g.camera.lookAt(...l);
    },
    [c, l]
  );
const state = () =>
  p.evaluate(() => {
    const q = __game.rey;
    const S = q.seat;
    const F = S && S.final;
    return { mode: q.mode, phase: S && S.phase, script: q.script ? Object.keys(q.script.cur || {}).join(',') + ' ' + q.script.steps.length : false, n: __game.flags['rey:n'] | 0, turn: q.cerco.turn, ply: q.cerco.ply, res: q.cerco.result, modal: __game.ui.stack.map((s) => s.name), final: F ? { dying: F.dying, deadK: F.deadK && +F.deadK.toFixed(2), stopped: F.stopped, setup: F.setup && F.setup.step + F.setup.i } : null };
  });

if (cmd === 'fotos') {
  await sim(1.5);
  await p.evaluate(() => {
    window.__pause = true;
    const g = __game;
    g.player.obj.visible = false;
    g.speech.clear();
    g.ui.showHud(false);
    const r = g.player.render;
  });
  await p.evaluate(() => (window.__hidePlayer = true));
  await cam([-78.55, 10.5, -19.2], [-78.55, 9.9, -16.6]);
  await snap('frente');
  await cam([-77.2, 10.2, -16.6], [-78.55, 9.9, -16.6]);
  await snap('lado');
  await cam([-78.3, 10.35, -17.5], [-78.55, 10.25, -16.65]);
  await snap('cara');
  await cam([-76.4, 11.6, -20.6], [-78.55, 9.6, -16.8]);
  await snap('sala');
  await cam([-78.55, 10.55, -17.95], [-78.55, 9.835, -17.33]);
  await snap('tablero');
} else if (cmd === 'retratos') {
  // el Rey de cerca: en reposo, tosiendo, pensando, alcanzando y muerto (las dos maneras)
  await sim(1.5);
  await p.evaluate(() => {
    const g = __game;
    window.__pause = true;
    g.speech.clear();
    g.ui.showHud(false);
    g.rey.script = null;
    window.__hidePlayer = true;
  });
  const pose = async (name, fn, secs = 1.2) => {
    await p.evaluate(fn);
    await sim(secs);
    await p.evaluate(() => (__game.player.obj.visible = false));
    await cam([-78.32, 10.38, -17.55], [-78.55, 10.22, -16.68]);
    await snap(name + '_cara');
    await cam([-77.25, 10.25, -17.6], [-78.55, 9.95, -16.7]);
    await snap(name + '_lado');
  };
  await pose('reposo', () => (__game.rey.npc.data.look = new __game.THREE.Vector3(-78.55, 10.4, -18.6)));
  await pose('tos', () => __game.rey.play('coughLong'), 1.6);
  await pose('piensa', () => __game.rey.play('think'), 1.5);
  await pose('dolor', () => __game.rey.play('pain'), 0.5);
  await pose('muertoA', () => {
    const e = __game.rey.npc;
    e.anim.stop(0);
    e.data.dead = { kind: 'back', k: 1 };
  });
  await pose('muertoB', () => {
    const e = __game.rey.npc;
    e.data.dead = { kind: 'slump', k: 1 };
  });
} else if (cmd === 'tres') {
  // tres partidas seguidas, moviendo al azar (las pierdes): el ciclo entero
  await sim(1.0);
  for (let i = 0; i < 30 && (await state()).script; i++) await sim(0.5);
  await p.evaluate(() => {
    const g = __game;
    g.flags['rey:met'] = true;
    g.flags['rey:reglas'] = true;
    g.rey.mode = 'idle';
    g.rey.talk();
  });
  let last = '';
  for (let i = 0; i < 2400; i++) {
    const s = await state();
    if (s.phase === 'you')
      await p.evaluate(() => {
        const q = __game.rey;
        const ms = q.cerco.moves();
        // (que no se le escape el rey sin querer: mueve a los ocho)
        const quiet = ms.filter((m) => q.cerco.b[Math.floor(m / 81)] !== 3);
        const pool = quiet.length ? quiet : ms;
        q.playerMove(pool[Math.floor(Math.random() * pool.length)]);
      });
    if (s.phase === 'again') await sim(0.6, ['KeyE']);
    else await sim(0.5, s.phase === 'final' ? ['KeyE'] : []);
    const k = s.mode + '/' + s.phase + '/' + s.n;
    if (k !== last) {
      console.log(i, k, 'jugadas', s.ply, s.res ? JSON.stringify(s.res) : '');
      last = k;
    }
    if (s.mode === 'dead') break;
  }
  await snap('tres_fin');
} else if (cmd === 'casos') {
  // lo que no es jugar: levantarse, releer las reglas, la pausa, una criatura
  // que interrumpe y examinarle muerto
  const ok = (name, cond) => console.log((cond ? 'ok   ' : 'MAL  ') + name);
  await sim(1.0);
  for (let i = 0; i < 30 && (await state()).script; i++) await sim(0.5);
  const sit = () =>
    p.evaluate(() => {
      const g = __game;
      g.flags['rey:met'] = true;
      g.flags['rey:reglas'] = true;
      g.rey.mode = 'idle';
      g.rey.script = null;
      g.rey.talk();
    });
  const untilPhase = async (ph, max = 80) => {
    for (let i = 0; i < max; i++) {
      if ((await state()).phase === ph) return true;
      await sim(0.5);
    }
    return false;
  };
  // 1. levantarse antes de mover: no cuenta
  await sit();
  ok('tu turno', await untilPhase('you'));
  // (lo que se pulsa en la primera décima del turno no cuenta: a propósito)
  await sim(0.4);
  await sim(0.3, ['Escape']);
  ok('primer Esc: avisa', await p.evaluate(() => __game.rey.seat && __game.rey.seat.leaveT > 0));
  await sim(0.3, ['Escape']);
  let s = await state();
  ok('segundo Esc: de pie, y no cuenta', !s.phase && s.n === 0);
  // 2. levantarse tras mover: cuenta como perdida
  await sim(1);
  await sit();
  await untilPhase('you');
  await p.evaluate(() => {
    const q = __game.rey;
    const ms = q.cerco.moves().filter((m) => q.cerco.b[Math.floor(m / 81)] !== 3);
    q.playerMove(ms[0]);
  });
  await sim(1);
  await untilPhase('you');
  await sim(0.4);
  await sim(0.3, ['Escape']);
  await sim(0.3, ['Escape']);
  s = await state();
  ok('levantarse a media partida la pierde', !s.phase && s.n === 1);
  // 3. las reglas con R y la pausa con P, sentado
  await sim(1);
  await sit();
  await untilPhase('you');
  // (lo que se pulsa en la primera décima del turno no cuenta: a propósito)
  await sim(0.4);
  await sim(0.3, ['KeyR']);
  s = await state();
  ok('R abre las reglas', s.modal.includes('note') && s.phase === 'you');
  await p.evaluate(() => __game.ui.closeAll());
  await sim(0.5, ['KeyP']);
  s = await state();
  ok('P abre la pausa (y sigue sentado)', s.modal.includes('pause') && s.phase === 'you');
  await p.evaluate(() => __game.ui.closeAll());
  await sim(0.5);
  // 4. una criatura despierta cerca: te levantas
  await p.evaluate(() => {
    const g = __game;
    const e = g.enemies.find((x) => x.id === 'e_alc1');
    e.dead = false;
    e.state = 'dormant';
    e.obj.visible = true;
    e.body.pos.set(-80, 9, -14);
    e.aware = true;
    g._actT = 0;
  });
  await sim(0.6);
  s = await state();
  ok('una criatura cerca: de pie', !s.phase);
  await p.evaluate(() => {
    const e = __game.enemies.find((x) => x.id === 'e_alc1');
    e.dead = true;
    e.state = 'dead';
    e.aware = false;
    e.obj.visible = false;
  });
  // 5. muerto: examinarle
  await p.evaluate(() => {
    const g = __game;
    g.flags['rey:muerto'] = true;
    g.flags['rey:final'] = 'a';
    g.rey.applyFlags();
    g.rey.talk();
  });
  await sim(0.3);
  ok('muerto: se le examina', await p.evaluate(() => [...document.querySelectorAll('#toasts .toast')].some((t) => t.textContent.includes('Sonríe'))));
  ok('muerto: quieto en su sitial', await p.evaluate(() => __game.rey.npc.scripted && __game.rey.npc.obj.visible));
} else if (cmd === 'mesa') {
  await sim(1.0);
  console.log('al llegar', JSON.stringify(await state()));
  // (te ha visto: espera a que acabe)
  for (let i = 0; i < 30 && (await state()).script; i++) await sim(0.5);
  // hablar: la presentación (pasando frases)
  await p.evaluate(() => __game.rey.talk());
  for (let i = 0; i < 40 && (await state()).script; i++) await p.evaluate(() => (__game.speech.skip(__game.rey.who), window.__sim(0.4)));
  await sim(1);
  console.log('tras hablar', JSON.stringify(await state()));
  await snap('hablar');
  // sentarse
  await p.evaluate(() => __game.rey.talk());
  await sim(1.5);
  await snap('sentado');
  for (let i = 0; i < 40 && (await state()).script && !(await state()).modal.length; i++) await p.evaluate(() => (__game.speech.skip(__game.rey.who), window.__sim(0.4)));
  console.log('reglas', JSON.stringify(await state()));
  await snap('reglas');
  // cerrar el pergamino, si está abierto
  await p.evaluate(() => __game.ui.closeAll());
  await sim(3);
  await snap('empieza');
  // su turno: piensa, alarga la mano...
  for (let i = 0; i < 20; i++) {
    await sim(0.5);
    const s = await state();
    if (i === 6) await snap('piensa');
    if (s.phase === 'reach') {
      await sim(0.6);
      await snap('alcanza');
      await sim(0.9);
      await snap('lleva');
      break;
    }
  }
  for (let i = 0; i < 20; i++) {
    await sim(0.5);
    if ((await state()).phase === 'you') break;
  }
  console.log('tu turno', JSON.stringify(await state()));
  await sim(0.5);
  await snap('tuturno');
  // elegir una pieza (el cursor empieza en tu rey: baja a uno de los tuyos)
  await sim(0.3, ['ArrowDown']);
  await sim(0.3, ['KeyE']);
  await snap('elegida');
  await sim(0.3, ['ArrowLeft']);
  await sim(0.3, ['KeyE']);
  await sim(1.2);
  console.log('tras mover', JSON.stringify(await state()));
  await snap('movida');
} else if (cmd === 'final') {
  // salta a un final: a (le ganas) o b (pierdes las tres)
  await sim(1.0);
  for (let i = 0; i < 30 && (await state()).script; i++) await sim(0.5);
  await p.evaluate((kind) => {
    const g = __game;
    g.flags['rey:met'] = true;
    g.flags['rey:reglas'] = true;
    g.flags['rey:n'] = kind === 'a' ? 0 : 2;
    g.rey.mode = 'idle';
    g.rey.noticed = true;
    g.rey.talk();
  }, arg || 'a');
  await sim(4);
  // una posición en la que la jugada siguiente acaba la partida
  await p.evaluate((kind) => {
    const g = __game,
      q = g.rey;
    q.script = null;
    const C = q.cerco;
    C.reset();
    const set = (rows) => {
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) C.b[r * 9 + c] = { A: 1, D: 2, K: 3 }[rows[r][c]] || 0;
      C.king = C.b.indexOf(3);
      C.rehash();
      C.seen = [C.key()];
    };
    if (kind === 'a') {
      // tu rey, con la salida libre: mueves tú
      set(['.........', '.........', '..A...A..', '.D.....D.', 'A..K....A', '....D....', '..A...A..', '.........', '....A....']);
      C.turn = 2;
    } else {
      // tu rey, cogido en medio a la siguiente: mueve él
      set(['...A.....', '.........', '..A...A..', '.D.....D.', 'A........', '....D....', '..AK..A..', '.........', '...A.....']);
      C.turn = 1;
    }
    q.board.setPosition(C.b);
    q.seat.phase = 'idle';
    if (kind === 'a') {
      q.playerTurn();
    } else q.kingTurn();
  }, arg || 'a');
  if ((arg || 'a') === 'a') {
    // el rey a las afueras: de d5 (fila 4, columna 3) a d9 (fila 0)
    await sim(1);
    await p.evaluate(() => __game.rey.playerMove(39 * 81 + 3));
  }
  for (let i = 0; i < 140; i++) {
    await sim(0.5, (await state()).phase === 'final' ? ['KeyE'] : []);
    const s = await state();
    if (i % 6 === 0) {
      console.log(i, JSON.stringify(s));
      if (i % 12 === 0) await snap('final' + i);
    }
    if (s.mode === 'dead' && !s.phase) break;
  }
  await sim(5);
  await snap('muerto');
  console.log('fin', JSON.stringify(await state()), await p.evaluate(() => JSON.stringify({ inv: [...__game.inventory.toJSON ? Object.keys(__game.inventory.toJSON()) : []], flags: Object.fromEntries(Object.entries(__game.flags).filter(([k]) => k.startsWith('rey') || k.startsWith('take:i_rey'))) })));
}
console.log(logs.slice(0, 30).join('\n'));
await b.close();
