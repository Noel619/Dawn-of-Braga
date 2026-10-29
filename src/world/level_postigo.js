// El Callejón del Postigo y la Casa del Alemán.
//
// Del patio del Postigo sale hacia el norte, bajo un arco, un callejón que
// tuerce en un recodo (con unas alminhas, el retablillo de las ánimas) y
// desemboca en una plazuela. Al fondo, la Casa del Alemán: una casa grande de
// entramado, como las de la tierra del padre, con la chimenea humeando y una
// luz en la ventana alta. Ahí resiste Henrique, el cuchillero, mientras los
// demonios aporrean su puerta. Dentro: la sala con el hogar, el taller, la
// alcoba, la cocina y la despensa, de donde baja la escalera del sótano. Del
// sótano sale el agujero que cavó Leonor, su mujer, hacia abajo y hacia el
// norte, hasta su gruta. Enfrente, el taller del carpintero; detrás de la
// casa, el patio de la leña.
//
// Las ventanas de la planta baja son huecos de verdad: por ellas entran las
// criaturas (sus contraventanas y los tablones que las tapian los pone el
// juego: game/house.js).
//
// La planta alta (el sobrado) también es de verdad: la sala alta, sobre la
// sala, donde se ha encerrado Henrique (la ventana que da a la plazuela); la
// cuchillería, con el rellano de la escalera; la alcoba de su padre, que
// sigue como la dejó; el cuarto de los oficiales y el granero. Se sube por
// una escalera que arranca en la sala, tras su puerta, y pasa por encima de
// la del sótano (las dos en el mismo cuartucho).
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { house, solid, stairs, stoneWall, archRing } from './builders.js';
import { floor } from './level_util.js';
import { hueco, forjado, vigas, tabique, cadaViga, quadN, ROT } from './kit_casa.js';
import { holedWall, railing, chest } from './level_souto.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// la casa (planta baja) y sus ventanas
const H = { x0: 40, z0: -110, x1: 60, z1: -97, g1: 3.6, h: 7.6, t: 0.35 };
const WIN = { w: 1.15, sill: 0.95, top: 2.15 };
const NRM = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] };
// la planta alta: su suelo (el forjado, de g1 a FY) y su techo (encima, el
// desván, al que no se sube); sus ventanas (alféizar y alto)
const FY = 3.8;
const UPC = 6.9;
const UPW = { w: 0.8, y0: FY + 0.95, h: 1.1 };
// la cal de la casa, por fuera y por dentro
const TINT = [1.02, 0.95, 0.84];
const TINT_IN = [0.88, 0.84, 0.76];
const WINDOWS = [
  { id: 'v_taller', side: 's', x: 43.6, z: H.z1, where: 'el taller' },
  { id: 'v_despensa', side: 's', x: 56.4, z: H.z1, where: 'la despensa' },
  { id: 'v_oeste', side: 'w', x: H.x0, z: -100.0, where: 'el taller' },
  { id: 'v_este', side: 'e', x: H.x1, z: -98.8, where: 'la despensa' },
  { id: 'v_cocina', side: 'e', x: H.x1, z: -106.4, where: 'la cocina' },
];

export const ALEMAN = {
  house: H,
  win: WIN,
  // ventanas: centro del hueco en la cara de fuera del muro y hacia dónde
  // mira (n); out: donde espera la criatura fuera; in: donde cae dentro
  windows: WINDOWS.map((w) => {
    const [nx, nz] = NRM[w.side];
    return { ...w, nx, nz, out: [w.x + nx * 1.6, w.z + nz * 1.6], in: [w.x - nx * 1.45, w.z - nz * 1.45], inner: [w.x - nx * H.t, w.z - nz * H.t] };
  }),
  door: { x: 50, z: H.z1, w: 1.6, h: 2.5 },
  // la ventana alta sobre la puerta, la de la sala alta (ahí se asoma
  // Henrique), y la planta alta: su suelo y su techo
  upWin: { x: 50, z: H.z1, y0: UPW.y0, y1: UPW.y0 + 1.2, w: 1.1, floor: FY },
  fy: FY,
  upCeil: UPC,
  // la escalera de la planta alta: sube hacia el este por encima de la del
  // sótano, en el mismo cuartucho (la de abajo pasa bajo ésta con metro y
  // medio de sobra). Se entra desde la sala por su puerta (atrancada desde
  // dentro mientras Henrique está arriba) a un rellanito sobre el hueco de
  // la del sótano (foot: de dónde a dónde, en x). hole: el hueco que deja en
  // el suelo de arriba (con su barandilla); empieza donde, bajando, la
  // cabeza del más alto (1,85 m) ya no da en el canto del forjado
  upStair: { x0: 53.8, z0: -103, z1: -101, n: 13, rise: FY / 13, run: 0.37, foot: 53.0, hole: [54.5, -103, 58.61, -101], door: { x: 53.0, z: -102, w: 1.1, h: 2.2 } },
  // la repisa del hogar de la sala, donde está clavada la espada del padre
  // (su punta, en la madera: x, y de la cara de arriba, z)
  mantel: { x: 50, y: 1.58, z: -108.925 },
  // la escalera del sótano, en la despensa: sube hacia el este; arriba, el
  // rellano, junto a la puerta del cuartucho. (El hueco de la losa de la
  // calle va por metros enteros: de x 53 a 59 y de z -103 a -101; lo que le
  // sobra al rellano lleva su propio suelo.)
  stair: { x0: 53.4, z0: -103, z1: -101, n: 13, rise: 0.3, run: 0.4, landing: [58.6, 59.65], hole: [53, -103, 59, -101], door: { x: 59.1, z: -100.8, w: 0.9, h: 2.2 } },
  cellar: { x0: H.x0 + H.t, z0: H.z0 + H.t, x1: H.x1 - H.t, z1: H.z1 - H.t, y: -3.9, top: -1.25 },
  // el agujero de Leonor: baja hacia el norte, de la bodega a su gruta
  tunnel: { x0: 46.2, x1: 48.8, z0: -121, z1: H.z0 + H.t, zBot: -117, n: 10, rise: 0.3, run: 0.6 },
  lair: { x0: 39.6, z0: -135.6, x1: 58.4, z1: -121, y: -6.9, top: -1.4 },
  grid: [37, -138, 62, -96],
  // sitios del guion
  hall: { x: 50, z: -104.2 },
  doorIn: { x: 50, z: -98.6 },
  // la cuna (donde llora) y la boca del agujero en la gruta
  cradle: { x: 49, z: -131.4 },
  lairMouth: { x: 47.5, z: -121 },
  // el callejón: el arco del patio, el recodo y la plazuela
  arch: { x0: 44, x1: 47.6, z0: -62, z1: -59.5 },
  plaza: { x0: 37, z0: -97, x1: 62, z1: -86 },
  carp: { x0: 62, z0: -100, x1: 70.8, z1: -84, door: -91 },
  yard: { x0: 60, z0: -109, x1: 71.8, z1: -100 },
  passage: { x0: 37, z0: -110, x1: 40, z1: -97 },
};

// la gruta: su contorno (de la jamba oeste de la boca del agujero hacia el
// oeste, el norte, el este y de vuelta a la jamba este) y lo que se pisa
const LAIR_OUTLINE = [
  [46.2, -121],
  [41.0, -121],
  [39.8, -126],
  [39.6, -131.5],
  [40.8, -135.6],
  [48, -136.4],
  [57.0, -135.6],
  [58.4, -131],
  [58.0, -125],
  [57.2, -121],
  [48.8, -121],
];
const LAIR_WALK = [
  [41.6, -135.0, 56.4, -121],
  [40.4, -132.0, 41.6, -124.6],
  [56.4, -132.0, 57.6, -124.6],
  [44.0, -135.8, 53.0, -135.0],
];

// ------------------------------------------------------------ piezas
// Marco de madera de una ventana de la casa (por fuera y por dentro). La
// fachada mira según (nx, nz); a: coordenada a lo largo del muro.
function windowFrame(ctx, w, room) {
  const wb = ctx.wb;
  const { sill, top } = WIN;
  const hw = WIN.w / 2;
  const t = H.t;
  // en coordenadas de la fachada: x a lo largo, z hacia fuera (0 = cara de fuera)
  const rot = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[w.side];
  wb.at(w.x, 0, w.z, rot, () => {
    const fo = { ao: false, sub: 3, room: 'out' };
    // por fuera: jambas, dintel y la tablilla bajo el alféizar
    wb.box('timber', -hw - 0.12, sill - 0.02, 0, -hw, top + 0.02, 0.08, fo);
    wb.box('timber', hw, sill - 0.02, 0, hw + 0.12, top + 0.02, 0.08, fo);
    wb.box('timber', -hw - 0.16, top, 0, hw + 0.16, top + 0.14, 0.1, { ...fo, faces: 'tsewb' });
    // por dentro: el cerco (asoma 1 cm de la cara del muro)
    const fi = { ao: false, sub: 3, room };
    wb.box('wooddark', -hw - 0.1, sill, -t - 0.01, -hw, top, -t + 0.04, { ...fi, faces: 'nwe' });
    wb.box('wooddark', hw, sill, -t - 0.01, hw + 0.1, top, -t + 0.04, { ...fi, faces: 'nwe' });
    wb.box('wooddark', -hw - 0.1, top, -t - 0.01, hw + 0.1, top + 0.1, -t + 0.04, { ...fi, faces: 'nweb' });
  });
}

// ------------------------------------------------------------ la planta alta
// Sus ventanas: la fachada, dónde (a lo largo de ella, en coordenadas del
// mundo: x en las del norte y del sur, z en las del este y del oeste) y sus
// hojas. La de la sala alta, sobre la puerta, más grande y abierta: ahí se
// asoma Henrique.
const UPWINS = [
  { side: 's', at: 44.15, sh: 'closed' },
  { side: 's', at: 50, w: 1.1, h: 1.2, sh: 'open' },
  { side: 's', at: 55.85, sh: 'closed' },
  { side: 'n', at: 44.15, sh: 'ajar' },
  { side: 'n', at: 55.85, sh: 'closed' },
  { side: 'e', at: -99.0, sh: 'closed' },
  { side: 'e', at: -105.6, sh: 'closed' },
  { side: 'w', at: -100.9, sh: 'ajar' },
  { side: 'w', at: -106.1, sh: 'closed' },
];
// El entramado de cada fachada: los pies derechos (a lo largo, como las
// ventanas; nunca delante de una) y los tramos con aspas, las cruces de San
// Andrés de las casas de la tierra del padre.
const FACHWERK = {
  s: { posts: [40.1, 42.8, 45.5, 48.2, 51.8, 54.5, 57.2, 59.9], aspas: [[40.1, 42.8], [57.2, 59.9]] },
  n: { posts: [40.1, 42.8, 45.5, 48.2, 51.8, 54.5, 57.2, 59.9], aspas: [[40.1, 42.8], [48.2, 51.8], [57.2, 59.9]] },
  e: { posts: [-97.1, -100.3, -103.5, -106.7, -109.9], aspas: [[-100.3, -103.5], [-106.7, -109.9]] },
  w: { posts: [-109.9, -107.4, -104.8, -102.2, -99.6, -97.1], aspas: [[-104.8, -102.2]] },
};

// Un muro de fuera de la planta alta, del forjado al alero: cal por fuera y
// por dentro, sus ventanas de verdad (el cerco, el alféizar y las hojas) y,
// por fuera, el entramado (pies derechos, la carrera, la riostra de bajo los
// alféizares y las aspas).
function fachadaAlta(ctx, side, room) {
  const wb = ctx.wb;
  const t = H.t;
  const axis = side === 'n' || side === 's' ? 'x' : 'z';
  const [a0, a1] = axis === 'x' ? [H.x0, H.x1] : [H.z0, H.z1];
  const [t0, t1] = side === 'n' ? [H.z0, H.z0 + t] : side === 's' ? [H.z1 - t, H.z1] : side === 'w' ? [H.x0, H.x0 + t] : [H.x1 - t, H.x1];
  const ws = UPWINS.filter((w) => w.side === side).map((w) => ({ ...w, w: w.w ?? UPW.w, y0: UPW.y0, y1: UPW.y0 + (w.h ?? UPW.h) }));
  holedWall(ctx, { axis, a0, a1, t0, t1, y0: H.g1, y1: H.h, out: side, room, mat: 'plaster', tint: TINT, tintIn: TINT_IN, floorY: FY, holes: ws.map((w) => ({ a0: w.at - w.w / 2, a1: w.at + w.w / 2, y0: w.y0, y1: w.y1 })) });
  for (const w of ws) {
    const fx = axis === 'x' ? w.at : side === 'w' ? H.x0 : H.x1;
    const fz = axis === 'x' ? (side === 'n' ? H.z0 : H.z1) : w.at;
    hueco(ctx, side, fx, fz, w.w, w.y0, w.y1, t, { room, shutters: w.sh });
  }
  // el entramado, en el marco de la fachada (x a lo largo, desde su esquina;
  // z hacia fuera)
  const F = FACHWERK[side];
  const org = { s: [H.x0, H.z1], n: [H.x1, H.z0], e: [H.x1, H.z1], w: [H.x0, H.z0] }[side];
  const loc = (u) => (side === 's' ? u - H.x0 : side === 'n' ? H.x1 - u : side === 'e' ? H.z1 - u : u - H.z0);
  const yb = H.g1 + 0.22,
    yt = H.h - 0.2,
    ym = UPW.y0 - 0.16;
  const T = { ao: false, sub: 3, room: 'out' };
  wb.at(org[0], 0, org[1], ROT[side], () => {
    for (const u of F.posts) {
      const x = loc(u);
      wb.box('timber', x - 0.1, yb, 0, x + 0.1, yt, 0.07, T);
    }
    wb.box('timber', 0, yt, 0, a1 - a0, H.h, 0.08, T);
    wb.box('timber', 0, ym, 0, a1 - a0, ym + 0.16, 0.055, T);
    for (const [ua, ub] of F.aspas) {
      const xa = Math.min(loc(ua), loc(ub)) + 0.1,
        xb = Math.max(loc(ua), loc(ub)) - 0.1;
      const y0 = ym + 0.16;
      const dw = xb - xa,
        dh = yt - y0;
      const len = Math.hypot(dw, dh);
      for (const sg of [1, -1]) {
        wb.push();
        wb.translate((xa + xb) / 2, (y0 + yt) / 2, 0.035);
        wb.rotateZ(Math.atan2(dh, dw) * sg);
        wb.box('timber', -len / 2, -0.07, -0.03, len / 2, 0.07, 0.03, { ...T, sub: 4 });
        wb.pop();
      }
    }
  });
}

// La escalera de la planta alta (ALEMAN.upStair): el rellanito de abajo,
// sobre el hueco de la del sótano; los peldaños (la huella con su vuelo y la
// tabica) y las zancas contra los tabiques; por debajo, un plano inclinado
// paralelo a la escalera (lo que se ve desde la del sótano) y, de cada
// peldaño, una colisión delgada: por debajo pasa la otra.
function escaleraAlta(ctx, room, roomDown) {
  const wb = ctx.wb;
  const col = ctx.col;
  const S = ALEMAN.upStair;
  const { x0, z0, z1, n, rise, run } = S;
  const xe = x0 + n * run;
  const o = { ao: false, room, tint: [0.62, 0.54, 0.46] };
  // el rellanito: su tabla (desde donde acaba el suelo de la sala), su cara
  // de abajo y su canto
  wb.box('planks', 53.4, -0.05, z0, x0, 0.02, z1, { ...o, faces: 't', tint: [0.92, 0.86, 0.8] });
  wb.box('wooddark', 53.4, -0.3, z0, x0, -0.26, z1, { ...o, faces: 'b', room: roomDown });
  wb.box('wooddark', x0 - 0.01, -0.3, z0, x0, 0, z1, { ...o, faces: 'e', room: roomDown });
  col.add(S.foot, -0.3, z0, x0, 0, z1);
  for (let i = 0; i < n; i++) {
    const xa = x0 + i * run,
      xb = xa + run;
    const top = (i + 1) * rise;
    wb.box('wooddark', xa - 0.025, top - 0.035, z0, xb, top, z1, { ...o, faces: 'tw', tint: [0.7, 0.6, 0.5] });
    wb.box('wooddark', xa, top - rise, z0, xa + 0.02, top - 0.035, z1, { ...o, faces: 'w' });
    col.add(xa, top - 0.34, z0, xb + 0.005, top, z1);
  }
  quadN(wb, 'wooddark', [V(x0, -0.3, z0), V(xe, FY - 0.3, z0), V(xe, FY - 0.3, z1), V(x0, -0.3, z1)], V(rise, -run, 0), { ...o, room: roomDown, tint: [0.5, 0.44, 0.38] });
  const ang = Math.atan2(FY, xe - x0),
    len = Math.hypot(FY, xe - x0);
  for (const zz of [z0 + 0.025, z1 - 0.025]) {
    wb.push();
    wb.translate((x0 + xe) / 2, FY / 2 + 0.06, zz);
    wb.rotateZ(ang);
    wb.box('wooddark', -len / 2, -0.17, -0.02, len / 2, 0.17, 0.02, { ao: false, room, tint: [0.55, 0.47, 0.4] });
    wb.pop();
  }
}

// La silueta de un escudo de lágrima (ancho w, alto h; centrado).
function heater(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, h / 2);
  s.lineTo(w / 2, h / 2);
  s.lineTo(w / 2, h * 0.08);
  s.quadraticCurveTo(w / 2, -h * 0.28, 0, -h / 2);
  s.quadraticCurveTo(-w / 2, -h * 0.28, -w / 2, h * 0.08);
  s.lineTo(-w / 2, h / 2);
  return s;
}
// El escudo del padre de Henrique, colgado (cara hacia +z; su centro en x,
// y, z): el águila en campo de oro, el canto de hierro y los clavos.
function escudo(ctx, x, y, z, room) {
  const wb = ctx.wb;
  const w = 0.5,
    h = 0.58;
  const face = new THREE.ShapeGeometry(heater(w, h), 6);
  const uv = face.attributes.uv,
    pos = face.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  const M = (dz) => new THREE.Matrix4().makeTranslation(x, y, z + dz);
  wb.geometry('iron', new THREE.ShapeGeometry(heater(w + 0.045, h + 0.05), 6), M(-0.012), { ao: false, room, tint: [0.7, 0.68, 0.66] });
  wb.geometry('escudoAguila', face, M(0), { ao: false, room });
  for (const [px, py] of [
    [-0.19, 0.25],
    [0.19, 0.25],
    [0, 0.265],
    [-0.215, 0.03],
    [0.215, 0.03],
  ])
    wb.box('iron', x + px - 0.012, y + py - 0.012, z, x + px + 0.012, y + py + 0.012, z + 0.015, { ao: false, room });
}

// La planta alta (ver el comentario de arriba): sus muros de fuera, el
// forjado con sus vigas, el techo (encima, el desván, cerrado), los tabiques,
// los cañones de las chimeneas, la escalera y la barandilla de su hueco, y lo
// que hay en cada pieza.
function sobrado(ctx) {
  const wb = ctx.wb;
  const col = ctx.col;
  const up = 'alemanAlta',
    down = 'aleman';
  const I = { x0: H.x0 + H.t, z0: H.z0 + H.t, x1: H.x1 - H.t, z1: H.z1 - H.t };
  const S = ALEMAN.upStair;
  for (const side of ['s', 'n', 'e', 'w']) fachadaAlta(ctx, side, up);
  forjado(ctx, I, FY, [S.hole], up, down, { th: FY - H.g1, tint: [0.84, 0.78, 0.7] });
  const xs = cadaViga(I.x0, I.x1, 1.75);
  vigas(ctx, I, H.g1, 'z', xs, [S.hole], down);
  wb.box('wooddark', I.x0, UPC, I.z0, I.x1, UPC + 0.05, I.z1, { faces: 'b', room: up, ao: false, tint: [0.6, 0.54, 0.48] });
  for (const x of xs) wb.box('timber', x - 0.1, UPC - 0.22, I.z0, x + 0.1, UPC, I.z1, { ao: false, room: up, faces: 'nsewb' });
  col.add(I.x0, UPC, I.z0, I.x1, H.h + 0.2, I.z1).cam = true;
  col.addCam(I.x0, UPC - 0.27, I.z0, I.x1, UPC, I.z1);
  // los tabiques: sobre los de abajo (el del rellano de la escalera, sobre
  // el del cuartucho, con la puerta a la alcoba del viejo)
  const tb = (x0, z0, x1, z1, doors) => tabique(ctx, { x0, z0, x1, z1 }, FY, UPC, up, { doors: doors.map(([at, w]) => ({ at, w, h: 2.2 })), tint: TINT_IN });
  tb(46.8, I.z0, 47.2, I.z1, [
    [-99.5, 1.0],
    [-107.0, 1.0],
  ]);
  tb(52.8, I.z0, 53.2, I.z1, [
    [-99.0, 1.0],
    [-107.0, 1.0],
  ]);
  tb(I.x0, -103.2, 46.8, -102.8, [[43.6, 1.0]]);
  tb(53.2, -103.4, I.x1, -103.0, [[59.05, 0.9]]);
  // los cañones de las chimeneas (el del hogar de la sala, el de la cocina y
  // el de la fragua del taller) y, por encima del tejado, las dos que le
  // faltaban a la casa
  const breast = (x0, z0, x1, z1, faces) => {
    wb.box('wallstone', x0, FY, z0, x1, UPC, z1, { faces, sub: 2, aoH: 1.2, baseY: FY, room: up, tint: [0.8, 0.76, 0.7] });
    col.add(x0, FY, z0, x1, UPC, z1);
  };
  breast(49.4, I.z0, 50.6, -108.65, 'sew');
  breast(59.1, -108.65, I.x1, -107.75, 'nsw');
  breast(I.x0, -102.8, 41.3, -102.1, 'se');
  const ridge = H.h + ((H.z1 - H.z0) / 2) * 0.55,
    zc = (H.z0 + H.z1) / 2;
  for (const [cx, cz] of [
    [59.37, -108.2],
    [40.83, -102.45],
  ]) {
    const top = ridge - Math.abs(cz - zc) * 0.55 + 0.95;
    wb.box('wallstone', cx - 0.28, H.h, cz - 0.28, cx + 0.28, top, cz + 0.28, { ao: false, sub: 2, room: 'out' });
    wb.box('wallstone', cx - 0.36, top, cz - 0.36, cx + 0.36, top + 0.16, cz + 0.36, { ao: false, room: 'out' });
    ctx.fires.push({ x: cx, y: top + 0.3, z: cz, s: 0.6, smoke: true, light: false, embers: false, glow: false });
  }
  escaleraAlta(ctx, up, down);
  railing(ctx, S.hole[0], S.hole[3] + 0.05, S.hole[2] + 0.05, S.hole[3] + 0.05, FY, up);
  railing(ctx, S.hole[0] - 0.05, S.hole[1], S.hole[0] - 0.05, S.hole[3] + 0.05, FY, up);

  wb.setRoom(up);
  // --- la escalera: un farol en el muro, sobre el rellano de arriba, y lo
  // que entra de la sala por su puerta
  P.lantern(ctx, I.x1, FY + 2.25, -102.0, -Math.PI / 2, true, { room: up });
  ctx.lights.push({ x: 54.7, y: 1.9, z: -102.0, r: 1, g: 0.55, b: 0.22, radius: 3.6, intensity: 0.5, room: up });
  ctx.lights.push({ x: 56.6, y: 1.9, z: -102.0, r: 1, g: 0.55, b: 0.22, radius: 3.0, intensity: 0.4, room: down });
  // --- la sala alta: junto a la ventana, el refugio de Henrique (el jergón
  // con su manta, las velas en el taburete, el cántaro y el pan); la mesa
  // larga de las fiestas con sus bancos, el aparador, el arcón y los
  // estandartes del águila a los lados de la chimenea
  wb.box('straw', 47.5, FY, -98.8, 49.1, FY + 0.16, -97.55, { faces: 'tnsew', ao: false, room: up, tint: [0.8, 0.7, 0.5] });
  wb.box('clothDark', 47.7, FY + 0.16, -98.7, 48.8, FY + 0.2, -97.7, { faces: 'tnsew', ao: false, room: up, tint: [0.55, 0.45, 0.4] });
  col.add(47.5, FY, -98.8, 49.1, FY + 0.2, -97.55);
  P.stool(ctx, 51.1, FY, -97.9, { room: up });
  P.candles(ctx, 51.1, FY + 0.47, -97.9, 2, 7300, { room: up, radius: 4.5, intensity: 0.95, spread: 0.06, scale: 0.7 });
  P.jar(ctx, 49.25, FY, -99.0, 0.6);
  wb.box('straw', 48.9, FY + 0.2, -98.45, 49.15, FY + 0.28, -98.25, { ao: false, room: up, tint: [0.9, 0.6, 0.32] });
  P.table(ctx, 50, FY, -104.4, 1.0, 3.0, 0);
  P.bench(ctx, 49.1, FY, -104.4, 2.6, Math.PI / 2);
  P.bench(ctx, 50.9, FY, -104.4, 2.6, Math.PI / 2);
  P.candles(ctx, 50.0, FY + 0.8, -104.0, 3, 7301, { room: up, radius: 4.5, intensity: 0.7, spread: 0.2 });
  P.shelf(ctx, 47.42, FY, -102.5, Math.PI / 2, 1.6);
  chest(ctx, 52.2, FY, -108.6, Math.PI / 2, up, 1.0);
  P.banner(ctx, 48.4, FY + 2.75, I.z0 + 0.06, 0, 'bannerEagle', 0.8, 1.6);
  P.banner(ctx, 51.6, FY + 2.75, I.z0 + 0.06, 0, 'bannerEagle', 0.8, 1.6);
  P.hangingLamp(ctx, 50, UPC - 0.22, -101.0, { room: up, radius: 6, intensity: 0.6, len: 0.6 });

  // --- la cuchillería: el banco con las hojas a medio acabar, la tabla con
  // las que ya tienen mango y, junto al hueco de la escalera, sacos y cajas
  P.counter(ctx, 57.6, FY, -97.75, 0, 2.0, { room: up });
  for (let i = 0; i < 5; i++) {
    const x = 56.85 + i * 0.32;
    wb.box('plate', x - 0.02, FY + 1.08, -97.95, x + 0.02, FY + 1.095, -97.55, { ao: false, room: up });
    wb.box('wooddark', x - 0.022, FY + 1.08, -97.55, x + 0.022, FY + 1.11, -97.42, { ao: false, room: up });
  }
  wb.box('planks', 53.5, FY + 1.0, I.z1 - 0.05, 55.25, FY + 1.85, I.z1, { ao: false, room: up, tint: [0.75, 0.68, 0.6] });
  for (let i = 0; i < 6; i++) {
    const x = 53.72 + i * 0.27;
    wb.box('wooddark', x - 0.025, FY + 1.58, I.z1 - 0.09, x + 0.025, FY + 1.76, I.z1 - 0.05, { ao: false, room: up });
    wb.box('plate', x - 0.018, FY + 1.12, I.z1 - 0.085, x + 0.018, FY + 1.58, I.z1 - 0.07, { ao: false, room: up });
  }
  P.crate(ctx, 54.0, FY, -97.95, 0.55, 0.2);
  P.sacks(ctx, 53.75, FY, -102.3, 3, 7302);
  P.crate(ctx, 53.85, FY, -101.45, 0.45, -0.3);
  P.candles(ctx, 57.0, FY + 1.08, -97.8, 2, 7303, { room: up, radius: 4.5, intensity: 0.7, spread: 0.1 });

  // --- la alcoba del viejo Heinrich: la cama hecha, el arca del cruzado con
  // su yelmo encima, la capa blanca de la cruzada colgada de un clavo y un
  // altarcillo bajo la ventana, con su crucifijo y sus velas (las enciende
  // Henrique cada noche)
  P.bed(ctx, 56.4, FY, -109.05, 0);
  chest(ctx, 58.15, FY, -109.2, 0, up, 0.9);
  wb.cylinder('iron', 58.15, FY + 0.58, -109.2, 0.03, 0.13, 0.2, 8, { ao: false, capTop: true, room: up });
  wb.box('iron', 58.14, FY + 0.6, -108.99, 58.16, FY + 0.74, -108.96, { ao: false, room: up });
  wb.box('clothWhite', 55.95, FY + 0.55, -103.47, 57.05, FY + 2.0, -103.4, { faces: 'nsewb', ao: false, room: up, tint: [0.82, 0.78, 0.7] });
  wb.box('clothRed', 56.43, FY + 0.95, -103.49, 56.57, FY + 1.75, -103.47, { faces: 'n', ao: false, room: up });
  wb.box('clothRed', 56.15, FY + 1.42, -103.49, 56.85, FY + 1.56, -103.47, { faces: 'n', ao: false, room: up });
  wb.box('iron', 56.47, FY + 1.98, -103.52, 56.53, FY + 2.04, -103.4, { ao: false, room: up });
  P.table(ctx, 59.25, FY, -106.9, 0.6, 0.9, 0);
  wb.box('wooddark', I.x1 - 0.04, FY + 1.3, -106.93, I.x1, FY + 1.95, -106.87, { ao: false, room: up });
  wb.box('wooddark', I.x1 - 0.04, FY + 1.72, -107.12, I.x1, FY + 1.78, -106.68, { ao: false, room: up });
  P.candles(ctx, 59.25, FY + 0.8, -106.9, 3, 7304, { room: up, radius: 4.0, intensity: 0.75, spread: 0.12, scale: 0.7 });
  P.stool(ctx, 54.6, FY, -108.6, { room: up });

  // --- el cuarto de los oficiales: dos camas, sus arcas, los mandiles en
  // la pared y la jofaina (se fueron a la muralla y no han vuelto)
  P.bed(ctx, 40.95, FY, -99.6, Math.PI / 2);
  P.bed(ctx, 46.2, FY, -101.45, Math.PI / 2);
  chest(ctx, 42.2, FY, -97.8, 0, up, 0.8);
  chest(ctx, 45.4, FY, -97.8, 0, up, 0.8);
  for (const x of [42.2, 42.9]) wb.box('leather', x - 0.24, FY + 0.95, -102.8, x + 0.24, FY + 1.85, -102.75, { faces: 'sewb', ao: false, room: up, tint: [0.6, 0.5, 0.42] });
  P.stool(ctx, 44.0, FY, -101.6, { room: up });
  wb.cylinder('bronze', 44.0, FY + 0.47, -101.6, 0.17, 0.12, 0.09, 8, { ao: false, capBot: true, room: up });

  // --- el granero: sacos de grano, toneles, cestos, leña, tablas sueltas
  // contra el tabique y, de las vigas, jamones y ristras de cebollas
  P.sacks(ctx, 41.5, FY, -109.0, 4, 7305);
  P.sacks(ctx, 43.2, FY, -109.1, 3, 7306);
  P.barrel(ctx, 45.9, FY, -109.0, {});
  P.barrel(ctx, 46.2, FY, -108.2, {});
  P.basket(ctx, 44.4, FY, -108.9, {});
  P.firewood(ctx, 41.1, FY, -105.0, Math.PI / 2, 3);
  for (let i = 0; i < 3; i++) {
    wb.push();
    wb.translate(44.6 + i * 0.32, FY, -103.3);
    wb.rotateX(-0.22 - i * 0.04);
    wb.box('planks', -0.13, 0, -0.03, 0.13, 2.1, 0.0, { ao: false, room: up, tint: [0.86, 0.8, 0.72] });
    wb.pop();
  }
  for (const [x, z, k] of [
    [42.98, -106.0, 0],
    [42.98, -107.0, 1],
    [44.74, -105.4, 2],
    [44.74, -106.6, 3],
  ]) {
    wb.box('burlap', x - 0.006, UPC - 0.22 - 0.35, z - 0.006, x + 0.006, UPC - 0.22, z + 0.006, { ao: false, room: up });
    if (k % 2) wb.box('leather', x - 0.09, UPC - 0.95, z - 0.07, x + 0.09, UPC - 0.57, z + 0.07, { ao: false, room: up, tint: [0.7, 0.42, 0.36] });
    else for (let j = 0; j < 4; j++) P.ellipsoid(ctx, 'bone', x + (j % 2 ? 0.04 : -0.04), UPC - 0.66 - j * 0.1, z, 0.05, 0.055, 0.05, [0.92, 0.82, 0.62]);
  }
  // la luz de la luna por las ventanas entornadas
  ctx.lights.push({ x: 44.15, y: FY + 1.3, z: I.z0 + 0.8, r: 0.5, g: 0.6, b: 0.75, radius: 4.5, intensity: 0.45, room: up });
  ctx.lights.push({ x: I.x0 + 0.8, y: FY + 1.3, z: -100.9, r: 0.5, g: 0.6, b: 0.75, radius: 4.5, intensity: 0.4, room: up });
  wb.setRoom(null);
}

// Muro de cueva: una cadena de puntos en el plano, en el sentido de las agujas
// del reloj visto en el mapa (con el norte arriba: de noroeste a noreste,
// sureste y suroeste; así las caras miran hacia dentro), levantada de y0 a
// y1, con los vértices removidos hacia fuera (nunca hacia dentro de lo que se
// pisa) y la última fila doblada hacia dentro, como el arranque de la bóveda.
// closed: cierra del último punto al primero.
function caveWall(ctx, pts, y0, y1, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(o.seed ?? 1);
  const step = o.step ?? 0.9;
  const closed = o.closed !== false;
  // puntos del perímetro (cada lado partido en tramos de ~step)
  const per = [];
  const nSeg = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < nSeg; i++) {
    const [ax, az] = pts[i],
      [bx, bz] = pts[(i + 1) % pts.length];
    const L = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) per.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n, i]);
  }
  if (!closed) per.push([pts[pts.length - 1][0], pts[pts.length - 1][1], nSeg]);
  // normal hacia dentro de cada punto (media de los lados que lo tocan)
  const N = per.map((p, k) => {
    const q0 = closed ? per[(k - 1 + per.length) % per.length] : per[Math.max(0, k - 1)],
      q1 = closed ? per[(k + 1) % per.length] : per[Math.min(per.length - 1, k + 1)];
    const dx = q1[0] - q0[0],
      dz = q1[1] - q0[1];
    const l = Math.hypot(dx, dz) || 1;
    return [-dz / l, dx / l];
  });
  const rows = Math.max(2, Math.ceil((y1 - y0) / (o.rowH ?? 0.85)));
  const grid = [];
  for (let j = 0; j <= rows; j++) {
    const row = [];
    const v = j / rows;
    for (let k = 0; k < per.length; k++) {
      const [px, pz] = per[k];
      const [nx, nz] = N[k];
      // hacia fuera (con algo de vaivén) y, arriba, hacia dentro
      let out = (o.out ?? 0.35) * (0.4 + 0.6 * rng.next());
      if (j === rows) out -= o.lean ?? 0.6;
      else if (j === rows - 1) out -= (o.lean ?? 0.6) * 0.35;
      const y = y0 + (y1 - y0) * v + (j > 0 && j < rows ? rng.range(-0.18, 0.18) : 0);
      row.push(V(px - nx * out, y, pz - nz * out));
    }
    grid.push(row);
  }
  const opt = { ao: false, sub: 3, room: o.room, tint: o.tint, baseY: y0 };
  const nq = closed ? per.length : per.length - 1;
  for (let j = 0; j < rows; j++)
    for (let k = 0; k < nq; k++) {
      const k2 = (k + 1) % per.length;
      wb.quad(o.mat ?? 'rock', grid[j][k], grid[j][k2], grid[j + 1][k2], grid[j + 1][k], opt);
    }
  return grid[rows];
}

// Techo de cueva: una malla de alturas sobre el rectángulo, con bultos.
function caveCeil(ctx, x0, z0, x1, z1, y, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(o.seed ?? 2);
  const s = o.step ?? 1.2;
  const nx = Math.max(1, Math.round((x1 - x0) / s)),
    nz = Math.max(1, Math.round((z1 - z0) / s));
  const h = [];
  for (let j = 0; j <= nz; j++) {
    const r = [];
    for (let i = 0; i <= nx; i++) r.push(y + rng.range(0, o.amp ?? 0.5) - (i === 0 || j === 0 || i === nx || j === nz ? 0.3 : 0));
    h.push(r);
  }
  const P = (i, j) => V(x0 + ((x1 - x0) * i) / nx, h[j][i], z0 + ((z1 - z0) * j) / nz);
  const opt = { ao: false, sub: 3, room: o.room, tint: o.tint };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) wb.quad(o.mat ?? 'rock', P(i, j), P(i, j + 1), P(i + 1, j + 1), P(i + 1, j), opt);
}

// Charco de pus en el suelo: una mancha de borde muy irregular (con lóbulos
// y salpicaduras alrededor), algo levantada en el centro, con un cerco
// oscuro donde se seca y alguna burbuja.
function pusPool(ctx, x, y, z, r, seed, room) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  const n = 18;
  const rim = [];
  // (lóbulos: dos ondas de distinta frecuencia y algo de azar)
  const p1 = rng.range(0, 6),
    p2 = rng.range(0, 6);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    rim.push(r * (0.78 + 0.18 * Math.sin(a * 2 + p1) + 0.12 * Math.sin(a * 5 + p2) + rng.range(-0.08, 0.08)));
  }
  const ring = (k, f, h) => {
    const a = (k / n) * Math.PI * 2;
    return V(x + Math.cos(a) * rim[k % n] * f, y + h, z + Math.sin(a) * rim[k % n] * f);
  };
  const c = V(x, y + 0.05, z);
  for (let k = 0; k < n; k++) {
    // el centro, brillante; el cerco, oscuro y seco
    wb.tri('pusStatic', c, ring(k + 1, 0.72, 0.03), ring(k, 0.72, 0.03), { ao: false, grime: false, room });
    wb.quad('pusStatic', ring(k, 0.72, 0.03), ring(k + 1, 0.72, 0.03), ring(k + 1, 1, 0.012), ring(k, 1, 0.012), { ao: false, grime: false, room, tint: [0.62, 0.55, 0.4] });
  }
  // salpicaduras y gotas alrededor
  for (let i = 0; i < 4 + Math.round(r * 3); i++) {
    const a = rng.range(0, Math.PI * 2),
      d = r * rng.range(1.05, 1.5),
      s = rng.range(0.05, 0.14) * (0.6 + r * 0.4);
    const px = x + Math.cos(a) * d,
      pz = z + Math.sin(a) * d;
    wb.tri('pusStatic', V(px + s, y + 0.013, pz), V(px - s * 0.6, y + 0.013, pz - s * 0.8), V(px - s * 0.6, y + 0.013, pz + s * 0.8), { ao: false, grime: false, room, tint: [0.8, 0.74, 0.5] });
  }
  // burbujas
  for (let i = 0; i < Math.round(r * 2.5); i++) {
    const a = rng.range(0, Math.PI * 2),
      d = r * rng.range(0, 0.55),
      s = rng.range(0.04, 0.08);
    wb.box('pusStatic', x + Math.cos(a) * d - s, y + 0.03, z + Math.sin(a) * d - s, x + Math.cos(a) * d + s, y + 0.03 + s * 1.2, z + Math.sin(a) * d + s, { ao: false, grime: false, room, faces: 'tnsew' });
  }
}

// Las alminhas: retablillo de las ánimas en el muro, con su tejadillo, las
// ánimas entre llamas pintadas y velas al pie. (x, z) en la cara del muro;
// dir: hacia dónde mira.
function alminhas(ctx, x, z, dir) {
  const wb = ctx.wb;
  const rot = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[dir];
  wb.at(x, 0, z, rot, () => {
    wb.box('ashlar', -0.55, 1.05, 0, 0.55, 2.35, 0.32, { ao: false, sub: 3, faces: 'tsewb' });
    // el hueco con la tabla pintada: el purgatorio (llamas y figuras)
    wb.box('black', -0.42, 1.2, 0.3, 0.42, 2.1, 0.325, { ao: false, grime: false, faces: 's' });
    for (const [px, py, s] of [
      [-0.28, 1.32, 0.12],
      [-0.08, 1.3, 0.16],
      [0.14, 1.33, 0.13],
      [0.3, 1.31, 0.1],
    ])
      wb.box('ember', px - s / 2, py, 0.326, px + s / 2, py + s * 1.6, 0.33, { ao: false, grime: false, faces: 's' });
    for (const px of [-0.22, 0.02, 0.24]) {
      wb.box('skinPale', px - 0.05, 1.38, 0.331, px + 0.05, 1.62, 0.336, { ao: false, faces: 's' });
      wb.box('skinPale', px - 0.035, 1.64, 0.331, px + 0.035, 1.71, 0.336, { ao: false, faces: 's' });
    }
    // la Virgen arriba, con su manto azul
    wb.box('clothBlue', -0.09, 1.74, 0.331, 0.09, 2.02, 0.336, { ao: false, faces: 's' });
    wb.box('skinPale', -0.04, 2.02, 0.331, 0.04, 2.08, 0.336, { ao: false, faces: 's' });
    // tejadillo de teja y repisa de las velas
    wb.box('roof', -0.7, 2.35, -0.02, 0.7, 2.45, 0.5, { ao: false, faces: 'tnsewb' });
    wb.box('ashlar', -0.6, 0.98, 0, 0.6, 1.05, 0.45, { ao: false, faces: 'tnsewb' });
  });
  const [nx, nz] = NRM[dir];
  P.candles(ctx, x + nx * 0.32, 1.05, z + nz * 0.32, 4, 7301, { radius: 2.6, intensity: 0.6, spread: 0.2, scale: 0.6 });
}

// ------------------------------------------------------------ el callejón
export function buildPostigoAlley(ctx, S, U, L) {
  const wb = ctx.wb;
  const col = ctx.col;
  const A = ALEMAN;
  const rng = new RNG(7070);
  const W = (x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);

  // --- lo transitable: la boca (desde el patio), el callejón, el recodo, la
  // plazuela, el pasadizo del oeste y el patio de la leña
  W(44, -73, 47.6, -56.4);
  W(40.6, -77, 47.6, -73);
  W(40.6, -86, 43.8, -77);
  W(A.plaza.x0, A.plaza.z0, A.plaza.x1, A.plaza.z1);
  W(A.passage.x0, A.passage.z0, A.passage.x1, A.passage.z1);
  W(60, -100, 62, -97);
  W(A.yard.x0, A.yard.z0, A.yard.x1, A.yard.z1);
  floor(ctx, 44, -73, 47.6, -59.5, 'cobble');
  floor(ctx, 40.6, -77, 47.6, -73, 'cobble');
  floor(ctx, 40.6, -86, 43.8, -77, 'cobble');
  floor(ctx, A.plaza.x0, A.plaza.z0, A.plaza.x1, A.plaza.z1, 'cobble');
  floor(ctx, 44.5, -96.4, 55.5, -88.6, 'flag', 0.012);
  floor(ctx, A.passage.x0, A.passage.z0, A.passage.x1, A.passage.z1, 'dirt');
  floor(ctx, 60, -100, 62, -97, 'dirt');
  floor(ctx, A.yard.x0, A.yard.z0, A.yard.x1, A.yard.z1, 'dirt');

  // --- el arco de la boca, en la tapia del patio
  const ar = A.arch;
  stoneWall(ctx, 40, ar.z0, ar.x0, ar.z1, 5, { cap: false });
  stoneWall(ctx, ar.x1, ar.z0, 48.5, ar.z1, 5, { cap: false });
  const ac = (ar.x0 + ar.x1) / 2,
    aw = ar.x1 - ar.x0;
  archRing(ctx, { axis: 'x', c: ac, w: aw, y0: 2.7, rise: aw / 2, ring: 0.34, t0: ar.z0, t1: ar.z1, top: 5, clip: [ar.x0, ar.x1], mat: 'ashlar', spMat: 'wallstone', tint: [0.72, 0.7, 0.66], spTint: [0.8, 0.78, 0.74] });
  wb.box('wallstone', ar.x0, 4.99, ar.z0, ar.x1, 5, ar.z1, { faces: 't', ao: false });
  wb.box('ashlar', 39.92, 5, ar.z0 - 0.08, 48.58, 5.2, ar.z1 + 0.08, { ao: false, sub: 3 });
  col.add(ar.x0, 3.9, ar.z0, ar.x1, 5.2, ar.z1).cam = true;
  // farol y rótulo bajo el arco
  P.lantern(ctx, ar.x1, 2.6, ar.z1 + 0.05, Math.PI / 2, true);
  ctx.dynLights.push({ x: ac, y: 2.4, z: ar.z1 + 0.8, intensity: 1.4, range: 6, color: 0xffa050 });

  // --- casas a los lados del callejón (de adorno)
  const side = (x0, z0, x1, z1, o) => house(ctx, { x0, z0, x1, z1, jetty: 0, ...o });
  side(37, -73, 44, -62, { front: 'e', seed: 7101, h: 7.2, style: 'timber' });
  side(37, -86, 40.6, -73, { front: 'e', seed: 7102, h: 6.4, style: 'plaster', burned: true });
  side(47.6, -77, 62, -62, { front: 'w', seed: 7103, h: 7.8, style: 'stone', lit: true, litChance: 0.25 });
  side(43.8, -86, 62, -77, { front: 'w', seed: 7104, h: 6.8, style: 'timber', boards: true });
  // ropa tendida y un rótulo de tienda cerrada
  P.laundry(ctx, 44.05, -66.5, 47.55, -66.5, 4.6, 7105);
  P.sign(ctx, 44.0, 2.9, -69.5, Math.PI / 2, 0);
  P.lantern(ctx, 47.6, 2.75, -71.2, -Math.PI / 2, false);

  // --- el recodo: las alminhas, el carro volcado (con tablones) y dos
  // mastines comiendo
  alminhas(ctx, 45.6, -77, 's');
  P.cart(ctx, 41.9, 0, -74.6, 1.35, { tipped: true });
  for (let i = 0; i < 3; i++) {
    wb.push();
    wb.translate(42.9 + i * 0.12, 0.04 + i * 0.07, -75.9 + i * 0.05);
    wb.rotateY(0.25 + i * 0.12);
    wb.box('planks', -0.95, 0, -0.13, 0.95, 0.05, 0.13, { ao: false, faces: 'tnsew' });
    wb.pop();
  }
  bakeCorpse(wb, 45.6, 0, -75.3, 2.4, 'back', 'villager', 7);
  P.decal(ctx, 45.6, 0.02, -75.3, 2.2);
  for (const [x, z, s] of [
    [44.6, -79.0, 0.6],
    [43.4, -81.2, 0.8],
    [42.4, -83.6, 0.7],
    [41.6, -85.4, 0.6],
  ])
    P.decal(ctx, x, 0.02, z, s);
  P.rubble(ctx, 46.8, 0, -73.6, 6, 7106, 0.6, { scale: 0.8 });
  P.barrel(ctx, 40.95, 0, -84.4, {});
  P.crate(ctx, 43.2, 0, -63.4, 0.7, 0.4);
  ctx.crows.push({ x: 45.6, y: 0, z: -75.3, r: 1.2, n: 2 });
  ctx.rats.push({ x: 41.2, y: 0, z: -78.4, n: 2 });

  // --- la plazuela: un crucero de piedra, un abrevadero y los restos de la
  // noche (las marcas de las garras en la puerta, sangre)
  P.cruzeiro(ctx, 41.2, 0, -89.0, 0.4);
  P.trough(ctx, 60.6, 0, -88.8, Math.PI / 2, {});
  P.stake(ctx, 38.4, 0, -94.6, 0.6, 7107);
  P.dropped(ctx, 57.2, 0, -91.4, 2.1, 'sword');
  P.dropped(ctx, 45.2, 0, -93.6, 0.4, 'shield');
  bakeCorpse(wb, 56.4, 0, -94.4, -0.7, 'face', 'villager', 3);
  P.decal(ctx, 56.4, 0.02, -94.4, 2);
  for (const [x, z] of [
    [49.2, -96.6],
    [51.0, -96.4],
    [50.2, -95.6],
  ])
    P.decal(ctx, x, 0.02, z, 0.9);
  P.lantern(ctx, 47.4, 2.75, H.z1, 0, true);
  P.lantern(ctx, 52.6, 2.75, H.z1, 0, true);
  ctx.dynLights.push({ x: 50, y: 2.4, z: H.z1 + 1.4, intensity: 2.0, range: 7, color: 0xffa050 });
  ctx.lights.push({ x: 50, y: 0.6, z: H.z1 + 0.8, r: 1, g: 0.55, b: 0.22, radius: 3, intensity: 0.8 });
  P.firewood(ctx, 38.2, 0, -87.4, 0, 3);
  P.weeds(ctx, 61.4, 0, -96.4, 5, 7108);
  P.weeds(ctx, 37.6, 0, -96.2, 4, 7109);
  ctx.crows.push({ x: 56.4, y: 0, z: -94.4, r: 1.3, n: 3 });

  // --- el pasadizo del oeste (cerrado al fondo) y el patio de la leña
  stoneWall(ctx, A.passage.x0, A.passage.z0, A.passage.x1, A.passage.z0 + 0.4, 3.6);
  P.barrel(ctx, 38.2, 0, -108.6, {});
  P.crate(ctx, 39.3, 0, -107.4, 0.8, 0.3);
  P.hay(ctx, 38.4, 0, -104.8, Math.PI / 2);
  // (5 cm por delante de la fachada de la casa de detrás: si no, las dos caras
  // se pisaban y parpadeaban)
  stoneWall(ctx, A.yard.x0, A.yard.z0 - 0.4, A.yard.x1, A.yard.z0 + 0.05, 3.4);
  // el leñero: un tejadillo sobre la leña, contra la tapia del norte
  for (const x of [61.4, 65.2, 69.0]) wb.box('timber', x - 0.1, 0, -108.1, x + 0.1, 2.3, -107.9, { ao: false });
  wb.box('timber', 61.2, 2.3, -108.2, 69.2, 2.45, -107.8, { ao: false, faces: 'tnsewb' });
  wb.push();
  wb.translate(65.2, 2.55, -108.4);
  wb.rotateX(-0.32);
  wb.box('roof', -4.2, -0.06, -0.9, 4.2, 0.06, 0.9, { ao: false, faces: 'tnsewb' });
  wb.pop();
  col.add(61.2, 0, -108.6, 69.2, 2.4, -107.6);
  P.firewood(ctx, 63.2, 0, -108.3, 0, 4);
  P.firewood(ctx, 67.2, 0, -108.3, 0, 3);
  wb.cylinder('wooddark', 66.4, 0, -103.4, 0.42, 0.45, 0.55, 9, { ao: false, capTop: true });
  wb.box('iron', 66.3, 0.55, -103.5, 66.36, 0.95, -103.42, { ao: false });
  col.add(65.95, 0, -103.85, 66.85, 0.6, -102.95);
  P.cart(ctx, 69.6, 0, -102.2, 1.6, {});
  P.barrel(ctx, 61.0, 0, -101.0, {});

  // ------------------------------------------------------------ la casa
  const room = 'aleman';
  const D = A.door;
  const ST = A.stair;
  const US = A.upStair;
  const holes = [[ST.x0, ST.z0, ST.landing[0], ST.z1]];
  ctx.floorHoles.push(ST.hole);
  // el rellano de arriba, donde la losa tiene el hueco (de x 58,6 a 59)
  col.add(ST.landing[0] - 0.05, -0.6, ST.z0, ST.hole[2] + 0.05, 0, ST.z1);
  // (la casa pone la planta baja y el tejado; la planta alta, con su
  // forjado, sus muros, sus ventanas y su techo, la pone sobrado())
  house(ctx, {
    x0: H.x0,
    z0: H.z0,
    x1: H.x1,
    z1: H.z1,
    front: 's',
    seed: 7171,
    hollow: true,
    collide: false,
    ceil: false,
    h: H.h,
    g1: H.g1,
    style: 'timber',
    tint: TINT,
    room,
    jetty: 0,
    sides: [],
    upperFaces: '',
    lowerWindows: false,
    chimney: true,
    chimneyAt: [50, -109.15],
    chimneySize: 0.5,
    smoke: true,
    floorTint: [0.92, 0.86, 0.8],
    doors: [{ side: 's', x: D.x, w: D.w, h: D.h }, ...A.windows.map((w) => ({ side: w.side, x: w.side === 's' ? w.x : undefined, z: w.side === 's' ? undefined : w.z, w: WIN.w, h: WIN.top, sill: WIN.sill, frame: false }))],
    floorHoles: holes,
    partMat: 'plaster',
    walls: [
      // taller y alcoba | sala (del taller a la sala, un vano ancho: la sala
      // y el taller son casi una sola pieza)
      { x0: 46.8, z0: H.z0 + H.t, x1: 47.2, z1: H.z1 - H.t, doors: [{ at: -100.6, w: 2.2, h: 2.6 }, { at: -106.6, w: 1.1 }] },
      // sala | despensa, escalera y cocina (en medio, la puerta de la
      // escalera de arriba)
      { x0: 52.8, z0: H.z0 + H.t, x1: 53.2, z1: H.z1 - H.t, doors: [{ at: -99.1, w: 1.8, h: 2.5 }, { at: US.door.z, w: US.door.w, h: US.door.h }, { at: -106.6, w: 1.1 }] },
      // taller | alcoba
      { x0: H.x0 + H.t, z0: -103.2, x1: 46.8, z1: -102.8, doors: [{ at: 43.6, w: 1.1 }] },
      // cocina | escalera del sótano
      { x0: 53.2, z0: ST.z0 - 0.4, x1: H.x1 - H.t, z1: ST.z0 },
      // el cuartucho de la escalera, con su puerta (cerrada con llave)
      { x0: 53.2, z0: ST.z1, x1: H.x1 - H.t, z1: ST.z1 + 0.4, doors: [{ at: ST.door.x, w: ST.door.w, h: ST.door.h }] },
    ],
  });
  for (const w of A.windows) windowFrame(ctx, w, room);
  // la puerta: jambas de sillería con su dintel (las pone la casa) y un
  // escalón; un herraje con la cruz
  wb.box('ashlar', D.x - 1.2, -0.02, H.z1, D.x + 1.2, 0.1, H.z1 + 0.5, { faces: 'tnsew', ao: false, sub: 3 });
  // las marcas de las garras en la fachada, junto a la puerta
  P.decal(ctx, D.x - 1.05, 1.4, H.z1 + 0.012, 0.8, 'splat', 0.4, { wall: 'z' });
  P.decal(ctx, D.x + 1.1, 1.0, H.z1 + 0.012, 0.6, 'splat', 2.2, { wall: 'z' });
  // la planta alta, y la luz de las velas de Henrique, que sale por su
  // ventana a la plazuela
  sobrado(ctx);
  const UW = A.upWin;
  ctx.lights.push({ x: UW.x, y: UW.y0 + 0.5, z: H.z1 + 0.6, r: 1, g: 0.5, b: 0.2, radius: 3.4, intensity: 0.8 });

  // ------------------------------------------------------------ dentro
  wb.setRoom(room);
  // --- la sala: el hogar, con la espada del padre clavada en la repisa y su
  // escudo encima; los estandartes del águila negra del Imperio, la mesa
  // larga y los bancos
  P.hearth(ctx, 50, 0, H.z0 + H.t, 's', { room, w: 2.2, pot: true, fire: 0.5, radius: 7, ceil: H.g1 });
  {
    // la repisa: una viga de roble sobre el dintel, en dos ménsulas. En
    // medio, clavada de punta, la espada de Solingen (la pone game/house.js:
    // se saca); el corte que deja en la madera, un paño blanco con su cruz
    // y dos velas. El escudo del cruzado, colgado del cañón, sobre la campana
    const zw = H.z0 + H.t;
    const M = A.mantel;
    wb.box('wooddark', 48.7, 1.45, zw + 0.55, 51.3, M.y, zw + 0.88, { ao: false, faces: 'tnsewb', room, tint: [0.72, 0.62, 0.52] });
    for (const x of [48.9, 51.1]) wb.box('wooddark', x - 0.06, 1.18, zw + 0.6, x + 0.06, 1.45, zw + 0.84, { ao: false, room, tint: [0.6, 0.52, 0.44] });
    wb.box('black', M.x - 0.02, M.y, M.z - 0.005, M.x + 0.02, M.y + 0.002, M.z + 0.005, { ao: false, faces: 't', grime: false, room });
    wb.box('clothWhite', 49.45, M.y, zw + 0.6, 50.55, M.y + 0.006, zw + 0.88, { ao: false, faces: 't', room, tint: [0.82, 0.78, 0.7] });
    wb.box('clothWhite', 49.45, 1.24, zw + 0.88, 50.55, M.y + 0.006, zw + 0.886, { ao: false, faces: 's', room, tint: [0.82, 0.78, 0.7] });
    wb.box('clothRed', 49.97, 1.3, zw + 0.887, 50.03, 1.52, zw + 0.889, { ao: false, faces: 's', room });
    wb.box('clothRed', 49.9, 1.43, zw + 0.887, 50.1, 1.47, zw + 0.889, { ao: false, faces: 's', room });
    P.candles(ctx, 49.2, M.y, zw + 0.72, 2, 7186, { room, radius: 3, intensity: 0.55, spread: 0.05, scale: 0.6 });
    P.candles(ctx, 50.8, M.y, zw + 0.72, 2, 7187, { room, radius: 3, intensity: 0.55, spread: 0.05, scale: 0.6 });
    escudo(ctx, 50, 3.08, zw + 0.135, room);
  }
  P.banner(ctx, 48.0, 3.2, H.z0 + H.t + 0.06, 0, 'bannerEagle', 0.9, 1.9);
  P.banner(ctx, 52.0, 3.2, H.z0 + H.t + 0.06, 0, 'bannerEagle', 0.9, 1.9);
  // (la mesa, hacia el hogar: la mitad de la sala, junto a la puerta, queda
  // libre; ahí se planta Henrique cuando entran por las ventanas)
  P.table(ctx, 50, 0, -105.2, 1.1, 3.4, 0);
  P.bench(ctx, 49.05, 0, -105.2, 2.6, Math.PI / 2);
  P.bench(ctx, 50.95, 0, -105.2, 2.6, Math.PI / 2);
  P.candles(ctx, 50.1, 0.8, -104.4, 3, 7173, { room, radius: 4.5, intensity: 0.9, spread: 0.2 });
  P.candles(ctx, 49.9, 0.8, -106.2, 2, 7174, { room, radius: 3.5, intensity: 0.6, spread: 0.15 });
  P.hangingLamp(ctx, 50, H.g1 - 0.22, -100.6, { room, radius: 6, intensity: 0.9, len: 0.7 });
  wb.cylinder('bronze', 50.3, 0.8, -105.8, 0.1, 0.08, 0.16, 7, { ao: false, capBot: true });
  // un arcón junto a la puerta, atrancando con él la puerta por las noches
  wb.box('wooddark', 47.6, 0, -98.4, 48.9, 0.6, -97.75, { faces: 'tnsew', aoH: 0.5 });
  for (const x of [47.75, 48.75]) wb.box('iron', x - 0.03, 0, -98.43, x + 0.03, 0.62, -97.72, { ao: false });
  col.add(47.6, 0, -98.4, 48.9, 0.62, -97.75);
  P.decal(ctx, 50.6, 0.03, -99.4, 1.0);
  // la puerta reventada esta noche: la tranca, partida en dos en el suelo,
  // una de las grapas arrancada del muro y astillas por todas partes
  {
    const zi = H.z1 - H.t;
    wb.box('iron', D.x - 1.0, 1.2, zi - 0.16, D.x - 0.9, 1.45, zi, { ao: false, room });
    wb.push();
    wb.translate(D.x + 0.95, 1.18, zi - 0.05);
    wb.rotateZ(0.7);
    wb.box('iron', -0.05, -0.12, -0.08, 0.05, 0.12, 0.06, { ao: false, room });
    wb.pop();
    for (const [x, z, r, L] of [
      [49.1, -98.35, 0.35, 1.0],
      [51.2, -99.1, -0.9, 0.85],
    ]) {
      wb.push();
      wb.translate(x, 0.09, z);
      wb.rotateY(r);
      wb.box('timber', -L / 2, -0.09, -0.07, L / 2, 0.09, 0.07, { ao: false, room, tint: [0.8, 0.72, 0.64] });
      wb.box('timber', L / 2 - 0.02, -0.07, -0.05, L / 2 + 0.1, 0.05, 0.03, { ao: false, room, tint: [0.9, 0.84, 0.74] });
      wb.pop();
      col.addOBB(x, z, L / 2, 0.08, r, 0, 0.18);
    }
    const rng2 = new RNG(7191);
    for (let i = 0; i < 9; i++) {
      wb.push();
      wb.translate(D.x + rng2.range(-1.2, 1.2), 0.025, H.z1 - 0.6 - rng2.range(0, 1.6));
      wb.rotateY(rng2.range(0, Math.PI));
      wb.box('planks', -rng2.range(0.08, 0.22), -0.012, -0.02, rng2.range(0.08, 0.22), 0.012, 0.02, { ao: false, room, tint: [0.92, 0.86, 0.76] });
      wb.pop();
    }
  }

  // --- el taller del cuchillero: la fragua pequeña con su fuelle, la muela,
  // el banco con las hojas a medio hacer, el yunque y las herramientas
  {
    const x0 = H.x0 + H.t,
      z0 = -102.8;
    wb.box('wallstone', x0, 0, z0, x0 + 1.7, 0.85, z0 + 1.5, { faces: 'tnsew', sub: 2, aoH: 0.5, room });
    wb.box('ember', x0 + 0.25, 0.85, z0 + 0.25, x0 + 1.45, 0.88, z0 + 1.25, { faces: 't', ao: false, grime: false, room });
    // la campana, de las brasas al techo
    const hb = 1.75,
      ht = H.g1;
    const q = (a, b, c, d) => wb.quad('wallstone', a, b, c, d, { ao: false, sub: 2, room, tint: [0.5, 0.46, 0.42] });
    q(V(x0, hb, z0 + 1.5), V(x0 + 1.7, hb, z0 + 1.5), V(x0 + 1.1, ht, z0 + 0.7), V(x0 + 0.1, ht, z0 + 0.7));
    q(V(x0 + 1.7, hb, z0 + 1.5), V(x0 + 1.7, hb, z0), V(x0 + 1.1, ht, z0), V(x0 + 1.1, ht, z0 + 0.7));
    col.add(x0, 0, z0, x0 + 1.7, 0.9, z0 + 1.5);
    ctx.fires.push({ x: x0 + 0.85, y: 0.88, z: z0 + 0.75, s: 0.4, embers: true });
    ctx.lights.push({ x: x0 + 1.2, y: 1.3, z: z0 + 1.6, r: 1, g: 0.42, b: 0.12, radius: 6, intensity: 1.3, room });
    ctx.dynLights.push({ x: x0 + 0.9, y: 1.3, z: z0 + 1.2, intensity: 3.2, range: 7, room });
    P.bellows(ctx, x0 + 2.2, 0, z0 + 0.5, Math.PI / 2, { room });
  }
  P.toolBoard(ctx, 46.78, 0, -98.3, -Math.PI / 2, { room });
  P.counter(ctx, 45.4, 0, -102.3, 0, 2.0, { room });
  P.anvil(ctx, 45.0, 0, -100.4, 0.5);
  // la muela de afilar: la rueda de piedra en su bastidor
  wb.box('wooddark', 44.7, 0, -98.4, 45.9, 0.55, -97.9, { faces: 'tnsew', ao: false });
  wb.push();
  wb.translate(45.3, 0.95, -98.15);
  wb.rotateZ(Math.PI / 2);
  wb.cylinder('rock', 0, -0.07, 0, 0.42, 0.42, 0.14, 12, { ao: false, capTop: true, capBot: true });
  wb.pop();
  col.add(44.7, 0, -98.4, 45.9, 1.4, -97.9);
  for (let i = 0; i < 5; i++) wb.box('plate', 44.6 + i * 0.3, 1.08, -102.5, 44.64 + i * 0.3, 1.1, -101.9, { ao: false });
  P.coalPile(ctx, 41.0, 0, -97.9, 0.6, { room });
  P.candles(ctx, 46.0, 1.08, -102.4, 2, 7175, { room, radius: 3.5, intensity: 0.6, spread: 0.2 });
  // Gonçalo, el oficial que no subió a tiempo
  bakeCorpse(wb, 42.8, 0, -100.9, 0.6, 'back', 'villager', 11);
  P.decal(ctx, 42.8, 0.03, -100.9, 1.9);
  P.decal(ctx, 44.6, 0.03, -100.2, 0.7);

  // --- la alcoba: la cama de los dos, la cuna vacía de Tomé, el torno de
  // hilar de Leonor y una imagen de la Dolorosa con siete puñales
  P.bed(ctx, 42.0, 0, -107.6, 0);
  wb.box('wooddark', 44.6, 0, -108.8, 45.6, 0.18, -108.0, { faces: 'tnsew', ao: false });
  for (const s of [-1, 1]) wb.box('wooddark', 45.1 + s * 0.48, 0.18, -108.8, 45.1 + s * 0.5, 0.62, -108.0, { ao: false });
  wb.box('wooddark', 44.62, 0.18, -108.8, 45.58, 0.62, -108.76, { ao: false });
  wb.box('wooddark', 44.62, 0.18, -108.04, 45.58, 0.62, -108.0, { ao: false });
  wb.box('clothWhite', 44.66, 0.2, -108.74, 45.54, 0.3, -108.06, { ao: false, faces: 't', tint: [0.8, 0.76, 0.7] });
  col.add(44.6, 0, -108.8, 45.6, 0.62, -108.0);
  P.spinningWheel(ctx, 41.4, 0, -104.2, 0.9, { room });
  // la Dolorosa: la tabla en el muro, con su manto negro y los puñales
  {
    const zw = H.z0 + H.t;
    wb.box('wooddark', 42.4, 1.5, zw, 43.4, 2.8, zw + 0.05, { ao: false });
    wb.box('clothDark', 42.6, 1.6, zw + 0.05, 43.2, 2.6, zw + 0.06, { ao: false, faces: 's' });
    wb.box('skinPale', 42.82, 2.32, zw + 0.061, 42.98, 2.5, zw + 0.066, { ao: false, faces: 's' });
    for (let k = 0; k < 7; k++) {
      const a = -0.9 + (k / 6) * 1.8;
      wb.push();
      wb.translate(42.9 + Math.sin(a) * 0.18, 2.05 + Math.cos(a) * 0.18, zw + 0.075);
      wb.rotateZ(-a);
      wb.box('silver', -0.008, 0, -0.008, 0.008, 0.16, 0.008, { ao: false });
      wb.pop();
    }
    P.candles(ctx, 42.9, 0, zw + 0.4, 5, 7176, { room, radius: 3.2, intensity: 0.7, spread: 0.3 });
  }
  wb.box('clothWhite', 43.4, 0.02, -105.6, 44.2, 0.025, -105.0, { ao: false, faces: 't', tint: [0.74, 0.66, 0.54] });

  // --- la cocina: el fogón, la mesa, la artesa y los cacharros
  P.hearth(ctx, H.x1 - H.t, 0, -108.2, 'w', { room, w: 1.6, pot: true, fire: 0.25, radius: 5, lit: true, ceil: H.g1 });
  P.table(ctx, 55.6, 0, -106.6, 1.6, 0.9, 0.1);
  P.stool(ctx, 55.0, 0, -105.6, { room });
  P.stool(ctx, 56.6, 0, -107.6, { room, tipped: true });
  P.kneadTrough(ctx, 54.0, 0, -109.0, 0, { room });
  P.jar(ctx, 58.6, 0, -103.8, 1.0);
  P.jar(ctx, 58.1, 0, -103.7, 0.8, { broken: true });
  P.sacks(ctx, 53.9, 0, -103.9, 2, 7177);
  P.candles(ctx, 55.4, 0.8, -106.4, 2, 7178, { room, radius: 3.5, intensity: 0.6, spread: 0.2 });

  // --- la despensa: estantes, toneles y sacos
  P.shelf(ctx, 54.6, 0, -97.62, Math.PI, 1.6);
  P.cask(ctx, 58.4, 0, -97.9, 0, { room, r: 0.4, len: 1.0 });
  P.sacks(ctx, 56.0, 0, -100.0, 3, 7179);
  P.basket(ctx, 56.4, 0, -99.7, { rot: 1.2 });

  // ------------------------------------------------------------ la escalera
  // el cuartucho: muros del hueco bajo el suelo (se ven desde la bodega) y
  // el rellano de arriba; la puerta del sótano la pone el juego (cerrada con
  // llave)
  const C = A.cellar;
  const Y = C.y;
  wb.setRoom('alemanSotano');
  stairs(ctx, ST.x0, Y, (ST.z0 + ST.z1) / 2, 'e', ST.z1 - ST.z0, ST.n, ST.rise, ST.run, 'wooddark', { solidBelow: true });
  // sangre seca en los peldaños
  for (let i = 1; i < ST.n; i += 3) P.decal(ctx, ST.x0 + (i + 0.5) * ST.run, Y + (i + 1) * ST.rise + 0.02, -101.6 + (i % 2) * 0.4, 0.35);

  // ------------------------------------------------------------ la bodega
  const sroom = 'alemanSotano';
  U.paint(C.x0, C.z0, C.x1, C.z1, 1);
  wb.box('flag', C.x0, Y - 0.1, C.z0, C.x1, Y, C.z1, { faces: 't', ao: false, sub: 2, tint: [0.5, 0.47, 0.44] });
  col.add(C.x0, Y - 1, C.z0, C.x1, Y, C.z1, 'floor').cam = true;
  const wo = { sub: 1.6, aoH: 1.4, aoMin: 0.45, baseY: Y, room: sroom, tint: [0.6, 0.58, 0.54] };
  const T = A.tunnel;
  wb.box('wallstone', C.x0 - 0.3, Y, C.z0, C.x0, C.top, C.z1, { ...wo, faces: 'e' });
  wb.box('wallstone', C.x1, Y, C.z0, C.x1 + 0.3, C.top, C.z1, { ...wo, faces: 'w' });
  wb.box('wallstone', C.x0, Y, C.z1, C.x1, C.top, C.z1 + 0.3, { ...wo, faces: 'n' });
  // el muro del norte, roto donde cavó Leonor
  wb.box('wallstone', C.x0, Y, C.z0 - 0.3, T.x0, C.top, C.z0, { ...wo, faces: 's' });
  wb.box('wallstone', T.x1, Y, C.z0 - 0.3, C.x1, C.top, C.z0, { ...wo, faces: 's' });
  wb.box('wallstone', T.x0, Y + 2.3, C.z0 - 0.3, T.x1, C.top, C.z0, { ...wo, faces: 'sb' });
  // el techo de vigas (con el hueco de la escalera)
  const hole = [ST.x0, ST.z0, ST.landing[0], ST.z1];
  const rects = (r) => {
    const out = [];
    const [a, b, c, d] = r;
    const [h0, h1, h2, h3] = hole;
    if (h0 >= c || h2 <= a || h1 >= d || h3 <= b) return [r];
    if (h1 > b) out.push([a, b, c, h1]);
    if (h3 < d) out.push([a, h3, c, d]);
    if (h0 > a) out.push([a, Math.max(b, h1), h0, Math.min(d, h3)]);
    if (h2 < c) out.push([h2, Math.max(b, h1), c, Math.min(d, h3)]);
    return out;
  };
  for (const [a, b, c, d] of rects([C.x0, C.z0, C.x1, C.z1])) {
    wb.box('planks', a, C.top, b, c, C.top + 0.05, d, { faces: 'b', ao: false, sub: 2, tint: [0.42, 0.38, 0.34] });
    col.add(a, C.top, b, c, -1.0, d).cam = true;
  }
  for (const x of [42.6, 45.6, 48.6, 51.6, 54.6, 57.6]) {
    for (const [a, b, c, d] of rects([x - 0.12, C.z0, x + 0.12, C.z1])) wb.box('timber', a, C.top - 0.24, b, c, C.top, d, { ao: false, faces: 'nsewb', room: sroom });
  }
  col.addCam(C.x0, C.top - 0.28, C.z0, C.x1, C.top, C.z1);
  // pilares de piedra bajo los tabiques
  for (const [x, z] of [
    [47, -103],
    [53, -106.8],
  ]) {
    wb.box('ashlar', x - 0.3, Y, z - 0.3, x + 0.3, C.top - 0.24, z + 0.3, { sub: 1.6, aoH: 1.2, baseY: Y, room: sroom, faces: 'nsew', tint: [0.66, 0.63, 0.58] });
    col.add(x - 0.3, Y, z - 0.3, x + 0.3, C.top, z + 0.3);
  }
  // toneles, sacos, el arcón del ajuar y la tierra que sacó Leonor
  P.cask(ctx, 41.4, Y, -98.4, Math.PI / 2, { room: sroom, r: 0.5, len: 1.2 });
  P.cask(ctx, 41.4, Y, -100.4, Math.PI / 2, { room: sroom, r: 0.5, len: 1.2 });
  P.barrel(ctx, 58.6, Y, -98.6, {});
  P.barrel(ctx, 57.7, Y, -98.3, {});
  P.sacks(ctx, 44.6, Y, -98.4, 3, 7180);
  P.shelf(ctx, 51.0, Y, -97.62, Math.PI, 1.8);
  for (const [x, z, s] of [
    [47.5, -108.6, 1.2],
    [46.0, -107.4, 0.9],
    [49.0, -107.8, 1.0],
  ]) {
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9 + x,
        r = (k % 3) * 0.25 * s;
      wb.push();
      wb.translate(x + Math.cos(a) * r, Y, z + Math.sin(a) * r);
      wb.rotateY(a);
      wb.box('dirt', -0.32 * s, 0, -0.26 * s, 0.32 * s, 0.22 * s * (1 - (k % 3) * 0.25), 0.26 * s, { ao: false, faces: 'tnsew', tint: [0.56, 0.48, 0.4] });
      wb.pop();
    }
  }
  P.candles(ctx, 45.4, Y, -109.0, 4, 7181, { room: sroom, radius: 3.4, intensity: 0.7, spread: 0.3 });
  P.candles(ctx, 50.0, Y, -109.2, 3, 7182, { room: sroom, radius: 3, intensity: 0.5, spread: 0.25 });
  // (el sello, en el muro, junto al agujero: no delante de él)
  P.decal(ctx, 43.4, Y + 1.5, C.z0 + 0.02, 1.4, 'sigil', 0, { wall: 'z' });
  P.hangingLamp(ctx, 50.4, C.top - 0.24, -101.4, { room: sroom, radius: 5.5, intensity: 0.7, len: 0.5 });
  ctx.rats.push({ x: 42.8, y: Y, z: -104.4, n: 2 });

  // ------------------------------------------------------------ el agujero
  const troom = 'leonor';
  wb.setRoom(troom);
  U.paint(T.x0, T.z0, T.x1, T.z1, 1);
  const TB = Y - T.n * T.rise; // suelo de la gruta
  stairs(ctx, (T.x0 + T.x1) / 2, TB, T.zBot, 's', T.x1 - T.x0, T.n, T.rise, T.run, 'rock', { solidBelow: true });
  const zTop = T.zBot + T.n * T.run;
  wb.box('rock', T.x0, Y - 0.1, zTop, T.x1, Y, T.z1, { faces: 't', ao: false, sub: 2, tint: [0.46, 0.4, 0.34] });
  col.add(T.x0, Y - 1, zTop, T.x1, Y, T.z1, 'floor').cam = true;
  wb.box('rock', T.x0, TB - 0.1, T.z0, T.x1, TB, T.zBot, { faces: 't', ao: false, sub: 2, tint: [0.46, 0.4, 0.34] });
  col.add(T.x0, TB - 1, T.z0, T.x1, TB, T.zBot, 'floor').cam = true;
  // las paredes y el techo de tierra y roca (escalonado con la bajada; cada
  // tramo, a la altura del suelo más alto que cubre: si no, en la bajada se
  // daba con la cabeza en el techo)
  const tunH = 2.6;
  const tt = [0.52, 0.45, 0.38];
  const tunFloor = (z) => (z >= zTop ? Y : z <= T.zBot ? TB : TB + ((z - T.zBot) / (zTop - T.zBot)) * (Y - TB));
  for (const [x, f] of [
    [T.x0, 'e'],
    [T.x1, 'w'],
  ]) {
    const sx = f === 'e' ? -1 : 1;
    for (let z = T.z1; z > T.z0 - 0.01; z -= 1.2) {
      const za = Math.max(T.z0, z - 1.2);
      const fy = tunFloor(z);
      const j = ((z * 7.3) % 1) * 0.18;
      wb.box('rock', Math.min(x, x + sx * (0.3 + j)), TB - 0.5, za, Math.max(x, x + sx * (0.3 + j)), fy + tunH + 0.2, z, { faces: f, ao: false, sub: 2, room: troom, tint: tt });
    }
  }
  for (let z = T.z1; z > T.z0 - 0.01; z -= 1.2) {
    const za = Math.max(T.z0, z - 1.2);
    const fy = tunFloor(z);
    wb.box('rock', T.x0 - 0.2, fy + tunH, za, T.x1 + 0.2, fy + tunH + 0.3, z, { faces: 'b', ao: false, sub: 2, room: troom, tint: tt });
    col.add(T.x0, fy + tunH, za, T.x1, -1.0, z).cam = true;
  }
  // arañazos y sangre en la roca, raíces colgando
  for (const z of [-111.8, -114.2, -116.6]) P.decal(ctx, T.x0 + 0.02, tunFloor(z) + 1.3, z, 0.7, 'splat', 1.2, { wall: 'x' });
  P.candles(ctx, 47.6, TB, -119.6, 3, 7183, { room: troom, radius: 3, intensity: 0.5, spread: 0.3, scale: 0.7 });

  // ------------------------------------------------------------ la gruta
  const G = A.lair;
  // lo que se pisa: dentro del contorno, con medio metro de holgura
  for (const r of LAIR_WALK) U.paint(r[0], r[1], r[2], r[3], 1);
  const GY = G.y;
  wb.box('rock', G.x0 - 0.6, GY - 0.1, G.z0 - 1.2, G.x1 + 0.6, GY, G.z1 + 0.2, { faces: 't', ao: false, sub: 2, tint: [0.42, 0.36, 0.3] });
  col.add(G.x0, GY - 1, G.z0 - 1, G.x1, GY, G.z1, 'floor').cam = true;
  const gt = [0.5, 0.42, 0.36];
  // el contorno de la gruta, de la boca del agujero (en el lado sur) a la
  // vuelta, en el sentido de las agujas del reloj
  caveWall(ctx, LAIR_OUTLINE, GY, G.top, { seed: 7190, room: troom, tint: gt, out: 0.45, lean: 0.9, closed: false });
  // el dintel sobre la boca del agujero
  wb.box('rock', T.x0 - 0.3, TB + tunH, G.z1 - 0.3, T.x1 + 0.3, G.top, G.z1 + 0.2, { faces: 'nb', ao: false, sub: 2, room: troom, tint: gt });
  caveCeil(ctx, G.x0 - 0.8, G.z0 - 1.2, G.x1 + 0.8, G.z1 + 0.4, G.top, { seed: 7193, room: troom, tint: [0.4, 0.34, 0.3], amp: 0.6 });
  col.add(G.x0 - 1, G.top, G.z0 - 1, G.x1 + 1, -1.0, G.z1).cam = true;
  // dos pilares de roca cubiertos de pus, el nido de trapos, los charcos
  for (const [x, z, r] of [
    [44.4, -127.6, 0.75],
    [53.4, -129.2, 0.85],
  ]) {
    wb.cylinder('rock', x, GY, z, r * 1.2, r, G.top - GY + 0.4, 7, { ao: false, room: troom, tint: gt });
    col.add(x - r, GY, z - r, x + r, G.top, z + r);
    P.fleshGrowth(ctx, x, GY, z + r * 0.6, 0.8, Math.round(x * 31), { room: troom, climb: 2.6, tendrils: 2 });
  }
  for (const [x, z, r, s] of [
    [46.2, -124.6, 1.1, 7201],
    [51.8, -125.4, 0.8, 7202],
    [42.4, -131.2, 1.3, 7203],
    [55.6, -133.0, 1.0, 7204],
    [49.0, -128.4, 1.6, 7205],
    [56.8, -124.4, 0.7, 7206],
  ])
    pusPool(ctx, x, GY, z, r, s, troom);
  // la cuna de Tomé, en el nido: trapos, cera, juguetes
  const CR = A.cradle;
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    wb.push();
    wb.translate(CR.x + Math.cos(a) * 1.15, GY + 0.06, CR.z + Math.sin(a) * 1.0);
    wb.rotateY(a + 0.3);
    wb.box(k % 2 ? 'clothWhite' : 'burlap', -0.35, -0.06, -0.22, 0.35, 0.1 + (k % 3) * 0.05, 0.22, { ao: false, room: troom, tint: [0.62, 0.56, 0.4] });
    wb.pop();
  }
  wb.at(CR.x, GY, CR.z, 0.2, () => {
    wb.box('wooddark', -0.5, 0.12, -0.3, 0.5, 0.18, 0.3, { ao: false, faces: 'tnsew' });
    for (const s of [-1, 1]) {
      wb.box('wooddark', s * 0.47, 0.18, -0.3, s * 0.5, 0.58, 0.3, { ao: false });
      // las mecedoras curvas, como dos tablas
      wb.box('wooddark', s * 0.44, 0, -0.4, s * 0.5, 0.12, 0.4, { ao: false });
    }
    wb.box('wooddark', -0.47, 0.18, -0.3, 0.47, 0.5, -0.27, { ao: false });
    wb.box('wooddark', -0.47, 0.18, 0.27, 0.47, 0.5, 0.3, { ao: false });
    wb.box('clothWhite', -0.44, 0.18, -0.25, 0.44, 0.26, 0.25, { ao: false, faces: 't', tint: [0.7, 0.66, 0.5] });
  });
  col.add(CR.x - 0.55, GY, CR.z - 0.45, CR.x + 0.55, GY + 0.6, CR.z + 0.45);
  P.candles(ctx, CR.x - 1.6, GY, CR.z + 0.4, 6, 7207, { room: troom, radius: 4, intensity: 0.8, spread: 0.45 });
  P.candles(ctx, CR.x + 1.7, GY, CR.z - 0.2, 5, 7208, { room: troom, radius: 4, intensity: 0.7, spread: 0.4 });
  P.decal(ctx, CR.x, GY + 2.6, G.z0 - 0.4, 2.4, 'sigil', 0, { wall: 'z' });
  P.fleshGrowth(ctx, CR.x, GY, G.z0 + 0.2, 1.6, 7209, { room: troom, climb: 3.6, lift: 1.4, bound: [G.x0 + 2, G.x1 - 2, G.z0 - 0.8, G.z0 + 2.4] });
  P.fleshGrowth(ctx, G.x1 - 1.2, GY, -126.0, 1.2, 7210, { room: troom, climb: 3.0 });
  P.fleshGrowth(ctx, G.x0 + 0.8, GY, -128.6, 1.1, 7211, { room: troom, climb: 2.8 });
  P.bones(ctx, 52.6, GY, -131.6, 9, 7212, 1.4);
  P.bones(ctx, 43.2, GY, -125.2, 6, 7213, 1.0);
  // luz: el pus brilla en lo oscuro y las velas de la cuna
  ctx.lights.push({ x: 49, y: GY + 1.0, z: -128.6, r: 0.75, g: 0.8, b: 0.25, radius: 9, intensity: 0.7, room: troom });
  ctx.lights.push({ x: 44, y: GY + 0.8, z: -131.2, r: 0.7, g: 0.75, b: 0.22, radius: 6, intensity: 0.5, room: troom });
  ctx.lights.push({ x: 55.4, y: GY + 0.8, z: -132.4, r: 0.7, g: 0.75, b: 0.22, radius: 6, intensity: 0.5, room: troom });
  wb.setRoom(null);

  // colisión de lo de abajo: todo lo que no es bodega, escalera, agujero o
  // gruta, bajo la losa de la calle
  U.paint(ST.x0 - 0.2, ST.z0, ST.landing[1], ST.z1, 1);

  // ------------------------------------------------------------ el guion
  // (lo mueve game/house.js)
  // la puerta de la casa: la han reventado esta noche (por ahí entraron);
  // la cierra Henrique, a la defensa, y luego la abre
  L.interact.push({ kind: 'door', id: 'd_aleman', x: D.x, y: 0, z: H.z1, w: D.w, h: D.h, axis: 'x', lock: { type: 'npc' }, mat: 'planks', hinge: -1, swing: 1, plane: H.z1 - H.t, inset: 0.08, mark: 'broken' });
  // la de la escalera de arriba, en la sala: atrancada desde dentro; la abre
  // Henrique cuando baja (abre hacia la sala)
  L.interact.push({ kind: 'door', id: 'd_escalera_ale', x: US.door.x, y: 0, z: US.door.z, w: US.door.w, h: US.door.h, axis: 'z', lock: { type: 'npc' }, mat: 'planks', hinge: -1, swing: -1, plane: 52.8, inset: 0.06 });
  // la espada del padre, clavada en la repisa del hogar: se examina; cuando
  // Henrique te la da, se saca (ver game/house.js)
  L.interact.push({ kind: 'relic', id: 'r_solingen', x: A.mantel.x, y: 0, z: A.mantel.z + 0.85, r: 1.9 });
  // la del cuartucho de la escalera del sótano: con llave (se la da él)
  L.interact.push({ kind: 'door', id: 'd_sotano_ale', x: ST.door.x, y: 0, z: ST.z1 + 0.4, w: ST.door.w, h: ST.door.h, axis: 'x', lock: { type: 'key', item: 'llave_sotano' }, mat: 'planks', hinge: -1, swing: 1, plane: ST.z1 });
  // hablar con Henrique (el punto le sigue) y tapiar cada ventana (por dentro)
  L.interact.push({ kind: 'npc', id: 't_henrique', label: 'Hablar con Henrique', x: 50, y: 0, z: -101.6 });
  for (const w of A.windows) L.interact.push({ kind: 'board', id: 'b_' + w.id, win: w.id, x: w.inner[0] - w.nx * 0.3, y: 0, z: w.inner[1] - w.nz * 0.3, r: 1.9 });
  // los tablones para tapiarlas (seis para cinco ventanas): en el taller del
  // carpintero, en el patio de la leña, en el carro volcado del recodo y,
  // arriba, en el granero
  for (const [id, x, y, z] of [
    ['i_tablon1', 64.2, 0.62, -98.8],
    ['i_tablon2', 65.0, 0.95, -88.6],
    ['i_tablon3', 65.4, 0.12, -106.4],
    ['i_tablon4', 68.6, 0.12, -103.4],
    ['i_tablon5', 43.1, 0.3, -75.6],
    ['i_tablon6', 45.4, FY + 0.12, -104.1],
  ])
    L.interact.push({ kind: 'item', id, item: 'tablon', x, y, z });
  // los documentos: la carta del padre, en la mesa de la sala; la oración
  // de Leonor, junto a sus velas del sótano
  L.interact.push({ kind: 'note', id: 'n_abuelo', note: 'abuelo', x: 49.8, y: 0.82, z: -106.4, model: 'paper' });
  L.interact.push({ kind: 'note', id: 'n_leonor', note: 'leonor', x: 46.3, y: Y + 0.02, z: -108.5, model: 'paper' });
  // la niebla en la boca de la gruta y, vencida Leonor, su lágrima en la cuna
  L.interact.push({ kind: 'fog', id: 'f_leonor', boss: 'leonor', x: (T.x0 + T.x1) / 2, y: TB, z: G.z1, w: T.x1 - T.x0, h: 2.5, axis: 'x', enter: -1 });
  L.interact.push({ kind: 'item', id: 'i_lagrima', item: 'lagrima', x: A.cradle.x, y: G.y + 0.62, z: A.cradle.z, afterBoss: 'leonor' });

  // Henrique, asomado a la ventana de la sala alta; las que están dentro,
  // abajo (las tres que aporrean la puerta de la escalera para subir a por
  // él, la que roe al oficial muerto en el taller, la que husmea en la
  // cocina y la que se ha quedado mirando la cuna en la alcoba); las que
  // entran por las ventanas (en tres oleadas, ocultas hasta entonces); y las
  // de los alrededores
  const yIn = (w) => Math.atan2(-w.nx, -w.nz);
  const WN = Object.fromEntries(A.windows.map((w) => [w.id, w]));
  const wave = (id, type, n, win) => ({ type, x: WN[win].out[0], y: 0, z: WN[win].out[1], yaw: yIn(WN[win]), idle: 'pound', id, held: true, wave: n, win });
  L.enemies.push(
    { type: 'henrique', x: 50, y: A.upWin.floor, z: H.z1 - 0.5, yaw: 0, idle: 'window', id: 'npc_henrique' },
    { type: 'penitent', x: 52.05, y: 0, z: -102.45, yaw: Math.PI / 2 - 0.1, idle: 'pound', id: 'e_ale_p1', story: 'ale:door', group: 'aleEsc' },
    { type: 'penitent', x: 52.1, y: 0, z: -101.5, yaw: Math.PI / 2 + 0.12, idle: 'pound', id: 'e_ale_p2', story: 'ale:door', group: 'aleEsc' },
    { type: 'soldier', x: 51.25, y: 0, z: -102.0, yaw: Math.PI / 2, idle: 'pound', id: 'e_ale_s1', story: 'ale:door', group: 'aleEsc' },
    { type: 'penitent', x: 43.45, y: 0, z: -100.45, yaw: -2.16, idle: 'eat', id: 'e_ale_i1', story: 'ale:door' },
    { type: 'hound', x: 56.0, y: 0, z: -105.1, yaw: -2.0, idle: 'eat', id: 'e_ale_i2', story: 'ale:door' },
    { type: 'penitent', x: 44.2, y: 0, z: -106.75, yaw: 2.63, idle: 'pray', id: 'e_ale_i3', story: 'ale:door' },
    wave('e_ale_w1a', 'penitent', 1, 'v_taller'),
    wave('e_ale_w1b', 'penitent', 1, 'v_cocina'),
    wave('e_ale_w2a', 'hound', 2, 'v_oeste'),
    wave('e_ale_w2b', 'penitent', 2, 'v_despensa'),
    wave('e_ale_w2c', 'hound', 2, 'v_este'),
    wave('e_ale_w3a', 'soldier', 3, 'v_taller'),
    wave('e_ale_w3b', 'penitent', 3, 'v_cocina'),
    wave('e_ale_w3c', 'hound', 3, 'v_despensa'),
    // Leonor, de rodillas ante la cuna, de espaldas a la boca del agujero
    { type: 'leonor', x: A.cradle.x, y: A.lair.y, z: A.cradle.z + 1.6, yaw: Math.PI, idle: 'boss', boss: true, id: 'b_leonor' },
    { type: 'hound', x: 44.9, y: 0, z: -74.5, yaw: 2.4, idle: 'eat', id: 'e_ale_h1' },
    { type: 'hound', x: 46.5, y: 0, z: -76.1, yaw: -0.7, idle: 'eat', id: 'e_ale_h2' },
    { type: 'penitent', x: 66.7, y: 0, z: -92.1, yaw: 1.2, idle: 'eat', id: 'e_ale_c1' }
  );

  // ------------------------------------------------------------ zonas y mapa
  L.zones.push(
    { id: 'casa_aleman', rects: [[H.x0, H.z0, H.x1, H.z1, -1, 3.2]], atmo: 'interior', room },
    { id: 'sobrado_aleman', rects: [[H.x0, H.z0, H.x1, H.z1, 3.2, UPC]], atmo: 'interior', room: 'alemanAlta' },
    { id: 'sotano_aleman', rects: [[H.x0, H.z0, H.x1, H.z1, -5, -1]], atmo: 'cellar', room: sroom },
    { id: 'gruta_leonor', rects: [[G.x0 - 1, G.z0 - 1.5, G.x1 + 1, G.z1, GY - 1, -1], [T.x0, T.z0, T.x1, T.z1, GY - 1, -1]], atmo: 'lair', room: troom },
    { id: 'patio_lena', rects: [[A.yard.x0, A.yard.z0, A.yard.x1, A.yard.z1, -1, 8], [60, -100, 62, -97, -1, 8]], atmo: 'city' },
    { id: 'callejon_postigo', rects: [[44, -77, 47.6, -59.5, -1, 8], [40.6, -86, 47.6, -73, -1, 8], [A.plaza.x0, A.plaza.z0, A.plaza.x1, A.plaza.z1, -1, 8], [A.passage.x0, A.passage.z0, A.passage.x1, A.passage.z1, -1, 8]], atmo: 'city' }
  );
  L.map.push(
    { id: 'callejon_postigo', r: [44, -77, 47.6, -59.5] },
    { id: 'callejon_postigo', r: [40.6, -86, 47.6, -73] },
    { id: 'callejon_postigo', r: [A.plaza.x0, A.plaza.z0, A.plaza.x1, A.plaza.z1] },
    { id: 'callejon_postigo', r: [A.passage.x0, A.passage.z0, A.passage.x1, A.passage.z1] },
    { id: 'patio_lena', r: [A.yard.x0, A.yard.z0, A.yard.x1, A.yard.z1] },
    { id: 'patio_lena', r: [60, -100, 62, -97] },
    { id: 'casa_aleman', r: [H.x0 + H.t, H.z0 + H.t, H.x1 - H.t, H.z1 - H.t] },
    { id: 'sobrado_aleman', r: [H.x0 + H.t, H.z0 + H.t, H.x1 - H.t, H.z1 - H.t] },
    { id: 'sotano_aleman', r: [C.x0, C.z0, C.x1, C.z1], level: 'lair' },
    { id: 'gruta_leonor', r: [T.x0, T.z0, T.x1, T.z1], level: 'lair' },
    { id: 'gruta_leonor', r: [G.x0, G.z0, G.x1, G.z1], level: 'lair' }
  );
  return { troom, sroom, room };
}

// ------------------------------------------------------------ el carpintero
// Una nave de un solo cuerpo con el banco, la sierra de dos hombres en su
// caballete, tablones apilados (de ahí salen los de las ventanas) y un
// cuartucho al fondo.
export function buildCarpenter(ctx, S, L) {
  const wb = ctx.wb;
  const col = ctx.col;
  const A = ALEMAN;
  const K = A.carp;
  const room = 'carpinteria';
  house(ctx, {
    x0: K.x0,
    z0: K.z0,
    x1: K.x1,
    z1: K.z1,
    front: 'w',
    seed: 7231,
    hollow: true,
    collide: false,
    h: 6.4,
    g1: 3.4,
    style: 'plaster',
    room,
    jetty: 0,
    lit: false,
    chimney: false,
    floorMat: 'dirt',
    doors: [{ side: 'w', z: K.door, w: 1.8, h: 2.6 }],
    lowerWindows: true,
    partMat: 'planks',
    walls: [{ x0: K.x0 + 0.35, z0: -96.2, x1: K.x1 - 0.35, z1: -95.8, doors: [{ at: 66.4, w: 1.2 }] }],
  });
  wb.setRoom(room);
  // el banco largo con la garlopa, el caballete con la sierra y la rueda de
  // carro a medio hacer
  P.counter(ctx, 69.9, 0, -90.4, Math.PI / 2, 3.2, { room });
  wb.at(65.4, 0, -88.6, 0.3, () => {
    for (const [sx, sz] of [
      [-0.7, -0.25],
      [-0.7, 0.25],
      [0.7, -0.25],
      [0.7, 0.25],
    ])
      wb.box('wooddark', sx - 0.05, 0, sz - 0.05, sx + 0.05, 0.75, sz + 0.05, { ao: false });
    wb.box('wooddark', -0.85, 0.7, -0.12, 0.85, 0.82, 0.12, { ao: false, faces: 'tnsewb' });
    wb.box('planks', -1.2, 0.82, -0.16, 1.2, 0.88, 0.16, { ao: false, faces: 'tnsewb' });
    wb.box('iron', -0.3, 0.88, -0.01, 0.6, 1.08, 0.01, { ao: false });
  });
  col.addOBB(65.4, -88.6, 1.0, 0.35, 0.3, 0, 0.9);
  P.cartWheel(ctx, 63.4, 0, -94.6, 0.5, { room });
  // pilas de tablones (las de adorno)
  for (const [x, z, n, r] of [
    [64.2, -98.8, 7, 0],
    [69.4, -98.6, 5, 0.1],
    [69.6, -85.0, 6, -0.05],
  ]) {
    for (let i = 0; i < n; i++) {
      wb.push();
      wb.translate(x, 0.03 + i * 0.07, z);
      wb.rotateY(r + (i % 2) * 0.04);
      wb.box('planks', -1.2, 0, -0.32, 1.2, 0.06, 0.32, { ao: false, faces: 'tnsew' });
      wb.pop();
    }
    col.addOBB(x, z, 1.2, 0.34, r, 0, 0.1 + n * 0.07);
  }
  P.toolBoard(ctx, K.x1 - 0.37, 0, -88.4, -Math.PI / 2, { room });
  P.barrel(ctx, 63.0, 0, -85.0, {});
  P.sacks(ctx, 63.2, 0, -97.2, 2, 7232);
  // virutas por el suelo
  for (let i = 0; i < 18; i++) {
    const x = 63 + ((i * 37) % 70) / 10,
      z = -86 - ((i * 53) % 90) / 10;
    wb.box('planks', x - 0.12, 0.004, z - 0.05, x + 0.12, 0.012, z + 0.05, { ao: false, faces: 't', tint: [1.1, 1.0, 0.85] });
  }
  bakeCorpse(wb, 67.6, 0, -92.6, 1.1, 'face', 'villager', 4);
  P.decal(ctx, 67.6, 0.02, -92.6, 2.4);
  P.hangingLamp(ctx, 66.4, 3.18, -90.4, { room, radius: 5.5, intensity: 0.6, len: 0.6 });
  P.candles(ctx, 69.5, 1.08, -91.6, 2, 7233, { room, radius: 3, intensity: 0.5, spread: 0.2 });
  wb.setRoom(null);
  L.zones.push({ id: 'carpinteria', rects: [[K.x0, K.z0, K.x1, K.z1, -1, 4.2]], atmo: 'interior', room });
  L.map.push({ id: 'carpinteria', r: [K.x0 + 0.35, K.z0 + 0.35, K.x1 - 0.35, K.z1 - 0.35] });
}
