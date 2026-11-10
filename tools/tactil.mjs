// Los controles táctiles (ui/tactil.js) en un iPhone 13 emulado (844×390 en
// horizontal, táctil): que salgan, dónde caen los botones (dentro de la
// pantalla y de su zona segura, sin pisarse), el stick (andar y, llevado más
// allá del aro, correr), la cámara arrastrando, atacar, bloquear manteniendo,
// esquivar, tocar el aviso para usar algo, la pausa y su menú con la cruz, el
// inventario y sus pestañas, que el clic de ratón que el navegador manda tras
// cada toque no cuente como ataque, el título («Toca la pantalla»), el aviso
// de girar el teléfono en vertical (y la pausa) y que en el ordenador, sin
// pantalla táctil, no salga nada. Con fotos en tools/shots/tactil/.
//   node tools/tactil.mjs            (requiere npx vite --port 5199)
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.env.URL || 'http://localhost:5199/';
const DIR = 'tools/shots/tactil';
fs.mkdirSync(DIR, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const fails = [];
const ok = (cond, msg, extra) => {
  console.log((cond ? 'OK   ' : 'MAL  ') + msg + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''));
  if (!cond) fails.push(msg);
};

async function phone(query, { w = 844, h = 390, dpr = 1 } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  const cdp = await ctx.newCDPSession(p);
  await p.goto(URL + query);
  await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
  return { ctx, p, cdp, errs };
}
// toques de verdad (varios dedos): pts = [{x, y, id}]
const touch = (cdp, type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q) => ({ x: q.x, y: q.y, id: q.id ?? 0 })) });
const steps = (p, n) => p.evaluate((n) => { for (let i = 0; i < n; i++) __game.update(1 / 30); __game.render(); }, n);
const btn = (p, lay, i) => p.evaluate(([lay, i]) => { const o = __game.tactil.btns.find((q) => q.lay === lay && q.d.i === i); const r = o.el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, vis: getComputedStyle(o.el).display !== 'none' }; }, [lay, i]);
async function tap(cdp, pt, id = 5) {
  await touch(cdp, 'touchStart', [{ ...pt, id }]);
  await touch(cdp, 'touchEnd', []);
}

// ------------------------------------------------------------ jugando
{
  const { ctx, p, cdp, errs } = await phone('?dev=1&at=-84.6,0,-15.8&yaw=180');
  await p.evaluate(() => { window.__pause = true; __game.player.maxHp = __game.player.hp = 1e6; });
  await steps(p, 4);
  const st = await p.evaluate(() => {
    const T = __game.tactil, r = T.root;
    const vis = T.btns.filter((o) => getComputedStyle(o.el).display !== 'none');
    const rects = vis.map((o) => { const q = o.el.getBoundingClientRect(); return { i: o.d.i, x0: q.left, y0: q.top, x1: q.right, y1: q.bottom, cx: (q.left + q.right) / 2, cy: (q.top + q.bottom) / 2, r: q.width / 2 }; });
    let overlap = 0;
    for (let a = 0; a < rects.length; a++) for (let c = a + 1; c < rects.length; c++) if (Math.hypot(rects[a].cx - rects[c].cx, rects[a].cy - rects[c].cy) < rects[a].r + rects[c].r - 1) overlap++;
    const out = rects.filter((q) => q.x0 < 0 || q.y0 < 0 || q.x1 > innerWidth || q.y1 > innerHeight).length;
    return { shown: !r.classList.contains('off'), layout: r.dataset.l, movil: T.movil, n: vis.length, overlap, out, s: T.s, device: __game.input.device };
  });
  ok(st.shown && st.layout === 'juego', 'se ven los controles de juego', st);
  ok(st.overlap === 0 && st.out === 0, 'los botones no se pisan ni se salen de la pantalla', { overlap: st.overlap, out: st.out });
  await p.screenshot({ path: `${DIR}/juego.png` });

  // el stick: andar hacia delante
  const p0 = await p.evaluate(() => __game.player.pos.toArray());
  await touch(cdp, 'touchStart', [{ x: 140, y: 290, id: 1 }]);
  await touch(cdp, 'touchMove', [{ x: 140, y: 245, id: 1 }]);
  await steps(p, 30);
  const p1 = await p.evaluate(() => ({ pos: __game.player.pos.toArray(), ls: __game.input.ls, sprint: __game.input.down('sprint') }));
  const walked = Math.hypot(p1.pos[0] - p0[0], p1.pos[2] - p0[2]);
  ok(walked > 0.8 && !p1.sprint, 'el stick anda', { m: +walked.toFixed(2), ls: p1.ls });
  // más allá del aro: correr
  await touch(cdp, 'touchMove', [{ x: 140, y: 140, id: 1 }]);
  await steps(p, 2);
  const run = await p.evaluate(() => __game.input.down('sprint'));
  ok(run, 'llevado más allá del aro, corre (L3)');
  await touch(cdp, 'touchEnd', []);
  await steps(p, 2);
  ok(await p.evaluate(() => !__game.input.ls && !__game.input.down('sprint')), 'al soltar, el stick vuelve a cero');

  // la cámara: arrastrar a la derecha
  const y0 = await p.evaluate(() => __game.camRig.yaw);
  await touch(cdp, 'touchStart', [{ x: 500, y: 120, id: 2 }]);
  for (let k = 1; k <= 6; k++) {
    await touch(cdp, 'touchMove', [{ x: 500 + k * 20, y: 120, id: 2 }]);
    await steps(p, 1);
  }
  await touch(cdp, 'touchEnd', []);
  const y1 = await p.evaluate(() => __game.camRig.yaw);
  ok(Math.abs(y1 - y0) > 0.15, 'arrastrar gira la cámara', { giro: +(y1 - y0).toFixed(3) });

  // stick y cámara a la vez (dos dedos)
  await touch(cdp, 'touchStart', [{ x: 140, y: 290, id: 1 }]);
  await touch(cdp, 'touchStart', [{ x: 140, y: 290, id: 1 }, { x: 520, y: 140, id: 2 }]);
  await touch(cdp, 'touchMove', [{ x: 180, y: 290, id: 1 }, { x: 560, y: 140, id: 2 }]);
  await steps(p, 6);
  const two = await p.evaluate(() => ({ ls: __game.input.ls, stick: !!__game.tactil.stick, cam: !!__game.tactil.cam }));
  ok(two.stick && two.cam && two.ls && two.ls.x > 0.3, 'stick y cámara con dos dedos', two);
  await touch(cdp, 'touchEnd', []);
  await steps(p, 2);

  // atacar (RB): un toque
  const rb = await btn(p, 'juego', 5);
  await tap(cdp, rb);
  await steps(p, 2);
  const atk = await p.evaluate(() => ({ st: __game.player.state, atk: __game.player.atk && __game.player.atk.clip.name, m0: __game.input.keys.has('M0'), dev: __game.input.device }));
  ok(!!atk.atk, 'el botón de atacar ataca', atk);
  ok(!atk.m0 && atk.dev === 'pad', 'el toque no deja un clic de ratón ni cambia los avisos a teclado', atk);
  await steps(p, 40);
  // el clic de ratón que el navegador manda tras un toque (como iOS: toque
  // y, enseguida, el clic) no es un ataque
  await p.evaluate(() => (__game.player.atk = null));
  await touch(cdp, 'touchStart', [{ x: 600, y: 200, id: 7 }]);
  await touch(cdp, 'touchEnd', []);
  await p.mouse.click(600, 200);
  await steps(p, 2);
  const emu = await p.evaluate(() => ({ st: __game.player.state, atk: __game.player.atk && __game.player.atk.clip.name, m0: __game.input.keys.has('M0') }));
  ok(!emu.atk && emu.st !== 'attack' && !emu.m0, 'el clic emulado tras un toque no ataca', emu);
  await steps(p, 30);

  // bloquear (LB): manteniendo
  const lb = await btn(p, 'juego', 4);
  await touch(cdp, 'touchStart', [{ ...lb, id: 3 }]);
  await steps(p, 12);
  const blk = await p.evaluate(() => ({ st: __game.player.state, blocking: __game.player.blocking, down: __game.input.down('block') }));
  ok(blk.down && (blk.blocking || blk.st === 'block'), 'manteniendo el de bloquear, bloquea', blk);
  await touch(cdp, 'touchEnd', []);
  await steps(p, 12);
  ok(await p.evaluate(() => !__game.input.down('block')), 'al soltarlo, deja de bloquear');

  // esquivar (B)
  const bb = await btn(p, 'juego', 1);
  await tap(cdp, bb);
  await steps(p, 3);
  const dodge = await p.evaluate(() => ({ st: __game.player.state, atk: __game.player.atk && __game.player.atk.clip.name }));
  ok(/roll|dodge|backstep/i.test(dodge.st + ' ' + dodge.atk), 'el de esquivar esquiva', dodge);
  await steps(p, 40);

  // la pausa (Start) y su menú: la cruz y volver
  const start = await btn(p, 'juego', 9);
  await tap(cdp, start);
  await steps(p, 3);
  const pz = await p.evaluate(() => ({ modal: __game.ui.stack.map((s) => s.name), layout: __game.tactil.root.dataset.l }));
  ok(pz.modal.includes('pause') && pz.layout === 'menu', 'el de pausa abre la pausa y salen la cruz y los botones del menú', pz);
  await p.screenshot({ path: `${DIR}/menu.png` });
  const sel0 = await p.evaluate(() => __game.ui.top.data.sel ?? __game.ui.top.sel);
  const down = await btn(p, 'menu', 13);
  await tap(cdp, down);
  await steps(p, 3);
  const sel1 = await p.evaluate(() => __game.ui.top.data.sel ?? __game.ui.top.sel);
  ok(sel1 !== sel0, 'la cruz mueve la selección del menú', { sel0, sel1 });
  const back = await btn(p, 'menu', 1);
  await tap(cdp, back);
  await steps(p, 3);
  const after = await p.evaluate(() => ({ modal: __game.ui.stack.map((s) => s.name), layout: __game.tactil.root.dataset.l }));
  ok(!after.modal.length && after.layout === 'juego', 'volver (B) cierra la pausa', after);

  // el inventario (Y) y sus pestañas (LB, RB)
  const yb = await btn(p, 'juego', 3);
  await tap(cdp, yb);
  await steps(p, 3);
  const inv0 = await p.evaluate(() => ({ modal: __game.ui.stack.map((s) => s.name), tab: __game.ui.invTab }));
  const rbm = await btn(p, 'menu', 5);
  await tap(cdp, rbm);
  await steps(p, 3);
  const inv1 = await p.evaluate(() => ({ tab: __game.ui.invTab }));
  ok(inv0.modal.includes('inv') && inv1.tab !== inv0.tab, 'el inventario se abre y RB cambia de pestaña', { inv0, inv1 });
  await p.screenshot({ path: `${DIR}/inventario.png` });
  await tap(cdp, back);
  await steps(p, 3);

  // el aviso de usar: tocarlo es pulsar su botón
  const use = await p.evaluate(() => {
    const g = __game;
    const it = g.interact.list.find((i) => i.id === 'i_escudo') || g.interact.list.find((i) => !i.done && i.kind === 'item');
    if (!it) return null;
    const ix = it.ix ?? it.x, iz = it.iz ?? it.z;
    for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) {
      const x = ix + dx, z = iz + dz;
      g.player.spawn(x, g.world.col.groundHeight(x, z, 0.1, it.y + 1.5), z, Math.atan2(ix - x, iz - z));
      for (let k = 0; k < 4; k++) g.update(1 / 30);
      g.render();
      if (g.promptTarget && g.promptTarget.id === it.id) return { id: it.id };
    }
    return { id: it.id, nope: true };
  });
  if (use && !use.nope) {
    const pr = await p.evaluate(() => { const r = document.getElementById('prompt').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, show: document.getElementById('prompt').classList.contains('show') }; });
    await tap(cdp, pr);
    await steps(p, 6);
    const r = await p.evaluate((id) => ({ done: __game.interact.list.find((i) => i.id === id).done, modal: __game.ui.stack.map((s) => s.name) }), use.id);
    ok(pr.show && (r.done || r.modal.length > 0), 'tocar el aviso usa lo que se tiene delante', { id: use.id, ...r });
    await p.screenshot({ path: `${DIR}/aviso.png` });
    for (let k = 0; k < 3; k++) {
      await tap(cdp, await btn(p, 'menu', 0));
      await steps(p, 4);
    }
  } else ok(false, 'tocar el aviso: no se encontró nada que usar', use);

  // en vertical: el aviso de girar y la pausa
  await p.evaluate(() => __game.ui.closeAll && __game.ui.closeAll());
  await steps(p, 2);
  await p.setViewportSize({ width: 390, height: 844 });
  await steps(p, 3);
  const port = await p.evaluate(() => ({ girar: getComputedStyle(document.getElementById('girar')).display, modal: __game.ui.stack.map((s) => s.name) }));
  ok(port.girar === 'grid' && port.modal.includes('pause'), 'en vertical: aviso de girar el teléfono y la pausa', port);
  await p.screenshot({ path: `${DIR}/vertical.png` });
  await p.setViewportSize({ width: 844, height: 390 });
  await steps(p, 2);
  ok((await p.evaluate(() => getComputedStyle(document.getElementById('girar')).display)) === 'none', 'en horizontal, sin aviso');
  ok(!errs.length, 'sin errores en la página', errs.slice(0, 3));
  await ctx.close();
}

// ------------------------------------------------------------ el título
{
  const { ctx, p, cdp, errs } = await phone('');
  await p.waitForTimeout(500);
  const t0 = await p.evaluate(() => ({ press: document.getElementById('press').textContent, foot: document.querySelector('#title .foot').textContent, layout: __game.tactil.root.dataset.l, shown: !__game.tactil.root.classList.contains('off') }));
  ok(t0.press === 'Toca la pantalla' && t0.shown && t0.layout === 'menu', 'el título dice «Toca la pantalla» y salen los botones de menú', t0);
  await tap(cdp, { x: 422, y: 200 });
  await p.waitForTimeout(300);
  const t1 = await p.evaluate(() => ({ ready: __game.ui.top && __game.ui.top.data.ready }));
  ok(t1.ready, 'tocar la pantalla del título enseña su menú', t1);
  await p.screenshot({ path: `${DIR}/titulo.png` });
  ok(!errs.length, 'sin errores en la página (título)', errs.slice(0, 3));
  await ctx.close();
}

// ------------------------------------------------------------ a nado
{
  const { ctx, p, cdp, errs } = await phone('?dev=1');
  await p.evaluate(() => {
    window.__pause = true;
    const g = __game;
    g.player.maxHp = g.player.hp = 1e6;
    g.player.spawn(20, -30, -40, 0);
    for (let i = 0; i < 20; i++) g.update(1 / 30);
  });
  const s0 = await p.evaluate(() => ({ st: __game.player.state, y: __game.player.pos.y }));
  // zambullirse: mantener B
  const bb = await btn(p, 'juego', 1);
  await touch(cdp, 'touchStart', [{ ...bb, id: 4 }]);
  await steps(p, 45);
  const s1 = await p.evaluate(() => ({ st: __game.player.state, y: __game.player.pos.y, sub: __game.player.nadoS && __game.player.nadoS.sub }));
  await touch(cdp, 'touchEnd', []);
  ok(s0.st === 'swim' && s1.sub && s1.y < s0.y - 0.5, 'a nado: manteniendo B se zambulle', { s0, s1 });
  // subir: mantener A
  const aa = await btn(p, 'juego', 0);
  await touch(cdp, 'touchStart', [{ ...aa, id: 4 }]);
  await steps(p, 90);
  const s2 = await p.evaluate(() => ({ st: __game.player.state, y: __game.player.pos.y, sub: __game.player.nadoS && __game.player.nadoS.sub }));
  await touch(cdp, 'touchEnd', []);
  ok(s2.y > s1.y + 0.5, 'a nado: manteniendo A sube', { s1, s2 });
  ok(!errs.length, 'sin errores en la página (a nado)', errs.slice(0, 3));
  await ctx.close();
}

// ------------------------------------------------------------ partida nueva, con el dedo
{
  const { ctx, p, cdp, errs } = await phone('');
  await p.evaluate(() => (window.__pause = true));
  const run = (n) => steps(p, n);
  // «Toca la pantalla» y «Nueva partida» (A)
  await tap(cdp, { x: 422, y: 120 });
  await run(4);
  await tap(cdp, await btn(p, 'menu', 0));
  await run(6);
  const st0 = await p.evaluate(() => __game.state);
  // la introducción: mantener A para saltarla
  const aa = await btn(p, 'menu', 0);
  await touch(cdp, 'touchStart', [{ ...aa, id: 6 }]);
  await run(45);
  await touch(cdp, 'touchEnd', []);
  let st1 = null;
  for (let k = 0; k < 40 && st1 !== 'creador'; k++) {
    await run(15);
    st1 = await p.evaluate(() => __game.state);
  }
  ok(st0 === 'intro' && st1 === 'creador', 'nueva partida: la introducción se salta manteniendo A y sale el editor', { st0, st1 });
  await p.screenshot({ path: `${DIR}/creador.png` });
  // el editor: un cambio con la cruz, arriba (a «Despertar»), A, y A otra vez
  const before = await p.evaluate(() => JSON.stringify(__game.creador.a));
  await tap(cdp, await btn(p, 'menu', 13));
  await run(3);
  await tap(cdp, await btn(p, 'menu', 15));
  await run(3);
  const after = await p.evaluate(() => JSON.stringify(__game.creador.a));
  ok(before !== after, 'en el editor, la cruz cambia lo elegido');
  await tap(cdp, await btn(p, 'menu', 12));
  await run(3);
  await tap(cdp, await btn(p, 'menu', 12));
  await run(3);
  await tap(cdp, await btn(p, 'menu', 0));
  await run(4);
  await tap(cdp, await btn(p, 'menu', 0));
  let st2 = null;
  for (let k = 0; k < 60 && st2 !== 'play'; k++) {
    await run(15);
    st2 = await p.evaluate(() => __game.state);
  }
  await run(30);
  const fin = await p.evaluate(() => ({ st: __game.state, layout: __game.tactil.root.dataset.l, ps: __game.player.state, a: JSON.stringify(__game.player.aspecto || {}) }));
  ok(st2 === 'play' && fin.layout === 'juego', 'y «Despertar»: a jugar, con los controles de juego', fin);
  await p.screenshot({ path: `${DIR}/despertar.png` });
  ok(!errs.length, 'sin errores en la página (partida nueva)', errs.slice(0, 3));
  await ctx.close();
}

// ------------------------------------------------------------ en el ordenador
{
  const ctx = await b.newContext({ viewport: { width: 960, height: 540 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?dev=1');
  await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
  await p.evaluate(() => { window.__pause = true; for (let i = 0; i < 4; i++) __game.update(1 / 30); });
  const d = await p.evaluate(() => ({ off: __game.tactil.root.classList.contains('off'), movil: __game.tactil.movil, on: __game.input.touch.on, girar: getComputedStyle(document.getElementById('girar')).display }));
  ok(d.off && !d.movil && !d.on && d.girar === 'none', 'en el ordenador, sin pantalla táctil, no sale nada', d);
  ok(!errs.length, 'sin errores en la página (ordenador)', errs.slice(0, 3));
  await ctx.close();
}

await b.close();
console.log(fails.length ? `\n${fails.length} MAL` : '\ntodo bien');
process.exit(fails.length ? 1 : 0);
