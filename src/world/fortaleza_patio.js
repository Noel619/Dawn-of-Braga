// El patio de honor (PLAN_FORTALEZA.md, §5.3): el centro de la fortaleza.
// Desde él se ven las cuatro crujías y la torre entera, y a él se vuelve.
//
// Sus muros (con las puertas de las salas: las grandes del gran salón al
// oeste, la de la capilla en el mismo eje al este, la de la cancillería, la de
// la despensa y la del cuerpo de guardia al sur, las de las cámaras de la reina
// y del Rey a los lados de la torre), el claustro en tres lados (una galería de
// arcos sobre columnas con su tejaroz), la escalinata de la torre en el cuarto,
// en el eje de la puerta, y en medio, cruzados los dos ejes, la fuente seca;
// el olmo del Rey y el brocal del aljibe del palacio.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, blocker, stairs, archedWall, archRing } from './builders.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';
import { FORT } from './fortaleza_medidas.js';
import { PIEDRA, plano, asoma, cara, vano, ajimez, arcada, tejaroz, antepecho, pieza } from './fortaleza_atrezo.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);

export function buildPatio(ctx, S, L) {
  muros(ctx, S, L);
  claustro(ctx);
  escalinata(ctx, S, L);
  enmedio(ctx, S, L);
}

// ------------------------------------------------------------------------ los muros del patio
// De 1,2 m. La franja de abajo (hasta el tejaroz del claustro) con los vanos
// de las puertas; encima, hasta el alero o la terraza, liso, con los ajimeces
// de la planta alta. Cada cara con la luz de su sala.
function muros(ctx, S, L) {
  const wb = ctx.wb;
  const Pt = FORT.patio,
    E = FORT.eave,
    ti = FORT.ti,
    yH = FORT.claustro.yHi,
    walk = FORT.walk;
  const Sa = FORT.salon,
    C = FORT.capilla,
    Cn = FORT.cancilleria,
    R = FORT.reina,
    K = FORT.rey,
    D = FORT.despensa,
    G = FORT.guardia,
    Pu = FORT.puerta;
  const tint = PIEDRA.patio;
  const ring = { ring: 0.3, tint: PIEDRA.silla };
  // (una franja de abajo con sus puertas: archedWall; rooms: [lado de menos t,
  // lado de más t])
  const franja = (axis, a0, a1, t0, t1, y1, ops, rooms) => archedWall(ctx, { axis, a0, a1, t0, t1, y0: 0, y1, openings: ops, mat: 'wallstone', tint, rooms, sub: 2 });
  // poniente: el gran salón (a doble altura); las puertas grandes
  {
    const x0 = Pt.x0 - ti,
      x1 = Pt.x0;
    franja('z', Sa.z0 - ti, Sa.z1 + 2.4, x0, x1, yH, [{ c: Sa.puerta, w: 2.6, h: 3.4, rise: 1.3, ring: 0.42, tint: PIEDRA.silla }], ['salon', null]);
    pieza(ctx, 'wallstone', x0, yH, Sa.z0 - ti, x1, E, Sa.z1 + 2.4, [['w', 'salon'], ['e', null]], { tint, baseY: 0 });
    // (su cabo del sur, en la despensa)
    wb.box('wallstone', x0, 0, Pt.z1 + ti - 0.01, x1, FORT.F1, Pt.z1 + ti, { faces: 's', room: 'despensa', tint, sub: 2 });
    W(S, x0 - 0.3, Sa.puerta - 1.2, x1 + 0.3, Sa.puerta + 1.2);
    // la portada: dos columnas con sus capiteles y el escudo encima
    for (const s of [-1, 1]) {
      const z = Sa.puerta + s * 1.75;
      wb.cylinder('ashlar', x1 + 0.2, 0, z, 0.15, 0.15, 3.4, 8, { ao: false, tint: PIEDRA.silla });
      wb.box('ashlar', x1, 3.4, z - 0.24, x1 + 0.44, 3.62, z + 0.24, { ao: false, faces: 'tnsewb', tint: PIEDRA.silla });
      ctx.col.add(x1, 0, z - 0.16, x1 + 0.36, 3.4, z + 0.16);
    }
    for (const z of [-84, -76, -60, -52]) ajimez(ctx, 'e', x1, z, 6.9, { h: 1.25, lit: true, intensity: 0.7, radius: 5 });
    for (const z of [-80, -56]) vano(ctx, 'e', x1, z, 2.4, 0.42, 0.9, { lit: true, intensity: 0.4, radius: 3 });
    L.interact.push({ kind: 'door', id: 'd_sala', x: x0 + ti / 2, y: 0, z: Sa.puerta, w: 2.6, h: 3.4 + 1.3, arch: true, axis: 'z', mat: 'planks', double: true, hinge: 0, swing: -1, plane: x0, inset: 0.08, mark: 'cross', lock: { type: 'barred', side: -1 }, barredMsg: 'salaAtrancada' });
  }
  // levante: la capilla (a doble altura) y la cancillería (con su terraza)
  {
    const x0 = Pt.x1,
      x1 = Pt.x1 + ti;
    franja('z', C.z0, C.z1, x0, x1, yH, [{ c: C.puerta, w: 2.2, h: 2.5, rise: 1.1, ring: 0.38, tint: PIEDRA.silla }], [null, 'capilla']);
    pieza(ctx, 'wallstone', x0, yH, C.z0, x1, E, C.z1, [['w', null], ['e', 'capilla']], { tint, baseY: 0 });
    franja('z', C.z1, Pt.z1, x0, x1, yH, [{ c: Cn.puerta, w: 1.6, h: 2.6, rise: 0.8, ...ring }], [null, 'cancilleria']);
    pieza(ctx, 'wallstone', x0, yH, C.z1, x1, walk, Pt.z1, [['w', null]], { tint, baseY: 0 });
    W(S, x0 - 0.3, C.puerta - 1.0, x1 + 0.3, C.puerta + 1.0);
    W(S, x0 - 0.3, Cn.puerta - 0.7, x1 + 0.3, Cn.puerta + 0.7);
    // la portada de la capilla: el arco de tres roscas y la cruz encima
    for (let k = 0; k < 2; k++) {
      const w = 2.2 + 0.76 + k * 0.56;
      archRing(ctx, { axis: 'z', c: C.puerta, w, y0: 2.5, rise: w / 2, ring: 0.26, t0: x0 - 0.1 - k * 0.08, t1: x0 + 0.01, mat: 'ashlar', tint: PIEDRA.silla.map((v) => v * (1 - k * 0.05)), proud: 0, cam: false, n: 9 });
      for (const s of [-1, 1]) wb.box('ashlar', x0 - 0.1 - k * 0.08, 0, C.puerta + s * (w / 2) - (s > 0 ? 0 : 0.26), x0, 2.5, C.puerta + s * (w / 2) + (s > 0 ? 0.26 : 0), { ao: false, faces: 'wnstb', tint: PIEDRA.silla });
    }
    wb.box('ashlar', x0 - 0.12, 4.85, C.puerta - 0.06, x0, 5.75, C.puerta + 0.06, { ao: false, faces: 'wnstb', tint: PIEDRA.silla });
    wb.box('ashlar', x0 - 0.12, 5.35, C.puerta - 0.3, x0, 5.47, C.puerta + 0.3, { ao: false, faces: 'wnstb', tint: PIEDRA.silla });
    // las ventanas altas de la capilla (encendidas: las velas del altar) y la
    // de la cancillería
    for (const z of [-76, -71.2, -62.5]) vano(ctx, 'w', x0, z, 6.6, 0.55, 1.6, { lit: true, intensity: 0.6, radius: 5 });
    for (const z of [-56, -49.5]) ajimez(ctx, 'w', x0, z, 7.2, { h: 1.2 });
    L.interact.push(
      { kind: 'door', id: 'd_capilla', x: x0 + ti / 2, y: 0, z: C.puerta, w: 2.2, h: 2.5 + 1.1, arch: true, axis: 'z', mat: 'planks', double: true, hinge: 0, swing: 1, plane: x1, inset: 0.06, mark: 'cross', lock: { type: 'none' } },
      { kind: 'door', id: 'd_cancilleria', x: x0 + ti / 2, y: 0, z: Cn.puerta, w: 1.6, h: 2.6 + 0.8, arch: true, axis: 'z', mat: 'planks', hinge: -1, swing: 1, plane: x1, inset: 0.06, ajar: 0.25, lock: { type: 'none' } }
    );
  }
  // norte: las cámaras de la reina y las del Rey, a los lados de la torre
  for (const [a, b, Rm, room, alta, yA, lit] of [
    [Pt.x0, R.x1, R, 'estrado_damas', 'reina_alta', FORT.F1, true],
    [K.x0, Pt.x1, K, 'antecamara', 'camara_rey', K.alto, false],
  ]) {
    const z0 = Pt.z0 - ti,
      z1 = Pt.z0;
    // (la franja de abajo, hasta el suelo de la sala de arriba; de ahí al
    // alero, con su cara de dentro)
    franja('x', a, b, z0, z1, yA, [{ c: Rm.puerta, w: 1.6, h: 2.5, rise: 0.8, ...ring }], [room, null]);
    pieza(ctx, 'wallstone', a, yA, z0, b, E, z1, [['s', null], ['n', alta, yA, E, [0.8, 0.76, 0.7]]], { tint, baseY: 0 });
    W(S, Rm.puerta - 0.7, z0 - 0.3, Rm.puerta + 0.7, z1 + 0.3);
    ajimez(ctx, 's', z1, Rm.puerta, 6.9, { h: 1.25, lit, intensity: 0.5, radius: 4 });
    vano(ctx, 's', z1, Rm.puerta + (lit ? -2.6 : 2.2), 2.6, 0.42, 0.9);
  }
  L.interact.push(
    { kind: 'door', id: 'd_reina', x: R.puerta, y: 0, z: Pt.z0 - ti / 2, w: 1.6, h: 2.5 + 0.8, arch: true, axis: 'x', mat: 'planks', hinge: -1, swing: 1, plane: Pt.z0 - ti, inset: 0.06, lock: { type: 'none' } },
    { kind: 'door', id: 'd_antecamara', x: K.puerta, y: 0, z: Pt.z0 - ti / 2, w: 1.6, h: 2.5 + 0.8, arch: true, axis: 'x', mat: 'planks', hinge: 1, swing: 1, plane: Pt.z0 - ti, inset: 0.06, lock: { type: 'barred', side: -1 }, barredMsg: 'antecamaraTranca' }
  );
  // sur: la despensa y el cuerpo de guardia, a los lados de la puerta (hasta
  // la terraza)
  for (const [a, b, Rm, room] of [
    [Pt.x0, Pu.x0, D, 'despensa'],
    [Pu.x1, Pt.x1, G, 'guardia'],
  ]) {
    const z0 = Pt.z1,
      z1 = Pt.z1 + ti;
    franja('x', a, b, z0, z1, yH, [{ c: Rm.puerta, w: 1.6, h: 2.6, rise: 0.8, ...ring }], [null, room]);
    pieza(ctx, 'wallstone', a, yH, z0, b, walk, z1, [['n', null]], { tint, baseY: 0 });
    W(S, Rm.puerta - 0.7, z0 - 0.3, Rm.puerta + 0.7, z1 + 0.3);
    for (const x of [a + 3.5, b - 3.5]) ajimez(ctx, 'n', z0, x, 7.0, { h: 1.2 });
  }
  L.interact.push(
    { kind: 'door', id: 'd_despensa', x: D.puerta, y: 0, z: Pt.z1 + ti / 2, w: 1.6, h: 2.6 + 0.8, arch: true, axis: 'x', mat: 'planks', hinge: -1, swing: -1, plane: Pt.z1 + ti, inset: 0.06, ajar: 0.2, lock: { type: 'none' } },
    { kind: 'door', id: 'd_guardia', x: G.puerta, y: 0, z: Pt.z1 + ti / 2, w: 1.6, h: 2.6 + 0.8, arch: true, axis: 'x', mat: 'planks', hinge: 1, swing: -1, plane: Pt.z1 + ti, inset: 0.06, lock: { type: 'none' } }
  );
  // la imposta corrida del claustro, por encima del tejaroz, y la cornisa de
  // los muros de las crujías bajo el alero
  for (const [d, line, a, b] of [
    ['e', Pt.x0, Pt.z0, Pt.z1],
    ['w', Pt.x1, Pt.z0, Pt.z1],
    ['s', Pt.z0, Pt.x0, R.x1],
    ['s', Pt.z0, K.x0, Pt.x1],
    ['n', Pt.z1, Pt.x0, Pu.x0],
    ['n', Pt.z1, Pu.x1, Pt.x1],
  ]) {
    const F = plano(d, line);
    wb.box('ashlar', ...F.box(a, yH + 0.05, b, yH + 0.25, -0.01, 0.14), { ao: false, faces: asoma(d), tint: PIEDRA.silla });
  }
}

// ------------------------------------------------------------------------ el claustro
// Tres galerías (oeste, este y sur) de nueve arcos de medio punto sobre
// columnas, con su tejaroz de teja contra los muros: la del sur, con el arco de
// en medio en el eje de la puerta.
function claustro(ctx) {
  const wb = ctx.wb;
  const Pt = FORT.patio,
    Cl = FORT.claustro,
    d = Cl.d;
  const zs = [];
  for (let z = Pt.z0; z <= Pt.z1 - d + 0.01; z += 4) zs.push(z);
  const xs = [];
  for (let x = Pt.x0 + d; x <= Pt.x1 - d + 0.01; x += 4) xs.push(x);
  // las arquerías (las columnas de las esquinas, con las galerías de los
  // lados; los cabos del norte, en sus responsiones contra el muro)
  arcada(ctx, 'z', Pt.x0 + d, zs, Cl.ys, Cl.top, { ends: [false, true] });
  arcada(ctx, 'z', Pt.x1 - d, zs, Cl.ys, Cl.top, { ends: [false, true] });
  arcada(ctx, 'x', Pt.z1 - d, xs, Cl.ys, Cl.top, { ends: [false, false] });
  // las responsiones: medias columnas contra el muro del norte
  for (const x of [Pt.x0 + d, Pt.x1 - d]) {
    wb.box('ashlar', x - 0.28, 0, Pt.z0, x + 0.28, Cl.ys - 0.14, Pt.z0 + 0.22, { faces: 'tsew', sub: 2, aoH: 0.5, tint: PIEDRA.patio });
    wb.box('ashlar', x - 0.38, Cl.ys - 0.14, Pt.z0, x + 0.38, Cl.ys, Pt.z0 + 0.34, { ao: false, faces: 'tsewb', tint: PIEDRA.patio });
    ctx.col.add(x - 0.28, 0, Pt.z0, x + 0.28, Cl.ys, Pt.z0 + 0.22);
  }
  // los tejaroces (en inglete en las dos esquinas del sur)
  tejaroz(ctx, 'e', Pt.x0, Pt.z0, Pt.z1, d, Cl.yHi, Cl.yLo, { cut: [0, -1] });
  tejaroz(ctx, 'w', Pt.x1, Pt.z0, Pt.z1, d, Cl.yHi, Cl.yLo, { cut: [0, -1] });
  tejaroz(ctx, 'n', Pt.z1, Pt.x0, Pt.x1, d, Cl.yHi, Cl.yLo, { cut: [-1, -1] });
  // los suelos de las galerías (enlosados) y el escalón de las arquerías
  const fl = { faces: 't', ao: false, sub: 2.4, uv: 0.7, tint: [0.74, 0.71, 0.66] };
  wb.box('flag', Pt.x0, -0.05, Pt.z0, Pt.x0 + d, 0.03, Pt.z1, fl);
  wb.box('flag', Pt.x1 - d, -0.05, Pt.z0, Pt.x1, 0.03, Pt.z1, fl);
  wb.box('flag', Pt.x0 + d, -0.05, Pt.z1 - d, Pt.x1 - d, 0.03, Pt.z1, fl);
  // las vigas del techo de las galerías, de muro a arquería (bajo el tejaroz)
  // y las antorchas entre los vanos
  const libre = (c, puertas) => puertas.every((q) => Math.abs(c - q) > 2.1);
  for (const z of zs.slice(1)) {
    const c = z - 2;
    if ((Math.round(c) / 4) % 2 === 0) continue;
    if (libre(c, [FORT.salon.puerta])) P.wallTorch(ctx, Pt.x0 + 0.02, 2.5, c, 'e', {});
    if (libre(c, [FORT.capilla.puerta, FORT.cancilleria.puerta])) P.wallTorch(ctx, Pt.x1 - 0.02, 2.5, c, 'w', {});
  }
  for (const x of [-110, -86]) P.wallTorch(ctx, x, 2.5, Pt.z1 - 0.02, 'n', {});
}

// ------------------------------------------------------------------------ la escalinata
// Contra la cara del patio de la torre, en el eje: dos tramos de veinte
// peldaños que suben de los lados al rellano de la puerta de la guardia (a
// +6), con su pretil escalonado; bajo el rellano, el arco cegado de la puerta
// del almacén.
function escalinata(ctx, S, L) {
  const wb = ctx.wb;
  const Es = FORT.escalinata,
    Pt = FORT.patio,
    K = FORT.torre;
  const y = K.puerta.y;
  const z0 = Pt.z0,
    zf = z0 + Es.w; // el borde de los tramos
  const zc = (z0 + zf) / 2;
  const tint = [1.0, 0.97, 0.92];
  const L1 = Es.n * Es.run;
  // los tramos (macizos), con huella de losa y tabica de sillería
  for (const [x, dir] of [
    [Es.x0 - L1, 'e'],
    [Es.x1 + L1, 'w'],
  ]) {
    for (let i = 0; i < Es.n; i++) {
      const a = dir === 'e' ? x + i * Es.run : x - (i + 1) * Es.run,
        b = a + Es.run;
      const top = (i + 1) * Es.rise;
      solid(ctx, 'wallstone', a, 0, z0, b, top, zf, { faces: 'ts' + (dir === 'e' ? 'w' : 'e'), sub: 2, aoH: 1.2, tint: tint.map((v) => v * (i % 2 ? 0.97 : 1.02)), mats: { t: 'flag', w: 'ashlar', e: 'ashlar' } });
      // el pretil, escalonado
      const yp = top + 0.95;
      solid(ctx, 'wallstone', a, top, zf, b, yp, zf + 0.42, { faces: 'tswe', sub: 2, ao: false, tint: PIEDRA.patio });
      wb.box('wallstone', a, 0, zf, b, top, zf + 0.42, { faces: 's', sub: 2, aoH: 1.2, tint: PIEDRA.patio });
      ctx.col.add(a, 0, zf, b, top, zf + 0.42);
    }
    // el arranque del pretil: un poyo con su bola
    const xa = dir === 'e' ? x - 0.5 : x,
      xb = xa + 0.5;
    solid(ctx, 'ashlar', xa, 0, zf - 0.05, xb, 1.15, zf + 0.47, { faces: 'tnsew', sub: 2, tint: PIEDRA.silla });
    wb.cylinder('ashlar', (xa + xb) / 2, 1.15, zf + 0.21, 0.2, 0.2, 0.3, 8, { ao: false, capTop: true, tint: PIEDRA.silla });
  }
  // el rellano, ante la puerta: su macizo, su enlosado y su pretil (a ras de
  // los de los tramos)
  const zl = zf + 0.42;
  solid(ctx, 'wallstone', Es.x0, 0, z0, Es.x1, y, zl, { faces: 'ts', sub: 2, aoH: 2, tint, mats: { t: 'flag' } });
  solid(ctx, 'wallstone', Es.x0, y, zf, Es.x1, y + 0.95, zl, { faces: 'tsn', sub: 2, ao: false, tint: PIEDRA.patio });
  // el arco cegado del almacén, bajo el rellano: las tablas y la cadena
  {
    const cx = (Es.x0 + Es.x1) / 2;
    archRing(ctx, { axis: 'x', c: cx, w: 2.0, y0: 2.0, rise: 1.0, ring: 0.3, t0: zl - 0.02, t1: zl + 0.1, mat: 'ashlar', tint: PIEDRA.silla, proud: 0, cam: false, n: 9 });
    for (const s of [-1, 1]) wb.box('ashlar', cx + s * 1.0 - (s > 0 ? 0 : 0.3), 0, zl, cx + s * 1.0 + (s > 0 ? 0.3 : 0), 2.0, zl + 0.1, { ao: false, faces: 'swetb', tint: PIEDRA.silla });
    wb.box('planks', cx - 1.0, 0, zl + 0.01, cx + 1.0, 2.0, zl + 0.05, { ao: false, faces: 's', tint: [0.46, 0.4, 0.34] });
    const n = 8;
    for (let k = 0; k < n; k++) {
      const a = Math.PI - (k / n) * Math.PI,
        b = Math.PI - ((k + 1) / n) * Math.PI;
      cara(wb, 'planks', V(cx, 2.0, zl + 0.05), V(cx + Math.cos(a), 2.0 + Math.sin(a), zl + 0.05), V(cx + Math.cos(b), 2.0 + Math.sin(b), zl + 0.05), V(cx + Math.cos(b), 2.0 + Math.sin(b), zl + 0.05), V(0, 0, 1), { ao: false, tint: [0.42, 0.37, 0.32] });
    }
    for (const yy of [0.6, 1.5]) wb.box('iron', cx - 1.0, yy - 0.05, zl + 0.05, cx + 1.0, yy + 0.05, zl + 0.08, { ao: false });
    wb.box('iron', cx - 0.1, 0.9, zl + 0.08, cx + 0.1, 1.2, zl + 0.12, { ao: false });
    L.interact.push({ kind: 'examine', id: 'x_almacen_torre', text: 'almacenTorre', x: cx, y: 0, z: zl + 1.0, r: 1.4 });
  }
  // los braseros al pie de los tramos
  P.brazier(ctx, Es.x0 - L1 - 1.4, 0, zf + 1.4, {});
  P.brazier(ctx, Es.x1 + L1 + 1.4, 0, zf + 1.4, {});
  // (por donde se pisa: los tramos y el rellano son macizos con su colisión;
  // la rejilla de la superficie, abierta por todo el patio)
  W(S, Pt.x0, Pt.z0, Pt.x1, Pt.z1);
}

// ------------------------------------------------------------------------ lo de en medio
// El enlosado de los dos ejes sobre el empedrado; en el cruce, la fuente seca
// (su taza, su pilar y el caño); el olmo del Rey con sus papelillos clavados;
// el brocal del aljibe; lo que dejó la corte en el patio; quién queda.
function enmedio(ctx, S, L) {
  const wb = ctx.wb;
  const Pt = FORT.patio,
    d = FORT.claustro.d;
  const rng = new RNG(8901);
  const x0 = Pt.x0 + d,
    x1 = Pt.x1 - d,
    z0 = Pt.z0,
    z1 = Pt.z1 - d;
  const ex = FORT.eje,
    ez = FORT.salon.puerta;
  // el empedrado y las fajas de losa de los ejes (con su bordillo)
  wb.box('cobble', x0, -0.05, z0, x1, 0.02, z1, { faces: 't', ao: false, sub: 2.6, uv: 0.8, tint: [0.78, 0.75, 0.7] });
  wb.box('flag', ex - 1.6, 0.02, z0 + 3.4, ex + 1.6, 0.04, z1, { faces: 't', ao: false, sub: 2.4, uv: 0.7, tint: [0.84, 0.8, 0.74] });
  wb.box('flag', x0, 0.02, ez - 1.6, x1, 0.04, ez + 1.6, { faces: 't', ao: false, sub: 2.4, uv: 0.7, tint: [0.84, 0.8, 0.74] });
  // la fuente: la taza ochavada, el pilar, la copa y el caño, seca
  {
    const fx = ex,
      fz = ez;
    wb.cylinder('ashlar', fx, 0, fz, 3.0, 3.0, 0.62, 8, { capTop: false, tint: PIEDRA.silla, sub: 2 });
    wb.cylinder('ashlar', fx, 0.62, fz, 3.08, 3.08, 0.1, 8, { ao: false, capTop: true, tint: PIEDRA.silla });
    wb.cylinder('black', fx, 0.4, fz, 2.7, 2.7, 0.33, 8, { ao: false, capTop: true, grime: false, tint: [0.35, 0.33, 0.3] });
    wb.cylinder('dirt', fx, 0.6, fz, 2.62, 2.62, 0.14, 8, { ao: false, capTop: true, tint: [0.42, 0.38, 0.32] });
    wb.cylinder('ashlar', fx, 0.7, fz, 0.42, 0.34, 1.6, 8, { ao: false, tint: PIEDRA.silla });
    wb.cylinder('ashlar', fx, 2.3, fz, 0.32, 1.05, 0.38, 8, { ao: false, capTop: true, tint: PIEDRA.silla });
    wb.cylinder('ashlar', fx, 2.68, fz, 0.16, 0.12, 0.7, 8, { ao: false, capTop: true, tint: PIEDRA.silla });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      wb.box('bronzeAged', fx + Math.cos(a) * 0.9 - 0.04, 2.54, fz + Math.sin(a) * 0.9 - 0.04, fx + Math.cos(a) * 1.15 + 0.04, 2.6, fz + Math.sin(a) * 1.15 + 0.04, { ao: false });
    }
    ctx.col.add(fx - 2.85, 0, fz - 2.85, fx + 2.85, 0.72, fz + 2.85);
    ctx.col.add(fx - 0.5, 0.7, fz - 0.5, fx + 0.5, 3.4, fz + 0.5);
    P.dropped(ctx, fx + 1.4, 0.62, fz + 0.6, 1.1, 'helmet');
    L.interact.push({ kind: 'examine', id: 'x_fuente_patio', text: 'fuentePatio', x: fx, y: 0, z: fz + 3.6, r: 1.6 });
  }
  // el olmo del Rey: el alcorque de piedra, el árbol seco y los papelillos
  {
    const ox = ex - 10,
      oz = ez - 8;
    solid(ctx, 'ashlar', ox - 1.6, 0, oz - 1.6, ox + 1.6, 0.42, oz + 1.6, { faces: 'tnsew', sub: 2, tint: PIEDRA.silla, mats: { t: 'dirt' } });
    P.deadTree(ctx, ox, 0.42, oz, 8905, 7.2);
    for (let k = 0; k < 26; k++) {
      const a = rng.range(0, Math.PI * 2),
        y = rng.range(0.9, 2.3);
      wb.at(ox + Math.cos(a) * 0.32, 0.42 + y, oz + Math.sin(a) * 0.32, -a + Math.PI / 2, () => wb.box('clothWhite', -0.06, -0.08, 0, 0.06, 0.08, 0.01, { ao: false, grime: false, tint: [0.86, 0.8, 0.66] }));
    }
    L.interact.push({ kind: 'examine', id: 'x_olmo', text: 'olmoRey', x: ox + 1.9, y: 0, z: oz + 1.2, r: 2.2 });
    L.enemies.push({ type: 'cortesanoSuelto', x: ox + 1.6, y: 0, z: oz + 2.0, yaw: Math.PI + 0.6, idle: 'kneel', id: 'e_fp1' }, { type: 'cortesanoSuelto', x: ox - 1.9, y: 0, z: oz + 1.2, yaw: Math.PI - 0.8, idle: 'kneel', id: 'e_fp2' });
  }
  // el brocal del aljibe del palacio
  {
    const bx = ex + 9.5,
      bz = ez + 9;
    P.well(ctx, bx, 0, bz, {});
    L.enemies.push({ type: 'bell', x: bx - 2.4, y: 0, z: bz - 1.4, yaw: 0.8, idle: 'stand', id: 'e_fp3' });
  }
  // lo que dejó la corte: un banco volcado, una litera, ropa, un caído
  P.bench(ctx, ex + 6.2, 0, ez - 9.4, 2.0, 0.3);
  bakeCorpse(wb, ex - 5.2, 0, ez + 7.6, 2.2, 'back', 'villager', 41);
  P.decal(ctx, ex - 5.2, 0.05, ez + 7.6, 1.8);
  bakeCorpse(wb, ex + 12.6, 0, ez - 13, -1.0, 'face', 'soldier', 42);
  P.dropped(ctx, ex + 13.4, 0.02, ez - 12.2, 0.6, 'sword');
  P.cart(ctx, ex - 13.6, 0, ez + 11.2, 0.35, {});
  P.sacks(ctx, ex - 15.8, 0, ez + 13, 3, 8910);
  P.barrel(ctx, ex + 15.4, 0, ez + 13.6, {});
  for (let i = 0; i < 6; i++) P.weeds(ctx, rng.range(x0 + 1, x1 - 1), 0.02, rng.range(z0 + 5, z1 - 1), 4, 8920 + i, 0.5);
  // las rondas: un soldado ante la puerta, otro en la galería de levante
  L.enemies.push({ type: 'soldier', x: ex + 2.5, y: 0, z: z1 - 1.5, yaw: Math.PI, idle: 'stand', id: 'e_fp4' }, { type: 'mourner', x: Pt.x0 + 1.6, y: 0, z: ez + 6, yaw: Math.PI / 2, idle: 'stand', id: 'e_fp5' });
  // zonas y mapa
  L.zones.push({ id: 'fort_patio', rects: [[Pt.x0, Pt.z0, Pt.x1, Pt.z1, -1, 24]], atmo: 'castillo' });
  L.map.push({ id: 'fort_patio', r: [Pt.x0, Pt.z0, Pt.x1, Pt.z1] });
}
