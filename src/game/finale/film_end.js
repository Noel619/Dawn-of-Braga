// La película, acto 6: la segunda espringala y el final.
//
// Herido, va al cráter, se arrodilla en el borde y hunde el brazo del virote
// en la sangre negra que hierve: la carne se le cierra y escupe el virote.
// Tramo jugable: por el adarve hasta la torre del oeste de la brecha, la
// escala de dentro y la trampilla de lo alto. La espringala: el virote, a la
// nuca (mientras se cura, de espaldas a la torre).
//
// Momento God of War 2: se revuelve, suelta la campana (rueda al cráter
// tañendo) y embiste contra la torre; se agarra a las almenas con la derecha
// y su cara llega a lo alto, a dos metros: te ruge — ¡Salta! a su cara — te
// agarras a la jaula — ¡Apuñala! el ojo, entre los barrotes — retrocede
// tambaleándose hacia el cráter — ¡Salta! de vuelta a la torre (te agarras a
// las almenas: ¡Trepa!) — el borde del cráter cede y cae de espaldas a la
// sangre; la cadena de la nuca se tensa y arrastra lo alto de la torre —
// ¡Corta! (machacar: hachazos a la cadena) — la cadena salta; se hunde en la
// sangre negra, la mano alzada, y la tierra le cae encima. Silencio: las
// campanas callan. Amanece; y el final de siempre, en el río.
import * as THREE from 'three';
import { sm, lerp, camSafe } from './film.js';
import { FP } from './film_player.js';
import { armDriver } from './film_tower.js';
import { armBolt } from './film_ride.js';
import { shootGun } from './film_gun.js';
import { Springald, BOLT_L } from './springald.js';
import { TOWER_N, CISTERN, BLOOD_Y } from '../../world/level_finale.js';
import { clamp, dampAngle } from '../../core/util.js';

const V3 = THREE.Vector3;
const rnd = (a, b) => a + Math.random() * (b - a);
const _v = new V3(),
  _v2 = new V3(),
  _v3 = new V3();
const _I = new THREE.Quaternion();
const DUST = [0.26, 0.24, 0.22];
const STEAM = [0.5, 0.47, 0.45];
const GORE = [0.32, 0.03, 0.03];
const YN = 10; // el suelo del adarve norte
const TN = TOWER_N;
// el cráter: el centro y la superficie de la sangre
const C0 = new V3(0, 0, CISTERN.cz);
const SURF = CISTERN.AY + BLOOD_Y;
// donde se arrodilla a curarse (en el borde, del lado de la torre) mirando
// al centro; la mano izquierda, en la sangre
const RIM = { x: -9.5, z: -143.1 };
RIM.yaw = Math.atan2(C0.x - RIM.x, C0.z - RIM.z);
const HEAL_W = [2.6, SURF - 0.25, 7.6]; // (espacio del modelo, con la raíz en el suelo)
// dónde se planta contra la torre: al norte, mirándola (la cara, por encima
// del parapeto del norte); y dónde le espera el jugador, delante de la
// espringala
const AT_TOWER = { x: TOWER_N.x + 0.2, z: TOWER_N.z - TOWER_N.w / 2 - 6.6 };
const FACE_P = { x: TOWER_N.x - 0.6, z: TOWER_N.z - 0.9 };
// el pie de la escala y la trampilla
const LAD = { x: TN.ladder.x, z: -125.4 };
const HATCH = new V3((TN.hatch[0] + TN.hatch[2]) / 2, TN.top, (TN.hatch[1] + TN.hatch[3]) / 2);
// el borde norte de lo alto de la torre (las almenas) y el hueco del medio
const TOP_N = TN.z - TN.w / 2 - 0.3;
const CRENEL_X = -30.0;

function endAtmo() {
  return { density: 0.0085, vol: 0.05, far: 320, bloom: 1.25, hemi: 3.2, moon: 3.3, moonPos: [-20, 30, -10], fog: 0x34302e, exposure: 1.2, ash: 0.3 };
}

// La espringala de lo alto de la torre del oeste de la brecha
export function springald2(D) {
  if (D.springald2) return D.springald2;
  const g = D.g;
  const [gx, gy, gz] = TN.gun;
  const yaw = Math.atan2(RIM.x - gx, RIM.z - gz);
  const S = new Springald(g, { pos: new V3(gx, gy, gz), yaw, bollard: new V3(...TN.bollard), chainLen: 46, pitchLim: [-26, 14], yawLim: 70 });
  S.onClick = () => g.audio && g.audio.play('unlock', S.base, { k: 0.6 });
  D.springald2 = S;
  D.tick(S);
  return S;
}

// ======================================================================
// ACTO 6
// ======================================================================
export function* actEnd(D, o = {}) {
  const g = D.g,
    p = g.player;
  const G = yield* D.waitGiant();
  if (o.fromCP || !D.gow1) setupEnd(D, G);
  const S = springald2(D);
  g.chaseRun = false;
  // ------------------------------------------------- 1. al cráter: se cura
  const healing = yield* heal(D, G);
  if (p.dead) return;
  // ------------------------------------------------- 2. hasta lo alto de la torre
  yield* toTower(D, G);
  if (p.dead) return;
  yield* climbLadder(D, G, S);
  if (p.dead) return;
  // ------------------------------------------------- 3. la espringala: a la nuca
  const hit = yield* shootGun(D, G, S, {
    toast: 'La nuca: ¡dispara!',
    behave: () => healing,
    near: 7.5,
    devAim: (G, out) => nape(G, out),
    assist: {
      point: (G) => nape(G, new V3()),
      capsule: (G) => [G.M.byName.neck1.getWorldPosition(new V3()), G.M.byName.head.getWorldPosition(new V3()), 1.4],
      bone: (G) => G.M.byName.neck2,
      depth: 0.95,
      through: true,
    },
  });
  if (p.dead || !hit) return;
  // ------------------------------------------------- 4. el momento God of War 2
  yield* gow2(D, G, S, hit);
  if (p.dead) return;
  // ------------------------------------------------- 5. se hunde; amanece
  yield* sinkAndDawn(D, G, S);
}

// la nuca: detrás de lo alto del cuello (mundo)
function nape(G, out) {
  return G.bp('neck2', 0, 16.0, 0.6, out);
}

// Desde el punto de control: el jugador en el adarve, junto a la brecha; el
// gigante, más allá de la muralla, camino del cráter, con el virote de la
// primera espringala en el antebrazo
function setupEnd(D, G) {
  const g = D.g,
    F = D.film;
  F.cinema(true, { instant: true });
  F.puppet(true);
  F.setP(-13.7, YN, -123.0, Math.atan2(-2.1 + 13.7, -134.6 + 123.0));
  g.player.anim.stop(0.1);
  G.place(-2.1, -134.6, Math.PI, { base: 'idle' });
  G.setBell(true);
  G.groundFn = null;
  armBolt(D, G);
  g.atmo.override = { ...endAtmo(), snap: true };
  g.fadeTarget = 1;
  g.audio && g.audio.music('bossFinal');
}

// ---------------------------------------------------------------------
// 1. Va al cráter, se arrodilla en el borde y hunde el brazo en la sangre:
// la carne se le cierra y escupe el virote. Devuelve la corrutina de la cura
// (sigue mientras el jugador va a la torre y dispara)
function* heal(D, G) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  F.cinema(true);
  F.puppet(true);
  p.autoDir = null;
  p.anim.stop(0.2);
  g.atmo.override = endAtmo();
  G._armScript = true;
  const arm = D.arm || (D.arm = armDriver(D, G));
  arm.to({ w: [3.4, 8.6, 1.6], pole: [10, 8, -2] }, 0.6);
  arm.shake = 0;
  const B = G.bell;
  const bellG = (B.guide = { target: G.wp(-3.5, 0.8, -8, new V3()), k: 6, d: 3.5, antiGrav: false });
  const bellAt = [-3.5, 0.8, -8];
  F.also(
    (function* () {
      while (B.guide === bellG) {
        yield;
        G.wp(...bellAt, bellG.target);
      }
    })()
  );
  // (a) desde el adarve, al oeste y en alto: el jugador le mira irse al cráter
  const P0 = p.pos.clone();
  p.yaw = Math.atan2(G.pos.x - P0.x, G.pos.z - P0.z);
  const camA = new V3(P0.x - 3.8, P0.y + 4.0, P0.z + 4.5);
  F.follow(() => ({ pos: camA, look: G.chest(new V3()).lerp(P0, 0.38), fov: 56 }));
  F.hand = 0.025;
  G.stopAction(0.4);
  G.base('march', { blend: 0.5 });
  G.rootMotion = true;
  G.speedK = 0.75;
  G.lookW = 0.4;
  G.lookAt = null;
  let t = 0;
  while (t < 9) {
    const dt = yield;
    t += dt;
    const dx = RIM.x - G.pos.x,
      dz = RIM.z - G.pos.z;
    const d = Math.hypot(dx, dz);
    G.yaw = dampAngle(G.yaw, d > 2 ? Math.atan2(dx, dz) : RIM.yaw, 2.2, dt);
    if (d < 0.5) break;
  }
  G.rootMotion = false;
  G.base('idle', { blend: 0.5 });
  // (se vuelve hacia el centro del cráter)
  t = 0;
  while (t < 0.6) {
    const dt = yield;
    t += dt;
    G.yaw = dampAngle(G.yaw, RIM.yaw, 4, dt);
  }
  // (b) se arrodilla en el borde: desde el adarve, al este; la torre a la
  // izquierda, el cráter a la derecha
  G.play('kneelRim', { blend: 0.4 });
  bellAt[0] = -4.6;
  bellAt[2] = 3.5;
  Object.assign(bellG, { k: 10, d: 5 });
  F.shot([3, 15, -114], [-16, 5, -136], { fov: 64 });
  F.hand = 0.02;
  let knees = false;
  G.onEventHook = (e) => {
    if (e === 'knees' && !knees) {
      knees = true;
      const k = G.wp(0, 0, 1.5, new V3());
      a && a.play('slam', k, { k: 2.2 });
      g.camRig.shake(0.5);
      D.debris.burst(k.setY(0.3), 20, { speed: 6, up: 4, size: 0.7, spread: 2.5 });
      g.fx.blood.emit(k.x, 0.5, k.z, 50, { color: DUST, speed: 5, life: 2, up: 1.4, gravity: 0.3 });
    }
  };
  while (G.actT < 1.7) yield;
  G.base('healLoop', { blend: 0.6 });
  // (c) el brazo a la sangre: a ras del borde del cráter, del otro lado
  arm.to({ w: [HEAL_W[0], HEAL_W[1] + 3.5, HEAL_W[2] - 1.2], pole: [10, 8, 2] }, 0.8);
  yield* F.wait(0.8);
  const inBlood = G.wp(...HEAL_W, new V3());
  arm.toWorld(inBlood, 0.5);
  // (c) desde el otro lado del cráter: el brazo, a la sangre que hierve; el
  // virote que escupe la carne al cerrarse
  F.shot([-2, 5, -160], inBlood.clone().add(_v.set(-1, 3.5, 0)), { fov: 58 });
  F.hand = 0.03;
  yield* F.wait(0.5);
  // ¡en la sangre! hierve, chisporrotea; ruge
  a && a.play('fleshBurst', inBlood, { k: 2 });
  a && a.play('beastRoarBig', G.face(_v), { k: 2.4 });
  g.camRig.shake(0.5);
  g.fx.blood.emit(inBlood.x, SURF + 0.2, inBlood.z, 80, { color: GORE, speed: 6, life: 1.4, up: 3, gravity: 9 });
  const steam = (D._steam = steamer(D, () => G.M.byName.foreL.getWorldPosition(_v3), 1));
  F.also(steam.run());
  yield* F.wait(1.4);
  // (d) la carne se cierra y escupe el virote
  const bolt = D.gow1 && D.gow1.bolt;
  if (bolt) {
    spitBolt(D, G, bolt);
    a && a.play('fleshTear', G.M.byName.foreL.getWorldPosition(_v), { k: 1.8 });
    yield* F.wait(1.3);
  }
  // (e) detrás del jugador: la torre del oeste, con su espringala arriba
  const P = p.pos.clone();
  p.yaw = Math.atan2(TN.x - P.x, TN.z - P.z);
  F.shot([P.x + 2.4, P.y + 1.8, P.z + 0.5], [TN.x, TN.top - 1.0, TN.z], { fov: 50 });
  F.hand = 0.02;
  yield* F.wait(1.6);
  G.onEventHook = null;
  return healCo(D, G, steam);
}

// la cura, mientras tanto: de rodillas, el brazo en la sangre; vapor, y de
// vez en cuando un rugido sordo
function healCo(D, G, steam) {
  const a = D.g.audio;
  const co = (function* () {
    let roar = 3;
    while (!co.stop) {
      const dt = yield;
      roar -= dt;
      if (roar <= 0) {
        roar = rnd(4.5, 7);
        a && a.play(Math.random() < 0.5 ? 'beastRoar' : 'beastHurt', G.face(_v), { k: 1.2 });
      }
    }
    void steam;
  })();
  co.stop = false;
  return co;
}

// vapor que sube de algo (k: cuánto)
function steamer(D, at, k) {
  const g = D.g;
  const S = { k, stop: false };
  S.run = function* () {
    while (!S.stop) {
      const dt = yield;
      if (Math.random() < dt * 22 * S.k) {
        const q = at();
        g.fx.blood.emit(q.x + rnd(-0.8, 0.8), q.y + rnd(-0.5, 0.5), q.z + rnd(-0.8, 0.8), 3, { color: STEAM, speed: 1.2, life: 2.4, up: 2.4, gravity: -0.6 });
      }
    }
  };
  return S;
}

// el virote sale del antebrazo y cae a la sangre
function spitBolt(D, G, bolt) {
  const g = D.g;
  bolt.mesh.updateWorldMatrix(true, false);
  const q = bolt.mesh.getWorldQuaternion(new THREE.Quaternion());
  const along = new V3(0, 0, 1).applyQuaternion(q);
  bolt.stuck = null;
  bolt.done = false;
  bolt.hitTest = null;
  bolt.onHit = null;
  // (la punta: pos; sale hacia fuera, girando)
  bolt.pos.copy(bolt.tail).addScaledVector(along, BOLT_L);
  bolt.vel.copy(along).multiplyScalar(5).add(_v.set(0, 3, 0));
  const tip = bolt.pos.clone();
  g.fx.blood.emit(tip.x, tip.y, tip.z, 40, { color: GORE, speed: 5, life: 1.2, up: 1.5, dir: along });
  // (sin cadena que la sujete: la suelta del todo)
  const S1 = bolt.S;
  if (S1 && S1.rope) S1.rope.pin(1, null);
  D.film.also(
    (function* () {
      let t = 0;
      while (t < 3) {
        const dt = yield;
        t += dt;
        if (bolt.pos.y < SURF) {
          g.fx.blood.emit(bolt.pos.x, SURF + 0.1, bolt.pos.z, 20, { color: GORE, speed: 3, life: 0.8, up: 2, gravity: 9 });
          bolt.mesh.visible = false;
          break;
        }
      }
    })()
  );
}

// ---------------------------------------------------------------------
// 2. Por el adarve hasta la torre del oeste (con control): dentro, la escala
function* toTower(D, G) {
  const g = D.g,
    F = D.film,
    p = g.player;
  void G;
  F.cinema(false);
  F.puppet(false);
  p.anim.stop(0.15);
  F.release(-Math.PI / 2, 0.2);
  g.ui.toast('La torre del oeste: sube a la espringala', 3.4);
  let climb = false;
  const nearLadder = () => Math.hypot(p.pos.x - LAD.x, p.pos.z - LAD.z) < 1.4 && Math.abs(p.pos.y - YN) < 0.8;
  D.promptFn = () => (!climb && nearLadder() ? { kind: 'colossus', label: 'Subir por la escala', onUse: () => (climb = true) } : undefined);
  // (modo de pruebas: anda solo hasta la escala)
  const dev = g.dev && g.dev.autoQTE;
  const route = [new V3(TN.x + TN.w / 2 + 0.8, YN, TN.z), new V3(TN.x + 0.6, YN, TN.z - 0.4), new V3(LAD.x + 0.3, YN, LAD.z + 0.3)];
  let wp = 0;
  try {
    while (!climb) {
      yield;
      if (p.dead) return;
      if (dev) {
        if (wp < route.length) {
          const w = route[wp];
          const dx = w.x - p.pos.x,
            dz = w.z - p.pos.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.4) wp++;
          else p.autoDir = { x: dx / d, z: dz / d, m: 1 };
        } else {
          p.autoDir = null;
          if (nearLadder()) climb = true;
        }
      }
    }
  } finally {
    D.promptFn = null;
    p.autoDir = null;
  }
}

// La escala: sube, abre la trampilla y sale a lo alto; la cierra detrás. Y
// desde lo alto: la espringala y, al fondo, él, curándose de espaldas
function* climbLadder(D, G, S) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  F.cinema(true);
  F.puppet(true);
  const lean = TN.ladder.lean;
  const zAt = (y) => TN.ladder.z + 0.42 + (TN.top - y) * Math.sin(lean);
  F.setP(LAD.x, YN, zAt(YN), Math.PI);
  F.pClip(FP.ladder, { blend: 0.15 });
  a && a.play('climb', p.pos);
  // (desde la sala, abajo: sube hacia la trampilla)
  F.shot([LAD.x + 2.6, YN + 1.0, TN.z + 1.6], [LAD.x, YN + 3.6, LAD.z - 0.4], { fov: 64 });
  F.hand = 0.02;
  let y = YN;
  while (y < TN.top - 2.25) {
    const dt = yield;
    y = Math.min(TN.top - 2.25, y + dt * 2.0);
    F.setP(LAD.x, y, zAt(y), Math.PI);
  }
  // la trampilla, de un empujón
  F.pClip('interact', { blend: 0.1 });
  yield* F.wait(0.25);
  g.setGroupVisible('trampillaN', false);
  g.setGroupVisible('trampillaNOpen', true);
  a && a.play('stairCreak', HATCH, { k: 1.4 });
  a && a.play('woodHit', HATCH, { k: 1.2 });
  g.fx.blood.emit(HATCH.x, HATCH.y + 0.3, HATCH.z, 30, { color: DUST, speed: 2.5, life: 1.4, up: 1.4, gravity: 0.4 });
  // (desde lo alto: sale por el hueco)
  F.shot([HATCH.x + 2.4, TN.top + 1.7, HATCH.z + 2.6], [HATCH.x, TN.top + 0.6, HATCH.z], { fov: 58 });
  F.pClip(FP.ladder, { blend: 0.1 });
  while (y < TN.top - 1.0) {
    const dt = yield;
    y = Math.min(TN.top - 1.0, y + dt * 2.0);
    F.setP(LAD.x, y, zAt(y), Math.PI);
  }
  // se encarama
  F.pClip('climbUp', { blend: 0.08 });
  const from = new V3(LAD.x, y, zAt(y)),
    to = new V3(HATCH.x, TN.top, HATCH.z + 1.25);
  let t = 0;
  while (t < 0.9) {
    const dt = yield;
    t += dt;
    const k = sm(clamp(t / 0.9, 0, 1));
    F.setP(lerp(from.x, to.x, k), lerp(from.y, to.y, Math.min(1, k * 1.6)), lerp(from.z, to.z, k), Math.PI - Math.PI * k);
  }
  // y cierra la trampilla
  g.setGroupVisible('trampillaN', true);
  g.setGroupVisible('trampillaNOpen', false);
  a && a.play('woodHit', HATCH, { k: 1.0 });
  p.anim.stop(0.2);
  // (detrás de la espringala: él, al fondo, en el cráter)
  const sp = S.standPoint(new V3());
  const fw = S.forward(new V3());
  F.shot(sp.clone().addScaledVector(fw, -1.6).add(_v.set(0, 2.4, 0)), G.chest(new V3()).lerp(S.muzzle(_v2), 0.15), { fov: 50 });
  F.hand = 0.02;
  yield* F.wait(1.8);
}

// ---------------------------------------------------------------------
// 4. El momento God of War 2
function* gow2(D, G, S, bolt) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  F.cinema(true);
  F.puppet(true);
  F.cam = null;
  const arm = D.arm;
  const B = G.bell;
  // ---- el virote en la nuca: se arquea y grita (de cerca, por detrás)
  F.slow(0.45, 8);
  G.stopAction(0.05);
  G.play('napeHit', { blend: 0.08 });
  arm.to({ w: [4.6, 9.5, 4.0], pole: [10, 9, 0] }, 0.5);
  // (desde lo alto, por encima del hombro del jugador: la cadena tendida de
  // la espringala a su nuca)
  const sp0 = S.standPoint(new V3());
  F.setP(sp0.x, sp0.y, sp0.z, S.worldYaw);
  F.pClip(FP.windStand, { blend: 0.3 });
  F.follow(() => {
    const P = p.pos;
    const nk = nape(G, new V3());
    const d = _v.subVectors(nk, P).setY(0).normalize();
    return { pos: new V3(P.x - d.x * 2.4 - d.z * 1.3, P.y + 2.3, P.z - d.z * 2.4 + d.x * 1.3), look: nk.add(_v2.set(0, 1.5, 0)), fov: 46 };
  });
  F.hand = 0.04;
  a && a.play('beastRoarBig', G.face(_v), { k: 2.6 });
  g.camRig.shake(0.9);
  g.input.rumble(1, 1, 700);
  yield* F.wait(0.6);
  F.slow(1, 4);
  // (el brazo sale de la sangre, humeando: curado)
  if (D._steam) D._steam.k = 0.45;
  while (G.actT < 2.0) yield;
  if (D._steam) D._steam.stop = true;
  // ---- se levanta y se vuelve hacia la torre; suelta la campana, que rueda
  // al cráter tañendo. Desde lo alto: la cadena, tendida hasta su nuca
  G.play('riseKneel', { blend: 0.3 });
  const yaw0 = G.yaw,
    yaw1 = Math.atan2(AT_TOWER.x - G.pos.x, AT_TOWER.z - G.pos.z);
  dropBell(D, G);
  const sp = S.standPoint(new V3());
  F.setP(sp.x, sp.y, sp.z, S.worldYaw);
  F.pClip(FP.windStand, { blend: 0.3 });
  F.follow(() => {
    const P = p.pos;
    const h = G.head(new V3());
    const d = _v.subVectors(h, P).setY(0).normalize();
    return { pos: new V3(P.x - d.x * 2.6 - d.z * 1.1, P.y + 2.1, P.z - d.z * 2.6 + d.x * 1.1), look: h.add(_v2.set(0, -4, 0)), fov: 52 };
  });
  F.hand = 0.025;
  while (!G.actDone && G.actT < 2.1) {
    const dt = yield;
    G.yaw = yaw0 + angDiff(yaw1, yaw0) * sm(clamp(G.actT / 1.9, 0, 1));
    void dt;
  }
  G.yaw = yaw1;
  // ---- embiste contra la torre: a cuatro patas, a por ti
  G.stopAction(0.3);
  G.base('gallop', { blend: 0.35 });
  G.rootMotion = true;
  G.speedK = 1;
  a && a.play('beastRoarBig', G.face(_v), { k: 2.6 });
  // (a ras del campo, a un lado de su camino: pasa como un toro, hacia la
  // torre)
  const camE = new V3(-16.0, 2.4, -127.6);
  F.follow(() => ({ pos: camE, look: G.head(new V3()).lerp(new V3(TN.x, TN.top, TN.z), 0.25), fov: 60 }));
  F.hand = 0.05;
  let t = 0;
  while (t < 6) {
    const dt = yield;
    t += dt;
    const dx = AT_TOWER.x - G.pos.x,
      dz = AT_TOWER.z - G.pos.z;
    const d = Math.hypot(dx, dz);
    G.yaw = dampAngle(G.yaw, Math.atan2(dx, dz), 3, dt);
    if (d < 2.6) break;
  }
  // ---- se agarra a las almenas: la torre tiembla; su cara, en lo alto
  G.rootMotion = false;
  G.speedK = 1;
  G.base('towerHold', { blend: 0.3 });
  G.play('grabTower', { blend: 0.25 });
  const grabAt = new V3(topMerlon(0).x, TN.top + 0.9, TOP_N - 0.1);
  G.ik.R = { target: grabAt, pole: G.wp(-10, 10, 2, new V3()), w: 0, stretch: 1.2 };
  arm.to({ w: [5.2, 11.0, 4.6], pole: [10, 8, 4] }, 0.5);
  let grabbed = false;
  G.onEventHook = (e) => {
    if (e === 'grab' && !grabbed) {
      grabbed = true;
      a && a.play('wallBreak', grabAt, { k: 2.2 });
      a && a.play('slam', grabAt, { k: 2 });
      g.camRig.shake(1.4);
      g.input.rumble(1, 1, 700);
      smashTopMerlons(D, [0], grabAt);
      D.debris.burst(grabAt, 24, { speed: 6, up: 4, size: 0.7, spread: 1.6 });
    }
  };
  // (desde lo alto, detrás del jugador, que se ha echado atrás: la cara
  // sube por encima del parapeto)
  F.setP(FACE_P.x, TN.top, FACE_P.z, Math.PI);
  F.pClip(FP.windStand, { blend: 0.2 });
  const P1 = p.pos.clone();
  // (de lado, desde la tronera, a lo largo del parapeto del norte: la mano
  // cae sobre las almenas y la cara asoma)
  F.shot([TN.x + TN.w / 2 - 0.2, TN.top + 1.4, TOP_N + 1.2], [TN.x - 1.2, TN.top + 0.8, TOP_N - 0.8], { fov: 58 });
  F.hand = 0.04;
  t = 0;
  while (t < 1.6) {
    const dt = yield;
    t += dt;
    G.ik.R.w = sm(clamp((t - 0.15) / 0.3, 0, 1));
    G.pos.x += (AT_TOWER.x - G.pos.x) * Math.min(1, dt * 3);
    G.pos.z += (AT_TOWER.z - G.pos.z) * Math.min(1, dt * 3);
    G.yaw = dampAngle(G.yaw, Math.atan2(TN.x - G.pos.x, TN.z - G.pos.z), 4, dt);
  }
  // ---- te ruge a la cara, a dos metros (por detrás del jugador)
  G.play('roarTower', { blend: 0.3 });
  const P = p.pos.clone();
  p.yaw = Math.atan2(G.face(_v).x - P.x, G.face(_v).z - P.z);
  F.pClip(FP.windStand, { blend: 0.2 });
  // (por encima del hombro del jugador: la cara, a dos metros)
  F.follow(() => {
    const f = G.face(new V3());
    const d = _v.subVectors(f, P).setY(0).normalize();
    return { pos: new V3(P.x - d.x * 2.2 - d.z * 1.5, P.y + 2.4, P.z - d.z * 2.2 + d.x * 1.5), look: f.add(_v2.set(0, -0.3, 0)), fov: 52 };
  });
  F.hand = 0.03;
  while (G.actT < 1.0) yield;
  a && a.play('beastRoarBig', G.face(_v), { k: 3 });
  g.camRig.shake(0.8);
  g.input.rumble(1, 1, 1200);
  // ¡Salta! a su cara
  const okLeap = yield* F.prompt({ action: 'dodge', label: '¡Salta!', window: 1.3, slow: 0.25 });
  if (!okLeap) {
    // (el rugido le tumba; se levanta y salta igual, tarde)
    F.hurt(20, G.face(_v), { shake: 0.8 });
    F.pClip('fallBack', { blend: 0.05 });
    yield* F.wait(0.9);
    F.pClip('getup', { blend: 0.1 });
    yield* F.wait(0.9);
  }
  // ---- el salto: a la jaula de la cara
  F.pClip('leap', { blend: 0.05 });
  a && a.play('leapWind', p.pos, { k: 1.4 });
  const cage = cageAttach(G);
  const L0 = p.pos.clone();
  t = 0;
  F.follow(() => {
    const f = G.face(new V3());
    return { pos: camSafe(g, f.clone(), f.clone().add(G.wd(-8.5, 0.8, 3.5, _v))), look: f.lerp(p.pos, 0.4), fov: 56 };
  });
  while (t < 0.55) {
    const dt = yield;
    t += dt;
    const k = clamp(t / 0.55, 0, 1);
    const c = cage.get();
    const x = lerp(L0.x, c.pos.x, k),
      z = lerp(L0.z, c.pos.z, k);
    const y = lerp(L0.y, c.pos.y, k) + Math.sin(k * Math.PI) * 1.2;
    F.setP(x, y, z, c.yaw);
  }
  a && a.play('crack', G.face(_v), { k: 1.2 });
  F.attach = () => cage.get();
  F.pClip(FP.cage, { blend: 0.06 });
  g.camRig.shake(0.5);
  // ---- sacude la cabeza: ¡Apuñala! el ojo, entre los barrotes
  G.play('roarTower', { blend: 0.2 });
  const qStab = F.promptAsync({ action: 'light', label: '¡Apuñala!', window: 2.6, mash: 5, slow: 0.4 });
  let n = 0;
  while (qStab.ok === null) {
    yield;
    const cur = g.qte.cur ? g.qte.cur.n : 0;
    if (cur > n) {
      n = cur;
      F.pClip(FP.stabCage, { blend: 0.04 });
      const f = G.face(new V3());
      a && a.play('thrust', f, { k: 1.6 });
      g.fx.blood.emit(f.x, f.y + 0.3, f.z, 18, { color: GORE, speed: 4, life: 1, up: 1 });
    }
  }
  const okStab = qStab.ok;
  // el ojo revienta: grita, suelta la torre y se echa atrás
  F.pClip(FP.stabCage, { blend: 0.04 });
  const eye = G.face(new V3());
  a && a.play('fleshBurst', eye, { k: 2.2 });
  a && a.play('beastRoarBig', eye, { k: 3 });
  g.fx.blood.emit(eye.x, eye.y + 0.3, eye.z, 90, { color: GORE, speed: 7, life: 1.6, up: 1.5 });
  g.camRig.shake(1.2);
  g.input.rumble(1, 1, 900);
  if (!okStab) F.hurt(18, eye, { shake: 0.6 });
  G.ik.R = null;
  G.stopAction(0.1);
  G.base('idle', { blend: 0.4 });
  G.play('eyeStab', { blend: 0.1 });
  arm.to({ w: [1.2, 15.6, 3.6], pole: [10, 10, 2] }, 0.25);
  F.pClip(FP.cage, { blend: 0.1 });
  // (de lado, a la altura de la cara: él con el jugador en la jaula)
  F.follow(() => {
    const f = G.face(new V3());
    return { pos: camSafe(g, f.clone(), f.clone().add(G.wd(-8.5, 0.8, 3.5, _v))), look: f.lerp(p.pos, 0.3), fov: 56 };
  });
  F.hand = 0.05;
  yield* F.wait(0.9);
  // ---- retrocede tambaleándose hacia el cráter
  G.play('staggerBack', { blend: 0.25 });
  G.rootMotion = true;
  G.speedK = 1.25;
  yield* F.wait(0.7);
  // ¡Salta! de vuelta a la torre
  const okBack = yield* F.prompt({ action: 'dodge', label: '¡Salta!', window: 1.1, slow: 0.25 });
  F.attach = null;
  F.pClip('jump', { blend: 0.05 });
  a && a.play('leapWind', p.pos, { k: 1.4 });
  const J0 = p.pos.clone();
  const hangAt = new V3(CRENEL_X, TN.top - 2.05, TOP_N - 0.45);
  F.shot([CRENEL_X + 4.5, TN.top + 0.6, TOP_N - 4.2], hangAt.clone().add(_v.set(0, 1.2, 0)), { fov: 58 });
  F.hand = 0.04;
  t = 0;
  while (t < 0.6) {
    const dt = yield;
    t += dt;
    const k = clamp(t / 0.6, 0, 1);
    F.setP(lerp(J0.x, hangAt.x, k), lerp(J0.y, hangAt.y, k) + Math.sin(k * Math.PI) * 1.0, lerp(J0.z, hangAt.z, k), 0);
  }
  // se agarra a las almenas (o se da contra el muro, y se agarra igual)
  F.pClip('hang', { blend: 0.05 });
  a && a.play('woodHit', hangAt, { k: 1.0 });
  if (!okBack) {
    F.hurt(18, null, { shake: 0.8 });
    a && a.play('playerHurt', p.pos);
  }
  g.camRig.shake(0.4);
  // ¡Trepa!
  yield* F.prompt({ action: 'interact', label: '¡Trepa!', window: 2.2, slow: 0.4 });
  F.pClip('climbUp', { blend: 0.05 });
  const up = new V3(CRENEL_X, TN.top, TOP_N + 1.1);
  t = 0;
  while (t < 0.95) {
    const dt = yield;
    t += dt;
    const k = sm(clamp(t / 0.95, 0, 1));
    F.setP(hangAt.x, lerp(hangAt.y, up.y, Math.min(1, k * 1.5)), lerp(hangAt.z, up.z, k), 0);
  }
  p.anim.stop(0.2);
  // ---- el borde del cráter cede: cae de espaldas a la sangre
  yield* fall(D, G, S);
}

const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// el jugador en la jaula de la cara: las manos en los barrotes, de cara a él
function cageAttach(G) {
  return {
    get() {
      const f = G.face(new V3());
      const hq = G.M.byName.head.getWorldQuaternion(new THREE.Quaternion());
      const fw = _v2.set(0, 0, 1).applyQuaternion(hq);
      fw.y = 0;
      fw.normalize();
      const pos = f.clone().addScaledVector(fw, 0.85).add(_v3.set(0, -1.55, 0));
      return { pos, yaw: Math.atan2(-fw.x, -fw.z), tilt: _I };
    },
  };
}

// la campana: la suelta; rueda, tañendo, al cráter y se hunde en la sangre
function dropBell(D, G) {
  const g = D.g,
    a = g.audio;
  const B = G.bell;
  B.guide = null;
  B.free = true;
  const c = B.center(new V3());
  const imp = _v.subVectors(C0, c).setY(0).normalize().multiplyScalar(7).add(_v2.set(0, 2.5, 0));
  for (let i = 0; i < B.N; i++) B.q[i].copy(B.p[i]).addScaledVector(imp, -1 / 120);
  a && a.play('bellToll', c, { k: 2 });
  D.film.also(
    (function* () {
      let t = 0,
        rang = 0;
      while (t < 8) {
        const dt = yield;
        t += dt;
        const q = B.center(_v3);
        if (t > 0.9 + rang * 1.1 && rang < 3) {
          rang++;
          a && a.play('bellToll', q, { k: 1.6 - rang * 0.3 });
        }
        // (a la sangre: salpica y se hunde)
        if (q.y < SURF + 0.5) {
          a && a.play('bellToll', q, { k: 0.8 });
          a && a.play('fleshBurst', q, { k: 1.6 });
          g.fx.blood.emit(q.x, SURF + 0.3, q.z, 70, { color: GORE, speed: 6, life: 1.6, up: 4, gravity: 9 });
          g.fx.blood.emit(q.x, SURF + 0.5, q.z, 40, { color: STEAM, speed: 2, life: 2.6, up: 2, gravity: -0.5 });
          B.bell.visible = false;
          B.mesh.visible = false;
          break;
        }
      }
    })()
  );
}

// las almenas de lo alto de la torre (lado norte), revientan
function smashTopMerlons(D, idx, from) {
  const g = D.g;
  for (const i of idx) {
    const n = 'almenaT:' + i;
    if (!g.groups[n] || !g.groups[n].on) continue;
    g.setGroupVisible(n, false);
    g.setGroupVisible('almenaTRuin:' + i, true);
    const c = topMerlon(i);
    for (let j = 0; j < 5; j++) D.chunks.add({ mat: 'wallstone', size: [rnd(0.3, 0.55), rnd(0.25, 0.45), rnd(0.3, 0.5)], pos: new V3(c.x + rnd(-0.4, 0.4), c.y + rnd(0, 0.9), c.z + rnd(-0.2, 0.2)), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(rnd(-3, 3), rnd(1, 4), rnd(-1, 4)), spin: [rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)], shatter: 9, life: 6 });
    g.fx.blood.emit(c.x, c.y + 0.5, c.z, 24, { color: DUST, speed: 3.5, life: 1.6, up: 1.2, gravity: 0.3 });
  }
  void from;
}
// (el centro de la almena i del lado norte de lo alto)
export function topMerlon(i) {
  const x0 = TN.x - TN.w / 2 - 0.3;
  const L = TN.w + 0.6;
  const n = Math.floor((L + 0.7) / 1.6);
  const start = (L - (n * 0.9 + (n - 1) * 0.7)) / 2;
  return new V3(x0 + start + i * 1.6 + 0.45, TN.top, TN.z - TN.w / 2);
}

// ---------------------------------------------------------------------
// El borde cede y cae de espaldas a la sangre; la cadena se tensa y arrastra
// lo alto de la torre: ¡Corta!
function* fall(D, G, S) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  // (lejos, desde lo alto de la torre: él, tambaleándose hasta el borde)
  F.shot([TN.x + 2.2, TN.top + 2.6, TOP_N + 2.4], G.chest(new V3()).lerp(C0, 0.2), { fov: 58 });
  F.hand = 0.03;
  // (hasta el borde: el pie de atrás, en el labio del cráter)
  let t = 0;
  while (t < 7 && Math.hypot(G.pos.x - C0.x, G.pos.z - C0.z) > 12.2) {
    const dt = yield;
    t += dt;
    if (G.actDone) G.play('staggerBack', { blend: 0.3 });
    // (de espaldas al cráter)
    G.yaw = dampAngle(G.yaw, Math.atan2(G.pos.x - C0.x, G.pos.z - C0.z), 1.5, dt);
  }
  G.rootMotion = false;
  G.speedK = 1;
  // ¡cede!
  const edge = G.wp(0, 0, -2.5, new V3());
  a && a.play('wallBreak', edge, { k: 2.4 });
  a && a.play('explosion', edge, { k: 1.6 });
  g.camRig.shake(1.0);
  D.debris.burst(edge.setY(0.4), 40, { speed: 8, up: 5, size: 1.0, spread: 4 });
  g.fx.blood.emit(edge.x, 0.6, edge.z, 80, { color: DUST, speed: 6, life: 2.4, up: 2, gravity: 0.3 });
  G.stopAction(0.2);
  G.play('fallBack', { blend: 0.2 });
  // (cae: inclinado hacia atrás sobre los pies, que resbalan al cráter)
  const yaw = G.yaw;
  const back = new V3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const P0 = G.pos.clone();
  G.fixY = P0.y;
  t = 0;
  let splashed = false;
  // (desde el otro lado del cráter, a ras de la sangre: cae de espaldas hacia
  // aquí)
  const across = _v.subVectors(C0, P0).setY(0).normalize();
  const camF = C0.clone().addScaledVector(across, 11.5).setY(4.2);
  F.shot(camF, P0.clone().lerp(C0, 0.35).setY(7.5), { fov: 62 });
  F.hand = 0.05;
  while (t < 2.2) {
    const dt = yield;
    t += dt;
    const k = clamp(t / 1.7, 0, 1);
    G.pitch = -1.45 * k * k;
    G.pos.copy(P0).addScaledVector(back, 3.5 * k);
    G.fixY = P0.y - 3.0 * k * k;
    if (!splashed && k >= 1) {
      splashed = true;
      const s = G.wp(0, 0, -14, new V3()).setY(SURF);
      a && a.play('explosion', s, { k: 2.4 });
      a && a.play('fleshBurst', s, { k: 2.4 });
      g.camRig.shake(1.6);
      g.input.rumble(1, 1, 1300);
      for (let i = 0; i < 4; i++) g.fx.blood.emit(s.x + rnd(-5, 5), SURF + 0.5, s.z + rnd(-5, 5), 80, { color: GORE, speed: 9, life: 2.2, up: 7, gravity: 9 });
      g.fx.blood.emit(s.x, SURF + 1, s.z, 120, { color: STEAM, speed: 4, life: 3.4, up: 3, gravity: -0.5 });
    }
  }
  // ---- la cadena se tensa: arrastra lo alto de la torre
  a && a.play('chainRun', S.ring, { k: 2.2 });
  a && a.play('stoneCreak', S.ring, { k: 2.2 });
  F.pClip('fallBack', { blend: 0.05 });
  F.hurt(8, null, { shake: 1.2 });
  smashTopMerlons(D, [2], S.ring);
  // (a ras de lo alto, junto al bolardo: la cadena tirante, por encima de
  // las almenas, hasta el cráter)
  const ring = S.ring.clone();
  const along = _v.subVectors(nape(G, new V3()), ring).normalize();
  const sideC = new V3(along.z, 0, -along.x).normalize();
  // (desde la esquina del sureste de lo alto: el bolardo y la cadena, que
  // tira por el suelo hacia la tronera)
  const camR = new V3(TN.x + TN.w / 2 - 1.4, TN.top + 1.8, TN.z + TN.w / 2 - 0.6);
  F.shot(camR, ring.clone().setY(TN.top + 0.5).lerp(new V3(TN.x + 1.5, TN.top, TOP_N), 0.25), { fov: 60 });
  F.hand = 0.06;
  const drag = dragTower(D, S);
  F.also(drag.run());
  yield* F.wait(0.8);
  F.pClip('getup', { blend: 0.1 });
  yield* F.wait(0.7);
  // ¡Corta! (hachazos a la cadena, junto al bolardo)
  // (el jugador, junto al bolardo, de cara a la cadena; de lado)
  const cutAt = ring.clone().addScaledVector(along, 1.1).addScaledVector(sideC, -0.9).setY(TN.top);
  F.setP(cutAt.x, TN.top, cutAt.z, Math.atan2(ring.x + along.x * 1.2 - cutAt.x, ring.z + along.z * 1.2 - cutAt.z));
  F.pClip(FP.chop, { blend: 0.1, speed: 0 });
  const mid = cutAt.clone().lerp(ring, 0.5);
  F.shot(camR.clone().setY(TN.top + 1.3), mid.clone().setY(TN.top + 0.9), { fov: 54 });
  const fake = g.dev && g.dev.autoQTE === 'fail';
  const q = fake ? { ok: null } : F.promptAsync({ action: 'heavy', label: '¡Corta!', window: 5, mash: 7, slow: 0.6 });
  let n = 0,
    fk = 0,
    push = 0;
  while (q.ok === null) {
    const dt = yield;
    if (fake && (fk += dt * 4) >= 7) q.ok = true;
    const cur = fake ? Math.floor(fk) : g.qte.cur ? g.qte.cur.n : 7;
    if (cur > n) {
      n = cur;
      push = 0.3;
      a && a.play('crack', ring, { k: 1.3 });
      g.fx.blood.emit(ring.x, ring.y + 0.5, ring.z, 12, { color: [1.0, 0.75, 0.4], speed: 5, life: 0.5, up: 2, gravity: 8 });
    }
    push = Math.max(0, push - dt);
    p.anim.speed = push > 0 ? 1.4 : 0;
    drag.k = Math.min(1, drag.k + dt * 0.12);
  }
  p.anim.speed = 1;
  if (!q.ok) {
    // (no le dio tiempo: la torre se viene un poco más; corta igual)
    F.hurt(15, null, { shake: 1 });
    a && a.play('wallBreak', ring, { k: 1.6 });
  }
  // ¡salta la cadena!
  drag.stop = true;
  S.rope.pin(0, null);
  a && a.play('chainRun', ring, { k: 2.4 });
  a && a.play('crack', ring, { k: 2 });
  g.fx.blood.emit(ring.x, ring.y + 0.6, ring.z, 40, { color: [1.0, 0.75, 0.4], speed: 8, life: 0.7, up: 3, gravity: 8 });
  g.camRig.shake(0.8);
  F.pClip('fallBack', { blend: 0.05 });
  yield* F.wait(0.8);
  F.pClip('getup', { blend: 0.1 });
}

// la cadena tira de lo alto de la torre: tiembla, cruje, el bolardo se
// inclina hacia el cráter (k: cuánto)
function dragTower(D, S) {
  const g = D.g;
  const R = { k: 0, stop: false };
  const base = S.bollardG ? S.bollardG.rotation.clone() : null;
  R.run = function* () {
    let t = 0;
    while (!R.stop) {
      const dt = yield;
      t += dt;
      R.k = Math.min(1, R.k + dt * 0.05);
      g.camRig.shake(0.12 + R.k * 0.25);
      if (S.bollardG && base) {
        S.bollardG.rotation.x = base.x - 0.35 * R.k + Math.sin(t * 23) * 0.02;
      }
      if (Math.random() < dt * 4) g.fx.blood.emit(S.ring.x + rnd(-1, 1), TN.top + 0.2, S.ring.z + rnd(-1, 1), 6, { color: DUST, speed: 2, life: 1, up: 1 });
    }
  };
  return R;
}

// ---------------------------------------------------------------------
// 5. Se hunde en la sangre, la mano alzada; la tierra le cae encima.
// Silencio. Amanece. Y el final de siempre
function* sinkAndDawn(D, G, S) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  void S;
  G.play('sink', { blend: 0.6 });
  // (desde el borde del cráter, a ras: se hunde, la mano alzada)
  const P = p.pos.clone();
  const hand0 = G.M.byName.handR.getWorldPosition(new V3());
  const toT = new V3(TN.x - C0.x, 0, TN.z - C0.z).normalize();
  const camS = C0.clone().addScaledVector(toT, 12.0).setY(3.0);
  F.follow(() => {
    const h = G.M.byName.handR.getWorldPosition(new V3());
    return { pos: camS, look: h.lerp(hand0, 0.5).setY(Math.max(SURF + 1.5, h.y - 2)), fov: 50 };
  });
  F.hand = 0.02;
  let t = 0,
    quiet = false;
  const y0 = G.fixY ?? G.pos.y;
  while (t < 7) {
    const dt = yield;
    t += dt;
    G.fixY = y0 - 9.5 * sm(clamp(t / 7, 0, 1));
    // la tierra del borde, encima
    if (Math.random() < dt * 3) {
      const ang = rnd(0, Math.PI * 2),
        r = rnd(9.5, 11.5);
      const x = C0.x + Math.cos(ang) * r,
        z = C0.z + Math.sin(ang) * r;
      D.chunks.add({ mat: 'dirt', size: [rnd(0.8, 1.6), rnd(0.4, 0.8), rnd(0.8, 1.4)], pos: new V3(x, 0.6, z), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3((C0.x - x) * 0.3, rnd(0, 2), (C0.z - z) * 0.3), spin: [rnd(-3, 3), rnd(-3, 3), rnd(-3, 3)], shatter: 99, life: 4, floor: SURF - 3 });
      g.fx.blood.emit(x, 0.5, z, 20, { color: DUST, speed: 3, life: 2, up: 1, gravity: 0.3 });
    }
    if (t > 2.5 && !quiet) {
      quiet = true;
      // silencio: las campanas callan
      a && a.stopMusic();
    }
  }
  G.show(false);
  // amanece (el sol, tras la otra orilla del río)
  g.atmo.override = { fog: 0xc8a08a, density: 0.009, far: 420, sky: 0xffd6b8, ground: 0x5a4a3a, hemi: 2.6, moon: 3.0, moonColor: 0xffa860, moonPos: [10, 14, -80], vol: 0.03, ash: 0, exposure: 1.05, sat: 0.95, bloom: 1.1 };
  // (el jugador, en el parapeto del norte, mirando el cráter; desde el
  // campo, abajo: él, a contraluz del amanecer)
  const W = new V3(topMerlon(0).x + 0.2, TN.top, TOP_N + 0.9);
  F.setP(W.x, W.y, W.z, Math.atan2(C0.x - W.x, C0.z - W.z));
  p.anim.stop(0.4);
  F.shot([TN.x + 3.5, 9.5, TN.z - 10.5], W.clone().add(_v.set(0, 1.4, 0)), { fov: 50 });
  yield* F.wait(2.4);
  // (por encima de su hombro: el cráter que humea, el campo, el río)
  const dW = _v.subVectors(C0, W).setY(0).normalize();
  F.shot(W.clone().addScaledVector(dW, -1.8).add(_v2.set(dW.z * 1.1, 2.0, -dW.x * 1.1)), C0.clone().setY(1.5), { fov: 54 });
  yield* F.wait(2.6);
  // fundido; y en el río, al amanecer, el final de siempre
  g.fadeTarget = 0;
  yield* F.wait(1.8);
  F.cinema(false, { instant: true });
  F.puppet(false);
  F.attach = null;
  g.atmo.override = null;
  F.setP(0, 0, -198.4, Math.PI);
  F.release(Math.PI, 0.12);
  D.endFilm();
  g.fadeTarget = 1;
  g.ending();
}
