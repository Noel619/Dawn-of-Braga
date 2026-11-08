// Repertorio de golpes del hacha, la lanza y la ballesta.
// Convenciones (las mismas que la espada): claves [t, pose, curva, {k}] con
// ángulos en grados y 'root'/'ik*' en cm; ikR = muñeca derecha en el espacio
// del pecho (+x izquierda, +y arriba, +z delante), bladeR = [yaw, pitch, roll]
// de la hoja.
//
// Estructura de un corte: anticipación ('hold': llega frenando) -> impacto
// (clave con tensión k > 1: se cruza a la velocidad máxima siguiendo el arco)
// -> final del tajo ('settle': frena desde la velocidad del impacto) -> recuperación. La velocidad dibuja una campana
// que arranca desde parado, culmina en el impacto y frena sin tirones.
// Las estocadas se definen en el espacio del personaje (W2C): van rectas y
// niveladas aunque el torso se incline o gire, con curva 'strike'.
// Retrasos escalonados (lag): el cuerpo inicia y el arma llega la última.
// El giro de la muñeca en cada impacto se calcula para que corte el filo.
import * as THREE from 'three';
import { clip as rigClip, e2q, sampleClip, makeTrack, evalTrack } from './rig.js';
import { bladeDir } from './locomotion.js';
import { AXE } from './weapon_models.js';
import { attack, STANCE, LUNGE, SHIELD_UP, SHIELD_GUARD } from './weapon_common.js';
import { resolveArmsFn } from './weapon_common.js';
import { DEG } from '../core/util.js';

// Todos los clips de estas armas usan tangentes monótonas (sin rebotes).
// Un polo de codo ausente en una clave valdría [0,0,0] (el codo saltaría a
// un polo de emergencia): se rellena con el polo por defecto de la IK.
const POLE = { elbowR: [-0.55, -0.75, -0.4], elbowL: [0.55, -0.75, -0.4] };
function fillPoles(keys) {
  for (const j in POLE) {
    if (!keys.some((k) => k[1][j])) continue;
    const ik = 'ik' + j.slice(5);
    for (const k of keys) if (!k[1][j] && k[1][ik]) k[1] = { ...k[1], [j]: POLE[j] };
  }
  return keys;
}
const clip = (name, dur, keys, opts = {}) => rigClip(name, dur, fillPoles(keys), { mono: true, ...opts });

// Retrasos por familia de arma (s).
const LAG_MED = { chest: 0.008, head: 0.018, ikR: 0.016, elbowR: 0.016, bladeR: 0.026 };
const LAG_HEAVY = { chest: 0.014, head: 0.026, ikR: 0.026, elbowR: 0.026, bladeR: 0.04, wSlide: 0.026 };
const LAG_THRUST = { head: 0.02 };
const HIT = { k: 1.6 };

// Brazo derecho y torso solamente (el escudo sigue en alto).
const RIGHT_ARM = new Set(['chest', 'head', 'armR', 'foreR', 'handR', 'ikR', 'bladeR', 'elbowR']);

// ---------------------------------------------------------------- utilidades
const _v = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();

// Muñeca y dirección dadas en el espacio del personaje (cm; yaw 0 = al
// frente, pitch + arriba) -> canales ikR/bladeR del pecho para esa pose.
function W2C(rig, body, wrist, blade) {
  const qh = e2q((body.hips || [0, 0, 0]).map((v) => v * DEG), _q1);
  const qc = e2q((body.chest || [0, 0, 0]).map((v) => v * DEG), _q2);
  const root = body.root || [0, 0, 0];
  const hp = rig.rest.hips.pos.clone().add(_v.set(root[0] / 100, root[1] / 100, root[2] / 100));
  const cp = rig.rest.chest.pos.clone().applyQuaternion(qh).add(hp);
  const inv = qh.clone().multiply(qc).invert();
  const w = new THREE.Vector3(wrist[0] / 100, wrist[1] / 100, wrist[2] / 100).sub(cp).applyQuaternion(inv);
  const cp2 = Math.cos(blade[1] * DEG);
  const d = new THREE.Vector3(Math.sin(blade[0] * DEG) * cp2, Math.sin(blade[1] * DEG), Math.cos(blade[0] * DEG) * cp2).applyQuaternion(inv);
  return { ...body, ikR: [w.x * 100, w.y * 100, w.z * 100], bladeR: [Math.atan2(d.x, d.z) / DEG, Math.asin(Math.max(-1, Math.min(1, d.y))) / DEG, blade[2] || 0] };
}

// Filo por delante: mide, en cada clave de impacto, el ángulo entre el filo y
// la dirección en que avanza la punta (alrededor del eje de la hoja) y gira la
// muñeca en esa clave y en sus vecinas (anticipación y final del tajo).
const _tip = new THREE.Vector3();
const _tipA = new THREE.Vector3();
const _tipB = new THREE.Vector3();
function bladeState(rig, W, c, t, resolve, back = false) {
  const p = sampleClip(c, Math.max(0, Math.min(c.dur, t)), {});
  resolve(p);
  rig.apply(p);
  rig.root.updateMatrixWorld(true);
  const sj = rig.joints.sword;
  const q = sj.getWorldQuaternion(new THREE.Quaternion());
  return {
    tip: new THREE.Vector3().fromArray(W.tip).applyMatrix4(sj.matrixWorld),
    axis: new THREE.Vector3(0, 0, 1).applyQuaternion(q),
    edge: new THREE.Vector3().fromArray(W.edge).multiplyScalar(back ? -1 : 1).applyQuaternion(q),
  };
}
function edgeClip(ctx, name, dur, keys, opts = {}) {
  const { rig, W } = ctx;
  let c = clip(name, dur, keys, opts);
  if (!Array.isArray(W.edge)) return { c, keys };
  const resolve = resolveArmsFn(rig, W);
  const out = keys.map((k) => [k[0], { ...k[1], bladeR: k[1].bladeR ? k[1].bladeR.slice() : undefined }, k[2], k[3]]);
  const lag = (opts.lag && opts.lag.bladeR) || 0;
  // primero el codo: la muñeca neutra ya lleva el filo casi por delante
  for (let i = 1; i < keys.length - 1; i++) if (keys[i][3] && keys[i][3].k >= 1.5 && keys[i][1].bladeR) elbowFit(ctx, c, out, i, opts);
  c = clip(name, dur, out, opts);
  for (let i = 1; i < keys.length - 1; i++) {
    const ko = keys[i][3];
    if (!(ko && ko.k >= 1.5) || !keys[i][1].bladeR) continue;
    // media circular del desfase filo/avance, ponderada por la velocidad², en
    // todo el tajo (de la anticipación al final)
    let sx = 0,
      sy = 0;
    const t0 = keys[i - 1][0],
      t1 = keys[i + 1][0] + lag;
    for (let t = t0; t <= t1; t += 0.005) {
      const s0 = bladeState(rig, W, c, t, resolve, opts.edge === 'back');
      _tipA.copy(bladeState(rig, W, c, t - 0.004, resolve).tip);
      _tipB.copy(bladeState(rig, W, c, t + 0.004, resolve).tip);
      const vel = _tip.subVectors(_tipB, _tipA);
      const w = vel.lengthSq();
      const A = s0.axis;
      vel.addScaledVector(A, -vel.dot(A));
      const E = s0.edge.addScaledVector(A, -s0.edge.dot(A));
      if (vel.lengthSq() < 1e-10 || E.lengthSq() < 1e-10) continue;
      vel.normalize();
      E.normalize();
      const a = Math.atan2(new THREE.Vector3().crossVectors(E, vel).dot(A), E.dot(vel));
      sx += w * Math.cos(a);
      sy += w * Math.sin(a);
    }
    if (sx * sx + sy * sy < 1e-12) continue;
    let roll = (keys[i][1].bladeR[2] || 0) + Math.atan2(sy, sx) / DEG;
    // la vuelta completa más corta: desde la pose anterior al tajo y de vuelta
    // a la siguiente (sin giros de más de media vuelta de la muñeca)
    const prev = i >= 2 && out[i - 2] && out[i - 2][1].bladeR ? out[i - 2][1].bladeR[2] || 0 : 0;
    const next = out[i + 2] && out[i + 2][1].bladeR ? out[i + 2][1].bladeR[2] || 0 : prev;
    let bestR = roll,
      bestC = Infinity;
    for (let n = -3; n <= 3; n++) {
      const r = roll + 360 * n;
      const cost = Math.abs(r - prev) + Math.abs(next - r);
      if (cost < bestC) (bestC = cost), (bestR = r);
    }
    roll = bestR;
    // (tras la voltereta la primera clave ya es la anticipación)
    const j0 = opts.windup0 ? 0 : 1;
    for (const j of [i - 1, i, i + 1]) if (j >= j0 && j < keys.length - 1 && out[j][1].bladeR && !(out[j][3] && out[j][3].lock)) out[j][1].bladeR[2] = roll;
  }
  c = clip(name, dur, out, opts);
  c.edgeSide = opts.edge === 'back' ? -1 : 1;
  if (!W.noTrack) rollTrack(ctx, c, out, opts, lag);
  return { c, keys: out };
}

// Codo natural: en cada clave del tajo (anticipación, impacto y final) se
// elige, entre los codos posibles para esa muñeca (el círculo de la IK), el
// que deja el filo por delante con la muñeca neutra: con giro 0 el filo sigue
// la línea del antebrazo. La trayectoria de la hoja no cambia; sólo el brazo.
const _fe = new THREE.Vector3();
const _fz = new THREE.Vector3();
const _fq = new THREE.Quaternion();
function elbowFit(ctx, c, out, i, opts) {
  const { rig, W } = ctx;
  const resolve = resolveArmsFn(rig, W);
  const back = opts.edge === 'back';
  const lagArm = (opts.lag && opts.lag.ikR) || 0;
  const S = rig.rest.armR.pos;
  const L1 = rig.rest.foreR.pos.length(),
    L2 = rig.rest.handR.pos.length();
  const tW = out[i - 1][0],
    tH = out[i][0],
    tS = out[i + 1][0];
  const probes = [
    [i - 1, tW + 0.35 * (tH - tW)],
    [i, tH],
    [i + 1, tS - 0.35 * (tS - tH)],
  ];
  for (const [j, tp] of probes) {
    if (j < (opts.windup0 ? 0 : 1) || j >= out.length - 1) continue;
    const k = out[j][1];
    if (!k.ikR || !k.bladeR || !k.elbowR || (out[j][3] && out[j][3].lock)) continue;
    // hacia dónde avanza la hoja (espacio del pecho)
    const t = tp + lagArm;
    _tipA.copy(bladeState(rig, W, c, t - 0.004, resolve).tip);
    _tipB.copy(bladeState(rig, W, c, t + 0.004, resolve).tip);
    bladeState(rig, W, c, t, resolve);
    rig.joints.chest.getWorldQuaternion(_fq).invert();
    const e = _fe.subVectors(_tipB, _tipA).applyQuaternion(_fq);
    const Z = bladeDir([k.bladeR[0] * DEG, k.bladeR[1] * DEG], _fz);
    e.addScaledVector(Z, -e.dot(Z));
    if (e.lengthSq() < 1e-8) continue;
    e.normalize();
    if (back) e.negate();
    // círculo de codos posibles
    const Wc = new THREE.Vector3(k.ikR[0] / 100, k.ikR[1] / 100, k.ikR[2] / 100);
    const toT = Wc.clone().sub(S);
    const d = Math.min(Math.max(toT.length(), 0.05), (L1 + L2) * 0.999);
    toT.normalize();
    const A = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
    const p0 = new THREE.Vector3(...k.elbowR);
    p0.addScaledVector(toT, -p0.dot(toT));
    if (p0.lengthSq() < 1e-6) continue;
    p0.normalize();
    const v0 = new THREE.Vector3().crossVectors(toT, p0);
    let best = -9,
      bp = null;
    for (let f = -80; f <= 80; f += 2) {
      const a = f * DEG;
      const p = p0.clone().multiplyScalar(Math.cos(a)).addScaledVector(v0, Math.sin(a));
      const E = S.clone().addScaledVector(toT, L1 * Math.cos(A)).addScaledVector(p, L1 * Math.sin(A));
      const fa = Wc.clone().sub(E).normalize();
      fa.addScaledVector(Z, -fa.dot(Z));
      if (fa.lengthSq() < 1e-8) continue;
      fa.normalize();
      // preferir el codo dibujado; castigar el codo cruzado sobre el pecho
      // o muy por encima del hombro
      let sc = fa.dot(e) - 0.2 * (Math.abs(f) / 90);
      if (E.x > 0.04) sc -= (E.x - 0.04) * 6;
      if (E.y > S.y + 0.2) sc -= (E.y - S.y - 0.2) * 3;
      if (sc > best) (best = sc), (bp = p);
    }
    if (bp) k.elbowR = [+bp.x.toFixed(3), +bp.y.toFixed(3), +bp.z.toFixed(3)];
  }
}

// Giro continuo de la muñeca durante cada tajo: el arco real de la hoja no
// es plano, así que el ángulo que lleva el filo por delante cambia a lo largo
// del golpe. Se mide en todo el tramo rápido (ponderado por la velocidad²),
// se suaviza y se añade como pista aditiva al roll de la hoja. Arranca en 0,
// se completa durante la anticipación, se mantiene al final del tajo y
// vuelve a 0 en la recuperación. (El codo ya se eligió para que la muñeca
// quede natural, y el giro se mide respecto a la propia hoja: modo 'euler'.)
function rollTrack(ctx, c, keys, opts, lag) {
  const { rig, W } = ctx;
  const resolve = resolveArmsFn(rig, W);
  const back = opts.edge === 'back';
  const hits = [];
  for (let i = 1; i < keys.length - 1; i++) if (keys[i][3] && keys[i][3].k >= 1.5 && keys[i][1].bladeR) hits.push(i);
  if (!hits.length) return;
  const catchUp = (t) => Math.min(1, Math.max(0, (c.dur - t) / 0.25));
  const A = new THREE.Vector3(),
    E = new THREE.Vector3(),
    V = new THREE.Vector3(),
    X = new THREE.Vector3();
  for (let it = 0; it < 3; it++) {
    const cur = c.tracks ? c.tracks[0] : null;
    const pts = [[hits[0] >= 2 ? keys[hits[0] - 2][0] : 0, 0]];
    for (const i of hits) {
      const ta = keys[i - 1][0],
        tb = keys[i + 1][0];
      // muestras: [instante de la hoja, ángulo objetivo (°), peso]
      const S = [];
      let wmax = 0;
      for (let t = ta; t <= tb + lag + 1e-6; t += 1 / 240) {
        const s0 = bladeState(rig, W, c, t, resolve, back);
        A.copy(s0.axis);
        E.copy(s0.edge);
        _tipA.copy(bladeState(rig, W, c, t - 0.002, resolve).tip);
        _tipB.copy(bladeState(rig, W, c, t + 0.002, resolve).tip);
        V.subVectors(_tipB, _tipA).divideScalar(0.004);
        V.addScaledVector(A, -V.dot(A));
        E.addScaledVector(A, -E.dot(A));
        const w = V.lengthSq();
        if (w < 1e-6 || E.lengthSq() < 1e-10) continue;
        V.normalize();
        E.normalize();
        const a = Math.atan2(X.crossVectors(E, V).dot(A), E.dot(V)) / DEG;
        const tau = Math.max(0, t - lag * catchUp(t));
        S.push([tau, (cur ? evalTrack(cur, tau) / DEG : 0) + a, w]);
        wmax = Math.max(wmax, w);
      }
      if (!S.length) continue;
      // media circular suavizada en puntos de control cada 15 ms
      const ctrl = [];
      for (let tc = ta; tc <= tb + 1e-6; tc += 0.015) {
        let sx = 0,
          sy = 0,
          sw = 0;
        for (const [tau, a, w] of S) {
          const k = Math.exp(-((tau - tc) ** 2) / (2 * 0.012 * 0.012)) * w;
          sx += k * Math.cos(a * DEG);
          sy += k * Math.sin(a * DEG);
          sw += k;
        }
        ctrl.push([tc, Math.atan2(sy, sx) / DEG, sw]);
      }
      const smax = Math.max(...ctrl.map((x) => x[2]));
      // sólo donde la hoja va deprisa; en los extremos se mantiene el valor
      const ok = ctrl.filter((x) => x[2] > 0.2 * smax);
      if (!ok.length) continue;
      // continuidad (sin saltos de 360°)
      let prev = ok[0][1];
      prev -= 360 * Math.round(prev / 360);
      for (const x of ok) {
        let v = x[1];
        v -= 360 * Math.round((v - prev) / 360);
        prev = v;
        x[1] = v;
      }
      pts.push([ta, ok[0][1]]);
      for (const x of ok) if (x[0] > ta + 1e-6 && x[0] < tb - 1e-6) pts.push([x[0], x[1]]);
      pts.push([tb, ok[ok.length - 1][1]]);
    }
    const last = hits[hits.length - 1];
    pts.push([keys[last + 2] ? keys[last + 2][0] : c.dur, 0]);
    // puntos ordenados y sin repetir instante
    pts.sort((a, b) => a[0] - b[0]);
    const P = [];
    for (const p of pts) if (!P.length || p[0] > P[P.length - 1][0] + 1e-4) P.push(p);
    c.tracks = [makeTrack('bladeR', 2, P.map(([t, v]) => [t, v * DEG]), lag)];
  }
}

// Pose (en unidades de clave) de un clip en el instante t: el siguiente golpe
// del combo empieza exactamente donde estaba el anterior al encadenarse.
function poseAt(c, t) {
  const p = sampleClip(c, t, {});
  const o = {};
  // (clip() guarda también los polos del codo multiplicados por DEG)
  for (const j in p) o[j] = p[j].map((v) => (j === 'root' || j.startsWith('ik') ? v * 100 : j[0] === 'w' ? v : v / DEG));
  return o;
}

// Ventanas de golpe a partir del perfil de velocidad real de la punta: los n
// tramos más rápidos (por encima del 50 % de su pico), un poco ampliados.
function hitWindows(ctx, c, n = 1, thrust = false) {
  const { rig, W } = ctx;
  const resolve = resolveArmsFn(rig, W);
  const dt = 1 / 120;
  const sp = [];
  let prev = null;
  for (let t = 0; t <= c.dur + 1e-6; t += dt) {
    const st = bladeState(rig, W, c, t, resolve);
    const tip = st.tip.clone();
    // en las estocadas cuenta sólo el avance hacia la punta (no el recogerse)
    if (!prev) sp.push(0);
    else if (thrust) sp.push(Math.max(0, _v.subVectors(tip, prev).dot(st.axis)) / dt);
    else sp.push(tip.distanceTo(prev) / dt);
    prev = tip;
  }
  const wins = [];
  const used = new Array(sp.length).fill(false);
  for (let k = 0; k < n; k++) {
    let pk = -1,
      pi = -1;
    for (let i = 0; i < sp.length; i++) if (!used[i] && sp[i] > pk) (pk = sp[i]), (pi = i);
    if (pi < 0) break;
    let i0 = pi,
      i1 = pi;
    while (i0 > 0 && sp[i0 - 1] > pk * 0.5) i0--;
    while (i1 < sp.length - 1 && sp[i1 + 1] > pk * 0.5) i1++;
    for (let i = Math.max(0, i0 - 12); i <= Math.min(sp.length - 1, i1 + 12); i++) used[i] = true;
    wins.push([Math.max(0, i0 * dt - 0.02), Math.min(c.dur, i1 * dt + 0.03)]);
  }
  return wins.sort((a, b) => a[0] - b[0]);
}


// ================================================================ HACHA
// A dos manos, pie izquierdo delante; golpes lentos que arrastran el cuerpo,
// con el peso de la cabeza: anticipación larga, caída brutal, recuperación
// trabajosa. La izquierda desliza por el mango en los barridos (wSlide).
const AST = { legL: [-20, 0, 9], shinL: [26, 0, 0], legR: [20, 0, -9], shinR: [24, 0, 0], root: [0, -10, 0] };
// Las manos en el mango del hacha clavada (espacio del personaje, cm): la
// muñeca derecha, cerca de la cabeza, y el mango, que sube hacia la madera
// por delante y a la derecha (rumbo, cabeceo y giro, en grados: el giro
// pone la hoja de cara a la madera). La escena de la Bestia coloca al
// jugador para que la hoja quede dentro de la estaca (beast_chase.js).
export const AXE_TUG = { wrist: [-34, 108, 32], blade: [-12, 26, 30] };
const ALUNGE = { legL: [-44, 0, 8], shinL: [46, 0, 0], legR: [30, 0, -8], shinR: [14, 0, 0], root: [0, -20, 10] };
const ACHOP = { legL: [-50, 0, 8], shinL: [52, 0, 0], legR: [34, 0, -8], shinR: [16, 0, 0], root: [0, -30, 14] };

// El mango del hacha, de la mano derecha al cabo (AXE.butt, por detrás de
// ella): si en una clave cruza el tronco (en el espacio del pecho, una caja
// algo holgada que baja hasta la cadera), la muñeca se adelanta lo justo
// para que el cabo quede por delante. Así ningún golpe se hace pegado al
// cuerpo con el mango metido en el pecho.
const TRONCO = { x: 0.25, y0: -0.42, y1: 0.6, z: 0.17 };
function clearHaft(pose) {
  if (!pose.ikR || !pose.bladeR) return pose;
  const yw = pose.bladeR[0] * DEG,
    pt = pose.bladeR[1] * DEG;
  const dx = Math.sin(yw) * Math.cos(pt),
    dy = Math.sin(pt),
    dz = Math.cos(yw) * Math.cos(pt);
  const wx = pose.ikR[0] / 100,
    wy = pose.ikR[1] / 100;
  let wz = pose.ikR[2] / 100,
    push = 0;
  for (let i = 0; i <= 10; i++) {
    const u = (i / 10) * AXE.butt;
    const x = wx + dx * u,
      y = wy + dy * u,
      z = wz + dz * u;
    if (Math.abs(x) < TRONCO.x && y > TRONCO.y0 && y < TRONCO.y1 && z < TRONCO.z && z > -TRONCO.z) push = Math.max(push, TRONCO.z - z);
  }
  if (!push) return pose;
  return { ...pose, ikR: [pose.ikR[0], pose.ikR[1], (wz + push) * 100] };
}
const axeKeys = (keys) => keys.map((k) => [k[0], clearHaft(k[1]), ...k.slice(2)]);

function axeMoves(ctx) {
  const { G, rig } = ctx;
  const g = { ...G };
  const CAN = [0.66, 0.7, 1.06];
  // Las claves, en el espacio del personaje (W2C): la muñeca derecha en cm
  // desde los pies (+x izquierda, +z delante) y el mango con su rumbo y su
  // cabeceo de verdad, aunque el torso se incline (en el del pecho, al
  // rematar inclinado, el hacha quedaba vertical y se clavaba en el suelo).
  // Golpes con los brazos extendidos y las manos en el cabo: la cabeza lejos
  // y el mango, por delante del cuerpo (clearHaft lo vigila).
  const A = (body, wrist, blade, extra = {}) => clearHaft({ ...body, ...W2C(rig, body, wrist, blade), elbowR: [-0.55, -0.7, -0.35], ...extra });
  // tajo al hombro: de encima del hombro derecho, en diagonal, abajo a la izquierda
  const l1 = edgeClip(
    ctx,
    'a_light1',
    1.0,
    axeKeys([
      [0, { ...AST, chest: [4, -8, 0], ...g }],
      [0.28, A({ ...AST, root: [0, -8, -4], hips: [0, -10, 0], chest: [-6, -40, 0], head: [0, 22, 0] }, [-30, 150, 8], [-150, 50], { elbowR: [-0.7, 0.1, -0.7] }), 'hold'],
      [0.4, A({ ...ALUNGE, hips: [0, 4, 0], chest: [16, 0, 0], head: [-6, 0, 0] }, [-4, 118, 64], [8, -4]), 'smooth', HIT],
      [0.52, A({ ...ALUNGE, root: [0, -22, 11], hips: [0, 16, 0], chest: [30, 40, 0], head: [-12, -22, 0] }, [26, 82, 54], [70, -46], { elbowR: [-0.4, -0.8, -0.3] }), 'settle'],
      [0.74, A({ ...AST, hips: [0, 6, 0], chest: [12, 16, 0], head: [-4, -8, 0] }, [4, 110, 52], [10, 32])],
      [1.0, { ...g }],
    ]),
    { lag: LAG_HEAVY, events: [{ t: 0.32, name: 'swing' }] }
  );
  // barrido: de la cadera izquierda, en horizontal, hacia la derecha
  const l2 = edgeClip(
    ctx,
    'a_light2',
    1.02,
    axeKeys([
      [0, poseAt(l1.c, CAN[0])],
      [0.3, A({ ...AST, root: [0, -12, -2], hips: [0, 14, 0], chest: [10, 45, 0], head: [0, -24, 0] }, [44, 102, 20], [110, 10], { elbowR: [0.2, -0.6, -0.8], wSlide: [0.6, 0, 0] }), 'hold'],
      [0.42, A({ ...ALUNGE, hips: [0, 0, 0], chest: [14, 4, 0], head: [-4, 0, 0] }, [6, 108, 62], [20, 2], { wSlide: [0.8, 0, 0] }), 'smooth', HIT],
      [0.54, A({ ...AST, hips: [0, -14, 0], chest: [12, -48, 0], head: [-4, 22, 0] }, [-46, 104, 34], [-110, 4], { elbowR: [-0.8, -0.4, -0.3], wSlide: [0.9, 0, 0] }), 'settle'],
      [0.8, A({ ...AST, chest: [6, -20, 0], head: [0, 8, 0] }, [-16, 112, 48], [-30, 34])],
      [1.02, { ...g }],
    ]),
    { lag: LAG_HEAVY, events: [{ t: 0.34, name: 'swing' }] }
  );
  // hachazo vertical: remate por encima de la cabeza; la hoja muerde el suelo
  // por delante, a la distancia del mango
  const l3 = edgeClip(
    ctx,
    'a_light3',
    1.15,
    axeKeys([
      [0, poseAt(l2.c, CAN[1])],
      [0.36, A({ ...AST, root: [0, -4, -4], chest: [-18, -6, 0], head: [-10, 6, 0] }, [-8, 178, 10], [-4, 125], { elbowR: [-0.7, 0.2, -0.6], wSlide: [0.6, 0, 0] }), 'hold'],
      [0.46, A({ ...ALUNGE, root: [0, -14, 6], chest: [14, -2, 0], head: [-8, 0, 0] }, [-6, 132, 64], [-4, 36], { elbowR: [-0.6, -0.5, -0.3] }), 'smooth', HIT],
      [0.56, A({ ...ACHOP, root: [0, -24, 13], chest: [36, 0, 0], head: [-20, 0, 0] }, [-6, 78, 66], [-2, -34], { elbowR: [-0.5, -0.8, 0] }), 'settle'],
      [0.84, A({ ...AST, chest: [14, 0, 0], head: [-6, 0, 0] }, [-8, 106, 52], [-12, 26])],
      [1.15, { ...AST, chest: [4, -8, 0], ...g }],
    ]),
    { lag: LAG_HEAVY, events: [{ t: 0.4, name: 'swing' }, { t: 0.56, name: 'impact' }] }
  );
  // hachazo del verdugo: se alza, se carga y cae partiendo el suelo
  const h1 = edgeClip(
    ctx,
    'a_heavy',
    1.6,
    axeKeys([
      [0, { ...g }],
      [0.3, A({ ...AST, root: [0, 2, -6], chest: [-24, -4, 0], head: [-14, 4, 0] }, [-8, 176, 6], [-4, 128], { elbowR: [-0.7, 0.2, -0.6], wSlide: [0.65, 0, 0] })],
      [0.5, A({ legL: [-24, 0, 10], shinL: [18, 0, 0], legR: [22, 0, -10], shinR: [10, 0, 0], root: [0, 5, -8], chest: [-30, -2, 0], head: [-18, 2, 0] }, [-6, 182, 0], [0, 138], { elbowR: [-0.7, 0.2, -0.6], wSlide: [0.55, 0, 0] }), 'hold'],
      [0.6, A({ ...ALUNGE, root: [0, -16, 8], chest: [16, -1, 0], head: [-10, 0, 0] }, [-5, 134, 66], [-2, 34], { elbowR: [-0.6, -0.5, -0.3] }), 'smooth', HIT],
      [0.7, A({ ...ACHOP, root: [0, -30, 14], chest: [42, 0, 0], head: [-22, 0, 0] }, [-4, 72, 68], [0, -38], { elbowR: [-0.5, -0.8, 0] }), 'settle'],
      [1.0, A({ ...ACHOP, root: [0, -26, 12], chest: [36, 0, 0], head: [-16, 0, 0] }, [-4, 74, 66], [0, -36], { elbowR: [-0.5, -0.8, 0] })],
      [1.25, A({ ...AST, chest: [16, 0, 0], head: [-6, 0, 0] }, [-8, 106, 52], [-12, 28])],
      [1.6, { ...g }],
    ]),
    { lag: LAG_HEAVY, events: [{ t: 0.53, name: 'swing' }, { t: 0.7, name: 'impact' }] }
  );
  // salto con hachazo
  const run = edgeClip(
    ctx,
    'a_run',
    1.1,
    axeKeys([
      [0, A({ ...AST, chest: [8, -10, 0] }, [-12, 132, 46], [-40, 58], { elbowR: [-0.6, -0.4, -0.5] })],
      [0.22, A({ legL: [-60, 0, 8], shinL: [80, 0, 0], legR: [10, 0, -8], shinR: [60, 0, 0], root: [0, 14, 6], chest: [-18, -10, 0], head: [-10, 6, 0] }, [-8, 186, 10], [-6, 126], { elbowR: [-0.7, 0.2, -0.6], wSlide: [0.6, 0, 0] }), 'hold'],
      [0.32, A({ ...ALUNGE, root: [0, -12, 10], chest: [16, -2, 0], head: [-8, 0, 0] }, [-5, 132, 66], [-2, 34], { elbowR: [-0.6, -0.5, -0.3] }), 'smooth', HIT],
      [0.42, A({ ...ACHOP, root: [0, -28, 16], chest: [40, 0, 0], head: [-20, 0, 0] }, [-4, 74, 68], [0, -38], { elbowR: [-0.5, -0.8, 0] }), 'settle'],
      [0.8, A({ ...AST, chest: [14, 0, 0], head: [-6, 0, 0] }, [-8, 106, 52], [-12, 26])],
      [1.1, { ...g }],
    ]),
    { lag: LAG_HEAVY, events: [{ t: 0.26, name: 'swing' }, { t: 0.42, name: 'impact' }] }
  );
  // hachazo ascendente al salir de la voltereta
  const rl = edgeClip(
    ctx,
    'a_roll',
    0.9,
    axeKeys([
      [0, A({ root: [0, -26, 0], legL: [-50, 0, 8], shinL: [80, 0, 0], legR: [16, 0, -8], shinR: [60, 0, 0], chest: [28, -30, 0], head: [-12, 14, 0] }, [-34, 62, 38], [-120, -34], { elbowR: [-0.8, -0.5, -0.2], wSlide: [0.7, 0, 0] })],
      [0.12, A({ ...ALUNGE, root: [0, -16, 6], chest: [14, 2, 0], head: [-6, 0, 0] }, [-6, 112, 62], [-8, 22], { elbowR: [-0.5, -0.6, -0.4] }), 'smooth', HIT],
      [0.24, A({ ...AST, chest: [-6, 44, 0], head: [2, -18, 0] }, [24, 168, 36], [80, 64], { elbowR: [-0.2, -0.5, -0.7] }), 'settle'],
      [0.9, { ...g }],
    ]),
    { windup0: true, lag: LAG_HEAVY, events: [{ t: 0.06, name: 'swing' }] }
  );
  // ---- la escena de la Bestia de Carne (game/beast_chase.js): el hacha,
  // clavada hasta el ojo en una estaca de la barricada del Postigo.
  // Forcejear: las dos manos en el mango, el pie adelantado y el cuerpo
  // echado atrás, a tirones (las manos quietas en el espacio del personaje:
  // el cuerpo tira y la hoja no se mueve de la madera). En bucle.
  const TUG = { wrist: AXE_TUG.wrist, blade: AXE_TUG.blade };
  const tugBody = (lean, back, dip) => ({ legL: [-34, 0, 9], shinL: [24, 0, 0], legR: [30, 0, -9], shinR: [30, 0, 0], root: [0, -16 - dip, -2 - back], hips: [0, -4, 0], chest: [-2 - lean, -6, 0], head: [12 - lean * 0.4, -14, 0] });
  const tug = (lean, back, dip) => ({ ...tugBody(lean, back, dip), ...W2C(rig, tugBody(lean, back, dip), TUG.wrist, TUG.blade), elbowR: [-0.5, -0.8, -0.2] });
  const tg = clip(
    'a_tug',
    0.62,
    [
      [0, tug(0, 0, 0)],
      [0.2, tug(6, 3, 3), 'hold'],
      [0.31, tug(9, 5, 4)],
      [0.62, tug(0, 0, 0)],
    ],
    { loop: true, lag: { head: 0.03 } }
  );
  // Arrancarla: el tirón que la saca (la hoja sale de la madera con las
  // astillas), el cuerpo que se va atrás de un paso, y el hacha que sube por
  // encima de la cabeza, en alto, antes de bajar a la guardia.
  const yk = clip(
    'a_yank',
    1.45,
    [
      [0, tug(9, 5, 4)],
      [0.12, { legL: [-20, 0, 9], shinL: [18, 0, 0], legR: [40, 0, -9], shinR: [36, 0, 0], ...W2C(rig, { root: [0, -10, -22], hips: [0, -6, 0], chest: [-22, -8, 0] }, [-34, 130, 32], [-24, 60, AXE_TUG.blade[2]]), root: [0, -10, -22], hips: [0, -6, 0], chest: [-22, -8, 0], head: [-8, -8, 0], elbowR: [-0.6, -0.6, -0.4] }, 'snap'],
      [0.5, { ...AST, root: [0, 4, -6], chest: [-26, -4, 0], head: [-18, 4, 0], ikR: [-8, 92, -6], bladeR: [-4, 160, 0], elbowR: [-0.7, 0.2, -0.6], wSlide: [0.65, 0, 0] }, 'hold'],
      [0.82, { ...AST, root: [0, -6, 0], chest: [-12, -4, 0], head: [-10, 2, 0], ikR: [-8, 84, 0], bladeR: [-6, 150, 0], elbowR: [-0.7, 0.2, -0.6], wSlide: [0.7, 0, 0] }],
      [1.15, { ...AST, chest: [10, 8, 0], head: [-4, -4, 0], ikR: [-6, 38, 38], bladeR: [-24, 56, 0], elbowR: [-0.6, -0.6, -0.4] }],
      [1.45, { ...g }],
    ],
    { lag: LAG_HEAVY }
  );
  const C = { a_light1: l1.c, a_light2: l2.c, a_light3: l3.c, a_heavy: h1.c, a_run: run.c, a_roll: rl.c, a_tug: tg, a_yank: yk };
  const K = { snd: 'swingAxe', hitSnd: 'hitAxe' };
  const H = (c, n, th) => hitWindows(ctx, c, n, th);
  const light = [
    attack({ ...K, clip: C.a_light1, dmg: 34, st: 22, hits: H(C.a_light1), cancel: CAN[0], move: 0.74, lunge: [0.26, 0.46, 2.6], range: 2.85, arc: 110, poise: 46, dir: -1 }),
    attack({ ...K, clip: C.a_light2, dmg: 36, st: 24, hits: H(C.a_light2), cancel: CAN[1], move: 0.78, lunge: [0.3, 0.48, 2.2], range: 2.9, arc: 170, poise: 50, dir: 1 }),
    attack({ ...K, clip: C.a_light3, dmg: 42, st: 28, hits: H(C.a_light3), cancel: CAN[2], move: 1.06, lunge: [0.38, 0.56, 2.8], range: 2.9, arc: 70, poise: 60, dir: 0 }),
  ];
  const heavy = [attack({ ...K, clip: C.a_heavy, dmg: 72, st: 36, hits: H(C.a_heavy), cancel: 1.2, move: 1.28, lunge: [0.5, 0.68, 2.6], range: 3.0, arc: 60, poise: 110, heavy: true, dir: 0, charge: { at: 0.5, max: 1.0, dmg: 0.6 }, impact: { r: 1.9, dmg: 0.35 } })];
  const runA = attack({ ...K, clip: C.a_run, dmg: 44, st: 30, hits: H(C.a_run), cancel: 0.84, move: 0.9, lunge: [0.0, 0.34, 5.4], range: 2.9, arc: 70, poise: 70, dir: 0, impact: { r: 1.6, dmg: 0.25 } });
  const roll = attack({ ...K, clip: C.a_roll, dmg: 30, st: 18, hits: H(C.a_roll), cancel: 0.6, move: 0.66, lunge: [0.0, 0.2, 2.6], range: 2.8, arc: 120, poise: 40, dir: 1 });
  return { clips: C, light, heavy, run: runA, roll };
}

// ================================================================ LANZA
// Con escudo: agarre bajo junto a la cadera, estocadas rápidas, largas y
// rectas, y un barrido; su seña: se clava sin bajar el escudo.
function spearMoves(ctx) {
  const { G, rig } = ctx;
  const g = { ...G };
  const chamber = { ...STANCE, root: [0, -6, -3], chest: [2, -18, 0], head: [0, 8, 0] };
  const reach = { ...LUNGE, chest: [16, 14, 0], head: [-8, -6, 0] };
  const e1 = { ...W2C(rig, reach, [-10, 106, 70], [11, 3, 0]), elbowR: [-0.3, -0.9, 0.1] };
  const high = { ...LUNGE, chest: [14, 16, 0], head: [-6, -6, 0] };
  const e2 = { ...W2C(rig, high, [-8, 130, 66], [10, -3, 0]), elbowR: [-0.4, 0.1, -0.2] };
  const C = {
    s_light1: clip(
      's_light1',
      0.5,
      [
        [0, { ...STANCE, chest: [4, -8, 0], ...g }],
        [0.08, { ...W2C(rig, chamber, [-26, 99, 4], [6, 5, 0]), elbowR: [-0.4, -0.4, -0.9] }, 'hold'],
        [0.19, { ...W2C(rig, reach, [-10, 108, 72], [11, 4, 0]), elbowR: [-0.3, -0.9, 0.1] }, 'strike'],
        [0.28, e1],
        [0.5, { ...g }],
      ],
      { lag: LAG_THRUST, events: [{ t: 0.09, name: 'swing' }] }
    ),
    s_light2: clip(
      's_light2',
      0.52,
      [
        [0, e1],
        [0.1, { ...W2C(rig, { ...STANCE, chest: [0, -22, 0], head: [0, 10, 0] }, [-28, 132, -2], [4, 2, 0]), elbowR: [-0.6, 0.2, -0.8] }, 'hold'],
        [0.2, { ...W2C(rig, high, [-8, 132, 68], [10, -2, 0]), elbowR: [-0.4, 0.1, -0.2] }, 'strike'],
        [0.3, e2],
        [0.52, { ...g }],
      ],
      { lag: LAG_THRUST, events: [{ t: 0.11, name: 'swing' }] }
    ),
    s_light3: clip(
      's_light3',
      0.7,
      [
        [0, e2],
        [0.16, { ...STANCE, chest: [6, -44, 0], head: [0, 20, 0], ikR: [-40, 16, 18], bladeR: [-70, 4, 0], elbowR: [-0.7, -0.5, -0.3] }, 'hold'],
        [0.25, { ...STANCE, root: [0, -9, 3], chest: [10, -2, 0], head: [-2, 0, 0], ikR: [-12, 16, 44], bladeR: [0, 0, 0], elbowR: [-0.5, -0.7, -0.3] }, 'smooth', HIT],
        [0.35, { ...STANCE, root: [0, -8, 3], chest: [10, 50, 0], head: [-2, -20, 0], ikR: [22, 12, 30], bladeR: [96, -6, 0], elbowR: [-0.3, -0.8, -0.4] }, 'settle'],
        [0.7, { ...STANCE, chest: [4, -8, 0], ...g }],
      ],
      { lag: LAG_MED, events: [{ t: 0.2, name: 'swing' }] }
    ),
    s_heavy: clip(
      's_heavy',
      0.95,
      [
        [0, { ...g }],
        [0.3, { ...W2C(rig, { legL: [18, 0, 8], shinL: [24, 0, 0], legR: [-10, 0, -8], shinR: [30, 0, 0], root: [0, -12, -10], chest: [0, -40, 0], head: [0, 20, 0] }, [-36, 100, -18], [6, 4, 0]), elbowR: [-0.4, -0.3, -0.9] }, 'hold'],
        [0.43, { ...W2C(rig, { legL: [44, 0, 6], shinL: [6, 0, 0], legR: [-66, 0, -4], shinR: [60, 0, 0], root: [0, -30, 22], chest: [30, 22, 0], head: [-18, -10, 0] }, [-6, 102, 92], [14, 2, 0]), elbowR: [-0.3, -0.9, 0.1] }, 'strike'],
        [0.6, { ...W2C(rig, { legL: [44, 0, 6], shinL: [6, 0, 0], legR: [-66, 0, -4], shinR: [60, 0, 0], root: [0, -29, 21], chest: [28, 20, 0], head: [-16, -10, 0] }, [-6, 101, 88], [14, 1, 0]), elbowR: [-0.3, -0.9, 0.1] }],
        [0.95, { ...g }],
      ],
      { lag: LAG_THRUST, events: [{ t: 0.33, name: 'swing' }] }
    ),
    // estocada tras el escudo: sólo el brazo derecho; el escudo sigue arriba
    s_guard: clip(
      's_guard',
      0.46,
      [
        [0, { ikR: [-26, 4, 14], bladeR: [0, 4, 0], chest: [8, -14, 0], head: [6, 10, 0] }],
        // (el torso casi quieto y la muñeca avanzando a lo largo del asta: recta)
        [0.08, { ikR: [-24, 9, 4.5], bladeR: [8, 4, 0], chest: [8, -12, 0], head: [6, 10, 0], elbowR: [-0.5, -0.3, -0.9] }, 'hold'],
        [0.17, { ikR: [-18, 12, 46], bladeR: [8, 4, 0], chest: [9, -10, 0], head: [4, 8, 0], elbowR: [-0.4, -0.8, 0] }, 'strike'],
        [0.27, { ikR: [-18.3, 11.8, 44], bladeR: [8, 4, 0], chest: [9, -10, 0], head: [4, 8, 0], elbowR: [-0.4, -0.8, 0] }],
        [0.46, { ikR: [-26, 4, 14], bladeR: [0, 4, 0], chest: [8, -14, 0], head: [6, 10, 0] }],
      ],
      { mask: RIGHT_ARM, lag: LAG_THRUST, events: [{ t: 0.09, name: 'swing' }] }
    ),
    s_run: clip(
      's_run',
      0.8,
      [
        [0, { ...W2C(rig, { ...STANCE, chest: [10, -10, 0] }, [-26, 102, 10], [6, 2, 0]), elbowR: [-0.4, -0.4, -0.9] }],
        [0.1, { ...W2C(rig, { ...STANCE, chest: [6, -24, 0], head: [0, 10, 0] }, [-30, 100, -2], [6, 3, 0]), elbowR: [-0.4, -0.3, -0.9] }, 'hold'],
        [0.26, { ...W2C(rig, { legL: [44, 0, 6], shinL: [6, 0, 0], legR: [-66, 0, -4], shinR: [60, 0, 0], root: [0, -28, 20], chest: [28, 18, 0], head: [-16, -8, 0] }, [-6, 102, 90], [14, 2, 0]), elbowR: [-0.3, -0.9, 0.1] }, 'strike'],
        [0.44, { ...W2C(rig, { legL: [44, 0, 6], shinL: [6, 0, 0], legR: [-66, 0, -4], shinR: [60, 0, 0], root: [0, -27, 19], chest: [26, 16, 0], head: [-14, -8, 0] }, [-6, 101, 86], [14, 1, 0]), elbowR: [-0.3, -0.9, 0.1] }],
        [0.8, { ...g }],
      ],
      { lag: LAG_THRUST, events: [{ t: 0.14, name: 'swing' }] }
    ),
    s_roll: clip(
      's_roll',
      0.56,
      [
        [0, { ...W2C(rig, { root: [0, -24, 0], legL: [-50, 0, 8], shinL: [90, 0, 0], legR: [10, 0, -8], shinR: [70, 0, 0], chest: [26, -20, 0], head: [-10, 10, 0] }, [-28, 78, 8], [6, 2, 0]), elbowR: [-0.4, -0.4, -0.9] }],
        [0.16, { ...W2C(rig, { ...LUNGE, root: [0, -20, 12], chest: [22, 12, 0], head: [-10, -6, 0] }, [-8, 98, 74], [12, 4, 0]), elbowR: [-0.3, -0.9, 0.1] }, 'strike'],
        [0.28, { ...W2C(rig, { ...LUNGE, root: [0, -19, 11], chest: [20, 10, 0], head: [-8, -6, 0] }, [-8, 98, 71], [12, 3, 0]), elbowR: [-0.3, -0.9, 0.1] }],
        [0.56, { ...g }],
      ],
      { lag: LAG_THRUST, events: [{ t: 0.05, name: 'swing' }] }
    ),
  };
  const T = { snd: 'thrust', thrust: true, arc: 34 };
  const H = (c, n, th) => hitWindows(ctx, c, n, th);
  const light = [
    attack({ ...T, clip: C.s_light1, dmg: 19, st: 11, hits: H(C.s_light1, 1, true), cancel: 0.28, move: 0.34, lunge: [0.06, 0.18, 2.6], range: 3.1, poise: 16 }),
    attack({ ...T, clip: C.s_light2, dmg: 19, st: 11, hits: H(C.s_light2, 1, true), cancel: 0.3, move: 0.36, lunge: [0.08, 0.2, 2.6], range: 3.1, poise: 16 }),
    attack({ clip: C.s_light3, snd: 'swing', dmg: 22, st: 14, hits: H(C.s_light3), cancel: 0.64, move: 0.64, lunge: [0.14, 0.3, 2.0], range: 2.9, arc: 140, poise: 22, dir: -1 }),
  ];
  const heavy = [attack({ ...T, clip: C.s_heavy, dmg: 44, st: 26, hits: H(C.s_heavy, 1, true), cancel: 0.62, move: 0.7, lunge: [0.32, 0.48, 5.0], range: 3.5, arc: 30, poise: 56, heavy: true })];
  const guard = attack({ ...T, clip: C.s_guard, dmg: 16, st: 13, hits: H(C.s_guard, 1, true), cancel: 0.28, move: 0.3, lunge: [0.08, 0.16, 1.2], range: 3.0, arc: 30, poise: 12, keepBlock: true });
  const run = attack({ ...T, clip: C.s_run, dmg: 30, st: 18, hits: H(C.s_run, 1, true), cancel: 0.46, move: 0.52, lunge: [0.0, 0.34, 6.4], range: 3.3, arc: 32, poise: 36 });
  const roll = attack({ ...T, clip: C.s_roll, dmg: 20, st: 12, hits: H(C.s_roll, 1, true), cancel: 0.3, move: 0.36, lunge: [0.0, 0.16, 3.0], range: 3.0, poise: 18 });
  return { clips: C, light, heavy, run, roll, guard };
}

// ================================================================ BALLESTA
// La ballesta de estribo, a dos manos: se lleva a la cadera, apuntando al
// suelo; se alza a la cara para tirar (el virote sale en «shoot»); tras el
// tiro se monta sola: la cabeza al suelo, el pie en el estribo, las dos manos
// tiran de la cuerda hasta la nuez y se pone otro virote (casi dos segundos,
// quieto). El pesado, un culatazo con la cabeza de hierro por delante.
const XST = { legL: [12, 0, 6], shinL: [16, 0, 0], legR: [-18, 0, -6], shinR: [20, 0, 0], root: [0, -4, 0] };
function ballestaMoves(ctx) {
  const { G, rig } = ctx;
  const g = { ...XST, ...G };
  // a la cara: la culata al hombro, la cureña a nivel, la cabeza por detrás
  const aimBody = { ...XST, chest: [2, 10, 0], head: [4, -12, 0] };
  const aim = { ...W2C(rig, aimBody, [-9, 146, 20], [0, 0, 0]), elbowR: [-0.8, -0.3, -0.5] };
  const kick = { ...W2C(rig, { ...aimBody, chest: [-4, 10, 0] }, [-9, 149, 14], [0, 7, 0]), elbowR: [-0.8, -0.3, -0.5] };
  // montarla: agachado, la cabeza en el suelo con el pie dentro del estribo,
  // las manos en la cuerda (la izquierda suelta la cureña)
  const down = { legL: [-46, 0, 8], shinL: [70, 0, 0], legR: [-8, 0, -10], shinR: [24, 0, 0], root: [0, -26, 4], chest: [40, 0, 0], head: [10, 0, 0] };
  const low = { ...W2C(rig, down, [-6, 80, 34], [0, -78, 0]), elbowR: [-0.5, -0.8, -0.2], wGrip: [0, 0, 0] };
  const pull = { ...W2C(rig, { ...down, root: [0, -14, 2], chest: [26, 0, 0] }, [-6, 92, 30], [0, -82, 0]), elbowR: [-0.5, -0.8, -0.2], wGrip: [0, 0, 0] };
  const C = {
    x_shoot: clip(
      'x_shoot',
      0.62,
      [
        [0, { ...g }],
        [0.16, aim, 'hold'],
        [0.22, kick, 'snap'],
        [0.36, aim],
        [0.62, { ...g }],
      ],
      { lag: LAG_THRUST }
    ),
    x_reload: clip(
      'x_reload',
      1.75,
      [
        [0, { ...g }],
        [0.32, { ...low, ikL: [10, -12, 26] }],
        [0.6, { ...low, ikL: [2, -16, 30] }, 'hold'],
        [1.05, { ...pull, ikL: [2, -2, 24] }],
        [1.3, { ...pull, ikL: [-2, 8, 22], root: [0, -10, 0] }],
        [1.5, { ...g, ikL: [-4, 10, 30], wGrip: [0, 0, 0] }],
        [1.75, { ...g }],
      ],
      { lag: LAG_MED, events: [{ t: 0.55, name: 'step' }] }
    ),
    x_bash: clip(
      'x_bash',
      0.82,
      [
        [0, { ...g }],
        [0.18, { ...W2C(rig, { ...XST, chest: [0, -26, 0], head: [0, 12, 0] }, [-22, 104, 4], [10, 2, 0]), elbowR: [-0.5, -0.4, -0.8] }, 'hold'],
        [0.32, { ...W2C(rig, { ...LUNGE, chest: [16, 12, 0], head: [-6, -6, 0] }, [-8, 112, 58], [4, 2, 0]), elbowR: [-0.4, -0.9, 0.1] }, 'strike'],
        [0.46, { ...W2C(rig, { ...LUNGE, chest: [14, 10, 0], head: [-6, -6, 0] }, [-8, 111, 54], [4, 1, 0]), elbowR: [-0.4, -0.9, 0.1] }],
        [0.82, { ...g }],
      ],
      { lag: LAG_THRUST, events: [{ t: 0.2, name: 'swing' }] }
    ),
  };
  const shoot = attack({ name: 'shoot', clip: C.x_shoot, shoot: 0.22, hits: [[0.22, 0.23]], dmg: 48, poise: 34, st: 6, cancel: 0.42, move: 0.44, lunge: [0, 0, 0], range: 32, arc: 8 });
  const reload = attack({ name: 'reload', clip: C.x_reload, reload: true, hits: [[9, 9]], dmg: 0, st: 0, cancel: 9, move: 9, lunge: [0, 0, 0] });
  const bash = attack({ clip: C.x_bash, snd: 'swing', thrust: true, dmg: 24, st: 16, hits: [[0.3, 0.42]], cancel: 0.6, move: 0.66, lunge: [0.18, 0.34, 3.2], range: 1.9, arc: 60, poise: 38, heavy: true });
  return { clips: C, light: [shoot], heavy: [bash], run: bash, roll: bash, reload };
}

// ================================================================ registro
export const MOVESETS = {
  ballesta: {
    id: 'ballesta',
    item: 'ballesta',
    order: 6,
    wristMode: 'euler',
    hands: 2,
    ranged: true,
    // (la izquierda, por delante de la derecha, bajo la cureña)
    grip2: 0.26,
    freeL: [0.24, 0.1, 0.14],
    elbowL: [0.6, -0.7, -0.3],
    trail: [
      [0, -0.05, 0.3],
      [0, -0.05, 0.52],
    ],
    trailColor: 0xffd8a8,
    tip: [0, -0.05, 0.52],
    edge: [0, 1, 0],
    guard: { ikR: [-18, -16, 22], bladeR: [2, -10, 0], elbowR: [-0.6, -0.6, -0.5] },
    runPose: { ikR: [-24, -10, 12], bladeR: [-6, -30, 0], elbowR: [-0.7, -0.5, -0.5] },
    swing: [4, 12],
    block: { ikR: [-10, 22, 26], bladeR: [-80, 6, 0], elbowR: [-0.4, -0.8, -0.2], chest: [4, -6, 0], head: [8, 4, 0] },
    blockK: { st: 1.3, chip: 0.2 },
    healR: { ikR: [-26, -6, 14], bladeR: [-10, -60, 0] },
    moves: ballestaMoves,
  },
  hacha: {
    id: 'hacha',
    item: 'hacha',
    order: 2,
    wristMode: 'euler',
    hands: 2,
    // (las dos manos abajo, cerca del cabo: la izquierda casi en él)
    grip2: AXE.grip2,
    // el mango no gira durante el golpe (las dos manos lo sujetan y la cabeza
    // está lejos del eje): sólo el giro fijo de cada tajo
    noTrack: false,
    freeL: [0.24, 0.1, 0.14],
    elbowL: [0.6, -0.7, -0.3],
    trail: [
      [0, -0.09, AXE.eye + 0.01],
      [0, -0.3, AXE.eye - 0.02],
    ],
    trailColor: 0xffd8a8,
    tip: [0, -0.3, AXE.eye - 0.02],
    edge: [0, -1, 0],
    // (el cabo, por delante de la tripa; al correr, al hombro, con el mango
    // por encima de la hombrera y la cabeza detrás, lejos de la cabeza)
    guard: { ikR: [-6, 34, 40], bladeR: [-30, 50, 0], elbowR: [-0.6, -0.6, -0.4] },
    runPose: { ikR: [-22, 56, 14], bladeR: [-172, 40, 0], elbowR: [-0.8, -0.2, -0.4] },
    swing: [4, 10],
    block: { ikR: [-8, 44, 32], bladeR: [-94, 8, 0], elbowR: [-0.4, -0.8, -0.2], chest: [4, -6, 0], head: [8, 4, 0] },
    blockK: { st: 1.25, chip: 0.16 },
    // (al beber, apoyada a un lado, con la cabeza abajo, como un bastón; al
    // volver a la guardia, sube por fuera, a la derecha: healUp)
    healR: { ikR: [-36, -6, 18], bladeR: [0, -84, 0] },
    healUp: { ikR: [-40, 22, 30], bladeR: [-30, 80, 0] },
    moves: axeMoves,
  },
  lanza: {
    id: 'lanza',
    item: 'lanza',
    order: 3,
    wristMode: 'euler',
    hands: 1,
    trail: [
      [0, -0.05, 1.42],
      [0, -0.05, 1.76],
    ],
    trailColor: 0xffe2b0,
    tip: [0, -0.05, 1.76],
    edge: 'double',
    guard: { ikR: [-24, -2, 20], bladeR: [2, 8, 0], elbowR: [-0.4, -0.5, -0.8], ikL: SHIELD_GUARD },
    runPose: { ikR: [-28, 0, 4], bladeR: [0, -6, 0], elbowR: [-0.5, -0.6, -0.6] },
    swing: [6, 20],
    block: { ikR: [-26, 4, 14], bladeR: [0, 4, 0], elbowR: [-0.4, -0.5, -0.8], ...SHIELD_UP },
    healR: { ikR: [-26, 6, 18], bladeR: [-6, -20, 0] },
    moves: spearMoves,
  },
};
