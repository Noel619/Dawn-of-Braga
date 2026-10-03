// Parry contra cada criatura y con cada arma: la criatura lanza un golpe, el
// jugador pulsa la guardia justo antes de que llegue y se comprueba que se
// desvía (sin daño), que la criatura queda desequilibrada (o, las grandes y
// los jefes, que hace falta insistir), que el golpe de gracia entra y que
// los golpes marcados como imparables no se desvían.
//   node tools/parrytest.mjs [arma]      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const arma = process.argv[2] || 'espada';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 180 } });
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 5).join(' | ')));
await p.goto(`http://localhost:5199/?dev=1&arma=${arma}&items=espada,escudo`);
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
const r = await p.evaluate(async (arma) => {
  window.__pause = true;
  const g = __game;
  g.ui.closeAll();
  g.input.enabledPointerLock = false;
  const P = g.player;
  const inp = g.input;
  g.dev.set('stamina', true);
  const step = (n, tap = []) => {
    for (let i = 0; i < n; i++) {
      inp.keys.clear();
      if (i === 0) for (const k of tap) { inp.keys.add(k); inp.kPressed.add(k); }
      g.update(1 / 60);
      if (i === 0) for (const k of tap) inp.kReleased.add(k);
    }
  };
  // a un sitio despejado: la cisterna del Dios Desconocido (la arena del
  // Turiferario, treinta metros de lado sin estorbos)
  const T0 = g.bosses.turibulario;
  const base = { x: 0, y: T0.home.y, z: -149 };
  g.dev.teleport(base.x, base.y, base.z, 0);
  const out = [];
  // una prueba: la criatura 'type' lanza su golpe 'name'; el jugador pulsa
  // la guardia 'lead' segundos antes del impacto (o no la pulsa)
  const trial = (type, name, lead = 0.08, riposte = true, pre = 0, probe = false) => {
    const e = g.enemies.find((q) => q.type === type && !q.dead) || g.enemies.find((q) => q.type === type);
    if (!e) return { type, err: 'no hay' };
    // (golpes calculados por dónde pasa el arma, sin ventanas 'hits': se
    // mide antes cuándo llega de verdad)
    const a0 = e.T.attacks.find((x) => x.name === name);
    if (!probe && !(a0.hits && a0.hits.length) && !a0.censer && !a0.hitAt) a0.hitAt = trial(type, name, null, false, 0, true).at ?? 0.5;
    for (const q of g.enemies) if (q !== e && q.type !== 'descoyuntado') { q.obj.visible = false; q.dead = true; q.state = 'dead'; q.stT = 99; }
    e.dead = false;
    e.reset();
    e.hp = e.maxHp;
    // (parrys seguidos que ya lleva)
    e.parryHits = pre;
    e.lastParriedT = g.time;
    const a = e.T.attacks.find((x) => x.name === name);
    // (el incensario barre a cuatro metros y medio del Turiferario)
    const reach = a.censer ? 3.6 : Math.min(a.range ?? 2, a.max ?? 2) - 0.4;
    P.spawn(base.x, base.y, base.z, 0);
    P.hp = P.maxHp;
    P.setEquipment(true, true);
    P.equipWeapon(arma);
    // de frente, a su alcance
    e.body.pos.set(base.x, base.y, base.z + Math.max(1.2, reach));
    e.home = { ...e.home, x: e.pos.x, y: e.pos.y, z: e.pos.z };
    e.yaw = Math.PI;
    e.aware = true;
    e.state = 'chase';
    g.activeEnemies = [e];
    g._actT = 99;
    g.lockTarget = e;
    step(2);
    const hp0 = P.hp;
    e.startAttack(a);
    const hitAt = a.hits && a.hits.length ? a.hits[0][0] : a.hitAt ?? (a.censer ? a.censer[0][0] : 0.5);
    let at = null;
    let pressed = false, res = null, parried = false, recoil = false, eState = null;
    for (let i = 0; i < 400; i++) {
      const tap = [];
      // (el incensario llega cuando llega: se pulsa al verlo venir)
      const cz = a.censer && e.P.censer.pos;
      const due = a.censer ? e.stT > a.censer[0][0] - 0.3 && Math.hypot(cz.x - P.pos.x, (cz.y - P.pos.y - 1) * 0.7, cz.z - P.pos.z) < 1.5 + lead * 9 : e.stT >= hitAt - lead;
      if (!pressed && lead !== null && due) { tap.push('M2'); pressed = true; }
      step(1, tap);
      if (at === null && P.hp < hp0) at = e.stT - 1 / 60;
      if (P.state === 'parry' && !parried) { parried = true; eState = e.state; recoil = e.state === 'hurt'; }
      if (e.state !== 'attack' && i > 5) break;
    }
    const took = Math.round(hp0 - P.hp);
    if (probe) return { at };
    res = { type, name, parried, eState, took, open: e.parryT > 0 };
    // golpe de gracia
    if (riposte && res.open) {
      const ehp = e.hp;
      // (tras el parón del choque)
      step(20);
      step(1, ['M0']);
      let rip = false;
      for (let i = 0; i < 90; i++) {
        step(1);
        if (P.state === 'attack' && P.atk && P.atk.riposte) rip = true;
        if (rip && P.state !== 'attack') break;
      }
      res.riposte = rip;
      res.ripDmg = Math.round(ehp - Math.max(0, e.hp));
      res.killed = e.dead;
    }
    return res;
  };
  const cases = [
    ['penitent', 'slash'], ['penitent', 'double'], ['penitent', 'lunge'],
    ['soldier', 'combo'], ['soldier', 'thrust'],
    ['crawler', 'lunge'], ['hound', 'bite'], ['mourner', 'swipe'],
    ['bell', 'sweep'], ['impaled', 'sweep'], ['turibulario', 'sweep'],
  ];
  for (const [t, n] of cases) out.push(trial(t, n));
  // los pesados y los jefes: varios parrys seguidos
  const multi = [];
  for (const [t, n, k] of [['bell', 'sweep', 2], ['impaled', 'sweep', 3], ['turibulario', 'sweep', 3]]) {
    // (el último de la serie: ya lleva k - 1)
    multi.push(trial(t, n, 0.08, true, k - 1));
  }
  // imparables: pulsar la guardia no los desvía
  const unp = [];
  for (const [t, n] of [['soldier', 'arm3'], ['crawler', 'pounce'], ['hound', 'leap'], ['bell', 'slam'], ['impaled', 'slam']]) unp.push(trial(t, n, 0.08, false));
  // a destiempo: demasiado pronto (0,5 s antes) no hay parry
  const early = trial('penitent', 'slash', 0.5, false);
  return { out, multi, unp, early };
}, arma);
let fail = 0;
console.log(`arma: ${arma}`);
for (const x of r.out) {
  const ok = x.parried && x.took === 0 && (x.open ? x.riposte && (x.ripDmg > 60 || x.killed) : x.eState === 'hurt');
  if (!ok) fail++;
  console.log(`${ok ? 'OK ' : 'MAL'} ${x.type.padEnd(12)} ${x.name.padEnd(7)} parry=${x.parried} daño=${x.took} criatura=${x.eState} abierta=${x.open}${x.riposte !== undefined ? ` gracia=${x.riposte} -${x.ripDmg}${x.killed ? ' (muerto)' : ''}` : ''}`);
}
console.log('-- insistiendo (pesados y jefes)');
for (const x of r.multi) {
  const ok = x.parried && x.open && x.riposte;
  if (!ok) fail++;
  console.log(`${ok ? 'OK ' : 'MAL'} ${x.type.padEnd(12)} ${x.name.padEnd(7)} abierta=${x.open} gracia=${x.riposte} -${x.ripDmg}`);
}
console.log('-- imparables');
for (const x of r.unp) {
  const ok = !x.parried;
  if (!ok) fail++;
  console.log(`${ok ? 'OK ' : 'MAL'} ${x.type.padEnd(12)} ${x.name.padEnd(7)} parry=${x.parried} daño=${x.took}`);
}
{
  const x = r.early;
  const ok = !x.parried;
  if (!ok) fail++;
  console.log(`${ok ? 'OK ' : 'MAL'} pronto       slash   parry=${x.parried} daño=${x.took}`);
}
if (errs.length) console.log(errs.join('\n'));
await b.close();
process.exit(fail || errs.length ? 1 : 0);
