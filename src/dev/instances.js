// Instancias del modo de pruebas: ir directamente a un momento de una pelea
// (el rito, el Turiferario, Deo Ignoto y las otras peleas del juego), con las
// banderas como estarían en ese momento de una partida. Y los controles de
// los jefes: matar el sigilo que toca, saltar de fase y ver por dónde se
// trepa y dónde están los sigilos.
//
// Desde la consola: __game.dev.instance('deoMascara'), __game.dev.act('killSigil').
import * as THREE from 'three';

export const INSTANCES = [
  { id: 'rito', name: 'Final · el rito de la cisterna' },
  { id: 'subida', name: 'Final · la subida, tras el rito' },
  { id: 'turSale', name: 'Final · el Turiferario sale del suelo' },
  { id: 'tur', name: 'Final · el Turiferario: la pelea' },
  { id: 'turRodillas', name: 'Final · el Turiferario, de rodillas' },
  { id: 'nave', name: 'Final · la nave estalla: se alza Deo' },
  { id: 'deo', name: 'Final · Deo Ignoto: la pelea' },
  { id: 'deoBrazo', name: 'Final · Deo Ignoto con un brazo menos' },
  { id: 'deoMascara', name: 'Final · Deo desplomado: la máscara' },
  { id: 'fin', name: 'Final · el dios vencido (al río)' },
  { id: 'empalado', name: 'El Empalado (lo alto del Postigo)' },
  { id: 'bestia', name: 'La huida de la Bestia' },
  { id: 'descoyuntado', name: 'La caza del Descoyuntado' },
];

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
  p.dead = false;
  p.hp = p.maxHp;
  p.st = p.maxSt;
  p.flasks = p.maxFlasks;
  p.state = 'free';
  p.puppet = false;
  p.autoDir = null;
}
const finale = (o) => Object.fromEntries(FINALE_FLAGS.map((k) => [k, !!o[k]]));
function place(g, x, y, z, yaw) {
  g.player.spawn(x, y, z, yaw);
  g.camRig.snapTo(g.player);
  g.camRig.yaw = yaw;
}

export async function goInstance(g, id) {
  const F = g.finale;
  switch (id) {
    case 'rito': {
      prepare(g, finale({}));
      // ante la niebla del sello, abierto
      const seal = g.interact.list.find((i) => i.id === 'd_sello');
      if (seal && !seal.done) {
        g.interact.setOpen(seal, true);
        g.flags['door:d_sello'] = true;
      }
      const b = g.bosses.turibulario;
      if (b) b.reset();
      place(g, 0, -7, -135.2, Math.PI);
      const fog = g.interact.list.find((i) => i.id === 'f_boss');
      if (fog) g.enterFog(fog);
      return true;
    }
    case 'subida':
      prepare(g, finale({ 'finale:rite': true }));
      place(g, 0, -10, -142.6, 0);
      return true;
    case 'turSale':
      // en el pórtico de la Sé, asomado a la plaza: revienta el empedrado
      prepare(g, finale({ 'finale:rite': true }));
      await F.ensureTur();
      place(g, 1, 0.6, -57.6, 0);
      return true;
    case 'tur':
      prepare(g, finale({ 'finale:rite': true, 'finale:turSeen': true }));
      await F.debugTur({ x: 9, z: -44 });
      // (la presentación, de corrido: se para al empezar la pelea)
      ff(g, 8, () => F.stage === 'tur');
      heal(g);
      return true;
    case 'turRodillas': {
      prepare(g, finale({ 'finale:rite': true, 'finale:turSeen': true }));
      await F.debugTur({ x: 9, z: -44 });
      ff(g, 8, () => F.stage === 'tur');
      const t = F.tur;
      for (const s of t.sigils) if (!s.core && !s.dead) t.killSigil(s);
      ff(g, 8, () => t.st === 'kneel' && t.stT > 4);
      heal(g);
      return true;
    }
    case 'nave':
      prepare(g, finale({ 'finale:rite': true, 'finale:turSeen': true, 'boss:turiferario': true }));
      await F.debugDeo({ rise: true });
      return true;
    case 'deo':
    case 'deoBrazo':
    case 'deoMascara': {
      prepare(g, finale({ 'finale:rite': true, 'finale:turSeen': true, 'boss:turiferario': true }));
      await F.debugDeo({ x: 3, z: -46 });
      ff(g, 0.1);
      F.startDeoFight();
      const d = F.deo;
      if (id === 'deoBrazo') d.killSigil(d.sig.brazo4);
      if (id === 'deoMascara') {
        d.killSigil(d.sig.brazo4);
        d.killSigil(d.sig.brazo5);
        // el desplome y su cinemática, de corrido
        ff(g, 12, () => d.st === 'bowed' && !F.bowCam);
      }
      heal(g);
      return true;
    }
    case 'fin':
      prepare(g, finale({ 'finale:rite': true, 'finale:turSeen': true, 'boss:turiferario': true, 'boss:turibulario': true }));
      for (const it of g.interact.list) if (it.kind === 'door' && (it.id === 'd_se' || (it.lock.type === 'boss' && it.lock.boss === 'turibulario'))) g.flags['door:' + it.id] = true;
      g.applyWorldState();
      place(g, 2, 0, -45, Math.PI);
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

// ------------------------------------------------------------ ver rutas y sigilos
// Las rutas de trepar (líneas, en verde las activas), los sigilos (esferas
// del tamaño de su alcance) y las esferas de la cabeza de Deo tumbado.
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
      const routes = boss.routes ? boss.routes() : [];
      for (const r of routes) {
        if (!r || !r.L) continue;
        r.eval && r.eval();
        const L = this._line(li++);
        L.material = r.on ? this.matOn : this.matOff;
        const pos = L.geometry.attributes.position;
        const n = 64;
        for (let k = 0; k < n; k++) {
          r.sample((k / (n - 1)) * r.L, this._p, this._t, this._n);
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
