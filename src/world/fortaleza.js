// La fortaleza-palacio (PLAN_FORTALEZA.md): el castillo de Braga, rehecho.
//
// Un solo conjunto, como la alcáçova de Lisboa: cuatro crujías alrededor de un
// patio de honor con su claustro, la torre del homenaje en medio de la del
// norte (la torre del conde, lo más viejo y lo más alto: 28 m y sus garitas
// hasta 34), una torre en cada esquina con su oficio (la de la reina al
// noroeste, la cocina al suroeste, la de la coracha al nordeste y el Tombo al
// sureste), la puerta entre dos torres al sur, en el eje de la escalinata de
// la torre, y los adarves por lo alto de la muralla.
//
// Por fuera: la muralla de mampuesto sobre su talud, con su cordón, las
// esquinas de sillería, las saeteras, los ajimeces de las cámaras y el
// parapeto almenado; las torres, más altas, con sus chapiteles; la torre del
// homenaje. Por dentro: las crujías (fortaleza_alas.js), el patio
// (fortaleza_patio.js), la puerta y su cuerpo de guardia, con el puente
// levadizo y el cadalso (fortaleza_puerta.js), y la torre del homenaje
// (fortaleza_torre.js).
//
// Todo sale de unas medidas (FORT): norte = -z; la ciudad, al este. La coracha
// corre pegada a la cara de levante (level_keep.js) y entra en la torre del
// nordeste por la puerta de su adarve.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, blocker, archRing, solidGableRoof } from './builders.js';
import * as P from './props.js';
import { PIEDRA, pieza, plano, asoma, talud, esquina, almenas, antepecho, vano, ajimez, saetera, matacanes, caraTejado } from './fortaleza_atrezo.js';
import { tejadoCamaras } from './fortaleza_reina.js';
import { FORT } from './fortaleza_medidas.js';
import { buildPatio } from './fortaleza_patio.js';
import { buildAlas } from './fortaleza_alas.js';
import { buildPuerta } from './fortaleza_puerta.js';
import { buildTorre } from './fortaleza_torre.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export { FORT };
const T = FORT;
const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);

export function buildFortaleza(ctx, S, L) {
  muralla(ctx);
  torresEsquina(ctx);
  buildPuerta(ctx, S, L);
  torreHomenaje(ctx, L);
  buildTorre(ctx, S, L);
  terrazas(ctx);
  cubiertas(ctx);
  buildPatio(ctx, S, L);
  buildAlas(ctx, S, L);
  afuera(ctx, L);
}

// ------------------------------------------------------------------------ la muralla
// Los lienzos entre las torres, de 2,4 m, sobre su talud, hasta el adarve; por
// fuera, el parapeto almenado; por dentro, el antepecho sobre el canalón de
// las cubiertas. Sus caras de dentro, en cada crujía, son las de sus salas (lo
// que se ve de ellas: hasta el techo de cada una; por encima del tejado, de
// fuera). Las saeteras abajo y los ajimeces de las cámaras arriba.
function muralla(ctx) {
  const wb = ctx.wb;
  const { x0, x1, z0, z1, t, walk } = T;
  const Td = T.talud;
  const Lt = PIEDRA.lienzo;
  const E = T.eave;
  const NO = T.torres.NO,
    SO = T.torres.SO,
    NE = T.torres.NE,
    SE = T.torres.SE,
    G = T.puerta,
    K = T.torre;
  const o = { tint: Lt, mats: { t: 'flag' } };
  // poniente: el muro del gran salón, con la galería en su grueso (en
  // fortaleza_salon.js); aquí, lo de fuera
  talud(ctx, 'w', x0, NO.z1, SO.z0, Td.h, Td.d);
  almenas(ctx, 'w', x0, NO.z1, SO.z0, walk);
  antepecho(ctx, 'e', x0 + t, NO.z1, SO.z0, walk);
  for (const z of [-80.5, -72.5, -64.5, -56.5, -49]) saetera(ctx, 'w', x0, z, 4.2);
  for (const z of [-82.1, -74.3, -66.5, -50.8]) ajimez(ctx, 'w', x0, z, 6.6, { h: 1.4 });
  // norte: las cámaras de la reina y las del Rey, a los lados de la torre
  for (const [a, b, room, alta, yA] of [
    [NO.x1, K.x0, 'estrado_damas', 'reina_alta', T.F1],
    [K.x1, NE.x0, 'antecamara', 'camara_rey', T.rey.alto],
  ]) {
    pieza(ctx, 'wallstone', a, 0, z0, b, walk, z0 + t, [['n', null, Td.h - 0.05], ['t'], ['s', room, 0, yA], ['s', alta, yA, E], ['s', null, E, walk]], o);
    talud(ctx, 'n', z0, a, b, Td.h, Td.d);
    almenas(ctx, 'n', z0, a, b, walk);
    antepecho(ctx, 's', z0 + t, a, b, walk);
  }
  for (const x of [-121.5, -115.5]) ajimez(ctx, 'n', z0, x, 6.9, { h: 1.3 });
  for (const x of [-124, -118.5, -113]) saetera(ctx, 'n', z0, x, 3.8, { cruz: false });
  ajimez(ctx, 'n', z0, -80.5, 6.9, { h: 1.3 });
  saetera(ctx, 'n', z0, -80.5, 3.8, { cruz: false });
  // levante: la capilla y la cancillería por dentro; por fuera, la coracha le
  // tapa hasta su adarve (level_keep.js)
  {
    const C = T.capilla,
      Cn = T.cancilleria;
    pieza(ctx, 'wallstone', x1 - t, 0, NE.z1, x1, walk, SE.z0, [['e', null, T.coracha.y - 0.02], ['t']], o);
    // (por dentro: la capilla, a doble altura; la cancillería, hasta su techo)
    wb.box('wallstone', x1 - t, 0, C.z0, x1, E, C.z1, { faces: 'w', sub: 2.2, aoH: 2.5, room: 'capilla', tint: Lt });
    wb.box('wallstone', x1 - t, E, C.z0, x1, walk, C.z1, { faces: 'w', sub: 2.2, aoH: 2.5, tint: Lt });
    wb.box('wallstone', x1 - t, 0, Cn.z0, x1, T.F1, Cn.z1, { faces: 'w', sub: 2.2, aoH: 2.5, room: 'cancilleria', tint: Lt });
    almenas(ctx, 'e', x1, NE.z1, SE.z0, walk);
    antepecho(ctx, 'w', x1 - t, C.z0, C.z1 + 0.6, walk);
    for (const z of [-82, -76, -70, -64, -56, -50]) saetera(ctx, 'e', x1, z, T.coracha.y + 0.6, { h: 1.3 });
  }
  // sur: la despensa, al oeste de la puerta (la del cuerpo de guardia, con el
  // boquete del bolaño y el cadalso, en fortaleza_puerta.js)
  for (const [a, b, room] of [[SO.x1, G.x0, 'despensa']]) {
    pieza(ctx, 'wallstone', a, 0, z1 - t, b, walk, z1, [['s', null, Td.h - 0.05], ['n', room, 0, T.F1]], o);
    talud(ctx, 's', z1, a, b, Td.h, Td.d);
    almenas(ctx, 's', z1, a, b, walk);
    for (const x of [a + 4, a + 10, b - 4]) saetera(ctx, 's', z1, x, 3.8);
    for (const x of [a + 7, b - 7.5]) vano(ctx, 's', z1, x, 7.2, 0.5, 1.2);
  }
  // las esquinas de sillería de los lienzos contra las torres que asoman
  esquina(ctx, x0, NO.z1, -1, 1, Td.h, walk + 0.9);
  esquina(ctx, x0, SO.z0, -1, -1, Td.h, walk + 0.9);
}

// ------------------------------------------------------------------------ las torres de las esquinas
// Huecas (lo de dentro, en fortaleza_alas.js), con su talud, sus esquinas de
// sillería, una imposta en cada planta, sus saeteras y sus ajimeces, y por
// encima el chapitel o el parapeto almenado sobre su cornisa. Aquí, los muros
// por fuera y su colisión; las caras de dentro las ponen sus salas.
function torresEsquina(ctx) {
  const wb = ctx.wb;
  const Td = T.talud;
  const d = Td.d;
  const tint = PIEDRA.lienzo.map((v) => v * 0.97);
  // una cara de fuera (sin colisión): en el plano line, mirando a dir, de a a b
  const cara1 = (dir, line, a, b, y0, y1) => {
    const F = plano(dir, line);
    wb.box('wallstone', ...F.box(a, y0, b, y1, -0.01, 0), { faces: dir, sub: 2.2, aoH: 3, baseY: 0, room: null, tint });
  };
  const yv = T.eave - 0.3,
    yc = T.coracha.y - 0.02;
  for (const [k, R] of Object.entries(T.torres)) {
    const { x0, x1, z0, z1, h, t } = R;
    const cx = (x0 + x1) / 2,
      cz = (z0 + z1) / 2;
    // los cuatro muros, macizos (las caras de dentro las ponen sus salas)
    const alas = R.alas ?? [];
    for (const [lado, b] of [
      ['n', [x0, z0, x1, z0 + t]],
      ['s', [x0, z1 - t, x1, z1]],
      ['w', [x0, z0 + t, x0 + t, z1 - t]],
      ['e', [x1 - t, z0 + t, x1, z1 - t]],
    ])
      if (!alas.includes(lado)) ctx.col.add(b[0], 0, b[1], b[2], h, b[3]);
    // las caras de fuera que se ven y sus taludes (con el inglete en las
    // esquinas de fuera: ext), y por encima de las crujías, las de dentro
    // [dir, line, a, b, y0, talud: ext | null]
    const L = {
      NO: [
        ['n', z0, x0, x1, 0, [d, d]],
        ['w', x0, z0, z1, 0, [d, d]],
        ['s', z1, x0, T.x0, 0, [d, 0]],
        ['e', x1, z0, T.z0, 0, [d, 0]],
        ['s', z1, T.x0, x1, yv, null],
      ],
      SO: [
        ['s', z1, x0, x1, 0, [d, d]],
        ['w', x0, z0, z1, 0, [d, d]],
        ['n', z0, x0, T.x0, 0, [d, 0]],
        ['e', x1, T.z1, z1, 0, [0, d]],
        ['e', x1, z0, T.z1, T.walk, null],
        ['n', z0, T.x0, x1, yv, null],
      ],
      NE: [
        ['n', z0, x0, x1, 0, [d, 0]],
        ['w', x0, z0, T.z0, 0, [d, 0]],
        ['e', x1, z0, z0 + t, yc, null],
        ['e', x1, z1 - t, z1, yc, null],
        ['s', z1, x0, x1, yv, null],
      ],
      SE: [
        ['s', z1, x0, x1, 0, [0, 0]],
        ['e', x1, z0, z1, yc, null],
        ['w', x0, z0, z1, T.walk, null],
        ['n', z0, x0, x1, T.walk, null],
      ],
    }[k];
    for (const [dir, line, a, b, y0, ext] of L) {
      cara1(dir, line, a, b, ext ? Td.h - 0.05 : y0, h);
      if (ext) talud(ctx, dir, line, a, b, Td.h, d, { ext, tint });
    }
    // las esquinas de fuera, de sillería (las del este, sobre la coracha)
    const E = {
      NO: [[x0, z0, -1, -1, Td.h], [x1, z0, 1, -1, Td.h], [x0, z1, -1, 1, Td.h]],
      SO: [[x0, z1, -1, 1, Td.h], [x1, z1, 1, 1, Td.h], [x0, z0, -1, -1, Td.h]],
      NE: [[x0, z0, -1, -1, Td.h], [x1, z0, 1, -1, yc + 1.1]],
      SE: [[x1, z1, 1, 1, yc + 1.1], [x0, z1, -1, 1, T.walk + 0.3]],
    }[k];
    for (const [ex, ez, dx, dz, y0] of E) esquina(ctx, ex, ez, dx, dz, y0, h - 0.6);
    // las impostas de cada planta y la cornisa
    for (const y of [T.F1 + 0.5, T.walk]) wb.box('ashlar', x0 - 0.1, y - 0.18, z0 - 0.1, x1 + 0.1, y, z1 + 0.1, { ao: false, faces: 'nsewb', tint: PIEDRA.silla, sub: 3 });
    wb.box('wallstone', x0 - 0.35, h - 0.55, z0 - 0.35, x1 + 0.35, h, z1 + 0.35, { ao: false, sub: 3, faces: 'tnsewb', mats: { t: 'flag' }, tint });
    for (let i = 0; i < 3; i++) wb.box('ashlar', x0 - 0.1 - i * 0.1, h - 0.95 + i * 0.13, z0 - 0.1 - i * 0.1, x1 + 0.1 + i * 0.1, h - 0.82 + i * 0.13, z1 + 0.1 + i * 0.1, { ao: false, faces: 'nsewb', tint: PIEDRA.silla, sub: 3 });
    if (R.techo === 'chapitel') {
      const ph = (x1 - x0) * 0.5;
      wb.pyramid('roof', cx, cz, x1 - x0 + 1.1, z1 - z0 + 1.1, h, ph);
      wb.box('iron', cx - 0.05, h + ph - 0.3, cz - 0.05, cx + 0.05, h + ph + 1.4, cz + 0.05, { ao: false });
      wb.box('iron', cx - 0.4, h + ph + 0.75, cz - 0.04, cx + 0.4, h + ph + 0.84, cz + 0.04, { ao: false });
      ctx.col.addCam(x0, h, z0, x1, h + ph - 1, z1);
    } else {
      // lo alto: el suelo y el parapeto almenado por los cuatro lados
      wb.box('flag', x0 - 0.3, h - 0.02, z0 - 0.3, x1 + 0.3, h, z1 + 0.3, { faces: 't', ao: false });
      for (const [dd, line, a, b] of [
        ['n', z0 - 0.35, x0 - 0.35, x1 + 0.35],
        ['s', z1 + 0.35, x0 - 0.35, x1 + 0.35],
        ['w', x0 - 0.35, z0 + 0.25, z1 - 0.25],
        ['e', x1 + 0.35, z0 + 0.25, z1 - 0.25],
      ])
        almenas(ctx, dd, line, a, b, h, { vuelo: 0, collide: false });
      blocker(ctx, x0, h, z0, x1, h + 2, z1);
    }
    // saeteras y ajimeces de las caras de fuera, planta por planta
    for (const dd of R.fuera) {
      const line = { n: z0, s: z1, w: x0, e: x1 }[dd];
      const c = dd === 'n' || dd === 's' ? cx : cz;
      if (dd === 'e') {
        saetera(ctx, dd, line, c - 2.6, T.walk + 1.2);
        saetera(ctx, dd, line, c + 2.6, T.walk + 1.2);
        continue;
      }
      saetera(ctx, dd, line, c, 4.4);
      if (k === 'NO') ajimez(ctx, dd, line, c, T.F1 + 1.6, { h: 1.4, lit: dd === 'w' });
      else saetera(ctx, dd, line, c, T.F1 + 2.2);
      // (en la de la reina, arriba, los ajimeces de su cámara: el del jardín,
      // con la luz del farol de la dueña)
      if (k === 'NO') ajimez(ctx, dd, line, c, T.reina.pisos[2] + 1.4, { h: 1.4, lit: dd === 'n', intensity: 0.5, radius: 4 });
      else saetera(ctx, dd, line, c, T.walk + 1.4);
    }
  }
  // los estandartes del Rey: en las torres de poniente, por fuera; en la del
  // nordeste, sobre el jardín; el negro de la guarnición, sobre la coracha
  const NO = T.torres.NO,
    SO = T.torres.SO,
    NE = T.torres.NE;
  P.banner(ctx, NO.x0 - 0.36, NO.h - 1.8, (NO.z0 + NO.z1) / 2 + 3.2, -Math.PI / 2, 'bannerRey', 1.6, 4.6);
  P.banner(ctx, SO.x0 - 0.36, SO.h - 1.8, (SO.z0 + SO.z1) / 2, -Math.PI / 2, 'bannerRey', 1.6, 4.6);
  P.banner(ctx, (SO.x0 + SO.x1) / 2, SO.h - 1.8, SO.z1 + 0.36, 0, 'bannerRey', 1.6, 4.6);
  P.banner(ctx, (NE.x0 + NE.x1) / 2, NE.h - 1.8, NE.z0 - 0.36, Math.PI, 'bannerRey', 1.6, 4.6);
  P.banner(ctx, NE.x1 + 0.36, NE.h - 1.8, (NE.z0 + NE.z1) / 2, Math.PI / 2, 'bannerBlack', 1.4, 4.0);
}

// ------------------------------------------------------------------------ la torre del homenaje
// La torre del conde, por fuera (por dentro, en fortaleza_torre.js, con sus
// muros y su colisión), de sillería oscura sobre su talud alto, con las
// impostas de cada piso, la puerta de la planta de la guardia (a +6: a ella
// sube la escalinata), con sus tres roscas; las saeteras de la guardia, los
// ajimeces de las cámaras (+12) y los grandes de la sala del trono (+18), uno
// encendido (la vela del Rey), y los óculos de su galería; la cornisa con sus
// canes, la terraza almenada y las cuatro garitas de las esquinas con sus
// chapiteles; el estandarte del Rey en lo alto.
function torreHomenaje(ctx, L) {
  const wb = ctx.wb;
  const K = T.torre;
  const { x0, x1, z0, z1 } = K;
  const H = K.terraza;
  const tint = PIEDRA.torre;
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  // las caras que se ven: la del jardín, entera, y las de los lados por
  // encima de las cámaras (la del patio la pone su muro, con la puerta)
  const E = T.eave - 0.3;
  wb.box('ashlar', x0, 0, z0 - 0.01, x1, H, z0 + 0.01, { faces: 'n', sub: 2.6, aoH: 4, tint, uv: 0.8 });
  // (los costados: al jardín, enteros; sobre las cámaras, desde su alero)
  wb.box('ashlar', x0 - 0.01, 0, z0, x0, H, T.z0, { faces: 'w', sub: 2.6, aoH: 4, tint });
  // (sobre el adarve y sobre los tejados de las cámaras: lo de fuera)
  wb.box('ashlar', x0 - 0.01, T.walk, T.z0, x0, H, T.reina.z0, { faces: 'w', sub: 2.6, aoH: 4, tint, baseY: 0 });
  caraTejado(ctx, 'ashlar', 'w', x0, T.reina.z0, z1, H, tejadoCamaras(T.reina), { sobre: true, sub: 2.6, aoH: 4, tint, baseY: 0 });
  wb.box('ashlar', x1, 0, z0, x1 + 0.01, H, T.z0, { faces: 'e', sub: 2.6, aoH: 4, tint });
  // (sobre el pasadizo, alrededor de la puerta de la torre: su arco y su
  // rosca los pone el muro, en fortaleza_torre.js)
  {
    const c = T.rey.pasadizo,
      w = 1.2,
      r = 0.26,
      ys = T.walk + 2.4;
    for (const [a, b, ya, yb] of [
      [T.z0, c - w / 2 - r, T.walk, H],
      [c + w / 2 + r, T.rey.z0, T.walk, H],
      [c - w / 2 - r, c - w / 2, T.walk, ys],
      [c + w / 2, c + w / 2 + r, T.walk, ys],
      [c - w / 2 - r, c + w / 2 + r, ys + w / 2 + r + 0.05, H],
    ])
      wb.box('ashlar', x1, ya, a, x1 + 0.01, yb, b, { faces: 'e', sub: 2.6, aoH: 4, tint, baseY: 0 });
  }
  caraTejado(ctx, 'ashlar', 'e', x1, T.rey.z0, z1, H, tejadoCamaras(T.rey), { sobre: true, sub: 2.6, aoH: 4, tint, baseY: 0 });
  // (y por dentro de las cámaras, sus caras: la del oeste en la sala de la
  // reina, la del este en la antecámara)
  wb.box('ashlar', x0 - 0.01, 0, T.reina.z0, x0, T.F1, T.reina.z1, { faces: 'w', sub: 2, aoH: 1.5, room: 'estrado_damas', tint: tint.map((v) => v * 1.1) });
  wb.box('ashlar', x1, 0, T.rey.z0, x1 + 0.01, T.rey.alto, T.rey.z1, { faces: 'e', sub: 2, aoH: 1.5, room: 'antecamara', tint: tint.map((v) => v * 1.1) });
  // el talud: al jardín y a los lados (lo que asoma de la muralla); al patio,
  // detrás de la escalinata
  const Td = { h: 4.2, d: 1.3 };
  talud(ctx, 'n', z0, x0, x1, Td.h, Td.d, { ext: [Td.d, Td.d], tint });
  talud(ctx, 'w', x0, z0, T.z0, Td.h, Td.d, { tint, ext: [Td.d, 0] });
  talud(ctx, 'e', x1, z0, T.z0, Td.h, Td.d, { tint, ext: [Td.d, 0] });
  for (const [ex, dx] of [
    [x0, -1],
    [x1, 1],
  ]) {
    esquina(ctx, ex, z0, dx, -1, Td.h, H - 0.8, { tint: tint.map((v) => v * 1.12) });
    esquina(ctx, ex, z1, dx, 1, T.eave, H - 0.8, { tint: tint.map((v) => v * 1.12) });
  }
  // las impostas de los pisos
  // (la de +12, un dedo por encima del adarve, que llega a la torre)
  for (const y of [12.06, 18, 24.6]) {
    wb.box('ashlar', x0 - 0.12, y - 0.2, z0 - 0.12, x1 + 0.12, y, z0, { ao: false, faces: 'nsewb', tint: tint.map((v) => v * 1.15) });
    wb.box('ashlar', x0 - 0.12, y - 0.2, z1, x1 + 0.12, y, z1 + 0.12, { ao: false, faces: 'nsewb', tint: tint.map((v) => v * 1.15) });
    wb.box('ashlar', x0 - 0.12, y - 0.2, z0, x0, y, z1, { ao: false, faces: 'wtb', tint: tint.map((v) => v * 1.15) });
    wb.box('ashlar', x1, y - 0.2, z0, x1 + 0.12, y, z1, { ao: false, faces: 'etb', tint: tint.map((v) => v * 1.15) });
  }
  // las ventanas: saeteras abajo; ajimeces en las cámaras; los grandes de la
  // sala del trono, de dos órdenes (el de cara al patio, encendido)
  const vt = { tint: tint.map((v) => v * 1.18) };
  // (en el plano de sus caras, que van un dedo por fuera de la planta: las
  // bocas, delante de ellas)
  for (const [d, line, a, b] of [
    ['n', z0 - 0.01, x0, x1],
    ['s', z1 + 0.01, x0, x1],
    ['w', x0 - 0.01, z0, z1],
    ['e', x1 + 0.01, z0, z1],
  ]) {
    const c = (a + b) / 2;
    // (las de los lados, al sur de la caja del caracol, que está en el rincón
    // del noroeste)
    if (d === 'n') for (const u of [c - 6, c + 6]) saetera(ctx, d, line, u, 7.4, { h: 1.6 });
    if (d === 'w' || d === 'e') saetera(ctx, d, line, c - 6.4, 7.4, { h: 1.6 });
    for (const u of [c - 5.6, c + 5.6]) ajimez(ctx, d, line, u, 13.6, { h: 1.5, ...vt });
    for (const u of [c - 4.8, c, c + 4.8]) {
      const lit = d === 's' && Math.abs(u - c) < 0.1;
      ajimez(ctx, d, line, u, 19.4, { h: 2.4, w: 0.6, lit, radius: 9, intensity: 1.2, ...vt });
    }
    // los óculos de la galería del trono
    for (const u of [c - 4.8, c + 4.8]) vano(ctx, d, line, u, 23.4, 0.7, 0.4, { ...vt, ring: 0.14 });
  }
  // la puerta de la planta de la guardia, en lo alto de la escalinata: su
  // arco abocinado de tres roscas (las hojas, atrancadas por dentro, son de
  // la puerta: fortaleza_torre.js)
  {
    const D = K.puerta;
    const yd = D.y;
    const zf = z1;
    for (let k = 0; k < 3; k++) {
      const w = D.w + 0.5 + k * 0.6;
      archRing(ctx, { axis: 'x', c: D.x, w, y0: yd + D.h, rise: w / 2, ring: 0.28, t0: zf - 0.01, t1: zf + 0.12 + k * 0.08, mat: 'ashlar', tint: tint.map((v) => v * (1.25 - k * 0.06)), proud: 0, cam: false, n: 11 });
      for (const s of [-1, 1]) wb.box('ashlar', D.x + s * (w / 2) - (s > 0 ? 0 : 0.28), yd, zf, D.x + s * (w / 2) + (s > 0 ? 0.28 : 0), yd + D.h, zf + 0.12 + k * 0.08, { ao: false, faces: 'swetb', tint: tint.map((v) => v * (1.25 - k * 0.06)) });
    }
    // el escudo del Rey encima
    wb.box('ashlar', D.x - 0.7, yd + D.h + D.w / 2 + 1.2, zf, D.x + 0.7, yd + D.h + D.w / 2 + 2.9, zf + 0.14, { ao: false, faces: 'swetb', tint: PIEDRA.silla });
    wb.box('clothRed', D.x - 0.5, yd + D.h + D.w / 2 + 1.4, zf + 0.14, D.x + 0.5, yd + D.h + D.w / 2 + 2.6, zf + 0.16, { ao: false, faces: 's', tint: [0.7, 0.6, 0.6] });
  }
  // la cornisa sobre sus canes y la terraza almenada
  {
    const yc = H;
    for (const [d, line, a, b] of [
      ['n', z0, x0, x1],
      ['s', z1, x0, x1],
      ['w', x0, z0, z1],
      ['e', x1, z0, z1],
    ]) {
      const F = plano(d, line);
      for (let u = a + 0.8; u < b - 0.5; u += 1.3) for (let k = 0; k < 2; k++) wb.box('ashlar', ...F.box(u - 0.16, yc - 1.1 + k * 0.32, u + 0.16, yc - 0.78 + k * 0.32, -0.01, 0.22 + k * 0.22), { ao: false, faces: asoma(d), tint });
    }
    // (en anillo, sobre los muros: por dentro, el techo de la sala del trono y
    // las losas de la terraza son de fortaleza_torre.js)
    const t = K.t;
    for (const [a, b, c, d, f] of [
      [x0 - 0.55, z0 - 0.55, x1 + 0.55, z0 + t, 'tnweb'],
      [x0 - 0.55, z1 - t, x1 + 0.55, z1 + 0.55, 'tsweb'],
      [x0 - 0.55, z0 + t, x0 + t, z1 - t, 'twb'],
      [x1 - t, z0 + t, x1 + 0.55, z1 - t, 'teb'],
    ])
      wb.box('ashlar', a, yc - 0.45, b, c, yc, d, { ao: false, sub: 3, faces: f, mats: { t: 'flag' }, tint: tint.map((v) => v * 1.08) });
    for (const [d, line, a, b] of [
      ['n', z0 - 0.55, x0 - 0.55, x1 + 0.55],
      ['s', z1 + 0.55, x0 - 0.55, x1 + 0.55],
      ['w', x0 - 0.55, z0 + 0.05, z1 - 0.05],
      ['e', x1 + 0.55, z0 + 0.05, z1 - 0.05],
    ])
      almenas(ctx, d, line, a, b, yc, { vuelo: 0, tint });
  }
  // las garitas de las esquinas: cuadradas, voladas sobre su ménsula, con sus
  // saeteras y su chapitel
  {
    const g = 3.6,
      yb = H - 3.2,
      yt = K.garitas;
    for (const [ex, ez, dx, dz] of [
      [x0, z0, -1, -1],
      [x1, z0, 1, -1],
      [x0, z1, -1, 1],
      [x1, z1, 1, 1],
    ]) {
      const gx0 = dx < 0 ? ex - 1.0 : ex + 1.0 - g,
        gz0 = dz < 0 ? ez - 1.0 : ez + 1.0 - g;
      const gx1 = gx0 + g,
        gz1 = gz0 + g;
      // la ménsula: tres hiladas que vuelan hacia fuera
      for (let k = 0; k < 3; k++) {
        const s = 1 - (k + 1) * 0.3;
        const ax0 = dx < 0 ? gx0 + 1.0 * s : gx0,
          ax1 = dx < 0 ? gx1 : gx1 - 1.0 * s,
          az0 = dz < 0 ? gz0 + 1.0 * s : gz0,
          az1 = dz < 0 ? gz1 : gz1 - 1.0 * s;
        wb.box('ashlar', ax0, yb + k * 0.4, az0, ax1, yb + (k + 1) * 0.4, az1, { ao: false, faces: 'nsewb', tint: tint.map((v) => v * 1.1) });
      }
      wb.box('ashlar', gx0, yb + 1.2, gz0, gx1, yt, gz1, { faces: 'nsew', sub: 2, aoH: 1.5, baseY: yb, tint });
      wb.box('ashlar', gx0 - 0.2, yt - 0.3, gz0 - 0.2, gx1 + 0.2, yt, gz1 + 0.2, { ao: false, faces: 'tnsewb', tint: tint.map((v) => v * 1.12) });
      wb.pyramid('roof', (gx0 + gx1) / 2, (gz0 + gz1) / 2, g + 0.6, g + 0.6, yt, 2.6);
      wb.box('iron', (gx0 + gx1) / 2 - 0.04, yt + 2.4, (gz0 + gz1) / 2 - 0.04, (gx0 + gx1) / 2 + 0.04, yt + 3.3, (gz0 + gz1) / 2 + 0.04, { ao: false });
      for (const [d, line, c] of [
        [dx < 0 ? 'w' : 'e', dx < 0 ? gx0 : gx1, (gz0 + gz1) / 2],
        [dz < 0 ? 'n' : 's', dz < 0 ? gz0 : gz1, (gx0 + gx1) / 2],
      ])
        saetera(ctx, d, line, c, H + 1.4, { h: 1.4 });
      ctx.col.add(gx0, yb, gz0, gx1, yt, gz1);
    }
  }
  // el estandarte del Rey: el mástil en lo alto, sobre el patio, y el paño
  // largo colgado de la cara del patio, entre los ajimeces de la sala
  {
    const mx = cx,
      mz = cz + 4;
    wb.cylinder('wooddark', mx, H, mz, 0.12, 0.09, 9, 6, { ao: false });
    wb.box('iron', mx - 0.12, H + 9, mz - 0.12, mx + 0.12, H + 9.3, mz + 0.12, { ao: false });
    P.banner(ctx, mx + 1.7, H + 8.6, mz, 0, 'bannerRey', 3.0, 2.2);
    P.banner(ctx, cx - 2.4, H - 1.3, z1 + 0.36, 0, 'bannerRey', 1.8, 5.6);
    P.banner(ctx, cx + 2.4, H - 1.3, z1 + 0.36, 0, 'bannerRey', 1.8, 5.6);
    P.banner(ctx, cx, H - 1.3, z0 - 0.36, Math.PI, 'bannerRey', 2.2, 6.4);
  }
  // en lo alto, un brasero encendido (se ve desde toda la ciudad)
  P.brazier(ctx, cx - 6, H, cz + 6, {});
}

// ------------------------------------------------------------------------ las terrazas
// Las crujías del sur (la despensa, la puerta y el cuerpo de guardia) y la
// cancillería no tienen tejado: su cubierta es una terraza a la altura del
// adarve, con su enlosado, su antepecho al patio y su parapeto almenado al
// campo (que pone la muralla).
function terrazas(ctx) {
  const wb = ctx.wb;
  const { walk } = T;
  const Pt = T.patio,
    G = T.puerta,
    SO = T.torres.SO,
    SE = T.torres.SE,
    Cn = T.cancilleria;
  // al sur: de la torre de la cocina a la de la puerta, y de ésta al Tombo
  for (const [a, b] of [
    [SO.x1, G.x0],
    [G.x1, SE.x0],
  ]) {
    pieza(ctx, 'wallstone', a, walk - 0.4, Pt.z1, b, walk, T.z1, [['t']], { mats: { t: 'flag' }, tint: PIEDRA.patio });
    antepecho(ctx, 'n', Pt.z1, Math.max(a, Pt.x0 - T.ti), b, walk);
  }
  // la cancillería: de la capilla al Tombo
  pieza(ctx, 'wallstone', Pt.x1, walk - 0.4, Cn.z0 - 1.2, T.x1 - T.t, walk, SE.z0, [['t']], { mats: { t: 'flag' }, tint: PIEDRA.patio });
  antepecho(ctx, 'w', Pt.x1, Cn.z0 - 1.2, SE.z0, walk);
  // gárgolas sobre el patio
  for (const x of [-116, -110, -86, -80]) gargola(ctx, 'n', Pt.z1, x, walk - 0.5);
  for (const z of [-56, -50]) gargola(ctx, 'w', Pt.x1, z, walk - 0.5);
}

function gargola(ctx, dir, line, u, y) {
  const wb = ctx.wb;
  const F = plano(dir, line);
  wb.box('ashlar', ...F.box(u - 0.14, y - 0.22, u + 0.14, y, -0.01, 0.75), { ao: false, faces: asoma(dir), tint: PIEDRA.silla });
  wb.box('black', ...F.box(u - 0.07, y - 0.02, u + 0.07, y + 0.001, 0.1, 0.72), { ao: false, faces: 't', grime: false });
}

// ------------------------------------------------------------------------ las cubiertas
// A dos aguas, de teja: el gran salón (con su cumbrera más alta) y la capilla
// a lo largo de su crujía; las cámaras de la reina y las del Rey, entre las
// torres. Sus hastiales de piedra donde acaban contra otra cubierta o al aire;
// contra las torres, nada.
function cubiertas(ctx) {
  const E = T.eave;
  const Sa = T.salon,
    C = T.capilla,
    R = T.reina,
    K = T.rey,
    Pt = T.patio;
  const wallTint = PIEDRA.lienzo;
  // el gran salón: de la muralla al patio, del muro de la reina al de la
  // despensa (los hastiales, sobre ellos)
  solidGableRoof(ctx, Sa.x0, Sa.z0 - 1.2, Pt.x0, Sa.z1 + 2.4, E, Sa.ridge, 'z', { ovs: [0, 0.75], gableOverhang: 0, gables: [{ y0: E, t: 1.2 }, { y0: E, t: 2.4 }], underRoom: 'salon', room: 'salon', wallTint });
  // la capilla: de la torre del nordeste al muro de la cancillería
  solidGableRoof(ctx, Pt.x1, C.z0, C.x1, C.z1 + 1.2, E, C.ridge, 'z', { ovs: [0.75, 0], gableOverhang: 0, gables: [false, { y0: E, t: 1.2 }], underRoom: 'capilla', room: 'capilla', wallTint });
  // la sala de la reina: del muro del salón a la torre, en dos trozos (el de
  // poniente, sin alero al patio: ahí está el hastial del salón)
  solidGableRoof(ctx, R.x0, R.z0, Pt.x0, Pt.z0, E, R.ridge, 'x', { ovs: [0, 0], gableOverhang: 0, gables: [false, false], open: [false, true], underRoom: 'reina_alta', wallTint });
  solidGableRoof(ctx, Pt.x0, R.z0, R.x1, Pt.z0, E, R.ridge, 'x', { ovs: [0, 0.75], gableOverhang: 0, gables: [false, false], open: [true, false], underRoom: 'reina_alta', wallTint });
  // las cámaras del Rey
  solidGableRoof(ctx, K.x0, K.z0, K.x1, Pt.z0, E, K.ridge, 'x', { ovs: [0, 0.75], gableOverhang: 0, gables: [false, false], underRoom: 'camara_rey', wallTint });
}

// ------------------------------------------------------------------------ alrededor
// Lo que se ve desde lo alto: al norte, el jardín del Rey (fase 4: por ahora,
// la tierra, los naranjos secos y la alberca vacía), cerrado por el muro de
// poniente; al oeste, el campo, pelado, hasta perderse en la niebla; al sur,
// entre la fortaleza y la muralla del castillo, el escombro y el patíbulo.
function afuera(ctx, L) {
  const wb = ctx.wb;
  const rng = new RNG(8801);
  // el campo de poniente (el mundo empieza en x = -156: level.js, WORLD_X0)
  wb.box('dirt', -280, -0.2, -232, -156, -0.06, 72, { faces: 't', ao: false, sub: 10, tint: [0.58, 0.55, 0.5] });
  for (let i = 0; i < 16; i++) P.deadTree(ctx, rng.range(-230, -162), 0, rng.range(-170, 20), 7410 + i, rng.range(3.2, 5.6));
  for (let i = 0; i < 10; i++) P.roughStone(ctx, rng.range(-200, -158), 0, rng.range(-140, 0), rng.range(0.3, 0.8), 7430 + i);
  for (let i = 0; i < 9; i++) P.deadTree(ctx, rng.range(-152, -144), 0, rng.range(-118, -20), 7450 + i, rng.range(3.0, 5.0));
  // (fuera de la empalizada del patio de armas: level_castle.js)
  for (let i = 0; i < 6; i++) P.deadTree(ctx, rng.range(-134, -108), 0, rng.range(-26, 0), 7470 + i, rng.range(3.0, 4.6));
  ctx.crows.push({ x: -175, y: 14, z: -70, r: 9, n: 5 });
  ctx.crows.push({ x: -100, y: T.torre.terraza, z: -92, r: 4, n: 4 });
  // el muro que cierra el jardín por poniente, de la muralla norte a la torre
  // de la reina
  {
    const N = T.norte;
    const NO = T.torres.NO;
    pieza(ctx, 'wallstone', N.oeste.x0, 0, N.zi, N.oeste.x1, 9, NO.z0, [['w'], ['e'], ['t']], { tint: PIEDRA.lienzo, mats: { t: 'flag' } });
    talud(ctx, 'w', N.oeste.x0, N.zi, NO.z0, 2.4, 0.7);
    almenas(ctx, 'w', N.oeste.x0, N.zi, NO.z0, 9, { collide: false });
  }
  // el jardín, por ahora: la tierra, los naranjos secos, la alberca vacía y el
  // pozo (el resto, en la fase 4)
  {
    const z0 = T.norte.zi,
      z1 = T.z0;
    wb.box('dirt', T.norte.oeste.x1, 0.0, z0, T.x1, 0.02, z1, { faces: 't', ao: false, sub: 3, tint: [0.5, 0.47, 0.4] });
    const rr = new RNG(8820);
    for (const [x0, x1] of [
      [-135, -114],
      [-82, -66],
    ])
      for (let x = x0 + 1.5; x < x1; x += 4.4)
        for (const z of [-118.4, -113.6, -108.8, -104.2]) P.deadTree(ctx, x + rr.range(-0.5, 0.5), 0, z + rr.range(-0.4, 0.4), 8830 + Math.round(-x * 3 - z), rr.range(2.4, 3.4));
    // la alberca, vacía, ante la torre
    const A = [-106, -118.6, -90, -114.6];
    solid(ctx, 'ashlar', A[0] - 0.4, 0, A[1] - 0.4, A[2] + 0.4, 0.5, A[3] + 0.4, { faces: 'tnsew', sub: 2, tint: PIEDRA.silla });
    wb.box('black', A[0], 0.49, A[1], A[2], 0.5, A[3], { faces: 't', ao: false, grime: false, tint: [0.2, 0.2, 0.2] });
    P.well(ctx, -126, 0, -112, {});
  }
  // al sur, en el rincón del patio de armas entre la fortaleza, la coracha y
  // la muralla del castillo: el escombro del asedio y el patíbulo
  P.rubble(ctx, -66.5, 0, -27.5, 14, 8840, 3.2, { mat: 'wallstone', scale: 1.3 });
  P.rubble(ctx, -69, 0, -24.5, 8, 8841, 1.6, { mat: 'wallstone', scale: 1.0 });
  P.gibbet(ctx, -64.6, 0, -30.5, 4.0);
  P.stake(ctx, -70.2, 0, -29.6, 0.3, 8842);
  P.stake(ctx, -68.8, 0, -30.4, -0.4, 8843);
  for (let i = 0; i < 5; i++) P.roughStone(ctx, rng.range(-122, -106), 0, rng.range(-29, -24), rng.range(0.4, 0.9), 8850 + i);
}
