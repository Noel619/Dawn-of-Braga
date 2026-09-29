// Utilidades compartidas por el registro de armas y sus repertorios.
import * as THREE from 'three';
import { slerpE, e2q, q2e } from './rig.js';
import { solveArm } from './locomotion.js';
import { DEG, lerp, clamp } from '../core/util.js';

// grados/cm -> radianes/m (los canales 'w' son pesos sin unidades)
export function rad(p) {
  const o = {};
  for (const k in p) o[k] = p[k].map((v) => (k === 'root' || k.startsWith('ik') ? v / 100 : k.startsWith('elbow') || k[0] === 'w' ? v : v * DEG));
  return o;
}

export const sstep = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// Normaliza un ataque: ventanas de golpe múltiples, valores por defecto.
export function attack(a) {
  const o = { st: 12, poise: 16, dir: 0, range: 2.3, arc: 110, cancel: a.move ?? 0.4, ...a };
  o.hits = a.hits || [a.hit];
  o.hit = o.hits[0];
  return o;
}

// ---------------------------------------------------------------- poses comunes
// Piernas: pie derecho adelantado / zancada larga (las del jugador original).
export const STANCE = { legL: [14, 0, 4], shinL: [18, 0, 0], legR: [-22, 0, -4], shinR: [22, 0, 0], root: [0, -5, 0] };
export const LUNGE = { legL: [30, 0, 4], shinL: [10, 0, 0], legR: [-45, 0, -4], shinR: [40, 0, 0], root: [0, -14, 8] };
// Escudo en alto (brazo izquierdo) y torso cubierto.
export const SHIELD_UP = { ikL: [8, 54, 33], elbowL: [0.9, -0.25, -0.35], chest: [8, -14, 0], head: [6, 10, 0] };
// Escudo en guardia (antebrazo delante del cuerpo).
export const SHIELD_GUARD = [17, 22, 27];


// ---------------------------------------------------------------- agarre
// Armas a dos manos: el puño izquierdo se coloca sobre el eje del mango, a
// W.grip2 metros del derecho a lo largo del arma (negativo = hacia el pomo),
// con los nudillos orientados como los de la mano derecha. pose.wGrip (0..1)
// lo suelta (la muñeca va hacia pose.ikL o W.freeL) y pose.wSlide acerca las
// manos (barridos del hacha).
const _qa = new THREE.Quaternion();
const _qb = new THREE.Quaternion();
const _qc = new THREE.Quaternion();
const _Wr = new THREE.Vector3();
const _Zr = new THREE.Vector3();
const _hg = [0, 0, 0];
export function resolveWeaponArms(p, rig, W) {
  let w = 0;
  if (W.hands === 2 && p.ikR && p.bladeR) w = p.wGrip ? clamp(p.wGrip[0], 0, 1) : 1;
  const slide = p.wSlide ? p.wSlide[0] : 1;
  delete p.wGrip;
  delete p.wSlide;
  // (la espada conserva la referencia original del giro de la muñeca)
  const mode = W.wristMode || null;
  if (w <= 0.001) {
    solveArm(p, rig, 'R', mode);
    solveArm(p, rig, 'L');
    return;
  }
  solveArm(p, rig, 'R', mode);
  // muñeca derecha donde de verdad llega el brazo (si el objetivo queda fuera
  // de alcance, el brazo se estira hacia él y se queda corto)
  const R = rig.rest;
  e2q(p.armR, _qa);
  e2q(p.foreR, _qb);
  const wr = _Wr.copy(R.handR.pos).applyQuaternion(_qb).add(R.foreR.pos).applyQuaternion(_qa).add(R.armR.pos);
  // orientación de la mano derecha (espacio del pecho): Z = mango, Y = hacia el codo
  _qa.multiply(_qb).multiply(e2q(p.handR, _qc));
  const Z = _Zr.set(0, 0, 1).applyQuaternion(_qa);
  // centro del puño derecho -> centro del puño izquierdo -> muñeca izquierda;
  // si ahí no llega el brazo izquierdo, la mano se desliza por el mango hasta
  // el punto alcanzable más cercano (nunca lo suelta)
  let g = W.grip2 * slide;
  const SL = R.armL.pos;
  const rMax = (R.foreL.pos.length() + R.handL.pos.length()) * 0.985;
  const dx = wr.x - SL.x,
    dy = wr.y - SL.y,
    dz = wr.z - SL.z;
  const b = Z.x * dx + Z.y * dy + Z.z * dz;
  const c = dx * dx + dy * dy + dz * dz - rMax * rMax;
  if (g * g + 2 * b * g + c > 0 && b * b - c >= 0) {
    const q = Math.sqrt(b * b - c);
    const s = g < -b - q ? -b - q : -b + q;
    const lim = W.gripRange || [W.grip2 * 1.3, W.grip2 * 0.3];
    g = Math.min(lim[1], Math.max(lim[0], s));
  }
  const tx = wr.x + Z.x * g,
    ty = wr.y + Z.y * g,
    tz = wr.z + Z.z * g;
  const f = p.ikL || W.freeL;
  p.ikL = [lerp(f[0], tx, w), lerp(f[1], ty, w), lerp(f[2], tz, w)];
  if (!p.elbowL || w >= 0.999) p.elbowL = W.elbowL;
  const free = p.handL ? p.handL.slice() : [0, 0, 0];
  delete p.bladeL;
  solveArm(p, rig, 'L');
  // mano izquierda con la misma orientación que la derecha (puño sobre el mango)
  e2q(p.armL, _qb).multiply(e2q(p.foreL, _qc));
  _qb.invert().multiply(_qa);
  q2e(_qb, _hg);
  p.handL = w >= 0.999 ? [_hg[0], _hg[1], _hg[2]] : slerpE(free, _hg, w, [0, 0, 0]);
}

// Resolutor de brazos ligado a un rig y un arma.
export const resolveArmsFn = (rig, W) => (p) => resolveWeaponArms(p, rig, W);
