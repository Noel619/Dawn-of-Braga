// Trozos grandes que caen: losas del suelo de la cisterna, dovelas de la
// cúpula y de la bóveda de la nave, tambores de columna, sillares de la
// muralla, coronas de velas, vigas. Cada uno es una malla con su material de
// mundo y física sencilla (gravedad, giro, botes contra el suelo con roce);
// al estrellarse fuerte revientan en cascotes y polvo. También pueden ir
// «pegados» a algo (la losa sobre la joroba del gigante) y soltarse luego con
// la velocidad que llevaban.
import * as THREE from 'three';
import { objMat } from '../../gfx/materials.js';

const _v = new THREE.Vector3(),
  _q = new THREE.Quaternion(),
  _m = new THREE.Matrix4();

// caja con UV en metros (la textura no se estira) y caras algo más oscuras
// por debajo (como la oclusión del mundo)
const _geoCache = new Map();
export function slabGeo(sx, sy, sz, uv = 0.5) {
  const key = [sx, sy, sz, uv].map((v) => v.toFixed(3)).join(',');
  if (_geoCache.has(key)) return _geoCache.get(key);
  const g = new THREE.BoxGeometry(sx, sy, sz);
  const P = g.attributes.position,
    N = g.attributes.normal,
    U = g.attributes.uv;
  for (let i = 0; i < P.count; i++) {
    const nx = Math.abs(N.getX(i)),
      ny = Math.abs(N.getY(i));
    const a = nx > 0.5 ? [P.getZ(i), P.getY(i)] : ny > 0.5 ? [P.getX(i), P.getZ(i)] : [P.getX(i), P.getY(i)];
    U.setXY(i, a[0] * uv, a[1] * uv);
  }
  const C = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) {
    const k = N.getY(i) < -0.5 ? 0.55 : N.getY(i) > 0.5 ? 1 : 0.8;
    C[i * 3] = C[i * 3 + 1] = C[i * 3 + 2] = k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  _geoCache.set(key, g);
  return g;
}

export class Chunks {
  constructor(game, debris) {
    this.g = game;
    this.debris = debris;
    this.list = [];
    this.groundAt = (x, z, y) => game.world.col.groundHeight(x, z, 0.3, y, true);
  }
  // Un trozo: o = { mat, size: [x, y, z] | geo, pos, quat | rot ([x, y, z] rad),
  //   vel, spin ([x, y, z] rad/s), life, bounce, shatter (velocidad a la que
  //   revienta al chocar), uv, floor (altura del suelo fija), tint, attach:
  //   () => Matrix4 (pegado a algo), dust }
  add(o) {
    const geo = o.geo || slabGeo(o.size[0], o.size[1], o.size[2], o.uv ?? 0.5);
    const mat = o.material || objMat(o.mat || 'ashlar', o.tint ? { tint: o.tint } : {});
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    this.g.scene.add(mesh);
    const c = {
      mesh,
      p: new THREE.Vector3().copy(o.pos),
      q: o.quat ? o.quat.clone() : new THREE.Quaternion().setFromEuler(new THREE.Euler(...(o.rot || [0, 0, 0]))),
      v: o.vel ? new THREE.Vector3().copy(o.vel) : new THREE.Vector3(),
      w: new THREE.Vector3(...(o.spin || [0, 0, 0])),
      r: o.radius ?? (o.size ? Math.min(o.size[0], o.size[1], o.size[2]) * 0.5 : 0.4),
      R: o.size ? Math.hypot(o.size[0], o.size[1], o.size[2]) * 0.5 : 0.6,
      life: o.life ?? 12,
      t: 0,
      rest: false,
      bounce: o.bounce ?? 0.25,
      shatter: o.shatter ?? 9,
      floor: o.floor ?? null,
      attach: o.attach || null,
      local: o.local ? o.local.clone() : null,
      localQ: o.localQ ? o.localQ.clone() : null,
      dust: o.dust ?? true,
      onLand: o.onLand || null,
      hits: 0,
      size: o.size || null,
      mat: o.mat || 'ashlar',
    };
    this.list.push(c);
    this._sync(c);
    return c;
  }
  // suelta un trozo pegado, con la velocidad que llevaba (o la que se le dé)
  release(c, vel = null, spin = null) {
    if (!c.attach) return;
    c.attach = null;
    if (vel) c.v.copy(vel);
    else if (c._prev) c.v.copy(c.p).sub(c._prev).multiplyScalar(60);
    if (spin) c.w.set(...spin);
  }
  remove(c) {
    const i = this.list.indexOf(c);
    if (i >= 0) this.list.splice(i, 1);
    this.g.scene.remove(c.mesh);
  }
  clear() {
    for (const c of this.list) this.g.scene.remove(c.mesh);
    this.list.length = 0;
  }
  update(dt) {
    const g = this.g;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i];
      c.t += dt;
      if (c.attach) {
        // pegado: la matriz del sitio por el desplazamiento local
        if (!c._prev) c._prev = new THREE.Vector3();
        c._prev.copy(c.p);
        _m.copy(c.attach());
        if (c.local) _m.multiply(c.localM || (c.localM = new THREE.Matrix4().compose(c.local, c.localQ || new THREE.Quaternion(), new THREE.Vector3(1, 1, 1))));
        _m.decompose(c.p, c.q, _v);
        this._sync(c);
        continue;
      }
      if (!c.rest) {
        c.v.y -= 16 * dt;
        c.p.addScaledVector(c.v, dt);
        const wl = c.w.length();
        if (wl > 1e-3) c.q.premultiply(_q.setFromAxisAngle(_v.copy(c.w).multiplyScalar(1 / wl), wl * dt));
        const gy = (c.floor ?? this.groundAt(c.p.x, c.p.z, c.p.y + 0.5)) + c.r * 0.9;
        if (c.p.y < gy) {
          c.p.y = gy;
          const sp = -c.v.y;
          if (sp > c.shatter && c.hits === 0) {
            // revienta contra el suelo
            this._smash(c, sp);
            this.remove(c);
            continue;
          }
          if (sp > 2.2) {
            c.hits++;
            c.v.y = sp * c.bounce;
            c.v.x *= 0.55;
            c.v.z *= 0.55;
            c.w.multiplyScalar(0.5);
            if (c.dust) g.fx.blood.emit(c.p.x, gy, c.p.z, 10, { color: [0.42, 0.39, 0.35], speed: 2.2, life: 1.2, up: 0.8, gravity: 1 });
            if (c.hits === 1) g.audio && g.audio.play(c.mat === 'wooddark' || c.mat === 'timber' ? 'woodBreak' : 'pillarBreak', c.p, { k: Math.min(1.4, 0.5 + sp * 0.06) });
            if (c.onLand) c.onLand(c, sp);
          } else {
            c.v.set(0, 0, 0);
            c.w.set(0, 0, 0);
            c.rest = true;
          }
        }
      }
      // (lo que cae por el pozo, fuera)
      if (c.p.y < -45) {
        this.remove(c);
        continue;
      }
      // al final de su vida se hunde despacio
      if (c.t > c.life) {
        c.p.y -= dt * 0.4;
        if (c.t > c.life + 3) {
          this.remove(c);
          continue;
        }
      }
      this._sync(c);
    }
  }
  _sync(c) {
    c.mesh.position.copy(c.p);
    c.mesh.quaternion.copy(c.q);
  }
  _smash(c, sp) {
    const g = this.g;
    const n = Math.round(Math.min(26, 6 + c.R * 6));
    if (this.debris) this.debris.burst(c.p, n, { speed: 3 + sp * 0.2, up: 3 + sp * 0.15, size: Math.min(1.1, 0.35 + c.R * 0.3), spread: c.R * 0.6 });
    g.fx.blood.emit(c.p.x, c.p.y, c.p.z, 24, { color: [0.44, 0.41, 0.37], speed: 3.5, life: 1.8, up: 1.2, gravity: 0.6 });
    g.audio && g.audio.play(c.mat === 'wooddark' || c.mat === 'timber' ? 'woodBreak' : Math.random() < 0.5 ? 'pillarBreak' : 'wallBreak', c.p, { k: Math.min(1.6, 0.6 + sp * 0.05) });
  }
}
