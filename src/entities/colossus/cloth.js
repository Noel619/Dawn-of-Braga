// Ropa de los colosos: telas que cuelgan alrededor de un eje vertical
// (casullas, albas, faldones), como una rejilla de anillos con pliegues,
// desgarros y bajo deshilachado, con UV de verdad (los brocados y las
// cenefas se ven nítidos, sin el triplanar de la carne) y pesos de piel para
// los huesos del cuerpo y los de la propia tela (que la animación mueve con
// muelles: la tela se balancea, se arrastra y rebota).
//
// Ángulo θ alrededor del eje: 0 = delante (+z), π/2 = el costado izquierdo
// del personaje (+x), π = la espalda. v va de 0 (arriba) a 1 (abajo).
import * as THREE from 'three';
import { perlin } from './sculpt.js';

// o: {
//   y0, y1          alturas de arriba y de abajo (y0 > y1)
//   a0, a1          arco de ángulos (por defecto la vuelta entera)
//   nu, nv          divisiones
//   center(v)       [cx, cz] del eje a esa altura (torsos encorvados)
//   radius(θ, v)    radio de la tela
//   yAt(θ, v)       altura (por defecto, de y0 a y1)
//   folds           { n, amp(v), wobble } pliegues verticales
//   cut(θ)          hasta dónde llega (0..1) en ese ángulo: el bajo roto
//   hole(θ, v)      true donde la tela está rasgada
//   mat(θ, v, hem)  índice de material (cenefas); hem: filas hasta el bajo
//   weights(p, θ, v) [[hueso, peso], ...]
//   tint(p, θ, v)   [r, g, b]
//   uv              [metros por unidad en u, en v]
// }
export function clothRing(o) {
  const nu = o.nu ?? 48,
    nv = o.nv ?? 24;
  const a0 = o.a0 ?? -Math.PI,
    a1 = o.a1 ?? Math.PI;
  const closed = o.a0 === undefined && o.a1 === undefined;
  const cols = closed ? nu : nu + 1;
  const P = new Float32Array(cols * (nv + 1) * 3);
  const TH = new Float32Array(cols);
  const F = o.folds || { n: 0, amp: () => 0 };
  const yAt = o.yAt || ((th, v) => o.y0 + (o.y1 - o.y0) * v);
  for (let i = 0; i < cols; i++) TH[i] = a0 + ((a1 - a0) * i) / nu;
  // el bajo: cada columna estira sus filas para que la última caiga justo en
  // su corte (si no, el borde sale en escalera)
  const cut = o.cut || (() => 1);
  const cutAt = new Float32Array(cols),
    JC = new Int32Array(cols);
  for (let i = 0; i < cols; i++) {
    cutAt[i] = Math.max(0.02, Math.min(1, cut(TH[i])));
    JC[i] = Math.max(1, Math.min(nv, Math.round(cutAt[i] * nv)));
  }
  const VE = new Float32Array(cols * (nv + 1));
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i < cols; i++) VE[j * cols + i] = j <= JC[i] ? (j / JC[i]) * cutAt[i] : cutAt[i] + (j - JC[i]) / nv;
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i < cols; i++) {
      const v = VE[j * cols + i];
      const c = o.center ? o.center(v) : [0, 0];
      const th = TH[i];
      let r = o.radius(th, v);
      if (F.n) {
        const w = F.wobble ?? 0.6;
        const ph = perlin(th * 1.3, v * 2.1, 3.7) * w * 3;
        r += F.amp(v) * (Math.sin(th * F.n + ph) * 0.75 + perlin(th * 3.1, v * 4.0, 1.3) * 0.5);
      }
      const k = (j * cols + i) * 3;
      P[k] = c[0] + Math.sin(th) * r;
      P[k + 1] = yAt(th, v);
      P[k + 2] = c[1] + Math.cos(th) * r;
    }
  }
  // normales por diferencias en la rejilla (hacia fuera)
  const idx = (i, j) => j * cols + (closed ? ((i % cols) + cols) % cols : Math.max(0, Math.min(cols - 1, i)));
  const N = new Float32Array(P.length);
  const t1 = new THREE.Vector3(),
    t2 = new THREE.Vector3(),
    n = new THREE.Vector3();
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i < cols; i++) {
      const a = idx(i + 1, j) * 3,
        b = idx(i - 1, j) * 3;
      const c2 = Math.min(nv, j + 1) * cols + (i % cols),
        d2 = Math.max(0, j - 1) * cols + (i % cols);
      t1.set(P[a] - P[b], P[a + 1] - P[b + 1], P[a + 2] - P[b + 2]);
      t2.set(P[c2 * 3] - P[d2 * 3], P[c2 * 3 + 1] - P[d2 * 3 + 1], P[c2 * 3 + 2] - P[d2 * 3 + 2]);
      n.crossVectors(t2, t1).normalize();
      const k = (j * cols + i) * 3;
      N[k] = n.x;
      N[k + 1] = n.y;
      N[k + 2] = n.z;
    }
  // caras (por material), sin las rasgadas ni lo que queda por debajo del bajo
  // (entre dos columnas de largo distinto, la más corta se queda en su última
  // fila: el borde baja en diagonal)
  const nMat = o.nMat ?? 1;
  const byMat = Array.from({ length: nMat }, () => []);
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < (closed ? cols : cols - 1); i++) {
      const i1 = closed ? (i + 1) % cols : i + 1;
      if (j + 1 > Math.max(JC[i], JC[i1])) continue;
      const thm = closed && i === cols - 1 ? TH[i] + (a1 - a0) / nu / 2 : (TH[i] + TH[i1]) / 2;
      const vm = (VE[Math.min(j, JC[i]) * cols + i] + VE[Math.min(j + 1, JC[i1]) * cols + i1]) / 2;
      if (o.hole && o.hole(thm, vm)) continue;
      // (filas que quedan hasta el bajo: las cenefas siguen el borde exacto)
      const m = o.mat ? o.mat(thm, vm, Math.min(JC[i], JC[i1]) - (j + 1)) : 0;
      const A = Math.min(j, JC[i]) * cols + i,
        B = Math.min(j, JC[i1]) * cols + i1,
        C = Math.min(j + 1, JC[i1]) * cols + i1,
        D = Math.min(j + 1, JC[i]) * cols + i;
      if (A !== D && D !== C) byMat[m].push(A, D, C);
      if (C !== B) byMat[m].push(A, C, B);
    }
  }
  // atributos por vértice (las costuras de la vuelta repiten vértice para
  // que la UV no se doble: se desdobla al final)
  const nvert = cols * (nv + 1);
  const UV = new Float32Array(nvert * 2);
  const C = new Float32Array(nvert * 3);
  const SI = new Uint16Array(nvert * 4);
  const SW = new Float32Array(nvert * 4);
  const su = o.uv ? o.uv[0] : 1,
    sv = o.uv ? o.uv[1] : 1;
  const p = new THREE.Vector3();
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      const v = VE[k];
      p.set(P[k * 3], P[k * 3 + 1], P[k * 3 + 2]);
      const th = TH[i];
      // u en metros a lo largo de la tela (aprox.: radio medio por ángulo)
      const r = o.radius(th, v);
      UV[k * 2] = ((th - a0) * r) / su;
      UV[k * 2 + 1] = ((o.y0 - p.y) / sv) * 1;
      const t = o.tint ? o.tint(p, th, v) : [1, 1, 1];
      // los pliegues hondos, más oscuros
      let sh = 1;
      if (F.n) sh = 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(th * F.n + perlin(th * 1.3, v * 2.1, 3.7) * (F.wobble ?? 0.6) * 3));
      C[k * 3] = t[0] * sh;
      C[k * 3 + 1] = t[1] * sh;
      C[k * 3 + 2] = t[2] * sh;
      const W = o.weights(p, th, v).filter((q) => q[1] > 0);
      W.sort((a, b) => b[1] - a[1]);
      let tw = 0;
      for (let q = 0; q < Math.min(4, W.length); q++) tw += W[q][1];
      for (let q = 0; q < 4; q++) {
        SI[k * 4 + q] = W[q] ? W[q][0] : 0;
        SW[k * 4 + q] = W[q] ? W[q][1] / (tw || 1) : 0;
      }
    }
  }
  const index = [];
  const g = new THREE.BufferGeometry();
  byMat.forEach((L, m) => {
    if (!L.length) return;
    g.addGroup(index.length, L.length, m);
    for (const q of L) index.push(q);
  });
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
  g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
  g.setIndex(nvert > 65535 ? new THREE.Uint32BufferAttribute(index, 1) : new THREE.Uint16BufferAttribute(index, 1));
  g.computeBoundingSphere();
  return g;
}

// Pesos que se reparten entre huesos de tela según el ángulo (los más
// cercanos, con caída suave) y entre el cuerpo y la tela según la altura.
// bones: [{ th, top, low }] (índices de hueso por tramo); body: índice del
// hueso al que va cosida por arriba; vBody: hasta dónde manda el cuerpo.
export function ringWeights(bones, body, vBody = 0.25, spread = 0.6) {
  return (p, th, v) => {
    const out = [];
    const kb = Math.max(0, Math.min(1, 1 - v / vBody));
    if (kb > 0) out.push([body, kb * kb * (3 - 2 * kb)]);
    const rest = 1 - (kb > 0 ? kb * kb * (3 - 2 * kb) : 0);
    if (rest <= 0) return out;
    let ws = 0;
    const tmp = [];
    for (const b of bones) {
      let d = Math.abs(th - b.th) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      const w = Math.exp(-(d * d) / (spread * spread));
      tmp.push([b, w]);
      ws += w;
    }
    for (const [b, w] of tmp) {
      const k = (w / ws) * rest;
      // arriba el primer tramo, abajo el segundo
      const lowK = Math.max(0, Math.min(1, (v - b.split) / Math.max(0.05, 1 - b.split)));
      if (b.low === undefined) out.push([b.top, k]);
      else {
        out.push([b.top, k * (1 - lowK)]);
        out.push([b.low, k * lowK]);
      }
    }
    return out;
  };
}
