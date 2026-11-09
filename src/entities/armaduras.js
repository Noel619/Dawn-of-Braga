// Las armaduras del jugador, pieza a pieza.
//
// Tres armaduras, cada una en las cuatro piezas de las ranuras del inventario
// (player.armor: head, body, hands, legs; game/ui.js, «Cabeza», «Torso»,
// «Manos», «Piernas»), sobre el cuerpo sin armadura (cuerpo.js):
//   guardia     la de la guarnición de Braga, la que lleva el Condenado al
//               despertar: peso medio
//   caballero   la de un caballero del Rey: hierro de arriba abajo; pesada
//   cuero       la de un batidor, de los que van por delante a caballo:
//               cuero cocido, gambesón y capucha; ligera
// Cada pieza dice qué zonas del cuerpo tapa (tapa: ver cuerpo.js, ZONAS); lo
// que no tapa ninguna pieza puesta, se ve. Todas dejan la cara al aire: el
// protagonista va con la cara descubierta (PLAN_LORE.md, §3.5).
//
// Ceñidas al cuerpo: cada perfil sale de sus medidas (los cortes del cuerpo
// por altura en el espacio de cada hueso) más lo que abulta lo de debajo, a
// uno o dos dedos. (Las de antes iban a cuatro o cinco: el yelmo de nasal de
// la guardia, una caja de malla con un cono de quince centímetros de radio
// encima, subía catorce por encima de la coronilla.) Las medidas de la
// cabeza, sin el pelo, que con el yelmo puesto no se ve: la frente, a
// ±0,08 de lado y a 0,095 por delante; el cogote, a -0,10; la coronilla, a
// 0,241; las orejas, a ±0,097 a la altura de 0,12.
//
// armaduraDef(equipo, o) da el rig (las articulaciones del jugador) con el
// cuerpo (el aspecto o.aspecto: aspecto.js) y las piezas puestas; con {
// grupos: true }, cada pieza y cada zona del cuerpo en sus mallas (grp:
// 'caballero.head', 'cuerpo.torso'...). El jugador se viste con
// partesVestido (entities/player.js, vestir). Para verlas:
// tools/armaduras.mjs.
import * as THREE from 'three';
import { Rig } from './rig.js';
import { playerDef, swordParts, shieldParts } from './models.js';
import { cuerpoParts, mano, P, PD } from './cuerpo.js';
import { surface, tube, merge, place, gSph, gBox, cloth, table, mix, sstep, folds } from './sculpt.js';
import { ell, hoodUp, capelet } from './figure.js';

const PI = Math.PI;
const TAU = PI * 2;

// ------------------------------------------------------------ las placas
// Una placa que rodea un eje vertical (el de su articulación): PR, su perfil
// [[y, ancho, fondo], ...] de abajo arriba (los semiejes); de a0 a a1
// (radianes desde +z, hacia +x: números o funciones de y, para recortar
// sisas y bordes); o.cz, el centro (hacia delante: un número o una función
// de y). o.arista: lo que sale la arista del medio (en a = 0; o.aristaY(y),
// cómo se reparte de abajo arriba); o.mod(a, y): lo que se añade al radio;
// o.hem(u): lo que baja (o sube) el borde de abajo en cada punto (un bajo
// deshilachado). Devuelve { geo, at }: at(u, v), un punto de la placa (u,
// alrededor; v, de abajo arriba), para sus bordes y remaches.
function placa(PR, a0, a1, o = {}) {
  const y0 = PR[0][0],
    y1 = PR[PR.length - 1][0];
  const A0 = typeof a0 === 'function' ? a0 : () => a0;
  const A1 = typeof a1 === 'function' ? a1 : () => a1;
  const CZ = typeof o.cz === 'function' ? o.cz : () => o.cz ?? 0;
  const at = (u, v) => {
    const y = mix(y0 + (o.hem ? o.hem(u) * (1 - v) : 0), y1, v);
    const a = mix(A0(y), A1(y), u);
    const [rx, rz] = table(PR, y);
    let r = ell(a, rx, rz);
    if (o.arista) r += o.arista * Math.exp(-((a / (o.aristaW ?? 0.16)) ** 2)) * (o.aristaY ? o.aristaY(y) : 1);
    if (o.mod) r += o.mod(a, y);
    return [Math.sin(a) * r, y, Math.cos(a) * r + CZ(y)];
  };
  const geo = surface(at, o.nu ?? 20, o.nv ?? 10, { closed: !!o.closed, inside: (u, v) => [0, mix(y0, y1, v), CZ(mix(y0, y1, v))] });
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
// Una tira sobre una placa (una cruz cosida, un nervio): la parte de u0 a u1
// y de v0 a v1, levantada d (en el radio: o.mod)
function tira(PR, a0, a1, y0, y1, d, o = {}) {
  const pr = PR.filter((r) => r[0] > y0 && r[0] < y1);
  const at = (y) => table(PR, y);
  const P2 = [[y0, ...at(y0)], ...pr, [y1, ...at(y1)]].map(([y, a, b]) => [y, a + d, b + d]);
  return placa(P2, a0, a1, { nu: o.nu ?? 6, nv: o.nv ?? 4, cz: o.cz });
}
// las ranuras del inventario (player.armor)
export const RANURAS = ['head', 'body', 'hands', 'legs'];
// los lados: [sufijo de la articulación, signo de x]
const LADOS = [
  ['L', 1],
  ['R', -1],
];
// Los ángulos de una pieza que rodea el muslo menos por dentro (de cara a la
// otra pierna): de delante-dentro, por fuera, a detrás-dentro; abre: lo que
// queda abierto a cada lado del de dentro
const muslo = (sx, abre = 0.55) => (sx > 0 ? [-PI / 2 + abre, (3 * PI) / 2 - abre] : [-(3 * PI) / 2 + abre, PI / 2 - abre]);

// ------------------------------------------------------------ el cuerpo
// Las medidas que se repiten (cada pieza, con lo que abulta lo de debajo):
// la cabeza (centro en z) y el tronco: [y, semiancho, semifondo] y su centro
// (el pecho, algo por delante; los hombros, algo por detrás).
const CABEZA_CZ = -0.004;
const czTronco = (y) =>
  table(
    [
      [-0.06, 0],
      [0.1, 0.002],
      [0.3, 0.006],
      [0.42, -0.004],
      [0.5, -0.01],
      [0.56, -0.008],
    ],
    y
  )[0];
// el tronco del cuerpo (cuerpo.js: figure.torso, ancho 1,1, fondo 1,03, con el
// pecho), de la cintura al cuello
const TRONCO = [
  [-0.06, 0.165, 0.107],
  [0.06, 0.168, 0.111],
  [0.18, 0.18, 0.121],
  [0.3, 0.196, 0.128],
  [0.38, 0.21, 0.122],
  [0.42, 0.214, 0.114],
  [0.46, 0.206, 0.104],
  [0.5, 0.17, 0.089],
  [0.54, 0.11, 0.073],
];
// el tronco y lo que le cubre (d: lo que se aparta, de lado y de fondo)
const sobreTronco = (dx, dz, desde = -0.06, hasta = 0.54) => TRONCO.filter(([y]) => y >= desde - 1e-6 && y <= hasta + 1e-6).map(([y, a, b]) => [y, a + dx, b + dz]);

// ------------------------------------------------------------ guardia
// La armadura de la guarnición (la de siempre del Condenado): el almófar de
// malla, abierto a la cara, y encima el yelmo cónico de cuatro gajos con su
// banda y su nasal; la loriga hasta medio muslo con mangas al codo, la
// sobreveste carmesí con la cruz blanca, las hombreras, el cinto, la correa
// del escudo y la capa raída; los brazales y los guantes de cuero; las calzas
// oscuras y las botas.
function guardiaCabeza() {
  const out = [];
  // el almófar: ceñido al cráneo (a dedo y medio: el gorro acolchado de
  // debajo), sobre las orejas, y abierto a la cara de la barbilla a las
  // cejas; por arriba lo tapa el yelmo
  const ALM = [
    [-0.012, 0.084, 0.09],
    [0.03, 0.091, 0.098],
    [0.08, 0.104, 0.112],
    [0.12, 0.108, 0.117],
    [0.16, 0.103, 0.115],
    [0.2, 0.092, 0.104],
    [0.226, 0.074, 0.086],
    [0.246, 0.042, 0.05],
    [0.256, 0.004, 0.005],
  ];
  const cara = (y) => 0.6 * sstep(0.215, 0.178, y) + 0.0001;
  const alm = placa(
    ALM,
    (y) => cara(y),
    (y) => TAU - cara(y),
    { cz: CABEZA_CZ - 0.002, nu: 26, nv: 12 }
  );
  out.push(PD('head', 'chainmail', alm.geo));
  // (el canto de la cara, de cuero)
  out.push(P('head', 'leather', merge([borde(alm.at, 'u0', 0.0045, { n: 12, t1: 0.82 }), borde(alm.at, 'u1', 0.0045, { n: 12, t1: 0.82 })])));
  // el yelmo: cónico, de cuatro gajos remachados sobre la banda, a dedo y
  // medio del almófar, con su punta (cuatro dedos por encima de la coronilla)
  const YEL = [
    [0.16, 0.111, 0.124],
    [0.19, 0.108, 0.121],
    [0.215, 0.098, 0.11],
    [0.24, 0.078, 0.088],
    [0.262, 0.05, 0.056],
    [0.282, 0.022, 0.024],
    [0.297, 0.003, 0.003],
  ];
  const yel = placa(YEL, -PI, PI, { cz: CABEZA_CZ, closed: true, nu: 24, nv: 8 });
  out.push(P('head', 'plate', yel.geo));
  // los cuatro nervios, de la banda a la punta
  const nerv = [];
  for (let i = 0; i < 4; i++) nerv.push(tira(YEL, (i * PI) / 2 - 0.07, (i * PI) / 2 + 0.07, 0.17, 0.293, 0.0028, { cz: CABEZA_CZ, nu: 2, nv: 6 }).geo);
  out.push(P('head', 'iron', merge(nerv)));
  // la banda de la frente y sus remaches
  const banda = placa(
    [
      [0.156, 0.115, 0.128],
      [0.184, 0.112, 0.125],
    ],
    -PI,
    PI,
    { cz: CABEZA_CZ, closed: true, nu: 24, nv: 1 }
  );
  out.push(P('head', 'iron', merge([banda.geo, borde(banda.at, 'abajo', 0.0035, { n: 24 })])));
  out.push(P('head', 'iron', remaches(banda.at, 'abajo', 12, 0.0045, { d: 0.5, t0: 0, t1: 11 / 12 })));
  // el nasal: del yelmo a la punta de la nariz, por delante de ella
  out.push(
    P(
      'head',
      'iron',
      tube(
        [
          [0, 0.19, 0.121],
          [0, 0.15, 0.124],
          [0, 0.104, 0.131],
        ],
        (q) => [mix(0.011, 0.015, q), 0.003],
        { n: 6, seg: 4, up: [0, 0, 1], caps: true }
      )
    )
  );
  // el cuello del almófar: la malla que baja del cuello a los hombros (en el
  // pecho: no se mete en ellos al volver la cabeza)
  const cuello = capelet({ top: 0.62, bot: 0.488, r0: [0.088, 0.092], r1: [0.2, 0.152], dep: 0.005, n: 9, point: 0.02, seed: 2 });
  out.push(PD('chest', 'chainmail', cuello.geo));
  return out;
}
function guardiaTorso() {
  const out = [];
  // la loriga: la malla sobre el gambesón, a dedo y medio del cuerpo, hasta
  // el cuello (redondo); por debajo, la cintura (en la cadera) y los faldones
  // hasta medio muslo, abiertos por delante y por detrás para montar (en
  // cada muslo: le siguen al andar)
  const LOR = sobreTronco(0.013, 0.015);
  LOR.push([0.555, 0.096, 0.08]);
  const lor = placa(LOR, -PI, PI, { cz: czTronco, closed: true, nu: 26, nv: 12 });
  out.push(P('chest', 'chainmail', lor.geo));
  out.push(P('chest', 'leather', borde(lor.at, 'arriba', 0.006, { n: 26 })));
  const CIN = [
    [-0.12, 0.214, 0.15],
    [-0.04, 0.216, 0.152],
    [0.06, 0.206, 0.148],
    [0.15, 0.196, 0.14],
  ];
  out.push(P('hips', 'chainmail', placa(CIN, -PI, PI, { cz: 0.006, closed: true, nu: 26, nv: 4 }).geo));
  for (const [s, sx] of LADOS) {
    const [a0, a1] = muslo(sx, 0.5);
    const f = placa(
      [
        [-0.31, 0.11, 0.114],
        [-0.12, 0.112, 0.116],
        [0.07, 0.114, 0.118],
      ],
      a0,
      a1,
      { nu: 18, nv: 5, mod: (a, y) => 0.004 * folds(a * 2, 3, sx + 3) * sstep(0, -0.3, y) }
    );
    out.push(PD('leg' + s, 'chainmail', f.geo));
  }
  // las mangas de la loriga, hasta el codo
  for (const [s, sx] of LADOS)
    out.push(
      P(
        'arm' + s,
        'chainmail',
        tube(
          [
            [-sx * 0.008, 0.02, 0],
            [0, -0.13, 0.004],
            [0, -0.3, 0.002],
          ],
          (q) =>
            table(
              [
                [0, 0.071, 0.071],
                [0.3, 0.07, 0.074],
                [0.75, 0.06, 0.064],
                [1, 0.064, 0.066],
              ],
              q
            ),
          { n: 8, seg: 12 }
        )
      )
    );
  // la sobreveste carmesí: el peto y la espalda, sin mangas, de la cintura a
  // los hombros; por debajo del cinto, los faldones (delante y detrás de
  // cada muslo) hasta la rodilla, raídos
  const SOB = sobreTronco(0.022, 0.026, -0.06, 0.5);
  const sis = (y) => 1.02 - 0.22 * sstep(0.36, 0.5, y);
  const peto = placa(
    SOB,
    (y) => -sis(y),
    (y) => sis(y),
    { cz: czTronco, nu: 16, nv: 12 }
  );
  const esp = placa(
    SOB,
    (y) => PI - sis(y),
    (y) => PI + sis(y),
    { cz: czTronco, nu: 16, nv: 12 }
  );
  out.push(PD('chest', 'clothRed', peto.geo), PD('chest', 'clothRed', esp.geo));
  out.push(
    P(
      'chest',
      'clothRed',
      merge([
        borde(peto.at, 'arriba', 0.005, { n: 16 }),
        borde(esp.at, 'arriba', 0.005, { n: 16 }),
        borde(peto.at, 'u0', 0.004, { n: 10 }),
        borde(peto.at, 'u1', 0.004, { n: 10 }),
        borde(esp.at, 'u0', 0.004, { n: 10 }),
        borde(esp.at, 'u1', 0.004, { n: 10 }),
      ])
    )
  );
  // la cruz blanca, cosida al pecho
  const SC = SOB.map(([y, a, b]) => [y, a, b]);
  out.push(P('chest', 'clothWhite', merge([tira(SC, -0.17, 0.17, 0.14, 0.43, 0.003, { cz: czTronco, nv: 6 }).geo, tira(SC, -0.52, 0.52, 0.3, 0.36, 0.0035, { cz: czTronco, nu: 10, nv: 2 }).geo])));
  for (const [s, sx] of LADOS) {
    const raido = (u) => -0.035 * Math.max(0, folds(u * TAU * 1.6 + sx, 3, sx + 6)) - 0.012 * Math.sin(u * 37 + sx);
    for (const [c, ancho] of [
      [0, 1.15],
      [PI, 1.1],
    ]) {
      // (el de delante, un poco hacia fuera; el de detrás, igual)
      const m = c === 0 ? sx * 0.32 : PI - sx * 0.32;
      const f = placa(
        [
          [-0.43, 0.13, 0.134],
          [-0.2, 0.126, 0.13],
          [0.06, 0.122, 0.126],
        ],
        m - ancho,
        m + ancho,
        { nu: 12, nv: 7, hem: raido, mod: (a, y) => 0.006 * folds(a * 3 + sx, 2, sx + 2) * sstep(-0.05, -0.4, y) }
      );
      out.push(PD('leg' + s, 'clothRed', f.geo));
    }
  }
  // el cinto, con su hebilla, sobre la sobreveste
  {
    const c = placa(
      [
        [0.05, 0.222, 0.16],
        [0.09, 0.219, 0.158],
      ],
      -PI,
      PI,
      { cz: 0.006, closed: true, nu: 26, nv: 1 }
    );
    out.push(P('hips', 'leather', merge([c.geo, borde(c.at, 'arriba', 0.0025, { n: 26 }), borde(c.at, 'abajo', 0.0025, { n: 26 })])));
    out.push(P('hips', 'iron', merge([gBox(0.036, 0.046, 0.008, [0.07, 0.07, 0.165], [0, 22, 0]), gBox(0.006, 0.034, 0.012, [0.07, 0.07, 0.169], [0, 22, 0])])));
  }
  // las hombreras: una placa abombada sobre cada hombro, con su canto de
  // hierro (en el pecho)
  for (const [, sx] of LADOS) {
    const c = cupula(0.082, 0.05, { d: 1.08, nu: 16 });
    const p = [sx * 0.214, 0.478, -0.008],
      r = [0, 0, -sx * 30];
    out.push(PD('chest', 'plate', place(c.geo, p, r)));
    out.push(P('chest', 'iron', place(borde(c.at, 'abajo', 0.005, { n: 20 }), p, r)));
  }
  // la correa del escudo: de un hombro a la cadera del otro, por la espalda
  {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const y = mix(0.47, 0.06, t),
        x = mix(-0.12, 0.13, t);
      const [ax, az] = table(SOB, y);
      const a = PI + Math.asin(Math.max(-1, Math.min(1, x / ax)));
      const r = ell(a, ax, az) + 0.006;
      pts.push([Math.sin(a) * r, y, Math.cos(a) * r + czTronco(y)]);
    }
    out.push(P('chest', 'leather', tube(pts, [0.022, 0.0035], { n: 16, seg: 4, upFn: (s) => [0, 0, -1] })));
  }
  // la capa raída: cuelga de los hombros (su articulación, detrás de la
  // nuca, la mueve el muelle de la carrera), envuelve un poco la espalda y
  // arrastra el bajo hecho jirones; el cuello, vuelto, sobre los hombros
  {
    // (arriba, pegada a lo alto de la espalda; luego se separa de la
    // sobreveste —la paletilla, el cinto, las nalgas— y cae a plomo)
    const C = cloth(0.34, 0.9, {
      flare: 1.5,
      folds: [7, 0.022],
      seed: 4,
      wrap: 0.26,
      out: (v) => mix(-0.022, 0.05, sstep(0, 0.62, v)),
      top: (u) => -0.03 + 0.02 * Math.abs(u - 0.5) * 2,
      hem: (u) => 0.05 * Math.max(0, folds(u * TAU * 2, 3, 7)) + 0.03 * Math.sin(u * 41),
      nu: 18,
      nv: 12,
    });
    out.push(PD('cloak', 'clothRed', place(C.geo, [0, 0, 0.006], [0, 180, 0])));
    const cu = [];
    for (let i = 0; i <= 12; i++) {
      const p = C.at(i / 12, 0.02);
      cu.push([-p[0], p[1] + 0.006, -p[2] + 0.012]);
    }
    out.push(P('cloak', 'clothRed', tube(cu, [0.024, 0.016], { n: 16, seg: 6, caps: true, capL: 0.02 })));
  }
  return out;
}
function guardiaManos() {
  const out = [];
  for (const [s, sx] of LADOS) {
    // el brazal de cuero, atado por dentro
    const br = placa(
      [
        [-0.238, 0.04, 0.038],
        [-0.14, 0.049, 0.05],
        [-0.035, 0.057, 0.06],
      ],
      -sx * PI * 0.5 + 0.3,
      -sx * PI * 0.5 + TAU - 0.3,
      { cz: 0.004, nu: 16, nv: 5 }
    );
    out.push(PD('fore' + s, 'leather', br.geo));
    out.push(P('fore' + s, 'leather', merge([borde(br.at, 'arriba', 0.004, { n: 16 }), borde(br.at, 'abajo', 0.004, { n: 16 })])));
    const cord = [];
    for (let i = 0; i < 3; i++) {
      const v0 = 0.16 + i * 0.27;
      cord.push(tube([br.at(0.02, v0), br.at(0.98, v0 + 0.14)], 0.0024, { n: 2, seg: 4 }), tube([br.at(0.98, v0), br.at(0.02, v0 + 0.14)], 0.0024, { n: 2, seg: 4 }));
    }
    out.push(P('fore' + s, 'rope', merge(cord)));
    // el guante, con su puño vuelto
    const m = mano({ side: sx, curl: s === 'R' ? 0.62 : 0.45, spread: 0.18, thick: 1.14, wide: 1.06, len: 1.02, thumb: s === 'R' ? 0.35 : 0.55 });
    out.push(P('hand' + s, 'leather', merge([m.carne, m.yemas])));
    const pu = placa(
      [
        [-0.014, 0.038, 0.033],
        [0.03, 0.047, 0.043],
      ],
      -PI,
      PI,
      { closed: true, nu: 12, nv: 2 }
    );
    out.push(PD('hand' + s, 'leather', pu.geo));
  }
  return out;
}
// La bota: la caña de la espinilla (en la espinilla) y el pie (en el pie; la
// suela, a ras del suelo), redondo de punta
function botaPie(sd, o = {}) {
  const S = -0.04;
  const T = o.T || [
    [0, 0.046, 0.043],
    [0.3, 0.05, 0.046],
    [0.62, 0.052, 0.034],
    [0.88, 0.045, 0.025],
    [1, 0.024, 0.015],
  ];
  const zs = o.zs || [-0.07, 0.02, 0.1, 0.162, 0.198];
  return tube(
    zs.map((z, i) => {
      const s = i / (zs.length - 1);
      return [-sd * 0.007 * s, S + table(T, s)[1], z];
    }),
    (s) => table(T, s),
    { up: [0, 1, 0], n: 12, seg: 10, caps: true, capL: 0.02 }
  );
}
function suela(sd, mat) {
  return P(
    'foot' + (sd > 0 ? 'L' : 'R'),
    mat,
    tube(
      [
        [0, -0.036, -0.066],
        [-sd * 0.004, -0.037, 0.08],
        [-sd * 0.008, -0.036, 0.196],
      ],
      [0.048, 0.006],
      { up: [0, 1, 0], n: 6, seg: 6, caps: true, capL: 0.02 }
    )
  );
}
function guardiaPiernas() {
  const out = [];
  for (const [s, sx] of LADOS) {
    // las calzas de paño oscuro: el muslo y la rodilla
    out.push(
      P(
        'leg' + s,
        'clothDark',
        tube(
          [
            [0, 0.06, 0],
            [0, -0.2, 0.012],
            [0, -0.46, 0.002],
          ],
          (q) =>
            table(
              [
                [0, 0.1, 0.102],
                [0.35, 0.091, 0.097],
                [1, 0.064, 0.068],
              ],
              q
            ),
          { n: 8, seg: 12 }
        )
      )
    );
    out.push(
      P(
        'shin' + s,
        'clothDark',
        tube(
          [
            [0, 0.04, 0.008],
            [0, -0.06, 0.002],
            [0, -0.14, -0.002],
          ],
          (q) =>
            table(
              [
                [0, 0.058, 0.072],
                [0.5, 0.061, 0.072],
                [1, 0.059, 0.068],
              ],
              q
            ),
          { n: 5, seg: 12 }
        )
      )
    );
    // la bota de cuero hasta debajo de la rodilla, con su vuelta
    out.push(
      P(
        'shin' + s,
        'leather',
        tube(
          [
            [0, -0.1, -0.002],
            [0, -0.22, -0.006],
            [0, -0.33, -0.002],
            [0, -0.43, 0.004],
          ],
          (q) =>
            table(
              [
                [0, 0.066, 0.076],
                [0.3, 0.063, 0.074],
                [0.7, 0.05, 0.055],
                [1, 0.046, 0.049],
              ],
              q
            ),
          { n: 8, seg: 12 }
        )
      )
    );
    const vuelta = placa(
      [
        [-0.135, 0.072, 0.082],
        [-0.09, 0.07, 0.08],
      ],
      -PI,
      PI,
      { cz: -0.004, closed: true, nu: 14, nv: 2, mod: (a) => 0.003 * Math.sin(a * 5 + sx) }
    );
    out.push(PD('shin' + s, 'leather', vuelta.geo));
    out.push(P('foot' + s, 'leather', botaPie(sx)));
    out.push(suela(sx, 'leather'));
  }
  return out;
}

// ------------------------------------------------------------ caballero
// La de un caballero del Rey: hierro de arriba abajo. El yelmo de calva
// apuntada con su cresta, la banda de latón, el nasal ancho, las carrilleras
// y el cubrenuca, y el camal de malla sobre los hombros (la cara, al aire); el
// peto con su arista y el espaldar, la gola, las hombreras de cúpula con sus
// lamas, las mangas de malla con los brazales de arriba, el faldar de tres
// lamas, las escarcelas sobre los muslos y los faldones azules del Rey por
// detrás; los brazales, los codales y los guanteletes; las calzas de malla,
// los quijotes, las rodilleras, las grebas y los escarpes.
const AC = 'cabAcero',
  LA = 'cabLaton';
function caballeroCabeza() {
  const out = [];
  const CZ = CABEZA_CZ;
  // la calva, algo apuntada, con la cresta de la frente a la nuca: a dos
  // dedos del cráneo (el gorro acolchado) y tres por encima de la coronilla
  const calva = placa(
    [
      [0.166, 0.103, 0.114],
      [0.195, 0.1, 0.11],
      [0.22, 0.09, 0.099],
      [0.242, 0.068, 0.076],
      [0.259, 0.044, 0.049],
      [0.272, 0.019, 0.021],
      [0.278, 0.002, 0.002],
    ],
    -PI,
    PI,
    { cz: CZ, closed: true, nu: 28, nv: 9, mod: (a, y) => 0.006 * (Math.exp(-((a / 0.08) ** 2)) + Math.exp(-(((Math.abs(a) - PI) / 0.08) ** 2))) * sstep(0.17, 0.21, y) * sstep(0.28, 0.252, y) }
  );
  out.push(P('head', AC, calva.geo));
  // la banda de la frente, de latón, con sus remaches
  const banda = placa(
    [
      [0.16, 0.106, 0.117],
      [0.188, 0.105, 0.116],
    ],
    -PI,
    PI,
    { cz: CZ, closed: true, nu: 28, nv: 1 }
  );
  out.push(P('head', LA, merge([banda.geo, borde(banda.at, 'abajo', 0.0034, { n: 28 }), borde(banda.at, 'arriba', 0.0034, { n: 28 })])));
  out.push(P('head', AC, remaches(banda.at, 'abajo', 14, 0.0046, { d: 0.5, t0: 0, t1: 13 / 14 })));
  // el cubrenuca, por detrás, que se abre un poco sobre el camal
  const nuca = placa(
    [
      [0.052, 0.104, 0.116],
      [0.1, 0.102, 0.113],
      [0.162, 0.104, 0.116],
    ],
    1.4,
    TAU - 1.4,
    { cz: CZ, nu: 18, nv: 4 }
  );
  out.push(PD('head', AC, nuca.geo));
  out.push(P('head', AC, merge([borde(nuca.at, 'abajo', 0.004), borde(nuca.at, 'u0', 0.0035), borde(nuca.at, 'u1', 0.0035)])));
  // las carrilleras: bajan de la banda por las mejillas, sobre la oreja, hasta
  // la quijada, con el borde de delante en curva (se abre a los ojos y se
  // cierra a la boca); colgadas de dos remaches
  for (const [, sx] of LADOS) {
    const fr = (y) =>
      table(
        [
          [0.02, 0.66],
          [0.06, 0.6],
          [0.1, 0.64],
          [0.16, 0.8],
        ],
        y
      )[0];
    const PR = [
      [0.02, 0.086, 0.094],
      [0.065, 0.098, 0.106],
      [0.115, 0.107, 0.114],
      [0.162, 0.106, 0.116],
    ];
    const c = sx > 0 ? placa(PR, (y) => fr(y), 1.45, { cz: CZ, nu: 8, nv: 6 }) : placa(PR, -1.45, (y) => -fr(y), { cz: CZ, nu: 8, nv: 6 });
    out.push(PD('head', AC, c.geo));
    out.push(P('head', AC, merge([borde(c.at, sx > 0 ? 'u0' : 'u1', 0.0036, { n: 10 }), borde(c.at, 'abajo', 0.0036, { n: 8 })])));
    out.push(P('head', LA, remaches(c.at, 'arriba', 2, 0.0046, { d: 0.12, t0: 0.3, t1: 0.75 })));
  }
  // el nasal, ancho, que se abre abajo (por delante de la nariz)
  out.push(
    P(
      'head',
      AC,
      tube(
        [
          [0, 0.19, 0.115],
          [0, 0.15, 0.121],
          [0, 0.104, 0.13],
        ],
        (q) => [mix(0.012, 0.019, q), 0.0036],
        { n: 6, seg: 4, up: [0, 0, 1], caps: true }
      )
    )
  );
  out.push(
    P(
      'head',
      LA,
      tube(
        [
          [0, 0.186, 0.119],
          [0, 0.15, 0.1245],
          [0, 0.112, 0.133],
        ],
        [0.0045, 0.0022],
        { n: 6, seg: 4, up: [0, 0, 1], caps: true }
      )
    )
  );
  // el camal: malla que cuelga del yelmo y cubre el cuello y lo alto de los
  // hombros (en el pecho: no se mete en ellos al volver la cabeza)
  const camal = capelet({ top: 0.615, bot: 0.494, r0: [0.088, 0.09], r1: [0.19, 0.148], dep: 0.005, n: 10, point: 0.025, seed: 3 });
  out.push(PD('chest', 'chainmail', camal.geo));
  return out;
}
function caballeroTorso() {
  const out = [];
  // el peto, con el pecho de paloma, la arista y el talle estrecho, y el
  // espaldar, más plano, con la canal del espinazo: se solapan por los
  // costados (el espaldar va por fuera) y dejan las sisas abiertas arriba; a
  // dos dedos del cuerpo (el gambesón y la malla)
  const PR = [
    [-0.03, 0.18, 0.13],
    [0.05, 0.178, 0.13],
    [0.16, 0.19, 0.142],
    [0.28, 0.206, 0.152],
    [0.38, 0.214, 0.148],
    [0.45, 0.206, 0.134],
    [0.51, 0.17, 0.11],
    [0.555, 0.118, 0.093],
  ];
  const PRb = [
    [-0.03, 0.185, 0.13],
    [0.05, 0.183, 0.13],
    [0.16, 0.195, 0.136],
    [0.28, 0.211, 0.142],
    [0.38, 0.219, 0.142],
    [0.45, 0.211, 0.134],
    [0.51, 0.175, 0.115],
    [0.555, 0.123, 0.097],
  ];
  const sisa = (y) => 1.64 - 0.54 * sstep(0.28, 0.47, y);
  const peto = placa(
    PR,
    (y) => -sisa(y),
    (y) => sisa(y),
    { cz: czTronco, arista: 0.016, aristaW: 0.2, aristaY: (y) => sstep(-0.03, 0.1, y) * sstep(0.56, 0.42, y), nu: 24, nv: 14 }
  );
  const esp = placa(
    PRb,
    (y) => PI - sisa(y),
    (y) => PI + sisa(y),
    { cz: czTronco, nu: 24, nv: 12, mod: (a, y) => -0.007 * Math.exp(-(((a - PI) / 0.16) ** 2)) * sstep(0.08, 0.3, y) }
  );
  out.push(PD('chest', AC, peto.geo), PD('chest', AC, esp.geo));
  out.push(
    P(
      'chest',
      AC,
      merge([
        borde(peto.at, 'arriba', 0.006),
        borde(peto.at, 'abajo', 0.0055),
        borde(peto.at, 'u0', 0.005),
        borde(peto.at, 'u1', 0.005),
        borde(esp.at, 'arriba', 0.006),
        borde(esp.at, 'abajo', 0.0055),
        borde(esp.at, 'u0', 0.005),
        borde(esp.at, 'u1', 0.005),
      ])
    )
  );
  out.push(P('chest', LA, merge([remaches(peto.at, 'abajo', 9, 0.005, { d: 0.05 }), remaches(esp.at, 'abajo', 9, 0.005, { d: 0.05 }), remaches(peto.at, 'arriba', 5, 0.0046, { d: 0.08, t0: 0.25, t1: 0.75 })])));
  // la gola: dos lamas alrededor del cuello
  for (const [y0, y1, r0, r1] of [
    [0.5, 0.548, 0.116, 0.104],
    [0.535, 0.588, 0.102, 0.088],
  ]) {
    const g = placa(
      [
        [y0, r0, r0 * 0.88],
        [y1, r1, r1 * 0.9],
      ],
      -PI,
      PI,
      { closed: true, cz: -0.008, nu: 20, nv: 2 }
    );
    out.push(PD('chest', AC, g.geo));
    out.push(P('chest', AC, borde(g.at, 'arriba', 0.0038, { n: 20 })));
  }
  // las hombreras: una cúpula sobre cada hombro (en el pecho), echada hacia
  // fuera, con su reborde y sus remaches (de hombro a hombro, sesenta
  // centímetros: antes, sesenta y siete)
  for (const [, sx] of LADOS) {
    const c = cupula(0.09, 0.068, { d: 1.04, nu: 18 });
    const p = [sx * 0.222, 0.452, -0.006],
      r = [0, 0, -sx * 28];
    out.push(PD('chest', AC, place(c.geo, p, r)));
    out.push(P('chest', AC, place(borde(c.at, 'abajo', 0.0052, { n: 22 }), p, r)));
    out.push(P('chest', LA, place(remaches(c.at, 'abajo', 7, 0.0048, { d: 0.12, t0: 0.05, t1: 0.95 }), p, r)));
  }
  // los brazos: la manga de malla y, en la cara de fuera, dos lamas bajo la
  // hombrera y el brazal de arriba
  for (const [s, sx] of LADOS) {
    out.push(
      P(
        'arm' + s,
        'chainmail',
        tube(
          [
            [-sx * 0.006, 0.045, 0],
            [0, -0.13, 0.004],
            [0, -0.3, 0],
          ],
          (q) => [mix(0.071, 0.058, q), mix(0.072, 0.061, q)],
          { n: 6, seg: 12 }
        )
      )
    );
    const fuera = sx * (PI / 2);
    for (const [y0, y1, r0, r1] of [
      [-0.07, -0.027, 0.081, 0.078],
      [-0.106, -0.062, 0.078, 0.075],
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
      out.push(P('arm' + s, AC, borde(l.at, 'abajo', 0.0036, { n: 12 })));
    }
    const rb = placa(
      [
        [-0.265, 0.058, 0.06],
        [-0.19, 0.064, 0.067],
        [-0.115, 0.07, 0.073],
      ],
      fuera - 1.45,
      fuera + 1.45,
      { nu: 12, nv: 4 }
    );
    out.push(PD('arm' + s, AC, rb.geo));
    out.push(P('arm' + s, AC, merge([borde(rb.at, 'abajo', 0.0038, { n: 12 }), borde(rb.at, 'arriba', 0.0038, { n: 12 })])));
  }
  // la cadera: la malla que asoma bajo el faldar, el faldar de tres lamas
  // (cada una sobre la de abajo), el cinto con su hebilla
  {
    const m = placa(
      [
        [-0.145, 0.206, 0.152],
        [-0.06, 0.2, 0.148],
        [0.02, 0.19, 0.142],
      ],
      -PI,
      PI,
      { cz: 0.006, closed: true, nu: 24, nv: 4 }
    );
    out.push(PD('hips', 'chainmail', m.geo));
  }
  for (const [y0, y1, r0, r1] of [
    [-0.118, -0.048, 0.218, 0.21],
    [-0.062, 0.008, 0.21, 0.202],
    [-0.006, 0.075, 0.202, 0.19],
  ]) {
    const l = placa(
      [
        [y0, r0, r0 * 0.72],
        [y1, r1, r1 * 0.72],
      ],
      -PI,
      PI,
      { cz: 0.006, closed: true, nu: 26, nv: 2 }
    );
    out.push(PD('hips', AC, l.geo));
    out.push(P('hips', AC, borde(l.at, 'abajo', 0.0045, { n: 26 })));
    out.push(P('hips', LA, remaches(l.at, 'arriba', 13, 0.0044, { d: 0.3, t0: 0, t1: 12 / 13 })));
  }
  {
    const c = placa(
      [
        [0.036, 0.196, 0.146],
        [0.07, 0.19, 0.142],
      ],
      -PI,
      PI,
      { cz: 0.006, closed: true, nu: 26, nv: 1 }
    );
    out.push(P('hips', 'leather', c.geo));
    out.push({ j: 'hips', type: 'box', s: [0.044, 0.044, 0.01], p: [0.05, 0.053, 0.152], mat: LA });
    out.push({ j: 'hips', type: 'box', s: [0.026, 0.026, 0.012], p: [0.05, 0.053, 0.154], mat: 'leather' });
  }
  // las escarcelas: dos lamas sobre la delantera de cada muslo (en el muslo:
  // le siguen), y los faldones azules por detrás, hasta la corva
  for (const [s, sx] of LADOS) {
    for (const [y0, y1, r0, r1] of [
      [-0.3, -0.19, 0.128, 0.122],
      [-0.205, -0.07, 0.122, 0.116],
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
      out.push(P('leg' + s, AC, merge([borde(e.at, 'abajo', 0.0042, { n: 12 }), borde(e.at, 'u0', 0.0034, { n: 4 }), borde(e.at, 'u1', 0.0034, { n: 4 })])));
      out.push(P('leg' + s, LA, remaches(e.at, 'arriba', 3, 0.0044, { d: 0.25, t0: 0.2, t1: 0.8 })));
    }
    const f = placa(
      [
        [-0.42, 0.134, 0.124],
        [-0.2, 0.126, 0.118],
        [-0.01, 0.12, 0.112],
      ],
      PI - 1.25,
      PI + 1.25,
      { nu: 10, nv: 6, mod: (a, y) => 0.005 * folds(a * 3 + sx, 2, sx + 2) * sstep(-0.1, -0.4, y) }
    );
    out.push(PD('leg' + s, 'clothBlue', f.geo));
    out.push(P('leg' + s, 'clothWhite', borde(f.at, 'abajo', 0.005, { n: 10 })));
  }
  return out;
}
function caballeroManos() {
  const out = [];
  for (const [s, sx] of LADOS) {
    // el brazal: un tubo de placa del codo a la muñeca, con su bisagra de
    // remaches por dentro
    const br = placa(
      [
        [-0.245, 0.043, 0.04],
        [-0.14, 0.052, 0.051],
        [-0.035, 0.058, 0.058],
      ],
      -PI,
      PI,
      { cz: 0.004, closed: true, nu: 16, nv: 5, arista: 0.004, aristaW: 0.25 }
    );
    out.push(P('fore' + s, AC, br.geo));
    out.push(P('fore' + s, AC, merge([borde(br.at, 'arriba', 0.0042, { n: 16 }), borde(br.at, 'abajo', 0.0042, { n: 16 })])));
    out.push(P('fore' + s, LA, remaches(br.at, 'u0', 3, 0.0042, { d: sx > 0 ? 0.25 : 0.75, t0: 0.2, t1: 0.8 })));
    // el codal: la cazoleta del codo y su rodela por fuera
    out.push(P('fore' + s, AC, merge([gSph(1, [0, -0.004, -0.022], [0.05, 0.046, 0.044], 10, 6), place(new THREE.CylinderGeometry(0.034, 0.034, 0.006, 12), [sx * 0.052, -0.012, -0.012], [0, 0, 90])])));
    out.push(P('fore' + s, LA, gSph(0.0066, [sx * 0.056, -0.012, -0.012], [1, 1, 1], 6, 4)));
    // el guantelete: la bocamanga acampanada sobre la muñeca, la mano de
    // lamas (los dedos articulados) y la placa de los nudillos
    const bm = placa(
      [
        [-0.022, 0.042, 0.038],
        [0.046, 0.06, 0.055],
      ],
      -PI,
      PI,
      { closed: true, nu: 14, nv: 3 }
    );
    out.push(PD('hand' + s, AC, bm.geo));
    out.push(P('hand' + s, LA, borde(bm.at, 'arriba', 0.0038, { n: 14 })));
    const m = mano({ side: sx, curl: s === 'R' ? 0.62 : 0.45, spread: 0.12, thick: 1.3, wide: 1.12, len: 1.04, thumb: s === 'R' ? 0.35 : 0.55 });
    out.push(P('hand' + s, AC, merge([m.carne, m.yemas])));
    out.push({ j: 'hand' + s, type: 'box', s: [0.011, 0.028, 0.086], p: [sx * 0.019, -0.084, 0.003], mat: AC });
  }
  return out;
}
// el escarpe: un zapato de placa con la punta algo apuntada (en el pie; la
// suela, a ras del suelo); sus lamas, sobre el empeine, van aparte
function escarpe(sd) {
  return botaPie(sd, {
    T: [
      [0, 0.043, 0.04],
      [0.3, 0.049, 0.042],
      [0.62, 0.052, 0.029],
      [0.88, 0.036, 0.017],
      [1, 0.012, 0.008],
    ],
    zs: [-0.066, 0.02, 0.096, 0.158, 0.204],
  });
}
function caballeroPiernas() {
  const out = [];
  for (const [s, sx] of LADOS) {
    // las calzas de malla
    out.push(
      P(
        'leg' + s,
        'chainmail',
        tube(
          [
            [0, 0.06, 0],
            [0, -0.2, 0.01],
            [0, -0.46, 0],
          ],
          (q) => [mix(0.098, 0.063, q), mix(0.1, 0.067, q)],
          { n: 8, seg: 12 }
        )
      )
    );
    out.push(
      P(
        'shin' + s,
        'chainmail',
        tube(
          [
            [0, 0.03, 0],
            [0, -0.2, -0.004],
            [0, -0.42, 0],
          ],
          (q) => [mix(0.06, 0.042, q), mix(0.07, 0.046, q)],
          { n: 6, seg: 10 }
        )
      )
    );
    // el quijote: la placa de delante del muslo, con su arista
    const q = placa(
      [
        [-0.4, 0.074, 0.079],
        [-0.24, 0.09, 0.098],
        [-0.06, 0.103, 0.109],
      ],
      -1.3,
      1.3,
      { arista: 0.007, nu: 14, nv: 6 }
    );
    out.push(PD('leg' + s, AC, q.geo));
    out.push(P('leg' + s, AC, merge([borde(q.at, 'arriba', 0.0042, { n: 14 }), borde(q.at, 'abajo', 0.0042, { n: 14 }), borde(q.at, 'u0', 0.0034, { n: 6 }), borde(q.at, 'u1', 0.0034, { n: 6 })])));
    // (la correa que lo sujeta, por detrás del muslo)
    out.push(P('leg' + s, 'leather', place(new THREE.TorusGeometry(0.095, 0.005, 4, 16), [0, -0.14, 0.004], [90, 0, 0], [1, 1.05, 1])));
    // la rodillera: la cazoleta de la rodilla con su rodela por fuera
    const rod = cupula(0.05, 0.036, { d: 0.95, nu: 14 });
    out.push(PD('shin' + s, AC, place(rod.geo, [0, 0.004, 0.05], [90, 0, 0])));
    out.push(P('shin' + s, AC, place(borde(rod.at, 'abajo', 0.0038, { n: 16 }), [0, 0.004, 0.05], [90, 0, 0])));
    out.push(P('shin' + s, AC, place(new THREE.CylinderGeometry(0.034, 0.034, 0.006, 12), [sx * 0.062, -0.004, 0.012], [0, 0, 90])));
    out.push(P('shin' + s, LA, gSph(0.0064, [sx * 0.066, -0.004, 0.012], [1, 1, 1], 6, 4)));
    // la greba: de la rodilla al tobillo, con la arista de la espinilla
    const gr = placa(
      [
        [-0.41, 0.046, 0.05],
        [-0.3, 0.051, 0.057],
        [-0.14, 0.065, 0.077],
        [-0.045, 0.064, 0.074],
      ],
      -PI,
      PI,
      { cz: -0.004, closed: true, arista: 0.007, aristaW: 0.22, nu: 18, nv: 8 }
    );
    out.push(P('shin' + s, AC, gr.geo));
    out.push(P('shin' + s, AC, merge([borde(gr.at, 'arriba', 0.0044, { n: 18 }), borde(gr.at, 'abajo', 0.0042, { n: 18 })])));
    out.push(P('shin' + s, LA, remaches(gr.at, 'arriba', 2, 0.0046, { d: 0.08, t0: 0.18, t1: 0.82 })));
    // el escarpe y sus lamas
    out.push(P('foot' + s, AC, escarpe(sx)));
    for (const [z, w, h] of [
      [0.0, 0.098, 0.074],
      [0.045, 0.102, 0.062],
      [0.09, 0.104, 0.05],
    ])
      out.push(P('foot' + s, AC, place(new THREE.TorusGeometry(1, 0.05, 4, 14, PI), [-sx * 0.004, -0.04, z], [0, 0, 0], [w * 0.5, h, 0.07])));
    out.push(P('foot' + s, 'leather', place(new THREE.TorusGeometry(0.05, 0.005, 4, 14), [0, -0.012, -0.012], [90, 0, 0], [1, 1.12, 1])));
  }
  return out;
}

// ------------------------------------------------------------ cuero
// La de un batidor, de los que van por delante a caballo: lo que se lleva
// para correr y no para aguantar. La capucha de cuero con su esclavina; el
// gambesón acolchado (con sus faldones abiertos sobre los muslos) y, encima,
// el coleto de cuero cocido con sus correas, las hombreras pequeñas, el cinto
// ancho y la bolsa; los brazales atados y los guantes; las calzas de lana y
// las botas altas con su vuelta y sus hebillas.
const CC = 'cueCocido',
  CB = 'cueBlando',
  GA = 'cueAcolchado';
function cueroCabeza() {
  const out = [];
  // la capucha: ceñida (a dedo de las orejas), con poco pico
  out.push(PD('head', CB, hoodUp({ open: 0.6, peak: 0.032, fall: 0.04, fwd: 0.012, rx: 0.106, ry: 0.13, rz: 0.116, c: [0, 0.118, -0.006], rim: 0.008, low: -1.0 })));
  const es = capelet({ top: 0.62, bot: 0.452, r0: [0.1, 0.1], r1: [0.224, 0.17], point: 0.05, n: 8, dep: 0.009, seed: 5 });
  out.push(PD('chest', CB, es.geo));
  // la correa del cuello con su hebilla
  out.push(
    P(
      'chest',
      'leather',
      tube(
        [
          [0.068, 0.6, 0.08],
          [0.0, 0.586, 0.108],
          [-0.068, 0.6, 0.08],
        ],
        0.006,
        { n: 8, seg: 5, caps: true, capL: 0.005 }
      )
    )
  );
  out.push(P('chest', 'iron', gBox(0.022, 0.02, 0.007, [0, 0.586, 0.113], [0, 0, 0])));
  return out;
}
function cueroTorso() {
  const out = [];
  // el gambesón: el cuerpo acolchado (hasta el cuello, con su collarín), las
  // mangas hasta el codo y la cintura
  const GAM = sobreTronco(0.017, 0.019);
  GAM.push([0.6, 0.086, 0.082]);
  out.push(P('chest', GA, placa(GAM, -PI, PI, { cz: czTronco, closed: true, nu: 22, nv: 12, mod: (a, y) => 0.003 * Math.cos(a * 14) * sstep(0.5, 0.4, y) }).geo));
  out.push(P('chest', GA, place(new THREE.TorusGeometry(0.084, 0.011, 5, 16), [0, 0.598, -0.006], [90, 0, 0], [1, 0.98, 1])));
  for (const [s, sx] of LADOS) {
    out.push(
      P(
        'arm' + s,
        GA,
        tube(
          [
            [-sx * 0.01, 0.048, 0],
            [0, -0.13, 0.004],
            [0, -0.3, 0],
          ],
          (q) => [mix(0.077, 0.061, q), mix(0.076, 0.063, q)],
          { n: 6, seg: 12, mod: (a, q) => 1 + 0.035 * folds(a, 3, sx + 4) * q }
        )
      )
    );
    out.push(P('arm' + s, GA, place(new THREE.TorusGeometry(0.06, 0.008, 4, 12), [0, -0.29, 0.001], [90, 0, 0])));
  }
  out.push(
    P(
      'hips',
      GA,
      placa(
        [
          [-0.08, 0.214, 0.152],
          [0.04, 0.21, 0.15],
          [0.16, 0.202, 0.144],
        ],
        -PI,
        PI,
        { cz: 0.006, closed: true, nu: 20, nv: 4 }
      ).geo
    )
  );
  // los faldones del gambesón: delante y detrás de cada muslo, abiertos por
  // los lados (en el muslo: le siguen al andar)
  for (const [s, sx] of LADOS) {
    for (const c of [0, PI]) {
      const f = placa(
        [
          [-0.33, 0.128, 0.122],
          [-0.15, 0.123, 0.117],
          [0.04, 0.118, 0.112],
        ],
        c - 1.32,
        c + 1.32,
        { nu: 10, nv: 6 }
      );
      out.push(PD('leg' + s, GA, f.geo));
      out.push(P('leg' + s, CB, borde(f.at, 'abajo', 0.0055, { n: 10 })));
    }
  }
  // el coleto: el peto y el espaldar de cuero cocido, con sus cantos
  // cosidos, sus tachones y las correas de los costados y de los hombros
  const PR = sobreTronco(0.03, 0.033, 0.0, 0.5);
  const sisa = (y) => 1.52 - 0.5 * sstep(0.26, 0.44, y);
  const peto = placa(
    PR,
    (y) => -sisa(y),
    (y) => sisa(y),
    { cz: czTronco, nu: 18, nv: 8, mod: (a, y) => 0.005 * Math.exp(-((a / 0.5) ** 2)) * sstep(0.1, 0.3, y) * sstep(0.5, 0.36, y) }
  );
  const esp = placa(
    PR,
    (y) => PI - sisa(y),
    (y) => PI + sisa(y),
    { cz: czTronco, nu: 18, nv: 8 }
  );
  out.push(PD('chest', CC, peto.geo), PD('chest', CC, esp.geo));
  out.push(
    P(
      'chest',
      'leather',
      merge([
        borde(peto.at, 'arriba', 0.005),
        borde(peto.at, 'abajo', 0.005),
        borde(peto.at, 'u0', 0.0045),
        borde(peto.at, 'u1', 0.0045),
        borde(esp.at, 'arriba', 0.005),
        borde(esp.at, 'abajo', 0.005),
        borde(esp.at, 'u0', 0.0045),
        borde(esp.at, 'u1', 0.0045),
      ])
    )
  );
  out.push(P('chest', 'iron', merge([remaches(peto.at, 'abajo', 8, 0.0042, { d: 0.08 }), remaches(peto.at, 'arriba', 4, 0.0042, { d: 0.1, t0: 0.2, t1: 0.8 }), remaches(esp.at, 'abajo', 8, 0.0042, { d: 0.08 })])));
  for (const [, sx] of LADOS) {
    // las correas de los costados (tres, con su hebilla) y la del hombro
    for (let i = 0; i < 3; i++) {
      const y = 0.06 + i * 0.075;
      const [rx, rz] = table(PR, y);
      const x = sx * (ell(PI / 2, rx, rz) + 0.003);
      out.push(P('chest', 'leather', gBox(0.007, 0.015, 0.064, [x, y, czTronco(y)], [0, 0, 0])));
      out.push(P('chest', 'iron', gBox(0.009, 0.02, 0.014, [x + sx * 0.002, y, czTronco(y) + 0.024], [0, 0, 0])));
    }
    out.push(
      P(
        'chest',
        'leather',
        tube(
          [
            [sx * 0.108, 0.488, 0.108],
            [sx * 0.148, 0.536, 0.026],
            [sx * 0.144, 0.532, -0.05],
            [sx * 0.108, 0.488, -0.11],
          ],
          [0.016, 0.0045],
          { n: 10, seg: 4, up: [0, 1, 0] }
        )
      )
    );
    // la hombrera pequeña: una cúpula de cuero cocido
    const c = cupula(0.078, 0.052, { d: 1.05, nu: 14 });
    const p = [sx * 0.22, 0.458, -0.006],
      r = [0, 0, -sx * 30];
    out.push(PD('chest', CC, place(c.geo, p, r)));
    out.push(P('chest', 'leather', place(borde(c.at, 'abajo', 0.0042, { n: 18 }), p, r)));
    out.push(P('chest', 'iron', place(remaches(c.at, 'abajo', 5, 0.0038, { d: 0.15, t0: 0.1, t1: 0.9 }), p, r)));
  }
  // el cinto ancho con su hebilla, la bolsa a la derecha y el cuchillo
  {
    const c = placa(
      [
        [0.04, 0.222, 0.16],
        [0.1, 0.216, 0.156],
      ],
      -PI,
      PI,
      { cz: 0.006, closed: true, nu: 26, nv: 1 }
    );
    out.push(P('hips', 'leather', merge([c.geo, borde(c.at, 'arriba', 0.0026, { n: 26 }), borde(c.at, 'abajo', 0.0026, { n: 26 })])));
    out.push(P('hips', 'iron', merge([gBox(0.044, 0.06, 0.007, [0.03, 0.07, 0.164], [0, 0, 0]), gBox(0.005, 0.044, 0.011, [0.03, 0.07, 0.168], [0, 0, 0])])));
    out.push(P('hips', CC, merge([place(gSph(1, [0, 0, 0], [0.036, 0.054, 0.024], 8, 6), [-0.17, -0.016, 0.104], [0, -36, 0]), place(gBox(0.072, 0.032, 0.046, [0, 0, 0]), [-0.17, 0.034, 0.104], [0, -36, 0])])));
    out.push(P('hips', 'leather', merge([place(gBox(0.028, 0.16, 0.014, [0, 0, 0]), [-0.118, -0.058, -0.168], [0, 20, -14]), place(gBox(0.02, 0.066, 0.018, [0, 0, 0]), [-0.097, 0.05, -0.174], [0, 20, -14])])));
  }
  return out;
}
function cueroManos() {
  const out = [];
  for (const [s, sx] of LADOS) {
    // el brazal de cuero cocido, atado por dentro con sus cordones
    const br = placa(
      [
        [-0.235, 0.041, 0.038],
        [-0.13, 0.05, 0.05],
        [-0.04, 0.056, 0.058],
      ],
      -sx * PI * 0.5 + 0.35,
      -sx * PI * 0.5 + TAU - 0.35,
      { cz: 0.004, nu: 16, nv: 5 }
    );
    out.push(PD('fore' + s, CC, br.geo));
    out.push(P('fore' + s, 'leather', merge([borde(br.at, 'arriba', 0.0038, { n: 16 }), borde(br.at, 'abajo', 0.0038, { n: 16 }), borde(br.at, 'u0', 0.0034, { n: 6 }), borde(br.at, 'u1', 0.0034, { n: 6 })])));
    {
      const cord = [];
      for (let i = 0; i < 4; i++) {
        const v0 = 0.12 + i * 0.22,
          v1 = v0 + 0.22;
        const a = br.at(0.02, v0),
          b = br.at(0.98, Math.min(1, v1)),
          c = br.at(0.98, v0),
          d = br.at(0.02, Math.min(1, v1));
        cord.push(tube([a, b], 0.0024, { n: 2, seg: 4 }), tube([c, d], 0.0024, { n: 2, seg: 4 }));
      }
      out.push(P('fore' + s, 'rope', merge(cord)));
    }
    // el guante, con su puño vuelto
    const m = mano({ side: sx, curl: s === 'R' ? 0.62 : 0.45, spread: 0.18, thick: 1.14, wide: 1.06, len: 1.02, thumb: s === 'R' ? 0.35 : 0.55 });
    out.push(P('hand' + s, CB, merge([m.carne, m.yemas])));
    const pu = placa(
      [
        [-0.012, 0.039, 0.034],
        [0.034, 0.048, 0.044],
      ],
      -PI,
      PI,
      { closed: true, nu: 12, nv: 2 }
    );
    out.push(PD('hand' + s, CB, pu.geo));
    out.push(P('hand' + s, 'leather', borde(pu.at, 'arriba', 0.0034, { n: 12 })));
  }
  return out;
}
function cueroPiernas() {
  const out = [];
  for (const [s, sx] of LADOS) {
    // las calzas de lana
    out.push(
      P(
        'leg' + s,
        'cueLana',
        tube(
          [
            [0, 0.06, 0],
            [0, -0.2, 0.012],
            [0, -0.46, 0],
          ],
          (q) =>
            table(
              [
                [0, 0.098, 0.1],
                [0.35, 0.089, 0.095],
                [1, 0.062, 0.066],
              ],
              q
            ),
          { n: 8, seg: 12, caps: true, capL: 0.03 }
        )
      )
    );
    out.push(
      P(
        'shin' + s,
        'cueLana',
        tube(
          [
            [0, 0.035, 0.006],
            [0, -0.1, -0.002],
          ],
          (q) => [mix(0.058, 0.06, q), mix(0.07, 0.07, q)],
          { n: 3, seg: 10 }
        )
      )
    );
    // la bota alta: la caña hasta debajo de la rodilla, con su vuelta y dos
    // correas con hebilla; el pie
    out.push(
      P(
        'shin' + s,
        CB,
        tube(
          [
            [0, -0.08, -0.002],
            [0, -0.2, -0.006],
            [0, -0.33, -0.002],
            [0, -0.43, 0.004],
          ],
          (q) =>
            table(
              [
                [0, 0.065, 0.075],
                [0.3, 0.063, 0.074],
                [0.7, 0.049, 0.054],
                [1, 0.045, 0.048],
              ],
              q
            ),
          { n: 8, seg: 12 }
        )
      )
    );
    const vuelta = placa(
      [
        [-0.13, 0.072, 0.082],
        [-0.065, 0.07, 0.08],
      ],
      -PI,
      PI,
      { cz: -0.004, closed: true, nu: 14, nv: 2, mod: (a) => 0.003 * Math.sin(a * 5 + sx) }
    );
    out.push(PD('shin' + s, CC, vuelta.geo));
    out.push(P('shin' + s, 'leather', borde(vuelta.at, 'abajo', 0.0038, { n: 14 })));
    for (const y of [-0.21, -0.33]) {
      const r = table(
        [
          [-0.43, 0.047],
          [-0.33, 0.052],
          [-0.2, 0.068],
        ],
        y
      )[0];
      out.push(P('shin' + s, 'leather', place(new THREE.TorusGeometry(r + 0.004, 0.005, 4, 14), [0, y, -0.004], [90, 0, 0], [1, 1.1, 1])));
      out.push(P('shin' + s, 'iron', gBox(0.014, 0.016, 0.007, [sx * (r + 0.006) * 0.7, y, (r + 0.006) * 0.75], [0, sx * 45, 0])));
    }
    out.push(P('foot' + s, CB, botaPie(sx)));
    out.push(suela(sx, 'leather'));
  }
  return out;
}

// ------------------------------------------------------------ el catálogo
// peso: la carga (ligera, media o pesada: la voltereta y el aguante; los
// kilos de cada pieza, en sus objetos: game/story.js); cada pieza, su objeto,
// su nombre, lo que tapa y sus piezas del rig.
export const ARMADURAS = {
  guardia: {
    nombre: 'Armadura de guardia',
    peso: 'media',
    piezas: {
      head: { item: 'yelmo_guardia', nombre: 'Yelmo de nasal', tapa: ['cabeza', 'cuello'], parts: guardiaCabeza },
      body: { item: 'loriga_guardia', nombre: 'Loriga de la guarnición', tapa: ['torso', 'brazos', 'cadera'], parts: guardiaTorso },
      hands: { item: 'brazales_guardia', nombre: 'Brazales de cuero', tapa: ['antebrazos', 'manos'], parts: guardiaManos },
      legs: { item: 'calzas_guardia', nombre: 'Calzas y botas', tapa: ['muslos', 'piernas', 'pies'], parts: guardiaPiernas },
    },
  },
  caballero: {
    nombre: 'Armadura de caballero',
    peso: 'pesada',
    piezas: {
      head: { item: 'yelmo_caballero', nombre: 'Yelmo de carrilleras', tapa: ['cabeza', 'cuello'], parts: caballeroCabeza },
      body: { item: 'peto_caballero', nombre: 'Peto y faldar', tapa: ['torso', 'brazos', 'cadera'], parts: caballeroTorso },
      hands: { item: 'guanteletes_caballero', nombre: 'Guanteletes y brazales', tapa: ['antebrazos', 'manos'], parts: caballeroManos },
      legs: { item: 'grebas_caballero', nombre: 'Quijotes y grebas', tapa: ['muslos', 'piernas', 'pies'], parts: caballeroPiernas },
    },
  },
  cuero: {
    nombre: 'Armadura de cuero',
    peso: 'ligera',
    piezas: {
      head: { item: 'capucha_cuero', nombre: 'Capucha de cuero', tapa: ['cabeza', 'cuello'], parts: cueroCabeza },
      body: { item: 'coleto_cuero', nombre: 'Coleto y gambesón', tapa: ['torso', 'brazos', 'cadera'], parts: cueroTorso },
      hands: { item: 'guantes_cuero', nombre: 'Brazales y guantes de cuero', tapa: ['antebrazos', 'manos'], parts: cueroManos },
      legs: { item: 'botas_cuero', nombre: 'Calzas y botas altas', tapa: ['muslos', 'piernas', 'pies'], parts: cueroPiernas },
    },
  },
};
// (el objeto de cada pieza -> [armadura, ranura])
export const PIEZA_DE = {};
for (const id in ARMADURAS) for (const r of RANURAS) PIEZA_DE[ARMADURAS[id].piezas[r].item] = [id, r];
// las piezas de una armadura (sus objetos), en el orden de las ranuras
export const piezasDe = (id) => RANURAS.map((r) => ARMADURAS[id].piezas[r].item);
// la del Condenado al despertar
export const PIEZAS_GUARDIA = piezasDe('guardia');

// La carga: lo que pesa lo que se lleva puesto (los kilos de cada pieza, en su
// objeto: game/story.js). Con la armadura de la guardia (quince kilos), la
// voltereta y la carrera de siempre; con menos de nueve, ligero: la voltereta
// más larga, más barata y con más invulnerabilidad, y correr cansa menos; con
// más de veinte, cargado: todo lo contrario. (Los multiplicadores son los de
// los objetos benditos: game/relics.js.)
export const CARGAS = {
  ligera: { nombre: 'Ligera', max: 9, rollSt: 0.85, rollIF: 1.12, rollDist: 1.08, sprintSt: 0.88 },
  media: { nombre: 'Media', max: 20, rollSt: 1, rollIF: 1, rollDist: 1, sprintSt: 1 },
  pesada: { nombre: 'Pesada', max: Infinity, rollSt: 1.3, rollIF: 0.82, rollDist: 0.86, sprintSt: 1.25 },
};
export function cargaDe(kg) {
  for (const k in CARGAS) if (kg <= CARGAS[k].max) return k;
  return 'pesada';
}

// ------------------------------------------------------------ el montaje
// el equipo: 'guardia' (las cuatro piezas de esa armadura), 'desnudo' (nada)
// o { head, body, hands, legs } (cada una, el id de una armadura o null)
export function equipo(e) {
  if (!e || e === 'desnudo') return { head: null, body: null, hands: null, legs: null };
  if (typeof e === 'string') return { head: e, body: e, hands: e, legs: e };
  return { head: e.head || null, body: e.body || null, hands: e.hands || null, legs: e.legs || null };
}
// lo que lleva puesto el jugador (player.armor: los objetos de cada ranura)
// como equipo de armaduras
export function equipoDeObjetos(armor) {
  const e = {};
  for (const r of RANURAS) {
    const p = armor && armor[r] ? PIEZA_DE[armor[r]] : null;
    e[r] = p && p[1] === r ? p[0] : null;
  }
  return e;
}

// el farol del cinto (no es de ninguna armadura)
export function farolParts() {
  return playerDef().parts.filter((p) => p.j === 'lantern');
}

// Las piezas de lo que se lleva (el cuerpo con su aspecto y las piezas de
// armadura), cada una con su grupo (grp: 'cuerpo.torso', 'guardia.head'...)
export function partesVestido(e, aspecto) {
  const eq = equipo(e);
  for (const r of RANURAS) if (eq[r] && !ARMADURAS[eq[r]]) throw new Error('armadura desconocida: ' + eq[r]);
  const out = [];
  const tapadas = new Set();
  for (const r of RANURAS) if (eq[r]) for (const z of ARMADURAS[eq[r]].piezas[r].tapa) tapadas.add(z);
  for (const p of cuerpoParts(aspecto)) if (!tapadas.has(p.zona)) out.push({ ...p, grp: 'cuerpo.' + p.zona });
  for (const r of RANURAS) {
    if (!eq[r]) continue;
    for (const p of partesDePieza(eq[r], r)) out.push({ ...p, grp: eq[r] + '.' + r });
  }
  return out;
}
// (las piezas de cada armadura no cambian: se hacen una vez)
const _piezas = new Map();
function partesDePieza(id, r) {
  const k = id + '.' + r;
  if (!_piezas.has(k)) _piezas.set(k, ARMADURAS[id].piezas[r].parts());
  return _piezas.get(k);
}

// El rig del jugador vestido con ese equipo: { joints, parts }. o.grupos:
// cada zona del cuerpo y cada pieza en sus mallas; o.aspecto, el del cuerpo;
// o.farol (sí, si no se dice), o.espada y o.escudo (los de models.js, para
// verlo armado).
export function armaduraDef(e, o = {}) {
  const def = { joints: playerDef().joints, parts: [] };
  for (const p of partesVestido(e, o.aspecto)) {
    if (o.grupos) def.parts.push(p);
    else {
      const { grp, ...q } = p;
      def.parts.push(q);
    }
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
