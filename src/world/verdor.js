// Lo que crece donde baja la luz (la cloaca: world/cloaca.js): helechos,
// hierba, flores blancas, musgo, la hiedra y las raíces que cuelgan, los
// juncos del agua y la higuera que busca el agujero. Todo horneado en el
// mundo; las hojas, por las dos caras (desde abajo también se ven).
// En local (las funciones ponen su propia transformación), metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import * as P from './props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Una hoja plana por sus dos caras: p0 la base, p1 la punta, w el ancho, n
// la normal de la hoja (aprox.); en rombo (o.lanza: más estrecha).
function hojaPlana(wb, mat, p0, p1, w, n, o) {
  const d = new THREE.Vector3().subVectors(p1, p0);
  const side = new THREE.Vector3().crossVectors(d, n).normalize().multiplyScalar(w / 2);
  const m0 = p0.clone().lerp(p1, o.at ?? 0.42).add(side),
    m1 = p0.clone().lerp(p1, o.at ?? 0.42).sub(side);
  const op = { ao: false, room: o.room, tint: o.tint, sub: 9, grime: false };
  wb.quad(mat, p0, m1, p1, m0, op);
  wb.quad(mat, p0, m0, p1, m1, op);
}

// ------------------------------------------------------------ el helecho
// Una mata de frondes que salen de la cepa y se arquean hacia fuera; cada
// fronde, con su nervio y sus pinnas a los dos lados, más cortas hacia la
// punta. s: el tamaño (1, de medio metro de alto).
export function helecho(ctx, x, y, z, s = 1, seed = 1, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const n = o.n ?? rng.int(7, 11);
  const room = o.room;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.25, 0.25);
    const len = s * rng.range(0.55, 0.85);
    const rise = s * rng.range(0.3, 0.55);
    const dir = V(Math.cos(a), 0, Math.sin(a));
    // el nervio: sube y se arquea hacia fuera, y la punta cae
    const pts = [];
    const N = 7;
    for (let k = 0; k <= N; k++) {
      const t = k / N;
      const h = rise * Math.sin(t * Math.PI * 0.75) - s * 0.08 * t * t;
      pts.push(V(x + dir.x * len * t, y + h, z + dir.z * len * t));
    }
    let tint = [0.72 + rng.range(-0.1, 0.12), 0.86 + rng.range(-0.1, 0.1), 0.6 + rng.range(-0.12, 0.08)];
    if (o.k) tint = tint.map((v, c) => v * o.k[c]);
    for (let k = 0; k < N; k++) {
      const p0 = pts[k],
        p1 = pts[k + 1];
      // (el nervio, una tira estrecha)
      hojaPlana(wb, 'hoja', p0, p1, 0.012 * s, V(0, 1, 0), { room, tint: tint.map((v) => v * 0.8), at: 0.5 });
      // las pinnas, a los dos lados, inclinadas hacia la punta
      const t = (k + 0.5) / N;
      const pl = s * 0.17 * (1 - t * 0.75);
      if (pl < 0.02) continue;
      const mid = p0.clone().lerp(p1, 0.5);
      const along = new THREE.Vector3().subVectors(p1, p0).normalize();
      const across = new THREE.Vector3().crossVectors(along, V(0, 1, 0)).normalize();
      for (const sd of [-1, 1]) {
        const tip = mid
          .clone()
          .add(across.clone().multiplyScalar(sd * pl))
          .add(along.clone().multiplyScalar(pl * 0.45))
          .add(V(0, -pl * 0.25, 0));
        hojaPlana(wb, 'hoja', mid, tip, pl * 0.38, V(0, 1, 0), { room, tint });
      }
    }
  }
  // la cepa
  P.ellipsoid(ctx, 'musgo', x, y + 0.02, z, 0.09 * s, 0.05 * s, 0.09 * s, o.k ? [0.5 * o.k[0], 0.56 * o.k[1], 0.4 * o.k[2]] : [0.5, 0.56, 0.4], { room });
}

// ------------------------------------------------------------ la hierba
// Matas de hierba: hojas finas que se arquean, de alto variado.
export function hierba(ctx, x, y, z, r = 0.4, n = 14, seed = 1, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const room = o.room;
  const hMax = o.h ?? 0.42;
  for (let i = 0; i < n; i++) {
    const px = x + rng.range(-r, r),
      pz = z + rng.range(-r, r);
    const h = rng.range(0.35, 1) * hMax;
    const a = rng.range(0, Math.PI * 2),
      lean = rng.range(0.05, 0.35);
    const base = V(px, y, pz);
    const mid = V(px + Math.cos(a) * h * lean * 0.4, y + h * 0.6, pz + Math.sin(a) * h * lean * 0.4);
    const tip = V(px + Math.cos(a) * h * lean, y + h, pz + Math.sin(a) * h * lean);
    const w = rng.range(0.012, 0.024);
    const nrm = V(-Math.sin(a), 0, Math.cos(a));
    let tint = [0.8 + rng.range(-0.12, 0.12), 0.92 + rng.range(-0.1, 0.08), 0.62 + rng.range(-0.1, 0.1)];
    if (o.k) tint = tint.map((v, c) => v * o.k[c]);
    hojaPlana(wb, 'hierba', base, mid, w, nrm, { room, tint, at: 0.5 });
    hojaPlana(wb, 'hierba', mid, tip, w * 0.7, nrm, { room, tint, at: 0.35 });
  }
}

// ------------------------------------------------------------ las flores
// Flores blancas, pequeñas (de las que se abren de noche), en sus tallos:
// cinco pétalos y el botón amarillo. n en un radio r.
export function flores(ctx, x, y, z, r = 0.4, n = 8, seed = 1, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const room = o.room;
  for (let i = 0; i < n; i++) {
    const px = x + rng.range(-r, r),
      pz = z + rng.range(-r, r);
    const h = rng.range(0.12, 0.32) * (o.h ?? 1);
    const lean = V(rng.range(-0.05, 0.05), 0, rng.range(-0.05, 0.05));
    const top = V(px + lean.x, y + h, pz + lean.z);
    // el tallo y una hoja
    P.rod(ctx, V(px, y, pz), top, 0.004, 0.003, 'hierba', { segs: 3, room, tint: [0.6, 0.8, 0.5] });
    hojaPlana(wb, 'hoja', V(px, y + h * 0.3, pz), V(px + rng.range(-0.06, 0.06), y + h * 0.45, pz + rng.range(-0.06, 0.06)), 0.025, V(0, 1, 0), { room, tint: [0.7, 0.86, 0.56] });
    // la flor, algo vuelta hacia arriba
    const sz = rng.range(0.022, 0.036) * (o.s ?? 1);
    const pet = o.color ?? 'flor';
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rng.range(0, 0.4);
      const tip = V(top.x + Math.cos(a) * sz, top.y + sz * 0.25, top.z + Math.sin(a) * sz);
      hojaPlana(wb, pet, top, tip, sz * 0.7, V(0, 1, 0), { room, at: 0.5, tint: o.tint });
    }
    wb.cylinder('florCentro', top.x, top.y - 0.002, top.z, sz * 0.25, sz * 0.2, sz * 0.18, 5, { ao: false, room, capTop: true, grime: false });
  }
}

// ------------------------------------------------------------ el musgo
// Un almohadón de musgo: bultos aplastados unos junto a otros.
export function musgo(ctx, x, y, z, rx = 0.6, rz = 0.5, seed = 1, o = {}) {
  const rng = new RNG(seed);
  const n = o.n ?? Math.max(3, Math.round(rx * rz * 14));
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, Math.PI * 2),
      d = Math.sqrt(rng.next());
    const px = x + Math.cos(a) * rx * d,
      pz = z + Math.sin(a) * rz * d;
    const s = rng.range(0.12, 0.26) * (1 - d * 0.4);
    const t = rng.range(0.82, 1.08);
    const K = o.k ?? [1, 1, 1];
    P.ellipsoid(ctx, 'musgo', px, y + s * 0.12, pz, s, s * rng.range(0.25, 0.45), s * rng.range(0.8, 1.1), [0.72 * t * K[0], 0.86 * t * K[1], 0.58 * t * K[2]], { room: o.room });
  }
}

// ------------------------------------------------------------ la hiedra
// Una guía de hiedra que cuelga de (x, y, z) len metros: el tallo, que se
// mece en curva, y las hojas, alternas, de tres puntas (en rombo y algo
// abiertas). o.dir: hacia dónde se aparta del muro (la normal).
export function hiedra(ctx, x, y, z, len = 2, seed = 1, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const room = o.room;
  const dir = o.dir ? V(o.dir[0], 0, o.dir[1]) : V(0, 0, 0);
  const n = Math.max(3, Math.round(len / 0.14));
  const sway = rng.range(0.05, 0.18);
  const ph = rng.range(0, 6);
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    pts.push(V(x + dir.x * 0.05 * t + Math.sin(t * 5 + ph) * sway * t, y - len * t, z + dir.z * 0.05 * t + Math.cos(t * 4 + ph) * sway * t));
  }
  for (let k = 0; k < n; k++) P.rod(ctx, pts[k], pts[k + 1], 0.006, 0.005, 'wooddark', { segs: 3, room, tint: [0.5, 0.46, 0.36] });
  for (let k = 1; k <= n; k++) {
    if (rng.chance(0.15)) continue;
    const p = pts[k];
    const a = rng.range(0, Math.PI * 2);
    const s = rng.range(0.05, 0.09) * (1 - (k / n) * 0.35) * (o.hoja ?? 1);
    const tip = V(p.x + Math.cos(a) * s * 0.8 + dir.x * s, p.y - s * 0.5, p.z + Math.sin(a) * s * 0.8 + dir.z * s);
    const tint = [0.62 + rng.range(-0.1, 0.1), 0.8 + rng.range(-0.1, 0.1), 0.5 + rng.range(-0.08, 0.08)];
    hojaPlana(wb, 'hoja', p, tip, s * 1.1, V(Math.cos(a), 0.4, Math.sin(a)), { room, tint, at: 0.55 });
  }
}

// ------------------------------------------------------------ las raíces
// Raíces que cuelgan de una grieta del techo: palos que se adelgazan y se
// tuercen, con alguna que se parte en dos.
export function raices(ctx, x, y, z, n = 4, len = 1.5, seed = 1, o = {}) {
  const rng = new RNG(seed);
  const room = o.room;
  for (let i = 0; i < n; i++) {
    let p = V(x + rng.range(-0.3, 0.3), y, z + rng.range(-0.3, 0.3));
    let r = rng.range(0.012, 0.03);
    const L = len * rng.range(0.5, 1.1);
    const segs = 5;
    for (let k = 0; k < segs; k++) {
      const q = V(p.x + rng.range(-0.12, 0.12), p.y - L / segs, p.z + rng.range(-0.12, 0.12));
      P.rod(ctx, p, q, r, r * 0.75, 'wooddark', { segs: 4, room, tint: [0.62, 0.52, 0.42] });
      if (k === 2 && rng.chance(0.5)) P.rod(ctx, q, V(q.x + rng.range(-0.25, 0.25), q.y - L * 0.25, q.z + rng.range(-0.25, 0.25)), r * 0.6, r * 0.2, 'wooddark', { segs: 3, room, tint: [0.62, 0.52, 0.42] });
      p = q;
      r *= 0.75;
    }
  }
}

// ------------------------------------------------------------ los juncos
// Juncos de la orilla: tallos rectos y finos, algunos con su espiga.
export function juncos(ctx, x, y, z, r = 0.3, n = 10, seed = 1, o = {}) {
  const rng = new RNG(seed);
  const room = o.room;
  for (let i = 0; i < n; i++) {
    const px = x + rng.range(-r, r),
      pz = z + rng.range(-r, r);
    const h = rng.range(0.5, 1.1) * (o.h ?? 1);
    const tip = V(px + rng.range(-0.08, 0.08), y + h, pz + rng.range(-0.08, 0.08));
    P.rod(ctx, V(px, y, pz), tip, 0.007, 0.003, 'hierba', { segs: 3, room, tint: [0.62, 0.74, 0.46] });
    if (rng.chance(0.3)) P.ellipsoid(ctx, 'hide', tip.x, tip.y - 0.06, tip.z, 0.012, 0.06, 0.012, [0.5, 0.36, 0.24], { room });
  }
}

// ------------------------------------------------------------ la higuera
// Una higuera joven que ha salido entre las piedras y crece hacia la luz:
// el tronco retorcido, las ramas que se abren arriba y las hojas grandes,
// de cinco lóbulos (el lóbulo de en medio y dos pares a los lados).
export function higuera(ctx, x, y, z, h = 2.6, seed = 1, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const room = o.room;
  const lean = o.lean ?? [0.15, 0.1];
  // el tronco: tres tramos que se tuercen
  const tr = [V(x, y - 0.05, z)];
  for (let k = 1; k <= 4; k++) {
    const t = k / 4;
    tr.push(V(x + lean[0] * h * t + Math.sin(t * 5 + seed) * 0.08, y + h * 0.6 * t, z + lean[1] * h * t + Math.cos(t * 4 + seed) * 0.08));
  }
  for (let k = 0; k < tr.length - 1; k++) P.rod(ctx, tr[k], tr[k + 1], 0.07 * (1 - k * 0.18), 0.07 * (1 - (k + 1) * 0.18), 'wooddark', { segs: 7, room, tint: [0.66, 0.62, 0.56] });
  // las raíces que agarran las piedras
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    P.rod(ctx, V(x, y + 0.15, z), V(x + Math.cos(a) * 0.45, y - 0.03, z + Math.sin(a) * 0.45), 0.045, 0.012, 'wooddark', { segs: 5, room, tint: [0.6, 0.56, 0.5] });
  }
  // las ramas y sus hojas
  const top = tr[tr.length - 1];
  const nb = o.ramas ?? 7;
  for (let b = 0; b < nb; b++) {
    const a = (b / nb) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const L = h * rng.range(0.28, 0.42);
    const p1 = V(top.x + Math.cos(a) * L * 0.6, top.y + L * rng.range(0.4, 0.7), top.z + Math.sin(a) * L * 0.6);
    const p0 = tr[tr.length - 2].clone().lerp(top, rng.range(0.3, 1));
    P.rod(ctx, p0, p1, 0.035, 0.015, 'wooddark', { segs: 5, room, tint: [0.66, 0.62, 0.56] });
    const nl = rng.int(6, 10);
    for (let l = 0; l < nl; l++) {
      const t = 0.35 + (l / nl) * 0.65;
      const base = p0.clone().lerp(p1, t);
      const la = a + rng.range(-1.2, 1.2);
      const ls = rng.range(0.2, 0.3);
      const up = rng.range(0.1, 0.5);
      const tip = V(base.x + Math.cos(la) * ls, base.y + ls * up, base.z + Math.sin(la) * ls);
      const nrm = V(-Math.cos(la) * up, 1, -Math.sin(la) * up).normalize();
      const tint = [0.6 + rng.range(-0.08, 0.08), 0.78 + rng.range(-0.08, 0.08), 0.48 + rng.range(-0.06, 0.06)];
      // el lóbulo de en medio y los dos pares de los lados
      hojaPlana(wb, 'hoja', base, tip, ls * 0.55, nrm, { room, tint, at: 0.55 });
      const along = new THREE.Vector3().subVectors(tip, base);
      const across = new THREE.Vector3().crossVectors(along, nrm).normalize();
      for (const sd of [-1, 1]) {
        const m = base.clone().add(along.clone().multiplyScalar(0.3));
        const lt = m.clone().add(across.clone().multiplyScalar(sd * ls * 0.42)).add(along.clone().multiplyScalar(0.25));
        hojaPlana(wb, 'hoja', m, lt, ls * 0.3, nrm, { room, tint, at: 0.5 });
      }
      // algún higo
      if (rng.chance(0.2)) P.ellipsoid(ctx, 'hide', base.x, base.y - 0.03, base.z, 0.02, 0.026, 0.02, [0.36, 0.42, 0.24], { room });
    }
  }
}

// ------------------------------------------------------------ el montecillo
// Un montón de tierra y escombros (la isla de la luz): la cara de arriba,
// algo abombada, de borde irregular, y el talud que baja al suelo (no un
// cajón). (cx, cz) el centro; y0 el suelo, y1 lo alto; r el radio.
export function montecillo(ctx, cx, cz, y0, y1, r, seed = 1, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const room = o.room;
  const N = 20;
  const top = [],
    bot = [];
  const ph = rng.range(0, 6);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const k = 1 + 0.1 * Math.sin(a * 3 + ph) + 0.06 * Math.sin(a * 7 + ph * 2) + rng.range(-0.03, 0.03);
    const rx = r * (o.sx ?? 1) * k,
      rz = r * (o.sz ?? 1) * k;
    top.push(V(cx + Math.cos(a) * rx, y1 + rng.range(-0.03, 0.03), cz + Math.sin(a) * rz));
    const t = o.talud ?? 0.55;
    bot.push(V(cx + Math.cos(a) * (rx + t), y0 - 0.02, cz + Math.sin(a) * (rz + t)));
  }
  const c = V(cx, y1 + (o.domo ?? 0.1), cz);
  const tt = o.tint ?? [0.42, 0.38, 0.32];
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    wb.tri('dirt', c, top[j], top[i], { ao: false, room, tint: tt, sub: 9 });
    wb.quad('dirt', bot[i], bot[j], top[j], top[i], { ao: false, room, tint: tt.map((v) => v * 0.85), sub: 9 });
  }
}

// ------------------------------------------------------------ el arbolillo
// Un árbol joven de los que han salido abajo (un saúco): tres o cuatro varas
// que salen juntas de la cepa y se abren, con sus ramillas; las hojas,
// compuestas (cinco hojuelas en dos pares y la de la punta), y en lo alto de
// cada vara, si o.flores, sus ramilletes de florecillas blancas, planos como
// platos. h: el alto.
export function arbolillo(ctx, x, y, z, h = 2.4, seed = 1, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const room = o.room;
  const nv = o.varas ?? rng.int(3, 5);
  const lean = o.lean ?? [0, 0];
  for (let v = 0; v < nv; v++) {
    const a = (v / nv) * Math.PI * 2 + rng.range(-0.4, 0.4);
    const sp = rng.range(0.12, 0.3);
    const H = h * rng.range(0.75, 1.0);
    // la vara: de la cepa, abriéndose y algo vencida hacia la luz
    const pts = [V(x + Math.cos(a) * 0.04, y - 0.03, z + Math.sin(a) * 0.04)];
    const N = 4;
    for (let k = 1; k <= N; k++) {
      const t = k / N;
      pts.push(V(x + Math.cos(a) * sp * H * t + lean[0] * H * t * t + Math.sin(t * 4 + seed + v) * 0.05, y + H * t, z + Math.sin(a) * sp * H * t + lean[1] * H * t * t + Math.cos(t * 3 + seed + v) * 0.05));
    }
    for (let k = 0; k < N; k++) P.rod(ctx, pts[k], pts[k + 1], 0.045 * (1 - k * 0.2), 0.045 * (1 - (k + 1) * 0.2), 'wooddark', { segs: 5, room, tint: [0.62, 0.58, 0.5] });
    // ramillas con sus hojas, de la mitad de la vara para arriba
    const nr = rng.int(3, 5);
    for (let r = 0; r < nr; r++) {
      const t = 0.45 + (r / nr) * 0.55;
      const k = Math.min(N - 1, Math.floor(t * N));
      const base = pts[k].clone().lerp(pts[k + 1], t * N - k);
      const ra = a + rng.range(-1.4, 1.4);
      const L = H * rng.range(0.18, 0.3);
      const tip = V(base.x + Math.cos(ra) * L, base.y + L * rng.range(0.1, 0.5), base.z + Math.sin(ra) * L);
      P.rod(ctx, base, tip, 0.016, 0.008, 'wooddark', { segs: 4, room, tint: [0.62, 0.58, 0.5] });
      for (let l = 0; l < 3; l++) hojaCompuesta(wb, rng, base.clone().lerp(tip, 0.3 + l * 0.3), ra + rng.range(-0.9, 0.9), rng.range(0.3, 0.4), room);
      hojaCompuesta(wb, rng, tip, ra + rng.range(-0.3, 0.3), rng.range(0.32, 0.42), room);
    }
    // en lo alto: hojas y, si es tiempo, el ramillete de flores
    const top = pts[N];
    for (let l = 0; l < 5; l++) hojaCompuesta(wb, rng, top, a + rng.range(-2.4, 2.4), rng.range(0.3, 0.42), room);
    if (o.flores) {
      for (let c = 0; c < 3; c++) {
        const ca = a + rng.range(-1.5, 1.5);
        const cc = V(top.x + Math.cos(ca) * 0.18, top.y + 0.06 + rng.range(-0.05, 0.08), top.z + Math.sin(ca) * 0.18);
        const fr = rng.range(0.1, 0.15);
        for (let f = 0; f < 12; f++) {
          const fa = rng.range(0, Math.PI * 2),
            fd = Math.sqrt(rng.next()) * fr;
          P.ellipsoid(ctx, 'flor', cc.x + Math.cos(fa) * fd, cc.y + rng.range(-0.015, 0.015), cc.z + Math.sin(fa) * fd, 0.026, 0.014, 0.026, [1, 1, 0.94], { room });
        }
      }
    }
  }
  P.ellipsoid(ctx, 'wooddark', x, y + 0.04, z, 0.12, 0.08, 0.12, [0.5, 0.46, 0.4], { room });
}

// Una hoja compuesta: el raquis y cinco hojuelas (dos pares y la de la punta).
function hojaCompuesta(wb, rng, p, a, L, room) {
  const up = rng.range(-0.1, 0.35);
  const d = V(Math.cos(a), up, Math.sin(a)).normalize();
  const tip = p.clone().addScaledVector(d, L);
  const n = V(-d.x * 0.3, 1, -d.z * 0.3).normalize();
  const tint = [0.58 + rng.range(-0.08, 0.08), 0.8 + rng.range(-0.08, 0.06), 0.46 + rng.range(-0.06, 0.06)];
  const side = new THREE.Vector3().crossVectors(d, n).normalize();
  for (const t of [0.3, 0.62]) {
    const b = p.clone().addScaledVector(d, L * t);
    for (const sd of [-1, 1]) {
      const e = b
        .clone()
        .addScaledVector(side, sd * L * 0.42)
        .addScaledVector(d, L * 0.12)
        .add(V(0, -L * 0.08, 0));
      hojaPlana(wb, 'hoja', b, e, L * 0.2, n, { room, tint, at: 0.5 });
    }
  }
  hojaPlana(wb, 'hoja', p.clone().addScaledVector(d, L * 0.7), tip.clone().addScaledVector(d, L * 0.25), L * 0.2, n, { room, tint, at: 0.5 });
}

// ------------------------------------------------------------ los hongos
// Una piña de hongos: el pie y el sombrero. o.luz: de los que dan luz (lo
// umbrío del Vergel); si no, pardos. o.repisa: de los que salen de lado en
// los troncos, como repisas (dir: hacia dónde miran).
export function hongos(ctx, x, y, z, n = 6, seed = 1, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const room = o.room;
  const s0 = o.s ?? 1;
  const capMat = o.luz ? 'hongoLuz' : 'hide';
  const pieMat = o.luz ? 'hongoPie' : 'bone';
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, Math.PI * 2),
      d = Math.sqrt(rng.next()) * (o.r ?? 0.16);
    const px = x + Math.cos(a) * d,
      pz = z + Math.sin(a) * d;
    const s = rng.range(0.5, 1.2) * s0;
    const capT = o.luz ? null : [0.62 + rng.range(-0.1, 0.1), 0.48 + rng.range(-0.08, 0.06), 0.36];
    if (o.repisa) {
      const dir = o.dir ?? [1, 0];
      const cy = y + rng.range(-0.15, 0.15);
      P.ellipsoid(ctx, capMat, px + dir[0] * 0.04 * s, cy, pz + dir[1] * 0.04 * s, 0.07 * s, 0.018 * s, 0.07 * s, capT, { room });
      continue;
    }
    const h = rng.range(0.04, 0.11) * s;
    const lean = V(rng.range(-0.02, 0.02), 0, rng.range(-0.02, 0.02));
    P.rod(ctx, V(px, y, pz), V(px + lean.x, y + h, pz + lean.z), 0.007 * s, 0.006 * s, pieMat, { segs: 4, room });
    const r = rng.range(0.022, 0.042) * s;
    P.ellipsoid(ctx, capMat, px + lean.x, y + h, pz + lean.z, r, r * 0.42, r, capT, { room });
  }
  void wb;
}

// ------------------------------------------------------------ los nenúfares
// Hojas redondas, con su escotadura, flotando (y, el agua), y alguna flor.
export function nenufares(ctx, x, y, z, r = 0.8, n = 8, seed = 1, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const room = o.room;
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, Math.PI * 2),
      d = Math.sqrt(rng.next()) * r;
    const px = x + Math.cos(a) * d,
      pz = z + Math.sin(a) * d;
    const R = rng.range(0.1, 0.2);
    const g = new THREE.CircleGeometry(R, 9, rng.range(0, 6), Math.PI * 2 - 0.45);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Matrix4().makeTranslation(px, y + 0.012 + i * 0.0004, pz);
    const t = rng.range(0.8, 1.05);
    wb.geometry('hoja', g, m, { ao: false, room, tint: [0.44 * t, 0.62 * t, 0.36 * t], grime: false });
    if (rng.chance(o.flor ?? 0.25)) {
      const fy = y + 0.03;
      const fs = rng.range(0.035, 0.05);
      for (let k = 0; k < 7; k++) {
        const fa = (k / 7) * Math.PI * 2;
        const tip = V(px + Math.cos(fa) * fs, fy + fs * 0.5, pz + Math.sin(fa) * fs);
        hojaPlana(wb, 'flor', V(px, fy, pz), tip, fs * 0.6, V(0, 1, 0), { room, at: 0.5, tint: o.tint });
      }
      wb.cylinder('florCentro', px, fy, pz, fs * 0.25, fs * 0.2, fs * 0.25, 5, { ao: false, room, capTop: true, grime: false });
    }
  }
}

// ------------------------------------------------------------ la raíz larga
// Una raíz que cuelga muy abajo (las del huerto de arriba, por la sima): un
// tallo que se adelgaza y se mece, con raicillas a los lados.
export function raizLarga(ctx, x, y, z, len = 5, seed = 1, o = {}) {
  const rng = new RNG(seed);
  const room = o.room;
  const n = Math.max(6, Math.round(len / 0.5));
  const sway = rng.range(0.08, 0.3);
  const ph = rng.range(0, 6);
  const r0 = o.r ?? rng.range(0.025, 0.045);
  let prev = V(x, y, z);
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    const p = V(x + Math.sin(t * 3.1 + ph) * sway * t + (o.dx ?? 0) * t, y - len * t, z + Math.cos(t * 2.3 + ph) * sway * t + (o.dz ?? 0) * t);
    const ra = r0 * (1 - (k - 1) / n * 0.85),
      rb = r0 * (1 - (k / n) * 0.85);
    P.rod(ctx, prev, p, ra, rb, 'wooddark', { segs: 4, room, tint: o.tint ?? [0.6, 0.5, 0.4] });
    if (k > 1 && k < n - 1 && rng.chance(0.35)) {
      const a = rng.range(0, Math.PI * 2),
        L = rng.range(0.15, 0.45);
      P.rod(ctx, p, V(p.x + Math.cos(a) * L, p.y - L * 0.8, p.z + Math.sin(a) * L), rb * 0.5, rb * 0.15, 'wooddark', { segs: 3, room, tint: o.tint ?? [0.6, 0.5, 0.4] });
    }
    prev = p;
  }
}

// ------------------------------------------------------------ el tronco caído
// Un tronco viejo, tumbado, con su musgo por encima y sus hongos de lado.
export function tronco(ctx, x, y, z, rot, len = 2.4, r = 0.2, seed = 1, o = {}) {
  const rng = new RNG(seed);
  const room = o.room;
  const ca = Math.cos(rot),
    sa = Math.sin(rot);
  const a = V(x - ca * len * 0.5, y + r * 0.85, z - sa * len * 0.5),
    b = V(x + ca * len * 0.5, y + r * 0.8, z + sa * len * 0.5);
  P.rod(ctx, a, b, r, r * 0.85, 'wooddark', { segs: 7, room, tint: o.tint ?? [0.46, 0.4, 0.34] });
  // la punta rota y una rama
  P.rod(ctx, a.clone().lerp(b, 0.7), a.clone().lerp(b, 0.7).add(V(-sa * 0.6, 0.35, ca * 0.6)), r * 0.35, r * 0.15, 'wooddark', { segs: 4, room, tint: o.tint ?? [0.46, 0.4, 0.34] });
  if (o.musgo !== false) for (let k = 0; k < 4; k++) musgo(ctx, x + ca * len * (k / 4 - 0.38), y + r * 1.55, z + sa * len * (k / 4 - 0.38), 0.25, 0.14, seed + 11 + k, { room, n: 4, k: o.k });
  if (o.hongos !== false)
    for (let k = 0; k < 3; k++) {
      const t = rng.range(-0.4, 0.4);
      const sd = rng.chance(0.5) ? 1 : -1;
      hongos(ctx, x + ca * len * t - sa * r * sd, y + r * rng.range(0.6, 1.2), z + sa * len * t + ca * r * sd, 4, seed + 31 + k, { room, repisa: true, dir: [-sa * sd, ca * sd], luz: o.luz, s: 0.9 });
    }
  void rng;
}

// ------------------------------------------------------------ la mata
// Un matorral de hojas (zarzas, acebillos, lo que crece a la sombra): hojas
// sueltas repartidas por una media bola aplastada, mirando hacia fuera, y
// unas ramillas. r: el radio; o.h: el alto (por defecto, el radio).
export function mata(ctx, x, y, z, r = 0.5, seed = 1, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const room = o.room;
  const h = o.h ?? r * 0.9;
  const n = o.n ?? Math.round(18 + r * 40);
  const K = o.k ?? [1, 1, 1];
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, Math.PI * 2),
      e = Math.acos(rng.range(0.05, 1));
    const ux = Math.cos(a) * Math.sin(e),
      uy = Math.cos(e),
      uz = Math.sin(a) * Math.sin(e);
    const d = rng.range(0.55, 1);
    const p = V(x + ux * r * d, y + uy * h * d, z + uz * r * d);
    const L = rng.range(0.1, 0.17) * (o.hoja ?? 1);
    const tip = V(p.x + ux * L + rng.range(-0.04, 0.04), p.y + uy * L * 0.6 + rng.range(-0.03, 0.05), p.z + uz * L + rng.range(-0.04, 0.04));
    const t = rng.range(0.78, 1.06);
    const tint = [0.5 * t * K[0], 0.72 * t * K[1], 0.4 * t * K[2]];
    hojaPlana(wb, 'hoja', p, tip, L * 0.55, V(ux, uy + 0.3, uz).normalize(), { room, tint, at: 0.45 });
  }
  for (let i = 0; i < 4; i++) {
    const a = rng.range(0, Math.PI * 2);
    P.rod(ctx, V(x, y, z), V(x + Math.cos(a) * r * 0.8, y + h * 0.7, z + Math.sin(a) * r * 0.8), 0.012, 0.006, 'wooddark', { segs: 3, room, tint: [0.5, 0.46, 0.38] });
  }
}

