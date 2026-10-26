// La película, actos 1 y 2: la transformación y el lanzamiento.
//
// Acto 1. El arzobispo, vencido, cae de rodillas en el centro de la
// cisterna; alza el incensario, la sangre hierve y la carne del dios le
// envuelve. El suelo se hunde en un pozo y se lo traga. Un latido. Lo que sube
// es el gigante, encogido, con la joroba por delante: la losa del borde, con
// el jugador encima, cae sobre ella (¡Agárrate!) y sube con él: el ascensor.
// La cúpula revienta; sale a la noche por fuera de la muralla norte, se iza
// fuera del cráter y ruge a la ciudad. Atraviesa la muralla (¡Agárrate!),
// abre la cabecera y la nave de la catedral; el golpe suelta al jugador, que
// cae dentro agarrado al estandarte. La bóveda se viene abajo mientras corre
// hacia la puerta (¡Esquiva!, ¡Rueda!) y la mano entra a por él.
//
// Acto 2. Le atrapa (¡Apuñala!), le alza sobre la ciudad hasta su cara, le
// ruge y le lanza hacia el sur: el vuelo, a cámara lenta (¡Cúbrete!), y el
// tejado del establo de los Pellejeros.
import * as THREE from 'three';
import { sm, smoother, lerp, easeIn } from './film.js';
import { FP } from './film_player.js';
import { CISTERN, PIT_SLAB } from '../../world/level_finale.js';
import { idolEye } from '../../entities/idol.js';
import { clamp } from '../../core/util.js';
import { objMat } from '../../gfx/materials.js';
import { sampleSurface } from './collapse.js';

const V3 = THREE.Vector3;
const rnd = (a, b) => a + Math.random() * (b - a);
const _v = new V3(),
  _v2 = new V3(),
  _q = new THREE.Quaternion(),
  _m = new THREE.Matrix4();

const { cz: CZ, AY } = CISTERN;
// dónde se arrodilla el arzobispo (donde se arrodilló: en la fuente, por el
// boquete de la reja, de cara a la estatua del fondo y al jugador, que queda
// entre los dos, en la losa del borde del pozo, de espaldas a la sima)
const ARCH = { x: 0, z: CZ - 2.6, yaw: 0 };
const PL = { x: 0.15, z: PIT_SLAB.z + 0.1, yaw: Math.PI };
// el gigante sube del pozo mirando al sur: su raíz, tan al norte que la
// joroba (7,3 m por delante de la raíz cuando está encogido) asoma junto a
// la losa del jugador
const GIANT = { x: 0, z: -154.0, yaw: 0 };
// la joroba en el espacio del modelo (sobre el hueso 'chest') y su normal
const HUMP = { p: [0, 15.75, -2.95], n: [0, 0.74, -0.67] };
// dónde queda al salir del cráter (los pies, en tierra firme al sur del
// agujero, que tiene 10,5 m de radio)
export const CLIMB_Z = -139.5;

// ------------------------------------------------------------ la carne del dios
// Tentáculos que brotan del suelo alrededor del arzobispo y le suben,
// enroscándose (crecen con el rango de dibujo); y el capullo que se hincha.
function buildFlesh() {
  const grp = new THREE.Group();
  const mat = objMat('flesh');
  const list = [];
  const SEG = 48,
    RAD = 8;
  for (let i = 0; i < 14; i++) {
    const a0 = (i / 14) * Math.PI * 2 + rnd(-0.2, 0.2);
    const r0 = rnd(2.0, 3.6);
    const turn = (i % 2 ? 1 : -1) * rnd(1.6, 2.6);
    const h = rnd(3.4, 5.0);
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const u = k / 10;
      const a = a0 + turn * u;
      const r = lerp(r0, 0.55 + 0.18 * Math.sin(u * 6 + i), Math.min(1, u * 1.6));
      pts.push(new V3(Math.cos(a) * r, k === 0 ? -0.3 : u * h, Math.sin(a) * r));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, SEG, 1, RAD, false);
    const P = geo.attributes.position,
      UV = geo.attributes.uv;
    const L = curve.getLength();
    const c = new V3(),
      v = new V3();
    for (let j = 0; j <= SEG; j++) {
      const u = j / SEG;
      curve.getPointAt(u, c);
      const r = lerp(0.5, 0.1, Math.pow(u, 0.75)) * (1 + 0.2 * Math.sin(u * 23 + i));
      for (let q = 0; q <= RAD; q++) {
        const idx = j * (RAD + 1) + q;
        v.fromBufferAttribute(P, idx).sub(c).multiplyScalar(r).add(c);
        P.setXYZ(idx, v.x, v.y, v.z);
        UV.setXY(idx, u * L * 0.8, (q / RAD) * r * 4);
      }
    }
    geo.computeVertexNormals();
    geo.setDrawRange(0, 0);
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false;
    grp.add(m);
    list.push({ geo, per: RAD * 6, segs: SEG, delay: rnd(0, 0.9), speed: rnd(0.85, 1.2) });
  }
  // el capullo: carne con bultos y pliegues que late (se le ve crecer dentro
  // de los tentáculos)
  const cg = new THREE.IcosahedronGeometry(1, 4);
  const P = cg.attributes.position;
  const UV = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) {
    _v.fromBufferAttribute(P, i);
    const k = 1 + 0.16 * Math.sin(_v.x * 5.1 + _v.y * 3.3) * Math.sin(_v.z * 4.7 + 1.3) + 0.07 * Math.sin(_v.y * 13 + _v.x * 4) + 0.05 * Math.sin(_v.z * 17);
    P.setXYZ(i, _v.x * k, _v.y * k, _v.z * k);
    UV[i * 2] = (Math.atan2(_v.z, _v.x) / (Math.PI * 2) + 0.5) * 6;
    UV[i * 2 + 1] = _v.y * 3;
  }
  cg.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
  cg.computeVertexNormals();
  const cocoon = new THREE.Mesh(cg, mat);
  cocoon.frustumCulled = false;
  cocoon.visible = false;
  grp.add(cocoon);
  return { grp, list, mat, cocoon };
}

// el incensario del arzobispo, su cadena y sus velas (van sueltos)
function showCenser(e, on) {
  const c = e && e.P.censer;
  if (!c) return;
  c.grp.visible = on;
  for (const l of c.links) l.visible = on;
  for (const s of c.candles) s.visible = on;
  if (!on && c.light) c.light.intensity = 0;
}

// ======================================================================
// ACTO 1
// ======================================================================
export function* actRise(D, o = {}) {
  const g = D.g,
    F = D.film,
    p = g.player,
    a = g.audio;
  const G = yield* D.waitGiant();
  F.cinema(true);
  F.puppet(true);
  g.lockTarget = null;
  g.activeBoss = null;
  a && a.stopMusic();
  const e = D.archbishop || g.bosses.turibulario;
  // ---------------------------------------------------------- a negro y a sus sitios
  // (tras el último golpe: un instante a cámara lenta y a negro)
  if (o.fromFight) yield* F.wait(0.55);
  g.fadeTarget = 0;
  yield* F.wait(o.fromFight ? 0.5 : 0.05);
  a && a.play('dread');
  const home = new V3(ARCH.x, AY, ARCH.z);
  if (e) {
    e.scripted = true;
    e.dead = false;
    e.state = 'bossIdle';
    e.atk = null;
    e.data.censerTarget = null;
    e.pos.set(home.x, home.y, home.z);
    if (e.body) e.body.pos.copy(home);
    e.yaw = ARCH.yaw;
    e.obj.visible = true;
    e.anim.stop(0.01);
    if (e.T.onReset) e.T.onReset(e);
    e.data.lightK = 0.32;
    showCenser(e, true);
    e.anim.play(e.T.clips.death, { blend: 0.01, t0: 1.4 });
    e.anim.speed = 0;
  }
  F.setP(PL.x, AY, PL.z, PL.yaw);
  F.pClip(FP.kneelGrip, { blend: 0.01 });
  // la estatua del fondo lo mira todo, con el ojo abierto: a él
  const S = g.spring;
  if (S) {
    S.eyeTo = 1;
    S.lookAt = new V3(home.x, AY + 1.2, home.z);
  }
  p.anim.stop(0.01);
  g.combat.clear();
  const flesh = buildFlesh();
  flesh.grp.position.copy(home);
  g.scene.add(flesh.grp);
  const red = D.light({ x: home.x, y: AY + 1.4, z: home.z + 2, color: 0xff3412, intensity: 0, range: 18, priority: 9 });
  // la losa del jugador (la del borde del pozo: suelta en el suelo)
  const slabM = new THREE.Matrix4().compose(new V3(PIT_SLAB.x, PIT_SLAB.y, PIT_SLAB.z), new THREE.Quaternion(), new V3(1, 1, 1));
  const slab = D.chunks.add({ mat: 'flag', size: PIT_SLAB.size, pos: new V3(PIT_SLAB.x, PIT_SLAB.y, PIT_SLAB.z), uv: 0.5, attach: () => slabM, life: 600, tint: 0x9c948c });
  // el gigante, colocado ya (en el fondo del pozo, todavía oculto)
  G.place(GIANT.x, GIANT.z, GIANT.yaw, { y: 0, ground: false, clip: 'rise', bellNoGround: true });
  G.R.action.speed = 0;
  G.show(false);
  G.setBell(false);
  G.lookW = 0;
  G.steps = false;
  G.pushPlayer = false;
  // ---------------------------------------------------------- 1. de rodillas
  g.fadeTarget = 1;
  let t = 0;
  const boil = { t: 0, k: 0 };
  // por encima del hombro del jugador (desde el borde de la sima)
  F.shot([PL.x + 1.25, AY + 2.3, PL.z + 1.1], [home.x - 0.3, AY + 1.9, home.z], { fov: 48 });
  F.hand = 0.03;
  if (e) a && a.enemyVoice(e, 'hurt');
  a && a.play('bellToll', { x: 0, y: 4, z: CZ }, { k: 0.6 });
  // el arzobispo y su carne, cada fotograma, mientras dure el acto
  const st = { lift: 0, grip: 0, censer: false, sink: 0, gone: false, cocoon: 0, grow: 0 };
  F.also(
    (function* () {
      while (!st.gone) {
        const dt = yield;
        if (!e) continue;
        const sx = Math.sin(g.time * 17) * 0.06 * st.grip;
        e.pos.set(home.x + sx, AY - st.sink, home.z);
        e.obj.rotation.z = Math.sin(g.time * 6.3) * 0.08 * st.grip;
        e.yaw = ARCH.yaw;
        e.data.censerTarget = st.censer ? new V3(e.pos.x, e.pos.y + 6.2, e.pos.z + 0.4) : null;
        e.data.censerPull = 8;
        e.animate(dt);
        if (e.T.update) {
          const s0 = e.state;
          e.state = 'attack';
          e.T.update(e, dt, p);
          e.state = s0;
        }
      }
    })()
  );
  yield* F.wait(2.6);
  // ---------------------------------------------------------- 2. el incensario
  if (e) {
    e.anim.speed = 1;
    e.state = 'alert';
    e.anim.play(e.T.clips.intro, { blend: 0.25 });
    a && a.enemyVoice(e, 'idle');
  }
  // de frente y desde abajo
  yield* F.move({ pos: [-1.5, AY + 0.8, home.z + 6.0], look: [home.x, AY + 2.4, home.z], fov: 58 }, { pos: [-1.2, AY + 0.95, home.z + 5.5], look: [home.x, AY + 3.9, home.z], fov: 56 }, 1.4);
  if (e) {
    e.state = 'attack';
    e.anim.play(e.T.clips.volley, { blend: 0.25 });
    st.censer = true;
    a && a.enemyVoice(e, 'alert');
    a && a.play('stoneCreak', home, { k: 0.7 });
  }
  yield* F.wait(0.5);
  // lo que mira: la cara de la estatua del fondo, de cerca y desde abajo; el
  // ojo, abierto del todo, clavado en él, y la sima que se enciende
  {
    const E = idolEye();
    F.also(F.move({ pos: [E.x - 0.9, E.y - 1.4, E.z - 2.7], look: [E.x, E.y - 0.1, E.z], fov: 40 }, { pos: [E.x - 0.6, E.y - 1.1, E.z - 2.2], look: [E.x, E.y, E.z], fov: 36 }, 1.7, sm));
    a && a.play('coreBeat', E, { k: 1 });
    t = 0;
    while (t < 1.7) {
      const dt = yield;
      t += dt;
      if (S) S.boost = Math.min(0.8, t * 0.9);
    }
  }
  // ---------------------------------------------------------- 3. la carne
  // la sangre hierve; la carne del dios brota, le sube por el cuerpo y le
  // envuelve en un capullo que se hincha
  a && a.play('burn', home, { k: 1.4 });
  F.shot([-8.6, AY + 3.2, CZ + 6.0], [home.x, AY + 1.6, home.z], { fov: 60 });
  t = 0;
  while (t < 4.2) {
    const dt = yield;
    t += dt;
    boil.k = Math.min(1, t / 1.2);
    st.grip = clamp((t - 0.8) / 1.4, 0, 1);
    if (t > 0.9) st.censer = false;
    for (const q of flesh.list) {
      const u = clamp(((t - 0.4 - q.delay) / 2.6) * q.speed, 0, 1);
      q.geo.setDrawRange(0, Math.floor(sm(u) * q.segs) * q.per);
    }
    // el capullo, que crece dentro de los tentáculos y le traga
    const cu = clamp((t - 1.9) / 2.3, 0, 1);
    flesh.cocoon.visible = cu > 0;
    const beatK = 1 + 0.045 * Math.sin(g.time * 8.5) * cu;
    const rr = lerp(0.5, 1.75, sm(cu)) * beatK;
    flesh.cocoon.scale.set(rr, lerp(0.7, 2.55, sm(cu)) * beatK, rr);
    flesh.cocoon.position.set(0, lerp(1.0, 2.35, sm(cu)), 0);
    if (cu > 0.6 && e && e.obj.visible) {
      e.obj.visible = false;
      showCenser(e, false);
    }
    red.intensity = 26 * boil.k * (0.8 + 0.2 * Math.sin(g.time * 13));
    _boil(g, boil, dt, home);
    F.cam.look.y = lerp(AY + 1.6, AY + 2.8, sm(t / 4.2));
    if (t > 0.2 && !st.s1) {
      st.s1 = true;
      a && a.play('fleshTear', home, { k: 1.2 });
    }
    if (t > 1.0 && !st.s2) {
      st.s2 = true;
      a && a.play('rageScream', home, { k: 0.9 });
    }
    if (t > 2.2 && !st.s3) {
      st.s3 = true;
      a && a.play('fleshTear', home, { k: 1.5 });
    }
    g.camRig.shake(dt * 0.45);
  }
  // ---------------------------------------------------------- 4. el suelo se hunde
  // grietas, polvo; el cuadro del centro se parte en losas que caen al pozo y
  // el capullo se hunde con ellas. El jugador se tambalea en el borde
  F.shot([4.6, AY + 1.3, PL.z + 0.6], [0, AY - 1.0, CZ + 0.5], { fov: 62 });
  a && a.play('stoneCreak', home, { k: 1.6 });
  a && a.play('crack', home, { k: 1.4 });
  g.camRig.shake(0.6);
  g.input.rumble(0.8, 1, 700);
  yield* F.wait(0.55);
  g.setGroupVisible('cisternFloorC', false);
  g.setGroupVisible('cisternPit', true);
  _floorSlabs(D, CZ);
  a && a.play('wallBreak', home, { k: 1.6 });
  a && a.play('pillarBreak', { x: 2, y: AY, z: CZ + 2 }, { k: 1.4 });
  g.fx.blood.emit(0, AY + 0.4, CZ, 120, { color: [0.44, 0.41, 0.37], speed: 6, life: 2.4, up: 2, gravity: 0.4 });
  F.pClip('stagger', { blend: 0.06 });
  t = 0;
  while (t < 1.6) {
    const dt = yield;
    t += dt;
    st.sink = easeIn(t / 1.6) * 9;
    flesh.grp.position.y = AY - st.sink;
    red.y = AY - st.sink * 0.6;
  }
  st.gone = true;
  flesh.grp.visible = false;
  // (la estatua se queda en su sima, mirando el pozo)
  if (S) {
    S.boost = 0.25;
    S.lookAt = new V3(0, AY - 4, CZ);
  }
  if (e) {
    e.obj.visible = false;
    e.shadow && (e.shadow.visible = false);
  }
  // ---------------------------------------------------------- 5. el pozo (un latido)
  // oscuridad roja, silencio, latidos, y algo enorme que sube: de lado, a ras
  // del borde, el jugador agarrado al borde (con su antorcha) y, delante, la
  // joroba que asoma del pozo con sus púas y las piedras que lleva encima
  F.pClip(FP.kneelGrip, { blend: 0.3 });
  F.shot([-4.4, AY + 1.2, -145.6], [0.2, AY + 0.2, -145.6], { fov: 56 });
  F.hand = 0.025;
  red.x = 0;
  red.z = PL.z - 3.5;
  red.y = AY - 5;
  red.range = 24;
  a && a.play('silence');
  G.show(true);
  G.R.action.speed = 1;
  t = 0;
  let beat = 0;
  while (t < 2.7) {
    const dt = yield;
    t += dt;
    // un latido (la luz y el temblor), cada vez más deprisa; del fondo suben
    // pavesas y un vaho rojo
    const b = Math.max(0, Math.sin(t * (4.2 + t * 1.2))) ** 6;
    red.intensity = 30 + 52 * b;
    if (Math.random() < dt * 18) g.fx.blood.emit(rnd(-3, 3), AY - rnd(5, 8), PL.z - rnd(2.5, 7), 1, { color: [1, 0.42, 0.14], speed: 0.8, life: 1.8, up: 4.5, gravity: -1.5 });
    if (b > 0.9 && t - beat > 0.6) {
      beat = t;
      g.camRig.shake(0.16 + t * 0.05);
      g.input.rumble(0.3, 0.6, 140);
      a && a.play('slamSoft', { x: 0, y: AY - 8, z: CZ }, { k: 0.9 });
      g.fx.blood.emit(0, AY - 7, PL.z - 4.5, 26, { color: [1, 0.36, 0.12], speed: 2.4, life: 1.6, up: 6, gravity: -2 });
      g.fx.blood.emit(0, AY - 6, PL.z - 4.5, 16, { color: [0.42, 0.08, 0.06], speed: 1.6, life: 2.4, up: 3, gravity: -0.6 });
    }
  }
  // ---------------------------------------------------------- 6. lo que sube
  a && a.play('beastRoarBig', { x: 0, y: AY - 6, z: CZ }, { k: 1.1 });
  g.camRig.shake(0.5);
  // la losa se raja y se inclina hacia el pozo; el jugador resbala
  const hinge = new V3(PIT_SLAB.x, PIT_SLAB.y + PIT_SLAB.size[1] / 2, PIT_SLAB.z + PIT_SLAB.size[2] / 2);
  F.pClip(FP.slide, { blend: 0.15 });
  // (cámara baja, de lado, a ras del borde: la losa se vence hacia la joroba)
  F.shot([4.4, AY + 0.75, PIT_SLAB.z - 0.2], [-0.2, AY - 0.9, PIT_SLAB.z - 1.6], { fov: 62 });
  F.hand = 0.06;
  let tilt = 0;
  const humpM = () => humpMatrix(G, _m);
  const playerOnSlab = (slabMatrix, along = 0.2) => {
    // el jugador, tumbado boca abajo sobre la losa, la cabeza hacia el pozo
    const sx = _v.set(1, 0, 0).transformDirection(slabMatrix);
    const sy = _v2.set(0, 1, 0).transformDirection(slabMatrix).clone();
    const sz = new V3(0, 0, 1).transformDirection(slabMatrix);
    // cuerpo: +y del jugador hacia -z de la losa (hacia el pozo), cara hacia la losa
    const by = sz.clone().negate(),
      bz = sy.clone().negate(),
      bx = new V3().crossVectors(by, bz);
    const Q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(bx, by, bz));
    const c = new V3().setFromMatrixPosition(slabMatrix);
    const pos = c.addScaledVector(sz, 0.95 - along).addScaledVector(sy, PIT_SLAB.size[1] / 2 + 0.16);
    void sx;
    return { pos, yaw: 0, tilt: Q };
  };
  const slabNow = () => slab.mesh.matrixWorld;
  F.attach = () => playerOnSlab(slabNow(), 0.15);
  // aviso: ¡Agárrate! (machacar) mientras la losa se va inclinando
  F.slow(0.32, 8);
  const grab = F.promptAsync({ action: 'interact', label: '¡Agárrate!', window: 2.6, mash: 6, slow: 1 });
  t = 0;
  while (grab.ok === null || t < 0.4) {
    const dt = yield;
    t += dt;
    tilt = Math.min(0.62, tilt + dt * 0.5);
    _hingeSlab(slabM, hinge, tilt);
  }
  F.slow(1, 5);
  const gripped = grab.ok;
  if (gripped) F.pClip(FP.cling, { blend: 0.12 });
  else {
    // resbala hasta el borde y se quema la mano en la carne; se agarra igual
    F.hurt(18, null, { shake: 0.5 });
    a && a.play('burn', p.pos, { k: 0.8 });
    F.pClip(FP.cling, { blend: 0.2 });
  }
  // la losa cae sobre la joroba y se queda encajada en las púas
  {
    const from = new THREE.Matrix4().copy(slabM);
    const fp = new V3(),
      fq = new THREE.Quaternion(),
      fs = new V3();
    from.decompose(fp, fq, fs);
    const tp = new V3(),
      tq = new THREE.Quaternion(),
      ts = new V3();
    t = 0;
    while (t < 0.55) {
      const dt = yield;
      t += dt;
      const u = easeIn(Math.min(1, t / 0.55));
      humpM().decompose(tp, tq, ts);
      slabM.compose(fp.clone().lerp(tp, u), fq.clone().slerp(tq, u), fs);
    }
    // encajada: desde ahora va con la joroba
    slab.attach = () => humpM();
    a && a.play('slam', p.pos, { k: 1.0 });
    a && a.play('pillarBreak', p.pos, { k: 0.8 });
    g.camRig.shake(0.7);
    g.input.rumble(1, 1, 300);
    F.hurt(gripped ? 4 : 10, null, { shake: 0.4, blood: false });
  }
  // ---------------------------------------------------------- 7. el ascensor
  // (a) por encima del jugador, mirando abajo, al pozo que se aleja: las
  // columnas caen hacia fuera
  F.follow((dt, tt) => {
    const P = p.pos;
    const u = sm(clamp(tt / 2.2, 0, 1));
    return { pos: new V3(P.x + 1.6, P.y + lerp(3.6, 5.2, u), P.z - lerp(2.4, 3.0, u)), look: new V3(P.x * 0.4, P.y - lerp(5, 9, u), P.z + lerp(1.0, 2.4, u)), fov: lerp(64, 72, u), roll: Math.sin(tt * 0.7) * 0.05 };
  });
  F.hand = 0.05;
  D.windK = 0.35;
  D.heroK = 1;
  let cols = false;
  while (G.actT < 4.0) {
    yield;
    if (G.actT > 3.0 && !cols) {
      cols = true;
      _topple(D, CZ);
    }
    red.intensity = 40;
  }
  // (b) desde abajo, junto al muro: la espalda empuja la bóveda, que se raja
  F.shot([8.2, AY + 1.2, CZ + 5.6], [0, CISTERN.YT + 1, CZ], { fov: 70 });
  F.hand = 0.04;
  a && a.play('stoneCreak', { x: 0, y: 2, z: CZ }, { k: 2 });
  g.camRig.shake(0.5);
  let dust = 0;
  while (G.actT < 5.35) {
    const dt = yield;
    dust -= dt;
    if (dust <= 0) {
      dust = 0.08;
      g.fx.blood.emit(rnd(-7, 7), CISTERN.YT + rnd(0.5, 4), CZ + rnd(-7, 7), 6, { color: [0.42, 0.4, 0.37], speed: 1, life: 2.2, up: -2 });
    }
    g.camRig.shake(dt * 0.6);
  }
  // la cúpula revienta
  _burstDome(D, CZ);
  a && a.play('explosion', { x: 0, y: CISTERN.DOME, z: CZ }, { k: 1.4 });
  a && a.play('wallBreak', { x: 0, y: CISTERN.DOME, z: CZ }, { k: 2 });
  g.flash = Math.max(g.flash, 0.3);
  g.flashTint = [0.9, 0.8, 0.7];
  g.camRig.shake(1);
  g.input.rumble(1, 1, 800);
  // (c) fuera, en el borde de lo que era la cúpula: revienta la tierra y sube
  // la espalda con el jugador, entre los trozos que saltan
  g.setGroupVisible('craterLid', false);
  g.setGroupVisible('crater', true);
  const outLights = _craterLights(D, CZ);
  g.atmo.override = { density: 0.013, vol: 0.05, far: 230, bloom: 1.3, hemi: 2.4, moon: 2.4, moonPos: [-18, 22, -40], fog: 0x3a2c2a, snap: true };
  yield* F.wait(0.12);
  F.shot([5.2, 2.6, -139.8], [0, 4.5, -151.5], { fov: 66 });
  F.hand = 0.06;
  D.windK = 0.8;
  red.y = AY + 2;
  red.intensity = 50;
  red.range = 26;
  while (G.actT < 7.5) yield;
  // ---------------------------------------------------------- 8. la noche
  // se iza fuera del cráter, hacia el borde del sur (se agarra a él y avanza
  // sobre las manos: la raíz va del centro del pozo a la tierra firme);
  // plano general desde el adarve, que se le viene encima: ruge a la ciudad
  D.dropLight(red);
  F.attach = () => onHump(G, slab);
  F.keyLight(1);
  F.pClip(FP.kneelGrip, { blend: 0.4 });
  F.hand = 0.02;
  const z0 = G.pos.z;
  F.follow((dt, tt) => {
    const u = sm(clamp(tt / 5.2, 0, 1));
    return { pos: new V3(lerp(16, 13.5, u), lerp(11.6, 11.4, u), lerp(-125.2, -126.0, u)), look: new V3(0, lerp(7.5, 12.5, u), G.pos.z - 1.5), fov: lerp(58, 54, u) };
  });
  g.atmo.override = { ...g.atmo.override, moonPos: [-16, 26, -30] };
  while (G.actT < 12.75) {
    yield;
    G.pos.z = lerp(z0, CLIMB_Z, smoother(clamp((G.actT - 7.4) / 4.8, 0, 1)));
  }
  G.pos.z = CLIMB_Z;
  // ruge (desde abajo, delante de sus pies: la cabeza contra el cielo; la
  // luna por detrás le recorta)
  F.shot([6.8, 1.5, CLIMB_Z + 8.5], [0, 16.5, CLIMB_Z - 1], { fov: 70 });
  g.atmo.override = { ...g.atmo.override, moonPos: [-10, 24, -40], moon: 3.0, snap: true };
  F.hand = 0.05;
  a && a.play('beastRoarBig', G.head(_v), { k: 1.6 });
  g.camRig.shake(1);
  g.input.rumble(1, 1, 900);
  a && a.music('bossFinal');
  for (const [x, z] of [
    [9, -60],
    [-9, -60],
  ])
    a && a.play('bellToll', { x, y: 18, z }, { k: 1.2 });
  yield* F.wait(2.2);
  G.base('idle');
  // (sigue en el acto 1, segunda mitad: la muralla y la nave)
  D.rise = { slab, humpM, outLights };
}

// luces del cráter: el rojo de la cisterna desde abajo y dos fuegos en el borde
function _craterLights(D, cz) {
  return [
    D.light({ x: 0, y: -3, z: cz, color: 0xff3010, intensity: 46, range: 30, priority: 9 }),
    D.light({ x: -8.5, y: 1.2, z: cz + 8.5, color: 0xff8a3a, intensity: 18, range: 15, priority: 7 }),
    D.light({ x: 9.5, y: 1.2, z: cz - 6, color: 0xff8a3a, intensity: 18, range: 15, priority: 7 }),
  ];
}

// la matriz de la losa encajada en la joroba (en el mundo)
export function humpMatrix(G, out) {
  const B = G.M.byName.chest;
  const rw = G.M.restWorld.chest;
  _q.setFromUnitVectors(_v.set(0, 1, 0), _v2.set(...HUMP.n).normalize());
  out.compose(_v.set(HUMP.p[0] - rw.x, HUMP.p[1] - rw.y + 0.14, HUMP.p[2] - rw.z), _q, _v2.set(1, 1, 1));
  return out.premultiply(B.matrixWorld);
}
// el jugador de rodillas en la joroba, agarrado a la púa (mirando hacia la
// cabeza del gigante)
export function onHump(G, slab) {
  const M = slab.mesh.matrixWorld;
  const up = new V3(0, 1, 0).transformDirection(M);
  const fwd = new V3(0, 0, 1).transformDirection(M);
  // (de pie sobre la losa: el cuerpo, entre la vertical y la normal de la losa)
  const by = up.clone().lerp(new V3(0, 1, 0), 0.55).normalize();
  const bz = fwd.clone().addScaledVector(by, -fwd.dot(by)).normalize();
  const bx = new V3().crossVectors(by, bz);
  const Q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(bx, by, bz));
  const pos = new V3().setFromMatrixPosition(M).addScaledVector(up, 0.17);
  return { pos, yaw: 0, tilt: Q };
}

// la losa del borde, inclinándose sobre su arista de fuera
function _hingeSlab(M, hinge, ang) {
  const q = _q.setFromAxisAngle(_v.set(1, 0, 0), -ang);
  const off = new V3(0, -PIT_SLAB.size[1] / 2, -PIT_SLAB.size[2] / 2).applyQuaternion(q);
  M.compose(new V3().copy(hinge).add(off), q, _v2.set(1, 1, 1));
}

// la sangre que hierve en el suelo de la cisterna
function _boil(g, B, dt, home) {
  B.t -= dt;
  let n = 0;
  while (B.t <= 0 && n++ < 40) {
    B.t += 0.016 / Math.max(0.05, B.k);
    const x = rnd(-11, 11),
      z = rnd(-164, -141);
    g.fx.blood.emit(x, AY + 0.06, z, 2, { color: [0.45, 0.05, 0.04], speed: 1.2, life: 0.5, up: 2.4 });
  }
  if (Math.random() < dt * 14 * B.k) g.fx.blood.emit(home.x + rnd(-3, 3), AY + 0.3, home.z + rnd(-3, 3), 3, { color: [0.5, 0.42, 0.4], speed: 0.6, life: 1.6, up: 1.2, gravity: -1.5 });
}

// el cuadro del suelo, partido en losas que caen al pozo
function _floorSlabs(D, cz) {
  const N = 12;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + rnd(-0.2, 0.2);
    const r = rnd(1.5, 5.5);
    const x = Math.cos(a) * r,
      z = cz + Math.sin(a) * r;
    if (z > PIT_SLAB.z - 1.6 && Math.abs(x) < 1.6) continue;
    D.chunks.add({ mat: 'flag', size: [rnd(1.6, 2.6), 0.34, rnd(1.4, 2.4)], pos: new V3(x, AY - 0.17, z), rot: [0, rnd(0, 3), 0], vel: new V3(-Math.cos(a) * rnd(0.5, 1.5), rnd(-1, 0), -Math.sin(a) * rnd(0.5, 1.5)), spin: [rnd(-2, 2), rnd(-1, 1), rnd(-2, 2)], floor: AY - 18, shatter: 99, life: 6, tint: 0x9c948c, dust: false });
  }
  // el polvo que sube del agujero (y el que levanta el borde que se raja)
  const col = D.dustColor({ x: 0, y: AY, z: cz });
  D.dust.ring({ x: 0, y: AY, z: cz }, 14, { color: col, r0: 5.5, speed: 3, size: 2.2, life: 4.5, grow: 1.4, alpha: 0.45, up: 0.6 });
  D.dust.burst({ x: 0, y: AY - 2, z: cz }, 8, { color: col, spread: 4, size: 2.6, speed: 1, up: 3, rise: 1.2, life: 5, grow: 1.2, alpha: 0.4, ground: false, stagger: 0.6 });
}

// las ocho columnas del corro se vienen abajo (y sus arcos y los macizos de
// encima): se hunden hacia fuera del pozo, en trozos de su propia piedra
function _topple(D, cz) {
  const g = D.g;
  D.crumble('cisternCols', { ruin: 'cisternColsRuin', from: new V3(0, AY + 3, cz), tilt: 0.05, drop: 7, dur: 1.0, n: 26, size: 1.1, speed: 0.5, up: 0.6, sound: false, shake: 0.6 });
  g.audio && g.audio.play('pillarBreak', { x: 8, y: AY + 3, z: cz }, { k: 2 });
  g.audio && g.audio.play('pillarBreak', { x: -8, y: AY + 3, z: cz }, { k: 2 });
  g.camRig.shake(0.6);
}

// la cúpula revienta: trozos de la cúpula de verdad que saltan hacia arriba
// y caen alrededor, una columna de polvo y la onda a ras de suelo
function _burstDome(D, cz) {
  const g = D.g;
  const G = g.groups.cisternDome;
  const pts = G ? sampleSurface(G.meshes.filter((m) => m.visible), 30) : [];
  g.setGroupVisible('cisternDome', false);
  g.setGroupVisible('cisternDomeRuin', true);
  g.setGroupVisible('cisternCrown', false);
  for (const q of pts) {
    const dx = q.p.x,
      dz = q.p.z - cz;
    const r = Math.hypot(dx, dz) || 1;
    const s = rnd(0.7, 1.8);
    D.chunks.add({ mat: q.mat === 'glass' ? 'mossstone' : q.mat, size: [s * 1.2, s * 0.45, s], pos: q.p, rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3((dx / r) * rnd(2, 7), rnd(6, 14), (dz / r) * rnd(2, 7)), spin: [rnd(-4, 4), rnd(-4, 4), rnd(-4, 4)], shatter: 12, life: 9, quiet: true });
  }
  for (let i = 0; i < 10; i++) {
    const a = rnd(0, Math.PI * 2),
      r = rnd(2, 9);
    D.chunks.add({ mat: 'dirt', size: [rnd(0.8, 1.6), rnd(0.5, 0.9), rnd(0.8, 1.4)], pos: new V3(Math.cos(a) * r, CISTERN.YT + rnd(1, 4), cz + Math.sin(a) * r), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(Math.cos(a) * rnd(2, 6), rnd(7, 13), Math.sin(a) * rnd(2, 6)), spin: [rnd(-4, 4), rnd(-4, 4), rnd(-4, 4)], shatter: 10, life: 8, quiet: true });
  }
  D.debris.burst(new V3(0, CISTERN.DOME, cz), 50, { speed: 9, up: 12, size: 1.1, spread: 5 });
  const col = D.dustColor({ x: 0, y: 1, z: cz });
  // (una columna que sube con él, y la onda que se abre por el campo)
  D.dust.burst({ x: 0, y: CISTERN.DOME, z: cz }, 16, { color: col, spread: 5, size: 3.2, speed: 4, up: 7, rise: 1.5, life: 6, grow: 2.2, alpha: 0.5, ground: false });
  D.dust.ring({ x: 0, y: 0.5, z: cz }, 20, { color: col, r0: 8, speed: 11, size: 2.8, life: 6, grow: 2, alpha: 0.5, up: 0.4 });
  g.fx.blood.emit(0, CISTERN.DOME, cz, 80, { color: [0.3, 0.29, 0.27], speed: 10, life: 3, up: 4, gravity: 0.5 });
}
