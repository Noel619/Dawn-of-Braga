// El osario de San Martín: el de los hermanos de Dumio, los que cavaron la
// cripta con el santo. Una capilla de doce lados bajo una cúpula de huesos:
// en nueve de sus lados, un hermano de pie en su nicho de herradura (con el
// arco de fémures), con su hábito, la capucha puesta y lo suyo en las
// manos; en el de levante, la puerta; en el de poniente, el ábside con el
// arca de huesos; en el del sur, la inscripción. En medio, bajo la lámpara
// de huesos, la fosa abierta, esperando al siguiente.
// El puzle (game/ossuaries.js, 'mirada'): a cuatro de los hermanos hay que
// volverles la cara hacia lo que guardaron en vida.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { MAT_DEFS } from '../gfx/materials.js';
import { archRing, dome } from './builders.js';
import * as P from './props.js';
import { bakeParts, moveParts, skullParts, boneParts, monkParts, spearheadParts, chainParts } from './ossuary_props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const M4 = () => new THREE.Matrix4();

// la planta: centro, apotema, lados, alto del muro y de la cúpula
export const OSM = { cx: -92, cz: -146, A: 6.0, N: 12, H: 3.6, rise: 3.0 };
// lo que hay en cada lado (k: el lado; su centro, a k·30° de +x hacia +z)
// door: la puerta; apse: el ábside del arca; tablet: la inscripción; monk:
// un hermano (hold: lo que lleva; puzzle: si es de los cuatro del puzle)
export const OSM_SIDES = [
  { k: 0, kind: 'door' },
  { k: 1, kind: 'monk', hold: 'reloj', puzzle: 'arca' },
  { k: 2, kind: 'monk', hold: 'cruz' },
  { k: 3, kind: 'tablet' },
  { k: 4, kind: 'monk', hold: 'pico', puzzle: 'fosa' },
  { k: 5, kind: 'monk', hold: 'calavera' },
  { k: 6, kind: 'apse' },
  { k: 7, kind: 'monk', hold: 'farol', puzzle: 'puerta' },
  { k: 8, kind: 'monk', hold: 'cruz' },
  { k: 9, kind: 'monk', hold: 'calavera' },
  { k: 10, kind: 'monk', hold: 'cruz' },
  { k: 11, kind: 'monk', hold: 'libro', puzzle: 'inscripcion' },
];

// el marco de un lado: x a lo largo (a la derecha de quien lo mira desde
// dentro), y arriba (desde el suelo), z hacia el centro
export function sideFrame(k, y0) {
  const O = OSM;
  const th = (k * Math.PI * 2) / O.N;
  const n = V(-Math.cos(th), 0, -Math.sin(th));
  const x = V(n.z, 0, -n.x);
  const c = V(O.cx + Math.cos(th) * O.A, y0, O.cz + Math.sin(th) * O.A);
  return M4().makeBasis(x, V(0, 1, 0), n).setPosition(c);
}

// el contorno de un arco de herradura (en el plano del lado): jambas desde
// y0 hasta ys a ±hw y el arco de radio ra por encima
function horseshoe(hw, y0, ys, ra, step = 0.16) {
  const yc = ys + Math.sqrt(Math.max(0, ra * ra - hw * hw));
  const a0 = Math.atan2(ys - yc, hw),
    a1 = Math.PI - a0;
  const n = Math.max(8, Math.ceil(((a1 - a0) * ra) / step));
  const pts = [V(-hw, y0, 0), V(hw, y0, 0)];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push(V(Math.cos(a) * ra, yc + Math.sin(a) * ra, 0));
  }
  return { pts, yc, a0, a1, top: yc + ra };
}
// el de la puerta: jambas y medio punto
function roundArch(hw, y0, ys, ring) {
  const pts = [V(-hw, y0, 0), V(hw, y0, 0), V(hw, ys, 0), V(hw + ring, ys, 0)];
  for (let i = 0; i <= 16; i++) {
    const a = (Math.PI * i) / 16;
    pts.push(V(Math.cos(a) * (hw + ring), ys + Math.sin(a) * (hw + ring), 0));
  }
  pts.push(V(-hw, ys, 0));
  return { pts };
}

export function buildOsarioMartin(ctx, C, L, o = {}) {
  const wb = ctx.wb;
  const O = OSM;
  const Y = o.y;
  const room = o.room;
  const rng = new RNG(4801);
  const L2 = O.A * Math.tan(Math.PI / O.N); // medio lado
  const Rc = O.A / Math.cos(Math.PI / O.N); // a las esquinas
  const Ys = Y + O.H;
  const wallT = [0.84, 0.8, 0.74];
  const bake = (parts, m) => bakeParts(wb, parts, m, { room });
  const boneT = () => {
    const k = rng.range(-0.1, 0.05);
    return [0.92 + k, 0.88 + k, 0.8 + k];
  };
  const geom = (mat, g, m, tint, opt = {}) => wb.geometry(mat, g, m, { ao: false, room, tint, uvScale: MAT_DEFS[mat].uv, ...opt });

  // --- el suelo transitable (un disco en la rejilla) y la losa, con la fosa
  const FOSA = { x0: O.cx - 1.05, x1: O.cx + 1.05, z0: O.cz - 0.5, z1: O.cz + 0.5, d: 1.1 };
  const rIn = O.A - 0.45;
  for (let z = O.cz - O.A; z < O.cz + O.A; z += 0.5) {
    const zc = z + 0.25;
    const h = Math.sqrt(Math.max(0, rIn * rIn - (zc - O.cz) ** 2));
    if (h < 0.25) continue;
    const xa = Math.ceil((O.cx - h - 0.25) * 2) / 2,
      xb = Math.floor((O.cx + h + 0.25) * 2) / 2;
    if (xb > xa) C.paint(xa, z, xb, z + 0.5, 1);
  }
  // (y el umbral de la puerta, hasta el paso, y la boca del ábside, hasta
  // el altar)
  C.paint(O.cx + O.A - 1.0, O.cz - 1.0, O.cx + O.A, O.cz + 1.0, 1);
  C.paint(O.cx - O.A - 0.5, O.cz - 0.9, O.cx - O.A + 1.0, O.cz + 0.9, 1);
  ctx.col.add(O.cx - O.A - 1.6, Y - 1, O.cz - 1.05, O.cx - O.A, Y, O.cz + 1.05);
  const sq = [O.cx - O.A, O.cz - O.A, O.cx + O.A, O.cz + O.A];
  for (const [a, b, c, d] of [
    [sq[0], sq[1], sq[2], FOSA.z0],
    [sq[0], FOSA.z1, sq[2], sq[3]],
    [sq[0], FOSA.z0, FOSA.x0, FOSA.z1],
    [FOSA.x1, FOSA.z0, sq[2], FOSA.z1],
  ]) {
    wb.box('flag', a, Y - 0.3, b, c, Y, d, { faces: 't', ao: false, sub: 2.5, room, tint: [0.7, 0.67, 0.62] });
    ctx.col.add(a, Y - 1, b, c, Y, d);
  }

  // --- la fosa: tierra en las paredes y en el fondo, el montón al lado, la
  // pala clavada; nadie baja a ella (un tope invisible)
  {
    const F = FOSA;
    const yb = Y - F.d;
    wb.box('dirt', F.x0, yb - 0.2, F.z0, F.x1, yb, F.z1, { faces: 't', ao: false, room, tint: [0.5, 0.42, 0.34] });
    wb.box('dirt', F.x0, yb, F.z0 - 0.05, F.x1, Y, F.z0, { faces: 's', ao: false, room, tint: [0.42, 0.36, 0.3] });
    wb.box('dirt', F.x0, yb, F.z1, F.x1, Y, F.z1 + 0.05, { faces: 'n', ao: false, room, tint: [0.42, 0.36, 0.3] });
    wb.box('dirt', F.x0 - 0.05, yb, F.z0, F.x0, Y, F.z1, { faces: 'e', ao: false, room, tint: [0.42, 0.36, 0.3] });
    wb.box('dirt', F.x1, yb, F.z0, F.x1 + 0.05, Y, F.z1, { faces: 'w', ao: false, room, tint: [0.42, 0.36, 0.3] });
    // el bordillo de losas levantadas
    for (const [a, b, c, d] of [
      [F.x0 - 0.12, F.z0 - 0.12, F.x1 + 0.12, F.z0],
      [F.x0 - 0.12, F.z1, F.x1 + 0.12, F.z1 + 0.12],
      [F.x0 - 0.12, F.z0, F.x0, F.z1],
      [F.x1, F.z0, F.x1 + 0.12, F.z1],
    ])
      wb.box('ashlar', a, Y, b, c, Y + 0.05, d, { ao: false, room, tint: [0.62, 0.58, 0.52] });
    ctx.col.add(F.x0, Y - 1.2, F.z0, F.x1, Y + 1.3, F.z1);
    // el montón de tierra (al norte) y la pala clavada en él
    for (let k = 0; k < 6; k++) P.roughStone(ctx, O.cx - 0.8 + k * 0.32 + rng.range(-0.1, 0.1), Y, F.z0 - 0.55 + rng.range(-0.12, 0.12), rng.range(0.22, 0.34), 4810 + k, { mat: 'dirt', room, tint: [0.78, 0.66, 0.52] });
    ctx.col.add(O.cx - 1.0, Y, F.z0 - 0.9, O.cx + 1.0, Y + 0.35, F.z0 - 0.2);
    wb.push();
    wb.translate(O.cx + 0.55, Y + 0.2, F.z0 - 0.6);
    wb.rotateZ(-0.25);
    wb.rotateX(0.12);
    wb.cylinder('wooddark', 0, 0, 0, 0.018, 0.018, 1.1, 5, { ao: false, room });
    wb.box('iron', -0.11, -0.28, -0.012, 0.11, 0.02, 0.012, { ao: false, room });
    wb.pop();
    P.bones(ctx, O.cx + 1.4, Y, O.cz + 0.9, 6, 4812, 0.5);
  }

  // --- los doce lados
  const info = [];
  for (const S of OSM_SIDES) {
    const m = sideFrame(S.k, Y);
    // la cara del muro, con su hueco
    const shape = new THREE.Shape([new THREE.Vector2(-L2, 0), new THREE.Vector2(L2, 0), new THREE.Vector2(L2, O.H), new THREE.Vector2(-L2, O.H)]);
    let hole = null,
      depth = 0,
      hs = null;
    if (S.kind === 'door') hole = roundArch(1.2, 0, 2.0, 0.3);
    else if (S.kind === 'monk') {
      hs = horseshoe(0.6, 0.3, 2.0, 0.7);
      hole = hs;
      depth = 0.62;
    } else if (S.kind === 'apse') {
      hs = horseshoe(1.0, 0, 1.95, 1.1);
      hole = hs;
      depth = 1.55;
    } else if (S.kind === 'tablet') {
      hs = horseshoe(1.25, 0.55, 1.5, 1.38);
      hole = hs;
      depth = 0.16;
    }
    if (hole) shape.holes.push(new THREE.Path(hole.pts.map((p) => new THREE.Vector2(p.x, p.y))));
    geom('boneRosette', new THREE.ShapeGeometry(shape, 6), m, wallT, { grime: true });
    // el zócalo de sillería (a los lados del hueco)
    const hw0 = hole ? Math.abs(hole.pts[0].x) + (S.kind === 'door' ? 0 : 0.0) : 0;
    for (const [a, b] of hole && hole.pts[0].y < 0.01 ? [[-L2, -hw0], [hw0, L2]] : [[-L2, L2]]) {
      const g = new THREE.BoxGeometry(b - a, 0.32, 0.06);
      g.translate((a + b) / 2, 0.16, 0.03);
      geom('ashlar', g, m, [0.66, 0.62, 0.56]);
    }
    // el hondo del nicho: el contorno, llevado hacia dentro, y el fondo
    if (depth > 0) {
      const pts = hole.pts;
      const NT = S.kind === 'apse' ? [0.6, 0.57, 0.52] : [0.5, 0.47, 0.43];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i],
          b = pts[(i + 1) % pts.length];
        const pa = a.clone().applyMatrix4(m),
          pb = b.clone().applyMatrix4(m);
        const pc = V(b.x, b.y, -depth).applyMatrix4(m),
          pd = V(a.x, a.y, -depth).applyMatrix4(m);
        wb.quad(i === 0 ? 'flag' : S.kind === 'apse' ? 'ashlar' : 'boneRosette', pa, pb, pc, pd, { ao: false, room, tint: NT, sub: 3 });
      }
      const back = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, p.y)));
      geom(S.kind === 'apse' ? 'ashlar' : S.kind === 'tablet' ? 'ashlar' : 'boneRosette', new THREE.ShapeGeometry(back, 6), m.clone().multiply(M4().makeTranslation(0, 0, -depth)), NT);
      // el arco de fémures: dos hileras de huesos a lo largo del arco, las
      // jambas de huesos de pie y una calavera en la clave
      if (hs) {
        const rows = S.kind === 'tablet' ? [hs.top - hs.yc + 0.07] : [0.07, 0.17].map((d) => (hs.top - hs.yc) + d);
        for (const ra of rows) {
          const n = Math.round(((hs.a1 - hs.a0) * ra) / 0.27);
          for (let i = 0; i < n; i++) {
            const t0 = hs.a0 + ((hs.a1 - hs.a0) * (i + 0.08)) / n,
              t1 = hs.a0 + ((hs.a1 - hs.a0) * (i + 0.92)) / n;
            bake(boneParts(V(Math.cos(t0) * ra, hs.yc + Math.sin(t0) * ra, 0.045), V(Math.cos(t1) * ra, hs.yc + Math.sin(t1) * ra, 0.045), 0.026), m);
          }
        }
        const hw = Math.abs(hs.pts[0].x);
        const ys = hs.pts[2].y; // (donde arranca el arco)
        for (const s of [-1, 1]) {
          const x = s * (hw + 0.08);
          const yj0 = hs.pts[0].y,
            yj1 = hs.yc + Math.sin(hs.a0) * (hs.top - hs.yc + 0.07);
          const n = Math.max(1, Math.round((yj1 - yj0) / 0.32));
          for (let i = 0; i < n; i++) bake(boneParts(V(x, yj0 + ((yj1 - yj0) * (i + 0.1)) / n, 0.045), V(x, yj0 + ((yj1 - yj0) * (i + 0.9)) / n, 0.045), 0.026), m);
        }
        bake(skullParts({ jaw: false, tint: [0.92, 0.88, 0.8] }), m.clone().multiply(M4().makeTranslation(0, hs.top + 0.14, 0.06)));
        info.push({ S, m, hs, ys });
      }
    }
  }

  // --- la cornisa: un anillo de piedra con su hilera de calaveras, al pie de
  // la cúpula
  for (const S of OSM_SIDES) {
    const m = sideFrame(S.k, Y);
    const g = new THREE.BoxGeometry(2 * L2 + 0.02, 0.22, 0.2);
    g.translate(0, O.H - 0.11, 0.1);
    geom('ashlar', g, m, [0.7, 0.66, 0.6]);
    const n = 9;
    for (let i = 0; i < n; i++) {
      const x = -L2 + ((i + 0.5) * 2 * L2) / n;
      bake(skullParts({ jaw: false, tint: boneT() }), m.clone().multiply(M4().makeTranslation(x, O.H + 0.075, 0.12)).multiply(M4().makeRotationY(rng.range(-0.25, 0.25))));
    }
  }

  // --- la cúpula de huesos, con sus doce nervios y la clave
  const D = dome(ctx, { cx: O.cx, cz: O.cz, r: Rc, y0: Ys, rise: O.rise, n: O.N, m: 9, phase: Math.PI / O.N, mat: 'femurs', tint: [0.78, 0.74, 0.68], room, sub: 1.2, ribs: O.N, ribPhase: Math.PI / O.N, ribMat: 'bone', ribTint: [0.86, 0.82, 0.74], ribW: 0.22, ribD: 0.16 });
  ctx.col.add(O.cx - 3, Ys + O.rise - 0.05, O.cz - 3, O.cx + 3, Ys + O.rise + 0.4, O.cz + 3).cam = true;

  // --- la lámpara de huesos (sobre la fosa): una columna de calaveras y
  // vértebras de la que salen seis brazos de huesos, cada uno con su
  // calavera y su vela; abajo, una corona de calaveras colgando
  {
    const lx = O.cx,
      lz = O.cz,
      ly = Y + 3.15;
    bake(chainParts(V(lx, D.crown - 0.3, lz), V(lx, ly + 1.05, lz), 0.06), null);
    for (let k = 0; k < 5; k++) bake(skullParts({ jaw: false, tint: boneT() }), M4().compose(V(lx, ly + 0.2 + k * 0.17, lz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, k * 1.3, 0)), V(0.9, 0.9, 0.9)));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const c = Math.cos(a),
        s = Math.sin(a);
      const p0 = V(lx + c * 0.1, ly + 0.25, lz + s * 0.1),
        p1 = V(lx + c * 0.42, ly + 0.05, lz + s * 0.42),
        p2 = V(lx + c * 0.72, ly + 0.2, lz + s * 0.72);
      bake(boneParts(p0, p1, 0.022), null);
      bake(boneParts(p1, p2, 0.022), null);
      bake(skullParts({ jaw: false, tint: boneT() }), M4().compose(V(p2.x, p2.y + 0.07, p2.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(c, s), 0)), V(0.85, 0.85, 0.85)));
      wb.cylinder('candle', p2.x, p2.y + 0.15, p2.z, 0.025, 0.025, 0.14, 5, { ao: false, capTop: true, grime: false, room });
      if (ctx.fires) ctx.fires.push({ x: p2.x, y: p2.y + 0.31, z: p2.z, s: 0.1, light: false, embers: false, glow: k % 2 === 0 });
      // la corona de abajo: una calavera colgando de cada brazo
      const q = V(lx + c * 0.42, ly - 0.32, lz + s * 0.42);
      bake(chainParts(p1, V(q.x, q.y + 0.1, q.z), 0.05), null);
      bake(skullParts({ jaw: true, open: 0.6, tint: boneT() }), M4().compose(q, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(c, s), 0)), V(0.8, 0.8, 0.8)));
    }
    bake(spearheadParts(0.3).map((p) => ({ ...p, mat: 'bone' })), M4().compose(V(lx, ly + 0.1, lz), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)), V(1, 1, 1)));
    if (ctx.lights) ctx.lights.push({ x: lx, y: ly + 0.3, z: lz, r: 1, g: 0.6, b: 0.32, radius: 9.5, intensity: 1.1, room });
  }

  // --- los hermanos en sus nichos (de pie, sobre la repisa). Los cuatro del
  // puzle llevan la cabeza aparte (la monta game/ossuaries.js)
  const monks = [];
  for (const I of info) {
    const S = I.S;
    if (S.kind !== 'monk') continue;
    const mm = I.m.clone().multiply(M4().makeTranslation(0, 0.3, -0.32));
    const M = monkParts(S.hold, { open: rng.range(0.15, 0.6) });
    bake(M.body, mm);
    const headM = mm.clone().multiply(M4().makeTranslation(0, M.headY, 0));
    if (!S.puzzle) bake(M.head, headM.clone().multiply(M4().makeRotationX(0.3 + rng.range(-0.1, 0.1))).multiply(M4().makeRotationY(rng.range(-0.3, 0.3))));
    else monks.push({ k: S.k, hold: S.hold, target: S.puzzle, head: headM.toArray() });
    // a sus pies, una vela de difuntos que lo alumbra desde abajo
    const cp = V(rng.range(-0.32, -0.22), 0.3, -0.06).applyMatrix4(I.m);
    P.candles(ctx, cp.x, Y + 0.3, cp.z, 2, 4850 + S.k, { room, radius: 2.6, intensity: 0.75, spread: 0.04, scale: 0.7 });
    // el farol del portero alumbra su nicho
    if (S.hold === 'farol' && ctx.lights) {
      const p = V(0.17, 0.3 + 0.86, -0.32 + 0.26).applyMatrix4(I.m);
      ctx.lights.push({ x: p.x, y: p.y, z: p.z, r: 1, g: 0.62, b: 0.3, radius: 2.6, intensity: 0.7, room });
      if (ctx.fires) ctx.fires.push({ x: p.x, y: p.y - 0.02, z: p.z, s: 0.05, light: false, embers: false, glow: true });
    }
  }

  // --- el ábside del arca: el altar de sillería con su frontal de huesos, las
  // velas y, arriba, la cruz de Martín (el arca, la monta game/ossuaries.js)
  const apse = sideFrame(6, Y);
  const AP = (x, y, z) => V(x, y, z).applyMatrix4(apse);
  {
    const ab = (x0, y0, z0, x1, y1, z1, mat, tint) => {
      const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
      g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      geom(mat, g, apse, tint);
    };
    ab(-0.8, 0, -1.5, 0.8, 0.95, -0.75, 'ashlar', [0.7, 0.66, 0.6]);
    ab(-0.88, 0.95, -1.55, 0.88, 1.03, -0.68, 'ashlar', [0.78, 0.74, 0.68]);
    ab(-0.66, 0.12, -0.752, 0.66, 0.84, -0.742, 'femurs', [0.88, 0.84, 0.76]);
    const c0 = AP(-0.88, 0, -1.55),
      c1 = AP(0.88, 1.03, -0.68);
    ctx.col.add(Math.min(c0.x, c1.x), Y, Math.min(c0.z, c1.z), Math.max(c0.x, c1.x), Y + 1.03, Math.max(c0.z, c1.z));
    // la cruz de Martín (de huesos) en el fondo del ábside
    const cx = AP(0, 2.35, -1.5);
    bake(boneParts(V(0, 1.75, -1.5), V(0, 2.95, -1.5), 0.04), apse);
    bake(boneParts(V(-0.42, 2.55, -1.48), V(0.42, 2.55, -1.48), 0.04), apse);
    bake(skullParts({ jaw: false, tint: [0.92, 0.88, 0.8] }), apse.clone().multiply(M4().makeTranslation(0, 2.55, -1.42)));
    for (const s of [-1, 1]) {
      const p = AP(s * 0.66, 1.03, -0.95);
      P.candles(ctx, p.x, p.y, p.z, 3, 4820 + s, { room, radius: 4.2, intensity: 0.8, spread: 0.06 });
    }
    if (ctx.lights) ctx.lights.push({ x: cx.x, y: Y + 2.0, z: cx.z, r: 1, g: 0.66, b: 0.38, radius: 3.4, intensity: 0.5, room });
  }

  // --- la inscripción, en su arco ciego del sur
  const tab = sideFrame(3, Y);
  {
    const g = new THREE.PlaneGeometry(2.2, 0.7);
    geom('letreroDumio', g, tab.clone().multiply(M4().makeTranslation(0, 1.95, -0.15)), null, { grime: false, uvScale: 1 });
    const fr = new THREE.BoxGeometry(2.36, 0.86, 0.04);
    fr.translate(0, 1.95, -0.17);
    geom('ashlar', fr, tab, [0.62, 0.58, 0.52]);
    for (const s of [-1, 1]) {
      const p = V(s * 1.0, 0.55, -0.08).applyMatrix4(tab);
      P.candles(ctx, p.x, Y + 0.55, p.z, 2, 4830 + s, { room, radius: 3.2, intensity: 0.5, spread: 0.05 });
    }
  }

  // --- el atril con la crónica de Dumio, junto a la puerta
  {
    const a = -0.72,
      r = 4.4;
    const x = O.cx + Math.cos(a) * r,
      z = O.cz + Math.sin(a) * r;
    const rot = Math.atan2(O.cx - x, O.cz - z);
    wb.at(x, Y, z, rot, () => {
      wb.box('wooddark', -0.22, 0, -0.18, 0.22, 0.06, 0.18, { room, ao: false });
      wb.box('wooddark', -0.05, 0.06, -0.05, 0.05, 1.0, 0.05, { room, ao: false });
      wb.push();
      wb.translate(0, 1.0, 0);
      wb.rotateX(0.42);
      wb.box('wooddark', -0.26, 0, -0.2, 0.26, 0.04, 0.2, { room, ao: false });
      wb.box('wooddark', -0.26, 0.04, 0.17, 0.26, 0.07, 0.2, { room, ao: false });
      wb.pop();
    });
    ctx.col.addOBB(x, z, 0.26, 0.22, rot, Y, Y + 1.1);
    L.interact.push({ kind: 'note', id: 'n_dumio', note: 'dumio', model: 'book', x, y: Y + 1.1, z, r: 1.6 });
    P.candles(ctx, x + Math.sin(rot + 1.6) * 0.45, Y, z + Math.cos(rot + 1.6) * 0.45, 3, 4840, { room, radius: 3.2, intensity: 0.45, spread: 0.12 });
  }

  // la inscripción se lee de cerca
  {
    const p = V(0, 0, 0.9).applyMatrix4(tab);
    L.interact.push({ kind: 'note', id: 'n_osario', note: 'osario', x: p.x, y: Y + 1.3, z: p.z, model: 'wall', r: 1.6 });
  }

  // lo que miran los hermanos: la puerta, la inscripción, la fosa y el arca
  const door = V(0, 1.6, 0.0).applyMatrix4(sideFrame(0, Y));
  const ins = V(0, 1.95, -0.1).applyMatrix4(tab);
  const arca = AP(0, 1.25, -1.1);
  const targets = { puerta: door.toArray(), inscripcion: ins.toArray(), fosa: [O.cx, Y - 0.4, O.cz], arca: arca.toArray() };
  // el objeto bendito, en el arca
  L.interact.push({ kind: 'item', id: 'i_cerrojo', item: 'cerrojo', x: arca.x, y: Y + 1.35, z: arca.z, r: 2.0, afterFlag: 'puzzle:martin' });
  L.puzzles.push({
    kind: 'mirada',
    id: 'martin',
    item: 'i_cerrojo',
    x: O.cx,
    y: Y,
    z: O.cz,
    probe: [O.cx, Y + 1.6, O.cz],
    monks,
    targets,
    order: ['bowed', 'puerta', 'inscripcion', 'fosa', 'arca'],
    arca: { m: apse.clone().multiply(M4().makeTranslation(0, 1.03, -1.1)).toArray() },
  });
  // la zona y el mapa (la planta: el cuadrado que la contiene)
  return { sq, D };
}
