// La Corte de los Infieles, de principio a fin (sin pelear: el jugador no se
// defiende y, cada 1,6 s, cae el más antiguo de los que están en pie): pisar
// el estrado, la puerta del servicio que se cierra, las tres oleadas, los
// señalados y sus puñaladas, el mayordomo y lo que pasa al vencerla (las
// puertas, la llave, los cuerpos).
//   node tools/corte.mjs      (requiere npx vite --port 5199)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 200 } });
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + '\n' + e.stack));
await p.goto('http://localhost:5199/?dev=1&items=espada,escudo');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
const r = await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  g.ui.closeAll();
  g.input.enabledPointerLock = false;
  const P = g.player;
  P.maxHp = P.hp = 99999;
  const out = [];
  const C = g.corte;
  out.push(`cortesanos ${C.list.length}, mayordomo ${!!C.may}, estado ${C.state}`);
  P.spawn(-74, 1.5, -95, -Math.PI / 2);
  for (let i = 0; i < 30; i++) g.update(1 / 60);
  out.push(`en la sala: (${P.pos.x.toFixed(1)}, ${P.pos.y.toFixed(2)}, ${P.pos.z.toFixed(1)}) zona ${g.zone && g.zone.id}`);
  // al estrado, andando por el pasillo de en medio
  let t = 0;
  while (t < 15 && C.state === 'idle') {
    const dx = -100 - P.pos.x, dz = -95 - P.pos.z, d = Math.hypot(dx, dz);
    P.autoDir = { x: dx / d, z: dz / d, m: 1 };
    g.update(1 / 60);
    t += 1 / 60;
  }
  P.autoDir = null;
  out.push(`al estrado en ${t.toFixed(1)} s: estado ${C.state} en (${P.pos.x.toFixed(1)}, ${P.pos.y.toFixed(2)}, ${P.pos.z.toFixed(1)})`);
  const sv = g.interact.list.find((i) => i.id === 'd_servicio');
  out.push(`puerta del servicio: abierta=${sv.done} lock=${sv.lock.type}`);
  // la pelea: el jugador no ataca; se cuentan las puñaladas y, cada 1,6 s,
  // muere el más antiguo de los levantados
  let marks = 0, stabs = 0, hitsTaken = 0, lastHp = P.hp, killT = 0, tt = 0;
  const seen = new Set();
  const olas = [];
  let lastOla = C.ola;
  while (tt < 160 && C.state === 'fight') {
    const m = C.marked;
    if (m && !seen.has(m)) { seen.add(m); marks++; }
    for (const e of C.list) if (e.state === 'attack' && !e.data._counted) { e.data._counted = true; stabs++; }
    for (const e of C.list) if (e.state !== 'attack') e.data._counted = false;
    if (P.hp < lastHp) hitsTaken++;
    lastHp = P.hp;
    if (C.ola !== lastOla) { olas.push(`ola ${lastOla}→${C.ola} a ${tt.toFixed(1)} s`); lastOla = C.ola; seen.clear(); }
    killT += 1 / 60;
    if (killT > 1.6) {
      killT = 0;
      const up = C.list.filter((e) => !e.dead && e.data.corte && e.state !== 'rise');
      if (up.length) up[0].takeHit(999, 999, P.pos.x, P.pos.z, true, 0);
      else if (C.may && C.may.data.corte && !C.may.dead && C.may.state !== 'rise') C.may.takeHit(999, 999, P.pos.x, P.pos.z, true, 0);
    }
    P.hp = Math.max(P.hp, 50000);
    g.update(1 / 60);
    tt += 1 / 60;
  }
  out.push(...olas);
  out.push(`fin a ${tt.toFixed(1)} s: estado ${C.state}; señalados ${marks}, puñaladas ${stabs}, golpes recibidos ${hitsTaken}`);
  out.push(`vencida=${!!g.flags['corte:vencida']} mayordomo muerto=${!!g.flags['dead:mayordomo']} d_sala=${!!g.flags['door:d_sala']} servicio=${sv.done}/${sv.lock.type}`);
  const key = g.interact.list.find((i) => i.id === 'i_llave_mayordomo');
  out.push(`llave: visible=${key && key.obj && key.obj.visible} en (${key.x.toFixed(1)}, ${key.y.toFixed(2)}, ${key.z.toFixed(1)})`);
  const vis = C.list.filter((e) => e.obj.visible).length;
  out.push(`cuerpos a la vista: ${vis}/${C.list.length}`);
  return out;
});
console.log(r.join('\n'));
console.log(errs.slice(0, 5).join('\n'));
await b.close();
