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
    desc: 'Anillo pastoral de oro. El sello tiene la forma del sigilo pintado en las puertas. El arzobispo lo usaba de llave.',
    icon: 'ring',
    key: true,
  },
  garra: {
    name: 'Garra de Oro',
    desc: 'Una mano de oro de cuatro dedos con garras, cortada por la muñeca: la que San Martín le quitó al ídolo. Pesa como el plomo y nunca se enfría. Es la llave de la Puerta del Dios Ignoto.',
    icon: 'claw',
    key: true,
  },
  incienso: {
    name: 'Incienso negro',
    desc: 'Una naveta de plata con granos de un incienso negro y graso. Huele a mirra y a carne. El arzobispo lo quemaba para su dios.',
    icon: 'incense',
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
  // Los objetos benditos de los osarios (game/relics.js): se lleva uno a la
  // vez; cada uno favorece una manera de pelear (pros) a cambio de otra (cons).
  saeta: {
    name: 'Saeta de San Sebastián',
    desc: 'Una punta de flecha negra en un relicario de plata con forma de brazo. La Hermandad de la guarnición la guardaba en su arca: la sacaron del cuerpo del santo, que la aguantó atado al poste y no murió de ella.',
    icon: 'saeta',
    key: false,
    relic: true,
    pros: ['Bloquear cuesta la mitad de aguante.', 'Con la guardia alzada recuperas el aguante como sin ella.', 'Los golpes que paras no te hieren.', 'Tras parar un golpe, el siguiente tuyo hace la mitad más de daño.'],
    cons: ['Las volteretas cuestan el doble de aguante y llegan más corto.', 'La ventana del parry se reduce casi a la mitad.'],
  },
  escapulario: {
    name: 'Escapulario del ama',
    desc: 'Dos paños de lana parda con la Virgen del Carmen bordada, unidos por dos cintas. El ama se lo colgó al canónigo de niño y él se lo arrancó la noche de la campana. Dicen que la Virgen aparta del golpe a quien lo lleva.',
    icon: 'escapulario',
    key: false,
    relic: true,
    pros: ['Las volteretas te hacen invulnerable más tiempo y cuestan menos.', 'Correr gasta la mitad de aguante.', 'Esquivar un golpe en el último instante detiene el tiempo un momento: tu siguiente golpe es crítico.'],
    cons: ['Tu vitalidad máxima baja un tercio.', 'Bloquear cuesta la mitad más de aguante.'],
  },
  obolo: {
    name: 'Óbolo de las Ánimas',
    desc: 'Una moneda de plata gastada, con un alma entre llamas grabada encima de la cruz. Los canónigos la echaban al cepillo de las ánimas olvidadas, las que no tienen quien rece por ellas. Ellas cobran, pero pagan.',
    icon: 'obolo',
    key: false,
    relic: true,
    pros: ['La vida que te quitan queda unos segundos en el aire: si golpeas, la recuperas.', 'Tus golpes son más rápidos.'],
    cons: ['Las ampollas curan la mitad.', 'Los golpes que recibes hacen más daño.'],
  },
  cerrojo: {
    name: 'Cerrojo de San Martín',
    desc: 'Un pasador de hierro negro, largo como un palmo, con la cruz de Martín grabada. Con él echó el santo el primero de los cuatro cerrojos, y los hermanos de Dumio lo guardaron en su arca. No se abre con él: se cierra.',
    icon: 'cerrojo',
    key: false,
    relic: true,
    pros: ['La ventana del parry dura mucho más.', 'Cada parry te devuelve todo el aguante.', 'Las criaturas grandes y los jefes quedan desequilibrados con un parry menos, y más tiempo.', 'El golpe de gracia hace el doble de daño.'],
    cons: ['No puedes bloquear: la guardia sólo sirve para desviar.'],
  },
};

export const NOTES = {
  animas: {
    title: 'Cuaderno del sacristán',
    text: `Día de Ánimas. Recogido el cepillo del osario: nada. Ya no baja nadie.

A los canónigos que tienen nombre les rezan los suyos, y sus óbolos son suyos: que nadie se los toque, que el muerto que tiene quien le nombre no suelta lo que es suyo.

Pero hay tres en los nichos que nadie nombra: a uno se le picó el nombre de la piedra, a otro no se le puso nunca y el último sólo tiene su cruz. Por esas ánimas, las más olvidadas, se echa en el cepillo el óbolo que se les puso en la boca, y así se les reza aunque nadie las recuerde.

Dicen los viejos que el retablo guarda algo para quien lo hace como es debido. Yo no lo he visto abrirse nunca.`,
  },
  nana: {
    title: 'La nana del ama',
    text: `(Una hoja doblada en cuatro, con letra de mujer que apenas sabe escribir.)

Para que no se me olvide, que ya se me van las cosas.

La nana que le cantaba al niño cuando no quería dormir, con la cajita que me dio su madre:

Cuando se va el sol, mi niño,
la luna sube a mirarte;
si oyes tocar la campana,
no es por ti, que no es por nadie.
Duerme, que el gallo te llama
cuando amanezca, y no antes.

Ahora ya no quiere que se la cante. Dice que la campana sí es por él.`,
  },
  hermandad: {
    title: 'Regla de la Hermandad de la Buena Muerte',
    text: `Capítulo noveno: del toque de alba.

Los hermanos de la guarnición que mueran en el servicio del castillo serán puestos en el osario, cada uno en su fila, con su yelmo, como estuvieron en vida.

Y cada alba el sargento pasará lista a los muertos como a los vivos, tañendo sus yelmos en el orden de la guardia: primero el que abre la puerta; luego el que vela en el muro; luego el que avisa desde lo alto; y al final el que baja a por el agua.

Que no se tañan fuera de su orden: se apagan las velas de los hermanos y se les quita el sueño.

Al que tañere bien la lista le abrirá la Hermandad su arca, donde guarda la saeta del bienaventurado San Sebastián, soldado y mártir, para quien la haya menester en la última guardia.`,
  },
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

Si eres tú, condenado, tú que no te arrodillaste: toma mi anillo y termina lo que yo no supe terminar. Abre con él mi sacristía, en la cripta de los mártires: se baja por la puerta de este sepulcro. Lo que queda del incienso negro está allí.`,
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
  sanmartin: {
    title: 'Lápida de San Martín de Dumio',
    text: `MARTINVS · EPISCOPVS · DVMIENSIS · ET · BRACARENSIS

Debajo, a carbón, en romance:

Martín de Panonia, apóstol de los suevos, que les quitó los ídolos de los montes y de las fuentes. Bajo su sede halló una puerta sin nombre y no la rompió: no se rompe lo que no se conoce.

La cerró con cuatro cerrojos. Le cortó la mano al ídolo. Le cerró las compuertas de las pilas, para que la sangre no le llegara. Le prohibió el humo. Y le puso delante a dos que se cubrieron la cara para no verle.

Que nadie los descorra.`,
  },
  garra: {
    title: 'Nota de un canónigo',
    text: `Le arrancamos la Garra a la cerradura entre los dos. Quemaba. La puerta se cerró sola y, al otro lado, él siguió cantando.

La devuelvo al relicario de San Martín, donde estuvo mil años. Hemos cerrado las compuertas de las tres pilas. Los Velados vuelven a velar. El incienso se queda en su sacristía, y sólo su anillo la abre: lo dejó él mismo en su sepulcro antes de bajar. Ya se daba por muerto.

Que nadie la saque de aquí. Los muertos de esta cámara la guardan mejor que nosotros.`,
  },
  pilas: {
    title: 'Inscripción de la sala de los obispos',
    text: `Grabado en latín, y debajo, a carbón, en romance:

TRES PILAS DE SANGRE TIENE EL DIOS: LA DE LOS INOCENTES, LA DE LOS MÁRTIRES Y LA DE LOS CONDENADOS. CUANDO CORREN, SU PUERTA BEBE.

Y más abajo, de otra mano: «La de los Inocentes, en lo más hondo de las catacumbas. La de los Mártires, en su cripta, tras el sepulcro del arzobispo. La de los Condenados, bajo la antesala, donde ya no se sube. Siete tirones de cadena cada compuerta».`,
  },
  velados: {
    title: 'Inscripción de los Velados',
    text: `Junto al pórtico, en letras romanas:

AQVI VELAN LOS QVE NO QVISIERON VER SV ROSTRO

Se cubrieron la cara para no ver al dios y, con la cara cubierta, le guardan la puerta. No se apartan sino ante el obispo de Braga. Nadie más la cruza mientras uno de los dos siga en pie.`,
  },
  confesion: {
    title: 'Inscripción de la Confesión',
    text: `Sobre la reja, en latín, y debajo, a carbón, en romance:

AQVI VELABA MARTIN LA FVENTE SIN NOMBRE

«Por esta reja miraba el santo el agua de abajo, noche tras noche, para que lo que duerme en ella supiera que alguien lo miraba.»

Y más abajo, reciente, de una mano que tiembla: «Ahora reza ahí dentro el arzobispo. No se vuelve. No deja de cantar.»`,
  },
  osario: {
    title: 'Inscripción del osario',
    text: `Sobre el altar de calaveras, en letras toscas:

LO QVE TV ERES FVIMOS; LO QVE SOMOS SERAS

Los monjes de San Martín, los que cavaron con él, quisieron quedarse junto a su puerta después de muertos. Los que vinieron detrás los apilaron aquí para hacer sitio, y siguieron velando.`,
  },
  rates: {
    title: 'Pintura del oratorio',
    text: `Bajo la pintura borrada de un obispo con la mano alzada:

SANCTVS PETRVS RATENSIS · PRIMVS EPISCOPVS BRACARENSIS

Dicen que fue el primero que predicó en Braga, cuando aún mandaban aquí los romanos y su dios sin nombre, y que lo mataron por ello. Los canónigos bajaban a rezarle cuando se moría uno de los suyos.

Las velas están encendidas. Alguien las cambia.`,
  },
  martires: {
    title: 'Inscripción de los mártires',
    text: `En el muro, una lista de nombres gastados y, al final, de letra más nueva:

«Los mártires de Braga, los que no quisieron echar incienso al dios de abajo. Aquí los trajeron a todos. La rueda, los garfios y la sangre se quedaron con ellos. Su sangre la guarda la pila de abajo: que no corra.»

Debajo, a punta de cuchillo: «La noche de la caída bajó el arzobispo por aquí, solo, con su anillo y su incensario.»`,
  },
  incienso: {
    title: 'Libro del rito, de mano del arzobispo',
    text: `Lo que San Martín cerró, yo lo abro.

Cuatro cerrojos le echó el santo. Le cortó la mano al ídolo y la escondió con los inocentes. Cerró las compuertas de las tres pilas, para que la sangre no llegara a la puerta. Puso a los Velados delante. Y prohibió el humo, porque el dios no oye: huele.

Los Velados se apartan ante el obispo de Braga, y el obispo soy yo. La Garra la tengo. Las pilas correrán.

El humo: incienso negro, mirra y lo que Él pide. Se echa al incensario grande, el que cuelga ante su puerta. Guardo aquí lo que queda.`,
  },
  paio: {
    title: 'Breviario de Dom Paio',
    text: `Entre los salmos, a carbón, con la letra cada vez más torcida:

«Tercera noche. Mendo no ha vuelto del relicario. Le dejé allí con la Garra, como quiso. Cuando salí, los huesos de los nichos se movían.

Los Velados han caído. Lo he oído desde aquí: la piedra gritaba. Ya no queda nadie entre la puerta y la ciudad. Sólo las compuertas.

Me llama. Sabe mi nombre, el de pila, el que me puso mi madre. Dice que Mendo está con Él y que ya no le quema.

Bajo al pozo. La cadena de los Condenados no la echará nadie mientras yo pueda tenerla. Que no corra. Que no corra.»`,
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
  // Dom Paio, el canónigo que bajó tras el arzobispo (en la capilla de San
  // Martín, y luego en el pozo)
  paioSee: '¿Quién anda ahí? ¡Atrás! ¡Atrás, en nombre de San Martín!',
  paioPray: ['Sancte Martine, ora pro nobis...', 'Miserere mei, Deus...', 'De profundis clamavi ad te, Domine...', 'Requiem aeternam dona eis, Domine...', 'Libera nos a malo...'],
  paioMeet: [
    '...No. No eres de los suyos. Los suyos no traen la cara descubierta.',
    'Soy Paio, canónigo de esta Sé. O lo que queda de él. Llevo tres noches aquí abajo, con el santo.',
    'Bajamos dos tras el arzobispo: Mendo y yo. Cuando llegamos, la puerta ya estaba abierta, y él dentro, cantando.',
    'Le arrancamos la Garra a la cerradura y la puerta se cerró sola. Quemaba. A Mendo se le quedó pegada a las manos, y no la soltó hasta el relicario.',
    'Allí se quedó, con ella. Los muertos de esa cámara la guardan mejor que nosotros.',
  ],
  paioMeet2: [
    'Tú... tú eres el preso. El de la primera celda. El que no se arrodilló.',
    'El arzobispo hablaba de ti. Decía que tú terminarías lo que él empezó. No sé si eso es una gracia o una condena.',
    'Mientras él siga cantando ahí dentro, la ciudad no despierta. Si de verdad vas a abrir esa puerta, que sea para hacerle callar.',
  ],
  // lo que le falta a la puerta (uno cada vez que se le habla)
  paioHint: {
    garra: ['La Garra está en el relicario de San Martín, con los Inocentes. Se baja por la sala de los obispos a las catacumbas, y de allí, más abajo.', 'Ten cuidado. En esa cámara los huesos no descansan.'],
    oeste: ['La pila de los Inocentes está en lo más hondo de las catacumbas, junto al relicario. Siete tirones de cadena.', 'La cerramos Mendo y yo con estas manos. Ábrela tú, si tienes que hacerlo.'],
    este: ['La pila de los Mártires está en su cripta: se baja por el sepulcro del arzobispo. Siete tirones de cadena.'],
    incienso: ['El incienso negro se quedó en su sacristía, en la cripta de los mártires. Sólo su anillo la abre, y el anillo lo dejó en su sepulcro.', 'Ya se daba por muerto cuando bajó.'],
    velados: ['Los Velados están al otro lado del pórtico. No se apartan más que ante el obispo de Braga.', 'Tendrás que tumbarlos a los dos. La pila de los Condenados está debajo de ellos.'],
  },
  paioRest: ['Yo me quedo aquí, con el santo. Alguien tiene que rezarle.', 'Si caes, vuelve a esta capilla. San Martín no le cierra la puerta a nadie.'],
  // convertido, en el pozo
  paioHollowIntro: ['Que no corra... que no corra...', '¡No la echarás! ¡Nadie la echa!'],
  paioHollowFight: ['¡Que no corra!', 'Mendo... ¿me oyes, Mendo?', 'Sabe mi nombre... sabe mi nombre...', 'De profundis... de profundis...', '¡Atrás, en nombre de...! ¿De quién?'],
  paioHollowRage: '¡QUE NO CORRA! ¡QUE NO CORRA LA SANGRE!',
  paioLitany: ['Kyrie eleison...', 'Ora pro nobis... ora...', 'Agnus Dei...'],
  paioHollowDeath: '...Mendo. Ya no quema.',

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
  osarioLetrero: 'En lo alto de los muros, sobre las filas de los hermanos, en letras negras: «NÓS OSSOS QUE AQUI ESTAMOS PELOS VOSSOS ESPERAMOS». Nosotros, los huesos que aquí estamos, por los vuestros esperamos.',
  // el osario de las ánimas (la cripta de la Sé)
  cepilloVacio: 'El cepillo de las ánimas, con su ranura y su candado. Pintado en la tabla, debajo: «POR LAS ÁNIMAS QUE NADIE NOMBRA».',
  oboloUno: 'Llevas un óbolo.',
  obolos: (k) => `Llevas ${k} óbolos.`,
  animaReclama: 'Algo frío te cierra la mano. Los óbolos que llevabas vuelven, uno a uno, a sus bocas.',
  cepilloCae: 'Los óbolos caen al fondo del cepillo.',
  animasBien: 'El último óbolo cae en el cepillo. Detrás de las llamas pintadas, algo se descorre: se abre la portezuela de la predela.',
  // el osario de las bodegas (la nana del ama)
  nanaCaja: 'La caja de música del ama: cuatro rodillos con sus símbolos pintados, una manivela y un cajón cerrado. Cada vuelta suena como un hueso que salta.',
  nanaMal: 'La caja se atasca a media nana. Por la bodega, el eco tarda en irse.',
  nanaBien: 'La caja toca la nana entera, despacio, hasta la última nota. El cajón se abre solo.',
  campanaPorMi: 'Arañado en la piedra, una y otra vez, con la letra del canónigo: «LA CAMPANA SÍ ES POR MÍ».',
  // el osario de la guarnición (el toque de alba)
  arcaCerrada: 'El arca de la Hermandad. Una barra de hierro le atraviesa la tapa, pasada por dos grapas y cerrada con un candado en forma de calavera. No tiene ojo para llave.',
  toqueMal: 'Un soplo frío baja por la escalera y apaga las velas de los hermanos.',
  toqueBien: 'Los cuatro yelmos suenan a la vez. La barra del arca se descorre sola.',
  puenteAlzado: 'El puente levadizo de la torre del homenaje está alzado. Sólo se baja con el torno, desde dentro.',
  puenteBaja: 'Sueltas el freno del torno. Con un estruendo de cadenas, el puente levadizo cae sobre el rellano.',
  escaleraRota: 'La escalera del adarve se vino abajo con un tiro de los trabucos. Arriba, los peldaños que quedan asoman de la torre, volados sobre el hueco.',
  rest: 'Descansas ante el altar. Las velas vuelven a arder. Las criaturas regresan a sus puestos.',
  doorAleman: 'Está atrancada por dentro. Al otro lado, alguien respira deprisa y reza en voz baja.',
  boardNoHammer: 'La contraventana está hecha astillas. Con un tablón, martillo y clavos se podría tapiar.',
  boardNoPlank: 'Te falta un tablón para tapiar esta ventana.',
  boardDone: (n) => (n > 0 ? `Clavas el tablón de través. Queda${n === 1 ? '' : 'n'} ${n} ventana${n === 1 ? '' : 's'} por tapiar.` : 'Clavas el último tablón. La casa está cerrada.'),
  henriqueFell: 'HENRIQUE HA CAÍDO',
  // la Puerta del Dios Ignoto (game/crypt.js)
  godDoor: 'Dos hojas de piedra negra, más altas que tres hombres. En ellas, un pentáculo invertido dentro de un círculo de signos que nadie sabe leer. Sobre el dintel, tres cabezas con los ojos vacíos y una inscripción: DEO IGNOTO. Al dios desconocido.',
  godGuards: 'Los Velados la guardan. Mientras uno de los dos siga en pie, nadie la cruza.',
  godGuardsDown: 'Los Velados han caído. Ya no la guarda nadie.',
  godClaw: 'En el centro del pentáculo hay una cerradura redonda con la huella de una mano de cuatro dedos, con garras. Está vacía.',
  godClawFits: 'En el centro del pentáculo hay una cerradura redonda con la huella de una mano de cuatro dedos, con garras. La Garra de Oro encajaría en ella.',
  godBlood: (n) =>
    n === 0
      ? 'Las cinco puntas del pentáculo acaban en cinco círculos huecos, secos. Unos surcos bajan hacia ellos desde lo alto de la puerta, y otro sube desde el suelo.'
      : n < 5
        ? `De los cinco círculos de las puntas, ${n === 1 ? 'uno está lleno' : n + ' están llenos'} de sangre. ${n === 4 ? 'El otro sigue seco.' : 'Los otros siguen secos.'}`
        : 'Los cinco círculos de las puntas están llenos de sangre. El pentáculo arde.',
  godSmoke: 'Ante la puerta, sobre el estrado, cuelga un incensario enorme. Está frío.',
  godSmokeOn: 'El humo negro del incensario se arrastra por el estrado hasta la puerta y se cuela por sus juntas.',
  godSealed: 'Los cinco círculos están llenos. Sobre la puerta, la inscripción arde.',
  godOpen: 'Giras la Garra en la cerradura. Desde muy hondo, la piedra contesta.',
  godOpenArea: 'DEO IGNOTO',
  censerCold: 'Un incensario de bronce, enorme, colgado de la bóveda por una sola cadena. Las brasas están frías. Huele a un incienso que no es de iglesia.',
  censerLight: 'Echas el incienso negro a la boca del incensario. Prende solo. El humo no sube: se arrastra hacia la puerta.',
  censerLit: 'El incensario se mece solo. Su humo negro se arrastra hacia la puerta.',
  fontDone: (name, n) => `Tiras de la cadena hasta el final. La compuerta se abre y la pila de ${name} se vacía por el sumidero, camino de la puerta. (${n}/3)`,
  chainGuarded: 'Dom Paio guarda la cadena. Mientras siga en pie, no la echarás.',
  clawAmbush: 'Una reja cae a tu espalda. En los sepulcros, algo se mueve.',
  clawFree: 'La reja vuelve a subir.',
  died: 'HAS CAÍDO',
};

export const AREA_NAMES = {
  prison: 'Mazmorras del castillo',
  castle: 'Patio de armas',
  catacumbas_castillo: 'Catacumbas del castillo',
  osario_castillo: 'Osario de la Hermandad',
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
  nana: 'Capilla del ama',
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
  confesion: 'Confesión de San Martín',
  obispos: 'Sala de los Obispos',
  martin: 'Cripta de San Martín',
  capilla_martin: 'Capilla de San Martín',
  osario_martin: 'Osario de San Martín',
  catacumbas: 'Catacumbas de la Sé',
  lucernario: 'Lucernario de San Pedro de Rates',
  inocentes: 'Catacumba de los Inocentes',
  pila_oeste: 'Pila de los Inocentes',
  garra: 'Relicario de San Martín',
  antesala: 'Antesala del Dios Ignoto',
  pila_honda: 'Pozo de los Condenados',
  catacumbas_este: 'Cripta de los Mártires',
  pila_este: 'Pila de los Mártires',
  sacristia: 'Sacristía del arzobispo',
  ossuary: 'Osario de las Ánimas',
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
