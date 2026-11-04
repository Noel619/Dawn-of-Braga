// La pelea del Caballero de la Orden, pieza a pieza: la escena de la luna,
// entera; el desvío (de frente, en guardia) y su contra; el parry de la
// acometida (dos seguidos le abren: la carga y la segunda que le queda) y el
// golpe de gracia; el hueco tras el salto; la defensa de armadura con cada
// espada; la segunda fase (el pendón); vencido, la escena del final (el
// choque, el salto atrás, la espada clavada, la almena) y cómo queda, abajo
// en la alberca, también al cargar la partida.
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
  // --- 0. la escena de la luna, entera: al acabar, la pelea
  P.spawn(CASETA.x, Y, CASETA.z, Math.PI / 2);
  step(40);
  g.enterFog(g.interact.list.find((i) => i.id === 'f_caballero'));
  const c0 = g.cutscene && g.cutscene.constructor.name;
  let n0 = 0;
  for (; g.cutscene && n0 < 60 * 40; n0++) step(1);
  out.push(`escena de la luna: ${c0} · ${(n0 / 60).toFixed(1)} s · bandera ${!!g.flags['cine:caballero']} · tú ${P.state}, a ${Math.hypot(P.pos.x - e.pos.x, P.pos.z - e.pos.z).toFixed(1)} m de él`);
  step(30);
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
  // --- 2. el parry de la acometida: se prepara, carga en línea recta y la
  // punta llega (se pulsa un poco antes de que la punta esté a tres palmos);
  // le queda otra carga, la que le abre
  const TIP = new g.THREE.Vector3(0, -0.05, 1.16);
  const parryDash = () => {
    face(6.5);
    e.parryHits = 0;
    e.startAttack(A('acometida'));
    e.data.chainLeft = 1;
    const res = [];
    let pressed = false,
      lastAtk = null;
    for (let i = 0; i < 420; i++) {
      // (cada carga, su pulsación)
      if (e.atk !== lastAtk) {
        pressed = false;
        lastAtk = e.atk;
      }
      const tap = [];
      const corre = e.state === 'attack' && e.atk && e.atk.name === 'acometida' && e.data.fase === 'carga';
      if (!pressed && corre) {
        const tp = e.rig.worldPos('handR', new g.THREE.Vector3(), TIP);
        const v = Math.max(5, Math.hypot(e.vx, e.vz));
        const eta = Math.max(0, Math.hypot(P.pos.x - tp.x, P.pos.z - tp.z) - 0.75) / v;
        if (eta < 0.07) {
          tap.push('M2');
          pressed = true;
        }
      }
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
  for (let i = 0; i < 150; i++) step(1);
  out.push(`la carga del pendón: te quitó ${ph0 - P.hp}`);
  // --- 5. vencido: no muere ahí; la escena del final (el choque, el salto
  // atrás, el silencio, la espada clavada, la almena) y, abajo, en la alberca
  face(1.5);
  e.hp = 1;
  e.data.openT = 1;
  step(1, ['M0']);
  for (let i = 0; i < 60 && !g.cutscene; i++) step(1);
  const c1 = g.cutscene && g.cutscene.constructor.name;
  let n1 = 0;
  for (; g.cutscene && n1 < 60 * 45; n1++) step(1);
  step(60 * 3);
  const estado = () => {
    const hy = e.rig.worldPos('head', new g.THREE.Vector3()).y - e.pos.y;
    return `muerto ${e.dead} · a la vista ${e.obj.visible} · en ${e.pos.x.toFixed(1)},${e.pos.y.toFixed(1)},${e.pos.z.toFixed(1)} (cabeza a ${hy.toFixed(2)} m: tendido) · espada clavada ${!!(g.caballero.espada && g.caballero.espada.children.length)} · pendón en el suelo ${!!(g.caballero.suelo && g.caballero.suelo.visible)}`;
  };
  out.push(`el final: ${c1} · ${(n1 / 60).toFixed(1)} s · bandera ${!!g.flags['boss:caballero']} · activeBoss ${!!g.activeBoss} · tú ${P.state} · ${estado()}`);
  // (como al cargar la partida)
  g.applyWorldState();
  step(60);
  out.push(`tras cargar: ${estado()} · pendón en su asta ${g.groups['pendon:caballero'].on}`);
  return out;
}, [Y, CASETA, MEDIO]);
console.log(r.join('\n'));
if (errs.length) console.log(errs.slice(0, 10).join('\n'));
await b.close();
process.exit(errs.length ? 1 : 0);
