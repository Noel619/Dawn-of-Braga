// Las crujías de la fortaleza por dentro (PLAN_FORTALEZA.md, §5; fase 1: lo
// que se mudó del Paço, a sus salas nuevas). La planta baja de cada crujía y
// sus torres:
//
// - Al oeste, el gran salón a doble altura, con sus arcos diafragma, el
//   estrado y el sitial vacío del Rey, el hogar y el cancel: la Corte de los
//   Infieles (game/corte.js). Se entra por el servicio.
// - Al sur, la despensa y, en la torre del suroeste, la cocina con su campana;
//   al otro lado de la puerta, el cuerpo de guardia.
// - Al este, la capilla real con su tribuna y su espadaña (la llave del
//   capellán, atada al cordón de la campana), la cancillería y, en la torre
//   del sureste, el Tombo: cuatro plantas unidas por un caracol, y arriba las
//   arcas del Rey.
// - Al norte, a los lados de la torre del homenaje, la sala de la reina y su
//   torre (su cama, su libro de horas, el relicario); la antecámara del Rey y,
//   en la torre del nordeste, el tesoro con el camarero, el guardarropa y, a la
//   altura de la coracha, el altar de la llegada.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, stairs, archRing, subtractRects } from './builders.js';
import * as P from './props.js';
import { interiorRoom } from './level_util.js';
import { bakeCorpse } from '../entities/models.js';
import { calderaCera, panesCera } from './barrio_atrezo.js';
import { chest } from './level_souto.js';
import { FORT } from './fortaleza_medidas.js';
import { PIEDRA, tri, ajimez, vano, muroVanos, forjado, caracol, arcaSellada, estante, pupitre, atril, legajos, farol, hoja, sitial, tapiz, PERG, pieza } from './fortaleza_atrezo.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);
const F1 = FORT.F1;
const PISO = [0.74, 0.71, 0.66];

export function buildAlas(ctx, S, L) {
  salon(ctx, S, L);
  corte(L);
  despensa(ctx, S, L);
  cocina(ctx, S, L);
  guardia(ctx, S, L);
  capilla(ctx, S, L);
  cancilleria(ctx, S, L);
  tombo(ctx, S, L);
  reina(ctx, S, L);
  rey(ctx, S, L);
  torreCoracha(ctx, S, L);
}

// Las caras de dentro de una torre (las de sus muros sin puertas), por franjas
// de alto, cada una con su sala.
function dentro(ctx, R, lados, bands, o = {}) {
  const wb = ctx.wb;
  const ix0 = R.x0 + R.t,
    ix1 = R.x1 - R.t,
    iz0 = R.z0 + R.t,
    iz1 = R.z1 - R.t;
  for (const l of lados)
    for (const b of bands) {
      const bx = { n: [ix0, b.y0, iz0 - 0.01, ix1, b.y1, iz0], s: [ix0, b.y0, iz1, ix1, b.y1, iz1 + 0.01], w: [ix0 - 0.01, b.y0, iz0, ix0, b.y1, iz1], e: [ix1, b.y0, iz0, ix1 + 0.01, b.y1, iz1] }[l];
      wb.box(o.mat ?? 'wallstone', ...bx, { faces: { n: 's', s: 'n', w: 'e', e: 'w' }[l], room: b.room, tint: b.tint ?? o.tint ?? [0.72, 0.69, 0.64], sub: 2, aoH: 1.6, baseY: b.y0 });
    }
}

// Una cara suelta (sin colisión), en el plano de un muro.
function cara1(ctx, mat, dir, line, a, b, y0, y1, room, tint) {
  const box = { n: [a, y0, line - 0.01, b, y1, line], s: [a, y0, line, b, y1, line + 0.01], w: [line - 0.01, y0, a, line, y1, b], e: [line, y0, a, line + 0.01, y1, b] }[dir];
  ctx.wb.box(mat, ...box, { faces: dir, room, tint, sub: 2, aoH: 1.6, baseY: y0 });
}

// Saetera por dentro (la hendidura en su derrame), en una cara que mira a dir.
function saeteraDentro(ctx, dir, line, u, y, room) {
  const e = 0.012;
  const bx = { n: [u - 0.11, y, line - e, u + 0.11, y + 1.3, line], s: [u - 0.11, y, line, u + 0.11, y + 1.3, line + e], w: [line - e, y, u - 0.11, line, y + 1.3, u + 0.11], e: [line, y, u - 0.11, line + e, y + 1.3, u + 0.11] }[dir];
  ctx.wb.box('black', ...bx, { faces: dir, ao: false, grime: false, room });
}

// ------------------------------------------------------------------------ el gran salón
// Catorce metros por casi cuarenta, a doble altura, bajo su armadura de dos
// aguas; cuatro arcos diafragma de sillería, con sus responsiones, la
// sostienen. Al norte, el estrado en dos gradas con el sitial vacío del Rey bajo
// su dosel y la mesa alta; al sur, el cancel de tablas y, tras él, el paso del
// servicio, con la puerta de la despensa. En el muro de la muralla, el hogar con
// su campana y las ventanas altas; en el del patio, las puertas grandes.
function salon(ctx, S, L) {
  const wb = ctx.wb;
  const Sa = FORT.salon,
    E = FORT.eave;
  const room = 'salon';
  const { x0, x1, z0, z1 } = Sa;
  const xc = (x0 + x1) / 2;
  const tint = [0.8, 0.77, 0.72];
  W(S, x0, z0, x1, z1);
  // el suelo enlosado
  wb.box('flag', x0, -0.05, z0, x1, 0.02, z1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room, tint: PISO });
  // el muro del norte (contra la torre de la reina y su sala) y el del sur
  // (el del servicio, con su puerta a la despensa)
  pieza(ctx, 'wallstone', x0, 0, z0 - 1.2, FORT.reina.x0, E, z0, [['s', room]], { tint });
  pieza(ctx, 'wallstone', FORT.reina.x0, 0, z0 - 1.2, x1, E, z0, [['s', room], ['n', 'reina_sala', 0, F1]], { tint });
  muroVanos(ctx, 'x', x0, x1, z1, z1 + 2.4, 0, E, [{ c: Sa.servicio, w: 1.6, y: 0, h: 2.6, rise: 0.8, ring: 0.28 }], [{ room, y0: 0, y1: E }], [{ room: 'despensa', y0: 0, y1: F1 }], { tint, revealRoom: 'despensa' });
  W(S, Sa.servicio - 0.8, z1 - 0.3, Sa.servicio + 0.8, z1 + 2.7);
  L.interact.push({ kind: 'door', id: 'd_servicio', x: Sa.servicio, y: 0, z: z1 + 1.2, w: 1.6, h: 3.4, arch: true, axis: 'x', mat: 'planks', hinge: -1, swing: 1, plane: z1, inset: 0.06, lock: { type: 'none' } });
  // el estrado: dos gradas de tablas, de muro a muro
  const E0 = { y: 0.45, z1: z0 + 3.6 };
  solid(ctx, 'planks', x0, 0, z0, x1, E0.y, E0.z1 - 0.4, { faces: 'ts', ao: false, sub: 2, room, tint: [0.7, 0.62, 0.55] });
  solid(ctx, 'planks', x0, 0, E0.z1 - 0.4, x1, E0.y / 2, E0.z1, { faces: 'ts', ao: false, sub: 2, room, tint: [0.7, 0.62, 0.55] });
  // el sitial del Rey bajo su dosel; la mesa alta a los lados
  sitial(ctx, xc, E0.y, z0 + 1.15, 0, room);
  P.banner(ctx, xc, E0.y + 5.0, z0 + 0.08, 0, 'bannerRey', 2.6, 4.2);
  wb.box('clothRed', xc - 1.7, E0.y + 4.4, z0, xc + 1.7, E0.y + 4.52, z0 + 1.9, { ao: false, faces: 'tbnsew', room });
  wb.box('clothRed', xc - 1.7, E0.y + 3.95, z0 + 1.8, xc + 1.7, E0.y + 4.4, z0 + 1.9, { ao: false, faces: 'tbnsew', room, tint: [0.8, 0.8, 0.8] });
  for (const s of [-1, 1]) wb.box('gold', xc + s * 1.65 - 0.04, E0.y + 0.3, z0 + 1.82, xc + s * 1.65 + 0.04, E0.y + 4.4, z0 + 1.9, { ao: false, room });
  wb.setRoom(room);
  for (const s of [-1, 1]) {
    const tx = xc + s * 4.0,
      tz = z0 + 2.2;
    P.table(ctx, tx, E0.y, tz, 3.4, 1.0, 0, {});
    wb.box('linen', tx - 1.72, E0.y + 0.8, tz - 0.52, tx + 1.72, E0.y + 0.82, tz + 0.52, { ao: false, faces: 'tnsew', room, tint: [0.86, 0.84, 0.8] });
    P.bench(ctx, tx, E0.y, tz - 0.85, 3.0, 0);
    P.candles(ctx, tx + s * 1.2, E0.y + 0.82, tz, 4, 6302 + s, { room, radius: 6, intensity: 0.9 });
  }
  P.jar(ctx, xc + 4.6, E0.y + 0.82, z0 + 2.1, 0.6, { room });
  wb.setRoom(null);
  L.interact.push({ kind: 'note', id: 'n_mayordomo', note: 'mayordomo', x: xc + 3.3, y: E0.y + 0.84, z: z0 + 2.3, model: 'paper' });
  // los arcos diafragma: sus responsiones y el arco de sillería, con su
  // hastial hasta la armadura
  const spring = 4.0,
    rise = 5.2,
    ring = 0.6;
  const rx = Sa.x0,
    rr = FORT.patio.x0; // (la armadura va de la muralla al patio)
  const ridgeX = (rx + rr) / 2,
    yR = Sa.ridge - 0.28,
    yE = E - 0.24;
  const yAt = (x) => yR - (Math.abs(x - ridgeX) / ((rr - rx) / 2)) * (yR - yE);
  for (const z of Sa.arcos) {
    archRing(ctx, { axis: 'x', c: xc, w: x1 - x0 - 1.2, y0: spring, rise, ring, t0: z - 0.35, t1: z + 0.35, top: yE, clip: [x0, x1], piers: true, mat: 'ashlar', spMat: 'ashlar', rooms: [room, room], tint: [0.7, 0.67, 0.62], spTint: tint });
    for (const [xa, xb] of [
      [x0, x0 + 0.6],
      [x1 - 0.6, x1],
    ]) {
      solid(ctx, 'ashlar', xa, 0, z - 0.4, xb, spring, z + 0.4, { faces: 'nsew', sub: 2, aoH: 1.2, room, tint });
      wb.box('ashlar', xa - (xa === x0 ? 0 : 0.12), spring - 0.25, z - 0.52, xb + (xa === x0 ? 0.12 : 0), spring, z + 0.52, { ao: false, faces: 'tbnsew', room, tint: [0.66, 0.63, 0.58] });
    }
    // (por encima, hasta la armadura)
    for (const [zz, dir] of [
      [z - 0.35, -1],
      [z + 0.35, 1],
    ]) {
      const n = V(0, 0, dir);
      tri(wb, 'ashlar', V(x0, yE, zz), V(x1, yE, zz), V(ridgeX, yR, zz), n, { ao: false, room, tint });
      tri(wb, 'ashlar', V(x1, yE, zz), V(x1, yAt(x1), zz), V(ridgeX, yR, zz), n, { ao: false, room, tint });
    }
    P.wallTorch(ctx, x0 + 0.62, 2.6, z, 'e', { room });
    P.wallTorch(ctx, x1 - 0.62, 2.6, z, 'w', { room });
  }
  // las ventanas por dentro: las altas de la muralla y las del patio
  for (const z of [-82.1, -74.3, -66.5]) ajimez(ctx, 'e', x0, z, 6.6, { h: 1.4, room });
  for (const z of [-84, -76, -60, -52]) ajimez(ctx, 'w', x1, z, 6.9, { h: 1.25, room });
  for (const z of [-80, -56]) vano(ctx, 'w', x1, z, 2.4, 0.42, 0.9, { room });
  // el hogar de la muralla, con su campana de piedra
  {
    const hz = -58.7,
      hx = x0;
    solid(ctx, 'ashlar', hx, 0, hz - 1.6, hx + 0.9, 0.35, hz + 1.6, { faces: 'tnse', ao: false, sub: 2, room, tint: [0.56, 0.52, 0.48], mats: { t: 'flag' } });
    for (const s of [-1, 1]) solid(ctx, 'ashlar', hx, 0, hz + s * 1.5 - 0.2, hx + 1.0, 1.9, hz + s * 1.5 + 0.2, { faces: 'tnsew', sub: 2, room, tint: [0.7, 0.67, 0.62] });
    solid(ctx, 'ashlar', hx, 1.9, hz - 1.8, hx + 1.15, 2.4, hz + 1.8, { faces: 'tnsewb', sub: 2, room, tint: [0.66, 0.63, 0.58] });
    const hood = [V(hx + 1.15, 2.4, hz - 1.8), V(hx + 1.15, 2.4, hz + 1.8), V(hx + 0.2, 7.2, hz + 0.8), V(hx + 0.2, 7.2, hz - 0.8)];
    wb.quad('ashlar', hood[0], hood[1], hood[2], hood[3], { ao: false, room, tint: [0.58, 0.55, 0.5] });
    tri(wb, 'ashlar', V(hx, 2.4, hz - 1.8), hood[0], hood[3], V(0, 0, -1), { ao: false, room, tint: [0.54, 0.5, 0.46] });
    tri(wb, 'ashlar', V(hx, 2.4, hz + 1.8), hood[1], hood[2], V(0, 0, 1), { ao: false, room, tint: [0.54, 0.5, 0.46] });
    wb.box('black', hx + 0.01, 0.35, hz - 1.3, hx + 0.02, 1.9, hz + 1.3, { faces: 'e', ao: false, grime: false, room });
    wb.cylinder('ember', hx + 0.5, 0.35, hz, 0.7, 0.6, 0.04, 10, { ao: false, grime: false, capTop: true, room });
    P.firewood(ctx, hx + 0.55, 0.35, hz + 0.1, 0, 2);
    ctx.fires.push({ x: hx + 0.5, y: 0.45, z: hz, s: 1.0, smoke: true, embers: true });
    ctx.lights.push({ x: hx + 1.6, y: 1.4, z: hz, r: 1, g: 0.42, b: 0.14, radius: 13, intensity: 1.6, room });
    if (ctx.dynLights) ctx.dynLights.push({ x: hx + 1.2, y: 1.4, z: hz, intensity: 6, range: 12 });
    ctx.col.add(hx, 0, hz - 1.8, hx + 1.15, 2.4, hz + 1.8);
  }
  // el cancel: dos paneles de tablas y uno en medio, con los dos pasos, y el
  // paso del servicio detrás
  {
    const zs = z1 - 3.2;
    const pasos = [x0 + 4.0, x1 - 3.0];
    let cur = x0;
    for (const p of [...pasos, x1 + 0.8]) {
      const a = cur,
        b = Math.min(x1, p - 0.8);
      if (b - a > 0.1) {
        solid(ctx, 'planks', a, 0, zs, b, 3.0, zs + 0.12, { faces: 'tnsew', ao: false, sub: 2, room, tint: [0.62, 0.52, 0.44] });
        wb.box('wooddark', a, 3.0, zs - 0.06, b, 3.2, zs + 0.18, { ao: false, faces: 'tbnsew', room });
        for (let x = a; x <= b + 0.01; x += (b - a) / Math.max(1, Math.round((b - a) / 1.2))) wb.box('wooddark', x - 0.07, 0, zs - 0.05, x + 0.07, 3.0, zs + 0.17, { ao: false, faces: 'nsew', room });
      }
      cur = p + 0.8;
    }
    for (const p of pasos) wb.box('wooddark', p - 0.85, 2.4, zs - 0.06, p + 0.85, 2.6, zs + 0.18, { ao: false, faces: 'tbnsew', room });
    ctx.lights.push({ x: Sa.servicio, y: 2.4, z: z1 - 1.6, r: 1, g: 0.5, b: 0.22, radius: 5, intensity: 0.7, room });
    P.wallTorch(ctx, x1 - 0.02, 2.4, z1 - 1.6, 'w', { room });
  }
  // las mesas largas de caballetes, contra los muros, con sus bancos
  wb.setRoom(room);
  for (const [tx, s] of [
    [x0 + 1.5, 1],
    [x1 - 1.5, -1],
  ]) {
    for (const z of [-76.3, -72.4, -64.6, -60.7, -52.6]) {
      if (s > 0 && z > -62) continue;
      P.table(ctx, tx, 0, z, 3.4, 0.9, Math.PI / 2, {});
      P.bench(ctx, tx + s * 0.8, 0, z, 3.0, Math.PI / 2);
      wb.box('linen', tx - 0.47, 0.8, z - 1.7, tx + 0.47, 0.82, z + 1.7, { ao: false, faces: 't', room, tint: [0.7, 0.68, 0.64] });
    }
  }
  P.jar(ctx, x0 + 1.6, 0.82, -73.1, 0.6, { room });
  P.jar(ctx, x1 - 1.4, 0.82, -61.2, 0.7, { room });
  P.dropped(ctx, x1 - 1.5, 0.82, -72.0, 0.6, 'sword');
  wb.setRoom(null);
  // las coronas de luz, colgadas de la armadura, y los paños del Rey
  for (const z of [-74.3, -62.6]) {
    P.candleCrown(ctx, xc, 5.0, z, Sa.ridge - 0.8, { room, r: 1.1, n: 10 });
    ctx.lights.push({ x: xc, y: 4.6, z, r: 1, g: 0.6, b: 0.28, radius: 11, intensity: 1.1, room });
  }
  for (const z of [-80.1, -72.3, -64.5]) P.banner(ctx, x1 - 0.12, 6.8, z, -Math.PI / 2, 'bannerRey', 1.2, 2.8);
  for (const z of [-78.2 + 3.9, -70.4 + 3.9]) tapiz(ctx, x0 + 0.06, 5.4, z - 2.0, Math.PI / 2, 2.6, 2.6, { room, mat: 'clothRed' });
  L.zones.push({ id: 'salon', rects: [[x0, z0, x1, z1, -1, 15]], atmo: 'sala', room });
  L.map.push({ id: 'salon', r: [x0 - 2.4, z0 - 1.2, x1 + 1.2, z1 + 2.4] });
}

// La Corte de los Infieles (game/corte.js): veintidós cortesanos de rodillas en
// dos filas, mirando al sitial, y el mayordomo al pie del estrado. El orden: de
// delante atrás, una fila y la otra. Vencidos, no vuelven (corte:vencida); la
// llave del mayordomo queda donde cae.
function corte(L) {
  const Sa = FORT.salon;
  const xc = (Sa.x0 + Sa.x1) / 2;
  const zE = Sa.estrado.z1;
  let n = 0;
  for (let k = 0; k < 11; k++) {
    const z = zE + 1.9 + k * 1.45;
    for (const x of [xc - 2.6, xc + 2.6]) {
      n++;
      L.enemies.push({ type: 'cortesano', x: x + (k % 2 ? 0.12 : -0.12), y: 0, z, yaw: Math.PI, idle: 'kneel', id: 'e_corte' + n, orden: n, story: 'corte:vencida' });
    }
  }
  L.enemies.push({ type: 'mayordomo', x: xc, y: 0, z: zE + 0.8, yaw: Math.PI, idle: 'kneel', id: 'e_mayordomo', story: 'corte:vencida', dies: 'dead:mayordomo' });
  L.interact.push({ kind: 'item', id: 'i_llave_mayordomo', item: 'llave_mayordomo', afterFlag: 'dead:mayordomo', x: xc, y: 0.08, z: zE + 0.8 });
}

// ------------------------------------------------------------------------ la despensa
// Entre el gran salón y la puerta: las tinajas, los toneles de la botillería,
// los estantes, los sacos vacíos. Una puerta al patio, otra al paso del
// servicio y otra a la cocina.
function despensa(ctx, S, L) {
  const wb = ctx.wb;
  const D = FORT.despensa,
    SO = FORT.torres.SO;
  const room = 'despensa';
  const { x0, x1, z0, z1 } = D;
  W(S, x0, z0, x1, z1);
  wb.box('flag', x0, -0.05, z0, x1, 0.02, z1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room, tint: PISO });
  interiorRoom(ctx, x0, z0, x1, z1, 0, F1, { room, floor: false, skip: ['n', 's', 'e', 'w'], skirting: false });
  // el muro de la cocina (el de levante de su torre), con su puerta; y el cabo
  // de su muro del norte
  const zk = -38.6;
  muroVanos(ctx, 'z', SO.z0 + SO.t, SO.z1 - SO.t, SO.x1 - SO.t, SO.x1, 0, SO.h, [{ c: zk, w: 1.6, y: 0, h: 2.4, rise: 0.8, ring: 0.26 }], [{ room: 'cocina', y0: 0, y1: FORT.walk - 0.4 }], [{ room, y0: 0, y1: F1 }], { tint: [0.74, 0.7, 0.64], revealRoom: room });
  cara1(ctx, 'wallstone', 'e', x0, z0, SO.z0 + SO.t, 0, F1, room, [0.74, 0.7, 0.64]);
  W(S, SO.x1 - SO.t - 0.3, zk - 0.8, SO.x1 + 0.3, zk + 0.8);
  L.interact.push({ kind: 'door', id: 'd_cocina', x: SO.x1 - SO.t / 2, y: 0, z: zk, w: 1.6, h: 3.2, arch: true, axis: 'z', mat: 'planks', hinge: -1, swing: -1, plane: SO.x1 - SO.t, inset: 0.06, ajar: 0.15, lock: { type: 'none' } });
  // la botillería (al oeste) y la despensa (al este)
  wb.setRoom(room);
  for (let i = 0; i < 2; i++) P.cask(ctx, x0 + 1.0, 0, z0 + 1.6 + i * 1.6, Math.PI / 2, { room });
  P.cask(ctx, x0 + 2.4, 0, z1 - 1.0, 0, { room });
  for (let i = 0; i < 5; i++) P.jar(ctx, x0 + 5 + i * 0.8, 0, z1 - 0.6, 1.1 + (i % 2) * 0.2, { room, broken: i === 3 });
  P.shelf(ctx, x1 - 0.3, 0, z0 + 2.4, -Math.PI / 2, 2.0);
  P.shelf(ctx, x1 - 0.3, 0, z0 + 5.2, -Math.PI / 2, 2.0);
  P.shelf(ctx, x1 - 4.0, 0, z1 - 0.3, Math.PI, 2.0);
  P.sacks(ctx, x1 - 2.4, 0, z0 + 1.0, 3, 6301);
  P.sacks(ctx, x0 + 9.0, 0, z1 - 1.1, 4, 6305);
  P.basket(ctx, x1 - 1.4, 0, z1 - 0.8, { room });
  P.table(ctx, x0 + 10.5, 0, (z0 + z1) / 2, 2.6, 1.0, 0, {});
  P.counter(ctx, x0 + 4.8, 0, z0 + 0.9, 0, 3.0, { room });
  bakeCorpse(wb, x0 + 11.4, 0, (z0 + z1) / 2 + 1.4, 2.6, 'curl', 'villager', 43);
  wb.setRoom(null);
  ctx.lights.push({ x: (x0 + x1) / 2, y: 3.4, z: (z0 + z1) / 2, r: 1, g: 0.5, b: 0.24, radius: 13, intensity: 0.8, room });
  P.wallTorch(ctx, (x0 + x1) / 2 + 2, 2.4, z1 - 0.02, 'n', { room });
  P.wallTorch(ctx, x0 + 4.0, 2.4, z1 - 0.02, 'n', { room });
  P.hangingLamp(ctx, x0 + 10.5, F1 - 0.1, (z0 + z1) / 2, { room, len: 1.2 });
  P.candles(ctx, x0 + 10.0, 0.82, (z0 + z1) / 2 + 0.2, 3, 6306, { room, radius: 6, intensity: 0.9 });
  L.interact.push({ kind: 'item', id: 'i_ampolla_despensa', item: 'ampolla', x: x1 - 0.42, y: 1.25, z: z0 + 5.2 });
  L.enemies.push({ type: 'penitent', x: x0 + 10.4, y: 0, z: (z0 + z1) / 2 - 1.1, yaw: 0.4, idle: 'eat', id: 'e_despensa1' });
  L.zones.push({ id: 'despensa', rects: [[x0, z0, x1, z1, -1, F1]], atmo: 'interior', room });
  L.map.push({ id: 'despensa', r: [x0, z0, x1, z1] });
}

// ------------------------------------------------------------------------ la cocina
// La torre del suroeste por dentro: la campana de piedra en medio, sobre el
// hogar, hasta el techo, y la chimenea que sale por lo alto de la torre; el
// horno del pan, las mesas de despiece, los calderos.
function cocina(ctx, S, L) {
  const wb = ctx.wb;
  const R = FORT.torres.SO;
  const room = 'cocina';
  const ix0 = R.x0 + R.t,
    ix1 = R.x1 - R.t,
    iz0 = R.z0 + R.t,
    iz1 = R.z1 - R.t;
  const cx = (ix0 + ix1) / 2,
    cz = (iz0 + iz1) / 2;
  const yC = FORT.walk - 0.4;
  const soot = [0.46, 0.42, 0.38];
  W(S, ix0, iz0, ix1, iz1);
  dentro(ctx, R, ['n', 's', 'w'], [{ room, y0: 0, y1: yC }], { tint: soot });
  wb.box('flag', ix0, -0.05, iz0, ix1, 0.02, iz1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room, tint: [0.6, 0.57, 0.52] });
  for (const [d, line, u] of [
    ['n', iz1, cx],
    ['e', ix0, cz],
  ])
    for (const y of [4.4, F1 + 2.2]) saeteraDentro(ctx, d, line, u, y, room);
  // el techo, con la boca de la campana, y la campana: un tronco de pirámide
  // de hollín del hogar al techo
  const rB = 3.0,
    rT = 0.75,
    yB = 3.6;
  for (const m of subtractRects([ix0, iz0, ix1, iz1], [[cx - rT, cz - rT, cx + rT, cz + rT]])) wb.box('wooddark', m[0], yC, m[1], m[2], yC + 0.2, m[3], { faces: 'b', ao: false, room, tint: [0.36, 0.32, 0.28] });
  const c4 = (r, y) => [V(cx - r, y, cz - r), V(cx + r, y, cz - r), V(cx + r, y, cz + r), V(cx - r, y, cz + r)];
  const B = c4(rB, yB),
    Tt = c4(rT, yC);
  for (let k = 0; k < 4; k++) {
    const j = (k + 1) % 4;
    wb.quad('wallstone', B[k], B[j], Tt[j], Tt[k], { ao: false, sub: 3, room, tint: [0.3, 0.27, 0.24] });
    wb.quad('wallstone', Tt[k], Tt[j], B[j], B[k], { ao: false, sub: 3, room, tint: [0.18, 0.16, 0.14] });
  }
  for (const [a, b, c, d] of [
    [cx - rB - 0.1, cz - rB - 0.1, cx + rB + 0.1, cz - rB + 0.2],
    [cx - rB - 0.1, cz + rB - 0.2, cx + rB + 0.1, cz + rB + 0.1],
    [cx - rB - 0.1, cz - rB + 0.2, cx - rB + 0.2, cz + rB - 0.2],
    [cx + rB - 0.2, cz - rB + 0.2, cx + rB + 0.1, cz + rB - 0.2],
  ])
    wb.box('ashlar', a, yB - 0.3, b, c, yB, d, { faces: 'nsewb', ao: false, room, tint: [0.4, 0.37, 0.34] });
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    wb.box('iron', cx + sx * (rB - 0.1) - 0.06, yB, cz + sz * (rB - 0.1) - 0.06, cx + sx * (rB - 0.1) + 0.06, yC, cz + sz * (rB - 0.1) + 0.06, { ao: false, room });
  ctx.col.addCam(cx - rB, yB, cz - rB, cx + rB, yC, cz + rB);
  // la chimenea por encima de la torre, con su humo
  {
    const y0 = R.h;
    wb.box('ashlar', cx - 1.1, y0 - 0.5, cz - 1.1, cx + 1.1, y0 + 4.2, cz + 1.1, { faces: 'nsew', ao: false, sub: 2, tint: [0.66, 0.63, 0.58] });
    wb.box('ashlar', cx - 1.1, y0 + 4.2, cz - 1.1, cx + 1.1, y0 + 6.2, cz + 1.1, { faces: 'nsew', ao: false, sub: 2, tint: [0.36, 0.33, 0.3] });
    wb.box('ashlar', cx - 1.3, y0 + 6.2, cz - 1.3, cx + 1.3, y0 + 6.5, cz + 1.3, { faces: 'tnsewb', ao: false, tint: [0.3, 0.28, 0.26] });
    wb.box('black', cx - 0.8, y0 + 6.49, cz - 0.8, cx + 0.8, y0 + 6.51, cz + 0.8, { faces: 't', ao: false, grime: false });
    ctx.fires.push({ x: cx, y: y0 + 6.6, z: cz, s: 0.5, smoke: true, embers: false, light: false });
    ctx.col.addCam(cx - 1.1, y0, cz - 1.1, cx + 1.1, y0 + 6.5, cz + 1.1);
  }
  // el hogar bajo la campana: las brasas, el caldero colgado y los asadores
  solid(ctx, 'wallstone', cx - 1.6, 0, cz - 1.6, cx + 1.6, 0.42, cz + 1.6, { faces: 'tnsew', ao: false, sub: 2, room, mats: { t: 'flag' }, tint: [0.5, 0.46, 0.42] });
  wb.cylinder('ember', cx, 0.42, cz, 1.0, 0.9, 0.04, 10, { ao: false, grime: false, capTop: true, room });
  P.firewood(ctx, cx + 0.4, 0.42, cz - 0.3, 1.2, 3);
  ctx.fires.push({ x: cx, y: 0.5, z: cz, s: 1.0, smoke: true, embers: true });
  ctx.lights.push({ x: cx, y: 1.6, z: cz, r: 1, g: 0.4, b: 0.12, radius: 14, intensity: 1.6, room });
  if (ctx.dynLights) ctx.dynLights.push({ x: cx, y: 1.6, z: cz, intensity: 5, range: 10 });
  P.wallTorch(ctx, ix0 + 0.02, 2.4, iz0 + 1.6, 'e', { room });
  for (const s2 of [-1, 1]) wb.box('iron', cx + s2 * 1.4 - 0.05, 0.42, cz - 0.05, cx + s2 * 1.4 + 0.05, 2.6, cz + 0.05, { ao: false, room });
  wb.box('iron', cx - 1.45, 2.5, cz - 0.04, cx + 1.45, 2.58, cz + 0.04, { ao: false, room });
  P.chains(ctx, cx, 2.5, cz, 9, 0);
  wb.cylinder('iron', cx, 1.45, cz, 0.36, 0.46, 0.55, 10, { ao: false, capBot: true, room });
  wb.cylinder('black', cx, 2.0, cz, 0.4, 0.4, 0.01, 10, { ao: false, grime: false, capTop: true, room });
  ctx.col.add(cx - 1.6, 0, cz - 1.6, cx + 1.6, 0.9, cz + 1.6);
  // el horno, las mesas, la leña, los sacos; los cocineros
  wb.setRoom(room);
  P.breadOven(ctx, ix0 + 1.6, 0, iz1 - 1.6, -Math.PI / 4, { room });
  P.table(ctx, ix0 + 0.65, 0, cz - 2.8, 2.6, 0.9, Math.PI / 2, {});
  P.table(ctx, cx + 0.4, 0, iz0 + 0.65, 3.0, 0.9, 0, {});
  P.firewood(ctx, ix1 - 0.6, 0, iz1 - 1.6, Math.PI / 2, 4);
  P.sacks(ctx, ix1 - 1.0, 0, iz0 + 2.6, 3, 6304);
  P.jar(ctx, ix0 + 0.5, 0, cz + 0.4, 1.2, { room });
  P.jar(ctx, ix0 + 0.6, 0, cz + 1.2, 1.0, { room });
  P.dropped(ctx, ix0 + 0.6, 0.82, cz - 3.0, 0.4, 'knife');
  bakeCorpse(wb, cx + 2.2, 0, cz + 2.4, -2.4, 'sit', 'villager', 70);
  bakeCorpse(wb, ix0 + 1.4, 0, cz - 1.4, 0.8, 'face', 'villager', 71);
  P.decal(ctx, ix0 + 1.4, 0.03, cz - 1.4, 1.6);
  wb.setRoom(null);
  L.enemies.push({ type: 'penitent', x: cx - 2.6, y: 0, z: cz + 2.4, yaw: 2.4, idle: 'eat', id: 'e_cocina1' }, { type: 'crawler', x: cx + 2.6, y: 0, z: cz - 2.4, yaw: -0.8, idle: 'stand', id: 'e_cocina2' });
  L.zones.push({ id: 'cocina', rects: [[ix0, iz0, ix1, iz1, -1, yC]], atmo: 'interior', room });
  L.map.push({ id: 'cocina', r: [R.x0, R.z0, R.x1, R.z1] });
}

// ------------------------------------------------------------------------ el cuerpo de guardia
// Al otro lado de la puerta: las mesas de la tropa, sus jergones, las
// armaduras y las lanzas en sus soportes, el brasero.
function guardia(ctx, S, L) {
  const wb = ctx.wb;
  const G = FORT.guardia,
    SE = FORT.torres.SE;
  const room = 'guardia';
  const { x0, x1, z0, z1 } = G;
  W(S, x0, z0, x1, z1);
  wb.box('flag', x0, -0.05, z0, x1, 0.02, z1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room, tint: PISO });
  interiorRoom(ctx, x0, z0, x1, z1, 0, F1, { room, floor: false, skip: ['n', 's', 'e', 'w'], skirting: false });
  cara1(ctx, 'wallstone', 'w', SE.x0, z0, z1, 0, F1, room, [0.74, 0.7, 0.64]);
  wb.setRoom(room);
  P.table(ctx, (x0 + x1) / 2, 0, (z0 + z1) / 2, 3.2, 1.0, 0, {});
  P.bench(ctx, (x0 + x1) / 2, 0, (z0 + z1) / 2 - 0.85, 2.8, 0);
  P.bench(ctx, (x0 + x1) / 2, 0, (z0 + z1) / 2 + 0.85, 2.8, 0);
  P.candles(ctx, (x0 + x1) / 2 + 0.6, 0.82, (z0 + z1) / 2, 3, 6411, { room, radius: 6, intensity: 0.8 });
  P.weaponRack(ctx, x1 - 0.35, 0, z0 + 2.4, -Math.PI / 2);
  P.weaponRack(ctx, x1 - 0.35, 0, z1 - 2.4, -Math.PI / 2);
  P.armorStand(ctx, x0 + 0.8, 0, z0 + 1.2, Math.PI / 2, { room });
  P.armorStand(ctx, x0 + 0.8, 0, z0 + 2.6, Math.PI / 2, { room });
  for (const x of [x0 + 2.6, x0 + 5.0, x0 + 7.4]) P.hay(ctx, x, 0, z1 - 1.0, 0);
  P.barrel(ctx, x1 - 1.0, 0, (z0 + z1) / 2, {});
  P.brazier(ctx, x0 + 3.0, 0, (z0 + z1) / 2, { room });
  P.arrows(ctx, x1 - 2.0, 0, z1 - 1.2, 6, 6412, 0.9);
  bakeCorpse(wb, x0 + 5.2, 0, z1 - 1.0, 0.2, 'back', 'soldier', 44);
  wb.setRoom(null);
  P.wallTorch(ctx, x0 + 0.02, 2.4, z1 - 2.0, 'e', { room });
  P.wallTorch(ctx, x1 - 0.02, 2.4, z0 + 4.4, 'w', { room });
  ctx.lights.push({ x: (x0 + x1) / 2, y: 3.4, z: (z0 + z1) / 2, r: 1, g: 0.5, b: 0.24, radius: 11, intensity: 0.6, room });
  L.interact.push({ kind: 'item', id: 'i_virotes_guardia', item: 'virote', n: 6, x: x1 - 1.6, y: 0.95, z: (z0 + z1) / 2 - 0.4 });
  L.enemies.push({ type: 'soldier', x: (x0 + x1) / 2 - 2, y: 0, z: (z0 + z1) / 2 + 2.2, yaw: Math.PI, idle: 'stand', id: 'e_guardia1' }, { type: 'soldier', x: x1 - 2.4, y: 0, z: z0 + 1.6, yaw: -Math.PI / 2, idle: 'stand', id: 'e_guardia2' });
  L.zones.push({ id: 'guardia_fortaleza', rects: [[x0, z0, x1, z1, -1, F1]], atmo: 'interior', room });
  L.map.push({ id: 'guardia_fortaleza', r: [x0, z0, x1, z1] });
}

// ------------------------------------------------------------------------ la capilla real
// En la crujía de levante, con el altar al norte, contra la torre de la
// coracha; la nave a doble altura bajo su armadura, los bancos, y a los pies,
// la tribuna del Rey sobre sus pies derechos, con su escalera contra la
// muralla. Sobre la tribuna, la espadaña del patio: el cordón de la campana
// baja hasta ella, y en él, atada, la llave del capellán.
function capilla(ctx, S, L) {
  const wb = ctx.wb;
  const C = FORT.capilla,
    E = FORT.eave;
  const room = 'capilla';
  const { x0, x1, z0, z1 } = C;
  const xc = (x0 + x1) / 2;
  const tint = [0.84, 0.8, 0.74];
  W(S, x0, z0, x1, z1);
  wb.box('flag', x0, -0.05, z0, x1, 0.02, z1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room, tint: PISO });
  // el muro del altar (el de la torre), hasta la armadura, y el de la
  // cancillería
  {
    const xr = (FORT.patio.x1 + x1) / 2,
      yR = C.ridge - 0.26,
      yE = E - 0.24;
    cara1(ctx, 'wallstone', 's', z0, x0, x1, 0, yE, room, tint);
    tri(wb, 'wallstone', V(x0, yE, z0 + 0.012), V(x1, yE, z0 + 0.012), V(xr, yR, z0 + 0.012), V(0, 0, 1), { ao: false, room, tint });
    pieza(ctx, 'wallstone', x0, 0, z1, x1, E, z1 + 1.2, [['n', room], ['s', 'cancilleria', 0, F1]], { tint });
  }
  // el presbiterio, en alto, con el altar, el retablo y la cruz
  const zp = z0 + 5.0;
  solid(ctx, 'flag', x0, 0, z0, x1, 0.3, zp - 0.4, { faces: 'ts', ao: false, sub: 2, room, tint: [0.8, 0.77, 0.72] });
  solid(ctx, 'flag', x0, 0, zp - 0.4, x1, 0.15, zp, { faces: 'ts', ao: false, sub: 2, room, tint: [0.8, 0.77, 0.72] });
  wb.setRoom(room);
  P.altarTable(ctx, xc, 0.3, z0 + 1.0, 0, 2.6);
  wb.setRoom(null);
  wb.box('frescoRates', xc - 2.2, 1.6, z0 + 0.02, xc + 2.2, 5.6, z0 + 0.06, { faces: 's', ao: false, room, tint: [0.85, 0.8, 0.74] });
  wb.box('gold', xc - 2.35, 1.5, z0 + 0.02, xc + 2.35, 1.62, z0 + 0.14, { ao: false, room, tint: [0.7, 0.56, 0.3] });
  wb.box('gold', xc - 2.35, 5.6, z0 + 0.02, xc + 2.35, 5.75, z0 + 0.16, { ao: false, room, tint: [0.7, 0.56, 0.3] });
  wb.box('wooddark', xc - 0.08, 5.9, z0 + 0.04, xc + 0.08, 8.2, z0 + 0.2, { ao: false, room });
  wb.box('wooddark', xc - 0.75, 7.3, z0 + 0.04, xc + 0.75, 7.48, z0 + 0.2, { ao: false, room });
  P.candles(ctx, xc - 1.0, 1.32, z0 + 0.95, 5, 6601, { room, radius: 8, intensity: 1.2 });
  P.candles(ctx, xc + 1.0, 1.32, z0 + 0.95, 5, 6602, { room, radius: 8, intensity: 1.2 });
  P.candelabra(ctx, xc - 2.6, 0.3, z0 + 1.4, { room });
  P.candelabra(ctx, xc + 2.6, 0.3, z0 + 1.4, { room });
  // el reclinatorio del capellán, con su confesión
  {
    const rx = xc + 1.9,
      rz = zp + 0.9;
    wb.box('wooddark', rx - 0.4, 0, rz - 0.15, rx + 0.4, 0.22, rz + 0.25, { ao: false, room });
    wb.box('wooddark', rx - 0.4, 0, rz - 0.42, rx + 0.4, 1.0, rz - 0.3, { ao: false, room });
    wb.box('wooddark', rx - 0.45, 1.0, rz - 0.6, rx + 0.45, 1.06, rz - 0.18, { ao: false, faces: 'tnsewb', room });
    ctx.col.add(rx - 0.45, 0, rz - 0.6, rx + 0.45, 1.06, rz + 0.25);
    L.interact.push({ kind: 'note', id: 'n_capellan', note: 'capellan', x: rx, y: 1.08, z: rz - 0.4, model: 'paper' });
  }
  // los bancos de la nave
  for (let z = zp + 2.2; z < -72.6; z += 1.45) {
    P.pew(ctx, x0 + 2.6, 0, z, 3.2, Math.PI);
    P.pew(ctx, x1 - 3.1, 0, z, 2.4, Math.PI);
  }
  // las ventanas de la muralla, por dentro, y las del patio
  for (const z of [-82, -76, -70, -64]) vano(ctx, 'w', x1, z, 6.0, 0.5, 2.0, { room });
  for (const z of [-82, -76, -62.5]) vano(ctx, 'e', x0, z, 6.6, 0.55, 1.6, { room });
  // la tribuna: el suelo de tablas sobre sus pies derechos y su viga, el
  // antepecho, y la escalera de tablas contra la muralla
  const T = { y: F1, z0: z1 - 4.0 };
  {
    const yT = T.y;
    forjado(ctx, x0, T.z0, x1, z1, yT, [], room, room);
    wb.box('timber', x0, yT - 0.55, T.z0 - 0.12, x1, yT - 0.3, T.z0 + 0.12, { ao: false, faces: 'nsewb', room });
    for (const x of [x0 + 2.6, xc, x1 - 2.6]) {
      wb.box('timber', x - 0.13, 0, T.z0 - 0.13, x + 0.13, yT - 0.55, T.z0 + 0.13, { aoH: 0.8, faces: 'nsew', room });
      ctx.col.add(x - 0.14, 0, T.z0 - 0.14, x + 0.14, yT, T.z0 + 0.14);
    }
    // el antepecho (abierto donde llega la escalera)
    const xs = x1 - 1.7;
    wb.box('wooddark', x0, yT, T.z0, xs, yT + 1.0, T.z0 + 0.1, { ao: false, faces: 'tnsew', room });
    for (let x = x0 + 0.4; x < xs; x += 0.5) wb.box('wooddark', x - 0.03, yT + 0.1, T.z0 - 0.02, x + 0.03, yT + 0.9, T.z0 + 0.12, { ao: false, room });
    wb.box('clothRed', x0 + 2.0, yT + 0.3, T.z0 - 0.04, xs - 1.0, yT + 0.98, T.z0 - 0.02, { ao: false, faces: 'n', room });
    ctx.col.add(x0, yT, T.z0 - 0.02, xs, yT + 1.6, T.z0 + 0.12);
    // la escalera: sube hacia el sur, contra la muralla
    const n = 19,
      rise = yT / n,
      run = 0.39;
    wb.setRoom(room);
    stairs(ctx, x1 - 0.8, 0, T.z0 - n * run, 's', 1.5, n, rise, run, 'planks', { solidBelow: false });
    wb.setRoom(null);
    // (su zanca y su pasamanos)
    const zb = T.z0 - n * run;
    const rail = [V(x1 - 1.6, 0.95, zb), V(x1 - 1.6, yT + 0.95, T.z0)];
    wb.geometry('wooddark', new THREE.BoxGeometry(0.07, rail[0].distanceTo(rail[1]), 0.07), new THREE.Matrix4().compose(rail[0].clone().add(rail[1]).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), rail[1].clone().sub(rail[0]).normalize()), V(1, 1, 1)), { ao: false, room });
    for (let i = 1; i < n; i += 3) wb.box('wooddark', x1 - 1.64, i * rise, zb + i * run - 0.03, x1 - 1.56, i * rise + 0.95, zb + i * run + 0.03, { ao: false, room });
    ctx.col.add(x1 - 1.64, 0, zb, x1 - 1.56, yT + 1.2, T.z0);
    // en la tribuna: el sitial del Rey para la misa y una plañidera
    sitial(ctx, xc - 1.0, yT, z1 - 1.4, Math.PI, room);
    P.candles(ctx, x0 + 0.6, yT, z1 - 0.6, 3, 6603, { room, radius: 5, intensity: 0.7 });
    L.enemies.push({ type: 'mourner', x: xc + 1.4, y: yT, z: T.z0 + 1.2, yaw: Math.PI, idle: 'stand', id: 'e_capilla2' });
  }
  // la espadaña: sobre el muro del patio, a los pies; el vano con la campana y
  // el cordón, que entra por el muro y baja hasta la tribuna
  {
    const xm = FORT.patio.x1,
      xw = xm + FORT.ti;
    const zc = z1 - 2.0,
      w = 3.0;
    const ya = E,
      yb = E + 5.4;
    const vz0 = zc - 0.75,
      vz1 = zc + 0.75,
      vy0 = E + 2.2,
      vy1 = E + 3.6;
    muroVanos(ctx, 'z', zc - w / 2, zc + w / 2, xm, xw, ya, yb, [{ c: zc, w: vz1 - vz0, y: vy0, h: vy1 - vy0, rise: 0.75, ring: 0.2 }], [{ room: null, y0: ya, y1: yb }], [{ room: null, y0: ya, y1: yb }], { mat: 'ashlar', tint: PIEDRA.silla, revealRoom: null, collide: false });
    // (los cabos de la espadaña)
    wb.box('ashlar', xm, ya, zc - w / 2, xw, yb, zc - w / 2 + 0.01, { faces: 'n', ao: false, tint: PIEDRA.silla });
    wb.box('ashlar', xm, ya, zc + w / 2 - 0.01, xw, yb, zc + w / 2, { faces: 's', ao: false, tint: PIEDRA.silla });
    // el remate a dos aguas y la cruz
    const ny = yb + 1.0;
    tri(wb, 'ashlar', V(xm - 0.1, yb, zc - w / 2 - 0.1), V(xm - 0.1, yb, zc + w / 2 + 0.1), V(xm - 0.1, ny, zc), V(-1, 0, 0), { ao: false, tint: PIEDRA.silla });
    tri(wb, 'ashlar', V(xw + 0.1, yb, zc - w / 2 - 0.1), V(xw + 0.1, yb, zc + w / 2 + 0.1), V(xw + 0.1, ny, zc), V(1, 0, 0), { ao: false, tint: PIEDRA.silla });
    for (const s of [-1, 1]) {
      const a = V(xm - 0.1, yb, zc + s * (w / 2 + 0.1)),
        b = V(xw + 0.1, yb, zc + s * (w / 2 + 0.1)),
        c = V(xw + 0.1, ny, zc),
        d = V(xm - 0.1, ny, zc);
      const nn = V(0, (w / 2 + 0.1) / 1.0, s).normalize();
      const q = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a));
      if (q.dot(nn) >= 0) wb.quad('ashlar', a, b, c, d, { ao: false, tint: PIEDRA.silla });
      else wb.quad('ashlar', d, c, b, a, { ao: false, tint: PIEDRA.silla });
    }
    wb.box('ashlar', xm - 0.1, yb - 0.12, zc - w / 2 - 0.1, xw + 0.1, yb, zc + w / 2 + 0.1, { faces: 'nsewb', ao: false, tint: PIEDRA.silla });
    wb.box('iron', (xm + xw) / 2 - 0.04, ny - 0.1, zc - 0.04, (xm + xw) / 2 + 0.04, ny + 1.1, zc + 0.04, { ao: false });
    wb.box('iron', (xm + xw) / 2 - 0.04, ny + 0.55, zc - 0.32, (xm + xw) / 2 + 0.04, ny + 0.63, zc + 0.32, { ao: false });
    // la campana en su yugo y el cordón
    const bx = (xm + xw) / 2;
    wb.box('wooddark', bx - 0.12, vy1 - 0.25, vz0, bx + 0.12, vy1 - 0.05, vz1, { ao: false, faces: 'tnsewb' });
    wb.cylinder('bronzeAged', bx, vy1 - 1.15, zc, 0.52, 0.26, 0.9, 12, { ao: false, capTop: true });
    wb.cylinder('bronzeIn', bx, vy1 - 1.16, zc, 0.5, 0.5, 0.01, 12, { ao: false, capBot: true });
    const rx = x0 + 0.35;
    wb.box('rope', bx - 0.015, vy1 - 2.0, zc - 0.015, bx + 0.015, vy1 - 1.0, zc + 0.015, { ao: false });
    wb.box('rope', bx, vy1 - 2.02, zc - 0.015, rx, vy1 - 1.98, zc + 0.015, { ao: false });
    wb.box('rope', rx - 0.015, T.y + 0.9, zc - 0.015, rx + 0.015, vy1 - 2.0, zc + 0.015, { ao: false, room });
    ctx.col.addCam(xm, ya, zc - w / 2, xw, ny, zc + w / 2);
    // la llave del capellán, atada al cordón: al soltarla, la campana suena
    L.interact.push({ kind: 'item', id: 'i_llave_capellan', item: 'llave_capellan', x: rx, y: T.y + 1.1, z: zc, sound: 'bellToll', soundAt: [bx, vy1 - 0.6, zc], msg: 'campanaSuena' });
  }
  // la luz de la nave: dos coronas de velas
  for (const z of [-79, -71]) {
    P.candleCrown(ctx, xc, 5.4, z, C.ridge - 0.6, { room, r: 0.9, n: 8 });
    ctx.lights.push({ x: xc, y: 5.0, z, r: 1, g: 0.6, b: 0.3, radius: 9, intensity: 1.0, room });
  }
  ctx.lights.push({ x: xc, y: T.y + 2.0, z: z1 - 2.0, r: 1, g: 0.55, b: 0.26, radius: 8, intensity: 0.9, room });
  for (const z of [-79, -72]) {
    P.wallTorch(ctx, x0 + 0.02, 2.6, z, 'e', { room });
    P.wallTorch(ctx, x1 - 0.02, 2.6, z, 'w', { room });
  }
  P.wallTorch(ctx, x0 + 0.02, 2.4, -63.0, 'e', { room });
  L.enemies.push({ type: 'cortesanoSuelto', x: x0 + 2.4, y: 0, z: zp + 3.6, yaw: Math.PI, idle: 'kneel', id: 'e_capilla1' });
  L.zones.push(
    { id: 'capilla_tribuna', rects: [[x0, T.z0, x1, z1, T.y - 0.3, E + 3]], atmo: 'chapel', room },
    { id: 'capilla_real', rects: [[x0, z0, x1, z1, -1, C.ridge]], atmo: 'chapel', room }
  );
  L.map.push({ id: 'capilla_real', r: [FORT.patio.x1, z0, FORT.x1, z1 + 0.6] });
}

// ------------------------------------------------------------------------ la cancillería
// La sala de los escribanos: los pupitres, las mesas de copiar, los estantes
// de los registros, la esquina del sello y, en el testero, la mesa del
// canciller bajo el estandarte del Rey, con el traslado de la carta de la reja.
function cancilleria(ctx, S, L) {
  const wb = ctx.wb;
  const Cn = FORT.cancilleria,
    SE = FORT.torres.SE;
  const room = 'cancilleria';
  const { x0, x1, z0, z1 } = Cn;
  const rng = new RNG(7201);
  W(S, x0, z0, x1, z1);
  wb.box('planks', x0, -0.05, z0, x1, 0.02, z1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room, tint: [0.66, 0.6, 0.52] });
  interiorRoom(ctx, x0, z0, x1, z1, 0, F1, { room, floor: false, skip: ['n', 's', 'e', 'w'], skirting: false, ceilMat: 'wooddark' });
  // los cabos de los muros del Tombo que asoman a la sala
  cara1(ctx, 'wallstone', 'n', SE.z0, x0, SE.x0 + SE.t, 0, F1, room, [0.74, 0.7, 0.64]);
  cara1(ctx, 'wallstone', 'n', SE.z0, SE.x1 - SE.t, x1, 0, F1, room, [0.74, 0.7, 0.64]);
  wb.setRoom(room);
  // los pupitres contra la muralla y las mesas de copiar
  for (const z of [z0 + 1.8, z0 + 4.4, z0 + 7.0]) pupitre(ctx, x1 - 0.8, 0, z, -Math.PI / 2, room, rng);
  for (const z of [z0 + 3.0, z0 + 7.6]) {
    P.table(ctx, (x0 + x1) / 2 - 0.6, 0, z, 3.0, 1.0, Math.PI / 2, {});
    P.bench(ctx, (x0 + x1) / 2 - 1.5, 0, z, 2.6, Math.PI / 2);
    for (let i = 0; i < 4; i++) hoja(wb, (x0 + x1) / 2 - 0.6 + rng.range(-0.3, 0.3), 0.8, z + rng.range(-1.2, 1.2), rng.range(0, 3), room, rng, i);
  }
  // los estantes contra el muro de la capilla
  estante(ctx, x0 + 2.0, 0, z0 + 0.22, 0, 2.2, room, 7203);
  estante(ctx, x0 + 4.4, 0, z0 + 0.22, 0, 2.2, room, 7204);
  estante(ctx, x0 + 6.8, 0, z0 + 0.22, 0, 2.2, room, 7205);
  // la esquina del sello: la caldera de la cera y los panes
  calderaCera(ctx, x0 + 0.9, 0, z1 - 1.0, room);
  panesCera(ctx, x0 + 2.2, 0, z1 - 0.6, 6, room, 7207);
  // la mesa del canciller, en su tarima, bajo el estandarte
  {
    const mx = x1 - 2.4,
      mz = z1 - 1.6;
    solid(ctx, 'planks', mx - 1.8, 0, mz - 1.2, x1, 0.25, z1, { faces: 'tnw', ao: false, room, tint: [0.62, 0.55, 0.48] });
    P.table(ctx, mx, 0.25, mz, 2.2, 1.0, 0, {});
    wb.box('clothRed', mx - 1.12, 1.05, mz - 0.52, mx + 1.12, 1.07, mz + 0.52, { ao: false, faces: 'tnsew', room });
    P.candles(ctx, mx + 0.8, 1.07, mz + 0.2, 3, 7206, { room, radius: 6, intensity: 0.9 });
    P.banner(ctx, mx, 4.4, z1 - 0.1, Math.PI, 'bannerRey', 1.4, 2.6);
    L.interact.push({ kind: 'note', id: 'n_carta_rey', note: 'cartaRey', x: mx - 0.3, y: 1.07, z: mz - 0.1, model: 'paper' });
  }
  for (let i = 0; i < 9; i++) hoja(wb, x0 + 1 + rng.range(0, 8), 0.02, z0 + 1 + rng.range(0, 11), rng.range(0, 6), room, rng, i);
  wb.setRoom(null);
  ctx.lights.push({ x: (x0 + x1) / 2, y: 3.4, z: (z0 + z1) / 2, r: 1, g: 0.55, b: 0.26, radius: 12, intensity: 0.85, room });
  P.wallTorch(ctx, x0 + 0.02, 2.4, z0 + 5.6, 'e', { room });
  P.wallTorch(ctx, x0 + 0.02, 2.4, z1 - 2.2, 'e', { room });
  for (const z of [z0 + 3.0, z0 + 7.6]) P.candles(ctx, (x0 + x1) / 2 - 0.6, 0.8, z + 0.9, 3, 7208 + Math.round(z), { room, radius: 5, intensity: 0.8 });
  L.zones.push({ id: 'cancilleria', rects: [[x0, z0, x1, z1, -1, F1]], atmo: 'interior', room });
  L.map.push({ id: 'cancilleria', r: [x0, z0 - 1.2, x1, z1] });
}

// ------------------------------------------------------------------------ el Tombo
// La torre del sureste: el archivo y el tesoro de los papeles del Rey. Cuatro
// plantas unidas por un caracol en su rincón: los registros (con el libro
// grande en su atril), los legajos, las cartas y, arriba, las arcas del Rey,
// cada una con sus sellos, y el canciller sentado entre ellas.
function tombo(ctx, S, L) {
  const wb = ctx.wb;
  const R = FORT.torres.SE;
  const ix0 = R.x0 + R.t,
    ix1 = R.x1 - R.t,
    iz0 = R.z0 + R.t,
    iz1 = R.z1 - R.t;
  const cx = (ix0 + ix1) / 2,
    cz = (iz0 + iz1) / 2;
  const pisos = [0, 4.5, 9, 13.5];
  const techo = 18;
  const rooms = ['tombo1', 'tombo2', 'tombo3', 'tombo4'];
  const bands = pisos.map((y, k) => ({ room: rooms[k], y0: k ? y - 0.3 : 0, y1: k < 3 ? pisos[k + 1] - 0.3 : techo }));
  W(S, ix0, iz0, ix1, iz1);
  // el muro del norte, con la puerta de la cancillería
  const xd = -69.2;
  muroVanos(ctx, 'x', ix0, ix1, R.z0, R.z0 + R.t, 0, R.h, [{ c: xd, w: 1.4, y: 0, h: 2.4, rise: 0.7, ring: 0.24 }], [{ room: 'cancilleria', y0: 0, y1: F1 }], bands, { tint: [0.74, 0.7, 0.64], revealRoom: 'tombo1' });
  W(S, xd - 0.7, R.z0 - 0.3, xd + 0.7, iz0 + 0.3);
  L.interact.push({ kind: 'door', id: 'd_tombo', x: xd, y: 0, z: R.z0 + R.t / 2, w: 1.4, h: 3.1, arch: true, axis: 'x', mat: 'planks', hinge: -1, swing: -1, plane: iz0, inset: 0.06, lock: { type: 'none' } });
  dentro(ctx, R, ['s', 'w', 'e'], bands, { tint: [0.72, 0.7, 0.66], mat: 'ashlar' });
  // el caracol, los forjados y el techo
  const K = caracol(ctx, ix1, iz1, 1.6, pisos, rooms, { tint: [1, 1, 1] });
  for (let k = 1; k < 4; k++) forjado(ctx, ix0, iz0, ix1, iz1, pisos[k], [K.hueco], rooms[k], rooms[k - 1]);
  wb.box('flag', ix0, -0.05, iz0, ix1, 0.02, iz1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room: rooms[0], tint: PISO });
  wb.box('wooddark', ix0, techo, iz0, ix1, techo + 0.2, iz1, { faces: 'b', ao: false, room: rooms[3], tint: [0.56, 0.5, 0.44] });
  for (let z = iz0 + 0.8; z < iz1 - 0.4; z += 1.3) wb.box('timber', ix0, techo - 0.24, z - 0.11, ix1, techo, z + 0.11, { ao: false, faces: 'nsewb', room: rooms[3] });
  // las saeteras de cada planta, por dentro, y la luz que entra por ellas
  pisos.forEach((y, k) => {
    saeteraDentro(ctx, 'n', iz1, ix0 + 2.2, y + 1.4, rooms[k]);
    saeteraDentro(ctx, 'w', ix1, iz0 + 2.6, y + 1.4, rooms[k]);
    saeteraDentro(ctx, 'e', ix0, cz, y + 1.4, rooms[k]);
    ctx.lights.push({ x: cx - 1, y: y + 2.0, z: cz - 1, r: 0.55, g: 0.58, b: 0.68, radius: 8.5, intensity: 0.7, room: rooms[k] });
    P.wallTorch(ctx, ix0 + 0.02, y + 2.4, iz0 + 1.4, 'e', { room: rooms[k] });
  });
  // la planta de abajo: los registros, el libro grande en su atril, el velón
  {
    const y = 0,
      room = rooms[0];
    wb.setRoom(room);
    atril(ctx, cx - 1.2, y, cz - 0.6, 0, room);
    wb.box('leather', cx - 1.42, y + 1.12, cz - 0.62, cx - 0.98, y + 1.17, cz - 0.18, { ao: false, room, tint: [0.42, 0.26, 0.18] });
    P.candelabra(ctx, cx - 2.4, y, cz - 0.2, { room });
    estante(ctx, ix0 + 0.22, y, iz0 + 2.4, Math.PI / 2, 2.0, room, 7301);
    estante(ctx, ix0 + 0.22, y, iz0 + 5.0, Math.PI / 2, 2.0, room, 7302);
    estante(ctx, ix0 + 3.0, y, iz1 - 0.22, Math.PI, 2.0, room, 7303);
    chest(ctx, ix1 - 4.4, y, iz0 + 0.7, Math.PI, room, 1.0);
    wb.setRoom(null);
    L.interact.push({ kind: 'note', id: 'n_registro', note: 'registro', x: cx - 1.2, y: y + 1.2, z: cz - 0.4, model: 'book' });
  }
  // la segunda: los legajos, en los estantes y en pilas por el suelo
  {
    const y = pisos[1],
      room = rooms[1];
    const rng = new RNG(7310);
    wb.setRoom(room);
    estante(ctx, ix0 + 0.22, y, iz0 + 2.0, Math.PI / 2, 2.2, room, 7311);
    estante(ctx, ix0 + 0.22, y, iz0 + 4.6, Math.PI / 2, 2.2, room, 7312);
    estante(ctx, ix0 + 2.8, y, iz1 - 0.22, Math.PI, 2.2, room, 7313);
    for (const [px, pz] of [
      [cx - 0.6, cz + 0.2],
      [cx + 0.9, cz - 1.6],
      [ix0 + 2.0, iz0 + 1.0],
      [cx - 1.8, cz + 2.0],
    ])
      legajos(ctx, px, y, pz, rng.range(0, 3), room, rng);
    wb.setRoom(null);
    L.enemies.push({ type: 'cortesanoSuelto', x: cx - 0.2, y, z: cz - 0.9, yaw: Math.PI / 2, idle: 'kneel', id: 'e_tombo1' });
  }
  // la tercera: las cartas, los fueros y las bulas, en arcones; la mesa con
  // una bula desplegada, con su plomo
  {
    const y = pisos[2],
      room = rooms[2];
    const rng = new RNG(7320);
    wb.setRoom(room);
    chest(ctx, ix0 + 0.4, y, cz - 0.8, Math.PI / 2, room, 1.0);
    chest(ctx, ix0 + 0.4, y, cz + 0.8, Math.PI / 2, room, 1.0);
    chest(ctx, cx, y, iz0 + 0.45, 0, room, 1.0);
    P.table(ctx, cx - 0.4, y, cz + 0.2, 1.6, 0.9, 0);
    wb.box('clothWhite', cx - 0.72, y + 0.8, cz - 0.1, cx - 0.08, y + 0.812, cz + 0.4, { ao: false, faces: 't', room, grime: false, tint: PERG[0] });
    wb.cylinder('iron', cx - 0.4, y + 0.8, cz + 0.52, 0.05, 0.05, 0.015, 10, { ao: false, capTop: true, room, tint: [0.7, 0.72, 0.76] });
    legajos(ctx, ix0 + 1.6, y, iz1 - 1.4, 0.3, room, rng);
    wb.setRoom(null);
    L.enemies.push({ type: 'crawler', x: cx + 0.8, y, z: cz + 1.6, yaw: -Math.PI / 2, idle: 'stand', id: 'e_tombo2' });
  }
  // la cuarta: las arcas del Rey, cada una con sus sellos, y el canciller
  {
    const y = pisos[3],
      room = rooms[3];
    wb.setRoom(room);
    // [id, x, z, rot, sellos, lo que dice, lo que da, trampa]
    const xw = ix0 + 0.5,
      zn = iz0 + 0.5,
      zs = iz1 - 0.5;
    const arcas = [
      ['a_se', xw, iz0 + 2.2, Math.PI / 2, 'vv', 'arcaSe', null, 0],
      ['a_guarda1', xw, cz, Math.PI / 2, 'nn', 'arcaResorte1', null, 30],
      ['a_camara3', xw, iz1 - 2.0, Math.PI / 2, 'rrr', 'arcaCamara3', 'llave_canciller', 0],
      ['a_guarda3', ix0 + 3.0, zn, 0, 'nnn', 'arcaGuarda3', 'virote', 0],
      ['a_camara2', cx + 0.6, zn, 0, 'rr', 'arcaCamara2', null, 0],
      ['a_guarda2', ix0 + 3.4, zs, Math.PI, 'nn', 'arcaResorte2', null, 30],
    ];
    const NOM = { r: 'bermejo', n: 'negro', v: 'verde' };
    const NUM = ['', 'un sello', 'dos sellos', 'tres sellos'];
    for (const [id, ax, az, rot, seals, text, item, trap] of arcas) {
      arcaSellada(ctx, ax, y, az, rot, room, id, seals.split(''), !trap && item !== 'llave_canciller');
      const s = Math.sin(rot),
        c = Math.cos(rot);
      const nom = NOM[seals[0]] + (seals.length > 1 ? 's' : '');
      L.interact.push({ kind: 'arca', id, x: ax, y, z: az, ix: ax + s * 0.75, iz: az + c * 0.75, r: 1.0, label: `Abrir el arca (${NUM[seals.length]} ${nom})`, text, after: text + 'Ya', item, n: item === 'virote' ? 6 : 1, trap });
    }
    // el canciller, sentado contra el muro entre las arcas, con el sello del
    // Rey en el regazo; a su lado, el farol, que aún arde
    const kx = cx + 0.4,
      kz = zs - 0.1;
    bakeCorpse(wb, kx, y, kz, Math.PI, 'sit', 'villager', 8);
    wb.cylinder('silver', kx, y + 0.36, kz - 0.55, 0.075, 0.075, 0.02, 14, { ao: false, capTop: true, capBot: true, room });
    wb.box('rope', kx - 0.01, y + 0.38, kz - 0.56, kx + 0.01, y + 0.62, kz - 0.54, { ao: false, room, tint: [0.18, 0.38, 0.16] });
    L.interact.push({ kind: 'examine', id: 'x_canciller', text: 'canciller', x: kx, y, z: kz - 0.7, r: 1.3 });
    farol(ctx, kx + 0.75, y, kz - 0.15, room);
    P.candles(ctx, xw + 0.5, y, cz + 1.0, 4, 7340, { room, radius: 6, intensity: 0.9 });
    // la mesa del sello, en medio, con su escribanía; los estantes del muro de
    // levante; los candeleros
    P.table(ctx, cx - 0.6, y, cz - 0.4, 2.0, 1.0, 0, {});
    wb.box('wooddark', cx - 1.0, y + 0.8, cz - 0.7, cx - 0.4, y + 0.95, cz - 0.3, { ao: false, faces: 'tnsew', room, tint: [0.5, 0.36, 0.26] });
    wb.box('clothWhite', cx - 0.2, y + 0.8, cz - 0.75, cx + 0.3, y + 0.805, cz - 0.1, { ao: false, faces: 't', room, grime: false, tint: PERG[1] });
    P.stool(ctx, cx - 0.6, y, cz + 0.5, { room });
    estante(ctx, ix1 - 0.22, y, iz0 + 1.6, -Math.PI / 2, 2.2, room, 7341);
    estante(ctx, ix1 - 0.22, y, iz0 + 4.0, -Math.PI / 2, 2.2, room, 7342);
    P.candelabra(ctx, cx - 2.2, y, cz - 2.4, { room });
    P.candelabra(ctx, ix0 + 1.6, y, iz0 + 1.6, { room });
    for (let i = 0; i < 6; i++) hoja(wb, cx + Math.sin(i * 2.1) * 1.6, y, cz + Math.cos(i * 1.7) * 1.4, i * 1.3, room, new RNG(7330 + i), i);
    wb.setRoom(null);
  }
  const names = ['tombo_registros', 'tombo_legajos', 'tombo_cartas', 'tombo_arcas'];
  pisos.forEach((y, k) => {
    L.zones.push({ id: names[k], rects: [[ix0, iz0, ix1, iz1, k ? y - 0.3 : -1, k < 3 ? pisos[k + 1] - 0.3 : techo]], atmo: 'interior', room: rooms[k] });
    L.map.push({ id: names[k], r: [R.x0, R.z0, R.x1, R.z1] });
  });
}

// ------------------------------------------------------------------------ la reina
// La sala de la reina, entre su torre y la del homenaje: el estrado de las
// damas, con sus almohadones, el telar tapado, los arcones; las dueñas que
// lloran. En la torre, su cámara: la cama bajo el dosel, el reclinatorio con su
// libro de horas y el relicario.
function reina(ctx, S, L) {
  const wb = ctx.wb;
  const R = FORT.reina,
    T = FORT.torres.NO;
  const room = 'reina_sala';
  const { x0, x1, z0, z1 } = R;
  W(S, x0, z0, x1, z1);
  wb.box('planks', x0, -0.05, z0, x1, 0.02, z1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room, tint: [0.62, 0.55, 0.46] });
  interiorRoom(ctx, x0, z0, x1, z1, 0, F1, { room, floor: false, skip: ['n', 's', 'e', 'w'], skirting: false });
  // los cabos que asoman a la sala: el del muro del patio y el de la torre
  cara1(ctx, 'wallstone', 'n', z1, FORT.patio.x0 - FORT.ti, FORT.patio.x0, 0, F1, room, [0.8, 0.76, 0.7]);
  cara1(ctx, 'wallstone', 'e', x0, T.z1 - T.t, z1, 0, F1, room, [0.8, 0.76, 0.7]);
  // el muro de la torre, con su puerta
  const zd = -93.4;
  const tR = 'reina_torre';
  muroVanos(ctx, 'z', T.z0 + T.t, T.z1 - T.t, T.x1 - T.t, T.x1, 0, T.h, [{ c: zd, w: 1.4, y: 0, h: 2.4, rise: 0.7, ring: 0.24 }], [{ room: tR, y0: 0, y1: F1 }], [{ room, y0: 0, y1: F1 }], { tint: [0.8, 0.76, 0.7], revealRoom: room });
  W(S, T.x1 - T.t - 0.3, zd - 0.7, T.x1 + 0.3, zd + 0.7);
  L.interact.push({ kind: 'door', id: 'd_torre_reina', x: T.x1 - T.t / 2, y: 0, z: zd, w: 1.4, h: 3.1, arch: true, axis: 'z', mat: 'planks', hinge: -1, swing: -1, plane: T.x1 - T.t, inset: 0.06, lock: { type: 'none' } });
  // el estrado de las damas, contra la muralla, con sus almohadones; el telar
  // tapado; los arcones
  wb.setRoom(room);
  solid(ctx, 'planks', x0 + 2, 0, z0, x1 - 2, 0.3, z0 + 2.4, { faces: 'ts', ao: false, room, tint: [0.56, 0.48, 0.4] });
  for (let x = x0 + 2.8; x < x1 - 2.4; x += 1.5) wb.box(['clothRed', 'clothBlue', 'clothPurple'][Math.round(x) & 1 ? 0 : 1], x - 0.4, 0.3, z0 + 0.6, x + 0.4, 0.5, z0 + 1.4, { ao: false, faces: 'tnsew', room });
  P.loom(ctx, x0 + 6.0, 0, z1 - 1.6, 0, { room, cloth: 'clothRed' });
  wb.box('linen', x0 + 4.8, 0.02, z1 - 2.5, x0 + 7.2, 1.85, z1 - 0.6, { ao: false, faces: 'tnsew', room, tint: [0.78, 0.76, 0.72] });
  chest(ctx, x0 + 1.0, 0, z1 - 1.0, Math.PI / 2, room, 1.2);
  chest(ctx, x0 + 3.0, 0, z1 - 0.7, 0, room, 1.0);
  P.spinningWheel(ctx, x0 + 8.8, 0, z1 - 1.3, 0.6, { room });
  P.brazier(ctx, (x0 + x1) / 2, 0, z0 + 3.2, { room });
  P.candles(ctx, x1 - 1.0, 0, z0 + 3.0, 4, 6701, { room, radius: 7, intensity: 1.0 });
  P.candles(ctx, x0 + 1.0, 0.3, z0 + 1.0, 4, 6703, { room, radius: 7, intensity: 0.9 });
  ctx.lights.push({ x: (x0 + x1) / 2, y: 3.4, z: (z0 + z1) / 2, r: 1, g: 0.5, b: 0.26, radius: 11, intensity: 0.5, room });
  tapiz(ctx, (x0 + x1) / 2, 4.6, z0 + 0.06, 0, 4.0, 2.8, { room, mat: 'clothBlue' });
  wb.setRoom(null);
  L.enemies.push({ type: 'mourner', x: x0 + 4.4, y: 0, z: z0 + 3.4, yaw: 0, idle: 'stand', id: 'e_reina1' }, { type: 'mourner', x: x1 - 5.4, y: 0, z: (z0 + z1) / 2, yaw: -1.2, idle: 'stand', id: 'e_reina2' });
  L.zones.push({ id: 'reina_sala', rects: [[x0, z0, x1, z1, -1, F1]], atmo: 'interior', room });
  L.map.push({ id: 'reina_sala', r: [x0, z0, x1, z1] });
  // la cámara de la torre
  {
    const room = tR;
    const ix0 = T.x0 + T.t,
      ix1 = T.x1 - T.t,
      iz0 = T.z0 + T.t,
      iz1 = T.z1 - T.t;
    W(S, ix0, iz0, ix1, iz1);
    dentro(ctx, T, ['n', 's', 'w'], [{ room, y0: 0, y1: F1 }], { tint: [0.8, 0.76, 0.7] });
    wb.box('planks', ix0, -0.05, iz0, ix1, 0.02, iz1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room, tint: [0.62, 0.55, 0.46] });
    interiorRoom(ctx, ix0, iz0, ix1, iz1, 0, F1, { room, floor: false, skip: ['n', 's', 'e', 'w'], skirting: false });
    for (const [d, line, u] of [
      ['n', iz1, (ix0 + ix1) / 2],
      ['w', ix1, (iz0 + iz1) / 2],
    ])
      saeteraDentro(ctx, d === 'n' ? 's' : 'e', d === 'n' ? iz0 : ix0, u, 2.6, room);
    // la cama bajo su dosel
    const bx = ix0 + 1.4,
      bz = (iz0 + iz1) / 2;
    wb.setRoom(room);
    P.bed(ctx, bx, 0, bz, Math.PI / 2);
    for (const [sx, sz] of [
      [-1.1, -0.6],
      [-1.1, 0.6],
      [1.1, -0.6],
      [1.1, 0.6],
    ])
      wb.box('wooddark', bx + sz - 0.05, 0, bz + sx - 0.05, bx + sz + 0.05, 2.6, bz + sx + 0.05, { ao: false, room });
    wb.box('clothRed', bx - 0.7, 2.6, bz - 1.2, bx + 0.7, 2.7, bz + 1.2, { ao: false, faces: 'tnsewb', room });
    wb.box('clothRed', bx - 0.72, 1.4, bz - 1.2, bx - 0.68, 2.6, bz + 1.2, { ao: false, faces: 'ew', room, tint: [0.8, 0.8, 0.8] });
    // el reclinatorio con el libro y el relicario
    const kx = ix1 - 1.4,
      kz = iz0 + 1.6;
    wb.box('wooddark', kx - 0.4, 0, kz - 0.15, kx + 0.4, 0.22, kz + 0.25, { ao: false, room });
    wb.box('wooddark', kx - 0.4, 0, kz - 0.42, kx + 0.4, 1.0, kz - 0.3, { ao: false, room });
    wb.box('wooddark', kx - 0.45, 1.0, kz - 0.6, kx + 0.45, 1.06, kz - 0.18, { ao: false, faces: 'tnsewb', room });
    ctx.col.add(kx - 0.45, 0, kz - 0.6, kx + 0.45, 1.06, kz + 0.25);
    chest(ctx, ix1 - 0.6, 0, iz1 - 1.2, -Math.PI / 2, room, 1.1);
    P.candles(ctx, kx + 0.6, 0, kz - 0.4, 3, 6702, { room, radius: 5, intensity: 0.8 });
    wb.setRoom(null);
    L.interact.push(
      { kind: 'examine', id: 'x_cama_reina', text: 'camaReina', x: bx + 1.2, y: 0, z: bz, r: 1.4 },
      { kind: 'note', id: 'n_reina', note: 'reina', x: kx - 0.18, y: 1.08, z: kz - 0.42, model: 'book' },
      { kind: 'item', id: 'i_relicario_reina', item: 'relicario', x: kx + 0.22, y: 1.08, z: kz - 0.38 }
    );
    L.zones.push({ id: 'reina_torre', rects: [[ix0, iz0, ix1, iz1, -1, F1]], atmo: 'interior', room });
    L.map.push({ id: 'reina_torre', r: [T.x0, T.z0, T.x1, T.z1] });
  }
}

// ------------------------------------------------------------------------ las cámaras del Rey
// La antecámara, entre la torre del homenaje y la de la coracha: los
// escaños, la mesa, el guarda del Rey. Su puerta al patio, atrancada por
// dentro; la del tesoro, en el muro de la torre.
function rey(ctx, S, L) {
  const wb = ctx.wb;
  const K = FORT.rey,
    T = FORT.torres.NE;
  const room = 'antecamara';
  const { x0, x1, z0, z1 } = K;
  W(S, x0, z0, x1, z1);
  wb.box('flag', x0, -0.05, z0, x1, 0.02, z1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room, tint: PISO });
  interiorRoom(ctx, x0, z0, x1, z1, 0, F1, { room, floor: false, skip: ['n', 's', 'e', 'w'], skirting: false });
  cara1(ctx, 'wallstone', 'w', T.x0, T.z1 - T.t, z1, 0, F1, room, [0.8, 0.76, 0.7]);
  wb.setRoom(room);
  P.bench(ctx, x0 + 0.5, 0, (z0 + z1) / 2, 3.0, Math.PI / 2);
  P.table(ctx, (x0 + x1) / 2, 0, (z0 + z1) / 2 + 1.0, 1.8, 0.9, Math.PI / 2, {});
  P.candles(ctx, (x0 + x1) / 2, 0.82, (z0 + z1) / 2 + 1.0, 3, 6502, { room, radius: 6, intensity: 0.9 });
  P.banner(ctx, x0 + 0.08, 3.6, (z0 + z1) / 2, Math.PI / 2, 'bannerRey', 1.4, 2.4);
  bakeCorpse(wb, x1 - 2.4, 0, z1 - 1.4, 0.8, 'back', 'soldier', 74);
  P.decal(ctx, x1 - 2.4, 0.03, z1 - 1.4, 1.8);
  P.dropped(ctx, x1 - 1.6, 0.02, z1 - 2.2, 0.4, 'sword');
  wb.setRoom(null);
  P.wallTorch(ctx, x0 + 0.02, 2.3, z0 + 1.6, 'e', { room });
  L.enemies.push({ type: 'soldier', x: (x0 + x1) / 2 + 1.4, y: 0, z: z0 + 2.4, yaw: Math.PI / 2, idle: 'stand', id: 'e_antecamara1' });
  L.zones.push({ id: 'antecamara', rects: [[x0, z0, x1, z1, -1, F1]], atmo: 'interior', room });
  L.map.push({ id: 'antecamara', r: [x0, z0, x1, z1] });
}

// ------------------------------------------------------------------------ la torre de la coracha
// Donde llega la coracha (a su altura, por la puerta de levante): el altar del
// descanso. Debajo, por el caracol, el guardarropa del Rey y el tesoro, cerrado
// por dentro: el camarero sigue sentado sobre el arca de la cámara.
function torreCoracha(ctx, S, L) {
  const wb = ctx.wb;
  const T = FORT.torres.NE;
  const ix0 = T.x0 + T.t,
    ix1 = T.x1 - T.t,
    iz0 = T.z0 + T.t,
    iz1 = T.z1 - T.t;
  const yC = FORT.coracha.y;
  const pisos = [0, 4.5, yC];
  const techo = 13.2;
  const rooms = ['tesoro', 'guardarropa', 'coracha_torre'];
  const bands = pisos.map((y, k) => ({ room: rooms[k], y0: k ? y - 0.3 : 0, y1: k < 2 ? pisos[k + 1] - 0.3 : techo }));
  W(S, ix0, iz0, ix1, iz1);
  // el muro de poniente, con la puerta del tesoro (a la antecámara)
  const zt = -92.8;
  muroVanos(ctx, 'z', iz0, iz1, T.x0, T.x0 + T.t, 0, T.h, [{ c: zt, w: 1.4, y: 0, h: 2.4, rise: 0.7, ring: 0.24 }], [{ room: 'antecamara', y0: 0, y1: F1 }], bands, { tint: [0.74, 0.7, 0.64], revealRoom: 'antecamara' });
  W(S, T.x0 - 0.3, zt - 0.7, T.x0 + T.t + 0.3, zt + 0.7);
  L.interact.push({ kind: 'door', id: 'd_tesoro', x: T.x0 + T.t / 2, y: 0, z: zt, w: 1.4, h: 3.1, arch: true, axis: 'z', mat: 'planks', hinge: -1, swing: 1, plane: T.x0 + T.t, inset: 0.06, lock: { type: 'barred', side: 1 }, barredMsg: 'camaraCerrada' });
  // el de levante, con la puerta de la coracha
  const zc = FORT.coracha.z;
  muroVanos(ctx, 'z', iz0, iz1, T.x1 - T.t, T.x1, 0, T.h, [{ c: zc, w: 1.6, y: yC, h: 2.4, rise: 0.8, ring: 0.28 }], bands, [{ room: null, y0: yC - 0.02, y1: T.h }], { tint: [0.74, 0.7, 0.64], revealRoom: 'coracha_torre' });
  dentro(ctx, T, ['n', 's'], bands, { tint: [0.72, 0.7, 0.66], mat: 'ashlar' });
  // (por fuera, en la coracha: el recerco de sillería de la puerta, su
  // alfiz, el farol encima y las antorchas a los lados)
  {
    const xo = T.x1;
    for (const s2 of [-1, 1]) wb.box('ashlar', xo, yC, zc + s2 * 0.95 - 0.22, xo + 0.12, yC + 2.4, zc + s2 * 0.95 + 0.22, { ao: false, faces: 'ensbt', tint: PIEDRA.silla });
    wb.box('ashlar', xo, yC + 3.55, zc - 1.4, xo + 0.1, yC + 3.7, zc + 1.4, { ao: false, faces: 'ensbt', tint: PIEDRA.silla });
    for (const s2 of [-1, 1]) wb.box('ashlar', xo, yC + 2.4, zc + s2 * 1.3 - 0.075, xo + 0.1, yC + 3.55, zc + s2 * 1.3 + 0.075, { ao: false, faces: 'ensbt', tint: PIEDRA.silla });
    P.lantern(ctx, xo + 0.05, yC + 3.95, zc, Math.PI / 2, true);
    P.wallTorch(ctx, xo + 0.02, yC + 2.4, zc - 1.7, 'e', {});
    P.wallTorch(ctx, xo + 0.02, yC + 2.4, zc + 1.7, 'e', {});
    ctx.lights.push({ x: xo + 1.6, y: yC + 2.4, z: zc, r: 1, g: 0.55, b: 0.24, radius: 7, intensity: 1.0 });
  }
  // el caracol, los forjados y el techo
  const K = caracol(ctx, ix1, iz1, 1.6, pisos, rooms, { tint: [1, 1, 1] });
  for (let k = 1; k < 3; k++) forjado(ctx, ix0, iz0, ix1, iz1, pisos[k], [K.hueco], rooms[k], rooms[k - 1]);
  wb.box('flag', ix0, -0.05, iz0, ix1, 0.02, iz1, { faces: 't', ao: false, sub: 2.5, uv: 0.7, room: rooms[0], tint: PISO });
  wb.box('wooddark', ix0, techo, iz0, ix1, techo + 0.2, iz1, { faces: 'b', ao: false, room: rooms[2], tint: [0.56, 0.5, 0.44] });
  for (let z = iz0 + 0.8; z < iz1 - 0.4; z += 1.3) wb.box('timber', ix0, techo - 0.24, z - 0.11, ix1, techo, z + 0.11, { ao: false, faces: 'nsewb', room: rooms[2] });
  saeteraDentro(ctx, 's', iz0, (ix0 + ix1) / 2, yC + 1.4, rooms[2]);
  saeteraDentro(ctx, 's', iz0, (ix0 + ix1) / 2, 1.6, rooms[0]);
  // el tesoro: las arcas, la plata en sus estantes, las monedas por el suelo y
  // el camarero, sentado sobre el arca de la cámara
  {
    const room = rooms[0];
    wb.setRoom(room);
    for (const [z, w] of [
      [iz0 + 1.2, 1.4],
      [iz0 + 3.0, 1.2],
      [iz0 + 4.6, 1.4],
    ]) {
      wb.box('wooddark', ix1 - 4.6, 0, z - w / 2, ix1 - 3.7, 0.75, z + w / 2, { ao: false, room, tint: [0.62, 0.5, 0.4] });
      for (const dz of [-w / 2 + 0.15, w / 2 - 0.15]) wb.box('iron', ix1 - 4.62, 0, z + dz - 0.04, ix1 - 3.68, 0.77, z + dz + 0.04, { ao: false, room });
      ctx.col.add(ix1 - 4.6, 0, z - w / 2, ix1 - 3.7, 0.75, z + w / 2);
    }
    P.shelf(ctx, ix0 + 0.3, 0, iz0 + 2.0, Math.PI / 2, 2.2);
    for (let k = 0; k < 6; k++) wb.cylinder('silver', ix0 + 0.35, 0.45 + (k % 3) * 0.6, iz0 + 1.2 + (k > 2 ? 1.3 : 0.2) + (k % 3) * 0.1, 0.09, 0.07, 0.2, 8, { ao: false, capTop: true, room });
    const ax = ix0 + 2.6,
      az = iz1 - 1.6;
    wb.box('wooddark', ax - 1.0, 0, az - 0.6, ax + 1.0, 0.85, az + 0.6, { ao: false, room, tint: [0.7, 0.5, 0.36] });
    wb.box('iron', ax - 1.02, 0.4, az - 0.62, ax + 1.02, 0.48, az + 0.62, { ao: false, room });
    ctx.col.add(ax - 1.0, 0, az - 0.6, ax + 1.0, 0.85, az + 0.6);
    bakeCorpse(wb, ax, 0.85, az, Math.PI, 'sit', 'villager', 73);
    for (let k = 0; k < 18; k++) wb.cylinder('gold', ix0 + 1.0 + ((k * 37) % 23) / 4, 0.02, iz0 + 0.8 + ((k * 53) % 31) / 5, 0.05, 0.05, 0.015, 6, { ao: false, capTop: true, room });
    wb.setRoom(null);
    P.candles(ctx, ax - 0.5, 0.85, az + 0.35, 3, 6504, { room, radius: 7, intensity: 1.1, spread: 0.12 });
    P.hangingLamp(ctx, (ix0 + ix1) / 2 - 1, pisos[1] - 0.35, (iz0 + iz1) / 2 - 1, { room, len: 1.0 });
    ctx.lights.push({ x: (ix0 + ix1) / 2 - 1, y: 2.6, z: (iz0 + iz1) / 2 - 1, r: 1, g: 0.55, b: 0.26, radius: 9, intensity: 0.8, room });
    L.interact.push({ kind: 'item', id: 'i_llave_camarero', item: 'llave_camarero', x: ax + 0.5, y: 0.9, z: az + 0.2 }, { kind: 'note', id: 'n_camarero', note: 'camarero', x: ax - 0.3, y: 0.86, z: az + 0.3, model: 'paper' });
  }
  // el guardarropa: los arcones de la ropa del Rey y su percha
  {
    const room = rooms[1],
      y = pisos[1];
    wb.setRoom(room);
    chest(ctx, ix0 + 0.6, y, iz0 + 1.4, Math.PI / 2, room, 1.2);
    chest(ctx, ix0 + 0.6, y, iz0 + 3.2, Math.PI / 2, room, 1.2);
    wb.box('wooddark', ix0 + 2.0, y + 2.0, iz0 + 0.5, ix0 + 2.06, y + 2.06, iz1 - 4.0, { ao: false, room });
    for (let z = iz0 + 0.8; z < iz1 - 4.3; z += 0.55) wb.box(['clothRed', 'clothBlue', 'clothPurple', 'clothDark'][Math.floor(z * 7) & 3], ix0 + 1.88, y + 0.8, z - 0.22, ix0 + 2.18, y + 2.0, z + 0.22, { ao: false, faces: 'tnsewb', room });
    wb.setRoom(null);
    ctx.lights.push({ x: (ix0 + ix1) / 2, y: y + 2.6, z: (iz0 + iz1) / 2, r: 1, g: 0.55, b: 0.26, radius: 7, intensity: 0.7, room });
  }
  // lo alto: el altar del descanso, contra el muro de poniente
  {
    const room = rooms[2],
      y = yC;
    const axx = ix0 + 1.45,
      azz = (iz0 + iz1) / 2 - 1.6;
    wb.setRoom(room);
    P.candleAltar(ctx, axx, y, azz, Math.PI / 2, room);
    P.candles(ctx, ix1 - 1.3, y, iz0 + 1.4, 4, 5201, { room, radius: 4, intensity: 0.8 });
    P.barrel(ctx, ix1 - 1.4, y, iz0 + 2.8, {});
    bakeCorpse(wb, ix0 + 1.2, y, iz0 + 1.2, 0.6, 'sit', 'soldier', 18);
    P.banner(ctx, ix0 + 0.08, y + 3.0, azz, Math.PI / 2, 'bannerBlack', 1.2, 2.4);
    P.brazier(ctx, (ix0 + ix1) / 2 - 1.0, y, iz0 + 2.0, { room });
    P.weaponRack(ctx, ix0 + 0.35, y, iz1 - 4.6, Math.PI / 2);
    P.hay(ctx, ix0 + 1.6, y, iz1 - 1.4, 0.4);
    wb.setRoom(null);
    P.wallTorch(ctx, ix1 - 0.02, y + 2.5, FORT.coracha.z - 1.6, 'w', { room });
    L.interact.push(
      { kind: 'altar', id: 'a_coracha', name: 'Torre de la coracha', x: axx, y, z: azz, spawn: [axx + 2.2, y, azz], yaw: -Math.PI / 2 },
      { kind: 'item', id: 'i_ampolla4', item: 'ampolla', x: ix1 - 1.55, y: y + 0.62, z: iz0 + 2.8 }
    );
    ctx.lights.push({ x: (ix0 + ix1) / 2, y: y + 2.4, z: (iz0 + iz1) / 2, r: 1, g: 0.55, b: 0.26, radius: 7, intensity: 0.8, room });
  }
  L.zones.push(
    { id: 'tesoro', rects: [[ix0, iz0, ix1, iz1, -1, pisos[1] - 0.3]], atmo: 'interior', room: rooms[0] },
    { id: 'guardarropa', rects: [[ix0, iz0, ix1, iz1, pisos[1] - 0.3, yC - 0.3]], atmo: 'interior', room: rooms[1] },
    { id: 'coracha_torre', rects: [[ix0, iz0, ix1 + T.t, iz1, yC - 0.3, techo]], atmo: 'chapel', room: rooms[2] }
  );
  L.map.push({ id: 'coracha_torre', r: [T.x0, T.z0, T.x1, T.z1] });
}
