// Repertorio de golpes de las armas contundentes: la maza (a una mano, con
// el escudo) y el martillo de guerra (a dos manos). Mismas convenciones que
// weapon_moves.js: claves [t, pose, curva, {k}], la muñeca y la dirección del
// arma en el espacio del personaje (W2C: cm desde los pies, +x a la
// izquierda, +z delante; rumbo 0 al frente, cabeceo + arriba), anticipación
// que llega frenando ('hold'), el impacto cruzado a toda velocidad (HIT),
// el final del golpe que frena ('settle') y la recuperación; el cuerpo
// empieza y el arma llega la última (lag).
//
// Lo que las distingue de las de filo: el peso está en la cabeza. Los golpes
// se cargan de lejos (el arma bien atrás, el cuerpo torcido), caen con todo
// el cuerpo detrás y no se pasan de largo: se quedan donde golpean (un
// 'settle' corto y bajo) y cuesta volver a subirlos.
import { STANCE, LUNGE, SHIELD_UP, SHIELD_GUARD, attack } from './weapon_common.js';
import { W2C, edgeClip, hitWindows, poseAt, clearHaftBy, LAG_MED, LAG_HEAVY, HIT } from './weapon_moves.js';
import { MACE, HAMMER } from './weapon_models.js';

const Y = -0.05; // (el eje del mango en el espacio de la mano)

// ================================================================ MAZA
// A una mano, con el escudo al brazo y el pie derecho delante, como la
// espada. Cuatro gestos: el golpe de derecha (en diagonal, de encima del
// hombro derecho abajo a la izquierda), el revés (de vuelta, de la izquierda
// a la derecha), el mazazo (de arriba abajo, el remate) y el pesado, el del
// carcelero: se alza por encima de la cabeza, se pone de puntillas y cae con
// todo el cuerpo. Es redonda: no hay filo, pero la mano golpea como al clavar
// un clavo, con los nudillos por delante (y la muñeca, sin dar la vuelta).
// El escudo, delante y algo recogido mientras golpea (en el espacio del
// pecho: gira con él).
const SH_W = [20, 20, 26],
  SH_I = [26, 14, 14],
  SH_S = [24, 16, 16];
function maceMoves(ctx) {
  const { G, rig } = ctx;
  const g = { ...STANCE, ...G };
  const M = (body, wrist, blade, extra = {}) => ({ ...body, ...W2C(rig, body, wrist, blade), elbowR: [-0.55, -0.75, -0.4], ikL: SH_I, ...extra });
  // (cada golpe con los nudillos por delante: la muñeca y el codo, como
  // cuando se clava un clavo; edgeClip)
  const E = (name, dur, keys, opts) => edgeClip(ctx, name, dur, keys, opts).c;
  // el cuerpo en cada momento
  const B = {
    // cargado a la derecha: la cadera y el pecho torcidos, el peso atrás
    derecha: { ...STANCE, root: [0, -3, -3], hips: [0, -14, 0], chest: [-4, -34, 0], head: [0, 26, 0] },
    // cargado a la izquierda (el revés): el arma cruzada por delante
    izquierda: { ...STANCE, root: [0, -4, -2], hips: [0, 14, 0], chest: [6, 40, 0], head: [0, -22, 0] },
    // por encima de la cabeza: echado atrás
    arriba: { ...STANCE, root: [0, 1, -4], hips: [0, -4, 0], chest: [-16, -10, 0], head: [-8, 6, 0] },
  };
  // ---- el golpe de derecha: de encima del hombro derecho, en diagonal,
  // abajo a la izquierda; acaba con la maza junto a la rodilla izquierda
  const l1 = E(
    'm_light1',
    0.72,
    [
      [0, { ...g }],
      [0.18, M(B.derecha, [-30, 178, -8], [-150, 22], { elbowR: [-0.7, 0.1, -0.7], ikL: SH_W }), 'hold'],
      [0.3, M({ ...LUNGE, root: [0, -8, 6], hips: [0, 8, 0], chest: [12, 16, 0], head: [-6, -10, 0] }, [-8, 130, 70], [15, 20], { elbowR: [-0.4, -0.8, -0.3] }), 'smooth', HIT],
      [0.42, M({ ...LUNGE, root: [0, -9, 6], hips: [0, 16, 0], chest: [16, 40, 0], head: [-4, -24, 0] }, [10, 100, 40], [60, -45], { elbowR: [-0.3, -0.8, -0.4], ikL: SH_S }), 'settle'],
      [0.58, M({ ...STANCE, hips: [0, 6, 0], chest: [8, 16, 0], head: [-2, -8, 0] }, [-4, 118, 42], [20, 36], { ikL: SH_S })],
      [0.72, { ...g }],
    ],
    { lag: LAG_MED, events: [{ t: 0.2, name: 'swing' }] }
  );
  const CAN = [0.44, 0.42, 0.8];
  // ---- el revés: de vuelta, de la izquierda (la maza en alto, por encima
  // del escudo) a la derecha, a la altura del pecho
  const l2 = E(
    'm_light2',
    0.7,
    [
      [0, poseAt(l1, CAN[0])],
      [0.16, M(B.izquierda, [18, 132, 30], [120, 55], { elbowR: [0.2, -0.4, -0.9], ikL: [26, 8, 14] }), 'hold'],
      [0.28, M({ ...LUNGE, root: [0, -8, 6], hips: [0, -6, 0], chest: [10, -14, 0], head: [-4, 10, 0] }, [-4, 130, 50], [-20, 15], { elbowR: [-0.5, -0.7, -0.4] }), 'smooth', HIT],
      [0.4, M({ ...LUNGE, root: [0, -8, 5], hips: [0, -14, 0], chest: [12, -42, 0], head: [0, 22, 0] }, [-36, 128, 32], [-95, 20], { elbowR: [-0.7, -0.6, -0.2], ikL: SH_S }), 'settle'],
      [0.56, M({ ...STANCE, hips: [0, -6, 0], chest: [6, -18, 0], head: [0, 8, 0] }, [-24, 124, 34], [-40, 40], { ikL: SH_S })],
      [0.7, { ...g }],
    ],
    { lag: LAG_MED, events: [{ t: 0.18, name: 'swing' }] }
  );
  // ---- el mazazo: se alza por encima de la cabeza y baja recto, con el
  // cuerpo encima; la maza se queda abajo, delante, a media pierna
  const MZ_I = { ...LUNGE, root: [0, -12, 8], chest: [26, -2, 0], head: [-12, 0, 0] };
  const MZ_S = { ...LUNGE, root: [0, -16, 10], chest: [34, 0, 0], head: [-16, 0, 0] };
  const l3 = E(
    'm_light3',
    0.92,
    [
      [0, poseAt(l2, CAN[1])],
      [0.26, M(B.arriba, [-14, 192, 4], [-10, 138], { elbowR: [-0.7, 0.2, -0.6], ikL: SH_W }), 'hold'],
      [0.38, M(MZ_I, [-10, 122, 74], [-4, 5], { elbowR: [-0.5, -0.7, -0.3] }), 'smooth', HIT],
      [0.5, M(MZ_S, [-8, 95, 72], [-3, -45], { elbowR: [-0.4, -0.8, -0.2], ikL: SH_S }), 'settle'],
      [0.72, M({ ...STANCE, chest: [10, 0, 0], head: [-4, 0, 0] }, [-12, 115, 42], [-8, 30], { ikL: SH_S })],
      [0.92, { ...g }],
    ],
    { lag: LAG_MED, events: [{ t: 0.3, name: 'swing' }] }
  );
  // ---- el del carcelero (pesado): la maza sube por detrás del hombro hasta
  // encima de la cabeza, se pone de puntillas, y cae con todo el cuerpo,
  // que se va adelante de una zancada; abajo se queda un instante
  const HV = { legL: [36, 0, 6], shinL: [10, 0, 0], legR: [-56, 0, -4], shinR: [56, 0, 0] };
  const h1 = E(
    'm_heavy',
    1.12,
    [
      [0, { ...g }],
      [0.22, M({ ...STANCE, root: [0, -2, -4], hips: [0, -8, 0], chest: [-10, -20, 0], head: [-4, 14, 0] }, [-24, 186, -2], [-60, 110], { elbowR: [-0.7, 0.2, -0.6], ikL: SH_W })],
      [
        0.44,
        M({ legL: [20, 0, 8], shinL: [20, 0, 0], legR: [-30, 0, -8], shinR: [30, 0, 0], root: [0, 4, -8], hips: [0, -6, 0], chest: [-22, -16, 0], head: [-12, 12, 0] }, [-18, 196, -6], [-40, 128], { elbowR: [-0.7, 0.3, -0.6], ikL: SH_W }),
        'hold',
      ],
      [0.56, M({ ...HV, root: [0, -22, 13], hips: [0, 2, 0], chest: [36, -4, 0], head: [-18, 0, 0] }, [-10, 110, 86], [-4, 0], { elbowR: [-0.5, -0.8, -0.2] }), 'smooth', HIT],
      [0.68, M({ ...HV, root: [0, -28, 16], hips: [0, 4, 0], chest: [44, -2, 0], head: [-20, 0, 0] }, [-8, 80, 84], [-3, -55], { elbowR: [-0.4, -0.8, -0.1], ikL: SH_S }), 'settle'],
      [0.86, M({ ...HV, root: [0, -26, 15], hips: [0, 4, 0], chest: [42, -2, 0], head: [-18, 0, 0] }, [-8, 82, 82], [-3, -52], { elbowR: [-0.4, -0.8, -0.1], ikL: SH_S })],
      [1.12, { ...g }],
    ],
    { lag: LAG_MED, events: [{ t: 0.48, name: 'swing' }] }
  );
  // ---- a la carrera: un salto y el mazazo, con la zancada
  const run = E(
    'm_run',
    0.86,
    [
      [0, M({ ...STANCE, chest: [10, -10, 0] }, [-28, 120, 18], [-40, 50])],
      [0.18, M({ legL: [-60, 0, 8], shinL: [80, 0, 0], legR: [10, 0, -8], shinR: [60, 0, 0], root: [0, 12, 4], hips: [0, -4, 0], chest: [-16, -10, 0], head: [-8, 6, 0] }, [-14, 196, 6], [-10, 134], { elbowR: [-0.7, 0.2, -0.6], ikL: SH_W }), 'hold'],
      [0.3, M({ ...HV, root: [0, -18, 12], chest: [30, -2, 0], head: [-14, 0, 0] }, [-10, 116, 80], [-4, 4], { elbowR: [-0.5, -0.7, -0.3] }), 'smooth', HIT],
      [0.42, M({ ...HV, root: [0, -24, 14], chest: [38, 0, 0], head: [-18, 0, 0] }, [-8, 86, 80], [-3, -48], { elbowR: [-0.4, -0.8, -0.2], ikL: SH_S }), 'settle'],
      [0.64, M({ ...STANCE, chest: [12, 0, 0], head: [-4, 0, 0] }, [-12, 115, 42], [-8, 30], { ikL: SH_S })],
      [0.86, { ...g }],
    ],
    { lag: LAG_MED, events: [{ t: 0.22, name: 'swing' }] }
  );
  // ---- al salir de la voltereta: un barrido bajo, de derecha a izquierda
  const rl = E(
    'm_roll',
    0.64,
    [
      [0, M({ root: [0, -24, 0], legL: [-50, 0, 8], shinL: [80, 0, 0], legR: [16, 0, -8], shinR: [60, 0, 0], hips: [0, -10, 0], chest: [24, -30, 0], head: [-10, 20, 0] }, [-36, 96, 20], [-110, 10], { elbowR: [-0.6, -0.5, -0.5], ikL: SH_W })],
      [0.14, M({ ...LUNGE, root: [0, -16, 6], hips: [0, 4, 0], chest: [16, 8, 0], head: [-6, -6, 0] }, [-4, 120, 68], [10, 8], { elbowR: [-0.4, -0.8, -0.3] }), 'smooth', HIT],
      [0.26, M({ ...LUNGE, root: [0, -15, 5], hips: [0, 14, 0], chest: [14, 40, 0], head: [-4, -22, 0] }, [26, 118, 34], [100, 12], { elbowR: [-0.2, -0.7, -0.6], ikL: SH_S }), 'settle'],
      [0.64, { ...g }],
    ],
    { windup0: true, lag: LAG_MED, events: [{ t: 0.06, name: 'swing' }] }
  );
  const C = { m_light1: l1, m_light2: l2, m_light3: l3, m_heavy: h1, m_run: run, m_roll: rl };
  const K = { snd: 'swingMace', hitSnd: 'hitMace' };
  const H = (c) => hitWindows(ctx, c);
  const light = [
    attack({ ...K, clip: l1, dmg: 17, st: 14, hits: H(l1), cancel: CAN[0], move: 0.5, lunge: [0.12, 0.3, 2.6], range: 2.1, arc: 120, poise: 26, dir: -1 }),
    attack({ ...K, clip: l2, dmg: 18, st: 14, hits: H(l2), cancel: CAN[1], move: 0.48, lunge: [0.1, 0.28, 2.4], range: 2.1, arc: 130, poise: 26, dir: 1 }),
    attack({ ...K, clip: l3, dmg: 24, st: 18, hits: H(l3), cancel: CAN[2], move: 0.66, lunge: [0.24, 0.42, 3.2], range: 2.15, arc: 80, poise: 40, dir: 0 }),
  ];
  const heavy = [attack({ ...K, clip: h1, dmg: 46, st: 30, hits: H(h1), cancel: 0.86, move: 0.9, lunge: [0.44, 0.62, 3.6], range: 2.2, arc: 80, poise: 82, heavy: true, dir: 0 })];
  const runA = attack({ ...K, clip: run, dmg: 26, st: 20, hits: H(run), cancel: 0.6, move: 0.66, lunge: [0.02, 0.36, 5.4], range: 2.15, arc: 80, poise: 42, dir: 0 });
  const roll = attack({ ...K, clip: rl, dmg: 19, st: 14, hits: H(rl), cancel: 0.42, move: 0.48, lunge: [0.0, 0.18, 2.8], range: 2.1, arc: 120, poise: 28, dir: -1 });
  return { clips: C, light, heavy, run: runA, roll };
}

// ================================================================ MARTILLO DE GUERRA
// A dos manos, con el pie izquierdo delante, como el hacha, y más pesado que
// ella: cada golpe se carga más, cae con todo el cuerpo y se queda abajo;
// subirlo otra vez cuesta. El golpe de derecha, en diagonal; el barrido, de la
// izquierda a la derecha, a la altura del pecho (la izquierda desliza por el
// mango hacia la derecha: wSlide); el pico, el remate, de arriba abajo con
// el pico de cuervo por delante (perfora); y el martillazo (pesado), por
// encima de la cabeza, que se carga y parte el suelo. La boca (-Y) va por
// delante en cada golpe; en el del pico, el pico (+Y: edge 'back').
const HST = { legL: [-22, 0, 10], shinL: [28, 0, 0], legR: [22, 0, -10], shinR: [26, 0, 0], root: [0, -12, 0] };
const HLUNGE = { legL: [-46, 0, 8], shinL: [50, 0, 0], legR: [32, 0, -8], shinR: [16, 0, 0], root: [0, -24, 12] };
const HCHOP = { legL: [-52, 0, 8], shinL: [56, 0, 0], legR: [36, 0, -8], shinR: [18, 0, 0], root: [0, -34, 16] };
// (el mango llega por detrás de la mano derecha hasta la punta del regatón)
const H_BUTT = HAMMER.butt - 0.016;
function hammerMoves(ctx) {
  const { G, rig } = ctx;
  const g = { ...G };
  // claves en el espacio del personaje, con el mango por delante del cuerpo
  const A = (body, wrist, blade, extra = {}) => clearHaftBy({ ...body, ...W2C(rig, body, wrist, blade), elbowR: [-0.55, -0.7, -0.35], ...extra }, H_BUTT);
  // (la primera clave de cada golpe encadenado es donde se quedó el anterior,
  // tal cual; las demás salen de A, con el mango ya por delante del cuerpo)
  const CAN = [0.8, 0.82, 1.2];
  // ---- el golpe de derecha: cargado sobre el hombro derecho, la cabeza
  // atrás, cae en diagonal y se queda abajo, a la izquierda
  const l1 = edgeClip(
    ctx,
    'h_light1',
    1.18,
    [
      [0, { ...HST, chest: [4, -8, 0], ...g }],
      [0.34, A({ ...HST, root: [0, -8, -6], hips: [0, -16, 0], chest: [-8, -46, 0], head: [0, 28, 0] }, [-28, 152, 2], [-155, 46], { elbowR: [-0.7, 0.1, -0.7] }), 'hold'],
      [0.5, A({ ...HLUNGE, hips: [0, 6, 0], chest: [18, 2, 0], head: [-8, 0, 0] }, [-4, 116, 62], [8, -8]), 'smooth', HIT],
      [0.62, A({ ...HLUNGE, root: [0, -26, 12], hips: [0, 18, 0], chest: [30, 34, 0], head: [-12, -20, 0] }, [22, 84, 52], [62, -50], { elbowR: [-0.4, -0.8, -0.3] }), 'settle'],
      [0.86, A({ ...HST, hips: [0, 8, 0], chest: [14, 18, 0], head: [-4, -8, 0] }, [6, 104, 50], [14, 22])],
      [1.18, { ...HST, chest: [4, -8, 0], ...g }],
    ],
    { lag: LAG_HEAVY, events: [{ t: 0.38, name: 'swing' }] }
  );
  // ---- el barrido: de la izquierda, la cabeza atrás y baja, a la derecha,
  // a la altura del pecho (con las manos altas y lejos del cuerpo, el regatón
  // no se mete en la tripa al pasar por delante); la izquierda sube por el
  // mango
  const l2 = edgeClip(
    ctx,
    'h_light2',
    1.2,
    [
      [0, poseAt(l1.c, CAN[0])],
      [0.34, A({ ...HST, root: [0, -12, -2], hips: [0, 18, 0], chest: [8, 50, 0], head: [0, -26, 0] }, [42, 106, 22], [112, 6], { elbowR: [0.2, -0.6, -0.8], wSlide: [0.55, 0, 0] }), 'hold'],
      [0.5, A({ ...HLUNGE, hips: [0, 0, 0], chest: [14, 4, 0], head: [-4, 0, 0] }, [6, 120, 62], [20, -2], { wSlide: [0.75, 0, 0] }), 'smooth', HIT],
      [0.62, A({ ...HST, hips: [0, -16, 0], chest: [12, -50, 0], head: [-4, 24, 0] }, [-50, 122, 18], [-116, 4], { elbowR: [-0.8, -0.4, -0.3], wSlide: [0.85, 0, 0] }), 'settle'],
      [0.9, A({ ...HST, hips: [0, -6, 0], chest: [8, -20, 0], head: [0, 8, 0] }, [-16, 112, 46], [-30, 34])],
      [1.2, { ...HST, chest: [4, -8, 0], ...g }],
    ],
    { lag: LAG_HEAVY, events: [{ t: 0.38, name: 'swing' }] }
  );
  // ---- el pico: por encima de la cabeza y abajo, recto, con el pico de
  // cuervo por delante; se clava a la altura de la rodilla y se arranca
  const PK = { ...HCHOP, root: [0, -28, 14], chest: [36, 0, 0], head: [-20, 0, 0] };
  const l3 = edgeClip(
    ctx,
    'h_light3',
    1.3,
    [
      [0, poseAt(l2.c, CAN[1])],
      [0.4, A({ ...HST, root: [0, -2, -6], hips: [0, -6, 0], chest: [-20, -8, 0], head: [-10, 6, 0] }, [-8, 176, 6], [-4, 128], { elbowR: [-0.7, 0.2, -0.6], wSlide: [0.6, 0, 0] }), 'hold'],
      [0.54, A({ ...HLUNGE, root: [0, -16, 8], chest: [16, -2, 0], head: [-10, 0, 0] }, [-6, 130, 64], [-4, 30], { elbowR: [-0.6, -0.5, -0.3] }), 'smooth', HIT],
      [0.66, A(PK, [-6, 86, 64], [-2, -30], { elbowR: [-0.5, -0.8, 0] }), 'settle'],
      [0.9, A({ ...PK, root: [0, -26, 13], chest: [34, 0, 0] }, [-6, 88, 62], [-2, -28], { elbowR: [-0.5, -0.8, 0] })],
      [1.08, A({ ...HST, chest: [14, 0, 0], head: [-6, 0, 0] }, [-8, 106, 50], [-12, 26])],
      [1.3, { ...HST, chest: [4, -8, 0], ...g }],
    ],
    { edge: 'back', lag: LAG_HEAVY, events: [{ t: 0.44, name: 'swing' }] }
  );
  // ---- el martillazo (pesado): se alza por encima de la cabeza, echado
  // atrás y de puntillas (ahí se carga), y cae con una zancada; la boca da
  // en el suelo, por delante, y lo parte; abajo se queda un momento
  const SUELO = { ...HCHOP, root: [0, -38, 14], chest: [34, 0, 0], head: [-18, 0, 0] };
  const h1 = edgeClip(
    ctx,
    'h_heavy',
    1.8,
    [
      [0, { ...g }],
      [0.34, A({ ...HST, root: [0, 2, -8], chest: [-26, -6, 0], head: [-16, 4, 0] }, [-8, 178, 4], [-4, 130], { elbowR: [-0.7, 0.2, -0.6], wSlide: [0.62, 0, 0] })],
      [0.6, A({ legL: [-26, 0, 10], shinL: [18, 0, 0], legR: [24, 0, -10], shinR: [10, 0, 0], root: [0, 5, -10], chest: [-32, -4, 0], head: [-20, 2, 0] }, [-6, 186, -2], [-2, 142], { elbowR: [-0.7, 0.2, -0.6], wSlide: [0.55, 0, 0] }), 'hold'],
      [0.72, A({ ...HLUNGE, root: [0, -18, 10], chest: [18, -1, 0], head: [-10, 0, 0] }, [-5, 134, 68], [-2, 32], { elbowR: [-0.6, -0.5, -0.3] }), 'smooth', HIT],
      [0.82, A(SUELO, [-4, 60, 66], [0, -40], { elbowR: [-0.5, -0.8, 0] }), 'settle'],
      [1.12, A({ ...SUELO, root: [0, -36, 14], chest: [33, 0, 0], head: [-16, 0, 0] }, [-4, 62, 65], [0, -38], { elbowR: [-0.5, -0.8, 0] })],
      [1.42, A({ ...HST, chest: [16, 0, 0], head: [-6, 0, 0] }, [-8, 104, 52], [-12, 28])],
      [1.8, { ...g }],
    ],
    {
      lag: LAG_HEAVY,
      events: [
        { t: 0.64, name: 'swing' },
        { t: 0.82, name: 'impact' },
      ],
    }
  );
  // ---- a la carrera: un salto con el martillo en alto y el martillazo,
  // que da en el suelo
  const run = edgeClip(
    ctx,
    'h_run',
    1.16,
    [
      [0, A({ ...HST, chest: [8, -10, 0] }, [-14, 130, 44], [-40, 58], { elbowR: [-0.6, -0.4, -0.5] })],
      [0.24, A({ legL: [-60, 0, 8], shinL: [80, 0, 0], legR: [10, 0, -8], shinR: [60, 0, 0], root: [0, 14, 6], chest: [-20, -10, 0], head: [-10, 6, 0] }, [-8, 184, 10], [-6, 132], { elbowR: [-0.7, 0.2, -0.6], wSlide: [0.6, 0, 0] }), 'hold'],
      [0.36, A({ ...HLUNGE, root: [0, -14, 10], chest: [18, -2, 0], head: [-8, 0, 0] }, [-5, 132, 68], [-2, 32], { elbowR: [-0.6, -0.5, -0.3] }), 'smooth', HIT],
      [0.48, A({ ...SUELO, root: [0, -30, 16], chest: [42, 0, 0], head: [-20, 0, 0] }, [-4, 64, 70], [0, -42], { elbowR: [-0.5, -0.8, 0] }), 'settle'],
      [0.86, A({ ...HST, chest: [14, 0, 0], head: [-6, 0, 0] }, [-8, 106, 52], [-12, 26])],
      [1.16, { ...g }],
    ],
    {
      lag: LAG_HEAVY,
      events: [
        { t: 0.28, name: 'swing' },
        { t: 0.48, name: 'impact' },
      ],
    }
  );
  // ---- al salir de la voltereta: de abajo, a la derecha, hacia arriba, a la
  // izquierda
  const rl = edgeClip(
    ctx,
    'h_roll',
    0.96,
    [
      [0, A({ root: [0, -26, 0], legL: [-50, 0, 8], shinL: [80, 0, 0], legR: [16, 0, -8], shinR: [60, 0, 0], chest: [28, -30, 0], head: [-12, 14, 0] }, [-34, 66, 36], [-120, -30], { elbowR: [-0.8, -0.5, -0.2], wSlide: [0.7, 0, 0] })],
      [0.14, A({ ...HLUNGE, root: [0, -16, 6], chest: [14, 2, 0], head: [-6, 0, 0] }, [-6, 110, 62], [-8, 20], { elbowR: [-0.5, -0.6, -0.4] }), 'smooth', HIT],
      [0.28, A({ ...HST, chest: [-6, 44, 0], head: [2, -18, 0] }, [24, 166, 36], [80, 64], { elbowR: [-0.2, -0.5, -0.7] }), 'settle'],
      [0.96, { ...g }],
    ],
    { windup0: true, lag: LAG_HEAVY, events: [{ t: 0.06, name: 'swing' }] }
  );
  const C = { h_light1: l1.c, h_light2: l2.c, h_light3: l3.c, h_heavy: h1.c, h_run: run.c, h_roll: rl.c };
  const K = { snd: 'swingHammer', hitSnd: 'hitHammer' };
  const H = (c) => hitWindows(ctx, c);
  const light = [
    attack({ ...K, clip: C.h_light1, dmg: 40, st: 26, hits: H(C.h_light1), cancel: CAN[0], move: 0.88, lunge: [0.34, 0.54, 2.4], range: 2.85, arc: 110, poise: 60, dir: -1 }),
    attack({ ...K, clip: C.h_light2, dmg: 42, st: 28, hits: H(C.h_light2), cancel: CAN[1], move: 0.9, lunge: [0.36, 0.56, 2.0], range: 2.9, arc: 170, poise: 64, dir: 1 }),
    // (el pico: perfora; game/danos.js)
    attack({ ...K, clip: C.h_light3, tipo: 'perforante', dmg: 46, st: 30, hits: H(C.h_light3), cancel: CAN[2], move: 1.14, lunge: [0.44, 0.62, 2.6], range: 2.9, arc: 60, poise: 52, dir: 0 }),
  ];
  const heavy = [
    attack({
      ...K,
      clip: C.h_heavy,
      dmg: 80,
      st: 40,
      hits: H(C.h_heavy),
      cancel: 1.42,
      move: 1.48,
      lunge: [0.62, 0.8, 2.4],
      range: 3.0,
      arc: 60,
      poise: 130,
      heavy: true,
      dir: 0,
      charge: { at: 0.6, max: 1.0, dmg: 0.6 },
      impact: { r: 2.3, dmg: 0.45, tipo: 'contundente', snd: 'hammerGround' },
    }),
  ];
  const runA = attack({ ...K, clip: C.h_run, dmg: 48, st: 32, hits: H(C.h_run), cancel: 0.9, move: 0.96, lunge: [0.0, 0.38, 5.2], range: 2.9, arc: 70, poise: 80, dir: 0, impact: { r: 1.9, dmg: 0.3, tipo: 'contundente', snd: 'hammerGround' } });
  const roll = attack({ ...K, clip: C.h_roll, dmg: 32, st: 20, hits: H(C.h_roll), cancel: 0.66, move: 0.72, lunge: [0.0, 0.2, 2.6], range: 2.8, arc: 120, poise: 46, dir: -1 });
  // (romper un mueble: el golpe de derecha, que da antes que el martillazo)
  return { clips: C, light, heavy, run: runA, roll, smash: light[0] };
}

// ================================================================ registro
export const MOVESETS_BLUNT = {
  maza: {
    id: 'maza',
    item: 'maza',
    order: 3.7,
    hands: 1,
    // estela: la cabeza
    trail: [
      [0, Y, MACE.head0 - 0.04],
      [0, Y, MACE.top],
    ],
    trailColor: 0xead8bc,
    tip: [0, Y, MACE.head1],
    // (redonda: no tiene filo; lo que va por delante en cada golpe es el lado
    // de los nudillos, -Y, como el filo de las otras)
    wristMode: 'euler',
    edge: [0, -1, 0],
    guard: { ikR: [-24, 14, 24], bladeR: [-8, 58, 0], ikL: SHIELD_GUARD },
    // corriendo, alzada y algo atrás, por fuera del hombro
    runPose: { ikR: [-34, 2, 14], bladeR: [-30, 44, 0] },
    swing: [7, 24],
    block: { ikR: [-28, 20, 18], bladeR: [-18, 56, 0], ...SHIELD_UP },
    // bebiendo, abajo y abierta a la derecha, con la cabeza hacia el suelo
    healR: { ikR: [-34, -8, 14], bladeR: [-110, -60, 0] },
    moves: maceMoves,
  },
  martillo_guerra: {
    id: 'martillo_guerra',
    item: 'martillo_guerra',
    order: 2.5,
    wristMode: 'euler',
    hands: 2,
    // (las dos manos abajo, cerca del regatón)
    grip2: HAMMER.grip2,
    freeL: [0.24, 0.1, 0.14],
    elbowL: [0.6, -0.7, -0.3],
    // estela: de la garganta del pico a la boca
    trail: [
      [0, Y + 0.06, HAMMER.head],
      [0, Y - HAMMER.face, HAMMER.head],
    ],
    trailColor: 0xffd8a8,
    // (la boca: lo que da en el suelo)
    tip: [0, Y - HAMMER.face + 0.005, HAMMER.head],
    edge: [0, -1, 0],
    // en guardia, de través por delante, la cabeza a la altura de la cara, a
    // la derecha; al correr, apoyado en el hombro, con la cabeza detrás
    guard: { ikR: [-6, 22, 38], bladeR: [-30, 44, 0], elbowR: [-0.6, -0.6, -0.4] },
    runPose: { ikR: [-28, 56, 18], bladeR: [-170, 26, 0], elbowR: [-0.8, -0.2, -0.4] },
    swing: [4, 10],
    block: { ikR: [-8, 44, 32], bladeR: [-94, 8, 0], elbowR: [-0.4, -0.8, -0.2], chest: [4, -6, 0], head: [8, 4, 0] },
    blockK: { st: 1.2, chip: 0.14 },
    // (al beber, apoyado de cabeza en el suelo, como un bastón; vuelve a la
    // guardia por fuera, a la derecha)
    healR: { ikR: [-36, -6, 18], bladeR: [0, -84, 0] },
    healUp: { ikR: [-40, 22, 30], bladeR: [-30, 80, 0] },
    rollTuck: { ikR: [-64, 4, 10], bladeR: [-90, 12, -90], elbowR: [-0.6, -0.7, -0.3] },
    moves: hammerMoves,
  },
};
