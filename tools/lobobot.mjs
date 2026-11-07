// Prueba de equilibrio de la pelea con el Lobishome: un jugador automático
// (con su tiempo de reacción, sus errores y su manera de pelear) entra por la
// niebla y pelea hasta vencer o morir. Cuenta cuánto dura cada fase, de dónde
// le viene el daño, cuántas ampollas gasta, cuántas veces le agarra, etc.
//   node tools/lobobot.mjs [perfil] [equipo] [peleas]
//     perfil: novato | medio | bueno          (por omisión: medio)
//     equipo: base (100 de vida, 3 ampollas, daño ×1)
//             medio (130, 4, ×1,25)            (por omisión: medio)
//   (requiere npx vite --port 5199)
import { chromium } from 'playwright';

const [perfil = 'medio', equipo = 'medio', peleas = '3'] = process.argv.slice(2);
const PERFILES = {
  // react: lo que tarda en ver venir el golpe; lead: cuánto antes del golpe
  // rueda (y cuánto se equivoca); ve: si se da cuenta (a la luz / a oscuras);
  // techo: si ve el polvo que cae de la bóveda; mash: pulsaciones por segundo
  // al forcejear; cura: con cuánta vida bebe; combo: golpes seguidos;
  // braseros: si enciende los braseros; fuerte: el golpe fuerte cuando está
  // aturdido; bloquea: la guardia (con el escudo) en vez de rodar; escapa:
  // si sale rodando del primer golpe de uno doble
  novato: { react: [0.3, 0.5], lead: [0.2, 0.15], ve: [0.75, 0.45], techo: 0.35, mash: 5, cura: 0.5, combo: 2, braseros: 0.5, fuerte: 0.1, bloquea: 0.35, escapa: 0.3 },
  medio: { react: [0.22, 0.38], lead: [0.15, 0.1], ve: [0.88, 0.65], techo: 0.65, mash: 6.5, cura: 0.45, combo: 2, braseros: 1, fuerte: 0.35, bloquea: 0.45, escapa: 0.6 },
  bueno: { react: [0.16, 0.28], lead: [0.12, 0.06], ve: [0.96, 0.82], techo: 0.9, mash: 8, cura: 0.4, combo: 3, braseros: 1, fuerte: 0.6, bloquea: 0.25, escapa: 0.9 },
};
const EQUIPOS = {
  base: { hp: 100, flasks: 3, dmg: 1 },
  medio: { hp: 130, flasks: 4, dmg: 1.25 },
};
const cfg = { ...PERFILES[perfil], ...EQUIPOS[equipo], traza: !!process.env.TRAZA, fase: +(process.env.FASE || 1) };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const res = [];
for (let n = 0; n < +peleas; n++) {
  const p = await b.newPage({ viewport: { width: 320, height: 200 } });
  const logs = [];
  p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  await p.goto('http://localhost:5199/?dev=1&items=espada,escudo');
  await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
  await p.evaluate(BOT);
  await p.evaluate((c) => window.__botInit(c), cfg);
  let r;
  for (let k = 0; k < 60; k++) {
    r = await p.evaluate(() => window.__botRun(10));
    if (r.traza) {
      console.log(r.traza.join('\n'));
      delete r.traza;
    }
    if (r.fin) break;
  }
  r.errores = logs.slice(0, 3);
  res.push(r);
  console.log(`pelea ${n + 1}: ${JSON.stringify(r)}`);
  await p.close();
}
const gan = res.filter((r) => r.fin === 'gana');
const media = (a) => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : '-');
console.log(`\n${perfil} / ${equipo}: gana ${gan.length} de ${res.length}; dura (ganando) ${media(gan.map((r) => r.t))} s; vida del lobo al morir ${media(res.filter((r) => r.fin !== 'gana').map((r) => r.loboHp))}`);
await b.close();

// --------------------------------------------------------------- el jugador
function BOT() {
  const g = window.__game;
  const p = g.player;
  const e = g.bosses.lobishome;
  const L = g.lobo;
  const inp = g.input;
  const R = Math.random;
  const U = (a, b) => a + (b - a) * R();
  const N = (m, s) => m + s * (R() + R() + R() - 1.5) * 1.15;
  const nav = () => {
    for (const h of g.navHondas) if (p.pos.y > h.y0 && p.pos.y < h.y1) return h.nav;
    return null;
  };
  let B;
  window.__botInit = (cfg) => {
    window.__pause = true;
    g.input.enabledPointerLock = false;
    g.ui.closeAll();
    g.state = 'play';
    p.baseMaxHp = cfg.hp;
    p.refreshMaxHp();
    p.maxFlasks = cfg.flasks;
    p.dmgMul = cfg.dmg;
    p.spawn(27.5, -17, -12.6, Math.PI);
    p.hp = p.maxHp;
    p.flasks = p.maxFlasks;
    for (let i = 0; i < 15; i++) g.update(1 / 30);
    g.enterFog(g.interact.list.find((i) => i.id === 'f_lobo'));
    // (para mirar una fase sola: FASE=2 o 3)
    if (cfg.fase > 1) {
      for (let i = 0; i < 120; i++) g.update(1 / 30);
      e.hp = e.maxHp * (cfg.fase === 2 ? 0.64 : 0.29);
      e.data.fase = cfg.fase;
      e.data.phase = cfg.fase;
      e.data.final = cfg.fase === 3;
      e.data.modo = cfg.fase === 2 ? 'pelea' : 'retirada';
      e.data.dest = null;
      e.data.cuatro = cfg.fase === 3;
    }
    B = window.__B = {
      cfg,
      t: 0,
      tapped: [],
      planes: [],
      serial: e.atkSerial || 0,
      hp: p.hp,
      ehp: e.hp,
      combo: 0,
      atras: 0,
      techo: null,
      ruta: null,
      rutaT: 0,
      mashT: 0,
      lockT: 0,
      faseT: { 1: 0 },
      fase: 1,
      traza: cfg.traza ? [] : null,
      st: { dano: {}, hecho: 0, golpes: 0, rodadas: 0, ampollas: 0, presas: 0, entierros: 0, caidas: 0, braseros: 0, lunas: 0, aturdido: 0 },
    };
  };
  const tap = (c) => {
    inp.keys.add(c);
    inp.kPressed.add(c);
    B.tapped.push(c);
  };
  const dist = (x, z) => Math.hypot(x - p.pos.x, z - p.pos.z);
  // ¿hacia dónde rodar? de lado respecto a él (al lado con más sitio)
  // (contra lo que barre ancho, como el zarpazo doble, hacia atrás, fuera de
  // su alcance; contra lo que va recto, como la embestida, de lado)
  const ladoLibre = (a) => {
    const dx = e.pos.x - p.pos.x,
      dz = e.pos.z - p.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const n = nav();
    const atras = { x: -dx / d, z: -dz / d };
    const libre = (v) => (n ? n.walkable(p.pos.x + v.x * 2.6, p.pos.z + v.z * 2.6, p.pos.y) : true);
    if (a && (a.arc || 90) >= 110 && libre(atras)) return atras;
    const nx = -dz / d,
      nz = dx / d;
    for (const s of [1, -1]) if (libre({ x: nx * s, z: nz * s })) return { x: nx * s, z: nz * s };
    // sin sitio a los lados: hacia atrás
    return atras;
  };
  // ir a un punto por la red (A*), sin atravesar paredes
  const ir = (x, z, m = 1) => {
    const n = nav();
    if (!B.ruta || B.rutaT <= 0 || B.ruta.gx !== x || B.ruta.gz !== z) {
      const r = n && n.path(p.pos.x, p.pos.z, x, z, 6000, p.pos.y, p.pos.y);
      B.ruta = { gx: x, gz: z, pts: r ? r.pts.slice(1) : [[x, z]] };
      B.rutaT = 0.6;
    }
    let q = B.ruta.pts[0];
    while (q && dist(q[0], q[1]) < 0.5 && B.ruta.pts.length > 1) {
      B.ruta.pts.shift();
      q = B.ruta.pts[0];
    }
    if (!q) q = [x, z];
    const dx = q[0] - p.pos.x,
      dz = q[1] - p.pos.z;
    const d = Math.hypot(dx, dz);
    p.autoDir = d > 0.05 ? { x: dx / d, z: dz / d, m } : null;
  };
  const quieto = () => {
    p.autoDir = null;
  };
  // los golpes de él: cuándo pega (el primer golpe y los siguientes)
  const golpesDe = (a) => {
    if (a.hits && a.hits.length) return a.hits.map((h) => h[0]);
    if (a.events) return a.events.filter((v) => v.fn && v.fn.name === 'agarrar').map((v) => v.t).slice(0, 1);
    return [];
  };
  const alcance = (a) => (a.range || 2.5) + (a.lunge ? a.lunge.reduce((s, l) => s + (l[1] - l[0]) * l[2], 0) : 0);

  function decide(dt) {
    const c = B.cfg;
    const D = e.data || {};
    const d = dist(e.pos.x, e.pos.z);
    const luzE = L.luzEn(e.pos.x, e.pos.y, e.pos.z);
    const seVe = !D.oculto && ((L.vis ?? 0) > 0.3 || luzE > 0.3 || d < 3.5);
    // agarrado o enterrado: forcejear
    if (p.state === 'grabbed' || p.state === 'pinned') {
      quieto();
      B.mashT -= dt;
      if (B.mashT <= 0) {
        B.mashT = 1 / (c.mash * U(0.8, 1.2));
        tap('M0');
      }
      return;
    }
    // con la guardia alzada (el escudo), hasta que acaba su golpe
    if (B.guardia) {
      const G = B.guardia;
      if (e.state !== 'attack' || e.atkSerial !== G.s || e.stT > G.hasta || p.state === 'stagger') {
        inp.keys.delete('M2');
        inp.kReleased.add('M2');
        B.guardia = null;
      } else {
        p.autoDir = null;
        return;
      }
    }
    // (rodando: la dirección se mantiene unos fotogramas, como quien tiene
    // el stick hacia un lado al pulsar; si no, la rodada sale hacia atrás,
    // corta)
    if (B.rodar > 0) {
      B.rodar -= dt;
      p.autoDir = B.rodarDir;
      return;
    }
    // tocado por el primero de un golpe doble: salir rodando (se puede a la
    // cuarta parte de un segundo) antes del segundo
    if (p.state === 'hurt' && e.state === 'attack' && e.atk && e.atk.hits && B.hurtS !== p._hurtN) {
      B.hurtS = p._hurtN;
      const quedan = e.atk.hits.some((h) => h[0] > e.stT + 0.15);
      if (quedan && R() < c.escapa) {
        const dir = ladoLibre({ arc: 120 });
        B.rodarDir = { x: dir.x, z: dir.z, m: 1 };
        p.autoDir = B.rodarDir;
        B.rodar = 0.4;
        tap('Space');
        B.st.rodadas++;
        return;
      }
    }
    // un golpe nuevo: si lo ve venir, planea la rodada
    if (e.state === 'attack' && e.atkSerial !== B.serial) {
      B.serial = e.atkSerial;
      const a = e.atk;
      const ts = golpesDe(a);
      if (B.traza) B.traza.push(`   golpe ${a.name} d${d.toFixed(1)} alc${alcance(a).toFixed(1)} ve${seVe}`);
      const ve = ts.length && d < alcance(a) + 1.5 && R() < (seVe ? c.ve[0] : c.ve[1]);
      // (los zarpazos, la dentellada y la embestida se pueden parar con el
      // escudo: a veces, la guardia en vez de rodar)
      if (ve && a.hits && a.hits.length && !a.unblockable && p.st > 50 && p.state === 'free' && R() < c.bloquea) {
        B.guardia = { s: B.serial, hasta: Math.max(...a.hits.map((h) => h[1])) + 0.08 };
        inp.keys.add('M2');
        inp.kPressed.add('M2');
        p.autoDir = null;
        return;
      }
      if (ve) {
        const n2 = (a.arc || 90) >= 110 ? 1 : ts.length;
        for (let i = 0; i < n2; i++) {
          const tr = Math.max(i === 0 ? U(c.react[0], c.react[1]) : ts[i - 1] + 0.3, ts[i] - Math.max(0.02, N(c.lead[0], c.lead[1])));
          B.planes.push({ s: B.serial, t: tr, h: ts[i] });
          if (B.traza) B.traza.push(`   plan ${a.name} rodar@${tr.toFixed(2)} golpe@${ts[i]}`);
        }
      }
    }
    if (e.state !== 'attack') B.planes.length = 0;
    // la caída desde la bóveda: si ve el polvo, se aparta
    if (D.blanco && !B.techo) B.techo = { t: 0, ve: R() < c.techo, x: D.blanco.x, z: D.blanco.z, r: U(0.4, 0.8) };
    if (!D.blanco && B.techo && B.techo.t > 3) B.techo = null;
    if (B.techo) B.techo.t += dt;
    // la rodada planeada
    for (const pl of B.planes) {
      if (pl.hecho || pl.s !== e.atkSerial || e.stT < pl.t) continue;
      pl.hecho = true;
      if (p.state === 'free' || p.state === 'attack' || p.state === 'roll' || p.state === 'heal') {
        const dir = ladoLibre(e.atk);
        p.autoDir = { x: dir.x, z: dir.z, m: 1 };
        B.rodarDir = p.autoDir;
        B.rodar = 0.15;
        tap('Space');
        if (B.traza) B.traza.push(`   RUEDA @${e.stT.toFixed(2)} (${p.state})`);
        B.st.rodadas++;
        B.atras = 0.5;
        return;
      }
    }
    if (B.techo && B.techo.ve && B.techo.t > B.techo.r && dist(B.techo.x, B.techo.z) < 3.8) {
      const dx = p.pos.x - B.techo.x,
        dz = p.pos.z - B.techo.z;
      const dd = Math.hypot(dx, dz) || 1;
      const n = nav();
      let ox = dx / dd,
        oz = dz / dd;
      if (n && !n.walkable(p.pos.x + ox * 2, p.pos.z + oz * 2, p.pos.y)) {
        ox = -oz;
        oz = dx / dd;
      }
      p.autoDir = { x: ox, z: oz, m: 1 };
      return;
    }
    // fijar la vista cuando se le ve
    B.lockT -= dt;
    if (!g.lockTarget && seVe && d < 16 && B.lockT <= 0) {
      B.lockT = U(0.3, 0.7);
      g.setLock(e);
    }
    // beber: lejos de él, mientras se va, o cuando no puede pegarte (aturdido,
    // frenando, mirando la luna); con poca vida, en cuanto hay un hueco
    const quieto2 = e.state === 'stagger' || D.luna || (e.state === 'attack' && e.atk && e.atk.name === 'frena');
    const lejos = d > 6 || D.modo === 'retirada' || D.modo === 'acecho' || quieto2 || (d > 4 && e.state !== 'attack');
    const poca = p.hp < p.maxHp * 0.25 && d > 3 && e.state !== 'attack';
    // (o acabado su golpe, si aún le queda un rato de recuperarse)
    const tras = e.state === 'attack' && e.atk && e.atk.hits && e.atk.hits.length && e.stT > Math.max(...e.atk.hits.map((h) => h[1])) + 0.05 && e.atk.dur - e.stT > 0.45;
    if (tras && p.hp < p.maxHp * c.cura && p.flasks > 0 && p.state === 'free' && R() < 0.5 * dt * 30) {
      tap('KeyR');
      B.st.ampollas++;
      quieto();
      return;
    }
    if (p.hp < p.maxHp * c.cura && p.flasks > 0 && p.state === 'free' && (lejos || poca) && !(e.state === 'attack' && !quieto2)) {
      tap('KeyR');
      B.st.ampollas++;
      quieto();
      return;
    }
    // pegarle cuando se puede: aturdido, mirando la luna, o acabado su golpe
    const a = e.atk;
    // (la presa no tiene golpes: sus mordiscos son los avisos de agarrar)
    const ts = a && e.state === 'attack' ? [...(a.hits || []).map((h) => h[1]), ...(a.events || []).filter((v) => v.fn && v.fn.name === 'agarrar').map((v) => v.t + 0.12)] : [];
    const finGolpe = ts.length ? Math.max(...ts) : 0;
    const abierto = e.state === 'stagger' || D.luna || (e.state === 'attack' && a && a.name !== 'aullido' && e.stT > finGolpe + 0.05) || (D.modo === 'pelea' && e.state === 'chase' && d < 2.6);
    B.atras -= dt;
    if (abierto && d < 2.7 && p.st > 18 && B.atras <= 0) {
      if (!g.lockTarget) g.setLock(e);
      const dx = e.pos.x - p.pos.x,
        dz = e.pos.z - p.pos.z;
      p.autoDir = d > 1.9 ? { x: dx / d, z: dz / d, m: 0.7 } : null;
      if ((p.state === 'free' || (p.state === 'attack' && p.stT > 0.3)) && B.combo < (e.state === 'stagger' || D.luna ? c.combo + 1 : c.combo)) {
        // (aturdido o mirando la luna: a veces, el golpe fuerte)
        if ((e.state === 'stagger' || D.luna) && B.combo === 0 && p.st > 40 && R() < c.fuerte) {
          tap('KeyF');
          B.combo = 9;
        } else {
          tap('M0');
          B.combo++;
        }
      }
      return;
    }
    if (p.state === 'free' && B.combo > 0 && p.stT > 0.1) {
      B.combo = 0;
      B.atras = U(0.3, 0.8);
    }
    // a la luz: un brasero encendido cerca, o encender uno
    const fase = D.fase || 1;
    if (D.modo !== 'pelea' && c.braseros > 0 && D.modo !== 'carga') {
      let lit = null,
        unlit = null;
      for (const q of L.braseros) {
        const dq = dist(q.x, q.z);
        if (Math.abs(q.y - p.pos.y) > 2) continue;
        if (q.lit && dq < 14 && (!lit || dq < dist(lit.x, lit.z))) lit = q;
        if (!q.lit && dq < 14 && (!unlit || dq < dist(unlit.x, unlit.z))) unlit = q;
      }
      if (lit) {
        if (dist(lit.x, lit.z) > 2.2) return ir(lit.x, lit.z, 0.8);
      } else if (unlit && R() < c.braseros && (d > 7 || D.modo === 'retirada' || D.modo === 'acecho')) {
        if (dist(unlit.x, unlit.z) > 1.3) return ir(unlit.x, unlit.z, 1);
        const it = g.interact.list.find((i) => i.id === 'ib_' + unlit.id);
        if (it) {
          const dx = unlit.x - p.pos.x,
            dz = unlit.z - p.pos.z;
          p.yaw = Math.atan2(dx, dz);
          p.autoDir = null;
          B.eT = (B.eT || 0) - dt;
          if (p.state === 'free' && g.promptTarget === it && B.eT <= 0) {
            B.eT = 0.8;
            tap('KeyE');
            B.st.braseros++;
          } else if (p.state === 'free') p.autoDir = { x: dx / (Math.hypot(dx, dz) || 1), z: dz / (Math.hypot(dx, dz) || 1), m: 0.3 };
        }
        return;
      }
    }
    // en la pelea abierta (segunda fase): a su lado, con aguante; si no, a
    // distancia
    if (D.modo === 'pelea' && seVe) {
      // (con la vida justa, a distancia, a beber)
      if (p.hp < p.maxHp * c.cura && p.flasks > 0 && d < 5) {
        const dx = p.pos.x - e.pos.x,
          dz = p.pos.z - e.pos.z;
        p.autoDir = { x: dx / d, z: dz / d, m: 1 };
        return;
      }
      if (p.st > 45 && d > 2.3) return ir(e.pos.x, e.pos.z, 0.8);
      if (p.st < 30 && d < 4.5) {
        const dx = p.pos.x - e.pos.x,
          dz = p.pos.z - e.pos.z;
        p.autoDir = { x: dx / d, z: dz / d, m: 0.6 };
        return;
      }
    }
    void fase;
    quieto();
  }

  window.__botRun = (sec) => {
    const dt = 1 / 30;
    for (let k = 0; k < sec * 30; k++) {
      for (const c of B.tapped) {
        inp.keys.delete(c);
        inp.kReleased.add(c);
      }
      B.tapped = [];
      B.rutaT -= dt;
      if (g.state === 'play' && !p.dead) decide(dt);
      g.update(dt);
      B.t += dt;
      // lo que ha pasado
      const D = e.data || {};
      const f = D.fase || 1;
      if (f !== B.fase) {
        B.fase = f;
        B.faseT[f] = +B.t.toFixed(1);
      }
      if (p.hp < B.hp) p._hurtN = (p._hurtN || 0) + 1;
      if (p.hp < B.hp) {
        const k2 = e.state === 'attack' && e.atk ? e.atk.name : e.state;
        B.st.dano[k2] = (B.st.dano[k2] || 0) + Math.round(B.hp - p.hp);
      }
      B.hp = p.hp;
      if (e.hp < B.ehp) {
        B.st.hecho += Math.round(B.ehp - e.hp);
        B.st.golpes++;
      }
      B.ehp = e.hp;
      if (e.state === 'arrastrando' && B._pr !== e.atkSerial) {
        B._pr = e.atkSerial;
        B.st.presas++;
      }
      if (e.state === 'enterrando' && B._en !== e.atkSerial) {
        B._en = e.atkSerial;
        B.st.entierros++;
      }
      if (e.state === 'attack' && e.atk && e.atk.name === 'caida' && B._ca !== e.atkSerial) {
        B._ca = e.atkSerial;
        B.st.caidas++;
      }
      if (D.luna && !B._lu) B.st.lunas++;
      B._lu = !!D.luna;
      if (e.state === 'stagger' && B._st !== true) B.st.aturdido++;
      B._st = e.state === 'stagger';
      if (B.traza && (k % 15 === 0 || p.state !== B._ps)) B.traza.push(`${B.t.toFixed(1)} p:${p.state}${p.autoDir ? '>' : ''} hp${Math.round(p.hp)} st${Math.round(p.st)} | e:${e.state}/${D.modo}${e.atk && e.state === 'attack' ? ':' + e.atk.name + '@' + e.stT.toFixed(2) : ''} d${Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z).toFixed(1)} luz${L.luzEn(e.pos.x, e.pos.y, e.pos.z).toFixed(2)} vis${(L.vis ?? 0).toFixed(2)}`);
      B._ps = p.state;
      if (p.dead || e.dead) break;
    }
    const D = e.data || {};
    const out = { t: +B.t.toFixed(1), hp: Math.round(p.hp), quedan: p.flasks, loboHp: Math.round(e.hp), fase: D.fase, modo: D.modo, faseT: B.faseT, ...B.st };
    if (B.traza) out.traza = B.traza.splice(0);
    if (e.dead) out.fin = 'gana';
    else if (p.dead) out.fin = 'muere';
    else if (B.t > 600) out.fin = 'tiempo';
    return out;
  };
}
