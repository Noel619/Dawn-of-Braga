// La torre del homenaje, rehecha (PLAN_CASTILLO.md, §4), como las románicas
// que se conservan enteras (Rochester, Castle Hedingham): cuadrada, de muros
// de casi dos metros y medio, con pilastras en las esquinas y en medio de
// cada lienzo, un zócalo en escalones y una imposta en cada planta; partida
// por dentro por un muro de carga; la entrada en la planta primera por el
// antecuerpo, con su foso y su puente levadizo; la sala a doble altura, con
// su galería y un gran arco diafragma; y torrecillas en las esquinas, por
// encima de la terraza. Mucho más alta que antes: manda sobre el patio, el
// Paço y la ciudad. Todo sale de unas pocas medidas (CASTLE.keep y las de
// aquí arriba): las estancias, sus zonas, sus forjados y sus escaleras.
//
// Planta baja: los víveres del asedio (el almacén, el granero, la bodega y
// el pozo de la torre), a los que se baja por la trampilla del dormitorio.
// Primera: el cuerpo de guardia, con la puerta del puente y su torno; el
// dormitorio de los ballesteros, la armería y el taller del ballestero.
// Segunda: la sala del alcaide, donde espera el Rey a la mesa de su juego,
// a doble altura, con la poterna del adarve; el escritorio del alcaide (muerto
// sobre sus cuentas) y su alcoba. Tercera, sobre el escritorio y la alcoba:
// la cámara alta, con la puerta de la galería de la sala y la escalera de la
// terraza. Arriba, la terraza, con su caseta, sus torrecillas, el matacán,
// el fanal y el estandarte del Rey.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { solid, blocker, stairs, merlons, archedWall, subtractRects, solidGableRoof } from './builders.js';
import * as P from './props.js';
import { interiorRoom } from './level_util.js';
import { bakeCorpse } from '../entities/models.js';
import { buildReyMesa, REY_MESA } from './rey_mesa.js';
import { CASTLE, holedWall, beam3, parapet, slit } from './level_castle.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const W = (S, x0, z0, x1, z1) => S.paint(x0, z0, x1, z1, 1);

// El muro de carga (a lo largo de z, en x = SPINE, de SPT de grueso) y los
// tabiques de cada planta (a lo largo de x, de z0 a z1).
const SPINE = -83.9,
  SPT = 1.0;
const CROSS = [
  [-16.0, -15.2],
  [-15.4, -14.6],
  [-15.4, -14.6],
];
// el arco diafragma de la sala: su muro (de z0 a z1), su luz, el arranque y
// la flecha (la mesa del Rey queda al norte, a su sombra)
const ARCH = { z0: -15.05, z1: -14.55, w: 8.0, spring: 13.2, rise: 4.0 };
// la galería de la sala, a la altura de la planta tercera: su ancho
const GAL = 1.6;
// La planta de armas (§4.2): el pañol de los virotes, tabicado en la esquina
// del taller (x1, z1: su planta por dentro; xw, zw: donde empieza el taller,
// tras el tabique); la saetera del pañol, ensanchada a mazazos, que sale al
// cadalso; la ventana del taller, que entra desde él; los huecos del suelo
// (el agujero del bolaño en la armería, el del taller y el pozo del
// montacargas); las dos bocas del tabique entre el taller y la guardia (la
// del escombro y la que se tapió) y el cadalso, la galería de madera colgada
// por fuera de la torre al norte y al este, con la garita del alférez en la
// esquina.
export const ARMAS = {
  panol: { x1: -78.8, xw: -78.4, z1: -22.6, zw: -22.2 },
  saetera: { x: -81.2, w: 1.25, h: 1.95 },
  ventana: { z: -25.2, w: 1.25, h: 2.0 },
  holeArm: [-91.5, -20.5, -89.5, -18.7],
  holeTaller: [-78.0, -21.9, -75.4, -19.6],
  holeHoist: [-81.5, -25.0, -80.3, -23.8],
  escombro: -80.4,
  tabique: -75.8,
  cadalso: { w: 1.8, x0: -83.2, z1: -23.6 },
};
// las escaleras (x, z: el pie; dir; ancho; peldaños) y sus huecos en el
// forjado de arriba
const ST = {
  s12: { x: -74.15, z: -6.2, dir: 'n', w: 1.5, n: 15, hole: [-75.05, -12.5, null, -7.9] },
  s23: { x: -85.9, z: -6.15, dir: 'w', w: 1.5, n: 15, hole: [-92.2, -7.05, -87.6, null] },
  s3R: { x: -85.9, z: -25.85, dir: 'w', w: 1.5, n: 16, hole: [-92.64, null, -87.6, -24.95] },
};

// La bajada tapiada (§4.3): una escalera en un hueco del suelo del almacén
// baja a un pasadizo, bajo tierra, que acaba en el fondo del pasillo de las
// celdas; ahí la tapiaron (ladrillo nuevo y cal, y por este lado sacos y
// piedras). Encima del tapiado, colgado de una cuerda, el sillar que hacía de
// contrapeso del polipasto de la trampilla: un virote a la cuerda, y cae.
export const BAJADA = {
  // la escalera, pegada al muro oeste del almacén: arriba al norte (z1), abajo
  // al sur (z0 + ... : baja hacia el sur)
  stair: { x0: -94.5, x1: -93.0, top: -13.0, bottom: -5.86, n: 17 },
  hole: [-94.5, -13.0, -93.0, -5.86],
  // abajo: el rellano (al pie, al sur), el pasadizo que vuelve hacia el norte
  // y el tramo hasta el tapiado, al fondo del pasillo de las celdas
  // (a medios metros: la rejilla de las mazmorras)
  rellano: [-94.5, -6.0, -91.0, -4.5],
  norte: [-92.5, -13.0, -91.0, -6.0],
  este: [-91.0, -13.0, -89.0, -11.0],
  tapia: { x: -89.0, z: -12.0, w: 2.0, h: 2.4 },
  sillar: { x: -89.75, z: -12.0, y0: -3.75, y1: -2.68, s: [0.6, 0.44, 0.5] },
};

// Medidas que salen de las de la torre.
export function torreDims() {
  const K = CASTLE.keep;
  return { K, ix0: K.x0 + K.t, ix1: K.x1 - K.t, iz0: K.z0 + K.t, iz1: K.z1 - K.t, s0: SPINE - SPT / 2, s1: SPINE + SPT / 2 };
}

// Las estancias, planta a planta: su luz (room), su zona (el rótulo al
// entrar), su planta (rects), los muros de fuera que dan a ella (walls:
// rectángulo, lados y puertas) y si llega hasta la terraza (tall).
let _rooms = null;
export function torreRooms() {
  if (_rooms) return _rooms;
  const { K, ix0, ix1, iz0, iz1, s0, s1 } = torreDims();
  const DR = CASTLE.door,
    PO = CASTLE.postern;
  const [a0, a1] = CROSS[0],
    [b0, b1] = CROSS[1],
    [c0, c1] = CROSS[2];
  const R = (room, zone, r, sides, o = {}) => ({ room, zone, rects: [r], walls: [{ r, sides, doors: o.doors }], extra: o.extra, tall: o.tall });
  _rooms = [
    [
      R('homenaje0', 'homenaje_almacen', [ix0, a1, s0, iz1], 'sw'),
      R('homenaje0n', 'homenaje_granero', [ix0, iz0, s0, a0], 'nw'),
      R('homenaje0b', 'homenaje_bodega', [s1, iz0, ix1, a0], 'ne'),
      R('homenaje0p', 'homenaje_pozo', [s1, a1, ix1, iz1], 'se'),
    ],
    [
      R('homenaje1', 'homenaje_guardia', [s1, b1, ix1, iz1], 'se', { doors: [{ side: 's', at: DR.x, w: DR.w, h: DR.h }], extra: [[DR.x - DR.w / 2, iz1, DR.x + DR.w / 2, K.z1]] }),
      R('homenaje1p', 'homenaje_dormitorio', [ix0, b1, s0, iz1], 'sw'),
      R('homenaje1a', 'homenaje_armeria', [ix0, iz0, s0, b0], 'nw'),
      (() => {
        const A = ARMAS.panol,
          V = ARMAS.ventana;
        return {
          room: 'homenaje1t',
          zone: 'homenaje_ballestero',
          rects: [
            [s1, A.zw, ix1, b0],
            [A.xw, iz0, ix1, A.zw],
          ],
          walls: [
            { r: [s1, A.zw, ix1, b0], sides: 'e' },
            { r: [A.xw, iz0, ix1, A.zw], sides: 'ne', doors: [{ side: 'e', at: V.z, w: V.w, h: V.h }] },
          ],
        };
      })(),
      {
        room: 'homenaje1q',
        zone: 'homenaje_panol',
        rects: [[s1, iz0, ARMAS.panol.x1, ARMAS.panol.z1]],
        walls: [{ r: [s1, iz0, ARMAS.panol.x1, ARMAS.panol.z1], sides: 'n', doors: [{ side: 'n', at: ARMAS.saetera.x, w: ARMAS.saetera.w, h: ARMAS.saetera.h }] }],
      },
    ],
    [
      R('homenaje2', 'homenaje_alcaide', [s1, iz0, ix1, iz1], 'nse', { tall: true, doors: [{ side: 'e', at: (PO.z0 + PO.z1) / 2, w: PO.z1 - PO.z0, h: PO.h }], extra: [[ix1, PO.z0, K.x1, PO.z1]] }),
      R('homenaje2e', 'homenaje_escritorio', [ix0, c1, s0, iz1], 'sw'),
      R('homenaje2c', 'homenaje_alcoba', [ix0, iz0, s0, c0], 'nw'),
    ],
    [R('homenaje3', 'homenaje_camara', [ix0, iz0, s0, iz1], 'nsw')],
  ];
  return _rooms;
}

// Las zonas de la torre (la galería antes que la sala: está dentro de ella).
export function torreZones() {
  const { K, s1, ix1, iz0 } = torreDims();
  const fy = [0, K.F1, K.F2, K.F3],
    top = [K.F1, K.F2, K.F3, K.R];
  const zones = [
    {
      id: 'homenaje_galeria',
      rects: [
        [s1, iz0, s1 + GAL, CROSS[2][0], K.F3 - 0.2, K.R - 0.3],
        [s1, iz0, ix1, iz0 + GAL, K.F3 - 0.2, K.R - 0.3],
      ],
      atmo: 'interior',
      room: 'homenaje2',
    },
  ];
  torreRooms().forEach((fl, f) =>
    fl.forEach((r) => zones.push({ id: r.zone, rects: [...r.rects, ...(r.extra ?? [])].map((q) => [...q, f ? fy[f] - 0.2 : -0.5, (r.tall ? K.R : top[f]) - 0.2]), atmo: 'interior', room: r.room }))
  );
  // el cadalso, por fuera (antes que la terraza)
  const C = ARMAS.cadalso;
  zones.push({
    id: 'homenaje_cadalso',
    rects: [
      [C.x0, K.z0 - C.w, K.x1 + C.w, K.z0, K.F1 - 0.6, K.F1 + 3],
      [K.x1, K.z0, K.x1 + C.w, C.z1, K.F1 - 0.6, K.F1 + 3],
    ],
    atmo: 'ramparts',
  });
  zones.push({ id: 'homenaje_terraza', rects: [[K.x0, K.z0, K.x1, K.z1 + 0.8, K.R - 0.3, K.R + 10]], atmo: 'ramparts' });
  return zones;
}

// ======================================================================== la torre
export function buildTorre(ctx, S, L) {
  const wb = ctx.wb;
  const { K, ix0, ix1, iz0, iz1, s0, s1 } = torreDims();
  const { x0, z0, x1, z1, F1, F2, F3, R } = K;
  const SL = K.slab;
  const DR = CASTLE.door,
    PO = CASTLE.postern;
  const dx0 = DR.x - DR.w / 2,
    dx1 = DR.x + DR.w / 2;
  const KR = torreRooms();
  const floorY = [0, F1, F2, F3],
    ceilY = [F1 - SL, F2 - SL, F3 - SL, R - SL];
  const tints = [
    [0.62, 0.6, 0.57],
    [0.74, 0.72, 0.68],
    [0.78, 0.75, 0.7],
    [0.74, 0.72, 0.68],
  ];

  // --- a ras de suelo: maciza salvo las estancias de abajo; y el paso de la
  // puerta de arriba (la colisión de lo no transitable sube hasta 5,2 m)
  S.paint(x0, z0, x1, z1, 0);
  W(S, ix0, iz0, ix1, iz1);
  W(S, dx0, iz1, dx1, z1);
  // (y los de la planta de armas: la saetera del pañol y la ventana del taller)
  W(S, ARMAS.saetera.x - ARMAS.saetera.w / 2 - 0.25, z0 - 0.1, ARMAS.saetera.x + ARMAS.saetera.w / 2 + 0.25, iz0 + 0.1);
  W(S, ix1 - 0.1, ARMAS.ventana.z - ARMAS.ventana.w / 2 - 0.25, x1 + 0.1, ARMAS.ventana.z + ARMAS.ventana.w / 2 + 0.25);

  // --- muros de fuera (la puerta del puente al sur, la poterna al este)
  const SA = ARMAS.saetera,
    VE = ARMAS.ventana;
  holedWall(ctx, 'wallstone', 'x', x0, x1, z0, iz0, 0, R, [{ a0: SA.x - SA.w / 2, a1: SA.x + SA.w / 2, y0: F1, y1: F1 + SA.h }], 'nwe');
  holedWall(ctx, 'wallstone', 'x', x0, x1, iz1, z1, 0, R, [{ a0: dx0, a1: dx1, y0: F1, y1: F1 + DR.h }], 'swe');
  holedWall(ctx, 'wallstone', 'z', iz0, iz1, x0, ix0, 0, R, [], 'w');
  holedWall(
    ctx,
    'wallstone',
    'z',
    iz0,
    iz1,
    ix1,
    x1,
    0,
    R,
    [
      { a0: VE.z - VE.w / 2, a1: VE.z + VE.w / 2, y0: F1, y1: F1 + VE.h },
      { a0: PO.z0, a1: PO.z1, y0: F2, y1: F2 + PO.h },
    ],
    'e'
  );
  // (la jamba norte de la poterna es el muro norte de la sala)
  wb.box('wallstone', ix1, F2, iz0, x1, F2 + PO.h, iz0 + 0.01, { faces: 's', sub: 2 });
  exterior(ctx, K, DR);

  // --- las caras de dentro de los muros de fuera, estancia a estancia
  for (let f = 0; f < 4; f++)
    for (const r of KR[f]) {
      const h = (r.tall ? R - SL : ceilY[f]) - floorY[f];
      for (const w of r.walls)
        interiorRoom(ctx, w.r[0], w.r[1], w.r[2], w.r[3], floorY[f], h, {
          wall: 'wallstone',
          t: 0.15,
          room: r.room,
          floor: false,
          ceil: false,
          beams: false,
          skirting: false,
          tint: tints[f],
          skip: ['n', 's', 'e', 'w'].filter((sd) => !w.sides.includes(sd)),
          doors: w.doors,
        });
    }

  // --- el muro de carga y los tabiques, con sus puertas de arco
  const door = (c, w = 1.3, h = 2.05) => ({ c, w, h, rise: w / 2, ring: 0.25 });
  const wall = (o) => {
    archedWall(ctx, { mat: 'wallstone', tint: tints[o.f], ...o });
    // el umbral de cada puerta, en el grueso del muro (si no, en el hueco no
    // se veía suelo); el arco de la sala, no: lo pisa el suelo de la sala
    if (o.sill === false) return;
    for (const d of o.openings ?? []) {
      const a = d.c - d.w / 2,
        b = d.c + d.w / 2;
      const oo = { faces: 't', ao: false, uv: 0.7, room: o.rooms[0], tint: [0.7, 0.68, 0.64] };
      if (o.axis === 'z') wb.box('ashlar', o.t0, o.y0 - 0.05, a, o.t1, o.y0, b, oo);
      else wb.box('ashlar', a, o.y0 - 0.05, o.t0, b, o.y0, o.t1, oo);
    }
  };
  const zc = (f) => (CROSS[f][0] + CROSS[f][1]) / 2;
  // planta baja
  wall({ f: 0, axis: 'z', a0: iz0, a1: zc(0), t0: s0, t1: s1, y0: 0, y1: ceilY[0], rooms: ['homenaje0n', 'homenaje0b'], openings: [door(-20.6)] });
  wall({ f: 0, axis: 'z', a0: zc(0), a1: iz1, t0: s0, t1: s1, y0: 0, y1: ceilY[0], rooms: ['homenaje0', 'homenaje0p'], openings: [door(-10.0)] });
  wall({ f: 0, axis: 'x', a0: ix0, a1: s0, t0: CROSS[0][0], t1: CROSS[0][1], y0: 0, y1: ceilY[0], rooms: ['homenaje0n', 'homenaje0'], openings: [door(-89.5)] });
  wall({ f: 0, axis: 'x', a0: s1, a1: ix1, t0: CROSS[0][0], t1: CROSS[0][1], y0: 0, y1: ceilY[0], rooms: ['homenaje0b', 'homenaje0p'], openings: [door(-78.5)] });
  // primera
  // (entre la armería y el taller, tapiado: no hay paso)
  wall({ f: 1, axis: 'z', a0: iz0, a1: ARMAS.panol.z1 + 0.2, t0: s0, t1: s1, y0: F1, y1: ceilY[1], rooms: ['homenaje1a', 'homenaje1q'] });
  wall({ f: 1, axis: 'z', a0: ARMAS.panol.z1 + 0.2, a1: zc(1), t0: s0, t1: s1, y0: F1, y1: ceilY[1], rooms: ['homenaje1a', 'homenaje1t'] });
  wall({ f: 1, axis: 'z', a0: zc(1), a1: iz1, t0: s0, t1: s1, y0: F1, y1: ceilY[1], rooms: ['homenaje1p', 'homenaje1'], openings: [door(-12.6)] });
  wall({ f: 1, axis: 'x', a0: ix0, a1: s0, t0: CROSS[1][0], t1: CROSS[1][1], y0: F1, y1: ceilY[1], rooms: ['homenaje1a', 'homenaje1p'], openings: [door(-89.5)] });
  wall({ f: 1, axis: 'x', a0: s1, a1: ix1, t0: CROSS[1][0], t1: CROSS[1][1], y0: F1, y1: ceilY[1], rooms: ['homenaje1t', 'homenaje1'], openings: [door(ARMAS.escombro), door(ARMAS.tabique)], sill: false });
  // el pañol, tabicado en su esquina (sin puerta: sólo el montacargas y la
  // saetera)
  {
    const A = ARMAS.panol;
    wall({ f: 1, axis: 'x', a0: s1, a1: A.xw, t0: A.z1, t1: A.zw, y0: F1, y1: ceilY[1], rooms: ['homenaje1q', 'homenaje1t'] });
    wall({ f: 1, axis: 'z', a0: iz0, a1: A.z1, t0: A.x1, t1: A.xw, y0: F1, y1: ceilY[1], rooms: ['homenaje1q', 'homenaje1t'] });
  }
  // segunda: el muro de carga sube entero hasta la terraza (la sala es de
  // doble altura); al oeste, el escritorio y la alcoba, y encima la cámara
  wall({ f: 2, axis: 'z', a0: iz0, a1: zc(2), t0: s0, t1: s1, y0: F2, y1: F3, rooms: ['homenaje2c', 'homenaje2'] });
  wall({ f: 2, axis: 'z', a0: zc(2), a1: iz1, t0: s0, t1: s1, y0: F2, y1: F3, rooms: ['homenaje2e', 'homenaje2'], openings: [door(-8.0)] });
  wall({ f: 2, axis: 'x', a0: ix0, a1: s0, t0: CROSS[2][0], t1: CROSS[2][1], y0: F2, y1: ceilY[2], rooms: ['homenaje2c', 'homenaje2e'], openings: [door(-89.5)] });
  wall({ f: 3, axis: 'z', a0: iz0, a1: iz1, t0: s0, t1: s1, y0: F3, y1: R - SL, rooms: ['homenaje3', 'homenaje2'], openings: [door(-20.5, 1.2, 2.1)] });
  // el arco diafragma de la sala: de pilar a pilar, casi de muro a muro
  wall({
    f: 2,
    axis: 'x',
    a0: s1,
    a1: ix1,
    t0: ARCH.z0,
    t1: ARCH.z1,
    y0: F2,
    y1: R - SL,
    rooms: ['homenaje2', 'homenaje2'],
    openings: [{ c: (s1 + ix1) / 2, w: ARCH.w, h: ARCH.spring - F2, rise: ARCH.rise, ring: 0.45 }],
    sill: false,
  });
  // sus impostas, en el arranque
  for (const x of [s1, ix1 - (ix1 - s1 - ARCH.w) / 2])
    wb.box('ashlar', x - 0.04, ARCH.spring - 0.22, ARCH.z0 - 0.08, x + (ix1 - s1 - ARCH.w) / 2 + 0.04, ARCH.spring, ARCH.z1 + 0.08, { ao: false, room: 'homenaje2', faces: 'tnsewb' });

  // --- los forjados: tablas sobre viguetas, con sus huecos de escalera
  const roomAt = (f, x, z) => (KR[f].find((r) => r.rects.some((q) => x >= q[0] - 0.01 && x <= q[2] + 0.01 && z >= q[1] - 0.01 && z <= q[3] + 0.01)) || KR[f][0]).room;
  const hole = (h) => [h[0] ?? ix0, h[1] ?? iz0, h[2] ?? ix1, h[3] ?? iz1];
  const H12 = hole(ST.s12.hole),
    H23 = hole(ST.s23.hole),
    H3R = hole(ST.s3R.hole);
  for (const r of KR[0]) for (const q of r.rects) for (const m of subtractRects(q, [BAJADA.hole])) wb.box('flag', m[0], -0.1, m[1], m[2], 0, m[3], { faces: 't', ao: false, uv: 0.7, room: r.room, tint: [0.78, 0.76, 0.72] });
  // (f: la planta de debajo; area: lo que cubre; above: las estancias de
  // encima; joists: viguetas)
  const slab = (f, area, holes, above) => {
    const yTop = floorY[f + 1];
    for (const r of above) for (const q of r.rects) for (const m of subtractRects(q, holes)) wb.box('planks', m[0], yTop - 0.05, m[1], m[2], yTop, m[3], { faces: 't', ao: false, uv: 0.7, room: r.room });
    for (const r of KR[f]) if (!r.tall) for (const q of r.rects) for (const m of subtractRects(q, holes)) wb.box('wooddark', m[0], yTop - SL, m[1], m[2], yTop - SL + 0.02, m[3], { faces: 'b', ao: false, room: r.room, tint: [0.62, 0.56, 0.5] });
    for (const m of subtractRects(area, holes)) ctx.col.add(m[0], yTop - SL, m[1], m[2], yTop, m[3]).cam = true;
    // el canto en los huecos
    for (const h of holes) {
      const room = roomAt(f, (h[0] + h[2]) / 2, (h[1] + h[3]) / 2);
      if (h[0] > area[0] + 0.01) wb.box('wooddark', h[0] - 0.02, yTop - SL, h[1], h[0], yTop, h[3], { faces: 'e', ao: false, room });
      if (h[2] < area[2] - 0.01) wb.box('wooddark', h[2], yTop - SL, h[1], h[2] + 0.02, yTop, h[3], { faces: 'w', ao: false, room });
      if (h[1] > area[1] + 0.01) wb.box('wooddark', h[0], yTop - SL, h[1] - 0.02, h[2], yTop, h[1], { faces: 's', ao: false, room });
      if (h[3] < area[3] - 0.01) wb.box('wooddark', h[0], yTop - SL, h[3], h[2], yTop, h[3] + 0.02, { faces: 'n', ao: false, room });
    }
    // viguetas (a lo largo de x, cada metro y medio), estancia a estancia
    const yb = yTop - SL;
    for (const r of KR[f]) {
      if (r.tall) continue;
      for (const q of r.rects)
        for (let z = q[1] + 0.8; z < q[3] - 0.4; z += 1.45) {
          const cuts = holes.filter((h) => z > h[1] - 0.15 && z < h[3] + 0.15).map((h) => [h[0] - 0.1, z - 1, h[2] + 0.1, z + 1]);
          const segs = subtractRects([q[0], z - 0.1, q[2], z + 0.1], cuts);
          for (const sg of segs) if (sg[2] - sg[0] > 0.05) wb.box('wooddark', sg[0], yb - 0.2, sg[1], sg[2], yb, sg[3], { ao: false, faces: 'nsewb', room: r.room });
        }
    }
  };
  slab(0, [ix0, iz0, ix1, iz1], [ARMAS.holeArm, ARMAS.holeTaller, ARMAS.holeHoist], KR[1]);
  slab(1, [ix0, iz0, ix1, iz1], [H12], KR[2]);
  slab(2, [ix0, iz0, s0, iz1], [H23], KR[3]);
  // la terraza: losas sobre toda la torre (muros incluidos)
  for (const r of subtractRects([x0, z0, x1, z1], [H3R])) {
    wb.box('flag', r[0], R - 0.05, r[1], r[2], R, r[3], { faces: 't', ao: false, uv: 0.8 });
    const c = [Math.max(r[0], ix0), Math.max(r[1], iz0), Math.min(r[2], ix1), Math.min(r[3], iz1)];
    if (c[2] > c[0] && c[3] > c[1]) ctx.col.add(c[0], R - SL, c[1], c[2], R, c[3]).cam = true;
  }
  for (const room of ['homenaje2', 'homenaje3'])
    for (const r of KR[room === 'homenaje2' ? 2 : 3].filter((q) => q.room === room))
      for (const q of r.rects) for (const m of subtractRects(q, [H3R])) wb.box('wooddark', m[0], R - SL, m[1], m[2], R - SL + 0.02, m[3], { faces: 'b', ao: false, room, tint: [0.6, 0.54, 0.48] });
  wb.box('wooddark', H3R[0], R - SL, H3R[3], H3R[2], R, H3R[3] + 0.02, { faces: 'n', ao: false, room: 'homenaje3' });
  wb.box('wooddark', H3R[2], R - SL, H3R[1], H3R[2] + 0.02, R, H3R[3], { faces: 'w', ao: false, room: 'homenaje3' });
  wb.box('wooddark', H3R[0] - 0.02, R - SL, H3R[1], H3R[0], R, H3R[3], { faces: 'e', ao: false, room: 'homenaje3' });
  // las vigas de la sala, gruesas, de muro a muro (y las de la cámara)
  for (let z = iz0 + 1.0; z < iz1 - 0.5; z += 1.9) {
    if (Math.abs(z - (ARCH.z0 + ARCH.z1) / 2) < 0.6) continue;
    wb.box('timber', s1, R - SL - 0.42, z - 0.17, ix1, R - SL, z + 0.17, { ao: false, faces: 'nsewb', room: 'homenaje2' });
  }
  for (let z = iz0 + 0.9; z < iz1 - 0.4; z += 1.45) {
    if (z > H3R[1] - 0.15 && z < H3R[3] + 0.15) continue;
    wb.box('wooddark', ix0, R - SL - 0.2, z - 0.1, s0, R - SL, z + 0.1, { ao: false, faces: 'nsewb', room: 'homenaje3' });
  }

  // --- la galería de la sala: un suelo de tablas sobre canes, a lo largo
  // del muro de carga y del muro norte, con su barandilla
  {
    const room = 'homenaje2';
    const y = F3;
    const ga = [s1, iz0, s1 + GAL, ARCH.z0 - 0.4],
      gb = [s1 + GAL, iz0, ix1, iz0 + GAL];
    for (const g of [ga, gb]) {
      wb.box('planks', g[0], y - 0.05, g[1], g[2], y, g[3], { faces: 't', ao: false, uv: 0.7, room });
      wb.box('wooddark', g[0], y - 0.35, g[1], g[2], y - 0.05, g[3], { faces: 'b', ao: false, room, tint: [0.6, 0.54, 0.48] });
      ctx.col.add(g[0], y - 0.35, g[1], g[2], y, g[3]).cam = true;
    }
    // los cantos que dan a la sala
    wb.box('wooddark', ga[2], y - 0.35, ga[1] + GAL, ga[2] + 0.02, y, ga[3], { faces: 'e', ao: false, room });
    wb.box('wooddark', ga[0], y - 0.35, ga[3], ga[2], y, ga[3] + 0.02, { faces: 's', ao: false, room });
    wb.box('wooddark', gb[0], y - 0.35, gb[3], gb[2], y, gb[3] + 0.02, { faces: 's', ao: false, room });
    // los canes, empotrados en el muro
    for (let z = ga[1] + GAL + 0.6; z < ga[3]; z += 1.8) beam3(ctx, 'timber', V(s1, y - 1.3, z), V(ga[2] - 0.08, y - 0.36, z), 0.16, { room });
    for (let x = gb[0] + 0.6; x < gb[2]; x += 1.8) beam3(ctx, 'timber', V(x, y - 1.3, iz0), V(x, y - 0.36, gb[3] - 0.08), 0.16, { room });
    // la barandilla: pies derechos y pasamanos
    const rail = (ax, a, b, c) => {
      // (ax: 'z' corre a lo largo de z en x = c; 'x', a lo largo de x en z = c)
      for (let u = a + 0.15; u < b; u += 0.85) {
        if (ax === 'z') wb.box('wooddark', c - 0.05, y, u - 0.05, c + 0.05, y + 0.98, u + 0.05, { ao: false, room });
        else wb.box('wooddark', u - 0.05, y, c - 0.05, u + 0.05, y + 0.98, c + 0.05, { ao: false, room });
      }
      if (ax === 'z') {
        wb.box('wooddark', c - 0.07, y + 0.94, a, c + 0.07, y + 1.04, b, { ao: false, faces: 'tnsewb', room });
        ctx.col.add(c - 0.08, y, a, c + 0.08, y + 1.05, b);
      } else {
        wb.box('wooddark', a, y + 0.93, c - 0.07, b, y + 1.03, c + 0.07, { ao: false, faces: 'tnsewb', room });
        ctx.col.add(a, y, c - 0.08, b, y + 1.05, c + 0.08);
      }
    };
    rail('z', gb[3] - 0.05, ga[3], ga[2] - 0.08);
    rail('x', ga[0], ga[2], ga[3] - 0.08);
    rail('x', gb[0] - 0.05, gb[2], gb[3] - 0.08);
  }

  // --- las escaleras: de la primera a la segunda, de piedra contra el muro
  // este del cuerpo de guardia; de la segunda a la tercera, contra el muro
  // sur del escritorio; de la tercera a la terraza, contra el muro norte de
  // la cámara alta. Cada una con su pretil por el lado abierto.
  const rise12 = (F2 - F1) / ST.s12.n,
    rise23 = (F3 - F2) / ST.s23.n,
    rise3R = (R - F3) / ST.s3R.n;
  wb.setRoom('homenaje1');
  stairs(ctx, ST.s12.x, F1, ST.s12.z, 'n', ST.s12.w, ST.s12.n, rise12, 0.42, 'wallstone', { solidBelow: true });
  wb.setRoom('homenaje2e');
  stairs(ctx, ST.s23.x, F2, ST.s23.z, 'w', ST.s23.w, ST.s23.n, rise23, 0.42, 'wallstone', { solidBelow: true });
  wb.setRoom('homenaje3');
  stairs(ctx, ST.s3R.x, F3, ST.s3R.z, 'w', ST.s3R.w, ST.s3R.n, rise3R, 0.42, 'wallstone', { solidBelow: true });
  wb.setRoom(null);
  // (el pretil, escalón a escalón, del lado de la estancia)
  const stairWall = (st, y, rise, zSide, room, upTo) => {
    for (let i = 0; i < st.n; i++) {
      const xr = st.x - 0.42 * i,
        xa = xr - 0.42;
      const top = Math.min(y + rise * (i + 1) + 0.95, upTo);
      solid(ctx, 'wallstone', xa, y, zSide[0], xr, top, zSide[1], { sub: 2, ao: false, faces: 'tnsew', room, tint: [0.76, 0.73, 0.68] });
    }
  };
  stairWall(ST.s23, F2, rise23, [ST.s23.z - ST.s23.w / 2 - 0.25, ST.s23.z - ST.s23.w / 2], 'homenaje2e', F3 - SL);
  stairWall(ST.s3R, F3, rise3R, [ST.s3R.z + ST.s3R.w / 2, ST.s3R.z + ST.s3R.w / 2 + 0.25], 'homenaje3', R - SL);
  // barandillas alrededor de los huecos, arriba (por donde no se sale)
  const railBox = (a, b, c, d, y, room) => {
    wb.box('wooddark', a, y + 0.92, b, c, y + 1.0, d, { ao: false, faces: 'tnsewb', room });
    const lx = c - a > d - b;
    for (let u = (lx ? a : b) + 0.4; u < (lx ? c : d); u += 0.8) {
      if (lx) wb.box('wooddark', u - 0.05, y, b, u + 0.05, y + 0.92, d, { ao: false, room });
      else wb.box('wooddark', a, y, u - 0.05, c, y + 0.92, u + 0.05, { ao: false, room });
    }
    ctx.col.add(a, y, b, c, y + 1.0, d);
  };
  railBox(H12[0] - 0.1, H12[1], H12[0], H12[3], F2, 'homenaje2');
  railBox(H12[0] - 0.1, H12[3], ix1, H12[3] + 0.1, F2, 'homenaje2');
  railBox(H23[0] + 0.8, H23[1] - 0.1, H23[2], H23[1], F3, 'homenaje3');
  railBox(H23[2], H23[1] - 0.1, H23[2] + 0.1, H23[3], F3, 'homenaje3');

  // --- lo alto: la terraza
  terrace(ctx, K, H3R, DR);

  // --- el antecuerpo: el rellano, la escalera exenta, el foso y el puente
  forebuilding(ctx, S, L, K, DR);

  // --- lo de dentro, estancia a estancia
  furnish(ctx, L, K, { ix0, ix1, iz0, iz1, s0, s1 });
  // --- la planta de armas: el recorrido hasta la ballesta (§4.2)
  armas(ctx, S, L, K, { ix0, ix1, iz0, iz1, s0, s1 });
  // --- la bajada tapiada a las celdas (§4.3)
  bajada(ctx, S, L, K, { ix0, ix1, iz0, iz1, s0, s1 });
}

// ------------------------------------------------------------------------ por fuera
// Pilastras en las esquinas y en medio de los lienzos, el zócalo en dos
// escalones, una imposta en cada planta, saeteras, las ventanas de la sala
// y de la cámara alta, y los estandartes (el del Rey, al sur).
function exterior(ctx, K, DR) {
  const wb = ctx.wb;
  const { x0, z0, x1, z1, F1, F2, F3, R } = K;
  // (el antecuerpo tapa la cara sur hasta F1 + 1: ahí, ni zócalo ni pilastras)
  const fbTop = F1 + 1.0;
  const pil = (face, at, w, yb) => {
    const p = 0.32;
    if (face === 'n') solid(ctx, 'wallstone', at - w / 2, yb, z0 - p, at + w / 2, R - 0.6, z0, { sub: 2.2, aoH: 1.5, faces: 'nwe' + (yb > 0 ? 'b' : '') });
    if (face === 's') solid(ctx, 'wallstone', at - w / 2, yb, z1, at + w / 2, R - 0.6, z1 + p, { sub: 2.2, aoH: 1.5, faces: 'swe' + (yb > 0 ? 'b' : '') });
    if (face === 'w') solid(ctx, 'wallstone', x0 - p, yb, at - w / 2, x0, R - 0.6, at + w / 2, { sub: 2.2, aoH: 1.5, faces: 'wns' + (yb > 0 ? 'b' : '') });
    if (face === 'e') solid(ctx, 'wallstone', x1, yb, at - w / 2, x1 + p, R - 0.6, at + w / 2, { sub: 2.2, aoH: 1.5, faces: 'ens' + (yb > 0 ? 'b' : '') });
  };
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  for (const f of ['n', 'w', 'e']) {
    const [a, b] = f === 'n' ? [x0, x1] : [z0, z1];
    pil(f, a + 1.0, 2.0, 1.2);
    pil(f, b - 1.0, 2.0, 1.2);
    pil(f, f === 'n' ? cx : cz, 1.4, 1.2);
  }
  pil('s', x0 + 1.0, 2.0, fbTop);
  pil('s', x1 - 1.0, 2.0, fbTop);
  // (la del medio de la cara sur, junto al matacán, no: el balcón va ahí)
  // el zócalo, en dos escalones (norte, oeste y este)
  for (const [a, y0, b] of [
    [0.45, 0, 0.7],
    [0.22, 0.7, 1.2],
  ]) {
    solid(ctx, 'wallstone', x0 - a, y0, z0 - a, x1 + a, b, z0, { sub: 2, aoH: 1, faces: 'tnwe', tint: [0.86, 0.84, 0.8] });
    solid(ctx, 'wallstone', x0 - a, y0, z0, x0, b, z1, { sub: 2, aoH: 1, faces: 'tws', tint: [0.86, 0.84, 0.8] });
    // (al este, partido donde se apoya la escalera rota del adarve, que
    // sube pegada a la torre: level_castle.js)
    solid(ctx, 'wallstone', x1, y0, z0, x1 + a, b, -20.0, { sub: 2, aoH: 1, faces: 'tes', tint: [0.86, 0.84, 0.8] });
    solid(ctx, 'wallstone', x1, y0, -7.4, x1 + a, b, z1, { sub: 2, aoH: 1, faces: 'tens', tint: [0.86, 0.84, 0.8] });
  }
  // las impostas
  for (const y of [F1, F2, F3]) {
    const o = { ao: false, faces: 'tnsewb', tint: [0.7, 0.68, 0.64] };
    wb.box('ashlar', x0 - 0.12, y - 0.45, z0 - 0.12, x1 + 0.12, y - 0.27, z0, o);
    wb.box('ashlar', x0 - 0.12, y - 0.45, z0, x0, y - 0.27, z1, { ...o, faces: 'tbw' });
    wb.box('ashlar', x1, y - 0.45, z0, x1 + 0.12, y - 0.27, z1, { ...o, faces: 'tbe' });
    if (y > fbTop) wb.box('ashlar', x0 - 0.12, y - 0.45, z1, x1 + 0.12, y - 0.27, z1 + 0.12, o);
  }
  // saeteras, planta a planta
  for (const y of [1.7, F1 + 1.4, F2 + 1.6, F3 + 1.4]) {
    for (const x of [-92.4, -88.0, -78.9, -74.2]) slit(ctx, x, y, z0, 'n');
    for (const z of [-23.8, -19.2, -10.8, -6.6]) {
      slit(ctx, x0, y, z, 'w');
      if (!(y === F2 + 1.6 && z < -18)) slit(ctx, x1, y, z, 'e');
    }
    if (y > fbTop) for (const x of [-93.0, -86.2]) slit(ctx, x, y, z1, 's');
  }
  // las ventanas de la sala, geminadas y de medio punto, al sur, al norte y
  // al este (huecos negros con su marco de sillería y su parteluz)
  const win = (face, at, y0) => {
    const w = 1.5,
      h = 2.8;
    // (sin la cara de atrás, que queda dentro del muro)
    const back = { s: 'n', n: 's', e: 'w', w: 'e' }[face];
    const put = (a, b, c, d, e, f, mat, o = {}) => {
      o = { faces: 'tnsewb'.replace(back, ''), ...o };
      if (face === 's') wb.box(mat, a, c, z1 + e, b, d, z1 + f, o);
      if (face === 'n') wb.box(mat, a, c, z0 - f, b, d, z0 - e, o);
      if (face === 'e') wb.box(mat, x1 + e, c, a, x1 + f, d, b, o);
      if (face === 'w') wb.box(mat, x0 - f, c, a, x0 - e, d, b, o);
    };
    put(at - w / 2, at + w / 2, y0, y0 + h, 0.02, 0.03, 'black', { ao: false, grime: false });
    put(at - w / 2 - 0.18, at + w / 2 + 0.18, y0 - 0.16, y0, 0, 0.2, 'ashlar', { ao: false });
    put(at - 0.07, at + 0.07, y0, y0 + h - 0.1, 0.02, 0.12, 'ashlar', { ao: false });
    for (const s of [-1, 1]) put(at + s * (w / 2 + 0.09) - 0.09, at + s * (w / 2 + 0.09) + 0.09, y0, y0 + h + 0.2, 0, 0.14, 'ashlar', { ao: false });
    put(at - w / 2 - 0.21, at + w / 2 + 0.21, y0 + h, y0 + h + 0.36, 0, 0.16, 'ashlar', { ao: false });
  };
  for (const x of [-80.4, -76.4]) {
    win('s', x, F2 + 1.0);
    win('n', x, F2 + 1.0);
  }
  win('e', -13.6, F2 + 1.0);
  win('w', -22.0, F3 + 0.7);
  win('w', -13.4, F2 + 1.0);
  // los estandartes: el del Rey, al sur, bajo el matacán; los negros de la
  // guarnición, a los lados
  P.banner(ctx, -88.6, R - 1.4, z1 + 0.14, 0, 'bannerRey', 1.8, 5.2);
  P.banner(ctx, x1 + 0.14, R - 1.4, -21.4, Math.PI / 2, 'bannerBlack', 1.6, 4.8);
  P.banner(ctx, x0 - 0.14, R - 1.4, -9.6, -Math.PI / 2, 'bannerBlack', 1.6, 4.8);
}

// ------------------------------------------------------------------------ la terraza
// La caseta de la escalera (esquina noroeste), las cuatro torrecillas, el
// matacán sobre la puerta, la chimenea del hogar del escritorio, el fanal,
// el asta con el estandarte del Rey, la caldera de la pez y piedras para
// tirar.
function terrace(ctx, K, H3R, DR) {
  const wb = ctx.wb;
  const { x0, z0, x1, z1, R } = K;
  const PH = 1.0,
    TW = 3.0,
    TH = 3.6;
  const cs = { x0: -94.0, x1: -85.0, z1: -22.3, h: 2.9 };
  const mt = { x0: -84.4, x1: -79.6, z1: z1 + 0.8 };
  // cornisa (por fuera, salvo bajo el matacán)
  for (const [a, b, c, d] of [
    [x0 - 0.3, z0 - 0.3, x1 + 0.3, z0],
    [x0 - 0.3, z1, mt.x0, z1 + 0.3],
    [mt.x1, z1, x1 + 0.3, z1 + 0.3],
    [x0 - 0.3, z0, x0, z1],
    [x1, z0, x1 + 0.3, z1],
  ])
    wb.box('ashlar', a, R - 0.6, b, c, R, d, { ao: false, sub: 3, faces: 'tnsewb' });
  // el parapeto, entre las torrecillas, la caseta y el matacán
  const pw = (a, b, c, d) => {
    if (c - a < 0.05 || d - b < 0.05) return;
    solid(ctx, 'wallstone', a, R, b, c, R + PH, d, { sub: 2, ao: false, faces: 'nsew' });
    blocker(ctx, a, R, b, c, R + 2.4, d);
  };
  const mer = (a, b, c, d) => {
    if (Math.max(c - a, d - b) < 1.2) return;
    if (c - a > d - b) merlons(ctx, a, (b + d) / 2, c, (b + d) / 2, R + PH, { collide: false, t: 0.5 });
    else merlons(ctx, (a + c) / 2, b, (a + c) / 2, d, R + PH, { collide: false, t: 0.5 });
  };
  for (const r of [
    [cs.x1, z0, x1 - TW, z0 + 0.5],
    [x0 + TW, z1 - 0.5, mt.x0 + 0.5, z1],
    [mt.x1 - 0.5, z1 - 0.5, x1 - TW, z1],
    [x0, cs.z1, x0 + 0.5, z1 - TW],
    [x0, z0 + TW, x0 + 0.5, cs.z1],
    [x1 - 0.5, z0 + TW, x1, z1 - TW],
  ]) {
    pw(...r);
    mer(...r);
  }
  // las cuatro torrecillas de las esquinas: macizas, con su cornisa y almenas
  for (const [ax, az] of [
    [x0, z0],
    [x1 - TW, z0],
    [x0, z1 - TW],
    [x1 - TW, z1 - TW],
  ]) {
    solid(ctx, 'wallstone', ax, R, az, ax + TW, R + TH, az + TW, { sub: 2, aoH: 1.2, faces: 'nsew' });
    wb.box('ashlar', ax - 0.2, R + TH - 0.3, az - 0.2, ax + TW + 0.2, R + TH, az + TW + 0.2, { ao: false, faces: 'tnsewb', mats: { t: 'flag' } });
    merlons(ctx, ax - 0.2, az, ax + TW + 0.2, az, R + TH, { collide: false, t: 0.45, w: 0.7, gap: 0.5 });
    merlons(ctx, ax - 0.2, az + TW, ax + TW + 0.2, az + TW, R + TH, { collide: false, t: 0.45, w: 0.7, gap: 0.5 });
    merlons(ctx, ax, az + 0.25, ax, az + TW - 0.25, R + TH, { collide: false, t: 0.45, w: 0.7, gap: 0.5 });
    merlons(ctx, ax + TW, az + 0.25, ax + TW, az + TW - 0.25, R + TH, { collide: false, t: 0.45, w: 0.7, gap: 0.5 });
    for (const y of [R + 1.2]) {
      slit(ctx, ax + TW / 2, y, az, 'n', 0.9);
      slit(ctx, ax + TW / 2, y, az + TW, 's', 0.9);
    }
  }
  // el matacán: balcón de piedra sobre ménsulas encima de la puerta, con las
  // buhederas en el suelo (para tirar sobre el que suba al rellano)
  {
    wb.box('flag', mt.x0 + 0.5, R - 0.05, z1, mt.x1 - 0.5, R, mt.z1 - 0.5, { faces: 't', ao: false });
    ctx.col.add(mt.x0 + 0.5, R - 0.5, z1, mt.x1 - 0.5, R, mt.z1 - 0.5);
    solid(ctx, 'wallstone', mt.x0, R - 1.3, mt.z1 - 0.5, mt.x1, R + PH, mt.z1, { sub: 2, faces: 'tnsewb' });
    solid(ctx, 'wallstone', mt.x0, R - 1.3, z1, mt.x0 + 0.5, R + PH, mt.z1 - 0.5, { sub: 2, faces: 'tnswb' });
    solid(ctx, 'wallstone', mt.x1 - 0.5, R - 1.3, z1, mt.x1, R + PH, mt.z1 - 0.5, { sub: 2, faces: 'tnseb' });
    blocker(ctx, mt.x0, R, mt.z1 - 0.5, mt.x1, R + 2.4, mt.z1);
    merlons(ctx, mt.x0, mt.z1 - 0.25, mt.x1, mt.z1 - 0.25, R + PH, { collide: false, t: 0.5, w: 0.8, gap: 0.55 });
    wb.box('wallstone', mt.x0 + 0.5, R - 1.3, z1, mt.x1 - 0.5, R - 1.25, mt.z1 - 0.5, { faces: 'b', ao: false });
    for (const x of [-82.9, -82.0, -81.1]) wb.box('black', x - 0.2, R + 0.01, z1 + 0.05, x + 0.2, R + 0.012, mt.z1 - 0.55, { faces: 't', ao: false, grime: false });
    for (let x = mt.x0 + 0.3; x < mt.x1; x += 1.05) {
      wb.box('ashlar', x - 0.18, R - 1.9, mt.z1 - 0.6, x + 0.18, R - 1.3, mt.z1 - 0.05, { ao: false });
      wb.box('ashlar', x - 0.14, R - 2.4, z1, x + 0.14, R - 1.9, z1 + 0.35, { ao: false });
    }
  }
  // la caseta de la escalera, contra la torrecilla del noroeste
  {
    const top = R + cs.h;
    solid(ctx, 'wallstone', cs.x0, R, z0, cs.x1, top, z0 + 0.5, { sub: 2, faces: 'nsew' });
    solid(ctx, 'wallstone', cs.x0, R, z0 + 0.5, cs.x0 + 0.6, top, cs.z1, { sub: 2, faces: 'nsew' });
    solid(ctx, 'wallstone', cs.x1 - 0.5, R, z0 + 0.5, cs.x1, top, cs.z1, { sub: 2, faces: 'nsew' });
    holedWall(ctx, 'wallstone', 'x', cs.x0 + 0.6, cs.x1 - 0.5, cs.z1 - 0.5, cs.z1, R, top, [{ a0: -93.3, a1: -91.8, y0: R, y1: R + 2.3 }], 'ns', { sub: 2 });
    solidGableRoof(ctx, cs.x0, z0, cs.x1, cs.z1, top, top + 1.35, 'x', { overhang: 0.42, gableOverhang: 0.32, thick: 0.22, wallT: 0.5, room: 'homenaje3' });
    ctx.col.add(cs.x0, top, z0, cs.x1, top + 0.4, cs.z1).cam = true;
    // dentro: el pretil del hueco (salvo arriba, por donde se sale)
    wb.box('wooddark', H3R[0] + 0.85, R, H3R[3], H3R[2], R + 0.95, H3R[3] + 0.1, { ao: false });
    ctx.col.add(H3R[0] + 0.85, R, H3R[3], H3R[2], R + 1.0, H3R[3] + 0.12);
    wb.box('wooddark', H3R[2], R, H3R[1], H3R[2] + 0.1, R + 0.95, H3R[3] + 0.1, { ao: false });
    ctx.col.add(H3R[2], R, H3R[1], H3R[2] + 0.12, R + 1.0, H3R[3] + 0.12);
    P.wallTorch(ctx, cs.x1 - 0.5, R + 2.0, -23.6, 'w', { radius: 5 });
  }
  // la chimenea del hogar del escritorio, embebida en el muro oeste
  {
    const cz = -10.2,
      ct = R + 2.8;
    solid(ctx, 'wallstone', x0 - 0.12, R, cz - 0.62, x0 + 1.0, ct, cz + 0.62, { sub: 2, aoH: 1.2, faces: 'nsew' });
    wb.box('ashlar', x0 - 0.2, ct, cz - 0.72, x0 + 1.08, ct + 0.14, cz + 0.72, { ao: false, faces: 'nsewb' });
    for (const [a, b, c, d] of [
      [x0 - 0.2, cz - 0.72, x0 + 1.08, cz - 0.5],
      [x0 - 0.2, cz + 0.5, x0 + 1.08, cz + 0.72],
      [x0 - 0.2, cz - 0.5, x0 - 0.1, cz + 0.5],
      [x0 + 0.98, cz - 0.5, x0 + 1.08, cz + 0.5],
    ])
      wb.box('ashlar', a, ct + 0.14, b, c, ct + 0.14, d, { ao: false, faces: 't' });
    for (const [a, b] of [
      [cz - 0.72, cz - 0.5],
      [cz + 0.5, cz + 0.72],
    ])
      wb.box('wallstone', x0 - 0.2, ct + 0.14, a, x0 + 1.08, ct + 0.55, b, { ao: false, faces: 'nsewt' });
    wb.box('ashlar', x0 - 0.26, ct + 0.55, cz - 0.78, x0 + 1.14, ct + 0.68, cz + 0.78, { ao: false, faces: 'tnsewb' });
    wb.box('black', x0 - 0.1, ct + 0.14, cz - 0.5, x0 + 0.98, ct + 0.14, cz + 0.5, { ao: false, faces: 't', grime: false });
    if (ctx.fires) ctx.fires.push({ x: x0 + 0.44, y: ct + 0.4, z: cz, s: 0.8, smoke: true, light: false, embers: false, glow: false });
  }
  // el fanal de la torre, apagado (junto a la torrecilla del sudeste)
  {
    const bx = x1 - TW - 1.6,
      bz = z1 - TW - 1.6;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      wb.box('iron', bx + Math.cos(a) * 0.5 - 0.05, R, bz + Math.sin(a) * 0.5 - 0.05, bx + Math.cos(a) * 0.5 + 0.05, R + 1.3, bz + Math.sin(a) * 0.5 + 0.05, { ao: false });
    }
    wb.cylinder('iron', bx, R + 1.2, bz, 0.42, 0.72, 0.5, 8, { ao: false, capBot: true });
    wb.cylinder('black', bx, R + 1.66, bz, 0.68, 0.68, 0.02, 8, { ao: false, capTop: true, grime: false });
    ctx.col.add(bx - 0.75, R, bz - 0.75, bx + 0.75, R + 1.75, bz + 0.75);
    P.firewood(ctx, bx - 2.2, R, bz + 0.4, 0, 3);
  }
  // el asta con el estandarte del Rey (la cruz azul en campo blanco)
  {
    const fx = -76.6,
      fz = -22.4;
    wb.cylinder('wooddark', fx, R, fz, 0.13, 0.09, 8.5, 6, { ao: false });
    wb.cylinder('wallstone', fx, R, fz, 0.42, 0.5, 0.45, 8, { ao: false });
    ctx.col.add(fx - 0.45, R, fz - 0.45, fx + 0.45, R + 8.5, fz + 0.45);
    wb.cylinder('gold', fx, R + 8.5, fz, 0.12, 0.12, 0.12, 6, { ao: false, capTop: true });
    P.banner(ctx, fx, R + 8.1, fz + 0.14, 0, 'bannerRey', 2.0, 3.0);
  }
  // la caldera de la pez sobre su trébede, junto al matacán
  {
    const cx = -86.6,
      cz = z1 - 1.7;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      beam3(ctx, 'iron', V(cx + Math.cos(a) * 0.7, R, cz + Math.sin(a) * 0.7), V(cx, R + 1.4, cz), 0.06);
    }
    wb.cylinder('iron', cx, R + 0.45, cz, 0.42, 0.5, 0.55, 10, { ao: false, capBot: true });
    wb.cylinder('black', cx, R + 0.98, cz, 0.48, 0.48, 0.02, 10, { ao: false, capTop: true, grime: false });
    ctx.col.add(cx - 0.6, R, cz - 0.6, cx + 0.6, R + 1.1, cz + 0.6);
    P.firewood(ctx, cx - 0.1, R, cz, 0.4, 2);
  }
  // montones de piedras junto al parapeto
  const rr = new RNG(4451);
  for (const [px, pz] of [
    [x0 + 1.5, -18.0],
    [x0 + 1.5, -13.0],
    [x1 - 1.5, -17.5],
    [x1 - 1.5, -11.0],
    [-80.0, z0 + 1.4],
  ]) {
    for (let k = 0; k < 7; k++) {
      const r = 0.18 + rr.range(0, 0.1);
      wb.geometry('wallstone', new THREE.SphereGeometry(1, 6, 5), new THREE.Matrix4().compose(V(px + rr.range(-0.45, 0.45), R + r * (k > 4 ? 2.4 : 0.9), pz + rr.range(-0.45, 0.45)), new THREE.Quaternion(), V(r, r * 0.85, r)), { ao: false });
    }
    ctx.col.add(px - 0.6, R, pz - 0.6, px + 0.6, R + 0.75, pz + 0.6);
  }
  // restos de la última defensa
  bakeCorpse(wb, -80.0, R, -10.0, 2.4, 'back', 'soldier', 34);
  P.decal(ctx, -80.0, R + 0.01, -10.0, 2.4);
  P.decal(ctx, -86.0, R + 0.01, -16.5, 3.2);
  P.dropped(ctx, -90.6, R, -7.2, 0.8, 'helmet');
  P.arrows(ctx, -84.0, R, -19.0, 10, 4452, 2.4);
  P.brazier(ctx, x0 + 1.2, R, z1 - TW - 1.0, {});
}

// ------------------------------------------------------------------------ el antecuerpo
// El rellano frente a la puerta, en un macizo de sillería que llega a la
// muralla oeste, a la torre de la cárcel y a la del homenaje; la escalera
// exenta que sube del patio; bajo el puente, el foso con sus estacas; y el
// puente levadizo, con su aviso.
function forebuilding(ctx, S, L, K, DR) {
  const wb = ctx.wb;
  const { z1, F1, t } = K;
  const iz1 = z1 - t;
  const LD = CASTLE.landing;
  const dx0 = DR.x - DR.w / 2,
    dx1 = DR.x + DR.w / 2;
  // dovelas alrededor del vano
  wb.box('ashlar', dx0 - 0.3, F1, z1, dx0, F1 + DR.h + 0.3, z1 + 0.1, { ao: false });
  wb.box('ashlar', dx1, F1, z1, dx1 + 0.3, F1 + DR.h + 0.3, z1 + 0.1, { ao: false });
  wb.box('ashlar', dx0 - 0.33, F1 + DR.h, z1, dx1 + 0.33, F1 + DR.h + 0.45, z1 + 0.12, { ao: false, faces: 'tnsewb' });
  // agujeros de las cadenas del puente
  for (const x of [DR.x - 1.15, DR.x + 1.15]) wb.box('black', x - 0.09, F1 + 3.72, z1 + 0.005, x + 0.09, F1 + 3.9, z1 + 0.01, { ao: false, grime: false });
  // el rellano: un macizo de piedra con su pretil
  solid(ctx, 'wallstone', LD.x0, 0, LD.z0, LD.x1, F1, LD.z1, { sub: 2.2, aoH: 2, faces: 'tnsew', mats: { t: 'flag' } });
  const bw = CASTLE.bridge.w;
  parapet(ctx, LD.x0, LD.z0, LD.x0 + 0.4, LD.z1, F1, 1.0);
  parapet(ctx, LD.x0 + 0.4, LD.z1 - 0.4, LD.x1, LD.z1, F1, 1.0);
  parapet(ctx, LD.x0 + 0.4, LD.z0, DR.x - bw / 2, LD.z0 + 0.4, F1, 1.0);
  parapet(ctx, DR.x + bw / 2, LD.z0, LD.x1, LD.z0 + 0.4, F1, 1.0);
  // la escalera: del patio (al este) al rellano, entre dos pretiles
  const n = 15,
    run = 0.5,
    rise = F1 / n;
  const xb = LD.x1 + n * run;
  stairs(ctx, xb, 0, (LD.z0 + 0.4 + LD.z1 - 0.4) / 2, 'w', LD.z1 - LD.z0 - 0.8, n, rise, run, 'wallstone', { solidBelow: true });
  for (let i = 0; i < n; i++) {
    const xa = xb - run * (i + 1),
      xr = xb - run * i;
    const y1 = rise * (i + 1) + 1.0;
    solid(ctx, 'wallstone', xa, 0, LD.z0, xr, y1, LD.z0 + 0.4, { sub: 2, ao: false, faces: 'tnsew' });
    solid(ctx, 'wallstone', xa, 0, LD.z1 - 0.4, xr, y1, LD.z1, { sub: 2, ao: false, faces: 'tnsew' });
  }
  P.brazier(ctx, LD.x0 + 1.0, F1, LD.z1 - 1.0, {});
  {
    const top = F1 + 1.0;
    const T = CASTLE.ptower;
    const fx0 = DR.x - bw / 2,
      fx1 = DR.x + bw / 2;
    const tint = [0.86, 0.84, 0.8];
    for (const [a, b, c, d] of [
      [CASTLE.yard.x0, z1, LD.x0, T.z0],
      [LD.x0, z1, fx0, LD.z0],
      [LD.x0, LD.z1, T.x1, T.z0],
      [fx1, z1, LD.x1, LD.z0],
    ]) {
      solid(ctx, 'wallstone', a, 0, b, c, top, d, { sub: 2.2, aoH: 2.5, faces: 'nsewt', tint, mats: { t: 'flag' } });
      wb.box('ashlar', a, top, b, c, top + 0.1, d, { ao: false, faces: 'tnsew', tint: [0.72, 0.7, 0.66] });
      S.paint(a, b, c, d, 0);
    }
    const xa = LD.x1,
      xbF = LD.x1 + n * run;
    wb.quad('wallstone', V(xbF, 1.0, LD.z0), V(xbF, 1.0, z1), V(xa, top, z1), V(xa, top, LD.z0), { ao: false, sub: 2.2, tint });
    wb.box('wallstone', xbF - 0.01, 0, z1, xbF, 1.0, LD.z0, { faces: 'e', sub: 2.2, aoH: 1, tint });
    for (let i = 0; i < n; i++) ctx.col.add(xbF - run * (i + 1), 0, z1, xbF - run * i, rise * (i + 1) + 1.0, LD.z0);
    const rr = new RNG(4425);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 3; j++) {
        const px = fx0 + 0.4 + i * 0.6 + rr.range(-0.1, 0.1),
          pz = z1 + 0.45 + j * 0.85 + rr.range(-0.12, 0.12);
        const tip = V(px + rr.range(-0.15, 0.15), rr.range(0.9, 1.25), pz + rr.range(-0.15, 0.15));
        beam3(ctx, 'timber', V(px, 0, pz), tip, 0.07);
        const dir = tip.clone().sub(V(px, 0, pz)).normalize();
        wb.geometry('timber', new THREE.ConeGeometry(0.05, 0.2, 4), new THREE.Matrix4().compose(tip.clone().addScaledVector(dir, 0.1), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir), V(1, 1, 1)), { ao: false });
      }
    P.rubble(ctx, DR.x, 0, z1 + 1.3, 6, 4426, 1.0, { mat: 'rock', scale: 0.8, blocks: 0.2 });
    bakeCorpse(wb, DR.x + 0.4, 0, z1 + 1.6, 1.9, 'curl', 'soldier', 26);
    P.decal(ctx, DR.x, 0.01, z1 + 1.4, 2.2);
    L.pits.push({ r: [fx0, z1, fx1, LD.z0], y0: -0.5, y1: 1.6, impale: true });
  }
  // el puente levadizo (lo baja el torno del cuerpo de guardia) y el aviso
  L.interact.push(
    {
      kind: 'bridge',
      id: 'b_homenaje',
      flag: 'puente:homenaje',
      x: WINCH.x,
      y: F1,
      z: iz1 - 2.3,
      r: 2.0,
      hinge: [DR.x, F1, z1],
      w: bw,
      len: LD.z0 - z1,
      anchors: [
        [DR.x - 1.15, F1 + 3.8, z1 + 0.02],
        [DR.x + 1.15, F1 + 3.8, z1 + 0.02],
      ],
    },
    { kind: 'examine', id: 'x_puente', text: 'puenteAlzado', x: DR.x, y: F1, z: LD.z0 + 0.9, r: 2.2, unless: 'puente:homenaje' }
  );
}

// el torno del puente: al este de la puerta, en el cuerpo de guardia
const WINCH = { x: -78.3, dz: 1.0 };

// ------------------------------------------------------------------------ lo de dentro
function furnish(ctx, L, K, d) {
  const wb = ctx.wb;
  const { ix0, ix1, iz0, iz1, s0, s1 } = d;
  const { F1, F2, F3, R } = K;
  const SL = K.slab;
  const DR = CASTLE.door;
  const HT = CASTLE.hatch;

  // --- planta baja: los víveres del asedio
  {
    const rr = new RNG(4421);
    // el almacén (suroeste): la escalera de mano de la trampilla, tinajas de
    // aceite, leña y sogas, y los quesos en su estante
    let room = 'homenaje0';
    wb.setRoom(room);
    P.ladder(ctx, HT.x - 0.62, 0, HT.z, F1 - SL - 0.05, Math.PI / 2, 0.1);
    wb.box('wooddark', HT.x - 0.62, F1 - SL - 0.04, HT.z - 0.62, HT.x + 0.62, F1 - SL, HT.z + 0.62, { ao: false, faces: 'b', room });
    for (const [x, z, sc] of [
      [-85.2, -14.0, 1.3],
      [-86.4, -14.2, 1.2],
      [-85.3, -12.8, 1.35],
      [-86.5, -12.9, 1.1],
    ])
      P.jar(ctx, x, 0, z, sc);
    P.firewood(ctx, -87.0, 0, -6.4, 0, 4);
    P.firewood(ctx, -85.4, 0, -6.4, 0, 3);
    for (const [x, z] of [
      [-91.6, -6.3],
      [-91.4, -7.4],
    ])
      for (let k = 0; k < 4; k++) wb.cylinder('rope', x, 0.02 + k * 0.07, z, 0.36 - k * 0.04, 0.36 - k * 0.04, 0.07, 10, { ao: false, room });
    P.shelf(ctx, -90.4, 0, iz1 - 0.25, Math.PI, 1.8);
    for (let k = 0; k < 5; k++) P.ellipsoid(ctx, k % 2 ? 'bone' : 'straw', -91.1 + k * 0.35, 1.12, iz1 - 0.3, 0.14, 0.08, 0.14, k % 2 ? [0.95, 0.85, 0.55] : [0.75, 0.5, 0.3], { room });
    P.lantern(ctx, s0, 2.3, -11.4, -Math.PI / 2, true, { room });
    P.wallTorch(ctx, ix0, 2.2, -10.0, 'e', { room, radius: 7 });
    // el granero (noroeste): el trigo en sacos, la muela de mano y los
    // tablones para remendar puertas y cadalsos
    room = 'homenaje0n';
    wb.setRoom(room);
    for (let x = -93.6; x < -86.5; x += 1.35) for (const z of [-25.5, -24.2]) P.sacks(ctx, x, 0, z, 5, Math.round(-x * 10 + z));
    for (const z of [-22.0, -20.7]) P.sacks(ctx, -93.6, 0, z, 4, Math.round(z * 7));
    {
      const qx = -88.4,
        qz = -20.6;
      wb.cylinder('wallstone', qx, 0, qz, 0.45, 0.45, 0.35, 10, { ao: false, room });
      wb.cylinder('ashlar', qx, 0.36, qz, 0.42, 0.42, 0.14, 10, { ao: false, room });
      beam3(ctx, 'wooddark', V(qx + 0.3, 0.5, qz), V(qx + 0.3, 0.85, qz), 0.05, { room });
      P.sacks(ctx, qx + 1.15, 0, qz + 0.5, 2, 4425);
      ctx.col.add(qx - 0.45, 0, qz - 0.45, qx + 0.45, 0.5, qz + 0.45);
    }
    for (let k = 0; k < 5; k++) wb.box('planks', -93.9, 0.02 + k * 0.08, -17.6 + (k % 2) * 0.08, -91.2, 0.09 + k * 0.08, -17.0 + (k % 2) * 0.08, { ao: false, room, tint: [0.75, 0.68, 0.6] });
    ctx.col.add(-93.9, 0, -17.6, -91.2, 0.5, -16.9);
    bakeCorpse(wb, -91.2, 0, -21.0, 1.0, 'curl', 'soldier', 31);
    P.decal(ctx, -91.2, 0.01, -21.0, 1.8);
    P.bones(ctx, -90.2, 0, -19.4, 5, 4423, 0.5);
    P.wallTorch(ctx, -90.0, 2.2, iz0, 's', { room, radius: 7 });
    // la bodega (nordeste): toneles de vino y de agua, barriles y tinajas
    room = 'homenaje0b';
    wb.setRoom(room);
    for (let z = -25.4; z < -17.5; z += 1.15) P.cask(ctx, -74.6, 0, z, Math.PI / 2, { r: 0.52 });
    for (const [x, z] of [
      [-77.6, -25.6],
      [-78.6, -25.7],
      [-79.6, -25.5],
      [-77.9, -24.6],
    ])
      P.barrel(ctx, x, 0, z, {});
    P.jar(ctx, -80.7, 0, -25.7, 1.25);
    P.jar(ctx, -81.0, 0, -24.8, 1.1, { lying: true, rot: 0.8 });
    P.hangingLamp(ctx, -78.6, F1 - SL, -21.4, { room, len: 0.9, radius: 7 });
    P.wallTorch(ctx, -81.6, 2.2, iz0, 's', { room, radius: 6 });
    // el pozo de la torre (sureste: baja al aljibe), la cecina colgada de las
    // viguetas, los virotes y el estante de las hogazas
    room = 'homenaje0p';
    wb.setRoom(room);
    {
      const px = -77.8,
        pz = -9.4;
      wb.cylinder('wallstone', px, 0, pz, 0.9, 0.9, 0.85, 12, { sub: 2, room });
      wb.cylinder('ashlar', px, 0.85, pz, 0.95, 0.95, 0.1, 12, { ao: false, room });
      wb.cylinder('black', px, 0.9, pz, 0.68, 0.68, 0.02, 12, { ao: false, capTop: true, grime: false, room });
      for (const sx of [-1, 1]) wb.box('wooddark', px + sx * 0.8 - 0.07, 0.95, pz - 0.07, px + sx * 0.8 + 0.07, 2.5, pz + 0.07, { ao: false, room });
      wb.box('wooddark', px - 0.95, 2.4, pz - 0.085, px + 0.95, 2.55, pz + 0.085, { ao: false, room });
      wb.box('burlap', px - 0.01, 1.3, pz - 0.01, px + 0.01, 2.4, pz + 0.01, { ao: false, room, tint: [0.8, 0.7, 0.55] });
      wb.cylinder('planks', px, 1.0, pz, 0.16, 0.19, 0.3, 8, { ao: false, capBot: true, room });
      ctx.col.add(px - 0.9, 0, pz - 0.9, px + 0.9, 1.0, pz + 0.9);
    }
    for (let x = -82.4; x < -79.4; x += 1.3) {
      const z = -12.3 + rr.range(-0.3, 0.3);
      wb.box('burlap', x - 0.01, 2.6, z - 0.01, x + 0.01, F1 - SL - 0.2, z + 0.01, { ao: false, room, tint: [0.7, 0.62, 0.5] });
      P.ellipsoid(ctx, 'flesh', x, 2.35, z, 0.18, 0.38, 0.12, [0.55, 0.36, 0.3], { room });
    }
    for (const [x, z] of [
      [-81.8, -6.3],
      [-80.4, -6.4],
    ]) {
      P.crate(ctx, x, 0, z, 0.8, 0.1);
      for (let k = 0; k < 14; k++) {
        const row = Math.floor(k / 7);
        wb.box('timber', x - 0.32 + (k % 7) * 0.1 + row * 0.05, 0.8 + row * 0.04, z - 0.25 + row * 0.12, x - 0.3 + (k % 7) * 0.1 + row * 0.05, 0.84 + row * 0.04, z + 0.25 + row * 0.12, { ao: false, room });
      }
    }
    P.shelf(ctx, -75.6, 0, iz1 - 0.25, Math.PI, 1.8);
    for (let k = 0; k < 5; k++) P.ellipsoid(ctx, k % 2 ? 'bone' : 'straw', -76.3 + k * 0.35, 1.12, iz1 - 0.3, 0.14, 0.08, 0.14, k % 2 ? [0.95, 0.85, 0.55] : [0.75, 0.5, 0.3], { room });
    P.wallTorch(ctx, ix1, 2.2, -12.6, 'w', { room, radius: 6 });
    ctx.rats.push({ x: -92.4, y: 0, z: -22.6, n: 3 }, { x: -78.0, y: 0, z: -21.0, n: 2 });
    wb.setRoom(null);
    L.interact.push({ kind: 'item', id: 'i_ampolla5', item: 'ampolla', x: -86.9, y: 0.95, z: -6.25 });
  }

  // --- el cuerpo de guardia (planta primera): la puerta del puente y su torno
  {
    const room = 'homenaje1';
    const y = F1;
    wb.setRoom(room);
    // el torno: un tambor entre dos caballetes; las cadenas suben por el
    // muro hasta encima del vano
    {
      const wx = WINCH.x,
        tz = iz1 - WINCH.dz;
      for (const s of [-1, 1]) {
        const x = wx + s * 1.75;
        beam3(ctx, 'wooddark', V(x, y, tz - 0.45), V(x, y + 1.25, tz), 0.16, { room });
        beam3(ctx, 'wooddark', V(x, y, tz + 0.45), V(x, y + 1.25, tz), 0.16, { room });
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + 0.4;
          beam3(ctx, 'wooddark', V(x + s * 0.18, y + 1.1, tz), V(x + s * 0.18, y + 1.1 + Math.cos(a) * 0.62, tz + Math.sin(a) * 0.62), 0.07, { room });
        }
      }
      wb.push();
      wb.translate(wx, y + 1.1, tz);
      wb.rotateZ(Math.PI / 2);
      wb.cylinder('wooddark', 0, -1.7, 0, 0.26, 0.26, 3.4, 10, { ao: false, capTop: true, capBot: true, room });
      for (const u of [-1.2, 1.2]) wb.cylinder('iron', 0, u - 0.18, 0, 0.3, 0.3, 0.36, 10, { ao: false, room });
      wb.pop();
      // las cadenas, del tambor a los agujeros de encima de la puerta
      for (const [xd, xh] of [
        [wx - 1.4, DR.x - 1.15],
        [wx - 0.9, DR.x + 1.15],
      ]) {
        const a = V(xd, y + 1.35, tz + 0.1),
          b = V(xh, y + 3.8, iz1 - 0.04);
        const n = 18;
        for (let k = 0; k < n; k++) {
          const p0 = a.clone().lerp(b, k / n),
            p1 = a.clone().lerp(b, (k + 0.8) / n);
          beam3(ctx, 'iron', p0, p1, 0.06, { room, d: k % 2 ? 0.02 : 0.06 });
        }
      }
      // el freno: una palanca de hierro
      beam3(ctx, 'iron', V(wx + 1.95, y, tz - 0.3), V(wx + 2.15, y + 1.05, tz - 0.55), 0.06, { room });
      ctx.col.add(wx - 1.95, y, tz - 0.5, wx + 1.95, y + 1.4, tz + 0.5);
    }
    // la mesa de la guardia (dados y escudillas), el banco, las lanzas a mano
    P.table(ctx, -80.6, y, -9.4, 1.8, 0.9, Math.PI / 2);
    P.bench(ctx, -81.5, y, -9.4, 1.6, Math.PI / 2);
    P.stool(ctx, -79.6, y, -10.0, { room });
    P.jar(ctx, -80.7, y + 0.82, -9.7, 0.55);
    P.candles(ctx, -80.5, y + 0.82, -9.0, 3, 4431, { room, radius: 5, intensity: 1.0, spread: 0.2 });
    P.weaponRack(ctx, -81.6, y, -14.3, 0);
    P.brazier(ctx, -76.8, y, -13.2, {});
    // caídos de la última guardia
    bakeCorpse(wb, -82.4, y, -7.0, 2.2, 'back', 'soldier', 32);
    P.decal(ctx, -82.4, y + 0.01, -7.0, 2.0);
    P.dropped(ctx, -79.2, y, -12.0, 1.4, 'shield');
    P.wallTorch(ctx, s1, y + 2.2, -9.6, 'e', { room, radius: 6, dyn: 2.2 });
    P.hangingLamp(ctx, -78.4, F2 - SL, -11.0, { room, len: 0.9, radius: 7.5 });
    wb.setRoom(null);
  }
  // el dormitorio de los ballesteros: jergones en el suelo y, en el rincón, la
  // trampilla del almacén con su polea (por ahí se suben los sacos)
  {
    const room = 'homenaje1p';
    const y = F1;
    wb.setRoom(room);
    wb.box('wooddark', HT.x - 0.62, y, HT.z - 0.62, HT.x + 0.62, y + 0.03, HT.z + 0.62, { ao: false, faces: 'tnsew', room });
    wb.box('timber', HT.x - 0.15, F2 - SL - 0.6, CROSS[1][1], HT.x + 0.15, F2 - SL - 0.3, HT.z + 0.4, { ao: false, faces: 'nsewb', room });
    wb.cylinder('wooddark', HT.x, F2 - SL - 0.95, HT.z, 0.18, 0.18, 0.3, 8, { ao: false, room });
    wb.box('burlap', HT.x - 0.01, y + 1.4, HT.z - 0.01, HT.x + 0.01, F2 - SL - 0.9, HT.z + 0.01, { ao: false, room, tint: [0.8, 0.7, 0.55] });
    const rr = new RNG(4433);
    for (const [x, z, r] of [
      [-93.6, -13.0, 0],
      [-93.6, -10.6, 0],
      [-93.6, -8.2, 0.05],
      [-91.4, -6.4, Math.PI / 2],
      [-89.0, -6.4, Math.PI / 2 + 0.06],
    ]) {
      wb.at(x, y, z, r, () => {
        wb.box('straw', -0.42, 0, -0.95, 0.42, 0.14, 0.95, { ao: false, faces: 'tnsew', room });
        if (rr.chance(0.75)) wb.box(rr.pick(['clothDark', 'burlap', 'leather']), -0.44, 0.14, -0.2 + rr.range(-0.2, 0.2), 0.44, 0.17, 0.85, { ao: false, faces: 'tnsew', room, tint: [0.8, 0.76, 0.7] });
        wb.box('burlap', -0.3, 0.14, -0.9, 0.3, 0.3, -0.62, { ao: false, room });
      });
    }
    P.sacks(ctx, -86.6, y, -13.8, 3, 4432);
    P.barrel(ctx, -85.2, y, -6.3, {});
    P.barrel(ctx, -86.2, y, -6.2, { lying: true, rot: 0.2 });
    for (let k = 0; k < 4; k++) wb.cylinder('rope', -91.6, y + 0.02 + k * 0.07, -12.4, 0.34 - k * 0.04, 0.34 - k * 0.04, 0.07, 10, { ao: false, room });
    P.wallTorch(ctx, ix0, y + 2.2, -11.8, 'e', { room, radius: 6 });
    wb.setRoom(null);
  }
  // la armería: lanzas, picas, yelmos y la cota del alcaide
  {
    const room = 'homenaje1a';
    const y = F1;
    wb.setRoom(room);
    for (const x of [-92.6, -90.6, -88.6]) P.weaponRack(ctx, x, y, iz0 + 0.32, 0);
    for (let k = 0; k < 9; k++) {
      const z = -25.6 + k * 0.42;
      beam3(ctx, 'timber', V(ix0 + 0.9, y, z), V(ix0 + 0.12, y + 3.6, z + 0.05), 0.05, { room });
      wb.box('iron', ix0 + 0.1, y + 3.55, z - 0.03, ix0 + 0.16, y + 3.85, z + 0.07, { ao: false, room });
    }
    ctx.col.add(ix0, y, -25.8, ix0 + 0.95, y + 1.6, -22.0);
    P.shelf(ctx, ix0 + 0.25, y, -19.6, Math.PI / 2, 1.8);
    P.armorStand(ctx, -91.0, y, -17.6, Math.PI / 2);
    for (const [x, z] of [
      [-86.4, -23.4],
      [-85.6, -22.2],
    ]) {
      P.barrel(ctx, x, y, z, {});
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        beam3(ctx, 'timber', V(x + Math.cos(a) * 0.18, y + 0.9, z + Math.sin(a) * 0.18), V(x + Math.cos(a) * 0.24, y + 1.35, z + Math.sin(a) * 0.24), 0.03, { room });
      }
    }
    P.dropped(ctx, -89.8, y, -19.0, 0.6, 'spear');
    P.wallTorch(ctx, -90.0, y + 2.2, iz0, 's', { room, radius: 7 });
    wb.setRoom(null);
  }
  // --- la sala del alcaide, a doble altura: la mesa del Rey bajo el arco,
  // la mesa del consejo con el plano de la defensa, el atril del libro de la
  // guarnición, las armas del alcaide, los estandartes y dos coronas de luz
  {
    const room = 'homenaje2';
    const y = F2;
    wb.setRoom(room);
    buildReyMesa(ctx, room);
    wb.setRoom(room);
    P.hangingLamp(ctx, REY_MESA.table.x, R - SL, REY_MESA.table.z, { room, len: R - SL - (F2 + 2.6), radius: 8 });
    P.candleCrown(ctx, -78.4, y + 4.4, -22.6, R - SL - 0.2, { room, r: 1.3, n: 10, radius: 11, intensity: 0.9 });
    P.candleCrown(ctx, -79.0, y + 4.4, -9.6, R - SL - 0.2, { room, r: 1.1, n: 8, radius: 10, intensity: 0.85 });
    // el atril del libro de la guarnición
    {
      const lx = -81.9,
        lz = -12.2;
      wb.box('wooddark', lx - 0.06, y, lz - 0.06, lx + 0.06, y + 1.0, lz + 0.06, { ao: false, room });
      wb.box('wooddark', lx - 0.3, y, lz - 0.2, lx + 0.3, y + 0.06, lz + 0.2, { ao: false, room });
      wb.at(lx, y + 1.0, lz, 0, () => {
        wb.push();
        wb.rotateX(-0.45);
        wb.box('wooddark', -0.3, 0, -0.22, 0.3, 0.05, 0.22, { ao: false, room });
        wb.box('clothWhite', -0.26, 0.05, -0.18, 0.26, 0.07, 0.18, { ao: false, faces: 't', tint: [0.88, 0.8, 0.6], room });
        wb.pop();
      });
      ctx.col.add(lx - 0.3, y, lz - 0.25, lx + 0.3, y + 1.1, lz + 0.25);
      L.interact.push({ kind: 'note', id: 'n_guarnicion', note: 'guarnicion', x: lx, y: y + 1.12, z: lz, model: 'paper' });
    }
    // la mesa del consejo, con el plano de la defensa: la ciudad dibujada
    // sobre un pergamino, con fichas (rojas los de fuera, blancas las
    // nuestras); estaba en la mesa del Rey, que la quiso para su juego
    {
      const mx = -79.2,
        mz = -8.6;
      P.table(ctx, mx, y, mz, 2.6, 1.1, 0);
      P.bench(ctx, mx, y, mz - 0.9, 2.4, 0);
      P.bench(ctx, mx, y, mz + 0.9, 2.4, Math.PI);
      wb.box('clothWhite', mx - 1.05, y + 0.8, mz - 0.42, mx + 1.05, y + 0.815, mz + 0.42, { ao: false, faces: 't', tint: [0.86, 0.76, 0.56], room });
      const r2 = new RNG(4441);
      for (const [a2, b2, c2, d2] of [
        [-0.95, -0.36, 0.95, -0.32],
        [-0.95, 0.32, 0.95, 0.36],
        [-0.95, -0.36, -0.91, 0.36],
        [0.91, -0.36, 0.95, 0.36],
        [-0.6, -0.06, 0.7, -0.03],
        [0.0, -0.36, 0.035, 0.36],
      ])
        wb.box('black', mx + a2, y + 0.816, mz + b2, mx + c2, y + 0.819, mz + d2, { ao: false, faces: 't', grime: false, room });
      for (let k = 0; k < 12; k++) {
        const ox = mx + r2.range(-0.85, 0.85),
          oz = mz + r2.range(-0.3, 0.3);
        wb.box(k < 7 ? 'clothRed' : 'bone', ox - 0.025, y + 0.816, oz - 0.025, ox + 0.025, y + 0.86, oz + 0.025, { ao: false, room });
      }
      P.jar(ctx, mx + 1.1, y + 0.8, mz + 0.3, 0.5);
    }
    // al norte, bajo la galería: los arcones del alcaide y su panoplia
    for (const [x, z] of [
      [-81.6, -25.6],
      [-79.6, -25.6],
    ]) {
      wb.box('wooddark', x - 0.6, y, z - 0.35, x + 0.6, y + 0.6, z + 0.35, { ao: false, room });
      wb.box('iron', x - 0.62, y + 0.28, z - 0.37, x + 0.62, y + 0.34, z + 0.37, { ao: false, room });
      ctx.col.add(x - 0.6, y, z - 0.35, x + 0.6, y + 0.6, z + 0.35);
    }
    P.weaponRack(ctx, -76.6, y, iz0 + 0.32, 0);
    P.armorStand(ctx, -74.4, y, -24.4, -Math.PI / 2);
    P.weaponRack(ctx, -77.8, y, iz1 - 0.3, Math.PI);
    P.banner(ctx, -78.4, y + 7.2, iz1 - 0.12, Math.PI, 'bannerRey', 2.2, 5.0);
    P.banner(ctx, ix1 - 0.12, y + 6.4, -11.8, -Math.PI / 2, 'bannerBlack', 1.6, 4.0);
    P.wallTorch(ctx, ix1, y + 2.3, -9.0, 'w', { room, radius: 6 });
    P.wallTorch(ctx, ix1, y + 2.3, -18.4, 'w', { room, radius: 6 });
    P.wallTorch(ctx, s1, y + 2.3, -23.0, 'e', { room, radius: 6 });
    P.wallTorch(ctx, s1, y + 2.3, -11.6, 'e', { room, radius: 6 });
    P.wallTorch(ctx, -76.0, F3 + 2.0, iz0, 's', { room, radius: 6 });
    wb.setRoom(null);
  }
  // el escritorio del alcaide: muerto sobre sus cuentas, con la chimenea
  // encendida, sus libros y su armadura
  {
    const room = 'homenaje2e';
    const y = F2;
    wb.setRoom(room);
    P.table(ctx, -88.6, y, -10.4, 1.6, 0.9, 0);
    bakeCorpse(wb, -88.9, y + 0.02, -11.3, 0, 'sit', 'soldier', 23);
    P.decal(ctx, -88.9, y + 0.01, -11.5, 1.4);
    P.candles(ctx, -87.9, y + 0.82, -10.2, 3, 5208, { room, radius: 5, intensity: 1.1, spread: 0.15 });
    P.hearth(ctx, ix0, y, -10.2, 'e', { room, lit: true, ceil: F3 - SL });
    P.armorStand(ctx, -93.6, y, -13.2, Math.PI / 2);
    P.shelf(ctx, s0 - 0.22, y, -12.2, -Math.PI / 2, 1.8);
    P.shelf(ctx, -92.2, y, CROSS[2][1] + 0.2, 0, 1.8);
    P.dropped(ctx, -86.0, y, -13.0, 2.6, 'sword');
    for (const [x, z, r] of [
      [-87.4, -12.4, 0.6],
      [-86.6, -9.0, 2.0],
      [-90.4, -8.8, 1.1],
    ])
      wb.at(x, y + 0.005, z, r, () => wb.box('clothWhite', -0.2, 0, -0.14, 0.2, 0.01, 0.14, { ao: false, faces: 't', tint: [0.88, 0.8, 0.62], room }));
    P.hangingLamp(ctx, -89.0, F3 - SL, -9.4, { room, len: 0.9, radius: 6 });
    wb.setRoom(null);
    L.interact.push(
      { kind: 'item', id: 'i_manivela', item: 'manivela', x: -88.2, y: y + 0.86, z: -10.35 },
      { kind: 'note', id: 'n_alcaide', note: 'alcaide', x: -88.9, y: y + 0.84, z: -10.2, model: 'paper' }
    );
  }
  // la alcoba del alcaide: la cama, el arcón de la paga bajo el tapiz de la
  // ciudad, un reclinatorio ante la cruz y la alfombra
  {
    const room = 'homenaje2c';
    const y = F2;
    wb.setRoom(room);
    wb.box('wooddark', -93.9, y, -21.4, -92.3, y + 0.62, -20.7, { ao: false, room });
    for (const x of [-93.6, -92.6]) wb.box('iron', x - 0.04, y, -21.42, x + 0.04, y + 0.64, -20.68, { ao: false, room });
    ctx.col.add(-93.9, y, -21.4, -92.3, y + 0.62, -20.7);
    wb.box('clothRed', -93.8, y + 1.2, iz0 + 0.02, -91.0, y + 3.4, iz0 + 0.05, { ao: false, faces: 's', tint: [0.7, 0.5, 0.45], room });
    wb.box('gold', -92.5, y + 2.1, iz0 + 0.05, -92.3, y + 2.6, iz0 + 0.06, { ao: false, faces: 's', room });
    P.bed(ctx, -93.85, y, -18.6, Math.PI / 2);
    wb.box('wooddark', -93.4, y, -17.1, -92.3, y + 0.55, -16.55, { ao: false, room });
    wb.box('iron', -93.42, y + 0.25, -17.12, -92.28, y + 0.31, -16.53, { ao: false, room });
    ctx.col.add(-93.4, y, -17.1, -92.3, y + 0.55, -16.55);
    P.candles(ctx, -92.85, y + 0.55, -16.82, 3, 5221, { room, radius: 5, intensity: 1.0, spread: 0.12 });
    wb.box('wooddark', -87.9, y, -25.2, -87.1, y + 0.18, -24.75, { ao: false, room });
    wb.box('wooddark', -87.9, y, -25.85, -87.1, y + 1.0, -25.65, { ao: false, room });
    wb.box('wooddark', -87.95, y + 1.0, -25.95, -87.05, y + 1.06, -25.55, { ao: false, room });
    wb.box('wooddark', -87.56, y + 1.5, iz0, -87.44, y + 2.4, iz0 + 0.06, { ao: false, room });
    wb.box('wooddark', -87.8, y + 2.05, iz0, -87.2, y + 2.15, iz0 + 0.06, { ao: false, room });
    ctx.col.add(-87.95, y, -25.95, -87.05, y + 1.0, -25.55);
    wb.box('clothRed', -92.4, y + 0.005, -20.0, -89.6, y + 0.012, -17.2, { ao: false, faces: 't', tint: [0.6, 0.4, 0.36], room });
    P.shelf(ctx, -86.2, y, CROSS[2][0] - 0.2, Math.PI, 1.8);
    P.hangingLamp(ctx, -89.6, F3 - SL, -20.6, { room, len: 0.9, radius: 6 });
    wb.setRoom(null);
    L.interact.push({ kind: 'item', id: 'i_relicario3', item: 'relicario', x: -93.1, y: y + 0.75, z: -21.05 });
  }
  // la cámara alta: lo que el alcaide subió del Paço para el Rey (sus
  // arcones, su armadura de la frontera, su estandarte enrollado), un
  // camastro junto al cañón de la chimenea, y la puerta de la galería
  {
    const room = 'homenaje3';
    const y = F3;
    wb.setRoom(room);
    for (const [x, z] of [
      [-93.9, -21.0],
      [-93.9, -19.6],
      [-93.9, -18.2],
    ]) {
      wb.box('wooddark', x - 0.4, y, z - 0.6, x + 0.4, y + 0.62, z + 0.6, { ao: false, room, tint: [0.78, 0.64, 0.52] });
      wb.box('iron', x - 0.42, y + 0.3, z - 0.62, x + 0.42, y + 0.36, z + 0.62, { ao: false, room });
      wb.box('gold', x + 0.4, y + 0.36, z - 0.08, x + 0.43, y + 0.52, z + 0.08, { ao: false, room });
    }
    ctx.col.add(-94.3, y, -21.6, -93.5, y + 0.62, -17.6);
    P.armorStand(ctx, -90.4, y, -13.4, Math.PI);
    // el estandarte del Rey, enrollado en su asta, apoyado en el muro
    beam3(ctx, 'wooddark', V(-87.2, y, -15.8), V(-86.8, y + 3.6, -15.6), 0.07, { room });
    wb.cylinder('clothWhite', -86.95, y + 1.6, -15.66, 0.12, 0.12, 1.5, 8, { ao: false, room, tint: [0.86, 0.84, 0.8] });
    // el camastro, junto al muro de la chimenea (el cañón calienta)
    wb.box('wooddark', -94.4, y, -11.6, -92.8, y + 0.4, -9.4, { ao: false, room });
    wb.box('clothRed', -94.35, y + 0.4, -11.55, -92.85, y + 0.5, -9.45, { ao: false, room, tint: [0.62, 0.42, 0.36] });
    ctx.col.add(-94.4, y, -11.6, -92.8, y + 0.5, -9.4);
    P.table(ctx, -90.6, y, -10.4, 1.0, 0.7, 0);
    P.candles(ctx, -90.5, y + 0.82, -10.4, 2, 5231, { room, radius: 5, intensity: 0.9, spread: 0.1 });
    P.wallTorch(ctx, ix0, y + 2.1, -16.4, 'e', { room, radius: 6 });
    P.wallTorch(ctx, s0, y + 2.1, -14.0, 'w', { room, radius: 6 });
    wb.setRoom(null);
  }

  // --- criaturas de la torre
  L.enemies.push(
    { type: 'penitent', x: -91.4, y: 0, z: -22.4, yaw: 0.6, idle: 'eat', id: 'e_alm1' },
    { type: 'soldier', x: -75.6, y: F1, z: -17.4, yaw: -0.4, idle: 'stand', id: 'e_arm1' },
    { type: 'soldier', x: -89.4, y: F1, z: -22.6, yaw: 2.6, idle: 'wander', id: 'e_arm2' },
    // (en la alcoba: en la sala está la mesa del Rey)
    { type: 'mourner', x: -89.4, y: F2, z: -22.4, yaw: -Math.PI / 2, idle: 'stand', id: 'e_alc1' },
    // el Rey, en su sitial (game/rey.js)
    { type: 'rey', x: REY_MESA.seat.x, y: F2, z: REY_MESA.seat.z, yaw: REY_MESA.seat.yaw, idle: 'sit', id: 'n_rey' }
  );
  const PO = CASTLE.postern;
  const K2 = CASTLE.keep;
  L.interact.push(
    { kind: 'npc', npc: 'rey', id: 't_rey', x: REY_MESA.table.x, y: F2, z: REY_MESA.table.z, r: 2.2 },
    { kind: 'door', id: 'd_poterna', x: ix1 + 0.25, y: F2, z: (PO.z0 + PO.z1) / 2, w: PO.z1 - PO.z0, h: PO.h, axis: 'z', lock: { type: 'none' }, mat: 'planks', hinge: 1, swing: 1, plane: ix1 },
    // (el almacén, por la trampilla del dormitorio)
    { kind: 'hatch', id: 'h_almacen_arriba', end: 'top', flag: 'hatch:almacen', opensFrom: 'bottom', shutMsg: 'hatchShutBelow', msgDown: 'hatchDown', x: HT.x, y: F1, z: HT.z, r: 1.6, to: [HT.x + 0.75, 0, HT.z, Math.PI / 2] },
    { kind: 'hatch', id: 'h_almacen_abajo', end: 'bottom', flag: 'hatch:almacen', opensFrom: 'bottom', openMsg: 'hatchOpenBelow', msgUp: 'hatchUpTorre', x: HT.x - 0.3, y: 0, z: HT.z, r: 1.6, to: [HT.x + 1.0, F1, HT.z, Math.PI / 2] }
  );
}

// ------------------------------------------------------------------------ la planta de armas
// El recorrido de §4.2. Del cuerpo de guardia al taller, el paso directo está
// lleno de escombro hasta el techo (se ve la luz del taller entre las
// piedras) y el otro, tapiado. La armería, clavada con tablones; dentro, el
// agujero del bolaño baja al granero. La trampilla del dormitorio la
// atrancaron por abajo: se abre desde el almacén. En la bodega, la cuerda del
// montacargas sube al pañol de los virotes; del pañol, por la saetera que
// alguien ensanchó a mazazos, se sale al cadalso, la galería de madera
// colgada por fuera de la torre, donde vigila el alférez desde su garita; y
// por la ventana del taller se entra en él: el suelo hundido hacia el
// agujero, las vigas colgando, el maestro ballestero bajo una de ellas y la
// ballesta en su banco. El tabique se derriba desde el taller: el atajo.
function armas(ctx, S, L, K, d) {
  const wb = ctx.wb;
  const { ix1, iz0, s1 } = d;
  const { x1, z0, F1, F2 } = K;
  const SL = K.slab;
  const A = ARMAS;
  const rr = new RNG(4461);
  const zc = (CROSS[1][0] + CROSS[1][1]) / 2;

  // --- el escombro entre la guardia y el taller (no se pasa)
  {
    const x = A.escombro;
    for (const [sz, seed] of [
      [-0.55, 4471],
      [0.55, 4472],
    ])
      P.rubble(ctx, x, F1, zc + sz, 9, seed, 0.9, { mat: 'wallstone', scale: 1.15, blocks: 0.8 });
    for (let k = 0; k < 7; k++) P.roughStone(ctx, x + rr.range(-0.5, 0.5), F1 + 0.3 + k * 0.33, zc + rr.range(-0.25, 0.25), rr.range(0.24, 0.34), 4473 + k, { block: true, mat: 'wallstone', uvScale: 0.7, sink: 0, scl: [1, 0.7, 0.8] });
    ctx.col.add(x - 0.68, F1, CROSS[1][0] - 0.2, x + 0.68, F1 + 2.8, CROSS[1][1] + 0.2);
    L.interact.push({ kind: 'examine', id: 'x_escombro_taller', text: 'escombroTaller', x, y: F1, z: CROSS[1][1] + 1.0, r: 1.8 });
  }

  // --- el tabique (se derriba desde el taller) y, ya caído, sus escombros
  {
    const x = A.tabique,
      w = 1.3;
    wb.box('ashlar', x - w / 2, F1 - 0.05, CROSS[1][0], x + w / 2, F1, CROSS[1][1], { faces: 't', ao: false, room: 'homenaje1' });
    ctx.beginGroup('puerta:d_tabique_taller');
    const tint = [0.94, 0.92, 0.86];
    wb.box('wallstone', x - w / 2, F1, zc - 0.22, x + w / 2, F1 + 2.05, zc + 0.22, { sub: 1.2, aoH: 1, faces: 'ns', room: 'homenaje1', tint });
    for (const [y0, y1, k] of [
      [2.05, 2.3, 0.0],
      [2.3, 2.5, 0.12],
      [2.5, 2.64, 0.3],
    ])
      wb.box('wallstone', x - w / 2 + k, F1 + y0, zc - 0.22, x + w / 2 - k, F1 + y1, zc + 0.22, { sub: 1.2, ao: false, faces: 'nst', room: 'homenaje1', tint });
    // la cal, fresca, que rebosa por las juntas
    for (let k = 0; k < 5; k++) wb.box('plaster', x - w / 2 + 0.05, F1 + 0.35 + k * 0.42, zc + 0.22, x + w / 2 - 0.05, F1 + 0.39 + k * 0.42, zc + 0.24, { ao: false, faces: 's', room: 'homenaje1', tint: [1.0, 0.98, 0.92] });
    ctx.endGroup();
    ctx.beginGroup('puerta:d_tabique_taller:ruina');
    P.rubble(ctx, x, F1, zc + 0.9, 8, 4476, 0.8, { mat: 'wallstone', scale: 0.85, blocks: 0.4 });
    P.rubble(ctx, x, F1, zc - 0.5, 4, 4477, 0.5, { mat: 'wallstone', scale: 0.6 });
    ctx.endGroup();
    L.interact.push({ kind: 'door', id: 'd_tabique_taller', x, y: F1, z: zc, w, h: 2.6, axis: 'x', lock: { type: 'barred', side: -1, msg: 'tabiqueCae', sound: 'swingHeavy' }, barredMsg: 'tabique', mat: 'tabique' });
  }

  // --- la armería, clavada con tablones; el agujero del bolaño en su suelo
  {
    L.interact.push({ kind: 'door', id: 'd_armeria', x: -89.5, y: F1, z: zc, w: 1.3, h: 2.7, arch: true, axis: 'x', lock: { type: 'boards', msg: 'armeriaTablones' }, mat: 'planks', hinge: 1, swing: -1, plane: CROSS[1][0] });
    const [hx0, hz0, hx1, hz1] = A.holeArm;
    const room = 'homenaje1a';
    // tablas rotas que asoman sobre el agujero, alguna colgando hacia abajo
    for (let k = 0; k < 6; k++) {
      const z = hz0 + 0.15 + k * ((hz1 - hz0 - 0.3) / 5);
      const L0 = rr.range(0.15, 0.55);
      wb.box('planks', hx0, F1 - 0.05, z - 0.09, hx0 + L0, F1, z + 0.09, { ao: false, faces: 'tnsewb', room, tint: [0.7, 0.6, 0.5] });
      const L1 = rr.range(0.1, 0.4);
      wb.box('planks', hx1 - L1, F1 - 0.05, z - 0.09, hx1, F1, z + 0.09, { ao: false, faces: 'tnsewb', room, tint: [0.7, 0.6, 0.5] });
    }
    for (const [x, z, a] of [
      [hx0 + 0.6, hz0 + 0.5, 0.9],
      [hx1 - 0.5, hz1 - 0.4, -1.1],
    ])
      beam3(ctx, 'planks', V(x, F1 - 0.05, z), V(x + Math.sin(a) * 0.3, F1 - 1.4, z + Math.cos(a) * 0.4), 0.18, { room: 'homenaje0n', d: 0.04 });
    P.decal(ctx, (hx0 + hx1) / 2, F1 + 0.01, (hz0 + hz1) / 2 + 1.0, 2.0);
    // abajo, en el granero: el bolaño, los sacos reventados y el trigo
    const bx = (hx0 + hx1) / 2,
      bz = (hz0 + hz1) / 2;
    // (el bolaño rodó un poco más allá de donde cayó; debajo del agujero, el
    // trigo de los sacos reventados)
    wb.geometry('wallstone', new THREE.SphereGeometry(0.42, 9, 7), new THREE.Matrix4().compose(V(bx + 1.6, 0.38, bz - 0.9), new THREE.Quaternion(), V(1, 0.92, 1)), { room: 'homenaje0n' });
    ctx.col.add(bx + 1.25, 0, bz - 1.25, bx + 1.95, 0.7, bz - 0.55);
    P.ellipsoid(ctx, 'straw', bx - 0.3, 0.05, bz + 0.6, 1.1, 0.12, 0.8, [0.86, 0.72, 0.42], { room: 'homenaje0n' });
    for (let k = 0; k < 5; k++) wb.at(bx + rr.range(-1, 1), 0.02 + k * 0.045, bz + rr.range(-1, 1), rr.range(0, 3), () => wb.box('planks', -0.5, 0, -0.08, 0.5, 0.04, 0.08, { ao: false, room: 'homenaje0n', tint: [0.7, 0.6, 0.5] }));
    P.dropped(ctx, -86.4, F1, -18.6, 1.8, 'helmet');
  }

  // --- la cuerda del montacargas: de la bodega al pañol
  {
    const [hx0, hz0, hx1, hz1] = A.holeHoist;
    const hx = (hx0 + hx1) / 2,
      hz = (hz0 + hz1) / 2;
    // el marco del pozo, arriba, y la polea en su viga
    for (const [a, b, c, e] of [
      [hx0 - 0.08, hz0 - 0.08, hx1 + 0.08, hz0],
      [hx0 - 0.08, hz1, hx1 + 0.08, hz1 + 0.08],
      [hx0 - 0.08, hz0, hx0, hz1],
      [hx1, hz0, hx1 + 0.08, hz1],
    ])
      wb.box('wooddark', a, F1, b, c, F1 + 0.12, e, { ao: false, room: 'homenaje1q' });
    wb.box('timber', hx - 0.12, F2 - SL - 0.42, iz0, hx + 0.12, F2 - SL - 0.18, A.panol.z1, { ao: false, faces: 'nsewb', room: 'homenaje1q' });
    wb.push();
    wb.translate(hx, F2 - SL - 0.7, hz);
    wb.rotateZ(Math.PI / 2);
    wb.cylinder('wooddark', 0, -0.06, 0, 0.22, 0.22, 0.12, 10, { ao: false, capTop: true, capBot: true, room: 'homenaje1q' });
    wb.pop();
    // la cuerda, de la polea a la plataforma de abajo, y la otra, floja
    wb.box('rope', hx - 0.02, 1.0, hz - 0.02, hx + 0.02, F2 - SL - 0.7, hz + 0.02, { ao: false, room: 'homenaje0b' });
    wb.box('rope', hx + 0.2, F1 - 0.6, hz - 0.02, hx + 0.24, F2 - SL - 0.7, hz + 0.02, { ao: false, room: 'homenaje1q' });
    // la plataforma (una caja abierta) abajo, con sacos
    P.crate(ctx, hx, 0, hz, 0.9, 0.1);
    P.sacks(ctx, hx + 0.9, 0, hz + 0.4, 2, 4479);
    L.interact.push(
      { kind: 'hatch', id: 'h_montacargas_abajo', end: 'bottom', flag: 'hatch:montacargas', open: true, labels: ['Bajar por la cuerda', 'Trepar por la cuerda'], msgUp: 'cuerdaArriba', x: hx, y: 0, z: hz + 1.1, r: 1.5, to: [hx - 1.3, F1, hz, Math.PI / 2] },
      { kind: 'hatch', id: 'h_montacargas_arriba', end: 'top', flag: 'hatch:montacargas', open: true, labels: ['Bajar por la cuerda', 'Trepar por la cuerda'], msgDown: 'cuerdaAbajo', x: hx - 1.1, y: F1, z: hz, r: 1.4, to: [hx, 0, hz + 1.3, 0] }
    );
  }

  // --- el pañol de los virotes: cajas, haces en sus estantes, y la saetera
  // ensanchada a mazazos (los cascotes, al pie)
  {
    const room = 'homenaje1q';
    wb.setRoom(room);
    for (const [x, z] of [
      [-82.7, -22.95],
      [-81.8, -22.95],
    ])
      P.crate(ctx, x, F1, z, 0.7, 0);
    for (let k = 0; k < 3; k++) {
      const y = F1 + 0.6 + k * 0.55;
      wb.box('wooddark', s1 + 0.05, y, -26.0, s1 + 0.45, y + 0.05, -23.4, { ao: false, room });
      for (let j = 0; j < 8; j++) wb.box('timber', s1 + 0.08, y + 0.05, -25.9 + j * 0.3, s1 + 0.42, y + 0.09, -25.86 + j * 0.3, { ao: false, room });
    }
    ctx.col.add(s1, F1, -26.1, s1 + 0.5, F1 + 2.0, -23.3);
    const SA = A.saetera;
    for (let k = 0; k < 6; k++) P.roughStone(ctx, SA.x + rr.range(-0.9, 0.9), F1, iz0 + rr.range(0.3, 1.0), rr.range(0.08, 0.16), 4481 + k, { mat: 'wallstone', sink: 0 });
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) P.roughStone(ctx, SA.x + s * (SA.w / 2 + 0.18), F1 + 0.4 + k * 0.6, iz0 - 0.1, 0.16, 4487 + k + (s > 0 ? 3 : 0), { mat: 'wallstone', sink: 0 });
    P.lantern(ctx, -79.0, F1 + 2.1, -25.4, -Math.PI / 2, true, { room });
    bakeCorpse(wb, -80.2, F1, -25.8, 2.4, 'curl', 'soldier', 4489);
    wb.setRoom(null);
    L.interact.push({ kind: 'item', id: 'i_virotes_panol', item: 'virote', n: 12, x: -82.25, y: F1 + 0.74, z: -22.95 });
  }

  // --- el cadalso: la galería de madera colgada por fuera de la torre (al
  // norte y al este), con su pantalla de tablas, sus troneras, su tejadillo y
  // tablas que faltan; en la esquina, la garita del alférez
  {
    const C = A.cadalso;
    const w = C.w;
    const y = F1;
    const runs = [
      { x0: C.x0, z0: z0 - w, x1: x1, z1: z0, ax: 'x' },
      { x0: x1, z0: z0 - w, x1: x1 + w, z1: C.z1, ax: 'z' },
    ];
    // (las pilastras de la esquina asoman 0,32: el suelo, por delante)
    const pil = [
      [x1 - 2.0, z0 - 0.32, x1, z0],
      [x1, z0, x1 + 0.32, z0 + 2.0],
    ];
    // tablas que faltan: [x0, z0, x1, z1]
    const gaps = [
      [-79.6, z0 - w, -78.4, z0 - w / 2],
      [-75.4, z0 - w / 2, -74.5, z0],
      [x1 + w / 2, -27.1, x1 + w, -26.3],
    ];
    for (const R of runs) {
      W(S, R.x0, R.z0, R.x1, R.z1);
      for (const m of subtractRects([R.x0, R.z0, R.x1, R.z1], [...gaps, ...pil])) {
        wb.box('planks', m[0], y - 0.08, m[1], m[2], y, m[3], { faces: 'tb', ao: false, uv: 0.8, tint: [0.66, 0.58, 0.5] });
        ctx.col.add(m[0], y - 0.4, m[1], m[2], y, m[3]);
      }
      // las vigas que salen del muro, con sus tornapuntas
      if (R.ax === 'x')
        for (let x = R.x0 + 0.5; x < R.x1; x += 1.4) {
          wb.box('timber', x - 0.1, y - 0.32, R.z0, x + 0.1, y - 0.08, R.z1, { ao: false, faces: 'nsewb' });
          beam3(ctx, 'timber', V(x, y - 1.6, R.z1), V(x, y - 0.3, R.z0 + 0.25), 0.12);
        }
      else
        for (let z = R.z0 + 0.5; z < R.z1; z += 1.4) {
          wb.box('timber', R.x0, y - 0.32, z - 0.1, R.x1, y - 0.08, z + 0.1, { ao: false, faces: 'nsewb' });
          beam3(ctx, 'timber', V(R.x0, y - 1.6, z), V(R.x1 - 0.25, y - 0.3, z), 0.12);
        }
    }
    // la pantalla de tablas por fuera (con sus troneras), cerrada en los cabos
    const scr = (a, b, c, e, f) => {
      wb.box('planks', a, y, b, c, y + 2.0, e, { faces: f, ao: false, uv: 0.9, tint: [0.6, 0.52, 0.45] });
      ctx.col.add(a, y, b, c, y + 2.4, e);
    };
    scr(C.x0, z0 - w - 0.06, x1 + w + 0.06, z0 - w, 'nsewt');
    scr(x1 + w, z0 - w, x1 + w + 0.06, C.z1, 'nsewt');
    scr(C.x0 - 0.06, z0 - w, C.x0, z0, 'nsewt');
    scr(x1, C.z1, x1 + w, C.z1 + 0.06, 'nsewt');
    for (let x = C.x0 + 1.1; x < x1 - 0.5; x += 1.6) wb.box('black', x - 0.07, y + 0.7, z0 - w - 0.08, x + 0.07, y + 1.6, z0 - w - 0.075, { ao: false, faces: 'n', grime: false });
    for (let z = z0 + 0.6; z < C.z1 - 0.5; z += 1.6) wb.box('black', x1 + w + 0.075, y + 0.7, z - 0.07, x1 + w + 0.08, y + 1.6, z + 0.07, { ao: false, faces: 'e', grime: false });
    // el tejadillo: tablas del muro a la pantalla, en pendiente
    wb.quad('wooddark', V(C.x0, y + 2.9, z0), V(x1 + w, y + 2.9, z0), V(x1 + w, y + 2.2, z0 - w - 0.2), V(C.x0, y + 2.2, z0 - w - 0.2), { ao: false, sub: 2, tint: [0.55, 0.48, 0.42] });
    wb.quad('wooddark', V(C.x0, y + 2.2, z0 - w - 0.2), V(x1 + w, y + 2.2, z0 - w - 0.2), V(x1 + w, y + 2.9, z0), V(C.x0, y + 2.9, z0), { ao: false, sub: 2, tint: [0.45, 0.4, 0.36] });
    wb.quad('wooddark', V(x1, y + 2.9, z0), V(x1, y + 2.9, C.z1), V(x1 + w + 0.2, y + 2.2, C.z1), V(x1 + w + 0.2, y + 2.2, z0), { ao: false, sub: 2, tint: [0.55, 0.48, 0.42] });
    wb.quad('wooddark', V(x1 + w + 0.2, y + 2.2, z0), V(x1 + w + 0.2, y + 2.2, C.z1), V(x1, y + 2.9, C.z1), V(x1, y + 2.9, z0), { ao: false, sub: 2, tint: [0.45, 0.4, 0.36] });
    // la garita de la esquina: un cuarto de tablas con su tejado a cuatro aguas
    {
      const gx0 = x1,
        gz0 = z0 - w,
        gx1 = x1 + w,
        gz1 = z0,
        top = y + 2.5;
      wb.box('planks', gx0, y + 2.0, gz0, gx1, top, gz0 + 0.06, { ao: false, tint: [0.6, 0.52, 0.45] });
      wb.box('planks', gx1 - 0.06, y + 2.0, gz0, gx1, top, gz1, { ao: false, tint: [0.6, 0.52, 0.45] });
      const cx = (gx0 + gx1) / 2,
        cz = (gz0 + gz1) / 2;
      for (const [a, b] of [
        [V(gx0 - 0.15, top, gz0 - 0.15), V(gx1 + 0.15, top, gz0 - 0.15)],
        [V(gx1 + 0.15, top, gz0 - 0.15), V(gx1 + 0.15, top, gz1 + 0.15)],
        [V(gx1 + 0.15, top, gz1 + 0.15), V(gx0 - 0.15, top, gz1 + 0.15)],
        [V(gx0 - 0.15, top, gz1 + 0.15), V(gx0 - 0.15, top, gz0 - 0.15)],
      ])
        wb.quad('wooddark', a, b, V(cx, top + 1.1, cz), V(cx, top + 1.1, cz), { ao: false, tint: [0.5, 0.44, 0.4] });
      P.brazier(ctx, gx1 - 0.45, y, gz0 + 0.45, {});
    }
    // un caído de la guardia, un haz de virotes y las tablas que se hundieron
    bakeCorpse(wb, -77.0, y, z0 - 1.0, 1.4, 'back', 'soldier', 4491);
    P.decal(ctx, -77.0, y + 0.01, z0 - 1.0, 1.8);
    for (const g of gaps) for (let k = 0; k < 2; k++) wb.at((g[0] + g[2]) / 2 + rr.range(-0.3, 0.3), 0.02 + k * 0.055, (g[1] + g[3]) / 2 + rr.range(-0.3, 0.3), rr.range(0, 3), () => wb.box('planks', -0.5, 0, -0.1, 0.5, 0.05, 0.1, { ao: false, tint: [0.6, 0.52, 0.45] }));
    L.interact.push({ kind: 'item', id: 'i_virotes_cadalso', item: 'virote', n: 4, x: -73.0, y: y + 0.1, z: z0 - 1.2 });
    // el alférez, en su garita, vigilando el cadalso; su llave y su carcaj,
    // donde caiga
    L.enemies.push({ type: 'alferez', x: x1 + w / 2, y, z: z0 - w / 2, yaw: -Math.PI / 2, idle: 'watch', id: 'e_alferez', story: 'dead:alferez', dies: 'dead:alferez' });
    L.interact.push(
      { kind: 'item', id: 'i_llave_alferez', item: 'llave_alferez', afterFlag: 'dead:alferez', x: x1 + w / 2 - 0.4, y: y + 0.08, z: z0 - w / 2 + 0.3 },
      { kind: 'item', id: 'i_virotes_alferez', item: 'virote', n: 6, afterFlag: 'dead:alferez', x: x1 + w / 2 + 0.3, y: y + 0.08, z: z0 - w / 2 - 0.3 }
    );
  }

  // --- el taller, hundido: el suelo que se inclina hacia el agujero, las
  // vigas que cuelgan, el maestro ballestero bajo una, la ballesta en su
  // banco y los virotes en su caja
  {
    const room = 'homenaje1t';
    const y = F1;
    wb.setRoom(room);
    const [hx0, hz0, hx1, hz1] = A.holeTaller;
    // tablas inclinadas hacia el hueco y astillas
    for (let k = 0; k < 5; k++) {
      const z = hz0 + 0.2 + k * ((hz1 - hz0 - 0.4) / 4);
      beam3(ctx, 'planks', V(hx0 - 0.1, y - 0.03, z), V(hx0 + rr.range(0.7, 1.1), y - rr.range(0.5, 0.9), z + rr.range(-0.1, 0.1)), 0.2, { room, d: 0.05 });
      beam3(ctx, 'planks', V(hx1 + 0.1, y - 0.03, z), V(hx1 - rr.range(0.5, 0.8), y - rr.range(0.4, 0.8), z + rr.range(-0.1, 0.1)), 0.2, { room, d: 0.05 });
    }
    // vigas del techo partidas, colgando
    for (const [x, z, a] of [
      [-77.2, -20.0, 0.6],
      [-75.8, -21.4, -0.4],
    ])
      beam3(ctx, 'wooddark', V(x, F2 - SL - 0.1, z), V(x + Math.sin(a) * 1.4, F2 - SL - 2.0, z + Math.cos(a) * 0.4), 0.2, { room });
    // la viga que mató al maestro: tumbada, sobre él
    bakeCorpse(wb, -81.6, y, -19.4, 0.3, 'back', 'villager', 4493);
    beam3(ctx, 'timber', V(-83.2, y + 0.05, -20.2), V(-79.8, y + 0.32, -18.6), 0.26, { room });
    ctx.col.add(-83.2, y, -20.4, -79.8, y + 0.5, -18.4);
    P.decal(ctx, -81.6, y + 0.01, -19.4, 2.0);
    // el banco, con la ballesta encima
    P.table(ctx, -81.4, y, -16.6, 1.6, 0.8, 0);
    P.stool(ctx, -81.4, y, -15.9, { room });
    for (let k = 0; k < 8; k++) wb.box('timber', -82.0 + k * 0.14, y + 0.82, -16.85, -81.98 + k * 0.14, y + 0.835, -16.45, { ao: false, room });
    // la caja de los virotes
    P.crate(ctx, -82.7, y, -21.2, 0.75, 0);
    for (let k = 0; k < 12; k++) wb.box('timber', -83.0 + (k % 6) * 0.1, y + 0.75, -21.4 + Math.floor(k / 6) * 0.25, -82.98 + (k % 6) * 0.1, y + 1.05, -21.38 + Math.floor(k / 6) * 0.25, { ao: false, room });
    // escudos y ballestas colgados en el muro norte
    for (let x = -77.9; x < -73.8; x += 0.95) {
      wb.at(x, y, iz0 + 0.25, 0, () => {
        wb.box('planks', -0.33, 0, -0.04, 0.33, 0.85, 0.04, { ao: false, faces: 'tnsewb', tint: [0.6, 0.5, 0.42], room });
        wb.box('iron', -0.06, 0.38, 0.04, 0.06, 0.5, 0.08, { ao: false, room });
      });
    }
    wb.box('planks', -78.1, y + 1.5, iz0, -73.7, y + 2.6, iz0 + 0.06, { ao: false, room, tint: [0.62, 0.55, 0.48] });
    for (let x = -77.6; x < -74.0; x += 0.9) {
      beam3(ctx, 'wooddark', V(x, y + 1.6, iz0 + 0.1), V(x, y + 2.45, iz0 + 0.1), 0.07, { room });
      beam3(ctx, 'wooddark', V(x - 0.32, y + 2.25, iz0 + 0.1), V(x + 0.32, y + 2.25, iz0 + 0.1), 0.06, { room });
    }
    // (la luz del taller se ve entre las piedras del escombro)
    P.wallTorch(ctx, s1, y + 2.0, -17.6, 'e', { room, radius: 7 });
    P.wallTorch(ctx, ix1, y + 2.2, -18.4, 'w', { room, radius: 7 });
    wb.setRoom(null);
    // abajo, en la bodega: lo que cayó
    P.rubble(ctx, (hx0 + hx1) / 2, 0, (hz0 + hz1) / 2, 7, 4495, 1.0, { mat: 'wallstone', scale: 0.9, blocks: 0.3 });
    for (let k = 0; k < 4; k++) wb.at((hx0 + hx1) / 2 + rr.range(-1, 1), 0.03 + k * 0.055, (hz0 + hz1) / 2 + rr.range(-1, 1), rr.range(0, 3), () => wb.box('planks', -0.6, 0, -0.09, 0.6, 0.05, 0.09, { ao: false, room: 'homenaje0b', tint: [0.7, 0.6, 0.5] }));
    L.interact.push(
      { kind: 'item', id: 'i_ballesta', item: 'ballesta', x: -81.4, y: y + 0.84, z: -16.6 },
      { kind: 'note', id: 'n_ballestero', note: 'ballestero', x: -80.85, y: y + 0.84, z: -16.75, model: 'paper' },
      { kind: 'item', id: 'i_virotes_taller', item: 'virote', n: 10, x: -82.7, y: y + 0.8, z: -21.2 }
    );
  }

  // --- criaturas: una come en la bodega, a oscuras
  L.enemies.push({ type: 'penitent', x: -77.4, y: 0, z: -18.4, yaw: 2.2, idle: 'eat', id: 'e_bod1' });
}

// ------------------------------------------------------------------------ la bajada tapiada
// La escalera baja en su hueco, con sus pretiles y el marco de su puerta, que
// quedó abierta; en los muros del hueco, los arañazos de algo grande que
// subía. Abajo, el pasadizo hasta el tapiado: por este lado, sacos, piedras y
// cal contra el ladrillo; por el del pasillo de las celdas, el ladrillo nuevo
// con lo que alguien arañó en la cal fresca. El sillar cuelga de su viga
// sobre el tapiado (lo deja caer game/cuerdas.js).
function bajada(ctx, S, L, K, d) {
  const wb = ctx.wb;
  const B = BAJADA;
  const YD = CASTLE.dun.y;
  const rr = new RNG(4521);
  const st = B.stair;
  const xc = (st.x0 + st.x1) / 2;
  // (la losa de tierra va por metros: el hueco, a metros enteros)
  ctx.floorHoles.push([Math.floor(B.hole[0]), Math.floor(B.hole[1]), Math.ceil(B.hole[2]), Math.ceil(B.hole[3])]);
  // la escalera (sube hacia el norte)
  wb.setRoom('bajada');
  stairs(ctx, xc, YD, st.bottom, 'n', st.x1 - st.x0, st.n, -YD / st.n, (st.bottom - st.top) / st.n, 'wallstone', { solidBelow: true });
  wb.setRoom(null);
  // los pretiles del hueco, en el almacén, y el marco de la boca, al norte
  const room = 'homenaje0';
  parapet(ctx, st.x1, st.top + 0.32, st.x1 + 0.25, st.bottom - 0.06, 0, 1.0, { room });
  parapet(ctx, st.x0, st.bottom, st.x1, st.bottom + 0.25, 0, 1.0, { room });
  solid(ctx, 'ashlar', st.x1, 0, st.top - 0.05, st.x1 + 0.3, 2.3, st.top + 0.25, { sub: 1.4, aoH: 1, room, tint: [0.7, 0.68, 0.64] });
  wb.box('ashlar', st.x0 - 0.1, 2.3, st.top - 0.09, st.x1 + 0.34, 2.62, st.top + 0.29, { ao: false, faces: 'tnsewb', room, tint: [0.66, 0.64, 0.6] });
  // (la hoja ya no está: la arrancaron, y sus tablas están en el suelo)
  for (let k = 0; k < 3; k++) wb.at(st.x1 + 0.9 + k * 0.3, 0.02 + k * 0.045, st.top - 0.5 - k * 0.2, 0.3 + k * 0.5, () => wb.box('planks', -0.55, 0, -0.1, 0.55, 0.04, 0.1, { ao: false, room, tint: [0.62, 0.55, 0.48] }));
  // los arañazos en los muros del hueco: surcos de cuatro en cuatro
  for (let k = 0; k < 5; k++) {
    const z = st.bottom - 0.8 - k * 1.3,
      y = YD + 0.9 + k * 0.85;
    for (const xf of [st.x0 + 0.012, st.x1 - 0.012]) {
      if (rr.chance(0.35)) continue;
      for (let j = 0; j < 4; j++) {
        const g = new THREE.BoxGeometry(0.006, 0.75, 0.03);
        wb.geometry('black', g, new THREE.Matrix4().compose(V(xf, y + rr.range(-0.1, 0.1), z - j * 0.09), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.35 + rr.range(-0.08, 0.08), 0, 0)), V(1, 1, 1)), { ao: false, grime: false, room: 'bajada' });
      }
    }
  }
  const pasillo = B.este;
  // el pasadizo: antorcha, un caído, huesos
  P.wallTorch(ctx, B.norte[2], YD + 1.8, -9.0, 'w', { room: 'bajada', radius: 6 });
  P.wallTorch(ctx, B.rellano[0], YD + 1.8, -5.1, 'e', { room: 'bajada', radius: 5 });
  bakeCorpse(wb, -92.1, YD, -8.6, 1.4, 'curl', 'soldier', 4523);
  P.bones(ctx, -92.0, YD, -10.4, 4, 4524, 0.4);
  // la viga del sillar, de muro a muro
  const SI = B.sillar;
  wb.box('timber', SI.x - 0.12, SI.y1, pasillo[1], SI.x + 0.12, SI.y1 + 0.08, pasillo[3], { ao: false, faces: 'nsewb', room: 'bajada' });
  wb.box('iron', SI.x - 0.05, SI.y1 - 0.08, SI.z - 0.05, SI.x + 0.05, SI.y1, SI.z + 0.05, { ao: false, room: 'bajada' });
  L.cuerdas = L.cuerdas || [];
  L.cuerdas.push({ id: 'cuerda_sillar', a: [SI.x, SI.y0, SI.z], b: [SI.x, SI.y1 - 0.08, SI.z], stone: SI.s, floor: YD, door: 'd_tapia_celdas', room: 'bajada' });

  // --- el tapiado: el ladrillo nuevo y su cal (por el lado de las celdas, lo
  // arañado; por el del pasadizo, sacos y piedras contra él)
  const T = B.tapia;
  ctx.beginGroup('puerta:d_tapia_celdas');
  {
    const z0 = T.z - T.w / 2,
      z1 = T.z + T.w / 2;
    wb.box('plaster', T.x - 0.18, YD, z0, T.x + 0.18, YD + T.h, z1, { sub: 0.8, aoH: 1, faces: 'ew', room: 'mazmorra', tint: [0.94, 0.9, 0.84] });
    // las hiladas de ladrillo, que asoman bajo la cal
    for (let k = 1; k < 10; k++) {
      const y = YD + k * 0.24;
      wb.box('wooddark', T.x + 0.18, y, z0 + 0.02, T.x + 0.185, y + 0.018, z1 - 0.02, { ao: false, faces: 'e', room: 'mazmorra', tint: [0.5, 0.36, 0.3] });
      for (let x = z0 + (k % 2 ? 0.1 : 0.22); x < z1 - 0.05; x += 0.26) wb.box('wooddark', T.x + 0.18, y - 0.24, x, T.x + 0.185, y, x + 0.018, { ao: false, faces: 'e', room: 'mazmorra', tint: [0.5, 0.36, 0.3] });
    }
    // LO QUE SUBE NO ES NUESTRO, arañado en la cal
    wb.geometry('scratchNoEsNuestro', new THREE.PlaneGeometry(1.4, 0.5), new THREE.Matrix4().compose(V(T.x + 0.192, YD + 1.45, T.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0.03)), V(1, 1, 1)), { ao: false, grime: false, room: 'mazmorra' });
    // por detrás: sacos, piedras y cal
    P.sacks(ctx, T.x - 0.55, YD, T.z - 0.45, 4, 4525);
    P.sacks(ctx, T.x - 0.55, YD, T.z + 0.45, 3, 4526);
    P.sacks(ctx, T.x - 0.45, YD + 0.5, T.z, 2, 4527);
    for (let k = 0; k < 6; k++) P.roughStone(ctx, T.x - 0.3 - rr.range(0, 0.4), YD + 0.2 + k * 0.32, T.z + rr.range(-0.6, 0.6), rr.range(0.16, 0.24), 4529 + k, { block: true, mat: 'wallstone', sink: 0, uvScale: 0.7 });
  }
  ctx.endGroup();
  ctx.beginGroup('puerta:d_tapia_celdas:ruina');
  P.rubble(ctx, T.x, YD, T.z, 10, 4537, 1.1, { mat: 'wallstone', scale: 0.9, blocks: 0.5 });
  wb.geometry('ashlar', new THREE.BoxGeometry(...SI.s), new THREE.Matrix4().compose(V(T.x - 0.2, YD + 0.3, T.z + 0.15), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0.6, 0.2)), V(1, 1, 1)), { room: 'bajada' });
  for (let k = 0; k < 3; k++) wb.at(T.x - 0.8 + k * 0.4, YD + 0.02 + k * 0.03, T.z + rr.range(-0.5, 0.5), rr.range(0, 3), () => wb.box('burlap', -0.3, 0, -0.2, 0.3, 0.12, 0.2, { ao: false, room: 'bajada', tint: [0.7, 0.62, 0.5] }));
  ctx.endGroup();
  L.interact.push(
    { kind: 'door', id: 'd_tapia_celdas', x: T.x, y: YD, z: T.z, w: T.w, h: T.h, axis: 'z', mat: 'tabique', lock: { type: 'rope', side: 1, msgA: 'tapiaCeldas', msgB: 'tapiaArriba' } }
  );
  // la zona y el mapa (bajo el castillo)
  L.zones.unshift({ id: 'bajada_torre', rects: [B.rellano, B.norte, B.este, [st.x0, st.top, st.x1, st.bottom]].map((r) => [...r, YD - 0.5, r === B.rellano || r === B.norte || r === B.este ? YD + 2.3 : -0.3]), atmo: 'prison', room: 'bajada' });
  L.map.push({ id: 'bajada_torre', r: [B.rellano[0], B.este[1], B.este[2], B.rellano[3]], level: 'dungeon' });
}
