// La película: las casas de los bloques que revientan a su paso (ver WAVES en
// world/builders.js): cada casa cae cuando la toca de verdad una parte del
// gigante (las manos, los hombros, los pies, las caderas, el pecho, la cola;
// o el brazo tendido), en trozos que salen despedidos lejos de él, con polvo,
// tejas, vigas y lo que colgaba de ella (ropa tendida, rótulos, faroles).
// Lo usan la huida por la Herrería (acto 3) y la cabalgada (acto 5).
import * as THREE from 'three';
import { clamp } from '../../core/util.js';

const V3 = THREE.Vector3;
const rnd = (a, b) => a + Math.random() * (b - a);
const _v = new V3(),
  _v2 = new V3();

// las casas (con su grupo) de unos bloques, de la lista del nivel
export function waveHouses(g, wgs) {
  const L = g.level.ctx;
  const key = wgs.join(',');
  const C = L._waveCache || (L._waveCache = {});
  return C[key] || (C[key] = (L.houseRects || []).filter((r) => r.sub && wgs.some((w) => r.sub.startsWith(w + ':'))));
}
export function waveProps(g, wgs) {
  const L = g.level.ctx;
  const key = 'p:' + wgs.join(',');
  const C = L._waveCache || (L._waveCache = {});
  return C[key] || (C[key] = (L.waveProps || []).filter((q) => wgs.includes(q.wg)));
}
export const rectDist = (r, x, z) => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1));

// (lo que toca: cada hueso con lo que abulta)
const BODY = [
  ['handL', 1.0],
  ['handR', 1.0],
  ['armL', 1.2],
  ['armR', 1.2],
  ['footL', 0.9],
  ['footR', 0.9],
  ['pelvis', 2.4],
  ['chest', 2.2],
  ['tail2', 1.2],
  ['tail4', 0.9],
];
const _pts = BODY.map(() => new V3());
// lo que toca el cuerpo, revienta
export function breakWave(D, G, wgs) {
  const g = D.g;
  const B = G.M.byName;
  BODY.forEach(([n], i) => B[n].getWorldPosition(_pts[i]));
  for (const r of waveHouses(g, wgs)) {
    if (!g.groups[r.sub] || !g.groups[r.sub].on) continue;
    const h = (r.h || 7) + 1.5;
    if (BODY.some(([, R], i) => _pts[i].y < h && rectDist(r, _pts[i].x, _pts[i].z) < R)) smashHouse(D, r, G.pos, wgs);
  }
  for (const q of waveProps(g, wgs)) {
    if (!g.groups[q.name] || !g.groups[q.name].on) continue;
    if (BODY.some(([, R], i) => _pts[i].y < 5 && Math.hypot(q.x - _pts[i].x, q.z - _pts[i].z) < R + 1.2)) kickProp(D, q, G.pos);
  }
}
// lo que toca el brazo tendido (del hombro a la mano), revienta
export function breakArm(D, G, wgs, S = 'L') {
  const g = D.g;
  const B = G.M.byName;
  const a = B['arm' + S].getWorldPosition(new V3()),
    b = B['fore' + S].getWorldPosition(new V3()),
    c = B['hand' + S].getWorldPosition(new V3());
  const pts = [a.clone().lerp(b, 0.5), b, b.clone().lerp(c, 0.5), c];
  for (const r of waveHouses(g, wgs)) {
    if (!g.groups[r.sub] || !g.groups[r.sub].on) continue;
    if (pts.some((q) => q.y < (r.h || 7) + 1.2 && rectDist(r, q.x, q.z) < 1.2)) smashHouse(D, r, G.pos, wgs);
  }
}
// todo un bloque, de golpe, alrededor de un punto
export function smashBlock(D, wg, at, r) {
  const g = D.g;
  for (const h of waveHouses(g, [wg])) if (rectDist(h, at.x, at.z) < r) smashHouse(D, h, at, [wg]);
  for (const q of waveProps(g, [wg])) if (Math.hypot(q.x - at.x, q.z - at.z) < r + 2) kickProp(D, q, at);
}
// Una casa revienta: se viene abajo lejos del gigante (se ladea y se hunde),
// sus muros y su tejado en trozos, con polvo que rueda por la calle, tejas,
// astillas y lo que colgaba de ella (ver director.crumble)
export function smashHouse(D, r, from, wgs = null) {
  const g = D.g;
  const cx = (r.x0 + r.x1) / 2,
    cz = (r.z0 + r.z1) / 2;
  const h = r.h || 7;
  // (la casa cae hacia donde la empujan, con poca inclinación: es grande)
  const foot = (r.x1 - r.x0) * (r.z1 - r.z0);
  if (!D.breakHouse(r.sub, { from, tilt: 0.16 + Math.random() * 0.12, drop: h * 0.9, dur: 0.9 + Math.random() * 0.4, speed: 1.1, at: new V3(cx, h * 0.55, cz), roof: true, wood: r.style !== 'stone', size: foot > 60 ? 1.15 : 1 })) return;
  const wg = r.sub.split(':')[0];
  for (const q of waveProps(g, wgs || [wg])) if (q.wg === wg && g.groups[q.name] && g.groups[q.name].on && rectDist(r, q.x, q.z) < 1.5) kickProp(D, q, from);
  const dp = Math.hypot(g.player.pos.x - cx, g.player.pos.z - cz);
  g.camRig.shake(clamp(0.9 - dp * 0.03, 0.15, 0.9));
}
// lo que había por medio (vallas, paja, leña, ropa tendida, rótulos): fuera,
// en astillas
export function kickProp(D, q, from) {
  const g = D.g;
  if (!g.groups[q.name] || !g.groups[q.name].on) return;
  g.setGroupVisible(q.name, false);
  const away = _v2.set(q.x - from.x, 0, q.z - from.z);
  if (away.lengthSq() < 0.01) away.set(0, 0, 1);
  away.normalize();
  for (let i = 0; i < 4; i++) D.chunks.add({ mat: i % 2 ? 'planks' : 'timber', size: [rnd(0.1, 0.2), rnd(0.08, 0.14), rnd(0.8, 1.6)], pos: new V3(q.x + rnd(-0.8, 0.8), rnd(0.4, 2.5), q.z + rnd(-0.8, 0.8)), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(away.x * rnd(3, 8), rnd(2, 6), away.z * rnd(3, 8)), spin: [rnd(-9, 9), rnd(-9, 9), rnd(-9, 9)], shatter: 99, life: 6 });
  D.splinters.burst(new V3(q.x, 1.2, q.z), 6, { speed: 6, up: 4, size: 0.8, spread: 0.6, dir: away.clone().multiplyScalar(0.6) });
  D.puff({ x: q.x, y: 0.6, z: q.z }, 2, { size: 1.4, speed: 2, life: 2.5, alpha: 0.4 });
  g.audio && g.audio.play('woodBreak', { x: q.x, y: 1, z: q.z }, { k: 0.9 });
}
