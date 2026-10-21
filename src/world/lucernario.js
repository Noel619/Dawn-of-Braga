// El Lucernario de San Pedro de Rates (las catacumbas de la Sé), donde se
// juntan sus cuatro galerías. Una cámara redonda y alta, tallada en la roca:
// el muro, de lienzos planos, con cinco alturas de nichos (a los de arriba
// sólo se llega con escalera) y otra fila sobre las bocas de las galerías;
// encima, la cúpula de roca y, en lo alto, el ojo del lucernario: el pozo
// que sube hasta la reja de la calle. Su luz fría cae sobre la alberca del
// centro, de agua viva (gotea), con su brocal y las velas que flotan. En el
// ábside del noreste, el oratorio del santo: el altar donde se descansa, el
// fresco de su martirio, la concha de estrellas y los exvotos de cera.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { MAT_DEFS } from '../gfx/materials.js';
import { archRing } from './builders.js';
import * as P from './props.js';
import { bakeParts, skullParts, boneParts } from './ossuary_props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const M4 = () => new THREE.Matrix4();
const DEG = Math.PI / 180;

// centro, radio del muro, distancia de las bocas (donde acaban sus
// galerías), alto del muro y de la clave (el ojo), radio del ojo, de la
// alberca y de su brocal
export const LUC = { cx: -40, cz: -93.5, R: 6, d: 5.5, wall: 4.0, crown: 7.0, oc: 1.3, pool: 2.0, rim: 2.4 };
// las bocas de las galerías (con arco rebajado, como sus bóvedas, o con
// dintel) y el ábside del oratorio: [ángulo (de +x hacia +z), tipo]
const OPEN = [
  [0, 'arch'], // c1Este
  [90, 'lintel'], // c1SurBoca
  [180, 'arch'], // c1Oeste
  [270, 'arch'], // c1Norte
  [315, 'apse'],
];
const GAL = { hw: 1.5, ys: 2.2, rise: 1.0 }; // (el perfil de sus bóvedas)
const APSE = { hw: 1.3, ys: 2.4, hb: 1.7, back: 0.6 }; // (la concha, de radio hw)
const ROWS = [0.3, 1.05, 1.8, 2.55, 3.3]; // (las cinco alturas de nichos)

export function buildLucernario(ctx, C, L, o = {}) {
  const wb = ctx.wb;
  const { cx, cz, R, d } = LUC;
  const Y = o.y;
  const room = o.room;
  const yTop = o.top ?? -1.6;
  const rng = new RNG(5201);
  const RK = [0.62, 0.57, 0.5];
  const geom = (mat, g, m, tint, opt = {}) => wb.geometry(mat, g, m, { ao: false, room, tint, uvScale: MAT_DEFS[mat].uv, ...opt });
  const pt = (th, r, y) => V(cx + Math.cos(th) * r, y, cz + Math.sin(th) * r);
  // el marco de una cara plana del muro, a 'th' y a 'dd' del centro: x a lo
  // largo (a la derecha de quien la mira desde dentro), y arriba, z hacia
  // el centro
  const frame = (th, dd, y0) => {
    const n = V(-Math.cos(th), 0, -Math.sin(th));
    return M4()
      .makeBasis(V(n.z, 0, -n.x), V(0, 1, 0), n)
      .setPosition(V(cx + Math.cos(th) * dd, y0, cz + Math.sin(th) * dd));
  };
  // (el giro de wb.at / addOBB que lleva +z local hacia 'n')
  const yaw = (n) => Math.atan2(n.x, n.z);
  // la cúpula: su alto (sobre el suelo) a 'r' del centro
  const domeH = (r) => {
    if (r >= R) return LUC.wall;
    const t = Math.acos(Math.min(1, Math.max(-1, (r - LUC.oc) / (R - LUC.oc))));
    return LUC.wall + (LUC.crown - LUC.wall) * Math.sin(t);
  };

  // --- las caras del muro: las bocas, el ábside y, en lo que queda, lienzos
  // de nichos de unos 21° (los retales, lisos)
  const faces = [];
  for (const [a, kind] of OPEN) {
    const th = a * DEG;
    const hb = kind === 'apse' ? APSE.hb : Math.sqrt(R * R - d * d);
    faces.push({ th, kind, hb, al: Math.asin(hb / R) });
  }
  faces.sort((p, q) => p.th - q.th);
  const all = [];
  for (let i = 0; i < faces.length; i++) {
    const A = faces[i],
      B = faces[(i + 1) % faces.length];
    all.push(A);
    const t0 = A.th + A.al,
      t1 = B.th - B.al + (i === faces.length - 1 ? Math.PI * 2 : 0);
    const n = Math.max(1, Math.round((t1 - t0) / (21 * DEG)));
    for (let k = 0; k < n; k++) {
      const a0 = t0 + ((t1 - t0) * k) / n,
        a1 = t0 + ((t1 - t0) * (k + 1)) / n;
      const al = (a1 - a0) / 2;
      all.push({ th: (a0 + a1) / 2, kind: al * 2 > 15 * DEG ? 'niches' : 'plain', hb: R * Math.sin(al), al });
    }
  }
  const floorPts = [];
  let apseF = null;
  for (const F of all) {
    const dd = R * Math.cos(F.al);
    F.dd = dd;
    const m = frame(F.th, dd, Y);
    F.m = m;
    floorPts.push(V(-F.hb, 0, 0).applyMatrix4(m), V(F.hb, 0, 0).applyMatrix4(m));
    // el contorno: el pie, los costados hasta el muro y, arriba, la cúpula
    const outline = [new THREE.Vector2(-F.hb, 0), new THREE.Vector2(F.hb, 0)];
    for (let k = 0; k <= 8; k++) {
      const u = F.hb - (2 * F.hb * k) / 8;
      outline.push(new THREE.Vector2(u, domeH(Math.hypot(dd, u))));
    }
    const shape = new THREE.Shape(outline);
    const holes = [];
    if (F.kind === 'arch') {
      // (el arco rebajado de la galería: jambas y el arco por tres puntos)
      const Rc = (GAL.hw * GAL.hw + GAL.rise * GAL.rise) / (2 * GAL.rise),
        yc = GAL.ys + GAL.rise - Rc;
      const a0 = Math.atan2(GAL.ys - yc, GAL.hw);
      const h = [V(-GAL.hw, 0), V(GAL.hw, 0)];
      for (let k = 0; k <= 12; k++) {
        const a = a0 + ((Math.PI - 2 * a0) * k) / 12;
        h.push(V(Math.cos(a) * Rc, yc + Math.sin(a) * Rc));
      }
      holes.push(h);
    } else if (F.kind === 'lintel') holes.push([V(-GAL.hw, 0), V(GAL.hw, 0), V(GAL.hw, 1.9), V(-GAL.hw, 1.9)]);
    else if (F.kind === 'apse') {
      const h = [V(-APSE.hw, 0), V(APSE.hw, 0)];
      for (let k = 0; k <= 16; k++) {
        const a = (Math.PI * k) / 16;
        h.push(V(Math.cos(a) * APSE.hw, APSE.ys + Math.sin(a) * APSE.hw));
      }
      holes.push(h);
      apseF = F;
    }
    // los nichos: cinco alturas en los lienzos; sobre las bocas, dos
    const nich = [];
    if (F.kind === 'niches') for (const y0 of ROWS) nich.push([0, y0, Math.min(0.82, F.hb - 0.25), 0.5]);
    if (F.kind === 'arch' || F.kind === 'lintel') for (const s of [-1, 1]) nich.push([s * 0.66, 3.62, 0.48, 0.42]);
    for (const [u, y0, hw, h] of nich) holes.push([V(u - hw, y0), V(u + hw, y0), V(u + hw, y0 + h), V(u - hw, y0 + h)]);
    for (const h of holes) shape.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p.x, p.y))));
    geom('rock', new THREE.ShapeGeometry(shape, 6), m, RK.map((v) => v * rng.range(0.94, 1.04)), { grime: true });
    for (const [u, y0, hw, h] of nich) {
      const q = rng.next();
      const kind = y0 > 3 ? (q < 0.3 ? 'bones' : q < 0.55 ? 'shroud' : q < 0.75 ? 'broken' : q < 0.88 ? 'sealed' : 'empty') : q < 0.42 ? 'sealed' : q < 0.66 ? 'bones' : q < 0.8 ? 'shroud' : q < 0.9 ? 'broken' : 'empty';
      niche(m, u, y0, hw, h, kind);
    }
    // la colisión del lienzo (por detrás de la cara; en las bocas, a los lados)
    const n = V(-Math.cos(F.th), 0, -Math.sin(F.th));
    const ox = V(n.z, 0, -n.x);
    const rot = Math.atan2(-ox.z, ox.x);
    const spans = F.kind === 'niches' || F.kind === 'plain' ? [[-F.hb, F.hb]] : [[-F.hb, -(F.kind === 'apse' ? APSE.hw : GAL.hw)], [F.kind === 'apse' ? APSE.hw : GAL.hw, F.hb]];
    for (const [u0, u1] of spans) {
      const c = V((u0 + u1) / 2, 0, -0.3).applyMatrix4(m);
      ctx.col.addOBB(c.x, c.z, (u1 - u0) / 2 + 0.05, 0.3, rot, Y, Y + LUC.wall);
    }
    // el arco de piedra de las bocas, por el lado de la cámara
    if (F.kind === 'arch') {
      const axZ = Math.abs(Math.cos(F.th)) > 0.5;
      const at = axZ ? cx + Math.cos(F.th) * d : cz + Math.sin(F.th) * d;
      const inward = axZ ? -Math.sign(Math.cos(F.th)) : -Math.sign(Math.sin(F.th));
      const [t0, t1] = inward > 0 ? [at, at + 0.14] : [at - 0.14, at];
      archRing(ctx, { axis: axZ ? 'z' : 'x', c: axZ ? cz : cx, w: 2 * GAL.hw, y0: Y + GAL.ys, rise: GAL.rise, ring: 0.26, t0, t1, mat: 'rock', room, tint: RK.map((v) => v * 1.12), cam: false });
    }
    if (F.kind === 'lintel') {
      // el dintel, de una pieza, con el crismón grabado
      wb.at(V(0, 0, 0).applyMatrix4(m).x, Y, V(0, 0, 0).applyMatrix4(m).z, yaw(n), () => {
        wb.box('ashlar', -GAL.hw - 0.3, 1.9, 0, GAL.hw + 0.3, 2.28, 0.12, { ao: false, room, tint: [0.7, 0.66, 0.6] });
        for (const s of [-1, 1]) wb.box('ashlar', s * GAL.hw - 0.12 + (s > 0 ? 0.12 : 0), 0, 0, s * GAL.hw + (s > 0 ? 0.12 : 0), 1.9, 0.08, { ao: false, room, tint: [0.66, 0.62, 0.56] });
        wb.box('black', -0.02, 1.99, 0.12, 0.02, 2.19, 0.125, { faces: 's', ao: false, grime: false, room });
        wb.box('black', -0.09, 2.08, 0.12, 0.09, 2.1, 0.125, { faces: 's', ao: false, grime: false, room });
        wb.box('black', 0.02, 2.15, 0.12, 0.07, 2.17, 0.125, { faces: 's', ao: false, grime: false, room });
      });
    }
  }

  // --- el suelo: el polígono de las caras, sin la alberca (y la rejilla:
  // todo transitable; la alberca la cierra su colisión)
  {
    const sh = new THREE.Shape(floorPts.map((p) => new THREE.Vector2(p.x - cx, -(p.z - cz))));
    const hole = new THREE.Path();
    hole.absarc(0, 0, LUC.pool, 0, Math.PI * 2, true);
    sh.holes.push(hole);
    geom('flag', new THREE.ShapeGeometry(sh, 24), M4().makeRotationX(-Math.PI / 2).setPosition(cx, Y, cz), [0.6, 0.57, 0.52], { uvScale: MAT_DEFS.flag.uv });
    for (let z = cz - R; z < cz + R; z += 0.5)
      for (let x = cx - R; x < cx + R; x += 0.5) {
        const r = Math.hypot(x + 0.25 - cx, z + 0.25 - cz);
        if (r < R - 0.05) C.paint(x, z, x + 0.5, z + 0.5, 1);
      }
    ctx.col.add(cx - R - 0.5, Y - 0.6, cz - R - 0.5, cx + R + 0.5, Y, cz + R + 0.5);
  }

  // --- la cúpula de roca, labrada a pico (sus anillos se tuercen algo), y
  // el pozo del ojo hasta la reja de la calle
  {
    const NI = 48,
      NJ = 10;
    const jit = (i, j, s) => {
      if (j < 3 || j >= NJ) return 0;
      const h = Math.sin(i * 12.9898 + j * 78.233 + s * 37.719) * 43758.5453;
      return (h - Math.floor(h) - 0.5) * 2;
    };
    const P2 = (i, j) => {
      const t = (j / NJ) * (Math.PI / 2);
      const r = LUC.oc + (R - LUC.oc) * Math.cos(t) + jit(i % NI, j, 1) * 0.16;
      const th = (i / NI) * Math.PI * 2;
      return pt(th, r, Y + LUC.wall + (LUC.crown - LUC.wall) * Math.sin(t) + jit(i % NI, j, 2) * 0.1);
    };
    for (let j = 0; j < NJ; j++)
      for (let i = 0; i < NI; i++) wb.quad('rock', P2(i, j), P2(i + 1, j), P2(i + 1, j + 1), P2(i, j + 1), { ao: false, room, tint: RK.map((v) => v * (0.8 + 0.06 * Math.sin(i * 1.7 + j))), sub: 2 });
    // el pozo
    for (let i = 0; i < 24; i++) {
      const a0 = (i / 24) * Math.PI * 2,
        a1 = ((i + 1) / 24) * Math.PI * 2;
      wb.quad('rock', pt(a0, LUC.oc, Y + LUC.crown), pt(a1, LUC.oc, Y + LUC.crown), pt(a1, LUC.oc, yTop), pt(a0, LUC.oc, yTop), { ao: false, room, tint: RK.map((v) => v * 0.7), sub: 1.5 });
    }
    // la reja, y por encima la noche (un disco pálido que se ve entre los
    // barrotes)
    for (let k = -3; k <= 3; k++) wb.box('iron', cx + k * 0.36 - 0.03, yTop - 0.06, cz - LUC.oc, cx + k * 0.36 + 0.03, yTop, cz + LUC.oc, { ao: false, room });
    for (const k of [-1, 1]) wb.box('iron', cx - LUC.oc, yTop - 0.1, cz + k * 0.5 - 0.03, cx + LUC.oc, yTop - 0.04, cz + k * 0.5 + 0.03, { ao: false, room });
    wb.geometry('nightSky', new THREE.CircleGeometry(LUC.oc, 20), M4().makeRotationX(Math.PI / 2).setPosition(cx, yTop + 0.15, cz), { ao: false, room, grime: false });
    // (la cámara no sube por la roca: por encima de la cúpula, anillos de
    // colisión sólo para ella)
    const camRing = (r0, r1, y0) => {
      for (let z = cz - r1; z < cz + r1; z += 0.5) {
        const zc = z + 0.25 - cz;
        const ho = Math.sqrt(Math.max(0, r1 * r1 - zc * zc)),
          hi = Math.sqrt(Math.max(0, r0 * r0 - zc * zc));
        if (ho <= 0) continue;
        if (hi <= 0) ctx.col.addCam(cx - ho, Y + y0, z, cx + ho, yTop, z + 0.5);
        else {
          ctx.col.addCam(cx - ho, Y + y0, z, cx - hi, yTop, z + 0.5);
          ctx.col.addCam(cx + hi, Y + y0, z, cx + ho, yTop, z + 0.5);
        }
      }
    };
    camRing(4.9, R + 0.4, LUC.wall + 0.2);
    camRing(2.6, 4.9, 5.4);
    if (ctx.shafts) ctx.shafts.push({ a: [cx, yTop - 0.1, cz], b: [cx + 0.35, Y - 0.3, cz + 0.25], w: 2.3, color: 0x9fb4d8 });
    ctx.lights.push({ x: cx, y: Y + 1.3, z: cz, r: 0.52, g: 0.62, b: 0.86, radius: 9, intensity: 1.2, room });
    ctx.lights.push({ x: cx, y: Y + 6.2, z: cz, r: 0.5, g: 0.6, b: 0.82, radius: 5.5, intensity: 1.2, room });
    // (la luz que rebota del agua: alumbra la cúpula y las filas de arriba)
    for (let k = 0; k < 4; k++) {
      const p = pt(k * 90 * DEG + 45 * DEG, 2.6, Y + 3.2);
      ctx.lights.push({ x: p.x, y: p.y, z: p.z, r: 0.46, g: 0.56, b: 0.76, radius: 6, intensity: 0.55, room });
    }
  }

  // --- la alberca: el brocal (de sillares, con su borde), el agua viva y las
  // velas que flotan
  {
    const yb = Y + 0.55,
      yw = Y - 0.35;
    const N = 40;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2,
        a1 = ((i + 1) / N) * Math.PI * 2;
      const T = [0.7, 0.66, 0.6].map((v) => v * (i % 2 ? 0.95 : 1));
      // fuera, arriba y dentro (hasta el fondo)
      wb.quad('ashlar', pt(a1, LUC.rim, Y), pt(a0, LUC.rim, Y), pt(a0, LUC.rim, yb), pt(a1, LUC.rim, yb), { ao: false, room, tint: T });
      wb.quad('ashlar', pt(a1, LUC.rim, yb), pt(a0, LUC.rim, yb), pt(a0, LUC.pool, yb), pt(a1, LUC.pool, yb), { ao: false, room, tint: T.map((v) => v * 1.08) });
      wb.quad('ashlar', pt(a0, LUC.pool, Y - 0.9), pt(a1, LUC.pool, Y - 0.9), pt(a1, LUC.pool, yb), pt(a0, LUC.pool, yb), { ao: false, room, tint: T.map((v) => v * 0.7) });
    }
    wb.geometry('black', new THREE.CircleGeometry(LUC.pool, 24), M4().makeRotationX(-Math.PI / 2).setPosition(cx, Y - 0.9, cz), { ao: false, room, grime: false });
    if (ctx.waters) ctx.waters.push({ shape: 'circle', x: cx, z: cz, r: LUC.pool - 0.01, y: yw, deep: 0x081014, sky: 0x2a3644, glint: 0xc8d8ec, light: [cx + 0.25, yTop, cz + 0.15], lightK: 1.4, spot: [cx + 0.2, cz + 0.12, 1.15, 1.0] });
    for (let z = cz - LUC.rim; z < cz + LUC.rim; z += 0.25) {
      const zc = z + 0.125 - cz;
      const h = Math.sqrt(Math.max(0, LUC.rim * LUC.rim - zc * zc));
      if (h > 0) ctx.col.add(cx - h, Y - 1, z, cx + h, yb, z + 0.25);
    }
    // las velas que flotan, cada una en su tablilla
    for (let k = 0; k < 6; k++) {
      const a = k * 2.4 + 0.5,
        r = 0.5 + ((k * 37) % 9) * 0.12;
      const x = cx + Math.cos(a) * r,
        z = cz + Math.sin(a) * r;
      wb.at(x, yw, z, a, () => {
        wb.box('wooddark', -0.09, -0.01, -0.09, 0.09, 0.025, 0.09, { ao: false, room, tint: [0.6, 0.5, 0.4] });
        wb.cylinder('candle', 0, 0.025, 0, 0.026, 0.026, 0.06 + (k % 3) * 0.02, 5, { ao: false, capTop: true, grime: false, room });
      });
      if (ctx.fires) ctx.fires.push({ x, y: yw + 0.12 + (k % 3) * 0.02, z, s: 0.08, light: false, embers: false, glow: true });
    }
    ctx.lights.push({ x: cx, y: Y + 0.2, z: cz, r: 1, g: 0.66, b: 0.38, radius: 3.6, intensity: 0.45, room });
    // velas sobre el brocal
    for (const [a, n] of [
      [200, 4],
      [20, 3],
      [110, 2],
    ])
      P.candles(ctx, cx + Math.cos(a * DEG) * 2.2, yb, cz + Math.sin(a * DEG) * 2.2, n, 5210 + a, { room, radius: 3, intensity: 0.5, spread: 0.08 });
  }

  // --- el oratorio de San Pedro de Rates: el ábside con su concha de
  // estrellas, el fresco del martirio, el altar y los exvotos
  {
    const F = apseF;
    const m = F.m;
    const { hw, ys, back } = APSE;
    const Q = (x, y, z) => V(x, y, z).applyMatrix4(m);
    const W = [0.58, 0.48, 0.38];
    // los costados rectos (de la cara al arranque de la concha)
    for (const s of [-1, 1]) {
      const a = Q(s * hw, 0, 0),
        b = Q(s * hw, 0, -back),
        c = Q(s * hw, ys, -back),
        e = Q(s * hw, ys, 0);
      if (s < 0) wb.quad('plaster', a, b, c, e, { room, tint: W, sub: 1.2 });
      else wb.quad('plaster', b, a, e, c, { room, tint: W, sub: 1.2 });
    }
    // el fondo: el zócalo rojo y, encima, el fresco en los 100° del medio
    const arc = (phi, y) => Q(Math.cos(phi) * hw, y, -back - Math.sin(phi) * hw);
    const NB = 18;
    for (let k = 0; k < NB; k++) {
      const p0 = (Math.PI * k) / NB,
        p1 = (Math.PI * (k + 1)) / NB;
      wb.quad('plaster', arc(p1, 0), arc(p0, 0), arc(p0, 1.05), arc(p1, 1.05), { room, tint: [0.42, 0.24, 0.19], sub: 1 });
      const mid = (p0 + p1) / 2;
      if (mid < 40 * DEG || mid > 140 * DEG) wb.quad('plaster', arc(p1, 1.05), arc(p0, 1.05), arc(p0, ys), arc(p1, ys), { room, tint: [0.5, 0.42, 0.32], sub: 1 });
    }
    {
      const g = new THREE.PlaneGeometry(1, 1, 12, 1);
      const pp = g.attributes.position,
        nn = g.attributes.normal,
        uv = g.attributes.uv;
      for (let i = 0; i < pp.count; i++) {
        const u = uv.getX(i),
          v = uv.getY(i);
        const phi = (140 - u * 100) * DEG;
        pp.setXYZ(i, Math.cos(phi) * hw, 1.05 + v * (ys - 1.05), -back - Math.sin(phi) * hw);
        nn.setXYZ(i, -Math.cos(phi), 0, Math.sin(phi));
      }
      wb.geometry('frescoRates', g, m, { ao: false, room, grime: false, tint: [0.95, 0.92, 0.88] });
    }
    // la concha (un cuarto de esfera) y el medio cañón de delante, de
    // estrellas
    const NP = 12,
      NS = 5;
    const sph = (phi, psi) => Q(Math.cos(psi) * Math.cos(phi) * hw, ys + Math.sin(psi) * hw, -back - Math.cos(psi) * Math.sin(phi) * hw);
    for (let i = 0; i < NP; i++)
      for (let j = 0; j < NS; j++) {
        const f0 = (Math.PI * i) / NP,
          f1 = (Math.PI * (i + 1)) / NP,
          s0 = ((Math.PI / 2) * j) / NS,
          s1 = ((Math.PI / 2) * (j + 1)) / NS;
        wb.quad('starVault', sph(f1, s0), sph(f0, s0), sph(f0, s1), sph(f1, s1), { ao: false, room, tint: [0.85, 0.85, 0.9], sub: 1 });
      }
    for (let i = 0; i < NP; i++) {
      const a0 = (Math.PI * i) / NP,
        a1 = (Math.PI * (i + 1)) / NP;
      const B = (a, z) => Q(Math.cos(a) * hw, ys + Math.sin(a) * hw, z);
      wb.quad('starVault', B(a0, 0), B(a1, 0), B(a1, -back), B(a0, -back), { ao: false, room, tint: [0.85, 0.85, 0.9], sub: 1 });
    }
    // la rosca del arco, de piedra clara, salida de la cara
    for (let i = 0; i < 9; i++) {
      const a0 = (Math.PI * i) / 9,
        a1 = (Math.PI * (i + 1)) / 9;
      const q = (r, a, z) => Q(Math.cos(a) * r, ys + Math.sin(a) * r, z);
      wb.quad('ashlar', q(hw, a1, 0.05), q(hw, a0, 0.05), q(hw + 0.28, a0, 0.05), q(hw + 0.28, a1, 0.05), { ao: false, room, tint: [0.78, 0.74, 0.66].map((v) => v * (i % 2 ? 0.93 : 1)) });
      wb.quad('ashlar', q(hw + 0.28, a1, 0.05), q(hw + 0.28, a0, 0.05), q(hw + 0.28, a0, 0), q(hw + 0.28, a1, 0), { ao: false, room, tint: [0.62, 0.58, 0.52] });
    }
    for (const s of [-1, 1]) {
      const c = Q(s * (hw + 0.14), 0, 0.025);
      wb.at(c.x, Y, c.z, yaw(V(-Math.cos(F.th), 0, -Math.sin(F.th))), () => wb.box('ashlar', -0.14, 0, -0.025, 0.14, ys, 0.025, { ao: false, room, tint: [0.74, 0.7, 0.63] }));
    }
    // el suelo (y su rejilla) y la colisión de los muros
    const fl = new THREE.Shape([new THREE.Vector2(-hw, 0), new THREE.Vector2(hw, 0)]);
    for (let k = 0; k <= 12; k++) {
      const phi = (Math.PI * k) / 12;
      fl.lineTo(Math.cos(phi) * hw, back + Math.sin(phi) * hw);
    }
    geom('flag', new THREE.ShapeGeometry(fl, 12), m.clone().multiply(M4().makeRotationX(-Math.PI / 2)), [0.66, 0.6, 0.52]);
    const inA = (x, z) => {
      const l = V(x, Y, z).applyMatrix4(m.clone().invert());
      return l.z <= 0.05 && (Math.abs(l.x) < hw - 0.05 && l.z > -back ? true : Math.hypot(l.x, l.z + back) < hw - 0.05);
    };
    for (let z = cz - 8; z < cz - 3; z += 0.5) for (let x = cx + 3; x < cx + 8; x += 0.5) if (inA(x + 0.25, z + 0.25)) C.paint(x, z, x + 0.5, z + 0.5, 1);
    // (la cámara, por debajo de la concha)
    ctx.col.addCam(cx + 3.5, Y + ys + hw + 0.05, cz - 7, cx + 7, yTop, cz - 3.5);
    const n = V(-Math.cos(F.th), 0, -Math.sin(F.th));
    const rot = Math.atan2(n.x, n.z) + Math.PI / 2;
    for (const s of [-1, 1]) {
      const c = Q(s * (hw + 0.2), 0, -back / 2);
      ctx.col.addOBB(c.x, c.z, back / 2 + 0.05, 0.2, rot, Y, Y + ys);
    }
    for (let k = 0; k < 6; k++) {
      const phi = (Math.PI * (k + 0.5)) / 6;
      const c = Q(Math.cos(phi) * (hw + 0.2), 0, -back - Math.sin(phi) * (hw + 0.2));
      const tang = Q(Math.cos(phi + 0.01) * hw, 0, -back - Math.sin(phi + 0.01) * hw).sub(Q(Math.cos(phi) * hw, 0, -back - Math.sin(phi) * hw)).normalize();
      ctx.col.addOBB(c.x, c.z, 0.38, 0.2, Math.atan2(-tang.z, tang.x), Y, Y + ys);
    }
    // el altar, al fondo, de cara a la cámara
    const al = Q(0, 0, -1.1);
    P.candleAltar(ctx, al.x, Y, al.z, yaw(n), room);
    for (const s of [-1, 1]) {
      const c = Q(s * 0.95, 0, -0.3);
      P.candles(ctx, c.x, Y, c.z, 5, 5220 + s, { room, radius: 3.5, intensity: 0.7, spread: 0.12 });
    }
    // los exvotos de cera colgados de los costados (brazos, piernas,
    // cabezas, un corazón) y dos muletas al pie
    const EXV = ['brazo', 'pierna', 'cabeza', 'corazon', 'brazo', 'pierna', 'cabeza', 'brazo'];
    EXV.forEach((k, i) => {
      const s = i % 2 ? 1 : -1;
      const z = -0.08 - ((i >> 1) % 4) * 0.13;
      const y = 1.55 + ((i * 7) % 3) * 0.22;
      exvoto(Q(s * (hw - 0.1), y, z), k, i);
    });
    for (const s of [-1, 1]) {
      const b = Q(s * (hw - 0.12), 0, -0.45);
      wb.at(b.x, Y, b.z, yaw(n) + s * 0.4, () => {
        wb.push();
        wb.rotateZ(s * 0.18);
        wb.box('wooddark', -0.02, 0, -0.02, 0.02, 1.25, 0.02, { ao: false, room });
        wb.box('wooddark', -0.12, 1.25, -0.025, 0.12, 1.3, 0.025, { ao: false, room });
        wb.pop();
      });
    }
    // la losa con la inscripción del santo (la nota), en el costado derecho
    {
      const c = Q(hw - 0.02, 1.65, -0.3);
      wb.at(c.x, c.y, c.z, yaw(Q(0, 0, 0).sub(Q(1, 0, 0))), () => {
        wb.box('ashlar', -0.22, -0.16, -0.02, 0.22, 0.16, 0.02, { faces: 'nsewtb', ao: false, room, tint: [0.8, 0.77, 0.7] });
        for (let k = 0; k < 3; k++) wb.box('black', -0.16, 0.08 - k * 0.07, 0.02, 0.16 - (k === 2 ? 0.12 : 0), 0.095 - k * 0.07, 0.023, { faces: 's', ao: false, grime: false, room });
      });
      const ni = Q(hw - 0.6, 1.4, -0.3);
      L.interact.push({ kind: 'note', id: 'n_rates', note: 'rates', x: ni.x, y: Y + 1.4, z: ni.z, model: 'wall', r: 1.8 });
    }
    const sp = Q(0, 0, 1.6);
    L.interact.push({ kind: 'altar', id: 'a_oratorio', name: 'Oratorio de San Pedro de Rates', x: al.x, y: Y, z: al.z, spawn: [sp.x, Y, sp.z], yaw: Math.atan2(-n.x, -n.z) });
    ctx.lights.push({ x: Q(0, 0, -0.6).x, y: Y + 1.8, z: Q(0, 0, -0.6).z, r: 1, g: 0.64, b: 0.34, radius: 5.5, intensity: 1.0, room });
  }

  // --- escaleras de mano a los nichos de arriba, lámparas, restos
  {
    const ladders = all.filter((F) => F.kind === 'niches');
    for (const F of [ladders[1], ladders[4]]) {
      if (!F) continue;
      const n = V(-Math.cos(F.th), 0, -Math.sin(F.th));
      const b = V(0.55, 0, 0).applyMatrix4(F.m);
      P.ladder(ctx, b.x, Y, b.z, 3.5, yaw(n), 0.2);
    }
    for (const a of [150, 240]) {
      const p = pt(a * DEG, 3.4, 0);
      P.hangingLamp(ctx, p.x, Y + domeH(3.4) - 0.1, p.z, { room, len: 2.6, radius: 6, intensity: 0.7 });
    }
    // velas de difuntos al pie de dos lienzos de nichos
    for (const F of [ladders[0], ladders[3], ladders[5]]) {
      if (!F) continue;
      const c = V(-0.5, 0, 0.35).applyMatrix4(F.m);
      P.candles(ctx, c.x, Y, c.z, 5, Math.round(F.th * 100), { room, radius: 4, intensity: 0.75, spread: 0.18 });
    }
    for (const [a, r, nb, s] of [
      [125, 4.6, 7, 5230],
      [205, 4.9, 6, 5231],
      [45, 4.7, 5, 5232],
    ]) {
      const p = pt(a * DEG, r, Y);
      P.bones(ctx, p.x, Y, p.z, nb, s, 0.5);
    }
    ctx.rats.push({ x: cx - 4, y: Y, z: cz + 3, n: 2 });
  }
  return { faces: all };

  // ---------------------------------------------------------------- piezas
  // Un nicho en una cara (en su marco 'm'): el hueco con su fondo y, dentro,
  // lo que quede del muerto: huesos y su calavera, el sudario atado, la losa
  // que lo cierra (lisa, picada o con su cruz) o rota.
  function niche(m, uc, y0, hw, h, kind) {
    const Q = (x, y, z) => V(x, y, z).applyMatrix4(m);
    const u0 = uc - hw,
      u1 = uc + hw,
      y1 = y0 + h,
      dp = 0.62;
    const T = RK.map((v) => v * 0.62);
    const o = { ao: false, room, tint: T, sub: 1.2 };
    wb.quad('rock', Q(u0, y0, 0), Q(u1, y0, 0), Q(u1, y0, -dp), Q(u0, y0, -dp), { ...o, tint: RK.map((v) => v * 0.75) });
    wb.quad('rock', Q(u1, y1, 0), Q(u0, y1, 0), Q(u0, y1, -dp), Q(u1, y1, -dp), o);
    wb.quad('rock', Q(u0, y1, 0), Q(u0, y0, 0), Q(u0, y0, -dp), Q(u0, y1, -dp), o);
    wb.quad('rock', Q(u1, y0, 0), Q(u1, y1, 0), Q(u1, y1, -dp), Q(u1, y0, -dp), o);
    wb.quad('rock', Q(u0, y0, -dp), Q(u1, y0, -dp), Q(u1, y1, -dp), Q(u0, y1, -dp), { ...o, tint: RK.map((v) => v * 0.45) });
    const at = (x, y, z, q = new THREE.Quaternion(), s = 1) => m.clone().multiply(M4().compose(V(x, y, z), q, V(s, s, s)));
    const slab = (row, y0s, y1s) => {
      const g = new THREE.PlaneGeometry(2 * hw - 0.02, y1s - y0s);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (row + 1) / 8 + uv.getY(i) / 8);
      wb.geometry('lapidasAnimas', g, at(uc, (y0s + y1s) / 2, -0.03), { ao: false, room, tint: [0.78, 0.75, 0.7], grime: true });
    };
    if (kind === 'sealed') slab([4, 5, 6, 7][Math.floor(rng.next() * 4)], y0 + 0.01, y1 - 0.01);
    else if (kind === 'broken') {
      slab(6, y0 + 0.01, y0 + h * 0.45);
      bakeParts(wb, skullParts({ jaw: false, tint: [0.78, 0.74, 0.66] }), at(uc + rng.range(-0.3, 0.3), y0 + 0.07, -0.34, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rng.range(-0.6, 0.6), 0)), 1.1), { room });
    } else if (kind === 'bones') {
      const s = rng.chance(0.5) ? 1 : -1;
      bakeParts(wb, skullParts({ jaw: rng.chance(0.5), tint: [0.8, 0.76, 0.68] }), at(uc + s * hw * 0.55, y0 + 0.065, -0.3, new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.2, 0.2), rng.range(-0.8, 0.8), s * rng.range(0, 0.5))), 1.1), { room });
      for (let k = 0; k < 3; k++) {
        const z = -0.18 - k * 0.12,
          x0 = uc - s * hw * 0.8 + rng.range(-0.05, 0.05);
        bakeParts(wb, boneParts(V(x0, y0 + 0.025, z), V(x0 + s * rng.range(0.35, 0.5), y0 + 0.025, z + rng.range(-0.08, 0.08)), 0.02), m, { room });
      }
    } else if (kind === 'shroud') {
      // el sudario, atado con cuerdas (la cabeza a un lado)
      const len = Math.min(1.4, 2 * hw - 0.12);
      const g = new THREE.CylinderGeometry(1, 1, 1, 9);
      g.rotateZ(Math.PI / 2);
      wb.geometry('linen', g, at(uc, y0 + 0.12, -0.32).multiply(M4().makeScale(len - 0.2, 0.11, 0.13)), { ao: false, room, tint: [0.66, 0.61, 0.5] });
      const sg = new THREE.SphereGeometry(1, 9, 6);
      for (const s of [-1, 1]) wb.geometry('linen', sg, at(uc + s * (len / 2 - 0.1), y0 + 0.12, -0.32).multiply(M4().makeScale(s > 0 ? 0.14 : 0.1, 0.11, 0.13)), { ao: false, room, tint: [0.66, 0.61, 0.5] });
      const tg = new THREE.TorusGeometry(1, 0.08, 4, 10);
      tg.rotateY(Math.PI / 2);
      for (const f of [-0.32, -0.08, 0.16, 0.36]) wb.geometry('rope', tg, at(uc + f * len, y0 + 0.12, -0.32).multiply(M4().makeScale(1, 0.118, 0.138)), { ao: false, room });
    }
  }

  // Un exvoto de cera colgado de un clavo (en el punto 'p'): un brazo, una
  // pierna, una cabeza o un corazón.
  function exvoto(p, kind, i) {
    const WX = [0.9, 0.82, 0.62];
    const m = M4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, i * 1.3, 0)), V(1, 1, 1));
    wb.geometry('iron', new THREE.CylinderGeometry(0.004, 0.004, 0.14, 3), m.clone().multiply(M4().makeTranslation(0, -0.07, 0)), { ao: false, room });
    const g = (geo, x, y, z, sx, sy, sz, rz = 0) => wb.geometry('candle', geo, m.clone().multiply(M4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rz)), V(sx, sy, sz))), { ao: false, room, tint: WX, grime: false });
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 6),
      sph = new THREE.SphereGeometry(1, 7, 5);
    if (kind === 'brazo') {
      g(cyl, 0, -0.3, 0, 0.035, 0.28, 0.035);
      g(sph, 0, -0.47, 0, 0.04, 0.06, 0.025);
    } else if (kind === 'pierna') {
      g(cyl, 0, -0.33, 0, 0.045, 0.34, 0.045);
      g(sph, 0.04, -0.51, 0, 0.07, 0.03, 0.035);
    } else if (kind === 'cabeza') {
      g(sph, 0, -0.24, 0, 0.08, 0.1, 0.085);
      g(cyl, 0, -0.36, 0, 0.035, 0.08, 0.035);
    } else {
      g(sph, -0.03, -0.2, 0, 0.05, 0.05, 0.035);
      g(sph, 0.03, -0.2, 0, 0.05, 0.05, 0.035);
      g(new THREE.ConeGeometry(1, 1, 6), 0, -0.27, 0, 0.075, -0.11, 0.035);
    }
  }
}
