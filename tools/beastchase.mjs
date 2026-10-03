// La Bestia de Carne, de principio a fin: entra en el Postigo, le baja la
// vida al Empalado hasta que se transforma y juega la huida con un «bot»
// que pulsa los avisos (QTE) y corre por el recorrido. Comprueba que se
// llega a la atalaya, que queda vencido el jefe y que no hay errores.
// Con «fallos» falla a propósito algunos avisos (los que no matan) y, al
// final, muere una vez en lo alto del fanal para probar el reintento.
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
  const KEY = { dodge: 'Space', interact: 'KeyE', block: 'M2', light: 'M0' };
  // avisos que falla (por orden de aparición): la pica, la viga, el hueco
  // (y el trepar), la cornada y el primer «¡Salta!» del fanal
  const fail = new Set(fallos ? [0, 3, 5, 8] : []);
  const log = [];
  let n = 0;
  const frame = () => {
    inp.keys.clear();
    const q = g.qte.cur;
    if (q && q.t > q.delay + 0.2) {
      if (!q._bot) {
        q._bot = { id: n++, last: -1 };
        log.push(`${q._bot.id} ${q.label}${fail.has(q._bot.id) ? ' (falla)' : ''}`);
      }
      if (!fail.has(q._bot.id) && (!q.mash || q.t - q._bot.last > 0.12)) {
        const k = KEY[q.action];
        inp.keys.add(k);
        inp.kPressed.add(k);
        q._bot.last = q.t;
      }
    }
    if (C.active && C.follow && !C.lock && !P.dead) {
      const a = C.path.at(C.path.project(P.pos.x, P.pos.z) + 3, {});
      const dx = a.x - P.pos.x,
        dz = a.z - P.pos.z,
        d = Math.hypot(dx, dz) || 1;
      P.autoDir = { x: dx / d, z: dz / d, m: 1 };
    } else P.autoDir = null;
    g.update(1 / 60);
  };
  // al Postigo y a por él
  const fog = g.interact.list.find((i) => i.id === 'f_impaled');
  g.enterFog(fog);
  for (let i = 0; i < 270; i++) frame();
  const E = g.bosses.impaled;
  E.takeHit(E.hp - E.maxHp * 0.2, 0, P.pos.x, P.pos.z, false);
  let died = 0,
    t = 0;
  const seen = { transform: false, run: false, top: false };
  while (t < 240) {
    frame();
    t += 1 / 60;
    if (C.active && C.beast.visible) seen.transform = true;
    if (C.follow) seen.run = true;
    if (C.cp === 'top') seen.top = true;
    // una muerte en lo alto del fanal (con «fallos»): reaparece arriba
    if (fallos && !died && C.cp === 'top' && C.lock && g.qte.cur) {
      died = 1;
      g.qte.cancel();
      P.hp = 1;
      P.die();
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
  };
}, fallos);
for (const l of r.log) console.log('  ' + l);
const ok = r.seen.transform && r.seen.run && r.seen.top && r.flags.beast && r.flags.boss && r.flags.escaped && r.zone === 'atalaya' && !r.fog && r.moved > 1 && r.control;
console.log(
  `${ok ? 'OK ' : 'MAL'} ${fallos ? 'con fallos' : 'sin fallos'}: ${r.t} s, después se mueve ${r.moved} m (control: ${r.control ? 'sí' : 'NO'}), zona ${r.zone}, ${JSON.stringify(r.pos)}, vida ${r.hp}, banderas ${JSON.stringify(r.flags)}, niebla ${r.fog ? 'sigue' : 'disipada'}`
);
if (errs.length) console.log(errs.join('\n'));
await b.close();
process.exit(ok && !errs.length ? 0 : 1);
