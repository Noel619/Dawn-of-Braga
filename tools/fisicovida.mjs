// La vida del Físico es una sola: lo que se le hace en la caza se queda (al
// volver a salir no se cura; al caer tú, tampoco), con la mitad o menos se
// encierra en su casa y ya no sale, y la pelea de su quirófano empieza con la
// vida que le quedó (y en el tiempo que le toque).
//   node tools/fisicovida.mjs        (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 480, height: 270 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
await p.goto('http://localhost:' + (process.env.PORT || 5199) + '/?dev=1&items=espada,escudo');
await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
const r = await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  g.input.enabledPointerLock = false;
  g.ui.closeAll();
  g.state = 'play';
  const F = g.fisico,
    e = F.e;
  const out = [];
  const sim = (s) => {
    for (let t = 0; t < s; t += 1 / 30) g.update(1 / 30);
  };
  const est = (k) => out.push({ k, modo: F.modo, hp: Math.round(e.hp), vida: g.flags['fisico:vida'] ?? null, encerrado: !!g.flags['fisico:encerrado'], visible: e.obj.visible, barra: !!(e.D && e.D.barra), fase: e.data.fase ?? null });
  for (const k of ['fisico:intro', 'fisico:calleja', 'fisico:viuda', 'fisico:caza', 'door:d_porton']) g.flags[k] = true;
  g.enemies.forEach((x) => {
    if (!x.boss) {
      x.dead = true;
      x.state = 'dead';
      x.obj.visible = false;
    }
  });
  // (el jugador, en la plazuela; él, cerca, cazándole)
  const pl = g.player;
  const PZ = window.__fisicoPrueba || { x: 41.5, z: 46.5 };
  pl.spawn(PZ.x, 0, PZ.z, Math.PI / 2);
  g.dev.god = true;
  // (aquí no se le deja dormirte: la camilla es otra prueba)
  F.captura = () => {};
  sim(0.3);
  const sale = () => {
    F.show(PZ.x + 3, PZ.z, -Math.PI / 2);
    F.modo = 'caza';
    e.aware = true;
    e.state = 'chase';
    e.stT = 0;
    sim(0.2);
  };
  const pega = (dmg) => {
    const r = e.takeHit(dmg, 10, pl.pos.x, pl.pos.z, false);
    sim(0.05);
    return r;
  };
  est('al principio');
  // 1) le das un 15 %: no se va; la barra se ve
  sale();
  pega(144);
  est('tras un 15 %');
  // 2) otro 10 %: pasa del 20 % de esta salida, se retira (y no se cura)
  pega(96);
  sim(0.5);
  est('tras otro 10 %: se retira');
  sim(8);
  est('ya se ha ido');
  // 3) vuelve a salir: con la vida que le quedó
  F.fuera(0.1);
  sale();
  est('vuelve a salir');
  // 4) caes tú: la vida, igual
  F.onRespawn();
  for (const x of g.enemies) if (!g.bossGone(x)) x.reset();
  sale();
  est('tras caer tú');
  // 5) un golpe de gracia enorme en la calle: no baja de un cuarto; se encierra
  e.takeRiposte(900, pl.pos.x, pl.pos.z);
  sim(0.2);
  est('golpe de gracia de 900');
  sim(10);
  est('encerrado');
  // 6) ya no sale aunque suene algo
  F.alarma(PZ.x, 0, PZ.z, 'cepo');
  sim(5);
  est('tras un cepo: no sale');
  // 7) la pelea: con la vida que le quedó, y en su tiempo
  const QX = window.__quirofano || { x: 55.5, z: 37.8 };
  pl.spawn(QX.x, 0, QX.z, 0);
  sim(0.2);
  est('entras en el quirófano');
  sim(6);
  est('la pelea, 6 s después');
  return out;
});
for (const o of r) console.log(JSON.stringify(o));
if (logs.length) console.log(logs.join('\n'));
await b.close();
