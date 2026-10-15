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
  solingen: {
    name: 'Espada de Solingen',
    desc: 'Espada del Sacro Imperio, forjada a orillas del Wupper, en Solingen, y traída a Braga por un cruzado de Colonia el año en que se tomó Lisboa. Hoja ancha con vaceo, guarda recta y pomo de rueda; en el acero, incrustado en hierro: + IN NOMINE DOMINI +. Corta un tercio más que la espada del carcelero.',
    icon: 'solingen',
    key: false,
    weapon: 'solingen',
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
  tablon: {
    name: 'Tablón',
    desc: 'Un tablón de pino, recio, con los clavos todavía torcidos donde estuvo. Basta uno para tapiar una ventana.',
    icon: 'plank',
    key: true,
  },
  martillo: {
    name: 'Martillo y clavos',
    desc: 'El martillo de Henrique y una bolsa de clavos de su fragua, cuadrados y largos como un dedo. Con un tablón, se tapia una ventana.',
    icon: 'hammer',
    key: true,
  },
  llave_sotano: {
    name: 'Llave del sótano',
    desc: 'Llave de hierro negro, grande y fría. La de la puerta de la escalera de la despensa, en la Casa del Alemán. Henrique no se atrevió a usarla.',
    icon: 'keyIron',
    key: true,
  },
  lagrima: {
    name: 'Lágrima de Leonor',
    desc: 'La última lágrima de Leonor, limpia, cuajada en una perla clara. Pesa más de lo que parece. Podrás llevar una ampolla más.',
    icon: 'tear',
    key: false,
    upgrade: 'flask',
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
  abuelo: {
    title: 'Carta del abuelo de Henrique',
    text: `En latín de clérigo, y debajo, en romance, de otra mano:

Yo, Heinrich, hijo de Konrad el espadero, de Solingen en el condado de Berg, crucé el mar con los de Colonia y vi caer Lisboa. Me quedé en esta tierra por una mujer de Braga y por su Dios, que es el mío.

La espada la forjó mi padre a orillas del Wupper y la bendijo el arzobispo de Colonia antes de embarcar. No la he desenvainado contra cristiano.

A mi nieto: que la saque sólo contra lo que no es de Dios.`,
  },
  leonor: {
    title: 'Oración de Leonor',
    text: `Señora de los Dolores, Madre que viste morir a tu Hijo: devuélveme al mío.

Siete noches te he rezado. Siete velas. Siete puñales tienes en el pecho y ninguno es por mi Tomé.

Tú callas. Henrique calla. Sólo la tierra me contesta: bajo la casa se oye cantar.

Dice que me lo devuelve si bajo a buscarlo. Que me lo devuelve multiplicado.

Voy a rezar más abajo.`,
  },
};

// Lo que dicen los personajes (en bocadillos sobre la cabeza).
export const DIALOG = {
  // asomado a la ventana alta mientras aporrean su puerta (al azar)
  henriqueWindow: [
    '¡Fuera! ¡Fuera de mi casa, engendros!',
    '¡No entraréis! ¡Por el alma de mi abuelo que no entraréis!',
    '¡Dios, si me oyes, manda a alguien!',
    '¡Leonor no está! ¡Aquí no hay nada para vosotros!',
  ],
  henriqueSee: '¡Tú! ¡Sí, tú, el de la espada! ¡Ayúdame, por lo que más quieras!',
  henriqueSaved: ['¡Gracias a Dios! ¡Espera, que bajo!'],
  henriqueDoor: ['¡Entra, rápido, antes de que vuelvan!'],
  henriqueShut: ['Escucha... Esos no eran todos.', 'Los oigo rascar las contraventanas. ¡Vienen más, por las ventanas!', '¡No dejes que lleguen a mí!'],
  // avisos durante la defensa: por dónde entran
  henriqueWin: {
    v_taller: '¡Por la ventana del taller!',
    v_despensa: '¡Por la despensa!',
    v_oeste: '¡Por el taller, el otro lado!',
    v_este: '¡Por la despensa, por detrás!',
    v_cocina: '¡Por la cocina!',
  },
  henriqueWave: ['¡Otra vez! ¡Ahí vienen otra vez!', '¡Más! ¡Dios mío, cuántos son!'],
  henriqueHurt: ['¡Ay, Dios!', '¡Ayúdame!', '¡Que me matan!'],
  henriqueHit: ['¡Toma, bestia!', '¡Fuera!', '¡A mi casa no!'],
  // ya a salvo: quién es y lo que pide
  henriqueLore: [
    'Se acabó... por ahora. Me llamo Henrique. Henrique Alemão, cuchillero, como mi padre y como el suyo.',
    'Mi abuelo vino del norte con los cruzados de Colonia, el año que se tomó Lisboa. Era de Solingen, a orillas del Wupper, donde se forjan las mejores hojas de la Cristiandad.',
    'Se quedó en Braga por una mujer. Y trajo consigo una espada del Sacro Imperio, forjada por su padre y bendecida por el arzobispo de Colonia.',
    'En la hoja aún se lee: IN NOMINE DOMINI. Nunca la ha tocado nadie más que nosotros.',
    'No me pidas que me vaya. ¿A dónde? Las puertas de la muralla están cerradas, y la Sé... ya sabes lo que hay en la Sé.',
    'Pero si me ayudas a hacer de esta casa un sitio seguro, a tapiar las ventanas que han roto, la espada de mi abuelo es tuya. Te lo juro por su alma.',
    'Clavos y martillo tengo: tómalos. Lo que me falta es madera. Busca tablones: en el taller del carpintero, aquí enfrente, y en el patio de la leña, detrás de la casa. Donde los haya.',
  ],
  // mientras faltan ventanas (n: las que faltan)
  henriqueBoards: (n) => [n === 1 ? 'Sólo falta una ventana. Una.' : `Faltan ${n} ventanas. Un tablón por ventana, y que aguante.`, 'Mira en el taller del carpintero, en el patio de la leña... y en el callejón, que esta noche hay de todo tirado.'],
  // todas tapiadas: la espada, la llave y Leonor
  henriqueReward1: ['Ahora sí. Que vengan, que se rompan los dientes contra la madera.', 'Te prometí la espada de mi abuelo. Tómala. Que haga contigo lo que hizo con él: volver vivo.'],
  henriqueReward2: [
    'Hay... hay algo más. No te lo he dicho antes porque me avergüenza.',
    'Mi mujer, Leonor, está en el sótano. Desde que se nos murió Tomé, de las fiebres del asedio, no comía, no dormía. Rezaba a la Dolorosa día y noche.',
    'Hace tres noches la oí bajar. Hablaba con alguien. Le pedía que le devolviera a su niño. Y algo le contestó desde debajo de la tierra. Hizo un trato con el diablo, te lo juro.',
    'Desde entonces llora. Llora sin parar, ahí abajo. Y ya no llora como una mujer.',
  ],
  henriqueReward3: ['Toma la llave del sótano. Yo no tengo valor.', 'Si todavía es ella... dale descanso.'],
  henriqueAfter: ['Ve con Dios. Yo me quedo aquí, junto al fuego, con lo que me queda.', 'La oigo llorar a través del suelo. Toda la noche.'],
  henriqueGrief: ['Ya no la oigo. Por fin calla.', 'Gracias. Que Dios se la lleve con nuestro Tomé.', 'Esa espada es tuya. Mi abuelo diría que está en buenas manos.'],
  // Leonor, en su gruta (sobre su cabeza)
  leonorIntro: ['Tomé... ¿eres tú, Tomé?', 'No... no eres él.'],
  leonorFight: ['¡Devuélvemelo!', 'Mi niño... mi niño...', '¿Por qué me lo quitaste?', '¡Dijo que me lo devolvía!', 'Tomé... Tomé...'],
  leonorDeath: ['...Henrique...'],
  // en la cuna, antes de la pelea: la nana (se oye desde el agujero)
  leonorLullaby: ['Duérmete, niño, duérmete ya...', 'Ea, ea, ea... que tu madre está aquí.', 'Mi niño no llora. Mi niño duerme.', 'Siete puñales, Señora... siete...'],
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
  carcelSube: 'Subes por la escalera de mano a la sala de los guardas.',
  carcelBaja: 'Bajas por la escalera de mano al cuerpo de guardia de la cárcel.',
  libroPresos:
    'El libro de presos. La última entrada, de otra mano y torcida: «El de la celda del fondo ya no come. Reza de noche, pero no a Dios. Los otros se arriman a la reja para no oírle.»',
  osarioLetrero: 'Sobre el altar de huesos, en letras negras: «NÓS OSSOS QUE AQUI ESTAMOS PELOS VOSSOS ESPERAMOS». Nosotros, los huesos que aquí estamos, por los vuestros esperamos.',
  puenteAlzado: 'El puente levadizo de la torre del homenaje está alzado. Sólo se baja con el torno, desde dentro.',
  puenteBaja: 'Sueltas el freno del torno. Con un estruendo de cadenas, el puente levadizo cae sobre el rellano.',
  escaleraRota: 'La escalera del adarve se vino abajo con un tiro de los trabucos. Arriba, los peldaños que quedan asoman de la torre, volados sobre el hueco.',
  rest: 'Descansas ante el altar. Las velas vuelven a arder. Las criaturas regresan a sus puestos.',
  doorAleman: 'Está atrancada por dentro. Al otro lado, alguien respira deprisa y reza en voz baja.',
  boardNoHammer: 'La contraventana está hecha astillas. Con un tablón, martillo y clavos se podría tapiar.',
  boardNoPlank: 'Te falta un tablón para tapiar esta ventana.',
  boardDone: (n) => (n > 0 ? `Clavas el tablón de través. Queda${n === 1 ? '' : 'n'} ${n} ventana${n === 1 ? '' : 's'} por tapiar.` : 'Clavas el último tablón. La casa está cerrada.'),
  henriqueFell: 'HENRIQUE HA CAÍDO',
  died: 'HAS CAÍDO',
};

export const AREA_NAMES = {
  prison: 'Mazmorras del castillo',
  castle: 'Patio de armas',
  catacumbas_castillo: 'Catacumbas del castillo',
  aljibe: 'Aljibe del castillo',
  torre_carcel: 'Torre de la cárcel',
  torre_carcel_alta: 'Sala de los guardas de la cárcel',
  castle_gate: 'Puerta del castillo',
  cuartel: 'Cuartel de la tropa',
  homenaje: 'Torre del homenaje',
  homenaje_almacen: 'Almacén de la torre del homenaje',
  homenaje_granero: 'Granero de la torre',
  homenaje_bodega: 'Bodega de la torre',
  homenaje_pozo: 'Pozo de la torre',
  homenaje_guardia: 'Cuerpo de guardia',
  homenaje_armeria: 'Armería',
  homenaje_ballestero: 'Taller del ballestero',
  homenaje_alcaide: 'Sala del alcaide',
  homenaje_escritorio: 'Escritorio del alcaide',
  homenaje_alcoba: 'Alcoba del alcaide',
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
  postigo: 'Patio del Postigo',
  callejon_postigo: 'Callejón del Postigo',
  casa_aleman: 'Casa del Alemán',
  sotano_aleman: 'Sótano del Alemán',
  gruta_leonor: 'La gruta de Leonor',
  carpinteria: 'Taller del carpintero',
  patio_lena: 'Patio de la leña',
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
