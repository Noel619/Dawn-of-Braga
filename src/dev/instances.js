// Instancias del modo de pruebas: ir directamente a un momento de una pelea
// (el arzobispo, cada acto de la película del jefe final y las otras peleas
// del juego), con las banderas como estarían en ese momento de una partida.
// Y los controles de los jefes de las peleas de siempre: matar el sigilo que
// toca, saltar de fase y ver por dónde se trepa y dónde están los sigilos.
//
// Desde la consola: __game.dev.instance('espringala2').
// (Deo Ignoto, el jefe opcional, no tiene instancias: su pelea vieja está en
// el código pero sin enganchar; ver finale/director.js.)
import * as THREE from 'three';
import { DEEP } from '../world/level_crypt2.js';

export const INSTANCES = [
  { id: 'arzobispo', name: 'Final · el arzobispo en la cisterna (pelea)' },
  { id: 'pelicula', name: 'Final · la película: el rito y la transformación (acto 1)' },
  { id: 'nave', name: 'Final · la película: del cráter a la nave (acto 1)' },
  { id: 'agarron', name: 'Final · la película: te atrapa y te lanza (acto 2)' },
  { id: 'herreria', name: 'Final · la película: la Herrería (acto 3)' },
  { id: 'espringala1', name: 'Final · la película: la primera espringala (acto 4)' },
  { id: 'cabalgada', name: 'Final · la película: la cabalgada (acto 5)' },
  { id: 'espringala2', name: 'Final · la película: la segunda espringala y el final (acto 6)' },
  { id: 'fin', name: 'Final · vencido: el río al amanecer' },
  { id: 'empalado', name: 'El Empalado (lo alto del Postigo)' },
  { id: 'bestia', name: 'La huida de la Bestia' },
  { id: 'descoyuntado', name: 'La caza del Descoyuntado' },
  { id: 'casa', name: 'La Casa del Alemán · la defensa de Henrique' },
  { id: 'leonor', name: 'La Casa del Alemán · Leonor, la Dolorosa (pelea)' },
  { id: 'tablon', name: 'La casa tapiada · el pasadizo, con un tablón' },
  { id: 'tonelero', name: 'La casa del tonelero · Miguel, en su rincón' },
  { id: 'ahorcado', name: 'La casa del tonelero · Miguel, ahorcado' },
  { id: 'garra', name: 'La cripta honda · el Custodio de la Garra (pelea)' },
  { id: 'paio', name: 'La cripta honda · Dom Paio, en el pozo (pelea)' },
  { id: 'velados', name: 'La cripta honda · los Velados (pelea)' },
  { id: 'puerta', name: 'La cripta honda · la Puerta del Dios Ignoto (todo listo)' },
];

// lo que pide la Puerta del Dios Ignoto (ver game/crypt.js)
const GOD = ['boss:guardianes', 'boss:guardianL', 'boss:guardianR', 'lever:p_pila_oeste', 'lever:p_pila_este', 'lever:p_pila_honda', 'god:incense'];
const DY_DAIS = -10; // el estrado de la puerta (y la cisterna)

const FINALE_FLAGS = ['finale:rite', 'finale:turSeen', 'boss:turiferario', 'boss:turibulario'];

// adelanta el juego n segundos (sin dibujar), o hasta que se cumpla 'until'
function ff(g, sec, until = null) {
  for (let t = 0; t < sec; t += 1 / 30) {
    if (until && until()) break;
    g.update(1 / 30);
  }
}
// el jugador, con todo lleno (lo que haya pasado mientras se adelantaba)
function heal(g) {
  const p = g.player;
  p.hp = p.maxHp;
  p.st = p.maxSt;
  if (p.state === 'stagger' || p.state === 'down') p.state = 'free';
}

// Deja la partida limpia antes de saltar: sin cinemáticas, sin jefe activo,
// el jugador vivo y con todo lleno, y las banderas que se piden.
function prepare(g, set = {}) {
  const p = g.player;
  if (g.cutscene) {
    g.cutscene.silent = true;
    g.endCutscene();
  }
  g.ui.closeAll();
  // (los avisos pendientes de la pelea de antes)
  g.hintQ = [];
  g.ui.clearToasts();
  if (g.chase.active) g.chase.reset();
  g.hunt.reset && g.hunt.reset();
  g.cine = null;
  g.slowmo = null;
  g.activeBoss = null;
  g.lockTarget = null;
  g.extraTargets = null;
  g.camRig.override = null;
  g.atmo.override = null;
  g.fadeTarget = 1;
  g.fade = 1;
  g.post.U.uBars.value = 0;
  g.post.U.uVignette.value = 1.25;
  g.ui.showHud(true);
  for (const k of Object.keys(set)) {
    if (set[k]) g.flags[k] = true;
    else delete g.flags[k];
  }
  g.finale.reset();
  g.applyWorldState();
  checkpoint(g);
  p.dead = false;
  p.hp = p.maxHp;
  p.st = p.maxSt;
  p.flasks = p.maxFlasks;
  p.state = 'free';
  p.puppet = false;
  p.autoDir = null;
}
// las banderas del final; antes de la victoria, la reja del río cerrada (y el
// último altar, el de la cripta, si no se ha llegado aún al del cruceiro)
const finale = (o) => {
  const f = Object.fromEntries(FINALE_FLAGS.map((k) => [k, !!o[k]]));
  if (!o['boss:turibulario']) f['door:d_salida'] = false;
  return f;
};
function checkpoint(g) {
  const F = g.flags;
  if (!F['boss:turibulario']) {
    const grate = g.interact.list.find((i) => i.id === 'd_salida');
    if (grate && grate.done) g.interact.reset(grate);
  }
  if (!F['boss:turiferario'] && g.lastAltar === 'a_cruceiro') g.lastAltar = 'a_cripta';
}
// la puerta de la Sé, abierta (se sale de la nave a la plaza: tras el rito
// se viene de dentro)
function openSe(g) {
  const it = g.interact.list.find((i) => i.id === 'd_se');
  if (it && !it.done) {
    g.interact.setOpen(it, true);
    g.flags['door:d_se'] = true;
  }
}
function place(g, x, y, z, yaw) {
  g.player.spawn(x, y, z, yaw);
  g.camRig.snapTo(g.player);
  g.camRig.yaw = yaw;
}

export async function goInstance(g, id) {
  const F = g.finale;
  switch (id) {
    case 'arzobispo': {
      // ante la niebla de la cisterna, con la Puerta del Dios Ignoto abierta:
      // se cruza y empieza la pelea
      prepare(g, { ...finale({}), ...Object.fromEntries(GOD.map((k) => [k, true])), 'door:d_dios': true });
      const b = g.bosses.turibulario;
      if (b) b.reset();
      place(g, -17.2, DY_DAIS, -152, Math.PI / 2);
      const fog = g.interact.list.find((i) => i.id === 'f_boss');
      if (fog) g.enterFog(fog);
      return true;
    }
    // la película del jefe final, desde cada punto de control (o desde los
    // de pruebas: la salida del cráter, el agarrón, la cabalgada)
    case 'pelicula':
    case 'nave':
    case 'agarron':
    case 'herreria':
    case 'espringala1':
    case 'cabalgada':
    case 'espringala2': {
      prepare(g, finale({}));
      const cp = { pelicula: 'rito', nave: 'nave', agarron: 'grab', herreria: 'establo', espringala1: 'torreSur', cabalgada: 'cabalgada', espringala2: 'muralla' }[id];
      await F.debugFilm(cp);
      return true;
    }
    // vencido: en la orilla, a la boca de la galería (el final de siempre)
    case 'fin':
      prepare(g, finale({ 'finale:rite': true, 'boss:turiferario': true, 'boss:turibulario': true }));
      F.setWorld(4);
      place(g, 0, 0, -198.4, Math.PI);
      return true;
    case 'empalado': {
      prepare(g, { 'boss:impaled': false, 'impaled:beast': false });
      const fog = g.interact.list.find((i) => i.id === 'f_impaled');
      place(g, 74, 9, -54.2, Math.PI);
      if (fog) g.enterFog(fog);
      return true;
    }
    case 'bestia':
      prepare(g, { 'boss:impaled': false, 'impaled:beast': true });
      place(g, 74, 9, -54.2, Math.PI);
      g.chase.resume();
      return true;
    case 'descoyuntado':
      prepare(g, { 'boss:descoyuntado': false, 'cine:sotano': false });
      g.startCutscene();
      return true;
    // la Casa del Alemán desde el principio: en el callejón, ante la puerta
    // que aporrean
    case 'casa': {
      for (const k of Object.keys(g.flags)) if (k.startsWith('board:') || k.startsWith('ale:')) delete g.flags[k];
      prepare(g, { 'door:d_aleman': false, 'boss:leonor': false });
      place(g, 50, 0, -94.6, Math.PI);
      return true;
    }
    // Leonor: ante la niebla de su gruta, bajo la casa
    case 'leonor': {
      prepare(g, { 'boss:leonor': false, 'door:d_sotano_ale': true, 'ale:door': true, 'ale:def': true, 'ale:lore': true, 'ale:reward': true });
      const fog = g.interact.list.find((i) => i.id === 'f_leonor');
      if (!fog) return false;
      place(g, fog.x, fog.y, fog.z + 1.4, Math.PI);
      g.enterFog(fog);
      return true;
    }
    // el sobrado de la casa tapiada, ante el hueco del pasadizo, con un tablón
    case 'tablon': {
      prepare(g, { 'door:d_souto': true, 'souto:tabla': false, 'morador:met': false, 'morador:ahorcado': false, 'morador:visto': false });
      if (!g.inventory.has('tablon')) g.inventory.add('tablon');
      place(g, -29.7, 3.8, -3.2, 0);
      return true;
    }
    // la casa del tonelero: en la sala, recién cruzado el pasadizo (Miguel,
    // en su rincón, sin haberte visto)
    case 'tonelero':
      prepare(g, { 'door:d_souto': true, 'souto:tabla': true, 'morador:met': false, 'morador:ahorcado': false, 'morador:visto': false });
      place(g, -29.7, 3.8, 4.6, 0);
      return true;
    case 'ahorcado':
      prepare(g, { 'door:d_souto': true, 'souto:tabla': true, 'morador:met': true, 'morador:ahorcado': true, 'morador:visto': false });
      place(g, -25.3, 3.8, 7.6, 0);
      return true;
    // el Relicario de San Martín, en su boca (al entrar se levanta el
    // Custodio y cae la reja)
    case 'garra': {
      prepare(g, { 'boss:custodio': false, 'take:i_garra': false });
      if (g.inventory.has('garra')) g.inventory.add('garra', -g.inventory.count('garra'));
      const C = DEEP.claw;
      place(g, C.x1 - 0.6, C.y, (C.gate.z0 + C.gate.z1) / 2, -Math.PI / 2);
      return true;
    }
    // Dom Paio, convertido: al pie de la escalera del pozo (los Velados, ya
    // vencidos; al bajar despierta)
    case 'paio': {
      prepare(g, { 'boss:guardianes': true, 'boss:guardianL': true, 'boss:guardianR': true, 'paio:gone': true, 'door:d_reja_pozo': true, 'boss:paioHollow': false, 'lever:p_pila_honda': false });
      const S = DEEP.pozoStair;
      place(g, (S.x0 + S.x1) / 2, DEEP.PY, DEEP.pozo.z1 - 0.6, Math.PI);
      return true;
    }
    // los Velados: al pie de la escalinata (al bajar a la nave despiertan y
    // sale la reja a la espalda)
    case 'velados': {
      prepare(g, { 'boss:guardianes': false, 'boss:guardianL': false, 'boss:guardianR': false });
      g.crypt.setVGate(false, true);
      const S = DEEP.stair;
      place(g, S.x1 + 1.0, DEEP.DY, S.z, Math.PI / 2);
      return true;
    }
    // la puerta, con todo hecho y la Garra en la mano
    case 'puerta':
      prepare(g, { ...Object.fromEntries(GOD.map((k) => [k, true])), 'door:d_dios': false });
      if (!g.inventory.has('garra')) g.inventory.add('garra');
      place(g, -18.6, DY_DAIS, -152, Math.PI / 2);
      return true;
  }
  return false;
}

// ------------------------------------------------------------ el jefe
// El jefe del final que está en pie ahora (o null).
function curBoss(g) {
  const F = g.finale;
  if ((F.stage === 'tur' || F.stage === 'intro') && F.tur) return F.tur;
  if ((F.stage === 'deo' || F.stage === 'deoIntro') && F.deo) return F.deo;
  return null;
}

// Mata el sigilo que toca: el Turiferario, la nuca o la mano (el núcleo si
// está de rodillas); Deo, el brazo plantado (o el que quede) y, desplomado,
// un ojo.
export function killSigil(g) {
  const b = curBoss(g);
  if (!b) return 'No hay ningún coloso en pie';
  if (b === g.finale.tur) {
    const kneel = b.st === 'kneel' || b.phase >= 3;
    const s = b.sigils.find((x) => !x.dead && (kneel ? x.core : !x.core));
    if (!s) return 'No le quedan sigilos';
    b.killSigil(s);
    return 'Sigilo: ' + s.id;
  }
  const bowed = b.st === 'bowed' || b.st === 'bow';
  let s = null;
  if (bowed) s = b.sigils.find((x) => x.eye && !x.dead);
  else s = b.sigils.find((x) => !x.eye && !x.dead && b.arms.planted(x.arm)) || b.sigils.find((x) => !x.eye && !x.dead);
  if (!s) return 'No le quedan sigilos';
  if (s.eye && b.st !== 'bowed') return 'Aún no se ha desplomado';
  b.killSigil(s);
  return 'Sigilo: ' + s.id;
}
// Salta a la siguiente fase (mata los sigilos que la cierran).
export function skipPhase(g) {
  const b = curBoss(g);
  if (!b) return 'No hay ningún coloso en pie';
  if (b === g.finale.tur) {
    const left = b.sigils.filter((x) => !x.core && !x.dead);
    if (left.length) {
      for (const s of left) b.killSigil(s);
      return 'Fase 3: de rodillas';
    }
    const core = b.sigils.find((x) => x.core && !x.dead);
    if (core) b.killSigil(core);
    return 'Revienta';
  }
  if (b.st === 'bowed') {
    for (const s of b.sigils.filter((x) => x.eye && !x.dead)) b.killSigil(s);
    return 'Muere';
  }
  const arms = b.sigils.filter((x) => !x.eye && !x.dead);
  if (arms.length) {
    b.killSigil(arms[0]);
    return arms.length > 1 ? 'Le queda un brazo' : 'Se desploma';
  }
  return 'Esperando a que se desplome';
}

// ------------------------------------------------------------ ver cuerdas y sigilos
// Las cuerdas por las que se trepa (líneas, en verde las activas: la cadena
// de la campana), los sigilos (esferas del tamaño de su alcance) y las
// esferas de la cabeza de Deo tumbado.
export class BossDebug {
  constructor(g) {
    this.g = g;
    this.grp = new THREE.Group();
    this.grp.renderOrder = 10;
    this.lines = [];
    this.balls = [];
    this.on = false;
    g.scene.add(this.grp);
    this.grp.visible = false;
    this.matOn = new THREE.LineBasicMaterial({ color: 0x40ff70, depthTest: false, transparent: true });
    this.matOff = new THREE.LineBasicMaterial({ color: 0x507060, depthTest: false, transparent: true, opacity: 0.5 });
    this.ballMat = new THREE.MeshBasicMaterial({ color: 0xffc040, wireframe: true, depthTest: false, transparent: true, opacity: 0.6 });
    this.headMat = new THREE.MeshBasicMaterial({ color: 0x40a0ff, wireframe: true, depthTest: false, transparent: true, opacity: 0.35 });
    this.ballGeo = new THREE.SphereGeometry(1, 12, 8);
    this._p = new THREE.Vector3();
    this._t = new THREE.Vector3();
    this._n = new THREE.Vector3();
  }
  set(on) {
    this.on = on;
    this.grp.visible = on;
  }
  _line(i) {
    let L = this.lines[i];
    if (!L) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 3), 3));
      L = new THREE.Line(geo, this.matOn);
      L.frustumCulled = false;
      L.renderOrder = 10;
      this.grp.add(L);
      this.lines.push(L);
    }
    L.visible = true;
    return L;
  }
  _ball(i, mat) {
    let B = this.balls[i];
    if (!B) {
      B = new THREE.Mesh(this.ballGeo, mat);
      B.frustumCulled = false;
      B.renderOrder = 10;
      this.grp.add(B);
      this.balls.push(B);
    }
    B.material = mat;
    B.visible = true;
    return B;
  }
  update() {
    if (!this.on) return;
    const F = this.g.finale;
    const boss = F.climb.boss || F.tur || F.deo;
    let li = 0,
      bi = 0;
    if (boss && boss.visible !== false) {
      // (la piel entera se trepa: se dibujan las cuerdas, como la cadena)
      const ropes = boss.ropes ? boss.ropes() : [];
      for (const r of ropes) {
        if (!r || !r.L) continue;
        const L = this._line(li++);
        L.material = r.on ? this.matOn : this.matOff;
        const pos = L.geometry.attributes.position;
        const n = 64;
        for (let k = 0; k < n; k++) {
          r.at((k / (n - 1)) * r.L, this._p, this._t);
          pos.setXYZ(k, this._p.x, this._p.y, this._p.z);
        }
        pos.needsUpdate = true;
        L.geometry.setDrawRange(0, n);
      }
      for (const s of boss.sigils || []) {
        if (s.dead) continue;
        const B = this._ball(bi++, this.ballMat);
        boss.sigilPos(s, B.position);
        B.scale.setScalar(s.r + (s.eye ? 2.4 : 1.5));
      }
      // la cabeza de Deo tumbado (no se entra en ella)
      if (boss.HEAD_BALLS && (boss.st === 'bowed' || boss.st === 'bow')) {
        for (const h of boss.HEAD_BALLS) {
          const B = this._ball(bi++, this.headMat);
          boss.maskP(h[0], h[1], h[2], B.position);
          B.scale.setScalar(h[3] * 1.55);
        }
      }
    }
    for (let i = li; i < this.lines.length; i++) this.lines[i].visible = false;
    for (let i = bi; i < this.balls.length; i++) this.balls[i].visible = false;
  }
}
