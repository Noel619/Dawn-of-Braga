// La Casa de los Inocentes, por dentro, su patio y el callejón de la capilla.
//
// Mestre Clemente, físico. Aquí guardó veinte años a los locos de Braga (los
// inocentes): los que oyen lo que nadie oye, los melancólicos, los furiosos.
// Abajo, su sala de visitas (la mesa de escribir bajo la rueda de las
// orinas, el atril con su Galeno, la silla de sujetar a los que no se están
// quietos, las matulas) y, detrás, todo lo ancho de la casa, el quirófano: la
// mesa con sus correas bajo la lámpara, el brasero de los cauterios, el
// trépano, las coronas. Arriba, su alcoba (la de la ventana de la cortina, en
// el eje de la calleja: desde su taburete ve a quien entra en el barrio), la
// botica (los frascos, el alambique, las esponjas, el cuenco de las piedras) y
// la sala de los inocentes (los camastros con correas, las cadenas). En el
// desván, lo que les quitó a todos (la ropa, los zapatos) y las coronas a
// medio hacer.
// Norte = -Z. Unidades en metros.
import * as THREE from 'three';
import { RNG } from '../core/util.js';
import * as P from './props.js';
import { chest, bowl, herbBunch } from './level_souto.js';
import { bakeCorpse } from '../entities/models.js';
import { tapia, rotulo, V } from './kit_casa.js';
import { camastro, botas, palo, cruzCal } from './barrio_atrezo.js';

const luna = (ctx, x, y, z, room, i = 0.45, r = 4) => ctx.lights.push({ x, y, z, r: 0.5, g: 0.6, b: 0.85, radius: r, intensity: i, room });
const M4 = () => new THREE.Matrix4();
const Q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
const PERGAMINO = [0.86, 0.78, 0.6];

// ------------------------------------------------------------ piezas
// La silla de sujetar: de roble, de respaldo alto y recto, con correas en
// las muñecas, en los tobillos, en el pecho y en la frente (la de los que no
// se están quietos); rot: hacia dónde mira el que se sienta (+z local).
function sillaSujecion(ctx, x, y, z, rot, room) {
  const wb = ctx.wb;
  const C = [0.32, 0.2, 0.14];
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -0.34, 0.44, -0.3, 0.34, 0.54, 0.32, { ao: false, room, faces: 'tnsewb' });
    for (const [sx, sz] of [
      [-0.3, -0.26],
      [0.3, -0.26],
      [-0.3, 0.28],
      [0.3, 0.28],
    ])
      wb.box('wooddark', sx - 0.05, 0, sz - 0.05, sx + 0.05, 0.44, sz + 0.05, { ao: false, room });
    // el travesaño de los pies y sus dos correas
    wb.box('wooddark', -0.3, 0.12, 0.25, 0.3, 0.2, 0.31, { ao: false, room });
    for (const sx of [-0.15, 0.15]) {
      wb.box('leather', sx - 0.07, 0.1, 0.31, sx + 0.07, 0.22, 0.34, { ao: false, room, tint: C });
      wb.box('iron', sx - 0.02, 0.13, 0.34, sx + 0.02, 0.19, 0.35, { ao: false, room });
    }
    // el respaldo, recto y alto, con la correa del pecho y la de la frente
    wb.box('wooddark', -0.34, 0.54, -0.33, 0.34, 1.62, -0.25, { ao: false, room });
    wb.box('wooddark', -0.38, 1.55, -0.34, 0.38, 1.66, -0.24, { ao: false, room });
    wb.box('leather', -0.3, 0.98, -0.25, 0.3, 1.08, -0.22, { ao: false, room, tint: C });
    wb.box('leather', 0.26, 0.6, -0.24, 0.32, 1.0, -0.21, { ao: false, room, tint: C });
    wb.box('leather', -0.13, 1.36, -0.25, 0.13, 1.42, -0.2, { ao: false, room, tint: C });
    wb.box('iron', -0.03, 1.35, -0.2, 0.03, 1.43, -0.19, { ao: false, room });
    // los brazos, con las correas de las muñecas (gastadas por dentro)
    for (const sx of [-0.36, 0.36]) {
      wb.box('wooddark', sx - 0.04, 0.54, 0.2, sx + 0.04, 0.84, 0.28, { ao: false, room });
      wb.box('wooddark', sx - 0.05, 0.84, -0.3, sx + 0.05, 0.9, 0.3, { ao: false, room, faces: 'tnsewb' });
      wb.box('leather', sx - 0.065, 0.82, 0.02, sx + 0.065, 0.92, 0.13, { ao: false, room, tint: C });
      wb.box('iron', sx + Math.sign(sx) * 0.065, 0.84, 0.05, sx + Math.sign(sx) * 0.075, 0.9, 0.1, { ao: false, room });
    }
    // el arañazo de las uñas en el brazo de la izquierda
    for (let i = 0; i < 4; i++) wb.box('black', -0.39 + i * 0.012, 0.9, -0.2 + i * 0.03, -0.385 + i * 0.012, 0.901, -0.05 + i * 0.03, { ao: false, room, faces: 't', grime: false, tint: [0.5, 0.45, 0.4] });
  });
  P.colOBB(ctx, x, z, 0.42, 0.4, rot, y, y + 1.0);
}

// La jofaina en su pie de tres patas, con el jarro (rot: hacia la sala).
function palanganero(ctx, x, y, z, room) {
  const wb = ctx.wb;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    palo(wb, V(x + Math.cos(a) * 0.22, y, z + Math.sin(a) * 0.22), V(x + Math.cos(a) * 0.15, y + 0.85, z + Math.sin(a) * 0.15), 0.02, 'wooddark', { room });
  }
  wb.cylinder('wooddark', x, y + 0.82, z, 0.2, 0.2, 0.04, 8, { ao: false, room });
  wb.cylinder('bronzeAged', x, y + 0.86, z, 0.13, 0.19, 0.08, 10, { ao: false, room, capBot: true });
  wb.cylinder('water', x, y + 0.92, z, 0.17, 0.17, 0.01, 10, { ao: false, room, capTop: true, grime: false, tint: [0.4, 0.14, 0.12] });
  P.colOBB(ctx, x, z, 0.28, 0.28, 0, y, y + 1.0);
}

// La tabla de los hierros, colgada en la pared (plano local: x a lo largo de
// la pared, z hacia la sala): las lancetas, los bisturíes, las legras, la
// sierra de arco y, abajo, el trépano de manivela.
function tablaHierros(ctx, x, y, z, rot, room, seed) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -0.7, 0, 0, 0.7, 0.6, 0.04, { ao: false, room });
    for (let i = 0; i < 8; i++) {
      const u = -0.6 + i * 0.13;
      const k = rng.int(0, 2);
      const len = [0.18, 0.26, 0.34][k];
      wb.box('iron', u - 0.01, 0.46 - len, 0.04, u + 0.01, 0.46, 0.055, { ao: false, room });
      wb.box(k === 2 ? 'bone' : 'wooddark', u - 0.018, 0.46, 0.04, u + 0.018, 0.55, 0.06, { ao: false, room });
    }
    // la sierra de arco
    wb.box('iron', 0.42, 0.12, 0.045, 0.66, 0.15, 0.05, { ao: false, room });
    palo(wb, V(0.42, 0.15, 0.06), V(0.46, 0.5, 0.06), 0.008, 'iron', { room, round: true });
    palo(wb, V(0.66, 0.15, 0.06), V(0.62, 0.5, 0.06), 0.008, 'iron', { room, round: true });
    palo(wb, V(0.46, 0.5, 0.06), V(0.62, 0.5, 0.06), 0.01, 'iron', { room, round: true });
    wb.box('wooddark', 0.5, 0.5, 0.05, 0.58, 0.58, 0.07, { ao: false, room });
    // el trépano: la manivela en codo, el pomo y la corona dentada
    trepano(wb, -0.3, 0.06, 0.07, room);
  });
}

// El trépano de manivela, tumbado (de lado, a lo largo del x local): la
// corona dentada a la izquierda, el codo de la manivela, el pomo a la derecha.
function trepano(wb, x, y, z, room) {
  palo(wb, V(x - 0.16, y, z), V(x - 0.06, y, z), 0.008, 'iron', { room, round: true });
  palo(wb, V(x - 0.06, y, z), V(x - 0.03, y + 0.08, z), 0.007, 'iron', { room, round: true });
  palo(wb, V(x - 0.03, y + 0.08, z), V(x + 0.07, y + 0.08, z), 0.007, 'iron', { room, round: true });
  palo(wb, V(x + 0.07, y + 0.08, z), V(x + 0.1, y, z), 0.007, 'iron', { room, round: true });
  palo(wb, V(x + 0.1, y, z), V(x + 0.18, y, z), 0.008, 'iron', { room, round: true });
  wb.geometry('wooddark', new THREE.SphereGeometry(0.03, 6, 4), M4().compose(V(x + 0.2, y, z), Q(0, 0, 0), V(1.2, 1, 1)), { ao: false, room });
  wb.geometry('wooddark', new THREE.CylinderGeometry(0.018, 0.018, 0.07, 6), M4().compose(V(x + 0.02, y + 0.08, z), Q(0, 0, Math.PI / 2), V(1, 1, 1)), { ao: false, room });
  // la corona: un cilindrito hueco con los dientes
  wb.geometry('iron', new THREE.CylinderGeometry(0.022, 0.022, 0.05, 8, 1, true), M4().compose(V(x - 0.18, y, z), Q(0, 0, Math.PI / 2), V(1, 1, 1)), { ao: false, room });
}

// Un frasco de vidrio (con sanguijuelas, con algo flotando, con sangre o con
// el jugo de las adormideras).
function frasco(wb, x, y, z, s, kind, room) {
  const pts = [
    [0.001, 0],
    [0.09, 0],
    [0.1, 0.05],
    [0.1, 0.22],
    [0.07, 0.27],
    [0.05, 0.29],
    [0.055, 0.32],
  ].map(([r, h]) => new THREE.Vector2(r * s, h * s));
  wb.geometry('glass', new THREE.LatheGeometry(pts, 8), M4().makeTranslation(x, y, z), { ao: false, room, grime: false, tint: [0.7, 0.8, 0.7] });
  const fill = kind === 'sangre' ? [0.35, 0.05, 0.04] : kind === 'carne' ? [0.55, 0.45, 0.32] : kind === 'adormidera' ? [0.42, 0.3, 0.14] : [0.25, 0.28, 0.2];
  wb.cylinder('water', x, y + 0.01, z, 0.088 * s, 0.088 * s, 0.19 * s, 8, { ao: false, room, capTop: true, grime: false, tint: fill });
  if (kind === 'carne') wb.geometry('flesh', new THREE.DodecahedronGeometry(0.05 * s, 0), M4().makeTranslation(x, y + 0.1 * s, z), { ao: false, room });
  if (kind === 'sanguijuelas') for (let i = 0; i < 3; i++) wb.box('black', x - 0.04 * s + i * 0.03 * s, y + 0.04 * s, z - 0.01, x - 0.02 * s + i * 0.03 * s, y + 0.15 * s, z + 0.01, { ao: false, room });
  wb.cylinder('wooddark', x, y + 0.3 * s, z, 0.05 * s, 0.05 * s, 0.04 * s, 6, { ao: false, room });
}

// Una estantería de frascos (rot: de cara a +z local).
function estanteFrascos(ctx, x, y, z, rot, w, room, seed) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  wb.at(x, y, z, rot, () => {
    for (const sx of [-w / 2, w / 2 - 0.05]) wb.box('wooddark', sx, 0, -0.17, sx + 0.05, 2.0, 0.17, { ao: false, room });
    for (let i = 0; i < 4; i++) {
      const yy = 0.3 + i * 0.45;
      wb.box('wooddark', -w / 2 + 0.05, yy, -0.16, w / 2 - 0.05, yy + 0.03, 0.16, { ao: false, room, faces: 'tnsewb' });
      for (let u = -w / 2 + 0.16; u < w / 2 - 0.12; u += rng.range(0.16, 0.24)) {
        if (rng.chance(0.15)) continue;
        frasco(wb, u, yy + 0.03, rng.range(-0.05, 0.05), rng.range(0.8, 1.3), rng.pick(['sangre', 'carne', 'sanguijuelas', 'adormidera', 'adormidera']), room);
      }
    }
  });
  P.colOBB(ctx, x, z, w / 2, 0.18, rot, y, y + 2.0);
}

// Un códice: las tapas de cuero (o de tabla forrada), el bloque de las hojas
// y los broches. En el marco local, tumbado (de x0 a x1, de z0 a z1, de grueso
// h desde y).
const TAPAS = [
  [0.42, 0.24, 0.16],
  [0.3, 0.16, 0.12],
  [0.5, 0.36, 0.26],
  [0.36, 0.14, 0.12],
  [0.22, 0.2, 0.18],
];
function codice(wb, x0, y, z0, x1, z1, h, tint, room) {
  wb.box('leather', x0, y, z0, x1, y + h, z1, { ao: false, room, tint });
  wb.box('clothWhite', x0 + 0.012, y + 0.008, z0 - 0.002, x1 - 0.002, y + h - 0.008, z1 + 0.002, { ao: false, room, grime: false, tint: PERGAMINO, faces: 'nse' });
  wb.box('bronzeAged', x1 - 0.01, y + h * 0.3, (z0 + z1) / 2 - 0.02, x1 + 0.006, y + h * 0.7, (z0 + z1) / 2 + 0.02, { ao: false, room });
}
// Una pila de códices (de mayor a menor, cada uno algo girado).
function pilaLibros(ctx, x, y, z, n, room, seed) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  let yy = 0;
  for (let i = 0; i < n; i++) {
    const w = rng.range(0.24, 0.34) * (1 - i * 0.05),
      d = rng.range(0.18, 0.24) * (1 - i * 0.05),
      h = rng.range(0.04, 0.08);
    wb.at(x, y + yy, z, rng.range(-0.4, 0.4), () => codice(wb, -w / 2, 0, -d / 2, w / 2, d / 2, h, rng.pick(TAPAS), room));
    yy += h;
  }
}
// Una librería (rot: de cara a +z local): códices de pie, de lomo, y alguna
// pila tumbada; y en la balda de arriba, un cráneo.
function estanteLibros(ctx, x, y, z, rot, w, room, seed, o = {}) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  wb.at(x, y, z, rot, () => {
    for (const sx of [-w / 2, w / 2 - 0.05]) wb.box('wooddark', sx, 0, -0.18, sx + 0.05, 2.1, 0.18, { ao: false, room });
    wb.box('wooddark', -w / 2, 2.1, -0.2, w / 2, 2.16, 0.2, { ao: false, room, faces: 'tnsewb' });
    for (let i = 0; i < 4; i++) {
      const yy = 0.25 + i * 0.47;
      wb.box('wooddark', -w / 2 + 0.05, yy, -0.17, w / 2 - 0.05, yy + 0.03, 0.17, { ao: false, room, faces: 'tnsewb' });
      let u = -w / 2 + 0.08;
      while (u < w / 2 - 0.12) {
        if (rng.chance(0.18)) {
          // una pila tumbada
          let hh = yy + 0.03;
          const n = rng.int(2, 4);
          for (let k = 0; k < n; k++) {
            const th = rng.range(0.04, 0.07);
            codice(wb, u, hh, -0.13, u + 0.26, 0.11, th, rng.pick(TAPAS), room);
            hh += th;
          }
          u += 0.3;
          continue;
        }
        if (o.skull && i === 3 && Math.abs(u) < 0.2) {
          craneo(wb, u + 0.1, yy + 0.03, 0, 0, room, { hole: true });
          u += 0.24;
          continue;
        }
        // de pie, con el lomo hacia la sala
        const th = rng.range(0.04, 0.08),
          h = rng.range(0.24, 0.36),
          d = rng.range(0.18, 0.26);
        const t = rng.pick(TAPAS);
        wb.box('leather', u, yy + 0.03, -d / 2, u + th, yy + 0.03 + h, d / 2, { ao: false, room, tint: t });
        // (los nervios del lomo)
        for (const k of [0.25, 0.5, 0.75]) wb.box('leather', u - 0.003, yy + 0.03 + h * k - 0.006, d / 2, u + th + 0.003, yy + 0.03 + h * k + 0.006, d / 2 + 0.006, { ao: false, room, tint: t.map((c) => c * 0.7) });
        u += th + rng.range(0.003, 0.02);
      }
    }
  });
  P.colOBB(ctx, x, z, w / 2, 0.2, rot, y, y + 2.16);
}

// El atril con el libro abierto (rot: el que lee mira hacia -z local, el
// libro hacia +z... de cara a quien llega por +z).
function atril(ctx, x, y, z, rot, room) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -0.25, 0, -0.06, 0.25, 0.06, 0.06, { ao: false, room });
    wb.box('wooddark', -0.06, 0, -0.25, 0.06, 0.06, 0.25, { ao: false, room });
    wb.box('wooddark', -0.05, 0.06, -0.05, 0.05, 1.1, 0.05, { ao: false, room });
    wb.push();
    wb.translate(0, 1.12, 0);
    wb.rotateX(0.55);
    wb.box('wooddark', -0.3, -0.03, -0.22, 0.3, 0, 0.22, { ao: false, room, faces: 'tnsewb' });
    wb.box('wooddark', -0.3, 0, 0.19, 0.3, 0.04, 0.22, { ao: false, room });
    // las dos páginas, algo abombadas, con sus renglones y una letra roja
    for (const s of [-1, 1]) {
      wb.box('clothWhite', s > 0 ? 0.005 : -0.27, 0.0, -0.18, s > 0 ? 0.27 : -0.005, 0.03, 0.18, { ao: false, room, grime: false, tint: PERGAMINO });
      for (let i = 0; i < 9; i++) {
        const zz = -0.15 + i * 0.033;
        wb.box('black', s > 0 ? 0.03 : -0.25, 0.031, zz, s > 0 ? 0.25 : -0.03, 0.032, zz + 0.008, { ao: false, room, faces: 't', grime: false, tint: [0.35, 0.3, 0.25] });
      }
      wb.box('clothRed', s > 0 ? 0.03 : -0.25, 0.032, -0.16, s > 0 ? 0.07 : -0.21, 0.033, -0.11, { ao: false, room, faces: 't', grime: false });
    }
    // la cinta
    wb.box('clothRed', -0.01, 0.031, 0.17, 0.01, 0.032, 0.34, { ao: false, room, grime: false });
    wb.pop();
  });
  P.colOBB(ctx, x, z, 0.3, 0.3, rot, y, y + 1.3);
}

// La rueda de las orinas, clavada en la pared (de cara a +z local): el
// pergamino redondo con las veinte matulas pintadas alrededor, de la más
// clara (la sana) a la más negra, y en medio la figura del hombre.
function ruedaOrinas(ctx, x, y, z, rot, room) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.geometry('clothWhite', new THREE.CylinderGeometry(0.46, 0.46, 0.01, 24), M4().compose(V(0, 0, 0.005), Q(Math.PI / 2, 0, 0), V(1, 1, 1)), { ao: false, room, grime: false, tint: PERGAMINO });
    wb.geometry('black', new THREE.TorusGeometry(0.44, 0.006, 3, 24), M4().makeTranslation(0, 0, 0.012), { ao: false, room, grime: false, tint: [0.4, 0.3, 0.22] });
    wb.geometry('black', new THREE.TorusGeometry(0.17, 0.005, 3, 18), M4().makeTranslation(0, 0, 0.012), { ao: false, room, grime: false, tint: [0.4, 0.3, 0.22] });
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const k = i / 19;
      // de pajizo a rojo, a pardo, a negro
      const c = k < 0.4 ? [0.95, 0.85 - k * 0.6, 0.4 - k * 0.6] : k < 0.75 ? [0.85 - (k - 0.4), 0.5 - (k - 0.4) * 1.1, 0.12] : [0.5 - (k - 0.75) * 1.6, 0.1, 0.06];
      const px = Math.sin(a) * 0.33,
        py = Math.cos(a) * 0.33;
      wb.geometry('glass', new THREE.CircleGeometry(0.04, 8), M4().compose(V(px, py - 0.01, 0.012), Q(0, 0, 0), V(1, 1, 1)), { ao: false, room, grime: false, tint: c });
      wb.box('black', px - 0.008, py + 0.03, 0.011, px + 0.008, py + 0.06, 0.013, { ao: false, room, grime: false, tint: [0.4, 0.3, 0.22] });
      // los radios
      wb.push();
      wb.rotateZ(-a);
      wb.box('black', -0.003, 0.18, 0.011, 0.003, 0.27, 0.013, { ao: false, room, grime: false, tint: [0.45, 0.35, 0.25] });
      wb.pop();
    }
    // el hombre de en medio, abierto de brazos
    wb.box('black', -0.012, -0.1, 0.012, 0.012, 0.06, 0.014, { ao: false, room, grime: false, tint: [0.4, 0.3, 0.22] });
    wb.box('black', -0.08, 0.02, 0.012, 0.08, 0.035, 0.014, { ao: false, room, grime: false, tint: [0.4, 0.3, 0.22] });
    wb.geometry('black', new THREE.CircleGeometry(0.025, 8), M4().makeTranslation(0, 0.09, 0.013), { ao: false, room, grime: false, tint: [0.4, 0.3, 0.22] });
    for (const s of [-1, 1]) {
      wb.push();
      wb.translate(s * 0.03, -0.1, 0.012);
      wb.rotateZ(s * 0.3);
      wb.box('black', -0.006, -0.09, 0, 0.006, 0, 0.002, { ao: false, room, grime: false, tint: [0.4, 0.3, 0.22] });
      wb.pop();
    }
  });
}

// Una matula: el frasco de mirar la orina, de vientre redondo y cuello largo,
// con lo que tenga dentro (tint).
function matula(wb, x, y, z, s, tint, room) {
  const pts = [
    [0.001, 0],
    [0.045, 0.006],
    [0.065, 0.04],
    [0.066, 0.08],
    [0.045, 0.115],
    [0.018, 0.13],
    [0.016, 0.22],
    [0.024, 0.235],
  ].map(([r, h]) => new THREE.Vector2(r * s, h * s));
  wb.geometry('glass', new THREE.LatheGeometry(pts, 10), M4().makeTranslation(x, y, z), { ao: false, room, grime: false, tint: [0.75, 0.82, 0.78] });
  if (tint) wb.geometry('water', new THREE.SphereGeometry(0.058 * s, 8, 5, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), M4().makeTranslation(x, y + 0.058 * s, z), { ao: false, room, grime: false, tint });
}
// La gradilla de las matulas, en una mesa: cinco frascos, cada uno con su
// color (y uno vacío).
function gradillaMatulas(ctx, x, y, z, rot, room) {
  const wb = ctx.wb;
  const T = [
    [0.92, 0.8, 0.35],
    [0.85, 0.55, 0.15],
    [0.6, 0.18, 0.08],
    null,
    [0.25, 0.1, 0.06],
  ];
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -0.36, 0, -0.07, 0.36, 0.03, 0.07, { ao: false, room });
    wb.box('wooddark', -0.36, 0.1, -0.07, 0.36, 0.13, 0.07, { ao: false, room, faces: 'tnsewb' });
    for (const sx of [-0.36, 0.33]) wb.box('wooddark', sx, 0, -0.07, sx + 0.03, 0.13, 0.07, { ao: false, room });
    T.forEach((t, i) => matula(wb, -0.28 + i * 0.14, 0.03, 0, 1, t, room));
  });
}

// Un cráneo (de cara a +z local), limpio, con el agujero del trépano en lo
// alto de la frente (y, a veces, el anillo de bronce que el Físico pone para
// que no se cierre). Sobre una mesa o una balda, en y.
function craneo(wb, x, y, z, rot, room, o = {}) {
  wb.at(x, y, z, rot, () => {
    const g = (geo, mat, m, tint) => wb.geometry(mat, geo, m, { ao: false, room, grime: mat !== 'black', tint });
    g(new THREE.SphereGeometry(0.1, 9, 7), 'bone', M4().compose(V(0, 0.105, -0.01), Q(0, 0, 0), V(0.88, 0.95, 1.12)));
    for (const s of [-1, 1]) g(new THREE.BoxGeometry(0.034, 0.032, 0.012), 'black', M4().makeTranslation(s * 0.035, 0.1, 0.098));
    g(new THREE.BoxGeometry(0.018, 0.022, 0.012), 'black', M4().makeTranslation(0, 0.062, 0.1));
    g(new THREE.BoxGeometry(0.075, 0.04, 0.06), 'bone', M4().makeTranslation(0, 0.03, 0.06));
    if (o.hole !== false) {
      g(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 10), 'black', M4().compose(V(0, 0.186, 0.05), Q(0.6, 0, 0), V(1, 1, 1)));
      if (o.ring) g(new THREE.TorusGeometry(0.025, 0.004, 4, 12), 'bronzeAged', M4().compose(V(0, 0.188, 0.051), Q(0.6 + Math.PI / 2, 0, 0), V(1, 1, 1)));
    }
  });
}
// La balda de los cráneos (de cara a +z local), cada uno con su agujero, y,
// entre ellos, las rodelas de hueso que salieron (en un plato).
function estanteCraneos(ctx, x, y, z, rot, w, room, seed) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  wb.at(x, y, z, rot, () => {
    for (const sx of [-w / 2, w / 2 - 0.05]) wb.box('wooddark', sx, 0, -0.17, sx + 0.05, 1.95, 0.17, { ao: false, room });
    for (let i = 0; i < 4; i++) {
      const yy = 0.3 + i * 0.44;
      wb.box('wooddark', -w / 2 + 0.05, yy, -0.16, w / 2 - 0.05, yy + 0.03, 0.16, { ao: false, room, faces: 'tnsewb' });
      for (let u = -w / 2 + 0.2; u < w / 2 - 0.15; u += rng.range(0.24, 0.32)) {
        if (i === 0 && rng.chance(0.5)) {
          frasco(wb, u, yy + 0.03, 0, rng.range(0.9, 1.2), rng.pick(['sangre', 'adormidera']), room);
          continue;
        }
        craneo(wb, u, yy + 0.03, rng.range(-0.04, 0.02), rng.range(-0.35, 0.35), room, { ring: rng.chance(0.4) });
      }
    }
  });
  P.colOBB(ctx, x, z, w / 2, 0.18, rot, y, y + 1.95);
}

// El cuenco de las piedras: las que sacó de las cabezas (eso dice). Cada una
// envuelta en un papelito, atado, con un nombre escrito; tres, sin envolver.
function cuencoPiedras(ctx, x, y, z, room) {
  const wb = ctx.wb;
  const rng = new RNG(Math.round(x * 31 + z * 7));
  bowl(ctx, x, y, z, 0.17, room, null);
  for (let i = 0; i < 11; i++) {
    const a = rng.range(0, Math.PI * 2),
      r = rng.range(0, 0.1);
    const px = x + Math.cos(a) * r,
      pz = z + Math.sin(a) * r,
      py = y + 0.06 + rng.range(0, 0.04);
    if (i < 3) {
      wb.geometry('rock', new THREE.DodecahedronGeometry(0.022, 0), M4().compose(V(px, py, pz), Q(rng.range(0, 3), rng.range(0, 3), 0), V(1, 0.7, 1.2)), { ao: false, room, tint: [0.6, 0.58, 0.55] });
      continue;
    }
    wb.at(px, py, pz, rng.range(0, 3), () => {
      wb.box('clothWhite', -0.026, -0.012, -0.018, 0.026, 0.014, 0.018, { ao: false, room, grime: false, tint: PERGAMINO });
      wb.box('burlap', -0.027, -0.013, -0.003, 0.027, 0.015, 0.003, { ao: false, room, tint: [0.5, 0.36, 0.28] });
      wb.box('black', -0.016, 0.0145, -0.01, 0.012, 0.0148, -0.006, { ao: false, room, faces: 't', grime: false, tint: [0.3, 0.25, 0.2] });
    });
  }
  // (y uno, fuera del cuenco, desenvuelto: el papel abierto al lado)
  wb.box('clothWhite', x + 0.2, y, z - 0.06, x + 0.3, y + 0.003, z + 0.02, { ao: false, room, grime: false, tint: PERGAMINO, faces: 't' });
  wb.geometry('rock', new THREE.DodecahedronGeometry(0.02, 0), M4().makeTranslation(x + 0.25, y + 0.018, z - 0.02), { ao: false, room, tint: [0.6, 0.58, 0.55] });
}

// El alambique: el hornillo de ladrillo con su boca encendida, la olla de
// cobre, el capitel y el pico que baja al frasco donde gotea lo destilado.
function alambique(ctx, x, y, z, rot, room) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('wallstone', -0.3, 0, -0.3, 0.3, 0.62, 0.3, { ao: false, room, tint: [0.75, 0.55, 0.45] });
    wb.box('ember', -0.11, 0.08, 0.301, 0.11, 0.24, 0.302, { ao: false, room, grime: false, faces: 's' });
    wb.cylinder('bronze', 0, 0.62, 0, 0.2, 0.24, 0.3, 10, { ao: false, room, tint: [0.95, 0.55, 0.4], capBot: true });
    wb.geometry('bronze', new THREE.SphereGeometry(0.17, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M4().makeTranslation(0, 0.92, 0), { ao: false, room, tint: [0.95, 0.55, 0.4] });
    wb.cylinder('bronze', 0, 1.06, 0, 0.04, 0.03, 0.08, 6, { ao: false, room, tint: [0.95, 0.55, 0.4] });
    palo(wb, V(0, 1.1, 0), V(0.55, 0.62, 0.05), 0.014, 'bronze', { room, round: true, tint: [0.95, 0.55, 0.4] });
    // el frasco que recoge, en su taburetito
    wb.cylinder('wooddark', 0.62, 0, 0.05, 0.13, 0.13, 0.4, 6, { ao: false, room });
    matula(wb, 0.62, 0.4, 0.05, 1.4, [0.42, 0.3, 0.14], room);
  });
  if (ctx.lights) {
    const c = Math.cos(rot),
      s = Math.sin(rot);
    ctx.lights.push({ x: x + s * 0.5, y: y + 0.3, z: z + c * 0.5, r: 1, g: 0.45, b: 0.15, radius: 3, intensity: 0.7, room });
  }
  P.colOBB(ctx, x, z, 0.3, 0.3, rot, y, y + 1.1);
}

// Las esponjas soporíferas, puestas a secar en un cordel de pared a pared:
// empapadas de adormidera, de mandrágora y de beleño; de ellas duerme el que
// él va a curar.
function esponjas(ctx, x0, z0, x1, z1, y, room, seed) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  palo(wb, V(x0, y, z0), V(x1, y - 0.04, z1), 0.005, 'burlap', { room, round: true, tint: [0.7, 0.62, 0.5] });
  const n = Math.max(3, Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.45));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t,
      z = z0 + (z1 - z0) * t,
      yy = y - 0.04 * t;
    wb.box('burlap', x - 0.003, yy - 0.08, z - 0.003, x + 0.003, yy, z + 0.003, { ao: false, room, tint: [0.7, 0.62, 0.5] });
    wb.geometry('straw', new THREE.DodecahedronGeometry(0.07, 0), M4().compose(V(x, yy - 0.14, z), Q(rng.range(0, 3), rng.range(0, 3), rng.range(0, 3)), V(1, rng.range(0.8, 1.3), 0.8)), { ao: false, room, tint: rng.pick([[0.62, 0.5, 0.3], [0.5, 0.42, 0.26], [0.55, 0.38, 0.22]]) });
  }
}

// Lo de repuesto, colgado de las perchas del zaguán (de cara a +z local): el
// ropón encerado, el sombrero de ala ancha y otra máscara de pico, con sus
// ojos de vidrio, mirando a quien baje la escalera.
function perchas(ctx, x, y, z, rot, room) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    wb.box('wooddark', -0.8, 1.95, 0, 0.8, 2.07, 0.04, { ao: false, room });
    for (const u of [-0.55, 0, 0.55]) palo(wb, V(u, 2.0, 0.03), V(u, 2.05, 0.16), 0.012, 'iron', { room, round: true });
    // el ropón, colgado del primer gancho: largo hasta casi el suelo, con
    // sus pliegues y la cera que brilla
    for (let i = 0; i < 5; i++) {
      const u = -0.55 + (i - 2) * 0.09;
      const d = 0.08 + Math.abs(i - 2) * 0.025;
      wb.box('leather', u - 0.06, 0.25 + Math.abs(i - 2) * 0.04, d - 0.06, u + 0.06, 2.0, d + 0.02, { ao: false, room, tint: [0.2, 0.17, 0.14] });
    }
    // el sombrero, en el del medio
    wb.cylinder('leather', 0, 1.86, 0.17, 0.3, 0.3, 0.02, 14, { ao: false, room, tint: [0.16, 0.13, 0.11], capTop: true, capBot: true });
    wb.cylinder('leather', 0, 1.88, 0.17, 0.14, 0.15, 0.17, 12, { ao: false, room, tint: [0.16, 0.13, 0.11], capTop: true });
    // la máscara, en el último: la cara de cuero, el pico curvo y los ojos
    wb.push();
    wb.translate(0.55, 1.78, 0.14);
    wb.geometry('leather', new THREE.SphereGeometry(0.11, 10, 8), M4().makeScale(0.95, 1.1, 0.8), { ao: false, room, tint: [0.42, 0.3, 0.22] });
    wb.geometry('leather', new THREE.ConeGeometry(0.06, 0.32, 8), M4().compose(V(0, -0.08, 0.2), Q(Math.PI / 2 + 0.55, 0, 0), V(1, 1, 0.85)), { ao: false, room, tint: [0.42, 0.3, 0.22] });
    for (const s of [-1, 1]) {
      wb.geometry('glass', new THREE.CircleGeometry(0.03, 10), M4().makeTranslation(s * 0.045, 0.02, 0.09), { ao: false, room, grime: false, tint: [0.75, 0.35, 0.18] });
      wb.geometry('bronzeAged', new THREE.TorusGeometry(0.031, 0.006, 4, 12), M4().makeTranslation(s * 0.045, 0.02, 0.088), { ao: false, room });
    }
    wb.pop();
  });
}

// La serpiente enroscada en la vara (el rótulo del físico): en el marco del
// rótulo (x a lo largo de la palomilla, y arriba, z de canto). Y debajo, una
// matula de vidrio colgada.
function asclepio(wb) {
  palo(wb, V(-0.18, -0.06, 0), V(-0.18, -0.2, 0), 0.006, 'iron', { round: true });
  palo(wb, V(0.12, -0.06, 0), V(0.12, -0.2, 0), 0.006, 'iron', { round: true });
  palo(wb, V(-0.03, -0.2, 0), V(-0.03, -1.0, 0), 0.025, 'wooddark', { round: true });
  wb.box('iron', -0.2, -0.22, -0.01, 0.14, -0.19, 0.01, { ao: false });
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const a = t * Math.PI * 2 * 2.6;
    const r = 0.045 + Math.sin(t * Math.PI) * 0.02;
    pts.push(V(-0.03 + Math.cos(a) * r, -0.95 + t * 0.62, Math.sin(a) * r));
  }
  wb.geometry('gold', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.014, 5, false), M4(), { ao: false, tint: [0.85, 0.7, 0.4] });
  // la cabeza, asomada por encima de la vara, mirando a la calle
  wb.geometry('gold', new THREE.SphereGeometry(0.025, 6, 4), M4().compose(V(0.05, -0.3, 0.0), Q(0, 0, -0.3), V(1.5, 0.8, 0.9)), { ao: false, tint: [0.85, 0.7, 0.4] });
  palo(wb, V(0.28, -0.06, 0), V(0.28, -0.3, 0), 0.004, 'iron', { round: true });
  matula(wb, 0.28, -0.55, 0, 1.1, [0.85, 0.65, 0.25], undefined);
}

// ------------------------------------------------------------ la casa
export function casaInocentes(ctx, L, h) {
  const wb = ctx.wb;
  const y1 = 4.05,
    y2 = 7.25;
  // ---- la sala de visitas
  let r = 'ino_consulta';
  wb.setRoom(r);
  // la mesa de escribir, bajo la rueda de las orinas; su silla, contra la
  // pared; delante, la silla de sujetar, de cara a él
  P.table(ctx, 52.8, 0, 42.45, 1.8, 0.8, 0);
  P.stool(ctx, 52.8, 0, 41.55, { room: r });
  ruedaOrinas(ctx, 52.8, 2.05, 41.01, 0, r);
  pilaLibros(ctx, 51.95, 0.8, 42.3, 4, r, 2620);
  pilaLibros(ctx, 53.55, 0.8, 42.55, 2, r, 2621);
  craneo(wb, 53.25, 0.8, 42.2, -0.4, r, { ring: true });
  P.candles(ctx, 52.55, 0.8, 42.25, 2, 2603, { room: r, radius: 4.5, intensity: 0.6, spread: 0.06 });
  // (el tintero, la pluma y un papel a medio escribir)
  wb.cylinder('black', 52.95, 0.8, 42.6, 0.03, 0.035, 0.05, 6, { ao: false, room: r });
  palo(wb, V(52.95, 0.86, 42.6), V(53.1, 1.02, 42.5), 0.004, 'clothWhite', { room: r, tint: [0.9, 0.88, 0.8] });
  wb.box('clothWhite', 52.4, 0.8, 42.55, 52.75, 0.803, 42.8, { ao: false, room: r, grime: false, tint: PERGAMINO, faces: 't' });
  sillaSujecion(ctx, 52.8, 0, 43.75, Math.PI, r);
  // el atril, junto a la ventana: su Galeno abierto
  atril(ctx, 50.75, 0, 42.6, Math.PI / 2 + 0.3, r);
  // las matulas, en la mesita de la otra ventana, y la jofaina
  P.table(ctx, 50.75, 0, 47.4, 0.6, 1.1, 0);
  gradillaMatulas(ctx, 50.75, 0.8, 47.4, Math.PI / 2, r);
  palanganero(ctx, 51.9, 0, 48.0, r);
  // las librerías, contra el tabique del zaguán
  estanteLibros(ctx, 55.08, 0, 42.6, -Math.PI / 2, 1.8, r, 2622, { skull: true });
  estanteLibros(ctx, 55.08, 0, 47.85, -Math.PI / 2, 1.2, r, 2623);
  // las hierbas colgadas de las vigas
  for (let i = 0; i < 9; i++) herbBunch(ctx, 50.6 + (i % 3) * 1.6 + (i > 5 ? 0.5 : 0), 3.5, 44.6 + Math.floor(i / 3) * 0.9, 2630 + i, r, 0.25 + (i % 2) * 0.1);
  luna(ctx, 50.4, 1.6, 42.0, r, 0.25);
  wb.setRoom(null);
  // ---- el zaguán: el banco, el farol y las perchas con lo de repuesto
  r = 'ino0';
  wb.setRoom(r);
  P.bench(ctx, 57.6, 0, 48.2, 1.6, 0);
  perchas(ctx, 55.52, 0, 43.4, Math.PI / 2, r);
  P.lantern(ctx, 58.0, 2.4, 41.05, 0, true);
  ctx.lights.push({ x: 58.0, y: 2.2, z: 41.6, r: 1, g: 0.55, b: 0.22, radius: 4.5, intensity: 0.7, room: r });
  wb.setRoom(null);
  // ---- el quirófano
  r = 'ino_quir';
  wb.setRoom(r);
  const M = { x: 54.6, z: 37.6 };
  quirofanoMesa(ctx, M.x, 0, M.z, r);
  P.hangingLamp(ctx, M.x, 3.8, M.z, { room: r, len: 1.2, radius: 8, intensity: 1.5 });
  // el brasero de los cauterios, con los hierros metidos en las ascuas
  P.brazier(ctx, 57.4, 0, 38.9);
  for (let i = 0; i < 3; i++) palo(wb, V(57.3 + i * 0.08, 0.95, 38.8), V(57.8 + i * 0.12, 1.45, 38.3 + i * 0.1), 0.012, 'iron', { room: r, round: true });
  ctx.lights.push({ x: 57.4, y: 1.2, z: 38.9, r: 1, g: 0.35, b: 0.1, radius: 4, intensity: 0.9, room: r });
  // la mesa de los hierros (las sierras, los cuchillos, las tenazas, el
  // trépano) y su tabla en la pared
  P.table(ctx, 52.0, 0, 35.2, 1.6, 0.7, 0);
  const rng = new RNG(2604);
  for (let i = 0; i < 6; i++) {
    const px = 51.4 + i * 0.18;
    wb.box('iron', px - 0.02, 0.8, 35.0 + rng.range(-0.05, 0.1), px + 0.02, 0.815, 35.4 + rng.range(-0.05, 0.1), { ao: false, room: r });
  }
  trepano(wb, 52.55, 0.83, 35.35, r);
  tablaHierros(ctx, 52.0, 1.25, 34.47, 0, r, 2601);
  // los cubos de debajo de la mesa y la sangre del suelo
  P.barrel(ctx, 55.6, 0, 38.4, { r: 0.28 });
  P.decal(ctx, M.x, 0.02, M.z, 2.4);
  P.decal(ctx, 53.0, 0.02, 39.6, 1.2);
  // la balda de los cráneos y las coronas de repuesto, colgadas
  estanteCraneos(ctx, 59.3, 0, 34.7, 0, 2.0, r, 2605);
  for (let i = 0; i < 3; i++) corona(wb, 56.1 + i * 0.6, 2.2, 34.62, 1.0, r, { tilt: 0.1 * (i - 1) });
  for (let i = 0; i < 3; i++) lamina(ctx, 50.0, 2.0, 36.6 + i * 1.2, Math.PI / 2, r, 2606 + i);
  // la otra mesa: el último paciente, tapado con una sábana
  P.table(ctx, 51.0, 0, 39.3, 1.9, 0.8, 0);
  wb.setRoom(r);
  bakeCorpse(wb, 51.0, 0.8, 39.3, Math.PI / 2, 'back', 'villager', 26);
  wb.box('linen', 50.05, 0.95, 38.92, 51.95, 1.1, 39.68, { ao: false, room: r, grime: false, tint: [0.8, 0.76, 0.68] });
  wb.box('flesh', 50.6, 1.101, 39.0, 51.2, 1.105, 39.5, { ao: false, room: r, faces: 't', tint: [0.42, 0.1, 0.08], grime: false });
  wb.setRoom(null);
  // ---- arriba: la alcoba del Físico
  r = 'ino_alcoba';
  wb.setRoom(r);
  // la cama, de fraile (recta, hecha, sin una arruga), el arca a los pies
  P.bed(ctx, 53.9, y1, 47.85, 0);
  chest(ctx, 51.45, y1, 48.1, 0, r, 0.9);
  palanganero(ctx, 50.55, y1, 46.6, r);
  // la mesa de escribir, contra el tabique de la botica: sus libros, sus
  // papeles, la vela; y el taburete de cara a la ventana de la cortina
  P.table(ctx, 52.4, y1, 41.6, 1.6, 0.8, 0);
  P.stool(ctx, 52.4, y1, 42.45, { room: r });
  pilaLibros(ctx, 51.85, y1 + 0.8, 41.45, 3, r, 2624);
  pilaLibros(ctx, 53.0, y1 + 0.8, 41.4, 5, r, 2625);
  wb.cylinder('black', 52.2, y1 + 0.8, 41.35, 0.03, 0.035, 0.05, 6, { ao: false, room: r });
  P.candles(ctx, 52.65, y1 + 0.8, 41.35, 2, 2608, { room: r, radius: 4, intensity: 0.6, spread: 0.08 });
  P.stool(ctx, 51.0, y1, 44.0, { room: r });
  pilaLibros(ctx, 54.6, y1, 41.5, 6, r, 2626);
  // la cortina de la ventana (por dentro)
  cortina(ctx, 50.0, y1, 44.0, r);
  wb.setRoom(null);
  // ---- la botica
  r = 'ino_botica';
  wb.setRoom(r);
  estanteFrascos(ctx, 52.6, y1, 34.65, 0, 2.6, r, 2609);
  estanteFrascos(ctx, 50.15, y1, 37.6, Math.PI / 2, 2.2, r, 2610);
  P.table(ctx, 53.0, y1, 38.4, 1.6, 0.8, 0);
  // (en la mesa, el cuenco de las piedras, el almirez, un brazo abierto y
  // clavado a la tabla, los papeles)
  cuencoPiedras(ctx, 52.5, y1 + 0.8, 38.35, r);
  wb.cylinder('bronzeAged', 53.65, y1 + 0.8, 38.55, 0.07, 0.09, 0.12, 8, { ao: false, room: r, capBot: true });
  palo(wb, V(53.65, y1 + 0.85, 38.55), V(53.72, y1 + 1.05, 38.5), 0.012, 'bronzeAged', { room: r, round: true });
  wb.box('flesh', 52.95, y1 + 0.8, 38.62, 53.5, y1 + 0.86, 38.74, { ao: false, room: r, tint: [0.62, 0.42, 0.36] });
  alambique(ctx, 54.55, y1, 40.2, Math.PI, r);
  esponjas(ctx, 50.3, 36.2, 55.2, 36.2, y1 + 2.5, r, 2627);
  for (let i = 0; i < 4; i++) lamina(ctx, 50.6 + i * 1.0, y1 + 2.0, 40.75, Math.PI, r, 2611 + i);
  for (let i = 0; i < 5; i++) herbBunch(ctx, 51.0 + i * 0.8, y1 + 2.7, 39.6, 2640 + i, r, 0.3);
  P.candles(ctx, 52.6, y1 + 0.8, 38.6, 3, 2615, { room: r, radius: 4.5, intensity: 0.7, spread: 0.15 });
  wb.setRoom(null);
  // ---- la sala de los inocentes
  r = 'ino_sala';
  wb.setRoom(r);
  camastro(ctx, 57.0, y1, 35.4, 0, r);
  camastro(ctx, 59.4, y1, 37.5, Math.PI / 2, r);
  camastro(ctx, 56.6, y1, 39.8, 0, r, { blood: false });
  // las argollas y las cadenas de la pared (las de los furiosos)
  for (const [x, z] of [
    [55.6, 35.2],
    [55.6, 36.0],
    [60.35, 39.4],
    [60.35, 40.2],
  ]) {
    wb.box('iron', x - 0.05, y1 + 1.45, z - 0.05, x + 0.05, y1 + 1.55, z + 0.05, { ao: false, room: r });
    P.chains(ctx, x, y1 + 1.45, z, 12, 0);
  }
  // (el cubo de los camastros, en el rincón: no delante de la puerta de la
  // botica)
  P.barrel(ctx, 60.1, y1, 35.0, { r: 0.25 });
  luna(ctx, 58.5, y1 + 1.6, 34.7, r, 0.35);
  wb.setRoom(null);
  // ---- el rellano
  r = 'ino1';
  wb.setRoom(r);
  P.candles(ctx, 58.0, y1, 48.2, 3, 2616, { room: r, radius: 4, intensity: 0.55 });
  wb.setRoom(null);
  // ---- el desván: lo que les quitó a todos, las coronas a medio hacer
  r = 'ino2';
  wb.setRoom(r);
  const rd = new RNG(2617);
  // (los montones de ropa y de zapatos, a lo largo, junto a los aleros)
  for (let i = 0; i < 7; i++) {
    const zz = 35.5 + i * 1.7;
    const xx = rd.chance(0.5) ? 53.2 : 57.3;
    wb.geometry('burlap', new THREE.DodecahedronGeometry(0.55, 0), M4().compose(V(xx, y2 + 0.15, zz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rd.range(0, 3), 0)), V(1.3, 0.5, 1.0)), { ao: false, room: r, tint: rd.pick([[0.5, 0.4, 0.3], [0.35, 0.3, 0.3], [0.55, 0.3, 0.25]]) });
    for (let k = 0; k < 3; k++) botas(ctx, xx + rd.range(-0.6, 0.6), y2, zz + rd.range(0.5, 0.9), rd.range(0, 6), r, { tall: rd.chance(0.5), lying: rd.chance(0.5) });
  }
  // el banco de las coronas
  P.table(ctx, 55.25, y2, 36.3, 1.6, 0.7, 0);
  for (let i = 0; i < 3; i++) corona(wb, 54.75 + i * 0.5, y2 + 0.8, 36.3, 1.0, r, { rods: 4 + i });
  P.hangingLamp(ctx, 55.25, 9.35, 36.6, { room: r, len: 0.6, radius: 5.5, intensity: 0.75 });
  // la luz de la luna por la claraboya
  luna(ctx, 57.2, y2 + 1.4, 40.9, r, 0.9, 5);
  if (ctx.shafts) ctx.shafts.push({ a: [57.2, 9.6, 40.9], b: [56.6, y2 + 0.05, 41.1], w: 1.0, color: 0x9fb2d8 });
  wb.setRoom(null);
  claraboya(ctx);
  // el rótulo del físico, junto a la puerta de la calle
  rotulo(ctx, 'w', 49.5, 3.2, 46.35, asclepio, { len: 0.85 });
  L.interact.push(
    // el tratado (la primera parte, en la botica; la de la corona, en el
    // desván) y la historia clínica del que no se arrodilló, en su mesa
    { kind: 'note', id: 'n_tratado1', note: 'tratado1', x: 53.45, y: y1 + 0.82, z: 38.2, model: 'paper' },
    { kind: 'note', id: 'n_tratado2', note: 'tratado2', x: 55.8, y: y2 + 0.82, z: 36.1, model: 'paper' },
    { kind: 'note', id: 'n_historia', note: 'historia', x: 52.45, y: y1 + 0.82, z: 41.75, model: 'paper' }
  );
  void h;
}

// Un dibujo de anatomía clavado en la pared (el papel y lo que se adivina:
// un cuerpo abierto en canal, de carbón).
function lamina(ctx, x, y, z, rot, room, seed) {
  const wb = ctx.wb;
  const rng = new RNG(seed);
  wb.at(x, y, z, rot, () => {
    wb.box('linen', -0.3, -0.42, 0, 0.3, 0.42, 0.006, { ao: false, room, grime: false, faces: 's', tint: [0.86, 0.8, 0.66] });
    // la silueta y las líneas
    wb.box('black', -0.05, -0.3, 0.007, 0.05, 0.2, 0.008, { ao: false, room, grime: false, faces: 's', tint: [0.4, 0.38, 0.36] });
    wb.box('black', -0.04, 0.2, 0.007, 0.04, 0.3, 0.008, { ao: false, room, grime: false, faces: 's', tint: [0.4, 0.38, 0.36] });
    for (let i = 0; i < 5; i++) {
      const yy = rng.range(-0.3, 0.25);
      wb.box('black', rng.range(0.06, 0.12), yy, 0.007, rng.range(0.15, 0.26), yy + 0.006, 0.008, { ao: false, room, grime: false, faces: 's', tint: [0.4, 0.38, 0.36] });
    }
    wb.box('flesh', -0.03, -0.12, 0.007, 0.03, 0.08, 0.009, { ao: false, room, grime: false, faces: 's', tint: [0.5, 0.18, 0.15] });
    wb.box('iron', -0.012, 0.38, 0.006, 0.012, 0.41, 0.02, { ao: false, room });
  });
}

// Una corona de hierro de las de los Coronados: el aro, las varillas, sus
// cascabeles; colgada de un clavo, o puesta en un banco (rot).
export function corona(wb, x, y, z, s, room, o = {}) {
  wb.push();
  wb.translate(x, y, z);
  if (o.tilt) wb.rotateZ(o.tilt);
  wb.geometry('iron', new THREE.TorusGeometry(0.11 * s, 0.012 * s, 4, 12), M4().makeRotationX(Math.PI / 2), { ao: false, room });
  const n = o.rods ?? 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const p = V(Math.cos(a) * 0.11 * s, 0, Math.sin(a) * 0.11 * s);
    const q = V(Math.cos(a) * 0.17 * s, 0.22 * s, Math.sin(a) * 0.17 * s);
    palo(wb, p, q, 0.008 * s, 'iron', { room });
    wb.geometry('bronze', new THREE.SphereGeometry(0.022 * s, 6, 4), M4().makeTranslation(q.x, q.y - 0.03 * s, q.z), { ao: false, room });
  }
  wb.pop();
}

// La camilla del Físico: las varas, la lona manchada, las correas, las dos
// ruedas de atrás (la lleva él solo, tirando de las varas).
export function camilla(ctx, x, y, z, rot, room) {
  const wb = ctx.wb;
  wb.at(x, y, z, rot, () => {
    for (const sz of [-0.35, 0.35]) palo(wb, V(-1.25, 0.55, sz), V(1.35, 0.55, sz), 0.035, 'wooddark', { room, round: true });
    wb.box('burlap', -0.95, 0.5, -0.33, 0.95, 0.56, 0.33, { ao: false, room, tint: [0.55, 0.45, 0.36] });
    wb.box('flesh', -0.4, 0.561, -0.2, 0.3, 0.565, 0.15, { ao: false, room, faces: 't', tint: [0.4, 0.1, 0.08], grime: false });
    for (const sx of [-0.6, 0.0, 0.6]) wb.box('leather', sx - 0.04, 0.45, -0.37, sx + 0.04, 0.6, 0.37, { ao: false, room, tint: [0.3, 0.2, 0.14] });
    for (const sz of [-0.42, 0.42]) {
      wb.push();
      wb.translate(-0.8, 0.3, sz);
      wb.rotateX(Math.PI / 2);
      wb.cylinder('wooddark', 0, -0.03, 0, 0.3, 0.3, 0.06, 10, { ao: false, room, capTop: true, capBot: true });
      wb.pop();
    }
    palo(wb, V(-0.8, 0.3, -0.42), V(-0.8, 0.3, 0.42), 0.02, 'iron', { room, round: true });
    // las patas de delante
    for (const sz of [-0.35, 0.35]) palo(wb, V(0.9, 0.55, sz), V(0.95, 0, sz), 0.03, 'wooddark', { room });
  });
  P.colOBB(ctx, x, z, 1.3, 0.45, rot, y, y + 0.6);
}

// La mesa del quirófano: el tablero con la canaleta de la sangre, el
// reposacabezas, las tres correas (las muñecas y el pecho), el cubo debajo.
// (en ella despierta uno si le atrapan: game/fisico.js)
function quirofanoMesa(ctx, x, y, z, room) {
  const wb = ctx.wb;
  wb.box('wooddark', x - 1.05, y + 0.82, z - 0.42, x + 1.05, y + 0.92, z + 0.42, { ao: false, room, faces: 'tnsewb' });
  wb.box('black', x - 1.0, y + 0.921, z - 0.03, x + 0.95, y + 0.925, z + 0.03, { ao: false, room, faces: 't', grime: false });
  for (const [sx, sz] of [
    [-0.95, -0.36],
    [0.95, -0.36],
    [-0.95, 0.36],
    [0.95, 0.36],
  ])
    wb.box('wooddark', x + sx - 0.06, y, z + sz - 0.06, x + sx + 0.06, y + 0.82, z + sz + 0.06, { ao: false, room });
  wb.box('wooddark', x - 0.9, y + 0.2, z - 0.36, x + 0.9, y + 0.26, z + 0.36, { ao: false, room, faces: 'tnsewb' });
  // el reposacabezas (al oeste) y las correas abiertas, colgando
  wb.box('leather', x - 1.0, y + 0.92, z - 0.15, x - 0.78, y + 1.02, z + 0.15, { ao: false, room, tint: [0.35, 0.2, 0.14] });
  for (const sx of [-0.35, 0.15, 0.6])
    for (const sz of [-0.44, 0.44]) {
      wb.box('leather', x + sx - 0.04, y + 0.55, z + sz - 0.02, x + sx + 0.04, y + 0.92, z + sz + 0.02, { ao: false, room, tint: [0.3, 0.18, 0.12] });
      wb.box('iron', x + sx - 0.05, y + 0.58, z + sz - 0.025, x + sx + 0.05, y + 0.64, z + sz + 0.025, { ao: false, room });
    }
  wb.box('flesh', x - 0.6, y + 0.926, z - 0.3, x + 0.4, y + 0.93, z + 0.25, { ao: false, room, faces: 't', tint: [0.32, 0.07, 0.06], grime: false });
  P.barrel(ctx, x + 0.3, y, z + 0.05, { r: 0.22 });
  P.colOBB(ctx, x, z, 1.08, 0.46, 0, y, y + 0.95);
}

// La cortina de la ventana de la alcoba: dos paños de lino, uno corrido y el
// otro recogido (el que él aparta para mirar: game/fisico.js lo mueve en la
// cinemática del principio; éste es el que se queda).
function cortina(ctx, x, y, z, room) {
  const wb = ctx.wb;
  palo(wb, V(x + 0.05, y + 2.55, z - 0.7), V(x + 0.05, y + 2.55, z + 0.7), 0.015, 'iron', { room, round: true });
  for (let i = 0; i < 6; i++) {
    const zz = z - 0.6 + i * 0.1;
    wb.box('linen', x + 0.04 + (i % 2) * 0.03, y + 0.75, zz - 0.05, x + 0.06 + (i % 2) * 0.03, y + 2.55, zz + 0.05, { ao: false, room, grime: false, tint: [0.78, 0.72, 0.62] });
  }
  wb.box('linen', x + 0.04, y + 0.9, z + 0.42, x + 0.16, y + 2.55, z + 0.62, { ao: false, room, grime: false, tint: [0.72, 0.66, 0.56] });
}

// La claraboya del desván: el cerco de madera en el faldón del este, la tapa
// (de vidrio emplomado, apuntalada abierta) y la luz de dentro.
function claraboya(ctx) {
  const wb = ctx.wb;
  const C = { x0: 56.6, z0: 40.3, x1: 57.8, z1: 41.5 };
  const slope = 3 / 5.75;
  const Y = (x) => 10.4 - (x - 55.25) * slope;
  // el cerco: cuatro tablas de canto sobre las tejas
  palo(wb, V(C.x0, Y(C.x0) + 0.08, C.z0), V(C.x0, Y(C.x0) + 0.08, C.z1), 0.05, 'timber');
  palo(wb, V(C.x1, Y(C.x1) + 0.08, C.z0), V(C.x1, Y(C.x1) + 0.08, C.z1), 0.05, 'timber');
  palo(wb, V(C.x0, Y(C.x0) + 0.08, C.z0), V(C.x1, Y(C.x1) + 0.08, C.z0), 0.05, 'timber');
  palo(wb, V(C.x0, Y(C.x0) + 0.08, C.z1), V(C.x1, Y(C.x1) + 0.08, C.z1), 0.05, 'timber');
  // la tapa, levantada sobre su gozne (el lado de arriba) y el puntal
  wb.push();
  wb.translate(C.x0, Y(C.x0) + 0.12, (C.z0 + C.z1) / 2);
  wb.rotateZ(1.15);
  wb.box('wooddark', 0, -0.03, -0.62, 1.25, 0.03, 0.62, { ao: false, faces: 'tnsewb' });
  wb.box('glass', 0.08, 0.031, -0.52, 1.15, 0.035, 0.52, { ao: false, grime: false, tint: [0.6, 0.65, 0.55] });
  wb.pop();
  palo(wb, V(C.x1 - 0.1, Y(C.x1 - 0.1) + 0.1, (C.z0 + C.z1) / 2), V(C.x0 + 0.45, Y(C.x0) + 1.0, (C.z0 + C.z1) / 2), 0.025, 'wooddark', { round: true });
  // (desde fuera, la luz del farol del desván por el hueco)
  ctx.lights.push({ x: (C.x0 + C.x1) / 2, y: Y(57.2) + 0.6, z: (C.z0 + C.z1) / 2, r: 1, g: 0.55, b: 0.22, radius: 2.6, intensity: 0.7 });
  if (ctx.fires) ctx.fires.push({ x: (C.x0 + C.x1) / 2, y: Y(57.2) - 0.4, z: (C.z0 + C.z1) / 2, s: 0.5, light: false, embers: false, glow: true });
}

// ------------------------------------------------------------ el patio
// El patio de atrás: la tapia del callejón con su portón (atrancado por
// dentro), la leñera contra la capilla, el pozo, el pozo de la cal viva (la
// de los muertos de la peste), la camilla, las jaulas de los furiosos, las
// sábanas tendidas.
export function patioInocentes(ctx, S, L) {
  const wb = ctx.wb;
  // la tapia del callejón, con el portón
  tapia(ctx, 49.5, 22, 49.9, 34, 3.4, { holes: [{ a0: 27.0, a1: 29.2, y0: 0, y1: 3.4 }] });
  wb.box('ashlar', 49.4, 2.6, 26.8, 50.0, 3.0, 29.4, { ao: false, sub: 2 });
  L.interact.push({ kind: 'door', id: 'd_patio_inocentes', x: 49.7, y: 0, z: 28.1, w: 2.2, h: 2.6, axis: 'z', mat: 'planks', double: true, swing: 1, plane: 49.9, inset: 0.06, mark: 'cross', lock: { type: 'barred', side: 1 }, barredMsg: 'patioTranca' });
  // la leñera, contra el muro de la capilla
  P.leanTo(ctx, 50.2, 22, 55.2, 24.2, 'n', 3.1, 2.3);
  P.firewood(ctx, 51.4, 0, 22.7, 0, 4);
  P.firewood(ctx, 53.4, 0, 22.7, 0, 3);
  // el pozo, el pozo de la cal (blanco, con su borde), la camilla
  P.well(ctx, 58.8, 0, 24.8, {});
  wb.box('ashlar', 52.2, 0, 29.0, 55.2, 0.35, 29.25, { ao: false, sub: 2 });
  wb.box('ashlar', 52.2, 0, 31.25, 55.2, 0.35, 31.5, { ao: false, sub: 2 });
  wb.box('ashlar', 52.2, 0, 29.25, 52.45, 0.35, 31.25, { ao: false, sub: 2 });
  wb.box('ashlar', 54.95, 0, 29.25, 55.2, 0.35, 31.25, { ao: false, sub: 2 });
  wb.box('plaster', 52.45, 0.2, 29.25, 54.95, 0.22, 31.25, { ao: false, faces: 't', tint: [1.1, 1.08, 1.02] });
  ctx.col.add(52.2, 0, 29.0, 55.2, 0.35, 31.5);
  camilla(ctx, 57.6, 0, 32.4, 0.15, 'out');
  // las jaulas (en una, lo que queda de alguien)
  for (const [x, z] of [
    [59.9, 28.6],
    [59.9, 30.4],
  ])
    jaula(ctx, x, 0, z, 0.9, 1.6);
  wb.setRoom(null);
  bakeCorpse(wb, 59.9, 0.06, 30.4, 1.4, 'curl', 'villager', 27);
  // las sábanas tendidas, con sus manchas
  P.laundry(ctx, 50.0, 26.2, 50.0, 33.6, 2.8, 2618);
  P.barrel(ctx, 56.5, 0, 33.4);
  P.barrel(ctx, 57.3, 0, 33.55, { lying: true, rot: 0.4 });
  P.decal(ctx, 56.4, 0.02, 31.6, 1.6);
  P.decal(ctx, 54.6, 0.02, 33.2, 1.2);
  P.lantern(ctx, 54.5, 2.8, 34.0, Math.PI, true);
  ctx.lights.push({ x: 54.5, y: 2.6, z: 33.4, r: 1, g: 0.55, b: 0.22, radius: 6, intensity: 0.8 });
  // ---- el callejón de la capilla: la barricada de la plazuela (apuntalada
  // por el lado del callejón), los trastos, la ventanita de la capilla
  L.interact.push({ kind: 'door', id: 'd_callejon', x: 47.75, y: 0, z: 38.45, w: 3.5, h: 2.6, axis: 'x', lock: { type: 'boards', side: -1, front: 'callejonFrente', msg: 'callejonCae', shut: 'callejonPuntales' }, mat: 'barricade', hinge: 0 });
  P.barrel(ctx, 46.6, 0, 33.0);
  P.crate(ctx, 48.8, 0, 31.4, 0.8, 0.3);
  P.cart(ctx, 47.7, 0, 24.6, 1.5, { brokenWheel: true });
  // la ventanita enrejada de la capilla, al fondo, con la luz de su altar
  wb.box('black', 47.3, 2.2, 21.96, 48.2, 3.1, 21.97, { ao: false, grime: false, faces: 's' });
  for (let i = 0; i < 5; i++) wb.box('iron', 47.35 + i * 0.2, 2.2, 21.97, 47.38 + i * 0.2, 3.1, 22.0, { ao: false });
  wb.box('ember', 47.6, 2.3, 21.955, 47.9, 2.5, 21.96, { ao: false, grime: false, faces: 's' });
  ctx.lights.push({ x: 47.75, y: 2.6, z: 22.5, r: 1, g: 0.6, b: 0.3, radius: 3, intensity: 0.5 });
}

// Una jaula de hierro (de las de colgar, puesta en el suelo).
function jaula(ctx, x, y, z, r, h) {
  const wb = ctx.wb;
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    wb.box('iron', x + Math.cos(a) * r - 0.015, y, z + Math.sin(a) * r - 0.015, x + Math.cos(a) * r + 0.015, y + h, z + Math.sin(a) * r + 0.015, { ao: false });
  }
  wb.cylinder('iron', x, y + 0.04, z, r, r, 0.04, n, { ao: false });
  wb.cylinder('iron', x, y + h, z, r, r * 0.3, 0.3, n, { ao: false });
  ctx.col.add(x - r, y, z - r, x + r, y + h, z + r);
}

export { cruzCal, V };
