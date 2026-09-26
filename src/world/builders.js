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
  solid(ctx, mat, x0, 0, z0, x1, h, z1, { sub: 2.2, aoH: 3, faces: 'tnsew', collide: o.collide, mats: { t: 'flag' } });
  // cornisa
  ctx.wb.box(mat, x0 - 0.3, h - 0.5, z0 - 0.3, x1 + 0.3, h, z1 + 0.3, { ao: false, sub: 3 });
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
    if (axisZ) {
      ctx.wb.box(mat, t0, y0, u0, t1, y1, u1, { sub: 2, aoH: 2 });
      if (col) ctx.col.add(t0, y0, u0, t1, y1, u1);
    } else {
      ctx.wb.box(mat, u0, y0, t0, u1, y1, t1, { sub: 2, aoH: 2 });
      if (col) ctx.col.add(u0, y0, t0, u1, y1, t1);
    }
  };
  const l = c - w / 2,
    r = c + w / 2;
  if (l > a0) put(a0, 0, l, h);
  if (a1 > r) put(r, 0, a1, h);
  // tímpano sobre el arco: rebanadas siguiendo el semicírculo
  const R = w / 2;
  const spring = ah - R;
  const N = o.slices ?? 8;
  for (let i = 0; i < N; i++) {
    const u0 = l + (i / N) * w,
      u1 = l + ((i + 1) / N) * w;
    const um = (u0 + u1) / 2 - c;
    const yy = spring + Math.sqrt(Math.max(0, R * R - um * um));
    put(u0, yy, u1, h, false);
  }
  // colisión del dintel
  if (axisZ) ctx.col.add(t0, spring + R * 0.6, l, t1, h, r);
  else ctx.col.add(l, spring + R * 0.6, t0, r, h, t1);
  // dovelas marcadas
  if (o.voussoirs !== false) {
    const vm = o.vmat ?? 'ashlar';
    for (let i = 0; i <= N; i++) {
      const ang = Math.PI - (i / N) * Math.PI;
      const px = c + Math.cos(ang) * (R + 0.18),
        py = spring + Math.sin(ang) * (R + 0.18);
      const s = 0.2;
      if (axisZ) ctx.wb.box(vm, t0 - 0.06, py - s, px - s, t1 + 0.06, py + s, px + s, { ao: false, sub: 2 });
      else ctx.wb.box(vm, px - s, py - s, t0 - 0.06, px + s, py + s, t1 + 0.06, { ao: false, sub: 2 });
    }
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
function windowAt(ctx, x, y, w, h, o, rng) {
  const wb = ctx.wb;
  const lit = o.lit;
  wb.box(lit ? 'ember' : 'black', x - w / 2, y, 0, x + w / 2, y + h, 0.03, { ao: false, grime: false, faces: 's' });
  // marco
  const fm = o.frameMat ?? 'timber';
  wb.box(fm, x - w / 2 - 0.1, y - 0.12, 0, x + w / 2 + 0.1, y, 0.12, { ao: false, sub: 3 });
  wb.box(fm, x - w / 2 - 0.1, y + h, 0, x + w / 2 + 0.1, y + h + 0.1, 0.1, { ao: false, sub: 3 });
  wb.box(fm, x - w / 2 - 0.1, y, 0, x - w / 2, y + h, 0.08, { ao: false, sub: 3 });
  wb.box(fm, x + w / 2, y, 0, x + w / 2 + 0.1, y + h, 0.08, { ao: false, sub: 3 });
  const kind = rng.next();
  if (kind < 0.3) {
    // contraventanas cerradas (tablas)
    wb.box('planks', x - w / 2, y, 0.02, x + w / 2, y + h, 0.07, { ao: false, sub: 3 });
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

function doorAt(ctx, x, w, h, o = {}) {
  const wb = ctx.wb;
  // jambas y dintel de piedra
  wb.box('ashlar', x - w / 2 - 0.3, 0, 0, x - w / 2, h + 0.3, 0.16, { sub: 2 });
  wb.box('ashlar', x + w / 2, 0, 0, x + w / 2 + 0.3, h + 0.3, 0.16, { sub: 2 });
  wb.box('ashlar', x - w / 2 - 0.3, h, 0, x + w / 2 + 0.3, h + 0.35, 0.18, { sub: 2 });
  if (o.frameOnly) return;
  if (o.open) {
    wb.box('black', x - w / 2, 0, 0, x + w / 2, h, 0.02, { ao: false, grime: false, faces: 's' });
    return;
  }
  wb.box(o.mat ?? 'planks', x - w / 2, 0, 0, x + w / 2, h, 0.06, { sub: 3, aoH: 0.6 });
  for (const yy of [0.4, h - 0.5]) wb.box('iron', x - w / 2, yy, 0.06, x + w / 2 - 0.1, yy + 0.08, 0.09, { ao: false });
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
export function house(ctx, s) {
  const wb = ctx.wb;
  const { x0, z0, x1, z1 } = s;
  const rng = new RNG(s.seed ?? hashSeed(x0, z0, x1, z1));
  const W = x1 - x0,
    D = z1 - z0;
  const h = s.h ?? rng.range(5.6, 8.4);
  const g1 = 3.1; // altura planta baja
  const style = s.style ?? rng.pick(['plaster', 'timber', 'timber', 'stone']);
  const tint = s.tint ?? rng.pick(PLASTER_TINTS);
  const front = s.front ?? 's';
  const sides = s.sides ?? ['n', 's', 'e', 'w'];
  const upperMat = style === 'stone' ? 'wallstone' : 'plaster';
  const lowerMat = style === 'plaster' ? 'plaster' : 'wallstone';
  const jetty = s.jetty ?? (style !== 'stone' && h > 6 && rng.chance(0.7) ? 0.5 : 0);
  const burned = s.burned;

  // colisión del volumen
  if (s.collide !== false) ctx.col.add(x0, 0, z0, x1, h, z1);

  // zócalo
  wb.box('wallstone', x0 - 0.07, 0, z0 - 0.07, x1 + 0.07, 0.65, z1 + 0.07, { sub: 2, aoH: 0.6, faces: 'tnsew' });
  // planta baja (maciza, o hueca con hueco de puerta si es visitable)
  if (s.hollow) {
    const t = 0.35;
    const [ftx, ftz, frot, FL] = sideFrame(front, x0, z0, x1, z1);
    const da = s.doorAt ?? FL / 2;
    const lt = lowerMat === 'plaster' ? tint : null;
    for (const sd of ['n', 's', 'e', 'w']) {
      const [tx, tz, rot, L] = sideFrame(sd, x0, z0, x1, z1);
      wb.at(tx, 0, tz, rot, () => {
        if (sd === front) {
          wb.box(lowerMat, 0, 0.65, -t, da - 0.65, g1, 0, { sub: 1.6, tint: lt, aoH: 1.2, faces: 'tnsew' });
          wb.box(lowerMat, da + 0.65, 0.65, -t, L, g1, 0, { sub: 1.6, tint: lt, aoH: 1.2, faces: 'tnsew' });
          wb.box(lowerMat, da - 0.65, 2.3, -t, da + 0.65, g1, 0, { sub: 1.6, tint: lt, ao: false, faces: 'nsb' });
        } else wb.box(lowerMat, 0, 0.65, -t, L, g1, 0, { sub: 1.6, tint: lt, aoH: 1.2, faces: 'nsew' });
      });
    }
    wb.box('planks', x0, -0.05, z0, x1, 0.02, z1, { faces: 't', ao: false, room: s.room, uv: 0.5 });
  } else wb.box(lowerMat, x0, 0.65, z0, x1, g1, z1, { sub: 1.6, tint: lowerMat === 'plaster' ? tint : null, aoH: 1.2, faces: 'nsew' });
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
    faces: jetty || s.hollow ? 'nsewb' : 'nsew',
    mats: s.hollow ? { b: 'wooddark' } : null,
  });
  // viga de forjado
  wb.box('timber', ux0 - 0.05, g1 - 0.05, uz0 - 0.05, ux1 + 0.05, g1 + 0.22, uz1 + 0.05, { ao: false, sub: 3 });
  // canes del voladizo
  if (jetty) {
    const [tx, tz, rot, L] = sideFrame(front, x0, z0, x1, z1);
    wb.at(tx, 0, tz, rot, () => {
      for (let a = 0.4; a < L - 0.2; a += 0.7) wb.box('timber', a - 0.08, g1 - 0.25, 0, a + 0.08, g1, jetty + 0.05, { ao: false });
    });
  }

  // fachadas
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
        wb.box('timber', 0, g1 + 1.0, 0, L, g1 + 1.16, 0.07, { ao: false, sub: 3 });
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
      if (side === front && s.door !== false) {
        const da = s.doorAt ?? LL / 2;
        doorAt(ctx, da, 1.3, 2.3, { boards: s.boards, open: s.doorOpen, frameOnly: s.hollow });
        if (LL > 5) windowAt(ctx, da > LL / 2 ? da - 2.2 : da + 2.2, 1.2, 0.6, 0.8, { lit: false }, rng);
      } else if (LL > 3 && s.windows !== false && rng.chance(0.5)) {
        windowAt(ctx, LL * rng.range(0.3, 0.7), 1.3, 0.6, 0.8, { lit: false }, rng);
      }
    });
  }

  // tejado
  const axis = s.roofAxis ?? (ux1 - ux0 >= uz1 - uz0 ? 'x' : 'z');
  const half = axis === 'x' ? (uz1 - uz0) / 2 : (ux1 - ux0) / 2;
  const ridge = h + half * (s.pitch ?? 0.55);
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
      if (ctx.fires && rng.chance(0.8)) ctx.fires.push({ x: (ux0 + ux1) / 2, y: h + 0.2, z: (uz0 + uz1) / 2, s: 2.2, light: true, smoke: true });
    } else {
      wb.gableRoof(ux0, uz0, ux1, uz1, h, ridge, axis, { wallMat: upperMat === 'plaster' ? 'plaster' : 'wallstone' });
    }
    // chimenea
    if (rng.chance(0.5)) {
      const cx = rng.range(ux0 + 1, ux1 - 1),
        cz = rng.range(uz0 + 1, uz1 - 1);
      wb.box('wallstone', cx - 0.4, h, cz - 0.4, cx + 0.4, ridge + 1.0, cz + 0.4, { ao: false, sub: 2 });
      wb.box('wallstone', cx - 0.5, ridge + 1.0, cz - 0.5, cx + 0.5, ridge + 1.2, cz + 0.5, { ao: false });
    }
  }
  return { h, ridge };
}

// Muro de mampostería sencillo (tapias, muros de patio).
export function stoneWall(ctx, x0, z0, x1, z1, h, o = {}) {
  solid(ctx, o.mat ?? 'wallstone', x0, 0, z0, x1, h, z1, { sub: 2, aoH: 1.6, mats: { t: o.topMat ?? 'wallstone' } });
  if (o.cap !== false) ctx.wb.box('ashlar', x0 - 0.08, h, z0 - 0.08, x1 + 0.08, h + 0.2, z1 + 0.08, { ao: false, sub: 3 });
}
