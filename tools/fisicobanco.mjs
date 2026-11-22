// El banco de pruebas de la pelea con el Físico, en el motor de verdad: los
// mismos jugadores de prueba del simulador (fisico_bot.mjs), traducidos a
// teclas, contra el Físico de verdad en su sala (a 30 fotogramas por segundo),
// varias peleas seguidas en la misma página. Sirve para dos cosas: comprobar
// que el simulador se parece al juego (las mismas cifras con la misma cabeza)
// y medir la cabeza entrenada donde importa.
//
//   node tools/fisicobanco.mjs [estilos|todos] [peleas] [red|manual|antes] [vida] [segundos]
//   red: la cabeza entrenada (src/game/fisico_red.json); manual: la misma
//   cabeza sin la red (la manera hecha a mano); antes: la de antes (el motor
//   elige los golpes a suertes). Lo que tiene apuntado de un jugador se queda
//   de una pelea a la siguiente del mismo estilo (como quien reintenta).
//   (requiere npx vite --port 5199)
import { chromium } from 'playwright';
import { valor, ESTILOS } from './fisico_sim.mjs';

const quien = process.argv[2] || 'todos';
const n = +(process.argv[3] || 2);
const modo = process.argv[4] || 'red';
const vida = +(process.argv[5] || 1);
const tmax = +(process.argv[6] || 200);
const nombres = quien === 'todos' ? Object.keys(ESTILOS) : quien.split(',');

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 480, height: 270 } });
const errores = [];
p.on('pageerror', (e) => errores.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
await p.goto('http://localhost:' + (process.env.PORT || 5199) + '/?dev=1&items=espada,escudo');
await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
await p.evaluate(async () => {
  window.__pause = true;
  const g = __game;
  g.ui.closeAll();
  g.input.enabledPointerLock = false;
  g.input.onPointerLockLost = null;
  g.state = 'play';
  for (const k of ['door:d_porton', 'fisico:intro', 'fisico:calleja', 'fisico:viuda', 'fisico:caza', 'door:d_tinte']) g.flags[k] = true;
  g.enemies.forEach((e) => {
    if (!e.boss && !/llamado/.test(e.id || '')) {
      e.dead = true;
      e.state = 'dead';
      e.obj.visible = false;
    }
  });
  window.__mods = {
    bot: await import('/tools/fisico_bot.mjs'),
    datos: await import('/tools/fisico_datos.mjs'),
    sim: await import('/tools/fisico_sim.mjs'),
  };
  const F = g.fisico;
  const P = g.player;
  // (caer: se cuenta y se levanta ahí mismo; vencerle: se cuenta, sin escena)
  P.die = function () {
    const B = window.__B;
    if (B) {
      B.muertes++;
      B.dado += B.lastHp - this.hp;
      B.lastHp = this.maxHp;
    }
    this.hp = this.maxHp;
    this.flasks = this.maxFlasks;
    this.st = this.maxSt;
    this.state = 'free';
    this.dead = false;
    this.stT = 0;
  };
  g.fisicoCine.muerte = () => {
    if (window.__B) window.__B.fin = 'vencido';
    F.modo = 'cine';
  };
  window.__RED = F.pelea.mente.red;
  // (lo que hace el jugador de prueba: golpes, volteretas, desvíos, guardia, curas)
  const opa = g.onPlayerAction.bind(g);
  g.onPlayerAction = (kind, info) => {
    const B = window.__B;
    if (B) {
      B.yo[kind] = (B.yo[kind] || 0) + 1;
      // (desde dónde golpea: la distancia, y si su golpe empieza estando él en guardia o golpeando)
      if (kind === 'attack') {
        const e = g.fisico.e;
        const d = Math.hypot(g.player.pos.x - e.pos.x, g.player.pos.z - e.pos.z);
        const k = d < 1.5 ? '<1.5' : d < 2.2 ? '1.5-2.2' : d < 2.8 ? '2.2-2.8' : d < 3.5 ? '2.8-3.5' : '>3.5';
        B.dGolpe[k] = (B.dGolpe[k] || 0) + 1;
      }
    }
    return opa(kind, info);
  };
});

const tot = [];
for (const nombre of nombres) {
  // (cada estilo, con su historia desde cero; de una pelea a otra, se queda)
  await p.evaluate(() => delete __game.flags['fisico:historia']);
  const acc = { v: 0, dado: 0, recibido: 0, muertes: 0, aire: 0, duerme: 0, agarra: 0, amagos: 0, retenidos: 0, t: 0, vencido: 0, golpes: {}, entran: {}, wall: 0, yo: {}, leDa: 0, dSum: 0, lejosT: 0, est: {} };
  for (let i = 0; i < n; i++) {
    const w0 = Date.now();
    await p.evaluate(
      ([nombre, seed, modo, vida]) => {
        const g = __game;
        const F = g.fisico;
        const e = F.e;
        const P = g.player;
        const { Bot } = __mods.bot;
        const { estilo } = __mods.datos;
        const { rng32 } = __mods.sim;
        // lo de antes, fuera
        F.pelea.reset();
        g.combat.clear();
        F.modo = 'fuera';
        F.hide();
        e.dead = false;
        for (const id of ['e_coronado_llamado1', 'e_coronado_llamado2']) {
          const c = g.enemies.find((x) => x.id === id);
          if (c) c.reset();
        }
        const dc = g.interact.list.find((x) => x.id === 'd_celdas_inocentes');
        if (dc && (dc.done || dc.open > 0.05)) g.interact.slamShut(dc);
        g.flags['fisico:encerrado'] = vida <= 0.5;
        F.vida = Math.round(e.maxHp * vida);
        F.pelea.antes = modo === 'antes';
        F.pelea.mente.red = modo === 'manual' ? null : window.__RED;
        F.blind = 0;
        F.sleep = 0;
        g.lockTarget = null;
        P.spawn(58.4, 0, 44.0, Math.PI / 2);
        P.hp = P.maxHp;
        P.flasks = P.maxFlasks;
        P.st = P.maxSt;
        P.lento = 1;
        const r = rng32(seed);
        const S = estilo(nombre, r);
        window.__B = { S, bot: new Bot(S, r), r, yo: {}, dGolpe: {}, leDa: 0, dSum: 0, lejosT: 0, est: {}, t: 0, dado: 0, recibido: 0, muertes: 0, aire: 0, duerme: 0, agarra: 0, amagos: 0, retenidos: 0, fin: null, golpes: {}, entran: {}, lastHp: P.hp, lastBoss: null, serial: e.atkSerial || 0, res: null, minD: 99, enGolpe: null, spacePrev: false, accionT: -1, tapT: -9, comboTap: -1, mash: 0, sedando: false };
        // lo que pasa con sus golpes (además de la historia)
        if (!F._bancoStrike) {
          F._bancoStrike = F.onStrike.bind(F);
          F.onStrike = (en, a, rr) => {
            if (window.__B) window.__B.res = rr;
            return F._bancoStrike(en, a, rr);
          };
          const asleep = F.onAsleep.bind(F);
          F.onAsleep = (en) => {
            if (window.__B) window.__B.duerme++;
            return asleep(en);
          };
        }
        for (let k = 0; k < 4; k++) g.update(1 / 30);
      },
      [nombre, 1000 + i * 7919 + nombre.length * 131, modo, vida]
    );
    let r;
    do {
      r = await p.evaluate(
        ([seg, tmax]) => {
          const g = __game;
          const F = g.fisico;
          const e = F.e;
          const P = g.player;
          const inp = g.input;
          const B = window.__B;
          const { ATK } = __mods.datos;
          const est = (s) => (s === 'attack' ? 'ataca' : s === 'hurt' ? 'herido' : s === 'stagger' ? 'tambalea' : s === 'parried' ? 'deseq' : s === 'guion' || s === 'sedando' || s === 'trepanando' ? s : 'libre');
          const estJ = (s) => (s === 'free' ? 'libre' : s === 'attack' ? 'ataca' : s === 'roll' ? 'rueda' : s === 'heal' ? 'bebe' : s === 'grabbed' || s === 'pinned' ? 'cogido' : 'herido');
          const LL = ['e_coronado_llamado1', 'e_coronado_llamado2'].map((id) => g.enemies.find((x) => x.id === id)).filter(Boolean);
          for (let k = 0; k < seg * 30 && !B.fin; k++) {
            const t = g.time;
            const dt = 1 / 30;
            // lo que ve de él
            B.bot.ve({ t, x: e.pos.x, z: e.pos.z, estado: est(e.state), atk: e.state === 'attack' && e.atk ? e.atk.name : null, atkT: e.stT, serial: e.atkSerial || 0, amago: !!e.data.amago });
            const coros = LL.filter((c) => !c.dead && !c.scripted && c.obj.visible).map((c) => ({ x: c.pos.x, z: c.pos.z, hp: c.hp, e: c }));
            const yo = { x: P.pos.x, z: P.pos.z, hp: P.hp, maxHp: P.maxHp, st: P.st, flasks: P.flasks, estado: estJ(P.state), combo: P.combo || 0, atkHeavy: !!(P.atk && P.atk.heavy), atkRiposte: !!(P.atk && P.atk.riposte), ciego: F.blind > 0, lento: (P.lento || 1) < 1 };
            const mundo = { fuegos: g.combat.pools.filter((q) => q.kind !== 'pus').map((q) => ({ x: q.x, z: q.z })), nubes: F.pelea.nubes.map((q) => ({ x: q.x, z: q.z })), coros };
            const I = B.bot.piensa(t, dt, yo, mundo);
            // a quién mira (fijado) y la cámara, hacia él
            const tg = B.bot.tgt && B.bot.tgt.e ? B.bot.tgt.e : e;
            if (F.modo === 'pelea' && e.obj.visible) g.lockTarget = tg;
            const cy = Math.atan2(tg.pos.x - P.pos.x, tg.pos.z - P.pos.z);
            g.camRig.yaw = cy;
            const hold = new Set();
            const taps = new Set();
            const dir = (mx, mz) => {
              // (en las teclas: adelante, hacia la cámara; derecha: (-cos, sin))
              const fy = mx * Math.sin(cy) + mz * Math.cos(cy);
              const rx = -mx * Math.cos(cy) + mz * Math.sin(cy);
              if (fy > 0.38) hold.add('KeyW');
              if (fy < -0.38) hold.add('KeyS');
              if (rx > 0.38) hold.add('KeyD');
              if (rx < -0.38) hold.add('KeyA');
            };
            const cogido = P.state === 'grabbed' || (g.qte && g.qte.active);
            if (cogido) {
              // forcejea (cuando se da cuenta), a su ritmo
              B.cogT = (B.cogT ?? 0) + dt;
              if (B.cogT > B.S.reac + 0.25) {
                B.mash += B.S.mash * (0.75 + B.r() * 0.5) * dt;
                if (B.mash >= 1) {
                  B.mash -= 1;
                  taps.add('M0');
                }
              }
            } else {
              B.cogT = 0;
              let rodando = false;
              if (I.accion && I.accionT !== B.accionT) {
                B.accionT = I.accionT;
                if (I.accion === 'rueda' && I.rueda) {
                  B.rueda = I.rueda;
                  B.ruedaF = 2;
                } else if (I.accion === 'desvia') taps.add('KeyC');
                else if (I.accion === 'bebe') taps.add('KeyR');
                else if (I.accion === 'gracia') taps.add('M0');
                I.accion = null;
              }
              if (B.ruedaF > 0) {
                // la voltereta: la dirección, y la barra pulsada un fotograma
                rodando = true;
                if (!B.rueda[2]) dir(B.rueda[0], B.rueda[1]);
                if (B.ruedaF === 2) taps.add('Space');
                B.ruedaF--;
              }
              if (!rodando) {
                if (I.mx || I.mz) dir(I.mx, I.mz);
                if (I.spd > 5) hold.add('ShiftLeft');
              }
              if (I.cubre) hold.add('KeyC');
              // los golpes: uno cada vez (en la racha, uno por golpe)
              if (I.golpe && t - B.tapT > 0.12) {
                const enRacha = P.state === 'attack' && P.atk;
                if (!enRacha || (P.combo !== B.comboTap && (P.atkT ?? P.stT) > (P.atk.cancel ?? 0.3) - 0.12)) {
                  taps.add(I.golpe === 'fuerte' ? 'KeyF' : 'M0');
                  B.tapT = t;
                  B.comboTap = enRacha ? P.combo : -1;
                }
              }
            }
            inp.keys.clear();
            for (const k of hold) inp.keys.add(k);
            for (const k of taps) {
              inp.keys.add(k);
              inp.kPressed.add(k);
            }
            if (taps.has('Space')) B.spacePrev = true;
            else if (B.spacePrev) {
              inp.kReleased.add('Space');
              B.spacePrev = false;
            }
            if (taps.has('KeyC') && !hold.has('KeyC')) B.cRel = true;
            else if (B.cRel) {
              inp.kReleased.add('KeyC');
              B.cRel = false;
            }
            g.update(dt);
            B.t += dt;
            if (F.modo === 'pelea') {
              const dd = Math.hypot(P.pos.x - e.pos.x, P.pos.z - e.pos.z);
              B.dSum += dd * dt;
              if (dd > 3.2) B.lejosT += dt;
              const es = est(e.state);
              B.est[es] = (B.est[es] || 0) + dt;
            }
            // lo que pasa
            if (B.lastBoss === null && F.modo === 'pelea') B.lastBoss = e.hp;
            if (P.hp < B.lastHp) B.dado += B.lastHp - P.hp;
            B.lastHp = P.hp;
            if (B.lastBoss !== null && e.hp < B.lastBoss) {
              B.recibido += B.lastBoss - e.hp;
              B.leDa++;
            }
            if (B.lastBoss !== null) B.lastBoss = e.hp;
            if (e.state === 'sedando' && !B.sedando) B.agarra++;
            B.sedando = e.state === 'sedando';
            // sus golpes: cuántos, cuáles, amagos, retenidos; al aire
            if (e.state === 'attack' && e.atk && (e.atkSerial || 0) !== B.serial) {
              B.serial = e.atkSerial;
              const a = e.atk;
              if (e.data.amago) B.amagos++;
              else B.golpes[a.name] = (B.golpes[a.name] || 0) + 1;
              if (e.data.reten) B.retenidos++;
              B.res = null;
              B.minD = 99;
              B.enGolpe = { a, amago: !!e.data.amago };
            }
            if (B.enGolpe && e.state === 'attack') {
              const A = ATK[B.enGolpe.a.name];
              const tt = e.stT;
              if (A) {
                const d = Math.hypot(P.pos.x - e.pos.x, P.pos.z - e.pos.z);
                for (const [h0, h1] of A.hits) if (tt >= h0 && tt <= h1) B.minD = Math.min(B.minD, d);
                if (A.ev) for (const v of A.ev) if (Math.abs(tt - v) < 0.04) B.minD = Math.min(B.minD, d);
              }
              if (B.res === 'hit' || B.res === 'guardbreak') {
                B.entran[B.enGolpe.a.name] = (B.entran[B.enGolpe.a.name] || 0) + 1;
                B.res = 'contado';
              }
            } else if (B.enGolpe) {
              const A = ATK[B.enGolpe.a.name];
              if (A && !B.enGolpe.amago && !B.res && A.name !== 'campanilla' && A.name !== 'sahumerio' && B.minD < 98 && B.minD > A.range + 0.8) B.aire++;
              B.enGolpe = null;
            }
            if (B.t > tmax) B.fin = 'tiempo';
          }
          return { t: +B.t.toFixed(1), fin: B.fin, hp: Math.round(P.hp), boss: Math.round(e.hp), fase: e.data.fase, modo: F.modo };
        },
        [10, tmax]
      );
    } while (!r.fin);
    const B = await p.evaluate(() => {
      const B = window.__B;
      return { t: B.t, fin: B.fin, dado: B.dado, recibido: B.recibido, muertes: B.muertes, aire: B.aire, duerme: B.duerme, agarra: B.agarra, amagos: B.amagos, retenidos: B.retenidos, golpes: B.golpes, entran: B.entran, lejos: 0, yo: B.yo, dGolpe: B.dGolpe, leDa: B.leDa, dSum: B.dSum, lejosT: B.lejosT, est: B.est };
    });
    const wall = (Date.now() - w0) / 1000;
    acc.v += valor(B);
    for (const k of ['dado', 'recibido', 'muertes', 'aire', 'duerme', 'agarra', 'amagos', 'retenidos', 't']) acc[k] += B[k];
    acc.vencido += B.fin === 'vencido' ? 1 : 0;
    for (const k in B.golpes) acc.golpes[k] = (acc.golpes[k] || 0) + B.golpes[k];
    for (const k in B.entran) acc.entran[k] = (acc.entran[k] || 0) + B.entran[k];
    for (const k in B.yo) acc.yo[k] = (acc.yo[k] || 0) + B.yo[k];
    acc.leDa += B.leDa;
    acc.dGolpe = acc.dGolpe || {};
    for (const k in B.dGolpe) acc.dGolpe[k] = (acc.dGolpe[k] || 0) + B.dGolpe[k];
    acc.dSum += B.dSum;
    acc.lejosT += B.lejosT;
    for (const k in B.est) acc.est[k] = (acc.est[k] || 0) + B.est[k];
    acc.wall += wall;
    console.log(`  ${nombre} #${i + 1}: ${B.fin} en ${B.t.toFixed(0)} s · te quita ${Math.round(B.dado)} · le quitas ${Math.round(B.recibido)} · caes ${B.muertes} · aire ${B.aire} · duerme ${B.duerme} · amagos ${B.amagos} · ret ${B.retenidos} · (${wall.toFixed(0)} s de reloj)`);
  }
  const f = (v) => (v / n).toFixed(1);
  const golpes = Object.entries(acc.golpes)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${f(v)}${acc.entran[k] ? ` (${Math.round((acc.entran[k] / v) * 100)}%)` : ''}`)
    .join(', ');
  console.log(`${' '.repeat(11)}el jugador: golpes ${f(acc.yo.attack || 0)} (entran ${f(acc.leDa)}) · volteretas ${f(acc.yo.roll || 0)} · desvía ${f(acc.yo.parryTry || 0)} (${f(acc.yo.parry || 0)}) · guardia ${f(acc.yo.block || 0)} · bebe ${f(acc.yo.heal || 0)} · a ${(acc.dSum / acc.t).toFixed(2)} m de media · lejos ${Math.round((acc.lejosT / acc.t) * 100)} % · él: ${Object.entries(acc.est).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + Math.round((v / acc.t) * 100) + '%').join(' ')}`);
  if (process.env.JUGADOR) console.log(`${' '.repeat(11)}golpea desde: ${['<1.5', '1.5-2.2', '2.2-2.8', '2.8-3.5', '>3.5'].map((k) => k + ' m ' + f((acc.dGolpe || {})[k] || 0)).join(' · ')}`);
  console.log(`${nombre.padEnd(10)} valor ${f(acc.v).padStart(5)} · te quita ${f(acc.dado)} · le quitas ${f(acc.recibido)} · caes ${f(acc.muertes)} · al aire ${f(acc.aire)} · duerme ${f(acc.duerme)} · agarra ${f(acc.agarra)} · amagos ${f(acc.amagos)} · retenidos ${f(acc.retenidos)} · ${f(acc.t)} s · vencido ${acc.vencido}/${n} · ${golpes}`);
  tot.push(acc.v / n);
  // lo que ha apuntado de este jugador (la hoja de su mesa)
  if (process.env.HOJA) {
    const hoja = await p.evaluate(() => __game.fisico.H.texto());
    console.log(hoja.split('\n').map((l) => '    ' + l).join('\n'));
  }
}
console.log(`[${modo}] valor medio ${(tot.reduce((a, x) => a + x, 0) / tot.length).toFixed(2)}`);
if (errores.length) console.log(errores.slice(0, 8).join('\n'));
await b.close();
