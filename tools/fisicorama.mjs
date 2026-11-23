// La rama del Físico que se queda sin pelear: se le escapa el paciente por el
// otro camino (el ventano de la tintorería y la trampilla del almacén del
// cáñamo, y por dentro de la cordelería a los Pelames) y, más adelante, en la
// cisterna de la cloaca, mata al Desfigurado por la espalda; detrás de él, la
// bruma negra y sus Coronados de la bruma (game/fisico_rama.js).
//   node tools/fisicorama.mjs [partes: huida,herido,escena,pelea,cae,cuerpo] [fotos]
//   huida: por el otro camino sin tocarle (se le escapa: su nota, él se va)
//   herido: lo mismo, habiéndole herido en la calle (no se le escapa)
//   escena: la cisterna: el Desfigurado en el pretil, hablarle, bajar, la
//           escena (sus banderas, el cuerpo en la alberca, la bruma)
//   pelea: los Coronados de la bruma y las órdenes de la campanilla, hasta
//          vencerles (él se va con la bruma)
//   cae: caer en la pelea y volver (vuelve a empezar, sin la escena)
//   cuerpo: el cuerpo en la alberca (la llave de la reja) y su mesa (el
//           cuaderno)
//   fotos: capturas de la escena (tools/shots/rama_<i>.png)
//   (con npx vite --port 5199 en marcha; si no lo está, levanta el suyo)
import { chromium } from 'playwright';
const PORT = +(process.env.PORT || 5199);
let vite = null;
try {
  await fetch('http://localhost:' + PORT + '/');
} catch {
  const { createServer } = await import('vite');
  vite = await createServer({ server: { port: PORT, strictPort: true }, logLevel: 'error' });
  await vite.listen();
}
const partes = (process.argv[2] || 'huida,herido,escena,pelea,cae,cuerpo').split(',');
const fotos = process.argv.includes('fotos');
const AYUDA = () => {
  window.__pause = true;
  const g = __game;
  g.input.enabledPointerLock = false;
  g.input.onPointerLockLost = null;
  g.ui.closeAll();
  g.state = 'play';
  window.__noEnemies = (keep) =>
    g.enemies.forEach((e) => {
      if (!e.boss && !e.dead && !(keep && keep(e))) {
        e.dead = true;
        e.state = 'dead';
        e.stT = 99;
        e.obj.visible = false;
      }
    });
  window.__use = (id, dist = 1.0) => {
    const it = g.interact.list.find((i) => i.id === id);
    if (!it) return 'NO EXISTE ' + id;
    const ix = it.ix ?? it.x,
      iz = it.iz ?? it.z;
    const tries = [[0, dist], [0, -dist], [dist, 0], [-dist, 0], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7]];
    for (const [dx, dz] of tries) {
      const x = ix + dx,
        z = iz + dz;
      const y = g.world.col.groundHeight(x, z, 0.1, it.y + 1.5);
      g.player.spawn(x, y, z, Math.atan2(ix - x, iz - z));
      __sim(0.1);
      if (g.promptTarget && g.promptTarget.id === id) {
        __sim(0.2, [], ['KeyE']);
        for (let k = 0; k < 3; k++)
          if (g.ui.modal) {
            __sim(0.5);
            __sim(0.1, [], ['KeyE']);
          }
        __sim(2.5);
        return { ok: true, id, done: it.done, toast: __toast() };
      }
    }
    return { ok: false, id, prompt: g.promptTarget && g.promptTarget.id };
  };
  window.__toast = () => [...document.querySelectorAll('.toast')].map((t) => t.textContent).slice(-1)[0];
  window.__useHere = (id) => {
    const it = g.interact.list.find((i) => i.id === id);
    if (!it) return 'NO EXISTE ' + id;
    const pl = g.player;
    pl.yaw = Math.atan2((it.ix ?? it.x) - pl.pos.x, (it.iz ?? it.z) - pl.pos.z);
    __sim(0.1);
    if (!g.promptTarget || g.promptTarget.id !== id) return { ok: false, id, prompt: g.promptTarget && g.promptTarget.id, pos: [pl.pos.x, pl.pos.y, pl.pos.z].map((v) => +v.toFixed(2)) };
    __sim(0.2, [], ['KeyE']);
    for (let k = 0; k < 3; k++)
      if (g.ui.modal) {
        __sim(0.5);
        __sim(0.1, [], ['KeyE']);
      }
    __sim(2.5);
    return { ok: true, id, done: it.done, toast: __toast(), pos: [pl.pos.x, pl.pos.y, pl.pos.z].map((v) => +v.toFixed(2)) };
  };
  window.__walk = (pts, keep) => {
    const pl = g.player;
    for (const [x, z] of pts) {
      let t = 0;
      for (; t < 20; t += 1 / 30) {
        const dx = x - pl.pos.x,
          dz = z - pl.pos.z,
          d = Math.hypot(dx, dz);
        if (d < 0.25) break;
        pl.autoDir = { x: dx / d, z: dz / d, m: 1 };
        if (keep !== false) __noEnemies(keep);
        g.update(1 / 30);
      }
      pl.autoDir = null;
      if (t >= 20 || pl.dead) return { stuck: [x, z], pos: [pl.pos.x, pl.pos.y, pl.pos.z].map((v) => +v.toFixed(2)), dead: pl.dead };
    }
    __sim(0.3);
    return { pos: [pl.pos.x, pl.pos.y, pl.pos.z].map((v) => +v.toFixed(2)), zone: g.zone && g.zone.id, hp: Math.round(pl.hp) };
  };
  window.P3 = (v) => [v.x, v.y, v.z].map((n) => +n.toFixed(2));
  // (en la cisterna: a los de la bruma y al Desfigurado no se les quita)
  window.KEEP = (e) => e.type === 'coronado_bruma' || e.type === 'desfigurado';
  // el barrio, hasta la tintorería: la caza empezada; él, sin verte
  window.__barrio = () => {
    for (const k of ['door:d_porton', 'fisico:intro', 'fisico:calleja', 'fisico:viuda', 'door:d_tinte', 'fisico:caza']) g.flags[k] = true;
    g.dev.invisible = true;
  };
};
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errores = [];
let p = null;
// (cada parte, en su partida: la página, recién cargada)
const nueva = async () => {
  if (p) await p.close();
  p = await b.newPage({ viewport: { width: 960, height: 540 } });
  p.on('pageerror', (e) => errores.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
  p.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('ERR_CERT') && !m.text().includes('404')) errores.push('console.error: ' + m.text());
  });
  await p.goto('http://localhost:' + PORT + '/?dev=1&items=espada,escudo,palanca');
  await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
  await p.evaluate(AYUDA);
};
const ev = (fn, arg) => p.evaluate(fn, arg);
const out = (k, v) => console.log(k.padEnd(28), JSON.stringify(v));
let shot = 0;
const foto = async (nombre) => {
  if (!fotos) return;
  await p.evaluate(() => __game.render());
  await p.screenshot({ path: `tools/shots/rama_${String(shot++).padStart(2, '0')}_${nombre}.png` });
};

// ------------------------------------------------------------ la huida
const huida = async (herido) => {
  await nueva();
  await ev((herido) => {
    const g = __game;
    __barrio();
    if (herido) g.flags['fisico:vida'] = 900;
    delete g.flags['fisico:escapado'];
    delete g.flags['fisico:huido'];
    delete g.flags['hatch:almacen'];
  }, herido);
  // (en la primera planta de la tintorería, ante el ventano de carga)
  out('ventano', await ev(() => __use('d_tinte_ventano')));
  out('al tejado', await ev(() => __walk([[40.0, 31.6], [40.4, 30.6], [41.4, 30.0]])));
  out('trampilla (abrir)', await ev(() => __useHere('h_almacen_arriba')));
  out('trampilla (bajar)', await ev(() => __useHere('h_almacen_arriba')));
  out('en el almacén', await ev(() => ({ pos: [__game.player.pos.x, __game.player.pos.y, __game.player.pos.z].map((v) => +v.toFixed(2)), flag: !!__game.flags['hatch:almacen'] })));
  out('por la cordelería', await ev(() => __walk([[40.9, 24.0], [40.9, 23], [41.8, 20.9], [42.3, 20.9], [42.85, 20.4], [42.85, 16], [42.6, 12], [39.75, 11.9], [39.7, 11.3], [39.7, 6.6], [41.6, 8.6], [40.9, 4.4]])));
  out('la puerta de los Pelames', await ev(() => __useHere('d_cordeleria')));
  out('a la calle', await ev(() => __walk([[40.9, 1.6]])));
  out('¿se le ha escapado?', await ev(() => {
    const g = __game;
    const n = g.interact.list.find((i) => i.id === 'n_fisico_ida');
    return { escapado: !!g.flags['fisico:escapado'], cisterna: !!g.flags['rama:cisterna'], huido: !!g.flags['fisico:huido'], nota: n && !n.hidden && n.obj.visible, fisico: g.fisico.modo, visible: g.fisico.e.obj.visible, desf: g.desfigurado.sitio, toast: __toast() };
  }));
};
if (partes.includes('herido')) {
  console.log('--- herido (habiéndole herido en la calle)');
  await huida(true);
}
if (partes.includes('huida')) {
  console.log('--- huida (sin tocarle)');
  await huida(false);
}

// ------------------------------------------------------------ la cisterna
// (se le escapó antes de conocer al de la cloaca: él, en el pretil)
const cisterna = async () => {
  await ev(() => {
    const g = __game;
    for (const k of ['fisico:escapado', 'rama:cisterna']) g.flags[k] = true;
    for (const k of ['desf:llegada', 'desf:met', 'desf:muerto', 'desf:llave', 'rama:bruma', 'desf:cocimientos', 'note:remedios']) delete g.flags[k];
    g.desfigurado.npcReset(g.desfigurado.npc);
    g.fisicoRama.applyFlags();
    g.player.spawn(-15.2, -5.2, 4.0, 0);
    __sim(0.3);
  });
};
// hasta que el reloj de la escena llegue a t (o pase a otra fase)
const hasta = (t, fase = 'escena') =>
  ev(
    ([t, fase]) => {
      const g = __game,
        R = g.fisicoRama;
      for (let i = 0; i < 4000 && R.fase === fase && R.t < t; i++) g.update(1 / 30);
      const D = g.desfigurado;
      const hv = D.npc.pos.clone();
      D.npc.rig.joints.head.getWorldPosition(hv);
      return { t: +R.t.toFixed(2), fase: R.fase, muerto: !!g.flags['desf:muerto'], desf: P3(D.npc.pos), cabeza: P3(hv), rot: [+D.npc.obj.rotation.x.toFixed(2), +D.npc.obj.rotation.z.toFixed(2)], pose: D.muerte && D.muerte.k, fis: P3(g.fisico.e.pos), fisEst: R.fEst && R.fEst.k, bruma: Object.fromEntries(Object.entries(R.bruma.capas).filter(([, c]) => c.k > 0.01).map(([k, c]) => [k, +c.k.toFixed(2)])), R: +R.bruma.R.toFixed(1), fuera: g.enemies.filter((e) => e.type === 'coronado_bruma' && !e.scripted && e.obj.visible).length, timeK: g.timeK };
    },
    [t, fase]
  );
const alPretil = async () => {
  out('al rellano (la llegada)', await ev(() => {
    const g = __game,
      D = g.desfigurado,
      pl = g.player;
    const r = __walk([[-15.2, 8.4]], KEEP);
    for (let t = 0; t < 3 && !D.rev; t += 1 / 30) {
      pl.autoDir = { x: 0.15, z: 1, m: 1 };
      g.update(1 / 30);
    }
    pl.autoDir = null;
    const lleg = !!D.rev;
    for (let t = 0; t < 9 && D.rev; t += 1 / 30) g.update(1 / 30);
    return { r, lleg, sitio: D.sitio, pos: P3(pl.pos), desf: P3(D.npc.pos) };
  }));
};
const bajar = async () => {
  out('bajar a la sala', await ev(() => {
    const g = __game,
      R = g.fisicoRama,
      pl = g.player;
    const pts = [[-13.3, 9.7], [-12.5, 9.7], [-7.6, 9.7], [-7.2, 10.8], [-7.2, 12.4]];
    for (const [x, z] of pts) {
      for (let t = 0; t < 15 && R.fase !== 'escena' && R.fase !== 'pelea'; t += 1 / 30) {
        const dx = x - pl.pos.x,
          dz = z - pl.pos.z,
          d = Math.hypot(dx, dz);
        if (d < 0.25) break;
        pl.autoDir = { x: dx / d, z: dz / d, m: 1 };
        g.update(1 / 30);
      }
      if (R.fase) break;
    }
    pl.autoDir = null;
    return { fase: R.fase, pos: P3(pl.pos), fis: g.fisico.modo, fisPos: P3(g.fisico.e.pos), fisVis: g.fisico.e.obj.visible };
  }));
};
const escena = async () => {
  await nueva();
  await cisterna();
  await alPretil();
  out('hablarle', await ev(() => {
    const r = __useHere('t_desfigurado');
    const g = __game,
      D = g.desfigurado;
    let modal = 0;
    for (let t = 0; t < 240 && (D.script || g.speech.busy(D.who) || g.ui.modal); t += 1 / 30) {
      // (lo que te da: la flor, en su ventana)
      if (g.ui.modal) {
        modal++;
        __sim(0.4);
        __sim(0.1, [], ['KeyE']);
      } else g.update(1 / 30);
    }
    // (te vas un rato: vuelve a mirar a la sala, no a la pared)
    const pl = g.player,
      p0 = [pl.pos.x, pl.pos.y, pl.pos.z];
    pl.spawn(-15.2, -5.2, 1.0, 0);
    for (let t = 0; t < 10; t += 1 / 30) g.update(1 / 30);
    const yaw = +D.npc.yaw.toFixed(2);
    pl.spawn(p0[0], p0[1], p0[2], Math.PI / 2);
    __sim(0.3);
    return { ok: r.ok, met: !!g.flags['desf:met'], flor: g.inventory.has('flor_blanca'), script: !!D.script, modal, pstate: g.player.state, yawSolo: yaw };
  }));
  await bajar();
  // la escena, a trozos (y sus fotos)
  for (const [t, nombre] of [[3, 'predica'], [6.5, 'sale'], [8.8, 'hermosa'], [9.95, 'atraviesa'], [11.5, 'cae'], [14.6, 'flota'], [16.5, 'sube'], [17.6, 'pretil'], [20.2, 'bruma'], [22.6, 'tu'], [24.9, 'salen']]) {
    out('escena ' + t + ' ' + nombre, await hasta(t));
    await foto(nombre);
  }
  out('fin de la escena', await hasta(99));
  out('la pelea', await ev(() => {
    const g = __game,
      R = g.fisicoRama;
    return { fase: R.fase, muros: R.bruma.muros.map((M) => !!M.box), cam: !!g.camRig.override, pstate: g.player.state, bars: g.post.U.uBars.value, timeK: g.timeK, cuerpo: R.cuerpo && !R.cuerpo.hidden };
  }));
};
// (de la escena, saltada: a la pelea)
const aLaPelea = async () => {
  await nueva();
  await cisterna();
  await alPretil();
  await ev(() => (__game.flags['desf:met'] = true));
  await bajar();
  out('saltar la escena', await ev(() => {
    const g = __game,
      R = g.fisicoRama;
    // (si murmura, espera a que acabe la frase)
    for (let i = 0; i < 600 && R.fase !== 'escena'; i++) g.update(1 / 30);
    const t0 = R.t;
    __sim(2.0);
    __sim(0.1, [], ['KeyE']);
    for (let i = 0; i < 600 && R.fase === 'escena'; i++) g.update(1 / 30);
    return { t0: +t0.toFixed(1), fase: R.fase, muerto: !!g.flags['desf:muerto'], desf: P3(g.desfigurado.npc.pos), fis: P3(g.fisico.e.pos), fuera: g.enemies.filter((e) => e.type === 'coronado_bruma' && !e.scripted).length, hud: !document.getElementById('hud').classList.contains('cine') };
  }));
};
const pelea = async () => {
  await aLaPelea();
  // las órdenes: lo que manda y lo que hacen (el jugador, quieto e invulnerable)
  out('órdenes (40 s)', await ev(() => {
    const g = __game,
      R = g.fisicoRama,
      pl = g.player;
    g.dev.set('god', true);
    const ord = [];
    const o0 = R.ordena.bind(R);
    R.ordena = (k, v) => (ord.push([+g.time.toFixed(1), k, v.length]), o0(k, v));
    let agarrado = 0,
      golpes = 0,
      hp0 = pl.hp,
      dmin = 99,
      cerco = 0,
      enCerco = 0;
    const L = [];
    for (let i = 0; i < 1200; i++) {
      g.update(1 / 30);
      if (pl.state === 'grabbed') agarrado++;
      if (pl.hp < hp0) golpes++;
      hp0 = pl.hp = pl.maxHp;
      const vivos = g.enemies.filter((e) => e.type === 'coronado_bruma' && !e.scripted && !e.dead);
      for (const c of vivos) dmin = Math.min(dmin, c.distTo(pl.pos));
      const cz = vivos.filter((c) => c.data.orden && c.data.orden.k === 'cerco' && g.time > c.data.orden.t0 + 2);
      if (cz.length) {
        cerco++;
        enCerco += cz.filter((c) => Math.abs(c.distTo(pl.pos) - 3.3) < 0.8).length / cz.length;
      }
      if (i % 150 === 0) L.push(vivos.map((c) => [c.state, +c.distTo(pl.pos).toFixed(1)]));
    }
    R.ordena = o0;
    return { ord, agarrado: +(agarrado / 30).toFixed(1), golpes, dmin: +dmin.toFixed(2), cercoBien: cerco ? +(enCerco / cerco).toFixed(2) : null, L };
  }));
  out('la bruma de la escalera', await ev(() => {
    const g = __game,
      pl = g.player;
    // (en la escalera, a media subida)
    pl.spawn(-10.0, g.world.col.groundHeight(-10.0, 9.7, 0.3, -6.0), 9.7, -Math.PI / 2);
    for (let t = 0; t < 5; t += 1 / 30) {
      pl.autoDir = { x: -1, z: 0, m: 1 };
      g.update(1 / 30);
    }
    pl.autoDir = null;
    return { pos: P3(pl.pos), toast: __toast() };
  }));
  // a por ellos: los de la primera tanda (menos uno), y la segunda
  out('vencerles', await ev(() => {
    const g = __game,
      R = g.fisicoRama,
      pl = g.player;
    pl.spawn(-7.0, -9.0, 15.0, 0);
    const mata = (c) => c.takeHit(9999, 999, pl.pos.x, pl.pos.z, true);
    const vivos = () => g.enemies.filter((e) => e.type === 'coronado_bruma' && !e.scripted && !e.dead);
    const v1 = vivos();
    v1.slice(0, -1).forEach(mata);
    for (let i = 0; i < 90; i++) g.update(1 / 30);
    const ola = R.ola,
      tanda2 = vivos().length;
    vivos().forEach(mata);
    for (let i = 0; i < 60; i++) g.update(1 / 30);
    const fase = R.fase;
    for (let i = 0; i < 420; i++) g.update(1 / 30);
    return { primera: v1.length, ola, tanda2, fase, despues: R.fase, bruma: !!g.flags['rama:bruma'], fis: g.fisico.modo, fisVis: g.fisico.e.obj.visible, brumaOn: R.bruma.on, muros: R.bruma.muros.map((M) => !!M.box), toast: __toast() };
  }));
};
// caer en la pelea y volver: vuelve a empezar, sin la escena
const cae = async () => {
  await aLaPelea();
  out('caer', await ev(() => {
    const g = __game,
      R = g.fisicoRama,
      pl = g.player;
    pl.hp = 0;
    pl.dead = true;
    g.respawn();
    for (let i = 0; i < 30; i++) g.update(1 / 30);
    return { fase: R.fase, brumaOn: R.bruma.on, fis: g.fisico.modo, fisVis: g.fisico.e.obj.visible, fuera: g.enemies.filter((e) => e.type === 'coronado_bruma' && !e.scripted && e.obj.visible).length, desf: P3(g.desfigurado.npc.pos), pose: g.desfigurado.muerte && g.desfigurado.muerte.k };
  }));
  await ev(() => {
    __game.player.spawn(-15.0, -5.2, 9.6, Math.PI / 2);
    __sim(0.3);
  });
  await bajar();
  out('otra vez', await ev(() => {
    const g = __game,
      R = g.fisicoRama;
    for (let i = 0; i < 120; i++) g.update(1 / 30);
    return { fase: R.fase, fis: P3(g.fisico.e.pos), fisVis: g.fisico.e.obj.visible, fuera: g.enemies.filter((e) => e.type === 'coronado_bruma' && !e.scripted && e.obj.visible).length, muros: R.bruma.muros.map((M) => !!M.box), cam: !!g.camRig.override };
  }));
};
// lo que queda: el cuerpo (la llave) y su cuaderno (la mesa)
const cuerpo = async () => {
  await nueva();
  await ev(() => {
    const g = __game;
    for (const k of ['fisico:escapado', 'rama:cisterna', 'desf:llegada', 'desf:met', 'desf:muerto', 'rama:bruma']) g.flags[k] = true;
    g.applyWorldState();
    __sim(0.2);
  });
  out('el cuerpo', await ev(() => {
    const g = __game;
    const D = g.desfigurado;
    const a = __use('x_desf_cuerpo', 1.2);
    const b = __use('x_desf_cuerpo', 1.2);
    // (el final lo cuenta aunque no le hablaras)
    const met = g.flags['desf:met'];
    delete g.flags['desf:met'];
    const fin = g.finalDesfigurado().replace(/<br>/g, ' ').trim();
    g.flags['desf:met'] = met;
    return { a: a.toast, b: b.toast, llave: g.inventory.has('llave_reja'), flag: !!g.flags['desf:llave'], desf: P3(D.npc.pos), pose: D.muerte && D.muerte.k, hablar: D.canTalk(), fin };
  }));
  out('el cuaderno', await ev(() => {
    const g = __game;
    const r = __use('n_remedios', 1.0);
    __sim(0.5);
    return { ok: r.ok, nota: !!g.flags['note:remedios'], mesa: !!g.flags['desf:cocimientos'], toast: __toast() };
  }));
};
if (partes.includes('escena')) {
  console.log('--- escena');
  await escena();
}
if (partes.includes('pelea')) {
  console.log('--- pelea');
  await pelea();
}
if (partes.includes('cae')) {
  console.log('--- cae');
  await cae();
}
if (partes.includes('cuerpo')) {
  console.log('--- cuerpo');
  await cuerpo();
}

console.log(errores.length ? errores.slice(0, 10).join('\n') : 'sin errores');
await b.close();
if (vite) await vite.close();
