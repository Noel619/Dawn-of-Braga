// Las escenas del Físico de los Inocentes (game/fisico.js).
//
// LA CORTINA (al entrar en la calleja, la primera vez). Por encima del
// hombro, la calleja entera, larga y estrecha, y al fondo la Casa de los
// Inocentes. Luego, de lejos y muy cerrado, la ventana de arriba: la cortina
// se aparta, asoma el pico y los dos ojos de vidrio cogen la luz de la vela;
// te mira, ladea la cabeza (como un pájaro): «Ah. Uno sano.»; suelta el paño
// y se retira a lo oscuro. Se salta con «interactuar».
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { registerMaterialPatch, objMat, cloneMat } from '../gfx/materials.js';
import { clip } from '../entities/rig.js';
import { DIALOG, MSG } from './story.js';
import { FI_CLIPS, fiSay, fiGrp } from '../entities/fisico.js';

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

// ======================================================================
// LA CAMILLA (te ha dormido con la esponja). A negro: su voz. Despiertas
// atado a la camilla, boca arriba, mientras te lleva por la calleja: el
// cielo, los aleros que pasan, el farol que se mece y su máscara, del revés,
// asomándose por encima de ti. La puerta de su casa, desde la plazuela. A
// negro. En el quirófano, bajo la lámpara: ordena los hierros, te toma el
// pulso y se va a la fragua a poner el cauterio al rojo. EL FORCEJEO: tres
// correas (la muñeca izquierda, la derecha y el pecho), una tras otra,
// machacando, antes de que vuelva (se le oye venir). Si te sueltas, a huir
// de su casa (y él, al volver, a buscarte: game/fisico.js); si no, entra con
// el hierro al rojo, y a negro. Las escenas se saltan; el forcejeo, no.

// la mesa del quirófano (inocentes.js: quirofanoMesa; la cabecera, al
// oeste), la puerta de la calle de su casa y la del patio (por donde va a la
// fragua y vuelve)
const MESA = { x: 54.6, y: 0.92, z: 37.6 };
const PATIO = { x: 54.95, z: 34.95, id: 'd_quirofano_patio' };
// el viaje, por la calleja (de oeste a este), y la entrada a su casa
const VIAJE = { x0: 24.6, x1: 33.2, z: 44.0 };
const ENTRA = { x0: 45.9, x1: 49.7, z: 45.45, puerta: 'd_inocentes' };
// el Coronado que espera a su puerta: se aparta
const APARTA = { id: 'e_coronado_puerta', x: 47.1, z: 46.9, yaw: -2.2 };

// Guion (s)
const C_DESPIERTA = 2.6; // a negro hasta aquí
const C_ASOMA = [6.6, 8.4]; // se asoma por encima de la cabecera
const C_PUERTA = 9.4; // el viaje hasta aquí; luego, la puerta
const C_NEGRO = 12.4; // a negro (el portazo)
const C_MESA = 13.4; // el quirófano
const C_PULSO = [17.4, 20.6];
const C_SEVA = 24.4; // se va a la fragua: el forcejeo
// lo que tarda en volver de la fragua, y cuándo se le empieza a oír
const VUELVE = 26;
const OYE = 7;
const MASH_CORREA = 12;

// el jugador tumbado boca arriba (como el derribado de weapons.js), los
// brazos a lo largo del cuerpo: atado
const LIE = { root: [0, -80, 0], hips: [-88, 0, 0], chest: [-4, 0, 0], head: [-12, 0, 0], armL: [4, 0, 5], foreL: [-4, 0, 0], armR: [4, 0, -5], foreR: [-4, 0, 0], legL: [2, 0, 3], shinL: [3, 0, 0], legR: [2, 0, -3], shinR: [3, 0, 0] };
const ATADO = clip(
  'p_atado',
  3.2,
  [
    [0, LIE],
    [1.6, { ...LIE, chest: [-6, 0, 0], head: [-14, 8, 0] }],
    [3.2, LIE],
  ],
  { loop: true, ground: false }
);
// forcejeando: tira de las correas, la cabeza de un lado a otro
const TIRA = clip(
  'p_tira',
  0.9,
  [
    [0, LIE],
    [0.15, { ...LIE, chest: [-10, 8, 0], head: [-20, 30, 0], armL: [8, 0, 9], foreL: [-16, 0, 0], armR: [8, 0, -9], foreR: [-16, 0, 0] }, 'snap'],
    [0.45, { ...LIE, chest: [-10, -8, 0], head: [-20, -30, 0], armL: [8, 0, 8], foreL: [-20, 0, 0], armR: [8, 0, -8], foreR: [-20, 0, 0] }, 'snap'],
    [0.9, LIE],
  ],
  { loop: true, ground: false }
);

const _m4 = new THREE.Matrix4();
const place = (geo, x, y, z, q = null) => geo.applyMatrix4(_m4.compose(new V3(x, y, z), q || new THREE.Quaternion(), new V3(1, 1, 1)));
// un palo redondo de a a b
function palo(a, b, r) {
  const d = new V3().subVectors(b, a);
  const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.clone().normalize());
  return place(new THREE.CylinderGeometry(r, r, d.length(), 6), (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, q);
}

// La camilla (como la del patio de su casa: inocentes.js, camilla): los
// varales, el lienzo, las dos ruedas a los pies, las patas a la cabecera, los
// mangos por donde empuja y el farol colgado de su pértiga. A lo largo de su
// x, la cabecera a -x.
function camillaMesh(mat) {
  const root = new THREE.Group();
  const wood = [],
    iron = [];
  for (const sz of [-0.33, 0.33]) {
    wood.push(palo(new V3(1.2, 0.6, sz), new V3(-0.95, 0.6, sz), 0.032));
    wood.push(palo(new V3(-0.95, 0.6, sz), new V3(-1.5, 0.9, sz), 0.03));
    wood.push(palo(new V3(-0.88, 0.6, sz), new V3(-0.95, 0.0, sz), 0.028));
  }
  for (const x of [-0.85, 0, 0.85]) wood.push(place(new THREE.BoxGeometry(0.05, 0.04, 0.72), x, 0.57, 0));
  // la pértiga del farol y su gancho
  wood.push(palo(new V3(-0.95, 0.6, 0.33), new V3(-0.82, 1.78, 0.33), 0.018));
  iron.push(palo(new V3(-0.82, 1.78, 0.33), new V3(-0.62, 1.74, 0.33), 0.008));
  root.add(new THREE.Mesh(mergeGeometries(wood), mat('wooddark')));
  root.add(new THREE.Mesh(place(new THREE.BoxGeometry(1.9, 0.03, 0.62), 0, 0.62, 0), mat('burlap', { tint: 0x8c7a62 })));
  // las ruedas (giran): a los pies
  const ruedas = new THREE.Group();
  ruedas.position.set(0.8, 0.3, 0);
  const rw = [];
  for (const sz of [-0.42, 0.42]) {
    rw.push(place(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 12), 0, 0, sz, new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), Math.PI / 2)));
    for (let k = 0; k < 4; k++) rw.push(place(new THREE.BoxGeometry(0.54, 0.03, 0.03), 0, 0, sz + Math.sign(sz) * 0.03, new THREE.Quaternion().setFromAxisAngle(new V3(0, 0, 1), (k * Math.PI) / 4)));
  }
  ruedas.add(new THREE.Mesh(mergeGeometries(rw), mat('wooddark')));
  iron.push(palo(new V3(0.8, 0.3, -0.45), new V3(0.8, 0.3, 0.45), 0.02));
  root.add(ruedas);
  // el farol, colgado (se mece)
  const farol = new THREE.Group();
  farol.position.set(-0.62, 1.74, 0.33);
  const fi = [palo(new V3(0, 0, 0), new V3(0, -0.12, 0), 0.006), place(new THREE.BoxGeometry(0.16, 0.02, 0.16), 0, -0.13, 0), place(new THREE.BoxGeometry(0.16, 0.02, 0.16), 0, -0.36, 0)];
  for (const [x, z] of [
    [-0.07, -0.07],
    [0.07, -0.07],
    [-0.07, 0.07],
    [0.07, 0.07],
  ])
    fi.push(palo(new V3(x, -0.13, z), new V3(x, -0.36, z), 0.008));
  farol.add(new THREE.Mesh(mergeGeometries(fi), mat('iron')));
  farol.add(new THREE.Mesh(place(new THREE.BoxGeometry(0.11, 0.19, 0.11), 0, -0.245, 0), mat('ember')));
  root.add(farol);
  root.add(new THREE.Mesh(mergeGeometries(iron), mat('iron')));
  return { root, ruedas, farol };
}

// Las correas de la mesa, sobre el cuerpo: la muñeca izquierda, la derecha y
// el pecho (en el orden en que se sueltan).
function correasMesh(mat) {
  const m = mat('leather', { tint: 0x5a3a28 });
  const iron = mat('iron');
  const out = [];
  // (cada una: la correa, de canto a canto de la mesa, y su hebilla)
  for (const [x, y, z, w] of [
    [MESA.x - 0.27, MESA.y + 0.16, MESA.z - 0.34, 0.22],
    [MESA.x - 0.27, MESA.y + 0.16, MESA.z + 0.34, 0.22],
    [MESA.x - 0.52, MESA.y + 0.2, MESA.z, 0.88],
  ]) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(place(new THREE.BoxGeometry(0.075, 0.03, w), x, y, z), m));
    g.add(new THREE.Mesh(place(new THREE.BoxGeometry(0.09, 0.04, 0.04), x, y + 0.012, z + (w > 0.5 ? 0.18 : 0)), iron));
    out.push(g);
  }
  return out;
}

export class CamillaCine {
  constructor(g, F) {
    this.g = g;
    this.F = F;
    this.t = 0;
    this.cues = new Set();
    this.pos = new V3();
    this.look = new V3();
    this.v = new V3();
    this.fase = 'cine';
    this.correa = 0;
    this.reQ = 0;
    this.fT = 0;
    this.n0 = 0;
    this.outcome = null;
  }
  cue(id, at) {
    if (this.t >= at && !this.cues.has(id)) {
      this.cues.add(id);
      return true;
    }
    return false;
  }
  // material de objeto con la luz del sitio (la de la calleja; la del
  // quirófano, para las correas)
  mat(x, y, z) {
    const g = this.g;
    return (name, opts) => {
      const m = cloneMat(objMat(name, opts));
      const zn = g.zoneAt({ x, y, z });
      const pr = g.probe.sample(x, y + 1, z, zn && zn.room ? g.level.ctx.wb.roomId(zn.room) : 0);
      if (m._u) {
        m._u.uProbe.value.set(pr[0], pr[1], pr[2]);
        m._u.uGround.value.set(y, 0.3);
      }
      return m;
    };
  }

  start() {
    const g = this.g;
    const F = this.F;
    const p = g.player;
    const e = F.e;
    F.modo = 'cine';
    F.sleep = 1;
    g.fade = g.fadeTarget = 0;
    g.lockTarget = null;
    g.ui.showHud(false);
    g.audio && g.audio.stopMusic();
    if (g.qte && g.qte.active) g.qte.cancel();
    if (g.trampas) g.trampas.abre();
    // el jugador: lo mueve el guion
    p.puppet = true;
    p.state = 'cine';
    p.vx = p.vz = 0;
    p.body.vy = 0;
    p.blocking = false;
    p.charging = false;
    p.flask.visible = false;
    p.anim.play(ATADO, { blend: 0 });
    p.tumbado = true;
    this.head = p.rig.joints.head || null;
    // (desarmado: la espada y el escudo, en la mesa de sus hierros)
    p.rig.joints.sword.visible = false;
    p.rig.joints.shield.visible = false;
    p.shieldBack.group.visible = false;
    p.saya.group.visible = false;
    // él: lo mueve el guion; la vara, en la camilla
    F.show(VIAJE.x0 - 1.85, VIAJE.z, Math.PI / 2);
    e.scripted = true;
    fiGrp(e, 'vara', false);
    e.anim.play(FI_CLIPS.empuja, { blend: 0 });
    // la camilla y su farol (con su luz)
    const cm = camillaMesh(this.mat(28, 0, 44));
    this.cam = cm;
    g.scene.add(cm.root);
    this.luz = g.fx.lights.add({ x: 0, y: 0, z: 0, color: 0xffa050, intensity: 2.2, range: 6, flicker: 1, priority: 8 });
    this.coronado = g.enemies.find((x) => x.id === APARTA.id && !x.dead) || null;
  }

  // ---- el jugador, tumbado en (x, y, z) mirando (los pies) a +x
  tumba(x, y, z) {
    const p = this.g.player;
    p.body.pos.set(x, y, z);
    p.visY = y;
    p.yaw = Math.PI / 2;
  }
  // ---- la camilla en (x, z), con el jugador y él empujando (dx: lo que ha
  // andado desde el último fotograma)
  camilla(x, z, dx, dt) {
    const g = this.g;
    const e = this.F.e;
    const C = this.cam;
    C.root.position.set(x, 0, z);
    C.ruedas.rotation.z -= dx / 0.3;
    C.farol.rotation.z = Math.sin(g.time * 3.1) * 0.12 + (dx > 0 ? -0.06 : 0);
    C.farol.rotation.x = Math.sin(g.time * 2.3 + 1) * 0.06;
    this.tumba(x - 0.15, 0.625, z);
    e.pos.set(x - 1.85, g.world.col.groundHeight(x - 1.85, z, 0.3, 1), z);
    e.yaw = Math.PI / 2;
    e.vx = dt > 0 ? dx / dt : 0;
    e.vz = 0;
    C.farol.getWorldPosition(this.v);
    this.luz.x = this.v.x;
    this.luz.y = this.v.y - 0.25;
    this.luz.z = this.v.z;
  }
  // ---- la cámara en los ojos del jugador, mirando a (x, y, z)
  // (alza: la cabeza levantada, para mirarse las correas)
  ojos(look, fov = 62, roll = 0, alza = 0) {
    const g = this.g;
    const p = g.player;
    p.rig.worldPos('head', this.pos);
    this.pos.y += 0.22 + alza;
    this.pos.x += 0.1 + alza * 0.4;
    // (las ruedas en el empedrado)
    const k = this.fase === 'cine' && this.t < C_PUERTA ? 1 : 0;
    this.pos.y += k * (Math.sin(g.time * 23) * 0.006 + Math.sin(g.time * 37) * 0.004);
    this.look.copy(look);
    g.camRig.override = { pos: this.pos, look: this.look, fov, roll, snap: true };
  }

  update(dt) {
    const g = this.g;
    const F = this.F;
    const e = F.e;
    this.t += dt;
    const t = this.t;
    if (this.fase === 'cine') this.escenas(dt, t);
    else if (this.fase === 'forcejeo') this.forcejeo(dt);
    else if (this.fase === 'hierro') return this.hierro(dt);
    e.animate(dt);
    if (this.coronado && this.coronado.obj.visible) this.coronado.animate(dt);
    return this.fase !== 'fin';
  }

  // ------------------------------------------------------------ las escenas
  escenas(dt, t) {
    const g = this.g;
    const F = this.F;
    const e = F.e;
    const p = g.player;
    // ---- a negro: su voz
    if (this.cue('duerme', 0.5)) fiSay(e, DIALOG.fisicoDuerme, 2.6);
    if (t < C_PUERTA) {
      // ---- el viaje por la calleja
      const u = Math.max(0, (t - 0.2) / (C_PUERTA - 0.2));
      const x = lerp(VIAJE.x0, VIAJE.x1, u);
      const dx = x - (this._x ?? x);
      this._x = x;
      this.camilla(x, VIAJE.z, dx, dt);
      if (this.head) this.head.visible = false;
      // los párpados: se abren despacio, parpadean
      F.sleep = t < C_DESPIERTA ? 1 : Math.max(0.3, 0.92 - (t - C_DESPIERTA) * 0.22) + 0.5 * Math.max(0, Math.sin((t - C_DESPIERTA) * 2.1)) ** 30;
      if (this.cue('ve', C_DESPIERTA)) g.fadeTarget = 1;
      if (this.cue('dice1', 4.2)) fiSay(e, DIALOG.fisicoCamilla[0], 3.2);
      // se asoma por encima de la cabecera: su cara, del revés
      const asoma = t >= C_ASOMA[0] && t < C_ASOMA[1];
      if (this.cue('asoma', C_ASOMA[0])) {
        e.anim.play(FI_CLIPS.asoma, { blend: 0.25 });
        fiSay(e, DIALOG.fisicoCamilla[1], 2.6);
      }
      if (this.cue('desasoma', C_ASOMA[1])) e.anim.play(FI_CLIPS.empuja, { blend: 0.3 });
      if (asoma) {
        e.rig.worldPos('head', this.v);
        this.ojos(this.v.setY(this.v.y - 0.05), 56, Math.PI);
      } else {
        const C = this.cam.root.position;
        this.ojos(this.v.set(C.x + 2.2, 5.0, C.z), 64);
      }
      return;
    }
    if (t < C_NEGRO) {
      // ---- la puerta de su casa, desde la plazuela
      if (this.cue('puerta', C_PUERTA)) {
        if (this.head) this.head.visible = true;
        F.sleep = 0.25;
        this._x = null;
        const d = g.interact.list.find((i) => i.id === ENTRA.puerta);
        if (d) g.interact.setOpen(d, true);
        // (el Coronado de la puerta se aparta)
        const co = this.coronado;
        if (co) {
          co.pos.set(APARTA.x, 0, APARTA.z);
          co.yaw = APARTA.yaw;
        }
        fiSay(e, DIALOG.fisicoCasa, 2.8);
      }
      const u = (t - C_PUERTA) / (C_NEGRO - C_PUERTA);
      const x = lerp(ENTRA.x0, ENTRA.x1, u);
      const dx = x - (this._x ?? x);
      this._x = x;
      this.camilla(x, ENTRA.z, dx, dt);
      F.sleep = 0.25 + u * 0.5;
      this.pos.set(42.9, 1.25, 47.9);
      this.look.set(48.4, 1.15, 45.4);
      g.camRig.override = { pos: this.pos, look: this.look, fov: 48, snap: true };
      return;
    }
    if (t < C_MESA) {
      // ---- a negro: el portazo
      if (this.cue('negro', C_NEGRO)) {
        g.fade = g.fadeTarget = 0;
        g.audio && g.audio.play('doorSlam', { x: 50, y: 1, z: 45.4 });
        const d = g.interact.list.find((i) => i.id === ENTRA.puerta);
        if (d) g.interact.setOpen(d, false);
        g.scene.remove(this.cam.root);
        this.luz.intensity = 0;
      }
      return;
    }
    // ---- el quirófano
    if (this.cue('mesa', C_MESA)) {
      g.fadeTarget = 1;
      F.sleep = 0.55;
      this.tumba(MESA.x - 0.2, MESA.y - 0.01, MESA.z);
      if (this.head) this.head.visible = false;
      this.correas = correasMesh(this.mat(MESA.x, 0, MESA.z));
      for (const c of this.correas) g.scene.add(c);
      // él, en la mesa de los hierros
      e.pos.set(52.0, 0, 35.95);
      e.yaw = Math.PI;
      e.anim.play(FI_CLIPS.ordena, { blend: 0 });
    }
    F.sleep = Math.max(0.12, F.sleep - dt * 0.12);
    const lamp = this.v.set(MESA.x + 0.05, 2.5, MESA.z);
    if (this.cue('hierros', C_MESA + 1.2)) {
      fiSay(e, DIALOG.fisicoHierros, 2.8);
      g.audio && g.audio.play('chestBar', { x: 52, y: 1, z: 35.2 });
    }
    if (this.cue('tintinea', C_MESA + 2.6)) g.audio && g.audio.play('coinDrop', { x: 52, y: 1, z: 35.2 });
    // va a tu lado (andando) y te toma el pulso
    if (t >= C_MESA + 3.0 && t < C_PULSO[0]) this.anda(52.0, 35.95, 53.95, 36.85, (t - C_MESA - 3.0) / (C_PULSO[0] - C_MESA - 3.0), dt);
    if (this.cue('pulso', C_PULSO[0])) {
      e.vx = e.vz = 0;
      e.pos.set(53.95, 0, 36.85);
      e.yaw = 0.15;
      e.anim.play(FI_CLIPS.pulso, { blend: 0.3 });
    }
    if (this.cue('dicePulso', C_PULSO[0] + 0.8)) fiSay(e, DIALOG.fisicoPulso, 3);
    if (this.cue('ladea', C_PULSO[1])) e.anim.play(FI_CLIPS.ladea, { blend: 0.3 });
    if (this.cue('fragua', C_PULSO[1] + 0.6)) fiSay(e, DIALOG.fisicoFragua, 3.4);
    // se va por la puerta del patio
    if (t >= C_PULSO[1] + 2.0 && t < C_SEVA) {
      if (this.cue('anda2', C_PULSO[1] + 2.0)) e.anim.stop(0.3);
      this.anda(53.95, 36.85, PATIO.x, PATIO.z, (t - C_PULSO[1] - 2.0) / (C_SEVA - C_PULSO[1] - 2.0), dt);
    }
    // la cámara: la lámpara; cuando te toma el pulso, a él
    if (t >= C_PULSO[0] && t < C_PULSO[1] + 1.6) {
      e.rig.worldPos('head', this.look);
      const k = Math.min(1, (t - C_PULSO[0]) / 0.8) * Math.min(1, (C_PULSO[1] + 1.6 - t) / 0.8);
      this.ojos(lamp.lerp(this.look, k * 0.85), 60);
    } else this.ojos(lamp, 60);
    if (t >= C_SEVA) this.empiezaForcejeo();
  }
  // él, andando de (ax, az) a (bx, bz) (u: de 0 a 1)
  anda(ax, az, bx, bz, u, dt) {
    const e = this.F.e;
    const g = this.g;
    u = Math.min(1, Math.max(0, u));
    const x = lerp(ax, bx, u),
      z = lerp(az, bz, u);
    const vx = (x - e.pos.x) / Math.max(dt, 1e-3),
      vz = (z - e.pos.z) / Math.max(dt, 1e-3);
    e.pos.set(x, g.world.col.groundHeight(x, z, 0.3, 1), z);
    if (Math.hypot(vx, vz) > 0.05) e.yaw = Math.atan2(vx, vz);
    e.vx = vx;
    e.vz = vz;
  }

  // ------------------------------------------------------------ el forcejeo
  empiezaForcejeo() {
    const g = this.g;
    const F = this.F;
    this.fase = 'forcejeo';
    this.fT = 0;
    F.hide();
    F.e.scripted = true;
    const d = g.interact.list.find((i) => i.id === PATIO.id);
    if (d) g.interact.setOpen(d, false);
    g.audio && g.audio.play('doorSlam', { x: PATIO.x, y: 1, z: PATIO.z });
    if (!g.hintsShown.correas) {
      g.hintsShown.correas = true;
      g.say(MSG.correas);
    }
    this.correaQTE();
  }
  correaQTE() {
    const g = this.g;
    const p = g.player;
    p.anim.play(TIRA, { blend: 0.1 });
    this.n0 = 0;
    g.qte.start({
      action: 'light',
      label: MSG.correa[this.correa],
      mash: MASH_CORREA,
      window: 6.5,
      slow: 1,
      lenient: true,
      onDone: (ok) => {
        if (this.fase !== 'forcejeo') return;
        p.anim.play(ATADO, { blend: 0.2 });
        if (!ok) {
          this.reQ = 0.6;
          return;
        }
        // se suelta: la hebilla, la correa que cae
        const c = this.correas[this.correa];
        c.visible = false;
        g.audio && g.audio.play('unlock', c.position.lengthSq() ? c.position : { x: MESA.x, y: 1, z: MESA.z });
        g.camRig.shake(0.2);
        this.correa++;
        if (this.correa >= 3) this.libre();
        else this.reQ = 0.35;
      },
    });
  }
  forcejeo(dt) {
    const g = this.g;
    const F = this.F;
    const p = g.player;
    this.fT += dt;
    F.sleep = Math.max(0, F.sleep - dt * 0.2);
    if (!g.qte.active && this.reQ > 0 && (this.reQ -= dt) <= 0) this.correaQTE();
    // cada tirón se nota
    const q = g.qte.cur;
    if (q && q.n > this.n0) {
      this.n0 = q.n;
      g.camRig.shake(0.05);
      p.flinchX && p.flinchX.kick(-4);
    }
    // la cámara: a la correa que se trabaja (la muñeca izquierda, la
    // derecha, el pecho), con la lámpara arriba
    const tz = [MESA.z - 0.3, MESA.z + 0.3, MESA.z][Math.min(2, this.correa)];
    this.ojos(this.v.set(MESA.x + 0.55, 1.0, tz), 64, 0, 0.2);
    // se le oye venir: los pasos, del patio a la puerta
    const left = VUELVE - this.fT;
    if (left < OYE) {
      this.pasoT = (this.pasoT ?? 0) - dt;
      if (this.pasoT <= 0) {
        this.pasoT = 0.62;
        const k = 1 - left / OYE;
        F.e.pos.set(PATIO.x + (1 - k) * 0.4, 0, PATIO.z - 6 * (1 - k));
        g.audio && g.audio.enemyStep(F.e);
      }
    }
    if (this.cue('tararea', C_SEVA + VUELVE - OYE + 1.5)) fiSay(F.e, '...lo que no cura la medicina, lo cura el hierro...', 3);
    if (left <= 0) this.vuelveConElHierro();
  }
  // suelto: se levanta de la mesa; él sigue en la fragua (game/fisico.js)
  libre() {
    const g = this.g;
    this.fase = 'fin';
    this.outcome = 'libre';
    if (g.qte.active) g.qte.cancel();
    this.F.fraguaT = Math.max(2, VUELVE - this.fT);
  }
  // vuelve con el hierro al rojo
  vuelveConElHierro() {
    const g = this.g;
    const F = this.F;
    const e = F.e;
    this.fase = 'hierro';
    this.hT = 0;
    if (g.qte.active) g.qte.cancel();
    const d = g.interact.list.find((i) => i.id === PATIO.id);
    if (d) g.interact.setOpen(d, true);
    F.show(PATIO.x, PATIO.z, 0);
    e.scripted = true;
    fiGrp(e, 'vara', false);
    fiGrp(e, 'hierro', true);
    e.anim.stop(0);
    this.hierroLuz = g.fx.lights.add({ x: PATIO.x, y: 1.4, z: PATIO.z, color: 0xff5a18, intensity: 2.4, range: 4, flicker: 1, priority: 8 });
    fiSay(e, DIALOG.fisicoAlRojo, 3.2);
  }
  hierro(dt) {
    const g = this.g;
    const F = this.F;
    const e = F.e;
    this.hT += dt;
    const u = Math.min(1, this.hT / 2.2);
    this.anda(PATIO.x, PATIO.z, 54.0, 36.8, u, dt);
    if (this.hT > 2.2 && !this.cues.has('alza')) {
      this.cues.add('alza');
      e.vx = e.vz = 0;
      e.yaw = 0.2;
      e.anim.play(FI_CLIPS.hierro, { blend: 0.2 });
    }
    e.rig.worldPos('handR', this.v);
    this.hierroLuz.x = this.v.x;
    this.hierroLuz.y = this.v.y;
    this.hierroLuz.z = this.v.z;
    e.animate(dt);
    // la cámara: a él, que viene
    e.rig.worldPos('head', this.v);
    this.ojos(this.v, 58);
    if (this.hT > 3.4 && !this.cues.has('negroFin')) {
      this.cues.add('negroFin');
      g.fade = g.fadeTarget = 0;
      g.flash = 1;
      g.audio && g.audio.play('burn', g.player.pos);
      g.audio && g.audio.play('playerHurt', g.player.pos);
    }
    if (this.hT > 4.4) {
      this.outcome = 'muerte';
      this.fase = 'fin';
      return false;
    }
    return true;
  }

  skip() {
    // (sólo las escenas: el forcejeo no se salta)
    if (this.fase !== 'cine' || this.t >= C_SEVA - 0.2) return;
    if (this.t < C_MESA) {
      this.t = C_MESA - 0.01;
      this.escenas(0, this.t);
    }
    // (lo que se ha saltado no se dice: de golpe, todo a la vez)
    for (const c of ['duerme', 'dice1', 'asoma', 'desasoma', 'hierros', 'tintinea', 'pulso', 'dicePulso', 'ladea', 'fragua', 'anda2']) this.cues.add(c);
    if (this.cues.has('mesa')) this.F.e.anim.stop(0);
    this.t = C_SEVA - 0.05;
  }

  end() {
    const g = this.g;
    const F = this.F;
    const p = g.player;
    const e = F.e;
    if (g.qte.active) g.qte.cancel();
    g.post.U.uBars.value = 0;
    g.camRig.override = null;
    if (this.head) this.head.visible = true;
    if (this.cam) g.scene.remove(this.cam.root);
    for (const c of this.correas || []) g.scene.remove(c);
    for (const l of [this.luz, this.hierroLuz]) {
      if (!l) continue;
      l.on = false;
      const L = g.fx.lights.sources;
      const i = L.indexOf(l);
      if (i >= 0) L.splice(i, 1);
    }
    fiGrp(e, 'hierro', false);
    fiGrp(e, 'vara', true);
    e.anim.stop(0.01);
    p.puppet = false;
    p.tumbado = false;
    p.updateGear();
    g.ui.showHud(true);
    if (this.outcome === 'muerte') {
      // (a negro ya: muere en la mesa)
      F.fuera(30);
      F.sleep = 0;
      p.body.pos.set(MESA.x, 0, MESA.z + 0.9);
      p.visY = 0;
      p.state = 'free';
      p.die();
      return;
    }
    // suelto (o saltada la escena por lo que sea): se baja de la mesa
    F.hide();
    F.modo = 'fragua';
    F.fraguaT = F.fraguaT || VUELVE;
    F.sleep = 0;
    p.body.pos.set(MESA.x, 0, MESA.z + 0.85);
    p.visY = 0;
    p.body.vy = 0;
    p.yaw = 0;
    p.releasePin(true, 0);
    g.camRig.snapTo(p);
    g.camRig.yaw = 0.6;
    g.camRig.pitch = 0.25;
    g.camera.fov = g.camRig.fovBase;
    g.camera.updateProjectionMatrix();
    g.fadeTarget = 1;
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
  camilla(F) {
    const g = this.g;
    if (g.cutscene) g.endCutscene();
    g.cutscene = new CamillaCine(g, F);
    g.cutscene.start();
  }
}
