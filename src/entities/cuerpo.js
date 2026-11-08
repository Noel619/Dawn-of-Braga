// El Condenado sin armadura: lo que queda debajo cuando se lo quita todo.
//
// Un hombre de armas de la guarnición, de unos treinta años: ancho de hombros
// y de brazos, pero chupado de tres noches a pan y agua en la celda (la
// tripa hundida, las costillas, los pómulos). El pelo oscuro, revuelto y sin
// cortar, la barba de varios días; las bragas de lino atadas a la cintura con
// su cordón, como se llevaban debajo de todo, y descalzo. Las yemas de los
// dedos, en carne viva: se arrancó las uñas escribiendo NO TE ARRODILLES por
// las paredes de su celda.
//
// Va en el mismo esqueleto que el jugador (models.js, playerDef: el de
// humanoidJoints(1)), esculpido como los ecos y el Desfigurado (sculpt.js,
// figure.js), y partido en zonas: cada pieza de armadura (armaduras.js) dice
// qué zonas tapa, y lo que tapa no se pone. Las zonas:
//   cabeza      el pelo (lo que no cabe bajo un yelmo o una capucha)
//   cara        la cabeza entera (la piel), los ojos, las cejas y la barba:
//               se ve siempre por la abertura del yelmo (el protagonista va
//               con la cara descubierta: PLAN_LORE.md, §3.5)
//   cuello      el cuello
//   torso       el tronco, de la cintura al cuello
//   brazos      del hombro al codo
//   antebrazos  del codo a la muñeca
//   manos       las manos (y las yemas)
//   cadera      las bragas, con su cordón
//   muslos      los perniles de las bragas y la rodilla
//   piernas     las espinillas y las pantorrillas
//   pies        los pies descalzos
// Unidades en metros; la cara hacia +z; +x, su izquierda.
import * as THREE from 'three';
import { MAT_DEFS } from '../gfx/materials.js';
import { tube, merge, place, gSph, gBox, head, table, mix, sstep, folds } from './sculpt.js';
import { torso, legs } from './figure.js';

export const ZONAS = ['cabeza', 'cara', 'cuello', 'torso', 'brazos', 'antebrazos', 'manos', 'cadera', 'muslos', 'piernas', 'pies'];

const V3 = THREE.Vector3;
const TAU = Math.PI * 2;

// UV en metros por caras (como el Desfigurado y el Físico): la textura tiene
// el mismo tamaño en todas las piezas, sean de la forma que sean
export function boxUV(g) {
  const h = g.index ? g.toNonIndexed() : g;
  const p = h.attributes.position;
  const uv = new Float32Array(p.count * 2);
  const a = new V3(),
    b = new V3(),
    c = new V3(),
    n = new V3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    n.subVectors(c, b).cross(new V3().subVectors(a, b));
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
const UVK = (mat) => (MAT_DEFS[mat]?.uv ?? 1) * 1.6;
// una pieza esculpida del rig (con sus UV en metros); PD, de dos caras
export const P = (j, mat, geo, o = {}) => ({ j, type: 'geo', geo: boxUV(geo), mat, uvk: UVK(mat), ...o });
export const PD = (j, mat, geo, o = {}) => P(j, mat, geo, { ds: true, ...o });

// Parte una geometría por sus triángulos: [los que no cumplen f (en su
// centro), los que sí]
export function partir(g, f) {
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

// ------------------------------------------------------------ la cabeza
// La de un hombre de treinta años con hambre atrasada: la nariz recta y algo
// grande, las cejas marcadas, las cuencas hondas, los pómulos y la quijada
// cuadrada; las orejas pegadas.
export const CARA = { w: 1.0, h: 1.0, d: 1.0, nose: 0.028, noseW: 1.08, brow: 0.011, socket: 0.014, cheek: 0.008, gaunt: 0.007, jaw: 0.98, chin: 0.009, mouth: 0.004, lips: 0.0026, ears: 0.017 };
// (la barbilla, a y0 sobre la articulación; la cabeza llega a 0.241)
const Y0 = -0.012;
// el centro de la cabeza (para empujar el pelo y la barba hacia fuera)
const CC = [0, 0.118, -0.006];
// Lo que se aparta de la piel el pelo: por encima de la raya que va de la
// frente (0,19) a la sien, por encima de la oreja y hasta la nuca (0,05),
// revuelto (más en la coronilla y la nuca, a mechones)
function gruesoPelo(x, y, z) {
  const t = Math.atan2(x, z);
  const at = Math.abs(t);
  // la raya del pelo, alrededor (de delante a la nuca)
  const raya = table(
    [
      [0, 0.188],
      [0.55, 0.184],
      [0.95, 0.162],
      [1.35, 0.158],
      [1.7, 0.16],
      [2.15, 0.1],
      [2.6, 0.062],
      [3.15, 0.05],
    ],
    at
  )[0];
  const k = sstep(raya - 0.006, raya + 0.012, y);
  if (k <= 0) return 0;
  // el grueso: más en la coronilla y detrás; mechones (algo de ruido alrededor
  // y de arriba abajo)
  const mech = 0.75 + 0.25 * Math.sin(t * 9 + y * 40) * Math.sin(t * 5.3 - y * 23 + 1.1);
  const grueso = 0.008 + 0.006 * sstep(0.12, 0.23, y) + 0.004 * sstep(1.2, 2.6, at);
  return k * grueso * mech;
}
// La barba de días: de patilla a patilla por la quijada, la barbilla y el
// bigote (sin las mejillas de arriba)
function gruesoBarba(x, y, z) {
  const t = Math.atan2(x, z);
  const at = Math.abs(t);
  if (at > 1.75) return 0;
  // la raya de arriba: de la patilla (0,125, delante de la oreja) baja por la
  // mejilla (0,07) y sube al bigote (0,082) bajo la nariz
  const top = table(
    [
      [0, 0.083],
      [0.22, 0.078],
      [0.42, 0.064],
      [0.75, 0.072],
      [1.15, 0.1],
      [1.45, 0.126],
      [1.75, 0.14],
    ],
    at
  )[0];
  const k = sstep(top + 0.006, top - 0.008, y) * sstep(1.75, 1.5, at);
  // la boca, sin barba (los labios)
  const boca = Math.exp(-((x / 0.022) ** 4)) * Math.exp(-(((y - (0.072 + Y0)) / 0.0085) ** 2)) * sstep(0.03, 0.06, z);
  return k * (1 - boca) * 0.0036;
}
// Empuja hacia fuera una copia de la cabeza donde f diga (en metros) y se
// queda con los triángulos que han salido (la mitad del grueso, al menos)
function capa(geo, f) {
  const g = geo.clone();
  const pos = g.attributes.position;
  const v = new V3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = f(v.x, v.y, v.z);
    if (k <= 0) continue;
    const dx = v.x - CC[0],
      dy = (v.y - CC[1]) * 0.8,
      dz = v.z - CC[2];
    const r = Math.hypot(dx, dy, dz) || 1;
    pos.setXYZ(i, v.x + (dx / r) * k, v.y + (dy / r) * k, v.z + (dz / r) * k);
  }
  g.computeVertexNormals();
  const [, dentro] = partir(g, (x, y, z) => f(x, y, z) > 0.0018);
  return dentro;
}
// la cabeza: la piel entera (sin pelo: con el yelmo puesto no asoma nada),
// y aparte el pelo y la barba
function cabeza() {
  const piel = head({ ...CARA, y0: Y0, nu: 40, nv: 30 });
  return { piel, pelo: capa(piel, gruesoPelo), barba: capa(piel, gruesoBarba) };
}
// el punto de la piel que más sale hacia delante cerca de (x, y)
function frente(geo, x, y, r = 0.008) {
  const p = geo.attributes.position;
  let z = -1;
  for (let i = 0; i < p.count; i++) if (Math.abs(p.getX(i) - x) < r && Math.abs(p.getY(i) - y) < r) z = Math.max(z, p.getZ(i));
  return z > -1 ? z : 0.085;
}

// ------------------------------------------------------------ las manos
// Una mano (como sculpt.hand: la muñeca en la articulación, los dedos hacia
// -y, la palma hacia dentro, el pulgar hacia +z) con la última falange de
// cada dedo aparte: las yemas, sin uñas y en carne viva.
export function mano(o = {}) {
  const sx = o.side ?? 1;
  const curl = o.curl ?? 0.5,
    spread = o.spread ?? 0.25,
    L = o.len ?? 1,
    th = o.thick ?? 1,
    W = o.wide ?? 1;
  const Z = new V3(0, 0, 1);
  const carne = [],
    yemas = [];
  // la palma, de la muñeca a los nudillos
  carne.push(
    tube(
      [
        [0, 0.008, 0],
        [-sx * 0.004, -0.045, 0.003],
        [-sx * 0.006, -0.09, 0.002],
      ],
      (s) => [mix(0.031, 0.045, sstep(0, 0.6, s)) * W, mix(0.018, 0.015, s) * th],
      { up: [1, 0, 0], n: 5, seg: 8, caps: true }
    )
  );
  // los nudillos
  carne.push(place(gSph(1, [0, 0, 0], [0.01, 0.009, 0.044 * W], 8, 4), [-sx * 0.009, -0.088, 0.002]));
  // los dedos: del índice (+z) al meñique
  const F = [
    [0.03, 1.0, 0.0108],
    [0.01, 1.08, 0.0114],
    [-0.01, 1.0, 0.0108],
    [-0.029, 0.82, 0.0098],
  ];
  F.forEach(([z0, l, r], fi) => {
    const fan = (fi - 1.5) * spread * 0.12;
    const segs = [0.045 * l * L, 0.03 * l * L, 0.024 * l * L];
    let p = new V3(-sx * 0.006, -0.09, z0 * W);
    const dir = new V3(0, -1, fan).normalize();
    const pts = [[p.x, p.y, p.z]];
    const bend = [0.35 + curl * 1.05, 0.25 + curl * 1.25, 0.2 + curl * 0.9];
    for (let s = 0; s < 3; s++) {
      dir.applyAxisAngle(Z, -sx * bend[s] * 0.5);
      p = p.clone().add(dir.clone().multiplyScalar(segs[s]));
      pts.push([p.x, p.y, p.z]);
    }
    carne.push(tube(pts.slice(0, 3), (s) => r * mix(1, 0.84, s) * th, { n: 4, seg: 6, caps: true, capL: 0.004, up: [1, 0, 0] }));
    yemas.push(tube(pts.slice(2), (s) => r * mix(0.84, 0.74, s) * th, { n: 2, seg: 6, caps: true, capL: 0.006, up: [1, 0, 0] }));
  });
  // el pulgar
  {
    const tO = o.thumb ?? 0.5;
    const pts = [
      [-sx * 0.012, -0.02, 0.03 * W],
      [-sx * (0.024 + 0.008 * tO), -0.05, (0.05 + 0.012 * tO) * W],
      [-sx * (0.03 + 0.012 * tO + curl * 0.012), -0.08, (0.058 + 0.008 * tO - curl * 0.018) * W],
    ];
    const m = [mix(pts[1][0], pts[2][0], 0.45), mix(pts[1][1], pts[2][1], 0.45), mix(pts[1][2], pts[2][2], 0.45)];
    carne.push(tube([pts[0], pts[1], m], (s) => 0.0128 * mix(1, 0.86, s) * th, { n: 4, seg: 6, caps: true, capL: 0.005, up: [1, 0, 0] }));
    yemas.push(tube([m, pts[2]], (s) => 0.0128 * mix(0.86, 0.74, s) * th, { n: 2, seg: 6, caps: true, capL: 0.006, up: [1, 0, 0] }));
  }
  return { carne: merge(carne), yemas: merge(yemas) };
}

// ------------------------------------------------------------ los pies
// Un pie descalzo (en la articulación del pie: el tobillo; la planta, a ras
// del suelo, a -0,04): el talón, el empeine que baja hacia los dedos, el
// tobillo con sus dos huesos y los cinco dedos (el gordo, por dentro: sd = 1,
// el izquierdo, lo tiene hacia -x).
const SUELA = -0.04;
function pie(sd) {
  const out = [];
  // el talón, el arco y la planta hasta el nacimiento de los dedos (el
  // ancho, de lado a lado; el alto, de la planta al empeine)
  const T = [
    [0, 0.027, 0.024],
    [0.18, 0.032, 0.026],
    [0.45, 0.038, 0.021],
    [0.72, 0.046, 0.0155],
    [1, 0.048, 0.0125],
  ];
  const zs = [-0.06, 0.0, 0.058, 0.128];
  out.push(
    tube(
      zs.map((z, i) => {
        const s = i / (zs.length - 1);
        const h = table(T, s)[1];
        return [-sd * 0.006 * s, SUELA + h, z];
      }),
      (s) => table(T, s),
      { up: [0, 1, 0], n: 10, seg: 10, caps: true, capL: 0.012 }
    )
  );
  // el empeine, que sube al tobillo
  out.push(
    tube(
      [
        [0, 0.012, -0.012],
        [-sd * 0.002, -0.012, 0.03],
        [-sd * 0.004, -0.024, 0.07],
      ],
      (s) => [mix(0.034, 0.036, s), mix(0.03, 0.012, s)],
      { up: [0, 1, 0], n: 5, seg: 8, caps: true, capL: 0.012 }
    )
  );
  // el tobillo: los dos huesos, el de dentro algo más alto
  out.push(gSph(0.012, [-sd * 0.026, -0.004, -0.008], [1, 1.2, 1.1], 6, 4));
  out.push(gSph(0.011, [sd * 0.027, -0.01, -0.014], [1, 1.2, 1.1], 6, 4));
  // los dedos: el gordo por dentro, los otros cuatro cada vez más cortos
  const D = [
    [-0.027, 0.104, 0.172, 0.0118],
    [-0.009, 0.108, 0.162, 0.0084],
    [0.006, 0.106, 0.154, 0.0078],
    [0.019, 0.102, 0.146, 0.0073],
    [0.031, 0.096, 0.134, 0.0068],
  ];
  for (const [x, z0, z1, r] of D) {
    const xx = x * sd;
    out.push(
      tube(
        [
          [xx, SUELA + r + 0.004, z0],
          [xx * 1.04, SUELA + r * 1.0, mix(z0, z1, 0.62)],
          [xx * 1.06, SUELA + r * 0.86, z1],
        ],
        (s) => r * mix(1, 0.86, s),
        { n: 4, seg: 6, caps: true, capL: r * 0.8, up: [0, 1, 0] }
      )
    );
  }
  return merge(out);
}

// ------------------------------------------------------------ el cuerpo
// Las piezas del cuerpo, cada una con su zona (la articulación, la del
// esqueleto del jugador).
export function cuerpoParts() {
  const out = [];
  const add = (zona, pt) => out.push({ ...pt, zona });

  // --- la cara: la cabeza (piel), los ojos, las cejas y la barba
  const C = cabeza();
  add('cara', P('head', 'conPiel', C.piel));
  const EY = 0.153 + Y0;
  for (const sx of [1, -1]) {
    const ex = sx * 0.031;
    // el blanco, el iris (oscuro) y la niña, hundidos en su cuenca
    add('cara', P('head', 'bone', gSph(0.0128, [ex, EY, 0.069], [1, 0.78, 0.8], 10, 8)));
    add('cara', P('head', 'iron', gSph(0.0066, [ex, EY + 0.0005, 0.0788], [1, 1, 0.45], 8, 6)));
    add('cara', P('head', 'black', gSph(0.0032, [ex, EY + 0.0005, 0.0816], [1, 1, 0.5], 6, 4)));
    // la ceja: dos trazos, el de dentro más alto y más grueso
    const zc = frente(C.piel, sx * 0.03, EY + 0.019);
    add('cara', P('head', 'conPelo', gBox(0.026, 0.0065, 0.008, [sx * 0.024, EY + 0.02, zc + 0.001], [-14, sx * 14, sx * -8])));
    add('cara', P('head', 'conPelo', gBox(0.02, 0.005, 0.007, [sx * 0.045, EY + 0.0175, zc - 0.006], [-10, sx * 32, sx * 10])));
  }
  add('cara', P('head', 'conPelo', C.barba));

  // --- la cabeza: el pelo, revuelto, con unos mechones que caen sobre la
  // frente y por la nuca
  {
    const mechones = [C.pelo];
    const rr = (s) => 0.5 + Math.sin(s * 91.7 + 0.3) * 0.5;
    // sobre la frente, hacia un lado
    for (let i = 0; i < 6; i++) {
      const x0 = -0.05 + i * 0.019 + (rr(i) - 0.5) * 0.008;
      const y0 = 0.205 + rr(i + 2) * 0.012;
      const z0 = frente(C.piel, x0, 0.19) - 0.006;
      const len = 0.03 + rr(i + 5) * 0.025;
      mechones.push(
        tube(
          [
            [x0, y0, z0],
            [x0 + 0.008, y0 - len * 0.5, z0 + 0.012],
            [x0 + 0.014, y0 - len, z0 + 0.008],
          ],
          (q) => mix(0.0075, 0.0015, q),
          { n: 4, seg: 4, up: [0, 0, 1] }
        )
      );
    }
    // la nuca y detrás de las orejas
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i - 4) * 0.27;
      const r0 = 0.084;
      const x0 = Math.sin(a) * r0,
        z0 = Math.cos(a) * r0 - 0.006;
      const y0 = 0.075 + Math.abs(i - 4) * 0.01;
      const len = 0.03 + rr(i + 11) * 0.03;
      mechones.push(
        tube(
          [
            [x0, y0 + 0.03, z0 * 1.02],
            [x0 * 1.12, y0, z0 * 1.12],
            [x0 * 1.14 + (rr(i + 3) - 0.5) * 0.01, y0 - len, z0 * 1.08],
          ],
          (q) => mix(0.009, 0.002, q),
          { n: 4, seg: 4, up: [0, 0, 1] }
        )
      );
    }
    add('cabeza', P('head', 'conPelo', merge(mechones)));
  }

  // --- el cuello, con sus tendones
  add(
    'cuello',
    P(
      'chest',
      'conPiel',
      tube(
        [
          [0, 0.46, -0.016],
          [0, 0.56, -0.004],
          [0, 0.65, 0.01],
        ],
        (s) => [0.058 * mix(1.2, 0.94, s), 0.054 * mix(1.08, 0.92, s)],
        { n: 5, seg: 12 }
      )
    )
  );
  for (const sx of [1, -1])
    add(
      'cuello',
      P(
        'chest',
        'conPiel',
        tube(
          [
            [sx * 0.044, 0.64, -0.006],
            [sx * 0.032, 0.57, 0.032],
            [sx * 0.013, 0.5, 0.058],
          ],
          0.009,
          { n: 5, seg: 5, caps: true, capL: 0.01 }
        )
      )
    );

  // --- el tronco: ancho de espalda, el pecho marcado y la tripa hundida; las
  // costillas se le notan por los lados
  add('torso', P('chest', 'conPiel', torso({ w: 1.1, dep: 1.03, pecs: 0.06, blades: 0.05, belly: -0.035 })));
  {
    // (sobre la piel del tronco: el mismo perfil que figure.torso)
    const TORSO = [
      [0, 0.152, 0.104],
      [0.2, 0.156, 0.11],
      [0.42, 0.17, 0.12],
      [0.62, 0.184, 0.122],
      [0.79, 0.198, 0.106],
      [0.88, 0.172, 0.09],
      [0.94, 0.105, 0.072],
      [1, 0.06, 0.056],
    ];
    const cost = [];
    for (const sx of [1, -1])
      for (let i = 0; i < 4; i++) {
        const pts = [];
        for (let k = 0; k <= 6; k++) {
          const y = 0.12 + i * 0.042 + k * 0.006;
          const [rx, rz] = table(TORSO, (y + 0.05) / 0.62);
          const a = sx * (0.62 + k * 0.16);
          pts.push([Math.sin(a) * rx * 1.1, y, Math.cos(a) * rz * 1.03]);
        }
        cost.push(tube(pts, 0.004, { n: 8, seg: 4, caps: true, capL: 0.014 }));
      }
    add('torso', P('chest', 'conPiel', merge(cost)));
  }
  // la clavícula
  for (const sx of [1, -1])
    add(
      'torso',
      P(
        'chest',
        'conPiel',
        tube(
          [
            [sx * 0.03, 0.5, 0.075],
            [sx * 0.1, 0.515, 0.07],
            [sx * 0.18, 0.505, 0.03],
          ],
          0.0085,
          { n: 6, seg: 5, caps: true, capL: 0.012 }
        )
      )
    );

  // --- los brazos: el hombro (el deltoides), el brazo y el antebrazo; los
  // brazos de quien maneja la espada y el escudo
  const ARM = [
    [0, 0.064, 0.062],
    [0.3, 0.061, 0.064],
    [0.65, 0.05, 0.053],
    [1, 0.043, 0.045],
  ];
  const FORE = [
    [0, 0.048, 0.046],
    [0.28, 0.049, 0.05],
    [0.75, 0.036, 0.033],
    [1, 0.031, 0.026],
  ];
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    add('brazos', P('arm' + s, 'conPiel', gSph(1, [-sx * 0.006, -0.02, 0], [0.062, 0.068, 0.064], 10, 6)));
    add(
      'brazos',
      P(
        'arm' + s,
        'conPiel',
        tube(
          [
            [0, 0.03, 0],
            [0, -0.13, 0.004],
            [0, -0.3, 0],
          ],
          (q) => table(ARM, q),
          { n: 8, seg: 10, caps: true, capL: 0.035 }
        )
      )
    );
    add(
      'antebrazos',
      P(
        'fore' + s,
        'conPiel',
        tube(
          [
            [0, 0.03, 0],
            [0, -0.09, 0.004],
            [0, -0.27, 0],
          ],
          (q) => table(FORE, q),
          { n: 8, seg: 10, caps: true, capL: 0.025 }
        )
      )
    );
    // la mano: la derecha, medio cerrada (la que coge la espada); la izquierda,
    // algo más abierta (la que va en las correas del escudo)
    const M = mano({ side: sx, curl: s === 'R' ? 0.62 : 0.45, spread: 0.2, thick: 1.08, wide: 1.04, thumb: s === 'R' ? 0.35 : 0.55 });
    add('manos', P('hand' + s, 'conPiel', M.carne));
    add('manos', P('hand' + s, 'conYema', M.yemas));
  }

  // --- la cadera: las bragas de lino, holgadas (por los lados abarcan el
  // arranque de los perniles), recogidas en la cintura por su cordón, con el
  // nudo y los cabos delante
  {
    const B = [
      [0, 0.172, 0.118],
      [0.14, 0.18, 0.124],
      [0.36, 0.196, 0.13],
      [0.6, 0.198, 0.13],
      [0.8, 0.165, 0.114],
      [1, 0.05, 0.045],
    ];
    add(
      'cadera',
      P(
        'hips',
        'conLino',
        tube(
          [
            [0, 0.142, 0],
            [0, 0.03, 0.004],
            [0, -0.1, 0.002],
            [0, -0.215, -0.006],
          ],
          (q) => table(B, q),
          { n: 10, seg: 16, caps: true, mod: (a, q) => 1 + 0.035 * folds(a + 0.4, 5, 3) * sstep(0.15, 0.6, q) }
        )
      )
    );
  }
  {
    const ring = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * TAU;
      ring.push([Math.sin(a) * 0.176, 0.135 + 0.006 * Math.cos(a), Math.cos(a) * 0.126]);
    }
    // el borde enrollado de la cintura, por encima del cordón
    add('cadera', P('hips', 'conLino', tube(ring, 0.011, { n: 32, seg: 5 })));
    const cuerda = [tube(ring.map(([x, y, z]) => [x * 1.035, y - 0.016, z * 1.05]), 0.0055, { n: 32, seg: 4 })];
    cuerda.push(gSph(0.011, [0.012, 0.118, 0.131], [1.2, 1, 0.8], 6, 4));
    cuerda.push(
      tube(
        [
          [0.012, 0.115, 0.134],
          [0.02, 0.07, 0.138],
          [0.016, 0.03, 0.136],
        ],
        0.0045,
        { n: 5, seg: 4, caps: true, capL: 0.006 }
      )
    );
    cuerda.push(
      tube(
        [
          [0.008, 0.115, 0.134],
          [-0.004, 0.08, 0.139],
          [-0.002, 0.055, 0.137],
        ],
        0.0045,
        { n: 5, seg: 4, caps: true, capL: 0.006 }
      )
    );
    add('cadera', P('hips', 'rope', merge(cuerda)));
  }

  // --- las piernas: los perniles de las bragas, holgados, con sus pliegues y
  // el bajo enrollado encima de la rodilla; debajo, la rodilla
  for (const p of legs({ legT: 1.06 })) {
    if (p.j.startsWith('foot')) continue;
    add(p.j.startsWith('leg') ? 'muslos' : 'piernas', P(p.j, 'conPiel', p.geo));
  }
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    const seed = s === 'L' ? 2 : 7;
    add(
      'muslos',
      PD(
        'leg' + s,
        'conLino',
        tube(
          [
            [sx * 0.002, 0.05, 0],
            [sx * 0.006, -0.14, 0.008],
            [sx * 0.002, -0.34, 0.012],
          ],
          (q) => [mix(0.092, 0.076, q), mix(0.096, 0.082, q)],
          { n: 8, seg: 14, mod: (a, q) => 1 + 0.06 * folds(a + q * 1.2, 4, seed) * (0.3 + q) }
        )
      )
    );
    add('muslos', P('leg' + s, 'conLino', place(new THREE.TorusGeometry(0.077, 0.01, 5, 14), [sx * 0.002, -0.338, 0.012], [90, 0, 0], [1, 1.06, 1])));
    // la rótula (rellena la rodilla entre el muslo y la pierna)
    add('piernas', P('shin' + s, 'conPiel', gSph(1, [0, 0.012, 0.034], [0.036, 0.042, 0.026], 8, 6)));
    add('pies', P('foot' + s, 'conPiel', pie(sx)));
  }
  return out;
}
