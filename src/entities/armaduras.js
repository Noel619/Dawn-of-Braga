// Las armaduras del jugador, pieza a pieza (aún sin enganchar al juego).
//
// Tres armaduras, cada una en las cuatro piezas de las ranuras del inventario
// (player.armor: head, body, hands, legs; game/ui.js, «Cabeza», «Torso»,
// «Manos», «Piernas»), sobre el cuerpo sin armadura (cuerpo.js):
//   guardia     la de la guarnición de Braga, la que lleva el Condenado al
//               despertar (la de playerDef, en models.js, partida en piezas):
//               peso medio
//   caballero   la de un caballero del Rey: hierro de arriba abajo; pesada
//   cuero       la de un batidor, de los que van por delante a caballo:
//               cuero cocido, gambesón y capucha; ligera
// Cada pieza dice qué zonas del cuerpo tapa (tapa: ver cuerpo.js, ZONAS); lo
// que no tapa ninguna pieza puesta, se ve. Todas dejan la cara al aire: el
// protagonista va con la cara descubierta (PLAN_LORE.md, §3.5).
//
// armaduraDef(equipo) da el rig (las articulaciones del jugador) con el
// cuerpo y las piezas puestas; con { grupos: true }, cada pieza y cada zona
// del cuerpo en sus mallas (grp: 'caballero.head', 'cuerpo.torso'...), para
// encenderlas y apagarlas sin rehacer el rig. Para verlas:
// tools/armaduras.mjs.
import * as THREE from 'three';
import { Rig } from './rig.js';
import { playerDef, swordParts, shieldParts, feetParts } from './models.js';
import { cuerpoParts, mano, P, PD } from './cuerpo.js';
import { surface, tube, merge, place, gSph, gBox, table, mix, sstep, folds } from './sculpt.js';
import { ell, hoodUp, capelet } from './figure.js';

const PI = Math.PI;

// ------------------------------------------------------------ las placas
// Una placa que rodea un eje vertical (el de su articulación; cz, hacia
// delante): PR, su perfil [[y, ancho, fondo], ...] de abajo arriba (los
// semiejes); de a0 a a1 (radianes desde +z, hacia +x: números o funciones de
// y, para recortar sisas y bordes). o.arista: lo que sale la arista del
// medio (en a = 0; o.aristaY(y), cómo se reparte de abajo arriba); o.mod(a,
// y): lo que se añade al radio. Devuelve { geo, at }: at(u, v), un punto de
// la placa (u, alrededor; v, de abajo arriba), para sus bordes y remaches.
function placa(PR, a0, a1, o = {}) {
  const y0 = PR[0][0],
    y1 = PR[PR.length - 1][0];
  const A0 = typeof a0 === 'function' ? a0 : () => a0;
  const A1 = typeof a1 === 'function' ? a1 : () => a1;
  const cz = o.cz ?? 0;
  const at = (u, v) => {
    const y = mix(y0, y1, v);
    const a = mix(A0(y), A1(y), u);
    const [rx, rz] = table(PR, y);
    let r = ell(a, rx, rz);
    if (o.arista) r += o.arista * Math.exp(-((a / (o.aristaW ?? 0.16)) ** 2)) * (o.aristaY ? o.aristaY(y) : 1);
    if (o.mod) r += o.mod(a, y);
    return [Math.sin(a) * r, y, Math.cos(a) * r + cz];
  };
  const geo = surface(at, o.nu ?? 20, o.nv ?? 10, { closed: !!o.closed, inside: (u, v) => [0, mix(y0, y1, v), cz] });
  return { geo, at };
}
// el canto vuelto de una placa (un cordón a lo largo de uno de sus lados:
// 'arriba', 'abajo', 'u0' o 'u1'), de t0 a t1
function borde(at, lado, r, o = {}) {
  const n = o.n ?? 18;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = mix(o.t0 ?? 0, o.t1 ?? 1, i / n);
    pts.push(lado === 'arriba' ? at(t, 1) : lado === 'abajo' ? at(t, 0) : lado === 'u0' ? at(0, t) : at(1, t));
  }
  return tube(pts, r, { n, seg: 4 });
}
// k remaches a lo largo de un lado, a d (en u o en v) del canto
function remaches(at, lado, k, rr = 0.006, o = {}) {
  const out = [];
  const d = o.d ?? 0.14;
  for (let i = 0; i < k; i++) {
    const t = k === 1 ? 0.5 : mix(o.t0 ?? 0.06, o.t1 ?? 0.94, i / (k - 1));
    const p = lado === 'arriba' ? at(t, 1 - d) : lado === 'abajo' ? at(t, d) : lado === 'u0' ? at(d, t) : at(1 - d, t);
    out.push(gSph(rr, p, [1, 1, 1], 5, 3));
  }
  return merge(out);
}
// una cúpula (alrededor de +y, la base en y = 0): R de ancho, H de alto
function cupula(R, H, o = {}) {
  const PR = [
    [0, R, R * (o.d ?? 1)],
    [H * 0.3, R * 0.97, R * 0.97 * (o.d ?? 1)],
    [H * 0.6, R * 0.82, R * 0.82 * (o.d ?? 1)],
    [H * 0.85, R * 0.5, R * 0.5 * (o.d ?? 1)],
    [H, R * 0.02, R * 0.02 * (o.d ?? 1)],
  ];
  return placa(PR, -PI, PI, { closed: true, nu: o.nu ?? 16, nv: o.nv ?? 6 });
}
// las ranuras del inventario (player.armor)
export const RANURAS = ['head', 'body', 'hands', 'legs'];

// ------------------------------------------------------------ guardia
// La armadura de la guarnición (la de siempre del Condenado): el almófar y el
// yelmo de nasal; la loriga hasta medio muslo, la sobreveste carmesí con la
// cruz blanca, las hombreras de placa, la correa del escudo y la capa raída;
// los brazales y los guantes de cuero; las calzas oscuras y las botas.
// Son las piezas de playerDef tal cual, salvo el almófar, abierto ahora por
// delante para que se vea la cara del cuerpo (antes la cara era una placa
// pintada sobre él).
function guardiaCabeza() {
  const M = 'chainmail';
  // el almófar: la caja de antes (x ±0,115; y 0,005-0,255; z -0,135-0,115)
  // con el hueco de la cara (x ±0,06; y 0,045-0,188)
  const parts = [
    { j: 'head', type: 'box', s: [0.055, 0.25, 0.25], p: [0.0875, 0.13, -0.01], mat: M },
    { j: 'head', type: 'box', s: [0.055, 0.25, 0.25], p: [-0.0875, 0.13, -0.01], mat: M },
    { j: 'head', type: 'box', s: [0.12, 0.067, 0.25], p: [0, 0.2215, -0.01], mat: M },
    { j: 'head', type: 'box', s: [0.12, 0.04, 0.25], p: [0, 0.025, -0.01], mat: M },
    { j: 'head', type: 'box', s: [0.12, 0.143, 0.11], p: [0, 0.1165, -0.08], mat: M },
    // el yelmo cónico, la banda de la frente y el nasal
    { j: 'head', type: 'cyl', s: [0.03, 0.145, 0.19], p: [0, 0.29, 0], seg: 8, mat: 'plate' },
    { j: 'head', type: 'cyl', s: [0.148, 0.15, 0.04], p: [0, 0.2, 0], seg: 8, mat: 'iron' },
    { j: 'head', type: 'box', s: [0.035, 0.13, 0.02], p: [0, 0.13, 0.147], mat: 'iron' },
    // el cuello del almófar, sobre los hombros
    { j: 'chest', type: 'cyl', s: [0.1, 0.13, 0.12], p: [0, 0.54, 0], mat: M },
  ];
  return parts;
}
function guardiaTorso() {
  return [
    // la cadera: el cinto, la loriga hasta medio muslo, los faldones de la
    // sobreveste y la hebilla
    { j: 'hips', type: 'box', s: [0.38, 0.1, 0.25], p: [0, 0.03, 0], mat: 'leather' },
    { j: 'hips', type: 'box', s: [0.4, 0.34, 0.27], p: [0, -0.14, 0], taper: [1.15, 1.1], mat: 'chainmail' },
    { j: 'hips', type: 'box', s: [0.3, 0.52, 0.03], p: [0, -0.25, 0.14], taper: [1.1, 1], mat: 'clothRed' },
    { j: 'hips', type: 'box', s: [0.3, 0.52, 0.03], p: [0, -0.25, -0.14], taper: [1.1, 1], mat: 'clothRed' },
    { j: 'hips', type: 'box', s: [0.05, 0.05, 0.05], p: [0.12, 0.03, 0.13], mat: 'iron' },
    // el torso: la loriga, la sobreveste con la cruz, las hombreras y la
    // correa del escudo
    { j: 'chest', type: 'box', s: [0.44, 0.52, 0.27], p: [0, 0.26, 0], taper: [0.84, 0.9], mat: 'chainmail' },
    { j: 'chest', type: 'box', s: [0.36, 0.46, 0.03], p: [0, 0.22, 0.14], taper: [0.86, 1], mat: 'clothRed' },
    { j: 'chest', type: 'box', s: [0.36, 0.46, 0.03], p: [0, 0.22, -0.14], taper: [0.86, 1], mat: 'clothRed' },
    { j: 'chest', type: 'box', s: [0.08, 0.2, 0.01], p: [0, 0.26, 0.157], mat: 'clothWhite' },
    { j: 'chest', type: 'box', s: [0.2, 0.06, 0.01], p: [0, 0.3, 0.157], mat: 'clothWhite' },
    { j: 'chest', type: 'box', s: [0.18, 0.1, 0.22], p: [0.25, 0.47, 0], r: [0, 0, -18], mat: 'plate' },
    { j: 'chest', type: 'box', s: [0.18, 0.1, 0.22], p: [-0.25, 0.47, 0], r: [0, 0, 18], mat: 'plate' },
    { j: 'chest', type: 'box', s: [0.05, 0.4, 0.03], p: [0.1, 0.3, -0.15], r: [0, 0, 25], mat: 'leather' },
    // las mangas de la loriga
    { j: 'armL', type: 'box', s: [0.13, 0.32, 0.13], p: [0, -0.14, 0], taper: [0.85, 0.85], mat: 'chainmail' },
    { j: 'armR', type: 'box', s: [0.13, 0.32, 0.13], p: [0, -0.14, 0], taper: [0.85, 0.85], mat: 'chainmail' },
    // la capa raída
    { j: 'cloak', type: 'box', s: [0.42, 0.92, 0.03], p: [0, -0.46, 0], taper: [1.3, 1], mat: 'clothRed', ds: true },
    { j: 'cloak', type: 'box', s: [0.5, 0.12, 0.08], p: [0, 0.0, 0.03], mat: 'clothRed' },
  ];
}
function guardiaManos() {
  return [
    { j: 'foreL', type: 'box', s: [0.11, 0.27, 0.11], p: [0, -0.13, 0], taper: [0.8, 0.8], mat: 'leather' },
    { j: 'handL', type: 'box', s: [0.08, 0.1, 0.09], p: [0, -0.05, 0.01], mat: 'leather' },
    { j: 'foreR', type: 'box', s: [0.11, 0.27, 0.11], p: [0, -0.13, 0], taper: [0.8, 0.8], mat: 'leather' },
    { j: 'handR', type: 'box', s: [0.08, 0.1, 0.09], p: [0, -0.05, 0.01], mat: 'leather' },
  ];
}
function guardiaPiernas() {
  return [
    { j: 'legL', type: 'box', s: [0.16, 0.46, 0.17], p: [0, -0.22, 0], taper: [0.8, 0.85], mat: 'clothDark' },
    { j: 'shinL', type: 'box', s: [0.13, 0.42, 0.14], p: [0, -0.2, 0], taper: [0.9, 0.9], mat: 'leather' },
    { j: 'legR', type: 'box', s: [0.16, 0.46, 0.17], p: [0, -0.22, 0], taper: [0.8, 0.85], mat: 'clothDark' },
    { j: 'shinR', type: 'box', s: [0.13, 0.42, 0.14], p: [0, -0.2, 0], taper: [0.9, 0.9], mat: 'leather' },
    ...feetParts(1, 'leather', { w: 0.12, h: 0.085, l: 0.26 }),
  ];
}

// ------------------------------------------------------------ caballero
// La de un caballero del Rey: hierro de arriba abajo. El yelmo de calva apuntada con su
// cresta, la banda de latón, el nasal ancho, las carrilleras y el cubrenuca,
// y el camal de malla sobre los hombros (la cara, al aire); el peto con su
// arista y el espaldar, la gola, las hombreras de cúpula con sus lamas, las
// mangas de malla con los brazales de arriba, el faldar de tres lamas, las
// escarcelas sobre los muslos y los faldones azules del Rey por detrás; los
// brazales, los codales y los guanteletes; las calzas de malla, los
// quijotes, las rodilleras, las grebas y los escarpes.
const AC = 'cabAcero',
  LA = 'cabLaton';
function caballeroCabeza() {
  const out = [];
  const CZ = -0.006;
  // la calva, algo apuntada, con la cresta de la frente a la nuca
  const calva = placa(
    [
      [0.155, 0.129, 0.135],
      [0.2, 0.128, 0.134],
      [0.24, 0.116, 0.122],
      [0.272, 0.093, 0.098],
      [0.298, 0.06, 0.064],
      [0.314, 0.024, 0.026],
      [0.321, 0.002, 0.002],
    ],
    -PI,
    PI,
    { cz: CZ, closed: true, nu: 28, nv: 9, mod: (a, y) => 0.007 * (Math.exp(-((a / 0.08) ** 2)) + Math.exp(-(((Math.abs(a) - PI) / 0.08) ** 2))) * sstep(0.165, 0.23, y) * sstep(0.322, 0.29, y) }
  );
  out.push(P('head', AC, calva.geo));
  // la banda de la frente, de latón, con sus remaches
  const banda = placa(
    [
      [0.148, 0.135, 0.141],
      [0.184, 0.134, 0.14],
    ],
    -PI,
    PI,
    { cz: CZ, closed: true, nu: 28, nv: 1 }
  );
  out.push(P('head', LA, merge([banda.geo, borde(banda.at, 'abajo', 0.0042, { n: 28 }), borde(banda.at, 'arriba', 0.0042, { n: 28 })])));
  out.push(P('head', AC, remaches(banda.at, 'abajo', 14, 0.0058, { d: 0.5, t0: 0, t1: 13 / 14 })));
  // el cubrenuca, por detrás, que se abre sobre el camal
  const nuca = placa(
    [
      [0.045, 0.146, 0.154],
      [0.1, 0.139, 0.146],
      [0.152, 0.134, 0.14],
    ],
    1.35,
    2 * PI - 1.35,
    { cz: CZ, nu: 18, nv: 4 }
  );
  out.push(PD('head', AC, nuca.geo));
  out.push(P('head', AC, merge([borde(nuca.at, 'abajo', 0.005), borde(nuca.at, 'u0', 0.004), borde(nuca.at, 'u1', 0.004)])));
  // las carrilleras: bajan de la banda por las mejillas hasta la quijada,
  // con el borde de delante en curva (se abre a los ojos y se cierra a la
  // boca); colgadas de dos remaches
  for (const sx of [1, -1]) {
    const fr = (y) => table([[0.02, 0.5], [0.06, 0.4], [0.1, 0.46], [0.15, 0.7]], y)[0];
    const PR = [
      [0.02, 0.104, 0.108],
      [0.07, 0.118, 0.124],
      [0.115, 0.128, 0.134],
      [0.15, 0.134, 0.14],
    ];
    const c = sx > 0 ? placa(PR, (y) => fr(y), 1.42, { cz: CZ, nu: 8, nv: 6 }) : placa(PR, -1.42, (y) => -fr(y), { cz: CZ, nu: 8, nv: 6 });
    out.push(PD('head', AC, c.geo));
    out.push(P('head', AC, merge([borde(c.at, sx > 0 ? 'u0' : 'u1', 0.0045, { n: 10 }), borde(c.at, 'abajo', 0.0045, { n: 8 })])));
    out.push(P('head', LA, remaches(c.at, 'arriba', 2, 0.006, { d: 0.12, t0: 0.3, t1: 0.75 })));
  }
  // el nasal, ancho, que se abre abajo
  out.push({ j: 'head', type: 'box', s: [0.032, 0.104, 0.01], p: [0, 0.114, 0.129], taper: [1.4, 1], mat: AC });
  out.push({ j: 'head', type: 'box', s: [0.012, 0.09, 0.006], p: [0, 0.12, 0.135], mat: LA });
  // el camal: malla que cuelga del yelmo y cubre el cuello y lo alto de los
  // hombros (en el pecho: no se mete en ellos al volver la cabeza)
  const camal = capelet({ top: 0.625, bot: 0.49, r0: [0.1, 0.098], r1: [0.192, 0.152], dep: 0.005, n: 10, point: 0.03, seed: 3 });
  out.push(PD('chest', 'chainmail', camal.geo));
  return out;
}
function caballeroTorso() {
  const out = [];
  // el peto, con el pecho de paloma, la arista y el talle estrecho, y el
  // espaldar, más plano, con la canal del espinazo: se solapan por los
  // costados (el espaldar va por fuera) y dejan las sisas abiertas arriba
  const PR = [
    [-0.03, 0.186, 0.14],
    [0.05, 0.174, 0.132],
    [0.16, 0.187, 0.149],
    [0.28, 0.208, 0.168],
    [0.38, 0.218, 0.166],
    [0.45, 0.206, 0.15],
    [0.51, 0.16, 0.122],
    [0.555, 0.112, 0.1],
  ];
  const PRb = [
    [-0.03, 0.191, 0.142],
    [0.05, 0.179, 0.136],
    [0.16, 0.192, 0.14],
    [0.28, 0.213, 0.146],
    [0.38, 0.223, 0.151],
    [0.45, 0.211, 0.144],
    [0.51, 0.165, 0.122],
    [0.555, 0.117, 0.104],
  ];
  const sisa = (y) => 1.64 - 0.54 * sstep(0.28, 0.47, y);
  const peto = placa(PR, (y) => -sisa(y), (y) => sisa(y), { arista: 0.02, aristaW: 0.2, aristaY: (y) => sstep(-0.03, 0.1, y) * sstep(0.56, 0.42, y), nu: 24, nv: 14 });
  const esp = placa(PRb, (y) => PI - sisa(y), (y) => PI + sisa(y), { nu: 24, nv: 12, mod: (a, y) => -0.008 * Math.exp(-(((a - PI) / 0.16) ** 2)) * sstep(0.08, 0.3, y) });
  out.push(PD('chest', AC, peto.geo), PD('chest', AC, esp.geo));
  out.push(P('chest', AC, merge([borde(peto.at, 'arriba', 0.0075), borde(peto.at, 'abajo', 0.0065), borde(peto.at, 'u0', 0.006), borde(peto.at, 'u1', 0.006), borde(esp.at, 'arriba', 0.0075), borde(esp.at, 'abajo', 0.0065), borde(esp.at, 'u0', 0.006), borde(esp.at, 'u1', 0.006)])));
  out.push(P('chest', LA, merge([remaches(peto.at, 'abajo', 9, 0.0062, { d: 0.05 }), remaches(esp.at, 'abajo', 9, 0.0062, { d: 0.05 }), remaches(peto.at, 'arriba', 5, 0.0058, { d: 0.08, t0: 0.25, t1: 0.75 })])));
  // la gola: dos lamas alrededor del cuello
  for (const [y0, y1, r0, r1] of [
    [0.5, 0.548, 0.124, 0.112],
    [0.535, 0.59, 0.11, 0.096],
  ]) {
    const g = placa(
      [
        [y0, r0, r0 * 0.9],
        [y1, r1, r1 * 0.92],
      ],
      -PI,
      PI,
      { closed: true, nu: 20, nv: 2 }
    );
    out.push(PD('chest', AC, g.geo));
    out.push(P('chest', AC, borde(g.at, 'arriba', 0.0045, { n: 20 })));
  }
  // las hombreras: una cúpula sobre cada hombro (en el pecho), echada hacia
  // fuera, con su reborde y sus remaches
  for (const sx of [1, -1]) {
    const c = cupula(0.112, 0.092, { d: 1.04, nu: 18 });
    const p = [sx * 0.236, 0.432, -0.004],
      r = [0, 0, -sx * 27];
    out.push(PD('chest', AC, place(c.geo, p, r)));
    out.push(P('chest', AC, place(borde(c.at, 'abajo', 0.0065, { n: 22 }), p, r)));
    out.push(P('chest', LA, place(remaches(c.at, 'abajo', 7, 0.006, { d: 0.12, t0: 0.05, t1: 0.95 }), p, r)));
  }
  // los brazos: la manga de malla y, en la cara de fuera, dos lamas bajo la
  // hombrera y el brazal de arriba
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    out.push(P('arm' + s, 'chainmail', tube([[0, 0.04, 0], [0, -0.13, 0.004], [0, -0.3, 0]], (q) => [mix(0.076, 0.058, q), mix(0.074, 0.058, q)], { n: 6, seg: 12 })));
    const fuera = sx * (PI / 2);
    for (const [y0, y1, r0, r1] of [
      [-0.07, -0.025, 0.09, 0.086],
      [-0.108, -0.062, 0.087, 0.083],
    ]) {
      const l = placa(
        [
          [y0, r0, r0],
          [y1, r1, r1],
        ],
        fuera - 1.9,
        fuera + 1.9,
        { nu: 12, nv: 2 }
      );
      out.push(PD('arm' + s, AC, l.geo));
      out.push(P('arm' + s, AC, borde(l.at, 'abajo', 0.0042, { n: 12 })));
    }
    const rb = placa(
      [
        [-0.265, 0.06, 0.062],
        [-0.19, 0.068, 0.07],
        [-0.115, 0.074, 0.076],
      ],
      fuera - 1.45,
      fuera + 1.45,
      { nu: 12, nv: 4 }
    );
    out.push(PD('arm' + s, AC, rb.geo));
    out.push(P('arm' + s, AC, merge([borde(rb.at, 'abajo', 0.0045, { n: 12 }), borde(rb.at, 'arriba', 0.0045, { n: 12 })])));
  }
  // la cadera: la malla que asoma bajo el faldar, el faldar de tres lamas
  // (cada una sobre la de abajo), el cinto con su hebilla
  {
    const m = placa(
      [
        [-0.145, 0.208, 0.164],
        [-0.06, 0.198, 0.156],
        [0.02, 0.186, 0.146],
      ],
      -PI,
      PI,
      { closed: true, nu: 24, nv: 4 }
    );
    out.push(PD('hips', 'chainmail', m.geo));
  }
  for (const [y0, y1, r0, r1] of [
    [-0.118, -0.048, 0.224, 0.212],
    [-0.062, 0.008, 0.212, 0.2],
    [-0.006, 0.075, 0.2, 0.181],
  ]) {
    const l = placa(
      [
        [y0, r0, r0 * 0.76],
        [y1, r1, r1 * 0.76],
      ],
      -PI,
      PI,
      { closed: true, nu: 26, nv: 2 }
    );
    out.push(PD('hips', AC, l.geo));
    out.push(P('hips', AC, borde(l.at, 'abajo', 0.0055, { n: 26 })));
    out.push(P('hips', LA, remaches(l.at, 'arriba', 13, 0.0052, { d: 0.3, t0: 0, t1: 12 / 13 })));
  }
  {
    const c = placa(
      [
        [0.036, 0.194, 0.15],
        [0.07, 0.188, 0.146],
      ],
      -PI,
      PI,
      { closed: true, nu: 26, nv: 1 }
    );
    out.push(P('hips', 'leather', c.geo));
    out.push({ j: 'hips', type: 'box', s: [0.05, 0.05, 0.012], p: [0.05, 0.053, 0.15], mat: LA });
    out.push({ j: 'hips', type: 'box', s: [0.03, 0.03, 0.014], p: [0.05, 0.053, 0.152], mat: 'leather' });
  }
  // las escarcelas: dos lamas sobre la delantera de cada muslo (en el muslo:
  // le siguen), y los faldones azules por detrás, hasta la corva
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    for (const [y0, y1, r0, r1] of [
      [-0.3, -0.19, 0.136, 0.13],
      [-0.205, -0.07, 0.13, 0.124],
    ]) {
      const e = placa(
        [
          [y0, r0, r0 * 0.95],
          [y1, r1, r1 * 0.95],
        ],
        sx * 0.25 - 1.05,
        sx * 0.25 + 1.05,
        { nu: 12, nv: 3, cz: -0.012 }
      );
      out.push(PD('leg' + s, AC, e.geo));
      out.push(P('leg' + s, AC, merge([borde(e.at, 'abajo', 0.005, { n: 12 }), borde(e.at, 'u0', 0.004, { n: 4 }), borde(e.at, 'u1', 0.004, { n: 4 })])));
      out.push(P('leg' + s, LA, remaches(e.at, 'arriba', 3, 0.0052, { d: 0.25, t0: 0.2, t1: 0.8 })));
    }
    const f = placa(
      [
        [-0.42, 0.142, 0.13],
        [-0.2, 0.132, 0.124],
        [-0.01, 0.124, 0.118],
      ],
      PI - 1.25,
      PI + 1.25,
      { nu: 10, nv: 6, mod: (a, y) => 0.006 * folds(a * 3 + sx, 2, sx + 2) * sstep(-0.1, -0.4, y) }
    );
    out.push(PD('leg' + s, 'clothBlue', f.geo));
    out.push(P('leg' + s, 'clothWhite', borde(f.at, 'abajo', 0.006, { n: 10 })));
  }
  return out;
}
function caballeroManos() {
  const out = [];
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    // el brazal: un tubo de placa del codo a la muñeca, con su bisagra de
    // remaches por dentro
    const br = placa(
      [
        [-0.245, 0.047, 0.042],
        [-0.14, 0.057, 0.052],
        [-0.035, 0.062, 0.057],
      ],
      -PI,
      PI,
      { closed: true, nu: 16, nv: 5, arista: 0.005, aristaW: 0.25 }
    );
    out.push(P('fore' + s, AC, br.geo));
    out.push(P('fore' + s, AC, merge([borde(br.at, 'arriba', 0.0048, { n: 16 }), borde(br.at, 'abajo', 0.0048, { n: 16 })])));
    out.push(P('fore' + s, LA, remaches(br.at, 'u0', 3, 0.005, { d: sx > 0 ? 0.25 : 0.75, t0: 0.2, t1: 0.8 })));
    // el codal: la cazoleta del codo y su rodela por fuera
    out.push(P('fore' + s, AC, merge([gSph(1, [0, -0.004, -0.024], [0.054, 0.05, 0.046], 10, 6), place(new THREE.CylinderGeometry(0.04, 0.04, 0.007, 12), [sx * 0.056, -0.012, -0.014], [0, 0, 90])])));
    out.push(P('fore' + s, LA, gSph(0.008, [sx * 0.061, -0.012, -0.014], [1, 1, 1], 6, 4)));
    // el guantelete: la bocamanga acampanada sobre la muñeca, la mano de
    // lamas (los dedos articulados) y la placa de los nudillos
    const bm = placa(
      [
        [-0.022, 0.044, 0.038],
        [0.05, 0.066, 0.06],
      ],
      -PI,
      PI,
      { closed: true, nu: 14, nv: 3 }
    );
    out.push(PD('hand' + s, AC, bm.geo));
    out.push(P('hand' + s, LA, borde(bm.at, 'arriba', 0.0045, { n: 14 })));
    const m = mano({ side: sx, curl: s === 'R' ? 0.62 : 0.45, spread: 0.12, thick: 1.42, wide: 1.16, len: 1.05, thumb: s === 'R' ? 0.35 : 0.55 });
    out.push(P('hand' + s, AC, merge([m.carne, m.yemas])));
    out.push({ j: 'hand' + s, type: 'box', s: [0.012, 0.03, 0.09], p: [sx * 0.02, -0.084, 0.003], mat: AC });
  }
  return out;
}
// el escarpe: un zapato de placa con la punta algo apuntada (en el pie; la
// suela, a ras del suelo); sus lamas, sobre el empeine, van aparte
function escarpe(sd) {
  const S = -0.04;
  const T = [
    [0, 0.041, 0.038],
    [0.3, 0.047, 0.04],
    [0.62, 0.051, 0.027],
    [0.88, 0.034, 0.016],
    [1, 0.012, 0.008],
  ];
  const zs = [-0.064, 0.02, 0.095, 0.155, 0.196];
  const g = [
    tube(
      zs.map((z, i) => {
        const s = i / (zs.length - 1);
        return [-sd * 0.008 * s, S + table(T, s)[1], z];
      }),
      (s) => table(T, s),
      { up: [0, 1, 0], n: 12, seg: 10, caps: true, capL: 0.02 }
    ),
  ];
  return merge(g);
}
function caballeroPiernas() {
  const out = [];
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    // las calzas de malla
    out.push(P('leg' + s, 'chainmail', tube([[0, 0.06, 0], [0, -0.2, 0.01], [0, -0.46, 0]], (q) => [mix(0.1, 0.064, q), mix(0.102, 0.068, q)], { n: 8, seg: 12 })));
    out.push(P('shin' + s, 'chainmail', tube([[0, 0.03, 0], [0, -0.2, -0.004], [0, -0.42, 0]], (q) => [mix(0.06, 0.04, q), mix(0.064, 0.042, q)], { n: 6, seg: 10 })));
    // el quijote: la placa de delante del muslo, con su arista
    const q = placa(
      [
        [-0.4, 0.075, 0.081],
        [-0.24, 0.093, 0.1],
        [-0.06, 0.106, 0.111],
      ],
      -1.3,
      1.3,
      { arista: 0.008, nu: 14, nv: 6 }
    );
    out.push(PD('leg' + s, AC, q.geo));
    out.push(P('leg' + s, AC, merge([borde(q.at, 'arriba', 0.005, { n: 14 }), borde(q.at, 'abajo', 0.005, { n: 14 }), borde(q.at, 'u0', 0.004, { n: 6 }), borde(q.at, 'u1', 0.004, { n: 6 })])));
    // (la correa que lo sujeta, por detrás del muslo)
    out.push(P('leg' + s, 'leather', place(new THREE.TorusGeometry(0.097, 0.006, 4, 16), [0, -0.14, 0.004], [90, 0, 0], [1, 1.05, 1])));
    // la rodillera: la cazoleta de la rodilla con su rodela por fuera
    const rod = cupula(0.054, 0.04, { d: 0.95, nu: 14 });
    out.push(PD('shin' + s, AC, place(rod.geo, [0, 0.004, 0.044], [90, 0, 0])));
    out.push(P('shin' + s, AC, place(borde(rod.at, 'abajo', 0.0045, { n: 16 }), [0, 0.004, 0.044], [90, 0, 0])));
    out.push(P('shin' + s, AC, place(new THREE.CylinderGeometry(0.038, 0.038, 0.007, 12), [sx * 0.064, -0.004, 0.012], [0, 0, 90])));
    out.push(P('shin' + s, LA, gSph(0.0075, [sx * 0.069, -0.004, 0.012], [1, 1, 1], 6, 4)));
    // la greba: de la rodilla al tobillo, con la arista de la espinilla
    const gr = placa(
      [
        [-0.41, 0.047, 0.05],
        [-0.3, 0.052, 0.056],
        [-0.14, 0.069, 0.077],
        [-0.045, 0.067, 0.074],
      ],
      -PI,
      PI,
      { closed: true, arista: 0.008, aristaW: 0.22, nu: 18, nv: 8 }
    );
    out.push(P('shin' + s, AC, gr.geo));
    out.push(P('shin' + s, AC, merge([borde(gr.at, 'arriba', 0.0052, { n: 18 }), borde(gr.at, 'abajo', 0.005, { n: 18 })])));
    out.push(P('shin' + s, LA, remaches(gr.at, 'arriba', 2, 0.0055, { d: 0.08, t0: 0.18, t1: 0.82 })));
    // el escarpe y sus lamas
    out.push(P('foot' + s, AC, escarpe(sx)));
    for (const [z, w, h] of [
      [0.0, 0.094, 0.07],
      [0.045, 0.098, 0.058],
      [0.09, 0.1, 0.046],
    ])
      out.push(P('foot' + s, AC, place(new THREE.TorusGeometry(1, 0.06, 4, 14, PI), [-sx * 0.004, -0.04, z], [0, 0, 0], [w * 0.5, h, 0.08])));
    out.push(P('foot' + s, 'leather', place(new THREE.TorusGeometry(0.05, 0.006, 4, 14), [0, -0.012, -0.012], [90, 0, 0], [1, 1.12, 1])));
  }
  return out;
}

// ------------------------------------------------------------ cuero
// La de un batidor, de los que van por delante a caballo: lo que se lleva
// para correr y no para aguantar. La capucha de cuero con su
// esclavina; el gambesón acolchado (con sus faldones abiertos sobre los
// muslos) y, encima, el coleto de cuero cocido con sus correas, las
// hombreras pequeñas, el cinto ancho y la bolsa; los brazales atados y los
// guantes; las calzas de lana y las botas altas con su vuelta y sus hebillas.
const CC = 'cueCocido',
  CB = 'cueBlando',
  GA = 'cueAcolchado';
function cueroCabeza() {
  const out = [];
  out.push(PD('head', CB, hoodUp({ open: 0.62, peak: 0.05, fall: 0.06, fwd: 0.02, rx: 0.113, ry: 0.14, rz: 0.128, c: [0, 0.118, -0.006], rim: 0.01, low: -1.0 })));
  const es = capelet({ top: 0.625, bot: 0.43, r0: [0.11, 0.105], r1: [0.235, 0.18], point: 0.07, n: 8, dep: 0.012, seed: 5 });
  out.push(PD('chest', CB, es.geo));
  // la correa del cuello con su hebilla
  out.push(P('chest', 'leather', tube([[0.07, 0.6, 0.082], [0.0, 0.585, 0.112], [-0.07, 0.6, 0.082]], 0.007, { n: 8, seg: 5, caps: true, capL: 0.006 })));
  out.push(P('chest', 'iron', gBox(0.026, 0.024, 0.008, [0, 0.585, 0.117], [0, 0, 0])));
  return out;
}
function cueroTorso() {
  const out = [];
  // el gambesón: el cuerpo acolchado (hasta el cuello, con su collarín), las
  // mangas hasta el codo y la cintura
  out.push(
    P(
      'chest',
      GA,
      tube(
        [
          [0, -0.06, 0],
          [0, 0.12, 0.004],
          [0, 0.3, 0.004],
          [0, 0.45, -0.006],
          [0, 0.6, 0.004],
        ],
        (q) => table([[0, 0.192, 0.136], [0.25, 0.196, 0.142], [0.5, 0.214, 0.148], [0.72, 0.226, 0.136], [0.86, 0.17, 0.112], [1, 0.084, 0.082]], q),
        { n: 12, seg: 18 }
      )
    )
  );
  out.push(P('chest', GA, place(new THREE.TorusGeometry(0.083, 0.012, 5, 16), [0, 0.6, 0.004], [90, 0, 0], [1, 0.98, 1])));
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    out.push(P('arm' + s, GA, tube([[-sx * 0.012, 0.045, 0], [0, -0.13, 0.004], [0, -0.3, 0]], (q) => [mix(0.08, 0.062, q), mix(0.078, 0.062, q)], { n: 6, seg: 12, mod: (a, q) => 1 + 0.04 * folds(a, 3, sx + 4) * q })));
    out.push(P('arm' + s, GA, place(new THREE.TorusGeometry(0.06, 0.009, 4, 12), [0, -0.29, 0], [90, 0, 0])));
  }
  out.push(
    P(
      'hips',
      GA,
      tube(
        [
          [0, 0.16, 0],
          [0, 0.04, 0.004],
          [0, -0.08, 0],
        ],
        (q) => table([[0, 0.196, 0.142], [0.5, 0.21, 0.15], [1, 0.218, 0.156]], q),
        { n: 6, seg: 18 }
      )
    )
  );
  // los faldones del gambesón: delante y detrás de cada muslo, abiertos por
  // los lados (en el muslo: le siguen al andar)
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    for (const c of [0, PI]) {
      const f = placa(
        [
          [-0.33, 0.138, 0.13],
          [-0.15, 0.13, 0.124],
          [0.04, 0.124, 0.118],
        ],
        c - 1.32,
        c + 1.32,
        { nu: 10, nv: 6 }
      );
      out.push(PD('leg' + s, GA, f.geo));
      out.push(P('leg' + s, CB, borde(f.at, 'abajo', 0.006, { n: 10 })));
    }
  }
  // el coleto: el peto y el espaldar de cuero cocido, con sus cantos
  // cosidos, sus tachones y las correas de los costados y de los hombros
  const PR = [
    [0.0, 0.206, 0.152],
    [0.14, 0.212, 0.158],
    [0.28, 0.226, 0.162],
    [0.38, 0.232, 0.157],
    [0.45, 0.218, 0.142],
    [0.5, 0.18, 0.124],
  ];
  const sisa = (y) => 1.52 - 0.5 * sstep(0.26, 0.44, y);
  const peto = placa(PR, (y) => -sisa(y), (y) => sisa(y), { nu: 18, nv: 8, mod: (a, y) => 0.006 * Math.exp(-((a / 0.5) ** 2)) * sstep(0.1, 0.3, y) * sstep(0.5, 0.36, y) });
  const esp = placa(PR, (y) => PI - sisa(y), (y) => PI + sisa(y), { nu: 18, nv: 8 });
  out.push(PD('chest', CC, peto.geo), PD('chest', CC, esp.geo));
  out.push(P('chest', 'leather', merge([borde(peto.at, 'arriba', 0.006), borde(peto.at, 'abajo', 0.006), borde(peto.at, 'u0', 0.0055), borde(peto.at, 'u1', 0.0055), borde(esp.at, 'arriba', 0.006), borde(esp.at, 'abajo', 0.006), borde(esp.at, 'u0', 0.0055), borde(esp.at, 'u1', 0.0055)])));
  out.push(P('chest', 'iron', merge([remaches(peto.at, 'abajo', 8, 0.0048, { d: 0.08 }), remaches(peto.at, 'arriba', 4, 0.0048, { d: 0.1, t0: 0.2, t1: 0.8 }), remaches(esp.at, 'abajo', 8, 0.0048, { d: 0.08 })])));
  for (const sx of [1, -1]) {
    // las correas de los costados (tres, con su hebilla) y la del hombro
    for (let i = 0; i < 3; i++) {
      const y = 0.06 + i * 0.075;
      const [rx, rz] = table(PR, y);
      const x = sx * (ell(PI / 2, rx, rz) + 0.004);
      out.push(P('chest', 'leather', gBox(0.008, 0.016, 0.07, [x, y, 0], [0, 0, 0])));
      out.push(P('chest', 'iron', gBox(0.01, 0.022, 0.016, [x + sx * 0.002, y, 0.026], [0, 0, 0])));
    }
    out.push(P('chest', 'leather', tube([[sx * 0.11, 0.49, 0.118], [sx * 0.155, 0.545, 0.03], [sx * 0.15, 0.54, -0.05], [sx * 0.11, 0.49, -0.118]], [0.018, 0.005], { n: 10, seg: 4, up: [0, 1, 0] })));
    // la hombrera pequeña: una cúpula de cuero cocido con una lama
    const c = cupula(0.09, 0.07, { d: 1.05, nu: 14 });
    const p = [sx * 0.232, 0.442, -0.004],
      r = [0, 0, -sx * 30];
    out.push(PD('chest', CC, place(c.geo, p, r)));
    out.push(P('chest', 'leather', place(borde(c.at, 'abajo', 0.005, { n: 18 }), p, r)));
    out.push(P('chest', 'iron', place(remaches(c.at, 'abajo', 5, 0.0045, { d: 0.15, t0: 0.1, t1: 0.9 }), p, r)));
  }
  // el cinto ancho con su hebilla, la bolsa a la derecha y el cuchillo
  {
    const c = placa(
      [
        [0.04, 0.214, 0.156],
        [0.1, 0.208, 0.152],
      ],
      -PI,
      PI,
      { closed: true, nu: 26, nv: 1 }
    );
    out.push(P('hips', 'leather', merge([c.geo, borde(c.at, 'arriba', 0.003, { n: 26 }), borde(c.at, 'abajo', 0.003, { n: 26 })])));
    out.push(P('hips', 'iron', merge([gBox(0.05, 0.068, 0.008, [0.03, 0.07, 0.155], [0, 0, 0]), gBox(0.006, 0.05, 0.012, [0.03, 0.07, 0.16], [0, 0, 0])])));
    out.push(P('hips', CC, merge([place(gSph(1, [0, 0, 0], [0.04, 0.06, 0.026], 8, 6), [-0.17, -0.02, 0.1], [0, -36, 0]), place(gBox(0.08, 0.035, 0.05, [0, 0, 0]), [-0.17, 0.035, 0.1], [0, -36, 0])])));
    out.push(P('hips', 'leather', merge([place(gBox(0.03, 0.17, 0.016, [0, 0, 0]), [-0.12, -0.06, -0.165], [0, 20, -14]), place(gBox(0.022, 0.07, 0.02, [0, 0, 0]), [-0.098, 0.05, -0.172], [0, 20, -14])])));
  }
  return out;
}
function cueroManos() {
  const out = [];
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    // el brazal de cuero cocido, atado por dentro con sus cordones
    const br = placa(
      [
        [-0.235, 0.044, 0.04],
        [-0.13, 0.054, 0.05],
        [-0.04, 0.058, 0.054],
      ],
      -sx * PI * 0.5 + 0.35,
      -sx * PI * 0.5 + 2 * PI - 0.35,
      { nu: 16, nv: 5 }
    );
    out.push(PD('fore' + s, CC, br.geo));
    out.push(P('fore' + s, 'leather', merge([borde(br.at, 'arriba', 0.0045, { n: 16 }), borde(br.at, 'abajo', 0.0045, { n: 16 }), borde(br.at, 'u0', 0.004, { n: 6 }), borde(br.at, 'u1', 0.004, { n: 6 })])));
    {
      const cord = [];
      for (let i = 0; i < 4; i++) {
        const v0 = 0.12 + i * 0.22,
          v1 = v0 + 0.22;
        const a = br.at(0.02, v0),
          b = br.at(0.98, Math.min(1, v1)),
          c = br.at(0.98, v0),
          d = br.at(0.02, Math.min(1, v1));
        cord.push(tube([a, b], 0.0026, { n: 2, seg: 4 }), tube([c, d], 0.0026, { n: 2, seg: 4 }));
      }
      out.push(P('fore' + s, 'rope', merge(cord)));
    }
    // el guante, con su puño vuelto
    const m = mano({ side: sx, curl: s === 'R' ? 0.62 : 0.45, spread: 0.18, thick: 1.18, wide: 1.07, len: 1.02, thumb: s === 'R' ? 0.35 : 0.55 });
    out.push(P('hand' + s, CB, merge([m.carne, m.yemas])));
    const pu = placa(
      [
        [-0.012, 0.04, 0.034],
        [0.035, 0.05, 0.045],
      ],
      -PI,
      PI,
      { closed: true, nu: 12, nv: 2 }
    );
    out.push(PD('hand' + s, CB, pu.geo));
    out.push(P('hand' + s, 'leather', borde(pu.at, 'arriba', 0.004, { n: 12 })));
  }
  return out;
}
function cueroPiernas() {
  const out = [];
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    // las calzas de lana
    out.push(P('leg' + s, 'cueLana', tube([[0, 0.06, 0], [0, -0.2, 0.012], [0, -0.46, 0]], (q) => table([[0, 0.098, 0.1], [0.35, 0.088, 0.093], [1, 0.06, 0.064]], q), { n: 8, seg: 12, caps: true, capL: 0.03 })));
    out.push(P('shin' + s, 'cueLana', tube([[0, 0.035, 0.004], [0, -0.1, -0.004]], (q) => [mix(0.06, 0.06, q), mix(0.064, 0.068, q)], { n: 3, seg: 10 })));
    // la bota alta: la caña hasta debajo de la rodilla, con su vuelta y dos
    // correas con hebilla; el pie
    out.push(
      P(
        'shin' + s,
        CB,
        tube(
          [
            [0, -0.08, 0],
            [0, -0.2, -0.006],
            [0, -0.33, 0],
            [0, -0.43, 0.004],
          ],
          (q) => table([[0, 0.066, 0.072], [0.3, 0.064, 0.074], [0.7, 0.048, 0.052], [1, 0.044, 0.046]], q),
          { n: 8, seg: 12 }
        )
      )
    );
    const vuelta = placa(
      [
        [-0.13, 0.074, 0.08],
        [-0.06, 0.072, 0.078],
      ],
      -PI,
      PI,
      { closed: true, nu: 14, nv: 2, mod: (a) => 0.003 * Math.sin(a * 5 + sx) }
    );
    out.push(PD('shin' + s, CC, vuelta.geo));
    out.push(P('shin' + s, 'leather', borde(vuelta.at, 'abajo', 0.0045, { n: 14 })));
    for (const y of [-0.21, -0.33]) {
      const r = table([[-0.43, 0.046], [-0.33, 0.051], [-0.2, 0.068]], y)[0];
      out.push(P('shin' + s, 'leather', place(new THREE.TorusGeometry(r + 0.004, 0.006, 4, 14), [0, y, -0.004], [90, 0, 0], [1, 1.1, 1])));
      out.push(P('shin' + s, 'iron', gBox(0.016, 0.018, 0.008, [sx * (r + 0.006) * 0.7, y, (r + 0.006) * 0.75], [0, sx * 45, 0])));
    }
    out.push(...feetParts(1, CB, { w: 0.118, h: 0.08, l: 0.255 }).filter((p) => p.j === 'foot' + s));
    out.push({ j: 'foot' + s, type: 'box', s: [0.124, 0.012, 0.26], p: [0, -0.034, 0.05], mat: 'leather' });
  }
  return out;
}

// ------------------------------------------------------------ el catálogo
// peso: lo que pesa (para cuando se enganche: la voltereta, el aguante...);
// cada pieza, su nombre, lo que tapa y sus piezas del rig.
export const ARMADURAS = {
  guardia: {
    nombre: 'Armadura de guardia',
    peso: 'media',
    piezas: {
      head: { nombre: 'Yelmo de nasal', tapa: ['cabeza', 'cuello'], parts: guardiaCabeza },
      body: { nombre: 'Loriga de la guarnición', tapa: ['torso', 'brazos', 'cadera'], parts: guardiaTorso },
      hands: { nombre: 'Brazales de cuero', tapa: ['antebrazos', 'manos'], parts: guardiaManos },
      legs: { nombre: 'Calzas y botas', tapa: ['muslos', 'piernas', 'pies'], parts: guardiaPiernas },
    },
  },
  caballero: {
    nombre: 'Armadura de caballero',
    peso: 'pesada',
    piezas: {
      head: { nombre: 'Yelmo de carrilleras', tapa: ['cabeza', 'cuello'], parts: caballeroCabeza },
      body: { nombre: 'Peto y faldar', tapa: ['torso', 'brazos', 'cadera'], parts: caballeroTorso },
      hands: { nombre: 'Guanteletes y brazales', tapa: ['antebrazos', 'manos'], parts: caballeroManos },
      legs: { nombre: 'Quijotes y grebas', tapa: ['muslos', 'piernas', 'pies'], parts: caballeroPiernas },
    },
  },
  cuero: {
    nombre: 'Armadura de cuero',
    peso: 'ligera',
    piezas: {
      head: { nombre: 'Capucha de cuero', tapa: ['cabeza', 'cuello'], parts: cueroCabeza },
      body: { nombre: 'Coleto y gambesón', tapa: ['torso', 'brazos', 'cadera'], parts: cueroTorso },
      hands: { nombre: 'Brazales y guantes de cuero', tapa: ['antebrazos', 'manos'], parts: cueroManos },
      legs: { nombre: 'Calzas y botas altas', tapa: ['muslos', 'piernas', 'pies'], parts: cueroPiernas },
    },
  },
};

// ------------------------------------------------------------ el montaje
// el equipo: 'guardia' (las cuatro piezas de esa armadura), 'desnudo' (nada)
// o { head, body, hands, legs } (cada una, el id de una armadura o null)
export function equipo(e) {
  if (!e || e === 'desnudo') return { head: null, body: null, hands: null, legs: null };
  if (typeof e === 'string') return { head: e, body: e, hands: e, legs: e };
  return { head: e.head || null, body: e.body || null, hands: e.hands || null, legs: e.legs || null };
}

// el farol del cinto (no es de ninguna armadura)
export function farolParts() {
  return playerDef().parts.filter((p) => p.j === 'lantern');
}

// El rig del jugador vestido con ese equipo: { joints, parts }. o.grupos:
// cada zona del cuerpo y cada pieza en sus mallas; o.farol (sí, si no se
// dice), o.espada y o.escudo (los de models.js, para verlo armado).
export function armaduraDef(e, o = {}) {
  const eq = equipo(e);
  for (const r of RANURAS) if (eq[r] && !ARMADURAS[eq[r]]) throw new Error('armadura desconocida: ' + eq[r]);
  const def = { joints: playerDef().joints, parts: [] };
  const tapadas = new Set();
  for (const r of RANURAS) if (eq[r]) for (const z of ARMADURAS[eq[r]].piezas[r].tapa) tapadas.add(z);
  for (const p of cuerpoParts()) if (!tapadas.has(p.zona)) def.parts.push(o.grupos ? { ...p, grp: 'cuerpo.' + p.zona } : p);
  for (const r of RANURAS) {
    if (!eq[r]) continue;
    for (const p of ARMADURAS[eq[r]].piezas[r].parts()) def.parts.push(o.grupos ? { ...p, grp: eq[r] + '.' + r } : p);
  }
  const extra = (list, grp) => def.parts.push(...(o.grupos ? list.map((p) => ({ ...p, grp })) : list));
  if (o.farol !== false) extra(farolParts(), 'farol');
  if (o.espada) extra(swordParts('sword'), 'espada');
  if (o.escudo) extra(shieldParts(), 'escudo');
  return def;
}

export function buildArmado(e, o = {}) {
  return new Rig(armaduraDef(e, o));
}
