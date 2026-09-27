// Calcas (sangre, sigilos, sombras) y estandartes, agrupados por textura.
import * as THREE from 'three';
import { getTexture } from './textures.js';
import { registerMaterialPatch } from './materials.js';

export function buildDecals(scene, decals) {
  const groups = new Map();
  for (const d of decals) {
    const k = d.tex;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(d);
  }
  const meshes = [];
  for (const [tex, list] of groups) {
    const pos = [],
      uv = [],
      idx = [],
      col = [];
    let n = 0;
    for (const d of list) {
      const s = d.size / 2;
      const c = Math.cos(d.rot),
        si = Math.sin(d.rot);
      let corners;
      if (d.wall === 'z') {
        // en una pared perpendicular a Z (mira hacia ±Z)
        const nz = Math.abs(d.rot) > 1 ? -1 : 1;
        corners = [
          [-s, -s],
          [s, -s],
          [s, s],
          [-s, s],
        ].map(([a, b]) => [d.x + a * nz, d.y + b, d.z + 0.02 * nz]);
      } else if (d.wall === 'x') {
        const nx = d.rot < 0 ? -1 : 1;
        corners = [
          [-s, -s],
          [s, -s],
          [s, s],
          [-s, s],
        ].map(([a, b]) => [d.x + 0.02 * nx, d.y + b, d.z - a * nx]);
      } else {
        corners = [
          [-s, -s],
          [s, -s],
          [s, s],
          [-s, s],
        ].map(([a, b]) => [d.x + a * c - b * si, d.y + 0.012, d.z + a * si + b * c]);
        // en el suelo la cara mira hacia arriba: invertir orden
        corners = [corners[0], corners[3], corners[2], corners[1]];
      }
      for (const p of corners) pos.push(...p);
      if (d.wall) uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      else uv.push(0, 0, 0, 1, 1, 1, 1, 0);
      const o = d.opacity ?? 0.9;
      for (let i = 0; i < 4; i++) col.push(o, o, o);
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
      n += 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const m = new THREE.MeshBasicMaterial({
      map: getTexture(tex),
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      fog: true,
      side: THREE.DoubleSide,
      color: tex === 'splat' ? 0x9a8080 : tex === 'sigil' ? 0xb09090 : 0xffffff,
    });
    registerMaterialPatch(m);
    // las sombras oscurecen; la sangre/sigilos se tiñen con la luz ambiente baja
    const mesh = new THREE.Mesh(g, m);
    mesh.renderOrder = 1;
    mesh.frustumCulled = false;
    scene.add(mesh);
    meshes.push(mesh);
  }
  return meshes;
}

export function buildBanners(scene, banners) {
  const out = [];
  const byKind = new Map();
  for (const b of banners) {
    if (!byKind.has(b.kind)) byKind.set(b.kind, []);
    byKind.get(b.kind).push(b);
  }
  for (const [kind, list] of byKind) {
    const geos = [];
    for (const b of list) {
      const g = new THREE.PlaneGeometry(b.w, b.h, 1, 6);
      g.translate(0, -b.h / 2, 0);
      // ondulación estática para que no parezca una tabla
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        p.setZ(i, Math.sin(y * 2.3 + b.x) * 0.08 * (-y / b.h));
      }
      g.rotateY(b.rot);
      g.translate(b.x, b.y, b.z);
      geos.push(g);
    }
    const merged = geos.length === 1 ? geos[0] : mergeSimple(geos);
    merged.computeVertexNormals();
    const m = new THREE.MeshLambertMaterial({ map: getTexture(kind), alphaTest: 0.5, side: THREE.DoubleSide });
    registerMaterialPatch(m, { wind: true });
    const mesh = new THREE.Mesh(merged, m);
    scene.add(mesh);
    out.push(mesh);
  }
  return out;
}

function mergeSimple(geos) {
  const pos = [],
    uv = [],
    idx = [];
  let off = 0;
  for (const g of geos) {
    const p = g.attributes.position.array,
      u = g.attributes.uv.array,
      ix = g.index.array;
    pos.push(...p);
    uv.push(...u);
    for (const i of ix) idx.push(i + off);
    off += g.attributes.position.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
