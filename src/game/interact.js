// Interactuables: puertas y cierres, objetos, documentos, altares, niebla.
import * as THREE from 'three';
import { objMat, additiveFog, cloneMat } from '../gfx/materials.js';
import { getTexture } from '../gfx/textures.js';
import { ITEMS, NOTES, MSG } from './story.js';
import { angleDiff, DEG, clamp, damp } from '../core/util.js';
import { G } from '../gfx/materials.js';
import { buildParts, WEAPON_PARTS } from '../entities/weapon_models.js';

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
      additiveFog(new THREE.MeshBasicMaterial({ map: getTexture('sigil'), transparent: true, color: 0xff4a30, blending: THREE.AdditiveBlending, depthWrite: false }))
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

// Tranca atravesada por el lado desde el que se puede quitar, sobre dos
// grapas de hierro empotradas en las jambas.
function barMesh(w) {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.18, 0.14), objMat('timber'));
  beam.position.y = 1.32;
  g.add(beam);
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.2), objMat('iron'));
    b.position.set(s * (w / 2 + 0.12), 1.32, -0.02);
    g.add(b);
  }
  g.userData.beam = beam;
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

// Mesa atravesada en un paso, que se parte de un golpe. Cada mitad (tablero
// hasta un corte dentado + las dos patas de su extremo) cuelga de un pivote a
// ras de suelo en el canto interior de sus patas: al partirse sale despedida
// hacia fuera y vuelca hasta apoyar el corte en el suelo. Entera, las dos
// mitades encajan y el corte no se ve.
const CUTS = [-0.07, 0.05, -0.03, 0.08];
function breakableTable(w, d, mat) {
  const g = new THREE.Group();
  const hw = w / 2;
  const box = (parent, x0, y0, z0, x1, y1, z1) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    parent.add(m);
    return m;
  };
  const halves = [];
  const n = CUTS.length;
  for (const side of [-1, 1]) {
    const px = side * (hw - 0.15);
    const pivot = new THREE.Group();
    pivot.position.x = px;
    const body = new THREE.Group(); // la geometría, en coordenadas de la mesa
    body.position.x = -px;
    pivot.add(body);
    let reach = 0;
    for (let i = 0; i < n; i++) {
      const z0 = -d / 2 + (i / n) * d,
        z1 = -d / 2 + ((i + 1) / n) * d;
      const c = CUTS[i];
      if (side < 0) box(body, -hw, 0.72, z0, c, 0.8, z1);
      else box(body, c, 0.72, z0, hw, 0.8, z1);
      reach = Math.max(reach, Math.abs(c - px));
    }
    for (const sz of [-1, 1]) {
      const lx = side * (hw - 0.1),
        lz = sz * (d / 2 - 0.1);
      box(body, lx - 0.05, 0, lz - 0.05, lx + 0.05, 0.72, lz + 0.05);
    }
    // astillas en el corte (sólo con la mesa partida)
    const spl = [];
    for (let i = 0; i < 3; i++) {
      const len = 0.1 + ((i * 5 + (side > 0 ? 3 : 0)) % 7) * 0.012;
      const z = -d / 2 + ((i + (side > 0 ? 0.35 : 0.65)) / 3) * d;
      const c = CUTS[Math.min(n - 1, Math.floor(((z + d / 2) / d) * n))];
      const sp = box(body, -len / 2, -0.012, -0.016, len / 2, 0.012, 0.016);
      sp.position.set(c - side * len * 0.4, 0.765, z);
      sp.rotation.set(0, (i - 1) * 0.3, -side * 0.3);
      sp.visible = false;
      sp.userData.splinter = true;
      spl.push(sp);
    }
    // vuelca hasta que el canto más largo del corte toca el suelo
    pivot.userData = { side, x0: px, spl, tilt: Math.atan2(0.72, reach), slide: 0, yaw: side < 0 ? 0.16 : -0.1, dz: side < 0 ? 0.05 : -0.07 };
    g.add(pivot);
    halves.push(pivot);
  }
  g.userData.halves = halves;
  return g;
}

const _v = new THREE.Vector3();
const _m4 = new THREE.Matrix4();

// Armas nuevas como objeto recogible: el mismo modelo que empuña el jugador,
// de pie con la hoja hacia arriba (la lanza, inclinada) y centrado.
function weaponItemMesh(id) {
  const g = new THREE.Group();
  const w = buildParts(WEAPON_PARTS[id]('x')).group;
  w.rotation.x = -Math.PI / 2;
  const tilt = new THREE.Group();
  tilt.rotation.z = id === 'lanza' ? 0.55 : id === 'katana' ? 0.18 : 0.08;
  tilt.add(w);
  g.add(tilt);
  g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(w);
  w.position.sub(box.getCenter(new THREE.Vector3()).applyQuaternion(tilt.quaternion.clone().invert()));
  return g;
}

function itemMesh(id) {
  if (id === 'facon' || id === 'hacha' || id === 'lanza' || id === 'katana') return weaponItemMesh(id);
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
  } else if (id === 'rosario') {
    // cuentas de azabache en un lazo y la cruz de plata colgando
    const jet = objMat('black'),
      silver = objMat('silver');
    const bead = new THREE.SphereGeometry(0.022, 5, 4);
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const b = new THREE.Mesh(bead, i % 6 === 0 ? silver : jet);
      b.position.set(Math.cos(a) * 0.14, 0.02, Math.sin(a) * 0.1 - 0.04);
      g.add(b);
    }
    for (let i = 1; i <= 4; i++) {
      const b = new THREE.Mesh(bead, jet);
      b.position.set(0, 0.02, 0.06 + i * 0.045);
      g.add(b);
    }
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.015, 0.16), silver);
    c1.position.set(0, 0.02, 0.33);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.015, 0.03), silver);
    c2.position.set(0, 0.02, 0.3);
    g.add(c1, c2);
    g.rotation.y = 0.5;
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

// Palanca de pared: mango de hierro con empuñadura de madera, en un eje
// empotrado en su placa. Local: +Y arriba, +Z hacia la sala, gira en X.
// Trampilla del suelo (vista desde arriba): la tapa gira sobre su bisagra
// y deja ver el hueco negro con la escalera de mano.
function hatchMesh() {
  const g = new THREE.Group();
  const lidG = new THREE.Group();
  lidG.position.set(-0.6, 0, 0);
  const mat = cloneMat(objMat('planks'));
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 1.2), mat);
  lid.position.set(0.6, 0.03, 0);
  lidG.add(lid);
  const iron = cloneMat(objMat('iron'));
  for (const dz of [-0.4, 0, 0.4]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.06), iron);
    b.position.set(0.6, 0.075, dz);
    lidG.add(b);
  }
  g.add(lidG);
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 1.14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x030202 }));
  hole.position.y = 0.035;
  hole.visible = false;
  g.add(hole);
  g.userData = { lidG, hole, mats: [mat, iron] };
  return g;
}

function leverMesh() {
  const g = new THREE.Group();
  const iron = objMat('iron'),
    wood = objMat('wooddark');
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.34, 8), iron);
  axle.rotation.z = Math.PI / 2;
  g.add(axle);
  const arm = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.72, 0.07), iron);
  bar.position.y = 0.36;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.3, 7), wood);
  grip.position.y = 0.82;
  const knob = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.14), iron);
  knob.position.y = 0.99;
  arm.add(bar, grip, knob);
  g.add(arm);
  g.userData.arm = arm;
  return g;
}
const LEVER_UP = 0.3,
  LEVER_DOWN = 2.45;
// echarla cuesta: siete tirones (unos siete segundos y medio)
export const LEVER_TIME = 7.3;
const LEVER_HEAVES = 7;
// cuánto baja el mango con 'pull' segundos de tirones
function leverAngle(pull) {
  const k = Math.min(1, pull / LEVER_TIME) * LEVER_HEAVES;
  const i = Math.floor(k),
    f = k - i;
  const u = Math.min(1, (i + (f < 0.55 ? 0.15 * (f / 0.55) : 0.15 + 0.85 * ((f - 0.55) / 0.45) ** 0.6)) / LEVER_HEAVES);
  return LEVER_UP + (LEVER_DOWN - LEVER_UP) * u;
}

// Muro de niebla (shader animado)
// (se funde con la niebla de la escena: sin ello brillaba a cualquier
// distancia, como una mancha blanca en lo alto de la muralla)
function fogWallMat() {
  const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
  u.uTime = G.uTime;
  return new THREE.ShaderMaterial({
    uniforms: u,
    fog: true,
    vertexShader: `varying vec2 vUv;
      #include <fog_pars_vertex>
      void main(){
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float uTime; varying vec2 vUv;
      #include <fog_pars_fragment>
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec2 p = vUv * vec2(4.0, 3.0);
        float a = n(p + vec2(0.0, -uTime*0.6)) * 0.6 + n(p*2.3 + vec2(uTime*0.3, -uTime*1.1)) * 0.4;
        float edge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x) * smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
        float alpha = (0.35 + a * 0.55) * edge;
        #ifdef USE_FOG
          #ifdef FOG_EXP2
            alpha *= exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
          #else
            alpha *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
          #endif
          // pegada a la cámara se aclara: dentro de la arena no tapa medio encuadre
          alpha *= smoothstep(0.5, 2.6, vFogDepth);
        #endif
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
        const slides = s.mat === 'grate' || s.mat === 'seal';
        // Hojas batientes: la bisagra va en la cara del muro hacia la que abre
        // la puerta ('plane', coordenada a lo largo de la normal del muro) y
        // separada 'inset' del canto del hueco. Con la bisagra en mitad del
        // grosor del muro, la hoja atravesaba la jamba al abrirse.
        const inset = slides ? 0 : s.inset ?? 0.06;
        const off = slides || s.plane === undefined ? 0 : s.axis === 'z' ? s.x - s.plane : s.plane - s.z;
        if (s.double) {
          const lw = s.w / 2 - inset - 0.01;
          for (const side of [-1, 1]) {
            const pivot = new THREE.Group();
            pivot.position.set(side * (s.w / 2 - inset), 0, off);
            const leaf = doorLeaf(lw, s.h, s.mat);
            if (side > 0) leaf.position.x = -lw;
            pivot.add(leaf);
            pivot.userData.side = side;
            it.obj.add(pivot);
            leaves.push(pivot);
          }
        } else {
          const lw = s.w - 2 * inset;
          const pivot = new THREE.Group();
          pivot.position.set(slides ? -s.w / 2 : hinge * (s.w / 2 - inset), 0, off);
          const leaf = doorLeaf(lw, s.h, s.mat);
          if (hinge > 0 && !slides) leaf.position.x = -lw;
          pivot.add(leaf);
          it.obj.add(pivot);
          leaves.push(pivot);
        }
        it.leaves = leaves;
        // puerta entornada: la hoja queda algo abierta (se ve luz dentro)
        it.ajar = s.ajar ?? 0;
        if (s.lock && s.lock.type === 'barred') {
          // (eje 'x': +z local = +z del mundo; eje 'z': +z local = -x del mundo)
          const ls = (s.axis === 'z' ? -1 : 1) * s.lock.side;
          it.bar = barMesh(s.w);
          // barAt: plano (coordenada mundo) de la cara del muro por ese lado
          it.barZ = s.barAt !== undefined ? (s.axis === 'z' ? s.x - s.barAt : s.barAt - s.z) + ls * 0.08 : off + ls * 0.14;
          it.barS = ls;
          it.bar.position.z = it.barZ;
          it.obj.add(it.bar);
        }
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
      // (un rastrillo cerrado es un muro también para las criaturas)
      if (s.lock && s.lock.type === 'levers') it.box.navSolid = true;
      it.r = s.r ?? 2.2;
    } else if (s.kind === 'item') {
      it.obj = new THREE.Group();
      it.obj.position.set(s.x, s.y, s.z);
      const m = itemMesh(s.item);
      if (m.children.length) it.obj.add(m);
      const glow = new THREE.Sprite(additiveFog(new THREE.SpriteMaterial({ map: glowTex(), color: 0xfff0c0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: true })));
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
      const glow = new THREE.Sprite(additiveFog(new THREE.SpriteMaterial({ map: glowTex(), color: 0xc8d8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6, fog: true })));
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
    } else if (s.kind === 'breakable') {
      // la mesa recibe la luz horneada del sitio, como las mesas del escenario
      const mat = cloneMat(objMat('wooddark'));
      const zn = g.zoneAt(s);
      const pr = g.probe.sample(s.x, s.y + 0.9, s.z, zn && zn.room ? g.level.ctx.wb.roomId(zn.room) : 0);
      mat._u.uProbe.value.set(pr[0], pr[1], pr[2]);
      mat._u.uGround.value.set(s.y, 0.34);
      it.rot = s.rot ?? 0;
      it.gap = s.gap ?? 1.1;
      it.obj = breakableTable(s.w, s.d, mat);
      it.obj.position.set(s.x, s.y, s.z);
      it.obj.rotation.y = it.rot;
      g.scene.add(it.obj);
      it.box = g.world.col.addOBB(s.x, s.z, s.w / 2, s.d / 2, it.rot, s.y, s.y + 0.8);
      // cuánto salen despedidas las mitades para dejar libre el paso central
      this.poseBreak(it, 1);
      for (const h of it.obj.userData.halves) {
        const e = this.halfExtent(it, h);
        h.userData.slide = Math.max(0, it.gap / 2 + 0.05 - (h.userData.side > 0 ? e.x0 : -e.x1));
      }
      this.poseBreak(it, 1);
      it.broken = this.brokenBoxes(it);
      this.poseBreak(it, 0);
      this.refreshNav(it);
      it.smash = 0;
      it.r = s.r ?? 2.2;
    } else if (s.kind === 'lever') {
      // el eje, en la placa del muro (0,45 m detrás del punto de uso)
      it.obj = leverMesh();
      it.obj.position.set(s.x - s.nx * 0.33, s.y + 1.25, s.z - s.nz * 0.33);
      it.obj.rotation.y = Math.atan2(s.nx, s.nz);
      it.obj.userData.arm.rotation.x = LEVER_UP;
      g.scene.add(it.obj);
      it.pull = 0;
      it.r = s.r ?? 1.8;
    } else if (s.kind === 'hatch') {
      it.r = s.r ?? 1.6;
      if (s.end === 'top') {
        it.obj = hatchMesh();
        it.obj.position.set(s.x, s.y + 0.03, s.z);
        g.scene.add(it.obj);
        // con la luz horneada del sitio
        const zn = g.zoneAt(s);
        const pr = g.probe.sample(s.x, s.y + 0.9, s.z, zn && zn.room ? g.level.ctx.wb.roomId(zn.room) : 0);
        for (const m of it.obj.userData.mats)
          if (m._u) {
            m._u.uProbe.value.set(pr[0], pr[1], pr[2]);
            m._u.uGround.value.set(s.y, 0.34);
          }
        it.lift = 0;
      }
    } else if (s.kind === 'examine' || s.kind === 'climb' || s.kind === 'well') {
      it.r = s.r ?? 2;
    } else if (s.kind === 'trigger') {
      it.r = s.r;
    }
    this.list.push(it);
    return it;
  }

  // Aplica el estado guardado. Con 'reset' vuelve antes todo a su estado
  // inicial: una partida nueva tras salir al título heredaba puertas
  // abiertas, objetos recogidos (la espada no volvía a aparecer), nieblas
  // disipadas y el disparador del final ya gastado.
  applyFlags(flags, reset = false) {
    for (const it of this.list) {
      if (reset) this.reset(it);
      if (it.kind === 'door' && flags['door:' + it.id] && !it.done) this.setOpen(it, true);
      if (it.kind === 'item' && flags['take:' + it.id]) {
        it.done = true;
        it.obj.visible = false;
      }
      if (it.kind === 'note' && flags['take:' + it.id] && it.glow) it.glow.visible = false;
      if (it.kind === 'fog' && flags['boss:' + it.boss]) this.clearFog(it);
      if (it.kind === 'item' && it.afterBoss && flags['boss:' + it.afterBoss] && !flags['take:' + it.id]) {
        it.hidden = false;
        it.obj.visible = true;
      }
      if (it.kind === 'breakable' && flags['broken:' + it.id] && !it.done) this.shatter(it, true);
      if (it.kind === 'lever' && flags['lever:' + it.id]) {
        it.done = true;
        it.pull = 0;
        it.obj.userData.arm.rotation.x = LEVER_DOWN;
      }
      if (it.kind === 'hatch' && it.obj) this.poseHatch(it, flags[it.flag] ? 1 : 0);
    }
    // los rastrillos de palancas: un palmo por palanca echada
    for (const it of this.list) if (it.kind === 'door' && it.lock.type === 'levers' && !it.done) this.leverGate(it, true);
  }

  // Tapa de la trampilla: 0 cerrada, 1 abierta (tumbada sobre el suelo).
  poseHatch(it, k) {
    it.lift = k;
    const u = it.obj.userData;
    u.lidG.rotation.z = k * 2.75;
    u.hole.visible = k > 0.02;
  }

  // Palancas de un rastrillo ya echadas.
  leversDown(it) {
    return it.lock.levers.filter((id) => this.game.flags['lever:' + id]).length;
  }
  // Sube el rastrillo según sus palancas (del todo con las tres).
  leverGate(it, instant = false) {
    const n = this.leversDown(it);
    if (n >= it.lock.levers.length) {
      this.game.flags['door:' + it.id] = true;
      this.setOpen(it, instant);
      const nav = this.game.navCellar;
      if (nav) nav.refresh(it.x - 3, it.z - 3, it.x + 3, it.z + 3);
      return n;
    }
    it.rise = (n / it.lock.levers.length) * 0.16;
    if (instant) {
      it.open = it.rise;
      this.poseDoor(it, it.open);
    }
    return n;
  }

  reset(it) {
    it.done = false;
    if (it.kind === 'door') {
      it.target = 0;
      it.open = 0;
      if (it.lock && it.lock.type === 'levers' && this.game.navCellar) {
        it.box.enabled = true;
        this.game.navCellar.refresh(it.x - 3, it.z - 3, it.x + 3, it.z + 3);
      }
      it.rise = undefined;
      if (it.box) it.box.enabled = true;
      if (it.boards) it.boards.visible = true;
      if (it.mat === 'barricade') it.obj.visible = true;
      this.poseDoor(it, 0);
    } else if (it.kind === 'item') {
      it.hidden = !!it.afterBoss;
      it.obj.visible = !it.hidden;
    } else if (it.kind === 'note') {
      if (it.glow) it.glow.visible = true;
    } else if (it.kind === 'lever') {
      it.pull = 0;
      it.pulling = false;
      it.obj.userData.arm.rotation.x = LEVER_UP;
    } else if (it.kind === 'hatch') {
      it.opening = false;
      if (it.obj) this.poseHatch(it, 0);
    } else if (it.kind === 'breakable') {
      it.smash = 0;
      it.bk = undefined;
      it.box.enabled = true;
      for (const b of it.broken) b.enabled = false;
      this.poseBreak(it, 0);
      this.refreshNav(it);
    }
    // la niebla la enciende update() según su jefe
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

  // Cierra de golpe una puerta abierta y le echa la tranca (por su lado de
  // quitarla): la bodega, cuando alguien te encierra abajo.
  slamShut(it) {
    it.done = false;
    it.target = 0;
    it.closing = 1;
    if (it.box) it.box.enabled = true;
    delete this.game.flags['door:' + it.id];
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
    if (it.bar) {
      // se levanta de las grapas, se aparta y desaparece
      const u = Math.min(1, k / 0.4);
      it.bar.position.set(0, u * 0.28 - Math.max(0, u - 0.6) * 1.2, it.barZ + it.barS * u * 0.45);
      it.bar.rotation.z = u * 0.35;
      it.bar.visible = k < 0.45;
    }
    // la entornada parte de su apertura inicial
    if (it.ajar) k = it.ajar + (1 - it.ajar) * k;
    for (const lf of it.leaves || []) {
      if (it.mat === 'grate') lf.position.y = k * (it.h - 0.3);
      else if (it.mat === 'seal') lf.position.y = -k * (it.h + 0.2);
      else {
        // sw = +1 abre hacia -z local (eje 'x': -z del mundo; eje 'z': +x)
        const side = lf.userData.side ?? it.hinge ?? -1;
        const sw = it.swing ?? 1;
        lf.rotation.y = -side * sw * k * (it.maxAngle ?? 1.5);
      }
    }
  }

  // k: 0 entera -> 1 partida y en el suelo
  poseBreak(it, k) {
    const out = (x) => 1 - (1 - x) * (1 - x);
    for (const h of it.obj.userData.halves) {
      const u = h.userData;
      // vuelca acelerando, da en el suelo y rebota un poco
      let f = Math.min(1, k / 0.72);
      f *= f;
      if (k > 0.72) f = 1 - 0.08 * Math.sin((Math.PI * (k - 0.72)) / 0.28);
      h.rotation.set(0, u.yaw * out(k), u.side * u.tilt * f);
      h.position.set(u.x0 + u.side * u.slide * out(Math.min(1, k / 0.6)), 0, u.dz * out(k));
      for (const sp of u.spl) sp.visible = k > 0;
    }
  }

  // Huella de una mitad (sin astillas) en coordenadas de la mesa.
  halfExtent(it, h) {
    it.obj.updateMatrixWorld(true);
    const inv = _m4.copy(it.obj.matrixWorld).invert();
    const e = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity, y1: -Infinity };
    h.traverse((m) => {
      if (!m.isMesh || m.userData.splinter) return;
      const p = m.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        _v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).applyMatrix4(inv);
        e.x0 = Math.min(e.x0, _v.x);
        e.x1 = Math.max(e.x1, _v.x);
        e.z0 = Math.min(e.z0, _v.z);
        e.z1 = Math.max(e.z1, _v.z);
        e.y1 = Math.max(e.y1, _v.y);
      }
    });
    return e;
  }

  // Colisión de las dos mitades ya caídas (desactivada hasta que se parte).
  brokenBoxes(it) {
    const col = this.game.world.col;
    const c = Math.cos(it.rot),
      s = Math.sin(it.rot);
    return it.obj.userData.halves.map((h) => {
      const e = this.halfExtent(it, h);
      // el paso central queda libre aunque el corte asome un poco
      if (h.userData.side > 0) e.x0 = Math.max(e.x0, it.gap / 2);
      else e.x1 = Math.min(e.x1, -it.gap / 2);
      const sh = 0.04;
      const lx = (e.x0 + e.x1) / 2,
        lz = (e.z0 + e.z1) / 2;
      const b = col.addOBB(it.x + lx * c + lz * s, it.z - lx * s + lz * c, Math.max(0.05, (e.x1 - e.x0) / 2 - sh), Math.max(0.05, (e.z1 - e.z0) / 2 - sh), it.rot, it.y, it.y + Math.min(0.75, e.y1));
      b.enabled = false;
      return b;
    });
  }

  // las criaturas dejan de rodear la mesa (o vuelven a hacerlo)
  refreshNav(it) {
    const g = this.game;
    const r = Math.hypot(it.w, it.d) / 2 + 1.2;
    for (const n of [g.navSurface, g.navCrypt, g.navCellar]) if (n) n.refresh(it.x - r, it.z - r, it.x + r, it.z + r);
  }

  shatter(it, instant = false) {
    const g = this.game;
    it.done = true;
    it.smash = 0;
    it.box.enabled = false;
    for (const b of it.broken) b.enabled = true;
    this.refreshNav(it);
    if (instant) {
      it.bk = 1;
      this.poseBreak(it, 1);
      return;
    }
    it.bk = 0;
    g.flags['broken:' + it.id] = true;
    g.fx.blood.emit(it.x, it.y + 0.85, it.z, 34, { color: [0.14, 0.085, 0.05], speed: 4.5, life: 0.9, up: 2.2 }); // astillas
    g.fx.blood.emit(it.x, it.y + 0.5, it.z, 18, { color: [0.1, 0.09, 0.075], speed: 2.4, life: 0.9, up: 0.8, gravity: 3 }); // polvo
    g.audio && g.audio.play('woodBreak', { x: it.x, y: it.y, z: it.z });
    g.camRig.shake(0.3);
    g.hitstop = Math.max(g.hitstop, 0.08);
    g.input.rumble(0.7, 0.5, 120);
    g.saveGame();
  }

  // candidato más cercano
  nearest(player) {
    let best = null,
      bd = 1e9;
    for (const it of this.list) {
      if (it.done && it.kind !== 'altar' && it.kind !== 'examine' && it.kind !== 'note') continue;
      if (it.hidden) continue;
      if (it.kind === 'trigger') continue;
      if (it.kind === 'climb' && !this.game.canClimbWell()) continue;
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
        if (it.lock.type === 'levers') return 'Examinar el rastrillo';
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
      case 'breakable':
        return it.label ?? 'Partir la mesa';
      case 'climb':
        return 'Trepar por el pozo';
      case 'lever':
        return 'Echar la palanca';
      case 'well':
        return this.game.flags['pozo:salida'] ? 'Bajar por el pozo' : 'Asomarse al pozo';
      case 'hatch':
        if (it.end === 'top') return this.game.flags[it.flag] ? 'Bajar por la escalera' : 'Abrir la trampilla';
        return this.game.flags[it.flag] ? 'Subir por la escalera' : 'Examinar la trampilla';
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
      } else if (L.type === 'levers') {
        g.ui.toast(MSG.rastrillo(this.leversDown(it)), 5);
        g.audio && g.audio.play('locked', it);
      }
      return true;
    }
    if (it.kind === 'lever') {
      if (it.done || it.pulling) return true;
      // tirar cuesta: el mango baja a tirones y chirría; si algo te golpea
      // (o te apartas), lo sueltas y vuelve a subir poco a poco
      it.pulling = true;
      it.pull = Math.max(0.001, it.pull);
      it.heave = -1;
      p.playInteract('lever', Math.atan2(-it.nx, -it.nz), LEVER_TIME + 0.15 - it.pull);
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
    if (it.kind === 'climb') {
      g.climbWell(it);
      return true;
    }
    if (it.kind === 'hatch') {
      if (g.flags[it.flag]) g.hatchMove(it);
      else if (it.end === 'top') {
        // se descorre el cerrojo y la tapa se abre: el atajo a la cárcel
        g.flags[it.flag] = true;
        it.opening = true;
        p.playInteract('interact', Math.atan2(it.x - p.pos.x, it.z - p.pos.z));
        g.audio && g.audio.play('bar', { x: it.x, y: it.y, z: it.z });
        setTimeout(() => g.audio && g.audio.play('doorOpen', { x: it.x, y: it.y, z: it.z }), 350);
        g.ui.toast(MSG.hatchOpen, 4.5);
        g.saveGame();
      } else {
        g.ui.toast(MSG.hatchShut, 4);
        g.audio && g.audio.play('locked', { x: it.x, y: it.y + 4, z: it.z });
      }
      return true;
    }
    if (it.kind === 'well') {
      if (g.flags['pozo:salida']) g.descendWell(it);
      else {
        g.ui.toast(MSG.pozoCalle);
        g.audio && g.audio.play('drip', { x: it.x, y: it.y - 4, z: it.z });
      }
      return true;
    }
    if (it.kind === 'breakable') {
      if (it.done || it.smash > 0) return true;
      // golpe de arriba abajo; la mesa cede cuando baja el arma
      it.smash = 0.5;
      p.playInteract('smash', Math.atan2(it.x - p.pos.x, it.z - p.pos.z));
      return true;
    }
    return false;
  }

  update(dt) {
    const g = this.game;
    const t = g.time;
    for (const it of this.list) {
      if (it.kind === 'door' && it.closing) {
        // se cierra de un portazo (muy deprisa) y la tranca cae en su sitio
        it.open = Math.max(0, it.open - dt * 4.5);
        this.poseDoor(it, it.open * it.open);
        if (it.open <= 0) it.closing = 0;
      }
      if (it.kind === 'lever' && !it.done && (it.pulling || it.pull > 0)) {
        const p = g.player;
        const arm = it.obj.userData.arm;
        if (it.pulling && (p.state !== 'interact' || p.interactKind !== 'lever')) {
          // se ha soltado: el mango se le escapa y empieza a subir
          it.pulling = false;
          g.audio && g.audio.play('clang', { x: it.x, y: it.y + 1.2, z: it.z }, { k: 0.5 });
        }
        if (it.pulling) {
          it.pull += dt;
          // un chirrido por tirón
          const k = Math.floor((it.pull / LEVER_TIME) * LEVER_HEAVES);
          if (k !== it.heave) {
            it.heave = k;
            g.audio && g.audio.play('leverCreak', { x: it.x, y: it.y + 1.2, z: it.z });
          }
          if (it.pull >= LEVER_TIME) {
            it.pull = 0;
            it.pulling = false;
            it.done = true;
            arm.rotation.x = LEVER_DOWN;
            g.audio && g.audio.play('leverClunk', { x: it.x, y: it.y + 1.2, z: it.z });
            g.flags['lever:' + it.id] = true;
            const gate = this.list.find((q) => q.id === it.gate);
            const n = gate ? this.leverGate(gate) : 0;
            g.onLever && g.onLever(it, n, gate);
            g.saveGame();
          } else arm.rotation.x = leverAngle(it.pull);
        } else {
          // suelta, sube despacio (la mitad de rápido de lo que baja)
          it.pull = Math.max(0, it.pull - dt * 0.5);
          arm.rotation.x = leverAngle(it.pull);
        }
      }
      if (it.kind === 'door' && it.rise !== undefined && !it.target && it.open < it.rise) {
        it.open = Math.min(it.rise, it.open + dt * 0.12);
        this.poseDoor(it, it.open);
      }
      if (it.kind === 'door' && it.target && it.open < 1) {
        const speed = it.mat === 'grate' ? 0.35 : it.mat === 'seal' ? 0.4 : it.mat === 'barricade' ? 1.3 : 1.1;
        it.open = Math.min(1, it.open + dt * speed);
        const k = it.open;
        this.poseDoor(it, 1 - Math.pow(1 - k, 2));
        if (k >= 1 && it.mat === 'barricade') it.obj.visible = false;
        if (k >= 1 && it.boards) it.boards.visible = false;
      }
      if (it.kind === 'hatch' && it.opening && it.obj) {
        const k = Math.min(1, it.lift + dt / 0.7);
        this.poseHatch(it, k);
        if (k >= 1) it.opening = false;
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
      if (it.kind === 'breakable') {
        if (it.smash > 0) {
          it.smash -= dt;
          // si le han cortado el golpe al jugador, la mesa sigue entera
          if (it.smash <= 0 && g.player.state === 'interact' && g.player.interactKind === 'smash') this.shatter(it);
        }
        if (it.bk !== undefined && it.bk < 1) {
          it.bk = Math.min(1, it.bk + dt / 0.6);
          this.poseBreak(it, it.bk);
        }
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
