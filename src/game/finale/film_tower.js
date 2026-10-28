// La película, acto 4: la primera espringala (la torre oeste de la puerta sur).
//
// En lo alto, la espringala de la guarnición. Abajo, el gigante arranca la
// campana del empedrado, te ruge y viene hacia la torre arrastrándola; si
// tardas, la campana barre lo alto de la torre (la primera vez se queda
// corta y revienta el muro de debajo; la segunda, no). Cargar (machacar el
// torno), apuntar (cámara detrás del arma; el virote cae un poco) y
// disparar. Si el tiro pasa cerca, se tapa la cara con el antebrazo
// izquierdo: el virote se le clava en él y la cadena queda entre la torre y
// su brazo.
//
// Momento God of War 1: tira de la cadena (la torre cruje) — ¡Corre! — por
// la cadena tensa hasta su brazo — se sacude: ¡Agárrate! — ¡Apuñala! el
// dorso de la mano — estrella el brazo contra lo alto de la torre: el
// cadalso revienta, la cadena se parte y quedas colgado del virote. (Sigue
// en el acto 5, la cabalgada.)
import * as THREE from 'three';
import { sm, lerp, camSafe } from './film.js';
import { FP } from './film_player.js';
import { Springald, BOLT_L } from './springald.js';
import { hideFolk } from './film_grab.js';
import { shootGun } from './film_gun.js';
import { TOWER_S } from '../../world/level_finale.js';
import { clamp, dampAngle } from '../../core/util.js';

const V3 = THREE.Vector3;
const rnd = (a, b) => a + Math.random() * (b - a);
const _v = new V3(),
  _v2 = new V3(),
  _v3 = new V3();
const DUST = [0.26, 0.24, 0.22];
const T = TOWER_S;
// el centro del cadalso (a la altura del pecho)
const DECK = new V3(T.x, T.deckY + 1.2, T.z);
// dónde se para a barrer lo alto de la torre con la campana
const STOP = new V3(-1.2, 0, 41.4);
// cómo acabó el acto 3: el gigante en la boca de la calle, la campana
// clavada en el empedrado
const END3 = { giant: new V3(4.2, 0, 29.0), bell: new V3(0.2, 0, 39.3) };

// Los puntos del brazo izquierdo (espacio del modelo) por los que lo lleva
// el guion: la muñeca y hacia dónde va el codo
const ARM = {
  // el antebrazo delante de la cara, de través
  cover: { w: [-2.2, 16.0, 7.6], pole: [8, 13, 10] },
  // bajado delante de él, mirándoselo
  look: { w: [5.0, 11.0, 8.5], pole: [11, 10, 5] },
  // tirando de la cadena: el brazo tendido a su izquierda, lejos del cuerpo
  yank: { w: [7.8, 9.8, 3.2], pole: [12, 11, -2] },
  // alzado a la izquierda, para descargarlo
  wind: { w: [8.6, 15.0, 1.6], pole: [12, 9, -2] },
};

// La espringala del cadalso (la misma desde que se llega arriba)
export function springald1(D) {
  if (D.springald) return D.springald;
  const g = D.g;
  const [gx, gy, gz] = T.gun;
  const S = new Springald(g, { pos: new V3(gx, gy, gz), yaw: Math.PI, bollard: new V3(gx + 1.9, gy, gz - 1.6), chainLen: 38, pitchLim: [-6, 24], yawLim: 60 });
  S.onClick = () => g.audio && g.audio.play('ratchet', S.base);
  D.springald = S;
  D.tick(S);
  return S;
}

// ======================================================================
// ACTO 4
// ======================================================================
export function* actTorre(D, o = {}) {
  const g = D.g,
    F = D.film,
    p = g.player;
  const G = yield* D.waitGiant();
  if (o.fromCP) setupTorre(D, G);
  hideFolk(g, 0, 50, 30);
  const S = springald1(D);
  g.chaseRun = false;
  // ------------------------------------------------- 1. arranca la campana
  yield* intro(D, G, S);
  if (p.dead) return;
  // ------------------------------------------------- 2. la espringala
  const hit = yield* shoot(D, G, S);
  if (p.dead || !hit) return;
  // ------------------------------------------------- 3. el momento God of War
  yield* gow1(D, G, S, hit);
}

function towerAtmo() {
  return { density: 0.0095, vol: 0.05, far: 300, bloom: 1.25, hemi: 3.2, moon: 3.3, moonPos: [-20, 30, -10], fog: 0x34302e, exposure: 1.2, ash: 0.25 };
}

// Desde el punto de control: el jugador en lo alto de la torre; el gigante
// en la boca de la calle, tirando de la campana clavada
function setupTorre(D, G) {
  const g = D.g,
    F = D.film;
  F.cinema(false, { instant: true });
  F.puppet(true);
  F.setP(T.x, T.deckY, T.deck[1] + 0.9, 0);
  p_idle(D);
  const at = END3.bell;
  G.place(END3.giant.x, END3.giant.z, Math.atan2(at.x - END3.giant.x, at.z - END3.giant.z), { base: 'idle', clip: 'stuck' });
  G.groundFn = null;
  G.setBell(true);
  const B = G.bell;
  B.top.copy(at).y += G.E.sizes.bellH * 0.55;
  B.up.set(Math.sin(G.yaw) * 0.45, 0.85, Math.cos(G.yaw) * 0.45).normalize();
  B.stick();
  for (let i = 0; i < 60; i++) B.update(1 / 60, G.handGrip(_v));
  g.atmo.override = { ...towerAtmo(), snap: true };
  g.fadeTarget = 1;
  g.audio && g.audio.music('bossFinal');
}
function p_idle(D) {
  D.g.player.anim.stop(0.2);
}

// ---------------------------------------------------------------------
// 1. Desde lo alto: arranca la campana del empedrado y te ruge
function* intro(D, G, S) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  F.cinema(true);
  F.puppet(true);
  p.autoDir = null;
  p.anim.stop(0.2);
  g.atmo.override = towerAtmo();
  const B = G.bell;
  const at = B.stuck ? B.stuck.clone().setY(0) : B.mouth(new V3()).setY(0);
  // (el jugador, ya en el torno de la espringala, mirando al norte)
  const sp0 = S.standPoint(new V3());
  F.setP(sp0.x, sp0.y, sp0.z, S.worldYaw);
  // (a) por encima de la espringala: la plaza, la calle y él al fondo
  const [gx, gy, gz] = T.gun;
  F.shot([gx + 1.3, gy + 2.1, gz + 2.9], [G.pos.x * 0.6 + gx * 0.4, 7.5, G.pos.z], { fov: 52 });
  F.hand = 0.02;
  G.lookW = 1;
  G.lookAt = null;
  G.play('pull', { blend: 0.4 });
  let ripped = false;
  G.onEventHook = (e) => {
    if (e !== 'rip' || ripped) return;
    ripped = true;
    // sale la campana, con medio empedrado
    B.release(new V3(Math.sin(G.yaw) * -6, 14, Math.cos(G.yaw) * -6));
    a && a.play('crack', at, { k: 1.8 });
    a && a.play('wallBreak', at, { k: 1.2 });
    a && a.play('chainRun', at, { k: 1.6 });
    g.camRig.shake(0.5);
    D.debris.burst(at.clone().setY(0.3), 18, { speed: 8, up: 9, size: 0.6, spread: 2.4 });
    D.dust.ring(at.clone().setY(0.3), 14, { color: D.dustColor(at), r0: 2, speed: 8, size: 2.2, life: 4.5, grow: 1.5, alpha: 0.5 });
    D.puff(at.clone().setY(1), 5, { size: 2.6, spread: 1.5, speed: 2, up: 4, rise: 0.6, life: 4, grow: 1.3, alpha: 0.45 });
    for (let i = 0; i < 8; i++) D.chunks.add({ mat: 'cobble', size: [rnd(0.5, 0.9), 0.22, rnd(0.4, 0.8)], pos: new V3(at.x + rnd(-2, 2), 0.4, at.z + rnd(-2, 2)), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(rnd(-5, 5), rnd(6, 12), rnd(-5, 5)), spin: [rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)], shatter: 99, life: 7 });
  };
  while (G.actT < 0.75) yield;
  // (b) a ras del empedrado, junto a la campana: sale de un tirón
  F.shot([at.x + 5.2, 1.1, at.z + 5.8], [at.x - 0.5, 5.5, at.z - 3], { fov: 62 });
  F.hand = 0.04;
  while (G.actT < 2.2) yield;
  G.onEventHook = null;
  // (c) se vuelve hacia la torre y ruge: por encima del hombro del jugador
  G.play('roar', { blend: 0.4 });
  F.pClip(FP.windStand, { blend: 0.3 });
  p.yaw = Math.atan2(G.pos.x - p.pos.x, G.pos.z - p.pos.z);
  const P = p.pos.clone();
  F.follow(() => {
    const hd = G.head(new V3());
    const d = _v.subVectors(hd, P).setY(0).normalize();
    return { pos: new V3(P.x - d.x * 2.4 + d.z * 0.9, P.y + 1.9, P.z - d.z * 2.4 - d.x * 0.9), look: hd.add(_v2.set(0, -5, 0)), fov: 46 };
  });
  F.hand = 0.025;
  let roared = false;
  while (G.actT < 2.4) {
    const dt = yield;
    G.yaw = dampAngle(G.yaw, Math.atan2(DECK.x - G.pos.x, DECK.z - G.pos.z), 1.5, dt);
    if (!roared && G.actT > 1.2) {
      roared = true;
      a && a.play('beastRoarBig', G.face(_v), { k: 2.4 });
      g.camRig.shake(0.6);
      g.input.rumble(0.8, 1, 900);
    }
  }
}

// ---------------------------------------------------------------------
// 2. La espringala (con control): mientras, él viene hacia la torre y barre
// lo alto con la campana. Si el tiro pasa cerca, se tapa la cara con el
// antebrazo izquierdo y el virote se le clava en él. Devuelve el virote
// clavado (o nada: muerto)
function* shoot(D, G, S) {
  return yield* shootGun(D, G, S, {
    toast: '¡A la espringala!',
    behave: () => approachTower(D, G),
    near: 9,
    devAim: (G, out) => G.chest(out),
    assist: {
      // (dónde estará el antebrazo cuando se tape: ahí apunta el virote)
      point: (G) => G.bp('armL', 2.9, 14.15, -0.3, new V3()).lerp(G.wp(...ARM.cover.w, new V3()), 0.72),
      capsule: (G) => [G.M.byName.foreL.getWorldPosition(new V3()), G.M.byName.handL.getWorldPosition(new V3()), 1.0],
      bone: (G) => G.M.byName.foreL,
      depth: 1.75,
      onFire: (D, G) => {
        G.rootMotion = false;
        G.speedK = 1;
        G.stopAction(0.1);
        G.play('cover', { blend: 0.12 });
        coverArm(D, G);
      },
    },
  });
}
// el antebrazo, a tapar la cara (IK): lo justo para que llegue el virote
function coverArm(D, G) {
  D.film.also(
    (function* () {
      const tgt = new V3(),
        pole = new V3();
      let t = 0;
      while (!G._armScript) {
        const dt = yield;
        t += dt;
        G.wp(...ARM.cover.w, tgt);
        G.wp(...ARM.cover.pole, pole);
        G.reachHand('L', tgt, pole, sm(clamp(t / 0.2, 0, 1)) * (1 - sm(clamp((t - 2.4) / 0.6, 0, 1))), { stretch: 1.12 });
        if (t > 3) break;
      }
      if (!G._armScript) G.freeHand('L');
    })()
  );
}
// Él, mientras tanto: anda hacia la torre (la campana a rastras), se para,
// y barre lo alto con la campana: la primera vez se queda corta (revienta
// el muro de debajo del cadalso); la segunda barre el cadalso entero
function approachTower(D, G) {
  const g = D.g,
    a = g.audio;
  const co = (function* () {
    const B = G.bell;
    G.stopAction(0.5);
    G.base('walk', { blend: 0.6 });
    G.rootMotion = true;
    G.speedK = 0.72;
    G.lookW = 1;
    G.lookAt = null;
    B.guide = { target: new V3(), k: 6, d: 3.5, antiGrav: false };
    let roar = 2.5;
    // (hasta su sitio)
    while (!co.stop) {
      const dt = yield;
      const d = Math.hypot(STOP.x - G.pos.x, STOP.z - G.pos.z);
      G.yaw = dampAngle(G.yaw, Math.atan2(STOP.x - G.pos.x, STOP.z - G.pos.z), 1.6, dt);
      G.wp(-4.5, 0.6, -6, B.guide.target);
      roar -= dt;
      if (roar <= 0) {
        roar = rnd(3, 4.5);
        a && a.play('beastRoar', G.head(_v), { k: 1.6 });
      }
      if (d < 0.8) break;
    }
    G.rootMotion = false;
    G.speedK = 1;
    G.base('idle', { blend: 0.6 });
    // dos barridos: el primero, corto; el segundo, al cadalso
    for (let k = 0; k < 2 && !co.stop; k++) {
      let t = 0;
      while (t < (k ? 2.4 : 0.8) && !co.stop) {
        const dt = yield;
        t += dt;
        G.yaw = dampAngle(G.yaw, Math.atan2(DECK.x - G.pos.x, DECK.z - G.pos.z), 2, dt);
        G.wp(-5, 2, -5, B.guide.target);
      }
      if (co.stop) break;
      yield* sweepOnce(D, G, k === 1, co);
    }
  })();
  co.stop = false;
  return co;
}
// un barrido de campana contra lo alto de la torre (lethal: al cadalso)
function* sweepOnce(D, G, lethal, co) {
  const g = D.g,
    a = g.audio,
    p = g.player;
  const B = G.bell;
  G.play('sweep', { blend: 0.3 });
  a && a.play('beastRoar', G.head(_v), { k: 1.6 });
  // el blanco: el muro de la torre bajo el cadalso, o el cadalso
  const tgt = lethal ? new V3(T.x, T.deckY + 0.8, T.z - 1) : new V3(T.x + 0.5, T.h - 3.5, T.z - T.w / 2 - 0.5);
  let hit = false;
  while (!co.stop && !G.actDone) {
    yield;
    const t = G.actT;
    if (t < 1.25) {
      G.wp(-7, 9, -6, B.guide.target);
      Object.assign(B.guide, { k: 10, d: 4, antiGrav: true });
    } else if (t < 1.95) {
      B.guide.target.copy(tgt);
      Object.assign(B.guide, { k: 60, d: 3, antiGrav: true });
    } else {
      G.wp(-5, 2, -4, B.guide.target);
      Object.assign(B.guide, { k: 8, d: 4, antiGrav: false });
    }
    if (!hit && t > 1.6 && B.center(_v).distanceTo(tgt) < 4.5) {
      hit = true;
      const c = B.center(_v2).clone();
      a && a.play('bellToll', c, { k: 2 });
      a && a.play('wallBreak', c, { k: 2 });
      g.camRig.shake(1.2);
      g.input.rumble(1, 1, 600);
      D.debris.burst(c, 30, { speed: 9, up: 6, size: 0.9, spread: 2 });
      D.puff(c, 8, { size: 2.6, spread: 1.5, speed: 6, up: 1, life: 4, grow: 1.6, alpha: 0.5, ground: false });
      for (let i = 0; i < 8; i++) D.chunks.add({ mat: lethal ? 'planks' : 'wallstone', size: lethal ? [0.2, 0.08, rnd(1, 2)] : [rnd(0.5, 0.9), rnd(0.35, 0.6), rnd(0.4, 0.8)], pos: c.clone().add(_v.set(rnd(-1.5, 1.5), rnd(-1, 1), rnd(-1.5, 1.5))), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(rnd(-6, 6), rnd(2, 8), rnd(2, 9)), spin: [rnd(-8, 8), rnd(-8, 8), rnd(-8, 8)], shatter: 99, life: 7 });
      // la segunda: barre el cadalso (y a quien esté en él)
      if (lethal && p.pos.y > T.deckY - 1 && !p.dead) {
        D.film.cinema(false);
        D.film.hurt(999, c, { shake: 1.5, heavy: true });
      } else if (!lethal) {
        g.ui.toast('¡Rápido!', 1.6);
      }
    }
  }
  if (G.actName === 'sweep') G.stopAction(0.5);
}

// ======================================================================
// 3. Momento God of War 1: la cadena, el brazo, la mano, la torre
// ======================================================================
function* gow1(D, G, S, bolt) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  F.cinema(true, { skip: false });
  F.puppet(true);
  p.autoDir = null;
  G._armScript = true;
  G.speedK = 1;
  G.rootMotion = false;
  const rope = S.rope;
  // el brazo, por el guion: de donde esté a donde se diga, con su codo
  const arm = (D.arm = armDriver(D, G));
  // ---- se mira el brazo atravesado y ruge (la cadena, floja, de la torre
  // a su brazo)
  F.slow(1, 5);
  G.play('armHit', { blend: 0.1 });
  arm.to(ARM.look, 0.9);
  rope.len = rope.span() + 1.5;
  F.pClip(FP.windStand, { blend: 0.2 });
  const sp = S.standPoint(new V3());
  F.setP(sp.x, sp.y, sp.z, S.worldYaw);
  // (por delante y a su izquierda: el brazo atravesado, la cadena que se va
  // hacia la torre, la cara que ruge)
  F.follow((dt, tt) => {
    const k = sm(clamp(tt / 2.2, 0, 1));
    const look = bolt.tail.clone().lerp(G.head(_v), 0.45);
    return { pos: camSafe(g, look.clone(), G.wp(lerp(15, 12, k), lerp(8, 10, k), lerp(17, 14, k), new V3())), look, fov: 52 };
  });
  F.hand = 0.025;
  let roared = false;
  while (G.actT < 2.2) {
    yield;
    if (!roared && G.actT > 1.0) {
      roared = true;
      a && a.play('beastRoarBig', G.face(_v), { k: 2.2 });
    }
  }
  // (desde detrás del bolardo, a lo largo de la cadena)
  const ring0 = S.ring.clone();
  F.follow(() => ({ pos: ring0.clone().add(_v.set(1.3, 1.4, 2.4)), look: bolt.tail.clone().lerp(G.head(_v2), 0.2), fov: 58 }));
  // ---- si le dio de lejos, viene hacia la torre, furioso (la cadena se
  // comba al acercarse)
  if (Math.hypot(STOP.x - G.pos.x, STOP.z - G.pos.z) > 2.5) {
    G.base('walk', { blend: 0.4 });
    G.stopAction(0.4);
    G.rootMotion = true;
    G.speedK = 1.25;
    let roar = 0.6;
    while (Math.hypot(STOP.x - G.pos.x, STOP.z - G.pos.z) > 1.2) {
      const dt = yield;
      G.yaw = dampAngle(G.yaw, Math.atan2(STOP.x - G.pos.x, STOP.z - G.pos.z), 2, dt);
      rope.len = Math.max(rope.span() + 1.2, Math.min(rope.len, rope.span() + 4));
      roar -= dt;
      if (roar <= 0) {
        roar = 2.2;
        a && a.play('beastRoar', G.head(_v), { k: 1.8 });
      }
    }
    G.rootMotion = false;
    G.speedK = 1;
    G.base('idle', { blend: 0.4 });
  }
  // ---- tira de la cadena: la torre cruje
  G.play('yank', { blend: 0.25 });
  arm.to(ARM.yank, 0.75, 0.45);
  let yanked = false;
  while (G.actT < 1.0) {
    yield;
    if (!yanked && G.actT > 0.75) {
      yanked = true;
      rope.len = rope.span() * 0.985;
      a && a.play('chainRun', S.ring, { k: 2 });
      a && a.play('stoneCreak', S.ring, { k: 2 });
      a && a.play('stairCreak', S.ring, { k: 1.6 });
      g.camRig.shake(0.9);
      g.input.rumble(1, 1, 500);
      S.recoil = -1.2;
      g.fx.blood.emit(T.x, T.h - 0.5, T.z, 40, { color: DUST, speed: 3, life: 2, up: 0.5, gravity: 1 });
    }
  }
  G.base('tug', { blend: 0.4 });
  G.stopAction(0.4);
  // (tensa: la cadena recta de la argolla al virote; floja si se dice:
  // rope.slack, los metros de más)
  rope.slack = 0;
  F.also(
    (function* () {
      while (rope.pins[0] && !gowDone(D)) {
        yield;
        rope.len = rope.slack > 0 ? rope.span() + rope.slack : Math.max(1, rope.span() * 0.99);
      }
    })()
  );
  // ¡Corre!: desde el cadalso, a un lado del bolardo: el jugador ante la
  // cadena que se va, tendida, hasta su brazo
  const ring = S.ring.clone();
  const along = _v.subVectors(bolt.tail, ring).setY(0).normalize().clone();
  const across = new V3(along.z, 0, -along.x);
  F.shot(camSafe(g, ring.clone().setY(ring.y + 1), ring.clone().addScaledVector(along, -2.2).addScaledVector(across, -2.0).setY(ring.y + 1.7)), bolt.tail.clone().lerp(ring, 0.45), { fov: 58 });
  F.hand = 0.03;
  const okRun = yield* F.prompt({ action: 'dodge', label: '¡Corre!', window: 1.1, slow: 0.3 });
  if (!okRun) {
    F.hurt(14, null, { shake: 0.6 });
    F.pClip('fallBack', { blend: 0.05 });
    yield* F.wait(0.5);
    F.pClip('getup', { blend: 0.1 });
    yield* F.wait(0.6);
  }
  yield* chainRun(D, G, S, bolt, along, across);
  // ¡Agárrate!: se tira al antebrazo, junto al virote
  const onArm = armPoint(G);
  F.attach = () => onArm.get();
  F.pClip(FP.cling, { blend: 0.1 });
  arm.shake = 1;
  F.slow(1, 6);
  F.follow(() => {
    const P = p.pos;
    return { pos: G.wp(11.5, 12.8, 8.0, new V3()), look: P.clone().lerp(G.face(_v), 0.3), fov: 52 };
  });
  F.hand = 0.06;
  const okHold = yield* F.prompt({ action: 'interact', label: '¡Agárrate!', window: 2.4, mash: 6, slow: 0.6 });
  if (!okHold) {
    F.hurt(20, null, { shake: 0.8, heavy: true });
    a && a.play('boneCrack', p.pos, { k: 1 });
  }
  arm.shake = 0;
  G.base('tug', { blend: 0.4 });
  // ---- al dorso de la mano: ¡Apuñala!
  onArm.f = 0.92;
  onArm.lift = 0.85;
  yield* F.wait(0.5);
  // (de cerca, por delante de la mano: el jugador sobre el dorso, la espada
  // en alto; detrás, la cara)
  lagCam(F, () => camSafe(g, p.pos.clone().add(_v.set(0, 1, 0)), p.pos.clone().add(G.wd(2.8, 1.2, 3.8, _v2))), () => bodyMid(D, new V3()), { rate: 4, fov: 56 });
  const okStab = yield* F.prompt({ action: 'light', label: '¡Apuñala!', window: 2.6, mash: 5, slow: 0.5 });
  F.pClip(FP.stabDown, { blend: 0.05 });
  const hp = G.M.byName.handL.getWorldPosition(new V3());
  a && a.play('thrust', hp, { k: 2 });
  a && a.play('fleshBurst', hp, { k: 1.6 });
  g.fx.blood.emit(hp.x, hp.y + 0.8, hp.z, 60, { color: [0.4, 0.06, 0.05], speed: 5, life: 1.6, up: 3 });
  G.play('handStab', { blend: 0.08 });
  yield* F.wait(0.12);
  a && a.play('beastRoarBig', G.face(_v), { k: 2.6 });
  g.camRig.shake(1.0);
  g.input.rumble(1, 1, 900);
  if (!okStab) F.hurt(16, null, { shake: 0.6 });
  yield* F.wait(1.0);
  // ---- estrella el brazo contra la torre: te deslizas al virote y te
  // cuelgas de él
  onArm.hang = true;
  F.attach = () => hangOnBolt(bolt);
  F.pClip(FP.hangBolt, { blend: 0.12 });
  G.play('smashTower', { blend: 0.2 });
  G.base('idle', { blend: 0.6 });
  arm.to(ARM.wind, 0.7);
  // (desde la plaza, al oeste y bajo: el brazo contra lo alto de la torre)
  F.shot([-13.2, 8.5, 49.5], [-3.0, 11, 54.5], { fov: 66 });
  F.hand = 0.04;
  // (da un paso hacia la torre)
  const want = new V3(T.x + 3.6, 0, T.deck[1] - 8.0);
  const dx = want.x - G.pos.x,
    dz = want.z - G.pos.z;
  let smashed = false,
    struck = false;
  let t = 0;
  const g0 = G.pos.clone();
  while (G.actT < 1.55) {
    const dt = yield;
    t += dt;
    const k = sm(clamp((G.actT - 0.5) / 0.6, 0, 1));
    G.pos.set(g0.x + dx * k, 0, g0.z + dz * k);
    G.yaw = dampAngle(G.yaw, Math.atan2(DECK.x - G.pos.x, DECK.z - G.pos.z), 3, dt);
    if (!struck && G.actT > 0.72) {
      struck = true;
      arm.toWorld(DECK.clone().add(_v.set(0.5, -0.6, -1.2)), 0.33);
    }
    if (!smashed && G.actT > 1.05) {
      smashed = true;
      smashTop(D, S);
    }
  }
  // (colgado del virote bajo el brazo, entre las astillas que caen)
  // (de lado y un poco por debajo: él colgando del brazo, la torre rota
  // detrás, la plaza abajo)
  F.follow((dt, tt) => {
    const P = p.pos;
    const k = sm(clamp(tt / 1.6, 0, 1));
    return { pos: new V3(P.x + lerp(4.0, 5.2, k), P.y + lerp(1.2, 0.6, k), P.z + lerp(3.0, 4.2, k)), look: new V3(P.x, P.y + 1.5, P.z), fov: 58 };
  });
  F.hand = 0.05;
  a && a.play('playerHurt', p.pos);
  yield* F.wait(1.4);
  D.gow1 = { bolt };
}
// Por la cadena, de la argolla a su brazo: salta a ella desde el cadalso,
// corre (de lado, a cámara lenta), la cadena se afloja bajo sus pies y da un
// latigazo al tensarse: ¡Salta! por encima; y el último tramo, hacia la
// cámara, con su brazo delante
function* chainRun(D, G, S, bolt, along, across) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  const rope = S.rope;
  const arm = D.arm;
  const runEnd = () => rope.length() - 2.2;
  let s = 1.2,
    lift = 0;
  const dir = new V3();
  F.attach = () => {
    const at = rope.at(s, new V3(), dir);
    return { pos: at.add(_v3.set(0, 0.06 + lift, 0)), yaw: Math.atan2(dir.x, dir.z) };
  };
  // (el salto a la cadena desde el cadalso; la luz del jugador, encendida:
  // que se le vea por la cadena y en el brazo)
  F.keyLight(1);
  const P0 = p.pos.clone();
  F.pClip('leap', { blend: 0.05 });
  a && a.play('leapWind', p.pos, { k: 1.1 });
  F.slow(0.7, 6);
  // (de lado, a la altura de la cadena: el jugador que salta a ella y echa a
  // correr; al fondo, él)
  const side = (k, ahead, up) => {
    const P = p.pos;
    return camSafe(g, P.clone().add(_v.set(0, 1, 0)), P.clone().addScaledVector(across, k).addScaledVector(along, ahead).add(_v2.set(0, up, 0)));
  };
  lagCam(F, () => side(5.0, -1.6, 1.3), () => p.pos.clone().add(_v.set(0, 0.9, 0)).lerp(G.chest(_v2), 0.3), { rate: 5, fov: 58 });
  F.hand = 0.04;
  let t = 0;
  const att = F.attach;
  F.attach = () => {
    const k = sm(clamp(t / 0.45, 0, 1));
    const to = rope.at(s, new V3(), dir);
    return { pos: P0.clone().lerp(to, k).add(_v3.set(0, Math.sin(k * Math.PI) * 0.9 + 0.06, 0)), yaw: Math.atan2(dir.x, dir.z) };
  };
  while (t < 0.45) t += yield;
  F.attach = att;
  a && a.play('chainRun', p.pos, { k: 1.2 });
  F.pClip(FP.chainRun, { blend: 0.08 });
  // ---- el primer tramo, de lado
  let stepT = 0;
  const steps = (dt) => {
    stepT -= dt;
    if (stepT <= 0) {
      stepT = 0.28;
      a && a.play('chainRun', p.pos, { k: 0.6 });
    }
  };
  const snapAt = runEnd() * 0.45;
  while (s < snapAt) {
    const dt = yield;
    s += dt * 7.2;
    steps(dt);
  }
  // ---- se le afloja bajo los pies (adelanta el brazo hacia la torre) y se
  // tensa de golpe: el latigazo. ¡Salta!
  arm.to(ARM.cover, 0.35);
  rope.slack = 3.2;
  F.slow(0.55, 6);
  a && a.play('chainRun', p.pos, { k: 1.4 });
  // (desde abajo, a un lado: el jugador contra el cielo, la cadena que se
  // comba y restalla)
  lagCam(F, () => side(3.6, 0.8, -3.6), () => p.pos.clone().add(_v.set(0, 1.1, 0)), { rate: 6, fov: 60 });
  F.hand = 0.05;
  t = 0;
  while (t < 0.45) {
    const dt = yield;
    t += dt;
    s += dt * 3;
  }
  G.play('yank', { blend: 0.15, t0: 0.55 });
  arm.to(ARM.yank, 0.22);
  const q = F.promptAsync({ action: 'dodge', label: '¡Salta!', window: 0.8, slow: 0.25 });
  let snapped = false;
  t = 0;
  while (q.ok === null) {
    const dt = yield;
    t += dt;
    if (!snapped && t > 0.12) {
      snapped = true;
      rope.slack = 0;
      a && a.play('chainRun', p.pos, { k: 2 });
      a && a.play('crack', p.pos, { k: 1.2 });
      g.camRig.shake(0.6);
      g.input.rumble(0.8, 1, 300);
    }
  }
  if (!snapped) {
    rope.slack = 0;
    a && a.play('chainRun', p.pos, { k: 2 });
  }
  if (q.ok) {
    // (salta por encima del latigazo y cae otra vez en la cadena, corriendo)
    F.pClip('jump', { blend: 0.05 });
    a && a.play('leapWind', p.pos, { k: 0.9 });
    t = 0;
    while (t < 0.7) {
      const dt = yield;
      t += dt;
      lift = Math.sin(clamp(t / 0.7, 0, 1) * Math.PI) * 1.7;
      s += dt * 6;
    }
    lift = 0;
    a && a.play('land', p.pos);
  } else {
    // (le tira: cae sobre la cadena y se queda colgado de ella; trepa)
    F.hurt(14, null, { shake: 0.8 });
    F.pClip(FP.hangBolt, { blend: 0.05 });
    t = 0;
    while (t < 0.9) {
      const dt = yield;
      t += dt;
      lift = -2.05 * sm(clamp(t / 0.2, 0, 1));
    }
    F.pClip('climbUp', { blend: 0.08 });
    t = 0;
    while (t < 0.8) {
      const dt = yield;
      t += dt;
      lift = -2.05 * (1 - sm(clamp(t / 0.8, 0, 1)));
    }
    lift = 0;
  }
  G.base('tug', { blend: 0.4 });
  arm.to(ARM.yank, 0.5);
  F.slow(1, 4);
  F.pClip(FP.chainRun, { blend: 0.08 });
  // ---- el último tramo: hacia la cámara, que espera junto a su brazo
  const cEnd = () => bolt.tail.clone().addScaledVector(along, -6.0).addScaledVector(across, -3.0).add(_v.set(0, 2.4, 0));
  lagCam(F, cEnd, () => p.pos.clone().add(_v.set(0, 0.9, 0)), { rate: 3, fov: 56 });
  F.hand = 0.04;
  let shook = false;
  while (s < runEnd()) {
    const dt = yield;
    s += dt * 8.5;
    steps(dt);
    if (!shook && s > runEnd() - 3.5) {
      shook = true;
      // se da cuenta: se sacude el brazo
      G.base('shakeArm', { blend: 0.3 });
      a && a.play('beastRoar', G.head(_v), { k: 2 });
    }
  }
}
function gowDone(D) {
  return !!D.gow1;
}

const POLE_W = [12, 9, -2];
// Una cámara que va detrás de un sitio que se mueve (rate: lo deprisa que lo
// sigue), mirando a otro
function lagCam(F, want, look, o = {}) {
  const c = new V3();
  let first = true;
  F.follow((dt, tt) => {
    const w = want(dt, tt);
    if (first) {
      c.copy(w);
      first = false;
    } else c.lerp(w, Math.min(1, dt * (o.rate ?? 4)));
    return { pos: c.clone(), look: look(dt, tt), fov: o.fov ?? 58 };
  });
}

// el brazo izquierdo llevado por el guion (IK): hacia una pose (espacio
// del modelo) o un punto del mundo, en un tiempo; y sacudido si se pide
export function armDriver(D, G) {
  const w = new V3(),
    pole = new V3(),
    w0 = new V3(),
    p0 = new V3(),
    s0 = new V3(),
    q0 = new V3();
  const inv = new THREE.Matrix4();
  const A = { from: null, to: null, dur: 0.5, t: 1, shake: 0, world: null, weight: 1 };
  G.M.byName.handL.getWorldPosition(w);
  pole.copy(G.wp(10, 10, 4, new V3()));
  // (de dónde sale, en el espacio del gigante: si corre, la mano no se queda
  // atrás en el sitio donde empezó el gesto)
  const from = () => {
    inv.copy(G.M.root.matrixWorld).invert();
    w0.copy(w).applyMatrix4(inv);
    p0.copy(pole).applyMatrix4(inv);
  };
  A.to = (pose, dur = 0.5) => {
    from();
    A.pose = pose;
    A.world = null;
    A.dur = dur;
    A.t = 0;
  };
  // (a un punto del mundo; pole: hacia dónde va el codo, en el espacio del
  // modelo; el punto se puede ir moviendo: A.world)
  A.toWorld = (pt, dur = 0.4, pole = null) => {
    from();
    A.world = pt.clone();
    A.wpole = pole;
    A.dur = dur;
    A.t = 0;
  };
  D.film.also(
    (function* () {
      let tt = 0;
      while (!A.release) {
        const dt = yield;
        tt += dt;
        A.t = Math.min(1, A.t + dt / Math.max(0.01, A.dur));
        const k = sm(A.t);
        G.wp(w0.x, w0.y, w0.z, s0);
        G.wp(p0.x, p0.y, p0.z, q0);
        const tw = A.world ? _v.copy(A.world) : A.pose ? G.wp(...A.pose.w, _v) : _v.copy(s0);
        const tp = A.world ? G.wp(...(A.wpole || POLE_W), _v2) : A.pose ? G.wp(...A.pose.pole, _v2) : _v2.copy(q0);
        w.lerpVectors(s0, tw, k);
        pole.lerpVectors(q0, tp, k);
        if (A.shake > 0) {
          w.x += Math.sin(tt * 17) * 1.3 * A.shake;
          w.y += Math.sin(tt * 13 + 1) * 1.0 * A.shake;
          w.z += Math.sin(tt * 11 + 2) * 0.8 * A.shake;
        }
        G.reachHand('L', w, pole, A.weight, { stretch: 1.15 });
      }
      G.freeHand('L');
    })()
  );
  return A;
}
// el centro del cuerpo del jugador (tumbado, colgado: a lo largo de su
// arriba, que no siempre es el del mundo)
function bodyMid(D, out) {
  const p = D.g.player;
  return out.set(0, 0.9, 0).applyQuaternion(D.film.tilt).add(p.pos);
}
// un punto en lo alto del antebrazo (f: 0 el codo, 1 la muñeca), para el
// jugador agarrado a él; con hang, colgado del virote
function armPoint(G) {
  const P = { f: 0.55, lift: 0.95, hang: false };
  P.get = () => {
    const B = G.M.byName;
    const e = B.foreL.getWorldPosition(new V3()),
      w = B.handL.getWorldPosition(new V3());
    const at = e.clone().lerp(w, P.f);
    at.y += P.lift;
    const d = _v.subVectors(w, e).normalize();
    // (tumbado a lo largo del antebrazo, la cabeza hacia la mano y boca
    // abajo: el eje del cuerpo, a lo largo; el pecho, contra el brazo)
    const front = _v2.set(0, -1, 0).addScaledVector(d, d.y).normalize();
    const right = _v3.crossVectors(d, front).normalize();
    const m = new THREE.Matrix4().makeBasis(right, d, front);
    const tilt = new THREE.Quaternion().setFromRotationMatrix(m);
    at.addScaledVector(d, -0.9);
    return { pos: at, yaw: 0, tilt };
  };
  return P;
}
// colgado del virote: las manos en el astil, el cuerpo debajo
export function hangOnBolt(bolt) {
  const q = bolt.mesh.quaternion;
  const along = _v.set(0, 0, 1).applyQuaternion(q);
  const grip = bolt.tail.clone().addScaledVector(along, BOLT_L - 0.12);
  return { pos: grip.add(_v2.set(0, -2.15, 0)), yaw: Math.atan2(along.x, along.z) + Math.PI / 2, tilt: new THREE.Quaternion() };
}

// lo alto de la torre revienta: el cadalso, el pretil, la espringala; la
// cadena se parte (cuelga del virote)
function smashTop(D, S) {
  const g = D.g,
    a = g.audio;
  const c = new V3(T.x, T.deckY + 0.5, T.z);
  D.crumble('torreSurTop', { ruin: 'torreSurTopRuin', from: new V3(T.x + 4, T.deckY + 2, T.z - 6), tilt: 0.25, drop: 2.5, dur: 0.6, speed: 1.4, n: 16, sound: false, shake: false, wood: true, dust: 1.2, at: c });
  // la espringala, en pedazos
  S.root.visible = false;
  S.bollardG.visible = false;
  S.rope.pin(0, null);
  const [dx0, dz0, dx1, dz1] = T.deck;
  for (let i = 0; i < 22; i++)
    D.chunks.add({ mat: i % 4 ? 'planks' : 'timber', size: i % 4 ? [rnd(0.8, 1.6), 0.08, 0.28] : [0.24, 0.24, rnd(1.4, 2.6)], pos: new V3(rnd(dx0, dx1), T.deckY + rnd(-0.3, 1.2), rnd(dz0, dz1)), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(rnd(-9, 4), rnd(3, 11), rnd(2, 12)), spin: [rnd(-9, 9), rnd(-9, 9), rnd(-9, 9)], shatter: 99, life: 9 });
  D.debris.burst(c, 30, { speed: 10, up: 7, size: 0.9, spread: 2.5 });
  D.splinters.burst(c, 30, { speed: 11, up: 8, size: 1.1, spread: 2 });
  a && a.play('explosion', c, { k: 2 });
  a && a.play('rackBreak', c, { k: 2.2 });
  a && a.play('woodBreak', c, { k: 2 });
  a && a.play('chainRun', c, { k: 2 });
  g.camRig.shake(1.6);
  g.flash = Math.max(g.flash || 0, 0.25);
  g.input.rumble(1, 1, 1000);
}
