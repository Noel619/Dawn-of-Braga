// La Bestia de Carne, de principio a fin: entra en el Postigo, le baja la
// vida al Empalado hasta que se transforma y juega la escena del hacha y la
// huida (una cinemática: el jugador corre solo) con un «bot» que pulsa los
// avisos (QTE). Comprueba que se arranca el hacha de la estaca (en el
// inventario y empuñada), que se corre por el recorrido, que se llega a la
// atalaya, que queda vencido el jefe y que no hay errores. Con «fallos»
// falla a propósito algunos avisos (los que no matan: el zarpazo, el hacha,
// la pica, el remate, la viga, el hueco, las manos y el primer salto del
// fanal) y muere una vez en tres puntos de control (al empezar a correr, en
// la esquina y en lo alto del fanal) para probar los reintentos.
//   node tools/beastchase.mjs [fallos]      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const fallos = process.argv[2] === 'fallos';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 180 } });
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
await p.goto('http://localhost:5199/?dev=1&items=espada,escudo&at=74,9,-52');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
const r = await p.evaluate(async (fallos) => {
  window.__pause = true;
  const g = __game;
  g.ui.closeAll();
  g.input.enabledPointerLock = false;
  const P = g.player,
    C = g.chase,
    inp = g.input;
  P.maxHp = P.hp = 400;
  const KEY = { dodge: 'Space', interact: 'KeyE', block: 'M2', light: 'M0', heavy: 'KeyF' };
  // avisos que falla (la vez n.º de cada uno): el zarpazo al recular, el
  // hacha, la pica, el remate, la viga, el hueco (trepa), las manos de los
  // reflejos y el primer «¡Salta!» del fanal
  const failAt = fallos ? { '¡Esquiva!': [1, 3], '¡Arráncala!': [1], '¡Remata!': [1], '¡Agáchate!': [1], '¡Salta!': [1, 2], '¡Golpea!': [2] } : {};
  const seenN = {};
  const log = [];
  let n = 0;
  const frame = () => {
    inp.keys.clear();
    const q = g.qte.cur;
    if (q && q.t > q.delay + 0.2) {
      if (!q._bot) {
        const k = (seenN[q.label] = (seenN[q.label] || 0) + 1);
        q._bot = { id: n++, last: -1, fail: (failAt[q.label] || []).includes(k) };
        log.push(`${q._bot.id} ${q.label}${q._bot.fail ? ' (falla)' : ''} [${C.cp}]`);
      }
      if (!q._bot.fail && (!q.mash || q.t - q._bot.last > 0.12)) {
        const k = KEY[q.action];
        inp.keys.add(k);
        inp.kPressed.add(k);
        q._bot.last = q.t;
      }
    }
    g.update(1 / 60);
  };
  // al Postigo y a por él
  const fog = g.interact.list.find((i) => i.id === 'f_impaled');
  g.enterFog(fog);
  for (let i = 0; i < 270; i++) frame();
  const E = g.bosses.impaled;
  E.takeHit(E.hp - E.maxHp * 0.2, 0, P.pos.x, P.pos.z, false);
  let t = 0;
  const died = new Set();
  const seen = { transform: false, run: false, top: false, ran: 0 };
  let s0 = null;
  while (t < 300) {
    frame();
    t += 1 / 60;
    if (C.active && C.beast.visible) seen.transform = true;
    // corre solo: el jugador avanza por el recorrido sin que nadie le mueva
    if (C.autoV > 0) {
      seen.run = true;
      if (s0 === null) s0 = C.sRun;
      seen.ran = Math.max(seen.ran, C.sRun - s0);
    }
    if (C.cp === 'top') seen.top = true;
    // una muerte en tres puntos de control (con «fallos»): al empezar a
    // correr (el sillar), en la esquina y en lo alto del fanal
    if (fallos && g.qte.cur && !P.dead) {
      // (arriba, en el segundo intento: el primero lo falla y recibe la cornada)
      const at = C.cp === 'start' && C.autoV > 0 ? 'start' : C.cp === 'corner' ? 'corner' : C.cp === 'top' && (seenN['¡Salta!'] || 0) >= 2 ? 'top' : null;
      if (at && !died.has(at)) {
        died.add(at);
        g.qte.cancel();
        P.hp = 1;
        P.die();
      }
    }
    if (P.dead) {
      for (let i = 0; i < 90; i++) frame();
      g.respawn();
      log.push('reaparece en «' + C.cp + '»');
      P.hp = 400;
    }
    if (!C.active && seen.transform) break;
  }
  // y después de escapar, el jugador se mueve (andando con la tecla de
  // avanzar) y la cámara responde
  for (let i = 0; i < 120; i++) frame();
  const p0 = P.pos.clone();
  P.autoDir = null;
  for (let i = 0; i < 90; i++) {
    inp.keys.clear();
    inp.keys.add('KeyW');
    g.update(1 / 60);
  }
  inp.keys.clear();
  const moved = Math.hypot(P.pos.x - p0.x, P.pos.z - p0.z);
  return {
    log,
    moved: +moved.toFixed(2),
    control: g.state === 'play' && !(C.active && C.lock) && !P.puppet && P.state === 'free',
    t: Math.round(t),
    seen,
    flags: { beast: !!g.flags['impaled:beast'], boss: !!g.flags['boss:impaled'], escaped: !!g.flags['impaled:escaped'] },
    zone: g.zone && g.zone.id,
    pos: [+P.pos.x.toFixed(1), +P.pos.y.toFixed(1), +P.pos.z.toFixed(1)],
    hp: Math.round(P.hp),
    fog: g.fogActive(fog),
    hacha: g.inventory.has('hacha') && g.flags['take:i_hacha'] && P.weaponId === 'hacha',
    estaca: g.chase.axe.visible,
  };
}, fallos);
for (const l of r.log) console.log('  ' + l);
const ok = r.seen.transform && r.seen.run && r.seen.ran > 150 && r.seen.top && r.flags.beast && r.flags.boss && r.flags.escaped && r.zone === 'atalaya' && !r.fog && r.moved > 1 && r.control && r.hacha && !r.estaca;
console.log(
  `${ok ? 'OK ' : 'MAL'} ${fallos ? 'con fallos' : 'sin fallos'}: ${r.t} s, corre ${Math.round(r.seen.ran)} m solo, después se mueve ${r.moved} m (control: ${r.control ? 'sí' : 'NO'}), zona ${r.zone}, ${JSON.stringify(r.pos)}, vida ${r.hp}, banderas ${JSON.stringify(r.flags)}, niebla ${r.fog ? 'sigue' : 'disipada'}, hacha ${r.hacha ? 'arrancada y empuñada' : 'NO'}${r.estaca ? ' (¡sigue en la estaca!)' : ''}`
);
if (errs.length) console.log(errs.join('\n'));
await b.close();
process.exit(ok && !errs.length ? 0 : 1);
