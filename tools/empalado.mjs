// La pelea con el Empalado, sin transformarse: un jugador robot se acerca,
// golpea, rueda a veces y se aparta de vez en cuando (y más a menudo cuando
// ya ha perdido el yelmo, para que salte), y se registra todo lo raro: él
// fuera de la arena, flotando o con NaN; la cabeza del ariete hundida en el
// suelo; los golpes que lanza, los que dan y cuánto dura cada estado. Pasa
// si salen todos sus golpes y no hay nada raro ni errores.
//   node tools/empalado.mjs [segundos] [capturas cada N] [prefijo]
//   (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const secs = +(process.argv[2] || 110);
const every = +(process.argv[3] || 0);
const pre = process.argv[4] || 'if';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 5).join(' | ')));
await p.goto('http://localhost:5199/?dev=1&items=espada,escudo&at=74,9,-52');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  g.ui.closeAll();
  g.input.enabledPointerLock = false;
  const P = g.player;
  P.maxHp = P.hp = 5000;
  g.beastTransform = null; // (sin transformarse: toda la pelea)
  const fog = g.interact.list.find((i) => i.id === 'f_impaled');
  g.enterFog(fog);
  const E = g.bosses.impaled;
  // (mucha vida, para que dure toda la prueba; las fases, por tiempo: a los
  // 25, 50 y 75 s, la vida justo bajo cada umbral en que se le cae armadura)
  E.maxHp = E.hp = 6000;
  const fases = [
    [25, 0.79],
    [50, 0.61],
    [75, 0.44],
  ];
  const W = { atk: {}, hits: 0, dmg: 0, states: {}, maxState: {}, out: [], ramLow: [], ramWall: [], yOff: [], stuck: 0, nan: 0, lastState: null, stateT: 0, log: [] };
  window.__W = W;
  let hp0 = P.hp,
    rollCD = 0,
    atkCD = 0;
  const col = g.world.col;
  window.__step = (n) => {
    const inp = g.input;
    for (let k = 0; k < n; k++) {
      inp.keys.clear();
      const dx = E.pos.x - P.pos.x,
        dz = E.pos.z - P.pos.z,
        d = Math.hypot(dx, dz);
      // el bot: si él empieza un golpe y estás cerca, rueda (a veces);
      // si no, acércate y golpea
      rollCD -= 1 / 60;
      atkCD -= 1 / 60;
      if (!P.dead && g.state === 'play') {
        g.lockTarget = E;
        // (de vez en cuando se aparta, para que use los golpes de lejos; sin
        // yelmo, más: el salto con mazazo es de media distancia)
        const away = (E.data.stage || 0) >= 2 ? g.time % 7 > 3.5 : g.time % 9 > 6.5;
        if (away && E.state !== 'attack') {
          P.autoDir = { x: -dx / d, z: -dz / d, m: 1 };
        } else if (E.state === 'attack' && E.stT < 0.5 && d < 5 && rollCD <= 0 && Math.random() < 0.6) {
          inp.keys.add('Space');
          inp.kPressed.add('Space');
          rollCD = 1.2;
        } else if (d > 2.6) {
          P.autoDir = { x: dx / d, z: dz / d, m: 1 };
        } else {
          P.autoDir = null;
          if (atkCD <= 0) {
            inp.keys.add('M0');
            inp.kPressed.add('M0');
            atkCD = 0.5;
          }
        }
      }
      g.update(1 / 60);
      for (const f of fases) if (!f.done && g.time > f[0]) ((f.done = true), (E.hp = Math.min(E.hp, E.maxHp * f[1])));
      // registro
      if (P.hp < hp0) {
        W.hits++;
        W.dmg += hp0 - P.hp;
        let near = '';
        for (const o of g.enemies) {
          if (o === E || o.dead) continue;
          const dd = Math.hypot(o.pos.x - P.pos.x, o.pos.z - P.pos.z);
          if (dd < 6) near += ` ${o.type}/${o.state}@${dd.toFixed(1)}`;
        }
        W.log.push(`t${g.time.toFixed(1)} golpe ${E.atk ? E.atk.name : E.state}@${E.stT.toFixed(2)} -${Math.round(hp0 - P.hp)} d=${d.toFixed(1)}${near}`);
      }
      hp0 = P.hp;
      if (E.state === 'attack' && E.atk && E.stT < 1 / 50) W.atk[E.atk.name] = (W.atk[E.atk.name] || 0) + 1;
      if (E.state !== W.lastState) {
        W.lastState = E.state;
        W.stateT = 0;
      }
      W.stateT += 1 / 60;
      W.maxState[E.state] = Math.max(W.maxState[E.state] || 0, +W.stateT.toFixed(1));
      if (!isFinite(E.pos.x + E.pos.y + E.pos.z)) W.nan++;
      if (E.pos.x < 62.3 || E.pos.x > 79.7 || E.pos.z < -67.7 || E.pos.z > -56.3) W.out.length < 20 && W.out.push([+E.pos.x.toFixed(2), +E.pos.z.toFixed(2), E.state, E.atk && E.atk.name]);
      const gy = col.groundHeight(E.pos.x, E.pos.z, 0.3, E.pos.y + 1);
      if (E.body.grounded && Math.abs(E.pos.y - gy) > 0.15 && W.yOff.length < 20) W.yOff.push([+E.pos.y.toFixed(2), +gy.toFixed(2), E.state]);
      // la cabeza del ariete: ¿bajo el suelo o dentro de un muro?
      const r = E.rig.worldPos('weapon', new g.THREE.Vector3(), new g.THREE.Vector3(0, 0, 2.45));
      const rg = col.groundHeight(r.x, r.z, 0.05, r.y + 0.6);
      if (r.y < rg - 0.25 && W.ramLow.length < 30) W.ramLow.push([+(r.y - rg).toFixed(2), E.state, E.atk && E.atk.name, +E.stT.toFixed(2)]);
      if (P.dead) {
        for (let j = 0; j < 90; j++) g.update(1 / 60);
        g.respawn();
        W.log.push('muere');
      }
    }
    return { t: +g.time.toFixed(1), st: E.state, atk: E.atk && E.atk.name, hp: Math.round(E.hp), php: Math.round(P.hp), e: E.pos.toArray().map((v) => +v.toFixed(2)), p: P.pos.toArray().map((v) => +v.toFixed(2)), stage: E.data.stage || 0 };
  };
});
const info = [];
for (let i = 0; i < secs * 60; i += 30) {
  const r = await p.evaluate(() => window.__step(30));
  info.push(r);
  if (every && (i / 30) % every === 0) {
    await p.evaluate(() => {
      const g = __game,
        E = g.bosses.impaled,
        P = g.player;
      g.render();
    });
    await p.screenshot({ path: `tools/shots/${pre}_${String(i / 30).padStart(3, '0')}.png` });
  }
}
const W = await p.evaluate(() => window.__W);
// (salen al azar: se piden los nuevos o cambiados —el arietazo, la embestida
// con el ariete y el salto, que sólo hace sin yelmo y a media distancia— y al
// menos seis de los ocho)
const ALL = ['slam', 'sweep', 'combo', 'stomp', 'jab', 'thrust', 'charge', 'leap'];
const seen = ALL.filter((k) => W.atk[k]);
const missing = ['thrust', 'charge', 'leap'].filter((k) => !W.atk[k]).concat(seen.length < 6 ? ['(sólo ' + seen.length + ' de 8)'] : []);
const low = W.ramLow.filter((r) => r[1] !== 'dead');
for (const r of info.filter((_, k) => k % 8 === 0)) console.log(JSON.stringify(r));
console.log('ataques', JSON.stringify(W.atk));
console.log('golpes', W.hits, 'daño', Math.round(W.dmg));
console.log('estados (máx s)', JSON.stringify(W.maxState));
console.log('fuera', JSON.stringify(W.out));
console.log('altura', JSON.stringify(W.yOff));
console.log('ariete bajo el suelo', JSON.stringify(W.ramLow));
console.log('nan', W.nan);
console.log(W.log.slice(0, 40).join('\n'));
console.log(errs.slice(0, 5).join('\n'));
const ok = !missing.length && !W.out.length && !W.yOff.length && !low.length && !W.nan && !errs.length;
console.log(`${ok ? 'OK ' : 'MAL'} golpes que no salen: ${missing.join(', ') || 'ninguno'}; ariete bajo el suelo: ${low.length}; fuera: ${W.out.length}; flotando: ${W.yOff.length}; NaN: ${W.nan}`);
await b.close();
process.exit(ok ? 0 : 1);
