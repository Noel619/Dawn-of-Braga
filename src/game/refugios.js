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
//   - su oro: los morabetinos que haya dentro (ITEMS.oro);
//   - su primera noche (en algunos): las criaturas con noche: id no están
//     hasta que se enciende; entonces vienen y aporrean sus puertas desde
//     fuera (la pose pound) hasta que las matas, y muertas no vuelven.
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
      if (!this.map.has(id)) this.map.set(id, { id, altar: null, puertas: [], cierres: [], tablas: [], criaturas: [], noche: [], fuego: null, luz: null });
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
    for (const e of game.enemies) {
      if (e.spec.refugio) {
        de(e.spec.refugio).criaturas.push(e);
        // (encendido el refugio, ya no vuelven: game.bossGone)
        if (!e.spec.story) e.spec.story = 'ref:' + e.spec.refugio;
      }
      // (los de su primera noche: hasta encenderlo no están, game.bossGone;
      // muertos, no vuelven)
      if (e.spec.noche) {
        de(e.spec.noche).noche.push(e);
        e.spec.story = e.spec.dies = e.spec.story || 'noche:' + e.id;
      }
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
    // (la entornada también está abierta; las contraventanas y las ventanas
    // de sacada, d.ventana, se cuentan con las ventanas)
    const abierta = (d) => d.done || d.ajar;
    const puertas = R.puertas.filter((d) => !d.ventana && abierta(d)).length;
    const trampillas = R.cierres.filter((c) => g.interact.cierreAbierto(c)).length;
    const ventanas = R.tablas.filter((b) => !g.flags['board:' + b.win]).length + R.puertas.filter((d) => d.ventana && abierta(d)).length;
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
      g.ui.toast(MSG[R.altar.pideMsg] || MSG.refNoEsTuyo, 5);
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

  // La primera noche: los que vinieron aporrean la puerta más cercana, a
  // tandas (se oye y la hoja tiembla); si se abre, entran. La primera vez que
  // se les oye desde dentro, se dice.
  update(dt) {
    const g = this.g;
    const p = g.player.pos;
    for (const R of this.map.values()) {
      if (!R.noche.length || !this.encendido(R.id)) continue;
      for (const e of R.noche) {
        if (e.dead || e.state !== 'dormant') continue;
        const d = e.data.puerta || (e.data.puerta = R.puertas.slice().sort((a, b) => Math.hypot(a.x - e.home.x, a.z - e.home.z) - Math.hypot(b.x - e.home.x, b.z - e.home.z))[0]);
        if (!d) continue;
        if (d.done) {
          e.alert();
          continue;
        }
        if (Math.hypot(e.pos.x - p.x, e.pos.z - p.z) > 18) continue;
        e.data.golpe = (e.data.golpe ?? Math.random() * 1.5) - dt;
        if (e.data.golpe > 0) continue;
        // (tres o cuatro golpes, y un rato de nada)
        e.data.tanda = (e.data.tanda ?? 4) - 1;
        e.data.golpe = e.data.tanda > 0 ? 0.45 + Math.random() * 0.4 : 3.5 + Math.random() * 5;
        if (e.data.tanda <= 0) e.data.tanda = 3 + Math.floor(Math.random() * 2);
        g.audio && g.audio.play('doorPound', { x: d.x, y: 1.2, z: d.z });
        d.shake = 1;
        const zn = g.zone;
        if (!R.oida && zn && R.altar && g.zoneAt(R.altar) === zn) {
          R.oida = true;
          g.ui.toast(MSG.refNoche, 6);
        }
      }
      // las hojas tiemblan con los golpes
      for (const d of R.puertas)
        if (d.shake > 0) {
          d.shake = Math.max(0, d.shake - dt * 4);
          if (d.done) d.shake = 0;
          else for (const lf of d.leaves || []) lf.rotation.y = Math.sin(g.time * 70) * 0.015 * d.shake;
          if (!d.shake && !d.done) g.interact.poseDoor(d, 0);
        }
    }
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
