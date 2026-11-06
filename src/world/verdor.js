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
    const tint = [0.72 + rng.range(-0.1, 0.12), 0.86 + rng.range(-0.1, 0.1), 0.6 + rng.range(-0.12, 0.08)];
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
  P.ellipsoid(ctx, 'musgo', x, y + 0.02, z, 0.09 * s, 0.05 * s, 0.09 * s, [0.5, 0.56, 0.4], { room });
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
    const tint = [0.8 + rng.range(-0.12, 0.12), 0.92 + rng.range(-0.1, 0.08), 0.62 + rng.range(-0.1, 0.1)];
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
    P.ellipsoid(ctx, 'musgo', px, y + s * 0.12, pz, s, s * rng.range(0.25, 0.45), s * rng.range(0.8, 1.1), [0.72 * t, 0.86 * t, 0.58 * t], { room: o.room });
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
