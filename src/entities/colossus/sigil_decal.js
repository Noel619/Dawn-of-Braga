// El sigilo del Pacto tallado en la carne de un coloso (sus puntos débiles).
//
// No es una pieza aparte: se copian los triángulos de su propia piel
// alrededor del sigilo (con sus huesos y sus pesos) y se les pinta encima la
// herida (textura 'sigilFlesh': los tajos que arden y la carne requemada,
// transparente en el borde). La malla nueva va con el mismo esqueleto, así
// que se dobla, respira y se sacude con el cuerpo: el sigilo está EN la piel,
// nunca flotando delante de ella.
import * as THREE from 'three';
import { colMat, cloneMat } from '../../gfx/materials.js';

// mesh: la malla con piel de la que sale (SkinnedMesh del modelo M); c, n:
// centro y normal (espacio del modelo, en reposo); R: radio (m). o.rot: giro
// del dibujo (rad); o.off: cuánto se separa de la piel (m).
export function sigilDecal(M, mesh, c, n, R, o = {}) {
  const geo = mesh.geometry;
  const P = geo.attributes.position,
    Nr = geo.attributes.normal,
    Cc = geo.attributes.color,
    SI = geo.attributes.skinIndex,
    SW = geo.attributes.skinWeight;
  const idx = geo.index;
  const C = new THREE.Vector3(...c);
  const Nn = new THREE.Vector3(...n).normalize();
  // ejes del dibujo sobre el plano del sigilo ('arriba' del dibujo, hacia
  // arriba en el modelo)
  const up = Math.abs(Nn.y) > 0.92 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
  const U = new THREE.Vector3().crossVectors(up, Nn).normalize();
  const Vv = new THREE.Vector3().crossVectors(Nn, U).normalize();
  if (o.rot) {
    const q = new THREE.Quaternion().setFromAxisAngle(Nn, o.rot);
    U.applyQuaternion(q);
    Vv.applyQuaternion(q);
  }
  const off = o.off ?? 0.025;
  const pos = [],
    nor = [],
    col = [],
    uv = [],
    si = [],
    sw = [],
    out = [];
  const map = new Map();
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    d = new THREE.Vector3(),
    fn = new THREE.Vector3(),
    t1 = new THREE.Vector3(),
    t2 = new THREE.Vector3();
  const nt = idx ? idx.count / 3 : P.count / 3;
  const vid = (v) => {
    if (map.has(v)) return map.get(v);
    const i = pos.length / 3;
    map.set(v, i);
    const nx = Nr.getX(v),
      ny = Nr.getY(v),
      nz = Nr.getZ(v);
    const x = P.getX(v),
      y = P.getY(v),
      z = P.getZ(v);
    pos.push(x + nx * off, y + ny * off, z + nz * off);
    nor.push(nx, ny, nz);
    if (Cc) col.push(Cc.getX(v), Cc.getY(v), Cc.getZ(v));
    else col.push(1, 1, 1);
    d.set(x - C.x, y - C.y, z - C.z);
    uv.push(0.5 + d.dot(U) / (2 * R), 0.5 + d.dot(Vv) / (2 * R));
    for (let q = 0; q < 4; q++) {
      si.push(SI.getComponent(v, q));
      sw.push(SW.getComponent(v, q));
    }
    return i;
  };
  for (let t = 0; t < nt; t++) {
    const ia = idx ? idx.getX(t * 3) : t * 3,
      ib = idx ? idx.getX(t * 3 + 1) : t * 3 + 1,
      ic = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(P, ia);
    b.fromBufferAttribute(P, ib);
    d.fromBufferAttribute(P, ic);
    // dentro del radio (los tres vértices, con algo de margen) y de cara
    if (a.distanceTo(C) > R * 1.08 || b.distanceTo(C) > R * 1.08 || d.distanceTo(C) > R * 1.08) continue;
    fn.crossVectors(t1.subVectors(b, a), t2.subVectors(d, a)).normalize();
    if (fn.dot(Nn) < 0.2) continue;
    out.push(vid(ia), vid(ib), vid(ic));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.setIndex(out);
  g.computeBoundingSphere();
  // material propio (cada sigilo late a su ritmo y se apaga al morir)
  const mat = cloneMat(colMat('colSigilFlesh', { tri: 0 }));
  mat.transparent = true;
  mat.depthWrite = false;
  mat.alphaTest = 0.02;
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -2;
  mat.polygonOffsetUnits = -4;
  const m = new THREE.SkinnedMesh(g, mat);
  m.name = 'sigil';
  m.frustumCulled = false;
  m.renderOrder = 2;
  M.root.add(m);
  m.bind(M.skeleton, mesh.bindMatrix);
  return m;
}
