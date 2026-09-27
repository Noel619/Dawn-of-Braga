// Modelos de personajes construidos con primitivas (estilo PS1/PS2).
import * as THREE from 'three';
import { Rig } from './rig.js';
import { DEG } from '../core/util.js';

// Esqueleto humanoide base (≈1.85 m). k escala todo.
export function humanoidJoints(k = 1, o = {}) {
  const arm = o.arm ?? 1,
    leg = o.leg ?? 1;
  return [
    { name: 'hips', pos: [0, 0.95 * k * leg, 0] },
    { name: 'chest', parent: 'hips', pos: [0, 0.1 * k, 0] },
    { name: 'head', parent: 'chest', pos: [0, 0.56 * k, 0.01] },
    { name: 'armL', parent: 'chest', pos: [0.22 * k, 0.5 * k, 0] },
    { name: 'foreL', parent: 'armL', pos: [0, -0.3 * k * arm, 0] },
    { name: 'handL', parent: 'foreL', pos: [0, -0.27 * k * arm, 0] },
    { name: 'armR', parent: 'chest', pos: [-0.22 * k, 0.5 * k, 0] },
    { name: 'foreR', parent: 'armR', pos: [0, -0.3 * k * arm, 0] },
    { name: 'handR', parent: 'foreR', pos: [0, -0.27 * k * arm, 0] },
    { name: 'legL', parent: 'hips', pos: [0.1 * k, -0.03 * k, 0] },
    { name: 'shinL', parent: 'legL', pos: [0, -0.45 * k * leg, 0] },
    { name: 'legR', parent: 'hips', pos: [-0.1 * k, -0.03 * k, 0] },
    { name: 'shinR', parent: 'legR', pos: [0, -0.45 * k * leg, 0] },
    { name: 'footL', parent: 'shinL', pos: [0, -0.43 * k * leg, 0] },
    { name: 'footR', parent: 'shinR', pos: [0, -0.43 * k * leg, 0] },
  ];
}

// Altura del tobillo sobre el suelo en reposo (la suela queda a -ankleH).
export const ankleH = (k = 1, leg = 1) => 0.95 * k * leg - 0.03 * k - 0.88 * k * leg;

// Pies con puntera: pieza principal + puntera algo más estrecha.
export function feetParts(k, mat, o = {}) {
  const a = ankleH(k, o.leg ?? 1);
  const w = (o.w ?? 0.12) * k,
    h = (o.h ?? 0.08) * k,
    l = (o.l ?? 0.24) * k;
  const out = [];
  for (const j of ['footL', 'footR']) {
    out.push({ j, type: 'box', s: [w, h, l * 0.62], p: [0, -a + h / 2, l * 0.12], taper: [1.05, 1.05], mat });
    out.push({ j, type: 'box', s: [w * 0.9, h * 0.72, l * 0.42], p: [0, -a + h * 0.36, l * 0.5], mat });
  }
  return out;
}

// Forma de escudo de lágrima (heater).
function heaterShape(w = 0.56, h = 0.7) {
  const s = new THREE.Shape();
  const hw = w / 2;
  s.moveTo(-hw, h * 0.42);
  s.lineTo(hw, h * 0.42);
  s.lineTo(hw, h * 0.02);
  s.quadraticCurveTo(hw * 0.95, -h * 0.35, 0, -h * 0.58);
  s.quadraticCurveTo(-hw * 0.95, -h * 0.35, -hw, h * 0.02);
  s.lineTo(-hw, h * 0.42);
  return s;
}

// ------------------------------------------------------------- jugador
// "El Condenado": caballero de la guarnición de Braga, cota de malla,
// sobreveste carmesí raída, yelmo nasal, capa, lámpara al cinto.
export function playerDef() {
  const joints = humanoidJoints(1);
  joints.push({ name: 'cloak', parent: 'chest', pos: [0, 0.5, -0.15] });
  joints.push({ name: 'lantern', parent: 'hips', pos: [0.24, -0.02, 0.06] });
  // el escudo cuelga del antebrazo; su orientación la estabiliza el animador
  joints.push({ name: 'shield', parent: 'foreL', pos: [0.02, -0.13, 0.09] });
  joints.push({ name: 'sword', parent: 'handR', pos: [0, 0, 0] });
  const parts = [
    // cadera
    { j: 'hips', type: 'box', s: [0.38, 0.1, 0.25], p: [0, 0.03, 0], mat: 'leather' },
    { j: 'hips', type: 'box', s: [0.4, 0.34, 0.27], p: [0, -0.14, 0], taper: [1.15, 1.1], mat: 'chainmail' },
    { j: 'hips', type: 'box', s: [0.3, 0.52, 0.03], p: [0, -0.25, 0.14], taper: [1.1, 1], mat: 'clothRed' },
    { j: 'hips', type: 'box', s: [0.3, 0.52, 0.03], p: [0, -0.25, -0.14], taper: [1.1, 1], mat: 'clothRed' },
    { j: 'hips', type: 'box', s: [0.05, 0.05, 0.05], p: [0.12, 0.03, 0.13], mat: 'iron' },
    // torso
    { j: 'chest', type: 'box', s: [0.44, 0.52, 0.27], p: [0, 0.26, 0], taper: [0.84, 0.9], mat: 'chainmail' },
    { j: 'chest', type: 'box', s: [0.36, 0.46, 0.03], p: [0, 0.22, 0.14], taper: [0.86, 1], mat: 'clothRed' },
    { j: 'chest', type: 'box', s: [0.36, 0.46, 0.03], p: [0, 0.22, -0.14], taper: [0.86, 1], mat: 'clothRed' },
    { j: 'chest', type: 'box', s: [0.08, 0.2, 0.01], p: [0, 0.26, 0.157], mat: 'clothWhite' },
    { j: 'chest', type: 'box', s: [0.2, 0.06, 0.01], p: [0, 0.3, 0.157], mat: 'clothWhite' },
    { j: 'chest', type: 'box', s: [0.18, 0.1, 0.22], p: [0.25, 0.47, 0], r: [0, 0, -18], mat: 'plate' },
    { j: 'chest', type: 'box', s: [0.18, 0.1, 0.22], p: [-0.25, 0.47, 0], r: [0, 0, 18], mat: 'plate' },
    { j: 'chest', type: 'cyl', s: [0.1, 0.13, 0.12], p: [0, 0.54, 0], mat: 'chainmail' },
    { j: 'chest', type: 'box', s: [0.05, 0.4, 0.03], p: [0.1, 0.3, -0.15], r: [0, 0, 25], mat: 'leather' },
    // cabeza: cofia de malla, cara, yelmo cónico nasal
    { j: 'head', type: 'box', s: [0.23, 0.25, 0.25], p: [0, 0.13, -0.01], mat: 'chainmail' },
    { j: 'head', type: 'box', s: [0.15, 0.15, 0.03], p: [0, 0.11, 0.115], mat: 'skin' },
    { j: 'head', type: 'box', s: [0.11, 0.03, 0.01], p: [0, 0.15, 0.13], mat: 'black' },
    { j: 'head', type: 'cyl', s: [0.03, 0.145, 0.19], p: [0, 0.29, 0], seg: 8, mat: 'plate' },
    { j: 'head', type: 'cyl', s: [0.148, 0.15, 0.04], p: [0, 0.2, 0], seg: 8, mat: 'iron' },
    { j: 'head', type: 'box', s: [0.035, 0.13, 0.02], p: [0, 0.13, 0.147], mat: 'iron' },
    // brazos
    { j: 'armL', type: 'box', s: [0.13, 0.32, 0.13], p: [0, -0.14, 0], taper: [0.85, 0.85], mat: 'chainmail' },
    { j: 'foreL', type: 'box', s: [0.11, 0.27, 0.11], p: [0, -0.13, 0], taper: [0.8, 0.8], mat: 'leather' },
    { j: 'handL', type: 'box', s: [0.08, 0.1, 0.09], p: [0, -0.05, 0.01], mat: 'leather' },
    { j: 'armR', type: 'box', s: [0.13, 0.32, 0.13], p: [0, -0.14, 0], taper: [0.85, 0.85], mat: 'chainmail' },
    { j: 'foreR', type: 'box', s: [0.11, 0.27, 0.11], p: [0, -0.13, 0], taper: [0.8, 0.8], mat: 'leather' },
    { j: 'handR', type: 'box', s: [0.08, 0.1, 0.09], p: [0, -0.05, 0.01], mat: 'leather' },
    // piernas
    { j: 'legL', type: 'box', s: [0.16, 0.46, 0.17], p: [0, -0.22, 0], taper: [0.8, 0.85], mat: 'clothDark' },
    { j: 'shinL', type: 'box', s: [0.13, 0.42, 0.14], p: [0, -0.2, 0], taper: [0.9, 0.9], mat: 'leather' },
    { j: 'legR', type: 'box', s: [0.16, 0.46, 0.17], p: [0, -0.22, 0], taper: [0.8, 0.85], mat: 'clothDark' },
    { j: 'shinR', type: 'box', s: [0.13, 0.42, 0.14], p: [0, -0.2, 0], taper: [0.9, 0.9], mat: 'leather' },
    ...feetParts(1, 'leather', { w: 0.12, h: 0.085, l: 0.26 }),
    // capa raída
    { j: 'cloak', type: 'box', s: [0.42, 0.92, 0.03], p: [0, -0.46, 0], taper: [1.3, 1], mat: 'clothRed', ds: true },
    { j: 'cloak', type: 'box', s: [0.5, 0.12, 0.08], p: [0, 0.0, 0.03], mat: 'clothRed' },
    // lámpara de aceite al cinto
    { j: 'lantern', type: 'box', s: [0.09, 0.12, 0.09], p: [0, -0.1, 0], mat: 'ember' },
    { j: 'lantern', type: 'box', s: [0.11, 0.02, 0.11], p: [0, -0.03, 0], mat: 'iron' },
    { j: 'lantern', type: 'box', s: [0.11, 0.02, 0.11], p: [0, -0.17, 0], mat: 'iron' },
    { j: 'lantern', type: 'cone', s: [0.06, 0.05], p: [0, 0.0, 0], mat: 'iron' },
  ];
  return { joints, parts };
}

// Espada (piezas en espacio de la mano derecha; hoja hacia +z local).
export function swordParts(j = 'handR', o = {}) {
  const len = o.len ?? 0.92;
  const y = -0.05;
  return [
    { j, type: 'cyl', s: [0.021, 0.024, 0.2], p: [0, y, 0.0], r: [90, 0, 0], seg: 6, mat: 'leather' },
    { j, type: 'box', s: [0.26, 0.035, 0.045], p: [0, y, 0.11], mat: 'iron' },
    { j, type: 'box', s: [0.05, 0.05, 0.05], p: [0.13, y, 0.11], r: [0, 0, 45], mat: 'iron' },
    { j, type: 'box', s: [0.05, 0.05, 0.05], p: [-0.13, y, 0.11], r: [0, 0, 45], mat: 'iron' },
    { j, type: 'box', s: [0.058, len, 0.014], p: [0, y, 0.13 + len / 2], r: [-90, 0, 0], taper: [0.2, 1], mat: 'plate' },
    { j, type: 'box', s: [0.012, len * 0.8, 0.018], p: [0, y, 0.15 + len * 0.4], r: [-90, 0, 0], mat: 'iron' },
    { j, type: 'ico', s: [0.036], p: [0, y, -0.12], mat: 'iron' },
  ];
}

// Escudo de lágrima en su propia articulación: cara hacia +Z, punta hacia -Y.
export function shieldParts(j = 'shield') {
  return [
    // canto de hierro (silueta algo mayor detrás de las tablas)
    { j, type: 'shape', shape: heaterShape(0.6, 0.77), s: [1, 1, 0.03], p: [0, 0.035, -0.012], mat: 'iron' },
    { j, type: 'shape', shape: heaterShape(0.54, 0.7), s: [1, 1, 0.045], p: [0, 0.035, 0.004], mat: 'planks' },
    // cruz de Braga pintada
    { j, type: 'box', s: [0.07, 0.5, 0.012], p: [0, 0.0, 0.03], mat: 'clothRed' },
    { j, type: 'box', s: [0.36, 0.07, 0.012], p: [0, 0.13, 0.03], mat: 'clothRed' },
    { j, type: 'ico', s: [0.045], p: [0, 0.13, 0.04], mat: 'iron' },
    // remaches del canto
    ...[-0.2, 0, 0.2].map((x) => ({ j, type: 'box', s: [0.03, 0.03, 0.02], p: [x, 0.3, 0.03], mat: 'iron' })),
    // correas (se ven por detrás)
    { j, type: 'box', s: [0.05, 0.3, 0.03], p: [0, 0.05, -0.035], mat: 'leather' },
  ];
}

export function buildPlayer({ sword = true, shield = true } = {}) {
  const def = playerDef();
  if (sword) def.parts.push(...swordParts('sword'));
  if (shield) def.parts.push(...shieldParts());
  return new Rig(def);
}

// ------------------------------------------------------------- cadáveres
// Aldeano/soldado genérico para cadáveres y escenas.
export function villagerDef(kind = 'villager', seed = 0) {
  const joints = humanoidJoints(0.97);
  const cloth = ['burlap', 'clothWhite', 'clothBlue', 'clothDark', 'clothRed'][seed % 5];
  const soldier = kind === 'soldier';
  const torso = soldier ? 'chainmail' : cloth;
  const parts = [
    { j: 'hips', type: 'box', s: [0.36, 0.2, 0.24], p: [0, -0.02, 0], mat: torso },
    { j: 'hips', type: 'box', s: [0.42, 0.5, 0.28], p: [0, -0.28, 0], taper: [1.15, 1.1], mat: soldier ? 'clothRed' : cloth },
    { j: 'chest', type: 'box', s: [0.4, 0.5, 0.25], p: [0, 0.26, 0], taper: [0.85, 0.9], mat: torso },
    { j: 'head', type: 'box', s: [0.2, 0.24, 0.22], p: [0, 0.12, 0], mat: 'skinCorrupt' },
    { j: 'head', type: 'box', s: [0.12, 0.04, 0.01], p: [0, 0.14, 0.115], mat: 'black' },
    { j: 'armL', type: 'box', s: [0.11, 0.3, 0.11], p: [0, -0.14, 0], mat: torso },
    { j: 'foreL', type: 'box', s: [0.09, 0.27, 0.09], p: [0, -0.13, 0], mat: 'skinCorrupt' },
    { j: 'armR', type: 'box', s: [0.11, 0.3, 0.11], p: [0, -0.14, 0], mat: torso },
    { j: 'foreR', type: 'box', s: [0.09, 0.27, 0.09], p: [0, -0.13, 0], mat: 'skinCorrupt' },
    { j: 'legL', type: 'box', s: [0.14, 0.45, 0.15], p: [0, -0.22, 0], mat: 'clothDark' },
    { j: 'shinL', type: 'box', s: [0.12, 0.44, 0.13], p: [0, -0.21, 0], mat: 'leather' },
    { j: 'legR', type: 'box', s: [0.14, 0.45, 0.15], p: [0, -0.22, 0], mat: 'clothDark' },
    { j: 'shinR', type: 'box', s: [0.12, 0.44, 0.13], p: [0, -0.21, 0], mat: 'leather' },
  ];
  if (soldier) parts.push({ j: 'head', type: 'cyl', s: [0.05, 0.13, 0.16], p: [0, 0.27, 0], mat: 'plate' });
  return { joints, parts };
}

// Poses de cadáver (grados)
export const CORPSE_POSES = {
  back: { hips: [-90, 0, 0], chest: [-5, 0, 10], head: [-10, 40, 0], armL: [-20, 0, 70], foreL: [-30, 0, 0], armR: [-60, 0, -40], foreR: [-50, 0, 0], legL: [0, 0, 12], shinL: [30, 0, 0], legR: [-30, 0, -8], shinR: [50, 0, 0] },
  face: { hips: [90, 0, 0], chest: [10, 20, 0], head: [20, -60, 0], armL: [-150, 0, 30], foreL: [-20, 0, 0], armR: [-10, 0, -30], legL: [10, 0, 10], shinL: [20, 0, 0], legR: [-10, 0, -15], shinR: [70, 0, 0] },
  sit: { hips: [-10, 0, 0], chest: [30, 0, 0], head: [50, 10, 0], armL: [10, 0, 10], foreL: [-10, 0, 0], armR: [10, 0, -10], foreR: [-20, 0, 0], legL: [-90, 0, 10], shinL: [10, 0, 0], legR: [-85, 0, -12], shinR: [30, 0, 0] },
  curl: { hips: [-90, 0, 90], chest: [40, 0, 0], head: [30, 0, 0], armL: [-80, 0, 0], foreL: [-100, 0, 0], armR: [-90, 0, 0], foreR: [-110, 0, 0], legL: [-90, 0, 0], shinL: [120, 0, 0], legR: [-80, 0, 0], shinR: [110, 0, 0] },
  hang: { hips: [0, 0, 0], chest: [5, 0, 3], head: [40, 0, 20], armL: [0, 0, 6], armR: [0, 0, -6], legL: [3, 0, 0], legR: [-4, 0, 0], shinL: [4, 0, 0] },
  kneel: { hips: [15, 0, 0], chest: [35, 0, 0], head: [30, 0, 0], armL: [-40, 0, 10], foreL: [-60, 0, 0], armR: [-40, 0, -10], foreR: [-60, 0, 0], legL: [-100, 0, 5], shinL: [100, 0, 0], legR: [-100, 0, -5], shinR: [100, 0, 0] },
};

const _m = new THREE.Matrix4();

// Hornea un cadáver en la geometría estática del mundo.
export function bakeCorpse(wb, x, y, z, yaw, poseName, kind = 'villager', seed = 0, extraDef = null) {
  const def = extraDef || villagerDef(kind, seed);
  const rig = new Rig(def);
  const pose = {};
  const P = CORPSE_POSES[poseName] || CORPSE_POSES.back;
  for (const k in P) pose[k] = P[k].map((v) => v * DEG);
  rig.apply(pose);
  // altura de la cadera según la pose
  const lie = poseName === 'back' || poseName === 'face' || poseName === 'curl';
  const hipY = lie ? 0.16 : poseName === 'sit' ? 0.2 : poseName === 'kneel' ? 0.5 : 0;
  if (poseName !== 'hang') rig.joints.hips.position.y = hipY;
  rig.root.position.set(x, y, z);
  rig.root.rotation.y = yaw;
  rig.root.updateMatrixWorld(true);
  for (const mesh of rig.meshes) {
    _m.copy(mesh.matrixWorld);
    wb.geometry(mesh.userData.matName, mesh.geometry, _m, { ao: false, uvScale: 1 });
  }
}
