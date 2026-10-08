// Efectos de los colosos: llamas en sprite (cirios, el incensario, el núcleo)
// colgadas de sus huesos, halos de brillo y luces puntuales.
import * as THREE from 'three';
import { getTexture } from '../../src/gfx/textures.js';
import { additiveFog } from '../../src/gfx/materials.js';

export class ColFX {
  constructor(model) {
    this.model = model;
    this.flames = [];
    this.glows = [];
    this.lights = [];
    this.smokes = [];
  }
  // llama: hueso, posición en el espacio del modelo (reposo), escala [w, h]
  flame(bone, p, s = [0.6, 1.1], o = {}) {
    const tex = getTexture('fire').clone();
    tex.needsUpdate = true;
    tex.repeat.set(1 / 8, 1);
    const mat = additiveFog(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: true, color: o.color ?? 0xffffff }));
    const sp = new THREE.Sprite(mat);
    sp.scale.set(s[0], s[1], 1);
    sp.center.set(0.5, 0.1);
    const rw = this.model.restWorld[bone];
    sp.position.set(p[0] - rw.x, p[1] - rw.y, p[2] - rw.z);
    this.model.byName[bone].add(sp);
    this.flames.push({ sp, ph: Math.random() * 8, s });
    return sp;
  }
  // halo de brillo (sprite redondo aditivo)
  glow(bone, p, size, color = 0xff6020, o = {}) {
    const mat = additiveFog(new THREE.SpriteMaterial({ map: glowTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: true, color, opacity: o.opacity ?? 1 }));
    const sp = new THREE.Sprite(mat);
    sp.scale.set(size, size, 1);
    const rw = this.model.restWorld[bone];
    sp.position.set(p[0] - rw.x, p[1] - rw.y, p[2] - rw.z);
    this.model.byName[bone].add(sp);
    this.glows.push({ sp, size, ph: Math.random() * 6, pulse: o.pulse ?? 0.15 });
    return sp;
  }
  light(bone, p, color, intensity, range) {
    const l = new THREE.PointLight(color, intensity, range, 1.6);
    const rw = this.model.restWorld[bone];
    l.position.set(p[0] - rw.x, p[1] - rw.y, p[2] - rw.z);
    this.model.byName[bone].add(l);
    this.lights.push({ l, base: intensity, ph: Math.random() * 6 });
    return l;
  }
  update(t) {
    for (const f of this.flames) {
      const fr = Math.floor(t * 12 + f.ph) % 8;
      f.sp.material.map.offset.x = fr / 8;
    }
    for (const g of this.glows) {
      const k = 1 + Math.sin(t * 3.1 + g.ph) * g.pulse;
      g.sp.scale.set(g.size * k, g.size * k, 1);
    }
    for (const l of this.lights) l.l.intensity = l.base * (0.85 + 0.15 * Math.sin(t * 13 + l.ph) * Math.sin(t * 7.3 + l.ph * 2));
  }
}

let _glow = null;
function glowTex() {
  if (_glow) return _glow;
  const S = 32;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x + 0.5 - S / 2, y + 0.5 - S / 2) / (S / 2);
      const a = Math.max(0, 1 - d);
      const v = Math.round(255 * a * a);
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  _glow = new THREE.CanvasTexture(c);
  _glow.magFilter = THREE.NearestFilter;
  return _glow;
}
