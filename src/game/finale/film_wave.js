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
const DUST = [0.26, 0.24, 0.22];

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
// Una casa revienta: sus muros y su tejado, en trozos que salen despedidos
// lejos del gigante; polvo, tejas, vigas y lo que colgaba de ella
export function smashHouse(D, r, from, wgs = null) {
  const g = D.g,
    a = g.audio;
  if (!D.breakHouse(r.sub)) return;
  const wg = r.sub.split(':')[0];
  for (const q of waveProps(g, wgs || [wg])) if (q.wg === wg && g.groups[q.name] && g.groups[q.name].on && rectDist(r, q.x, q.z) < 1.5) kickProp(D, q, from);
  const cx = (r.x0 + r.x1) / 2,
    cz = (r.z0 + r.z1) / 2;
  const away = _v.set(cx - from.x, 0, cz - from.z);
  if (away.lengthSq() < 0.01) away.set(0, 0, 1);
  away.normalize();
  const h = r.h || 7;
  const n = Math.min(16, Math.round(8 + (r.x1 - r.x0) * (r.z1 - r.z0) * 0.08));
  const wall = r.style === 'plaster' ? 'plaster' : 'wallstone';
  for (let i = 0; i < n; i++) {
    const roof = i % 3 === 0;
    D.chunks.add({ mat: roof ? 'roof' : i % 4 === 1 ? 'timber' : wall, size: roof ? [rnd(0.8, 1.4), 0.14, rnd(0.6, 1.0)] : [rnd(0.6, 1.3), rnd(0.4, 0.9), rnd(0.5, 1.0)], pos: new V3(rnd(r.x0 + 0.4, r.x1 - 0.4), rnd(1.5, h + 0.8), rnd(r.z0 + 0.4, r.z1 - 0.4)), rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)], vel: new V3(away.x * rnd(3, 10) + rnd(-2, 2), rnd(2, 8), away.z * rnd(3, 10) + rnd(-2, 2)), spin: [rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)], shatter: 11, life: 8 });
  }
  D.debris.burst(new V3(cx, h * 0.45, cz), 24, { speed: 8, up: 5, size: 1.0, spread: 3, dir: away.clone().multiplyScalar(0.6) });
  for (let k = 0; k < 3; k++) g.fx.blood.emit(rnd(r.x0, r.x1), rnd(1, h), rnd(r.z0, r.z1), 40, { color: DUST, speed: 5, life: 2.6, up: 1.2, gravity: 0.3 });
  const at = { x: cx, y: 3, z: cz };
  a && a.play('wallBreak', at, { k: 1.8 });
  a && a.play(Math.random() < 0.5 ? 'woodBreak' : 'pillarBreak', at, { k: 1.4 });
  const dp = Math.hypot(g.player.pos.x - cx, g.player.pos.z - cz);
  g.camRig.shake(clamp(0.9 - dp * 0.03, 0.15, 0.9));
  g.input.rumble(0.6, 0.8, 250);
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
  g.fx.blood.emit(q.x, 0.8, q.z, 16, { color: DUST, speed: 3, life: 1.2, up: 1 });
  g.audio && g.audio.play('woodBreak', { x: q.x, y: 1, z: q.z }, { k: 0.9 });
}
