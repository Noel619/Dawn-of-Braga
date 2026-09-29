// Análisis numérico de las animaciones de las armas (sin navegador).
//   node tools/animcheck.mjs [arma] [clip]
// Para cada golpe muestrea el clip a 240 Hz con la IK real del jugador y mide:
//   vmax      velocidad pico de la punta (m/s) y su instante
//   activo    tramo con la punta a más del 55 % del pico (debería coincidir
//             con la ventana de golpe definida)
//   filo      en cortes, coseno medio entre el filo y la dirección de avance
//             (1 = corta con el filo); en estocadas, avance a lo largo de la hoja
//   suelo     altura mínima de la punta (m)
//   agarre    separación máx. de la mano izquierda respecto al mango (2 manos)
//   cabeza / torso  distancia mínima de la hoja al centro de la cabeza/torso
//   salto     diferencia de pose al encadenar con el siguiente golpe (°)
//   jorobas   picos del perfil de velocidad de la punta (t:v); un golpe limpio
//             tiene uno por gesto (anticipación, tajo, recuperación)
//   muñeca    giro de la hoja (canal roll) mín./máx. durante el golpe, y
//             'torsión': cuánto se aparta el filo de la línea natural del
//             antebrazo (pronación/supinación de la muñeca, máx. |°|)
//   TIRONES   saltos bruscos (la punta o la orientación de la hoja cambian de
//             golpe entre dos muestras: codo que se da la vuelta, etc.)
import * as THREE from 'three';
import { playerDef } from '../src/entities/models.js';
import { Rig, sampleClip } from '../src/entities/rig.js';
import { WEAPONS, weaponSet, resolveWeaponArms } from '../src/entities/weapons.js';

const onlyW = process.argv[2];
const onlyC = process.argv[3];
const rig = new Rig(playerDef(), { matFn: () => new THREE.MeshBasicMaterial() });
const J = rig.joints;
const DT = 1 / 240;
const v3 = () => new THREE.Vector3();
const _q = new THREE.Quaternion();

function poseAt(W, c, t) {
  const p = sampleClip(c, t, {});
  const grip = W.hands === 2 ? (p.wGrip ? p.wGrip[0] : 1) : 0;
  resolveWeaponArms(p, rig, W);
  rig.apply(p);
  rig.root.updateMatrixWorld(true);
  return { p, grip };
}
function world(joint, local) {
  return v3().fromArray(local).applyMatrix4(J[joint].matrixWorld);
}
function segDist(a, b, p) {
  const ab = v3().subVectors(b, a);
  const u = Math.max(0, Math.min(1, v3().subVectors(p, a).dot(ab) / ab.lengthSq()));
  return a.clone().addScaledVector(ab, u).distanceTo(p);
}
// ángulo entre dos poses en las articulaciones del tren superior (°)
const UP = ['chest', 'head', 'armR', 'foreR', 'handR', 'armL', 'foreL', 'handL'];
function snapshot() {
  const o = {};
  for (const j of UP) o[j] = J[j].quaternion.clone();
  return o;
}
function poseDiff(a, b) {
  let m = 0,
    wj = '';
  for (const j of UP) {
    const d = (2 * Math.acos(Math.min(1, Math.abs(a[j].dot(b[j]))))) / (Math.PI / 180);
    if (d > m) {
      m = d;
      wj = j;
    }
  }
  return [m, wj];
}

function analyse(W, name, a) {
  const c = a.clip;
  const N = Math.ceil(c.dur / DT);
  const tips = [],
    edges = [],
    axes = [],
    grips = [],
    quats = [];
  let minY = 9,
    minHead = 9,
    minTorso = 9,
    gripErr = 0,
    rollMin = 999,
    rollMax = -999,
    twist = 0;
  for (let i = 0; i <= N; i++) {
    const t = Math.min(c.dur, i * DT);
    const raw = sampleClip(c, t, {});
    if (raw.bladeR) {
      const r = raw.bladeR[2] / (Math.PI / 180);
      rollMin = Math.min(rollMin, r);
      rollMax = Math.max(rollMax, r);
    }
    const { grip } = poseAt(W, c, t);
    // torsión de la muñeca: filo real frente al filo 'natural' (antebrazo)
    if (Array.isArray(W.edge)) {
      const fq = J.foreR.getWorldQuaternion(new THREE.Quaternion());
      const fdir = v3().set(0, -1, 0).applyQuaternion(fq);
      const sq2 = J.sword.getWorldQuaternion(new THREE.Quaternion());
      const Z = v3().set(0, 0, 1).applyQuaternion(sq2);
      fdir.addScaledVector(Z, -fdir.dot(Z));
      if (fdir.length() > 0.25) {
        fdir.normalize();
        const e = v3().fromArray(W.edge).applyQuaternion(sq2);
        const a = Math.abs(Math.atan2(v3().crossVectors(fdir, e).dot(Z), fdir.dot(e))) / (Math.PI / 180);
        twist = Math.max(twist, a);
      }
    }
    const tip = world('sword', W.tip);
    const base = world('sword', W.trail[0]);
    tips.push(tip);
    const sq = J.sword.getWorldQuaternion(_q);
    quats.push(sq.clone());
    axes.push(v3().set(0, 0, 1).applyQuaternion(sq));
    edges.push(Array.isArray(W.edge) ? v3().fromArray(W.edge).applyQuaternion(sq) : null);
    minY = Math.min(minY, tip.y);
    const head = world('head', [0, 0.13, 0]);
    const torso = world('chest', [0, 0.26, 0]);
    minHead = Math.min(minHead, segDist(base, tip, head));
    minTorso = Math.min(minTorso, segDist(base, tip, torso));
    if (W.hands === 2 && grip > 0.98) {
      // puño izquierdo (5 cm bajo la muñeca) frente al eje del mango
      const fist = world('handL', [0, -0.05, 0]);
      const g0 = world('sword', [0, -0.05, -0.6]);
      const g1 = world('sword', [0, -0.05, 0.4]);
      gripErr = Math.max(gripErr, segDist(g0, g1, fist));
    }
    grips.push(grip);
  }
  // velocidades de la punta
  const sp = [];
  for (let i = 0; i < tips.length; i++) {
    const a0 = tips[Math.max(0, i - 1)],
      a1 = tips[Math.min(tips.length - 1, i + 1)];
    sp.push(a1.distanceTo(a0) / (DT * (i === 0 || i === tips.length - 1 ? 1 : 2)));
  }
  let pk = 0,
    pi = 0;
  for (let i = 0; i < sp.length; i++)
    if (sp[i] > pk) {
      pk = sp[i];
      pi = i;
    }
  let i0 = pi,
    i1 = pi;
  while (i0 > 0 && sp[i0 - 1] > pk * 0.55) i0--;
  while (i1 < sp.length - 1 && sp[i1 + 1] > pk * 0.55) i1++;
  // filo por delante durante las ventanas definidas
  let lead = 0,
    wsum = 0;
  for (const [h0, h1] of a.hits) {
    for (let i = Math.floor(h0 / DT); i <= Math.min(tips.length - 2, Math.ceil(h1 / DT)); i++) {
      const vel = v3().subVectors(tips[i + 1], tips[i]);
      const s = vel.length();
      if (s < 1e-6) continue;
      vel.normalize();
      const ref = a.thrust ? axes[i] : edges[i];
      if (!ref) continue;
      lead += ref.dot(vel) * s * (a.thrust ? 1 : c.edgeSide || 1);
      wsum += s;
    }
  }
  // tirones: velocidad (lineal o angular) muy por encima de sus vecinas
  const om = quats.map((q, i) => (i ? (2 * Math.acos(Math.min(1, Math.abs(q.dot(quats[i - 1]))))) / DT : 0));
  const jerks = [];
  for (let i = 4; i < sp.length - 4; i++) {
    const nv = Math.max(sp[i - 4], sp[i + 4]),
      nw = Math.max(om[i - 4], om[i + 4]);
    if ((sp[i] > 8 && sp[i] > 2.5 * nv) || (om[i] > 40 && om[i] > 2.5 * nw)) jerks.push(+(i * DT).toFixed(3));
  }
  // jorobas: máximos locales con prominencia > 12 % del pico
  const sm = sp.map((_, i) => (sp[Math.max(0, i - 2)] + sp[Math.max(0, i - 1)] + sp[i] + sp[Math.min(sp.length - 1, i + 1)] + sp[Math.min(sp.length - 1, i + 2)]) / 5);
  const humps = [];
  for (let i = 1; i < sm.length - 1; i++) {
    if (!(sm[i] >= sm[i - 1] && sm[i] > sm[i + 1])) continue;
    let l = sm[i],
      r = sm[i];
    for (let k = i; k >= 0 && sm[k] <= sm[i]; k--) l = Math.min(l, sm[k]);
    for (let k = i; k < sm.length && sm[k] <= sm[i]; k++) r = Math.min(r, sm[k]);
    if (sm[i] - Math.max(l, r) > 0.12 * pk && sm[i] > 0.1 * pk) humps.push(`${(i * DT).toFixed(2)}:${sm[i].toFixed(0)}`);
  }
  return {
    jerks,
    humps,
    roll: rollMax > rollMin ? `${rollMin.toFixed(0)}..${rollMax.toFixed(0)} torsión ${twist.toFixed(0)}` : '-',
    name,
    dur: c.dur,
    vmax: +pk.toFixed(1),
    tpk: +(pi * DT).toFixed(3),
    activo: [+(i0 * DT).toFixed(2), +(i1 * DT).toFixed(2)],
    ventana: a.hits.map((h) => h.map((x) => +x.toFixed(2))),
    filo: wsum ? +(lead / wsum).toFixed(2) : '-',
    suelo: +minY.toFixed(2),
    agarre: W.hands === 2 ? +gripErr.toFixed(3) : '-',
    cabeza: +minHead.toFixed(2),
    torso: +minTorso.toFixed(2),
  };
}

// diferencia entre la pose al poder encadenar (cancel) y el inicio del siguiente
function chainJump(W, a, b) {
  poseAt(W, a.clip, a.cancel);
  const A = snapshot();
  poseAt(W, b.clip, 0);
  const B = snapshot();
  return poseDiff(A, B);
}

// guardias estáticas: agarre de la izquierda y distancia de la derecha al hombro
function staticPose(W, label, pose) {
  const p = {};
  for (const k in pose) p[k] = pose[k].map((v) => (k === 'root' || k.startsWith('ik') ? v / 100 : k.startsWith('elbow') || k[0] === 'w' ? v : (v * Math.PI) / 180));
  resolveWeaponArms(p, rig, W);
  rig.apply(p);
  rig.root.updateMatrixWorld(true);
  let err = '-';
  if (W.hands === 2) {
    const fist = world('handL', [0, -0.05, 0]);
    const g0 = world('sword', [0, -0.05, -0.6]);
    const g1 = world('sword', [0, -0.05, 0.4]);
    err = +segDist(g0, g1, fist).toFixed(3);
  }
  const tip = world('sword', W.tip);
  return `${label.padEnd(8)} agarre ${err}  punta (${tip.x.toFixed(2)}, ${tip.y.toFixed(2)}, ${tip.z.toFixed(2)})`;
}

for (const id of Object.keys(WEAPONS)) {
  if (onlyW && id !== onlyW) continue;
  const W = WEAPONS[id];
  const S = weaponSet(W, rig);
  console.log(`\n=== ${id} (${W.hands} mano${W.hands > 1 ? 's' : ''})`);
  console.log(staticPose(W, 'guardia', W.guard));
  console.log(staticPose(W, 'bloqueo', W.block));
  const list = [];
  S.light.forEach((a, i) => list.push(['light' + (i + 1), a]));
  S.heavy.forEach((a, i) => list.push(['heavy' + (i + 1), a]));
  list.push(['run', S.run], ['roll', S.roll]);
  if (S.guard) list.push(['guard', S.guard]);
  for (const [n, a] of list) {
    if (onlyC && n !== onlyC && a.clip.name !== onlyC) continue;
    const r = analyse(W, n, a);
    console.log(
      `${n.padEnd(7)} ${a.clip.name.padEnd(10)} dur ${String(r.dur).padEnd(5)} vmax ${String(r.vmax).padStart(5)}@${String(r.tpk).padEnd(6)} activo ${JSON.stringify(r.activo).padEnd(12)} ventana ${JSON.stringify(r.ventana).padEnd(22)} filo ${String(r.filo).padEnd(5)} suelo ${String(r.suelo).padEnd(5)} agarre ${String(r.agarre).padEnd(5)} cabeza ${r.cabeza} torso ${r.torso}`
    );
    console.log(`        muñeca ${r.roll}  jorobas ${r.humps.join(' ')}${r.jerks.length ? '  TIRONES ' + r.jerks.join(' ') : ''}`);
  }
  // encadenados
  const L = S.light;
  const chains = [];
  for (let i = 0; i < L.length; i++) chains.push([`light${i + 1}->light${((i + 1) % L.length) + 1}`, L[i], L[(i + 1) % L.length]]);
  if (S.heavy.length > 1) chains.push(['heavy1->heavy2', S.heavy[0], S.heavy[1]]);
  const out = chains.map(([n, a, b]) => {
    const [d, j] = chainJump(W, a, b);
    return `${n} ${d.toFixed(0)}°(${j})`;
  });
  console.log('salto al encadenar: ' + out.join('  '));
}
