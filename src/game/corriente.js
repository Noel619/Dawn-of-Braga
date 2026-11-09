// Lo que baja con el agua por los canales de las cloacas hondas: ramitas,
// hojas, briznas de paja, algún trapo. Sale de los caños, va por el canal
// (por el medio en los cruces, donde se junta el agua), se mece y da
// vueltas, y al llegar a un sumidero se cuela por la reja; al rato, otro
// sale del caño. Así se ve hacia dónde corre el agua. Los caminos, de la red
// (world/cloacas_hondas.js: L.corrientes).
import * as THREE from 'three';
import { objMat } from '../gfx/materials.js';

const _m = new THREE.Matrix4(),
  _q = new THREE.Quaternion(),
  _e = new THREE.Euler(),
  _p = new THREE.Vector3(),
  _s = new THREE.Vector3();

// lo que flota: su forma y su material
function kinds() {
  const ramita = new THREE.CylinderGeometry(0.012, 0.016, 0.34, 4);
  ramita.rotateZ(Math.PI / 2);
  // (una ramita con su horquilla)
  const brote = new THREE.CylinderGeometry(0.006, 0.01, 0.12, 3);
  brote.rotateZ(Math.PI / 2 - 0.7);
  brote.translate(0.08, 0.0, 0.035);
  const hoja = new THREE.SphereGeometry(0.06, 5, 2);
  hoja.scale(1.3, 0.12, 0.75);
  const paja = new THREE.BoxGeometry(0.2, 0.012, 0.05);
  const trapo = new THREE.BoxGeometry(0.17, 0.01, 0.13);
  return [
    { geo: ramita, extra: brote, mat: objMat('wooddark', { tint: 0x5a4636 }), w: 3 },
    { geo: hoja, mat: objMat('hoja', { tint: 0x6a6a3a }), w: 4 },
    { geo: paja, mat: objMat('straw', { tint: 0x8a7a50 }), w: 3 },
    { geo: trapo, mat: objMat('burlap', { tint: 0x4a4038 }), w: 1 },
  ];
}

export class Corriente {
  constructor(g) {
    this.g = g;
    this.paths = (g.level.L.corrientes || []).map((c) => {
      const L = [0];
      for (let i = 1; i < c.pts.length; i++) L.push(L[i - 1] + Math.hypot(c.pts[i][0] - c.pts[i - 1][0], c.pts[i][1] - c.pts[i - 1][1]));
      return { ...c, L, len: L[L.length - 1] };
    });
    this.kinds = kinds();
    const tot = this.kinds.reduce((a, k) => a + k.w, 0);
    let seed = 91;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    // (unos cuantos por camino: uno cada siete metros, más o menos)
    this.f = [];
    for (const P of this.paths) {
      const n = Math.max(2, Math.round(P.len / 7));
      for (let i = 0; i < n; i++) {
        let r = rnd() * tot,
          k = 0;
        while (r > this.kinds[k].w) r -= this.kinds[k++].w;
        this.f.push({ P, k, s: rnd() * P.len, v: 0.3 + rnd() * 0.22, off: (rnd() - 0.5) * 0.5, yaw: rnd() * 6.28, spin: (rnd() - 0.5) * 1.2, ph: rnd() * 6.28, st: 'flota', t: 0 });
      }
    }
    this.im = this.kinds.map((K) => {
      const n = Math.max(1, this.f.filter((q) => q.k === this.kinds.indexOf(K)).length);
      const geo = K.extra ? mergeTwo(K.geo, K.extra) : K.geo;
      const m = new THREE.InstancedMesh(geo, K.mat, n);
      m.frustumCulled = false;
      m.count = 0;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      // (con el subsuelo: game/culling.js)
      m.layers.set(1);
      g.scene.add(m);
      return m;
    });
  }

  // El punto del camino a la distancia s (y su dirección, y lo que falta
  // hasta el recodo más cercano).
  at(P, s, out) {
    const L = P.L;
    let i = 1;
    while (i < L.length - 1 && L[i] < s) i++;
    const a = P.pts[i - 1],
      b = P.pts[i];
    const seg = L[i] - L[i - 1] || 1;
    const u = Math.min(1, Math.max(0, (s - L[i - 1]) / seg));
    out.x = a[0] + (b[0] - a[0]) * u;
    out.z = a[1] + (b[1] - a[1]) * u;
    out.dx = (b[0] - a[0]) / seg;
    out.dz = (b[1] - a[1]) / seg;
    out.rec = Math.min(s - L[i - 1], L[i] - s);
    return out;
  }

  update(dt) {
    const g = this.g;
    const p = g.player.pos;
    const cnt = this.im.map(() => 0);
    // (sólo bajo tierra y cerca)
    if (p.y > -12) {
      for (const m of this.im) m.count = 0;
      return;
    }
    const t = g.time;
    const q = this._q || (this._q = {});
    for (const f of this.f) {
      const P = f.P;
      if (f.st === 'espera') {
        f.t -= dt;
        if (f.t > 0) continue;
        f.st = 'flota';
        f.s = 0;
        f.off = (Math.random() - 0.5) * 0.5;
      }
      let y = P.y + 0.012 + Math.sin(t * 2.3 + f.ph) * 0.006;
      let sc = 1;
      if (f.st === 'flota') {
        // (al salir del caño, cae al agua con el chorro)
        f.s += f.v * dt * (f.s < 0.5 ? 1.6 : 1);
        if (f.s >= P.len) {
          f.st = 'cae';
          f.t = 0;
        }
      }
      if (f.st === 'cae') {
        // (se cuela por la reja, o cae por el borde)
        f.t += dt;
        y -= f.t * f.t * 4;
        sc = Math.max(0, 1 - f.t * 1.6);
        if (sc <= 0) {
          f.st = 'espera';
          f.t = 1 + Math.random() * 9;
          continue;
        }
      }
      this.at(P, Math.min(f.s, P.len), q);
      // (cerca de un recodo o de un cruce, al medio del canal)
      const o = f.off * Math.min(1, q.rec / 0.7);
      const x = q.x - q.dz * o,
        z = q.z + q.dx * o;
      if (Math.abs(p.y - P.y) > 5 || (x - p.x) ** 2 + (z - p.z) ** 2 > 28 * 28) continue;
      f.yaw += f.spin * dt;
      // (las ramitas, más o menos a lo largo de la corriente)
      const yaw = f.k === 0 ? Math.atan2(q.dx, q.dz) + Math.PI / 2 + Math.sin(f.yaw) * 0.6 : f.yaw;
      _e.set(Math.sin(t * 1.7 + f.ph) * 0.08, yaw, Math.cos(t * 1.3 + f.ph) * 0.08, 'YXZ');
      _q.setFromEuler(_e);
      _m.compose(_p.set(x, y, z), _q, _s.set(sc, sc, sc));
      this.im[f.k].setMatrixAt(cnt[f.k]++, _m);
    }
    this.im.forEach((m, i) => {
      m.count = cnt[i];
      m.instanceMatrix.needsUpdate = true;
    });
  }
}

// (dos geometrías en una: la ramita y su brote)
function mergeTwo(a, b) {
  const A = a.index ? a.toNonIndexed() : a,
    B = b.index ? b.toNonIndexed() : b;
  const geo = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const x = A.attributes[name],
      y = B.attributes[name];
    const arr = new Float32Array(x.array.length + y.array.length);
    arr.set(x.array);
    arr.set(y.array, x.array.length);
    geo.setAttribute(name, new THREE.BufferAttribute(arr, x.itemSize));
  }
  return geo;
}
