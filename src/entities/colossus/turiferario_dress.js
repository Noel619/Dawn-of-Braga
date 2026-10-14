// EL TURIFERARIO: el vestido de catedral. Al reventar la nave se lleva la
// iglesia encima: un fajón partido (el arco de piedra que cruzaba la nave)
// atravesado en la joroba, sillares y dovelas clavados en la carne (la
// joroba, los brazos y la cola), una viga sobre el hombro izquierdo y otra
// enganchada en la casulla, tejas por los hombros, la corona de velas de la
// nave enganchada en un cuerno de la mitra (encendida), el estandarte negro
// del presbiterio prendido en la aureola, cristales de las vidrieras en el
// brazo de la campana. Y lo litúrgico que le queda: el manípulo en el
// antebrazo izquierdo y, en el derecho, la argolla con la cadena enrollada
// (tapan la costura de las manos, que se esculpen aparte).
//
// Todo son piezas rígidas pegadas a sus huesos (sólo geometría, como el
// resto del modelo), menos el estandarte, que es tela con piel (sus huesos
// se mecen: ver turRig) y la corona, que tiene su propio hueso con muelle.
import * as THREE from 'three';
import { hardGeo, tubeGeo, V } from './sculpt.js';
import { torusAround, chainGeo, ribbonGeo, withColor, mulberry } from './parts.js';
import { euler, sweepGeo } from './turiferario_hero.js';


// ------------------------------------------------------------ dónde
// la corona de velas: centro del aro (es el hueso 'corona', hijo de 'head')
export const CROWN = { c: [1.86, 20.66, 3.06], R: 0.68 };
// el estandarte: el travesaño del que cuelga (hueso 'ban0', hijo de 'halo')
export const BANNER = { top: [-4.75, 19.62, 1.95], w: 1.8, len: 3.6 };
// las heridas donde se clavan las piedras (el cuerpo las pinta)
export const WOUNDS = [];

// ------------------------------------------------------------ piezas
const stone = (mat, c, s, rot, o = {}) => hardGeo({ type: 'box', s, p: c, r: rot, mat, taper: o.taper, shade: o.shade ?? 1 });
// caja orientada: ejes x, y, z del bloque a lo largo de los vectores dados
const boxAlong = (mat, c, s, X, Y, Z, o = {}) => stone(mat, c.toArray ? c.toArray() : c, s, euler(X, Y, Z), o);

export function cathedralDress(o = {}) {
  const rnd = mulberry(o.seed ?? 23);
  const R = (a, b) => a + (b - a) * rnd();
  const parts = [];
  const add = (bone, mat, geo, extra = {}) => parts.push({ bone, mat, geo, ...extra });
  WOUNDS.length = 0;
  const wound = (p, r) => WOUNDS.push({ p: p.toArray ? p.toArray() : p, r });

  // ---- el fajón partido, atravesado en la joroba: cinco dovelas de un arco
  // (radio 4 m) de la diagonal del hombro izquierdo a la espalda; la última,
  // rota, se hunde en la carne
  {
    const T = V(-0.832, 0, -0.555);
    const U = V(0, 1, 0);
    const N = T.clone().cross(U).normalize();
    const Rr = 4.0;
    const C = V(0.1, 12.35, -2.0);
    const TH = [-0.42, -0.25, -0.08, 0.09, 0.27, 0.45];
    TH.forEach((th, i) => {
      const rad = T.clone().multiplyScalar(Math.sin(th)).addScaledVector(U, Math.cos(th));
      const tg = T.clone().multiplyScalar(Math.cos(th)).addScaledVector(U, -Math.sin(th));
      const c = C.clone().addScaledVector(rad, Rr);
      let X = tg,
        Y = rad;
      if (i === TH.length - 1) {
        // la rota: caída y hundida
        c.addScaledVector(U, -0.32).addScaledVector(T, 0.12);
        const q = new THREE.Quaternion().setFromAxisAngle(N, -0.5);
        X = tg.clone().applyQuaternion(q);
        Y = rad.clone().applyQuaternion(q);
      }
      const Z = X.clone().cross(Y).normalize();
      add('chest', 'ashlar', boxAlong('ashlar', c, [0.64, 0.7, 0.76], X, Y, Z, { taper: [0.82, 1] }));
      // la moldura de abajo (el bocel del arco)
      add('chest', 'ashlar', boxAlong('ashlar', c.clone().addScaledVector(Y, -0.4), [0.6, 0.12, 0.5], X, Y, Z, { shade: 0.8 }));
      if (i === 0 || i === TH.length - 1) wound(c.clone().addScaledVector(Y, -0.45), 0.75);
    });
    // la argamasa rota y cascotes en la juntura del final
    for (let k = 0; k < 5; k++) {
      const c = C.clone().addScaledVector(T.clone().multiplyScalar(Math.sin(0.36)).addScaledVector(U, Math.cos(0.36)), Rr).add(V(R(-0.4, 0.4), R(-0.2, 0.2), R(-0.4, 0.4)));
      add('chest', 'ashlar', stone('ashlar', c.toArray(), [R(0.12, 0.26), R(0.1, 0.2), R(0.12, 0.24)], [R(0, 90), R(0, 90), R(0, 90)], { shade: 0.75 }));
    }
  }

  // ---- sillares y dovelas clavados en la carne
  const embed = (bone, c, dir, s, tw, mat = 'ashlar') => {
    const Y = dir.clone().normalize();
    const t0 = Math.abs(Y.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
    let X = t0.clone().cross(Y).normalize();
    X.applyAxisAngle(Y, tw);
    const Z = X.clone().cross(Y).normalize();
    // ladeado: no entra derecho
    const q = new THREE.Quaternion().setFromAxisAngle(Z, R(-0.35, 0.35));
    X = X.applyQuaternion(q);
    const Y2 = Y.clone().applyQuaternion(q);
    add(bone, mat, boxAlong(mat, c.clone().addScaledVector(Y2, s[1] * 0.12), s, X, Y2, X.clone().cross(Y2).normalize(), { taper: mat === 'ashlar' ? [0.85, 0.9] : undefined }));
    wound(c, Math.max(s[0], s[2]) * 0.85);
  };
  // el brazo izquierdo (por fuera del húmero) y el antebrazo derecho
  embed('armL', V(3.88, 12.6, 0.48), V(0.72, 0.18, 0.67), [0.56, 0.5, 0.5], 0.4);
  embed('foreR', V(-4.78, 9.12, 1.42), V(-0.6, 0.12, 0.79), [0.44, 0.4, 0.38], -0.7);
  // la joroba: un sillar y una dovela suelta
  embed('chest', V(1.42, 15.62, -2.45), V(0.45, 0.85, -0.3), [0.58, 0.52, 0.5], 0.9);
  embed('chest', V(-1.72, 15.42, -1.15), V(-0.55, 0.8, 0.2), [0.5, 0.46, 0.62], -0.4);
  // la cola (por encima: se los ha ido clavando al arrastrarla)
  embed('tail3', V(0.42, 3.92, -6.8), V(0.25, 1, 0), [0.62, 0.55, 0.52], 0.6);
  embed('tail4', V(-0.42, 2.42, -10.5), V(-0.3, 1, 0.1), [0.52, 0.5, 0.6], -1.1);
  embed('tail6', V(0.22, 1.72, -14.3), V(0.35, 1, -0.2), [0.46, 0.42, 0.5], 0.2);

  // ---- la viga del hombro izquierdo (del pecho a la joroba, apoyada en el
  // hombro; la punta de delante, astillada) y otra enganchada en la casulla
  const beam = (bone, F, B, w, splinter) => {
    const Y = B.clone().sub(F);
    const L = Y.length();
    Y.normalize();
    const X = V(0, 1, 0).cross(Y).normalize();
    if (X.lengthSq() < 0.1) X.set(1, 0, 0);
    const Z = X.clone().cross(Y).normalize();
    add(bone, 'timber', boxAlong('timber', F.clone().lerp(B, 0.5), [w, L, w * 0.92], X, Y, Z));
    // astillas
    for (let k = 0; k < splinter; k++) {
      const a = (k / splinter) * Math.PI * 2 + R(-0.4, 0.4);
      const off = X.clone().multiplyScalar(Math.cos(a) * w * 0.32).addScaledVector(Z, Math.sin(a) * w * 0.3);
      const len = R(0.35, 0.7);
      const d = Y.clone().negate().addScaledVector(off.clone().normalize(), R(0.1, 0.35)).normalize();
      add(bone, 'timber', boxAlong('timber', F.clone().add(off).addScaledVector(d, len * 0.5), [R(0.05, 0.1), len, R(0.05, 0.09)], X, d, X.clone().cross(d).normalize(), { taper: [0.15, 0.3], shade: 0.8 }));
    }
    // clavos de hierro
    for (let k = 0; k < 2; k++) add(bone, 'iron', hardGeo({ type: 'cyl', s: [0.035, 0.035, w * 1.3], seg: 4, p: F.clone().lerp(B, 0.3 + k * 0.35).toArray(), r: euler(Y, X, Z), mat: 'iron' }));
  };
  beam('chest', V(2.95, 14.62, 1.2), V(0.85, 16.15, -2.3), 0.34, 5);
  beam('casB2', V(1.7, 10.4, -4.22), V(-0.95, 11.95, -4.02), 0.28, 4);

  // ---- tejas: sobre la viga, por el hombro derecho y prendidas en la casulla
  const tile = (bone, c, yaw, tilt, broken = false) => {
    const g = hardGeo({ type: 'cyl', s: [0.15, 0.13, broken ? 0.28 : 0.5], seg: 6, theta: [-90, 180], p: [0, 0, 0], r: [90, 0, 0], mat: 'roof' });
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(tilt[0], yaw, tilt[1], 'YXZ')));
    g.translate(...c);
    add(bone, 'roof', g, { ds: true });
  };
  for (let k = 0; k < 4; k++) {
    const F = V(2.95, 14.62, 1.2),
      B = V(0.85, 16.15, -2.3);
    const c = F.clone().lerp(B, 0.2 + k * 0.17).add(V(R(-0.12, 0.12), 0.24, 0));
    tile('chest', c.toArray(), R(0, Math.PI), [R(-0.4, 0.4), R(-0.3, 0.3)], k === 2);
  }
  tile('clavR', [-2.2, 15.36, -0.5], 0.7, [0.15, -0.2]);
  tile('clavR', [-2.72, 15.18, 0.05], 2.1, [-0.1, 0.25], true);
  tile('clavR', [-1.85, 15.38, -0.98], -0.4, [0.2, 0.1]);
  tile('clavL', [1.55, 15.38, 0.35], 1.2, [0.05, 0.2]);
  tile('casB1', [0.92, 13.45, -3.86], 0.2, [1.45, 0.1]);
  tile('casB1', [-1.15, 12.95, -3.96], -0.3, [1.5, -0.2], true);

  // ---- cristales de las vidrieras clavados en el brazo de la campana
  const shard = (bone, c, dir, size, tw) => {
    const Y = dir.clone().normalize();
    const X = (Math.abs(Y.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0)).cross(Y).normalize().applyAxisAngle(Y, tw);
    const g = new THREE.BufferGeometry();
    const a = c.clone().addScaledVector(Y, -size * 0.25),
      b = c.clone().addScaledVector(Y, size).addScaledVector(X, size * R(-0.2, 0.25)),
      d1 = c.clone().addScaledVector(X, size * 0.38),
      d2 = c.clone().addScaledVector(X, -size * 0.3);
    const P = [a, d1, b, a, b, d2];
    g.setAttribute('position', new THREE.Float32BufferAttribute(P.flatMap((p) => p.toArray()), 3));
    g.computeVertexNormals();
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1, 0, 0, 0.5, 1, 0.2, 0.4].map((q) => q * R(0.6, 1.4)), 2));
    add(bone, 'glass', withColor(g, 1), { ds: true });
  };
  shard('foreR', V(-4.62, 8.4, 1.62), V(-0.5, 0.35, 0.8), 0.42, 0.3);
  shard('foreR', V(-4.42, 9.7, 1.1), V(-0.7, 0.4, 0.6), 0.3, -0.8);
  shard('foreR', V(-4.85, 7.6, 1.92), V(-0.3, 0.1, 0.95), 0.26, 1.2);
  shard('armR', V(-3.7, 12.2, 0.62), V(-0.6, 0.3, 0.75), 0.36, 0.5);
  shard('handR', V(-5.3, 6.0, 2.38), V(-0.55, 0.45, 0.7), 0.24, 0.1);

  // ---- el manípulo (antebrazo izquierdo) y la argolla con la cadena
  // (antebrazo derecho), sobre la costura de las muñecas. El antebrazo, en la
  // muñeca, no es redondo: dos huesos lado a lado (unos 0.93 × 0.62 m; ver
  // los brazos del cuerpo en turiferario.js), así que las bandas son elipses.
  const wristAt = (s) => {
    const A = V(4.85 * s, 6.85, 2.05),
      B = V(5.06 * s, 6.72, 1.8);
    const W = V(4.9 * s, 6.6, 2.0);
    const df = W.clone().sub(V(4.3 * s, 10.42, 0.6)).normalize();
    const M = A.clone().add(B).multiplyScalar(0.5);
    const wide = B.clone().sub(A);
    wide.addScaledVector(df, -wide.dot(df)).normalize();
    const up = df.clone().cross(wide).normalize();
    return { M, df, wide, up };
  };
  // banda de tela (o de hierro) alrededor: elipse de radios ra (hacia
  // 'wide') y rb, ancho w a lo largo del brazo, con pliegues
  const band = (bone, c, ax, wide, up, ra, rb, w, mat, folds, o2 = {}) => {
    const nT = 40,
      nW = 3;
    const pos = [],
      nor = [],
      uv = [];
    const P = (t, wq) => {
      const th = (t / nT) * Math.PI * 2;
      const f = Math.sin(th * folds + (o2.ph ?? 0)) * (o2.fold ?? 0.022) + Math.sin(th * 3 + 1) * 0.012;
      const p = c.clone().addScaledVector(wide, Math.cos(th) * (ra + f)).addScaledVector(up, Math.sin(th) * (rb + f));
      const nn = wide.clone().multiplyScalar(Math.cos(th) / ra).addScaledVector(up, Math.sin(th) / rb).normalize();
      return [p.addScaledVector(ax, (wq / nW - 0.5) * w + Math.sin(th * 2) * (o2.skew ?? 0.03)), nn];
    };
    for (let t = 0; t < nT; t++)
      for (let q = 0; q < nW; q++) {
        const Q = [P(t, q), P(t + 1, q), P(t + 1, q + 1), P(t, q + 1)];
        for (const i of [0, 1, 2, 0, 2, 3]) {
          pos.push(...Q[i][0].toArray());
          nor.push(...Q[i][1].toArray());
          uv.push((t + (i === 1 || i === 2 ? 1 : 0)) / 9, (q + (i >= 2 ? 1 : 0)) / nW);
        }
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    add(bone, mat, withColor(g, o2.shade ?? 0.85), { ds: true });
  };
  // aro de hierro (tubo redondo) por una elipse
  const ring = (bone, c, ax, wide, up, ra, rb, t) => {
    const pts = [];
    for (let k = 0; k <= 32; k++) {
      const th = (k / 32) * Math.PI * 2;
      pts.push(c.clone().addScaledVector(wide, Math.cos(th) * ra).addScaledVector(up, Math.sin(th) * rb));
    }
    const rr = pts.map(() => t);
    add(bone, 'iron', sweepGeo(pts, ax, rr, rr, 5, { cap: false }));
  };
  {
    // el manípulo: carmesí con dos galones de oro, anudado por fuera; los dos
    // cabos, cortos y tiesos (no cuelgan sobre la mano)
    const { M, df, wide, up } = wristAt(1);
    const c = M.clone().addScaledVector(df, 0.03);
    band('foreL', c, df, wide, up, 0.6, 0.45, 0.56, 'colRobe', 9);
    for (const e of [-0.25, 0.25]) band('foreL', c.clone().addScaledVector(df, e), df, wide, up, 0.62, 0.47, 0.08, 'colOrphrey', 9, { shade: 1 });
    const knot = c.clone().addScaledVector(wide, 0.66).addScaledVector(up, 0.06);
    add('foreL', 'colRobe', hardGeo({ type: 'sphere', s: [0.15, 0.12, 0.13], seg: 6, seg2: 4, p: knot.toArray(), mat: 'colRobe' }));
    for (const [dy, dz] of [
      [0.5, 0.35],
      [-0.25, 0.6],
    ]) {
      const tip = knot.clone().addScaledVector(wide, 0.55).addScaledVector(df, dy * 0.6).addScaledVector(up, dz * 0.45);
      const mid = knot.clone().lerp(tip, 0.5).addScaledVector(df, 0.08);
      add('foreL', 'colRobe', ribbonGeo([knot, mid, tip], (u) => 0.24 - u * 0.06, { up: up.toArray(), shade: 0.8 }), { ds: true });
      add('foreL', 'colOrphrey', ribbonGeo([tip.clone().addScaledVector(knot.clone().sub(tip).normalize(), 0.09), tip], 0.19, { up: up.toArray(), shade: 1 }), { ds: true });
    }
  }
  {
    // la argolla: una banda de hierro entre dos aros remachados y la cadena,
    // enrollada dos vueltas por el antebrazo, que baja por la muñeca al puño
    // (y de ahí cuelga la de la campana)
    const { M, df, wide, up } = wristAt(-1);
    const c = M.clone().addScaledVector(df, 0.02);
    band('foreR', c, df, wide, up, 0.58, 0.44, 0.34, 'iron', 2, { fold: 0.004, skew: 0.004, shade: 0.75 });
    for (const e of [-0.17, 0.17]) ring('foreR', c.clone().addScaledVector(df, e), df, wide, up, 0.6, 0.46, 0.06);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const p = c.clone().addScaledVector(wide, Math.cos(a) * 0.6).addScaledVector(up, Math.sin(a) * 0.46);
      add('foreR', 'iron', hardGeo({ type: 'sphere', s: [0.055], seg: 4, seg2: 3, p: p.toArray(), mat: 'iron' }));
    }
    const pts = [];
    for (let k = 0; k <= 30; k++) {
      const q = k / 30;
      const a = q * Math.PI * 4 + 0.6;
      pts.push(c.clone().addScaledVector(df, -0.75 + q * 0.62).addScaledVector(wide, Math.cos(a) * 0.62).addScaledVector(up, Math.sin(a) * 0.48));
    }
    for (const g of chainGeo(pts, 0.13, 0.035)) add('foreR', 'iron', g);
    // de la última vuelta, por la muñeca, al puño
    const last = pts[pts.length - 1];
    const grip = V(-5.3, 5.2, 2.75);
    for (const g of chainGeo([last, last.clone().lerp(grip, 0.5).addScaledVector(up, 0.25), grip], 0.13, 0.035)) add('handR', 'iron', g);
  }

  // ---- la corona de velas de la nave, enganchada en el cuerno izquierdo
  // (hueso 'corona'): el aro con sus pinchos, las arandelas, las velas (dos
  // rotas, ladeadas) y los cabos de las cadenas que la colgaban de la bóveda
  const flames = [];
  {
    const c = V(...CROWN.c);
    const ax = V(0.26, 1, 0.12).normalize();
    const side = V(0, 0, 1).cross(ax).normalize();
    const fw = ax.clone().cross(side).normalize();
    add('corona', 'iron', torusAround(CROWN.R, 0.06, c, ax, 30, 5));
    add('corona', 'iron', torusAround(CROWN.R * 0.92, 0.035, c.clone().addScaledVector(ax, -0.12), ax, 30, 4));
    const N = 9;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + 0.2;
      const d = side.clone().multiplyScalar(Math.cos(a)).addScaledVector(fw, Math.sin(a));
      const p = c.clone().addScaledVector(d, CROWN.R);
      // pincho hacia fuera (la corona de luz, almenada)
      add('corona', 'iron', tubeGeo([p, p.clone().addScaledVector(d, 0.16).addScaledVector(ax, 0.22)], [0.035, 0.005], { radial: 4, segs: 2 }));
      // arandela y vela
      add('corona', 'iron', hardGeo({ type: 'cyl', s: [0.11, 0.08, 0.06], seg: 6, p: p.clone().addScaledVector(ax, 0.05).toArray(), r: euler(side, ax, fw), mat: 'iron' }));
      const broken = i === 3 || i === 7;
      const h = broken ? R(0.18, 0.3) : R(0.45, 0.85);
      const dir = broken ? ax.clone().addScaledVector(d, 0.9).normalize() : ax.clone();
      const base = p.clone().addScaledVector(ax, 0.08);
      const cX = side.clone().cross(dir).lengthSq() > 0.01 ? dir.clone().cross(side).normalize() : fw.clone();
      add('corona', 'candle', hardGeo({ type: 'cyl', s: [0.085, 0.095, h], seg: 7, p: base.clone().addScaledVector(dir, h / 2).toArray(), r: euler(dir.clone().cross(cX).normalize(), dir, cX), mat: 'candle', ao: false }));
      // goterones
      add('corona', 'candle', hardGeo({ type: 'box', s: [0.05, h * 0.45, 0.04], p: base.clone().addScaledVector(dir, h * 0.4).addScaledVector(d, 0.09).toArray(), r: euler(d.clone().cross(dir).normalize(), dir, d), mat: 'candle' }));
      if (!broken) flames.push({ bone: 'corona', p: base.clone().addScaledVector(dir, h + 0.12).toArray() });
    }
    // los cabos de las cadenas, colgando (y el gancho, sobre el cuerno)
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.9;
      const d = side.clone().multiplyScalar(Math.cos(a)).addScaledVector(fw, Math.sin(a));
      const p = c.clone().addScaledVector(d, CROWN.R * 0.98);
      const L = R(0.5, 1.0);
      for (const g of chainGeo([p, p.clone().add(V(R(-0.1, 0.1), -L * 0.5, R(-0.1, 0.1))), p.clone().add(V(R(-0.15, 0.15), -L, R(-0.15, 0.15)))], 0.09, 0.025)) add('corona', 'iron', g);
    }
  }

  // ---- el asta del estandarte, atravesada en la aureola (rota abajo), y
  // el travesaño del que cuelga
  {
    const P0 = V(-2.6, 16.95, 2.2),
      P1 = V(BANNER.top[0], BANNER.top[1] + 0.05, BANNER.top[2]);
    add('halo', 'wooddark', tubeGeo([P0, P0.clone().lerp(P1, 0.5), P1], [0.08, 0.075, 0.07], { radial: 6, segs: 6 }));
    // la punta rota, astillada
    for (let k = 0; k < 4; k++) {
      const d = P0.clone().sub(P1).normalize().add(V(R(-0.4, 0.4), R(-0.4, 0.4), R(-0.4, 0.4))).normalize();
      add('halo', 'wooddark', tubeGeo([P0, P0.clone().addScaledVector(d, R(0.15, 0.35))], [0.035, 0.004], { radial: 3, segs: 1 }));
    }
    const half = BANNER.w / 2 + 0.15;
    const top = V(...BANNER.top);
    add('halo', 'wooddark', tubeGeo([top.clone().add(V(-half, 0, 0)), top.clone().add(V(half, 0, 0))], [0.055, 0.055], { radial: 6, segs: 2 }));
    for (const s of [-1, 1]) add('halo', 'gold', hardGeo({ type: 'sphere', s: [0.1], seg: 6, seg2: 4, p: top.clone().add(V(s * half, 0, 0)).toArray(), mat: 'gold' }));
    // la cruz de remate del asta
    add('halo', 'gold', hardGeo({ type: 'box', s: [0.06, 0.5, 0.06], p: P1.clone().add(V(-0.05, 0.3, 0)).toArray(), mat: 'gold' }));
    add('halo', 'gold', hardGeo({ type: 'box', s: [0.3, 0.06, 0.06], p: P1.clone().add(V(-0.05, 0.4, 0)).toArray(), mat: 'gold' }));
  }
  return { parts, flames };
}

// ------------------------------------------------------------ el estandarte
// Paño negro de terciopelo con su galón de oro y la cruz bordada, acabado
// en dos colas (cola de golondrina), quemado y roto. Cuelga del travesaño
// (hueso 'halo') y se mece con 'ban0'..'ban2'.
export function bannerGeo(BI) {
  const top = V(...BANNER.top);
  const W = BANNER.w,
    Lb = BANNER.len;
  const nu = 14,
    nv = 26;
  const pos = [],
    nor = [],
    uv = [],
    col = [],
    si = [],
    sw = [];
  const tris = [[], []];
  const hole = (u, v) => {
    // quemaduras y desgarros
    const n = Math.sin(u * 17.3 + v * 9.1) * Math.sin(u * 5.1 - v * 13.7 + 1.3) + Math.sin(v * 7.7 + 2) * 0.3;
    return (n > 0.82 && v > 0.25) || (v > 0.82 && Math.abs(u - 0.5) < (v - 0.82) * 2.6);
  };
  const isGold = (u, v) => {
    const bx = Math.min(u, 1 - u) * W,
      by = v * Lb;
    if (bx < 0.1 || by < 0.12) return true;
    // la cruz bordada
    const cx = Math.abs(u - 0.5) * W,
      cy = Math.abs(v * Lb - 1.25);
    return (cx < 0.09 && v * Lb > 0.55 && v * Lb < 2.15) || (cy < 0.09 && cx < 0.45);
  };
  const P = (i, j) => {
    const u = i / nu,
      v = j / nv;
    const x = (u - 0.5) * W;
    const fold = Math.sin(u * Math.PI * 3 + v * 2.2) * 0.07 * (0.3 + v) + Math.sin(u * 17 + v * 5) * 0.012;
    // la tela cuelga un poco abombada y las colas se abren
    const tail = v > 0.82 ? (u < 0.5 ? -1 : 1) * (v - 0.82) * 0.5 : 0;
    return V(top.x + x + tail, top.y - 0.06 - v * Lb, top.z + fold + Math.sin(v * Math.PI) * 0.06);
  };
  const bones = (v) => {
    // arriba, el travesaño (la aureola); después, los tres huesos de la tela
    const L = [
      [0, BI.halo],
      [0.12, BI.ban0],
      [0.45, BI.ban1],
      [0.78, BI.ban2],
    ];
    for (let k = L.length - 1; k >= 0; k--) {
      if (v >= L[k][0]) {
        if (k === L.length - 1) return [[L[k][1], 1]];
        const w = (v - L[k][0]) / (L[k + 1][0] - L[k][0]);
        return [
          [L[k][1], 1 - w],
          [L[k + 1][1], w],
        ];
      }
    }
    return [[BI.halo, 1]];
  };
  const idx = [];
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++) {
      const p = P(i, j);
      idx.push(pos.length / 3);
      pos.push(p.x, p.y, p.z);
      nor.push(0, 0, 1);
      uv.push((i / nu) * W * 0.8, (j / nv) * Lb * 0.8);
      const v = j / nv;
      const k = 0.8 - v * 0.25 + Math.sin(i * 1.7 + j * 0.9) * 0.05;
      col.push(k, k * 0.97, k * 0.95);
      const b = bones(v);
      si.push(b[0][0], b[1] ? b[1][0] : 0, 0, 0);
      sw.push(b[0][1], b[1] ? b[1][1] : 0, 0, 0);
    }
  const at = (i, j) => idx[j * (nu + 1) + i];
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const u = (i + 0.5) / nu,
        v = (j + 0.5) / nv;
      if (hole(u, v)) continue;
      const m = isGold(u, v) ? 1 : 0;
      tris[m].push(at(i, j), at(i, j + 1), at(i + 1, j + 1), at(i, j), at(i + 1, j + 1), at(i + 1, j));
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  const all = [...tris[0], ...tris[1]];
  g.setIndex(all);
  g.addGroup(0, tris[0].length, 0);
  g.addGroup(tris[0].length, tris[1].length, 1);
  g.computeVertexNormals();
  return g;
}
