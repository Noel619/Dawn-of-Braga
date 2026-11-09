// Los tipos de daño: cortante (el filo: tajos y hachazos), perforante (la
// punta: estocadas, virotes, dientes) y contundente (lo que aplasta: mazazos,
// culatazos, embestidas, el suelo que se parte).
//
// Cada golpe es de un tipo. Las armas tienen el suyo (weapons.js, STATS.dano)
// y las especiales, otro más, el de los golpes de su repertorio que no son
// como los demás: la lanza estoca, pero su barrido con el asta aplasta; el
// hacha corta, pero la onda del suelo que parte aplasta; la ballesta perfora,
// pero su culatazo aplasta. Lo que no es de ninguno (el fuego, el pus, las
// esporas, los gritos, el tañido de la campana) no tiene tipo.
//
// Las armaduras paran cada tipo a su manera (sus piezas, en game/story.js:
// res): la malla para el filo y apenas la punta o el golpe; la placa, el filo
// y la punta; el acolchado, el golpe. Lo que no tiene tipo lo paran por igual
// (lo que paran de media). Las criaturas también (CRIATURAS, abajo): lo que
// aguantan de cada tipo, en puntos de cien (negativo: les hace más daño). Y
// de qué tipo es cada golpe suyo: el de la criatura (dano) o, el que sea de
// otro, en golpes (por su nombre; null, sin tipo).
export const TIPO_IDS = ['cortante', 'perforante', 'contundente'];
export const TIPOS = {
  cortante: { nombre: 'Cortante', contra: 'Contra corte', icon: 'tCortante' },
  perforante: { nombre: 'Perforante', contra: 'Contra punta', icon: 'tPerforante' },
  contundente: { nombre: 'Contundente', contra: 'Contra golpe', icon: 'tContundente' },
};

// Las criaturas: el tipo de sus golpes y lo que aguantan de cada tipo.
const PIEDRA = { cortante: 35, perforante: 25, contundente: -25 };
const BALLESTERO = { dano: 'perforante', golpes: { bash: 'contundente' }, res: { contundente: 20, cortante: 10, perforante: -10 } };
const CORTESANO = { dano: 'perforante', res: { cortante: -10 } };
export const CRIATURAS = {
  // la ciudad
  // (el flagelante y su hoz: nada que le guarde)
  penitent: { dano: 'cortante' },
  // (la cota bajo la carne: el filo resbala; el golpe, no)
  soldier: { dano: 'cortante', golpes: { thrust: 'perforante', arm3: 'contundente' }, res: { cortante: 25, contundente: -15 } },
  // (patas largas y flacas: la punta pasa entre ellas; el filo las corta)
  crawler: { dano: 'cortante', golpes: { pounce: 'contundente' }, res: { perforante: 15, cortante: -15 } },
  // (sin piel)
  hound: { dano: 'perforante', res: { cortante: -20 } },
  // (la campana de bronce: la punta no entra; el golpe la hace sonar)
  bell: { dano: 'contundente', golpes: { toll: null }, res: { perforante: 30, cortante: 15, contundente: -20 } },
  // (la mortaja y el encaje: la punta pasa a través; el filo los rasga)
  mourner: { dano: 'cortante', golpes: { scream: null }, res: { perforante: 35, contundente: 20, cortante: -15 } },
  // (la armadura vieja: el golpe la abolla)
  impaled: { dano: 'contundente', golpes: { jab: 'perforante' }, res: { cortante: 20, perforante: 10, contundente: -10 } },
  // (el cirial de hierro; la cera y la letanía, el fuego)
  paioHollow: { dano: 'contundente', golpes: { thrust: 'perforante', wax: null, litany: null }, res: { contundente: 15, cortante: -10 } },
  // (huesos: la punta no encuentra nada; el golpe los parte)
  custodio: { dano: 'contundente', res: { perforante: 40, cortante: 25, contundente: -30 } },
  // (la carne blanda se traga el golpe; el pus, sin tipo)
  leonor: { dano: 'contundente', golpes: { swipeR: 'cortante', swipeL: 'cortante', vomit: null, wail: null }, res: { contundente: 30, cortante: -15 } },
  // las catacumbas
  // (seco como la tierra que cava)
  cavador: { dano: 'perforante', golpes: { barrido: 'contundente', derrumbe: 'contundente' }, res: { perforante: 15, cortante: 10, contundente: -10 } },
  // (la obra que arrastra: sólo se rompe a golpes)
  emparedada: { dano: 'contundente', golpes: { aranazo: 'cortante' }, res: { cortante: 30, perforante: 30, contundente: -20 } },
  // (la rueda: madera y hierro)
  enrodado: { dano: 'contundente', golpes: { zarpa: 'cortante' }, res: { cortante: 20, contundente: -15 } },
  // los Pellejeros
  // (camisón de lino y el cráneo abierto)
  coronado: { dano: 'perforante', golpes: { cabezazo: 'contundente' }, res: { cortante: -10, contundente: -10 } },
  // (a la cera del ropón no se le agarra nada; el fuego y la cal, sin tipo)
  fisico: { dano: 'contundente', golpes: { pica: 'perforante', sierra: 'cortante', lanceta: 'perforante', trepano: 'perforante', cal: null, sahumerio: null, cauterio: null, cauterioPica: null }, res: { cortante: 20, contundente: -10 } },
  // (plumas; la pechuga pelada, a la punta)
  cuervo: { dano: 'perforante', golpes: { picado: 'cortante' }, res: { cortante: 10, perforante: -20 } },
  // la fortaleza
  // (la cota se le ha metido en la carne)
  alferez: { dano: 'perforante', golpes: { bash: 'contundente' }, res: { cortante: 25, contundente: -10 } },
  // (el gambesón: para el golpe; la punta lo atraviesa)
  ballestero: BALLESTERO,
  tirador: BALLESTERO,
  cortesano: CORTESANO,
  cortesanoSuelto: CORTESANO,
  mayordomo: { dano: 'perforante', golpes: { embrace: 'contundente' } },
  // (la cota y la placa de un caballero: el filo resbala; la punta busca las
  // juntas. Y además, la calidad del arma: weapons.js, CALIDAD)
  caballero: { dano: 'cortante', golpes: { acometida: 'perforante', salto: 'perforante', pendon: 'contundente' }, res: { cortante: 15, perforante: -10 } },
  // lo hondo
  // (las plantas: la punta pasa entre los tallos; el filo los siega)
  zarza: { dano: 'cortante', golpes: { golpe: 'contundente' }, res: { perforante: 40, contundente: 20, cortante: -25 } },
  boca: { dano: 'perforante', res: { perforante: 25, cortante: -15 } },
  // (blando: el golpe rebota; la punta lo revienta)
  bulbo: { dano: null, res: { contundente: 30, perforante: -30 } },
  // (pelo y hueso)
  lobishome: {
    dano: 'cortante',
    golpes: { dentellada: 'perforante', embestidaPelea: 'contundente', embestida: 'contundente', embestidaLuz: 'contundente', caida: 'contundente', volcar: 'contundente', aullido: null },
    res: { contundente: 15, perforante: -10 },
  },
  // bajo la Sé
  guardianL: { dano: 'cortante', golpes: { thrust: 'perforante' }, res: PIEDRA },
  guardianR: { dano: 'contundente', res: PIEDRA },
  // (el coloso del incensario: la mole se traga el golpe; las ascuas, sin tipo)
  turibulario: { dano: 'contundente', golpes: { volley: null }, res: { contundente: 15, perforante: -10 } },
  // (tendones y hueso: la punta resbala; el golpe le descoyunta)
  descoyuntado: {
    dano: 'cortante',
    golpes: { lunge: 'perforante', slam: 'contundente', pounce: 'contundente', charge: 'contundente', smash: 'contundente', throw: 'contundente', drop: 'contundente', crack: null },
    res: { perforante: 15, contundente: -15 },
  },
};

// El tipo de un golpe de una criatura (src: la que golpea; a: el golpe): el
// que diga el golpe (a.tipo, si lo tiene, aunque sea null) o el de la tabla.
export function tipoGolpe(src, a) {
  if (a && 'tipo' in a) return a.tipo;
  const C = src && src.type ? CRIATURAS[src.type] : null;
  if (!C) return null;
  if (a && a.name && C.golpes && a.name in C.golpes) return C.golpes[a.name];
  return C.dano ?? null;
}
// Lo que aguanta una criatura de un tipo (en partes de uno: 0,25 = un cuarto
// menos; negativo, más daño)
export function resistencia(type, tipo) {
  const C = CRIATURAS[type];
  return tipo && C && C.res && C.res[tipo] ? C.res[tipo] / 100 : 0;
}
