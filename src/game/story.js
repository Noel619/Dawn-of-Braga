// Textos del juego: objetos, documentos y mensajes. Breves, como pidió el diseño:
// la historia se cuenta sobre todo con el escenario.

export const ITEMS = {
  // Armas (weapon: id en src/entities/weapons.js). Orden en el que se
  // encontrarán: facón, hacha, lanza, espada y katana sagrada. Las cuatro
  // nuevas todavía no están colocadas en el mundo.
  facon: {
    name: 'Facón criollo',
    desc: 'Cuchillo largo de un marinero del Río de la Plata, con guardas de plata en S. Corto y veloz: tajos que se encadenan y una puñalada que remata.',
    icon: 'facon',
    key: false,
    weapon: 'facon',
  },
  hacha: {
    name: 'Hacha barbada',
    desc: 'Hacha de mango largo de los leñadores del Gerês. Lenta y a dos manos, con el escudo a la espalda; cada golpe quiebra la guardia y el pesado estremece el suelo.',
    icon: 'axe',
    key: false,
    weapon: 'hacha',
  },
  lanza: {
    name: 'Lanza de la muralla',
    desc: 'Lanza de la guardia del adarve, con la moharra en hoja de laurel y un lazo rojo. Mantiene a raya: estocadas largas sin bajar el escudo.',
    icon: 'spear',
    key: false,
    weapon: 'lanza',
  },
  espada: {
    name: 'Espada del carcelero',
    desc: 'Espada larga de la guarnición. La hoja está mellada, pero todavía corta.',
    icon: 'sword',
    key: false,
    weapon: 'espada',
  },
  katana: {
    name: 'Katana sagrada',
    desc: 'Hoja curva traída del Japón por un jesuita y bendecida en la Sé. Su acero reluce en la oscuridad. Se desenvaina y corta en un solo gesto.',
    icon: 'katana',
    key: false,
    weapon: 'katana',
  },
  escudo: {
    name: 'Escudo de la guardia',
    desc: 'Escudo de lágrima con la cruz de Braga, casi borrada a golpes.',
    icon: 'shield',
    key: false,
  },
  palanca: {
    name: 'Palanca de hierro',
    desc: 'Barra de hierro de la fragua. Sirve para arrancar tablones clavados.',
    icon: 'crowbar',
    key: true,
  },
  llave_claustro: {
    name: 'Llave del claustro',
    desc: 'Llave de bronce ennegrecida. En la anilla, grabado: CLAVSTRVM.',
    icon: 'key',
    key: true,
  },
  manivela: {
    name: 'Manivela del rastrillo',
    desc: 'Manivela de hierro de un torno. Encaja en los mecanismos de reja de la ciudad.',
    icon: 'crank',
    key: true,
  },
  anillo: {
    name: 'Anillo del arzobispo',
    desc: 'Anillo pastoral de oro. El sello tiene la forma del sigilo pintado en las puertas.',
    icon: 'ring',
    key: true,
  },
  ampolla: {
    name: 'Ampolla vacía',
    desc: 'Frasco para las lágrimas de Santa Bárbara. Podrás llevar una ampolla más.',
    icon: 'flaskEmpty',
    key: false,
    upgrade: 'flask',
  },
  relicario: {
    name: 'Relicario de hueso',
    desc: 'Un hueso de santo en una caja de plata. Tu vitalidad aumenta.',
    icon: 'reliquary',
    key: false,
    upgrade: 'hp',
  },
  rosario: {
    name: 'Rosario del canónigo',
    desc: 'Cuentas de azabache de Santiago, gastadas de tanto pasarlas, con una cruz de plata ennegrecida. Al rezarlo se calma el aliento: tu aguante aumenta.',
    icon: 'rosary',
    key: false,
    upgrade: 'st',
  },
  piedra: {
    name: 'Piedra de afilar bendita',
    desc: 'Afilas la espada con ella. El acero recuerda para qué fue forjado. Tus golpes hacen más daño.',
    icon: 'whetstone',
    key: false,
    upgrade: 'dmg',
  },
};

export const NOTES = {
  carcelero: {
    title: 'Nota del carcelero',
    text: `Tercera noche del asedio.

Los de fuera ya no gritan. Cantan, toda la noche, frente a la muralla, en una lengua que no es de hombres.

El arzobispo bajó otra vez a la cripta con dos canónigos. Sólo subieron ellos dos.

Al preso de la primera celda lo dejo sin comer. Que Dios me perdone: no pienso abrir esa puerta.`,
  },
  madre: {
    title: 'Carta sin terminar',
    text: `Miguel, si vuelves:

Tu hermana dejó de toser anoche. Por la mañana estaba de pie junto a la ventana, mirando hacia la catedral. No contesta. No parpadea.

He clavado la puerta. Ya no sé si es para que no entren o para que no salga.`,
  },
  herrero: {
    title: 'Libro de cuentas del herrero',
    text: `Doce cotas de la guarnición para remendar. En tres había carne dentro. No de muerto: carne que crecía, cosida a las anillas, caliente.

Las eché a la fragua. Gritaron.

Dejo la palanca junto al yunque. Con ella se arrancan los tablones de la barricada de la Calle de los Pellejeros.`,
  },
  canonigo: {
    title: 'Diario del canónigo',
    text: `El arzobispo lo encontró bajo la cripta, en lo que dejaron los romanos: un altar sin nombre. DEO IGNOTO.

Dijo que era un regalo. Que nos protegería del asedio.

Los sitiadores no lo trajeron: lo oyeron. La campana de la catedral tocó sola la noche de la caída, y ellos abrieron nuestras puertas como si alguien los llamara.

Me quedo la llave del claustro. No volveré a bajar.`,
  },
  ama: {
    title: 'Nota del ama',
    text: `Señor canónigo, perdóneme.

Desde la noche de la campana ya no duerme en su cama. Baja a la bodega a rezar, y reza a cuatro patas, con la cara vuelta hacia el techo.

Anoche le oí crujir los huesos uno a uno, como quien parte leña. Después me llamó por mi nombre desde debajo de las tablas.

He echado la tranca y he puesto sal y velas en la puerta. Que Dios me perdone: me voy.`,
  },
  bodega: {
    title: 'Última página del canónigo',
    text: `No me arrodillaba lo bastante. Por eso no me oía.

Ahora me ha enseñado a rezar como Él quiere: más abajo, siempre más abajo. Los huesos estorbaban. Los he ido sacando de su sitio, uno a uno, para arrodillarme mejor.

Ya no me duelen. Ya casi no soy yo.

Tengo hambre. Ella me baja de comer por las noches. Buena mujer. Cierra la puerta al irse para que no me escape.

DEO IGNOTO. DEO IGNOTO. DEO IGNOTO.`,
  },
  pozo: {
    title: 'Orden del canónigo al maestro de obras',
    text: `Bájese el rastrillo de la cisterna vieja y que no se alce más con el torno. Cuélguese de tres cadenas, y cada cadena de una palanca: una en el Lagar, otra en la Cripta de los canónigos y la última al fondo del osario, donde el ramal ciego.

Sólo con las tres echadas sube la reja. Así nadie baja solo por los pates del pozo del Postigo, y nadie sube solo.

Dígale al ama que no baje de noche.`,
  },
  soldado: {
    title: 'Nota ensangrentada',
    text: `Las puertas de la catedral están atrancadas por dentro. Durante dos días oímos rezar al otro lado.

Después, sólo la campana.`,
  },
  claustro: {
    title: 'Lápida garabateada',
    text: `Enterramos aquí a los hermanos.

Al alba, la tierra estaba removida.

Desde dentro.`,
  },
  alcaide: {
    title: 'Últimas líneas del alcaide',
    text: `Día catorce del asedio.

Don Gonçalo Mendes guardaba el Postigo con veinte hombres. Los sitiadores lo clavaron a su propia puerta con una pica de asedio, y la puerta aguantó. Él también. Al alba seguía en pie, con el asta dentro, y ya no nos conocía.

Desde aquí arriba le oigo romperse por dentro. Algo más grande le crece debajo del hierro. Que Dios se apiade de quien le haga sangrar: lo que asome cuando se le caiga la armadura no será un hombre.

La manivela del torno abre también la reja de la cripta de la Sé. El arzobispo bajó con sus canónigos y no ha vuelto a subir. No pienso dársela a nadie.

He mandado alzar el puente de la torre. Que no suba nadie del patio.`,
  },
  guarnicion: {
    title: 'Libro de la guarnición',
    text: `Día nueve del asedio. Quedan en el castillo:

Hombres de armas, treinta y uno. Ballesteros, nueve. Heridos en la capilla, catorce.
Trigo, sesenta fanegas. Vino, once toneles. Cecina y tocino, lo que cuelga en el almacén de la torre.
El aljibe, a la mitad. Que nadie lave nada.
Bolaños para el fundíbulo, los que quedan en el patio.

Día once. Un tiro de los de fuera partió el fundíbulo. Otro se llevó la escalera del adarve norte: se sube por la torre.
Día doce. Matamos los caballos.
Día trece. Los heridos de la capilla ya no se quejan. No están muertos.`,
  },
  muralla: {
    title: 'Orden del alcaide',
    text: `Nadie abre el rastrillo del Postigo. NADIE.

Lo que está clavado en la puerta ya no es uno de los nuestros. Lo atravesaron con una pica y aun así sigue en pie.

Me llevo la manivela del torno conmigo. Que la busquen en mi cadáver.`,
  },
  romana: {
    title: 'Inscripción romana',
    text: `DEO IGNOTO

Debajo, en letra más antigua, alguien ha traducido a carbón:

«Lo que se ofrece a la oscuridad, la oscuridad lo devuelve multiplicado.»`,
  },
  arzobispo: {
    title: 'Últimas palabras del arzobispo',
    text: `Yo abrí la puerta. Le di la ciudad para salvarla.

El Turiferario guarda el camino al río. Arde por mí. Quema el incienso que yo le pedí.

Si eres tú, condenado, tú que no te arrodillaste: toma mi anillo y termina lo que yo no supe terminar.`,
  },
  tabernero: {
    title: 'Cuentas de la taberna del Cuervo',
    text: `Noche de la caída. Seis soldados del adarve. Bebieron sin hablar, mirando hacia la catedral.

Uno pidió que le sirviera también al que se sentaba a su lado. No había nadie a su lado. Le serví.

Pagaron con monedas todavía calientes. He cerrado la bodega: algo rasca las cubas desde dentro.`,
  },
  panadero: {
    title: 'Nota clavada en la artesa',
    text: `La masa no sube. Crece.

Esta mañana la artesa estaba llena hasta el borde y latía bajo el paño.

He encendido el horno para quemarla. Huele a pan. Dios mío, huele a pan.`,
  },
  tejedora: {
    title: 'Hilo para las mortajas',
    text: `Me encargaron doce mortajas para los del adarve. Cosí once.

La duodécima la tejo con el pelo de mi hija, porque el hilo se acabó y la tela sigue pidiendo más.

Si alguien lee esto: no descosáis nada. Lo que va dentro todavía se mueve.`,
  },
  mozo: {
    title: 'Tablilla del mozo de cuadra',
    text: `Los caballos no comen. Miran hacia la catedral y tiemblan.

Anoche el tordo del canónigo se tumbó y no volvió a levantarse. Esta mañana tenía ocho patas.

He echado la tranca de la puerta que da a los Pellejeros. Por aquí no entra nadie más.`,
  },
  celda: {
    title: 'Arañazos en la pared',
    text: `Alguien grabó con las uñas, una y otra vez:

NO TE ARRODILLES`,
  },
};

export const MSG = {
  intro: ['Braga.', 'Tercera noche después de la caída.'],
  lockedKey: (k) => `Cerrada con llave. Necesitas: ${k}.`,
  barred: 'Está atrancada desde el otro lado.',
  boarded: 'La puerta está cegada con tablones clavados. Necesitas algo para arrancarlos.',
  grate: 'Una reja de hierro cierra la escalera. El torno que la levanta no tiene manivela.',
  seal: 'Una losa con el sigilo del Pacto sella el paso. Tiene un hueco del tamaño de un anillo.',
  fog: 'Una niebla blanca y espesa bloquea el paso.',
  noExit: 'El rastrillo está bajado y una masa de carne lo ha soldado a la piedra. Por aquí no se sale.',
  southGate: 'La Puerta Sur está hundida bajo escombros y carne. No hay salida.',
  rastrillo: (n) =>
    n === 0
      ? 'Un rastrillo de hierro cierra la cisterna. Al otro lado, bajo una luz pálida que cae de lo alto, el agua negra de un pozo. De la reja suben tres cadenas que se pierden en la bóveda.'
      : `El rastrillo cuelga de tres cadenas; ${n === 1 ? 'una está tensa' : 'dos están tensas'}. Falta${n === 1 ? 'n dos palancas' : ' una palanca'}.`,
  palanca: (n) => (n >= 3 ? 'La tercera cadena se tensa. Por todas las bodegas retumba el rastrillo al subir.' : `La cadena se tensa y corre por la bóveda. En algún sitio, el rastrillo sube un palmo. (${n}/3)`),
  palancaHecha: 'La palanca ya está echada.',
  pozoCalle: 'El pozo del Postigo. Muy abajo gotea el agua… y algo más se mueve. Unos pates de hierro bajan por la pared del pozo.',
  hatchOpen: 'Descorres el cerrojo y levantas la trampilla. Una escalera de mano baja al almacén de la torre.',
  hatchShut: 'Una trampilla en el techo, atrancada desde arriba.',
  hatchDown: 'Bajas por la escalera de mano al almacén.',
  hatchUp: 'Subes por la escalera de mano al cuerpo de guardia.',
  puenteAlzado: 'El puente levadizo de la torre del homenaje está alzado. Sólo se baja con el torno, desde dentro.',
  puenteBaja: 'Sueltas el freno del torno. Con un estruendo de cadenas, el puente levadizo cae sobre el rellano.',
  escaleraRota: 'La escalera del adarve se vino abajo con un tiro de los trabucos. Arriba, los peldaños que quedan cuelgan de la muralla.',
  rest: 'Descansas ante el altar. Las velas vuelven a arder. Las criaturas regresan a sus puestos.',
  died: 'HAS CAÍDO',
};

export const AREA_NAMES = {
  prison: 'Mazmorras del castillo',
  castle: 'Patio de armas',
  catacumbas_castillo: 'Catacumbas del castillo',
  aljibe: 'Aljibe del castillo',
  torre_carcel: 'Torre de la cárcel',
  castle_gate: 'Puerta del castillo',
  cuartel: 'Cuartel de la tropa',
  homenaje: 'Torre del homenaje',
  homenaje_almacen: 'Almacén de la torre del homenaje',
  homenaje_guardia: 'Cuerpo de guardia',
  homenaje_alcaide: 'Sala del alcaide',
  homenaje_terraza: 'Terraza de la torre del homenaje',
  souto: 'Calle del Soto',
  praca: 'Plaza del Pan',
  ruase: 'Calle de la Catedral',
  largo: 'Plaza de la Catedral',
  cathedral: 'Catedral de Braga',
  cloister: 'Claustro de la Catedral',
  pelames: 'Calle de los Pellejeros',
  tanners: 'Curtidurías',
  canon: 'Casa del Canónigo',
  sotano: 'Bodegas del Canónigo',
  toneles: 'Galería de los toneles',
  pasillo: 'Antecámara de las bodegas',
  lagar: 'El Lagar',
  cripta: 'Cripta de los canónigos',
  cisterna: 'Cisterna del pozo',
  osario: 'Osario del canónigo',
  chapel: 'Capilla de San Fructuoso',
  muralla: 'Calle de la Muralla',
  ramparts: 'Adarve oriental',
  gatehouse: 'Torre del Postigo',
  postigo: 'Callejón del Postigo',
  ferraria: 'Calle de la Herrería',
  smithy: 'Fragua',
  souto_house: 'Casa tapiada',
  crypt: 'Cripta de la Catedral',
  ossuary: 'Osario',
  roman: 'Templo de Bracara',
  tomb: 'Sepulcro del arzobispo',
  arena: 'Cisterna del Dios Desconocido',
  tunnel: 'Galería del río',
  river: 'Orillas del río Este',
  castle_chapel: 'Capilla de la guarnición',
  callejon_pozo: 'Callejón del Pozo',
  pozo: 'Plazuela del Pozo',
  arco: 'Callejón del Arco',
  callejon_se: 'Travesía de la Sé',
  taberna: 'Taberna del Cuervo',
  tejedor: 'Obrador de la tejedora',
  horno: 'Patio del Horno',
  panaderia: 'Horno de pan',
  oratorio: 'Oratorio de Santa Bárbara',
  fragua_callejon: 'Callejón de la Fragua',
  tintoreros: 'Patio de los Tintoreros',
  tintoreria: 'Tintorería',
  corral: 'Corral de los Pellejeros',
  establo: 'Establo',
  adarve_norte: 'Adarve norte',
  torre_fanal: 'Torre del Fanal',
  atalaya: 'Atalaya de la coracha',
  coracha: 'La Coracha',
  coracha_torre: 'Torre de la coracha',
  adarve_castillo: 'Adarve del castillo',
};
