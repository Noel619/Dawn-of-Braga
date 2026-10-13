// La espringala: una ballesta de torre de la guarnición (ver
// PLAN_JEFE_FINAL.md, «La espringala»). Una base de vigas en cruz con su
// pivote; encima, la cureña que gira (rumbo) y, sobre su eje, el bastidor
// que cabecea: la caña con su ranura, el marco delantero con las dos madejas
// de cuerda retorcida (cada una con sus arandelas de hierro y su palanca) y
// un brazo metido en cada una, la cuerda de brazo a brazo, la nuez que corre
// por la caña y agarra la cuerda, y detrás el torno con sus espeques, su
// rueda dentada y el trinquete. El virote, un astil de dos metros con punta
// de hierro, va atado por una cadena a un bolardo del cadalso.
//
//   load (0..1)    tensa: el torno gira, la nuez va atrás y los brazos se
//                  doblan hacia atrás (el trinquete chasquea en cada diente)
//   aim(y, p)      rumbo y cabeceo, con sus límites
//   fire()         suelta: los brazos golpean hacia delante, la máquina
//                  retrocede, y devuelve el virote en vuelo
//
// La cadena (Rope): una cuerda de Verlet entre el bolardo y la cola del
// virote, que se va soltando mientras vuela y se tensa cuando tiran de ella;
// se dibuja con eslabones instanciados.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { objMat, cloneMat, colMat, MAT_DEFS } from '../../gfx/materials.js';
import { linkGeo } from '../../entities/colossus/parts.js';
import { clamp } from '../../core/util.js';

const V3 = THREE.Vector3;
const DEG = Math.PI / 180;
const _v = new V3(),
  _v2 = new V3(),
  _q = new THREE.Quaternion(),
  _m = new THREE.Matrix4();
const Y = new V3(0, 1, 0);

// ---------------------------------------------------------------------
// Piezas: cajas y cilindros con las UV en metros (la textura no se estira),
// fundidos por material en una malla por grupo
class Kit {
  constructor() {
    this.by = new Map();
  }
  add(mat, g) {
    if (!this.by.has(mat)) this.by.set(mat, []);
    this.by.get(mat).push(g);
    return g;
  }
  // caja de (x0, y0, z0) a (x1, y1, z1); o.m: matriz (girarla, inclinarla)
  box(mat, x0, y0, z0, x1, y1, z1, o = {}) {
    const sx = x1 - x0,
      sy = y1 - y0,
      sz = z1 - z0;
    const g = new THREE.BoxGeometry(sx, sy, sz);
    uvMeters(g, (MAT_DEFS[mat] && MAT_DEFS[mat].uv) || 1, o.uvRot);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    if (o.m) g.applyMatrix4(o.m);
    return this.add(mat, g);
  }
  // cilindro de a a b, radio r (r2 en b), con n caras
  cyl(mat, a, b, r, o = {}) {
    const d = new V3().subVectors(b, a);
    const L = d.length();
    const g = new THREE.CylinderGeometry(o.r2 ?? r, r, L, o.n ?? 10, 1, !!o.open);
    // (UV: a lo largo, metros; alrededor, el perímetro en metros)
    const uv = (MAT_DEFS[mat] && MAT_DEFS[mat].uv) || 1;
    const U = g.attributes.uv;
    for (let i = 0; i < U.count; i++) U.setXY(i, U.getX(i) * 2 * Math.PI * r * uv, U.getY(i) * L * uv);
    g.translate(0, L / 2, 0);
    g.applyQuaternion(_q.setFromUnitVectors(Y, d.normalize()));
    g.translate(a.x, a.y, a.z);
    return this.add(mat, g);
  }
  // las mallas (una por material), colgadas de parent
  build(parent, mats) {
    for (const [mat, list] of this.by) {
      const geo = mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)));
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mats(mat));
      mesh.frustumCulled = false;
      parent.add(mesh);
    }
    this.by.clear();
    return parent;
  }
}
// UV de una caja en metros, cara a cara
function uvMeters(g, k, rot = false) {
  const P = g.attributes.position,
    N = g.attributes.normal,
    U = g.attributes.uv;
  for (let i = 0; i < P.count; i++) {
    const nx = Math.abs(N.getX(i)),
      ny = Math.abs(N.getY(i));
    let a, b;
    if (nx > 0.5) [a, b] = [P.getZ(i), P.getY(i)];
    else if (ny > 0.5) [a, b] = [P.getX(i), P.getZ(i)];
    else [a, b] = [P.getX(i), P.getY(i)];
    if (rot) [a, b] = [b, a];
    U.setXY(i, a * k, b * k);
  }
}

// ---------------------------------------------------------------------
// La cadena: cuerda de Verlet con eslabones instanciados
export class Rope {
  // o: { len (m), nodes, link (largo del eslabón), groundAt(x, z, y) }
  constructor(scene, o = {}) {
    this.scene = scene;
    this.N = o.nodes ?? 28;
    this.len = o.len ?? 10;
    this.p = [];
    this.q = [];
    for (let i = 0; i < this.N; i++) {
      this.p.push(new V3());
      this.q.push(new V3());
    }
    this.pins = [null, null]; // los extremos: Vector3 (o null: suelto)
    this.groundAt = o.groundAt || (() => -1e9);
    this.linkL = o.link ?? 0.24;
    this.maxLinks = o.maxLinks ?? 260;
    this.mesh = new THREE.InstancedMesh(linkGeo(o.linkR ?? 0.13, o.linkT ?? 0.036), colMat('iron'), this.maxLinks);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.visible = true;
  }
  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
  }
  // tendida en recto de a a b (con el largo que tenga)
  reset(a, b) {
    for (let i = 0; i < this.N; i++) {
      this.p[i].lerpVectors(a, b, i / (this.N - 1));
      this.q[i].copy(this.p[i]);
    }
  }
  // extremo i (0 o 1) clavado en at (Vector3 que se puede mover), o suelto
  pin(i, at) {
    this.pins[i] = at;
  }
  // la distancia entre los extremos (en recto)
  span() {
    return this.p[0].distanceTo(this.p[this.N - 1]);
  }
  update(dt) {
    if (!this.visible) return;
    dt = Math.min(dt, 1 / 30);
    if (dt <= 0) return;
    const N = this.N,
      P = this.p,
      Q = this.q;
    const seg = this.len / (N - 1);
    const g = -9.8 * dt * dt;
    for (let i = 0; i < N; i++) {
      const p = P[i],
        q = Q[i];
      const vx = (p.x - q.x) * 0.98,
        vy = (p.y - q.y) * 0.98,
        vz = (p.z - q.z) * 0.98;
      q.copy(p);
      p.x += vx;
      p.y += vy + g;
      p.z += vz;
    }
    const fix = () => {
      if (this.pins[0]) P[0].copy(this.pins[0]);
      if (this.pins[1]) P[N - 1].copy(this.pins[1]);
    };
    for (let it = 0; it < 16; it++) {
      fix();
      for (let i = 0; i < N - 1; i++) {
        const a = P[i],
          b = P[i + 1];
        _v.subVectors(b, a);
        const d = _v.length();
        if (d < 1e-6 || d <= seg) continue; // (una cadena no empuja: sólo tira)
        const pa = (i === 0 && this.pins[0]) || false,
          pb = (i + 1 === N - 1 && this.pins[1]) || false;
        if (pa && pb) continue;
        const diff = (d - seg) / d;
        const ka = pa ? 0 : pb ? 1 : 0.5,
          kb = pb ? 0 : pa ? 1 : 0.5;
        a.addScaledVector(_v, diff * ka);
        b.addScaledVector(_v, -diff * kb);
      }
      // el suelo (y lo que haya debajo)
      if (it % 4 === 3)
        for (let i = 0; i < N; i++) {
          const p = P[i];
          const gy = this.groundAt(p.x, p.z, p.y) + 0.05;
          if (p.y < gy) {
            p.y = gy;
            // (roce: no resbala por el suelo)
            Q[i].x += (p.x - Q[i].x) * 0.3;
            Q[i].z += (p.z - Q[i].z) * 0.3;
          }
        }
    }
    fix();
    this._sync();
  }
  _sync() {
    const N = this.N,
      P = this.p;
    let total = 0;
    const segL = this._segL || (this._segL = new Float32Array(N));
    for (let i = 0; i < N - 1; i++) {
      segL[i] = P[i].distanceTo(P[i + 1]);
      total += segL[i];
    }
    const L = Math.min(this.maxLinks, Math.max(2, Math.round(total / this.linkL)));
    this.mesh.count = L;
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
      _m.compose(_v, _q, _one);
      this.mesh.setMatrixAt(k, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  // el punto a s metros del extremo 0 (y la dirección)
  at(s, out = new V3(), dir = null) {
    const N = this.N,
      P = this.p;
    let acc = 0;
    for (let i = 0; i < N - 1; i++) {
      const l = P[i].distanceTo(P[i + 1]);
      if (acc + l >= s || i === N - 2) {
        const u = l > 0 ? clamp((s - acc) / l, 0, 1) : 0;
        out.lerpVectors(P[i], P[i + 1], u);
        if (dir) dir.subVectors(P[i + 1], P[i]).normalize();
        return out;
      }
      acc += l;
    }
    return out.copy(P[N - 1]);
  }
  // el largo de la poligonal (lo que se ve)
  length() {
    let t = 0;
    for (let i = 0; i < this.N - 1; i++) t += this.p[i].distanceTo(this.p[i + 1]);
    return t;
  }
}
const _qr90 = new THREE.Quaternion().setFromAxisAngle(Y, Math.PI / 2);
const _one = new V3(1, 1, 1);

// ---------------------------------------------------------------------
// El virote (su malla): +z hacia la punta; el origen en la cola (el ojo de
// la cadena)
export const BOLT_L = 2.1;
function boltMesh(mats) {
  const K = new Kit();
  const g = new THREE.Group();
  K.cyl('wooddark', new V3(0, 0, 0.05), new V3(0, 0, BOLT_L - 0.26), 0.042, { n: 8 });
  // el casquillo y la punta (cuatro aristas)
  K.cyl('iron', new V3(0, 0, BOLT_L - 0.3), new V3(0, 0, BOLT_L - 0.2), 0.052, { n: 8 });
  K.cyl('iron', new V3(0, 0, BOLT_L - 0.2), new V3(0, 0, BOLT_L + 0.06), 0.08, { n: 4, r2: 0.004 });
  // las aletas (tres, de cuero) y el ojo de hierro de la cola
  for (let k = 0; k < 3; k++) {
    const m = new THREE.Matrix4().makeRotationZ((k * 2 * Math.PI) / 3);
    K.box('leather', -0.004, 0.035, 0.08, 0.004, 0.13, 0.42, { m });
  }
  K.cyl('iron', new V3(0, 0, -0.02), new V3(0, 0, 0.06), 0.05, { n: 8 });
  const eye = new THREE.TorusGeometry(0.055, 0.016, 4, 10);
  eye.rotateY(Math.PI / 2);
  eye.translate(0, 0, -0.06);
  K.add('iron', eye);
  return K.build(g, mats);
}

// ---------------------------------------------------------------------
export class Springald {
  // o: { pos (el pie del pivote, en el suelo del cadalso), yaw (en reposo),
  //      bollard (el pie del bolardo), chainLen, yawLim, pitchLim (grados),
  //      probe ([r, g, b]: luz del sitio) }
  constructor(game, o) {
    this.g = game;
    const scene = game.scene;
    this.scene = scene;
    this.base = new V3().copy(o.pos);
    this.yaw0 = o.yaw ?? 0;
    this.yawLim = (o.yawLim ?? 55) * DEG;
    this.pitchLim = [(o.pitchLim ? o.pitchLim[0] : -14) * DEG, (o.pitchLim ? o.pitchLim[1] : 22) * DEG];
    this.yaw = 0;
    this.pitch = 0;
    this.load = 0;
    this.recoil = 0;
    this.recoilV = 0;
    this.armKick = 0; // los brazos, tras soltar: oscilan
    this.armKickV = 0;
    const pr = o.probe || [0.06, 0.05, 0.045];
    const cache = new Map();
    const mats = (name) => {
      if (!cache.has(name)) {
        const m = cloneMat(objMat(name));
        if (m._u) {
          m._u.uProbe.value.set(pr[0], pr[1], pr[2]);
          m._u.uGround.value.set(o.pos.y, 0.3);
        }
        cache.set(name, m);
      }
      return cache.get(name);
    };
    this.mats = mats;
    this.root = new THREE.Group();
    this.root.position.copy(this.base);
    this.root.rotation.y = this.yaw0;
    scene.add(this.root);
    this._buildBase(mats);
    this._buildFrame(mats);
    // la cuerda: dos tramos (de cada brazo a la nuez)
    const sg = new THREE.BoxGeometry(0.024, 0.024, 1);
    sg.translate(0, 0, 0.5);
    this.strings = [0, 1].map(() => {
      const m = new THREE.Mesh(sg, mats('rope'));
      m.frustumCulled = false;
      this.pitchG.add(m);
      return m;
    });
    // la soga del torno (del rodillo a la nuez)
    this.drawRope = new THREE.Mesh(sg, mats('rope'));
    this.drawRope.frustumCulled = false;
    this.pitchG.add(this.drawRope);
    // el virote, en la ranura
    this.bolt = boltMesh(mats);
    this.pitchG.add(this.bolt);
    this.hasBolt = true;
    // el bolardo, la cadena enrollada a su pie y la cadena
    this.bollard = new V3().copy(o.bollard);
    this._buildBollard(mats);
    this.ring = new V3(this.bollard.x, this.bollard.y + 0.62, this.bollard.z);
    this.chainLen = o.chainLen ?? 34;
    this.rope = new Rope(scene, { len: 3, nodes: 30, groundAt: (x, z, y) => game.world.col.groundHeight(x, z, 0.1, y + 0.3) });
    this.rope.pin(0, this.ring);
    this.tail = new V3();
    this.rope.pin(1, this.tail);
    this._pose();
    this.boltTail(this.tail);
    this.rope.len = this.ring.distanceTo(this.tail) + 0.8;
    this.rope.reset(this.ring, this.tail);
    for (let i = 0; i < 30; i++) this.rope.update(1 / 30);
    this.ratchet = 0;
    this.onClick = null;
  }
  dispose() {
    this.scene.remove(this.root);
    this.scene.remove(this.bollardG);
    this.rope.dispose();
    if (this.flying) this.flying.dispose();
  }

  // ------------------------------------------------------------ modelo
  _buildBase(mats) {
    const K = new Kit();
    // la cruz de vigas del suelo, con sus escuadras de hierro y tornapuntas
    K.box('timber', -0.95, 0, -0.11, 0.95, 0.17, 0.11);
    K.box('timber', -0.11, 0, -0.95, 0.11, 0.17, 0.95);
    for (const [x, z] of [
      [0.82, 0],
      [-0.82, 0],
      [0, 0.82],
      [0, -0.82],
    ]) {
      K.box('iron', x - 0.12, 0.17, z - 0.12, x + 0.12, 0.185, z + 0.12);
      K.cyl('timber', new V3(x * 0.92, 0.17, z * 0.92), new V3(x * 0.3, 0.5, z * 0.3), 0.05, { n: 6 });
    }
    // el pivote: un poste ochavado con su fleje
    K.cyl('wooddark', new V3(0, 0.17, 0), new V3(0, 0.62, 0), 0.24, { n: 8 });
    K.cyl('iron', new V3(0, 0.54, 0), new V3(0, 0.62, 0), 0.262, { n: 8 });
    K.cyl('iron', new V3(0, 0.2, 0), new V3(0, 0.25, 0), 0.258, { n: 8 });
    K.build(this.root, mats);
    // la cureña, que gira sobre el pivote
    this.yawG = new THREE.Group();
    this.yawG.position.set(0, 0.62, 0);
    this.root.add(this.yawG);
    const T = new Kit();
    T.cyl('planks', new V3(0, 0, 0), new V3(0, 0.08, 0), 0.56, { n: 16 });
    T.cyl('iron', new V3(0, 0.02, 0), new V3(0, 0.06, 0), 0.575, { n: 16, open: true });
    for (const s of [-1, 1]) {
      // los montantes y los cojinetes del eje
      T.box('timber', s * 0.3 - 0.06, 0.08, -0.17, s * 0.3 + 0.06, 0.6, 0.17);
      T.box('timber', s * 0.3 - 0.07, 0.08, -0.32, s * 0.3 + 0.07, 0.2, 0.32);
      T.box('iron', s * 0.3 - 0.075, 0.5, -0.1, s * 0.3 + 0.075, 0.66, 0.1);
      // los tornapuntas
      T.cyl('timber', new V3(s * 0.3, 0.1, 0.3), new V3(s * 0.3, 0.45, 0.06), 0.035, { n: 6 });
      T.cyl('timber', new V3(s * 0.3, 0.1, -0.3), new V3(s * 0.3, 0.45, -0.06), 0.035, { n: 6 });
    }
    T.cyl('iron', new V3(-0.42, 0.57, 0), new V3(0.42, 0.57, 0), 0.045, { n: 8 });
    // la palanca de girarla (detrás)
    T.box('timber', -0.05, 0.12, -0.95, 0.05, 0.2, -0.3);
    T.build(this.yawG, mats);
  }
  _buildFrame(mats) {
    // el bastidor, sobre el eje: cabecea
    this.pitchG = new THREE.Group();
    this.pitchG.position.set(0, 0.57, 0);
    this.yawG.add(this.pitchG);
    const K = new Kit();
    // la caña y su ranura, con fajas de hierro
    K.box('timber', -0.1, -0.08, -1.45, 0.1, 0.06, 1.55);
    K.box('wooddark', -0.034, 0.06, -1.4, 0.034, 0.066, 1.5);
    for (const z of [-1.05, -0.2, 0.6]) K.box('iron', -0.112, -0.092, z - 0.035, 0.112, 0.072, z + 0.035);
    // las quijadas de atrás (llevan el torno)
    for (const s of [-1, 1]) K.box('timber', s * 0.16 - 0.045, -0.17, -1.5, s * 0.16 + 0.045, 0.1, -0.15);
    // el marco delantero: travesaños, montantes (por el hueco del centro pasa
    // el virote) y escuadras de hierro
    K.box('timber', -0.68, -0.25, 0.98, 0.68, -0.1, 1.2);
    K.box('timber', -0.68, 0.5, 0.98, 0.68, 0.65, 1.2);
    for (const s of [-1, 1]) {
      K.box('timber', s * 0.6 - 0.07, -0.25, 0.98, s * 0.6 + 0.07, 0.65, 1.2);
      K.box('timber', s * 0.19 - 0.05, -0.25, 0.98, s * 0.19 + 0.05, 0.65, 1.2);
      for (const y of [-0.27, 0.63]) K.box('iron', s * 0.6 - 0.09, y, 0.96, s * 0.6 + 0.09, y + 0.04, 1.22);
      // las madejas de cuerda retorcida y sus arandelas, con la palanca
      const x = s * 0.395;
      K.cyl('rope', new V3(x, -0.1, 1.09), new V3(x, 0.5, 1.09), 0.105, { n: 10 });
      for (const [ya, yb] of [
        [-0.31, -0.25],
        [0.65, 0.71],
      ]) {
        K.cyl('iron', new V3(x, ya, 1.09), new V3(x, yb, 1.09), 0.15, { n: 12 });
        const lev = new THREE.Matrix4().makeRotationY(s * 0.5);
        lev.setPosition(x, yb < 0 ? ya - 0.025 : yb + 0.025, 1.09);
        K.box('iron', -0.2, -0.02, -0.025, 0.2, 0.02, 0.025, { m: lev });
      }
    }
    // el gatillo, bajo la caña
    K.box('iron', -0.02, -0.25, -0.62, 0.02, -0.08, -0.56);
    K.build(this.pitchG, mats);
    // los brazos: en cada madeja, un pivote (gira alrededor de y)
    this.arms = [-1, 1].map((s) => {
      const pv = new THREE.Group();
      pv.position.set(s * 0.395, 0.2, 1.09);
      this.pitchG.add(pv);
      const A = new Kit();
      // (a lo largo de +x en el izquierdo, de -x en el derecho)
      A.box('timber', s > 0 ? 0 : -0.62, -0.06, -0.055, s > 0 ? 0.62 : 0, 0.06, 0.055);
      A.box('timber', s > 0 ? 0.6 : -1.24, -0.045, -0.042, s > 0 ? 1.24 : -0.6, 0.045, 0.042);
      A.box('iron', s > 0 ? 1.18 : -1.3, -0.055, -0.05, s > 0 ? 1.3 : -1.18, 0.055, 0.05);
      A.box('iron', s > 0 ? 0.55 : -0.65, -0.068, -0.062, s > 0 ? 0.65 : -0.55, 0.068, 0.062);
      A.build(pv, this.mats);
      return { pv, s, tip: new V3(s * 1.27, 0, 0) };
    });
    // la nuez (corre por la caña) con la uña que agarra la cuerda
    this.nut = new THREE.Group();
    this.pitchG.add(this.nut);
    const N = new Kit();
    N.box('wooddark', -0.1, 0.06, -0.16, 0.1, 0.17, 0.14);
    N.box('iron', -0.06, 0.17, 0.06, -0.025, 0.24, 0.16);
    N.box('iron', 0.025, 0.17, 0.06, 0.06, 0.24, 0.16);
    N.box('iron', -0.11, 0.08, -0.17, 0.11, 0.1, -0.13);
    N.build(this.nut, this.mats);
    // el torno: el rodillo, los espeques (cuatro a cada lado) y la rueda
    // dentada; el trinquete, en la quijada
    this.winch = new THREE.Group();
    this.winch.position.set(0, -0.03, -1.3);
    this.pitchG.add(this.winch);
    const W = new Kit();
    W.cyl('wooddark', new V3(-0.3, 0, 0), new V3(0.3, 0, 0), 0.085, { n: 10 });
    for (const s of [-1, 1])
      for (let k = 0; k < 4; k++) {
        const m = new THREE.Matrix4().makeRotationX((k * Math.PI) / 4);
        W.box('timber', s * 0.27 - 0.022, -0.42, -0.022, s * 0.27 + 0.022, 0.42, 0.022, { m });
      }
    W.cyl('iron', new V3(0.215, 0, 0), new V3(0.245, 0, 0), 0.15, { n: 12 });
    for (let k = 0; k < 12; k++) {
      const m = new THREE.Matrix4().makeRotationX((k * Math.PI * 2) / 12);
      W.box('iron', 0.215, 0.14, -0.025, 0.245, 0.19, 0.025, { m });
    }
    W.build(this.winch, this.mats);
    this.pawl = new THREE.Group();
    this.pawl.position.set(0.23, 0.12, -1.12);
    this.pitchG.add(this.pawl);
    const Pw = new Kit();
    Pw.box('iron', -0.015, -0.015, -0.2, 0.015, 0.015, 0);
    Pw.build(this.pawl, this.mats);
  }
  _buildBollard(mats) {
    const g = new THREE.Group();
    g.position.copy(this.bollard);
    this.scene.add(g);
    const K = new Kit();
    K.cyl('wooddark', new V3(0, 0, 0), new V3(0, 0.72, 0), 0.17, { n: 8 });
    K.cyl('iron', new V3(0, 0.55, 0), new V3(0, 0.6, 0), 0.185, { n: 8 });
    K.cyl('iron', new V3(0, 0.1, 0), new V3(0, 0.15, 0), 0.185, { n: 8 });
    // la argolla
    const ring = new THREE.TorusGeometry(0.11, 0.025, 5, 12);
    ring.translate(0, 0.62, 0.2);
    K.add('iron', ring);
    // la cadena que sobra, enrollada al pie
    for (let k = 0; k < 6; k++) {
      const t = new THREE.TorusGeometry(0.34 - k * 0.025, 0.035, 4, 18);
      t.rotateX(Math.PI / 2);
      t.translate(0.45, 0.04 + k * 0.05, 0.15);
      K.add('iron', t);
    }
    K.build(g, mats);
    this.bollardG = g;
  }

  // ------------------------------------------------------------ estado
  // apunta: rumbo y cabeceo relativos al reposo (radianes), con límites
  aim(yaw, pitch) {
    this.yaw = clamp(yaw, -this.yawLim, this.yawLim);
    this.pitch = clamp(pitch, this.pitchLim[0], this.pitchLim[1]);
  }
  // la dirección del tiro (mundo)
  forward(out = new V3()) {
    this.pitchG.updateWorldMatrix(true, false);
    return out.set(0, 0, 1).transformDirection(this.pitchG.matrixWorld);
  }
  // la punta del virote / la cola (mundo)
  muzzle(out = new V3()) {
    this.pitchG.updateWorldMatrix(true, false);
    return out.set(0, 0.11, this._nutZ() + 0.2 + BOLT_L).applyMatrix4(this.pitchG.matrixWorld);
  }
  boltTail(out = new V3()) {
    if (!this.hasBolt) return out.copy(this.ring);
    this.bolt.updateWorldMatrix(true, false);
    return out.set(0, 0, -0.06).applyMatrix4(this.bolt.matrixWorld);
  }
  // dónde ponerse para manejarla (detrás, en el torno) y hacia dónde mirar
  standPoint(out = new V3()) {
    this.yawG.updateWorldMatrix(true, false);
    return out.set(0, -0.62, -1.75).applyMatrix4(this.yawG.matrixWorld);
  }
  get worldYaw() {
    return this.yaw0 + this.yaw;
  }
  _nutZ() {
    return THREE.MathUtils.lerp(0.95, -0.95, this.load);
  }
  // la pose de las piezas móviles según la carga, la puntería y el retroceso
  _pose() {
    this.yawG.rotation.y = this.yaw;
    this.pitchG.rotation.x = -this.pitch;
    // (el retroceso: toda la máquina hacia atrás un palmo)
    this.yawG.position.z = -this.recoil * 0.12;
    const nz = this._nutZ();
    this.nut.position.z = nz;
    // los brazos: de 20° hacia delante (sueltos) a 48° hacia atrás (tensos)
    const a = THREE.MathUtils.lerp(-20, 48, this.load) * DEG + this.armKick;
    for (const A of this.arms) A.pv.rotation.y = A.s > 0 ? a : -a;
    // el torno: vueltas según la carga
    this.winch.rotation.x = -this.load * Math.PI * 5;
    // el trinquete salta en cada diente (dos vueltas y media: 30 dientes)
    const tooth = (this.load * 30) % 1;
    this.pawl.rotation.x = -0.25 + Math.max(0, 0.35 - tooth) * 0.6;
    // la cuerda: de la punta de cada brazo a la uña de la nuez
    this.pitchG.updateMatrixWorld(true);
    const claw = _v2.set(0, 0.2, nz + 0.13);
    for (let i = 0; i < 2; i++) {
      const A = this.arms[i];
      const tip = A.pv.localToWorld(_v.copy(A.tip));
      this.pitchG.worldToLocal(tip);
      this._stretch(this.strings[i], tip, claw);
    }
    // la soga del torno
    this._stretch(this.drawRope, _v.set(0, 0.07, -1.28), _v2.set(0, 0.11, nz - 0.16));
    // el virote, en la ranura delante de la uña
    if (this.hasBolt) {
      this.bolt.position.set(0, 0.11, nz + 0.2);
      this.bolt.rotation.set(0, 0, 0);
    }
  }
  _stretch(m, a, b) {
    const d = _v3.subVectors(b, a);
    const L = d.length();
    m.position.copy(a);
    m.scale.set(1, 1, Math.max(0.001, L));
    m.quaternion.setFromUnitVectors(_Z, d.normalize());
  }

  // ------------------------------------------------------------ disparo
  // suelta la cuerda: devuelve el virote en vuelo (o null si no hay)
  fire(o = {}) {
    if (!this.hasBolt || this.load < 0.95) return null;
    const P = this.muzzle(new V3());
    const dir = this.forward(new V3());
    // el virote pasa al mundo
    this.bolt.updateWorldMatrix(true, false);
    const mesh = this.bolt;
    mesh.matrixWorld.decompose(_v, _q, _v2);
    this.pitchG.remove(mesh);
    this.scene.add(mesh);
    mesh.position.copy(_v);
    mesh.quaternion.copy(_q);
    this.hasBolt = false;
    this.load = 0;
    this.recoil = 1;
    this.recoilV = 0;
    this.armKick = -0.35;
    this.armKickV = 0;
    const B = new FlyingBolt(this, mesh, P, dir.multiplyScalar(o.speed ?? 70), o);
    this.flying = B;
    this.rope.pin(1, B.tail);
    return B;
  }
  // otro virote en la ranura (y la cadena, a él)
  rearm() {
    if (this.hasBolt) return;
    if (this.flying) {
      this.flying.dispose();
      this.flying = null;
    }
    this.bolt = boltMesh(this.mats);
    this.pitchG.add(this.bolt);
    this.hasBolt = true;
    this.load = 0;
    this._pose();
    this.boltTail(this.tail);
    this.rope.pin(1, this.tail);
    this.rope.len = this.ring.distanceTo(this.tail) + 0.8;
    this.rope.reset(this.ring, this.tail);
  }

  update(dt) {
    // el retroceso y el latigazo de los brazos (muelles amortiguados)
    this.recoilV += (-this.recoil * 120 - this.recoilV * 14) * dt;
    this.recoil += this.recoilV * dt;
    this.armKickV += (-this.armKick * 260 - this.armKickV * 9) * dt;
    this.armKick += this.armKickV * dt;
    // (el trinquete: un chasquido por diente)
    const tooth = Math.floor(this.load * 30);
    if (tooth !== this.ratchet) {
      if (tooth > this.ratchet && this.onClick) this.onClick();
      this.ratchet = tooth;
    }
    this._pose();
    // la cadena: con el virote en la ranura, de la argolla a la cola
    if (this.hasBolt) {
      this.boltTail(this.tail);
      this.rope.len = this.ring.distanceTo(this.tail) + 0.8;
    }
    if (this.flying) this.flying.update(dt);
    this.rope.update(dt);
  }
}
const _v3 = new V3(),
  _Z = new V3(0, 0, 1);

// ---------------------------------------------------------------------
// El virote en vuelo: recto y rápido (cae un poco), con la cadena
// soltándose detrás. Al dar en algo se clava: en el gigante, pegado a un
// hueso (o a donde diga el guion: 'stick').
export class FlyingBolt {
  constructor(S, mesh, pos, vel, o = {}) {
    this.S = S;
    this.g = S.g;
    this.mesh = mesh;
    this.pos = pos.clone();
    this.vel = vel.clone();
    this.grav = o.grav ?? 7;
    this.tail = new V3();
    this.t = 0;
    this.stuck = null; // { obj, local (punto), q (giro local) }
    this.done = false;
    this.onHit = o.onHit || null;
    this.hitTest = o.hitTest || null; // (a, b) => { t, point, kind } | null
    this._sync();
  }
  dispose() {
    if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
  }
  // clavado en obj (un hueso): el punto y el giro, en su espacio
  stickTo(obj, point, dir, depth = 0.45) {
    obj.updateWorldMatrix(true, false);
    const inv = _m.copy(obj.matrixWorld).invert();
    // la punta entra lo que diga depth: el origen (la cola) queda fuera
    const tailW = _v.copy(point).addScaledVector(dir, -(BOLT_L - depth));
    const qW = _q.setFromUnitVectors(_Z, dir);
    const objQ = obj.getWorldQuaternion(new THREE.Quaternion());
    this.stuck = { obj, local: tailW.applyMatrix4(inv), q: objQ.invert().multiply(qW) };
    this.vel.set(0, 0, 0);
    this.done = true;
  }
  update(dt) {
    if (this.stuck) {
      const s = this.stuck;
      s.obj.updateWorldMatrix(true, false);
      this.pos.copy(s.local).applyMatrix4(s.obj.matrixWorld);
      this.mesh.quaternion.copy(s.obj.getWorldQuaternion(_q)).multiply(s.q);
      this.mesh.position.copy(this.pos);
      this.tail.copy(this.pos);
      // (la cola: el ojo de la cadena)
      return;
    }
    if (this.done) return;
    this.t += dt;
    const a = _v.copy(this.pos);
    this.vel.y -= this.grav * dt;
    this.pos.addScaledVector(this.vel, dt);
    // ¿da en algo? (el guion decide: el gigante, el mundo)
    if (this.hitTest) {
      const h = this.hitTest(a, this.pos, this);
      if (h) {
        this.pos.copy(h.point);
        if (this.onHit) this.onHit(h, this);
        if (!this.stuck) this.done = true;
      }
    }
    // la cadena se suelta detrás (hasta su largo)
    const S = this.S;
    const d = S.ring.distanceTo(this.pos);
    S.rope.len = Math.min(S.chainLen, Math.max(S.rope.len, d + 0.6));
    if (d > S.chainLen && !this.stuck) {
      // (se acaba la cadena: el virote se frena y cae)
      const dir = _v2.subVectors(this.pos, S.ring).normalize();
      this.pos.copy(S.ring).addScaledVector(dir, S.chainLen);
      const vr = this.vel.dot(dir);
      if (vr > 0) this.vel.addScaledVector(dir, -vr * 1.4);
    }
    this._sync();
  }
  _sync() {
    if (this.stuck) return;
    const v = this.vel.lengthSq() > 1e-6 ? _v2.copy(this.vel).normalize() : _Z;
    this.mesh.quaternion.setFromUnitVectors(_Z, v);
    // (la punta delante de la posición: pos es la punta)
    this.mesh.position.copy(this.pos).addScaledVector(v, -BOLT_L);
    this.tail.copy(this.mesh.position);
  }
}
