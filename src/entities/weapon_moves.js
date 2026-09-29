// Repertorio de golpes del facón, el hacha, la lanza y la katana sagrada.
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
import { solveArm, bladeDir } from './locomotion.js';
import { SAYA } from './weapon_models.js';
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
const LAG_FAST = { chest: 0.006, head: 0.016, ikR: 0.012, elbowR: 0.012, bladeR: 0.02 };
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


// ================================================================ FACÓN
// Esgrima criolla: agazapado, el pie derecho delante, cortes cortos y rápidos
// que se encadenan en cuatro, y la puñalada que remata.
const FST = { legL: [18, 0, 7], shinL: [28, 0, 0], legR: [-30, 0, -6], shinR: [36, 0, 0], root: [0, -11, 0] };
const FLUNGE = { legL: [34, 0, 6], shinL: [14, 0, 0], legR: [-54, 0, -5], shinR: [50, 0, 0], root: [0, -22, 12] };
const FDEEP = { legL: [42, 0, 6], shinL: [8, 0, 0], legR: [-66, 0, -4], shinR: [62, 0, 0], root: [0, -30, 20] };

function faconMoves(ctx) {
  const { G, rig } = ctx;
  const g = { ...G };
  // desde cuándo se encadena cada golpe ligero (y el pesado)
  const CAN = [0.25, 0.25, 0.28, 0.56];
  const CANH = 0.62;
  // tajo: diagonal desde la oreja derecha hasta la cadera izquierda
  const l1 = edgeClip(
    ctx,
    'f_light1',
    0.46,
    [
      [0, { ...FST, chest: [6, -8, 0], ...g }],
      [0.08, { ...FST, chest: [10, -40, 0], head: [0, 16, 0], ikR: [-40, 46, 8], bladeR: [-128, 50, 0], elbowR: [-0.8, -0.1, -0.6], ikL: [20, 24, 26] }, 'hold'],
      [0.15, { ...FST, root: [0, -13, 5], chest: [14, 18, 0], head: [-2, -8, 0], ikR: [-2, 20, 46], bladeR: [20, -6, 0], elbowR: [-0.5, -0.7, -0.3], ikL: [24, 20, 20] }, 'smooth', HIT],
      [0.24, { ...FST, root: [0, -12, 4], chest: [14, 42, 0], head: [-2, -20, 0], ikR: [22, -4, 32], bladeR: [100, -44, 0], elbowR: [-0.3, -0.8, -0.4], ikL: [26, 18, 14] }, 'settle'],
      [0.46, { ...g, chest: [3, 6, 0] }],
    ],
    { lag: LAG_FAST, events: [{ t: 0.1, name: 'swing' }] }
  );
  // revés: de la cadera izquierda sube cruzando hasta arriba a la derecha
  const l2 = edgeClip(
    ctx,
    'f_light2',
    0.46,
    [
      [0, poseAt(l1.c, CAN[0])],
      [0.07, { ...FST, chest: [12, 46, 0], head: [0, -18, 0], ikR: [24, -8, 26], bladeR: [128, -24, 0], elbowR: [0.1, -0.6, -0.8], ikL: [26, 20, 14] }, 'hold'],
      [0.14, { ...FST, root: [0, -12, 5], chest: [8, 0, 0], head: [0, 0, 0], ikR: [-10, 24, 48], bladeR: [-6, 16, 0], elbowR: [-0.5, -0.6, -0.4], ikL: [22, 22, 20] }, 'smooth', HIT],
      [0.24, { ...FST, root: [0, -11, 4], chest: [4, -42, 0], head: [0, 18, 0], ikR: [-42, 52, 24], bladeR: [-104, 46, 0], elbowR: [-0.8, -0.3, -0.4], ikL: [18, 24, 26] }, 'settle'],
      [0.46, { ...g, chest: [3, -6, 0] }],
    ],
    { lag: LAG_FAST, edge: 'back', events: [{ t: 0.09, name: 'swing' }] }
  );
  // tajo corrido: horizontal a la altura del pecho, con paso
  const l3 = edgeClip(
    ctx,
    'f_light3',
    0.5,
    [
      [0, poseAt(l2.c, CAN[1])],
      [0.09, { ...FST, chest: [6, -52, 0], head: [0, 20, 0], ikR: [-48, 30, 4], bladeR: [-160, 6, 0], elbowR: [-0.8, -0.3, -0.5], ikL: [20, 24, 26] }, 'hold'],
      [0.17, { ...FLUNGE, chest: [10, -4, 0], head: [-2, 0, 0], ikR: [-18, 30, 52], bladeR: [-4, 4, 0], elbowR: [-0.6, -0.6, -0.3], ikL: [24, 22, 20] }, 'smooth', HIT],
      [0.27, { ...FLUNGE, root: [0, -21, 11], chest: [10, 52, 0], head: [-2, -22, 0], ikR: [28, 22, 30], bladeR: [112, -6, 0], elbowR: [-0.3, -0.8, -0.4], ikL: [26, 20, 14] }, 'settle'],
      [0.5, { ...g, chest: [2, 8, 0] }],
    ],
    { lag: LAG_FAST, events: [{ t: 0.11, name: 'swing' }] }
  );
  // puñalada: se recoge a la cadera y clava a fondo, recta
  const p1 = { ...FST, root: [0, -9, -5], chest: [2, -30, 0], head: [0, 14, 0] };
  const p2 = { ...FDEEP, root: [0, -22, 16], chest: [24, 16, 0], head: [-12, -8, 0] };
  const l4 = {
    c: clip(
      'f_light4',
      0.62,
      [
        [0, poseAt(l3.c, CAN[2])],
        [0.12, { ...W2C(rig, p1, [-28, 94, 2], [6, 4, 0]), elbowR: [-0.5, -0.3, -0.9], ikL: [22, 28, 30] }, 'hold'],
        [0.24, { ...W2C(rig, p2, [-10, 100, 84], [12, 3, 0]), elbowR: [-0.3, -0.9, 0.1], ikL: [24, 20, 12] }, 'strike'],
        [0.36, { ...W2C(rig, { ...p2, root: [0, -21, 15], chest: [22, 14, 0] }, [-10, 100, 80], [12, 2, 0]), elbowR: [-0.3, -0.9, 0.1], ikL: [24, 20, 12] }],
        [0.62, { ...FST, chest: [6, -8, 0], ...g }],
      ],
      { lag: LAG_THRUST, events: [{ t: 0.14, name: 'swing' }] }
    ),
  };
  // molinete: dos tajos en aspa; entre ambos la muñeca gira la hoja por arriba
  const h1 = edgeClip(
    ctx,
    'f_heavy1',
    0.9,
    [
      [0, { ...FST, ...g, chest: [4, -6, 0] }],
      [0.16, { ...FST, root: [0, -12, -3], chest: [6, -48, 0], head: [0, 20, 0], ikR: [-40, 62, 2], bladeR: [-140, 62, 0], elbowR: [-0.8, 0, -0.6], ikL: [20, 24, 26] }, 'hold'],
      [0.23, { ...FST, root: [0, -14, 4], chest: [14, 0, 0], head: [-2, 0, 0], ikR: [-6, 24, 48], bladeR: [16, -8, 0], elbowR: [-0.5, -0.7, -0.3], ikL: [24, 20, 20] }, 'smooth', HIT],
      [0.31, { ...FST, root: [0, -14, 6], chest: [16, 40, 0], head: [-4, -18, 0], ikR: [20, 4, 38], bladeR: [84, -40, 0], elbowR: [-0.4, -0.8, -0.3], ikL: [26, 18, 16] }, 'settle'],
      [0.4, { ...FST, root: [0, -13, 5], chest: [14, 44, 0], head: [-2, -20, 0], ikR: [24, 32, 30], bladeR: [120, 44, 0], elbowR: [0.1, -0.5, -0.8], ikL: [26, 20, 14] }, 'hold'],
      [0.47, { ...FLUNGE, chest: [14, 2, 0], head: [-2, 0, 0], ikR: [-4, 16, 50], bladeR: [-14, -12, 0], elbowR: [-0.5, -0.7, -0.3], ikL: [22, 24, 22] }, 'smooth', HIT],
      [0.56, { ...FLUNGE, root: [0, -21, 11], chest: [14, -42, 0], head: [0, 18, 0], ikR: [-42, -8, 30], bladeR: [-104, -40, 0], elbowR: [-0.6, -0.7, -0.2], ikL: [20, 26, 26] }, 'settle'],
      [0.9, { ...g }],
    ],
    { lag: LAG_FAST, events: [{ t: 0.17, name: 'swing' }, { t: 0.41, name: 'swing' }] }
  );
  // puñalada a fondo: se enrosca y se lanza con todo el cuerpo
  const c1 = { ...FST, root: [0, -16, -8], chest: [0, -36, 0], head: [2, 18, 0] };
  const c2 = { legL: [44, 0, 6], shinL: [6, 0, 0], legR: [-68, 0, -4], shinR: [64, 0, 0], root: [0, -32, 22], chest: [30, 14, 0], head: [-18, -6, 0] };
  const h2 = {
    c: clip(
      'f_heavy2',
      0.85,
      [
        [0, poseAt(h1.c, CANH)],
        [0.24, { ...W2C(rig, c1, [-34, 92, -6], [8, 4, 0]), elbowR: [-0.5, -0.3, -0.9], ikL: [24, 30, 30] }, 'hold'],
        [0.37, { ...W2C(rig, c2, [-8, 96, 94], [12, 2, 0]), elbowR: [-0.3, -0.9, 0.1], ikL: [24, 12, 6] }, 'strike'],
        [0.52, { ...W2C(rig, { ...c2, root: [0, -31, 21], chest: [28, 12, 0] }, [-8, 96, 90], [12, 1, 0]), elbowR: [-0.3, -0.9, 0.1], ikL: [24, 12, 8] }],
        [0.85, { ...g }],
      ],
      { lag: LAG_THRUST, events: [{ t: 0.27, name: 'swing' }] }
    ),
  };
  // estocada corrida: un saltito y clava
  const r0 = { ...FST, root: [0, -6, 0], chest: [16, -10, 0] };
  const r1 = { root: [0, 4, 4], legL: [-40, 0, 6], shinL: [70, 0, 0], legR: [20, 0, -6], shinR: [40, 0, 0], chest: [10, -24, 0], head: [0, 10, 0] };
  const r2 = { ...FDEEP, root: [0, -26, 18], chest: [28, 16, 0], head: [-14, -8, 0] };
  const run = clip(
    'f_run',
    0.7,
    [
      [0, { ...W2C(rig, r0, [-28, 100, 12], [6, 2, 0]), ikL: [22, 26, 30] }],
      [0.1, { ...W2C(rig, r1, [-32, 106, 0], [6, 4, 0]), elbowR: [-0.5, -0.3, -0.9], ikL: [22, 30, 30] }, 'hold'],
      [0.26, { ...W2C(rig, r2, [-8, 100, 90], [10, 2, 0]), elbowR: [-0.3, -0.9, 0.1], ikL: [24, 12, 8] }, 'strike'],
      [0.4, { ...W2C(rig, { ...r2, root: [0, -25, 17], chest: [26, 14, 0] }, [-8, 100, 86], [10, 1, 0]), elbowR: [-0.3, -0.9, 0.1], ikL: [24, 12, 8] }],
      [0.7, { ...g }],
    ],
    { lag: LAG_THRUST, events: [{ t: 0.16, name: 'swing' }] }
  );
  // tajo bajo al salir de la voltereta
  const rl = edgeClip(
    ctx,
    'f_roll',
    0.52,
    [
      [0, { root: [0, -28, 0], legL: [-60, 0, 8], shinL: [100, 0, 0], legR: [10, 0, -8], shinR: [80, 0, 0], chest: [30, -30, 0], head: [-14, 14, 0], ikR: [-40, -10, 20], bladeR: [-120, -20, 0], elbowR: [-0.8, -0.4, -0.3], ikL: [20, 20, 24] }],
      [0.1, { root: [0, -26, 4], legL: [-56, 0, 8], shinL: [92, 0, 0], legR: [14, 0, -8], shinR: [70, 0, 0], chest: [30, 6, 0], head: [-12, -2, 0], ikR: [-10, -22, 44], bladeR: [-10, -26, 0], elbowR: [-0.6, -0.7, -0.3], ikL: [22, 20, 20] }, 'smooth', HIT],
      [0.2, { root: [0, -20, 4], legL: [-40, 0, 8], shinL: [70, 0, 0], legR: [10, 0, -8], shinR: [50, 0, 0], chest: [22, 46, 0], head: [-6, -20, 0], ikR: [24, -26, 30], bladeR: [110, -26, 0], elbowR: [-0.3, -0.8, -0.4], ikL: [24, 18, 16] }, 'settle'],
      [0.52, { ...g }],
    ],
    { windup0: true, lag: LAG_FAST, events: [{ t: 0.05, name: 'swing' }] }
  );
  const C = { f_light1: l1.c, f_light2: l2.c, f_light3: l3.c, f_light4: l4.c, f_heavy1: h1.c, f_heavy2: h2.c, f_run: run, f_roll: rl.c };
  const K = { snd: 'swingKnife', crit: 2.1 };
  const H = (c, n, th) => hitWindows(ctx, c, n, th);
  const light = [
    attack({ ...K, clip: C.f_light1, dmg: 13, st: 8, hits: H(C.f_light1), cancel: CAN[0], move: 0.32, lunge: [0.04, 0.17, 2.4], range: 1.95, arc: 120, poise: 11, dir: -1 }),
    attack({ ...K, clip: C.f_light2, dmg: 13, st: 8, hits: H(C.f_light2), cancel: CAN[1], move: 0.32, lunge: [0.04, 0.16, 2.2], range: 1.95, arc: 120, poise: 11, dir: 1 }),
    attack({ ...K, clip: C.f_light3, dmg: 15, st: 9, hits: H(C.f_light3), cancel: CAN[2], move: 0.35, lunge: [0.06, 0.2, 3.0], range: 2.0, arc: 150, poise: 13, dir: -1 }),
    attack({ ...K, clip: C.f_light4, dmg: 20, st: 12, hits: H(C.f_light4, 1, true), cancel: CAN[3], move: 0.56, lunge: [0.13, 0.26, 3.6], range: 2.25, arc: 40, poise: 20, dir: 0, thrust: true }),
  ];
  const heavy = [
    attack({ ...K, clip: C.f_heavy1, dmg: 22, st: 20, hits: H(C.f_heavy1, 2), cancel: CANH, move: 0.68, lunge: [0.18, 0.46, 2.6], range: 2.0, arc: 130, poise: 26, heavy: true, dir: -1 }),
    attack({ ...K, clip: C.f_heavy2, dmg: 34, st: 22, hits: H(C.f_heavy2, 1, true), cancel: 0.58, move: 0.64, lunge: [0.25, 0.4, 5.2], range: 2.6, arc: 36, poise: 50, heavy: true, dir: 0, thrust: true }),
  ];
  const runA = attack({ ...K, clip: C.f_run, dmg: 24, st: 16, hits: H(C.f_run, 1, true), cancel: 0.44, move: 0.5, lunge: [0.02, 0.3, 6.2], range: 2.4, arc: 40, poise: 30, dir: 0, thrust: true });
  const roll = attack({ ...K, clip: C.f_roll, dmg: 18, st: 10, hits: H(C.f_roll), cancel: 0.3, move: 0.36, lunge: [0.0, 0.14, 2.6], range: 2.0, arc: 140, poise: 14, dir: -1 });
  return { clips: C, light, heavy, run: runA, roll };
}

// ================================================================ HACHA
// A dos manos, pie izquierdo delante; golpes lentos que arrastran el cuerpo,
// con el peso de la cabeza: anticipación larga, caída brutal, recuperación
// trabajosa. La izquierda desliza por el mango en los barridos (wSlide).
const AST = { legL: [-20, 0, 9], shinL: [26, 0, 0], legR: [20, 0, -9], shinR: [24, 0, 0], root: [0, -10, 0] };
const ALUNGE = { legL: [-44, 0, 8], shinL: [46, 0, 0], legR: [30, 0, -8], shinR: [14, 0, 0], root: [0, -20, 10] };
const ACHOP = { legL: [-50, 0, 8], shinL: [52, 0, 0], legR: [34, 0, -8], shinR: [16, 0, 0], root: [0, -30, 14] };

function axeMoves(ctx) {
  const { G } = ctx;
  const g = { ...G };
  const CAN = [0.66, 0.7, 1.06];
  // tajo al hombro: diagonal desde encima del hombro derecho al suelo
  const l1 = edgeClip(
    ctx,
    'a_light1',
    1.0,
    [
      [0, { ...AST, chest: [4, -8, 0], ...g }],
      [0.28, { ...AST, root: [0, -8, -4], hips: [0, -10, 0], chest: [-6, -44, 0], head: [0, 22, 0], ikR: [-22, 60, 4], bladeR: [-150, 50, 0], elbowR: [-0.7, 0.1, -0.7] }, 'hold'],
      [0.4, { ...ALUNGE, hips: [0, 4, 0], chest: [16, 0, 0], head: [-6, 0, 0], ikR: [-6, 30, 50], bladeR: [0, 10, 0], elbowR: [-0.5, -0.7, -0.3] }, 'smooth', HIT],
      [0.52, { ...ALUNGE, root: [0, -22, 11], hips: [0, 16, 0], chest: [30, 44, 0], head: [-12, -22, 0], ikR: [14, -10, 36], bladeR: [70, -62, 0], elbowR: [-0.4, -0.8, -0.3] }, 'settle'],
      [0.74, { ...AST, hips: [0, 6, 0], chest: [12, 20, 0], head: [-4, -8, 0], ikR: [0, 18, 38], bladeR: [10, 10, 0], elbowR: [-0.5, -0.7, -0.4] }],
      [1.0, { ...g }],
    ],
    { lag: LAG_HEAVY, events: [{ t: 0.32, name: 'swing' }] }
  );
  // barrido: de la cadera izquierda, horizontal hacia la derecha
  const l2 = edgeClip(
    ctx,
    'a_light2',
    1.02,
    [
      [0, poseAt(l1.c, CAN[0])],
      [0.3, { ...AST, root: [0, -12, -2], hips: [0, 14, 0], chest: [10, 45, 0], head: [0, -24, 0], ikR: [22, 14, 8], bladeR: [75, 12, 0], elbowR: [0.2, -0.6, -0.8], wSlide: [0.6, 0, 0] }, 'hold'],
      [0.42, { ...ALUNGE, hips: [0, 0, 0], chest: [14, 4, 0], head: [-4, 0, 0], ikR: [-2, 18, 50], bladeR: [22, 4, 0], elbowR: [-0.5, -0.7, -0.3], wSlide: [0.8, 0, 0] }, 'smooth', HIT],
      [0.54, { ...AST, hips: [0, -14, 0], chest: [12, -48, 0], head: [-4, 22, 0], ikR: [-34, 18, 22], bladeR: [-80, 4, 0], elbowR: [-0.8, -0.4, -0.3], wSlide: [0.9, 0, 0] }, 'settle'],
      [0.8, { ...AST, chest: [6, -20, 0], head: [0, 8, 0], ikR: [-16, 28, 32], bladeR: [-40, 30, 0], elbowR: [-0.6, -0.6, -0.4] }],
      [1.02, { ...g }],
    ],
    { lag: LAG_HEAVY, events: [{ t: 0.34, name: 'swing' }] }
  );
  // hachazo vertical: remate por encima de la cabeza
  const l3 = edgeClip(
    ctx,
    'a_light3',
    1.15,
    [
      [0, poseAt(l2.c, CAN[1])],
      [0.36, { ...AST, root: [0, -4, -4], chest: [-18, -6, 0], head: [-10, 6, 0], ikR: [-9, 88, -2], bladeR: [-8, 146, 0], elbowR: [-0.7, 0.2, -0.6], wSlide: [0.6, 0, 0] }, 'hold'],
      [0.46, { ...ALUNGE, root: [0, -14, 6], chest: [14, -2, 0], head: [-8, 0, 0], ikR: [-6, 50, 52], bladeR: [-4, 30, 0], elbowR: [-0.6, -0.5, -0.3] }, 'smooth', HIT],
      [0.56, { ...ACHOP, root: [0, -26, 13], chest: [42, 0, 0], head: [-20, 0, 0], ikR: [-6, -4, 48], bladeR: [-2, -64, 0], elbowR: [-0.5, -0.8, 0] }, 'settle'],
      [0.84, { ...AST, chest: [14, 0, 0], head: [-6, 0, 0], ikR: [-6, 20, 40], bladeR: [-10, 10, 0], elbowR: [-0.5, -0.7, -0.4] }],
      [1.15, { ...AST, chest: [4, -8, 0], ...g }],
    ],
    { lag: LAG_HEAVY, events: [{ t: 0.4, name: 'swing' }, { t: 0.56, name: 'impact' }] }
  );
  // hachazo del verdugo: se alza, se carga y cae partiendo el suelo
  const h1 = edgeClip(
    ctx,
    'a_heavy',
    1.6,
    [
      [0, { ...g }],
      [0.3, { ...AST, root: [0, 2, -6], chest: [-24, -4, 0], head: [-14, 4, 0], ikR: [-8, 90, -4], bladeR: [-4, 156, 0], elbowR: [-0.7, 0.2, -0.6], wSlide: [0.65, 0, 0] }],
      [0.5, { legL: [-24, 0, 10], shinL: [18, 0, 0], legR: [22, 0, -10], shinR: [10, 0, 0], root: [0, 5, -8], chest: [-30, -2, 0], head: [-18, 2, 0], ikR: [-6, 93, -10], bladeR: [0, 168, 0], elbowR: [-0.7, 0.2, -0.6], wSlide: [0.55, 0, 0] }, 'hold'],
      [0.6, { ...ALUNGE, root: [0, -16, 8], chest: [16, -1, 0], head: [-10, 0, 0], ikR: [-5, 52, 54], bladeR: [-2, 28, 0], elbowR: [-0.6, -0.5, -0.3] }, 'smooth', HIT],
      [0.7, { ...ACHOP, root: [0, -32, 14], chest: [48, 0, 0], head: [-22, 0, 0], ikR: [-4, -8, 50], bladeR: [0, -70, 0], elbowR: [-0.5, -0.8, 0] }, 'settle'],
      [1.0, { ...ACHOP, root: [0, -28, 12], chest: [40, 0, 0], head: [-16, 0, 0], ikR: [-4, -2, 46], bladeR: [0, -62, 0], elbowR: [-0.5, -0.8, 0] }],
      [1.25, { ...AST, chest: [16, 0, 0], head: [-6, 0, 0], ikR: [-6, 20, 40], bladeR: [-10, 20, 0], elbowR: [-0.5, -0.7, -0.4] }],
      [1.6, { ...g }],
    ],
    { lag: LAG_HEAVY, events: [{ t: 0.53, name: 'swing' }, { t: 0.7, name: 'impact' }] }
  );
  // salto con hachazo
  const run = edgeClip(
    ctx,
    'a_run',
    1.1,
    [
      [0, { ...AST, chest: [8, -10, 0], ikR: [-10, 40, 28], bladeR: [-40, 60, 0], elbowR: [-0.6, -0.4, -0.5] }],
      [0.22, { legL: [-60, 0, 8], shinL: [80, 0, 0], legR: [10, 0, -8], shinR: [60, 0, 0], root: [0, 14, 6], chest: [-18, -10, 0], head: [-10, 6, 0], ikR: [-8, 89, -2], bladeR: [-6, 150, 0], elbowR: [-0.7, 0.2, -0.6], wSlide: [0.6, 0, 0] }, 'hold'],
      [0.32, { ...ALUNGE, root: [0, -12, 10], chest: [16, -2, 0], head: [-8, 0, 0], ikR: [-5, 50, 54], bladeR: [-2, 28, 0], elbowR: [-0.6, -0.5, -0.3] }, 'smooth', HIT],
      [0.42, { ...ACHOP, root: [0, -30, 16], chest: [46, 0, 0], head: [-20, 0, 0], ikR: [-4, -8, 50], bladeR: [0, -68, 0], elbowR: [-0.5, -0.8, 0] }, 'settle'],
      [0.8, { ...AST, chest: [14, 0, 0], head: [-6, 0, 0], ikR: [-6, 20, 40], bladeR: [-10, 14, 0], elbowR: [-0.5, -0.7, -0.4] }],
      [1.1, { ...g }],
    ],
    { lag: LAG_HEAVY, events: [{ t: 0.26, name: 'swing' }, { t: 0.42, name: 'impact' }] }
  );
  // hachazo ascendente al salir de la voltereta
  const rl = edgeClip(
    ctx,
    'a_roll',
    0.9,
    [
      [0, { root: [0, -26, 0], legL: [-50, 0, 8], shinL: [80, 0, 0], legR: [16, 0, -8], shinR: [60, 0, 0], chest: [28, -30, 0], head: [-12, 14, 0], ikR: [-24, -6, 26], bladeR: [-120, -40, 0], elbowR: [-0.8, -0.5, -0.2], wSlide: [0.7, 0, 0] }],
      [0.12, { ...ALUNGE, root: [0, -16, 6], chest: [14, 2, 0], head: [-6, 0, 0], ikR: [-6, 26, 48], bladeR: [-10, 20, 0], elbowR: [-0.5, -0.6, -0.4] }, 'smooth', HIT],
      [0.24, { ...AST, chest: [-6, 44, 0], head: [2, -18, 0], ikR: [14, 70, 26], bladeR: [90, 70, 0], elbowR: [-0.2, -0.5, -0.7] }, 'settle'],
      [0.9, { ...g }],
    ],
    { windup0: true, lag: LAG_HEAVY, events: [{ t: 0.06, name: 'swing' }] }
  );
  const C = { a_light1: l1.c, a_light2: l2.c, a_light3: l3.c, a_heavy: h1.c, a_run: run.c, a_roll: rl.c };
  const K = { snd: 'swingAxe', hitSnd: 'hitAxe' };
  const H = (c, n, th) => hitWindows(ctx, c, n, th);
  const light = [
    attack({ ...K, clip: C.a_light1, dmg: 34, st: 22, hits: H(C.a_light1), cancel: CAN[0], move: 0.74, lunge: [0.26, 0.46, 2.6], range: 2.55, arc: 110, poise: 46, dir: -1 }),
    attack({ ...K, clip: C.a_light2, dmg: 36, st: 24, hits: H(C.a_light2), cancel: CAN[1], move: 0.78, lunge: [0.3, 0.48, 2.2], range: 2.6, arc: 170, poise: 50, dir: 1 }),
    attack({ ...K, clip: C.a_light3, dmg: 42, st: 28, hits: H(C.a_light3), cancel: CAN[2], move: 1.06, lunge: [0.38, 0.56, 2.8], range: 2.6, arc: 70, poise: 60, dir: 0 }),
  ];
  const heavy = [attack({ ...K, clip: C.a_heavy, dmg: 72, st: 36, hits: H(C.a_heavy), cancel: 1.2, move: 1.28, lunge: [0.5, 0.68, 2.6], range: 2.7, arc: 60, poise: 110, heavy: true, dir: 0, charge: { at: 0.5, max: 1.0, dmg: 0.6 }, impact: { r: 1.9, dmg: 0.35 } })];
  const runA = attack({ ...K, clip: C.a_run, dmg: 44, st: 30, hits: H(C.a_run), cancel: 0.84, move: 0.9, lunge: [0.0, 0.34, 5.4], range: 2.6, arc: 70, poise: 70, dir: 0, impact: { r: 1.6, dmg: 0.25 } });
  const roll = attack({ ...K, clip: C.a_roll, dmg: 30, st: 18, hits: H(C.a_roll), cancel: 0.6, move: 0.66, lunge: [0.0, 0.2, 2.6], range: 2.5, arc: 120, poise: 40, dir: 1 });
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

// ================================================================ KATANA
// Kendo: guardia media, pie derecho delante; cuatro cortes fluidos que se
// encadenan (kesa, gyaku-kesa, yoko y tsuki) y el iai del Juicio: la hoja
// vuelve a la saya y sale en un destello que atraviesa al enemigo.
const KST = { legL: [16, 0, 5], shinL: [22, 0, 0], legR: [-24, 0, -4], shinR: [24, 0, 0], root: [0, -7, 0] };
const KLUNGE = { legL: [36, 0, 5], shinL: [10, 0, 0], legR: [-52, 0, -4], shinR: [46, 0, 0], root: [0, -18, 12] };
const KDEEP = { legL: [44, 0, 6], shinL: [6, 0, 0], legR: [-64, 0, -4], shinR: [58, 0, 0], root: [0, -26, 20] };

// Mano derecha con la katana metida en la saya para un giro de pecho dado
// (el iai sale de aquí); pull la saca esa distancia a lo largo de la saya.
// Devuelve ikR (cm), bladeR (°) e ikL sobre la boca de la saya.
const _qa = new THREE.Quaternion();
const _qf = new THREE.Quaternion();
const _qh = new THREE.Quaternion();
function sheathPose(rig, chestDeg, pull = 0) {
  const qc = e2q(chestDeg.map((v) => v * DEG), new THREE.Quaternion()).invert();
  const chestPos = rig.rest.chest.pos;
  const mouth = SAYA.mouth.clone().sub(chestPos).applyQuaternion(qc);
  const Z = SAYA.Z.clone().applyQuaternion(qc);
  const Yv = SAYA.Y.clone().applyQuaternion(qc);
  // el guardamano justo fuera de la boca, el eje del mango (y = -0.05) centrado
  const wrist = mouth.clone().addScaledVector(Z, -0.035 - pull).addScaledVector(Yv, 0.05);
  const bl = [Math.atan2(Z.x, Z.z), Math.asin(Math.max(-1, Math.min(1, Z.y))), 0];
  // giro de la muñeca para que el lomo de la hoja mire como el de la saya
  const p = { ikR: [wrist.x, wrist.y, wrist.z], bladeR: bl.slice() };
  solveArm(p, rig, 'R');
  e2q(p.armR, _qa).multiply(e2q(p.foreR, _qf)).multiply(e2q(p.handR, _qh));
  const y0 = new THREE.Vector3(0, 1, 0).applyQuaternion(_qa);
  const ang = Math.atan2(new THREE.Vector3().crossVectors(y0, Yv).dot(Z), y0.dot(Yv));
  const left = mouth.clone().addScaledVector(Z, 0.1).addScaledVector(Yv, -0.05);
  return {
    ikR: [wrist.x * 100, wrist.y * 100, wrist.z * 100],
    bladeR: [bl[0] / DEG, bl[1] / DEG, ang / DEG],
    ikL: [left.x * 100, left.y * 100, left.z * 100],
  };
}

function katanaMoves(ctx) {
  const { G, rig } = ctx;
  const g = { ...G };
  const CAN = [0.3, 0.3, 0.32, 0.61];
  const CANH = 1.0;
  // kesa-giri: desde el hombro derecho hasta abajo a la izquierda
  const l1 = edgeClip(
    ctx,
    'k_light1',
    0.56,
    [
      [0, { ...KST, chest: [4, -6, 0], ...g }],
      [0.1, { ...KST, root: [0, -6, -2], chest: [2, -34, 0], head: [0, 16, 0], ikR: [-18, 60, 22], bladeR: [20, 115, 0], elbowR: [-0.7, -0.2, -0.6] }, 'hold'],
      [0.17, { ...KLUNGE, chest: [12, 0, 0], head: [-4, 0, 0], ikR: [-6, 34, 48], bladeR: [8, 12, 0], elbowR: [-0.5, -0.7, -0.3] }, 'smooth', HIT],
      [0.26, { ...KLUNGE, root: [0, -17, 11], chest: [16, 36, 0], head: [-4, -18, 0], ikR: [12, 4, 34], bladeR: [62, -54, 0], elbowR: [-0.4, -0.8, -0.3] }, 'settle'],
      [0.56, { ...g, chest: [3, 6, 0] }],
    ],
    { lag: LAG_MED, events: [{ t: 0.12, name: 'swing' }] }
  );
  // gyaku-kesa: sube de abajo a la izquierda hasta arriba a la derecha
  const l2 = edgeClip(
    ctx,
    'k_light2',
    0.56,
    [
      [0, poseAt(l1.c, CAN[0])],
      [0.08, { ...KST, chest: [12, 42, 0], head: [0, -18, 0], ikR: [16, 2, 32], bladeR: [100, -40, 0], elbowR: [-0.3, -0.8, -0.4] }, 'hold'],
      [0.15, { ...KLUNGE, chest: [8, 2, 0], head: [-2, 0, 0], ikR: [-8, 30, 50], bladeR: [0, 14, 0], elbowR: [-0.5, -0.7, -0.3] }, 'smooth', HIT],
      [0.24, { ...KLUNGE, root: [0, -17, 11], chest: [2, -40, 0], head: [0, 18, 0], ikR: [-30, 58, 28], bladeR: [-66, 62, 0], elbowR: [-0.7, -0.2, -0.5] }, 'settle'],
      [0.56, { ...g, chest: [3, -6, 0] }],
    ],
    { lag: LAG_MED, events: [{ t: 0.1, name: 'swing' }] }
  );
  // yoko-giri: horizontal de derecha a izquierda a la altura del pecho
  const l3 = edgeClip(
    ctx,
    'k_light3',
    0.6,
    [
      [0, poseAt(l2.c, CAN[1])],
      [0.1, { ...KST, chest: [6, -50, 0], head: [0, 20, 0], ikR: [-30, 34, 18], bladeR: [-120, 12, 0], elbowR: [-0.8, -0.3, -0.4] }, 'hold'],
      [0.17, { ...KLUNGE, chest: [10, -6, 0], head: [-2, 2, 0], ikR: [-10, 32, 50], bladeR: [-10, 6, 0], elbowR: [-0.6, -0.6, -0.3] }, 'smooth', HIT],
      [0.27, { ...KLUNGE, root: [0, -17, 11], chest: [10, 46, 0], head: [-2, -20, 0], ikR: [16, 28, 30], bladeR: [96, -4, 0], elbowR: [-0.3, -0.8, -0.4] }, 'settle'],
      [0.6, { ...g, chest: [2, 8, 0] }],
    ],
    { lag: LAG_MED, events: [{ t: 0.12, name: 'swing' }] }
  );
  // tsuki: estocada a dos manos con zancada, recta
  const t1 = { ...KST, root: [0, -8, -4], chest: [0, -10, 0], head: [0, 4, 0] };
  const t2 = { ...KDEEP, root: [0, -22, 16], chest: [22, 10, 0], head: [-12, -4, 0] };
  const l4 = clip(
    'k_light4',
    0.66,
    [
      [0, poseAt(l3.c, CAN[2])],
      [0.13, { ...W2C(rig, t1, [-6, 122, 26], [4, 8, 0]), elbowR: [-0.5, -0.7, -0.5] }, 'hold'],
      [0.25, { ...W2C(rig, t2, [-4, 118, 88], [2, 4, 0]), elbowR: [-0.3, -0.9, 0] }, 'strike'],
      [0.36, { ...W2C(rig, { ...t2, root: [0, -21, 15], chest: [20, 9, 0] }, [-4, 118, 85], [2, 3, 0]), elbowR: [-0.3, -0.9, 0] }],
      [0.66, { ...KST, chest: [4, -6, 0], ...g }],
    ],
    { lag: LAG_THRUST, events: [{ t: 0.15, name: 'swing' }] }
  );
  // iai del Juicio: envaina, se agacha (aquí se carga), desenvaina con la hoja
  // saliendo a lo largo de la saya y corta en horizontal en el mismo gesto;
  // sacude la sangre (chiburi) y vuelve a la guardia
  const sh1 = sheathPose(rig, [22, 26, 0]);
  const sh2 = sheathPose(rig, [26, 30, 0]);
  const draw = sheathPose(rig, [18, 12, 0], 0.6);
  const free = { wGrip: [0, 0, 0], elbowL: [0.6, -0.6, -0.4] };
  const h1 = edgeClip(
    ctx,
    'k_heavy1',
    1.25,
    [
      [0, { ...KST, ...g }],
      [0.2, { legL: [20, 0, 6], shinL: [34, 0, 0], legR: [-30, 0, -6], shinR: [40, 0, 0], root: [0, -16, -2], chest: [22, 26, 0], head: [-16, -20, 0], ...sh1, ...free, elbowR: [-0.3, -0.8, -0.4] }, 'smooth', { lock: true }],
      [0.42, { legL: [22, 0, 6], shinL: [40, 0, 0], legR: [-34, 0, -6], shinR: [46, 0, 0], root: [0, -20, -3], chest: [26, 30, 0], head: [-18, -24, 0], ...sh2, ...free, elbowR: [-0.3, -0.8, -0.4] }, 'hold', { lock: true }],
      [0.5, { ...KLUNGE, root: [0, -18, 8], chest: [18, 12, 0], head: [-10, -8, 0], ...draw, ...free, ikL: [26, 4, 2], elbowR: [-0.4, -0.8, -0.2] }, 'smooth', { k: 1.3 }],
      [0.58, { ...KDEEP, root: [0, -24, 18], chest: [14, -4, 0], head: [-6, 2, 0], ikR: [-16, 30, 54], bladeR: [-20, 6, 0], ...free, ikL: [26, 4, -4], elbowR: [-0.6, -0.6, -0.2] }, 'smooth', HIT],
      [0.68, { ...KDEEP, root: [0, -23, 19], chest: [10, -48, 0], head: [-4, 20, 0], ikR: [-46, 34, 26], bladeR: [-120, 10, 0], ...free, ikL: [26, 6, -4], elbowR: [-0.8, -0.4, -0.3] }, 'settle'],
      [0.92, { ...KST, chest: [8, -20, 0], head: [0, 8, 0], ikR: [-34, 10, 30], bladeR: [-40, -40, 0], ...free, ikL: [24, 8, 10], elbowR: [-0.6, -0.6, -0.3] }, 'strike'],
      [1.25, { ...g }],
    ],
    { lag: LAG_MED, events: [{ t: 0.47, name: 'draw' }, { t: 0.56, name: 'flash' }, { t: 0.86, name: 'flick' }] }
  );
  // makko-giri: corte vertical desde lo alto (segundo pesado encadenado)
  const h2 = edgeClip(
    ctx,
    'k_heavy2',
    0.95,
    [
      [0, poseAt(h1.c, CANH)],
      [0.3, { ...KST, chest: [-14, -4, 0], head: [-8, 4, 0], ikR: [-8, 92, 18], bladeR: [6, 128, 0], elbowR: [-0.7, 0.2, -0.6] }, 'hold'],
      [0.38, { ...KLUNGE, chest: [12, 0, 0], head: [-6, 0, 0], ikR: [-6, 46, 52], bladeR: [0, 30, 0], elbowR: [-0.6, -0.5, -0.3] }, 'smooth', HIT],
      [0.47, { ...KLUNGE, root: [0, -22, 14], chest: [28, 0, 0], head: [-14, 0, 0], ikR: [-4, 12, 48], bladeR: [0, -26, 0], elbowR: [-0.5, -0.8, 0] }, 'settle'],
      [0.95, { ...g }],
    ],
    { lag: LAG_MED, events: [{ t: 0.32, name: 'swing' }] }
  );
  // nuki-do: corte al costado mientras se pasa de largo corriendo
  const run = edgeClip(
    ctx,
    'k_run',
    0.72,
    [
      [0, { ...KST, chest: [10, -20, 0], ikR: [-20, 20, 30], bladeR: [-40, 20, 0], elbowR: [-0.6, -0.6, -0.4] }],
      [0.1, { ...KST, chest: [8, -42, 0], head: [0, 16, 0], ikR: [-32, 26, 16], bladeR: [-112, 8, 0], elbowR: [-0.8, -0.3, -0.4] }, 'hold'],
      [0.18, { ...KDEEP, chest: [14, 0, 0], head: [-4, 0, 0], ikR: [-10, 24, 50], bladeR: [-8, 2, 0], elbowR: [-0.6, -0.6, -0.3] }, 'smooth', HIT],
      [0.28, { ...KDEEP, root: [0, -25, 19], chest: [16, 52, 0], head: [-6, -22, 0], ikR: [20, 18, 26], bladeR: [110, -12, 0], elbowR: [-0.3, -0.8, -0.4] }, 'settle'],
      [0.72, { ...g }],
    ],
    { lag: LAG_MED, events: [{ t: 0.12, name: 'swing' }] }
  );
  // kiriage: corte ascendente al salir de la voltereta
  const rl = edgeClip(
    ctx,
    'k_roll',
    0.56,
    [
      [0, { root: [0, -24, 0], legL: [-50, 0, 8], shinL: [90, 0, 0], legR: [10, 0, -8], shinR: [70, 0, 0], chest: [26, -24, 0], head: [-12, 12, 0], ikR: [-20, -4, 30], bladeR: [-50, -50, 0], elbowR: [-0.7, -0.6, -0.2] }],
      [0.1, { ...KLUNGE, chest: [14, 4, 0], head: [-6, 0, 0], ikR: [-8, 26, 48], bladeR: [0, 10, 0], elbowR: [-0.5, -0.7, -0.3] }, 'smooth', HIT],
      [0.2, { ...KLUNGE, root: [0, -17, 11], chest: [-2, 42, 0], head: [2, -18, 0], ikR: [10, 62, 28], bladeR: [64, 72, 0], elbowR: [-0.3, -0.5, -0.6] }, 'settle'],
      [0.56, { ...g }],
    ],
    { windup0: true, lag: LAG_MED, events: [{ t: 0.05, name: 'swing' }] }
  );
  const C = { k_light1: l1.c, k_light2: l2.c, k_light3: l3.c, k_light4: l4, k_heavy1: h1.c, k_heavy2: h2.c, k_run: run.c, k_roll: rl.c };
  const K = { snd: 'swingKatana', holy: true };
  const H = (c, n, th) => hitWindows(ctx, c, n, th);
  const light = [
    attack({ ...K, clip: C.k_light1, dmg: 22, st: 12, hits: H(C.k_light1), cancel: CAN[0], move: 0.38, lunge: [0.05, 0.2, 2.8], range: 2.7, arc: 130, poise: 20, dir: -1 }),
    attack({ ...K, clip: C.k_light2, dmg: 22, st: 12, hits: H(C.k_light2), cancel: CAN[1], move: 0.38, lunge: [0.04, 0.18, 2.6], range: 2.7, arc: 130, poise: 20, dir: 1 }),
    attack({ ...K, clip: C.k_light3, dmg: 24, st: 13, hits: H(C.k_light3), cancel: CAN[2], move: 0.4, lunge: [0.06, 0.2, 2.8], range: 2.75, arc: 160, poise: 22, dir: -1 }),
    attack({ ...K, clip: C.k_light4, dmg: 30, st: 16, hits: H(C.k_light4, 1, true), cancel: CAN[3], move: 0.61, lunge: [0.13, 0.28, 3.8], range: 3.0, arc: 40, poise: 30, dir: 0, thrust: true }),
  ];
  const heavy = [
    attack({ ...K, clip: C.k_heavy1, snd: 'iai', dmg: 56, st: 30, hits: H(C.k_heavy1), cancel: CANH, move: 1.05, lunge: [0.48, 0.64, 8.0], range: 3.2, arc: 150, poise: 70, heavy: true, dir: 1, charge: { at: 0.42, max: 1.2, dmg: 0.7 } }),
    attack({ ...K, clip: C.k_heavy2, dmg: 50, st: 26, hits: H(C.k_heavy2), cancel: 0.7, move: 0.76, lunge: [0.3, 0.48, 3.8], range: 2.9, arc: 70, poise: 66, heavy: true, dir: 0 }),
  ];
  const runA = attack({ ...K, clip: C.k_run, dmg: 30, st: 16, hits: H(C.k_run), cancel: 0.42, move: 0.48, lunge: [0.0, 0.3, 7.0], range: 2.8, arc: 160, poise: 34, dir: -1 });
  const roll = attack({ ...K, clip: C.k_roll, dmg: 24, st: 12, hits: H(C.k_roll), cancel: 0.3, move: 0.36, lunge: [0.0, 0.15, 2.8], range: 2.7, arc: 130, poise: 24, dir: 1 });
  return { clips: C, light, heavy, run: runA, roll };
}

// ================================================================ registro
export const MOVESETS = {
  facon: {
    id: 'facon',
    item: 'facon',
    order: 1,
    wristMode: 'euler',
    hands: 1,
    trail: [
      [0, -0.05, 0.12],
      [0, -0.05, 0.47],
    ],
    trailColor: 0xffe8c0,
    tip: [0, -0.05, 0.474],
    edge: [0, -1, 0],
    guard: { ikR: [-22, 14, 30], bladeR: [2, 20, 0], elbowR: [-0.6, -0.7, -0.3], ikL: SHIELD_GUARD },
    runPose: { ikR: [-30, 6, 4], bladeR: [-8, -50, 0], elbowR: [-0.6, -0.6, -0.5] },
    swing: [8, 26],
    block: { ikR: [-26, 12, 16], bladeR: [-4, 30, 0], elbowR: [-0.6, -0.7, -0.3], ...SHIELD_UP },
    moves: faconMoves,
  },
  hacha: {
    id: 'hacha',
    item: 'hacha',
    order: 2,
    wristMode: 'euler',
    hands: 2,
    grip2: -0.42,
    // el mango no gira durante el golpe (las dos manos lo sujetan y la cabeza
    // está lejos del eje): sólo el giro fijo de cada tajo
    noTrack: false,
    freeL: [0.24, 0.1, 0.14],
    elbowL: [0.6, -0.7, -0.3],
    trail: [
      [0, -0.09, 0.46],
      [0, -0.3, 0.43],
    ],
    trailColor: 0xffd8a8,
    tip: [0, -0.3, 0.43],
    edge: [0, -1, 0],
    guard: { ikR: [-6, 34, 34], bladeR: [-30, 50, 0], elbowR: [-0.6, -0.6, -0.4] },
    runPose: { ikR: [-26, 40, 10], bladeR: [-170, 28, 0], elbowR: [-0.8, -0.2, -0.4] },
    swing: [4, 10],
    block: { ikR: [-8, 44, 32], bladeR: [-94, 8, 0], elbowR: [-0.4, -0.8, -0.2], chest: [4, -6, 0], head: [8, 4, 0] },
    blockK: { st: 1.25, chip: 0.16 },
    healR: { ikR: [-26, 2, 16], bladeR: [-12, -70, 0] },
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
  katana: {
    id: 'katana',
    item: 'katana',
    order: 5,
    wristMode: 'euler',
    hands: 2,
    grip2: -0.2,
    freeL: [0.24, 0.08, 0.12],
    elbowL: [0.5, -0.8, -0.3],
    trail: [
      [0, -0.05, 0.12],
      [0, -0.05 + 0.019, 0.77],
    ],
    trailColor: 0xfff0b8,
    tip: [0, -0.05 + 0.019, 0.77],
    edge: [0, -1, 0],
    holy: true,
    guard: { ikR: [-4, 24, 34], bladeR: [2, 32, 0], elbowR: [-0.5, -0.8, -0.3] },
    runPose: { ikR: [-30, 4, 2], bladeR: [-168, -30, 0], elbowR: [-0.6, -0.6, -0.4] },
    swing: [6, 24],
    block: { ikR: [-6, 40, 30], bladeR: [-96, 12, 0], elbowR: [-0.4, -0.8, -0.2], chest: [4, -6, 0], head: [6, 4, 0] },
    blockK: { st: 1.45, chip: 0.22 },
    healR: { ikR: [-26, 4, 18], bladeR: [-10, -40, 0] },
    saya: true,
    moves: katanaMoves,
  },
};
