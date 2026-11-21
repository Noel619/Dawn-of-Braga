// El modelo de la rueda de los tres ojos (game/rueda.js), en sus partes: una
// rueda de piedra negra de un palmo, de cara a +Z, con la frente hacia +Y. La
// junta, un poco quebrada, la parte a lo ancho por los tres ojos. En el canto,
// las figuritas de rodillas; en la frente, las arrugas y las cejas juntas,
// fruncidas; en la junta, los tres ojos con sus párpados; debajo, la nariz
// chata, los carrillos hinchados y la boca abierta de oreja a oreja, con dos
// filas de dientes en punta.
//
// ruedaPartes devuelve [{ mat, geo }]: la geometría de cada material ya
// juntada, en el espacio de la rueda (el centro, en el origen). La usan los
// objetos que se recogen (game/interact.js: mallas con objMat) y la rueda
// encajada en el pilar de la reja de la Sé (world/level_sacred.js: wb.geometry).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const RUEDA_R = 0.105;
export const RUEDA_T = 0.03;
// los ojos, en la junta: [x, radio] de izquierda a derecha (RUEDA_OJOS)
const OJOS = [
  [-0.05, 0.0155],
  [0, 0.018],
  [0.05, 0.0155],
];
const GEMA = ['gemaRoja', 'gemaVerde', 'gemaAzul'];
// la junta quebrada: puntos (x, y) de un canto al otro
const JUNTA = [
  [-1, 0],
  [-0.7, 0.05],
  [-0.42, -0.04],
  [-0.18, 0.035],
  [0.12, -0.05],
  [0.4, 0.04],
  [0.68, -0.035],
  [1, 0],
].map(([x, y]) => [x * RUEDA_R, y * RUEDA_R * 0.5]);

const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S1 = V(1, 1, 1);
const place = (geo, x, y, z, rx = 0, ry = 0, rz = 0, s = S1) => geo.applyMatrix4(M.compose(V(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), s));

// La rueda (parte: 'entera', 'frente' o 'boca'; ojos: la máscara de los que
// lleva puestos, bit i: OJOS[i])
export function ruedaPartes(parte = 'entera', ojos = 7) {
  const R = RUEDA_R,
    T = RUEDA_T,
    zf = T / 2;
  const arriba = parte !== 'boca',
    abajo = parte !== 'frente';
  const out = {};
  const add = (mat, geo) => (out[mat] = out[mat] || []).push(geo.index ? geo.toNonIndexed() : geo);
  // (lo que va en una mitad: según su altura)
  const en = (y) => (y >= 0 ? arriba : abajo);

  // el cuerpo: la rueda, o una mitad con su junta quebrada
  const sh = new THREE.Shape();
  const n = 24;
  if (parte === 'entera') sh.absarc(0, 0, R, 0, Math.PI * 2, false);
  else {
    const top = parte === 'frente';
    const J = top ? JUNTA : [...JUNTA].reverse();
    sh.moveTo(J[0][0], J[0][1]);
    for (const [x, y] of J.slice(1)) sh.lineTo(x, y);
    // (de un canto al otro, por arriba o por abajo)
    for (let i = 1; i < n; i++) {
      const a = top ? (i / n) * Math.PI : Math.PI + (i / n) * Math.PI;
      sh.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    }
  }
  add('piedraRueda', place(new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false, curveSegments: 20 }), 0, 0, -T / 2));

  // el canto: el bocel y las figuritas de rodillas, de una en una
  const arco = parte === 'entera' ? Math.PI * 2 : Math.PI;
  const giro = parte === 'boca' ? Math.PI : 0;
  add('piedraRueda', place(new THREE.TorusGeometry(R - 0.007, 0.0075, 5, parte === 'entera' ? 32 : 16, arco), 0, 0, zf, 0, 0, giro));
  const nf = 22;
  for (let k = 0; k < nf; k++) {
    const a = ((k + 0.5) / nf) * Math.PI * 2;
    const y = Math.sin(a) * (R - 0.007);
    if (!en(y) || Math.abs(y) < 0.006) continue;
    // (cada una, un bulto: el cuerpo encogido y la cabeza gacha)
    add('piedraRueda', place(new THREE.BoxGeometry(0.011, 0.009, 0.008), Math.cos(a) * (R - 0.007), y, zf + 0.007, 0, 0, a + Math.PI / 2));
    add('piedraRueda', place(new THREE.SphereGeometry(0.0045, 5, 4), Math.cos(a) * (R - 0.003), Math.sin(a) * (R - 0.003), zf + 0.009));
  }

  if (arriba) {
    // las cejas, juntas y gruesas, fruncidas: bajan hacia en medio
    for (const s of [-1, 1]) add('piedraRueda', place(new THREE.BoxGeometry(0.058, 0.011, 0.009), s * 0.036, 0.031, zf + 0.002, 0, 0, s * 0.22));
    add('piedraRueda', place(new THREE.SphereGeometry(0.0085, 6, 4), 0, 0.024, zf + 0.002, 0, 0, 0, V(1.2, 0.9, 0.8)));
    // las arrugas de la frente
    for (const [y, w] of [
      [0.052, 0.11],
      [0.068, 0.088],
    ])
      add('piedraRueda', place(new THREE.BoxGeometry(w, 0.0035, 0.0035), 0, y, zf, 0, 0, y > 0.06 ? 0.04 : -0.03));
  }
  if (abajo) {
    // los carrillos, hinchados
    for (const s of [-1, 1]) add('piedraRueda', place(new THREE.SphereGeometry(0.021, 8, 6), s * 0.056, -0.029, zf - 0.006, 0, 0, 0, V(1, 0.9, 0.45)));
    // la nariz, chata, y sus agujeros
    add('piedraRueda', place(new THREE.BoxGeometry(0.02, 0.026, 0.012), 0, -0.027, zf + 0.004, 0.25, 0, 0));
    for (const s of [-1, 1]) add('black', place(new THREE.CircleGeometry(0.0035, 6), s * 0.0055, -0.0425, zf + 0.0008));
    // la boca, de oreja a oreja: el labio, lo negro, lo rojo del fondo y los
    // dientes en punta, los de arriba colgando y los de abajo de pie
    const by = -0.067,
      bw = 0.064,
      bh = 0.02;
    add('piedraRueda', place(new THREE.TorusGeometry(1, 0.08, 4, 22), 0, by, zf, 0, 0, 0, V(bw, bh, 0.06)));
    add('black', place(new THREE.CircleGeometry(1, 20), 0, by, zf + 0.0015, 0, 0, 0, V(bw, bh, 1)));
    add('gargantaRueda', place(new THREE.CircleGeometry(1, 14), 0, by - 0.002, zf + 0.002, 0, 0, 0, V(bw * 0.55, bh * 0.45, 1)));
    for (let k = 0; k < 9; k++) {
      const x = (k / 8 - 0.5) * bw * 1.55;
      const h = Math.sqrt(Math.max(0, 1 - (x / bw) ** 2)) * bh;
      add('bone', place(new THREE.ConeGeometry(0.0034, 0.011, 4), x, by + h - 0.0055, zf + 0.003, 0, 0, Math.PI));
      if (k < 8) {
        const x2 = x + bw * 0.097;
        const h2 = Math.sqrt(Math.max(0, 1 - (x2 / bw) ** 2)) * bh;
        add('bone', place(new THREE.ConeGeometry(0.0032, 0.01, 4), x2, by - h2 + 0.005, zf + 0.003));
      }
    }
  }

  // los ojos: el hueco, el párpado (de arriba y de abajo) y, si lo lleva, la
  // gema, con su niña negra
  OJOS.forEach(([x, r], i) => {
    if (parte === 'entera') add('black', place(new THREE.CircleGeometry(r, 12), x, 0, zf + 0.0008));
    else add('black', place(new THREE.CircleGeometry(r, 8, arriba ? 0 : Math.PI, Math.PI), x, 0, zf + 0.0008));
    for (const [ok, rz] of [
      [arriba, 0],
      [abajo, Math.PI],
    ])
      if (ok) add('piedraRueda', place(new THREE.TorusGeometry(r + 0.0035, 0.0042, 4, 10, Math.PI), x, 0, zf, 0, 0, rz));
    if (parte === 'entera' && ojos & (1 << i)) {
      add(GEMA[i], place(new THREE.SphereGeometry(r * 0.92, 10, 8), x, 0, zf + 0.001, 0, 0, 0, V(1, 1, 0.55)));
      add('black', place(new THREE.CircleGeometry(r * 0.34, 8), x + r * 0.08, -r * 0.06, zf + 0.001 + r * 0.92 * 0.55 + 0.0006));
    }
  });
  // la junta de la rueda entera: una raya fina y oscura
  if (parte === 'entera')
    for (let k = 0; k + 1 < JUNTA.length; k++) {
      const [x0, y0] = JUNTA[k],
        [x1, y1] = JUNTA[k + 1];
      const L = Math.hypot(x1 - x0, y1 - y0);
      add('black', place(new THREE.PlaneGeometry(L, ojos === 7 ? 0.0012 : 0.0028), (x0 + x1) / 2, (y0 + y1) / 2, zf + 0.0006, 0, 0, Math.atan2(y1 - y0, x1 - x0)));
    }

  return Object.entries(out).map(([mat, geos]) => ({ mat, geo: mergeGeometries(geos.map(limpia)) }));
}

// (todas con lo mismo: posición, normal y uv, sin grupos)
function limpia(g) {
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
  g.clearGroups();
  return g;
}

// Un ojo suelto: la gema pulida en redondo, de cara a +Z, con su niña negra
// (i: RUEDA_OJOS[i]; el de en medio, más grande)
export function ojoPartes(i) {
  const r = OJOS[i][1] * 0.95;
  return [
    { mat: GEMA[i], geo: limpia(new THREE.SphereGeometry(r, 12, 9).toNonIndexed().applyMatrix4(M.compose(V(0, 0, 0), Q.identity(), V(1, 1, 0.7)))) },
    { mat: 'black', geo: limpia(new THREE.CircleGeometry(r * 0.36, 10).toNonIndexed().applyMatrix4(M.makeTranslation(r * 0.06, -r * 0.05, r * 0.7 + 0.0005))) },
  ];
}
