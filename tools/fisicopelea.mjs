// Simula la pelea con el Físico en la sala grande de su casa, con un
// jugador de prueba (en el motor de verdad, a 30 fotogramas por segundo), y
// resume lo que pasa: cuánto dura, qué golpes da él y cuántos entran, los
// tiempos (la máscara, el brasero), los Coronados que llama, lo que arde, las
// veces que te duerme o te agarra, el daño de cada uno y por dónde se mueve.
//   node tools/fisicopelea.mjs [segundos] [estilo] [vida] [fotos]
//   estilos: agresivo (combos de tres, rueda al ver venir un golpe), cauto
//   (espera, rueda y castiga después de cada golpe suyo), quieto (no hace
//   nada: para ver lo que hace él solo)
//   vida: con cuánta vida empieza él (0..1; 1 = entera)
//   fotos: cada cuántos segundos una captura (tools/shots/fpelea_<i>.png)
//   (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const secs = +(process.argv[2] || 90),
  how = process.argv[3] || 'agresivo',
  vida = +(process.argv[4] || 1),
  fotos = +(process.argv[5] || 0);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 5).join(' | ')));
await p.goto('http://localhost:' + (process.env.PORT || 5199) + '/?dev=1&items=espada,escudo');
await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
await p.evaluate(([vida]) => {
  window.__pause = true;
  const g = __game;
  g.ui.closeAll();
  g.input.enabledPointerLock = false;
  g.input.onPointerLockLost = null;
  g.state = 'play';
  for (const k of ['door:d_porton', 'fisico:intro', 'fisico:calleja', 'fisico:viuda', 'fisico:caza', 'door:d_tinte']) g.flags[k] = true;
  g.enemies.forEach((e) => { if (!e.boss && !/llamado/.test(e.id || '')) { e.dead = true; e.state = 'dead'; e.obj.visible = false; } });
  const F = g.fisico;
  if (vida < 1) {
    F.vida = F.e.maxHp * vida;
    if (vida <= 0.5) g.flags['fisico:encerrado'] = true;
  }
  g.player.spawn(58.4, 0, 44.0, Math.PI / 2);
  for (let i = 0; i < 6; i++) g.update(1 / 30);
}, [vida]);
let shot = 0;
const chunk = 5;
let acc = { t: 0 };
for (let t0 = 0; t0 < secs; t0 += chunk) {
  acc = await p.evaluate(
    ([chunk, how, acc]) => {
      const g = __game;
      const F = g.fisico,
        e = F.e,
        P = g.player,
        inp = g.input;
      const A = window.__acc || (window.__acc = { t: 0, golpes: {}, entran: {}, fases: [], llamados: 0, fuegos: 0, duerme: 0, agarra: 0, dado: 0, recibido: 0, muertes: 0, curas: 0, celdas: {}, rodadas: 0, ataquesJugador: 0, fin: null, lastHp: P.hp, lastBoss: e.hp, lastAtk: null, lastFase: null, prevSpace: false, combo: 0, comboT: 0, rollCD: 0 });
      for (let i = 0; i < chunk * 30 && !A.fin; i++) {
        const hold = [],
          taps = [];
        A.rollCD -= 1 / 30;
        A.comboT -= 1 / 30;
        const d = Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z);
        const atk = e.state === 'attack' && e.atk ? e.atk : null;
        if (P.state === 'grabbed' || P.state === 'pinned' || (g.qte && g.qte.active)) {
          if (i % 3 === 0) taps.push('M0');
        } else if (how !== 'quieto' && !P.dead && e.obj.visible) {
          const yaw = Math.atan2(e.pos.x - P.pos.x, e.pos.z - P.pos.z);
          g.camRig.yaw = yaw;
          if (P.state === 'free' || P.state === 'attack') P.yaw = yaw;
          const viene = atk && e.stT < (atk.hits && atk.hits[0] ? atk.hits[0][0] - 0.12 : 0.5) && d < (atk.range || 3) + 1.2;
          if (viene && A.rollCD <= 0 && Math.random() < (how === 'cauto' ? 0.85 : 0.6)) {
            hold.push(Math.random() < 0.5 ? 'KeyD' : 'KeyA');
            taps.push('Space');
            A.rollCD = 1.1;
            A.rodadas++;
          } else if (P.hp < P.maxHp * 0.4 && P.flasks > 0 && d > 4.5 && P.state === 'free') {
            taps.push('KeyR');
            A.curas++;
          } else if (how === 'cauto' && atk) {
            // espera a que acabe su golpe
          } else if (d > 2.3) hold.push('KeyW');
          else if ((P.state === 'free' || P.state === 'attack') && A.comboT <= 0 && P.st > 25) {
            if (A.combo < (how === 'cauto' ? 2 : 3)) {
              taps.push(Math.random() < 0.12 ? 'KeyF' : 'M0');
              A.combo++;
              A.comboT = 0.33;
              A.ataquesJugador++;
            } else {
              A.combo = 0;
              A.comboT = how === 'cauto' ? 1.4 : 0.9;
            }
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
          A.prevSpace = true;
        } else if (A.prevSpace) {
          inp.kReleased.add('Space');
          A.prevSpace = false;
        }
        g.update(1 / 30);
        A.t += 1 / 30;
        // lo que pasa
        const a2 = e.state === 'attack' && e.atk ? e.atk.name : null;
        if (a2 && a2 !== A.lastAtk) A.golpes[a2] = (A.golpes[a2] || 0) + 1;
        if (P.hp < A.lastHp) {
          A.recibido += A.lastHp - P.hp;
          const k = a2 || A.lastAtk || 'otro';
          A.entran[k] = (A.entran[k] || 0) + 1;
        }
        A.lastAtk = a2;
        A.lastHp = P.hp;
        if (e.hp < A.lastBoss) A.dado += A.lastBoss - e.hp;
        A.lastBoss = e.hp;
        if (e.data.fase && e.data.fase !== A.lastFase) {
          A.fases.push([+A.t.toFixed(1), e.data.fase, Math.round(e.hp)]);
          A.lastFase = e.data.fase;
        }
        if (e.state === 'sedando' && !A._sed) A.duerme++;
        A._sed = e.state === 'sedando';
        if (P.state === 'grabbed' && !A._grab) A.agarra++;
        A._grab = P.state === 'grabbed';
        A.llamados = ['e_coronado_llamado1', 'e_coronado_llamado2'].filter((id) => {
          const c = g.enemies.find((x) => x.id === id);
          return c && c.obj.visible && !c.scripted;
        }).length;
        A.fuegos = Math.max(A.fuegos, F.pelea.fuegos);
        const cx = Math.floor(e.pos.x / 2) * 2,
          cz = Math.floor(e.pos.z / 2) * 2;
        A.celdas[cx + ',' + cz] = (A.celdas[cx + ',' + cz] || 0) + 1;
        if (P.dead) {
          A.muertes++;
          P.dead = false;
          P.state = 'free';
          P.hp = P.maxHp;
          A.lastHp = P.hp;
        }
        if (g.cutscene && F.modo === 'cine') {
          // (te ha dormido: la camilla; o se muere: su escena)
          A.fin = e.dead || (g.flags['boss:fisico'] ? 'vencido' : 'camilla');
          if (A.fin === 'camilla') A.fin = 'te duerme: la camilla';
          else A.fin = 'vencido';
        }
        if (g.flags['boss:fisico']) A.fin = 'vencido';
      }
      return { t: +A.t.toFixed(1), hp: Math.round(P.hp), boss: Math.round(e.hp), fase: e.data.fase, modo: F.modo, pos: [+e.pos.x.toFixed(1), +e.pos.z.toFixed(1)], fin: A.fin };
    },
    [chunk, how, acc]
  );
  console.log(JSON.stringify(acc));
  if (fotos && t0 % fotos === 0) {
    await p.evaluate(() => __game.render());
    await p.screenshot({ path: `tools/shots/fpelea_${shot++}.png` });
  }
  if (acc.fin) break;
}
const A = await p.evaluate(() => {
  const A = window.__acc;
  const celdas = Object.entries(A.celdas)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, v]) => k + ':' + Math.round(v / 30) + 's');
  return { t: +A.t.toFixed(1), fin: A.fin, golpes: A.golpes, entran: A.entran, fases: A.fases, llamados: A.llamados, fuegos: A.fuegos, duerme: A.duerme, agarra: A.agarra, dado: Math.round(A.dado), recibido: Math.round(A.recibido), muertes: A.muertes, curas: A.curas, rodadas: A.rodadas, ataquesJugador: A.ataquesJugador, dondeAnda: celdas };
});
console.log(JSON.stringify(A, null, 1));
if (logs.length) console.log(logs.slice(0, 10).join('\n'));
await b.close();
