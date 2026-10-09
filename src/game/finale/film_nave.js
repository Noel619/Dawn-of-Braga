// La película, acto 1 (segunda mitad): la muralla y la nave.
//
// Fuera del cráter, con el jugador de rodillas en la joroba, el gigante echa
// a andar hacia la ciudad y atraviesa la muralla norte con el hombro
// (¡Agárrate!). En el patio de la cabecera alza los puños y los descarga
// sobre el tejado: el golpe lanza al jugador por encima de su cabeza, la
// bóveda del presbiterio revienta y el jugador cae dentro; se agarra al
// estandarte grande, que se rasga y le baja hasta el suelo. El gigante abre
// el agujero, pisa el ábside y se asoma: su cara, sobre el muro. Y la nave se
// viene abajo mientras se corre hacia la puerta (con control): el gigante
// revienta la cabecera y entra, cae un fajón (¡Esquiva!), una corona de
// velas (¡Rueda!), la mano baja por la bóveda y revienta los bancos
// (¡Esquiva!); la segunda vez, te atrapa (acto 2: film_grab.js).
import * as THREE from 'three';
import { sm, smoother, lerp, easeIn, Path } from './film.js';
import { FP } from './film_player.js';
import { CLIMB_Z, onHump, humpMatrix } from './film_rise.js';
import { NAVE, BREACH, PIT_SLAB } from '../../world/level_finale.js';
import { clamp, dampAngle } from '../../core/util.js';
import { objMat } from '../../gfx/materials.js';
import { Cloth } from './cloth.js';
import { LightShafts } from '../../gfx/effects.js';

const V3 = THREE.Vector3;
const rnd = (a, b) => a + Math.random() * (b - a);
// el polvo (las partículas no reciben luz: de noche, dentro, oscuro)
const DUST_IN = [0.17, 0.16, 0.15],
  DUST_OUT = [0.26, 0.24, 0.22];
const _v = new V3(),
  _v2 = new V3(),
  _m = new THREE.Matrix4();

// Dónde pasa cada cosa (z; el gigante va siempre hacia el sur, +z)
export const NAV = {
  // empieza la embestida: el hombro llega a la cara de fuera de la muralla
  // (z = -126) en el golpe
  bashZ: -135,
  // de pie ante la cabecera (tras la embestida)
  tearZ: -117,
  // dónde descarga los puños (el hastial del norte y el tejado)
  punch: [
    [5.6, 17.6, -107.2],
    [-5.6, 17.6, -107.2],
  ],
  // un pie en el ábside, asomado a la nave
  peerZ: -110,
  // donde se agarra al estandarte y donde cae
  grab: [0, 11.0, -100.15],
  land: [0.4, 1.2, -100.5],
};

// ======================================================================
// lo que se rompe
// ======================================================================
// la muralla: el tramo de la brecha, en pedazos hacia la ciudad
function breakWall(D, at) {
  const g = D.g,
    a = g.audio;
  g.setGroupVisible('muroN', false);
  g.setGroupVisible('muroNRuin', true);
  const { x0, x1, z0, z1, h } = BREACH;
  for (let i = 0; i < 36; i++) {
    const x = rnd(x0 + 0.4, x1 - 0.4),
      y = rnd(1.2, h + 0.8),
      z = rnd(z0, z1);
    const s = rnd(0.7, 1.4);
    D.chunks.add({ mat: 'wallstone', size: [s * 1.3, s * 0.7, s], pos: new V3(x, y, z), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(rnd(-3, 3) + (x - at.x) * 0.5, rnd(1, 8), rnd(6, 16)), spin: [rnd(-5, 5), rnd(-5, 5), rnd(-5, 5)], shatter: 14, life: 10, tint: 0xd8d4cc });
  }
  // almenas enteras, volando
  for (let i = 0; i < 6; i++) D.chunks.add({ mat: 'wallstone', size: [0.9, 1.2, 0.6], pos: new V3(rnd(x0, x1), h + 0.6, z0 + 0.3), rot: [0, 0, 0], vel: new V3(rnd(-4, 4), rnd(5, 10), rnd(8, 14)), spin: [rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)], shatter: 12, life: 10, tint: 0xd8d4cc });
  D.debris.burst(new V3(at.x, 6, -124), 60, { speed: 11, up: 7, size: 1.2, spread: 4, dir: new V3(0, 0, 0.9) });
  for (let k = 0; k < 5; k++) g.fx.blood.emit(rnd(-6, 6), rnd(1, 9), rnd(-126, -121), 50, { color: DUST_OUT, speed: 6, life: 3.2, up: 1.5, gravity: 0.3 });
  a && a.play('wallBreak', at, { k: 2.2 });
  a && a.play('explosion', at, { k: 1.2 });
  a && a.play('pillarBreak', { x: at.x + 4, y: 4, z: -123 }, { k: 1.8 });
  g.camRig.shake(1.3);
  g.input.rumble(1, 1, 900);
}

// un tramo del tejado y la bóveda de la nave se viene abajo
function breakSec(D, k, o = {}) {
  const g = D.g,
    a = g.audio;
  if (!g.groups['naveRoof:' + k] || !g.groups['naveRoof:' + k].on) return;
  const [s0, s1] = NAVE.secs[k];
  g.setGroupVisible('naveRoof:' + k, false);
  g.setGroupVisible('naveRuin:' + k, true);
  const z0 = Math.max(s0, -104),
    z1 = Math.min(s1, -61.5);
  const n = Math.round((z1 - z0) * (o.k ?? 1.5));
  const push = o.push ?? 0;
  // dovelas de la bóveda
  for (let i = 0; i < n; i++) {
    const z = rnd(z0, z1),
      x = rnd(-4.6, 4.6);
    const y = NAVE.YV + Math.sqrt(Math.max(0, 1 - (x / 5.05) ** 2)) * NAVE.RV - 0.2;
    D.chunks.add({ mat: 'ashlar', size: [rnd(0.8, 1.7), rnd(0.35, 0.5), rnd(0.6, 1.1)], pos: new V3(x, y, z), rot: [rnd(-0.4, 0.4), rnd(0, 3), rnd(-0.4, 0.4)], vel: new V3(rnd(-1.2, 1.2), rnd(-2, 1.5), rnd(-1, 1) + push), spin: [rnd(-3, 3), rnd(-2, 2), rnd(-3, 3)], shatter: 10, life: 9, tint: 0xdcd4c7 });
  }
  // tejas y tablas del tejado
  for (let i = 0; i < n * 0.6; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side * rnd(0.5, 12.5);
    D.chunks.add({ mat: Math.random() < 0.7 ? 'roof' : 'planks', size: [rnd(0.9, 1.5), 0.12, rnd(0.6, 1.0)], pos: new V3(x, 20 - Math.abs(x) * 0.46 + rnd(0, 0.3), rnd(z0, z1)), rot: [rnd(-0.6, 0.6), rnd(0, 3), side * 0.42], vel: new V3(side * rnd(0, 2), rnd(-1, 2), rnd(-1, 1) + push), spin: [rnd(-4, 4), rnd(-3, 3), rnd(-4, 4)], shatter: 7, life: 8 });
  }
  // vigas
  for (let i = 0; i < Math.max(2, n / 8); i++) D.chunks.add({ mat: 'timber', size: [0.3, 0.3, rnd(3, 5.5)], pos: new V3(rnd(-9, 9), rnd(15, 18.5), rnd(z0 + 1, z1 - 1)), rot: [rnd(-0.3, 0.3), rnd(-0.8, 0.8), rnd(-0.3, 0.3)], vel: new V3(rnd(-1, 1), rnd(-1, 1), push), spin: [rnd(-2, 2), rnd(-1, 1), rnd(-2, 2)], shatter: 99, life: 9, bounce: 0.15 });
  // polvo que baja y cascotes
  for (let i = 0; i < 5; i++) g.fx.blood.emit(rnd(-5, 5), NAVE.YV + rnd(0, 3), rnd(z0, z1), 24, { color: DUST_IN, speed: 3, life: 3, up: -0.5, gravity: 0.35 });
  D.debris.burst(new V3(0, NAVE.YV + 2, (z0 + z1) / 2), 36, { speed: 5, up: 2, size: 0.9, spread: (z1 - z0) * 0.4 });
  const c = { x: 0, y: NAVE.YV, z: (z0 + z1) / 2 };
  a && a.play('wallBreak', c, { k: 1.8 });
  a && a.play('woodBreak', c, { k: 1.4 });
  a && a.play('pillarBreak', { x: 3, y: NAVE.YV, z: c.z + 2 }, { k: 1.4 });
  g.camRig.shake(o.shake ?? 0.6);
}

// un fajón se viene abajo, en trozos (la luz los encuentra)
function dropFaj(D, i, o = {}) {
  const g = D.g;
  const G = g.groups['naveFaj:' + i];
  if (!G || !G.on) return [];
  g.setGroupVisible('naveFaj:' + i, false);
  const z = NAVE.faj[i];
  const out = [];
  const N = 6;
  for (let k = 0; k < N; k++) {
    const t0 = (k / N) * Math.PI,
      t1 = ((k + 1) / N) * Math.PI;
    const tm = (t0 + t1) / 2;
    const x = Math.cos(tm) * 4.8,
      y = NAVE.YV + Math.sin(tm) * (NAVE.RV - 0.2);
    const len = 2 * 4.9 * Math.sin((t1 - t0) / 2) + 0.1;
    const c = D.chunks.add({ mat: 'ashlar', size: [len, 0.6, 0.55], pos: new V3(x, y, z), rot: [0, 0, tm - Math.PI / 2], vel: new V3(-Math.cos(tm) * rnd(0, 1.2) + (o.vx ?? 0), rnd(-1, 0.5), (o.vz ?? 0) + rnd(-0.5, 0.5)), spin: [rnd(-1.5, 1.5), rnd(-1, 1), rnd(-2.5, 2.5)], shatter: 9, life: 10, tint: 0xf0e6d6 });
    out.push(c);
  }
  return out;
}

// una corona de velas, entera (cae entera, con las velas encendidas)
function crownMesh() {
  const grp = new THREE.Group();
  const iron = objMat('iron'),
    wax = objMat('candle'),
    fire = objMat('ember');
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.05, 4, 24), iron);
  ring.rotation.x = Math.PI / 2;
  grp.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 4, 16), iron);
  ring2.rotation.x = Math.PI / 2;
  grp.add(ring2);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const p = new V3(Math.cos(a) * 1.3, 0, Math.sin(a) * 1.3),
      h = new V3(0, 0.72, 0);
    const d = h.clone().sub(p);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, d.length(), 0.03), iron);
    s.position.copy(p).add(h).multiplyScalar(0.5);
    s.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
    grp.add(s);
  }
  const cg = new THREE.CylinderGeometry(0.035, 0.035, 0.18, 6),
    fg = new THREE.BoxGeometry(0.035, 0.09, 0.035);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const c = new THREE.Mesh(cg, wax);
    c.position.set(Math.cos(a) * 1.3, 0.12, Math.sin(a) * 1.3);
    grp.add(c);
    const f = new THREE.Mesh(fg, fire);
    f.position.set(Math.cos(a) * 1.3, 0.26, Math.sin(a) * 1.3);
    grp.add(f);
  }
  return grp;
}
function dropCrown(D, i, o = {}) {
  const g = D.g;
  const G = g.groups['naveCrown:' + i];
  if (!G || !G.on) return null;
  g.setGroupVisible('naveCrown:' + i, false);
  const z = NAVE.crowns[i];
  const L = D.light({ x: 0, y: 8.6, z, color: 0xffa24a, intensity: 14, range: 9, priority: 8 });
  const c = D.chunks.add({
    mesh: crownMesh(),
    size: [2.6, 0.5, 2.6],
    radius: 0.25,
    pos: new V3(0, 8.6, z),
    rot: [0, rnd(0, 3), 0],
    vel: new V3(o.vx ?? 0, o.vy ?? -1, o.vz ?? 0),
    spin: o.spin ?? [rnd(-1.5, 1.5), rnd(-0.5, 0.5), rnd(-1.5, 1.5)],
    shatter: 99,
    bounce: 0.3,
    life: 30,
    dust: true,
    onUpdate: (cc) => {
      L.x = cc.p.x;
      L.y = cc.p.y + 0.3;
      L.z = cc.p.z;
      if (cc.rest && !cc.out) {
        cc.out = true;
        L.intensity = 6;
      }
    },
    onLand: (cc, sp) => {
      g.audio && g.audio.play('chainRun', cc.p, { k: 1.2 });
      g.fx.blood.emit(cc.p.x, cc.p.y + 0.2, cc.p.z, 30, { color: [1, 0.62, 0.25], speed: 3, life: 0.7, up: 2, gravity: 2 });
      void sp;
    },
  });
  c.light = L;
  return c;
}

// la cabecera revienta (el muro del norte y lo del presbiterio), hacia dentro
function breakCabecera(D) {
  const g = D.g,
    a = g.audio;
  if (!g.groups.cabecera.on) return;
  g.setGroupVisible('cabecera', false);
  g.setGroupVisible('cabeceraRuin', true);
  for (let i = 0; i < 30; i++) {
    const x = rnd(-9, 9),
      y = rnd(1, 11),
      z = rnd(-108, -104);
    const s = rnd(0.7, 1.4);
    D.chunks.add({ mat: 'ashlar', size: [s * 1.3, s * 0.7, s], pos: new V3(x, y, z), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(x * 0.25 + rnd(-2, 2), rnd(1, 6), rnd(5, 12)), spin: [rnd(-5, 5), rnd(-5, 5), rnd(-5, 5)], shatter: 12, life: 10, tint: 0xdcd4c7 });
  }
  // trozos de las vidrieras
  for (let i = 0; i < 10; i++) D.chunks.add({ mat: 'glass', size: [rnd(0.3, 0.7), rnd(0.4, 0.9), 0.05], pos: new V3(rnd(-5, 5), rnd(5, 11), -104), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(rnd(-3, 3), rnd(0, 4), rnd(4, 9)), spin: [rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)], shatter: 4, life: 6, dust: false });
  D.debris.burst(new V3(0, 5, -105), 50, { speed: 9, up: 5, size: 1.1, spread: 5, dir: new V3(0, 0, 0.8) });
  for (let k = 0; k < 5; k++) g.fx.blood.emit(rnd(-8, 8), rnd(1, 8), rnd(-106, -100), 40, { color: DUST_IN, speed: 6, life: 3, up: 1, gravity: 0.3 });
  a && a.play('wallBreak', { x: 0, y: 5, z: -105 }, { k: 2.2 });
  a && a.play('glassBreak', { x: 0, y: 7, z: -104 }, { k: 1.4 });
  a && a.play('pillarBreak', { x: -4, y: 4, z: -104 }, { k: 1.6 });
  g.camRig.shake(1);
  g.input.rumble(1, 1, 600);
}
// el ábside, pisado
function breakApse(D) {
  const g = D.g,
    a = g.audio;
  if (!g.groups.abside.on) return;
  g.setGroupVisible('abside', false);
  g.setGroupVisible('absideRuin', true);
  for (let i = 0; i < 22; i++) {
    const x = rnd(-7, 7),
      y = rnd(1, 12),
      z = rnd(-112, -108);
    const s = rnd(0.7, 1.3);
    D.chunks.add({ mat: Math.random() < 0.25 ? 'roof' : 'ashlar', size: [s * 1.3, s * 0.6, s], pos: new V3(x, y, z), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(x * 0.6 + rnd(-2, 2), rnd(2, 6), rnd(-3, 3)), spin: [rnd(-5, 5), rnd(-5, 5), rnd(-5, 5)], shatter: 12, life: 10, tint: 0xdcd4c7 });
  }
  D.debris.burst(new V3(0, 6, -110), 40, { speed: 8, up: 6, size: 1.1, spread: 4 });
  for (let k = 0; k < 4; k++) g.fx.blood.emit(rnd(-6, 6), rnd(1, 8), rnd(-112, -108), 40, { color: DUST_OUT, speed: 5, life: 3, up: 1, gravity: 0.3 });
  a && a.play('wallBreak', { x: 0, y: 6, z: -110 }, { k: 2 });
  a && a.play('pillarBreak', { x: 3, y: 4, z: -110 }, { k: 1.4 });
}
// las arquerías de un tramo, reventadas por el cuerpo del gigante
function breakArc(D, k) {
  const g = D.g,
    a = g.audio;
  if (!g.groups['naveArc:' + k].on) return;
  g.setGroupVisible('naveArc:' + k, false);
  g.setGroupVisible('naveArcRuin:' + k, true);
  const [s0, s1] = NAVE.secs[k];
  const z0 = Math.max(s0, -104),
    z1 = Math.min(s1, -64);
  for (const x of [-5.5, 5.5]) {
    for (let i = 0; i < (z1 - z0) * 1.2; i++) {
      const s = rnd(0.6, 1.2);
      D.chunks.add({ mat: 'ashlar', size: [s, s * 0.7, s * 1.2], pos: new V3(x + rnd(-0.4, 0.4), rnd(2, 11), rnd(z0, z1)), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(Math.sign(x) * rnd(2, 7), rnd(0, 4), rnd(0, 5)), spin: [rnd(-5, 5), rnd(-5, 5), rnd(-5, 5)], shatter: 11, life: 9, tint: 0xdcd4c7 });
    }
    D.debris.burst(new V3(x, 6, (z0 + z1) / 2), 24, { speed: 7, up: 3, size: 1, spread: 3, dir: new V3(Math.sign(x) * 0.7, 0, 0.3) });
  }
  a && a.play('pillarBreak', { x: 5.5, y: 5, z: (z0 + z1) / 2 }, { k: 2 });
  a && a.play('wallBreak', { x: -5.5, y: 5, z: (z0 + z1) / 2 }, { k: 1.8 });
}
// los bancos, aplastados por la mano
function breakPews(D, i, at) {
  const g = D.g,
    a = g.audio;
  if (!g.groups['naveBancos:' + i].on) return;
  g.setGroupVisible('naveBancos:' + i, false);
  g.setGroupVisible('naveBancosRuin:' + i, true);
  const [z0, z1] = NAVE.pews[i];
  for (let k = 0; k < 22; k++) {
    const x = rnd(-4.7, 4.7),
      z = rnd(z0, z1);
    const d = Math.hypot(x - at.x, z - at.z) + 0.5;
    D.chunks.add({ mat: 'wooddark', size: [rnd(0.6, 1.8), 0.08, rnd(0.18, 0.32)], pos: new V3(x, 1.0, z), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(((x - at.x) / d) * rnd(3, 8), rnd(3, 9), ((z - at.z) / d) * rnd(3, 8)), spin: [rnd(-9, 9), rnd(-9, 9), rnd(-9, 9)], shatter: 99, life: 8, bounce: 0.35, dust: false });
  }
  D.debris.burst(new V3(at.x, 1, at.z), 30, { speed: 7, up: 6, size: 0.6, spread: 2 });
  a && a.play('woodBreak', at, { k: 2 });
}

// La luna entra por el agujero de la bóveda: una luz fría en lo alto y haces
// de luz por el polvo hasta el suelo
function moonIn(D, k) {
  const g = D.g;
  const [s0, s1] = NAVE.secs[k];
  const z0 = Math.max(s0, -104),
    z1 = Math.min(s1, -62);
  const zc = (z0 + z1) / 2;
  D.light({ x: -2, y: 20, z: zc - 1, color: 0xa8b8ff, intensity: 70, range: 34, flicker: 0, priority: 9 });
  const sh = new LightShafts(g.scene);
  for (let i = 0; i < 3; i++) {
    const z = lerp(z0 + 1.5, z1 - 1.5, (i + 0.5) / 3);
    sh.add(new V3(-3 + i * 2.6, 19, z - 1.8), new V3(1.5 - i * 1.2, NAVE.FY, z + 2.4), 2.2, 0x7d8cc4);
  }
  sh.build();
  if (sh.mesh) D.own(sh.mesh);
}

// la luz de fuera entra por donde se rompe la bóveda (la luna, más fuerte
// a medida que cae la nave)
function naveLight(g, k) {
  g.atmo.override = { density: 0.014, vol: 0.06, far: 160, bloom: 1.25, hemi: 3.0 + k * 0.4, moon: 3.0 + k * 0.4, moonPos: [-14, 26, -30], fog: 0x302826, exposure: 1.25, ash: 0.2 };
}

// La campana, a un lado y atrás del gigante (no entra en la nave por el
// agujero: cuelga por fuera, junto a su pierna derecha)
function bellAside(D, G) {
  const tgt = new V3();
  G.bell.guide = { target: tgt, k: 16, d: 7 };
  D.film.also(
    (function* () {
      while (G.bell.guide && G.bell.guide.target === tgt) {
        yield;
        G.wp(-7.2, 4.2, -2.5, tgt);
      }
    })()
  );
}

// ======================================================================
// ACTO 1, SEGUNDA MITAD
// ======================================================================
export function* actNave(D, o = {}) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  const G = yield* D.waitGiant();
  if (!D.rise) setupStandalone(D, G);
  const slab = D.rise.slab;
  D.hideNave = hideNaveFolk(g);
  // ---------------------------------------------------------- 9. a la muralla
  // desde el adarve, junto a la brecha que va a abrir: el gigante echa a
  // andar hacia la muralla, la cabeza por encima de las almenas
  g.atmo.override = { density: 0.012, vol: 0.05, far: 260, bloom: 1.3, hemi: 3.0, moon: 3.4, moonPos: [-10, 24, -40], fog: 0x3a2c2a, exposure: 1.15, ash: 0.5 };
  G.lookW = 0.6;
  G.lookAt = new V3(0, 8, -100);
  G.fixY = null;
  G.groundFn = null;
  G.steps = true;
  G.pushPlayer = false;
  G.rootMotion = true;
  G.stopAction(0.4);
  G.base('march', { blend: 0.5 });
  a && a.play('beastRoar', G.head(_v), { k: 1.2 });
  F.follow((dt, tt) => {
    const hd = G.head(_v);
    return { pos: new V3(lerp(14.8, 13.6, sm(tt / 2)), 11.5, lerp(-123.6, -123.9, sm(tt / 2))), look: new V3(hd.x * 0.6, lerp(hd.y - 3, hd.y - 1.5, sm(tt / 2)), hd.z + 3), fov: 60 };
  });
  F.hand = 0.04;
  D.windK = 0.6;
  while (G.pos.z < NAV.bashZ) {
    yield;
    p.anim.speed = 1;
  }
  // ---------------------------------------------------------- 10. la embestida
  G.play('bash', { blend: 0.3 });
  G.base('idle', { blend: 0.6 });
  while (G.actT < 0.42) yield;
  // por encima del hombro del jugador, en la joroba: la muralla se le viene
  // encima
  F.pClip(FP.brace, { blend: 0.12 });
  F.follow(() => {
    const P = p.pos;
    const back = G.wd(0, 0, -1, _v2);
    const pos = new V3(P.x + 1.1, P.y + 1.6, P.z).addScaledVector(back, 2.2);
    // (mirando abajo, por delante: las almenas que se le vienen encima)
    const look = new V3(P.x * 0.5, 4.5, P.z).addScaledVector(G.forward(_v), 8);
    return { pos, look, fov: 66, roll: -0.08 };
  });
  F.hand = 0.09;
  let hold = null;
  let hit = false;
  G.onEventHook = (e) => {
    if (e !== 'bash' || hit) return;
    hit = true;
    breakWall(D, G.chest(new V3()));
  };
  while (G.actT < 1.06) {
    yield;
    if (!hold && G.actT > 0.56) {
      F.slow(0.3, 10);
      hold = F.promptAsync({ action: 'interact', label: '¡Agárrate!', window: 1.1, slow: 1 });
    }
  }
  // (si no dio tiempo a contestar, se resuelve ya)
  while (hold && hold.ok === null) yield;
  F.slow(1, 4);
  if (hold && !hold.ok) {
    // se suelta un instante: cae de rodillas en la losa, golpeándose
    F.hurt(16, null, { shake: 0.6, heavy: true });
    F.pClip(FP.cling, { blend: 0.1 });
  }
  // desde el patio de la cabecera, abajo: la muralla revienta hacia la cámara
  F.slow(0.45, 12);
  F.follow((dt, tt) => {
    const hd = G.head(_v);
    const u = sm(clamp(tt / 1.2, 0, 1));
    return { pos: new V3(11.2, 1.8, -112.6), look: new V3(lerp(-1, hd.x, u), lerp(7, hd.y - 2, u), lerp(-124, hd.z, u)), fov: 70 };
  });
  F.hand = 0.06;
  yield* F.wait(0.25);
  F.slow(1, 3);
  F.pClip(FP.kneelGrip, { blend: 0.4 });
  while (G.actT < 2.55) yield;
  // ---------------------------------------------------------- 11. la cabecera
  // desde los tejados del poniente: llega a la cabecera y alza los puños
  F.shot([15.5, 19.5, -103.5], [0, 13.5, -115.5], { fov: 60 });
  F.hand = 0.03;
  G.onEventHook = null;
  while (!G.actDone) yield;
  G.rootMotion = false;
  G.pos.z = NAV.tearZ;
  G.play('tear', { blend: 0.35 });
  bellAside(D, G);
  G.lookW = 0.3;
  G.lookAt = new V3(0, 8, -96);
  // las manos, al tejado (con el golpe, adonde dice el guion)
  const fistW = () => clamp((G.actT - 0.9) / 0.4, 0, 1) * (1 - clamp((G.actT - 2.4) / 0.6, 0, 1));
  const punch = NAV.punch.map((q) => new V3(...q));
  const poles = [new V3(14, 12, -118), new V3(-14, 12, -118)];
  const handsIK = () => {
    const w = fistW();
    if (w > 0) {
      G.reachHand('L', punch[0], poles[0], w);
      G.reachHand('R', punch[1], poles[1], w);
    } else {
      G.freeHand('L');
      G.freeHand('R');
    }
  };
  while (G.actT < 1.2) {
    yield;
    handsIK();
  }
  // dentro, en el presbiterio, mirando arriba: los puños revientan la bóveda
  naveLight(g, 0);
  F.shot([3.4, 1.9, -94.2], [0, 15, -105.5], { fov: 80 });
  F.hand = 0.05;
  a && a.play('stoneCreak', { x: 0, y: 13, z: -104 }, { k: 1.6 });
  for (let k = 0; k < 3; k++) g.fx.blood.emit(rnd(-4, 4), 15, rnd(-104, -98), 10, { color: DUST_IN, speed: 1, life: 2.4, up: -1 });
  while (G.actT < 1.3) {
    yield;
    handsIK();
  }
  breakSec(D, 0, { k: 1.8, push: 2, shake: 1.1 });
  moonIn(D, 0);
  a && a.play('explosion', { x: 0, y: 15, z: -105 }, { k: 1.2 });
  g.flash = Math.max(g.flash, 0.2);
  g.input.rumble(1, 1, 700);
  // el golpe le lanza por encima de la cabeza del gigante
  const fly = launch(D, G, slab);
  while (G.actT < 1.62) {
    yield;
    handsIK();
  }
  // fuera, en lo alto: vuela hacia la cámara, a cámara lenta
  F.slow(0.32, 10);
  // (una grúa por encima de la aureola: el jugador vuela por encima de la
  // cabeza del gigante hacia el agujero del tejado)
  F.follow((dt, tt) => {
    const P = p.pos;
    const u = sm(clamp(tt / 1.6, 0, 1));
    return { pos: new V3(lerp(3.2, 2.0, u), lerp(25, 23, u), lerp(-96.5, -98, u)), look: new V3(P.x, P.y - 0.6, P.z), fov: lerp(50, 58, u) };
  });
  F.hand = 0.03;
  D.windK = 1;
  a && a.play('wind', p.pos, { k: 1.2 });
  while (fly.t < 0.72) {
    yield;
    handsIK();
  }
  // dentro: cae hacia la cámara y se agarra al estandarte
  F.follow((dt, tt) => ({ pos: new V3(1.6, 2.3, -95.2), look: new V3(p.pos.x * 0.5, Math.max(4, p.pos.y), p.pos.z * 0.6 + -100.6 * 0.4), fov: lerp(70, 62, sm(tt / 2)) }));
  F.hand = 0.04;
  while (!fly.done) {
    yield;
    handsIK();
  }
  // ---------------------------------------------------------- 12. el estandarte
  const banner = yield* bannerRide(D, G, handsIK);
  // ---------------------------------------------------------- 13. la cara
  // (de pie en el presbiterio: mira atrás, arriba; el gigante pisa el ábside
  // y se asoma por encima del muro: la cara, enorme, mirándole)
  yield* peerShot(D, G);
  D.banner = banner;
  // ---------------------------------------------------------- 14. se derrumba
  yield* naveRun(D, G);
}

// Lo prepara todo para empezar aquí (modo de pruebas: la película desde la
// salida del cráter, sin la cisterna)
function setupStandalone(D, G) {
  const g = D.g,
    F = D.film;
  for (const [n, v] of [
    ['cisternFloorC', false],
    ['cisternPit', true],
    ['cisternCols', false],
    ['cisternColsRuin', true],
    ['cisternDome', false],
    ['cisternDomeRuin', true],
    ['cisternCrown', false],
    ['craterLid', false],
    ['crater', true],
  ])
    g.setGroupVisible(n, v);
  F.cinema(true);
  F.puppet(true);
  G.place(0, CLIMB_Z, 0, { y: 0, ground: false, clip: 'rise', t0: 14.9, bellNoGround: false });
  G.base('idle');
  const humpM = () => humpMatrix(G, _m);
  const slab = D.chunks.add({ mat: 'flag', size: PIT_SLAB.size, pos: new V3(0, 14, CLIMB_Z), uv: 0.5, attach: humpM, life: 600, tint: 0x9c948c });
  D.rise = { slab, humpM, outLights: [] };
  F.attach = () => onHump(G, slab);
  F.pClip(FP.kneelGrip, { blend: 0.01 });
  g.atmo.override = { density: 0.013, vol: 0.05, far: 230, bloom: 1.3, hemi: 2.4, moon: 3.0, moonPos: [-10, 24, -40], fog: 0x3a2c2a, snap: true };
  g.fadeTarget = 1;
  g.audio && g.audio.music('bossFinal');
}

// La gente de la catedral (los penitentes, la plañidera, la campana) y el
// fantasma: fuera de la película (los aplasta la nave)
function hideNaveFolk(g) {
  const hid = [];
  for (const e of g.enemies) {
    if (e.dead || !e.obj.visible) continue;
    if (e.pos.x < -14 || e.pos.x > 14 || e.pos.z < -113 || e.pos.z > -55) continue;
    e.scripted = true;
    e.obj.visible = false;
    if (e.shadow) e.shadow.visible = false;
    hid.push(e);
  }
  for (const ph of g.phantoms) if (ph.trigger[2] > -113 && ph.trigger[2] < -55) ph.state = 'done';
  return hid;
}

// El golpe lanza al jugador de la joroba por encima de la cabeza del gigante
// hasta el estandarte: una parábola (con vueltas) de 1,25 s del mundo.
function launch(D, G, slab) {
  const F = D.film,
    p = D.g.player;
  const from = p.pos.clone();
  const to = new V3(...NAV.grab);
  // (las manos agarran a la altura del estandarte: el cuerpo, debajo)
  to.y -= 1.9;
  const top = Math.max(from.y, to.y) + 4.5;
  const st = { t: 0, done: false };
  const dur = 1.25;
  F.attach = null;
  F.pClip(FP.fly, { blend: 0.08 });
  D.g.audio && D.g.audio.play('playerHurt', p.pos);
  F.also(
    (function* () {
      const q = new THREE.Quaternion(),
        e = new THREE.Euler();
      while (st.t < 1) {
        const dt = yield;
        st.t = Math.min(1, st.t + dt / dur);
        const u = st.t;
        // parábola de tres puntos (el de en medio, alto)
        const x = lerp(from.x, to.x, u),
          z = lerp(from.z, to.z, u);
        const y = (1 - u) * (1 - u) * from.y + 2 * u * (1 - u) * (top + 1.5) + u * u * to.y;
        F.setP(x, y, z, 0);
        // da vueltas hacia delante; al final, la cabeza arriba (se agarra)
        e.set(lerp(0, Math.PI * 2, smoother(u)), 0, Math.sin(u * 5) * 0.2);
        F.tilt.copy(q.setFromEuler(e));
        if (u > 0.82 && !st.reach) {
          st.reach = true;
          F.pClip(FP.banner, { blend: 0.15 });
        }
      }
      F.tilt.identity();
      st.done = true;
    })()
  );
  void slab;
  void G;
  return st;
}

// Agarrado al estandarte: se rasga por la barra, primero por la izquierda;
// el jugador baja, colgado, y cae al presbiterio.
function* bannerRide(D, G, handsIK) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  const B = NAVE.banner;
  const cloth = D.own(new Cloth(g.scene, { w: B.w, h: B.h, nx: 6, ny: 10, x: B.x, y: B.y, z: B.z, tex: 'bannerBlack', wind: 0.5 }));
  g.setGroupVisible('naveBanner', false);
  // las manos, en el borde de abajo (el cuerpo cuelga debajo)
  const hand = new V3(...NAV.grab);
  const hands = (out) => out.set(hand.x, hand.y, hand.z);
  cloth.pin(2, 9, (o2) => hands(o2).add(_v2.set(-0.15, 0, 0)));
  cloth.pin(3, 9, (o2) => hands(o2).add(_v2.set(0.15, 0, 0)));
  F.setP(hand.x, hand.y - 1.9, hand.z, Math.PI);
  F.pClip(FP.banner, { blend: 0.1 });
  a && a.play('clothRip', hand, { k: 1.4 });
  g.camRig.shake(0.3);
  F.slow(0.6, 8);
  let t = 0;
  const rip = [0.3, 0.45, 0.6, 1.15, 1.25, 1.35];
  let ri = 0;
  const y0 = hand.y;
  while (t < 1.9) {
    const dt = yield;
    t += dt;
    handsIK && handsIK();
    // se rasga por la barra, de izquierda a derecha
    while (ri < rip.length && t > rip[ri]) {
      cloth.unpin(ri, 0);
      a && a.play('clothRip', { x: B.x - B.w / 2 + (ri / 5) * B.w, y: B.y, z: B.z }, { k: 1.2 });
      ri++;
    }
    // baja: primero un tirón y se queda colgado de un lado; luego cae
    const drop = t < 0.3 ? 0 : t < 1.15 ? easeIn(clamp((t - 0.3) / 0.35, 0, 1)) * 1.6 + Math.max(0, t - 0.65) * 0.4 : 1.8 + easeIn(clamp((t - 1.15) / 0.75, 0, 1)) * (y0 - 1.9 - NAV.land[1] - 1.8);
    hand.y = y0 - Math.max(0, drop);
    hand.x = B.x + Math.sin(t * 2.2) * 0.35 * clamp(t - 0.4, 0, 1) + clamp(t - 0.4, 0, 1) * 0.4;
    F.setP(hand.x, hand.y - 1.9, hand.z, Math.PI + Math.sin(t * 1.7) * 0.25);
    cloth.update(dt);
  }
  // suelta la tela y cae los últimos dos metros
  cloth.unpin(2, 9);
  cloth.unpin(3, 9);
  F.slow(1, 6);
  F.pClip(FP.fall, { blend: 0.1 });
  const from = p.pos.clone();
  const to = new V3(...NAV.land);
  t = 0;
  while (t < 0.32) {
    const dt = yield;
    t += dt;
    const u = Math.min(1, t / 0.32);
    F.setP(lerp(from.x, to.x, u), lerp(from.y, to.y, u * u), lerp(from.z, to.z, u), Math.PI);
    cloth.update(dt);
  }
  F.pClip(FP.landCrouch, { blend: 0.04 });
  a && a.play('land', p.pos, { k: 1.3 });
  g.camRig.shake(0.35);
  F.hurt(6, null, { shake: 0.3, blood: false, flash: 0.3 });
  // (la tela sigue cayendo y se queda en el suelo)
  F.also(
    (function* () {
      while (!D._clothDone) {
        const dt = yield;
        cloth.update(dt);
        for (const q of cloth.p) if (q.y < NAVE.FY + 0.62) q.y = NAVE.FY + 0.62;
      }
    })()
  );
  return cloth;
}

// La cara del gigante, sobre el muro del presbiterio: pisa el ábside y se
// asoma (el jugador, de pie, mira arriba)
function* peerShot(D, G) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  // (el gigante: acaba de abrir el tejado; ahora, un paso al ábside)
  while (!G.actDone && G.actT < 4.4) yield;
  G.freeHand('L');
  G.freeHand('R');
  G.rootMotion = true;
  G.play('wadeL', { blend: 0.4 });
  G.onEventHook = (e) => {
    if (e === 'crush') {
      breakApse(D);
      g.camRig.shake(0.8);
    }
  };
  // contrapicado, por encima del hombro del jugador, hacia la cabecera
  F.follow((dt, tt) => {
    const P = p.pos;
    const u = sm(clamp(tt / 2.4, 0, 1));
    return { pos: new V3(P.x - 0.9, P.y + 1.1, P.z + 2.4), look: new V3(0, lerp(9, 12.5, u), -104.5), fov: lerp(60, 66, u) };
  });
  F.hand = 0.03;
  // se incorpora y se vuelve hacia la cabecera
  yield* F.wait(0.6);
  F.pClip('getup', { blend: 0.2 });
  yield* F.wait(0.5);
  p.anim.stop(0.35);
  while (!G.actDone) yield;
  G.rootMotion = false;
  G.pos.z = NAV.peerZ;
  G.play('peer', { blend: 0.5 });
  G.lookW = 1;
  G.lookAt = null;
  // las manos, en lo alto del muro de la cabecera
  const tops = [new V3(7.6, NAVE.CUT, -106.2), new V3(-7.6, NAVE.CUT, -106.2)];
  const poles = [new V3(16, 14, -112), new V3(-16, 14, -112)];
  let w = 0;
  F.also(
    (function* () {
      while (G.actName === 'peer') {
        const dt = yield;
        w = Math.min(1, w + dt * 1.5);
        G.reachHand('L', tops[0], poles[0], w);
        G.reachHand('R', tops[1], poles[1], w);
      }
    })()
  );
  // el primer plano: la cara sobre el muro, con la luna detrás
  yield* F.wait(0.5);
  a && a.play('beastRoarBig', G.face(_v), { k: 1.5 });
  g.camRig.shake(0.7);
  G.R.flinch.x.kick(0.4);
  F.follow((dt, tt) => {
    const fc = G.face(_v);
    const u = sm(clamp(tt / 1.6, 0, 1));
    return { pos: new V3(lerp(-2.2, -1.6, u), lerp(3.2, 3.6, u), lerp(-97.5, -98.4, u)), look: new V3(fc.x, fc.y - 0.6, fc.z), fov: lerp(46, 40, u) };
  });
  yield* F.wait(1.6);
}

// ======================================================================
// LA CARRERA POR LA NAVE (con control)
// ======================================================================
// Del presbiterio hacia la puerta: por el lado de poniente de la escalera de
// la cripta (el hueco, con su barandilla, queda a la izquierda) y luego por
// el pasillo de los bancos. Cuatro momentos, cuando se llega a cada sitio (o
// si se tarda, a su hora): el gigante revienta la cabecera y entra (cae un
// fajón: ¡Esquiva!), da otro paso (cae una corona: ¡Rueda!), descarga la
// mano por la bóveda (¡Esquiva!) y te atrapa.
export const RUN = new Path([
  [0.4, 1.2, -100.5],
  [-1.0, 1.2, -99.6],
  [-3.4, 0.6, -97.4],
  [-3.6, 0.6, -92.8],
  [-3.6, 0.6, -86.4],
  [-0.4, 0.6, -84.2],
  [0, 0.6, -64.5],
]);
const RS = { s: 0 };

function* naveRun(D, G) {
  const g = D.g,
    F = D.film,
    p = g.player;
  // el control, de vuelta
  F.cinema(false);
  F.puppet(false);
  p.anim.stop(0.2);
  F.release(0, 0.16);
  g.ui.toast('¡Corre!', 2.2);
  G.lookW = 1;
  G.lookAt = null;
  G.groundFn = (x, z) => (z > -104 ? NAVE.FY : 0);
  naveLight(g, 1);
  const beats = [
    { s: 6.5, t: 1.8, fn: beatFaj },
    { s: 17.5, t: 5.0, fn: beatCrown },
    { s: 22.0, t: 7.8, fn: beatSmash },
    { s: 27.0, t: 10.5, fn: beatCatch },
  ];
  let t = 0;
  for (const b of beats) {
    while (RS.s < b.s && t < b.t) {
      const dt = yield;
      t += dt;
      runStep(D, dt);
      if (p.dead) return;
    }
    yield* b.fn(D, G);
    if (p.dead) return;
    t = Math.max(t, b.t - 1.2);
  }
  p.autoDir = null;
}
// cada fotograma de la huida: cuánto se ha avanzado, la cámara hacia
// delante (el mando sigue mandando) y, en el modo de pruebas, el jugador
// corre solo por el recorrido
function runStep(D, dt) {
  const g = D.g,
    p = g.player,
    G = D.giant;
  RS.s = RUN.project(p.pos.x, p.pos.z);
  // (si se le escapa, el gigante se da prisa)
  const gap = p.pos.z - G.pos.z;
  const want = clamp(1 + (gap - 15) / 10, 1, 1.7);
  G.speedK += (want - G.speedK) * Math.min(1, dt * 3);
  const ahead = RUN.at(RS.s + 4, {});
  const cr = g.camRig;
  cr.yaw = dampAngle(cr.yaw, Math.atan2(ahead.tx, ahead.tz), 1.6, dt);
  cr.pitch = cr.pitch + (0.14 - cr.pitch) * Math.min(1, dt * 2);
  if (g.dev && (g.dev.autoRun || g.dev.autoQTE) && !p.puppet) {
    const q = RUN.at(RS.s + 2.2, {});
    const dx = q.x - p.pos.x,
      dz = q.z - p.pos.z;
    const l = Math.hypot(dx, dz) || 1;
    p.autoDir = { x: dx / l, z: dz / l, m: 1 };
  } else p.autoDir = null;
}
// vuelve el control tras un momento
function* resume(D) {
  const g = D.g,
    F = D.film,
    p = g.player;
  F.slow(1, 6);
  F.cinema(false);
  F.puppet(false);
  p.anim.stop(0.15);
  F.cam = null;
  F.camFn = null;
  g.camRig.override = null;
  // (la cámara, detrás, mirando hacia donde se corre)
  const q = RUN.at(RUN.project(p.pos.x, p.pos.z) + 4, {});
  g.camRig.yaw = Math.atan2(q.tx, q.tz);
  yield;
}
// ¡Esquiva! / ¡Rueda!: rueda hacia delante por el recorrido
function* rollOn(D, ds = 4.2, dur = 0.62) {
  const g = D.g,
    F = D.film,
    p = g.player;
  const from = p.pos.clone();
  const s0 = RUN.project(from.x, from.z);
  const to = RUN.at(s0 + ds, {});
  // (desde donde esté, hacia el recorrido: no se mete en el hueco de la
  // escalera de la cripta)
  p.yaw = Math.atan2(to.x - from.x, to.z - from.z);
  F.pClip('roll', { blend: 0.04 });
  g.audio && g.audio.play('roll', p.pos);
  let t = 0;
  while (t < dur) {
    t += yield;
    const u = 1 - Math.pow(1 - Math.min(1, t / dur), 2);
    const x = lerp(from.x, to.x, u),
      z = lerp(from.z, to.z, u);
    F.setP(x, g.world.col.groundHeight(x, z, 0.2, from.y + 1.2), z);
  }
}
// derribado: cae hacia delante (por el recorrido) y se levanta
function* knockDown(D, ds = 2.2) {
  const g = D.g,
    F = D.film,
    p = g.player;
  const from = p.pos.clone();
  const to = RUN.at(RUN.project(from.x, from.z) + ds, {});
  F.pClip('fallBack', { blend: 0.04 });
  let t = 0;
  while (t < 0.4) {
    t += yield;
    const u = sm(t / 0.4);
    const x = lerp(from.x, to.x, u),
      z = lerp(from.z, to.z, u);
    F.setP(x, g.world.col.groundHeight(x, z, 0.2, from.y + 1), z);
  }
  yield* F.wait(0.3);
  F.pClip('getup', { blend: 0.05 });
  yield* F.wait(0.9);
}
// la raíz del gigante, hacia z en dur segundos (lo que le falte para llegar)
// (se suma a lo que avance el clip)
function approach(D, G, z, dur) {
  const dz = z - G.pos.z;
  D.film.also(
    (function* () {
      let t = 0,
        prev = 0;
      while (t < dur) {
        t += yield;
        const off = dz * sm(Math.min(1, t / dur));
        G.pos.z += off - prev;
        prev = off;
      }
    })()
  );
}

// 1. revienta la cabecera y entra; el fajón de encima cae: ¡Esquiva!
function* beatFaj(D, G) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  G.rootMotion = true;
  G.play('wadeR', { blend: 0.35 });
  G.onEventHook = (e) => {
    if (e !== 'crush') return;
    breakCabecera(D);
    breakArc(D, 0);
  };
  // la bóveda del tramo se raja: cae al llegar el pie
  while (G.actT < 1.12) {
    const dt = yield;
    runStep(D, dt);
  }
  breakSec(D, 1, { push: 1.5, shake: 0.9 });
  moonIn(D, 1);
  dropFaj(D, 0, { vz: 2 });
  dropCrown(D, 0, { vz: 1 });
  naveLight(g, 2);
  // el fajón de encima del jugador
  F.puppet(true);
  F.cinema(true, { skip: false });
  const P = p.pos.clone();
  let fi = -1,
    best = 99;
  NAVE.faj.forEach((z, i) => {
    // (de los tramos que se hunden: el del presbiterio y el siguiente)
    if (z > NAVE.secs[1][1] - 0.1 || !g.groups['naveFaj:' + i].on) return;
    const d = Math.abs(z - (P.z + 0.6));
    if (d < best) {
      best = d;
      fi = i;
    }
  });
  if (fi >= 0) dropFaj(D, fi, { vz: -0.3 });
  // (por delante del jugador, bajo, mirando atrás y arriba: el fajón le cae
  // encima)
  const fz = fi >= 0 ? NAVE.faj[fi] : P.z - 1;
  F.shot([P.x + 1.3, P.y + 0.7, P.z + 2.6], [P.x * 0.5, P.y + 6.5, fz - 1], { fov: 74 });
  a && a.play('stoneCreak', P, { k: 1.4 });
  const ok = yield* F.prompt({ action: 'dodge', label: '¡Esquiva!', window: 0.9, slow: 0.22 });
  if (ok) yield* rollOn(D, 4.4);
  else {
    yield* F.wait(0.25);
    F.hurt(22, null, { shake: 0.8, heavy: true });
    yield* knockDown(D, 2.0);
  }
  yield* resume(D);
}

// 2. otro paso; una corona de velas se descuelga delante: ¡Rueda!
function* beatCrown(D, G) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  G.play('wadeL', { blend: 0.35 });
  G.onEventHook = (e) => {
    if (e === 'crush') breakArc(D, 1);
  };
  const P = p.pos.clone();
  // (la corona más cercana por delante, de las que siguen colgadas)
  let ci = -1;
  NAVE.crowns.forEach((z, i) => {
    if (ci < 0 && z > P.z - 0.5 && g.groups['naveCrown:' + i].on) ci = i;
  });
  F.puppet(true);
  F.cinema(true, { skip: false });
  if (ci >= 0) {
    const cz = NAVE.crowns[ci];
    F.shot([P.x - 1.4, P.y + 1.5, P.z - 3.0], [P.x * 0.4, 3.6, cz], { fov: 70 });
    a && a.play('chainRun', { x: 0, y: 10, z: cz }, { k: 1.6 });
    yield* F.wait(0.12);
    dropCrown(D, ci, { vz: -1.4, vy: -2 });
    const ok = yield* F.prompt({ action: 'dodge', label: '¡Rueda!', window: 0.9, slow: 0.22 });
    if (ok) yield* rollOn(D, 4.6, 0.66);
    else {
      yield* F.wait(0.2);
      F.hurt(20, null, { shake: 0.7, heavy: true });
      a && a.play('burn', p.pos, { k: 0.8 });
      yield* knockDown(D, 1.8);
    }
  }
  yield* resume(D);
}

// 3. la mano entra por la bóveda y revienta los bancos: ¡Esquiva!
function* beatSmash(D, G) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  const P = p.pos.clone();
  // la muñeca, un poco antes del jugador (la palma y los dedos, encima de él)
  const target = new V3(clamp(P.x, -1.6, 1.6), NAVE.FY + 0.9, P.z - 0.8);
  // (el gigante se acerca lo que le falte; si está más cerca, encoge el brazo)
  const want = target.z - 12.6;
  if (want > G.pos.z) approach(D, G, Math.min(want, G.pos.z + 3.5), 0.7);
  G.rootMotion = true;
  G.play('smash', { blend: 0.3 });
  const pole = new V3(14, 6, G.pos.z);
  let hitDone = false;
  G.onEventHook = (e) => {
    if (e !== 'smash' || hitDone) return;
    hitDone = true;
    breakPews(D, 0, target);
    g.camRig.shake(1.1);
    g.input.rumble(1, 1, 500);
    a && a.play('slam', target, { k: 2 });
  };
  F.also(
    (function* () {
      while (G.actName === 'smash' && !G.actDone) {
        yield;
        const t = G.actT;
        const w = clamp((t - 0.6) / 0.35, 0, 1) * (1 - clamp((t - 1.9) / 0.5, 0, 1));
        if (w > 0) G.reachHand('L', target, pole, w, { stretch: 1.12 });
        else G.freeHand('L');
      }
      G.freeHand('L');
    })()
  );
  // la bóveda de encima se viene abajo con el brazo
  while (G.actT < 0.55) {
    const dt = yield;
    runStep(D, dt);
  }
  breakSec(D, 2, { push: 0.5 });
  moonIn(D, 2);
  for (let i = 0; i < NAVE.faj.length; i++) if (NAVE.faj[i] > NAVE.secs[2][0] + 0.1 && NAVE.faj[i] < NAVE.secs[2][1]) dropFaj(D, i);
  naveLight(g, 3);
  F.puppet(true);
  F.cinema(true, { skip: false });
  const Q = p.pos.clone();
  // (desde delante y abajo: la mano llega desde arriba, por detrás de él)
  F.shot([Q.x + 1.4, 1.5, Q.z + 4.8], [Q.x, 5.5, Q.z - 2], { fov: 70 });
  const ok = yield* F.prompt({ action: 'dodge', label: '¡Esquiva!', window: 0.8, slow: 0.2 });
  if (ok) yield* rollOn(D, 4.6, 0.66);
  else {
    while (!hitDone) yield;
    F.hurt(28, null, { shake: 1, heavy: true });
    yield* knockDown(D, 3.0);
  }
  yield* resume(D);
}

// 4. la segunda vez, te atrapa
function* beatCatch(D, G) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  while (!G.actDone) {
    const dt = yield;
    runStep(D, dt);
  }
  F.puppet(true);
  F.cinema(true);
  g.chaseRun = false;
  p.autoDir = null;
  const P = p.pos.clone();
  // la muñeca, justo antes del jugador; el gigante se lanza lo que haga falta
  const target = new V3(clamp(P.x, -1.4, 1.4) + 0.3, NAVE.FY + 1.3, P.z - 1.2);
  const want = target.z - 15.8;
  // (si se le ha escapado, salta: lo que haga falta)
  if (want > G.pos.z) approach(D, G, Math.min(want, G.pos.z + 14), 0.55);
  G.rootMotion = true;
  G.play('catch', { blend: 0.3 });
  breakSec(D, 3, { push: 0.4 });
  moonIn(D, 3);
  for (let i = 0; i < NAVE.faj.length; i++) if (NAVE.faj[i] >= NAVE.secs[3][0] - 0.1) dropFaj(D, i);
  for (let i = 0; i < NAVE.crowns.length; i++) dropCrown(D, i);
  const pole = new V3(16, 4, G.pos.z);
  F.also(
    (function* () {
      while (G.actName === 'catch' && G.actT < 1.6) {
        yield;
        const w = clamp((G.actT - 0.45) / 0.4, 0, 1);
        G.reachHand('L', target, pole, w, { stretch: 1.12 });
      }
    })()
  );
  // corre, se vuelve: la mano barre el suelo hacia él
  p.yaw = Math.PI;
  F.pClip('backstep', { blend: 0.1 });
  F.shot([P.x + 0.7, 3.0, Math.min(P.z + 5.2, -64)], [P.x, 2.2, P.z - 3], { fov: 66 });
  a && a.play('beastRoar', G.head(_v), { k: 1.4 });
  F.slow(0.45, 8);
  G.onEventHook = (e) => {
    if (e === 'stepR') breakArc(D, 2);
    if (e === 'catch') {
      breakPews(D, 1, target);
      a && a.play('slam', target, { k: 1.6 });
      g.camRig.shake(0.9);
    }
  };
  while (G.actT < 1.0) yield;
  F.slow(1, 6);
  G.speedK = 1;
  // (sigue en el acto 2: film_grab.js)
  D.caught = { target };
}
