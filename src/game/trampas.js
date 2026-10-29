// Las trampas del Físico, en el barrio de los Pellejeros.
//
//  - Los cepos, entre la paja (L.cepos; y los que pone él: aprende por dónde
//    andas). Si se mira bien, se ve el brillo de los dientes. Si se pisa,
//    salta: muerde y te coge el pie, y hay que forcejear para abrirlo; el
//    golpe se oye en todo el barrio (y viene: game/fisico.js, alarma). Un
//    tajo lo hace saltar sin nadie dentro (y también se oye).
//  - Las cuerdas con campanillas (L.bells), tendidas a la altura de la
//    espinilla: si se pasa, suenan (y viene). Un tajo las corta: caen las
//    campanillas al suelo, y apenas suenan.
//  - Lo que aprende: cuenta las veces que pasas por las puertas de las casas
//    y, cazando, mientras anda fuera, pone un cepo donde más has pasado
//    (donde no lo veas poner).
// Al morir, todo vuelve a estar como al principio: lo arma él de nuevo.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { objMat, cloneMat } from '../gfx/materials.js';
import { MSG } from './story.js';
import { CASAS } from './fisico.js';
import { RNG, angleDiff, DEG } from '../core/util.js';

// las quijadas (radio), dónde salta (lo cerca del centro que hay que pisar)
const R = 0.17;
const PISA = 0.3;
// lo cerradas: del todo (sin nadie dentro), con el tobillo dentro, y
// abiertas a mano (tras soltarse)
const CERRADO = Math.PI / 2;
const TOBILLO = Math.PI / 2 - 0.3;
const A_MANO = Math.PI / 2 - 0.8;
// el forcejeo: pulsaciones, en cuánto tiempo, lo que muerde al saltar y lo
// que aprieta si no se abre a tiempo
const MASH = 10;
const VENTANA = 4.5;
const MUERDE = 12;
const APRIETA = 5;
// la cuerda: a qué distancia de ella se tropieza
const ROZA = 0.24;
// lo que aprende: cuántos cepos pone como mucho, cada cuánto, a qué
// distancia de ti
const MAX_SUYOS = 3;
const PON_CADA = 40;
const PON_LEJOS = 12;

const M4 = () => new THREE.Matrix4();
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Qy = (a) => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a);
const at = (geo, x, y, z, q = null, s = null) => geo.applyMatrix4(M4().compose(V(x, y, z), q || new THREE.Quaternion(), s || V(1, 1, 1)));

// ------------------------------------------------------------ las mallas
// El cepo: el travesaño, los dos muelles de hoja, el plato del gatillo, la
// cadena con su estaca y las dos quijadas dentadas (cada una, un grupo que
// gira sobre el eje x: 0, abierta y plana; ±90°, cerrada).
function cepoMesh(iron, teeth) {
  const root = new THREE.Group();
  const base = [];
  base.push(at(new THREE.BoxGeometry(0.84, 0.012, 0.03), 0, 0.006, 0));
  for (const s of [-1, 1]) {
    // el muelle: dos hojas abiertas en V y el ojo que abraza la quijada
    const q1 = new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), s * 0.05);
    const q2 = new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), -s * 0.09);
    base.push(at(new THREE.BoxGeometry(0.27, 0.008, 0.026), s * 0.34, 0.016, 0, q1));
    base.push(at(new THREE.BoxGeometry(0.27, 0.008, 0.026), s * 0.34, 0.034, 0, q2));
    base.push(at(new THREE.TorusGeometry(0.03, 0.006, 4, 8), s * R, 0.03, 0, new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI / 2)));
  }
  base.push(at(new THREE.CylinderGeometry(0.065, 0.065, 0.008, 9), 0, 0.022, 0));
  base.push(at(new THREE.BoxGeometry(0.13, 0.006, 0.014), -0.07, 0.028, 0.02, Qy(0.3)));
  // la cadena y la estaca
  for (let i = 0; i < 6; i++) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(i % 2 ? Math.PI / 2 : 0, 0.35, 0));
    base.push(at(new THREE.TorusGeometry(0.022, 0.005, 4, 6), 0.45 + i * 0.045, 0.012, 0.02 + i * 0.016, q));
  }
  base.push(at(new THREE.BoxGeometry(0.03, 0.12, 0.03), 0.74, 0.03, 0.115));
  base.push(at(new THREE.TorusGeometry(0.025, 0.006, 4, 8), 0.72, 0.07, 0.11, Qy(0.4)));
  root.add(new THREE.Mesh(mergeGeometries(base), iron));
  const jaws = [];
  for (const s of [1, -1]) {
    const jaw = new THREE.Group();
    jaw.position.y = 0.03;
    const arc = [],
      tt = [];
    const N = 8;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI,
        a1 = ((i + 1) / N) * Math.PI,
        am = (a0 + a1) / 2;
      const len = 2 * R * Math.sin((a1 - a0) / 2) + 0.006;
      arc.push(at(new THREE.BoxGeometry(len, 0.014, 0.016), Math.cos(am) * R, 0, s * Math.sin(am) * R, Qy(Math.atan2(-s * Math.cos(am), -Math.sin(am)))));
      // los dientes, de cara arriba (cerrada, los unos contra los otros)
      if (i > 0) tt.push(at(new THREE.ConeGeometry(0.011, 0.046, 4), Math.cos(a0) * R, 0.028, s * Math.sin(a0) * R * 0.97));
    }
    jaw.add(new THREE.Mesh(mergeGeometries(arc), iron), new THREE.Mesh(mergeGeometries(tt), teeth));
    jaw.userData.s = s;
    root.add(jaw);
    jaws.push(jaw);
  }
  return { root, jaws };
}

// La paja que lo tapa: un manto ralo, irregular, y briznas sueltas por
// encima (algunas, sobre las quijadas: lo que asoma son los dientes).
function pajaMesh(mat, seed, r = 0.55) {
  const rng = new RNG(seed);
  const parts = [];
  const disc = new THREE.CircleGeometry(r, 16);
  const pos = disc.attributes.position;
  for (let i = 1; i < pos.count; i++) {
    const k = 0.62 + rng.next() * 0.5;
    pos.setXY(i, pos.getX(i) * k, pos.getY(i) * k);
  }
  parts.push(at(disc, 0, 0.012, 0, new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -Math.PI / 2)));
  for (let i = 0; i < 120; i++) {
    const a = rng.next() * Math.PI * 2;
    const d = Math.sqrt(rng.next()) * r * 1.1;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((rng.next() - 0.5) * 0.3, rng.next() * Math.PI, (rng.next() - 0.5) * 0.3));
    parts.push(at(new THREE.BoxGeometry(0.06 + rng.next() * 0.1, 0.003, 0.007), Math.cos(a) * d, 0.016 + rng.next() * 0.035, Math.sin(a) * d, q));
  }
  return new THREE.Mesh(mergeGeometries(parts), mat);
}

// Las briznas que tapan las quijadas (saltan por el aire al cerrarse).
function cubiertaMesh(mat, seed) {
  const rng = new RNG(seed);
  const parts = [];
  for (let i = 0; i < 70; i++) {
    const a = rng.next() * Math.PI * 2;
    const d = R * (0.55 + rng.next() * 0.7);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((rng.next() - 0.5) * 0.2, a + Math.PI / 2 + (rng.next() - 0.5) * 1.2, (rng.next() - 0.5) * 0.2));
    parts.push(at(new THREE.BoxGeometry(0.07 + rng.next() * 0.09, 0.003, 0.007), Math.cos(a) * d, 0.05 + rng.next() * 0.022, Math.sin(a) * d, q));
  }
  return new THREE.Mesh(mergeGeometries(parts), mat);
}

// La cuerda de las campanillas, de a a b a la altura h: la cuerda, con su
// comba, y las campanillas colgando (cada una, un grupo que se mece sobre la
// cuerda).
function cuerdaMesh(rope, bronze, a, b, y) {
  const root = new THREE.Group();
  const dx = b[0] - a[0],
    dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const sag = 0.035;
  const mid = V((a[0] + b[0]) / 2, y - sag, (a[1] + b[1]) / 2);
  const parts = [];
  for (const [p, q] of [
    [V(a[0], y, a[1]), mid],
    [mid, V(b[0], y, b[1])],
  ]) {
    const d = new THREE.Vector3().subVectors(q, p);
    const o = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
    parts.push(at(new THREE.CylinderGeometry(0.009, 0.009, d.length(), 5), (p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2, o));
  }
  root.add(new THREE.Mesh(mergeGeometries(parts), rope));
  const axis = V(dx / len, 0, dz / len);
  const bells = [];
  const n = Math.max(2, Math.round(len / 0.4));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const g = new THREE.Group();
    g.position.set(a[0] + dx * t, y - sag * Math.sin(t * Math.PI), a[1] + dz * t);
    const bp = [at(new THREE.BoxGeometry(0.006, 0.06, 0.006), 0, -0.03, 0), at(new THREE.CylinderGeometry(0.014, 0.036, 0.05, 7), 0, -0.083, 0), at(new THREE.SphereGeometry(0.011, 5, 3), 0, -0.112, 0)];
    g.add(new THREE.Mesh(mergeGeometries(bp), bronze));
    g.userData.ph = i * 1.7;
    root.add(g);
    bells.push(g);
  }
  return { root, bells, axis, len };
}

// ------------------------------------------------------------ las trampas
export class Trampas {
  constructor(g) {
    this.g = g;
    const L = g.level.L;
    this.defs = { cepos: L.cepos || [], bells: L.bells || [] };
    this.cepos = [];
    this.cuerdas = [];
    this.held = null;
    this.built = false;
    // las puertas por las que se pasa (dónde aprende): delante y detrás de
    // la puerta de cada casa
    this.pasos = [];
    for (const c of CASAS) for (const [x, z] of [c.fuera, c.dentro]) this.pasos.push({ x, y: 0, z, n: 0, in: false });
    this.ponT = PON_CADA;
    this.reT = 0;
  }

  // (las mallas, la primera vez: hace falta la luz del sitio, las sondas)
  build() {
    if (this.built || !this.g.probe) return;
    this.built = true;
    this.defs.cepos.forEach((d, i) => this.pon(d.x, d.y ?? 0, d.z, false, d.rot ?? i * 1.3, d.id || 'c' + i));
    for (const d of this.defs.bells) this.tiende(d);
  }

  // Material de objeto con la luz horneada del sitio.
  mat(name, x, y, z, opts) {
    const g = this.g;
    const m = cloneMat(objMat(name, opts));
    const zn = g.zoneAt({ x, y, z });
    const pr = g.probe.sample(x, y + 1, z, zn && zn.room ? g.level.ctx.wb.roomId(zn.room) : 0);
    if (m._u) {
      m._u.uProbe.value.set(pr[0], pr[1], pr[2]);
      m._u.uGround.value.set(y, 0.3);
    }
    return m;
  }

  // Un cepo armado en (x, y, z), entre su paja (learned: lo ha puesto él).
  pon(x, y, z, learned, rot = Math.random() * Math.PI, id = null) {
    const g = this.g;
    const iron = this.mat('iron', x, y, z);
    // (los dientes, aparte: su destello; va en el color del emisivo, que
    // el parche de los materiales no atiende a la intensidad)
    const teeth = this.mat('iron', x, y, z);
    teeth.emissive = new THREE.Color(0);
    const { root, jaws } = cepoMesh(iron, teeth);
    const straw = this.mat('straw', x, y, z, { tint: 0xa0906a });
    root.add(pajaMesh(straw, Math.round(x * 31 + z * 17)));
    // (y por encima de las quijadas, la que salta al cerrarse: asoman los
    // dientes)
    const cubierta = cubiertaMesh(straw, Math.round(x * 13 + z * 7));
    root.add(cubierta);
    // (sobre la tierra de la plazuela, que va un dedo por encima del suelo)
    root.position.set(x, y + 0.012, z);
    root.rotation.y = rot;
    g.scene.add(root);
    const c = { id: id || 'suyo' + this.cepos.length, x, y, z, learned, armed: true, k: 0, target: 0, root, jaws, teeth, cubierta, ph: Math.random() * 6 };
    this.cepos.push(c);
    return c;
  }

  // Una cuerda con campanillas (d: de L.bells).
  tiende(d) {
    const g = this.g;
    const h = d.h ?? 0.35;
    const mx = (d.a[0] + d.b[0]) / 2,
      mz = (d.a[1] + d.b[1]) / 2;
    const m = cuerdaMesh(this.mat('burlap', mx, d.y, mz, { tint: 0xb3a080 }), this.mat('bronze', mx, d.y, mz), d.a, d.b, d.y + h);
    g.scene.add(m.root);
    this.cuerdas.push({ ...d, h, ...m, cut: false, fall: 0, swing: 0, touching: false });
  }

  // ------------------------------------------------------------ al morir
  reset() {
    const g = this.g;
    if (this.held) this.suelta(this.held, false);
    for (const c of this.cepos) {
      if (c.learned) g.scene.remove(c.root);
      else {
        c.armed = true;
        c.k = c.target = 0;
        c.cubierta.visible = true;
        this.pose(c);
      }
    }
    this.cepos = this.cepos.filter((c) => !c.learned);
    for (const r of this.cuerdas) {
      r.cut = false;
      r.fall = 0;
      r.swing = 0;
      r.root.position.y = 0;
      for (const b of r.bells) b.rotation.set(0, 0, 0);
    }
    for (const s of this.pasos) {
      s.n = 0;
      s.in = false;
    }
    this.ponT = PON_CADA;
  }

  // ------------------------------------------------------------ el cepo
  pose(c) {
    for (const j of c.jaws) j.rotation.x = -j.userData.s * c.k;
  }
  // Salta sobre el jugador: muerde y le coge el pie.
  // (al cerrarse, la paja de encima salta por el aire)
  desnuda(c) {
    c.cubierta.visible = false;
    this.g.fx.blood.emit(c.x, c.y + 0.08, c.z, 26, { color: [0.62, 0.52, 0.3], speed: 2.2, life: 1.1, up: 2.2, gravity: 4 });
  }
  muerde(c) {
    const g = this.g;
    const p = g.player;
    c.armed = false;
    this.desnuda(c);
    c.target = TOBILLO;
    this.held = c;
    p.pos.x = c.x;
    p.pos.z = c.z;
    p.startGrabbed();
    g.audio && g.audio.play('cepo', c);
    g.fx.blood.emit(c.x, c.y + 0.18, c.z, 18, { color: [0.42, 0.03, 0.03], speed: 2.4, life: 0.7, up: 1.6, stain: true });
    g.camRig.shake(0.4);
    g.hitstop = Math.max(g.hitstop || 0, 0.08);
    p.receiveBite(MUERDE);
    this.avisa(c);
    if (p.dead) return;
    if (!g.hintsShown.cepo) {
      g.hintsShown.cepo = true;
      g.say(MSG.cepoPista);
    }
    this.forcejeo(c);
  }
  forcejeo(c) {
    const g = this.g;
    g.qte &&
      g.qte.start({
        action: 'light',
        label: MSG.cepoForcejea,
        mash: MASH,
        window: VENTANA,
        slow: 1,
        lenient: true,
        onDone: (ok) => {
          if (this.held !== c) return;
          if (ok) return this.suelta(c, true);
          // no se abre: aprieta más (y otra vez, en un momento: update)
          g.player.receiveBite(APRIETA);
          g.audio && g.audio.play('chestBar', c);
          this.reT = 0.45;
        },
      });
  }
  // Se abre el cepo (escaped: el jugador lo ha abierto a fuerza; si no, lo
  // abre otro: él, para llevárselo, o porque ha muerto).
  suelta(c, escaped) {
    const g = this.g;
    const p = g.player;
    if (this.held !== c) return;
    this.held = null;
    c.target = A_MANO;
    if (g.qte && g.qte.active) g.qte.cancel();
    g.audio && g.audio.play('leverCreak', c);
    if (escaped && p.state === 'grabbed') p.releaseGrab(0.9, -Math.sin(p.yaw), -Math.cos(p.yaw), 0);
  }
  // Lo abre él (va a ponerte la esponja).
  abre() {
    if (this.held) this.suelta(this.held, false);
  }
  // Salta sin nadie dentro (un tajo).
  salta(c) {
    const g = this.g;
    c.armed = false;
    this.desnuda(c);
    c.target = CERRADO;
    g.audio && g.audio.play('cepo', c);
    g.fx.blood.emit(c.x, c.y + 0.12, c.z, 10, { color: [1, 0.85, 0.5], speed: 3, life: 0.35, up: 1.5 });
    this.avisa(c);
  }
  // Lo oye todo el barrio.
  avisa(c) {
    const g = this.g;
    g.fisico && g.fisico.alarma(c.x, c.y, c.z, 'cepo');
    g.noise(c.x, c.y, c.z, 14);
  }

  // ------------------------------------------------------------ la cuerda
  suena(r, k = 1) {
    const g = this.g;
    r.swing = Math.max(r.swing, k);
    const mx = (r.a[0] + r.b[0]) / 2,
      mz = (r.a[1] + r.b[1]) / 2;
    g.audio && g.audio.play('campanillas', { x: mx, y: r.y + r.h, z: mz }, { k });
    if (k < 0.5) return;
    g.fisico && g.fisico.alarma(mx, r.y, mz, 'campanillas');
    g.noise(mx, r.y, mz, 12);
    g.flags['campanillas:' + r.id] = true;
  }
  corta(r) {
    r.cut = true;
    r.fall = 0.001;
    this.suena(r, 0.3);
  }
  // distancia (en planta) de (x, z) a la cuerda, y el punto más cercano
  cerca(r, x, z) {
    const ax = r.a[0],
      az = r.a[1];
    const dx = r.b[0] - ax,
      dz = r.b[1] - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const px = ax + dx * t,
      pz = az + dz * t;
    return { d: Math.hypot(x - px, z - pz), x: px, z: pz };
  }

  // ------------------------------------------------------------ los golpes
  // Un tajo cerca de un cepo armado lo hace saltar; uno a una cuerda, la
  // corta.
  playerSwing(player, atk) {
    const reach = (x, z, y, extra = 0) => {
      const dx = x - player.pos.x,
        dz = z - player.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > atk.range * 0.9 + extra || Math.abs(y - player.pos.y) > 0.9) return false;
      return d < 0.7 || Math.abs(angleDiff(player.yaw, Math.atan2(dx, dz))) < atk.arc * 0.5 * DEG;
    };
    for (const c of this.cepos) if (c.armed && !player.hitSet.has(c) && reach(c.x, c.z, c.y, 0.2)) {
      player.hitSet.add(c);
      this.salta(c);
    }
    for (const r of this.cuerdas) {
      if (r.cut || player.hitSet.has(r)) continue;
      const q = this.cerca(r, player.pos.x, player.pos.z);
      if (!reach(q.x, q.z, r.y)) continue;
      player.hitSet.add(r);
      this.corta(r);
    }
  }

  // ------------------------------------------------------------ lo que aprende
  aprende(dt) {
    const g = this.g;
    const p = g.player.pos;
    const F = g.fisico;
    for (const s of this.pasos) {
      const near = Math.hypot(p.x - s.x, p.z - s.z) < 1.0 && Math.abs(p.y - s.y) < 0.6;
      if (near && !s.in) s.n++;
      s.in = near;
    }
    this.ponT -= dt;
    if (!g.flags['fisico:caza'] || !F || F.modo !== 'fuera' || this.ponT > 0) return;
    if (this.cepos.filter((c) => c.learned).length >= MAX_SUYOS) return;
    let best = null;
    for (const s of this.pasos) {
      if (s.n < 2 || (best && s.n <= best.n)) continue;
      if (this.cepos.some((c) => Math.hypot(c.x - s.x, c.z - s.z) < 2.5)) continue;
      if (Math.hypot(p.x - s.x, p.z - s.z) < PON_LEJOS || F.visto(s.x, s.y, s.z)) continue;
      best = s;
    }
    if (!best) return;
    // (un poco a un lado: donde se pisa al pasar, no en el mismo umbral)
    this.pon(best.x + (Math.random() - 0.5) * 0.4, best.y, best.z + (Math.random() - 0.5) * 0.4, true);
    best.n = 0;
    this.ponT = PON_CADA;
  }

  // ------------------------------------------------------------ cada fotograma
  update(dt) {
    const g = this.g;
    this.build();
    if (!this.built) return;
    const p = g.player;
    const free = !p.dead && !g.cutscene && !(g.dev && g.dev.fly) && p.state !== 'grabbed' && p.state !== 'pinned' && p.state !== 'cine';
    // ---- los cepos
    for (const c of this.cepos) {
      if (c.armed && free && Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < PISA && Math.abs(p.pos.y - c.y) < 0.35) this.muerde(c);
      // las quijadas: de golpe al cerrarse, despacio al abrirlas a mano
      if (c.k !== c.target) {
        const v = c.target > c.k ? 40 : 2.5;
        c.k = c.target > c.k ? Math.min(c.target, c.k + v * dt) : Math.max(c.target, c.k - v * dt);
        this.pose(c);
      }
      // el brillo de los dientes: de vez en cuando, si se mira de cerca
      const d = Math.hypot(p.pos.x - c.x, p.pos.z - c.z);
      const gl = c.armed && d < 9 ? Math.pow(Math.max(0, Math.sin(g.time * 1.3 + c.ph)), 24) * (1 - d / 9) : 0;
      c.teeth.emissive.setRGB(gl, gl * 0.94, gl * 0.8);
    }
    // cogido: si muere, o se lo lleva otro (la esponja), se abre; si no lo
    // ha abierto a tiempo, vuelta a forcejear
    if (this.held && (p.dead || p.state !== 'grabbed')) this.suelta(this.held, false);
    else if (this.held && !(g.qte && g.qte.active) && (this.reT -= dt) <= 0) this.forcejeo(this.held);
    // ---- las cuerdas
    for (const r of this.cuerdas) {
      if (!r.cut) {
        const q = this.cerca(r, p.pos.x, p.pos.z);
        const touching = free && q.d < ROZA && Math.abs(p.pos.y - r.y) < 0.6;
        if (touching && !r.touching) this.suena(r, 1);
        r.touching = touching;
      } else if (r.fall > 0 && r.fall < 1) {
        // cortada: cae al suelo
        r.fall = Math.min(1, r.fall + dt * 3.5);
        r.root.position.y = -(r.h - 0.02) * r.fall * r.fall;
      }
      if (r.swing > 0.001) {
        r.swing *= Math.exp(-dt * 1.6);
        for (const b of r.bells) {
          const a = r.cut ? Math.min(1, r.fall) * 1.45 : Math.sin(g.time * 9 + b.userData.ph) * 0.9 * r.swing;
          b.quaternion.setFromAxisAngle(r.axis, a);
        }
      } else if (r.cut && r.fall >= 1) for (const b of r.bells) b.quaternion.setFromAxisAngle(r.axis, 1.45);
    }
    this.aprende(dt);
  }
}

