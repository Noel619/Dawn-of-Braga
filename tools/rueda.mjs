// La rueda de los tres ojos (game/rueda.js): lo que dice el hueco del pilar
// de la reja de la Sé con nada, con algo y con todo sin juntar; juntar las
// partes en el inventario como en Resident Evil (lo que casa y lo que no, con
// el teclado: E para elegir, E para combinar, Esc para dejarlo); la rueda
// entera en su ventana; encajarla y girarla (la reja baja, la rueda se queda
// en el pilar); las partidas de antes, con las cinco llaves; y fotos de todo
// (tools/shots/rueda_*.png). Requiere npx vite --port 5199.
//   node tools/rueda.mjs            (todo)
//   node tools/rueda.mjs sitios     (además, las cinco partes en su sitio)
import { chromium } from 'playwright';
const sitios = process.argv.includes('sitios');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
p.on('console', (m) => m.type() === 'error' && !/ERR_CERT|404/.test(m.text()) && logs.push('console.error ' + m.text()));
await p.goto('http://localhost:5199/?dev=1&items=espada,escudo&at=3.5,0.6,-83.9&yaw=180');
await p.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await p.evaluate(() => {
  window.__pause = true;
  const g = __game;
  g.input.enabledPointerLock = false;
  g.input.onPointerLockLost = null;
  g.ui.closeAll();
  g.enemies.forEach((e) => {
    if (!e.boss) {
      e.dead = true;
      e.state = 'dead';
      e.stT = 99;
      e.obj.visible = false;
    }
  });
  window.__toast = () => [...document.querySelectorAll('.toast')].map((t) => t.textContent).slice(-1)[0];
  // ante el pilar, de cara al hueco: el rótulo y lo que se dice al usarlo
  window.__hueco = () => {
    const pl = g.player;
    pl.spawn(3.5, 0.6, -84.0, Math.PI);
    __sim(0.2);
    const it = g.promptTarget;
    const label = it && g.interact.label(it);
    __sim(0.2, [], ['KeyE']);
    return { prompt: it && it.id, label, toast: __toast() };
  };
  // las casillas de la pestaña de los objetos: su índice
  window.__en = (id) => g.ui.itemEntries().findIndex((e) => e.id === id);
  // pulsa una tecla del inventario (las del juego: E, Escape...) un fotograma
  window.__tecla = (code) => {
    __sim(0.05, [], [code]);
    return { comb: g.ui.invComb, msg: g.ui.invMsg && g.ui.invMsg.text, sel: g.ui.itemEntries()[g.ui.invSel]?.id, modal: g.ui.stack.map((s) => s.name), hint: document.getElementById('inv-hint').textContent };
  };
  window.__elige = (id) => {
    g.ui.invSel = __en(id);
    g.ui.renderInv();
    return g.ui.invSel;
  };
  window.__inv = () =>
    Object.entries(g.inventory.toJSON())
      .filter(([k, n]) => /^(rueda|ojo_)/.test(k) && n > 0)
      .map(([k, n]) => k + (n > 1 ? '×' + n : ''))
      .join(' ');
});
const out = [];
const T = async (name, fn, arg) => {
  const r = await p.evaluate(fn, arg);
  out.push(name + ': ' + JSON.stringify(r));
  return r;
};
const foto = async (name) => {
  await p.evaluate(() => __game.render());
  await p.waitForTimeout(120);
  await p.screenshot({ path: `tools/shots/rueda_${name}.png` });
};
// (el pilar de cerca, con la cámara puesta a mano)
const pilar = async (name) => {
  await p.evaluate(() => {
    const g = __game;
    g.camRig.override = { pos: new g.THREE.Vector3(3.25, 1.75, -84.35), look: new g.THREE.Vector3(3.5, 1.5, -85.3), speed: 100 };
    g.player.obj.visible = false;
    for (let k = 0; k < 3; k++) g.camRig.update(0.1, g.input, g.player, null, g.world.col, false);
    g.render();
  });
  await foto(name);
  await p.evaluate(() => {
    __game.camRig.override = null;
    __game.player.obj.visible = true;
  });
};

// 1. el hueco, sin nada; con la frente y el carbúnculo; con las cinco sueltas
await pilar('hueco');
await T('hueco, sin nada', () => __hueco());
await T('con la frente y el carbúnculo', () => {
  const g = __game;
  g.inventory.add('rueda_frente');
  g.inventory.add('ojo_carbunculo');
  return __hueco();
});
await T('con las cinco, sueltas', () => {
  const g = __game;
  for (const k of ['rueda_boca', 'ojo_esmeralda', 'ojo_zafiro']) g.inventory.add(k);
  return __hueco();
});

// 2. el inventario: lo que no casa (la frente con un ojo; dos ojos), dejarlo
// con Esc, y lo que casa
await T('abre el inventario', () => {
  const g = __game;
  g.openOverlay('inv');
  // (el fotograma en que se abre no atiende a las teclas)
  __sim(0.1);
  g.ui.invSwitch(1);
  __elige('rueda_frente');
  return { modal: g.ui.stack.map((s) => s.name), hint: document.getElementById('inv-hint').textContent };
});
await T('E en la frente (combinar)', () => __tecla('KeyE'));
await T('E en el carbúnculo (no casa)', () => {
  __elige('ojo_carbunculo');
  return __tecla('KeyE');
});
await foto('no_casa');
await T('E en el zafiro, E en la esmeralda (dos ojos)', () => {
  __elige('ojo_zafiro');
  __tecla('KeyE');
  __elige('ojo_esmeralda');
  return __tecla('KeyE');
});
await T('E en la frente y Esc (lo deja; no cierra)', () => {
  __elige('rueda_frente');
  __tecla('KeyE');
  return __tecla('Escape');
});
await T('E en la boca, E en la frente (casan)', () => {
  __elige('rueda_boca');
  __tecla('KeyE');
  __elige('rueda_frente');
  return { ...__tecla('KeyE'), inv: __inv() };
});
await foto('juntas');
await T('E en el carbúnculo, E en la rueda', () => {
  __elige('ojo_carbunculo');
  __tecla('KeyE');
  __elige('rueda');
  return { ...__tecla('KeyE'), inv: __inv() };
});
await T('combinando: la rueda elegida, el zafiro encima', () => {
  __elige('rueda_c');
  __tecla('KeyE');
  __elige('ojo_zafiro');
  return { comb: __game.ui.invComb, eye: document.querySelector('#inv-detail .eye').textContent, hint: document.getElementById('inv-hint').textContent };
});
await foto('combinando');
await T('E en el zafiro', () => ({ ...__tecla('KeyE'), inv: __inv() }));
await T('la esmeralda con la rueda: entera', () => {
  __elige('ojo_esmeralda');
  __tecla('KeyE');
  __elige('rueda_cz');
  const r = __tecla('KeyE');
  return { ...r, inv: __inv(), eyebrow: document.querySelector('#item .eyebrow span').textContent, nombre: document.getElementById('item-name').textContent };
});
await foto('entera');
await T('cierra la ventana y el inventario', () => {
  __sim(0.5);
  __tecla('KeyE');
  const r = { modal: __game.ui.stack.map((s) => s.name), sel: __game.ui.itemEntries()[__game.ui.invSel]?.id };
  __tecla('Tab');
  return { ...r, despues: __game.ui.stack.map((s) => s.name), estado: __game.state };
});

// 3. la rueda, en el pilar: se encaja, gira y la reja baja
await T('ante el hueco, con la rueda', () => {
  const g = __game;
  g.player.spawn(3.5, 0.6, -84.0, Math.PI);
  __sim(0.2);
  return { prompt: g.promptTarget && g.promptTarget.id, label: g.promptTarget && g.interact.label(g.promptTarget) };
});
await p.evaluate(() => __sim(0.1, [], ['KeyE']));
await p.waitForTimeout(1700);
await T('girada', () => {
  const g = __game;
  __sim(3);
  const d = g.interact.list.find((i) => i.id === 'd_cripta');
  const G = g.groups['rueda:d_cripta'];
  return { abierta: !!g.flags['door:d_cripta'], open: +d.open.toFixed(2), rueda: G && G.on, inv: __inv(), toast: __toast() };
});
await pilar('girada');
await T('la reja abierta, ya no se ofrece', () => {
  const g = __game;
  g.player.spawn(3.5, 0.6, -84.0, Math.PI);
  __sim(0.2);
  return { prompt: g.promptTarget && g.promptTarget.id };
});

// 4. las partidas de antes: las cinco llaves, en sus partes (con la reja
// cerrada) o en nada (con la reja abierta); lo cogido, cogido
await T('partida de antes, reja cerrada', () => {
  const g = __game;
  g.loadGame({ v: 2, flags: { 'take:i_llave_alferez': true, 'take:i_llave_capellan': true, 'take:a_camara3': true, 'arca:a_camara3': true }, inv: { espada: 1, llave_alferez: 1, llave_capellan: 1, llave_canciller: 1 }, aspecto: { nombre: 'Soeiro' } });
  // (como al continuar: el mundo, como dice la partida)
  g.applyWorldState();
  const pz = (id) => g.interact.list.find((i) => i.id === id);
  return { inv: __inv(), flags: Object.keys(g.flags).filter((k) => /llave|pieza|camara3/.test(k)), cogidas: ['i_pieza_alferez', 'i_pieza_capellan', 'i_pieza_mayordomo'].map((k) => k + ':' + !!(pz(k) && pz(k).done)) };
});
await T('partida de antes, reja abierta', () => {
  const g = __game;
  g.loadGame({ v: 2, flags: { 'door:d_cripta': true }, inv: { espada: 1, llave_alferez: 1, llave_mayordomo: 1, llave_camarero: 1, llave_capellan: 1, llave_canciller: 1 }, aspecto: { nombre: 'Soeiro' } });
  g.applyWorldState();
  return { inv: __inv() || '(nada)', abierta: !!g.flags['door:d_cripta'], rueda: g.groups['rueda:d_cripta'] && g.groups['rueda:d_cripta'].on };
});

// 5. (con 'sitios') las cinco partes en su sitio, de cerca
if (sitios) {
  const SITIOS = [
    ['alferez', 'i_pieza_alferez', { 'dead:alferez': true }],
    ['mayordomo', 'i_pieza_mayordomo', { 'dead:mayordomo': true, 'corte:vencida': true }],
    ['camarero', 'i_pieza_camarero', {}],
    ['capellan', 'i_pieza_capellan', {}],
  ];
  await p.evaluate(() => {
    const g = __game;
    g.ui.closeAll();
    g.newState();
    g.applyWorldState();
    g.state = 'play';
  });
  for (const [n, id, flags] of SITIOS) {
    const r = await p.evaluate(
      ([id, flags]) => {
        const g = __game;
        Object.assign(g.flags, flags);
        if (g.corte && flags['corte:vencida']) g.corte.applyFlags();
        g.interact.applyFlags(g.flags);
        const it = g.interact.list.find((i) => i.id === id);
        const P = it.obj.position;
        // (la cámara, a un metro largo, algo por encima; del lado de la
        // tribuna, la boca colgada)
        const off = id === 'i_pieza_capellan' ? [0.9, 0.25, 0.35] : [0.55, 0.7, 0.55];
        g.player.obj.visible = false;
        g.player.body.pos.x += 30;
        g.camRig.override = { pos: new g.THREE.Vector3(P.x + off[0], P.y + off[1], P.z + off[2]), look: new g.THREE.Vector3(P.x, P.y + (id === 'i_pieza_capellan' ? -0.05 : 0.02), P.z), speed: 100 };
        for (let k = 0; k < 3; k++) g.camRig.update(0.1, g.input, g.player, null, g.world.col, false);
        g.atmo.update(0.1, g.player);
        g.render();
        return { id, item: it.item, visible: it.obj.visible, at: [P.x, P.y, P.z].map((v) => +v.toFixed(2)) };
      },
      [id, flags]
    );
    out.push('sitio ' + n + ': ' + JSON.stringify(r));
    await p.waitForTimeout(150);
    await p.screenshot({ path: `tools/shots/rueda_sitio_${n}.png` });
  }
}

console.log(out.join('\n'));
console.log(logs.slice(0, 10).join('\n'));
await b.close();
