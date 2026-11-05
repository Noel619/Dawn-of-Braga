// Los hitos que se ven de lejos (PLAN_FORTALEZA.md, §3: «la torre del
// homenaje, con el estandarte del Rey y una luz en lo alto (la vela del
// Rey)»; fase 7, #24): el resplandor del farol en lo alto del mástil de la
// torre del homenaje (world/fortaleza.js), que se ve por encima de la niebla
// desde el patio de armas y desde la ciudad, entre los tejados.
//
// La torre queda más allá del plano lejano (a cien metros lo corta la
// niebla): el resplandor se dibuja dentro de él, en la misma dirección y con
// el mismo tamaño aparente, y lo que haya delante lo tapa (la prueba de
// profundidad, como siempre). Tiembla como una llama, se apaga cuando muere el
// Rey (con la llama del farol: su grupo del mundo) y no se ve bajo tierra ni
// al amanecer.
import * as THREE from 'three';
import { clamp } from '../core/util.js';

let TEX = null;
function glowTexture() {
  if (TEX) return TEX;
  const n = 64,
    c = document.createElement('canvas');
  c.width = c.height = n;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  gr.addColorStop(0, 'rgba(255,240,205,1)');
  gr.addColorStop(0.12, 'rgba(255,196,120,0.9)');
  gr.addColorStop(0.35, 'rgba(255,128,48,0.32)');
  gr.addColorStop(1, 'rgba(255,90,20,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, n, n);
  TEX = new THREE.CanvasTexture(c);
  TEX.colorSpace = THREE.SRGBColorSpace;
  return TEX;
}

export class Hitos {
  // list: [{ x, y, z, size (el halo, en metros), minAng (su tamaño aparente
  // mínimo, en radianes), off (la bandera que lo apaga), group (el grupo del
  // mundo que se apaga con él) }]
  constructor(game, list) {
    this.g = game;
    this.list = list.map((h) => {
      const mat = new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, transparent: true, fog: false });
      const sp = new THREE.Sprite(mat);
      sp.renderOrder = 3;
      sp.frustumCulled = false;
      sp.visible = false;
      game.scene.add(sp);
      return { ...h, sp, pos: new THREE.Vector3(h.x, h.y, h.z), lit: null };
    });
  }
  update(t) {
    const g = this.g,
      cam = g.camera,
      cp = cam.position;
    for (const h of this.list) {
      const lit = !(h.off && g.flags[h.off]);
      if (lit !== h.lit) {
        h.lit = lit;
        if (h.group && g.groups && g.groups[h.group]) g.setGroupVisible(h.group, lit);
      }
      const on = lit && cp.y > -1.5 && g.atmo.name !== 'dawn';
      h.sp.visible = on;
      if (!on) continue;
      const d = h.pos.distanceTo(cp);
      // (más allá del plano lejano, dentro de él y a escala)
      const lim = cam.far * 0.9,
        k = d > lim ? lim / d : 1;
      h.sp.position.copy(cp).lerp(h.pos, k);
      const s = Math.max(h.size / d, h.minAng ?? 0.01) * d * k;
      h.sp.scale.set(s, s, 1);
      // (tiembla como una llama; de lejos, más tenue)
      const fl = 0.84 + 0.1 * Math.sin(t * 7.3) + 0.06 * Math.sin(t * 13.1 + 1.7);
      h.sp.material.opacity = fl * clamp(1.1 - d / 300, 0.4, 0.95);
    }
  }
}
