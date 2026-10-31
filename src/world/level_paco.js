// El Paço del Rey (PLAN_CASTILLO.md, §2 y §3): la casa que Dom Afonso se hizo
// junto al castillo cuando subió con su corte a la ciudad vieja, como la de la
// alcáçova de Coimbra. No un edificio sino un recinto, con sus tres esferas:
// la guerra (la puerta, sus torres, el foso, la guardia de los archeros), lo
// público (la sala de la corte, la capilla, la cancillería y el archivo) y lo
// privado (las cámaras del Rey, las cocinas, el jardín y el pomar).
//
// Va al norte del castillo y a poniente de la coracha, hasta la muralla norte;
// la ciudad crece hacia el oeste para hacerle sitio. Del castillo lo separa el
// foso del Rey, seco y hondo, que se cruza por un puente de piedra de la
// puerta nueva de la muralla norte del castillo a la Puerta del Paço,
// atrancada por dentro. La primera vez se entra por arriba: por la escalera
// que baja de la coracha al Patio de la Corte.
//
// Todo sale de unas pocas medidas (PACO). Aquí, el recinto (fase 4a): los
// muros y sus torres, el foso, el puente, la puerta, el cuerpo de guardia, el
// patio con su escalera y las caras que dan a él (la sala, la galería de las
// cámaras); por dentro, lo demás se hace en sus fases.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, blocker, stairs, merlons, cityWall, tower, archedWall, archRing, solidGableRoof } from './builders.js';
import * as P from './props.js';
import { floor, interiorRoom } from './level_util.js';
import { bakeCorpse } from '../entities/models.js';
import { CASTLE, parapet, slit } from './level_castle.js';
import { KEEP } from './level_keep.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);

export const PACO = {
  // el recinto: la muralla de poniente (de x0, su cara de fuera, a xi), la
  // norte (su cara de dentro), el muro del foso al sur (de zS, la de fuera, a
  // zSi) y la coracha (x1); las alturas de sus adarves
  x0: -146,
  xi: -143,
  zN: -122,
  zS: -45,
  zSi: -47,
  x1: -62,
  hO: 10,
  hS: 9,
  // torres: las de las esquinas, las de poniente (su z) y la de la muralla
  // norte (su x: level_walls.js)
  esqNO: { x: -144.5, z: -124, w: 8, h: 16 },
  esqSO: { x: -144.5, z: -46, w: 8, h: 15 },
  torresO: [-100, -76],
  torreN: -110,
  // el muro que cierra el foso por poniente: de la torre del homenaje al
  // muro del Paço, a ras de la cara oeste de la torre
  cierre: { x0: -97, x1: -94 },
  // el foso del Rey: su fondo (y), lo que se cava al norte de la torre (de x0
  // a x1, de z0 a z1) y al este de ella (de ex0 a x1, hasta ez1, la muralla
  // del castillo), y el talud de sus escarpas (b: cuánto más adentro está su
  // pie)
  foso: { y: -4, x0: -94, x1: -62, z0: -45, z1: -30, ex0: -70, ez1: -24, b: 0.5 },
  // el puente: de la puerta nueva del castillo (CASTLE.puertaNorte) a la del
  // Paço; sus tres arcos (centro de cada luz), su luz y su flecha
  puente: { x0: -68.3, x1: -64.7, arcos: [-41.65, -34.75, -27.85], luz: 5.0 },
  // la escalera de servicio del foso: del puente al fondo, pegada a la torre
  // de poniente de la puerta (z0..z1: su ancho)
  escFoso: { z0: -43.0, z1: -41.7, n: 13, run: 0.42 },
  // la Puerta del Paço: las dos torres (la de levante contra la coracha), que
  // asoman al foso hasta zp; el paso (px0..px1), el arranque de su bóveda y
  // la altura de las torres y de lo de en medio
  puerta: { x0: -74, x1: -62, z0: -52, z1: -45, zp: -43, px0: -67.9, px1: -65.1, ph: 2.6, h: 11.5, th: 14 },
  // el Patio de la Corte
  patio: { x0: -90, x1: -62, z0: -86, z1: -52 },
  // el cuerpo de guardia de los archeros (la guardia del Rey), contra el muro
  guardia: { x0: -90, x1: -74, z0: -52, z1: -47, t: 0.8, h: 4.0, door: -82 },
  // la escalera de la coracha: pegada a su cara de dentro, de lo alto (junto
  // a su torre, por el hueco del parapeto: KEEP.paso) al patio
  escalera: { x0: -65.2, x1: -62, n: 30, rise: 0.3, run: 0.4 },
  // la Sala de la Corte: su planta, el grueso de sus muros, su suelo (en alto,
  // con su escalinata), el alero y la cumbrera; los arcos diafragma (x), la
  // portada (en el último tramo, el de abajo: por ahí se entraba) y el muro
  // del servicio (screens); entre ella y la coracha, el callejón de las
  // caballerizas (de x1 a la coracha), con su puerta al patio
  sala: { x0: -104, x1: -66, z0: -104, z1: -86, t: 1.2, y: 1.5, eave: 12, ridge: 18, arcos: [-98.4, -94.0, -89.6, -85.2, -80.8, -76.4], portada: -74.2, screens: -72 },
  // las Cámaras del Rey: su planta (cuatro crujías en torno a un patinillo) y
  // la crujía de levante, con su galería al patio (arquería de x1 - 0.6 a x1,
  // la galería hasta gx, el muro de las cámaras hasta gx - 0.8)
  camaras: { x0: -118, x1: -90, z0: -86, z1: -47, e0: -100, gx: -93.4, F1: 4.9, eave: 10, ridge: 13.5 },
  // las cocinas: la grande, exenta y cuadrada, con su chimenea cónica
  cocina: { x: -88, z: -113, w: 11, h: 7.5, top: 30 },
};

// ¿Está en el foso (abajo, en su fondo)?
export function enFoso(p) {
  const F = PACO.foso;
  if (p.y > F.y + 2.6) return false;
  return (p.x > F.x0 && p.x < F.x1 && p.z > F.z0 && p.z < F.z1) || (p.x > F.ex0 && p.x < F.x1 && p.z >= F.z1 && p.z < F.ez1);
}

// Cara plana de cuatro puntos, vuelta hacia 'dir' (sea cual sea su orden).
function cara(wb, mat, a, b, c, d, dir, o) {
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a));
  if (n.dot(dir) >= 0) wb.quad(mat, a, b, c, d, o);
  else wb.quad(mat, d, c, b, a, o);
}

export function buildPaco(ctx, S, L) {
  muros(ctx);
  foso(ctx, S, L);
  puente(ctx, S);
  puerta(ctx, S, L);
  guardia(ctx, S, L);
  patio(ctx, S, L);
  sala(ctx, S, L);
  camaras(ctx, S, L);
  cocina(ctx);
  zonas(L);
}

// ------------------------------------------------------------------------ los muros
// La muralla de poniente con sus dos torres y las de las esquinas; el muro
// del foso, al sur (sobre el talud de fuera y, desde el muro de cierre, sobre
// el foso, desde su fondo); y el muro de cierre, que baja de él a la torre del
// homenaje. (La muralla norte sigue hasta la esquina en level_walls.js.)
function muros(ctx) {
  const wb = ctx.wb;
  const { x0, xi, zS, zSi, hO, hS } = PACO;
  const NO = PACO.esqNO,
    SO = PACO.esqSO,
    F = PACO.foso,
    C = PACO.cierre,
    G = PACO.puerta;
  const zA = NO.z + NO.w / 2,
    zB = SO.z - SO.w / 2;
  cityWall(ctx, x0, zA, xi, zB, hO, { merlonSides: ['w'] });
  blocker(ctx, x0, hO - 0.2, zA, x0 + 0.6, hO + 2.4, zB);
  parapet(ctx, xi - 0.5, zA, xi, zB, hO);
  for (const z of PACO.torresO) tower(ctx, x0 + 0.5, z, 6, hO + 4.5);
  tower(ctx, NO.x, NO.z, NO.w, NO.h);
  tower(ctx, SO.x, SO.z, SO.w, SO.h);
  // el muro del foso: de la torre del suroeste a la Puerta del Paço
  const xa = SO.x + SO.w / 2;
  cityWall(ctx, xa, zSi, G.x0, zS, hS, { merlonSides: ['s'] });
  blocker(ctx, xa, hS - 0.2, zS - 0.6, G.x0, hS + 2.4, zS);
  parapet(ctx, xa, zSi, G.x0, zSi + 0.5, hS);
  // (sobre el foso, desde su fondo: un zócalo en talud)
  wb.noSub = true;
  solid(ctx, 'wallstone', C.x0, F.y - 0.3, zSi, G.x0, 0, zS, { faces: 's', sub: 2.2, aoH: 2, tint: [0.8, 0.78, 0.74] });
  cara(wb, 'wallstone', V(C.x1, F.y, zS + 0.45), V(G.x0, F.y, zS + 0.45), V(G.x0, F.y + 1.6, zS), V(C.x1, F.y + 1.6, zS), V(0, 0.3, 1), { sub: 2, ao: false, tint: [0.7, 0.68, 0.64] });
  ctx.col.add(C.x1, F.y - 1, zS, G.x0, F.y + 1.6, zS + 0.45);
  wb.noSub = false;
  // el muro de cierre: de la torre al muro del foso (por fuera, desde el
  // suelo; por dentro, desde el fondo del foso)
  solid(ctx, 'wallstone', C.x0, F.y - 0.3, zS, C.x1, hS, CASTLE.keep.z0, { faces: 'te', sub: 2.2, aoH: 2.5, mats: { t: 'flag' } });
  // (su cara de fuera, hasta la pilastra de la esquina de la torre)
  wb.box('wallstone', C.x0, 0, zS, C.x0 + 0.01, hS, CASTLE.keep.z0 - 0.33, { faces: 'w', sub: 2.2, aoH: 2.5 });
  merlons(ctx, C.x0 + 0.3, zS, C.x0 + 0.3, CASTLE.keep.z0, hS, { collide: false });
  // saeteras
  for (let z = -43; z < -31; z += 5) slit(ctx, C.x0, 3.2, z, 'w');
  for (let x = xa + 6; x < G.x0 - 3; x += 9) slit(ctx, x, 3.6, zS, 's');
  for (let z = zA + 5; z < zB - 3; z += 9) if (!PACO.torresO.some((t) => Math.abs(t - z) < 4.5)) slit(ctx, x0, 3.6, z, 'w');
  // los estandartes del Rey, en las torres de las esquinas
  P.banner(ctx, NO.x - NO.w / 2 - 0.32, NO.h - 1.6, NO.z, -Math.PI / 2, 'bannerRey', 1.6, 4.4);
  P.banner(ctx, SO.x - SO.w / 2 - 0.32, SO.h - 1.6, SO.z, -Math.PI / 2, 'bannerRey', 1.6, 4.4);
  P.banner(ctx, SO.x, SO.h - 1.6, SO.z + SO.w / 2 + 0.32, 0, 'bannerRey', 1.6, 4.4);
}

// ------------------------------------------------------------------------ el foso del Rey
// Seco y hondo, con sus escarpas en talud al pie de la torre, de la muralla
// del castillo y de la coracha; con estacas, la horca y lo que tiraron desde
// arriba. Es un hueco en la losa de la calle que no deja ver nada de lo de
// abajo (ctx.slabHoles: no es un portal del subsuelo) y lo que hay en él se
// dibuja siempre (noSub).
function foso(ctx, S, L) {
  const wb = ctx.wb;
  const F = PACO.foso;
  const y = F.y,
    b = F.b;
  const rng = new RNG(6101);
  const holes = [
    [F.x0, F.z0, F.x1, F.z1],
    [F.ex0, F.z1, F.x1, F.ez1],
  ];
  ctx.slabHoles.push(...holes);
  for (const h of holes) W(S, ...h);
  wb.noSub = true;
  // el fondo (hasta el pie de las escarpas)
  const bx1 = F.x1 - b,
    bz1 = F.z1 - b,
    bex0 = F.ex0 + b,
    bez1 = F.ez1 - b;
  for (const [a, c, d, e] of [
    [F.x0, F.z0, bx1, bz1],
    [bex0, bz1, bx1, bez1],
  ]) {
    wb.box('dirt', a, y - 0.3, c, d, y, e, { faces: 't', ao: false, sub: 2.5, tint: [0.56, 0.5, 0.44] });
    ctx.col.add(a, y - 1.2, c, d, y, e, 'floor').cam = true;
  }
  // las escarpas, en talud (de su pie al borde): la de la coracha, la de la
  // muralla del castillo, y las de la berma al pie de la torre
  const esc = { sub: 2, aoH: 1.6, aoMin: 0.55, baseY: y, tint: [0.78, 0.76, 0.72] };
  cara(wb, 'wallstone', V(bx1, y, F.z0), V(bx1, y, bez1), V(F.x1, 0, F.ez1), V(F.x1, 0, F.z0), V(-1, 0, 0), esc);
  cara(wb, 'wallstone', V(bx1, y, bez1), V(bex0, y, bez1), V(F.ex0, 0, F.ez1), V(F.x1, 0, F.ez1), V(0, 0, -1), esc);
  cara(wb, 'wallstone', V(bex0, y, bez1), V(bex0, y, bz1), V(F.ex0, 0, F.z1), V(F.ex0, 0, F.ez1), V(1, 0, 0), esc);
  cara(wb, 'wallstone', V(bex0, y, bz1), V(F.x0, y, bz1), V(F.x0, 0, F.z1), V(F.ex0, 0, F.z1), V(0, 0, -1), esc);
  // (lo que no deja salir del fondo: detrás de cada escarpa, desde su pie)
  for (const [a, c, d, e] of [
    [bx1, F.z0, bx1 + 1, F.ez1],
    [F.ex0, bez1, F.x1, bez1 + 1],
    [bex0 - 1, bz1, bex0, F.ez1],
    [F.x0, bz1 - 1, bex0, bz1],
    [F.x0 - 1, F.z0, F.x0, F.z1],
    [F.x0, F.z0 - 1, F.x1, F.z0],
  ])
    ctx.col.add(a, y - 1, c, d, 0, e);
  // la albardilla del borde (no donde pasa el puente)
  const B = PACO.puente;
  const cop = { ao: false, faces: 'tnsewb', tint: [0.72, 0.7, 0.66] };
  wb.box('ashlar', F.x1 - 0.2, -0.12, F.z0, F.x1 + 0.25, 0.1, F.ez1 + 0.25, cop);
  wb.box('ashlar', F.ex0 - 0.25, -0.12, F.ez1 - 0.2, B.x0, 0.1, F.ez1 + 0.25, cop);
  wb.box('ashlar', B.x1, -0.12, F.ez1 - 0.2, F.x1 - 0.2, 0.1, F.ez1 + 0.25, cop);
  wb.box('ashlar', F.ex0 - 0.25, -0.12, F.z1 + 0.25, F.ex0 + 0.2, 0.1, F.ez1 - 0.2, cop);
  wb.box('ashlar', F.x0, -0.12, F.z1 - 0.2, F.ex0 + 0.2, 0.1, F.z1 + 0.25, cop);

  // la escalera de servicio: del puente al fondo, pegada a la torre de
  // poniente de la puerta (sin pretil: es para los que limpiaban el foso)
  const E = PACO.escFoso;
  const rise = -y / E.n;
  stairs(ctx, B.x0 - E.n * E.run, y, (E.z0 + E.z1) / 2, 'e', E.z1 - E.z0, E.n, rise, E.run, 'wallstone', { base: y - 0.3 });

  // lo que tiraron desde arriba: piedras de las que se echaban a los de
  // abajo, una viga del cadalso, un carro deshecho, toneles; y los muertos
  P.rubble(ctx, -80, y, -35.5, 14, 5211, 2.6, { mat: 'wallstone', scale: 1.4 });
  P.rubble(ctx, -88.5, y, -32.5, 8, 5215, 1.6, { mat: 'wallstone', scale: 1.1 });
  P.siegeStone(ctx, -77.2, y, -33.4, 0.55);
  P.siegeStone(ctx, -85.6, y, -36.8, 0.42);
  P.siegeStone(ctx, -64.6, y, -26.8, 0.5);
  wb.at(-82.6, y, -34.2, 0.35, () => {
    wb.push();
    wb.rotateZ(0.1);
    wb.box('wooddark', -2.4, 0, -0.14, 2.4, 0.28, 0.14, { ao: false, faces: 'tnsewb', tint: [0.5, 0.42, 0.36] });
    wb.pop();
  });
  P.cartWheel(ctx, -74.2, y, -36.6, 0.6);
  P.barrel(ctx, -71.4, y, -33.2, { lying: true, rot: 1.1 });
  P.crate(ctx, -90.4, y, -38.4, 0.7, 0.4);
  P.arrows(ctx, -84.0, y, -32.2, 10, 6102, 2.2);
  P.arrows(ctx, -75.0, y, -31.8, 8, 6103, 1.8);
  P.bones(ctx, -66.4, y, -38.2, 12, 6104, 1.0);
  P.bones(ctx, -91.0, y, -42.6, 9, 6105, 0.8);
  // los que se echaron (o echaron) desde el cadalso
  bakeCorpse(wb, -84.6, y, -32.4, 2.6, 'face', 'soldier', 61);
  bakeCorpse(wb, -78.2, y, -38.8, 0.4, 'back', 'villager', 62);
  bakeCorpse(wb, -73.0, y, -40.5, -1.2, 'curl', 'soldier', 63);
  bakeCorpse(wb, -63.6, y, -28.0, 1.8, 'back', 'soldier', 64);
  for (const [x, z, s] of [
    [-84.6, -32.4, 2.0],
    [-78.2, -38.8, 1.6],
    [-63.6, -28.0, 1.8],
  ])
    P.decal(ctx, x, y + 0.01, z, s);
  // las estacas: dos hileras al pie del muro del Paço, hincadas en el fondo
  // con la punta afilada hacia el castillo (el pie de la escalera, libre); y
  // tres empalados, de aviso, y la horca
  for (const [z, x0, x1, lean] of [
    [-44.1, -93.2, -75.2, 0.5],
    [-43.0, -92.6, -75.6, 0.62],
  ])
    for (let x = x0; x <= x1; x += 1.15) estaca(ctx, x + rng.range(-0.15, 0.15), y, z + rng.range(-0.12, 0.12), rng.range(-0.12, 0.12), lean + rng.range(-0.08, 0.08), rng.range(1.7, 2.3));
  for (const [x, z, k] of [
    [-90.2, -40.6, 0],
    [-87.4, -39.8, 1],
    [-84.6, -40.9, 2],
  ])
    P.stake(ctx, x, y, z, rng.range(-0.4, 0.4) + Math.PI, 6110 + k);
  P.gibbet(ctx, -91.0, y, -34.0, 4.6);
  P.deadTree(ctx, -76.5, y, -42.6, 6113, 6.5);
  P.deadTree(ctx, -89.5, y, -40.5, 6114, 5);
  // el carcaj del ballestero muerto: virotes
  L.interact.push({ kind: 'item', id: 'i_virotes_foso', item: 'virote', n: 4, x: -84.0, y: y + 0.12, z: -31.7 });
  L.interact.push({ kind: 'item', id: 'i_ampolla_foso', item: 'ampolla', x: -63.4, y: y + 0.1, z: -27.0 });
  ctx.crows.push({ x: -79, y, z: -37, r: 1.6, n: 4 });
  ctx.rats.push({ x: -66, y, z: -29.5, n: 3 });
  ctx.rats.push({ x: -90, y, z: -33, n: 2 });
  ctx.flies.push({ x: -78.2, y, z: -38.8 });
  wb.noSub = false;
}

// Estaca aguzada hincada en el suelo (rot: hacia dónde se inclina, desde el
// sur; lean: cuánto; len: su largo), con su choque al pie.
function estaca(ctx, x, y, z, rot, lean, len) {
  const wb = ctx.wb;
  wb.push();
  wb.translate(x, y - 0.25, z);
  wb.rotateY(rot);
  wb.rotateX(lean);
  wb.cylinder('wooddark', 0, 0, 0, 0.075, 0.07, len - 0.35, 6, { ao: false, tint: [0.66, 0.58, 0.5] });
  wb.cylinder('timber', 0, len - 0.35, 0, 0.07, 0.004, 0.35, 6, { ao: false, tint: [0.7, 0.62, 0.52] });
  wb.pop();
  ctx.col.add(x - 0.16, y, z - 0.16 + Math.sin(lean) * 0.3, x + 0.16, y + 1.1, z + 0.16 + Math.sin(lean) * 0.5);
}

// ------------------------------------------------------------------------ el puente
// Tres arcos de medio punto sobre el foso, el tablero enlosado, su imposta y
// los pretiles (con el hueco de la escalera de servicio).
function puente(ctx, S) {
  const wb = ctx.wb;
  const B = PACO.puente,
    F = PACO.foso,
    G = PACO.puerta,
    E = PACO.escFoso;
  const zA = G.z1,
    zB = CASTLE.puertaNorte.z0;
  W(S, B.x0, zA, B.x1, zB);
  wb.noSub = true;
  archedWall(ctx, {
    axis: 'z',
    a0: zA - 0.6,
    a1: zB,
    t0: B.x0,
    t1: B.x1,
    y0: F.y - 0.3,
    y1: -0.45,
    openings: B.arcos.map((c) => ({ c, w: B.luz, h: 0.9, rise: B.luz / 2, ring: 0.3 })),
    mat: 'wallstone',
    tint: [0.76, 0.74, 0.7],
    rooms: ['out', 'out'],
  });
  wb.noSub = false;
  // el tablero y su imposta
  wb.box('wallstone', B.x0, -0.45, zA, B.x1, -0.02, zB, { faces: 'ew', ao: false, sub: 2, tint: [0.74, 0.72, 0.68] });
  wb.box('flag', B.x0, -0.06, zA, B.x1, 0, zB, { faces: 't', ao: false, uv: 0.8 });
  ctx.col.add(B.x0, -1, zA - 0.6, B.x1, 0, zB, 'floor').cam = true;
  for (const [a, c, f] of [
    [B.x0 - 0.12, B.x0, 'tbw'],
    [B.x1, B.x1 + 0.12, 'tbe'],
  ])
    wb.box('ashlar', a, -0.5, G.zp, c, -0.3, zB, { ao: false, faces: f, tint: [0.7, 0.68, 0.64] });
  // los pretiles
  parapet(ctx, B.x0, E.z1, B.x0 + 0.4, zB, 0, 1.0);
  parapet(ctx, B.x1 - 0.4, G.zp, B.x1, zB, 0, 1.0);
}

// ------------------------------------------------------------------------ la Puerta del Paço
// Dos torres que asoman al foso y, entre ellas, el paso abovedado con el
// rastrillo alzado y el matacán encima; al fondo, las puertas, atrancadas
// por dentro (abrirlas es el atajo al patio de armas del castillo).
function puerta(ctx, S, L) {
  const wb = ctx.wb;
  const G = PACO.puerta,
    F = PACO.foso;
  const cx = (G.px0 + G.px1) / 2,
    pw = G.px1 - G.px0;
  W(S, G.px0, G.z0 - 0.2, G.px1, G.zp);
  // las torres: desde el fondo del foso lo que asoma a él
  wb.noSub = true;
  for (const [a, c] of [
    [G.x0, G.px0],
    [G.px1, G.x1],
  ])
    solid(ctx, 'wallstone', a, F.y - 0.3, G.z1, c, 0, G.zp, { faces: 'sew', sub: 2.2, aoH: 2, tint: [0.78, 0.76, 0.72] });
  wb.noSub = false;
  for (const [a, c, east] of [
    [G.x0, G.px0, false],
    [G.px1, G.x1, true],
  ]) {
    solid(ctx, 'wallstone', a, 0, G.z0, c, G.th, G.zp, { faces: east ? 'nsw' : 'nsew', sub: 2.2, aoH: 3 });
    // (la de levante, contra la coracha: por encima de su adarve, también al este)
    if (east) wb.box('wallstone', G.x1 - 0.01, KEEP.coracha.y + 1.1, G.z0, G.x1, G.th - 0.45, G.zp, { faces: 'e', sub: 2.2, ao: false });
    wb.box('wallstone', a - 0.25, G.th - 0.45, G.z0 - 0.25, c + (east ? 0 : 0.25), G.th, G.zp + 0.25, { ao: false, sub: 3, faces: 'tnsewb', mats: { t: 'flag' } });
    merlons(ctx, a - 0.25, G.zp + 0.05, c + (east ? 0 : 0.25), G.zp + 0.05, G.th, { collide: false });
    merlons(ctx, a - 0.25, G.z0 - 0.05, c + (east ? 0 : 0.25), G.z0 - 0.05, G.th, { collide: false });
    if (!east) merlons(ctx, a - 0.05, G.z0, a - 0.05, G.zp, G.th, { collide: false });
    for (const yy of [4.2, 8.4]) slit(ctx, (a + c) / 2, yy, G.zp, 's');
  }
  // el paso: su suelo, la bóveda y lo de encima
  const top = G.ph + pw / 2 + 0.5;
  wb.box('flag', G.px0, -0.06, G.z0, G.px1, 0, G.z1, { faces: 't', ao: false, uv: 0.8 });
  archRing(ctx, { axis: 'x', c: cx, w: pw, y0: G.ph, rise: pw / 2, ring: 0.32, t0: G.z0, t1: G.z1, top, clip: [G.px0, G.px1], mat: 'ashlar', spMat: 'wallstone', tint: [0.66, 0.64, 0.6], spTint: [0.74, 0.72, 0.68] });
  ctx.col.add(G.px0, G.ph + (pw / 2) * 0.62, G.z0, G.px1, G.h, G.z1);
  solid(ctx, 'wallstone', G.px0, top, G.z0, G.px1, G.h, G.z1, { faces: 'tns', sub: 2.2, ao: false, mats: { t: 'flag' }, collide: false });
  merlons(ctx, G.px0, G.z0 - 0.05, G.px1, G.z0 - 0.05, G.h, { collide: false });
  // el rastrillo, alzado: asoman sus puntas bajo el arco de fuera, y sus
  // ranuras en las jambas
  {
    const z = G.z1 - 0.55;
    for (let x = G.px0 + 0.2; x < G.px1 - 0.1; x += 0.32) {
      wb.box('iron', x - 0.035, G.ph + 0.65, z - 0.035, x + 0.035, G.ph + pw / 2 + 0.2, z + 0.035, { ao: false, faces: 'nsewb' });
      wb.box('iron', x - 0.02, G.ph + 0.45, z - 0.02, x + 0.02, G.ph + 0.65, z + 0.02, { ao: false, faces: 'nsewb', tint: [0.8, 0.75, 0.7] });
    }
    wb.box('iron', G.px0 + 0.05, G.ph + 0.82, z - 0.04, G.px1 - 0.05, G.ph + 0.9, z + 0.04, { ao: false, faces: 'nsewb' });
    for (const x of [G.px0, G.px1 - 0.06]) wb.box('black', x, 0, z - 0.08, x + 0.06, G.ph, z + 0.08, { ao: false, grime: false, faces: x < cx ? 'e' : 'w' });
  }
  // el matacán sobre el arco, entre las torres, en sus ménsulas
  {
    const y0 = G.h - 2.6;
    for (let x = G.px0 + 0.25; x < G.px1; x += 0.9) wb.box('wallstone', x - 0.16, y0 - 0.9, G.z1, x + 0.16, y0, G.z1 + 0.85, { ao: false, faces: 'nsewb', tint: [0.74, 0.72, 0.68] });
    wb.box('wallstone', G.px0, y0, G.z1, G.px1, y0 + 1.5, G.z1 + 0.9, { ao: false, faces: 'tsewb', sub: 2 });
    wb.box('black', G.px0 + 0.3, y0 - 0.01, G.z1 + 0.05, G.px1 - 0.3, y0, G.z1 + 0.55, { ao: false, grime: false, faces: 'b' });
  }
  // las puertas, atrancadas por dentro
  L.interact.push({ kind: 'door', id: 'd_paco', x: cx, y: 0, z: G.z0 + 0.3, w: pw, h: G.ph + pw / 2, arch: true, axis: 'x', mat: 'planks', double: true, hinge: 0, swing: 1, plane: G.z0, inset: 0.08, mark: 'cross', lock: { type: 'barred', side: -1, msg: 'pacoTranca' }, barredMsg: 'pacoAtrancada' });
  // faroles y estandartes
  P.wallTorch(ctx, G.px0 - 0.02, 2.6, G.z0 - 0.02, 'n');
  P.wallTorch(ctx, G.px1 + 0.02, 2.6, G.z0 - 0.02, 'n');
  P.banner(ctx, (G.x0 + G.px0) / 2, G.th - 1.2, G.zp + 0.32, 0, 'bannerRey', 1.6, 4.6);
  P.banner(ctx, (G.x0 + G.px0) / 2, G.th - 1.6, G.z0 - 0.32, Math.PI, 'bannerRey', 1.4, 3.6);
}

// ------------------------------------------------------------------------ el cuerpo de guardia
// La sala de los archeros, la guardia del Rey, contra el muro del foso y junto
// a la puerta: sus bancos, su mesa, el armero de las ballestas y el arca de
// los virotes; los archeros, donde los cogió la noche.
function guardia(ctx, S, L) {
  const wb = ctx.wb;
  const A = PACO.guardia;
  const room = 'paco_guardia';
  const ix0 = A.x0 + A.t,
    ix1 = A.x1 - A.t,
    iz0 = A.z0 + A.t,
    iz1 = A.z1;
  const dw = 1.5,
    dh = 2.5;
  W(S, ix0, iz0, ix1, iz1);
  W(S, A.door - dw / 2, A.z0 - 0.2, A.door + dw / 2, iz0);
  // muros (por fuera, el sillarejo; por dentro, el enlucido de interiorRoom)
  const yT = A.h + 0.35;
  const rv = iz0 - 0.15; // (lo que no cubre el enlucido del derrame)
  solid(ctx, 'wallstone', A.x0, 0, A.z0, A.door - dw / 2, yT, iz0, { faces: 'nwt', sub: 2 });
  solid(ctx, 'wallstone', A.door + dw / 2, 0, A.z0, A.x1, yT, iz0, { faces: 'nt', sub: 2 });
  solid(ctx, 'wallstone', A.door - dw / 2, dh, A.z0, A.door + dw / 2, yT, iz0, { faces: 'nt', sub: 2 });
  wb.box('wallstone', A.door - dw / 2 - 0.01, 0, A.z0, A.door - dw / 2, dh, rv, { faces: 'e', sub: 2, ao: false });
  wb.box('wallstone', A.door + dw / 2, 0, A.z0, A.door + dw / 2 + 0.01, dh, rv, { faces: 'w', sub: 2, ao: false });
  wb.box('wallstone', A.door - dw / 2, dh, A.z0, A.door + dw / 2, dh + 0.01, rv, { faces: 'b', sub: 2, ao: false });
  solid(ctx, 'wallstone', A.x0, 0, iz0, ix0, yT, iz1, { faces: 'wt', sub: 2 });
  solid(ctx, 'wallstone', ix1, 0, iz0, A.x1, yT, iz1, { faces: 't', sub: 2 });
  for (const s of [-1, 1]) wb.box('ashlar', A.door + s * (dw / 2) - 0.12, 0, A.z0 - 0.06, A.door + s * (dw / 2) + 0.12, dh + 0.2, A.z0, { ao: false, faces: 'nsewt' });
  wb.box('ashlar', A.door - dw / 2 - 0.14, dh, A.z0 - 0.08, A.door + dw / 2 + 0.14, dh + 0.32, A.z0, { ao: false, faces: 'nsewtb' });
  // las ventanas, con su reja
  for (const x of [-87.2, -77.4]) {
    wb.box('black', x - 0.45, 1.4, A.z0 - 0.02, x + 0.45, 2.4, A.z0, { ao: false, grime: false, faces: 'n' });
    for (let k = -1; k <= 1; k++) wb.box('iron', x + k * 0.22 - 0.02, 1.4, A.z0 - 0.06, x + k * 0.22 + 0.02, 2.4, A.z0 - 0.02, { ao: false });
    wb.box('ashlar', x - 0.55, 1.3, A.z0 - 0.1, x + 0.55, 1.4, A.z0, { ao: false, faces: 'nsewt' });
  }
  interiorRoom(ctx, ix0, iz0, ix1, iz1 - 0.05, 0, A.h, { room, wall: 'plaster', tint: [0.7, 0.66, 0.6], floorMat: 'flag', doors: [{ side: 'n', at: A.door, w: dw, h: dh, reveal: true }] });
  // el tejado, a un agua, contra el muro
  {
    const yA = A.h + 0.35,
      yB = A.h + 1.9;
    const o = { ao: false, sub: 2.2 };
    wb.quad('roof', V(A.x1 + 0.2, yA - 0.1, A.z0 - 0.5), V(A.x0, yA - 0.1, A.z0 - 0.5), V(A.x0, yB, A.z1), V(A.x1 + 0.2, yB, A.z1), o);
    wb.quad('wooddark', V(A.x0, yA - 0.28, A.z0 - 0.5), V(A.x1 + 0.2, yA - 0.28, A.z0 - 0.5), V(A.x1 + 0.2, yB - 0.18, A.z1), V(A.x0, yB - 0.18, A.z1), { ...o, tint: [0.5, 0.46, 0.42] });
    wb.quad('wooddark', V(A.x0, yA - 0.28, A.z0 - 0.5), V(A.x0, yA - 0.1, A.z0 - 0.5), V(A.x1 + 0.2, yA - 0.1, A.z0 - 0.5), V(A.x1 + 0.2, yA - 0.28, A.z0 - 0.5), o);
    // (el hastial de poniente, de piedra, bajo el faldón)
    wb.tri('wallstone', V(A.x0, yA, A.z0), V(A.x0, yA, A.z1), V(A.x0, yB - 0.2, A.z1), { ao: false });
    ctx.col.addCam(A.x0, yA - 0.3, A.z0 - 0.5, A.x1, yB, A.z1);
  }
  L.interact.push({ kind: 'door', id: 'd_guardia_paco', x: A.door, y: 0, z: A.z0 + A.t / 2, w: dw, h: dh, axis: 'x', mat: 'planks', hinge: -1, swing: -1, plane: iz0, inset: 0.06, ajar: 0.3, lock: { type: 'none' } });
  // dentro: los bancos, la mesa con los dados, el hogar frío, el armero
  // de las ballestas, el arca de los virotes y los archeros
  wb.setRoom(room);
  P.table(ctx, -84.6, 0, -49.4, 2.4, 0.9, 0, { room });
  P.bench(ctx, -84.6, 0, -50.4, 2.2, 0);
  P.bench(ctx, -84.6, 0, -48.4, 2.2, Math.PI);
  P.weaponRack(ctx, -79.0, 0, -47.35, Math.PI);
  P.cask(ctx, -76.2, 0, -50.5, 0.3, { room });
  P.crate(ctx, -88.4, 0, -50.4, 0.7, 0.1);
  P.candles(ctx, -84.2, 0.82, -49.3, 3, 6204, { room, radius: 5, intensity: 0.7 });
  bakeCorpse(wb, -85.8, 0, -50.5, 0.1, 'sit', 'soldier', 65);
  bakeCorpse(wb, -80.6, 0, -49.0, 1.9, 'face', 'soldier', 66);
  P.decal(ctx, -80.6, 0.01, -49.0, 1.6);
  P.dropped(ctx, -81.8, 0, -50.2, 0.8, 'sword');
  wb.setRoom(null);
  ctx.lights.push({ x: -84.6, y: 2.2, z: -49.4, r: 1, g: 0.58, b: 0.28, radius: 8, intensity: 1.0, room });
  L.interact.push({ kind: 'item', id: 'i_virotes_guardia', item: 'virote', n: 6, x: -76.2, y: 0.95, z: -50.5 });
  L.enemies.push({ type: 'soldier', x: -78.4, y: 0, z: -49.6, yaw: Math.PI, idle: 'stand', id: 'e_pg1' });
}

// ------------------------------------------------------------------------ el patio
// El patio de honor: enlosado al pie de la sala y por el camino de la puerta,
// empedrado lo demás; un pozo con su brocal y un olmo seco; y, pegada a la
// coracha, la escalera por la que se baja de ella.
function patio(ctx, S, L) {
  const wb = ctx.wb;
  const Pt = PACO.patio,
    Sa = PACO.sala,
    G = PACO.puerta,
    E = PACO.escalera,
    C = KEEP.coracha,
    T = KEEP.coracTower;
  const rng = new RNG(6201);
  W(S, Pt.x0, Pt.z0, Pt.x1, Pt.z1);
  floor(ctx, Pt.x0, Pt.z0, Pt.x1, Pt.z1, 'cobble', 0, { sub: 3, tint: [0.82, 0.8, 0.76] });
  floor(ctx, Pt.x0, Pt.z0, Pt.x1, Pt.z0 + 3, 'flag', 0.02, { sub: 3 });
  floor(ctx, G.px0 - 0.3, Pt.z0 + 3, G.px1 + 0.3, Pt.z1, 'flag', 0.02, { sub: 3 });
  // el pozo y el olmo seco
  P.well(ctx, -80, 0, -67, {});
  P.deadTree(ctx, -84.5, 0, -57.5, 6202, 9.5);
  ctx.crows.push({ x: -84.5, y: 7.5, z: -57.5, r: 1.2, n: 3 });

  // la escalera de la coracha: de lo alto (junto a la torre) al patio,
  // maciza, con su pretil escalonado al patio y un rellano arriba
  {
    const yTop = C.y;
    const zTop = T.z - T.w / 2 - 2.0; // (el rellano, de zTop a la torre)
    const zFoot = zTop - E.n * E.run;
    const xc = (E.x0 + E.x1) / 2,
      w = E.x1 - E.x0;
    stairs(ctx, xc, 0, zFoot, 's', w, E.n, E.rise, E.run, 'wallstone', { base: 0, faces: 'tnw' });
    solid(ctx, 'wallstone', E.x0, 0, zTop, E.x1, yTop, T.z - T.w / 2, { faces: 'tw', sub: 2, mats: { t: 'flag' } });
    for (let i = 0; i < E.n; i++) {
      const za = zFoot + E.run * i,
        zb = za + E.run;
      const y1 = E.rise * (i + 1);
      solid(ctx, 'wallstone', E.x0, y1, za, E.x0 + 0.4, y1 + 1.0, zb, { sub: 2, ao: false, faces: 'tnew' });
    }
    solid(ctx, 'wallstone', E.x0, yTop, zTop, E.x0 + 0.4, yTop + 1.0, T.z - T.w / 2, { sub: 2, ao: false, faces: 'tew' });
    solid(ctx, 'wallstone', E.x0 + 0.4, yTop, T.z - T.w / 2 - 0.4, T.x - T.w / 2, yTop + 1.0, T.z - T.w / 2, { sub: 2, ao: false, faces: 'tns' });
    // (en su costado, tres arcos cegados, como si la escalera cargara sobre
    // ellos, y una imposta escalonada bajo el pretil: si no, el macizo se
    // veía liso)
    const west = V(-1, 0, 0);
    for (const [c, aw, ys] of [
      [zFoot + 3.9, 2.6, 0.9],
      [zFoot + 7.9, 3.0, 2.4],
      [zFoot + 10.9, 3.0, 4.6],
    ]) {
      archRing(ctx, { axis: 'z', c, w: aw, y0: ys, rise: aw / 2, ring: 0.3, t0: E.x0 - 0.12, t1: E.x0, mat: 'ashlar', tint: [0.72, 0.7, 0.66], seats: false, cam: false });
      const fill = { ao: false, sub: 2, tint: [0.58, 0.56, 0.53] };
      const xf = E.x0 - 0.03;
      cara(wb, 'wallstone', V(xf, 0, c - aw / 2), V(xf, 0, c + aw / 2), V(xf, ys, c + aw / 2), V(xf, ys, c - aw / 2), west, fill);
      const N = 10;
      for (let k = 0; k < N; k++) {
        const a0 = (Math.PI * k) / N,
          a1 = (Math.PI * (k + 1)) / N;
        const p0 = V(xf, ys + (aw / 2) * Math.sin(a0), c + (aw / 2) * Math.cos(a0)),
          p1 = V(xf, ys + (aw / 2) * Math.sin(a1), c + (aw / 2) * Math.cos(a1));
        const n = new THREE.Vector3().subVectors(p0, V(xf, ys, c)).cross(new THREE.Vector3().subVectors(p1, V(xf, ys, c)));
        if (n.dot(west) >= 0) wb.tri('wallstone', V(xf, ys, c), p0, p1, fill);
        else wb.tri('wallstone', V(xf, ys, c), p1, p0, fill);
      }
      for (const s of [-1, 1]) wb.box('ashlar', E.x0 - 0.12, 0, c + s * (aw / 2) - (s > 0 ? 0 : 0.3), E.x0, ys, c + s * (aw / 2) + (s > 0 ? 0.3 : 0), { ao: false, faces: 'wns', tint: [0.72, 0.7, 0.66] });
    }
    for (let i = 3; i < E.n; i += 3) {
      const za = zFoot + E.run * i;
      const yb = E.rise * i;
      wb.box('ashlar', E.x0 - 0.1, yb - 0.24, za, E.x0, yb - 0.04, za + E.run * 3, { ao: false, faces: 'tbwns' });
    }
    // braseros arriba y abajo
    P.brazier(ctx, E.x0 - 1.2, 0, zFoot - 0.8, {});
    P.wallTorch(ctx, E.x0 + 0.02, yTop + 1.9, zTop + 0.4, 'w');
  }
  // los estandartes y los braseros ante la sala; restos de la noche
  P.brazier(ctx, Sa.portada - 3.6, 0, Pt.z0 + 3.4, {});
  P.brazier(ctx, Sa.portada + 3.6, 0, Pt.z0 + 3.4, {});
  P.cart(ctx, -78.5, 0, -56.0, 0.5, {});
  P.barrel(ctx, -75.6, 0, -53.2, {});
  P.barrel(ctx, -74.9, 0, -54.1, {});
  P.crate(ctx, -88.6, 0, -54.0, 0.8, 0.3);
  P.firewood(ctx, -66.0, 0, -84.4, 0, 3);
  bakeCorpse(wb, -70.2, 0, -57.2, 2.2, 'back', 'soldier', 67);
  bakeCorpse(wb, -81.4, 0, -79.0, -0.6, 'face', 'villager', 68);
  bakeCorpse(wb, -73.6, 1.5, -84.1, 0.2, 'curl', 'villager', 69);
  P.decal(ctx, -70.2, 0.03, -57.2, 2.2);
  P.decal(ctx, -81.4, 0.03, -79.0, 1.7);
  P.dropped(ctx, -76.8, 0, -62.5, 1.4, 'helmet');
  P.arrows(ctx, -72.0, 0, -66.0, 7, 6203, 2.2);
  // los de la guardia del Rey que quedan en pie, y uno que reza a la puerta
  // de la sala
  L.enemies.push(
    { type: 'soldier', x: -77.0, y: 0, z: -64.0, yaw: -0.4, idle: 'wander', id: 'e_pp1' },
    { type: 'soldier', x: -86.0, y: 0, z: -76.0, yaw: 1.2, idle: 'stand', id: 'e_pp2' },
    { type: 'penitent', x: Sa.portada, y: 0, z: Pt.z0 + 2.2, yaw: 0, idle: 'kneel', id: 'e_pp3' }
  );
  // examinar el olmo: lo plantó el Rey
  L.interact.push({ kind: 'examine', id: 'x_olmo', text: 'olmoRey', x: -84.5, y: 0, z: -57.5, r: 2.4 });
  void rng;
}

// ------------------------------------------------------------------------ la sala (por fuera)
// La Sala de la Corte, vista desde el patio: sus muros de sillería con los
// contrafuertes de los arcos diafragma, las ventanas altas geminadas, la
// portada con su escalinata (en el tramo de abajo: las puertas de la sala,
// atrancadas por dentro) y el tejado; al oeste, el hastial con su óculo.
function sala(ctx, S, L) {
  const wb = ctx.wb;
  const Sa = PACO.sala;
  const { x0, x1, z0, z1, t, eave, ridge } = Sa;
  const tint = [0.86, 0.83, 0.78];
  const pw = 2.6,
    ps = Sa.y + 2.4; // (el arranque del arco de la portada)
  // los muros largos: el del patio, con la portada; el del norte, entero
  archedWall(ctx, { axis: 'x', a0: x0, a1: x1, t0: z1 - t, t1: z1, y0: 0, y1: eave, openings: [{ c: Sa.portada, w: pw, h: ps, rise: pw / 2, ring: 0.36 }], mat: 'ashlar', tint, rooms: ['sala', 'out'], sub: 2.2 });
  solid(ctx, 'ashlar', x0, 0, z0, x1, eave, z0 + t, { faces: 'n', sub: 2.2, aoH: 2.5, tint });
  // los hastiales (sus caras, de esquina a esquina)
  solid(ctx, 'ashlar', x0, 0, z0 + t, x0 + t, eave, z1 - t, { faces: '', sub: 2.2 });
  solid(ctx, 'ashlar', x1 - t, 0, z0 + t, x1, eave, z1 - t, { faces: '', sub: 2.2 });
  wb.box('ashlar', x0, 0, z0, x0 + 0.01, eave, z1, { faces: 'w', sub: 2.2, aoH: 2.5, tint });
  wb.box('ashlar', x1 - 0.01, 0, z0, x1, eave, z1, { faces: 'e', sub: 2.2, aoH: 2.5, tint });
  // (el macizo del suelo de la sala, en alto, y el umbral de la portada)
  solid(ctx, 'flag', Sa.portada - pw / 2, 0, z1 - t, Sa.portada + pw / 2, Sa.y, z1, { faces: 't', ao: false, uv: 0.8 });
  W(S, Sa.portada - pw / 2, z1 - t, Sa.portada + pw / 2, z1);
  // la escalinata
  {
    const n = 5;
    stairs(ctx, Sa.portada, 0, z1 + n * 0.42, 'n', 5.2, n, Sa.y / n, 0.42, 'ashlar', { base: 0 });
    for (const s of [-1, 1]) solid(ctx, 'ashlar', Sa.portada + s * 2.6 - (s > 0 ? 0 : 0.5), 0, z1, Sa.portada + s * 2.6 + (s > 0 ? 0.5 : 0), Sa.y + 0.55, z1 + n * 0.42, { faces: 'tnsew', ao: false, sub: 2, tint });
  }
  // los contrafuertes (donde cargan los arcos de dentro), en las dos caras
  for (const x of Sa.arcos) {
    for (const [za, zb] of [
      [z1, z1 + 1.1],
      [z0 - 1.1, z0],
    ]) {
      // (junto a la escalinata, no: su pretil hace de estribo)
      if (za === z1 && Math.abs(x - Sa.portada) < 4) continue;
      solid(ctx, 'ashlar', x - 0.55, 0, za, x + 0.55, eave - 2.2, zb, { faces: za === z1 ? 'sew' : 'new', sub: 2, aoH: 2, tint });
      // (el remate en talud)
      const out = za === z1 ? zb : za,
        inn = za === z1 ? za : zb;
      cara(wb, 'ashlar', V(x - 0.55, eave - 2.2, out), V(x + 0.55, eave - 2.2, out), V(x + 0.55, eave - 0.6, inn), V(x - 0.55, eave - 0.6, inn), V(0, 0.6, za === z1 ? 1 : -1), { ao: false, sub: 2, tint });
      for (const s of [-1, 1]) wb.tri('ashlar', V(x + s * 0.55, eave - 2.2, out), V(x + s * 0.55, eave - 2.2, inn), V(x + s * 0.55, eave - 0.6, inn), { ao: false, tint });
    }
  }
  // las ventanas altas, geminadas (en cada tramo, por las dos caras)
  const bays = [Sa.x0 + t, ...Sa.arcos, Sa.screens];
  const win = (xc, face) => {
    const w = 0.62,
      h = 3.0,
      yb = 6.4;
    const zf = face === 's' ? z1 : z0;
    const sg = face === 's' ? 1 : -1;
    const put = (a, b, ya, yb2, d0, d1, mat, o = {}) => wb.box(mat, a, ya, Math.min(zf + sg * d0, zf + sg * d1), b, yb2, Math.max(zf + sg * d0, zf + sg * d1), { ao: false, faces: 'tnsewb'.replace(face === 's' ? 'n' : 's', ''), ...o });
    for (const s of [-1, 1]) {
      const c = xc + s * 0.45;
      put(c - w / 2, c + w / 2, yb, yb + h, 0.01, 0.02, 'black', { grime: false });
      // (el arquillo de cada luz)
      put(c - w / 2 - 0.1, c + w / 2 + 0.1, yb + h, yb + h + 0.3, 0, 0.14, 'ashlar');
    }
    put(xc - 0.08, xc + 0.08, yb, yb + h, 0, 0.12, 'ashlar');
    put(xc - 0.86, xc - 0.76, yb, yb + h, 0, 0.14, 'ashlar');
    put(xc + 0.76, xc + 0.86, yb, yb + h, 0, 0.14, 'ashlar');
    put(xc - 0.98, xc + 0.98, yb - 0.18, yb, 0, 0.2, 'ashlar');
    put(xc - 0.98, xc + 0.98, yb + h + 0.3, yb + h + 0.62, 0, 0.18, 'ashlar');
  };
  for (let i = 0; i + 1 < bays.length; i++) {
    const xc = (bays[i] + bays[i + 1]) / 2;
    win(xc, 'n');
    if (Math.abs(xc - Sa.portada) > 1.5) win(xc, 's');
  }
  // la cornisa con sus canecillos
  for (const [za, zb, f] of [
    [z1, z1 + 0.32, 'tseb'],
    [z0 - 0.32, z0, 'tnwb'],
  ]) {
    wb.box('ashlar', x0 - 0.3, eave - 0.3, za, x1, eave, zb, { ao: false, faces: f + 'w', sub: 3, tint: [0.72, 0.7, 0.66] });
    for (let x = x0 + 0.5; x < x1 - 0.3; x += 1.1) wb.box('ashlar', x - 0.11, eave - 0.62, Math.min(za, zb), x + 0.11, eave - 0.3, Math.max(za, zb), { ao: false, faces: 'nsewb', tint: [0.66, 0.64, 0.6] });
  }
  // el óculo del hastial de poniente
  {
    const yc = eave + 2.4,
      r = 1.5;
    wb.cylinder('black', x0 - 0.02, yc - r, (z0 + z1) / 2, r, r, 0.001, 16, { ao: false, grime: false });
    const g = new THREE.TorusGeometry(r + 0.12, 0.16, 6, 20);
    g.rotateY(Math.PI / 2);
    wb.geometry('ashlar', g, new THREE.Matrix4().makeTranslation(x0 - 0.05, yc, (z0 + z1) / 2), { ao: false });
    wb.box('black', x0 - 0.03, yc - r, (z0 + z1) / 2 - r, x0 - 0.02, yc + r, (z0 + z1) / 2 + r, { ao: false, grime: false, faces: 'w' });
  }
  // el tejado
  solidGableRoof(ctx, x0, z0, x1, z1, eave, ridge, 'x', { overhang: 0.55, gableOverhang: 0.25, wallT: t, wallMat: 'ashlar', wallTint: tint, room: 'sala' });
  // la portada: sus jambas con columnillas y las puertas, atrancadas por
  // dentro (en la fase de la sala las desatranca la corte vencida)
  for (const s of [-1, 1]) {
    const x = Sa.portada + s * (pw / 2 + 0.36);
    wb.cylinder('ashlar', x, Sa.y, z1 + 0.18, 0.13, 0.13, ps - Sa.y, 8, { ao: false });
    wb.box('ashlar', x - 0.2, ps - 0.02, z1, x + 0.2, ps + 0.22, z1 + 0.4, { ao: false, faces: 'tnsewb' });
  }
  L.interact.push({ kind: 'door', id: 'd_sala', x: Sa.portada, y: Sa.y, z: z1 - t / 2, w: pw, h: ps - Sa.y + pw / 2, arch: true, axis: 'x', mat: 'planks', double: true, hinge: 0, swing: 1, plane: z1 - t, inset: 0.08, mark: 'cross', lock: { type: 'barred', side: -1 }, barredMsg: 'salaAtrancada' });
  // el callejón de las caballerizas, entre la sala y la coracha: su arco y su
  // puerta, atrancada por el otro lado
  {
    const ax0 = x1,
      ax1 = PACO.x1,
      ac = (ax0 + ax1) / 2,
      aw = 2.8;
    archedWall(ctx, { axis: 'x', a0: ax0, a1: ax1, t0: z1 - 0.7, t1: z1, y0: 0, y1: 4.6, openings: [{ c: ac, w: aw, h: 2.2, rise: aw / 2, ring: 0.3 }], mat: 'ashlar', tint, rooms: ['out', 'out'] });
    wb.box('ashlar', ax0, 4.6, z1 - 0.8, ax1, 4.85, z1 + 0.1, { ao: false, faces: 'tnsb', tint: [0.72, 0.7, 0.66] });
    L.interact.push({ kind: 'door', id: 'd_cuadras', x: ac, y: 0, z: z1 - 0.35, w: aw, h: 2.2 + aw / 2, arch: true, axis: 'x', mat: 'planks', double: true, hinge: 0, swing: 1, plane: z1 - 0.7, inset: 0.06, lock: { type: 'barred', side: -1 }, barredMsg: 'cuadrasAtrancada' });
  }
  // los estandartes del Rey a los lados de la portada
  P.banner(ctx, Sa.portada - 4.6, eave - 1.0, z1 + 0.16, 0, 'bannerRey', 1.5, 4.8);
  P.banner(ctx, Sa.portada + 4.6, eave - 1.0, z1 + 0.16, 0, 'bannerRey', 1.5, 4.8);
}

// ------------------------------------------------------------------------ las cámaras (por fuera)
// La crujía de levante de las Cámaras del Rey: la galería al patio (una
// arquería de medio punto sobre pilares, con su techo de vigas), el muro de
// las cámaras con sus puertas, cerradas, y encima la planta noble con sus
// ventanas; y su tejado.
function camaras(ctx, S, L) {
  const wb = ctx.wb;
  const Cm = PACO.camaras;
  const { x1, z0, z1, gx, F1, eave, ridge } = Cm;
  const ax0 = x1 - 0.6;
  const room = 'paco_galeria';
  const n = 11,
    aw = 2.6,
    step = 3.4;
  const za = z0 + (z1 - z0 - (n * step - (step - aw))) / 2;
  W(S, gx, z0 + 0.1, x1, z1 - 0.1);
  // el suelo de la galería, un escalón sobre el patio
  solid(ctx, 'flag', gx, 0, z0, ax0, 0.12, z1, { faces: 't', ao: false, uv: 0.8, room });
  wb.box('flag', ax0, -0.06, z0, x1, 0.12, z1, { faces: 'te', ao: false, uv: 0.8 });
  // la arquería
  archedWall(ctx, {
    axis: 'z',
    a0: z0,
    a1: z1,
    t0: ax0,
    t1: x1,
    y0: 0.12,
    y1: F1,
    openings: Array.from({ length: n }, (_, k) => ({ c: za + aw / 2 + k * step, w: aw, h: 2.3, rise: aw / 2, ring: 0.28 })),
    mat: 'ashlar',
    tint: [0.84, 0.81, 0.76],
    rooms: [room, 'out'],
    sub: 1.8,
  });
  // el techo de vigas de la galería y lo de encima (la planta noble)
  wb.box('wooddark', gx, F1 - 0.12, z0, ax0, F1, z1, { faces: 'b', ao: false, room, tint: [0.6, 0.55, 0.5] });
  for (let z = z0 + 1.0; z < z1 - 0.5; z += 1.6) wb.box('timber', gx, F1 - 0.38, z - 0.12, ax0, F1 - 0.12, z + 0.12, { ao: false, faces: 'nsewb', room });
  solid(ctx, 'ashlar', ax0, F1, z0, x1, eave, z1, { faces: 'e', sub: 2.2, aoH: 1, tint: [0.84, 0.81, 0.76] });
  ctx.col.add(gx, F1, z0, ax0, eave, z1);
  // el muro de las cámaras, con sus puertas (cerradas: se abren por dentro)
  const doors = [z0 + 6.3, (z0 + z1) / 2, z1 - 6.3];
  const holes = doors.map((c) => ({ c, w: 1.5, h: 2.5 }));
  {
    let cur = z0;
    for (const h of holes) {
      solid(ctx, 'plaster', gx - 0.8, 0, cur, gx, F1, h.c - h.w / 2, { faces: 'e', sub: 2, room, tint: [0.78, 0.74, 0.68] });
      solid(ctx, 'plaster', gx - 0.8, h.h, h.c - h.w / 2, gx, F1, h.c + h.w / 2, { faces: 'eb', sub: 2, room, tint: [0.78, 0.74, 0.68] });
      wb.box('ashlar', gx - 0.02, 0.12, h.c - h.w / 2 - 0.16, gx + 0.06, h.h + 0.2, h.c + h.w / 2 + 0.16, { ao: false, faces: 'ensw', room, tint: [0.7, 0.68, 0.64] });
      cur = h.c + h.w / 2;
    }
    solid(ctx, 'plaster', gx - 0.8, 0, cur, gx, F1, z1, { faces: 'e', sub: 2, room, tint: [0.78, 0.74, 0.68] });
  }
  doors.forEach((c, i) =>
    L.interact.push({ kind: 'door', id: 'd_camara' + (i + 1), x: gx - 0.4, y: 0.12, z: c, w: 1.5, h: 2.5, axis: 'z', mat: 'planks', hinge: -1, swing: 1, plane: gx - 0.8, inset: 0.06, lock: { type: 'barred', side: -1 }, barredMsg: 'camaraCerrada' })
  );
  // los extremos de la galería (contra la sala y contra el cuerpo de guardia)
  solid(ctx, 'ashlar', gx, 0, z0, ax0, F1, z0 + 0.01, { faces: 's', ao: false, room, collide: false });
  solid(ctx, 'ashlar', gx - 0.8, 0, z1 - 0.6, ax0, F1, z1, { faces: 'n', sub: 2, room, tint: [0.84, 0.81, 0.76] });
  // las ventanas de la planta noble
  for (let k = 0; k < n; k += 2) {
    const zc = za + aw / 2 + k * step;
    const yb = F1 + 1.3;
    wb.box('black', x1, yb, zc - 0.5, x1 + 0.02, yb + 2.0, zc + 0.5, { ao: false, grime: false, faces: 'e' });
    wb.box('ashlar', x1, yb - 0.16, zc - 0.68, x1 + 0.18, yb, zc + 0.68, { ao: false, faces: 'tnseb' });
    wb.box('ashlar', x1, yb + 2.0, zc - 0.68, x1 + 0.16, yb + 2.34, zc + 0.68, { ao: false, faces: 'tnseb' });
    for (const s of [-1, 1]) wb.box('ashlar', x1, yb, zc + s * 0.59 - 0.09, x1 + 0.14, yb + 2.0, zc + s * 0.59 + 0.09, { ao: false, faces: 'nse' });
    wb.box('ashlar', x1, yb, zc - 0.06, x1 + 0.1, yb + 2.0, zc + 0.06, { ao: false, faces: 'nse' });
  }
  // la cornisa y el tejado (a dos aguas, a lo largo de la crujía; contra la
  // sala, sin hastial)
  wb.box('ashlar', x1, eave - 0.3, z0, x1 + 0.3, eave, z1, { ao: false, faces: 'tseb', tint: [0.72, 0.7, 0.66] });
  solidGableRoof(ctx, Cm.e0, z0, x1, z1, eave, ridge, 'z', { overhang: 0.5, gables: [false, {}], wallMat: 'ashlar' });
  // la luz de la galería: faroles colgados
  for (const z of [z0 + 9.5, z1 - 9.5]) {
    P.hangingLamp(ctx, (gx + ax0) / 2, F1 - 0.4, z, { room, lit: true });
    ctx.lights.push({ x: (gx + ax0) / 2, y: F1 - 1.6, z, r: 1, g: 0.6, b: 0.3, radius: 7, intensity: 0.9, room });
  }
  P.banner(ctx, x1 + 0.12, eave - 1.0, (z0 + z1) / 2, Math.PI / 2, 'bannerRey', 1.4, 3.6);
  L.enemies.push({ type: 'penitent', x: gx + 1.2, y: 0.12, z: doors[1] + 1.4, yaw: -Math.PI / 2, idle: 'kneel', id: 'e_pc1' });
}

// ------------------------------------------------------------------------ las cocinas (por fuera)
// La cocina grande, exenta y cuadrada como las de los monasterios, con su
// chimenea cónica: se ve desde toda la ciudad, por detrás de la sala.
function cocina(ctx) {
  const wb = ctx.wb;
  const K = PACO.cocina;
  const h = K.w / 2;
  solid(ctx, 'ashlar', K.x - h, 0, K.z - h, K.x + h, K.h, K.z + h, { faces: 'nsew', sub: 2.2, aoH: 2.5, tint: [0.84, 0.8, 0.74] });
  wb.box('ashlar', K.x - h - 0.25, K.h - 0.3, K.z - h - 0.25, K.x + h + 0.25, K.h, K.z + h + 0.25, { ao: false, faces: 'nsewb', tint: [0.72, 0.7, 0.66] });
  wb.pyramid('roof', K.x, K.z, K.w + 0.8, K.w + 0.8, K.h, 2.6);
  // la chimenea: un cono de sillería, ennegrecido arriba, con su boca
  const y0 = K.h + 1.2;
  wb.cylinder('ashlar', K.x, y0, K.z, h - 0.6, 0.85, K.top - y0, 16, { ao: false, sub: 2.5, tint: [0.8, 0.77, 0.72] });
  wb.cylinder('ashlar', K.x, K.top - 3.5, K.z, 1.62, 0.85, 3.5, 16, { ao: false, sub: 2, tint: [0.42, 0.4, 0.38] });
  wb.cylinder('ashlar', K.x, K.top, K.z, 1.0, 1.0, 0.35, 12, { ao: false, tint: [0.36, 0.34, 0.32] });
  wb.cylinder('black', K.x, K.top + 0.34, K.z, 0.78, 0.78, 0.02, 12, { ao: false, grime: false, capTop: true });
  ctx.col.addCam(K.x - h, K.h, K.z - h, K.x + h, K.top, K.z + h);
}

// ------------------------------------------------------------------------ zonas y mapa
function zonas(L) {
  const F = PACO.foso,
    Pt = PACO.patio,
    G = PACO.puerta,
    A = PACO.guardia,
    B = PACO.puente,
    Cm = PACO.camaras,
    Sa = PACO.sala;
  L.zones.push(
    { id: 'paco_guardia', rects: [[A.x0 + A.t, A.z0 + A.t, A.x1 - A.t, A.z1, -1, A.h]], atmo: 'interior', room: 'paco_guardia' },
    { id: 'puerta_paco', rects: [[G.px0, G.z0, G.px1, G.z1, -1, G.ph + 1.6]], atmo: 'city' },
    { id: 'paco_galeria', rects: [[Cm.gx, Cm.z0, Cm.x1, Cm.z1, -1, Cm.F1]], atmo: 'city', room: 'paco_galeria' },
    { id: 'paco_patio', rects: [[Pt.x0, Sa.z1 - Sa.t, Pt.x1, Pt.z1, -1, 20]], atmo: 'city' },
    { id: 'puente_paco', rects: [[B.x0, G.z1, B.x1, CASTLE.puertaNorte.z0, -1, 8]], atmo: 'city' },
    {
      id: 'foso_rey',
      rects: [
        [F.x0, F.z0, F.x1, F.z1, F.y - 1, -0.4],
        [F.ex0, F.z1, F.x1, F.ez1, F.y - 1, -0.4],
      ],
      atmo: 'city',
    }
  );
  L.map.push(
    { id: 'paco_patio', r: [Pt.x0, Pt.z0, Pt.x1, Pt.z1] },
    { id: 'paco_galeria', r: [Cm.gx, Cm.z0, Cm.x1, Cm.z1] },
    { id: 'paco_guardia', r: [A.x0, A.z0, A.x1, A.z1] },
    { id: 'puerta_paco', r: [G.x0, G.z0, G.x1, G.zp] },
    { id: 'puente_paco', r: [B.x0, G.zp, B.x1, CASTLE.puertaNorte.z0] },
    { id: 'foso_rey', r: [F.x0, F.z0, F.x1, F.z1] },
    { id: 'foso_rey', r: [F.ex0, F.z1, F.x1, F.ez1] }
  );
}
