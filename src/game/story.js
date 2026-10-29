// Textos del juego: objetos, documentos y mensajes. Breves, como pidió el diseño:
// la historia se cuenta sobre todo con el escenario.

export const ITEMS = {
  // Armas (weapon: id en src/entities/weapons.js). El hacha y la lanza
  // todavía no están colocadas en el mundo. El facón y la katana no son de
  // su tiempo (el juego pasa en 1167): no se colocan; quedan para algún
  // guiño escondido.
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
    desc: 'Barra de hierro de la fragua de maese Lourenço, con la uña partida. Sirve para arrancar tablones clavados.',
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
    desc: 'Un tablón de pino, largo y recio, con los clavos todavía torcidos donde estuvo. Basta uno para tapiar una ventana, o para salvar un hueco.',
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
    text: `Duodécima noche del asedio.

Los de fuera ya no gritan. Cantan, toda la noche, frente a la muralla, y no en su lengua: en una que no es de hombres.

El arzobispo bajó otra vez a la cripta con dos canónigos. Sólo subieron ellos dos.

Al preso de la primera celda lo dejo sin comer. Ya no es un hombre. Que Dios me perdone: no pienso abrir esa puerta.`,
  },
  madre: {
    title: 'Carta sin terminar',
    text: `Miguel, si vuelves:

Tu hermana dejó de toser anoche. Por la mañana estaba de pie junto a la ventana, mirando hacia la catedral. No contesta. No parpadea.

He clavado la puerta. Ya no sé si es para que no entren o para que no salga.

Voy a buscarte a la muralla. Si vuelves antes que yo, no la abras.`,
  },
  recetario: {
    title: 'Recetario de Joana, la herbolera',
    text: `Para la tos, tomillo, malva y miel, tres veces al día. Para las calenturas, corteza de sauce. Para el mal de ojo, ruda, y no contárselo a nadie.

Al final, de otra tinta y con prisa:

Inés, primera noche. Tose sangre negra. Cataplasma de mostaza, agua de llantén.
Segunda noche. Ya no quiere caldo. Pide carne cruda. No se la doy.
Tercera noche. Ya no tose. Ya no respira. Pero se levanta.

No hay hierba para esto.`,
  },
  miguel: {
    title: 'Escrito a carbón en una duela',
    text: `Me llamo Miguel, hijo de Joana, la de las hierbas, y de Afonso, que en paz descanse. Tonelero. Lo escribo para no olvidarlo: ya se me van las palabras.

Catarina, te pido perdón. No te lo puedo pedir de otra manera.

Madre, arranqué las tablas del pasadizo para no ir a buscarte. No las vuelvas a poner.

Lo hago ahora, mientras todavía soy yo.`,
  },
  velatorio: {
    title: 'Escrito con carbón en el muro del velatorio',
    text: `(Nombres, uno debajo de otro, con letras distintas. Al lado de cada uno, una cruz.)

Vasco, el pellejero viejo. El martes de la campana.
Mor, su mujer. El miércoles.
La niña de Aldonza, que no tenía nombre todavía.
Gonzalo, el aprendiz del curtidor. El jueves.
Pedro Anes, que bajó a por agua y no volvió entero.
Joana, la de los cueros.

(Debajo, con otra letra, más grande:)

Los hemos lavado y cosido con hilo doble, y atados por si acaso. Que Dios nos perdone si no está bien hecho.

(Y más abajo, torcido:)

SE MUEVEN`,
  },
  vecinos: {
    title: 'Papel en la mesa del sobrado',
    text: `Lo dejo escrito por si vuelve Fernán de la muralla y no nos encuentra.

Estamos todos en el sobrado de los Anes: los del pellejero, los del curtidor, Tomé el de la fragua, mi madre y yo. Hemos subido la escalera y hemos tapado la trampilla con el arcón.

Abajo, en el velatorio, rascan. Toda la noche. Se oye el hilo, cómo se rompe.

Esta tarde han roto la pared del pellejero. Ya están en su taller. Hemos tumbado el armario contra el boquete de arriba.

Tomé dice que por los tejados se llega al palomar, que allí hay grano y agua de lluvia, y que desde allí se baja a las Curtidurías, detrás de la barricada. Mañana, con luz, nos vamos.

Aldonza`,
  },
  desvan: {
    title: 'Escrito con carbón en una viga del desván',
    text: `(Una flecha, dibujada con carbón, apunta a la puerta del secadero.)

Por aquí. Al secadero, y por la escalera de tablas, al palomar. Del palomar, por la cumbrera de al lado y el tablón, al tejado del curtidor.

No corráis. Los de las mortajas no ven: oyen.

Los cuervos sí ven.

Tomé`,
  },
  aprendiz: {
    title: 'Rayado en la pared del palomar',
    text: `(Con la punta de algo de hierro, en la cal, letras grandes de quien no sabe escribir bien.)

TOME DE LA FRAGUA

Los demas se fueron por el tablon. Yo me quede con la piedra porque maese Lourenço me dijo que no la soltara.

Entran por la ventana. Son muchos. Tienen tres ojos.

Si la encuentras afila lo que lleves y bajate de los tejados. No te pares.`,
  },
  herrero: {
    title: 'Libro de cuentas del herrero',
    text: `Doce cotas de la guarnición para remendar. En tres había carne dentro. No de muerto: carne que crecía, cosida a las anillas, caliente.

Las eché a la fragua. Gritaron.

Clavos para las puertas de media ciudad, y para la barricada de los Pellejeros, que los soldados apuntalaron por el otro lado: desde aquí ya no la mueve nadie.

Los de la casa de enfrente se han encerrado con sus muertos y han clavado la puerta. Van de una casa a otra por dentro, y por los tejados, como los gatos. Al chico le he dado la piedra bendita, para que afile lo que lleve. Se ha ido con ellos.

Esta mañana me ha salido en el brazo. La fragua está caliente.

Dejo la palanca en el yunque.

Lourenço, herrero.`,
  },
  canonigo: {
    title: 'Diario del canónigo',
    text: `El arzobispo lo encontró bajo la cripta, en lo que dejaron los romanos: un altar sin nombre. DEO IGNOTO.

Dijo que era un regalo. Que San Pablo ya lo había anunciado en Atenas: al dios desconocido. Que nos protegería del asedio.

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
  huesos: {
    title: 'Inscripción de la capilla de los huesos',
    text: `En la lápida de encima del altar, en letras negras, en la lengua de aquí:

NÓS OSSOS QUE AQUI ESTAMOS PELOS VOSSOS ESPERAMOS

Y debajo, a carbón, alguien lo ha pasado a romance:

«Nosotros, los huesos que aquí estamos, por los vuestros esperamos.»`,
  },
  romana: {
    title: 'Inscripción romana',
    text: `DEO IGNOTO

Debajo hubo más, en letra más antigua, pero alguien lo picó a cincel hace mucho: sólo quedan las muescas.

Y debajo, a carbón, de una mano reciente y firme:

«Lo que vosotros adoráis sin conocerlo, eso os anuncio yo.»`,
  },
  arzobispo: {
    title: 'Últimas palabras del arzobispo',
    text: `Esta noche bajo a la fuente que cerró Martín. Me ha hablado desde el agua: salvará Braga si alguien baja a pedírselo de rodillas.

Si no vuelvo, otro terminará lo que yo empiece. Me ha dicho quién: el preso de la celda del fondo, bajo el castillo. El que no se arrodilla.

Si eres tú, condenado, toma mi anillo. Abre con él mi sacristía, en la cripta de los mártires: se baja por la puerta de este sepulcro. Lo que queda del incienso negro está allí.`,
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
    title: 'En la pared de la celda',
    text: `Con sangre, a dedo, una y otra vez, por las cuatro paredes:

NO TE ARRODILLES

En algunas letras se ha quedado pegada una uña.

Te miras las manos.`,
  },
  // (el id se queda: es el que guardan las partidas)
  abuelo: {
    title: 'Carta del padre de Henrique',
    text: `En latín de clérigo, y debajo, en romance, de otra mano:

Yo, Heinrich, hijo de Konrad el espadero, de Solingen en el condado de Berg, crucé el mar con los de Colonia y vi caer Lisboa. Me quedé en esta tierra por una mujer de Braga y por su Dios, que es el mío.

La espada la forjó mi padre a orillas del Wupper y la bendijo el arzobispo de Colonia antes de embarcar. No la he desenvainado contra cristiano.

A mi hijo: que la saque sólo contra lo que no es de Dios.`,
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
    title: 'Inscripción del panteón de los obispos',
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

Y más abajo, reciente, de una mano que tiembla: «Ya no se ve el agua. Lo de abajo ha subido y tapa la reja con la espalda. Ahora reza ahí dentro el arzobispo. No se vuelve. No deja de cantar.»`,
  },
  osario: {
    title: 'Inscripción del osario',
    text: `Tallada en la piedra, bajo un arco de herradura de fémures, en letras toscas:

LO QVE TV ERES FVIMOS; LO QVE SOMOS SERAS

Los monjes de Dumio, los que cavaron la cripta con San Martín, quisieron quedarse junto a su puerta después de muertos. Están de pie en sus nichos, con su hábito, y en medio de todos dejaron una fosa abierta: la del siguiente.`,
  },
  dumio: {
    title: 'De los hermanos que cavaron con Martín',
    text: `(Copiado de la crónica de Dumio, en una hoja suelta.)

Cuatro hermanos cavaron con Martín la cripta bajo su sede, y los cuatro velan en su osario con lo suyo en las manos, mirando a lo que guardaron en vida:

Fray Ordoño, el portero, con su farol, a la puerta, para que no entre el siglo.

Fray Vimara, el lector, con su libro, a la palabra escrita en el muro.

Fray Tructino, el cavador, con su pico, a la fosa, que es nuestra casa.

Fray Sisnando, el que contaba las horas, con su reloj, al arca de Martín, donde se guarda lo que se acaba.

Los que vinieron detrás los movieron para hacer sitio y les dejaron la cabeza gacha. Dicen que el arca no se abrirá mientras no vuelva a mirar cada uno a lo suyo.`,
  },
  rates: {
    title: 'Losa del oratorio',
    text: `En una losa, junto al fresco del obispo de rodillas ante su altar y del soldado que le levanta la espada por detrás:

SANCTVS PETRVS RATENSIS · PRIMVS EPISCOPVS BRACARENSIS

Dicen que fue el primero que predicó en Braga, cuando aún mandaban aquí los romanos y su dios sin nombre, y que lo mataron rezando. Los canónigos bajaban a rezarle cuando se moría uno de los suyos y le colgaban cera: un brazo, una pierna, una cabeza; lo que el santo hubiera de curar.

Las velas están encendidas. Alguien las cambia.`,
  },
  martires: {
    title: 'Inscripción de los mártires',
    text: `En el muro, una lista de nombres gastados y, al final, de letra más nueva:

«Los mártires de Braga, los que no quisieron echar incienso al dios de abajo. Aquí los trajeron a todos. La rueda, los garfios y la sangre se quedaron con ellos. Su sangre la guarda la pila de abajo: que no corra.»

Debajo, a punta de cuchillo: «La noche de la caída bajó el arzobispo por aquí, solo, con su incensario y algo de oro envuelto en la estola.»`,
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

Dice que me lo devuelve si bajo a buscarlo.

Voy a rezar más abajo.`,
  },
};

// Lo que dicen los personajes (en bocadillos sobre la cabeza).
export const DIALOG = {
  // asomado a la ventana alta mientras aporrean su puerta (al azar)
  henriqueWindow: [
    '¡Fuera! ¡Fuera de mi casa, engendros!',
    '¡No entraréis! ¡Por el alma de mi padre que no entraréis!',
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
    'Se acabó... por ahora. Me llamo Henrique. Henrique Alemão, cuchillero, como mi padre. Y su padre forjaba espadas.',
    'Mi padre vino del norte con los cruzados de Colonia, el año que se tomó Lisboa. Era de Solingen, a orillas del Wupper, donde se forjan las mejores hojas de la Cristiandad.',
    'Se quedó en Braga por una mujer. Y trajo consigo una espada del Sacro Imperio, forjada por su padre y bendecida por el arzobispo de Colonia.',
    'En la hoja aún se lee: IN NOMINE DOMINI. Nunca la ha tocado nadie más que nosotros.',
    'No me pidas que me vaya. ¿A dónde? Las puertas de la muralla están cerradas, y la Sé... ya sabes lo que hay en la Sé.',
    'Pero si me ayudas a hacer de esta casa un sitio seguro, a tapiar las ventanas que han roto, la espada de mi padre es tuya. Te lo juro por su alma.',
    'Clavos y martillo tengo: tómalos. Lo que me falta es madera. Busca tablones: en el taller del carpintero, aquí enfrente, y en el patio de la leña, detrás de la casa. Donde los haya.',
  ],
  // mientras faltan ventanas (n: las que faltan)
  henriqueBoards: (n) => [n === 1 ? 'Sólo falta una ventana. Una.' : `Faltan ${n} ventanas. Un tablón por ventana, y que aguante.`, 'Mira en el taller del carpintero, en el patio de la leña... y en el callejón, que esta noche hay de todo tirado.'],
  // todas tapiadas: la espada, la llave y Leonor
  henriqueReward1: ['Ahora sí. Que vengan, que se rompan los dientes contra la madera.', 'Te prometí la espada de mi padre. Tómala. Que haga contigo lo que hizo con él: volver vivo.'],
  henriqueReward2: [
    'Hay... hay algo más. No te lo he dicho antes porque me avergüenza.',
    'Mi mujer, Leonor, está en el sótano. Desde que se nos murió Tomé, de las fiebres del asedio, no comía, no dormía. Rezaba a la Dolorosa día y noche.',
    'Hace tres noches la oí bajar. Hablaba con alguien. Le pedía que le devolviera a su niño. Y algo le contestó desde debajo de la tierra. Hizo un trato con el diablo, te lo juro.',
    'Desde entonces llora. Llora sin parar, ahí abajo. Y ya no llora como una mujer.',
  ],
  henriqueReward3: ['Toma la llave del sótano. Yo no tengo valor.', 'Si todavía es ella... dale descanso.'],
  henriqueAfter: ['Ve con Dios. Yo me quedo aquí, junto al fuego, con lo que me queda.', 'La oigo llorar a través del suelo. Toda la noche.'],
  henriqueGrief: ['Ya no la oigo. Por fin calla.', 'Gracias. Que Dios se la lleve con nuestro Tomé.', 'Esa espada es tuya. Mi padre diría que está en buenas manos.'],
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
  // (te conoce por lo que canta el arzobispo, que se oye por la reja de la
  // Confesión; y te avisa: nadie sabe lo que hay detrás de la puerta)
  paioMeet2: [
    'Tus manos... Tú eres el preso de la celda del fondo, bajo el castillo. El que no se arrodilla.',
    'Lo sé porque él canta de ti. Por la reja de la Confesión se le oye, noche tras noche: canta que vendrás.',
    'Canta que caerás muchas veces, y que cada vez te levantarán. No sé quién. No sé si eso es una gracia o una condena.',
    'Escúchame bien: no sabes lo que hay detrás de esa puerta. Yo tampoco. Nadie lo sabe. El arzobispo creía saberlo.',
    'Mientras él siga cantando, la ciudad no despierta. Si abres esa puerta, que sea para hacerle callar.',
    'Y no te creas más fuerte que lo que te espera. Eso mismo creía él.',
  ],
  // lo que le falta a la puerta (uno cada vez que se le habla)
  paioHint: {
    garra: ['La Garra está en el relicario de San Martín, con los Inocentes. Se baja por el panteón de los obispos a las catacumbas, y de allí, más abajo.', 'Ten cuidado. En esa cámara los huesos no descansan.'],
    oeste: ['La pila de los Inocentes está en lo más hondo de las catacumbas, junto al relicario. Siete tirones de cadena.', 'La cerramos Mendo y yo con estas manos. Ábrela tú, si tienes que hacerlo.'],
    este: ['La pila de los Mártires está en su cripta: se baja por el sepulcro del arzobispo. Siete tirones de cadena.'],
    incienso: ['El incienso negro se quedó en su sacristía, en la cripta de los mártires. Sólo su anillo la abre, y el anillo lo dejó en su sepulcro.', 'Ya se daba por muerto cuando bajó.'],
    velados: ['Los Velados están al otro lado del pórtico. No se apartan más que ante el obispo de Braga.', 'Tendrás que tumbarlos a los dos. La pila de los Condenados está debajo de ellos.'],
  },
  paioRest: ['Yo me quedo aquí, con el santo. Alguien tiene que rezarle.', 'Si caes, te levantarás en alguna capilla. Reza por que sea el santo quien te levanta.'],
  // convertido, en el pozo
  paioHollowIntro: ['Que no corra... que no corra...', '¡No la echarás! ¡Nadie la echa!'],
  paioHollowFight: ['¡Que no corra!', 'Mendo... ¿me oyes, Mendo?', 'Sabe mi nombre... sabe mi nombre...', 'De profundis... de profundis...', '¡Atrás, en nombre de...! ¿De quién?'],
  paioHollowRage: '¡QUE NO CORRA! ¡QUE NO CORRA LA SANGRE!',
  paioLitany: ['Kyrie eleison...', 'Ora pro nobis... ora...', 'Agnus Dei...'],
  paioHollowDeath: '...Mendo. Ya no quema.',

  // Miguel, el tonelero, el hijo de la casa tapiada: infectado, en un rincón
  // de su alcoba. No ataca: grita que te vayas (game/souto.js)
  // (para sí, llorando, cuando no le ves o estás lejos)
  miguelSob: [
    'Me llamo Miguel. Miguel, el tonelero. El hijo de Joana.',
    'No tengo hambre. No tengo hambre. No tengo hambre.',
    'Catarina... perdóname, Catarina.',
    'Dios te salve, María, llena eres de... de...',
    'Todavía soy yo. Todavía.',
    'Me crecen los dientes. Los noto con la lengua.',
    'Arranqué las tablas. Que no cruce nadie. Que no cruce yo.',
    'Toda la casa huele a ella.',
    'Madre... ¿dónde estás, madre?',
    'La campana no. Que no suene la campana.',
    'Tengo las manos frías. Ya no son mías.',
  ],
  // te ve
  miguelSee: '¿Quién anda ahí...? ¡No! ¡No te acerques!',
  // a unos pasos: que te vayas
  miguelWarn: ['¡Quieto ahí! ¡Ni un paso más!', '¡Vete! ¡Déjame solo!', 'Te oigo el corazón desde aquí. Vete, por Dios.', 'No sé cuánto me queda de mí. No me lo gastes.'],
  // demasiado cerca
  miguelNear: ['¡VETE! ¡NO VOY A PODER!', '¡Atrás! ¡No me fío de mis manos!', '¡Te huelo! ¡Vete, vete, vete!', '¡No me mires la boca!', '¡No... no... NO!'],
  // a distancia, entre ruego y ruego, lo que pasó (en orden, una vez)
  miguelTale: [
    'Volví de la muralla con calentura. Uno de los de fuera me mordió en el adarve.',
    'Ella me cuidó. Tres noches me estuvo cuidando.',
    'Me desperté con su sangre en la boca.',
    'Arranqué las tablas del pasadizo para no cruzar. Las huelo desde aquí, a mi madre y a mi hermana.',
    '¿Vienes de enfrente? ¿De casa de mi madre?... No. No me lo digas.',
  ],
  // te alejas
  miguelCalm: ['Así. Ahí. No te acerques más.', 'Gracias... gracias.', 'Vete ya. Por lo que más quieras.'],
  // vuelves (aún vive)
  miguelBack: ['¿Otra vez tú? ¿Por qué has vuelto?', 'Te dije que te fueras.'],

  leonorIntro: ['Tomé... ¿eres tú, Tomé?', 'No... no eres él.'],
  leonorFight: ['¡Devuélvemelo!', 'Mi niño... mi niño...', '¿Por qué me lo quitaste?', '¡Dijo que me lo devolvía!', 'Tomé... Tomé...'],
  leonorDeath: ['...Henrique...'],
  // en la cuna, antes de la pelea: la nana (se oye desde el agujero)
  leonorLullaby: ['Duérmete, niño, duérmete ya...', 'Ea, ea, ea... que tu madre está aquí.', 'Mi niño no llora. Mi niño duerme.', 'Siete puñales, Señora... siete...'],

  // Mestre Clemente, el Físico de los Inocentes: habla bajo, despacio, con
  // una cortesía perfecta; piensa en voz alta. Ve la peste en los sanos.
  // (la cortina, al entrar en el barrio)
  fisicoCortina: 'Ah. Uno sano.',
  // al fondo de la calleja, la primera vez
  fisicoCalleja: ['Bienvenido al barrio. Aquí ya no enferma nadie.', 'No corras. Todavía no.'],
  // viene a mirar (antes de la caza) y se va si te acercas
  fisicoVigila: ['Te miro el color desde aquí. Malo. Muy malo.', 'Andas como andan los que todavía esperan algo.', 'No te acerques. Aún no.'],
  fisicoTodavia: ['Todavía no. Aún no estás maduro.', 'Paciencia. Los dos.'],
  // cuarentena: clava una puerta
  fisicoTapia: ['Cuarentena. Es por tu bien.', 'Esta casa ya está enferma. La cierro.', 'Un clavo por cada uno de los que tosían aquí.'],
  fisicoViudaVentana: ['Doña Inês tampoco quería abrirme. Ahora duerme tranquila.', 'Desde esa ventana ella miraba la calle. Esperaba. Eso fue lo que la enfermó.'],
  // la tintorería: entra detrás de ti (empieza la caza)
  fisicoTintoreria: ['Ah. La llave de la viuda. Qué casa más triste, ésta.', 'Hueles a añil y a miedo. Las dos cosas manchan.'],
  // te ve, cazando
  fisicoVe: [
    'Ah. Ahí estás.',
    'No tengas miedo. El miedo es el primer síntoma.',
    'Qué color tan sano. Qué pena.',
    'Te huelo desde aquí: a sudor, a prisa, a mañana.',
    'Toda fiebre es una pregunta. La tuya no deja de preguntar.',
  ],
  // de cerca, peleando
  fisicoCerca: ['Quieto. El que se mueve se cura peor.', 'Así. Así. Que salga.', 'No me odies. Nadie odia al que le quita la fiebre.', 'Tienes el pulso de un pájaro.'],
  // te busca
  fisicoBusca: [
    'Sal. No voy a hacerte daño: voy a curarte, que es más difícil.',
    'Toda la ciudad duerme, y tú despierto. ¿No ves que estás enfermo?',
    'Escondido, el pulso se te oye mejor.',
    'Los de la carne ya no se esconden. Se han curado de esconderse.',
    'Por aquí ha pasado alguien sano. Lo deja todo oliendo a mañana.',
  ],
  // desde la calle, mientras vas por los tejados
  fisicoTejado: [
    'Por arriba, como la peste: de casa en casa, sin tocar el suelo.',
    'Ya bajarás. Todos bajan.',
    'Míralo desde ahí arriba, el barrio. Qué quieto. Qué sano.',
    'Las tejas resbalan. La caída también cura, pero mal.',
  ],
  // el gancho, la esponja
  fisicoGancho: ['Ven.', 'Aquí, conmigo.'],
  fisicoEsponja: ['Respira. Hondo.', 'Shh. Es beleño. Pesa en los párpados, ¿verdad?'],
  fisicoSuelta: ['Qué fuerza. Así es la peste al principio: fuerte.', 'Bien. Eso también es un síntoma.'],
  // te encuentra cogido en un cepo (cazando: viene a dormirte) o antes de
  // la caza (te mira, y se va)
  fisicoCepo: ['Quieto. El hierro no muerde al que no tira.', 'Ya está, ya está. El dolor es la salud, que se resiste.', 'Mira qué tobillo. Lo que corría tanto.'],
  fisicoCepoTodavia: ['Todavía no. La fruta se coge cuando cae sola.', 'Tira, tira. Así se aprende dónde no pisar.'],
  // donde sonaron las campanillas
  fisicoCampanillas: ['Las campanillas no mienten nunca.', 'Alguien ha pasado por aquí con prisa. La prisa es un síntoma.'],
  // la camilla (te ha dormido): a oscuras, por la calleja, a la puerta de su
  // casa, en el quirófano
  fisicoDuerme: 'Shh. Ya está. Ya pasó lo peor, que es el miedo.',
  fisicoCamilla: ['Mira qué cielo. Hace años que nadie lo miraba en este barrio.', 'Pesas lo que pesa la salud. Demasiado.'],
  fisicoCasa: 'La Casa de los Inocentes. Aquí no ha muerto nadie de peste. Ni uno.',
  fisicoHierros: 'Primero, el hierro. Luego, el fuego.',
  fisicoPulso: 'Corre, corre. Así no hay quien cure a nadie.',
  fisicoFragua: 'El hierro está tibio, y lo tibio no cura. Voy a la fragua. No te muevas: es por tu bien.',
  // vuelve de la fragua: sigues atado (te mata) o te has soltado
  fisicoAlRojo: 'Ya está al rojo. Lo que no cura el hierro...',
  fisicoSuelto: ['¿Ya? Qué prisa. La prisa también es un síntoma.', 'Te has soltado. Bien: los fuertes curan mejor.'],
  // herido: se retira (con la cal)
  fisicoHerido: ['Bien. Muy bien. Hasta la fiebre tiene su dignidad.', 'Ya volveré. El médico siempre vuelve.'],
};

export const MSG = {
  intro: ['Braga.', 'Tercera noche después de la caída.'],
  lockedKey: (k) => `Cerrada con llave. Necesitas: ${k}.`,
  barred: 'Está atrancada desde el otro lado.',
  boarded: 'La puerta está cegada con tablones clavados. Necesitas algo para arrancarlos.',
  barricadaFrente: 'La barricada no se mueve: está clavada y apuntalada desde el otro lado. Por aquí no se pasa.',
  barricadaCae: 'Haces palanca bajo los puntales y los arrancas uno a uno. La barricada se viene abajo.',
  barricadaPuntales: 'Los puntales están clavados al suelo. Sin algo de hierro no se arrancan.',
  velatorioShut: 'La puerta no cede: la han clavado por dentro. Con algo de hierro se podría hacer palanca.',
  velatorioOpen: 'Metes la palanca entre la hoja y el marco y empujas. Por dentro saltan, una a una, las tablas clavadas.',
  desvanSube: 'Subes por la escala al desván.',
  desvanBaja: 'Bajas por la escala al sobrado.',
  palomarSube: 'Subes por la escala al palomar.',
  palomarBaja: 'Bajas por la escala al desván del palomero.',
  curtidorSube: 'Subes por la escala al desván.',
  curtidorBaja: 'Bajas por la escala al sobrado del curtidor.',
  torreSurDoor: 'La puerta de la torre está atrancada por dentro. Arriba no se oye nada.',
  grate: 'Una reja de hierro cierra la escalera. El torno que la mueve no tiene manivela.',
  grateDown: 'Encajas la manivela y giras el torno. La reja baja chirriando por su ranura hasta perderse en el suelo.',
  seal: 'Una losa con el sigilo del Pacto sella el paso. Tiene un hueco del tamaño de un anillo.',
  fog: 'Una niebla blanca y espesa bloquea el paso.',
  noExit: 'El rastrillo está bajado y una masa de carne lo ha soldado a la piedra. Por aquí no se sale.',
  southGate: 'La Puerta Sur está hundida bajo escombros y carne. No hay salida.',
  trampillaTaberna: 'La trampilla de la bodega, clavada con dos tablones. Abajo, en lo oscuro, algo rasca las cubas.',
  rastrillo: (n) =>
    n === 0
      ? 'Un rastrillo de hierro cierra la cisterna. Al otro lado, bajo una luz pálida que cae de lo alto, el agua negra de un pozo. De la reja suben tres cadenas que se pierden en la bóveda.'
      : `El rastrillo cuelga de tres cadenas; ${n === 1 ? 'una está tensa' : 'dos están tensas'}. Falta${n === 1 ? 'n dos palancas' : ' una palanca'}.`,
  palanca: (n) => (n >= 3 ? 'La tercera cadena se tensa. Por todas las bodegas retumba el rastrillo al subir.' : `La cadena se tensa y corre por la bóveda. En algún sitio, el rastrillo sube un palmo. (${n}/3)`),
  palancaHecha: 'La palanca ya está echada.',
  // los atajos de la cripta honda: una reja que sube con su palanca y un
  // lienzo de muro que se hunde en el suelo
  leverGate: 'La reja no cede. Corre por las ranuras de las jambas y la sube una palanca que está al otro lado: se ve entre los barrotes.',
  gateUp: 'La palanca cede de un tirón. A tu lado, la reja sube chirriando por sus ranuras hasta perderse en el muro.',
  slabOpen: 'La palanca cede de un tirón. Algo rueda dentro del muro: el lienzo del fondo se hunde en el suelo y deja ver la sala de llegada.',
  pozoCalle: 'El pozo del Postigo. Muy abajo gotea el agua… y algo más se mueve. Unos pates de hierro bajan por la pared del pozo.',
  hatchOpen: 'Descorres el cerrojo y levantas la trampilla. Una escalera de mano baja al almacén de la torre.',
  hatchShut: 'Una trampilla en el techo, atrancada desde arriba.',
  hatchDown: 'Bajas por la escalera de mano al almacén.',
  hatchUp: 'Subes por la escalera de mano al cuerpo de guardia.',
  carcelSube: 'Subes por la escalera de mano a la sala de los guardas.',
  carcelBaja: 'Bajas por la escalera de mano al cuerpo de guardia de la cárcel.',
  libroPresos:
    'El libro de presos. La última entrada, de otra mano y torcida: «El de la celda del fondo no come. Toda la noche discute con alguien que no está, y le dice que no. Escribe en la pared con los dedos; ya no tiene uñas. Los otros se arriman a la reja para no oírle.»',
  primerObispo: 'El sepulcro más viejo del panteón, en el fondo del pozo. El obispo tiene la cara tapada con un paño de piedra, como los Velados. En el canto de la tapa, en latín, y debajo, a carbón, en romance: «FUI EL PRIMERO QUE BAJÓ, Y EL PRIMERO QUE NO QUISO VER».',
  osarioLetrero: 'En lo alto de los muros, sobre las filas de los hermanos, en letras negras: «NÓS OSSOS QUE AQUI ESTAMOS PELOS VOSSOS ESPERAMOS». Nosotros, los huesos que aquí estamos, por los vuestros esperamos.',
  // el osario de los hermanos de Dumio (la cripta de San Martín)
  miradaBien: 'A los cuatro hermanos se les encienden los ojos. Los fémures que atrancan el arca se descorren uno a uno y la losa se aparta.',
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
  // el pasadizo del Soto (game/souto.js)
  hueco: 'Han arrancado el suelo del pasadizo a hachazos: las tablas y las vigas que las sostenían. Los trozos están abajo, en la calle. Al otro lado, en el marco de la puerta, alguien ha escrito a carbón: NO CRUCES. Con un tablón largo se podría tender un paso.',
  tablaPuesta: 'Tiendes el tablón de un borde al otro del hueco. Cruje, pero aguanta.',
  equilibrio: 'El tablón se cimbrea bajo tus pies. Si te inclinas, échate hacia el otro lado.',
  caida: 'Pierdes el equilibrio.',
  equilibrioViga: 'La viga apenas tiene un palmo de ancho. Si el cuerpo se te va hacia un lado, échate hacia el otro.',
  // el Físico: su esponja, su cal, su cuarentena
  forcejea: '¡Forcejea!',
  calOjos: 'La cal en los ojos: no ves nada.',
  tapiada: 'Al otro lado, alguien termina de clavar la puerta.',
  tapiadaDentro: 'La puerta no cede: la han clavado por fuera. Por la rendija huele a cal.',
  tapiadaArranca: 'Arrancas los tablones del Físico. La cruz de cal se deshace en polvo.',
  tapiadaFuera: 'Clavada con tablas, y con la cruz de cal encima. Con algo para hacer palanca...',
  inocentesTranca: 'Atrancada por dentro. Sobre la puerta cuelga la vara con la serpiente: la casa del físico.',
  cepoForcejea: '¡Ábrelo!',
  correas: 'Atado a la mesa de su quirófano. Machaca para soltar las correas antes de que vuelva.',
  correa: ['¡La muñeca!', '¡La otra muñeca!', '¡El pecho!'],
  cepoPista: 'Un cepo, escondido en la paja. Machaca el botón para abrirle las quijadas antes de que llegue él. (Un tajo hace saltar los que veas; brillan los dientes.)',
  catarina: 'Una mujer joven, tapada con una sábana empapada de sangre. Alguien le ha cruzado las manos sobre el pecho y le ha puesto una vela.',
  doorMiguel: 'Está atrancada desde el otro lado. Dentro, muy bajo, alguien llora.',
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
  smithy: 'Fragua de maese Lourenço',
  velatorio: 'La casa del velatorio',
  pellejero: 'Casa del pellejero',
  pellejero_alto: 'Sobrado del pellejero',
  vecinos: 'El sobrado de los vecinos',
  desvan_cueros: 'El desván de los cueros',
  secadero: 'El secadero',
  palomero: 'El desván del palomero',
  palomar: 'El palomar',
  tejados: 'Los tejados de los Pellejeros',
  curtidor: 'Casa del curtidor',
  curtidor_alto: 'Sobrado del curtidor',
  curtidor_desvan: 'Desván del curtidor',
  souto_house: 'Casa tapiada',
  souto_alta: 'Sobrado de la casa tapiada',
  pasadizo: 'Pasadizo del Soto',
  tonelero: 'Tonelería',
  tonelero_alta: 'Sobrado del tonelero',
  crypt: 'Cripta de la Catedral',
  confesion: 'Confesión de San Martín',
  obispos: 'Panteón de los Obispos',
  martin: 'Cripta de San Martín',
  capilla_martin: 'Capilla de San Martín',
  osario_martin: 'Osario de San Martín',
  catacumbas: 'Catacumbas de la Sé',
  huesos: 'Capilla de los Huesos',
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
