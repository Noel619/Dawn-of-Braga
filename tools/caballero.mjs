// La pelea del Caballero de la Orden, pieza a pieza: el desvío (de frente,
// en guardia) y su contra; el parry de la acometida (dos seguidos le abren)
// y el golpe de gracia; el hueco tras el salto; la defensa de armadura con
// cada espada; la segunda fase (el pendón); la muerte (de rodillas) y que,
// si mueres tú, todo vuelve a su sitio.
//   node tools/caballero.mjs        (requiere npx vite --port 5199)
import { chromium } from 'playwright';
import { FORT } from '../src/world/fortaleza_medidas.js';
// en la terraza de la torre del homenaje (FORT.torre): su suelo, dónde se
// espera ante la niebla (en la caseta del caracol) y un sitio despejado en
// medio, al sur del Caballero
const Y = FORT.torre.terraza;
const CASETA = { x: -105.7, z: -108.6 };
const MEDIO = { x: FORT.torre.caballero.x - 5, z: FORT.torre.caballero.z + 12.3 };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 180 } });
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
await p.goto('http://localhost:5199/?dev=1&items=espada,escudo,solingen,oxidada');
await p.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const r = await p.evaluate(([Y, CASETA, C]) => {
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
  const out = [];
  const e = g.enemies.find((x) => x.type === 'caballero');
  const A = (n) => e.T.attacks.find((a) => a.name === n);
  g.flags['cine:caballero'] = true;
  P.spawn(CASETA.x, Y, CASETA.z, Math.PI / 2);
  step(20);
  g.enterFog(g.interact.list.find((i) => i.id === 'f_caballero'));
  // (el plano de presentación: 2,4 s)
  step(170);
  out.push(`pelea: activeBoss ${g.activeBoss === e} estado ${e.state}`);
  const face = (d, yawE = 0) => {
    e.atk = null;
    e.state = 'chase';
    e.cooldown = 99;
    e.data.openT = 0;
    e.body.pos.set(C.x, Y, C.z - d);
    e.vx = e.vz = 0;
    e.yaw = 0;
    e.anim.stop(0);
    P.spawn(C.x, Y, C.z, Math.PI);
    P.hp = P.maxHp = 400;
    P.st = P.maxSt;
    g.lockTarget = e;
    step(2);
    e.cooldown = 99;
    void yawE;
  };
  // --- 1. el desvío: le atacas de frente, en guardia
  P.setEquipment(true, true);
  P.equipWeapon('espada');
  face(1.9);
  // (sacar la espada lleva un momento)
  step(50);
  e.body.pos.set(C.x, Y, C.z - 1.9);
  e.yaw = 0;
  e.cooldown = 99;
  let hp0 = e.hp, ph0 = P.hp;
  step(1, ['M0']);
  let sawContra = false, blocked = false;
  for (let i = 0; i < 70; i++) {
    step(1);
    if (e.atk && e.atk.name === 'contra') sawContra = true;
  }
  out.push(`desvío: daño al caballero ${hp0 - e.hp} · contra ${sawContra} · te quitó ${ph0 - P.hp}`);
  // --- 2. el parry de la acometida (lead 0.06 s antes de que llegue)
  const parryDash = () => {
    face(6.5);
    e.parryHits = 0;
    e.startAttack(A('acometida'));
    e.data.chainLeft = 1;
    const res = [];
    let pressed = false,
      lastAtk = null;
    for (let i = 0; i < 160; i++) {
      // (cada acometida, su pulsación; la encadenada empieza ya a 0,1 s)
      if (e.atk !== lastAtk) {
        pressed = false;
        lastAtk = e.atk;
      }
      const tap = [];
      const d = e.distTo(P.pos);
      const ac = e.state === 'attack' && e.atk && e.atk.name === 'acometida';
      // (sale a 0,26 s; la punta va 1,6 m por delante, a 11-26 m/s: de cerca,
      // se pulsa justo al salir; de lejos, cuando la punta está a punto)
      const v = Math.max(11, Math.min(26, (d + 1.8) / 0.32));
      const eta = Math.max(0, 0.26 - e.stT) + Math.max(0, d - 1.6 - 0.7) / v;
      if (!pressed && ac && e.stT > 0.12 && e.stT < 0.6 && eta < 0.08) { tap.push('M2'); pressed = true; }
      step(1, tap);
      if (P.state === 'parry' && res[res.length - 1] !== 'parry:' + e.state) res.push('parry:' + e.state);
      if (e.state === 'parried') break;
    }
    return res;
  };
  const pr = parryDash();
  out.push(`parry de la acometida: ${pr.join(' ')} · estado ${e.state} · abierto ${e.parryT > 0}`);
  if (e.state === 'parried') {
    hp0 = e.hp;
    step(16);
    step(1, ['M0']);
    let rip = false;
    for (let i = 0; i < 90; i++) {
      step(1);
      if (P.state === 'attack' && P.atk && P.atk.riposte) rip = true;
      if (rip && P.state !== 'attack') break;
    }
    out.push(`golpe de gracia (espada del carcelero): ${rip} · daño ${hp0 - e.hp}`);
  }
  // --- 3. el hueco tras el salto, y la armadura con cada espada
  const salto = (arma) => {
    P.equipWeapon(arma);
    face(7);
    e.startAttack(A('salto'));
    let landed = false;
    for (let i = 0; i < 120; i++) {
      step(1);
      if (e.data.landed) { landed = true; break; }
    }
    // (te pones a su lado, no donde clava)
    P.spawn(e.pos.x + 1.4, Y, e.pos.z + 0.4, Math.atan2(e.pos.x - (e.pos.x + 1.4), e.pos.z - (e.pos.z + 0.4)));
    P.hp = P.maxHp;
    step(4);
    const h0 = e.hp;
    step(1, ['M0']);
    for (let i = 0; i < 30; i++) step(1);
    return `${arma}: cae ${landed}, hueco ${(e.data.openT || 0) > -1}, daño ${h0 - e.hp}`;
  };
  out.push('tras el salto · ' + ['oxidada', 'espada', 'solingen'].map(salto).join(' · '));
  // --- 4. la segunda fase: a media vida, el pendón
  P.equipWeapon('espada');
  face(6);
  e.hp = Math.round(e.maxHp * 0.49);
  e.cooldown = 0;
  const seen = [];
  for (let i = 0; i < 60 * 6; i++) {
    step(1);
    const s = e.atk ? e.atk.name : e.state;
    if (seen[seen.length - 1] !== s) seen.push(s);
    if (e.data.phase2 && i > 30 && e.state === 'chase') break;
  }
  const grp = g.groups['pendon:caballero'];
  out.push(`segunda fase: ${e.data.phase2} · ${seen.slice(0, 6).join(' → ')} · pendón del mundo ${grp && grp.on} · en su mano ${e._pendon.every((m) => m.visible)} · paño ${g.caballero.cloth.visible}`);
  // la carga del pendón
  face(4);
  e.data.phase2 = true;
  e.data.pendon = true;
  ph0 = P.hp;
  e.startAttack(A('pendon'));
  for (let i = 0; i < 110; i++) step(1);
  out.push(`la carga del pendón: te quitó ${ph0 - P.hp}`);
  // --- 5. muere: de rodillas, se queda
  face(1.5);
  e.hp = 1;
  e.data.openT = 1;
  step(1, ['M0']);
  for (let i = 0; i < 60 * 4; i++) step(1);
  for (let i = 0; i < 60 * 6; i++) step(1);
  const vis1 = e.obj.visible;
  // (como al cargar la partida)
  g.applyWorldState();
  for (let i = 0; i < 60; i++) step(1);
  const hy = e.rig.worldPos('head', new g.THREE.Vector3()).y - e.pos.y;
  out.push(`muerte: muerto ${e.dead} · bandera ${!!g.flags['boss:caballero']} · se queda a la vista ${vis1} · tras cargar ${e.obj.visible} en ${e.pos.x.toFixed(1)},${e.pos.z.toFixed(1)} (cabeza a ${hy.toFixed(2)} m: de rodillas) · activeBoss ${!!g.activeBoss} · pendón del mundo ${g.groups['pendon:caballero'].on}`);
  return out;
}, [Y, CASETA, MEDIO]);
console.log(r.join('\n'));
if (errs.length) console.log(errs.slice(0, 10).join('\n'));
await b.close();
process.exit(errs.length ? 1 : 0);
