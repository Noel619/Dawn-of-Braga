// Lo que pasa en las cloacas hondas (world/cloacas_hondas.js):
//  - el agua a la rodilla de los tramos ahogados: se anda despacio (el
//    jugador: vadeo), y salpica;
//  - la cosecha de lo hondo: el musgo de luz, la raíz amarga y la flor de lo
//    hondo, en sus sitios (L.cosechas). Se recoge una vez; rebrota a los
//    quince minutos de juego, pero sólo si te has ido lejos (fuera de lo
//    hondo): mirándola no crece. Lo cosechado y cuándo, en las banderas de la
//    partida (cosecha:id, el tiempo de juego);
//  - el pozo de la tapa: de lo hondo se sube al Vergel (se abre la tapa desde
//    abajo; al caer, se traba sola: desde arriba no se baja).
import * as THREE from 'three';
import { objMat } from '../gfx/materials.js';
import { ITEMS, MSG } from './story.js';
import { HONDAS } from '../world/cloacas_hondas.js';

// cuánto tarda en rebrotar (segundos de juego) y lo lejos que hay que estar
export const REBROTE = 900;
const LEJOS = 40;
// lo que da cada sitio
const RINDE = { musgo_luz: 2, raiz_amarga: 2, flor_hondo: 1 };

export class Cloacas {
  constructor(g) {
    this.g = g;
    const L = g.level.L;
    this.ahogados = g.level.ctx.ahogados || [];
    this.cosechas = (L.cosechas || []).map((c) => ({ ...c, obj: this.modelo(c) }));
    for (const c of this.cosechas) {
      g.scene.add(c.obj);
      // (su interacción: el sistema de interacción la ofrece; aquí se dice
      // si está)
      c.it = g.interact.list.find((it) => it.id === 'i_' + c.id) || null;
    }
    this.splashT = 0;
    this.chk = 0;
    this.pend = [];
    this.refresh();
  }

  // ------------------------------------------------------------ la cosecha
  // El modelo de lo que se cosecha: una mata de musgo que da luz, un nudo de
  // raíz roja que sale del suelo, una flor blanca de corazón negro.
  modelo(c) {
    const grp = new THREE.Group();
    grp.position.set(c.x, c.y, c.z);
    let seed = c.id.length * 7 + Math.round(c.x * 13 + c.z * 7);
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    if (c.item === 'musgo_luz') {
      const m = objMat('musgoGlow');
      for (let i = 0; i < 9; i++) {
        const a = rnd() * Math.PI * 2,
          d = Math.sqrt(rnd()) * 0.42;
        const s = 0.1 + rnd() * 0.12;
        const b = new THREE.Mesh(new THREE.SphereGeometry(s, 7, 4), m);
        b.scale.set(1, 0.42, 1);
        b.position.set(Math.cos(a) * d, s * 0.3, Math.sin(a) * d);
        grp.add(b);
      }
    } else if (c.item === 'raiz_amarga') {
      const m = objMat('wooddark', { tint: 0x8a5a44 });
      const r = objMat('flesh');
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + rnd();
        const L = 0.5 + rnd() * 0.4;
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.07, L, 6), m);
        cyl.position.set(Math.cos(a) * 0.18, L * 0.32, Math.sin(a) * 0.18);
        cyl.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
        grp.add(cyl);
      }
      const nudo = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), m);
      nudo.scale.set(1.2, 0.8, 1);
      nudo.position.y = 0.08;
      grp.add(nudo);
      // (un corte, rojo por dentro)
      const corte = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), r);
      corte.position.set(0.16, 0.12, 0);
      corte.rotation.y = Math.PI / 2;
      grp.add(corte);
    } else {
      // la flor: el tallo, dos hojas, seis pétalos de cera y el corazón negro
      const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.5, 5), objMat('wooddark', { tint: 0x4a6a34 }));
      tallo.position.y = 0.25;
      grp.add(tallo);
      const flor = new THREE.Group();
      flor.position.y = 0.52;
      const pm = objMat('florCera');
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), pm);
        p.scale.set(1, 0.3, 0.55);
        p.position.set(Math.cos(a) * 0.075, 0.02, Math.sin(a) * 0.075);
        p.rotation.y = -a;
        p.rotation.z = 0.5;
        flor.add(p);
      }
      const cor = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), objMat('black'));
      cor.position.y = 0.03;
      flor.add(cor);
      grp.add(flor);
      grp.userData.flor = flor;
      for (const sd of [-1, 1]) {
        const h = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 3), objMat('wooddark', { tint: 0x5a8a40 }));
        h.scale.set(1, 0.12, 0.4);
        h.position.set(sd * 0.08, 0.16, 0);
        h.rotation.z = sd * 0.5;
        grp.add(h);
      }
    }
    grp.traverse((o) => o.layers.set(1));
    return grp;
  }

  // ¿Está para cosechar?
  hay(c) {
    return !(this.g.flags && this.g.flags['cosecha:' + c.id]);
  }
  refresh() {
    for (const c of this.cosechas) {
      const ok = this.hay(c);
      c.obj.visible = ok;
      if (c.it) c.it.hidden = !ok;
    }
  }
  cosechar(it) {
    const g = this.g;
    const c = this.cosechas.find((q) => 'i_' + q.id === it.id);
    if (!c) return;
    if (!this.hay(c)) {
      g.ui.toast(MSG.cosechaNo, 4);
      return;
    }
    const p = g.player;
    p.playInteract('interact', Math.atan2(c.x - p.pos.x, c.z - p.pos.z));
    g.flags['cosecha:' + c.id] = g.playTime;
    const n = RINDE[c.item] ?? 1;
    // (al cabo del gesto, en tiempo de juego)
    this.pend.push({
      t: 0.38,
      fn: () => {
        g.inventory.add(c.item, n);
        g.ui.toast(MSG.cosecha(ITEMS[c.item].name, n), 4);
        g.audio && g.audio.play('pickup', c);
        this.refresh();
        g.saveGame && g.saveGame();
      },
    });
    // (al arrancarla, lo que la guarda se entera: las plantas de alrededor)
    g.noise && g.noise(c.x, c.y, c.z, 7);
  }
  // Lo que rebrota: pasado su tiempo, y lejos.
  rebrotar() {
    const g = this.g,
      p = g.player.pos;
    let n = 0;
    const lejos = p.y > HONDAS.y.n3 - 1 || this.cosechas.every((c) => Math.hypot(p.x - c.x, p.z - c.z) > LEJOS);
    if (!lejos) return;
    if (!g.flags) return;
    for (const c of this.cosechas) {
      const t = g.flags['cosecha:' + c.id];
      if (t === undefined || t === null || t === false) continue;
      if (g.playTime - t >= REBROTE) {
        delete g.flags['cosecha:' + c.id];
        n++;
      }
    }
    if (n) this.refresh();
  }

  // ------------------------------------------------------------ el pozo de la tapa
  trepar(it) {
    const g = this.g;
    const first = !g.flags['tapa:abierta'];
    g.flags['tapa:abierta'] = true;
    g.hatchMove({ ...it, end: 'bottom', msgUp: first ? 'trepaPozo' : 'trepaPozoYa' });
    g.saveGame && g.saveGame();
  }

  // ------------------------------------------------------------ cada fotograma
  update(dt) {
    const g = this.g;
    const p = g.player;
    for (let i = this.pend.length - 1; i >= 0; i--) {
      const q = this.pend[i];
      q.t -= dt;
      if (q.t <= 0) {
        this.pend.splice(i, 1);
        q.fn();
      }
    }
    // el agua a la rodilla
    let v = 1;
    if (p.pos.y < -12 && !p.dead) {
      const x = p.pos.x,
        z = p.pos.z;
      for (const a of this.ahogados) {
        if (x < a.r[0] || x > a.r[2] || z < a.r[1] || z > a.r[3]) continue;
        if (p.pos.y > a.y + 0.35) continue;
        v = 0.55;
        break;
      }
    }
    p.vadeo = v;
    if (v < 1 && g.audio) {
      const sp = Math.hypot(p.vx || 0, p.vz || 0);
      this.splashT -= dt * Math.min(2.5, sp);
      if (sp > 0.6 && this.splashT <= 0) {
        this.splashT = 1.1;
        g.audio.play('splash', p.pos, { gain: 0.35 });
        g.waters && g.waters.ripple && g.waters.ripple(p.pos.x, p.pos.z, 0.6);
      }
    }
    // la cosecha: que rebrote (una vez por segundo), y la flor que se mece
    this.chk -= dt;
    if (this.chk <= 0) {
      this.chk = 1;
      this.rebrotar();
    }
    if (p.pos.y < HONDAS.y.n3 - 1)
      for (const c of this.cosechas) {
        const f = c.obj.userData.flor;
        if (f && c.obj.visible) f.rotation.z = Math.sin(g.time * 1.3 + c.x) * 0.08;
      }
  }
  applyFlags() {
    this.refresh();
  }
}
