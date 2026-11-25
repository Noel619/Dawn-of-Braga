// Los refugios (PLAN_REFUGIOS.md): los lugares cerrados que se hacen tuyos, en
// lugar de los altares de descanso. Cada uno se declara en su nivel, en lo que
// ya hay allí:
//   - el rincón de la imagen: el interactuable 'altar' con refugio: id y
//     candil: [x, y, z], donde arde la lamparilla (world/mobiliario.js,
//     rinconImagen, lo dibuja todo menos la llama, que es de aquí);
//   - sus puertas: las 'door' con refugio: id. Se abren y se vuelven a cerrar,
//     y cerradas son muro también para las criaturas (game/interact.js);
//   - sus trampillas: el 'cierre' (el cerrojo) de una trampilla, con refugio;
//   - sus ventanas: las 'board' con refugio: id (se tapian, como en la Casa
//     del Alemán);
//   - los que se encerraron dentro: las criaturas con refugio: id y story
//     'ref:<id>' (encendido el refugio, no vuelven nunca);
//   - su oro: los morabetinos que haya dentro (ITEMS.oro).
// Encender la lamparilla pide que no quede nadie dentro y que todo esté
// cerrado. Encendido (la bandera ref:<id>), el refugio es tuyo: ante la imagen
// se descansa, ahí te levantas al caer y sus puertas se abren también desde
// fuera (tienes su llave). Una partida de antes, que ya descansó en ese
// altar, lo tiene encendido.
import { MSG } from './story.js';

export class Refugios {
  constructor(game) {
    this.g = game;
    this.map = new Map();
    const de = (id) => {
      if (!this.map.has(id)) this.map.set(id, { id, altar: null, puertas: [], cierres: [], tablas: [], criaturas: [], fuego: null, luz: null });
      return this.map.get(id);
    };
    for (const it of game.interact.list) {
      if (!it.refugio) continue;
      const R = de(it.refugio);
      if (it.kind === 'altar') R.altar = it;
      else if (it.kind === 'door') R.puertas.push(it);
      else if (it.kind === 'cierre') R.cierres.push(it);
      else if (it.kind === 'board') R.tablas.push(it);
    }
    for (const e of game.enemies)
      if (e.spec.refugio) {
        de(e.spec.refugio).criaturas.push(e);
        // (encendido el refugio, ya no vuelven: game.bossGone)
        if (!e.spec.story) e.spec.story = 'ref:' + e.spec.refugio;
      }
    // la llama del candil y su luz, apagadas hasta que se enciende
    for (const R of this.map.values()) {
      const c = R.altar && R.altar.candil;
      if (!c) continue;
      R.fuego = game.fx.fires.add({ x: c[0], y: c[1], z: c[2], s: 0.085, light: false, embers: false, smoke: false });
      R.luz = game.fx.lights.add({ x: c[0], y: c[1] + 0.15, z: c[2], color: 0xffa04a, intensity: 3.6, range: 8, flicker: 1, priority: 1 });
      R.fuego.on = R.luz.on = false;
    }
  }

  de(it) {
    return it && it.refugio ? this.map.get(it.refugio) || null : null;
  }
  encendido(id) {
    return !!this.g.flags['ref:' + id];
  }

  // Lo que falta para encenderlo: los que siguen dentro y lo que sigue abierto.
  faltan(R) {
    const g = this.g;
    const vivos = R.criaturas.filter((e) => !e.dead).length;
    const puertas = R.puertas.filter((d) => d.done).length;
    const trampillas = R.cierres.filter((c) => g.interact.cierreAbierto(c)).length;
    const ventanas = R.tablas.filter((b) => !g.flags['board:' + b.win]).length;
    return { vivos, puertas, trampillas, ventanas, huecos: puertas + trampillas + ventanas };
  }

  // Ante la imagen, sin encender: se enciende si ya no queda nadie dentro y
  // todo está cerrado; si no, se dice qué falta.
  encender(it) {
    const g = this.g;
    const R = this.de(it);
    if (!R) return;
    // (el que pide algo más: la casa de Henrique, que te la deja cuando te ha
    // contado lo suyo)
    if (R.altar.pide && !g.flags[R.altar.pide]) {
      g.ui.toast(MSG.refNoEsTuyo, 5);
      return;
    }
    const f = this.faltan(R);
    if (f.vivos || f.huecos) {
      g.hint('refugio');
      g.ui.toast(f.vivos ? MSG.refVivos : MSG.refHuecos(f), 6);
      g.audio && g.audio.play('locked', { x: it.x, y: it.y + 1, z: it.z });
      return;
    }
    g.flags['ref:' + R.id] = true;
    this.luces();
    g.player.playInteract('interact', Math.atan2(it.x - g.player.pos.x, it.z - g.player.pos.z));
    g.ui.toast(MSG.refEncendido(R.altar.name), 6);
    g.later(700, () => g.restAt(it));
  }

  // Cerrado lo último que quedaba abierto: se dice, para que se sepa que ya
  // se puede encender.
  alCerrar(it) {
    const R = this.de(it);
    if (!R || this.encendido(R.id)) return;
    const f = this.faltan(R);
    if (!f.huecos) this.g.ui.toast(f.vivos ? MSG.refCerradoVivos : MSG.refCerrado, 5);
  }

  luces() {
    for (const R of this.map.values()) if (R.fuego) R.fuego.on = R.luz.on = this.encendido(R.id);
  }

  // Al cargar una partida (antes de mirar qué criaturas ya no vuelven): un
  // altar donde ya se descansó es un refugio encendido.
  applyFlags() {
    const F = this.g.flags;
    for (const R of this.map.values()) if (R.altar && F['altar:' + R.altar.id]) F['ref:' + R.id] = true;
    this.luces();
  }
}
