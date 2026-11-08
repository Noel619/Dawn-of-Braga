// La Bestia de Carne: la transformación del Empalado y la persecución por la
// muralla norte hasta el salto de fe. Todo es una cinemática (sin control:
// se juega con las pulsaciones rápidas, los avisos).
//
// Con un cuarto de vida, el Empalado cae de rodillas, se le revienta lo que
// le queda de armadura, se hincha y estalla en sangre: lo que se levanta es
// la Bestia. Ruge y viene a por ti, y reculas hacia la barricada del norte;
// a medio camino te lanza un zarpazo (¡Esquiva!: te echas atrás y la zarpa
// pasa rozándote) y acabas con la espalda contra la madera, al lado de la
// estaca donde está clavada el hacha barbada (¡Arráncala!, machacando,
// mientras ella se acerca). La arrancas entre astillas y es tuya: te
// descarga los dos puños encima (¡Esquiva!, ruedas y revientan las losas) y,
// con los puños aún en el suelo, le hundes el hacha en el antebrazo
// (¡Golpea!). Se arranca la pica de la espalda y te la tira (¡Esquiva!: te
// tiras a un lado y la pica pasa silbando y se clava en la barricada), y
// embiste (¡Esquiva!): se estrella contra la barricada, la revienta y se
// queda con los cuernos clavados en la piedra; le saltas al lomo con el
// hacha en alto (¡Hachazo!) y, mientras se revuelve, otra vez (¡Remata!).
// Se arranca de la piedra bramando y empieza la huida.
//
// La huida: corres por el adarve del muro este, la esquina y la muralla
// norte, y la Bestia detrás, más cerca o más lejos según el tramo; la
// cámara va de un plano a otro (por delante, mirando atrás; por encima del
// hombro de la Bestia; desde fuera de la muralla, a la par...). Por el
// camino: te tira un sillar (¡Esquiva!), una viga ardiendo cierra la torre
// (¡Agáchate!: pasas por debajo deslizándote y ella la revienta detrás), te
// alcanza y te lanza un zarpazo a la espalda (¡Esquiva!), salta sobre ti en
// la esquina (¡Esquiva!), el adarve se ha hundido (¡Salta!; si te quedas
// corto, cuelgas del borde y hay que trepar) y lo salta detrás de ti; luego
// te corta el paso de un salto y llegan los «reflejos»: el zarpazo
// (¡Agáchate!), las manos (¡Golpea!), la cornada (¡Esquiva!) y el mazazo
// (¡Rueda!, entre sus patas, y a correr). Al final, la Torre del Fanal:
// arriba no hay salida, sólo el salto de fe a la paja de la atalaya. La
// Bestia se queda mirando desde lo alto, ruge y se va.
//
// Cada tramo es una corrutina (generador): cada `yield` espera un fotograma
// y devuelve su dt (ya a cámara lenta si hay un aviso en pantalla). Si mueres
// se vuelve a empezar desde el último punto de control de la persecución.
import * as THREE from 'three';
import { Beast } from '../entities/beast.js';
import { shedArmor, IMP_CLIPS } from '../entities/impaled.js';
import { CHASE } from '../world/level_walls.js';
import { KEEP } from '../world/level_keep.js';
import { objMat } from '../gfx/materials.js';
import { buildParts, WEAPON_PARTS, AXE_HEAD } from '../entities/weapon_models.js';
import { WEAPONS, weaponSet, resolveWeaponArms } from '../entities/weapons.js';
import { sampleClip } from '../entities/rig.js';
import { AREA_NAMES, MSG } from './story.js';
import { camSafe } from './finale/film.js';
import { clamp, damp, dampAngle, angleDiff, lerp } from '../core/util.js';

const V3 = THREE.Vector3;
const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const PI = Math.PI;
// a cuánto corre el jugador por el adarve (m/s; corriendo a tope, 6,7)
const RUNV = 6.4;
// ruido suave para la cámara al hombro
const noise = (t, s) => Math.sin(t * 1.31 + s * 4.1) * 0.5 + Math.sin(t * 2.73 + s * 1.7) * 0.32 + Math.sin(t * 5.9 + s * 9.3) * 0.18;

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

// Lugares de la escena del Postigo (lo alto de la puerta: de x 62 a 80 y de
// z -68 a -56; la barricada cierra el paso al adarve del norte, de x 72 a 76
// en z -67,75).
const ARENA = {
  // donde cae de rodillas el Empalado y se levanta la Bestia
  E: [74, 9, -59.2],
  // el jugador, delante de él (y unos pasos por delante de la barricada:
  // recula hasta ella)
  P: [74.3, 9, -62.6],
  // a dónde se echa atrás al esquivar el zarpazo
  swipe: [73.6, 9, -64.6],
  // a dónde rueda al esquivar el mazazo (al este, a la derecha de la Bestia)
  smash: [74.55, 9, -65.5],
  // a dónde se tira al esquivar la pica (al oeste, otra vez delante de la
  // estaca: de ahí embiste)
  pike: [72.75, 9, -65.75],
  // a dónde rueda al esquivar la embestida (al este, lejos de la estaca del
  // hacha, que es donde se estrella)
  dodgeCharge: [75.2, 9, -65.6],
  // donde se queda clavada la Bestia (los cuernos en la piedra)
  stuck: [72.7, 9, -68.3],
};

// Puntos de control: dónde vuelve a empezar si mueres (s: por dónde va el
// jugador en el recorrido; b: y la Bestia).
const CP = {
  start: { s: 9.6, b: 4.4 },
  corner: { s: 56.5, b: 49.5 },
  gap: { s: 98.5, b: 91.6 },
  reflex: { s: 116.5, b: 108.5 },
  top: { s: 193.3, b: 186 },
};
const CP_ORDER = ['start', 'corner', 'gap', 'reflex', 'top'];

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
    this.camFn = null;
    this.hand = 0;
    this.handT = 0;
    this.cp = 'start';
    // la carrera: por dónde va el jugador (sRun) y a cuánto corre (autoV; 0:
    // lo mueve el guion), lo que se aparta del centro del adarve (lat, y
    // hacia dónde vuelve: latT); la Bestia, por dónde va (sB), a cuánto
    // (vB) y a cuántos metros quiere ir detrás (gapT)
    this.sRun = 0;
    this.autoV = 0;
    this.lat = 0;
    this.latT = 0;
    this.sB = 0;
    this.vB = 0;
    this.gapT = 7;
    this.latB = 0;
    this.sP = 0;
    this.roarT = 2;
    this.bars = 0;
    this._pt = {};
    this._pa = {};
    this._pc = {};
    this._a = new V3();
    this._b = new V3();
    this._cp = new V3();
    this._cl = new V3();
    this.pikeLoose = null;
    this.pikeStuck = null;
    this.buildProps();
    this.buildAxe();
    this.applyFlags();
  }

  // ------------------------------------------------------------ el hacha
  // El hacha barbada, clavada hasta el ojo en la estaca de la barricada del
  // norte (la estaca es de la barricada: breakables.js). Su sitio sale de la
  // pose con que se forcejea con ella (a_tug, weapon_moves.js): con el
  // jugador en axeSpot, de cara al norte y con las manos en el mango, la hoja
  // queda dentro de la madera; la de la estaca es la misma hacha, donde
  // quedaría (así, al agarrarla, las manos caen en su mango).
  buildAxe() {
    const g = this.g,
      p = g.player,
      rig = p.rig;
    const W = WEAPONS.hacha;
    const pose = sampleClip(weaponSet(W, rig).clips.a_tug, 0, {});
    resolveWeaponArms(pose, rig, W);
    // (la pose, con el jugador en el origen y de cara a +z)
    const o = p.obj;
    const pos0 = o.position.clone(),
      rot0 = o.rotation.clone();
    o.position.set(0, 0, 0);
    o.rotation.set(0, 0, 0);
    rig.apply(pose);
    o.updateMatrixWorld(true);
    const M = rig.joints.sword.matrixWorld.clone();
    o.position.copy(pos0);
    o.rotation.copy(rot0);
    o.updateMatrixWorld(true);
    // el centro del filo y hacia dónde entra en la madera (del personaje)
    const edge = new V3(...AXE_HEAD.edge).applyMatrix4(M);
    const eye = new V3(...AXE_HEAD.eye).applyMatrix4(M);
    const yaw = PI;
    const R = new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), yaw);
    const bd = edge.clone().sub(eye).applyQuaternion(R);
    const bh = new V3(bd.x, 0, bd.z).normalize();
    // (el filo, 5 cm dentro de la madera, por el lado de donde viene)
    const K = CHASE.stake;
    const B = new V3(K.x, 0, K.z).addScaledVector(bh, -(K.r - 0.05));
    const eW = edge.clone().applyQuaternion(R);
    const P = new V3(B.x - eW.x, CHASE.YE, B.z - eW.z);
    this.axeSpot = { x: P.x, y: P.y, z: P.z, yaw, bite: new V3(B.x, P.y + eW.y, B.z) };
    const axe = buildParts(WEAPON_PARTS.hacha('x')).group;
    new THREE.Matrix4().compose(P, R, new V3(1, 1, 1)).multiply(M).decompose(axe.position, axe.quaternion, axe.scale);
    this.g.scene.add(axe);
    this.axe = axe;
  }
  // Está en su estaca mientras nadie la haya arrancado (y la barricada siga
  // en pie).
  applyFlags() {
    const f = this.g.flags || {};
    if (this.axe) this.axe.visible = !f['take:i_hacha'] && !f['broken:barricada_norte'];
  }

  // ------------------------------------------------------------ atrezo propio
  // La pica (la tira), el sillar (lo tira) y la viga que arde en la torre.
  buildProps() {
    const g = this.g;
    const wood = objMat('wooddark'),
      iron = objMat('iron'),
      stone = objMat('wallstone'),
      fire = objMat('ember');
    // la pica: el asta partida con la moharra (eje +z; la punta, en z 1,72)
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
  // La revienta la Bestia al pasar: astillas, una lluvia de ascuas y el
  // fuego que se le queda pegado un momento.
  breakBeam() {
    if (this.beamBroken) return;
    const g = this.g;
    this.beamBroken = true;
    this.beam.visible = false;
    this.beamBox.enabled = false;
    const p = this.beam.position;
    g.fx.blood.emit(p.x, p.y, p.z, 40, { color: [0.14, 0.085, 0.05], speed: 5, life: 0.9, up: 2 });
    g.fx.blood.emit(p.x, p.y, p.z, 50, { color: [1, 0.55, 0.15], speed: 6, life: 0.9, up: 3 });
    g.fx.blood.emit(p.x, p.y + 0.4, p.z, 24, { color: [1, 0.85, 0.4], speed: 2.5, life: 1.4, up: 2.5, gravity: -0.6 });
    g.audio && g.audio.play('woodBreak', p);
    g.audio && g.audio.play('beastRoar', p);
    g.camRig.shake(0.5);
    g.input.rumble(0.8, 0.8, 300);
    this.embersT = 1.6;
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
  // hasta que el clip del jugador llegue a t (o acabe, o lo cambie otro)
  *waitPClip(t) {
    const p = this.g.player;
    const c = p.anim.clip;
    while (p.anim.clip === c && c && !p.anim.done && p.anim.t < t) yield;
  }
  *until(fn, max = 1e9) {
    let t = 0;
    while (!fn() && t < max) t += yield;
  }
  *prompt(o) {
    let res = null;
    this.g.qte.start({ ...o, onDone: (ok) => (res = ok) });
    while (res === null) yield;
    return res;
  }
  // un aviso que corre mientras pasa otra cosa: .ok es null hasta que se
  // resuelve
  promptAsync(o) {
    const r = { ok: null };
    this.g.qte.start({ ...o, onDone: (ok) => (r.ok = ok) });
    return r;
  }
  run(gen) {
    this.co = gen;
    this.bg = [];
    this.bgD = [];
  }
  // otra corrutina a la vez (p. ej. el jugador rueda mientras la Bestia salta)
  also(gen) {
    this.bg.push(gen);
  }
  *waitBg() {
    while (this.bg.length) yield;
  }

  // ------------------------------------------------------------ cámara
  // Un plano fijo (o que se acerca despacio: speed); o.hand, cámara al hombro.
  shot(pos, look, o = {}) {
    this.camFn = null;
    this.hand = o.hand ?? 0.04;
    this.cam = { pos: pos.clone ? pos.clone() : new V3(...pos), look: look.clone ? look.clone() : new V3(...look), speed: o.speed ?? 6, snap: !!o.snap, fov: o.fov ?? 55, roll: o.roll || 0 };
    return this.cam;
  }
  // Un travelling de un encuadre a otro en dur segundos (corre aparte: also).
  *move(pos0, look0, pos1, look1, dur, o = {}) {
    const P0 = new V3(...(pos0.isVector3 ? pos0.toArray() : pos0)),
      P1 = new V3(...(pos1.isVector3 ? pos1.toArray() : pos1)),
      L0 = new V3(...(look0.isVector3 ? look0.toArray() : look0)),
      L1 = new V3(...(look1.isVector3 ? look1.toArray() : look1));
    const c = this.shot(P0, L0, { ...o, snap: true });
    const f0 = o.fov ?? 55,
      f1 = o.fov1 ?? f0;
    for (let t = 0; t < dur; ) {
      t += yield;
      if (this.cam !== c) return;
      const u = sm(Math.min(1, t / dur));
      c.pos.lerpVectors(P0, P1, u);
      c.look.lerpVectors(L0, L1, u);
      c.fov = lerp(f0, f1, u);
    }
  }

  // Los planos de la carrera: una función que coloca la cámara en cada
  // fotograma, según por dónde van los dos.
  //   front  por delante, mirando atrás: el jugador que viene y la Bestia
  //          detrás (o.d: cuántos metros por delante; o.side: a qué lado;
  //          o.h: a qué altura; o.mix: hacia dónde mira, del jugador (0) a
  //          la Bestia (1))
  //   back   por encima del hombro de la Bestia: su lomo y, delante, el
  //          jugador que huye
  //   side   desde fuera de la muralla, a la par: los dos de perfil (o.out:
  //          a cuántos metros del adarve; o.lead: lo que se adelanta)
  //   fixed  quieta en o.pos, siguiéndoles con la mirada: pasan por delante
  runShot(kind, o = {}) {
    const g = this.g,
      p = g.player,
      b = this.beast;
    const q = {},
      P = new V3(),
      L = new V3(),
      look = new V3();
    let first = true;
    this.hand = o.hand ?? 0.07;
    this.camFn = (dt) => {
      const pp = p.pos,
        bp = b.pos;
      if (kind === 'front') {
        this.path.at(this.sRun + (o.d ?? 5.5), q);
        const sd = o.side ?? 0.8;
        P.set(q.x - q.tz * sd, 0, q.z + q.tx * sd);
        P.y = g.world.col.groundHeight(P.x, P.z, 0.2, pp.y + 5) + (o.h ?? 1.5);
        L.copy(pp).lerp(bp, b.visible ? o.mix ?? 0.35 : 0);
        L.y = pp.y + (o.ly ?? 1.45) + b.lift * 0.4;
      } else if (kind === 'back') {
        this.path.at(this.sB - (o.d ?? 3.0), q);
        const sd = o.side ?? -1.0;
        P.set(q.x - q.tz * sd, bp.y + (o.h ?? 4.4), q.z + q.tx * sd);
        // (dentro de una torre, por debajo de su techo)
        const up = g.world.col.raycast(P.x, bp.y + 1.5, P.z, 0, 1, 0, 6, (bx) => bx.cam !== false);
        if (up !== Infinity) P.y = Math.min(P.y, bp.y + 1.5 + up - 0.45);
        this.path.at(this.sRun + 2.5, q);
        L.set((pp.x + q.x) / 2, pp.y + (o.ly ?? 1.1), (pp.z + q.z) / 2);
      } else if (kind === 'side') {
        this.path.at((this.sRun + (b.visible ? this.sB : this.sRun)) / 2 + (o.lead ?? 2), q);
        // (alta: si no, las almenas tapaban el adarve y la Bestia parecía ir
        // por encima del parapeto)
        const out = o.out ?? 8;
        P.set(q.x - q.tz * out, pp.y + (o.h ?? 5.0), q.z + q.tx * out);
        L.set(q.x, pp.y + (o.ly ?? 1.0), q.z);
      } else {
        P.set(o.pos[0], o.pos[1], o.pos[2]);
        L.copy(pp).lerp(bp, b.visible ? o.mix ?? 0.25 : 0);
        L.y = lerp(pp.y, bp.y, b.visible ? o.mix ?? 0.25 : 0) + (o.ly ?? 1.3);
      }
      // (la mirada, suavizada: la marcha no la hace temblar)
      if (first) look.copy(L);
      else look.lerp(L, 1 - Math.exp(-(o.lookK ?? 7) * dt));
      // (que no se meta en los muros: desde lo que mira hacia ella)
      if (kind === 'front' || kind === 'back') camSafe(g, look, P, 0.35);
      this.cam = { pos: P.clone(), look: look.clone(), fov: o.fov ?? 58, snap: true, roll: o.roll || 0 };
      first = false;
    };
  }

  releaseCam(yaw = null) {
    const g = this.g;
    this.cam = null;
    this.camFn = null;
    this.hand = 0;
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
    const c = typeof name === 'string' ? p.clips[name] : name;
    if (c) p.anim.play(c, { blend: o.blend ?? 0.08, speed: o.speed ?? 1, t0: o.t0 ?? 0 });
  }
  // el suelo bajo (x, z), cerca de y
  gy(x, z, y) {
    return this.g.world.col.groundHeight(x, z, 0.2, y + 1);
  }
  // Un golpe que no se para: daño, sangre, temblor; si se acaba la vida,
  // muere (y se vuelve a empezar desde el último punto de control).
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
      this.autoV = 0;
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
    this.lock = true;
    this.cp = 'start';
    this.beastOverGap = false;
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
    this.lock = true;
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
    this.bg = [];
    this.follow = false;
    this.lock = false;
    this.autoV = 0;
    this.cam = null;
    this.camFn = null;
    this.hand = 0;
    g.chaseRun = false;
    g.qte.cancel();
    this.beast.hide();
    this.beast.stopClip(0);
    this.fadeK = 1;
    this.beast.setFade(1);
    this.pike.visible = false;
    this.pikeFly = this.pikeLoose = this.pikeStuck = null;
    this.rock.visible = false;
    this.rockFly = null;
    this.rockHeld = this.pikeHeld = false;
    this.restoreBeam();
    this.setBars(0);
    this.applyFlags();
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
    // muerto: se para todo (vuelve a empezar al reaparecer)
    if (p.dead) {
      if (!this.deadSeen) {
        this.deadSeen = true;
        this.co = null;
        this.bg = [];
        this.bgD = [];
        this.camFn = null;
        g.qte.cancel();
        this.follow = false;
        this.autoV = 0;
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
    this.sP = this.path.project(p.pos.x, p.pos.z);
    if (this.co) {
      const r = this.co.next(dt);
      if (r.done) this.co = null;
    }
    for (let i = this.bg.length - 1; i >= 0; i--) if (this.bg[i].next(dt).done) this.bg.splice(i, 1);
    const D = this.bgD;
    if (D) for (let i = D.length - 1; i >= 0; i--) if (D[i].next(dt).done) D.splice(i, 1);
    if (this.follow) this.followStep(dt);
    b.update(dt);
    // (el Empalado, mientras se transforma, lo anima el guion)
    if (this.e && this.e.scripted && this.e.obj.visible) this.e.animate(dt);
    this.tick(dt);
    this.updateProps(dt);
    // corriendo detrás, brama de vez en cuando (se la oye venir)
    if (this.follow && b.visible && !b.clipName) {
      this.roarT -= dt;
      if (this.roarT <= 0) {
        this.roarT = 2.4 + Math.random() * 2;
        g.audio && g.audio.play('beastRoar', b.pos);
        b.jawS.kick(7);
      }
    }
    // la cámara del guion (con su vaivén, si va al hombro)
    if (this.camFn) this.camFn(dt);
    const cr = g.camRig;
    if (this.cam) {
      const c = this.cam;
      this._cp.copy(c.pos);
      this._cl.copy(c.look);
      if (this.hand > 0) {
        this.handT += dt;
        const h = this.hand,
          t = this.handT;
        this._cp.x += noise(t, 1) * h * 0.4;
        this._cp.y += noise(t, 2) * h * 0.3;
        this._cp.z += noise(t, 3) * h * 0.4;
        this._cl.x += noise(t * 0.8, 4) * h;
        this._cl.y += noise(t * 0.8, 5) * h * 0.8;
        this._cl.z += noise(t * 0.8, 6) * h;
      }
      cr.override = { pos: this._cp, look: this._cl, fov: c.fov, roll: c.roll, speed: c.speed, snap: c.snap };
    }
    // la cámara dentro de la Bestia: no se dibuja
    const cc = cr.cam.position;
    b.obj.visible = b.visible && !(Math.hypot(cc.x - b.pos.x, cc.z - b.pos.z) < 1.3 && cc.y > b.pos.y + b.lift - 0.2 && cc.y < b.pos.y + b.lift + 3.9);
  }

  // ------------------------------------------------------------ la carrera
  // El jugador echa a correr (o sigue corriendo) desde donde está, por el
  // recorrido: lo que se haya apartado del centro del adarve (tras rodar a
  // un lado) lo recupera poco a poco.
  goRun(v = RUNV, o = {}) {
    const p = this.g.player;
    this.puppet(true);
    this.sRun = this.path.project(p.pos.x, p.pos.z);
    const q = this.path.at(this.sRun, this._pt);
    this.lat = clamp(-(p.pos.x - q.x) * q.tz + (p.pos.z - q.z) * q.tx, -1.5, 1.5);
    this.latT = o.lat ?? 0;
    this.autoV = v;
    // (que la marcha no arranque con un clip a medias)
    if (p.anim.clip && !o.keepClip) p.anim.stop(0.18);
  }
  stopRun() {
    const p = this.g.player;
    this.autoV = 0;
    p.vx = p.vz = 0;
  }
  // Un paso de la carrera (en tick): por el recorrido, con las esquinas
  // redondeadas y siguiendo el suelo (las escaleras).
  runStep(dt) {
    const g = this.g,
      p = g.player;
    const v = this.autoV;
    this.sRun = Math.min(this.path.len - 0.3, this.sRun + v * dt);
    const R = 1.2;
    const a = this.path.at(this.sRun - R, this._pa),
      c = this.path.at(this.sRun + R, this._pc);
    const q = this.path.at(this.sRun, this._pt);
    this.lat = damp(this.lat, this.latT, 2.2, dt);
    const x = (a.x + c.x) / 2 - q.tz * this.lat,
      z = (a.z + c.z) / 2 + q.tx * this.lat;
    const y = g.world.col.groundHeight(x, z, 0.2, p.pos.y + 0.9);
    const dx = c.x - a.x,
      dz = c.z - a.z,
      dl = Math.hypot(dx, dz) || 1;
    this.setP(x, y, z);
    p.yaw = dampAngle(p.yaw, Math.atan2(dx, dz), 9, dt);
    p.vx = (dx / dl) * v;
    p.vz = (dz / dl) * v;
    p.exert = 1;
    p.body.grounded = true;
  }

  // La Bestia corre detrás, a gapT metros por el recorrido: si se queda
  // atrás, acelera (hasta 12,5 m/s); si se acerca demasiado, afloja.
  followStep(dt) {
    const g = this.g,
      p = g.player,
      b = this.beast;
    const want = this.sRun - this.gapT;
    const vt = clamp(this.autoV + (want - this.sB) * 1.5, 0, 12.5);
    this.vB = damp(this.vB, vt, 3.5, dt);
    let v = this.vB;
    // ya no hay a dónde ir (lo alto del fanal)
    v = Math.min(v, Math.max(0, (this.path.len - 0.8 - this.sB) / Math.max(dt, 1e-3)));
    // (ni el hueco del adarve: lo salta el guion)
    if (!this.beastOverGap) {
      const edge = this.path.project(CHASE.gap.from + 0.4, -124);
      if (this.sB < edge + 1) v = Math.min(v, Math.max(0, (edge - this.sB) / Math.max(dt, 1e-3)));
    }
    this.sB += v * dt;
    const pt = this.path.at(this.sB, this._pt);
    this.latB = damp(this.latB, 0, 1.5, dt);
    const x = pt.x - pt.tz * this.latB,
      z = pt.z + pt.tx * this.latB;
    const gy = g.world.col.groundHeight(x, z, 0.2, pt.y + 1.2);
    b.pos.set(x, gy, z);
    b.groundY = gy;
    b.vx = pt.tx * v;
    b.vz = pt.tz * v;
    // de cara al recorrido; de cerca, hacia el jugador
    const toP = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
    const yt = Math.atan2(pt.tx, pt.tz);
    const near = clamp(1 - (this.sRun - this.sB - 2) / 5, 0, 1);
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
  }

  onBeastStep(side, w) {
    const g = this.g,
      b = this.beast,
      c = g.camRig.cam.position;
    if (!b.visible || w < 0.3) return;
    // (tiembla según lo cerca que pise de la cámara)
    const d = Math.hypot(c.x - b.pos.x, c.z - b.pos.z);
    if (d < 22) g.camRig.shake(0.16 * (1 - d / 22) + 0.03);
    g.audio && g.audio.play('beastStep', b.pos);
    const f = b.point('foot' + side, this._a);
    g.fx.blood.emit(f.x, b.pos.y + 0.05, f.z, 6, { color: [0.3, 0.28, 0.25], speed: 1.6, life: 0.6, up: 0.6, gravity: 2 });
  }

  onBeastEvent(n) {
    const g = this.g,
      b = this.beast;
    if (n === 'roar') {
      g.audio && g.audio.play(b.clipName === 'bigRoar' ? 'beastRoarBig' : 'beastRoar', b.pos);
      g.camRig.shake(0.7);
      g.input.rumble(0.8, 1, 500);
      const h = b.point('head', this._a);
      if (g.camRig.cam.position.y > b.pos.y + 0.8) g.combat.ring(h.x, b.pos.y + 0.1, h.z, 7, 0xb02818, 1.0);
    }
    if (n === 'hit' && (b.clipName === 'swipe' || b.clipName === 'bash' || b.clipName === 'grab')) g.audio && g.audio.play('swingHeavy', b.pos);
    // se arranca los cuernos de la piedra: cascotes, polvo y el bramido
    if (n === 'free') {
      const h = b.point('head', this._a);
      g.fx.blood.emit(h.x, h.y, h.z, 50, { color: [0.36, 0.33, 0.3], speed: 5.5, up: 2, life: 1 });
      g.fx.blood.emit(h.x, h.y, h.z, 20, { color: [0.42, 0.4, 0.37], speed: 7, up: 2.5, life: 0.8, gravity: 14 });
      g.audio && g.audio.play('wallBreak', h);
      g.audio && g.audio.play('beastRoarBig', b.pos);
      g.camRig.shake(0.8);
      g.input.rumble(1, 1, 450);
    }
  }

  updateProps(dt) {
    const g = this.g;
    // la viga echa chispas
    if (this.beam.visible && Math.random() < dt * 14) {
      const q = this.beam.position;
      g.fx.blood.emit(q.x + (Math.random() - 0.3) * 1.6, q.y + 0.25, q.z, 2, { color: [1, 0.5, 0.12], speed: 0.8, life: 0.7, up: 2, gravity: -1 });
    }
    // (tras reventarla, la Bestia lleva ascuas pegadas un momento)
    if (this.embersT > 0) {
      this.embersT -= dt;
      const b = this.beast;
      if (b.visible && Math.random() < dt * 30) {
        const h = b.point(Math.random() < 0.5 ? 'chest' : 'head', this._a);
        g.fx.blood.emit(h.x, h.y, h.z, 2, { color: [1, 0.55, 0.15], speed: 1.2, life: 0.6, up: 1.2, gravity: -0.8 });
      }
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
    this.autoV = 0;
    g.lockTarget = null;
    g.activeBoss = null;
    g.qte.cancel();
    // a sus sitios (la cámara corta a él)
    const E = new V3(...ARENA.E);
    const PP = new V3(...ARENA.P);
    e.scripted = true;
    e.atk = null;
    // (el destello del golpe que le ha transformado: sin su update se quedaba
    // encendido, y todo el cuerpo de un color plano)
    e.flash = 0;
    if (e._flashing) {
      e.rig.setTint(null, null);
      e._flashing = false;
    }
    e.state = 'stagger';
    e.stT = 0;
    e.vx = e.vz = 0;
    e.body.pos.copy(E);
    e.yaw = Math.atan2(PP.x - E.x, PP.z - E.z);
    e.anim.speed = 1;
    e.anim.play(IMP_CLIPS.stagger, { blend: 0.08 });
    this.puppet(true);
    this.setP(PP.x, this.gy(PP.x, PP.z, PP.y), PP.z, Math.atan2(E.x - PP.x, E.z - PP.z));
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
      // se hincha y tiembla; la carne late, roja (un brillo que va y viene:
      // si se queda fijo y fuerte, la carne parecía de un color plano, sin
      // luces ni sombras)
      const sw = 1 + 0.18 * sm(u);
      e.obj.scale.set(sw * (1 + Math.sin(t * 31) * 0.02 * u), sw * (1 + Math.sin(t * 27) * 0.015 * u), sw);
      e.obj.rotation.z = Math.sin(t * 23) * 0.03 * u;
      const pulse = Math.max(0, Math.sin(t * 11)) ** 2;
      red.setRGB(0.26 * u * (0.25 + 0.75 * pulse), 0.018 * u * pulse, 0.008 * u * pulse);
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
    // ---- RECULAS: la Bestia viene a por ti; el zarpazo
    yield* this.coRetreat();
    if (p.dead) return;
    // ---- EL HACHA: la arrancas de la estaca
    yield* this.coAxe();
    if (p.dead) return;
    // ---- EL MAZAZO: ruedas y le hundes el hacha en el antebrazo
    yield* this.coFirstBlood();
    if (p.dead) return;
    // ---- LA PICA: te la tira; te tiras a un lado y se clava en la barricada
    yield* this.coPike();
    if (p.dead) return;
    // ---- LA EMBESTIDA: se estrella contra la barricada; los hachazos; y a
    // correr
    yield* this.coCharge();
  }

  // ======================================================================
  // RECULAS HASTA LA BARRICADA
  // ======================================================================
  // La Bestia avanza a zancadas y tú reculas, de cara a ella. A medio camino
  // te lanza un zarpazo: ¡Esquiva! (te echas atrás de un salto y las garras
  // pasan por delante de tu cara; si no, te alcanza y te estampa contra la
  // barricada). Y sigues hasta tener la espalda contra la madera.
  *coRetreat() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    const A = this.axeSpot;
    b.stopClip(0.35);
    const P0 = p.pos.clone();
    const P1 = new V3(73.95, P0.y, -63.75);
    // ---- 1. desde lo alto de la barricada, a la espalda del que recula
    this.shot(new V3(75.5, A.y + 3.1, -67.9), b.pos.clone().lerp(P1, 0.5).add(new V3(0, 1.1, 0)), { snap: true, fov: 54, hand: 0.05 });
    yield* this.backpedal(P0, P1, 1.9, 1.25, 3.0);
    // ---- 2. el zarpazo: de lado y a ras, la zarpa por delante de la cara
    b.play('swipe', { blend: 0.12 });
    const toB = new V3(b.pos.x - p.pos.x, 0, b.pos.z - p.pos.z).normalize();
    const side = new V3(-toB.z, 0, toB.x);
    if (side.x < 0) side.negate();
    const mid = p.pos.clone().lerp(b.pos, 0.45);
    this.shot(mid.clone().addScaledVector(side, 4.6).add(new V3(0, 1.0, 0)), mid.clone().add(new V3(0, 1.55, 0)), { snap: true, fov: 52, hand: 0.05 });
    yield* this.waitClip(0.24);
    const ok = yield* this.prompt({ action: 'dodge', label: '¡Esquiva!', window: 0.85, slow: 0.25 });
    if (ok) {
      // atrás, de un salto: la zarpa pasa rozándole
      this.pClip('backstep', { blend: 0.04, speed: 0.85 });
      g.audio && g.audio.play('roll', p.pos);
      const f = p.pos.clone(),
        to = new V3(...ARENA.swipe);
      for (let t = 0; t < 0.42; ) {
        t += yield;
        const u = 1 - (1 - Math.min(1, t / 0.42)) ** 2;
        this.setP(lerp(f.x, to.x, u), f.y, lerp(f.z, to.z, u));
      }
      yield* this.waitClip(0.47);
      g.slowmo = { t: 0.3, k: 0.3 };
      this.clawWinch();
      yield* this.waitClip(0.95);
    } else {
      yield* this.waitClip(0.48);
      this.clawWinch();
      this.hurtPlayer(16, b.pos.x, b.pos.z);
      if (p.dead) return;
      // te estampa contra la barricada
      this.pClip('fallBack', { blend: 0.04 });
      const f = p.pos.clone(),
        to = new V3(A.x + 0.35, A.y, A.z + 0.45);
      for (let t = 0; t < 0.4; ) {
        t += yield;
        const u = sm(t / 0.4);
        this.setP(lerp(f.x, to.x, u), f.y, lerp(f.z, to.z, u));
      }
      g.audio && g.audio.play('woodHit', p.pos);
      g.camRig.shake(0.4);
      yield* this.wait(0.3);
      this.pClip('getup', { blend: 0.05 });
      yield* this.wait(0.95);
    }
    // ---- 3. hasta la madera, por encima de su hombro: ella delante
    this.shot(new V3(A.x + 1.25, A.y + 1.75, A.z - 0.72), b.pos.clone().add(new V3(0, 1.9, 0)), { snap: true, fov: 52, hand: 0.05 });
    yield* this.backpedal(p.pos.clone(), new V3(A.x, A.y, A.z), 0.85, 1.3, 3.2);
    // la espalda contra la madera
    g.audio && g.audio.play('woodHit', { x: CHASE.stake.x, y: A.y + 1.2, z: CHASE.stake.z });
    g.camRig.shake(0.18);
  }

  // Las garras que no le alcanzan siguen y revientan el torno del rastrillo
  // del Postigo (estaba en medio: y así no tapa lo que viene).
  clawWinch() {
    const g = this.g,
      B = g.breakables;
    if (!B) return;
    const it = B.list.find((x) => x.id === 'torno_postigo' && !x.broken);
    if (!it) return;
    B.shatter(it, this.beast.pos);
    g.audio && g.audio.play('woodBreak', { x: it.x, y: it.y + 1, z: it.z });
    g.camRig.shake(0.5);
  }

  // Recula de 'from' a 'to' en dur segundos, de cara a la Bestia (la marcha
  // anda hacia atrás); ella avanza a vb m/s hasta quedar a minD.
  *backpedal(from, to, dur, vb, minD = 3.0) {
    const p = this.g.player,
      b = this.beast;
    const d = from.distanceTo(to) || 1;
    for (let t = 0; t < dur; ) {
      const dt = yield;
      t += dt;
      const u = Math.min(1, t / dur);
      const k = sm(u);
      const x = lerp(from.x, to.x, k),
        z = lerp(from.z, to.z, k);
      this.setP(x, this.gy(x, z, from.y), z);
      p.yaw = Math.atan2(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
      const sp = (6 * u * (1 - u) * d) / dur;
      p.vx = ((to.x - from.x) / d) * sp;
      p.vz = ((to.z - from.z) / d) * sp;
      const dx = p.pos.x - b.pos.x,
        dz = p.pos.z - b.pos.z,
        dd = Math.hypot(dx, dz) || 1;
      const v = dd > minD ? vb : 0;
      b.pos.x += (dx / dd) * v * dt;
      b.pos.z += (dz / dd) * v * dt;
      b.vx = (dx / dd) * v;
      b.vz = (dz / dd) * v;
      b.yaw = dampAngle(b.yaw, Math.atan2(dx, dz), 6, dt);
    }
    p.vx = p.vz = 0;
    b.vx = b.vz = 0;
  }

  // ======================================================================
  // EL HACHA DE LA ESTACA
  // ======================================================================
  // La espalda contra la madera y, al lado, el mango del hacha clavada en la
  // estaca. ¡Arráncala! (machacando): forcejeas, el cuerpo echado atrás y
  // las manos en el mango, mientras ella se acerca a zancadas y ruge; de un
  // tirón sale de la madera entre astillas, te vuelves con ella en alto y es
  // tuya. Si no te da tiempo, la Bestia llega y te barre de un manotazo: con
  // el golpe se arranca de la estaca y caes con ella en las manos.
  *coAxe() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    const A = this.axeSpot;
    const bite = A.bite;
    // se vuelve hacia la estaca y agarra el mango: el hacha, clavada hasta el
    // ojo, en primer plano (la suya, la misma, no se ve hasta arrancarla)
    this.armAxe(false);
    this.pClip('a_tug', { blend: 0.32, speed: 1.4 });
    const y0 = p.yaw;
    this.shot(bite.clone().add(new V3(1.2, 0.2, 0.95)), bite.clone().add(new V3(-0.22, -0.1, 0.3)), { snap: true, fov: 42, hand: 0.03 });
    for (let t = 0; t < 0.35; ) {
      t += yield;
      p.yaw = y0 + angleDiff(y0, A.yaw) * sm(t / 0.35);
    }
    p.yaw = A.yaw;
    // ¡Arráncala!: forcejea; detrás, ella se le viene encima
    let ok = null;
    g.qte.start({ action: 'interact', label: '¡Arráncala!', window: 2.8, mash: 7, slow: 0.45, onDone: (r) => (ok = r) });
    let creak = 0.2,
      tc = 0,
      cut = 0;
    while (ok === null) {
      const dt = yield;
      tc += dt;
      // la madera cruje con los tirones
      creak -= dt;
      if (creak <= 0) {
        creak = 0.3;
        g.audio && g.audio.play('woodHit', bite);
        g.fx.blood.emit(bite.x, bite.y, bite.z, 3, { color: [0.3, 0.2, 0.12], speed: 1.2, life: 0.5, up: 0.4, gravity: 6 });
        g.camRig.shake(0.05);
      }
      // ella, a zancadas, hasta tenerle a un brazo
      const dx = p.pos.x - b.pos.x,
        dz = p.pos.z - b.pos.z,
        dd = Math.hypot(dx, dz) || 1;
      const v = dd > 2.7 ? 0.9 : 0;
      b.pos.x += (dx / dd) * v * dt;
      b.pos.z += (dz / dd) * v * dt;
      b.vx = (dx / dd) * v;
      b.vz = (dz / dd) * v;
      b.yaw = dampAngle(b.yaw, Math.atan2(dx, dz), 6, dt);
      // los planos: el mango y las manos; los dos, desde el poniente; y por
      // encima del hombro de ella, que ruge
      if (cut === 0 && tc > 0.42) {
        cut = 1;
        const m = p.pos.clone().lerp(b.pos, 0.5);
        this.shot(new V3(69.9, A.y + 1.45, m.z + 0.9), m.clone().add(new V3(0, 1.45, 0)), { snap: true, fov: 54, hand: 0.05 });
      } else if (cut === 1 && tc > 0.92) {
        cut = 2;
        b.play('roar', { blend: 0.3 });
        const back = new V3(b.pos.x - p.pos.x, 0, b.pos.z - p.pos.z).normalize();
        const sd = new V3(-back.z, 0, back.x);
        if (sd.x < 0) sd.negate();
        this.shot(b.pos.clone().addScaledVector(back, 2.0).addScaledVector(sd, 1.1).add(new V3(0, 3.9, 0)), bite.clone().add(new V3(0.1, -0.3, 0.4)), { snap: true, fov: 50, hand: 0.05 });
      }
    }
    b.vx = b.vz = 0;
    if (ok) {
      yield* this.yankAxe();
      return;
    }
    // no sale a tiempo: la Bestia llega y te barre de un manotazo; el golpe
    // la arranca de la estaca y caes con ella en las manos
    const toP = new V3(p.pos.x - b.pos.x, 0, p.pos.z - b.pos.z).normalize();
    const side = new V3(-toP.z, 0, toP.x);
    if (side.x > 0) side.negate();
    const bf = b.pos.clone(),
      bt = p.pos.clone().addScaledVector(toP, -2.3);
    bt.y = bf.y;
    b.play('bash', { blend: 0.06 });
    this.shot(p.pos.clone().addScaledVector(side, 4.2).add(new V3(0, 1.4, 0)), p.pos.clone().lerp(b.pos, 0.4).add(new V3(0, 1.4, 0)), { snap: true, fov: 54 });
    for (let t = 0; t < 0.34; ) {
      const dt = yield;
      t += dt;
      b.pos.lerpVectors(bf, bt, sm(t / 0.3));
      b.yaw = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
    }
    this.axe.visible = false;
    this.splinters(bite, 0.7);
    g.audio && g.audio.play('woodBreak', bite);
    this.takeAxe();
    this.hurtPlayer(16, b.pos.x, b.pos.z);
    if (p.dead) return;
    this.pClip('fallBack', { blend: 0.04 });
    const from = p.pos.clone(),
      to = from.clone().add(new V3(1.4, 0, 0.5));
    for (let t = 0; t < 0.45; ) {
      t += yield;
      const u = sm(t / 0.45);
      this.setP(lerp(from.x, to.x, u), from.y, lerp(from.z, to.z, u));
    }
    this.pClip('getup', { blend: 0.05 });
    yield* this.wait(0.95);
    p.yaw = Math.atan2(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
  }

  // De un tirón: la hoja sale de la madera entre astillas, el cuerpo se va
  // atrás de un paso y el hacha sube por encima de la cabeza mientras te
  // vuelves hacia la Bestia; luego, a la guardia. Es tuya.
  *yankAxe() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    const A = this.axeSpot;
    this.axe.visible = false;
    this.pClip('a_yank', { blend: 0.03 });
    this.splinters(A.bite, 1);
    g.audio && g.audio.play('woodBreak', A.bite);
    g.audio && g.audio.play('swingAxe', p.pos);
    g.camRig.shake(0.55);
    g.input.rumble(1, 0.8, 380);
    g.hitstop = Math.max(g.hitstop, 0.1);
    g.slowmo = { t: 0.7, k: 0.3 };
    this.takeAxe();
    // de héroe: bajo, desde el poniente, con la Bestia detrás
    const toB = new V3(b.pos.x - p.pos.x, 0, b.pos.z - p.pos.z).normalize();
    const w = new V3(-toB.z, 0, toB.x);
    if (w.x > 0) w.negate();
    this.shot(p.pos.clone().addScaledVector(w, 2.7).addScaledVector(toB, -0.5).add(new V3(0, 0.95, 0)), p.pos.clone().addScaledVector(toB, 2.2).add(new V3(0, 1.75, 0)), { snap: true, fov: 56, hand: 0.03 });
    const y0 = p.yaw;
    const yB = Math.atan2(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
    const from = p.pos.clone();
    for (let t = 0; t < 1.35; ) {
      const dt = yield;
      t += dt;
      p.yaw = y0 + angleDiff(y0, yB) * sm((t - 0.12) / 0.6);
      const s = sm(t / 0.3) * 0.35;
      this.setP(from.x - Math.sin(y0) * s, from.y, from.z - Math.cos(y0) * s);
      // (el plano se abre despacio)
      if (this.cam) this.cam.pos.addScaledVector(w, 0.25 * dt);
    }
  }

  // Empuña el hacha (show: que se vea; mientras forcejea con la de la estaca,
  // la suya no): el escudo, a la espalda.
  armAxe(show) {
    const p = this.g.player;
    if (p.weaponId !== 'hacha') p.equipWeapon('hacha');
    p.setEquipment(true, p.hasShield);
    p.rig.joints.sword.visible = !!show;
  }
  // El hacha es tuya: al inventario (y a la partida), empuñada.
  takeAxe() {
    const g = this.g;
    if (!g.inventory.has('hacha')) g.inventory.add('hacha');
    g.flags['take:i_hacha'] = true;
    this.axe.visible = false;
    this.armAxe(true);
    g.ui.toast(MSG.hachaArrancada, 3.2);
  }
  // (si se vuelve a la huida sin haberla arrancado —se salió a mitad de la
  // escena—, ya la lleva)
  ensureAxe() {
    const g = this.g;
    this.axe.visible = false;
    if (!g.inventory.has('hacha')) g.inventory.add('hacha');
    g.flags['take:i_hacha'] = true;
    this.armAxe(true);
  }
  // Astillas y polvo de la madera, al salir la hoja.
  splinters(at, k = 1) {
    const g = this.g;
    g.fx.blood.emit(at.x, at.y, at.z, Math.round(34 * k), { color: [0.42, 0.3, 0.18], speed: 6, life: 0.8, up: 1.6 });
    g.fx.blood.emit(at.x, at.y, at.z, Math.round(16 * k), { color: [0.22, 0.15, 0.09], speed: 3.5, life: 1.0, up: 1.0, gravity: 5 });
    g.fx.blood.emit(at.x, at.y, at.z, Math.round(10 * k), { color: [0.5, 0.46, 0.4], speed: 1.6, life: 1.4, up: 0.5, gravity: 1.2 });
  }
  // Las losas que revientan bajo un golpe (los puños, la caída de un salto).
  slamFx(L, k = 1) {
    const g = this.g;
    g.camRig.shake(0.8 * k);
    g.input.rumble(1, 1, 350);
    g.audio && g.audio.play('slam', L);
    g.audio && g.audio.play('pillarBreak', L);
    g.combat.ring(L.x, L.y + 0.05, L.z, 3.6 * k, 0x8a6a50, 0.6);
    g.fx.blood.emit(L.x, L.y + 0.2, L.z, Math.round(46 * k), { color: [0.3, 0.27, 0.24], speed: 4.5, up: 1.8, life: 0.9 });
    g.fx.blood.emit(L.x, L.y + 0.1, L.z, Math.round(24 * k), { color: [0.42, 0.4, 0.37], speed: 6, up: 2.6, life: 0.8, gravity: 14 });
  }

  // ======================================================================
  // EL MAZAZO Y EL PRIMER HACHAZO
  // ======================================================================
  // Con el hacha en las manos, la Bestia se te echa encima con los dos puños
  // en alto: ¡Esquiva! (ruedas a su derecha y los puños revientan las losas
  // donde estabas). Con los puños aún hundidos en el suelo, el antebrazo
  // queda a tiro: ¡Golpea! (le hundes el hacha y lo retira bramando). Si no
  // ruedas, te aplasta; si no golpeas, se revuelve y te barre.
  *coFirstBlood() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    const toP = new V3(p.pos.x - b.pos.x, 0, p.pos.z - b.pos.z).normalize();
    const bf = b.pos.clone(),
      bt = p.pos.clone().addScaledVector(toP, -2.3);
    bt.y = bf.y;
    // a su derecha (y la del jugador, hacia el este)
    const rt = new V3(-toP.z, 0, toP.x);
    if (rt.x < 0) rt.negate();
    b.play('smash', { blend: 0.1 });
    // de lado y bajo: los dos, y los puños que suben
    const mid = p.pos.clone().lerp(bt, 0.5);
    this.shot(mid.clone().addScaledVector(rt, -5.8).add(new V3(0, 0.85, 0)), mid.clone().add(new V3(0, 1.75, 0)), { snap: true, fov: 52, hand: 0.05 });
    for (let t = 0; t < 0.35; ) {
      const dt = yield;
      t += dt;
      b.pos.lerpVectors(bf, bt, sm(t / 0.35));
      b.vx = (toP.x * 2.3) / 0.35;
      b.vz = (toP.z * 2.3) / 0.35;
      b.yaw = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
    }
    b.vx = b.vz = 0;
    p.yaw = Math.atan2(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
    yield* this.waitClip(0.42);
    const ok = yield* this.prompt({ action: 'dodge', label: '¡Esquiva!', window: 0.8, slow: 0.25 });
    const roll = p.pos.clone().addScaledVector(rt, 1.9).addScaledVector(toP, 0.15);
    if (ok) this.also(this.dodgeTo([roll.x, p.pos.y, roll.z], 0.55));
    yield* this.waitClip(0.73);
    // los puños revientan las losas
    const F = b.point('handL', new V3()).lerp(b.point('handR', this._a), 0.5);
    F.y = this.gy(F.x, F.z, b.pos.y);
    this.slamFx(F, 1.1);
    if (!ok) {
      this.hurtPlayer(24, b.pos.x, b.pos.z, { shake: 1 });
      if (p.dead) return;
      this.pClip('fallBack', { blend: 0.04 });
      const f = p.pos.clone(),
        to = f.clone().addScaledVector(toP, 1.0);
      for (let t = 0; t < 0.4; ) {
        t += yield;
        const u = sm(t / 0.4);
        this.setP(lerp(f.x, to.x, u), f.y, lerp(f.z, to.z, u));
      }
      yield* this.wait(0.35);
      this.pClip('getup', { blend: 0.05 });
      yield* this.wait(0.95);
      yield* this.waitClip(10);
      return;
    }
    yield* this.waitBg();
    // ---- los puños aún en el suelo (le cuesta sacarlos de las losas):
    // ¡Golpea!, el antebrazo
    b.anim.speed = 0.14;
    const fore = b.point('foreR', new V3());
    const toF = new V3(fore.x - p.pos.x, 0, fore.z - p.pos.z).normalize();
    p.yaw = Math.atan2(toF.x, toF.z);
    // de lado, bajo, desde el sur (la barricada, detrás): el hacha, el
    // antebrazo y, encima, la testuz
    {
      const c = p.pos.clone().lerp(fore, 0.5);
      const sd = new V3(-toF.z, 0, toF.x);
      if (sd.z < 0) sd.negate();
      c.addScaledVector(sd, 3.6).add(new V3(0, 0.95, 0));
      c.z = Math.max(c.z, -66.6);
      this.shot(c, fore.clone().lerp(b.point('head', this._a), 0.3), { snap: true, fov: 52, hand: 0.05 });
    }
    const ok2 = yield* this.prompt({ action: 'light', label: '¡Golpea!', window: 0.8, slow: 0.3 });
    if (ok2) {
      this.pClip('a_light3', { blend: 0.05, speed: 1.25 });
      g.audio && g.audio.play('swingAxe', p.pos);
      yield* this.waitPClip(0.56);
      const h = b.point('foreR', this._a);
      g.fx.blood.emit(h.x, h.y, h.z, 70, { speed: 6, up: 2 });
      g.fx.blood.emit(h.x, h.y, h.z, 24, { speed: 2.5, up: 3, life: 1.1 });
      g.combat.impactFlash(h.x, h.y, h.z, 1.6, 0xff9070);
      g.audio && g.audio.play('hitAxe', h);
      g.audio && g.audio.play('beastHurt', b.pos);
      g.hitstop = Math.max(g.hitstop, 0.14);
      g.slowmo = { t: 0.5, k: 0.35 };
      g.camRig.shake(0.7);
      g.input.rumble(1, 0.9, 300);
      b.anim.speed = 1;
      b.play('recoil', { blend: 0.05 });
      b.flinch.kick(-16);
      b.jawS.kick(9);
      yield* this.wait(0.75);
    } else {
      // se revuelve y te barre con la otra mano
      b.anim.speed = 1;
      b.play('bash', { blend: 0.06 });
      yield* this.waitClip(0.34);
      this.hurtPlayer(14, b.pos.x, b.pos.z);
      if (p.dead) return;
      yield* this.knockBack(1.4);
      yield* this.waitClip(0.9);
    }
  }

  // ======================================================================
  // LA PICA
  // ======================================================================
  // Recula bramando, se arranca la pica de la espalda y te la tira como una
  // lanza. ¡Esquiva!: te tiras a un lado y pasa silbando (a cámara lenta) y
  // se clava en la barricada, donde estabas, temblando. Si no, te roza el
  // hombro y te tumba (y se clava igual). Se queda ahí hasta que la Bestia
  // revienta la barricada (y entonces cae).
  *coPike() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    // tú, a la barricada (de cara a ella); ella recula
    const Q = new V3(73.95, 9, -66.3);
    const BT = new V3(74.35, 9, -61.3);
    {
      const pf = p.pos.clone(),
        bf = b.pos.clone();
      for (let t = 0; t < 0.8; ) {
        const dt = yield;
        t += dt;
        const u = sm(t / 0.8);
        this.setP(lerp(pf.x, Q.x, u), Q.y, lerp(pf.z, Q.z, u));
        p.yaw = Math.atan2(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
        p.vx = ((Q.x - pf.x) / 0.8) * 1.5 * (1 - u);
        p.vz = ((Q.z - pf.z) / 0.8) * 1.5 * (1 - u);
        b.pos.lerpVectors(bf, BT, u);
        b.vx = ((BT.x - bf.x) / 0.8) * 0.8;
        b.vz = ((BT.z - bf.z) / 0.8) * 0.8;
        b.yaw = dampAngle(b.yaw, Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z), 6, dt);
      }
      p.vx = p.vz = 0;
      b.vx = b.vz = 0;
    }
    b.yaw = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
    b.play('pikeRip', { blend: 0.15 });
    // por encima del hombro de la Bestia, de cara a ti
    const F = new V3(p.pos.x - b.pos.x, 0, p.pos.z - b.pos.z).normalize();
    const Sd = new V3(-F.z, 0, F.x);
    if (Sd.x > 0) Sd.negate();
    this.shot(b.pos.clone().addScaledVector(F, -2.0).addScaledVector(Sd, 4.2).add(new V3(0, 5.0, 0)), b.pos.clone().lerp(p.pos, 0.62).add(new V3(0, 1.3, 0)), { speed: 4, fov: 56, hand: 0.04 });
    yield* this.waitClip(0.93);
    this.ripPike();
    // (la testuz, de cerca, bramando con el asta en la mano)
    const hd = b.point('head', new V3());
    this.shot(hd.clone().addScaledVector(F, 3.0).addScaledVector(Sd, -1.2).add(new V3(0, -0.6, 0)), hd.clone().add(new V3(0, -0.2, 0)), { snap: true, fov: 46, hand: 0.04 });
    yield* this.waitClip(1.2);
    // de lado, a ras: la pica cruzará el plano
    this.shot(new V3(77.6, 9.95, -64.4), new V3(73.6, 10.15, -66.0), { snap: true, fov: 50, hand: 0.03 });
    const ok = yield* this.prompt({ action: 'dodge', label: '¡Esquiva!', window: 0.9, slow: 0.2 });
    if (ok) this.also(this.dodgeTo(ARENA.pike, 0.58));
    yield* this.waitClip(1.58);
    // (a su pecho: si no está, sigue hasta la barricada)
    const aim = Q.clone().add(new V3(0, 1.3, 0));
    this.throwPike(aim, { stick: true });
    g.slowmo = { t: 0.55, k: 0.28 };
    if (!ok) {
      // le roza el hombro: le tumba hacia un lado
      while (this.pikeFly && this.pikeFly.t * this.pikeFly.v < this.pikeFly.reach) yield;
      this.hurtPlayer(22, b.pos.x, b.pos.z);
      if (p.dead) return;
      this.pClip('fallBack', { blend: 0.04 });
      const f = p.pos.clone(),
        to = new V3(...ARENA.pike);
      for (let t = 0; t < 0.45; ) {
        t += yield;
        const u = sm(t / 0.45);
        this.setP(lerp(f.x, to.x, u), f.y, lerp(f.z, to.z, u));
      }
    }
    while (this.pikeFly) yield;
    yield* this.waitBg();
    // la pica, clavada en la madera, temblando
    const pk = this.pike.position;
    const dir = this._b.set(0, 0, 1).applyQuaternion(this.pike.quaternion);
    const tip = pk.clone().addScaledVector(dir, 1.1);
    this.shot(tip.clone().add(new V3(1.3, 0.35, 0.9)), tip.clone().add(new V3(0, -0.1, 0.2)), { snap: true, fov: 44, hand: 0.03 });
    yield* this.wait(0.75);
    if (!ok) {
      this.pClip('getup', { blend: 0.05 });
      yield* this.wait(0.95);
    }
    p.yaw = Math.atan2(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
  }

  // Lo que le queda por volar a la pica hasta donde iba.
  pikeLeft() {
    const f = this.pikeFly;
    return f ? f.dist - Math.min(f.dist, f.t * f.v) : 0;
  }
  // Se queda clavada (la punta, dentro de la madera) y tiembla.
  stickPike() {
    const g = this.g;
    const f = this.pikeFly;
    this.pikeFly = null;
    const o = this.pike;
    const tip = o.position.clone().addScaledVector(f.dir, 1.72);
    g.audio && g.audio.play('woodHit', tip);
    g.audio && g.audio.play('hitHeavy', tip);
    g.fx.blood.emit(tip.x, tip.y, tip.z, 26, { color: [0.42, 0.3, 0.18], speed: 4, life: 0.7, up: 1 });
    g.camRig.shake(0.35);
    const ax = new V3().crossVectors(f.dir, new V3(0, 1, 0));
    if (ax.lengthSq() < 1e-4) ax.set(1, 0, 0);
    this.pikeStuck = { t: 0, q: o.quaternion.clone(), ax: ax.normalize() };
  }
  // La barricada revienta: la pica clavada cae.
  freePike() {
    if (!this.pikeStuck) return;
    this.pikeStuck = null;
    this.pikeLoose = { v: new V3((Math.random() - 0.5) * 2, 2.5, 1.5), spin: new V3(5, 1.5, 0), rest: false, t: 0 };
  }
  // Le ha alcanzado: la pica cae a sus pies.
  dropPike() {
    const f = this.pikeFly;
    this.pikeFly = null;
    const d = f ? f.dir : new V3(0, 0, 1);
    this.pikeLoose = { v: new V3(d.x * 1.5, 0.5, d.z * 1.5), spin: new V3(4, 0.5, 0), rest: false, t: 0 };
  }

  // La pica suelta: cae, rebota y se queda tumbada en el suelo; si se rompe
  // lo que tenía debajo, vuelve a caer (nunca se queda en el aire).
  pikePhysics(dt) {
    const g = this.g,
      L = this.pikeLoose,
      o = this.pike;
    const col = g.world.col;
    const d = this._b.set(0, 0, 1).applyQuaternion(o.quaternion);
    // (la pica, de punta a punta: de z -2,0 a z 1,72 en su espacio)
    const low = Math.min(o.position.y - d.y * 2.0, o.position.y + d.y * 1.72) - 0.07;
    if (L.rest) {
      L.chk = (L.chk ?? 0.3) - dt;
      if (L.chk > 0) return;
      L.chk = 0.3;
      if (low <= col.groundHeight(o.position.x, o.position.z, 0.1, low + 0.3, true) + 0.06) return;
      L.rest = false;
      L.v.set(0, 0, 0);
      L.spin.set(0, 0, 0);
      L.t = 0;
    }
    L.t += dt;
    L.v.y -= 20 * dt;
    o.position.addScaledVector(L.v, dt);
    o.rotateX(L.spin.x * dt);
    o.rotateY(L.spin.y * dt);
    // (las almenas, el parapeto, los muros: rebota)
    for (const ax of ['x', 'z']) {
      const s = Math.sign(L.v[ax]);
      if (!s) continue;
      const hit = col.raycast(o.position.x, o.position.y, o.position.z, ax === 'x' ? s : 0, 0, ax === 'z' ? s : 0, 0.35, (bx) => bx.maxy - bx.miny > 0.6 && !bx.camOnly);
      if (hit !== Infinity) L.v[ax] *= -0.35;
    }
    const gy = col.groundHeight(o.position.x, o.position.z, 0.1, low + 0.6, true);
    if (low < gy) {
      o.position.y += gy - low;
      if (Math.abs(L.v.y) > 3 && L.t < 3) {
        L.v.y *= -0.32;
        L.v.x *= 0.6;
        L.v.z *= 0.6;
        L.spin.multiplyScalar(0.45);
        g.audio && g.audio.play('woodHit', o.position);
        g.fx.blood.emit(o.position.x, gy + 0.1, o.position.z, 8, { color: [0.3, 0.27, 0.24], speed: 2, up: 0.8, life: 0.7 });
      } else {
        // tumbada en el suelo, con su rumbo
        L.rest = true;
        const h = this._a.set(d.x, 0, d.z);
        if (h.lengthSq() < 1e-4) h.set(1, 0, 0);
        h.normalize();
        o.position.y = gy + 0.07;
        o.lookAt(o.position.x + h.x, o.position.y, o.position.z + h.z);
        g.audio && g.audio.play('woodHit', o.position);
      }
    }
    if (o.position.y < -30) {
      o.visible = false;
      this.pikeLoose = null;
    }
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
    this.pikeLoose = this.pikeStuck = null;
    this.pike.visible = true;
  }
  // La pica sale volando hacia 'to'. Con o.stick sigue, si no da a nadie,
  // hasta la barricada y se queda clavada (reach: a qué distancia de la mano
  // pasa por 'to'); si no, al llegar, cae.
  throwPike(to, o = {}) {
    const g = this.g;
    this.pikeHeld = false;
    const from = this.beast.point('handR', new V3());
    const dir = to.clone().sub(from).normalize();
    const reach = from.distanceTo(to);
    let dist = reach;
    if (o.stick) {
      // la cara de los tablones de la barricada (z -67,2): la punta entra 0,3
      const zf = -67.2;
      const t = dir.z < -0.05 ? (zf - from.z) / dir.z : Infinity;
      dist = t < 30 ? t + 0.3 - 1.72 : 18;
    }
    this.pikeFly = { from, dir, dist, reach: reach - 1.72, t: 0, v: 30, stick: !!o.stick };
    g.audio && g.audio.play('pikeWhoosh', from);
  }

  // Salto lateral (rodando) hasta un punto, movido por el guion.
  *dodgeTo(to, dur = 0.6) {
    const p = this.g.player;
    const from = p.pos.clone();
    const T = to.isVector3 ? to.clone() : new V3(...to);
    p.yaw = Math.atan2(T.x - from.x, T.z - from.z);
    p.vx = p.vz = 0;
    this.pClip('roll', { blend: 0.04 });
    this.g.audio && this.g.audio.play('roll', p.pos);
    for (let t = 0; t < dur; ) {
      t += yield;
      const u = 1 - Math.pow(1 - Math.min(1, t / dur), 2);
      this.setP(lerp(from.x, T.x, u), lerp(from.y, T.y, u), lerp(from.z, T.z, u));
    }
  }

  // ======================================================================
  // LA EMBESTIDA Y LOS HACHAZOS
  // ======================================================================
  // Baja la testuz y se te echa encima. ¡Esquiva!: ruedas a un lado y pasa de
  // largo; se estrella contra la barricada, la revienta (con la estaca, y la
  // pica que se había clavado cae) y se queda con los cuernos clavados en la
  // piedra. Clavada: ¡Hachazo! y ¡Remata! Y por el hueco, a correr.
  *coCharge() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    const E = b.pos.clone();
    const C = new V3(...ARENA.stuck);
    b.yaw = Math.atan2(C.x - E.x, C.z - E.z);
    b.play('gore', { blend: 0.12 });
    const side = new V3(-(C.z - E.z), 0, C.x - E.x).normalize();
    if (side.x > 0) side.negate();
    this.shot(
      E.clone()
        .lerp(C, 0.55)
        .addScaledVector(side, 6.5)
        .add(new V3(0, 2.4, 0)),
      E.clone()
        .lerp(C, 0.6)
        .add(new V3(0, 1.4, 0)),
      { speed: 5, fov: 56, hand: 0.05 }
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
    // ---- se estrella: la barricada revienta (con la estaca) y se queda clavada
    b.vx = b.vz = 0;
    b.pos.copy(C);
    const B = g.breakables;
    for (const it of B.list) if (!it.broken && (it.id === 'barricada_norte' || (it.kind === 'merlon' && Math.hypot(it.x - C.x, it.z - C.z) < 2.2))) B.shatter(it, b.pos);
    this.axe.visible = false;
    this.freePike();
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
    // ---- clavada en la piedra: ¡Hachazo! y ¡Remata!
    yield* this.coChop();
    if (p.dead) return;
    // ---- se arranca de la piedra; a correr por el hueco
    yield* this.coEscape();
    if (p.dead) return;
    yield* this.coRun('start');
  }

  // Clavada en la barricada, de espaldas: ¡Hachazo! (el ataque pesado).
  // Saltas con el hacha en alto y se la hundes en el lomo: un instante a
  // cámara lenta, la sangre, el bramido. Se revuelve con el hacha clavada:
  // ¡Remata! (la arrancas y se la vuelves a hundir, en la cerviz). Luego te
  // apartas de un salto. Si fallas, se revuelve y te alcanza.
  *coChop() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    // detrás de ella, del lado del hueco por donde se huye
    const fw = new V3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
    const rt = new V3(-fw.z, 0, fw.x);
    if (rt.x < 0) rt.negate();
    const land = b.pos.clone().addScaledVector(fw, -1.75).addScaledVector(rt, 0.55);
    land.y = this.gy(land.x, land.z, b.pos.y);
    const face = () => Math.atan2(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
    p.yaw = face();
    // bajo, del lado del Postigo, un poco ladeado: ella en la barricada y tú
    const mid = p.pos.clone().lerp(b.pos, 0.5);
    this.shot(mid.clone().addScaledVector(rt, 3.9).addScaledVector(fw, -2.3).add(new V3(0, 1.0, 0)), mid.clone().add(new V3(0, 1.9, 0)), { snap: true, fov: 54, roll: -0.1, hand: 0.05 });
    // (forcejea con los cuernos en la piedra)
    b.anim.speed = 0.12;
    yield* this.wait(0.3);
    b.anim.speed = 0;
    const ok = yield* this.prompt({ action: 'heavy', label: '¡Hachazo!', window: 1.15, slow: 0.25 });
    if (!ok) {
      // se revuelve: la grupa, el codo, te alcanza
      b.flinch.kick(18);
      g.audio && g.audio.play('beastRoar', b.pos);
      this.hurtPlayer(12, b.pos.x, b.pos.z);
      if (p.dead) return;
      yield* this.knockBack(1.1);
      return;
    }
    // salta con el hacha en alto y cae sobre ella
    this.pClip('a_run', { blend: 0.04 });
    g.audio && g.audio.play('swingAxe', p.pos);
    const from = p.pos.clone();
    const dur = 0.34;
    for (let t = 0; t < dur; ) {
      t += yield;
      const u = Math.min(1, t / dur);
      this.setP(lerp(from.x, land.x, u), lerp(from.y, land.y, u) + Math.sin(PI * u) * 0.75, lerp(from.z, land.z, u));
      p.body.grounded = false;
      p.yaw = face();
    }
    p.body.grounded = true;
    this.setP(land.x, land.y, land.z);
    this.chopImpact();
    // (la cámara, encima del golpe)
    if (this.cam) this.cam.pos.addScaledVector(rt, -0.6).add(new V3(0, 0.25, 0));
    yield* this.wait(0.6);
    // ---- se revuelve con el hacha clavada, bramando: ¡Remata!
    b.anim.speed = 0.35;
    b.flinch.kick(16);
    b.jawS.kick(10);
    g.audio && g.audio.play('beastRoar', b.pos);
    g.camRig.shake(0.45);
    // al otro lado, bajo, mirando arriba: la testuz en la piedra y tú detrás
    this.shot(b.pos.clone().addScaledVector(rt, -3.4).addScaledVector(fw, -1.2).add(new V3(0, 0.8, 0)), p.pos.clone().lerp(b.pos, 0.35).add(new V3(0, 1.9, 0)), { snap: true, fov: 56, roll: 0.08, hand: 0.06 });
    const ok2 = yield* this.prompt({ action: 'heavy', label: '¡Remata!', window: 0.95, slow: 0.25 });
    b.anim.speed = 0;
    if (ok2) {
      // la arranca del lomo y la vuelve a descargar, en la cerviz
      const h0 = b.point('spine', new V3(), new V3(0, 0.3, -0.3));
      g.fx.blood.emit(h0.x, h0.y, h0.z, 30, { speed: 4, up: 1.6 });
      g.audio && g.audio.play('fleshTear', h0);
      p.yaw = face();
      this.pClip('a_heavy', { blend: 0.05, speed: 1.45 });
      g.audio && g.audio.play('swingAxe', p.pos);
      yield* this.waitPClip(0.7);
      this.chopImpact('neck');
      yield* this.wait(0.65);
    } else {
      // te sacude de encima
      b.flinch.kick(-20);
      g.audio && g.audio.play('beastRoar', b.pos);
      this.hurtPlayer(10, b.pos.x, b.pos.z);
      if (p.dead) return;
      yield* this.knockBack(1.3);
      return;
    }
    // se la arranca y se aparta de un salto
    const h = b.point('neck', new V3(), new V3(0, 0.2, -0.2));
    g.fx.blood.emit(h.x, h.y, h.z, 40, { speed: 4, up: 1.6 });
    g.audio && g.audio.play('fleshTear', h);
    b.flinch.kick(-12);
    this.pClip('backstep', { blend: 0.08 });
    const f2 = p.pos.clone();
    for (let t = 0; t < 0.46; ) {
      t += yield;
      const u = sm(t / 0.46);
      this.setP(f2.x - fw.x * 0.9 * u, f2.y, f2.z - fw.z * 0.9 * u);
    }
  }

  // El hachazo (en el lomo o en la cerviz): sangre, el hueso, el bramido, un
  // instante a cámara lenta y un fogonazo rojo.
  chopImpact(where = 'spine') {
    const g = this.g,
      b = this.beast;
    const h = where === 'neck' ? b.point('neck', this._a, new V3(0, 0.2, -0.2)) : b.point('spine', this._a, new V3(0, 0.3, -0.3));
    g.fx.blood.emit(h.x, h.y, h.z, 90, { speed: 7, up: 2.4 });
    g.fx.blood.emit(h.x, h.y, h.z, 40, { speed: 3, up: 3.5, life: 1.2 });
    g.combat.impactFlash(h.x, h.y, h.z, 2.2, 0xff9070);
    g.audio && g.audio.play('hitAxe', h);
    g.audio && g.audio.play('boneCrack', h, { k: 1.4 });
    g.audio && g.audio.play('beastRoarBig', b.pos);
    g.hitstop = Math.max(g.hitstop, 0.22);
    g.slowmo = { t: 0.7, k: 0.3 };
    g.flash = Math.max(g.flash, 0.3);
    g.flashTint = [1, 0.25, 0.15];
    g.camRig.shake(1);
    g.input.rumble(1, 1, 500);
    b.flinch.kick(where === 'neck' ? 30 : -30);
    b.jawS.kick(6);
  }

  // Se arranca de la piedra bramando (los cuernos sacan medio parapeto) y tú,
  // por el lado libre del hueco, a correr: por delante, mirando atrás.
  *coEscape() {
    const g = this.g,
      b = this.beast;
    this.cp = 'start';
    g.chaseRun = false;
    g.saveGame();
    this.goRun(RUNV, { lat: 1.25 });
    this.runShot('front', { d: 6.5, h: 1.3, side: 0.3, mix: 0.5, fov: 56 });
    if (b.clipName !== 'tear') b.play('tear', { blend: 0.1, t0: 0.3 });
    b.anim.speed = 1;
    if (!this.toldRun) {
      this.toldRun = true;
      g.ui.toast('¡Corre!', 2.5);
    }
    let grab = false;
    while (b.clipName === 'tear' && !b.anim.done) {
      // (pasada la Bestia, al centro del adarve)
      if (this.sRun > 11.5) this.latT = 0;
      // con los cuernos sale medio parapeto: se queda un sillar en la zarpa
      if (!grab && b.anim.t >= 0.95) {
        grab = true;
        this.rockHeld = true;
        this.rock.visible = true;
      }
      yield;
    }
    this.latT = 0;
    // y te lo tira
    yield* this.beatStone({ held: true });
    if (!this.follow) {
      this.syncBeast(0);
      this.follow = true;
    }
    this.gapT = Math.max(6, this.sRun - this.sB);
  }

  // La Bestia vuelve a seguir el recorrido desde donde está (sin saltos: lo
  // que se aparta del centro del adarve lo recupera poco a poco).
  syncBeast(v = 0) {
    const b = this.beast;
    this.sB = this.path.project(b.pos.x, b.pos.z);
    const q = this.path.at(this.sB, this._pt);
    this.latB = clamp(-(b.pos.x - q.x) * q.tz + (b.pos.z - q.z) * q.tx, -1.6, 1.6);
    this.vB = v;
  }
  // otra corrutina aparte, que no esperan los tramos (waitBg): la Bestia
  // saltando el hueco mientras el jugador sigue corriendo
  alsoD(gen) {
    (this.bgD || (this.bgD = [])).push(gen);
  }

  // ======================================================================
  // LA HUIDA
  // ======================================================================
  // Por tramos, desde el punto de control 'from'. Cada tramo de carrera
  // lleva sus planos; entre tramo y tramo, los sobresaltos.
  *coRun(from = 'start') {
    const p = this.g.player;
    const k = CP_ORDER.indexOf(from);
    const dead = () => p.dead;
    if (k <= 0) {
        // ---- hasta la torre: desde fuera de la muralla, a la par
      yield* this.leg(27.2, [[0, 'side', { out: 7.5, h: 4.8, lead: 2.5, fov: 54 }]], { gap: 7 });
      if (dead()) return;
      yield* this.beatBeam();
      if (dead()) return;
      // ---- la viga revienta detrás (por delante, mirando atrás, por la
      // puerta de la torre); luego, por encima del hombro de la Bestia, que
      // se te echa encima
      yield* this.leg(45.5, [[0, 'front', { d: 7, h: 1.7, side: 0.5, mix: 0.6, fov: 58 }], [41, 'back', { d: 3.0, h: 4.4, side: -1.1, fov: 62 }]], { gap: [7.5, 3.4] });
      if (dead()) return;
      yield* this.beatClaw();
      if (dead()) return;
      yield* this.leg(CP.corner.s, [[0, 'front', { d: 7.5, h: 1.6, side: -0.6, mix: 0.45, fov: 56 }]], { gap: 6.5 });
      if (dead()) return;
    }
    if (k <= 1) {
      this.cp = 'corner';
      // ---- la escalera de la esquina: a ras del adarve norte, sube hacia ti
      yield* this.leg(63.2, [[0, 'fixed', { pos: [67.4, CHASE.YN + 1.6, -124.7], mix: 0.2, ly: 1.2, fov: 50 }]], { gap: 6.5 });
      if (dead()) return;
      yield* this.beatCorner();
      if (dead()) return;
      // ---- la muralla norte: desde fuera, a la par; por la torre, por
      // delante; y el hueco
      yield* this.leg(91.6, [[0, 'side', { out: 8.5, h: 5.2, lead: 3, fov: 54 }], [73.5, 'front', { d: 7, h: 1.6, side: 0.5, mix: 0.5, fov: 58 }]], { gap: [7, 6] });
      if (dead()) return;
      yield* this.beatGap();
      if (dead()) return;
    }
    if (k <= 2) {
      this.cp = 'gap';
      // ---- la Bestia salta el hueco detrás (por delante, mirando atrás);
      // luego, desde fuera de la muralla
      yield* this.leg(CP.reflex.s, [[0, 'front', { d: 7.5, h: 1.8, side: 0.5, mix: 0.7, fov: 60 }]], { gap: [9, 6.5] });
      if (dead()) return;
    }
    if (k <= 3) {
      this.cp = 'reflex';
      yield* this.leg(121.8, [[0, 'front', { d: 7.5, h: 1.8, side: 0.5, mix: 0.6, fov: 60 }]], { gap: 6.5 });
      if (dead()) return;
      yield* this.beatReflex();
      if (dead()) return;
      // ---- hasta el fanal: por encima de su hombro, desde fuera, por la
      // torre (por delante) y la escalera, desde arriba
      yield* this.leg(
        178.8,
        [
          [0, 'back', { d: 3.2, h: 4.4, side: 1.0, fov: 60 }],
          [141, 'side', { out: 8.5, h: 5.2, lead: 3, fov: 54 }],
          [157, 'front', { d: 7, h: 1.6, side: 0.5, mix: 0.5, fov: 58 }],
          [171, 'fixed', { pos: [-58.4, CHASE.fanal.top + 2.6, -125.4], mix: 0.25, ly: 1.0, fov: 50 }],
        ],
        { gap: [7, 6] }
      );
      if (dead()) return;
      yield* this.leg(190.4, [[0, 'fixed', { pos: [-58.4, CHASE.fanal.top + 2.6, -125.4], mix: 0.3, ly: 1.0, fov: 50 }]], { gap: 7 });
      if (dead()) return;
    }
    this.cp = 'top';
    yield* this.beatFinal();
  }

  // Un tramo de carrera hasta sEnd: el jugador corre solo; la Bestia,
  // detrás (o.gap: a cuántos metros; un número o [al empezar, al acabar]); y
  // los planos: shots = [[s, tipo, opciones], ...], cada uno desde su s.
  *leg(sEnd, shots, o = {}) {
    const p = this.g.player;
    if (!(this.autoV > 0)) this.goRun();
    const s0 = this.sRun;
    let i = -1;
    while (this.sRun < sEnd - 1e-3) {
      let j = i;
      while (j + 1 < shots.length && this.sRun >= shots[j + 1][0]) j++;
      if (j !== i) {
        i = j;
        this.runShot(shots[i][1], shots[i][2] || {});
      }
      if (o.gap !== undefined) {
        const u = clamp((this.sRun - s0) / Math.max(1, sEnd - s0), 0, 1);
        this.gapT = Array.isArray(o.gap) ? lerp(o.gap[0], o.gap[1], u) : o.gap;
      }
      yield;
      if (p.dead) return;
    }
  }

  // ---- un sillar arrancado del parapeto, por el aire: ¡Esquiva! (o.held:
  // ya lo lleva en la zarpa: lo tira desde lo alto, de un tirón)
  *beatStone(o = {}) {
    const g = this.g,
      p = g.player,
      b = this.beast;
    this.follow = false;
    b.vx = b.vz = 0;
    b.yaw = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
    b.play('throw', { blend: o.held ? 0.18 : 0.1, t0: o.held ? 0.62 : 0 });
    this.runShot('front', { d: 4.6, side: 1.1, h: 2.3, mix: 0.42, fov: 64, ly: 1.7 });
    if (!o.held) {
      yield* this.waitClip(0.45);
      // (lo arranca del parapeto: polvo y cascotes)
      this.rockHeld = true;
      this.rock.visible = true;
      g.audio && g.audio.play('pillarBreak', b.pos);
      const h = b.point('handR', this._a);
      g.fx.blood.emit(h.x, h.y, h.z, 24, { color: [0.36, 0.33, 0.3], speed: 3, up: 1.2, life: 0.8 });
    }
    yield* this.waitClip(0.86);
    const ok = yield* this.prompt({ action: 'dodge', label: '¡Esquiva!', window: 1.0, slow: 0.25 });
    const aim = p.pos.clone();
    if (ok) {
      this.stopRun();
      const t = this.path.at(this.sRun + 4.2, {});
      this.also(this.dodgeTo([t.x, this.gy(t.x, t.z, t.y), t.z], 0.62));
      yield* this.waitClip(1.04);
      this.throwRock(aim.clone().add(new V3(0, 0.6, 0)));
      yield* this.waitBg();
    } else {
      yield* this.waitClip(1.04);
      this.throwRock(p.pos.clone().add(new V3(0, 1.0, 0)));
      yield* this.wait(0.16);
      this.stopRun();
      this.hurtPlayer(20, b.pos.x, b.pos.z);
      if (p.dead) return;
      yield* this.knockDown(2.4);
    }
    this.goRun();
    b.stopClip(0.25);
    this.syncBeast(2);
    this.follow = true;
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
    this.stopRun();
    const s0 = this.path.project(p.pos.x, p.pos.z);
    const t0 = this.path.at(s0, this._pt);
    const from = p.pos.clone();
    const t1 = this.path.at(s0 + push, {});
    p.yaw = Math.atan2(-t0.tx, -t0.tz);
    this.pClip('fallBack', { blend: 0.04 });
    for (let t = 0; t < 0.4; ) {
      t += yield;
      const u = sm(t / 0.4);
      const x = lerp(from.x, t1.x, u),
        z = lerp(from.z, t1.z, u);
      this.setP(x, this.gy(x, z, from.y), z);
    }
    yield* this.wait(0.3);
    this.pClip('getup', { blend: 0.05 });
    yield* this.wait(0.95);
    p.yaw = Math.atan2(t1.tx, t1.tz);
  }

  // ---- la viga ardiendo en la torre: ¡Agáchate! (por debajo, deslizándose
  // de rodillas; ella la revienta detrás)
  *beatBeam() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    if (this.beamBroken) return;
    const T = CHASE.towerE;
    const zB = T.z + 0.4;
    // desde dentro de la torre: la viga atravesada y el que llega corriendo
    this.shot([T.x + 1.1, CHASE.YE + 1.0, T.z - 2.6], [T.x, CHASE.YE + 1.0, T.z + 3], { speed: 9, fov: 60, snap: true, hand: 0.05 });
    // (no se pasa de la viga mientras decide)
    this.sStop = this.path.project(T.x, zB + 1.4);
    const ok = yield* this.prompt({ action: 'dodge', label: '¡Agáchate!', window: 0.85, slow: 0.25 });
    this.sStop = null;
    if (ok) {
      this.stopRun();
      // de lado, a ras: pasa por debajo, con las ascuas encima
      this.shot([T.x - 1.4, CHASE.YE + 0.55, zB - 0.4], [T.x + 0.2, CHASE.YE + 0.6, zB + 0.2], { snap: true, fov: 62, hand: 0.03 });
      yield* this.slideTo(this.path.project(T.x, zB - 2.4), 0.8);
      this.goRun(RUNV, { keepClip: true });
    } else {
      // se la come de lleno: atontado, y la Bestia la revienta y le alcanza
      this.stopRun();
      this.hurtPlayer(10, p.pos.x, p.pos.z - 1);
      if (p.dead) return;
      this.pClip('stagger', { blend: 0.04 });
      g.fx.blood.emit(p.pos.x, p.pos.y + 1.4, p.pos.z, 20, { color: [1, 0.55, 0.15], speed: 3, up: 1.5, life: 0.6 });
      this.gapT = 1.5;
      this.runShot('front', { d: 5, h: 1.5, side: 0.6, mix: 0.6, fov: 60 });
      yield* this.until(() => this.sRun - this.sB < 3.4, 2.5);
      this.breakBeam();
      this.hurtPlayer(16, p.pos.x, p.pos.z + 1);
      if (p.dead) return;
      yield* this.knockDown(3.5);
      this.gapT = 6;
    }
  }

  // Deslizarse de rodillas por el recorrido hasta sTo (dur s).
  *slideTo(sTo, dur) {
    const p = this.g.player;
    const s0 = this.path.project(p.pos.x, p.pos.z);
    const q0 = this.path.at(s0, {});
    const lat0 = -(p.pos.x - q0.x) * q0.tz + (p.pos.z - q0.z) * q0.tx;
    this.pClip('slide', { blend: 0.05 });
    this.g.audio && this.g.audio.play('roll', p.pos);
    for (let t = 0; t < dur; ) {
      t += yield;
      const u = 1 - Math.pow(1 - Math.min(1, t / dur), 2);
      const q = this.path.at(lerp(s0, sTo, u), this._pt);
      const l = lat0 * (1 - u);
      const x = q.x - q.tz * l,
        z = q.z + q.tx * l;
      this.setP(x, this.gy(x, z, p.pos.y), z, Math.atan2(q.tx, q.tz));
      // (polvo bajo las rodillas)
      if (Math.random() < 0.3) this.g.fx.blood.emit(x, p.pos.y + 0.05, z, 2, { color: [0.3, 0.28, 0.25], speed: 1.2, up: 0.4, life: 0.5, gravity: 2 });
    }
  }

  // ---- te alcanza: el zarpazo a la espalda: ¡Esquiva! (te tiras hacia
  // delante y las garras arrancan un pedazo del parapeto)
  *beatClaw() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    // (se te echa encima: a ras, desde fuera de la muralla, cerca)
    this.gapT = 2.2;
    this.runShot('side', { out: 5.6, h: 3.6, lead: 0.4, ly: 1.1, fov: 54, hand: 0.08 });
    yield* this.until(() => this.sRun - this.sB < 3.0, 2.5);
    b.play('swipe', { blend: 0.06, speed: 1.15 });
    yield* this.waitClip(0.3);
    const ok = yield* this.prompt({ action: 'dodge', label: '¡Esquiva!', window: 0.8, slow: 0.25 });
    if (ok) {
      this.stopRun();
      this.gapT = 5.5;
      const t = this.path.at(this.sRun + 4.4, {});
      this.also(this.dodgeTo([t.x, this.gy(t.x, t.z, t.y), t.z], 0.6));
      yield* this.waitClip(0.48);
      // las garras contra el parapeto: lascas de piedra y chispas
      const h = b.point('handR', new V3());
      g.fx.blood.emit(h.x, h.y, h.z, 30, { color: [0.4, 0.37, 0.33], speed: 5, up: 1.4, life: 0.8 });
      g.fx.blood.emit(h.x, h.y, h.z, 14, { color: [1, 0.85, 0.5], speed: 6, up: 1, life: 0.25 });
      g.audio && g.audio.play('pillarBreak', h);
      g.camRig.shake(0.4);
      yield* this.waitBg();
    } else {
      yield* this.waitClip(0.48);
      this.stopRun();
      this.hurtPlayer(18, b.pos.x, b.pos.z);
      if (p.dead) return;
      this.gapT = 5.5;
      yield* this.knockDown(3.2);
    }
    this.goRun();
  }

  // ---- en la esquina: salta sobre ti: ¡Esquiva! (te tiras hacia delante y
  // cae justo detrás, reventando las losas)
  *beatCorner() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    this.follow = false;
    b.vx = b.vz = 0;
    b.play('leap', { blend: 0.1 });
    this.runShot('front', { d: 4.8, side: 1.0, h: 2.3, mix: 0.45, fov: 64, ly: 1.8 });
    const from = b.pos.clone();
    yield* this.waitClip(0.56);
    // (cae donde va a estar el jugador si sigue corriendo)
    const T = 0.74;
    const sL = this.sRun + RUNV * T + 0.4;
    const land = this.path.at(sL, {});
    const L = new V3(land.x, this.gy(land.x, land.z, land.y), land.z);
    const r = this.promptAsync({ action: 'dodge', label: '¡Esquiva!', window: 0.8, slow: 0.3 });
    let rolled = false;
    yield* this.airArc(from, L, T, 3.2, () => {
      if (r.ok === true && !rolled) {
        rolled = true;
        // (más lejos de lo que llegaría corriendo: la cae detrás)
        this.stopRun();
        const q = this.path.at(Math.max(this.sRun + 4.2, sL + 2.6), {});
        this.also(this.dodgeTo([q.x, this.gy(q.x, q.z, q.y), q.z], 0.62));
      }
    });
    if (r.ok === null) g.qte.cancel();
    this.slamFx(L, 1.1);
    if (!rolled) {
      this.stopRun();
      this.hurtPlayer(22, L.x, L.z);
      if (p.dead) return;
      yield* this.knockDown(3.4);
    } else yield* this.waitBg();
    this.goRun();
    yield* this.waitClip(1.5);
    b.stopClip(0.2);
    this.syncBeast(2);
    this.gapT = Math.max(4, this.sRun - this.sB);
    this.follow = true;
  }

  // La Bestia por el aire de 'from' a 'to' (apex h); each(): cada fotograma.
  *airArc(from, to, dur, h, each = null) {
    const b = this.beast;
    b.vx = b.vz = 0;
    b.yaw = Math.atan2(to.x - from.x, to.z - from.z);
    for (let t = 0; t < dur; ) {
      const dt = yield;
      t += dt;
      const u = Math.min(1, t / dur);
      b.pos.set(lerp(from.x, to.x, u), lerp(from.y, to.y, u), lerp(from.z, to.z, u));
      b.lift = Math.sin(PI * u) * h;
      b.groundY = to.y;
      if (each) each(u);
    }
    b.lift = 0;
    b.pos.copy(to);
  }

  landImpact(L) {
    this.slamFx(L, 1);
  }

  // ---- el adarve hundido: ¡Salta!
  *beatGap() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    const G = CHASE.gap;
    const Y = CHASE.YN;
    // (no se pasa del borde mientras decide)
    this.sStop = this.path.project(G.from - 0.2, -124);
    // desde el otro lado del hueco, sobre el adarve: el jugador llega y salta
    // hacia la cámara, con la Bestia detrás
    this.shot([G.x0 - 5.2, Y + 2.3, -123.1], [G.x1 + 1.6, Y + 0.7, -124], { speed: 9, fov: 60, snap: true, hand: 0.05 });
    const ok = yield* this.prompt({ action: 'interact', label: '¡Salta!', window: 1.0, slow: 0.3 });
    this.sStop = null;
    this.stopRun();
    const from = p.pos.clone();
    if (ok) {
      // salto limpio
      this.pClip('jump', { blend: 0.04 });
      g.audio && g.audio.play('roll', p.pos);
      g.slowmo = { t: 0.45, k: 0.4 };
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
      this.shot([G.x0 + 2.7, Y - 0.3, -122.75], [G.x0 + 0.3, Y - 1.1, -124.1], { speed: 6, fov: 66, snap: true, hand: 0.06 });
      // (la Bestia llega al otro borde)
      this.gapT = 2;
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
        this.cp = 'gap';
        this.goRun();
        yield* this.waitClip(1.6);
        b.stopClip(0.2);
        this.syncBeast(2);
        this.gapT = Math.max(4, this.sRun - this.sB);
        this.follow = true;
        return;
      }
    }
    this.cp = 'gap';
    this.goRun();
    // la Bestia salta el hueco detrás (mientras corres)
    this.alsoD(this.beastLeapsGap());
  }

  // La Bestia llega al borde del hueco y lo salta.
  *beastLeapsGap() {
    const b = this.beast;
    const G = CHASE.gap;
    const Y = CHASE.YN;
    this.follow = false;
    const edge = this.path.project(G.from, -124);
    while (this.sB < edge) {
      const dt = yield;
      this.sB = Math.min(edge, this.sB + 9 * dt);
      const pt = this.path.at(this.sB, this._pt);
      b.pos.set(pt.x, Y, pt.z);
      b.groundY = Y;
      b.vx = pt.tx * 9;
      b.vz = pt.tz * 9;
      b.yaw = dampAngle(b.yaw, Math.atan2(pt.tx, pt.tz), 8, dt);
    }
    b.vx = b.vz = 0;
    b.play('leap', { blend: 0.08 });
    yield* this.waitClip(0.56);
    const to = this.path.at(this.path.project(G.x0 - 1.0, -124), {});
    yield* this.airArc(b.pos.clone(), new V3(to.x, Y, to.z), 0.7, 2.8);
    this.beastOverGap = true;
    this.landImpact(b.pos);
    yield* this.waitClip(1.5);
    b.stopClip(0.2);
    this.syncBeast(3);
    this.follow = true;
  }

  // ---- reflejos: te corta el paso de un salto y te acosa. El zarpazo
  // (¡Agáchate!), las manos (¡Golpea!: el hacha en la zarpa), la cornada
  // (¡Esquiva!: a un lado, y los cuernos contra las almenas) y el mazazo
  // (¡Rueda!: entre sus patas, y a correr).
  *beatReflex() {
    const g = this.g,
      p = g.player,
      b = this.beast;
    const Y = CHASE.YN;
    this.follow = false;
    b.vx = b.vz = 0;
    // salta por encima y cae delante, de cara
    b.play('leap', { blend: 0.1 });
    // desde fuera de la muralla (sólo hay ladera y niebla): sigue a la
    // Bestia por el aire y siempre encuadra a los dos
    let first = true;
    this.hand = 0.05;
    this.camFn = () => {
      const mx = (p.pos.x + b.pos.x) / 2;
      const span = Math.abs(p.pos.x - b.pos.x);
      const dist = 5.0 + span * 0.36;
      this.cam = { pos: new V3(mx, Y + 4.5 + b.lift * 0.4, -124 - dist), look: new V3(mx, Y + 1.4 + b.lift * 0.55, -123.8), speed: 7, fov: 58, snap: first };
      first = false;
    };
    // el jugador frena
    {
      const s0 = this.sRun;
      this.stopRun();
      for (let t = 0; t < 0.5; ) {
        t += yield;
        const u = sm(t / 0.5);
        const q = this.path.at(s0 + 1.6 * u, this._pt);
        this.setP(q.x, Y, q.z);
        p.vx = q.tx * (1 - u) * 4;
        p.vz = q.tz * (1 - u) * 4;
      }
      p.vx = p.vz = 0;
    }
    yield* this.waitClip(0.56);
    const ahead = this.path.at(this.path.project(p.pos.x, p.pos.z) + 6.5, {});
    const L = new V3(ahead.x, Y, ahead.z);
    yield* this.airArc(b.pos.clone(), L, 0.74, 4.2);
    this.landImpact(L);
    b.yaw = Math.atan2(p.pos.x - L.x, p.pos.z - L.z);
    yield* this.waitClip(1.85);
    b.play('roar', { blend: 0.15 });
    // (el jugador alza la vista hacia ella)
    p.yaw = Math.atan2(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
    yield* this.waitClip(2.3);
    // los cuatro golpes, de perfil (desde fuera de la muralla, cerca)
    const blows = [
      { clip: 'swipe', at: 0.26, action: 'dodge', label: '¡Agáchate!', win: 0.8, hitT: 0.48, dmg: 18 },
      { clip: 'grab', at: 0.34, action: 'light', label: '¡Golpea!', win: 0.75, hitT: 0.57, dmg: 24 },
      { clip: 'gore', at: 0.4, action: 'dodge', label: '¡Esquiva!', win: 0.75, hitT: 0.6, dmg: 22 },
      { clip: 'smash', at: 0.48, action: 'dodge', label: '¡Rueda!', win: 0.7, hitT: 0.73, dmg: 28 },
    ];
    for (let i = 0; i < blows.length; i++) {
      const w = blows[i];
      // se acerca lo justo para alcanzarle
      const d = Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
      if (d > 2.9) {
        const bf = b.pos.clone(),
          bt = b.pos.clone().lerp(p.pos, (d - 2.5) / d);
        bt.y = bf.y;
        for (let t = 0; t < 0.35; ) {
          const dt = yield;
          t += dt;
          b.pos.lerpVectors(bf, bt, sm(t / 0.35));
          b.vx = ((bt.x - bf.x) / 0.35) * 0.6;
          b.vz = ((bt.z - bf.z) / 0.35) * 0.6;
        }
        b.vx = b.vz = 0;
      }
      b.yaw = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
      p.yaw = Math.atan2(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
      b.play(w.clip, { blend: 0.08 });
      yield* this.waitClip(w.at);
      const ok = yield* this.prompt({ action: w.action, label: w.label, window: w.win, slow: 0.22 });
      if (ok) yield* this.reflexOk(i);
      else {
        yield* this.waitClip(w.hitT);
        this.hurtPlayer(w.dmg, b.pos.x, b.pos.z);
        if (p.dead) return;
        if (i === 1) yield* this.thrown();
        else if (i === 3) {
          yield* this.knockDown(0);
          // y se escabulle por debajo mientras se recupera
          yield* this.slipPast();
        } else yield* this.knockBack(1.6);
      }
      if (i < 3) yield* this.waitClip(10);
    }
    // a correr; ella se da la vuelta y ruge
    this.goRun();
    this.runShot('front', { d: 6.5, h: 1.6, side: 0.4, mix: 0.6, fov: 58 });
    const tb = b.yaw + PI;
    for (let t = 0; t < 0.5; ) {
      const dt = yield;
      t += dt;
      b.yaw = dampAngle(b.yaw, tb, 10, dt);
    }
    b.play('roar', { blend: 0.12, speed: 1.3 });
    yield* this.waitClip(1.3);
    b.stopClip(0.25);
    this.syncBeast(1);
    this.gapT = Math.max(5, this.sRun - this.sB);
    this.follow = true;
  }

  *reflexOk(i) {
    const g = this.g,
      p = g.player,
      b = this.beast;
    const away = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
    if (i === 0) {
      // se agacha de golpe y la zarpa le pasa por encima
      this.pClip('duck', { blend: 0.04 });
      yield* this.waitClip(0.5);
      g.slowmo = { t: 0.3, k: 0.3 };
      yield* this.waitPClip(0.7);
    } else if (i === 1) {
      // le hunde el hacha en la zarpa
      const c = p.set && p.set.light && p.set.light[0];
      if (c) p.anim.play(c.clip, { blend: 0.05, speed: 1.2 });
      g.audio && g.audio.play('swingAxe', p.pos);
      yield* this.wait(0.3);
      const h = b.point('handR', this._a);
      g.fx.blood.emit(h.x, h.y, h.z, 50, { speed: 5, up: 1.4 });
      g.combat.impactFlash(h.x, h.y, h.z, 1.3, 0xff9070);
      g.audio && g.audio.play('hitAxe', h);
      g.audio && g.audio.play('beastHurt', b.pos);
      g.hitstop = 0.12;
      b.play('recoil', { blend: 0.05 });
      b.flinch.kick(-14);
      yield* this.wait(0.6);
    } else if (i === 2) {
      // a un lado (hacia el parapeto de dentro): los cuernos dan en las
      // almenas de fuera y las revientan
      const rt = new V3(Math.cos(away), 0, -Math.sin(away));
      if (rt.z < 0) rt.negate();
      yield* this.dodgeTo([p.pos.x + rt.x * 1.25, p.pos.y, p.pos.z + rt.z * 1.25], 0.5);
      yield* this.waitClip(0.6);
      const hd = b.point('head', new V3());
      g.fx.blood.emit(hd.x, hd.y, hd.z - 0.6, 40, { color: [0.36, 0.33, 0.3], speed: 5, up: 1.6, life: 0.9 });
      g.audio && g.audio.play('wallBreak', hd);
      g.camRig.shake(0.6);
      const B = g.breakables;
      if (B) for (const it of B.list) if (!it.broken && it.kind === 'merlon' && Math.hypot(it.x - hd.x, it.z - hd.z) < 2) B.shatter(it, b.pos);
      b.flinch.kick(10);
      p.yaw = Math.atan2(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
    } else {
      // rueda por debajo de ella: queda a su espalda
      yield* this.slipPast();
    }
  }

  // Rueda entre sus piernas hasta quedar detrás de ella (por el recorrido).
  *slipPast() {
    const p = this.g.player,
      b = this.beast;
    const sb = this.path.project(b.pos.x, b.pos.z);
    const q = this.path.at(sb + 2.8, {});
    yield* this.dodgeTo([q.x, CHASE.YN, q.z], 0.75);
    p.yaw = Math.atan2(q.tx, q.tz);
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
      const x = from.x + Math.sin(a) * d * u,
        z = from.z + Math.cos(a) * d * u;
      this.setP(x, this.gy(x, z, from.y), z);
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
    g.chaseRun = false;
    this.follow = false;
    g.audio && g.audio.play('dread');
    // arriba: no hay salida; frena y se vuelve hacia la escalera
    const mid = new V3(F.x + 0.6, top, F.z + 0.5);
    this.shot([F.x - 3.0, top + 2.6, F.z + 2.6], [F.x + 3.5, top + 0.4, F.z - 0.4], { speed: 3, fov: 58, hand: 0.05 });
    {
      this.stopRun();
      const from = p.pos.clone();
      const d = from.distanceTo(mid);
      const dur = Math.max(0.35, d / 4.2);
      const yw = Math.atan2(mid.x - from.x, mid.z - from.z);
      for (let t = 0; t < dur; ) {
        const dt = yield;
        t += dt;
        const u = Math.min(1, t / dur);
        const k = 1 - (1 - u) * (1 - u);
        this.setP(lerp(from.x, mid.x, k), top, lerp(from.z, mid.z, k));
        p.yaw = dampAngle(p.yaw, yw, 10, dt);
        p.vx = Math.sin(yw) * 4.5 * (1 - u);
        p.vz = Math.cos(yw) * 4.5 * (1 - u);
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
        const gy = this.g.world.col.groundHeight(pt.x, pt.z, 0.2, pt.y + 1.2);
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
    this.shot(b.pos.clone().add(new V3(-4.6, 2.6, 4.4)), b.pos.clone().add(new V3(0, 2.4, 0)), { speed: 4, fov: 56, hand: 0.05 });
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
        { speed: 5, fov: 54, hand: 0.05 }
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
    this.hand = 0;
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
      this.camFn = null;
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
    // la Bestia, arriba, al borde, mirando abajo
    b.yaw = Math.atan2(to.x - b.pos.x, to.z - b.pos.z);
    b.play('stare', { blend: 0.2 });
    this.shot([A.x - 2.2, A.top + 1.0, A.z + 3.8], [b.pos.x, b.pos.y + 2.4, b.pos.z], { speed: 3, fov: 44, hand: 0.04 });
    yield* this.wait(2.0);
    // de cerca, desde el aire, por el hueco del parapeto: ruge
    this.shot([b.pos.x + 1.5, b.pos.y - 0.5, b.pos.z + 5.4], [b.pos.x, b.pos.y + 2.5, b.pos.z], { snap: true, fov: 48, hand: 0.05 });
    b.play('bigRoar', { blend: 0.15 });
    yield* this.waitClip(1.05);
    g.camRig.shake(0.9);
    g.input.rumble(1, 1, 900);
    g.fauna && g.fauna.scare && g.fauna.scare(b.pos, 40);
    yield* this.waitClip(2.6);
    // desde la paja: se da la vuelta y se va por donde ha venido
    this.shot([A.x - 2.2, A.top + 1.0, A.z + 3.8], [b.pos.x, b.pos.y + 2.4, b.pos.z], { snap: true, fov: 44, hand: 0.04 });
    yield* this.waitClip(3.5);
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
    this.autoV = 0;
    // (el control vuelve al jugador: sin esto se quedaba inmóvil en la atalaya)
    this.lock = false;
    this.cam = null;
    this.camFn = null;
    this.hand = 0;
    this.fadeK = 1;
    b.setFade(1);
    g.qte.cancel();
    g.chaseRun = false;
    this.active = false;
    this.co = null;
    this.bg = [];
    this.bgD = [];
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
  // Desde el último punto de control: la barricada rota y el hacha en la
  // mano; el jugador y la Bestia, en su sitio; y otra vez a correr.
  *coRetry(fromFog) {
    const g = this.g,
      p = g.player,
      b = this.beast;
    g.qte.cancel();
    this.follow = false;
    this.lock = true;
    this.autoV = 0;
    this.sStop = null;
    this.cam = null;
    this.camFn = null;
    this.bgD = [];
    g.camRig.override = null;
    g.chaseRun = false;
    const cp = CP[this.cp] ? this.cp : 'start';
    this.cp = cp;
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
    this.pikeFly = this.rockFly = this.pikeLoose = this.pikeStuck = null;
    this.pikeHeld = this.rockHeld = false;
    this.embersT = 0;
    // (el hacha: arrancada; si se salió a mitad de la escena, la lleva)
    this.ensureAxe();
    this.beastOverGap = cp === 'reflex' || cp === 'top';
    this.puppet(true);
    p.hp = p.maxHp;
    p.st = p.maxSt;
    b.showStub(false);
    b.lift = 0;
    b.extraHunch = 0;
    this.setBars(1);
    g.ui.showHud(true);
    if (cp === 'start') {
      this.restoreBeam();
      // clavada en la piedra; el jugador, a su lado, listo para correr
      const C = ARENA.stuck;
      b.show(C[0], C[1], C[2], Math.atan2(-0.4, -1));
      b.groundY = C[1];
      b.play('tear', { blend: 0.01 });
      b.anim.speed = 0;
      this.setP(74.2, CHASE.YE, -65.9, PI);
    } else {
      this.beamBroken = true;
      this.beam.visible = false;
      this.beamBox.enabled = false;
      const q = this.path.at(CP[cp].s, {});
      this.setP(q.x, this.gy(q.x, q.z, q.y), q.z, Math.atan2(q.tx, q.tz));
      const bq = this.path.at(CP[cp].b, {});
      b.show(bq.x, this.gy(bq.x, bq.z, bq.y), bq.z, Math.atan2(bq.tx, bq.tz));
      b.groundY = b.pos.y;
      b.stopClip(0);
    }
    this.syncBeast(0);
    this.sP = this.sRun = this.path.project(p.pos.x, p.pos.z);
    g.camRig.snapTo(p);
    g.fadeTarget = 1;
    g.audio.music('chase');
    if (fromFog) g.ui.area('La Bestia de Carne');
    if (cp === 'start') {
      yield* this.wait(0.3);
      yield* this.coEscape();
      if (p.dead) return;
      yield* this.coRun('start');
      return;
    }
    if (cp === 'top') {
      this.sRun = CP.top.s;
      yield* this.wait(0.3);
      yield* this.beatFinal();
      return;
    }
    // a correr desde el punto de control (en el hueco, la Bestia lo salta
    // detrás)
    this.goRun();
    this.gapT = CP[cp].s - CP[cp].b;
    this.vB = RUNV;
    if (cp === 'gap') this.alsoD(this.beastLeapsGap());
    else this.follow = true;
    yield* this.coRun(cp);
  }

  // Lo que se mueve en cada fotograma: el jugador corriendo, la pica (en la
  // mano, por el aire, clavada o suelta) y el sillar.
  tick(dt) {
    const g = this.g,
      p = g.player,
      b = this.beast;
    if (this.autoV > 0 && p.puppet && !p.dead) {
      if (this.sStop != null && this.sRun >= this.sStop) {
        p.vx = damp(p.vx, 0, 6, dt);
        p.vz = damp(p.vz, 0, 6, dt);
      } else this.runStep(dt);
    } else if (p.puppet && !this.flyP) {
      p.vx = damp(p.vx, 0, 8, dt);
      p.vz = damp(p.vz, 0, 8, dt);
    }
    // la pica en la mano / por el aire / clavada
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
        if (f.stick) this.stickPike();
        else {
          // llega (a quien iba, o al muro): y cae, que no se quede en el aire
          g.audio && g.audio.play('woodHit', this.pike.position);
          g.fx.blood.emit(this.pike.position.x, this.pike.position.y, this.pike.position.z, 14, { color: [0.3, 0.27, 0.24], speed: 3, up: 1 });
          this.dropPike();
        }
      }
    }
    if (this.pikeStuck) {
      // (tiembla y se queda quieta)
      const S = this.pikeStuck;
      S.t += dt;
      const a = Math.sin(S.t * 42) * Math.exp(-S.t * 4.5) * 0.07;
      this.pike.quaternion.copy(S.q).premultiply(new THREE.Quaternion().setFromAxisAngle(S.ax, a));
    }
    if (this.pikeLoose) this.pikePhysics(dt);
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
