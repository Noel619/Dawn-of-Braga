// Definiciones de criaturas: estadísticas, ataques, animación.
import * as THREE from 'three';
import { clip } from './rig.js';
import { clamp, DEG, damp, lerp, angleDiff } from '../core/util.js';
import { buildPenitent, buildSoldier, buildCrawler, buildHound, buildBell, buildMourner, buildImpaled, buildTuribulario, CANDLE_OFFSETS } from './enemy_models.js';
import { objMat, additiveFog } from '../gfx/materials.js';
import { GAIT } from './locomotion.js';
import { getTexture } from '../gfx/textures.js';

const S = Math.sin,
  Cc = Math.cos;

// convierte una pose en grados a radianes (root en cm -> m)
function rad(p) {
  const o = {};
  for (const k in p) o[k] = k === 'root' ? p[k].map((v) => v / 100) : p[k].map((v) => v * DEG);
  return o;
}

// Estilo del tren superior de los humanoides: encorvamiento, brazos y
// respiración. La marcha (cadera, piernas por IK, balanceo) la pone Biped.
function humanStyle(e, t, o) {
  const g = e.gait;
  const sw = g ? g.armSwing / DEG : 0;
  const run = g ? g.runW * g.mw : 0;
  const br = S(t * (o.breath ?? 1.6) + e.phase * 0.1);
  const hunch = o.hunch ?? 0;
  const aL = o.armL ?? [0, 0, 6],
    aR = o.armR ?? [0, 0, -6];
  return {
    chest: [hunch + run * 8 + br * (o.breathAmp ?? 2), 0, 0],
    head: [-hunch * 0.55 + (o.headX ?? 0), 0, o.headZ ?? 0],
    armL: [aL[0] + sw * (o.armLSwing ?? 1), aL[1], aL[2]],
    foreL: o.foreL ?? [-12, 0, 0],
    armR: [aR[0] - sw * (o.armRSwing ?? 1), aR[1], aR[2]],
    foreR: o.foreR ?? [-12, 0, 0],
    handR: o.handR ?? [0, 0, 0],
  };
}

// ======================================================================= PENITENTE
const PEN_BASE = { chest: [35, 0, 0], head: [-18, 0, 0], armR: [-30, 0, -10], foreR: [-40, 0, 0], handR: [30, 0, 0], armL: [-10, 0, 8], foreL: [-20, 0, 0] };
const penClips = {
  alert: clip('alert', 0.9, [
    [0, { ...PEN_BASE }],
    [0.3, { chest: [5, 0, 0], head: [-5, 0, 28], armL: [-30, 0, 50], foreL: [-30, 0, 0], armR: [-40, 0, -50], foreR: [-40, 0, 0], handR: [30, 0, 0] }, 'snap'],
    [0.6, { chest: [10, 0, 0], head: [5, 0, -20], armL: [-30, 0, 50], armR: [-40, 0, -50], foreR: [-40, 0, 0] }],
    [0.9, { ...PEN_BASE }],
  ]),
  slash: clip('slash', 1.3, [
    [0, { ...PEN_BASE }],
    [0.48, { chest: [0, -25, 0], head: [-5, 0, 0], armR: [-175, 0, -30], foreR: [-40, 0, 0], handR: [60, 0, 0], armL: [-20, 0, 30], legL: [15, 0, 0], legR: [-20, 0, 0], shinR: [20, 0, 0] }],
    [0.62, { chest: [50, 25, 0], head: [-25, 0, 0], armR: [-40, 0, 10], foreR: [-10, 0, 0], handR: [85, 0, 0], armL: [-20, 0, 30], legL: [30, 0, 0], legR: [-35, 0, 0], shinR: [30, 0, 0], root: [0, -10, 0] }, 'snap'],
    [0.95, { chest: [48, 22, 0], head: [-25, 0, 0], armR: [-36, 0, 12], foreR: [-12, 0, 0], handR: [80, 0, 0], legL: [30, 0, 0], legR: [-35, 0, 0], shinR: [30, 0, 0], root: [0, -10, 0] }],
    [1.3, { ...PEN_BASE }],
  ]),
  double: clip('double', 1.7, [
    [0, { ...PEN_BASE }],
    [0.36, { chest: [25, -45, 0], armR: [-85, 0, -90], foreR: [-25, 0, 0], handR: [75, 0, 0] }],
    [0.48, { chest: [40, 40, 0], armR: [-90, 0, 40], foreR: [-8, 0, 0], handR: [85, 0, 0], root: [0, -6, 0] }, 'snap'],
    [0.85, { chest: [40, 50, 0], armR: [-85, 0, 55], foreR: [-20, 0, 0], handR: [80, 0, 0] }],
    [1.0, { chest: [42, -40, 0], armR: [-92, 0, -85], foreR: [-8, 0, 0], handR: [85, 0, 0], root: [0, -8, 0] }, 'snap'],
    [1.35, { chest: [40, -45, 0], armR: [-80, 0, -90], foreR: [-20, 0, 0], handR: [75, 0, 0] }],
    [1.7, { ...PEN_BASE }],
  ]),
  lunge: clip('lunge', 1.55, [
    [0, { ...PEN_BASE }],
    [0.55, { chest: [60, 0, 0], head: [-40, 0, 0], armR: [-190, 0, -20], foreR: [-30, 0, 0], handR: [60, 0, 0], armL: [30, 0, 20], legL: [-40, 0, 0], shinL: [80, 0, 0], legR: [-30, 0, 0], shinR: [90, 0, 0], root: [0, -35, 0] }],
    [0.75, { chest: [20, 0, 0], head: [-20, 0, 0], armR: [-200, 0, -20], foreR: [-20, 0, 0], handR: [60, 0, 0], armL: [-60, 0, 40], legL: [-50, 0, 0], shinL: [30, 0, 0], legR: [40, 0, 0], shinR: [40, 0, 0], root: [0, 15, 0] }],
    [0.92, { chest: [60, 0, 0], head: [-35, 0, 0], armR: [-35, 0, 0], foreR: [-5, 0, 0], handR: [85, 0, 0], armL: [-20, 0, 30], legL: [-60, 0, 0], shinL: [70, 0, 0], legR: [30, 0, 0], shinR: [50, 0, 0], root: [0, -30, 0] }, 'snap'],
    [1.2, { chest: [60, 0, 0], head: [-35, 0, 0], armR: [-35, 0, 0], foreR: [-5, 0, 0], handR: [85, 0, 0], legL: [-60, 0, 0], shinL: [70, 0, 0], legR: [30, 0, 0], shinR: [50, 0, 0], root: [0, -30, 0] }],
    [1.55, { ...PEN_BASE }],
  ]),
  hurt: clip('hurt', 0.55, [
    [0, { chest: [0, 20, 0], head: [-30, 0, 20], armL: [-40, 0, 40], armR: [-30, 0, -40], root: [0, -5, -10] }, 'snap'],
    [0.55, { ...PEN_BASE }],
  ]),
  stagger: clip('stagger', 1.3, [
    [0, { chest: [-20, 30, 0], head: [-40, 0, 20], armL: [-20, 0, 70], armR: [-20, 0, -70], root: [0, -10, -15], legL: [-20, 0, 0], shinL: [40, 0, 0] }, 'snap'],
    [0.6, { chest: [70, 0, 0], head: [20, 0, 0], armL: [0, 0, 20], armR: [0, 0, -20], root: [0, -40, 0], legL: [-70, 0, 0], shinL: [100, 0, 0], legR: [-40, 0, 0], shinR: [100, 0, 0] }],
    [1.3, { ...PEN_BASE }],
  ]),
  death: clip('death', 1.8, [
    [0, { chest: [-20, 0, 0], head: [-40, 0, 0], armL: [-20, 0, 50], armR: [-20, 0, -50] }, 'snap'],
    [0.5, { chest: [30, 0, 0], head: [40, 0, 0], root: [0, -48, 0], legL: [-95, 0, 5], shinL: [100, 0, 0], legR: [-95, 0, -5], shinR: [100, 0, 0], armL: [10, 0, 10], armR: [10, 0, -10] }],
    [1.2, { hips: [85, 0, 0], chest: [5, 0, 0], head: [20, 40, 0], root: [0, -78, 0], armL: [-150, 0, 30], armR: [-20, 0, -50], legL: [-10, 0, 5], legR: [-5, 0, -5] }, 'in'],
    [1.8, { hips: [88, 0, 0], chest: [2, 0, 0], head: [20, 40, 0], root: [0, -80, 0], armL: [-150, 0, 30], armR: [-20, 0, -50], legL: [-4, 0, 5], legR: [-4, 0, -5] }],
  ]),
};

function penIdle(e, kind, t) {
  const w = S(t * 1.2 + e.phase) * 0.5;
  let p;
  if (kind === 'eat') {
    const b = S(t * 7 + e.phase) * 12;
    p = { root: [0, -55, 0], legL: [-100, 0, 10], shinL: [110, 0, 0], legR: [-100, 0, -10], shinR: [110, 0, 0], chest: [72, 0, 0], head: [25 + b, 0, 0], armL: [-60 + b * 0.5, 0, 15], foreL: [-30, 0, 0], armR: [-55 - b * 0.5, 0, -15], foreR: [-30, 0, 0], handR: [30, 0, 0] };
  } else if (kind === 'kneel' || kind === 'pray') {
    p = { root: [0, -52, 0], legL: [-98, 0, 6], shinL: [104, 0, 0], legR: [-98, 0, -6], shinR: [104, 0, 0], chest: [18 + w * 16, 0, 0], head: [30 + w * 6, 0, 0], armL: [-55, 0, -20], foreL: [-80, 0, 0], armR: [-55, 0, 20], foreR: [-80, 0, 0], handR: [0, 0, 0] };
  } else if (kind === 'window') {
    p = { chest: [0, 0, 0], head: [5, 0, 18 + w * 4], armL: [0, 0, 4], armR: [0, 0, -4], foreR: [-5, 0, 0] };
  } else {
    p = { ...PEN_BASE, chest: [30 + w * 6, 0, w * 6], head: [-15, 0, w * 10] };
  }
  return rad(p);
}

// ======================================================================= SOLDADO
const SOL_BASE = { armR: [-30, 0, -8], foreR: [-62, 0, 0], handR: [38, 0, 0], armL: [-40, 0, 18], foreL: [-70, 0, 0], chest: [6, 0, 0] };
const solClips = {
  alert: clip('alert', 0.8, [
    [0, { ...SOL_BASE }],
    [0.35, { ...SOL_BASE, chest: [-12, 0, 0], head: [-20, 0, 15], arm3: [-40, 0, 20] }, 'snap'],
    [0.8, { ...SOL_BASE }],
  ]),
  combo: clip('combo', 1.7, [
    [0, { ...SOL_BASE }],
    [0.36, { chest: [8, -50, 0], armR: [-85, 0, -95], foreR: [-25, 0, 0], handR: [75, 0, -20], armL: [-40, 0, 20], foreL: [-70, 0, 0], legL: [15, 0, 0], legR: [-22, 0, 0], shinR: [22, 0, 0] }],
    [0.48, { chest: [14, 42, 0], armR: [-90, 0, 32], foreR: [-8, 0, 0], handR: [84, 0, 20], armL: [-40, 0, 20], foreL: [-70, 0, 0], legL: [15, 0, 0], legR: [-22, 0, 0], shinR: [22, 0, 0] }, 'snap'],
    [0.82, { chest: [10, 50, 0], armR: [-80, 0, 50], foreR: [-25, 0, 0], handR: [70, 0, 25], armL: [-40, 0, 20], foreL: [-70, 0, 0] }],
    [1.0, { chest: [14, -45, 0], armR: [-92, 0, -80], foreR: [-8, 0, 0], handR: [84, 0, -30], armL: [-40, 0, 20], foreL: [-70, 0, 0], legL: [22, 0, 0], legR: [-30, 0, 0], shinR: [28, 0, 0] }, 'snap'],
    [1.3, { chest: [10, -52, 0], armR: [-80, 0, -95], foreR: [-25, 0, 0], handR: [70, 0, -30] }],
    [1.7, { ...SOL_BASE }],
  ]),
  thrust: clip('thrust', 1.35, [
    [0, { ...SOL_BASE }],
    [0.5, { chest: [-5, -30, 0], armR: [-40, 0, -30], foreR: [-120, 0, 0], handR: [10, 0, 0], armL: [-50, 0, 20], foreL: [-60, 0, 0], legL: [20, 0, 0], legR: [-15, 0, 0] }],
    [0.62, { chest: [20, 15, 0], armR: [-88, 0, 0], foreR: [0, 0, 0], handR: [88, 0, 0], armL: [-30, 0, 30], foreL: [-60, 0, 0], legL: [-40, 0, 0], shinL: [40, 0, 0], legR: [30, 0, 0], root: [0, -10, 0] }, 'snap'],
    [0.95, { chest: [20, 15, 0], armR: [-86, 0, 0], foreR: [-5, 0, 0], handR: [86, 0, 0], legL: [-40, 0, 0], shinL: [40, 0, 0], legR: [30, 0, 0], root: [0, -10, 0] }],
    [1.35, { ...SOL_BASE }],
  ]),
  arm3: clip('arm3', 1.7, [
    [0, { ...SOL_BASE }],
    [0.3, { ...SOL_BASE, chest: [-5, 0, 0], arm3: [30, 0, -10], fore3: [30, 0, 0] }],
    [0.85, { ...SOL_BASE, chest: [-15, 0, 0], head: [-15, 0, 0], arm3: [60, 0, -20], fore3: [40, 0, 0] }],
    [0.98, { ...SOL_BASE, chest: [30, 0, 0], head: [10, 0, 0], arm3: [150, 0, -30], fore3: [10, 0, 0], root: [0, -12, 0] }, 'snap'],
    [1.3, { ...SOL_BASE, chest: [28, 0, 0], arm3: [145, 0, -30], fore3: [15, 0, 0], root: [0, -12, 0] }],
    [1.7, { ...SOL_BASE }],
  ]),
  block: clip('block', 0.45, [
    [0, { ...SOL_BASE, armL: [-75, 20, -5], foreL: [-40, 0, 0], chest: [-8, -10, 0], root: [0, -4, -8] }, 'snap'],
    [0.45, { ...SOL_BASE }],
  ]),
  hurt: clip('hurt', 0.5, [
    [0, { ...SOL_BASE, chest: [-25, 15, 0], head: [-25, 0, 0], armL: [-30, 0, 40], root: [0, -5, -8] }, 'snap'],
    [0.5, { ...SOL_BASE }],
  ]),
  stagger: clip('stagger', 1.4, [
    [0, { chest: [-30, -20, 0], head: [-30, 0, 0], armL: [-20, 0, 60], armR: [-20, 0, -60], root: [0, -8, -12], legL: [-20, 0, 0], shinL: [40, 0, 0] }, 'snap'],
    [0.7, { chest: [40, 0, 0], head: [20, 0, 0], armL: [0, 0, 20], armR: [0, 0, -20], root: [0, -40, 0], legL: [-60, 0, 0], shinL: [100, 0, 0], legR: [-20, 0, 0], shinR: [100, 0, 0] }],
    [1.4, { ...SOL_BASE }],
  ]),
  death: penClips.death,
};

// ======================================================================= RASTRERO
function crawlerPose(e, t, spd, body = {}) {
  const ph = e.phase;
  const s = clamp(spd / 3, 0, 1.4);
  const lift = (o) => Math.max(0, S(ph + o)) * 30 * s;
  const sw = (o) => Cc(ph + o) * 20 * s;
  const tw = S(t * 9 + e.phase) * 3;
  const tick = S(t * 23 + e.phase) * (s < 0.1 ? 2 : 0);
  return rad({
    body: [(body.x ?? 0) + S(ph * 2) * 3 * s - 8, 0, S(ph) * 5 * s],
    head: [55 + S(t * 3 + e.phase) * 8 + tw, S(t * 1.7) * 25, S(t * 2.3) * 30 + tick * 6],
    lfA: [34 + sw(0), 0, -52 + lift(0)],
    lfB: [-22 - lift(0) * 0.4, 0, 64 - lift(0) * 0.3],
    rfA: [34 + sw(Math.PI), 0, 52 - lift(Math.PI)],
    rfB: [-22 - lift(Math.PI) * 0.4, 0, -64 + lift(Math.PI) * 0.3],
    lbA: [-34 + sw(Math.PI), 0, -52 + lift(Math.PI)],
    lbB: [22 + lift(Math.PI) * 0.4, 0, 64 - lift(Math.PI) * 0.3],
    rbA: [-34 + sw(0), 0, 52 - lift(0)],
    rbB: [22 + lift(0) * 0.4, 0, -64 + lift(0) * 0.3],
    root: [0, (body.y ?? 0) + S(ph * 2) * 3 * s + tick, 0],
  });
}
const CR_REST = {};
const crClips = {
  alert: clip('alert', 0.8, [
    [0, { head: [50, 0, 0] }],
    [0.3, { head: [10, 0, 60], body: [-15, 0, 0] }, 'snap'],
    [0.55, { head: [80, 0, -40], body: [-10, 0, 0] }, 'snap'],
    [0.8, { head: [50, 0, 0] }],
  ]),
  lunge: clip('lunge', 1.0, [
    [0, {}],
    [0.35, { body: [15, 0, 0], head: [20, 0, 0], root: [0, -18, 0] }],
    [0.5, { body: [-10, 0, 0], head: [-10, 0, 0], root: [0, 12, 0] }, 'snap'],
    [0.7, { body: [5, 0, 0], head: [30, 0, 0], root: [0, -8, 0] }],
    [1.0, {}],
  ]),
  pounce: clip('pounce', 1.5, [
    [0, {}],
    [0.5, { body: [20, 0, 0], head: [10, 0, 0], root: [0, -25, 0] }],
    [0.65, { body: [-25, 0, 0], head: [-20, 0, 0], root: [0, 5, 0] }, 'snap'],
    [1.0, { body: [10, 0, 0], head: [40, 0, 0], root: [0, -10, 0] }],
    [1.5, {}],
  ]),
  hurt: clip('hurt', 0.45, [
    [0, { body: [-20, 0, 15], head: [0, 0, 60] }, 'snap'],
    [0.45, {}],
  ]),
  stagger: clip('stagger', 1.0, [
    [0, { body: [-30, 0, 30], head: [0, 0, 80], root: [0, -20, 0] }, 'snap'],
    [1.0, {}],
  ]),
  death: clip('death', 1.6, [
    [0, { body: [-20, 0, 20], head: [0, 0, 60] }, 'snap'],
    [0.6, { body: [0, 0, 150], root: [0, -45, 0], head: [60, 0, 0] }],
    [1.6, { body: [0, 0, 170], root: [0, -50, 0], head: [80, 0, 0], lfA: [0, 0, -100], rfA: [0, 0, 100], lbA: [0, 0, -100], rbA: [0, 0, 100] }],
  ]),
};

// ======================================================================= MASTÍN
function houndPose(e, t, spd) {
  const ph = e.phase;
  const s = clamp(spd / 3, 0, 1.5);
  const gallop = spd > 4;
  const A = 35 * s;
  const leg = (o) => -S(ph + o) * A;
  const knee = (o) => Math.max(0, Cc(ph + o)) * 50 * s;
  const off = gallop ? [0, 0.4, Math.PI, Math.PI + 0.4] : [0, Math.PI, Math.PI, 0];
  const bob = S(ph * 2) * 4 * s;
  const growl = S(t * 20) * 3;
  return rad({
    body: [bob * 0.5 + (gallop ? S(ph) * 6 : 0), 0, 0],
    neck: [15 - bob, S(t * 1.3) * 10, 0],
    head: [-10 + growl, 0, S(t * 0.9) * 6],
    jaw: [18 + S(t * 4) * 8, 0, 0],
    tail: [-10 + S(t * 6) * 10, S(t * 3) * 20, 0],
    flA: [leg(off[0]), 0, 0],
    flB: [-knee(off[0]), 0, 0],
    frA: [leg(off[1]), 0, 0],
    frB: [-knee(off[1]), 0, 0],
    blA: [leg(off[2]), 0, 0],
    blB: [knee(off[2]), 0, 0],
    brA: [leg(off[3]), 0, 0],
    brB: [knee(off[3]), 0, 0],
    root: [0, -Math.abs(S(ph)) * 3 * s, 0],
  });
}
const hdClips = {
  alert: clip('alert', 0.7, [
    [0, {}],
    [0.25, { neck: [-20, 0, 0], head: [-20, 0, 0], jaw: [45, 0, 0], body: [-8, 0, 0] }, 'snap'],
    [0.7, {}],
  ]),
  bite: clip('bite', 0.8, [
    [0, {}],
    [0.25, { neck: [-15, 0, 0], head: [-25, 0, 0], jaw: [60, 0, 0], body: [-6, 0, 0], root: [0, -8, 0] }],
    [0.36, { neck: [35, 0, 0], head: [10, 0, 0], jaw: [0, 0, 0], body: [10, 0, 0], root: [0, -4, 0] }, 'snap'],
    [0.8, {}],
  ]),
  leap: clip('leap', 1.2, [
    [0, {}],
    [0.4, { body: [12, 0, 0], neck: [-10, 0, 0], jaw: [50, 0, 0], root: [0, -15, 0], flA: [30, 0, 0], frA: [30, 0, 0], blA: [-30, 0, 0], brA: [-30, 0, 0] }],
    [0.55, { body: [-15, 0, 0], neck: [10, 0, 0], jaw: [65, 0, 0], root: [0, 25, 0], flA: [-70, 0, 0], frA: [-70, 0, 0], blA: [60, 0, 0], brA: [60, 0, 0] }, 'snap'],
    [0.75, { body: [10, 0, 0], neck: [30, 0, 0], jaw: [0, 0, 0], root: [0, 0, 0] }, 'snap'],
    [1.2, {}],
  ]),
  hurt: clip('hurt', 0.4, [
    [0, { body: [-10, 0, 20], neck: [-20, 30, 0], jaw: [50, 0, 0] }, 'snap'],
    [0.4, {}],
  ]),
  stagger: clip('stagger', 0.9, [
    [0, { body: [-10, 0, 40], neck: [-20, 40, 0], jaw: [50, 0, 0], root: [0, -15, 0] }, 'snap'],
    [0.9, {}],
  ]),
  death: clip('death', 1.4, [
    [0, { body: [0, 0, 30], jaw: [60, 0, 0] }, 'snap'],
    [0.6, { body: [0, 0, 88], root: [0, -45, 0], neck: [20, 0, 0], jaw: [40, 0, 0], flA: [-30, 0, 0], blA: [30, 0, 0] }],
    [1.4, { body: [0, 0, 90], root: [0, -48, 0], neck: [30, 0, 0], jaw: [50, 0, 0], flA: [-40, 0, 0], frA: [-20, 0, 0], blA: [40, 0, 0], brA: [20, 0, 0] }],
  ]),
};

// ======================================================================= CAMPANERO
const BELL_BASE = { chest: [15, 0, 0], armR: [-20, 0, -18], foreR: [-50, 0, 0], handR: [40, 0, 0], armL: [0, 0, 16], foreL: [-15, 0, 0] };
const bellClips = {
  alert: clip('alert', 1.2, [
    [0, { ...BELL_BASE }],
    [0.4, { ...BELL_BASE, chest: [-15, 0, 0], armL: [-40, 0, 60], armR: [-60, 0, -60], bellJ: [-15, 0, 0] }, 'snap'],
    [0.8, { ...BELL_BASE, chest: [-10, 0, 0], armL: [-40, 0, 60], armR: [-60, 0, -60], bellJ: [10, 0, 0] }],
    [1.2, { ...BELL_BASE }],
  ]),
  slam: clip('slam', 2.3, [
    [0, { ...BELL_BASE }],
    [0.95, { chest: [-18, 0, 0], armR: [-205, 0, -10], foreR: [-30, 0, 0], handR: [40, 0, 0], armL: [-200, 0, 10], foreL: [-40, 0, 0], legL: [15, 0, 5], legR: [-15, 0, -5], bellJ: [-10, 0, 0] }],
    [1.1, { chest: [45, 0, 0], armR: [-45, 0, -5], foreR: [-5, 0, 0], handR: [80, 0, 0], armL: [-50, 0, 10], foreL: [-10, 0, 0], legL: [30, 0, 5], legR: [-40, 0, -5], shinR: [40, 0, 0], root: [0, -25, 0], bellJ: [20, 0, 0] }, 'snap'],
    [1.7, { chest: [42, 0, 0], armR: [-42, 0, -5], foreR: [-5, 0, 0], handR: [80, 0, 0], armL: [-48, 0, 10], legL: [30, 0, 5], legR: [-40, 0, -5], shinR: [40, 0, 0], root: [0, -25, 0], bellJ: [10, 0, 0] }],
    [2.3, { ...BELL_BASE }],
  ]),
  sweep: clip('sweep', 1.9, [
    [0, { ...BELL_BASE }],
    [0.8, { chest: [10, -60, 0], armR: [-90, 0, -110], foreR: [-20, 0, 0], handR: [80, 0, 0], armL: [-30, 0, 40], legL: [10, 0, 0], legR: [-20, 0, 0] }],
    [0.98, { chest: [20, 55, 0], armR: [-90, 0, 55], foreR: [-5, 0, 0], handR: [85, 0, 0], armL: [-20, 0, 30], root: [0, -10, 0] }, 'snap'],
    [1.4, { chest: [18, 60, 0], armR: [-80, 0, 70], foreR: [-15, 0, 0], handR: [80, 0, 0], root: [0, -10, 0] }],
    [1.9, { ...BELL_BASE }],
  ]),
  toll: clip('toll', 2.5, [
    [0, { ...BELL_BASE }],
    [0.5, { chest: [-10, 0, 0], armL: [-160, 0, 40], foreL: [-60, 0, 0], armR: [-160, 0, -40], foreR: [-60, 0, 0], bellJ: [0, 0, 0] }],
    [0.8, { chest: [-5, 25, 0], armL: [-160, 0, 40], foreL: [-60, 0, 0], armR: [-160, 0, -40], foreR: [-60, 0, 0], bellJ: [0, 0, 25] }],
    [1.05, { chest: [-5, -25, 0], armL: [-160, 0, 40], foreL: [-60, 0, 0], armR: [-160, 0, -40], foreR: [-60, 0, 0], bellJ: [0, 0, -25] }],
    [1.3, { chest: [20, 0, 0], armL: [-40, 0, 60], armR: [-40, 0, -60], bellJ: [25, 0, 0], root: [0, -15, 0] }, 'snap'],
    [1.9, { chest: [15, 0, 0], armL: [-40, 0, 60], armR: [-40, 0, -60], bellJ: [-10, 0, 0], root: [0, -10, 0] }],
    [2.5, { ...BELL_BASE }],
  ]),
  hurt: clip('hurt', 0.5, [
    [0, { ...BELL_BASE, chest: [0, 15, 0], bellJ: [-15, 0, 10], root: [0, -4, -6] }, 'snap'],
    [0.5, { ...BELL_BASE }],
  ]),
  stagger: clip('stagger', 1.8, [
    [0, { chest: [-20, 20, 0], bellJ: [-20, 0, 15], armL: [-20, 0, 60], armR: [-30, 0, -60], root: [0, -10, -15] }, 'snap'],
    [0.8, { chest: [45, 0, 0], bellJ: [30, 0, 0], armL: [-20, 0, 10], armR: [-20, 0, -10], root: [0, -50, 0], legL: [-80, 0, 0], shinL: [100, 0, 0], legR: [-30, 0, 0], shinR: [100, 0, 0] }],
    [1.8, { ...BELL_BASE }],
  ]),
  death: clip('death', 2.2, [
    [0, { chest: [-20, 0, 0], bellJ: [-20, 0, 0], armL: [-30, 0, 50], armR: [-30, 0, -50] }, 'snap'],
    [0.7, { chest: [35, 0, 0], bellJ: [20, 0, 0], root: [0, -60, 0], legL: [-95, 0, 5], shinL: [100, 0, 0], legR: [-95, 0, -5], shinR: [100, 0, 0], armL: [10, 0, 20], armR: [10, 0, -20] }],
    [1.5, { hips: [80, 0, 0], chest: [10, 0, 0], root: [0, -100, 0], armL: [-150, 0, 30], armR: [-60, 0, -50], legL: [-10, 0, 5], legR: [-5, 0, -5] }, 'in'],
    [2.2, { hips: [86, 0, 0], chest: [4, 0, 0], root: [0, -104, 0], armL: [-150, 0, 30], armR: [-60, 0, -50], legL: [-4, 0, 5], legR: [-4, 0, -5] }],
  ]),
};

// ======================================================================= PLAÑIDERA
const MOUR_BASE = { chest: [8, 0, 0], head: [15, 0, 12], armL: [5, 0, 6], foreL: [-5, 0, 0], armR: [5, 0, -6], foreR: [-5, 0, 0] };
const mourClips = {
  alert: clip('alert', 1.1, [
    [0, { ...MOUR_BASE }],
    [0.4, { chest: [-25, 0, 0], head: [-50, 0, 0], armL: [-20, 0, 60], armR: [-20, 0, -60] }, 'snap'],
    [1.1, { ...MOUR_BASE }],
  ]),
  scream: clip('scream', 1.8, [
    [0, { ...MOUR_BASE }],
    [0.75, { chest: [-25, 0, 0], head: [-55, 0, 0], armL: [-150, 0, 50], foreL: [-20, 0, 0], armR: [-150, 0, -50], foreR: [-20, 0, 0] }],
    [0.9, { chest: [25, 0, 0], head: [20, 0, 0], armL: [-80, 0, 70], foreL: [0, 0, 0], armR: [-80, 0, -70], foreR: [0, 0, 0] }, 'snap'],
    [1.3, { chest: [20, 0, 0], head: [15, 0, 0], armL: [-75, 0, 65], armR: [-75, 0, -65] }],
    [1.8, { ...MOUR_BASE }],
  ]),
  swipe: clip('swipe', 1.4, [
    [0, { ...MOUR_BASE }],
    [0.55, { chest: [5, -50, 0], armR: [-90, 0, -110], foreR: [-10, 0, 0], armL: [-30, 0, 30] }],
    [0.7, { chest: [15, 50, 0], armR: [-90, 0, 60], foreR: [0, 0, 0], armL: [-30, 0, 30] }, 'snap'],
    [1.0, { chest: [15, 55, 0], armR: [-85, 0, 70], foreR: [-10, 0, 0] }],
    [1.4, { ...MOUR_BASE }],
  ]),
  hurt: clip('hurt', 0.5, [
    [0, { ...MOUR_BASE, chest: [-20, 0, 15], head: [-30, 0, 30], root: [0, 0, -10] }, 'snap'],
    [0.5, { ...MOUR_BASE }],
  ]),
  stagger: clip('stagger', 1.1, [
    [0, { chest: [-30, 0, 20], head: [-40, 0, 40], armL: [-40, 0, 80], armR: [-40, 0, -80], root: [0, -10, -15] }, 'snap'],
    [1.1, { ...MOUR_BASE }],
  ]),
  death: clip('death', 2.0, [
    [0, { chest: [-30, 0, 0], head: [-60, 0, 0], armL: [-150, 0, 40], armR: [-150, 0, -40] }, 'snap'],
    [1.0, { chest: [40, 0, 0], head: [50, 0, 0], armL: [0, 0, 30], armR: [0, 0, -30], root: [0, -90, 0] }],
    [2.0, { chest: [60, 0, 0], head: [60, 0, 0], armL: [10, 0, 50], armR: [10, 0, -50], root: [0, -130, 0] }],
  ]),
};

// ======================================================================= EMPALADO
const IMP_BASE = { chest: [10, 0, 0], armR: [-35, 0, -12], foreR: [-50, 0, 0], handR: [55, 0, 0], armL: [-30, 0, 15], foreL: [-60, 0, 0] };
const impClips = {
  alert: clip('alert', 1.6, [
    [0, { ...IMP_BASE }],
    [0.6, { chest: [-25, 0, 0], head: [-35, 0, 0], armL: [-60, 0, 70], armR: [-60, 0, -70], foreR: [-30, 0, 0] }, 'snap'],
    [1.6, { ...IMP_BASE }],
  ]),
  slam: clip('slam', 2.1, [
    [0, { ...IMP_BASE }],
    [0.9, { chest: [-20, 0, 0], armR: [-210, 0, -10], foreR: [-30, 0, 0], handR: [50, 0, 0], armL: [-200, 0, 15], foreL: [-40, 0, 0], legL: [20, 0, 5], legR: [-20, 0, -5] }],
    [1.02, { chest: [45, 0, 0], armR: [-42, 0, -4], foreR: [-5, 0, 0], handR: [85, 0, 0], armL: [-50, 0, 10], foreL: [-10, 0, 0], legL: [35, 0, 5], legR: [-45, 0, -5], shinR: [45, 0, 0], root: [0, -30, 0] }, 'snap'],
    [1.6, { chest: [42, 0, 0], armR: [-40, 0, -4], foreR: [-5, 0, 0], handR: [85, 0, 0], armL: [-48, 0, 10], legL: [35, 0, 5], legR: [-45, 0, -5], shinR: [45, 0, 0], root: [0, -30, 0] }],
    [2.1, { ...IMP_BASE }],
  ]),
  sweep: clip('sweep', 1.8, [
    [0, { ...IMP_BASE }],
    [0.7, { chest: [10, -65, 0], armR: [-90, 0, -110], foreR: [-20, 0, 0], handR: [80, 0, 0], armL: [-80, 0, -60], foreL: [-30, 0, 0] }],
    [0.86, { chest: [20, 55, 0], armR: [-90, 0, 55], foreR: [-5, 0, 0], handR: [85, 0, 0], armL: [-80, 0, 20], root: [0, -12, 0] }, 'snap'],
    [1.3, { chest: [18, 60, 0], armR: [-80, 0, 70], foreR: [-15, 0, 0], handR: [80, 0, 0], root: [0, -12, 0] }],
    [1.8, { ...IMP_BASE }],
  ]),
  stomp: clip('stomp', 1.3, [
    [0, { ...IMP_BASE }],
    [0.5, { ...IMP_BASE, legL: [-70, 0, 10], shinL: [60, 0, 0], chest: [-10, 0, 0], root: [0, 6, 0] }],
    [0.62, { ...IMP_BASE, legL: [5, 0, 10], shinL: [0, 0, 0], chest: [20, 0, 0], root: [0, -14, 0] }, 'snap'],
    [1.3, { ...IMP_BASE }],
  ]),
  charge: clip('charge', 2.4, [
    [0, { ...IMP_BASE }],
    [0.6, { chest: [40, 0, 0], head: [-30, 0, 0], armR: [-60, 0, -20], armL: [-60, 0, 20], root: [0, -20, 0] }],
    [0.62, { chest: [40, 0, 0], head: [-30, 0, 0], armR: [-60, 0, -20], armL: [-60, 0, 20], root: [0, -20, 0] }],
    [1.9, { chest: [40, 0, 0], head: [-30, 0, 0], armR: [-60, 0, -20], armL: [-60, 0, 20], root: [0, -20, 0] }],
    [2.4, { ...IMP_BASE }],
  ]),
  hurt: clip('hurt', 0.45, [
    [0, { ...IMP_BASE, chest: [0, 10, 0], head: [-10, 0, 10] }, 'snap'],
    [0.45, { ...IMP_BASE }],
  ]),
  stagger: clip('stagger', 2.0, [
    [0, { chest: [-25, 20, 0], head: [-30, 0, 0], armL: [-20, 0, 60], armR: [-20, 0, -60], root: [0, -10, -15] }, 'snap'],
    [0.9, { chest: [45, 0, 0], head: [20, 0, 0], root: [0, -60, 0], legL: [-80, 0, 0], shinL: [100, 0, 0], legR: [-30, 0, 0], shinR: [100, 0, 0], armL: [-10, 0, 20], armR: [-10, 0, -20] }],
    [2.0, { ...IMP_BASE }],
  ]),
  death: clip('death', 3.0, [
    [0, { chest: [-30, 0, 0], head: [-40, 0, 0], armL: [-40, 0, 60], armR: [-40, 0, -60] }, 'snap'],
    [1.0, { chest: [30, 0, 0], head: [40, 0, 0], root: [0, -80, 0], legL: [-95, 0, 5], shinL: [100, 0, 0], legR: [-95, 0, -5], shinR: [100, 0, 0], armL: [10, 0, 20], armR: [10, 0, -20] }],
    [2.0, { hips: [80, 0, 0], chest: [8, 0, 0], root: [0, -135, 0], armL: [-150, 0, 30], armR: [-60, 0, -50], legL: [-10, 0, 5], legR: [-5, 0, -5] }, 'in'],
    [3.0, { hips: [86, 0, 0], chest: [4, 0, 0], root: [0, -140, 0], armL: [-150, 0, 30], armR: [-60, 0, -50], legL: [-4, 0, 5], legR: [-4, 0, -5] }],
  ]),
};

// ======================================================================= TURIFERARIO
const TUR_BASE = { chest: [12, 0, 0], head: [-10, 0, 0], armR: [-45, 0, -25], foreR: [-40, 0, 0], armL: [-15, 0, 18], foreL: [-30, 0, 0] };
const turClips = {
  intro: clip('intro', 3.4, [
    [0, { chest: [70, 0, 0], head: [50, 0, 0], armR: [0, 0, -10], armL: [0, 0, 10], root: [0, -60, 0], legL: [-90, 0, 5], shinL: [100, 0, 0], legR: [-90, 0, -5], shinR: [100, 0, 0] }],
    [1.4, { chest: [60, 0, 0], head: [30, 0, 0], armR: [-20, 0, -20], armL: [-20, 0, 20], root: [0, -55, 0], legL: [-90, 0, 5], shinL: [100, 0, 0], legR: [-90, 0, -5], shinR: [100, 0, 0] }],
    [2.4, { chest: [-25, 0, 0], head: [-40, 0, 0], armR: [-150, 0, -40], armL: [-150, 0, 40], foreL: [-20, 0, 0] }, 'snap'],
    [3.4, { ...TUR_BASE }],
  ]),
  sweep: clip('sweep', 2.5, [
    [0, { ...TUR_BASE }],
    [0.85, { chest: [5, -55, 0], armR: [-80, 0, -120], foreR: [-20, 0, 0], armL: [-30, 0, 40] }],
    [1.25, { chest: [15, 50, 0], armR: [-95, 0, 60], foreR: [-5, 0, 0], armL: [-20, 0, 30] }],
    [1.6, { chest: [12, 60, 0], armR: [-85, 0, 80], foreR: [-15, 0, 0] }],
    [2.5, { ...TUR_BASE }],
  ]),
  slam: clip('slam', 2.7, [
    [0, { ...TUR_BASE }],
    [1.1, { chest: [-25, 0, 0], head: [-30, 0, 0], armR: [-200, 0, -15], foreR: [-20, 0, 0], armL: [-60, 0, 40] }],
    [1.35, { chest: [45, 0, 0], head: [10, 0, 0], armR: [-60, 0, -5], foreR: [-5, 0, 0], armL: [-40, 0, 30], root: [0, -40, 0], legL: [20, 0, 0], legR: [-40, 0, 0], shinR: [40, 0, 0] }, 'snap'],
    [1.9, { chest: [40, 0, 0], armR: [-55, 0, -5], foreR: [-5, 0, 0], root: [0, -40, 0], legL: [20, 0, 0], legR: [-40, 0, 0], shinR: [40, 0, 0] }],
    [2.7, { ...TUR_BASE }],
  ]),
  spin: clip('spin', 4.2, [
    [0, { ...TUR_BASE }],
    [0.6, { chest: [-5, 0, 0], head: [-20, 0, 0], armR: [-170, 0, -20], foreR: [-10, 0, 0], armL: [-40, 0, 50] }],
    [3.4, { chest: [-5, 0, 0], head: [-20, 0, 0], armR: [-170, 0, -20], foreR: [-10, 0, 0], armL: [-40, 0, 50] }],
    [4.2, { ...TUR_BASE }],
  ]),
  stomp: clip('stomp', 1.5, [
    [0, { ...TUR_BASE }],
    [0.6, { ...TUR_BASE, legL: [-60, 0, 10], shinL: [50, 0, 0], chest: [-10, 0, 0], root: [0, 10, 0] }],
    [0.72, { ...TUR_BASE, legL: [5, 0, 10], shinL: [0, 0, 0], chest: [25, 0, 0], root: [0, -20, 0] }, 'snap'],
    [1.5, { ...TUR_BASE }],
  ]),
  volley: clip('volley', 2.4, [
    [0, { ...TUR_BASE }],
    [0.8, { chest: [-20, 0, 0], head: [-35, 0, 0], armR: [-190, 0, -20], foreR: [-20, 0, 0], armL: [-120, 0, 50] }],
    [1.9, { chest: [-15, 0, 0], head: [-30, 0, 0], armR: [-185, 0, -20], foreR: [-20, 0, 0], armL: [-120, 0, 50] }],
    [2.4, { ...TUR_BASE }],
  ]),
  roar: clip('roar', 2.4, [
    [0, { ...TUR_BASE }],
    [0.5, { chest: [40, 0, 0], head: [40, 0, 0], armL: [-30, 0, 20], armR: [-30, 0, -20], root: [0, -30, 0] }],
    [1.0, { chest: [-35, 0, 0], head: [-50, 0, 0], armL: [-140, 0, 60], armR: [-140, 0, -60] }, 'snap'],
    [2.0, { chest: [-30, 0, 0], head: [-45, 0, 0], armL: [-140, 0, 60], armR: [-140, 0, -60] }],
    [2.4, { ...TUR_BASE }],
  ]),
  hurt: clip('hurt', 0.5, [
    [0, { ...TUR_BASE, chest: [-5, 10, 0], head: [-20, 0, 10] }, 'snap'],
    [0.5, { ...TUR_BASE }],
  ]),
  stagger: clip('stagger', 2.2, [
    [0, { chest: [-20, 20, 0], head: [-35, 0, 0], armL: [-30, 0, 60], armR: [-60, 0, -40], root: [0, -10, -15] }, 'snap'],
    [1.0, { chest: [50, 0, 0], head: [30, 0, 0], root: [0, -90, 0], legL: [-85, 0, 0], shinL: [100, 0, 0], legR: [-40, 0, 0], shinR: [100, 0, 0], armL: [-20, 0, 20], armR: [-40, 0, -20] }],
    [2.2, { ...TUR_BASE }],
  ]),
  death: clip('death', 4.0, [
    [0, { chest: [-35, 0, 0], head: [-50, 0, 0], armL: [-150, 0, 50], armR: [-150, 0, -50] }, 'snap'],
    [1.4, { chest: [30, 0, 0], head: [40, 0, 0], root: [0, -100, 0], legL: [-95, 0, 5], shinL: [100, 0, 0], legR: [-95, 0, -5], shinR: [100, 0, 0], armL: [-40, 0, 30], armR: [-40, 0, -30] }],
    [2.8, { hips: [80, 0, 0], chest: [10, 0, 0], root: [0, -190, 0], armL: [-160, 0, 30], armR: [-80, 0, -50], legL: [-10, 0, 5], legR: [-5, 0, -5] }, 'in'],
    [4.0, { hips: [86, 0, 0], chest: [4, 0, 0], head: [20, 30, 0], root: [0, -196, 0], armL: [-160, 0, 30], armR: [-80, 0, -50], legL: [-4, 0, 5], legR: [-4, 0, -5] }],
  ]),
};

turClips.alert = turClips.intro;

// Incensario del jefe: objeto 3D + cadena + fuego + luz.
function censerInit(e) {
  const g = e.game;
  const grp = new THREE.Group();
  const bronze = objMat('bronze'),
    iron = objMat('iron'),
    glow = objMat('redGlow'),
    ember = objMat('ember');
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 7), bronze);
  grp.add(body);
  for (const a of [0, Math.PI / 2]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 4, 12), iron);
    band.rotation.y = a;
    grp.add(band);
  }
  const eq = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.06, 4, 12), iron);
  eq.rotation.x = Math.PI / 2;
  grp.add(eq);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.7, 8), bronze);
  cap.position.y = 0.75;
  grp.add(cap);
  for (let i = 0; i < 6; i++) {
    const hole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.05), ember);
    const a = (i / 6) * Math.PI * 2;
    hole.position.set(Math.cos(a) * 0.58, 0.1, Math.sin(a) * 0.58);
    hole.rotation.y = -a + Math.PI / 2;
    grp.add(hole);
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 4), glow);
  core.position.y = -0.45;
  grp.add(core);
  g.scene.add(grp);
  // llamas (sprites animados)
  const flames = [];
  for (let i = 0; i < 3; i++) {
    const tex = getTexture('fire').clone();
    tex.needsUpdate = true;
    tex.repeat.set(1 / 8, 1);
    const sm = additiveFog(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: true }));
    const sp = new THREE.Sprite(sm);
    sp.scale.set(0.9, 1.6, 1);
    g.scene.add(sp);
    flames.push(sp);
  }
  // velas de la corona
  const candles = [];
  for (let i = 0; i < 7; i++) {
    const tex = getTexture('fire').clone();
    tex.needsUpdate = true;
    tex.repeat.set(1 / 8, 1);
    const sp = new THREE.Sprite(additiveFog(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: true })));
    sp.scale.set(0.22, 0.4, 1);
    g.scene.add(sp);
    candles.push(sp);
  }
  // cadena
  const links = [];
  const lg = new THREE.TorusGeometry(0.09, 0.025, 3, 6);
  for (let i = 0; i < 14; i++) {
    const l = new THREE.Mesh(lg, iron);
    g.scene.add(l);
    links.push(l);
  }
  e.P.censer = { grp, flames, candles, links, pos: new THREE.Vector3(), vel: new THREE.Vector3(), len: 3.6, light: g.bossLight };
}

function censerReset(e) {
  const c = e.P.censer;
  if (!c) return;
  e.rig.root.updateMatrixWorld(true);
  const h = e.rig.worldPos('handR');
  c.pos.set(h.x, h.y - c.len, h.z);
  c.vel.set(0, 0, 0);
}

const _v = new THREE.Vector3();
const _h = new THREE.Vector3();
function censerUpdate(e, dt) {
  const c = e.P.censer;
  e.rig.root.updateMatrixWorld(true);
  const H = e.rig.worldPos('handR', _h, new THREE.Vector3(0, -0.2, 0));
  // objetivo guiado durante los ataques
  const tgt = e.data.censerTarget;
  c.vel.y -= 16 * dt;
  if (tgt) {
    const k = e.data.censerPull ?? 10;
    c.vel.x += (tgt.x - c.pos.x) * k * dt;
    c.vel.y += (tgt.y - c.pos.y) * k * dt;
    c.vel.z += (tgt.z - c.pos.z) * k * dt;
    c.vel.multiplyScalar(Math.exp(-2.5 * dt));
  } else c.vel.multiplyScalar(Math.exp(-0.9 * dt));
  c.pos.addScaledVector(c.vel, dt);
  // restricción de cuerda
  _v.subVectors(c.pos, H);
  const d = _v.length();
  if (d > c.len) {
    _v.multiplyScalar(1 / d);
    c.pos.copy(H).addScaledVector(_v, c.len);
    const radial = c.vel.dot(_v);
    if (radial > 0) c.vel.addScaledVector(_v, -radial);
  }
  // suelo
  const floor = e.home.y + 0.55;
  if (c.pos.y < floor) {
    if (c.vel.y < -6 && e.data.slamArmed) {
      e.data.slamArmed = false;
      e.game.combat.fireBurst(c.pos.x, e.home.y, c.pos.z, 3.3, e.data.phase === 2 ? 34 : 28, e);
    }
    c.pos.y = floor;
    c.vel.y *= -0.2;
    c.vel.x *= 0.8;
    c.vel.z *= 0.8;
  }
  c.grp.position.copy(c.pos);
  c.grp.rotation.y += dt * 1.5;
  // cadena con comba
  const n = c.links.length;
  const slack = Math.max(0, c.len - d) * 0.5;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const l = c.links[i];
    l.position.lerpVectors(H, c.pos, t);
    l.position.y -= Math.sin(t * Math.PI) * slack;
    l.rotation.set(i * 1.3, i * 0.7, 0);
  }
  // fuego del incensario
  const T = e.game.time;
  const frame = Math.floor(T * 12) % 8;
  c.flames.forEach((f, i) => {
    f.position.set(c.pos.x + Math.sin(i * 2.1) * 0.2, c.pos.y + 0.7 + i * 0.12, c.pos.z + Math.cos(i * 2.1) * 0.2);
    f.material.map.offset.x = ((frame + i * 3) % 8) / 8;
    const big = e.data.phase === 2 ? 1.5 : 1;
    f.scale.set(0.9 * big, 1.6 * big, 1);
  });
  const offs = CANDLE_OFFSETS();
  c.candles.forEach((f, i) => {
    f.position.copy(e.rig.worldPos('head', _v, offs[i]));
    f.material.map.offset.x = ((frame + i * 5) % 8) / 8;
  });
  if (c.light) {
    c.light.position.copy(c.pos).y += 0.8;
    c.light.intensity = e.dead ? damp(c.light.intensity, 0, 1, dt) : (e.data.phase === 2 ? 40 : 26) * (0.85 + 0.15 * Math.sin(T * 17));
  }
  const vis = e.obj.visible;
  c.grp.visible = vis;
  c.flames.forEach((f) => (f.visible = vis && !e.dead));
  c.candles.forEach((f) => (f.visible = vis && !e.dead));
  c.links.forEach((l) => (l.visible = vis));
}

// ======================================================================= DEFINICIONES
export const TYPES = {
  penitent: {
    name: 'Penitente',
    build: buildPenitent,
    hp: 60,
    poise: 22,
    radius: 0.4,
    height: 1.7,
    lockHeight: 1.3,
    walk: 1.3,
    run: 3.1,
    runDist: 5,
    sight: 13,
    hear: 4,
    turn: 4,
    stride: 2.4,
    approach: 1.4,
    leash: 28,
    clips: penClips,
    voice: 'penitent',
    attacks: [
      { name: 'slash', clip: penClips.slash, dur: 1.3, min: 0, max: 2.0, hits: [[0.56, 0.7]], dmg: 17, range: 2.1, arc: 100, weight: 3 },
      { name: 'double', clip: penClips.double, dur: 1.7, min: 0, max: 2.0, hits: [[0.44, 0.56], [0.98, 1.1]], dmg: 13, range: 2.0, arc: 120, weight: 2 },
      { name: 'lunge', clip: penClips.lunge, dur: 1.55, min: 2.8, max: 5.5, hits: [[0.8, 0.95]], dmg: 22, range: 2.2, arc: 70, lunge: [[0.62, 0.9, 7]], weight: 2, turn: 3 },
    ],
    idlePose: penIdle,
    biped: { scale: 0.95, style: GAIT.shamble, stance: 0.06 },
    loco: (e, t, spd) => rad(humanStyle(e, t, { hunch: 32, armR: [-30, 0, -10], foreR: [-40, 0, 0], handR: [30, 0, 0], armL: [-10, 0, 8], armRSwing: 0.3, headZ: S(t * 0.7) * 10 })),
  },
  soldier: {
    name: 'Soldado cosido',
    build: buildSoldier,
    hp: 115,
    poise: 45,
    radius: 0.42,
    height: 1.85,
    lockHeight: 1.45,
    walk: 1.7,
    run: 3.8,
    runDist: 6,
    sight: 15,
    hear: 4,
    turn: 5,
    approach: 1.8,
    canBlock: true,
    blockChance: 0.4,
    clips: solClips,
    voice: 'soldier',
    attacks: [
      { name: 'combo', clip: solClips.combo, dur: 1.7, min: 0, max: 2.3, hits: [[0.44, 0.58], [0.98, 1.12]], dmg: 18, range: 2.4, arc: 110, weight: 3, lunge: [[0.4, 0.5, 2], [0.95, 1.05, 2]] },
      { name: 'thrust', clip: solClips.thrust, dur: 1.35, min: 1.5, max: 3.6, hits: [[0.6, 0.74]], dmg: 24, range: 2.8, arc: 40, lunge: [[0.56, 0.74, 5]], weight: 2 },
      { name: 'arm3', clip: solClips.arm3, dur: 1.7, min: 0, max: 2.2, hits: [[0.98, 1.12]], dmg: 28, range: 2.3, arc: 70, weight: 1.5, stDmg: 40 },
    ],
    biped: { scale: 1.03, stance: 0.14 },
    shield: { yaw: 0.3, pitch: -0.08, out: 0.08, along: 0.14 },
    loco: (e, t, spd) => {
      const p = humanStyle(e, t, { hunch: 6, armR: [-30, 0, -8], foreR: [-62, 0, 0], handR: [38, 0, 0], armL: [-40, 0, 18], foreL: [-70, 0, 0], armRSwing: 0.3, armLSwing: 0.2 });
      p.arm3 = [S(t * 2.7 + e.phase) * 18, S(t * 1.9) * 10, S(t * 3.3) * 15];
      p.fore3 = [S(t * 3.1) * 25, 0, 0];
      return rad(p);
    },
    idlePose: (e, kind, t, spd) => {
      if (kind === 'wander') return TYPES.soldier.loco(e, t, spd);
      const p = humanStyle(e, t, { hunch: 6, armR: [-10, 0, -8], foreR: [-20, 0, 0], handR: [60, 0, 0], armL: [-20, 0, 12], foreL: [-60, 0, 0], headX: 20 + S(t * 0.8) * 6, headZ: S(t * 0.5) * 12 });
      p.arm3 = [S(t * 2.7) * 25, 0, S(t * 3.3) * 20];
      return rad(p);
    },
  },
  crawler: {
    name: 'Rastrero',
    build: buildCrawler,
    hp: 48,
    poise: 12,
    radius: 0.45,
    height: 1.0,
    lockHeight: 0.8,
    walk: 3.2,
    run: 5.6,
    runDist: 3,
    sight: 14,
    hear: 5,
    turn: 7,
    stride: 3.2,
    approach: 1.2,
    fps: 24,
    clips: crClips,
    voice: 'crawler',
    alertTime: 0.6,
    attacks: [
      { name: 'lunge', clip: crClips.lunge, dur: 1.0, min: 0, max: 2.2, hits: [[0.45, 0.66]], dmg: 14, range: 1.6, arc: 80, lunge: [[0.42, 0.62, 6.5]], weight: 3, cd: 0.5 },
      { name: 'pounce', clip: crClips.pounce, dur: 1.5, min: 3, max: 6.5, hits: [[0.65, 1.0]], dmg: 20, range: 1.7, arc: 90, lunge: [[0.6, 1.0, 9]], weight: 2, onStart: (e) => (e.data.jump = 0.6) },
    ],
    loco: (e, t, spd) => crawlerPose(e, t, spd),
    idlePose: (e, kind, t) => {
      const p = crawlerPose(e, t, 0);
      if (kind === 'ceiling') p.head = [80 * DEG, S(t * 2) * 0.5, S(t * 1.3) * 0.4];
      return p;
    },
    update: (e, dt) => {
      if (e.data.jump !== undefined && e.state === 'attack' && e.stT >= e.data.jump) {
        e.body.vy = 5.5;
        e.body.grounded = false;
        e.body.pos.y += 0.05;
        e.data.jump = undefined;
      }
    },
    rootRot: (e) => {
      if (e.state === 'ceiling') {
        e.obj.rotation.z = Math.PI;
        e.obj.position.y = e.home.y;
      } else if (e.state === 'dropping') {
        // se da la vuelta en el aire girando sobre el centro del cuerpo (no
        // sobre los pies, que lo hacía atravesar el techo al voltearse)
        const th = Math.PI * Math.max(0, 1 - e.stT * 3);
        const bj = e._bj ?? 0.78;
        const s = Math.sin(th);
        e.obj.rotation.z = th;
        e.obj.position.set(e.pos.x + bj * s * Math.cos(e.yaw), e.pos.y + bj - bj * Math.cos(th), e.pos.z - bj * s * Math.sin(e.yaw));
      } else e.obj.rotation.z = 0;
    },
  },
  hound: {
    name: 'Mastín desollado',
    build: buildHound,
    hp: 40,
    poise: 10,
    radius: 0.42,
    height: 0.9,
    lockHeight: 0.7,
    walk: 2.2,
    run: 6.3,
    runDist: 2.5,
    sight: 15,
    hear: 6,
    turn: 8,
    stride: 3.4,
    approach: 1.3,
    fps: 24,
    clips: hdClips,
    voice: 'hound',
    alertTime: 0.5,
    attacks: [
      { name: 'bite', clip: hdClips.bite, dur: 0.8, min: 0, max: 1.9, hits: [[0.32, 0.46]], dmg: 11, range: 1.7, arc: 80, lunge: [[0.28, 0.42, 5]], weight: 3, cd: 0.4 },
      { name: 'leap', clip: hdClips.leap, dur: 1.2, min: 2.5, max: 6, hits: [[0.48, 0.72]], dmg: 16, range: 1.7, arc: 80, lunge: [[0.42, 0.72, 9]], weight: 2 },
    ],
    loco: houndPose,
    idlePose: (e, kind, t) => {
      const p = houndPose(e, t, 0);
      if (kind === 'eat') {
        const b = S(t * 9 + e.phase);
        p.neck = [60 * DEG + b * 0.15, 0, 0];
        p.head = [30 * DEG, b * 0.2, 0];
        p.jaw = [(20 + b * 20) * DEG, 0, 0];
        p.flA = [-20 * DEG, 0, 0];
        p.frA = [-25 * DEG, 0, 0];
      }
      return p;
    },
  },
  bell: {
    name: 'Campanero',
    build: buildBell,
    hp: 230,
    poise: 110,
    radius: 0.7,
    height: 2.8,
    lockHeight: 2.0,
    walk: 1.35,
    sight: 14,
    hear: 5,
    turn: 2.6,
    stride: 1.8,
    approach: 2.4,
    heavy: true,
    clips: bellClips,
    voice: 'bell',
    alertTime: 1.2,
    attacks: [
      { name: 'slam', clip: bellClips.slam, dur: 2.3, min: 0, max: 3.4, hits: [[1.08, 1.22]], dmg: 38, range: 3.5, arc: 60, weight: 3, turn: 2, events: [{ t: 1.12, fn: (e, g) => g.combat.shockwave(e.pos.x + Math.sin(e.yaw) * 2.6, e.pos.y, e.pos.z + Math.cos(e.yaw) * 2.6, 3.4, 16, e) }], stagger: true },
      { name: 'sweep', clip: bellClips.sweep, dur: 1.9, min: 0, max: 3.6, hits: [[0.9, 1.12]], dmg: 30, range: 3.7, arc: 170, weight: 2, turn: 2.2 },
      { name: 'toll', clip: bellClips.toll, dur: 2.5, min: 0, max: 7, hits: [], weight: 1, cd: 2.5, events: [{ t: 1.3, fn: (e, g) => g.combat.toll(e, 6.5, 12) }] },
    ],
    biped: { scale: 1.38, style: GAIT.heavy, stance: 0.1 },
    loco: (e, t, spd) => {
      const p = humanStyle(e, t, { hunch: 14, armR: [-20, 0, -18], foreR: [-50, 0, 0], handR: [40, 0, 0], armL: [0, 0, 16], foreL: [-15, 0, 0], armRSwing: 0.4, breath: 1.1, breathAmp: 4 });
      const ph = e.gait ? e.gait.phase * Math.PI * 2 : e.phase;
      p.bellJ = [S(ph * 2) * 4, 0, S(ph) * 6];
      return rad(p);
    },
    idlePose: (e, kind, t, spd) => TYPES.bell.loco(e, t, spd),
  },
  mourner: {
    name: 'Plañidera',
    build: buildMourner,
    hp: 72,
    poise: 16,
    radius: 0.45,
    height: 2.4,
    lockHeight: 1.8,
    walk: 1.4,
    sight: 17,
    hear: 5,
    turn: 3,
    approach: 2.2,
    keepDist: 3.5,
    float: true,
    clips: mourClips,
    voice: 'mourner',
    alertTime: 1.1,
    attacks: [
      { name: 'scream', clip: mourClips.scream, dur: 1.8, min: 3.5, max: 16, hits: [], weight: 3, cd: 1.6, events: [{ t: 0.92, fn: (e, g) => g.combat.wail(e) }] },
      { name: 'swipe', clip: mourClips.swipe, dur: 1.4, min: 0, max: 3.2, hits: [[0.66, 0.84]], dmg: 18, range: 3.2, arc: 150, weight: 3 },
    ],
    think: (e, player, d, dt) => {
      // se aleja si la acosas
      if (d < 2.5 && e.cooldown > 0) {
        const a = Math.atan2(e.pos.x - player.pos.x, e.pos.z - player.pos.z);
        e.steerTo(e.pos.x + Math.sin(a) * 3, e.pos.z + Math.cos(a) * 3, 2.6, dt, false);
        e.yaw = e.angleTo(player.pos);
        return 'handled';
      }
    },
    loco: (e, t, spd) => {
      const p = { ...MOUR_BASE };
      p.root = [0, 30 + S(t * 1.6 + e.phase) * 8, 0];
      p.chest = [8 + spd * 6, S(t * 0.7) * 8, S(t * 1.1) * 4];
      p.head = [15, S(t * 0.5) * 20, 12 + S(t * 0.9) * 8];
      p.armL = [5 + spd * 10, 0, 6 + S(t * 1.3) * 4];
      p.armR = [5 + spd * 10, 0, -6 - S(t * 1.1) * 4];
      p.veil = [10 + spd * 20 + S(t * 2) * 5, 0, 0];
      p.legL = [0, 0, 0];
      return rad(p);
    },
    idlePose: (e, kind, t, spd) => TYPES.mourner.loco(e, t, spd),
  },
  impaled: {
    name: 'El Empalado',
    build: buildImpaled,
    hp: 620,
    poise: 180,
    radius: 1.0,
    height: 3.4,
    lockHeight: 2.4,
    walk: 1.6,
    sight: 30,
    hear: 30,
    turn: 2.4,
    stride: 1.4,
    approach: 3.2,
    heavy: true,
    boss: true,
    clips: impClips,
    voice: 'impaled',
    alertTime: 1.6,
    attacks: [
      { name: 'slam', clip: impClips.slam, dur: 2.1, min: 0, max: 4.4, hits: [[1.0, 1.14]], dmg: 36, range: 4.5, arc: 50, weight: 3, turn: 2.2, stagger: true, events: [{ t: 1.05, fn: (e, g) => g.combat.shockwave(e.pos.x + Math.sin(e.yaw) * 3.4, e.pos.y, e.pos.z + Math.cos(e.yaw) * 3.4, 3.0, 16, e) }] },
      { name: 'sweep', clip: impClips.sweep, dur: 1.8, min: 0, max: 4.6, hits: [[0.8, 1.0]], dmg: 30, range: 4.7, arc: 170, weight: 3 },
      { name: 'stomp', clip: impClips.stomp, dur: 1.3, min: 0, max: 2.4, hits: [], weight: 2, events: [{ t: 0.62, fn: (e, g) => g.combat.shockwave(e.pos.x, e.pos.y, e.pos.z, 3.0, 20, e, 9) }] },
      { name: 'charge', clip: impClips.charge, dur: 2.4, min: 5, max: 14, hits: [[0.62, 1.9]], dmg: 34, range: 2.4, arc: 70, lunge: [[0.62, 1.9, 7.5]], weight: 2, phase: 2, turn: 1.5, trackUntil: 0.6, stagger: true },
    ],
    biped: { scale: 1.8, style: GAIT.heavy, stance: 0.1 },
    loco: (e, t, spd) => rad(humanStyle(e, t, { hunch: 12, armR: [-35, 0, -12], foreR: [-50, 0, 0], handR: [55, 0, 0], armL: [-30, 0, 15], foreL: [-60, 0, 0], armRSwing: 0.2, breath: 1.0, breathAmp: 3 })),
    update: (e, dt, player) => {
      if (!e.dead && e.hp < e.maxHp * 0.5 && e.data.phase !== 2) {
        e.data.phase = 2;
        e.game.onBossPhase && e.game.onBossPhase(e);
      }
      // la carga se detiene contra muros
      if (e.state === 'attack' && e.atk && e.atk.name === 'charge' && e.stT > 0.8 && e.stT < 1.9) {
        const moved = Math.hypot(e.pos.x - (e.data.lx ?? e.pos.x), e.pos.z - (e.data.lz ?? e.pos.z));
        if (moved < 0.03) {
          e.state = 'stagger';
          e.stT = 0;
          e.anim.play(impClips.stagger, { blend: 0.05 });
          e.game.camRig.shake(0.5);
          e.game.audio && e.game.audio.play('slam', e.pos);
        }
      }
      e.data.lx = e.pos.x;
      e.data.lz = e.pos.z;
    },
  },
  turibulario: {
    name: 'El Turiferario',
    build: buildTuribulario,
    hp: 1250,
    poise: 320,
    radius: 1.3,
    height: 4.6,
    lockHeight: 3.2,
    walk: 1.6,
    sight: 40,
    hear: 40,
    turn: 2.0,
    stride: 1.1,
    approach: 3.6,
    heavy: true,
    boss: true,
    fps: 30,
    clips: turClips,
    voice: 'boss',
    alertTime: 3.4,
    attacks: [
      {
        name: 'sweep',
        clip: turClips.sweep,
        dur: 2.5,
        min: 0,
        max: 6.5,
        weight: 3,
        dmg: 34,
        censer: [[0.95, 1.6]],
        update: (e, dt, t) => {
          if (t > 0.3 && t < 1.7) {
            const u = clamp((t - 0.85) / 0.75, 0, 1);
            const a = e.yaw - 1.9 + u * 3.6;
            const r = 4.6;
            e.data.censerTarget = new THREE.Vector3(e.pos.x + Math.sin(a) * r, e.pos.y + 1.3, e.pos.z + Math.cos(a) * r);
            e.data.censerPull = t < 0.85 ? 6 : 22;
          } else e.data.censerTarget = null;
        },
      },
      {
        name: 'slam',
        clip: turClips.slam,
        dur: 2.7,
        min: 0,
        max: 7,
        weight: 3,
        dmg: 40,
        censer: [[1.25, 1.45]],
        onStart: (e) => (e.data.slamArmed = true),
        update: (e, dt, t) => {
          if (t < 1.15) {
            e.data.censerTarget = new THREE.Vector3(e.pos.x - Math.sin(e.yaw) * 0.5, e.pos.y + 7.5, e.pos.z - Math.cos(e.yaw) * 0.5);
            e.data.censerPull = 7;
          } else if (t < 1.45) {
            const p = e.game.player.pos;
            const d = clamp(Math.hypot(p.x - e.pos.x, p.z - e.pos.z), 2.5, 5.5);
            e.data.censerTarget = new THREE.Vector3(e.pos.x + Math.sin(e.yaw) * d, e.pos.y - 3, e.pos.z + Math.cos(e.yaw) * d);
            e.data.censerPull = 40;
          } else e.data.censerTarget = null;
        },
      },
      {
        name: 'spin',
        clip: turClips.spin,
        dur: 4.2,
        min: 0,
        max: 7,
        weight: 2,
        dmg: 26,
        phase: 2,
        censer: [[0.8, 1.5], [1.6, 2.3], [2.4, 3.1], [3.2, 3.5]],
        update: (e, dt, t) => {
          if (t > 0.4 && t < 3.5) {
            const a = e.yaw + (t - 0.4) * 5.2;
            e.data.censerTarget = new THREE.Vector3(e.pos.x + Math.sin(a) * 5, e.pos.y + 1.5, e.pos.z + Math.cos(a) * 5);
            e.data.censerPull = 26;
          } else e.data.censerTarget = null;
        },
      },
      { name: 'stomp', clip: turClips.stomp, dur: 1.5, min: 0, max: 3.4, hits: [], weight: 2, events: [{ t: 0.72, fn: (e, g) => g.combat.shockwave(e.pos.x + Math.sin(e.yaw) * 0.8, e.pos.y, e.pos.z + Math.cos(e.yaw) * 0.8, 3.4, 24, e, 10) }] },
      {
        name: 'volley',
        clip: turClips.volley,
        dur: 2.4,
        min: 4,
        max: 18,
        weight: 2,
        phase: 2,
        events: [1.0, 1.3, 1.6].map((t) => ({ t, fn: (e, g) => g.combat.ember(e) })),
        update: (e, dt, t) => {
          if (t > 0.3 && t < 2.0) {
            e.data.censerTarget = new THREE.Vector3(e.pos.x, e.pos.y + 7 + Math.sin(t * 20) * 0.6, e.pos.z);
            e.data.censerPull = 12;
          } else e.data.censerTarget = null;
        },
      },
    ],
    init: censerInit,
    onReset: (e) => {
      e.data.phase = 1;
      censerReset(e);
    },
    biped: { scale: 2.35, style: GAIT.heavy, stance: 0.1 },
    loco: (e, t, spd) => {
      const p = humanStyle(e, t, { hunch: 12, armR: [-45, 0, -25], foreR: [-40, 0, 0], armL: [-15, 0, 18], foreL: [-30, 0, 0], armRSwing: 0.4, breath: 0.9, breathAmp: 4 });
      if (e.state === 'bossIdle') {
        Object.assign(p, { chest: [70, 0, 0], head: [50, 0, 0], armR: [0, 0, -10], armL: [0, 0, 10], root: [0, -60, 0], legL: [-90, 0, 5], shinL: [100, 0, 0], legR: [-90, 0, -5], shinR: [100, 0, 0] });
        p.chest[0] += S(t * 0.8) * 4;
      }
      return rad(p);
    },
    update: (e, dt, player) => {
      if (!e.dead && e.hp < e.maxHp * 0.5 && e.data.phase !== 2 && e.state !== 'attack') {
        e.data.phase = 2;
        e.state = 'attack';
        e.atk = { name: 'roar', clip: turClips.roar, dur: 2.4, hits: [], events: [{ t: 1.0, fn: (en, g) => g.combat.toll(en, 7, 10, 'roar') }] };
        e.stT = 0;
        e.hitDone = [];
        e.evDone = [];
        e.anim.play(turClips.roar, { blend: 0.1 });
        e.game.onBossPhase && e.game.onBossPhase(e);
      }
      if (e.data.phase === 2) e.anim.speed = 1.15;
      // golpes del incensario
      const a = e.atk;
      if (e.state === 'attack' && a && a.censer) {
        a.censer.forEach(([h0, h1], i) => {
          if (e.stT >= h0 && e.stT <= h1 && !e.hitDone[i]) {
            const c = e.P.censer.pos;
            const p = player.pos;
            const dd = Math.hypot(c.x - p.x, (c.y - (p.y + 1)) * 0.7, c.z - p.z);
            if (dd < 1.5) {
              if (e.game.combat.enemyStrikeAt(e, a, c.x, c.z)) e.hitDone[i] = true;
            }
          }
        });
      }
      if (e.state !== 'attack') e.data.censerTarget = null;
      censerUpdate(e, dt);
    },
  },
};
