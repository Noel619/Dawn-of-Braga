// El Caballero de la Orden (entities/caballero.js): lo que suelta su espada
// (la cuchilla de viento que corre por las losas, la cruz que corta un
// instante después), la estela de la hoja, el pendón del Rey (en su asta
// junto al parapeto; a media vida, en su mano izquierda), las hojas que trae
// el viento a lo alto de la torre y la escena de la luna (CaballeroCine).
import * as THREE from 'three';
import { additiveFog, registerMaterialPatch } from '../gfx/materials.js';
import { getTexture } from '../gfx/textures.js';
import { SwordTrail } from '../gfx/effects.js';
import { tipPos, PENDON, CAB_CLIPS } from '../entities/caballero.js';
import { DIALOG } from './story.js';

const V3 = THREE.Vector3;
const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => sm((t - a) / (b - a));
void DIALOG;

// Lo que hacen al alcanzarte (todo crítico; ver Combat.apply).
const BLADE = { dmg: 34, stDmg: 52, crit: true, chip: 0.3, knock: 5, deflect: true };
const XATK = { dmg: 38, stDmg: 56, crit: true, chip: 0.35, knock: 6, noParry: true };

// La cuchilla: una media luna de luz fría, de pie, con el lomo hacia delante
// (colores de vértice, mezcla aditiva: negro = nada).
function bladeGeo() {
  const N = 16;
  const pos = [],
    col = [],
    idx = [];
  // (una media luna: la banda brillante se arquea hacia arriba en el medio;
  // por encima y por debajo, un halo que se apaga)
  const R = 5;
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * 2 - 1;
    const b = 1 - s * s;
    const x = s * 1.1,
      z = 0.45 * b;
    const fade = 1 - Math.pow(Math.abs(s), 2.5);
    const yc = 0.3 + 0.55 * b;
    const rows = [
      [yc - 0.38, 0.0],
      [yc - 0.08, 0.22],
      [yc, 0.9],
      [yc + 0.06, 0.25],
      [yc + 0.32, 0.0],
    ];
    for (const [y, k] of rows) {
      pos.push(x, y, z);
      const c = k * fade;
      col.push(0.55 * c, 0.72 * c, 1.0 * c);
    }
  }
  for (let i = 0; i < N; i++)
    for (let r = 0; r < R - 1; r++) {
      const a = i * R + r,
        b = (i + 1) * R + r;
      idx.push(a, b, b + 1, a, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}
const addMat = (o = {}) => additiveFog(new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, ...o }));

// Las hojas secas que sube el viento (del pomar del Paço) a lo alto de la
// torre: cruzan de poniente a levante, dando vueltas.
class Leaves {
  constructor(scene, n = 70) {
    this.n = n;
    const geo = new THREE.PlaneGeometry(0.11, 0.075);
    const mat = registerMaterialPatch(new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
    this.mesh = new THREE.InstancedMesh(geo, mat, n);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    const c = new THREE.Color();
    this.L = [];
    for (let i = 0; i < n; i++) {
      c.setHSL(0.07 + Math.random() * 0.05, 0.55, 0.16 + Math.random() * 0.14);
      this.mesh.setColorAt(i, c);
      this.L.push({ p: new V3(), v: new V3(), r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0), w: new V3(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 6 - 3), ph: Math.random() * 9, live: false });
    }
    scene.add(this.mesh);
    this.k = 0;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._s = new V3(1, 1, 1);
  }
  spawn(L, c, first) {
    // a barlovento de la cámara (o en cualquier sitio, la primera vez)
    L.p.set(c.x - (first ? Math.random() * 28 - 14 : 14 + Math.random() * 3), c.y - 2 + Math.random() * 7, c.z + Math.random() * 24 - 12);
    L.v.set(6 + Math.random() * 4, Math.random() * 1.2 - 0.3, Math.random() * 1.6 - 0.8);
    L.live = true;
  }
  // on: 0..1 (se ve en lo alto de la torre)
  update(dt, cam, on, time, gust = 1) {
    this.k += (on - this.k) * Math.min(1, dt * 1.5);
    const vis = this.k > 0.02;
    this.mesh.visible = vis;
    if (!vis) {
      for (const L of this.L) L.live = false;
      return;
    }
    const want = Math.round(this.n * this.k);
    for (let i = 0; i < this.n; i++) {
      const L = this.L[i];
      if (!L.live) {
        if (i < want) this.spawn(L, cam, true);
        else {
          this.mesh.setMatrixAt(i, this._m.makeScale(0, 0, 0));
          continue;
        }
      }
      const fl = Math.sin(time * 3.1 + L.ph);
      L.p.x += L.v.x * gust * dt;
      L.p.y += (L.v.y + fl * 0.9) * dt;
      L.p.z += (L.v.z + Math.cos(time * 2.3 + L.ph) * 0.6) * dt;
      L.r.x += L.w.x * dt;
      L.r.y += L.w.y * dt;
      L.r.z += L.w.z * dt;
      if (L.p.x > cam.x + 15 || Math.abs(L.p.z - cam.z) > 14 || L.p.y < cam.y - 5 || L.p.y > cam.y + 9) {
        if (i < want) this.spawn(L, cam, false);
        else L.live = false;
      }
      this._q.setFromEuler(L.r);
      this.mesh.setMatrixAt(i, this._m.compose(L.p, this._q, this._s));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export class Caballero {
  constructor(g) {
    this.g = g;
    this.e = g.enemies.find((e) => e.type === 'caballero') || null;
    this.blades = [];
    this.marks = [];
    this.bladeGeo = bladeGeo();
    this.stripeGeo = new THREE.PlaneGeometry(3.4, 0.3).rotateX(-Math.PI / 2);
    this.slashGeo = new THREE.PlaneGeometry(3.4, 1.7).translate(0, 0.85, 0);
    this.trailFx = new SwordTrail(g.scene, { color: 0x7d93bc, life: 0.12 });
    this.leaves = new Leaves(g.scene, 90);
    // el paño del pendón, en su mano (se pone en el mundo cada fotograma)
    const cm = registerMaterialPatch(new THREE.MeshLambertMaterial({ map: getTexture('bannerRey'), alphaTest: 0.5, side: THREE.DoubleSide }), { wind: true });
    const cg = new THREE.PlaneGeometry(0.95, 1.35, 3, 6).translate(0.475, -0.675, 0);
    this.cloth = new THREE.Mesh(cg, cm);
    this.cloth.visible = false;
    g.scene.add(this.cloth);
    this._t = new V3();
    this._b = new V3();
  }

  // ------------------------------------------------------------ la cuchilla
  tajo(e, o = {}) {
    const g = this.g;
    const p = g.player;
    const n = o.one ? 1 : e.data.phase2 ? 3 : 1;
    const base = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    for (let i = 0; i < n; i++) {
      const a = base + (n > 1 ? (i - (n - 1) / 2) * 0.32 : 0);
      const dir = new V3(Math.sin(a), 0, Math.cos(a));
      const mesh = new THREE.Mesh(this.bladeGeo, addMat({ vertexColors: true }));
      mesh.renderOrder = 8;
      g.scene.add(mesh);
      const pos = new V3(e.pos.x + dir.x * 1.1, 0, e.pos.z + dir.z * 1.1);
      this.blades.push({ mesh, pos, dir, y: e.pos.y + 0.02, v: o.v ?? (e.data.phase2 ? 14.5 : 13), t: 0, life: 1.9, src: e, done: false });
    }
    g.audio && g.audio.play('iai', e.pos);
    g.audio && g.audio.play('leapWind', e.pos);
  }
  bladeBurst(B) {
    const g = this.g;
    g.fx.blood.emit(B.pos.x, B.y + 0.7, B.pos.z, 22, { color: [0.7, 0.82, 1], speed: 5, life: 0.35, up: 1.2 });
    g.audio && g.audio.play('deflect', { x: B.pos.x, y: B.y + 0.7, z: B.pos.z });
    this.dropBlade(B);
  }
  dropBlade(B) {
    this.g.scene.remove(B.mesh);
    B.mesh.material.dispose();
    B.dead = true;
  }

  // ------------------------------------------------------------ la cruz
  cruz(e) {
    const g = this.g;
    const fx = Math.sin(e.yaw),
      fz = Math.cos(e.yaw);
    const x = e.pos.x + fx * 1.7,
      z = e.pos.z + fz * 1.7;
    const y = g.world.col.groundHeight(x, z, 0.3, e.pos.y + 1) + 0.03;
    const grp = new THREE.Group();
    grp.position.set(x, y, z);
    grp.rotation.y = e.yaw;
    const stripes = [];
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(this.stripeGeo, addMat({ color: 0x000000 }));
      m.rotation.y = s * Math.PI * 0.25;
      m.renderOrder = 8;
      grp.add(m);
      stripes.push(m);
    }
    g.scene.add(grp);
    this.marks.push({ grp, stripes, slashes: [], x, y, z, yaw: e.yaw, t: 0, boom: 0.5, src: e, done: false });
  }

  // ------------------------------------------------------------ la estela
  trail(e, on) {
    const g = this.g;
    const b = e.rig.worldPos('handR', this._b, TB);
    const t = tipPos(e, this._t);
    this.trailFx.update(g.time, b, t, on);
  }

  // ------------------------------------------------------------ el pendón
  tomarPendon(e) {
    const g = this.g;
    g.setGroupVisible('pendon:caballero', false);
    if (e._pendon) for (const m of e._pendon) m.visible = true;
    this.cloth.visible = true;
    g.audio && g.audio.play('woodBreak', e.pos);
    g.camRig.shake(0.35);
    g.fx.blood.emit(PENDON.x, e.pos.y + 0.3, PENDON.z, 18, { color: [0.5, 0.47, 0.42], speed: 3, life: 0.6, up: 1.5 });
  }
  resetPendon(e) {
    const g = this.g;
    if (g.setGroupVisible && g.groups && g.groups['pendon:caballero']) g.setGroupVisible('pendon:caballero', !g.flags['boss:caballero']);
    if (e && e._pendon) for (const m of e._pendon) m.visible = false;
    this.cloth.visible = false;
  }

  // ------------------------------------------------------------ cada fotograma
  update(dt) {
    const g = this.g;
    const p = g.player;
    const col = g.world.col;
    // las cuchillas
    for (const B of this.blades) {
      if (B.dead) continue;
      B.t += dt;
      const step = B.v * dt;
      const wall = col.raycast(B.pos.x, B.y + 0.6, B.pos.z, B.dir.x, 0, B.dir.z, step + 0.3, (b) => !b.camOnly && !b.noSight && b.tag !== 'fog');
      if (wall !== Infinity) {
        B.pos.addScaledVector(B.dir, Math.max(0, wall - 0.3));
        this.bladeBurst(B);
        continue;
      }
      B.pos.addScaledVector(B.dir, step);
      if (!B.done && !p.dead) {
        const dx = p.pos.x - B.pos.x,
          dz = p.pos.z - B.pos.z;
        const along = dx * B.dir.x + dz * B.dir.z,
          lat = Math.abs(dx * B.dir.z - dz * B.dir.x);
        if (along < 0.5 && along > -step - 0.45 && lat < 1.3 && Math.abs(p.pos.y - B.y) < 1.6) {
          B.done = true;
          const r = g.combat.apply(B.src, BLADE, B.pos.x - B.dir.x, B.pos.z - B.dir.z);
          if (r) {
            this.bladeBurst(B);
            continue;
          }
        }
      }
      const k = Math.min(1, B.t / 0.08) * Math.min(1, (B.life - B.t) / 0.3);
      B.mesh.position.set(B.pos.x, B.y, B.pos.z);
      B.mesh.rotation.y = Math.atan2(B.dir.x, B.dir.z);
      B.mesh.material.color.setScalar(k * (0.85 + 0.15 * Math.sin(B.t * 47)));
      B.mesh.scale.set(1, 0.92 + 0.08 * Math.sin(B.t * 31), 1);
      if (Math.random() < 0.7) g.fx.blood.emit(B.pos.x + (Math.random() - 0.5) * 1.2, B.y + 0.06, B.pos.z, 1, { color: [0.6, 0.6, 0.64], speed: 1.4, life: 0.45, up: 0.9, gravity: 3 });
      if (B.t >= B.life) this.dropBlade(B);
    }
    this.blades = this.blades.filter((B) => !B.dead);
    // las cruces
    for (const M of this.marks) {
      M.t += dt;
      const t = M.t;
      if (t < M.boom) {
        const grow = sm(t / 0.12);
        const glow = 0.25 + 0.75 * sm((t - 0.12) / (M.boom - 0.12)) + 0.15 * Math.sin(t * 50);
        for (const s of M.stripes) {
          s.scale.set(grow, 1, 1);
          s.material.color.setRGB(1.0 * glow, 0.32 * glow, 0.22 * glow);
        }
      } else if (!M.done) {
        M.done = true;
        this.boom(M);
      } else {
        const u = (t - M.boom) / 0.22;
        for (const s of M.stripes) s.material.color.setRGB(1 * (1 - u), 0.85 * (1 - u), 0.7 * (1 - u));
        for (const s of M.slashes) s.material.color.setRGB(0.9 * (1 - u), 0.92 * (1 - u), 1.0 * (1 - u));
        if (u >= 1) {
          g.scene.remove(M.grp);
          for (const m of [...M.stripes, ...M.slashes]) m.material.dispose();
          M.dead = true;
        }
      }
    }
    this.marks = this.marks.filter((M) => !M.dead);
    // el pendón en su mano: cuelga del asta (y se tiende al girar)
    const e = this.e;
    if (e && this.cloth.visible) {
      if (e.dead || !e.data.pendon || !e.obj.visible) this.cloth.visible = e.data.pendon && !e.dead && e.obj.visible;
      if (this.cloth.visible) {
        const top = e.rig.worldPos('pendon', this._t, PT);
        this.cloth.position.copy(top);
        const spin = e.data.spin || 0;
        this.cloth.rotation.set(0, e.obj.rotation.y + Math.PI * 0.5 + 0.35 * Math.sin(g.time * 1.3), spin ? -1.1 : -0.08 + 0.05 * Math.sin(g.time * 2.1));
      }
    }
    // las hojas (sólo en lo alto de la torre)
    const z = g.zone;
    const on = z && z.id === 'homenaje_terraza' ? 1 : 0;
    this.leaves.update(dt, g.camera.position, on, g.time, 0.8 + 0.4 * Math.sin(g.time * 0.7) * Math.sin(g.time * 0.23));
  }

  boom(M) {
    const g = this.g;
    const p = g.player;
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(this.slashGeo, addMat({ color: 0xe8ecff }));
      m.rotation.y = s * Math.PI * 0.25;
      m.renderOrder = 8;
      M.grp.add(m);
      M.slashes.push(m);
    }
    g.audio && g.audio.play('swingKatana', { x: M.x, y: M.y + 1, z: M.z });
    g.audio && g.audio.play('iai', { x: M.x, y: M.y + 1, z: M.z });
    g.combat.impactFlash(M.x, M.y + 0.8, M.z, 2.2, 0xffd0c0);
    g.fx.blood.emit(M.x, M.y + 0.4, M.z, 30, { color: [1, 0.86, 0.8], speed: 5, life: 0.35, up: 2 });
    if (p.dead || Math.abs(p.pos.y - M.y) > 1.6) return;
    // ¿dentro del aspa? (cada brazo: 3,4 m de largo y medio metro de ancho)
    const dx = p.pos.x - M.x,
      dz = p.pos.z - M.z;
    for (const s of [-1, 1]) {
      const a = M.yaw + s * Math.PI * 0.25;
      // (eje largo de la franja: el x local girado)
      const ux = Math.cos(a),
        uz = -Math.sin(a);
      const along = dx * ux + dz * uz,
        perp = Math.abs(-dx * uz + dz * ux);
      if (Math.abs(along) < 1.9 && perp < 0.62) {
        g.combat.apply(M.src, XATK, M.x, M.z);
        return;
      }
    }
  }

  // Al morir, al volver a un altar: fuera lo que quedaba en el aire.
  clear() {
    for (const B of this.blades) this.dropBlade(B);
    this.blades = [];
    for (const M of this.marks) {
      this.g.scene.remove(M.grp);
      for (const m of [...M.stripes, ...M.slashes]) m.material.dispose();
    }
    this.marks = [];
  }

  applyFlags() {
    const g = this.g;
    const dead = !!g.flags['boss:caballero'];
    // (vencido, el pendón ya no vuelve a su asta)
    if (g.groups && g.groups['pendon:caballero']) g.setGroupVisible('pendon:caballero', !dead);
    this.cloth.visible = false;
    const e = this.e;
    if (e && dead) {
      // de rodillas donde esperaba, mirando la luna
      e.obj.visible = true;
      e.shadow.visible = true;
      if (e._pendon) for (const m of e._pendon) m.visible = false;
    }
  }
}
// (la empuñadura y lo alto del asta del pendón, en el espacio de su hueso)
const TB = new V3(0, -0.05, 0.2);
const PT = new V3(0, 0, 1.86);

// ======================================================================
// LA ESCENA DE LA LUNA (la primera vez que se cruza la niebla de la caseta).
// A: de lejos, la terraza y, junto al parapeto del norte, él, de espaldas,
//    apoyado en la espada, mirando la luna grande sobre el Paço; tú sales de
//    la caseta. B: detrás de él, a contraluz; el viento le mueve la capa; se
//    vuelve y te mira. C: de frente: saca la espada de las losas, la alza
//    delante del yelmo y la baja de un tajo: en guardia. D: el plano lateral:
//    tú a la izquierda, él a la derecha y la luna sobre él; el viento y las
//    hojas pasan entre los dos mientras la cámara se aleja despacio. Se salta
//    con «interactuar».
const T_A = 3.4;
const T_B = 7.0;
const T_C = 9.7;
const T_END = 13.8;
const T_CORTE = T_END - 0.4;
// dónde quedas para el plano lateral (y para empezar la pelea)
const FRENTE = { x: -84.4, z: -26.6 };

export class CaballeroCine {
  constructor(g, e) {
    this.g = g;
    this.e = e;
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
    const e = this.e;
    const p = g.player;
    g.flags['cine:caballero'] = true;
    // (unos pasos fuera de la caseta, y se para)
    p.state = 'free';
    p.autoDir = { x: 0.62, z: -0.2, m: 0.3 };
    g.lockTarget = null;
    g.ui.cineHud(true);
    e.scripted = true;
    e.state = 'bossIdle';
    e.vx = e.vz = 0;
    e.yaw = e.home.yaw;
    this.yaw0 = e.yaw;
    g.audio && g.audio.play('dread');
  }
  update(dt) {
    const g = this.g;
    const e = this.e;
    const p = g.player;
    this.t += dt;
    const t = this.t;
    g.post.U.uBars.value = 0.11 * Math.min(seg(t, 0, 0.6), 1 - seg(t, T_END - 0.5, T_END));
    if (p.autoDir && t > 1.6) {
      p.autoDir = null;
      p.state = 'cine';
    }
    // --- él: mirando la luna; se vuelve hacia ti; el saludo; en guardia
    const toP = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    if (t < T_A + 1.2) e.yaw = this.yaw0;
    else if (t < T_C) e.yaw = this.yaw0 + angle(this.yaw0, toP) * seg(t, T_A + 1.2, T_A + 2.9);
    if (this.cue('vuelve', T_A + 1.2)) g.audio && g.audio.play('armorClank', e.pos);
    if (this.cue('saludo', T_B)) e.anim.play(CAB_CLIPS.saludo, { blend: 0.3 });
    if (this.cue('lateral', T_C)) {
      // (el corte: tú, de frente a él, a seis pasos; él, en guardia)
      p.spawn(FRENTE.x, e.pos.y, FRENTE.z, Math.atan2(e.pos.x - FRENTE.x, e.pos.z - FRENTE.z));
      p.state = 'cine';
      e.yaw = Math.atan2(FRENTE.x - e.pos.x, FRENTE.z - e.pos.z);
      e.state = 'chase';
      e.anim.stop(0.3);
    }
    e.vx = e.vz = 0;
    e.animate(dt);
    if (p.state === 'cine') p.yaw = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
    // --- la cámara
    const ex = e.pos.x,
      ey = e.pos.y,
      ez = e.pos.z;
    const fx = Math.sin(this.yaw0),
      fz = Math.cos(this.yaw0);
    if (t < T_A) {
      // de lejos: la terraza, él al fondo junto al parapeto y la luna
      const s = seg(t, 0, T_A);
      this.pos.set(lerp(-83.4, -82.6, s), ey + lerp(1.9, 2.1, s), lerp(-14.0, -15.8, s));
      this.look.set(ex - 0.4, ey + lerp(3.0, 2.7, s), ez);
      g.camRig.override = { pos: this.pos, look: this.look, fov: lerp(40, 35, s), snap: true };
    } else if (t < T_B) {
      // detrás de él, bajo, a contraluz de la luna; se vuelve
      const s = seg(t, T_A, T_B);
      const bx = -fx,
        bz = -fz;
      const sx = fz,
        sz = -fx;
      const d = lerp(3.4, 2.8, s);
      this.pos.set(ex + bx * d + sx * 1.3, ey + 0.9, ez + bz * d + sz * 1.3);
      this.look.set(ex + fx * 5 - sx * 0.6, ey + lerp(3.2, 2.6, s), ez + fz * 5 - sz * 0.6);
      g.camRig.override = { pos: this.pos, look: this.look, fov: 44, snap: true };
    } else if (t < T_C) {
      // de frente, desde donde estás tú: el saludo
      const s = seg(t, T_B, T_C);
      const ux = p.pos.x - ex,
        uz = p.pos.z - ez;
      const ul = Math.hypot(ux, uz) || 1;
      const d = lerp(3.6, 3.1, s);
      this.pos.set(ex + (ux / ul) * d + (uz / ul) * 0.5, ey + 1.0, ez + (uz / ul) * d - (ux / ul) * 0.5);
      this.look.set(ex, ey + lerp(1.65, 1.5, s), ez);
      g.camRig.override = { pos: this.pos, look: this.look, fov: 40, snap: true };
    } else if (t < T_CORTE) {
      // el plano lateral: tú a la izquierda, él a la derecha, la luna encima
      // de él; la cámara se aleja despacio
      const s = seg(t, T_C, T_END);
      const mx = (p.pos.x + ex) / 2,
        mz = (p.pos.z + ez) / 2;
      const ux = ex - p.pos.x,
        uz = ez - p.pos.z;
      const ul = Math.hypot(ux, uz) || 1;
      // (la normal hacia la que tú quedas a la izquierda: hacia el sur)
      let nx = -uz / ul,
        nz = ux / ul;
      if (nz < 0) {
        nx = -nx;
        nz = -nz;
      }
      const dist = lerp(6.0, 8.6, s);
      this.pos.set(mx + nx * dist, ey + lerp(1.05, 1.3, s), mz + nz * dist);
      this.look.set(mx, ey + lerp(1.9, 2.1, s), mz);
      g.camRig.override = { pos: this.pos, look: this.look, fov: lerp(40, 44, s), snap: true };
    } else if (this.cue('corte', T_CORTE)) this.camBack();
    return t < T_END;
  }
  camBack() {
    const g = this.g;
    const p = g.player;
    const e = this.e;
    g.camRig.override = null;
    g.camRig.snapTo(p);
    g.camRig.yaw = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
    g.camRig.pitch = 0.18;
    g.camera.fov = g.camRig.fovBase;
    g.camera.updateProjectionMatrix();
  }
  skip() {
    this.t = Math.max(this.t, T_CORTE - 0.01);
  }
  end() {
    const g = this.g;
    const e = this.e;
    const p = g.player;
    g.post.U.uBars.value = 0;
    // (si se saltó antes del plano lateral: a seis pasos de él, igual)
    if (!this.cues.has('lateral')) {
      p.spawn(FRENTE.x, e.pos.y, FRENTE.z, Math.atan2(e.pos.x - FRENTE.x, e.pos.z - FRENTE.z));
      e.yaw = Math.atan2(FRENTE.x - e.pos.x, FRENTE.z - e.pos.z);
    }
    if (!this.cues.has('corte')) this.camBack();
    p.autoDir = null;
    if (p.state === 'cine') p.state = 'free';
    g.ui.showHud(true);
    e.scripted = false;
    // en guardia: a pelear
    e.aware = true;
    e.state = 'chase';
    e.stT = 0;
    e.cooldown = 0.6;
    e.anim.stop(0.2);
    g.caballeroFight && g.caballeroFight(e);
  }
}
function angle(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
