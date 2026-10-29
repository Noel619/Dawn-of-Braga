// El barrio de los Pellejeros: la calleja, la plazuela del Pozo y sus casas,
// entre la plaza de la Herrería, el corral, la capilla y la muralla.
//
// Cuando la carne subió por las calles, los vecinos se encerraron en sus
// casas y clavaron las puertas. Mestre Clemente, el físico de los inocentes
// (los locos de Braga, que guardaba en su casa de la plazuela), no se
// encerró: vio a los suyos arrodillarse y callarse, curados, y entendió que
// los enfermos eran los otros, los sanos. Salía de noche con su máscara de
// pico, llamaba a las puertas, dormía a los sanos con su esponja, les abría
// el cráneo. A los que sobrevivieron les atornilló una corona de hierro con
// cascabeles. Luego puso el barrio en cuarentena: cerró la calleja con
// tablas, puso cepos entre la paja y marcó con una cruz de cal las casas que
// ya había curado.
//
// El recorrido (ver PLAN_BARRIO.md):
//  1. El portón de la calleja, en la plaza de la Herrería (la palanca).
//  2. La calleja: la casa del zapatero (abierta), la de la viuda (la cerera:
//     la alcoba cerrada, la cornisa, la llave de la tintorería), la quemada.
//  3. La plazuela del Pozo: la Casa de los Inocentes, cerrada; la tintorería.
//  4. La tintorería: los tintes, el secadero de paños y, por su puerta de
//     arriba, los tejados: la viga caída sobre la calleja, la casa quemada,
//     el aguador, las casas del sur, la del palomero (su desván, el palomar)
//     y el tejado de la Casa de los Inocentes, con su claraboya.
//  5. La Casa de los Inocentes, por arriba; su quirófano; su patio; el callejón
//     de la capilla y la cordelería, cuya puerta da a los Pelames, detrás de
//     la barricada.
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { house } from './builders.js';
import { floor } from './level_util.js';
import * as P from './props.js';
import { casa, tapia, rotulo, piel, V, LIME } from './kit_casa.js';
import { zapatero, viuda, quemada, tintoreria } from './barrio_casas.js';
import { casaInocentes, patioInocentes } from './inocentes.js';
import { palomero, vigaCalleja, tejadoQuemado, chimenea } from './barrio_tejados.js';

// las plantas: la baja (de 0 a 3,8), la primera (su suelo, a 4,05; su techo,
// a 7) y la de encima (a 7,25)
export const PB = 3.8,
  P1 = 4.05,
  T1 = 7.0,
  P2 = 7.25;
const L0 = (o = {}) => ({ y: 0, top: PB, floor: 'flag', ...o });
const L1 = (o = {}) => ({ y: P1, top: T1, ...o });

export const BR = {
  // calles
  calleja: { x0: 14, z0: 42, x1: 34, z1: 46 },
  plazuela: { x0: 34, z0: 38.5, x1: 49.5, z1: 51 },
  callejon: { x0: 46, z0: 22, x1: 49.5, z1: 38.5 },
  // el portón de la calleja (en la plaza de la Herrería)
  porton: { x: 14, z: 44, w: 4 },
  // casas de la calleja: al norte (dan al corral por detrás) y al sur (con
  // sus patios contra la muralla)
  n1: { x0: 14, z0: 31, x1: 20, z1: 42 },
  zap: { x0: 20, z0: 31, x1: 27, z1: 42 },
  n3: { x0: 27, z0: 31, x1: 34, z1: 42 },
  s1: { x0: 14, z0: 46, x1: 22, z1: 55 },
  viu: { x0: 22, z0: 46, x1: 29.5, z1: 55 },
  s3: { x0: 29.5, z0: 46, x1: 34, z1: 55 },
  // el hundimiento del tejado de la quemada (por el norte) y la viga que cayó
  // de él sobre la calleja, hasta el tejado de enfrente
  hundido: { x0: 30.2, z0: 46.65, x1: 33.3, z1: 49.6 },
  viga: { xa: 33.45, z0: 41.4, y0: 7.85, xb: 31.4, z1: 50.25, y1: 9.8, w: 0.34 },
  // la plazuela: la tintorería (norte), el aguador y su vecina (sur), la
  // Casa de los Inocentes (este)
  tin: { x0: 34, z0: 31, x1: 46, z1: 38.5 },
  agu: { x0: 34, z0: 51, x1: 42, z1: 58 },
  s5: { x0: 42, z0: 51, x1: 49.5, z1: 58 },
  ino: { x0: 49.5, z0: 34, x1: 61, z1: 49 },
  // la claraboya del desván del Físico, en el faldón del este
  claraboya: { x0: 56.6, z0: 40.3, x1: 57.8, z1: 41.5 },
  // el quirófano: la mesa (y la lámpara encima)
  mesa: { x: 54.6, z: 37.6 },
  patio: { x0: 49.5, z0: 22, x1: 61, z1: 34 },
  // el levante, contra la muralla
  se: { x0: 49.5, z0: 49, x1: 61, z1: 58 },
  se2: { x0: 61, z0: 44, x1: 72, z1: 58 },
  pal: { x0: 61, z0: 30, x1: 72, z1: 44 },
  // el palomar de la cumbrera: su huella, su suelo, la boca de su escalera
  palomar: { x0: 65.0, z0: 33.0, x1: 68.0, z1: 37.0, y: 13.25, top: 16.4, hueco: 39.4 },
  ne: { x0: 61, z0: 22, x1: 72, z1: 30 },
  // la cordelería: la tienda y el obrador (dos plantas, de la calle de los
  // Pelames a la capilla) y el almacén del cáñamo (al callejón)
  cor: { x0: 38.5, z0: 3, x1: 44, z1: 22 },
  cor2: { x0: 38.5, z0: 22, x1: 46, z1: 31 },
};

export function buildBarrio(ctx, S, L) {
  calles(ctx, S, L);
  calleja(ctx, S, L);
  plazuela(ctx, S, L);
  levante(ctx, S, L);
  cordeleria(ctx, S, L);
  vecinos(L);
  trampas(L);
  zonas(L);
}

// ------------------------------------------------------------ calles
function calles(ctx, S, L) {
  const W = (r) => S.paint(r.x0, r.z0, r.x1, r.z1, 1);
  const { calleja: C, plazuela: Z, callejon: J, patio: Q } = BR;
  W(C);
  floor(ctx, C.x0, C.z0, C.x1, C.z1, 'cobble');
  W(Z);
  floor(ctx, Z.x0, Z.z0, Z.x1, Z.z1, 'cobble');
  floor(ctx, Z.x0 + 1.5, Z.z0 + 1.5, Z.x1 - 1.5, Z.z1 - 1.2, 'dirt', 0.01);
  W(J);
  floor(ctx, J.x0, J.z0, J.x1, J.z1, 'dirt');
  W(Q);
  floor(ctx, Q.x0, Q.z0, Q.x1, Q.z1, 'dirt');
  // los patios de atrás de la calleja, contra la muralla
  for (const h of [BR.s1, BR.viu, BR.s3]) {
    S.paint(h.x0, h.z1, h.x1, 58, 1);
    floor(ctx, h.x0, h.z1, h.x1, 58, 'dirt');
  }
  // las tapias entre patio y patio
  tapia(ctx, BR.viu.x0 - 0.2, 55, BR.viu.x0 + 0.2, 58, 2.6);
  tapia(ctx, BR.s3.x0 - 0.2, 55, BR.s3.x0 + 0.2, 58, 2.2);
}

// ------------------------------------------------------------ la calleja
function calleja(ctx, S, L) {
  // al norte: la casa de la esquina, la del zapatero y la de al lado (la de
  // la cruz de cal); al sur: la de la esquina (a la plaza), la de la viuda y
  // la quemada
  const { n1, zap, n3, s1, viu, s3 } = BR;
  casa(ctx, S, L, {
    id: 'n1',
    ...n1,
    solid: true,
    levels: [L0(), L1({ top: 6.4 })],
    roof: { axis: 'x', h: 6.65, ridge: 9.4, ovs: [0.45, 0.45], gov: 0.3, open: [false, true], walk: false },
    sides: { n: { low: 'wallstone', up: 'timber' }, s: { low: 'wallstone', up: 'timber' }, w: { low: 'wallstone', up: 'plaster', tint: [0.86, 0.82, 0.74] } },
    open: [
      { side: 's', lv: 0, at: 3.6, w: 1.3, h: 2.4, leaf: 'boarded' },
      { side: 's', lv: 0, at: 1.4, w: 0.8, sill: 1.2, h: 1.0, shutters: 'boarded' },
      { side: 's', lv: 1, at: 1.5, w: 0.9, sill: 0.8, h: 1.2 },
      { side: 's', lv: 1, at: 4.4, w: 0.9, sill: 0.8, h: 1.2, shutters: 'broken' },
      { side: 'n', lv: 1, at: 3, w: 0.9, sill: 0.8, h: 1.2 },
      { side: 'w', lv: 1, at: 5.5, w: 0.9, sill: 0.8, h: 1.2, shutters: 'open' },
    ],
  });
  const hZap = casa(ctx, S, L, {
    id: 'zap',
    ...zap,
    levels: [L0(), L1()],
    roof: { axis: 'x', h: 7.8, ridge: 10.55, ovs: [0.45, 0.45], gov: 0.3, walk: false },
    sides: { n: { low: 'wallstone', up: 'timber' }, s: { low: 'wallstone', up: 'timber' } },
    open: [
      // la puerta de la tienda, entornada; el mostrador de la ventana
      { side: 's', lv: 0, at: 4.0, w: 1.4, h: 2.5, door: { id: 'd_zapatero', lock: { type: 'none' }, ajar: 0.25 } },
      { side: 's', lv: 0, at: 1.6, w: 1.4, sill: 0.85, h: 1.35, shutters: 'open' },
      { side: 's', lv: 1, at: 1.6, w: 1.0, sill: 0.9, h: 1.4, shutters: 'open' },
      { side: 's', lv: 1, at: 4.2, w: 1.0, sill: 0.9, h: 1.4, shutters: 'ajar' },
      // la puerta de atrás, al corral: atrancada por dentro
      { side: 'n', lv: 0, at: 5.2, w: 1.2, h: 2.3, door: { id: 'd_zapatero_corral', lock: { type: 'barred', side: 1 } } },
      { side: 'n', lv: 0, at: 2.0, w: 1.0, sill: 1.1, h: 1.1, shutters: 'closed', bars: true },
      { side: 'n', lv: 1, at: 2.0, w: 1.0, sill: 0.9, h: 1.4, shutters: 'ajar' },
      { side: 'n', lv: 1, at: 5.0, w: 1.0, sill: 0.9, h: 1.4 },
    ],
    walls: [
      { lv: 0, x0: zap.x0 + 0.45, z0: 36.3, x1: zap.x1 - 0.45, z1: 36.5, doors: [{ at: 22.1, w: 1.2, h: 2.3 }] },
      { lv: 1, x0: zap.x0 + 0.45, z0: 36.3, x1: 25.2, z1: 36.5, doors: [{ at: 22.1, w: 1.1, h: 2.2 }] },
    ],
    stairs: [{ lv: 0, x: 25.95, z: 41.45, dir: 'n', w: 1.2, n: 14, open: 'w' }],
  });
  casa(ctx, S, L, {
    id: 'n3',
    ...n3,
    solid: true,
    levels: [L0(), L1()],
    roof: { axis: 'z', h: 7.25, ridge: 9.0, ovs: [0, 0], gov: 0.3 },
    sides: { s: { low: 'wallstone', up: 'timber' }, n: { low: 'wallstone', up: 'plaster', tint: [0.84, 0.8, 0.72] }, e: { low: 'wallstone', up: 'timber' } },
    open: [
      { side: 's', lv: 0, at: 2.4, w: 1.3, h: 2.4, leaf: 'cross' },
      { side: 's', lv: 0, at: 5.2, w: 0.9, sill: 1.1, h: 1.0, shutters: 'boarded' },
      { side: 's', lv: 1, at: 2.0, w: 1.0, sill: 0.9, h: 1.3, shutters: 'boarded' },
      { side: 's', lv: 1, at: 5.0, w: 1.0, sill: 0.9, h: 1.3 },
      { side: 'e', lv: 1, at: 9.2, w: 0.9, sill: 0.9, h: 1.3, shutters: 'boarded' },
      { side: 'n', lv: 1, at: 1.6, w: 0.9, sill: 0.9, h: 1.2 },
    ],
  });
  casa(ctx, S, L, {
    id: 's1',
    ...s1,
    solid: true,
    levels: [L0(), L1()],
    roof: { axis: 'z', h: 7.25, ridge: 9.25, ovs: [0.45, 0], gov: 0.3 },
    sides: { w: { low: 'wallstone', up: 'timber' }, n: { low: 'wallstone', up: 'timber' }, s: { low: 'wallstone', up: 'plaster' } },
    open: [
      { side: 'w', lv: 0, at: 4.5, w: 1.3, h: 2.4, leaf: 'closed' },
      { side: 'w', lv: 0, at: 7.4, w: 0.9, sill: 1.1, h: 1.0, lit: true, shutters: 'ajar' },
      { side: 'w', lv: 1, at: 1.8, w: 1.0, sill: 0.9, h: 1.3, shutters: 'open' },
      { side: 'w', lv: 1, at: 4.5, w: 1.0, sill: 0.9, h: 1.3, lit: true, shutters: 'ajar' },
      { side: 'w', lv: 1, at: 7.2, w: 1.0, sill: 0.9, h: 1.3 },
      { side: 'n', lv: 0, at: 5.5, w: 0.9, sill: 1.2, h: 1.0, shutters: 'boarded' },
      { side: 'n', lv: 1, at: 2.4, w: 1.0, sill: 0.9, h: 1.3, shutters: 'broken' },
      { side: 'n', lv: 1, at: 5.6, w: 1.0, sill: 0.9, h: 1.3 },
    ],
  });
  const hViu = casa(ctx, S, L, {
    id: 'viu',
    ...viu,
    // (arriba, tres salas: la alcoba, la sala y el oratorio)
    levels: [
      L0(),
      L1({
        areas: [
          { r: [22.45, 46.45, 25.4, 50.7], room: 'viu_alcoba' },
          { r: [22.45, 50.7, 29.05, 54.55], room: 'viu_oratorio' },
        ],
      }),
    ],
    roof: { axis: 'x', h: 7.25, ridge: 9.5, ovs: [0.45, 0.45], gov: 0.3, open: [false, true] },
    sides: { n: { low: 'wallstone', up: 'timber' }, s: { low: 'wallstone', up: 'plaster' } },
    open: [
      { side: 'n', lv: 0, at: 3.2, w: 1.4, h: 2.5, door: { id: 'd_viuda', lock: { type: 'none' }, ajar: 0.15 } },
      { side: 'n', lv: 0, at: 1.3, w: 1.0, sill: 0.9, h: 1.3, shutters: 'closed' },
      { side: 'n', lv: 0, at: 6.0, w: 1.0, sill: 0.9, h: 1.3, shutters: 'open' },
      // las dos ventanas de sacada de arriba: la de la sala y la de la
      // alcoba; entre una y otra, la viga de lo que fue el balcón
      { side: 'n', lv: 1, at: 1.15, w: 1.0, sill: 0.05, h: 2.15, shutters: 'broken' },
      { side: 'n', lv: 1, at: 5.4, w: 1.1, sill: 0.05, h: 2.15, shutters: 'open' },
      { side: 's', lv: 0, at: 3.5, w: 1.2, h: 2.3, door: { id: 'd_viuda_patio', lock: { type: 'none' } } },
      { side: 's', lv: 0, at: 1.4, w: 0.9, sill: 1.1, h: 1.1, shutters: 'ajar' },
      { side: 's', lv: 1, at: 2.0, w: 1.0, sill: 0.9, h: 1.3, shutters: 'open' },
      { side: 's', lv: 1, at: 5.4, w: 1.0, sill: 0.9, h: 1.3 },
    ],
    // (la escalera sube de la cocina, por el hueco del tabique, a la sala)
    // (arriba, los tabiques de la alcoba y del oratorio, con la puerta de la
    // alcoba: barrio_casas.js)
    walls: [{ lv: 0, x0: viu.x0 + 0.45, z0: 50.6, x1: 27.7, z1: 50.8, doors: [{ at: 25.0, w: 1.2, h: 2.3 }] }],
    stairs: [{ lv: 0, x: 28.45, z: 54.4, dir: 'n', w: 1.2, n: 14, run: 0.28, open: 'w' }],
  });
  const hS3 = casa(ctx, S, L, {
    id: 's3',
    ...s3,
    levels: [L0({ tint: [0.6, 0.56, 0.52] }), L1({ tint: [0.5, 0.45, 0.4] })],
    // (el tejado, hundido por el norte: de él cayó la viga que cruza la
    // calleja; el agujero llega al techo de la planta de arriba)
    roof: {
      axis: 'x',
      h: 7.25,
      ridge: 9.5,
      ovs: [0.45, 0.45],
      gov: 0.3,
      open: [true, false],
      holes: [{ side: -1, s0: BR.hundido.x0, s1: BR.hundido.x1, u0: 50.5 - BR.hundido.z1, u1: 50.5 - BR.hundido.z0 }],
      walkHoles: [[BR.hundido.x0, BR.hundido.z0, BR.hundido.x1, BR.hundido.z1]],
    },
    ceilHoles: [[BR.hundido.x0, BR.hundido.z0, BR.hundido.x1, BR.hundido.z1]],
    sides: { n: { low: 'wallstone', up: 'plaster', tint: [0.62, 0.58, 0.54] }, e: { low: 'wallstone', up: 'plaster', tint: [0.66, 0.62, 0.58] }, s: { low: 'wallstone', up: 'plaster', tint: [0.7, 0.66, 0.6] } },
    open: [
      { side: 'n', lv: 0, at: 2.25, w: 1.3, h: 2.4, leaf: 'cross' },
      { side: 'e', lv: 0, at: 2.4, w: 1.2, h: 2.3, door: { id: 'd_quemada', lock: { type: 'barred', side: -1 } } },
      { side: 's', lv: 0, at: 2.25, w: 1.2, h: 2.3, door: { id: 'd_quemada_patio', lock: { type: 'none' }, ajar: 0.4 } },
      { side: 'n', lv: 1, at: 2.25, w: 1.0, sill: 0.9, h: 1.3, shutters: 'broken' },
      { side: 'e', lv: 1, at: 2.4, w: 1.0, sill: 0.9, h: 1.3 },
    ],
    stairs: [{ lv: 0, x: 33.0, z: 54.4, dir: 'n', w: 1.0, n: 14, run: 0.28, open: 'w' }],
  });
  zapatero(ctx, L, hZap);
  viuda(ctx, L, hViu);
  quemada(ctx, L, hS3);
  tejadoQuemado(ctx, L);
  vigaCalleja(ctx, L);
}

// ------------------------------------------------------------ la plazuela
function plazuela(ctx, S, L) {
  const { tin, agu, s5, ino } = BR;
  // la tintorería: la planta baja de los tintes, la de encima (los paños
  // teñidos) y el secadero, bajo el tejado
  const hTin = casa(ctx, S, L, {
    id: 'tin',
    ...tin,
    levels: [L0(), L1(), { y: P2, top: 8.0, attic: true }],
    roof: { axis: 'x', h: 8.0, ridge: 10.1, ovs: [0, 0.45], gov: 0.3, trusses: [36.5, 40, 43.5] },
    sides: { s: { low: 'wallstone', up: 'timber' }, e: { low: 'wallstone', up: 'plaster' }, w: { low: 'wallstone', up: 'plaster' } },
    open: [
      { side: 's', lv: 0, at: 6.0, w: 1.8, h: 2.7, door: { id: 'd_tinte', lock: { type: 'key', item: 'llave_tinte' } } },
      { side: 's', lv: 0, at: 2.5, w: 1.2, sill: 1.0, h: 1.4, bars: true },
      { side: 's', lv: 0, at: 9.5, w: 1.2, sill: 1.0, h: 1.4, bars: true },
      { side: 's', lv: 1, at: 2.0, w: 1.1, sill: 0.9, h: 1.4, shutters: 'open' },
      { side: 's', lv: 1, at: 6.0, w: 1.1, sill: 0.9, h: 1.4, shutters: 'open' },
      { side: 's', lv: 1, at: 10.0, w: 1.1, sill: 0.9, h: 1.4, shutters: 'ajar' },
      // la puerta del pescante, en el hastial del oeste: al tejado de al lado
      { side: 'w', lv: 2, at: 3.1, w: 1.2, sill: 0.02, h: 2.2, frame: 'wood' },
      { side: 'e', lv: 2, at: 3.75, w: 1.0, sill: 0.4, h: 1.3, shutters: 'open' },
    ],
    stairs: [
      { lv: 0, x: 41.0, z: 32.1, dir: 'e', w: 1.2, n: 14, open: 's' },
      { lv: 1, x: 37.0, z: 37.85, dir: 'n', w: 1.1, n: 11, open: 'e' },
    ],
  });
  tintoreria(ctx, L, hTin);
  // el aguador y la casa de al lado (la del tejado hundido), contra la
  // muralla
  casa(ctx, S, L, {
    id: 'agu',
    ...agu,
    solid: true,
    levels: [L0(), L1()],
    roof: { axis: 'x', h: 7.25, ridge: 9.0, ovs: [0.45, 0], gov: 0.3 },
    sides: { n: { low: 'wallstone', up: 'timber' }, w: { low: 'wallstone', up: 'plaster' } },
    open: [
      { side: 'n', lv: 0, at: 3.0, w: 1.3, h: 2.4, leaf: 'boarded' },
      { side: 'n', lv: 0, at: 6.2, w: 1.0, sill: 1.0, h: 1.1, shutters: 'closed' },
      { side: 'n', lv: 1, at: 2.0, w: 1.0, sill: 0.9, h: 1.3 },
      { side: 'n', lv: 1, at: 5.8, w: 1.0, sill: 0.9, h: 1.3, shutters: 'boarded' },
    ],
  });
  casa(ctx, S, L, {
    id: 's5',
    ...s5,
    solid: true,
    levels: [L0(), L1({ top: 6.3 })],
    roof: { axis: 'x', h: 6.5, ridge: 8.25, ovs: [0.45, 0], gov: 0.3, open: [true, true] },
    sides: { n: { low: 'wallstone', up: 'plaster', tint: [0.88, 0.8, 0.7] } },
    open: [
      { side: 'n', lv: 0, at: 2.5, w: 1.3, h: 2.4, leaf: 'cross' },
      { side: 'n', lv: 0, at: 5.6, w: 1.0, sill: 1.0, h: 1.1, shutters: 'boarded' },
      { side: 'n', lv: 1, at: 2.4, w: 1.0, sill: 0.8, h: 1.2, shutters: 'broken' },
      { side: 'n', lv: 1, at: 5.4, w: 1.0, sill: 0.8, h: 1.2 },
    ],
  });
  // la Casa de los Inocentes: abajo, la sala de visitas, el zaguán de la
  // escalera y el quirófano (todo lo ancho de la casa, detrás, con su puerta
  // al patio); arriba, la alcoba del Físico (la de la cortina), el rellano,
  // la botica y la sala de los inocentes; el desván, con su claraboya
  const hIno = casa(ctx, S, L, {
    id: 'ino',
    ...ino,
    levels: [
      L0({
        areas: [
          { r: [49.95, 34.45, 60.55, 40.9], room: 'ino_quir' },
          { r: [49.95, 40.9, 55.4, 48.55], room: 'ino_consulta' },
        ],
      }),
      L1({
        areas: [
          { r: [49.95, 40.9, 55.4, 48.55], room: 'ino_alcoba' },
          { r: [49.95, 34.45, 55.4, 40.9], room: 'ino_botica' },
          { r: [55.4, 34.45, 60.55, 40.9], room: 'ino_sala' },
        ],
      }),
      { y: P2, top: 7.4, attic: true },
    ],
    // (la claraboya, en el faldón del este: se baja por ella al desván)
    roof: {
      axis: 'z',
      h: 7.4,
      ridge: 10.4,
      ovs: [0.45, 0],
      gov: 0.3,
      trusses: [36.6, 40.0, 44.0, 47.6],
      tieY: 9.35,
      holes: [{ side: 1, s0: BR.claraboya.z0, s1: BR.claraboya.z1, u0: BR.claraboya.x0 - 55.25, u1: BR.claraboya.x1 - 55.25 }],
      walkHoles: [[BR.claraboya.x0, BR.claraboya.z0, BR.claraboya.x1, BR.claraboya.z1]],
      camHoles: [[BR.claraboya.x0 - 0.3, BR.claraboya.z0 - 0.3, BR.claraboya.x1 + 0.3, BR.claraboya.z1 + 0.3]],
    },
    sides: { w: { low: 'wallstone', up: 'timber' }, s: { low: 'wallstone', up: 'plaster' }, n: { low: 'wallstone', up: 'plaster' } },
    open: [
      { side: 'w', lv: 0, at: 11.0, w: 1.4, h: 2.5, door: { id: 'd_inocentes', lock: { type: 'barred', side: 1 }, barredMsg: 'inocentesTranca' } },
      { side: 'w', lv: 0, at: 8.0, w: 1.3, sill: 0.9, h: 1.4, shutters: 'closed' },
      { side: 'w', lv: 0, at: 13.6, w: 1.0, sill: 1.0, h: 1.2, shutters: 'closed' },
      // la ventana de la cortina: en el eje de la calleja
      { side: 'w', lv: 1, at: 10.0, w: 1.0, sill: 0.9, h: 1.5 },
      { side: 'w', lv: 1, at: 13.4, w: 1.0, sill: 0.9, h: 1.4, shutters: 'closed' },
      { side: 'w', lv: 1, at: 4.0, w: 0.9, sill: 0.9, h: 1.3, shutters: 'closed' },
      { side: 'n', lv: 0, at: 5.0, w: 1.4, h: 2.4, door: { id: 'd_quirofano_patio', lock: { type: 'barred', side: 1 } } },
      { side: 'n', lv: 0, at: 9.0, w: 1.0, sill: 1.2, h: 1.0, bars: true },
      { side: 'n', lv: 1, at: 3.0, w: 1.0, sill: 0.9, h: 1.3, shutters: 'closed' },
      { side: 'n', lv: 1, at: 8.5, w: 1.0, sill: 0.9, h: 1.3, bars: true },
      { side: 's', lv: 1, at: 3.0, w: 0.9, sill: 0.9, h: 1.2, shutters: 'closed' },
    ],
    walls: [
      // abajo: el quirófano (al norte) y la sala de visitas y el zaguán (al sur)
      { lv: 0, x0: 49.95, z0: 40.8, x1: 55.3, z1: 41.0, rooms: ['ino_quir', 'ino_consulta'] },
      { lv: 0, x0: 55.3, z0: 40.8, x1: 60.55, z1: 41.0, doors: [{ at: 57.6, w: 1.2, h: 2.3 }], rooms: ['ino_quir', 'ino0'] },
      { lv: 0, x0: 55.3, z0: 41.0, x1: 55.5, z1: 48.55, doors: [{ at: 46.4, w: 1.1, h: 2.3 }], rooms: ['ino_consulta', 'ino0'] },
      // arriba: la alcoba, el rellano, la botica y la sala de los inocentes
      { lv: 1, x0: 49.95, z0: 40.8, x1: 55.3, z1: 41.0, rooms: ['ino_botica', 'ino_alcoba'] },
      { lv: 1, x0: 55.5, z0: 40.8, x1: 60.55, z1: 41.0, doors: [{ at: 58.2, w: 1.1, h: 2.2 }], rooms: ['ino_sala', 'ino1'] },
      { lv: 1, x0: 55.3, z0: 34.45, x1: 55.5, z1: 41.0, doors: [{ at: 37.7, w: 1.0, h: 2.2 }], rooms: ['ino_botica', 'ino_sala'] },
      { lv: 1, x0: 55.3, z0: 41.0, x1: 55.5, z1: 48.55, doors: [{ at: 42.4, w: 1.0, h: 2.2 }], rooms: ['ino_alcoba', 'ino1'] },
    ],
    stairs: [
      { lv: 0, x: 60.0, z: 48.4, dir: 'n', w: 1.1, n: 14, open: 'w' },
      { lv: 1, x: 56.15, z: 48.3, dir: 'n', w: 1.0, n: 11, open: 'e' },
    ],
  });
  casaInocentes(ctx, L, hIno);
  patioInocentes(ctx, S, L);
}

// ------------------------------------------------------------ el levante
function levante(ctx, S, L) {
  const { se, se2, pal, ne } = BR;
  casa(ctx, S, L, {
    id: 'se',
    ...se,
    solid: true,
    levels: [L0(), L1({ top: 6.3 })],
    roof: { axis: 'x', h: 6.5, ridge: 8.75, ovs: [0, 0], gov: 0.3 },
    sides: { w: { low: 'wallstone', up: 'plaster', tint: [0.8, 0.76, 0.7] } },
    open: [
      { side: 'w', lv: 0, at: 1.0, w: 1.2, h: 2.3, leaf: 'boarded' },
      { side: 'w', lv: 1, at: 1.0, w: 0.9, sill: 0.8, h: 1.2 },
    ],
  });
  casa(ctx, S, L, {
    id: 'se2',
    ...se2,
    solid: true,
    levels: [L0({ top: 3.2 }), L1({ y: 3.45, top: 5.3 })],
    roof: { axis: 'z', h: 5.5, ridge: 8.25, ovs: [0, 0], gov: 0.3, open: [true, true] },
    sides: {},
    open: [],
  });
  // la casa del palomero: tres plantas y el desván, y el palomar encima
  const hPal = casa(ctx, S, L, {
    id: 'pal',
    ...pal,
    levels: [L0(), L1(), { y: P2, top: 10.0 }, { y: 10.25, top: 10.6, attic: true }],
    // (el palomar, en la cumbrera: el tejado se abre donde se levanta)
    roof: {
      axis: 'z',
      h: 10.6,
      ridge: 13.6,
      ovs: [0, 0],
      gov: 0.3,
      walk: false,
      trusses: [40.2, 42.6],
      tieY: 12.6,
      holes: [
        { side: -1, s0: BR.palomar.z0, s1: BR.palomar.hueco, u0: 0, u1: 66.5 - BR.palomar.x0 },
        { side: 1, s0: BR.palomar.z0, s1: BR.palomar.hueco, u0: 0, u1: BR.palomar.x1 - 66.5 },
      ],
      camHoles: [[BR.palomar.x0, BR.palomar.z0, BR.palomar.x1, BR.palomar.hueco]],
    },
    sides: { s: { low: 'wallstone', up: 'plaster', tint: [0.82, 0.78, 0.7] }, w: { low: 'wallstone', up: 'plaster', tint: [0.82, 0.78, 0.7] }, n: { low: 'wallstone', up: 'plaster' } },
    open: [
      { side: 'w', lv: 2, at: 10.0, w: 1.2, sill: 0.02, h: 2.2, frame: 'wood' },
      { side: 'w', lv: 2, at: 6.0, w: 1.0, sill: 0.9, h: 1.3, shutters: 'open' },
      { side: 's', lv: 2, at: 3.0, w: 1.6, sill: 0.0, h: 2.4, frame: 'none' },
      { side: 'n', lv: 2, at: 5.5, w: 1.0, sill: 0.9, h: 1.3 },
      { side: 'w', lv: 1, at: 2.0, w: 1.0, sill: 0.9, h: 1.3, shutters: 'closed' },
    ],
    stairs: [{ lv: 2, x: 66.5, z: 42.4, dir: 'n', w: 1.1, n: 10, open: 'e' }],
  });
  palomero(ctx, L, hPal);
  casa(ctx, S, L, {
    id: 'ne',
    ...ne,
    solid: true,
    levels: [L0(), L1({ top: 5.8 })],
    roof: { axis: 'z', h: 6.0, ridge: 8.4, ovs: [0.45, 0], gov: 0.3, walk: false },
    sides: { w: { low: 'wallstone', up: 'plaster' } },
    open: [
      { side: 'w', lv: 1, at: 4.0, w: 1.0, sill: 0.8, h: 1.2, shutters: 'closed' },
      { side: 'w', lv: 0, at: 4.0, w: 1.2, h: 2.3, leaf: 'closed' },
    ],
  });
}

// ------------------------------------------------------------ la cordelería
function cordeleria(ctx, S, L) {
  const { cor, cor2 } = BR;
  casa(ctx, S, L, {
    id: 'cor',
    ...cor,
    // (de muros gruesos: el alero de la capilla se mete en el del este)
    t: 0.55,
    levels: [L0(), L1()],
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
    ],
    stairs: [
      { lv: 0, x: 43.0, z: 21.4, dir: 'n', w: 1.0, n: 14, open: 'w' },
      { lv: 0, x: 39.4, z: 7.0, dir: 's', w: 1.0, n: 14, open: 'e' },
    ],
  });
  casa(ctx, S, L, {
    id: 'cor2',
    ...cor2,
    levels: [L0({ top: 3.6 })],
    roof: { axis: 'x', h: 3.85, ridge: 5.4, ovs: [0, 0], gov: 0.3, open: [true, false] },
    sides: { e: { low: 'wallstone' } },
    open: [{ side: 'e', lv: 0, at: 5.0, w: 1.3, h: 2.4, door: { id: 'd_cordeleria_atras', lock: { type: 'key', item: 'llave_cordeleria' } } }],
  });
}

// ------------------------------------------------------------ los vecinos
// Los Coronados (los curados del Físico: entities/coronado.js) y los cuervos
// cebados de los tejados (entities/cuervo.js).
function vecinos(L) {
  const y1 = P1,
    y2 = P2;
  L.enemies.push(
    // el hijo del zapatero, sentado a la mesa de la cocina, ante su cuenco
    { type: 'coronado', x: 22.4, y: 0, z: 33.2, yaw: Math.PI / 2, idle: 'sit', id: 'e_hijo_zapatero' },
    // en la tintorería, entre las tinas, junto a la escalera
    { type: 'coronado', x: 39.6, y: 0, z: 33.3, yaw: 0.3, idle: 'stand', id: 'e_coronado_tinte' },
    // a la puerta de la Casa de los Inocentes, de cara a la plazuela,
    // esperando a que le abran (si te ve cruzarla, el Físico lo sabrá)
    { type: 'coronado', x: 48.2, y: 0, z: 45.0, yaw: -Math.PI / 2, idle: 'stand', id: 'e_coronado_puerta' },
    // dentro: en la sala de los inocentes, mirando por la reja, y en el
    // desván, ante el banco de las coronas
    { type: 'coronado', x: 58.0, y: y1, z: 35.1, yaw: Math.PI, idle: 'window', id: 'e_coronado_sala' },
    { type: 'coronado', x: 55.25, y: y2, z: 37.35, yaw: Math.PI, idle: 'stand', id: 'e_coronado_desvan' },
    // los cuervos: en la cumbrera del aguador (guarda los tejados del sur) y
    // en la punta del palomar (los del levante y el boquete del palomero)
    { type: 'cuervo', x: 41.75, y: 9.25, z: 54.5, yaw: -2.6, idle: 'perch', id: 'e_cuervo_aguador', guard: [33, 46, 50, 59] },
    { type: 'cuervo', x: 66.5, y: 17.8, z: 35.0, yaw: 2.6, idle: 'perch', id: 'e_cuervo_palomar', guard: [49.5, 40, 73, 59] },
    // los que llama la campanilla en la pelea: esperan en el zaguán, fuera de
    // escena (game/fisico_pelea.js)
    { type: 'coronado', x: 58.4, y: 0, z: 44.6, yaw: Math.PI, idle: 'stand', held: true, id: 'e_coronado_llamado1' },
    { type: 'coronado', x: 59.4, y: 0, z: 45.6, yaw: Math.PI, idle: 'stand', held: true, id: 'e_coronado_llamado2' },
    // y él: Mestre Clemente, el Físico (no está en ningún sitio: lo saca y lo
    // guarda game/fisico.js)
    { type: 'fisico', x: 54.6, y: 0, z: 39.4, yaw: Math.PI, idle: 'boss', boss: true, held: true, id: 'e_fisico' }
  );
}

// ------------------------------------------------------------ las trampas
// Los cepos que dejó el Físico entre la paja de la plazuela (game/trampas.js;
// las cuerdas con campanillas, en las casas: barrio_casas.js).
function trampas(L) {
  (L.cepos || (L.cepos = [])).push(
    // en el camino de la calleja a la tintorería, donde se pisa sin mirar
    { id: 'c_plazuela', x: 37.4, y: 0, z: 41.6 },
    // hacia la casa del aguador
    { id: 'c_aguador', x: 43.8, y: 0, z: 47.2 }
  );
}

// ------------------------------------------------------------ zonas y mapa
function zonas(L) {
  // donde se cae desde los tejados (de más de 3 m duele; de 5,5, mata): las
  // calles, los patios, el corral y su pasaje, el borde de la plaza
  (L.fallZones || (L.fallZones = [])).push(
    [BR.calleja.x0, BR.calleja.z0, BR.calleja.x1, BR.calleja.z1],
    [BR.plazuela.x0, BR.plazuela.z0, BR.plazuela.x1, BR.plazuela.z1],
    [BR.callejon.x0, BR.callejon.z0, BR.callejon.x1, BR.callejon.z1],
    [BR.patio.x0, BR.patio.z0, BR.patio.x1, BR.patio.z1],
    [BR.s1.x0, BR.s1.z1, BR.s3.x1, 58],
    [14, 17, 30, 31],
    [30, 17, 38.5, 19.5],
    [36, 3, 38.5, 19.5],
    [6, 42, 14, 58]
  );
  const r = (b, y0 = -1, y1 = 12) => [b.x0, b.z0, b.x1, b.z1, y0, y1];
  L.zones.push(
    { id: 'calleja', rects: [r(BR.calleja)], atmo: 'city' },
    { id: 'plazuela', rects: [r(BR.plazuela), r(BR.callejon), r(BR.patio)], atmo: 'city' },
    { id: 'zapatero', rects: [r(BR.zap, -1, 7.2)], atmo: 'interior', room: 'zap0' },
    { id: 'viuda', rects: [r(BR.viu, -1, 7.2)], atmo: 'interior', room: 'viu0' },
    { id: 'quemada', rects: [r(BR.s3, -1, 7.2)], atmo: 'interior', room: 's30' },
    { id: 'tintoreria_pellejeros', rects: [r(BR.tin, -1, 11)], atmo: 'interior', room: 'tin0' },
    { id: 'casa_inocentes', rects: [r(BR.ino, -1, 11)], atmo: 'interior', room: 'ino0' },
    { id: 'palomero', rects: [r(BR.pal, -1, 14)], atmo: 'interior', room: 'pal2' },
    { id: 'cordeleria', rects: [r(BR.cor, -1, 8), r(BR.cor2, -1, 5)], atmo: 'interior', room: 'cor0' }
  );
  for (const [id, b] of [
    ['calleja', BR.calleja],
    ['plazuela', BR.plazuela],
    ['plazuela', BR.callejon],
    ['plazuela', BR.patio],
    ['zapatero', BR.zap],
    ['viuda', BR.viu],
    ['quemada', BR.s3],
    ['tintoreria_pellejeros', BR.tin],
    ['casa_inocentes', BR.ino],
    ['cordeleria', BR.cor],
    ['cordeleria', BR.cor2],
  ])
    L.map.push({ id, r: [b.x0, b.z0, b.x1, b.z1] });
}

export { V, THREE, RNG, P, house, piel, rotulo, LIME };
