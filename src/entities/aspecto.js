// El aspecto del Condenado: lo que se elige en el editor de personaje
// (game/creador.js, después de la introducción, como en los Souls) y se
// guarda con la partida. Sin clases: sólo quién era. El nombre, el rostro
// (uno de base y sus rasgos, cada uno en un deslizador), el peinado y la
// barba, los colores (piel, pelo, ojos), una cicatriz y la complexión.
//
// Los rasgos y la complexión van de 0 a 1 (0,5: como es el rostro de base);
// cuerpo.js convierte el aspecto en formas (la cabeza de sculpt.head, el pelo,
// la barba) y aquí se dan los colores (tintes de sus materiales) y las
// escalas de cada hueso (vestir: el cuerpo y la armadura que lleve encima,
// juntos).
import * as THREE from 'three';
import { clamp } from '../core/util.js';

// ------------------------------------------------------------ los rostros
// Los de base (los parámetros de sculpt.head que cambian): el primero, el de
// siempre (cuerpo.js, CARA).
export const ROSTROS = [
  { id: 'soldado', nombre: 'Soldado', cara: {} },
  { id: 'labriego', nombre: 'Labriego', cara: { w: 1.04, h: 0.97, jaw: 1.04, nose: 0.024, noseW: 1.22, brow: 0.009, socket: 0.011, cheek: 0.011, gaunt: 0.003, chin: 0.006, lips: 0.0032, ears: 0.02 } },
  { id: 'hidalgo', nombre: 'Hidalgo', cara: { w: 0.95, h: 1.04, jaw: 0.92, nose: 0.031, noseW: 0.92, hook: 0.003, brow: 0.01, socket: 0.012, cheek: 0.009, gaunt: 0.008, chin: 0.011, lips: 0.0022, ears: 0.014 } },
  { id: 'hosco', nombre: 'Hosco', cara: { w: 1.03, h: 0.99, jaw: 1.06, nose: 0.026, noseW: 1.16, brow: 0.017, socket: 0.018, cheek: 0.006, gaunt: 0.004, chin: 0.012, lips: 0.002, ears: 0.017 } },
  { id: 'mozo', nombre: 'Mozo', cara: { w: 0.97, h: 0.98, jaw: 0.94, nose: 0.024, noseW: 1.0, brow: 0.006, socket: 0.009, cheek: 0.01, gaunt: 0.002, chin: 0.007, lips: 0.0032, ears: 0.018 } },
  { id: 'curtido', nombre: 'Curtido', cara: { w: 1.0, h: 1.02, jaw: 1.0, nose: 0.03, noseW: 1.1, hook: 0.004, brow: 0.014, socket: 0.017, cheek: 0.012, gaunt: 0.012, chin: 0.008, lips: 0.0018, ears: 0.019 } },
];

// Los rasgos: cada deslizador mueve un parámetro de sculpt.head alrededor del
// de su rostro (0,5: el del rostro; 0 y 1, ± d).
export const RASGOS = [
  { id: 'ancho', nombre: 'Ancho de la cara', p: 'w', d: 0.07 },
  { id: 'largo', nombre: 'Largo de la cara', p: 'h', d: 0.05 },
  { id: 'cejas', nombre: 'Frente y cejas', p: 'brow', d: 0.007 },
  { id: 'ojos', nombre: 'Ojos hundidos', p: 'socket', d: 0.008 },
  { id: 'pomulos', nombre: 'Pómulos', p: 'cheek', d: 0.008 },
  { id: 'mejillas', nombre: 'Mejillas chupadas', p: 'gaunt', d: 0.007 },
  { id: 'nariz', nombre: 'Nariz', p: 'nose', d: 0.01 },
  { id: 'narizAncho', nombre: 'Ancho de la nariz', p: 'noseW', d: 0.26 },
  { id: 'gancho', nombre: 'Nariz aguileña', p: 'hook', d: 0.006, min: 0 },
  { id: 'mandibula', nombre: 'Mandíbula', p: 'jaw', d: 0.09 },
  { id: 'menton', nombre: 'Mentón', p: 'chin', d: 0.008, min: 0 },
  { id: 'labios', nombre: 'Labios', p: 'lips', d: 0.0018, min: 0.0004 },
  { id: 'orejas', nombre: 'Orejas', p: 'ears', d: 0.008, min: 0.004 },
];

// ------------------------------------------------------------ el pelo
export const PEINADOS = [
  { id: 'revuelto', nombre: 'Revuelto' },
  { id: 'corto', nombre: 'Corto' },
  { id: 'rapado', nombre: 'Rapado' },
  { id: 'paje', nombre: 'Melena de paje' },
  { id: 'melena', nombre: 'Melena' },
  { id: 'coleta', nombre: 'Atado atrás' },
  { id: 'tonsura', nombre: 'Tonsura' },
  { id: 'calvo', nombre: 'Calvo' },
];
export const BARBAS = [
  { id: 'dias', nombre: 'De días' },
  { id: 'afeitado', nombre: 'Afeitado' },
  { id: 'corta', nombre: 'Corta' },
  { id: 'larga', nombre: 'Larga' },
  { id: 'bigote', nombre: 'Bigote' },
  { id: 'perilla', nombre: 'Perilla' },
];
// el color del pelo (y de la barba y las cejas): el del material conPelo, que
// tiñe una textura de canas
export const COLORES_PELO = [
  { id: 'negro', nombre: 'Negro', c: 0x221a16 },
  { id: 'castanoOscuro', nombre: 'Castaño oscuro', c: 0x3e2e24 },
  { id: 'castano', nombre: 'Castaño', c: 0x5a4436 },
  { id: 'castanoClaro', nombre: 'Castaño claro', c: 0x7c5c40 },
  { id: 'cobrizo', nombre: 'Cobrizo', c: 0x8e4424 },
  { id: 'rubio', nombre: 'Rubio', c: 0xb08e5a },
  { id: 'ceniza', nombre: 'Rubio ceniza', c: 0x9a8e74 },
  { id: 'canoso', nombre: 'Entrecano', c: 0x8a8580 },
  { id: 'blanco', nombre: 'Blanco', c: 0xd2cec6 },
];
// la piel: lo que se tiñe la textura del Condenado (conPiel), en lineal
export const PIELES = [
  { id: 'palida', nombre: 'Pálida', k: [1.2, 1.16, 1.16] },
  { id: 'clara', nombre: 'Clara', k: [1.12, 1.06, 1.03] },
  { id: 'morena', nombre: 'Morena', k: [1, 1, 1] },
  { id: 'tostada', nombre: 'Tostada', k: [0.74, 0.62, 0.52] },
  { id: 'oscura', nombre: 'Oscura', k: [0.4, 0.29, 0.22] },
  { id: 'muyOscura', nombre: 'Muy oscura', k: [0.2, 0.135, 0.1] },
];
// los ojos: el iris (material conIris)
export const OJOS = [
  { id: 'oscuros', nombre: 'Oscuros', c: 0x24170f },
  { id: 'pardos', nombre: 'Pardos', c: 0x5a3a20 },
  { id: 'avellana', nombre: 'Avellana', c: 0x6e5a2e },
  { id: 'verdes', nombre: 'Verdes', c: 0x4c6a3a },
  { id: 'azules', nombre: 'Azules', c: 0x46688e },
  { id: 'grises', nombre: 'Grises', c: 0x6c747c },
];
export const CICATRICES = [
  { id: 'ninguna', nombre: 'Ninguna' },
  { id: 'ceja', nombre: 'En la ceja' },
  { id: 'mejilla', nombre: 'En la mejilla' },
  { id: 'nariz', nombre: 'En la nariz' },
  { id: 'labio', nombre: 'En el labio' },
  { id: 'frente', nombre: 'En la frente' },
];

// Nombres de su tierra y de su tiempo (Portugal, hacia 1167), para el que
// no quiera escribir uno; ninguno de los de la ciudad (Paio, Mendo, Henrique,
// Miguel, Lourenço, Bento...).
export const NOMBRES = [
  'Soeiro',
  'Egas',
  'Fernão',
  'Vasco',
  'Nuno',
  'Martim',
  'Gualdim',
  'Lopo',
  'Ermígio',
  'Garcia',
  'Sancho',
  'Osório',
  'Bermudo',
  'Telo',
  'Fruela',
  'Diogo',
  'Estêvão',
  'Godinho',
  'Gil',
  'Álvaro',
  'Fafes',
  'Ramiro',
  'Tructesindo',
  'Mem',
  'Sueiro',
  'Pelaio',
  'Ordonho',
  'Gomes',
];
export const NOMBRE_MAX = 16;

// ------------------------------------------------------------ el aspecto
// El de siempre: el de cuerpo.js antes de que hubiera editor (el nombre, uno
// de la lista).
export function aspectoBase(nombre = 'Soeiro') {
  const rasgos = {};
  for (const R of RASGOS) rasgos[R.id] = 0.5;
  return { nombre, rostro: 'soldado', rasgos, peinado: 'revuelto', barba: 'dias', colorPelo: 'castano', piel: 'morena', ojos: 'oscuros', cicatriz: 'ninguna', complexion: 0.5 };
}

const idDe = (lista, v, def) => (lista.some((x) => x.id === v) ? v : def);
// Un aspecto guardado (o a medias), completo y dentro de sus límites.
export function normalizar(a) {
  const B = aspectoBase();
  if (!a || typeof a !== 'object') return B;
  const out = { ...B };
  out.nombre = limpiarNombre(a.nombre) || B.nombre;
  out.rostro = idDe(ROSTROS, a.rostro, B.rostro);
  out.peinado = idDe(PEINADOS, a.peinado, B.peinado);
  out.barba = idDe(BARBAS, a.barba, B.barba);
  out.colorPelo = idDe(COLORES_PELO, a.colorPelo, B.colorPelo);
  out.piel = idDe(PIELES, a.piel, B.piel);
  out.ojos = idDe(OJOS, a.ojos, B.ojos);
  out.cicatriz = idDe(CICATRICES, a.cicatriz, B.cicatriz);
  out.complexion = clamp(+a.complexion || 0, 0, 1);
  if (!Number.isFinite(+a.complexion)) out.complexion = B.complexion;
  out.rasgos = {};
  for (const R of RASGOS) {
    const v = a.rasgos ? +a.rasgos[R.id] : NaN;
    out.rasgos[R.id] = Number.isFinite(v) ? clamp(v, 0, 1) : 0.5;
  }
  return out;
}
// (sin lo que no sea letra, espacio, guion o apóstrofo; sin espacios de más)
export function limpiarNombre(s) {
  return String(s || '')
    .replace(/[^\p{L}\p{M} '’-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NOMBRE_MAX);
}

// Uno cualquiera (r: un generador de 0 a 1; los rasgos, cerca del medio).
export function alAzar(r = Math.random) {
  const pick = (L) => L[Math.floor(r() * L.length) % L.length].id;
  const a = aspectoBase(NOMBRES[Math.floor(r() * NOMBRES.length) % NOMBRES.length]);
  a.rostro = pick(ROSTROS);
  for (const R of RASGOS) a.rasgos[R.id] = clamp(0.5 + (r() + r() - 1) * 0.42, 0, 1);
  a.peinado = pick(PEINADOS);
  a.barba = pick(BARBAS);
  a.colorPelo = pick(COLORES_PELO.slice(0, 7));
  a.piel = pick(PIELES);
  a.ojos = pick(OJOS);
  a.cicatriz = r() < 0.6 ? 'ninguna' : pick(CICATRICES);
  a.complexion = clamp(0.5 + (r() + r() - 1) * 0.45, 0, 1);
  return a;
}

const porId = (lista, id) => lista.find((x) => x.id === id) || lista[0];
export const rostroDe = (a) => porId(ROSTROS, a.rostro);
export const pielDe = (a) => porId(PIELES, a.piel);
export const colorPeloDe = (a) => porId(COLORES_PELO, a.colorPelo);
export const ojosDe = (a) => porId(OJOS, a.ojos);

// Los parámetros de la cabeza (sculpt.head) de un aspecto: los del rostro de
// base sobre los de siempre (base), movidos por sus rasgos.
export function caraDe(a, base) {
  const c = { ...base, ...rostroDe(a).cara };
  for (const R of RASGOS) {
    const v = a.rasgos[R.id] ?? 0.5;
    const x = (c[R.p] ?? 0) + (v - 0.5) * 2 * R.d;
    c[R.p] = Math.max(R.min ?? -Infinity, x);
  }
  return c;
}

// La complexión: lo que se ensancha (x) y se ahonda (z) cada hueso, alrededor
// de su eje (de enjuto, 0, a corpulento, 1). El cuerpo y lo que lleve
// encima, igual: la armadura se ajusta al que la lleva.
export function escalasDe(a) {
  const b = (a ? a.complexion : 0.5) - 0.5;
  const k = (x, z) => [1 + b * 2 * x, 1, 1 + b * 2 * z];
  const brazo = k(0.1, 0.1),
    pierna = k(0.08, 0.08);
  return {
    chest: k(0.075, 0.1),
    hips: k(0.07, 0.1),
    armL: brazo,
    armR: brazo,
    foreL: k(0.08, 0.08),
    foreR: k(0.08, 0.08),
    legL: pierna,
    legR: pierna,
    shinL: k(0.06, 0.06),
    shinR: k(0.06, 0.06),
    // (la capa cuelga del pecho: se aparta con él)
    cloak: k(0.075, 0.1),
  };
}

// Los colores de los materiales del cuerpo en un rig con materiales propios
// (rig.own): la piel, las yemas, el pelo y el iris.
export function teñir(rig, a) {
  rig.own();
  const P = pielDe(a).k;
  const pelo = colorPeloDe(a).c,
    ojos = ojosDe(a).c;
  for (const m of rig.meshes) {
    const n = m.userData.matName;
    const mat = m.material;
    if (!mat || !mat.color) continue;
    if (n === 'conPiel' || n === 'conCicatriz') {
      const base = n === 'conCicatriz' ? [1.12, 0.86, 0.82] : [1, 1, 1];
      mat.color.setRGB(P[0] * base[0], P[1] * base[1], P[2] * base[2]);
    } else if (n === 'conYema') {
      // (la carne viva de las yemas: más roja cuanto más clara la piel)
      mat.color.setHex(0xc86058).multiplyScalar(0.55 + 0.45 * P[1]);
    } else if (n === 'conPelo') mat.color.setHex(pelo);
    else if (n === 'conApunta') {
      // (lo que apunta: medio pelo, medio piel)
      const c = new THREE.Color(pelo);
      const pk = new THREE.Color(0.66 * P[0], 0.5 * P[1], 0.42 * P[2]);
      mat.color.copy(c.lerp(pk, 0.42));
    } else if (n === 'conIris') mat.color.setHex(ojos);
  }
}
