// Lo que se viene abajo de verdad: un muro, una casa, un tramo de bóveda.
//
// Antes, al romperse, la pieza entera desaparecía en un fotograma y en su
// lugar aparecía la ruina. Ahora la pieza entera se ladea hacia donde la
// empujan y se hunde, cada vez más deprisa (como lo que pierde los cimientos),
// mientras la ruina aparece debajo, entre los cascotes y el polvo; cuando ya
// está medio enterrada, se oculta. Las mallas del mundo están en coordenadas
// de mundo (fusionadas por material), así que basta con moverlas enteras.
//
// Y de dónde salen los cascotes: de la superficie de la pieza de verdad (se
// eligen triángulos de sus mallas, por su área), con su material (la piedra
// del muro, el revoque, las tejas, la madera del entramado).
import * as THREE from 'three';
import { clamp } from '../../core/util.js';

const V3 = THREE.Vector3;
const _m = new THREE.Matrix4(),
  _m2 = new THREE.Matrix4(),
  _q = new THREE.Quaternion(),
  _a = new V3(),
  _b = new V3(),
  _c = new V3(),
  _n = new V3();

// el material de una malla del mundo (su cubo: 'grupo#material|cx|cz')
export function meshMat(m) {
  const k = m.userData.bucket || '';
  return k.split('#').pop().split('|')[0] || 'ashlar';
}

// Las áreas acumuladas de los triángulos de una malla (se guardan)
function areas(m) {
  if (m.userData._areas) return m.userData._areas;
  const g = m.geometry;
  const P = g.attributes.position,
    I = g.index;
  const nt = I ? I.count / 3 : P.count / 3;
  const acc = new Float32Array(nt);
  let s = 0;
  for (let t = 0; t < nt; t++) {
    const i0 = I ? I.getX(t * 3) : t * 3,
      i1 = I ? I.getX(t * 3 + 1) : t * 3 + 1,
      i2 = I ? I.getX(t * 3 + 2) : t * 3 + 2;
    _a.fromBufferAttribute(P, i0);
    _b.fromBufferAttribute(P, i1).sub(_a);
    _c.fromBufferAttribute(P, i2).sub(_a);
    s += _n.crossVectors(_b, _c).length() * 0.5;
    acc[t] = s;
  }
  m.userData._areas = acc;
  m.userData._area = s;
  return acc;
}

// n puntos de la superficie de las mallas de un grupo (por área), cada uno
// con su normal y su material: [{ p, n, mat }]. filter(p) descarta puntos
// (p. ej. los del suelo).
export function sampleSurface(meshes, n, filter = null) {
  const list = meshes.filter((m) => m.geometry && m.geometry.attributes.position && m.geometry.attributes.position.count >= 3);
  if (!list.length) return [];
  const tot = list.map((m) => (areas(m), m.userData._area));
  const sum = tot.reduce((a, b) => a + b, 0) || 1;
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 6) {
    let r = Math.random() * sum,
      mi = 0;
    while (mi < list.length - 1 && r > tot[mi]) r -= tot[mi++];
    const m = list[mi];
    const acc = m.userData._areas;
    // (búsqueda binaria del triángulo)
    const x = Math.random() * m.userData._area;
    let lo = 0,
      hi = acc.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (acc[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    const g = m.geometry,
      P = g.attributes.position,
      I = g.index;
    const i0 = I ? I.getX(lo * 3) : lo * 3,
      i1 = I ? I.getX(lo * 3 + 1) : lo * 3 + 1,
      i2 = I ? I.getX(lo * 3 + 2) : lo * 3 + 2;
    _a.fromBufferAttribute(P, i0);
    _b.fromBufferAttribute(P, i1);
    _c.fromBufferAttribute(P, i2);
    let u = Math.random(),
      v = Math.random();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const p = new V3().copy(_a).addScaledVector(_b.clone().sub(_a), u).addScaledVector(_c.clone().sub(_a), v);
    const nn = new V3().crossVectors(_b.sub(_a), _c.sub(_a)).normalize();
    p.applyMatrix4(m.matrixWorld);
    nn.transformDirection(m.matrixWorld);
    if (filter && !filter(p, nn)) continue;
    out.push({ p, n: nn, mat: meshMat(m) });
  }
  return out;
}

// la caja de las mallas de un grupo (en el mundo)
export function meshesBox(meshes, out = new THREE.Box3()) {
  out.makeEmpty();
  for (const m of meshes) {
    const g = m.geometry;
    if (!g) continue;
    if (!g.boundingBox) g.computeBoundingBox();
    out.union(_bx.copy(g.boundingBox).applyMatrix4(m.matrixWorld));
  }
  return out;
}
const _bx = new THREE.Box3();

export class Collapses {
  constructor(game) {
    this.g = game;
    this.list = [];
  }
  // El grupo 'name' se viene abajo. o: { dir (Vector3 horizontal: hacia
  // dónde cae), tilt (rad), drop (m: cuánto se hunde), dur (s), delay (s),
  // ruin (grupo de la ruina: aparece al empezar), shake, onEnd }
  // Devuelve { meshes, box } (para sacar los cascotes) o null si ya estaba
  // roto.
  start(name, o = {}) {
    const g = this.g;
    const G = g.groups[name];
    if (!G || !G.on) return null;
    const meshes = G.meshes.filter((m) => m.visible);
    const box = meshesBox(meshes);
    // roto ya para el resto del juego (las colisiones, los fuegos, lo que
    // pregunte si está entero); las mallas siguen a la vista mientras caen
    g.setGroupVisible(name, false);
    if (o.ruin) g.setGroupVisible(o.ruin, true);
    for (const m of meshes) m.visible = true;
    const c = new V3(),
      size = new V3();
    box.getCenter(c);
    box.getSize(size);
    const dir = o.dir ? new V3(o.dir.x, 0, o.dir.z) : new V3(0, 0, 0);
    if (dir.lengthSq() > 1e-6) dir.normalize();
    // gira sobre la arista de abajo del lado hacia el que cae
    const pivot = new V3(c.x + dir.x * size.x * 0.5, box.min.y, c.z + dir.z * size.z * 0.5);
    const axis = dir.lengthSq() > 1e-6 ? new V3(dir.z, 0, -dir.x) : new V3(1, 0, 0);
    const C = {
      name,
      G,
      meshes,
      box,
      pivot,
      axis,
      tilt: o.tilt ?? (dir.lengthSq() > 1e-6 ? 0.32 : 0.05),
      drop: o.drop ?? Math.max(2, size.y * 0.8),
      dur: o.dur ?? 1.1,
      t: -(o.delay ?? 0),
      onEnd: o.onEnd || null,
    };
    this.list.push(C);
    return C;
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const C = this.list[i];
      C.t += dt;
      if (C.t < 0) continue;
      const u = clamp(C.t / C.dur, 0, 1);
      // (cada vez más deprisa: arranca despacio, como lo que cede)
      const e = u * u * (1.4 - 0.4 * u);
      _q.setFromAxisAngle(C.axis, C.tilt * e);
      _m.makeTranslation(C.pivot.x, C.pivot.y - C.drop * e, C.pivot.z);
      _m.multiply(_m2.makeRotationFromQuaternion(_q));
      _m.multiply(_m2.makeTranslation(-C.pivot.x, -C.pivot.y, -C.pivot.z));
      for (const m of C.meshes) {
        m.matrix.copy(_m);
        m.matrixWorldNeedsUpdate = true;
      }
      if (u >= 1) {
        this._restore(C);
        this.list.splice(i, 1);
        if (C.onEnd) C.onEnd(C);
      }
    }
  }
  _restore(C) {
    const g = this.g;
    for (const m of C.meshes) {
      m.matrix.identity();
      m.matrixWorldNeedsUpdate = true;
      // (oculta si el grupo sigue roto: si se volvió a un punto de control,
      // lo deja como diga el grupo)
      const all = !m._groups || m._groups.every((n) => g.groups[n].on);
      m.visible = all;
    }
  }
  // todo en su sitio (al volver a un punto de control)
  clear() {
    for (const C of this.list) this._restore(C);
    this.list.length = 0;
  }
}
