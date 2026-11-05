// Cómo suena cada sala (PLAN_FORTALEZA.md, fase 6: el sonido de cada sala).
// Por zona (su id en L.zones): lo que se pisa, la sala de la reverberación y
// cuánta, y su ambiente propio. Lo que no se dice sale de su atmósfera (ver
// core/audio.js: ZONE_ROOM, ZONE_BED y ambEvent).
//
//   suelo: 'stone' (losas, sillería, empedrado), 'wood' (tablas, forjados),
//          'dirt' (tierra, ceniza) o 'straw' (paja)
//   eco:   [sala, cantidad]: la respuesta de impulso ('room', 'hall',
//          'cathedral', 'crypt', 'street', 'open') y lo que se le manda
//   amb:   los sucesos del ambiente de la sala (core/audio.js: ambSala): el
//          caldero de la cocina, las moscas de las cuadras, los cascabeles de
//          los halcones, los legajos del Tombo, el viento de la torre, el agua
//          del aljibe, las ramas secas del jardín...
//   cama:  las capas de fondo (viento, incendio, tono de sala, dron, río),
//          si no son las de su atmósfera; silbo: el viento silba en las
//          troneras
//
// Las medidas, del suelo de verdad de cada sala (lo que hay bajo el jugador:
// ver tools/salas.mjs) y de su tamaño: las salas de tablas y tapices, secas;
// las bóvedas de piedra y el aljibe, largas.
export const ACUSTICA = {
  // ---------------------------------------------------------- el patio de armas
  castle: { suelo: 'dirt' },
  castle_gate: { suelo: 'stone', eco: ['crypt', 0.36], amb: 'paso' },
  halconera: { suelo: 'dirt', eco: ['room', 0.24], amb: 'halconera' },
  cuadras: { suelo: 'straw', eco: ['room', 0.24], amb: 'cuadras' },
  cuartel: { suelo: 'wood', eco: ['room', 0.28] },
  castle_chapel: { suelo: 'stone', eco: ['hall', 0.44] },
  torre_carcel: { suelo: 'stone', eco: ['crypt', 0.4] },
  torre_carcel_alta: { suelo: 'wood', eco: ['room', 0.3] },

  // ---------------------------------------------------------- la fortaleza
  fort_patio: { suelo: 'stone', eco: ['street', 0.34] },
  // la puerta, el cuerpo de guardia y lo de encima
  zaguan_fortaleza: { suelo: 'stone', eco: ['crypt', 0.46], amb: 'paso' },
  camara_torno: { suelo: 'stone', eco: ['room', 0.4], amb: 'torno' },
  guardia_fortaleza: { suelo: 'stone', eco: ['room', 0.36] },
  armeria_fortaleza: { suelo: 'wood', eco: ['room', 0.3], amb: 'armeria' },
  taller_ballestero: { suelo: 'wood', eco: ['room', 0.3], amb: 'armeria' },
  cadalso_puerta: { suelo: 'wood', eco: ['open', 0.2], amb: 'adarve' },
  // el gran salón, su galería, el servicio y la cocina
  salon: { suelo: 'stone', eco: ['hall', 0.56], amb: 'salon' },
  salon_galeria: { suelo: 'stone', eco: ['hall', 0.42], amb: 'paso' },
  despensa: { suelo: 'stone', eco: ['room', 0.38], amb: 'despensa' },
  cocina: { suelo: 'stone', eco: ['hall', 0.36], amb: 'cocina' },
  secadero: { suelo: 'wood', eco: ['room', 0.26], amb: 'cocina' },
  // la capilla real y su tribuna
  capilla_real: { suelo: 'stone', eco: ['hall', 0.6] },
  capilla_tribuna: { suelo: 'wood', eco: ['hall', 0.5] },
  // (el paseo de las cámaras: tablas, abierto al patio)
  paseo_camaras: { suelo: 'wood', eco: ['street', 0.3] },
  // la cancillería y el Tombo: papel y tablas, y arriba el viento
  cancilleria: { suelo: 'wood', eco: ['room', 0.28], amb: 'tombo' },
  tombo_registros: { suelo: 'stone', eco: ['room', 0.3], amb: 'tombo' },
  tombo_legajos: { suelo: 'wood', eco: ['room', 0.22], amb: 'tombo' },
  tombo_cartas: { suelo: 'wood', eco: ['room', 0.22], amb: 'tombo', silbo: true },
  tombo_arcas: { suelo: 'wood', eco: ['room', 0.24], amb: 'tombo', cama: [0.1, 0.02, 0.1, 0, 0], silbo: true },
  // la reina: el estrado, su sala, su torre
  estrado_damas: { suelo: 'wood', eco: ['room', 0.3], amb: 'camara' },
  reina_alta: { suelo: 'wood', eco: ['room', 0.32], amb: 'camara' },
  reina_torre: { suelo: 'stone', eco: ['room', 0.36] },
  reina_oratorio: { suelo: 'wood', eco: ['room', 0.3] },
  reina_camara: { suelo: 'wood', eco: ['room', 0.22], amb: 'camara' },
  // el Rey: la antecámara, su cámara, el tesoro, la torre de la coracha
  antecamara: { suelo: 'stone', eco: ['room', 0.36] },
  camara_rey: { suelo: 'wood', eco: ['room', 0.24], amb: 'camara' },
  tesoro: { suelo: 'stone', eco: ['crypt', 0.36] },
  oratorio_rey: { suelo: 'wood', eco: ['room', 0.28] },
  coracha_torre: { suelo: 'wood', eco: ['room', 0.34], amb: 'torre', silbo: true },
  pasadizo_rey: { suelo: 'dirt', eco: ['open', 0.2], amb: 'adarve' },
  // la torre del homenaje, de abajo arriba
  homenaje_almacen: { suelo: 'stone', eco: ['room', 0.42], amb: 'despensa' },
  homenaje_granero: { suelo: 'stone', eco: ['room', 0.32], amb: 'despensa' },
  homenaje_caracol: { suelo: 'stone', eco: ['crypt', 0.42], amb: 'torre' },
  homenaje_guardia: { suelo: 'wood', eco: ['room', 0.34], amb: 'torre' },
  homenaje_dormitorio: { suelo: 'wood', eco: ['room', 0.3], amb: 'torre' },
  homenaje_consejo: { suelo: 'wood', eco: ['room', 0.32], amb: 'torre' },
  homenaje_camara: { suelo: 'wood', eco: ['room', 0.26], amb: 'torre' },
  homenaje_trono: { suelo: 'wood', eco: ['hall', 0.5], amb: 'torre' },
  homenaje_galeria: { suelo: 'stone', eco: ['hall', 0.4], amb: 'torre', silbo: true },
  homenaje_terraza: { suelo: 'stone' },
  // el jardín, su adarve, el mirador y el adarve de levante
  jardin_rey: { suelo: 'dirt', eco: ['open', 0.22], amb: 'jardin' },
  adarve_jardin: { suelo: 'stone', eco: ['open', 0.2], amb: 'adarve' },
  mirador_rey: { suelo: 'stone', eco: ['open', 0.2], amb: 'adarve' },
  adarve_levante: { suelo: 'stone', eco: ['open', 0.2], amb: 'adarve' },
  terraza_cancilleria: { suelo: 'stone', eco: ['open', 0.22], amb: 'adarve' },

  // ---------------------------------------------------------- la cárcel del Rey
  carcel_bajada: { suelo: 'stone', eco: ['crypt', 0.46] },
  carcel_carceleros: { suelo: 'stone', eco: ['crypt', 0.42] },
  carcel_celdas: { suelo: 'stone', eco: ['crypt', 0.5] },
  aljibe_palacio: { suelo: 'stone', eco: ['cathedral', 0.5], amb: 'aljibe', cama: [0, 0, 0.12, 0.05, 0.04] },
  carcel_paso: { suelo: 'stone', eco: ['crypt', 0.44] },
  carcel_verdugos: { suelo: 'stone', eco: ['crypt', 0.4] },
  carcel_foso: { suelo: 'stone', eco: ['crypt', 0.5], amb: 'aljibe' },
  carcel_capilla: { suelo: 'stone', eco: ['crypt', 0.48] },
  carcel_rastrillo: { suelo: 'stone', eco: ['crypt', 0.44] },
};

// Lo que se pisa cuando la sala no lo dice: por su atmósfera (las de dentro,
// de tablas) y algunas zonas de tierra.
const TIERRA = { castle: 1, tanners: 1, river: 1, cloister: 1, jardin_rey: 1 };
export function sueloDe(z) {
  const a = ACUSTICA[z.id];
  if (a && a.suelo) return a.suelo;
  return z.atmo === 'interior' || z.atmo === 'chapel' ? 'wood' : TIERRA[z.id] ? 'dirt' : 'stone';
}
// La acústica de una zona para el audio (con su id: el audio distingue dos
// salas de la misma atmósfera), o null si no tiene.
export function acusticaDe(z) {
  const a = ACUSTICA[z.id];
  return a ? (a._z || (a._z = { id: z.id, ...a })) : null;
}
