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

function doorAt(ctx, x, w, h, o = {}) {
  const wb = ctx.wb;
  // jambas y dintel de piedra (el dintel descansa sobre las jambas y vuela
  // 2 cm por los lados: con las piezas solapadas, las esquinas parpadeaban)
  wb.box('ashlar', x - w / 2 - 0.3, 0, 0, x - w / 2, h, 0.16, { sub: 2 });
  wb.box('ashlar', x + w / 2, 0, 0, x + w / 2 + 0.3, h, 0.16, { sub: 2 });
  wb.box('ashlar', x - w / 2 - 0.32, h, 0, x + w / 2 + 0.32, h + 0.35, 0.18, { sub: 2, baseY: 0 });
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
// Casa visitable (hollow): muros de la planta baja con huecos de puerta en
// cualquier fachada (doors), tabiques interiores con pasos (walls), suelo,
// techo con vigas y colisión exacta; el techo y el tejado frenan la cámara.
//   doors: [{ side:'n'|'s'|'e'|'w', at (a lo largo de la fachada, como doorAt)
//             | x/z (coordenada mundo), w, h }]
//   walls: [{ x0, z0, x1, z1, doors: [{ at (coordenada mundo a lo largo), w, h }] }]
export function house(ctx, s) {
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
  prevHouses.push({ x0, z0, x1, z1, front, jetty, hollow, seed: s.seed });

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
    // suelo, techo con vigas y su colisión (la cámara no sube a la planta alta)
    wb.box(s.floorMat ?? 'planks', x0 + t - 0.01, -0.05, z0 + t - 0.01, x1 - t + 0.01, 0.02, z1 - t + 0.01, { faces: 't', ao: false, room, uv: 0.5, tint: s.floorTint });
    wb.box('wooddark', x0 + t, g1, z0 + t, x1 - t, g1 + 0.05, z1 - t, { faces: 'b', ao: false, room, tint: [0.62, 0.56, 0.5] });
    const alongX = W >= D;
    if (alongX) for (let x = x0 + 1.1; x < x1 - 0.6; x += 1.7) wb.box('timber', x - 0.1, g1 - 0.22, z0 + t, x + 0.1, g1, z1 - t, { ao: false, room, faces: 'nsewb' });
    else for (let z = z0 + 1.1; z < z1 - 0.6; z += 1.7) wb.box('timber', x0 + t, g1 - 0.22, z - 0.1, x1 - t, g1, z + 0.1, { ao: false, room, faces: 'nsewb' });
    ctx.col.add(x0, g1, z0, x1, h + 0.2, z1).cam = true;
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
    // zócalo (7 cm corto por el lado de una casa vecina ya construida)
    const zo = (b) => (b ? -0.07 : 0.07);
    wb.box('wallstone', x0 - zo(nb.w), 0, z0 - zo(nb.n), x1 + zo(nb.e), 0.65, z1 + zo(nb.s), { sub: 2, aoH: 0.6, faces: 'tnsew' });
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
        doorAt(ctx, da, 1.3, 2.3, { boards: s.boards, open: s.doorOpen });
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
  return { h, ridge, g1 };
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
