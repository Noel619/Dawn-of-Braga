// La rueda de los tres ojos: lo que abre la reja de la cripta de la Sé (la
// cerradura 'rueda' de game/interact.js; el hueco, en el pilar de la reja:
// world/level_sacred.js). Es de piedra negra, de un palmo, con una cara que no
// es de hombre, y el Rey la mandó partir en cinco: las dos mitades (la frente,
// que guardaba el mayordomo; la boca, el capellán) y los tres ojos (story.js,
// RUEDA_OJOS: el carbúnculo, del alférez; la esmeralda, del canciller; el
// zafiro, del camarero).
//
// Las partes se juntan en el inventario, como en Resident Evil (game/ui.js):
// se elige una, «Combinar», y luego la otra. Las dos mitades, entre sí; los
// ojos, en la rueda ya juntada: van en la junta, a medias entre la frente y la
// boca, y con una mitad sola no tienen dónde encajar. Cada estado de la rueda
// es un objeto (story.js): rueda, rueda_c, rueda_ce… y rueda_cez, la entera.
import { MSG, RUEDA_OJOS } from './story.js';

export const FRENTE = 'rueda_frente';
export const BOCA = 'rueda_boca';
export const ENTERA = 'rueda_cez';
const TODOS = (1 << RUEDA_OJOS.length) - 1;

// el id de la rueda juntada con los ojos de la máscara m (bit i: el ojo i)
const ruedaId = (m) => 'rueda' + (m ? '_' + RUEDA_OJOS.filter((_, i) => m & (1 << i)).map((o) => o.k).join('') : '');
const contar = (m) => RUEDA_OJOS.reduce((n, _, i) => n + ((m >> i) & 1), 0);
const ojoIdx = (id) => RUEDA_OJOS.findIndex((o) => o.id === id);

// los ojos que lleva puestos una rueda juntada (su máscara), o -1 si no lo es
export function ojosDe(id) {
  const r = /^rueda(?:_([cez]+))?$/.exec(id);
  if (!r) return -1;
  let m = 0;
  for (const ch of r[1] || '') m |= 1 << RUEDA_OJOS.findIndex((o) => o.k === ch);
  return m;
}
export const esMitad = (id) => id === FRENTE || id === BOCA;
export const esOjo = (id) => ojoIdx(id) >= 0;
export const esRueda = (id) => ojosDe(id) >= 0;
// una parte de la rueda, suelta o juntada: lo que se puede combinar
export const esParte = (id) => esMitad(id) || esOjo(id) || esRueda(id);

// En el inventario, en su orden: la rueda juntada (sólo se lleva una), las
// mitades y los ojos, de izquierda a derecha.
export const ORDEN = [...Array.from({ length: TODOS + 1 }, (_, m) => ruedaId(TODOS - m)), FRENTE, BOCA, ...RUEDA_OJOS.map((o) => o.id)];

// Combinar a con b (el orden da igual): { ok: true, da, msg, entera } (da: lo
// que sale; se gastan las dos), { ok: false, msg } (por qué no casan) o null
// (es la misma).
export function combinar(a, b) {
  if (a === b) return null;
  if (esMitad(a) && esMitad(b)) return { ok: true, da: ruedaId(0), msg: MSG.juntaMitades };
  const [r, o] = esRueda(a) && esOjo(b) ? [a, b] : esRueda(b) && esOjo(a) ? [b, a] : [null, null];
  if (r) {
    const i = ojoIdx(o),
      m = ojosDe(r) | (1 << i);
    if (m === ojosDe(r)) return { ok: false, msg: MSG.juntaNo };
    return { ok: true, da: ruedaId(m), msg: m === TODOS ? MSG.juntaEntera : MSG.juntaOjo(RUEDA_OJOS[i]), entera: m === TODOS };
  }
  if ((esMitad(a) && esOjo(b)) || (esOjo(a) && esMitad(b))) return { ok: false, msg: MSG.juntaMitad };
  if (esOjo(a) && esOjo(b)) return { ok: false, msg: MSG.juntaOjos };
  return { ok: false, msg: MSG.juntaNo };
}

// Lo combina en el inventario: si casan, se gastan las dos y se tiene lo que
// sale. Devuelve lo mismo que combinar.
export function juntar(inv, a, b) {
  const r = combinar(a, b);
  if (r && r.ok && inv.has(a) && inv.has(b)) {
    gastar(inv, a);
    gastar(inv, b);
    inv.add(r.da, 1);
  }
  return r;
}
// (lo que se gasta, fuera del inventario: no se queda a cero en la partida)
export function gastar(inv, id) {
  inv.add(id, -1);
  if (inv.count(id) <= 0) inv.items.delete(id);
}

// ¿Se lleva algo con lo que casa id? (la pista de la primera vez)
export function casaCon(inv, id) {
  return ORDEN.some((k) => k !== id && inv.has(k) && combinar(id, k)?.ok);
}

// Lo que se lleva de la rueda, suelto o juntado: { frente, boca, ojos }
// (ojos: la máscara de los que se llevan, puestos o sueltos)
function lleva(inv) {
  let frente = inv.has(FRENTE),
    boca = inv.has(BOCA),
    ojos = 0;
  for (let m = 0; m <= TODOS; m++)
    if (inv.has(ruedaId(m))) {
      frente = boca = true;
      ojos |= m;
    }
  RUEDA_OJOS.forEach((o, i) => {
    if (inv.has(o.id)) ojos |= 1 << i;
  });
  return { frente, boca, ojos };
}

// Lo que se dice ante el hueco del pilar, sin la rueda entera: el hueco y, si
// se lleva algo de ella, lo que le falta (o que se lleva todo, sin juntar).
export function anteElHueco(inv) {
  const L = lleva(inv);
  const n = (L.frente ? 1 : 0) + (L.boca ? 1 : 0) + contar(L.ojos);
  if (!n) return MSG.ruedaHueco('');
  if (n === 2 + RUEDA_OJOS.length) return MSG.ruedaHueco(MSG.ruedaSuelta);
  const faltan = [];
  if (!L.frente) faltan.push('la frente');
  if (!L.boca) faltan.push('la boca');
  const o = RUEDA_OJOS.length - contar(L.ojos);
  if (o) faltan.push(o === 1 ? 'un ojo' : o === 2 ? 'dos ojos' : 'los tres ojos');
  const lista = faltan.length > 1 ? faltan.slice(0, -1).join(', ') + ' y ' + faltan[faltan.length - 1] : faltan[0];
  return MSG.ruedaHueco(MSG.ruedaFalta(`le falta${faltan.length > 1 || o > 1 ? 'n' : ''} ${lista}`));
}

// Las partidas de antes de la rueda: las cinco llaves de la reja, cada una en
// la parte que tenía su oficial (y lo que se cogió, cogido; los sitios de las
// llaves son ahora los de las partes: i_llave_* → i_pieza_*). Con la reja ya
// abierta, la rueda se quedó en el pilar: las llaves se van y no dan nada.
const VIEJAS = {
  llave_alferez: ['ojo_carbunculo', 'alferez'],
  llave_mayordomo: [FRENTE, 'mayordomo'],
  llave_camarero: ['ojo_zafiro', 'camarero'],
  llave_capellan: [BOCA, 'capellan'],
  // (la del canciller estaba en un arca: su sitio es el arca, que no cambia)
  llave_canciller: ['ojo_esmeralda', null],
};
export function migrarLlaves(flags, inv) {
  for (const [k, [parte, sitio]] of Object.entries(VIEJAS)) {
    if (sitio && flags['take:i_llave_' + sitio]) {
      flags['take:i_pieza_' + sitio] = true;
      delete flags['take:i_llave_' + sitio];
    }
    if (!inv.items.has(k)) continue;
    const tenia = inv.has(k);
    inv.items.delete(k);
    if (tenia && !flags['door:d_cripta'] && !inv.has(parte)) inv.add(parte);
  }
}
