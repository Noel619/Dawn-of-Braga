// Trozos grandes que caen: losas del suelo de la cisterna, dovelas de la
// cúpula y de la bóveda de la nave, tambores de columna, sillares de la
// muralla, pedazos de casa, coronas de velas, vigas. Física sencilla
// (gravedad, giro, botes contra el suelo con roce); al estrellarse fuerte se
// parten en trozos más pequeños (y éstos, en cascotes y polvo).
//
// Los de siempre (cajas de un material) se dibujan instanciados: una malla
// por material y forma, con cientos de trozos, cada uno con su tamaño y su
// tono (un dibujado por material en vez de uno por trozo: en una manzana que
// revienta llegaba a haber doscientos). Las formas no son cajas perfectas: las
// esquinas, desplazadas, como piedra partida. Los que llevan malla propia (la
// corona de velas) o van pegados a algo (la losa sobre la joroba del gigante)
// son mallas sueltas.
import * as THREE from 'three';
import { objMat } from '../../gfx/materials.js';

const _v = new THREE.Vector3(),
  _q = new THREE.Quaternion(),
  _m = new THREE.Matrix4(),
  _s = new THREE.Vector3(),
  _col = new THREE.Color();
const rnd = (a, b) => a + Math.random() * (b - a);

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

// Un trozo de piedra partida (caja unidad con las esquinas desplazadas y
// alguna arista mordida), con semilla: unas pocas formas que se reparten
const SHAPES = 4;
const _shapes = [];
function shapeGeo(k) {
  if (_shapes[k]) return _shapes[k];
  let seed = 7 + k * 131;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const g = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1).toNonIndexed();
  const P = g.attributes.position,
    U = g.attributes.uv;
  // (cada esquina, la misma en todas sus caras)
  const off = new Map();
  for (let i = 0; i < P.count; i++) {
    const key = [P.getX(i), P.getY(i), P.getZ(i)].map((v) => Math.sign(v)).join(',');
    if (!off.has(key)) off.set(key, [(r() - 0.5) * 0.34, (r() - 0.5) * 0.3, (r() - 0.5) * 0.34, r() < 0.3 ? 0.55 + r() * 0.3 : 1]);
    const [ox, oy, oz, bite] = off.get(key);
    P.setXYZ(i, P.getX(i) * bite + ox, P.getY(i) * bite + oy, P.getZ(i) * bite + oz);
  }
  for (let i = 0; i < U.count; i++) U.setXY(i, U.getX(i) * 0.6 + r() * 0.05, U.getY(i) * 0.6 + r() * 0.05);
  g.computeVertexNormals();
  _shapes[k] = g;
  return g;
}

// Una malla instanciada por material y forma
class Pool {
  constructor(scene, mat, shape, cap) {
    this.mesh = new THREE.InstancedMesh(shapeGeo(shape), objMat(mat), cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    // (el tono de cada trozo)
    this.mesh.setColorAt(0, _col.setRGB(1, 1, 1));
    scene.add(this.mesh);
    this.cap = cap;
    this.items = [];
  }
}

export class Chunks {
  constructor(game, debris) {
    this.g = game;
    this.debris = debris;
    this.list = [];
    this.pools = new Map();
    this.groundAt = (x, z, y) => game.world.col.groundHeight(x, z, 0.3, y, true);
    // la nube de polvo (la pone el director)
    this.dust = null;
  }
  _pool(mat, shape) {
    const key = mat + ':' + shape;
    let P = this.pools.get(key);
    if (!P) this.pools.set(key, (P = new Pool(this.g.scene, mat, shape, 72)));
    return P;
  }
  // Un trozo: o = { mat, size: [x, y, z] | geo, pos, quat | rot ([x, y, z] rad),
  //   vel, spin ([x, y, z] rad/s), life, bounce, shatter (velocidad a la que
  //   se parte al chocar), uv, floor (altura del suelo fija), tint, attach:
  //   () => Matrix4 (pegado a algo), dust, mesh (una malla propia en vez de
  //   la caja: la corona de velas), onUpdate (c, dt), onLand (c, sp), solo
  //   (malla suelta aunque sea una caja), gen (lo que se ha partido ya) }
  add(o) {
    const solo = !!(o.mesh || o.attach || o.geo || o.material || o.solo || !o.size);
    let mesh = null,
      inst = null;
    if (solo) {
      mesh = o.mesh;
      if (!mesh) {
        const geo = o.geo || slabGeo(o.size[0], o.size[1], o.size[2], o.uv ?? 0.5);
        const mat = o.material || objMat(o.mat || 'ashlar', o.tint ? { tint: o.tint } : {});
        mesh = new THREE.Mesh(geo, mat);
      }
      mesh.frustumCulled = false;
      this.g.scene.add(mesh);
    } else {
      const P = this._pool(o.mat || 'ashlar', Math.floor(Math.random() * SHAPES));
      // (lleno: fuera el más viejo de su malla)
      if (P.items.length >= P.cap) this.remove(P.items[0]);
      inst = P;
    }
    const c = {
      mesh,
      inst,
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
      onUpdate: o.onUpdate || null,
      hits: 0,
      size: o.size || null,
      mat: o.mat || 'ashlar',
      gen: o.gen ?? 0,
      tint: o.tint ?? null,
      quiet: !!o.quiet,
    };
    if (inst) {
      inst.items.push(c);
      c.scale = new THREE.Vector3(...o.size);
      const t = o.tint ?? 0xffffff;
      c.col = new THREE.Color(t);
      // (cada uno con su tono, algo distinto)
      const k = rnd(0.82, 1.08);
      c.col.multiplyScalar(k);
    }
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
    if (c.mesh) this.g.scene.remove(c.mesh);
    if (c.inst) {
      const j = c.inst.items.indexOf(c);
      if (j >= 0) c.inst.items.splice(j, 1);
      c.inst = null;
    }
  }
  clear() {
    for (const c of this.list) if (c.mesh) this.g.scene.remove(c.mesh);
    this.list.length = 0;
    for (const P of this.pools.values()) {
      P.items.length = 0;
      P.mesh.count = 0;
    }
  }
  update(dt) {
    const g = this.g;
    const cam = g.camera.position;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i];
      c.t += dt;
      // (uno pegado a la cámara la taparía entera: no se dibuja)
      c.hide = c.p.distanceTo(cam) < c.R + 0.5;
      if (c.mesh) c.mesh.visible = !c.hide;
      if (c.onUpdate) c.onUpdate(c, dt);
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
            // se parte contra el suelo
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
            if (c.dust) {
              if (this.dust && c.R > 0.45) this.dust.burst({ x: c.p.x, y: gy, z: c.p.z }, 1, { size: 0.8 + c.R, speed: 1.5, up: 0.4, life: 2.2, grow: 0.9, alpha: 0.4, color: this.dustColor });
              else g.fx.blood.emit(c.p.x, gy, c.p.z, 8, { color: [0.2, 0.19, 0.17], speed: 2.2, life: 1.2, up: 0.8, gravity: 1 });
            }
            if (c.hits === 1 && !c.quiet && c.R > 0.35) g.audio && g.audio.play(c.mat === 'wooddark' || c.mat === 'timber' || c.mat === 'planks' ? 'woodBreak' : 'pillarBreak', c.p, { k: Math.min(1.4, 0.5 + sp * 0.06) });
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
    // las mallas instanciadas, al día
    for (const P of this.pools.values()) {
      let n = 0;
      for (const c of P.items) {
        _m.compose(c.p, c.q, c.hide ? _s.set(0, 0, 0) : c.scale);
        P.mesh.setMatrixAt(n, _m);
        P.mesh.setColorAt(n, c.col);
        n++;
      }
      P.mesh.count = n;
      if (n) {
        P.mesh.instanceMatrix.needsUpdate = true;
        if (P.mesh.instanceColor) P.mesh.instanceColor.needsUpdate = true;
      }
    }
  }
  _sync(c) {
    if (!c.mesh) return;
    c.mesh.position.copy(c.p);
    c.mesh.quaternion.copy(c.q);
    // (al día ya: lo que va pegado a un trozo lo lee en este fotograma)
    c.mesh.updateMatrixWorld(true);
  }
  _smash(c, sp) {
    const g = this.g;
    // un trozo grande se parte en otros más pequeños, que siguen rodando
    if (c.size && c.gen < 1 && c.R > 0.55 && !c.mesh) {
      const n = c.R > 1 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const k = rnd(0.38, 0.55);
        const a = Math.random() * Math.PI * 2;
        this.add({
          mat: c.mat,
          tint: c.tint,
          size: [c.size[0] * k, c.size[1] * rnd(0.45, 0.7), c.size[2] * k],
          pos: _v.set(c.p.x + Math.cos(a) * c.R * 0.4, c.p.y + 0.1, c.p.z + Math.sin(a) * c.R * 0.4).clone(),
          rot: [rnd(0, 3), rnd(0, 3), rnd(0, 3)],
          vel: new THREE.Vector3(c.v.x * 0.5 + Math.cos(a) * rnd(1.5, 4), rnd(2, 4.5) + sp * 0.12, c.v.z * 0.5 + Math.sin(a) * rnd(1.5, 4)),
          spin: [rnd(-7, 7), rnd(-7, 7), rnd(-7, 7)],
          shatter: 14,
          life: c.life,
          gen: c.gen + 1,
          quiet: true,
        });
      }
    }
    const n = Math.round(Math.min(26, 6 + c.R * 6));
    if (this.debris) this.debris.burst(c.p, n, { speed: 3 + sp * 0.2, up: 3 + sp * 0.15, size: Math.min(1.1, 0.35 + c.R * 0.3), spread: c.R * 0.6 });
    if (this.dust) this.dust.burst({ x: c.p.x, y: c.p.y, z: c.p.z }, c.R > 0.8 ? 3 : 2, { size: 1 + c.R * 1.2, speed: 2.5, up: 0.8, life: 3, grow: 1.1, alpha: 0.5, color: this.dustColor });
    else g.fx.blood.emit(c.p.x, c.p.y, c.p.z, 18, { color: [0.21, 0.2, 0.18], speed: 3.5, life: 1.8, up: 1.2, gravity: 0.6 });
    if (!c.quiet) g.audio && g.audio.play(c.mat === 'wooddark' || c.mat === 'timber' || c.mat === 'planks' ? 'woodBreak' : Math.random() < 0.5 ? 'pillarBreak' : 'wallBreak', c.p, { k: Math.min(1.6, 0.6 + sp * 0.05) });
  }
}
