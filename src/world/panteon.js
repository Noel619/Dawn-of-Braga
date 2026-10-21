// El Panteón de los Obispos (la cripta honda), en el sitio de la vieja Sala
// de los Obispos (una caja enorme, vacía, de columnas y tumbas sin sentido).
// Una rotonda: el muro redondo con los ocho obispos en sus arcosolios (en
// el muro, no en el paso) y las cuatro salidas en cruz, cada una con su
// luz, que se ven todas desde dentro (oro hacia San Martín, por la galilea;
// rojo hacia la antesala, por una gran reja; azul frío hacia las
// catacumbas; y la del templo romano); un deambulatorio bajo su bóveda; un
// anillo de doce columnas con sus arcos y, encima, la cúpula pintada de
// estrellas. Colgada en medio, la corona de luz (la rueda de hierro con sus
// torres y sus velas). Debajo, el pozo de los obispos: el suelo se hunde
// hasta el nivel de las catacumbas, con sus sepulcros en las paredes y el
// del primero de todos en el fondo; se baja por una escalera que se ciñe a
// la pared. Al oeste, la galilea: el vestíbulo con los tres arcos a San
// Martín (sin tumbas en el paso).
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { MAT_DEFS } from '../gfx/materials.js';
import { dome, barrelVault, rampVault, archRing, pilaster, lunette, stairs } from './builders.js';
import * as P from './props.js';
import { bakeParts, chainParts, flip, bishopTombParts } from './ossuary_props.js';
import { roundArch } from './osario_martin.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const M4 = () => new THREE.Matrix4();

// la rotonda: centro, radio del muro, del anillo de columnas y del pozo;
// alto del muro (arranque de la bóveda del deambulatorio) y de lo alto de
// los arcos (arranque de la cúpula)
export const PAN = { cx: -40, cz: -118.5, R: 11.5, ring: 7.6, pit: 4.0, H: 4.4, top: 5.6, rise: 1.0 };
// la galilea, entre la rotonda y la cripta de San Martín
export const GAL = { x0: -62, x1: -52, z0: -136, z1: -114.5, ys: 4.2, rise: 2.4 };
// las salidas: [ángulo (de +x hacia +z), media luz del vano, arranque del arco]
// (la luz, la de sus pasos; la rosca no pasa de la cornisa)
// (jamb: el alto de los muros de su paso)
const DOORS = {
  0: { hw: 2.0, ys: 1.9, jamb: 3.4 }, // al templo (este)
  3: { hw: 1.5, ys: 2.2, jamb: 2.2 }, // a las catacumbas (sur)
  6: { hw: 2.0, ys: 1.9, jamb: 1.9 }, // a la galilea (oeste)
  9: { hw: 2.0, ys: 1.9, jamb: 3.4 }, // a la reja de la antesala (norte)
};

// el marco de una cara plana del muro redondo, a 'th' y a 'd' del centro:
// x a lo largo (a la derecha de quien la mira desde dentro), y arriba, z
// hacia el centro
function faceFrame(th, d, y0, c = PAN) {
  const n = V(-Math.cos(th), 0, -Math.sin(th));
  const x = V(n.z, 0, -n.x);
  return M4().makeBasis(x, V(0, 1, 0), n).setPosition(V(c.cx + Math.cos(th) * d, y0, c.cz + Math.sin(th) * d));
}
// UV planas (en metros, por la escala del material) para una geometría en
// el plano xy
function planarUV(g, s) {
  const p = g.attributes.position,
    uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * s, p.getY(i) * s);
  return g;
}

export function buildPanteon(ctx, C, L, o = {}) {
  const wb = ctx.wb;
  const { cx, cz, R, H } = PAN;
  const Y = o.y,
    YC = o.yc;
  const room = o.room;
  const rng = new RNG(5101);
  const AT = [0.88, 0.85, 0.79],
    WT = [0.74, 0.7, 0.64];
  const geom = (mat, g, m, tint, opt = {}) => wb.geometry(mat, g, m, { ao: false, room, tint, uvScale: MAT_DEFS[mat].uv, ...opt });
  const pt = (th, r, y) => V(cx + Math.cos(th) * r, y, cz + Math.sin(th) * r);
  const DEG = Math.PI / 180;
  // un sepulcro de obispo (ossuary_props.js) en el marco 'mt' y su colisión
  const tomb = (mt, o2) => {
    bakeParts(wb, bishopTombParts(o2), mt, { room });
    const c = V(0, 0, 0).applyMatrix4(mt),
      ax = V(1, 0, 0).transformDirection(mt);
    ctx.col.addOBB(c.x, c.z, o2.L + 0.08, o2.W + 0.08, Math.atan2(-ax.z, ax.x), c.y, c.y + 1.1);
  };

  // --- el suelo transitable (en la rejilla), las losas y la colisión: el
  // anillo del deambulatorio (macizo hasta el fondo del pozo) y el pozo
  const rIn = R - 0.45;
  for (let z = cz - R; z < cz + R; z += 0.5) {
    const zc = z + 0.25;
    const h = Math.sqrt(Math.max(0, rIn * rIn - (zc - cz) ** 2));
    if (h < 0.25) continue;
    const xa = Math.ceil((cx - h - 0.25) * 2) / 2,
      xb = Math.floor((cx + h + 0.25) * 2) / 2;
    if (xb > xa) C.paint(xa, z, xb, z + 0.5, 1);
  }
  for (let z = cz - R - 0.25; z < cz + R + 0.25; z += 0.25) {
    const zc = z + 0.125,
      dz = zc - cz;
    const ho = Math.sqrt(Math.max(0, (R + 0.3) ** 2 - dz * dz));
    const hi = Math.sqrt(Math.max(0, PAN.pit ** 2 - dz * dz));
    if (ho <= 0) continue;
    if (hi <= 0) ctx.col.add(cx - ho, YC - 0.5, z, cx + ho, Y, z + 0.25);
    else {
      ctx.col.add(cx - ho, YC - 0.5, z, cx - hi, Y, z + 0.25);
      ctx.col.add(cx + hi, YC - 0.5, z, cx + ho, Y, z + 0.25);
    }
  }
  ctx.col.add(cx - PAN.pit, YC - 1, cz - PAN.pit, cx + PAN.pit, YC, cz + PAN.pit);
  {
    const ring = planarUV(new THREE.RingGeometry(PAN.pit, R + 0.3, 72, 3), MAT_DEFS.flag.uv);
    geom('flag', ring, M4().makeRotationX(-Math.PI / 2).setPosition(cx, Y, cz), [0.72, 0.68, 0.62], { uvScale: 1, sub: 3 });
    // el anillo de mosaico bajo las columnas
    const band = planarUV(new THREE.RingGeometry(PAN.ring - 0.9, PAN.ring + 0.9, 72, 1), MAT_DEFS.mosaic.uv);
    geom('mosaic', band, M4().makeRotationX(-Math.PI / 2).setPosition(cx, Y + 0.004, cz), [0.78, 0.6, 0.52], { uvScale: 1 });
    const pf = planarUV(new THREE.CircleGeometry(PAN.pit, 40), MAT_DEFS.flag.uv);
    geom('flag', pf, M4().makeRotationX(-Math.PI / 2).setPosition(cx, YC, cz), [0.62, 0.58, 0.54], { uvScale: 1 });
  }

  // --- el muro redondo: doce caras planas (las salidas y los arcosolios) y,
  // entre ellas, el lienzo curvo
  const faces = [];
  for (let k = 0; k < 12; k++) {
    const th = k * 30 * DEG;
    const door = DOORS[k];
    // (la cara de una salida, a 0,5 del muro: donde acaba su paso)
    const hb = door ? Math.sqrt(R * R - (R - 0.5) ** 2) : 1.75;
    faces.push({ k, th, door, hb, al: Math.asin(hb / R) });
  }
  for (let i = 0; i < 12; i++) {
    const A = faces[i],
      B = faces[(i + 1) % 12];
    const ta = A.th + A.al,
      tb = B.th - B.al + (i === 11 ? Math.PI * 2 : 0);
    const n = Math.max(1, Math.ceil((tb - ta) / (6 * DEG)));
    for (let j = 0; j < n; j++) {
      const t0 = ta + ((tb - ta) * j) / n,
        t1 = ta + ((tb - ta) * (j + 1)) / n;
      wb.quad('ashlar', pt(t0, R, Y), pt(t1, R, Y), pt(t1, R, Y + H), pt(t0, R, Y + H), { room, tint: WT, sub: 1.6, aoH: 1.4, aoMin: 0.55, baseY: Y });
      // el zócalo
      wb.quad('ashlar', pt(t0, R - 0.06, Y), pt(t1, R - 0.06, Y), pt(t1, R - 0.06, Y + 0.45), pt(t0, R - 0.06, Y + 0.45), { room, tint: [0.62, 0.58, 0.52], ao: false });
      wb.quad('ashlar', pt(t0, R - 0.06, Y + 0.45), pt(t1, R - 0.06, Y + 0.45), pt(t1, R, Y + 0.45), pt(t0, R, Y + 0.45), { room, tint: [0.7, 0.66, 0.6], ao: false });
    }
  }
  const arcos = [];
  for (const F of faces) {
    const d = R * Math.cos(F.al);
    const m = faceFrame(F.th, d, Y);
    const shape = new THREE.Shape([new THREE.Vector2(-F.hb, 0), new THREE.Vector2(F.hb, 0), new THREE.Vector2(F.hb, H), new THREE.Vector2(-F.hb, H)]);
    let hole;
    if (F.door) hole = roundArch(F.door.hw, 0, F.door.ys, 0.3).pts;
    else {
      // el arcosolio: jambas hasta 1,5 y medio punto
      hole = [V(-1.25, 0, 0), V(1.25, 0, 0)];
      for (let i = 0; i <= 14; i++) {
        const a = (Math.PI * i) / 14;
        hole.push(V(Math.cos(a) * 1.25, 1.5 + Math.sin(a) * 1.25, 0));
      }
    }
    shape.holes.push(new THREE.Path(hole.map((p) => new THREE.Vector2(p.x, p.y))));
    geom('ashlar', new THREE.ShapeGeometry(shape, 8), m, WT, { grime: true });
    if (F.door) {
      // (por detrás, la cara que cierra la bóveda de su paso sobre el arco) y
      // los costados del vano hasta el borde de la rotonda (carve no les
      // pone muro: esas celdas lindan con ella)
      geom('ashlar', new THREE.ShapeGeometry(shape, 8), m.clone().multiply(M4().makeRotationY(Math.PI)), WT);
      const n = V(Math.cos(F.th), 0, Math.sin(F.th)),
        t = V(-n.z, 0, n.x);
      const h = F.door.jamb;
      for (const sd of [-1, 1]) {
        const p = (d, y) => V(cx, y, cz).addScaledVector(n, d).addScaledVector(t, sd * F.door.hw);
        const q = [p(R - 0.5, Y), p(R, Y), p(R, Y + h), p(R - 0.5, Y + h)];
        if (sd < 0) wb.quad('ashlar', q[0], q[1], q[2], q[3], { room, tint: WT, sub: 1.6, aoH: 1.4, aoMin: 0.55, baseY: Y });
        else wb.quad('ashlar', q[1], q[0], q[3], q[2], { room, tint: WT, sub: 1.6, aoH: 1.4, aoMin: 0.55, baseY: Y });
      }
      continue;
    }
    // el hondo del arcosolio: el contorno llevado hacia dentro del muro, el
    // fresco del fondo (el obispo de pie, con su nombre) y el sepulcro
    const depth = 1.15;
    for (let i = 0; i < hole.length; i++) {
      const a = hole[i],
        b = hole[(i + 1) % hole.length];
      wb.quad(i === 0 ? 'flag' : 'ashlar', a.clone().applyMatrix4(m), b.clone().applyMatrix4(m), V(b.x, b.y, -depth).applyMatrix4(m), V(a.x, a.y, -depth).applyMatrix4(m), { ao: false, room, tint: [0.58, 0.55, 0.5], sub: 3 });
    }
    const back = new THREE.ShapeGeometry(new THREE.Shape(hole.map((p) => new THREE.Vector2(p.x, p.y))), 8);
    {
      // (uno de los cuatro frescos de la textura)
      const tile = arcos.length % 4,
        uv = back.attributes.uv,
        bp = back.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (tile % 2) * 0.5 + ((bp.getX(i) + 1.25) / 2.5) * 0.5, 0.5 - Math.floor(tile / 2) * 0.5 + (bp.getY(i) / 2.75) * 0.5);
    }
    wb.geometry('frescoObispos', back, m.clone().multiply(M4().makeTranslation(0, 0, -depth)), { ao: false, room, grime: false, tint: [0.92, 0.9, 0.86] });
    // la rosca del arco, en relieve, y su clave
    for (let i = 0; i < 9; i++) {
      const a0 = (Math.PI * i) / 9,
        a1 = (Math.PI * (i + 1)) / 9;
      const q = (r, a, z) => V(Math.cos(a) * r, 1.5 + Math.sin(a) * r, z).applyMatrix4(m);
      wb.quad('ashlar', q(1.25, a1, 0.04), q(1.25, a0, 0.04), q(1.55, a0, 0.04), q(1.55, a1, 0.04), { ao: false, room, tint: AT.map((v) => v * (i % 2 ? 0.94 : 1)) });
    }
    for (const s of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.3, 1.5, 0.05);
      g.translate(s * 1.4, 0.75, 0.025);
      geom('ashlar', g, m, AT);
    }
    // el obispo en su sepulcro, tendido sobre la tapa
    tomb(m.clone().multiply(M4().makeTranslation(0, 0, -0.62)), { L: 1.05, W: 0.48 });
    // dos velas al pie y su luz
    const cp = V(0.95, 0, 0.35).applyMatrix4(m);
    P.candles(ctx, cp.x, Y, cp.z, 3, 5110 + F.k, { room, radius: 3.6, intensity: 0.6, spread: 0.12 });
    arcos.push({ F, m });
  }
  // la cornisa del muro, al pie de la bóveda del deambulatorio
  {
    const n = 72;
    for (let i = 0; i < n; i++) {
      const t0 = (i / n) * Math.PI * 2,
        t1 = ((i + 1) / n) * Math.PI * 2;
      wb.quad('ashlar', pt(t0, R - 0.22, Y + H - 0.18), pt(t1, R - 0.22, Y + H - 0.18), pt(t1, R - 0.22, Y + H), pt(t0, R - 0.22, Y + H), { ao: false, room, tint: AT });
      wb.quad('ashlar', pt(t0, R, Y + H - 0.18), pt(t1, R, Y + H - 0.18), pt(t1, R - 0.22, Y + H - 0.18), pt(t0, R - 0.22, Y + H - 0.18), { ao: false, room, tint: AT.map((v) => v * 0.8) });
    }
  }

  // --- la bóveda del deambulatorio: de lo alto del muro a lo alto de los
  // arcos del anillo (una vuelta de cuarto de elipse, encalada, con
  // nervios)
  const ra = PAN.ring - 0.1;
  const prof = [];
  for (let i = 0; i <= 8; i++) {
    const t = (i / 8) * (Math.PI / 2);
    prof.push([ra + (R - 0.22 - ra) * Math.cos(t), Y + H + (PAN.top - H) * Math.sin(t)]);
  }
  {
    const n = 72;
    for (let i = 0; i < n; i++) {
      const t0 = (i / n) * Math.PI * 2,
        t1 = ((i + 1) / n) * Math.PI * 2;
      for (let j = 0; j < prof.length - 1; j++) {
        const [r0, y0] = prof[j],
          [r1, y1] = prof[j + 1];
        wb.quad('plaster', pt(t0, r0, y0), pt(t1, r0, y0), pt(t1, r1, y1), pt(t0, r1, y1), { ao: false, room, tint: [0.66, 0.6, 0.52], sub: 2 });
      }
    }
    // los nervios del deambulatorio: del muro a cada columna
    for (let k = 0; k < 12; k++) {
      const th = (15 + k * 30) * DEG;
      for (let j = 0; j < prof.length - 1; j++) {
        const [r0, y0] = prof[j],
          [r1, y1] = prof[j + 1];
        const a = pt(th, r0, y0 - 0.06),
          b = pt(th, r1, y1 - 0.06);
        const g = new THREE.BoxGeometry(0.26, 0.16, a.distanceTo(b) + 0.02);
        const mm = M4().lookAt(a, b, V(0, 1, 0));
        mm.setPosition(a.clone().add(b).multiplyScalar(0.5));
        wb.geometry('ashlar', g, mm, { ao: false, room, tint: AT });
      }
    }
    ctx.col.addCam(cx - R, Y + H + 0.6, cz - R, cx + R, Y + PAN.top + 0.4, cz + R);
  }

  // --- el anillo de columnas y sus arcos, y encima la cúpula de estrellas
  const colsAt = [];
  for (let k = 0; k < 12; k++) {
    const th = (15 + k * 30) * DEG;
    const p = pt(th, PAN.ring, Y);
    colsAt.push({ th, p });
    P.column(ctx, p.x, Y, p.z, 3.4, 0.3, { mat: 'ashlar' });
  }
  for (let k = 0; k < 12; k++) {
    const a = colsAt[k].p,
      b = colsAt[(k + 1) % 12].p;
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const half = a.distanceTo(b) / 2;
    const thm = (30 + k * 30) * DEG;
    // la cara hacia el centro y la de fuera (el arco de medio punto entre los
    // capiteles y el macizo hasta la cornisa)
    const hw = half - 0.42;
    const shape = new THREE.Shape([new THREE.Vector2(-half, 3.4), new THREE.Vector2(half, 3.4), new THREE.Vector2(half, PAN.top), new THREE.Vector2(-half, PAN.top)]);
    const hole = [new THREE.Vector2(-hw, 3.4), new THREE.Vector2(hw, 3.4)];
    for (let i = 0; i <= 16; i++) {
      const t = (Math.PI * i) / 16;
      hole.push(new THREE.Vector2(Math.cos(t) * hw, 3.4 + Math.sin(t) * hw * 0.62));
    }
    shape.holes.push(new THREE.Path(hole));
    const dIn = Math.cos(15 * DEG) * PAN.ring;
    // (la de fuera, con el marco vuelto: mira al deambulatorio)
    geom('ashlar', new THREE.ShapeGeometry(shape, 8), faceFrame(thm, dIn - 0.25, Y), AT, { grime: true });
    geom('ashlar', new THREE.ShapeGeometry(shape, 8), faceFrame(thm, dIn + 0.25, Y).multiply(M4().makeRotationY(Math.PI)), AT, { grime: true });
    // el intradós del arco (de una cara a la otra)
    const mI = faceFrame(thm, dIn, Y);
    for (let i = 0; i < 16; i++) {
      const t0 = (Math.PI * i) / 16,
        t1 = (Math.PI * (i + 1)) / 16;
      const q = (t, z) => V(Math.cos(t) * hw, 3.4 + Math.sin(t) * hw * 0.62, z).applyMatrix4(mI);
      wb.quad('ashlar', q(t0, 0.25), q(t1, 0.25), q(t1, -0.25), q(t0, -0.25), { ao: false, room, tint: AT.map((v) => v * 0.9) });
    }
    // el canto de arriba
    const top = new THREE.BoxGeometry(2 * half + 0.1, 0.12, 0.62);
    top.translate(0, PAN.top + 0.06, 0);
    geom('ashlar', top, mI, AT);
    void mid;
  }
  // los cimacios sobre los capiteles (donde arrancan los arcos)
  for (const C2 of colsAt) wb.box('ashlar', C2.p.x - 0.45, Y + 3.4, C2.p.z - 0.45, C2.p.x + 0.45, Y + 3.52, C2.p.z + 0.45, { ao: false, room, tint: AT });
  const D = dome(ctx, { cx, cz, r: PAN.ring, y0: Y + PAN.top + 0.12, rise: PAN.rise, n: 24, m: 6, phase: 15 * DEG, mat: 'starVault', tint: [0.92, 0.92, 0.95], room, sub: 1.5, ribs: 12, ribPhase: 15 * DEG, ribMat: 'ashlar', ribTint: [0.86, 0.72, 0.42], ribW: 0.2, ribD: 0.12 });
  ctx.col.add(cx - 4, D.crown - 0.05, cz - 4, cx + 4, D.crown + 0.4, cz + 4).cam = true;

  // --- la corona de luz: el aro de bronce con sus doce torres (redondas y
  // cuadradas, alternas) y las velas entre ellas, colgado de cuatro cadenas
  {
    const yR = Y + 3.55,
      r = 3.1;
    const band = new THREE.CylinderGeometry(r, r, 0.16, 48, 1, true);
    geom('bronze', band, M4().setPosition(cx, yR, cz), [1.0, 0.86, 0.6]);
    geom('bronze', flip(new THREE.CylinderGeometry(r - 0.02, r - 0.02, 0.16, 48, 1, true)), M4().setPosition(cx, yR, cz), [0.7, 0.58, 0.4]);
    for (const dy of [-0.09, 0.09]) geom('bronze', new THREE.TorusGeometry(r, 0.025, 4, 48), M4().makeRotationX(Math.PI / 2).setPosition(cx, yR + dy, cz), [1.0, 0.84, 0.56]);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const p = V(cx + Math.cos(a) * r, yR, cz + Math.sin(a) * r);
      if (k % 2 === 0) {
        wb.cylinder('bronze', p.x, yR + 0.08, p.z, 0.12, 0.12, 0.34, 8, { ao: false, room, capTop: true, capBot: true, tint: [0.95, 0.8, 0.52] });
        wb.geometry('bronze', new THREE.ConeGeometry(0.15, 0.24, 8), M4().setPosition(p.x, yR + 0.54, p.z), { ao: false, room, tint: [0.9, 0.74, 0.48] });
      } else {
        wb.box('bronze', p.x - 0.11, yR + 0.08, p.z - 0.11, p.x + 0.11, yR + 0.4, p.z + 0.11, { ao: false, room, tint: [0.95, 0.8, 0.52] });
        wb.geometry('bronze', new THREE.ConeGeometry(0.16, 0.22, 4).rotateY(Math.PI / 4), M4().setPosition(p.x, yR + 0.51, p.z), { ao: false, room, tint: [0.9, 0.74, 0.48] });
      }
      // la ventanita de la torre, oscura
      const n = V(Math.cos(a), 0, Math.sin(a));
      wb.box('black', p.x + n.x * 0.12 - 0.03, yR + 0.2, p.z + n.z * 0.12 - 0.03, p.x + n.x * 0.12 + 0.03, yR + 0.32, p.z + n.z * 0.12 + 0.03, { ao: false, room, grime: false });
      // dos velas entre torre y torre
      for (const f of [1 / 3, 2 / 3]) {
        const b2 = ((k + f) / 12) * Math.PI * 2;
        const q = V(cx + Math.cos(b2) * r, yR + 0.08, cz + Math.sin(b2) * r);
        wb.cylinder('candle', q.x, q.y, q.z, 0.028, 0.028, 0.16, 5, { ao: false, capTop: true, grime: false, room });
        if (ctx.fires) ctx.fires.push({ x: q.x, y: q.y + 0.2, z: q.z, s: 0.1, light: false, embers: false, glow: k % 2 === 0 });
      }
    }
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      bakeParts(wb, chainParts(V(cx + Math.cos(a) * r, yR + 0.1, cz + Math.sin(a) * r), V(cx, D.crown - 0.4, cz), 0.07), null, { room });
    }
    if (ctx.lights) {
      ctx.lights.push({ x: cx, y: yR + 0.4, z: cz, r: 1, g: 0.66, b: 0.36, radius: 14, intensity: 1.25, room });
      ctx.lights.push({ x: cx, y: yR - 1.5, z: cz, r: 1, g: 0.6, b: 0.32, radius: 7, intensity: 0.6, room });
    }
    if (ctx.dynLights) ctx.dynLights.push({ x: cx, y: yR + 0.2, z: cz, intensity: 2.2, range: 12, color: 0xffb060 });
  }

  // --- el pozo de los obispos: el muro redondo con sus sepulcros, la
  // escalera que se ciñe a él, el antepecho de arriba y, en el fondo, el
  // sepulcro del primero de todos
  const PR = PAN.pit;
  const pitArcos = [60, 130, 200].map((a) => a * DEG);
  const pa = Math.asin(1.15 / PR);
  {
    // el lienzo, de sepulcro a sepulcro
    for (let i = 0; i < pitArcos.length; i++) {
      const ta = pitArcos[i] + pa,
        tb = pitArcos[(i + 1) % pitArcos.length] - pa + (i === pitArcos.length - 1 ? Math.PI * 2 : 0);
      const n = Math.max(1, Math.ceil((tb - ta) / (7.5 * DEG)));
      for (let j = 0; j < n; j++) {
        const t0 = ta + ((tb - ta) * j) / n,
          t1 = ta + ((tb - ta) * (j + 1)) / n;
        wb.quad('ashlar', pt(t0, PR, YC), pt(t1, PR, YC), pt(t1, PR, Y), pt(t0, PR, Y), { room, tint: [0.6, 0.57, 0.52], sub: 1.6, aoH: 1.2, aoMin: 0.45, baseY: YC });
      }
    }
    for (const a of pitArcos) {
      const d = PR * Math.cos(pa);
      const m = faceFrame(a, d, YC);
      const hb = 1.15;
      const shape = new THREE.Shape([new THREE.Vector2(-hb, 0), new THREE.Vector2(hb, 0), new THREE.Vector2(hb, Y - YC), new THREE.Vector2(-hb, Y - YC)]);
      const hole = [V(-0.95, 0, 0), V(0.95, 0, 0)];
      for (let i = 0; i <= 12; i++) {
        const t = (Math.PI * i) / 12;
        hole.push(V(Math.cos(t) * 0.95, 1.05 + Math.sin(t) * 0.6, 0));
      }
      shape.holes.push(new THREE.Path(hole.map((p) => new THREE.Vector2(p.x, p.y))));
      geom('ashlar', new THREE.ShapeGeometry(shape, 8), m, [0.6, 0.57, 0.52]);
      for (let i = 0; i < hole.length; i++) {
        const p0 = hole[i],
          p1 = hole[(i + 1) % hole.length];
        wb.quad(i === 0 ? 'flag' : 'ashlar', p0.clone().applyMatrix4(m), p1.clone().applyMatrix4(m), V(p1.x, p1.y, -0.95).applyMatrix4(m), V(p0.x, p0.y, -0.95).applyMatrix4(m), { ao: false, room, tint: [0.5, 0.47, 0.43], sub: 3 });
      }
      geom('ashlar', new THREE.ShapeGeometry(new THREE.Shape(hole.map((p) => new THREE.Vector2(p.x, p.y))), 8), m.clone().multiply(M4().makeTranslation(0, 0, -0.95)), [0.42, 0.4, 0.37]);
      tomb(m.clone().multiply(M4().makeTranslation(0, 0, -0.5)), { L: 0.82, W: 0.4 });
      const cp = V(0.75, 0, 0.3).applyMatrix4(m);
      P.candles(ctx, cp.x, YC, cp.z, 2, 5130 + Math.round(a * 10), { room, radius: 2.8, intensity: 0.5, spread: 0.08 });
    }
    // la escalera: ocho peldaños que bajan pegados al muro (de 250° a 355°)
    const sr0 = 2.75,
      sr1 = PR - 0.02;
    const rm = (sr0 + sr1) / 2;
    for (let i = 0; i < 8; i++) {
      const tc = (250 + 7.5 + i * 13.2) * DEG;
      const top = Y - 0.3 * (i + 1);
      const p = pt(tc, rm, 0);
      const rot = Math.atan2(Math.cos(tc), Math.sin(tc));
      const hx = rm * Math.sin(6.9 * DEG) + 0.02,
        hz = (sr1 - sr0) / 2;
      wb.at(p.x, YC - 0.3, p.z, rot, () => wb.box('ashlar', -hx, 0, -hz, hx, top - YC + 0.3, hz, { room, tint: [0.7, 0.66, 0.6], sub: 2, aoH: 0.8, baseY: YC }));
      ctx.col.addOBB(p.x, p.z, hx, hz, rot, YC - 0.3, top);
    }
    // el antepecho de arriba (con el hueco de la escalera) y su colisión
    const n2 = 28;
    for (let i = 0; i < n2; i++) {
      const t0 = (i / n2) * Math.PI * 2,
        t1 = ((i + 1) / n2) * Math.PI * 2;
      const tm = (t0 + t1) / 2;
      if (tm > 244 * DEG && tm < 266 * DEG) continue;
      const a = pt(t0, PR + 0.12, Y),
        b = pt(t1, PR + 0.12, Y);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const len = a.distanceTo(b) + 0.02;
      const rot = Math.atan2(b.x - a.x, b.z - a.z) - Math.PI / 2;
      wb.at(mid.x, Y, mid.z, rot, () => {
        wb.box('ashlar', -len / 2, 0, -0.13, len / 2, 0.12, 0.13, { room, tint: AT, ao: false });
        wb.box('ashlar', -len / 2, 0.72, -0.15, len / 2, 0.86, 0.15, { room, tint: AT, ao: false });
        for (const f of [-0.25, 0.25]) wb.cylinder('ashlar', f * len, 0.12, 0, 0.06, 0.07, 0.6, 6, { room, tint: AT, ao: false });
      });
      ctx.col.addOBB(mid.x, mid.z, len / 2, 0.15, rot, Y, Y + 0.9);
    }
    // el sepulcro del primero de todos, en medio, sobre su peana: con la
    // cara tapada, como los Velados
    wb.box('ashlar', cx - 1.45, YC, cz - 0.85, cx + 1.45, YC + 0.22, cz + 0.85, { room, tint: [0.7, 0.66, 0.6] });
    ctx.col.add(cx - 1.45, YC, cz - 0.85, cx + 1.45, YC + 0.22, cz + 0.85);
    tomb(M4().makeTranslation(cx, YC + 0.22, cz), { L: 1.15, W: 0.55, veiled: true });
    L.interact.push({ kind: 'examine', id: 'x_primer_obispo', text: 'primerObispo', x: cx, y: YC, z: cz + 1.25, r: 1.7 });
    for (const s of [-1, 1]) P.candelabra(ctx, cx + s * 1.9, YC, cz + s * 1.0, { room });
    if (ctx.lights) ctx.lights.push({ x: cx, y: YC + 1.2, z: cz, r: 0.6, g: 0.66, b: 0.86, radius: 5.5, intensity: 0.45, room });
  }

  // --- las salidas: sus arcos por el grueso del muro y lo que hay detrás
  // (los pasos, sus bóvedas y su luz)
  const DY = (k) => DOORS[k];
  const edge = (k) => R * Math.cos(faces[k].al);
  // oeste: la galilea (del lado de la galilea, el macizo hasta su bóveda)
  {
    const d = DY(6),
      xw = cx - edge(6);
    archRing(ctx, { axis: 'z', c: cz, w: 2 * d.hw, y0: Y + d.ys, rise: d.hw, ring: 0.3, t0: GAL.x1, t1: GAL.x1 + 0.3, top: Y + GAL.ys, clip: [cz - d.hw - 0.3, cz + d.hw + 0.3], mat: 'ashlar', spMat: 'ashlar', room, tint: AT, spTint: WT });
    archRing(ctx, { axis: 'z', c: cz, w: 2 * d.hw, y0: Y + d.ys, rise: d.hw, ring: 0.3, t0: GAL.x1 + 0.3, t1: xw + 0.02, mat: 'ashlar', room, tint: AT });
  }
  // este: el paso al templo, los cuatro peldaños y el rellano, bajo una
  // bóveda que arranca a la altura del arco del templo
  const YU = Y + 1.2; // (el suelo del templo y de la cripta de arriba)
  {
    const d = DY(0),
      xe = cx + edge(0);
    archRing(ctx, { axis: 'z', c: cz, w: 2 * d.hw, y0: Y + d.ys, rise: d.hw, ring: 0.3, t0: xe - 0.02, t1: xe + 0.35, mat: 'ashlar', room, tint: AT });
    barrelVault(ctx, { x0: xe + 0.35, x1: -22, z0: cz - 2, z1: cz + 2, axis: 'x', ys: YU + 2.2, rise: 1.0, mat: 'ashlar', tint: [0.68, 0.64, 0.58], room, sub: 1.0, impostTint: AT });
    ctx.col.add(xe, YU + 3.2, cz - 2, -22, YU + 3.6, cz + 2).cam = true;
    stairs(ctx, -26.3, Y, cz, 'e', 4, 4, 0.3, 0.45, 'ashlar', { solidBelow: true });
    // el paso del templo: su bóveda y el arco de este lado
    barrelVault(ctx, { x0: -22, x1: -19.5, z0: -119, z1: -116.5, axis: 'x', ys: YU + 2.2, rise: 1.0, mat: 'ashlar', tint: [0.68, 0.64, 0.58], room, sub: 1.0, impostTint: AT });
    archRing(ctx, { axis: 'z', c: -117.75, w: 2.5, y0: YU + 2.2, rise: 1.0, ring: 0.3, t0: -22.15, t1: -22, top: YU + 3.2, clip: [-119.3, -116.2], mat: 'ashlar', spMat: 'ashlar', room, tint: AT, spTint: WT });
    P.candelabra(ctx, -23.0, YU, cz - 1.5, { room });
  }
  // norte: el paso a la reja de la antesala, entre dos velados
  {
    const d = DY(9),
      zn = cz - edge(9);
    archRing(ctx, { axis: 'x', c: cx, w: 2 * d.hw, y0: Y + d.ys, rise: d.hw, ring: 0.3, t0: zn - 0.35, t1: zn + 0.02, mat: 'ashlar', room, tint: AT });
    barrelVault(ctx, { x0: cx - 2, x1: cx + 2, z0: -136, z1: zn - 0.35, axis: 'z', ys: Y + 3.4, rise: 1.0, mat: 'ashlar', tint: [0.68, 0.64, 0.58], room, sub: 1.0, impostTint: AT });
    lunette(ctx, { axis: 'z', at: -136, c: cx, span: 4, ys: Y + 3.4, rise: 1.0, face: 1, mat: 'ashlar', tint: WT, room });
    ctx.col.add(cx - 2, Y + 4.4, -136, cx + 2, Y + 4.8, zn).cam = true;
    for (const s of [-1, 1]) P.veiledStatue(ctx, cx + s * 1.35, Y, -134.9, 0, { ped: 0.45 });
    if (ctx.lights) ctx.lights.push({ x: cx, y: Y + 1.8, z: -135.0, r: 1, g: 0.3, b: 0.16, radius: 8, intensity: 1.0, room });
  }
  // sur: la bajada a las catacumbas (su escalera, la bóveda en rampa y su luz,
  // fría)
  {
    const d = DY(3),
      zs = cz + edge(3);
    archRing(ctx, { axis: 'x', c: cx, w: 2 * d.hw, y0: Y + d.ys, rise: d.hw, ring: 0.3, t0: zs - 0.02, t1: -106, mat: 'ashlar', room, tint: AT });
    stairs(ctx, cx, YC, -102.4, 'n', 3, 8, 0.3, 0.45, 'flag', { solidBelow: true });
    rampVault(ctx, { x0: cx - 1.5, x1: cx + 1.5, z0: -106, z1: -102.4, ys0: Y + d.ys, ys1: YC + 2.2, rise: 1.0, mat: 'rock', tint: [0.62, 0.57, 0.5], room });
    archRing(ctx, { axis: 'x', c: cx, w: 2 * d.hw, y0: Y + d.ys, rise: d.hw, ring: 0.3, t0: -106, t1: -105.85, top: Y + d.ys + d.hw + 0.4, clip: [cx - d.hw - 0.3, cx + d.hw + 0.3], mat: 'ashlar', spMat: 'rock', room, tint: AT, spTint: [0.62, 0.57, 0.5] });
    if (ctx.lights) ctx.lights.push({ x: cx, y: Y + 0.8, z: -105.2, r: 0.5, g: 0.62, b: 0.9, radius: 7, intensity: 0.85, room });
  }

  // --- la galilea: bóveda de cañón con sus fajones, losas de obispos por
  // el suelo, candelabros y una lámpara por tramo
  {
    const G = GAL;
    const span = G.x1 - G.x0;
    barrelVault(ctx, { x0: G.x0, x1: G.x1, z0: G.z0, z1: G.z1, axis: 'z', ys: Y + G.ys, rise: G.rise, mat: 'plaster', tint: [0.66, 0.6, 0.52], room, sub: 1.0, impostTint: AT });
    lunette(ctx, { axis: 'z', at: G.z0, c: (G.x0 + G.x1) / 2, span, ys: Y + G.ys, rise: G.rise, face: 1, mat: 'ashlar', tint: WT, room });
    lunette(ctx, { axis: 'z', at: G.z1, c: (G.x0 + G.x1) / 2, span, ys: Y + G.ys, rise: G.rise, face: -1, mat: 'ashlar', tint: WT, room });
    ctx.col.add(G.x0, Y + G.ys + G.rise - 0.05, G.z0, G.x1, Y + G.ys + G.rise + 0.4, G.z1).cam = true;
    for (const z of [-131.1, -125.4, -115.4]) {
      archRing(ctx, { axis: 'x', c: (G.x0 + G.x1) / 2, w: span - 0.4, y0: Y + G.ys, rise: G.rise - 0.3, ring: 0.3, t0: z - 0.22, t1: z + 0.22, mat: 'ashlar', room, tint: AT, cam: false });
      pilaster(ctx, G.x0, z, 'e', Y, Y + G.ys, { room, tint: AT, w: 0.5, d: 0.18 });
      pilaster(ctx, G.x1, z, 'w', Y, Y + G.ys, { room, tint: AT, w: 0.5, d: 0.18 });
    }
    for (const [x, z] of [
      [-58.5, -133.6],
      [-55.2, -128.3],
      [-58.5, -122.6],
      [-55.6, -117.2],
    ])
      ledgerSlab(ctx, x, Y, z, 0, rng, room);
    for (const z of [-133.4, -128.3, -120.4]) P.hangingLamp(ctx, (G.x0 + G.x1) / 2, Y + G.ys + G.rise - 0.1, z, { room, len: 1.6, radius: 7.5, intensity: 0.95 });
    P.candelabra(ctx, G.x1 - 0.8, Y, cz - 2.6, { room });
    P.candelabra(ctx, G.x1 - 0.8, Y, cz + 2.6, { room });
    P.banner(ctx, (G.x0 + G.x1) / 2, Y + G.ys - 0.2, G.z0 + 0.1, 0, 'bannerRed', 1.4, 3.0);
    P.bones(ctx, -60.4, Y, -134.6, 6, 5150, 0.5);
    ctx.rats.push({ x: -60.8, y: Y, z: -116, n: 2 });
  }

  // --- losas por el deambulatorio y algún resto
  for (const th of [45, 105, 165, 285, 345]) {
    const p = pt(th * DEG, 9.6, Y);
    ledgerSlab(ctx, p.x, Y, p.z, -th * DEG, rng, room);
  }
  P.bones(ctx, cx + 8.6, Y, cz + 5.0, 5, 5160, 0.5);
  P.bones(ctx, cx - 8.4, Y, cz - 5.6, 4, 5161, 0.4);
  ctx.rats.push({ x: cx + 9.2, y: Y, z: cz - 4.8, n: 2 });

  // la inscripción de las pilas, ahora en el paso del templo
  {
    const x = cx + R + 1.6;
    plaque(ctx, x, Y + 1.7, cz - 1.99, 's');
    L.interact.push({ kind: 'note', id: 'n_pilas', note: 'pilas', x, y: Y + 1.4, z: cz - 1.6, model: 'wall', r: 1.8 });
  }
  return { faces, arcos, D };

  // (una placa de piedra con letras, en un muro de 'z' que mira a 'face')
  function plaque(ctx2, x, y, z, face) {
    const sg = face === 's' ? 1 : -1;
    ctx2.wb.box('ashlar', x - 0.55, y - 0.35, Math.min(z, z + sg * 0.05), x + 0.55, y + 0.35, Math.max(z, z + sg * 0.05), { ao: false, room, tint: [0.78, 0.74, 0.68] });
    for (let i = 0; i < 4; i++) ctx2.wb.box('black', x - 0.42, y + 0.2 - i * 0.13, Math.min(z + sg * 0.05, z + sg * 0.052), x + 0.42 - (i === 3 ? 0.3 : 0), y + 0.235 - i * 0.13, Math.max(z + sg * 0.05, z + sg * 0.052), { ao: false, room, grime: false });
  }
}

// Losa sepulcral de obispo en el suelo: la cruz y el báculo grabados.
function ledgerSlab(ctx, x, y, z, rot, rng, room) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('ashlar', -0.5, 0, -1.0, 0.5, 0.03, 1.0, { faces: 'tnsew', ao: false, room, tint: [0.66, 0.62, 0.56].map((v) => v * rng.range(0.92, 1.05)) });
    wb.box('black', -0.03, 0.031, -0.75, 0.03, 0.033, 0.55, { faces: 't', ao: false, grime: false, room });
    wb.box('black', -0.24, 0.031, -0.42, 0.24, 0.033, -0.36, { faces: 't', ao: false, grime: false, room });
    wb.box('black', 0.14, 0.031, 0.35, 0.3, 0.033, 0.41, { faces: 't', ao: false, grime: false, room });
  });
}
