// La casa tapiada, el pasadizo del Soto y Miguel, el tonelero: recorre lo que
// se hace allí y comprueba cada paso (requiere npx vite --port 5199).
//   node tools/souto.mjs             las pruebas
//   SHOTS=1 node tools/souto.mjs     y, además, capturas en tools/shots/souto_*.png
// Comprueba: la puerta tapiada (con la palanca), que se sube por la escalera
// al sobrado, el hueco sin tablón (el aviso) y con él (se tiende y se pisa),
// el equilibrio (cruzar corrigiendo; sin corregir, se cae a la calle y duele),
// Miguel (llora, te ve, te grita, se encoge y se muerde de cerca, nunca ataca),
// la puerta atrancada de su casa (se abre desde dentro) y que, si te vas y
// tardas, se ahorca (la soga, el taburete, la duela).
import { chromium } from 'playwright';
const SHOTS = !!process.env.SHOTS;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
p.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('ERR_CERT') && !m.text().includes('404')) logs.push('console.error: ' + m.text());
});
await p.goto('http://localhost:5199/?dev=1&items=');
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  g.input.enabledPointerLock = false;
  g.input.onPointerLockLost = null;
  g.ui.closeAll();
  // (sólo los de la calle: Inés y Miguel se quedan)
  window.__calm = () => g.enemies.forEach((e) => { if (!e.boss && e.id !== 'e_hija' && e.id !== 'e_miguel' && !e.dead) { e.dead = true; e.state = 'dead'; e.stT = 99; e.obj.visible = false; } });
  __calm();
  // el jugador, con la cámara detrás (yaw: hacia dónde mira)
  window.__at = (x, y, z, yaw) => { g.player.spawn(x, y, z, yaw); g.camRig.snapTo && g.camRig.snapTo(g.player); g.camRig.yaw = yaw; __sim(0.05); };
  window.__pos = () => [g.player.pos.x, g.player.pos.y, g.player.pos.z].map((v) => +v.toFixed(2));
  // n fotogramas (1/30 s) con esas teclas mantenidas, sin dibujar
  window.__step = (n, keys = []) => {
    const inp = g.input;
    for (const k of [...inp.keys]) if (!keys.includes(k)) {
      inp.keys.delete(k);
      inp.kReleased.add(k);
    }
    for (const k of keys) if (!inp.keys.has(k)) {
      inp.keys.add(k);
      inp.kPressed.add(k);
    }
    for (let i = 0; i < n; i++) g.update(1 / 30);
  };
});
const run = async (name, fn) => {
  let r;
  try {
    r = await p.evaluate(fn);
  } catch (e) {
    r = 'ERR ' + e.message;
  }
  console.log(name.padEnd(34), JSON.stringify(r));
  return r;
};
const shot = async (name, cam) => {
  if (!SHOTS) return;
  await p.evaluate((cam) => {
    const g = __game;
    if (cam) {
      const T = g.THREE;
      g.camRig.override = { pos: new T.Vector3(cam[0], cam[1], cam[2]), look: new T.Vector3(cam[3], cam[4], cam[5]), speed: 1000 };
      for (let k = 0; k < 3; k++) g.update(1 / 30);
      g.camera.position.set(cam[0], cam[1], cam[2]);
      g.camera.lookAt(cam[3], cam[4], cam[5]);
    }
    g.render();
    g.camRig.override = null;
  }, cam);
  await p.screenshot({ path: `tools/shots/souto_${name}.png`, timeout: 180000 });
};

// ------------------------------------------------------------ la casa tapiada
await p.evaluate(() => {
  window.__use = (id, dist = 1.0) => {
    const g = __game;
    const it = g.interact.list.find((i) => i.id === id);
    if (!it) return 'NO EXISTE ' + id;
    const ix = it.ix ?? it.x,
      iz = it.iz ?? it.z;
    const tries = [[0, dist], [0, -dist], [dist, 0], [-dist, 0], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7]];
    for (const [dx, dz] of tries) {
      const x = ix + dx,
        z = iz + dz;
      const y = g.world.col.groundHeight(x, z, 0.1, it.y + 1.5);
      g.player.spawn(x, y, z, Math.atan2(ix - x, iz - z));
      __calm();
      __sim(0.1);
      if (g.promptTarget && g.promptTarget.id === id) {
        __sim(0.2, [], ['KeyE']);
        for (let k = 0; k < 3; k++) if (g.ui.modal) { __sim(0.5); __sim(0.1, [], ['KeyE']); }
        __sim(1.5);
        return { ok: true, done: it.done, toast: [...document.querySelectorAll('.toast')].map((t) => t.textContent).slice(-1)[0] };
      }
    }
    return { ok: false, prompt: g.promptTarget && g.promptTarget.id, pos: __pos() };
  };
});
await run('puerta sin palanca', () => {
  const g = __game;
  if (g.inventory.has('palanca')) g.inventory.add('palanca', -1);
  return __use('d_souto');
});
await run('puerta con palanca', () => {
  const g = __game;
  g.inventory.add('palanca');
  return __use('d_souto');
});
await shot('fachada', [-29.7, 1.7, 2.8, -29.7, 1.9, -6]);
await shot('ventana', [-31.3, 1.55, -1.4, -31.75, 1.45, -6]);
await run('Inés en la ventana alta', () => {
  const g = __game;
  const e = g.enemies.find((q) => q.id === 'e_hija');
  return { pos: [e.pos.x, e.pos.y, e.pos.z].map((v) => +v.toFixed(2)), state: e.state, idle: e.idle, grounded: e.body.grounded };
});
await shot('ines', [-32.0, 1.7, 1.5, -32.2, 4.9, -4.4]);
// sube la escalera andando (W, con la cámara detrás)
await run('subir la escalera', () => {
  const g = __game;
  const e = g.enemies.find((q) => q.id === 'e_hija');
  e.dead = true;
  e.state = 'dead';
  e.stT = 99;
  e.obj.visible = false;
  __at(-27.4, 0, -4.3, Math.PI);
  const ys = [];
  for (let i = 0; i < 70; i++) {
    g.camRig.yaw = Math.PI;
    __sim(0.1, ['KeyW']);
    if (i % 10 === 9) ys.push(+g.player.pos.y.toFixed(2));
  }
  return { pos: __pos(), ys, zone: g.zone && g.zone.id };
});
await run('salir de la escalera (oeste)', () => {
  const g = __game;
  for (let i = 0; i < 25; i++) {
    g.camRig.yaw = -Math.PI / 2;
    __sim(0.1, ['KeyW']);
  }
  return { pos: __pos(), zone: g.zone && g.zone.id };
});
await run('la carta de la madre', () => __use('n_madre'));
await run('el recetario', () => __use('n_receta'));
await run('la ampolla', () => __use('i_ampolla1'));
await run('bajar la escalera', () => {
  const g = __game;
  __at(-27.4, 3.8, -7.95, 0);
  for (let i = 0; i < 40; i++) {
    g.camRig.yaw = 0;
    __step(3, ['KeyW']);
  }
  __step(1, []);
  return { pos: __pos(), zone: g.zone && g.zone.id };
});

// ------------------------------------------------------------ el hueco
await run('hueco sin tablón', () => {
  const g = __game;
  while (g.inventory.has('tablon')) g.inventory.add('tablon', -1);
  const r = __use('x_hueco');
  return { ...r, tabla: !!g.flags['souto:tabla'] };
});
await shot('hueco', [-28.5, 5.9, -2.6, -29.7, 3.8, 0.6]);
await run('hueco con tablón', () => {
  const g = __game;
  g.inventory.add('tablon');
  const r = __use('x_hueco');
  __sim(1.5);
  const it = g.interact.list.find((i) => i.id === 'x_hueco');
  return { ...r, tabla: !!g.flags['souto:tabla'], box: g.souto.plankBox.enabled, mesh: g.souto.plankMesh.visible, left: g.inventory.count('tablon'), spotHidden: it.hidden };
});
await shot('tablon', [-28.5, 5.9, -2.6, -29.7, 3.8, 0.6]);
// cruzar (varias veces): sin corregir, el balanceo acaba tirándole a la
// calle; corrigiendo (se empuja hacia el lado contrario, como un jugador que
// reacciona tarde), se cruza
await p.evaluate(() => {
  window.__cross = (correct, react = 0.12) => {
    const g = __game;
    g.player.hp = g.player.maxHp;
    g.souto.falling = null;
    __at(-29.7, 3.86, -1.7, 0);
    let maxLean = 0;
    for (let i = 0; i < 150; i++) {
      g.camRig.yaw = 0;
      const b = g.player.balance;
      const keys = ['KeyW'];
      // (cámara mirando a +z: la derecha de la pantalla es -x)
      if (correct && b && b.lean > react) keys.push('KeyD');
      if (correct && b && b.lean < -react) keys.push('KeyA');
      __step(3, keys);
      if (g.player.balance) maxLean = Math.max(maxLean, Math.abs(g.player.balance.lean));
      if (g.player.pos.y < 2) {
        __step(75, []);
        return { fell: true, maxLean: +maxLean.toFixed(2), hp: Math.round(g.player.hp), y: +g.player.pos.y.toFixed(2) };
      }
      if (g.player.pos.z > 2.6) break;
    }
    __step(1, []);
    return { fell: false, maxLean: +maxLean.toFixed(2), z: +g.player.pos.z.toFixed(2) };
  };
});
await run('cruzar sin corregir (x5)', () => [0, 1, 2, 3, 4].map(() => __cross(false)));
await run('cruzar corrigiendo (x5)', () => [0, 1, 2, 3, 4].map(() => __cross(true)));
await run('cruzar corrigiendo tarde (x5)', () => [0, 1, 2, 3, 4].map(() => __cross(true, 0.4)));
await shot('equilibrio', null);

// ------------------------------------------------------------ Miguel
await run('Miguel, antes de verte', () => {
  const g = __game;
  const e = g.enemies.find((q) => q.id === 'e_miguel');
  return { pos: [e.pos.x, e.pos.y, e.pos.z].map((v) => +v.toFixed(2)), mode: g.souto.mode, idle: e.idle, vis: e.obj.visible, met: !!g.flags['morador:met'] };
});
await run('entrar en la alcoba', () => {
  const g = __game;
  __at(-25.3, 3.8, 7.6, 0);
  const lines = [];
  for (let i = 0; i < 60; i++) {
    g.camRig.yaw = 0;
    __sim(0.1, i < 14 ? ['KeyW'] : []);
    const b = g.speech.list.get('miguel');
    if (b && b.line && lines[lines.length - 1] !== b.line) lines.push(b.line);
  }
  return { pos: __pos(), mode: g.souto.mode, met: !!g.flags['morador:met'], lines };
});
await shot('miguel_rincon', [-27.6, 5.5, 9.7, -31.5, 4.3, 11.6]);
await run('acercarse a Miguel', () => {
  const g = __game;
  const e = g.enemies.find((q) => q.id === 'e_miguel');
  const hp = g.player.hp;
  __at(-30.2, 3.8, 10.5, Math.atan2(e.pos.x + 30.2, e.pos.z - 10.5));
  const lines = [];
  for (let i = 0; i < 60; i++) {
    __sim(0.1);
    const b = g.speech.list.get('miguel');
    if (b && b.line && lines[lines.length - 1] !== b.line) lines.push(b.line);
  }
  return { mode: g.souto.mode, W: Object.fromEntries(Object.entries(e.data.W).map(([k, v]) => [k, +v.toFixed(2)])), hpLost: hp - g.player.hp, lines };
});
await shot('miguel_cerca', [-28.9, 5.2, 11.85, -31.5, 4.3, 11.2]);
await run('alejarse', () => {
  const g = __game;
  __at(-25.6, 3.8, 9.6, Math.PI);
  __sim(3);
  return { mode: g.souto.mode };
});
// la puerta atrancada de abajo: desde la calle, no; desde dentro, sí
await run('puerta de Miguel desde fuera', () => {
  const g = __game;
  const it = g.interact.list.find((i) => i.id === 'd_miguel');
  __at(-27.75, 0, 2.5, 0);
  __sim(0.2);
  const pt = g.promptTarget && g.promptTarget.id;
  __sim(0.2, [], ['KeyE']);
  __sim(0.5);
  return { prompt: pt, done: it.done, toast: [...document.querySelectorAll('.toast')].map((t) => t.textContent).slice(-1)[0] };
});
await run('bajar a la tonelería', () => {
  const g = __game;
  __at(-23.9, 3.8, 5.6, 0);
  for (let i = 0; i < 60; i++) {
    g.camRig.yaw = 0;
    __sim(0.1, ['KeyW']);
  }
  return { pos: __pos(), zone: g.zone && g.zone.id };
});
await run('subir desde la tonelería', () => {
  const g = __game;
  __at(-23.9, 0, 10.4, Math.PI);
  for (let i = 0; i < 40; i++) {
    g.camRig.yaw = Math.PI;
    __step(3, ['KeyW']);
  }
  __step(1, []);
  const top = __pos();
  __at(-23.9, 3.8, 5.6, 0);
  for (let i = 0; i < 40; i++) {
    g.camRig.yaw = 0;
    __step(3, ['KeyW']);
  }
  __step(1, []);
  return { top, down: __pos() };
});
await run('puerta de Miguel desde dentro', () => {
  const g = __game;
  const it = g.interact.list.find((i) => i.id === 'd_miguel');
  __at(-27.75, 0, 4.6, Math.PI);
  __sim(0.2);
  const pt = g.promptTarget && g.promptTarget.id;
  __sim(0.2, [], ['KeyE']);
  __sim(1.5);
  return { prompt: pt, done: it.done, flag: !!g.flags['door:d_miguel'] };
});
await shot('toneleria', [-31.5, 1.7, 4.4, -26.5, 1.0, 9.5]);
// fuera de su casa, el tiempo corre: se ahorca
await run('irse y volver tarde', () => {
  const g = __game;
  __at(-27.75, 0, 1.0, Math.PI);
  __sim(1);
  for (let i = 0; i < 65; i++) __sim(1);
  const e = g.enemies.find((q) => q.id === 'e_miguel');
  return { hanged: !!g.flags['morador:ahorcado'], idle: e.idle, pos: [e.pos.x, e.pos.y, e.pos.z].map((v) => +v.toFixed(2)), rope: g.souto.rope.grp.visible, note: !g.souto.note.hidden };
});
await run('ver al ahorcado', () => {
  const g = __game;
  __at(-25.3, 3.8, 8.1, 0);
  for (let i = 0; i < 20; i++) {
    g.camRig.yaw = 0;
    __sim(0.1, i < 5 ? ['KeyW'] : []);
  }
  return { visto: !!g.flags['morador:visto'], mode: g.souto.mode };
});
await shot('ahorcado', [-25.4, 5.3, 9.7, -28.9, 5.3, 10.45]);
await run('la duela', () => __use('n_miguel'));
console.log(logs.slice(0, 20).join('\n'));
await b.close();
