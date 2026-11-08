// Las armas del principio y sus cualidades: el guardia caído del pasillo de
// las celdas (su escudo se le quita, la espada oxidada se le arranca y, al
// arrancarla, se levanta el de la celda del fondo; su cuerpo para el paso),
// la oxidada a la mitad que la de la guardia (golpes, pesado, golpe de
// gracia), las cualidades de cada arma (peso, dureza, crítico: lo que de
// verdad cambian), la ficha del inventario (las barras, la comparación con
// lo que se lleva y la descripción) y la espada de la guardia en la armería
// de la puerta de la fortaleza.
//   node tools/armas.mjs [capturas]     (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const shots = process.argv[2] === 'capturas';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
p.on('console', (m) => m.type() === 'error' && !/ERR_CERT|404/.test(m.text()) && logs.push('console.error ' + m.text()));
await p.goto('http://localhost:5199/?dev=1&at=-87.6,-5,-16.2&yaw=0');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
let fail = 0;
const check = (ok, what, info = '') => {
  if (!ok) fail++;
  console.log(`${ok ? 'OK ' : 'MAL'} ${what}${info !== '' ? '  ' + (typeof info === 'string' ? info : JSON.stringify(info)) : ''}`);
};

// ------------------------------------------------------------ el guardia caído
const G = await p.evaluate(async () => {
  window.__pause = true;
  const g = __game;
  g.input.enabledPointerLock = false;
  g.input.onPointerLockLost = null;
  // como al empezar la partida: sin nada encima
  g.newState();
  g.applyWorldState();
  const pl = g.player;
  pl.spawn(-87.6, -5, -16.2, 0);
  __sim(0.2);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const R = { start: { armed: pl.hasSword, shield: pl.hasShield } };
  const walk = (pts) => {
    for (const [x, z] of pts) {
      let t = 0;
      for (; t < 12; t += 1 / 30) {
        const dx = x - pl.pos.x,
          dz = z - pl.pos.z,
          d = Math.hypot(dx, dz);
        if (d < 0.2) break;
        pl.autoDir = { x: dx / d, z: dz / d, m: 0.6 };
        g.update(1 / 30);
      }
      pl.autoDir = null;
      if (t >= 12) return { stuck: [x, z], pos: [pl.pos.x, pl.pos.z].map((v) => +v.toFixed(2)) };
    }
    __sim(0.3);
    return { pos: [pl.pos.x, pl.pos.z].map((v) => +v.toFixed(2)) };
  };
  const face = (id) => {
    const it = g.interact.list.find((i) => i.id === id);
    pl.yaw = Math.atan2(it.x - pl.pos.x, it.z - pl.pos.z);
    __sim(0.15);
    return { prompt: g.promptTarget && g.promptTarget.id, label: g.promptTarget && g.interact.label(g.promptTarget) };
  };
  // coger: el arma clavada se ve salir antes de que se abra la ventana
  const take = async (id) => {
    __sim(0.05, [], ['KeyE']);
    const it = g.interact.list.find((i) => i.id === id);
    let rise = 0,
      before = null;
    // (el juego, al paso del reloj: un fotograma de 1/30 cada 1/30 s)
    for (let k = 0; k < 18; k++) {
      await wait(33);
      g.update(1 / 30);
      if (!g.ui.modal) rise = Math.max(rise, it.mesh.position.y);
      else if (before === null) before = rise;
    }
    const modal = g.ui.stack.map((s) => s.name);
    const name = document.getElementById('item-name').textContent;
    await wait(400);
    for (let k = 0; k < 4 && g.ui.modal; k++) {
      __sim(0.5);
      __sim(0.1, [], ['KeyE']);
    }
    return { modal, name, rise: +rise.toFixed(2), gone: !it.obj.visible };
  };
  R.salida = walk([[-87.9, -14.6], [-87.9, -12.6], [-86.9, -11.6]]);
  R.verEscudo = face('i_escudo');
  R.escudo = await take('i_escudo');
  R.conEscudo = { inv: g.inventory.has('escudo'), alBrazo: pl.hasShield };
  // el cuerpo, de través del pasillo: no se le atraviesa
  R.cruzar = walk([[-85.4, -11.2], [-85.4, -12.9]]);
  R.rodear = walk([[-84.0, -11.4], [-84.3, -12.4]]);
  R.verEspada = face('i_oxidada');
  const e = g.enemies.find((x) => x.id === 'e_carcel1');
  R.antes = { aware: e.aware };
  R.espada = await take('i_oxidada');
  R.conEspada = { inv: g.inventory.has('oxidada'), weapon: pl.weaponId, armed: pl.hasSword };
  await wait(1500);
  __sim(0.4);
  R.despues = { aware: e.aware, state: e.state };
  R.pistas = Object.keys(g.hintsShown);
  return R;
});
check(!G.start.armed && !G.start.shield, 'al empezar, ni arma ni escudo', G.start);
check(!G.salida.stuck, 'de la celda al pasillo', G.salida);
check(G.verEscudo.prompt === 'i_escudo' && G.verEscudo.label === 'Quitarle el escudo', 'el escudo del guardia se ofrece', G.verEscudo);
check(G.escudo.modal.includes('item') && G.escudo.name === 'Escudo de madera' && G.conEscudo.inv && G.conEscudo.alBrazo, 'el escudo de madera, al brazo', { ...G.escudo, ...G.conEscudo });
check(!!G.cruzar.stuck, 'el cuerpo para el paso', G.cruzar);
check(G.verEspada.prompt === 'i_oxidada' && G.verEspada.label === 'Arrancar la espada', 'la espada clavada se ofrece', G.verEspada);
check(G.espada.rise > 0.3 && G.espada.gone && G.espada.name === 'Espada oxidada', 'la espada sale del cuerpo antes de la ventana', G.espada);
check(G.conEspada.inv && G.conEspada.weapon === 'oxidada' && G.conEspada.armed, 'la oxidada, en la mano', G.conEspada);
check(!G.antes.aware && G.despues.aware, 'al arrancarla se levanta el de la celda del fondo', { antes: G.antes, despues: G.despues });
check(G.pistas.includes('sword') && G.pistas.includes('shield'), 'las pistas de pelear y del escudo', G.pistas);

// ------------------------------------------------------------ la oxidada, a la mitad
const D = await p.evaluate(async () => {
  const { WEAPONS, weaponSet, weaponSheet, durezaK } = await import('/src/entities/weapons.js');
  const g = __game;
  const rig = g.player.rig;
  const sum = (S) => ({ light: S.light.map((a) => a.dmg), heavy: S.heavy.map((a) => a.dmg), run: S.run.dmg, roll: S.roll.dmg, rip: S.riposte.dmg, range: S.light.map((a) => a.range), st: S.light.map((a) => a.st) });
  const out = { ox: sum(weaponSet(WEAPONS.oxidada, rig)), es: sum(weaponSet(WEAPONS.espada, rig)), so: sum(weaponSet(WEAPONS.solingen, rig)) };
  out.sheets = {};
  out.k = {};
  for (const id of ['facon', 'hacha', 'lanza', 'oxidada', 'espada', 'solingen', 'katana', 'ballesta']) {
    const S = weaponSheet(WEAPONS[id], rig, 1);
    out.sheets[id] = Object.fromEntries(Object.entries(S).map(([k, v]) => [k, typeof v === 'number' ? +v.toFixed(2) : v]));
    out.k[id] = +durezaK(WEAPONS[id]).toFixed(3);
  }
  // la ventana del parry, con cada una (sin objeto bendito)
  const P = g.player;
  out.win = {};
  for (const id of ['oxidada', 'espada', 'solingen', 'hacha', 'katana']) {
    P.equipWeapon(id);
    P.setEquipment(true, true);
    P.parryPress = [];
    P.startParryWin(null);
    out.win[id] = +P.parryWin.toFixed(3);
    P.parryWin = 0;
  }
  // el paso de los golpes: la oxidada, un 6 % más deprisa
  P.equipWeapon('oxidada');
  P.state = 'free';
  P.st = P.maxSt;
  P.startAttack(P.set.light[0], 0);
  out.spdOx = P.atkSpd;
  P.equipWeapon('espada');
  P.state = 'free';
  P.startAttack(P.set.light[0], 0);
  out.spdEs = P.atkSpd;
  P.state = 'free';
  P.anim.stop(0);
  return out;
});
const half = (a, b) => a.every((v, i) => Math.abs(v - b[i] / 2) <= 0.5);
check(half(D.ox.light, D.es.light) && half(D.ox.heavy, D.es.heavy) && Math.abs(D.ox.run - D.es.run / 2) <= 0.5 && Math.abs(D.ox.rip - D.es.rip / 2) <= 0.5, 'la oxidada hace la mitad que la de la guardia (ligeros, pesado, carrera, gracia)', { oxidada: D.ox, guardia: D.es });
check(D.ox.range.every((r, i) => r < D.es.range[i]) && D.so.range.every((r, i) => r > D.es.range[i]), 'la hoja: la oxidada alcanza menos, la de Solingen más', { ox: D.ox.range, es: D.es.range, so: D.so.range });
check(D.ox.st.every((s, i) => s < D.es.st[i]), 'la oxidada cansa menos', { ox: D.ox.st, es: D.es.st });
check(D.k.espada === 1 && D.k.oxidada < 1 && D.k.hacha > 1, 'la dureza: la de la guardia como siempre, la oxidada ataja peor, el hacha mejor', D.k);
check(Math.abs(D.win.espada - 0.2) < 1e-3 && D.win.oxidada < D.win.espada && D.win.solingen > D.win.espada, 'la ventana del parry según la dureza', D.win);
check(Math.abs(D.spdOx / D.spdEs - 1.06) < 1e-3, 'la oxidada golpea un 6 % más deprisa', { oxidada: D.spdOx, guardia: D.spdEs });
const S = D.sheets;
check(S.oxidada.filo * 2 - S.espada.filo <= 1 && S.facon.vel > S.espada.vel && S.hacha.vel < S.espada.vel && S.lanza.alcance > S.espada.alcance && S.ballesta.alcance > 10, 'la ficha de cada arma sale de sus golpes', S);

// ------------------------------------------------------------ la ficha en el inventario
const U = await p.evaluate(async () => {
  const g = __game;
  for (const k of ['espada', 'solingen', 'hacha', 'ballesta']) if (!g.inventory.has(k)) g.inventory.add(k);
  g.player.equipWeapon('oxidada');
  g.player.setEquipment(true, true);
  const u = g.ui;
  u.open('inv');
  u.invSel = 0;
  u.invAction('confirm');
  u.invSel = u.pickOptions().indexOf('espada');
  u.renderInv();
  const det = document.getElementById('inv-detail');
  const rows = [...det.querySelectorAll('.sheet .lb')].map((x) => x.textContent);
  const good = det.querySelectorAll('.sheet .d.good').length,
    bad = det.querySelectorAll('.sheet .d.bad').length;
  const vs = det.querySelector('.vs') && det.querySelector('.vs').textContent;
  const hint = document.getElementById('inv-hint').textContent;
  u.invAction('ficha');
  const desc = !det.querySelector('.sheet') && det.textContent.includes('armería');
  u.invAction('ficha');
  const back = !!det.querySelector('.sheet');
  // el escudo, en su ranura
  u.invAction('back');
  u.invSel = 1;
  u.renderInv();
  const escudo = [...det.querySelectorAll('.sheet .lb')].map((x) => x.textContent);
  // y en los Objetos, el hacha frente a la oxidada
  u.invSwitch(1);
  u.invSel = u.itemEntries().findIndex((e) => e.id === 'hacha');
  u.renderInv();
  const objetos = { vs: det.querySelector('.vs') && det.querySelector('.vs').textContent, rows: det.querySelectorAll('.sheet .lb').length };
  // la ficha cabe en el panel
  const pr = document.querySelector('#inv .panel').getBoundingClientRect(),
    dr = det.getBoundingClientRect();
  const cabe = dr.right <= pr.right + 1 && dr.bottom <= pr.bottom + 1;
  u.closeAll();
  return { rows, good, bad, vs, hint, desc, back, escudo, objetos, cabe };
});
check(U.rows.length === 9 && U.rows.includes('Peso') && U.rows.includes('Dureza') && U.rows.includes('Crítico'), 'la ficha de un arma: nueve barras', U.rows);
check(U.good >= 5 && U.bad >= 1 && /Espada oxidada/.test(U.vs), 'la espada de la guardia, comparada con la oxidada que se lleva', { good: U.good, bad: U.bad, vs: U.vs });
check(/Descripción/.test(U.hint) && U.desc && U.back, 'la tecla de la ficha pasa a la descripción y vuelve', { hint: U.hint });
check(U.escudo.join() === 'Estabilidad,Absorción,Peso', 'la ficha del escudo', U.escudo);
check(/Espada oxidada/.test(U.objetos.vs || '') && U.objetos.rows === 9, 'en los Objetos, comparada con lo que se lleva', U.objetos);
check(U.cabe, 'la ficha cabe en el panel (1280×720)');

// ------------------------------------------------------------ la armería de la puerta
const A = await p.evaluate(async () => {
  const g = __game;
  const pl = g.player;
  const it = g.interact.list.find((i) => i.id === 'i_espada');
  if (g.inventory.has('espada')) g.inventory.add('espada', -1);
  pl.spawn(-86.0, 5.5, -37.4, 0);
  __sim(0.3);
  for (let t = 0; t < 6; t += 1 / 30) {
    const dx = -84.4 - pl.pos.x,
      dz = -35.9 - pl.pos.z,
      d = Math.hypot(dx, dz);
    if (d < 0.2) break;
    pl.autoDir = { x: dx / d, z: dz / d, m: 0.6 };
    g.update(1 / 30);
  }
  pl.autoDir = null;
  pl.yaw = Math.atan2(it.x - pl.pos.x, it.z - pl.pos.z);
  __sim(0.2);
  const prompt = g.promptTarget && g.promptTarget.id;
  __sim(0.1, [], ['KeyE']);
  await new Promise((r) => setTimeout(r, 500));
  const name = document.getElementById('item-name').textContent;
  g.ui.closeAll();
  return { prompt, name, weapon: pl.weaponId, at: [it.x, it.y, it.z].map((v) => +v.toFixed(2)) };
});
check(A.prompt === 'i_espada' && A.name === 'Espada de la guardia' && A.weapon === 'espada', 'la espada de la guardia, en la armería de la puerta de la fortaleza', A);

if (shots) {
  await p.evaluate(() => {
    const g = __game;
    g.newState();
    g.applyWorldState();
    g.ui.showHud(false);
    g.enemies.forEach((e) => {
      e.obj.visible = false;
      e.shadow.visible = false;
    });
    g.player.obj.visible = false;
  });
  for (const [name, c, t] of [
    ['guardia', [-85.6, -3.6, -10.9], [-85.9, -4.85, -11.9]],
    ['guardia_espada', [-86.6, -4.0, -12.9], [-85.4, -4.6, -12.2]],
    ['armeria', [-82.9, 6.6, -36.0], [-84.4, 6.0, -34.6]],
  ]) {
    await p.evaluate(([c, t]) => {
      const g = __game,
        T = g.THREE;
      g.player.body.pos.set(c[0], c[1] - 1.5, c[2]);
      g.camRig.override = { pos: new T.Vector3(...c), look: new T.Vector3(...t), speed: 1000 };
      for (let k = 0; k < 4; k++) g.update(1 / 30);
      g.camera.position.set(...c);
      g.camera.lookAt(...t);
      g.render();
    }, [c, t]);
    await p.screenshot({ path: `tools/shots/armas_${name}.png` });
  }
}
console.log(logs.join('\n') || 'sin errores');
console.log(fail ? `${fail} MAL` : 'todo bien');
await b.close();
