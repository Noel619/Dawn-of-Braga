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
import { clip } from '../entities/rig.js';
import { DIALOG } from './story.js';
import { FORT } from '../world/fortaleza_medidas.js';

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

// Las hojas secas que sube el viento (del jardín del Rey) a lo alto de la
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
    // (vencido, el pendón ya no vuelve a su asta: está en el suelo)
    if (g.groups && g.groups['pendon:caballero']) g.setGroupVisible('pendon:caballero', !dead);
    this.cloth.visible = false;
    this.pendonSuelo(dead);
    if (this.e && dead) this.vencido(this.e);
  }

  // ------------------------------------------------------------ vencido
  // Como queda tras la escena del final (CaballeroFin), y al cargar la
  // partida: él, abajo, en la alberca vacía del jardín, de espaldas y con los
  // brazos en cruz, la cara a la luna; su espada, clavada en las losas de la
  // terraza; el pendón del Rey, tirado.
  vencido(e) {
    const g = this.g;
    this.plantarEspada(e);
    this.pendonSuelo(true);
    if (g.groups && g.groups['pendon:caballero']) g.setGroupVisible('pendon:caballero', false);
    e.dead = true;
    e.state = 'dead';
    e.hp = 0;
    e.atk = null;
    e.vx = e.vz = 0;
    // (no le mueve el bucle de las criaturas: ni lo esconde por estar
    // veintiocho metros más abajo)
    e.scripted = true;
    e.data.spin = 0;
    e.data.caida = 0;
    e.data.pendon = false;
    if (e._pendon) for (const m of e._pendon) m.visible = false;
    this.cloth.visible = false;
    const A = FIN.abajo;
    e.body.pos.set(A.x, A.y, A.z);
    e.body.vy = 0;
    e.yaw = Math.PI * 0.94;
    e.anim.play(CAB_CLIPS.yace, { blend: 0, t0: CAB_CLIPS.yace.dur });
    e.anim.weight = 1;
    e.animate(1 / 30);
    ojos(e, 0);
    e.obj.visible = true;
    e.shadow.visible = false;
  }

  // La espada que deja clavada: sus piezas salen de su mano y se quedan en
  // el mundo donde están. En la escena, al soltarla; si no (al cargar la
  // partida), se le pone donde la dejó, en la clave del clip en que la
  // suelta, y se sueltan de ahí.
  plantarEspada(e, enEscena = false) {
    if (this.espada) return;
    const ms = e.rig.meshes.filter((m) => m.userData.grp === 'espada');
    if (!ms.length) return;
    if (!enEscena) {
      e.body.pos.set(FIN.cae.x, R_, FIN.cae.z);
      e.yaw = 0;
      e.data.caida = 0;
      e.anim.play(CAB_CLIPS.clava, { blend: 0, t0: T_SUELTA });
      e.anim.weight = 1;
      e.animate(0);
    }
    e.obj.updateMatrixWorld(true);
    const grp = new THREE.Group();
    grp.name = 'espada:caballero';
    this.g.scene.add(grp);
    for (const m of ms) grp.attach(m);
    this.espada = grp;
  }

  // El pendón del Rey, tirado en las losas: el asta y su paño, arrugado.
  pendonSuelo(on) {
    if (on && !this.suelo) {
      const e = this.e;
      const P = FIN.pendon;
      const grp = new THREE.Group();
      grp.position.set(P.x, R_ + 0.03, P.z);
      grp.rotation.y = P.yaw;
      // (las piezas del asta, como las lleva él en la mano, tumbadas: su
      // largo, a lo largo de x)
      const asta = new THREE.Group();
      asta.rotation.y = Math.PI / 2;
      grp.add(asta);
      if (e && e._pendon) for (const m of e._pendon) asta.add(new THREE.Mesh(m.geometry, m.material));
      // el paño, arrugado, junto a la moharra
      const geo = this.cloth.geometry.clone();
      const pa = geo.attributes.position;
      for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getX(i) * 7.1 + pa.getY(i) * 5.3) * 0.035 + Math.sin(pa.getY(i) * 11) * 0.02);
      geo.computeVertexNormals();
      const pano = new THREE.Mesh(geo, this.cloth.material);
      pano.rotation.set(-Math.PI / 2, 0, -0.25);
      pano.position.set(1.15, 0.02, -0.05);
      grp.add(pano);
      this.g.scene.add(grp);
      this.suelo = grp;
    }
    if (this.suelo) this.suelo.visible = on;
  }
}
// (la empuñadura y lo alto del asta del pendón, en el espacio de su hueso)
const TB = new V3(0, -0.05, 0.2);
const PT = new V3(0, 0, 1.86);

// Los ojos del Caballero (en el espacio de su cabeza) y su brillo (k = 1, el
// de siempre; 0, apagados).
const OJO = [new V3(-0.034, 0.172, 0.15), new V3(0.034, 0.172, 0.15)];
function ojos(e, k) {
  e.rig.own();
  if (!e._eyes) e._eyes = e.rig.meshes.filter((m) => m.userData.matName === 'eyeCold' || m.userData.matName === 'eyeGlow' || m.userData.matName === 'redGlow');
  for (const m of e._eyes) m.material.emissiveIntensity = (m.userData.baseEI ?? 2) * k;
}

// ======================================================================
// LA ESCENA DE LA LUNA (la primera vez que se cruza la niebla de la caseta).
// Despacio, en siete planos:
// 1. la salida: tú, de la caseta a la terraza; al fondo, junto al parapeto
//    del norte, él, de espaldas, apoyado en su espada;
// 2. la luna: él, de lejos, contra la luna grande sobre la fortaleza; la
//    cámara sube despacio;
// 3. sus manos en el pomo; la punta de la espada, entre dos losas;
// 4. el yelmo, de perfil: te oye; se le encienden los ojos y vuelve la
//    cabeza, despacio, por encima del hombro;
// 5. de espaldas, a contraluz: arranca la espada de las losas y se da la
//    vuelta con todo el peso;
// 6. de frente: el saludo (el puño ante el yelmo, la hoja en alto, quieto)
//    y la baja de un tajo: en guardia;
// 7. el plano lateral: tú a la izquierda, él a la derecha y la luna sobre
//    él; da dos pasos hacia ti, en guardia, y la cámara se aleja.
// Se salta con «interactuar».
const C1 = 5.0,
  C2 = 10.0,
  C3 = 13.2,
  C4 = 17.0,
  C5 = 22.0,
  C6 = 27.0,
  C_END = 33.0;
const C_CORTE = C_END - 0.4;
// (cuándo te oye; cuándo arranca la espada y cuándo se da la vuelta; el
// saludo; sus dos pasos)
const C_OYE = C3 + 1.0;
const C_ARRANCA = C4 + 0.5;
const C_GIRA = [C4 + 2.4, C4 + 4.7];
const C_SALUDO = C5 + 0.2;
const C_PASOS = [C6 + 0.8, C6 + 2.9];
// dónde quedas para el plano lateral (y para empezar la pelea): a seis pasos
// y medio de donde espera él, a poniente; y la cámara del plano de la luna,
// de lejos (las dos, desde donde espera: FORT.torre.caballero)
const CB = FORT.torre.caballero;
const FRENTE = { x: CB.x - 6.4, z: CB.z + 0.7 };
const LEJOS = [
  { x: CB.x - 5.4, z: CB.z + 13.3 },
  { x: CB.x - 4.6, z: CB.z + 11.5 },
];

export class CaballeroCine {
  constructor(g, e) {
    this.g = g;
    this.e = e;
    this.t = 0;
    this.cues = new Set();
    this.pos = new V3();
    this.look = new V3();
    this._h = new V3();
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
    // (unos pasos fuera de la caseta, despacio, y se para)
    p.state = 'free';
    p.autoDir = { x: 0.95, z: -0.31, m: 0.26 };
    g.lockTarget = null;
    g.ui.cineHud(true);
    // (a la que mueve el guion la muestra él: el bucle ya no la toca)
    e.scripted = true;
    e.obj.visible = true;
    e.state = 'bossIdle';
    e.vx = e.vz = 0;
    e.yaw = e.home.yaw;
    e.anim.stop(0);
    this.yaw0 = e.yaw;
    g.audio && g.audio.play('dread');
  }
  update(dt) {
    const g = this.g;
    const e = this.e;
    const p = g.player;
    this.t += dt;
    const t = this.t;
    g.post.U.uBars.value = 0.11 * Math.min(seg(t, 0, 1.2), 1 - seg(t, C_END - 0.6, C_END));
    if (p.autoDir && t > 2.6) {
      p.autoDir = null;
      p.state = 'cine';
    }
    // --- él: te oye; vuelve la cabeza; arranca la espada; se da la vuelta;
    // el saludo; dos pasos en guardia
    if (this.cue('oye', C_OYE)) {
      e.flare = 1;
      e.anim.play(CAB_CLIPS.mira, { blend: 0.4 });
      g.audio && g.audio.play('armorClank', e.pos);
    }
    if (this.cue('arranca', C_ARRANCA)) e.anim.play(CAB_CLIPS.arranca, { blend: 0.2 });
    if (this.cue('chispas', C_ARRANCA + 0.95)) {
      const tp = tipPos(e, this._h);
      g.fx.blood.emit(tp.x, e.pos.y + 0.05, tp.z, 16, { color: [1, 0.85, 0.55], speed: 3, life: 0.35, up: 1.4 });
      g.fx.blood.emit(tp.x, e.pos.y + 0.05, tp.z, 10, { color: [0.5, 0.48, 0.45], speed: 1.5, life: 0.7, up: 0.8, gravity: 4 });
    }
    const toP = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    if (t >= C_GIRA[0] && t < C6) {
      const s = seg(t, C_GIRA[0], C_GIRA[1]);
      e.yaw = this.yaw0 + angle(this.yaw0, toP) * s;
      if (this.cue('pisa1', C_GIRA[0] + 0.3) || this.cue('pisa2', C_GIRA[0] + 1.3)) g.audio && g.audio.play('armorClank', e.pos);
    }
    if (this.cue('saludo', C_SALUDO)) e.anim.play(CAB_CLIPS.saludo, { blend: 0.3 });
    if (this.cue('lateral', C6)) {
      // (el corte: tú, de frente a él, a seis pasos; él, en guardia)
      p.spawn(FRENTE.x, e.pos.y, FRENTE.z, Math.atan2(e.pos.x - FRENTE.x, e.pos.z - FRENTE.z));
      p.state = 'cine';
      e.yaw = Math.atan2(FRENTE.x - e.pos.x, FRENTE.z - e.pos.z);
      e.state = 'chase';
      e.anim.stop(0.3);
    }
    // sus dos pasos, en guardia, hacia ti (las piernas, de la marcha)
    e.vx = e.vz = 0;
    if (t >= C_PASOS[0] && t < C_PASOS[1]) {
      const v = 0.75 * Math.min(1, (t - C_PASOS[0]) / 0.3) * Math.min(1, (C_PASOS[1] - t) / 0.3);
      e.vx = Math.sin(e.yaw) * v;
      e.vz = Math.cos(e.yaw) * v;
      e.body.pos.x += e.vx * dt;
      e.body.pos.z += e.vz * dt;
      if (this.cue('paso1', C_PASOS[0] + 0.5) || this.cue('paso2', C_PASOS[0] + 1.4)) g.audio && g.audio.play('armorClank', e.pos);
    }
    e.animate(dt);
    if (p.state === 'cine') p.yaw = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
    // --- la cámara
    const ey = e.pos.y;
    const fx = Math.sin(this.yaw0),
      fz = Math.cos(this.yaw0);
    // (su derecha y su izquierda, mirando la luna)
    const rx = -fz,
      rz = fx;
    let fov = 40;
    if (t < C1) {
      // la salida: por encima de tu hombro derecho, de camino a él
      const s = seg(t, 0, C1);
      const dl = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) || 1;
      const ux = (p.pos.x - e.pos.x) / dl,
        uz = (p.pos.z - e.pos.z) / dl;
      const back = lerp(1.9, 1.5, s);
      this.pos.set(p.pos.x + ux * back + uz * 0.85, ey + lerp(1.7, 1.85, s), p.pos.z + uz * back - ux * 0.85);
      this.look.set(e.pos.x, ey + lerp(2.2, 1.9, s), e.pos.z);
      fov = lerp(50, 42, s);
    } else if (t < C2) {
      // la luna: de lejos, la cámara sube despacio
      const s = seg(t, C1, C2);
      this.pos.set(lerp(LEJOS[0].x, LEJOS[1].x, s), ey + lerp(0.7, 2.3, s), lerp(LEJOS[0].z, LEJOS[1].z, s));
      this.look.set(e.pos.x - 0.4, ey + lerp(3.4, 2.7, s), e.pos.z);
      fov = lerp(42, 34, s);
    } else if (t < C3) {
      // las manos en el pomo y la hoja hasta las losas, desde delante, a su
      // derecha
      const s = seg(t, C2, C3);
      const h = e.rig.worldPos('handR', this._h);
      const d = lerp(1.5, 1.3, s);
      this.pos.set(h.x + rx * d + fx * lerp(0.95, 0.8, s), ey + 0.62, h.z + rz * d + fz * lerp(0.95, 0.8, s));
      this.look.set(h.x + fx * 0.25, lerp(h.y - 0.32, h.y - 0.4, s), h.z + fz * 0.25);
      fov = 44;
    } else if (t < C4) {
      // el yelmo, de perfil, desde su izquierda (por donde vienes)
      const s = seg(t, C3, C4);
      const h = e.rig.worldPos('head', this._h);
      const d = lerp(1.35, 1.05, s);
      this.pos.set(h.x - rx * d + fx * 0.4, h.y + 0.05, h.z - rz * d + fz * 0.4);
      this.look.set(h.x, h.y + 0.08, h.z);
      fov = lerp(30, 26, s);
    } else if (t < C5) {
      // de espaldas, bajo, a contraluz de la luna: arranca la espada y se
      // da la vuelta
      const s = seg(t, C4, C5);
      const d = lerp(3.4, 2.9, s);
      this.pos.set(CB.x - fx * d + rx * 1.3, ey + lerp(0.8, 1.0, s), CB.z - fz * d + rz * 1.3);
      this.look.set(CB.x + fx * 5 - rx * 0.6, ey + lerp(3.0, 2.4, s), CB.z + fz * 5 - rz * 0.6);
      fov = 44;
    } else if (t < C6) {
      // de frente, desde donde estás tú: el saludo
      const s = seg(t, C5, C6);
      const ux = p.pos.x - e.pos.x,
        uz = p.pos.z - e.pos.z;
      const ul = Math.hypot(ux, uz) || 1;
      const d = lerp(3.0, 2.5, s);
      this.pos.set(e.pos.x + (ux / ul) * d + (uz / ul) * 0.35, ey + lerp(1.35, 1.45, s), e.pos.z + (uz / ul) * d - (ux / ul) * 0.35);
      this.look.set(e.pos.x, ey + lerp(1.95, 1.8, s), e.pos.z);
      fov = lerp(38, 34, s);
    } else if (t < C_CORTE) {
      // el plano lateral: tú a la izquierda, él a la derecha, la luna encima
      // de él; la cámara se aleja despacio
      const s = seg(t, C6, C_END);
      const mx = (p.pos.x + e.pos.x) / 2,
        mz = (p.pos.z + e.pos.z) / 2;
      const ux = e.pos.x - p.pos.x,
        uz = e.pos.z - p.pos.z;
      const ul = Math.hypot(ux, uz) || 1;
      // (la normal hacia la que tú quedas a la izquierda: hacia el sur)
      let nx = -uz / ul,
        nz = ux / ul;
      if (nz < 0) {
        nx = -nx;
        nz = -nz;
      }
      const dist = lerp(6.0, 8.8, s);
      this.pos.set(mx + nx * dist, ey + lerp(1.05, 1.35, s), mz + nz * dist);
      this.look.set(mx, ey + lerp(1.9, 2.1, s), mz);
      fov = lerp(40, 44, s);
    } else {
      if (this.cue('corte', C_CORTE)) this.camBack();
      return t < C_END;
    }
    g.camRig.override = { pos: this.pos, look: this.look, fov, snap: true };
    return t < C_END;
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
    this.t = Math.max(this.t, C_CORTE - 0.01);
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
    e.vx = e.vz = 0;
    // en guardia: a pelear
    e.aware = true;
    e.state = 'chase';
    e.stT = 0;
    e.cooldown = 0.8;
    e.anim.stop(0.2);
    g.caballeroFight && g.caballeroFight(e);
  }
}

// ======================================================================
// EL FINAL (al vencerle: Enemy.die → game.caballeroVencido). No muere ahí:
// 1. trastabilla, a cámara lenta, y se funde a negro;
// 2. en mitad de la terraza, herido, se endereza y alza la espada a dos
//    manos; el último golpe: tu hoja lo para;
// 3. el pulso, hoja contra hoja: le arden los ojos y, de pronto, se le
//    apagan: se da cuenta de que no es él quien empuja;
// 4. te aparta y salta hacia atrás, lejos, hasta el parapeto;
// 5. el silencio: se levanta despacio, se mira la mano de la espada, te
//    mira; no dice nada;
// 6. clava la espada en las losas y la deja allí;
// 7. se da la vuelta, sube a la almena, de cara a la luna, y se deja caer.
// Abajo queda, de espaldas y en cruz, en la alberca vacía del jardín. Se
// salta con «interactuar» (y todo queda como al final).
const KT = FORT.torre;
const R_ = KT.terraza;
// la almena por la que se tira (la novena del parapeto del norte: almenas()
// pone sus merlones de 0,9 m con huecos de 0,7 desde la esquina), lo alto
// del antepecho y dónde pasa todo, a eje con ella: dónde chocáis (él, de
// cara al sur; tú, a paso y medio), dónde cae del salto atrás, el pie del
// parapeto y, abajo, la alberca vacía del jardín
const ALM = { x: KT.x0 + 1.0 + 1.6 * 9, z: KT.z0 - 0.25, y: R_ + 0.9 };
const FIN = {
  k: { x: ALM.x, z: KT.z0 + 6.6 },
  p: { x: ALM.x, z: KT.z0 + 8.1 },
  cae: { x: ALM.x, z: KT.z0 + 2.0 },
  pie: { x: ALM.x, z: KT.z0 + 0.6 },
  abajo: { x: ALM.x, y: 0.1, z: KT.z0 - 3.8 },
  // el pendón del Rey, tirado en las losas (su moharra hacia ti)
  pendon: { x: ALM.x + 1.5, z: KT.z0 + 5.6, yaw: 2.2 },
};
// los tiempos (s)
const F = {
  negro: 0.9,
  escena: 1.9,
  ultimo: 2.7,
  choque: 2.7 + 1.68,
  pulso: 2.7 + 2.4,
  ojo: 6.9,
  luz: 8.5,
  salto: 10.6,
  alza: 12.7,
  mano: 15.3,
  mira: 18.6,
  clava: 21.6,
  vuelve: 25.4,
  anda: 26.9,
  sube: 28.5,
  arriba: 30.9,
  cae: 33.0,
  abajo: 36.9,
  fin: 39.4,
};
// hacia dónde está la luna (atmosphere.js: luna.moonPos), baja sobre el
// horizonte, al nornordeste
const LUNA_DIR = (() => {
  const m = [25, 16, -54];
  const l = Math.hypot(...m);
  return m.map((v) => v / l);
})();
// (en el clip de clavarla: cuándo la hinca y cuándo la suelta)
const T_HINCA = 1.42,
  T_SUELTA = 2.5;
// el salto atrás: cuándo despega y cuándo cae (en el clip) y lo alto
const BR0 = 0.42,
  BR1 = 1.12,
  BR_H = 1.1;
// se deja caer: desde cuándo cae (en el clip) y hacia dónde va
const CAE0 = 0.6;

// Los gestos del jugador en el choque, con su arma (su guardia y su
// parada): se planta con el arma en alto, recibe el golpe y empuja; al
// apartarle él, trastabilla hacia atrás.
function clipsJugador(W) {
  const G = { ...W.guard };
  if (W.hands === 2) delete G.ikL;
  const B = { ...W.block };
  if (W.hands === 2) delete B.ikL;
  const add = (a, b) => a.map((v, i) => v + (b[i] || 0));
  const ST0 = { legL: [12, 0, 4], shinL: [14, 0, 0], legR: [-20, 0, -4], shinR: [22, 0, 0], root: [0, -6, 2] };
  const BR = { legL: [-26, 0, 6], shinL: [30, 0, 0], legR: [24, 0, -6], shinR: [34, 0, 0], root: [0, -14, -4] };
  const alto = { ...B, ikR: add(B.ikR, [4, 12, 6]), bladeR: add(B.bladeR, [8, 14, 0]) };
  return {
    guardia: clip('p_fin_guardia', 0.5, [
      [0, { ...G, ...ST0 }],
      [0.5, { ...G, ...ST0 }],
    ]),
    aguanta: clip('p_fin_aguanta', 1.0, [
      [0, { ...G, ...ST0 }],
      [0.7, { ...alto, ...BR, chest: [6, 10, 0], head: [-10, -6, 0] }, 'hold'],
      [1.0, { ...alto, ...BR, chest: [8, 10, 0], head: [-12, -6, 0] }],
    ]),
    choque: clip('p_fin_choque', 1.2, [
      [0, { ...alto, ...BR, chest: [-14, 10, 0], head: [-16, 0, 0], root: [0, -18, -10] }, 'snap'],
      [0.5, { ...alto, ...BR, chest: [10, 8, 0], head: [-12, -4, 0] }],
      [1.2, { ...alto, ...BR, chest: [12, 8, 0], head: [-12, -4, 0] }],
    ]),
    suelta: clip('p_fin_suelta', 1.1, [
      [0, { ...alto, ...BR, chest: [12, 8, 0], head: [-12, -4, 0] }],
      [0.18, { ...B, legL: [-30, 0, 6], shinL: [40, 0, 0], legR: [30, 0, -6], shinR: [40, 0, 0], root: [0, -10, -16], chest: [-18, -10, 0], head: [-14, 6, 0] }, 'snap'],
      [1.1, { ...G, ...ST0 }],
    ]),
  };
}

export class CaballeroFin {
  constructor(g, e) {
    this.g = g;
    this.e = e;
    this.t = 0;
    this.cues = new Set();
    this.pos = new V3();
    this.look = new V3();
    this._h = new V3();
    this._c = new V3();
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
    // (no muere aún; y sin el destello del golpe, que ya no se le apaga: el
    // bucle de las criaturas no le toca)
    e.hp = 1;
    e.scripted = true;
    e.state = 'fin';
    e.flash = 0;
    e.flare = 0;
    e.flareRed = 0;
    e.atk = null;
    e.vx = e.vz = 0;
    e.data.spin = 0;
    e.data.openT = 0;
    g.caballero.clear();
    g.caballero.trail(e, false);
    g.lockTarget = null;
    g.hunt && g.hunt.reset();
    g.audio && g.audio.stopMusic();
    p.state = 'cine';
    p.autoDir = null;
    p.vx = p.vz = 0;
    g.ui.cineHud(true);
    // trastabilla, a cámara lenta, de espaldas a ti
    e.anim.play(CAB_CLIPS.stagger, { blend: 0.05, speed: 0.55 });
    const dx = e.pos.x - p.pos.x,
      dz = e.pos.z - p.pos.z;
    const dl = Math.hypot(dx, dz) || 1;
    this.atras = [dx / dl, dz / dl];
    this.k0 = [e.pos.x, e.pos.z];
    g.slowmo = { t: 0.5, k: 0.4 };
    g.flash = Math.max(g.flash || 0, 0.35);
    g.audio && g.audio.play('armorHit', e.pos);
    g.audio && g.audio.enemyVoice(e, 'hurt');
    try {
      this.pc = clipsJugador(p.weapon);
    } catch (err) {
      this.pc = null;
    }
  }
  // el jugador, con uno de sus gestos del choque
  gesto(name, blend = 0.12) {
    const p = this.g.player;
    if (this.pc && this.pc[name]) p.anim.play(this.pc[name], { blend });
  }
  update(dt) {
    const g = this.g;
    const e = this.e;
    const p = g.player;
    this.t += dt;
    const t = this.t;
    g.post.U.uBars.value = 0.11 * Math.min(seg(t, 0, 0.8), 1 - seg(t, F.fin - 0.6, F.fin));
    e.vx = e.vz = 0;
    // --- 1. trastabilla y se funde a negro
    if (t < F.escena) {
      const s = seg(t, 0, 0.9);
      e.body.pos.x = this.k0[0] + this.atras[0] * 0.7 * s;
      e.body.pos.z = this.k0[1] + this.atras[1] * 0.7 * s;
      if (this.cue('pendon', 0.35) && e.data.pendon) {
        // (el pendón se le cae de la mano)
        e.data.pendon = false;
        if (e._pendon) for (const m of e._pendon) m.visible = false;
        g.caballero.cloth.visible = false;
        g.audio && g.audio.play('woodHit', e.pos);
      }
      if (this.cue('negro', F.negro)) g.fadeTarget = 0;
    }
    // --- 2. el corte: en su sitio, herido; el último golpe
    if (this.cue('escena', F.escena)) this.enSuSitio();
    if (this.cue('ultimo', F.ultimo)) e.anim.play(CAB_CLIPS.ultimo, { blend: 0.25 });
    if (this.cue('aguanta', F.ultimo + 0.35)) this.gesto('aguanta', 0.2);
    if (this.cue('choque', F.choque)) {
      // las hojas: chispas, el hierro, la cámara lenta
      const c = this.contacto();
      g.fx.blood.emit(c.x, c.y, c.z, 34, { color: [1, 0.88, 0.55], speed: 6, life: 0.4, up: 1.6 });
      g.combat.impactFlash && g.combat.impactFlash(c.x, c.y, c.z, 1.6, 0xfff0d0);
      g.audio && g.audio.play('clang', c);
      g.audio && g.audio.play('parry', c, { kind: 'blade' });
      g.camRig.shake(0.35);
      g.slowmo = { t: 0.55, k: 0.3 };
      this.gesto('choque', 0.04);
    }
    if (this.cue('pulso', F.pulso)) e.anim.play(CAB_CLIPS.pulso, { blend: 0.2 });
    if (this.cue('roce1', F.pulso + 0.4) || this.cue('roce2', F.pulso + 2.0) || this.cue('roce3', F.ojo + 0.9)) {
      const c = this.contacto();
      g.audio && g.audio.play('scrape', c);
      g.fx.blood.emit(c.x, c.y, c.z, 6, { color: [1, 0.85, 0.5], speed: 2.5, life: 0.25, up: 1 });
    }
    // --- 3. los ojos le arden; se le apagan: se da cuenta
    if (this.cue('lucido', F.luz)) e.anim.play(CAB_CLIPS.lucido, { blend: 0.3 });
    // --- 4. te aparta y salta atrás
    if (this.cue('salto', F.salto)) e.anim.play(CAB_CLIPS.brinco, { blend: 0.1 });
    if (this.cue('empuja', F.salto + 0.12)) {
      this.gesto('suelta', 0.05);
      const c = this.contacto();
      g.audio && g.audio.play('clang', c);
      g.fx.blood.emit(c.x, c.y, c.z, 14, { color: [1, 0.85, 0.5], speed: 4, life: 0.3, up: 1.2 });
    }
    if (t >= F.salto + 0.12 && t < F.salto + 0.6) {
      // (tú, medio paso atrás)
      const v = 1.4 * (1 - seg(t, F.salto + 0.12, F.salto + 0.6));
      p.body.pos.z += v * dt;
    }
    if (this.cue('despega', F.salto + BR0)) g.audio && g.audio.play('leapWind', e.pos);
    if (t >= F.salto + BR0 && t < F.alza) {
      const u = Math.min(1, (t - F.salto - BR0) / (BR1 - BR0));
      e.body.pos.z = lerp(FIN.k.z, FIN.cae.z, u * (2 - u) * 0.3 + u * 0.7);
      e.body.pos.y = R_ + 4 * BR_H * u * (1 - u);
      e.body.vy = 0;
      e.body.grounded = u >= 1;
    }
    if (this.cue('aterriza', F.salto + BR1)) {
      e.body.pos.set(FIN.cae.x, R_, FIN.cae.z);
      g.fx.blood.emit(e.pos.x, R_ + 0.08, e.pos.z, 20, { color: [0.5, 0.48, 0.45], speed: 3, life: 0.6, up: 0.8, gravity: 5 });
      g.audio && g.audio.play('beastStep', e.pos);
      g.audio && g.audio.play('armorClank', e.pos);
      g.camRig.shake(0.18);
    }
    if (this.cue('suelta_p', F.salto + 1.4)) p.anim.stop(0.5);
    // --- 5. el silencio
    if (this.cue('alza', F.alza)) e.anim.play(CAB_CLIPS.alza, { blend: 0.2 });
    if (this.cue('mano', F.mano)) e.anim.play(CAB_CLIPS.mano, { blend: 0.25 });
    // --- 6. clava la espada y la deja
    if (this.cue('clava', F.clava)) e.anim.play(CAB_CLIPS.clava, { blend: 0.25 });
    if (this.cue('hinca', F.clava + T_HINCA)) {
      const tp = tipPos(e, this._h);
      g.fx.blood.emit(tp.x, R_ + 0.05, tp.z, 22, { color: [1, 0.85, 0.55], speed: 3.5, life: 0.35, up: 1.6 });
      g.fx.blood.emit(tp.x, R_ + 0.05, tp.z, 16, { color: [0.5, 0.48, 0.45], speed: 2, life: 0.8, up: 0.9, gravity: 4 });
      g.audio && g.audio.play('thrust', tp);
      g.audio && g.audio.play('stoneCreak', tp);
      g.camRig.shake(0.12);
    }
    if (this.cue('suelta', F.clava + T_SUELTA)) g.caballero.plantarEspada(e, true);
    // --- 7. se da la vuelta, anda hasta el parapeto, sube a la almena y se
    // deja caer
    if (this.cue('vuelve', F.vuelve)) e.anim.play(CAB_CLIPS.desarmado, { blend: 0.3 });
    if (t >= F.vuelve && t < F.sube) {
      e.yaw = lerp(0, Math.PI, seg(t, F.vuelve, F.vuelve + 1.4));
      if (this.cue('gira', F.vuelve + 0.5)) g.audio && g.audio.play('armorClank', e.pos);
    }
    if (t >= F.anda && t < F.sube) {
      const v = 1.0 * Math.min(1, (t - F.anda) / 0.3);
      if (e.pos.z > FIN.pie.z) {
        e.vz = -v;
        e.body.pos.z = Math.max(FIN.pie.z, e.body.pos.z - v * dt);
      }
      if (this.cue('anda1', F.anda + 0.5) || this.cue('anda2', F.anda + 1.2)) g.audio && g.audio.play('armorClank', e.pos);
    }
    if (this.cue('sube', F.sube)) e.anim.play(CAB_CLIPS.sube, { blend: 0.2 });
    if (t >= F.sube && t < F.cae + CAE0) {
      const s = seg(t, F.sube + 0.6, F.sube + 1.7);
      e.body.pos.y = lerp(R_, ALM.y, s);
      e.body.pos.z = lerp(FIN.pie.z, ALM.z, s);
      e.body.vy = 0;
      if (this.cue('aupa', F.sube + 0.9)) g.audio && g.audio.play('armorClank', e.pos);
    }
    if (this.cue('cae', F.cae)) e.anim.play(CAB_CLIPS.cae, { blend: 0.3 });
    if (t >= F.cae + CAE0 && !this.cues.has('abajo_ya')) {
      const u = t - F.cae - CAE0;
      const y = ALM.y - 4.9 * u * u;
      e.body.pos.z = ALM.z - 1.35 * u;
      e.body.pos.y = Math.max(FIN.abajo.y, y);
      e.data.caida = Math.min(2.6, 1.5 * u * u + 0.5 * u);
      if (this.cue('viento', F.cae + CAE0)) g.audio && g.audio.play('leapWind', e.pos);
      if (y <= FIN.abajo.y) {
        this.cues.add('abajo_ya');
        g.caballero.vencido(e);
        g.audio && g.audio.play('armorFall', e.pos);
        g.audio && g.audio.play('slamSoft', e.pos);
      }
    }
    if (!this.cues.has('abajo_ya')) {
      e.animate(dt);
      // (los ojos: le arden en el pulso; se le apagan al darse cuenta)
      if (t >= F.ojo && t < F.luz + 0.4) {
        const u = t - F.ojo;
        const k = u < 1.0 ? 4 + 2.5 * Math.sin(u * 23) : 1 + 3 * Math.abs(Math.sin(u * 31) * Math.sin(u * 7)) * (1 - seg(t, F.luz - 0.5, F.luz + 0.3));
        ojos(e, k);
        // (y por las rendijas del yelmo, una lumbre fría que se escapa)
        if (k > 2 && Math.random() < dt * 40) {
          const o = e.rig.worldPos('head', this._h, OJO[Math.random() < 0.5 ? 0 : 1]);
          g.fx.blood.emit(o.x, o.y, o.z, 1, { color: [0.62, 0.8, 1], speed: 0.4, life: 0.35, up: 0.5, gravity: -0.5 });
        }
      } else if (t >= F.luz + 0.4) ojos(e, 0.08);
    }
    // --- la cámara
    this.camara(t);
    return t < F.fin;
  }
  // donde se cruzan las hojas: a media espada de él
  contacto() {
    const e = this.e;
    const h = e.rig.worldPos('handR', this._c);
    const tp = tipPos(e, this._h);
    return this._c.set(h.x * 0.45 + tp.x * 0.55, h.y * 0.45 + tp.y * 0.55, h.z * 0.45 + tp.z * 0.55);
  }
  // los dos, en su sitio (el corte, en negro): él, herido, de cara a ti;
  // tú, de cara a él; el pendón, tirado; y otra vez la luz
  enSuSitio() {
    const g = this.g;
    const e = this.e;
    const p = g.player;
    e.body.pos.set(FIN.k.x, R_, FIN.k.z);
    e.body.vy = 0;
    e.yaw = 0;
    e.data.pendon = false;
    if (e._pendon) for (const m of e._pendon) m.visible = false;
    g.caballero.cloth.visible = false;
    g.caballero.pendonSuelo(true);
    g.setGroupVisible && g.groups && g.groups['pendon:caballero'] && g.setGroupVisible('pendon:caballero', false);
    e.anim.play(CAB_CLIPS.herido, { blend: 0 });
    p.spawn(FIN.p.x, R_, FIN.p.z, Math.PI);
    p.state = 'cine';
    this.gesto('guardia', 0.05);
    this.enSitio = true;
    g.fadeTarget = 1;
    g.audio && g.audio.enemyVoice(e, 'alert');
  }
  camara(t) {
    const g = this.g;
    const e = this.e;
    const X = ALM.x,
      R = R_;
    let fov = 40;
    if (t < F.escena) {
      // trastabilla: de cerca, de lado
      const s = seg(t, 0, F.escena);
      const ax = this.atras[0],
        az = this.atras[1];
      this.pos.set(e.pos.x - az * 3.1 - ax * 0.6, e.pos.y + lerp(1.4, 1.25, s), e.pos.z + ax * 3.1 - az * 0.6);
      this.look.set(e.pos.x, e.pos.y + 1.3, e.pos.z);
      fov = 40;
    } else if (t < F.choque + 0.25) {
      // el último golpe: los dos, de lado (él a la izquierda, tú a la derecha)
      const s = seg(t, F.escena, F.choque);
      this.pos.set(X - lerp(4.4, 3.9, s), R + lerp(1.4, 1.3, s), (FIN.k.z + FIN.p.z) / 2 + lerp(0.15, 0, s));
      this.look.set(X, R + 1.45, (FIN.k.z + FIN.p.z) / 2);
      fov = 42;
    } else if (t < F.ojo) {
      // el pulso: los dos, de lado y de cerca, hoja contra hoja
      const s = seg(t, F.choque, F.ojo);
      const mz = (FIN.k.z + FIN.p.z) / 2;
      this.pos.set(X + lerp(2.5, 2.0, s), R + lerp(1.65, 1.55, s), mz + 0.15);
      this.look.set(X, R + 1.5, mz);
      fov = lerp(36, 32, s);
    } else if (t < F.salto) {
      // por encima de tu hombro, su yelmo: los ojos
      const s = seg(t, F.ojo, F.salto);
      const h = e.rig.worldPos('head', this._h);
      this.pos.set(FIN.p.x + 0.42, R + lerp(1.74, 1.7, s), FIN.p.z + lerp(0.6, 0.35, s));
      this.look.set(h.x, h.y + 0.12, h.z);
      fov = lerp(24, 17, s);
    } else if (t < F.alza) {
      // el salto atrás, de lejos, de lado
      this.pos.set(X + 6.4, R + 1.5, (FIN.k.z + FIN.cae.z) / 2 + 0.6);
      this.look.set(X, R + 1.1, (FIN.k.z + FIN.cae.z) / 2 - 0.4);
      fov = 46;
    } else if (t < F.mano) {
      // se levanta, de frente y desde abajo, con la luna detrás
      const s = seg(t, F.alza, F.mano);
      this.pos.set(X + lerp(0.9, 0.7, s), R + lerp(0.5, 0.55, s), FIN.cae.z + lerp(3.2, 2.8, s));
      this.look.set(X, R + 1.75, FIN.cae.z);
      fov = 40;
    } else if (t < F.mira) {
      // se mira la mano: de tres cuartos, a su derecha
      const s = seg(t, F.mano, F.mira);
      this.pos.set(X - lerp(1.45, 1.25, s), R + 1.55, FIN.cae.z + lerp(1.8, 1.6, s));
      this.look.set(X - 0.1, R + 1.72, FIN.cae.z + 0.2);
      fov = 32;
    } else if (t < F.clava) {
      // te mira: desde tus ojos, acercándose
      const s = seg(t, F.mira, F.clava);
      this.pos.set(X + 0.18, R + 1.66, FIN.p.z - lerp(0.6, 1.6, s));
      this.look.set(X, R + 1.85, FIN.cae.z);
      fov = lerp(30, 26, s);
    } else if (t < F.vuelve) {
      // clava la espada: de frente, desde abajo
      this.pos.set(X - 1.0, R + 0.5, FIN.cae.z + 2.4);
      this.look.set(X, R + 1.2, FIN.cae.z);
      fov = 42;
    } else if (t < F.sube) {
      // se da la vuelta y anda hasta el parapeto: desde detrás de ti
      this.pos.set(X + 1.3, R + 1.95, FIN.p.z + 1.7);
      this.look.set(X, R + 1.3, FIN.pie.z);
      fov = 46;
    } else if (t < F.abajo) {
      // la almena y la luna: desde abajo, de espaldas a él, en la línea de
      // la luna (la tiene delante, baja sobre el horizonte; la espada
      // clavada, en primer término)
      const s = seg(t, F.sube, F.abajo);
      const d = lerp(5.4, 4.9, s);
      this.pos.set(X - LUNA_DIR[0] * d, ALM.y + 1.0 - LUNA_DIR[1] * d, ALM.z - LUNA_DIR[2] * d);
      this.look.set(X, ALM.y + lerp(0.85, 1.05, s), ALM.z);
      fov = lerp(42, 38, s);
    } else {
      // la cámara baja por la cara de la torre hasta él, en la alberca vacía
      // del jardín
      const s = seg(t, F.abajo, F.fin + 0.4);
      this.pos.set(X + lerp(0.6, 1.3, s), lerp(ALM.y - 2.5, 6.5, s), ALM.z - lerp(1.3, 1.2, s));
      this.look.set(X, FIN.abajo.y + 0.3, FIN.abajo.z);
      fov = 40;
    }
    g.camRig.override = { pos: this.pos, look: this.look, fov, snap: true };
  }
  skip() {
    this.t = Math.max(this.t, F.fin - 0.01);
  }
  end() {
    const g = this.g;
    const e = this.e;
    const p = g.player;
    g.post.U.uBars.value = 0;
    g.fadeTarget = 1;
    g.slowmo = null;
    // (lo que quede, si se saltó: tú en tu sitio; su espada, clavada; él,
    // abajo)
    if (!this.enSitio) {
      p.spawn(FIN.p.x, R_, FIN.p.z, Math.PI);
      g.caballero.pendonSuelo(true);
    }
    g.caballero.vencido(e);
    p.anim.stop(0.3);
    p.autoDir = null;
    if (p.state === 'cine') p.state = 'free';
    // la cámara, detrás de ti, de cara a la almena
    g.camRig.override = null;
    g.camRig.snapTo(p);
    g.camRig.yaw = Math.atan2(ALM.x - p.pos.x, ALM.z - p.pos.z);
    g.camRig.pitch = 0.1;
    g.camera.fov = g.camRig.fovBase;
    g.camera.updateProjectionMatrix();
    g.ui.showHud(true);
    g.ui.cineHud(false);
    // muerto: la bandera, la música, «HA CAÍDO» y la partida guardada
    e.stT = 99;
    g.onEnemyDeath && g.onEnemyDeath(e);
  }
}
function angle(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
export { FIN as CABALLERO_FIN, ALM as CABALLERO_ALMENA };
