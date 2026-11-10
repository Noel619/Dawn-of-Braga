// Prueba de las armas dentro del juego: para cada una (también la maza y el
// martillo de guerra), combo ligero completo,
// pesado (sin cargar y cargado), ataque en carrera, ataque tras la voltereta,
// bloqueo, curación y (lanza) estocada tras el escudo, contra un enemigo real
// inmóvil. La ballesta, aparte: montarla, tirar (el virote le da), que se
// vuelva a montar sola gastando un virote, el culatazo, el bloqueo y beber.
// Comprueba que los golpes conectan, que el jugador vuelve a quedar libre y
// que no hay errores ni NaN.
//   node tools/weapontest.mjs [arma]        (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const only = process.argv[2] || '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 480, height: 270 } });
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
await p.goto('http://localhost:5199/?dev=1&items=espada,escudo,hacha,lanza,oxidada,solingen,ballesta,maza,martillo_guerra&at=50,0,0&yaw=0');
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const res = await p.evaluate((only) => {
  window.__pause = true;
  const g = __game;
  g.input.enabledPointerLock = false;
  g.input.onPointerLockLost = null;
  g.ui.closeAll();
  const P = g.player;
  // el jugador no recibe daño durante la prueba (nada interrumpe los golpes)
  P.receiveHit = () => 'none';
  // un enemigo común como muñeco: inmóvil, sin morir; los demás, fuera
  const dummy = g.enemies.find((e) => !e.boss && e.T.height < 2.3);
  for (const e of g.enemies)
    if (e !== dummy) {
      e.dead = true;
      e.obj.visible = false;
      if (e.shadow) e.shadow.visible = false;
    }
  dummy.update = () => {};
  let hits = 0;
  const take = dummy.takeHit.bind(dummy);
  dummy.takeHit = (...a) => {
    hits++;
    const r = take(...a);
    dummy.hp = 9999;
    dummy.dead = false;
    return r;
  };
  const X = 50,
    Z = 0;
  const place = (dist = 1.7) => {
    P.spawn(X, 0, Z, 0);
    P.hp = P.maxHp;
    P.st = P.maxSt;
    P.state = 'free';
    P.flasks = Math.max(P.flasks, 1);
    dummy.reset();
    dummy.hp = 9999;
    dummy.pos.set(X, 0, Z + dist);
    dummy.obj.position.copy(dummy.pos);
    dummy.yaw = Math.PI;
    dummy.aware = true;
    dummy.obj.visible = true;
    g.camRig.snapTo(P);
    // (la lista de enemigos activos se rehace con el jugador ya colocado)
    g._actT = 0;
    for (let k = 0; k < 6; k++) g.update(1 / 30);
  };
  const sim = (sec, hold = [], tap = []) => __sim(sec, hold, tap);
  // entrada a mano: teclas que se mantienen entre pasos
  const inp = g.input;
  const press = (k) => (inp.keys.add(k), inp.kPressed.add(k));
  const release = (k) => (inp.keys.delete(k), inp.kReleased.add(k));
  const step = (sec) => {
    for (let t = 0; t < sec - 1e-6; t += 1 / 30) g.update(1 / 30);
  };
  const tap = (k) => (press(k), g.update(1 / 30), release(k));
  const finite = () => isFinite(P.pos.x) && isFinite(P.pos.y) && isFinite(P.pos.z);
  const out = {};
  for (const id of ['hacha', 'martillo_guerra', 'lanza', 'oxidada', 'maza', 'espada', 'solingen']) {
    if (only && id !== only) continue;
    P.equipWeapon(id);
    const S = P.set;
    const r = {};
    // combo ligero: cada golpe se pide mientras dura el anterior
    place();
    hits = 0;
    const seen = [];
    for (let i = 0; i < S.light.length; i++) {
      sim(0.05, [], ['M0']);
      seen.push(P.atk && P.atk.clip.name);
      sim(Math.max(0.12, (S.light[i].cancel || 0.4) - 0.05));
    }
    sim(1.4);
    r.combo = { hits, of: S.light.length, clips: seen.join('>'), free: P.state === 'free' };
    // pesado sin cargar y cargado
    place();
    hits = 0;
    sim(0.1, ['KeyF']);
    sim(1.8);
    r.heavy = { hits, free: P.state === 'free' };
    place();
    hits = 0;
    let maxMul = 1;
    const h = S.heavy[0];
    if (h.charge) {
      press('KeyF');
      for (let k = 0; k < 45; k++) {
        g.update(1 / 30);
        maxMul = Math.max(maxMul, P.atkMul || 1);
      }
      release('KeyF');
      for (let k = 0; k < 20; k++) {
        g.update(1 / 30);
        maxMul = Math.max(maxMul, P.atkMul || 1);
      }
    }
    sim(2.0);
    r.charged = { hits, charge: !!h.charge, mul: +maxMul.toFixed(2), free: P.state === 'free' };
    // en carrera: esprinta hacia el muñeco y golpea
    place(7.5);
    hits = 0;
    press('KeyW');
    press('ShiftLeft');
    step(0.8);
    tap('M0');
    const runClip = P.atk && P.atk.clip.name;
    release('KeyW');
    release('ShiftLeft');
    sim(1.6);
    r.run = { hits, clip: runClip, free: P.state === 'free' };
    // tras la voltereta hacia delante
    place(5.4);
    hits = 0;
    // (la voltereta sale al soltar el botón, en la dirección que se pulsa)
    press('KeyW');
    step(0.1);
    tap('Space');
    step(0.07);
    release('KeyW');
    step(0.33);
    tap('M0');
    step(0.12);
    const rollClip = P.atk && P.atk.clip.name;
    sim(1.6);
    r.roll = { hits, clip: rollClip, free: P.state === 'free' };
    // bloqueo (se mira mientras se mantiene pulsado)
    place();
    inp.keys.add('M2');
    inp.kPressed.add('M2');
    for (let k = 0; k < 12; k++) g.update(1 / 30);
    r.block = { blocking: !!P.blocking, blockW: +(P.blockW || 0).toFixed(2), canBlock: P.canBlock() };
    // estocada tras el escudo (lanza), sin soltar el bloqueo
    if (S.guard) {
      hits = 0;
      inp.keys.add('M0');
      inp.kPressed.add('M0');
      g.update(1 / 30);
      inp.keys.delete('M0');
      inp.kReleased.add('M0');
      const gClip = P.atk && P.atk.clip.name;
      let still = true;
      for (let k = 0; k < 24; k++) {
        g.update(1 / 30);
        if (P.state === 'attack' && !P.blocking) still = false;
      }
      r.guardThrust = { hits, clip: gClip, blockingDuring: still };
    }
    inp.keys.delete('M2');
    inp.kReleased.add('M2');
    sim(0.8);
    // curación (las armas a dos manos sueltan la izquierda para beber)
    place();
    const hp0 = (P.hp = P.maxHp * 0.5);
    sim(0.05, [], ['KeyR']);
    sim(1.6);
    r.heal = { healed: P.hp > hp0, free: P.state === 'free' };
    r.finite = finite();
    out[id] = r;
  }
  // la ballesta
  if (!only || only === 'ballesta') {
    P.equipWeapon('ballesta');
    P.xbowLoaded = false;
    const inv = g.inventory;
    const n0 = 4;
    inv.add('virote', n0 - inv.count('virote'));
    const r = {};
    // sin montar: el primer «golpe» la monta (gasta un virote)
    place(7);
    hits = 0;
    sim(0.05, [], ['M0']);
    const first = P.atk && P.atk.clip.name;
    sim(2.2);
    r.span = { clip: first, loaded: !!P.xbowLoaded, bolts: inv.count('virote') };
    // tira: el virote le da y se vuelve a montar sola (otro virote)
    sim(0.05, [], ['M0']);
    const shotClip = P.atk && P.atk.clip.name;
    sim(0.6);
    const hitShot = hits;
    sim(2.6);
    r.shot = { clip: shotClip, hits: hitShot, reloaded: !!P.xbowLoaded, bolts: inv.count('virote'), free: P.state === 'free' };
    // el culatazo, de cerca
    place(1.6);
    hits = 0;
    sim(0.1, ['KeyF']);
    sim(1.4);
    r.bash = { hits, free: P.state === 'free' };
    // bloqueo y beber
    place();
    inp.keys.add('M2');
    inp.kPressed.add('M2');
    for (let k = 0; k < 12; k++) g.update(1 / 30);
    r.block = { blocking: !!P.blocking, canBlock: P.canBlock() };
    inp.keys.delete('M2');
    inp.kReleased.add('M2');
    sim(0.8);
    place();
    const hp0 = (P.hp = P.maxHp * 0.5);
    sim(0.05, [], ['KeyR']);
    sim(1.6);
    r.heal = { healed: P.hp > hp0, free: P.state === 'free' };
    r.finite = finite();
    out.ballesta = r;
  }
  return out;
}, only);
for (const [id, r] of Object.entries(res)) console.log(id.padEnd(7), JSON.stringify(r));
console.log(errs.slice(0, 10).join('\n') || 'sin errores');
await b.close();
