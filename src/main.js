// Punto de entrada: carga, bucle principal y ganchos de depuración.
import './ui/ui.css';
import { Game } from './game/game.js';
import { loadFonts } from './ui/pixel.js';

const canvas = document.getElementById('gl');
const q = new URLSearchParams(location.search);

function fail(msg) {
  const l = document.getElementById('loading');
  l.classList.remove('hidden');
  l.innerHTML = `<div style="max-width:40ch;text-align:center;line-height:1.6">${msg}</div>`;
}

function boot() {
  let game;
  try {
    game = new Game(canvas);
  } catch (e) {
    console.error(e);
    fail('No se pudo iniciar WebGL 2. Prueba con un navegador de escritorio actualizado (Chrome, Edge o Firefox).');
    return;
  }
  window.__game = game;
  document.getElementById('loading').classList.add('hidden');

  if (q.get('dev')) {
    // arranque directo para pruebas: ?dev=1&at=x,y,z&yaw=grados&items=a,b&arma=id
    const items = (q.get('items') || 'espada,escudo').split(',').filter(Boolean);
    // ?arma=facon|hacha|lanza|espada|katana para probar un arma (queda en el inventario)
    const arma = q.get('arma');
    if (arma && !items.includes(arma)) items.push(arma);
    game.newState();
    for (const i of items) game.inventory.add(i);
    game.applyWorldState();
    game.player.obj.visible = true;
    const at = (q.get('at') || '-84.6,0,-15.8').split(',').map(Number);
    game.player.spawn(at[0], at[1], at[2], (Number(q.get('yaw') || 180) * Math.PI) / 180);
    game.player.hp = game.player.maxHp;
    if (arma) game.player.equipWeapon(arma);
    game.camRig.snapTo(game.player);
    game.fade = 1;
    game.beginPlay(false);
  } else game.toTitle();

  let last = performance.now();
  let frames = 0,
    acc = 0;
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (window.__pause) {
      requestAnimationFrame(frame);
      return;
    }
    game.update(dt);
    game.render();
    frames++;
    acc += dt;
    if (acc >= 1) {
      game.fps = frames;
      window.__fps = frames;
      frames = 0;
      acc = 0;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__ready = true;
  // simulación acelerada para pruebas automáticas: __sim(segundos, ['KeyW'], ['M0'])
  window.__sim = (sec, hold = [], tap = []) => {
    const inp = game.input;
    hold.forEach((c) => {
      inp.keys.add(c);
      inp.kPressed.add(c);
    });
    tap.forEach((c) => {
      inp.keys.add(c);
      inp.kPressed.add(c);
    });
    let first = true;
    for (let t = 0; t < sec; t += 1 / 30) {
      game.update(1 / 30);
      if (first) {
        tap.forEach((c) => {
          inp.keys.delete(c);
          inp.kReleased.add(c);
        });
        first = false;
      }
    }
    hold.forEach((c) => {
      inp.keys.delete(c);
      inp.kReleased.add(c);
    });
    game.update(1 / 30);
    game.render();
    const p = game.player;
    return { state: game.state, ps: p.state, hp: Math.round(p.hp), pos: [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)], prompt: game.promptTarget && game.promptTarget.id, modal: game.ui.stack.map((s) => s.name), lock: game.lockTarget && game.lockTarget.id };
  };
}

// deja pintar la pantalla de carga (y cargar las fuentes pixeladas) antes de
// construir la ciudad
loadFonts().then(() => setTimeout(boot, 60));
