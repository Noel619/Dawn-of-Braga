// Un coloso montado: esqueleto (huesos con su posición de reposo en el
// espacio del modelo), mallas de carne y de ropa con piel (SkinnedMesh) y
// piezas rígidas colgadas de los huesos, con los materiales del juego.
//
// La geometría la hacen los constructores de cada coloso (turiferario.js,
// deo.js) sin tocar materiales ni texturas, así que puede generarse en un Web
// Worker: pack() la convierte en arrays transferibles y assemble() monta el
// modelo en el hilo principal.
import * as THREE from 'three';
import { colMat, cloneMat } from '../../gfx/materials.js';

const DEG = Math.PI / 180;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class ColossusModel {
  constructor(bonesDef) {
    this.root = new THREE.Group();
    this.bones = [];
    this.byName = {};
    this.index = {};
    this.restWorld = {};
    this.parentOf = {};
    for (const b of bonesDef) {
      const bone = new THREE.Bone();
      bone.name = b.name;
      const par = b.parent ? this.byName[b.parent] : null;
      const pp = par ? this.restWorld[b.parent] : V(0, 0, 0);
      bone.position.set(b.pos[0] - pp.x, b.pos[1] - pp.y, b.pos[2] - pp.z);
      (par || this.root).add(bone);
      this.index[b.name] = this.bones.length;
      this.bones.push(bone);
      this.byName[b.name] = bone;
      this.restWorld[b.name] = V(...b.pos);
      this.parentOf[b.name] = b.parent || null;
    }
    this.root.updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(this.bones);
    this.meshes = [];
    this.parts = [];
    this.groups = {};
    this.restQ = this.bones.map((b) => b.quaternion.clone());
    this.restP = this.bones.map((b) => b.position.clone());
    this.mats = new Set();
  }
  _mat(name, o = {}) {
    let m = colMat(name, o);
    // (cada coloso con sus materiales: destellos y sonda sin tocar a otros)
    if (this.own) {
      const key = name + '|' + (o.side === THREE.DoubleSide ? 1 : 0) + '|' + (o.tri ?? '') + '|' + (o.giant ? JSON.stringify(o.giant) : '');
      this._own = this._own || new Map();
      if (!this._own.has(key)) this._own.set(key, cloneMat(m));
      m = this._own.get(key);
    }
    this.mats.add(m);
    return m;
  }
  // malla esculpida (o ropa) con piel
  skinned(geo, matNames, matOpts = {}, o = {}) {
    const mats = matNames.map((m) => this._mat(m, { ...(matOpts[m] || {}), side: o.ds ? THREE.DoubleSide : (matOpts[m] || {}).side }));
    const mesh = new THREE.SkinnedMesh(geo, mats.length > 1 ? mats : mats[0]);
    if (mats.length === 1) geo.clearGroups();
    mesh.frustumCulled = false;
    if (o.name) mesh.name = o.name;
    this.root.add(mesh);
    mesh.bind(this.skeleton);
    this.meshes.push(mesh);
    return mesh;
  }
  // piezas rígidas: geometrías en el espacio del modelo, agrupadas por hueso y material
  rigid(list) {
    const groups = new Map();
    for (const it of list) {
      const key = it.bone + '|' + it.mat + '|' + (it.ds ? 1 : 0) + '|' + (it.tri || 0) + '|' + (it.grp || '');
      if (!groups.has(key)) groups.set(key, { ...it, geos: [] });
      groups.get(key).geos.push(it.geo);
    }
    for (const g of groups.values()) {
      const geo = g.geos.length > 1 ? mergeAll(g.geos) : g.geos[0];
      if (!g.local) {
        const rw = this.restWorld[g.bone];
        geo.translate(-rw.x, -rw.y, -rw.z);
      }
      geo.computeBoundingSphere();
      const mat = this._mat(g.mat, { side: g.ds ? THREE.DoubleSide : THREE.FrontSide, tri: g.tri, giant: g.giant });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      if (g.grp) mesh.userData.grp = g.grp;
      this.byName[g.bone].add(mesh);
      this.parts.push(mesh);
    }
  }
  // grupos libres (no van con un hueso: la campana, la cadena)
  group(name, parts) {
    const grp = new THREE.Group();
    grp.name = name;
    const by = new Map();
    for (const p of parts) {
      const key = p.mat + '|' + (p.ds ? 1 : 0);
      if (!by.has(key)) by.set(key, { ...p, geos: [] });
      by.get(key).geos.push(p.geo);
    }
    for (const g of by.values()) {
      const geo = g.geos.length > 1 ? mergeAll(g.geos) : g.geos[0];
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, this._mat(g.mat, { side: g.ds ? THREE.DoubleSide : THREE.FrontSide, tri: g.tri, giant: g.giant }));
      mesh.frustumCulled = false;
      grp.add(mesh);
    }
    this.groups[name] = grp;
    return grp;
  }
  // pose estática en grados ({ hueso: [rx, ry, rz] }); la animación de verdad
  // la lleva colossus_rig.js
  pose(p) {
    const e = new THREE.Euler();
    const q = new THREE.Quaternion();
    this.bones.forEach((b, i) => {
      const r = p[b.name];
      if (r) {
        e.set(r[0] * DEG, r[1] * DEG, r[2] * DEG, 'XYZ');
        q.setFromEuler(e);
        b.quaternion.copy(this.restQ[i]).multiply(q);
      } else b.quaternion.copy(this.restQ[i]);
      b.position.copy(this.restP[i]);
    });
    this.root.updateMatrixWorld(true);
  }
  // luz del sitio (sonda) y oclusión junto al suelo para todos sus materiales
  setProbe(r, g, b, groundY = 0, ao = 0.3) {
    for (const m of this.mats) {
      if (!m._u) continue;
      m._u.uProbe.value.set(r, g, b);
      m._u.uGround.value.set(groundY, ao);
    }
  }
  // destello de daño (emisión) en todos sus materiales; null lo apaga
  setFlash(color, k) {
    for (const m of this.mats) {
      if (!m.emissive) continue;
      if (m.userData.baseEm === undefined) m.userData.baseEm = m.emissive.clone();
      if (!color || k <= 0) m.emissive.copy(m.userData.baseEm);
      else m.emissive.copy(m.userData.baseEm).lerp(color, k);
    }
  }
  stats() {
    let tris = 0,
      calls = 0;
    this.root.traverse((o) => {
      if (!o.isMesh) return;
      const g = o.geometry;
      const n = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
      tris += n;
      calls += Array.isArray(o.material) ? g.groups.length || 1 : 1;
    });
    for (const k in this.groups) {
      if (this.groups[k].parent) continue;
      this.groups[k].traverse((o) => {
        if (!o.isMesh) return;
        const g = o.geometry;
        tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
        calls++;
      });
    }
    return { tris: Math.round(tris), calls };
  }
}

// Fusiona geometrías con atributos posición, normal, uv y color (añade los
// que falten) en una sola, sin índices.
export function mergeAll(geos) {
  let n = 0;
  const list = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of list) n += g.attributes.position.count;
  const P = new Float32Array(n * 3),
    N = new Float32Array(n * 3),
    U = new Float32Array(n * 2),
    C = new Float32Array(n * 3);
  let o = 0;
  for (const g of list) {
    const c = g.attributes.position.count;
    P.set(g.attributes.position.array, o * 3);
    if (g.attributes.normal) N.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) U.set(g.attributes.uv.array, o * 2);
    if (g.attributes.color) C.set(g.attributes.color.array.subarray(0, c * 3), o * 3);
    else C.fill(0.85, o * 3, (o + c) * 3);
    o += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  out.setAttribute('color', new THREE.BufferAttribute(C, 3));
  return out;
}

// ------------------------------------------------------------ de hilo a hilo
// BufferGeometry -> objeto con arrays (transferibles) y vuelta.
export function packGeo(g) {
  const attrs = {};
  for (const k in g.attributes) {
    const a = g.attributes[k];
    attrs[k] = { array: a.array, itemSize: a.itemSize, normalized: a.normalized };
  }
  return { attrs, index: g.index ? g.index.array : null, groups: g.groups.map((q) => ({ ...q })) };
}
export function unpackGeo(o) {
  const g = new THREE.BufferGeometry();
  for (const k in o.attrs) {
    const a = o.attrs[k];
    g.setAttribute(k, new THREE.BufferAttribute(a.array, a.itemSize, a.normalized));
  }
  if (o.index) g.setIndex(new THREE.BufferAttribute(o.index, 1));
  for (const q of o.groups || []) g.addGroup(q.start, q.count, q.materialIndex);
  g.computeBoundingSphere();
  return g;
}
// Los datos de un coloso (bones, skinned, rigid, groups, extra) listos para
// postMessage: devuelve [datos, lista de transferibles].
export function packData(d) {
  const tr = [];
  const pg = (g) => {
    const o = packGeo(g);
    for (const k in o.attrs) tr.push(o.attrs[k].array.buffer);
    if (o.index) tr.push(o.index.buffer);
    return o;
  };
  const out = {
    bones: d.bones,
    skinned: d.skinned.map((s) => ({ ...s, geo: pg(s.geo) })),
    rigid: d.rigid.map((r) => ({ ...r, geo: pg(r.geo) })),
    groups: Object.fromEntries(Object.entries(d.groups || {}).map(([k, parts]) => [k, parts.map((p) => ({ ...p, geo: pg(p.geo) }))])),
    extra: d.extra || {},
    stats: d.stats || null,
  };
  return [out, [...new Set(tr)]];
}
export function unpackData(o) {
  return {
    bones: o.bones,
    skinned: o.skinned.map((s) => ({ ...s, geo: unpackGeo(s.geo) })),
    rigid: o.rigid.map((r) => ({ ...r, geo: unpackGeo(r.geo) })),
    groups: Object.fromEntries(Object.entries(o.groups || {}).map(([k, parts]) => [k, parts.map((p) => ({ ...p, geo: unpackGeo(p.geo) }))])),
    extra: o.extra || {},
    stats: o.stats || null,
  };
}

// Monta el modelo con sus materiales. own: materiales propios.
export function assemble(d, o = {}) {
  const M = new ColossusModel(d.bones);
  M.own = !!o.own;
  for (const s of d.skinned) M.skinned(s.geo, s.mats, s.matOpts || {}, { ds: s.ds, name: s.name });
  M.rigid(d.rigid);
  for (const k in d.groups || {}) M.group(k, d.groups[k]);
  M.extra = d.extra || {};
  M.buildStats = d.stats || null;
  return M;
}
