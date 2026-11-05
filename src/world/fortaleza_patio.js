// El patio de honor (PLAN_FORTALEZA.md, §5.3): el centro de la fortaleza.
// Desde él se ven las cuatro crujías y la torre entera, y a él se vuelve.
//
// Sus muros (con las puertas de las salas: las grandes del gran salón al
// oeste, la de la capilla en el mismo eje al este, la de la cancillería, la de
// la despensa y la del cuerpo de guardia al sur, las de las cámaras de la reina
// y del Rey a los lados de la torre), el claustro en tres lados (una galería de
// arcos sobre columnas y, encima, el paseo de las cámaras: un corredor de
// madera con su tejaroz), la escalinata de la torre en el cuarto, en el eje
// de la puerta, y en medio, cruzados los dos ejes, la fuente seca; el olmo del
// Rey y el brocal del aljibe del palacio.
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
  paseo(ctx, S, L);
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
    Pu = FORT.puerta,
    Pa = FORT.claustro.paseo;
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
    // (la franja, hasta el suelo de la tribuna; encima, con la puerta del
    // paseo de las cámaras a la tribuna, hasta el alero)
    franja('z', C.z0, C.z1, x0, x1, K.alto, [{ c: C.puerta, w: 2.2, h: 2.5, rise: 1.1, ring: 0.38, tint: PIEDRA.silla }], [null, 'capilla']);
    archedWall(ctx, { axis: 'z', a0: C.z0, a1: C.z1, t0: x0, t1: x1, y0: K.alto, y1: E, openings: [{ c: Pa.tribuna, w: 1.2, h: Pa.y - K.alto + 2.15, rise: 0.6, ring: 0.26, tint: PIEDRA.silla }], mat: 'wallstone', tint, rooms: [null, 'capilla'], sub: 2, baseY: 0 });
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
    // (la cruz, sobre el arco y bajo las vigas del paseo)
    wb.box('ashlar', x0 - 0.12, 4.56, C.puerta - 0.06, x0, 5.0, C.puerta + 0.06, { ao: false, faces: 'wnstb', tint: PIEDRA.silla });
    wb.box('ashlar', x0 - 0.12, 4.72, C.puerta - 0.22, x0, 4.82, C.puerta + 0.22, { ao: false, faces: 'wnstb', tint: PIEDRA.silla });
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
    // (encima, la puerta del paseo de las cámaras: a nivel en la sala de la
    // reina; a la cámara del Rey, un metro más baja, se baja por el grueso)
    const pd = alta === 'reina_alta' ? Pa.reina : Pa.rey;
    archedWall(ctx, { axis: 'x', a0: a, a1: b, t0: z0, t1: z1, y0: yA, y1: E, openings: [{ c: pd, w: 1.2, h: Pa.y - yA + 2.15, rise: 0.6, ring: 0.26, tint: PIEDRA.silla }], mat: 'wallstone', tints: [[0.8, 0.76, 0.7], tint], rooms: [alta, null], sub: 2, baseY: 0 });
    W(S, Rm.puerta - 0.7, z0 - 0.3, Rm.puerta + 0.7, z1 + 0.3);
    ajimez(ctx, 's', z1, Rm.puerta, 6.9, { h: 1.25, lit, intensity: 0.5, radius: 4 });
    vano(ctx, 's', z1, Rm.puerta + (lit ? -2.6 : 2.2), 2.6, 0.42, 0.9);
  }
  L.interact.push(
    { kind: 'door', id: 'd_reina', x: R.puerta, y: 0, z: Pt.z0 - ti / 2, w: 1.6, h: 2.5 + 0.8, arch: true, axis: 'x', mat: 'planks', hinge: -1, swing: 1, plane: Pt.z0 - ti, inset: 0.06, lock: { type: 'none' } },
    { kind: 'door', id: 'd_antecamara', x: K.puerta, y: 0, z: Pt.z0 - ti / 2, w: 1.6, h: 2.5 + 0.8, arch: true, axis: 'x', mat: 'planks', hinge: 1, swing: 1, plane: Pt.z0 - ti, inset: 0.06, lock: { type: 'barred', side: -1 }, barredMsg: 'antecamaraTranca' }
  );
  // sur: la despensa y el cuerpo de guardia, a los lados de la puerta (hasta
  // la terraza; la franja de la guardia, hasta su techo: encima están la
  // armería y el taller, que ponen su cara en fortaleza_puerta.js)
  for (const [a, b, Rm, room, yF] of [
    [Pt.x0, Pu.x0, D, 'despensa', yH],
    [Pu.x1, Pt.x1, G, 'guardia', FORT.F1 - 0.3],
  ]) {
    const z0 = Pt.z1,
      z1 = Pt.z1 + ti;
    franja('x', a, b, z0, z1, yF, [{ c: Rm.puerta, w: 1.6, h: 2.6, rise: 0.8, ...ring }], [null, room]);
    pieza(ctx, 'wallstone', a, yF, z0, b, walk, z1, [['n', null]], { tint, baseY: 0 });
    W(S, Rm.puerta - 0.7, z0 - 0.3, Rm.puerta + 0.7, z1 + 0.3);
    for (const x of [a + 3.5, b - 3.5]) ajimez(ctx, 'n', z0, x, 7.0, { h: 1.2 });
  }
  L.interact.push(
    { kind: 'door', id: 'd_despensa', x: D.puerta, y: 0, z: Pt.z1 + ti / 2, w: 1.6, h: 2.6 + 0.8, arch: true, axis: 'x', mat: 'planks', hinge: -1, swing: -1, plane: Pt.z1 + ti, inset: 0.06, ajar: 0.2, lock: { type: 'none' } },
    { kind: 'door', id: 'd_guardia', x: G.puerta, y: 0, z: Pt.z1 + ti / 2, w: 1.6, h: 2.6 + 0.8, arch: true, axis: 'x', mat: 'planks', hinge: 1, swing: -1, plane: Pt.z1 + ti, inset: 0.06, lock: { type: 'none' } }
  );
  // la imposta corrida del claustro, por encima del tejaroz del paseo (en
  // los muros del norte, sin él, a la altura de antes y sin entrar en el
  // paseo)
  const dP = FORT.claustro.d,
    yI = Pa.yHi;
  for (const [d, line, a, b, y] of [
    ['e', Pt.x0, Pt.z0, Pt.z1, yI],
    ['w', Pt.x1, Pt.z0, Pt.z1, yI],
    ['s', Pt.z0, Pt.x0 + dP + 0.45, R.x1, yH],
    ['s', Pt.z0, K.x0, Pt.x1 - dP - 0.45, yH],
    ['n', Pt.z1, Pt.x0, Pu.x0, yI],
    ['n', Pt.z1, Pu.x1, Pt.x1, yI],
  ]) {
    const F = plano(d, line);
    wb.box('ashlar', ...F.box(a, y + 0.05, b, y + 0.25, -0.01, 0.14), { ao: false, faces: asoma(d), tint: PIEDRA.silla });
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
  // (el techo de las galerías es el suelo del paseo de las cámaras: paseo())
  // los suelos de las galerías (enlosados) y el escalón de las arquerías
  const fl = { faces: 't', ao: false, sub: 2.4, uv: 0.7, tint: [0.74, 0.71, 0.66] };
  wb.box('flag', Pt.x0, -0.05, Pt.z0, Pt.x0 + d, 0.03, Pt.z1, fl);
  wb.box('flag', Pt.x1 - d, -0.05, Pt.z0, Pt.x1, 0.03, Pt.z1, fl);
  wb.box('flag', Pt.x0 + d, -0.05, Pt.z1 - d, Pt.x1 - d, 0.03, Pt.z1, fl);
  // las antorchas entre los vanos
  const libre = (c, puertas) => puertas.every((q) => Math.abs(c - q) > 2.1);
  for (const z of zs.slice(1)) {
    const c = z - 2;
    if ((Math.round(c) / 4) % 2 === 0) continue;
    if (libre(c, [FORT.salon.puerta])) P.wallTorch(ctx, Pt.x0 + 0.02, 2.5, c, 'e', {});
    if (libre(c, [FORT.capilla.puerta, FORT.cancilleria.puerta])) P.wallTorch(ctx, Pt.x1 - 0.02, 2.5, c, 'w', {});
  }
  for (const x of [-110, -86]) P.wallTorch(ctx, x, 2.5, Pt.z1 - 0.02, 'n', {});
}

// ------------------------------------------------------------------------ el paseo de las cámaras
// El claustro de arriba (PLAN_FORTALEZA.md, fase 7). Sobre las tres
// galerías, a +5,5, un corredor de madera: el suelo de tablas sobre sus vigas
// (el techo de la galería de abajo, apoyado en la cornisa de la arquería), los
// pies derechos con sus zapatas y la carrera, el antepecho de tablas y, encima,
// el tejaroz. Une las cámaras: la sala de la reina, al noroeste, y la del Rey,
// al noreste —las dos atrancadas por dentro: se abren desde ellas y son
// atajos—, y la tribuna de la capilla, a levante, por donde se sube (a ella y
// a la cámara del Rey, un metro más bajas, por cuatro peldaños en el grueso
// del muro). Por aquí iban el Rey y la reina de sus cámaras a misa sin pisar
// el patio.
function paseo(ctx, S, L) {
  const wb = ctx.wb;
  const Pt = FORT.patio,
    Cl = FORT.claustro,
    Pa = Cl.paseo,
    K = FORT.rey,
    Pu = FORT.puerta,
    ti = FORT.ti,
    d = Cl.d;
  const y = Pa.y,
    yb = K.alto;
  // (lo que vuela la cornisa de la arquería a cada lado de su eje)
  const ed = 0.43;
  const xW = Pt.x0 + d,
    xE = Pt.x1 - d,
    zS = Pt.z1 - d;
  const tabla = [0.6, 0.52, 0.44],
    oscura = [0.46, 0.4, 0.34],
    pino = [0.62, 0.54, 0.46];
  // los tres brazos del suelo (sin solaparse): [x0, z0, x1, z1]
  const brazos = [
    [Pt.x0, Pt.z0, xW + ed, Pt.z1],
    [xE - ed, Pt.z0, Pt.x1, Pt.z1],
    [xW + ed, zS - ed, xE - ed, Pt.z1],
  ];
  for (const [x0, z0, x1, z1] of brazos) {
    wb.box('planks', x0, y - 0.1, z0, x1, y, z1, { faces: 't', ao: false, sub: 2.2, uv: 0.8, tint: tabla });
    wb.box('wooddark', x0, y - 0.3, z0, x1, y - 0.28, z1, { faces: 'b', ao: false, sub: 2.4, tint: [0.5, 0.45, 0.4] });
    ctx.col.add(x0, y - 0.3, z0, x1, y, z1);
  }
  // el canto de los suelos, al patio, sobre la cornisa
  wb.box('wooddark', xW + ed - 0.04, y - 0.3, Pt.z0, xW + ed, y, zS - ed, { faces: 'e', ao: false, tint: oscura });
  wb.box('wooddark', xE - ed, y - 0.3, Pt.z0, xE - ed + 0.04, y, zS - ed, { faces: 'w', ao: false, tint: oscura });
  wb.box('wooddark', xW + ed, y - 0.3, zS - ed, xE - ed, y, zS - ed + 0.04, { faces: 'n', ao: false, tint: oscura });
  // las vigas, del muro a la arquería (sobre su cornisa)
  for (let z = Pt.z0 + 0.45; z < Pt.z1 - 0.2; z += 0.9) {
    wb.box('timber', Pt.x0, y - 0.48, z - 0.08, xW, y - 0.3, z + 0.08, { faces: 'nsb', ao: false, tint: pino });
    wb.box('timber', xE, y - 0.48, z - 0.08, Pt.x1, y - 0.3, z + 0.08, { faces: 'nsb', ao: false, tint: pino });
  }
  for (let x = xW + ed + 0.45; x < xE - ed - 0.2; x += 0.9) wb.box('timber', x - 0.08, y - 0.48, zS, x + 0.08, y - 0.3, Pt.z1, { faces: 'ewb', ao: false, tint: pino });
  // los pies derechos sobre el eje de la arquería, cada dos metros, con sus
  // zapatas; contra el muro del norte, medio pie
  const pie = (x, z, dirs, z0 = z - 0.1, z1 = z + 0.1) => {
    wb.box('timber', x - 0.1, y, z0, x + 0.1, Pa.pie, z1, { faces: 'nsew', aoH: 0.6, tint: pino });
    ctx.col.add(x - 0.1, y, z0, x + 0.1, Pa.pie, z1);
    for (const ax of dirs) {
      if (ax === 'x') wb.box('wooddark', x - 0.48, Pa.pie, z - 0.09, x + 0.48, Pa.pie + 0.18, z + 0.09, { faces: 'nsewb', ao: false, tint: oscura });
      else wb.box('wooddark', x - 0.09, Pa.pie, Math.max(z0, z - 0.48), x + 0.09, Pa.pie + 0.18, z + 0.48, { faces: z0 > z - 0.48 ? 'sewb' : 'nsewb', ao: false, tint: oscura });
    }
  };
  for (const x of [xW, xE]) {
    pie(x, Pt.z0 + 0.05, ['z'], Pt.z0, Pt.z0 + 0.1);
    for (let z = Pt.z0 + 2; z <= zS + 0.01; z += 2) pie(x, z, Math.abs(z - zS) < 0.01 ? ['z', 'x'] : ['z']);
  }
  for (let x = xW + 2; x <= xE - 1.99; x += 2) pie(x, zS, ['x']);
  // la carrera, sobre las zapatas (la del sur, entera; las de los lados,
  // hasta ella)
  const yc = Pa.pie + 0.18,
    yc1 = Pa.pie + 0.39;
  for (const x of [xW, xE]) wb.box('timber', x - 0.11, yc, Pt.z0, x + 0.11, yc1, zS - 0.11, { faces: 'ewsb', ao: false, tint: pino });
  wb.box('timber', xW - 0.11, yc, zS - 0.11, xE + 0.11, yc1, zS + 0.11, { faces: 'nsewb', ao: false, tint: pino });
  // el antepecho: tablas entre los pies, con su pasamanos; y lo que no deja
  // saltar al patio
  const ya = y + 0.92;
  for (const x of [xW, xE]) {
    wb.box('planks', x - 0.03, y, Pt.z0, x + 0.03, ya, zS - 0.03, { faces: 'ew', ao: false, sub: 2, tint: tabla.map((v) => v * 0.88) });
    wb.box('wooddark', x - 0.08, ya, Pt.z0, x + 0.08, ya + 0.08, zS - 0.08, { faces: 'tewb', ao: false, tint: oscura });
    blocker(ctx, x - 0.1, y, Pt.z0, x + 0.1, y + 2.5, zS + 0.1);
  }
  wb.box('planks', xW - 0.03, y, zS - 0.03, xE + 0.03, ya, zS + 0.03, { faces: 'nsew', ao: false, sub: 2, tint: tabla.map((v) => v * 0.88) });
  wb.box('wooddark', xW - 0.08, ya, zS - 0.08, xE + 0.08, ya + 0.08, zS + 0.08, { faces: 'tnsewb', ao: false, tint: oscura });
  blocker(ctx, xW - 0.1, y, zS - 0.1, xE + 0.1, y + 2.5, zS + 0.1);
  // el tejaroz (en inglete en las dos esquinas del sur)
  tejaroz(ctx, 'e', Pt.x0, Pt.z0, Pt.z1, d, Pa.yHi, Pa.yLo, { cut: [0, -1] });
  tejaroz(ctx, 'w', Pt.x1, Pt.z0, Pt.z1, d, Pa.yHi, Pa.yLo, { cut: [0, -1] });
  tejaroz(ctx, 'n', Pt.z1, Pt.x0, Pt.x1, d, Pa.yHi, Pa.yLo, { cut: [-1, -1] });
  // las puertas. La de la reina, a nivel: su umbral
  {
    const x = Pa.reina;
    wb.box('flag', x - 0.6, y - 0.02, Pt.z0 - ti, x + 0.6, y, Pt.z0, { faces: 't', ao: false, tint: PIEDRA.silla });
  }
  // la del Rey y la de la tribuna: cuatro peldaños en el grueso del muro y el
  // umbral, abajo; por la cara del patio, bajo el suelo del paseo, la piedra
  // que tapa el hueco, y arriba, el canto de las tablas
  const n = 4,
    run = ti / (n + 1),
    rise = (y - yb) / (n + 1);
  {
    const x = Pa.rey;
    for (let k = 0; k < n; k++) solid(ctx, 'ashlar', x - 0.6, yb, Pt.z0 - run * (k + 1), x + 0.6, y - rise * (k + 1), Pt.z0 - run * k, { faces: 'tn', ao: false, tint: PIEDRA.silla });
    wb.box('flag', x - 0.6, yb - 0.02, Pt.z0 - ti, x + 0.6, yb, Pt.z0 - run * n, { faces: 't', ao: false, tint: PIEDRA.silla });
    wb.box('wallstone', x - 0.6, yb, Pt.z0, x + 0.6, y - 0.3, Pt.z0 + 0.01, { faces: 's', tint: PIEDRA.patio, baseY: 0 });
    wb.box('wooddark', x - 0.6, y - rise, Pt.z0, x + 0.6, y, Pt.z0 + 0.02, { faces: 'n', ao: false, tint: oscura });
  }
  {
    const z = Pa.tribuna;
    for (let k = 0; k < n; k++) solid(ctx, 'ashlar', Pt.x1 + run * k, yb, z - 0.6, Pt.x1 + run * (k + 1), y - rise * (k + 1), z + 0.6, { faces: 'te', ao: false, tint: PIEDRA.silla });
    wb.box('flag', Pt.x1 + run * n, yb - 0.02, z - 0.6, Pt.x1 + ti, yb, z + 0.6, { faces: 't', ao: false, tint: PIEDRA.silla });
    wb.box('wallstone', Pt.x1 - 0.01, yb, z - 0.6, Pt.x1, y - 0.3, z + 0.6, { faces: 'w', tint: PIEDRA.patio, baseY: 0 });
    wb.box('wooddark', Pt.x1 - 0.02, y - rise, z - 0.6, Pt.x1, y, z + 0.6, { faces: 'e', ao: false, tint: oscura });
  }
  // (en la rejilla de la calle, los muros son macizos hasta +5,2: los huecos
  // de estas dos puertas, por debajo, transitables; abajo los cierra el muro)
  W(S, Pa.rey - 0.6, Pt.z0 - ti, Pa.rey + 0.6, Pt.z0);
  W(S, Pt.x1, Pa.tribuna - 0.6, Pt.x1 + ti, Pa.tribuna + 0.6);
  L.interact.push(
    { kind: 'door', id: 'd_paseo_reina', x: Pa.reina, y, z: Pt.z0 - ti / 2, w: 1.2, h: 2.15 + 0.6, arch: true, axis: 'x', mat: 'planks', hinge: -1, swing: 1, plane: Pt.z0 - ti, inset: 0.06, lock: { type: 'barred', side: -1 }, barredMsg: 'paseoReinaTranca' },
    { kind: 'door', id: 'd_paseo_rey', x: Pa.rey, y: yb, z: Pt.z0 - ti / 2, w: 1.2, h: 3.15 + 0.6, arch: true, axis: 'x', mat: 'planks', hinge: 1, swing: 1, plane: Pt.z0 - ti, inset: 0.06, lock: { type: 'barred', side: -1 }, barredMsg: 'paseoReyTranca' },
    { kind: 'door', id: 'd_paseo_tribuna', x: Pt.x1 + ti / 2, y: yb, z: Pa.tribuna, w: 1.2, h: 3.15 + 0.6, arch: true, axis: 'z', mat: 'planks', hinge: -1, swing: 1, plane: Pt.x1 + ti, inset: 0.06, ajar: 0.3, lock: { type: 'none' } }
  );
  // las antorchas, contra los muros (entre sus ventanas)
  for (const z of [-80, -56]) P.wallTorch(ctx, Pt.x0 + 0.02, y + 1.7, z, 'e', {});
  for (const z of [-83, -59.2]) P.wallTorch(ctx, Pt.x1 - 0.02, y + 1.7, z, 'w', {});
  for (const x of [-113, Pu.px0 + (Pu.px1 - Pu.px0) / 2, -83]) P.wallTorch(ctx, x, y + 1.7, Pt.z1 - 0.02, 'n', {});
  // lo que hay: la vista del patio, desde la baranda del sur; los virotes
  // y la capelina de un ballestero que tiraba desde aquí al patio; un
  // cortesano que reza ante la puerta de la reina y la ronda, en la esquina
  // de levante
  L.interact.push({ kind: 'examine', id: 'x_paseo', text: 'paseoVista', x: FORT.eje + 4, y, z: zS + 0.6, r: 1.8 }, { kind: 'item', id: 'i_virotes_paseo', item: 'virote', n: 3, x: Pt.x1 - 1.4, y: y + 0.02, z: Pt.z1 - 1.0 });
  P.dropped(ctx, Pt.x1 - 0.8, y, Pt.z1 - 0.6, 0.9, 'helmet');
  L.enemies.push({ type: 'cortesanoSuelto', x: Pa.reina + 0.4, y, z: Pt.z0 + 3.2, yaw: Math.PI, idle: 'kneel', id: 'e_paseo1' }, { type: 'soldier', x: xE + 1.0, y, z: Pt.z1 - 2.2, yaw: -Math.PI / 2, idle: 'stand', id: 'e_paseo2' });
  // zona (con los huecos de las puertas) y mapa
  const rects = brazos.map(([x0, z0, x1, z1]) => [x0, z0, x1, z1, y - 0.25, Pa.yHi]);
  rects.push([Pa.reina - 0.7, Pt.z0 - ti, Pa.reina + 0.7, Pt.z0, y - 0.25, y + 2.6], [Pa.rey - 0.7, Pt.z0 - ti, Pa.rey + 0.7, Pt.z0, yb - 0.25, y + 2.6], [Pt.x1, Pa.tribuna - 0.7, Pt.x1 + ti, Pa.tribuna + 0.7, yb - 0.25, y + 2.6]);
  L.zones.push({ id: 'paseo_camaras', rects, atmo: 'castillo' });
  for (const [x0, z0, x1, z1] of brazos) L.map.push({ id: 'paseo_camaras', r: [x0, z0, x1, z1] });
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
  // el brocal del aljibe del palacio, sobre el óculo de su bóveda (abajo, en
  // la cárcel: fortaleza_carcel.js)
  {
    const AJ = FORT.carcel.aljibe;
    const bx = (AJ.xs[AJ.pozo[0]] + AJ.xs[AJ.pozo[0] + 1]) / 2,
      bz = (AJ.zs[AJ.pozo[1]] + AJ.zs[AJ.pozo[1] + 1]) / 2;
    P.well(ctx, bx, 0, bz, { deep: true });
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
