// La fragua de maese Lourenço, en la plaza de la Herrería.
//
// No es una casa con una forja contra la pared: es un taller. La nave, de
// piedra, a doble altura y negra de hollín hasta las vigas del tejado, se
// abre a la plaza por un portalón con las dos hojas abiertas de par en par.
// Al fondo, contra el hastial del norte, la forja grande, con su campana y su
// cañón, que sale por el tejado y no deja de echar humo y chispas; a su lado
// el fuelle de dos cámaras con su balancín y su cadena; delante, el yunque
// sobre su tajo, la clavera, la pila de templar, las tenazas. En la pared,
// herraduras y martillos; en el suelo, barras de hierro, carbón, toneles de
// clavos (los que forjó para tapiar media ciudad). La vivienda, sobre la
// mitad de poniente, en un sobrado de tablas al que se sube por una
// escalera y que se asoma a la forja por su barandilla: la cama, el arca, la
// cuna vacía, el rincón del aprendiz. Debajo, el almacén, con la puerta de
// atrás al callejón, y San Eloy, el patrón de los herreros, en su hornacina.
// Fuera, el soportal, con el potro de herrar (la mula, muerta dentro), el
// yunque de la calle y el rótulo.
//
// Lo que pasó lo cuenta el taller: las cotas de malla de la guarnición, con
// carne cosida a las anillas, atadas y apiladas para echarlas al fuego, y una
// a medio quemar en las brasas; el herrero, de rodillas ante la forja, con
// el brazo derecho metido en el fuego hasta el codo (le había salido la carne
// en él). La palanca sigue junto al yunque. La piedra de afilar bendita, no:
// se la dio a su aprendiz, que se fue por los tejados con los vecinos
// (level_tejados.js).
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import { stairs, solidGableRoof } from './builders.js';
import { holedWall, railing, frame, chest } from './level_souto.js';
import * as P from './props.js';
import { bakeCorpse } from '../entities/models.js';
import { humanoidJoints } from '../entities/models.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// La fragua: huella, muros, alero y cumbrera (a lo largo de z), el borde del
// sobrado y su suelo, el portalón (a la plaza) y la puerta de atrás (al
// callejón de la Fragua).
export const FRAGUA = {
  x0: -26,
  z0: 42,
  x1: -14,
  z1: 56,
  t: 0.45,
  EV: 5.4,
  RG: 9.1,
  LX: -21.4,
  LY: 3.3,
  portal: { z0: 47.5, z1: 50.5, h: 3.4 },
  back: { z0: 45.4, z1: 46.6, h: 2.3 },
  // la forja: el hogar [x0, z0, x1, z1] y su alto
  hearth: [-19.6, 42.45, -16.8, 43.95],
  hearthH: 0.85,
  // el yunque grande (y la palanca, apoyada en él)
  anvil: { x: -18.2, z: 45.95, rot: 0.12 },
};
const IN = { x0: FRAGUA.x0 + FRAGUA.t, z0: FRAGUA.z0 + FRAGUA.t, x1: FRAGUA.x1 - FRAGUA.t, z1: FRAGUA.z1 - FRAGUA.t };
const SOOT = [0.6, 0.56, 0.53];
const WOOD = [0.62, 0.52, 0.42];
const DARKW = [0.46, 0.4, 0.34];

// un madero de a a b (radio r: medio canto)
function strut(wb, a, b, r, mat = 'timber', o = {}) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  wb.geometry(mat, new THREE.BoxGeometry(r * 2, len, r * 2), new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1)), { ao: false, tint: o.tint ?? WOOD, room: o.room });
}

// El herrero: un hombretón con el mandil de cuero hasta las rodillas, los
// brazos desnudos y el derecho, quemado hasta el codo.
function smithDef() {
  const joints = humanoidJoints(1.02);
  const parts = [
    { j: 'hips', type: 'box', s: [0.4, 0.22, 0.27], p: [0, -0.02, 0], mat: 'clothDark' },
    { j: 'hips', type: 'box', s: [0.44, 0.48, 0.3], p: [0, -0.27, 0], taper: [1.1, 1.05], mat: 'burlap' },
    { j: 'hips', type: 'box', s: [0.4, 0.62, 0.03], p: [0, -0.3, 0.16], taper: [1.08, 1], mat: 'leather' },
    { j: 'chest', type: 'box', s: [0.46, 0.52, 0.29], p: [0, 0.26, 0], taper: [0.86, 0.9], mat: 'burlap' },
    { j: 'chest', type: 'box', s: [0.36, 0.46, 0.03], p: [0, 0.2, 0.155], taper: [1.06, 1], mat: 'leather' },
    { j: 'chest', type: 'box', s: [0.03, 0.3, 0.02], p: [0.13, 0.5, 0.12], r: [0, 0, 18], mat: 'leather' },
    { j: 'chest', type: 'box', s: [0.03, 0.3, 0.02], p: [-0.13, 0.5, 0.12], r: [0, 0, -18], mat: 'leather' },
    { j: 'head', type: 'box', s: [0.21, 0.25, 0.23], p: [0, 0.12, 0], mat: 'skinCorrupt' },
    { j: 'head', type: 'box', s: [0.2, 0.12, 0.08], p: [0, 0.03, 0.09], mat: 'hairGrey' },
    { j: 'head', type: 'box', s: [0.12, 0.04, 0.01], p: [0, 0.15, 0.12], mat: 'black' },
    { j: 'armL', type: 'box', s: [0.13, 0.31, 0.13], p: [0, -0.14, 0], mat: 'skinCorrupt' },
    { j: 'foreL', type: 'box', s: [0.11, 0.28, 0.11], p: [0, -0.13, 0], mat: 'skinCorrupt' },
    { j: 'foreL', type: 'box', s: [0.12, 0.08, 0.12], p: [0, -0.24, 0], mat: 'leather' },
    { j: 'armR', type: 'box', s: [0.13, 0.31, 0.13], p: [0, -0.14, 0], mat: 'skinCorrupt' },
    // (el brazo que metió en el fuego: carbón y carne abierta)
    { j: 'armR', type: 'box', s: [0.135, 0.1, 0.135], p: [0, -0.26, 0], mat: 'flesh' },
    { j: 'foreR', type: 'box', s: [0.1, 0.28, 0.1], p: [0, -0.13, 0], mat: 'black' },
    { j: 'legL', type: 'box', s: [0.15, 0.45, 0.16], p: [0, -0.22, 0], mat: 'clothDark' },
    { j: 'shinL', type: 'box', s: [0.13, 0.44, 0.14], p: [0, -0.21, 0], mat: 'leather' },
    { j: 'legR', type: 'box', s: [0.15, 0.45, 0.16], p: [0, -0.22, 0], mat: 'clothDark' },
    { j: 'shinR', type: 'box', s: [0.13, 0.44, 0.14], p: [0, -0.21, 0], mat: 'leather' },
  ];
  return { joints, parts };
}

// ------------------------------------------------------------ la forja
// El hogar de piedra con su borde, el lecho de brasas (con las barras que se
// calentaban y una cota a medio quemar), la tobera del fuelle, la campana
// sobre sus ménsulas y el cañón, que sale por el tejado y echa humo y chispas.
function greatForge(ctx, room) {
  const wb = ctx.wb;
  const F = FRAGUA;
  const [x0, z0, x1, z1] = F.hearth;
  const H = F.hearthH;
  const cx = (x0 + x1) / 2;
  const rng = new RNG(8101);
  // el hogar y su borde (el lecho, un palmo hundido)
  wb.box('wallstone', x0, 0, z0, x1, H - 0.12, z1, { faces: 'sew', sub: 2, room, tint: [0.66, 0.62, 0.58] });
  for (const [a, b, c, d] of [
    [x0, z1 - 0.28, x1, z1],
    [x0, z0, x0 + 0.32, z1 - 0.28],
    [x1 - 0.32, z0, x1, z1 - 0.28],
  ])
    wb.box('ashlar', a, H - 0.12, b, c, H, d, { faces: 'tnsew', ao: false, room, tint: [0.58, 0.54, 0.5] });
  wb.box('ember', x0 + 0.32, H - 0.1, z0, x1 - 0.32, H - 0.07, z1 - 0.28, { faces: 't', ao: false, grime: false, room });
  // los carbones, unos negros y otros encendidos
  for (let i = 0; i < 26; i++) {
    const x = rng.range(x0 + 0.42, x1 - 0.42),
      z = rng.range(z0 + 0.12, z1 - 0.38);
    const hot = rng.chance(0.45);
    wb.geometry(hot ? 'ember' : 'black', new THREE.IcosahedronGeometry(rng.range(0.05, 0.09), 0), new THREE.Matrix4().compose(V(x, H - 0.05, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(0, 3), rng.range(0, 3), 0)), V(1, 0.7, 1)), { ao: false, grime: false, room, tint: hot ? [1, 1, 1] : [2, 2, 2.1] });
  }
  // las barras que se calentaban (la punta, al rojo)
  for (const [x, r] of [
    [cx - 0.4, 0.15],
    [cx + 0.35, -0.2],
  ]) {
    wb.push();
    wb.translate(x, H - 0.02, z1 - 0.55);
    wb.rotateY(r);
    wb.rotateX(-0.12);
    wb.box('iron', -0.02, -0.02, -0.4, 0.02, 0.02, 0.62, { ao: false, room });
    wb.box('ember', -0.025, -0.025, -0.4, 0.025, 0.025, -0.15, { ao: false, grime: false, room });
    wb.pop();
  }
  // la cota a medio quemar: colgando del borde, con la carne pegada
  wb.push();
  wb.translate(x1 - 0.55, H - 0.02, z1 - 0.2);
  wb.rotateY(-0.3);
  wb.box('chainmail', -0.3, -0.02, -0.22, 0.32, 0.04, 0.24, { ao: false, room, tint: [0.5, 0.42, 0.38] });
  wb.rotateX(1.2);
  wb.box('chainmail', -0.28, 0, 0, 0.3, 0.03, 0.5, { ao: false, room, tint: [0.42, 0.36, 0.32] });
  wb.pop();
  wb.geometry('fleshStatic', new THREE.SphereGeometry(1, 7, 5), new THREE.Matrix4().compose(V(x1 - 0.6, H + 0.03, z1 - 0.25), new THREE.Quaternion(), V(0.2, 0.06, 0.14)), { ao: false, grime: false, room });
  // la tobera: el morro de hierro del fuelle entra por el costado del oeste
  wb.push();
  wb.translate(x0 - 0.05, H - 0.2, (z0 + z1) / 2 - 0.12);
  wb.rotateZ(-Math.PI / 2);
  wb.cylinder('iron', 0, 0, 0, 0.07, 0.045, 0.5, 6, { ao: false, capTop: true, room });
  wb.pop();
  // la campana: un tronco de pirámide de yeso ahumado, sobre su dintel y dos
  // ménsulas, y el cañón hasta el tejado (y por encima, con su sombrerete)
  const hy0 = 2.15,
    hy1 = 3.55;
  const b0 = [x0 - 0.2, z0, x1 + 0.2, z1 + 0.25],
    b1 = [cx - 0.62, z0, cx + 0.62, z0 + 0.74];
  const hood = { ao: false, room, tint: [0.36, 0.33, 0.3], sub: 2 };
  wb.quad('plaster', V(b0[0], hy0, b0[3]), V(b0[2], hy0, b0[3]), V(b1[2], hy1, b1[3]), V(b1[0], hy1, b1[3]), hood);
  wb.quad('plaster', V(b0[2], hy0, b0[3]), V(b0[2], hy0, b0[1]), V(b1[2], hy1, b1[1]), V(b1[2], hy1, b1[3]), hood);
  wb.quad('plaster', V(b0[0], hy0, b0[1]), V(b0[0], hy0, b0[3]), V(b1[0], hy1, b1[3]), V(b1[0], hy1, b1[1]), hood);
  // (por dentro, negro)
  wb.quad('black', V(b1[0], hy1, b1[3]), V(b1[2], hy1, b1[3]), V(b0[2], hy0, b0[3]), V(b0[0], hy0, b0[3]), { ao: false, grime: false, room });
  wb.box('timber', b0[0] - 0.05, hy0 - 0.2, b0[3] - 0.06, b0[2] + 0.05, hy0 + 0.02, b0[3] + 0.08, { ao: false, faces: 'tnsewb', room, tint: DARKW });
  for (const x of [b0[0] + 0.05, b0[2] - 0.05]) {
    wb.box('ashlar', x - 0.13, hy0 - 0.55, z0, x + 0.13, hy0 - 0.2, z0 + 0.42, { ao: false, faces: 'sewb', room, tint: [0.6, 0.57, 0.53] });
    wb.box('ashlar', x - 0.11, hy0 - 0.2, z0, x + 0.11, hy0, b0[3] - 0.06, { ao: false, faces: 'sewb', room, tint: [0.6, 0.57, 0.53] });
  }
  const top = F.RG + 0.65;
  wb.box('wallstone', b1[0], hy1, b1[1], b1[2], top, b1[3], { faces: 'sew', sub: 2, room, tint: [0.42, 0.39, 0.36] });
  // (lo que asoma del tejado, de la calle)
  // (asoma seis dedos del hastial: a ras parpadeaban)
  wb.box('wallstone', b1[0] - 0.02, F.RG - 1.6, b1[1] - 0.51, b1[2] + 0.02, top, b1[3] + 0.02, { faces: 'nsew', sub: 2, ao: false, room: 'out' });
  wb.box('wallstone', b1[0] - 0.12, top, b1[1] - 0.63, b1[2] + 0.12, top + 0.18, b1[3] + 0.12, { ao: false, faces: 'tnsewb', room: 'out' });
  ctx.fires.push({ x: cx, y: top + 0.25, z: (b1[1] + b1[3]) / 2 - 0.2, s: 0.95, smoke: true, light: false, embers: 'embers', glow: false });
  // el fuego, su luz y su colisión
  ctx.fires.push({ x: cx, y: H - 0.02, z: (z0 + z1) / 2 - 0.12, s: 0.9, embers: true });
  ctx.lights.push({ x: cx, y: 1.5, z: z1 + 0.6, r: 1, g: 0.42, b: 0.12, radius: 12.5, intensity: 2.5, room });
  ctx.lights.push({ x: cx, y: 4.5, z: z1 + 2.2, r: 1, g: 0.36, b: 0.1, radius: 8, intensity: 0.9, room });
  ctx.col.add(x0, 0, z0, x1, H, z1);
  ctx.col.addCam(b0[0], hy0 - 0.2, z0, b0[2], top, b0[3]);
  // el hollín en el muro y en el suelo
  P.decal(ctx, cx, 0.03, z1 + 0.7, 2.6, 'shadow', 0.2, { opacity: 0.7 });
}

// El fuelle grande: dos cámaras de cuero plegado entre tablas, sobre su
// caballete, con el morro hacia la forja; el balancín en su poste, la cadena
// que baja a la tapa y la de tirar, con su asidero.
function greatBellows(ctx, room) {
  const wb = ctx.wb;
  const [hx0, hz0, , hz1] = FRAGUA.hearth;
  const zc = (hz0 + hz1) / 2 - 0.12;
  const x1 = hx0 - 0.45,
    x0 = x1 - 1.55;
  const y = 0.62;
  // el caballete
  for (const x of [x0 + 0.25, x1 - 0.2]) {
    wb.box('wooddark', x - 0.05, 0, zc - 0.5, x + 0.05, y, zc - 0.4, { ao: false, room, tint: DARKW });
    wb.box('wooddark', x - 0.05, 0, zc + 0.4, x + 0.05, y, zc + 0.5, { ao: false, room, tint: DARKW });
    wb.box('wooddark', x - 0.06, y - 0.08, zc - 0.55, x + 0.06, y, zc + 0.55, { ao: false, room, faces: 'tnsewb', tint: DARKW });
  }
  // las tablas (en cuña: abiertas por detrás) y los pliegues del cuero
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.42);
  shape.quadraticCurveTo(1.0, -0.62, 1.55, -0.3);
  shape.lineTo(1.55, 0.3);
  shape.quadraticCurveTo(1.0, 0.62, 0, 0.42);
  shape.closePath();
  const board = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
  board.rotateX(Math.PI / 2);
  for (const [yy, tilt] of [
    [y, 0],
    [y + 0.36, 0.14],
  ]) {
    const m = new THREE.Matrix4().makeTranslation(x1, yy, zc).multiply(new THREE.Matrix4().makeRotationY(Math.PI)).multiply(new THREE.Matrix4().makeRotationZ(-tilt));
    wb.geometry('planks', board, m, { ao: false, room, tint: [0.7, 0.62, 0.52] });
  }
  for (let k = 0; k < 4; k++) {
    const u = 0.2 + k * 0.33;
    const h = 0.12 + u * 0.18;
    const w = 0.42 + Math.sin((u / 1.55) * Math.PI) * 0.2;
    wb.box('leather', x1 - u - 0.14, y + 0.05, zc - w, x1 - u + 0.14, y + 0.05 + h + (k % 2 ? 0.04 : 0), zc + w, { ao: false, room, tint: k % 2 ? [0.55, 0.42, 0.33] : [0.66, 0.5, 0.38] });
  }
  // el morro, hacia la tobera
  wb.push();
  wb.translate(x1, y + 0.12, zc);
  wb.rotateZ(-Math.PI / 2);
  wb.cylinder('iron', 0, -0.05, 0, 0.09, 0.05, 0.5, 6, { ao: false, capTop: true, room });
  wb.pop();
  // el poste y el balancín (un brazo largo, en su eje), las cadenas y el asidero
  const px = x0 - 0.25,
    pz = zc + 0.62;
  wb.box('wooddark', px - 0.09, 0, pz - 0.09, px + 0.09, 2.75, pz + 0.09, { room, tint: DARKW });
  ctx.col.add(px - 0.1, 0, pz - 0.1, px + 0.1, 2.7, pz + 0.1);
  const pivot = V(px, 2.62, pz);
  const armA = V(px - 0.9, 2.84, pz),
    armB = V(x1 - 0.3, 2.3, zc);
  strut(wb, armA, armB, 0.06, 'wooddark', { room, tint: DARKW });
  wb.box('iron', pivot.x - 0.04, pivot.y - 0.1, pivot.z - 0.1, pivot.x + 0.04, pivot.y + 0.1, pivot.z + 0.1, { ao: false, room });
  const chain = (a, b) => {
    const n = Math.max(2, Math.round(a.distanceTo(b) / 0.09));
    for (let i = 0; i < n; i++) {
      const p = a.clone().lerp(b, (i + 0.5) / n);
      const s = i % 2 ? [0.015, 0.045, 0.03] : [0.03, 0.045, 0.015];
      wb.box('iron', p.x - s[0], p.y - s[1], p.z - s[2], p.x + s[0], p.y + s[1], p.z + s[2], { ao: false, room });
    }
  };
  chain(V(armB.x, armB.y - 0.04, armB.z), V(armB.x, y + 0.5, armB.z));
  chain(V(armA.x, armA.y - 0.04, armA.z), V(armA.x, 1.55, armA.z));
  wb.box('wooddark', armA.x - 0.18, 1.45, armA.z - 0.03, armA.x + 0.18, 1.52, armA.z + 0.03, { ao: false, room, faces: 'tnsewb', tint: DARKW });
  P.colOBB(ctx, (x0 + x1) / 2, zc, 0.8, 0.55, 0, 0, 1.05);
}

// El yunque grande sobre su tajo: el tronco con sus cinchos, el cuerpo, la
// bigornia (el cuerno) y la cola con el agujero de la tajadera; encima, el
// martillo de mano. (a: { x, z, rot })
function anvilStump(ctx, a, room, o = {}) {
  const wb = ctx.wb;
  const s = o.s ?? 1;
  wb.at(a.x, 0, a.z, a.rot, () => {
    wb.cylinder('wooddark', 0, 0, 0, 0.36 * s, 0.4 * s, 0.56, 9, { capTop: true, ao: false, room, tint: [0.56, 0.48, 0.4] });
    for (const yy of [0.1, 0.44]) wb.cylinder('iron', 0, yy, 0, 0.385 * s, 0.395 * s, 0.05, 9, { ao: false, room });
    wb.box('iron', -0.2 * s, 0.56, -0.13 * s, 0.2 * s, 0.62, 0.13 * s, { ao: false, room });
    wb.box('iron', -0.13 * s, 0.62, -0.09 * s, 0.13 * s, 0.74, 0.09 * s, { ao: false, room });
    wb.box('iron', -0.36 * s, 0.74, -0.14 * s, 0.3 * s, 0.9, 0.14 * s, { ao: false, faces: 'tnsewb', room });
    wb.box('black', -0.3 * s, 0.9, -0.025, -0.25 * s, 0.902, 0.025, { ao: false, grime: false, faces: 't', room });
    wb.push();
    wb.translate(0.3 * s, 0.83, 0);
    wb.rotateZ(-Math.PI / 2);
    wb.cylinder('iron', 0, 0, 0, 0.09 * s, 0.012, 0.38 * s, 6, { ao: false, room });
    wb.pop();
    if (o.hammer !== false) {
      wb.push();
      wb.translate(-0.05, 0.94, 0.02);
      wb.rotateY(0.6);
      wb.box('wooddark', -0.02, -0.02, -0.05, 0.02, 0.02, 0.38, { ao: false, room, tint: DARKW });
      wb.box('iron', -0.045, -0.04, -0.12, 0.045, 0.05, -0.02, { ao: false, room });
      wb.pop();
    }
  });
  ctx.col.add(a.x - 0.42 * s, 0, a.z - 0.42 * s, a.x + 0.42 * s, 0.9, a.z + 0.42 * s);
}

// La herradura (en el plano local x-y, centrada; r: radio)
function horseshoe(wb, x, y, z, rot, r, room) {
  wb.at(x, 0, z, rot, () => {
    for (let k = 0; k < 7; k++) {
      const a = -0.35 + (k / 6) * (Math.PI + 0.7);
      wb.box('iron', Math.cos(a) * r - 0.014, y + Math.sin(a) * r - 0.014, 0, Math.cos(a) * r + 0.014, y + Math.sin(a) * r + 0.014, 0.022, { ao: false, room });
    }
  });
}

// Tonel abierto lleno de clavos (o de herraduras).
function nailBarrel(ctx, x, z, room, fill = 'nails') {
  const wb = ctx.wb;
  const r = 0.33,
    h = 0.78;
  wb.cylinder('planks', x, 0, z, r * 0.88, r, h, 8, { ao: false, open: true, uv: 1.2, room });
  wb.cylinder('planks', x, 0, z, r * 0.88, r * 0.88, 0.02, 8, { ao: false, capTop: true, room });
  for (const yy of [0.12, h - 0.12]) wb.cylinder('iron', x, yy, z, r * 0.95, r * 0.98, 0.05, 8, { ao: false, room });
  wb.cylinder('black', x, h - 0.08, z, r * 0.9, r * 0.9, 0.01, 8, { ao: false, capTop: true, grime: false, room, tint: [1.6, 1.6, 1.7] });
  const rng = new RNG(Math.round(x * 31 + z * 17));
  for (let i = 0; i < (fill === 'nails' ? 18 : 5); i++) {
    const a = rng.range(0, Math.PI * 2),
      d = rng.range(0, r * 0.75);
    if (fill === 'nails') {
      wb.push();
      wb.translate(x + Math.cos(a) * d, h - 0.06, z + Math.sin(a) * d);
      wb.rotateY(rng.range(0, Math.PI));
      wb.rotateZ(rng.range(0.6, 1.4));
      wb.box('iron', -0.006, 0, -0.006, 0.006, 0.09, 0.006, { ao: false, room });
      wb.pop();
    } else horseshoe(wb, x + Math.cos(a) * d, h - 0.03, z + Math.sin(a) * d, rng.range(0, 3), 0.07, room);
  }
  ctx.col.add(x - r, 0, z - r, x + r, h, z + r);
}

// La muela de afilar: la piedra en su eje, entre dos pies, con la manivela, y
// la artesa de agua debajo.
function grindstone(ctx, x, z, rot, room) {
  const wb = ctx.wb;
  wb.at(x, 0, z, rot, () => {
    for (const s of [-1, 1]) {
      wb.box('wooddark', -0.55, 0.62, s * 0.24 - 0.05, 0.55, 0.72, s * 0.24 + 0.05, { ao: false, room, faces: 'tnsewb', tint: DARKW });
      for (const sx of [-0.45, 0.45]) {
        wb.push();
        wb.translate(sx, 0.36, s * 0.24);
        wb.rotateZ(sx < 0 ? 0.18 : -0.18);
        wb.box('wooddark', -0.04, -0.36, -0.04, 0.04, 0.36, 0.04, { ao: false, room, tint: DARKW });
        wb.pop();
      }
    }
    // la artesa
    wb.box('planks', -0.4, 0.35, -0.16, 0.4, 0.38, 0.16, { ao: false, room });
    for (const s of [-1, 1]) wb.box('planks', -0.4, 0.38, s * 0.16 - 0.02, 0.4, 0.58, s * 0.16, { ao: false, room });
    wb.box('water', -0.38, 0.52, -0.14, 0.38, 0.53, 0.14, { faces: 't', ao: false, grime: false, room, tint: [0.3, 0.32, 0.32] });
    // la piedra y su eje
    wb.push();
    wb.translate(0, 0.98, 0);
    wb.rotateX(Math.PI / 2);
    wb.cylinder('wallstone', 0, -0.09, 0, 0.52, 0.52, 0.18, 14, { ao: false, capTop: true, capBot: true, room, tint: [0.78, 0.74, 0.68] });
    wb.cylinder('iron', 0, -0.36, 0, 0.035, 0.035, 0.72, 6, { ao: false, room });
    wb.pop();
    wb.box('iron', -0.03, 0.95, 0.34, 0.03, 1.22, 0.38, { ao: false, room });
    wb.box('wooddark', -0.03, 1.18, 0.38, 0.03, 1.24, 0.56, { ao: false, room, tint: DARKW });
  });
  P.colOBB(ctx, x, z, 0.6, 0.32, rot, 0, 1.5);
}

// El potro de herrar: cuatro pies derechos con sus largueros, los travesaños
// de los extremos, el yugo y las cinchas de cuero colgando; dentro, la mula
// muerta. (x0..x1 a lo largo de z)
function shoeingFrame(ctx, x, z0, z1) {
  const wb = ctx.wb;
  const hw = 0.85;
  const T = [0.52, 0.44, 0.36];
  for (const z of [z0, z1])
    for (const s of [-1, 1]) {
      wb.box('wooddark', x + s * hw - 0.09, 0, z - 0.09, x + s * hw + 0.09, 2.02, z + 0.09, { aoH: 0.5, tint: T });
      ctx.col.add(x + s * hw - 0.1, 0, z - 0.1, x + s * hw + 0.1, 1.95, z + 0.1);
    }
  for (const s of [-1, 1]) {
    for (const y of [0.95, 1.55]) wb.box('timber', x + s * hw - 0.07, y, z0 - 0.15, x + s * hw + 0.07, y + 0.13, z1 + 0.15, { ao: false, faces: 'tnsewb', tint: T });
  }
  for (const z of [z0, z1]) wb.box('timber', x - hw - 0.12, 1.8, z - 0.07, x + hw + 0.12, 1.95, z + 0.07, { ao: false, faces: 'tnsewb', tint: T });
  // el yugo, delante
  wb.box('wooddark', x - 0.35, 1.2, z0 - 0.06, x + 0.35, 1.32, z0 + 0.06, { ao: false, faces: 'tnsewb', tint: T });
  // las cinchas: dos tiras que cuelgan de un larguero al otro, flojas
  for (const z of [z0 + 0.9, z0 + 1.9]) {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const xx = x - hw + u * hw * 2;
      const yy = 1.0 - Math.sin(u * Math.PI) * 0.42;
      wb.box('leather', xx - hw / n, yy - 0.025, z - 0.1, xx + hw / n, yy + 0.025, z + 0.1, { ao: false, tint: [0.5, 0.38, 0.3] });
    }
  }
  P.deadHorse(ctx, x + 0.1, 0, (z0 + z1) / 2, 0.05, { tint: [0.42, 0.36, 0.32] });
}

// San Eloy, el patrón de los herreros: la hornacina con su imagen pintada en
// tabla (obispo, con el martillo), la repisa con velas y, alrededor, las
// herraduras clavadas que le dejaron los que herraban aquí. side: hacia dónde
// mira; (x, z): el muro.
function saintEloy(ctx, x, y, z, rot, room) {
  const wb = ctx.wb;
  wb.at(x, 0, z, rot, () => {
    wb.box('ashlar', -0.42, y - 0.12, 0, 0.42, y, 0.26, { ao: false, faces: 'tnsewb', room, tint: [0.66, 0.63, 0.58] });
    wb.box('wooddark', -0.3, y, 0, 0.3, y + 0.82, 0.05, { ao: false, room, tint: DARKW });
    wb.box('gold', -0.27, y + 0.03, 0.05, 0.27, y + 0.79, 0.062, { ao: false, room, faces: 's', tint: [0.6, 0.5, 0.3] });
    // el santo: casulla roja, mitra blanca, el martillo en la mano
    wb.box('clothRed', -0.15, y + 0.08, 0.062, 0.15, y + 0.56, 0.074, { ao: false, room, faces: 's' });
    wb.box('skinPale', -0.055, y + 0.56, 0.062, 0.055, y + 0.67, 0.074, { ao: false, room, faces: 's' });
    wb.box('clothWhite', -0.06, y + 0.67, 0.062, 0.06, y + 0.77, 0.076, { ao: false, room, faces: 's' });
    wb.box('iron', 0.1, y + 0.3, 0.074, 0.13, y + 0.5, 0.082, { ao: false, room, faces: 's' });
    wb.box('iron', 0.07, y + 0.47, 0.074, 0.17, y + 0.52, 0.084, { ao: false, room, faces: 's' });
    // las herraduras de los exvotos
    for (const [hx, hy] of [
      [-0.55, 0.15],
      [0.55, 0.2],
      [-0.6, 0.62],
      [0.58, 0.7],
      [-0.48, 1.0],
      [0.45, 1.05],
      [0, 1.12],
    ])
      horseshoe(wb, hx, y + hy, 0.005, 0, 0.065, room);
  });
  const c = Math.cos(rot),
    s = Math.sin(rot);
  P.candles(ctx, x + s * 0.15, y, z + c * 0.15, 4, Math.round(x * 7 + z * 3), { room, spread: 0.2, radius: 3.6, intensity: 0.85, scale: 0.6 });
}

// Las cotas de la guarnición con carne cosida a las anillas: un montón atado
// con sogas, para echarlo a la fragua.
function mailPile(ctx, x, z, room) {
  const wb = ctx.wb;
  const rng = new RNG(8131);
  for (let i = 0; i < 6; i++) {
    const y = 0.05 + i * 0.075;
    wb.push();
    wb.translate(x + rng.range(-0.12, 0.12), y, z + rng.range(-0.12, 0.12));
    wb.rotateY(rng.range(0, Math.PI));
    wb.rotateZ(rng.range(-0.08, 0.08));
    wb.box('chainmail', -0.42, -0.04, -0.3, 0.42, 0.04, 0.3, { ao: false, room, tint: i % 2 ? [0.62, 0.6, 0.58] : [0.52, 0.5, 0.48] });
    wb.box('chainmail', 0.25, -0.03, -0.38, 0.55, 0.03, 0.38, { ao: false, room, tint: [0.5, 0.48, 0.46] });
    wb.pop();
    if (rng.chance(0.7)) wb.geometry('fleshStatic', new THREE.SphereGeometry(1, 7, 5), new THREE.Matrix4().compose(V(x + rng.range(-0.25, 0.25), y + 0.05, z + rng.range(-0.2, 0.2)), new THREE.Quaternion(), V(rng.range(0.12, 0.22), 0.06, rng.range(0.1, 0.18))), { ao: false, grime: false, room });
  }
  // las sogas
  for (const r of [0.4, -0.5]) {
    wb.push();
    wb.translate(x, 0.27, z);
    wb.rotateY(r);
    wb.box('rope', -0.5, -0.24, -0.02, 0.5, 0.24, 0.02, { ao: false, room, faces: 'tnsew' });
    wb.pop();
  }
  ctx.col.add(x - 0.55, 0, z - 0.5, x + 0.55, 0.55, z + 0.5);
}

// La cuna (vacía), de tablas, sobre dos arcos de mecer.
function cradle(ctx, x, y, z, rot, room) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    for (const s of [-1, 1]) {
      for (let k = 0; k < 5; k++) {
        const a = -0.6 + (k / 4) * 1.2;
        wb.box('wooddark', s * 0.36 - 0.03, 0.1 - Math.cos(a) * 0.1 + 0.02, Math.sin(a) * 0.3 - 0.07, s * 0.36 + 0.03, 0.14 - Math.cos(a) * 0.1 + 0.02, Math.sin(a) * 0.3 + 0.07, { ao: false, room, tint: DARKW });
      }
    }
    wb.box('planks', -0.42, 0.14, -0.26, 0.42, 0.18, 0.26, { ao: false, room, faces: 'tnsewb' });
    for (const s of [-1, 1]) wb.box('planks', -0.42, 0.18, s * 0.26 - 0.025, 0.42, 0.5, s * 0.26 + 0.025, { ao: false, room, faces: 'tnsewb' });
    for (const s of [-1, 1]) wb.box('planks', s * 0.42 - 0.025, 0.18, -0.24, s * 0.42 + 0.025, s > 0 ? 0.62 : 0.5, 0.24, { ao: false, room, faces: 'tnsewb' });
    wb.box('clothWhite', -0.36, 0.18, -0.2, 0.36, 0.26, 0.2, { ao: false, room, tint: [0.78, 0.74, 0.66] });
  });
  P.colOBB(ctx, x, z, 0.45, 0.3, rot, y, y + 0.6);
}

// ======================================================================== LA FRAGUA
export function buildFragua(ctx, S, L) {
  const wb = ctx.wb;
  const F = FRAGUA;
  const room = 'smithy';
  const Pt = F.portal,
    Bk = F.back;
  // ---- los muros, de piedra: el de la plaza con el portalón y dos ventanas
  // altas; el de atrás, con la puerta del callejón y la ventana del sobrado
  holedWall(ctx, {
    axis: 'z',
    a0: F.z0,
    a1: F.z1,
    t0: IN.x1,
    t1: F.x1,
    y0: 0,
    y1: F.EV,
    out: 'e',
    room,
    mat: 'wallstone',
    tintIn: SOOT,
    holes: [
      { a0: Pt.z0, a1: Pt.z1, y0: 0, y1: Pt.h },
      { a0: 44.2, a1: 44.9, y0: 3.9, y1: 4.7 },
      { a0: 53.1, a1: 53.8, y0: 3.9, y1: 4.7 },
    ],
  });
  holedWall(ctx, {
    axis: 'z',
    a0: F.z0,
    a1: F.z1,
    t0: F.x0,
    t1: IN.x0,
    y0: 0,
    y1: F.EV,
    out: 'w',
    room,
    mat: 'wallstone',
    tintIn: SOOT,
    holes: [
      { a0: Bk.z0, a1: Bk.z1, y0: 0, y1: Bk.h },
      { a0: 50.6, a1: 51.3, y0: 4.05, y1: 4.75 },
    ],
  });
  holedWall(ctx, { axis: 'x', a0: IN.x0, a1: IN.x1, t0: F.z0, t1: IN.z0, y0: 0, y1: F.EV, out: 'n', room, mat: 'wallstone', tintIn: SOOT });
  holedWall(ctx, { axis: 'x', a0: IN.x0, a1: IN.x1, t0: IN.z1, t1: F.z1, y0: 0, y1: F.EV, out: 's', room, mat: 'wallstone', tintIn: SOOT });
  // umbrales (el del portalón, de una sola losa ancha)
  wb.box('ashlar', IN.x1 - 0.02, 0, Pt.z0, F.x1 + 0.12, 0.035, Pt.z1, { ao: false, faces: 'tnsew' });
  wb.box('ashlar', F.x0 - 0.12, 0, Bk.z0, IN.x0 + 0.02, 0.035, Bk.z1, { ao: false, faces: 'tnsew' });
  // el suelo de dentro: losas, y tierra apisonada y ennegrecida junto a la forja
  wb.box('flag', IN.x0, -0.05, IN.z0, IN.x1, 0.015, IN.z1, { faces: 't', ao: false, room, uv: 0.8, tint: [0.56, 0.52, 0.48] });
  wb.box('dirt', -20.8, 0.015, IN.z0, -15.4, 0.03, 47.2, { faces: 't', ao: false, room, tint: [0.42, 0.38, 0.35] });
  // ---- el tejado, a dos aguas sobre la nave, con sus hastiales; por dentro
  // se ve todo, negro de humo, con las soleras, los tirantes, los pendolones
  // y la hilera
  solidGableRoof(ctx, F.x0, F.z0, F.x1, F.z1, F.EV, F.RG, 'z', { overhang: 0.45, gableOverhang: 0.25, thick: 0.2, wallT: F.t, room, wallTint: [0.74, 0.7, 0.66], cam: false });
  const half = (F.x1 - F.x0) / 2,
    xc = (F.x0 + F.x1) / 2;
  const slope = (F.RG - F.EV) / half;
  const tv = 0.2 * Math.sqrt(1 + slope * slope);
  const under = (x) => F.RG - Math.abs(x - xc) * slope - tv;
  for (const x of [IN.x0, IN.x1 - 0.3]) wb.box('timber', x, F.EV - 0.18, IN.z0, x + 0.3, under(x + (x < xc ? 0.3 : 0)) + 0.02, IN.z1, { ao: false, faces: x < xc ? 'teb' : 'twb', room, tint: DARKW });
  for (const z of [45.1, 49.0, 52.9]) {
    wb.box('timber', IN.x0 + 0.3, F.EV - 0.12, z - 0.13, IN.x1 - 0.3, F.EV + 0.14, z + 0.13, { ao: false, faces: 'tnsb', room, tint: DARKW });
    wb.box('timber', xc - 0.12, F.EV + 0.14, z - 0.12, xc + 0.12, under(xc), z + 0.12, { ao: false, room, tint: DARKW });
    for (const s of [-1, 1]) strut(wb, V(xc + s * 0.1, F.EV + 0.9, z), V(xc + s * 2.2, under(xc + s * 2.2) - 0.06, z), 0.08, 'timber', { room, tint: DARKW });
  }
  wb.box('timber', xc - 0.14, under(xc) - 0.22, IN.z0, xc + 0.14, under(xc) + 0.05, IN.z1, { ao: false, faces: 'nsewb', room, tint: DARKW });
  // (la cámara, por debajo de los faldones: rebanadas escalonadas)
  for (const sgn of [-1, 1])
    for (let k = 0; k < 5; k++) {
      const xa = xc + sgn * k * (half / 5),
        xb = xc + sgn * (k + 1) * (half / 5);
      ctx.col.addCam(Math.min(xa, xb), under(xb) - 0.05, F.z0, Math.max(xa, xb), F.RG + 0.6, F.z1);
    }
  // ---- el portalón: jambas de sillería, el dintel de roble sobre sus
  // ménsulas, y las dos hojas abiertas de par en par contra el muro
  for (const [a, b] of [
    [Pt.z0 - 0.32, Pt.z0],
    [Pt.z1, Pt.z1 + 0.32],
  ])
    for (let k = 0; k < 5; k++) wb.box('ashlar', F.x1, (k * Pt.h) / 5, a, F.x1 + 0.07, ((k + 1) * Pt.h) / 5 - 0.015, b, { ao: false, faces: 'tnsew', tint: k % 2 ? [0.62, 0.6, 0.57] : [0.68, 0.66, 0.62] });
  // (un par de dedos por debajo del hueco: a ras, su cara de abajo parpadeaba)
  wb.box('timber', F.x1 - 0.06, Pt.h - 0.025, Pt.z0 - 0.42, F.x1 + 0.1, Pt.h + 0.34, Pt.z1 + 0.42, { ao: false, faces: 'tnsewb', tint: [0.5, 0.42, 0.34] });
  wb.box('timber', IN.x1 - 0.06, Pt.h - 0.025, Pt.z0 - 0.3, IN.x1 + 0.02, Pt.h + 0.3, Pt.z1 + 0.3, { ao: false, faces: 'nswb', room, tint: DARKW });
  for (const z of [Pt.z0 - 0.2, Pt.z1 + 0.2]) wb.box('ashlar', F.x1 - 0.01, Pt.h - 0.26, z - 0.14, F.x1 + 0.16, Pt.h, z + 0.14, { ao: false, faces: 'tnsewb', tint: [0.64, 0.62, 0.58] });
  for (const [hz, dir] of [
    [Pt.z0, -1],
    [Pt.z1, 1],
  ]) {
    // (la hoja, de tablas con sus barras y sus clavos, girada hacia dentro y
    // apoyada en el muro)
    const lw = (Pt.z1 - Pt.z0) / 2 - 0.02;
    wb.push();
    wb.translate(IN.x1 - 0.05, 0.02, hz);
    wb.rotateY(dir < 0 ? Math.PI / 2 + 0.12 : -Math.PI / 2 - 0.12);
    wb.box('planks', 0, 0, -0.04, lw, Pt.h - 0.06, 0.04, { ao: false, faces: 'tnsewb', room, tint: [0.66, 0.58, 0.5] });
    for (const yy of [0.4, 1.6, 2.8]) wb.box('wooddark', 0.05, yy, 0.04, lw - 0.05, yy + 0.16, 0.08, { ao: false, room, tint: DARKW });
    wb.pop();
  }
  // las ventanas altas, con su marco y las contraventanas abiertas: el
  // resplandor de la forja se ve desde toda la plaza
  for (const z of [44.55, 53.45]) {
    frame(ctx, 'e', F.x1, z, 0.7, 3.9, 4.7, F.t, { room });
    ctx.lights.push({ x: F.x1 + 0.6, y: 4.3, z, r: 1, g: 0.42, b: 0.12, radius: 3.2, intensity: 1.4 });
  }
  frame(ctx, 'w', F.x0, 50.95, 0.7, 4.05, 4.75, F.t, { room });
  // el rótulo del yunque, sobre el portalón y por encima del soportal
  P.sign(ctx, F.x1, 5.15, 51.4, Math.PI / 2, 'anvil');
  // la herradura de la suerte, clavada sobre el dintel, y el hollín que deja
  // el resplandor por encima de las ventanas
  horseshoe(wb, F.x1 + 0.01, Pt.h + 0.58, (Pt.z0 + Pt.z1) / 2, Math.PI / 2, 0.11);
  for (const z of [44.55, 53.45]) P.decal(ctx, F.x1 + 0.01, 5.0, z, 1.1, 'shadow', Math.PI / 2, { wall: 'x', opacity: 0.55 });
  // ---- el soportal: la cubierta de teja sobre sus pies derechos y, debajo,
  // el potro de herrar con la mula muerta, el yunque de la calle, la tina,
  // la rueda esperando su llanta y las llantas apoyadas en la fachada
  P.leanTo(ctx, F.x1, 43, -11.2, 55, 'w', 4.15, 3.05);
  shoeingFrame(ctx, -12.75, 43.7, 46.6);
  anvilStump(ctx, { x: -12.7, z: 52.0, rot: -0.3 }, undefined, { s: 0.9 });
  P.barrel(ctx, -13.4, 0, 53.2, { r: 0.34, h: 0.8 });
  wb.box('water', -13.66, 0.78, 52.94, -13.14, 0.79, 53.46, { faces: 't', ao: false, grime: false, tint: [0.3, 0.32, 0.32] });
  P.cartWheel(ctx, -13.75, 0, 54.15, Math.PI / 2);
  for (const z of [54.75, 54.95]) {
    // (de pie contra la fachada, el eje hacia la plaza)
    wb.push();
    wb.translate(F.x1 + 0.12, 0.62, z);
    wb.rotateZ(Math.PI / 2 - 0.12);
    wb.ring('iron', 0, -0.025, 0, 0.6, 0.56, 0.05, 16, {});
    wb.pop();
  }
  P.firewood(ctx, -13.4, 0, 55.3, 0, 3);
  P.sacks(ctx, -12.2, 0, 54.6, 3, 8121);
  P.lantern(ctx, F.x1, 2.75, 51.3, Math.PI / 2, true);
  P.coalPile(ctx, -11.9, 0, 43.4, 0.7);
  // (el brasero de la calle, que el herrero tenía siempre encendido)
  P.brazier(ctx, -11.55, 0, 46.85, { s: 0.85, radius: 7 });
  // ---- dentro: la forja, el fuelle, el yunque y el herrero
  wb.setRoom(room);
  greatForge(ctx, room);
  greatBellows(ctx, room);
  anvilStump(ctx, F.anvil, room, { hammer: false });
  // (de rodillas ante el hogar, mirando al fuego, con el brazo metido en él)
  bakeCorpse(wb, -18.25, 0, 44.45, Math.PI, 'forge', 'villager', 7, smithDef());
  P.decal(ctx, -18.35, 0.04, 44.5, 1.3);
  // la pila de templar, contra el muro, con unas tenazas en el borde
  P.trough(ctx, -15.75, 0, 42.95, 0, { len: 1.8, room, tint: [0.25, 0.28, 0.3] });
  wb.push();
  wb.translate(-16.2, 0.78, 43.2);
  wb.rotateY(0.3);
  wb.box('iron', -0.02, -0.01, -0.3, 0.0, 0.01, 0.3, { ao: false, room });
  wb.box('iron', 0.02, -0.01, -0.3, 0.04, 0.01, 0.3, { ao: false, room });
  wb.pop();
  P.toolBoard(ctx, -15.75, 0.25, IN.z0, 0, { room });
  // el cajón del carbón, contra el muro de la plaza
  {
    const [bx0, bz0, bx1, bz1] = [IN.x1 - 0.85, 43.8, IN.x1, 45.2];
    for (const [a, b, c, d] of [
      [bx0, bz0, bx1, bz0 + 0.05],
      [bx0, bz1 - 0.05, bx1, bz1],
      [bx0, bz0 + 0.05, bx0 + 0.05, bz1 - 0.05],
    ])
      wb.box('planks', a, 0, b, c, 0.55, d, { ao: false, room, tint: [0.6, 0.52, 0.44] });
    P.coalPile(ctx, (bx0 + bx1) / 2, 0.1, (bz0 + bz1) / 2, 0.9, { room });
    ctx.col.add(bx0, 0, bz0, bx1, 0.55, bz1);
  }
  mailPile(ctx, -15.6, 46.45, room);
  // las tenazas, en su caballete, junto al yunque; la clavera en su tajo,
  // con su martillo y un cubo de clavos
  wb.at(-19.75, 0, 45.35, 0.4, () => {
    wb.box('wooddark', -0.4, 0.9, -0.04, 0.4, 0.96, 0.04, { ao: false, room, faces: 'tnsewb', tint: DARKW });
    for (const s of [-1, 1]) wb.box('wooddark', s * 0.36 - 0.04, 0, -0.04, s * 0.36 + 0.04, 0.9, 0.04, { ao: false, room, tint: DARKW });
    for (let i = 0; i < 6; i++) {
      wb.push();
      wb.translate(-0.3 + i * 0.12, 0.93, 0.03);
      wb.rotateX(0.18);
      wb.box('iron', -0.012, -0.85, -0.008, 0.012, 0, 0.008, { ao: false, room });
      wb.box('iron', 0.016, -0.85, -0.008, 0.036, 0, 0.008, { ao: false, room });
      wb.pop();
    }
  });
  P.colOBB(ctx, -19.75, 45.35, 0.42, 0.1, 0.4, 0, 0.96);
  wb.cylinder('wooddark', -16.75, 0, 46.05, 0.24, 0.27, 0.62, 8, { capTop: true, ao: false, room, tint: [0.54, 0.46, 0.38] });
  wb.box('iron', -16.92, 0.62, 45.92, -16.58, 0.67, 46.18, { ao: false, room });
  ctx.col.add(-17.02, 0, 45.78, -16.48, 0.62, 46.32);
  wb.cylinder('iron', -16.4, 0, 46.7, 0.16, 0.18, 0.28, 8, { ao: false, room, open: true });
  wb.cylinder('black', -16.4, 0.24, 46.7, 0.16, 0.16, 0.01, 8, { ao: false, capTop: true, grime: false, room, tint: [1.5, 1.5, 1.6] });
  // la muela de afilar y la bigornia, en la nave
  grindstone(ctx, -19.55, 50.7, Math.PI / 2, room);
  anvilStump(ctx, { x: -17.35, z: 52.35, rot: 0.7 }, room, { s: 0.8, hammer: false });
  // el banco del herrero, contra el muro de la plaza, con el tornillo, las
  // limas, el libro de cuentas y una vela; encima, las herraduras de la pared
  P.table(ctx, -14.92, 0, 53.05, 1.8, 0.8, Math.PI / 2);
  wb.box('iron', -15.25, 0.8, 52.35, -15.05, 0.98, 52.55, { ao: false, room });
  wb.box('iron', -15.32, 0.92, 52.4, -15.0, 0.96, 52.5, { ao: false, room });
  for (let i = 0; i < 3; i++) wb.box('iron', -14.8 - i * 0.07, 0.8, 53.45 + i * 0.05, -14.78 - i * 0.07, 0.81, 53.8 + i * 0.05, { ao: false, room });
  P.candles(ctx, -14.75, 0.8, 52.75, 2, 8141, { room, radius: 4, intensity: 0.8, spread: 0.1 });
  wb.box('timber', IN.x1 - 0.12, 1.9, 52.05, IN.x1, 2.0, 54.55, { ao: false, faces: 'tnsewb', room, tint: DARKW });
  for (let i = 0; i < 9; i++) {
    const z = 52.2 + i * 0.28;
    wb.box('iron', IN.x1 - 0.1, 1.86, z - 0.012, IN.x1, 1.9, z + 0.012, { ao: false, room });
    horseshoe(wb, IN.x1 - 0.06, 1.78, z, -Math.PI / 2, 0.075, room);
  }
  // toneles de clavos y de herraduras (uno bajo el sobrado)
  // (el pie de la escalera, libre)
  nailBarrel(ctx, -14.85, 54.42, room);
  nailBarrel(ctx, -22.2, 54.95, room, 'shoes');
  // una lámpara colgada del tirante de en medio
  P.hangingLamp(ctx, -17.6, F.EV - 0.1, 49.0, { room, len: 1.5, radius: 8, intensity: 0.9, dyn: 1.4 });
  // ---- el sobrado (la vivienda, sobre la mitad de poniente): el suelo de
  // tablas sobre su viga y tres pies derechos con sus zapatas, la barandilla
  // que se asoma a la forja y la escalera, contra el muro del sur
  const LY = F.LY,
    LX = F.LX;
  wb.box('planks', IN.x0, LY - 0.07, IN.z0, LX, LY, IN.z1, { faces: 'tb', ao: false, room, uv: 0.5, tint: [0.74, 0.66, 0.56] });
  wb.box('timber', LX - 0.06, LY - 0.38, IN.z0, LX + 0.18, LY - 0.07, IN.z1, { ao: false, room, faces: 'nsewb', tint: DARKW });
  for (let z = IN.z0 + 0.9; z < IN.z1 - 0.4; z += 1.15) wb.box('timber', IN.x0, LY - 0.3, z - 0.09, LX - 0.06, LY - 0.07, z + 0.09, { ao: false, room, faces: 'nsewb', tint: DARKW });
  ctx.col.add(IN.x0, LY - 0.38, IN.z0, LX + 0.18, LY, IN.z1).cam = true;
  ctx.col.addCam(IN.x0, LY - 0.45, IN.z0, LX, LY - 0.3, IN.z1);
  for (const z of [45.6, 49.6, 53.4]) {
    wb.box('wooddark', LX - 0.06, 0, z - 0.12, LX + 0.18, LY - 0.38, z + 0.12, { room, tint: DARKW });
    wb.box('wooddark', LX - 0.08, LY - 0.62, z - 0.45, LX + 0.2, LY - 0.38, z + 0.45, { ao: false, room, faces: 'nsewb', tint: DARKW });
    ctx.col.add(LX - 0.08, 0, z - 0.14, LX + 0.2, LY - 0.38, z + 0.14);
  }
  railing(ctx, LX + 0.06, IN.z0 + 0.05, LX + 0.06, 54.45, LY, room);
  // la escalera: sube hacia poniente pegada al muro del sur, con su zanca y
  // su pasamanos
  const n = 12,
    rise = LY / n,
    run = (-16.0 - LX) / n;
  stairs(ctx, -16.0, 0, (IN.z1 + 54.5) / 2, 'w', IN.z1 - 54.5, n, rise, run, 'wooddark', { solidBelow: true });
  {
    const za = 54.5 - 0.04;
    const len = Math.hypot(n * run, LY);
    wb.push();
    wb.translate((-16.0 + LX) / 2, LY / 2 - 0.12, za);
    wb.rotateZ(-Math.atan2(LY, n * run));
    wb.box('timber', -len / 2, -0.16, -0.04, len / 2, 0.16, 0.04, { ao: false, room, tint: DARKW });
    wb.pop();
    strut(wb, V(-16.0, 1.0, za - 0.04), V(LX, LY + 0.95, za - 0.04), 0.035, 'wooddark', { room, tint: DARKW });
    wb.box('wooddark', -16.04, 0, za - 0.08, -15.96, 1.05, za, { ao: false, room, tint: DARKW });
    ctx.col.add(LX, 0, za - 0.08, -16.0, LY + 1.0, za + 0.01).noSight = true;
  }
  // la alcoba: la cama contra el muro, el arca a sus pies, la cuna vacía, la
  // rueca de la mujer y su taburete, una mesa con una vela; en el rincón del
  // norte, el jergón del aprendiz, vacío
  P.bed(ctx, -24.92, LY, 51.25, Math.PI / 2);
  chest(ctx, -24.92, LY, 49.15, Math.PI / 2, room, 1.0);
  cradle(ctx, -23.25, LY, 52.95, 0.35, room);
  P.spinningWheel(ctx, -22.55, LY, 49.95, -1.2, { room });
  P.stool(ctx, -22.95, LY, 50.75, { room });
  P.table(ctx, -22.45, LY, 47.65, 1.1, 0.7, Math.PI / 2);
  P.candles(ctx, -22.45, LY + 0.8, 47.8, 2, 8151, { room, radius: 5, intensity: 0.95, spread: 0.12 });
  wb.box('wooddark', IN.x0, LY + 1.55, 47.4, IN.x0 + 0.08, LY + 1.62, 49.0, { ao: false, room, tint: DARKW });
  for (const [z, mat, l] of [
    [47.7, 'clothDark', 1.15],
    [48.4, 'leather', 0.9],
  ])
    wb.box(mat, IN.x0 + 0.02, LY + 1.55 - l, z - 0.22, IN.x0 + 0.1, LY + 1.55, z + 0.22, { ao: false, room });
  wb.box('straw', IN.x0 + 0.05, LY, IN.z0 + 0.4, IN.x0 + 0.95, LY + 0.16, IN.z0 + 2.2, { ao: false, room, tint: [0.86, 0.72, 0.46] });
  wb.box('burlap', IN.x0 + 0.1, LY + 0.16, IN.z0 + 0.6, IN.x0 + 0.9, LY + 0.2, IN.z0 + 1.5, { ao: false, room, tint: [0.7, 0.62, 0.52] });
  // (un caballito de madera: lo que el aprendiz no se llevó)
  wb.at(-24.2, LY, IN.z0 + 2.55, 0.8, () => {
    wb.box('wooddark', -0.14, 0.1, -0.04, 0.14, 0.2, 0.04, { ao: false, room, tint: [0.7, 0.56, 0.42] });
    wb.box('wooddark', 0.1, 0.18, -0.03, 0.18, 0.32, 0.03, { ao: false, room, tint: [0.7, 0.56, 0.42] });
    for (const [x, z] of [
      [-0.11, -0.03],
      [-0.11, 0.03],
      [0.11, -0.03],
      [0.11, 0.03],
    ])
      wb.box('wooddark', x - 0.015, 0, z - 0.012, x + 0.015, 0.1, z + 0.012, { ao: false, room, tint: [0.7, 0.56, 0.42] });
  });
  P.decal(ctx, -24.4, LY + 0.02, 51.0, 0.9);
  // ---- el almacén, bajo el sobrado: sacos de carbón, toneles, barras, las
  // armas acabadas para la guarnición, el maniquí con su cota (también con
  // carne) y la puerta de atrás; San Eloy, en su hornacina del muro del norte
  P.sacks(ctx, -24.6, 0, 43.4, 5, 8161);
  P.barrel(ctx, -22.3, 0, 43.0);
  P.barrel(ctx, -22.25, 0, 43.85, { lying: true, rot: 0.2 });
  P.ironBars(ctx, -24.1, 0, 54.6, 0, { room });
  P.weaponRack(ctx, -25.32, 0, 49.6, Math.PI / 2);
  P.armorStand(ctx, -24.4, 0, 47.9, Math.PI / 2 + 0.4, { room, flesh: true });
  P.crate(ctx, -24.9, 0, 52.6, 0.8, 0.25);
  P.crate(ctx, -24.85, 0.8, 52.55, 0.6, 0.9);
  saintEloy(ctx, -23.4, 1.35, IN.z0, 0, room);
  wb.setRoom(null);
  // ---- lo que se puede coger y leer
  L.interact.push(
    // la palanca, encima del yunque
    { kind: 'item', id: 'i_palanca', item: 'palanca', x: F.anvil.x, y: 0.94, z: F.anvil.z },
    { kind: 'note', id: 'n_herrero', note: 'herrero', x: -14.9, y: 0.82, z: 53.3, model: 'book' }
  );
  // ---- lo transitable: la nave entera, el portalón y la puerta de atrás
  if (S) {
    S.paint(F.x0 + 0.01, F.z0 + 0.01, F.x1 - 0.01, F.z1 - 0.01, 1);
    S.paint(F.x1 - 0.8, Pt.z0, F.x1 + 0.8, Pt.z1, 1);
    S.paint(F.x0 - 0.8, Bk.z0, F.x0 + 0.8, Bk.z1, 1);
  }
}
