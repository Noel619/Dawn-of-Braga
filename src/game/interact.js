// Interactuables: puertas y cierres, objetos, documentos, altares, niebla.
import * as THREE from 'three';
import { objMat } from '../gfx/materials.js';
import { getTexture } from '../gfx/textures.js';
import { ITEMS, NOTES, MSG } from './story.js';
import { angleDiff, DEG, clamp, damp } from '../core/util.js';
import { G } from '../gfx/materials.js';

const glowTex = () => getTexture('glow');

// ------------------------------------------------------------ mallas
function doorLeaf(w, h, mat) {
  const g = new THREE.Group();
  if (mat === 'irongate' || mat === 'grate') {
    const iron = objMat('iron');
    const n = Math.max(3, Math.round(w / 0.22));
    for (let i = 0; i <= n; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.06), iron);
      b.position.set((i / n) * w, h / 2, 0);
      g.add(b);
    }
    for (const y of [0.15, h * 0.5, h - 0.12]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, 0.08), iron);
      b.position.set(w / 2, y, 0);
      g.add(b);
    }
    if (mat === 'grate') {
      for (let i = 1; i < 5; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.05), iron);
        b.position.set(w / 2, (i / 5) * h, 0);
        g.add(b);
      }
      // puntas inferiores
      for (let i = 0; i <= n; i++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), iron);
        c.rotation.x = Math.PI;
        c.position.set((i / n) * w, -0.08, 0);
        g.add(c);
      }
    }
    return g;
  }
  if (mat === 'seal') {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), objMat('ashlar'));
    slab.position.set(w / 2, h / 2, 0);
    g.add(slab);
    const sig = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.6),
      new THREE.MeshBasicMaterial({ map: getTexture('sigil'), transparent: true, color: 0xff4a30, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    sig.position.set(w / 2, h * 0.55, 0.16);
    g.add(sig);
    const sig2 = sig.clone();
    sig2.position.z = -0.16;
    sig2.rotation.y = Math.PI;
    g.add(sig2);
    g.userData.sigil = [sig, sig2];
    return g;
  }
  // madera con herrajes
  const wood = objMat('planks'),
    iron = objMat('iron');
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.09), wood);
  leaf.position.set(w / 2, h / 2, 0);
  g.add(leaf);
  for (const y of [0.35, h * 0.5, h - 0.4]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.08, 0.12), iron);
    s.position.set(w * 0.44, y, 0);
    g.add(s);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 4, 8), iron);
  ring.position.set(w * 0.85, h * 0.48, 0.07);
  g.add(ring);
  return g;
}

function barricadeMesh(w, h) {
  const g = new THREE.Group();
  const wood = objMat('planks');
  const dark = objMat('wooddark');
  const planks = [];
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, w * (0.8 + Math.random() * 0.3)), i % 3 ? wood : dark);
    b.position.set((Math.random() - 0.5) * 0.3, 0.3 + (i / 9) * (h - 0.4), 0);
    b.rotation.x = (Math.random() - 0.5) * 0.35;
    g.add(b);
    planks.push(b);
  }
  for (const z of [-w * 0.4, 0, w * 0.4]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, h, 0.16), dark);
    p.position.set(0.12, h / 2, z);
    p.rotation.z = (Math.random() - 0.5) * 0.2;
    g.add(p);
    planks.push(p);
  }
  g.userData.planks = planks;
  return g;
}

function boardsOverDoor(w, h) {
  const g = new THREE.Group();
  const wood = objMat('planks');
  const planks = [];
  for (const [y, r] of [
    [0.5, 0.25],
    [1.1, -0.2],
    [1.6, 0.3],
    [2.0, -0.1],
  ]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.2, 0.05), wood);
    b.position.set(w / 2, y, 0.1);
    b.rotation.z = r;
    g.add(b);
    planks.push(b);
  }
  g.userData.planks = planks;
  return g;
}

function itemMesh(id) {
  const g = new THREE.Group();
  const iron = objMat('iron'),
    plate = objMat('plate'),
    leather = objMat('leather'),
    bronze = objMat('bronze');
  if (id === 'espada') {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.015), plate);
    blade.position.y = 0.55;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.05), iron);
    guard.position.y = 0.1;
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.2, 5), leather);
    grip.position.y = -0.02;
    g.add(blade, guard, grip);
    g.position.y = -0.55;
  } else if (id === 'escudo') {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.66, 0.05), objMat('planks'));
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), objMat('clothRed'));
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.06), objMat('clothRed'));
    c2.position.y = 0.1;
    g.add(s, c1, c2);
    g.position.y = -0.4;
  } else if (id === 'palanca') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.9), iron);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), iron);
    t.position.set(0, 0.04, 0.44);
    t.rotation.x = 0.6;
    g.add(b, t);
    g.rotation.y = 0.7;
  } else if (id === 'llave_claustro') {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 4, 8), bronze);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.22), bronze);
    s.position.z = 0.16;
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.04), bronze);
    t.position.set(0, -0.03, 0.24);
    r.rotation.x = Math.PI / 2;
    g.add(r, s, t);
  } else if (id === 'manivela') {
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.4), iron);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 5), objMat('wooddark'));
    b.position.set(0, 0.12, 0.2);
    g.add(a, b);
  } else if (id === 'anillo') {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 4, 10), bronze);
    const gem = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), objMat('redGlow'));
    gem.position.y = 0.045;
    g.add(r, gem);
  }
  return g;
}

function noteMesh(model) {
  const g = new THREE.Group();
  if (model === 'book') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.22), objMat('leather'));
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.065, 0.2), objMat('clothWhite'));
    g.add(b, p);
  } else if (model === 'paper') {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.01, 0.3), objMat('clothWhite', { tint: 0xd8c8a0 }));
    p.rotation.y = 0.3;
    g.add(p);
  }
  return g;
}

// Muro de niebla (shader animado)
function fogWallMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: G.uTime },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uTime; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec2 p = vUv * vec2(4.0, 3.0);
        float a = n(p + vec2(0.0, -uTime*0.6)) * 0.6 + n(p*2.3 + vec2(uTime*0.3, -uTime*1.1)) * 0.4;
        float edge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x) * smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
        float alpha = (0.35 + a * 0.55) * edge;
        gl_FragColor = vec4(vec3(0.85, 0.88, 0.9) * (0.7 + a * 0.5), alpha);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

// ------------------------------------------------------------ sistema
export class Interactables {
  constructor(game, specs) {
    this.game = game;
    this.list = [];
    for (const s of specs) this.create(s);
  }

  create(s) {
    const g = this.game;
    const it = { ...s, done: false, obj: null, box: null };
    if (s.kind === 'door') {
      const hinge = s.hinge ?? -1;
      if (s.mat === 'barricade') {
        it.obj = barricadeMesh(s.w, s.h);
        it.obj.position.set(s.x, s.y, s.z);
        if (s.axis === 'x') it.obj.rotation.y = Math.PI / 2;
      } else {
        it.obj = new THREE.Group();
        it.obj.position.set(s.x, s.y, s.z);
        if (s.axis === 'z') it.obj.rotation.y = -Math.PI / 2;
        const leaves = [];
        if (s.double) {
          for (const side of [-1, 1]) {
            const pivot = new THREE.Group();
            pivot.position.x = (side * s.w) / 2;
            const leaf = doorLeaf(s.w / 2, s.h, s.mat);
            if (side > 0) leaf.position.x = -s.w / 2;
            pivot.add(leaf);
            pivot.userData.side = side;
            it.obj.add(pivot);
            leaves.push(pivot);
          }
        } else {
          const pivot = new THREE.Group();
          pivot.position.x = s.mat === 'grate' || s.mat === 'seal' ? -s.w / 2 : hinge * (s.w / 2);
          const leaf = doorLeaf(s.w, s.h, s.mat);
          if (hinge > 0 && s.mat !== 'grate' && s.mat !== 'seal') leaf.position.x = -s.w;
          pivot.add(leaf);
          it.obj.add(pivot);
          leaves.push(pivot);
        }
        it.leaves = leaves;
        if (s.lock && s.lock.type === 'boards') {
          it.boards = boardsOverDoor(s.w, s.h);
          it.boards.position.x = -s.w / 2;
          it.obj.add(it.boards);
        }
      }
      g.scene.add(it.obj);
      // colisión
      const t = s.mat === 'barricade' ? 0.5 : 0.25;
      if (s.axis === 'x') it.box = g.world.col.add(s.x - s.w / 2, s.y, s.z - t, s.x + s.w / 2, s.y + s.h, s.z + t, 'door');
      else it.box = g.world.col.add(s.x - t, s.y, s.z - s.w / 2, s.x + t, s.y + s.h, s.z + s.w / 2, 'door');
      it.open = 0;
      it.r = s.r ?? 2.2;
    } else if (s.kind === 'item') {
      it.obj = new THREE.Group();
      it.obj.position.set(s.x, s.y, s.z);
      const m = itemMesh(s.item);
      if (m.children.length) it.obj.add(m);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xfff0c0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: true }));
      glow.scale.set(0.6, 0.6, 1);
      it.obj.add(glow);
      it.glow = glow;
      it.hidden = !!s.afterBoss;
      it.obj.visible = !it.hidden;
      g.scene.add(it.obj);
      it.r = s.r ?? 1.7;
    } else if (s.kind === 'note') {
      it.obj = new THREE.Group();
      it.obj.position.set(s.x, s.y, s.z);
      const m = noteMesh(s.model);
      if (m.children.length) it.obj.add(m);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xc8d8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6, fog: true }));
      glow.scale.set(0.35, 0.35, 1);
      glow.position.y = 0.12;
      it.obj.add(glow);
      it.glow = glow;
      g.scene.add(it.obj);
      it.r = s.r ?? 1.7;
    } else if (s.kind === 'altar') {
      it.r = 2.2;
    } else if (s.kind === 'fog') {
      const geo = new THREE.PlaneGeometry(s.w, s.h);
      it.obj = new THREE.Mesh(geo, fogWallMat());
      it.obj.position.set(s.x, s.y + s.h / 2, s.z);
      if (s.axis === 'z') it.obj.rotation.y = Math.PI / 2;
      it.obj.renderOrder = 8;
      g.scene.add(it.obj);
      const t = 0.3;
      if (s.axis === 'x') it.box = g.world.col.add(s.x - s.w / 2, s.y, s.z - t, s.x + s.w / 2, s.y + s.h, s.z + t, 'fog');
      else it.box = g.world.col.add(s.x - t, s.y, s.z - s.w / 2, s.x + t, s.y + s.h, s.z + s.w / 2, 'fog');
      it.box.cam = true;
      it.r = 2.4;
    } else if (s.kind === 'examine') {
      it.r = s.r ?? 2;
    } else if (s.kind === 'trigger') {
      it.r = s.r;
    }
    this.list.push(it);
    return it;
  }

  // aplica estado guardado
  applyFlags(flags) {
    for (const it of this.list) {
      if (it.kind === 'door' && flags['door:' + it.id]) this.setOpen(it, true);
      if ((it.kind === 'item' || it.kind === 'note') && flags['take:' + it.id]) {
        if (it.kind === 'item') {
          it.done = true;
          it.obj.visible = false;
        }
      }
      if (it.kind === 'fog' && flags['boss:' + it.boss]) this.clearFog(it);
      if (it.kind === 'item' && it.afterBoss && flags['boss:' + it.afterBoss] && !flags['take:' + it.id]) {
        it.hidden = false;
        it.obj.visible = true;
      }
    }
  }

  setOpen(it, instant = false) {
    it.done = true;
    if (it.box) it.box.enabled = false;
    it.target = 1;
    if (instant) {
      it.open = 1;
      this.poseDoor(it, 1);
      if (it.boards) it.boards.visible = false;
      if (it.mat === 'barricade') it.obj.visible = false;
    }
  }

  clearFog(it) {
    it.done = true;
    if (it.box) it.box.enabled = false;
    it.fade = 1;
    it.obj.visible = false;
  }

  poseDoor(it, k) {
    if (it.mat === 'barricade') {
      const pl = it.obj.userData.planks;
      pl.forEach((p, i) => {
        p.rotation.z = -k * (1.2 + (i % 3) * 0.3);
        p.position.y = Math.max(0.05, p.userData.y0 ?? (p.userData.y0 = p.position.y)) * (1 - k) + k * 0.08 * (i % 3);
        p.position.x = (p.userData.x0 ?? (p.userData.x0 = p.position.x)) + k * (0.4 + (i % 4) * 0.3) * (i % 2 ? 1 : -1);
      });
      return;
    }
    if (it.boards) {
      it.boards.children.forEach((b, i) => {
        b.position.y = Math.max(0.05, (b.userData.y0 ?? (b.userData.y0 = b.position.y)) * (1 - Math.min(1, k * 2)));
        b.position.z = 0.1 + Math.min(1, k * 2) * 0.4;
        b.rotation.x = Math.min(1, k * 2) * 1.4;
      });
    }
    for (const lf of it.leaves || []) {
      if (it.mat === 'grate') lf.position.y = k * (it.h - 0.3);
      else if (it.mat === 'seal') lf.position.y = -k * (it.h + 0.2);
      else {
        const side = lf.userData.side ?? it.hinge ?? -1;
        const sw = it.swing ?? 1;
        lf.rotation.y = -side * sw * k * 1.75;
      }
    }
  }

  // candidato más cercano
  nearest(player) {
    let best = null,
      bd = 1e9;
    for (const it of this.list) {
      if (it.done && it.kind !== 'altar' && it.kind !== 'examine' && it.kind !== 'note') continue;
      if (it.hidden) continue;
      if (it.kind === 'trigger') continue;
      if (it.kind === 'fog' && (!this.game.fogActive(it) || this.game.activeBoss)) continue;
      const ix = it.ix ?? it.x,
        iz = it.iz ?? it.z;
      const dy = player.pos.y - it.y;
      if (dy < -1.6 || dy > 2.2) continue;
      const d = Math.hypot(player.pos.x - ix, player.pos.z - iz);
      if (d > it.r) continue;
      // de cara (tolerante)
      const ang = Math.abs(angleDiff(player.yaw, Math.atan2(ix - player.pos.x, iz - player.pos.z)));
      if (d > 0.9 && ang > 80 * DEG) continue;
      const score = d + ang * 0.5;
      if (score < bd) {
        bd = score;
        best = it;
      }
    }
    return best;
  }

  label(it) {
    switch (it.kind) {
      case 'door':
        if (it.lock.type === 'grate') return 'Usar el torno';
        if (it.lock.type === 'boards') return it.mat === 'barricade' ? 'Examinar la barricada' : 'Examinar la puerta';
        if (it.lock.type === 'seal') return 'Examinar la losa';
        if (it.lock.type === 'boss') return 'Examinar la reja';
        return 'Abrir';
      case 'item':
        return 'Recoger';
      case 'note':
        return it.model === 'wall' || it.model === 'stone' ? 'Examinar' : 'Leer';
      case 'altar':
        return 'Descansar';
      case 'fog':
        return 'Atravesar la niebla';
      case 'examine':
        return 'Examinar';
    }
    return 'Interactuar';
  }

  // ejecuta la interacción; devuelve true si se consumió
  use(it) {
    const g = this.game;
    const p = g.player;
    const inv = g.inventory;
    if (it.kind === 'door') {
      const L = it.lock;
      const openIt = (msg, sound = 'doorOpen') => {
        this.setOpen(it);
        g.flags['door:' + it.id] = true;
        if (msg) g.ui.toast(msg);
        g.audio && g.audio.play(sound, { x: it.x, y: it.y, z: it.z });
        p.playInteract('push');
        g.saveGame();
      };
      if (L.type === 'none') openIt(null, it.mat === 'irongate' ? 'gateOpen' : 'doorOpen');
      else if (L.type === 'key') {
        if (inv.has(L.item)) openIt(`Usas: ${ITEMS[L.item].name}.`, 'unlock');
        else {
          g.ui.toast(MSG.lockedKey(ITEMS[L.item] ? 'una llave' : '?'));
          g.audio && g.audio.play('locked', it);
        }
      } else if (L.type === 'barred') {
        const n = it.axis === 'x' ? p.pos.z - it.z : p.pos.x - it.x;
        if (Math.sign(n) === L.side) openIt('Retiras la tranca.', 'bar');
        else {
          g.ui.toast(MSG.barred);
          g.audio && g.audio.play('locked', it);
        }
      } else if (L.type === 'boards') {
        if (inv.has('palanca')) openIt('Arrancas los tablones con la palanca.', 'boards');
        else {
          g.ui.toast(MSG.boarded);
          g.audio && g.audio.play('locked', it);
        }
      } else if (L.type === 'grate') {
        if (inv.has('manivela')) openIt('Encajas la manivela y giras el torno. La reja sube chirriando.', 'gateOpen');
        else {
          g.ui.toast(MSG.grate);
          g.audio && g.audio.play('locked', it);
        }
      } else if (L.type === 'seal') {
        if (inv.has('anillo')) openIt('Encajas el anillo en el sello. La losa se hunde en el suelo.', 'seal');
        else {
          g.ui.toast(MSG.seal);
          g.audio && g.audio.play('locked', it);
        }
      } else if (L.type === 'boss') {
        g.ui.toast('La reja no se mueve. Algo la mantiene cerrada desde la carne.');
      }
      return true;
    }
    if (it.kind === 'item') {
      it.done = true;
      g.flags['take:' + it.id] = true;
      p.playInteract('interact');
      g.audio && g.audio.play('pickup');
      g.giveItem(it.item);
      setTimeout(() => (it.obj.visible = false), 300);
      return true;
    }
    if (it.kind === 'note') {
      g.flags['take:' + it.id] = true;
      g.flags['note:' + it.note] = true;
      if (it.glow) it.glow.visible = false;
      g.audio && g.audio.play('paper');
      g.ui.showNote(NOTES[it.note]);
      return true;
    }
    if (it.kind === 'altar') {
      g.restAt(it);
      return true;
    }
    if (it.kind === 'fog') {
      g.enterFog(it);
      return true;
    }
    if (it.kind === 'examine') {
      g.ui.toast(MSG[it.text] || it.text);
      return true;
    }
    return false;
  }

  update(dt) {
    const g = this.game;
    const t = g.time;
    for (const it of this.list) {
      if (it.kind === 'door' && it.target && it.open < 1) {
        const speed = it.mat === 'grate' ? 0.35 : it.mat === 'seal' ? 0.4 : it.mat === 'barricade' ? 1.3 : 1.1;
        it.open = Math.min(1, it.open + dt * speed);
        const k = it.open;
        this.poseDoor(it, 1 - Math.pow(1 - k, 2));
        if (k >= 1 && it.mat === 'barricade') it.obj.visible = false;
        if (k >= 1 && it.boards) it.boards.visible = false;
      }
      if ((it.kind === 'item' || it.kind === 'note') && it.glow && it.obj.visible) {
        const s = (it.kind === 'item' ? 0.55 : 0.3) * (0.8 + 0.25 * Math.sin(t * 3 + it.x));
        it.glow.scale.set(s, s, 1);
        if (it.kind === 'item') it.glow.position.y = 0.1 + Math.sin(t * 2 + it.z) * 0.05;
      }
      if (it.kind === 'fog' && it.obj) {
        const active = g.fogActive(it);
        it.obj.visible = active;
        if (it.box) it.box.enabled = active;
      }
      if (it.kind === 'door' && it.mat === 'seal' && it.leaves) {
        const sg = it.leaves[0].children[0].userData.sigil;
        if (sg) sg.forEach((m) => (m.material.opacity = 0.6 + 0.4 * Math.sin(t * 2)));
      }
    }
  }

  triggers(player) {
    for (const it of this.list) {
      if (it.kind !== 'trigger' || it.done) continue;
      const inX = Math.abs(player.pos.x - it.x) < it.r;
      const inZ = Math.abs(player.pos.z - it.z) < (it.rz ?? it.r);
      if (inX && inZ) {
        it.done = true;
        this.game.onTrigger(it);
      }
    }
  }
}
