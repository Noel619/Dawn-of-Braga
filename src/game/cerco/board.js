// La mesa del Cerco en el mundo: las piezas (que se mueven), el cursor, las
// casillas a las que puede ir la pieza elegida, la última jugada del Rey y
// los muertos a los lados del tablero. Las reglas están en rules.js; la mesa,
// el tablero y el sitial, horneados (world/rey_mesa.js).
//
// Las piezas son tallas pequeñas: los de dentro, de marfil, con su yelmo
// cónico; los de fuera, de madera teñida de rojo oscuro, con turbante; el
// rey, más alto, con su corona de oro.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { objMat, cloneMat, additiveFog } from '../../gfx/materials.js';
import { REY_MESA, squareWorld } from '../../world/rey_mesa.js';
import { SQ, ATT, DEF, KING, EMPTY, rowOf, colOf, START, N } from './rules.js';

const V3 = THREE.Vector3;
const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const B = REY_MESA.board;

// ------------------------------------------------------------ las tallas
// Piezas de cada talla: [{ geo, mat }] (el origen, en el centro de la base;
// +y arriba; la cara hacia +z).
function lathe(pts, seg = 10) {
  return new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(r, y)),
    seg
  );
}
function at(geo, x, y, z, rx = 0, ry = 0, rz = 0) {
  geo.applyMatrix4(new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(1, 1, 1)));
  return geo;
}
const clean = (g) => {
  g = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  return g;
};
const merge = (list) => mergeGeometries(list.map(clean));

function pieceParts(type) {
  if (type === ATT) {
    // de fuera: peana, cuerpo de albornoz acampanado, hombros, cabeza y turbante
    const body = lathe([
      [0, 0],
      [0.024, 0],
      [0.024, 0.006],
      [0.02, 0.008],
      [0.021, 0.014],
      [0.015, 0.032],
      [0.017, 0.036],
      [0.012, 0.041],
      [0, 0.041],
    ]);
    const head = at(new THREE.SphereGeometry(0.0098, 8, 6), 0, 0.049, 0);
    const turban = merge([at(new THREE.CylinderGeometry(0.0122, 0.0112, 0.009, 9), 0, 0.054, 0), at(new THREE.SphereGeometry(0.0092, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.058, 0)]);
    return [
      { geo: merge([body, head]), mat: 'lacquer' },
      { geo: turban, mat: 'linen' },
    ];
  }
  if (type === DEF) {
    // de dentro: peana, cota hasta los pies, cabeza y yelmo de punta
    const body = lathe([
      [0, 0],
      [0.024, 0],
      [0.024, 0.006],
      [0.02, 0.008],
      [0.02, 0.013],
      [0.0135, 0.031],
      [0.0165, 0.035],
      [0.011, 0.04],
      [0, 0.04],
    ]);
    const head = at(new THREE.SphereGeometry(0.0096, 8, 6), 0, 0.047, 0);
    const helm = at(new THREE.ConeGeometry(0.0112, 0.019, 9), 0, 0.0585, 0);
    const nasal = at(new THREE.BoxGeometry(0.0025, 0.009, 0.003), 0, 0.048, 0.0098);
    return [{ geo: merge([body, head, helm, nasal]), mat: 'bone' }];
  }
  // el rey: más alto, con manto, y la corona de oro con su cruz
  const body = lathe([
    [0, 0],
    [0.028, 0],
    [0.028, 0.007],
    [0.023, 0.01],
    [0.024, 0.016],
    [0.016, 0.048],
    [0.0195, 0.053],
    [0.013, 0.059],
    [0, 0.059],
  ]);
  const head = at(new THREE.SphereGeometry(0.0115, 9, 7), 0, 0.068, 0);
  const crown = [at(new THREE.CylinderGeometry(0.0128, 0.0118, 0.008, 10, 1, true), 0, 0.077, 0)];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    crown.push(at(new THREE.ConeGeometry(0.0034, 0.008, 4), Math.sin(a) * 0.0123, 0.085, Math.cos(a) * 0.0123));
  }
  crown.push(at(new THREE.BoxGeometry(0.0022, 0.013, 0.0022), 0, 0.087, 0), at(new THREE.BoxGeometry(0.008, 0.0022, 0.0022), 0, 0.09, 0));
  return [
    { geo: merge([body, head]), mat: 'bone' },
    { geo: merge(crown), mat: 'gold' },
  ];
}
// (las mismas geometrías para todas las piezas de una talla)
const PARTS = {};
const partsOf = (type) => PARTS[type] || (PARTS[type] = pieceParts(type));

// ------------------------------------------------------------ las marcas
function markMat(color, opacity) {
  return additiveFog(new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
}
// un marco cuadrado de lado s y grueso w, plano sobre el tablero
function frameGeo(s, w) {
  const h = s / 2;
  const g = [
    [0, -h + w / 2, s, w],
    [0, h - w / 2, s, w],
    [-h + w / 2, 0, w, s - 2 * w],
    [h - w / 2, 0, w, s - 2 * w],
  ].map(([x, z, sx, sz]) => at(new THREE.PlaneGeometry(sx, sz), x, 0, z, -Math.PI / 2));
  return merge(g);
}

export class CercoBoard {
  constructor(g) {
    this.g = g;
    this.grp = new THREE.Group();
    g.scene.add(this.grp);
    this.mats = new Map();
    this.pieces = [];
    this.bySq = new Array(SQ).fill(null);
    this.dead = { [ATT]: 0, [DEF]: 0 };
    this._v = new V3();
    this._w = { x: 0, y: 0, z: 0 };
    // las piezas: dieciséis de fuera, ocho de dentro y el rey
    const make = (type) => {
      const o = new THREE.Group();
      for (const p of partsOf(type)) o.add(new THREE.Mesh(p.geo, this.mat(p.mat)));
      this.grp.add(o);
      const pc = { type, obj: o, sq: -1, anim: null, held: null, lift: 0, liftTo: 0, glow: 0 };
      this.pieces.push(pc);
      return pc;
    };
    for (let i = 0; i < 16; i++) make(ATT);
    for (let i = 0; i < 8; i++) make(DEF);
    this.king = make(KING);
    // el cursor, la pieza elegida, sus destinos y la última jugada del Rey
    this.cursorMesh = new THREE.Mesh(frameGeo(B.sq * 0.98, B.sq * 0.11), markMat(0xffcf70, 0.9));
    this.cursorMesh.renderOrder = 3;
    this.grp.add(this.cursorMesh);
    this.cursorMesh.visible = false;
    this.selMesh = new THREE.Mesh(new THREE.CircleGeometry(B.sq * 0.44, 16).rotateX(-Math.PI / 2), markMat(0xffb040, 0.45));
    this.selMesh.renderOrder = 2;
    this.selMesh.visible = false;
    this.grp.add(this.selMesh);
    const dot = new THREE.CircleGeometry(B.sq * 0.13, 10).rotateX(-Math.PI / 2);
    this.dotMats = { move: markMat(0xffd890, 0.55), take: markMat(0xff4a30, 0.8), win: markMat(0xfff2b0, 1.0) };
    this.dots = [];
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(dot, this.dotMats.move);
      m.renderOrder = 2;
      m.visible = false;
      this.grp.add(m);
      this.dots.push(m);
    }
    const lastGeo = frameGeo(B.sq * 0.9, B.sq * 0.06);
    this.lastMat = markMat(0xff5a3a, 0.5);
    this.lastMeshes = [new THREE.Mesh(lastGeo, this.lastMat), new THREE.Mesh(lastGeo, this.lastMat)];
    for (const m of this.lastMeshes) {
      m.visible = false;
      m.renderOrder = 2;
      this.grp.add(m);
    }
    this.cursor = { r: 8, c: 4, on: false };
    this.t = 0;
    this.setPosition(null);
  }

  // Material de objeto con la luz horneada de la sala (como los puzles).
  mat(name) {
    if (this.mats.has(name)) return this.mats.get(name);
    const g = this.g;
    const m = cloneMat(objMat(name));
    const zn = g.zoneAt({ x: B.x, y: B.y, z: B.z });
    const pr = g.probe.sample(B.x, B.y + 0.3, B.z, zn && zn.room ? g.level.ctx.wb.roomId(zn.room) : 0);
    if (m._u) {
      m._u.uProbe.value.set(pr[0], pr[1], pr[2]);
      m._u.uGround.value.set(B.y, 0.12);
    }
    this.mats.set(name, m);
    return m;
  }

  // ------------------------------------------------------------ dónde
  sqWorld(sq, out = this._w) {
    return squareWorld(rowOf[sq], colOf[sq], out);
  }
  // el hueco i de los muertos de un bando
  slot(side, i, out = new V3()) {
    const T = REY_MESA.trays[side === ATT ? 'att' : 'def'];
    const col = Math.floor(i / 9),
      row = i % 9;
    return out.set(T.x + col * T.dx, B.y - 0.035 + 0.0001, T.z0 + row * T.dz);
  }
  pieceAt(sq) {
    return this.bySq[sq];
  }

  // Coloca de golpe una posición (b: el tablero de una Cerco; null, la de
  // salida). Las que faltan, tumbadas junto al tablero.
  setPosition(b) {
    if (!b) {
      b = new Int8Array(SQ);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) b[r * N + c] = { A: ATT, D: DEF, K: KING }[START[r][c]] || EMPTY;
    }
    this.bySq.fill(null);
    this.dead[ATT] = this.dead[DEF] = 0;
    const free = { [ATT]: this.pieces.filter((p) => p.type === ATT), [DEF]: this.pieces.filter((p) => p.type === DEF), [KING]: [this.king] };
    for (let i = 0; i < SQ; i++) {
      const t = b[i];
      if (!t) continue;
      const pc = free[t].shift();
      if (!pc) continue;
      this.place(pc, i);
    }
    for (const t of [ATT, DEF, KING]) for (const pc of free[t]) this.lay(pc, t === KING ? DEF : t);
  }
  // en su casilla, de pie
  place(pc, sq) {
    pc.sq = sq;
    pc.anim = null;
    pc.held = null;
    pc.lift = pc.liftTo = 0;
    this.bySq[sq] = pc;
    const w = this.sqWorld(sq);
    pc.obj.position.set(w.x, w.y, w.z);
    // (los de fuera miran al banco; los de dentro, al Rey)
    pc.obj.rotation.set(0, pc.type === ATT ? Math.PI : 0, 0);
    pc.obj.visible = true;
  }
  // muerta, tumbada en su hueco
  lay(pc, side) {
    pc.sq = -1;
    pc.anim = null;
    pc.held = null;
    const i = this.dead[side]++;
    this.slot(side, i, pc.obj.position);
    pc.obj.position.y += 0.012;
    pc.obj.rotation.set(0, 0, Math.PI / 2);
    pc.obj.visible = true;
  }

  // ------------------------------------------------------------ jugadas
  // La pieza de 'from' va a 'to' por el aire (la tuya: la mano no se ve);
  // al posarse, las de 'caps' caen. Devuelve lo que tarda.
  move(from, to, caps = [], onLand = null) {
    const pc = this.bySq[from];
    if (!pc) return 0;
    this.bySq[from] = null;
    this.bySq[to] = pc;
    pc.sq = to;
    const a = pc.obj.position.clone();
    const w = this.sqWorld(to);
    const b = new V3(w.x, w.y, w.z);
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    const dur = 0.32 + d * 0.9;
    pc.anim = { kind: 'fly', t: 0, dur, a, b, h: 0.045, caps, onLand };
    return dur + (caps.length ? 0.9 : 0);
  }
  // La pieza de 'sq' se la lleva una mano: sigue a fn(out) hasta drop().
  hold(sq, fn) {
    const pc = this.bySq[sq];
    if (!pc) return null;
    pc.held = fn;
    pc.anim = null;
    return pc;
  }
  // La mano la suelta sobre 'to' (cae lo que le falte); luego caen 'caps'.
  drop(from, to, caps = [], onLand = null) {
    const pc = this.bySq[from];
    if (!pc) return;
    pc.held = null;
    this.bySq[from] = null;
    this.bySq[to] = pc;
    pc.sq = to;
    const w = this.sqWorld(to);
    pc.anim = { kind: 'fly', t: 0, dur: 0.16, a: pc.obj.position.clone(), b: new V3(w.x, w.y, w.z), h: 0, caps, onLand };
  }
  // Las de 'sqs' caen: se tumban y se van a su hueco, de una en una.
  capture(sqs) {
    let k = 0;
    for (const sq of sqs) {
      const pc = this.bySq[sq];
      if (!pc) continue;
      this.bySq[sq] = null;
      pc.sq = -1;
      // (el rey atrapado se queda tumbado en su casilla)
      if (pc.type === KING) {
        pc.anim = { kind: 'topple', t: -k * 0.12, dur: 0.5, a: pc.obj.position.clone(), b: pc.obj.position.clone().add(new V3(0, 0.012, 0)), stay: true };
        continue;
      }
      const side = pc.type;
      const to = this.slot(side, this.dead[side]++);
      to.y += 0.012;
      pc.anim = { kind: 'topple', t: -k * 0.18, dur: 0.95, a: pc.obj.position.clone(), b: to };
      k++;
    }
  }
  // ¿se está moviendo algo?
  get busy() {
    return this.pieces.some((p) => p.anim || p.held);
  }

  // ------------------------------------------------------------ marcas
  setCursor(r, c, on = true) {
    this.cursor.r = r;
    this.cursor.c = c;
    this.cursor.on = on;
    if (on) {
      squareWorld(r, c, this._w);
      this.cursorMesh.position.set(this._w.x, this._w.y + 0.0035, this._w.z);
    }
    this.cursorMesh.visible = on;
  }
  // la pieza elegida (o -1) y sus destinos: [{ sq, kind: 'move'|'take'|'win' }]
  setSelected(sq, targets = []) {
    this.sel = sq;
    this.selMesh.visible = sq >= 0;
    if (sq >= 0) {
      const w = this.sqWorld(sq);
      this.selMesh.position.set(w.x, w.y + 0.002, w.z);
    }
    for (const pc of this.pieces) pc.liftTo = pc.sq === sq && sq >= 0 ? 0.014 : 0;
    this.dots.forEach((d, i) => {
      const t = targets[i];
      d.visible = !!t;
      if (!t) return;
      const w = this.sqWorld(t.sq);
      d.position.set(w.x, w.y + 0.0025, w.z);
      d.material = this.dotMats[t.kind] || this.dotMats.move;
    });
  }
  setLast(from = -1, to = -1) {
    [from, to].forEach((sq, i) => {
      const m = this.lastMeshes[i];
      m.visible = sq >= 0;
      if (sq < 0) return;
      const w = this.sqWorld(sq);
      m.position.set(w.x, w.y + 0.003, w.z);
    });
  }
  clearMarks() {
    this.setCursor(this.cursor.r, this.cursor.c, false);
    this.setSelected(-1);
    this.setLast();
  }

  // ------------------------------------------------------------ cada fotograma
  update(dt) {
    this.t += dt;
    const g = this.g;
    // (sólo cerca: desde otra planta o desde la calle no se ven)
    const cam = g.camera.position;
    this.grp.visible = Math.abs(cam.y - B.y) < 4 && Math.hypot(cam.x - B.x, cam.z - B.z) < 22;
    for (const pc of this.pieces) {
      // la elegida, alzada un dedo
      pc.lift += (pc.liftTo - pc.lift) * Math.min(1, dt * 14);
      if (pc.held) {
        pc.held(this._v);
        pc.obj.position.copy(this._v);
        continue;
      }
      const A = pc.anim;
      if (!A) {
        if (pc.sq >= 0) {
          const w = this.sqWorld(pc.sq);
          pc.obj.position.set(w.x, w.y + pc.lift, w.z);
        }
        continue;
      }
      A.t += dt;
      const k = Math.max(0, Math.min(1, A.t / A.dur));
      if (A.kind === 'fly') {
        const e = ease(k);
        pc.obj.position.lerpVectors(A.a, A.b, e);
        pc.obj.position.y += Math.sin(k * Math.PI) * A.h;
        if (k >= 1) {
          pc.anim = null;
          g.audio && g.audio.play('pieceTap', A.b, { k: pc.type === KING ? 0.8 : 1 });
          if (A.onLand) A.onLand();
          if (A.caps && A.caps.length) this.capture(A.caps);
        }
      } else if (A.kind === 'topple') {
        if (A.t < 0) continue;
        // se tumba (el primer tercio) y luego se va, por el aire, a su hueco
        const k1 = ease(Math.min(1, k / 0.3)),
          k2 = ease(Math.max(0, (k - 0.3) / 0.7));
        pc.obj.rotation.z = k1 * (Math.PI / 2) * (pc.type === ATT ? -1 : 1);
        if (!A.sounded && k > 0.15) {
          A.sounded = true;
          g.audio && g.audio.play('pieceTopple', A.a);
        }
        pc.obj.position.lerpVectors(A.a, A.b, k2);
        pc.obj.position.y += (A.stay ? 0 : Math.sin(k2 * Math.PI) * 0.06) + k1 * 0.012 * (1 - k2);
        if (k >= 1) pc.anim = null;
      }
    }
    // el cursor late; la marca de la última jugada se apaga despacio
    if (this.cursorMesh.visible) this.cursorMesh.material.opacity = 0.62 + Math.sin(this.t * 6) * 0.25;
    if (this.selMesh.visible) this.selMesh.material.opacity = 0.3 + Math.sin(this.t * 4) * 0.12;
  }
}
