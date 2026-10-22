// Miguel, el tonelero: el hijo de la casa tapiada. Volvió de la muralla
// mordido y se está convirtiendo, pero aún es él a ratos: no ataca. Pasa las
// noches sentado en un rincón de su alcoba, abrazado a las rodillas, llorando
// y hablando solo; si te acercas, te grita que te vayas, se encoge y se
// muerde el brazo para no lanzarse sobre ti. Si te vas y vuelves al cabo de
// un rato, se ha ahorcado de una viga. Se anima como las criaturas (rig y
// poses), sin moverse de su sitio; lo que hace lo decide su guion
// (game/souto.js), que reparte el peso de cada postura (e.data.W).
import { Rig, clip } from './rig.js';
import { humanoidJoints, feetParts } from './models.js';
import { DEG } from '../core/util.js';

const S = Math.sin;

// grados -> radianes (root en cm -> m)
function rad(p) {
  const o = {};
  for (const k in p) o[k] = k === 'root' ? p[k].map((v) => v / 100) : p[k].map((v) => v * DEG);
  return o;
}

// ------------------------------------------------------------ el cuerpo
// Treinta años, fuerte de brazos: la camisa de lino, sucia y abierta, con
// la sangre de ella en la pechera; el mandil de cuero del oficio, calzas
// pardas y descalzo. Pelo y barba negros, de días. Lo que le está pasando:
// la mordedura del antebrazo derecho, la carne que le sube del hombro al
// cuello, las manos que se le ennegrecen y se le alargan, la boca manchada.
export function buildMorador() {
  const k = 1.0;
  const joints = humanoidJoints(k);
  const shirt = 'linen',
    skin = 'skin',
    rot = 'skinCorrupt',
    hair = 'leather';
  const parts = [
    // cadera: el cinto, el faldón de la camisa, el mandil
    { j: 'hips', type: 'box', s: [0.4, 0.1, 0.27], p: [0, 0.03, 0], mat: 'leather' },
    { j: 'hips', type: 'box', s: [0.42, 0.34, 0.28], p: [0, -0.15, 0], taper: [1.1, 1.06], mat: 'clothDark' },
    { j: 'hips', type: 'box', s: [0.34, 0.5, 0.03], p: [0, -0.22, 0.155], taper: [1.12, 1], mat: 'leather' },
    // el pecho: la camisa abierta, la pechera manchada, el cuello
    { j: 'chest', type: 'box', s: [0.46, 0.52, 0.29], p: [0, 0.26, 0], taper: [0.86, 0.92], mat: shirt },
    { j: 'chest', type: 'box', s: [0.18, 0.22, 0.012], p: [0.03, 0.22, 0.146], r: [0, 0, -8], mat: 'blood' },
    { j: 'chest', type: 'box', s: [0.1, 0.16, 0.012], p: [-0.08, 0.36, 0.142], mat: skin },
    { j: 'chest', type: 'box', s: [0.28, 0.32, 0.03], p: [0, 0.14, 0.15], taper: [1.0, 0.9], mat: 'leather' },
    { j: 'chest', type: 'cyl', s: [0.08, 0.095, 0.1], p: [0, 0.54, 0], mat: skin },
    // la carne que le sube del hombro izquierdo al cuello
    { j: 'chest', type: 'ico', s: [0.1, 0.08, 0.08], p: [0.17, 0.46, 0.02], mat: 'flesh' },
    { j: 'chest', type: 'ico', s: [0.06, 0.07, 0.05], p: [0.09, 0.53, 0.05], mat: 'flesh' },
    { j: 'chest', type: 'box', s: [0.07, 0.12, 0.08], p: [0.07, 0.56, 0.0], mat: rot },
    // la cabeza: cara de días sin dormir, ojos hundidos, pelo y barba negros,
    // la boca y la barba manchadas de sangre
    { j: 'head', type: 'box', s: [0.2, 0.24, 0.22], p: [0, 0.13, 0], mat: skin },
    { j: 'head', type: 'box', s: [0.045, 0.07, 0.05], p: [0, 0.13, 0.12], r: [-12, 0, 0], mat: skin },
    { j: 'head', type: 'box', s: [0.036, 0.02, 0.01], p: [-0.048, 0.16, 0.112], mat: 'black' },
    { j: 'head', type: 'box', s: [0.036, 0.02, 0.01], p: [0.048, 0.16, 0.112], mat: 'black' },
    { j: 'head', type: 'box', s: [0.05, 0.012, 0.008], p: [-0.048, 0.143, 0.112], mat: 'blood' },
    { j: 'head', type: 'box', s: [0.05, 0.012, 0.008], p: [0.048, 0.143, 0.112], mat: 'blood' },
    { j: 'head', type: 'box', s: [0.06, 0.018, 0.02], p: [-0.048, 0.188, 0.113], r: [0, 0, 10], mat: hair },
    { j: 'head', type: 'box', s: [0.06, 0.018, 0.02], p: [0.048, 0.188, 0.113], r: [0, 0, -10], mat: hair },
    { j: 'head', type: 'box', s: [0.22, 0.1, 0.24], p: [0, 0.27, -0.01], mat: hair },
    { j: 'head', type: 'box', s: [0.22, 0.2, 0.07], p: [0, 0.18, -0.1], mat: hair },
    { j: 'head', type: 'box', s: [0.03, 0.12, 0.14], p: [0.105, 0.2, -0.02], mat: hair },
    { j: 'head', type: 'box', s: [0.03, 0.12, 0.14], p: [-0.105, 0.2, -0.02], mat: hair },
    { j: 'head', type: 'box', s: [0.21, 0.11, 0.08], p: [0, 0.04, 0.075], taper: [0.78, 0.9], mat: hair },
    { j: 'head', type: 'box', s: [0.09, 0.035, 0.014], p: [0, 0.08, 0.118], mat: 'black' },
    { j: 'head', type: 'box', s: [0.12, 0.06, 0.012], p: [0, 0.05, 0.12], mat: 'blood' },
    // brazos: las mangas remangadas; el izquierdo, ennegreciéndose; en el
    // derecho, la mordedura
    { j: 'armL', type: 'box', s: [0.14, 0.3, 0.14], p: [0, -0.13, 0], taper: [0.88, 0.88], mat: shirt },
    { j: 'foreL', type: 'box', s: [0.11, 0.27, 0.11], p: [0, -0.13, 0], taper: [0.82, 0.82], mat: rot },
    { j: 'handL', type: 'box', s: [0.085, 0.1, 0.095], p: [0, -0.05, 0.01], mat: rot },
    ...[-0.025, 0, 0.025].map((x) => ({ j: 'handL', type: 'box', s: [0.014, 0.12, 0.014], p: [x, -0.13, 0.02], r: [10, 0, 0], mat: rot })),
    { j: 'armR', type: 'box', s: [0.14, 0.3, 0.14], p: [0, -0.13, 0], taper: [0.88, 0.88], mat: shirt },
    { j: 'foreR', type: 'box', s: [0.11, 0.27, 0.11], p: [0, -0.13, 0], taper: [0.82, 0.82], mat: skin },
    { j: 'foreR', type: 'box', s: [0.115, 0.08, 0.115], p: [0, -0.1, 0], mat: 'blood' },
    { j: 'foreR', type: 'box', s: [0.06, 0.05, 0.118], p: [0.02, -0.16, 0], mat: 'flesh' },
    { j: 'handR', type: 'box', s: [0.085, 0.1, 0.095], p: [0, -0.05, 0.01], mat: skin },
    // piernas: calzas pardas y los pies descalzos
    { j: 'legL', type: 'box', s: [0.16, 0.46, 0.17], p: [0, -0.22, 0], taper: [0.8, 0.85], mat: 'clothDark' },
    { j: 'shinL', type: 'box', s: [0.13, 0.42, 0.14], p: [0, -0.2, 0], taper: [0.9, 0.9], mat: 'clothDark' },
    { j: 'legR', type: 'box', s: [0.16, 0.46, 0.17], p: [0, -0.22, 0], taper: [0.8, 0.85], mat: 'clothDark' },
    { j: 'shinR', type: 'box', s: [0.13, 0.42, 0.14], p: [0, -0.2, 0], taper: [0.9, 0.9], mat: 'clothDark' },
    ...feetParts(k, skin, { w: 0.11, h: 0.07, l: 0.25 }),
  ];
  return new Rig({ joints, parts });
}

// ------------------------------------------------------------ posturas
// Sentado en el suelo, de cara al rincón, abrazado a las rodillas, con la
// frente en ellas.
const SIT = {
  root: [0, -82, 0],
  hips: [-14, 0, 0],
  legL: [-128, 0, 8],
  shinL: [138, 0, 0],
  footL: [-10, 0, 0],
  legR: [-124, 0, -8],
  shinR: [136, 0, 0],
  footR: [-10, 0, 0],
  chest: [52, 0, 0],
  head: [34, 0, 0],
  armL: [-44, 0, -16],
  foreL: [-82, 0, 0],
  handL: [10, 0, 0],
  armR: [-40, 0, 18],
  foreR: [-86, 0, 0],
  handR: [10, 0, 0],
};
// encogido contra el rincón, tapándose la cabeza con los brazos
const COWER = {
  ...SIT,
  hips: [-6, 0, 0],
  chest: [44, 0, 0],
  head: [42, 0, 0],
  armL: [-150, 0, -28],
  foreL: [-110, 0, 0],
  handL: [20, 0, 0],
  armR: [-146, 0, 30],
  foreR: [-112, 0, 0],
  handR: [20, 0, 0],
};
// mordiéndose el antebrazo derecho (la izquierda le sujeta la muñeca)
const BITE = {
  ...SIT,
  chest: [34, 0, 0],
  head: [26, 10, 0],
  armR: [-74, 0, 34],
  foreR: [-128, 0, 0],
  handR: [-20, 0, 0],
  armL: [-62, 0, -20],
  foreL: [-96, 0, 0],
  handL: [0, 0, 0],
};
// ahorcado: colgando de la soga, laxo, la cabeza caída a un lado
const HANG = {
  root: [0, 0, 0],
  hips: [0, 0, 0],
  chest: [6, 0, 3],
  head: [38, 4, 26],
  armL: [2, 0, 7],
  foreL: [-6, 0, 0],
  handL: [8, 0, 0],
  armR: [3, 0, -6],
  foreR: [-4, 0, 0],
  handR: [6, 0, 0],
  legL: [3, 0, 3],
  shinL: [5, 0, 0],
  footL: [52, 0, 0],
  legR: [-5, 0, -2],
  shinR: [3, 0, 0],
  footR: [48, 0, 0],
};

const KINDS = { sob: SIT, cower: COWER, bite: BITE, hang: HANG };

// La pose: la mezcla de las posturas según sus pesos (e.data.W), con el
// llanto (los hombros que tiemblan a sacudidas), el temblor de cuando le
// cuesta contenerse (e.data.shake) y el giro de la cabeza por encima del
// hombro hacia ti (e.data.look: [guiñada, peso], en radianes).
function moradorIdle(e, kind, t) {
  const W = e.data.W || { [kind]: 1 };
  const out = {};
  let tot = 0;
  for (const k in KINDS) {
    const w = W[k] || 0;
    if (w <= 0.001) continue;
    tot += w;
    for (const j in KINDS[k]) {
      const v = KINDS[k][j];
      const o = out[j] || (out[j] = [0, 0, 0]);
      o[0] += v[0] * w;
      o[1] += v[1] * w;
      o[2] += v[2] * w;
    }
  }
  if (tot <= 0) return rad(SIT);
  for (const j in out) for (let i = 0; i < 3; i++) out[j][i] /= tot;
  const hang = (W.hang || 0) / tot;
  const alive = 1 - hang;
  // el llanto: se mece y le tiemblan los hombros a sacudidas
  const sob = (e.data.sob ?? 1) * alive;
  const rock = S(t * 1.1 + e.phase) * 4 * alive;
  const hic = Math.pow(Math.max(0, S(t * 5.3 + e.phase * 2)), 6) * 7 * sob;
  out.chest[0] += rock + hic;
  out.head[0] += hic * 0.6 - rock * 0.3;
  if (out.armL) out.armL[2] -= hic * 0.4;
  if (out.armR) out.armR[2] += hic * 0.4;
  // el temblor (se contiene)
  const sh = (e.data.shake || 0) * alive;
  if (sh > 0) {
    const n = (a, b) => (S(t * a + e.phase) + S(t * b + e.phase * 3)) * sh;
    out.chest[1] += n(31, 47) * 2.5;
    out.chest[2] += n(37, 53) * 2;
    out.head[1] += n(41, 29) * 4;
    out.head[2] += n(23, 59) * 3;
    for (const j of ['armL', 'armR', 'foreL', 'foreR']) if (out[j]) out[j][0] += n(43 + j.length, 61) * 3;
  }
  // la cabeza (y algo el pecho) hacia ti, por encima del hombro
  const [ly, lw] = e.data.look || [0, 0];
  if (lw > 0.001 && alive > 0.5) {
    const a = (ly / DEG) * lw;
    out.chest[1] += a * 0.3;
    out.chest[0] -= 18 * lw;
    out.head[1] += a * 0.62;
    out.head[0] -= 26 * lw;
  }
  return rad(out);
}

// (no se mueve de su sitio: la «marcha» es la misma pose)
function moradorLoco(e, t) {
  return moradorIdle(e, e.idle, t);
}

const STILL = clip('mStill', 0.5, [[0, {}], [0.5, {}]]);

export const MORADOR_TYPE = {
  name: 'Miguel',
  build: buildMorador,
  hp: 100,
  poise: 30,
  radius: 0.36,
  height: 1.8,
  lockHeight: 1.0,
  walk: 1.0,
  run: 2.0,
  turn: 4,
  sight: 0,
  hear: 0,
  // (no ataca ni se le puede herir: sólo se le puede dejar en paz)
  friendly: true,
  clips: { alert: STILL, hurt: STILL, stagger: STILL, death: STILL },
  voice: 'morador',
  attacks: [],
  loco: moradorLoco,
  idlePose: moradorIdle,
  ai: (e, dt, player) => {
    const q = e.game.souto;
    if (q) q.npcAI(e, dt, player);
    else e.animate(dt);
  },
  onReset: (e) => e.game.souto && e.game.souto.npcReset(e),
};
