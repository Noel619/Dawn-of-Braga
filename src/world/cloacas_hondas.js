// Las cloacas hondas: de la sala de la luz y el Vergel (world/cloaca.js,
// world/vergel.js) hacia abajo, por la red de alcantarillado de Bracara, con
// el kit de las cloacas (world/cloaca_kit.js).
//
//  - La galería del desagüe: de la reja de levante de la sala de la luz al
//    rellano del Vergel, con el agua.
//  - La galería de la Sé: del muro del norte del Vergel hacia el norte, hacia
//    la catedral. Lo verde se muere; hay zarpazos en los muros y una cabra
//    arrastrada. A los cinco metros, una reja con su cadena y su candado: la
//    cerró el Desfigurado (game/desfigurado.js te da la llave). Detrás, la
//    escalera que baja al primer nivel hondo.
//  - La lobera (N1, a -17): las cloacas de la Sé, un laberinto de galerías
//    con su canal y sus cruces, con dos salas: el pozo de las ánimas (por su
//    tiro baja la luna) y el osario, donde el Lobishome entierra lo que
//    caza. A oscuras: sólo los braseros apagados de los cruces, que se
//    encienden con el farol (game/lobishome.js). Es su casa: la pelea.
//  - Las cloacas viejas (N2, a -23): las de antes de los romanos, de mampuesto,
//    largas, con tramos ahogados y ramales sin salida; los mastines de él.
//  - Los aljibes ahogados (N3, a -29): dos cisternas de pilares, la primera
//    con el agua a la rodilla, la segunda con su estanque hondo.
//  - Lo hondo (N4, a -35): el ninfeo de los romanos, donde manaba la fuente,
//    bajo el Vergel; ahí la vida que bajó se ha vuelto loca: las raíces lo
//    han reventado todo y las plantas se mueven y muerden (entities/plantas.js).
//    Lo que se cosecha para los cocimientos del Desfigurado (game/alquimia.js),
//    en el ninfeo y en el semillero del oeste. Al este, el pozo de la tapa:
//    se sube al Vergel (una vez abierta desde abajo, la tapa se traba sola).
//
// Medidas: HONDAS. Las rejillas de cada nivel (y su roca), level.js. Lo que
// se mueve, game/cloacas.js (el agua que frena, la cosecha, el pozo) y
// game/lobishome.js (los braseros, la pelea).
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import * as P from './props.js';
import { red, KIT, SILLAR } from './cloaca_kit.js';
import { VERGEL } from './vergel.js';
import { CLOACA, DESAGUE } from './cloaca.js';
import { helecho, hierba, flores, musgo, hiedra, raices, hongos, raizLarga, mata, juncos } from './verdor.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// la lobera: la cuadrícula de sus cruces (columnas de poniente a levante,
// filas del sur al norte)
const MX = [-4.5, 3.5, 11.5, 19.5, 27.5, 35.5, 43.5];
const MZ = [-16, -24, -32, -40, -48, -56];
const L_ = (c, r) => 'L' + c + r;

export const HONDAS = {
  // la altura de los andenes de cada nivel
  y: { se: -11.5, n1: -17, n2: -23, n3: -29, n4: -35 },
  // las rejillas (x0, z0, x1, z1) y su roca (y0, y1)
  grids: {
    H1: { r: [-16, -60, 47.5, 3], y0: -19, y1: -12.8 },
    H2: { r: [-24, -58, -1, 48], y0: -25, y1: -19 },
    H3: { r: [-24.5, 26, 22.5, 62], y0: -31, y1: -25 },
    H4: { r: [-12.5, -10.5, 42.5, 46.5], y0: -37.5, y1: -31 },
  },
  MX,
  MZ,
  // la galería de la Sé: su cruce, la reja (z) y la cabra
  se: { x: 27.5, nodo: 1.0, reja: 6.3 },
  // la lobera: su entrada (el cruce al pie de la escalera) y su salida
  entrada: L_(4, 0),
  salida: L_(0, 5),
  // las salas de la lobera
  pozo: { r: [9.5, -42, 21.5, -30], xs: [9.5, 13.5, 17.5, 21.5], zs: [-42, -38, -34, -30] },
  osario: { r: [33.5, -58, 45.5, -46], xs: [33.5, 37.5, 41.5, 45.5], zs: [-58, -54, -50, -46] },
  // las nieblas de la pelea: al pie de la escalera y en la galería de la
  // salida
  nieblaE: { x: 27.5, z: -13.9 },
  nieblaS: { x: -9.0, z: -56 },
  // los aljibes ahogados y lo hondo
  aljibe1: { r: [-22.5, 44, -2.5, 60], xs: [-22.5, -18.5, -14.5, -10.5, -6.5, -2.5], zs: [44, 48, 52, 56, 60] },
  aljibe2: { r: [4.5, 44, 20.5, 60], xs: [4.5, 8.5, 12.5, 16.5, 20.5], zs: [44, 48, 52, 56, 60] },
  ninfeo: { r: [4, 4, 32, 24], xs: [4, 11, 18, 25, 32], zs: [4, 9, 14, 19, 24] },
  semillero: { r: [-10.5, -8, 1.5, 0], xs: [-10.5, -6.5, -2.5, 1.5], zs: [-8, -4, 0] },
  pozoTapa: { r: [30.5, 32, 34.5, 36] },
};

// Los braseros de la lobera: en los cruces (en una esquina) y en las salas.
// (id, x, z)
function braseros() {
  const out = [];
  const enCruce = [
    [4, 0],
    [2, 1],
    [0, 1],
    [0, 3],
    [1, 5],
    [3, 4],
    [4, 2],
    [5, 2],
    [6, 0],
    [6, 3],
  ];
  for (const [c, r] of enCruce) out.push({ id: 'br_' + c + r, x: MX[c] + 1.05, z: MZ[r] + 1.05, nodo: L_(c, r) });
  out.push({ id: 'br_pozo1', x: 11.5, z: -40.6, nodo: 'sala:pozo' });
  out.push({ id: 'br_pozo2', x: 19.5, z: -31.4, nodo: 'sala:pozo' });
  out.push({ id: 'br_osario', x: 39.5, z: -52, nodo: 'sala:osario' });
  return out;
}
export const BRASEROS = braseros();

export function buildHondas(ctx, G, L) {
  const grids = [
    { grid: G.Q, y0: CLOACA.y0, y1: CLOACA.y1 },
    { grid: G.H1, y0: HONDAS.grids.H1.y0, y1: HONDAS.grids.H1.y1 },
    { grid: G.H2, y0: HONDAS.grids.H2.y0, y1: HONDAS.grids.H2.y1 },
    { grid: G.H3, y0: HONDAS.grids.H3.y0, y1: HONDAS.grids.H3.y1 },
    { grid: G.H4, y0: HONDAS.grids.H4.y0, y1: HONDAS.grids.H4.y1 },
  ];
  const Y = HONDAS.y;
  const VE = VERGEL;
  // ---------------------------------------------------------- los niveles
  // la galería del desagüe (sala de la luz -> rellano del Vergel)
  const desague = {
    id: 'desague',
    y: VE.boca.y,
    room: 'cloaca_desague',
    grids,
    salas: [
      { id: 'luz', externa: true, r: [CLOACA.sala.x0, CLOACA.sala.z0, CLOACA.sala.x1, CLOACA.sala.z1], y: CLOACA.sala.y, ys: CLOACA.sala.top, room: 'cloaca_luz', bocas: [{ id: 'e', side: 'e', at: DESAGUE.z, y: VE.boca.y }] },
      { id: 'vergel', externa: true, r: VE.sala, y: VE.y, ys: VE.ys, room: 'vergel', bocas: [{ id: 'w', side: 'w', at: VE.boca.z, y: VE.boca.y }, { id: 'n', side: 'n', at: VE.norte.x }] },
    ],
    tramos: [['luz.e', 'vergel.w', { tipo: 'canal', flow: 0.7, canos: 0 }]],
  };
  // la galería de la Sé y la escalera que baja a la lobera
  const se = {
    id: 'se',
    y: Y.se,
    room: 'cloaca_se',
    grids,
    tint: [0.38, 0.38, 0.36],
    nodos: { se1: [HONDAS.se.x, HONDAS.se.nodo] },
    tramos: [
      ['vergel.n', 'se1', { tipo: 'seco', canos: 0 }],
      ['se1', L_(4, 0), { tipo: 'seco', room: 'cloaca_se' }],
    ],
  };
  // la lobera
  const n1 = {
    id: 'n1',
    y: Y.n1,
    room: 'lobera',
    grids,
    tint: [0.36, 0.36, 0.34],
    suelo: [0.4, 0.39, 0.36],
    nodos: {},
    tramos: [],
    salas: [
      { id: 'pozo', ...HONDAS.pozo, y: Y.n1, sp: 3.0, rise: 1.95, room: 'lobera_pozo', ribs: true, oculi: [{ i: 1, j: 1, k: 2, top: -2.2, mat: 'ashlar', tint: [0.34, 0.34, 0.32] }], bocas: [{ id: 'w2', side: 'w', at: MZ[2] }, { id: 'w3', side: 'w', at: MZ[3] }, { id: 'n2', side: 'n', at: MX[2] }], canal: [[9.5, -32.5, 21.5, -31.5]], flow: [0.4, 0] },
      { id: 'osario', ...HONDAS.osario, y: Y.n1, sp: 2.8, rise: 1.95, room: 'lobera_osario', bocas: [{ id: 'w4', side: 'w', at: MZ[4] }, { id: 'w5', side: 'w', at: MZ[5] }, { id: 's5', side: 's', at: MX[5] }] },
    ],
  };
  const reservado = new Set(['2,2', '3,2', '2,3', '3,3', '5,4', '6,4', '5,5', '6,5']);
  for (let c = 0; c < MX.length; c++) for (let r = 0; r < MZ.length; r++) if (!reservado.has(c + ',' + r)) n1.nodos[L_(c, r)] = [MX[c], MZ[r]];
  // (las galerías del laberinto: canal, salvo las ahogadas y las secas)
  const lab = [
    [0, 0, 0, 1],
    [0, 0, 1, 0, 'seco'],
    [0, 1, 1, 1],
    [0, 2, 0, 3],
    [0, 2, 1, 2],
    [0, 3, 0, 4, 'ahogado'],
    [0, 3, 1, 3],
    [0, 4, 0, 5],
    [0, 4, 1, 4],
    [0, 5, 1, 5],
    [1, 0, 2, 0],
    [1, 1, 1, 2],
    [1, 4, 1, 5, 'seco'],
    [1, 5, 2, 5],
    [2, 0, 2, 1],
    [2, 1, 3, 1],
    [2, 4, 2, 5],
    [2, 5, 3, 5, 'ahogado'],
    [3, 0, 3, 1],
    [3, 0, 4, 0, 'seco'],
    [3, 4, 3, 5],
    [3, 4, 4, 4],
    [3, 5, 4, 5],
    [4, 1, 4, 2],
    [4, 1, 5, 1],
    [4, 2, 4, 3, 'ahogado'],
    [4, 3, 4, 4],
    [5, 0, 5, 1],
    [5, 0, 6, 0, 'seco'],
    [5, 2, 5, 3],
    [5, 2, 6, 2],
    [5, 3, 6, 3],
    [6, 0, 6, 1],
    [6, 1, 6, 2, 'ahogado'],
    [6, 2, 6, 3],
  ];
  for (const [c0, r0, c1, r1, tipo] of lab) n1.tramos.push([L_(c0, r0), L_(c1, r1), { tipo: tipo || 'canal', flow: 0.35 }]);
  n1.tramos.push([L_(1, 2), 'pozo.w2', { tipo: 'canal', flow: 0.35 }], [L_(1, 3), 'pozo.w3', { tipo: 'canal' }], [L_(2, 4), 'pozo.n2', { tipo: 'seco' }]);
  n1.tramos.push([L_(4, 4), 'osario.w4', { tipo: 'seco' }], [L_(4, 5), 'osario.w5', { tipo: 'seco' }], [L_(5, 3), 'osario.s5', { tipo: 'seco' }]);
  // (la salida: a poniente, el cruce de la bajada; y la escalera a las viejas)
  n1.nodos.x1 = [-12.5, -56];
  n1.tramos.push([L_(0, 5), 'x1', { tipo: 'seco' }]);
  // las cloacas viejas
  const VX = [-20.5, -12.5, -4.5],
    VZ = [-40, -30, -20, -10, 0, 10, 20, 30];
  const V_ = (c, r) => 'V' + c + r;
  const n2 = { id: 'n2', y: Y.n2, room: 'viejas', grids, mat: 'wallstone', tint: [0.4, 0.38, 0.34], suelo: [0.38, 0.36, 0.32], nodos: {}, tramos: [] };
  for (let c = 0; c < 3; c++) for (let r = 0; r < VZ.length; r++) n2.nodos[V_(c, r)] = [VX[c], VZ[r]];
  const viejas = [
    // el camino (de la bajada, al norte, a la de los aljibes, al sur)
    [1, 0, 0, 0],
    [0, 0, 0, 1],
    [0, 1, 0, 2, 'ahogado'],
    [0, 2, 1, 2],
    [1, 2, 2, 2],
    [2, 2, 2, 3, 'ahogado'],
    [2, 3, 1, 3],
    [1, 3, 1, 4, 'seco'],
    [1, 4, 0, 4],
    [0, 4, 0, 5],
    [0, 5, 0, 6, 'ahogado'],
    [0, 6, 1, 6],
    [1, 6, 2, 6],
    [2, 6, 2, 7],
    [2, 7, 1, 7],
    // los ramales sin salida
    [1, 0, 2, 0],
    [2, 0, 2, 1, 'ahogado'],
    [1, 0, 1, 1, 'ahogado'],
    [1, 2, 1, 1, 'seco'],
    [2, 3, 2, 4],
    [2, 4, 2, 5, 'seco'],
    [2, 5, 1, 5],
    [0, 2, 0, 3, 'seco'],
    [1, 6, 1, 5, 'ahogado'],
    [1, 7, 0, 7],
  ];
  for (const [c0, r0, c1, r1, tipo] of viejas) n2.tramos.push([V_(c0, r0), V_(c1, r1), { tipo: tipo || 'canal', flow: 0.45 }]);
  // (los cruces sin galería en el plano, fuera)
  for (const k of Object.keys(n2.nodos)) if (!n2.tramos.some((t) => t[0] === k || t[1] === k)) delete n2.nodos[k];
  // la bajada de la lobera a las viejas
  n2.tramos.push(['x1', V_(1, 0), { tipo: 'seco', room: 'viejas' }]);
  // los aljibes ahogados
  const n3 = {
    id: 'n3',
    y: Y.n3,
    room: 'aljibes',
    grids,
    tint: [0.4, 0.42, 0.4],
    aguaDeep: 0x040908,
    aguaSky: 0x12201c,
    aguaGlint: 0x6a9a8a,
    salas: [
      { id: 'al1', ...HONDAS.aljibe1, y: Y.n3, sp: 3.0, rise: 1.95, tipo: 'ahogado', room: 'aljibes', bocas: [{ id: 'n', side: 'n', at: -12.5 }, { id: 'e', side: 'e', at: 54 }], flow: [0.05, 0.08] },
      { id: 'al2', ...HONDAS.aljibe2, y: Y.n3, sp: 3.0, rise: 1.95, tipo: 'estanque', anden: 1.6, hondo: 2.8, room: 'aljibes', bocas: [{ id: 'w', side: 'w', at: 54 }, { id: 'n', side: 'n', at: 14.5 }] },
    ],
    tramos: [
      [V_(1, 7), 'al1.n', { tipo: 'seco', room: 'aljibes' }],
      ['al1.e', 'al2.w', { tipo: 'ahogado', flow: 0.2 }],
    ],
  };
  // lo hondo
  const n4 = {
    id: 'n4',
    y: Y.n4,
    room: 'hondo',
    grids,
    tint: [0.4, 0.42, 0.38],
    suelo: [0.36, 0.38, 0.32],
    nodos: { h0: [14.5, 30], h4: [38.5, 21.5], h5: [38.5, 34], h6: [-4.5, 11.5] },
    salas: [
      { id: 'ninfeo', ...HONDAS.ninfeo, y: Y.n4, sp: 4.5, rise: 2.45, room: 'hondo', ribs: true, bocas: [{ id: 's', side: 's', at: 14.5 }, { id: 'e', side: 'e', at: 21.5 }, { id: 'w', side: 'w', at: 11.5 }], canal: [[17.5, 4, 18.5, 24]], flow: [0, 0.3] },
      { id: 'semillero', ...HONDAS.semillero, y: Y.n4, sp: 3.2, rise: 1.95, room: 'hondo_semillero', bocas: [{ id: 's', side: 's', at: -4.5 }] },
      { id: 'pozoTapa', r: HONDAS.pozoTapa.r, xs: [30.5, 34.5], zs: [32, 36], y: Y.n4, sp: 2.6, rise: 1.95, room: 'hondo_pozo', oculi: [{ i: 0, j: 0, k: 3, top: Y.n4 + 9, mat: 'ashlar', tint: [0.3, 0.3, 0.28] }], bocas: [{ id: 'e', side: 'e', at: 34 }] },
    ],
    tramos: [
      ['al2.n', 'h0', { tipo: 'seco', room: 'hondo' }],
      ['h0', 'ninfeo.s', { tipo: 'seco' }],
      ['ninfeo.e', 'h4', { tipo: 'seco' }],
      ['h4', 'h5', { tipo: 'ahogado', flow: 0.2 }],
      ['h5', 'pozoTapa.e', { tipo: 'seco' }],
      ['ninfeo.w', 'h6', { tipo: 'canal', flow: -0.3 }],
      ['h6', 'semillero.s', { tipo: 'seco' }],
    ],
  };
  const R = red(ctx, [desague, se, n1, n2, n3, n4]);
  // ---------------------------------------------------------- lo de cada sitio
  galeriaSe(ctx, L);
  lobera(ctx, L, R);
  cloacasViejas(ctx, L, R);
  aljibes(ctx, L, R);
  hondo(ctx, L, R);
  luces(ctx, R);
  zonas(L);
  mapa(L, R);
  return R;
}

// ------------------------------------------------------------------------ la galería de la Sé
// Lo verde que se muere, la negrura que rezuma, los zarpazos, la cabra; la
// reja con su cadena (la puerta: game/interact.js; la cadena y el candado,
// en su grupo, que se oculta al abrirla).
function galeriaSe(ctx, L) {
  const wb = ctx.wb;
  const S = HONDAS.se;
  const y = HONDAS.y.se;
  const h = KIT.w / 2;
  const x0 = S.x - h,
    x1 = S.x + h;
  const room = 'cloaca_se';
  wb.setRoom(room);
  // la reja: la puerta de hierro de dos hojas (game/interact.js) y su marco
  const rz = S.reja;
  const top = y + KIT.sp + h;
  wb.box('iron', x0, y, rz - 0.06, x0 + 0.08, y + KIT.sp, rz + 0.06, { ao: false, faces: 'tnsew' });
  wb.box('iron', x1 - 0.08, y, rz - 0.06, x1, y + KIT.sp, rz + 0.06, { ao: false, faces: 'tnsew' });
  // (el tímpano: barrotes fijos bajo el arco)
  for (let x = x0 + 0.2; x < x1 - 0.1; x += 0.24) {
    const yt = y + KIT.sp + Math.sqrt(Math.max(0, h * h - (x - S.x) ** 2)) - 0.04;
    if (yt > y + KIT.sp + 0.08) wb.box('iron', x - 0.02, y + KIT.sp - 0.02, rz - 0.02, x + 0.02, yt, rz + 0.02, { ao: false, faces: 'tnsew' });
  }
  wb.box('iron', x0, y + KIT.sp - 0.06, rz - 0.05, x1, y + KIT.sp + 0.02, rz + 0.05, { ao: false, faces: 'tnsewb' });
  void top;
  L.interact.push({ kind: 'door', id: 'd_reja_se', x: S.x, y, z: rz, w: KIT.w - 0.16, h: KIT.sp - 0.06, axis: 'x', lock: { type: 'key', item: 'llave_reja' }, mat: 'irongate', hinge: 0, swing: -1, double: true, plane: rz });
  // la cadena y el candado, por el lado del Vergel (se van al abrirla)
  ctx.beginGroup('reja_se_cadena');
  for (let k = 0; k < 9; k++) {
    const a = k / 8;
    const px = S.x - 0.45 + a * 0.9,
      py = y + 1.05 + Math.sin(a * Math.PI) * -0.12;
    P.rod(ctx, V(px, py, rz + 0.1), V(px + 0.1, py + (k % 2 ? 0.03 : -0.03), rz + 0.1), 0.012, 0.012, 'iron', { segs: 4 });
  }
  wb.box('iron', S.x - 0.07, y + 0.82, rz + 0.08, S.x + 0.07, y + 0.98, rz + 0.14, { ao: false, faces: 'tnsewb', tint: [0.5, 0.42, 0.3] });
  ctx.endGroup();
  // los zarpazos: cuatro surcos, más altos que un hombre
  const zarpa = (x, yy, z, nx, ang, s = 1) => {
    for (let k = 0; k < 4; k++) {
      const off = (k - 1.5) * 0.07 * s;
      const dz = Math.cos(ang) * 0.42 * s,
        dy = Math.sin(ang) * 0.42 * s;
      const a = V(x + nx * 0.006, yy + off, z + off * 0.3),
        b = V(x + nx * 0.006, yy + off + dy, z + off * 0.3 + dz);
      wb.quad('black', a, b, b.clone().add(V(0, 0.018, 0)), a.clone().add(V(0, 0.018, 0)), { ao: false, grime: false, tint: [0.2, 0.18, 0.16] });
      wb.quad('black', a.clone().add(V(0, 0.018, 0)), b.clone().add(V(0, 0.018, 0)), b, a, { ao: false, grime: false, tint: [0.2, 0.18, 0.16] });
    }
  };
  zarpa(x0, y + 2.0, 9.2, 1, -0.7);
  zarpa(x1, y + 2.3, 7.4, -1, -0.5, 1.1);
  zarpa(x0, y + 1.6, 4.2, 1, -0.9, 0.9);
  zarpa(x1, y + 1.9, 2.4, -1, -0.6);
  // la negrura que rezuma, y lo que se muere
  const rr = new RNG(12701);
  for (let k = 0; k < 9; k++) {
    const x = x0 + 0.4 + rr.range(0, KIT.w - 0.8),
      z = 3.0 + rr.range(0, 8);
    P.ellipsoid(ctx, 'negrura', x, y + 0.005, z, rr.range(0.25, 0.6), 0.02, rr.range(0.25, 0.7), null, { room });
  }
  for (let k = 0; k < 6; k++) musgo(ctx, x0 + 0.3 + rr.range(0, 2.6), y, 7.5 + rr.range(0, 3.5), 0.5, 0.4, 12720 + k, { room, n: 6, k: [0.25, 0.22, 0.2] });
  helecho(ctx, x0 + 0.4, y, 10.6, 0.8, 12731, { room, k: [0.42, 0.3, 0.2] });
  helecho(ctx, x1 - 0.5, y, 8.8, 0.7, 12732, { room, k: [0.3, 0.24, 0.18] });
  // la cabra: arrastrada hacia lo oscuro y dejada a medias (al otro lado de
  // la reja: se la llevó por debajo)
  {
    const cx = S.x + 0.4,
      cz = 3.8,
      ry = 0.5;
    wb.at(cx, y, cz, ry, () => {
      P.ellipsoid(ctx, 'hide', 0, 0.2, 0, 0.3, 0.18, 0.5, [0.62, 0.58, 0.52], { room });
      P.ellipsoid(ctx, 'flesh', 0.18, 0.2, 0.05, 0.12, 0.14, 0.3, [0.5, 0.2, 0.18], { room });
      P.ellipsoid(ctx, 'hide', -0.05, 0.16, 0.62, 0.12, 0.11, 0.18, [0.6, 0.56, 0.5], { room });
      for (const [lx, lz, a] of [
        [-0.12, -0.35, 0.3],
        [0.1, -0.38, -0.2],
        [-0.15, 0.3, 0.5],
      ])
        P.rod(ctx, V(lx, 0.15, lz), V(lx + Math.sin(a) * 0.4, 0.06, lz - 0.3), 0.03, 0.02, 'hide', { segs: 3, tint: [0.58, 0.54, 0.48] });
      P.rod(ctx, V(-0.02, 0.24, 0.7), V(-0.14, 0.3, 0.86), 0.015, 0.006, 'bone', { segs: 3 });
      P.rod(ctx, V(0.06, 0.24, 0.7), V(0.12, 0.31, 0.86), 0.015, 0.006, 'bone', { segs: 3 });
    });
    P.decal(ctx, cx, y + 0.02, cz - 0.6, 1.4, 'splat', 0.9);
    for (let k = 0; k < 5; k++) P.decal(ctx, cx - 0.1 + k * 0.05, y + 0.02, cz + 0.8 + k * 0.6, 0.4, 'splat', 0.5);
  }
  // (el surco por debajo de la reja: por ahí la metió)
  wb.box('black', S.x + 0.1, y - 0.02, rz - 0.3, S.x + 0.8, y + 0.002, rz + 0.3, { ao: false, faces: 't', grime: false, tint: [0.3, 0.26, 0.22] });
  wb.setRoom(null);
  L.interact.push(
    { kind: 'examine', id: 'x_zarpazos', text: 'zarpazos', x: x0 + 0.6, y, z: 9.2, r: 1.3 },
    { kind: 'examine', id: 'x_cabra', text: 'cabraOscuro', x: S.x + 0.4, y, z: rz - 1.2, r: 1.4 }
  );
}

// Un brasero de hierro, apagado: sus brasas negras; lo de cuando arde (el
// fuego, su luz y las brasas encendidas), en su grupo (game/lobishome.js).
function brasero(ctx, b, y, room) {
  const wb = ctx.wb;
  const { x, z } = b;
  wb.setRoom(room);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    P.rod(ctx, V(x + Math.cos(a) * 0.32, y, z + Math.sin(a) * 0.32), V(x + Math.cos(a) * 0.2, y + 0.82, z + Math.sin(a) * 0.2), 0.025, 0.025, 'iron', { segs: 4 });
  }
  wb.cylinder('iron', x, y + 0.72, z, 0.2, 0.38, 0.26, 9, { ao: false, capBot: true });
  wb.cylinder('black', x, y + 0.92, z, 0.34, 0.34, 0.02, 9, { ao: false, capTop: true, grime: false, tint: [0.2, 0.18, 0.16] });
  ctx.col.add(x - 0.38, y, z - 0.38, x + 0.38, y + 1.0, z + 0.38);
  ctx.beginGroup('brasero:' + b.id);
  wb.cylinder('ember', x, y + 0.93, z, 0.33, 0.33, 0.02, 9, { ao: false, capTop: true, grime: false });
  ctx.fires.push({ x, y: y + 0.95, z, s: 0.9 });
  if (ctx.dynLights) ctx.dynLights.push({ x, y: y + 1.5, z, intensity: 4.2, range: 9, color: 0xff8a40, flicker: 0.6, priority: 3 });
  ctx.endGroup();
  wb.setRoom(null);
}

// ------------------------------------------------------------------------ la lobera
function lobera(ctx, L, R) {
  const wb = ctx.wb;
  const y = HONDAS.y.n1;
  const rr = new RNG(20101);
  // los braseros
  for (const b of BRASEROS) brasero(ctx, b, y, b.nodo === 'sala:pozo' ? 'lobera_pozo' : b.nodo === 'sala:osario' ? 'lobera_osario' : 'lobera');
  L.braseros = BRASEROS.map((b) => ({ ...b, y }));
  for (const b of BRASEROS) L.interact.push({ kind: 'brasero', id: 'ib_' + b.id, brasero: b.id, x: b.x, y, z: b.z, r: 1.6 });
  // lo que caza y deja: huesos, jirones, un perro, un soldado, los candiles
  // del Desfigurado (los trajo hasta aquí y se le cayeron)
  wb.setRoom('lobera');
  const restos = [
    [0, 0],
    [2, 0],
    [1, 4],
    [5, 1],
    [6, 2],
    [3, 5],
    [0, 4],
  ];
  restos.forEach(([c, r], k) => {
    const x = MX[c] + rr.range(-1.0, 1.0),
      z = MZ[r] + rr.range(-1.0, 1.0);
    P.bones(ctx, x, y, z, 6 + (k % 3) * 2, 20110 + k, 0.7);
    if (k % 2 === 0) P.decal(ctx, x, y + 0.02, z, 1.2, 'splat', rr.range(0, 6));
  });
  // (el perro, junto al primer cruce; el soldado, en el ramal del este)
  P.ellipsoid(ctx, 'hide', MX[3] - 0.6, y + 0.16, MZ[0] + 0.9, 0.42, 0.16, 0.22, [0.42, 0.34, 0.28], { room: 'lobera' });
  P.ellipsoid(ctx, 'flesh', MX[3] - 0.3, y + 0.18, MZ[0] + 0.9, 0.16, 0.12, 0.14, [0.48, 0.2, 0.16], { room: 'lobera' });
  for (let k = 0; k < 4; k++) {
    const x = MX[4] - 0.6 + k * 0.4,
      z = MZ[0] + 1.2 - k * 0.1;
    wb.cylinder('candle', x, y, z, 0.03, 0.03, 0.06, 6, { ao: false, capTop: true, tint: [0.8, 0.76, 0.66] });
    wb.cylinder('plaster', x + 0.2, y, z + 0.15, 0.06, 0.05, 0.04, 8, { ao: false, capTop: true, capBot: true, tint: [0.62, 0.42, 0.3] });
  }
  // los zarpazos por las esquinas de los cruces
  for (let k = 0; k < 10; k++) {
    const c = rr.int(0, MX.length - 1),
      r = rr.int(0, MZ.length - 1);
    const n = R.N[L_(c, r)];
    if (!n) continue;
    const side = ['n', 's', 'e', 'w'].find((sd) => !n.conn[sd]);
    if (!side) continue;
    const h = KIT.w / 2;
    const px = side === 'e' ? n.x + h - 0.006 : side === 'w' ? n.x - h + 0.006 : n.x + rr.range(-0.8, 0.8);
    const pz = side === 's' ? n.z + h - 0.006 : side === 'n' ? n.z - h + 0.006 : n.z + rr.range(-0.8, 0.8);
    const yy = y + rr.range(1.4, 2.3);
    for (let q = 0; q < 4; q++) {
      const off = (q - 1.5) * 0.07;
      const along = side === 'n' || side === 's' ? V(0.3, -0.25, 0) : V(0, -0.25, 0.3);
      const a = V(px + (side === 'n' || side === 's' ? off : 0), yy + off, pz + (side === 'e' || side === 'w' ? off : 0));
      const b2 = a.clone().add(along);
      const up = V(0, 0.018, 0);
      wb.quad('black', a, b2, b2.clone().add(up), a.clone().add(up), { ao: false, grime: false, tint: [0.2, 0.18, 0.16] });
      wb.quad('black', a.clone().add(up), b2.clone().add(up), b2, a, { ao: false, grime: false, tint: [0.2, 0.18, 0.16] });
    }
  }
  wb.setRoom(null);
  // el pozo de las ánimas: el tiro, con su raya de luna y el brocal de
  // arriba (de una casa: no se ve la calle), las flores blancas que han
  // crecido donde cae la luz
  {
    const Pz = HONDAS.pozo;
    const cx = (Pz.xs[1] + Pz.xs[2]) / 2,
      cz = (Pz.zs[1] + Pz.zs[2]) / 2;
    wb.setRoom('lobera_pozo');
    for (let k = 0; k < 14; k++) {
      const a = rr.range(0, Math.PI * 2),
        d = rr.range(0.1, 1.6);
      const x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      if (Math.abs(z - (-32)) < 0.9) continue;
      if (k % 2) flores(ctx, x, y, z, 0.25, 6, 20201 + k, { room: 'lobera_pozo', h: 0.9 });
      else musgo(ctx, x, y, z, 0.5, 0.4, 20221 + k, { room: 'lobera_pozo', n: 5 });
    }
    for (let k = 0; k < 6; k++) hiedra(ctx, cx - 0.9 + (k % 3) * 0.9, -2.4, cz + (k < 3 ? -0.98 : 0.98), rr.range(3, 7), 20241 + k, { room: 'lobera_pozo', dir: [0, k < 3 ? 1 : -1], hoja: 1.1 });
    wb.setRoom(null);
    // (lo alto del tiro: la luna, en un trozo de cielo)
    ctx.cielosHondos = ctx.cielosHondos || [];
    ctx.cielosHondos.push({ x: cx, z: cz, y: -2.3, s: 1.9 });
  }
  // el osario: los nichos de pared a pared, con lo que entierra; su cama de
  // jirones y paja; la pala rota
  {
    const O = HONDAS.osario;
    const room = 'lobera_osario';
    wb.setRoom(room);
    const [ox0, oz0, ox1, oz1] = O.r;
    // (los nichos: en el muro del norte y en el de levante, tres hileras)
    for (const [side, a0, a1, line] of [
      ['n', ox0 + 0.6, ox1 - 0.6, oz0],
      ['e', oz0 + 0.6, oz1 - 2.2, ox1],
    ])
      for (let row = 0; row < 3; row++)
        for (let u = a0; u < a1 - 0.7; u += 0.95) {
          const yy = y + 0.35 + row * 0.75;
          if (side === 'n') {
            wb.box('black', u, yy, line + 0.004, u + 0.7, yy + 0.5, line + 0.006, { faces: 's', ao: false, grime: false, tint: [0.12, 0.1, 0.1] });
            if ((u * 7 + row) % 3 < 1.2) P.ellipsoid(ctx, 'burlap', u + 0.35, yy + 0.18, line + 0.15, 0.3, 0.16, 0.14, [0.46, 0.4, 0.32], { room });
          } else {
            wb.box('black', line - 0.006, yy, u, line - 0.004, yy + 0.5, u + 0.7, { faces: 'w', ao: false, grime: false, tint: [0.12, 0.1, 0.1] });
            if ((u * 5 + row) % 3 < 1.2) P.ellipsoid(ctx, 'burlap', line - 0.15, yy + 0.18, u + 0.35, 0.14, 0.16, 0.3, [0.46, 0.4, 0.32], { room });
          }
        }
    // la cama: paja y jirones, en el rincón del nordeste
    for (let k = 0; k < 7; k++) P.ellipsoid(ctx, k % 2 ? 'straw' : 'burlap', ox1 - 1.4 + rr.range(-0.6, 0.6), y + 0.06, oz0 + 1.4 + rr.range(-0.6, 0.6), rr.range(0.3, 0.6), 0.07, rr.range(0.3, 0.6), k % 2 ? [0.6, 0.54, 0.36] : [0.42, 0.34, 0.28], { room });
    P.bones(ctx, ox1 - 2.6, y, oz0 + 2.8, 18, 20301, 1.2);
    P.bones(ctx, ox0 + 2.0, y, oz1 - 2.0, 12, 20302, 1.0);
    // la pala rota del sepulturero, y su farol, apagado
    P.rod(ctx, V(ox0 + 3.0, y + 0.03, oz0 + 3.2), V(ox0 + 4.1, y + 0.05, oz0 + 2.7), 0.025, 0.022, 'wooddark', { segs: 4 });
    wb.at(ox0 + 4.15, y + 0.03, oz0 + 2.68, 0.4, () => wb.box('iron', -0.12, 0, -0.02, 0.12, 0.02, 0.18, { ao: false, faces: 'tnsewb', tint: [0.5, 0.42, 0.34] }));
    wb.setRoom(null);
    L.interact.push({ kind: 'examine', id: 'x_osario', text: 'osarioLobo', x: ox1 - 2.0, y, z: oz0 + 2.2, r: 1.6 });
  }
  // las nieblas de la pelea
  const E = HONDAS.nieblaE,
    S = HONDAS.nieblaS;
  L.interact.push({ kind: 'fog', id: 'f_lobo', boss: 'lobishome', x: E.x, y, z: E.z, w: KIT.w - 0.2, h: KIT.sp + 0.6, axis: 'x', enter: -1 });
  L.interact.push({ kind: 'fog', id: 'f_lobo2', boss: 'lobishome', x: S.x, y, z: S.z, w: KIT.w - 0.2, h: KIT.sp + 0.6, axis: 'z', enter: 1 });
  // el Lobishome (empieza en su osario; ver game/lobishome.js)
  const O = HONDAS.osario;
  L.enemies.push({ type: 'lobishome', x: (O.r[0] + O.r[2]) / 2 + 1.5, y, z: O.r[1] + 2.4, yaw: Math.PI, idle: 'boss', id: 'b_lobishome', boss: true });
}

// ------------------------------------------------------------------------ las cloacas viejas
function cloacasViejas(ctx, L, R) {
  const wb = ctx.wb;
  const y = HONDAS.y.n2;
  const rr = new RNG(20401);
  wb.setRoom('viejas');
  // los escombros de las bóvedas que ceden, los tablones que puso alguien
  for (const id of ['V01', 'V22', 'V13', 'V24', 'V05', 'V27']) {
    const n = R.N[id];
    if (!n) continue;
    P.rubble(ctx, n.x + rr.range(-0.8, 0.8), y, n.z + rr.range(-0.8, 0.8), 7, 20410 + id.charCodeAt(2), 0.8, { tint: [0.4, 0.38, 0.34] });
  }
  // un pocero muerto con su farol, en el ramal del este
  {
    const n = R.N['V25'] || R.N['V24'];
    if (n) {
      const x = n.x - 0.6,
        z = n.z + 0.4;
      P.ellipsoid(ctx, 'burlap', x, y + 0.18, z, 0.22, 0.16, 0.5, [0.44, 0.4, 0.34], { room: 'viejas' });
      P.ellipsoid(ctx, 'bone', x, y + 0.14, z - 0.58, 0.1, 0.1, 0.12, [0.8, 0.76, 0.66], { room: 'viejas' });
      wb.cylinder('iron', x + 0.5, y, z + 0.3, 0.08, 0.08, 0.2, 6, { ao: false, capTop: true, tint: [0.4, 0.36, 0.32] });
      L.interact.push({ kind: 'item', id: 'i_pocero', item: 'virote', n: 4, x: x + 0.2, y, z: z + 0.1 });
    }
  }
  for (const id of ['V11', 'V20', 'V03', 'V17']) {
    const n = R.N[id];
    if (n) P.bones(ctx, n.x + 0.5, y, n.z - 0.4, 8, 20450 + id.charCodeAt(2), 0.6);
  }
  // el musgo y las raíces, que aquí ya bajan de lo hondo hacia arriba no:
  // de arriba (el Vergel queda lejos), pocas
  for (let k = 0; k < 12; k++) {
    const ids = Object.keys(R.N).filter((s) => s.startsWith('V'));
    const n = R.N[ids[k % ids.length]];
    musgo(ctx, n.x + rr.range(-1.2, 1.2), y, n.z + rr.range(-1.2, 1.2), 0.5, 0.4, 20470 + k, { room: 'viejas', n: 5, k: [0.7, 0.8, 0.7] });
  }
  wb.setRoom(null);
  // los mastines de él (cazan por las viejas) y los rastreros
  L.enemies.push(
    { type: 'hound', x: -20.5, y, z: -30.6, yaw: 0, idle: 'eat', id: 'e_viejas1' },
    { type: 'hound', x: -4.5, y, z: -14.0, yaw: Math.PI, idle: 'eat', id: 'e_viejas2' },
    { type: 'crawler', x: -12.5, y, z: -5.5, yaw: Math.PI, idle: 'stand', id: 'e_viejas3' },
    { type: 'hound', x: -20.5, y, z: 6.5, yaw: 0, idle: 'eat', id: 'e_viejas4' },
    { type: 'crawler', x: -8.5, y, z: 20.0, yaw: -Math.PI / 2, idle: 'stand', id: 'e_viejas5' },
    { type: 'hound', x: -4.5, y, z: 25.5, yaw: Math.PI, idle: 'eat', id: 'e_viejas6' }
  );
}

// ------------------------------------------------------------------------ los aljibes ahogados
function aljibes(ctx, L, R) {
  const wb = ctx.wb;
  const y = HONDAS.y.n3;
  const rr = new RNG(20601);
  wb.setRoom('aljibes');
  // lo que flota y lo que está en el fondo: maderas, un ataúd que trajo el
  // agua, huesos bajo el agua
  const A1 = HONDAS.aljibe1;
  for (let k = 0; k < 8; k++) {
    const x = A1.r[0] + 1 + rr.range(0, A1.r[2] - A1.r[0] - 2),
      z = A1.r[1] + 1 + rr.range(0, A1.r[3] - A1.r[1] - 2);
    P.bones(ctx, x, y - KIT.prof, z, 5, 20610 + k, 0.5);
  }
  for (let k = 0; k < 5; k++) {
    const x = A1.r[0] + 2 + rr.range(0, A1.r[2] - A1.r[0] - 4),
      z = A1.r[1] + 2 + rr.range(0, A1.r[3] - A1.r[1] - 4);
    wb.at(x, y - KIT.ahog - 0.03, z, rr.range(0, Math.PI), () => wb.box('planks', -0.9, 0, -0.14, 0.9, 0.06, 0.14, { ao: false, faces: 'tnsewb', tint: [0.4, 0.34, 0.28] }));
  }
  wb.at(-8.2, y - KIT.prof, 57.2, 0.3, () => {
    wb.box('wooddark', -0.35, 0, -1.0, 0.35, 0.45, 1.0, { ao: false, faces: 'tnsew', tint: [0.36, 0.3, 0.26] });
  });
  // el estanque del segundo, con su verdín
  const A2 = HONDAS.aljibe2;
  for (let k = 0; k < 10; k++) {
    const sd = k % 4;
    const u = rr.range(0.1, 0.9);
    const [ax0, az0, ax1, az1] = [A2.r[0] + 1.6, A2.r[1] + 1.6, A2.r[2] - 1.6, A2.r[3] - 1.6];
    const x = sd === 0 ? ax0 - 0.3 : sd === 1 ? ax1 + 0.3 : ax0 + (ax1 - ax0) * u;
    const z = sd === 2 ? az0 - 0.3 : sd === 3 ? az1 + 0.3 : az0 + (az1 - az0) * u;
    musgo(ctx, x, y + 0.75, z, 0.4, 0.3, 20640 + k, { room: 'aljibes', n: 4 });
  }
  wb.setRoom(null);
  L.enemies.push(
    { type: 'crawler', x: -18.5, y: y - KIT.prof, z: 50.0, yaw: 0, idle: 'stand', id: 'e_aljibe1' },
    { type: 'crawler', x: -6.5, y: y - KIT.prof, z: 56.0, yaw: -Math.PI / 2, idle: 'stand', id: 'e_aljibe2' },
    { type: 'penitent', x: -12.5, y: y - KIT.prof, z: 58.0, yaw: Math.PI, idle: 'pray', id: 'e_aljibe3' },
    { type: 'crawler', x: 12.5, y, z: 58.6, yaw: Math.PI, idle: 'ceiling', id: 'e_aljibe4' }
  );
}

// Una raíz gorda: de un punto de la bóveda (a) a uno del suelo (b), con su
// comba (cuelga y se tuerce), que se adelgaza al bajar y, al llegar al
// suelo, se abre en raicillas que se agarran a las losas.
function raizGorda(ctx, a, b, r, seed, room) {
  const rng = new RNG(seed);
  const n = 9;
  const mid = a.clone().lerp(b, 0.5).add(V(rng.range(-0.8, 0.8), rng.range(-0.6, 0.4), rng.range(-0.8, 0.8)));
  const tint = [0.4 + rng.range(-0.04, 0.04), 0.34, 0.27];
  let prev = a.clone();
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    // (Bézier cuadrática, con su temblor)
    const p = a
      .clone()
      .multiplyScalar((1 - t) * (1 - t))
      .add(mid.clone().multiplyScalar(2 * (1 - t) * t))
      .add(b.clone().multiplyScalar(t * t))
      .add(V(Math.sin(t * 9 + seed) * 0.06, 0, Math.cos(t * 7 + seed) * 0.06));
    const ra = r * (1 - ((k - 1) / n) * 0.45),
      rb = r * (1 - (k / n) * 0.45);
    P.rod(ctx, prev, p, ra, rb, 'wooddark', { segs: 6, room, tint });
    if (k > 2 && k < n && rng.chance(0.3)) {
      const ang = rng.range(0, Math.PI * 2),
        L = rng.range(0.3, 0.9);
      P.rod(ctx, p, V(p.x + Math.cos(ang) * L, p.y - L * 0.7, p.z + Math.sin(ang) * L), rb * 0.45, rb * 0.12, 'wooddark', { segs: 4, room, tint });
    }
    prev = p;
  }
  // las raicillas del pie, por el suelo
  for (let q = 0; q < 4; q++) {
    const ang = rng.range(0, Math.PI * 2),
      L = rng.range(0.6, 1.6);
    P.rod(ctx, b, V(b.x + Math.cos(ang) * L, b.y + 0.02, b.z + Math.sin(ang) * L), r * 0.4, r * 0.08, 'wooddark', { segs: 4, room, tint });
  }
}

// ------------------------------------------------------------------------ lo hondo
// El ninfeo y sus galerías, reventados de raíces; lo verde que da luz por
// todas partes; las plantas que se mueven (L.enemies: plantas.js) y lo que
// se cosecha (L.cosechas: game/cloacas.js).
function hondo(ctx, L, R) {
  const wb = ctx.wb;
  const y = HONDAS.y.n4;
  const rr = new RNG(20801);
  const N = HONDAS.ninfeo;
  const [nx0, nz0, nx1, nz1] = N.r;
  const room = 'hondo';
  wb.setRoom(room);
  const enCanal = (x, z) => x > 17.2 && x < 18.8;
  const pilares = [];
  for (let i = 1; i < N.xs.length - 1; i++) for (let j = 1; j < N.zs.length - 1; j++) pilares.push([N.xs[i], N.zs[j]]);
  const libre = (x, z, m = 0.5) => x > nx0 + m && x < nx1 - m && z > nz0 + m && z < nz1 - m && !enCanal(x, z) && !pilares.some(([px, pz]) => Math.abs(px - x) < 0.5 + m && Math.abs(pz - z) < 0.5 + m);
  // las raíces gordas: de la bóveda al suelo, por los pilares y a lo largo
  // de los muros (las del árbol del huerto, y de todos los árboles de
  // arriba: aquí acaban)
  const crown = y + 4.5 + 2.45;
  // (de la clave de cada tramo, dos o tres, que bajan combándose hasta el
  // suelo, lejos de donde nacen; y las que bajan por los pilares)
  for (let i = 0; i < N.xs.length - 1; i++)
    for (let j = 0; j < N.zs.length - 1; j++) {
      const cx = (N.xs[i] + N.xs[i + 1]) / 2,
        cz = (N.zs[j] + N.zs[j + 1]) / 2;
      const n = 2 + ((i + j) % 2);
      for (let q = 0; q < n; q++) {
        const a = V(cx + rr.range(-1.2, 1.2), crown - 0.15, cz + rr.range(-1.0, 1.0));
        let bx = a.x + rr.range(-2.6, 2.6),
          bz = a.z + rr.range(-2.2, 2.2);
        bx = Math.max(nx0 + 0.6, Math.min(nx1 - 0.6, bx));
        bz = Math.max(nz0 + 0.6, Math.min(nz1 - 0.6, bz));
        if (enCanal(bx, bz)) bx += 1.4;
        raizGorda(ctx, a, V(bx, y + 0.05, bz), rr.range(0.07, 0.14), 20810 + i * 10 + j * 3 + q, room);
      }
      // (y las que cuelgan sin llegar)
      raizLarga(ctx, cx + rr.range(-1.5, 1.5), crown - 0.1, cz + rr.range(-1.5, 1.5), rr.range(2.0, 4.2), 20890 + i * 10 + j, { room, r: rr.range(0.03, 0.06), tint: [0.42, 0.36, 0.28] });
    }
  for (const [px, pz] of pilares)
    for (let q = 0; q < 2; q++) {
      const ang = rr.range(0, Math.PI * 2);
      const a = V(px + Math.cos(ang) * 0.55, y + 4.3, pz + Math.sin(ang) * 0.55);
      raizGorda(ctx, a, V(px + Math.cos(ang) * 1.4, y + 0.05, pz + Math.sin(ang) * 1.4), rr.range(0.06, 0.1), 20850 + Math.round(px * 3 + pz) + q, room);
    }
  // lo verde: helechos enormes, matas, hierba, musgo por todo, hongos que
  // dan luz, flores pálidas
  for (let k = 0; k < 220; k++) {
    const x = rr.range(nx0 + 0.4, nx1 - 0.4),
      z = rr.range(nz0 + 0.4, nz1 - 0.4);
    if (!libre(x, z, 0.3)) continue;
    // (el camino de la boca del sur a la del oeste, más limpio)
    const r = rr.next();
    if (r < 0.3) helecho(ctx, x, y, z, rr.range(1.4, 2.4), 20900 + k, { room, k: [0.8, 1.1, 0.9] });
    else if (r < 0.5) mata(ctx, x, y, z, rr.range(0.5, 1.0), 21200 + k, { room });
    else if (r < 0.7) hierba(ctx, x, y, z, 0.5, 14, 21500 + k, { room, h: 0.7, k: [0.7, 1.0, 0.85] });
    else if (r < 0.85) hongos(ctx, x, y, z, 7, 21800 + k, { room, luz: true, s: rr.range(1.0, 1.6), r: 0.4 });
    else flores(ctx, x, y, z, 0.35, 8, 22100 + k, { room, tint: rr.chance(0.5) ? [0.7, 0.9, 1.0] : [0.9, 1.0, 0.8], h: 1.2 });
    if (k % 3 === 0) musgo(ctx, x, y, z, 0.8, 0.7, 22400 + k, { room, n: 7, k: [0.8, 1.1, 0.9] });
  }
  // la hiedra que baja de los lunetos y de los capiteles
  for (let k = 0; k < 40; k++) {
    const sd = k % 4;
    const u = rr.range(0.05, 0.95);
    const x = sd === 0 ? nx0 + 0.05 : sd === 1 ? nx1 - 0.05 : nx0 + (nx1 - nx0) * u;
    const z = sd === 2 ? nz0 + 0.05 : sd === 3 ? nz1 - 0.05 : nz0 + (nz1 - nz0) * u;
    const dir = sd === 0 ? [1, 0] : sd === 1 ? [-1, 0] : sd === 2 ? [0, 1] : [0, -1];
    hiedra(ctx, x, y + 4.5 + rr.range(0, 1.4), z, rr.range(2.4, 5.6), 22700 + k, { room, dir, hoja: 1.9 });
  }
  wb.setRoom(null);
  // el semillero (al oeste): donde crece la flor de lo hondo
  {
    const Sm = HONDAS.semillero;
    const [sx0, sz0, sx1, sz1] = Sm.r;
    wb.setRoom('hondo_semillero');
    for (let k = 0; k < 70; k++) {
      const x = rr.range(sx0 + 0.4, sx1 - 0.4),
        z = rr.range(sz0 + 0.4, sz1 - 0.4);
      if (Math.abs(x - -6.5) < 0.6 && Math.abs(z - -4) < 0.6) continue;
      if (Math.abs(x - -2.5) < 0.6 && Math.abs(z - -4) < 0.6) continue;
      const r = rr.next();
      if (r < 0.4) helecho(ctx, x, y, z, rr.range(1.2, 2.0), 23000 + k, { room: 'hondo_semillero', k: [0.75, 1.0, 1.0] });
      else if (r < 0.7) hongos(ctx, x, y, z, 6, 23100 + k, { room: 'hondo_semillero', luz: true, s: 1.3, r: 0.35 });
      else flores(ctx, x, y, z, 0.3, 7, 23200 + k, { room: 'hondo_semillero', tint: [0.86, 0.9, 1.0], h: 1.0 });
    }
    for (let k = 0; k < 7; k++) {
      const a = V(rr.range(sx0 + 0.8, sx1 - 0.8), y + 3.2 + 1.8, rr.range(sz0 + 0.8, sz1 - 0.8));
      raizGorda(ctx, a, V(Math.max(sx0 + 0.6, Math.min(sx1 - 0.6, a.x + rr.range(-2, 2))), y + 0.05, Math.max(sz0 + 0.6, Math.min(sz1 - 0.6, a.z + rr.range(-2, 2)))), rr.range(0.06, 0.11), 23300 + k, 'hondo_semillero');
    }
    wb.setRoom(null);
  }
  // las galerías: raíces que entran por las juntas y musgo
  for (const id of ['h0', 'h4', 'h5', 'h6']) {
    const n = R.N[id];
    wb.setRoom(room);
    raices(ctx, n.x, y + KIT.sp + 1.6, n.z, 6, 2.6, 23400 + id.charCodeAt(1), { room });
    for (let k = 0; k < 4; k++) {
      const x = n.x + rr.range(-1.2, 1.2),
        z = n.z + rr.range(-1.2, 1.2);
      if (Math.abs(x - n.x) < 0.6 && Math.abs(z - n.z) < 0.6) continue;
      helecho(ctx, x, y, z, rr.range(0.9, 1.5), 23410 + k + id.charCodeAt(1) * 7, { room });
    }
    wb.setRoom(null);
  }
  // el pozo de la tapa: sus grapas de hierro, que suben a lo negro
  {
    const Pt = HONDAS.pozoTapa.r;
    const cx = (Pt[0] + Pt[2]) / 2,
      cz = (Pt[1] + Pt[3]) / 2;
    wb.setRoom('hondo_pozo');
    for (let k = 0; k < 22; k++) {
      const yy = y + 0.4 + k * 0.35;
      wb.box('iron', cx - 0.25, yy, cz - 1.0, cx + 0.25, yy + 0.04, cz - 0.94, { ao: false, faces: 'tnsewb', tint: [0.4, 0.34, 0.3] });
    }
    // (lo alto del tiro, tapado: negro)
    wb.box('black', cx - 1.2, y + 8.9, cz - 1.2, cx + 1.2, y + 8.92, cz + 1.2, { faces: 'b', ao: false, grime: false });
    wb.setRoom(null);
    L.interact.push({ kind: 'trepa', id: 'pozo_tapa', x: cx, y, z: cz - 0.6, r: 1.4, to: [VERGEL.tapa.x + 0.9, VERGEL.y, VERGEL.tapa.z, Math.PI / 2] });
  }
  // lo que se cosecha: el musgo de luz (en muchos sitios), la raíz amarga
  // (en las raíces gordas del ninfeo y las galerías) y la flor de lo hondo
  // (en el semillero y donde no llega nadie)
  L.cosechas = [
    { id: 'c_musgo1', item: 'musgo_luz', x: 7.4, z: 6.6 },
    { id: 'c_musgo2', item: 'musgo_luz', x: 29.0, z: 7.2 },
    { id: 'c_musgo3', item: 'musgo_luz', x: 22.6, z: 21.8 },
    { id: 'c_musgo4', item: 'musgo_luz', x: 38.8, z: 27.6 },
    { id: 'c_musgo5', item: 'musgo_luz', x: -4.0, z: 7.0 },
    { id: 'c_raiz1', item: 'raiz_amarga', x: 11.6, z: 15.4 },
    { id: 'c_raiz2', item: 'raiz_amarga', x: 25.4, z: 9.6 },
    { id: 'c_raiz3', item: 'raiz_amarga', x: 31.0, z: 33.0 },
    { id: 'c_raiz4', item: 'raiz_amarga', x: 14.0, z: 31.4 },
    { id: 'c_flor1', item: 'flor_hondo', x: -4.5, z: -6.2 },
    { id: 'c_flor2', item: 'flor_hondo', x: 29.6, z: 21.0 },
  ].map((c) => ({ ...c, y }));
  for (const c of L.cosechas) L.interact.push({ kind: 'cosecha', id: 'i_' + c.id, item: c.item, x: c.x, y, z: c.z, r: 1.4 });
  // las plantas que se mueven (entities/plantas.js)
  L.enemies.push(
    { type: 'zarza', x: 9.0, y, z: 21.0, yaw: Math.PI, idle: 'stand', id: 'p_zarza1' },
    { type: 'zarza', x: 22.0, y, z: 12.0, yaw: 0, idle: 'stand', id: 'p_zarza2' },
    { type: 'zarza', x: 28.0, y, z: 19.0, yaw: -Math.PI / 2, idle: 'stand', id: 'p_zarza3' },
    { type: 'boca', x: 14.6, y, z: 8.0, yaw: 0, idle: 'stand', id: 'p_boca1' },
    { type: 'boca', x: 26.6, y, z: 22.0, yaw: Math.PI, idle: 'stand', id: 'p_boca2' },
    { type: 'boca', x: -4.5, y, z: -2.0, yaw: Math.PI, idle: 'stand', id: 'p_boca3' },
    { type: 'bulbo', x: 6.0, y, z: 12.0, yaw: 0, idle: 'stand', id: 'p_bulbo1' },
    { type: 'bulbo', x: 30.0, y, z: 6.0, yaw: 0, idle: 'stand', id: 'p_bulbo2' },
    { type: 'bulbo', x: 38.5, y, z: 30.0, yaw: 0, idle: 'stand', id: 'p_bulbo3' },
    { type: 'zarza', x: -8.0, y, z: -6.0, yaw: Math.PI / 2, idle: 'stand', id: 'p_zarza4' },
    { type: 'bulbo', x: -0.8, y, z: -6.0, yaw: 0, idle: 'stand', id: 'p_bulbo4' }
  );
}

// ------------------------------------------------------------------------ la luz
// Lo hondo es oscuro: un poco de luz fría en cada cruce (que se vea el farol,
// no la nada), la luna del pozo de las ánimas, el verde de lo hondo.
function luces(ctx, R) {
  const L = (x, y, z, r, g, b, radius, intensity, room) => ctx.lights.push({ x, y, z, r, g, b, radius, intensity, room });
  for (const n of Object.values(R.N)) {
    if (n.boca) continue;
    const room = n.room || n.def.room;
    if (n.def.id === 'n4') L(n.x, n.y + 1.6, n.z, 0.3, 0.7, 0.6, 7, 0.9, room);
    else if (n.def.id === 'se') L(n.x, n.y + 1.8, n.z, 0.34, 0.36, 0.42, 6, 0.35, room);
    else L(n.x, n.y + 1.8, n.z, 0.3, 0.34, 0.42, 6, n.def.id === 'n1' ? 0.22 : 0.3, room);
  }
  for (const t of R.T) {
    const room = t.o.room || t.def.room;
    const mx = (t.a.x + t.b.x) / 2,
      mz = (t.a.z + t.b.z) / 2,
      my = (t.a.y + t.b.y) / 2;
    const k = t.def.id === 'n4' ? [0.3, 0.7, 0.6, 0.8] : t.def.id === 'n1' ? [0.3, 0.34, 0.42, 0.18] : t.def.id === 'desague' ? [0.42, 0.5, 0.5, 0.6] : [0.3, 0.34, 0.4, 0.28];
    L(mx, my + 1.8, mz, k[0], k[1], k[2], 7, k[3], room);
  }
  // la galería del desagüe: lo que llega del Vergel y de la sala de la luz
  L(4.2, VERGEL.boca.y + 1.4, VERGEL.boca.z, 0.42, 0.62, 0.6, 5, 0.8, 'cloaca_desague');
  // el pozo de las ánimas: la luna
  const Pz = HONDAS.pozo;
  const cx = (Pz.xs[1] + Pz.xs[2]) / 2,
    cz = (Pz.zs[1] + Pz.zs[2]) / 2;
  L(cx, HONDAS.y.n1 + 2.4, cz, 0.6, 0.72, 0.96, 7, 2.0, 'lobera_pozo');
  L(cx, HONDAS.y.n1 + 1.0, cz, 0.5, 0.6, 0.84, 9, 0.8, 'lobera_pozo');
  if (ctx.shafts) ctx.shafts.push({ a: [cx, -2.4, cz], b: [cx + 0.3, HONDAS.y.n1 + 0.05, cz + 0.2], w: 1.6, color: 0x9fb4d4, k: 1.1 });
  if (ctx.dynLights) ctx.dynLights.push({ x: cx, y: HONDAS.y.n1 + 2.6, z: cz, intensity: 1.6, range: 7, color: 0xbfd2f4, flicker: 0, priority: 2 });
  // el osario: nada; las viejas: nada; los aljibes: el agua, verdosa
  for (const s of [HONDAS.aljibe1, HONDAS.aljibe2])
    for (let i = 0; i < s.xs.length - 1; i++)
      for (let j = 0; j < s.zs.length - 1; j++) if ((i + j) % 2 === 0) L((s.xs[i] + s.xs[i + 1]) / 2, HONDAS.y.n3 + 1.2, (s.zs[j] + s.zs[j + 1]) / 2, 0.3, 0.5, 0.46, 6, 0.4, 'aljibes');
  // lo hondo: el verde que dan los hongos y las flores, por todo el ninfeo
  const N = HONDAS.ninfeo;
  for (let i = 0; i < N.xs.length - 1; i++)
    for (let j = 0; j < N.zs.length - 1; j++) {
      const x = (N.xs[i] + N.xs[i + 1]) / 2,
        z = (N.zs[j] + N.zs[j + 1]) / 2;
      L(x, HONDAS.y.n4 + 1.2, z, 0.32, 0.86, 0.72, 7.5, 1.1, 'hondo');
      L(x, HONDAS.y.n4 + 4.6, z, 0.36, 0.7, 0.8, 7, 0.5, 'hondo');
    }
  const Sm = HONDAS.semillero;
  for (const [x, z] of [
    [-8.5, -6],
    [-4.5, -4],
    [-0.5, -2],
  ])
    L(x, HONDAS.y.n4 + 1.2, z, 0.5, 0.8, 1.0, 6, 1.2, 'hondo_semillero');
  void Sm;
  if (ctx.dynLights) {
    ctx.dynLights.push({ x: 14.5, y: HONDAS.y.n4 + 1.6, z: 14, intensity: 1.6, range: 10, color: 0x60e0c0, flicker: 0.05, priority: 1 });
    ctx.dynLights.push({ x: -4.5, y: HONDAS.y.n4 + 1.4, z: -4.6, intensity: 1.4, range: 7, color: 0x90c8ff, flicker: 0.05, priority: 1 });
  }
}

// ------------------------------------------------------------------------ zonas y mapa
function zonas(L) {
  const Y = HONDAS.y;
  const g = HONDAS.grids;
  const rect = (k, y0, y1) => [g[k].r[0], g[k].r[1], g[k].r[2], g[k].r[3], y0, y1];
  L.zones.push(
    { id: 'cloaca_desague', rects: [[0, 22.2, 5, 25.8, VERGEL.boca.y - 0.6, -4.5]], atmo: 'cloaca', room: 'cloaca_desague' },
    { id: 'cloaca_se', rects: [[25.6, -14.4, 29.4, 11.5, Y.n1 + 0.4, -6.0]], atmo: 'oscuro', room: 'cloaca_se' },
    { id: 'lobera_pozo', rects: [[...HONDAS.pozo.r, Y.n1 - 0.8, -12.0]], atmo: 'lobera', room: 'lobera_pozo' },
    { id: 'lobera_osario', rects: [[HONDAS.osario.r[0], HONDAS.osario.r[1], HONDAS.osario.r[2], HONDAS.osario.r[3], Y.n1 - 0.8, -12.0]], atmo: 'lobera', room: 'lobera_osario' },
    { id: 'lobera', rects: [rect('H1', Y.n1 - 0.8, -14.3)], atmo: 'lobera', room: 'lobera' },
    { id: 'viejas', rects: [rect('H2', Y.n2 - 0.8, Y.n1 - 0.4)], atmo: 'viejas', room: 'viejas' },
    { id: 'aljibes', rects: [rect('H3', Y.n3 - 3.6, Y.n2 - 0.4)], atmo: 'aljibes', room: 'aljibes' },
    { id: 'hondo_semillero', rects: [[...HONDAS.semillero.r, Y.n4 - 0.8, Y.n3 - 0.4]], atmo: 'hondo', room: 'hondo_semillero' },
    { id: 'hondo', rects: [rect('H4', Y.n4 - 0.8, Y.n3 - 0.4)], atmo: 'hondo', room: 'hondo' }
  );
}

// El mapa: cada nivel en su capa (las galerías, los cruces y las salas de
// la red, con el nombre de su zona).
const CAPA = { desague: 'cloaca', se: 'cloaca', n1: 'lobera', n2: 'viejas', n3: 'aljibes', n4: 'hondo' };
function mapa(L, R) {
  const h = KIT.w / 2;
  for (const n of Object.values(R.N)) {
    if (n.boca) continue;
    L.map.push({ id: n.room || n.def.room, r: [n.x - h, n.z - h, n.x + h, n.z + h], level: CAPA[n.def.id] });
  }
  for (const t of R.T) {
    const [a, b] = [t.a, t.b];
    const r = t.alongX ? [Math.min(a.x, b.x), a.z - h, Math.max(a.x, b.x), a.z + h] : [a.x - h, Math.min(a.z, b.z), a.x + h, Math.max(a.z, b.z)];
    // (la escalera, en la capa de arriba y en la de abajo)
    const capas = new Set([CAPA[t.a.def.id], CAPA[t.b.def.id], CAPA[t.def.id]]);
    for (const level of capas) L.map.push({ id: t.o.room || t.def.room, r, level });
  }
  for (const s of Object.values(R.salas)) {
    if (s.externa) continue;
    L.map.push({ id: s.room || s.def.room, r: s.r, level: CAPA[s.def.id], label: s.room || s.def.room });
  }
}
