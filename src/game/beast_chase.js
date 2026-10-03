// La Bestia de Carne: la transformación del Empalado y la persecución por la
// muralla norte hasta el salto de fe.
//
// Con un cuarto de vida, el Empalado cae de rodillas, se le revienta lo que
// le queda de armadura, se hincha y estalla en sangre: lo que se levanta es
// la Bestia. Ruge, se arranca la pica de la espalda y te la tira (¡Esquiva!),
// y embiste: si la esquivas se estrella contra la barricada del norte, la
// revienta y se queda un instante con los cuernos clavados en la piedra.
// Por el hueco empieza la huida, por el adarve del muro este, la esquina y
// la muralla norte, con la Bestia pisándote los talones (si te alcanza, te
// golpea). Por el camino, pulsaciones rápidas: te tira un sillar, una viga
// ardiendo cierra la torre, salta sobre ti en la esquina, el adarve se ha
// hundido (¡Salta!; si te quedas corto, cuelgas del borde y hay que trepar),
// y después te corta el paso de un salto y llegan los «reflejos»: zarpazo,
// cornada, zarpa, mazazo. Al final, la Torre del Fanal: arriba no hay
// salida, sólo el salto de fe a la paja de la atalaya. La Bestia se queda
// mirando desde lo alto, ruge y se va.
//
// Cada tramo es una corrutina (generador): cada `yield` espera un fotograma
// y devuelve su dt (ya a cámara lenta si hay un aviso en pantalla). Si mueres
// se vuelve a empezar desde el último punto de control de la persecución.
import * as THREE from 'three';
import { Beast } from '../entities/beast.js';
import { shedArmor, updateDebris, IMP_CLIPS } from '../entities/impaled.js';
import { CHASE } from '../world/level_walls.js';
import { KEEP } from '../world/level_keep.js';
import { objMat } from '../gfx/materials.js';
import { AREA_NAMES } from './story.js';
import { clamp, damp, dampAngle, angleDiff, lerp } from '../core/util.js';

const V3 = THREE.Vector3;
const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const PI = Math.PI;

// ------------------------------------------------------------ el recorrido
class Path {
  constructor(pts) {
    this.p = pts.map(([x, y, z]) => new V3(x, y, z));
    this.L = [0];
    for (let i = 1; i < this.p.length; i++) this.L.push(this.L[i - 1] + Math.hypot(this.p[i].x - this.p[i - 1].x, this.p[i].z - this.p[i - 1].z));
    this.len = this.L[this.L.length - 1];
  }
  at(s, out = {}) {
    s = clamp(s, 0, this.len);
    let i = 1;
    while (i < this.L.length - 1 && this.L[i] < s) i++;
    const a = this.p[i - 1],
      b = this.p[i];
    const segL = this.L[i] - this.L[i - 1] || 1;
    const u = (s - this.L[i - 1]) / segL;
    out.x = a.x + (b.x - a.x) * u;
    out.y = a.y + (b.y - a.y) * u;
    out.z = a.z + (b.z - a.z) * u;
    out.tx = (b.x - a.x) / segL;
    out.tz = (b.z - a.z) / segL;
    return out;
  }
  project(x, z) {
    let best = 0,
      bd = Infinity;
    for (let i = 1; i < this.p.length; i++) {
      const a = this.p[i - 1],
        b = this.p[i];
      const dx = b.x - a.x,
        dz = b.z - a.z;
      const l2 = dx * dx + dz * dz || 1;
      const u = clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1);
      const d = Math.hypot(x - (a.x + dx * u), z - (a.z + dz * u));
      if (d < bd) {
        bd = d;
        best = this.L[i - 1] + u * Math.sqrt(l2);
      }
    }
    return best;
  }
}

// Lugares de la escena del Postigo.
const ARENA = {
  // donde cae de rodillas el Empalado y se levanta la Bestia
  E: [74, 9, -59.2],
  // el jugador, delante de la barricada
  P: [74.0, 9, -65.2],
  // a dónde salta al esquivar la pica (al oeste) y la embestida (al este)
  dodgePike: [71.8, 9, -66.1],
  dodgeCharge: [75.9, 9, -66.0],
  // donde se queda clavada la Bestia (los cuernos en la piedra)
  stuck: [72.7, 9, -68.3],
  // por donde se escapa el jugador, por el lado del hueco
  run: [
    [75.2, 9, -68.4],
    [74.9, 9, -73.6],
  ],
};

// Puntos de control: dónde vuelve a empezar si mueres.
const CP = {
  start: { s: 9.6, beast: 'stuck' },
  gap: { s: 98.5, beast: 'gap' },
  reflex: { s: 120.5, beast: 'behind' },
  top: { s: 193.3, beast: 'top' },
};

export class BeastChase {
  constructor(game) {
    this.g = game;
    this.path = new Path(CHASE.path);
    this.beast = new Beast(game);
    this.beast.onEvent = (n) => this.onBeastEvent(n);
    this.beast.onStep = (side, w) => this.onBeastStep(side, w);
    this.active = false;
    this.lock = false;
    this.co = null;
    this.bg = [];
    this.follow = false;
    this.cam = null;
    this.cp = 'start';
    this.sB = 0;
    this.sP = 0;
    this.vP = 0;
    this.bars = 0;
    this.glanced = new Set();
    this.glance = null;
    this._pt = {};
    this._a = new V3();
    this._b = new V3();
    this.buildProps();
  }

  // ------------------------------------------------------------ atrezo propio
  // La pica (la tira), el sillar (lo tira) y la viga que arde en la torre.
  buildProps() {
    const g = this.g;
    const wood = objMat('wooddark'),
      iron = objMat('iron'),
      stone = objMat('wallstone'),
      fire = objMat('ember');
    // la pica: el asta partida con la moharra (eje +z)
    const pike = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.2, 7).rotateX(PI / 2), wood);
    shaft.position.z = -0.4;
    pike.add(shaft);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.55, 6).rotateX(PI / 2), iron);
    head.position.z = 1.45;
    pike.add(head);
    pike.visible = false;
    g.scene.add(pike);
    this.pike = pike;
    // el sillar
    const rock = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, 0.6), stone);
    rock.visible = false;
    g.scene.add(rock);
    this.rock = rock;
    // la viga ardiendo, de través en la torre del muro este
    const T = CHASE.towerE;
    const beam = new THREE.Group();
    const b0 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 3.7), wood);
    b0.rotation.set(0, PI / 2, 0.26);
    beam.add(b0);
    const embers = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 1.4), fire);
    embers.position.set(0.7, 0.19, 0);
    embers.rotation.set(0, 0, 0.26);
    beam.add(embers);
    beam.position.set(T.x, CHASE.YE + 1.1, T.z + 0.4);
    g.scene.add(beam);
    this.beam = beam;
    this.beamBox = g.world.col.add(T.x - 1.6, CHASE.YE, T.z + 0.2, T.x + 1.6, CHASE.YE + 1.6, T.z + 0.6);
    this.beamBox.cam = false;
    for (const o of [pike, rock, beam]) o.traverse((m) => m.isMesh && (m.frustumCulled = false));
  }

  restoreBeam() {
    this.beam.visible = true;
    this.beamBox.enabled = true;
    this.beamBroken = false;
  }
  breakBeam() {
    if (this.beamBroken) return;
    const g = this.g;
    this.beamBroken = true;
    this.beam.visible = false;
    this.beamBox.enabled = false;
    const p = this.beam.position;
    g.fx.blood.emit(p.x, p.y, p.z, 40, { color: [0.14, 0.085, 0.05], speed: 5, life: 0.9, up: 2 });
    g.fx.blood.emit(p.x, p.y, p.z, 24, { color: [1, 0.55, 0.15], speed: 4, life: 0.6, up: 2.5 });
    g.audio && g.audio.play('woodBreak', p);
    g.camRig.shake(0.35);
  }

  // ------------------------------------------------------------ corrutinas
  *wait(t) {
    while (t > 0) t -= yield;
  }
  *waitClip(t) {
    // hasta que el clip de la Bestia llegue a t (o acabe)
    const b = this.beast;
    while (b.anim.clip && !b.anim.done && b.anim.t < t) yield;
  }
  *prompt(o) {
    let res = null;
    this.g.qte.start({ ...o, onDone: (ok) => (res = ok) });
    while (res === null) yield;
    return res;
  }
  run(gen) {
    this.co = gen;
    this.bg = [];
  }
  // otra corrutina a la vez (p. ej. el jugador rueda mientras la Bestia salta)
  also(gen) {
    this.bg.push(gen);
  }
  *waitBg() {
    while (this.bg.length) yield;
  }

  // ------------------------------------------------------------ cámara
  shot(pos, look, o = {}) {
    this.cam = { pos: pos.clone ? pos.clone() : new V3(...pos), look: look.clone ? look.clone() : new V3(...look), speed: o.speed ?? 6, snap: !!o.snap, fov: o.fov ?? 55 };
  }
  // Por delante del jugador, mirando hacia atrás: se ve a la Bestia que viene
  // (el sillar que te tira, el salto sobre ti en la esquina). El control sigue
  // relativo a la cámara de siempre (su rumbo no cambia).
  lookBack(speed = 9) {
    const p = this.g.player,
      b = this.beast;
    const q = {};
    let first = true;
    this.camFn = () => {
      this.path.at(this.path.project(p.pos.x, p.pos.z) + 4.6, q);
      const pos = new V3(q.x - q.tz * 1.1, p.pos.y + 2.3, q.z + q.tx * 1.1);
      const look = b.pos.clone().lerp(p.pos, 0.42);
      look.y = p.pos.y + 1.7 + b.lift * 0.6;
      this.cam = { pos, look, speed, fov: 64, snap: first };
      first = false;
    };
  }

  releaseCam(yaw = null) {
    const g = this.g;
    this.cam = null;
    this.camFn = null;
    g.camRig.override = null;
    g.camRig.snapTo(g.player);
    if (yaw !== null) g.camRig.yaw = yaw;
    g.camRig.pitch = 0.22;
    g.camRig.cam.fov = g.camRig.fovBase;
    g.camRig.cam.updateProjectionMatrix();
  }

  // ------------------------------------------------------------ el jugador
  // Lo mueve el guion (sin física): pos, rumbo y clip.
  puppet(on) {
    const p = this.g.player;
    p.puppet = on;
    if (on) {
      p.state = 'cine';
      p.vx = p.vz = 0;
      p.body.vy = 0;
      p.blocking = false;
      p.charging = false;
      p.anim.speed = 1;
      p.flask.visible = false;
    } else {
      p.puppet = false;
      if (!p.dead) {
        p.state = 'free';
        p.body.grounded = true;
      }
    }
  }
  setP(x, y, z, yaw = null) {
    const p = this.g.player;
    p.body.pos.set(x, y, z);
    p.visY = y;
    if (yaw !== null) p.yaw = yaw;
  }
  pClip(name, o = {}) {
    const p = this.g.player;
    const c = p.clips[name];
    if (c) p.anim.play(c, { blend: o.blend ?? 0.08, speed: o.speed ?? 1 });
  }
  // Un golpe que no se para: daño, sangre, temblor; con 'down', al suelo.
  hurtPlayer(dmg, fromX, fromZ, o = {}) {
    const g = this.g,
      p = g.player;
    if (p.dead) return;
    if (g.dev && g.dev.god) dmg = 0;
    p.hp -= dmg;
    p.lastHitT = g.time;
    p.flinchX.kick(-9);
    g.hurtFlash = 1;
    g.camRig.shake(o.shake ?? 0.6);
    g.input.rumble(1, 0.8, 260);
    g.fx.blood.emit(p.pos.x, p.pos.y + 1.2, p.pos.z, 34, { speed: 5, up: 1.5 });
    g.audio && g.audio.play('playerHurt', p.pos);
    g.audio && g.audio.play('hitHeavy', p.pos);
    if (p.hp <= 0) {
      p.hp = 0;
      p.puppet = false;
      p.die();
    }
  }

  // ------------------------------------------------------------ inicio
  // Lo llama el Empalado al quedarse con un cuarto de vida.
  transform(e) {
    const g = this.g;
    this.e = e;
    this.active = true;
    this.cp = 'start';
    this.beastOverGap = false;
    this.beatsDone = new Set();
    this.glanced = new Set();
    this.restoreBeam();
    g.flags['impaled:beast'] = true;
    this.run(this.coTransform(e));
  }

  // Al volver a cruzar la niebla del Postigo (tras salir al título a mitad
  // de la huida): directamente al principio de la persecución.
  resume() {
    const g = this.g;
    this.e = g.bosses.impaled;
    this.active = true;
    this.cp = 'start';
    g.fadeTarget = 0;
    this.run(this.coRetry(true));
  }

  // Tras morir en la persecución: desde el último punto de control.
  retry() {
    this.run(this.coRetry(false));
  }

  // Fuera (salir al título).
  reset() {
    const g = this.g;
    g.camRig.dist = 4.1;
    this.active = false;
    this.co = null;
    this.follow = false;
    this.lock = false;
    this.cam = null;
    this.camFn = null;
    g.chaseRun = false;
    g.qte.cancel();
    this.beast.hide();
    this.beast.stopClip(0);
    this.fadeK = 1;
    this.beast.setFade(1);
    this.pike.visible = false;
    this.rock.visible = false;
    this.restoreBeam();
    this.setBars(0);
    if (g.player.puppet) g.player.puppet = false;
  }

  setBars(k) {
    this.bars = k;
    const U = this.g.post.U;
    U.uBars.value = 0.115 * k;
    U.uVignette.value = 1.25 + 0.9 * k;
  }

  // ------------------------------------------------------------ actualización
  update(dt) {
    if (!this.active) return;
    const g = this.g,
      p = g.player;
    const b = this.beast;
    if (this.e) updateDebris(this.e, dt);
    // muerto: se para todo (vuelve a empezar al reaparecer)
    if (p.dead) {
      if (!this.deadSeen) {
        this.deadSeen = true;
        this.co = null;
        this.bg = [];
        this.camFn = null;
        g.qte.cancel();
        this.follow = false;
        this.lock = false;
        g.chaseRun = false;
        b.vx = b.vz = 0;
        b.lift = 0;
        b.play('roar', { blend: 0.3 });
      }
      b.update(dt);
      this.tick(dt);
      return;
    }
    this.deadSeen = false;
    // progreso del jugador por el recorrido
    const sp = this.path.project(p.pos.x, p.pos.z);
    this.vP = damp(this.vP, (sp - this.sP) / Math.max(dt, 1e-4), 4, dt);
    this.sP = sp;
    if (this.co) {
      const r = this.co.next(dt);
      if (r.done) this.co = null;
    }
    for (let i = this.bg.length - 1; i >= 0; i--) if (this.bg[i].next(dt).done) this.bg.splice(i, 1);
    if (this.follow) this.chaseStep(dt);
    b.update(dt);
    // (el Empalado, mientras se transforma, lo anima el guion)
    if (this.e && this.e.scripted && this.e.obj.visible) this.e.animate(dt);
    this.tick(dt);
    this.updateProps(dt);
    // de vez en cuando, un vistazo atrás (sin quitar el control)
    if (this.glance) {
      this.glance.t -= dt;
      const q = this.path.at(this.sP + 4.2, this._pt);
      const gy = p.pos.y + 1.9;
      this.cam = {
        pos: new V3(q.x - q.tz * 1.3, gy, q.z + q.tx * 1.3),
        look: b.pos
          .clone()
          .lerp(p.pos, 0.35)
          .add(new V3(0, 1.6, 0)),
        speed: 14,
        fov: 60,
        glance: true,
      };
      if (this.glance.t <= 0 || this.lock || !this.follow) {
        this.glance = null;
        if (this.cam && this.cam.glance) this.cam = null;
      }
    } else if (this.follow && !this.lock && !this.cam) {
      for (const s0 of [44, 146])
        if (this.sP > s0 && this.sP < s0 + 3 && !this.glanced.has(s0) && this.sP - this.sB < 9) {
          this.glanced.add(s0);
          this.glance = { t: 1.6 };
        }
    }
    // cámara del guion; si no, una mano que la lleva hacia delante, y más
    // cerca y más alta con la Bestia encima (si no, se metía en su cuerpo)
    if (this.camFn) this.camFn(dt);
    const near = b.visible ? Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z) : 99;
    const cr = g.camRig;
    if (this.cam) cr.override = this.cam;
    else if (this.follow && !this.lock) {
      const t = this.path.at(this.sP + 6, this._pt);
      cr.yaw = dampAngle(cr.yaw, Math.atan2(t.tx, t.tz), 1.4, dt);
      if (near < 8) cr.pitch = Math.max(cr.pitch, damp(cr.pitch, 0.42, 3, dt));
    }
    cr.dist = damp(cr.dist, !this.cam && near < 8 ? 3.0 : 4.1, 3, dt);
    // la cámara dentro de la Bestia: no se dibuja; si se interpone entre la
    // cámara y el jugador (te pisa los talones), se vuelve transparente
    const c = cr.cam.position;
    b.obj.visible = b.visible && Math.hypot(c.x - b.pos.x, c.z - b.pos.z) > 1.5 + (c.y < b.pos.y + 3.4 ? 0.4 : -0.6);
    let occ = false;
    if (b.visible && !this.cam) {
      // distancia del eje de la Bestia al segmento cámara-pecho del jugador
      const ax = c.x,
        az = c.z,
        bx = p.pos.x,
        bz = p.pos.z;
      const dx = bx - ax,
        dz = bz - az,
        l2 = dx * dx + dz * dz || 1;
      const u = clamp(((b.pos.x - ax) * dx + (b.pos.z - az) * dz) / l2, 0, 1);
      const hy = lerp(c.y, p.pos.y + 1.2, u);
      occ = u > 0.05 && u < 0.97 && Math.hypot(ax + dx * u - b.pos.x, az + dz * u - b.pos.z) < 1.5 && hy < b.pos.y + b.lift + 3.6;
    }
    this.fadeK = damp(this.fadeK ?? 1, occ ? 0.3 : 1, 10, dt);
    b.setFade(this.fadeK > 0.98 ? 1 : this.fadeK);
  }

  // La Bestia corre detrás (goma elástica: nunca muy lejos, nunca encima sin
  // golpear) y, si te alcanza, te da un manotazo.
  chaseStep(dt) {
    const g = this.g,
      p = g.player,
      b = this.beast;
    const gap = this.sP - this.sB;
    let v;
    this.bashCD = Math.max(0, (this.bashCD || 0) - dt);
    if (this.bashT > 0) {
      // tras el manotazo se queda atrás un momento (te da tiempo a escapar)
      this.bashT -= dt;
      v = this.bashT > 0.5 ? 0.6 : 3.5;
    } else v = clamp(Math.max(5.6, this.vP + (gap - 5.2) * 1.4), 0, 9.6);
    // ya no hay a dónde ir (lo alto del fanal)
    v = Math.min(v, Math.max(0, (this.path.len - 0.8 - this.sB) / Math.max(dt, 1e-3)));
    // (ni el hueco del adarve: lo salta el guion)
    if (!this.beastOverGap) {
      const edge = this.path.project(CHASE.gap.from + 0.4, -124);
      if (this.sB < edge + 1) v = Math.min(v, Math.max(0, (edge - this.sB) / Math.max(dt, 1e-3)));
    }
    this.sB += v * dt;
    const pt = this.path.at(this.sB, this._pt);
    const gy = g.world.col.groundHeight(pt.x, pt.z, 0.2, pt.y + 1.2);
    b.pos.set(pt.x, gy, pt.z);
    b.groundY = gy;
    b.vx = pt.tx * v;
    b.vz = pt.tz * v;
    // de cara al recorrido; de cerca, hacia el jugador
    const toP = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
    const yt = Math.atan2(pt.tx, pt.tz);
    const near = clamp(1 - (gap - 2) / 5, 0, 1);
    b.yaw = dampAngle(b.yaw, yt + angleDiff(yt, toP) * near * 0.6, 8, dt);
    // en las torres agacha la cabeza
    const inTower = CHASE.towersN.some((x) => Math.abs(b.pos.x - x) < 3.4 && b.pos.z < -120.5) || (Math.abs(b.pos.z - CHASE.towerE.z) < 3.4 && b.pos.x > 70);
    b.extraHunch = damp(b.extraHunch, inTower ? 1 : 0, 6, dt);
    // lo que encuentra por delante, lo revienta
    const B = g.breakables;
    if (B && v > 2) {
      const br = B.contact(b.pos.x, b.pos.z, 1.4, pt.tx, pt.tz, b.pos.y);
      if (br) B.shatter(br, b.pos);
    }
    if (!this.beamBroken && Math.abs(b.pos.z - (CHASE.towerE.z + 0.4)) < 1.4 && b.pos.x > 70) this.breakBeam();
    // te ha alcanzado: manotazo
    if (gap < 2.6 && !(this.bashT > 0) && !(this.bashCD > 0) && !this.lock && Math.abs(p.pos.y - b.pos.y) < 2.5) {
      this.bashT = 1.3;
      this.bashCD = 2.6;
      b.play('bash', { blend: 0.06 });
      this.bashArmed = true;
    }
  }

  onBeastStep(side, w) {
    const g = this.g,
      b = this.beast,
      p = g.player;
    if (!b.visible || w < 0.3) return;
    const d = Math.hypot(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
    if (d < 22) g.camRig.shake(0.14 * (1 - d / 22) + 0.03);
    g.audio && g.audio.play('beastStep', b.pos);
    const f = b.point('foot' + side, this._a);
    g.fx.blood.emit(f.x, b.pos.y + 0.05, f.z, 6, { color: [0.3, 0.28, 0.25], speed: 1.6, life: 0.6, up: 0.6, gravity: 2 });
  }

  onBeastEvent(n) {
    const g = this.g,
      b = this.beast,
      p = g.player;
    if (n === 'roar') {
      g.audio && g.audio.play(b.clipName === 'bigRoar' ? 'beastRoarBig' : 'beastRoar', b.pos);
      g.camRig.shake(0.7);
      g.input.rumble(0.8, 1, 500);
      const h = b.point('head', this._a);
      g.combat.ring(h.x, b.pos.y + 0.1, h.z, 7, 0xb02818, 1.0);
    }
    if (n === 'hit' && b.clipName === 'bash' && this.bashArmed) {
      this.bashArmed = false;
      const d = Math.hypot(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
      if (d < 3.4 && Math.abs(p.pos.y - b.pos.y) < 2.5 && !p.dead) {
        // te lanza hacia delante, por el recorrido
        const t = this.path.at(this.sP, this._pt);
        this.hurtPlayer(16, b.pos.x, b.pos.z);
        if (!p.dead) {
          // un respingo corto y empujado hacia delante: a seguir corriendo
          p.state = 'hurt';
          p.stT = 0;
          p.vx = t.tx * 10;
          p.vz = t.tz * 10;
          p.anim.play(p.clips.hurt, { blend: 0.04 });
        }
      }
      g.audio && g.audio.play('swingHeavy', b.pos);
    }
  }

  updateProps(dt) {
    // la viga echa chispas
    if (this.beam.visible && Math.random() < dt * 14) {
      const q = this.beam.position;
      this.g.fx.blood.emit(q.x + (Math.random() - 0.3) * 1.6, q.y + 0.25, q.z, 2, { color: [1, 0.5, 0.12], speed: 0.8, life: 0.7, up: 2, gravity: -1 });
    }
  }

  // ======================================================================
  // LA TRANSFORMACIÓN
  // ======================================================================
  *coTransform(e) {
    const g = this.g,
      p = g.player,
      b = this.beast;
    this.lock = true;
    this.follow = false;
    g.lockTarget = null;
    g.qte.cancel();
    // a sus sitios (la cámara corta a él)
    const E = new V3(...ARENA.E);
    const PP = new V3(...ARENA.P);
    e.scripted = true;
    e.atk = null;
    e.state = 'stagger';
    e.stT = 0;
    e.vx = e.vz = 0;
    e.body.pos.copy(E);
    e.yaw = Math.atan2(PP.x - E.x, PP.z - E.z);
    e.anim.speed = 1;
    e.anim.play(IMP_CLIPS.stagger, { blend: 0.08 });
    this.puppet(true);
    this.setP(PP.x, PP.y, PP.z, Math.atan2(E.x - PP.x, E.z - PP.z));
    p.anim.play(p.clips.hurt, { blend: 0.1 });
    g.audio.stopMusic();
    g.audio.enemyVoice(e, 'pain');
    g.audio.play('dread');
    const F = new V3(PP.x - E.x, 0, PP.z - E.z).normalize();
    const Sd = new V3(-F.z, 0, F.x);
    const camA = E.clone()
      .addScaledVector(F, 4.4)
      .addScaledVector(Sd, 2.6)
      .add(new V3(0, 1.5, 0));
    this.shot(camA, E.clone().add(new V3(0, 1.9, 0)), { snap: true, fov: 50 });
    // franjas negras
    for (let t = 0; t < 0.6; ) {
      t += yield;
      this.setBars(sm(t / 0.6));
    }
    // ---- convulsiones: se le revienta la armadura, pieza a pieza
    const sheds = [['helm'], ['breastR', 'back'], ['gorget', 'plackart'], ['armorL', 'armorR'], ['tassetL', 'tassetR', 'fauld'], ['legArmorL', 'legArmorR'], ['tabard', 'door']];
    let k = 0,
      t = 0;
    const red = new THREE.Color();
    while (t < 2.6) {
      const dt = yield;
      t += dt;
      const u = t / 2.6;
      if (k < sheds.length && t > 0.35 + k * 0.3) {
        shedArmor(e, sheds[k], { k: 1.4, quiet: k % 2 === 1 });
        const h = e.rig.worldPos('chest', this._a);
        g.fx.blood.emit(h.x, h.y, h.z, 26, { speed: 5, up: 1.4 });
        g.camRig.shake(0.25);
        g.audio && g.audio.play('fleshTear', h);
        e.flX && e.flX.kick(-6);
        k++;
      }
      // se hincha y tiembla; la carne brilla
      const sw = 1 + 0.18 * sm(u);
      e.obj.scale.set(sw * (1 + Math.sin(t * 31) * 0.02 * u), sw * (1 + Math.sin(t * 27) * 0.015 * u), sw);
      e.obj.rotation.z = Math.sin(t * 23) * 0.03 * u;
      red.setRGB(0.6 * u * (0.6 + 0.4 * Math.sin(t * 18)), 0.05 * u, 0.02 * u);
      e.rig.setTint(null, red);
      if (Math.random() < dt * 10) {
        const h = e.rig.worldPos(Math.random() < 0.5 ? 'chest' : 'hips', this._a);
        g.fx.blood.emit(h.x, h.y, h.z, 8, { speed: 3, up: 1 });
      }
      // la cámara se acerca
      this.cam.pos.lerpVectors(
        camA,
        E.clone()
          .addScaledVector(F, 3.1)
          .addScaledVector(Sd, 1.4)
          .add(new V3(0, 2.0, 0)),
        sm(u)
      );
      this.cam.snap = true;
    }
    // ---- estalla: sale la Bestia
    const rest = [
      'pauldronL',
      'pauldronR',
      'visor',
      'helm',
      'breastL',
      'breastR',
      'back',
      'plackart',
      'gorget',
      'armorL',
      'armorR',
      'legArmorL',
      'legArmorR',
      'tassetL',
      'tassetR',
      'fauld',
      'tabard',
      'door',
    ];
    shedArmor(e, rest, { k: 1.8, quiet: true });
    e.rig.setTint(null, null);
    e.obj.scale.setScalar(1);
    e.obj.rotation.z = 0;
    e.obj.visible = false;
    e.shadow.visible = false;
    e.state = 'dead';
    e.stT = 99;
    g.activeBoss = null;
    for (let i = 0; i < 4; i++) g.fx.blood.emit(E.x, E.y + 1 + i * 0.6, E.z, 70, { speed: 7, up: 2.4 });
    g.flash = 1;
    g.flashTint = [1, 0.12, 0.08];
    g.hurtFlash = 0.6;
    g.camRig.shake(1);
    g.input.rumble(1, 1, 600);
    g.audio && g.audio.play('fleshBurst', E);
    b.show(E.x, E.y, E.z, e.yaw);
    b.groundY = E.y;
    b.showStub(true);
    b.play('rise', { blend: 0.01 });
    // ---- se levanta (plano bajo, desde delante)
    this.shot(
      E.clone()
        .addScaledVector(F, 5.4)
        .addScaledVector(Sd, 2.3)
        .add(new V3(0, 0.7, 0)),
      E.clone().add(new V3(0, 2.6, 0)),
      { snap: true, fov: 52 }
    );
    for (let t = 0; t < 2.5; ) {
      const dt = yield;
      t += dt;
      if (Math.random() < dt * 6) {
        const h = b.point('chest', this._a);
        g.fx.blood.emit(h.x, h.y, h.z, 6, { speed: 1.5, up: 0.2 });
      }
    }
    // ---- ruge (primer plano de la testuz)
    b.play('roar', { blend: 0.15 });
    const head = b.point('head', new V3());
    this.shot(
      head
        .clone()
        .addScaledVector(F, 3.4)
        .addScaledVector(Sd, 1.0)
        .add(new V3(0, -0.4, 0)),
      head,
      { speed: 3, fov: 48 }
    );
    yield* this.waitClip(0.75);
    g.ui.area('La Bestia de Carne');
    g.audio.music('chase');
    yield* this.waitClip(2.2);
    // ---- se arranca la pica y te la tira: ¡Esquiva!
    b.play('pikeRip', { blend: 0.15 });
    const over = E.clone()
      .addScaledVector(F, -3.0)
      .addScaledVector(Sd, 2.6)
      .add(new V3(0, 4.0, 0));
    this.shot(over, PP.clone().add(new V3(0, 1.2, 0)), { speed: 4, fov: 54 });
    yield* this.waitClip(0.93);
    this.ripPike();
    yield* this.waitClip(1.28);
    const okPike = yield* this.prompt({ action: 'dodge', label: '¡Esquiva!', window: 1.15, slow: 0.2 });
    if (okPike) yield* this.dodgeTo(ARENA.dodgePike, 0.62);
    else {
      // la pica le alcanza
      yield* this.waitClip(1.58);
      this.throwPike(p.pos.clone().add(new V3(0, 1.1, 0)), false);
      yield* this.wait(0.12);
      this.hurtPlayer(26, E.x, E.z);
      if (p.dead) return;
      this.pClip('fallBack');
      const from = p.pos.clone();
      for (let t = 0; t < 0.4; ) {
        t += yield;
        const u = sm(t / 0.4);
        this.setP(lerp(from.x, from.x - 0.6, u), from.y, lerp(from.z, from.z - 1.0, u));
      }
      this.pClip('getup', { blend: 0.05 });
      yield* this.wait(0.9);
    }
    if (okPike) {
      yield* this.waitClip(1.58);
      this.throwPike(PP.clone().add(new V3(0, 1.1, 0)), true);
    }
    yield* this.wait(0.5);
    // ---- embiste: ¡Esquiva!
    yield* this.coCharge();
  }

  // Se arranca el asta de la espalda: sangre, y la lleva en la mano.
  ripPike() {
    const g = this.g,
      b = this.beast;
    b.showStub(false);
    const h = b.point('chest', this._a, new V3(-0.3, 0.7, -0.4));
    g.fx.blood.emit(h.x, h.y, h.z, 60, { speed: 6, up: 2 });
    g.audio && g.audio.play('fleshTear', h);
    g.camRig.shake(0.4);
    this.pikeHeld = true;
    this.pike.visible = true;
  }
  // La pica sale volando hacia 'to' (si falla, sigue hasta clavarse).
  throwPike(to, miss) {
    const g = this.g;
    this.pikeHeld = false;
    const from = this.beast.point('handR', new V3());
    const dir = to.clone().sub(from).normalize();
    // (si esquivas, la pica sigue hasta el muro o el suelo)
    let dist = from.distanceTo(to);
    if (miss) {
      const hit = g.world.col.raycast(from.x, from.y, from.z, dir.x, dir.y, dir.z, 30, (bx) => bx.cam !== false);
      dist = hit === Infinity ? 18 : hit - 0.6;
    }
    this.pikeFly = { from, dir, dist, t: 0, v: 30 };
    g.audio && g.audio.play('pikeWhoosh', from);
  }

  // Salto lateral (rodando) hasta un punto, movido por el guion.
  *dodgeTo(to, dur = 0.6) {
    const p = this.g.player;
    const from = p.pos.clone();
    const T = new V3(...to);
    p.yaw = Math.atan2(T.x - from.x, T.z - from.z);
    this.pClip('roll', { blend: 0.04 });
    this.g.audio && this.g.audio.play('roll', p.pos);
    for (let t = 0; t < dur; ) {
      t += yield;
      const u = 1 - Math.pow(1 - Math.min(1, t / dur), 2);
      this.setP(lerp(from.x, T.x, u), lerp(from.y, T.y, u), lerp(from.z, T.z, u));
    }
  }

  // La embestida contra la barricada y la huida por el hueco.
  *coCharge() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    const E = b.pos.clone();
    const C = new V3(...ARENA.stuck);
    b.yaw = Math.atan2(C.x - E.x, C.z - E.z);
    b.play('gore', { blend: 0.12 });
    const side = new V3(-(C.z - E.z), 0, C.x - E.x).normalize();
    this.shot(
      E.clone()
        .lerp(C, 0.55)
        .addScaledVector(side, 6.5)
        .add(new V3(0, 2.4, 0)),
      E.clone()
        .lerp(C, 0.6)
        .add(new V3(0, 1.4, 0)),
      { speed: 5, fov: 56 }
    );
    p.yaw = Math.atan2(E.x - p.pos.x, E.z - p.pos.z);
    yield* this.waitClip(0.4);
    // el aviso y la carrera a la vez
    let ok = null;
    g.qte.start({ action: 'dodge', label: '¡Esquiva!', window: 0.95, slow: 0.25, onDone: (r) => (ok = r) });
    let dodged = false,
      hitDone = false;
    const dur = 0.9;
    for (let t = 0; t < dur; ) {
      const dt = yield;
      t += dt;
      const u = Math.min(1, t / dur);
      b.pos.lerpVectors(E, C, u * u * (1.6 - 0.6 * u));
      b.vx = (C.x - E.x) / dur;
      b.vz = (C.z - E.z) / dur;
      // revienta el torno si está en medio
      const B = g.breakables;
      const br = B && B.contact(b.pos.x, b.pos.z, 1.3, C.x - E.x, C.z - E.z, b.pos.y);
      if (br && br.kind !== 'barricade') B.shatter(br, b.pos);
      if (ok === true && !dodged) {
        dodged = true;
        this.also(this.dodgeTo(ARENA.dodgeCharge, 0.6));
      }
      // le alcanza
      if (ok !== true && !hitDone && b.pos.distanceTo(p.pos) < 2.0) {
        hitDone = true;
        g.qte.cancel();
        this.hurtPlayer(28, b.pos.x, b.pos.z, { shake: 0.9 });
        if (p.dead) return;
        this.pClip('fallBack');
        this.flyP = { from: p.pos.clone(), to: new V3(...ARENA.dodgeCharge), t: 0, dur: 0.45 };
      }
    }
    if (ok === null) g.qte.cancel();
    // ---- se estrella: la barricada revienta y se queda clavado
    b.vx = b.vz = 0;
    b.pos.copy(C);
    const B = g.breakables;
    for (const it of B.list) if (!it.broken && (it.id === 'barricada_norte' || (it.kind === 'merlon' && Math.hypot(it.x - C.x, it.z - C.z) < 2.2))) B.shatter(it, b.pos);
    g.camRig.shake(1);
    g.input.rumble(1, 1, 500);
    g.audio && g.audio.play('wallBreak', C);
    g.fx.blood.emit(C.x, C.y + 1.4, C.z - 0.6, 50, { color: [0.3, 0.27, 0.24], speed: 5, up: 2 });
    b.play('tear', { blend: 0.05 });
    b.anim.speed = 0;
    this.cp = 'start';
    // el que ha caído se levanta
    yield* this.waitBg();
    if (this.flyP) {
      const f = this.flyP;
      while (f.t < f.dur) {
        f.t += yield;
        const u = sm(f.t / f.dur);
        this.setP(lerp(f.from.x, f.to.x, u), f.to.y, lerp(f.from.z, f.to.z, u));
      }
      this.flyP = null;
      this.pClip('getup', { blend: 0.05 });
      yield* this.wait(0.9);
    }
    // ---- a correr por el hueco
    yield* this.scriptRun(ARENA.run, 6.2);
    yield* this.startChase(1.3);
  }

  // Carrera guiada por puntos (sin control).
  *scriptRun(pts, speed) {
    const g = this.g,
      p = g.player;
    let from = p.pos.clone();
    for (const q of pts) {
      const T = new V3(...q);
      const d = from.distanceTo(T);
      const yaw = Math.atan2(T.x - from.x, T.z - from.z);
      const dur = d / speed;
      for (let t = 0; t < dur; ) {
        const dt = yield;
        t += dt;
        const u = Math.min(1, t / dur);
        p.yaw = dampAngle(p.yaw, yaw, 12, dt);
        p.vx = Math.sin(yaw) * speed;
        p.vz = Math.cos(yaw) * speed;
        this.setP(lerp(from.x, T.x, u), lerp(from.y, T.y, u), lerp(from.z, T.z, u));
        // cámara detrás
        if (!this.cam || this.cam.chaseCam) {
          const c = p.pos.clone().add(new V3(-Math.sin(yaw) * 4.2, 2.1, -Math.cos(yaw) * 4.2));
          this.cam = { pos: c, look: p.pos.clone().add(new V3(Math.sin(yaw) * 3, 1.4, Math.cos(yaw) * 3)), speed: 10, fov: 58, chaseCam: true };
        }
      }
      from = T;
    }
    p.vx = p.vz = 0;
  }

  // Empieza (o sigue) la huida: el jugador corre y la Bestia detrás.
  *startChase(delay = 0) {
    const g = this.g,
      p = g.player,
      b = this.beast;
    this.puppet(false);
    p.anim.stop(0.2);
    const t = this.path.at(this.path.project(p.pos.x, p.pos.z), this._pt);
    this.releaseCam(Math.atan2(t.tx, t.tz));
    this.setBars(0);
    g.ui.showHud(true);
    this.lock = false;
    g.chaseRun = true;
    g.saveGame();
    if (!this.toldRun) {
      this.toldRun = true;
      g.ui.toast('¡Corre!', 2.5);
    }
    // si está clavada, se arranca de la piedra (y te vuelves a mirarla)
    if (b.clipName === 'tear') {
      yield* this.wait(delay);
      b.anim.speed = 1;
      yield* this.waitClip(0.88);
    } else yield* this.wait(delay);
    this.sB = this.path.project(b.pos.x, b.pos.z);
    this.follow = true;
    if (!this.glanced.has(0)) {
      this.glanced.add(0);
      this.glance = { t: 1.4 };
    }
    yield* this.coRun();
  }

  // ======================================================================
  // LA HUIDA
  // ======================================================================
  *coRun() {
    const beats = [
      { s: 17, fn: () => this.beatStone(), cp: null },
      { s: 27.2, fn: () => this.beatBeam() },
      { s: 63.5, fn: () => this.beatCorner() },
      { s: 92.3, fn: () => this.beatGap(), cp: 'gap' },
      { s: 121.8, fn: () => this.beatReflex(), cp: 'reflex' },
      { s: 192.2, fn: () => this.beatFinal(), cp: 'top' },
    ];
    const done = this.beatsDone || (this.beatsDone = new Set());
    while (true) {
      yield;
      const nb = beats.find((q, i) => !done.has(i) && this.sP >= q.s);
      if (!nb) continue;
      const i = beats.indexOf(nb);
      done.add(i);
      // (los anteriores ya no saltan si vuelves atrás)
      for (let j = 0; j < i; j++) done.add(j);
      if (nb.cp) this.cp = nb.cp;
      // el fanal: hay que llegar arriba del todo
      if (i === 5 && this.g.player.pos.y < 17.4) {
        done.delete(i);
        continue;
      }
      yield* nb.fn();
      if (this.g.player.dead) return;
    }
  }

  // ---- un sillar arrancado del parapeto, por el aire: ¡Esquiva!
  *beatStone() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    this.follow = false;
    b.vx = b.vz = 0;
    b.play('throw', { blend: 0.1 });
    this.lookBack();
    yield* this.waitClip(0.45);
    this.rockHeld = true;
    this.rock.visible = true;
    g.audio && g.audio.play('pillarBreak', b.pos);
    yield* this.waitClip(0.86);
    this.lock = true;
    this.puppet(true);
    const v = Math.max(4.5, this.vP);
    this.runOn = v;
    const ok = yield* this.prompt({ action: 'dodge', label: '¡Esquiva!', window: 1.0, slow: 0.25 });
    this.runOn = 0;
    const aim = p.pos.clone();
    if (ok) {
      const t = this.path.at(this.sP + 4.2, {});
      this.also(this.dodgeTo([t.x, g.world.col.groundHeight(t.x, t.z, 0.2, t.y + 1), t.z], 0.62));
      yield* this.waitClip(1.04);
      this.throwRock(aim.clone().add(new V3(0, 0.6, 0)));
      yield* this.waitBg();
    } else {
      yield* this.waitClip(1.04);
      this.throwRock(p.pos.clone().add(new V3(0, 1.0, 0)));
      yield* this.wait(0.16);
      this.hurtPlayer(20, b.pos.x, b.pos.z);
      if (p.dead) return;
      yield* this.knockDown(2.4);
    }
    yield* this.resumeRun();
  }

  throwRock(to) {
    const from = this.beast.point('handR', new V3());
    this.rockHeld = false;
    this.rockFly = { from, to, t: 0, dur: Math.max(0.3, from.distanceTo(to) / 22) };
    this.g.audio && this.g.audio.play('pikeWhoosh', from);
  }

  // Derribado hacia delante (por el recorrido): cae, se levanta.
  *knockDown(push = 2) {
    const p = this.g.player;
    this.puppet(true);
    const t0 = this.path.at(this.sP, this._pt);
    const from = p.pos.clone();
    const t1 = this.path.at(this.sP + push, {});
    p.yaw = Math.atan2(-t0.tx, -t0.tz);
    this.pClip('fallBack', { blend: 0.04 });
    for (let t = 0; t < 0.4; ) {
      t += yield;
      const u = sm(t / 0.4);
      const gy = this.g.world.col.groundHeight(lerp(from.x, t1.x, u), lerp(from.z, t1.z, u), 0.2, from.y + 1);
      this.setP(lerp(from.x, t1.x, u), gy, lerp(from.z, t1.z, u));
    }
    yield* this.wait(0.35);
    this.pClip('getup', { blend: 0.05 });
    yield* this.wait(0.95);
    p.yaw = Math.atan2(t0.tx, t0.tz);
  }

  // Vuelve el control y la Bestia sigue detrás.
  *resumeRun() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    this.puppet(false);
    p.anim.stop(0.15);
    this.lock = false;
    this.cam = null;
    this.camFn = null;
    g.camRig.override = null;
    if (b.clipName && b.clipName !== 'bash') b.stopClip(0.25);
    this.sB = Math.min(this.path.project(b.pos.x, b.pos.z), this.sP - 3.5);
    this.follow = true;
    yield;
  }

  // ---- la viga ardiendo en la torre: ¡Agáchate!
  *beatBeam() {
    const g = this.g,
      p = g.player;
    if (this.beamBroken) return;
    this.lock = true;
    this.puppet(true);
    this.runOn = Math.max(4.5, this.vP);
    const T = CHASE.towerE;
    this.shot([T.x + 1.1, CHASE.YE + 1.0, T.z - 2.6], [T.x, CHASE.YE + 1.0, T.z + 3], { speed: 9, fov: 60 });
    const ok = yield* this.prompt({ action: 'dodge', label: '¡Agáchate!', window: 0.85, slow: 0.25 });
    this.runOn = 0;
    if (ok) {
      // rueda por debajo de la viga
      yield* this.dodgeTo([T.x + 0.3, CHASE.YE, T.z - 2.4], 0.7);
    } else {
      // se la come de lleno: atontado, y la Bestia le alcanza
      this.hurtPlayer(10, p.pos.x, p.pos.z - 1);
      if (p.dead) return;
      this.pClip('stagger', { blend: 0.04 });
      yield* this.wait(0.7);
      this.breakBeam();
      this.hurtPlayer(16, p.pos.x, p.pos.z + 1);
      if (p.dead) return;
      yield* this.knockDown(3.5);
    }
    this.cam = null;
    yield* this.resumeRun();
  }

  // ---- en la esquina: salta sobre ti
  *beatCorner() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    this.follow = false;
    b.play('leap', { blend: 0.1 });
    this.lookBack(11);
    const from = b.pos.clone();
    yield* this.waitClip(0.56);
    this.lock = true;
    this.puppet(true);
    this.runOn = Math.max(4.5, this.vP);
    const land = this.path.at(this.sP + 0.6, {});
    const L = new V3(land.x, g.world.col.groundHeight(land.x, land.z, 0.2, land.y + 1), land.z);
    let ok = null;
    g.qte.start({ action: 'dodge', label: '¡Esquiva!', window: 0.8, slow: 0.3, onDone: (r) => (ok = r) });
    yield* this.airArc(from, L, 0.74, 3.2, () => ok);
    this.runOn = 0;
    if (ok === null) g.qte.cancel();
    this.landImpact(L);
    if (ok !== true) {
      this.hurtPlayer(22, L.x, L.z);
      if (p.dead) return;
      yield* this.knockDown(3);
    } else yield* this.waitBg();
    yield* this.waitClip(1.7);
    yield* this.resumeRun();
  }

  // La Bestia por el aire de 'from' a 'to' (apex h). okFn: si el jugador ya
  // ha esquivado, rueda hacia delante mientras tanto.
  *airArc(from, to, dur, h, okFn = null) {
    const b = this.beast;
    b.vx = b.vz = 0;
    b.yaw = Math.atan2(to.x - from.x, to.z - from.z);
    let rolled = false;
    for (let t = 0; t < dur; ) {
      const dt = yield;
      t += dt;
      const u = Math.min(1, t / dur);
      b.pos.set(lerp(from.x, to.x, u), lerp(from.y, to.y, u), lerp(from.z, to.z, u));
      b.lift = Math.sin(PI * u) * h;
      b.groundY = to.y;
      if (okFn && okFn() === true && !rolled) {
        rolled = true;
        this.runOn = 0;
        const q = this.path.at(this.sP + 4, {});
        this.also(this.dodgeTo([q.x, this.g.world.col.groundHeight(q.x, q.z, 0.2, q.y + 1), q.z], 0.62));
      }
    }
    b.lift = 0;
    b.pos.copy(to);
  }

  landImpact(L) {
    const g = this.g;
    g.camRig.shake(0.9);
    g.input.rumble(1, 1, 350);
    g.audio && g.audio.play('slam', L);
    g.combat.ring(L.x, L.y + 0.05, L.z, 4, 0x8a6a50, 0.6);
    g.fx.blood.emit(L.x, L.y + 0.2, L.z, 40, { color: [0.3, 0.27, 0.24], speed: 4, up: 1.6, life: 0.9 });
  }

  // ---- el adarve hundido: ¡Salta!
  *beatGap() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    const G = CHASE.gap;
    const Y = CHASE.YN;
    this.lock = true;
    this.puppet(true);
    this.runOn = Math.max(4.5, this.vP);
    // desde el otro lado del hueco, sobre el adarve: el jugador llega y salta
    // hacia la cámara, con la Bestia detrás
    this.shot([G.x0 - 5.2, Y + 2.3, -123.1], [G.x1 + 1.6, Y + 0.7, -124], { speed: 9, fov: 60, snap: true });
    const ok = yield* this.prompt({ action: 'interact', label: '¡Salta!', window: 1.0, slow: 0.3 });
    this.runOn = 0;
    const from = p.pos.clone();
    if (ok) {
      // salto limpio
      this.pClip('jump', { blend: 0.04 });
      g.audio && g.audio.play('roll', p.pos);
      for (let t = 0; t < 0.62; ) {
        t += yield;
        const u = Math.min(1, t / 0.62);
        this.setP(lerp(from.x, G.to, u), Y + Math.sin(PI * u) * 1.1, from.z);
        p.body.grounded = false;
      }
      p.body.grounded = true;
      g.audio && g.audio.play('land', p.pos, { v: 7 });
      yield* this.dodgeTo([G.to - 2.2, Y, from.z], 0.5);
    } else {
      // corto: se agarra al borde de enfrente
      this.pClip('jump', { blend: 0.04 });
      for (let t = 0; t < 0.5; ) {
        t += yield;
        const u = Math.min(1, t / 0.5);
        this.setP(lerp(from.x, G.x0 + 0.35, u), Y - 1.9 * sm(u) + Math.sin(PI * u) * 0.5, from.z);
        p.body.grounded = false;
      }
      p.yaw = -PI / 2;
      this.pClip('hang', { blend: 0.08 });
      g.camRig.shake(0.4);
      g.audio && g.audio.play('land', p.pos, { v: 4 });
      // colgado del borde: desde el borde de enfrente, se le ve aferrado a la piedra
      this.shot([G.x0 + 2.7, Y - 0.3, -122.75], [G.x0 + 0.3, Y - 1.1, -124.1], { speed: 6, fov: 66, snap: true });
      const up = yield* this.prompt({ action: 'interact', label: '¡Trepa!', window: 2.8, mash: 8, slow: 0.6 });
      if (up) {
        this.pClip('climbUp', { blend: 0.06 });
        const h = p.pos.clone();
        for (let t = 0; t < 0.95; ) {
          t += yield;
          const u = sm(t / 0.95);
          this.setP(lerp(h.x, G.x0 - 0.9, u), lerp(h.y, Y, u), h.z);
        }
      } else {
        // la Bestia llega, salta el hueco y te saca de un tirón
        b.stopClip(0.1);
        this.follow = false;
        const bf = b.pos.clone();
        const bl = new V3(G.x0 - 1.2, Y, -123.0);
        b.play('leap', { blend: 0.1 });
        yield* this.waitClip(0.56);
        yield* this.airArc(bf, bl, 0.74, 2.4);
        this.beastOverGap = true;
        this.landImpact(bl);
        this.hurtPlayer(22, bl.x, bl.z);
        if (p.dead) return;
        this.setP(G.x0 - 2.6, Y, -124.6);
        yield* this.knockDown(2.5);
        yield* this.resumeRun();
        return;
      }
    }
    this.cam = null;
    g.camRig.override = null;
    // la Bestia salta el hueco detrás (mientras tú corres)
    yield* this.resumeRun();
    this.follow = false;
    this.cp = 'gap';
    const bs = this.path.project(b.pos.x, b.pos.z);
    // llega al borde
    while (this.sB < this.path.project(G.from, -124)) {
      const dt = yield;
      this.sB = Math.max(this.sB, bs) + 8.5 * dt;
      const pt = this.path.at(this.sB, this._pt);
      b.pos.set(pt.x, Y, pt.z);
      b.vx = pt.tx * 8.5;
      b.vz = pt.tz * 8.5;
      b.yaw = Math.atan2(pt.tx, pt.tz);
    }
    b.play('leap', { blend: 0.08 });
    yield* this.waitClip(0.56);
    const to = this.path.at(this.path.project(G.x0 - 0.8, -124), {});
    yield* this.airArc(b.pos.clone(), new V3(to.x, Y, to.z), 0.7, 2.6);
    this.beastOverGap = true;
    this.landImpact(b.pos);
    yield* this.waitClip(1.6);
    b.stopClip(0.2);
    this.sB = this.path.project(b.pos.x, b.pos.z);
    this.follow = true;
  }

  // ---- reflejos: te corta el paso de un salto y te acosa
  *beatReflex() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    this.follow = false;
    this.lock = true;
    this.puppet(true);
    // salta por encima y cae delante, de cara
    b.play('leap', { blend: 0.1 });
    const Y = CHASE.YN;
    const ahead = this.path.at(this.sP + 7.5, {});
    const L = new V3(ahead.x, Y, ahead.z);
    // el jugador frena
    const from = p.pos.clone();
    // plano lateral desde fuera de la muralla (sólo hay ladera y niebla): la
    // cámara sigue a la Bestia por el aire y siempre encuadra a los dos
    let first = true;
    this.camFn = () => {
      const mx = (p.pos.x + b.pos.x) / 2;
      const span = Math.abs(p.pos.x - b.pos.x);
      const dist = 5.8 + span * 0.42;
      this.cam = { pos: new V3(mx, Y + 4.4 + b.lift * 0.4, -124 - dist), look: new V3(mx, Y + 1.5 + b.lift * 0.55, -123.6), speed: 7, fov: 62, snap: first };
      first = false;
    };
    for (let t = 0; t < 0.5; ) {
      t += yield;
      const u = sm(t / 0.5);
      this.setP(lerp(from.x, from.x - 1.6, u), Y, from.z);
      p.vx = -(1 - u) * 4;
    }
    p.vx = 0;
    yield* this.waitClip(0.56);
    yield* this.airArc(b.pos.clone(), L, 0.74, 4.2);
    this.landImpact(L);
    b.yaw = Math.atan2(p.pos.x - L.x, p.pos.z - L.z);
    yield* this.waitClip(1.85);
    b.play('roar', { blend: 0.15 });
    // (el jugador alza la vista hacia ella)
    p.yaw = Math.atan2(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
    yield* this.waitClip(2.3);
    this.camFn = null;
    // los cuatro golpes
    // por encima del hombro: el jugador de espaldas y la Bestia encima
    const cam = () => {
      const a = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
      const c = p.pos.clone().add(new V3(Math.sin(a) * 3.7 - Math.cos(a) * 1.0, 2.5, Math.cos(a) * 3.7 + Math.sin(a) * 1.0));
      c.z = clamp(c.z, -125.2, -122.7);
      this.shot(c, b.pos.clone().add(new V3(0, 2.1, 0)), { speed: 5, fov: 58 });
    };
    cam();
    p.yaw = Math.atan2(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
    const blows = [
      { clip: 'swipe', at: 0.3, action: 'dodge', label: '¡Esquiva!', win: 0.8, hitT: 0.5, dmg: 18 },
      { clip: 'gore', at: 0.42, action: 'block', label: '¡Desvía!', win: 0.75, hitT: 0.6, dmg: 22 },
      { clip: 'grab', at: 0.38, action: 'light', label: '¡Golpea!', win: 0.75, hitT: 0.58, dmg: 24 },
      { clip: 'smash', at: 0.5, action: 'dodge', label: '¡Rueda!', win: 0.7, hitT: 0.74, dmg: 28 },
    ];
    for (let i = 0; i < blows.length; i++) {
      const w = blows[i];
      // se acerca lo justo para alcanzarle
      const d = b.pos.distanceTo(p.pos);
      if (d > 3.0) {
        const bf = b.pos.clone(),
          bt = b.pos.clone().lerp(p.pos, (d - 2.6) / d);
        for (let t = 0; t < 0.35; ) {
          const dt = yield;
          t += dt;
          b.pos.lerpVectors(bf, bt, sm(t / 0.35));
          b.vx = ((bt.x - bf.x) / 0.35) * 0.6;
        }
        b.vx = 0;
      }
      b.yaw = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
      b.play(w.clip, { blend: 0.08 });
      yield* this.waitClip(w.at);
      const ok = yield* this.prompt({ action: w.action, label: w.label, window: w.win, slow: 0.22 });
      if (ok) yield* this.reflexOk(i);
      else {
        yield* this.waitClip(w.hitT);
        this.hurtPlayer(w.dmg, b.pos.x, b.pos.z);
        if (p.dead) return;
        if (i === 2) yield* this.thrown();
        else if (i === 3) {
          yield* this.knockDown(0);
          // y se escabulle por debajo mientras se recupera
          yield* this.slipPast();
        } else yield* this.knockBack(1.6);
      }
      yield* this.waitClip(10);
    }
    // se da la vuelta y ruge: a correr
    const tb = b.yaw + PI;
    for (let t = 0; t < 0.5; ) {
      const dt = yield;
      t += dt;
      b.yaw = dampAngle(b.yaw, tb, 10, dt);
    }
    b.play('roar', { blend: 0.12, speed: 1.3 });
    yield* this.resumeRun();
    this.follow = false;
    yield* this.waitClip(1.2);
    this.follow = true;
    this.sB = this.path.project(b.pos.x, b.pos.z);
  }

  *reflexOk(i) {
    const g = this.g,
      p = g.player,
      b = this.beast;
    const away = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
    if (i === 0) {
      // atrás, rodando
      yield* this.dodgeTo([p.pos.x + Math.sin(away) * 2.2, p.pos.y, p.pos.z + Math.cos(away) * 2.2], 0.5);
      p.yaw = away + PI;
    } else if (i === 1) {
      // desvía la cornada: chispas y la testuz se le va de lado
      this.pClip('parryA', { blend: 0.04 });
      yield* this.waitClip(0.6);
      g.combat.parryFx(b, { dmg: 0 }, b.pos.x, b.pos.z);
      b.flinch.kick(-18);
      b.play('recoil', { blend: 0.06 });
      g.audio && g.audio.play('beastHurt', b.pos);
      yield* this.wait(0.5);
    } else if (i === 2) {
      // le clava el arma en la zarpa
      const c = p.set && p.set.light && p.set.light[0];
      if (c) p.anim.play(c.clip, { blend: 0.05 });
      g.audio && g.audio.play('swing', p.pos);
      yield* this.wait(0.22);
      const h = b.point('handR', this._a);
      g.fx.blood.emit(h.x, h.y, h.z, 40, { speed: 5, up: 1.4 });
      g.audio && g.audio.play('hitHeavy', h);
      g.audio && g.audio.play('beastHurt', b.pos);
      g.hitstop = 0.12;
      b.play('recoil', { blend: 0.05 });
      yield* this.wait(0.6);
    } else {
      // rueda por debajo de él: queda a su espalda
      yield* this.slipPast();
    }
  }

  // Rueda entre sus piernas hasta quedar detrás de él (por el recorrido).
  *slipPast() {
    const p = this.g.player,
      b = this.beast;
    const sb = this.path.project(b.pos.x, b.pos.z);
    const q = this.path.at(sb + 2.8, {});
    yield* this.dodgeTo([q.x, CHASE.YN, q.z], 0.75);
    p.yaw = Math.atan2(q.tx, q.tz);
    yield* this.wait(0.2);
  }

  // Le aparta de un golpe (sin tirarle).
  *knockBack(d) {
    const p = this.g.player,
      b = this.beast;
    const a = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
    const from = p.pos.clone();
    this.pClip('stagger', { blend: 0.04 });
    for (let t = 0; t < 0.4; ) {
      t += yield;
      const u = sm(t / 0.4);
      this.setP(from.x + Math.sin(a) * d * u, from.y, from.z + Math.cos(a) * d * u);
    }
    yield* this.wait(0.4);
  }

  // Le agarra, le levanta y le tira hacia atrás.
  *thrown() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    const a = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
    const from = p.pos.clone();
    const to = new V3(from.x + Math.sin(a) * 3.2, from.y, from.z + Math.cos(a) * 3.2);
    this.pClip('fallBack', { blend: 0.05 });
    for (let t = 0; t < 0.7; ) {
      t += yield;
      const u = Math.min(1, t / 0.7);
      this.setP(lerp(from.x, to.x, u), from.y + Math.sin(PI * u) * 1.6, lerp(from.z, to.z, u));
    }
    g.camRig.shake(0.5);
    g.audio && g.audio.play('land', p.pos, { v: 8 });
    yield* this.wait(0.3);
    this.pClip('getup', { blend: 0.05 });
    yield* this.wait(0.95);
    p.yaw = a + PI;
  }

  // ======================================================================
  // EL FANAL Y EL SALTO DE FE
  // ======================================================================
  *beatFinal() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    const F = CHASE.fanal;
    const top = F.top;
    this.lock = true;
    this.puppet(true);
    g.chaseRun = false;
    this.follow = false;
    g.audio && g.audio.play('dread');
    // arriba: no hay salida; se vuelve hacia la escalera
    const mid = new V3(F.x + 0.6, top, F.z + 0.5);
    this.shot([F.x - 3.0, top + 2.6, F.z + 2.6], [F.x + 3.5, top + 0.4, F.z - 0.4], { speed: 3, fov: 58 });
    this.setBars(0.6);
    {
      const from = p.pos.clone();
      const d = from.distanceTo(mid);
      for (let t = 0; t < d / 4.5; ) {
        const dt = yield;
        t += dt;
        const u = Math.min(1, t / (d / 4.5));
        this.setP(lerp(from.x, mid.x, u), top, lerp(from.z, mid.z, u));
        p.yaw = Math.atan2(mid.x - from.x, mid.z - from.z);
        p.vx = Math.sin(p.yaw) * 4.5;
        p.vz = Math.cos(p.yaw) * 4.5;
      }
      p.vx = p.vz = 0;
      for (let t = 0; t < 0.4; ) {
        const dt = yield;
        t += dt;
        p.yaw = dampAngle(p.yaw, PI / 2, 10, dt);
      }
    }
    // la Bestia sube los escalones de tres en tres
    {
      const sTop = this.path.L[5] - 0.6;
      while (this.sB < sTop) {
        const dt = yield;
        this.sB = Math.min(sTop, this.sB + 7.5 * dt);
        const pt = this.path.at(this.sB, this._pt);
        const gy = g.world.col.groundHeight(pt.x, pt.z, 0.2, pt.y + 1.2);
        b.pos.set(pt.x, gy, pt.z);
        b.groundY = gy;
        b.vx = pt.tx * 7.5;
        b.vz = pt.tz * 7.5;
        b.yaw = dampAngle(b.yaw, Math.atan2(pt.tx, pt.tz), 8, dt);
      }
      b.vx = b.vz = 0;
    }
    b.yaw = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
    b.play('roar', { blend: 0.12 });
    this.shot(b.pos.clone().add(new V3(-4.6, 2.6, 4.4)), b.pos.clone().add(new V3(0, 2.4, 0)), { speed: 4, fov: 56 });
    // el jugador retrocede hasta el hueco del parapeto
    {
      const from = p.pos.clone();
      const L = new V3(F.leap[0], top, F.leap[2] - 0.5);
      for (let t = 0; t < 1.5; ) {
        const dt = yield;
        t += dt;
        const u = sm(t / 1.5);
        this.setP(lerp(from.x, L.x, u), top, lerp(from.z, L.z, u));
        p.yaw = Math.atan2(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
        p.vx = -Math.sin(p.yaw) * 1.2 * (1 - u);
        p.vz = -Math.cos(p.yaw) * 1.2 * (1 - u);
      }
      p.vx = p.vz = 0;
    }
    yield* this.waitClip(2.2);
    // embiste: ¡Salta!
    let tries = 0;
    while (true) {
      b.yaw = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
      b.play('gore', { blend: 0.1 });
      this.shot(
        p.pos.clone().add(new V3(-3.6, 1.8, -1.2)),
        p.pos
          .clone()
          .lerp(b.pos, 0.5)
          .add(new V3(0, 1.5, 0)),
        { speed: 5, fov: 54 }
      );
      yield* this.waitClip(0.4);
      const ok = yield* this.prompt({ action: 'interact', label: '¡Salta!', window: tries ? 0.9 : 1.25, slow: 0.18 });
      if (ok) break;
      tries++;
      // la cornada le alcanza
      const bf = b.pos.clone(),
        bt = b.pos.clone().lerp(p.pos, 0.55);
      for (let t = 0; t < 0.2; ) {
        t += yield;
        b.pos.lerpVectors(bf, bt, sm(t / 0.2));
      }
      if (tries >= 2) {
        // al vacío
        this.hurtPlayer(999, b.pos.x, b.pos.z);
        return;
      }
      this.hurtPlayer(32, b.pos.x, b.pos.z, { shake: 1 });
      if (p.dead) return;
      yield* this.knockBack(0.3);
      // vuelve atrás para la siguiente
      const bb = b.pos.clone();
      for (let t = 0; t < 0.5; ) {
        t += yield;
        b.pos.lerpVectors(bb, bf, sm(t / 0.5));
      }
    }
    yield* this.leapOfFaith();
  }

  *leapOfFaith() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    const F = CHASE.fanal;
    const A = KEEP.atalaya;
    const L = CHASE.land;
    // se da la vuelta, dos zancadas y salta
    p.yaw = 0;
    this.pClip('leap', { blend: 0.06 });
    const from = p.pos.clone();
    const edge = new V3(F.leap[0], F.top, F.leap[2] + 0.2);
    const to = new V3(L[0], L[1] + 0.35, L[2]);
    // la Bestia llega tarde: se queda al borde
    const bf = b.pos.clone();
    const bEdge = new V3(F.leap[0] + 0.5, F.top, F.leap[2] - 1.6);
    g.slowmo = null;
    this.setBars(1);
    for (let t = 0; t < 0.28; ) {
      t += yield;
      const u = Math.min(1, t / 0.28);
      this.setP(lerp(from.x, edge.x, u), F.top, lerp(from.z, edge.z, u));
      b.pos.lerpVectors(bf, bEdge, sm(Math.min(1, t / 0.5)));
    }
    g.audio && g.audio.play('leapWind', p.pos);
    // por el aire (a cámara lenta al principio)
    const dur = 1.5;
    const side = new V3(-7.5, 1.0, 1.5);
    for (let t = 0; t < dur; ) {
      const dt0 = yield;
      // (el principio, más lento)
      const k = t < 0.55 ? 0.38 : 1;
      const dt = dt0 * k;
      t += dt;
      const u = Math.min(1, t / dur);
      const y = lerp(edge.y, to.y, u * u) + Math.sin(PI * Math.min(1, u * 1.15)) * 1.6;
      this.setP(lerp(edge.x, to.x, u), y, lerp(edge.z, to.z, u));
      p.body.grounded = false;
      p.yaw = 0;
      // cámara: de lado, siguiéndole en la caída
      const c = p.pos.clone().add(side);
      this.cam = { pos: c, look: p.pos.clone().add(new V3(0, 0.6, 1.0)), speed: 12, fov: 62 };
      if (t < 0.6 && b.clipName !== 'stare') {
        b.pos.lerpVectors(bf, bEdge, 1);
        if (b.anim.done || b.clipName === 'gore') {
          b.play('stare', { blend: 0.35 });
        }
      }
    }
    // en la paja
    p.body.grounded = true;
    this.setP(to.x, A.top, to.z);
    this.pClip('fallBack', { blend: 0.03 });
    g.camRig.shake(0.5);
    g.input.rumble(0.8, 0.6, 300);
    g.audio && g.audio.play('hayLand', p.pos);
    for (let i = 0; i < 3; i++) g.fx.blood.emit(to.x, A.top + 0.6, to.z, 30, { color: [0.78, 0.66, 0.32], speed: 3.5, life: 1.4, up: 2.5, gravity: 3 });
    // la Bestia, arriba, mirando; ruge y se va
    b.yaw = Math.atan2(to.x - b.pos.x, to.z - b.pos.z);
    b.play('stare', { blend: 0.2 });
    this.shot([A.x - 2.2, A.top + 1.0, A.z + 3.8], [b.pos.x, b.pos.y + 2.4, b.pos.z], { speed: 3, fov: 44 });
    yield* this.wait(2.4);
    b.play('bigRoar', { blend: 0.15 });
    yield* this.waitClip(1.05);
    g.camRig.shake(0.9);
    g.input.rumble(1, 1, 900);
    g.fauna && g.fauna.scare && g.fauna.scare(b.pos, 40);
    yield* this.waitClip(3.5);
    // se da la vuelta y se va por donde ha venido
    this.pClip('getup', { blend: 0.05 });
    const back = new V3(F.x + F.w / 2 - 0.4, F.top, F.z);
    for (let t = 0; t < 2.8; ) {
      const dt = yield;
      t += dt;
      const dx = back.x - b.pos.x,
        dz = back.z - b.pos.z;
      const d = Math.hypot(dx, dz);
      b.yaw = dampAngle(b.yaw, Math.atan2(dx, dz), 3, dt);
      const v = d > 0.3 && t > 0.6 ? 1.6 : 0;
      b.vx = (dx / (d || 1)) * v;
      b.vz = (dz / (d || 1)) * v;
      b.pos.x += b.vx * dt;
      b.pos.z += b.vz * dt;
    }
    yield* this.finish();
  }

  // Se ha escapado: la Bestia se pierde de vista y todo vuelve a la normalidad.
  *finish() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    g.fadeTarget = 0;
    yield* this.wait(1.0);
    b.hide();
    b.stopClip(0);
    this.follow = false;
    // (el control vuelve al jugador: sin esto se quedaba inmóvil en la atalaya)
    this.lock = false;
    this.cam = null;
    this.camFn = null;
    this.glance = null;
    this.fadeK = 1;
    b.setFade(1);
    g.qte.cancel();
    g.chaseRun = false;
    this.active = false;
    this.co = null;
    this.bg = [];
    this.setBars(0);
    this.puppet(false);
    p.anim.stop(0.2);
    const A = KEEP.atalaya;
    this.setP(A.x + 0.6, A.top, A.z + 1.8, PI);
    g.camRig.dist = 4.1;
    this.releaseCam(PI);
    g.flags['boss:impaled'] = true;
    g.flags['impaled:escaped'] = true;
    g.interact.applyFlags(g.flags);
    g.audio.stopMusic();
    g.saveGame();
    g.fadeTarget = 1;
    g.ui.showHud(true);
    g.later(900, () => g.ui.area('HAS ESCAPADO'));
    g.later(5600, () => {
      g.visited.add('atalaya');
      g.ui.area(AREA_NAMES.atalaya);
      g.audio && g.audio.play('discover');
    });
    g.later(9000, () => g.ui.toast('La Bestia de Carne se ha perdido por la muralla. Desde la atalaya, la coracha baja hasta lo alto del castillo.', 6));
    this.e && (this.e.dead = true);
  }

  // ======================================================================
  // REINTENTAR
  // ======================================================================
  *coRetry(fromFog) {
    const g = this.g,
      p = g.player,
      b = this.beast;
    g.qte.cancel();
    this.follow = false;
    this.lock = true;
    this.cam = null;
    this.camFn = null;
    g.camRig.override = null;
    g.chaseRun = false;
    const cp = this.cp;
    const e = this.e || g.bosses.impaled;
    if (e) {
      e.scripted = true;
      e.obj.visible = false;
      e.shadow.visible = false;
      e.state = 'dead';
      e.stT = 99;
    }
    g.activeBoss = null;
    // la barricada sigue rota; los barriles del adarve, enteros
    const B = g.breakables;
    for (const it of B.list) {
      if (it.area === 'chase' && it.broken) B.restore(it);
      if (it.id === 'barricada_norte' && !it.broken) B.shatter(it, null, true);
    }
    for (const it of B.list) if (it.area === 'chase') delete g.flags['broken:' + it.id];
    this.pike.visible = false;
    this.rock.visible = false;
    this.pikeFly = this.rockFly = null;
    this.beatsDone = new Set();
    this.glanced = new Set();
    this.glance = null;
    this.beastOverGap = cp === 'reflex' || cp === 'top';
    this.puppet(true);
    p.hp = p.maxHp;
    p.st = p.maxSt;
    b.showStub(false);
    const Y = CHASE.YN;
    if (cp === 'start') {
      this.restoreBeam();
      const C = ARENA.stuck;
      b.show(C[0], C[1], C[2], Math.atan2(-0.4, -1));
      b.groundY = C[1];
      b.play('tear', { blend: 0.01 });
      b.anim.speed = 0;
      const q = ARENA.run[1];
      this.setP(q[0], q[1], q[2], PI);
    } else {
      this.beamBroken = true;
      this.beam.visible = false;
      this.beamBox.enabled = false;
      const s = CP[cp].s;
      const q = this.path.at(s, {});
      this.setP(q.x, g.world.col.groundHeight(q.x, q.z, 0.2, q.y + 1), q.z, Math.atan2(q.tx, q.tz));
      // los tramos anteriores ya pasaron
      const before = { gap: 4, reflex: 4, top: 5 }[cp];
      for (let i = 0; i < before; i++) this.beatsDone.add(i);
      if (cp === 'reflex') this.beatsDone.delete(4);
      const bs = cp === 'top' ? this.path.L[4] - 4 : s - 7;
      const bq = this.path.at(bs, {});
      b.show(bq.x, g.world.col.groundHeight(bq.x, bq.z, 0.2, bq.y + 1), bq.z, Math.atan2(bq.tx, bq.tz));
      b.groundY = b.pos.y;
      if (cp === 'gap') {
        // al otro lado del hueco
        const e2 = this.path.at(this.path.project(CHASE.gap.from + 0.6, -124), {});
        b.pos.set(e2.x, Y, e2.z);
      }
    }
    this.sB = this.path.project(b.pos.x, b.pos.z);
    this.sP = this.path.project(p.pos.x, p.pos.z);
    g.camRig.snapTo(p);
    const t0 = this.path.at(this.sP + 3, {});
    g.camRig.yaw = Math.atan2(t0.tx, t0.tz);
    g.fadeTarget = 1;
    g.audio.music('chase');
    if (fromFog) g.ui.area('La Bestia de Carne');
    yield* this.wait(0.6);
    if (cp === 'top') {
      // directamente arriba del todo
      this.sB = this.path.L[4] - 2;
      yield* this.beatFinal();
      return;
    }
    if (cp === 'gap') {
      // la Bestia salta el hueco detrás
      yield* this.startChaseNoWait();
      this.follow = false;
      b.play('leap', { blend: 0.08 });
      yield* this.waitClip(0.56);
      const to = this.path.at(this.path.project(CHASE.gap.x0 - 0.8, -124), {});
      yield* this.airArc(b.pos.clone(), new V3(to.x, Y, to.z), 0.7, 2.6);
      this.beastOverGap = true;
      this.landImpact(b.pos);
      yield* this.waitClip(1.6);
      b.stopClip(0.2);
      this.sB = this.path.project(b.pos.x, b.pos.z);
      this.follow = true;
      yield* this.coRun();
      return;
    }
    if (cp === 'reflex') {
      yield* this.startChaseNoWait();
      yield* this.coRun();
      return;
    }
    yield* this.startChase(1.0);
  }

  *startChaseNoWait() {
    const g = this.g,
      p = g.player;
    this.puppet(false);
    p.anim.stop(0.2);
    this.lock = false;
    g.chaseRun = true;
    this.follow = true;
    yield;
  }

  // Lo que vuela (la pica, el sillar) y el paso del jugador durante un aviso.
  tick(dt) {
    const g = this.g,
      p = g.player,
      b = this.beast;
    // el jugador sigue corriendo (a cámara lenta) mientras decide
    if (this.runOn > 0 && p.puppet) {
      const s = this.path.project(p.pos.x, p.pos.z) + this.runOn * dt;
      const q = this.path.at(s, this._pt);
      const gy = g.world.col.groundHeight(q.x, q.z, 0.2, p.pos.y + 1);
      // (sin pasar de la viga ni del borde del hueco)
      const stopZ = CHASE.towerE.z + 1.3;
      if (!(Math.abs(p.pos.x - 74) < 2 && q.z < stopZ && !this.beamBroken && p.pos.z > stopZ - 2) && !(q.x < CHASE.gap.x1 + 0.4 && p.pos.x > CHASE.gap.x0))
        this.setP(q.x, gy, q.z, Math.atan2(q.tx, q.tz));
      p.vx = q.tx * this.runOn;
      p.vz = q.tz * this.runOn;
    } else if (p.puppet && !this.cam) {
      p.vx = damp(p.vx, 0, 8, dt);
      p.vz = damp(p.vz, 0, 8, dt);
    }
    // la pica en la mano / por el aire
    if (this.pikeHeld) {
      const h = b.point('handR', this._a);
      const c = b.point('chest', this._b);
      this.pike.position.copy(h);
      this.pike.lookAt(h.x + (h.x - c.x), h.y + (h.y - c.y) + 0.6, h.z + (h.z - c.z));
    }
    if (this.pikeFly) {
      const f = this.pikeFly;
      f.t += dt;
      const d = Math.min(f.dist, f.t * f.v);
      this.pike.position.copy(f.from).addScaledVector(f.dir, d);
      this.pike.lookAt(this.pike.position.clone().add(f.dir));
      if (d >= f.dist) {
        // clavada
        this.pikeFly = null;
        g.audio && g.audio.play('woodHit', this.pike.position);
        g.fx.blood.emit(this.pike.position.x, this.pike.position.y, this.pike.position.z, 14, { color: [0.3, 0.27, 0.24], speed: 3, up: 1 });
      }
    }
    // el sillar
    if (this.rockHeld) {
      const h = b.point('handR', this._a);
      this.rock.position.copy(h);
      this.rock.rotation.y = b.yaw;
    }
    if (this.rockFly) {
      const f = this.rockFly;
      f.t += dt;
      const u = Math.min(1, f.t / f.dur);
      this.rock.position.lerpVectors(f.from, f.to, u);
      this.rock.position.y += Math.sin(PI * u) * 1.2;
      this.rock.rotation.x += dt * 9;
      if (u >= 1) {
        this.rockFly = null;
        this.rock.visible = false;
        const q = f.to;
        g.fx.blood.emit(q.x, q.y, q.z, 50, { color: [0.36, 0.33, 0.3], speed: 6, up: 2, life: 1 });
        g.audio && g.audio.play('pillarBreak', q);
        g.camRig.shake(0.5);
      }
    }
  }
}
