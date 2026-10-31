// Cuerdas que se cortan de un virote (PLAN_CASTILLO.md, §9) y lo que cuelga de
// ellas. Cada una (L.cuerdas, del nivel): { id, a, b (sus extremos: a abajo,
// donde cuelga lo que sea), stone (el tamaño del sillar que sostiene), floor
// (dónde cae), door (lo que revienta al caer) }. Cortada, el sillar cae, da
// en el suelo y se lleva por delante la puerta (un tapiado: game/interact.js);
// queda apuntado en la partida ('cut:id').
import * as THREE from 'three';
import { objMat } from '../gfx/materials.js';
import { MSG } from './story.js';

export class Cuerdas {
  constructor(game, list = []) {
    this.g = game;
    this.list = list.map((c) => this.make(c));
  }

  make(c) {
    const g = this.g;
    const a = new THREE.Vector3(...c.a),
      b = new THREE.Vector3(...c.b);
    const rope = new THREE.Mesh(new THREE.BoxGeometry(0.035, a.distanceTo(b), 0.035), objMat('rope'));
    rope.position.copy(a).add(b).multiplyScalar(0.5);
    const stone = new THREE.Mesh(new THREE.BoxGeometry(...c.stone), objMat('ashlar'));
    stone.position.set(a.x, a.y - c.stone[1] / 2, a.z);
    // la soga que lo abraza
    const tie = new THREE.Mesh(new THREE.BoxGeometry(c.stone[0] + 0.02, 0.04, c.stone[2] + 0.02), objMat('rope'));
    stone.add(tie);
    g.scene.add(rope, stone);
    const C = { ...c, A: a, B: b, rope, stone, falling: false, vy: 0, done: false };
    C.r = g.virotes.addRope({ id: c.id, a: c.a, b: c.b, r: 0.14, onCut: () => this.cut(C) });
    return C;
  }

  cut(C) {
    if (C.falling || C.done) return;
    C.falling = true;
    C.vy = 0;
    C.rope.visible = false;
    this.g.flags['cut:' + C.id] = true;
  }

  update(dt) {
    const g = this.g;
    for (const C of this.list) {
      if (!C.falling) continue;
      C.vy -= 9.8 * dt;
      C.stone.position.y += C.vy * dt;
      C.stone.rotation.x += dt * 0.8;
      if (C.stone.position.y - C.stone.geometry.parameters.height / 2 <= C.floor) {
        // en el suelo: se lleva por delante lo que haya (el tapiado) y queda
        // entre sus escombros
        C.falling = false;
        C.done = true;
        C.stone.visible = false;
        const it = C.door && g.interact.list.find((i) => i.id === C.door);
        if (it && !it.done) {
          g.interact.setOpen(it);
          g.flags['door:' + it.id] = true;
          g.ui.toast(MSG.tapiaCae, 5);
        }
        g.audio && g.audio.play('slam', C.stone.position);
        g.camRig.shake(0.5);
        g.saveGame();
      }
    }
  }

  // Al cargar: lo que ya se cortó, cortado (el sillar, entre los escombros).
  applyFlags(flags) {
    for (const C of this.list) {
      const cut = !!flags['cut:' + C.id] || (C.door && flags['door:' + C.door]);
      C.done = cut;
      C.falling = false;
      C.rope.visible = !cut;
      C.stone.visible = !cut;
      C.r.cut = cut;
      if (!cut) C.stone.position.set(C.A.x, C.A.y - C.stone.geometry.parameters.height / 2, C.A.z);
    }
  }
}
