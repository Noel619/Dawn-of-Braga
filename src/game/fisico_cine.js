// Las escenas del Físico de los Inocentes (game/fisico.js).
//
// LA CORTINA (al entrar en la calleja, la primera vez). Por encima del
// hombro, la calleja entera, larga y estrecha, y al fondo la Casa de los
// Inocentes. Luego, de lejos y muy cerrado, la ventana de arriba: la cortina
// se aparta, asoma el pico y los dos ojos de vidrio cogen la luz de la vela;
// te mira, ladea la cabeza (como un pájaro): «Ah. Uno sano.»; suelta el paño
// y se retira a lo oscuro. Se salta con «interactuar».
import * as THREE from 'three';
import { registerMaterialPatch } from '../gfx/materials.js';
import { DIALOG } from './story.js';
import { FI_CLIPS, fiSay } from '../entities/fisico.js';

const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => sm((t - a) / (b - a));
const V3 = THREE.Vector3;

// la ventana de la cortina (la alcoba del Físico, en el eje de la calleja):
// el hueco que deja el paño fijo, y el suelo de la alcoba
const VEN = { x: 49.95, y0: 4.95, y1: 6.45, z0: 43.95, z1: 44.45, piso: 4.05 };
// dónde se asoma (y de dónde viene: de lo oscuro, detrás del paño fijo)
const ASOMA = { x: 50.36, z: 44.2 };
const DETRAS = { x: 50.81, z: 43.85 };

// Guion (s). (Los gestos, FI_CLIPS.cortina, van con estos mismos tiempos.)
const T_A = 2.9; // por encima del hombro
const T_ANDA = 2.2; // lo que anda el jugador, calleja adentro
const T_ABRE = [3.5, 4.3]; // la cortina se aparta
const T_DICE = 5.5;
const T_SE_VA = [7.4, 8.0]; // suelta el paño y se retira
const T_END = 9.0;
const T_CORTE = T_END - 0.45; // vuelve la cámara del juego

// El paño, a contraluz: lienzo crudo con sus pliegues (más claro donde la
// tela es fina, en el centro, donde da la vela)
function panoTex() {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 32;
  const x = c.getContext('2d');
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 32; j++) {
      const f = 0.84 + 0.1 * Math.sin(i * 1.3 + Math.sin(j * 0.21) * 0.8) + 0.05 * Math.sin(i * 3.1);
      const v = f * (0.75 + 0.25 * Math.sin((j / 31) * Math.PI)) * (0.85 + 0.15 * Math.sin((i / 15) * Math.PI));
      x.fillStyle = `rgb(${Math.round(150 * v)},${Math.round(112 * v)},${Math.round(70 * v)})`;
      x.fillRect(i, j, 1, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class CortinaCine {
  constructor(g, F) {
    this.g = g;
    this.F = F;
    this.t = 0;
    this.cues = new Set();
    this.pos = new V3();
    this.look = new V3();
  }
  cue(id, at) {
    if (this.t >= at && !this.cues.has(id)) {
      this.cues.add(id);
      return true;
    }
    return false;
  }

  start() {
    const g = this.g;
    const F = this.F;
    const p = g.player;
    g.flags['fisico:intro'] = true;
    F.modo = 'cine';
    // (unos pasos más, calleja adentro, y se para)
    p.state = 'free';
    p.autoDir = { x: 1, z: 0, m: 0.32 };
    g.lockTarget = null;
    g.ui.showHud(false);
    g.audio && g.audio.play('dread');
    // él, en la alcoba (quieto: lo mueve el guion)
    const e = F.e;
    F.show(DETRAS.x, DETRAS.z, -Math.PI / 2);
    e.scripted = true;
    e.pos.set(DETRAS.x, VEN.piso, DETRAS.z);
    e.anim.play(FI_CLIPS.cortina, { blend: 0.03 });
    // el paño que se aparta: un lienzo a contraluz (la vela de dentro)
    const mat = registerMaterialPatch(new THREE.MeshBasicMaterial({ map: panoTex(), side: THREE.DoubleSide }));
    this.pano = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    this.pano.rotation.y = Math.PI / 2;
    g.scene.add(this.pano);
    this.posePano(0);
    // la vela que le alumbra la máscara
    this.luz = g.fx.lights.add({ x: ASOMA.x + 0.6, y: VEN.piso + 1.6, z: ASOMA.z + 0.45, color: 0xffa050, intensity: 0, range: 3.4, flicker: 1, priority: 6 });
  }
  // el paño: k = 0, corrido (tapa el hueco); k = 1, recogido contra el marco
  posePano(k) {
    const w = (VEN.z1 - VEN.z0) * lerp(1, 0.16, k);
    this.pano.scale.set(w, VEN.y1 - VEN.y0, 1);
    this.pano.position.set(VEN.x + 0.14, (VEN.y0 + VEN.y1) / 2, VEN.z1 - w / 2);
  }

  update(dt) {
    const g = this.g;
    const e = this.F.e;
    const p = g.player;
    this.t += dt;
    const t = this.t;
    g.post.U.uBars.value = 0.11 * Math.min(seg(t, 0, 0.6), 1 - seg(t, T_END - 0.5, T_END));
    if (p.autoDir && t > T_ANDA) {
      p.autoDir = null;
      p.state = 'cine';
    }
    // --- él: se acerca a la rendija, mira, y se retira a lo oscuro
    const u = seg(t, T_ABRE[0] + 0.1, T_ABRE[1] + 0.1) * (1 - seg(t, T_SE_VA[0], T_SE_VA[1]));
    e.pos.set(lerp(DETRAS.x, ASOMA.x, u), VEN.piso, lerp(DETRAS.z, ASOMA.z, u));
    e.yaw = -Math.PI / 2;
    e.vx = e.vz = 0;
    e.animate(dt);
    this.luz.intensity = 2.4 * seg(t, T_ABRE[0], T_ABRE[1]) * (1 - seg(t, T_SE_VA[0] + 0.2, T_SE_VA[1] + 0.4));
    // --- el paño
    this.posePano(seg(t, T_ABRE[0], T_ABRE[1]) * (1 - seg(t, T_SE_VA[0] + 0.1, T_SE_VA[1] + 0.1)));
    const at = { x: VEN.x, y: 5.5, z: 44.2 };
    if (this.cue('abre', T_ABRE[0])) g.audio && g.audio.play('stairCreak', at);
    if (this.cue('dice', T_DICE)) fiSay(e, DIALOG.fisicoCortina, 2.6);
    if (this.cue('cae', T_SE_VA[0] + 0.2)) g.audio && g.audio.play('stairCreak', at);
    // --- cámara
    if (t < T_A) {
      // por encima del hombro: la calleja entera y, al fondo, la casa
      const s = seg(t, 0, T_A);
      this.pos.set(Math.max(14.7, p.pos.x - 1.6 - s * 0.3), p.visY + 2.05, p.pos.z + 0.75);
      this.look.set(VEN.x, lerp(3.6, 5.2, s), 44.1);
      g.camRig.override = { pos: this.pos, look: this.look, fov: lerp(46, 38, s), snap: true };
    } else if (t < T_CORTE) {
      // la ventana, de lejos y muy cerrado
      const s = seg(t, T_A, T_END);
      this.pos.set(38.6, 2.1, 44.6);
      this.look.set(VEN.x, 5.62 - s * 0.05, 44.15);
      g.camRig.override = { pos: this.pos, look: this.look, fov: lerp(14, 11.5, s), snap: true };
    } else if (this.cue('corte', T_CORTE)) this.camBack();
    return t < T_END;
  }
  camBack() {
    const g = this.g;
    g.camRig.override = null;
    g.camRig.snapTo(g.player);
    g.camRig.yaw = Math.PI / 2;
    g.camRig.pitch = 0.16;
    g.camera.fov = g.camRig.fovBase;
    g.camera.updateProjectionMatrix();
  }

  skip() {
    this.t = Math.max(this.t, T_CORTE - 0.01);
  }

  end() {
    const g = this.g;
    const F = this.F;
    const p = g.player;
    g.post.U.uBars.value = 0;
    if (!this.cues.has('corte')) this.camBack();
    p.autoDir = null;
    if (p.state === 'cine') p.state = 'free';
    g.scene.remove(this.pano);
    this.pano.geometry.dispose();
    this.pano.material.map.dispose();
    this.luz.on = false;
    const L = g.fx.lights.sources;
    const i = L.indexOf(this.luz);
    if (i >= 0) L.splice(i, 1);
    g.ui.showHud(true);
    F.e.anim.stop(0.01);
    F.fuera(14);
    g.saveGame();
  }
}

// El enganche con el juego: las escenas del Físico van, como la de la
// bodega, en g.cutscene.
export class FisicoCine {
  constructor(g) {
    this.g = g;
  }
  cortina(F) {
    const g = this.g;
    if (g.cutscene) return;
    g.cutscene = new CortinaCine(g, F);
    g.cutscene.start();
  }
}
