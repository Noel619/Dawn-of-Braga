// Constructores de arquitectura medieval: suelos, casas con entramado,
// murallas almenadas, torres, arcos, escaleras.
import * as THREE from 'three';
import { RNG } from '../core/util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function hashSeed(...n) {
  let h = 2166136261;
  for (const v of n) {
    h ^= Math.round(v * 100);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Suelo: cara superior visible + colisionador.
export function ground(ctx, x0, z0, x1, z1, y, mat, o = {}) {
  ctx.wb.box(mat, x0, y - (o.depth ?? 0.4), z0, x1, y, z1, { faces: o.faces ?? 't', ao: false, sub: o.sub ?? 2.5, ...o });
  if (o.collide !== false) ctx.col.add(x0, y - (o.colDepth ?? 1), z0, x1, y, z1, o.tag);
}

// Caja sólida visible con colisión.
export function solid(ctx, mat, x0, y0, z0, x1, y1, z1, o = {}) {
  ctx.wb.box(mat, x0, y0, z0, x1, y1, z1, o);
  if (o.collide !== false) {
    const b = ctx.col.add(x0, y0, z0, x1, y1, z1, o.tag);
    if (o.noCam) b.cam = false;
    return b;
  }
}

// Colisionador invisible.
export function blocker(ctx, x0, y0, z0, x1, y1, z1, tag) {
  const b = ctx.col.add(x0, y0, z0, x1, y1, z1, tag);
  b.cam = false;
  b.noSight = true;
  return b;
}

// Escalera recta. dir: sentido de subida ('n' = hacia -z, 's','e','w').
export function stairs(ctx, x, y, z, dir, width, count, rise = 0.3, run = 0.42, mat = 'wallstone', o = {}) {
  const { wb, col } = ctx;
  for (let i = 0; i < count; i++) {
    const top = y + rise * (i + 1);
    const a = run * i,
      b = run * (i + 1) + (o.overlap ?? 0);
    let x0, x1, z0, z1;
    if (dir === 'n') {
      x0 = x - width / 2;
      x1 = x + width / 2;
      z1 = z - a;
      z0 = z - b;
    } else if (dir === 's') {
      x0 = x - width / 2;
      x1 = x + width / 2;
      z0 = z + a;
      z1 = z + b;
    } else if (dir === 'e') {
      z0 = z - width / 2;
      z1 = z + width / 2;
      x0 = x + a;
      x1 = x + b;
    } else {
      z0 = z - width / 2;
      z1 = z + width / 2;
      x1 = x - a;
      x0 = x - b;
    }
    const bottom = o.solidBelow ? y - 0.5 : top - rise - 0.02;
    wb.box(mat, x0, bottom, z0, x1, top, z1, { ao: false, faces: o.faces ?? 'tnsew', sub: 3 });
    col.add(x0, o.solidBelow ? y - 0.5 : y - 0.5, z0, x1, top, z1);
  }
}

// Almenas sobre un muro recto (merlones).
export function merlons(ctx, x0, z0, x1, z1, y, o = {}) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
  const L = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const mw = o.w ?? 0.9,
    gap = o.gap ?? 0.7,
    mh = o.h ?? 1.1,
    t = o.t ?? 0.6;
  const mat = o.mat ?? 'wallstone';
  const n = Math.floor((L + gap) / (mw + gap));
  const used = n * mw + (n - 1) * gap;
  const start = (L - used) / 2;
  const sx = Math.min(x0, x1),
    sz = Math.min(z0, z1);
  for (let i = 0; i < n; i++) {
    const a = start + i * (mw + gap);
    if (alongX) ctx.wb.box(mat, sx + a, y, z0 - t / 2, sx + a + mw, y + mh, z0 + t / 2, { ao: false, sub: 2 });
    else ctx.wb.box(mat, x0 - t / 2, y, sz + a, x0 + t / 2, y + mh, sz + a + mw, { ao: false, sub: 2 });
  }
  // parapeto bajo continuo como colisión
  if (o.collide !== false) {
    if (alongX) ctx.col.add(sx, y - 0.2, z0 - t / 2, sx + L, y + mh, z0 + t / 2);
    else ctx.col.add(x0 - t / 2, y - 0.2, sz, x0 + t / 2, y + mh, sz + L);
  }
}

// Muralla gruesa con almenas a ambos lados opcionales.
export function cityWall(ctx, x0, z0, x1, z1, h, o = {}) {
  const mat = o.mat ?? 'wallstone';
  solid(ctx, mat, x0, 0, z0, x1, h, z1, { sub: 2.2, aoH: 2.5, faces: o.faces ?? 'tnsew', mats: { t: o.topMat ?? 'flag' } });
  const alongX = x1 - x0 >= z1 - z0;
  if (o.merlons !== false) {
    const sides = o.merlonSides ?? (alongX ? ['n', 's'] : ['e', 'w']);
    for (const s of sides) {
      if (s === 'n') merlons(ctx, x0, z0 + 0.3, x1, z0 + 0.3, h, { collide: o.walk });
      if (s === 's') merlons(ctx, x0, z1 - 0.3, x1, z1 - 0.3, h, { collide: o.walk });
      if (s === 'w') merlons(ctx, x0 + 0.3, z0, x0 + 0.3, z1, h, { collide: o.walk });
      if (s === 'e') merlons(ctx, x1 - 0.3, z0, x1 - 0.3, z1, h, { collide: o.walk });
    }
  }
}

// Torre cuadrada.
export function tower(ctx, cx, cz, w, h, o = {}) {
  const mat = o.mat ?? 'wallstone';
  const x0 = cx - w / 2,
    x1 = cx + w / 2,
    z0 = cz - w / 2,
    z1 = cz + w / 2;
  // (la cima la pone la cornisa: con las dos caras superiores a la misma
  // altura, lo alto de las torres parpadeaba)
  solid(ctx, mat, x0, 0, z0, x1, h, z1, { sub: 2.2, aoH: 3, faces: 'nsew', collide: o.collide });
  // cornisa (con su cara inferior: desde abajo el vuelo no queda hueco)
  ctx.wb.box(mat, x0 - 0.3, h - 0.5, z0 - 0.3, x1 + 0.3, h, z1 + 0.3, { ao: false, sub: 3, faces: 'tnsewb', mats: { t: 'flag' } });
  if (o.roof === 'pyramid') {
    ctx.wb.pyramid('roof', cx, cz, w + 0.8, w + 0.8, h, w * 0.9);
  } else {
    merlons(ctx, x0 - 0.3, z0, x1 + 0.3, z0, h, { collide: false });
    merlons(ctx, x0 - 0.3, z1, x1 + 0.3, z1, h, { collide: false });
    merlons(ctx, x0, z0 + 0.3, x0, z1 - 0.3, h, { collide: false });
    merlons(ctx, x1, z0 + 0.3, x1, z1 - 0.3, h, { collide: false });
  }
  // saeteras
  if (o.slits !== false) {
    for (let y = 4; y < h - 2; y += 4.5) {
      for (const [sx, sz, rx, rz] of [
        [cx, z1 + 0.02, 0.12, 0],
        [cx, z0 - 0.02, 0.12, 0],
        [x1 + 0.02, cz, 0, 0.12],
        [x0 - 0.02, cz, 0, 0.12],
      ]) {
        ctx.wb.box('black', sx - rx - 0.001, y, sz - rz - 0.001, sx + rx + 0.001, y + 1.2, sz + rz + 0.001, { ao: false, grime: false });
      }
    }
  }
}

// Muro con un arco (medio punto) atravesable. Muro a lo largo de X (grosor en Z)
// o de Z si axis='z'. La abertura va centrada en 'c' con ancho 'w' y altura 'ah'.
export function archWall(ctx, a0, a1, t0, t1, h, c, w, ah, o = {}) {
  const mat = o.mat ?? 'wallstone';
  const axisZ = o.axis === 'z';
  const put = (u0, y0, u1, y1, col = true) => {
    // las dovelas del arco llevan cara inferior (el intradós): sin ella, al
    // pasar bajo el arco y mirar arriba se veía el cielo entre losas sueltas
    const faces = y0 > 0.01 ? 'tnsewb' : 'tnsew';
    if (axisZ) {
      ctx.wb.box(mat, t0, y0, u0, t1, y1, u1, { sub: 2, aoH: 2, faces, baseY: 0 });
      if (col) ctx.col.add(t0, y0, u0, t1, y1, u1);
    } else {
      ctx.wb.box(mat, u0, y0, t0, u1, y1, t1, { sub: 2, aoH: 2, faces, baseY: 0 });
      if (col) ctx.col.add(u0, y0, t0, u1, y1, t1);
    }
  };
  const l = c - w / 2,
    r = c + w / 2;
  const R = w / 2;
  const spring = ah - R;
  // rosca de dovelas de verdad (cuñas que siguen el arco, con el intradós
  // liso): antes eran cubos sueltos alrededor del vano, que asomaban por
  // debajo del arco y parecían flotar
  const ring = o.ring ?? Math.min(0.5, 0.2 + w * 0.06);
  const e0 = l - ring,
    e1 = r + ring;
  // jambas: hasta el arranque junto al vano y, por encima, hasta la rosca
  if (l > a0) put(a0, 0, l, spring);
  if (Math.min(l, e0) > a0) put(a0, spring, Math.min(l, e0), h);
  if (a1 > r) put(r, 0, a1, spring);
  if (a1 > Math.max(r, e1)) put(Math.max(r, e1), spring, a1, h);
  archRing(ctx, {
    axis: axisZ ? 'z' : 'x',
    c,
    w,
    y0: spring,
    ring,
    t0,
    t1,
    top: h,
    clip: [Math.max(a0, e0), Math.min(a1, e1)],
    mat: o.voussoirs === false ? mat : (o.vmat ?? 'ashlar'),
    spMat: mat,
    topFace: true,
    n: o.slices ? Math.max(7, o.slices | 1) : undefined,
  });
  // colisión del dintel
  if (axisZ) ctx.col.add(t0, spring + R * 0.6, l, t1, h, r);
  else ctx.col.add(l, spring + R * 0.6, t0, r, h, t1);
}

// Arco de dovelas en un plano vertical: la rosca (cuñas con el intradós liso,
// de tonos alternos y la clave algo más clara, que sobresalen 'proud' de las
// caras del muro) y las enjutas del muro, exactas, hasta 'top'.
//   axis 'x': la luz va a lo largo de x (el muro corre en x y su grosor va de
//   t0 a t1 en z); 'z': a lo largo de z (grosor en x).
//   c: centro del vano; w: luz; y0: arranque; rise: flecha (w/2, medio
//   punto; menos, rebajado); ring: canto de la rosca; n: dovelas (impar).
//   clip: [u0, u1] tramo del muro donde van las enjutas (fuera, otro muro).
//   rooms: [cara de t0, cara de t1] (la luz horneada de cada lado).
// Devuelve la curva del intradós: yAt(u) (altura libre bajo el arco).
export function archRing(ctx, o) {
  const wb = ctx.wb;
  const { c, w, y0, t0, t1 } = o;
  const rise = o.rise ?? w / 2;
  const ring = o.ring ?? 0.32;
  const proud = o.proud ?? 0.025;
  const mat = o.mat ?? 'ashlar',
    spMat = o.spMat ?? 'wallstone';
  const rooms = o.rooms ?? [o.room, o.room];
  const tint = o.tint ?? [0.62, 0.6, 0.57];
  const spTint = o.spTint ?? tint;
  // circunferencia por (c - h, y0), (c + h, y0) y (c, y0 + k)
  const circ = (h, k) => {
    const R = (h * h + k * k) / (2 * k);
    const yc = y0 + k - R;
    return { R, yc, a0: Math.atan2(y0 - yc, h) };
  };
  const ci = circ(w / 2, rise),
    ce = circ(w / 2 + ring, rise + ring);
  const at = (C, t) => {
    const a = Math.PI - C.a0 - t * (Math.PI - 2 * C.a0);
    return [c + C.R * Math.cos(a), C.yc + C.R * Math.sin(a)];
  };
  let n = o.n ?? Math.round((Math.PI * (w / 2 + ring / 2)) / 0.42);
  n = Math.max(5, n | 1);
  const axZ = o.axis === 'z';
  // (u a lo largo de la luz, v altura, d profundidad) -> mundo
  const P = (u, v, d) => (axZ ? new THREE.Vector3(d, v, u) : new THREE.Vector3(u, v, d));
  // en 'z' el sentido de giro se invierte: se dan las caras al revés
  const q = (m, a, b, cc, d, opt) => (axZ ? wb.quad(m, d, cc, b, a, opt) : wb.quad(m, a, b, cc, d, opt));
  const df = t1 + proud,
    db = t0 - proud;
  const I = [],
    E = [];
  for (let k = 0; k <= n; k++) {
    I.push(at(ci, k / n));
    E.push(at(ce, k / n));
  }
  for (let k = 0; k < n; k++) {
    const key = k === (n - 1) / 2;
    const tk = tint.map((v) => v * (key ? 1.07 : k % 2 ? 0.92 : 1));
    const [ia, ib, ea, eb] = [I[k], I[k + 1], E[k], E[k + 1]];
    const sub = { ao: false, sub: 4, tint: tk };
    // caras (delante y detrás), intradós y trasdós
    q(mat, P(ia[0], ia[1], df), P(ib[0], ib[1], df), P(eb[0], eb[1], df), P(ea[0], ea[1], df), { ...sub, room: rooms[1] });
    q(mat, P(ea[0], ea[1], db), P(eb[0], eb[1], db), P(ib[0], ib[1], db), P(ia[0], ia[1], db), { ...sub, room: rooms[0] });
    q(mat, P(ia[0], ia[1], db), P(ib[0], ib[1], db), P(ib[0], ib[1], df), P(ia[0], ia[1], df), { ...sub, room: o.underRoom ?? rooms[1] });
    q(mat, P(ea[0], ea[1], df), P(eb[0], eb[1], df), P(eb[0], eb[1], db), P(ea[0], ea[1], db), { ...sub, room: rooms[1] });
  }
  // asiento de los salmeres (por debajo asoman lo que sobresalen del muro)
  // (seats: false, sin ellos: cuando otro arco ya los pone en el mismo sitio)
  if (o.seats !== false) {
    const sb = { ao: false, sub: 4, tint, room: rooms[1] };
    q(mat, P(E[0][0], y0, db), P(I[0][0], y0, db), P(I[0][0], y0, df), P(E[0][0], y0, df), sb);
    q(mat, P(I[n][0], y0, db), P(E[n][0], y0, db), P(E[n][0], y0, df), P(I[n][0], y0, df), sb);
  }
  // enjutas: de la rosca hasta 'top', recortadas al tramo del muro
  if (o.top !== undefined) {
    const [s0, s1] = o.clip ?? [E[0][0], E[n][0]];
    const spOpt = (room) => ({ ao: o.ao ?? false, sub: 2, tint: spTint, room, baseY: o.baseY });
    for (let k = 0; k < n; k++) {
      let [ua, va] = E[k],
        [ub, vb] = E[k + 1];
      if (ub <= s0 || ua >= s1) continue;
      const lerp = (u) => va + ((vb - va) * (u - ua)) / (ub - ua);
      if (ua < s0) {
        va = lerp(s0);
        ua = s0;
      }
      if (ub > s1) {
        vb = lerp(s1);
        ub = s1;
      }
      if (Math.max(va, vb) >= o.top - 0.001) continue;
      q(spMat, P(ua, va, t1), P(ub, vb, t1), P(ub, o.top, t1), P(ua, o.top, t1), spOpt(rooms[1]));
      q(spMat, P(ua, o.top, t0), P(ub, o.top, t0), P(ub, vb, t0), P(ua, va, t0), spOpt(rooms[0]));
    }
    if (o.topFace) {
      if (axZ) wb.box(spMat, t0, o.top - 0.01, s0, t1, o.top, s1, { faces: 't', ao: false, sub: 2, tint: spTint });
      else wb.box(spMat, s0, o.top - 0.01, t0, s1, o.top, t1, { faces: 't', ao: false, sub: 2, tint: spTint });
    }
  }
  // altura libre bajo el arco en u
  const yAt = (u) => {
    const du = u - c;
    if (Math.abs(du) >= w / 2) return y0;
    return ci.yc + Math.sqrt(Math.max(0, ci.R * ci.R - du * du));
  };
  // la cámara no se cuela por los riñones del arco (capas escalonadas)
  if (o.cam !== false && o.top !== undefined) {
    const a = Math.min(t0, t1),
      b = Math.max(t0, t1);
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      const ya = y0 + (rise * i) / steps,
        yb = y0 + (rise * (i + 1)) / steps;
      // ancho libre a la altura de arriba de la capa
      const k = ci.yc + ci.R > yb ? Math.sqrt(Math.max(0, ci.R * ci.R - (yb - ci.yc) ** 2)) : 0;
      for (const [u0, u1] of [
        [c - w / 2 - ring, c - k],
        [c + k, c + w / 2 + ring],
      ]) {
        if (u1 - u0 < 0.02) continue;
        if (axZ) ctx.col.addCam(a, ya, u0, b, yb, u1);
        else ctx.col.addCam(u0, ya, a, u1, yb, b);
      }
    }
    if (o.top > y0 + rise) {
      if (axZ) ctx.col.addCam(a, y0 + rise, c - w / 2 - ring, b, o.top, c + w / 2 + ring);
      else ctx.col.addCam(c - w / 2 - ring, y0 + rise, a, c + w / 2 + ring, o.top, b);
    }
  }
  return { yAt, ring, rise, n };
}

// Bóveda de cañón (de medio punto o rebajada) sobre x0..x1, z0..z1; el eje
// va a lo largo de 'axis' y arranca a la altura ys con flecha 'rise' (por
// defecto, la mitad de la luz). Sólo la cara de dentro, con una imposta
// corrida en los arranques y una capa escalonada para la cámara (que no se
// meta en los riñones).
export function barrelVault(ctx, o) {
  const wb = ctx.wb;
  const { x0, z0, x1, z1, ys } = o;
  const alongX = o.axis === 'x';
  const span = alongX ? z1 - z0 : x1 - x0;
  const len = alongX ? x1 - x0 : z1 - z0;
  const c = alongX ? (z0 + z1) / 2 : (x0 + x1) / 2;
  const inset = o.inset ?? 0.03;
  const h = span / 2 - inset;
  const rise = Math.min(o.rise ?? h, h);
  const R = (h * h + rise * rise) / (2 * rise);
  const yc = ys + rise - R;
  const a0 = Math.atan2(ys - yc, h);
  const n = o.n ?? Math.max(6, Math.round(((Math.PI - 2 * a0) * R) / 0.4));
  const mat = o.mat ?? 'wallstone';
  const tint = o.tint ?? [0.5, 0.48, 0.46];
  const room = o.room;
  const V3 = (s, y, u) => (alongX ? new THREE.Vector3(s, y, u) : new THREE.Vector3(u, y, s));
  const s0 = alongX ? x0 : z0,
    s1 = alongX ? x1 : z1;
  for (let k = 0; k < n; k++) {
    const aa = Math.PI - a0 - (k / n) * (Math.PI - 2 * a0),
      ab = Math.PI - a0 - ((k + 1) / n) * (Math.PI - 2 * a0);
    const ua = c + R * Math.cos(aa),
      va = yc + R * Math.sin(aa),
      ub = c + R * Math.cos(ab),
      vb = yc + R * Math.sin(ab);
    // (vista desde dentro; en 'z' el giro se invierte)
    if (alongX) wb.quad(mat, V3(s0, va, ua), V3(s1, va, ua), V3(s1, vb, ub), V3(s0, vb, ub), { ao: false, sub: o.sub ?? 2, tint, room });
    else wb.quad(mat, V3(s0, vb, ub), V3(s1, vb, ub), V3(s1, va, ua), V3(s0, va, ua), { ao: false, sub: o.sub ?? 2, tint, room });
  }
  // imposta en los arranques (tapa la junta con el muro)
  if (o.impost !== false) {
    const it = 0.09,
      ih = 0.14;
    const im = o.impostMat ?? 'ashlar',
      itn = o.impostTint ?? tint.map((v) => v * 1.1);
    if (alongX) {
      wb.box(im, x0, ys - ih, z0, x1, ys, z0 + it, { faces: 'tbs', ao: false, sub: 3, tint: itn, room });
      wb.box(im, x0, ys - ih, z1 - it, x1, ys, z1, { faces: 'tbn', ao: false, sub: 3, tint: itn, room });
    } else {
      wb.box(im, x0, ys - ih, z0, x0 + it, ys, z1, { faces: 'tbe', ao: false, sub: 3, tint: itn, room });
      wb.box(im, x1 - it, ys - ih, z0, x1, ys, z1, { faces: 'tbw', ao: false, sub: 3, tint: itn, room });
    }
  }
  if (o.cam !== false) {
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      const ya = ys + (rise * i) / steps,
        yb = ys + (rise * (i + 1)) / steps;
      const k = Math.sqrt(Math.max(0, R * R - (yb - yc) ** 2));
      for (const [u0, u1] of [
        [c - span / 2, c - k],
        [c + k, c + span / 2],
      ]) {
        if (u1 - u0 < 0.02) continue;
        if (alongX) ctx.col.addCam(x0, ya, u0, x1, yb, u1);
        else ctx.col.addCam(u0, ya, z0, u1, yb, z1);
      }
    }
  }
  return { crown: ys + rise, R, yc, len };
}

// Bóveda de cañón en rampa (sobre una escalera que corre a lo largo de z):
// como barrelVault, pero el arranque va de ys0 (en z0) a ys1 (en z1). Con su
// imposta inclinada a los lados y capas escalonadas para la cámara, con tapa
// (encima no hay nada: sin ella la cámara salía por la bóveda).
export function rampVault(ctx, o) {
  const wb = ctx.wb;
  const { x0, x1, z0, z1, ys0, ys1 } = o;
  const span = x1 - x0,
    c = (x0 + x1) / 2;
  const inset = o.inset ?? 0.03;
  const h = span / 2 - inset;
  const rise = Math.min(o.rise ?? h, h);
  const R = (h * h + rise * rise) / (2 * rise);
  const yc = rise - R; // (respecto del arranque)
  const a0 = Math.atan2(-yc, h);
  const n = o.n ?? Math.max(8, Math.round(((Math.PI - 2 * a0) * R) / 0.35));
  const mat = o.mat ?? 'wallstone';
  const tint = o.tint ?? [0.5, 0.48, 0.46];
  const room = o.room;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  for (let k = 0; k < n; k++) {
    const aa = Math.PI - a0 - (k / n) * (Math.PI - 2 * a0),
      ab = Math.PI - a0 - ((k + 1) / n) * (Math.PI - 2 * a0);
    const ua = c + R * Math.cos(aa),
      va = yc + R * Math.sin(aa),
      ub = c + R * Math.cos(ab),
      vb = yc + R * Math.sin(ab);
    wb.quad(mat, V(ub, ys0 + vb, z0), V(ub, ys1 + vb, z1), V(ua, ys1 + va, z1), V(ua, ys0 + va, z0), { ao: false, sub: o.sub ?? 1.2, tint, room });
  }
  if (o.impost !== false) {
    const it = 0.09,
      ih = 0.14;
    const im = o.impostMat ?? 'ashlar',
      itn = o.impostTint ?? tint.map((v) => v * 1.1);
    const io = { ao: false, sub: 3, tint: itn, room };
    // caras de delante (hacia dentro) y de abajo, a cada lado
    wb.quad(im, V(x0 + it, ys0 - ih, z0), V(x0 + it, ys0, z0), V(x0 + it, ys1, z1), V(x0 + it, ys1 - ih, z1), io);
    wb.quad(im, V(x1 - it, ys0 - ih, z0), V(x1 - it, ys1 - ih, z1), V(x1 - it, ys1, z1), V(x1 - it, ys0, z0), io);
    wb.quad(im, V(x0, ys0 - ih, z0), V(x0 + it, ys0 - ih, z0), V(x0 + it, ys1 - ih, z1), V(x0, ys1 - ih, z1), io);
    wb.quad(im, V(x1 - it, ys0 - ih, z0), V(x1, ys0 - ih, z0), V(x1, ys1 - ih, z1), V(x1 - it, ys1 - ih, z1), io);
  }
  if (o.cam !== false) {
    const len = z1 - z0;
    const m = Math.max(1, Math.ceil(len / (o.camStep ?? 0.5)));
    for (let j = 0; j < m; j++) {
      const za = z0 + (len * j) / m,
        zb = z0 + (len * (j + 1)) / m;
      const ya0 = ys0 + ((ys1 - ys0) * j) / m,
        ya1 = ys0 + ((ys1 - ys0) * (j + 1)) / m;
      const ys = Math.min(ya0, ya1);
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        const ya = ys + (rise * i) / steps,
          yb = ys + (rise * (i + 1)) / steps;
        const kk = Math.sqrt(Math.max(0, R * R - (yb - ys - yc) ** 2));
        if (c - kk - x0 > 0.02) ctx.col.addCam(x0, ya, za, c - kk, yb, zb);
        if (x1 - c - kk > 0.02) ctx.col.addCam(c + kk, ya, za, x1, yb, zb);
      }
      ctx.col.addCam(x0, ys + rise, za, x1, ys + rise + 0.6, zb);
    }
  }
  return { rise, R };
}

// Luneto: el testero de una bóveda de cañón, del arranque a la rosca (lo que
// barrelVault deja abierto en los extremos: sin él, por encima del muro se
// veía el vacío). axis: el de la bóveda; at: el plano del testero; c, span,
// ys, rise, n: los de la bóveda (mismos tramos: sin rendijas entre los dos);
// face: hacia dónde mira (+1 / -1 en su eje); hole: { u0, u1, y }, un vano que
// sube por encima del arranque (bajo él no se dibuja el luneto).
export function lunette(ctx, o) {
  const wb = ctx.wb;
  const { c, span, ys, at } = o;
  const inset = o.inset ?? 0.03;
  const h = span / 2 - inset;
  const rise = Math.min(o.rise ?? h, h);
  const R = (h * h + rise * rise) / (2 * rise);
  const yc = ys + rise - R;
  const a0 = Math.atan2(ys - yc, h);
  const n = o.n ?? Math.max(6, Math.round(((Math.PI - 2 * a0) * R) / 0.4));
  const alongZ = o.axis !== 'x';
  const P = (u, y) => (alongZ ? new THREE.Vector3(u, y, at) : new THREE.Vector3(at, y, u));
  const fwd = alongZ ? o.face > 0 : o.face < 0;
  const mat = o.mat ?? 'wallstone';
  const opt = { ao: false, sub: o.sub ?? 1.2, tint: o.tint, room: o.room };
  // (un tramo cuyo lado izquierdo o derecho no tiene altura es un triángulo:
  // dado como cuadrilátero, con dos vértices iguales, su normal salía nula y
  // el sombreado ponía negro todo el trozo de malla)
  const strip = (ua, va, ub, vb, y0) => {
    if (ub - ua < 1e-4) return;
    const la = va - y0 > 1e-4,
      lb = vb - y0 > 1e-4;
    if (!la && !lb) return;
    if (la && lb) {
      if (fwd) wb.quad(mat, P(ua, y0), P(ub, y0), P(ub, vb), P(ua, va), opt);
      else wb.quad(mat, P(ub, y0), P(ua, y0), P(ua, va), P(ub, vb), opt);
    } else if (lb) {
      if (fwd) wb.tri(mat, P(ua, y0), P(ub, y0), P(ub, vb), opt);
      else wb.tri(mat, P(ub, y0), P(ua, y0), P(ub, vb), opt);
    } else {
      if (fwd) wb.tri(mat, P(ua, y0), P(ub, y0), P(ua, va), opt);
      else wb.tri(mat, P(ub, y0), P(ua, y0), P(ua, va), opt);
    }
  };
  const H = o.hole;
  for (let k = 0; k < n; k++) {
    const aa = Math.PI - a0 - (k / n) * (Math.PI - 2 * a0),
      ab = Math.PI - a0 - ((k + 1) / n) * (Math.PI - 2 * a0);
    const ua = c + R * Math.cos(aa),
      va = yc + R * Math.sin(aa),
      ub = c + R * Math.cos(ab),
      vb = yc + R * Math.sin(ab);
    if (!H || ub <= H.u0 || ua >= H.u1) {
      strip(ua, va, ub, vb, ys);
      continue;
    }
    // el tramo cruza el vano: se parte por sus bordes (sobre la misma cuerda)
    const at2 = (u) => va + ((vb - va) * (u - ua)) / (ub - ua);
    const cuts = [ua, ...[H.u0, H.u1].filter((u) => u > ua && u < ub), ub];
    for (let i = 0; i < cuts.length - 1; i++) {
      const u0 = cuts[i],
        u1 = cuts[i + 1];
      const inside = (u0 + u1) / 2 > H.u0 && (u0 + u1) / 2 < H.u1;
      const y0 = inside ? Math.max(ys, H.y) : ys;
      if (y0 < Math.min(at2(u0), at2(u1))) strip(u0, at2(u0), u1, at2(u1), y0);
    }
  }
  return { crown: ys + rise, n };
}

// Cúpula: casquete esférico de radio de base r en (cx, y0, cz) y flecha
// 'rise', visto desde dentro; con 'ribs' nervios que suben desde la base
// (desfasados 'ribPhase') hasta una clave en lo alto.
export function dome(ctx, o) {
  const wb = ctx.wb;
  const { cx, cz, r, y0, rise } = o;
  const R = (r * r + rise * rise) / (2 * rise);
  const yc = y0 + rise - R;
  const f0 = Math.asin(Math.min(1, r / R));
  const n = o.n ?? 32,
    m = o.m ?? 10;
  const mat = o.mat ?? 'wallstone';
  const P = (i, j) => {
    const th = (i / n) * Math.PI * 2 + (o.phase ?? 0);
    const f = f0 * (1 - j / m);
    const rho = R * Math.sin(f);
    return new THREE.Vector3(cx + Math.cos(th) * rho, yc + R * Math.cos(f), cz + Math.sin(th) * rho);
  };
  const opt = { ao: false, sub: o.sub ?? 1.4, tint: o.tint, room: o.room };
  for (let j = 0; j < m; j++)
    for (let i = 0; i < n; i++) {
      if (j === m - 1) wb.tri(mat, P(i, j), P(i + 1, j), P(i, j + 1), opt);
      else wb.quad(mat, P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1), opt);
    }
  if (o.ribs) {
    const rw = o.ribW ?? 0.32,
      rd = o.ribD ?? 0.2;
    for (let k = 0; k < o.ribs; k++) {
      const th = (k / o.ribs) * Math.PI * 2 + (o.ribPhase ?? 0);
      for (let j = 0; j < m; j++) {
        const fa = f0 * (1 - j / m),
          fb = f0 * (1 - (j + 1) / m);
        const pa = new THREE.Vector3(cx + Math.cos(th) * (R - rd / 2) * Math.sin(fa), yc + (R - rd / 2) * Math.cos(fa), cz + Math.sin(th) * (R - rd / 2) * Math.sin(fa));
        const pb = new THREE.Vector3(cx + Math.cos(th) * (R - rd / 2) * Math.sin(fb), yc + (R - rd / 2) * Math.cos(fb), cz + Math.sin(th) * (R - rd / 2) * Math.sin(fb));
        beam(ctx, o.ribMat ?? 'ashlar', pa, pb, rw, { d: rd, tint: o.ribTint, room: o.room, side: new THREE.Vector3(-Math.sin(th), 0, Math.cos(th)) });
      }
    }
    // la clave
    wb.cylinder(o.ribMat ?? 'ashlar', cx, y0 + rise - 0.35, cz, 0.7, 0.55, 0.3, 8, { ao: false, capBot: true, tint: o.ribTint, room: o.room });
  }
  return { R, yc, crown: y0 + rise };
}

// Viga (o nervio) de sección w x d entre dos puntos; 'side' fija hacia dónde
// va el ancho w (la otra cara, d, queda perpendicular): un nervio de cúpula
// con el ancho de lado y el canto hacia el centro.
export function beam(ctx, mat, a, b, w, o = {}) {
  const d = new THREE.Vector3().subVectors(b, a);
  const L = d.length();
  if (L < 1e-4) return;
  const y = d.clone().normalize();
  const q = new THREE.Quaternion();
  if (o.side) {
    const x = o.side.clone().addScaledVector(y, -o.side.dot(y)).normalize();
    const z = new THREE.Vector3().crossVectors(x, y);
    q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  } else q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), y);
  const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(w, L, o.d ?? w));
  ctx.wb.geometry(mat, new THREE.BoxGeometry(1, 1, 1), m, { ao: false, room: o.room, tint: o.tint });
}

// Tejado a dos aguas con cuerpo: faldones de teja con su grueso (canto en
// los aleros y tablas de remate en los hastiales), cara de abajo de madera,
// cumbrera de teja, hastiales de piedra y su capa para la cámara.
//   axis 'x': cumbrera a lo largo de x. wallT: grueso de los hastiales.
export function solidGableRoof(ctx, x0, z0, x1, z1, yEave, yRidge, axis = 'x', o = {}) {
  const wb = ctx.wb;
  const ov = o.overhang ?? 0.4,
    gv = o.gableOverhang ?? 0.3,
    th = o.thick ?? 0.2;
  const mat = o.mat ?? 'roof',
    under = o.under ?? 'wooddark',
    wall = o.wallMat ?? 'wallstone';
  const alongX = axis === 'x';
  // open: [extremo de menos, extremo de más] que siguen en otro tramo del
  // mismo tejado (un tejado partido en trozos que se rompen aparte): sin
  // vuelo, sin tablas de remate y la cumbrera a ras
  const open = o.open ?? [false, false];
  const sA = (alongX ? x0 : z0) - (open[0] ? 0 : gv),
    sB = (alongX ? x1 : z1) + (open[1] ? 0 : gv);
  const uc = alongX ? (z0 + z1) / 2 : (x0 + x1) / 2;
  const half = (alongX ? z1 - z0 : x1 - x0) / 2;
  const slope = (yRidge - yEave) / half;
  const ue = half + ov,
    ye = yEave - ov * slope;
  // grueso medido en vertical (el faldón es inclinado)
  const tv = th * Math.sqrt(1 + slope * slope);
  const P = (sv, y, u) => (alongX ? new THREE.Vector3(sv, y, uc + u) : new THREE.Vector3(uc + u, y, sv));
  // en 'z' (s -> z, u -> x) se invierte el sentido de giro
  const q = (m, a, b, c, d, opt) => (alongX ? wb.quad(m, a, b, c, d, opt) : wb.quad(m, d, c, b, a, opt));
  const top = { ao: false, sub: 2.2, tint: o.tint },
    bot = { ao: false, sub: 3, tint: [0.5, 0.47, 0.44] },
    edge = { ao: false, sub: 3, tint: [0.58, 0.52, 0.46] };
  for (const sg of [1, -1]) {
    // faldón (arriba), su cara de abajo y el canto del alero
    if (sg > 0) {
      q(mat, P(sA, ye, ue), P(sB, ye, ue), P(sB, yRidge, 0), P(sA, yRidge, 0), top);
      q(under, P(sA, yRidge - tv, 0), P(sB, yRidge - tv, 0), P(sB, ye - tv, ue), P(sA, ye - tv, ue), bot);
      q('wooddark', P(sA, ye - tv, ue), P(sB, ye - tv, ue), P(sB, ye, ue), P(sA, ye, ue), edge);
    } else {
      q(mat, P(sB, ye, -ue), P(sA, ye, -ue), P(sA, yRidge, 0), P(sB, yRidge, 0), top);
      q(under, P(sB, yRidge - tv, 0), P(sA, yRidge - tv, 0), P(sA, ye - tv, -ue), P(sB, ye - tv, -ue), bot);
      q('wooddark', P(sB, ye - tv, -ue), P(sA, ye - tv, -ue), P(sA, ye, -ue), P(sB, ye, -ue), edge);
    }
  }
  // tablas de remate en los hastiales (el canto inclinado de los faldones)
  for (const [sv, out] of [
    [sA, -1],
    [sB, 1],
  ]) {
    if (open[out < 0 ? 0 : 1]) continue;
    const B1 = P(sv, ye - tv, ue),
      T1 = P(sv, ye, ue),
      T2 = P(sv, yRidge, 0),
      B2 = P(sv, yRidge - tv, 0),
      B1n = P(sv, ye - tv, -ue),
      T1n = P(sv, ye, -ue);
    if (out < 0) {
      q('wooddark', B1, T1, T2, B2, edge);
      q('wooddark', B2, T2, T1n, B1n, edge);
    } else {
      q('wooddark', B2, T2, T1, B1, edge);
      q('wooddark', B1n, T1n, T2, B2, edge);
    }
  }
  // cumbrera: caballetes de teja
  const rw = 0.17;
  const rA = sA - (open[0] ? 0 : 0.02),
    rB = sB + (open[1] ? 0 : 0.02);
  if (alongX) wb.box(mat, rA, yRidge - 0.06, uc - rw, rB, yRidge + 0.15, uc + rw, { ao: false, faces: 'tnsewb', tint: o.tint });
  else wb.box(mat, uc - rw, yRidge - 0.06, rA, uc + rw, yRidge + 0.15, rB, { ao: false, faces: 'tnsewb', tint: o.tint });
  // hastiales de piedra (por fuera y por dentro). gables: [extremo de
  // menos, extremo de más], cada uno false (sin hastial: ya hay un muro más
  // alto) o { y0, t } (desde qué altura y con qué grueso: sobre una fachada,
  // sólo lo que asoma por encima de ella)
  const wt = o.wallT ?? 0.4;
  const sx0 = alongX ? x0 : z0,
    sx1 = alongX ? x1 : z1;
  const gTint = o.wallTint ?? [0.8, 0.78, 0.74];
  const gs = o.gables ?? [{}, {}];
  for (const [a0, b0, outward, g] of [
    [sx0, sx0 + wt, -1, gs[0]],
    [sx1 - wt, sx1, 1, gs[1]],
  ]) {
    if (g === false) continue;
    const gt = g.t ?? wt;
    const a = outward < 0 ? a0 : b0 - gt,
      b = outward < 0 ? a0 + gt : b0;
    const so = outward < 0 ? a : b,
      si = outward < 0 ? b : a;
    const gy = g.y0 ?? yEave;
    const gh = Math.min(half, (yRidge - tv - gy) / slope);
    // (triángulo: alero a alero bajo los faldones, hasta la cumbrera)
    const tri = (sv, flip, room) => {
      const p1 = P(sv, gy, -gh),
        p2 = P(sv, gy, gh),
        p3 = P(sv, yRidge - tv, 0);
      const ccw = (outward < 0) !== flip;
      const order = alongX ? ccw : !ccw;
      if (order) wb.tri(wall, p1, p2, p3, { ao: false, tint: gTint, room });
      else wb.tri(wall, p2, p1, p3, { ao: false, tint: gTint, room });
    };
    tri(so, false, 'out');
    tri(si, true, o.room);
  }
  // la cámara no se mete en el tejado
  if (o.cam !== false) {
    const nS = 3;
    for (let i = 0; i < nS; i++) {
      const ya = yEave + ((yRidge - yEave) * i) / nS,
        yb = yEave + ((yRidge - yEave) * (i + 1)) / nS;
      const hw = half * (1 - (i + 0.5) / nS);
      if (alongX) ctx.col.addCam(x0, ya, uc - hw, x1, yb, uc + hw);
      else ctx.col.addCam(uc - hw, ya, z0, uc + hw, yb, z1);
    }
  }
}

// Pilastra adosada (de y0 a y1) con su basa y su imposta; dir: hacia dónde
// asoma del muro ('n','s','e','w'); (a) centro a lo largo del muro; line:
// plano del muro; w: ancho; d: vuelo.
export function pilaster(ctx, line, a, dir, y0, y1, o = {}) {
  const wb = ctx.wb;
  const w = o.w ?? 0.45,
    d = o.d ?? 0.15;
  const mat = o.mat ?? 'ashlar';
  const tint = o.tint ?? [0.6, 0.58, 0.55];
  const room = o.room;
  const sgn = dir === 'n' || dir === 'w' ? -1 : 1;
  const box = (dd, ya, yb, ww, faces, t = tint) => {
    const p0 = line,
      p1 = line + sgn * dd;
    if (dir === 'n' || dir === 's') wb.box(mat, a - ww / 2, ya, Math.min(p0, p1), a + ww / 2, yb, Math.max(p0, p1), { faces, ao: false, sub: 2, tint: t, room });
    else wb.box(mat, Math.min(p0, p1), ya, a - ww / 2, Math.max(p0, p1), yb, a + ww / 2, { faces, ao: false, sub: 2, tint: t, room });
  };
  const front = { n: 'n', s: 's', e: 'e', w: 'w' }[dir];
  const sides = dir === 'n' || dir === 's' ? 'ew' : 'ns';
  box(d, y0 + 0.3, y1 - 0.16, w, front + sides);
  box(d + 0.05, y0, y0 + 0.3, w + 0.1, 't' + front + sides);
  box(d + 0.07, y1 - 0.16, y1, w + 0.12, 'b' + front + sides, tint.map((v) => v * 1.08));
  if (o.collide !== false) {
    const p0 = line,
      p1 = line + sgn * (d + 0.05);
    if (dir === 'n' || dir === 's') ctx.col.add(a - w / 2 - 0.05, y0, Math.min(p0, p1), a + w / 2 + 0.05, y1, Math.max(p0, p1));
    else ctx.col.add(Math.min(p0, p1), y0, a - w / 2 - 0.05, Math.max(p0, p1), y1, a + w / 2 + 0.05);
  }
}

// Muro de piedra con vanos de arco (puertas interiores): a lo largo de
// 'axis' de a0 a a1, grosor de t0 a t1, de y0 a y1. openings: [{ c, w, h
// (altura del arranque sobre y0), rise?, ring? }]. rooms: [lado de t0, lado
// de t1]. Dibuja las dos caras (cada una con la luz de su estancia), las
// jambas, la rosca de dovelas y las enjutas, con su colisión.
export function archedWall(ctx, o) {
  const wb = ctx.wb;
  const { axis, a0, a1, t0, t1, y0, y1 } = o;
  const mat = o.mat ?? 'wallstone';
  const rooms = o.rooms ?? [o.room, o.room];
  const tint = o.tint ?? [0.72, 0.7, 0.66];
  const tints = o.tints ?? [tint, tint];
  const axZ = axis === 'z';
  const fNeg = axZ ? 'w' : 'n',
    fPos = axZ ? 'e' : 's';
  // cara del extremo que mira hacia -u y hacia +u
  const endLo = axZ ? 'n' : 'w',
    endHi = axZ ? 's' : 'e';
  const base = { sub: 1.6, aoH: 1.2, aoMin: 0.5, baseY: y0 };
  const piece = (u0, v0, u1, v1, lo = false, hi = false) => {
    if (u1 - u0 < 0.005 || v1 - v0 < 0.005) return;
    const b = axZ ? [t0, v0, u0, t1, v1, u1] : [u0, v0, t0, u1, v1, t1];
    wb.box(mat, ...b, { ...base, faces: fNeg, room: rooms[0], tint: tints[0] });
    wb.box(mat, ...b, { ...base, faces: fPos + (lo ? endLo : '') + (hi ? endHi : ''), room: rooms[1], tint: tints[1] });
    if (o.collide !== false) ctx.col.add(...b);
  };
  const ops = [...(o.openings ?? [])].sort((p, q) => p.c - q.c);
  let prevU = a0,
    prevRing = 0,
    prevYs = y1;
  for (let i = 0; i <= ops.length; i++) {
    const d = ops[i];
    const ring = d ? (d.ring ?? 0.26) : 0;
    const l = d ? d.c - d.w / 2 : a1;
    const ys = d ? y0 + d.h : y1;
    // jamba derecha del vano anterior, tramo entero y jamba izquierda de éste
    if (i > 0) piece(prevU, y0, prevU + prevRing, prevYs, true, false);
    piece(prevU + prevRing, y0, l - ring, y1, i === 0 && !!o.endLo, i === ops.length && !!o.endHi);
    if (!d) break;
    piece(l - ring, y0, l, ys, false, true);
    const r = d.c + d.w / 2;
    const rise = d.rise ?? d.w / 2;
    archRing(ctx, {
      axis: axZ ? 'z' : 'x',
      c: d.c,
      w: d.w,
      y0: ys,
      rise,
      ring,
      t0,
      t1,
      top: y1,
      clip: [l - ring, r + ring],
      mat: d.mat ?? 'ashlar',
      spMat: mat,
      rooms,
      tint: d.tint ?? [0.66, 0.64, 0.6],
      spTint: tint,
      proud: d.proud ?? 0.02,
      cam: o.cam,
    });
    if (o.collide !== false) {
      const k = 0.62;
      const box = (u0, v0, u1, v1) => (axZ ? ctx.col.add(t0, v0, u0, t1, v1, u1) : ctx.col.add(u0, v0, t0, u1, v1, t1));
      box(l, ys + rise * k, r, y1);
      box(l - ring, ys, l, y1);
      box(r, ys, r + ring, y1);
    }
    prevU = r;
    prevRing = ring;
    prevYs = ys;
  }
}

// ---------------------------------------------------------------- casas
const PLASTER_TINTS = [
  [1, 1, 1],
  [1.02, 0.94, 0.8],
  [1.0, 0.86, 0.82],
  [0.86, 0.92, 1.0],
  [0.96, 0.96, 0.9],
  [1.0, 0.9, 0.7],
];

// Ventana en coordenadas de fachada (x a lo largo, y altura, z hacia fuera).
export function windowAt(ctx, x, y, w, h, o, rng) {
  const wb = ctx.wb;
  const lit = o.lit;
  wb.box(lit ? 'ember' : 'black', x - w / 2, y, 0, x + w / 2, y + h, 0.03, { ao: false, grime: false, faces: 's' });
  // marco
  const fm = o.frameMat ?? 'timber';
  wb.box(fm, x - w / 2 - 0.1, y - 0.12, 0, x + w / 2 + 0.1, y, 0.12, { ao: false, sub: 3 });
  wb.box(fm, x - w / 2 - 0.1, y + h, 0, x + w / 2 + 0.1, y + h + 0.1, 0.1, { ao: false, sub: 3, faces: 'tsewb' });
  wb.box(fm, x - w / 2 - 0.1, y, 0, x - w / 2, y + h, 0.08, { ao: false, sub: 3 });
  wb.box(fm, x + w / 2, y, 0, x + w / 2 + 0.1, y + h, 0.08, { ao: false, sub: 3 });
  const kind = rng.next();
  if (kind < 0.3) {
    // contraventanas cerradas (tablas), por delante de los pies derechos del
    // entramado (a su misma profundidad parpadeaban)
    wb.box('planks', x - w / 2, y, 0.02, x + w / 2, y + h, 0.075, { ao: false, sub: 3 });
  } else if (kind < 0.65) {
    // contraventanas abiertas
    for (const s of [-1, 1]) {
      wb.push();
      wb.translate(x + (s * w) / 2, y, 0.05);
      wb.rotateY(s * (0.9 + rng.range(-0.4, 0.5)));
      wb.box('planks', s > 0 ? 0 : -w / 2, 0, -0.03, s > 0 ? w / 2 : 0, h, 0.03, { ao: false, sub: 3 });
      wb.pop();
    }
  } else if (kind < 0.8) {
    // rejas
    for (let i = 1; i < 4; i++) wb.box('iron', x - w / 2 + (i * w) / 4 - 0.02, y, 0.05, x - w / 2 + (i * w) / 4 + 0.02, y + h, 0.09, { ao: false, grime: false });
  } else {
    // una contraventana colgando torcida
    wb.push();
    wb.translate(x - w / 2, y + h, 0.08);
    wb.rotateZ(-0.35);
    wb.rotateY(-0.4);
    wb.box('planks', 0, -h, -0.03, w / 2, 0, 0.03, { ao: false, sub: 3 });
    wb.pop();
  }
  if (lit && ctx.lights) {
    // luz horneada que sale por la ventana (coordenadas mundo)
    const p = V(x, y + h / 2, 0.6).applyMatrix4(wb.m);
    ctx.lights.push({ x: p.x, y: p.y, z: p.z, r: 1.0, g: 0.45, b: 0.15, radius: 5, intensity: 0.9 });
  }
}

export function doorAt(ctx, x, w, h, o = {}) {
  const wb = ctx.wb;
  // jambas y dintel de piedra (el dintel descansa sobre las jambas y vuela
  // 2 cm por los lados: con las piezas solapadas, las esquinas parpadeaban)
  wb.box('ashlar', x - w / 2 - 0.3, 0, 0, x - w / 2, h, 0.16, { sub: 2 });
  wb.box('ashlar', x + w / 2, 0, 0, x + w / 2 + 0.3, h, 0.16, { sub: 2 });
  wb.box('ashlar', x - w / 2 - 0.32, h, 0, x + w / 2 + 0.32, h + 0.35, 0.18, { sub: 2, baseY: 0 });
  if (o.frameOnly) return;
  // umbral de piedra delante de la hoja: se lee como una puerta a pie de calle
  wb.box('ashlar', x - w / 2 - 0.08, -0.02, 0, x + w / 2 + 0.08, 0.05, 0.26, { ao: false, faces: 'tnsew', sub: 3 });
  if (o.open) {
    wb.box('black', x - w / 2, 0, 0, x + w / 2, h, 0.02, { ao: false, grime: false, faces: 's' });
    return;
  }
  wb.box(o.mat ?? 'planks', x - w / 2, 0.05, 0, x + w / 2, h, 0.06, { sub: 3, aoH: 0.6 });
  for (const yy of [0.4, h - 0.5]) wb.box('iron', x - w / 2, yy, 0.06, x + w / 2 - 0.1, yy + 0.08, 0.09, { ao: false });
  // aldaba y bocallave
  wb.box('iron', x + w / 2 - 0.3, 1.02, 0.06, x + w / 2 - 0.2, 1.2, 0.075, { ao: false });
  wb.box('black', x + w / 2 - 0.265, 1.05, 0.075, x + w / 2 - 0.235, 1.11, 0.078, { ao: false, grime: false, faces: 's' });
  wb.box('iron', x - 0.05, 1.32, 0.06, x + 0.05, 1.36, 0.12, { ao: false });
  wb.box('iron', x - 0.1, 1.18, 0.1, x + 0.1, 1.21, 0.13, { ao: false });
  if (o.bar) {
    // tranca atravesada sobre dos grapas de hierro
    wb.box('iron', x - w / 2 - 0.12, 1.02, 0.06, x - w / 2 + 0.02, 1.22, 0.16, { ao: false });
    wb.box('iron', x + w / 2 - 0.02, 1.02, 0.06, x + w / 2 + 0.12, 1.22, 0.16, { ao: false });
    wb.box('wooddark', x - w / 2 - 0.25, 1.06, 0.09, x + w / 2 + 0.25, 1.2, 0.2, { ao: false, faces: 'tnsewb' });
  }
  if (o.boards) {
    // tablones clavados en aspa
    for (const s of [-1, 1]) {
      wb.push();
      wb.translate(x, h / 2, 0.12);
      wb.rotateZ(s * 0.7);
      wb.box('planks', -1.1, -0.12, -0.03, 1.1, 0.12, 0.03, { ao: false, sub: 3 });
      wb.pop();
    }
  }
}

function sideFrame(side, x0, z0, x1, z1) {
  // devuelve [tx, tz, rot, L]
  if (side === 's') return [x0, z1, 0, x1 - x0];
  if (side === 'n') return [x1, z0, Math.PI, x1 - x0];
  if (side === 'e') return [x1, z1, Math.PI / 2, z1 - z0];
  return [x0, z0, -Math.PI / 2, z1 - z0];
}

// Casa medieval: zócalo de piedra, planta baja, planta alta en voladizo
// con entramado de madera, tejado a dos aguas de teja.
// Casa visitable (hollow): muros de la planta baja con huecos de puerta en
// cualquier fachada (doors), tabiques interiores con pasos (walls), suelo,
// techo con vigas y colisión exacta; el techo y el tejado frenan la cámara.
//   doors: [{ side:'n'|'s'|'e'|'w', at (a lo largo de la fachada, como doorAt)
//             | x/z (coordenada mundo), w, h }]
//   walls: [{ x0, z0, x1, z1, doors: [{ at (coordenada mundo a lo largo), w, h }] }]
export function house(ctx, s) {
  // (en el bloque que revienta con el coloso, cada casa en su propio grupo:
  // se vienen abajo una tras otra, en ola; ver finale/director.js)
  const sub = ctx._grp && ctx._grp.name === 'centro' && ctx.beginGroup ? 'centro:' + (ctx.centroN = (ctx.centroN || 0) + 1) : null;
  if (sub) ctx.beginGroup(sub);
  const r = houseBody(ctx, s, sub);
  if (sub) ctx.endGroup();
  return r;
}
function houseBody(ctx, s, sub) {
  const wb = ctx.wb;
  const { x0, z0, x1, z1 } = s;
  const rng = new RNG(s.seed ?? hashSeed(x0, z0, x1, z1));
  const W = x1 - x0,
    D = z1 - z0;
  const h = s.h ?? rng.range(5.6, 8.4);
  const g1 = s.g1 ?? 3.1; // altura planta baja
  const style = s.style ?? rng.pick(['plaster', 'timber', 'timber', 'stone']);
  const tint = s.tint ?? rng.pick(PLASTER_TINTS);
  const front = s.front ?? 's';
  const sides = s.sides ?? ['n', 's', 'e', 'w'];
  const upperMat = style === 'stone' ? 'wallstone' : 'plaster';
  const lowerMat = style === 'plaster' ? 'plaster' : 'wallstone';
  const jetty = s.jetty ?? (style !== 'stone' && h > 6 && rng.chance(0.7) ? 0.5 : 0);
  const burned = s.burned;
  const hollow = !!s.hollow;
  const lt = lowerMat === 'plaster' ? tint : null;

  // casas ya construidas pegadas a ésta por algún lado: el zócalo no se mete
  // en el suyo (sus caras coincidían en las esquinas y parpadeaban)
  const prevHouses = ctx.houseRects || (ctx.houseRects = []);
  const nb = { n: false, s: false, e: false, w: false };
  for (const r of prevHouses) {
    const ox = Math.min(x1, r.x1) - Math.max(x0, r.x0),
      oz = Math.min(z1, r.z1) - Math.max(z0, r.z0);
    if (oz > 0.3 && Math.abs(r.x0 - x1) < 0.02) nb.e = true;
    if (oz > 0.3 && Math.abs(r.x1 - x0) < 0.02) nb.w = true;
    if (ox > 0.3 && Math.abs(r.z0 - z1) < 0.02) nb.s = true;
    if (ox > 0.3 && Math.abs(r.z1 - z0) < 0.02) nb.n = true;
  }
  prevHouses.push({ x0, z0, x1, z1, front, jetty, hollow, seed: s.seed, h, style, sub, group: ctx._grp ? ctx._grp.name : null, groups: ctx._grp ? [...(ctx._grpStack || []).map((q) => q.name), ctx._grp.name] : null });

  // colisión del volumen (las visitables la llevan pieza a pieza)
  if (s.collide !== false && !hollow) ctx.col.add(x0, 0, z0, x1, h, z1);

  // puertas de una casa visitable, en el marco local de cada fachada
  const doorsBySide = { n: [], s: [], e: [], w: [] };
  if (hollow) {
    const list = s.doors ?? [{ side: front, at: s.doorAt }];
    for (const d of list) {
      const [tx, tz, , L] = sideFrame(d.side, x0, z0, x1, z1);
      let at = d.at;
      if (at === undefined && d.x !== undefined) at = d.side === 's' ? d.x - tx : d.side === 'n' ? tx - d.x : at;
      if (at === undefined && d.z !== undefined) at = d.side === 'e' ? tz - d.z : d.side === 'w' ? d.z - tz : at;
      if (at === undefined) at = L / 2;
      doorsBySide[d.side].push({ at, w: d.w ?? 1.3, h: d.h ?? 2.3, frame: d.frame !== false });
    }
  }

  if (hollow) {
    const t = s.wallT ?? 0.35;
    const room = s.room;
    for (const sd of ['n', 's', 'e', 'w']) {
      const [tx, tz, rot, L] = sideFrame(sd, x0, z0, x1, z1);
      const ds = doorsBySide[sd].sort((a, b) => a.at - b.at);
      wb.at(tx, 0, tz, rot, () => {
        // tramos de muro entre puertas: cara exterior (fuera) e interior (habitación)
        const seg = (a0, a1, yb, yt, ends) => {
          if (a1 - a0 < 0.01) return;
          wb.box(lowerMat, a0, yb, -t, a1, yt, 0, { sub: 1.6, tint: lt, aoH: 1.2, faces: 's' + (yb > 0 ? 'b' : '') + ends, room: 'out' });
          wb.box(lowerMat, a0, yb, -t, a1, yt, 0, { sub: 1.6, tint: lt ? lt.map((v) => v * 0.92) : [0.86, 0.84, 0.8], aoH: 1.2, faces: 'n', room, baseY: 0 });
        };
        let cur = 0;
        for (const d of ds) {
          const a = d.at - d.w / 2,
            b = d.at + d.w / 2;
          seg(cur, a, 0, g1, 'e');
          seg(a, b, d.h, g1, '');
          // umbral de piedra
          wb.box('ashlar', a, 0, -t - 0.02, b, 0.035, 0.12, { ao: false, faces: 'tnsew' });
          cur = b;
        }
        seg(cur, L, 0, g1, ds.length ? 'w' : '');
        // zócalo: sólo una franja exterior (antes era un bloque macizo que
        // tapaba el suelo de dentro y lo hacía parecer elevado)
        // (las fachadas n/s se alargan 7 cm por los extremos y cierran las
        // esquinas; junto a una casa vecina ya construida se quedan 7 cm cortas)
        const ends = { s: ['w', 'e'], n: ['e', 'w'], e: ['s', 'n'], w: ['n', 's'] }[sd];
        const base = sd === 'n' || sd === 's' ? 0.07 : 0;
        const extS = nb[ends[0]] ? -0.07 : base,
          extE = nb[ends[1]] ? -0.07 : base;
        cur = 0;
        for (const d of [...ds, { at: L + 10, w: 0 }]) {
          const a = Math.min(L, d.at - d.w / 2);
          if (a - cur > 0.01) wb.box('wallstone', cur - (cur <= 0 ? extS : 0), 0, 0, a + (a >= L ? extE : 0), 0.65, 0.07, { sub: 2, aoH: 0.6, faces: 'ts' + (cur > 0 ? 'w' : '') + (a < L ? 'e' : ''), room: 'out' });
          cur = d.at + d.w / 2;
        }
        // marcos de piedra de las puertas
        for (const d of ds) if (d.frame) doorAt(ctx, d.at, d.w, d.h, { frameOnly: true });
      });
      // colisión de los tramos (coordenadas mundo)
      let cur = 0;
      for (const d of [...ds, { at: L + 10, w: 0 }]) {
        const a = Math.min(L, d.at - d.w / 2);
        if (a - cur > 0.01) addSideBox(ctx.col, sd, x0, z0, x1, z1, cur, a, t, 0, g1);
        if (d.h) addSideBox(ctx.col, sd, x0, z0, x1, z1, d.at - d.w / 2, d.at + d.w / 2, t, d.h, g1);
        cur = d.at + d.w / 2;
      }
    }
    // suelo (con los huecos de escaleras que bajan, floorHoles), techo con
    // vigas y su colisión (la cámara no sube a la planta alta)
    for (const r of subtractRects([x0 + t - 0.01, z0 + t - 0.01, x1 - t + 0.01, z1 - t + 0.01], s.floorHoles ?? []))
      wb.box(s.floorMat ?? 'planks', r[0], -0.05, r[1], r[2], 0.02, r[3], { faces: 't', ao: false, room, uv: 0.5, tint: s.floorTint });
    wb.box('wooddark', x0 + t, g1, z0 + t, x1 - t, g1 + 0.05, z1 - t, { faces: 'b', ao: false, room, tint: [0.62, 0.56, 0.5] });
    const alongX = W >= D;
    if (alongX) for (let x = x0 + 1.1; x < x1 - 0.6; x += 1.7) wb.box('timber', x - 0.1, g1 - 0.22, z0 + t, x + 0.1, g1, z1 - t, { ao: false, room, faces: 'nsewb' });
    else for (let z = z0 + 1.1; z < z1 - 0.6; z += 1.7) wb.box('timber', x0 + t, g1 - 0.22, z - 0.1, x1 - t, g1, z + 0.1, { ao: false, room, faces: 'nsewb' });
    ctx.col.add(x0, g1, z0, x1, h + 0.2, z1).cam = true;
    // la cámara se queda por debajo de las vigas (antes se metía entre ellas
    // y las atravesaba al andar); no estorba a nadie más
    ctx.col.addCam(x0 + t, g1 - 0.27, z0 + t, x1 - t, g1, z1 - t);
    // tabiques interiores con pasos
    for (const iw of s.walls ?? []) partition(ctx, iw, g1, room, s.partMat ?? (lowerMat === 'plaster' ? 'plaster' : 'wallstone'), lt);
    // transitable: toda la huella (los muros tienen su propia colisión)
    if (ctx.S && s.paint !== false) {
      ctx.S.paint(x0 + 0.01, z0 + 0.01, x1 - 0.01, z1 - 0.01, 1);
      for (const sd of ['n', 's', 'e', 'w'])
        for (const d of doorsBySide[sd]) {
          const [cx, cz] = sidePoint(sd, x0, z0, x1, z1, d.at);
          const hw = d.w / 2;
          if (sd === 'n' || sd === 's') ctx.S.paint(cx - hw, cz - 0.8, cx + hw, cz + 0.8, 1);
          else ctx.S.paint(cx - 0.8, cz - hw, cx + 0.8, cz + hw, 1);
        }
    }
  } else {
    // zócalo (7 cm corto por el lado de una casa vecina ya construida). En la
    // fachada de la puerta va aparte y se interrumpe en el hueco: entero,
    // quedaba 7 cm por delante de la hoja y tapaba sus 65 cm de abajo, y las
    // puertas parecían ventanas con alféizar
    const zo = (b) => (b ? -0.07 : 0.07);
    const hasDoor = s.door !== false && zo(nb[front]) > 0;
    const ex = { n: zo(nb.n), s: zo(nb.s), e: zo(nb.e), w: zo(nb.w) };
    if (hasDoor) ex[front] = 0;
    wb.box('wallstone', x0 - ex.w, 0, z0 - ex.n, x1 + ex.e, 0.65, z1 + ex.s, { sub: 2, aoH: 0.6, faces: 'tnsew' });
    if (hasDoor) {
      const [tx, tz, rot, L] = sideFrame(front, x0, z0, x1, z1);
      const ends = { s: ['w', 'e'], n: ['e', 'w'], e: ['s', 'n'], w: ['n', 's'] }[front];
      const a0 = -zo(nb[ends[0]]),
        a1 = L + zo(nb[ends[1]]);
      const da = s.doorAt ?? L / 2;
      wb.at(tx, 0, tz, rot, () => {
        // (los extremos del hueco quedan dentro de las jambas)
        wb.box('wallstone', a0, 0, 0, da - 0.8, 0.65, 0.07, { sub: 2, aoH: 0.6, faces: 'tsw' });
        wb.box('wallstone', da + 0.8, 0, 0, a1, 0.65, 0.07, { sub: 2, aoH: 0.6, faces: 'tse' });
      });
    }
    wb.box(lowerMat, x0, 0.65, z0, x1, g1, z1, { sub: 1.6, tint: lt, aoH: 1.2, faces: 'nsew' });
  }
  // planta alta (voladizo hacia la fachada principal)
  let ux0 = x0,
    ux1 = x1,
    uz0 = z0,
    uz1 = z1;
  if (jetty) {
    if (front === 's') uz1 += jetty;
    if (front === 'n') uz0 -= jetty;
    if (front === 'e') ux1 += jetty;
    if (front === 'w') ux0 -= jetty;
  }
  const burnTint = burned ? [0.35, 0.3, 0.28] : null;
  wb.box(upperMat, ux0, g1, uz0, ux1, h, uz1, {
    sub: 1.6,
    tint: burnTint || (upperMat === 'plaster' ? tint : null),
    ao: false,
    faces: jetty && !hollow ? 'nsewb' : 'nsew',
    mats: { b: 'wooddark' },
    room: 'out',
  });
  // en las visitables sólo se ve por debajo la franja del voladizo
  if (jetty && hollow) {
    const jb = { n: [ux0, uz0, ux1, z0], s: [ux0, z1, ux1, uz1], e: [x1, uz0, ux1, uz1], w: [ux0, uz0, x0, uz1] }[front];
    wb.box('wooddark', jb[0], g1, jb[1], jb[2], g1 + 0.05, jb[3], { faces: 'b', ao: false, room: 'out' });
  }
  // viga de forjado
  wb.box('timber', ux0 - 0.05, g1 - 0.05, uz0 - 0.05, ux1 + 0.05, g1 + 0.22, uz1 + 0.05, { ao: false, sub: 3, room: 'out' });
  // canes del voladizo (o soportal: la planta alta descansa en columnas)
  if (jetty && s.arcade) {
    const [tx, tz, rot, L] = sideFrame(front, x0, z0, x1, z1);
    const n = Math.max(2, Math.round(L / 2.8));
    wb.at(tx, 0, tz, rot, () => {
      for (let i = 0; i <= n; i++) {
        const a = 0.25 + (i / n) * (L - 0.5);
        wb.box('ashlar', a - 0.3, 0, jetty - 0.55, a + 0.3, 0.3, jetty + 0.05, { sub: 2, aoH: 0.3, room: 'out' });
        wb.cylinder('ashlar', a, 0.3, jetty - 0.25, 0.2, 0.18, g1 - 0.62, 8, { ao: false, room: 'out' });
        wb.box('ashlar', a - 0.32, g1 - 0.32, jetty - 0.57, a + 0.32, g1 - 0.02, jetty + 0.07, { ao: false, room: 'out', faces: 'nsewb' });
      }
      // viga de carga sobre las columnas y zapatas
      wb.box('timber', -0.05, g1 - 0.02, jetty - 0.4, L + 0.05, g1 + 0.02, jetty - 0.1, { ao: false, room: 'out', faces: 'nsewb' });
    });
    for (let i = 0; i <= n; i++) {
      const a = 0.25 + (i / n) * (L - 0.5);
      const [cx, cz] = sidePoint(front, x0, z0, x1, z1, a);
      const o = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] }[front];
      const px = cx + o[0] * (jetty - 0.25),
        pz = cz + o[1] * (jetty - 0.25);
      ctx.col.add(px - 0.22, 0, pz - 0.22, px + 0.22, g1, pz + 0.22);
    }
    // la planta alta que vuela sobre el soportal frena la cámara
    const jb = { n: [ux0, uz0, ux1, z0], s: [ux0, z1, ux1, uz1], e: [x1, uz0, ux1, uz1], w: [ux0, uz0, x0, uz1] }[front];
    addCam(ctx.col, jb[0], g1, jb[1], jb[2], h, jb[3]);
    if (ctx.S) ctx.S.paint(jb[0], jb[1], jb[2], jb[3], 1);
  } else if (jetty) {
    const [tx, tz, rot, L] = sideFrame(front, x0, z0, x1, z1);
    wb.at(tx, 0, tz, rot, () => {
      for (let a = 0.4; a < L - 0.2; a += 0.7) wb.box('timber', a - 0.08, g1 - 0.25, 0, a + 0.08, g1, jetty + 0.05, { ao: false, room: 'out', faces: 'tsewb' });
    });
  }

  // fachadas
  const prevRoom = wb.room;
  wb.setRoom(null);
  for (const side of sides) {
    const [tx, tz, rot, L] = sideFrame(side, ux0, uz0, ux1, uz1);
    const [ltx, ltz, , LL] = sideFrame(side, x0, z0, x1, z1);
    // entramado planta alta
    wb.at(tx, 0, tz, rot, () => {
      if (style === 'timber') {
        const n = Math.max(2, Math.round(L / 1.5));
        for (let i = 0; i <= n; i++) {
          const a = 0.1 + (i / n) * (L - 0.2);
          wb.box('timber', a - 0.1, g1 + 0.2, 0, a + 0.1, h, 0.07, { ao: false, sub: 3 });
        }
        wb.box('timber', 0, h - 0.2, 0, L, h, 0.08, { ao: false, sub: 3 });
        // la carrera intermedia, algo por detrás de pies derechos y tornapuntas
        // (a la misma profundidad, cada cruce parpadeaba)
        wb.box('timber', 0, g1 + 1.0, 0, L, g1 + 1.16, 0.055, { ao: false, sub: 3 });
        // tornapuntas en aspa
        for (let i = 0; i < n; i++) {
          if (rng.chance(0.45)) continue;
          const a0 = 0.1 + (i / n) * (L - 0.2),
            a1 = 0.1 + ((i + 1) / n) * (L - 0.2);
          const cx = (a0 + a1) / 2,
            cy = (g1 + 1.16 + h - 0.2) / 2;
          const dw = a1 - a0,
            dh = h - 0.2 - (g1 + 1.16);
          const len = Math.hypot(dw, dh);
          const ang = Math.atan2(dh, dw) * (rng.chance(0.5) ? 1 : -1);
          wb.push();
          wb.translate(cx, cy, 0.035);
          wb.rotateZ(ang);
          wb.box('timber', -len / 2, -0.07, -0.03, len / 2, 0.07, 0.03, { ao: false, sub: 4 });
          wb.pop();
        }
      }
      // ventanas planta alta
      if (L > 2.2 && s.windows !== false) {
        const n = Math.max(1, Math.floor(L / 2.6));
        for (let i = 0; i < n; i++) {
          const a = ((i + 0.5) / n) * L;
          const lit = !!s.lit && rng.chance(s.litChance ?? 0.35);
          windowAt(ctx, a + rng.range(-0.2, 0.2), g1 + 0.9, 0.7, 1.05, { lit }, rng);
        }
      }
    });
    // planta baja: puerta y ventanas
    wb.at(ltx, 0, ltz, rot, () => {
      const ds = doorsBySide[side];
      if (hollow) {
        // ventanas ciegas lejos de las puertas
        if (LL > 3.4 && s.windows !== false && s.lowerWindows !== false) {
          const cand = [LL * 0.25, LL * 0.75];
          for (const a of cand) if (ds.every((d) => Math.abs(d.at - a) > d.w / 2 + 0.9) && rng.chance(0.7)) windowAt(ctx, a, 1.25, 0.6, 0.8, { lit: !!s.lit && rng.chance(0.5) }, rng);
        }
      } else if (side === front && s.door !== false) {
        const da = s.doorAt ?? LL / 2;
        // puertas cerradas; algunas clavadas o atrancadas por fuera (dado
        // aparte para no cambiar el resto de la casa)
        const dr = new RNG((s.seed ?? hashSeed(x0, z0, x1, z1)) ^ 0x5bd1e995).next();
        doorAt(ctx, da, 1.3, 2.3, { boards: s.boards ?? dr < 0.2, bar: s.boards === undefined && dr >= 0.2 && dr < 0.3, open: s.doorOpen });
        if (LL > 5) windowAt(ctx, da > LL / 2 ? da - 2.2 : da + 2.2, 1.2, 0.6, 0.8, { lit: false }, rng);
      } else if (LL > 3 && s.windows !== false && rng.chance(0.5)) {
        windowAt(ctx, LL * rng.range(0.3, 0.7), 1.3, 0.6, 0.8, { lit: false }, rng);
      }
    });
  }
  wb.room = prevRoom;

  // tejado
  const axis = s.roofAxis ?? (ux1 - ux0 >= uz1 - uz0 ? 'x' : 'z');
  const half = axis === 'x' ? (uz1 - uz0) / 2 : (ux1 - ux0) / 2;
  const ridge = h + half * (s.pitch ?? 0.55);
  // un tejado que se puede venir abajo (los golpes del jefe final): entero en
  // el grupo 'wreck:<id>', hundido en 'wreck:<id>:ruin' (ver finale/wrecks.js)
  const wreck = s.wreck && ctx.beginGroup && !s.noRoof && !burned ? s.wreck : null;
  if (wreck) {
    (ctx.wrecks || (ctx.wrecks = [])).push({ id: wreck, kind: 'roof', box: [ux0 - 0.3, h - 0.6, uz0 - 0.3, ux1 + 0.3, ridge + 0.4, uz1 + 0.3], front });
    ctx.beginGroup('wreck:' + wreck);
  }
  if (!s.noRoof) {
    if (burned && rng.chance(0.6)) {
      // tejado hundido: sólo vigas quemadas
      const n = Math.floor((axis === 'x' ? W : D) / 1.2);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        if (axis === 'x') {
          const x = ux0 + t * (ux1 - ux0);
          wb.box('wooddark', x - 0.1, h, uz0, x + 0.1, h + 0.2, uz1, { ao: false, tint: [0.3, 0.25, 0.22] });
        } else {
          const z = uz0 + t * (uz1 - uz0);
          wb.box('wooddark', ux0, h, z - 0.1, ux1, h + 0.2, z + 0.1, { ao: false, tint: [0.3, 0.25, 0.22] });
        }
      }
      // techo de la última planta, ennegrecido, para no ver el vacío desde arriba
      wb.box('wooddark', ux0, h - 0.05, uz0, ux1, h, uz1, { faces: 't', ao: false, tint: [0.22, 0.19, 0.17] });
      if (ctx.fires && rng.chance(0.8)) ctx.fires.push({ x: (ux0 + ux1) / 2, y: h + 0.2, z: (uz0 + uz1) / 2, s: 2.2, light: true, smoke: true });
    } else {
      wb.gableRoof(ux0, uz0, ux1, uz1, h, ridge, axis, { wallMat: upperMat === 'plaster' ? 'plaster' : 'wallstone' });
      // la cámara no atraviesa el tejado: tres rebanadas escalonadas
      if (s.roofCol !== false) {
        const nS = 3;
        for (let i = 0; i < nS; i++) {
          const ya = h + ((ridge - h) * i) / nS,
            yb = h + ((ridge - h) * (i + 1)) / nS;
          const k = 1 - (i + 0.5) / nS;
          if (axis === 'x') {
            const zc = (uz0 + uz1) / 2,
              hw = ((uz1 - uz0) / 2) * k;
            addCam(ctx.col, ux0, ya, zc - hw, ux1, yb, zc + hw);
          } else {
            const xc = (ux0 + ux1) / 2,
              hw = ((ux1 - ux0) / 2) * k;
            addCam(ctx.col, xc - hw, ya, uz0, xc + hw, yb, uz1);
          }
        }
      }
    }
    // chimenea
    if (s.chimney ?? rng.chance(0.5)) {
      const cx = s.chimneyAt ? s.chimneyAt[0] : rng.range(ux0 + 1, ux1 - 1),
        cz = s.chimneyAt ? s.chimneyAt[1] : rng.range(uz0 + 1, uz1 - 1);
      const cs = s.chimneySize ?? 0.4;
      wb.box('wallstone', cx - cs, h, cz - cs, cx + cs, ridge + 1.0, cz + cs, { ao: false, sub: 2 });
      wb.box('wallstone', cx - cs - 0.1, ridge + 1.0, cz - cs - 0.1, cx + cs + 0.1, ridge + 1.2, cz + cs + 0.1, { ao: false });
      if (s.smoke && ctx.fires) ctx.fires.push({ x: cx, y: ridge + 1.3, z: cz, s: 0.9, smoke: true, light: false, embers: s.smoke === 'embers', glow: false });
    }
  }
  if (wreck) {
    ctx.endGroup();
    ctx.beginGroup('wreck:' + wreck + ':ruin');
    wreckedRoof(ctx, { ux0, uz0, ux1, uz1, h, ridge, axis, front, upperMat, rng: new RNG(hashSeed(x0, z0, 77)) });
    ctx.endGroup();
  }
  return { h, ridge, g1 };
}

// El tejado hundido de una casa (golpes del jefe final): la mitad del
// faldón que queda en pie, las vigas partidas y colgando, el techo de la
// planta alta y, en la calle, delante de la fachada, el montón de tejas y
// cascotes (con su colisión).
function wreckedRoof(ctx, o) {
  const wb = ctx.wb;
  const { ux0, uz0, ux1, uz1, h, ridge, axis, front, rng } = o;
  const T = [0.62, 0.56, 0.5];
  // queda en pie un tercio del tejado, por un extremo
  const keep = rng.range(0.28, 0.4);
  const end = rng.chance(0.5);
  if (axis === 'x') {
    const a = end ? ux0 : ux1 - (ux1 - ux0) * keep,
      b = end ? ux0 + (ux1 - ux0) * keep : ux1;
    wb.gableRoof(a, uz0, b, uz1, h, ridge, axis, { wallMat: o.upperMat === 'plaster' ? 'plaster' : 'wallstone' });
  } else {
    const a = end ? uz0 : uz1 - (uz1 - uz0) * keep,
      b = end ? uz0 + (uz1 - uz0) * keep : uz1;
    wb.gableRoof(ux0, a, ux1, b, h, ridge, axis, { wallMat: o.upperMat === 'plaster' ? 'plaster' : 'wallstone' });
  }
  // el techo de la planta alta (no se ve el vacío desde arriba)
  wb.box('wooddark', ux0, h - 0.05, uz0, ux1, h, uz1, { faces: 't', ao: false, tint: [0.3, 0.27, 0.24] });
  // vigas: la cumbrera partida y los pares, unos en su sitio, otros colgando
  const L = axis === 'x' ? ux1 - ux0 : uz1 - uz0;
  const n = Math.max(3, Math.floor(L / 1.1));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (end ? t < keep : t > 1 - keep) continue;
    if (rng.chance(0.35)) continue;
    const along = axis === 'x' ? ux0 + t * (ux1 - ux0) : uz0 + t * (uz1 - uz0);
    const drop = rng.chance(0.5) ? rng.range(0.4, 1.2) : 0;
    const len = (axis === 'x' ? uz1 - uz0 : ux1 - ux0) / 2 + 0.2;
    for (const sg of [-1, 1]) {
      if (rng.chance(0.3)) continue;
      const l = len * rng.range(0.4, 1);
      const ang = Math.atan2(ridge - h, len) * (drop ? 0.3 : 1);
      wb.push();
      if (axis === 'x') {
        wb.translate(along, h + 0.1, (uz0 + uz1) / 2 + sg * (len - l / 2) * Math.cos(ang));
        wb.rotateX(sg * ang - (drop ? sg * 0.2 : 0));
        wb.box('timber', -0.07, -0.07, -l / 2, 0.07, 0.07, l / 2, { ao: false, tint: T });
      } else {
        wb.translate((ux0 + ux1) / 2 + sg * (len - l / 2) * Math.cos(ang), h + 0.1, along);
        wb.rotateZ(-sg * ang + (drop ? sg * 0.2 : 0));
        wb.box('timber', -l / 2, -0.07, -0.07, l / 2, 0.07, 0.07, { ao: false, tint: T });
      }
      wb.pop();
    }
  }
  // en la calle, delante de la fachada: el montón de tejas y cascotes
  const cx = (ux0 + ux1) / 2,
    cz = (uz0 + uz1) / 2;
  const off = 1.4;
  const [px, pz, wx, wz] =
    front === 'n' ? [cx, uz0 - off, (ux1 - ux0) * 0.32, 1.0] : front === 's' ? [cx, uz1 + off, (ux1 - ux0) * 0.32, 1.0] : front === 'e' ? [ux1 + off, cz, 1.0, (uz1 - uz0) * 0.32] : [ux0 - off, cz, 1.0, (uz1 - uz0) * 0.32];
  for (let i = 0; i < 26; i++) {
    const x = px + rng.range(-wx, wx),
      z = pz + rng.range(-wz, wz);
    const sz = rng.range(0.25, 0.6);
    wb.push();
    wb.translate(x, sz * 0.25, z);
    wb.rotateY(rng.range(0, Math.PI));
    wb.rotateX(rng.range(-0.4, 0.4));
    wb.box(i % 3 ? 'roof' : 'wallstone', -sz, -sz * 0.25, -sz * 0.6, sz, sz * 0.25, sz * 0.6, { ao: false, tint: i % 3 ? [0.8, 0.7, 0.66] : [0.7, 0.66, 0.62] });
    wb.pop();
  }
  for (let i = 0; i < 3; i++) {
    const x = px + rng.range(-wx, wx) * 0.8,
      z = pz + rng.range(-wz, wz) * 0.8;
    const l = rng.range(1.6, 2.6),
      a = rng.range(0, Math.PI);
    wb.push();
    wb.translate(x, 0.16, z);
    wb.rotateY(a);
    wb.rotateZ(rng.range(-0.15, 0.15));
    wb.box('timber', -l / 2, -0.08, -0.08, l / 2, 0.08, 0.08, { ao: false, tint: T });
    wb.pop();
  }
  ctx.col.add(px - wx * 0.8, 0, pz - wz * 0.8, px + wx * 0.8, 0.5, pz + wz * 0.8);
}

// Rectángulo [x0, z0, x1, z1] menos una lista de huecos: rectángulos que lo cubren.
export function subtractRects(r, holes) {
  let out = [r];
  for (const h of holes) {
    const next = [];
    for (const [a, b, c, d] of out) {
      if (h[0] >= c || h[2] <= a || h[1] >= d || h[3] <= b) {
        next.push([a, b, c, d]);
        continue;
      }
      if (h[1] > b) next.push([a, b, c, h[1]]);
      if (h[3] < d) next.push([a, h[3], c, d]);
      const zb = Math.max(b, h[1]),
        zd = Math.min(d, h[3]);
      if (h[0] > a) next.push([a, zb, h[0], zd]);
      if (h[2] < c) next.push([h[2], zb, c, zd]);
    }
    out = next;
  }
  return out;
}

// Caja de colisión sólo para la cámara (tejados).
function addCam(col, a, b, c, d, e, f) {
  const box = col.add(a, b, c, d, e, f);
  box.cam = true;
  box.noSight = true;
  return box;
}

// Punto mundo de la fachada 'side' a la distancia 'at' de su origen local.
function sidePoint(side, x0, z0, x1, z1, at) {
  if (side === 's') return [x0 + at, z1];
  if (side === 'n') return [x1 - at, z0];
  if (side === 'e') return [x1, z1 - at];
  return [x0, z0 + at];
}

// Caja de colisión de un tramo de muro de la fachada (entre a0 y a1, grosor t hacia dentro).
function addSideBox(col, side, x0, z0, x1, z1, a0, a1, t, yb, yt) {
  if (a1 - a0 < 0.01) return;
  if (side === 's') return col.add(x0 + a0, yb, z1 - t, x0 + a1, yt, z1);
  if (side === 'n') return col.add(x1 - a1, yb, z0, x1 - a0, yt, z0 + t);
  if (side === 'e') return col.add(x1 - t, yb, z1 - a1, x1, yt, z1 - a0);
  return col.add(x0, yb, z0 + a0, x0 + t, yt, z0 + a1);
}

// Tabique interior (dos caras dentro de la habitación) con pasos.
export function partition(ctx, iw, g1, room, mat = 'plaster', tint = null) {
  const wb = ctx.wb;
  const alongX = iw.x1 - iw.x0 >= iw.z1 - iw.z0;
  const a0 = alongX ? iw.x0 : iw.z0,
    a1 = alongX ? iw.x1 : iw.z1;
  const tn = tint ? tint.map((v) => v * 0.9) : [0.82, 0.78, 0.72];
  const piece = (u0, u1, yb, yt) => {
    if (u1 - u0 < 0.01) return;
    const b = alongX ? [u0, yb, iw.z0, u1, yt, iw.z1] : [iw.x0, yb, u0, iw.x1, yt, u1];
    wb.box(mat, ...b, { sub: 1.6, tint: tn, aoH: 1.2, room, faces: 'nsew' + (yb > 0 ? 'b' : ''), baseY: 0 });
    ctx.col.add(...b);
  };
  const ds = [...(iw.doors ?? [])].sort((a, b) => a.at - b.at);
  let cur = a0;
  for (const d of ds) {
    const a = d.at - d.w / 2,
      b = d.at + d.w / 2;
    piece(cur, a, 0, g1);
    piece(a, b, d.h ?? 2.3, g1);
    // marco de madera del paso: asoma 6 mm hacia dentro del hueco para cubrir
    // los cantos del tabique (en su mismo plano parpadeaban)
    const fr = (u0, u1, yb, yt) => {
      const bb = alongX ? [u0, yb, iw.z0 - 0.04, u1, yt, iw.z1 + 0.04] : [iw.x0 - 0.04, yb, u0, iw.x1 + 0.04, yt, u1];
      wb.box('wooddark', ...bb, { ao: false, room, faces: yb > 0 ? 'tnsewb' : 'tnsew' });
    };
    const dh = d.h ?? 2.3;
    fr(a - 0.1, a + 0.006, 0, dh - 0.006);
    fr(b - 0.006, b + 0.1, 0, dh - 0.006);
    fr(a - 0.1, b + 0.1, dh - 0.006, dh + 0.12);
    cur = b;
  }
  piece(cur, a1, 0, g1);
}

// Pasadizo: una estancia de entramado que cruza por encima de un callejón
// entre dos casas (x0..x1, z0..z1 = hueco que cubre; y0 = altura libre).
// axis: dirección del callejón ('x' | 'z'); sus dos caras abiertas miran a lo
// largo del callejón.
export function overpass(ctx, x0, z0, x1, z1, y0, y1, axis, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(hashSeed(x0, z0, x1, z1));
  const mat = o.mat ?? 'plaster';
  const tint = o.tint ?? rng.pick(PLASTER_TINTS);
  // cuerpo: sólo las caras que se ven desde el callejón, techo del paso y remate
  wb.box(mat, x0, y0, z0, x1, y1, z1, { faces: axis === 'x' ? 'ew' : 'ns', ao: false, sub: 1.6, tint });
  wb.box('wooddark', x0, y0 - 0.05, z0, x1, y0, z1, { faces: 'b', ao: false, tint: [0.55, 0.5, 0.46] });
  // vigas bajo el paso y ménsulas en los arranques
  const L = axis === 'x' ? x1 - x0 : z1 - z0;
  const n = Math.max(2, Math.round(L / 0.8));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (axis === 'x') {
      const x = x0 + 0.1 + t * (x1 - x0 - 0.2);
      wb.box('timber', x - 0.08, y0 - 0.22, z0, x + 0.08, y0 - 0.05, z1, { ao: false, faces: 'nsewb' });
    } else {
      const z = z0 + 0.1 + t * (z1 - z0 - 0.2);
      wb.box('timber', x0, y0 - 0.22, z - 0.08, x1, y0 - 0.05, z + 0.08, { ao: false, faces: 'nsewb' });
    }
  }
  // entramado y ventanas en las dos caras abiertas
  for (const sd of axis === 'x' ? ['e', 'w'] : ['n', 's']) {
    const [tx, tz, rot, LL] = sideFrame(sd, x0, z0, x1, z1);
    wb.at(tx, 0, tz, rot, () => {
      wb.box('timber', 0, y0, 0, LL, y0 + 0.18, 0.08, { ao: false });
      wb.box('timber', 0, y1 - 0.18, 0, LL, y1, 0.08, { ao: false });
      for (const a of [0.1, LL / 2, LL - 0.1]) wb.box('timber', a - 0.09, y0, 0, a + 0.09, y1, 0.07, { ao: false });
      if (LL > 1.6) windowAt(ctx, LL * 0.3, y0 + 0.9, 0.55, 0.8, { lit: !!o.lit && rng.chance(0.6) }, rng);
      if (LL > 2.6) windowAt(ctx, LL * 0.72, y0 + 0.9, 0.55, 0.8, { lit: false }, rng);
    });
  }
  // cubierta a dos aguas atravesada al callejón
  const ov = 0.35;
  if (axis === 'x') wb.gableRoof(x0 - ov, z0, x1 + ov, z1, y1, y1 + (x1 - x0) * 0.35, 'z', { wallMat: mat, overhang: 0.25 });
  else wb.gableRoof(x0, z0 - ov, x1, z1 + ov, y1, y1 + (z1 - z0) * 0.35, 'x', { wallMat: mat, overhang: 0.25 });
  addCam(ctx.col, x0, y0 - 0.25, z0, x1, y1 + 1.2, z1);
}

// Muro de mampostería sencillo (tapias, muros de patio).
export function stoneWall(ctx, x0, z0, x1, z1, h, o = {}) {
  solid(ctx, o.mat ?? 'wallstone', x0, 0, z0, x1, h, z1, { sub: 2, aoH: 1.6, mats: { t: o.topMat ?? 'wallstone' } });
  if (o.cap !== false) ctx.wb.box('ashlar', x0 - 0.08, h, z0 - 0.08, x1 + 0.08, h + 0.2, z1 + 0.08, { ao: false, sub: 3 });
}
