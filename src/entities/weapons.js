// Armas del Condenado: registro, agarres y repertorio de golpes.
// Por el orden en que se encuentran: la espada oxidada (en el pasillo de las
// celdas) y la maza de los carceleros (en una de ellas), la espada de la
// guardia y la ballesta (en la puerta de la fortaleza), la lanza de la muralla
// (en el adarve de levante), el hacha barbada (en la barricada del Postigo, en
// la escena de la Bestia) y la espada de Solingen (en la casa de Henrique). El
// martillo de guerra, todavía en ninguna parte (será de la cripta de la Sé).
// Los golpes de la maza y el martillo, en weapon_moves_blunt.js. Cada arma
// define:
//   hands      1 (con escudo) o 2 (el escudo va a la espalda)
//   guard      guardia (IK de muñeca en cm del pecho, dirección de hoja en °)
//   carry      brazos al andar y correr
//   block      pose de bloqueo (con escudo o con el arma)
//   build(ctx) clips y ataques propios
// y sus cualidades (STATS: peso, paso, dureza, crítico, lo especial), que se
// ven en su ficha del inventario (weaponSheet) y hacen lo que dicen.
import { clip, UPPER } from './rig.js';
import { WEAPON_PARTS } from './weapon_models.js';
import { MOVESETS } from './weapon_moves.js';
import { MOVESETS_BLUNT } from './weapon_moves_blunt.js';
import { rad, attack, sstep, resolveWeaponArms, STANCE, LUNGE, SHIELD_UP, SHIELD_GUARD } from './weapon_common.js';
import { DEG, lerp } from '../core/util.js';

export { rad, attack, resolveWeaponArms };

// Brazos al andar/correr para armas de una mano: interpola entre la guardia y
// la pose de carrera; al andar, pequeño balanceo; al correr, el arma atrás.
export function carry1(W) {
  const g = W.guard,
    r = W.runPose;
  const sw0 = W.swing ? W.swing[0] : 7,
    sw1 = W.swing ? W.swing[1] : 26;
  return (pose, sw, run) => {
    pose.ikR = [lerp(g.ikR[0], r.ikR[0], run) / 100, lerp(g.ikR[1], r.ikR[1], run) / 100 + Math.abs(sw) * 0.02, (lerp(g.ikR[2], r.ikR[2], run) + sw * lerp(sw0, sw1, run)) / 100];
    pose.bladeR = [lerp(g.bladeR[0], r.bladeR[0], run) * DEG, lerp(g.bladeR[1], r.bladeR[1], run) * DEG, lerp(g.bladeR[2] || 0, r.bladeR[2] || 0, run) * DEG];
    if (g.elbowR || r.elbowR) pose.elbowR = g.elbowR || r.elbowR;
  };
}

// Armas a dos manos: al correr la izquierda suelta el mango y braccea.
export function carry2(W) {
  const g = W.guard,
    r = W.runPose;
  return (pose, sw, run) => {
    const k = sstep((run - 0.15) / 0.7);
    pose.ikR = [lerp(g.ikR[0], r.ikR[0], k) / 100, lerp(g.ikR[1], r.ikR[1], k) / 100 + Math.abs(sw) * 0.015 * (1 - k), (lerp(g.ikR[2], r.ikR[2], k) + sw * lerp(3, W.swing ? W.swing[1] : 10, k)) / 100];
    pose.bladeR = [lerp(g.bladeR[0], r.bladeR[0], k) * DEG, lerp(g.bladeR[1], r.bladeR[1], k) * DEG, lerp(g.bladeR[2] || 0, r.bladeR[2] || 0, k) * DEG];
    if (g.elbowR) pose.elbowR = k < 0.5 ? g.elbowR : r.elbowR || g.elbowR;
    // mano izquierda libre: braceo al correr
    pose.ikL = [0.24, lerp(0.12, 0.04, k) + Math.abs(sw) * 0.03, 0.12 - sw * lerp(0.08, 0.3, k)];
    pose.wGrip = [1 - k, 0, 0];
  };
}

// ---------------------------------------------------------------- clips comunes
// Voltereta, paso atrás, reacciones, curación, interacción, descanso... con
// la guardia de cada arma (G en IK, GUARD resuelta a rotaciones).
function commonClips(W, G, GUARD, BLOCK) {
  const two = W.hands === 2;
  // la voltereta: la guardia del arma (sin el brazo del escudo: ése va a
  // mano) y el arma recogida, de través; a dos manos, la izquierda la suelta
  const { ikL: _ikL, ...RG0 } = G;
  void _ikL;
  const RG = { elbowR: [-0.55, -0.75, -0.4], ...RG0 };
  // (al empezar, el cuerpo ya va echado 30° adelante: la hoja, alzada otro
  // tanto, que la de la lanza no baje la punta a las losas)
  const RG_UP = RG.bladeR ? { bladeR: [RG.bladeR[0], RG.bladeR[1] + 26, RG.bladeR[2] || 0] } : {};
  const TUCK = W.rollTuck || { ikR: [-40, 6, 16], bladeR: [-90, 6, 0], elbowR: [-0.6, -0.7, -0.3] };
  const rollGrip = (k) => (two ? { wGrip: [k, 0, 0] } : {});
  // la muerte: el arma se suelta de la otra mano y acaba tendida en el suelo,
  // a la derecha, de plano (boca abajo, el pecho mira al suelo: la hoja, en
  // su plano, hacia la cabeza y hacia fuera); antes se hundía en las losas
  // (las largas —la lanza, el hacha, la ballesta— llevan mucho detrás de la
  // mano: más por fuera, que el regatón o la culata no se metan en la cadera)
  const far = two || W.id === 'lanza' ? -16 : 0;
  const DIE = [
    { ikR: [-38, 12, 18], bladeR: [-40, 34, 0], elbowR: [-0.6, -0.6, -0.4], ...(two ? { wGrip: [1, 0, 0] } : {}) },
    { ikR: [-34 + far, -10, 22], bladeR: [-60 - far, 10, 0], elbowR: [-0.6, -0.6, -0.4], ...(two ? { wGrip: [0, 0, 0] } : {}) },
    // (la lanza, a lo largo del costado derecho, hacia la cabeza: de
    // través, su regatón pasaba por debajo de la cadera)
    { ikR: [-50 + far, 26, 12], bladeR: W.id === 'lanza' ? [180, 80, 0] : [-90, 44, 0], elbowR: [-0.6, -0.6, -0.4], ...(two ? { wGrip: [0, 0, 0] } : {}) },
  ];
  // curación: el arma baja a un lado y la izquierda bebe
  const low = W.healR || { ikR: [-26, 6, 18], bladeR: [-10, -30, 0] };
  const healKey = (extra) => ({ ...(G.elbowR ? { elbowR: G.elbowR } : {}), ...low, ...(two ? { wGrip: [0, 0, 0] } : {}), ...extra });
  return {
    // (el arma, recogida y de través, hacia fuera: en una voltereta hacia
    // delante es la única dirección que no pasa por el suelo; antes la punta
    // se metía en las losas hasta casi un metro, y la de la lanza, metro y
    // medio)
    roll: clip(
      'roll',
      0.64,
      [
        [0, { root: [0, -20, 0], chest: [30, 0, 0], legL: [-40, 0, 0], shinL: [60, 0, 0], legR: [-20, 0, 0], shinR: [60, 0, 0], armL: [-60, 0, 0], foreL: [-80, 0, 0], armR: [-50, 0, 0], foreR: [-80, 0, 0], ...RG, ...RG_UP, ...rollGrip(1) }],
        [0.05, { root: [0, -32, 0], hips: [35, 0, 0], chest: [35, 0, 0], head: [15, 0, 0], legL: [-75, 0, 0], shinL: [95, 0, 0], legR: [-60, 0, 0], shinR: [95, 0, 0], armL: [-65, 0, 0], foreL: [-90, 0, 0], armR: [-60, 0, 0], foreR: [-90, 0, 0], ...TUCK, ...rollGrip(0) }],
        [0.1, { root: [0, -45, 0], hips: [70, 0, 0], chest: [40, 0, 0], head: [30, 0, 0], legL: [-110, 0, 0], shinL: [130, 0, 0], legR: [-100, 0, 0], shinR: [130, 0, 0], armL: [-70, 0, 0], foreL: [-100, 0, 0], armR: [-70, 0, 0], foreR: [-100, 0, 0], ...TUCK, ...rollGrip(0) }],
        [0.24, { root: [0, -60, 0], hips: [180, 0, 0], chest: [45, 0, 0], head: [30, 0, 0], legL: [-120, 0, 0], shinL: [140, 0, 0], legR: [-120, 0, 0], shinR: [140, 0, 0], armL: [-70, 0, 0], foreL: [-100, 0, 0], armR: [-70, 0, 0], foreR: [-100, 0, 0], ...TUCK, ...rollGrip(0) }, 'linear'],
        [0.38, { root: [0, -48, 0], hips: [300, 0, 0], chest: [40, 0, 0], head: [20, 0, 0], legL: [-100, 0, 0], shinL: [130, 0, 0], legR: [-90, 0, 0], shinR: [120, 0, 0], armL: [-50, 0, 0], foreL: [-90, 0, 0], armR: [-50, 0, 0], foreR: [-90, 0, 0], ...TUCK, ...rollGrip(0) }, 'linear'],
        [0.5, { root: [0, -22, 0], hips: [360, 0, 0], chest: [22, 0, 0], legL: [-50, 0, 0], shinL: [80, 0, 0], legR: [-10, 0, 0], shinR: [60, 0, 0], armL: [-30, 0, 10], foreL: [-60, 0, 0], armR: [-30, 0, -10], foreR: [-60, 0, 0], ...TUCK, ...rollGrip(0) }],
        [0.64, { hips: [360, 0, 0], ...GUARD, root: [0, -6, 0], ...RG, ...rollGrip(1) }],
      ],
      { ground: false }
    ),
    backstep: clip('backstep', 0.46, [
      [0, { ...GUARD, chest: [-10, 0, 0] }],
      [0.12, { ...GUARD, root: [0, 4, 0], chest: [-16, 0, 0], legL: [-24, 0, 0], shinL: [34, 0, 0], legR: [16, 0, 0], shinR: [26, 0, 0] }],
      [0.3, { ...GUARD, root: [0, -12, 0], chest: [10, 0, 0], legL: [-20, 0, 0], shinL: [40, 0, 0], legR: [10, 0, 0], shinR: [40, 0, 0] }],
      [0.46, { ...GUARD }],
    ]),
    blockHit: clip('blockHit', 0.32, [
      [0, { ...BLOCK, chest: [(BLOCK.chest || [0, 0, 0])[0] - 20, (BLOCK.chest || [0, 0, 0])[1], 0], head: [-8, 10, 0], ...(two ? {} : { ikL: [6, 46, 26] }), root: [0, -6, -10] }, 'snap'],
      [0.32, { ...BLOCK, root: [0, 0, 0] }],
    ]),
    heal: clip(
      'heal',
      1.15,
      [
        [0, { ...G }],
        // (el hacha baja por fuera, a la derecha)
        ...(W.healUp ? [[0.14, { ...G, ...W.healUp, wGrip: [0.4, 0, 0] }]] : []),
        [0.3, healKey({ ikL: [8, 58, 26], elbowL: [1, -0.4, 0.1], head: [-5, 0, 0] })],
        [0.55, healKey({ ikL: [5, 68, 17], elbowL: [1, -0.2, 0.1], head: [-30, 0, 0], chest: [-8, 0, 0] }), 'hold'],
        [0.85, healKey({ ikL: [5, 68, 17], elbowL: [1, -0.2, 0.1], head: [-30, 0, 0], chest: [-8, 0, 0] })],
        // (el hacha sube por fuera, a la derecha, sin pasar por el cuerpo)
        ...(W.healUp ? [[1.0, { ...G, ...W.healUp, wGrip: [0.4, 0, 0] }]] : []),
        [1.15, { ...G }],
      ],
      { mask: UPPER, events: [{ t: 0.62, name: 'drink' }] }
    ),
    hurt: clip('hurt', 0.42, [
      [0, { chest: [-26, 14, 0], head: [-24, 0, 0], armL: [-40, 0, 45], foreL: [-30, 0, 0], armR: [-30, 0, -45], foreR: [-40, 0, 0], root: [0, -6, -8], legL: [-15, 0, 0], shinL: [20, 0, 0], legR: [10, 0, 0], shinR: [25, 0, 0] }, 'snap'],
      [0.42, { ...GUARD }],
    ]),
    stagger: clip('stagger', 1.0, [
      [0, { chest: [-34, -15, 0], head: [-30, 0, 0], armL: [-20, 0, 70], foreL: [-20, 0, 0], armR: [-20, 0, -70], foreR: [-20, 0, 0], root: [0, -10, -10], legL: [-25, 0, 0], shinL: [40, 0, 0], legR: [15, 0, 0], shinR: [40, 0, 0] }, 'snap'],
      [0.5, { chest: [30, 0, 0], head: [20, 0, 0], armL: [-10, 0, 30], armR: [-10, 0, -30], root: [0, -25, 0], legL: [-40, 0, 0], shinL: [60, 0, 0], legR: [-10, 0, 0], shinR: [60, 0, 0] }],
      [1.0, { ...GUARD }],
    ]),
    death: clip(
      'death',
      2.0,
      [
        [0, { chest: [-30, 0, 0], head: [-30, 0, 0], armL: [-20, 0, 40], armR: [-20, 0, -40], root: [0, -5, 0], ...DIE[0] }, 'snap'],
        [0.5, { chest: [20, 0, 0], head: [30, 0, 0], armL: [0, 0, 10], armR: [0, 0, -10], foreR: [-10, 0, 0], root: [0, -45, 0], legL: [-95, 0, 5], shinL: [100, 0, 0], legR: [-95, 0, -5], shinR: [100, 0, 0], ...DIE[1] }],
        [1.1, { hips: [80, 0, 0], chest: [10, 0, 0], head: [20, 30, 0], armL: [-160, 0, 20], armR: [-30, 0, -60], root: [0, -78, 0], legL: [-10, 0, 5], shinL: [20, 0, 0], legR: [-5, 0, -8], shinR: [30, 0, 0], ...DIE[2] }, 'in'],
        [2.0, { hips: [86, 0, 0], chest: [4, 0, 0], head: [20, 40, 0], armL: [-160, 0, 20], armR: [-30, 0, -60], root: [0, -80, 0], legL: [-4, 0, 5], shinL: [10, 0, 0], legR: [-4, 0, -8], shinR: [10, 0, 0], ...DIE[2] }],
      ],
      { ground: false }
    ),
    // derribado de espaldas (el Descoyuntado le ha caído encima): cae, se
    // queda boca arriba y forcejea (los brazos empujan, la cabeza se aparta
    // de la boca, las piernas patalean)
    pinned: clip(
      'pinned',
      3.2,
      (() => {
        const LIE = { root: [0, -80, 0], hips: [-88, 0, 0], chest: [-6, 0, 0], head: [-20, 0, 0] };
        // (el arma, de través: boca arriba, la hoja a lo largo del suelo; si
        // no, se hundía en las losas hasta metro y medio)
        const PIN = (z) => ({ ikR: [-30, 8, z], bladeR: [-90, 0, 0], elbowR: [-0.6, -0.6, -0.4], ...(two ? { wGrip: [0, 0, 0] } : {}) });
        const K = [
          [0, { ...GUARD, ...RG, ...(two ? { wGrip: [1, 0, 0] } : {}) }],
          [0.16, { root: [0, -34, 0], hips: [-38, 0, 0], chest: [-22, 0, 0], head: [-28, 0, 0], armL: [-120, 0, 40], foreL: [-40, 0, 0], armR: [-120, 0, -40], foreR: [-40, 0, 0], legL: [-60, 0, 8], shinL: [70, 0, 0], legR: [-40, 0, -8], shinR: [60, 0, 0], ...PIN(36) }],
          [0.34, { ...LIE, armL: [-150, 0, 25], foreL: [-60, 0, 0], armR: [-150, 0, -25], foreR: [-60, 0, 0], legL: [-50, 0, 10], shinL: [80, 0, 0], legR: [-30, 0, -10], shinR: [70, 0, 0], ...PIN(44) }, 'snap'],
        ];
        for (let i = 0; i < 8; i++) {
          const s = i % 2 ? 1 : -1;
          K.push([
            0.62 + i * 0.32,
            {
              ...LIE,
              chest: [-10, 12 * s, 0],
              head: [-6, 34 * s, 0],
              armL: [s > 0 ? -160 : -134, 0, s > 0 ? 15 : 36],
              foreL: [s > 0 ? -28 : -76, 0, 0],
              armR: [s > 0 ? -134 : -160, 0, s > 0 ? -36 : -15],
              foreR: [s > 0 ? -76 : -28, 0, 0],
              legL: [s > 0 ? -72 : -22, 0, 10],
              shinL: [s > 0 ? 100 : 40, 0, 0],
              legR: [s > 0 ? -22 : -72, 0, -10],
              shinR: [s > 0 ? 40 : 100, 0, 0],
              ...PIN(s > 0 ? 40 : 48),
            },
          ]);
        }
        return K;
      })(),
      { ground: false }
    ),
    // se levanta: se incorpora, apoya una rodilla y se pone en guardia
    getup: clip(
      'getup',
      1.05,
      [
        [0, { root: [0, -80, 0], hips: [-88, 0, 0], chest: [-6, 0, 0], head: [-10, 0, 0], armL: [-40, 0, 50], armR: [-40, 0, -50], legL: [-30, 0, 8], shinL: [50, 0, 0], legR: [-20, 0, -8], shinR: [40, 0, 0] }],
        [0.32, { root: [0, -72, 0], hips: [-20, 0, 0], chest: [30, 0, 0], head: [30, 0, 0], armL: [20, 0, 20], foreL: [-30, 0, 0], armR: [20, 0, -20], foreR: [-30, 0, 0], legL: [-90, 0, 10], shinL: [40, 0, 0], legR: [-80, 0, -10], shinR: [60, 0, 0] }],
        [0.66, { root: [0, -42, 0], chest: [30, 0, 0], head: [20, 0, 0], legL: [-95, 0, 6], shinL: [95, 0, 0], legR: [5, 0, -4], shinR: [100, 0, 0], armL: [-40, 0, 10], foreL: [-40, 0, 0], armR: [-40, 0, -10], foreR: [-40, 0, 0] }],
        [1.05, { ...GUARD }],
      ],
      { ground: false }
    ),
    interact: clip('interact', 0.7, [
      [0, { ...GUARD }],
      [0.25, { root: [0, -35, 0], chest: [40, 0, 0], head: [20, 0, 0], legL: [-70, 0, 5], shinL: [100, 0, 0], legR: [-20, 0, -5], shinR: [80, 0, 0], armL: [-60, 0, 10], foreL: [-10, 0, 0], armR: [-20, 0, -10], foreR: [-60, 0, 0] }],
      [0.45, { root: [0, -35, 0], chest: [40, 0, 0], head: [20, 0, 0], legL: [-70, 0, 5], shinL: [100, 0, 0], legR: [-20, 0, -5], shinR: [80, 0, 0], armL: [-70, 0, 10], foreL: [-30, 0, 0], armR: [-20, 0, -10], foreR: [-60, 0, 0] }],
      [0.7, { ...GUARD }],
    ]),
    push: clip('push', 0.8, [
      [0, { ...GUARD }],
      [0.3, { chest: [20, 0, 0], armL: [-85, 0, 5], foreL: [-15, 0, 0], armR: [-85, 0, -5], foreR: [-15, 0, 0], legL: [-30, 0, 0], shinL: [20, 0, 0], legR: [25, 0, 0], shinR: [10, 0, 0] }],
      [0.6, { chest: [25, 0, 0], armL: [-80, 0, 5], foreL: [-5, 0, 0], armR: [-80, 0, -5], foreR: [-5, 0, 0], legL: [-35, 0, 0], shinL: [20, 0, 0], legR: [30, 0, 0], shinR: [10, 0, 0] }],
      [0.8, { ...GUARD }],
    ]),
    // echar una palanca de pared: la agarra en alto y la baja a tirones, con
    // todo el cuerpo (siete tirones; las manos, cada vez más abajo)
    pull: clip(
      'pull',
      7.6,
      (() => {
        const arm = (u) => -155 + 115 * u;
        const K = [[0, { ...GUARD }]];
        K.push([0.28, { chest: [-8, 0, 0], head: [-15, 0, 0], armL: [-155, 0, 8], foreL: [-20, 0, 0], armR: [-155, 0, -8], foreR: [-20, 0, 0], legL: [-10, 0, 0], shinL: [10, 0, 0], legR: [15, 0, 0], shinR: [5, 0, 0] }]);
        for (let i = 0; i < 7; i++) {
          const t0 = 0.3 + i * (7.0 / 7);
          const u0 = i / 7,
            u1 = (i + 1) / 7;
          // se afianza (tensión, casi quieto) y da el tirón
          K.push([t0 + 0.45, { chest: [-6 + u0 * 20, 0, 0], head: [-10 + u0 * 20, 0, 0], armL: [arm(u0), 0, 8], foreL: [-30, 0, 0], armR: [arm(u0), 0, -8], foreR: [-30, 0, 0], legL: [-25, 0, 0], shinL: [30, 0, 0], legR: [18, 0, 0], shinR: [22, 0, 0], root: [0, -10, 0] }]);
          K.push([t0 + 0.85, { chest: [10 + u1 * 24, 0, 0], head: [5 + u1 * 15, 0, 0], armL: [arm(u1), 0, 10], foreL: [-22, 0, 0], armR: [arm(u1), 0, -10], foreR: [-22, 0, 0], legL: [-42, 0, 0], shinL: [62, 0, 0], legR: [10, 0, 0], shinR: [50, 0, 0], root: [0, -26, 0] }]);
        }
        K.push([7.6, { ...GUARD }]);
        return K;
      })()
    ),
    // la palanca de un atajo: la agarra en alto, se afianza y la baja de un
    // solo tirón, con todo el cuerpo (el mango cede a los 1,3 s)
    pullQuick: clip('pullQuick', 1.6, [
      [0, { ...GUARD }],
      [0.28, { chest: [-8, 0, 0], head: [-15, 0, 0], armL: [-155, 0, 8], foreL: [-20, 0, 0], armR: [-155, 0, -8], foreR: [-20, 0, 0], legL: [-10, 0, 0], shinL: [10, 0, 0], legR: [15, 0, 0], shinR: [5, 0, 0] }],
      [0.7, { chest: [-4, 0, 0], head: [-8, 0, 0], armL: [-150, 0, 8], foreL: [-30, 0, 0], armR: [-150, 0, -8], foreR: [-30, 0, 0], legL: [-25, 0, 0], shinL: [30, 0, 0], legR: [18, 0, 0], shinR: [22, 0, 0], root: [0, -10, 0] }],
      [1.3, { chest: [34, 0, 0], head: [20, 0, 0], armL: [-40, 0, 10], foreL: [-22, 0, 0], armR: [-40, 0, -10], foreR: [-22, 0, 0], legL: [-42, 0, 0], shinL: [62, 0, 0], legR: [10, 0, 0], shinR: [50, 0, 0], root: [0, -26, 0] }],
      [1.6, { ...GUARD }],
    ]),
    rest: clip('rest', 1.0, [[0, { root: [0, -48, 0], chest: [22, 0, 0], head: [35, 0, 0], legL: [-95, 0, 6], shinL: [95, 0, 0], legR: [5, 0, -4], shinR: [100, 0, 0], armR: [-48, 0, -6], foreR: [-45, 0, 0], handR: [60, 0, 0], armL: [-48, 0, 6], foreL: [-60, 0, 0] }]], { ground: false }),
    // ---- secuencias con la Bestia de Carne (las mueve el guion)
    // salto a la carrera: se impulsa, encoge las piernas y prepara la caída
    jump: clip(
      'jump',
      0.75,
      [
        [0, { root: [0, -14, 0], chest: [24, 0, 0], legL: [-34, 0, 4], shinL: [56, 0, 0], legR: [22, 0, -4], shinR: [34, 0, 0], armL: [30, 0, 12], foreL: [-30, 0, 0], armR: [34, 0, -12], foreR: [-30, 0, 0] }],
        [0.14, { root: [0, 2, 0], chest: [14, 0, 0], head: [-10, 0, 0], legL: [-64, 0, 4], shinL: [88, 0, 0], legR: [26, 0, -4], shinR: [12, 0, 0], armL: [-100, 0, 24], foreL: [-30, 0, 0], armR: [-96, 0, -24], foreR: [-30, 0, 0] }, 'snap'],
        [0.42, { root: [0, 0, 0], chest: [26, 0, 0], head: [-14, 0, 0], legL: [-84, 0, 4], shinL: [112, 0, 0], legR: [-54, 0, -4], shinR: [104, 0, 0], armL: [-126, 0, 34], foreL: [-20, 0, 0], armR: [-120, 0, -34], foreR: [-20, 0, 0] }],
        [0.75, { root: [0, -34, 0], chest: [32, 0, 0], head: [-6, 0, 0], legL: [-62, 0, 6], shinL: [94, 0, 0], legR: [-22, 0, -6], shinR: [84, 0, 0], armL: [-46, 0, 34], foreL: [-40, 0, 0], armR: [-46, 0, -34], foreR: [-40, 0, 0] }],
      ],
      { ground: false }
    ),
    // deslizarse de rodillas a la carrera (por debajo de la viga que arde):
    // la pierna de delante estirada, la otra rodilla en el suelo, el cuerpo
    // echado atrás y la cabeza mirando adelante; y vuelta a correr
    slide: clip(
      'slide',
      0.9,
      [
        [0, { root: [0, -12, 0], chest: [22, 0, 0], legL: [-40, 0, 4], shinL: [60, 0, 0], legR: [22, 0, -4], shinR: [40, 0, 0], armL: [-30, 0, 20], foreL: [-40, 0, 0], armR: [-36, 0, -20], foreR: [-50, 0, 0] }],
        [0.13, { root: [0, -50, 0], hips: [-34, 0, 0], chest: [-12, 0, 0], head: [34, 0, 0], legL: [-26, 0, 6], shinL: [6, 0, 0], legR: [44, 0, -6], shinR: [118, 0, 0], armL: [-24, 0, 52], foreL: [-30, 0, 0], armR: [-50, 0, -36], foreR: [-60, 0, 0] }, 'snap'],
        [0.6, { root: [0, -48, 0], hips: [-30, 0, 0], chest: [-8, 0, 0], head: [30, 0, 0], legL: [-30, 0, 6], shinL: [10, 0, 0], legR: [42, 0, -6], shinR: [116, 0, 0], armL: [-28, 0, 46], foreL: [-34, 0, 0], armR: [-52, 0, -32], foreR: [-62, 0, 0] }],
        [0.9, { root: [0, -14, 0], chest: [26, 0, 0], legL: [-50, 0, 4], shinL: [70, 0, 0], legR: [12, 0, -4], shinR: [50, 0, 0], armL: [-30, 0, 20], foreL: [-40, 0, 0], armR: [-36, 0, -20], foreR: [-50, 0, 0] }],
      ],
      { ground: false }
    ),
    // agacharse de golpe (un zarpazo le pasa por encima de la cabeza)
    duck: clip(
      'duck',
      0.8,
      [
        [0, { ...GUARD }],
        [0.12, { root: [0, -55, 0], hips: [20, 0, 0], chest: [40, 0, 0], head: [10, 0, 0], legL: [-110, 0, 8], shinL: [135, 0, 0], legR: [-80, 0, -8], shinR: [122, 0, 0], armL: [-50, 0, 30], foreL: [-70, 0, 0], armR: [-60, 0, -30], foreR: [-80, 0, 0] }, 'snap'],
        [0.5, { root: [0, -52, 0], hips: [18, 0, 0], chest: [36, 0, 0], head: [6, 0, 0], legL: [-108, 0, 8], shinL: [132, 0, 0], legR: [-78, 0, -8], shinR: [120, 0, 0], armL: [-50, 0, 30], foreL: [-70, 0, 0], armR: [-60, 0, -30], foreR: [-80, 0, 0] }],
        [0.8, { ...GUARD }],
      ],
      { ground: false }
    ),
    // colgado del borde por las manos, pataleando
    hang: clip(
      'hang',
      1.0,
      [
        [0, { armL: [-170, 0, 14], foreL: [-12, 0, 0], armR: [-170, 0, -14], foreR: [-12, 0, 0], chest: [-8, 0, 0], head: [-26, 0, 0], legL: [-24, 0, 4], shinL: [30, 0, 0], legR: [12, 0, -4], shinR: [44, 0, 0] }],
        [0.5, { armL: [-168, 0, 12], foreL: [-18, 0, 0], armR: [-172, 0, -12], foreR: [-8, 0, 0], chest: [-4, 6, 0], head: [-30, 0, 0], legL: [14, 0, 4], shinL: [46, 0, 0], legR: [-28, 0, -4], shinR: [26, 0, 0] }],
        [1.0, { armL: [-170, 0, 14], foreL: [-12, 0, 0], armR: [-170, 0, -14], foreR: [-12, 0, 0], chest: [-8, 0, 0], head: [-26, 0, 0], legL: [-24, 0, 4], shinL: [30, 0, 0], legR: [12, 0, -4], shinR: [44, 0, 0] }],
      ],
      { ground: false, loop: true }
    ),
    // se encarama: tira de los brazos, apoya el pecho y sube una rodilla
    climbUp: clip(
      'climbUp',
      0.95,
      [
        [0, { armL: [-170, 0, 14], foreL: [-12, 0, 0], armR: [-170, 0, -14], foreR: [-12, 0, 0], chest: [-8, 0, 0], head: [-26, 0, 0], legL: [-24, 0, 4], shinL: [30, 0, 0], legR: [12, 0, -4], shinR: [44, 0, 0] }],
        [0.36, { armL: [-124, 0, 22], foreL: [-104, 0, 0], armR: [-124, 0, -22], foreR: [-104, 0, 0], chest: [30, 0, 0], head: [12, 0, 0], legL: [-44, 0, 4], shinL: [70, 0, 0], legR: [6, 0, -4], shinR: [40, 0, 0] }],
        [0.66, { root: [0, -42, 0], chest: [50, 0, 0], head: [16, 0, 0], armL: [-40, 0, 22], foreL: [-60, 0, 0], armR: [-40, 0, -22], foreR: [-60, 0, 0], legL: [-104, 0, 6], shinL: [124, 0, 0], legR: [-20, 0, -4], shinR: [66, 0, 0] }],
        [0.95, { ...GUARD }],
      ],
      { ground: false }
    ),
    // el salto de fe: dos zancadas, el impulso y los brazos abiertos en el aire
    leap: clip(
      'leap',
      1.3,
      [
        [0, { root: [0, -10, 0], chest: [20, 0, 0], legL: [-40, 0, 4], shinL: [50, 0, 0], legR: [26, 0, -4], shinR: [30, 0, 0], armL: [40, 0, 14], armR: [40, 0, -14] }],
        [0.2, { root: [0, 4, 0], chest: [8, 0, 0], head: [-16, 0, 0], legL: [-30, 0, 4], shinL: [20, 0, 0], legR: [40, 0, -4], shinR: [24, 0, 0], armL: [-60, 0, 50], armR: [-60, 0, -50] }, 'snap'],
        [0.5, { root: [0, 0, 0], hips: [-8, 0, 0], chest: [-22, 0, 0], head: [-34, 0, 0], armL: [-86, 0, 84], foreL: [-6, 0, 0], armR: [-86, 0, -84], foreR: [-6, 0, 0], legL: [12, 0, 6], shinL: [22, 0, 0], legR: [26, 0, -6], shinR: [30, 0, 0] }],
        [1.3, { root: [0, 0, 0], hips: [-10, 0, 0], chest: [-24, 0, 0], head: [-30, 0, 0], armL: [-90, 0, 88], foreL: [-4, 0, 0], armR: [-90, 0, -88], foreR: [-4, 0, 0], legL: [16, 0, 6], shinL: [26, 0, 0], legR: [30, 0, -6], shinR: [34, 0, 0] }],
      ],
      { ground: false }
    ),
    // cae de espaldas (en la paja, o derribado): luego se levanta (getup)
    fallBack: clip(
      'fallBack',
      0.4,
      [
        [0, { root: [0, -10, 0], hips: [-20, 0, 0], chest: [-20, 0, 0], head: [-20, 0, 0], armL: [-60, 0, 60], armR: [-60, 0, -60], legL: [-40, 0, 6], shinL: [40, 0, 0], legR: [-20, 0, -6], shinR: [50, 0, 0] }],
        [0.4, { root: [0, -80, 0], hips: [-88, 0, 0], chest: [-6, 0, 0], head: [-10, 0, 0], armL: [-40, 0, 50], armR: [-40, 0, -50], legL: [-30, 0, 8], shinL: [50, 0, 0], legR: [-20, 0, -8], shinR: [40, 0, 0] }, 'snap'],
      ],
      { ground: false }
    ),
    wake: clip(
      'wake',
      3.4,
      [
        [0, { root: [0, -80, 0], hips: [-88, 0, 0], chest: [-4, 0, 0], head: [-10, 30, 0], armL: [-10, 0, 60], armR: [-20, 0, -50], legL: [-4, 0, 6], legR: [-6, 0, -6] }],
        [1.2, { root: [0, -80, 0], hips: [-88, 0, 0], chest: [-4, 0, 0], head: [-10, -20, 0], armL: [-10, 0, 60], armR: [-20, 0, -50], legL: [-4, 0, 6], legR: [-6, 0, -6] }],
        [1.9, { root: [0, -72, 0], hips: [-20, 0, 0], chest: [30, 0, 0], head: [30, 0, 0], armL: [20, 0, 20], foreL: [-30, 0, 0], armR: [20, 0, -20], foreR: [-30, 0, 0], legL: [-90, 0, 10], shinL: [40, 0, 0], legR: [-80, 0, -10], shinR: [60, 0, 0] }],
        [2.6, { root: [0, -48, 0], chest: [30, 0, 0], head: [25, 0, 0], legL: [-95, 0, 6], shinL: [95, 0, 0], legR: [5, 0, -4], shinR: [100, 0, 0], armL: [-40, 0, 10], foreL: [-40, 0, 0], armR: [-40, 0, -10], foreR: [-40, 0, 0] }],
        [3.4, { head: [10, 0, 0], armL: [0, 0, 5], armR: [0, 0, -5] }],
      ],
      { ground: false }
    ),
  };
}

// ---------------------------------------------------------------- parry
// Animaciones del parry (desvío): parten de la guardia del arma y salen al
// encuentro del golpe con un tirón seco (curva 'snap'), se quedan un
// instante en el desvío (la ventana para el golpe de gracia) y vuelven.
// Dos variantes que se alternan en los parrys seguidos (combos de varios
// golpes): con escudo, A lo saca hacia fuera y aparta el golpe a la
// izquierda, B lo alza y lo desvía hacia arriba; el arma queda atrás,
// lista. A dos manos, A barre el golpe hacia la derecha con la hoja (o el
// mango del hacha) en alto y B lo aparta hacia la izquierda.
const POLES = { elbowR: [-0.55, -0.75, -0.4], elbowL: [0.9, -0.25, -0.35] };
// (un polo de codo ausente en una clave valdría [0,0,0] y el codo saltaría)
function pclip(name, dur, keys) {
  for (const j in POLES) if (keys.some((k) => k[1][j])) for (const k of keys) if (!k[1][j]) k[1] = { ...k[1], [j]: POLES[j] };
  return clip(name, dur, keys, { mono: true });
}
function parryClips(W, G, BLOCK) {
  const two = W.hands === 2;
  const add = (a, b) => a.map((v, i) => v + (b[i] || 0));
  const S0 = { legL: [12, 0, 4], shinL: [14, 0, 0], legR: [-20, 0, -4], shinR: [22, 0, 0], root: [0, -6, 2] };
  const S1 = { legL: [18, 0, 4], shinL: [16, 0, 0], legR: [-28, 0, -4], shinR: [30, 0, 0], root: [0, -11, 4] };
  const B = { ...BLOCK };
  const ikR = B.ikR,
    bl = B.bladeR;
  const end = { ...G, ...S0, root: [0, -4, 0] };
  if (!two) {
    return {
      parryA: pclip('parryA', 0.46, [
        [0, { ...B, ...S0 }],
        [0.07, { ...B, ...S1, ikL: [24, 50, 50], elbowL: [0.9, -0.1, -0.2], chest: [10, 22, 0], head: [4, -8, 0], ikR: add(ikR, [-6, 8, -3]), bladeR: add(bl, [-14, 18, 0]) }, 'snap'],
        [0.2, { ...B, ...S1, ikL: [30, 44, 40], elbowL: [0.9, -0.2, -0.3], chest: [8, 26, 0], head: [4, -10, 0], ikR: add(ikR, [-6, 10, -2]), bladeR: add(bl, [-16, 20, 0]) }],
        [0.46, end],
      ]),
      parryB: pclip('parryB', 0.46, [
        [0, { ...B, ...S0 }],
        [0.07, { ...B, ...S1, ikL: [0, 66, 46], elbowL: [0.9, 0.1, -0.3], chest: [6, -28, 0], head: [10, 14, 0], ikR: add(ikR, [-6, 4, -3]), bladeR: add(bl, [-12, 16, 0]) }, 'snap'],
        [0.2, { ...B, ...S1, ikL: [6, 70, 38], elbowL: [0.9, 0, -0.35], chest: [4, -22, 0], head: [10, 12, 0], ikR: add(ikR, [-6, 6, -2]), bladeR: add(bl, [-14, 18, 0]) }],
        [0.46, end],
      ]),
    };
  }
  return {
    parryA: pclip('parryA', 0.44, [
      [0, { ...B, ...S0 }],
      [0.06, { ...B, ...S1, ikR: add(ikR, [-12, 8, 14]), bladeR: add(bl, [40, 34, 0]), chest: [6, -24, 0], head: [4, 12, 0] }, 'snap'],
      [0.2, { ...B, ...S1, ikR: add(ikR, [-14, 6, 8]), bladeR: add(bl, [48, 40, 0]), chest: [6, -28, 0], head: [4, 14, 0] }],
      [0.44, end],
    ]),
    parryB: pclip('parryB', 0.44, [
      [0, { ...B, ...S0 }],
      [0.06, { ...B, ...S1, ikR: add(ikR, [10, 12, 12]), bladeR: add(bl, [-24, 46, 0]), chest: [8, 18, 0], head: [6, -10, 0] }, 'snap'],
      [0.2, { ...B, ...S1, ikR: add(ikR, [12, 14, 6]), bladeR: add(bl, [-30, 52, 0]), chest: [8, 22, 0], head: [6, -12, 0] }],
      [0.44, end],
    ]),
  };
}

// ---------------------------------------------------------------- espada
// La espada larga de la guardia: el repertorio original, sin cambios.
function swordMoves({ G }) {
  const C = {
    light1: clip(
      'light1',
      0.62,
      [
        [0, { ...STANCE, root: [0, -2, 0], chest: [4, -16, 0], ...G }],
        [0.14, { ...STANCE, chest: [8, -52, 0], head: [0, 20, 0], ikR: [-48, 64, 2], bladeR: [-156, 40, 0], elbowR: [-0.7, -0.1, -0.7], ikL: [22, 18, 24] }, 'hold'],
        [0.26, { ...STANCE, root: [0, -7, 4], chest: [14, 46, 0], head: [-4, -24, 0], ikR: [20, 6, 46], bladeR: [72, -28, 0], elbowR: [-0.4, -0.8, -0.3], ikL: [28, 14, 12] }, 'snap'],
        [0.4, { ...STANCE, root: [0, -6, 3], chest: [12, 58, 0], head: [-2, -26, 0], ikR: [30, 2, 30], bladeR: [112, -38, 0], elbowR: [-0.3, -0.8, -0.4], ikL: [28, 16, 12] }],
        [0.62, { ...G, chest: [2, 6, 0] }],
      ],
      { events: [{ t: 0.17, name: 'swing' }] }
    ),
    light2: clip(
      'light2',
      0.6,
      [
        [0, { ...STANCE, chest: [8, 50, 0], ikR: [26, 4, 36], bladeR: [100, -30, 0], elbowR: [-0.3, -0.8, -0.4], ikL: [28, 16, 14] }],
        [0.12, { ...STANCE, chest: [8, 60, 0], head: [0, -20, 0], ikR: [26, 56, 10], bladeR: [152, 32, 0], elbowR: [0.2, -0.3, -0.9], ikL: [28, 14, 10] }, 'hold'],
        [0.25, { ...STANCE, root: [0, -7, 4], chest: [12, -48, 0], head: [0, 22, 0], ikR: [-42, 22, 40], bladeR: [-82, -4, 0], elbowR: [-0.6, -0.7, -0.2], ikL: [14, 24, 30] }, 'snap'],
        [0.38, { ...STANCE, root: [0, -6, 3], chest: [10, -58, 0], head: [0, 24, 0], ikR: [-50, 22, 20], bladeR: [-122, -10, 0], elbowR: [-0.6, -0.7, -0.2], ikL: [14, 24, 30] }],
        [0.6, { ...G, chest: [2, -6, 0] }],
      ],
      { events: [{ t: 0.16, name: 'swing' }] }
    ),
    light3: clip(
      'light3',
      0.84,
      [
        [0, { ...STANCE, chest: [-4, -10, 0], ikR: [-22, 34, 22], bladeR: [0, 62, 0], ikL: [18, 22, 26] }],
        [0.24, { ...STANCE, root: [0, 2, -4], chest: [-18, -12, 0], head: [-8, 0, 0], ikR: [-26, 94, -6], bladeR: [-12, 126, 0], elbowR: [-0.8, 0.1, -0.5], ikL: [20, 26, 24] }, 'hold'],
        [0.36, { ...LUNGE, chest: [30, 0, 0], head: [-12, 0, 0], ikR: [-10, 4, 54], bladeR: [4, -10, 0], elbowR: [-0.5, -0.8, 0], ikL: [20, 12, 22] }, 'snap'],
        [0.56, { ...LUNGE, chest: [26, 0, 0], head: [-8, 0, 0], ikR: [-10, 2, 52], bladeR: [4, -14, 0], elbowR: [-0.5, -0.8, 0], ikL: [20, 12, 22] }],
        [0.84, { ...G }],
      ],
      { events: [{ t: 0.29, name: 'swing' }] }
    ),
    heavy: clip(
      'heavy',
      1.05,
      [
        [0, { ...G, root: [0, -2, 0] }],
        [0.2, { legL: [20, 0, 8], shinL: [20, 0, 0], legR: [-24, 0, -8], shinR: [26, 0, 0], root: [0, -4, -3], chest: [-12, 14, 0], head: [-6, -8, 0], ikR: [-30, 72, 4], bladeR: [-10, 112, 0], elbowR: [-0.8, 0, -0.5], ikL: [16, 30, 26] }],
        [0.4, { legL: [20, 0, 8], shinL: [20, 0, 0], legR: [-30, 0, -8], shinR: [30, 0, 0], root: [0, -2, -5], chest: [-26, 12, 0], head: [-12, -6, 0], ikR: [-36, 96, -12], bladeR: [-16, 162, 0], elbowR: [-0.8, 0.2, -0.4], ikL: [16, 34, 24] }, 'hold'],
        [0.53, { legL: [36, 0, 6], shinL: [10, 0, 0], legR: [-56, 0, -4], shinR: [56, 0, 0], root: [0, -24, 14], chest: [42, 0, 0], head: [-20, 0, 0], ikR: [6, 2, 62], bladeR: [10, 4, 0], elbowR: [-0.5, -0.8, 0], ikL: [22, 8, 20] }, 'snap'],
        [0.78, { legL: [36, 0, 6], shinL: [10, 0, 0], legR: [-56, 0, -4], shinR: [56, 0, 0], root: [0, -22, 14], chest: [38, 0, 0], head: [-14, 0, 0], ikR: [6, 0, 60], bladeR: [10, 2, 0], elbowR: [-0.5, -0.8, 0], ikL: [22, 8, 20] }],
        [1.05, { ...G }],
      ],
      { events: [{ t: 0.45, name: 'swing' }] }
    ),
  };
  // hit: ventana de impacto; cancel: desde cuándo se encadena otro ataque o
  // se rueda; move: desde cuándo moverse corta la recuperación.
  const light = [
    attack({ clip: C.light1, dmg: 20, st: 13, hit: [0.18, 0.3], cancel: 0.34, move: 0.46, lunge: [0.06, 0.28, 2.8], range: 2.35, arc: 130, poise: 18, dir: -1 }),
    attack({ clip: C.light2, dmg: 22, st: 13, hit: [0.17, 0.29], cancel: 0.33, move: 0.45, lunge: [0.06, 0.26, 2.6], range: 2.35, arc: 130, poise: 18, dir: 1 }),
    attack({ clip: C.light3, dmg: 31, st: 17, hit: [0.3, 0.42], cancel: 0.56, move: 0.62, lunge: [0.22, 0.4, 3.6], range: 2.5, arc: 80, poise: 32, dir: 0 }),
  ];
  const heavy = [attack({ clip: C.heavy, dmg: 54, st: 30, hit: [0.46, 0.6], cancel: 0.8, move: 0.86, lunge: [0.4, 0.58, 3.8], range: 2.65, arc: 90, poise: 70, heavy: true, dir: 0 })];
  // ataque en carrera: el tajo vertical con una zancada larga
  const run = attack({ clip: C.light3, dmg: 30, st: 18, hit: [0.3, 0.42], cancel: 0.56, move: 0.62, lunge: [0.02, 0.4, 5.6], range: 2.5, arc: 80, poise: 34, dir: 0 });
  const roll = { ...light[0], dmg: 24 };
  return { clips: C, light, heavy, run, roll };
}

// ---------------------------------------------------------------- la familia
// Las espadas de la familia de la de la guardia (la oxidada, la de Solingen)
// se manejan igual: cambia lo que cortan (filo: el daño de cada golpe), lo
// que cansan (st: su aguante) y lo que alcanzan (la hoja, más corta o más
// larga). Lo que pesan (y con ello lo deprisa que van) está en STATS.
function swordVariant({ filo = 1, st = 1, alcance = 1 }) {
  return (o) => {
    const M = swordMoves(o);
    const f = (a) => ({ ...a, dmg: Math.round(a.dmg * filo), st: Math.round(a.st * st), range: Math.round(a.range * alcance * 100) / 100 });
    return { clips: M.clips, light: M.light.map(f), heavy: M.heavy.map(f), run: f(M.run), roll: f(M.roll) };
  };
}

// ---------------------------------------------------------------- Solingen
// La espada del padre de Henrique: de la misma familia que la de la guardia,
// pero su acero corta un 35 % más y su hoja es algo más larga.
const SOLINGEN_K = 1.35;
const solingenMoves = swordVariant({ filo: SOLINGEN_K, alcance: 1.04 });

// ---------------------------------------------------------------- la oxidada
// Una espada de munición de la guarnición, comida de herrumbre (la que
// mataron al guardia del pasillo de las celdas): se maneja como la de la
// guardia, pesa menos (cada golpe cansa algo menos y va algo más deprisa),
// la hoja es más corta y corta menos de la mitad (la mitad, y de eso un 15 %
// menos); contra armadura, la mitad también (ver CALIDAD).
const OXIDADA_K = 0.5 * 0.85;
const oxidadaMoves = swordVariant({ filo: OXIDADA_K, st: 0.85, alcance: 0.94 });
// su golpe de gracia: la mitad del que daba (la mitad del de la guardia),
// aparte de su filo: la cuarta parte del de la guardia
const OXIDADA_GRACIA = Math.round((108 * 0.5) / 2);

// ---------------------------------------------------------------- registro
export const WEAPON_ORDER = ['hacha', 'martillo_guerra', 'lanza', 'oxidada', 'maza', 'espada', 'solingen', 'ballesta'];

// La calidad de cada arma contra armadura (PLAN_CASTILLO.md, §10): la parte
// del daño que pasa a quien la lleva (por ahora, el Caballero de la Orden).
// La espada de Solingen pasa entera.
// Lo que no corta, abolla: la maza pasa casi entera, y el martillo de guerra,
// que se hizo para abrir yelmos, casi todo.
export const CALIDAD = { oxidada: 0.5, espada: 0.65, lanza: 0.7, hacha: 0.75, ballesta: 0.75, solingen: 1, maza: 0.85, martillo_guerra: 0.95 };

// ---------------------------------------------------------------- cualidades
// Lo que distingue a cada arma, a la vista en el inventario (con barras, a lo
// Dark Souls, comparada con la que se empuña: weaponSheet) y de verdad en la
// pelea:
//   peso     kg. Cuanto más pesa, más despacio va y mejor ataja (dureza).
//   vel      el paso de sus golpes (×; 1, como se animaron): la oxidada, más
//            ligera, algo más deprisa; la de Solingen, algo más despacio.
//   dureza   0-100: lo bien que ataja (con la de la guardia, DUREZA_REF, todo
//            queda como siempre; ver durezaK).
//   critico  la probabilidad de que un golpe cualquiera salga crítico (además
//            de los de siempre: por la espalda, sin que se lo espere, tras
//            un parry...).
//   especial lo suyo, en palabras (el inventario lo lista bajo las barras).
//   dano     el tipo de daño de sus golpes (game/danos.js): el principal y,
//            si es especial, el secundario, el de los golpes de su repertorio
//            que no son como los demás (segundo: cuáles, en palabras). Las
//            espadas sólo cortan y la maza sólo aplasta; la lanza estoca y su
//            barrido con el asta aplasta; el hacha corta y la onda del suelo que
//            parte aplasta; el martillo de guerra aplasta y su pico (el remate y
//            el golpe de gracia) perfora; la ballesta perfora (el virote) y su
//            culatazo aplasta.
// Lo demás (el daño, el alcance, el aguante de cada golpe) sale de su
// repertorio: weapon_moves.js y, para la familia de la espada, swordVariant.
export const STATS = {
  hacha: {
    peso: 2.6,
    dureza: 85,
    critico: 0.05,
    dano: ['cortante', 'contundente'],
    segundo: 'La onda del suelo que parte, contundente.',
    especial: ['A dos manos: el escudo, a la espalda.', 'Cada golpe quiebra la guardia.', 'El pesado se carga y parte el suelo.'],
  },
  lanza: {
    peso: 2.2,
    dureza: 55,
    critico: 0.08,
    dano: ['perforante', 'contundente'],
    segundo: 'El barrido con el asta, contundente.',
    especial: ['Una mano: el escudo, al brazo.', 'La que más alcanza: mantiene a raya.', 'Estocada sin bajar el escudo.'],
  },
  oxidada: {
    peso: 1.0,
    vel: 1.06,
    dureza: 35,
    critico: 0.03,
    dano: ['cortante'],
    especial: ['Una mano: el escudo, al brazo.', 'Herrumbre: contra armadura, la mitad.', 'Ligera: cansa menos y va más deprisa.'],
  },
  espada: {
    peso: 1.3,
    dureza: 60,
    critico: 0.06,
    dano: ['cortante'],
    especial: ['Una mano: el escudo, al brazo.', 'Equilibrada en todo.'],
  },
  solingen: {
    peso: 1.4,
    vel: 0.97,
    dureza: 72,
    critico: 0.08,
    dano: ['cortante'],
    especial: ['Una mano: el escudo, al brazo.', 'Acero de Solingen: pasa la armadura.', 'Hoja larga: alcanza más, va más despacio.'],
  },
  martillo_guerra: {
    peso: 3.8,
    dureza: 90,
    critico: 0.04,
    dano: ['contundente', 'perforante'],
    segundo: 'El pico de cuervo (el remate y el golpe de gracia), perforante.',
    especial: ['A dos manos: el escudo, a la espalda.', 'Cada golpe quiebra la guardia.', 'El pesado se carga y parte el suelo.', 'Lento: cada golpe se queda abajo.'],
  },
  maza: {
    peso: 1.7,
    dureza: 70,
    critico: 0.05,
    dano: ['contundente'],
    especial: ['Una mano: el escudo, al brazo.', 'Pesa en la cabeza: desequilibra más que una espada.', 'No corta, abolla: la armadura apenas la para.'],
  },
  ballesta: {
    peso: 4.0,
    dureza: 75,
    critico: 0.1,
    dano: ['perforante', 'contundente'],
    segundo: 'El culatazo, contundente.',
    especial: ['A dos manos: el escudo, a la espalda.', 'A distancia: tira virotes.', 'Se monta tras cada tiro, a merced.', 'El pesado es un culatazo.'],
  },
};

// Lo que ataja un arma: con la de la guardia (DUREZA_REF), ×1; cada punto de
// dureza, un 0,4 % más o menos (de ×0,8 a ×1,2). Multiplica la ventana del
// parry, lo que le dura el desequilibrio a quien se le desvía y el aguante
// que devuelve el desvío; divide lo que cuesta bloquear con el arma (a dos
// manos) y lo que cansa que te paren un golpe.
export const DUREZA_REF = 60;
export function durezaK(W) {
  const d = W && W.dureza !== undefined ? W.dureza : DUREZA_REF;
  return Math.min(1.2, Math.max(0.8, 1 + (d - DUREZA_REF) * 0.004));
}

// La familia de la espada: corriendo y bebiendo (ver la espada).
const SWORD_RUN = { ikR: [-35, 2, 18], bladeR: [-38, 26, 0] };
const SWORD_HEAL = { ikR: [-34, -6, 12], bladeR: [-128, -52, 0] };

export const WEAPONS = {
  espada: {
    id: 'espada',
    item: 'espada',
    order: 4,
    hands: 1,
    // estela (espacio de la mano): de la base de la hoja a la punta
    trail: [
      [0, -0.05, 0.2],
      [0, -0.05, 1.02],
    ],
    trailColor: 0xffe2b0,
    tip: [0, -0.05, 1.05],
    edge: 'double',
    guard: { ikR: [-26, 16, 26], bladeR: [-6, 42, 0], ikL: SHIELD_GUARD },
    // al trotar y correr, la hoja por delante y algo alzada (antes apuntaba
    // hacia atrás en cuanto el personaje avanzaba), la mano un poco por fuera
    // y la hoja abierta hacia fuera: con la mano más cerca, el pomo se metía
    // en el pecho (el 40 % de los pasos, hasta 6 cm)
    runPose: SWORD_RUN,
    // bebiendo, la espada baja y abierta a la derecha (con la de siempre, el
    // pomo se metía en el pecho)
    healR: SWORD_HEAL,
    block: { ikR: [-28, 20, 18], bladeR: [-18, 52, 0], ...SHIELD_UP },
    moves: swordMoves,
  },
  oxidada: {
    id: 'oxidada',
    item: 'oxidada',
    order: 3.5,
    hands: 1,
    trail: [
      [0, -0.05, 0.2],
      [0, -0.05, 0.96],
    ],
    trailColor: 0xe0c8a0,
    tip: [0, -0.05, 0.99],
    edge: 'double',
    guard: { ikR: [-26, 16, 26], bladeR: [-6, 42, 0], ikL: SHIELD_GUARD },
    runPose: SWORD_RUN,
    healR: SWORD_HEAL,
    block: { ikR: [-28, 20, 18], bladeR: [-18, 52, 0], ...SHIELD_UP },
    moves: oxidadaMoves,
  },
  solingen: {
    id: 'solingen',
    item: 'solingen',
    order: 5,
    hands: 1,
    trail: [
      [0, -0.05, 0.2],
      [0, -0.05, 1.06],
    ],
    trailColor: 0xfff0d2,
    tip: [0, -0.05, 1.09],
    edge: 'double',
    guard: { ikR: [-26, 16, 26], bladeR: [-6, 42, 0], ikL: SHIELD_GUARD },
    runPose: SWORD_RUN,
    healR: SWORD_HEAL,
    block: { ikR: [-28, 20, 18], bladeR: [-18, 52, 0], ...SHIELD_UP },
    moves: solingenMoves,
  },
  ...MOVESETS,
  ...MOVESETS_BLUNT,
};
// Parry y golpe de gracia de cada arma: la ventana (s) que se abre al
// pulsar la guardia, con qué se para (el escudo; a dos manos, la hoja o el
// mango del hacha) y con qué golpe se remata al desequilibrado.
const PARRY = {
  hacha: { win: 0.16, kind: 'haft', riposte: ['light', 2], dmg: 118 },
  lanza: { win: 0.2, kind: 'shield', riposte: ['heavy', 0], dmg: 110 },
  espada: { win: 0.2, kind: 'shield', riposte: ['light', 2], dmg: 108 },
  oxidada: { win: 0.2, kind: 'shield', riposte: ['light', 2], dmg: OXIDADA_GRACIA },
  solingen: { win: 0.2, kind: 'shield', riposte: ['light', 2], dmg: Math.round(108 * SOLINGEN_K) },
  // (la ballesta para con la cureña; remata con un culatazo)
  ballesta: { win: 0.14, kind: 'haft', riposte: ['heavy', 0], dmg: 92 },
  // (la maza para con el escudo; remata con el mazazo)
  maza: { win: 0.2, kind: 'shield', riposte: ['light', 2], dmg: 104 },
  // (el martillo para con el mango; remata con el pico)
  martillo_guerra: { win: 0.14, kind: 'haft', riposte: ['light', 2], dmg: 126 },
};
for (const id in WEAPONS) {
  const W = WEAPONS[id];
  W.parts = WEAPON_PARTS[id];
  W.carry = W.hands === 2 ? carry2(W) : carry1(W);
  W.parry = PARRY[id] || PARRY.espada;
  W.calidad = CALIDAD[id] ?? 0.65;
  const S = STATS[id] || STATS.espada;
  W.peso = S.peso;
  W.vel = S.vel ?? 1;
  W.dureza = S.dureza;
  W.critico = S.critico ?? 0;
  W.especial = S.especial || [];
  W.dano = S.dano || ['cortante'];
  W.segundo = S.segundo || null;
}

// Clips y ataques de un arma para un rig (se construyen una vez).
const SETS = new Map();
export function weaponSet(W, rig) {
  if (SETS.has(W.id)) return SETS.get(W.id);
  // guardia resuelta a rotaciones para los clips que animan brazos a mano
  const G = { ...W.guard };
  if (W.hands === 2) delete G.ikL;
  const gp = rad(G);
  resolveWeaponArms(gp, rig, W);
  const GUARD = {};
  for (const k of ['armR', 'foreR', 'handR', 'armL', 'foreL', 'handL']) GUARD[k] = gp[k].map((v) => v / DEG);
  const BLOCK = { ...W.block };
  const M = W.moves({ G, GUARD, W, rig });
  // (el tipo de daño de cada golpe: el que diga su repertorio o el del arma)
  for (const a of [...M.light, ...M.heavy, M.run, M.roll, M.guard]) if (a && !a.tipo) a.tipo = W.dano[0];
  const clips = { ...commonClips(W, G, GUARD, BLOCK), ...parryClips(W, G, BLOCK), ...M.clips };
  // golpe de gracia: uno de los golpes del arma, rematando (sin coste de
  // aguante, sin encadenar y con el daño de un crítico)
  const R = W.parry;
  const base = (M[R.riposte[0]] || M.light)[R.riposte[1]] || M.light[M.light.length - 1];
  const riposte = { ...base, dmg: R.dmg, poise: 999, riposte: true, st: 0, cancel: base.clip.dur + 1, move: base.clip.dur + 1, charge: null, impact: null, keepBlock: false };
  const set = {
    clips,
    light: M.light,
    heavy: M.heavy,
    run: M.run,
    roll: M.roll,
    guard: M.guard || null,
    // (la ballesta: montarla)
    reload: M.reload || null,
    // (romper un mueble: el pesado, o el golpe que diga el arma si su pesado
    // tarda en caer; el martillo de guerra)
    smash: M.smash || M.heavy[0],
    riposte,
    blockRad: rad(BLOCK),
  };
  SETS.set(W.id, set);
  return set;
}

// ---------------------------------------------------------------- la ficha
// Lo que se ve de un arma en el inventario (los números de sus barras): lo
// que de verdad hacen sus golpes (su daño, su paso, su alcance y su aguante,
// del repertorio, con lo que se haya afilado: dmgMul) y sus cualidades
// (STATS). La ballesta: el virote; su paso, del tiro a tenerla montada otra
// vez.
export function weaponSheet(W, rig, dmgMul = 1) {
  const S = weaponSet(W, rig);
  const L = W.ranged ? [S.light[0]] : S.light;
  const avg = (f) => L.reduce((s, a) => s + f(a), 0) / L.length;
  const ciclo = W.ranged && S.reload ? S.light[0].cancel + S.reload.clip.dur : avg((a) => a.cancel);
  return {
    filo: Math.round(avg((a) => a.dmg) * dmgMul),
    pesado: Math.round(S.heavy[0].dmg * dmgMul),
    vel: W.vel / ciclo,
    alcance: avg((a) => a.range),
    peso: W.peso,
    dureza: W.dureza,
    critico: W.critico,
    // (lo que multiplica un crítico: el de cada golpe; el virote, 1,6)
    critMul: W.ranged ? 1.6 : L[0].crit || 1.7,
    calidad: W.calidad,
    aguante: Math.round(avg((a) => a.st)),
    // (los tipos de daño: el principal y el de los golpes que no son como los
    // demás; game/danos.js)
    dano: W.dano,
    segundo: W.segundo,
  };
}
