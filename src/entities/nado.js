// El Condenado a nado (lo del sitio —dónde hay agua honda, el aliento—, en
// game/nado.js).
//
//  - En la superficie: flota con los hombros a ras del agua; el stick, a
//    braza hacia donde se empuja (con «correr», más deprisa y gastando
//    aguante); quieto, pedalea en el sitio. «Esquivar» (Espacio, B): se
//    zambulle.
//  - Bajo el agua: se nada hacia donde mira la cámara (de frente, mirando
//    abajo, se baja); «esquivar» sostenido, hacia el fondo; «interactuar»
//    (E, A), hacia arriba; sin tocar nada, el agua le sube poco a poco. El
//    aliento se gasta (game/nado.js).
//  - Sale andando donde hace pie (la playa), o se agarra al borde y sube, si
//    el borde está a ras del agua (la pila del ninfeo).
//  - Ni golpes, ni escudo, ni beber: el arma, envainada; el escudo, colgado
//    bajo la capa. El farol, que es de los cerrados, alumbra menos bajo el
//    agua.
//
// La brazada es de braza, hecha a mano (los brazos, por IK, con las manos
// que barren hacia fuera, tiran y vuelven por delante; las piernas, la
// patada de rana), y pedaleando, la del que se mantiene a flote.
import { swimBody } from '../world/collision.js';
import { solveArm } from './locomotion.js';
import { clamp, damp, dampAngle, lerp, smoothstep } from '../core/util.js';

// de los pies (pos) a la superficie, flotando (las caderas, a ras)
export const FLOTA = 1.1;
// el cuerpo para chocar a nado: un cilindro de alto H que empieza a BASE de
// los pies (alrededor de las caderas)
const BASE = 0.5,
  H = 0.9;
const SUP = 1.85,
  BAJO = 2.35,
  SPRINT = 1.5;

// Se mete en el agua v (game/nado.js: Nado.agua).
export function nadoEntrar(p, v) {
  const g = p.game;
  const vy = p.body.grounded ? 0 : p.body.vy || 0;
  p.state = 'swim';
  p.stT = 0;
  p.blocking = false;
  p.blockW = 0;
  p.sprinting = false;
  p.charging = false;
  p.buffer = null;
  p.iframe = false;
  p.swinging = false;
  p.flask.visible = false;
  p.anim.stop(0.15);
  p.body.grounded = false;
  const S = (p.nadoS = { v, vy: Math.max(-6, vy), sub: !v.aire, fase: 0, pitch: v.aire ? 0.4 : 1.3, w: 0, sp: 0, salir: 0, braz: 0 });
  // (cayendo desde lo alto: se hunde un poco antes de subir)
  if (vy < -3) S.sub = true;
  if (g.lockTarget) g.lockTarget = null;
  // el arma, envainada; el escudo, colgado a la espalda bajo la capa (visto
  // desde arriba, sobre la espalda de quien nada, parecía el casco de una
  // barca)
  p.rig.joints.sword.visible = false;
  p.rig.joints.shield.visible = false;
  p.shieldBack.group.visible = false;
  if (v.aire && g.nado) g.nado.chapoteo(p.pos.x, v.y1, p.pos.z, clamp(-vy / 6, 0.25, 1.4), vy < -3 ? 'zambullida' : 'brazada');
}

// Sale del agua: de pie (y, el suelo).
function salir(p, y) {
  p.camFloor = null;
  p.state = 'free';
  p.stT = 0;
  p.body.pos.y = y;
  p.body.vy = 0;
  p.body.grounded = true;
  p.groundY = y;
  p.nadoS = null;
  p.anim.stop(0.2);
  p.updateGear();
}

// Cada fotograma, nadando (en lugar de lo de andar: Player.update).
export function nadoUpdate(p, dt, input, cam, allowControl) {
  const g = p.game;
  const N = g.nado;
  const S = p.nadoS;
  const P = p.body.pos;
  p.stT += dt;
  p.iframe = false;
  p.blocking = false;
  p.swinging = false;
  p.buffer = null;
  // el agua de aquí (a la altura de las caderas)
  const v = N.agua(P.x, P.y + 0.95, P.z) || N.agua(P.x, P.y + 0.4, P.z) || N.agua(P.x, P.y + 1.4, P.z);
  if (!v) {
    // (fuera del agua: a andar, o a caer)
    p.camFloor = null;
    p.state = 'free';
    p.nadoS = null;
    p.body.grounded = false;
    p.body.vy = S ? Math.min(0, S.vy) : 0;
    p.updateGear();
    return;
  }
  S.v = v;
  const sup = v.aire ? v.y1 : null;
  // la entrada: relativa a la cámara
  const mv = allowControl ? input.move() : { x: 0, y: 0 };
  const cy = cam.yaw;
  const fx = Math.sin(cy),
    fz = Math.cos(cy);
  const rx = -Math.cos(cy),
    rz = Math.sin(cy);
  let wx = fx * mv.y + rx * mv.x,
    wz = fz * mv.y + rz * mv.x;
  const mag = Math.min(1, Math.hypot(wx, wz));
  if (mag > 0.01) {
    wx /= Math.max(mag, 1e-3);
    wz /= Math.max(mag, 1e-3);
  }
  p.moveMag = mag;
  const dive = allowControl && input.pressed('dodge');
  const down = allowControl && input.down('dodge');
  const up = allowControl && input.down('interact');
  const sprintHeld = allowControl && input.down('sprint') && mag > 0.3 && p.st > 0;
  p.sprinting = sprintHeld;
  // el aguante: nadar deprisa lo gasta; bajo el agua no vuelve
  p.stDelay -= dt;
  if (sprintHeld) {
    p.st -= 13 * dt;
    p.stDelay = 0.5;
  } else if (p.stDelay <= 0 && !S.sub) p.st = Math.min(p.maxSt, p.st + 32 * dt * (p.tonico ? p.tonico.st : 1));
  if (p.tonico) {
    p.tonico.t -= dt;
    if (p.tonico.t <= 0) p.tonico = null;
  }
  const spdK = (sprintHeld ? SPRINT : 1) * (g.dev ? g.dev.speed : 1) * (p.tonico ? p.tonico.vel : 1);
  let tvx, tvz, tvy;
  if (!S.sub) {
    // en la superficie: a braza, sin hundirse
    const sp = SUP * spdK * mag;
    tvx = wx * sp;
    tvz = wz * sp;
    tvy = (sup - FLOTA - P.y) * 5;
    // (zambullirse: con «esquivar», o mirando muy abajo y nadando de frente)
    if (dive || (allowControl && cam.pitch > 0.95 && mv.y > 0.6)) {
      S.sub = true;
      S.vy = -2.4;
      N.chapoteo(P.x, sup, P.z, 0.5, 'zambullida');
    }
  } else {
    // bajo el agua: hacia donde mira la cámara (mirando abajo, se baja)
    const sp = BAJO * spdK * mag;
    const pitch = clamp((cam.pitch - 0.28) * 1.6, -1.25, 1.25);
    const fwd = Math.max(0, mv.y);
    const ch = Math.cos(pitch * fwd);
    tvx = wx * sp * (mag > 0.01 ? lerp(1, ch, fwd / Math.max(mag, 1e-3)) : 1);
    tvz = wz * sp * (mag > 0.01 ? lerp(1, ch, fwd / Math.max(mag, 1e-3)) : 1);
    tvy = -Math.sin(pitch) * BAJO * spdK * fwd;
    if (down) tvy -= 2.0 * spdK;
    if (up) tvy += 2.0 * spdK;
    // (sin nadar, el agua le sube)
    if (!down && !up && fwd < 0.1) tvy += 1.0;
  }
  const k = mag > 0.05 ? 3.2 : 2.2;
  p.vx = damp(p.vx, tvx, k, dt);
  p.vz = damp(p.vz, tvz, k, dt);
  S.vy = damp(S.vy, tvy, S.sub ? 2.6 : 6, dt);
  // (y la brazada empuja a golpes)
  const push = S.sub || mag > 0.1 ? 0.75 + 0.5 * Math.max(0, Math.sin((S.fase - 0.62) * Math.PI * 2)) : 1;
  const r = swimBody(g.world.col, p.body, p.vx * dt * push, S.vy * dt, p.vz * dt * push, BASE, H);
  // (contra la roca, nadando: se resbala por ella hacia donde quepa, arriba
  // o abajo, como quien se ayuda con las manos: un escalón del fondo o del
  // techo de la cueva no le para)
  if (r.hit && mag > 0.3) {
    const col = g.world.col;
    const ax = P.x + wx * 0.7,
      az = P.z + wz * 0.7;
    const fa = col.groundHeight(ax, az, 0.3, P.y + BASE + H);
    const ca = col.ceilHeight(ax, az, 0.3, Math.max(fa, P.y + BASE - 1.5) + 0.05);
    if (ca - fa > H + 0.12) {
      const want = clamp(P.y + BASE, fa + 0.06, ca - H - 0.06) - BASE;
      if (Math.abs(want - P.y) > 0.02) S.vy = clamp((want - P.y) * 5, -2.2, 2.2);
    } else if (!down) S.vy = Math.max(S.vy, 0.9);
  }
  // la superficie: de ahí no se pasa
  if (sup !== null && P.y > sup - FLOTA + 0.04) {
    P.y = sup - FLOTA + 0.04;
    if (S.sub && S.vy > 0) {
      // (sale a respirar)
      S.sub = false;
      if (N.aliento < 18) g.audio && g.audio.play('boqueada', p.pos, { gain: N.aliento < 6 ? 0.8 : 0.5 });
      N.chapoteo(P.x, sup, P.z, 0.45);
    }
    S.vy = Math.min(S.vy, 0);
  }
  if (S.sub && sup !== null && P.y > sup - FLOTA - 0.02 && !down && tvy > 0.2) S.sub = false;
  // hacia dónde mira: hacia donde nada
  const hs = Math.hypot(p.vx, p.vz);
  if (mag > 0.1) p.yaw = dampAngle(p.yaw, Math.atan2(wx, wz), 5, dt);
  else if (hs > 0.4) p.yaw = dampAngle(p.yaw, Math.atan2(p.vx, p.vz), 3, dt);
  S.sp = Math.hypot(hs, S.vy);
  // salir: donde hace pie (andando) o agarrándose a un borde a ras del agua
  if (sup !== null) {
    const ground = r.suelo;
    if (sup - ground < HONDO_SALE && P.y + BASE < ground + 0.5) return salir(p, ground);
    if (!S.sub && mag > 0.3) {
      const ax = P.x + wx * 0.75,
        az = P.z + wz * 0.75;
      const gy = g.world.col.groundHeight(ax, az, 0.2, sup + 0.8);
      const head = g.world.col.ceilHeight(ax, az, 0.2, gy + 0.05);
      if (gy > sup - 0.45 && gy < sup + 0.75 && head - gy > 1.9) {
        S.salir += dt;
        if (S.salir > 0.25) {
          g.audio && g.audio.play('splash', p.pos, { gain: 0.4 });
          p.body.pos.x = ax;
          p.body.pos.z = az;
          salir(p, gy);
          p.playInteract('interact', p.yaw, 0.45);
          return;
        }
      } else S.salir = 0;
    } else S.salir = 0;
  }
  // brazadas en la superficie: su chapoteo
  if (!S.sub && mag > 0.2) {
    S.braz -= dt;
    if (S.braz <= 0) {
      S.braz = 0.85 / spdK;
      N.chapoteo(P.x + Math.sin(p.yaw) * 0.6, sup, P.z + Math.cos(p.yaw) * 0.6, 0.3);
    }
  }
  p.exert = damp(p.exert, sprintHeld ? 1 : 0.3, 0.8, dt);
  // la cámara, nadando en la superficie, no se mete bajo el agua (y buceando,
  // no se sale de ella si cabe dentro)
  p.camFloor = !S.sub && sup !== null ? sup + 0.25 : null;
}
// (de la superficie al suelo, para ponerse de pie)
const HONDO_SALE = 1.2;

// ------------------------------------------------------------------ la brazada
const TAU = Math.PI * 2;
// las manos (en el espacio del pecho: x, a la izquierda; y, hacia la
// cabeza; z, hacia el vientre) a lo largo de una brazada: deslizarse con los
// brazos delante, abrirlos, tirar hacia el pecho, juntar las manos y volver
// a echarlas delante
const MANOS = [
  [0.0, [0.1, 1.0, 0.24]],
  [0.14, [0.14, 1.0, 0.24]],
  [0.3, [0.46, 0.92, 0.28]],
  [0.44, [0.36, 0.64, 0.4]],
  [0.54, [0.09, 0.56, 0.34]],
  [0.68, [0.08, 0.86, 0.26]],
  [0.8, [0.1, 1.0, 0.24]],
  [1.0, [0.1, 1.0, 0.24]],
];
// las piernas (muslo, rodilla, empeine; x, abrir) en la patada de rana:
// estiradas, encoger, abrir y dar la patada, juntarlas
const PIERNAS = [
  [0.0, [0.04, 0.08, 0.5, 0.05]],
  [0.46, [0.0, 0.1, 0.5, 0.05]],
  [0.6, [-0.85, 1.75, -0.2, 0.42]],
  [0.7, [0.05, 0.35, -0.1, 0.5]],
  [0.82, [0.06, 0.06, 0.45, 0.06]],
  [1.0, [0.04, 0.08, 0.5, 0.05]],
];
function sample(K, u) {
  u = ((u % 1) + 1) % 1;
  let i = 0;
  while (i < K.length - 2 && K[i + 1][0] <= u) i++;
  const [t0, a] = K[i],
    [t1, b] = K[i + 1];
  const t = smoothstep(0, 1, (u - t0) / Math.max(1e-4, t1 - t0));
  return a.map((v, k) => v + (b[k] - v) * t);
}

// La pose a nado (en lugar de la locomoción: Player.animate).
export function nadoAnimate(p, dt) {
  const g = p.game;
  const S = p.nadoS;
  const t = g.time;
  // el ritmo de la brazada: deprisa si nada deprisa; despacio si flota
  const sp = S ? S.sp : 0;
  const mov = smoothstep(0.15, 0.9, sp);
  S.w = damp(S.w, mov, 4, dt);
  const w = S.w;
  S.fase += dt * lerp(0.45, 0.62 + sp * 0.18, w) * (p.sprinting ? 1.3 : 1);
  const u = S.fase;
  // la inclinación del cuerpo: en la superficie, casi tumbado y con la
  // cabeza fuera; bajo el agua, hacia donde va (cabeza abajo, al bajar)
  const vh = Math.hypot(p.vx, p.vz);
  let want;
  if (!S.sub) want = lerp(0.32, 1.3, w);
  else {
    const ang = Math.atan2(-S.vy, Math.max(0.3, vh));
    want = lerp(0.95, Math.PI / 2 + clamp(ang, -1.2, 1.25), w);
  }
  S.pitch = damp(S.pitch, want, 4, dt);
  const pose = {};
  const ondula = Math.sin(u * TAU) * 0.08 * w;
  pose.hips = [S.pitch + ondula, 0, Math.sin(u * TAU * 0.5) * 0.04 * (1 - w)];
  pose.chest = [-ondula * 1.4 + (S.sub ? 0 : -0.12 * w), 0, 0];
  // (la cabeza: fuera del agua, mirando adelante; bajo ella, menos)
  pose.head = [S.sub ? -0.4 * w : -0.95 * w - 0.1, 0, 0];
  // los brazos: braza o, flotando, el remo de las manos a los lados
  const bz = sample(MANOS, u);
  const ph = u * TAU;
  const remo = [0.44, 0.18 + Math.sin(ph) * 0.06, 0.3 + Math.cos(ph) * 0.14];
  for (const [s, sg] of [
    ['L', 1],
    ['R', -1],
  ]) {
    pose['ik' + s] = [sg * lerp(remo[0], bz[0], w), lerp(remo[1], bz[1], w), lerp(remo[2], bz[2], w)];
    pose['elbow' + s] = [sg * 0.7, -0.15, -0.55];
    solveArm(pose, p.rig, s);
    pose['hand' + s] = [0.2, sg * -0.3, 0];
  }
  // las piernas: la patada de rana o, flotando, pedalear
  const pk = sample(PIERNAS, u + 0.0);
  for (const [s, sg, off] of [
    ['L', 1, 0],
    ['R', -1, Math.PI],
  ]) {
    const pd = Math.sin(ph * 1.6 + off);
    const muslo = lerp(-0.55 + pd * 0.35, pk[0], w),
      rodilla = lerp(0.95 + Math.sin(ph * 1.6 + off + 1.2) * 0.45, pk[1], w),
      empeine = lerp(0.3, pk[2], w),
      abre = lerp(0.14, pk[3], w);
    pose['leg' + s] = [muslo, 0, sg * abre];
    pose['shin' + s] = [rodilla, 0, 0];
    pose['foot' + s] = [empeine, 0, 0];
  }
  // la capa, que flota detrás; el farol
  pose.cloak = [0.06 + Math.sin(t * 1.7 + u * TAU) * 0.08, 0, Math.sin(t * 1.3) * 0.1];
  pose.lantern = [Math.sin(t * 2.1) * 0.15, 0, Math.sin(t * 1.4) * 0.1];
  p.rig.apply(pose);
  p.visY = p.body.pos.y;
  p.obj.position.set(p.body.pos.x, p.visY, p.body.pos.z);
  p.obj.rotation.y = p.yaw;
  p.phase = u * TAU;
  // (el farol, cerrado: bajo el agua alumbra menos)
  p.lamp.intensity = p.lampBase * p.lampK * (S.sub ? 0.45 : 0.85) * (0.9 + 0.07 * Math.sin(t * 11) + 0.05 * Math.sin(t * 23.7));
}
