// El barrio de los Pellejeros: la rúa, la plazuela de los Inocentes y sus
// casas grandes, entre la plaza de la Herrería, el corral, la capilla y la
// muralla.
//
// Cuando la carne subió por las calles, los vecinos se encerraron en sus
// casas y clavaron las puertas. Mestre Clemente, el físico de los inocentes
// (los locos de Braga, que guardaba en su casa de la plazuela), no se
// encerró: vio a los suyos arrodillarse y callarse, curados, y entendió que
// los enfermos eran los otros, los sanos. Salía de noche con su máscara de
// pico, llamaba a las puertas, dormía a los sanos con su esponja, les abría
// el cráneo. A los que sobrevivieron les atornilló una corona de hierro con
// cascabeles. Luego puso el barrio en cuarentena: cerró el arco de la rúa
// con tablas, puso cepos entre la paja y marcó con una cruz de cal las casas
// que ya había curado.
//
// Las casas son las de los maestros ricos del cuero y de la cera (el
// zapatero de la Sé, la cerera que hacía las velas de media Braga, el
// tintorero de los paños buenos): grandes, de tres alturas con su desván,
// salas de nueve metros, techos de cuatro y una sola escalera en cada una.
// La rúa tiene siete metros de ancho y se entra a ella por un arco.
//
// El recorrido (ver planes_jubilados/PLAN_BARRIO.md y el plano,
// docs/planos/plan_barrio.png):
//  1. El arco de la rúa, en la plaza de la Herrería (la palanca).
//  2. La rúa: la casa del zapatero (abierta), la de la cerera (la alcoba
//     cerrada, la viga del balcón, la llave de la tintorería; su puerta de
//     al lado da a la plazuela).
//  3. La plazuela de los Inocentes: la Casa de los Inocentes, atrancada; la
//     tintorería; la casa quemada de los Gomes.
//  4. La tintorería: los tintes, el piso de los paños y el secadero, bajo el
//     tejado, que sigue por el desván del zapatero (las palomas, el
//     aprendiz); por el tejado hundido se sale a los tejados: la viga que los
//     vecinos echaron sobre la rúa, la casa de la cerera, la quemada y el
//     tejado de la Casa de los Inocentes, con su claraboya.
//  5. La Casa de los Inocentes, por arriba: el desván, la alcoba de la
//     cortina, la botica, el estudio y la galería sobre la sala grande,
//     donde se le pelea; su patio, el callejón y la cordelería, cuya puerta
//     da a los Pelames, detrás de la barricada.
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { house, archedWall } from './builders.js';
import { floor } from './level_util.js';
import * as P from './props.js';
import { casa, tapia, rotulo, piel, V, LIME, ROT } from './kit_casa.js';
import { zapatero, viuda, quemada, tintoreria } from './barrio_casas.js';
import { casaInocentes, patioInocentes } from './inocentes.js';
import { desvanZapatero, vigaRua, tejadoQuemado, chimenea } from './barrio_tejados.js';
import { cordeleriaDentro } from './cordeleria.js';
import { horma, palo, cruzCal } from './barrio_atrezo.js';

// las plantas de las casas grandes: la baja (de 0 a 4), la de arriba (su
// suelo, a 4,25; su techo, a 7,65) y el desván (a 7,9), con el muro hasta el
// alero, a 9,4, y la cumbrera a 12,15
export const PB = 4.0,
  P1 = 4.25,
  T1 = 7.65,
  P2 = 7.9,
  ALERO = 9.4,
  CUMBRE = 12.15;
const L0 = (o = {}) => ({ y: 0, top: PB, floor: 'flag', ...o });
const L1 = (o = {}) => ({ y: P1, top: T1, ...o });
const DESVAN = (o = {}) => ({ y: P2, top: ALERO, attic: true, ...o });

export const BR = {
  // calles
  rua: { x0: 14, z0: 41, x1: 34, z1: 48 },
  plazuela: { x0: 34, z0: 41, x1: 49.5, z1: 52 },
  callejon: { x0: 46, z0: 22, x1: 49.5, z1: 41 },
  // el arco de la rúa, en la plaza de la Herrería (y el portón de la
  // cuarentena, bajo él)
  arco: { x0: 14.03, x1: 15.2, z0: 41, z1: 48, c: 44.5, w: 5.0, h: 3.2 },
  porton: { x: 14.6, z: 44.5, w: 5.0, h: 3.2 },
  // las casas grandes de la rúa: la del zapatero (norte) y la de la cerera
  // (sur, contra la muralla); la tintorería, al norte de la plazuela, pegada
  // a la del zapatero; la quemada, al sur de la plazuela
  zap: { x0: 14, z0: 31, x1: 34, z1: 41 },
  viu: { x0: 14, z0: 48, x1: 34, z1: 58 },
  tin: { x0: 34, z0: 31, x1: 46, z1: 41 },
  que: { x0: 34, z0: 52, x1: 49.5, z1: 58 },
  // la Casa de los Inocentes; su sala grande (de doble altura, abierta hasta
  // las cerchas: donde se le pelea) y su galería
  ino: { x0: 49.5, z0: 34, x1: 66, z1: 58 },
  sala: { x0: 57.2, z0: 34.6, x1: 65.4, z1: 50.8 },
  galeria: { x0: 57.2, z0: 34.6, x1: 59.2, z1: 50.8 },
  // su patio de atrás y el huerto de las hierbas, contra la muralla
  patio: { x0: 49.5, z0: 22, x1: 72, z1: 34 },
  huerto: { x0: 66, z0: 34, x1: 72, z1: 58 },
  // la viga que los vecinos echaron de tejado a tejado sobre la rúa
  viga: { x: 30.6, z0: 41.3, z1: 47.7, y: 9.1, w: 0.34 },
  // el hundimiento del tejado de la quemada (por el norte)
  hundido: { x0: 38.6, z0: 52.25, x1: 44.6, z1: 54.65 },
  // el tejado hundido del zapatero (por el sur), por donde se sale del
  // desván a los tejados, y la rampa de escombros que sube a él
  boquete: { x0: 29.3, z0: 37.9, x1: 31.5, z1: 39.6 },
  rampa: { x0: 29.35, z0: 34.8, x1: 31.45, z1: 39.45, y0: P2, y1: 10.1 },
  // la claraboya del desván del Físico, en el faldón del oeste
  claraboya: { x0: 54.0, z0: 45.6, x1: 55.2, z1: 46.8 },
  // la mesa de operar, en medio de la sala grande
  mesa: { x: 61.3, z: 42.2 },
  // la cordelería: la tienda y el obrador (dos plantas, de la calle de los
  // Pelames a la capilla) y el almacén del cáñamo (al callejón)
  cor: { x0: 38.5, z0: 3, x1: 44, z1: 22 },
  cor2: { x0: 38.5, z0: 22, x1: 46, z1: 31 },
};
// (el nombre de antes de la rúa: la usan el Físico y sus escenas)
BR.calleja = BR.rua;

export function buildBarrio(ctx, S, L) {
  calles(ctx, S, L);
  arco(ctx, L);
  rua(ctx, S, L);
  plazuela(ctx, S, L);
  cordeleria(ctx, S, L);
  adorno(ctx);
  fachadas(ctx);
  vecinos(L);
  trampas(L);
  zonas(L);
}

// ------------------------------------------------------------ calles
function calles(ctx, S, L) {
  const W = (r) => S.paint(r.x0, r.z0, r.x1, r.z1, 1);
  const { rua: R, plazuela: Z, callejon: J, patio: Q, huerto: H } = BR;
  W(R);
  floor(ctx, R.x0, R.z0, R.x1, R.z1, 'cobble');
  // (el arroyo de en medio de la rúa: losas en dos aguas)
  floor(ctx, R.x0 + 1.2, 44.15, Z.x0 + 1.4, 44.85, 'flag', 0.012, { tint: [0.62, 0.6, 0.56] });
  W(Z);
  floor(ctx, Z.x0, Z.z0, Z.x1, Z.z1, 'cobble');
  floor(ctx, Z.x0 + 1.5, Z.z0 + 1.5, Z.x1 - 1.5, Z.z1 - 1.2, 'dirt', 0.01);
  W(J);
  floor(ctx, J.x0, J.z0, J.x1, J.z1, 'dirt');
  W(Q);
  floor(ctx, Q.x0, Q.z0, Q.x1, Q.z1, 'dirt');
  W(H);
  floor(ctx, H.x0, H.z0, H.x1, H.z1, 'dirt', 0, { tint: [0.7, 0.66, 0.55] });
  void L;
}

// ------------------------------------------------------------ el arco
// La boca de la rúa, en la plaza de la Herrería: un arco de sillería de
// cinco metros, con su muro hasta lo alto y un tejadillo encima, y en él la
// cruz de cal del Físico. Bajo el arco, el portón de tablas de la cuarentena
// (clavado y apuntalado por dentro; se arranca con la palanca, desde la
// plaza). Por encima de las tablas se ve la rúa entera y, al fondo, la Casa
// de los Inocentes.
function arco(ctx, L) {
  const wb = ctx.wb;
  const A = BR.arco;
  const top = 7.6;
  archedWall(ctx, { axis: 'z', a0: A.z0, a1: A.z1, t0: A.x0, t1: A.x1, y0: 0, y1: top, mat: 'ashlar', tint: [0.74, 0.71, 0.66], openings: [{ c: A.c, w: A.w, h: A.h, rise: A.w / 2, ring: 0.3 }] });
  // el tejadillo de encima (a dos aguas, de lado a lado) y su canto
  wb.box('wooddark', A.x0 - 0.25, top, A.z0, A.x1 + 0.25, top + 0.12, A.z1, { ao: false, faces: 'tnsewb', tint: [0.55, 0.5, 0.45] });
  wb.gableRoof(A.x0 - 0.35, A.z0, A.x1 + 0.35, A.z1, top + 0.12, top + 0.75, 'z', { wallMat: 'ashlar', overhang: 0.2 });
  ctx.col.add(A.x0, top, A.z0, A.x1, top + 0.8, A.z1);
  // la cruz de cal, encima de la clave, por los dos lados
  for (const [x, rot] of [
    [A.x0 - 0.02, -Math.PI / 2],
    [A.x1 + 0.02, Math.PI / 2],
  ])
    cruzCal(ctx, x, 6.55, A.c, rot, 1.1);
  // las dos antorchas de la plaza, a los lados del arco, y el farol de dentro
  P.wallTorch(ctx, A.x0, 2.9, A.z0 + 0.45, 'w');
  P.wallTorch(ctx, A.x0, 2.9, A.z1 - 0.45, 'w');
  const { x, z, w, h } = BR.porton;
  L.interact.push({ kind: 'door', id: 'd_porton', x, y: 0, z, w, h, axis: 'z', lock: { type: 'boards', side: -1, front: 'portonDentro', msg: 'portonArranca', shut: 'portonCerrado' }, mat: 'barricade', hinge: 0, props: 1, cuarentena: true, lit: true });
}

// ------------------------------------------------------------ la rúa
function rua(ctx, S, L) {
  const { zap, viu } = BR;
  // ---- al norte: la casa del zapatero (maese Afonso, zapatero de la Sé):
  // abajo, el obrador (al oeste) y el zaguán con la cocina y la escalera; arriba,
  // la alcoba del matrimonio y el cuarto del hijo; el desván, que es el de las
  // palomas, sólo se anda desde el de la tintorería
  const hZap = casa(ctx, S, L, {
    id: 'zap',
    ...zap,
    t: 0.5,
    levels: [
      L0({ areas: [{ r: [14.5, 31.5, 24.4, 40.5], room: 'zap_tienda' }] }),
      L1({ areas: [{ r: [14.5, 31.5, 24.4, 40.5], room: 'zap_alcoba' }] }),
      DESVAN(),
    ],
    roof: { axis: 'x', h: ALERO, ridge: CUMBRE, ovs: [0.45, 0.45], gov: 0.3, open: [false, true], trusses: [17.6, 21.6, 25.6, 33.0], tieY: 10.25, holes: [{ side: 1, s0: BR.boquete.x0, s1: BR.boquete.x1, u0: BR.boquete.z0 - 36, u1: BR.boquete.z1 - 36 }], walkHoles: [[BR.boquete.x0, BR.boquete.z0, BR.boquete.x1, BR.boquete.z1]], camHoles: [[BR.boquete.x0 - 0.3, BR.boquete.z0 - 0.3, BR.boquete.x1 + 0.3, BR.boquete.z1 + 0.3]] },
    sides: {
      s: { low: 'ashlar', up: 'timber', tint: [0.9, 0.86, 0.78] },
      n: { low: 'wallstone', up: 'timber' },
      w: { low: 'wallstone', up: 'plaster', tint: [0.86, 0.82, 0.74] },
      // (pegada a la tintorería: su muro lo pone ella)
      e: { party: true },
    },
    open: [
      // la rúa: la ventana del mostrador del obrador, su puerta (clavada), la
      // del zaguán (entornada) y la de la cocina
      { side: 's', lv: 0, at: 4.5, w: 2.0, sill: 0.8, h: 1.7, shutters: 'open', frame: 'stone' },
      { side: 's', lv: 0, at: 8.2, w: 1.4, h: 2.6, leaf: 'boarded' },
      { side: 's', lv: 0, at: 13.0, w: 1.6, h: 2.8, door: { id: 'd_zapatero', lock: { type: 'none' }, ajar: 0.25 } },
      { side: 's', lv: 0, at: 17.6, w: 1.2, sill: 1.0, h: 1.5, shutters: 'ajar' },
      { side: 's', lv: 1, at: 3.0, w: 1.2, sill: 0.7, h: 1.7, shutters: 'open' },
      { side: 's', lv: 1, at: 7.2, w: 1.2, sill: 0.7, h: 1.7, shutters: 'ajar' },
      { side: 's', lv: 1, at: 11.0, w: 1.2, sill: 0.7, h: 1.7, shutters: 'broken' },
      { side: 's', lv: 1, at: 17.0, w: 1.2, sill: 0.7, h: 1.7 },
      // los ventanucos del desván (los de las palomas)
      { side: 's', lv: 2, at: 4.0, w: 0.7, sill: 0.6, h: 0.6, shutters: 'broken' },
      { side: 's', lv: 2, at: 10.0, w: 0.7, sill: 0.6, h: 0.6 },
      // el corral: la puerta de atrás (atrancada por dentro) y sus ventanas
      { side: 'n', lv: 0, at: 6.0, w: 1.3, h: 2.5, door: { id: 'd_zapatero_corral', lock: { type: 'barred', side: 1 } } },
      { side: 'n', lv: 0, at: 2.6, w: 1.0, sill: 1.2, h: 1.0, bars: true, shutters: 'closed' },
      { side: 'n', lv: 0, at: 17.6, w: 1.0, sill: 1.3, h: 1.0, bars: true },
      { side: 'n', lv: 1, at: 3.0, w: 1.0, sill: 0.9, h: 1.4, shutters: 'ajar' },
      { side: 'n', lv: 1, at: 8.5, w: 1.0, sill: 0.9, h: 1.4 },
      { side: 'n', lv: 1, at: 17.5, w: 1.0, sill: 0.9, h: 1.4, shutters: 'closed' },
      // (el paso del desván del zapatero al de la tintorería: medio muro de
      // cada una)
      { side: 'e', lv: 2, at: 5.0, w: 1.2, h: 2.2, frame: 'none' },
    ],
    walls: [
      // (no en x = 24: ahí cae una viga de los forjados, y se solapaban)
      { lv: 0, x0: 24.4, z0: 31.5, x1: 24.6, z1: 40.5, doors: [{ at: 36.8, w: 1.6, h: 2.7 }], rooms: ['zap_tienda', 'zap0'] },
      { lv: 1, x0: 24.4, z0: 31.5, x1: 24.6, z1: 40.5, doors: [{ at: 37.6, w: 1.3, h: 2.4 }], rooms: ['zap_alcoba', 'zap1'] },
    ],
    // (la escalera, una sola: del zaguán, contra el muro del corral, al cuarto
    // del hijo; el pie, a casi un metro del tabique)
    stairs: [{ lv: 0, x: 25.4, z: 32.35, dir: 'e', w: 1.5, n: 15, run: 0.3, open: 's' }],
  });
  // ---- al sur: la casa de la cerera (Dona Inês): abajo, la tienda de las
  // velas (a la plaza y a la rúa) y el zaguán con la cocina, la escalera y la
  // puerta de al lado, a la plazuela; arriba, la sala (con su oratorio) y la
  // alcoba, atrancada por dentro
  const hViu = casa(ctx, S, L, {
    id: 'viu',
    ...viu,
    t: 0.5,
    levels: [L0({ areas: [{ r: [14.5, 48.5, 24.4, 57.5], room: 'viu_tienda' }] }), L1({ areas: [{ r: [14.5, 48.5, 20.9, 57.5], room: 'viu_alcoba' }] })],
    roof: { axis: 'x', h: ALERO, ridge: CUMBRE, ovs: [0.45, 0.2], gov: 0.3 },
    sides: {
      n: { low: 'ashlar', up: 'plaster', tint: [0.92, 0.86, 0.74] },
      w: { low: 'wallstone', up: 'plaster', tint: [0.92, 0.86, 0.74] },
      e: { low: 'wallstone', up: 'plaster', tint: [0.88, 0.82, 0.72] },
      // (contra la muralla: por encima de ella asoma)
      s: { low: 'wallstone', up: 'plaster', tint: [0.8, 0.76, 0.68] },
    },
    open: [
      // la rúa: el escaparate de la tienda, la puerta del zaguán y la de la
      // cocina; arriba, las dos ventanas de sacada (la de la alcoba y la de la
      // sala) y, entre una y otra, la viga del balcón que se cayó
      { side: 'n', lv: 0, at: 4.5, w: 2.0, sill: 0.8, h: 1.7, shutters: 'closed', frame: 'stone' },
      { side: 'n', lv: 0, at: 13.5, w: 1.6, h: 2.8, door: { id: 'd_viuda', lock: { type: 'none' }, ajar: 0.15 } },
      { side: 'n', lv: 0, at: 17.6, w: 1.2, sill: 1.0, h: 1.5, shutters: 'open' },
      { side: 'n', lv: 1, at: 3.5, w: 1.1, sill: 0.05, h: 2.15, shutters: 'open' },
      { side: 'n', lv: 1, at: 10.5, w: 1.1, sill: 0.05, h: 2.15, shutters: 'broken' },
      { side: 'n', lv: 1, at: 16.6, w: 1.2, sill: 0.7, h: 1.7, shutters: 'ajar' },
      // la plaza de la Herrería: la tienda (su puerta, clavada) y la alcoba
      { side: 'w', lv: 0, at: 3.0, w: 1.6, sill: 0.8, h: 1.6, shutters: 'boarded', frame: 'stone' },
      { side: 'w', lv: 0, at: 6.6, w: 1.4, h: 2.6, leaf: 'boarded' },
      { side: 'w', lv: 1, at: 4.5, w: 1.1, sill: 0.8, h: 1.6, shutters: 'closed' },
      // la plazuela: la puerta de al lado (por donde se sale cuando el Físico
      // clava la de la rúa) y las ventanas de la cocina y de la sala
      { side: 'e', lv: 0, at: 2.0, w: 1.3, h: 2.5, door: { id: 'd_viuda_patio', lock: { type: 'none' } } },
      { side: 'e', lv: 1, at: 2.2, w: 1.1, sill: 0.8, h: 1.6, shutters: 'open' },
    ],
    walls: [
      { lv: 0, x0: 24.4, z0: 48.5, x1: 24.6, z1: 57.5, doors: [{ at: 52.4, w: 1.6, h: 2.7 }], rooms: ['viu_tienda', 'viu0'] },
      // (el tabique de la alcoba, con su puerta: viuda() pone la hoja
      // atrancada)
      { lv: 1, x0: 20.9, z0: 48.5, x1: 21.1, z1: 57.5, doors: [{ at: 54.6, w: 1.1, h: 2.3 }], rooms: ['viu_alcoba', 'viu1'] },
    ],
    // (la escalera: del zaguán, contra la muralla, a la sala)
    stairs: [{ lv: 0, x: 25.6, z: 56.65, dir: 'e', w: 1.5, n: 15, run: 0.3, open: 'n' }],
  });
  zapatero(ctx, L, hZap);
  desvanZapatero(ctx, L, hZap);
  viuda(ctx, L, hViu);
  vigaRua(ctx, L);
}

// ------------------------------------------------------------ la plazuela
function plazuela(ctx, S, L) {
  const { tin, que, ino } = BR;
  // ---- la tintorería: la planta baja de los tintes, la de encima (los paños
  // teñidos) y el secadero, bajo el tejado, que sigue por el del zapatero
  const hTin = casa(ctx, S, L, {
    id: 'tin',
    ...tin,
    t: 0.5,
    levels: [L0(), L1(), DESVAN()],
    roof: { axis: 'x', h: ALERO, ridge: CUMBRE, ovs: [0.45, 0.45], gov: 0.3, open: [true, false], trusses: [36.6, 40.0, 43.6], tieY: 10.25 },
    sides: { s: { low: 'wallstone', up: 'timber' }, n: { low: 'wallstone', up: 'plaster' }, e: { low: 'wallstone', up: 'plaster' }, w: { low: 'wallstone', up: 'plaster' } },
    open: [
      { side: 's', lv: 0, at: 6.0, w: 1.8, h: 2.8, door: { id: 'd_tinte', lock: { type: 'key', item: 'llave_tinte' } } },
      { side: 's', lv: 0, at: 2.5, w: 1.4, sill: 1.0, h: 1.5, bars: true },
      { side: 's', lv: 0, at: 9.5, w: 1.4, sill: 1.0, h: 1.5, bars: true },
      { side: 's', lv: 1, at: 2.5, w: 1.2, sill: 0.8, h: 1.6, shutters: 'open' },
      { side: 's', lv: 1, at: 6.0, w: 1.2, sill: 0.8, h: 1.6, shutters: 'open' },
      { side: 's', lv: 1, at: 9.5, w: 1.2, sill: 0.8, h: 1.6, shutters: 'ajar' },
      // (el ventano del secadero, por donde se tendía al aire)
      { side: 's', lv: 2, at: 6.0, w: 1.2, sill: 0.5, h: 0.9, shutters: 'open' },
      // (el ventano de carga, al tejado del almacén del cáñamo: por él se
      // pasaban los fardos de paño a la cordelería; se abre desde dentro)
      { side: 'n', lv: 1, at: 6.0, w: 1.1, h: 2.1, door: { id: 'd_tinte_ventano', lock: { type: 'barred', side: 1 }, barredMsg: 'ventanoTranca' } },
      { side: 'e', lv: 0, at: 6.0, w: 1.0, sill: 1.3, h: 1.0, bars: true },
      { side: 'e', lv: 1, at: 5.0, w: 1.0, sill: 0.9, h: 1.4, shutters: 'open' },
      // el paso al desván del zapatero
      { side: 'w', lv: 2, at: 5.0, w: 1.2, h: 2.2, frame: 'wood' },
    ],
    // (una sola escalera, de ida y vuelta: el primer tramo, de la planta de
    // los tintes a la de los paños, contra el muro del norte; el segundo, al
    // lado, de vuelta, al secadero)
    stairs: [
      { lv: 0, x: 35.2, z: 32.35, dir: 'e', w: 1.5, n: 15, run: 0.3, open: 's' },
      { lv: 1, x: 39.7, z: 33.95, dir: 'w', w: 1.5, n: 13, run: 0.3, open: 's' },
    ],
  });
  tintoreria(ctx, L, hTin);
  // ---- la quemada: la casa de los Gomes, que no le abrieron. Por dentro, lo
  // que dejó el fuego; el piso de arriba, hundido, y el tejado, abierto por
  // el norte. Su puerta, quemada, no cierra.
  const hQue = casa(ctx, S, L, {
    id: 'que',
    ...que,
    t: 0.45,
    levels: [
      { y: 0, top: 3.6, floor: 'flag', tint: [0.5, 0.46, 0.42] },
      { y: 3.85, top: 6.75, tint: [0.45, 0.4, 0.36] },
    ],
    roof: {
      axis: 'x',
      h: 7.0,
      ridge: 8.65,
      ovs: [0.45, 0],
      gov: 0.3,
      open: [true, true],
      holes: [{ side: -1, s0: BR.hundido.x0, s1: BR.hundido.x1, u0: 55 - BR.hundido.z1, u1: 55 - BR.hundido.z0 }],
      walkHoles: [[BR.hundido.x0, BR.hundido.z0, BR.hundido.x1, BR.hundido.z1]],
    },
    ceilHoles: [[BR.hundido.x0, 52.45, BR.hundido.x1, BR.hundido.z1]],
    holes: [{ lv: 1, r: [36.4, 52.45, 46.6, 57.55] }],
    sides: { n: { low: 'wallstone', up: 'plaster', tint: [0.58, 0.54, 0.5] }, w: { party: true }, e: { party: true }, s: { party: true } },
    open: [
      { side: 'n', lv: 0, at: 7.75, w: 1.6, h: 2.6, frame: 'stone' },
      { side: 'n', lv: 0, at: 3.5, w: 1.1, sill: 1.0, h: 1.3, shutters: 'broken' },
      { side: 'n', lv: 0, at: 12.0, w: 1.1, sill: 1.0, h: 1.3, shutters: 'broken' },
      { side: 'n', lv: 1, at: 3.5, w: 1.0, sill: 0.9, h: 1.3, shutters: 'broken' },
      { side: 'n', lv: 1, at: 7.75, w: 1.0, sill: 0.9, h: 1.3 },
      { side: 'n', lv: 1, at: 12.0, w: 1.0, sill: 0.9, h: 1.3, shutters: 'broken' },
    ],
  });
  quemada(ctx, L, hQue);
  tejadoQuemado(ctx, L);
  // ---- la Casa de los Inocentes: abajo, el zaguán con la escalera, la
  // consulta, la sala grande (la de los inocentes, donde opera: de doble
  // altura, abierta hasta las cerchas, con su galería) y las celdas de los
  // furiosos; arriba, el rellano, la alcoba del Físico (la de la cortina), la
  // botica, el estudio y la galería; el desván, alrededor de la sala, con su
  // claraboya
  const C = BR.claraboya;
  const hIno = casa(ctx, S, L, {
    id: 'ino',
    ...ino,
    t: 0.6,
    levels: [
      L0({
        areas: [
          { r: [57.2, 34.6, 65.4, 50.8], room: 'ino_sala' },
          { r: [50.1, 51.0, 57.0, 57.4], room: 'ino_consulta' },
          { r: [57.2, 51.0, 65.4, 57.4], room: 'ino_celdas' },
        ],
      }),
      L1({
        top: 8.25,
        areas: [
          { r: [50.1, 41.2, 57.0, 48.6], room: 'ino_alcoba' },
          { r: [50.1, 48.8, 57.0, 57.4], room: 'ino_botica' },
          { r: [57.2, 34.6, 65.4, 50.8], room: 'ino_sala' },
          { r: [57.2, 51.0, 65.4, 57.4], room: 'ino_estudio' },
        ],
      }),
      { y: 8.5, top: 8.5, attic: true, areas: [{ r: [57.0, 34.6, 65.4, 50.8], room: 'ino_sala' }] },
    ],
    roof: {
      axis: 'z',
      h: 8.5,
      ridge: 13.0,
      ovs: [0.45, 0.45],
      gov: 0.3,
      open: [false, true],
      trusses: [36.6, 40.6, 44.6, 48.6, 52.6, 56.4],
      tieY: 10.8,
      holes: [{ side: -1, s0: C.z0, s1: C.z1, u0: 57.75 - C.x1, u1: 57.75 - C.x0 }],
      walkHoles: [[C.x0, C.z0, C.x1, C.z1]],
      camHoles: [[C.x0 - 0.3, C.z0 - 0.3, C.x1 + 0.3, C.z1 + 0.3]],
    },
    sides: {
      w: { low: 'ashlar', up: 'plaster', tint: [0.94, 0.92, 0.86] },
      n: { low: 'wallstone', up: 'plaster', tint: [0.9, 0.88, 0.82] },
      e: { low: 'wallstone', up: 'plaster', tint: [0.9, 0.88, 0.82] },
      // (contra la muralla: su hastial asoma por encima)
      s: { low: 'wallstone', up: 'plaster', tint: [0.86, 0.84, 0.78] },
    },
    open: [
      // la plazuela: la puerta (atrancada por dentro), sus ventanas; arriba,
      // la de la cortina (en el eje de la rúa), la del rellano y la de la
      // botica
      { side: 'w', lv: 0, at: 12.5, w: 1.6, h: 2.8, door: { id: 'd_inocentes', lock: { type: 'barred', side: 1 }, barredMsg: 'inocentesTranca' } },
      { side: 'w', lv: 0, at: 2.5, w: 1.0, sill: 1.4, h: 1.0, bars: true },
      { side: 'w', lv: 0, at: 8.5, w: 1.2, sill: 1.0, h: 1.5, shutters: 'closed' },
      { side: 'w', lv: 0, at: 16.0, w: 1.1, sill: 1.0, h: 1.5, shutters: 'closed' },
      { side: 'w', lv: 0, at: 20.0, w: 1.1, sill: 1.0, h: 1.5, shutters: 'closed' },
      { side: 'w', lv: 1, at: 10.5, w: 1.0, sill: 0.9, h: 1.5 },
      { side: 'w', lv: 1, at: 5.5, w: 1.0, sill: 0.9, h: 1.4, shutters: 'closed' },
      { side: 'w', lv: 1, at: 19.0, w: 1.0, sill: 0.9, h: 1.4, shutters: 'closed' },
      // el patio: la puerta de la sala (atrancada por dentro) y sus ventanas
      // altas; arriba, el ventanal de la sala y la ventana del rellano
      { side: 'n', lv: 0, at: 11.8, w: 1.6, h: 2.8, door: { id: 'd_quirofano_patio', lock: { type: 'barred', side: 1 } } },
      { side: 'n', lv: 0, at: 9.0, w: 1.0, sill: 2.2, h: 1.2, bars: true },
      { side: 'n', lv: 0, at: 14.6, w: 1.0, sill: 2.2, h: 1.2, bars: true },
      { side: 'n', lv: 1, at: 11.8, w: 1.4, sill: 0.9, h: 2.0 },
      { side: 'n', lv: 1, at: 3.0, w: 1.0, sill: 0.9, h: 1.3, shutters: 'closed' },
      // el huerto: los ventanales altos de la sala, las rejas de las celdas y
      // la ventana del estudio
      { side: 'e', lv: 0, at: 5.0, w: 1.0, sill: 2.0, h: 1.4, bars: true },
      { side: 'e', lv: 0, at: 12.0, w: 1.0, sill: 2.0, h: 1.4, bars: true },
      { side: 'e', lv: 0, at: 18.6, w: 0.8, sill: 1.2, h: 1.0, bars: true },
      { side: 'e', lv: 0, at: 21.6, w: 0.8, sill: 1.2, h: 1.0, bars: true },
      { side: 'e', lv: 1, at: 5.0, w: 1.4, sill: 0.9, h: 2.0 },
      { side: 'e', lv: 1, at: 12.0, w: 1.4, sill: 0.9, h: 2.0 },
      { side: 'e', lv: 1, at: 20.0, w: 1.0, sill: 0.9, h: 1.4, shutters: 'open' },
    ],
    walls: [
      // abajo: el zaguán y la sala grande (con su portón), la consulta y las
      // celdas
      { lv: 0, x0: 57.0, z0: 34.6, x1: 57.2, z1: 50.8, doors: [{ at: 44.0, w: 2.4, h: 3.1 }], rooms: ['ino0', 'ino_sala'] },
      { lv: 0, x0: 50.1, z0: 50.8, x1: 57.0, z1: 51.0, doors: [{ at: 53.5, w: 1.3, h: 2.6 }], rooms: ['ino0', 'ino_consulta'] },
      { lv: 0, x0: 57.0, z0: 50.8, x1: 65.4, z1: 51.0, doors: [{ at: 61.3, w: 1.6, h: 2.8 }], rooms: ['ino_sala', 'ino_celdas'] },
      { lv: 0, x0: 57.0, z0: 51.0, x1: 57.2, z1: 57.4, rooms: ['ino_consulta', 'ino_celdas'] },
      // arriba: el rellano, la alcoba y la botica, a un lado; la galería y el
      // estudio, al otro
      { lv: 1, x0: 50.1, z0: 41.0, x1: 57.0, z1: 41.2, doors: [{ at: 53.0, w: 1.2, h: 2.4 }], rooms: ['ino1', 'ino_alcoba'] },
      { lv: 1, x0: 50.1, z0: 48.6, x1: 57.0, z1: 48.8, rooms: ['ino_alcoba', 'ino_botica'] },
      { lv: 1, x0: 57.0, z0: 34.6, x1: 57.2, z1: 41.0, doors: [{ at: 39.4, w: 1.2, h: 2.4 }], rooms: ['ino1', 'ino_sala'] },
      { lv: 1, x0: 57.0, z0: 41.0, x1: 57.2, z1: 48.7, doors: [{ at: 45.7, w: 1.1, h: 2.3 }], rooms: ['ino_alcoba', 'ino_sala'] },
      { lv: 1, x0: 57.0, z0: 48.7, x1: 57.2, z1: 50.8, rooms: ['ino_botica', 'ino_sala'] },
      { lv: 1, x0: 57.0, z0: 50.8, x1: 65.4, z1: 51.0, doors: [{ at: 58.2, w: 1.1, h: 2.3 }], rooms: ['ino_sala', 'ino_estudio'] },
      { lv: 1, x0: 57.0, z0: 51.0, x1: 57.2, z1: 57.4, doors: [{ at: 54.4, w: 1.1, h: 2.3 }], rooms: ['ino_botica', 'ino_estudio'] },
    ],
    // (una sola escalera, de ida y vuelta, en el zaguán: el primer tramo,
    // contra el muro del patio, sube hacia la plazuela; el segundo, al lado,
    // vuelve hacia la sala, al desván)
    stairs: [
      { lv: 0, x: 56.0, z: 35.45, dir: 'w', w: 1.5, n: 15, run: 0.3, open: 's' },
      { lv: 1, x: 51.5, z: 37.05, dir: 'e', w: 1.5, n: 15, run: 0.3, open: 's' },
    ],
    // (la sala grande, abierta hasta el tejado: arriba, sólo su galería del
    // oeste; en el desván, nada)
    holes: [
      { lv: 1, r: [59.2, 34.6, 65.4, 50.8] },
      { lv: 2, r: [57.0, 34.6, 65.4, 50.8] },
    ],
  });
  casaInocentes(ctx, L, hIno);
  patioInocentes(ctx, S, L);
}

// ------------------------------------------------------------ la cordelería
function cordeleria(ctx, S, L) {
  const { cor, cor2 } = BR;
  const hCor = casa(ctx, S, L, {
    id: 'cor',
    ...cor,
    // (de muros gruesos: el alero de la capilla se mete en el del este)
    t: 0.55,
    levels: [L0({ top: 3.8 }), { y: 4.05, top: 7.0 }],
    roof: { axis: 'z', h: 7.25, ridge: 8.8, ovs: [0.45, 0], gov: 0.3, walk: false },
    sides: { w: { low: 'wallstone', up: 'timber' }, n: { low: 'wallstone', up: 'timber' }, e: { low: 'wallstone', up: 'plaster' } },
    open: [
      { side: 'n', lv: 0, at: 2.4, w: 1.4, h: 2.5, door: { id: 'd_cordeleria', lock: { type: 'barred', side: 1 } } },
      { side: 'n', lv: 0, at: 4.4, w: 0.9, sill: 1.0, h: 1.2, bars: true },
      { side: 'n', lv: 1, at: 2.75, w: 1.0, sill: 0.9, h: 1.4, shutters: 'open' },
      { side: 'w', lv: 1, at: 2.5, w: 1.0, sill: 0.9, h: 1.4, shutters: 'open', bars: true },
      { side: 'w', lv: 1, at: 7.0, w: 1.0, sill: 0.9, h: 1.4, shutters: 'open', bars: true },
      { side: 'w', lv: 1, at: 11.5, w: 1.0, sill: 0.9, h: 1.4, shutters: 'ajar', bars: true },
      { side: 'w', lv: 0, at: 5.0, w: 0.8, sill: 1.3, h: 0.9, bars: true },
      { side: 'e', lv: 0, at: 4.5, w: 1.0, sill: 1.0, h: 1.2, bars: true },
      { side: 'e', lv: 1, at: 4.5, w: 1.0, sill: 0.9, h: 1.4, shutters: 'closed' },
      // (al almacén del cáñamo, el anejo de atrás)
      { side: 's', lv: 0, at: 2.4, w: 1.3, h: 2.4, frame: 'wood' },
    ],
    // el tabique de la tienda (al norte) y el almacén (al sur), con su
    // puerta (atrancada desde la tienda: game/interact, d_cordeleria_tienda)
    walls: [{ lv: 0, x0: 38.95, z0: 12.4, x1: 43.55, z1: 12.6, doors: [{ at: 41.6, w: 1.2, h: 2.3 }] }],
    // (apartadas de los muros, que aquí son gruesos: si no, el pie de una y
    // un costado de la otra no se pisaban)
    stairs: [
      { lv: 0, x: 42.85, z: 20.8, dir: 'n', w: 1.0, n: 14, open: 'w' },
      { lv: 0, x: 39.65, z: 7.0, dir: 's', w: 1.0, n: 14, open: 'e' },
    ],
  });
  const hCor2 = casa(ctx, S, L, {
    id: 'cor2',
    ...cor2,
    levels: [L0({ top: 3.6 })],
    roof: { axis: 'x', h: 3.85, ridge: 5.4, ovs: [0, 0], gov: 0.3, open: [true, false] },
    sides: { e: { low: 'wallstone' } },
    open: [
      { side: 'e', lv: 0, at: 5.0, w: 1.3, h: 2.4, door: { id: 'd_cordeleria_atras', lock: { type: 'key', item: 'llave_cordeleria' } } },
      { side: 'n', lv: 0, at: 2.4, w: 1.3, h: 2.4, frame: 'wood' },
    ],
  });
  L.interact.push({ kind: 'door', id: 'd_cordeleria_tienda', x: 41.6, y: 0, z: 12.5, w: 1.2, h: 2.3, axis: 'x', mat: 'planks', hinge: -1, plane: 12.6, inset: 0.05, lock: { type: 'barred', side: -1 }, barredMsg: 'cordeleriaTranca' });
  cordeleriaDentro(ctx, L, hCor, hCor2);
  trampillaAlmacen(ctx, L, hCor2);
}

// ------------------------------------------------------------ el otro camino
// La salida que el Físico no guarda: del ventano de carga de la tintorería
// (primera planta, al norte) se sale al tejado del almacén del cáñamo, y en
// su faldón está la trampilla por la que se bajaban los fardos, clavada con
// dos tablones (se arrancan con la palanca); abajo, la escalera de mano, y por
// dentro de la cordelería, a los Pelames. Quien se va por aquí sin haberle
// tocado se le escapa (game/fisico.js: escapa) y le buscará más adelante,
// donde va el agua (game/fisico_rama.js).
export const TRAMPILLA_ALMACEN = { x: 41.4, z: 29.2, tilt: Math.atan2(5.4 - 3.85, 4.5) };
function trampillaAlmacen(ctx, L, hCor2) {
  const wb = ctx.wb;
  const T = TRAMPILLA_ALMACEN;
  // (el tejado del almacén: de la cumbrera, 5,4 en z 26,5, al alero, 3,85 en
  // z 31)
  const techo = (z) => 5.4 - ((z - 26.5) / 4.5) * (5.4 - 3.85);
  const yT = techo(T.z);
  L.interact.push(
    { kind: 'hatch', id: 'h_almacen_arriba', end: 'top', flag: 'hatch:almacen', needs: 'palanca', boards: true, msgDown: 'almacenBaja', openMsg: 'almacenAbre', shutMsg: 'almacenClavada', x: T.x, y: yT, z: T.z, tilt: T.tilt, r: 1.5, to: [T.x, 0, T.z - 0.9, Math.PI] },
    { kind: 'hatch', id: 'h_almacen_abajo', end: 'bottom', flag: 'hatch:almacen', msgUp: 'almacenSube', shutMsg: 'almacenArriba', x: T.x, y: 0, z: T.z - 0.7, r: 1.4, to: [T.x, techo(T.z - 0.9) + 0.1, T.z - 0.9, 0] }
  );
  // la escalera de mano, de las balas a la trampilla (dentro)
  const [ra] = hCor2.rooms;
  wb.setRoom(ra);
  const x0 = T.x - 0.24,
    x1 = T.x + 0.24;
  const za = T.z - 0.75,
    zb = T.z - 0.05;
  const ya = 0,
    yb = yT - 0.15;
  for (const x of [x0, x1]) {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const u0 = i / n,
        u1 = (i + 1) / n;
      wb.box('timber', x - 0.03, ya + (yb - ya) * u0, za + (zb - za) * u0 - 0.03, x + 0.03, ya + (yb - ya) * u1, za + (zb - za) * u1 + 0.03, { ao: false, tint: [0.6, 0.52, 0.42] });
    }
  }
  for (let i = 1; i < 9; i++) {
    const u = i / 9;
    wb.box('timber', x0, ya + (yb - ya) * u - 0.02, za + (zb - za) * u - 0.02, x1, ya + (yb - ya) * u + 0.02, za + (zb - za) * u + 0.02, { ao: false, tint: [0.56, 0.48, 0.38] });
  }
  wb.setRoom(null);
  // fuera: la garrucha sobre el ventano (el madero que sale del muro, la
  // polea y la soga que baja al tejado del almacén) y dos fardos de paño
  // olvidados junto a la trampilla
  const yg = 4.25 + 2.55;
  wb.box('timber', 39.86, yg, 29.4, 40.14, yg + 0.26, 31.2, { ao: false, tint: [0.5, 0.42, 0.34] });
  wb.box('iron', 39.92, yg - 0.2, 29.55, 40.08, yg, 29.75, { ao: false });
  wb.box('burlap', 39.98, techo(29.65) + 0.05, 29.62, 40.02, yg - 0.2, 29.68, { ao: false, tint: [0.62, 0.55, 0.4] });
  for (const [x, z, c] of [
    [40.6, 30.35, [0.22, 0.28, 0.5]],
    [42.3, 29.9, [0.55, 0.18, 0.12]],
  ]) {
    const y = techo(z);
    wb.box('linen', x - 0.4, y - 0.05, z - 0.25, x + 0.4, y + 0.38, z + 0.25, { ao: false, tint: c });
  }
}

// ------------------------------------------------------------ los vecinos
// Los Coronados (los curados del Físico: entities/coronado.js) y los cuervos
// cebados de los tejados (entities/cuervo.js).
function vecinos(L) {
  L.enemies.push(
    // el hijo del zapatero, sentado a la mesa de la cocina, ante su cuenco
    { type: 'coronado', x: 30.15, y: 0, z: 37.4, yaw: Math.PI / 2, idle: 'sit', id: 'e_hijo_zapatero' },
    // en la tintorería, entre las tinas
    { type: 'coronado', x: 42.6, y: 0, z: 36.6, yaw: -2.4, idle: 'stand', id: 'e_coronado_tinte' },
    // a la puerta de la Casa de los Inocentes, de cara a la plazuela,
    // esperando a que le abran (si te ve cruzarla, el Físico lo sabrá)
    { type: 'coronado', x: 48.6, y: 0, z: 48.4, yaw: -Math.PI / 2, idle: 'stand', id: 'e_coronado_puerta' },
    // dentro: en las celdas, mirando por la reja del huerto, y en el desván,
    // ante el banco de las coronas
    { type: 'coronado', x: 64.9, y: 0, z: 52.6, yaw: Math.PI / 2, idle: 'window', id: 'e_coronado_sala' },
    { type: 'coronado', x: 59.4, y: 8.5, z: 53.6, yaw: Math.PI, idle: 'stand', id: 'e_coronado_desvan' },
    // los cuervos: en la cumbrera de la cerera (guarda los tejados del sur) y
    // en la de la quemada (los de la plazuela)
    { type: 'cuervo', x: 22.0, y: CUMBRE + 0.15, z: 53.0, yaw: -2.6, idle: 'perch', id: 'e_cuervo_aguador', guard: [14, 47, 34, 58.5] },
    { type: 'cuervo', x: 47.4, y: 8.8, z: 55.0, yaw: 2.6, idle: 'perch', id: 'e_cuervo_palomar', guard: [34, 51, 50, 58.5] },
    // los que llama la campanilla en la pelea: esperan en las celdas, fuera
    // de escena (game/fisico_pelea.js)
    { type: 'coronado', x: 59.2, y: 0, z: 54.2, yaw: Math.PI, idle: 'stand', held: true, id: 'e_coronado_llamado1' },
    { type: 'coronado', x: 63.2, y: 0, z: 55.4, yaw: Math.PI, idle: 'stand', held: true, id: 'e_coronado_llamado2' },
    // y él: Mestre Clemente, el Físico (no está en ningún sitio: lo saca y lo
    // guarda game/fisico.js)
    { type: 'fisico', x: 60.0, y: 0, z: 44.8, yaw: Math.PI, idle: 'boss', boss: true, held: true, id: 'e_fisico' }
  );
}

// ------------------------------------------------------------ lo que hay en las calles
// En la rúa: la ropa tendida de lado a lado, las pieles clavadas a secar en
// las fachadas, el carro volcado y los rótulos de los oficios. En la
// plazuela: el pozo con su polea, la cruz de piedra, el árbol muerto con su
// jaula colgada y la paja (con los cepos del Físico: trampas). Y, por los
// tejados, las chimeneas (la de su casa, con humo: está en casa).
function adorno(ctx) {
  const wb = ctx.wb;
  const rng = new RNG(3100);
  // ---- la rúa
  P.laundry(ctx, 18.2, 41.1, 18.6, 47.9, 6.2, 3101);
  P.laundry(ctx, 25.0, 41.1, 24.6, 47.9, 6.0, 3102);
  // (el carro, con la rueda rota, contra la casa del zapatero)
  P.cart(ctx, 20.2, 0, 42.3, 0.06, { brokenWheel: true });
  // las pieles: entre las puertas de abajo y las ventanas de arriba (al norte,
  // de cara al sur; al sur, de cara al norte)
  for (const [x, z, rot] of [
    [16.0, 41.07, 0],
    [20.0, 41.07, 0],
    [29.6, 41.07, 0],
    [15.5, 47.93, Math.PI],
    [21.4, 47.93, Math.PI],
    [33.0, 47.93, Math.PI],
  ])
    piel(ctx, x, 4.0, z, rot, rng.range(0.9, 1.25), rng.range(0.85, 1.1), rng.int(1, 999), undefined);
  // los rótulos: el zapatero (la bota), la cerera (la vela), el tintorero
  // (las madejas)
  rotulo(ctx, 's', 25.4, 3.6, 41.0, (w) => {
    palo(w, V(-0.12, -0.04, 0), V(-0.12, -0.24, 0), 0.005, 'iron', { round: true });
    palo(w, V(0.12, -0.04, 0), V(0.12, -0.24, 0), 0.005, 'iron', { round: true });
    w.box('wooddark', -0.2, -0.27, -0.02, 0.2, -0.24, 0.02, { ao: false });
    horma(w, 0, -0.62, 0, 0.42, undefined, true, Math.PI / 2);
  });
  rotulo(ctx, 'n', 25.8, 3.6, 48.0, (w) => {
    palo(w, V(-0.18, -0.04, 0), V(-0.18, -0.2, 0), 0.005, 'iron', { round: true });
    palo(w, V(0.18, -0.04, 0), V(0.18, -0.2, 0), 0.005, 'iron', { round: true });
    w.box('wooddark', -0.27, -0.62, -0.02, 0.27, -0.2, 0.02, { ao: false, faces: 'tnsewb' });
    for (const zz of [-0.025, 0.025]) {
      w.box('candle', -0.04, -0.56, zz - 0.003, 0.04, -0.32, zz + 0.003, { ao: false, faces: zz < 0 ? 'n' : 's' });
      w.box('ember', -0.018, -0.31, zz - 0.003, 0.018, -0.25, zz + 0.003, { ao: false, faces: zz < 0 ? 'n' : 's', grime: false });
    }
  });
  rotulo(ctx, 's', 42.4, 3.7, 41.0, (w) => {
    palo(w, V(-0.25, -0.06, 0), V(0.25, -0.06, 0), 0.02, 'wooddark', { round: true });
    [
      [0.22, 0.3, 0.62],
      [0.62, 0.16, 0.12],
      [0.78, 0.66, 0.2],
    ].forEach((t, i) => w.box('clothWhite', -0.2 + i * 0.2 - 0.05, -0.62, -0.05, -0.2 + i * 0.2 + 0.05, -0.08, 0.05, { ao: false, grime: false, tint: t }));
  });
  // los faroles de las puertas de la rúa (el de la cerera, aún encendido)
  P.lantern(ctx, 29.0, 3.2, 47.95, Math.PI, true);
  P.lantern(ctx, 28.6, 3.2, 41.05, 0, false);
  // las cruces de cal de las casas curadas: la del zapatero (en su puerta
  // clavada) y la quemada
  cruzCal(ctx, 22.2, 3.0, 41.06, 0, 0.8);
  cruzCal(ctx, 41.75, 3.1, 51.94, Math.PI, 0.9);
  // ---- la plazuela
  P.well(ctx, 41.8, 0, 48.8);
  cruzPiedra(ctx, 36.2, 50.2);
  // el árbol muerto, con la jaula colgada de una rama (dentro, lo que queda
  // de uno que no se dejó curar)
  P.deadTree(ctx, 46.4, 0, 50.2, 3201, 5.2);
  palo(wb, V(46.4, 3.7, 50.2), V(47.7, 4.25, 50.35), 0.07, 'wooddark', {});
  P.chains(ctx, 47.55, 4.2, 50.35, 7, 0);
  jaula(ctx, 47.55, 3.0, 50.35, rng);
  ctx.col.add(46.1, 0, 49.9, 46.7, 3.5, 50.5);
  // la paja, alrededor de los cepos
  P.hay(ctx, 38.9, 0, 44.2, 0.4);
  P.hay(ctx, 45.2, 0, 46.1, 1.1);
  for (const [cx, cz] of [
    [37.6, 43.0],
    [44.0, 47.4],
  ])
    for (let i = 0; i < 10; i++) {
      const a = rng.range(0, Math.PI * 2),
        d = rng.range(0.7, 1.8);
      const x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      wb.box('straw', x - rng.range(0.15, 0.35), 0.012, z - rng.range(0.1, 0.25), x + rng.range(0.15, 0.35), 0.03, z + rng.range(0.1, 0.25), { ao: false, tint: [0.62, 0.56, 0.4] });
    }
  // ---- las chimeneas (fuera del paso de los tejados)
  // (las de las casas con desván suben desde su suelo: el cañón del hogar
  // de abajo pasa por él)
  chimenea(ctx, 16.6, 32.2, P2, 13.0, 0.38);
  chimenea(ctx, 33.0, 38.6, P2, 13.2, 0.4);
  chimenea(ctx, 16.8, 55.8, 10.4, 12.9, 0.38);
  chimenea(ctx, 44.6, 32.4, P2, 12.8, 0.38);
  chimenea(ctx, 42.6, 17.0, 7.9, 9.6, 0.35);
  // (la de su casa, con humo: está en casa; en el faldón del huerto, fuera del
  // paso de la quemada a la claraboya)
  chimenea(ctx, 62.6, 55.4, 8.5, 12.9, 0.42, { smoke: true });
}

// ------------------------------------------------------------ las fachadas
// Lo que hace de una casa grande una casa noble: el arco de sillería sobre
// la puerta principal, el escudo de piedra encima (el del zapatero de la Sé,
// la bota; el de la cerera, el cirio; el de la casa del canónigo que se la
// dejó a los inocentes, la cruz y el capelo) y los canes bajo los aleros.
function fachadas(ctx) {
  // los arcos de las puertas principales
  arcoPuerta(ctx, 's', 27.0, 41.0, 1.6, 3.1);
  arcoPuerta(ctx, 'n', 27.5, 48.0, 1.6, 3.1);
  arcoPuerta(ctx, 's', 40.0, 41.0, 1.8, 3.1);
  arcoPuerta(ctx, 'w', 49.5, 46.5, 1.6, 3.1);
  // los escudos
  // (lo que lleva, en relieve: de la cara del campo, a 0,08, hasta 0,1; antes
  // acababa en el mismo plano que el campo y las dos caras se peleaban: la
  // bota y la cruz parpadeaban, el cirio casi no se veía y el capelo era una
  // raya)
  escudo(ctx, 's', 27.0, 4.75, 41.0, [0.42, 0.16, 0.12], (wb) => {
    // la bota del zapatero de la Sé (la caña y el pie, de una pieza)
    wb.box('leather', -0.09, -0.12, 0.06, 0.05, 0.16, 0.1, { ao: false, grime: false, tint: [0.3, 0.2, 0.14] });
    wb.box('leather', -0.09, -0.2, 0.06, 0.16, -0.12, 0.1, { ao: false, grime: false, tint: [0.3, 0.2, 0.14] });
  });
  escudo(ctx, 'n', 27.5, 4.75, 48.0, [0.2, 0.28, 0.5], (wb) => {
    // el cirio de la cerera, con su llama
    wb.box('candle', -0.04, -0.2, 0.06, 0.04, 0.12, 0.1, { ao: false, grime: false });
    wb.box('ember', -0.025, 0.12, 0.06, 0.025, 0.2, 0.1, { ao: false, grime: false });
  });
  escudo(ctx, 'w', 49.5, 4.75, 46.5, [0.6, 0.58, 0.52], (wb) => {
    // la cruz y el capelo del canónigo que dejó la casa a los inocentes
    // (los brazos de la cruz, a los lados del palo: sin solaparse)
    wb.box('clothRed', -0.03, -0.18, 0.06, 0.03, 0.12, 0.1, { ao: false, grime: false });
    for (const s of [-1, 1]) wb.box('clothRed', Math.min(s * 0.03, s * 0.12), -0.02, 0.06, Math.max(s * 0.03, s * 0.12), 0.04, 0.1, { ao: false, grime: false });
    wb.box('clothRed', -0.2, 0.17, 0.06, 0.2, 0.21, 0.1, { ao: false, grime: false });
    wb.box('clothRed', -0.1, 0.21, 0.06, 0.1, 0.28, 0.1, { ao: false, grime: false });
  });
  // los canes de los aleros: los de la rúa, la tintorería y la Casa
  canes(ctx, 's', 14.4, 45.6, 41.0, 9.4);
  canes(ctx, 'n', 14.4, 33.6, 48.0, 9.4);
  // (la Casa, sólo por encima de la plazuela y el callejón: más al sur se le
  // arrima el tejado de la quemada)
  canes(ctx, 'w', 34.4, 51.6, 49.5, 8.5);
}

// Un arco de sillería de adorno sobre el dintel de una puerta (las dovelas,
// un poco salidas del muro, en medio punto), en la fachada side, centrado en
// (x, z), desde yTop.
function arcoPuerta(ctx, side, x, z, w, yTop) {
  const wb = ctx.wb;
  const r = w / 2 + 0.18;
  const n = 9;
  wb.at(x, 0, z, ROT[side], () => {
    for (let i = 0; i < n; i++) {
      const a = Math.PI * ((i + 0.5) / n);
      const cx = Math.cos(a) * r,
        cy = yTop + Math.sin(a) * r * 0.82;
      wb.push();
      wb.translate(cx, cy, 0);
      wb.rotateZ(a - Math.PI / 2);
      wb.box('ashlar', -0.13, -0.17, 0, 0.13, 0.17, 0.07, { ao: false, tint: i === (n - 1) / 2 ? [0.82, 0.8, 0.74] : [0.74, 0.72, 0.66] });
      wb.pop();
    }
    // las impostas, a los lados
    for (const sx of [-1, 1]) wb.box('ashlar', sx * r - 0.22, yTop - 0.12, 0, sx * r + 0.22, yTop + 0.02, 0.09, { ao: false, tint: [0.7, 0.68, 0.62] });
  });
}

// Un escudo de piedra: la tabla, la punta de abajo, el campo de color y lo
// que lleva (draw, en su marco: x a lo ancho, y arriba, z hacia fuera).
function escudo(ctx, side, x, y, z, color, draw) {
  const wb = ctx.wb;
  wb.at(x, y, z, ROT[side], () => {
    wb.box('ashlar', -0.4, -0.3, 0, 0.4, 0.4, 0.06, { ao: false, tint: [0.78, 0.76, 0.7] });
    // (la punta: un rombo girado; su cara, un centímetro por detrás de la de
    // la tabla: en lo que se solapan, en el mismo plano, se peleaban)
    wb.push();
    wb.translate(0, -0.3, 0.03);
    wb.rotateZ(Math.PI / 4);
    wb.box('ashlar', -0.28, -0.28, -0.03, 0.28, 0.28, 0.02, { ao: false, tint: [0.78, 0.76, 0.7] });
    wb.pop();
    wb.box('plaster', -0.32, -0.26, 0.075, 0.32, 0.33, 0.08, { ao: false, grime: false, faces: 's', tint: color });
    // la moldura de arriba
    wb.box('ashlar', -0.46, 0.4, 0, 0.46, 0.48, 0.09, { ao: false, tint: [0.72, 0.7, 0.64] });
    wb.push();
    wb.translate(0, 0, 0.0);
    draw(wb);
    wb.pop();
  });
}

// Los canes de madera bajo el alero de una fachada (side), de a0 a a1 a lo
// largo de ella, en la línea line, bajo y.
function canes(ctx, side, a0, a1, line, y) {
  const wb = ctx.wb;
  const n = Math.max(2, Math.round((a1 - a0) / 0.75));
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const [x, z] = side === 'n' || side === 's' ? [a, line] : [line, a];
    wb.at(x, 0, z, ROT[side], () => {
      wb.box('wooddark', -0.06, y - 0.34, 0, 0.06, y - 0.16, 0.38, { ao: false, tint: [0.55, 0.48, 0.42] });
      wb.box('wooddark', -0.06, y - 0.42, 0, 0.06, y - 0.34, 0.16, { ao: false, tint: [0.55, 0.48, 0.42] });
    });
  }
}

// La cruz de piedra de la plazuela: dos gradas, el fuste y la cruz.
function cruzPiedra(ctx, x, z) {
  const wb = ctx.wb;
  wb.box('ashlar', x - 0.75, 0, z - 0.75, x + 0.75, 0.25, z + 0.75, { sub: 2, faces: 'tnsew', aoH: 0.3 });
  wb.box('ashlar', x - 0.48, 0.25, z - 0.48, x + 0.48, 0.5, z + 0.48, { sub: 2, faces: 'tnsew', aoH: 0.3 });
  wb.box('ashlar', x - 0.22, 0.5, z - 0.22, x + 0.22, 0.9, z + 0.22, { faces: 'tnsew' });
  wb.cylinder('ashlar', x, 0.9, z, 0.12, 0.1, 2.3, 8, { ao: false });
  wb.box('ashlar', x - 0.08, 3.2, z - 0.08, x + 0.08, 3.95, z + 0.08, { ao: false });
  wb.box('ashlar', x - 0.36, 3.55, z - 0.08, x + 0.36, 3.71, z + 0.08, { ao: false });
  // (manchada de cal: también a ella la curó)
  wb.box('plaster', x - 0.081, 3.25, z + 0.081, x + 0.081, 3.9, z + 0.083, { ao: false, faces: 's', tint: [1.1, 1.08, 1.02] });
  ctx.col.add(x - 0.75, 0, z - 0.75, x + 0.75, 0.25, z + 0.75);
  ctx.col.add(x - 0.48, 0.25, z - 0.48, x + 0.48, 0.5, z + 0.48);
  ctx.col.add(x - 0.22, 0.5, z - 0.22, x + 0.22, 4.0, z + 0.22);
}

// Una jaula de colgar, de hierro, con su argolla arriba (y dentro, huesos).
function jaula(ctx, x, y, z, rng) {
  const wb = ctx.wb;
  const r = 0.32,
    h = 0.85;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    palo(wb, V(x + Math.cos(a) * r, y, z + Math.sin(a) * r), V(x + Math.cos(a) * r * 0.9, y + h, z + Math.sin(a) * r * 0.9), 0.012, 'iron', { round: true });
  }
  for (const [yy, rr] of [
    [y, r],
    [y + h * 0.5, r * 0.97],
    [y + h, r * 0.9],
  ])
    wb.geometry('iron', new THREE.TorusGeometry(rr, 0.016, 4, 14), new THREE.Matrix4().compose(V(x, yy, z), new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2), V(1, 1, 1)), { ao: false });
  wb.cylinder('iron', x, y - 0.02, z, r, r, 0.03, 10, { ao: false, capTop: true, capBot: true });
  palo(wb, V(x, y + h, z), V(x, y + h + 0.25, z), 0.012, 'iron', { round: true });
  // los huesos
  wb.geometry('bone', new THREE.SphereGeometry(0.09, 7, 5), new THREE.Matrix4().compose(V(x + 0.05, y + 0.1, z - 0.04), new THREE.Quaternion(), V(1, 0.9, 1.1)), { ao: false });
  for (let i = 0; i < 4; i++) palo(wb, V(x + rng.range(-0.2, 0.2), y + 0.03, z + rng.range(-0.2, 0.2)), V(x + rng.range(-0.2, 0.2), y + rng.range(0.03, 0.2), z + rng.range(-0.2, 0.2)), 0.018, 'bone', { round: true });
}

// ------------------------------------------------------------ las trampas
// Los cepos que dejó el Físico entre la paja de la plazuela (game/trampas.js;
// las cuerdas con campanillas, en las casas: barrio_casas.js).
function trampas(L) {
  (L.cepos || (L.cepos = [])).push(
    // en el camino de la rúa a la tintorería, donde se pisa sin mirar
    { id: 'c_plazuela', x: 37.6, y: 0, z: 43.0 },
    // hacia la puerta de la Casa de los Inocentes
    { id: 'c_aguador', x: 44.0, y: 0, z: 47.4 }
  );
}

// ------------------------------------------------------------ zonas y mapa
function zonas(L) {
  // donde se cae desde los tejados (de más de 3 m duele; de 5,5, mata): las
  // calles, los patios, el corral y su pasaje, el borde de la plaza
  (L.fallZones || (L.fallZones = [])).push(
    [BR.rua.x0, BR.rua.z0, BR.rua.x1, BR.rua.z1],
    [BR.plazuela.x0, BR.plazuela.z0, BR.plazuela.x1, BR.plazuela.z1],
    [BR.callejon.x0, BR.callejon.z0, BR.callejon.x1, BR.callejon.z1],
    [BR.patio.x0, BR.patio.z0, BR.patio.x1, BR.patio.z1],
    [BR.huerto.x0, BR.huerto.z0, BR.huerto.x1, BR.huerto.z1],
    [BR.que.x0, BR.que.z0, BR.que.x1, BR.que.z1],
    [14, 17, 30, 31],
    [30, 17, 38.5, 19.5],
    [36, 3, 38.5, 19.5],
    [6, 42, 14, 58]
  );
  const r = (b, y0 = -1, y1 = 14) => [b.x0, b.z0, b.x1, b.z1, y0, y1];
  // (lo que hay bajo un tejado a dos aguas, sin su faldón: por fajas de medio
  // metro, cada una hasta treinta centímetros por debajo de sus tejas; encima
  // de ellas, en el tejado, ya no se está dentro)
  const bajoTejado = (b, y0, axis, h, ridge, paso = 0.5) => {
    const out = [];
    const half = axis === 'x' ? (b.z1 - b.z0) / 2 : (b.x1 - b.x0) / 2;
    const c = axis === 'x' ? (b.z0 + b.z1) / 2 : (b.x0 + b.x1) / 2;
    const k = (ridge - h) / half;
    const [a0, a1] = axis === 'x' ? [b.z0, b.z1] : [b.x0, b.x1];
    for (let u = a0; u < a1 - 1e-6; u += paso) {
      const v = Math.min(a1, u + paso);
      const top = ridge - Math.max(Math.abs(u - c), Math.abs(v - c)) * k - 0.3;
      if (top > y0) out.push(axis === 'x' ? [b.x0, u, b.x1, v, y0, top] : [u, b.z0, v, b.z1, y0, top]);
    }
    return out;
  };
  L.zones.push(
    { id: 'calleja', rects: [r(BR.rua)], atmo: 'city' },
    { id: 'plazuela', rects: [r(BR.plazuela), r(BR.callejon), r(BR.patio), r(BR.huerto)], atmo: 'city' },
    // (el desván del zapatero, el de las palomas: se anda desde el de la
    // tintorería)
    { id: 'palomero', rects: bajoTejado(BR.zap, P2 - 0.3, 'x', ALERO, CUMBRE), atmo: 'interior', room: 'zap2' },
    { id: 'zapatero', rects: [r(BR.zap, -1, P2 - 0.3)], atmo: 'interior', room: 'zap0' },
    { id: 'viuda', rects: [r(BR.viu, -1, 9.0)], atmo: 'interior', room: 'viu0' },
    { id: 'quemada', rects: [r(BR.que, -1, 6.5)], atmo: 'interior', room: 'que0' },
    { id: 'tintoreria_pellejeros', rects: [r(BR.tin, -1, P2 - 0.3), ...bajoTejado(BR.tin, P2 - 0.3, 'x', ALERO, CUMBRE)], atmo: 'interior', room: 'tin0' },
    { id: 'casa_inocentes', rects: [r(BR.ino, -1, 8.2), ...bajoTejado(BR.ino, 8.2, 'z', 8.5, 13.0)], atmo: 'interior', room: 'ino0' },
    { id: 'cordeleria', rects: [r(BR.cor, -1, 8), r(BR.cor2, -1, 5)], atmo: 'interior', room: 'cor0' }
  );
  for (const [id, b] of [
    ['calleja', BR.rua],
    ['plazuela', BR.plazuela],
    ['plazuela', BR.callejon],
    ['plazuela', BR.patio],
    ['plazuela', BR.huerto],
    ['zapatero', BR.zap],
    ['viuda', BR.viu],
    ['quemada', BR.que],
    ['tintoreria_pellejeros', BR.tin],
    ['casa_inocentes', BR.ino],
    ['cordeleria', BR.cor],
    ['cordeleria', BR.cor2],
  ])
    L.map.push({ id, r: [b.x0, b.z0, b.x1, b.z1] });
}

export { V, THREE, RNG, P, house, piel, rotulo, LIME, tapia };
