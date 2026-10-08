// La ciudad que se rompe: los tejados de las casas de la plaza y los muros
// que flanquean la Sé (los construye el nivel en dos grupos: 'wreck:<id>',
// entero, y 'wreck:<id>:ruin', hundido; ver house() en builders.js y
// buildLargo en level_city.js). Los golpes de los colosos los rompen: la
// campana al barrer el aire rompe tejados y lo alto de los muros; los golpes
// contra el suelo, los muros; el brazo muerto de Deo que se desploma sobre
// las casas y sus rastrillos, los tejados. El carro, los barriles y la caja
// son rompibles de los de siempre (breakables.js, zona 'largo').
//
// Si mueres, todo vuelve a estar entero; muerto el dios, la plaza se queda
// en ruinas (bandera 'wreck:<id>').
import * as THREE from 'three';

const _c = new THREE.Vector3();

// qué rompe cada golpe: los del suelo no llegan a los tejados
const REACH = {
  air: { roof: true, wall: true },
  arm: { roof: true, wall: true },
  rake: { roof: true, wall: true },
  facade: { roof: false, wall: true },
  hand: { roof: false, wall: true },
  bell: { roof: false, wall: true },
  foot: { roof: false, wall: true },
};

export class Wrecks {
  constructor(game) {
    this.g = game;
    this.list = (game.level.ctx.wrecks || []).map((w) => ({ ...w, broken: false }));
  }

  // distancia de un punto a la caja de una pieza
  dist(w, p) {
    const b = w.box;
    const dx = Math.max(b[0] - p.x, 0, p.x - b[3]),
      dy = Math.max(b[1] - p.y, 0, p.y - b[4]),
      dz = Math.max(b[2] - p.z, 0, p.z - b[5]);
    return Math.hypot(dx, dy, dz);
  }

  // Un golpe en 'at' que alcanza r metros: rompe lo que toque (según qué
  // golpe sea) y, con los del suelo, arrasa el carro, los barriles y la caja.
  hit(at, r, kind = 'hand') {
    const g = this.g;
    const reach = REACH[kind] || REACH.hand;
    let n = 0;
    for (const w of this.list) {
      if (w.broken || !reach[w.kind]) continue;
      if (this.dist(w, at) > r) continue;
      this.breakIt(w, at);
      n++;
    }
    if (kind !== 'air' && kind !== 'rake' && (at.y ?? 0) < 3) n += g.breakables.smashAround(at.x, at.z, kind === 'step' ? 1.4 : Math.min(r * 0.6, 6), 0, at);
    return n;
  }

  breakIt(w, from = null, instant = false) {
    const g = this.g;
    if (w.broken) return;
    w.broken = true;
    g.setGroupVisible('wreck:' + w.id, false);
    g.setGroupVisible('wreck:' + w.id + ':ruin', true);
    if (instant) return;
    g.flags['wreck:' + w.id] = true;
    const b = w.box;
    _c.set((b[0] + b[3]) / 2, b[4] - 0.4, (b[2] + b[5]) / 2);
    // cascotes y polvo desde lo alto; tejas si es un tejado
    let dir = null;
    if (from) {
      dir = new THREE.Vector3(_c.x - from.x, 0, _c.z - from.z);
      if (dir.lengthSq() > 1e-4) dir.normalize().multiplyScalar(0.4);
      else dir = null;
    }
    const D = g.finale.debris;
    D.burst(_c, w.kind === 'roof' ? 22 : 18, { speed: 6, up: 5, size: w.kind === 'roof' ? 0.8 : 1.1, spread: Math.max(1.5, (b[3] - b[0]) * 0.3), dir });
    for (let k = 0; k < 3; k++) g.fx.blood.emit(_c.x + (Math.random() - 0.5) * 3, _c.y - k, _c.z + (Math.random() - 0.5) * 3, 30, { color: w.kind === 'roof' ? [0.42, 0.3, 0.26] : [0.4, 0.37, 0.33], speed: 4, life: 1.8, up: 1, gravity: 2 });
    g.audio && g.audio.play(w.kind === 'roof' ? 'woodBreak' : 'wallBreak', _c, { k: 1.4 });
    g.audio && g.audio.play('pillarBreak', _c, { k: 0.8 });
    g.camRig.shake(0.35);
  }

  // Todo entero otra vez (al morir antes de vencer, o al salir al título).
  reset() {
    const g = this.g;
    for (const w of this.list) {
      w.broken = false;
      g.setGroupVisible('wreck:' + w.id, true);
      g.setGroupVisible('wreck:' + w.id + ':ruin', false);
      delete g.flags['wreck:' + w.id];
    }
  }
  // Como dice la partida guardada.
  applyFlags(F) {
    const g = this.g;
    for (const w of this.list) {
      w.broken = false;
      g.setGroupVisible('wreck:' + w.id, true);
      g.setGroupVisible('wreck:' + w.id + ':ruin', false);
      if (F['wreck:' + w.id]) this.breakIt(w, null, true);
    }
  }
}
