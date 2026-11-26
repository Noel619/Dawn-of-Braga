// Los refugios, uno a uno, como los asegura quien juega (PLAN_REFUGIOS.md, §7):
//  - lo que tiene: su rincón (la imagen, el candil y su llama), sus puertas,
//    trampillas y ventanas, los que se encerraron dentro;
//  - encenderlo: no con alguien dentro ni con algo abierto; muertos los de
//    dentro y cerrado todo, se enciende (y los de dentro se pueden matar: los
//    del techo se cuelgan a menos de cinco metros, que se sueltan);
//  - lo que importa: al caer te levantas en su rincón y, con todo cerrado,
//    ninguna criatura de fuera llega andando hasta ahí (su navegación: las
//    puertas cerradas de un refugio son muro) ni te percibe al aparecer (su
//    vista, su oído, su campo de visión, como en tools/altares.mjs);
//  - al recargar la partida sigue encendido y los de dentro no vuelven.
//   node tools/refugios.mjs              (todos)
//   node tools/refugios.mjs taberna,viuda
//   (requiere npx vite --port 5199)
import { chromium } from 'playwright';

const SOLO = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2].split(',') : null;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 180 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:' + (process.env.PORT || 5199) + '/?dev=1&items=espada,escudo,palanca');
await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
const out = await p.evaluate((SOLO) => {
  window.__pause = true;
  const g = __game,
    I = g.interact;
  g.input.enabledPointerLock = false;
  g.ui.closeAll();
  g.state = 'play';
  g.dev.god = true;
  const toasts = [];
  const t0 = g.ui.toast.bind(g.ui);
  g.ui.toast = (m, d) => {
    toasts.push(String(m));
    return t0(m, d);
  };
  const sim = (s) => {
    for (let k = 0; k < s * 30; k++) g.update(1 / 30);
  };
  const DEG = Math.PI / 180;
  const ad = (a, c) => {
    let d = a - c;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d;
  };
  const res = [];
  for (const R of g.refugios.map.values()) {
    if (SOLO && !SOLO.includes(R.id)) continue;
    const A = R.altar;
    const r = { id: R.id, nombre: A ? A.name : '?', fallos: [] };
    if (!A) {
      r.fallos.push('sin rincón (altar)');
      res.push(r);
      continue;
    }
    const [sx, sy, sz] = A.spawn;
    const zn = g.zoneAt({ x: sx, y: sy, z: sz });
    r.zona = zn && zn.id;
    if (!A.candil || !R.fuego || !R.luz) r.fallos.push('sin candil o sin su llama');
    r.dentro = R.criaturas.length;
    // (las del techo: si se cuelgan a más de cinco metros de su suelo, no se
    // sueltan nunca, y el refugio no se podría encender jugando)
    for (const e of R.criaturas) if (e.spec.idle === 'ceiling' && e.home.y - e.floorY >= 4.9) r.fallos.push(`${e.spec.id} cuelga a ${(e.home.y - e.floorY).toFixed(1)} m de su suelo: no se suelta nunca`);
    r.puertas = R.puertas.length;
    r.trampillas = R.cierres.length;
    r.ventanas = R.tablas.length + R.puertas.filter((d) => d.ventana).length;
    g.player.spawn(sx, sy, sz, A.yaw);
    sim(0.2);
    // (lo que pide antes: la casa de Henrique, la choza, el osario)
    if (A.pide) {
      I.use(A);
      if (g.refugios.encendido(R.id)) r.fallos.push('se enciende sin ' + A.pide);
      g.flags[A.pide] = true;
    }
    for (const d of R.puertas) if (d.refugioDesde) g.flags[d.refugioDesde] = true;
    // con alguien dentro, no
    if (R.criaturas.length) {
      for (const e of R.criaturas) e.reset();
      I.use(A);
      if (g.refugios.encendido(R.id)) r.fallos.push('se enciende con alguien dentro');
    }
    for (const e of R.criaturas) {
      e.hp = 1;
      e.die();
    }
    sim(0.5);
    // con algo abierto, no (se abre una puerta para probarlo)
    const d0 = R.puertas.find((d) => !d.done && !d.ajar && !d.tapiada);
    if (d0) {
      I.setOpen(d0, true);
      g.flags['door:' + d0.id] = true;
      g.player.spawn(sx, sy, sz, A.yaw);
      sim(0.2);
      I.use(A);
      if (g.refugios.encendido(R.id)) r.fallos.push('se enciende con ' + d0.id + ' abierta');
    }
    // se cierra todo, desde dentro, y se enciende
    g.player.spawn(sx, sy, sz, A.yaw);
    sim(0.2);
    for (const d of R.puertas) if (d.done || d.ajar) I.cerrar(d);
    for (const c of R.cierres) if (I.cierreAbierto(c)) I.echarCierre(c, true);
    for (const t of R.tablas) g.flags['board:' + t.win] = true;
    sim(1.2);
    const f = g.refugios.faltan(R);
    if (f.huecos) r.fallos.push('cerrado todo, quedan huecos: ' + JSON.stringify(f));
    g.player.spawn(sx, sy, sz, A.yaw);
    sim(0.2);
    I.use(A);
    r.encendido = g.refugios.encendido(R.id);
    if (!r.encendido) r.fallos.push('no se enciende: ' + toasts[toasts.length - 1]);
    // al caer: dónde te levantas
    g.lastAltar = A.id;
    g.player.spawn(0, 0, 0, 0);
    g.respawnAtAltar();
    const P = g.player.pos;
    r.levanta = Math.hypot(P.x - sx, P.z - sz) < 0.5 && Math.abs(P.y - sy) < 0.6;
    if (!r.levanta) r.fallos.push(`te levantas en ${P.x.toFixed(1)}, ${P.y.toFixed(1)}, ${P.z.toFixed(1)}`);
    // las de fuera, en su puesto (como al descansar): quién llega andando y
    // quién te percibe
    let cerca = null,
      llega = null,
      percibe = null;
    for (const e of g.enemies) {
      if (e.dead || g.bossGone(e) || R.criaturas.includes(e)) continue;
      const T = e.T,
        h = e.home;
      if (T.friendly || !(T.sight > 0)) continue;
      const d = Math.hypot(h.x - sx, h.z - sz);
      if (d > 40) continue;
      const dy = h.y - sy;
      if (Math.abs(dy) <= 3.2 && (!cerca || d < cerca.d)) cerca = { id: e.spec.id, tipo: e.type, d: +d.toFixed(1) };
      const los = g.world.col.lineOfSight(h.x, h.y + (T.height || 1.8) * 0.8, h.z, sx, sy + 1.4, sz);
      let sight = T.sight || 0;
      if (['eat', 'pray', 'window', 'pound'].includes(e.idle)) sight *= 0.45;
      const fov = Math.abs(ad(h.yaw || 0, Math.atan2(sx - h.x, sz - h.z))) <= (T.fov ?? 120) * 0.5 * DEG;
      if (Math.abs(dy) <= 3.2 && los && (d < (T.hear || 0) || (d < sight && fov)) && !percibe) percibe = { id: e.spec.id, tipo: e.type, d: +d.toFixed(1) };
      if (Math.abs(dy) > 3.2) continue;
      try {
        e.body.pos.set(h.x, h.y, h.z);
        const nav = e.nav(sx, sy, sz);
        const q = nav && nav.path(h.x, h.z, sx, sz, 40000, h.y, sy);
        if (q && q.complete && q.pts) {
          let L = 0,
            px = h.x,
            pz = h.z;
          for (const w of q.pts) {
            const wx = w.x ?? w[0],
              wz = w.z ?? w[1];
            L += Math.hypot(wx - px, wz - pz);
            px = wx;
            pz = wz;
          }
          L += Math.hypot(sx - px, sz - pz);
          if (!llega || L < llega.anda) llega = { id: e.spec.id, tipo: e.type, anda: +L.toFixed(1) };
        }
      } catch (err) {}
    }
    for (const e of g.enemies) if (!e.dead) e.reset();
    r.cerca = cerca;
    r.llega = llega;
    r.percibe = percibe;
    if (llega) r.fallos.push(`${llega.tipo} ${llega.id} llega andando (${llega.anda} m)`);
    if (percibe) r.fallos.push(`${percibe.tipo} ${percibe.id} te percibe al aparecer (${percibe.d} m)`);
    // al recargar
    g.saveGame();
    g.applyWorldState();
    sim(0.3);
    r.recarga = g.refugios.encendido(R.id) && R.criaturas.every((e) => e.dead && !e.obj.visible) && R.fuego.on;
    if (!r.recarga) r.fallos.push('al recargar se pierde algo');
    res.push(r);
  }
  return res;
}, SOLO);
let malos = 0;
for (const r of out) {
  const ok = !r.fallos.length;
  if (!ok) malos++;
  console.log(`${ok ? 'bien ' : 'FALLA'}  ${r.id.padEnd(13)} ${String(r.nombre).padEnd(28)} ${String(r.zona).padEnd(18)} dentro ${r.dentro ?? '-'} · puertas ${r.puertas ?? '-'} · trampillas ${r.trampillas ?? '-'} · ventanas ${r.ventanas ?? '-'} · la más cercana: ${r.cerca ? r.cerca.d + ' m (' + r.cerca.tipo + ')' : 'ninguna'}`);
  for (const f of r.fallos) console.log('         ' + f);
}
console.log(`\n${out.length} refugios: ${out.length - malos} bien, ${malos} con fallos`);
if (logs.length) console.log(logs.join('\n'));
await b.close();
process.exit(malos ? 1 : 0);
