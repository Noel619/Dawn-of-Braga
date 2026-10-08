// La campana mayor de la Sé, hecha incensario, colgando de la cadena del
// Turiferario.
//
// La cadena es una cuerda de Verlet (nudos unidos a distancia fija) que
// cuelga del puño derecho; el último nudo es el yugo de la campana, mucho
// más pesado. Para los golpes, la campana se puede "guiar": un muelle tira de
// ella hacia un punto que la pelea mueve (el arco del barrido, el punto del
// mazazo) y la física pone el resto (la cadena se tensa, se comba, latiguea).
// Clavada en el suelo tras el mazazo, la campana se queda fija y la cadena se
// convierte en un camino para trepar hasta la mano.
//
// Los eslabones se dibujan con una sola malla instanciada.
import * as THREE from 'three';
import { linkGeo } from '../../entities/colossus/parts.js';
import { colMat } from '../../gfx/materials.js';

const _v = new THREE.Vector3(),
  _v2 = new THREE.Vector3(),
  _q = new THREE.Quaternion(),
  _m = new THREE.Matrix4(),
  _s = new THREE.Vector3(1, 1, 1);
const Y = new THREE.Vector3(0, 1, 0);

export class BellChain {
  // bell: el grupo de la campana (su origen es el yugo, cuelga hacia -y)
  constructor(scene, bell, o = {}) {
    this.scene = scene;
    this.bell = bell;
    this.H = o.bellH ?? 6.2;
    this.R = o.radius ?? 3.0;
    this.len = o.len ?? 9.5;
    this.N = o.nodes ?? 15;
    this.seg = this.len / (this.N - 1);
    this.p = [];
    this.q = [];
    for (let i = 0; i < this.N; i++) {
      this.p.push(new THREE.Vector3());
      this.q.push(new THREE.Vector3());
    }
    // peso de cada nudo (inverso): el primero va cosido a la mano
    this.w = this.p.map((_, i) => (i === 0 ? 0 : i === this.N - 1 ? 0.08 : 1));
    this.up = new THREE.Vector3(0, 1, 0);
    this.vel = new THREE.Vector3();
    this.guide = null; // { target: Vector3, k, d }
    this.stuck = null; // posición del yugo clavado
    this.groundAt = o.groundAt || (() => 0);
    this.bounds = o.bounds || null; // [x0, z0, x1, z1]: no sale de la plaza
    // eslabones (dos por tramo, girados 90° uno respecto al otro)
    const links = o.links ?? 28;
    this.mesh = new THREE.InstancedMesh(linkGeo(o.linkR ?? 0.32, 0.085), colMat('iron'), links);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.links = links;
    scene.add(this.mesh);
    if (bell.parent !== scene) scene.add(bell);
    this._prevTop = new THREE.Vector3();
    this.ringT = 0;
  }
  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.scene.remove(this.bell);
  }
  get top() {
    return this.p[this.N - 1];
  }
  // el centro de la campana (golpes, choques)
  center(out = new THREE.Vector3()) {
    return out.copy(this.top).addScaledVector(this.up, -this.H * 0.55);
  }
  // la boca de la campana (el borde de abajo)
  mouth(out = new THREE.Vector3()) {
    return out.copy(this.top).addScaledVector(this.up, -this.H);
  }
  // cuelga recta desde la mano (al colocar al coloso)
  reset(hand) {
    for (let i = 0; i < this.N; i++) {
      this.p[i].set(hand.x, hand.y - i * this.seg, hand.z);
      this.q[i].copy(this.p[i]);
    }
    const t = this.top;
    const gy = this.groundAt(t.x, t.z) + this.H;
    if (t.y < gy) {
      // la campana en el suelo: la cadena se dobla hacia delante
      for (let i = 0; i < this.N; i++) {
        const y = Math.max(this.p[i].y, gy);
        this.p[i].y = y;
        this.q[i].copy(this.p[i]);
      }
    }
    this.up.set(0, 1, 0);
    this.vel.set(0, 0, 0);
    this.stuck = null;
    this.guide = null;
    this._prevTop.copy(this.top);
    this._sync(0);
  }
  // la campana clavada donde está ahora (mazazo)
  stick() {
    this.stuck = this.top.clone();
    this.vel.set(0, 0, 0);
  }
  release(impulse = null) {
    this.stuck = null;
    if (impulse) {
      // (Verlet: la velocidad es la diferencia con la posición anterior)
      this.q[this.N - 1].copy(this.top).addScaledVector(impulse, -1 / 120);
    }
  }

  update(dt, hand) {
    if (dt <= 0) return;
    const n = Math.max(1, Math.min(6, Math.ceil(dt / (1 / 120))));
    const h = dt / n;
    const N = this.N,
      P = this.p,
      Q = this.q;
    const G = -14; // algo más de gravedad: que pese
    this._prevTop.copy(this.top);
    for (let s = 0; s < n; s++) {
      // integración (con amortiguación del aire)
      for (let i = 1; i < N; i++) {
        const p = P[i],
          q = Q[i];
        const damp = i === N - 1 ? 0.995 : 0.985;
        const vx = (p.x - q.x) * damp,
          vy = (p.y - q.y) * damp,
          vz = (p.z - q.z) * damp;
        q.copy(p);
        let ax = 0,
          ay = G,
          az = 0;
        if (i === N - 1 && this.guide && !this.stuck) {
          const g = this.guide;
          const k = g.k ?? 40,
            d = g.d ?? 9;
          ax += k * (g.target.x - p.x) - (d * vx) / h;
          ay += k * (g.target.y - p.y) - (d * vy) / h + (g.antiGrav ? -G : 0);
          az += k * (g.target.z - p.z) - (d * vz) / h;
        }
        p.x += vx + ax * h * h;
        p.y += vy + ay * h * h;
        p.z += vz + az * h * h;
      }
      if (this.stuck) P[N - 1].copy(this.stuck);
      // restricciones de distancia (la mano manda; la campana pesa)
      P[0].copy(hand);
      for (let it = 0; it < 10; it++) {
        for (let i = 0; i < N - 1; i++) {
          const a = P[i],
            b = P[i + 1];
          const wa = this.w[i],
            wb = this.stuck && i + 1 === N - 1 ? 0 : this.w[i + 1];
          const ws = wa + wb;
          if (ws <= 0) continue;
          _v.subVectors(b, a);
          const L = _v.length() || 1e-6;
          // la cadena no se estira; floja, no empuja (no es una vara)
          const diff = (L - this.seg) / L;
          if (diff < 0) continue;
          a.addScaledVector(_v, (diff * wa) / ws);
          b.addScaledVector(_v, (-diff * wb) / ws);
        }
        P[0].copy(hand);
        // suelo y límites de la plaza
        for (let i = 1; i < N; i++) {
          const p = P[i];
          const last = i === N - 1;
          const gy = this.noGround ? -1e9 : this.groundAt(p.x, p.z);
          if (last) {
            // la campana: su boca no se mete en el suelo (tumbada, su costado)
            const lift = Math.max(this.R * 0.9, this.H * Math.max(0, this.up.y));
            if (p.y < gy + lift) {
              // (muy por debajo, saliendo de la tierra: sube poco a poco)
              p.y = gy + lift - p.y > 1 ? p.y + (gy + lift - p.y) * 0.05 : gy + lift;
              // roce con el suelo
              Q[i].x += (p.x - Q[i].x) * 0.12;
              Q[i].z += (p.z - Q[i].z) * 0.12;
            }
          } else if (p.y < gy + 0.3) p.y = gy + 0.3 - p.y > 1 ? p.y + (gy + 0.3 - p.y) * 0.05 : gy + 0.3;
          if (this.bounds) {
            const B = this.bounds;
            let x0 = B[0] + this.R,
              z0 = B[1] + this.R,
              x1 = B[2] - this.R,
              z1 = B[3] - this.R;
            if (!last) {
              // los eslabones siguen a la mano aunque se salga de la plaza (si
              // no, el tramo de la mano se estira y la cadena da tirones)
              x0 = Math.min(B[0] + 0.3, hand.x);
              z0 = Math.min(B[1] + 0.3, hand.z);
              x1 = Math.max(B[2] - 0.3, hand.x);
              z1 = Math.max(B[3] - 0.3, hand.z);
            }
            if (p.x < x0) p.x = x0;
            if (p.x > x1) p.x = x1;
            if (p.z < z0) p.z = z0;
            if (p.z > z1) p.z = z1;
          }
        }
        if (this.stuck) P[N - 1].copy(this.stuck);
      }
    }
    this.vel.subVectors(this.top, this._prevTop).multiplyScalar(1 / dt);
    // orientación: la campana cuelga del último tramo, con un poco de retraso
    _v.subVectors(P[N - 2], P[N - 1]);
    if (_v.lengthSq() > 1e-6 && !this.stuck) {
      _v.normalize();
      // tumbada en el suelo y sin tensión, se queda de lado
      this.up.lerp(_v, 1 - Math.exp(-dt * 7)).normalize();
    }
    this._sync(dt);
  }

  _sync() {
    const N = this.N,
      P = this.p;
    this.bell.position.copy(P[N - 1]);
    this.bell.quaternion.setFromUnitVectors(Y, this.up);
    // eslabones repartidos por la polilínea
    let total = 0;
    const segL = [];
    for (let i = 0; i < N - 1; i++) {
      const d = P[i].distanceTo(P[i + 1]);
      segL.push(d);
      total += d;
    }
    const L = this.links;
    let si = 0,
      acc = 0;
    for (let k = 0; k < L; k++) {
      const s = ((k + 0.5) / L) * total;
      while (si < N - 2 && acc + segL[si] < s) acc += segL[si++];
      const u = segL[si] > 0 ? (s - acc) / segL[si] : 0;
      _v.lerpVectors(P[si], P[si + 1], u);
      _v2.subVectors(P[si + 1], P[si]).normalize();
      _q.setFromUnitVectors(Y, _v2);
      if (k % 2) _q.multiply(_qr90);
      _m.compose(_v, _q, _s);
      this.mesh.setMatrixAt(k, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  // ¿toca la esfera (c, r) a la campana? (golpes al jugador, a las casas)
  hits(c, r) {
    this.center(_v);
    return _v.distanceTo(c) < this.R + r;
  }
  // el punto de la cadena más cercano a p (trepar por ella): devuelve s (0
  // en la campana, len en la mano) y la distancia
  nearest(p) {
    let best = 1e9,
      bs = 0;
    const N = this.N;
    for (let i = N - 1; i > 0; i--) {
      const a = this.p[i],
        b = this.p[i - 1];
      _v.subVectors(b, a);
      const L2 = _v.lengthSq() || 1e-6;
      const t = Math.max(0, Math.min(1, _v2.subVectors(p, a).dot(_v) / L2));
      _v2.copy(a).addScaledVector(_v, t);
      const d = _v2.distanceTo(p);
      if (d < best) {
        best = d;
        bs = (N - 1 - i + t) * this.seg;
      }
    }
    return { s: bs, d: best };
  }
  // posición y dirección (hacia la mano) en s (0 = la campana)
  at(s, out, dir) {
    const N = this.N;
    const f = Math.max(0, Math.min(N - 1 - 1e-4, s / this.seg));
    const i = Math.floor(f);
    const a = this.p[N - 1 - i],
      b = this.p[N - 2 - i];
    out.lerpVectors(a, b, f - i);
    // la dirección, fundida de un tramo al siguiente (la cadena es una
    // poligonal: a saltos, quien va agarrado a ella daría tirones)
    if (dir) dir.lerpVectors(this._tan(i, _v), this._tan(i + 1, _v2), f - i).normalize();
    return out;
  }
  // dirección en el nudo k (contando desde la campana)
  _tan(k, out) {
    const N = this.N,
      P = (j) => this.p[N - 1 - Math.max(0, Math.min(N - 1, j))];
    return out.subVectors(P(k + 1), P(k - 1)).normalize();
  }
}
const _qr90 = new THREE.Quaternion().setFromAxisAngle(Y, Math.PI / 2);
