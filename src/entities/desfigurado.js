// El Desfigurado: un vagabundo al que la peste mordió y no acabó de tomar.
//
// Lo de dentro quiere y él no le deja: unas noches gana uno y otras el otro.
// La mitad izquierda de la cara se le ha ido hinchando y endureciendo (la
// mejilla y la sien abultadas, el párpado caído sobre un ojo lechoso con un
// rescoldo dentro, la comisura tirada hacia abajo, que le enseña los dientes,
// bultos de carne en la sien, tras la oreja, en el cuello y en el hombro, la
// mano izquierda larga y ennegrecida); la derecha sigue siendo la de un
// hombre: chupada, pálida de no ver el sol, con el ojo claro y triste. El
// sol le quema la piel a tiras; la luna, no: la luna le deja mirarla.
//
// Va encorvado, con lo que lleva un pobre de camino: la capa de sayal
// remendada y abierta por delante, con el bajo hecho jirones; debajo, la
// saya de lino sucio ceñida con una soga, de la que cuelgan la escudilla y el
// zurrón; la capucha caída sobre los hombros (para mirar arriba); vendas en
// los antebrazos y en las manos, polainas de trapo y los pies envueltos.
//
// No es una criatura: no ataca, no se le fija ni se le hiere. Lo que hace (y
// cuándo habla) lo decide su guion: game/desfigurado.js. Aquí, el cuerpo, sus
// posturas (mirar al cielo, volverse, hablar) y los resquicios de la locura:
// los respingos de la cabeza, la mano que se le va a la cara, la risa.
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { Rig, clip } from './rig.js';
import { DEG, clamp } from '../core/util.js';
import { MAT_DEFS } from '../gfx/materials.js';
import { tube, merge, place, gSph, gBox, gCyl, gTorus, folds, table, mix, sstep, bump, head, cloth } from './sculpt.js';
import { humanoidJoints, torso, pelvis, arms, legs, gown, robe, cord, shoe, TAU } from './figure.js';

export const DE_K = 0.98;
const K = DE_K;

// UV en metros por caras (como en el Físico)
function boxUV(g) {
  const h = g.index ? g.toNonIndexed() : g;
  const p = h.attributes.position;
  const uv = new Float32Array(p.count * 2);
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3(),
    n = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    n.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b));
    const ax = Math.abs(n.x),
      ay = Math.abs(n.y),
      az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const q = k === 0 ? a : k === 1 ? b : c;
      let u, v;
      if (ax >= ay && ax >= az) [u, v] = [q.z, q.y];
      else if (ay >= az) [u, v] = [q.x, q.z];
      else [u, v] = [q.x, q.y];
      uv[(i + k) * 2] = u;
      uv[(i + k) * 2 + 1] = v;
    }
  }
  h.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return h;
}
const UVK = (mat) => (MAT_DEFS[mat]?.uv ?? 1) * 1.6 * K;
const P = (j, mat, geo, o = {}) => ({ j, type: 'geo', geo: boxUV(geo), mat, uvk: UVK(mat), ...o });
const PD = (j, mat, geo, o = {}) => P(j, mat, geo, { ds: true, ...o });

// ------------------------------------------------------------ la cara
// La cabeza de un hombre de cuarenta años que ha pasado hambre (chupada, la
// nariz algo grande, las cuencas hondas), y lo que le ha hecho la peste en
// la mitad izquierda (+x): la mejilla y la sien abultadas, la ceja que se le
// viene encima del ojo, la comisura que tira hacia abajo, la quijada con
// bultos, el cráneo con chichones donde se le cayó el pelo.
const CARA = { h: 1.02, w: 0.97, gaunt: 0.012, socket: 0.014, brow: 0.011, nose: 0.027, noseW: 1.08, hook: 0.003, cheek: 0.005, jaw: 0.94, chin: 0.006, mouth: 0.003, lips: 0.0016, ears: 0.017 };
const G3 = (x, y, z, cx, cy, cz, sx, sy, sz) => Math.exp(-(((x - cx) / sx) ** 2) - (((y - cy) / sy) ** 2) - (((z - cz) / sz) ** 2));
function deforme(x, y, z) {
  if (x < -0.004) return [0, 0, 0];
  // hacia fuera (desde el centro de la cabeza)
  const ox = x,
    oy = y - 0.13,
    oz = z + 0.01;
  const r = Math.hypot(ox, oy, oz) || 1;
  const nx = ox / r,
    ny = oy / r,
    nz = oz / r;
  let k = 0,
    dy = 0,
    dz = 0;
  // la mejilla y el pómulo, hinchados
  k += 0.017 * G3(x, y, z, 0.058, 0.128, 0.06, 0.03, 0.03, 0.05);
  // la sien
  k += 0.012 * G3(x, y, z, 0.07, 0.185, 0.02, 0.025, 0.03, 0.04);
  // la quijada, con sus bultos
  k += 0.009 * G3(x, y, z, 0.055, 0.06, 0.03, 0.02, 0.018, 0.03) + 0.006 * G3(x, y, z, 0.035, 0.035, 0.05, 0.015, 0.015, 0.02);
  // los chichones del cráneo
  k += 0.01 * G3(x, y, z, 0.055, 0.215, -0.03, 0.018, 0.018, 0.022) + 0.008 * G3(x, y, z, 0.035, 0.24, 0.025, 0.014, 0.012, 0.016) + 0.007 * G3(x, y, z, 0.07, 0.16, -0.06, 0.016, 0.02, 0.02);
  // la ceja, que se le viene encima del ojo (abajo y adelante)
  const br = G3(x, y, z, 0.034, 0.167, 0.085, 0.02, 0.01, 0.03);
  dy -= 0.007 * br;
  dz += 0.006 * br;
  // el párpado de arriba, hinchado, que le cae sobre el ojo
  const pa = G3(x, y, z, 0.032, 0.152, 0.082, 0.016, 0.008, 0.02);
  dy -= 0.006 * pa;
  dz += 0.009 * pa;
  // la comisura, tirada hacia abajo y hacia atrás
  const co = G3(x, y, z, 0.026, 0.071, 0.075, 0.012, 0.01, 0.03);
  dy -= 0.008 * co;
  dz -= 0.004 * co;
  return [nx * k, ny * k + dy, nz * k + dz];
}

// Parte una geometría en dos por sus triángulos: los que cumplen f (en su
// centro) y los demás.
function partir(g, f) {
  const h = g.index ? g.toNonIndexed() : g;
  const A = { p: [], n: [], u: [] },
    B = { p: [], n: [], u: [] };
  const pos = h.attributes.position,
    nor = h.attributes.normal,
    uv = h.attributes.uv;
  for (let i = 0; i < pos.count; i += 3) {
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3,
      cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3,
      cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const T = f(cx, cy, cz) ? B : A;
    for (let k = i; k < i + 3; k++) {
      T.p.push(pos.getX(k), pos.getY(k), pos.getZ(k));
      T.n.push(nor.getX(k), nor.getY(k), nor.getZ(k));
      if (uv) T.u.push(uv.getX(k), uv.getY(k));
    }
  }
  const mk = (T) => {
    const o = new THREE.BufferGeometry();
    o.setAttribute('position', new THREE.Float32BufferAttribute(T.p, 3));
    o.setAttribute('normal', new THREE.Float32BufferAttribute(T.n, 3));
    if (uv) o.setAttribute('uv', new THREE.Float32BufferAttribute(T.u, 2));
    return o;
  };
  return [mk(A), mk(B)];
}

// ------------------------------------------------------------ el cuerpo
export function buildDesfigurado() {
  const joints = humanoidJoints(K, { arm: 1.04 });
  // los párpados (cuelgan de su bisagra: a 0, el ojo cerrado) y la quijada
  joints.push(
    { name: 'jaw', parent: 'head', pos: [0, 0.074, 0.02] },
    { name: 'lidR', parent: 'head', pos: [-0.031, 0.158, 0.084] }
  );
  const parts = [];
  const fig = (list) => list.map((p) => ({ ...p, geo: boxUV(p.geo), uvk: UVK(p.mat) }));

  // ---------------------------------------------------------- lo de debajo
  // el tronco (la saya lo tapa: lo de fuera es saya), la pelvis, los brazos
  // flacos, las piernas (calzas) y los pies envueltos
  parts.push(P('chest', 'deTunic', torso({ w: 0.9, dep: 0.92, hunch: 0.7, pecs: 0, blades: 0.05 })));
  parts.push(P('hips', 'deTunic', pelvis({ w: 0.9, dep: 0.92 })));
  for (const p of fig(arms({ mat: 'deSkin', armT: 0.8, arm: 1.04, hand: { len: 1.05, thick: 0.86, curl: 0.35, spread: 0.25 }, handL: { len: 1.22, thick: 0.92, curl: 0.5, spread: 0.35, claw: 0.45 } }))) {
    // (la mano y el antebrazo izquierdos, de la otra piel)
    if (p.j === 'handL' || p.j === 'foreL') parts.push({ ...p, mat: 'deRot', uvk: UVK('deRot') });
    else if (p.j === 'foreR') parts.push({ ...p, mat: 'deWrap', uvk: UVK('deWrap') });
    else parts.push(p);
  }
  for (const p of fig(legs({ mat: 'deTunic', legT: 0.82, feet: 'sandal' }))) parts.push(p.j.startsWith('foot') || p.j.startsWith('shin') ? { ...p, mat: 'deWrap', uvk: UVK('deWrap') } : p);

  // ---------------------------------------------------------- el cuello y la cabeza
  parts.push(P('chest', 'deSkin', tube([[0, 0.47, -0.02], [0, 0.56, 0.0], [0, 0.65, 0.022]], (s) => [0.044 * mix(1.15, 0.95, s), 0.042 * mix(1.08, 0.92, s)], { n: 5, seg: 12 })));
  // (los tendones del lado sano)
  parts.push(P('chest', 'deSkin', tube([[-0.04, 0.64, 0.012], [-0.03, 0.57, 0.034], [-0.012, 0.5, 0.05]], 0.008, { n: 5, seg: 5, caps: true, capL: 0.01 })));
  {
    // (la cabeza, partida por una raya mellada: de la frente a la quijada,
    // algo a la izquierda de en medio; la mitad de la peste, de su piel)
    // (la raya, a manchas: la peste avanza por la mejilla y la frente del
    // lado sano en islotes, y en el malo le quedan trozos de su piel)
    const mancha = (x, y, z) => {
      const b = 0.012 + 0.014 * Math.sin(y * 55 + 1.3) + 0.009 * Math.sin(z * 80 + y * 30) + 0.006 * Math.sin(y * 130 + z * 40) - 0.02 * sstep(0.02, -0.06, z);
      if (x > b) return !(G3(x, y, z, 0.07, 0.105, -0.02, 0.012, 0.014, 0.02) > 0.5);
      return G3(x, y, z, -0.032, 0.112, 0.074, 0.011, 0.009, 0.02) > 0.5 || G3(x, y, z, -0.012, 0.205, 0.07, 0.012, 0.01, 0.03) > 0.5;
    };
    const [sana, mala] = partir(head({ ...CARA, deform: deforme, nu: 44, nv: 32 }), mancha);
    parts.push(P('head', 'deSkin', sana));
    parts.push(P('head', 'deRot', mala));
  }
  const EY = 0.141 * CARA.h;
  // el ojo derecho: el suyo, claro (el blanco, el iris gris, la niña) y su
  // párpado de arriba, que parpadea
  parts.push(P('head', 'bone', gSph(0.0138, [-0.031, EY, 0.07], [1, 0.9, 0.8], 10, 8)));
  parts.push(P('head', 'iron', gSph(0.0062, [-0.031, EY + 0.001, 0.0802], [1, 1, 0.45], 8, 6)));
  parts.push(P('head', 'black', gSph(0.003, [-0.031, EY + 0.001, 0.0829], [1, 1, 0.5], 6, 4)));
  parts.push(P('lidR', 'deSkin', gSph(1, [0, -0.008, -0.004], [0.017, 0.012, 0.011], 10, 6)));
  // el izquierdo: lechoso, con el rescoldo, y el párpado hinchado que lo tapa
  // a medias
  parts.push(P('head', 'deEye', gSph(0.0132, [0.033, EY - 0.004, 0.0775], [1, 0.62, 0.8], 10, 8)));
  // el emplasto en la mejilla mala (lo que se pone de su botica: musgo,
  // raíz de higuera y flor machacados en un trapo) y la venda que lo sujeta,
  // de la coronilla a la quijada
  parts.push(P('head', 'deEmplasto', place(gSph(1, [0, 0, 0], [0.013, 0.036, 0.032], 9, 6), [0.066, EY - 0.04, 0.05], [0, 48, -6])));
  {
    // (una tira de lienzo de tres dedos, de la coronilla a la quijada por
    // encima del emplasto)
    const v = new THREE.CylinderGeometry(0.1, 0.1, 0.032, 22, 1, true);
    v.rotateX(Math.PI / 2);
    v.scale(0.9, 1.3, 1);
    parts.push(PD('head', 'deWrap', place(v, [0.004, 0.13, 0.03], [10, 0, 0])));
  }
  // los bultos de carne: la sien, tras la oreja, el cráneo
  for (const [x, y, z, r] of [
    [0.082, 0.19, 0.018, 0.012],
    [0.08, 0.118, -0.045, 0.016],
    [0.062, 0.224, -0.03, 0.011],
    [0.072, 0.16, -0.072, 0.01],
    [0.07, 0.085, 0.045, 0.008],
  ])
    parts.push(P('head', 'deFlesh', gSph(r, [x, y, z], [1, 0.85, 1], 8, 6)));
  // los dientes que le enseña la comisura caída
  for (let i = 0; i < 4; i++) parts.push(P('head', 'bone', gBox(0.0055, 0.008, 0.004, [0.008 + i * 0.006, 0.068 - i * 0.0015, 0.088 - i * 0.004], [0, 20 + i * 8, 0])));
  parts.push(P('head', 'black', gBox(0.03, 0.006, 0.004, [0.018, 0.069, 0.086], [0, 18, -8])));
  // la quijada (lo que se mueve al hablar): el labio de abajo y la barba rala
  // del lado sano
  parts.push(P('jaw', 'deSkin', gBox(0.034, 0.008, 0.012, [-0.008, -0.006, 0.066], [0, 0, 4])));
  for (let i = 0; i < 9; i++) {
    const a = -0.95 + i * 0.12;
    const x = Math.sin(a) * 0.055,
      z = Math.cos(a) * 0.05 + 0.01;
    parts.push(P('jaw', 'deHair', gCyl(0.0035, 0.0008, 0.03 + (i % 3) * 0.012, 4, [x, -0.03 - (i % 2) * 0.006, z], [8 + (i % 3) * 6, 0, Math.sin(a) * 10])));
  }
  // el pelo: largo, ralo y pegado, del lado sano y por detrás; del otro,
  // casi nada
  {
    const strands = [];
    const rr = (s) => (0.5 + Math.sin(s * 91.7) * 0.5);
    // (del lado sano y de la nuca: de -π, la nuca, a -0,28π, la sien
    // derecha; y unos pocos a la izquierda de la nuca, donde aún le queda)
    const angs = [];
    for (let i = 0; i < 22; i++) angs.push(-Math.PI + (i / 21) * 0.72 * Math.PI);
    for (let i = 0; i < 5; i++) angs.push(0.68 * Math.PI + i * 0.065 * Math.PI);
    angs.forEach((a, i) => {
      const r0 = 0.083,
        y0 = 0.205 + rr(i) * 0.03;
      const x0 = Math.sin(a) * r0,
        z0 = Math.cos(a) * r0 * 1.05 - 0.01;
      const len = 0.16 + rr(i + 3) * 0.16;
      const hang = [
        [x0, y0, z0],
        [x0 * 1.25, y0 - 0.06, z0 * 1.12 - 0.01],
        [x0 * 1.3 + (rr(i + 5) - 0.5) * 0.02, y0 - len * 0.6, z0 * 1.1 - 0.02],
        [x0 * 1.25 + (rr(i + 7) - 0.5) * 0.03, y0 - len, z0 * 1.05 - 0.03],
      ];
      strands.push(tube(hang, (q) => mix(0.011, 0.002, q), { n: 6, seg: 4, up: [0, 0, 1] }));
    });
    // el casco de pelo pegado al cráneo (del lado derecho y atrás)
    strands.push(place(new THREE.SphereGeometry(0.094, 12, 8, Math.PI * 1.25, Math.PI * 0.85, 0, Math.PI * 0.45), [0.002, 0.15, -0.012], [0, 0, 0], [0.97, 1.0, 1.05]));
    parts.push(PD('head', 'deHair', merge(strands)));
  }

  // ---------------------------------------------------------- la carne del cuello y del hombro
  for (const [x, y, z, r] of [
    [0.045, 0.6, 0.012, 0.022],
    [0.06, 0.56, -0.01, 0.018],
    [0.15, 0.5, 0.03, 0.03],
    [0.18, 0.47, -0.02, 0.022],
  ])
    parts.push(P('chest', 'deFlesh', gSph(r, [x, y, z], [1, 0.8, 1], 8, 6)));

  // ---------------------------------------------------------- la saya y la soga
  {
    // el faldón de la saya, de la cintura a media pierna, deshilachado
    const s = robe({ top: 0.12, hem: -0.6, r0: [0.168, 0.124], r1: [0.25, 0.21], n: 9, dep: 0.026, seed: 4, ragged: 0.06, p: 0.85 });
    parts.push(PD('hips', 'deTunic', s.geo));
    // la soga, con su cabo y sus nudos
    parts.push(
      P(
        'hips',
        'rope',
        cord(0.085, 0.185, 0.14, 0.012, Object.assign(
          [
            [0.12, 0.085, 0.1],
            [0.15, 0.0, 0.12],
            [0.155, -0.12, 0.125],
            [0.16, -0.22, 0.12],
          ],
          { knots: [[0.155, -0.12, 0.125], [0.16, -0.22, 0.12]] }
        ))
      )
    );
    // la escudilla, colgada de la soga (a la izquierda) y el zurrón (a la
    // derecha, con su correa cruzada por el pecho)
    parts.push(P('hips', 'wooddark', place(new THREE.SphereGeometry(0.065, 10, 6, 0, TAU, Math.PI / 2, Math.PI / 2), [0.19, -0.02, 0.05], [0, 0, 18], [1, 0.6, 1])));
    parts.push(P('hips', 'leather', merge([gSph(1, [-0.19, -0.06, 0.05], [0.045, 0.085, 0.075], 8, 6), gBox(0.09, 0.012, 0.12, [-0.2, 0.01, 0.05], [0, 0, -8])])));
    // (y lo que asoma del zurrón: las hierbas que coge, con sus hojas)
    parts.push(P('hips', 'hoja', merge([gBox(0.012, 0.075, 0.003, [-0.17, 0.04, 0.07], [0, 20, 14]), gBox(0.01, 0.06, 0.003, [-0.2, 0.035, 0.04], [0, -30, -10]), gBox(0.014, 0.05, 0.003, [-0.185, 0.03, 0.095], [10, 60, 4]), gBox(0.009, 0.08, 0.003, [-0.215, 0.045, 0.075], [-6, 0, -22])])));
    parts.push(
      P(
        'chest',
        'leather',
        tube(
          [
            [0.15, 0.5, 0.12],
            [0.06, 0.36, 0.165],
            [-0.08, 0.17, 0.155],
            [-0.17, 0.0, 0.12],
          ],
          [0.018, 0.004],
          { n: 10, seg: 4, up: [0, 0, 1] }
        )
      )
    );
  }

  // ---------------------------------------------------------- la capa de sayal
  {
    // abierta por delante, encorvada con él, larga hasta media pantorrilla,
    // con el bajo hecho jirones
    const PR = [
      [-0.84, 0.31, 0.27],
      [-0.6, 0.285, 0.245],
      [-0.3, 0.26, 0.215],
      [0.0, 0.245, 0.2],
      [0.25, 0.262, 0.2],
      [0.4, 0.315, 0.2],
      [0.47, 0.31, 0.18],
      [0.53, 0.25, 0.15],
      [0.575, 0.16, 0.115],
      [0.6, 0.1, 0.09],
    ];
    const hem = (t) => -0.84 + 0.05 * Math.max(0, folds(t, 13, 7)) - 0.06 * Math.max(0, -Math.cos(t)) + 0.035 * Math.max(0, folds(t, 29, 3)) ** 2;
    const cz = (v) => -0.03 * sstep(0.2, 0.9, v);
    const up = gown(PR, (t) => -0.12 - 0.02 * Math.max(0, folds(t, 5, 2)), { y0: PR[0][0], n: 9, dep: 0.03, seed: 2, nt: 52, nv: 10, t0: 0.42, t1: TAU - 0.42, cz: (v) => cz(0.6 + v * 0.4) });
    const low = gown(PR, hem, { top: 0.0, y0: PR[0][0], n: 11, dep: 0.034, seed: 2, nt: 56, nv: 14, t0: 0.5, t1: TAU - 0.5, cz: (v) => cz(v * 0.6) });
    parts.push(PD('chest', 'deCloak', up.geo));
    parts.push(PD('hips', 'deCloak', place(low.geo, [0, 0.1, 0])));
    // los remiendos: paños de otro color cosidos (sobre la cara de fuera)
    const pt = [];
    for (const [t, v, w, h] of [
      [2.4, 0.55, 0.09, 0.07],
      [-2.0, 0.3, 0.07, 0.09],
      [3.0, 0.8, 0.1, 0.06],
      [1.3, 0.45, 0.06, 0.06],
    ]) {
      const g = v > 0.5 ? low : low;
      const p = g.at(t, v),
        n = g.n(t, v);
      const m = new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), new THREE.Vector3(n[0], n[1], n[2]), new THREE.Vector3(0, 1, 0));
      const q = new THREE.Quaternion().setFromRotationMatrix(m);
      const b = new THREE.BoxGeometry(w, h, 0.004);
      b.applyQuaternion(q);
      b.translate(p[0] + n[0] * 0.006, p[1] + n[1] * 0.006 + 0.1, p[2] + n[2] * 0.006);
      pt.push(b);
    }
    parts.push(P('hips', 'dePatch', merge(pt)));
    // la capucha caída: el rollo alrededor del cuello, por detrás, y la punta
    // colgando a la espalda
    const roll = [];
    for (let k = 0; k <= 16; k++) {
      const a = -Math.PI * 0.62 + (k / 16) * Math.PI * 1.24 + Math.PI;
      roll.push([Math.sin(a) * 0.115, 0.585 + 0.012 * Math.cos(a * 2), Math.cos(a) * 0.1 - 0.015]);
    }
    parts.push(P('chest', 'deCloak', tube(roll, (s) => [0.04 * (1 - 0.3 * Math.abs(s - 0.5)), 0.03], { n: 24, seg: 7, caps: true, capL: 0.02 })));
    const tip = cloth(0.24, 0.3, { flare: 0.2, folds: [3, 0.012], seed: 5, out: (v) => -0.03 * v, nu: 8, nv: 6 });
    parts.push(PD('chest', 'deCloak', place(tip.geo, [0, 0.6, -0.15], [8, 180, 0])));
  }

  // ---------------------------------------------------------- las mangas, las vendas, las polainas
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    // la manga de la capa, holgada, hasta el codo
    parts.push(PD('arm' + s, 'deCloak', tube([[-sx * 0.01, 0.03, 0], [0, -0.14, 0.004], [0, -0.3, 0]], (q) => table([[0, 0.072, 0.07], [0.6, 0.068, 0.066], [1, 0.064, 0.062]], q), { n: 8, seg: 12, mod: (a, q) => 1 + 0.08 * folds(a, 3, (s === 'L' ? 3 : 8) + q * 2) * q })));
    // los cantos de las vendas (el antebrazo derecho, vendado entero; el
    // izquierdo, en la muñeca) y las de la mano
    const v = [];
    const ys = s === 'L' ? [-0.2, -0.235] : [-0.04, -0.1, -0.16, -0.22];
    ys.forEach((y, i) => v.push(gTorus(0.033 - i * 0.001, 0.0045, [0, y, 0], [90 + (i % 2 ? 12 : -12), 0, i % 2 ? 9 : -7], 12, 3)));
    parts.push(P('fore' + s, 'deWrap', merge(v)));
    parts.push(P('hand' + s, 'deWrap', merge([gTorus(0.029, 0.0045, [0, -0.04, 0.004], [90, 0, sx * 8], 12, 3), gTorus(0.027, 0.004, [0, -0.06, 0.004], [90, 0, -sx * 6], 12, 3)])));
    // las polainas de trapo (los cantos de sus vueltas) y los pies envueltos
    const w = [];
    for (let i = 0; i < 4; i++) w.push(gTorus(0.046 - i * 0.003, 0.005, [0, -0.1 - i * 0.075, 0.002], [90 + (i % 2 ? 10 : -10), 0, i % 2 ? 7 : -7], 12, 3));
    parts.push(P('shin' + s, 'deWrap', merge(w)));
    parts.push(P('foot' + s, 'deWrap', merge([gTorus(0.045, 0.008, [0, 0.0, 0.03], [90, 0, 0], 12, 3), gTorus(0.042, 0.008, [0, -0.012, 0.09], [80, 0, 0], 12, 3)])));
  }
  // el trapo del emplasto, en la mano mala (sólo cuando se lo pone: grupo
  // 'trapo')
  parts.push(P('handL', 'deEmplasto', gBox(0.055, 0.075, 0.014, [-0.014, -0.065, 0.02], [0, 0, 0]), { grp: 'trapo' }));
  // la carne de la mano izquierda (en el dorso)
  parts.push(P('handL', 'deFlesh', gSph(1, [0.006, -0.05, 0.01], [0.012, 0.022, 0.018], 6, 5)));

  // ---------------------------------------------------------- el cayado
  // (en la derecha, a lo largo de su z; lo deja apoyado cuando mira al
  // cielo: grupo 'cayado')
  {
    const y = -0.07;
    const g = [gCyl(0.017, 0.014, 1.55, 6, [0.004, y, -0.32], [90, 0, 0])];
    g.push(tube([[0.004, y, 0.44], [0.004, y - 0.04, 0.52], [0.004, y - 0.1, 0.53]], 0.016, { n: 6, seg: 6, caps: true }));
    parts.push(P('handR', 'timber', merge(g), { grp: 'cayado' }));
  }

  // (todo hecho para una altura de 1: se escala)
  const out = parts.map((pt) => ({ ...pt, p: (pt.p || [0, 0, 0]).map((x) => x * K), sc: (pt.sc || [1, 1, 1]).map((x) => x * K) }));
  return new Rig({ joints, parts: out });
}

// ======================================================================= poses
// grados -> radianes (root en cm -> m)
function rad(p) {
  const o = {};
  for (const k in p) o[k] = k === 'root' ? p[k].map((v) => v / 100) : p[k].map((v) => v * DEG);
  return o;
}
const S = Math.sin;

// De pie, encorvado, el peso en la pierna derecha.
const STAND = {
  root: [0, -2, 0],
  hips: [4, 0, -2],
  chest: [16, 0, 2],
  head: [8, 0, 0],
  legL: [-6, 0, 4],
  shinL: [12, 0, 0],
  footL: [-4, 0, 0],
  legR: [2, 0, -2],
  shinR: [4, 0, 0],
  footR: [-2, 0, 0],
  armL: [6, 0, 10],
  foreL: [-22, 0, 0],
  handL: [10, 0, -6],
  armR: [4, 0, -8],
  foreR: [-18, 0, 0],
  handR: [6, 0, 4],
  jaw: [3, 0, 0],
  lidR: [62, 0, 0],
};
// Mirando al cielo, en la luz: el pecho se abre, la cabeza echada atrás del
// todo, la cara a la luz; las manos abiertas a los lados, las palmas hacia
// arriba, como quien recibe la lluvia; el ojo cerrado a ratos.
const CIELO = {
  root: [0, -1, 0],
  hips: [-4, 0, -2],
  chest: [-8, 0, 1],
  head: [-42, 6, -4],
  legL: [-4, 0, 5],
  shinL: [8, 0, 0],
  footL: [-2, 0, 0],
  legR: [3, 0, -3],
  shinR: [3, 0, 0],
  footR: [-2, 0, 0],
  armL: [-2, -6, 22],
  foreL: [-18, 0, 0],
  handL: [0, -72, -10],
  armR: [-4, 6, -24],
  foreR: [-22, 0, 0],
  handR: [0, 72, 10],
  jaw: [6, 0, 0],
  lidR: [40, 0, 0],
};
// Vuelto hacia ti, encogido, la mano mala escondida bajo la capa y la buena
// en el pecho.
const VUELTO = {
  ...STAND,
  chest: [22, 0, 2],
  head: [2, 0, 4],
  armL: [-4, 10, 14],
  foreL: [-70, 0, 0],
  handL: [20, 0, 10],
  armR: [-20, 0, -14],
  foreR: [-86, 0, 0],
  handR: [10, 0, 10],
};

// En su botica, de pie ante la mesa: moliendo en el mortero (la mano buena
// da vueltas a la mano del mortero; la mala sujeta el cuenco), leyendo su
// cuaderno (inclinado, las manos en el canto de la mesa) y poniéndose el
// emplasto (la mano buena, con el trapo, a la mejilla mala; la cabeza ladeada
// hacia ella).
const MOLER = {
  ...STAND,
  chest: [30, -6, 2],
  head: [26, 4, 0],
  armL: [-34, 8, 16],
  foreL: [-62, 0, 0],
  handL: [10, 0, 20],
  armR: [-42, -12, -10],
  foreR: [-58, 0, 0],
  handR: [30, 0, -10],
};
const LEER = {
  ...STAND,
  chest: [36, 0, 0],
  head: [34, 0, 2],
  armL: [-40, 6, 20],
  foreL: [-30, 0, 0],
  handL: [40, 0, 10],
  armR: [-40, -6, -20],
  foreR: [-30, 0, 0],
  handR: [40, 0, -10],
};
const UNTAR = {
  ...STAND,
  chest: [14, -4, 3],
  head: [10, -8, -16],
  armL: [-70, -42, 10],
  foreL: [-122, 0, 0],
  handL: [-24, 0, 18],
  armR: [-26, -8, -14],
  foreR: [-82, 0, 0],
  handR: [10, 0, 10],
};

const KINDS = { stand: STAND, cielo: CIELO, vuelto: VUELTO, moler: MOLER, leer: LEER, untar: UNTAR };

// La pose: la mezcla de las posturas (e.data.W), con lo de cada momento:
// la respiración; la cabeza que se vuelve hacia ti (e.data.look: [guiñada,
// peso]); el hablar (e.data.talk: la quijada y una mano que acompaña); y los
// resquicios de la locura: el respingo (e.data.tic: de 1 a 0, una sacudida
// de la cabeza y del hombro), la mano mala que se le va a la cara (e.data.
// cara, de 0 a 1) y la risa (e.data.risa, de 0 a 1: los hombros a sacudidas).
function desfIdle(e, kind, t) {
  const D = e.data || {};
  const W = D.W || { [KINDS[kind] ? kind : 'stand']: 1 };
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
  if (tot <= 0) return rad(STAND);
  for (const j in out) for (let i = 0; i < 3; i++) out[j][i] /= tot;
  const ph = e.phase || 0;
  // la respiración (lenta en la luz)
  const br = S(t * 1.3 + ph);
  out.chest[0] += br * 1.6;
  out.head[0] -= br * 0.8;
  out.armL[2] += br * 0.6;
  out.armR[2] -= br * 0.6;
  // en la luz: la cabeza se mece un poco, como quien oye algo
  const cw = (W.cielo || 0) / tot;
  out.head[2] += S(t * 0.37 + ph) * 4 * cw;
  out.head[1] += S(t * 0.23 + ph * 2) * 5 * cw;
  out.handL[1] += S(t * 0.5 + ph) * 8 * cw;
  out.handR[1] -= S(t * 0.47 + ph) * 8 * cw;
  // el párpado: parpadea (y en la luz lo cierra a ratos, despacio)
  const blink = Math.pow(Math.max(0, S(t * 0.9 + ph * 3)), 40);
  out.lidR[0] = out.lidR[0] * (1 - blink) + 0 * blink;
  out.lidR[0] *= 1 - cw * clamp((S(t * 0.21 + ph) - 0.3) * 2, 0, 1) * 0.9;
  // moliendo: la mano buena da vueltas al mortero
  const mw = (W.moler || 0) / tot;
  if (mw > 0.001) {
    out.armR[1] += S(t * 3.2 + ph) * 9 * mw;
    out.foreR[0] += S(t * 3.2 + ph + 1.6) * 8 * mw;
    out.chest[1] += S(t * 3.2 + ph) * 2.5 * mw;
  }
  // leyendo: la cabeza baja renglón a renglón
  const lw2 = (W.leer || 0) / tot;
  if (lw2 > 0.001) out.head[1] += S(t * 0.8 + ph) * 7 * lw2;
  // el emplasto: aprieta a ratos
  const uw = (W.untar || 0) / tot;
  if (uw > 0.001) out.foreL[0] += Math.max(0, S(t * 1.4 + ph)) * 7 * uw;
  // la cabeza hacia ti, por encima del hombro
  const [ly, lw] = D.look || [0, 0];
  if (lw > 0.001) {
    const a = (ly / DEG) * lw;
    out.chest[1] += a * 0.3;
    out.head[1] += a * 0.62;
    out.head[0] += (12 - out.head[0]) * 0.6 * lw;
  }
  // hablar: la quijada y la mano buena
  const tk = D.talk || 0;
  if (tk > 0.001) {
    out.jaw[0] += (6 + Math.abs(S(t * 11 + ph)) * 10 + Math.abs(S(t * 7.3)) * 5) * tk;
    out.armR[0] -= 18 * tk + S(t * 1.7) * 8 * tk;
    out.foreR[0] -= 30 * tk + S(t * 2.3 + 1) * 12 * tk;
    out.handR[1] += S(t * 1.9) * 20 * tk;
  }
  // el respingo: la cabeza se le va de lado de un tirón y vuelve
  const tic = D.tic || 0;
  if (tic > 0.001) {
    const k = Math.sin(tic * Math.PI) * (0.6 + 0.4 * S(t * 37));
    out.head[2] += 22 * k * (D.ticSide || 1);
    out.head[1] -= 16 * k * (D.ticSide || 1);
    out.chest[2] += 5 * k * (D.ticSide || 1);
    out.armL[2] += 10 * k;
  }
  // la mano mala a la cara (se rasca la mejilla hinchada)
  const ca = D.cara || 0;
  if (ca > 0.001) {
    const sc = S(t * 9) * 6 * ca;
    out.armL[0] += (-62 - out.armL[0]) * ca;
    out.armL[1] += (-28 - out.armL[1]) * ca;
    out.armL[2] += (14 - out.armL[2]) * ca;
    out.foreL[0] += (-128 - out.foreL[0]) * ca + sc;
    out.handL[0] += (-20 - out.handL[0]) * ca;
    out.handL[2] += (30 - out.handL[2]) * ca;
    out.head[2] -= 10 * ca;
  }
  // la risa: los hombros a sacudidas, la cabeza que se agacha
  const ri = D.risa || 0;
  if (ri > 0.001) {
    const h = Math.pow(Math.max(0, S(t * 13 + ph)), 4) * 6 * ri;
    out.chest[0] += h + 6 * ri;
    out.head[0] += h * 0.5 + 8 * ri;
    out.jaw[0] += 10 * ri + h;
    out.armL[2] -= h * 0.4;
    out.armR[2] += h * 0.4;
  }
  return rad(out);
}

// (no se mueve de su sitio: la «marcha» es la misma pose)
function desfLoco(e, t) {
  return desfIdle(e, e.idle, t);
}

const STILL = clip('dStill', 0.5, [[0, {}], [0.5, {}]]);

export const DESFIGURADO_TYPE = {
  name: 'El Desfigurado',
  build: buildDesfigurado,
  hp: 100,
  poise: 30,
  radius: 0.36,
  height: 1.76,
  lockHeight: 1.0,
  walk: 0.9,
  run: 1.8,
  turn: 3,
  sight: 0,
  hear: 0,
  // (no ataca ni se le puede herir)
  friendly: true,
  clips: { alert: STILL, hurt: STILL, stagger: STILL, death: STILL },
  voice: 'morador',
  attacks: [],
  loco: desfLoco,
  idlePose: desfIdle,
  ai: (e, dt, player) => {
    const q = e.game.desfigurado;
    if (q) q.npcAI(e, dt, player);
    else e.animate(dt);
  },
  onReset: (e) => e.game.desfigurado && e.game.desfigurado.npcReset(e),
};

void bump;
void gCyl;
